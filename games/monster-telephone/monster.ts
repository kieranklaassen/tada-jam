import { LADDER, type PositionId } from './config'
import { below, pick, type Rng } from './rng'

// What a monster is: a body and six places, each bare or with one part on it,
// large or small. Everything else in the game is computed from this.

export const PARTS = ['eye', 'mouth', 'nose', 'ear', 'hand', 'foot', 'tail'] as const
export type Part = (typeof PARTS)[number]
export const PLACES = ['top', 'upper', 'left', 'right', 'lower', 'bottom'] as const
export type Place = (typeof PLACES)[number]
export const BODIES = ['round', 'tall', 'wide'] as const
export type Body = (typeof BODIES)[number]

export type Stuck = { part: Part; large: boolean }
export type Monster = { body: Body; on: Record<Place, Stuck | null> }

export function bare(body: Body = 'round'): Monster {
  return { body, on: { top: null, upper: null, left: null, right: null, lower: null, bottom: null } }
}

export function copy(m: Monster): Monster {
  const out = bare(m.body)
  for (const place of PLACES) { const s = m.on[place]; out.on[place] = s && { ...s } }
  return out
}

export function count(m: Monster): number {
  return PLACES.reduce((n, place) => n + (m.on[place] ? 1 : 0), 0)
}

/** Where a child expects each part: the game's own choice. */
export const USUAL: Record<Place, readonly Part[]> = {
  top: ['ear'], upper: ['eye'], left: ['hand', 'ear'], right: ['hand', 'ear'], lower: ['mouth', 'nose'], bottom: ['foot', 'tail'],
}

export function isUsual(place: Place, part: Part): boolean {
  return USUAL[place].includes(part)
}

// --- Comparing --------------------------------------------------------------

export type Likeness = 'same' | 'size' | 'other'
export type Compared = { place: Place; a: Stuck | null; b: Stuck | null; likeness: Likeness }

/** Every place where either has a part, from the top of the monster down. */
export function compare(a: Monster, b: Monster): Compared[] {
  const out: Compared[] = []
  for (const place of PLACES) {
    const p = a.on[place], q = b.on[place]
    if (!p && !q) continue
    out.push({ place, a: p, b: q, likeness: p && q && p.part === q.part ? (p.large === q.large ? 'same' : 'size') : 'other' })
  }
  return out
}

/** Every place agrees, whatever the bodies. */
export function fits(a: Monster, b: Monster): boolean {
  return compare(a, b).every((one) => one.likeness === 'same')
}

export function alike(a: Monster, b: Monster): boolean {
  return a.body === b.body && fits(a, b)
}

/** The share of what could agree that does: each compared place and the body count one, the other size counts half. */
export function share(a: Monster, b: Monster): number {
  const all = compare(a, b)
  const agreed = all.reduce((n, one) => n + (one.likeness === 'same' ? 1 : one.likeness === 'size' ? 0.5 : 0), a.body === b.body ? 1 : 0)
  return agreed / (all.length + 1)
}

export const WELL = 0.75
export const BADLY = 1 / 3

/** Where the place in the order goes after a meeting. One step at most. */
export function moved(at: PositionId, a: Monster, b: Monster, own: boolean): PositionId {
  if (own || count(b) === 0) return at
  const s = share(a, b), i = LADDER.indexOf(at)
  if (s >= WELL) return LADDER[Math.min(LADDER.length - 1, i + 1)]
  if (s < BADLY) return LADDER[Math.max(0, i - 1)]
  return at
}

export function harder(at: PositionId): PositionId {
  return LADDER[Math.min(LADDER.length - 1, LADDER.indexOf(at) + 1)]
}

// --- The game's own monsters ------------------------------------------------

function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) { const j = below(rng, i + 1); [out[i], out[j]] = [out[j], out[i]] }
  return out
}

/** A monster of that place in the order. `parts` asks for a number of them where the place leaves it open. */
export function make(at: PositionId, rng: Rng, parts?: number): Monster {
  const plain = at === 'in-view' || at === 'a-few', sizes = !plain, bodies = at === 'bodies' || at === 'odd-places' || at === 'crowd'
  const m = bare(bodies ? pick(rng, BODIES) : 'round')
  const n = parts ?? (plain || at === 'small-and-large' ? 3 : at === 'bodies' ? 3 + below(rng, 2) : at === 'odd-places' ? 4 : 5 + below(rng, 2))
  if (at === 'odd-places' || at === 'crowd') {
    const twice = at === 'crowd'
    for (;;) {
      for (const place of PLACES) m.on[place] = null
      const places = shuffled(rng, PLACES).slice(0, n), kinds = shuffled(rng, PARTS)
      places.forEach((place, i) => { m.on[place] = { part: twice && rng.next() < 0.25 ? pick(rng, PARTS) : kinds[i], large: rng.next() < 0.5 } })
      if (twice || places.filter((place) => !isUsual(place, m.on[place]!.part)).length >= 2) break
    }
  } else {
    // The face first, so that even three parts look at you; then the rest.
    const places: Place[] = ['upper', 'lower', ...shuffled(rng, ['top', 'left', 'right', 'bottom'] as const)]
    const used = new Set<Part>()
    for (const place of places) {
      if (count(m) >= n) break
      const free = USUAL[place].filter((part) => !used.has(part))
      if (free.length === 0) continue
      const part = pick(rng, free)
      used.add(part)
      m.on[place] = { part, large: sizes ? rng.next() < 0.5 : true }
    }
  }
  if (sizes) {
    const on = PLACES.map((place) => m.on[place]).filter((s): s is Stuck => s !== null)
    if (on.every((s) => s.large === on[0].large)) { const one = pick(rng, on); one.large = !one.large }
  }
  return m
}

/** Two monsters for the two sacks: one of this place, one harder. */
export function fillSacks(at: PositionId, rng: Rng): [Monster, Monster] {
  const last = at === LADDER[LADDER.length - 1]
  return [make(at, rng, last ? 5 : undefined), make(harder(at), rng, last ? 6 : undefined)]
}
