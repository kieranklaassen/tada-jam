import { wrap } from './phase'

// Saved between visits: where the moon was, which view, and whether the
// halves are showing. Small, versioned, read defensively.

export const SAVE_VERSION = 1
export type MoonState = { v: typeof SAVE_VERSION; elongation: number; pov: boolean; halves: boolean }

export function serialize(elongation: number, pov: boolean, halves: boolean): MoonState {
  return { v: SAVE_VERSION, elongation: Math.round(wrap(elongation) * 1000) / 1000, pov, halves }
}

export function deserialize(value: unknown): MoonState | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (raw.v !== SAVE_VERSION) return null
  const elongation = typeof raw.elongation === 'number' && Number.isFinite(raw.elongation) ? wrap(raw.elongation) : 0
  return { v: SAVE_VERSION, elongation, pov: raw.pov === true, halves: raw.halves === true }
}
