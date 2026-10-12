// The peg board: its holes, which hole a touch belongs to, the echoes of a
// hole across the mirrors, and where the moth may sit. Pure numbers in stage
// units (stage.ts); nothing here draws or keeps state.

export const COLS = 11
export const ROWS = 7
export const HOLES = COLS * ROWS
/** The distance between two holes, and so the size of a hole's own cell. */
export const PITCH = 64
/** The centre of the top left hole. */
export const ORIGIN = { x: 246, y: 140 } as const
/** A peg's head as drawn. Its glow stays inside its own cell. */
export const PEG_RADIUS = 23

/** The board's own rectangle: every cell of every hole. A touch inside it belongs to a hole. */
export const BOARD = {
  x: ORIGIN.x - PITCH / 2,
  y: ORIGIN.y - PITCH / 2,
  width: COLS * PITCH,
  height: ROWS * PITCH,
} as const

/** The five kinds of peg. A cell of the board holds 0 for an empty hole or one of these. */
export const RED = 1, BLUE = 2, YELLOW = 3, GREEN = 4, WHITE = 5
export type Colour = 1 | 2 | 3 | 4 | 5
export const COLOURS: readonly Colour[] = [RED, BLUE, YELLOW, GREEN, WHITE]

/** 0 for none, 1 for two ways (left and right), 2 for four ways (left, right, up and down). */
export type Mirror = 0 | 1 | 2

export function isColour(value: unknown): value is Colour {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5
}

export function colOf(hole: number): number {
  return hole % COLS
}

export function rowOf(hole: number): number {
  return Math.floor(hole / COLS)
}

export function holeAt(col: number, row: number): number {
  return row * COLS + col
}

/** The centre of a hole. */
export function centreOf(hole: number): { x: number; y: number } {
  return { x: ORIGIN.x + colOf(hole) * PITCH, y: ORIGIN.y + rowOf(hole) * PITCH }
}

export function inBoard(x: number, y: number): boolean {
  return x >= BOARD.x && x < BOARD.x + BOARD.width && y >= BOARD.y && y < BOARD.y + BOARD.height
}

/** The hole whose cell holds the point, or -1 outside the board. */
export function holeUnder(x: number, y: number): number {
  if (!inBoard(x, y)) return -1
  return holeAt(Math.floor((x - BOARD.x) / PITCH), Math.floor((y - BOARD.y) / PITCH))
}

/**
 * The holes a finger crosses going from one point to another, in order and without repeats, the first point's
 * own hole left out. A fast drag skips no hole: the line is walked in steps shorter than a cell.
 */
export function holesAlong(fromX: number, fromY: number, toX: number, toY: number): number[] {
  const out: number[] = []
  const first = holeUnder(fromX, fromY)
  const steps = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toY - fromY) / (PITCH / 4)))
  let last = first
  for (let i = 1; i <= steps; i++) {
    const hole = holeUnder(fromX + ((toX - fromX) * i) / steps, fromY + ((toY - fromY) * i) / steps)
    if (hole < 0 || hole === last) continue
    last = hole
    if (hole !== first && !out.includes(hole)) out.push(hole)
  }
  return out
}

/** The hole and its echoes across the mirror lines, the hole itself first and none twice. */
export function echoes(hole: number, mirror: Mirror): number[] {
  const out = [hole]
  if (mirror === 0) return out
  const col = colOf(hole), row = rowOf(hole)
  const add = (c: number, r: number) => {
    const echo = holeAt(c, r)
    if (!out.includes(echo)) out.push(echo)
  }
  add(COLS - 1 - col, row)
  if (mirror === 2) {
    add(col, ROWS - 1 - row)
    add(COLS - 1 - col, ROWS - 1 - row)
  }
  return out
}

/** How much room the moth takes where it sits, as a radius: it is drawn inside this, clear of every peg and hole mark. */
export const MOTH_RADIUS = 21
/** A touch this near the place the moth sits is a tap on the moth: as wide as a hole's cell, so it is 48 pixels or more wherever a hole is. */
export const MOTH_TOUCH = 32
/** The radius of the dark pit that marks an empty hole. */
export const HOLE_MARK = 8

/**
 * Where the moth sits beside a hole: the corner where four cells meet, up and to the right when the board has
 * one there, and otherwise the nearest corner that it has. A corner is as far from every hole as the board
 * allows, so the moth at rest covers no peg and no hole.
 */
export function perchOf(hole: number): { x: number; y: number } {
  const col = colOf(hole), row = rowOf(hole)
  const right = col < COLS - 1 ? 1 : -1
  const up = row > 0 ? -1 : 1
  const centre = centreOf(hole)
  return { x: centre.x + (right * PITCH) / 2, y: centre.y + (up * PITCH) / 2 }
}

/** The step of the scale a row sounds, 0 for the bottom row: higher rows sound higher. */
export function stepOf(hole: number): number {
  return ROWS - 1 - rowOf(hole)
}
