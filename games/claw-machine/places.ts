import { PLATE } from './bricks'

// Where things stand in the cabinet, in studs (x to the child's right, z
// toward the child) and world heights. The rules, the claw and the view all
// read the cabinet from here, so nothing is placed twice.

/** The tray the toys stand on: five places across and two deep. */
export const TRAY = {
  columns: 5,
  rows: 2,
  /** One place, in studs. */
  cell: 6,
  /** The low corner of the tray, and the height of its top. */
  x: -15,
  z: 0,
  top: 1 * PLATE,
} as const

export const TRAY_WIDTH = TRAY.columns * TRAY.cell
export const TRAY_DEPTH = TRAY.rows * TRAY.cell
export const PLACES = TRAY.columns * TRAY.rows

/** The middle of a place on the tray. Places count along the back row first. */
export function placeAt(place: number): { x: number; z: number } {
  const column = place % TRAY.columns, row = Math.floor(place / TRAY.columns)
  return { x: TRAY.x + (column + 0.5) * TRAY.cell, z: TRAY.z + (row + 0.5) * TRAY.cell }
}

/** The place under a point of the tray, or -1 off the tray. */
export function placeUnder(x: number, z: number): number {
  const column = Math.floor((x - TRAY.x) / TRAY.cell), row = Math.floor((z - TRAY.z) / TRAY.cell)
  if (column < 0 || column >= TRAY.columns || row < 0 || row >= TRAY.rows) return -1
  return row * TRAY.columns + column
}

/** The step the gobblers stand on, behind the tray. */
export const STEP = { x: -17, z: -10, w: 34, d: 9, top: 3 * PLATE } as const
/** Where a crew of two or of three stands, by the middle of each gobbler. */
export const SLOT_Z = -4.5
export function slotX(slot: number, crew: number): number {
  const gap = crew <= 2 ? 14 : 12
  return (slot - (crew - 1) / 2) * gap
}

/**
 * The shelf behind the parapet, where the next ones wait. It lies below the floor of the cabinet, so that a
 * gobbler standing on it shows only its eyes over the parapet, and the back of the cabinet stays low.
 */
export const SHELF = { x: -17, z: -21, w: 34, d: 10, top: -6 * PLATE } as const
/** Where the ones who wait stand, by the middle of each. */
export const WAIT_Z = -15.2
/** The parapet stands a little way behind the crew, so a gobbler has room to reel back from a toy. */
export const WALL = { z: -11, top: 13 * PLATE } as const
export const BACK = { z: -22, top: 50 * PLATE } as const

/** The rail the trolley runs on. It is above the frame and is not drawn; the cable hangs from it. */
export const RAIL = {
  /** The height the cable hangs from. */
  top: 30,
  /** How far the trolley can run. */
  minX: -17,
  maxX: 17,
  minZ: -16,
  maxZ: 11,
} as const

/** What the camera frames: the whole cabinet, fitted to the surface whatever its shape. */
export const FRAME = { minX: -18.6, maxX: 18.6, floorZ: 14.2, top: 12.2, topZ: -16 } as const

/** The bell post at either end of the rail: a post with a bell on it, beside the tray. */
export const BELL = { x: 17, z: 6, half: 1, top: 11 * PLATE } as const

/** The gate of the ledge, in the middle of the parapet: what the claw hooks to bring the next ones in. */
export const GATE = { x: 0, z: -10.5, half: 3, top: 16 * PLATE } as const

/** Where a crate stands on the ledge: the only one in the middle, or two side by side. */
export const CRATE = { z: -14.6, width: 13, depth: 6.4, deck: 14 * PLATE, apart: 8.6 } as const
export function crateX(which: number, crates: number): number {
  return crates < 2 ? 0 : (which === 0 ? -1 : 1) * CRATE.apart
}
