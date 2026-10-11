import { describe, expect, it } from 'vitest'
import { KINDS, MAX_PARTS, PLANK_BEND, SPEC, bowLoad, gridPointsOn, layProblem, length, pinsOf, reach, sameSpan, squeezeLimit, turn, type Part } from './kit'

const part = (kind: Part['kind'], ax: number, ay: number, bx: number, by: number, turned = false): Part => ({ kind, a: [ax, ay], b: [bx, by], turned })
const fullKit = { plank: 9, stick: 9, tube: 9, thread: 9 }

describe('the kit', () => {
  it('a plank can be pinned at every grid point along it, the other kinds at their ends', () => {
    expect(pinsOf(part('plank', 0, 6, 4, 6))).toHaveLength(5)
    expect(pinsOf(part('plank', 0, 0, 2, 4))).toEqual([[0, 0], [1, 2], [2, 4]])
    expect(pinsOf(part('stick', 0, 6, 4, 6))).toEqual([[0, 6], [4, 6]])
    expect(gridPointsOn(part('stick', 0, 0, 3, 2))).toHaveLength(2)
  })

  it('turning changes a plank and nothing else', () => {
    expect(turn(part('plank', 0, 0, 1, 0)).turned).toBe(true)
    expect(turn(turn(part('plank', 0, 0, 1, 0))).turned).toBe(false)
    for (const kind of ['stick', 'tube', 'thread'] as const) expect(turn(part(kind, 0, 0, 1, 0))).toEqual(part(kind, 0, 0, 1, 0))
  })

  it('a plank on edge is sixteen times as stiff and four times as strong as the same plank flat', () => {
    expect(PLANK_BEND.edge.stiffness / PLANK_BEND.flat.stiffness).toBe(16)
    expect(PLANK_BEND.edge.strength / PLANK_BEND.flat.strength).toBe(4)
  })

  it('the four kinds differ the way the sheet says', () => {
    // A long tube holds far more squeeze than a stick of its length; a stick holds more pull than a tube.
    expect(squeezeLimit('tube', 4)).toBeGreaterThan(3 * squeezeLimit('stick', 4))
    expect(SPEC.stick.pull).toBeGreaterThan(SPEC.tube.pull)
    // A thread holds a strong pull and no squeeze at all.
    expect(SPEC.thread.pull).toBeGreaterThanOrEqual(SPEC.stick.pull)
    expect(squeezeLimit('thread', 1)).toBe(0)
    // A short stick crushes before it bows; a long one bows first.
    expect(squeezeLimit('stick', 1)).toBe(SPEC.stick.squeeze)
    expect(squeezeLimit('stick', 4)).toBeCloseTo(bowLoad('stick', 4))
    expect(bowLoad('stick', 2) / bowLoad('stick', 4)).toBeCloseTo(4)
    for (const kind of KINDS) expect(SPEC[kind].weight).toBeGreaterThan(0)
  })

  it('refuses only what cannot be laid, each for its own reason', () => {
    const bridge = [part('stick', 0, 0, 1, 1)]
    expect(layProblem(part('stick', 2, 2, 2, 2), bridge, fullKit)).toBe('no-length')
    expect(layProblem(part('stick', 0, 0, 5, 0), bridge, fullKit)).toBe('too-long')
    expect(layProblem(part('tube', 0, 0, 5, 0), bridge, fullKit)).toBeNull()
    expect(layProblem(part('plank', 1, 1, 0, 0), bridge, fullKit)).toBe('doubled')
    expect(layProblem(part('stick', 3, 3, 4, 4), bridge, { ...fullKit, stick: 1 })).toBe('kit-empty')
    expect(layProblem(part('thread', 3, 3, 4, 4), bridge, fullKit)).toBeNull()
    const many = Array.from({ length: MAX_PARTS }, (_, i) => part('thread', i, 0, i, 1))
    expect(layProblem(part('thread', 0, 5, 1, 5), many, { ...fullKit, thread: 99 })).toBe('full')
  })

  it('the free end of a drag snaps to a grid point within the reach of the kind', () => {
    expect(reach('stick', [0, 0], [2.2, 0.1])).toEqual([2, 0])
    const far = reach('stick', [0, 0], [30, 0])
    expect(far).toEqual([4, 0])
    const diagonal = reach('plank', [3, 3], [20, 20])
    expect(length({ a: [3, 3], b: diagonal })).toBeLessThanOrEqual(SPEC.plank.maxLength)
    expect(diagonal).not.toEqual([3, 3])
    expect(sameSpan(part('stick', 0, 0, 1, 1), part('tube', 1, 1, 0, 0))).toBe(true)
  })
})
