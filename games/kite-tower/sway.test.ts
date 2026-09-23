import { describe, expect, it } from 'vitest'
import { pieceShape, worldParts, type Placed } from './pieces'
import { findStacks, swayAngle, type Mass } from './sway'

const CUBES = [0, 1, 3, 8]

function cubeAt(id: number, x: number, bottom: number): { placed: Placed; mass: Mass } {
  const shape = pieceShape(id)
  const y = bottom + 0.5
  return { placed: { id, parts: worldParts(shape, { x, y, angle: 0 }) }, mass: { id, x, mass: shape.mass } }
}

function tower(heights: number, x = 0): { placed: Placed[]; masses: Mass[] } {
  const items = CUBES.slice(0, heights).map((id, level) => cubeAt(id, x, level))
  return { placed: items.map((i) => i.placed), masses: items.map((i) => i.mass) }
}

describe('findStacks', () => {
  it('a single cube is one solid stack', () => {
    const { placed, masses } = tower(1)
    const stacks = findStacks(placed, masses, null)
    expect(stacks).toHaveLength(1)
    expect(stacks[0].wobble).toBe(0)
    expect(stacks[0].lo).toBeCloseTo(-0.5, 1)
    expect(stacks[0].hi).toBeCloseTo(0.5, 1)
  })

  it('a tall narrow tower wobbles more than a short one', () => {
    const short = tower(2)
    const tall = tower(4)
    const a = findStacks(short.placed, short.masses, null)[0]
    const b = findStacks(tall.placed, tall.masses, null)[0]
    expect(b.ids).toHaveLength(4)
    expect(b.wobble).toBeGreaterThan(a.wobble)
    expect(b.omega).toBeLessThan(a.omega)
  })

  it('separate towers are separate stacks', () => {
    const left = cubeAt(0, -3, 0)
    const right = cubeAt(1, 3, 0)
    const stacks = findStacks([left.placed, right.placed], [left.mass, right.mass], null)
    expect(stacks).toHaveLength(2)
  })

  it('a stack leaning toward one edge wobbles more, and the doll at the edge adds to it', () => {
    const base = cubeAt(0, 0, 0)
    const centred = cubeAt(1, 0, 1)
    const leaning = cubeAt(1, 0.42, 1)
    const straight = findStacks([base.placed, centred.placed], [base.mass, centred.mass], null)[0]
    const lean = findStacks([base.placed, leaning.placed], [base.mass, leaning.mass], null)[0]
    expect(lean.wobble).toBeGreaterThan(straight.wobble)
    const loaded = findStacks([base.placed, leaning.placed], [base.mass, leaning.mass], { id: 1, x: 0.8, weight: 0.7 })[0]
    expect(loaded.wobble).toBeGreaterThan(lean.wobble)
  })

  it('the sway rocks on the edge it tips toward and stays small', () => {
    const { placed, masses } = tower(4)
    const stack = findStacks(placed, masses, null)[0]
    const rock = { angle: 0, pivot: 0 }
    let most = 0
    for (let t = 0; t < 4; t += 0.05) {
      swayAngle(stack, t, 0, rock)
      most = Math.max(most, Math.abs(rock.angle))
      if (rock.angle > 0) expect(rock.pivot).toBe(stack.lo)
      if (rock.angle < 0) expect(rock.pivot).toBe(stack.hi)
    }
    expect(most).toBeGreaterThan(0)
    expect(most).toBeLessThan(0.06)
  })
})
