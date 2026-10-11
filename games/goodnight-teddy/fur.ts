import { BEAR, PLACES, partAt, type PartId } from './bear'

// Teddy's coat: a coarse grid over his body, each cell holding how much mud, foam, wet and fluff is there, from 0
// to 1. The three wash things are three paints that undo each other: soap lays foam over mud, water takes foam
// off with the mud it covered and leaves the fur wet, and the towel turns wet fur into fluff. A rule here changes
// the grid and says how much it changed, and nothing else: no canvas, no clock.

export const COLS = 14
export const ROWS = 16
export const CELLS = COLS * ROWS
export const CELL = { w: BEAR.width / COLS, h: BEAR.height / ROWS } as const

export type Layer = 'mud' | 'foam' | 'wet' | 'fluff'
export const LAYERS: readonly Layer[] = ['mud', 'foam', 'wet', 'fluff']
export type Fur = Record<Layer, number[]>

/** Ordinary fur at the end of a day: neither slick nor fluffy. */
export const DAY_FLUFF = 0.3
/**
 * The least of a layer that is there at all. Less than this is not drawn, is not counted, and is saved as none, so
 * what a child can see, what Teddy asks for and what a save holds are the same thing.
 */
export const SEEN = 1 / 18
/** Which cells a thing can reach: all of them, or those not under a cloth he wears. */
export type Open = readonly boolean[] | null
/** How far round the soap, the towel and a bare finger reach, and half the width of the jug's water. */
/** Wet fur drier than this comes up as fluff under the towel. */
const DAMP = 0.3
export const REACH = { soap: 56, towel: 72, hand: 44, water: 50 } as const

export function cellX(i: number): number {
  return BEAR.left + ((i % COLS) + 0.5) * CELL.w
}
export function cellY(i: number): number {
  return BEAR.top + (Math.floor(i / COLS) + 0.5) * CELL.h
}

/** The piece of the bear each cell lies on, or null for a cell off him. Only cells on him ever hold anything. */
export const CELL_PART: readonly (PartId | null)[] = Array.from({ length: CELLS }, (_, i) => partAt(cellX(i), cellY(i)))
export const LIVE: readonly number[] = CELL_PART.flatMap((part, i) => (part ? [i] : []))

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))

/** A coat with mud on the named places, dry and at its ordinary fluff. An id that is not a place is passed over. */
export function freshFur(places: readonly string[]): Fur {
  const fur: Fur = { mud: new Array(CELLS).fill(0), foam: new Array(CELLS).fill(0), wet: new Array(CELLS).fill(0), fluff: new Array(CELLS).fill(0) }
  for (const i of LIVE) fur.fluff[i] = DAY_FLUFF
  for (const place of PLACES) {
    if (!places.includes(place.id)) continue
    for (const i of LIVE) {
      const d = Math.hypot(cellX(i) - place.x, cellY(i) - place.y)
      if (d < place.r) fur.mud[i] = Math.max(fur.mud[i], clamp01(1.35 - d / place.r))
    }
  }
  return fur
}

/** Every cell within `reach` of a point, with how strongly the point bears on it: 1 at the middle, 0 at the rim. */
function near(x: number, y: number, reach: number, open: Open, each: (i: number, k: number) => void): void {
  for (const i of LIVE) {
    if (open && !open[i]) continue
    const d = Math.hypot(cellX(i) - x, cellY(i) - y)
    if (d < reach) each(i, 1 - (d / reach) ** 2)
  }
}

/** Soap rubbed at a point: foam grows there and lays the fluff flat. Returns the foam that was added. */
export function soap(fur: Fur, x: number, y: number, amount: number, open: Open = null): number {
  let added = 0
  near(x, y, REACH.soap, open, (i, k) => {
    const before = fur.foam[i]
    fur.foam[i] = clamp01(before + amount * k)
    fur.fluff[i] = clamp01(fur.fluff[i] - amount * k * 0.6)
    added += fur.foam[i] - before
  })
  return added
}

/**
 * Water falling from `top` straight down at `x`. On every cell under it, foam slides off and takes the mud it
 * covered; bare mud only runs a little; the fur is left wet and flat. Returns how much foam and mud came off and
 * how many cells the water ran over, which is none when it falls past him.
 */
export function pour(fur: Fur, x: number, top: number, amount: number, open: Open = null): { foam: number; mud: number; cells: number } {
  const off = { foam: 0, mud: 0, cells: 0 }
  for (const i of LIVE) {
    if (open && !open[i]) continue
    const dx = Math.abs(cellX(i) - x)
    if (dx >= REACH.water || cellY(i) < top) continue
    const k = amount * (1 - (dx / REACH.water) ** 2)
    const foam = fur.foam[i], mud = fur.mud[i]
    // Mud leaves with the foam over it, at the rate the foam leaves; without foam it barely moves.
    const loosened = Math.min(1, foam * 4)
    const ran = mud * k * 0.1 * (1 - loosened)
    fur.mud[i] = clamp01(mud - mud * Math.min(1, k * 6) * loosened - ran)
    // Bare mud runs a little: what leaves a cell goes to the one below it, while there is fur below.
    const under = i + COLS
    if (ran > 0 && under < CELLS && CELL_PART[under] && (!open || open[under])) fur.mud[under] = clamp01(fur.mud[under] + ran * 0.85)
    fur.foam[i] = clamp01(foam - k * 1.6)
    // What is rinsed thinner than can be seen is gone.
    if (loosened > 0 && fur.mud[i] < SEEN * 2) fur.mud[i] = 0
    if (fur.foam[i] < SEEN) fur.foam[i] = 0
    fur.wet[i] = clamp01(fur.wet[i] + k * 2.4)
    fur.fluff[i] = clamp01(fur.fluff[i] - k * 2)
    off.foam += foam - fur.foam[i]
    off.mud += mud - fur.mud[i]
    off.cells += 1
  }
  return off
}

/**
 * The towel rubbed at a point. Wet fur dries, and fur that is dry enough comes up as fluff. Foam under it is only
 * smeared thinner and leaves the fur wet, and mud stays. Returns how much fluff came up, how much it dried, and
 * how much mud it was rubbed over.
 */
export function towel(fur: Fur, x: number, y: number, amount: number, open: Open = null): { fluff: number; dried: number; mud: number } {
  const out = { fluff: 0, dried: 0, mud: 0 }
  near(x, y, REACH.towel, open, (i, k) => {
    const a = amount * k
    if (fur.foam[i] > 0.12) {
      fur.foam[i] = clamp01(fur.foam[i] - a * 0.35)
      fur.wet[i] = clamp01(fur.wet[i] + a * 0.2)
      return
    }
    const wet = fur.wet[i]
    fur.wet[i] = clamp01(wet - a * 1.5)
    // The towel finishes what it has mostly dried: no damp is left behind that cannot be seen to rub at.
    if (fur.wet[i] < DAMP) fur.wet[i] = 0
    out.dried += wet - fur.wet[i]
    // Mud stays where it is, and no fluff comes up through it.
    if (fur.mud[i] >= SEEN) { out.mud += a * fur.mud[i]; return }
    if (fur.wet[i] < DAMP) {
      const fluff = fur.fluff[i]
      fur.fluff[i] = clamp01(fluff + a * 1.3)
      out.fluff += fur.fluff[i] - fluff
    }
  })
  return out
}

/** A bare finger rubbed at a point pops the foam under it, a little at a time. Returns how much foam it popped. */
export function ruffle(fur: Fur, x: number, y: number, amount: number, open: Open = null): number {
  let popped = 0
  near(x, y, REACH.hand, open, (i, k) => {
    const before = fur.foam[i]
    fur.foam[i] = clamp01(before - amount * k * 0.5)
    if (fur.foam[i] < SEEN) fur.foam[i] = 0
    popped += before - fur.foam[i]
  })
  return popped
}

/** He shook himself: some of the water flies off everywhere. */
export function shake(fur: Fur): void {
  for (const i of LIVE) { fur.wet[i] *= 0.85; if (fur.wet[i] < SEEN) fur.wet[i] = 0 }
}

/** How fluffy he is under a point, from 0 to 1, for a finger that ruffles him. */
export function fluffAt(fur: Fur, x: number, y: number): number {
  let best = 0
  near(x, y, REACH.hand, null, (i) => { best = Math.max(best, fur.fluff[i]) })
  return best
}

/** The middle of the cell where a layer is most, in his units, or null when none of it can be seen. */
export function most(fur: Fur, layer: Layer, open: Open = null): { x: number; y: number } | null {
  let best = -1, value = SEEN
  for (const i of LIVE) if ((!open || open[i]) && fur[layer][i] >= value) { value = fur[layer][i] + 1e-9; best = i }
  return best < 0 ? null : { x: cellX(best), y: cellY(best) }
}

/** Whether any of a layer can be seen on him. */
export function has(fur: Fur, layer: Layer): boolean {
  for (const i of LIVE) if (fur[layer][i] >= SEEN) return true
  return false
}

/** How much of a layer he carries, as a share of his whole coat from 0 to 1. */
export function share(fur: Fur, layer: Layer): number {
  let sum = 0
  for (const i of LIVE) sum += fur[layer][i]
  return sum / LIVE.length
}

/** Dry enough to sleep: no water and no foam that can be seen anywhere in his coat. */
export function isDry(fur: Fur): boolean {
  return !has(fur, 'wet') && !has(fur, 'foam')
}

/** Mud that no foam covers, at a cell: what the soap has still to do there. */
const bare = (fur: Fur, i: number): number => (fur.foam[i] >= 0.3 ? 0 : fur.mud[i])

/** The middle of the patch round the cell where `value` is most, weighted by it, or null when it is nowhere to be seen. One pass to find the cell and one to weigh its patch. */
function patch(value: (i: number) => number, reach: number, open: Open): { x: number; y: number } | null {
  let best = -1, top = SEEN
  for (const i of LIVE) { if (open && !open[i]) continue; const v = value(i); if (v >= top) { top = v + 1e-9; best = i } }
  if (best < 0) return null
  let x = 0, y = 0, sum = 0
  near(cellX(best), cellY(best), reach, open, (i, k) => { const w = value(i) * k; x += cellX(i) * w; y += cellY(i) * w; sum += w })
  return sum > 0 ? { x: x / sum, y: y / sum } : { x: cellX(best), y: cellY(best) }
}

/** The middle of his muddiest bare place, in his units, where a tapped soap goes. Null when no mud is bare. */
export function bareMud(fur: Fur, open: Open = null): { x: number; y: number } | null {
  return patch((i) => bare(fur, i), REACH.soap * 1.4, open)
}

/** How far a tapped towel rubs to each side of where it goes, and up and down from it. */
export const TOWEL_SWEEP = { x: 150, y: 84 } as const
/** The three parts of him a tapped towel dries, by their height in his units: his head, his middle, his seat and feet. */
const BANDS = [-390, -200, -60] as const

/**
 * The middle of the wet in the wettest part of him, in his units, where a tapped towel goes. Null when he is dry.
 * A bear who is wet all over is dried in three taps, a part at each; a small wet patch is found where it is.
 */
export function wettest(fur: Fur, open: Open = null): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null, most = 0
  for (const band of BANDS) {
    let x = 0, y = 0, sum = 0
    for (const i of LIVE) {
      if ((open && !open[i]) || fur.wet[i] < SEEN || Math.abs(cellY(i) - band) > TOWEL_SWEEP.y + REACH.towel) continue
      x += cellX(i) * fur.wet[i]; y += cellY(i) * fur.wet[i]; sum += fur.wet[i]
    }
    if (sum > most) { most = sum; best = { x: x / sum, y: y / sum } }
  }
  return best
}

/** Whether any mud on him is bare. */
function hasBareMud(fur: Fur): boolean {
  for (const i of LIVE) if (bare(fur, i) >= SEEN) return true
  return false
}

/**
 * The wash thing his coat asks for, which is what he looks at and what the idle hand shows, in the order that
 * works: the soap while any mud is bare, then the jug while there is foam, then the towel while he is wet, and
 * nothing once he is clean and dry.
 */
export function wants(fur: Fur): 'soap' | 'jug' | 'towel' | null {
  if (hasBareMud(fur)) return 'soap'
  if (has(fur, 'foam')) return 'jug'
  if (has(fur, 'wet')) return 'towel'
  return null
}

/** A layer as a save holds it: one digit from 0 to 9 a cell. */
export function digits(layer: readonly number[]): string {
  let out = ''
  for (let i = 0; i < CELLS; i++) out += String(Math.round(clamp01(layer[i] ?? 0) * 9))
  return out
}

/** A layer read back from a save. Anything that is not a string of digits of the grid's length is refused with null. */
export function fromDigits(raw: unknown): number[] | null {
  if (typeof raw !== 'string' || raw.length !== CELLS || !/^\d+$/.test(raw)) return null
  // Whatever a damaged save put on a cell off the bear is dropped.
  return Array.from(raw, (c, i) => (CELL_PART[i] ? Number(c) / 9 : 0))
}
