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
export const STEP = { x: -17, z: -8, w: 34, d: 7, top: 3 * PLATE } as const
/** Where a crew of two or of three stands, by the middle of each gobbler. */
export const SLOT_Z = -4.5
export function slotX(slot: number, crew: number): number {
  const gap = crew <= 2 ? 14 : 11
  return (slot - (crew - 1) / 2) * gap
}

/** The shelf behind the back wall's parapet, where the next ones wait. */
export const SHELF = { x: -17, z: -16, w: 34, d: 7, top: 6 * PLATE } as const
/** Where the ones who wait stand, by the middle of each. */
export const WAIT_Z = -12.5
export const WALL = { z: -9, top: 26 * PLATE } as const
export const BACK = { z: -17, top: 50 * PLATE } as const

/** The gantry. The bridge itself runs above the frame; the cable hangs from it. */
export const RAIL = {
  /** The height the cable hangs from. */
  top: 30,
  /** How far the trolley can run. */
  minX: -14,
  maxX: 14,
  minZ: -12.5,
  maxZ: 11,
} as const

/** What the camera frames: the whole cabinet, fitted to the surface whatever its shape. */
export const FRAME = { minX: -17.6, maxX: 17.6, floorZ: 14.2, top: 15, topZ: -15.5 } as const
