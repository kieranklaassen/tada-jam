// What rises, drifts or rolls by itself for a moment and is gone: steam, the
// shimmer over a warm loaf, a cloud out of the oven door, smoke, and a seed
// that rolls over, a sheen that slides over warm dough. Each belongs to one cell of the grid (ART.md, "The
// object-by-action grid") and is never saved. Pure numbers: the look draws
// them, in ink, without a fade: a wisp thins and shrinks away.

export type WispKind = 'steam' | 'shimmer' | 'cloud' | 'smoke' | 'seed' | 'sheen' | 'frost'

export type Wisp = { kind: WispKind; x: number; y: number; size: number; age: number; life: number; sway: number }

/** No more than this many at once: the oldest gives way. */
export const MOST_WISPS = 12

/** Seconds each kind lasts, and how far it rises in that time, in reference units at size 1. */
export const WISP: Record<WispKind, { life: number; rise: number }> = {
  steam: { life: 1.6, rise: 64 }, shimmer: { life: 1.3, rise: 10 }, cloud: { life: 1.5, rise: 80 }, smoke: { life: 1.8, rise: 90 }, seed: { life: 0.7, rise: 0 }, sheen: { life: 1, rise: 0 }, frost: { life: 1.6, rise: 0 },
}

/** Where a wisp is now and how full it is: it swells in the first fifth of its life and thins away over the rest. */
export function wispNow(wisp: Wisp): { x: number; y: number; full: number; turn: number } {
  const t = Math.min(1, wisp.age / wisp.life), rise = WISP[wisp.kind].rise * wisp.size
  if (wisp.kind === 'seed') {
    // One seed rolls a little way with a small hop and lies still.
    const roll = Math.min(1, t / 0.7)
    return { x: wisp.x + wisp.sway * 22 * roll, y: wisp.y - Math.sin(Math.PI * roll) * 9, full: 1, turn: roll * Math.PI * 1.5 * wisp.sway }
  }
  // Frost grows where it is and is gone again.
  if (wisp.kind === 'frost') return { x: wisp.x, y: wisp.y, full: Math.sin(Math.PI * t), turn: wisp.sway * 0.5 }
  // A sheen slides once across what has gone warm and shiny.
  if (wisp.kind === 'sheen') return { x: wisp.x + (t * 2 - 1) * 26 * wisp.size, y: wisp.y, full: Math.sin(Math.PI * t), turn: 0 }
  const full = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8
  return { x: wisp.x + Math.sin(wisp.age * 3.1 + wisp.sway * 6) * 7 * wisp.size * t + (wisp.kind === 'smoke' ? 26 * wisp.size * t : 0), y: wisp.y - rise * (1 - (1 - t) * (1 - t)), full, turn: 0 }
}

export class Wisps {
  readonly list: Wisp[] = []

  /** `sway` is a number from -1 to 1 from the caller's seeded stream: it sets which way the wisp leans. */
  add(kind: WispKind, x: number, y: number, size: number, sway: number): void {
    if (this.list.length >= MOST_WISPS) this.list.shift()
    this.list.push({ kind, x, y, size, age: 0, life: WISP[kind].life, sway })
  }

  step(seconds: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const wisp = this.list[i]
      wisp.age += seconds
      if (wisp.age >= wisp.life) this.list.splice(i, 1)
    }
  }

  clear(): void {
    this.list.length = 0
  }
}

/** What a reaction leaves on a customer for as long as it lasts: strings of raw dough, a seed stuck in a tooth, soot on a nose. Reference units. */
export type Extra =
  | { kind: 'strings'; x0: number; y0: number; x1: number; y1: number; thick: number }
  | { kind: 'seed'; x: number; y: number; size: number; turn: number }
  | { kind: 'soot'; x: number; y: number; size: number }
