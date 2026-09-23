import type { AnimalKey } from './state'
import { WIDTH } from './state'

// World layout in scene units (y up, z toward the child). The loom stands in
// the middle of a teal blanket on the snow, the cold animal waits on its left,
// the basket of yarn sits on its right, and wrapped animals keep each other
// company on the snowy slope behind.

export type Spot = { x: number; z: number; yaw: number }

/** One colour cell of the scarf on the loom: chunky knit, wider than tall. */
export const CELL_W = 4.2
export const CELL_H = 2.8

export const LOOM = { x: 1, z: -3, rodY: 55.5, postX: 14.5, footY: 0.4 }

/** Where the scarf hangs: its top edge under the rod, centred on the loom. */
export const SCARF = { x: LOOM.x, top: 54, z: LOOM.z + 1.4, halfWidth: (WIDTH * CELL_W) / 2 }

export const BASKET = { x: 34, z: 9, radius: 13.5, rimY: 8.5 }
export const BALL_RADIUS = 4.6

export const BUTTERFLY = { x: LOOM.x + 9.5, y: LOOM.rodY + 3.2, z: LOOM.z + 1.2 }

export const LOOM_SPOT: Spot = { x: -32, z: 7, yaw: 0.32 }
export const ENTRY: Spot = { x: -104, z: 16, yaw: Math.PI / 2 }

/** Each animal's own place on the slope once it is cosy. */
export const HILL_SPOTS: Record<AnimalKey, Spot> = {
  bunny: { x: -74, z: -64, yaw: 0.45 },
  penguin: { x: -46, z: -92, yaw: 0.25 },
  fox: { x: 64, z: -72, yaw: -0.35 },
  bear: { x: 90, z: -98, yaw: -0.5 },
}

/** Snow height: flat where the blanket lies, rising into a gentle slope behind that levels off. */
export function groundY(x: number, z: number): number {
  const back = Math.max(0, -z - 16)
  const roll = Math.min(1, back / 30)
  return 15 * (1 - Math.exp(-back / 62)) + roll * (2.4 * Math.sin(x * 0.045 + 0.6) + 3.4 * Math.sin(x * 0.021 - 0.8) * Math.cos(z * 0.035 + 0.4))
}

/** How tall each animal stands and where its neck (the scarf's home) sits. */
export const BODY: Record<AnimalKey, { height: number; neck: number }> = {
  bunny: { height: 34, neck: 13.9 },
  penguin: { height: 28, neck: 16.2 },
  fox: { height: 27, neck: 13.3 },
  bear: { height: 32, neck: 16.6 },
}

/** Resting place of ball `index` among `count` balls in the basket: a raised back row behind a front row. */
export function ballRest(index: number, count: number): { x: number; y: number; z: number } {
  const front = Math.ceil(count / 2)
  const inFront = index < front
  const rowCount = inFront ? front : count - front
  const slot = inFront ? index : index - front
  const spread = BALL_RADIUS * 2.05
  const x = BASKET.x + (slot - (rowCount - 1) / 2) * spread + (inFront ? 0 : spread * 0.1)
  return inFront ? { x, y: BASKET.rimY + 3.3, z: BASKET.z + 4.2 } : { x, y: BASKET.rimY + 7.4, z: BASKET.z - 3.4 }
}

/** Centre of the scarf's colour cell (row, column) while it hangs on the loom. */
export function cellCentre(row: number, column: number): { x: number; y: number; z: number } {
  return { x: SCARF.x - SCARF.halfWidth + (column + 0.5) * CELL_W, y: SCARF.top - (row + 0.5) * CELL_H, z: SCARF.z }
}

/** The colour cell under a point on the loom plane, or null. */
export function cellAt(x: number, y: number, rows: number): { row: number; column: number } | null {
  const column = Math.floor((x - (SCARF.x - SCARF.halfWidth)) / CELL_W)
  const row = Math.floor((SCARF.top - y) / CELL_H)
  if (column < 0 || column >= WIDTH || row < 0 || row >= rows) return null
  return { row, column }
}

/** The needles sit at the scarf's free edge. */
export function needlesY(rows: number): number {
  return SCARF.top - rows * CELL_H - 0.4
}
