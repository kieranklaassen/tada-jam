// The persona roster. Personas are model guesses at children (KTD4); every
// number is a default except where the age-band table in
// docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md
// supports it (see thresholds.ts for the labels and why).

import type { AffordanceKind } from '../kit/sim.ts'
import type { Persona, Provenance } from './types.ts'

const DEFAULTS: Record<string, Provenance> = {
  age: 'default',
  touchJitter: 'default',
  attention: 'default',
  draw: 'default',
  aimInvention: 'default',
  returnPropensity: 'default',
  gestureMix: 'default',
  tempo: 'default',
  focus: 'default',
}

// Focus is the one parameter the table supports, and only for the 3 to 4 row.
function provenanceFor(age: number): Record<string, Provenance> {
  return { ...DEFAULTS, focus: age <= 4 ? 'research' : 'default' }
}

interface Row {
  id: string
  name: string
  age: number
  touchJitter: number
  attention: number
  novelty: number
  aimInvention: number
  returnPropensity: number
}

const ROWS: readonly Row[] = [
  // Kaia: the documented child (age 4, iPad, does not read). Her touch and
  // attention numbers are still defaults, not measurements.
  { id: 'kaia', name: 'Kaia', age: 4, touchJitter: 34, attention: 1500, novelty: 0.6, aimInvention: 0.4, returnPropensity: 0.97 },
  // Tess: her age is ASSUMED to be 5 (the Pebble Table plan describes the trial
  // cohort as 4 to 6 year olds and records no age). One field; correct it here.
  { id: 'tess', name: 'Tess', age: 5, touchJitter: 30, attention: 1800, novelty: 0.5, aimInvention: 0.5, returnPropensity: 0.97 },
  // Archetypes: other traits vary independently of age.
  { id: 'arch-3', name: 'Archetype 3, jittery and quick to tire', age: 3, touchJitter: 46, attention: 1000, novelty: 0.7, aimInvention: 0.25, returnPropensity: 0.95 },
  { id: 'arch-6', name: 'Archetype 6, mastery seeker', age: 6, touchJitter: 22, attention: 2600, novelty: 0.3, aimInvention: 0.6, returnPropensity: 0.95 },
  { id: 'arch-7', name: 'Archetype 7, patient novelty chaser', age: 7, touchJitter: 30, attention: 3600, novelty: 0.8, aimInvention: 0.45, returnPropensity: 0.93 },
  { id: 'arch-8', name: 'Archetype 8, precise and driven', age: 8, touchJitter: 16, attention: 2200, novelty: 0.4, aimInvention: 0.7, returnPropensity: 0.97 },
  { id: 'arch-9', name: 'Archetype 9, jittery novelty chaser', age: 9, touchJitter: 26, attention: 1600, novelty: 0.75, aimInvention: 0.4, returnPropensity: 0.93 },
  { id: 'arch-11', name: 'Archetype 11, patient mastery seeker', age: 11, touchJitter: 14, attention: 3200, novelty: 0.25, aimInvention: 0.8, returnPropensity: 0.97 },
]

export const PERSONAS: readonly Persona[] = ROWS.map((row) => ({
  id: row.id,
  name: row.name,
  age: row.age,
  touchJitter: row.touchJitter,
  attention: row.attention,
  draw: { novelty: row.novelty, mastery: Math.round((1 - row.novelty) * 100) / 100 },
  aimInvention: row.aimInvention,
  returnPropensity: row.returnPropensity,
  provenance: provenanceFor(row.age),
}))

export function getPersona(id: string): Persona {
  const persona = PERSONAS.find((p) => p.id === id)
  if (!persona) throw new Error(`unknown persona: ${id}`)
  return persona
}

export interface GestureProfile {
  // Relative weights of the gesture kinds when the persona picks its own.
  mix: Record<AffordanceKind, number>
  // Ticks of thinking between touches, inclusive.
  thinkMin: number
  thinkMax: number
  // Chance a touch ignores the affordances and lands anywhere on the field.
  freeShare: number
}

// Younger children make more taps and holds and act faster; older children
// make more drags and take longer between touches.
export function gestureProfile(persona: Persona): GestureProfile {
  const age = persona.age
  if (age <= 4) return { mix: { tap: 0.6, hold: 0.25, drag: 0.15 }, thinkMin: 5, thinkMax: 12, freeShare: 0.15 }
  if (age <= 6) return { mix: { tap: 0.5, hold: 0.2, drag: 0.3 }, thinkMin: 7, thinkMax: 15, freeShare: 0.1 }
  if (age <= 8) return { mix: { tap: 0.4, hold: 0.15, drag: 0.45 }, thinkMin: 9, thinkMax: 20, freeShare: 0.07 }
  return { mix: { tap: 0.35, hold: 0.1, drag: 0.55 }, thinkMin: 12, thinkMax: 26, freeShare: 0.05 }
}

// How many of the most salient affordances a persona weighs at once. The
// table's 3 to 4 row offers one or two at a time; older rows allow more.
export function consideredCount(persona: Persona): number {
  if (persona.age <= 4) return 2
  if (persona.age <= 6) return 4
  return Number.POSITIVE_INFINITY
}
