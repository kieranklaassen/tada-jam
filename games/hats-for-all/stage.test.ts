import { describe, expect, it } from 'vitest'
import { MOST } from './kinds'
import { ARCH, BODY, CREATURE_DEPTH, HAND, SLAB, TILE_DEPTH } from './sizes'
import {
  ARCH_X, ARCH_Z, BACK_Z, HOLE_GAP, IN_ARCH, LANE_Z, LOOSE_Z, OFF_LEFT_X, PARADE_SPEED, PARADE_STAGGER_S, ROW_Z, SPOT_GAP, TILE_Z, TURN_LEFT_X, TURN_RIGHT_X,
  alongWay, holeX, nearestSpot, paradeWay, spotX, wayFromArch, wayLength, wayOffLeft, wayOutByArch, wayToArch, wayToTile,
} from './stage'

const widest = Math.max(...Object.values(BODY).map((body) => body.reach)) + HAND.radius
const half = CREATURE_DEPTH / 2
const SPOTS = Array.from({ length: MOST }, (_, spot) => spot)

describe('the stage', () => {
  it('never lines the hats up under the heads', () => {
    expect(HOLE_GAP).toBeLessThan(spotX(1) - spotX(0))
    for (const spot of SPOTS) expect(nearestSpot(spotX(spot))).toBe(spot)
    expect(nearestSpot(-99)).toBe(0)
    expect(nearestSpot(99)).toBe(MOST - 1)
    expect(holeX(0, 5)).toBe(-holeX(4, 5))
  })

  it('keeps its lanes apart: a walker in front of the row or behind it touches nobody standing, no loose hat, not the tile and not the arch', () => {
    // In front: clear of the row's hands, and of a loose hat on its circle.
    expect(LANE_Z - half).toBeGreaterThan(ROW_Z + HAND.front)
    expect(LANE_Z + HAND.front).toBeLessThan(LOOSE_Z - 0.3 - SLAB / 2)
    // Two creatures on neighbouring spots do not touch, hands and all.
    const widths = Object.values(BODY).map((body) => body.reach + HAND.radius).sort((a, b) => b - a)
    expect(widths[0] + widths[1]).toBeLessThan(SPOT_GAP)
    // A loose hat stays clear of the tile behind it.
    expect(LOOSE_Z + 0.3 + SLAB / 2).toBeLessThan(TILE_Z - TILE_DEPTH / 2)
    // Behind: clear of the row and of the arch.
    expect(BACK_Z + half).toBeLessThan(ROW_Z - half)
    expect(BACK_Z - half).toBeGreaterThan(ARCH_Z + ARCH.depth / 2)
    // The parade's turns are clear of the creatures' own row ends, and its right turn passes in front of the arch, never through it.
    expect(TURN_LEFT_X).toBeLessThan(spotX(0))
    expect(TURN_RIGHT_X).toBeGreaterThan(spotX(MOST - 1))
  })

  it('makes an arch every creature fits through, bare', () => {
    expect(widest * 1.08).toBeLessThan(ARCH.inner)
    expect(Math.max(...Object.values(BODY).map((body) => body.top))).toBeLessThan(ARCH.straight + ARCH.inner * 0.9)
    expect(IN_ARCH).toEqual({ x: ARCH_X, z: ARCH_Z })
  })
})

describe('the ways', () => {
  it('start and end where they say', () => {
    for (const spot of SPOTS) {
      expect(wayFromArch(spot)[0]).toEqual(IN_ARCH)
      expect(wayFromArch(spot).at(-1)).toEqual({ x: spotX(spot), z: ROW_Z })
      expect(wayOutByArch(spot)[0]).toEqual({ x: spotX(spot), z: ROW_Z })
      expect(wayOffLeft(spot).at(-1)).toEqual({ x: OFF_LEFT_X, z: LANE_Z })
      expect(paradeWay(spot)[0]).toEqual(paradeWay(spot).at(-1))
    }
    expect(wayToArch().at(-1)).toEqual(IN_ARCH)
    expect(wayToTile(0, 0, 3).at(-1)!.z).toBeLessThan(TILE_Z - TILE_DEPTH / 2 - half)
  })

  it('run only along the lanes: every stretch is straight across or straight to and fro, except the step to the tile', () => {
    for (const spot of SPOTS) for (const way of [wayFromArch(spot), wayOutByArch(spot), wayOffLeft(spot), paradeWay(spot)]) {
      for (let i = 1; i < way.length; i++) expect(way[i].x === way[i - 1].x || way[i].z === way[i - 1].z).toBe(true)
      for (const point of way) if (point.x !== ARCH_X && point.x !== wayToArch()[0].x && point.x !== spotX(spot)) expect([LANE_Z, BACK_Z]).toContain(point.z)
    }
  })

  it('give the parade the same length from every spot, so the line keeps its gaps', () => {
    const lengths = SPOTS.map((spot) => wayLength(paradeWay(spot)))
    for (const length of lengths) expect(length).toBeCloseTo(lengths[0], 9)
    // Each sets off a moment after the one before: at no instant do two of the widest creatures overlap, even at a turn.
    const a = { x: 0, z: 0, heading: 0 }, b = { x: 0, z: 0, heading: 0 }
    for (let t = 0; t <= lengths[0] / PARADE_SPEED + MOST * PARADE_STAGGER_S; t += 1 / 60) for (let spot = 1; spot < MOST; spot++) {
      alongWay(paradeWay(spot - 1), (t - (spot - 1) * PARADE_STAGGER_S) * PARADE_SPEED, a)
      alongWay(paradeWay(spot), (t - spot * PARADE_STAGGER_S) * PARADE_SPEED, b)
      expect(Math.abs(a.x - b.x) < 2 * widest && Math.abs(a.z - b.z) < CREATURE_DEPTH, `spots ${spot - 1} and ${spot} at ${t.toFixed(2)} s`).toBe(false)
    }
  })

  it('are walked from the first point to the last and no further', () => {
    const way = wayFromArch(2), at = { x: 0, z: 0, heading: 0 }
    alongWay(way, -3, at)
    expect([at.x, at.z]).toEqual([way[0].x, way[0].z])
    alongWay(way, 1e6, at)
    expect(at.x).toBeCloseTo(way.at(-1)!.x, 9)
    expect(at.z).toBeCloseTo(way.at(-1)!.z, 9)
    alongWay(way, wayLength(way) / 2, at)
    expect(Number.isFinite(at.x + at.z)).toBe(true)
    expect([-1, 0, 1]).toContain(at.heading)
  })
})
