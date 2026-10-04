// The page's chance. Every draw depends only on the page's seed, the stream
// it belongs to and its place in that stream, so the same page gives the same
// pods in the same order, a walkthrough can be replayed, and nothing else in
// the game draws from these streams. `Math.random` is never read here.

/** The streams. A pod's seeds and the choice of the next visitor never share draws. */
export const STREAM = { pod: 1, visit: 2 } as const
export type Stream = (typeof STREAM)[keyof typeof STREAM]

/** Scrambles three whole numbers into one 32-bit state. */
function mix(seed: number, stream: number, index: number): number {
  let h = (seed >>> 0) ^ 0x9e3779b9
  for (const value of [stream, index]) {
    h = Math.imul(h ^ (value >>> 0), 0x85ebca6b)
    h ^= h >>> 13
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 16
  }
  return h >>> 0
}

/**
 * The draws of one event: the `index`th pod, or the `index`th visitor laid
 * out. Each call of the returned function gives the next number from 0 up to
 * but not including 1 (mulberry32).
 */
export function draws(seed: number, stream: Stream, index: number): () => number {
  let state = mix(seed, stream, index)
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A whole number from 0 up to but not including `count`. */
export function pick(next: () => number, count: number): number {
  return Math.min(count - 1, Math.floor(next() * count))
}

export function isSeed(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffffff
}
