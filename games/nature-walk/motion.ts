import { PIVOT, SPOTS } from './layout'
import type { FindId, PlaceId } from './wood'

// How things move, as plain numbers: the six covers, each in its own way, and
// the small act of each thing that is found. No drawing and no clock: the
// model says how far along a motion is, and the view maps these numbers onto
// its cut pieces. No two covers share a curve and no two finds share an act.

export const clamp01 = (u: number): number => Math.min(1, Math.max(0, u))
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
export const ease = (u: number): number => { const c = clamp01(u); return c * c * (3 - 2 * c) }
/** 0 at the ends of the stretch from `a` to `b`, 1 in its middle. */
export const bump = (u: number, a: number, b: number): number => Math.sin(clamp01((u - a) / (b - a)) * Math.PI)

/** From 0 to 1 with a spring: it overshoots, swings `bounces` times and has settled at 1 when `u` is 1. */
export function settle(u: number, bounces: number, damping: number): number {
  const c = clamp01(u)
  if (c >= 1) return 1
  const raw = 1 - Math.exp(-damping * c) * Math.cos(bounces * 2 * Math.PI * c)
  const end = 1 - Math.exp(-damping) * Math.cos(bounces * 2 * Math.PI)
  return raw + (1 - end) * c
}

export type CoverMotion = {
  /** Seconds the cover takes to open, and to shut. */
  open: number
  shut: number
  /** How far along it is, from 0 to 1 (and a little past it for a cover that springs), by the share of its time. */
  curve: (u: number, opening: boolean) => number
  /** Seconds it goes on settling after it has arrived: a squash, a bounce, ripples. */
  settles: number
}

export const COVERS: Readonly<Record<PlaceId, CoverMotion>> = {
  // Light and swishing: the blades whip past where they stop and wobble back.
  grass: { open: 0.55, shut: 0.45, settles: 0.2, curve: (u, opening) => (opening ? settle(u, 1.25, 4) : settle(u, 1.5, 5)) },
  // A stiff hinge: up in two steps, as its creak has two, and down in one fall.
  log: { open: 0.7, shut: 0.45, settles: 0.25, curve: (u, opening) => (opening ? 0.55 * ease(u * 2) + 0.45 * ease(u * 2 - 1) : clamp01(u) * clamp01(u)) },
  // Heavy: slow to start, no spring at all, and a landing that squashes it.
  stone: { open: 0.8, shut: 0.7, settles: 0.3, curve: (u) => ease(u) },
  // Afloat: it glides off fast and drifts to a stop.
  puddle: { open: 0.9, shut: 0.8, settles: 0.4, curve: (u) => 1 - (1 - clamp01(u)) ** 3 },
  // A light flap on a twig: up past its rest and three small flutters.
  branch: { open: 0.5, shut: 0.45, settles: 0.2, curve: (u, opening) => (opening ? settle(u, 2.5, 5.5) : settle(u, 1, 6)) },
  // A flap on one pin: it swings like a pendulum and rattles to rest.
  burrow: { open: 0.6, shut: 0.5, settles: 0.2, curve: (u, opening) => (opening ? settle(u, 1.75, 5) : settle(u, 2, 7)) },
}

/** Where a one-piece cover is drawn: its pivot or centre, its turn in radians, and its squash. */
export type CoverPose = { x: number; y: number; turn: number; sx: number; sy: number }

/**
 * The pose of a cover from how far open it is, a small idle `twitch` from 0 to 1, and the seconds since it
 * landed (a large number once that is over). The grass has two fans: `side` is -1 for the left and 1 for the right.
 */
export function coverPose(place: PlaceId, amount: number, twitch: number, landed: number, side: -1 | 1 = 1): CoverPose {
  const a = amount, pivot = PIVOT[place], away = SPOTS[place].away[0]
  switch (place) {
    case 'grass':
      return { x: pivot.x + side * (26 + 52 * a), y: pivot.y, turn: side * (a * 0.3 + twitch * 0.08), sx: 1, sy: 1 }
    case 'log': {
      // Hinged at its right end: the left end lifts.
      const bounce = a < 0.02 ? 0.05 * Math.exp(-10 * landed) * Math.sin(30 * landed) : 0
      return { x: pivot.x, y: pivot.y, turn: a * 0.4 + twitch * 0.07 + Math.abs(bounce), sx: -1, sy: 1 }
    }
    case 'stone': {
      const squash = 0.16 * Math.exp(-12 * landed) * Math.cos(30 * landed)
      return { x: lerp(pivot.x, away.x, a), y: lerp(pivot.y, away.y, a) - Math.sin(clamp01(a) * Math.PI) * 18 - twitch * 4, turn: a * 2.4 + twitch * 0.08, sx: STONE_SCALE * (1 + squash), sy: STONE_SCALE * (1 - squash) }
    }
    case 'puddle':
      return { x: lerp(pivot.x, away.x, a), y: lerp(pivot.y, away.y, a) + twitch * 3, turn: a * 0.5 + twitch * 0.1, sx: PAD_SCALE, sy: PAD_SCALE }
    case 'branch':
      return { x: pivot.x, y: pivot.y, turn: a * 1.65 + twitch * 0.09, sx: 1, sy: 1 }
    case 'burrow':
      return { x: pivot.x, y: pivot.y, turn: a * 1.8 + twitch * 0.09, sx: 1, sy: 1 }
  }
}

/** The stone and the leaf on the puddle are drawn at these shares of the size they were cut at. */
export const STONE_SCALE = 0.85
export const PAD_SCALE = 0.8

/** How a find is drawn while it does its act: moved, turned and squashed, with one more number for what is its own. */
export type FindPose = { dx: number; dy: number; turn: number; sx: number; sy: number; own: number }

export type Manner = {
  /** Seconds the act takes. */
  length: number
  /** The pose at a share `u` of the act, from 0 to 1. At both ends it is the find at rest. */
  pose: (u: number) => FindPose
}

const rest = (): FindPose => ({ dx: 0, dy: 0, turn: 0, sx: 1, sy: 1, own: 0 })
const TAU = Math.PI * 2

export const MANNERS: Readonly<Record<FindId, Manner>> = {
  // Ties itself in a knot and pulls straight. `own` is how tight the knot is.
  worm: { length: 0.7, pose: (u) => ({ ...rest(), turn: Math.sin(u * TAU) * 0.5, sx: 1 - 0.3 * bump(u, 0, 1), sy: 1 + 0.3 * bump(u, 0, 1), own: bump(u, 0, 1) }) },
  // Pulls in with a pop, and the horns come out one at a time. `own` is how far it is pulled in.
  snail: { length: 0.9, pose: (u) => ({ ...rest(), sx: 1 - 0.14 * bump(u, 0.05, 0.3), sy: 1 + 0.1 * bump(u, 0.05, 0.3), own: u < 0.3 ? ease((u - 0.08) / 0.1) : 1 - ease((u - 0.3) / 0.2) }) },
  // Lifts on the breath of the touch, loops and lands where it lay.
  feather: { length: 0.9, pose: (u) => ({ ...rest(), dx: Math.sin(u * TAU) * 26, dy: -bump(u, 0, 1) * 70, turn: Math.sin(u * TAU) * 0.9 }) },
  // Rocks, and its cap lifts like a hat and drops back. `own` is how high the cap is.
  acorn: { length: 0.7, pose: (u) => ({ ...rest(), turn: Math.sin(u * TAU * 2) * 0.3 * (1 - u), own: bump(u, 0.45, 0.9) }) },
  // Flips like a coin, spins on its rim and settles. `own` is the glint.
  button: { length: 0.9, pose: (u) => ({ ...rest(), dy: -bump(u, 0, 0.6) * 46, sx: u < 0.75 ? Math.cos(u * TAU * 2.67) : 1, own: bump(u, 0.7, 1) }) },
  // Wobbles like a weighted toy and its stalk leaf flaps. `own` is the leaf.
  apple: { length: 0.8, pose: (u) => ({ ...rest(), dx: Math.sin(u * TAU * 1.5) * 8 * (1 - u), turn: Math.sin(u * TAU * 1.5) * 0.38 * (1 - u), own: Math.sin(u * TAU * 3) * (1 - u) }) },
  // Opens its wing cases, whirrs up in a loop and lands. `own` is how far the cases are open.
  ladybird: { length: 0.9, pose: (u) => ({ ...rest(), dx: Math.sin(u * TAU) * 34, dy: -(1 - Math.cos(u * TAU)) * 34, own: bump(u, 0, 1) }) },
  // Bows and puffs a cloud of spores. `own` is how far the cloud has spread.
  mushroom: { length: 0.8, pose: (u) => ({ ...rest(), turn: -bump(u, 0, 0.6) * 0.35, sy: 1 - 0.1 * bump(u, 0, 0.6), own: clamp01((u - 0.25) / 0.75) }) },
  // Asleep on its back: its legs paddle, it turns right over and is asleep on its back again. `own` is the paddling.
  sleeper: { length: 1.2, pose: (u) => ({ ...rest(), sy: 1 + 0.08 * bump(u, 0, 0.35), turn: TAU * ease((u - 0.38) / 0.5), own: bump(u, 0.35, 0.9) }) },
  // Darts a figure of eight.
  tadpole: { length: 0.8, pose: (u) => ({ ...rest(), dx: Math.sin(u * TAU) * 40, dy: Math.sin(u * TAU * 2) * 16, turn: (Math.cos(u * TAU) - 1) * 0.4 }) },
  // Skates a zigzag in three strokes.
  skater: { length: 0.7, pose: (u) => { const leg = Math.min(2, Math.floor(u * 3)), within = ease(u * 3 - leg), stops = [0, -32, 30, 0]; return { ...rest(), dx: lerp(stops[leg], stops[leg + 1], within), dy: -bump(u * 3 - leg, 0, 1) * 5 } } },
  // Spins once round like a boat.
  leafboat: { length: 0.9, pose: (u) => ({ ...rest(), turn: TAU * ease(u), dy: Math.sin(u * TAU * 2) * 3 }) },
  // Squeaks away under the ice and slides back.
  bubble: { length: 0.8, pose: (u) => ({ ...rest(), dx: bump(u, 0, 1) * 46, dy: -bump(u, 0, 1) * 10, sx: 1 + 0.2 * Math.sin(u * TAU * 3) * (1 - u) }) },
  // Humps along the twig and back: taller and shorter with each hump.
  caterpillar: { length: 1, pose: (u) => ({ ...rest(), dx: bump(u, 0, 1) * 34, sy: 1 + 0.25 * Math.abs(Math.sin(u * TAU * 4)), sx: 1 - 0.12 * Math.abs(Math.sin(u * TAU * 4)) }) },
  // Scuttles out, round and back in.
  beetle: { length: 0.9, pose: (u) => ({ ...rest(), dx: Math.sin(u * TAU) * 38, dy: (1 - Math.cos(u * TAU)) * 14, turn: Math.sin(u * TAU) * 0.6 }) },
  // Flutters out, round once and back in. `own` is the beat of its wings.
  moth: { length: 0.9, pose: (u) => ({ ...rest(), dx: Math.sin(u * TAU) * 40, dy: -(1 - Math.cos(u * TAU)) * 30, own: Math.sin(u * TAU * 9) * bump(u, 0, 1) }) },
}

/** The woodlouse that moves in where a thing was carried off: it rolls into a ball, rolls round the hollow and unrolls. `own` is how far it is a ball. */
export const LOUSE: Manner = { length: 0.9, pose: (u) => ({ ...rest(), dx: Math.sin(u * TAU) * 26, dy: (Math.cos(u * TAU) - 1) * 7, turn: ease((u - 0.1) / 0.7) * TAU * 2, own: bump(u, 0.02, 0.98) > 0.2 ? 1 : 0 }) }

/** A find coming up to be seen as its cover clears: it rises, a little past its size, and settles. `u` from 0 to 1. */
export function helloPose(u: number): FindPose {
  const s = 0.6 + 0.4 * settle(u, 1.5, 4)
  return { dx: 0, dy: (1 - ease(u)) * 12, turn: 0, sx: s, sy: s, own: 0 }
}

/** Seconds a find takes to come up. */
export const HELLO = 0.4
