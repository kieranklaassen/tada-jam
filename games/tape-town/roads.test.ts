import { describe, expect, it } from 'vitest'
import { TAPE_WIDTH } from './layout'
import { headingOf, locate, nearestEnd, network, placeOf, travel, type Rider } from './roads'
import type { Strip } from './tape'

const tape = (kind: 0 | 1 | 2 | 3, ax: number, ay: number, bx: number, by: number): Strip => ({ kind, ax, ay, bx, by })
const road = (ax: number, ay: number, bx: number, by: number): Strip => tape(0, ax, ay, bx, by)
const on = (s: number, d: number, dir: 1 | -1 = 1): Rider => ({ s, d, dir, skip: -1 })

describe('where roads join', () => {
  it('joins two grey strips that cross, and no strip of another tape', () => {
    const net = network([road(300, 300, 700, 300), tape(1, 500, 100, 500, 500), road(400, 100, 400, 500)])
    expect(net.strips).toHaveLength(2)
    expect(net.joins).toEqual([{ i: 0, j: 1, di: 100, dj: 200 }])
  })

  it('joins two ends laid corner to corner, an end laid against a side, and a road carried on in the same line', () => {
    expect(network([road(300, 300, 600, 300), road(610, 310, 610, 600)]).joins).toHaveLength(1)
    expect(network([road(300, 300, 700, 300), road(500, 330, 500, 600)]).joins).toEqual([{ i: 0, j: 1, di: 200, dj: 0 }])
    expect(network([road(300, 300, 600, 300), road(620, 304, 900, 310)]).joins).toHaveLength(1)
  })

  it('does not join strips that lie apart, and joins nothing to a stub', () => {
    expect(network([road(300, 300, 600, 300), road(300, 300 + TAPE_WIDTH * 2, 600, 300 + TAPE_WIDTH * 2)]).joins).toHaveLength(0)
    expect(network([road(300, 300, 700, 300), road(500, 270, 500, 330)]).joins).toHaveLength(0)
  })
})

describe('a rider on the road', () => {
  it('moves along its strip and faces the way it goes', () => {
    const net = network([road(300, 300, 700, 300)])
    const went = travel(net, on(0, 100), 50)
    expect(went).toMatchObject({ turned: false, ended: false })
    expect(placeOf(net, went.rider)).toEqual({ x: 450, y: 300 })
    expect(headingOf(net, went.rider)).toBe(0)
    expect(headingOf(net, on(0, 100, -1))).toBeCloseTo(Math.PI)
  })

  it('stops short of the torn end by the length of its nose, and says the road has ended', () => {
    const net = network([road(300, 300, 700, 300)])
    const went = travel(net, on(0, 300), 500, 60)
    expect(went.ended).toBe(true)
    expect(went.rider.d).toBe(340)
    const back = travel(net, on(0, 100, -1), 500, 60)
    expect(back.ended).toBe(true)
    expect(back.rider.d).toBe(60)
  })

  it('takes the turn at a join, onto the other strip and toward its longer side', () => {
    // The side road crosses at 100 along the main road; 100 of it lies above the crossing and 300 below.
    const net = network([road(300, 300, 700, 300), road(400, 200, 400, 600)])
    const went = travel(net, on(0, 40), 100)
    expect(went.turned).toBe(true)
    expect(went.rider.s).toBe(1)
    expect(went.rider.dir).toBe(1)
    expect(placeOf(net, went.rider)).toEqual({ x: 400, y: 340 })
    // Mirrored, the longer side is the other way.
    const mirrored = network([road(300, 300, 700, 300), road(400, 600, 400, 200)])
    expect(travel(mirrored, on(0, 40), 100).rider.dir).toBe(-1)
  })

  it('takes the same turn every time, and does not turn straight back at the join it has just taken', () => {
    const net = network([road(300, 300, 700, 300), road(400, 200, 400, 600)])
    const first = travel(net, on(0, 40), 61)
    expect(first.turned).toBe(true)
    const next = travel(net, first.rider, 5)
    expect(next.turned).toBe(false)
    expect(next.rider.s).toBe(1)
    expect(travel(net, on(0, 40), 61).rider).toEqual(first.rider)
  })

  it('takes the join again when it comes back to it', () => {
    const net = network([road(300, 300, 700, 300), road(400, 200, 400, 600)])
    let rider = travel(net, on(0, 40), 61).rider
    // Down the side road to its end, round, and back up to the crossing.
    rider = travel(net, rider, 1000, 0).rider
    expect(rider.d).toBe(400)
    const back = travel(net, { ...rider, dir: -1 }, 320)
    expect(back.turned).toBe(true)
    expect(back.rider.s).toBe(0)
  })

  it('drives a corner of two strips round and round without leaving the road', () => {
    const net = network([road(300, 300, 700, 300), road(700, 300, 700, 600)])
    let rider = on(0, 50), turns = 0
    for (let i = 0; i < 600; i++) {
      const went = travel(net, rider, 2.5, 60)
      rider = went.ended ? { ...went.rider, dir: went.rider.dir === 1 ? -1 : 1, skip: -1 } : went.rider
      if (went.turned) turns++
      const at = placeOf(net, rider)
      expect(Math.min(Math.abs(at.y - 300), Math.abs(at.x - 700))).toBeLessThan(0.001)
    }
    expect(turns).toBeGreaterThanOrEqual(2)
  })
})

describe('finding the road', () => {
  it('finds the strip a toy stands on and heads it the way it already faces', () => {
    const net = network([road(300, 300, 700, 300)])
    expect(locate(net, { x: 500, y: 320 }, 0.3)).toEqual(on(0, 200, 1))
    expect(locate(net, { x: 500, y: 320 }, 3)).toEqual(on(0, 200, -1))
    expect(locate(net, { x: 500, y: 300 + TAPE_WIDTH }, 0)).toBeNull()
  })

  it('finds the nearest end of any road, facing along it, and none when there is no road', () => {
    const net = network([road(300, 300, 700, 300), road(300, 600, 900, 600)])
    expect(nearestEnd(net, { x: 760, y: 280 })).toEqual(on(0, 400, -1))
    expect(nearestEnd(net, { x: 280, y: 640 })).toEqual(on(1, 0, 1))
    expect(nearestEnd(network([]), { x: 0, y: 0 })).toBeNull()
  })
})
