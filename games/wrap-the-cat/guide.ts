import { FIXED, WEDGES, type Id } from './layout'
import { isPartial, isTearing, parcels, quiet, topOf, type World } from './model'

// What the idle guidance shows: one next act, chosen from the room.

export type Hint = { kind: 'circle'; id: Id; from: number; wedges: number } | { kind: 'rip'; id: Id } | { kind: 'door' }

/** The longest run of bare wedges: where it begins, and how many. */
export function bareRun(cover: number): { from: number; wedges: number } {
  let best = { from: 0, wedges: 0 }
  for (let i = 0; i < WEDGES; i++) {
    if (cover & (1 << i)) continue
    let n = 0
    while (n < WEDGES && !(cover & (1 << ((i + n) % WEDGES)))) n++
    if (n > best.wedges) best = { from: i, wedges: n }
  }
  return best
}

const ORDER: readonly Id[] = ['cat', 'grandpa', 'giraffe', 'tuba', 'tree', 'bike']

export function hintFor(w: World): Hint | null {
  if (!quiet(w)) return null
  const tearing = FIXED.find((id) => isTearing(w, id))
  if (tearing) return { kind: 'rip', id: tearing }
  const partial = FIXED.find((id) => isPartial(w, id))
  if (partial) return { kind: 'circle', id: partial, ...bareRun(topOf(w, partial)!.cover) }
  const done = parcels(w)
  if (done.length > 0 && !w.known.ripped) return { kind: 'rip', id: done[0] }
  if (done.length > 1 && !w.known.door) return { kind: 'door' }
  const bare = ORDER.find((id) => !topOf(w, id))
  if (bare) return { kind: 'circle', id: bare, from: 10, wedges: WEDGES }
  return { kind: 'rip', id: done[0] }
}
