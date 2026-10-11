import type { Point } from './input'

// Where things stand on the stage (stage.ts: 1180 by 820 units). The hill is
// a grid of blocks under a strip of cave wall. Above it, on the grass, stand
// the mammoth and the lift at the left, the mouth of the burrow in the middle
// and the three tools to the right. Everything a touch can mean is decided
// from the numbers here, so the rules and the view agree on it.

/** The side of one block, in stage units. */
export const CELL = 90
export const COLS = 13
export const ROWS = 7
export const BLOCKS = COLS * ROWS
/** The top left of the hill. The grass line is its top edge. */
export const HILL = { x: 5, y: 190 } as const
/** The burrow the mole starts in: dug from the first moment, with its mouth in the grass above. It is never filled in. */
export const BURROW = { c: 6, r: 0 } as const

export type Cell = { c: number; r: number }

export const indexOf = (c: number, r: number): number => r * COLS + c
export const cellOf = (index: number): Cell => ({ c: index % COLS, r: Math.floor(index / COLS) })
export const inHill = (c: number, r: number): boolean => c >= 0 && c < COLS && r >= 0 && r < ROWS

/** The block the burrow is. */
export const BURROW_INDEX = indexOf(BURROW.c, BURROW.r)

// A place the mole can stand is a node: one of the 91 blocks, or a stretch of
// grass above a column. The grass can be walked from the cage of the lift to
// the right edge; the mammoth stands on the rest.

/** The leftmost column whose grass can be stood on: the cage of the lift hangs there. */
export const GRASS_FROM = 4
export const grassNode = (c: number): number => BLOCKS + c
export const isGrass = (node: number): boolean => node >= BLOCKS
/** The node that is the lift's cage. */
export const CAGE = grassNode(GRASS_FROM)
/** The column a node is in. */
export const colOf = (node: number): number => (isGrass(node) ? node - BLOCKS : node % COLS)
/** The row a node is in; the grass is row -1. */
export const rowOf = (node: number): number => (isGrass(node) ? -1 : Math.floor(node / COLS))
/** Whether a column and row name a node: a block, or grass that can be stood on. */
export const isNode = (c: number, r: number): boolean => (r === -1 ? c >= GRASS_FROM && c < COLS : inHill(c, r))
export const nodeOf = (c: number, r: number): number => (r === -1 ? grassNode(c) : indexOf(c, r))

/** The four blocks beside a block, as indexes: below, left, right, above. */
export function beside(index: number): number[] {
  const { c, r } = cellOf(index)
  const out: number[] = []
  for (const [dc, dr] of [[0, 1], [-1, 0], [1, 0], [0, -1]] as const) if (inHill(c + dc, r + dr)) out.push(indexOf(c + dc, r + dr))
  return out
}

/** The nodes one step from a node. The grass meets the hill at the mouth of the burrow and nowhere else. */
export function stepsFrom(node: number): number[] {
  if (!isGrass(node)) return node === BURROW_INDEX ? [...beside(node), grassNode(BURROW.c)] : beside(node)
  const c = colOf(node)
  const out: number[] = []
  if (c === BURROW.c) out.push(BURROW_INDEX)
  if (c - 1 >= GRASS_FROM) out.push(grassNode(c - 1))
  if (c + 1 < COLS) out.push(grassNode(c + 1))
  return out
}

/** How many steps apart two nodes are as the crow flies, a step up to the grass counting as one. */
export function apart(a: number, b: number): number {
  return Math.abs(colOf(a) - colOf(b)) + Math.abs(rowOf(a) - rowOf(b))
}

/** The block a point of the stage is in, or null above the grass and past the hill's edges. */
export function cellAt(at: Point): Cell | null {
  const c = Math.floor((at.x - HILL.x) / CELL), r = Math.floor((at.y - HILL.y) / CELL)
  return inHill(c, r) ? { c, r } : null
}

/** The block nearest a point, for a finger that has slid off the hill while it digs. */
export function nearestCell(at: Point): Cell {
  const c = Math.floor((at.x - HILL.x) / CELL), r = Math.floor((at.y - HILL.y) / CELL)
  return { c: Math.max(0, Math.min(COLS - 1, c)), r: Math.max(0, Math.min(ROWS - 1, r)) }
}

/** The middle of a block. */
export function centre(c: number, r: number): Point {
  return { x: HILL.x + (c + 0.5) * CELL, y: HILL.y + (r + 0.5) * CELL }
}

/** The top left corner of a block. */
export function corner(index: number): Point {
  const { c, r } = cellOf(index)
  return { x: HILL.x + c * CELL, y: HILL.y + r * CELL }
}

export type Box = { x: number; y: number; w: number; h: number }
export const inBox = (at: Point, box: Box): boolean => at.x >= box.x && at.x <= box.x + box.w && at.y >= box.y && at.y <= box.y + box.h
export const boxesCross = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** How far above the bottom of his block the mole's feet are. */
export const FLOOR = 4
/** The floor of the cage as it hangs at rest, in stage units from the top. */
export const CAGE_FLOOR = HILL.y - 8

/** Where the mole's feet are when he stands in a node: the bottom middle of a block, the grass line, or the floor of the cage. */
export function feetOf(node: number): Point {
  const x = HILL.x + (colOf(node) + 0.5) * CELL
  if (node === CAGE) return { x, y: CAGE_FLOOR }
  if (isGrass(node)) return { x, y: HILL.y - 2 }
  return { x, y: HILL.y + (rowOf(node) + 1) * CELL - FLOOR }
}

/** The mammoth, which keeps the lift: it stands on the grass at the far left, facing the lift, with the tip of its trunk at the crank. */
export const MAMMOTH: Box = { x: 14, y: 18, w: 326, h: 172 }
/** The lift: its frame with the crank on its left post, and the cage that hangs in it above column 4. A touch on it is a touch on the lift. */
export const LIFT: Box = { x: 340, y: 30, w: 126, h: 160 }
/** The strip of grass the mole walks on, as a finger finds it: from the lift's right post to the right edge. */
export const GRASS: Box = { x: LIFT.x + LIFT.w, y: 132, w: HILL.x + COLS * CELL - LIFT.x - LIFT.w, h: HILL.y - 132 }

/** The molehill at the mouth of the burrow, as it is painted on the grass. */
export const MOLEHILL: Box = { x: HILL.x + (BURROW.c + 0.5) * CELL - 48, y: HILL.y - 27, w: 96, h: 30 }

/** The three painted animals on the wall above the grass whose heads are alive: where each stands. */
export const BEASTS = [{ x: 600 }, { x: 800 }, { x: 1010 }] as const

/** The columns the mammoth's feet stand above: the hind foot and the fore foot. */
export const MAMMOTH_FEET = { hind: [0, 1], fore: [2, 3] } as const

export type Tool = 'wedge' | 'bucket' | 'rope'
export const TOOLS: readonly Tool[] = ['wedge', 'bucket', 'rope']
/** Where each tool lies on the grass on every fresh hillside. */
export const TOOL_HOME: Record<Tool, number> = { wedge: grassNode(8), bucket: grassNode(10), rope: grassNode(12) }

/**
 * The jam draws one round home control over every game: 48 px across, at the top centre of the surface, 10 px
 * from its top edge. This is where it lies in stage units on a surface of the given size in CSS pixels
 * (the fit is the one stage.ts makes: the stage scaled to fit and centred).
 */
export function homeControl(width: number, height: number, stage: { width: number; height: number }): Box {
  const scale = Math.min(width / stage.width, height / stage.height)
  const x = (width - stage.width * scale) / 2, y = (height - stage.height * scale) / 2
  return { x: (width / 2 - 24 - x) / scale, y: (10 - y) / scale, w: 48 / scale, h: 48 / scale }
}
