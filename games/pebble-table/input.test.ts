import { describe, expect, it } from 'vitest'
import { GestureTracker, pickPiece, type Target } from './input'

const hitTest = (at: { x: number; y: number }): Target => {
  if (at.x < 100) return { kind: 'bag' }
  if (at.x < 500) return { kind: 'piece', id: at.x < 300 ? 1 : 2 }
  return { kind: 'broom' }
}

const types = (intents: { type: string }[]) => intents.map((i) => i.type)

describe('GestureTracker', () => {
  it('turns a still press on a stone into a tap', () => {
    const tracker = new GestureTracker(hitTest)
    expect(types(tracker.down(1, { x: 200, y: 200 }, 0))).toEqual(['press'])
    const intents = tracker.up(1, { x: 203, y: 201 }, 120)
    expect(intents).toEqual([{ type: 'tap', pointerId: 1, target: { kind: 'piece', id: 1 }, at: { x: 203, y: 201 } }])
  })

  it('turns a moving press into a drag that ends in a flick with recent velocity', () => {
    const tracker = new GestureTracker(hitTest)
    tracker.down(1, { x: 200, y: 200 }, 0)
    expect(types(tracker.move(1, { x: 240, y: 200 }, 16))).toEqual(['dragStart', 'dragMove'])
    tracker.move(1, { x: 280, y: 200 }, 32)
    tracker.move(1, { x: 320, y: 200 }, 48)
    const [end] = tracker.up(1, { x: 360, y: 200 }, 64)
    expect(end.type).toBe('dragEnd')
    if (end.type !== 'dragEnd') throw new Error('expected dragEnd')
    expect(end.velocity.x).toBeGreaterThan(1500)
    expect(end.velocity.y).toBe(0)
  })

  it('taps the bag to tip it and drags from it to pull a stone', () => {
    const tracker = new GestureTracker(hitTest)
    tracker.down(1, { x: 50, y: 800 }, 0)
    expect(tracker.up(1, { x: 50, y: 800 }, 100)[0]).toMatchObject({ type: 'tap', target: { kind: 'bag' } })
    tracker.down(2, { x: 50, y: 800 }, 200)
    expect(tracker.move(2, { x: 120, y: 760 }, 230)[0]).toMatchObject({ type: 'dragStart', target: { kind: 'bag' } })
  })

  it('makes a press on empty table a broom straight away', () => {
    const tracker = new GestureTracker(hitTest)
    expect(types(tracker.down(1, { x: 800, y: 500 }, 0))).toEqual(['press', 'dragStart'])
    expect(types(tracker.move(1, { x: 805, y: 500 }, 16))).toEqual(['dragMove'])
  })

  it('Covers AE8. a fourth finger cancels everything and nothing fires until the hand lifts', () => {
    const tracker = new GestureTracker(hitTest)
    tracker.down(1, { x: 200, y: 200 }, 0)
    tracker.move(1, { x: 260, y: 200 }, 16)
    tracker.down(2, { x: 350, y: 200 }, 20)
    tracker.down(3, { x: 800, y: 200 }, 25)
    expect(tracker.down(4, { x: 820, y: 220 }, 30)).toEqual([{ type: 'cancelAll', pointerIds: [1, 2, 3] }])
    expect(tracker.down(5, { x: 840, y: 240 }, 35)).toEqual([])
    expect(tracker.move(1, { x: 300, y: 200 }, 40)).toEqual([])
    for (const id of [1, 2, 3, 4]) expect(tracker.up(id, { x: 0, y: 0 }, 50)).toEqual([])
    expect(tracker.up(5, { x: 0, y: 0 }, 60)).toEqual([])
    expect(types(tracker.down(6, { x: 200, y: 200 }, 100))).toEqual(['press'])
  })

  it('lets two fingers drag two stones independently', () => {
    const tracker = new GestureTracker(hitTest)
    tracker.down(1, { x: 200, y: 200 }, 0)
    tracker.down(2, { x: 400, y: 200 }, 0)
    expect(tracker.move(1, { x: 230, y: 230 }, 16)[0]).toMatchObject({ target: { kind: 'piece', id: 1 } })
    expect(tracker.move(2, { x: 430, y: 230 }, 16)[0]).toMatchObject({ target: { kind: 'piece', id: 2 } })
  })

  it('ignores a long still press (reserved for asking a number)', () => {
    const tracker = new GestureTracker(hitTest)
    tracker.down(1, { x: 200, y: 200 }, 0)
    expect(tracker.up(1, { x: 200, y: 200 }, 900)).toEqual([])
  })
})

describe('pickPiece', () => {
  const pieces = [
    { id: 1, x: 100, y: 100, r: 30 },
    { id: 2, x: 130, y: 100, r: 30 },
  ]

  it('prefers the topmost piece where they overlap', () => {
    expect(pickPiece(pieces, { x: 115, y: 100 }, 18)?.id).toBe(2)
  })

  it('hits a piece just outside its radius within the finger slop', () => {
    expect(pickPiece(pieces, { x: 100, y: 145 }, 18)?.id).toBe(1)
  })

  it('misses beyond the slop', () => {
    expect(pickPiece(pieces, { x: 100, y: 160 }, 18)).toBeNull()
  })
})
