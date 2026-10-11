// The five toys and the measures of the place they are set down in. Plain
// numbers only: the rules (place.ts, island.ts), the camera (camera.ts) and
// the view all read their sizes here, so what is drawn is what is placed.
// Lengths are in the turntable's own units; the land is three of them across
// its radius.

/** The five toys, in the order of their tray slots from left to right. A save keeps them in this order. */
export const KINDS = ['lighthouse', 'boat', 'sheep', 'tree', 'house'] as const
export type Kind = (typeof KINDS)[number]

/** Where a toy is. Only the sheep is ever in the boat. */
export type Where = 'tray' | 'land' | 'sea' | 'boat'

/** One toy as it is saved: where it is, and its place on the turntable (both 0 in the tray and in the boat). */
export type Toy = { kind: Kind; where: Where; x: number; z: number }

/**
 * How much bigger each toy is shown than it was modelled. The small ones are grown so that every toy is a good
 * handful for a two-year-old: none stands less than 1.8 high. The view and the rules both read it here.
 */
export const SIZE: Record<Kind, number> = { lighthouse: 1, boat: 1.2, sheep: 1.4, tree: 1, house: 1.25 }

/** The radius of the ground a toy needs, at the size it is shown. Nothing else stands inside it. */
export const FOOT: Record<Kind, number> = { lighthouse: 0.68, boat: 1.06, sheep: 0.98, tree: 0.8, house: 1.1 }

/**
 * How near the land's edge a toy may stand, as the radius of what it stands on: its legs, its trunk, its hull.
 * The rest of its ground may hang a little way out over the sand.
 */
export const STAND: Record<Kind, number> = { lighthouse: 0.68, boat: 0.92, sheep: 0.85, tree: 0.6, house: 0.95 }

/** The ground a toy needs in the sea, along its ring: the tree floats on its side there, the sheep swims nose first along it, and the house lies low on one side. */
export const SEA_FOOT: Record<Kind, number> = { ...FOOT, tree: 1.3, sheep: 1.12, house: 1.25 }

/** How heavy a toy sounds when it comes down, from 0 (the sheep) to 1 (the lighthouse): the knock is lower the heavier it is. */
export const WEIGHT: Record<Kind, number> = { lighthouse: 1, boat: 0.45, sheep: 0, tree: 0.3, house: 0.75 }

/** How tall a toy stands, for the hand that lifts it and the resident who looks at it. */
export const TALL: Record<Kind, number> = { lighthouse: 3.1, boat: 1.85, sheep: 1.85, tree: 2.1, house: 1.87 }

/**
 * The lid of the frame. The camera keeps the point at `y` above `z` inside the frame at every shape of surface,
 * and the top of the frame leans toward the child from there by `rise` for each unit forward. So whatever stays
 * under the lid is inside the frame: the gull in the smoke and the cat in its leap are held under it.
 */
export const LID = { y: 4.6, z: -2.1, rise: 0.268 }
export const lidAt = (z: number): number => LID.y + (z - LID.z) * LID.rise

/**
 * The home control hangs from the top of the frame in the middle. The cat and the gull, who choose their own
 * way, keep from under it too: over the middle of the world the lid is lower by `drop`, as wide as `half` to
 * each side and back to the full height over `edge`.
 */
export const HOME = { half: 0.6, edge: 0.45, drop: 0.8 }
export const roofAt = (x: number, z: number): number => {
  const u = Math.max(0, Math.min(1, (HOME.half + HOME.edge - Math.abs(x)) / HOME.edge))
  return lidAt(z) - HOME.drop * u * u * (3 - 2 * u)
}

/** The gull is drawn this many times the size it is modelled at, and stands this tall from its feet to its crown. */
export const GULL_SIZE = 0.85
export const GULL_TALL = 1.85

/** How many seats the cat has: six in a ring on the land, the middle, and the back of the rim (place.ts lays them out). */
export const CAT_SEATS = 8

/** The least gap left between two toys' grounds. */
export const GAP = 0.08

// --- The turntable -----------------------------------------------------------

/** The flat top of the island, where toys stand. */
export const LAND_R = 3
/** How high the land stands out of the water. */
export const LAND_Y = 0.3
/** Where the sand meets the water. */
export const SHORE_R = 3.4
/** The ring a toy set down in the sea stands on, all but the boat. */
export const SEA_LANE_R = 4.25
/** The ring the boat sails. Nothing else is ever on it. */
export const BOAT_LANE_R = 5.75
/** The wooden rim: the edge of the turntable, and where a finger turns it. */
export const RIM_IN = 6.25
export const RIM_OUT = 6.75
/** How high the rim's top is above the water. */
export const RIM_TOP = 0.28
/** The pegs on the rim. A tap turns the island by one. */
export const PEGS = 8

// --- The tray ----------------------------------------------------------------

/** The tray lies in front of the turntable, fixed in the world. */
export const TRAY_Z = 8.95
export const SLOT_DX = 2.25
/** How big a toy is in its slot, against its size on the island: the same, so it is as easy to take as to see. */
export const TRAY_SCALE = 1
/** How high the tray's top is above the water: a toy in its slot stands on it. */
export const TRAY_TOP = 0.14
/** Half the tray's size, for the hand that lets a toy go over it. */
export const TRAY_HALF = { x: 5.75, z: 1.15 }

/** The middle of a toy's slot, in the world. */
export function slotOf(kind: Kind): { x: number; z: number } {
  return { x: (KINDS.indexOf(kind) - (KINDS.length - 1) / 2) * SLOT_DX, z: TRAY_Z }
}

/** Whether a point of the world lies over the tray. */
export function overTray(x: number, z: number): boolean {
  return Math.abs(x) <= TRAY_HALF.x && z >= TRAY_Z - TRAY_HALF.z && z <= TRAY_Z + TRAY_HALF.z + 0.5
}

/** A point of the world on the turned island, and back. `turn` is how far the island is turned, in radians. */
export function toIsland(x: number, z: number, turn: number): { x: number; z: number } {
  const c = Math.cos(turn), s = Math.sin(turn)
  return { x: x * c - z * s, z: x * s + z * c }
}

export function toWorld(x: number, z: number, turn: number): { x: number; z: number } {
  const c = Math.cos(turn), s = Math.sin(turn)
  return { x: x * c + z * s, z: -x * s + z * c }
}
