// One patient: what it needs, how plainly it shows it, and what a give does.
// This is where an error becomes a consequence (ART.md, "The error as a
// consequence"): a care that does not fit is never refused, its grid cell
// plays, the sign moves one step plainer, and the state stays.
// Pure: no renderer, no DOM, no clock.

import { taste, isSpecies, type Species, type Taste } from './cast'
import { LADDER } from './config'
import { cell, type Cell } from './grid'
import { place, rung } from './ladder'
import { CARES, FITS, PLAIN, fits, isCare, isNeed, isStep, plainer, type Care, type Need, type Step } from './needs'
import type { CycleOutcome } from './state'

export type PatientNeed = {
  need: Need
  /** How plainly the sign is shown now. */
  step: Step
  met: boolean
}

export type Patient = {
  species: Species
  /** The position it was laid out at: a ladder id. */
  at: string
  /** One or two different needs. */
  needs: PatientNeed[]
  /** How many cares did not fit while a need was unmet: 0, 1, or 2 for two or more. */
  wrong: 0 | 1 | 2
  /** The care things that did not fit, each once, in the order first tried: the well scene looks back at each. */
  tried: Care[]
  /** The care things its cart carries. */
  cart: Care[]
  fromCarrier: boolean
}

export function isWell(patient: Patient): boolean {
  return patient.needs.every((entry) => entry.met)
}

/** The need whose sign is on show: the first that is not met. */
export function showing(patient: Patient): PatientNeed | null {
  return patient.needs.find((entry) => !entry.met) ?? null
}

/** The things that helped, in the order of its needs. A well animal takes them to the garden. */
export function helpedBy(patient: Patient): Care[] {
  return patient.needs.filter((entry) => entry.met).map((entry) => FITS[entry.need])
}

/** What a give did. Every give has an answer; none is refused. */
export type Answer =
  /** The care fitted an unmet need: the cell that helps plays. `well` says it was the last need. */
  | { kind: 'helps'; need: Need; taste: Taste; cell: Cell; well: boolean }
  /** The care fitted no unmet need: its cell for the need on show plays, and that sign is now at `step`. */
  | { kind: 'misses'; need: Need; taste: Taste; cell: Cell; step: Step }
  /** The animal needs nothing: the thing is a toy, taken in the manner of its taste. */
  | { kind: 'play'; taste: Taste }

/** Gives a care thing to a patient. The patient that comes back is a new object; the one passed in is not changed. */
export function give(patient: Patient, care: Care): { patient: Patient; answer: Answer } {
  const manner = taste(patient.species, care)
  const helped = patient.needs.find((entry) => !entry.met && fits(care, entry.need))
  if (helped) {
    const needs = patient.needs.map((entry) => (entry === helped ? { ...entry, met: true } : entry))
    const next = { ...patient, needs }
    return { patient: next, answer: { kind: 'helps', need: helped.need, taste: manner, cell: cell(care, helped.need), well: isWell(next) } }
  }
  const shown = showing(patient)
  if (!shown) return { patient, answer: { kind: 'play', taste: manner } }
  const step = plainer(shown.step)
  const needs = patient.needs.map((entry) => (entry === shown ? { ...entry, step } : entry))
  const wrong = Math.min(2, patient.wrong + 1) as 0 | 1 | 2
  const tried = patient.tried.includes(care) ? patient.tried : [...patient.tried, care]
  return { patient: { ...patient, needs, wrong, tried }, answer: { kind: 'misses', need: shown.need, taste: manner, cell: cell(care, shown.need), step } }
}

/** What a stroke of the hand does: the animal shows its sign again, turned to the child. Nothing changes and nothing is counted. */
export type Stroke = { kind: 'shows'; need: Need; step: Step; cell: Cell } | { kind: 'play' }

export function stroke(patient: Patient): Stroke {
  const shown = showing(patient)
  return shown ? { kind: 'shows', need: shown.need, step: shown.step, cell: cell('hand', shown.need) } : { kind: 'play' }
}

/**
 * Whether the patient carried what is new at the stored position, so that a
 * position is never left behind without having been played: it was laid out
 * at that position or above, and at a step that adds a need it has that need.
 * At the later steps every patient laid out there carries what is new.
 */
export function carriesNew(patient: Patient, position: string, ladder: readonly string[] = LADDER): boolean {
  if (place(patient.at, ladder) < place(position, ladder)) return false
  const newest = rung(patient.at).newest
  return newest === null || patient.needs.some((entry) => entry.need === newest)
}

/**
 * How a finished cycle went. Well: no care failed to fit, and the patient
 * carried what is new. Badly: two or more did not fit. Mixed: anything else.
 */
export function judge(patient: Patient, position: string, ladder: readonly string[] = LADDER): CycleOutcome {
  if (patient.wrong >= 2) return 'badly'
  return patient.wrong === 0 && carriesNew(patient, position, ladder) ? 'well' : 'mixed'
}

/** Reads a patient out of a save. Anything that is not a patient gives null, and the caller lays out a new one. */
export function repairPatient(raw: unknown, ladder: readonly string[] = LADDER): Patient | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  if (!isSpecies(record.species) || !Array.isArray(record.needs)) return null
  const needs: PatientNeed[] = []
  for (const entry of record.needs) {
    if (typeof entry !== 'object' || entry === null) continue
    const { need, step, met } = entry as Record<string, unknown>
    if (!isNeed(need) || needs.some((kept) => kept.need === need) || needs.length === 2) continue
    needs.push({ need, step: isStep(step) ? step : PLAIN, met: met === true })
  }
  if (needs.length === 0) return null
  const listed = Array.isArray(record.cart) ? record.cart.filter(isCare) : []
  // The thing that fits is always on the cart, whatever the save says.
  const cart = CARES.filter((care) => listed.includes(care) || needs.some((entry) => FITS[entry.need] === care))
  return {
    species: record.species,
    at: typeof record.at === 'string' && ladder.includes(record.at) ? record.at : ladder[0],
    needs,
    wrong: record.wrong === 1 || record.wrong === 2 ? record.wrong : 0,
    tried: Array.isArray(record.tried) ? record.tried.filter(isCare).filter((care, index, all) => all.indexOf(care) === index) : [],
    cart,
    fromCarrier: record.fromCarrier === true,
  }
}
