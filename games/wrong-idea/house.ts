import { fits, learn, type Idea } from './learner'
import { BUTLER, PLACES, THINGS, thingOf, type Place, type Thing, type ThingId, type Where } from './things'

// The house as it will be once the butler has carried on. A put or a take is
// worked out to its end here and saved at once; the butler on screen then
// walks the house he is in towards this one (errand.ts).

export type House = {
  /** What the child put in each place, in order. These are the child's own: no idea moves them. */
  readonly examples: Readonly<Record<Place, readonly ThingId[]>>
  /** What the child pulled out of each place: not that. */
  readonly nots: Readonly<Record<Place, readonly ThingId[]>>
  /** The places by when he last thought about them, the latest last. Where two ideas want one thing, the latest has it. */
  readonly order: readonly Place[]
  /** Where each thing ends up, and the butler. Worked out from the rest (`settle`), never set by itself. */
  readonly at: Readonly<Record<ThingId, Where>>
  readonly butler: Place | null
}

type Told = Pick<House, 'examples' | 'nots' | 'order'>

export function ideaOf(told: Told, place: Place): Idea | null {
  return learn(told.examples[place], told.nots[place])
}

/** Whether the child put this thing somewhere. */
export function exampleIn(told: Told, id: ThingId): Place | null {
  return PLACES.find((place) => told.examples[place].includes(id)) ?? null
}

/** Everything that follows from what he was shown and told. */
export function settle(told: Told): House {
  const ideas = [...told.order].reverse().map((place) => ({ place, idea: ideaOf(told, place) }))
  const place = (one: Thing): Place | null =>
    ideas.find(({ place, idea }) => idea !== null && fits(idea, one) && !told.nots[place].includes(one.id))?.place ?? null
  return {
    examples: told.examples,
    nots: told.nots,
    order: told.order,
    at: Object.fromEntries(THINGS.map((one) => [one.id, exampleIn(told, one.id) ?? place(one) ?? 'home'])),
    butler: place(BUTLER),
  }
}

export function freshHouse(): House {
  return settle({ examples: { bed: [], soup: [], bath: [] }, nots: { bed: [], soup: [], bath: [] }, order: PLACES })
}

function without(list: readonly ThingId[], id: ThingId): readonly ThingId[] {
  return list.filter((one) => one !== id)
}

/** The house with this thing no longer an example. With nothing left to go on, he forgets what he was told about that place as well. */
function unshown(told: Told, id: ThingId): Told {
  const from = exampleIn(told, id)
  if (!from) return told
  const left = without(told.examples[from], id)
  return { ...told, examples: { ...told.examples, [from]: left }, nots: left.length > 0 ? told.nots : { ...told.nots, [from]: [] } }
}

function latest(told: Told, place: Place): Told {
  return { ...told, order: [...told.order.filter((one) => one !== place), place] }
}

/** The child let a thing go in a place. */
export function put(house: House, id: ThingId, place: Place): House {
  thingOf(id)
  let told: Told = house
  if (exampleIn(house, id) !== place) {
    told = unshown(told, id)
    told = { ...told, examples: { ...told.examples, [place]: [...told.examples[place], id] } }
  }
  told = { ...told, nots: { ...told.nots, [place]: without(told.nots[place], id) } }
  return settle(latest(told, place))
}

/** The child pulled a thing out of wherever it was, and let it go home. */
export function take(house: House, id: ThingId): House {
  const place = house.at[id]
  if (place === 'home') return house
  const told: Told = unshown(house, id), idea = ideaOf(told, place)
  // Out is out: if what is left would fetch it straight back, it is left out.
  if (idea === null || !fits(idea, thingOf(id))) return settle(latest(told, place))
  return settle(latest({ ...told, nots: { ...told.nots, [place]: [...without(told.nots[place], id), id] } }, place))
}

export function isTidy(house: House): boolean {
  return house.butler === null && THINGS.every((one) => house.at[one.id] === 'home') && PLACES.every((place) => house.examples[place].length === 0)
}
