import { PLATE } from './bricks'
import { toySpan } from './builds'
import { BELLY_STEP, ROW_BACK, ROW_Z, bellyBox, type GobblerShape } from './gobblerBuild'
import type { Toy } from './toys'

// Where a group stands in a belly. A swallowed toy is chewed small and
// stands behind the window with the others, in the order it went in: along
// the front row from the left, and on the step behind when the front row has
// no room for it. Both rows show through the window, the back one over the
// front one.

/** How small a toy is in a belly. */
export const MINI = 0.46
export const BELLY_ROWS = 2
/** The gap between two toys in a row and at either end of it, in world units. */
const GAP = 0.25

export type BellyPlace = { x: number; y: number; z: number }

/**
 * The middle of the base of each toy of a group, measured from the gobbler's
 * feet, in the order given, or null when the group does not fit. Each toy
 * takes the first row that still has room for it, at the left of what is
 * there, so a toy keeps its place when another is added after it.
 */
export function bellyLayout(shape: GobblerShape, group: readonly Toy[]): BellyPlace[] | null {
  const inside = bellyBox(shape), step = BELLY_STEP * PLATE
  const out: BellyPlace[] = []
  const used = Array.from({ length: BELLY_ROWS }, () => GAP)
  for (const toy of group) {
    const span = toySpan(toy), length = span.length * MINI
    const row = used.findIndex((taken, r) => taken + length + GAP <= inside.w + 1e-9 && span.height * MINI + r * step <= inside.h - 0.15)
    if (row < 0) return null
    out.push({ x: inside.x + used[row] + length / 2, y: inside.y + row * step, z: row === 0 ? ROW_Z : ROW_BACK })
    used[row] += length + GAP
  }
  return out
}
