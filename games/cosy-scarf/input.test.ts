import { describe, expect, it } from 'vitest'
import { GestureTracker, MAX_FINGERS, TAP_MAX_MS, TAP_SLOP } from './input'

type T = 'ball' | 'needles' | 'snow'
const tracker = () => new GestureTracker<T>((at) => (at.x < 100 ? 'ball' : at.x < 200 ? 'needles' : 'snow'), (target) => target === 'needles')

describe('GestureTracker', () => {
  it('turns a short touch into a tap', () => {
    const g = tracker()
    expect(g.down(1, { x: 10, y: 10 }, 0).map((i) => i.type)).toEqual(['press'])
    expect(g.up(1, { x: 12, y: 11 }, 120)).toEqual([{ type: 'tap', id: 1, target: 'ball', at: { x: 12, y: 11 } }])
  })

  it('a long hold without moving is not a tap', () => {
    const g = tracker()
    g.down(1, { x: 10, y: 10 }, 0)
    expect(g.up(1, { x: 10, y: 10 }, TAP_MAX_MS + 50)).toEqual([])
  })

  it('starts a drag past the slop and reports speed', () => {
    const g = tracker()
    g.down(1, { x: 10, y: 10 }, 0)
    expect(g.move(1, { x: 10 + TAP_SLOP / 2, y: 10 }, 10)).toEqual([])
    const intents = g.move(1, { x: 10 + TAP_SLOP * 2, y: 10 }, 40)
    expect(intents.map((i) => i.type)).toEqual(['dragStart', 'dragMove'])
    const move = intents[1]
    expect(move.type === 'dragMove' && move.speed).toBeGreaterThan(0)
    expect(g.up(1, { x: 60, y: 10 }, 80).map((i) => i.type)).toEqual(['dragEnd'])
  })

  it('drags targets that grab on contact without waiting for the slop', () => {
    const g = tracker()
    expect(g.down(1, { x: 150, y: 10 }, 0).map((i) => i.type)).toEqual(['press', 'dragStart'])
  })

  it('a fourth finger is a resting hand: cancel everything until the hand lifts', () => {
    const g = tracker()
    for (let id = 1; id <= MAX_FINGERS; id++) g.down(id, { x: 10, y: 10 }, 0)
    const cancel = g.down(4, { x: 10, y: 10 }, 5)
    expect(cancel).toEqual([{ type: 'cancelAll', ids: [1, 2, 3] }])
    expect(g.move(1, { x: 90, y: 90 }, 20)).toEqual([])
    expect(g.up(1, { x: 90, y: 90 }, 30)).toEqual([])
    for (const id of [2, 3, 4]) g.up(id, { x: 10, y: 10 }, 40)
    expect(g.down(5, { x: 10, y: 10 }, 50).map((i) => i.type)).toEqual(['press'])
  })

  it('a cancelled drag still ends where it was', () => {
    const g = tracker()
    g.down(1, { x: 10, y: 10 }, 0)
    g.move(1, { x: 60, y: 10 }, 30)
    expect(g.cancel(1)).toEqual([{ type: 'dragEnd', id: 1, target: 'ball', at: { x: 60, y: 10 } }])
  })

  it('forgets every finger on reset', () => {
    const g = tracker()
    g.down(1, { x: 10, y: 10 }, 0)
    g.reset()
    expect(g.active).toBe(0)
    expect(g.up(1, { x: 10, y: 10 }, 10)).toEqual([])
  })
})
