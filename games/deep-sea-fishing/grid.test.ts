import { describe, expect, it } from 'vitest'
import { ACTS, type BaitPose } from './acts'
import { REEL_STEP, type Game } from './game'
import { CELLS, cellOf, gridKeys, type CellKey, type CueName } from './grid'
import type { Item } from './items'
import { FRAME, beside, bring, draw, make, run } from './kit'
import type { Fish } from './motion'
import { SLIDE, TIP, TIP_BEATS, TIP_LASTS, TOW, TOW_BEATS, TOW_LASTS, slideAt, tipAt, towAt } from './scenes'
import { BAITS, CREATURES, CREATURE_IDS, PEGS, type Bait, type CreatureId } from './sea'
import { GRID_VOICES, type Cue } from './voices'

// One timeline for what is seen and what is heard. The rules play an answer by
// its cell (grid.ts), the figure reads its moments from the same cell
// (acts.ts), and the notes are named by it (voices.ts). These tests walk every
// cell of the grid and both scenes and fail when a note sounds at a moment
// other than its own, or while its maker is not drawn doing it.

const ALL_BAITS: Bait[] = [...BAITS, 'none']
const isGrid = (cue: Cue): boolean => cue.name in GRID_VOICES

/** How much the figure of an answer differs from the creature at rest, right now: its pose, the bait, its fish, and whatever else it draws. */
function doing(game: Game, id: CreatureId): number {
  const c = game.creatures[id]
  if (c.cell === null || c.cut || c.mode === 'away') return 0
  const act = ACTS[c.cell], moment = game.momentOf(id)!, rest = game.resting(id), shown = game.shown(id)
  let changed = 0
  for (const key of ['x', 'y', 'rot', 'sx', 'sy', 'open', 'a', 'b', 'lid', 'glow', 'alt', 'hid', 'pupil', 'more', 'tint', 'face'] as const) if (Math.abs(shown[key] - rest[key]) > 1e-4) changed++
  if (shown.look !== rest.look) changed++
  if (act.bait) {
    const at = game.baitAt(), bait: BaitPose = { x: at.x, y: at.y, rot: 0, sx: 1, sy: 1, a: 1, spring: false }
    act.bait(bait, moment, shown)
    if (bait.x !== at.x || bait.y !== at.y || bait.rot !== 0 || bait.sx !== 1 || bait.sy !== 1 || bait.a !== 1 || bait.spring) changed++
  }
  if (act.draw) {
    const items: Item[] = []
    act.draw(items, moment, shown, 1)
    changed += items.length
  }
  if (act.fish) {
    const fish: Fish = { x: 0, y: 0, face: 1, rot: 0, a: 1 }
    act.fish(fish, 0, moment, shown)
    if (fish.x !== 0 || fish.y !== 0) changed++
  }
  return changed
}

/** Brings the bait to the creature and plays its whole answer, noting every sound with the cell and the second it fell in. */
function answer(bait: Bait, id: CreatureId, seconds?: number): { game: Game; first: CellKey | null; heard: { cue: Cue; cell: CellKey | null; since: number; cut: boolean; doing: number }[] } {
  const game = beside(id, bait)
  const heard: { cue: Cue; cell: CellKey | null; since: number; cut: boolean; doing: number }[] = []
  let first: CellKey | null = null
  const pending: { entry: (typeof heard)[number]; due: number; cell: CellKey }[] = []
  const each = (cues: readonly Cue[]): void => {
    const c = game.creatures[id]
    first ??= c.cell
    for (const cue of cues) {
      if (!isGrid(cue)) continue
      const entry = { cue, cell: c.cell, since: c.since, cut: c.cut, doing: doing(game, id) }
      heard.push(entry)
      // The figure is looked at again a moment into the sound, since a figure eases in from rest.
      if (c.cell !== null) pending.push({ entry, due: game.time + 0.15, cell: c.cell })
    }
    for (const wait of pending) if (game.time >= wait.due && c.cell === wait.cell) { wait.entry.doing = Math.max(wait.entry.doing, doing(game, id)); wait.due = Infinity }
  }
  const lasts = seconds ?? (first === null ? 3.2 : 0)
  bring(game, id, lasts + 3.2, each)
  return { game, first, heard }
}

describe('every cell of the grid', () => {
  it('holds 54 cells, one for each bait and creature, and each has a figure', () => {
    const keys = gridKeys(ALL_BAITS, CREATURE_IDS)
    expect(keys).toHaveLength(54)
    for (const key of keys) expect(CELLS[key], key).toBeDefined()
    expect(Object.keys(ACTS).sort()).toEqual(Object.keys(CELLS).sort())
  })

  it('changes the state of play in 18 cells and is a joke in the other 36', () => {
    const outcomes = gridKeys(ALL_BAITS, CREATURE_IDS).map((key) => (key === 'worm.blobfish' ? CELLS['worm.blobfish.gulp'].outcome : key === 'spoon.squid' ? CELLS['spoon.squid.lit'].outcome : CELLS[key].outcome))
    expect(outcomes.filter((outcome) => outcome !== 'joke')).toHaveLength(18)
    expect(outcomes.filter((outcome) => outcome === 'joke')).toHaveLength(36)
  })

  it('keeps every sound inside its answer, and the outcome too', () => {
    for (const [key, cell] of Object.entries(CELLS)) {
      for (const beat of cell.beats) expect(beat.at, key).toBeLessThan(Math.max(cell.lasts, 0.01))
      if (cell.outcome !== 'joke' && cell.outcome !== 'tows') expect(cell.at, key).toBeLessThan(cell.lasts)
    }
  })

  for (const bait of ALL_BAITS) for (const id of CREATURE_IDS) {
    const key = `${bait}.${id}` as CellKey
    if (cellOf(key).outcome === 'tows') continue
    it(`${key}: sounds each of its notes once, at its moment, while its figure is doing it`, () => {
      const { first, heard } = answer(bait, id)
      expect(first).toBe(key)
      const mine = heard.filter((entry) => entry.cell === key)
      // The blobfish's wait ends in the gulp when the worm is in its mouth, and that is a cell of its own.
      const beats = cellOf(key).beats
      expect(mine.map((entry) => entry.cue.name)).toEqual(beats.map((beat) => beat.cue))
      mine.forEach((entry, index) => {
        expect(entry.cut).toBe(false)
        expect(Math.abs(entry.since - beats[index].at), `${key} ${entry.cue.name}`).toBeLessThanOrEqual(FRAME + 1e-6)
        expect(entry.cue.index, `${key} ${entry.cue.name}`).toBe(beats[index].index)
        expect(entry.doing, `${key} ${entry.cue.name} at ${beats[index].at}: the figure is at rest`).toBeGreaterThan(0)
      })
      // Nothing of the grid sounds from this creature outside an answer.
      for (const entry of heard) expect(entry.cell, entry.cue.name).not.toBeNull()
    })
  }

  it('worm.blobfish.gulp: a worm lowered right into the open mouth is gulped, with its note at its moment', () => {
    const game = beside('blobfish', 'worm')
    bring(game, 'blobfish', 1.4)
    expect(game.creatures.blobfish.cell).toBe('worm.blobfish')
    expect(game.hooked).toBeNull()
    const pose = game.resting('blobfish')
    let at = -1
    const heard = draw(game, { x: pose.x + 70 * pose.face, y: pose.y + 2 }, 1.2, (cues) => { if (cues.some((cue) => cue.name === 'gulp')) at = game.creatures.blobfish.since })
    expect(heard.filter((cue) => cue.name === 'gulp')).toHaveLength(1)
    expect(Math.abs(at - 0.1)).toBeLessThanOrEqual(FRAME + 1e-6)
    expect(game.hooked).toBe('blobfish')
  })

  it('spoon.squid.lit and spoon.blobfish.lit: a spoon beside a light is answered otherwise than a dull one', () => {
    // The jellyfish has followed the stick down to each of them, and the spoon is swapped in beside it.
    for (const id of ['squid', 'blobfish'] as const) {
      const dull = answer('spoon', id)
      expect(dull.first).toBe(`spoon.${id}`)
      const probe = beside(id, 'spoon'), near = probe.touchPoint(id)
      // The jellyfish hangs beside the squid, or over the blobfish, and the hook comes in from where it passes neither on the way.
      const [light, start] = id === 'squid' ? [{ x: 118, y: -40 }, { x: 40, y: -110 }] : [{ x: -114, y: -62 }, { x: 0, y: -115 }]
      const game = make({ bait: 'spoon', hook: { x: near.x + start.x, y: near.y + start.y } })
      const jelly = game.creatures.jelly
      jelly.off.x = near.x + light.x - CREATURES.jelly.home.x
      jelly.off.y = near.y + light.y - CREATURES.jelly.home.y
      jelly.mode = 'return'
      const heard: Cue[] = []
      let first: CellKey | null = null
      bring(game, id, 2.4, (cues) => { first ??= game.creatures[id].cell; heard.push(...cues.filter(isGrid)) })
      expect(first).toBe(`spoon.${id}.lit`)
      expect(heard.map((cue) => cue.name)).toEqual(cellOf(`spoon.${id}.lit`).beats.map((beat) => beat.cue))
    }
  })

  it('glow.squid.bye: when the stick leaves, the squid waves one arm, without a sound', () => {
    const game = beside('squid', 'glow')
    bring(game, 'squid', 2.2)
    expect(game.creatures.squid.cell).toBeNull()
    const heard = draw(game, { x: 330, y: 600 }, 0.7)
    expect(game.creatures.squid.cell).toBe('glow.squid.bye')
    expect(doing(game, 'squid')).toBeGreaterThan(0)
    expect(heard.filter(isGrid)).toEqual([])
  })
})

describe('an answer that is broken off', () => {
  const CUTTABLE = (Object.keys(CELLS) as CellKey[]).filter((key) => { const cell = cellOf(key); return !('stays' in cell) && !('grip' in cell) && cell.lasts > 0.6 && key.split('.').length === 2 })

  it('sounds nothing more once the hook has been drawn away, and its figure fades', () => {
    expect(CUTTABLE.length).toBeGreaterThan(25)
    for (const key of CUTTABLE) {
      const [bait, id] = key.split('.') as [Bait, CreatureId]
      const cell = cellOf(key), game = beside(id, bait)
      let began = false
      // The finger brings the hook, and the moment the answer begins it draws the hook far away again.
      game.press(game.touchPoint(id))
      for (let i = 0; i < 90 && !began; i++) { game.drag(game.touchPoint(id)); run(game, FRAME); began = game.creatures[id].cell === key }
      expect(began, key).toBe(true)
      const from = game.touchPoint(id), away = { x: from.x < 590 ? from.x + 420 : from.x - 420, y: Math.max(300, from.y - 60) }
      game.drag(away)
      let cutAt = -1
      const after: string[] = []
      for (let i = 0; i < 240; i++) {
        run(game, FRAME, (cues) => { if (cutAt >= 0) for (const cue of cues) if (cell.beats.some((beat) => beat.cue === cue.name)) after.push(cue.name) })
        if (cutAt < 0 && (game.creatures[id].cut || game.creatures[id].cell !== key)) cutAt = game.time
      }
      // Only an answer whose outcome had not yet landed is broken off; one that landed first plays out.
      if (cell.outcome === 'joke' || cell.at > 0.5) {
        expect(after, `${key} sounded on after it was broken off`).toEqual([])
        expect(game.creatures[id].cell, key).toBeNull()
        expect(game.creatures[id].cut, key).toBe(false)
      }
    }
  })

  it('is broken off when the bait is changed under it', () => {
    const game = beside('turtle', 'worm')
    bring(game, 'turtle', 0.5)
    expect(game.creatures.turtle.cell).toBe('worm.turtle')
    game.press({ x: PEGS.spoon.x, y: 110 })
    const heard = run(game, 3).filter(isGrid).map((cue) => cue.name as CueName)
    // The worm is back on its peg unharmed, the spoon is on, and no crunch is heard for a worm that is not there.
    expect(heard).not.toContain('crunch')
    expect(heard).not.toContain('swallow')
    expect(game.bait).toBe('spoon')
  })
})

describe('the tow, on one timeline', () => {
  function towed(): Game {
    const game = beside('shark', 'worm', { tub: ['puffer', 'jelly'] })
    bring(game, 'shark', 0.6)
    return game
  }

  it('sounds each note once at its moment, with the picture doing it', () => {
    const game = beside('shark', 'worm', { tub: ['puffer', 'jelly'] })
    const heard: { name: string; t: number }[] = []
    const each = (cues: readonly Cue[]): void => { for (const cue of cues) if (cue.name.startsWith('tow')) heard.push({ name: cue.name, t: game.tow ? game.tow.t : TOW_LASTS }) }
    bring(game, 'shark', 0.6, each)
    expect(game.tow).not.toBeNull()
    run(game, TOW_LASTS + 0.5, each)
    expect(heard.map((entry) => entry.name)).toEqual(TOW_BEATS.map((beat) => beat.cue.name))
    heard.forEach((entry, index) => expect(Math.abs(entry.t - TOW_BEATS[index].at), entry.name).toBeLessThanOrEqual(2 * FRAME))
    expect(game.tow).toBeNull()
    // The picture at each note: the mouth open for the gulp, the line tight for the creak, the boat drawn along at the lurch, the tub slopping, the mouth open again as the hook is spat out.
    const bite = { x: 845, y: 492, face: 1 as const }
    expect(towAt(0.05, bite).open).toBe(1)
    expect(towAt(TOW.tight + 0.2, bite).tight).toBeGreaterThan(0.3)
    expect(towAt(TOW.lurch + 0.3, bite).heel).not.toBe(0)
    for (const at of TOW.slops) expect(towAt(at + 0.2, bite).slop).toBeGreaterThan(0.5)
    expect(towAt(TOW.spits + 0.05, bite).open).toBe(1)
    expect(towAt(TOW.spits + 0.05, bite).held).toBe(false)
    expect(towAt(TOW.spits - 0.05, bite).held).toBe(true)
    expect(towAt(TOW_LASTS, bite).shift).toBeCloseTo(0, 5)
    expect(towAt(TOW_LASTS, bite).x).toBeCloseTo(bite.x, 5)
  })

  it('has the cat cling at the lurch and shake itself after', () => {
    const game = towed()
    run(game, TOW.lurch + 0.1)
    expect(game.cat.act).toBe('cling')
    run(game, TOW.shakes - TOW.lurch)
    expect(game.cat.act).toBe('shake')
  })

  it('gives way to any touch: the rest lands without its sounds, and the touch is then an ordinary one', () => {
    const game = towed()
    run(game, 2)
    game.cues.length = 0
    // A tap on the cheese.
    game.press({ x: PEGS.cheese.x, y: 110 })
    expect(game.tow).toBeNull()
    expect(game.playing).toBe(false)
    expect(game.cues.map((cue) => cue.name)).toEqual(['baitOn'])
    expect(game.bait).toBe('cheese')
    const later = run(game, 8)
    expect(later.filter((cue) => cue.name.startsWith('tow'))).toEqual([])
    // The hook is where the scene was taking it, and the shark is on its way home.
    expect(game.rest).toEqual({ x: 620, y: 246 })
    expect(Math.hypot(game.hook.x - 620, game.hook.y - 246)).toBeLessThan(3)
    expect(game.creatures.shark.mode).toBe('home')
  })
})

describe('the tip-out, on one timeline', () => {
  const FULL = ['puffer', 'jelly', 'octopus', 'angler'] as const
  function tipping(): Game {
    const game = make({ tub: [...FULL] })
    game.press({ x: 285, y: 140 })
    game.release()
    return game
  }

  it('sounds each note once at its moment, with the picture doing it', () => {
    const game = make({ tub: [...FULL] })
    const heard: { cue: Cue; t: number }[] = []
    const each = (cues: readonly Cue[]): void => { for (const cue of cues) heard.push({ cue, t: game.tip ? game.tip.t : TIP_LASTS }) }
    game.press({ x: 285, y: 140 })
    each(game.cues)
    game.cues.length = 0
    expect(game.tip).not.toBeNull()
    run(game, TIP_LASTS + 0.5, each)
    // The hook hangs at its rest, wound in already: the reel does not click.
    expect(heard.filter((entry) => entry.cue.name === 'click')).toEqual([])
    const scene = heard
    expect(scene.map((entry) => entry.cue.name)).toEqual(TIP_BEATS.map((beat) => beat.cue.name))
    scene.forEach((entry, index) => expect(Math.abs(entry.t - TIP_BEATS[index].at), entry.cue.name).toBeLessThanOrEqual(2 * FRAME))
    // The picture at each note.
    expect(tipAt(0.3).tipped).toBeGreaterThan(0.1)
    FULL.forEach((_id, index) => {
      // Each catch has its own splash, at the moment its slide meets the water.
      expect(slideAt(TIP.slides[index] + SLIDE - 0.02, index)).not.toBeNull()
      expect(slideAt(TIP.slides[index] + SLIDE, index)).toBeNull()
      expect(slideAt(TIP.slides[index] - 0.01, index)?.a).toBe(1)
    })
    expect(Math.abs(tipAt(TIP.rocks + 0.3).heel)).toBeGreaterThan(0.03)
    expect(tipAt(TIP.winds + 0.4).wound).toBeGreaterThan(0)
    expect(tipAt(TIP.winds + 0.4).wound).toBeLessThan(1)
    expect(tipAt(TIP.lit - 0.01).lit).toBe(false)
    expect(tipAt(TIP.lit).lit).toBe(true)
    expect(Math.abs(tipAt(TIP_LASTS).heel)).toBeLessThan(1e-6)
    expect(tipAt(TIP_LASTS).tipped).toBe(0)
  })

  it('winds the line in with the reel\'s own clicks, each turning its bar, and with none when the hook is already wound in', () => {
    const game = make({ tub: [...FULL], hook: { x: 640, y: 560 } })
    game.press({ x: 285, y: 140 })
    game.cues.length = 0
    const was = game.reel
    const clicks: { t: number; up: boolean }[] = []
    run(game, TIP_LASTS + 0.5, (cues) => { for (const cue of cues) if (cue.name === 'click') clicks.push({ t: game.tip ? game.tip.t : TIP_LASTS, up: cue.up === true }) })
    expect(clicks.length).toBeGreaterThan(8)
    // They fall while the line winds in, and each is the line coming in.
    for (const click of clicks) { expect(click.up).toBe(true); expect(click.t).toBeGreaterThanOrEqual(TIP.winds); expect(click.t).toBeLessThanOrEqual(TIP.wound + 0.3) }
    expect(game.reel).toBeCloseTo(was - clicks.length * REEL_STEP, 6)
    expect(tipAt(TIP.winds + 0.4).wound).toBeGreaterThan(0)
  })

  it('lets each catch into the sea at its own splash, in the order they landed, and has the cat ride the wave and curl up', () => {
    const game = tipping()
    FULL.forEach((id, index) => {
      run(game, TIP.slides[index] + SLIDE - (game.tip?.t ?? 0) - 2 * FRAME)
      expect(game.creatures[id].mode, id).toBe('away')
      run(game, 4 * FRAME)
      expect(game.creatures[id].mode, id).toBe('return')
    })
    run(game, TIP.wave - game.tip!.t + 0.1)
    expect(game.cat.act).toBe('ride')
    run(game, TIP.curls + 0.5 - game.tip!.t)
    expect(game.cat.act).toBe('settle')
    run(game, 2)
    expect(game.tip).toBeNull()
    expect(game.cat.asleep).toBe(true)
  })

  it('gives way to any touch: the rest lands without its sounds', () => {
    const game = tipping()
    run(game, 1.2)
    game.cues.length = 0
    // A tap on the gull.
    game.press({ x: 690, y: 40 })
    expect(game.tip).toBeNull()
    expect(game.cues.map((cue) => cue.name)).toEqual(['squawk'])
    for (const id of FULL) expect(game.creatures[id].mode, id).toBe('return')
    expect(game.cat.asleep).toBe(true)
    expect(game.finished).toBe(true)
    const later = run(game, 9)
    expect(later.filter((cue) => cue.name.startsWith('tip') || cue.name === 'lantern')).toEqual([])
  })
})
