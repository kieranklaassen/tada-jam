import { LAYOUT } from './props'
import type { VehicleDef } from './roster'
import { patchCentre } from './silhouette'
import { GRID_H, GRID_W, cellAt, type Surface } from './surface'

// The dried patch on a vehicle's nose that the first showing needs: the one
// a drop from the tap falls on. Pure. Until the showing has played, nothing
// that lands on a waiting vehicle (mud from the puddle, thrown foam) may
// cover it, or the showing would have nothing to show.

export type DriedPatch = { col: number; row: number; x: number; y: number }

/**
 * A dried patch a falling drop can reach: on the nose, under the tap, with
 * nothing of the body above it. The vehicle only shuffles a little to bring
 * it under the tap, so only columns close to the tap count.
 */
export function driedNosePatch(def: VehicleDef, surface: Surface): DriedPatch | null {
  for (let col = 0; col < GRID_W; col++) {
    const centre = patchCentre(def, col, 0)
    if (Math.abs(LAYOUT.tap.x - centre.x) > 0.5) continue
    for (let row = GRID_H - 1; row >= 0; row--) {
      const patch = surface[cellAt(col, row)]
      if (patch === '.') continue
      if (patch === 'c') return { col, row, ...patchCentre(def, col, row) }
      break
    }
  }
  return null
}

/** The patches nothing may land on while the showing has not played: the dried patch on the nose, if there is one. */
export function keptForShowing(def: VehicleDef, surface: Surface, shown: readonly string[]): number[] {
  if (shown.includes('drip')) return []
  const patch = driedNosePatch(def, surface)
  return patch ? [cellAt(patch.col, patch.row)] : []
}
