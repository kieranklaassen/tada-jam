import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { BUMPER, PLACES } from './layout'
import { deserialize, freshSave, isCleared, serialize, type Brick, type Fallen, type Save } from './save'
import { STATE_VERSION } from './state'
import { layWall } from './walls'

const stored = (save: Save): unknown => JSON.parse(JSON.stringify(serialize(save)))
const empty = (): (Brick | null)[] => new Array<Brick | null>(PLACES).fill(null)

/** One brick of every kind in every state the sheet names. */
const EVERY: Brick[] = [
  { kind: 'glass', state: 'whole' }, { kind: 'glass', state: 'cracked' }, { kind: 'glass', state: 'sagged' },
  { kind: 'jelly', state: 'fresh', swollen: false }, { kind: 'jelly', state: 'thrown-once', swollen: true }, { kind: 'jelly', state: 'thrown-twice', swollen: false },
  { kind: 'ice', state: 'whole', dimpled: false, icicle: false }, { kind: 'ice', state: 'whole', dimpled: true, icicle: true }, { kind: 'ice', state: 'pool', dimpled: false, icicle: false },
  { kind: 'seed', state: 'whole', browned: false, gone: false }, { kind: 'seed', state: 'vine', browned: true, gone: false }, { kind: 'seed', state: 'tall-vine', browned: false, gone: false },
  { kind: 'sleepy', state: 'asleep' }, { kind: 'sleepy', state: 'deep' },
]
const FALLEN: Fallen[] = [{ kind: 'glass', col: 2 }, { kind: 'jelly', form: 'splat', col: 2 }, { kind: 'jelly', form: 'syrup', col: 2 }, { kind: 'seed', form: 'flower', col: 2 }, { kind: 'seed', form: 'sprout', col: 2 }, { kind: 'sleepy', col: 2 }]

describe('what the table saves', () => {
  it('round-trips every kind of brick in every state, every form of rubble, every ball and both showings', () => {
    const wall = empty()
    EVERY.forEach((brick, place) => { wall[place] = brick })
    for (const ball of ['plain', 'wet', 'hot', 'heavy'] as const) {
      const save: Save = { ...freshSave(null), position: LADDER[5], wall, rubble: FALLEN.slice(0, 4), bumper: 420, ball, shown: ['hot-gate', 'wet-gate'] }
      expect(deserialize(stored(save))).toEqual(save)
    }
  })

  it('keeps a vine whose seed has gone: it is no brick, the wall is cleared with it, and only a grown vine can be without its seed', () => {
    // A vine without its seed is kept in the lane it stands in, so the seed's own place is empty.
    const wall = empty()
    wall[12] = { kind: 'seed', state: 'tall-vine', browned: true, gone: true }
    expect(isCleared(wall)).toBe(true)
    const save: Save = { ...freshSave(null), wall, rubble: [{ kind: 'seed', form: 'flower', col: 1 }], finished: true }
    expect(deserialize(stored(save))).toEqual(save)
    // A seed that has not grown cannot be gone and still be there: it is read as a seed.
    const odd = stored(save) as { wall: unknown[] }
    odd.wall[13] = { kind: 'seed', state: 'whole', browned: false, gone: true }
    expect(deserialize(odd).wall[13]).toEqual({ kind: 'seed', state: 'whole', browned: false, gone: false })
    // A save from before the vine could outlive its seed has no such field: its seeds are all there.
    odd.wall[13] = { kind: 'seed', state: 'vine', browned: false }
    expect(deserialize(odd).wall[13]).toEqual({ kind: 'seed', state: 'vine', browned: false, gone: false })
    // The gone seed lies in the tray, so a full wall round its vine is still a legal wall.
    const full = layWall('glass', 1)
    full[0] = null
    full[1] = null
    full[0] = { kind: 'seed', state: 'vine', browned: false, gone: true }
    const most: Save = { ...freshSave(null), wall: full, rubble: [{ kind: 'seed', form: 'sprout', col: 1 }, { kind: 'glass', col: 0 }] }
    expect(deserialize(stored(most))).toEqual(most)
  })

  it('a gone seed fills no place: a save that kept the vine in the seed\'s own place is read with it in the lane and that place empty', () => {
    for (const row of [0, 1, 2]) {
      const wall = empty()
      wall[row * 6 + 1] = { kind: 'seed', state: 'vine', browned: false, gone: true }
      wall[row * 6 + 3] = { kind: 'sleepy', state: 'asleep' }
      const read = deserialize(stored({ ...freshSave(null), wall, rubble: [{ kind: 'seed', form: 'sprout', col: 1 }] }))
      expect(read.wall[row * 6 + 1]).toBe(null)
      expect(read.wall[row * 6]).toEqual({ kind: 'seed', state: 'vine', browned: false, gone: true })
      // Read again it is the same: the move is made once.
      expect(deserialize(stored(read))).toEqual(read)
    }
    // A seed that still stands keeps its place, and so does a vine with a brick where the lane is (a save no play makes).
    const stands = empty()
    stands[7] = { kind: 'seed', state: 'vine', browned: false, gone: false }
    expect(deserialize(stored({ ...freshSave(null), wall: stands })).wall[7]).toEqual(stands[7])
    const odd = empty()
    odd[6] = { kind: 'glass', state: 'whole' }
    odd[7] = { kind: 'seed', state: 'vine', browned: false, gone: true }
    expect(deserialize(stored({ ...freshSave(null), wall: odd })).wall[7]).toEqual(odd[7])
  })

  it('keeps where a ball lies along the bumper, and reads a seat that is missing or no number as the middle', () => {
    const save: Save = { ...freshSave(null), bumper: 500, seat: -0.62 }
    expect(deserialize(stored(save)).seat).toBe(-0.62)
    expect(serialize({ ...save, seat: 0.33333 }).seat).toBe(0.33)
    for (const seat of [undefined, null, 'left', Number.NaN, {}]) expect(deserialize({ ...(stored(save) as object), seat }).seat).toBe(0)
    expect(deserialize({ ...(stored(save) as object), seat: 7 }).seat).toBe(1)
    expect(deserialize({ ...(stored(save) as object), seat: -7 }).seat).toBe(-1)
  })

  it('reads the column a fallen brick lies under, and gives one that has none or a bad one the column its order gives it', () => {
    const save: Save = { ...freshSave(null), wall: empty(), finished: true, rubble: [{ kind: 'glass', col: 5 }, { kind: 'sleepy', col: 0 }] }
    const raw = stored(save) as { rubble: Record<string, unknown>[] }
    expect(deserialize(raw).rubble).toEqual(save.rubble)
    raw.rubble = [{ kind: 'glass' }, { kind: 'sleepy', col: 9 }, { kind: 'jelly', form: 'splat', col: 2.5 }, { kind: 'seed', form: 'flower', col: '3' }, { kind: 'glass', col: -1 }, { kind: 'glass', col: 4 }, { kind: 'glass' }]
    expect(deserialize(raw).rubble.map((fallen) => fallen.col)).toEqual([0, 1, 2, 3, 4, 4, 0])
  })

  it('reads that a wall is cleared from the wall itself, and a pool is not a brick', () => {
    const pools = empty()
    pools[3] = { kind: 'ice', state: 'pool', dimpled: false, icicle: false }
    expect(isCleared(pools)).toBe(true)
    const save: Save = { ...freshSave(null), wall: pools, rubble: [{ kind: 'glass', col: 2 }], finished: true }
    expect(deserialize(stored(save))).toEqual(save)
    expect(deserialize({ ...(stored(save) as object), finished: false }).finished).toBe(true)
    expect(deserialize({ ...(stored(freshSave(null)) as object), finished: true }).finished).toBe(false)
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'wall'],
    ['an array', [1, 2]],
    ['a version above this one', { ...freshSave(null), v: STATE_VERSION + 1 }],
  ])('gives a fresh table for %s', (_, raw) => {
    expect(deserialize(raw, null)).toEqual(freshSave(null))
  })

  it('starts a first visit by age, and a saved position wins over the age', () => {
    expect(freshSave(null).position).toBe('glass')
    expect(freshSave(2).position).toBe('glass')
    expect(freshSave(5).position).toBe('glass')
    expect(freshSave(6).position).toBe('jelly')
    expect(freshSave(7).position).toBe('jelly')
    expect(freshSave(8).position).toBe('ice')
    expect(freshSave(12).position).toBe('ice')
    expect(freshSave(8).wall).toEqual(layWall('ice', 1))
    expect(deserialize(stored({ ...freshSave(5), position: 'seed' }), 9).position).toBe('seed')
  })

  it('repairs each field by itself', () => {
    const good = stored(freshSave(null)) as Record<string, unknown>
    expect(deserialize({ ...good, bumper: 'left' }).bumper).toBe((BUMPER.minX + BUMPER.maxX) / 2)
    expect(deserialize({ ...good, bumper: -4000 }).bumper).toBe(BUMPER.minX)
    expect(deserialize({ ...good, ball: 'square' }).ball).toBe('plain')
    expect(deserialize({ ...good, rubble: 'heap' }).rubble).toEqual([])
    expect(deserialize({ ...good, rubble: [{ kind: 'jelly', form: 'cube' }] }).rubble).toEqual([])
    expect(deserialize({ ...good, shown: ['hot-gate', 'a-third', 7] }).shown).toEqual(['hot-gate'])
    expect(deserialize({ ...good, shown: 'all' }).shown).toEqual([])
    // A wall that cannot be read is a new wall laid out from the position, which is kept.
    const glass = { kind: 'glass', state: 'whole' }
    for (const wall of [undefined, 7, [], [glass], empty().map(() => ({ kind: 'brass', state: 'whole' })), empty().map(() => ({ kind: 'glass', state: 'gone' }))]) {
      const read = deserialize({ ...good, position: LADDER[2], wall })
      expect(read.wall).toEqual(layWall(LADDER[2], 1))
      expect(read.position).toBe(LADDER[2])
      expect(read.finished).toBe(false)
    }
  })

  it('never holds more bricks than the wall has places', () => {
    const good = stored(freshSave(null)) as Record<string, unknown>
    const over = deserialize({ ...good, rubble: [{ kind: 'glass', col: 2 }] })
    expect(over.wall).toEqual(layWall('glass', 1))
    expect(over.rubble).toEqual([])
  })

  it('keeps a largest legal state far under half of the 64 KB cap', () => {
    const wall = empty().map((): Brick => ({ kind: 'jelly', state: 'thrown-twice', swollen: true }))
    const largest: Save = { ...freshSave(null), position: [...LADDER].sort((a, b) => b.length - a.length)[0], wall, bumper: BUMPER.maxX, ball: 'heavy', shown: ['hot-gate', 'wet-gate'] }
    expect(JSON.stringify(serialize(largest)).length).toBeLessThan(4 * 1024)
    const rubble: Save = { ...largest, wall: empty(), rubble: empty().map((): Fallen => ({ kind: 'jelly', form: 'splat', col: 2 })) }
    expect(JSON.stringify(serialize(rubble)).length).toBeLessThan(4 * 1024)
  })
})
