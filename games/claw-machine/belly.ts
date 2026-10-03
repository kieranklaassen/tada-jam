import { PLATE } from './bricks'
import { toySpan } from './builds'
import { LEGS, bellyBox, type GobblerShape } from './gobblerBuild'
import type { Toy } from './toys'

// Where a group lies in a belly. A swallowed toy is chewed small and stands
// behind the window with the others, in the order it went in: along the
// bottom row from the left, then along the row above.

/** How small a toy is in a belly. */
export const MINI = 0.42
export const BELLY_ROWS = 2
/** The gap between two toys in a row and at either end of it, in world units. */
const GAP = 0.25

export type BellyPlace = { x: number; y: number; z: number }

/**
 * The middle of the base of each toy of a group, measured from the gobbler's
 * feet, in the order given, or null when the group does not fit. A row runs
 * from the left until the next toy would not fit, so a toy keeps its place
 * when another is added after it.
 */
export function bellyLayout(shape: GobblerShape, group: readonly Toy[]): BellyPlace[] | null {
  const inside = bellyBox(shape), rowHeight = inside.h / BELLY_ROWS
  const out: BellyPlace[] = []
  let row = 0, used = GAP
  for (const toy of group) {
    const span = toySpan(toy), length = span.length * MINI
    if (span.height * MINI > rowHeight || length + 2 * GAP > inside.w) return null
    if (used + length + GAP > inside.w) { row++; used = GAP }
    if (row >= BELLY_ROWS) return null
    out.push({ x: inside.x + used + length / 2, y: LEGS * PLATE + inside.y + row * rowHeight, z: inside.z + inside.d * 0.55 })
    used += length + GAP
  }
  return out
}
