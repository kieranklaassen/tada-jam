import { VALUES, WATER, isPot } from './colours'

// What lies on the water, read off the grid: what a tool has landed in (the
// rows of the sheet's grid), how much of each colour there is (the cat's
// tastes go by it), and the small copy of the water that a print is.
// Places are in cells.

/** The states of the water a touch can land in: the rows of the grid in ART.md. */
export type WaterState = 'plain' | 'bloom' | 'rings' | 'two' | 'mix'

/** How far round a touch its state is read, the two distances small rings are looked for at, and how far out the ring round a full-grown bloom lies. */
export const NEAR = { reach: 9, inner: 3, outer: 8, far: 16.5 } as const
const SPOKES = 8

/**
 * What a touch at `(x, y)` lands in. Clear water all round is plain. Any mixed colour near makes it a mix. One
 * pot colour is a bloom. Two or more are rings where one colour lies all round another, and side by side
 * otherwise. `colours` is filled with the colours found, nearest first, when it is given.
 */
export function stateAt(cells: Uint8Array, w: number, h: number, x: number, y: number, colours?: number[]): WaterState {
  const at = (px: number, py: number): number => {
    const cx = Math.floor(px), cy = Math.floor(py)
    return cx >= 0 && cy >= 0 && cx < w && cy < h ? cells[cy * w + cx] : WATER
  }
  const found: number[] = []
  const see = (colour: number): void => {
    if (colour !== WATER && !found.includes(colour)) found.push(colour)
  }
  see(at(x, y))
  const inner: number[] = [], outer: number[] = []
  for (let ring = 1; ring <= 3; ring++) {
    const reach = (NEAR.reach * ring) / 3
    for (let s = 0; s < SPOKES; s++) {
      const angle = (Math.PI * 2 * s) / SPOKES + ring * 0.4
      see(at(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach))
    }
  }
  for (let s = 0; s < SPOKES; s++) {
    const angle = (Math.PI * 2 * s) / SPOKES
    inner.push(at(x + Math.cos(angle) * NEAR.inner, y + Math.sin(angle) * NEAR.inner))
    outer.push(at(x + Math.cos(angle) * NEAR.outer, y + Math.sin(angle) * NEAR.outer))
  }
  if (colours) colours.push(...found)
  if (found.length === 0) return 'plain'
  if (found.some((colour) => !isPot(colour))) return 'mix'
  if (found.length === 1) {
    // In the middle of a bloom: rings, where another pot colour lies all round it further out.
    let round = 0
    for (let s = 0; s < SPOKES; s++) {
      const angle = (Math.PI * 2 * s) / SPOKES + 0.2, colour = at(x + Math.cos(angle) * NEAR.far, y + Math.sin(angle) * NEAR.far)
      if (colour !== found[0] && isPot(colour)) round += 1
    }
    return round >= 6 ? 'rings' : 'bloom'
  }
  // Rings: one colour on most of the near spokes and another on most of the far ones.
  const most = (list: number[]): { colour: number; count: number } => {
    let colour = WATER, count = 0
    for (const value of found) {
      const n = list.filter((v) => v === value).length
      if (n > count) {
        colour = value
        count = n
      }
    }
    return { colour, count }
  }
  const near = most(inner), far = most(outer)
  return near.count >= 6 && far.count >= 6 && near.colour !== far.colour ? 'rings' : 'two'
}

/** The share of the grid each value covers, 0 to 1. */
export function shares(cells: Uint8Array): number[] {
  const counts = new Array<number>(VALUES).fill(0)
  for (let i = 0; i < cells.length; i++) counts[cells[i]] += 1
  return counts.map((count) => count / cells.length)
}

/** The colour that covers most of the inked part of a grid, and its share of that part; `WATER` and 0 for a grid with no colour. */
export function chief(cells: Uint8Array): { colour: number; share: number } {
  const part = shares(cells), inked = 1 - part[WATER]
  if (inked <= 0) return { colour: WATER, share: 0 }
  let colour = WATER
  for (let value = 1; value < VALUES; value++) if (colour === WATER || part[value] > part[colour]) colour = value
  return { colour, share: part[colour] / inked }
}

/**
 * A print's grid: the water at one cell for every `by` each way. A block takes the colour most of its inked cells
 * hold when `by - 1` or more of its cells are inked, which is the least a line one cell wide leaves in a block it
 * crosses, straight or on the slant, and is clear otherwise. So a print keeps every line of colour, a little
 * fatter, and loses at most the last cell or two of its tip. Ties go to the lower value.
 */
export function printOf(cells: Uint8Array, w: number, h: number, by: number): Uint8Array {
  const pw = w / by, ph = h / by, out = new Uint8Array(pw * ph), counts = new Uint8Array(VALUES)
  for (let py = 0; py < ph; py++) {
    for (let px = 0; px < pw; px++) {
      counts.fill(0)
      for (let y = 0; y < by; y++) for (let x = 0; x < by; x++) counts[cells[(py * by + y) * w + px * by + x]] += 1
      let best = 0
      for (let value = 1; value < VALUES; value++) if (counts[value] > (best === 0 ? 0 : counts[best])) best = value
      out[py * pw + px] = by * by - counts[0] >= by - 1 ? best : 0
    }
  }
  return out
}

/** The inked cell nearest to `(x, y)`, or null on plain water. Looked for on every fourth cell, which is near enough for a cat. */
export function nearestColour(cells: Uint8Array, w: number, h: number, x: number, y: number): { x: number; y: number; colour: number } | null {
  let best: { x: number; y: number; colour: number } | null = null, least = Infinity
  for (let cy = 2; cy < h; cy += 4) {
    for (let cx = 2; cx < w; cx += 4) {
      const colour = cells[cy * w + cx]
      if (colour === WATER) continue
      const d = (cx - x) * (cx - x) + (cy - y) * (cy - y)
      if (d < least) {
        least = d
        best = { x: cx, y: cy, colour }
      }
    }
  }
  return best
}
