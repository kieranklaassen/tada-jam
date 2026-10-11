import { describe, expect, it } from 'vitest'
import type { Gesture, Point } from './input'
import { Yard, freshYard } from './model'
import { inCorner } from './overlay'
import { sendGesture } from './touch'
import { LEG, ROWS } from './yard'

const WIDTH = 1180
const same = (point: Point): Point => point
const corner = (point: Point): boolean => inCorner(point.x, point.y, WIDTH)
const floor = { x: 480, y: ROWS[2] - 34 }
const inTheCorner = { x: WIDTH - 20, y: 20 }

function yard(): Yard {
  const save = freshYard()
  save.goose = { leg: LEG.right, along: 0.2 }
  return new Yard(save)
}
const send = (to: Yard, gestures: Gesture[]): void => { for (const gesture of gestures) sendGesture(to, gesture, same, corner) }

describe('a touch and the grown-up corner', () => {
  it('sends a press and a drag in the yard to the yard', () => {
    const y = yard()
    send(y, [{ type: 'press', at: floor }])
    expect(y.target).toEqual({ kind: 'floor', x: 480, row: 2 })
    expect(y.awake).toBe(true)
    send(y, [{ type: 'dragStart', from: floor }, { type: 'dragMove', from: floor, at: { x: 440, y: floor.y } }])
    expect(y.leading).toBe(true)
    send(y, [{ type: 'dragEnd', from: floor, at: { x: 440, y: floor.y } }])
    expect(y.leading).toBe(false)
  })

  it('does nothing in the yard with a touch that begins in the corner, as a tap or as a drag out over the floor', () => {
    const y = yard()
    const before = JSON.stringify(y.toSave())
    send(y, [
      { type: 'press', at: inTheCorner },
      { type: 'dragStart', from: inTheCorner },
      { type: 'dragMove', from: inTheCorner, at: floor },
      { type: 'dragLift', from: inTheCorner, at: floor },
      { type: 'dragEnd', from: inTheCorner, at: floor },
    ])
    expect(y.target).toBeNull()
    expect(y.leading).toBe(false)
    expect(y.awake).toBe(false)
    expect(y.takeCues()).toEqual([])
    expect(JSON.stringify(y.toSave())).toBe(before)
  })
})
