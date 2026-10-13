import { describe, expect, it } from 'vitest'
import { lanePixels } from './camera'
import { Steer, reachFor, type Command } from './steer'

const REACH = { slide: 40, flick: 36 }

/** Moves the finger through points given as [x, y, ms] and returns everything it told the fox. */
function trace(points: readonly (readonly [number, number, number])[]): Command[] {
  const steer = new Steer(), told: Command[] = []
  const [x, y, t] = points[0]
  steer.press(x, y, t)
  for (const [px, py, pt] of points.slice(1)) told.push(...steer.move(px, py, pt, REACH))
  return told
}

describe('the finger, read', () => {
  it('tells the fox nothing while the finger rests or trembles', () => {
    expect(trace([[500, 500, 0], [503, 498, 16], [498, 503, 32], [500, 500, 400]])).toEqual([])
  })

  it('counts one lane for each slide length, so a long slide crosses the trail', () => {
    expect(trace([[500, 500, 0], [545, 500, 50]])).toEqual(['right'])
    expect(trace([[500, 500, 0], [585, 500, 50]])).toEqual(['right', 'right'])
    expect(trace([[500, 500, 0], [455, 500, 50], [410, 500, 100]])).toEqual(['left', 'left'])
  })

  it('counts a slide from where the last one counted, so there and back is one lane each way', () => {
    expect(trace([[500, 500, 0], [545, 500, 50], [495, 500, 100]])).toEqual(['right', 'left'])
  })

  it('reads a slide only from a quick move: a finger that drifts under a long hold changes no lane, at all three sizes', () => {
    for (const [w, h] of [[1180, 820], [1024, 768], [820, 1180]] as const) {
      const reach = reachFor(w, h, lanePixels(w, h, 400))
      /** The finger goes `far` slide lengths to the right in `seconds`, a move every 16 ms. */
      const slide = (far: number, seconds: number): Command[] => {
        const steer = new Steer(), told: Command[] = []
        steer.press(400, 500, 0)
        for (let ms = 16; ms <= seconds * 1000; ms += 16) told.push(...steer.move(400 + (far * reach.slide * ms) / (seconds * 1000), 500 + Math.sin(ms / 300) * 3, ms, reach))
        return told
      }
      // A drift: the hand that holds the fox running wanders a lane's worth and more across the glass.
      expect(slide(1.5, 2), `${w}x${h}`).toEqual([])
      expect(slide(3, 6), `${w}x${h}`).toEqual([])
      expect(slide(-2, 5), `${w}x${h}`).toEqual([])
      // A slide: the same way and further in a sixth of a second is one lane, and a slide that goes on is more.
      expect(slide(1.5, 0.16), `${w}x${h}`).toEqual(['right'])
      expect(slide(-1.5, 0.16), `${w}x${h}`).toEqual(['left'])
      const long = slide(4, 0.4)
      expect(long.length, `${w}x${h}`).toBeGreaterThanOrEqual(2)
      expect(new Set(long), `${w}x${h}`).toEqual(new Set(['right']))
    }
  })

  it('jumps on a quick flick up and tucks on a quick flick down', () => {
    expect(trace([[500, 500, 0], [500, 480, 16], [500, 450, 32]])).toEqual(['jump'])
    expect(trace([[500, 500, 0], [500, 520, 16], [500, 550, 32]])).toEqual(['tuck'])
  })

  it('does not jump for a hand that drifts up the glass slowly', () => {
    const points: [number, number, number][] = [[500, 500, 0]]
    for (let i = 1; i <= 60; i++) points.push([500, 500 - i * 2, i * 50])
    expect(trace(points)).toEqual([])
  })

  it('reads one flick once, and a second flick after it', () => {
    expect(trace([[500, 500, 0], [500, 450, 20], [500, 448, 40], [500, 447, 300]])).toEqual(['jump'])
    expect(trace([[500, 500, 0], [500, 450, 20], [500, 450, 400], [500, 400, 420]])).toEqual(['jump', 'jump'])
  })

  it('makes its lengths from the surface, within what a small hand can do', () => {
    for (const [w, h, lane] of [[1180, 820, 150], [820, 1180, 100], [390, 700, 60], [2000, 1400, 320]] as const) {
      const reach = reachFor(w, h, lane)
      expect(reach.slide).toBeGreaterThanOrEqual(28)
      expect(reach.slide).toBeLessThanOrEqual(72)
      expect(reach.flick).toBeGreaterThanOrEqual(28)
      expect(reach.flick).toBeLessThan(Math.min(w, h) * 0.1)
    }
  })
})
