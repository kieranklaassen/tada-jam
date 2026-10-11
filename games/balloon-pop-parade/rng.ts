// A seeded stream kept as one plain number, so the save can hold it and the
// same save always goes on in the same way. No clock and no built-in random
// source is read: every draw takes the state and hands back the next one, and
// the caller threads it through.

const UINT32 = 0x100000000

/** One draw: a value from 0 up to but not 1, and the state for the next draw, always a uint32. Any number is a usable state. */
export function draw(rng: number): { value: number; rng: number } {
  const next = ((rng >>> 0) + 0x6d2b79f5) >>> 0
  let mixed = next
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
  return { value: ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32, rng: next }
}

/** One member of a list that is not empty, each as likely as the next. */
export function pickFrom<T>(items: readonly T[], rng: number): { value: T; rng: number } {
  const drawn = draw(rng)
  return { value: items[Math.floor(drawn.value * items.length)], rng: drawn.rng }
}

/** The same members in a drawn order. The list handed in is left as it was. */
export function shuffled<T>(items: readonly T[], rng: number): { items: T[]; rng: number } {
  const result = [...items]
  let state = rng >>> 0
  for (let last = result.length - 1; last > 0; last--) {
    const drawn = draw(state)
    state = drawn.rng
    const other = Math.floor(drawn.value * (last + 1))
    const held = result[last]
    result[last] = result[other]
    result[other] = held
  }
  return { items: result, rng: state }
}

/** One member of a list that is not empty, as likely as its weight is large. A weight of zero or less is never drawn. */
export function weighted<T>(items: readonly { item: T; weight: number }[], rng: number): { value: T; rng: number } {
  const drawn = draw(rng)
  const total = items.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0)
  let left = drawn.value * total
  let value = items[items.length - 1].item
  for (const entry of items) {
    const weight = Math.max(0, entry.weight)
    if (weight > 0 && left < weight) {
      value = entry.item
      break
    }
    left -= weight
  }
  return { value, rng: drawn.rng }
}
