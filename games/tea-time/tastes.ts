import type { Spot } from './layout'
import type { LiftTaste } from './party'
import { holds, puddleNear, thingById, type GuestId, type Thing, type World } from './world'

// The guests' fixed tastes, and what a lift of the cup finds. A guest drinks
// from the cup at its place, whoever the cup belongs to and whatever is
// painted in it, so what it finds depends only on how much tea is there and
// on how its place is laid. Nothing here is a verdict on the child: a lift
// gives the taste as the guest finds it and a few plain facts about the cup,
// and the view plays what that much tea does.
//
// Amounts are in cupfuls (forms.ts). The numbers are the game's own choice: a
// pour is to taste within about a finger's width of level. Only `drink`
// changes the world it is given; everything else here only looks.

/** The Bear's cup is to his taste from this amount up. He never finds a cup too full. */
export const BEAR_FROM = 0.85
/** The Mouse's drop and the Hen's half: to taste inside the range, the ends included. */
export const MOUSE_RANGE: readonly [number, number] = [0.06, 0.27]
export const HEN_RANGE: readonly [number, number] = [0.38, 0.62]
/** The Ducklings' two cups are the same when they differ by no more than this, */
export const TWINS_APART = 0.1
/** and each must hold at least this. */
export const TWINS_LEAST = 0.06
/** The Mouse minds tea on the cloth within this reach of her place, */
export const PUDDLE_REACH = 1.3
/** when there is more of it than this. */
export const PUDDLE_MINDS = 0.05
/** A spoon that lies this near a place is that place's spoon. */
export const SPOON_REACH = 1.5
/** A cup, or the saucer under it, that stands this near a place is at that place. */
export const CUP_REACH = 0.9

/** Tea comes in many small pours, so an amount meant to sit on an edge may be a hair off it. */
const HAIR = 1e-9
const atLeast = (amount: number, edge: number) => amount >= edge - HAIR
const far = (thing: Thing, spot: Spot) => Math.hypot(thing.x - spot.x, thing.z - spot.z)

/** The saucer a cup stands on, if it stands on one. */
function saucerUnder(world: World, cup: Thing): Thing | undefined {
  const under = thingById(world, cup.on)
  return under && under.kind === 'saucer' ? under : undefined
}

/**
 * The cup that is this guest's at the moment: the one in its paw, else the
 * one on a saucer at its place, else the nearest one standing at its place.
 * A cup in another guest's paw is nobody else's.
 */
export function cupOf(world: World, guest: GuestId, place: Spot): Thing | undefined {
  const cups = world.things.filter((thing) => thing.kind === 'cup')
  const held = cups.find((cup) => cup.heldBy === guest)
  if (held) return held
  const standing = cups.filter((cup) => cup.heldBy === null)
  const nearest = (spotOf: (cup: Thing) => Thing | undefined): Thing | undefined => {
    let best: Thing | undefined
    let bestFar = Infinity
    for (const cup of standing) {
      const at = spotOf(cup)
      if (!at) continue
      const distance = far(at, place)
      if (distance <= CUP_REACH && distance < bestFar) { best = cup; bestFar = distance }
    }
    return best
  }
  return nearest((cup) => saucerUnder(world, cup)) ?? nearest((cup) => cup)
}

/** Whether a spoon is at a place: in the cup, on the saucer, or lying near. */
function spoonAt(world: World, place: Spot, cup: Thing | undefined, saucer: Thing | undefined): boolean {
  return world.things.some((thing) => thing.kind === 'spoon'
    && ((cup !== undefined && thing.on === cup.id) || (saucer !== undefined && thing.on === saucer.id) || far(thing, place) <= SPOON_REACH))
}

/** How a guest's place is laid: a saucer under its cup, and a spoon. */
export function placeLaid(world: World, guest: GuestId, place: Spot): { saucer: boolean; spoon: boolean } {
  const cup = cupOf(world, guest, place)
  const saucer = cup && saucerUnder(world, cup)
  return { saucer: saucer !== undefined, spoon: spoonAt(world, place, cup, saucer) }
}

/** Why a guest waits and does not lift its cup yet. */
export type Why = 'no-cup' | 'no-saucer' | 'no-spoon' | 'puddle-near' | 'twin-not-poured' | 'cup-empty'

/** What the sip scene can use: facts about the cup, never a verdict. */
export type Detail = 'cup-too-small' | 'saucer-wet' | 'spoon-in-cup' | 'brimful' | 'twin-has-more' | 'twin-has-less'

/** One lift of the cup: how the guest finds it, whether it drinks, and what else is true of the cup. */
export type Lift = { taste: LiftTaste; drinks: boolean; details: Detail[] }

/** The other Duckling, or null for anyone else. */
export function twinOf(guest: GuestId): GuestId | null {
  return guest === 'duckling-a' ? 'duckling-b' : guest === 'duckling-b' ? 'duckling-a' : null
}

/** How the Bear, the Mouse or the Hen finds an amount. */
function ownTaste(guest: 'bear' | 'mouse' | 'hen', tea: number): LiftTaste {
  if (guest === 'bear') return atLeast(tea, BEAR_FROM) ? 'right' : 'short'
  const [least, most] = guest === 'mouse' ? MOUSE_RANGE : HEN_RANGE
  return !atLeast(tea, least) ? 'short' : atLeast(most, tea) ? 'right' : 'over'
}

/**
 * A guest lifts its cup, or waits. It waits for a cup with tea in it and a
 * saucer to set it down on; the Hen waits for her spoon, the Mouse for a dry
 * cloth, and a Duckling for its twin's cup to be poured. Then the amount is
 * what it is: to the guest's taste, short of it, or over it. The guest drinks
 * a cup that is to its taste. It also drains a cup that is full to the brim
 * and still short, because that cup is too small for it, and holds it out
 * again. Any other cup keeps its tea as it is.
 */
export function judgeLift(world: World, guest: GuestId, place: Spot, twinPlace?: Spot): Lift | { waits: Why } {
  const cup = cupOf(world, guest, place)
  if (!cup) return { waits: 'no-cup' }
  if (cup.tea < HAIR) return { waits: 'cup-empty' }
  const saucer = saucerUnder(world, cup)
  if (!saucer) return { waits: 'no-saucer' }
  if (guest === 'hen' && !spoonAt(world, place, cup, saucer)) return { waits: 'no-spoon' }
  if (guest === 'mouse' && puddleNear(world, place, PUDDLE_REACH) > PUDDLE_MINDS) return { waits: 'puddle-near' }

  const details: Detail[] = []
  let taste: LiftTaste
  if (guest === 'duckling-a' || guest === 'duckling-b') {
    const other = twinPlace ? cupOf(world, guest === 'duckling-a' ? 'duckling-b' : 'duckling-a', twinPlace) : undefined
    const poured = atLeast(cup.tea, TWINS_LEAST)
    // One cup between the two is no twin's cup.
    if (!other || other === cup || (poured && !atLeast(other.tea, TWINS_LEAST))) return { waits: 'twin-not-poured' }
    if (!poured) taste = 'short'
    else if (atLeast(TWINS_APART, Math.abs(cup.tea - other.tea))) taste = 'right'
    else if (cup.tea < other.tea) { taste = 'short'; details.push('twin-has-more') }
    else { taste = 'over'; details.push('twin-has-less') }
  } else {
    taste = ownTaste(guest, cup.tea)
  }

  const brimful = atLeast(cup.tea, 0.98 * holds(cup))
  const tooSmall = taste === 'short' && brimful
  if (tooSmall) details.push('cup-too-small')
  if (brimful) details.push('brimful')
  if (saucer.tea > 0.01) details.push('saucer-wet')
  if (world.things.some((thing) => thing.kind === 'spoon' && thing.on === cup.id)) details.push('spoon-in-cup')
  return { taste, drinks: taste === 'right' || tooSmall, details }
}

/** A guest drinks a cup dry. Returns what it drank; anything that is not a cup gives nothing. */
export function drink(world: World, cupId: string): number {
  const cup = thingById(world, cupId)
  if (!cup || cup.kind !== 'cup') return 0
  const drunk = cup.tea
  cup.tea = 0
  return drunk
}
