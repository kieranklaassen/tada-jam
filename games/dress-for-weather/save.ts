import { BUTTONS, FIGURES, GARMENTS, PARTS, TUG_STEPS, ZIP_TEETH, sameSpot, type Figure, type Garment, type SpotPart, type Wearer, type Where } from './kinds'
import { deserialize as readBase, freshState, isReadable, isRecord, serialize as writeBase, type GameState } from './state'

// What the hall keeps in ctx.storage, on top of the template's fields
// (state.ts): the fields the design sheet lists under "What is stored". Small
// plain JSON under the template's version, read field by field, each repaired
// by itself. A field an older save does not have takes its first-visit value.

export const WEATHERS = ['rain', 'snow', 'wind', 'sun'] as const
export type Weather = (typeof WEATHERS)[number]
export const MARKS = ['dry', 'wet', 'snowy'] as const
export type Mark = (typeof MARKS)[number]
/** What happens once, in the order it happens. */
export const ONCE = ['door', 'out', 'vane'] as const
export type Once = (typeof ONCE)[number]

export type Save = GameState & {
  /** Who stands in the middle. */
  turn: Figure
  /** For each garment, the rack or who wears it and on which part. No two name the same part of the same wearer. */
  where: Record<Garment, Where>
  /** How many of the raincoat's teeth are closed. */
  zip: number
  /** Whether each of the duffel coat's buttons is through its slit. */
  buttons: boolean[]
  /** How far the boots are pulled on. */
  tug: number
  /** Whether the umbrella is open. An umbrella on the rack is shut. */
  open: boolean
  /** Where the vane points. */
  weather: Weather
  /** The one in the middle has come home from an outing and still wears something. */
  back: boolean
  /** What the last outing left on each garment. A garment on the rack is dry. */
  marks: Record<Garment, Mark>
  /** The marks of what happens once. */
  shown: Once[]
}

/** A child of this age or younger, or of no known age, finds the raincoat already on with its zip open. */
export const COAT_ON_UP_TO = 3
/** Who stands in the middle on a first visit. */
export const FIRST_TURN: Figure = 'child'

/** A first visit. Age is a hint for what it opens on, and nothing else. */
export function freshSave(childAge: number | null): Save {
  const where = Object.fromEntries(GARMENTS.map((garment) => [garment, 'rack'])) as Record<Garment, Where>
  if (childAge === null || childAge <= COAT_ON_UP_TO) where.raincoat = { who: FIRST_TURN, part: 'body' }
  const marks = Object.fromEntries(GARMENTS.map((garment) => [garment, 'dry'])) as Record<Garment, Mark>
  return { ...freshState(childAge), turn: FIRST_TURN, where, zip: 0, buttons: Array.from({ length: BUTTONS }, () => false), tug: 0, open: false, weather: 'rain', back: false, marks, shown: [] }
}

function readWhere(raw: unknown): Where | null {
  if (raw === 'rack') return 'rack'
  if (!isRecord(raw)) return null
  const who = raw.who, part = raw.part
  if (who === 'dog') return part === 'back' ? { who, part } : null
  if (typeof who !== 'string' || !(FIGURES as readonly string[]).includes(who)) return null
  if (typeof part !== 'string' || !(PARTS as readonly string[]).includes(part)) return null
  return { who: who as Wearer, part: part as SpotPart }
}

const whole = (raw: unknown, most: number, otherwise: number): number => (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw <= most ? raw : otherwise)
const oneOf = <T extends string>(raw: unknown, among: readonly T[], otherwise: T): T => (typeof raw === 'string' && (among as readonly string[]).includes(raw) ? (raw as T) : otherwise)

/** Whether the one in the middle has anything on. */
export function middleWears(save: Pick<Save, 'turn' | 'where'>): boolean {
  return GARMENTS.some((garment) => {
    const where = save.where[garment]
    return where !== 'rack' && where.who === save.turn
  })
}

/**
 * Saved state is untrusted. A record this build cannot read gives a first visit for the child's age. Inside a
 * record each field is repaired by itself: a garment with no readable place hangs on the rack, and of two
 * garments on one part the later one in the rack's order goes back to the rack. Two fields are also held to
 * what the others say: `back` is only true of a figure that wears something, and `finished` only of one that
 * wears nothing.
 */
export function deserialize(raw: unknown, childAge: number | null = null): Save {
  if (!isReadable(raw)) return freshSave(childAge)
  const base = readBase(raw, childAge)
  const places = isRecord(raw.where) ? raw.where : {}
  const where = {} as Record<Garment, Where>
  for (const garment of GARMENTS) {
    const read = readWhere(places[garment]) ?? 'rack'
    where[garment] = read !== 'rack' && GARMENTS.some((other) => where[other] !== undefined && sameSpot(where[other], read)) ? 'rack' : read
  }
  const turn = oneOf(raw.turn, FIGURES, FIRST_TURN)
  const wears = middleWears({ turn, where })
  const stains = isRecord(raw.marks) ? raw.marks : {}
  const marks = Object.fromEntries(GARMENTS.map((garment) => [garment, where[garment] === 'rack' ? 'dry' : oneOf(stains[garment], MARKS, 'dry')])) as Record<Garment, Mark>
  const seen = Array.isArray(raw.shown) ? raw.shown : []
  const buttons = Array.from({ length: BUTTONS }, (_, i) => Array.isArray(raw.buttons) && raw.buttons[i] === true)
  return {
    ...base,
    finished: base.finished && !wears,
    turn,
    where,
    zip: whole(raw.zip, ZIP_TEETH, 0),
    buttons,
    tug: whole(raw.tug, TUG_STEPS, 0),
    open: raw.open === true && where.umbrella !== 'rack',
    weather: oneOf(raw.weather, WEATHERS, 'rain'),
    back: raw.back === true && wears,
    marks,
    shown: ONCE.filter((mark) => seen.includes(mark)),
  }
}

export function serialize(save: Save): Save {
  const where = Object.fromEntries(GARMENTS.map((garment) => [garment, save.where[garment] === 'rack' ? 'rack' : { ...(save.where[garment] as Exclude<Where, 'rack'>) }])) as Record<Garment, Where>
  return { ...writeBase(save), turn: save.turn, where, zip: save.zip, buttons: [...save.buttons], tug: save.tug, open: save.open, weather: save.weather, back: save.back, marks: { ...save.marks }, shown: [...save.shown] }
}
