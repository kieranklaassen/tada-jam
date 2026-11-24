import { thingOf, type Colour, type Kind, type Thing, type ThingId } from './things'

// How the butler gets his idea. He has one fixed way of thinking, so a child
// can learn it and then use it:
// - He notices four things, in this order: the colour, what sort of thing it
//   is, whether it has spots, whether it is alive.
// - Shown one thing, he takes the first of those that he has not been told is
//   wrong. A thing pulled out of the place again is how he is told.
// - Shown two or more, he takes everything they have in common.
// - If they have nothing in common he concludes that it is everything.
// The same examples always give the same idea, in whatever order they came.

/** An idea is what a thing has to be. With nothing in it, it is everything. */
export type Idea = {
  readonly colour?: Colour
  readonly kind?: Kind
  readonly spots?: true
  readonly alive?: true
}

type Feature = keyof Idea
const ORDER: readonly Feature[] = ['colour', 'kind', 'spots', 'alive']

function featuresOf(thing: Thing): Idea {
  return {
    ...(thing.colour ? { colour: thing.colour } : {}),
    kind: thing.kind,
    ...(thing.spots ? { spots: true as const } : {}),
    ...(thing.alive ? { alive: true as const } : {}),
  }
}

function only(idea: Idea, features: readonly Feature[]): Idea {
  const out: Record<string, unknown> = {}
  for (const feature of ORDER) if (features.includes(feature) && idea[feature] !== undefined) out[feature] = idea[feature]
  return out as Idea
}

export function fits(idea: Idea, thing: Thing): boolean {
  if (idea.colour && thing.colour !== idea.colour) return false
  if (idea.kind && thing.kind !== idea.kind) return false
  if (idea.spots && !thing.spots) return false
  if (idea.alive && !thing.alive) return false
  return true
}

export function isEverything(idea: Idea): boolean {
  return ORDER.every((feature) => idea[feature] === undefined)
}

export function sameIdea(a: Idea | null, b: Idea | null): boolean {
  if (!a || !b) return a === b
  return ORDER.every((feature) => a[feature] === b[feature])
}

/** Every choice of `count` of the features, in the order he thinks of them. */
function choices(features: readonly Feature[], count: number): Feature[][] {
  if (count === 0) return [[]]
  return features.flatMap((feature, i) => choices(features.slice(i + 1), count - 1).map((rest) => [feature, ...rest]))
}

/** What everything shown has in common. */
export function shared(examples: readonly ThingId[]): Idea {
  const all = examples.map((id) => featuresOf(thingOf(id)))
  return only(all[0], ORDER.filter((feature) => all.every((one) => one[feature] === all[0][feature])))
}

/** His idea from what he was shown and what was pulled out again, or null when he was shown nothing. */
export function learn(examples: readonly ThingId[], nots: readonly ThingId[]): Idea | null {
  if (examples.length === 0) return null
  const common = shared(examples)
  if (examples.length > 1) return common
  const features = ORDER.filter((feature) => common[feature] !== undefined)
  for (let count = 1; count <= features.length; count++) {
    for (const choice of choices(features, count)) {
      const idea = only(common, choice)
      if (nots.every((id) => !fits(idea, thingOf(id)))) return idea
    }
  }
  // Nothing tells them apart. He keeps his first thought and leaves that one thing alone (house.ts).
  return only(common, features.slice(0, 1))
}
