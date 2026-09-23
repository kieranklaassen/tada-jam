import type { Scarf } from './state'

// Stripe patterns, found without being told. The loom never judges a
// pattern; it just rocks and hums a unit back when the newest rows repeat
// one, and the idle demonstration reaches for the colour that would carry a
// pattern on. Units of two, three and four rows cover AB, ABB, ABC and ABCD.

export const MIN_PERIOD = 2
export const MAX_PERIOD = 4

/** The colour each row reads as: its most common stitch colour (earliest wins ties). */
export function stripeColours(scarf: Scarf): number[] {
  return scarf.map((row) => {
    const counts = new Map<number, number>()
    let best = row[0] ?? 0
    for (const stitch of row) {
      const count = (counts.get(stitch) ?? 0) + 1
      counts.set(stitch, count)
      if (count > (counts.get(best) ?? 0)) best = stitch
    }
    return best
  })
}

function distinct(values: readonly number[]): number {
  return new Set(values).size
}

/** The unit the newest rows just repeated (two full copies back to back), or null. */
export function completedRepeat(colours: readonly number[]): number[] | null {
  const n = colours.length
  for (let p = MIN_PERIOD; p <= MAX_PERIOD; p++) {
    if (n < 2 * p) continue
    let ok = true
    for (let i = n - p; i < n; i++) if (colours[i] !== colours[i - p]) ok = false
    const unit = colours.slice(n - p)
    if (ok && distinct(unit) >= 2) return unit
  }
  return null
}

/** The colour that carries an established pattern on (at least one element already repeated), or null. */
export function continuation(colours: readonly number[]): number | null {
  const n = colours.length
  for (let p = MIN_PERIOD; p <= MAX_PERIOD; p++) {
    if (n < p + 1) continue
    let ok = true
    for (let i = Math.max(p, n - 2 * p); i < n; i++) if (colours[i] !== colours[i - p]) ok = false
    if (ok && distinct(colours.slice(n - p)) >= 2) return colours[n - p]
  }
  return null
}

/** A colour worth demonstrating: the pattern's next colour, or one that starts a stripe. */
export function suggestColour(colours: readonly number[], balls: number): number {
  const next = continuation(colours)
  if (next !== null && next < balls) return next
  const n = colours.length
  if (n === 0) return 0
  const last = colours[n - 1]
  if (n >= 2 && colours[n - 2] !== last && colours[n - 2] < balls) return colours[n - 2]
  return (last + 1) % balls
}
