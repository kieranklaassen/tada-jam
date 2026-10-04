import { describe, expect, it } from 'vitest'
import { beetleMood, ease, lookAt, visitorMood } from './faces'

describe('a face', () => {
  it('looks at the finger: straight ahead at one level with it in front, up at one above, round behind at one behind', () => {
    const eye = { x: 500, y: 300 }
    expect(lookAt(eye, { x: 100, y: 300 })).toBeCloseTo(0, 6)
    expect(lookAt(eye, { x: 100, y: 100 })).toBeGreaterThan(0.3)
    expect(lookAt(eye, { x: 100, y: 500 })).toBeLessThan(-0.3)
    expect(lookAt(eye, { x: 500, y: 0 })).toBeCloseTo(Math.PI / 2, 6)
    expect(Math.abs(lookAt(eye, { x: 900, y: 300 }))).toBeCloseTo(Math.PI, 6)
    // One that faces the other way sees the same finger mirrored.
    expect(lookAt(eye, { x: 900, y: 300 }, true)).toBeCloseTo(0, 6)
    expect(lookAt(eye, { x: 900, y: 100 }, true)).toBeCloseTo(lookAt(eye, { x: 100, y: 100 }), 6)
  })

  it('lifts its brow at what it likes and at a poke, lowers it at the trait that misses, and is deadpan otherwise', () => {
    expect(visitorMood(null)).toBe(0)
    expect(visitorMood('bow')).toBe(0)
    expect(visitorMood('like-colour')).toBeGreaterThan(0.5)
    expect(visitorMood('like-leaf')).toBe(visitorMood('like-colour'))
    expect(visitorMood('miss-height-higher')).toBeLessThan(-0.5)
    expect(visitorMood('poked')).toBe(1)
    expect(visitorMood('take')).toBeGreaterThan(0.5)
    expect(visitorMood('shrug')).toBeLessThan(0)
  })

  it('is the beetle’s too: stern on guard, cross at its tape and at an untidy page, wide-eyed on its back', () => {
    expect(beetleMood(null, false, false)).toBe(0)
    expect(beetleMood('guard', false, false)).toBe(-1)
    expect(beetleMood('notice', false, false)).toBeLessThan(-0.5)
    expect(beetleMood('smooth-tape', false, false)).toBeLessThan(0)
    expect(beetleMood(null, false, true)).toBeLessThan(-0.5)
    expect(beetleMood('guard', true, true)).toBe(1)
  })

  it('never snaps: a look or a brow goes part of the way in a frame and all of the way in the end', () => {
    let at = 0
    at = ease(at, 1, 9, 1 / 60)
    expect(at).toBeGreaterThan(0.1)
    expect(at).toBeLessThan(0.2)
    for (let i = 0; i < 120; i++) at = ease(at, 1, 9, 1 / 60)
    expect(at).toBeCloseTo(1, 4)
    expect(ease(0, 1, 9, 5)).toBe(1)
  })
})
