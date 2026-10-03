import { describe, expect, it } from 'vitest'
import { settle, solve, type Frame } from './frame'
import { PLANK_BEND, SPEC, bowLoad, key, type Part, type Point } from './kit'

// The model is checked against results a textbook gives in closed form.

const part = (kind: Part['kind'], ax: number, ay: number, bx: number, by: number, turned = false): Part => ({ kind, a: [ax, ay], b: [bx, by], turned })
const footings = (...points: Point[]) => { const set = new Set(points.map(key)); return (p: Point) => set.has(key(p)) }
const node = (frame: Frame, x: number, y: number) => frame.at.get(key([x, y]))!
/** What a load adds to the answer the frame gives under its own weight alone. */
const added = (frame: Frame, at: number, weight: number, read: number) => solve(frame, [{ node: at, weight }]).moved(read)[1] - solve(frame).moved(read)[1]

describe('a plank bends as a beam', () => {
  const ends = footings([0, 0], [4, 0])

  it('dips under a load at mid-span by the load times the span cubed over 48 times its stiffness', () => {
    const frame = settle([part('plank', 0, 0, 4, 0)], ends)
    const middle = node(frame, 2, 0)
    expect(added(frame, middle, 2, middle)).toBeCloseTo((-2 * 4 ** 3) / (48 * PLANK_BEND.flat.stiffness), 4)
    // Twice the load, twice the dip.
    expect(added(frame, middle, 4, middle) / added(frame, middle, 2, middle)).toBeCloseTo(2, 3)
  })

  it('on edge dips a sixteenth as far and carries four times the bending', () => {
    const flat = settle([part('plank', 0, 0, 4, 0)], ends), edge = settle([part('plank', 0, 0, 4, 0, true)], ends)
    const dip = (frame: Frame) => added(frame, node(frame, 2, 0), 2, node(frame, 2, 0))
    expect(dip(flat) / dip(edge)).toBeCloseTo(16, 2)
    const use = (frame: Frame) => solve(frame, [{ node: node(frame, 2, 0), weight: 2 }]).parts[0]
    expect(use(flat).bending).toBeCloseTo(use(edge).bending, 3)
    expect(use(flat).use / use(edge).use).toBeCloseTo(4, 2)
  })

  it('bends most under the load, by a quarter of load times span plus its own weight', () => {
    const frame = settle([part('plank', 0, 0, 4, 0)], ends)
    const state = solve(frame, [{ node: node(frame, 2, 0), weight: 2 }]).parts[0]
    // Own weight is shared out to the points along the plank, half a cell apart. Seven of them lie between the
    // supports, so each support holds up three and a half, and the three on one side pull back at 0.5, 1 and 1.5.
    const each = SPEC.plank.weight * 0.5, own = 3.5 * each * 2 - each * (0.5 + 1 + 1.5)
    expect(state.bending).toBeCloseTo((2 * 4) / 4 + own, 3)
    expect(state.spot).toEqual([2, 0])
    expect(state.strain).toBe('bend')
    expect(state.use).toBeGreaterThan(1)
  })

  it('held up in the middle by a prop, dips far less and puts the prop in squeeze', () => {
    const bridge = [part('plank', 0, 2, 4, 2), part('stick', 2, 0, 2, 2)]
    const frame = settle(bridge, footings([0, 2], [4, 2], [2, 0]))
    const answer = solve(frame, [{ node: frame.along.get(0)![2], weight: 2 }])
    expect(frame.firm).toEqual([true, true])
    expect(answer.parts[1].strain).toBe('squeeze')
    expect(answer.parts[1].force).toBeLessThan(0)
    expect(answer.parts[0].use).toBeLessThan(1)
    expect(Math.abs(answer.moved(frame.along.get(0)![2])[1])).toBeLessThan(0.02)
  })
})

describe('pinned parts carry push and pull', () => {
  it('two sticks to an apex share a load by the sine of their slope', () => {
    const frame = settle([part('stick', 0, 0, 2, 2), part('stick', 4, 0, 2, 2)], footings([0, 0], [4, 0]))
    const apex = node(frame, 2, 2), rest = solve(frame).parts[0].force
    const loaded = solve(frame, [{ node: apex, weight: 3 }])
    expect(loaded.parts[0].force - rest).toBeCloseTo(-3 / (2 * Math.SQRT1_2), 3)
    expect(loaded.parts[0].force).toBeCloseTo(loaded.parts[1].force, 3)
    // At nearly three cells a stick would bow before it crushed, and the model says which.
    expect(loaded.parts[0].strain).toBe('bow')
  })

  it('two threads from above hold the same load in pull, and a thread from below holds nothing', () => {
    const hung = settle([part('thread', 0, 4, 2, 2), part('thread', 4, 4, 2, 2)], footings([0, 4], [4, 4]))
    const answer = solve(hung, [{ node: node(hung, 2, 2), weight: 3 }])
    expect(answer.parts[0].strain).toBe('pull')
    expect(answer.parts[0].force).toBeCloseTo(3 / (2 * Math.SQRT1_2), 1)
    expect(answer.held).toBe(true)
    const pushed = settle([part('thread', 0, 0, 2, 2), part('thread', 4, 0, 2, 2)], footings([0, 0], [4, 0]))
    expect(pushed.firm).toEqual([false, false])
  })

  it('a long squeezed stick bows before it crushes, and a tube of the same length does not', () => {
    const load = bowLoad('stick', 4) + 0.5
    for (const [kind, gives] of [['stick', true], ['tube', false]] as const) {
      // A post held upright by a level stick to the bank.
      const frame = settle([part(kind, 0, 0, 0, 4), part('stick', 0, 4, 3, 4)], footings([0, 0], [3, 4]))
      const post = solve(frame, [{ node: node(frame, 0, 4), weight: load }]).parts[0]
      expect(post.force).toBeLessThan(-load + 0.01)
      expect(post.use > 1).toBe(gives)
      if (gives) { expect(post.strain).toBe('bow'); expect(post.spot).toEqual([0, 2]) }
    }
  })
})

describe('a shape its parts do not hold is found', () => {
  const base = footings([0, 0], [2, 0])
  const square = [part('stick', 0, 0, 0, 2), part('stick', 0, 2, 2, 2), part('stick', 2, 2, 2, 0)]

  it('a square of pinned sticks folds and the same square with a diagonal stands', () => {
    expect(settle(square, base).firm).toEqual([false, false, false])
    const braced = settle([...square, part('stick', 0, 0, 2, 2)], base)
    expect(braced.firm).toEqual([true, true, true, true])
    expect(solve(braced, [{ node: node(braced, 0, 2), weight: 2 }]).held).toBe(true)
  })

  it('two planks hinged over the gap with nothing under the hinge hang down', () => {
    const hinged = [part('plank', 0, 0, 3, 0), part('plank', 3, 0, 6, 0)]
    expect(settle(hinged, footings([0, 0], [6, 0])).firm).toEqual([false, false])
    expect(settle([...hinged, part('stick', 3, 0, 3, -2)], footings([0, 0], [6, 0], [3, -2])).firm).toEqual([true, true, true])
  })

  it('a mast on one footing falls, with one stay it falls, with a stay each side it stands', () => {
    const mast = part('stick', 3, 0, 3, 3), left = part('thread', 3, 3, 0, 0), right = part('thread', 3, 3, 6, 0)
    const ground = footings([0, 0], [3, 0], [6, 0])
    expect(settle([mast], ground).firm).toEqual([false])
    expect(settle([mast, left], ground).firm).toEqual([false, false])
    expect(settle([mast, left, right], ground).firm).toEqual([true, true, true])
  })

  it('a part hanging from one pin carries nothing and still weighs on its pin', () => {
    const bridge = [part('plank', 0, 0, 4, 0, true), part('stick', 2, 0, 2, -3)]
    const frame = settle(bridge, footings([0, 0], [4, 0]))
    expect(frame.firm).toEqual([true, false])
    expect(solve(frame).parts[1].strain).toBe('loose')
    const alone = settle([bridge[0]], footings([0, 0], [4, 0]))
    expect(solve(frame).moved(node(frame, 2, 0))[1]).toBeLessThan(solve(alone).moved(node(alone, 2, 0))[1])
  })

  it('gives the same answer every time', () => {
    const bridge = [...square, part('stick', 0, 0, 2, 2), part('thread', 0, 2, 2, 0)]
    const once = solve(settle(bridge, base), [{ node: 1, weight: 2 }]).parts.map((p) => p.force)
    expect(solve(settle(bridge, base), [{ node: 1, weight: 2 }]).parts.map((p) => p.force)).toEqual(once)
  })
})
