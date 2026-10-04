import { describe, expect, it } from 'vitest'
import { arrivalsAt, crosses, heatSources, madeAt, spread, temperature, type Source } from './airs'
import { arrange } from './arrangement'
import { edgesOf, type House } from './hotel'

const long: House = { shape: 'long', fixtures: [], twins: [] }
const tower: House = { shape: 'tower', fixtures: [], twins: [] }
const reached = (arrangement: ReturnType<typeof arrange>, source: Source) =>
  Object.fromEntries(spread(arrangement, source).map((arrival) => [arrival.room, arrival.level]))

describe('how each thing travels', () => {
  it('noise crosses every wall, floor and ceiling and loses a step each time', () => {
    const house = arrange(long, { troll: 4 })
    // Room 4 is upper middle: 3 and 5 beside it, 1 below.
    expect(reached(house, { air: 'din', by: { guest: 'troll' }, room: 4, strength: 2 })).toEqual({ 4: 2, 3: 1, 5: 1, 1: 1 })
    expect(reached(house, { air: 'din', by: { guest: 'singer' }, room: 4, strength: 3 })).toEqual({ 4: 3, 3: 2, 5: 2, 1: 2, 0: 1, 2: 1 })
  })

  it('a noise of one stays in its own room', () => {
    expect(reached(arrange(long, {}), { air: 'din', by: { guest: 'fly' }, room: 0, strength: 1 })).toEqual({ 0: 1 })
  })

  it('warmth rises and never goes sideways or down', () => {
    const house = arrange(tower, {})
    expect(reached(house, { air: 'warm', by: { thing: 'stove' }, room: 0, strength: 3 })).toEqual({ 0: 3, 2: 2, 4: 1 })
    expect(reached(house, { air: 'warm', by: { thing: 'stove' }, room: 4, strength: 3 })).toEqual({ 4: 3 })
  })

  it('cold sinks and never goes sideways or up', () => {
    const house = arrange(tower, {})
    expect(reached(house, { air: 'cold', by: { thing: 'ice' }, room: 5, strength: 2 })).toEqual({ 5: 2, 3: 1 })
    expect(reached(house, { air: 'cold', by: { thing: 'ice' }, room: 1, strength: 3 })).toEqual({ 1: 3 })
  })

  it('a smell drifts along its own floor and crosses no floor', () => {
    expect(reached(arrange(long, {}), { air: 'pong', by: { guest: 'cook' }, room: 0, strength: 3 })).toEqual({ 0: 3, 1: 2, 2: 1 })
    expect(reached(arrange(long, {}), { air: 'pong', by: { guest: 'cook' }, room: 4, strength: 2 })).toEqual({ 4: 2, 3: 1, 5: 1 })
  })

  it('a quilt stops noise, warmth and cold at its wall or floor, and no smell', () => {
    const padded = arrange(long, {}, { quilt: { edge: '3-4' } })
    expect(reached(padded, { air: 'din', by: { guest: 'troll' }, room: 4, strength: 2 })).toEqual({ 4: 2, 5: 1, 1: 1 })
    expect(reached(padded, { air: 'pong', by: { guest: 'cook' }, room: 4, strength: 2 })).toEqual({ 4: 2, 3: 1, 5: 1 })
    const lagged = arrange(long, {}, { quilt: { edge: '0-3' } })
    expect(reached(lagged, { air: 'warm', by: { thing: 'stove' }, room: 0, strength: 2 })).toEqual({ 0: 2 })
    expect(reached(lagged, { air: 'cold', by: { thing: 'ice' }, room: 3, strength: 2 })).toEqual({ 3: 2 })
  })

  it('noise that is stopped at one wall can still come round by another way, weaker', () => {
    const padded = arrange(long, {}, { quilt: { edge: '3-4' } })
    // The singer in 4, strength 3: room 3 is no longer reached through its wall, but through 1 and 0 it would be level 0.
    expect(reached(padded, { air: 'din', by: { guest: 'singer' }, room: 4, strength: 3 })).toEqual({ 4: 3, 5: 2, 1: 2, 0: 1, 2: 1 })
  })

  it('a pipe lets smell, warmth and cold through, both ways', () => {
    const up = arrange(long, {}, { pipe: { edge: '1-4' } })
    expect(reached(up, { air: 'pong', by: { guest: 'cook' }, room: 1, strength: 2 })).toEqual({ 1: 2, 0: 1, 2: 1, 4: 1 })
    expect(reached(up, { air: 'warm', by: { thing: 'stove' }, room: 4, strength: 2 })).toEqual({ 4: 2, 1: 1 })
    const across = arrange(long, {}, { pipe: { edge: '0-1' } })
    expect(reached(across, { air: 'warm', by: { thing: 'stove' }, room: 0, strength: 2 })).toEqual({ 0: 2, 3: 1, 1: 1 })
    expect(reached(across, { air: 'cold', by: { thing: 'ice' }, room: 1, strength: 2 })).toEqual({ 1: 2, 0: 1 })
  })

  it('every wall and floor obeys the same rule from either side', () => {
    for (const edge of edgesOf('tower')) {
      expect(crosses('din', edge, edge.a, null)).toBe(true)
      expect(crosses('din', edge, edge.b, 'quilt')).toBe(false)
      expect(crosses('pong', edge, edge.a, null)).toBe(edge.kind === 'wall')
      expect(crosses('warm', edge, edge.a, null)).toBe(edge.kind === 'floor')
      expect(crosses('warm', edge, edge.b, null)).toBe(false)
      expect(crosses('cold', edge, edge.b, null)).toBe(edge.kind === 'floor')
      expect(crosses('cold', edge, edge.a, null)).toBe(false)
    }
  })
})

describe('what is made, and when', () => {
  const house: House = { shape: 'long', fixtures: [{ kind: 'boiler', col: 0 }, { kind: 'snow', col: 2 }], twins: [] }

  it('the boiler warms its column from the ground and the snow hole chills its column from the top', () => {
    const empty = arrange(house, {})
    expect([0, 1, 2, 3, 4, 5].map((room) => temperature(empty, room))).toEqual([2, 0, -1, 1, 0, -2])
  })

  it('warmth and cold in one room add up, and stay on the scale', () => {
    const both = arrange(house, { yeti: 3 }, { stove: { room: 0 }, ice: { room: 5 } }, { dials: { stove: 3, ice: 3 } })
    // Room 0: boiler 2 and stove 3, held at 3. Room 3: boiler 1 and stove 2, less the yeti's 2.
    expect(temperature(both, 0)).toBe(3)
    expect(temperature(both, 3)).toBe(1)
    expect(temperature(both, 5)).toBe(-3)
    expect(temperature(both, 2)).toBe(-3)
  })

  it('noise and smell are made only by a guest who is in a room and awake', () => {
    const night = arrange(house, { troll: 4, cook: 1, singer: 'bench', fly: 'lobby' })
    expect(madeAt(night, 'night').map((source) => [source.air, source.room, source.strength])).toEqual([['din', 4, 2]])
    expect(madeAt(night, 'day').map((source) => [source.air, source.room, source.strength])).toEqual([['pong', 1, 2]])
  })

  it('a wrapped guest makes no noise, and a guest with the pipe carries one room further', () => {
    expect(madeAt(arrange(long, { troll: 4 }, { quilt: { guest: 'troll' } }), 'night')).toEqual([])
    expect(madeAt(arrange(long, { troll: 4 }, { pipe: { guest: 'troll' } }), 'night')[0].strength).toBe(3)
    const yeti = heatSources(arrange(long, { yeti: 4 }, { pipe: { guest: 'yeti' } }))
    expect(yeti).toEqual([{ air: 'cold', by: { guest: 'yeti' }, room: 4, strength: 3 }])
  })

  it('a guest who keeps the alarm clock makes its noise at the other hours, if it will change them', () => {
    const swapped = arrange(long, { troll: 4, singer: 0 }, { clock: { guest: 'troll' } })
    expect(madeAt(swapped, 'day').map((source) => source.by)).toEqual([{ guest: 'troll' }])
    const refused = arrange(long, { troll: 4, singer: 0 }, { clock: { guest: 'singer' } })
    expect(madeAt(refused, 'day')).toEqual([])
  })

  it('the same arrangement always gives the same arrivals', () => {
    const a = arrange(house, { troll: 4, cook: 1, yeti: 5 }, { stove: { room: 2 } })
    expect(arrivalsAt(a, 'night')).toEqual(arrivalsAt(a, 'night'))
    expect(arrivalsAt(a, 'day').length).toBeGreaterThan(0)
  })

  it('the quilt and the pipe on one wall each do what they do: the noise is stopped, and smell, warmth and cold go through the pipe', () => {
    const wall = { id: '0-1', kind: 'wall', a: 0, b: 1 } as const, floor = { id: '0-2', kind: 'floor', a: 0, b: 2 } as const
    expect(crosses('din', wall, 0, 'both')).toBe(false)
    for (const air of ['pong', 'warm', 'cold'] as const) {
      expect(crosses(air, wall, 0, 'both'), air).toBe(true)
      expect(crosses(air, floor, 2, 'both'), air).toBe(true)
    }
    // With the quilt alone, warmth does not rise through the floor; with the pipe let through it, it does.
    expect([crosses('warm', floor, 0, 'quilt'), crosses('warm', floor, 0, 'both')]).toEqual([false, true])
  })
})
