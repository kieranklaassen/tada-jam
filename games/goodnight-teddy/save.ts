import { PLACES } from './bear'
import { FIRST_MUD } from './config'
import { LAYERS, digits, freshFur, fromDigits, type Fur } from './fur'
import { deserialize as readBase, isReadable, serialize as writeBase, type GameState } from './state'

// What the game saves, round the template's record (state.ts): the fields the design sheet lists under "What is
// stored", under the names and in the shapes it gives. Everything here is plain data and pure: no clock, no
// canvas. A thing in the hand or in the air is never in the record.

export type Lamp = 'up' | 'down'
export type Curtain = 'closed' | 'open'
export type Phase = 'evening' | 'night' | 'morning'
/** Who a cloth can rest on, besides its own place. */
export type Wearer = 'teddy' | 'duck' | 'cat' | 'lamp' | 'tub'
export const WEARERS: readonly Wearer[] = ['teddy', 'duck', 'cat', 'lamp', 'tub']
export type BlanketAt = 'bed' | Wearer
export type PyjamasAt = 'peg' | Wearer
export type DuckCoat = 'plain' | 'foam' | 'shine'
export type CatCoat = 'plain' | 'foam' | 'wet' | 'fluff'
export type Shade = 'plain' | 'foam'
export const MOST_SUDS = 3

export type Save = GameState & {
  /** Evening is the play, night is Teddy asleep in bed, morning is Teddy waiting behind the door's glass. */
  phase: Phase
  /** His coat, as it is in play: four layers of numbers from 0 to 1 over the grid (fur.ts). Stored as digits. */
  fur: Fur
  lamp: Lamp
  curtain: Curtain
  blanket: BlanketAt
  pyjamas: PyjamasAt
  duck: DuckCoat
  cat: CatCoat
  shade: Shade
  /** The suds in the bath, a whole number from 0 to `MOST_SUDS`. */
  suds: number
  /** The places that were muddy this morning, so the next morning's differ. */
  mudPlaces: string[]
  /** Where the seeded stream stands. */
  stream: number
}

export type Stored = Omit<Save, 'fur'> & { fur: Record<keyof Fur, string> }

const isPlace = (id: unknown): id is string => typeof id === 'string' && PLACES.some((place) => place.id === id)

/** The places that are muddy on the very first evening. No age takes the youngest row, and both ends are open. */
export function firstMud(childAge: number | null): string[] {
  let places = FIRST_MUD[0].places
  if (childAge !== null) for (const row of FIRST_MUD) if (childAge >= row.fromAge) places = row.places
  return places.filter(isPlace)
}

/** One step of the stream: a whole number in, the next whole number out. */
export function nextStream(stream: number): number {
  return (Math.imul(stream >>> 0, 1664525) + 1013904223) >>> 0
}

/**
 * The next morning's mud: two to four places drawn from the stream, never the same set as the morning before.
 * Returns the places and where the stream stands afterwards.
 */
export function nextMud(stream: number, before: readonly string[]): { places: string[]; stream: number } {
  const same = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((id) => b.includes(id))
  let at = stream
  for (;;) {
    at = nextStream(at)
    const count = 2 + (at >>> 28) % 3
    const left = PLACES.map((place) => place.id)
    const places: string[] = []
    let draw = at
    while (places.length < count) {
      draw = nextStream(draw)
      places.push(left.splice((draw >>> 8) % left.length, 1)[0])
    }
    if (!same(places, before)) return { places, stream: at }
  }
}

export function freshSave(childAge: number | null, seed = 1): Save {
  const places = firstMud(childAge)
  return {
    ...readBase(null, childAge),
    phase: 'evening',
    fur: freshFur(places),
    lamp: 'up',
    curtain: 'closed',
    blanket: 'bed',
    pyjamas: 'peg',
    duck: 'plain',
    cat: 'plain',
    shade: 'plain',
    suds: 0,
    mudPlaces: places,
    stream: seed >>> 0,
  }
}

const oneOf = <T extends string>(raw: unknown, allowed: readonly T[], or: T): T => (allowed.includes(raw as T) ? (raw as T) : or)

/**
 * Saved state is untrusted. A record this build cannot read gives a first evening. Inside a record each field is
 * repaired by itself: a damaged field takes its default and the rest is kept. A coat with a damaged layer is the
 * first evening's coat, since a coat is only true as a whole. Then the fields are made to agree with the phase,
 * which wins: Teddy asleep is under the blanket in the dark behind a closed curtain, and Teddy outside wears nothing.
 */
export function deserialize(raw: unknown, childAge: number | null = null, seed = 1): Save {
  const fresh = freshSave(childAge, seed)
  if (!isReadable(raw)) return fresh
  const base = readBase(raw, childAge)
  const stored = raw.fur
  let fur: Fur | null = null
  if (typeof stored === 'object' && stored !== null) {
    const layers = LAYERS.map((layer) => fromDigits((stored as Record<string, unknown>)[layer]))
    if (layers.every((layer) => layer !== null)) fur = { mud: layers[0]!, foam: layers[1]!, wet: layers[2]!, fluff: layers[3]! }
  }
  const phase = oneOf<Phase>(raw.phase, ['evening', 'night', 'morning'], 'evening')
  let blanket = oneOf<BlanketAt>(raw.blanket, ['bed', ...WEARERS], 'bed')
  let pyjamas = oneOf<PyjamasAt>(raw.pyjamas, ['peg', ...WEARERS], 'peg')
  let curtain = oneOf<Curtain>(raw.curtain, ['closed', 'open'], 'closed')
  let lamp: Lamp = raw.lamp === 'down' ? 'down' : 'up'
  if (phase === 'night') { blanket = 'teddy'; curtain = 'closed'; lamp = 'down' }
  if (phase === 'morning') {
    curtain = 'open'
    if (blanket === 'teddy') blanket = 'bed'
    if (pyjamas === 'teddy') pyjamas = 'peg'
  }
  // Only Teddy wears both at once.
  if (pyjamas !== 'teddy' && (pyjamas as string) === blanket) pyjamas = 'peg'
  const places = Array.isArray(raw.mudPlaces) ? raw.mudPlaces.filter(isPlace).filter((id, n, all) => all.indexOf(id) === n).slice(0, 4) : []
  const suds = typeof raw.suds === 'number' && Number.isInteger(raw.suds) ? Math.min(MOST_SUDS, Math.max(0, raw.suds)) : 0
  return {
    ...base,
    // The phase says whether the evening on screen is over, so the two never disagree.
    finished: phase !== 'evening',
    phase,
    fur: fur ?? fresh.fur,
    lamp,
    curtain,
    blanket,
    pyjamas,
    duck: oneOf<DuckCoat>(raw.duck, ['plain', 'foam', 'shine'], 'plain'),
    cat: oneOf<CatCoat>(raw.cat, ['plain', 'foam', 'wet', 'fluff'], 'plain'),
    shade: oneOf<Shade>(raw.shade, ['plain', 'foam'], 'plain'),
    suds,
    mudPlaces: places.length >= 2 ? places : fresh.mudPlaces,
    stream: typeof raw.stream === 'number' && Number.isInteger(raw.stream) && raw.stream >= 0 ? raw.stream >>> 0 : fresh.stream,
  }
}

export function serialize(save: Save): Stored {
  return {
    ...writeBase(save),
    phase: save.phase,
    fur: { mud: digits(save.fur.mud), foam: digits(save.fur.foam), wet: digits(save.fur.wet), fluff: digits(save.fur.fluff) },
    lamp: save.lamp,
    curtain: save.curtain,
    blanket: save.blanket,
    pyjamas: save.pyjamas,
    duck: save.duck,
    cat: save.cat,
    shade: save.shade,
    suds: save.suds,
    mudPlaces: [...save.mudPlaces],
    stream: save.stream,
  }
}
