import { describe, expect, it } from 'vitest'
import { GestureTracker, TAP_MAX_MS, TAP_SLOP } from './input'

const tracker = () => new GestureTracker<string>((at) => (at.x < 100 ? 'handle' : 'tile'))

describe('gestures', () => {
  it('turns a short still touch into a tap on what was under the finger', () => {
    const input = tracker()
    expect(input.down(1, { x: 50, y: 50 }, 0).map((i) => i.type)).toEqual(['press'])
    expect(input.move(1, { x: 50 + TAP_SLOP - 2, y: 50 }, 50)).toEqual([])
    const [tap] = input.up(1, { x: 60, y: 50 }, 120)
    expect(tap).toMatchObject({ type: 'tap', target: 'handle' })
  })

  it('turns movement past the slop into a drag that keeps its first target', () => {
    const input = tracker()
    input.down(1, { x: 50, y: 50 }, 0)
    const started = input.move(1, { x: 150, y: 50 }, 40)
    expect(started.map((i) => i.type)).toEqual(['dragStart', 'dragMove'])
    expect(started[1]).toMatchObject({ target: 'handle' })
    const [end] = input.up(1, { x: 200, y: 50 }, 80)
    expect(end.type).toBe('dragEnd')
    if (end.type === 'dragEnd') expect(end.velocity.x).toBeGreaterThan(0)
  })

  it('does not call a long press a tap', () => {
    const input = tracker()
    input.down(1, { x: 150, y: 50 }, 0)
    expect(input.up(1, { x: 150, y: 50 }, TAP_MAX_MS + 50).map((i) => i.type)).toEqual(['cancel'])
  })

  it('cancels everything when a fourth finger lands, until the hand lifts', () => {
    const input = tracker()
    input.down(1, { x: 10, y: 10 }, 0)
    input.down(2, { x: 150, y: 10 }, 0)
    input.down(3, { x: 150, y: 90 }, 0)
    const cancelled = input.down(4, { x: 20, y: 90 }, 10)
    expect(cancelled.map((i) => i.type)).toEqual(['cancel', 'cancel', 'cancel'])
    expect(input.move(1, { x: 300, y: 10 }, 20)).toEqual([])
    expect(input.up(2, { x: 150, y: 10 }, 30)).toEqual([])
    expect(input.down(5, { x: 10, y: 10 }, 40)).toEqual([])
    for (const id of [1, 3, 4, 5]) input.up(id, { x: 0, y: 0 }, 50)
    expect(input.down(6, { x: 10, y: 10 }, 60).map((i) => i.type)).toEqual(['press'])
  })

  it('reports a lost pointer as a cancel so a drag can settle', () => {
    const input = tracker()
    input.down(7, { x: 10, y: 10 }, 0)
    input.move(7, { x: 80, y: 10 }, 20)
    expect(input.lost(7)).toEqual([{ type: 'cancel', pointerId: 7, target: 'handle' }])
    expect(input.fingers).toBe(0)
  })
})
