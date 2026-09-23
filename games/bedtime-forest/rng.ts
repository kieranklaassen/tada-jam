// A tiny seeded generator (mulberry32) so wandering is deterministic in tests
// and allocation-free in the frame loop.

export type Rng = () => number

export function createRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function between(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng()
}
