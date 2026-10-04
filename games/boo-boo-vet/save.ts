// What goes into ctx.storage for the whole room, and how it is read back.
// state.ts keeps the version, the position and `finished`; this module wraps
// it, as its header says to, and reads the same raw record again for the
// room's own fields, each repaired by itself. Pure: no DOM, no clock.
//
// Found as left: nothing is judged, moved or replayed by a load. A save that
// cannot be read at all gives a first visit.

import { layOut } from './arrivals'
import { isSpecies } from './cast'
import { GARDEN_HOLDS, MOVABLES, PLACES, PLASTERS_KEPT, PLASTER_SPOTS, freshClinic, type Clinic, type Kept, type Made, type PlasterSpot, type ThingPlace, type Things } from './clinic'
import { LADDER } from './config'
import { CARES, isCare, type Care } from './needs'
import { isWell, repairPatient } from './patient'
import { STATE_VERSION, deserialize, serialize } from './state'

/** The cap the shell sets on a save, and the half of it a largest legal state must stay under. */
export const SAVE_CAP_BYTES = 64 * 1024
export const SAVE_BUDGET_BYTES = SAVE_CAP_BYTES / 2

/** The largest count the stream keeps; past it the count starts again, which only changes which patients come. */
const DRAWN_WRAPS_AT = 0x7fffffff

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function wholeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= DRAWN_WRAPS_AT ? value : fallback
}

/** The care things in a list, each once, in the order of the designed order. */
function cares(value: unknown): Care[] {
  const listed = Array.isArray(value) ? value.filter(isCare) : []
  return CARES.filter((care) => listed.includes(care))
}

function repairGarden(value: unknown): Kept[] {
  if (!Array.isArray(value)) return []
  const kept: Kept[] = []
  for (const entry of value) {
    if (!isRecord(entry) || !isSpecies(entry.species)) continue
    // One that came only to play may have taken nothing with it.
    // What it took is kept in the order it was helped, each thing once, two at most.
    const keeps = (Array.isArray(entry.keeps) ? entry.keeps.filter(isCare) : []).filter((care, index, all) => all.indexOf(care) === index).slice(0, 2)
    kept.push({ species: entry.species, keeps })
  }
  return kept.slice(-GARDEN_HOLDS)
}

function repairThings(value: unknown, someoneOnTable: boolean): Things {
  const record = isRecord(value) ? value : {}
  const things: Things = { bowl: 'cart', blanket: 'cart', brush: 'cart', basket: 'cart', plasters: [] }
  for (const thing of MOVABLES) {
    const place = record[thing]
    if (typeof place !== 'string' || !(PLACES as readonly string[]).includes(place)) continue
    // Only the blanket lies on the basket, and nothing lies on an animal that is not there.
    if (place === 'on-basket' && thing !== 'blanket') continue
    if (place === 'patient' && !someoneOnTable) continue
    things[thing] = place as ThingPlace
  }
  const plasters = Array.isArray(record.plasters) ? record.plasters : []
  things.plasters = plasters
    .filter((spot): spot is PlasterSpot => typeof spot === 'string' && (PLASTER_SPOTS as readonly string[]).includes(spot))
    .filter((spot) => spot !== 'patient' || someoneOnTable)
    .slice(-PLASTERS_KEPT)
  return things
}

function repairMade(value: unknown, things: Things): Made {
  const record = isRecord(value) ? value : {}
  const patches = record.patches
  return {
    // The den is the blanket lying on the basket: the two fields cannot disagree.
    den: things.blanket === 'on-basket',
    foam: record.foam === true,
    boat: record.boat === true,
    crackle: record.crackle === true,
    patches: patches === 1 || patches === 2 || patches === 3 ? patches : 0,
  }
}

/**
 * Reads the room out of a save. `seed` is used only when the save holds no
 * seed of its own, which is a first visit. Each field is repaired by itself:
 * a damaged one takes its default and the rest is kept.
 */
export function deserializeClinic(raw: unknown, childAge: number | null, seed: number, ladder: readonly string[] = LADDER, visitors = false): Clinic {
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return freshClinic(childAge, seed, visitors)
  const base = deserialize(raw, childAge, ladder)
  const fresh = freshClinic(childAge, wholeNumber(raw.seed, seed), visitors)
  // The first thing lies alone on the cart at the first step and never needs showing, so it always counts as shown.
  const shown = cares(Array.isArray(raw.shown) ? [...raw.shown, CARES[0]] : null)
  // The toy always has an animal on the table: where a save holds none, the first visit's own sits down.
  const table = repairPatient(raw.table, ladder) ?? fresh.table
  // The game lays out nobody who needs nothing. A slot last saved by the toy holds such animals: the one on the table
  // stays, well as it is, and the one at the door and the one in the carrier are laid out anew from where the child is.
  const comes = (value: unknown) => {
    const patient = repairPatient(value, ladder)
    return patient && (visitors || patient.needs.length > 0) ? patient : null
  }
  const carrier = comes(raw.carrier)
  let drawn = wholeNumber(raw.drawn, fresh.drawn)
  let waiting = comes(raw.waiting)
  if (!waiting) {
    // There is always one who waits: a new one is laid out from where the child is.
    const known = shown.length > 0 ? shown : fresh.shown
    waiting = layOut({ position: base.position, seed: fresh.seed, drawn, shown: known, recent: [table, carrier].filter((patient) => patient !== null), visitor: visitors })
    drawn = drawn >= DRAWN_WRAPS_AT ? 0 : drawn + 1
  }
  const things = repairThings(raw.things, table !== null)
  // The blanket lies on the basket only where the cart carries the basket: otherwise it could be neither seen nor given.
  if (things.blanket === 'on-basket' && table && !table.cart.includes('basket')) things.blanket = 'cart'
  return {
    v: STATE_VERSION,
    position: base.position,
    // `finished` says the animal on the table is well. A load never judges a cycle, so it only follows the table.
    finished: table !== null && isWell(table),
    seed: fresh.seed,
    drawn,
    table,
    waiting: { ...waiting, fromCarrier: false },
    carrier: carrier ? { ...carrier, fromCarrier: true } : null,
    garden: repairGarden(raw.garden),
    shown: shown.length > 0 ? shown : fresh.shown,
    things,
    made: repairMade(raw.made, things),
  }
}

/** The room as plain JSON: these fields and no others. */
export function serializeClinic(clinic: Clinic): Clinic {
  const { seed, drawn, table, waiting, carrier, garden, shown, things, made } = clinic
  return { ...serialize(clinic), seed, drawn, table, waiting, carrier, garden, shown, things, made }
}

/** How many bytes a save takes as the shell stores it. */
export function savedBytes(clinic: Clinic): number {
  return new TextEncoder().encode(JSON.stringify(serializeClinic(clinic))).length
}

/**
 * Whether the room that was read differs from what the slot holds: a first
 * visit, whose seed and first patient exist nowhere yet, or a save that had
 * to be repaired. Such a room is saved as soon as it is read, so that the
 * same one waits at the door however soon the game is put away.
 */
export function differsFromSlot(raw: unknown, clinic: Clinic): boolean {
  return JSON.stringify(raw ?? null) !== JSON.stringify(serializeClinic(clinic))
}
