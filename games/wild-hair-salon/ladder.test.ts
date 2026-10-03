import { describe, expect, it } from 'vitest'
import { hintFor } from './ladder'
import { TUFTS } from './rules'
import type { Salon } from './world'

const salon = (over: Partial<Salon> = {}): Salon => ({
  chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seed: 1, lock: 70, model: 44, seat: 'beside', cape: 'on',
  mane: [40, 90, 12, 50, 55, 61, 47, 33, 58], ribbon: null, clippings: [], shown: { snip: true, pull: true, ribbon: false }, ...over,
})
const glowing = { glow: 1, demo: null, demoIndex: -1 }
const demo = (index: number) => ({ glow: 1, demo: 0.5, demoIndex: index })

describe('what the idle ladder shows', () => {
  it('shows nothing before the child has been idle, before the slot is read, or while a scene plays', () => {
    expect(hintFor(salon(), { glow: 0, demo: null, demoIndex: -1 }, false)).toEqual({ glow: [], hand: null })
    expect(hintFor(null, glowing, false)).toEqual({ glow: [], hand: null })
    expect(hintFor(salon(), null, false)).toEqual({ glow: [], hand: null })
    expect(hintFor(salon(), demo(0), true)).toEqual({ glow: [], hand: null })
  })

  it('on a first visit glows on the door only, with no ghost hand', () => {
    const empty = salon({ chair: null, friend: null, cape: 'off' })
    expect(hintFor(empty, glowing, false)).toEqual({ glow: ['door'], hand: null })
    expect(hintFor(empty, demo(0), false)).toEqual({ glow: ['door'], hand: null })
  })

  it('after the cape has come off glows on the door and on the chair, with no ghost hand', () => {
    const off = salon({ cape: 'off' })
    expect(hintFor(off, glowing, false)).toEqual({ glow: ['door', 'chair'], hand: null })
    expect(hintFor(off, demo(3), false)).toEqual({ glow: ['door', 'chair'], hand: null })
  })

  it('under the cape glows on the lock first, then shows the verb on a tuft of the mane, never on the lock', () => {
    expect(hintFor(salon(), glowing, false)).toEqual({ glow: ['lock'], hand: null })
    // A snip is shown on the longest tuft, and the next time a pull on the shortest, whatever the lock needs.
    expect(hintFor(salon(), demo(0), false)).toEqual({ glow: ['lock'], hand: { on: 'tuft', move: 'snip', tuft: 1 } })
    expect(hintFor(salon(), demo(2), false)).toEqual({ glow: ['lock'], hand: { on: 'tuft', move: 'pull', tuft: 2 } })
    for (const s of [salon({ lock: 10 }), salon({ lock: 100 })]) expect(hintFor(s, demo(0), false).hand).toEqual({ on: 'tuft', move: 'snip', tuft: 1 })
  })

  it('after each verb goes to the cape\'s knot', () => {
    for (const i of [1, 3]) expect(hintFor(salon(), demo(i), false)).toEqual({ glow: ['knot'], hand: { on: 'knot' } })
    expect(Array(TUFTS).fill(0)).toHaveLength(9)
  })
})
