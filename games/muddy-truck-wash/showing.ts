import { SHOWING_COL } from './mud'
import type { VehicleDef } from './roster'
import { patchCentre } from './silhouette'
import { GRID_H, cellAt, type Surface } from './surface'

// The dried patch on a vehicle's nose that the first showing needs: the one
// a drop from the tap falls on. Pure. Until the showing has played, nothing
// that lands on a waiting vehicle (mud from the puddle, thrown foam) may
// cover it, or the showing would have nothing to show.

export type DriedPatch = { col: number; row: number; x: number; y: number }

/**
 * The dried patch a falling drop can reach: the top of the showing's column,
 * on the nose behind the eyes, with nothing of the body above it. The vehicle
 * shuffles a little to bring it under the tap.
 */
export function driedNosePatch(def: VehicleDef, surface: Surface): DriedPatch | null {
  const col = SHOWING_COL
  for (let row = GRID_H - 1; row >= 0; row--) {
    const patch = surface[cellAt(col, row)]
    if (patch === '.') continue
    return patch === 'c' ? { col, row, ...patchCentre(def, col, row) } : null
  }
  return null
}

/** The patches nothing may land on while the showing has not played: the dried patch on the nose, if there is one. */
export function keptForShowing(def: VehicleDef, surface: Surface, shown: readonly string[]): number[] {
  if (shown.includes('drip')) return []
  const patch = driedNosePatch(def, surface)
  return patch ? [cellAt(patch.col, patch.row)] : []
}
