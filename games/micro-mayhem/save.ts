import { FIRST, FOG_ALL, ROOMS, type House, type RoomId, type Step3 } from './house'
import { deserialize as readBase, freshState, isReadable, serialize as writeBase, type GameState } from './state'

// What the game saves, on top of what state.ts holds: the house. The design
// sheet lists the fields (ART.md, "The designed order, and what is stored").
// Each is read by itself: a field that is damaged or missing takes its first
// value and the rest is kept.

export type Save = GameState & House

/** A first visit, at every age and with no age: the bedroom at night, every thing at its first step. */
export function freshSave(childAge: number | null): Save {
  return { ...freshState(childAge), ...FIRST }
}

const step3 = (value: unknown): Step3 => (value === 1 || value === 2 || value === 3 ? value : 0)

/** Saved state is untrusted: anything unreadable gives a first visit, and a damaged field takes its first value. */
export function deserialize(raw: unknown, childAge: number | null = null): Save {
  const base = readBase(raw, childAge)
  if (!isReadable(raw)) return { ...base, ...FIRST }
  const place: RoomId = ROOMS.includes(raw.place as RoomId) ? (raw.place as RoomId) : 'bedroom'
  const house: House = {
    place,
    // Every room but the bedroom is seen by day only.
    day: raw.day === true || place !== 'bedroom',
    dog: step3(raw.dog),
    full: raw.full === true,
    balloon: step3(raw.balloon),
    fly: raw.fly === 1 ? 1 : 0,
    eggs: step3(raw.eggs),
    pies: step3(raw.pies),
    fog: typeof raw.fog === 'number' && Number.isInteger(raw.fog) && raw.fog >= 0 && raw.fog <= FOG_ALL ? raw.fog : FOG_ALL,
    weed: raw.weed === 1 || raw.weed === 2 ? raw.weed : 0,
    flower: raw.flower === true,
    soup: step3(raw.soup),
    served: raw.served === true,
  }
  return { ...base, ...house }
}

export function serialize(save: Save): Save {
  return {
    ...writeBase(save),
    place: save.place,
    day: save.day,
    dog: save.dog,
    full: save.full,
    balloon: save.balloon,
    fly: save.fly,
    eggs: save.eggs,
    pies: save.pies,
    fog: save.fog,
    weed: save.weed,
    flower: save.flower,
    soup: save.soup,
    served: save.served,
  }
}

/** The house of a save. */
export function houseOf(save: Save): House {
  const { place, day, dog, full, balloon, fly, eggs, pies, fog, weed, flower, soup, served } = save
  return { place, day, dog, full, balloon, fly, eggs, pies, fog, weed, flower, soup, served }
}
