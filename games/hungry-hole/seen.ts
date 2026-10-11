import { heightOf, widthOf, type Kind } from './kinds'
import { GATE, KEEPER } from './places'

// What covers what, as the child sees the street. The eye looks down from the
// near side, so a tall thing hides whatever stands behind it and a little to
// its outer side. The rules ask this without a camera: here the view is
// worked out in plain numbers, wide of the truth on the safe side, and
// view/carnival.test.ts holds it against the real camera at every surface
// size the tests name.

/** The angle of the eye above the street, in degrees. The view looks from the same angle. */
export const ELEVATION = 54
/** The ground a thing hides behind it, for each unit of its height. */
const COT = 1 / Math.tan((ELEVATION * Math.PI) / 180)
/** How much nearer the eye, and so how much larger and further out, a point is for each unit of its height. */
const NEARER = 0.045
/** The middle of the picture, across and up, in the picture's own measure. */
const MIDDLE = { x: 0, s: -1.7 } as const
/** Room kept between two things in the picture. */
const SLACK = 0.12

/** An upright shape: where its foot is, how wide and deep the foot is, and how high it stands. */
export type Shape = { x: number; z: number; wide: number; deep: number; high: number }

/** The patch of the picture a shape takes: `x0`..`x1` across, `s0` (its top) .. `s1` (its near foot) up the picture, where `s` is z less the ground its height hides. */
export type Patch = { x0: number; x1: number; s0: number; s1: number }

export function patchOf(shape: Shape): Patch {
  const left = shape.x - shape.wide / 2, right = shape.x + shape.wide / 2
  const top = shape.z - shape.deep / 2 - shape.high * COT, grow = 1 + NEARER * shape.high
  // The top is nearer the eye than the foot: it is drawn larger, and further from the middle of the picture.
  const topLeft = MIDDLE.x + (left - MIDDLE.x) * grow, topRight = MIDDLE.x + (right - MIDDLE.x) * grow
  return {
    x0: Math.min(left, topLeft),
    x1: Math.max(right, topRight),
    s0: Math.min(top, MIDDLE.s + (top - MIDDLE.s) * grow),
    s1: shape.z + shape.deep / 2,
  }
}

/** Whether two patches of the picture touch at all. */
export function overlap(a: Patch, b: Patch): boolean {
  return a.x0 < b.x1 + SLACK && b.x0 < a.x1 + SLACK && a.s0 < b.s1 + SLACK && b.s0 < a.s1 + SLACK
}

/** Whether `a` covers `b`: the middle of `b`, across and up, is inside `a`'s patch, so `b` cannot be seen or touched at its middle. */
export function covers(a: Patch, b: Patch): boolean {
  const x = (b.x0 + b.x1) / 2, s = (b.s0 + b.s1) / 2
  return x > a.x0 - SLACK && x < a.x1 + SLACK && s > a.s0 - SLACK && s < a.s1 + SLACK
}

/** How far a balloon on top of a stack floats above where it sits. */
export const FLOAT = 0.7

/** A thing or a stack standing at (x, z). A balloon riding on top floats higher than it sits: `FLOAT` covers that. */
export function shapeOf(parts: readonly Kind[], x: number, z: number): Shape {
  const wide = widthOf(parts)
  return { x, z, wide, deep: wide, high: heightOf(parts) + (parts.length > 1 && parts.includes('balloon') ? FLOAT : 0) }
}

/** The gate keeper at his tallest, risen on his stilts with his key held up, and the gate with its arch. */
export const KEEPER_SHAPE: Shape = { x: KEEPER.x, z: KEEPER.z, wide: 1.5, deep: 0.9, high: 5.3 }
export const GATE_SHAPE: Shape = { x: GATE.x, z: GATE.z, wide: GATE.half * 2 + 0.7, deep: 0.5, high: GATE.high + 0.3 }

type Stood = { parts: readonly Kind[]; x: number; z: number }

/**
 * Whether a stack standing at (x, z) covers none of `others` and is covered by none of them, and touches neither
 * the gate keeper nor the gate in the picture: the two bystanders a child must be able to find are never behind
 * anything, and no thing or stack has its middle behind another.
 */
export function seenClear(parts: readonly Kind[], x: number, z: number, others: readonly Stood[]): boolean {
  const patch = patchOf(shapeOf(parts, x, z))
  if (overlap(patch, patchOf(KEEPER_SHAPE)) || overlap(patch, patchOf(GATE_SHAPE))) return false
  for (const other of others) {
    const theirs = patchOf(shapeOf(other.parts, other.x, other.z))
    if (covers(patch, theirs) || covers(theirs, patch)) return false
  }
  return true
}

/** The same, and stricter: its patch of the picture touches no other thing's patch at all. Where the street has such a place, a stack is set down there. */
export function seenApart(parts: readonly Kind[], x: number, z: number, others: readonly Stood[]): boolean {
  const patch = patchOf(shapeOf(parts, x, z))
  if (overlap(patch, patchOf(KEEPER_SHAPE)) || overlap(patch, patchOf(GATE_SHAPE))) return false
  for (const other of others) if (overlap(patch, patchOf(shapeOf(other.parts, other.x, other.z)))) return false
  return true
}

/** Whether a stack standing at (x, z) is in front of the gate keeper or the gate in the picture. */
export function hidesGate(parts: readonly Kind[], x: number, z: number): boolean {
  const patch = patchOf(shapeOf(parts, x, z))
  return overlap(patch, patchOf(KEEPER_SHAPE)) || overlap(patch, patchOf(GATE_SHAPE))
}

/** Those of `others` whose middle a stack standing at (x, z) would cover, and those that would cover its middle. */
export function hiddenBy<T extends Stood>(parts: readonly Kind[], x: number, z: number, others: readonly T[]): { behind: T[]; before: T[] } {
  const patch = patchOf(shapeOf(parts, x, z)), behind: T[] = [], before: T[] = []
  for (const other of others) {
    const theirs = patchOf(shapeOf(other.parts, other.x, other.z))
    if (covers(patch, theirs)) behind.push(other)
    else if (covers(theirs, patch)) before.push(other)
  }
  return { behind, before }
}
