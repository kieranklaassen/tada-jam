import { below, makeRng, type Rng } from './rng'

// The garments and the mud on them. Pure: no canvas and no clock.
//
// A garment is an outline in a unit box (x to the right, y down). Its mud is
// a coarse grid over that box, each cell 0 (clean) to 3 (caked), and only the
// cells whose middle lies on the cloth ever hold mud. Mud comes off where the
// finger rubs and nowhere else: a cell loses one step each time the rubbing
// done on it reaches what this cloth asks for.

export const KINDS = ['sock', 'shirt', 'dungarees', 'jumper', 'hat', 'scarf'] as const
export type Kind = (typeof KINDS)[number]

export const COLS = 10
export const ROWS = 10
export const CELLS = COLS * ROWS
/** The deepest a cell's mud goes. */
export const CAKED = 3

type Outline = readonly (readonly [number, number])[]

export const OUTLINES: Record<Kind, Outline> = {
  sock: [[0.28, 0.03], [0.64, 0.03], [0.66, 0.5], [0.94, 0.68], [0.98, 0.86], [0.84, 0.97], [0.42, 0.97], [0.26, 0.84]],
  shirt: [[0.3, 0.05], [0.42, 0.11], [0.58, 0.11], [0.7, 0.05], [0.98, 0.32], [0.86, 0.5], [0.74, 0.4], [0.74, 0.96], [0.26, 0.96], [0.26, 0.4], [0.14, 0.5], [0.02, 0.32]],
  dungarees: [[0.34, 0.03], [0.66, 0.03], [0.66, 0.3], [0.8, 0.34], [0.86, 0.97], [0.57, 0.97], [0.5, 0.58], [0.43, 0.97], [0.14, 0.97], [0.2, 0.34], [0.34, 0.3]],
  jumper: [[0.26, 0.07], [0.4, 0.13], [0.6, 0.13], [0.74, 0.07], [0.99, 0.56], [0.86, 0.68], [0.77, 0.5], [0.79, 0.94], [0.21, 0.94], [0.23, 0.5], [0.14, 0.68], [0.01, 0.56]],
  hat: [[0.13, 0.96], [0.11, 0.72], [0.18, 0.46], [0.33, 0.27], [0.41, 0.21], [0.37, 0.1], [0.5, 0.02], [0.63, 0.1], [0.59, 0.21], [0.67, 0.27], [0.82, 0.46], [0.89, 0.72], [0.87, 0.96]],
  scarf: [[0.03, 0.26], [0.97, 0.26], [0.97, 0.52], [0.32, 0.52], [0.3, 0.74], [0.26, 0.97], [0.05, 0.97], [0.03, 0.74]],
}

/** How much rubbing a cell of this cloth takes before it gives up one step of mud, in strokes of the finger across it. */
export const STROKES: Record<Kind, number> = { sock: 0.7, shirt: 1, dungarees: 1.5, jumper: 1.2, hat: 1, scarf: 0.8 }

/** Whether a point of the unit box lies on the cloth. */
export function onCloth(kind: Kind, u: number, v: number): boolean {
  const outline = OUTLINES[kind]
  let inside = false
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [xi, yi] = outline[i], [xj, yj] = outline[j]
    if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const masks = new Map<Kind, readonly boolean[]>()

/** Which cells of the grid are cloth: those whose middle lies on it. */
export function maskOf(kind: Kind): readonly boolean[] {
  let mask = masks.get(kind)
  if (!mask) {
    mask = Array.from({ length: CELLS }, (_, i) => onCloth(kind, ((i % COLS) + 0.5) / COLS, (Math.floor(i / COLS) + 0.5) / ROWS))
    masks.set(kind, mask)
  }
  return mask
}

export function cleanMud(): number[] {
  return new Array<number>(CELLS).fill(0)
}

/** One dollop: every cloth cell within `radius` of the point is caked, and the ring round it is thinly smeared. Returns the cells it changed. */
export function dollop(mud: number[], kind: Kind, u: number, v: number, radius: number): number[] {
  const mask = maskOf(kind), changed: number[] = []
  for (let i = 0; i < CELLS; i++) {
    if (!mask[i]) continue
    const d = Math.hypot(((i % COLS) + 0.5) / COLS - u, (Math.floor(i / COLS) + 0.5) / ROWS - v)
    const level = d <= radius ? CAKED : d <= radius * 1.6 ? CAKED - 2 : 0
    if (level > mud[i]) {
      mud[i] = level
      changed.push(i)
    }
  }
  return changed
}

/** A point on the cloth, drawn from the stream: the middle of one of its cells. */
export function spotOn(kind: Kind, rng: Rng): { u: number; v: number } {
  const mask = maskOf(kind)
  const cells: number[] = []
  mask.forEach((cloth, i) => { if (cloth) cells.push(i) })
  const i = cells[below(rng, cells.length)]
  return { u: ((i % COLS) + 0.5) / COLS, v: (Math.floor(i / COLS) + 0.5) / ROWS }
}

/** A garment as a friend brings it: three or four dollops, wherever they fall. */
export function muddied(kind: Kind, rng: Rng): number[] {
  const mud = cleanMud()
  const dollops = 3 + below(rng, 2)
  for (let n = 0; n < dollops; n++) {
    const at = spotOn(kind, rng)
    dollop(mud, kind, at.u, at.v, 0.1 + rng.next() * 0.05)
  }
  return mud
}

/** How much mud is left, in steps. */
export function mudLeft(mud: readonly number[]): number {
  let sum = 0
  for (const level of mud) sum += level
  return sum
}

/** The finger's reach on the cloth, in the unit box: a fingertip on a garment a hand wide. */
export const REACH = 0.13

const centre = (i: number): [number, number] => [((i % COLS) + 0.5) / COLS, (Math.floor(i / COLS) + 0.5) / ROWS]

/** The shirt's two cuffs: the cells at the ends of its sleeves, where its mud gathers. */
export function isCuff(i: number): boolean {
  const [u, v] = centre(i)
  return (u < 0.2 || u > 0.8) && v > 0.25 && v < 0.5
}

/** The dungarees' two pockets, where mud hides: a moving finger has to rub twice as far there. */
export function isPocket(i: number): boolean {
  const [u, v] = centre(i)
  return v > 0.4 && v < 0.6 && ((u > 0.2 && u < 0.4) || (u > 0.6 && u < 0.8))
}

/**
 * The finger rubs from one point of the unit box to another (the same point for a dab). `work` holds the rubbing
 * each cell has had since it last gave up a step. Returns the cells that gave up a step, so the view can throw
 * their threads; an empty list means the finger met no mud.
 *
 * Each cloth takes it its own way. A scarf is pulled across the board, so its mud comes off as a stripe the whole
 * height of the cloth under the finger. Mud rubbed off the body of a shirt gathers in the nearer cuff and has to
 * be chased there. Mud in the pockets of the dungarees takes twice the rubbing from a finger that moves, and a dab
 * lifts a step of it like any other.
 */
export function rub(mud: number[], work: number[], kind: Kind, u0: number, v0: number, u1: number, v1: number): number[] {
  const mask = maskOf(kind), lifted: number[] = []
  const length = Math.hypot(u1 - u0, v1 - v0)
  // A dab is worth one whole stroke, so a child who only taps gets there; a rub is worth its length across a cell.
  const effort = length === 0 ? STROKES[kind] : length / (1 / COLS)
  for (let i = 0; i < CELLS; i++) {
    if (!mask[i] || mud[i] <= 0) continue
    const [cu, cv] = centre(i)
    const near = kind === 'scarf' ? Math.abs(cu - clamp(cu, Math.min(u0, u1), Math.max(u0, u1))) <= REACH * 0.6 : distanceToSegment(cu, cv, u0, v0, u1, v1) <= REACH
    if (!near) continue
    work[i] += effort
    // A finger that moves slides over a pocket and has to go twice as far there; a dab presses into it, and lifts a step as it does anywhere.
    const asks = STROKES[kind] * (kind === 'dungarees' && isPocket(i) && length > 0 ? 2 : 1)
    if (work[i] >= asks) {
      work[i] = 0
      mud[i] -= 1
      lifted.push(i)
    }
  }
  if (kind === 'shirt') {
    for (const i of lifted) {
      if (isCuff(i)) continue
      const left = centre(i)[0] < 0.5
      const cuff = mud.findIndex((level, cell) => mask[cell] && isCuff(cell) && centre(cell)[0] < 0.5 === left && level < CAKED)
      if (cuff >= 0) mud[cuff] += 1
    }
  }
  return lifted
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

/** The patches of mud on a cloth: the middle of each run of muddy cells that touch, the largest first. */
export function patches(mud: readonly number[]): { u: number; v: number; cells: number }[] {
  const seen = new Array<boolean>(CELLS).fill(false), found: { u: number; v: number; cells: number }[] = []
  for (let start = 0; start < CELLS; start++) {
    if (seen[start] || mud[start] <= 0) continue
    const run = [start]
    seen[start] = true
    let su = 0, sv = 0
    for (let n = 0; n < run.length; n++) {
      const i = run[n], x = i % COLS, y = Math.floor(i / COLS)
      su += centre(i)[0]; sv += centre(i)[1]
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy, j = ny * COLS + nx
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || seen[j] || mud[j] <= 0) continue
        seen[j] = true
        run.push(j)
      }
    }
    found.push({ u: su / run.length, v: sv / run.length, cells: run.length })
  }
  return found.sort((a, b) => b.cells - a.cells)
}

function distanceToSegment(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0, dy = y1 - y0
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / length))
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))
}

/** The grid as a save holds it: one digit a cell. */
export function encodeMud(mud: readonly number[]): string {
  return mud.map((level) => String(Math.max(0, Math.min(CAKED, Math.round(level))))).join('')
}

/** Reads a saved grid back. Anything that is not this grid gives null; mud that lies off the cloth is dropped. */
export function decodeMud(raw: unknown, kind: Kind): number[] | null {
  if (typeof raw !== 'string' || raw.length !== CELLS || !/^[0-3]+$/.test(raw)) return null
  const mask = maskOf(kind)
  return Array.from(raw, (digit, i) => (mask[i] ? Number(digit) : 0))
}

/** The most knots of suds a cloth carries, when it is as soapy as it gets. */
export const MAX_KNOTS = 46

/**
 * The suds a garment has, as knots on its cloth in the unit box (`r` is a share of the cloth's width): the same
 * knots each time for the same cloth and the same suds, so they stay on the garment wherever it goes and a yard
 * that is opened again looks as it was left. `suds` is 0 to 10.
 */
export function sudsKnots(kind: Kind, suds: number): { u: number; v: number; r: number }[] {
  const stream = makeRng(0x51ed + KINDS.indexOf(kind))
  const count = Math.round((Math.max(0, Math.min(10, suds)) / 10) * MAX_KNOTS)
  const knots: { u: number; v: number; r: number }[] = []
  for (let n = 0; n < count; n++) {
    const at = spotOn(kind, stream)
    knots.push({ u: at.u + (stream.next() - 0.5) * 0.08, v: at.v + (stream.next() - 0.5) * 0.08, r: 0.025 + stream.next() * 0.03 })
  }
  return knots
}
