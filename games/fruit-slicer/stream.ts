// The seeded stream that lays out customers. Its whole state is one whole
// number, which is what the save keeps, so a visit continues the same stream
// and nothing else in the game draws from it. Pure.

/** Any number as a state: a whole number from 0 up to 2^32. */
export function seedOf(value: number): number {
  return Number.isFinite(value) ? Math.floor(Math.abs(value)) >>> 0 : 0
}

/** One step: a number from 0 up to but not including 1, and the state after it. (Mulberry32.) */
export function draw(state: number): { value: number; state: number } {
  const next = (seedOf(state) + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: next }
}

/** One of a list, and the state after the draw. The list must hold something. */
export function pick<T>(state: number, from: readonly T[]): { value: T; state: number } {
  const drawn = draw(state)
  return { value: from[Math.min(from.length - 1, Math.floor(drawn.value * from.length))], state: drawn.state }
}
