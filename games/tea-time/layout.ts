// Where things stand on the table, as numbers the view and the rules share.
// The table is seen from the child's side: x runs left to right, z runs from
// the guests at the far edge (negative) to the child at the near edge
// (positive), and the cloth is the plane y = 0. Lengths are table units.

export type Spot = { x: number; z: number }

/** The cloth a thing can stand on and a puddle can lie on. */
export const CLOTH = { minX: -6.6, maxX: 6.6, minZ: -3.0, maxZ: 3.6 } as const

/** The table never seats more than four. */
export const SEAT_COUNT = 4

/** Where each party size sits along the far edge, so one guest sits in the middle and four fill the table. */
const SEAT_XS: readonly (readonly number[])[] = [[], [0], [-2.1, 2.1], [-3.7, 0, 3.7], [-4.65, -1.55, 1.55, 4.65]]

/** How far back a guest sits, and how far in front of it its place is laid. */
export const GUEST_Z = -2.35
export const PLACE_Z = -0.35

/** Where the guest in seat `seat` of a party of `party` sits. */
export function seatSpot(party: number, seat: number): Spot {
  const xs = SEAT_XS[Math.max(1, Math.min(SEAT_COUNT, party))]
  return { x: xs[Math.max(0, Math.min(xs.length - 1, seat))], z: GUEST_Z }
}

/** Where that guest's saucer goes; its cup stands on the saucer and its spoon lies to the right. */
export function placeSpot(party: number, seat: number): Spot {
  return { x: seatSpot(party, seat).x, z: PLACE_Z }
}

export function spoonSpot(party: number, seat: number): Spot {
  const place = placeSpot(party, seat)
  return { x: place.x + 1.12, z: place.z + 0.12 }
}

/** The tray along the near edge: the pot's stand, the stack of saucers, the spoons, and where the sponge and the bowl come out. */
export const TRAY = {
  pot: { x: 3.3, z: 2.2 },
  saucers: { x: -4.4, z: 2.3 },
  spoons: { x: -2.7, z: 2.45 },
  cups: { x: -0.9, z: 2.35 },
  sponge: { x: 0.9, z: 2.5 },
  bowl: { x: 5.3, z: 1.2 },
} as const

/** A thing set down outside the cloth is brought back to its edge. */
export function onCloth(spot: Spot, margin = 0.3): Spot {
  return {
    x: Math.max(CLOTH.minX + margin, Math.min(CLOTH.maxX - margin, spot.x)),
    z: Math.max(CLOTH.minZ + margin, Math.min(CLOTH.maxZ - margin, spot.z)),
  }
}
