import { describe, expect, it } from 'vitest'
import { ScarfController, STANDS_IN, type Projector } from './controller'
import type { Point } from './input'
import { BODY, HILL_SPOTS, LOOM_SPOT, SCARF } from './layout'
import { BASKET_FOOTPRINT, LOOM_FOOTPRINT, planRoute, segmentClearance, type Obstacle, type Point2 } from './paths'
import { ANIMALS, initialState, WIDTH, type AnimalKey, type Row } from './state'

const clearance = (p: Point2, o: Obstacle) => segmentClearance(p.x, p.z, p.x, p.z, o)

function legsClear(from: Point2, route: Point2[], o: Obstacle): number {
  let worst = Infinity
  let at = from
  for (const p of route) {
    worst = Math.min(worst, segmentClearance(at.x, at.z, p.x, p.z, o))
    at = p
  }
  return worst
}

describe('planRoute', () => {
  it('goes round a box a straight walk would cross, every leg keeping the room clear', () => {
    const box: Obstacle = { kind: 'box', x0: -10, x1: 10, z0: -5, z1: 5 }
    const from = { x: -30, z: 0 }
    const to = { x: 30, z: 2 }
    expect(segmentClearance(from.x, from.z, to.x, to.z, box)).toBe(0)
    const route = planRoute(from, to, 6, [box])
    expect(route.length).toBeGreaterThan(1)
    expect(route.at(-1)).toEqual(to)
    expect(legsClear(from, route, box)).toBeGreaterThanOrEqual(6 - 1e-6)
  })

  it('walks straight when nothing is in the way', () => {
    const round: Obstacle = { kind: 'round', x: 0, z: 40, r: 5 }
    expect(planRoute({ x: -30, z: 0 }, { x: 30, z: 0 }, 6, [round])).toEqual([{ x: 30, z: 0 }])
  })

  it('steps off a spot close to something without coming any nearer to it', () => {
    const round: Obstacle = { kind: 'round', x: 0, z: 0, r: 5 }
    const from = { x: 8, z: 0 }
    const to = { x: -30, z: 0 }
    const route = planRoute(from, to, 6, [round])
    expect(route.at(-1)).toEqual(to)
    expect(legsClear(from, route, round)).toBeGreaterThanOrEqual(clearance(from, round) - 1e-6)
  })
})

const PPU = 10
const projector: Projector = {
  toScreen(p, out) {
    out.x = (p.x + 70) * PPU
    out.y = (80 - p.y) * PPU
    return true
  },
  toPlaneZ(s, z, out) {
    out.x = s.x / PPU - 70
    out.y = 80 - s.y / PPU
    out.z = z
    return true
  },
  toPlaneY(s, y, out) {
    out.x = s.x / PPU - 70
    out.y = y
    out.z = 0
    return true
  },
  pixelsPerUnit: () => PPU,
}
const row = (colour: number): Row => new Array<number>(WIDTH).fill(colour)
const TAU = Math.PI * 2

/** The view's own easing of an animal toward the way it walks. */
function turn(current: number, target: number, rate: number, dt: number): number {
  let d = target - current
  while (d > Math.PI) d -= TAU
  while (d < -Math.PI) d += TAU
  return current + d * (1 - Math.exp(-rate * dt))
}

/** How far the fox's streaming tail reaches behind it at a trot, and how thick its tip is. */
const TAIL_FROM = 5.8
const TAIL_TO = 23
const TAIL_RADIUS = 3.4

type Worst = { margin: number; what: string }

/**
 * Plays a scarf's walks: the animal at the loom walks there, is given a
 * scarf, and walks home while the next one arrives. Returns the least room
 * any walker's body kept from the loom, the basket and its friends, and the
 * fox's streaming tail from the loom.
 */
function playWalks(warm: AnimalKey[], atLoom: AnimalKey | null): { body: Worst; tail: Worst; walked: Set<AnimalKey> } {
  const state = initialState()
  for (const animal of warm) state.scarves[animal] = [[row(0), row(1)]]
  state.atLoom = atLoom
  state.loom = Array.from({ length: 8 }, (_, i) => row(i % 2))
  const game = new ScarfController(state, { save: () => {}, childAge: 5 })
  game.setProjector(projector)
  const body: Worst = { margin: Infinity, what: '' }
  const tail: Worst = { margin: Infinity, what: '' }
  const walked = new Set<AnimalKey>()
  const shown = Object.fromEntries(ANIMALS.map((a) => [a, game.actors[a].yaw])) as Record<AnimalKey, number>
  const note = (worst: Worst, margin: number, what: string) => {
    if (margin < worst.margin) {
      worst.margin = margin
      worst.what = `${what} @ ${game.t.toFixed(2)}`
    }
  }
  const step = () => {
    game.step(1 / 60)
    for (const animal of ANIMALS) {
      const actor = game.actors[animal]
      shown[animal] = turn(shown[animal], actor.yaw, 7, 1 / 60)
      if (!actor.visible || !actor.walking || game.t < actor.walkT0) continue
      walked.add(animal)
      const reach = BODY[animal].reach
      note(body, clearance(actor, LOOM_FOOTPRINT) - reach, `${animal} × loom`)
      note(body, clearance(actor, BASKET_FOOTPRINT) - reach, `${animal} × basket`)
      for (const other of ANIMALS) {
        const friend = game.actors[other]
        if (other === animal || !friend.visible) continue
        const room = friend.walking ? BODY[other].reach : STANDS_IN[other]
        note(body, Math.hypot(actor.x - friend.x, actor.z - friend.z) - room - reach, `${animal} × ${other}${friend.walking ? ' (walking)' : ''}`)
      }
      if (animal === 'fox') {
        for (let d = TAIL_FROM; d <= TAIL_TO; d += 1) {
          const p = { x: actor.x - Math.sin(shown.fox) * d, z: actor.z - Math.cos(shown.fox) * d }
          note(tail, clearance(p, LOOM_FOOTPRINT) - TAIL_RADIUS, `fox tail × loom (${d} behind)`)
        }
      }
    }
  }
  for (let i = 0; i < 60 * 20 && !game.offered; i++) step()
  expect(game.offered).toBe(true)
  const at: Point = { x: (SCARF.x + 70) * PPU, y: (80 - (SCARF.top - 10)) * PPU }
  game.pointerDown(1, at, 0)
  game.pointerUp(1, at, 80)
  for (let i = 0; i < 60 * 30; i++) step()
  return { body, tail, walked }
}

describe('Cosy Scarf walks', () => {
  const earlier = (animal: AnimalKey) => ANIMALS.slice(0, ANIMALS.indexOf(animal))

  for (const animal of ANIMALS) {
    it(`the ${animal} walks to the loom and home again round the loom, the basket and friends already on the hill`, () => {
      const { body, tail, walked } = playWalks(earlier(animal), animal)
      expect(walked.has(animal)).toBe(true)
      expect(body.margin, body.what).toBeGreaterThanOrEqual(0)
      expect(tail.margin, tail.what).toBeGreaterThanOrEqual(0)
    })
  }

  it('a cosy friend called down from the hill walks round the others there, and back', () => {
    const { body, walked } = playWalks([...ANIMALS], null)
    expect(walked.size).toBeGreaterThan(0)
    expect(body.margin, body.what).toBeGreaterThanOrEqual(0)
  })

  it('every walk still ends on its spot', () => {
    for (const animal of ANIMALS) {
      const state = initialState()
      for (const friend of earlier(animal)) state.scarves[friend] = [[row(0), row(1)]]
      state.atLoom = animal
      state.loom = Array.from({ length: 8 }, (_, i) => row(i % 2))
      const game = new ScarfController(state, { save: () => {}, childAge: 5 })
      game.setProjector(projector)
      for (let i = 0; i < 60 * 20 && !game.offered; i++) game.step(1 / 60)
      expect(game.actors[animal].x).toBeCloseTo(LOOM_SPOT.x)
      expect(game.actors[animal].z).toBeCloseTo(LOOM_SPOT.z)
      const at: Point = { x: (SCARF.x + 70) * PPU, y: (80 - (SCARF.top - 10)) * PPU }
      game.pointerDown(1, at, 0)
      game.pointerUp(1, at, 80)
      for (let i = 0; i < 60 * 30; i++) game.step(1 / 60)
      expect(game.actors[animal].walking).toBe(false)
      expect(game.actors[animal].x).toBeCloseTo(HILL_SPOTS[animal].x)
      expect(game.actors[animal].z).toBeCloseTo(HILL_SPOTS[animal].z)
      expect(game.actors[animal].yaw).toBeCloseTo(HILL_SPOTS[animal].yaw)
    }
  })
})
