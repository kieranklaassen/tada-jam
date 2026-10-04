// template: cartridge/rng.ts v3

// A seeded stream of chance. The rules, the layouts and the painted look each
// draw from a stream of their own, so the same seed gives the same game on
// every machine and nothing else draws from the stream the rules use. Nothing
// here reads a clock, and nothing in a game draws its chance anywhere else.
// `seed=<n>` in the address pins the seed, so a still can be taken again and
// come out the same; a visit without it draws a new one.

export type Rng = {
  /** The next number, from 0 up to but not including 1. */
  next(): number
  /** Where the stream stands, as one whole number. A save keeps it, and a stream made from it carries on where this one stopped. */
  readonly state: number
}

/** A small, fast stream (mulberry32). Any number is a usable seed. */
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

/** A whole number from 0 up to but not including `n`. */
export function below(rng: Rng, n: number): number {
  return Math.min(n - 1, Math.floor(rng.next() * n))
}

/** One item of a list that is not empty. */
export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[below(rng, items.length)]
}

/**
 * The seed of this visit, from the address's query string: the whole number after `seed=` when there is one,
 * and otherwise a new seed from `fresh`, which gives a number from 0 up to 1 as `Math.random` does.
 */
export function seedOf(search: string, fresh: () => number = Math.random): number {
  const asked = new URLSearchParams(search).get('seed')
  return asked !== null && /^\d{1,10}$/.test(asked) ? Number(asked) >>> 0 : Math.floor(fresh() * 4294967296) >>> 0
}
