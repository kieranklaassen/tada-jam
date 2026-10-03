import { describe, expect, it } from 'vitest'
import { FIRST_SEED, stir } from './layout'
import { deserializeWorld } from './save'
import { HILL_PLACES, ROW, type Tap, type Toy, deserializeToy, freshToy, nextToTouch, play, serializeToy } from './toy'
import { KINDS } from './voices'

const frozen = <T>(value: T): T => {
  if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value) }
  return value
}
const egg = (slot: number): Tap => ({ on: 'egg', slot })

/** What has to hold of a toy at any instant. */
function holds(toy: Toy): void {
  expect(toy.kinds).toHaveLength(ROW)
  expect(new Set(toy.kinds).size).toBe(ROW)
  expect(toy.slots).toHaveLength(ROW)
  expect(toy.hill.length).toBeLessThanOrEqual(HILL_PLACES)
  expect(new Set(toy.hill.map((one) => one.kind)).size).toBe(toy.hill.length)
  expect(new Set(toy.hill.map((one) => one.place)).size).toBe(toy.hill.length)
  for (const one of toy.hill) expect(one.place >= 0 && one.place < HILL_PLACES).toBe(true)
  // A nest waits at the edge exactly when every egg of the row is open.
  expect(toy.nest.length > 0).toBe(toy.slots.every((slot) => slot === 'done'))
  if (toy.nest.length > 0) expect(new Set(toy.nest).size).toBe(ROW)
  expect(Number.isInteger(toy.rng) && toy.rng >= 0 && toy.rng < 2 ** 32).toBe(true)
  // There is always a next thing to touch: the toy has no dead end.
  expect(nextToTouch(toy)).not.toBeNull()
}

/** Every toy a long game of random taps passes through. */
function reached(taps = 1500): Toy[] {
  const toys: Toy[] = [freshToy()]
  let toy = freshToy(), rng = stir(FIRST_SEED, 9)
  for (let i = 0; i < taps; i++) {
    rng = stir(rng, i)
    const roll = rng % 10, at = (rng >>> 8) % 5
    const tap: Tap = roll < 6 ? egg(at) : roll < 8 ? { on: 'nest' } : roll < 9 ? { on: 'hill', place: at } : { on: 'page' }
    toy = play(frozen(toy), tap).toy
    toys.push(toy)
  }
  return toys
}

describe('the toy: a tap on an egg', () => {
  it('starts with three eggs of three kinds, nobody out and no nest', () => {
    const toy = freshToy()
    holds(toy)
    expect(toy.slots).toEqual(['fresh', 'fresh', 'fresh'])
    expect(toy.hill).toEqual([])
    expect(toy.nest).toEqual([])
    expect(freshToy()).toEqual(toy)
    expect(freshToy(12345)).not.toEqual(toy)
  })

  it('lets the one inside be heard on the first tap and out on the second', () => {
    const toy = freshToy(), kind = toy.kinds[1]
    const first = play(frozen(toy), egg(1))
    expect(first.happened).toEqual([{ type: 'wakes', slot: 1, kind }])
    expect(first.toy.slots).toEqual(['fresh', 'heard', 'fresh'])
    const second = play(frozen(first.toy), egg(1))
    expect(second.happened.map((one) => one.type)).toEqual(['bursts', 'settles'])
    expect(second.happened[0]).toEqual({ type: 'bursts', slot: 1, kind })
    expect(second.toy.slots).toEqual(['fresh', 'done', 'fresh'])
    expect(second.toy.hill.map((one) => one.kind)).toEqual([kind])
    // An open egg is not there any more: a tap where it stood is a tap on the page.
    expect(play(second.toy, egg(1)).happened).toEqual([{ type: 'nothing' }])
  })

  it('answers a tap on anyone who is out', () => {
    const { toy } = play(play(freshToy(), egg(0)).toy, egg(0))
    const { place, kind } = toy.hill[0]
    const step = play(frozen(toy), { on: 'hill', place })
    expect(step.happened).toEqual([{ type: 'calls', place, kind }])
    expect(step.toy).toEqual(toy)
    expect(play(toy, { on: 'hill', place: (place + 1) % HILL_PLACES }).happened).toEqual([{ type: 'nothing' }])
  })

  it('puts a nest of new eggs at the edge when the row is empty, and tips them in on a tap', () => {
    let toy = freshToy()
    for (const slot of [0, 0, 1, 1, 2]) toy = play(toy, egg(slot)).toy
    expect(toy.nest).toEqual([])
    expect(play(toy, { on: 'nest' }).happened).toEqual([{ type: 'nothing' }])
    const last = play(frozen(toy), egg(2))
    expect(last.happened.map((one) => one.type)).toEqual(['bursts', 'settles', 'nestWaits'])
    toy = last.toy
    expect(toy.nest).toHaveLength(ROW)
    // New faces first: the three kinds that are not on the hill.
    for (const kind of toy.nest) expect(toy.hill.map((one) => one.kind)).not.toContain(kind)
    expect(nextToTouch(toy)).toEqual({ on: 'nest' })
    const tipped = play(frozen(toy), { on: 'nest' })
    expect(tipped.happened).toEqual([{ type: 'tips', kinds: toy.nest }])
    expect(tipped.toy.kinds).toEqual(toy.nest)
    expect(tipped.toy.slots).toEqual(['fresh', 'fresh', 'fresh'])
    expect(tipped.toy.nest).toEqual([])
  })

  it('shows the last few on the hill: one of the same kind makes way, and then the oldest', () => {
    const left: string[] = []
    let toy = freshToy()
    for (let i = 0; i < 400; i++) {
      const step = play(toy, nextToTouch(toy)!)
      for (const one of step.happened) if (one.type === 'leaves') left.push(one.kind)
      toy = step.toy
      holds(toy)
    }
    expect(toy.hill).toHaveLength(HILL_PLACES)
    expect(left.length).toBeGreaterThan(50)
    // Everyone gets a turn: all six kinds have come and gone.
    expect(new Set(left).size).toBe(KINDS.length)
  })

  it('gives a newcomer the free place nearest above its egg, and nobody else moves', () => {
    let toy = freshToy()
    for (let i = 0; i < 60; i++) {
      const before = toy
      const step = play(toy, nextToTouch(toy)!)
      toy = step.toy
      const gone = step.happened.flatMap((one) => (one.type === 'leaves' ? [one.kind] : []))
      for (const one of before.hill) if (!gone.includes(one.kind)) expect(toy.hill).toContainEqual(one)
    }
    const first = play(play(freshToy(), egg(0)).toy, egg(0)).toy
    expect(first.hill[0].place).toBe(0)
    const third = play(play(freshToy(), egg(2)).toy, egg(2)).toy
    expect(third.hill[0].place).toBe(HILL_PLACES - 1)
  })

  it('offers the egg that is furthest along as the next thing to touch', () => {
    let toy = freshToy()
    expect(nextToTouch(toy)).toEqual(egg(0))
    toy = play(toy, egg(2)).toy
    expect(nextToTouch(toy)).toEqual(egg(2))
  })

  it('answers every tap whatever it lands on, and never breaks, in a long game of random taps', () => {
    for (const toy of reached()) holds(toy)
    let toy = freshToy()
    for (const tap of [egg(-1), egg(7), egg(0.5), { on: 'hill', place: 99 }, { on: 'nest' }, { on: 'page' }] as Tap[]) {
      const step = play(toy, tap)
      expect(step.happened).toEqual([{ type: 'nothing' }])
      toy = step.toy
    }
    expect(toy).toEqual(freshToy())
  })
})

describe('the toy, found as left', () => {
  it('comes back exactly as it was put away, at any instant', () => {
    for (const toy of reached(600)) expect(deserializeToy(JSON.parse(JSON.stringify(serializeToy(toy))))).toEqual(toy)
  })

  it.each([
    ['nothing', null],
    ['a string', 'egg'],
    ['a list', [1]],
    ['an empty record', {}],
    ['a version above this one', { ...serializeToy(freshToy()), v: 99 }],
    ['a record with no toy in it', { v: 1, position: 'two-eggs', finished: false }],
  ])('%s gives a fresh toy', (_, raw) => {
    expect(deserializeToy(raw)).toEqual(freshToy())
    expect(deserializeToy(raw, 77)).toEqual(freshToy(77))
  })

  const middle = (): Toy => {
    let toy = freshToy()
    for (const slot of [0, 0, 1]) toy = play(toy, egg(slot)).toy
    return toy
  }

  it.each([
    ['a stream that is not a number', { rng: 'x' }],
    ['a row with a stranger in it', { kinds: ['pip', 'cat', 'tok'] }],
    ['a row with the same kind twice', { kinds: ['pip', 'pip', 'tok'] }],
    ['a row that is too long', { kinds: ['pip', 'tok', 'hoom', 'brrl'] }],
    ['slots that do not fit the row', { slots: ['fresh'] }],
    ['a slot it does not know', { slots: ['fresh', 'boiled', 'done'] }],
    ['a hill that is not a list', { hill: 'pip' }],
    ['strangers and doubles on the hill', { hill: [{ kind: 'cat', place: 0 }, { kind: 'pip', place: 1 }, { kind: 'pip', place: 2 }, { kind: 'tok', place: 1 }, { kind: 'hoom', place: 9 }, 4] }],
    ['a nest beside a row that still has eggs', { nest: ['pip', 'tok', 'hoom'] }],
    ['an empty row with no nest', { slots: ['done', 'done', 'done'], nest: [] }],
    ['no row at all', { kinds: null, slots: null }],
  ])('repairs %s into a toy that can be played', (_, damage) => {
    const toy = deserializeToy({ v: 1, toy: { ...serializeToy(middle()).toy, ...damage } })
    holds(toy)
    let next = toy
    for (let i = 0; i < 12; i++) next = play(next, nextToTouch(next)!).toy
    holds(next)
  })

  it('stays small', () => {
    const fullest = reached(600).map((toy) => JSON.stringify(serializeToy(toy)).length)
    expect(Math.max(...fullest)).toBeLessThan(512)
  })

  it('opens as a world that can be played when the game is built on it', () => {
    const world = deserializeWorld(JSON.parse(JSON.stringify(serializeToy(middle()))), null)
    expect(world.finished).toBe(true)
    expect(world.next).not.toBeNull()
    expect(world.position).toBe('two-eggs')
  })
})
