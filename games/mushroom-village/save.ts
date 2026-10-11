import { FIRST_MUSHROOM_TO_AGE, FULL, MOST } from './config'
import { GNOMES, MOSS, inWater, mossBottom, mossTop, pebbleMay, type GnomeId } from './ground'
import type { Point } from './input'
import { GRID, MOST_POINTS, type Path } from './paths'
import { STATE_VERSION, deserialize as readState, freshState, isReadable, isRecord, serialize as writeState, type GameState } from './state'
import { hatStaysOut } from './tastes'

// What the glade keeps: the template's fields, and the village. It wraps
// state.ts as that file's header describes: the template's fields are read by
// `deserialize` there, and the same raw record is read a second time here for
// the game's own, each repaired by itself.

/** A mushroom as it is kept. What kind it is is not kept: it is read from the ground at its foot, which never changes. */
export type MushroomSave = {
  /** A small whole number: one more than the highest in the village when the mushroom is grown, so ids rise in the order of building. */
  id: number
  /** Where its foot stands, in whole stage units. */
  x: number
  y: number
  /** The steps it was held for, 1 to FULL. */
  size: number
  /** Whether it has a door, and so is a house. */
  door: boolean
}

/** For each gnome, the id of the mushroom he lives in, or null while he waits on the log. */
export type Homes = Record<GnomeId, number | null>

/** The first showings that have started. */
export type Showing = 'cart' | 'pebbles'
const SHOWINGS: readonly Showing[] = ['cart', 'pebbles']

export type VillageSave = GameState & {
  mushrooms: MushroomSave[]
  /** The pebble paths, each a list of points on the grid. A point that lies in the water is a stepping stone. */
  paths: Path[]
  homes: Homes
  /** Whether the tall gnome's hat lies on his doorstep. */
  hatOff: boolean
  /** Whether the sun is down. */
  night: boolean
  shown: Showing[]
}

/** The one squat red mushroom a first visit by the youngest opens with: three steps tall, in the sun. */
export const FIRST_MUSHROOM: MushroomSave = { id: 1, x: 930, y: 500, size: 3, door: false }

export const nobodyHome = (): Homes => ({ tall: null, sleepy: null, sneezy: null, baker: null })

/** A first visit: bare moss, or for a child of three or younger, and for no age, one squat red mushroom in the sun. */
export function freshSave(childAge: number | null): VillageSave {
  const youngest = childAge === null || childAge <= FIRST_MUSHROOM_TO_AGE
  return { ...freshState(childAge), mushrooms: youngest ? [{ ...FIRST_MUSHROOM }] : [], paths: [], homes: nobodyHome(), hatOff: false, night: false, shown: [] }
}

const whole = (value: unknown, low: number, high: number): number | null => (typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high ? value : null)

/** One kept mushroom, or null when the entry cannot be one: a foot outside the moss or in the water, a size out of range. */
function readMushroom(raw: unknown): MushroomSave | null {
  if (!isRecord(raw)) return null
  const id = whole(raw.id, 1, 1_000_000), x = whole(raw.x, MOSS.left, MOSS.right), y = whole(raw.y, MOSS.top, MOSS.bottom), size = whole(raw.size, 1, FULL)
  if (id === null || x === null || y === null || size === null || y < mossTop(x) || y > mossBottom(x) || inWater(x, y)) return null
  return { id, x, y, size, door: raw.door === true }
}

/** One pebble, or null: a point off the grid, or where no pebble may lie. */
function readPoint(raw: unknown): Point | null {
  if (!isRecord(raw)) return null
  const x = whole(raw.x, 0, 4000), y = whole(raw.y, 0, 4000)
  if (x === null || y === null || x % GRID !== 0 || y % GRID !== 0 || !pebbleMay(x, y)) return null
  return { x, y }
}

/**
 * Saved state is untrusted. Anything that is not this game's record gives a first visit. Inside a record every
 * field is read by itself: a mushroom or a pebble that cannot be one is left out and the rest are kept, a gnome's
 * home that is not a house with a door, or is another gnome's, is no home, and the hat lies on the step only where
 * the tall gnome lives in a low house.
 */
export function deserialize(raw: unknown, childAge: number | null = null): VillageSave {
  if (!isReadable(raw)) return freshSave(childAge)
  // Open play has no ending, so the stored `finished` is never true.
  const state = { ...readState(raw, childAge), finished: false }
  const mushrooms: MushroomSave[] = []
  if (Array.isArray(raw.mushrooms)) {
    for (const entry of raw.mushrooms) {
      const mushroom = readMushroom(entry)
      if (mushroom && mushrooms.length < MOST && !mushrooms.some((m) => m.id === mushroom.id)) mushrooms.push(mushroom)
    }
  }
  const paths: Path[] = []
  let points = 0
  if (Array.isArray(raw.paths)) {
    for (const entry of raw.paths) {
      if (!Array.isArray(entry)) continue
      const path: Path = []
      for (const at of entry) {
        const point = readPoint(at)
        if (point && points < MOST_POINTS) { path.push(point); points += 1 }
      }
      if (path.length > 0) paths.push(path)
    }
  }
  const homes = nobodyHome(), stored = isRecord(raw.homes) ? raw.homes : {}
  for (const who of GNOMES) {
    const id = whole(stored[who], 1, 1_000_000)
    const house = mushrooms.find((m) => m.id === id && m.door)
    if (house && !GNOMES.some((other) => homes[other] === house.id)) homes[who] = house.id
  }
  const tallHouse = mushrooms.find((m) => m.id === homes.tall)
  const shown = SHOWINGS.filter((showing) => Array.isArray(raw.shown) && raw.shown.includes(showing))
  return { ...state, mushrooms, paths, homes, hatOff: tallHouse !== undefined && hatStaysOut(tallHouse.size), night: raw.night === true, shown }
}

export function serialize(save: VillageSave): VillageSave {
  return {
    ...writeState(save),
    mushrooms: save.mushrooms.map(({ id, x, y, size, door }) => ({ id, x, y, size, door })),
    paths: save.paths.map((path) => path.map(({ x, y }) => ({ x, y }))),
    homes: { tall: save.homes.tall, sleepy: save.homes.sleepy, sneezy: save.homes.sneezy, baker: save.homes.baker },
    hatOff: save.hatOff,
    night: save.night,
    shown: [...save.shown],
  }
}

export { STATE_VERSION }
