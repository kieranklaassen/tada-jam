// Seeded randomness for the lab. Sims and the panel never call Math.random,
// Date.now, or performance.now, so a seed and an input log replay exactly.

export type Rng = () => number

// mulberry32, the same generator the jam games use privately.
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

// Whole number in [min, max] inclusive.
export function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

export function chance(rng: Rng, p: number): boolean {
  return rng() < p
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick from an empty list')
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]!
}

// A distinct, well-mixed seed from a base seed and a small index (session
// number, persona number). Same inputs always give the same seed.
export function deriveSeed(seed: number, index: number): number {
  let h = (seed >>> 0) ^ Math.imul(index + 1, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

// A stable seed from text (persona ids, prototype keys).
export function hashText(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
