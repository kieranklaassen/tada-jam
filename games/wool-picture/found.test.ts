import { describe, expect, it } from 'vitest'
import { Game } from './game'
import { BOWLS, FELT, FOLK, GOOSE, LOOP, PEGS, PIG, SHEEP, SHEPHERD } from './layout'
import { cell, dab, daub, hangUp, setDown, settle } from './probe'
import { makeRng } from './rng'
import { SECONDS } from './scenes'
import { TICK, type End, type Toy } from './toy'
import { BLUE, GREEN, RUSSET, WHITE, YELLOW, encode } from './wool'

// Found as left (lesson 5). Put away at any instant, the game settles as a
// load would: what stands there after a put-away is, part for part, what a
// fresh load of the record just saved gives. Nothing is lost, no scene
// replays, and nothing that was in the air is still in the air.

const stored = (value: unknown): unknown => JSON.parse(JSON.stringify(value))
const near = (n: number): number => Math.round(n * 100) / 100

/** Everything of a toy that can be seen, heard or touched. */
function look(toy: Toy): unknown {
  return stored({
    t: near(toy.t), felt: encode(toy.sheet), kinds: toy.sheet.shapes.map((shape) => `${shape.kind}/${shape.veil}`), hand: toy.hand, size: toy.size, finished: toy.finished,
    folk: toy.folk.map((f) => ({ at: f.at, coat: f.coat, act: f.act, shown: f.shown, x: near(f.x), y: near(f.y), scale: near(f.scale), flip: f.flip, turn: near(f.turn), hat: near(f.hat), mood: f.mood, hop: f.hop, mist: f.mist, dried: f.dried, errand: f.errand, gaze: [near(f.gazeX), near(f.gazeY)] })),
    wall: toy.wall, moth: { perch: toy.moth.perch, x: near(toy.moth.x), y: near(toy.moth.y), flying: toy.moth.flying, orbit: toy.moth.orbit, via: toy.moth.via },
    show: toy.show, scene: toy.scene !== null, leaving: toy.leaving !== null, keys: toy.keys, pushed: toy.weather.pushed,
    rise: toy.rise.map(near), bowls: toy.bowls.map((bowl) => near(bowl.dip)), comb: near(toy.comb.dip), amount: near(toy.amount),
    floaters: toy.floaters.length, naps: toy.naps.length, pending: toy.pending, held: toy.held, stroke: toy.stroke !== null, down: toy.finger.down,
    knocked: toy.knocked, loopBackAt: toy.loopBackAt, clung: toy.clungAt.size, calm: near(toy.calm), changed: toy.changed, urgent: toy.urgent,
  })
}

/** A picture with weather in it: a hill, earth, a pond, a cloud that rains on the hill. No sun yet. */
function country(game: Game): void {
  const toy = game.toy
  daub(toy, GREEN, 6, 38, 30, 44)
  daub(toy, RUSSET, 40, 40, 56, 45)
  daub(toy, BLUE, 58, 36, 68, 42)
  daub(toy, WHITE, 8, 3, 22, 8)
  settle(toy)
}

function hangThree(game: Game): void {
  for (let i = 0; i < 3; i++) {
    daub(game.toy, [GREEN, BLUE, YELLOW][i], 10 + i * 12, 30, 20 + i * 12, 36)
    hangUp(game.toy)
    settle(game.toy)
    game.toy.press(cell(30, 20)); game.toy.end('tap')
    settle(game.toy)
  }
}

/** Every instant a put-away is tried at: how the game is brought there, and how the touch in progress, if any, is taken away. */
const INSTANTS: readonly [string, (game: Game) => void, End | null][] = [
  ['a first visit, untouched', () => undefined, null],
  ['mid-stroke, the finger still down', (game) => { game.press(cell(20, 30), false); game.move(cell(34, 28)); game.advance(0.2) }, 'dragCancel'],
  ['mid-stroke over a picture with weather', (game) => { country(game); game.toy.hand = YELLOW; game.press(cell(34, 6), false); game.move(cell(38, 8)); game.advance(0.3) }, 'dragCancel'],
  ['mid-comb', (game) => { country(game); game.toy.hand = 5; game.press(cell(10, 5), false); game.move(cell(20, 6)); game.advance(0.3) }, 'dragCancel'],
  ['a tuft carried from its bowl, not yet on the felt', (game) => { game.press({ x: BOWLS[3].x, y: BOWLS[3].y - 16 }, false); game.move({ x: BOWLS[3].x, y: BOWLS[3].y - 70 }); game.advance(0.1) }, 'dragCancel'],
  ['a figure from the dish in the hand', (game) => { country(game); game.press({ x: FOLK[PIG].x, y: FOLK[PIG].y - 60 }, false); game.move(cell(48, 38)); game.advance(0.3) }, 'dragCancel'],
  ['a figure from the picture in the hand', (game) => { country(game); setDown(game.toy, PIG, 48, 42); settle(game.toy); game.press({ x: game.toy.folk[PIG].x, y: game.toy.folk[PIG].y - 20 }, false); game.move(cell(20, 20)); game.advance(0.3) }, 'dragCancel'],
  ['a figure on its way home', (game) => { country(game); setDown(game.toy, GOOSE, 62, 39); game.press({ x: game.toy.folk[GOOSE].x, y: game.toy.folk[GOOSE].y - 20 }, false); game.move({ x: 900, y: 500 }); game.advance(TICK * 2); game.end('dragEnd'); game.advance(0.2) }, null],
  ['mid-hang, the loop in the hand', (game) => { country(game); game.press(LOOP, false); game.move({ x: 850, y: 100 }); game.advance(0.2) }, 'dragCancel'],
  ['the loop pressed and not yet let go', (game) => { country(game); game.press(LOOP, false) }, 'pressEnd'],
  ['the rain scene, two seconds in', (game) => { daub(game.toy, GREEN, 6, 38, 30, 44); daub(game.toy, WHITE, 8, 3, 22, 8); game.advance(2) }, null],
  ['the sun scene, two seconds in', (game) => { country(game); daub(game.toy, YELLOW, 30, 4, 35, 9); game.advance(2) }, null],
  ['the bow scene, seven seconds into the sun and the bow', (game) => { country(game); daub(game.toy, YELLOW, 30, 4, 35, 9); game.advance(7) }, null],
  ['the evening scene, as it starts', (game) => { country(game); setDown(game.toy, SHEEP, 12, 40); settle(game.toy); hangUp(game.toy) }, null],
  ['the evening scene, four seconds in', (game) => { country(game); setDown(game.toy, SHEEP, 12, 40); setDown(game.toy, SHEPHERD, 22, 40); settle(game.toy); hangUp(game.toy); game.advance(4) }, null],
  ['the evening scene with a fourth picture, half a second in', (game) => { hangThree(game); daub(game.toy, RUSSET, 10, 36, 30, 42); setDown(game.toy, GOOSE, 20, 38); settle(game.toy); hangUp(game.toy); game.advance(0.5) }, null],
  ['the evening, standing', (game) => { country(game); hangUp(game.toy); game.advance(20) }, null],
  ['the fresh felt, one second into its turn', (game) => { country(game); hangUp(game.toy); game.advance(20); game.press(cell(30, 20), false); game.end('tap'); game.advance(1) }, null],
  ['a figure poked, a bowl springing, the moth in the air', (game) => { country(game); game.press({ x: FOLK[SHEEP].x, y: FOLK[SHEEP].y - 60 }, false); game.end('tap'); game.press({ x: BOWLS[1].x, y: BOWLS[1].y - 16 }, false); game.end('tap'); game.press(game.toy.mothAt()!, false); game.end('tap'); game.advance(0.3) }, null],
  ['a yellow coat just laid, the moth circling its wearer', (game) => { country(game); setDown(game.toy, PIG, 48, 42); settle(game.toy); game.toy.hand = YELLOW; game.press({ x: game.toy.folk[PIG].x - 90, y: game.toy.folk[PIG].y - 30 }, false); game.move({ x: game.toy.folk[PIG].x, y: game.toy.folk[PIG].y - 30 }); game.advance(TICK); game.end('dragEnd'); game.advance(0.5) }, null],
]

/** That an instant was really reached before the put-away, by its name. */
const REACHED: Record<string, (toy: Toy) => boolean> = {
  'mid-stroke, the finger still down': (toy) => toy.stroke !== null && !toy.stroke.comb && toy.finger.down,
  'mid-comb': (toy) => toy.stroke !== null && toy.stroke.comb && toy.combed.length + toy.relaid.length >= 0 && toy.sheet.shapes.some((shape) => shape.kind === 'cloud'),
  'a figure from the dish in the hand': (toy) => toy.folk[PIG].act === 'held',
  'a figure from the picture in the hand': (toy) => toy.folk[PIG].act === 'held' && toy.held !== null && toy.held.kind === 'figure' && toy.held.origin !== null,
  'a figure on its way home': (toy) => toy.folk[GOOSE].hop !== null,
  'mid-hang, the loop in the hand': (toy) => toy.held !== null && toy.held.kind === 'loop' && toy.held.lifted,
  'the rain scene, two seconds in': (toy) => toy.show.kind === 'rain' && toy.show.fall > 0 && toy.show.fall < 1,
  'the sun scene, two seconds in': (toy) => toy.show.kind === 'sun' && toy.show.rays === 1 && toy.show.dry === 0,
  'the bow scene, seven seconds into the sun and the bow': (toy) => toy.show.kind === 'sun' && toy.show.dry === 1 && toy.show.arch > 0 && toy.show.hang < 1,
  'the evening scene, as it starts': (toy) => toy.show.kind === 'evening' && toy.show.swing === 0 && toy.folk[SHEEP].hop !== null,
  'the evening scene, four seconds in': (toy) => toy.show.kind === 'evening' && toy.show.swing === 1 && toy.show.ways > 0 && toy.show.ways < 1,
  'the evening scene with a fourth picture, half a second in': (toy) => toy.show.kind === 'evening' && toy.show.old !== null && toy.folk[GOOSE].errand,
  'the evening, standing': (toy) => toy.finished && toy.scene === null && toy.moth.perch === 3,
  'the fresh felt, one second into its turn': (toy) => toy.show.kind === 'fresh' && toy.show.turn < 1 && !toy.finished,
  'a figure poked, a bowl springing, the moth in the air': (toy) => toy.folk[SHEEP].mood === 'poke' && toy.moth.flying !== null && Math.abs(toy.bowls[1].dip) > 0.001,
  'a yellow coat just laid, the moth circling its wearer': (toy) => toy.folk[PIG].coat === YELLOW && toy.moth.orbit !== null,
}

describe('lesson 5: parked equals loaded, at every instant', () => {
  it('reaches every scene and every held state it claims to put away from', () => {
    for (const [name, bring] of INSTANTS) {
      if (!REACHED[name]) continue
      const game = new Game(undefined, 4, makeRng(5))
      bring(game)
      expect(REACHED[name](game.toy), name).toBe(true)
    }
    expect(Object.keys(REACHED).every((name) => INSTANTS.some(([instant]) => instant === name))).toBe(true)
  })

  it.each(INSTANTS)('%s', (_name, bring, takenAway) => {
    const game = new Game(undefined, 4, makeRng(5))
    bring(game)
    // The Mount's order at a put-away: the touch is taken away, the record is saved, the game is parked.
    if (takenAway) game.end(takenAway)
    const raw = stored(game.record())
    game.park()
    const loaded = new Game(raw, 4, makeRng(6))
    expect(look(game.toy)).toEqual(look(loaded.toy))
    // A put-away changes nothing that is saved, and the idle ladder is at the bottom again.
    expect(stored(game.record())).toEqual(raw)
    expect(game.guidance).toEqual(loaded.guidance)
    expect(game.guidance).toEqual({ glow: 0, demo: null, demoIndex: -1 })
    // Nothing is in the air and nothing is on its way: no scene, no sound owed, no finger, no hop.
    const toy = game.toy
    expect(toy.scene).toBeNull()
    expect(toy.show.kind).toBe('none')
    expect(toy.pending).toBe(0)
    expect(toy.held).toBeNull()
    expect(toy.stroke).toBeNull()
    expect(toy.folk.every((figure) => figure.hop === null && figure.act !== 'held' && !figure.errand)).toBe(true)
    expect(toy.moth.flying).toBeNull()
    // And it goes on as a loaded game goes on: the same in two seconds, with no scene and no sound by itself.
    for (let i = 0; i < 120; i++) {
      game.advance(TICK); loaded.advance(TICK)
      expect(toy.scene).toBeNull()
      expect(toy.takeSounds()).toBeNull()
      expect(toy.takeSceneSounds()).toBeNull()
    }
    expect(look(game.toy)).toEqual(look(loaded.toy))
  })

  it('loses nothing a put-away interrupts: laid wool, a figure\'s place, a coat and a hung picture are all in the record', () => {
    const game = new Game(undefined, 4, makeRng(5))
    country(game)
    setDown(game.toy, PIG, 48, 42)
    const pigAt = { ...game.toy.folk[PIG].at! }
    game.toy.hand = GREEN
    game.press(cell(50, 20), false); game.move(cell(60, 22)); game.advance(0.3)
    const mass = game.toy.sheet.shapes.reduce((sum, shape) => sum + shape.mass, 0)
    game.end('dragCancel')
    game.park()
    expect(game.toy.sheet.shapes.reduce((sum, shape) => sum + shape.mass, 0)).toBe(mass)
    expect(game.toy.folk[PIG].at).toEqual(pigAt)
    // A figure lifted out of the picture and taken away with the finger is back where it stood.
    game.press({ x: game.toy.folk[PIG].x, y: game.toy.folk[PIG].y - 20 }, false); game.move(cell(10, 10)); game.advance(0.2)
    expect(game.record().folk[PIG].at).toEqual(pigAt)
    game.end('dragCancel')
    game.park()
    expect(game.toy.folk[PIG].at).toEqual(pigAt)
  })
})

describe('what each scene saves when it starts', () => {
  it('saves nothing for the rain, the sun or the bow: each is a view of wool the touch already saved', () => {
    const game = new Game(undefined, 4, makeRng(5)), toy = game.toy
    daub(toy, GREEN, 6, 38, 30, 44)
    toy.changed = false
    daub(toy, WHITE, 8, 3, 22, 8)
    expect(toy.show.kind).toBe('rain')
    expect(toy.urgent).toBe(false)
    const during = stored(game.record())
    settle(toy)
    expect(stored(game.record())).toEqual(during)
    daub(toy, YELLOW, 30, 4, 35, 9)
    expect(toy.show.kind).toBe('sun')
    expect(toy.show.bow).toBe(true)
    expect(toy.urgent).toBe(false)
    const drying = stored(game.record())
    toy.advance(SECONDS.sun + 1)
    expect(toy.scene).not.toBeNull()
    settle(toy)
    expect(stored(game.record())).toEqual(drying)
    expect(Object.keys(drying as object).sort()).toEqual(['felt', 'finished', 'folk', 'hand', 'position', 'size', 'v', 'wall'])
  })

  it('saves the evening whole in the moment the loop is let go, and at once', () => {
    const game = new Game(undefined, 4, makeRng(5)), toy = game.toy
    country(game)
    setDown(toy, SHEEP, 12, 40)
    setDown(toy, GOOSE, 62, 39)
    settle(toy)
    toy.changed = false
    game.press(LOOP, false)
    game.move(PEGS[0])
    expect(toy.finished).toBe(false)
    game.end('dragEnd')
    expect(toy.urgent && toy.changed).toBe(true)
    const record = game.record()
    expect(record.finished).toBe(true)
    expect(record.felt).toEqual([])
    expect(record.wall).toHaveLength(1)
    expect(record.wall[0].peg).toBe(0)
    expect(record.folk.every((figure) => figure.at === null)).toBe(true)
    // The scene then shows the way there, and its end is what was saved at its start.
    expect(toy.scene).not.toBeNull()
    toy.advance(SECONDS.evening + 0.5)
    expect(toy.scene).toBeNull()
    expect(stored(game.record())).toEqual(stored(record))
  })

  it('saves the fresh felt in the moment the waiting felt is touched, and at once', () => {
    const game = new Game(undefined, 4, makeRng(5)), toy = game.toy
    country(game)
    hangUp(game.toy)
    settle(toy)
    toy.changed = false; toy.urgent = false
    // A touch anywhere on the frame that shows its back turns it round; it lays no wool.
    game.press({ x: FELT.x + 200, y: FELT.y + 200 }, false)
    expect(toy.urgent && toy.changed).toBe(true)
    expect(game.record().finished).toBe(false)
    expect(game.record().felt).toEqual([])
    game.end('tap')
    expect(toy.sheet.shapes).toHaveLength(0)
    expect(toy.show.kind).toBe('fresh')
    // A touch while it turns ends the turn at once, and is then an ordinary touch.
    dab(toy, GREEN, 30, 30)
    expect(toy.scene).toBeNull()
    expect(toy.sheet.shapes).toHaveLength(1)
  })

  it('takes the oldest picture off the wall in the save of the scene that hangs a fourth, on the peg that picture had', () => {
    const game = new Game(undefined, 4, makeRng(5)), toy = game.toy
    hangThree(game)
    expect(toy.wall.map((picture) => picture.peg)).toEqual([0, 1, 2])
    const oldest = toy.wall[0].veils, second = toy.wall[1].veils
    daub(toy, RUSSET, 10, 36, 30, 42)
    hangUp(game.toy)
    expect(game.record().wall.map((picture) => picture.peg)).toEqual([1, 2, 0])
    expect(game.record().wall.some((picture) => picture.veils === oldest)).toBe(false)
    expect(game.record().wall[0].veils).toBe(second)
    // It is seen and heard to go: the scene has the goose take it down first.
    expect(toy.show.old?.veils).toBe(oldest)
    expect(toy.show.down).toBe(0)
    expect(toy.takeSceneSounds()).not.toBeNull()
    toy.advance(0.5)
    expect(toy.folk[GOOSE].errand).toBe(true)
    toy.advance(1.2)
    expect(toy.folk[GOOSE].errand).toBe(false)
    // A drag let go on the oldest picture hangs the new one there.
    settle(toy)
    game.press(cell(30, 20), false); game.end('tap'); settle(toy)
    dab(toy, BLUE, 30, 30)
    const next = toy.wall[0].peg
    game.press(LOOP, false); game.move(PEGS[next]); game.advance(0.1); game.end('dragEnd')
    expect(toy.finished).toBe(true)
    expect(toy.wall[toy.wall.length - 1].peg).toBe(next)
    expect(toy.wall).toHaveLength(3)
  })
})
