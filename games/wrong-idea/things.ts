// What is in the house, and what the butler can notice about it: a colour, a
// kind, spots, and whether it is alive. Nothing else about a thing exists for
// him. The table is the whole of the game's content.

export type Colour = 'red' | 'blue' | 'yellow'
export type Kind = 'sock' | 'hat' | 'teapot' | 'cat' | 'hen' | 'piglet' | 'king' | 'queen' | 'gran' | 'butler'

export type Thing = {
  readonly id: string
  readonly kind: Kind
  readonly colour: Colour | null
  readonly spots: boolean
  readonly alive: boolean
  /** Too heavy for the child to carry from home. The butler can carry anything. */
  readonly heavy: boolean
}

const thing = (id: string, kind: Kind, colour: Colour | null, spots = false, alive = false, heavy = false): Thing => ({ id, kind, colour, spots, alive, heavy })

/** Everything that can be put somewhere, in the order the butler fetches it: small things, then animals, then people. */
export const THINGS = [
  thing('red-sock', 'sock', 'red'),
  thing('blue-sock', 'sock', 'blue', true),
  thing('yellow-sock', 'sock', 'yellow'),
  thing('red-hat', 'hat', 'red', true),
  thing('blue-hat', 'hat', 'blue'),
  thing('yellow-hat', 'hat', 'yellow'),
  thing('red-pot', 'teapot', 'red'),
  thing('blue-pot', 'teapot', 'blue'),
  thing('yellow-pot', 'teapot', 'yellow', true),
  thing('cat', 'cat', 'yellow', false, true),
  thing('hen', 'hen', 'blue', true, true),
  thing('piglet', 'piglet', 'red', false, true),
  thing('gran', 'gran', 'yellow', false, true, true),
  thing('queen', 'queen', 'blue', true, true, true),
  thing('king', 'king', 'red', false, true, true),
] as const

export const BUTLER: Thing = thing('butler', 'butler', null, false, true, true)

export type ThingId = string

const byId = new Map<string, Thing>([...THINGS, BUTLER].map((one) => [one.id, one]))

export function thingOf(id: ThingId): Thing {
  const found = byId.get(id)
  if (!found) throw new Error(`no such thing: ${id}`)
  return found
}

export function isThing(id: unknown): id is ThingId {
  return typeof id === 'string' && id !== BUTLER.id && byId.has(id)
}

export const PLACES = ['bed', 'soup', 'bath'] as const
export type Place = (typeof PLACES)[number]
export type Where = Place | 'home'
