import { describe, expect, it } from 'vitest'
import { GestureTracker } from './input'

type Target = { kind: 'part'; id: number } | { kind: 'nose' } | { kind: 'bench' }

const hitTest = (at: { x: number; y: number }): Target => {
  if (at.x < 100) return { kind: 'nose' }
  if (at.x < 500) return { kind: 'part', id: at.x < 300 ? 1 : 2 }
  return { kind: 'bench' }
}
const dragsAtOnce = (target: Target) => target.kind === 'part'

const types = (intents: { type: string }[]) => intents.map((i) => i.type)

describe('GestureTracker', () => {
  it('turns a still press into a tap', () => {
    const tracker = new GestureTracker(hitTest)
    expect(types(tracker.down(1, { x: 50, y: 200 }, 0))).toEqual(['press'])
    expect(tracker.up(1, { x: 53, y: 201 }, 120)).toEqual([{ type: 'tap', pointerId: 1, target: { kind: 'nose' } }])
  })

  it('turns a moving press into a drag that ends with its recent velocity', () => {
    const tracker = new GestureTracker(hitTest)
    tracker.down(1, { x: 600, y: 200 }, 0)
    expect(types(tracker.move(1, { x: 640, y: 200 }, 16))).toEqual(['dragStart', 'dragMove'])
    tracker.move(1, { x: 680, y: 200 }, 32)
    tracker.move(1, { x: 720, y: 200 }, 48)
    const [end] = tracker.up(1, { x: 760, y: 200 }, 64)
    if (end.type !== 'dragEnd') throw new Error('expected dragEnd')
    expect(end.velocity.x).toBeGreaterThan(1500)
    expect(end.velocity.y).toBe(0)
  })

  it('picks a part up the instant it is pressed', () => {
    const tracker = new GestureTracker(hitTest, dragsAtOnce)
    expect(types(tracker.down(1, { x: 200, y: 500 }, 0))).toEqual(['press', 'dragStart'])
    expect(types(tracker.move(1, { x: 204, y: 500 }, 16))).toEqual(['dragMove'])
    expect(types(tracker.up(1, { x: 204, y: 500 }, 40))).toEqual(['dragEnd'])
  })

  it('a fourth finger cancels everything and nothing fires until the hand lifts', () => {
    const tracker = new GestureTracker(hitTest, dragsAtOnce)
    tracker.down(1, { x: 200, y: 200 }, 0)
    tracker.down(2, { x: 350, y: 200 }, 20)
    tracker.down(3, { x: 800, y: 200 }, 25)
    expect(tracker.down(4, { x: 820, y: 220 }, 30)).toEqual([{ type: 'cancelAll', pointerIds: [1, 2, 3] }])
    expect(tracker.handResting).toBe(true)
    expect(tracker.down(5, { x: 840, y: 240 }, 35)).toEqual([])
    expect(tracker.move(1, { x: 300, y: 200 }, 40)).toEqual([])
    for (const id of [1, 2, 3, 4]) expect(tracker.up(id, { x: 0, y: 0 }, 50)).toEqual([])
    expect(tracker.handResting).toBe(true)
    expect(tracker.up(5, { x: 0, y: 0 }, 60)).toEqual([])
    expect(tracker.handResting).toBe(false)
    expect(types(tracker.down(6, { x: 50, y: 200 }, 100))).toEqual(['press'])
  })

  it('lets two fingers carry two parts independently', () => {
    const tracker = new GestureTracker(hitTest, dragsAtOnce)
    tracker.down(1, { x: 200, y: 200 }, 0)
    tracker.down(2, { x: 400, y: 200 }, 0)
    expect(tracker.move(1, { x: 230, y: 230 }, 16)[0]).toMatchObject({ target: { kind: 'part', id: 1 } })
    expect(tracker.move(2, { x: 430, y: 230 }, 16)[0]).toMatchObject({ target: { kind: 'part', id: 2 } })
  })

  it('a cancelled finger ends its drag where it last was', () => {
    const tracker = new GestureTracker(hitTest, dragsAtOnce)
    tracker.down(1, { x: 200, y: 200 }, 0)
    tracker.move(1, { x: 260, y: 220 }, 16)
    expect(tracker.cancel(1)).toEqual([{ type: 'dragEnd', pointerId: 1, target: { kind: 'part', id: 1 }, at: { x: 260, y: 220 }, velocity: { x: 0, y: 0 } }])
  })

  it('reset forgets stale fingers so the next touch is not a fourth finger', () => {
    const tracker = new GestureTracker(hitTest)
    tracker.down(1, { x: 200, y: 200 }, 0)
    tracker.down(2, { x: 350, y: 200 }, 0)
    tracker.down(3, { x: 800, y: 200 }, 0)
    tracker.reset()
    expect(tracker.activeCount).toBe(0)
    expect(types(tracker.down(4, { x: 50, y: 200 }, 10))).toEqual(['press'])
  })

  it('ignores a long still press', () => {
    const tracker = new GestureTracker(hitTest)
    tracker.down(1, { x: 50, y: 200 }, 0)
    expect(tracker.up(1, { x: 50, y: 200 }, 900)).toEqual([])
  })
})
