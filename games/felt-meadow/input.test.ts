import { describe, expect, it } from 'vitest'
import { GestureTracker, MAX_FINGERS, TAP_MAX_MS, TAP_SLOP_PX, type GestureHandler, type Target } from './input'

function record() {
  const calls: string[] = []
  const handler: GestureHandler = {
    press: (id, target) => calls.push(`press ${id} ${target.kind}`),
    tap: (id, target) => calls.push(`tap ${id} ${target.kind}`),
    dragStart: (id, target) => calls.push(`dragStart ${id} ${target.kind}`),
    dragEnd: (id, target) => calls.push(`dragEnd ${id} ${target.kind}`),
    cancel: (id, target) => calls.push(`cancel ${id} ${target.kind}`),
  }
  const target: Target = { kind: 'bee' }
  return { calls, tracker: new GestureTracker(handler, () => target) }
}

describe('GestureTracker', () => {
  it('turns a short still touch into press then tap', () => {
    const { calls, tracker } = record()
    tracker.down(1, 100, 100, 0)
    tracker.move(1, 100 + TAP_SLOP_PX - 1, 100)
    tracker.up(1, TAP_MAX_MS - 10)
    expect(calls).toEqual(['press 1 bee', 'tap 1 bee'])
  })

  it('turns a moving touch into press, dragStart, dragEnd', () => {
    const { calls, tracker } = record()
    tracker.down(1, 100, 100, 0)
    tracker.move(1, 100 + TAP_SLOP_PX + 1, 100)
    tracker.move(1, 200, 100)
    tracker.up(1, 100)
    expect(calls).toEqual(['press 1 bee', 'dragStart 1 bee', 'dragEnd 1 bee'])
  })

  it('treats a long still press as a let-go, not a tap', () => {
    const { calls, tracker } = record()
    tracker.down(1, 100, 100, 0)
    tracker.up(1, TAP_MAX_MS + 50)
    expect(calls).toEqual(['press 1 bee', 'dragEnd 1 bee'])
  })

  it('cancels everything when a resting hand lands, and ignores it until every finger lifts', () => {
    const { calls, tracker } = record()
    for (let id = 1; id <= MAX_FINGERS; id++) tracker.down(id, id * 50, 100, 0)
    tracker.down(9, 400, 100, 0)
    expect(calls.filter((call) => call.startsWith('cancel'))).toHaveLength(MAX_FINGERS)
    const before = calls.length
    tracker.move(1, 300, 300)
    for (const id of [1, 2, 3, 9]) tracker.up(id, 50)
    expect(calls).toHaveLength(before)
    tracker.down(4, 10, 10, 100)
    tracker.up(4, 150)
    expect(calls.slice(before)).toEqual(['press 4 bee', 'tap 4 bee'])
  })

  it('cancels open touches on reset, so a put-away mid-drag loses nothing', () => {
    const { calls, tracker } = record()
    tracker.down(1, 100, 100, 0)
    tracker.move(1, 200, 100)
    tracker.reset()
    expect(calls).toEqual(['press 1 bee', 'dragStart 1 bee', 'cancel 1 bee'])
    expect(tracker.active).toBe(0)
  })
})
