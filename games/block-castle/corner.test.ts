import { describe, expect, it } from 'vitest'
import { ChildsTouch } from './corner'
import type { Gesture, Point } from './input'
import { CORNER } from './overlay'

const WIDTH = 1180
const corner: Point = { x: WIDTH - CORNER / 2, y: CORNER / 2 }
const rug: Point = { x: 500, y: 500 }
const taken = (touch: ChildsTouch, gestures: Gesture[]): string[] => gestures.filter((gesture) => touch.takes(gesture, WIDTH)).map((gesture) => gesture.type)

describe('a touch that lands in the grown-up corner', () => {
  it('sends the game nothing: not its press, its tap or its lift', () => {
    const touch = new ChildsTouch()
    expect(taken(touch, [{ type: 'press', at: corner }, { type: 'tap', at: corner }])).toEqual([])
    expect(taken(touch, [{ type: 'press', at: corner }, { type: 'pressEnd', at: corner }])).toEqual([])
  })

  it('sends nothing of a drag that begins there, however far it goes over the rug', () => {
    for (const end of ['dragEnd', 'dragCancel'] as const) {
      const touch = new ChildsTouch()
      expect(taken(touch, [
        { type: 'press', at: corner },
        { type: 'dragStart', from: corner },
        { type: 'dragMove', from: corner, at: rug },
        { type: 'dragLift', from: corner, at: rug },
        { type: 'dragMove', from: corner, at: rug },
        { type: end, from: corner, at: rug },
      ])).toEqual([])
    }
  })

  it('leaves the next touch the child\'s, and a drag that ends in the corner the child\'s too', () => {
    const touch = new ChildsTouch()
    taken(touch, [{ type: 'press', at: corner }, { type: 'dragStart', from: corner }, { type: 'dragEnd', from: corner, at: rug }])
    expect(taken(touch, [{ type: 'press', at: rug }, { type: 'tap', at: rug }])).toEqual(['press', 'tap'])
    expect(taken(touch, [
      { type: 'press', at: rug },
      { type: 'dragStart', from: rug },
      { type: 'dragMove', from: rug, at: corner },
      { type: 'dragEnd', from: rug, at: corner },
    ])).toEqual(['press', 'dragStart', 'dragMove', 'dragEnd'])
    // Just outside the corner is the child's.
    expect(taken(touch, [{ type: 'press', at: { x: WIDTH - CORNER - 1, y: 10 } }, { type: 'tap', at: { x: WIDTH - CORNER - 1, y: 10 } }])).toEqual(['press', 'tap'])
    expect(taken(touch, [{ type: 'press', at: { x: WIDTH - 10, y: CORNER + 1 } }, { type: 'tap', at: { x: WIDTH - 10, y: CORNER + 1 } }])).toEqual(['press', 'tap'])
  })
})
