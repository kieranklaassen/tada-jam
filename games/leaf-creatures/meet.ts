import { ontoGround } from './clearing'
import { about, bowlOver, facing, leading, type Creature, type Want } from './creatures'
import { WAYS } from './gait'
import { KINDS, wrap, type Kind } from './parts'
import { keepIn } from './reach'
import { count, radius, wayOf } from './things'
import type { VoiceKey } from './voices'

// What a creature wants, and what happens when two meet. The rules never
// change, so what a child finds stays true: each kind of part carries one
// temper, a creature wears the tempers of all the kinds on it and the kind
// it travels by most of all, and what it wants is where it goes and where
// its eyes point. Nothing here draws.

export type World = {
  /** The finger on the ground, calling, or null. */
  finger: { x: number; y: number } | null
  /** A part is in the hand: creatures hold still to be dressed. */
  holdStill: boolean
  /** What the child's touch gives to look at, or null. */
  lookAt: { x: number; y: number } | null
  chance: () => number
  creatures: readonly Creature[]
  acorns: readonly { x: number; y: number; dug: boolean }[]
  /** Whether this creature would lie on nothing else if it stood at x, y. */
  free(x: number, y: number, who: Creature): boolean
  /** Where a shy one hides while a roller rolls: the edge of the ground by the fern. */
  hideAt: { x: number; y: number }
}

/** How far off a creature smells a buried acorn: further with every seed. */
export function smell(seeds: number): number {
  return 150 + 70 * Math.min(seeds, 6)
}
/** How far a roller throws what it rolls into: further with every round leaf. */
export function bowlFar(rounds: number): number {
  return 60 + 28 * Math.min(rounds, 6)
}
/** How near a roller must be before a skittish one runs. */
export const FLEE_AT = 230
/** How near another creature must come before a feathered one fans at it. */
export const FAN_AT = 170
/** How near a hopper must be to leap over a crawler. */
export const LEAP_AT = 190

const far = (a: Creature, b: { x: number; y: number }): number => Math.hypot(a.thing.x - b.x, a.thing.y - b.y)
const rolling = (c: Creature): boolean => about(c) && wayOf(c.thing) === 'round' && c.body.speed > 40

function nearest(self: Creature, world: World, fits: (other: Creature) => boolean): Creature | null {
  let best: Creature | null = null, bestFar = Infinity
  for (const other of world.creatures) {
    if (other === self || !about(other) || other.tumble || !fits(other)) continue
    const d = far(self, other.thing)
    if (d < bestFar) { best = other; bestFar = d }
  }
  return best
}

/** The kinds on a creature in the order their tempers count: the one it travels by, then the others by number. */
function tempers(creature: Creature): Kind[] {
  const { way } = leading(creature.thing)
  const kinds = KINDS.filter((kind) => kind !== 'cap' && count(creature.thing, kind) > 0)
  return kinds.sort((a, b) => (a === way ? -1 : b === way ? 1 : count(creature.thing, b) - count(creature.thing, a)))
}

/** What one kind on a creature wants now, or null when there is nothing for it to want. */
function wantOfKind(kind: Kind, creature: Creature, world: World): Want | null {
  const { thing } = creature, way = wayOf(thing)
  switch (kind) {
    case 'maple': {
      // A tease: a crawler to hop over. It never teases a sleeper, a hopper or a roller.
      if (way !== 'maple' || creature.again > 0) return null
      const whom = nearest(creature, world, (other) => { const w = wayOf(other.thing); return w !== 'maple' && w !== 'round' })
      return whom ? { what: 'tease', whom } : null
    }
    case 'round': {
      // Boisterous: it bowls at whoever is nearest.
      if (way !== 'round' || creature.again > 0) return null
      const whom = nearest(creature, world, () => true)
      return whom ? { what: 'bowl', whom } : null
    }
    case 'seed': {
      // Greedy-nosed: the buried acorns, and then the ones that are up, to push about.
      const reach = smell(count(thing, 'seed'))
      let best = -1, bestFar = reach
      world.acorns.forEach((acorn, i) => { const d = far(creature, acorn); if (!acorn.dug && d < bestFar) { best = i; bestFar = d } })
      if (best >= 0) return { what: 'dig', acorn: best, x: world.acorns[best].x, y: world.acorns[best].y }
      if (creature.again > 0) return null
      world.acorns.forEach((acorn, i) => { const d = far(creature, acorn); if (acorn.dug && d < bestFar) { best = i; bestFar = d } })
      return best >= 0 ? { what: 'push', acorn: best, x: world.acorns[best].x, y: world.acorns[best].y } : null
    }
    case 'feather': {
      // Vain: it goes to be looked at.
      if (way !== 'feather') return null
      const whom = nearest(creature, world, () => true)
      return whom ? { what: 'show', whom } : null
    }
    case 'twig': {
      // Skittish: it runs from a roller.
      if (way === 'round') return null
      const from = nearest(creature, world, (other) => rolling(other) && far(creature, other.thing) < FLEE_AT)
      return from ? { what: 'flee', from } : null
    }
    case 'willow': {
      // Shy: it hides by the fern while a roller rolls, and lies down beside a sleeper.
      if (way !== 'willow') return null
      if (world.creatures.some((other) => other !== creature && rolling(other))) return { what: 'hide' }
      let beside: Creature | null = null
      for (const other of world.creatures) if (other.thing.bedded && (!beside || far(creature, other.thing) < far(creature, beside.thing))) beside = other
      return beside ? { what: 'curl', beside } : null
    }
    case 'cap':
      return null
  }
}

/** What a creature wants now. A finger on the ground calls every one of them, and a drowsy one stays where it is. */
export function wantOf(creature: Creature, world: World): Want {
  if (world.finger) return { what: 'finger', x: world.finger.x, y: world.finger.y }
  if (creature.thing.drowsy || world.holdStill) return { what: 'still' }
  for (const kind of tempers(creature)) {
    const want = wantOfKind(kind, creature, world)
    if (want) return want
  }
  return { what: 'roam' }
}

/** How near two creatures are when one rolls into the other. */
export function hitAt(a: Creature, b: Creature): number {
  return Math.max(50, Math.min(120, 0.45 * (radius(a.thing) + radius(b.thing))))
}

/**
 * What happens where two creatures meet, after every one has made its step:
 * a hopper that has come near its crawler leaps over it, and the crawler
 * turns to look; a roller that reaches the one it rolled at bowls it over; a
 * feathered one fans at whoever has come near. Sounds are asked for in the
 * step of the meeting.
 */
export function meet(world: World, ask: (key: VoiceKey, pitch?: number, level?: number) => void): void {
  for (const creature of world.creatures) {
    if (!about(creature) || creature.tumble || creature.leap || creature.poke || creature.held >= 0) continue
    const { thing, body, want } = creature
    if (want.what === 'tease' && creature.again <= 0 && about(want.whom) && !want.whom.tumble) {
      const whom = want.whom, dx = whom.thing.x - thing.x, dy = whom.thing.y - thing.y, d = Math.hypot(dx, dy) || 1
      // Only from the ground, at the start of a hop.
      const grounded = body.lift === 0 && body.phase < WAYS.maple.crouch
      if (d < LEAP_AT && grounded) {
        const n = count(thing, 'maple')
        const past = ontoGround(whom.thing.x + (dx / d) * (radius(whom.thing) * 0.5 + 70), whom.thing.y + (dy / d) * (radius(whom.thing) * 0.5 + 70), 30)
        // It lands where all of it may stand.
        const to = keepIn(past.x, past.y, radius(thing))
        creature.leap = { fromX: thing.x, fromY: thing.y, toX: to.x, toY: to.y, t: 0, lasts: 0.75, high: Math.min(150, 90 + 10 * n), beats: 0 }
        creature.again = 7 + world.chance() * 4
        creature.target = null; creature.habit = null
        // The crawler spins to look where the hopper lands; a skittish one goes right round.
        whom.twirl = count(whom.thing, 'twig') > 0 ? Math.PI * 2 : wrap(Math.atan2(to.y - whom.thing.y, to.x - whom.thing.x) - facing(whom))
        whom.thing.drowsy = false
        ask('spin')
      }
    } else if (want.what === 'bowl' && creature.again <= 0 && about(want.whom) && !want.whom.tumble) {
      const whom = want.whom, dx = whom.thing.x - thing.x, dy = whom.thing.y - thing.y, d = Math.hypot(dx, dy) || 1
      if (d < hitAt(creature, whom) && body.speed > 50) {
        bowlOver(whom, dx / d, dy / d, bowlFar(count(thing, 'round')))
        creature.again = 6 + world.chance() * 4
        ask('bonk')
      }
    }
    // A feathered one that does not strut still fans at whoever comes near.
    if (count(thing, 'feather') > 0 && wayOf(thing) !== 'feather' && !creature.habit && creature.again <= 0 && creature.spill === 0) {
      const near = nearest(creature, world, (other) => far(creature, other.thing) < FAN_AT)
      if (near) {
        creature.habit = { kind: 'feather', t: 0, lasts: Math.min(1.6, 0.6 + 0.25 * count(thing, 'feather')), fired: 0 }
        creature.again = 5
      }
    }
  }
}
