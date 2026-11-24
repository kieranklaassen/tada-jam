import { PLACES, SITTERS, SPOTS, headOf, headSpot, type Spot, type Who } from './layout'
import { BLANKETS, freshWorld, seated, settled, type Draped, type World } from './model'

// What goes into ctx.storage: the room as it will be when nobody touches
// anything. A dash in progress is saved as where it leads, so no dash plays on
// load, and a thing in the hand is saved where it came from. The room has no
// ladder: everything is there from the first visit, whatever the child's age.

export const STATE_VERSION = 1

export type Save = {
  v: typeof STATE_VERSION
  covered: Who[]
  belief: Record<Who, Spot | null>
  sausage: Spot
  draped: Draped[]
}

export function serialize(world: World): Save {
  const w = settled(world)
  return {
    v: STATE_VERSION,
    covered: SITTERS.filter((who) => w.sitters[who].covered),
    belief: Object.fromEntries(SITTERS.map((who) => [who, w.sitters[who].belief])) as Save['belief'],
    sausage: w.sausage.kind === 'spot' ? w.sausage.spot : 'hook',
    draped: [...w.draped],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isSpot(value: unknown): value is Spot {
  if (typeof value !== 'string') return false
  return value === 'hook' || Object.hasOwn(SPOTS, value) || SITTERS.some((who) => headSpot(who) === value)
}

/** Saved state is untrusted: what is not this game's record gives the first visit, and each damaged field its own default. */
export function deserialize(raw: unknown): World {
  const world = freshWorld()
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return world
  const covered = Array.isArray(raw.covered) ? raw.covered : []
  const belief = isRecord(raw.belief) ? raw.belief : {}
  if (isSpot(raw.sausage)) world.sausage = { kind: 'spot', spot: raw.sausage }
  let left = BLANKETS
  for (const who of SITTERS) {
    const b = belief[who]
    const known = isSpot(b) && headOf(b) !== who ? b : b === null ? null : undefined
    const under = covered.includes(who)
    if (under) left--
    world.sitters[who] = seated(who, under, known === undefined ? defaultBelief(world, who) : known)
  }
  const things: Draped[] = [...PLACES, 'fish']
  if (Array.isArray(raw.draped)) for (const on of things) if (raw.draped.includes(on) && left > 0) {
    world.draped.push(on)
    left--
  }
  return world
}

/** A belief that could not be read: what one who saw everything would believe. */
function defaultBelief(world: World, who: Who): Spot | null {
  const spot = world.sausage.kind === 'spot' ? world.sausage.spot : 'hook'
  return headOf(spot) === who ? null : spot
}
