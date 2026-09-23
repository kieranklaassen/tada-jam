import { describe, expect, it } from 'vitest'
import { GestureTracker, MAX_FINGERS, TAP_MAX_MS, TAP_SLOP, type Point, type Target } from './input'

/** Shapes live left of x = 100; everything else is backdrop. */
function tracker(): GestureTracker {
  return new GestureTracker((at: Point): Target => (at.x < 100 ? { kind: 'shape', index: Math.floor(at.y / 100) } : { kind: 'backdrop' }))
}

describe('input', () => {
  it('a quick touch on a shape presses then taps', () => {
    const g = tracker()
    expect(g.down(1, { x: 10, y: 10 }, 0).map((i) => i.type)).toEqual(['press'])
    expect(g.up(1, { x: 12, y: 11 }, 120).map((i) => i.type)).toEqual(['tap'])
  })

  it('moving past the slop turns the touch into a drag that starts where the finger landed', () => {
    const g = tracker()
    g.down(1, { x: 10, y: 10 }, 0)
    expect(g.move(1, { x: 10 + TAP_SLOP / 2, y: 10 })).toEqual([])
    const intents = g.move(1, { x: 10 + TAP_SLOP + 1, y: 10 })
    expect(intents.map((i) => i.type)).toEqual(['dragStart', 'dragMove'])
    expect(intents[0]).toMatchObject({ at: { x: 10, y: 10 } })
    expect(g.up(1, { x: 40, y: 10 }, 100).map((i) => i.type)).toEqual(['dragEnd'])
  })

  it('a long still press is not a tap', () => {
    const g = tracker()
    g.down(1, { x: 10, y: 10 }, 0)
    expect(g.up(1, { x: 10, y: 10 }, TAP_MAX_MS + 1)).toEqual([])
  })

  it('a second finger off the shapes twists the held shape, and lifting neither finger taps', () => {
    const g = tracker()
    g.down(1, { x: 50, y: 150 }, 0)
    expect(g.down(2, { x: 150, y: 150 }, 10)).toEqual([])
    const twist = g.move(2, { x: 50 + 100 * Math.cos(0.3), y: 150 + 100 * Math.sin(0.3) })
    expect(twist).toHaveLength(1)
    expect(twist[0]).toMatchObject({ type: 'twist', index: 1 })
    expect((twist[0] as { delta: number }).delta).toBeCloseTo(0.3, 6)
    expect(g.up(2, { x: 0, y: 0 }, 50)).toEqual([])
    expect(g.up(1, { x: 50, y: 150 }, 60)).toEqual([])
  })

  it('a fourth finger is a resting hand: everything cancels and nothing fires until the whole hand lifts', () => {
    const g = tracker()
    for (let id = 1; id <= MAX_FINGERS; id++) g.down(id, { x: 10, y: id * 100 + 10 }, id)
    const cancel = g.down(9, { x: 200, y: 10 }, 5)
    expect(cancel).toEqual([{ type: 'cancelAll', pointerIds: [1, 2, 3] }])
    expect(g.move(1, { x: 90, y: 110 })).toEqual([])
    expect(g.up(1, { x: 90, y: 110 }, 20)).toEqual([])
    expect(g.down(7, { x: 10, y: 10 }, 21)).toEqual([])
    for (const id of [2, 3, 9, 7]) expect(g.up(id, { x: 0, y: 0 }, 30)).toEqual([])
    expect(g.down(1, { x: 10, y: 10 }, 40).map((i) => i.type)).toEqual(['press'])
  })

  it('a cancelled drag still ends, and reset forgets every finger', () => {
    const g = tracker()
    g.down(1, { x: 10, y: 10 }, 0)
    g.move(1, { x: 60, y: 10 })
    expect(g.cancel(1).map((i) => i.type)).toEqual(['dragEnd'])
    g.down(2, { x: 10, y: 10 }, 0)
    g.reset()
    expect(g.activeCount).toBe(0)
    expect(g.up(2, { x: 10, y: 10 }, 10)).toEqual([])
  })
})
