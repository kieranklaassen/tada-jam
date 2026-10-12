// The face of a box as a grid of cells: 1 where the board is gone. Whatever
// the scissors cut is taken out of this grid, the grid is what is saved, and
// the view draws nothing but this grid, so a fort is found cut exactly as it
// was left. Cuts join where they cross with no further rule.

export type Face = { cols: number; rows: number; gone: Uint8Array }
export type Cell = { x: number; y: number }

/** A cut never reaches the outermost cells, so a face keeps its frame. */
export const RIM = 2
/** Half the width of the slit the blades leave, in cells: a cut that encloses nothing is still a hole. */
export const SLIT = 1.2
/** The radius of the peep-hole a tap pokes, in cells. */
export const POKE = 6.5

export function blank(cols: number, rows: number): Face {
  return { cols, rows, gone: new Uint8Array(cols * rows) }
}

/** Keeps a point of a cut inside the frame. */
export function inFrame(face: Face, at: Cell): Cell {
  return { x: Math.min(face.cols - RIM - 0.5, Math.max(RIM + 0.5, at.x)), y: Math.min(face.rows - RIM - 0.5, Math.max(RIM + 0.5, at.y)) }
}

const cuttable = (face: Face, x: number, y: number): boolean => x >= RIM && y >= RIM && x < face.cols - RIM && y < face.rows - RIM

function take(face: Face, x: number, y: number): number {
  if (!cuttable(face, x, y)) return 0
  const index = y * face.cols + x
  if (face.gone[index]) return 0
  face.gone[index] = 1
  return 1
}

/** Takes out a round hole. Returns how many cells went. */
export function poke(face: Face, at: Cell, radius = POKE): number {
  let taken = 0
  for (let y = Math.floor(at.y - radius); y <= at.y + radius; y++)
    for (let x = Math.floor(at.x - radius); x <= at.x + radius; x++)
      if (Math.hypot(x + 0.5 - at.x, y + 0.5 - at.y) <= radius) taken += take(face, x, y)
  return taken
}

function slit(face: Face, a: Cell, b: Cell): number {
  let taken = 0
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy
  for (let y = Math.floor(Math.min(a.y, b.y) - SLIT); y <= Math.max(a.y, b.y) + SLIT; y++)
    for (let x = Math.floor(Math.min(a.x, b.x) - SLIT); x <= Math.max(a.x, b.x) + SLIT; x++) {
      const px = x + 0.5 - a.x, py = y + 0.5 - a.y
      const along = length2 > 0 ? Math.min(1, Math.max(0, (px * dx + py * dy) / length2)) : 0
      if (Math.hypot(px - dx * along, py - dy * along) <= SLIT) taken += take(face, x, y)
    }
  return taken
}

/** Takes out the slit of a line that encloses nothing: the stretch the blades went before the line closed. */
export function slitAlong(face: Face, path: readonly Cell[]): number {
  let taken = 0
  for (let i = 0; i + 1 < path.length; i++) taken += slit(face, path[i], path[i + 1])
  return taken
}

/**
 * Takes out what a cut encloses: the path the blades went, closed straight back to where it began, and
 * everything inside it. A path that crosses itself takes every part it goes round. Returns how many cells went.
 */
export function cut(face: Face, path: readonly Cell[]): number {
  if (path.length === 0) return 0
  let taken = 0
  const n = path.length
  for (let i = 0; i < n; i++) taken += slit(face, path[i], path[(i + 1) % n])
  if (n < 3) return taken
  let low = Infinity, high = -Infinity
  for (const p of path) { low = Math.min(low, p.y); high = Math.max(high, p.y) }
  const crossings: { x: number; turn: number }[] = []
  for (let y = Math.floor(low); y <= Math.floor(high); y++) {
    const at = y + 0.5
    crossings.length = 0
    for (let i = 0; i < n; i++) {
      const a = path[i], b = path[(i + 1) % n]
      if ((a.y <= at) === (b.y <= at)) continue
      crossings.push({ x: a.x + ((at - a.y) / (b.y - a.y)) * (b.x - a.x), turn: b.y > a.y ? 1 : -1 })
    }
    crossings.sort((p, q) => p.x - q.x)
    let winding = 0
    for (let i = 0; i + 1 < crossings.length; i++) {
      winding += crossings[i].turn
      if (winding === 0) continue
      for (let x = Math.ceil(crossings[i].x - 0.5); x + 0.5 < crossings[i + 1].x; x++) taken += take(face, x, y)
    }
  }
  return taken
}

/** The share of the face that is gone, 0 to 1. */
export function goneShare(face: Face): number {
  let gone = 0
  for (const cell of face.gone) gone += cell
  return gone / face.gone.length
}

export function isGone(face: Face, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < face.cols && y < face.rows && face.gone[y * face.cols + x] === 1
}

export type Opening = {
  /** The middle of the widest round part of the hole, in cells. */
  x: number
  y: number
  /** Its radius in cells. */
  radius: number
  /** The cell at that middle. */
  cell: number
  /** The hole's own box: its lowest and highest rows, its leftmost and rightmost columns. */
  low: number
  high: number
  left: number
  right: number
}

/** How far each cell of a hole is from the nearest board, by two sweeps. */
function depths(face: Face): Float32Array {
  const { cols, rows, gone } = face
  const far = new Float32Array(cols * rows)
  const near = (x: number, y: number): number => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : far[y * cols + x])
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      far[i] = gone[i] ? Math.min(near(x - 1, y) + 1, near(x, y - 1) + 1, near(x - 1, y - 1) + 1.414, near(x + 1, y - 1) + 1.414) : 0
    }
  for (let y = rows - 1; y >= 0; y--)
    for (let x = cols - 1; x >= 0; x--) {
      const i = y * cols + x
      if (gone[i]) far[i] = Math.min(far[i], near(x + 1, y) + 1, near(x, y + 1) + 1, near(x + 1, y + 1) + 1.414, near(x - 1, y + 1) + 1.414)
    }
  return far
}

/** The hole that `cell` belongs to, by flooding from it. `seen` marks every cell of it. */
function flood(face: Face, far: Float32Array, seen: Uint8Array, cell: number): Opening {
  const { cols, rows, gone } = face, stack = [cell]
  seen[cell] = 1
  let best = cell, low = rows, high = 0, left = cols, right = 0
  while (stack.length > 0) {
    const i = stack.pop()!
    if (far[i] > far[best]) best = i
    const x = i % cols, y = (i - x) / cols
    low = Math.min(low, y); high = Math.max(high, y); left = Math.min(left, x); right = Math.max(right, x)
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      const next = ny * cols + nx
      if (gone[next] && !seen[next]) { seen[next] = 1; stack.push(next) }
    }
  }
  const x = best % cols
  return { x: x + 0.5, y: (best - x) / cols + 0.5, radius: far[best] - 0.5, cell: best, low, high, left, right }
}

/**
 * The widest round part of the hole that `cell` belongs to: where a head would go through, and how big a head.
 * Null when that cell is board.
 */
export function opening(face: Face, cell: number): Opening | null {
  if (cell < 0 || cell >= face.gone.length || !face.gone[cell]) return null
  return flood(face, depths(face), new Uint8Array(face.gone.length), cell)
}

/** Every hole of a face, each once. */
export function openings(face: Face): Opening[] {
  const far = depths(face), seen = new Uint8Array(face.gone.length), found: Opening[] = []
  for (let cell = 0; cell < face.gone.length; cell++) if (face.gone[cell] && !seen[cell]) found.push(flood(face, far, seen, cell))
  return found
}

/** Which hole each cell belongs to: 0 for board, and for a hole its place in `openings` plus one. */
export function labels(face: Face): Uint8Array {
  const far = new Float32Array(face.gone.length).fill(1), seen = new Uint8Array(face.gone.length), marks = new Uint8Array(face.gone.length)
  let count = 0
  for (let cell = 0; cell < face.gone.length; cell++) {
    if (!face.gone[cell] || seen[cell]) continue
    const before = seen.slice()
    flood(face, far, seen, cell)
    count = Math.min(255, count + 1)
    for (let i = 0; i < seen.length; i++) if (seen[i] && !before[i]) marks[i] = count
  }
  return marks
}

/** Puts fresh board back: every cell is whole again. */
export function mend(face: Face): void {
  face.gone.fill(0)
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** The grid as text, six cells to a character. */
export function encode(face: Face): string {
  let text = ''
  for (let i = 0; i < face.gone.length; i += 6) {
    let six = 0
    for (let bit = 0; bit < 6; bit++) if (face.gone[i + bit]) six |= 1 << bit
    text += ALPHABET[six]
  }
  return text
}

/** The grid back from its text, or null when the text is not a grid of this size. A cell outside the frame is never read as gone. */
export function decode(text: unknown, cols: number, rows: number): Face | null {
  const face = blank(cols, rows)
  if (typeof text !== 'string' || text.length !== Math.ceil(face.gone.length / 6)) return null
  for (let i = 0; i < text.length; i++) {
    const six = ALPHABET.indexOf(text[i])
    if (six < 0) return null
    for (let bit = 0; bit < 6; bit++) {
      const cell = i * 6 + bit
      if (cell < face.gone.length && six & (1 << bit) && cuttable(face, cell % cols, Math.floor(cell / cols))) face.gone[cell] = 1
    }
  }
  return face
}
