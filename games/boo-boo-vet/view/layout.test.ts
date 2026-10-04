import { describe, expect, it } from 'vitest'
import { CARES } from '../needs'
import { BOTTOM_STRIP, layout, type Rect } from './layout'

const SURFACES = [
  { name: 'a wide tablet', width: 1180, height: 820 },
  { name: 'a tall tablet', width: 820, height: 1180 },
  { name: 'a smaller wide tablet', width: 1024, height: 768 },
] as const

/** The smallest a care thing may be across, in logical pixels: about 100 at 1180×820, and in step with a smaller surface. */
function floorFor(width: number, height: number): number {
  const [long, short] = width >= height ? [width, height] : [height, width]
  return 100 * Math.min(1, long / 1180, short / 820)
}

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/** The clear space between two boxes that do not overlap: the larger of the gaps along the two axes. */
function gap(a: Rect, b: Rect): number {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w))
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h))
  return Math.max(dx, dy)
}

describe.each(SURFACES)('the room on $name', ({ width, height }) => {
  const room = layout(width, height)
  const targets: [string, Rect][] = [...CARES.map((care): [string, Rect] => [care, room.targets.cares[care]]), ['waiting', room.targets.waiting]]

  it('gives every care thing a target a small finger can hit', () => {
    const floor = floorFor(width, height)
    for (const care of CARES) {
      const box = room.targets.cares[care]
      expect(box.w, care).toBeGreaterThanOrEqual(floor)
      expect(box.h, care).toBeGreaterThanOrEqual(floor)
    }
    expect(room.targets.waiting.w).toBeGreaterThanOrEqual(floor)
    expect(room.targets.waiting.h).toBeGreaterThanOrEqual(floor)
  })

  it('keeps the targets apart', () => {
    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        const [a, boxA] = targets[i], [b, boxB] = targets[j]
        expect(overlap(boxA, boxB), `${a} and ${b}`).toBe(false)
        expect(gap(boxA, boxB), `${a} and ${b}`).toBeGreaterThanOrEqual(12 * room.scale)
      }
    }
  })

  it('keeps every target out of the bottom strip and inside the surface', () => {
    for (const [name, box] of targets) {
      expect(box.x, name).toBeGreaterThanOrEqual(0)
      expect(box.y, name).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w, name).toBeLessThanOrEqual(width)
      expect(box.y + box.h, name).toBeLessThanOrEqual(height * (1 - BOTTOM_STRIP))
    }
  })

  it('keeps every piece inside the surface', () => {
    const spots = [...Object.entries(room.pieces), ...Object.entries(room.things)]
    for (const [name, spot] of spots) {
      const x = room.ox + spot.x * room.scale, y = room.oy + spot.y * room.scale
      expect(x, name).toBeGreaterThan(0)
      expect(x, name).toBeLessThan(width)
      expect(y, name).toBeGreaterThan(0)
      expect(y, name).toBeLessThan(height)
    }
  })

  it('runs the floor to both edges and to the bottom', () => {
    const left = room.ox + room.floor.x * room.scale, right = left + room.floor.w * room.scale
    const bottom = room.oy + (room.floor.y + room.floor.h) * room.scale
    expect(left).toBeLessThanOrEqual(0.001)
    expect(right).toBeGreaterThanOrEqual(width - 0.001)
    expect(bottom).toBeGreaterThanOrEqual(height - 0.001)
  })
})

describe('the room at any size', () => {
  it('lays a care thing at each of five different places', () => {
    const room = layout(1180, 820)
    const places = new Set(CARES.map((care) => `${room.things[care].x},${room.things[care].y}`))
    expect(places.size).toBe(CARES.length)
  })

  it('scales with the surface and never lays anything out in fixed pixels', () => {
    const small = layout(590, 410), large = layout(1180, 820)
    expect(small.scale).toBeCloseTo(large.scale / 2)
    for (const care of CARES) expect(small.targets.cares[care].w).toBeCloseTo(large.targets.cares[care].w / 2)
  })

  it('takes the tall frame only when the surface is taller than wide', () => {
    expect(layout(820, 1180).portrait).toBe(true)
    expect(layout(1180, 820).portrait).toBe(false)
    expect(layout(800, 800).portrait).toBe(false)
  })
})
