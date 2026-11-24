import { freshHouse, settle, type House } from './house'
import { PLACES, isThing, type Place, type ThingId } from './things'
import { WISHES, firstWish, isMet } from './wishes'

// What goes into ctx.storage: small plain JSON, versioned, read defensively.
// It holds the house as it ends up, never the butler's errand: an errand that
// was cut off by a put-away is found done.

export const SAVE_VERSION = 1

export type Saved = {
  v: typeof SAVE_VERSION
  house: House
  wish: number
  /** A wish is on show over the grandmother's chair. */
  dreaming: boolean
  /** The butler has had his first idea. */
  begun: boolean
}

export function fresh(childAge: number | null): Saved {
  return { v: SAVE_VERSION, house: freshHouse(), wish: firstWish(childAge), dreaming: false, begun: false }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

function ids(value: unknown): ThingId[] {
  return Array.isArray(value) ? [...new Set(value.filter(isThing))] : []
}

/** The house is worked out again from what the child put where and pulled out, so a damaged record never gives a house that play could not reach. */
function readHouse(raw: unknown): House {
  if (!isRecord(raw)) return freshHouse()
  const examples: Record<Place, ThingId[]> = { bed: [], soup: [], bath: [] }, nots: Record<Place, ThingId[]> = { bed: [], soup: [], bath: [] }
  const saved = isRecord(raw.examples) ? raw.examples : {}, told = isRecord(raw.nots) ? raw.nots : {}
  const used = new Set<ThingId>()
  for (const place of PLACES) {
    for (const id of ids(saved[place])) {
      if (used.has(id)) continue
      used.add(id)
      examples[place].push(id)
    }
  }
  for (const place of PLACES) if (examples[place].length > 0) nots[place] = ids(told[place]).filter((id) => !examples[place].includes(id))
  const order = Array.isArray(raw.order) ? PLACES.filter((place) => !(raw.order as unknown[]).includes(place)) : [...PLACES]
  const known = Array.isArray(raw.order) ? [...new Set(raw.order.filter((one): one is Place => PLACES.includes(one as Place)))] : []
  return settle({ examples, nots, order: [...order, ...known] })
}

export function deserialize(raw: unknown, childAge: number | null): Saved {
  const start = fresh(childAge)
  if (!isRecord(raw) || raw.v !== SAVE_VERSION) return start
  const wish = WISHES.findIndex((one) => one.id === raw.wish)
  return {
    v: SAVE_VERSION,
    house: readHouse(raw.house),
    wish: wish >= 0 ? wish : start.wish,
    dreaming: raw.dreaming === true,
    begun: raw.begun === true,
  }
}

/** A wish the outcome already meets is saved as met, so a put-away before the butler has finished replays no scene. */
export function serialize(saved: Saved): Record<string, unknown> {
  const met = saved.dreaming && isMet(WISHES[saved.wish], saved.house)
  return {
    v: SAVE_VERSION,
    house: { examples: saved.house.examples, nots: saved.house.nots, order: saved.house.order },
    wish: WISHES[met ? (saved.wish + 1) % WISHES.length : saved.wish].id,
    dreaming: saved.dreaming && !met,
    begun: saved.begun,
  }
}
