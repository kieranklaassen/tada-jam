import { describe, expect, it } from 'vitest'
import { BELL, HOME, PANE, PANES, PENDULUM, place, reach, targetAt, toPoint, toSpot, type Target } from './layout'
import { STAGE, fit, type Point } from './stage'

const key = (t: Target) => JSON.stringify(t)
/** How far each way from a point a finger is still on the same target. */
function room(at: Point): { width: number; height: number } {
  const mine = key(targetAt(at, true))
  const go = (dx: number, dy: number) => {
    let n = 0
    while (n < 200 && key(targetAt({ x: at.x + dx * n, y: at.y + dy * n }, true)) === mine) n += 1
    return n
  }
  return { width: go(1, 0) + go(-1, 0), height: go(0, 1) + go(0, -1) }
}

describe('what a finger lands on', () => {
  it('gives every small target at least 100 units', () => {
    const all = [0, 1, 2, 3].map(place).concat(BELL, PENDULUM.bob, PANES[0], PANES[1])
    for (const at of all) {
      const { width, height } = room({ x: at.x, y: Math.min(at.y, 664) })
      expect(width, key(targetAt(at, true))).toBeGreaterThanOrEqual(100)
      expect(height, key(targetAt(at, true))).toBeGreaterThanOrEqual(90)
    }
  })
  it('keeps 48 real pixels on an iPad mini held sideways and on a phone held sideways', () => {
    expect(fit(1024, 768).scale * 100).toBeGreaterThan(48)
    expect(fit(844, 390).scale * 100).toBeGreaterThan(46)
  })
  it('answers everywhere, and as a hand wherever there is nothing else', () => {
    for (let x = 4; x < STAGE.width; x += 12) for (let y = 4; y < STAGE.height; y += 12) expect(targetAt({ x, y }, false)).toBeTruthy()
    expect(targetAt(toPoint(0, HOME), true).kind).toBe('hand')
  })
  it('keeps the home control and the bottom edge free of anything essential', () => {
    for (let x = 540; x <= 640; x += 10) for (let y = 0; y < 62; y += 10) expect(targetAt({ x, y }, true).kind).toBe('hand')
    for (const at of [0, 1, 2, 3].map(place).concat(BELL)) expect(at.y).toBeLessThan(STAGE.height - 60)
    expect(PANES[0].y - PANE.height / 2).toBeGreaterThan(62)
  })
  it('keeps every hand on its own half and off the edges', () => {
    for (const side of [0, 1] as const) for (const at of [{ x: -50, y: -50 }, { x: 1300, y: 900 }, { x: 590, y: 400 }]) {
      const p = toPoint(side, reach(toSpot(side, at)))
      expect(side === 0 ? p.x < STAGE.width / 2 : p.x > STAGE.width / 2).toBe(true)
      expect(p.x > 20 && p.x < STAGE.width - 20 && p.y > 60 && p.y < 700).toBe(true)
    }
  })
})
