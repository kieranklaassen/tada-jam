import { describe, expect, it } from 'vitest'
import { GestureTracker, MAX_FINGERS, TAP_MAX_MS, TAP_SLOP_PX, type Target } from './input'

const body: Target = { kind: 'body', piece: 'lampA' }
const at = { x: 0, y: 0 }

describe('gesture tracker', () => {
  it('a short press that stays put is a tap', () => {
    const tracker = new GestureTracker(() => body)
    expect(tracker.down(1, { x: 100, y: 100 }, at, 0)).toEqual([{ type: 'press', pointerId: 1, target: body, at }])
    expect(tracker.move(1, { x: 100 + TAP_SLOP_PX - 1, y: 100 }, at)).toEqual([])
    expect(tracker.up(1, at, 100).map((i) => i.type)).toEqual(['tap'])
  })

  it('moving past the slop starts a drag that ends on lift', () => {
    const tracker = new GestureTracker(() => body)
    tracker.down(1, { x: 100, y: 100 }, at, 0)
    expect(tracker.move(1, { x: 100 + TAP_SLOP_PX + 2, y: 100 }, at).map((i) => i.type)).toEqual(['dragStart', 'dragMove'])
    expect(tracker.move(1, { x: 150, y: 100 }, at).map((i) => i.type)).toEqual(['dragMove'])
    expect(tracker.up(1, at, 900).map((i) => i.type)).toEqual(['dragEnd'])
  })

  it('a long still press is not a tap', () => {
    const tracker = new GestureTracker(() => body)
    tracker.down(1, { x: 100, y: 100 }, at, 0)
    expect(tracker.up(1, at, TAP_MAX_MS + 50).map((i) => i.type)).toEqual(['dragEnd'])
  })

  it('a fourth finger is a resting hand: everything cancels until all fingers lift', () => {
    const tracker = new GestureTracker(() => body)
    for (let i = 1; i <= MAX_FINGERS; i++) tracker.down(i, { x: i * 10, y: 0 }, at, 0)
    const cancel = tracker.down(4, { x: 90, y: 0 }, at, 0)
    expect(cancel).toEqual([{ type: 'cancelAll', pointerIds: [1, 2, 3] }])
    expect(tracker.move(1, { x: 300, y: 0 }, at)).toEqual([])
    expect(tracker.up(1, at, 10)).toEqual([])
    expect(tracker.down(5, { x: 0, y: 0 }, at, 20)).toEqual([])
    for (const id of [2, 3, 4, 5]) tracker.up(id, at, 30)
    expect(tracker.down(6, { x: 0, y: 0 }, at, 40).map((i) => i.type)).toEqual(['press'])
  })

  it('a cancelled pointer ends its gesture where it last was', () => {
    const tracker = new GestureTracker(() => body)
    tracker.down(1, { x: 0, y: 0 }, at, 0)
    tracker.move(1, { x: 50, y: 0 }, { x: 5, y: 0 })
    expect(tracker.cancel(1)).toEqual([{ type: 'dragEnd', pointerId: 1, target: body, at: { x: 5, y: 0 } }])
  })

  it('reset forgets every finger', () => {
    const tracker = new GestureTracker(() => body)
    tracker.down(1, { x: 0, y: 0 }, at, 0)
    tracker.reset()
    expect(tracker.activeCount).toBe(0)
    expect(tracker.up(1, at, 10)).toEqual([])
  })
})
