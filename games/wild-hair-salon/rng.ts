// A small seeded stream of chance. The rules and the painted scene each draw
// from a stream of their own, made from a whole-number seed, so the same seed
// gives the same salon on every machine. Nothing here reads a clock or the
// platform's own random source.

export type Rng = {
  /** The next value, from 0 up to but not including 1. */
  next(): number
  /** A whole number from `min` to `max`, both included. */
  int(min: number, max: number): number
  /** A value from `min` up to `max`. */
  range(min: number, max: number): number
  /** One item of a list that is not empty. */
  pick<T>(items: readonly T[]): T
}

/** Brings any number to a whole seed from 0 to 2^32 - 1; anything that is not a finite number gives 0. */
export function toSeed(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.floor(Math.abs(value)) >>> 0 : 0
}

export function makeRng(seed: number): Rng {
  let a = toSeed(seed)
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1))
  return {
    next,
    int,
    range: (min, max) => min + next() * (max - min),
    pick: (items) => items[int(0, items.length - 1)],
  }
}

/** The seed that follows `seed`: a different stream each cycle, with nothing counted that a child could be shown. */
export function nextSeed(seed: number): number {
  return (Math.imul(toSeed(seed) ^ 0x9e3779b9, 0x85ebca6b) + 0xc2b2ae35) >>> 0
}
