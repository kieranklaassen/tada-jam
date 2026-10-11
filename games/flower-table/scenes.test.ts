import { describe, expect, it } from 'vitest'
import { nextPosition } from './cast'
import { LADDER } from './config'
import { Garden, REACH_AFTER, potBox } from './garden'
import { PATH, PATH_HOLDS, TABLE, VASE, VISITOR, WAITING } from './layout'
import { BED, SOIL_Y, fullOf } from './plants'
import { deserialize, serialize, type Saved } from './save'

// Each scene saves its whole outcome as it starts (scene.ts): a put-away at any
// moment of it loses nothing, and nothing replays on load. One test for each
// scene says what that scene saves at its start.

const open = (position: string, more: Partial<Saved> = {}, seed = 1): Garden => new Garden({ ...deserialize(null, null), position, ...more }, seed)
const stored = (garden: Garden): Saved => deserialize(JSON.parse(JSON.stringify(serialize(garden.toSave()))), null)
const run = (garden: Garden, seconds: number): void => { for (let t = 0; t < seconds - 1e-9; t += 0.05) garden.step(0.05) }
/** A finger lands on the stem at `index`, `up` above the earth, and lets go at (x, y). */
const carry = (garden: Garden, index: number, up: number, x: number, y: number): void => {
  garden.press(BED[index].x, SOIL_Y - up)
  garden.move(x, y)
  garden.lift(x, y)
  run(garden, 1)
}
const overVase = (garden: Garden, dx = 0): [number, number] => [garden.vaseDef.x + dx, garden.vaseDef.mouthY - 60]
const touch = (garden: Garden, x: number, y: number): void => { garden.press(x, y); garden.lift(x, y) }
/** Steps until no scene plays, and says how long that took. */
const watch = (garden: Garden): number => { let t = 0; while (garden.playing && t < 30) { garden.step(0.05); t += 0.05 } return t }
const top = (stem: number, len: number) => ({ stem, base: fullOf(stem) - len, len, head: true, spent: false })

describe('the handing over', () => {
  const bouquet = (): Garden => {
    const garden = open('goat-boot')
    carry(garden, 10, 60, ...overVase(garden))
    carry(garden, 6, 120, ...overVase(garden, 10))
    carry(garden, 4, 120, ...overVase(garden, -10))
    garden.press(VISITOR.x, VISITOR.y)
    return garden
  }

  it('saves at its start what it will leave: the turn finished, the vase empty, the bouquet out in the street as it will end', () => {
    const garden = bouquet()
    expect(garden.playing).toBe(true)
    expect(garden.dirty).toBe('now')
    const atStart = stored(garden)
    expect(atStart.finished).toBe(true)
    expect(atStart.vase).toEqual([])
    expect(atStart.shown).toEqual(['hand-over'])
    // The goat eats the bouquet, all but the first piece that was put in: the dandelion, blown bald by its sneeze.
    expect(atStart.street).toEqual([{ who: 'goat', pieces: [expect.objectContaining({ stem: 10, spent: true })] }])
    expect(atStart.position).toBe('goat-boot')
    const seconds = watch(garden)
    expect(seconds).toBeGreaterThanOrEqual(5.9)
    expect(seconds).toBeLessThanOrEqual(10.1)
    expect(stored(garden)).toEqual(atStart)
    expect(garden.actors.goat.where).toBe('street')
    expect(garden.pot.on).toBe(false)
    expect(garden.streetSeen).toEqual(garden.street)
  })

  it('is ended by a touch with everything where it was going, in silence, and that touch is then an ordinary touch', () => {
    const garden = bouquet()
    const atStart = stored(garden)
    run(garden, 1.5)
    garden.sounds = []
    garden.press(BED[0].x, SOIL_Y - 200)
    expect(garden.playing).toBe(false)
    expect(garden.actors.goat.where).toBe('street')
    expect(garden.carried).toBeNull()
    expect(garden.streetSeen).toEqual(garden.street)
    // The touch cut the sunflower, and only that is heard.
    expect(garden.hand?.stem).toBe(0)
    const press = open('goat-boot'); press.press(BED[0].x, SOIL_Y - 200)
    expect(garden.sounds).toEqual(press.sounds)
    garden.putBack()
    expect({ ...stored(garden), bed: atStart.bed, path: atStart.path }).toEqual(atStart)
  })

  it('opens again on the finished turn with nothing replaying: the next visitor waits at the gate for a touch', () => {
    const garden = bouquet()
    run(garden, 2)
    const again = new Garden(stored(garden), 5)
    expect(again.playing).toBe(false)
    expect(again.busy).toBe(false)
    expect(again.actors.goat.where).toBe('street')
    expect(again.actors.beekeeper.where).toBe('gate')
    expect(again.pot.on).toBe(false)
    run(again, 30)
    expect(again.sounds).toEqual([])
    expect(again.dirty).toBe('no')
    expect(stored(again)).toEqual(stored(garden))
  })

  it('starts when the vase is carried to the visitor, and a vase let go short of it slides back with every piece as it stood', () => {
    const garden = open('beekeeper-jar')
    carry(garden, 0, 200, ...overVase(garden))
    const before = stored(garden)
    const box = potBox(garden.vaseDef)
    const grab: [number, number] = [(box.left + box.right) / 2, (box.top + box.bottom) / 2]
    garden.press(...grab)
    garden.move(grab[0] + 40, grab[1] - 30)
    expect(garden.pot.held).toBe(true)
    // In the hand at a put-away: its place is not stored.
    expect(stored(garden)).toEqual(before)
    garden.lift(grab[0] + 40, grab[1] - 30)
    run(garden, 1)
    expect(garden.pot).toMatchObject({ dx: 0, dy: 0, held: false })
    expect(stored(garden)).toEqual(before)
    garden.press(...grab)
    garden.move(VISITOR.x, VISITOR.y)
    garden.lift(VISITOR.x, VISITOR.y)
    expect(garden.playing).toBe(true)
    expect(stored(garden).finished).toBe(true)
    expect(stored(garden).street).toEqual([{ who: 'beekeeper', pieces: before.vase }])
  })

  it('is only a poke while the vase is empty', () => {
    const garden = open('aunt-boot')
    touch(garden, VISITOR.x, VISITOR.y)
    expect(garden.playing).toBe(false)
    expect(garden.actors.aunt.act?.name).toBe('poke')
    expect(garden.dirty).toBe('no')
  })

  it('leaves each visitor its whole bouquet but the goat, and blows the bride\'s dandelions bald', () => {
    const garden = open('bride-vase')
    carry(garden, 10, 60, ...overVase(garden))
    carry(garden, 2, 90, ...overVase(garden, 4))
    garden.press(VISITOR.x, VISITOR.y)
    expect(stored(garden).street).toEqual([{ who: 'bride', pieces: [expect.objectContaining({ stem: 10, spent: true }), expect.objectContaining({ stem: 2, spent: false })] }])
  })
})

describe('coming in', () => {
  const finished = (): Garden => open('goat-boot', {
    finished: true,
    bed: BED.map((_, index) => (index % 3 === 0 ? 40 : fullOf(index))),
    path: [{ ...top(2, 100), spent: true, x: 300, y: 760, rot: 1.62 }],
    street: [{ who: 'goat', pieces: [{ ...top(6, 90), at: 0 }] }, { who: 'beekeeper', pieces: [{ ...top(4, 90), at: 0 }] }],
  })

  it('saves at its start: the turn one on, the vase empty, the bed whole, that visitor\'s old bouquet gone, the path as it was', () => {
    const garden = finished()
    const before = stored(garden)
    touch(garden, WAITING.x, 520)
    expect(garden.playing).toBe(true)
    expect(garden.dirty).toBe('now')
    const atStart = stored(garden)
    expect(atStart).toEqual({ ...before, position: 'beekeeper-jar', finished: false, bed: BED.map((_, index) => fullOf(index)), street: [before.street[0]] })
    // The stalks are seen growing one after the other, from the window end.
    expect(garden.stems.filter((stem) => stem.hold).map((stem) => stem.index)).toEqual([0, 3, 6, 9])
    run(garden, 2.2)
    expect(garden.stems[0].hold).toBe(false)
    expect(garden.stems[9].hold).toBe(true)
    const seconds = 2.2 + watch(garden)
    expect(seconds).toBeGreaterThan(3.5)
    expect(seconds).toBeLessThan(4.6)
    run(garden, 1)
    expect(stored(garden)).toEqual(atStart)
    expect(garden.actors.beekeeper).toMatchObject({ where: 'table', x: VISITOR.x, scale: 1, act: null })
    expect(garden.actors.bride).toMatchObject({ where: 'gate', x: WAITING.x, alpha: 1 })
    expect(garden.pot).toMatchObject({ id: 'jar', on: true, dx: 0, dy: 0, scale: 1 })
    expect(garden.busy).toBe(false)
  })

  it('does not start while the visitor of this turn is still at the table: the one who waits only lifts its vase', () => {
    const garden = open('goat-boot')
    touch(garden, WAITING.x, 520)
    expect(garden.playing).toBe(false)
    expect(garden.actors.beekeeper.act?.name).toBe('lift')
    expect(garden.dirty).toBe('no')
    expect(stored(garden).position).toBe('goat-boot')
  })

  it('is ended by a touch with the visitor at the table, the vase set down and every stalk grown', () => {
    const garden = finished()
    touch(garden, WAITING.x, 520)
    run(garden, 0.5)
    garden.sounds = []
    garden.press(600, 100)
    expect(garden.playing).toBe(false)
    expect(garden.actors.beekeeper).toMatchObject({ where: 'table', x: VISITOR.x })
    expect(garden.actors.bride.where).toBe('gate')
    expect(garden.stems.every((stem) => stem.grow === 1 && !stem.hold && stem.height === stem.full)).toBe(true)
    expect(garden.pot).toMatchObject({ dx: 0, dy: 0, scale: 1 })
  })

  it('never starts by itself: a finished garden left alone stays as it is', () => {
    const garden = finished()
    const before = stored(garden)
    run(garden, 120)
    expect(garden.dirty).toBe('no')
    expect(stored(garden)).toEqual(before)
  })

  it('goes round the whole ring, one turn for each visitor called in, and comes back to where it began', () => {
    const garden = open(LADDER[0])
    let at = LADDER[0]
    for (let turn = 0; turn < LADDER.length; turn++) {
      carry(garden, turn % BED.length, fullOf(turn % BED.length) - 90, ...overVase(garden))
      touch(garden, VISITOR.x, VISITOR.y)
      watch(garden)
      expect(stored(garden)).toMatchObject({ position: at, finished: true })
      touch(garden, WAITING.x, 520)
      at = nextPosition(at)
      expect(stored(garden)).toMatchObject({ position: at, finished: false })
      watch(garden)
      run(garden, 1)
    }
    expect(at).toBe(LADDER[0])
    // Each visitor's old bouquet went as it came in, so the street never holds more than one for each.
    expect(stored(garden).street.length).toBeLessThanOrEqual(4)
  })
})

describe('the reach', () => {
  it('plays once ever, after a few seconds without a touch with a piece in the vase, and saves that it was shown as it starts', () => {
    const garden = open('goat-boot')
    run(garden, REACH_AFTER + 2)
    expect(garden.playing).toBe(false)
    carry(garden, 0, 200, ...overVase(garden))
    garden.dirty = 'no'
    run(garden, REACH_AFTER - 1.2)
    expect(garden.playing).toBe(false)
    expect(stored(garden).shown).toEqual([])
    run(garden, 1)
    expect(garden.playing).toBe(true)
    expect(garden.dirty).toBe('now')
    expect(stored(garden).shown).toEqual(['hand-over'])
    expect(garden.actors.goat.act?.name).toBe('reach')
    const seconds = watch(garden)
    expect(seconds).toBeGreaterThan(1.5)
    expect(seconds).toBeLessThan(2.5)
    // It changed nothing else, and it does not come again.
    expect(garden.vase).toHaveLength(1)
    expect(garden.pot).toMatchObject({ dx: 0, dy: 0 })
    garden.dirty = 'no'
    run(garden, 30)
    expect(garden.dirty).toBe('no')
  })

  it('is still owed after a put-away before it started, and starts at the same cause with the seconds counted afresh', () => {
    const garden = open('goat-boot')
    carry(garden, 0, 200, ...overVase(garden))
    run(garden, REACH_AFTER - 1.5)
    const again = new Garden(stored(garden), 2)
    expect(again.playing).toBe(false)
    run(again, REACH_AFTER - 0.2)
    expect(again.playing).toBe(false)
    run(again, 0.4)
    expect(again.playing).toBe(true)
    // Opened again after that, it is not shown a second time.
    const third = new Garden(stored(again), 3)
    run(third, 30)
    expect(third.dirty).toBe('no')
  })

  it('is not shown once the child has handed a vase over by itself', () => {
    const garden = open('goat-boot')
    carry(garden, 0, 200, ...overVase(garden))
    touch(garden, VISITOR.x, VISITOR.y)
    expect(stored(garden).shown).toEqual(['hand-over'])
  })
})

describe('the vase goes over', () => {
  const tipped = (): Garden => {
    const garden = open('bride-vase')
    carry(garden, 0, 30, ...overVase(garden, 16))
    expect(garden.playing).toBe(false)
    // One head short of going over, the vase rocks.
    expect(garden.pot.rock).toBeGreaterThan(0)
    garden.press(BED[1].x, SOIL_Y - 30)
    garden.move(...overVase(garden, 16))
    garden.lift(...overVase(garden, 16))
    return garden
  }

  it('saves at its start: the vase empty, and every spilled piece on the path where it will lie, each as it was', () => {
    const garden = tipped()
    expect(garden.playing).toBe(true)
    expect(garden.dirty).toBe('now')
    const atStart = stored(garden)
    expect(atStart.vase).toEqual([])
    expect(atStart.path.map((piece) => [piece.stem, piece.head, piece.spent])).toEqual([[0, true, false], [1, true, false]])
    expect(atStart.finished).toBe(false)
    const seconds = watch(garden)
    expect(seconds).toBeGreaterThan(2.5)
    expect(seconds).toBeLessThan(3.5)
    run(garden, 2)
    expect(stored(garden)).toEqual(atStart)
    expect(garden.pot).toMatchObject({ tilt: 0, on: true })
    expect(garden.puddle).toBeNull()
    expect(garden.busy).toBe(false)
    // The vase stands empty and takes pieces again.
    carry(garden, 2, 100, ...overVase(garden))
    expect(garden.vase).toHaveLength(1)
  })

  it('sends a robin for each piece over sixteen, the oldest first, and never saves a seventeenth', () => {
    const lying = Array.from({ length: PATH_HOLDS - 1 }, (_, index) => ({ stem: 2 + (index % 10), base: 20, len: 40 + index, head: false, spent: false, x: 60 + index * 60, y: 788, rot: 1.57 }))
    const garden = open('bride-vase', { path: lying })
    carry(garden, 0, 30, ...overVase(garden, 16))
    garden.press(BED[1].x, SOIL_Y - 30)
    // A piece in the hand that is saved on the path counts as lying there from the cut.
    expect(stored(garden).path).toHaveLength(PATH_HOLDS)
    garden.move(...overVase(garden, 16))
    garden.lift(...overVase(garden, 16))
    const atStart = stored(garden)
    expect(atStart.path).toHaveLength(PATH_HOLDS)
    expect(atStart.path.slice(-2).map((piece) => piece.stem)).toEqual([0, 1])
    expect(atStart.path[0].len).toBe(41)
    expect(garden.leaving.length + (garden.taken ? 1 : 0)).toBe(1)
    run(garden, 8)
    expect(garden.leaving).toEqual([])
    expect(garden.taken).toBeNull()
    expect(stored(garden)).toEqual(atStart)
  })

  it('is ended by a touch with the vase upright and the pieces lying where they were saved', () => {
    const garden = tipped()
    const atStart = stored(garden)
    run(garden, 0.2)
    garden.press(600, 100)
    garden.lift(600, 100)
    expect(garden.playing).toBe(false)
    expect(garden.pot.tilt).toBe(0)
    expect(garden.carried).toBeNull()
    expect(garden.path.every((piece) => piece.move === null)).toBe(true)
    expect(stored(garden)).toEqual(atStart)
  })
})

describe('a piece let go on the visitor', () => {
  const dropOn = (position: string, stem: number, up: number): Garden => {
    const garden = open(position)
    garden.press(BED[stem].x, SOIL_Y - up)
    garden.move(VISITOR.x, VISITOR.y)
    garden.lift(VISITOR.x, VISITOR.y)
    return garden
  }

  it('plays its cell and lies at the visitor\'s feet from that moment, as it then is', () => {
    for (const [stem, then] of [[2, { head: true, spent: true }], [10, { head: true, spent: true }], [4, { head: false, spent: false }], [0, { head: true, spent: false }]] as const) {
      const garden = dropOn('aunt-boot', stem, 100)
      expect(garden.actors.aunt.act).toMatchObject({ name: 'drop', plant: BED[stem].kind })
      expect(garden.sounds.length).toBeGreaterThan(0)
      expect(garden.dirty).toBe('now')
      const saved = stored(garden)
      expect(saved.path).toEqual([expect.objectContaining({ stem, ...then })])
      expect(saved.path[0].x).toBeGreaterThan(TABLE.left)
      expect(saved.path[0].y).toBeGreaterThanOrEqual(PATH.top)
      expect(saved.vase).toEqual([])
      run(garden, 4)
      expect(garden.busy).toBe(false)
      expect(stored(garden)).toEqual(saved)
    }
  })

  it('bites the head off an onion flower and leaves a stalk no shorter than a piece may be', () => {
    const garden = dropOn('goat-boot', 4, 250)
    const [piece] = stored(garden).path
    expect(piece.head).toBe(false)
    expect(piece.len).toBeGreaterThanOrEqual(22)
  })

  it('gets only a start from a bare stalk, which drops', () => {
    const garden = open('goat-boot')
    carry(garden, 0, 200, 300, 400)
    garden.press(BED[0].x + 30, SOIL_Y - 100)
    garden.move(BED[0].x - 30, SOIL_Y - 100)
    expect(garden.hand).toMatchObject({ stem: 0, head: false })
    garden.move(VISITOR.x, VISITOR.y)
    garden.lift(VISITOR.x, VISITOR.y)
    expect(garden.actors.goat.act?.name).toBe('poke')
    expect(stored(garden).path.some((piece) => piece.stem === 0 && !piece.head)).toBe(true)
  })

  it('keeps each vase of the three for its turn', () => {
    for (const id of LADDER) expect(open(id).vaseDef).toBe(VASE[id.split('-')[1] as keyof typeof VASE])
  })
})
