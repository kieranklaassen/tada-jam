import { clampToPanel, type CreatureKind, type Point } from './layout'
import { response, type Mask } from './optics'

// A creature's day, measured in attended seconds only. It sleeps on its bed
// until light of exactly its colour reaches the bed; a mix that holds its
// colour makes it stir in its sleep. Awake, it plays around the bed for as
// long as its light stays, and a good while after. Then it yawns, wanders a
// little way to a spot its light does not reach, and naps there, so the
// garden sets itself a fresh puzzle without levels or counting.

export type Phase = 'asleep' | 'waking' | 'awake' | 'drowsy' | 'wandering'
export type CreatureEvent = 'stir' | 'wake' | 'awake' | 'drowsy' | 'perk' | 'wander' | 'nap'

export const WAKE_AFTER = 0.3
export const STIR_EVERY = 2.6
export const LINGER = 30
export const DROWSY_SECONDS = 3.2

/** How long each creature takes to wake: its anticipation is part of who it is. */
export const WAKING_SECONDS: Readonly<Record<CreatureKind, number>> = { moth: 1.5, fish: 0.9, snail: 2.6, jelly: 1.8 }
/** Wandering speed in cm/s. The snail takes its time. */
export const WANDER_SPEED: Readonly<Record<CreatureKind, number>> = { moth: 11, fish: 13, snail: 2.4, jelly: 4.5 }

export type Creature = {
  readonly index: number
  readonly kind: CreatureKind
  readonly wants: Mask
  readonly radius: number
  /** Where it sleeps and plays around. Moves with it while it wanders. */
  bed: Point
  phase: Phase
  /** Seconds spent in the current phase. */
  phaseT: number
  /** Continuous seconds its exact colour has reached the bed while asleep. */
  litFor: number
  /** Seconds since its colour last reached the bed while awake. */
  darkFor: number
  /** World time of the last stir, or -Infinity. */
  stirAt: number
  /** World time it last woke, or -Infinity. */
  wokeAt: number
  /** Light reaching the bed this step. */
  light: Mask
  from: Point
  to: Point
  /** World time of its last playful nudge. */
  nudgeAt: number
  /** World time a child last poked it, or -Infinity, and which of its poke answers that was. */
  pokeAt: number
  pokeVariant: number
}

export function makeCreature(index: number, kind: CreatureKind, wants: Mask, radius: number, bed: Point): Creature {
  return {
    index,
    kind,
    wants,
    radius,
    bed: { ...bed },
    phase: 'asleep',
    phaseT: 0,
    litFor: 0,
    darkFor: 0,
    stirAt: -Infinity,
    wokeAt: -Infinity,
    light: 0,
    from: { ...bed },
    to: { ...bed },
    nudgeAt: -Infinity,
    pokeAt: -Infinity,
    pokeVariant: 0,
  }
}

export function isAwake(creature: Creature): boolean {
  return creature.phase !== 'asleep'
}

function enter(creature: Creature, phase: Phase): void {
  creature.phase = phase
  creature.phaseT = 0
}

/**
 * Advance one creature. `light` is what reaches its bed now; `chooseBed`
 * picks the spot it wanders to when it gets drowsy.
 */
export function stepCreature(creature: Creature, light: Mask, dt: number, now: number, chooseBed: (creature: Creature) => Point): CreatureEvent | null {
  creature.light = light
  creature.phaseT += dt
  const answer = response(light, creature.wants)
  switch (creature.phase) {
    case 'asleep':
      if (answer === 'wake') {
        creature.litFor += dt
        if (creature.litFor >= WAKE_AFTER) {
          enter(creature, 'waking')
          creature.wokeAt = now
          creature.darkFor = 0
          return 'wake'
        }
        return null
      }
      creature.litFor = 0
      if (answer === 'stir' && now - creature.stirAt >= STIR_EVERY) {
        creature.stirAt = now
        return 'stir'
      }
      return null
    case 'waking':
      if (creature.phaseT >= WAKING_SECONDS[creature.kind]) {
        enter(creature, 'awake')
        return 'awake'
      }
      return null
    case 'awake':
      creature.darkFor = answer === 'wake' ? 0 : creature.darkFor + dt
      if (creature.darkFor >= LINGER) {
        enter(creature, 'drowsy')
        return 'drowsy'
      }
      return null
    case 'drowsy':
      if (answer === 'wake') {
        enter(creature, 'awake')
        creature.darkFor = 0
        return 'perk'
      }
      if (creature.phaseT >= DROWSY_SECONDS) {
        creature.from = { ...creature.bed }
        creature.to = chooseBed(creature)
        enter(creature, 'wandering')
        return 'wander'
      }
      return null
    case 'wandering': {
      if (answer === 'wake') {
        enter(creature, 'awake')
        creature.darkFor = 0
        return 'perk'
      }
      const span = Math.hypot(creature.to.x - creature.from.x, creature.to.y - creature.from.y)
      const progress = span < 0.01 ? 1 : Math.min(1, (creature.phaseT * WANDER_SPEED[creature.kind]) / span)
      creature.bed.x = creature.from.x + (creature.to.x - creature.from.x) * progress
      creature.bed.y = creature.from.y + (creature.to.y - creature.from.y) * progress
      if (progress >= 1) {
        creature.litFor = 0
        enter(creature, 'asleep')
        return 'nap'
      }
      return null
    }
    default: {
      const never: never = creature.phase
      return never
    }
  }
}

/** A child carried the creature somewhere new: that is its bed now, whatever it was doing. */
export function moveBed(creature: Creature, to: Point): void {
  creature.bed = { ...to }
  creature.litFor = 0
  if (creature.phase === 'wandering') enter(creature, 'awake')
}

/** Small deterministic generator so a bed choice can be tested. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
}

/**
 * A new place to nap: a short wander away, on the panel, clear of
 * everything, and somewhere its own colour of light does not reach.
 * `crowded` says how close the nearest thing is; `lit` says what light is there.
 */
export function pickBed(creature: Creature, random: () => number, crowded: (at: Point) => number, lit: (at: Point) => Mask): Point {
  let best: Point = creature.bed
  let bestScore = -Infinity
  for (let i = 0; i < 28; i++) {
    const angle = random() * Math.PI * 2
    const reach = 14 + random() * 18
    const at = clampToPanel({ x: creature.bed.x + Math.cos(angle) * reach, y: creature.bed.y + Math.sin(angle) * reach }, creature.radius + 4)
    const room = crowded(at)
    const dark = (lit(at) & creature.wants) === 0
    const score = Math.min(room, 20) + (dark ? 40 : 0) + (room >= creature.radius * 2 + 4 ? 10 : 0)
    if (score > bestScore) {
      bestScore = score
      best = at
    }
  }
  return best
}
