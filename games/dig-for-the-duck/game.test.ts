import { describe, expect, it } from 'vitest'
import { BOOTS } from './art'
import { CELL, COLS, HOT, PANE, TIN, WATER, cellAt, decode, isSand, isWet, type Box } from './cells'
import { LADDER } from './config'
import { REGRAB_RADIUS } from './input'
import { Game, MUD, PULL_MOST, RAIN, TAUT, TUG, pieceCol, washingBox } from './game'
import { VARIANTS } from './hills'
import { deserialize, freshSave, serialize } from './save'
import { SCENE_NAMES, SCENES, SHOWING, type SceneName } from './timeline'
import { find, finishedOn, flood, gameOn, play, saveOn, spot, spout } from './testing'
import * as voices from './voices'

// The cycle, the scenes and found as left, played on the model alone: a hill
// is dug, the duck floats, the plug brings the next hill, and at every moment
// the save holds what a put-away must find.

/** Rubs a straight tunnel from under the pond to the gap between the duck and the chain. */
function digTheWay(game: Game): void {
  const { pond, chamber, seat, chain } = game.on.ground.layout
  const from = spot(pond.col, pond.brim + pond.depth - 2)
  const gap = seat.col0 > chain.col1 ? (chain.col1 + seat.col0) / 2 : (seat.col1 + chain.col0) / 2
  const to = spot(gap, chamber.row0 + 4)
  game.press(from)
  for (let i = 1; i <= 40; i++) { game.rubTo({ x: from.x + ((to.x - from.x) * i) / 40, y: from.y + ((to.y - from.y) * i) / 40 }); game.step(1 / 60) }
  game.release()
}

/** Plays until `done` holds, a frame at a time, and says whether it came to hold within `seconds`. */
function until(game: Game, seconds: number, done: () => boolean): boolean {
  for (let i = Math.round(seconds * 60); i > 0; i--) { if (done()) return true; game.step(1 / 60) }
  return done()
}

/** Pulls the chain up as far as it goes, as one touch. */
function pullChain(game: Game): void {
  const chain = game.on.places.chain
  game.press({ x: chain.x, y: chain.top + 14 })
  game.rubTo({ x: chain.x, y: chain.top + 14 - PULL_MOST })
}

/** Opens the game again from what it would have stored: through JSON, as the shell does. */
const reopened = (game: Game): Game => new Game(deserialize(JSON.parse(JSON.stringify(serialize(game.toSave()))), null), 2)

/** The bath filled to the brim by hand. */
const fillBath = (game: Game): void => { const { bath } = game.on.ground.layout; flood(game, bath, bath.row1 - bath.row0 + 1) }

/** What makes each of the residents' scenes start. */
const CAUSES: Record<'moleAfloat' | 'wormBoots' | 'badgerRain' | 'ending', (game: Game) => void> = {
  moleAfloat: (game) => flood(game, game.on.ground.layout.moleRoom, 9),
  wormBoots: (game) => flood(game, game.on.ground.layout.wormRoom, 2),
  badgerRain: spout,
  ending: fillBath,
}

/** Every note of every voice a scene plays, with its delay taken off, as the model hands it over. */
const SCENE_NOTES = new Set(SCENE_NAMES.flatMap((name) => (SCENES[name] as readonly { note?: string }[]).flatMap((cue) => (cue.note ? voices.NAMED[cue.note] : []).map((note) => JSON.stringify({ ...note, delay: 0 })))))

describe('the cycle', () => {
  it('a first visit starts on the sand hill whatever the age, with everyone at home and dry', () => {
    for (const age of [null, 2, 6, 7, 8, 10, 12, 40]) {
      const save = freshSave(age)
      expect(save.position, `age ${age}`).toBe('dune')
      expect([save.hill, save.finished, save.mole, save.worm, save.badger, save.shown]).toEqual(['dune', false, 'home', 'dry', 'dry', []])
    }
  })

  it('a way dug from the pond to the bath floats the duck: the hill is finished and the position moves one step, saved at once', () => {
    const game = new Game(freshSave(null), 1)
    digTheWay(game)
    game.changed()
    let urgent = false
    expect(until(game, 20, () => { urgent = game.changed() === 2 || urgent; return game.finished })).toBe(true)
    expect(game.running('ending')).toBe(true)
    expect(urgent).toBe(true)
    expect(game.toSave()).toMatchObject({ position: 'claypit', finished: true, hill: 'dune' })
    expect(game.on.afloat).toBe(true)
  })

  it('the chain pulled taut on a finished hill lays the next hill at once, in the next layout, and the old one is only shown leaving', () => {
    const game = finishedOn('dune')
    play(game, 0.5)
    expect(game.anyScene).toBe(false)
    game.changed()
    game.sounds()
    pullChain(game)
    expect(game.changed()).toBe(2)
    expect(game.running('plug')).toBe(true)
    // The plug is out: nothing drops back, and nothing sounds as if it had.
    expect(game.sounds() ?? []).not.toContainEqual(voices.plugDrop[0])
    expect(game.toSave()).toMatchObject({ position: 'claypit', hill: 'claypit', variant: 1, finished: false, mole: 'home', worm: 'dry', badger: 'dry' })
    expect(game.leaving?.hill.layout).toBeDefined()
    expect(game.on.afloat).toBe(false)
    play(game, 6.2)
    expect(game.running('plug')).toBe(false)
    expect(game.leaving).toBeNull()
  })

  it('the chain pulled before the duck floats only lets the bath run out, for as long as it is held', () => {
    const game = gameOn('dune')
    const { bath } = game.on.ground.layout
    flood(game, bath, 4)
    const before = game.on.ground.count(bath, WATER)
    pullChain(game)
    play(game, 1)
    expect(game.on.ground.count(bath, WATER)).toBeLessThan(before)
    expect(game.toSave()).toMatchObject({ hill: 'dune', finished: false })
    expect(game.running('plug')).toBe(false)
    game.release()
    expect(game.on.pull).toBe(0)
  })

  it('the layouts turn with every new hill, and the last hill is followed by itself in the next layout', () => {
    const first = gameOn('massif', 2)
    fillBath(first)
    until(first, 2, () => first.finished)
    expect(first.toSave()).toMatchObject({ position: 'massif', finished: true })
    const game = finishedOn('massif', 2)
    pullChain(game)
    expect(game.toSave()).toMatchObject({ position: 'massif', hill: 'massif', variant: 0, finished: false })
    expect(VARIANTS).toBe(3)
    expect(LADDER[LADDER.length - 1]).toBe('massif')
  })
})

describe('the scenes', () => {
  it('each of the residents\' scenes puts its outcome in the save when it starts, to be stored at once', () => {
    const outcome: Record<keyof typeof CAUSES, object> = { moleAfloat: { mole: 'afloat' }, wormBoots: { worm: 'squelching' }, badgerRain: { badger: 'rained' }, ending: { finished: true, position: 'claypit' } }
    for (const name of Object.keys(CAUSES) as (keyof typeof CAUSES)[]) {
      const game = gameOn('dune')
      game.changed()
      CAUSES[name](game)
      let urgent = false
      expect(until(game, 2, () => { urgent = game.changed() === 2 || urgent; return game.running(name) }), name).toBe(true)
      expect(urgent, name).toBe(true)
      expect(game.toSave(), name).toMatchObject(outcome[name])
    }
  })

  it('every scene lasts between 4 and 10 seconds', () => {
    for (const name of SCENE_NAMES) {
      const length = Math.max(...SCENES[name].map((cue) => cue.at + cue.lasts))
      expect(length, name).toBeGreaterThanOrEqual(4)
      expect(length, name).toBeLessThanOrEqual(10)
    }
  })

  it('a scene\'s voice is handed over a note at a time, each when it is due, and a touch that ends the scene drops the rest', () => {
    const game = finishedOn('dune')
    play(game, 0.5)
    game.sounds()
    pullChain(game)
    expect(game.running('plug')).toBe(true)
    // The gurgle has three glugs, 0.3 s apart: the first with the whirl, the others as they come.
    const glugs = (): number => (game.sounds() ?? []).filter((note) => note.kind === 'tone' && note.frequency <= 160 && note.frequency >= 140).length
    let heard = glugs()
    for (let i = 0; i < 12; i++) { game.step(1 / 60); heard += glugs() }
    expect(heard).toBe(1)
    for (let i = 0; i < 12; i++) { game.step(1 / 60); heard += glugs() }
    expect(heard).toBe(2)
    // A touch ends the scene before the third: it never sounds.
    game.press({ x: PANE.x + 500, y: PANE.y + 30 })
    game.release()
    game.sounds()
    for (let i = 0; i < 60; i++) { game.step(1 / 60); heard += glugs() }
    expect(heard).toBe(2)
  })

  it('a press ends every scene that is playing, without the sounds of the parts it skipped', () => {
    const game = gameOn('dune')
    CAUSES.moleAfloat(game)
    CAUSES.wormBoots(game)
    until(game, 2, () => game.running('moleAfloat') && game.running('wormBoots'))
    play(game, 0.3)
    game.sounds()
    // A touch on the glass in the sky: its own sound and nothing of the scenes.
    game.press({ x: PANE.x + 500, y: PANE.y + 30 })
    expect(game.anyScene).toBe(false)
    expect(game.sounds()?.length ?? 0).toBeLessThanOrEqual(2)
    // And silent from that frame: nothing of a scene's voice that was still to come is heard after it.
    game.release()
    let after = 0
    for (let i = 0; i < 60; i++) { game.step(1 / 60); after += (game.sounds() ?? []).filter((note) => SCENE_NOTES.has(JSON.stringify({ ...note, delay: 0 }))).length }
    expect(after).toBe(0)
    const now = game.now(game.on)
    for (const cue of SCENES.moleAfloat) expect(now.scenes.moleAfloat[cue.part]).toBe(1)
    for (const cue of SCENES.wormBoots) expect(now.scenes.wormBoots[cue.part]).toBe(1)
  })

  it('the mole is set down when the water in his room falls, and that is saved when it starts', () => {
    const game = gameOn('dune')
    const room: Box = game.on.ground.layout.moleRoom
    CAUSES.moleAfloat(game)
    until(game, 2, () => game.running('moleAfloat'))
    play(game, 8)
    expect(game.on.rise).toBeGreaterThan(3)
    for (let row = room.row0; row <= room.row1; row++) for (let col = room.col0; col <= room.col1; col++) if (game.on.ground.cells[row * COLS + col] === WATER) game.on.ground.put(row * COLS + col, 0)
    expect(until(game, 2, () => game.running('moleDown'))).toBe(true)
    expect(game.toSave().mole).toBe('home')
    play(game, 6)
    expect(game.on.rise).toBeLessThan(0.5)
  })

  it('a scene sounds again when it plays a second time in one visit', () => {
    const game = gameOn('dune')
    const room: Box = game.on.ground.layout.moleRoom
    let heard = 0
    for (let round = 0; round < 2; round++) {
      CAUSES.moleAfloat(game)
      until(game, 2, () => game.running('moleAfloat'))
      game.sounds()
      let notes = 0
      for (let i = 0; i < 60 * 7; i++) { game.step(1 / 60); notes += game.sounds()?.length ?? 0 }
      heard += notes > 0 ? 1 : 0
      for (let row = room.row0; row <= room.row1; row++) for (let col = room.col0; col <= room.col1; col++) if (game.on.ground.cells[row * COLS + col] === WATER) game.on.ground.put(row * COLS + col, 0)
      play(game, 7)
    }
    expect(heard).toBe(2)
  })

  it('the first touch on a hill with a ground not yet shown plays its showing once: the id and what it puts in the hill are saved at its start', () => {
    const hills: Record<string, string> = { clay: 'claypit', rock: 'scree', moss: 'fen', hot: 'hot-spring', earth: 'orchard' }
    for (const [kind, hill] of Object.entries(hills)) {
      const game = gameOn(hill, 0, { shown: [] })
      const before = game.on.ground.water
      play(game, 1)
      expect(game.anyScene, `${kind}: nothing starts by itself`).toBe(false)
      game.changed()
      game.press({ x: PANE.x + 500, y: PANE.y + 30 })
      const scene = SHOWING[kind as keyof typeof SHOWING] as SceneName
      expect(game.running(scene), kind).toBe(true)
      expect(game.changed(), kind).toBe(2)
      expect(game.toSave().shown, kind).toEqual([kind])
      if (kind !== 'rock') {
        // The save holds its water from the first moment; the hill takes it on the beat that is seen pouring it.
        const stored = Array.from(decode(game.toSave().cells)!).filter((code) => code === WATER).length
        expect(game.on.ground.water, `${kind}: nothing is poured before it is seen`).toBe(before)
        expect(stored, `${kind}: its water is in the save`).toBeGreaterThan(before)
        const seen = gameOn(hill, 0, { shown: [] })
        seen.press({ x: PANE.x + 500, y: PANE.y + 30 })
        seen.release()
        let poured = 0, steamed = false
        for (let i = 0; i < 80 && poured === 0 && !steamed; i++) { seen.step(1 / 60); poured = seen.on.ground.water - before; steamed = seen.answeredCells().includes('hot.water') }
        expect(poured > 0 || steamed, `${kind}: poured as its scene plays`).toBe(true)
        expect(seen.running(scene), `${kind}: while the scene is still playing`).toBe(true)
      }
      game.release()
      // A second touch ends it and starts nothing; opened again, nothing plays either.
      game.press({ x: PANE.x + 500, y: PANE.y + 30 })
      expect(game.anyScene, kind).toBe(false)
      const again = reopened(game)
      again.press({ x: PANE.x + 500, y: PANE.y + 30 })
      expect(again.anyScene, kind).toBe(false)
    }
  })

  it('a showing that a touch ends has still poured its water', () => {
    const game = gameOn('claypit', 0, { shown: [] })
    const before = game.on.ground.water
    game.press({ x: PANE.x + 500, y: PANE.y + 30 })
    game.release()
    game.press({ x: PANE.x + 500, y: PANE.y + 30 })
    expect(game.on.ground.water).toBeGreaterThan(before)
    expect(Array.from(reopened(game).on.ground.cells)).toEqual(Array.from(game.on.ground.cells))
  })

  it('on every layout a stream led onto a hot stone leaves as a cloud, the wind carries it to the washing, and the washing scene starts from its rain, the piece nearest the rain first', () => {
    for (let variant = 0; variant < VARIANTS; variant++) {
      const game = gameOn('hot-spring', variant)
      const ground = game.on.ground, { layout } = ground, { pond, spots, wind } = layout
      const line = washingBox(layout)
      // The stone that lies on the way down, not the one beside the badger. The washing is downwind of it.
      const stone = find(game, (code, col) => code === HOT && Math.abs(col - spots.hot!.col) > 8)!
      expect(Math.sign(line.col0 - stone.col), `layout ${variant}: the wind blows from the way to the line`).toBe(wind)
      // One rub from under the pond to the top of the stone, and then nothing but time.
      const from = spot(pond.col, pond.brim + pond.depth - 2), to = spot(stone.col + 2, stone.row - 3)
      game.press(from)
      for (let i = 1; i <= 40; i++) { game.rubTo({ x: from.x + ((to.x - from.x) * i) / 40, y: from.y + ((to.y - from.y) * i) / 40 }); game.step(1 / 60) }
      game.release()
      expect(until(game, 12, () => game.running('badgerRain')), `layout ${variant}: the rain starts her scene`).toBe(true)
      expect(game.toSave().badger).toBe('rained')
      // It was rain and not a puddle: no water lies among the pieces, and the last drop seen falling fell among them.
      expect(ground.count(line, WATER), `layout ${variant}`).toBe(0)
      const drop = [...game.crumbs].reverse().find((crumb) => crumb.kind === RAIN)!
      const col = Math.floor(cellAt(drop.x, drop.y).col)
      expect(col >= line.col0 && col <= line.col1, `layout ${variant}: a drop at ${col}`).toBe(true)
      const nearest = [0, 1, 2, 3].sort((a, b) => Math.abs(pieceCol(layout, a) - col) - Math.abs(pieceCol(layout, b) - col))
      expect(game.on.sagOrder, `layout ${variant}`).toEqual(nearest)
    }
  })

  it('the puff of the hot stone\'s first showing rains on the badger\'s head and leaves her washing dry', () => {
    for (let variant = 0; variant < VARIANTS; variant++) {
      const game = gameOn('hot-spring', variant, { shown: [] })
      const { drying } = game.on.ground.layout, head = cellAt(game.on.places.badger.x, 0).col
      game.press({ x: PANE.x + 500, y: PANE.y + 30 })
      game.release()
      play(game, 7)
      expect(game.on.badger, `layout ${variant}`).toBe('dry')
      let dark = 0
      for (let col = Math.floor(head) - 4; col <= Math.floor(head) + 4; col++) { const code = game.on.ground.cells[drying.row * COLS + col]; if (isSand(code) && isWet(code)) dark++ }
      expect(dark, `layout ${variant}: the sand at her feet is dark`).toBeGreaterThan(0)
    }
  })

  it('on a hill with several new grounds each touch shows one of them, in turn', () => {
    const game = gameOn('massif', 0, { shown: [] })
    for (let n = 1; n <= 5; n++) {
      game.press({ x: PANE.x + 500, y: PANE.y + 30 })
      game.release()
      expect(game.toSave().shown.length).toBe(n)
    }
    game.press({ x: PANE.x + 500, y: PANE.y + 30 })
    expect(game.anyScene).toBe(false)
  })
})

describe('found as left', () => {
  it('put away at any moment of a hill being dug and opened again, the hill is as it was to the cell', () => {
    const game = new Game(freshSave(null), 1)
    digTheWay(game)
    for (let moment = 0; moment < 8; moment++) {
      play(game, 0.7)
      const again = reopened(game)
      expect(Array.from(again.on.ground.cells)).toEqual(Array.from(game.on.ground.cells))
      expect(again.toSave()).toEqual(game.toSave())
      expect(decode(game.toSave().cells)).not.toBeNull()
    }
  })

  it('opened again in the middle of any scene, the scene has happened and does not play again', () => {
    for (const name of Object.keys(CAUSES) as (keyof typeof CAUSES)[]) {
      const game = gameOn('dune')
      CAUSES[name](game)
      until(game, 2, () => game.running(name))
      play(game, 0.4)
      const again = reopened(game)
      expect(again.sounds(), name).toBeNull()
      for (let i = 0; i < 180; i++) { again.step(1 / 60); expect(again.running(name), name).toBe(false) }
      // Everyone stands where the scene leaves them: every part of it at its end.
      if (name !== 'ending') for (const cue of SCENES[name]) expect(again.now(again.on).scenes[name][cue.part], `${name} ${cue.part}`).toBe(1)
      else expect(again.on.afloat).toBe(true)
    }
  })

  it('opened again in the middle of the plug\'s scene, the next hill is there and waits for a touch', () => {
    const game = finishedOn('dune')
    pullChain(game)
    play(game, 1)
    const again = reopened(game)
    expect(again.toSave()).toMatchObject({ hill: 'claypit', variant: 1, finished: false })
    expect(again.leaving).toBeNull()
    play(again, 5)
    expect(again.anyScene).toBe(false)
    expect(again.sounds()).toBeNull()
  })

  it('a game opened again starts no timer and makes no sound until it is touched', () => {
    const game = reopened(gameOn('massif', 1))
    for (const since of Object.values(game.since)) expect(since).toBe(Infinity)
    play(game, 5)
    expect(game.anyScene).toBe(false)
    expect(game.sounds()).toBeNull()
    expect(game.changed()).toBe(0)
    expect(game.marks.length + game.crumbs.length + game.ripples.length).toBe(0)
  })

  it('the largest save is well under the cap', () => {
    const save = serialize({ ...saveOn('massif', 2), finished: true, mole: 'afloat', worm: 'squelching', badger: 'rained' })
    const bytes = new TextEncoder().encode(JSON.stringify(save)).length
    expect(bytes).toBeLessThan(32 * 1024)
  })
})

describe('the finger on the hill', () => {
  it('a rub straight down through the bands is a falling run: no hiss is higher than the one before it', () => {
    const game = gameOn('dune')
    const heard: number[] = []
    // Down through dry sand, clear of the pond, the rooms and the chamber.
    game.press(spot(124, 27))
    for (let row = 28; row <= 112; row++) {
      game.rubTo(spot(124, row))
      game.step(1 / 60)
      for (const note of game.sounds() ?? []) if (note.kind === 'noise' && note.q === 7) heard.push(note.frequency)
    }
    game.release()
    expect(new Set(heard).size).toBeGreaterThanOrEqual(8)
    for (let i = 1; i < heard.length; i++) expect(heard[i], `hiss ${i}`).toBeLessThanOrEqual(heard[i - 1])
  })

  it('the bath\'s tin rings with a gleam where it is touched, and the oak frame knocks and lets a few chips fall; a rub from the frame onto the glass digs', () => {
    const game = gameOn('dune')
    const { bath } = game.on.ground.layout
    // The wall of the bath beyond the duck: the other one hangs behind the chain.
    const wall = game.on.ground.layout.seat.col1 === bath.col1 ? bath.col1 + 1 : bath.col0 - 1
    expect(game.on.ground.at(wall, bath.row0 + 2)).toBe(TIN)
    game.press(spot(wall, bath.row0 + 2))
    expect(game.marks.map((mark) => mark.kind)).toEqual(['tin'])
    expect(game.sounds()?.length).toBeGreaterThan(0)
    game.release()
    play(game, 0.5)
    game.press({ x: 12, y: PANE.y + 520 })
    expect(game.marks.map((mark) => mark.kind)).toEqual(['wood'])
    expect(game.sounds()?.length).toBeGreaterThan(0)
    const before = game.on.ground.cells[Math.floor(cellAt(0, PANE.y + 520).row) * COLS + 6]
    game.rubTo({ x: PANE.x + 40, y: PANE.y + 520 })
    expect(isSand(before)).toBe(true)
    expect(game.on.ground.cells[Math.floor(cellAt(0, PANE.y + 520).row) * COLS + 6]).toBe(0)
    game.release()
  })

  it('a rub that goes away into the grown-up\'s corner digs nothing on its way there or back', () => {
    const game = gameOn('dune')
    game.press(spot(100, 60))
    game.rubTo(spot(104, 60))
    game.away()
    expect(game.finger).toBeNull()
    game.rubTo(spot(150, 60))
    expect(isSand(game.on.ground.at(125, 60))).toBe(true)
    // It carries on from where it came back.
    game.rubTo(spot(156, 60))
    expect(game.on.ground.at(153, 60)).toBe(0)
    game.release()
  })

  it('a duck that is parked and returned to floats or sits exactly as one that is saved and loaded, at every level of the bath', () => {
    const game = finishedOn('dune')
    const seen = new Set<boolean>()
    for (let round = 0; round < 40; round++) {
      game.on.ground.drain(7)
      play(game, 0.25)
      const loaded = reopened(game)
      expect(loaded.on.afloat, `round ${round}, bath at ${game.on.ground.bathFill.toFixed(2)}`).toBe(game.on.afloat)
      expect(loaded.on.lift).toBeCloseTo(game.on.liftFor(), 5)
      seen.add(game.on.afloat)
    }
    expect(seen.size).toBe(2)
  })
})

describe('the residents and the chain under the finger', () => {
  it('each is touched where it is drawn: the worm\'s head as it lies along its boots or looks out of one, the duck\'s cap, the badger\'s nose, the mole adrift', () => {
    // The worm lying along all six boots: its head is over the last of them.
    const lying = gameOn('dune', 0, { worm: 'squelching' })
    const room = lying.on.places.worm.x - 108, floor = lying.on.places.worm.y
    lying.press({ x: room + BOOTS[5].x, y: floor - 60 })
    expect(lying.since.wormPop).toBe(0)
    // Standing in its own boot it is not in the air over the others. Any boot of the row is its own to answer for,
    // and once tapped it looks out of another boot and can be tapped there.
    const dry = gameOn('dune')
    dry.press({ x: room + BOOTS[4].x, y: floor - 90 })
    expect(dry.since.wormPop).toBe(Infinity)
    dry.release()
    dry.press({ x: room + BOOTS[0].x, y: floor - 20 })
    expect(dry.since.wormPop).toBe(0)
    dry.release()
    play(dry, 0.6)
    dry.press({ x: room + BOOTS[4].x, y: floor - 90 })
    expect(dry.since.wormPop).toBe(0)
    for (let variant = 0; variant < VARIANTS; variant++) {
      const game = gameOn('dune', variant)
      const { duck, badger, mole } = game.on.places, wind = game.on.ground.layout.wind
      game.press({ x: duck.x, y: duck.y - 132 })
      expect(game.since.duckSqueak, `layout ${variant}: the duck's cap`).toBe(0)
      game.release()
      game.press({ x: badger.x + 56 * wind, y: badger.y - 104 })
      expect(game.since.badgerSnap, `layout ${variant}: the badger's nose`).toBe(0)
      game.release()
      game.press({ x: mole.x, y: mole.y - 160 })
      expect(game.since.moleHide, `layout ${variant}: the top of the mole's head`).toBe(0)
      game.release()
    }
  })

  it('a quick tap just after a rub is a tap: on a resident, the duck or the chain it is that one\'s own, and no tunnel is dug toward it', () => {
    for (let variant = 0; variant < VARIANTS; variant++) {
      const places = gameOn('dune', variant).on.places, wind = gameOn('dune', variant).on.ground.layout.wind
      const taps: [string, { x: number; y: number }, (game: Game) => boolean][] = [
        ['duck', { x: places.duck.x, y: places.duck.y - 60 }, (game) => game.since.duckSqueak === 0],
        ['mole', { x: places.mole.x, y: places.mole.y - 80 }, (game) => game.since.moleHide === 0],
        ['worm', { x: places.worm.x - 108 + BOOTS[0].x, y: places.worm.y - 20 }, (game) => game.since.wormPop === 0],
        ['badger', { x: places.badger.x + 56 * wind, y: places.badger.y - 104 }, (game) => game.since.badgerSnap === 0],
        ['chain', { x: places.chain.x, y: places.chain.top + 14 }, (game) => game.on.pull === TUG],
      ]
      for (const [who, at, answered] of taps) {
        const game = gameOn('dune', variant), name = `layout ${variant}: ${who}`
        // A short rub in the sand within a hand's width, lifted, and 100 ms later the finger lands on the one tapped: the
        // input joins such a touch to the rub and hands it over as the rub's next move.
        const centre = who === 'chain' ? places.duck.x : places[who as 'duck'].x
        const from = { x: at.x + (at.x >= centre ? 100 : -100), y: at.y + (who === 'badger' ? 60 : -70) }
        expect(Math.hypot(from.x - at.x, from.y - at.y), name).toBeLessThan(REGRAB_RADIUS)
        game.press(from)
        game.rubTo({ x: from.x + 6, y: from.y })
        game.lifted()
        for (let i = 0; i < 6; i++) game.step(1 / 60)
        game.sounds()
        const before = game.on.ground.cells.slice()
        game.rubTo(at)
        expect(answered(game), `${name} answers`).toBe(true)
        expect(game.sounds()?.length ?? 0, `${name} sounds`).toBeGreaterThan(0)
        expect(game.on.ground.cells, `${name}: nothing is dug`).toEqual(before)
        // The touch goes on as that tap: a move of the finger digs nothing either, and the lift ends it.
        game.rubTo({ x: at.x + 30, y: at.y + 30 })
        if (who !== 'chain') expect(game.on.ground.cells, `${name}: still nothing dug`).toEqual(before)
        game.release()
        expect(game.on.pull, name).toBe(0)
      }
    }
    // Anywhere else the join stays: the tunnel is carried on to where the finger lands.
    const game = gameOn('dune')
    game.press(spot(40, 70))
    game.rubTo(spot(42, 70))
    game.lifted()
    for (let i = 0; i < 6; i++) game.step(1 / 60)
    expect(isSand(game.on.ground.at(52, 70))).toBe(true)
    game.rubTo(spot(60, 70))
    expect(isSand(game.on.ground.at(52, 70))).toBe(false)
    game.release()
  })

  it('a duck sunk to the beak in a boiled bath is touched where it lies, not where it floated', () => {
    const game = finishedOn('dune'), { bath } = game.on.ground.layout, duck = game.on.places.duck
    play(game, 1)
    const floating = { x: duck.x, y: duck.top - game.on.lift + 8 }
    game.press(floating)
    expect(game.since.duckSqueak).toBe(0)
    game.release()
    // A hot stone in the bath: the duck sinks, and sighs as it does.
    for (let col = bath.col0 + 2; col <= bath.col0 + 5; col++) game.on.ground.put(bath.row1 * COLS + col, HOT)
    play(game, 3)
    expect([game.on.boiled, game.on.afloat]).toEqual([true, true])
    game.since.duckSqueak = Infinity
    game.press(floating)
    expect(game.since.duckSqueak, 'the air over its cap').toBe(Infinity)
    game.release()
    game.press({ x: duck.x, y: duck.bottom - game.on.lift + 12 })
    expect(game.since.duckSqueak, 'its body, under where it floated').toBe(0)
    game.release()
  })

  it('the chain ticks and the plug comes up a little as the finger lands on it', () => {
    const game = gameOn('dune')
    const chain = game.on.places.chain
    game.press({ x: chain.x, y: chain.top + 14 })
    expect(game.on.pull).toBe(TUG)
    expect(game.sounds()?.length).toBeGreaterThan(0)
    game.release()
    expect(game.on.pull).toBe(0)
  })

  it('a tap on each resident starts its own answer and a sound in the same call', () => {
    const answers = { duck: 'duckSqueak', mole: 'moleHide', worm: 'wormPop', badger: 'badgerSnap' } as const
    for (const [who, answer] of Object.entries(answers)) {
      const game = gameOn('dune')
      const place = game.on.places[who as keyof typeof answers]
      game.press({ x: place.x, y: place.y - 50 })
      expect(game.since[answer], who).toBe(0)
      expect(game.sounds()?.length, who).toBeGreaterThan(0)
      game.release()
    }
  })

  it('the chain let go drops the plug back, and a touch that has ended leaves nothing pending', () => {
    const game = gameOn('dune')
    const chain = game.on.places.chain
    game.press({ x: chain.x, y: chain.top + 14 })
    game.rubTo({ x: chain.x, y: chain.top + 14 - TAUT + 6 })
    expect(game.on.pull).toBeGreaterThan(0)
    game.release()
    expect(game.on.pull).toBe(0)
    expect(game.finger).toBeNull()
    // The next rub with no press does nothing at all.
    const before = Array.from(game.on.ground.cells)
    game.rubTo({ x: PANE.x + 300, y: PANE.y + 520 })
    expect(Array.from(game.on.ground.cells)).toEqual(before)
  })
})

describe('the idle ladder', () => {
  it('on a fresh hill it shows a place to rub beside the pond, and the hand\'s stroke ends on the glow', () => {
    for (let variant = 0; variant < VARIANTS; variant++) {
      const game = gameOn('dune', variant)
      const hint = game.hint()!
      const { pond } = game.on.ground.layout
      expect(hint.to).toEqual(hint.ring)
      expect(Math.abs(hint.ring.x - (PANE.x + pond.col * CELL))).toBeLessThan((pond.half + 8) * CELL)
      expect(hint.ring.y).toBeGreaterThan(PANE.y + pond.brim * CELL)
      expect(hint.ring.y).toBeLessThan(PANE.y + (pond.brim + pond.depth + 8) * CELL)
    }
  })

  it('it follows the water: with a pool standing in the worm\'s room, the place to rub is beside that pool', () => {
    const game = gameOn('dune')
    const room = game.on.ground.layout.wormRoom
    // The pond is gone and its water stands in the boot room.
    const { pond } = game.on.ground.layout
    for (let row = pond.brim; row < pond.brim + pond.depth; row++) for (let col = pond.col - pond.half; col <= pond.col + pond.half; col++) if (game.on.ground.cells[row * COLS + col] === WATER) game.on.ground.put(row * COLS + col, 0)
    flood(game, room, 3)
    play(game, 1)
    const hint = game.hint()!
    expect(hint.ring.y).toBeGreaterThan(PANE.y + room.row0 * CELL)
    expect(Math.abs(hint.ring.x - (PANE.x + ((room.col0 + room.col1) / 2) * CELL))).toBeLessThan(40 * CELL)
  })

  it('with a tunnel dug half-way down, the place to rub is under the water at its end', () => {
    const game = gameOn('dune')
    const { pond } = game.on.ground.layout
    game.press(spot(pond.col, pond.brim + pond.depth + 1))
    for (let row = pond.brim + pond.depth + 4; row <= 52; row += 3) game.rubTo(spot(pond.col + 2, row))
    game.release()
    play(game, 6)
    const hint = game.hint()!
    expect(hint.ring.y).toBeGreaterThan(spot(pond.col, 52).y)
    expect(Math.abs(hint.ring.x - spot(pond.col + 2, 52).x)).toBeLessThan(8 * CELL)
  })

  it('on a finished hill it shows the chain, pulled up', () => {
    const game = finishedOn('dune')
    play(game, 0.2)
    const hint = game.hint()!, chain = game.on.places.chain
    expect(hint.ring.x).toBe(chain.x)
    expect(hint.to.y).toBeLessThan(hint.from.y - TAUT)
  })
})

describe('mud, and water on its way', () => {
  it('wet sand comes away as blobs of mud that slide straight down the tunnel\'s wall', () => {
    const game = gameOn('dune'), { pond } = game.on.ground.layout
    game.press(spot(pond.col - 6, pond.brim + pond.depth + 1))
    game.rubTo(spot(pond.col + 6, pond.brim + pond.depth + 1))
    const mud = game.crumbs.filter((crumb) => crumb.kind === MUD)
    expect(mud.length).toBeGreaterThan(0)
    for (const blob of mud) expect([blob.vx, blob.vy > 0]).toEqual([0, true])
    const at = mud.map((blob) => blob.y)
    game.step(1 / 60)
    game.step(1 / 60)
    mud.forEach((blob, i) => expect(blob.y).toBeGreaterThan(at[i]))
    game.release()
  })

  it('water on its way asks for no save of its own, and a scene that starts while a stream runs is stored at once', () => {
    const game = gameOn('dune'), { moleRoom, pond } = game.on.ground.layout
    // A stream led from under the pond into the mole's room, and then hands off.
    game.press(spot(pond.col, pond.brim + pond.depth - 2))
    const to = spot((moleRoom.col0 + moleRoom.col1) >> 1, moleRoom.row0 + 4), from = spot(pond.col, pond.brim + pond.depth - 2)
    for (let i = 1; i <= 30; i++) { game.rubTo({ x: from.x + ((to.x - from.x) * i) / 30, y: from.y + ((to.y - from.y) * i) / 30 }); game.step(1 / 60) }
    game.release()
    expect(game.changed()).toBe(1)
    game.moving()
    let asked = 0, moved = false, urgent = false
    expect(until(game, 30, () => { const changed = game.changed(); if (changed === 1) asked++; urgent = urgent || changed === 2; moved = game.moving() || moved; return game.running('moleAfloat') })).toBe(true)
    expect([asked, moved, urgent]).toEqual([0, true, true])
    expect(game.toSave().mole).toBe('afloat')
    // The stream still runs, and what a put-away now stores is the hill to the cell.
    expect(game.on.ground.water).toBeGreaterThan(0)
    expect(decode(game.toSave().cells)).toEqual(game.on.ground.cells)
  })
})
