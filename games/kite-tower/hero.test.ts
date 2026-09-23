import { describe, expect, it } from 'vitest'
import type { Move } from './climb'
import { buildRoute, routeDuration, routePose, type RoutePose } from './hero'

const pose = (): RoutePose => ({ x: 0, y: 0, facing: 1, kind: null, phase: 0, hops: 1, index: 0, done: false })

const walkThenClimb: Move[] = [
  { kind: 'walk', to: { x: 0.25, y: 0, on: null } },
  { kind: 'walk', to: { x: 0.5, y: 0, on: null } },
  { kind: 'walk', to: { x: 0.75, y: 0, on: null } },
  { kind: 'climb', to: { x: 1.2, y: 1, on: 3 } },
  { kind: 'hop', to: { x: 2.1, y: 1, on: 5 } },
  { kind: 'drop', to: { x: 2.8, y: 0, on: null } },
]

describe('buildRoute', () => {
  it('merges runs of walking steps into one segment', () => {
    const route = buildRoute({ x: 0, y: 0 }, walkThenClimb)
    expect(route.map((s) => s.kind)).toEqual(['walk', 'climb', 'hop', 'drop'])
    expect(route[0].path).toHaveLength(4)
    expect(route[0].length).toBeCloseTo(0.75, 5)
    expect(route[1].on).toBe(3)
    expect(routeDuration(route)).toBeGreaterThan(2)
  })

  it('an empty plan is an empty route', () => {
    expect(buildRoute({ x: 1, y: 0 }, [])).toEqual([])
  })
})

describe('routePose', () => {
  const route = buildRoute({ x: 0, y: 0 }, walkThenClimb)

  it('starts at the start and ends at the goal', () => {
    const start = routePose(route, 0, pose())
    expect(start.x).toBeCloseTo(0, 5)
    expect(start.y).toBeCloseTo(0, 5)
    expect(start.done).toBe(false)
    const end = routePose(route, routeDuration(route) + 0.01, pose())
    expect(end.x).toBeCloseTo(2.8, 5)
    expect(end.y).toBeCloseTo(0, 5)
    expect(end.done).toBe(true)
  })

  it('a climb rises onto the ledge and a hop arcs above the line', () => {
    const climbStart = route[0].duration
    let last = -Infinity
    for (let k = 0.02; k <= 0.68; k += 0.05) {
      const p = routePose(route, climbStart + route[1].duration * k, pose())
      expect(p.kind).toBe('climb')
      expect(p.y).toBeGreaterThanOrEqual(last - 1e-9)
      last = p.y
    }
    const mid = routePose(route, climbStart + route[1].duration + route[2].duration / 2, pose())
    expect(mid.kind).toBe('hop')
    expect(mid.y).toBeGreaterThan(1.3)
  })

  it('counts hops for a walk and faces the way it goes', () => {
    const p = routePose(route, 0.1, pose())
    expect(p.kind).toBe('walk')
    expect(p.hops).toBe(2)
    expect(p.facing).toBe(1)
    const back = buildRoute({ x: 0, y: 0 }, [{ kind: 'walk', to: { x: -1, y: 0, on: null } }])
    expect(routePose(back, 0.2, pose()).facing).toBe(-1)
  })
})
