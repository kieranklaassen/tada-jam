import { describe, expect, it } from 'vitest'
import { GestureTracker, MAX_FINGERS, TAP_SLOP } from './input'

const at = (x: number, y = 0) => ({ x, y })

describe('GestureTracker', () => {
  it('a short still touch is a tap; a moved one is a drag', () => {
    const g = new GestureTracker()
    expect(g.down(1, at(0), 0)).toEqual([{ type: 'press', pointerId: 1 }])
    expect(g.up(1, 100)).toEqual([{ type: 'tap', pointerId: 1 }])
    g.down(2, at(0), 0)
    expect(g.move(2, at(TAP_SLOP + 1))).toEqual([{ type: 'dragStart', pointerId: 2 }])
    expect(g.move(2, at(TAP_SLOP + 20))).toEqual([])
    expect(g.up(2, 100)).toEqual([{ type: 'dragEnd', pointerId: 2 }])
  })

  it('a long still press ends as a drag, not a tap', () => {
    const g = new GestureTracker()
    g.down(1, at(0), 0)
    expect(g.up(1, 2000)).toEqual([{ type: 'dragEnd', pointerId: 1 }])
  })

  it('a fourth finger is a resting hand: cancel all, ignore until every finger lifts', () => {
    const g = new GestureTracker()
    for (let i = 1; i <= MAX_FINGERS; i++) g.down(i, at(i * 50), 0)
    expect(g.down(4, at(300), 0)).toEqual([{ type: 'cancelAll', pointerIds: [1, 2, 3] }])
    expect(g.move(1, at(400))).toEqual([])
    expect(g.up(1, 10)).toEqual([])
    expect(g.down(5, at(0), 20)).toEqual([])
    for (const id of [2, 3, 4, 5]) g.up(id, 30)
    expect(g.down(6, at(0), 40)).toEqual([{ type: 'press', pointerId: 6 }])
  })

  it('cancel ends a gesture as a drop', () => {
    const g = new GestureTracker()
    g.down(1, at(0), 0)
    expect(g.cancel(1)).toEqual([{ type: 'dragEnd', pointerId: 1 }])
    expect(g.cancel(1)).toEqual([])
  })
})
