import { isHue, isPrimary, mix, type Hue } from './colors'
import { GRASS, PLOTS, restingSpot, type Point } from './layout'

// The meadow's saved shape. Three molehills each hold a flower or nothing,
// seeds lie loose on the grass (oldest first), and the bee carries up to two
// pollen colours. The pouch is bottomless for the three primaries, so it is
// not saved. Nothing here counts anything the child could see.

export const STATE_VERSION = 1
/** The grass holds this many loose seeds; past it, the oldest primary rolls home to the pouch. */
export const MAX_LOOSE = 8
/** The bee only drops a new seed while fewer than this many lie loose. */
export const BEE_ROOM = 3

export type Seed = { id: number; hue: Hue; x: number; z: number }

export type MeadowState = {
  v: typeof STATE_VERSION
  plots: (Hue | null)[]
  loose: Seed[]
  pollen: Hue[]
  nextId: number
}

export function defaultMeadow(): MeadowState {
  return { v: STATE_VERSION, plots: PLOTS.map(() => null), loose: [], pollen: [], nextId: 1 }
}

export function emptyPlots(state: MeadowState): number[] {
  const out: number[] = []
  for (let i = 0; i < state.plots.length; i++) if (state.plots[i] === null) out.push(i)
  return out
}

export function plant(state: MeadowState, plot: number, hue: Hue): boolean {
  if (plot < 0 || plot >= state.plots.length || state.plots[plot] !== null) return false
  state.plots[plot] = hue
  return true
}

/** Pull a flower out; it becomes a seed of its own colour in the child's hand. */
export function pick(state: MeadowState, plot: number): Hue | null {
  const hue = state.plots[plot] ?? null
  if (hue !== null) state.plots[plot] = null
  return hue
}

/** Lay a seed on the grass. Returns the seed plus any old primary seeds that rolled home to make room. */
export function addLoose(state: MeadowState, hue: Hue, at: Point): { seed: Seed; returned: Seed[] } {
  const seed: Seed = { id: state.nextId++, hue, x: at.x, z: at.z }
  state.loose.push(seed)
  const returned: Seed[] = []
  while (state.loose.length > MAX_LOOSE) {
    const index = state.loose.findIndex((other) => other !== seed && isPrimary(other.hue))
    if (index < 0) break
    returned.push(...state.loose.splice(index, 1))
  }
  return { seed, returned }
}

export function takeLoose(state: MeadowState, id: number): Seed | null {
  const index = state.loose.findIndex((seed) => seed.id === id)
  return index < 0 ? null : state.loose.splice(index, 1)[0]
}

/**
 * The bee sips a flower: its pollen keeps the two most recent different
 * colours. The pollen stays on its legs (and in the save) until the bee
 * actually lays the mixed seed, so putting the meadow away mid-flight loses
 * nothing.
 */
export function visit(state: MeadowState, hue: Hue): void {
  const at = state.pollen.indexOf(hue)
  if (at >= 0) state.pollen.splice(at, 1)
  state.pollen.push(hue)
  while (state.pollen.length > 2) state.pollen.shift()
}

export function readyToMix(state: MeadowState): boolean {
  return state.pollen.length === 2 && state.loose.length < BEE_ROOM
}

/** The colour the bee's pollen would make, or null while it carries fewer than two. */
export function mixOf(state: MeadowState): Hue | null {
  return state.pollen.length < 2 ? null : mix(state.pollen[0], state.pollen[1])
}

/** The bee's two pollen balls become one mixed seed (the caller lays it on the grass). */
export function blend(state: MeadowState): Hue | null {
  const hue = mixOf(state)
  if (hue !== null) state.pollen.length = 0
  return hue
}

export function serialize(state: MeadowState, inHand: readonly { hue: Hue; x: number; z: number }[] = []): MeadowState {
  const loose = state.loose.map((seed) => ({ ...seed }))
  let nextId = state.nextId
  const scratch = { x: 0, z: 0 }
  for (const held of inHand) {
    const spot = restingSpot(held.x, held.z, loose, scratch)
    loose.push({ id: nextId++, hue: held.hue, x: round1(spot.x), z: round1(spot.z) })
  }
  return { v: STATE_VERSION, plots: [...state.plots], loose: loose.map((s) => ({ ...s, x: round1(s.x), z: round1(s.z) })), pollen: [...state.pollen], nextId }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Saved state is untrusted: keep what is valid, default the rest, never throw. */
export function deserialize(raw: unknown): MeadowState {
  const state = defaultMeadow()
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return state
  if (Array.isArray(raw.plots)) {
    for (let i = 0; i < state.plots.length; i++) state.plots[i] = isHue(raw.plots[i]) ? raw.plots[i] : null
  }
  const seen = new Set<number>()
  const taken: Point[] = []
  if (Array.isArray(raw.loose)) {
    for (const item of raw.loose) {
      if (state.loose.length >= MAX_LOOSE) break
      if (!isRecord(item) || !isHue(item.hue)) continue
      const id = item.id
      if (typeof id !== 'number' || !Number.isInteger(id) || id < 1 || seen.has(id)) continue
      const x = typeof item.x === 'number' && Number.isFinite(item.x) ? item.x : (GRASS.left + GRASS.right) / 2
      const z = typeof item.z === 'number' && Number.isFinite(item.z) ? item.z : (GRASS.near + GRASS.far) / 2
      const spot = restingSpot(x, z, taken, { x: 0, z: 0 })
      seen.add(id)
      taken.push(spot)
      state.loose.push({ id, hue: item.hue, x: spot.x, z: spot.z })
    }
  }
  if (Array.isArray(raw.pollen)) {
    for (const hue of raw.pollen) if (isHue(hue) && !state.pollen.includes(hue) && state.pollen.length < 2) state.pollen.push(hue)
  }
  const maxId = state.loose.reduce((max, seed) => Math.max(max, seed.id), 0)
  const nextId = typeof raw.nextId === 'number' && Number.isInteger(raw.nextId) ? raw.nextId : 1
  state.nextId = Math.max(nextId, maxId + 1)
  return state
}
