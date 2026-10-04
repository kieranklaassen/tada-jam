import { describe, expect, it } from 'vitest'
import { stubbornTape } from './hit'
import { freshLab } from './lab'
import { layoutOf, placesOf } from './layout'
import { gameTargetAt } from './reach'
import { PRESSED, frondAt, leafAt, thingAt, type Pressed } from './things'
import { CORNER } from './overlay'

const SIZES: [number, number][] = [[1180, 820], [1024, 768], [820, 1180]]

/** The four corners and the middle of a pressed thing's box, on the page. */
function pointsOf(at: Pressed, box: { x: number; y: number; w: number; h: number }): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (const [fx, fy] of [[0.1, 0.2], [0.9, 0.2], [0.9, 0.8], [0.1, 0.8], [0.5, 0.5]]) {
    const lx = (box.x + box.w * fx) * at.u, ly = (box.y + box.h * fy) * at.u
    out.push({ x: at.x + lx * Math.cos(at.turn) - ly * Math.sin(at.turn), y: at.y + lx * Math.sin(at.turn) + ly * Math.cos(at.turn) })
  }
  return out
}

describe('the paper things of the page', () => {
  it('are found where they lie: the pressed leaf, the frond and the free end of the tape, at each size', () => {
    for (const [w, h] of SIZES) {
      const layout = layoutOf(w, h)
      for (const point of pointsOf(leafAt(layout), PRESSED.leaf)) expect(thingAt(layout, point, 0, 0), `leaf at ${w}`).toBe('leaf')
      for (const point of pointsOf(frondAt(layout), PRESSED.frond)) expect(thingAt(layout, point, 0, 0), `frond at ${w}`).toBe('frond')
      expect(thingAt(layout, stubbornTape(layout).end, 0, 0)).toBe('tape')
      // Bare paper between them is no thing.
      expect(thingAt(layout, { x: w / 2, y: 4 }, 0, 0)).toBe(null)
    }
  })

  it('count a kept drawing and a margin sketch only where the page shows one', () => {
    const layout = layoutOf(1180, 820), mid = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
    expect(thingAt(layout, mid(layout.kept[0]), 0, 0)).toBe(null)
    expect(thingAt(layout, mid(layout.kept[0]), 1, 0)).toBe('kept0')
    expect(thingAt(layout, mid(layout.kept[2]), 2, 0)).toBe(null)
    expect(thingAt(layout, mid(layout.kept[2]), 3, 0)).toBe('kept2')
    expect(thingAt(layout, mid(layout.sketches[3]), 4, 3)).toBe(null)
    expect(thingAt(layout, mid(layout.sketches[3]), 4, 4)).toBe('sketch3')
  })

  it('lie on bare paper: none is in a place of the page that answers a touch in another way, nor in the grown-up corner', () => {
    for (const [w, h] of SIZES.slice(0, 2)) {
      const layout = layoutOf(w, h), state = freshLab(null, 7)
      const touchable = placesOf(layout).filter((place) => !place.name.startsWith('kept') && !place.name.startsWith('sketch'))
      const inside = (point: { x: number; y: number }, r: { x: number; y: number; w: number; h: number }) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h
      const points = [...pointsOf(leafAt(layout), PRESSED.leaf), ...pointsOf(frondAt(layout), PRESSED.frond)]
      for (const point of points) {
        for (const place of touchable) expect(inside(point, place.rect), `${place.name} at ${w}`).toBe(false)
        // The toy and the game find paper there, so the thing is what a finger gets.
        expect(gameTargetAt(state, layout, point, () => true).kind, `at ${w}`).toBe('paper')
        expect(point.x > layout.w - CORNER && point.y < CORNER, `grown-up corner at ${w}`).toBe(false)
      }
    }
  })
})
