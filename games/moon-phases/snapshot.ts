import type { Home } from './geo'
import { wrap } from './phase'

// Saved between visits: where the moon was, where the child lives, the time
// of day there, which view, and whether the halves are showing. Small,
// versioned, read defensively; version 1 slots (no home, no time) still load.

export const SAVE_VERSION = 2
export type MoonState = { v: typeof SAVE_VERSION; elongation: number; pov: boolean; halves: boolean; home: Home | null; hours: number | null }

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export function serialize(elongation: number, pov: boolean, halves: boolean, home: Home, hours: number): MoonState {
  const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places
  return { v: SAVE_VERSION, elongation: round(wrap(elongation), 3), pov, halves, home: { lat: round(home.lat, 4), lon: round(home.lon, 4) }, hours: round(((hours % 24) + 24) % 24, 2) }
}

export function deserialize(value: unknown): MoonState | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (raw.v !== 1 && raw.v !== SAVE_VERSION) return null
  const elongation = finite(raw.elongation) ? wrap(raw.elongation) : 0
  const place = raw.home as Record<string, unknown> | null | undefined
  const home = place && finite(place.lat) && finite(place.lon) && Math.abs(place.lat) <= Math.PI / 2 ? { lat: place.lat, lon: place.lon } : null
  const hours = finite(raw.hours) ? ((raw.hours % 24) + 24) % 24 : null
  return { v: SAVE_VERSION, elongation, pov: raw.pov === true, halves: raw.halves === true, home, hours }
}
