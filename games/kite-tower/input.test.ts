import { describe, expect, it } from 'vitest'
import { Gestures, MAX_FINGERS, type Target } from './input'

const piece: Target = { kind: 'piece', id: 2 }

describe('Gestures', () => {
  it('turns a quick lift into a tap', () => {
    const g = new Gestures(() => piece)
    expect(g.down(1, { x: 10, y: 10 }, 0)[0]).toMatchObject({ type: 'press', target: piece })
    expect(g.up(1, { x: 12, y: 11 }, 200)).toEqual([{ type: 'tap', pointer: 1, target: piece, at: { x: 12, y: 11 } }])
  })

  it('does not tap after a long hold', () => {
    const g = new Gestures(() => piece)
    g.down(1, { x: 10, y: 10 }, 0)
    expect(g.up(1, { x: 10, y: 10 }, 900)).toEqual([])
  })

  it('starts a drag past the slop and ends it on lift', () => {
    const g = new Gestures(() => piece)
    g.down(1, { x: 0, y: 0 }, 0)
    expect(g.move(1, { x: 5, y: 0 })).toEqual([])
    const started = g.move(1, { x: 40, y: 0 })
    expect(started.map((i) => i.type)).toEqual(['dragStart', 'dragMove'])
    expect(started[0]).toMatchObject({ at: { x: 0, y: 0 } })
    expect(g.up(1, { x: 60, y: 0 }, 100)[0]).toMatchObject({ type: 'dragEnd', target: piece })
  })

  it('cancels everything on a fourth finger until the whole hand lifts', () => {
    const g = new Gestures(() => piece)
    for (let i = 0; i < MAX_FINGERS; i++) g.down(i, { x: i * 50, y: 0 }, 0)
    g.move(0, { x: 100, y: 100 })
    const cancel = g.down(9, { x: 300, y: 0 }, 0)
    expect(cancel).toEqual([{ type: 'cancelAll', pointers: [0, 1, 2] }])
    expect(g.move(1, { x: 300, y: 300 })).toEqual([])
    expect(g.up(0, { x: 0, y: 0 }, 10)).toEqual([])
    expect(g.down(5, { x: 0, y: 0 }, 20)).toEqual([])
    for (const id of [1, 2, 9, 5]) g.up(id, { x: 0, y: 0 }, 30)
    expect(g.down(7, { x: 0, y: 0 }, 40)[0]).toMatchObject({ type: 'press' })
  })

  it('ends a drag when the pointer is cancelled', () => {
    const g = new Gestures(() => piece)
    g.down(1, { x: 0, y: 0 }, 0)
    g.move(1, { x: 50, y: 0 })
    expect(g.cancel(1)[0]).toMatchObject({ type: 'dragEnd', at: { x: 50, y: 0 } })
  })

  it('forgets every finger on reset', () => {
    const g = new Gestures(() => piece)
    g.down(1, { x: 0, y: 0 }, 0)
    g.reset()
    expect(g.count).toBe(0)
    expect(g.up(1, { x: 0, y: 0 }, 10)).toEqual([])
  })
})
