import { describe, expect, it } from 'vitest'
import { hitAt } from './hit'
import { CROWS, FLIGHT_SECONDS, crowsAt, drawCrows, drawSmoke, perchesOf, treeBox, treeOf } from './inkSky'
import { layoutPage } from './layout'

const SHAPES = ['square', 'long', 'tower'] as const

/** A context that only counts what is asked of it. */
function counting(): { ctx: CanvasRenderingContext2D; calls: Record<string, number> } {
  const calls: Record<string, number> = {}
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, name) => (typeof name !== 'string' ? undefined : name in target ? target[name] : () => { calls[name] = (calls[name] ?? 0) + 1 }),
    set: (target, name, value) => { if (typeof name === 'string') target[name] = value; return true },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

describe('the sky is alive', () => {
  it('three crows sit on three boughs of the tree, well apart, in the sky over the lobby of every house', () => {
    for (const shape of SHAPES) {
      const page = layoutPage(1180, 820, shape)
      const perches = perchesOf(page)
      expect(perches.length, shape).toBe(CROWS)
      const ends = treeOf(page).map((bough) => `${bough.ex} ${bough.ey}`)
      for (const [index, perch] of perches.entries()) {
        expect(ends, shape).toContain(`${perch.x} ${perch.y}`)
        // Above the lean-to roof of the lobby and inside the plate.
        expect(perch.y, shape).toBeLessThan(page.canopy.y)
        expect(perch.y, shape).toBeGreaterThan(page.plate.y + 20 * page.scale)
        expect(perch.x, shape).toBeGreaterThan(page.lobby.x)
        for (const other of perches.slice(index + 1)) expect(Math.hypot(other.x - perch.x, other.y - perch.y), shape).toBeGreaterThan(34 * page.scale)
      }
    }
  })

  it('by day each crow keeps its bough and takes a turn round the sky by itself now and then, and comes back to the same bough', () => {
    const page = layoutPage(1180, 820, 'square')
    const perches = perchesOf(page)
    const flew = [0, 0, 0], sat = [0, 0, 0]
    for (let seconds = 0; seconds < 120; seconds += 0.25) {
      crowsAt(page, 'day', seconds).forEach((crow, index) => {
        if (crow.aloft === null) {
          sat[index]++
          expect(crow.x).toBe(perches[index].x)
          // A hop, and no more.
          expect(Math.abs(crow.y - perches[index].y)).toBeLessThan(3 * page.scale)
        } else flew[index]++
        // Always in the sky: on the plate and above the lobby's roof.
        expect(crow.x).toBeGreaterThan(page.plate.x)
        expect(crow.x).toBeLessThan(page.plate.x + page.plate.w)
        expect(crow.y).toBeGreaterThan(page.plate.y)
        expect(crow.y).toBeLessThan(page.canopy.y)
        expect(crow.asleep).toBe(false)
      })
    }
    // Each has flown, and each sits far longer than it flies.
    for (const index of [0, 1, 2]) {
      expect(flew[index]).toBeGreaterThan(0)
      expect(sat[index]).toBeGreaterThan(flew[index] * 2)
    }
    // A turn begins and ends on the bough, and goes somewhere in between.
    const start = crowsAt(page, 'day', 0, 0)[0], middle = crowsAt(page, 'day', 0, FLIGHT_SECONDS / 2)[0], end = crowsAt(page, 'day', 0, FLIGHT_SECONDS - 0.001)[0]
    expect(Math.hypot(start.x - perches[0].x, start.y - perches[0].y)).toBeLessThan(1)
    expect(Math.hypot(end.x - perches[0].x, end.y - perches[0].y)).toBeLessThan(1)
    expect(Math.hypot(middle.x - perches[0].x, middle.y - perches[0].y)).toBeGreaterThan(60 * page.scale)
  })

  it('by night they sleep, every one, and take no turn by themselves', () => {
    const page = layoutPage(1180, 820, 'long')
    for (let seconds = 0; seconds < 90; seconds += 0.5) for (const crow of crowsAt(page, 'night', seconds)) expect([crow.aloft, crow.asleep]).toEqual([null, true])
  })

  it('a finger on the tree sends all three up at once, by day or by night, and they are back within the turn', () => {
    const page = layoutPage(1180, 820, 'square')
    for (const phase of ['day', 'night'] as const) {
      // Half a second after the touch all three are in the air; at 2 seconds they are; a moment after the last has landed, none is.
      expect(crowsAt(page, phase, 6, 0.5).map((crow) => crow.aloft !== null)).toEqual([true, true, true])
      expect(crowsAt(page, phase, 6, 2).map((crow) => crow.aloft !== null)).toEqual([true, true, true])
      expect(crowsAt(page, 'night', 6, FLIGHT_SECONDS + 0.5).map((crow) => crow.aloft !== null)).toEqual([false, false, false])
    }
    // The tree is the place for that finger: its trunk and boughs, and not the sky beside it.
    const box = treeBox(page), trunk = treeOf(page)[0]
    expect(hitAt(page, [], { x: trunk.mx, y: trunk.my }).kind).toBe('tree')
    expect(hitAt(page, [], perchesOf(page)[0]).kind).toBe('tree')
    expect(hitAt(page, [], { x: box.x - 20, y: box.y + box.h / 2 }).kind).toBe('paper')
    expect(hitAt(page, [], { x: page.lobby.x + 20, y: page.plate.y + 30 }).kind).toBe('paper')
    expect(Math.min(box.w, box.h)).toBeGreaterThan(100)
  })

  it('the same moment is always the same, and the crows and the smoke are three calls of paint: one fill of ink, and a fill and a stroke for the smoke', () => {
    const page = layoutPage(1180, 820, 'square')
    expect(crowsAt(page, 'day', 41.3, 1.2)).toEqual(crowsAt(page, 'day', 41.3, 1.2))
    const crows = counting(), smoke = counting()
    expect(drawCrows(crows.ctx, page, 'day', 5, 1)).toBe(1)
    expect([crows.calls.fill, crows.calls.stroke ?? 0, crows.calls.fillText ?? 0]).toEqual([1, 0, 0])
    expect(drawSmoke(smoke.ctx, page, 5)).toBe(2)
    expect([smoke.calls.fill, smoke.calls.stroke, smoke.calls.fillText ?? 0]).toEqual([1, 1, 0])
  })
})
