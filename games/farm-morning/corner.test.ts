import { describe, expect, it } from 'vitest'
import { yardTouch } from './corner'
import { Farm } from './farm'
import { GROWN_UP_CORNER } from './layout'
import { CORNER, inCorner } from './overlay'
import { fit } from './stage'
import { freshState } from './state'

// The silent corner is the overlay's corner: the same 72 pixels of the
// surface, at every size of surface. The size of the stills, a wide surface
// in which the stage does not reach the corner, and a narrow one in which
// the stage starts below the top edge.
const SURFACES = [{ width: 1180, height: 820 }, { width: 1400, height: 700 }, { width: 1024, height: 768 }] as const

const yard = (): Farm => { const farm = new Farm({ ...freshState(null), door: 'open' }, 1); farm.step(0.5); farm.takeSounds(); farm.takeStops(); return farm }

describe('the grown-up corner', () => {
  it('is the overlay\'s own square of the surface: 72 pixels a side, at every size', () => {
    expect(CORNER).toBe(72)
    for (const { width, height } of SURFACES) {
      const by = fit(width, height)
      for (let x = width - 100; x <= width; x += 1) for (let y = 0; y <= 100; y += 1) {
        const inside = x >= width - 72 && y <= 72
        expect(inCorner(x, y, width), `${width} by ${height} at ${x}, ${y}`).toBe(inside)
        expect(yardTouch({ x, y }, width, by) === null, `${width} by ${height} at ${x}, ${y}`).toBe(inside)
      }
    }
  })

  it('knocks everywhere on the bare page round it, right up to its edges, at every size', () => {
    for (const { width, height } of SURFACES) {
      const by = fit(width, height)
      const outside = [
        ...Array.from({ length: 13 }, (_, n) => ({ x: width - CORNER - 1, y: n * 6 })),
        ...Array.from({ length: 13 }, (_, n) => ({ x: width - CORNER + n * 6, y: CORNER + 1 })),
      ]
      for (const at of outside) {
        const farm = yard()
        const where = yardTouch(at, width, by)
        expect(where, `${width} by ${height} at ${at.x}, ${at.y}`).not.toBeNull()
        farm.press(where!.x, where!.y)
        expect(farm.takeSounds(), `${width} by ${height} at ${at.x}, ${at.y}`).toEqual(['knock'])
        expect(farm.gloss.age).toBe(0)
        expect(farm.look).toMatchObject({ x: where!.x, y: where!.y, age: 0 })
        expect(farm.turned).not.toBeNull()
      }
    }
  })

  it('leaves no silent square on the stage: where the stage\'s own corner is not under the overlay\'s, it knocks', () => {
    // In a surface of 1400 by 700 the stage is 1007 pixels wide in the middle, and its top right corner is 196 pixels
    // from the surface's: all of it knocks.
    const wide = fit(1400, 700)
    for (const stage of [{ x: GROWN_UP_CORNER.x + 4, y: 4 }, { x: GROWN_UP_CORNER.x + 48, y: 48 }, { x: GROWN_UP_CORNER.x + 92, y: 92 }]) {
      const at = { x: stage.x * wide.scale + wide.x, y: stage.y * wide.scale + wide.y }
      const where = yardTouch(at, 1400, wide)
      expect(where).not.toBeNull()
      const farm = yard()
      farm.press(where!.x, where!.y)
      expect(farm.takeSounds()).toEqual(['knock'])
    }
    // In 1024 by 768 the stage starts 28 pixels below the top edge: the strip above it, in the corner, is the grown-up's too.
    const narrow = fit(1024, 768)
    expect(narrow.y).toBeGreaterThan(28)
    for (let y = 0; y <= 28; y += 4) expect(yardTouch({ x: 1024 - 10, y }, 1024, narrow)).toBeNull()
  })

  it('has no target under it at any of these sizes: a touch that just misses it lands on bare page', () => {
    for (const { width, height } of SURFACES) {
      const by = fit(width, height)
      const farm = yard()
      for (let x = width - CORNER - 8; x <= width; x += 8) for (let y = 0; y <= CORNER + 8; y += 8) {
        expect(farm.targetAt({ x: (x - by.x) / by.scale, y: (y - by.y) / by.scale }).kind, `${width} by ${height} at ${x}, ${y}`).toBe('page')
      }
    }
  })
})
