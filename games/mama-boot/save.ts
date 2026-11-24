import { BROOD, FIRST_EGGS, FIRST_THINGS, GROUND, THINGS, type BroodId, type Id, type ThingKey } from './layout'
import { ringOf } from './lineage'

// What goes into ctx.storage: small plain JSON, versioned, read defensively.
// A damaged field takes its default and the rest is kept.

export const STATE_VERSION = 1

export type SavedThing = { x: number; y: number; dir: 1 | -1 }
export type SavedBrood = { id: BroodId; kind: 'egg' | 'chick'; x: number; y: number; mother: Id | null; host: Id | null; dizzy: boolean }
export type GameState = { v: typeof STATE_VERSION; things: Record<ThingKey, SavedThing>; brood: SavedBrood[] }

/** Eggs in the yard on a first visit. Open at both ends; no age given takes the youngest. The hen lays the rest for whoever taps her. */
export function firstEggs(childAge: number | null): number {
  return childAge !== null && childAge >= 4 ? 5 : 3
}

export function freshState(childAge: number | null): GameState {
  return {
    v: STATE_VERSION,
    things: Object.fromEntries(THINGS.map((k) => [k, { ...FIRST_THINGS[k] }])) as Record<ThingKey, SavedThing>,
    brood: FIRST_EGGS.slice(0, firstEggs(childAge)).map((p, i) => ({ id: BROOD[i], kind: 'egg', x: p.x, y: p.y, mother: null, host: null, dizzy: false })),
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, lo: number, hi: number, or: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : or)

export function deserialize(raw: unknown, childAge: number | null = null): GameState {
  const fresh = freshState(childAge)
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return fresh
  const things = fresh.things
  if (isRecord(raw.things)) {
    for (const k of THINGS) {
      const t = raw.things[k]
      if (!isRecord(t)) continue
      things[k] = { x: num(t.x, GROUND.left, GROUND.right, things[k].x), y: num(t.y, GROUND.top, GROUND.bottom, things[k].y), dir: t.dir === -1 ? -1 : t.dir === 1 ? 1 : things[k].dir }
    }
  }
  if (!Array.isArray(raw.brood)) return fresh
  const brood: SavedBrood[] = []
  for (const b of raw.brood as unknown[]) {
    if (!isRecord(b)) continue
    const id = BROOD.find((c) => c === b.id)
    if (!id || brood.some((o) => o.id === id)) continue
    const home = FIRST_EGGS[BROOD.indexOf(id)]
    brood.push({ id, kind: b.kind === 'chick' ? 'chick' : 'egg', x: num(b.x, GROUND.left, GROUND.right, home.x), y: num(b.y, GROUND.top, GROUND.bottom, home.y), mother: b.mother as Id | null, host: b.host as Id | null, dizzy: b.dizzy === true })
  }
  if (brood.length === 0) return { ...fresh, things }
  const known = (v: unknown): v is Id => v === 'hen' || THINGS.some((k) => k === v) || brood.some((b) => b.id === v)
  for (const b of brood) {
    // A chick with no mother it could have is an egg again, which any tap puts right.
    if (b.kind === 'chick' && !known(b.mother)) b.kind = 'egg'
    if (b.kind === 'egg') { b.mother = null; b.dizzy = false }
  }
  // Riding: on a thing or a chick, one to a seat, and never round in a circle.
  for (const b of brood) {
    const host = b.host
    const chick = brood.find((o) => o.id === host)
    const fits = THINGS.some((k) => k === host) || (chick?.kind === 'chick' && chick !== b)
    if (!fits || brood.some((o) => o !== b && o.host === host && brood.indexOf(o) < brood.indexOf(b))) b.host = null
  }
  for (const b of brood) {
    let at: SavedBrood | undefined = b
    for (let i = 0; at?.host; i++) {
      if (i > BROOD.length) { b.host = null; break }
      at = brood.find((o) => o.id === at!.host)
    }
  }
  const mothers = new Map(brood.map((b) => [b.id, b.mother]))
  for (const b of brood) if (b.dizzy && !ringOf(b.id, mothers)) b.dizzy = false
  return { v: STATE_VERSION, things, brood }
}

export function serialize(state: GameState): GameState {
  return {
    v: STATE_VERSION,
    things: Object.fromEntries(THINGS.map((k) => [k, { ...state.things[k] }])) as Record<ThingKey, SavedThing>,
    brood: state.brood.map((b) => ({ ...b })),
  }
}
