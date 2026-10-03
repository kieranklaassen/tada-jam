import { describe, expect, it } from 'vitest'
import { FIRST_VISIT, LADDER } from './config'
import { KINDS } from './kinds'
import { laySky, layTroop, skyFits } from './order'
import { FIRST_SEED, PARADE_LENGTH, deserializeSave, freshSave, serializeSave, type Save } from './save'
import { STATE_VERSION, firstPosition } from './state'
import { served } from './world'

/** What storage hands back on the next visit. */
const stored = (save: Save): Record<string, unknown> => JSON.parse(JSON.stringify(serializeSave(save)))

/** A save from the middle of play: a pair half served at a bunch position, a slip made, a full parade, two showings played. */
const BUSY: Save = {
  v: STATE_VERSION,
  position: 'bunches-mixed',
  finished: false,
  troop: { kind: 'hippo', size: 3, held: [true, false, true] },
  sky: [{ colour: 'frog', count: 3 }, { colour: 'hippo', count: 1 }, { colour: 'hippo', count: 3 }, { colour: 'crab', count: 2 }],
  next: { kind: 'duck', size: 2 },
  slips: 1,
  parade: [{ kind: 'crab', size: 1, balloons: 1 }, { kind: 'duck', size: 3, balloons: 2 }, { kind: 'frog', size: 2, balloons: 0 }, { kind: 'crab', size: 3, balloons: 3 }],
  shown: { give: true, each: true, bunch: false },
  rng: 0x89abcdef,
}

/** The busy save as storage holds it, with one field replaced by damage. */
const damaged = (field: string, value: unknown): Record<string, unknown> => ({ ...stored(BUSY), [field]: value })

/** Everything a save must be to be played on. */
function expectPlayable(save: Save): void {
  expect(save.v).toBe(STATE_VERSION)
  expect(LADDER).toContain(save.position)
  expect(KINDS).toContain(save.troop.kind)
  expect([1, 2, 3]).toContain(save.troop.size)
  expect(save.troop.held).toHaveLength(save.troop.size)
  expect(skyFits(save.sky, save.troop.kind)).toBe(true)
  expect(KINDS).toContain(save.next.kind)
  expect(save.next.kind).not.toBe(save.troop.kind)
  expect([0, 1, 2]).toContain(save.slips)
  expect(save.parade.length).toBeLessThanOrEqual(PARADE_LENGTH)
  expect(Number.isInteger(save.rng) && save.rng >= 0 && save.rng <= 0xffffffff).toBe(true)
  // Never a dead end: a served troop can always be followed by the next.
  if (served(save.troop)) expect(save.finished).toBe(true)
}

describe('a new game', () => {
  it('opens with a troop reaching up, its sky, the troop that waits, and nothing shown or served', () => {
    const save = freshSave(null)
    expectPlayable(save)
    expect(save.position).toBe(firstPosition(null))
    expect(save.finished).toBe(false)
    expect(save.troop.held).toEqual(Array(save.troop.size).fill(false))
    expect(save.slips).toBe(0)
    expect(save.parade).toEqual([])
    expect(save.shown).toEqual({ give: false, each: false, bunch: false })
  })

  it('always opens the same way, and another way for another seed', () => {
    expect(freshSave(null)).toEqual(freshSave(null))
    expect(freshSave(null)).toEqual(freshSave(null, FIRST_SEED))
    expect(Number.isInteger(FIRST_SEED) && FIRST_SEED >= 0 && FIRST_SEED <= 0xffffffff).toBe(true)
    const openings = new Set(Array.from({ length: 40 }, (_, seed) => JSON.stringify(freshSave(null, seed))))
    expect(openings.size).toBeGreaterThan(10)
  })

  it('is laid out from its position, in the order troop, sky, the troop that waits', () => {
    for (const row of FIRST_VISIT) {
      const save = freshSave(row.fromAge, 99)
      const first = layTroop(row.position, null, 99)
      const sky = laySky(row.position, first.troop, first.rng)
      const next = layTroop(row.position, first.troop.kind, sky.rng)
      expect(save.position).toBe(row.position)
      expect(save.troop).toEqual({ ...first.troop, held: Array(first.troop.size).fill(false) })
      expect(save.sky).toEqual(sky.sky)
      expect(save.next).toEqual(next.troop)
      expect(save.rng).toBe(next.rng)
      expectPlayable(save)
    }
  })

  it('takes any number as a seed', () => {
    for (const seed of [-1, 1.5, 2 ** 40, Number.NaN]) expectPlayable(freshSave(null, seed))
  })
})

describe('the saved state', () => {
  it('round-trips a new game', () => {
    for (const age of [null, 2, 3, 4]) expect(deserializeSave(stored(freshSave(age)), age)).toEqual(freshSave(age))
  })

  it('round-trips a save from the middle of play', () => {
    expect(deserializeSave(stored(BUSY))).toEqual(BUSY)
    expectPlayable(BUSY)
    const ended: Save = { ...BUSY, finished: true, troop: { kind: 'hippo', size: 3, held: [true, true, true] }, slips: 2, shown: { give: true, each: true, bunch: true }, rng: 0 }
    expect(deserializeSave(stored(ended))).toEqual(ended)
    // A balloon popped after the troop was served: the cycle stays finished and the friend reaches up again.
    const popped: Save = { ...ended, troop: { kind: 'hippo', size: 3, held: [true, false, true] } }
    expect(deserializeSave(stored(popped))).toEqual(popped)
  })

  it('serializes to plain JSON with exactly its own fields, sharing nothing with the save it was made from', () => {
    const out = serializeSave({ ...BUSY, extra: 'not ours' } as Save)
    expect(Object.keys(out).sort()).toEqual(['finished', 'next', 'parade', 'position', 'rng', 'shown', 'sky', 'slips', 'troop', 'v'])
    expect(out).toEqual(BUSY)
    expect(JSON.parse(JSON.stringify(out))).toEqual(out)
    expect(out.troop.held).not.toBe(BUSY.troop.held)
    expect(out.sky[0]).not.toBe(BUSY.sky[0])
    expect(out.parade[0]).not.toBe(BUSY.parade[0])
    expect(out.shown).not.toBe(BUSY.shown)
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a number', 7],
    ['a string', 'position'],
    ['an array', [1, 2, 3]],
    ['an empty record', {}],
    ['a wrong version', { ...stored(BUSY), v: 'one' }],
    ['a version above the current one', { ...stored(BUSY), v: STATE_VERSION + 1 }],
  ])('gives a new game for %s, and never throws', (_, raw) => {
    expect(deserializeSave(raw, null)).toEqual(freshSave(null))
    expect(deserializeSave(raw, 4)).toEqual(freshSave(4))
  })

  it('opens the older shape, a position and nothing else, with everything else laid out', () => {
    for (const position of LADDER) {
      for (const finished of [false, true]) {
        const save = deserializeSave({ v: STATE_VERSION, position, finished })
        expectPlayable(save)
        expect(save.position).toBe(position)
        expect(save.finished).toBe(finished)
        expect(save.troop.held).toEqual(Array(save.troop.size).fill(false))
        expect(save.slips).toBe(0)
        expect(save.parade).toEqual([])
        expect(save.shown).toEqual({ give: false, each: false, bunch: false })
        // Laid out from the stored position with the first seed, so it opens the same way every time.
        const first = layTroop(position, null, FIRST_SEED)
        expect(save.troop.kind).toBe(first.troop.kind)
        expect(save.troop.size).toBe(first.troop.size)
        expect(save.sky).toEqual(laySky(position, first.troop, first.rng).sky)
        expect(deserializeSave({ v: STATE_VERSION, position, finished })).toEqual(save)
      }
    }
  })

  it('starts a visit at the stored position, which wins over the age', () => {
    expect(deserializeSave(stored(BUSY), 2).position).toBe('bunches-mixed')
    expect(deserializeSave(stored({ ...freshSave(2), position: LADDER[0] }), 4).position).toBe(LADDER[0])
    expect(deserializeSave({ v: STATE_VERSION, position: 'trio-singles', finished: false }, 2).position).toBe('trio-singles')
  })
})

describe('a damaged field', () => {
  it('takes the first-visit position for an id the ladder does not have, and keeps the world as it was', () => {
    expect(deserializeSave(damaged('position', 'retired-step'), 4)).toEqual({ ...BUSY, position: firstPosition(4) })
    expect(deserializeSave(damaged('position', 42))).toEqual({ ...BUSY, position: firstPosition(null) })
  })

  it('reads `finished` as false unless it is exactly true', () => {
    expect(deserializeSave(damaged('finished', 'yes'))).toEqual(BUSY)
    expect(deserializeSave(damaged('finished', true))).toEqual({ ...BUSY, finished: true })
  })

  it.each([
    ['missing', undefined],
    ['not a record', 'hippo'],
    ['of a kind there is not', { kind: 'cat', size: 2, held: [false, false] }],
    ['of a size there is not', { kind: 'hippo', size: 4, held: [true, false, true, false] }],
    ['of no size', { kind: 'hippo', held: [] }],
  ])('lays out a troop that is %s afresh, with a sky for it, and keeps the rest', (_, troop) => {
    const save = deserializeSave(damaged('troop', troop))
    expectPlayable(save)
    // Laid out from the position with the stored stream, steering clear of the kind that waits so that it is kept.
    const laid = layTroop(BUSY.position, BUSY.next.kind, BUSY.rng)
    const sky = laySky(BUSY.position, laid.troop, laid.rng)
    expect(save).toEqual({ ...BUSY, troop: { ...laid.troop, held: Array(laid.troop.size).fill(false) }, sky: sky.sky, rng: sky.rng })
  })

  it.each([
    ['too short', [true, false]],
    ['too long', [true, false, true, false]],
    ['not all true or false', [true, 0, 'yes']],
    ['not a list', 'all'],
    ['missing', undefined],
  ])('reads a `held` that is %s as nobody holding, and keeps the troop', (_, held) => {
    expect(deserializeSave(damaged('troop', { kind: 'hippo', size: 3, held }))).toEqual({ ...BUSY, troop: { kind: 'hippo', size: 3, held: [false, false, false] } })
  })

  it.each([
    ['missing', undefined],
    ['not a list', { colour: 'hippo', count: 1 }],
    ['holding a colour there is not', [{ colour: 'hippo', count: 1 }, { colour: 'teal', count: 1 }]],
    ['holding a bunch of four', [{ colour: 'hippo', count: 1 }, { colour: 'hippo', count: 4 }]],
    ['holding something that is no bunch', [{ colour: 'hippo', count: 1 }, null]],
    ['without a single of the troop\'s colour', [{ colour: 'hippo', count: 2 }, { colour: 'frog', count: 1 }]],
    ['empty', []],
    ['of six bunches', Array(6).fill({ colour: 'hippo', count: 1 })],
  ])('lays out a sky that is %s afresh for the troop, and keeps the rest', (_, sky) => {
    const save = deserializeSave(damaged('sky', sky))
    expectPlayable(save)
    const laid = laySky(BUSY.position, BUSY.troop, BUSY.rng)
    expect(save).toEqual({ ...BUSY, sky: laid.sky, rng: laid.rng })
  })

  it.each([
    ['missing', undefined],
    ['of a kind there is not', { kind: 'cat', size: 2 }],
    ['of a size there is not', { kind: 'duck', size: 0 }],
    ['of the same kind as the troop on screen', { kind: 'hippo', size: 2 }],
  ])('lays out a waiting troop that is %s afresh, and keeps the rest', (_, next) => {
    const save = deserializeSave(damaged('next', next))
    expectPlayable(save)
    const laid = layTroop(BUSY.position, BUSY.troop.kind, BUSY.rng)
    expect(save).toEqual({ ...BUSY, next: laid.troop, rng: laid.rng })
  })

  it('keeps `slips` at none, one or two', () => {
    expect([0, 1, 2].map((slips) => deserializeSave(damaged('slips', slips)).slips)).toEqual([0, 1, 2])
    expect([3, 40, Number.MAX_VALUE].map((slips) => deserializeSave(damaged('slips', slips)).slips)).toEqual([2, 2, 2])
    expect([-1, 0.5, 1.5, '2', null, undefined, [2]].map((slips) => deserializeSave(damaged('slips', slips)).slips)).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(deserializeSave(damaged('slips', 'many'))).toEqual({ ...BUSY, slips: 0 })
  })

  it('keeps the troops of the parade that are whole, the last four of them, with no more balloons than friends', () => {
    expect(deserializeSave(damaged('parade', 'none'))).toEqual({ ...BUSY, parade: [] })
    const broken = [null, { kind: 'cat', size: 1, balloons: 1 }, { kind: 'frog', size: 5, balloons: 1 }, { kind: 'frog', size: 2 }]
    const mixed = [{ kind: 'duck', size: 2, balloons: 2 }, ...broken, { kind: 'crab', size: 2, balloons: 9 }, { kind: 'hippo', size: 3, balloons: -4 }]
    expect(deserializeSave(damaged('parade', mixed)).parade).toEqual([{ kind: 'duck', size: 2, balloons: 2 }, { kind: 'crab', size: 2, balloons: 2 }, { kind: 'hippo', size: 3, balloons: 0 }])
    const long = KINDS.flatMap((kind) => [{ kind, size: 1, balloons: 1 }, { kind, size: 3, balloons: 2 }])
    expect(deserializeSave(damaged('parade', long)).parade).toEqual(long.slice(-PARADE_LENGTH))
    expect(deserializeSave(damaged('parade', [{ kind: 'duck', size: 3, balloons: 1.4, hat: true }])).parade).toEqual([{ kind: 'duck', size: 3, balloons: 1 }])
  })

  it('reads a mark in `shown` as set only when it is exactly true', () => {
    expect(deserializeSave(damaged('shown', { give: 1, each: 'true', bunch: true }))).toEqual({ ...BUSY, shown: { give: false, each: false, bunch: true } })
    expect(deserializeSave(damaged('shown', { each: true }))).toEqual({ ...BUSY, shown: { give: false, each: true, bunch: false } })
    for (const shown of [undefined, null, true, 'all', [true, true, true]]) expect(deserializeSave(damaged('shown', shown))).toEqual({ ...BUSY, shown: { give: false, each: false, bunch: false } })
  })

  it('starts the stream at the first seed when it is no number, and brings any number to a uint32', () => {
    for (const rng of [undefined, null, '7', Number.NaN, Number.POSITIVE_INFINITY]) expect(deserializeSave({ ...stored(BUSY), rng })).toEqual({ ...BUSY, rng: FIRST_SEED })
    expect(deserializeSave(damaged('rng', -1)).rng).toBe(0xffffffff)
    expect(deserializeSave(damaged('rng', 2 ** 32 + 5)).rng).toBe(5)
    expect(deserializeSave(damaged('rng', 7.9)).rng).toBe(7)
    expect(deserializeSave(damaged('rng', 0xffffffff))).toEqual({ ...BUSY, rng: 0xffffffff })
  })

  it('marks a served troop as finished without moving the position, so the next troop can step in', () => {
    const servedNotFinished = { ...stored(BUSY), finished: false, troop: { kind: 'hippo', size: 3, held: [true, true, true] } }
    expect(deserializeSave(servedNotFinished)).toEqual({ ...BUSY, finished: true, troop: { kind: 'hippo', size: 3, held: [true, true, true] } })
    // An unserved troop is left as it was stored, finished or not.
    expect(deserializeSave(stored(BUSY)).finished).toBe(false)
    expect(deserializeSave({ ...stored(BUSY), finished: true }).finished).toBe(true)
  })

  it('opens a playable game from a record with every field damaged at once', () => {
    const wreck = { v: STATE_VERSION, position: 3, finished: 'no', troop: [], sky: 'blue', next: 7, slips: {}, parade: {}, shown: 0, rng: 'seed' }
    const save = deserializeSave(wreck, 3)
    expectPlayable(save)
    expect(save).toEqual(deserializeSave({ v: STATE_VERSION }, 3))
    expect(save.position).toBe(firstPosition(3))
  })
})

describe('the size of a save', () => {
  it('keeps the largest legal save under half of the 64 KB cap', () => {
    const longest = [...LADDER].sort((a, b) => b.length - a.length)[0]
    const largest: Save = {
      v: STATE_VERSION,
      position: longest,
      finished: true,
      troop: { kind: 'hippo', size: 3, held: [true, true, true] },
      sky: Array.from({ length: 5 }, () => ({ colour: 'hippo', count: 3 }) as const),
      next: { kind: 'hippo', size: 3 },
      slips: 2,
      parade: Array.from({ length: PARADE_LENGTH }, () => ({ kind: 'hippo', size: 3, balloons: 3 }) as const),
      shown: { give: true, each: true, bunch: true },
      rng: 0xffffffff,
    }
    const bytes = JSON.stringify(serializeSave(largest)).length
    expect(bytes).toBeLessThan(32 * 1024)
    // The sheet says a few hundred bytes; hold that too, so the save cannot quietly grow.
    expect(bytes).toBeLessThan(1024)
  })
})
