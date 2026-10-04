// One seeded random stream, so a layout or a painted surface is the same
// every time it is made from the same seed. Nothing here reads a clock.

export type Rng = {
  /** The next number in [0, 1). */
  next(): number
  /** The state to store, so the stream carries on where it stopped. */
  readonly state: number
}

/** A small, fast generator (mulberry32). The seed is any whole number. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
    get state() {
      return a
    },
  }
}

/** A number in [lo, hi). */
export const between = (rng: Rng, lo: number, hi: number): number => lo + (hi - lo) * rng.next()

/** A whole number in [0, n). */
export const below = (rng: Rng, n: number): number => Math.min(n - 1, Math.floor(rng.next() * n))

/** One item of a non-empty list. */
export const pick = <T>(rng: Rng, items: readonly T[]): T => items[below(rng, items.length)]
