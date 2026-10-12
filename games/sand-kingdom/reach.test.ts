import { describe, expect, it } from 'vitest'
import { cameraFor } from './camera'
import { CELL, DIG_DEPTH, X0, X1, Z0, Z1, deltaAt, dent, encode, makeField, peakNear, tower } from './field'
import { act } from './hand'
import type { Gesture } from './input'
import { deserializeKingdom } from './kingdom'
import { beachEnd, groundPoint, targetAt } from './layout'
import { Play, SAND } from './play'

// A finger anywhere on the sand shapes it, on every surface: at the bottom
// edge of the frame as in the middle of the beach, and beside the grid as on
// it. Out at sea the water answers under the finger. These go through the
// door a finger uses (hand.ts), from a point of the surface.

const DT = 1 / 60
/** The two surfaces the sheet names, the same two held tall, a wide one and a long narrow one. */
const SURFACES = [[1180, 820], [1024, 768], [820, 1180], [768, 1024], [1366, 1024], [1280, 720], [2000, 800]] as const
const fresh = (): Play => new Play(deserializeKingdom(null, 7), 1)
const names = (play: Play, from: number): string[] => play.heard.slice(from).map((one) => one.name)

/** The deepest cell of a beach. */
function deepest(play: Play): number {
  let low = Infinity
  for (const cell of play.field.d) low = Math.min(low, cell)
  return low
}
/**
 * How deep a tap digs in the middle of the beach at a point that lies in its cell just as this one does: the
 * same dent a whole number of cells away, where nothing is near an edge.
 */
function elsewhere(x: number, z: number): number {
  const field = makeField()
  dent(field, x - Math.round(x / CELL) * CELL + 0.5, z - Math.round((z - 2) / CELL) * CELL)
  let low = Infinity
  for (const cell of field.d) low = Math.min(low, cell)
  return low
}
function tapAt(play: Play, camera: ReturnType<typeof cameraFor>, x: number, y: number): void {
  const gestures: Gesture[] = [{ type: 'press', at: { x, y } }, { type: 'tap', at: { x, y } }]
  act(play, camera, gestures)
}

describe('a finger at the edge of the frame', () => {
  it('digs in the middle of the beach nearly as deep as one stroke goes, wherever in a cell the finger lands', () => {
    for (const [x, z] of [[0.6, 2.1], [0.625, 2.125], [0.5, 2], [-1.37, 3.01]] as const) expect(elsewhere(x, z)).toBeLessThan(-DIG_DEPTH * 0.72)
  })

  for (const [width, height] of SURFACES) {
    const camera = cameraFor(width, height)

    it(`${width} by ${height}: the bottom edge of the frame is sand the grid holds at its full depth`, () => {
      expect(beachEnd(camera)).toBeLessThanOrEqual(SAND.z1)
      for (const sx of [1, width * 0.25, width * 0.5, width * 0.75, width - 1]) {
        const ground = groundPoint(camera, sx, height - 1, fresh().field, 0)!
        expect(ground.x).toBeGreaterThanOrEqual(SAND.x0)
        expect(ground.x).toBeLessThanOrEqual(SAND.x1)
        expect(ground.z).toBeLessThanOrEqual(SAND.z1)
      }
    })

    it(`${width} by ${height}: a tap on the lowest row of the frame dents the sand under the finger as deep as a tap in the middle, with a thud and grains`, () => {
      for (const sx of [width * 0.08, width * 0.3, width * 0.5, width * 0.7, width * 0.92]) {
        const play = fresh(), from = play.heard.length
        const sy = height - 2
        const target = targetAt(camera, sx, sy, play.field, play.folk.spots((x, z) => play.ground(x, z)), play.sea, play.drawn(), play.cloudXs())
        expect(target.kind, `at ${sx}`).toBe('sand')
        const ground = groundPoint(camera, sx, sy, play.field, play.sea)!
        tapAt(play, camera, sx, sy)
        expect(names(play, from), `at ${sx}`).toContain('thud')
        expect(play.grains.length, `at ${sx}`).toBeGreaterThan(5)
        // Under the finger, and exactly as deep as the same tap in the middle of the beach.
        expect(deltaAt(play.field, ground.x, ground.z), `at ${sx}`).toBeLessThan(-DIG_DEPTH * 0.6)
        expect(deepest(play), `at ${sx}`).toBeCloseTo(elsewhere(ground.x, ground.z), 5)
        // A dent is not a groove: the order the grooves were dug holds nothing yet.
        expect(play.toState().dug.length).toBe(0)
      }
    })

    it(`${width} by ${height}: a groove drawn along the bottom edge is as deep as one drawn across the middle`, () => {
      const play = fresh()
      const sy = height - 3
      const gestures: Gesture[] = [{ type: 'press', at: { x: width * 0.3, y: sy } }, { type: 'dragStart', from: { x: width * 0.3, y: sy } }]
      for (let i = 1; i <= 20; i++) gestures.push({ type: 'dragMove', from: { x: width * 0.3, y: sy }, at: { x: width * (0.3 + 0.02 * i), y: sy } })
      act(play, camera, gestures)
      const half = groundPoint(camera, width * 0.5, sy, fresh().field, 0)!
      expect(deltaAt(play.field, half.x, half.z)).toBeLessThan(-DIG_DEPTH * 0.6)
      // Somewhere along it the stroke passed over the middle of a cell, and there it is as deep as a stroke goes.
      expect(deepest(play)).toBeLessThan(-DIG_DEPTH * 0.9)
    })
  }

  it('beside the grid, on a surface wide enough to show sand there, a tap shapes the nearest sand and is never only a thud', () => {
    const camera = cameraFor(2000, 800)
    let beside = 0
    for (let sy = 300; sy < 800; sy += 40) {
      for (const sx of [3, 1997]) {
        const play = fresh(), from = play.heard.length
        const ground = groundPoint(camera, sx, sy, play.field, play.sea)
        if (!ground || (ground.x >= X0 && ground.x <= X1)) continue
        const target = targetAt(camera, sx, sy, play.field, play.folk.spots((x, z) => play.ground(x, z)), play.sea, play.drawn(), play.cloudXs())
        if (target.kind !== 'sand') continue
        beside += 1
        const before = encode(play.field)
        tapAt(play, camera, sx, sy)
        expect(names(play, from)).toContain('thud')
        expect(encode(play.field)).not.toBe(before)
        expect(play.grains.length).toBeGreaterThan(5)
        const x = Math.min(SAND.x1, Math.max(SAND.x0, ground.x)), z = Math.min(SAND.z1, Math.max(SAND.z0, ground.z))
        expect(deepest(play)).toBeCloseTo(elsewhere(x, z), 5)
      }
    }
    expect(beside).toBeGreaterThan(3)
  })

  it('the grid reaches past the bottom of every one of these frames, and its sea edge is under the sea', () => {
    for (const [width, height] of SURFACES) expect(beachEnd(cameraFor(width, height))).toBeLessThan(Z1 - 0.75)
    expect(SAND.z0).toBeLessThan(-3)
    expect(Z0).toBeLessThan(SAND.z0)
  })
})

describe('a finger out at sea', () => {
  it('splashes under the finger where it lands, however far out', () => {
    for (const [x, z] of [[1, -8], [-6, -5.5], [9, -11], [0, -4.5]] as const) {
      const play = fresh(), from = play.heard.length
      const before = encode(play.field)
      play.press({ kind: 'water', x, z })
      expect(names(play, from)).toEqual(['plip'])
      expect(play.rings).toHaveLength(1)
      expect(play.rings[0].x).toBeCloseTo(x, 6)
      expect(play.rings[0].z).toBeCloseTo(z, 6)
      expect(play.grains.length).toBeGreaterThan(8)
      for (const drop of play.grains) {
        expect(drop.wet).toBe(true)
        expect(Math.hypot(drop.x - x, drop.z - z)).toBeLessThan(1e-6)
      }
      // The sand at the sea's edge is not dug by a finger that is not on it.
      expect(encode(play.field)).toBe(before)
      play.tap()
    }
  })

  it('drawn across the sea, every drop jumps from under the finger and none from the edge of the sand', () => {
    const play = fresh()
    const before = encode(play.field)
    play.press({ kind: 'water', x: -3, z: -9 })
    play.dragStart()
    let seen = play.grains.length, drops = 0
    for (let i = 1; i <= 60; i++) {
      const x = -3 + i * 0.12, z = -9 + i * 0.03
      const had = new Set(play.grains)
      play.drag(x, z, 0)
      for (const drop of play.grains) {
        if (had.has(drop)) continue
        drops += 1
        expect(drop.wet).toBe(true)
        expect(Math.hypot(drop.x - x, drop.z - z)).toBeLessThan(1e-6)
      }
      play.step(DT)
      seen = play.grains.length
    }
    play.release()
    expect(seen).toBeGreaterThanOrEqual(0)
    expect(drops).toBeGreaterThan(20)
    expect(encode(play.field)).toBe(before)
    expect(play.toState().dug).toEqual([])
  })

  it('drawn in from the sea onto the sand, the groove starts where the finger comes ashore', () => {
    const play = fresh()
    play.press({ kind: 'water', x: 2, z: -7 })
    play.dragStart()
    for (let i = 1; i <= 70; i++) {
      play.drag(2, -7 + i * 0.12, 0)
      play.step(DT)
    }
    play.release()
    // Dug up the beach from the water's edge, and not a mark out where the sea is deep.
    expect(deltaAt(play.field, 2, 0.5)).toBeLessThan(-0.15)
    expect(deltaAt(play.field, 2, -2.5)).toBeLessThan(-0.15)
    expect(deltaAt(play.field, 2, -3.9)).toBeCloseTo(0, 3)
  })
})

describe('one stroke through a tower', () => {
  it('cuts a gate down to the level of the beach, and the tower stands on either side of it', () => {
    for (const [tiers, at] of [[1, 3.4], [2, 3.4], [1, 3.375], [2, 3.425], [1, 3.5], [2, 3.3]] as const) {
      const play = fresh()
      tower(play.field, 0, 3.4, 0, 1)
      if (tiers === 2) tower(play.field, 0, 3.4, 0.7, 0.7)
      const stood = peakNear(play.field, 0, 3.4, 0.3)
      expect(stood).toBeGreaterThan(0.65)
      play.press({ kind: 'sand', x: -1.6, z: at })
      play.dragStart()
      for (let i = 1; i <= 32; i++) {
        play.drag(-1.6 + i * 0.1, at, 0)
        play.step(DT)
      }
      play.release()
      // Through the middle the sand is down at the beach: a way through, not a dip in the top.
      // (Read at the bottom of the cut: the way through is one or two cells wide, and the finger may pass between two rows.)
      for (const x of [-0.3, -0.1, 0.1, 0.3]) {
        let bottom = Infinity
        for (let dz = -0.15; dz <= 0.151; dz += 0.025) bottom = Math.min(bottom, deltaAt(play.field, x, at + dz))
        expect(bottom, `${tiers} tiers, stroke at ${at}, at ${x}`).toBeLessThan(0.1)
      }
      // And the tower stands on either side of the way through. Cut through its middle, both posts are three
      // times as high as the cut and more; cut to one side, the wide side is, and the narrow side is its foot.
      const sides = [peakNear(play.field, 0, at - 0.34, 0.2), peakNear(play.field, 0, at + 0.34, 0.2)]
      expect(Math.max(...sides), `${tiers} tiers, stroke at ${at}`).toBeGreaterThan(0.45)
      expect(Math.min(...sides), `${tiers} tiers, stroke at ${at}`).toBeGreaterThan(Math.abs(at - 3.4) < 0.05 ? 0.45 : 0.2)
    }
  })
})
