import type { Point } from './input'
import { SNACKS, type Animal, type Snack } from './things'

// Where everything in the square is, in stage units (1180 by 820). The graph
// stands in the middle on one base line; the animals' own places are at its
// sides, so that nobody on the ground ever stands before it.

/** The one size of a square. */
export const CELL = 80
export const BASE = 572
export const COLX = [430, 590, 750] as const
export const ROWS = 6
export const cellAt = (col: number, row: number): Point => ({ x: COLX[col], y: BASE - CELL * (row + 0.5) })

export const PLAQUE = { y: 634, r: 56 } as const
export const plaqueAt = (slot: number): Point => ({ x: COLX[slot], y: PLAQUE.y })

/** Each animal's own place: the ground between its feet, and how large it stands there. */
export const SPOTS: Record<Animal, { x: number; y: number; w: number; h: number; face: 1 | -1 }> = {
  elephant: { x: 148, y: 606, w: 214, h: 236, face: 1 },
  pig: { x: 108, y: 762, w: 150, h: 136, face: 1 },
  mouse: { x: 236, y: 764, w: 104, h: 124, face: 1 },
  giraffe: { x: 1082, y: 616, w: 140, h: 340, face: -1 },
  cat: { x: 896, y: 762, w: 124, h: 176, face: -1 },
  goat: { x: 1060, y: 770, w: 150, h: 186, face: -1 },
}

/** Where each one's thought of what it would like hangs, while it waits on the ground. */
export const THOUGHTS: Record<Animal, Point> = { elephant: { x: 292, y: 392 }, pig: { x: 33, y: 594 }, mouse: { x: 312, y: 652 }, giraffe: { x: 1152, y: 262 }, cat: { x: 968, y: 556 }, goat: { x: 1146, y: 536 } }

/** The wide mouth of the basket, and the ground under it. */
export const BASKET = { x: 590, y: 786, w: 130, h: 70 } as const
export const basketTop: Point = { x: BASKET.x, y: BASKET.y - BASKET.h }

export const SILL_Y = 262
export const SNACK_HOME: Record<Snack, Point> = { carrot: { x: 74, y: SILL_Y - 26 }, cheese: { x: 176, y: SILL_Y - 26 }, bun: { x: 278, y: SILL_Y - 26 } }
/** Where a snack lies at a picture: along its lower edge, each kind in its own place so that none covers another. */
export const snackAt = (snack: Snack, col: number): Point => ({ x: COLX[col] + (SNACKS.indexOf(snack) - 1) * 40, y: PLAQUE.y + 62 })

export const BELL: Point = { x: 934, y: 148 }
export const BELL_R = 58
export const MOLE: Point = { x: 934, y: 300 }
export const MOLE_R = 58
/** The board the mole holds out, with its picture on it. */
export const BOARD = { x: 934, y: 428, w: 124, h: 116 } as const

export const WALL = { x: 336, y: 74, w: 508, h: BASE - 74 } as const
export const HORIZON = 540

/** What a finger can land on. */
export type Target =
  | { kind: 'animal'; who: Animal }
  | { kind: 'snack'; snack: Snack }
  | { kind: 'plaque'; slot: number }
  | { kind: 'column'; col: number }
  | { kind: 'basket' }
  | { kind: 'bell' }
  | { kind: 'mole' }
  | { kind: 'square' }

const near = (at: Point, p: Point, r: number) => Math.hypot(at.x - p.x, at.y - p.y) <= r
const inBox = (at: Point, x: number, y: number, w: number, h: number) => Math.abs(at.x - x) <= w / 2 && at.y <= y && at.y >= y - h

/** Where things stand now, as a touch needs to know it. */
export type Standing = {
  /** Who is on the ground, each at its own place. */
  ground: readonly Animal[]
  columns: readonly (readonly Animal[])[]
  hidden: Animal | null
  snacks: Record<Snack, number | null>
  tools: boolean
}

/** The order is what lies on top: the small things first. */
export function targetAt(at: Point, now: Standing): Target {
  if (now.tools) for (const snack of SNACKS) {
    const col = now.snacks[snack]
    if (near(at, col === null ? SNACK_HOME[snack] : snackAt(snack, col), col === null ? 50 : 24)) return { kind: 'snack', snack }
  }
  for (let col = 0; col < COLX.length; col++) {
    const row = now.columns[col].findIndex((_, r) => Math.abs(at.x - COLX[col]) <= CELL * 0.62 && Math.abs(at.y - cellAt(col, r).y) <= CELL / 2)
    if (row >= 0) return { kind: 'animal', who: now.columns[col][row] }
  }
  for (let slot = 0; slot < COLX.length; slot++) if ((slot < 2 || now.tools) && near(at, plaqueAt(slot), PLAQUE.r)) return { kind: 'plaque', slot }
  if (now.tools && inBox(at, BASKET.x, BASKET.y + 14, BASKET.w, BASKET.h + (now.hidden ? 70 : 24))) return now.hidden ? { kind: 'animal', who: now.hidden } : { kind: 'basket' }
  // The nearest the front is on top.
  for (const who of [...now.ground].sort((a, b) => SPOTS[b].y - SPOTS[a].y)) if (inBox(at, SPOTS[who].x, SPOTS[who].y + 12, SPOTS[who].w, SPOTS[who].h + 12)) return { kind: 'animal', who }
  if (near(at, BELL, BELL_R)) return { kind: 'bell' }
  if (near(at, MOLE, MOLE_R) || inBox(at, BOARD.x, BOARD.y + BOARD.h / 2, BOARD.w, BOARD.h)) return { kind: 'mole' }
  for (let col = 0; col < COLX.length; col++) if (Math.abs(at.x - COLX[col]) <= 80 && at.y > WALL.y - 20 && at.y < BASE) return { kind: 'column', col }
  return { kind: 'square' }
}

/** Where something let go lands. A whole column takes it, its picture too: small hands miss. */
export function dropAt(at: Point, now: Standing): Target {
  for (let col = 0; col < COLX.length; col++) if (Math.abs(at.x - COLX[col]) <= 80 && at.y > WALL.y - 60 && at.y < PLAQUE.y + PLAQUE.r) return { kind: 'column', col }
  if (now.tools && Math.abs(at.x - BASKET.x) <= 120 && at.y >= PLAQUE.y + PLAQUE.r) return { kind: 'basket' }
  return targetAt(at, { ...now, columns: [[], [], []] })
}
