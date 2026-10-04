// Where things stand on the table, as numbers the view and the rules share.
// The table is seen from the child's side: x runs left to right, z runs from
// the guests at the far edge (negative) to the child at the near edge
// (positive), and the cloth is the plane y = 0. Lengths are table units.

export type Spot = { x: number; z: number }

/** The cloth a thing can stand on and a puddle can lie on. */
export const CLOTH = { minX: -6.6, maxX: 6.6, minZ: -3.0, maxZ: 4.2 } as const

/** The table never seats more than four. */
export const SEAT_COUNT = 4

/** Where each party size sits along the far edge, so one guest sits in the middle and four fill the table. */
const SEAT_XS: readonly (readonly number[])[] = [[], [0], [-2.1, 2.1], [-3.5, 0, 3.5], [-4.2, -1.4, 1.4, 4.2]]

/** How far back a guest sits, and how far in front of it its place is laid. */
export const GUEST_Z = -2.2
export const PLACE_Z = 0.3

/**
 * The guests' row ends here, a little behind the back rim of a laid saucer.
 * Behind it the guests sit, and walk when they change seats, so nothing is
 * set down there.
 */
export const ROW_FRONT = PLACE_Z - 1.05

/** The pot is never carried further back than this: far enough in front of the widest guest that neither its belly nor its spout, whichever way it faces, reaches the guest. */
export const POT_ROW_Z = GUEST_Z + 2.75

/** Where the guest in seat `seat` of a party of `party` sits. */
export function seatSpot(party: number, seat: number): Spot {
  const xs = SEAT_XS[Math.max(1, Math.min(SEAT_COUNT, party))]
  return { x: xs[Math.max(0, Math.min(xs.length - 1, seat))], z: GUEST_Z }
}

/** Where that guest's saucer goes; its cup stands on the saucer and its spoon lies to the left, clear of where the pot stands to pour. */
export function placeSpot(party: number, seat: number): Spot {
  return { x: seatSpot(party, seat).x, z: PLACE_Z }
}

export function spoonSpot(party: number, seat: number): Spot {
  const place = placeSpot(party, seat)
  return { x: place.x - 1.32, z: place.z + 0.12 }
}

/** The tray along the near edge: the stack of saucers, the spoons, the plain cups, where the sponge comes out, and the pot's stand; the bowl comes out at the right, between the places and the tray. Everything fits inside what the camera shows at that depth. */
export const TRAY = {
  saucers: { x: -5.1, z: 3.0 },
  spoons: { x: -3.7, z: 3.1 },
  cups: { x: -1.3, z: 3.0 },
  sponge: { x: 2.6, z: 3.6 },
  pot: { x: 4.25, z: 3.25 },
  bowl: { x: 5.52, z: 1.72 },
} as const

/** A thing set down outside the cloth is brought back to its edge. */
export function onCloth(spot: Spot, margin = 0.3): Spot {
  return {
    x: Math.max(CLOTH.minX + margin, Math.min(CLOTH.maxX - margin, spot.x)),
    z: Math.max(CLOTH.minZ + margin, Math.min(CLOTH.maxZ - margin, spot.z)),
  }
}
