// template: cartridge/input.test.ts v1
import { describe, expect, it } from 'vitest'
import { COUNTS_FROM, ForgivingTouch, LIFT_GRACE_MS, REGRAB_RADIUS, TAP_SLOP, countsAsDone, progressToward, type Gesture } from './input'

const types = (gestures: Gesture[]) => gestures.map((gesture) => gesture.type)

/** One finger down at the origin and dragged to x = 60. */
function dragging(): { touch: ForgivingTouch; seen: Gesture[] } {
  const touch = new ForgivingTouch()
  const seen: Gesture[] = []
  seen.push(...touch.down(1, { x: 0, y: 0 }, 0))
  seen.push(...touch.move(1, { x: 30, y: 0 }))
  seen.push(...touch.move(1, { x: 60, y: 0 }))
  return { touch, seen }
}

describe('a tap', () => {
  it('is a press on the way down and a tap on the lift, however long the finger rests', () => {
    const touch = new ForgivingTouch()
    expect(touch.down(1, { x: 10, y: 10 }, 0)).toEqual([{ type: 'press', at: { x: 10, y: 10 } }])
    expect(touch.move(1, { x: 10 + TAP_SLOP / 2, y: 10 })).toEqual([])
    expect(touch.up(1, { x: 12, y: 10 }, 2000)).toEqual([{ type: 'tap', at: { x: 12, y: 10 } }])
    expect(touch.active).toBe(false)
  })
})

describe('a drag', () => {
  it('starts once the finger leaves the tap slop, from where it went down', () => {
    const { seen } = dragging()
    expect(types(seen)).toEqual(['press', 'dragStart', 'dragMove', 'dragMove'])
    expect(seen[1]).toEqual({ type: 'dragStart', from: { x: 0, y: 0 } })
    expect(seen[3]).toEqual({ type: 'dragMove', from: { x: 0, y: 0 }, at: { x: 60, y: 0 } })
  })

  it('with a 150 ms lift in the middle is one drag', () => {
    const { touch, seen } = dragging()
    seen.push(...touch.up(1, { x: 60, y: 0 }, 100))
    seen.push(...touch.advance(180))
    seen.push(...touch.down(2, { x: 66, y: 4 }, 250))
    seen.push(...touch.move(2, { x: 120, y: 0 }))
    seen.push(...touch.up(2, { x: 120, y: 0 }, 350))
    seen.push(...touch.advance(350 + LIFT_GRACE_MS + 1))
    expect(types(seen)).toEqual(['press', 'dragStart', 'dragMove', 'dragMove', 'dragLift', 'dragMove', 'dragMove', 'dragLift', 'dragEnd'])
    expect(seen.at(-1)).toEqual({ type: 'dragEnd', from: { x: 0, y: 0 }, at: { x: 120, y: 0 } })
    expect(touch.active).toBe(false)
  })

  it('ends where it was let go once the lift outlasts the grace', () => {
    const { touch } = dragging()
    expect(types(touch.up(1, { x: 60, y: 0 }, 100))).toEqual(['dragLift'])
    expect(touch.advance(100 + LIFT_GRACE_MS)).toEqual([])
    expect(touch.advance(100 + LIFT_GRACE_MS + 1)).toEqual([{ type: 'dragEnd', from: { x: 0, y: 0 }, at: { x: 60, y: 0 } }])
  })

  it('ends when the finger comes back somewhere else, and that touch starts fresh', () => {
    const { touch } = dragging()
    touch.up(1, { x: 60, y: 0 }, 100)
    const far = { x: 60 + REGRAB_RADIUS + 1, y: 0 }
    expect(touch.down(2, far, 200)).toEqual([{ type: 'dragEnd', from: { x: 0, y: 0 }, at: { x: 60, y: 0 } }, { type: 'press', at: far }])
  })

  it('is not ended by a second finger or a palm landing, moving or lifting', () => {
    const { touch } = dragging()
    expect(touch.down(2, { x: 300, y: 300 }, 110)).toEqual([])
    expect(touch.move(2, { x: 340, y: 300 })).toEqual([])
    expect(touch.up(2, { x: 340, y: 300 }, 130)).toEqual([])
    expect(touch.down(3, { x: 500, y: 700 }, 140)).toEqual([])
    expect(touch.cancel(3, 150)).toEqual([])
    expect(touch.move(1, { x: 90, y: 0 })).toEqual([{ type: 'dragMove', from: { x: 0, y: 0 }, at: { x: 90, y: 0 } }])
  })

  it('waits out the grace when the browser takes the pointer away, like a lift', () => {
    const { touch } = dragging()
    expect(types(touch.cancel(1, 100))).toEqual(['dragLift'])
    expect(types(touch.down(2, { x: 62, y: 0 }, 200))).toEqual(['dragMove'])
  })
})

describe('a parked surface', () => {
  it('clears every gesture: the thing in hand is put down and no finger is left working', () => {
    const { touch } = dragging()
    touch.down(2, { x: 300, y: 300 }, 110)
    expect(touch.clear()).toEqual([{ type: 'dragEnd', from: { x: 0, y: 0 }, at: { x: 60, y: 0 } }])
    expect(touch.active).toBe(false)
    // The lifts never arrived; when the fingers finally move or lift, nothing happens.
    expect(touch.move(1, { x: 80, y: 0 })).toEqual([])
    expect(touch.up(1, { x: 80, y: 0 }, 5001)).toEqual([])
    expect(touch.up(2, { x: 300, y: 300 }, 5002)).toEqual([])
    expect(touch.advance(9000)).toEqual([])
  })

  it('forgets a press without a tap', () => {
    const touch = new ForgivingTouch()
    touch.down(1, { x: 0, y: 0 }, 0)
    expect(touch.clear()).toEqual([])
    expect(touch.up(1, { x: 0, y: 0 }, 100)).toEqual([])
  })
})

describe('a drag that is partly done', () => {
  const from = { x: 0, y: 0 }
  const target = { x: 200, y: 0 }

  it('is measured along the line to the target, from 0 to 1', () => {
    expect(progressToward(from, { x: 100, y: 0 }, target)).toBeCloseTo(0.5)
    expect(progressToward(from, { x: 100, y: 80 }, target)).toBeCloseTo(0.5)
    expect(progressToward(from, { x: -50, y: 0 }, target)).toBe(0)
    expect(progressToward(from, { x: 400, y: 0 }, target)).toBe(1)
    expect(progressToward(from, from, from)).toBe(1)
  })

  it('counts once it has come far enough, and not before', () => {
    expect(countsAsDone(from, { x: 200 * COUNTS_FROM + 1, y: 20 }, target)).toBe(true)
    expect(countsAsDone(from, { x: 200 * COUNTS_FROM - 1, y: 0 }, target)).toBe(false)
    expect(countsAsDone(from, { x: 0, y: 150 }, target)).toBe(false)
  })
})
