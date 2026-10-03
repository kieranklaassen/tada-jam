// A seeded random stream. The model and the look each own one, so a still is
// the same on every run and nothing else draws from the stream the rules use.

export type Rng = {
  /** 0 up to, not including, 1. */
  next(): number
  /** A number from `a` up to `b`. */
  range(a: number, b: number): number
  /** A whole number from 0 up to, not including, `n`. */
  int(n: number): number
  /** One of the items. */
  pick<T>(items: readonly T[]): T
  /** The stream's state, for a save or a fork. */
  readonly state: number
}

export function makeRng(seed: number): Rng {
  let s = seed >>> 0
  const next = (): number => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (n) => Math.floor(next() * n),
    pick: (items) => items[Math.floor(next() * items.length)],
    get state() {
      return s
    },
  }
}

/** A seed made from a text, so each figure's wobble is its own and stays put. */
export function seedFrom(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
