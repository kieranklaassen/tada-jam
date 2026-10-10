// A small seeded random stream. The rules and the layouts draw from one of
// these and from nothing else, so the same seed always gives the same world.

export type Rng = () => number

export function rng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A whole number from 0 up to, not including, `n`. */
export function pick(random: Rng, n: number): number {
  return Math.min(n - 1, Math.floor(random() * n))
}

/** The same items in a shuffled order; the list handed in is left as it was. */
export function shuffled<T>(random: Rng, items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = pick(random, i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
