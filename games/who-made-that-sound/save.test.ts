import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { type Clutch, FIRST_SEED, isOver, isSound, stir } from './layout'
import { ROW_MAX } from './places'
import { deserializeWorld, serializeWorld } from './save'
import { STATE_VERSION } from './state'
import { type Action, HILL_MAX, type World, act, freshWorld } from './world'

/** What every world that comes out of storage has to be: one the game can play. */
function playable(world: World): void {
  expect(world.v).toBe(STATE_VERSION)
  expect(LADDER).toContain(world.position)
  expect(world.finished).toBe(world.next !== null)
  if (world.next) {
    expect(isSound(world.next)).toBe(true)
    expect(world.next.place).toBe(world.position)
    expect(world.next.kinds).not.toContain(world.extra)
  }
  if (world.cycle) {
    expect(isSound(world.cycle)).toBe(true)
    expect(isOver(world.cycle)).toBe(world.finished)
    if (!world.finished) expect(world.cycle.kinds).not.toContain(world.extra)
  } else expect(world.finished).toBe(true)
  expect(world.hill.length).toBeLessThanOrEqual(HILL_MAX)
  expect(new Set(world.hill.map((resident) => resident.kind)).size).toBe(world.hill.length)
  expect(Number.isInteger(world.rng) && world.rng >= 0 && world.rng < 2 ** 32).toBe(true)
  // And it can be played on: a few taps never throw and leave a playable world.
  let next = world
  for (const action of [{ type: 'edge' }, { type: 'slot', slot: 0 }, { type: 'slot', slot: 0 }, { type: 'basket' }, { type: 'asker' }] as Action[]) next = act(next, action).world
  expect(next.finished).toBe(next.next !== null)
}

/** Worlds as play leaves them: every state a long random game passes through. */
function reached(): World[] {
  const worlds: World[] = [freshWorld(null), freshWorld(4)]
  let world = freshWorld(null), rng = FIRST_SEED
  for (let i = 0; i < 600; i++) {
    rng = stir(rng, i)
    const roll = rng % 10, spot = (rng >>> 8) % 4
    world = act(world, roll < 6 ? { type: 'slot', slot: spot } : roll < 8 ? { type: 'edge' } : { type: 'basket' }).world
    worlds.push(world)
  }
  return worlds
}

describe('found as left', () => {
  it('comes back exactly as it was put away, at any instant of a long game', () => {
    for (const world of reached()) {
      const saved = JSON.parse(JSON.stringify(serializeWorld(world)))
      expect(deserializeWorld(saved, null)).toEqual(world)
      // A child's age never moves a saved game.
      expect(deserializeWorld(saved, 4)).toEqual(world)
    }
  })

  it('saves these fields and no others', () => {
    const world = { ...freshWorld(null), stray: 1 } as World
    expect(Object.keys(serializeWorld(world)).sort()).toEqual(['cycle', 'extra', 'finished', 'hill', 'next', 'position', 'rng', 'shown', 'v'])
    expect(Object.keys(deserializeWorld({ ...serializeWorld(world), stray: 1 })).sort()).toEqual(['cycle', 'extra', 'finished', 'hill', 'next', 'position', 'rng', 'shown', 'v'])
  })
})

describe('a slot that is not this game, or damaged', () => {
  it.each([
    ['nothing', null],
    ['undefined', undefined],
    ['a string', 'egg'],
    ['a number', 7],
    ['a list', [1, 2]],
    ['an empty record', {}],
    ['a version above this one', { ...serializeWorld(freshWorld(null)), v: STATE_VERSION + 1 }],
    ['no version', { position: 'near-voice' }],
  ])('%s gives a fresh world', (_, raw) => {
    expect(deserializeWorld(raw, null)).toEqual(freshWorld(null))
    expect(deserializeWorld(raw, 4)).toEqual(freshWorld(4))
  })

  const middle = (): World => {
    let world = freshWorld(null)
    for (const action of [{ type: 'edge' }, { type: 'slot', slot: 0 }, { type: 'slot', slot: 0 }, { type: 'slot', slot: 1 }] as Action[]) world = act(world, action).world
    return world
  }

  it.each([
    ['a place it does not know', { position: 'tenth-place' }],
    ['a stream that is not a number', { rng: 'seven' }],
    ['a stream out of range', { rng: -3.5 }],
    ['a list of shown things that is not a list', { shown: 'seek' }],
    ['unknown ways of asking', { shown: ['seek', 'shout', 3] }],
    ['a hill that is not a list', { hill: { kind: 'pip' } }],
    ['strangers on the hill', { hill: [{ kind: 'cat', as: 'family' }, { kind: 'pip', as: 'herd' }, 5, null] }],
    ['a crowd on the hill', { hill: Array.from({ length: 9 }, () => ({ kind: 'pip', as: 'family' })) }],
    ['one alone on the hill whom nobody waits for', { hill: [{ kind: 'dooo', as: 'single' }] }],
    ['an unknown kind in the basket', { extra: 'cat' }],
    ['a clutch that is not a record', { cycle: 'three eggs' }],
    ['a clutch with an unknown kind', { cycle: { form: 'seek', place: 'two-eggs', kinds: ['pip', 'cat'], slots: ['fresh', 'fresh'], queue: ['pip'], asker: null, wrong: 0 } }],
    ['a clutch that could not have been played', { cycle: { form: 'seek', place: 'two-eggs', kinds: ['pip', 'hoom'], slots: ['done', 'fresh'], queue: [], asker: 'pip', wrong: 0 } }],
    ['no clutch at all', { cycle: null, next: null }],
    ['a waiting clutch that has been touched', { finished: true, cycle: null, next: { form: 'seek', place: 'two-eggs', kinds: ['pip', 'hoom'], slots: ['heard', 'fresh'], queue: ['pip', 'hoom'], asker: null, wrong: 0 } }],
    ['a finished flag that the clutch on screen denies', { finished: true }],
  ])('repairs %s and keeps the rest', (_, damage) => {
    const world = deserializeWorld({ ...serializeWorld(middle()), ...damage }, null)
    playable(world)
    // What was not damaged is kept: the stream stays put unless a clutch had to be laid out again.
    if (!('cycle' in damage) && !('position' in damage) && !('rng' in damage)) expect(world.cycle).toEqual(middle().cycle)
  })

  it('lays a clutch out again from the place when the one that waited is gone or belongs to another place', () => {
    const finished: World = { ...freshWorld(null), position: 'near-voice' }
    const world = deserializeWorld(serializeWorld(finished), null)
    playable(world)
    expect(world.next!.place).toBe('near-voice')
  })

  it('lets one alone on the hill, whom nobody waits for, have found its own', () => {
    const world = deserializeWorld({ ...serializeWorld(freshWorld(null)), hill: [{ kind: 'dooo', as: 'single' }] }, null)
    expect(world.hill).toEqual([{ kind: 'dooo', as: 'family' }])
  })

  it('takes the egg out of the basket when its kind is already in the row', () => {
    const before = middle()
    const world = deserializeWorld({ ...serializeWorld(before), extra: before.cycle!.kinds[0] }, null)
    expect(world.extra).toBeNull()
    playable(world)
  })
})

describe('size', () => {
  it('keeps a largest legal state far under half the 64 KB cap', () => {
    const longest = [...LADDER].sort((a, b) => b.length - a.length)[0]
    const row: Clutch = { form: 'seek', place: longest, kinds: ['wheep', 'hoom', 'brrl', 'dooo'], slots: ['heard', 'heard', 'heard', 'done'], queue: ['wheep', 'hoom', 'brrl'], asker: 'dooo', wrong: 3 }
    const largest: World = {
      v: STATE_VERSION,
      position: longest,
      finished: false,
      rng: 2 ** 32 - 1,
      shown: ['seek', 'who', 'alike'],
      hill: [{ kind: 'wheep', as: 'family' }, { kind: 'hoom', as: 'single' }, { kind: 'brrl', as: 'single' }, { kind: 'dooo', as: 'twins' }],
      extra: 'pip',
      next: { ...row, slots: ['fresh', 'fresh', 'fresh', 'fresh'], queue: ['wheep', 'hoom', 'brrl', 'dooo'], asker: null, wrong: 0 },
      cycle: row,
    }
    expect(row.kinds).toHaveLength(ROW_MAX)
    expect(largest.hill).toHaveLength(HILL_MAX)
    const bytes = new TextEncoder().encode(JSON.stringify(serializeWorld(largest))).length
    expect(bytes).toBeLessThan(32 * 1024)
    // The game's own budget: the whole world is a few hundred bytes.
    expect(bytes).toBeLessThan(1024)
  })
})
