// template: cartridge/input.test.ts v2
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

describe('a press the browser takes away', () => {
  it('ends without a tap, and the next finger starts fresh', () => {
    const touch = new ForgivingTouch()
    const p = { x: 10, y: 10 }, q = { x: 200, y: 40 }
    touch.down(1, p, 0)
    expect(touch.cancel(1, 50)).toEqual([{ type: 'pressEnd', at: p }])
    expect(touch.active).toBe(false)
    expect(touch.down(2, q, 100)).toEqual([{ type: 'press', at: q }])
    // The lift of the finger that was taken away arrives late and means nothing.
    expect(touch.up(1, p, 200)).toEqual([])
    expect(touch.up(2, q, 300)).toEqual([{ type: 'tap', at: q }])
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

  it('ends when the finger comes back to the same place too late, and that touch starts fresh', () => {
    const near = { x: 62, y: 0 }
    const { touch } = dragging()
    touch.up(1, { x: 60, y: 0 }, 100)
    expect(types(touch.down(2, near, 100 + LIFT_GRACE_MS))).toEqual(['dragMove'])
    const late = dragging().touch
    late.up(1, { x: 60, y: 0 }, 100)
    // No frame ran in between, so the touch-down itself finds the grace run out.
    expect(late.down(2, near, 100 + LIFT_GRACE_MS + 1)).toEqual([{ type: 'dragEnd', from: { x: 0, y: 0 }, at: { x: 60, y: 0 } }, { type: 'press', at: near }])
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

  it('ends a press without a tap', () => {
    const touch = new ForgivingTouch()
    touch.down(1, { x: 0, y: 0 }, 0)
    touch.move(1, { x: 3, y: 4 })
    expect(touch.clear()).toEqual([{ type: 'pressEnd', at: { x: 3, y: 4 } }])
    expect(touch.active).toBe(false)
    expect(touch.up(1, { x: 3, y: 4 }, 100)).toEqual([])
  })

  it('has nothing to end when no finger is working', () => {
    const touch = new ForgivingTouch()
    expect(touch.clear()).toEqual([])
    touch.down(1, { x: 0, y: 0 }, 0)
    touch.up(1, { x: 0, y: 0 }, 50)
    expect(touch.clear()).toEqual([])
  })
})

describe('every press', () => {
  it('is followed by exactly one of tap, dragStart or pressEnd, however the touch ends', () => {
    const p = { x: 0, y: 0 }, far = { x: 60, y: 0 }
    const endings = (run: (touch: ForgivingTouch) => Gesture[][]): string[] => {
      const touch = new ForgivingTouch()
      return [touch.down(1, p, 0), ...run(touch)].flatMap(types).filter((type) => type === 'press' || type === 'tap' || type === 'dragStart' || type === 'pressEnd')
    }
    expect(endings((touch) => [touch.up(1, p, 50), touch.clear()])).toEqual(['press', 'tap'])
    expect(endings((touch) => [touch.move(1, far), touch.up(1, far, 50), touch.advance(50 + LIFT_GRACE_MS + 1), touch.clear()])).toEqual(['press', 'dragStart'])
    expect(endings((touch) => [touch.move(1, far), touch.cancel(1, 50), touch.clear()])).toEqual(['press', 'dragStart'])
    expect(endings((touch) => [touch.move(1, far), touch.clear()])).toEqual(['press', 'dragStart'])
    expect(endings((touch) => [touch.cancel(1, 50), touch.clear()])).toEqual(['press', 'pressEnd'])
    expect(endings((touch) => [touch.clear(), touch.up(1, p, 50)])).toEqual(['press', 'pressEnd'])
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

  it('tells a finger that let go from a pointer the browser took away: only the first is the child\'s own drop', () => {
    const lifted = new ForgivingTouch()
    lifted.down(1, { x: 100, y: 100 }, 0)
    lifted.move(1, { x: 200, y: 100 })
    expect(lifted.lifted).toBe(false)
    lifted.up(1, { x: 200, y: 100 }, 50)
    expect(lifted.lifted).toBe(true)
    const taken = new ForgivingTouch()
    taken.down(1, { x: 100, y: 100 }, 0)
    taken.move(1, { x: 200, y: 100 })
    taken.cancel(1, 50)
    expect(taken.active).toBe(true)
    expect(taken.lifted).toBe(false)
    // The finger comes back within the grace: it carries on, and a lift after that is a lift.
    taken.down(2, { x: 205, y: 100 }, 120)
    taken.up(2, { x: 205, y: 100 }, 200)
    expect(taken.lifted).toBe(true)
  })

  it('ends a drag whose pointer was taken, once the grace is over, as nothing let go: an abort, not an end', () => {
    const touch = new ForgivingTouch()
    touch.down(1, { x: 100, y: 100 }, 0)
    touch.move(1, { x: 200, y: 100 })
    touch.cancel(1, 50)
    expect(touch.advance(50 + LIFT_GRACE_MS)).toEqual([])
    expect(touch.advance(51 + LIFT_GRACE_MS).map((gesture) => gesture.type)).toEqual(['dragAbort'])
    // A real lift ends the drag as a drop.
    const lifted = new ForgivingTouch()
    lifted.down(1, { x: 100, y: 100 }, 0)
    lifted.move(1, { x: 200, y: 100 })
    lifted.up(1, { x: 200, y: 100 }, 50)
    expect(lifted.advance(51 + LIFT_GRACE_MS).map((gesture) => gesture.type)).toEqual(['dragEnd'])
    // A new finger elsewhere while a taken drag waits: the old drag is aborted, and the new press begins.
    const other = new ForgivingTouch()
    other.down(1, { x: 100, y: 100 }, 0)
    other.move(1, { x: 200, y: 100 })
    other.cancel(1, 50)
    expect(other.down(2, { x: 900, y: 600 }, 100).map((gesture) => gesture.type)).toEqual(['dragAbort', 'press'])
  })
})
