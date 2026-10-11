import type { Point } from './input'
import { TAU, clamp01, ease, span } from './motion'
import { CREATURES, HOOK_REST, HULL, TUB, TUB_SLOTS, WATERLINE } from './sea'
import type { Cue } from './voices'

// The two scenes and the short flights on deck, each as one timeline (ART.md,
// "The scenes"). The rules (game.ts) play a scene's sounds by its table of
// beats, and the frame (frame.ts) draws the scene from the same seconds
// through the functions here, so that nothing in a scene is heard at a moment
// other than the one it is drawn at. Numbers only.

/** One sound of a scene, `at` seconds after it began. */
export type SceneBeat = { at: number; cue: Cue }

// --- The tow ------------------------------------------------------------------

export const TOW_LASTS = 7
/** The moments of the tow, in seconds. */
export const TOW = { tight: 0.5, lurch: 1.2, loopEnds: 5, slops: [2.4, 3.3, 4.2], notices: 5.2, spits: 5.6, shakes: 6.3 } as const
export const TOW_BEATS: readonly SceneBeat[] = [
  { at: 0, cue: { name: 'towGulp' } },
  { at: TOW.tight, cue: { name: 'towCreak' } },
  { at: TOW.lurch, cue: { name: 'towLurch' } },
  ...TOW.slops.map((at, index) => ({ at, cue: { name: 'towSlop' as const, index } })),
  { at: TOW.spits, cue: { name: 'towSpit' } },
  { at: TOW.shakes, cue: { name: 'towShake' } },
]

/** Where the shark was when it bit, and which way it faced. The tow is filled in from this. */
export type Bite = { x: number; y: number; face: 1 | -1 }

/** How far along its stretch the shark swings, and how far the boat is drawn after it. */
const LOOP_REACH = 150, BOAT_FOLLOWS = 40

export type TowMoment = {
  /** The shark's middle. */
  x: number
  y: number
  face: 1 | -1
  open: number
  /** It has noticed the line and looks along it to the boat. */
  looks: boolean
  /** The hook is in the shark. */
  held: boolean
  /** How tight the line is, from 0 to 1. */
  tight: number
  /** The boat: how far it leans its rod toward the water, and how far it has been drawn along. */
  heel: number
  shift: number
  /** How hard the tub slops, from 0 to 1. */
  slop: number
}

/** The tow, `t` seconds in. */
export function towAt(t: number, bite: Bite): TowMoment {
  const middle = CREATURES.shark.home.x
  // It carries on round its own stretch in a wide loop, the way it was going, and is back where it bit.
  const start = Math.acos(Math.max(-1, Math.min(1, (bite.x - middle) / LOOP_REACH)))
  const turn = TAU * ease(span(t, TOW.lurch, TOW.loopEnds)), angle = start - bite.face * turn
  const going = bite.face * Math.sin(angle)
  const x = bite.x + LOOP_REACH * (Math.cos(angle) - Math.cos(start))
  const held = t < TOW.spits
  const tight = ease(span(t, 0.35, 0.9)) * (held ? 1 : 0)
  const pulled = ease(span(t, TOW.lurch, TOW.lurch + 0.5)) * (1 - ease(span(t, TOW.spits + 0.1, TOW_LASTS - 0.2)))
  let slop = 0
  for (const at of TOW.slops) slop = Math.max(slop, Math.sin(Math.PI * span(t, at, at + 0.6)))
  return {
    x,
    y: bite.y + 22 * (1 - Math.cos(turn)),
    face: t <= TOW.lurch || t >= TOW.loopEnds ? bite.face : going >= 0 ? 1 : -1,
    open: t < 0.15 ? 1 : t >= TOW.spits && t < TOW.spits + 0.35 ? 1 : 0.06,
    looks: t >= TOW.notices,
    held,
    tight,
    heel: 0.05 * tight + 0.035 * Math.sin((t - TOW.lurch) * 5.2) * span(t, TOW.lurch, TOW.lurch + 0.2) * (1 - span(t, TOW.loopEnds - 0.4, TOW.loopEnds)) + 0.03 * Math.sin((t - TOW.spits) * 9) * span(t, TOW.spits, TOW.spits + 0.1) * (1 - span(t, TOW.spits, TOW.spits + 1)),
    shift: BOAT_FOLLOWS * pulled * Math.max(-1, Math.min(1, (x - HOOK_REST.x) / 260)),
    slop,
  }
}

// --- The tip-out ----------------------------------------------------------------

/** Long enough for the cat's curl, which begins at `TIP.curls + 0.4` and takes a second, to be over inside the scene. */
export const TIP_LASTS = 8.3
/** The moments of the tip-out, in seconds. `slides[n]` is when the n-th catch leaves the tub; it meets the water `SLIDE` later. */
export const TIP = { tipped: 0.9, slides: [1, 1.6, 2.2, 2.8], wave: 3.6, rights: 4.3, rocks: 4.5, winds: 5.4, wound: 6.4, lit: 6.6, curls: 6.8 } as const
export const SLIDE = 0.5
export const TIP_BEATS: readonly SceneBeat[] = [
  { at: 0, cue: { name: 'tipCreak' } },
  ...TIP.slides.map((at, index) => ({ at: at + SLIDE, cue: { name: 'tipSplash' as const, index } })),
  { at: TIP.wave, cue: { name: 'tipWave' } },
  { at: TIP.rocks, cue: { name: 'tipRock' } },
  { at: TIP.rocks + 0.75, cue: { name: 'tipRock' } },
  { at: TIP.lit, cue: { name: 'lantern' } },
  { at: TIP.curls + 0.4, cue: { name: 'sleepy' } },
]

export type TipMoment = {
  /** How far the tub has tipped over the rail, from 0 to 1. */
  tipped: number
  /** How hard the boat rocks, as an angle. */
  heel: number
  /** How far the line has wound in, from 0 to 1. */
  wound: number
  lit: boolean
}

export function tipAt(t: number): TipMoment {
  return {
    tipped: ease(span(t, 0, TIP.tipped)) * (1 - ease(span(t, TIP.wave, TIP.rights))),
    heel: 0.02 * Math.sin(Math.PI * span(t, 0, TIP.tipped)) + 0.085 * Math.sin((TAU * (t - TIP.rocks)) / 1.5) * span(t, TIP.rocks, TIP.rocks + 0.05) * (1 - span(t, TIP.rocks, TIP.wound)),
    wound: ease(span(t, TIP.winds, TIP.wound)),
    lit: t >= TIP.lit,
  }
}

/** Where catch `index` of a tipped tub is, `t` seconds into the tip-out: in its slot, sliding out over the rail, or gone into the water (null). */
export function slideAt(t: number, index: number): (Point & { rot: number; a: number }) | null {
  const slot = TUB_SLOTS[index], from = TIP.slides[index], u = (t - from) / SLIDE
  if (u >= 1) return null
  if (u <= 0) return { x: slot.x, y: slot.y, rot: -0.2 * tipAt(t).tipped, a: 1 }
  const into = splashOf(index)
  return { x: slot.x + (into.x - slot.x) * u, y: slot.y + (into.y - slot.y) * u * u - 26 * Math.sin(Math.PI * u), rot: -0.2 - 1.2 * u, a: 1 - span(u, 0.8, 1) }
}
/** Where a catch tipped out of slot `index` meets the water: over the near rail, in front of the hull. */
export function splashOf(index: number): Point {
  return { x: TUB_SLOTS[index].x - 14, y: WATERLINE + 12 }
}
/** The top of the pile in a full tub, which a fifth catch bounces off, and where that one meets the water. */
export const PILE = { x: TUB.x, y: 56 } as const
export const OFF_THE_PILE = { x: TUB.x + 6, y: WATERLINE + 12 } as const
/** Where it is next seen: under the keel, on its way home. */
export function underKeel(x: number, halfHeight: number): Point {
  return { x, y: HULL.bottom + halfHeight + 10 }
}

// --- Flights on deck --------------------------------------------------------------

/**
 * A catch in the air: swung in from the hook (`land`), tossed in by the net (`scoop`), or tipped back over the
 * rail by a tap (`tipBack`). One that finds the tub full bounces off the pile and falls back into the sea.
 */
export type FlightKind = 'land' | 'scoop' | 'tipBack'
export const FLIGHT_SECONDS: Record<FlightKind, number> = { land: 0.7, scoop: 0.9, tipBack: 0.8 }
/** How long the net dips under whoever it scoops before it tosses. */
export const NET_DIPS = 0.3
/** A bounce off a full tub takes this much longer, from the pile to the water. */
export const BOUNCE_SECONDS = 0.6
/** How high a catch is lobbed from the hook into the tub: over the cat, which ducks under it. */
export const LOB = 112
const arc = (from: Point, to: Point, u: number, height: number): Point => ({ x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u - height * Math.sin(Math.PI * u) })

/**
 * Where a flying catch is, `t` seconds into its flight, how it is turned and how much of it shows. `to` is its
 * slot, or the top of the pile it bounces off; `into` is where it meets the water if it leaves the boat, over the
 * near rail, where it goes under.
 */
export function flightAt(kind: FlightKind, fits: boolean, t: number, from: Point, to: Point, into: Point): Point & { rot: number; a: number } {
  const lasts = FLIGHT_SECONDS[kind]
  if (kind === 'tipBack') {
    const u = clamp01(t / lasts)
    return { ...arc(from, into, u, 46), rot: -1.6 * u, a: 1 - span(u, 0.8, 1) }
  }
  const wait = kind === 'scoop' ? NET_DIPS : 0
  if (t < wait) return { x: from.x, y: from.y - 8 * Math.sin((Math.PI * t) / wait), rot: 0, a: 1 }
  if (t <= lasts) {
    const u = clamp01((t - wait) / (lasts - wait))
    return { ...arc(from, to, u, kind === 'scoop' ? 96 : LOB), rot: (kind === 'scoop' ? -TAU : 0) * u, a: 1 }
  }
  if (fits) return { x: to.x, y: to.y, rot: 0, a: 1 }
  const u = clamp01((t - lasts) / BOUNCE_SECONDS)
  return { ...arc(to, into, u, 64), rot: -TAU * u, a: 1 - span(u, 0.8, 1) }
}
