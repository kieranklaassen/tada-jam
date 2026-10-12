import { beadIndex, beadIndexOf, type BeadKey } from './palette'

// A plaque: a flat figure of fused beads, one bead to a peg. It is a grid of
// colour numbers and nothing else, so a figure is drawn here as rows of
// characters or with a few plain shapes, and a test can count its beads.
// Rows run from the top down, as they are written.

export type Plaque = {
  readonly w: number
  readonly h: number
  /** Row by row from the top: a colour's number (palette.ts), or 0 for an empty peg. */
  readonly cells: Uint8Array
}

export function blank(w: number, h: number): Plaque {
  return { w, h, cells: new Uint8Array(w * h) }
}

/** A plaque from drawn rows: one character a peg, a bead key or anything else for an empty peg. Short rows are padded on the right. */
export function fromRows(rows: readonly string[]): Plaque {
  const w = Math.max(...rows.map((row) => row.length))
  const plaque = blank(w, rows.length)
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) plaque.cells[y * w + x] = beadIndexOf(row[x])
  })
  return plaque
}

export function at(plaque: Plaque, x: number, y: number): number {
  return x < 0 || y < 0 || x >= plaque.w || y >= plaque.h ? 0 : plaque.cells[y * plaque.w + x]
}

/** Puts one bead, or takes it away with `null`. A peg off the plaque is ignored. */
export function put(plaque: Plaque, x: number, y: number, key: BeadKey | null): void {
  if (x < 0 || y < 0 || x >= plaque.w || y >= plaque.h) return
  plaque.cells[y * plaque.w + x] = key === null ? 0 : beadIndex(key)
}

/** Fills the pegs whose middles lie inside an oval. */
export function oval(plaque: Plaque, cx: number, cy: number, rx: number, ry: number, key: BeadKey | null): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry
      if (dx * dx + dy * dy <= 1) put(plaque, x, y, key)
    }
  }
}

/** Fills a box of pegs, both corners included. */
export function box(plaque: Plaque, x0: number, y0: number, x1: number, y1: number, key: BeadKey | null): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(plaque, x, y, key)
}

/** Fills a triangle that stands on its base: `half` pegs each side of `cx` at `baseY`, narrowing to one peg at `topY`. */
export function peak(plaque: Plaque, cx: number, topY: number, baseY: number, half: number, key: BeadKey | null): void {
  for (let y = topY; y <= baseY; y++) {
    const reach = Math.round((half * (y - topY)) / Math.max(1, baseY - topY))
    for (let x = cx - reach; x <= cx + reach; x++) put(plaque, x, y, key)
  }
}

/** Lays `src` onto `dst` with its top left peg at `x`, `y`; its empty pegs leave `dst` as it was. */
export function stamp(dst: Plaque, src: Plaque, x: number, y: number): void {
  for (let sy = 0; sy < src.h; sy++) {
    for (let sx = 0; sx < src.w; sx++) {
      const cell = src.cells[sy * src.w + sx]
      const dx = x + sx, dy = y + sy
      if (cell !== 0 && dx >= 0 && dy >= 0 && dx < dst.w && dy < dst.h) dst.cells[dy * dst.w + dx] = cell
    }
  }
}

/** The same figure facing the other way. */
export function mirrored(plaque: Plaque): Plaque {
  const out = blank(plaque.w, plaque.h)
  for (let y = 0; y < plaque.h; y++) for (let x = 0; x < plaque.w; x++) out.cells[y * plaque.w + (plaque.w - 1 - x)] = plaque.cells[y * plaque.w + x]
  return out
}

/**
 * The figure with a line of beads round it: one peg larger on every side, and every empty peg that touches a
 * bead by an edge filled with `key`. A character gets a dark line so that its shape reads from across a room.
 */
export function outlined(plaque: Plaque, key: BeadKey): Plaque {
  const out = blank(plaque.w + 2, plaque.h + 2)
  const line = beadIndex(key)
  for (let y = 0; y < out.h; y++) {
    for (let x = 0; x < out.w; x++) {
      const own = at(plaque, x - 1, y - 1)
      if (own !== 0) out.cells[y * out.w + x] = own
      else if (at(plaque, x - 2, y - 1) || at(plaque, x, y - 1) || at(plaque, x - 1, y - 2) || at(plaque, x - 1, y)) out.cells[y * out.w + x] = line
    }
  }
  return out
}

/** How many beads the plaque holds. */
export function beadCount(plaque: Plaque): number {
  let n = 0
  for (const cell of plaque.cells) if (cell !== 0) n++
  return n
}

/** Whether every bead can be reached from every other through beads that touch by an edge: a plaque in two pieces would fall apart off the board. */
export function inOnePiece(plaque: Plaque): boolean {
  const start = plaque.cells.findIndex((cell) => cell !== 0)
  if (start < 0) return false
  const seen = new Uint8Array(plaque.cells.length)
  const stack = [start]
  seen[start] = 1
  let reached = 0
  while (stack.length > 0) {
    const i = stack.pop()!
    reached++
    const x = i % plaque.w, y = (i - x) / plaque.w
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
      if (nx < 0 || ny < 0 || nx >= plaque.w || ny >= plaque.h) continue
      const n = ny * plaque.w + nx
      if (plaque.cells[n] !== 0 && !seen[n]) {
        seen[n] = 1
        stack.push(n)
      }
    }
  }
  return reached === beadCount(plaque)
}
