import { describe, expect, it } from 'vitest'
import { ForgivingTouch, LIFT_GRACE_MS, REGRAB_RADIUS, type Gesture } from './input'
import { freshLab } from './lab'
import { letGo } from './lift'
import { rig } from './rig'

const types = (gestures: Gesture[]) => gestures.map((gesture) => gesture.type)

describe('a finger let go', () => {
  it('ends its drag at the lift: nothing of the drop waits', () => {
    const touch = new ForgivingTouch()
    touch.down(1, { x: 0, y: 0 }, 0)
    touch.move(1, { x: 60, y: 0 })
    expect(types(letGo(touch, 1, { x: 60, y: 0 }, 500))).toEqual(['dragLift', 'dragEnd'])
    expect(touch.lifted).toBe(false)
    expect(touch.advance(500 + LIFT_GRACE_MS + 1)).toEqual([])
  })

  it('leaves the touch after it a touch of its own, however soon and however near', () => {
    const touch = new ForgivingTouch()
    touch.down(1, { x: 0, y: 0 }, 0)
    touch.move(1, { x: 60, y: 0 })
    letGo(touch, 1, { x: 60, y: 0 }, 500)
    expect(types(touch.down(2, { x: 80, y: 0 }, 510))).toEqual(['press'])
    expect(types(letGo(touch, 2, { x: 80, y: 0 }, 560))).toEqual(['tap'])
  })

  it('a dab onto the flower next door and a tap on the first flower a blink later: the pod sets where the dust was let go, and the tap is a poke', () => {
    const t = rig(freshLab(null, 7))
    const touch = new ForgivingTouch()
    const feed = (gestures: Gesture[]) => { for (const gesture of gestures) t.made.gesture(gesture) }
    const left = t.where.flower(1), right = t.where.flower(2)
    // The two stand nearer than the template's regrab reach: this is the case that went wrong.
    expect(Math.hypot(right.x - left.x, right.y - left.y)).toBeLessThan(REGRAB_RADIUS)
    feed(touch.down(1, left, 0))
    feed(touch.move(1, { x: (left.x + right.x) / 2, y: left.y }))
    feed(touch.move(1, right))
    feed(letGo(touch, 1, right, 400))
    expect(t.made.state.pods.map((pod) => pod.on)).toEqual([2])
    feed(touch.down(2, left, 480))
    feed(letGo(touch, 2, left, 540))
    expect(t.made.state.pods.map((pod) => pod.on)).toEqual([2])
  })
})
