import { CELL, SPAWN_CLEARANCE } from './model'

// Where the street sits on the surface and how far the view has risen up the tower. Pure, so the
// rule that a waiting delivery never hangs under the jam's home control can be tested.

/** The jam draws one round 48 px home control at the top centre, 10 px from the top edge; this is its bottom edge. */
export const HOME_CONTROL_BOTTOM = 58
/** Clear air kept between the home control and the top of a waiting delivery. */
const HOME_GAP = 8
/** The tower's top sits this far above the deck before the view starts to follow it, where there is room. */
const FOLLOW_FROM = 265

export type StreetLayout = { scale: number; base: number }

/** Surface pixels per world unit, and the surface y of the deck. */
export function streetLayout(width: number, height: number): StreetLayout {
  // Keep the slab above the control dock; short screens put the controls in the corners instead.
  const reserve = height <= 500 ? 20 : 100
  const scale = Math.max(0.34, Math.min(width / 400, 1.35, (height - reserve - 60) / 470))
  return { scale, base: height - reserve - (38 * scale + 8) }
}

/**
 * How far up the view has risen, in world units, for a tower whose top is `towerHeight` above the deck.
 * The next delivery waits a clearance above that top and reaches two cells above its own centre when
 * stood on end; the view follows early enough that even then its top stays below the home control.
 */
export function cameraTarget(towerHeight: number, layout: StreetLayout) {
  const room = (layout.base - HOME_CONTROL_BOTTOM - HOME_GAP) / layout.scale - (SPAWN_CLEARANCE + 2 * CELL)
  return Math.max(0, towerHeight - Math.min(FOLLOW_FROM, room))
}
