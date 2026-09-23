import { describe, expect, it } from 'vitest'
import { Gestures, TAP_MAX_MS } from './input'

const at = (x: number, y: number) => ({ x, y })

describe('Gestures', () => {
  it('a still finger that lifts soon is a tap', () => {
    const g = new Gestures()
    expect(g.down(1, at(10, 10), 0)[0].type).toBe('press')
    expect(g.move(1, at(14, 12))).toEqual([])
    expect(g.up(1, at(14, 12), 120)).toEqual([{ type: 'tap', id: 1, at: at(14, 12) }])
  })

  it('a long still press is not a tap', () => {
    const g = new Gestures()
    g.down(1, at(0, 0), 0)
    expect(g.up(1, at(0, 0), TAP_MAX_MS + 50)).toEqual([])
  })

  it('a travelling finger is a drag from where it started', () => {
    const g = new Gestures()
    g.down(1, at(0, 0), 0)
    expect(g.move(1, at(30, 0))).toEqual([{ type: 'dragStart', id: 1, from: at(0, 0), at: at(30, 0) }])
    expect(g.move(1, at(60, 5))[0].type).toBe('dragMove')
    expect(g.up(1, at(60, 5), 400)).toEqual([{ type: 'dragEnd', id: 1, at: at(60, 5) }])
  })

  it('a fourth finger is a resting hand: everything cancels until the whole hand lifts', () => {
    const g = new Gestures()
    g.down(1, at(0, 0), 0)
    g.down(2, at(50, 0), 0)
    g.down(3, at(100, 0), 0)
    expect(g.down(4, at(150, 0), 0)).toEqual([{ type: 'cancel', ids: [1, 2, 3] }])
    expect(g.down(5, at(200, 0), 0)).toEqual([])
    expect(g.move(1, at(90, 90))).toEqual([])
    for (const id of [1, 2, 3, 4]) expect(g.up(id, at(0, 0), 10)).toEqual([])
    expect(g.up(5, at(0, 0), 10)).toEqual([])
    g.down(6, at(0, 0), 20)
    expect(g.up(6, at(0, 0), 60)[0].type).toBe('tap')
  })

  it('a cancelled drag still ends where it was', () => {
    const g = new Gestures()
    g.down(1, at(0, 0), 0)
    g.move(1, at(40, 40))
    expect(g.cancel(1)).toEqual([{ type: 'dragEnd', id: 1, at: at(40, 40) }])
  })
})
