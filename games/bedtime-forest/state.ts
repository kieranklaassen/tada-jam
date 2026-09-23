import { ANIMAL_KEYS, START, clampToClearing, type AnimalKey } from './layout'

// What the forest remembers between sessions: who is asleep at home and
// where the others were standing. Nothing else: no nights, no counts. The
// saved shape is small, versioned, and read defensively, because anything
// could be in storage.

export const STATE_VERSION = 1

export type SavedAnimal = { asleep: boolean; x: number; z: number }

export type ForestState = {
  v: typeof STATE_VERSION
  animals: Record<AnimalKey, SavedAnimal>
}

export function defaultForest(): ForestState {
  const animals = {} as Record<AnimalKey, SavedAnimal>
  for (const key of ANIMAL_KEYS) animals[key] = { asleep: false, x: START[key].x, z: START[key].z }
  return { v: STATE_VERSION, animals }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Saved state is untrusted: repair what can be repaired, default the rest. */
export function deserialize(raw: unknown): ForestState {
  const state = defaultForest()
  if (!isRecord(raw) || raw.v !== STATE_VERSION || !isRecord(raw.animals)) return state
  for (const key of ANIMAL_KEYS) {
    const item = raw.animals[key]
    if (!isRecord(item)) continue
    const at = clampToClearing({ x: finite(item.x, START[key].x), z: finite(item.z, START[key].z) }, 4)
    state.animals[key] = { asleep: item.asleep === true, x: Math.round(at.x * 10) / 10, z: Math.round(at.z * 10) / 10 }
  }
  return state
}

export function serialize(state: ForestState): ForestState {
  const animals = {} as Record<AnimalKey, SavedAnimal>
  for (const key of ANIMAL_KEYS) {
    const a = state.animals[key]
    animals[key] = { asleep: a.asleep, x: Math.round(a.x * 10) / 10, z: Math.round(a.z * 10) / 10 }
  }
  return { v: STATE_VERSION, animals }
}

export function allAsleep(state: ForestState): boolean {
  return ANIMAL_KEYS.every((key) => state.animals[key].asleep)
}
