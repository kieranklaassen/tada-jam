import type { Kind } from './voices'

// The six kinds, each with its own way of moving: the tables behind motion.ts,
// kept here so that file stays short. Every curve is a function from a number
// to numbers and nothing else. Before any curve, three things were settled
// for each kind (the jam's rule: every character moves like itself):
//
//   kind   tempo   weight   funniest part
//   pip    quick   light    the whole round body: it spins and rolls
//   tok    sharp   light    the beak: it jabs, and the body jerks after it
//   hoom   slow    heavy    the belly: it swells and wobbles
//   brrl   wavy    heavy    the neck: it stretches, shivers and loops
//   wheep  bouncy  middle   the spring legs: it overshoots, again and again
//   dooo   lazy    middle   the long ears: slow to droop, quick to snap back

/** What a body does at one instant, on top of standing still. Offsets are in body heights, so they fit any size. */
export type Move = {
  /** Sideways, in body heights: positive is right. */
  dx: number
  /** Off the ground, in body heights: negative is up. */
  dy: number
  /** Stretch across: 1 at rest. */
  sx: number
  /** Stretch upwards about the feet: 1 at rest. */
  sy: number
  /** Tipped about the feet, in radians. */
  lean: number
  /** 0 with the wings at rest, 1 with them held out. */
  wings: number
  /** -1 to 1: both wings to one side. */
  reach: number
  /** -1 to 1: the face turned. */
  turn: number
  /** 0 with the eyes open, 1 shut. */
  blink: number
  /** 1 facing front. A spin runs it through -1 and back: the cosine of the turn about its own axis. */
  face: number
}
export const REST: Move = { dx: 0, dy: 0, sx: 1, sy: 1, lean: 0, wings: 0, reach: 0, turn: 0, blink: 0, face: 1 }

export type Curve = (t: number) => Partial<Move>

export const TAU = Math.PI * 2
/** Held between 0 and 1. Anything that is not a number counts as 0, so no curve ever hands on a NaN. */
export const unit = (t: number) => (t > 0 ? (t < 1 ? t : 1) : 0)
/** The part of a number after the point, for a movement that goes round and round. */
export const frac = (x: number) => (Number.isFinite(x) ? x - Math.floor(x) : 0)
/** 0 until `from`, 1 after `to`, and eased at both ends in between. */
export const ramp = (t: number, from: number, to: number) => { const u = unit((t - from) / (to - from)); return u * u * (3 - 2 * u) }
/** Up and down again between `from` and `to`. `peak` says where the top is: early for a quick start and a slow end, late for the other way round. */
export const hump = (t: number, from: number, to: number, peak = 0.5) => {
  const u = unit((t - from) / (to - from)), v = u < peak ? (0.5 * u) / peak : 0.5 + (0.5 * (u - peak)) / (1 - peak)
  // Flat is exactly flat, so a move that is over leaves nothing behind.
  return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * v) ** 2
}
/** A wobble that starts at `from` and has died away at 1: the settle at the end of a move. */
export const ring = (t: number, from: number, turns: number, fade = 2) => { const u = unit((t - from) / (1 - from)); return Math.sin(TAU * turns * u) * (1 - u) ** fade }
/** `count` bounces between `from` and `to`, each `keep` times as high as the one before. */
export const hops = (t: number, from: number, to: number, count: number, keep: number) => {
  const u = unit((t - from) / (to - from)) * count, i = Math.min(count - 1, Math.floor(u))
  return Math.abs(Math.sin(Math.PI * (u - i))) * keep ** i
}
/** Held for a while: eased in between `a` and `b`, and out again between `c` and `d`. */
const held = (t: number, a: number, b: number, c: number, d: number) => ramp(t, a, b) * (1 - ramp(t, c, d))

/** How heavy each kind is, 0 to 1. A heavier one takes longer over everything and squashes less. */
export const WEIGHT: Readonly<Record<Kind, number>> = { pip: 0.1, tok: 0.2, wheep: 0.4, dooo: 0.55, brrl: 0.8, hoom: 1 }

/** Seconds for one round of each kind's idle. No two are within a tenth of each other, so no two ever fall into step. */
export const IDLE_SECONDS: Readonly<Record<Kind, number>> = { pip: 0.9, tok: 1.3, wheep: 1.7, dooo: 2.2, brrl: 2.8, hoom: 3.6 }

/** Seconds from one blink to the next, and how long the eyes stay shut. The heavy ones blink seldom and slowly. */
export const BLINKS: Readonly<Record<Kind, readonly [number, number]>> = { pip: [2.3, 0.1], tok: [1.9, 0.07], wheep: [3.1, 0.12], dooo: [3.7, 0.4], brrl: [4.1, 0.18], hoom: [5.3, 0.3] }

/** One round of each kind's idle, `u` from 0 to 1 and round again. Small: nobody leaves its spot. */
export const IDLES: Readonly<Record<Kind, Curve>> = {
  // A ball that cannot keep still: it rocks from side to side, and leaves the ground a hair at each end.
  pip: (u) => { const s = Math.sin(TAU * u); return { lean: 0.07 * s, dx: 0.028 * s, dy: -0.03 * s * s } },
  // The beak ticks from one side to the other and stays there, and once a round it nods at the ground.
  tok: (u) => { const s = Math.sin(TAU * u), nod = hump(u, 0.6, 0.78, 0.3); return { turn: (0.6 * s) / (Math.abs(s) + 0.2), lean: 0.08 * nod, sy: 1 - 0.02 * nod } },
  // The belly breathes out sideways, and the whole dome sways a little after it.
  hoom: (u) => { const s = Math.sin(TAU * u); return { sx: 1 + 0.04 * s, sy: 1 - 0.02 * s, lean: 0.025 * Math.sin(TAU * u - 1) } },
  // The neck sways and the head follows, late.
  brrl: (u) => ({ turn: 0.5 * Math.sin(TAU * u), sy: 1 + 0.03 * Math.sin(TAU * u - 0.9), dx: 0.012 * Math.sin(TAU * u) }),
  // The springs never quite come to rest: a bob with a second, smaller bob inside it.
  wheep: (u) => { const s = Math.sin(TAU * u) + 0.35 * Math.sin(2 * TAU * u); return { sy: 1 + 0.035 * s, sx: 1 - 0.02 * s, dy: -0.02 * Math.max(0, s) } },
  // Sinks for most of a round, ears and all, then picks itself up in a moment.
  dooo: (u) => { const d = u < 0.8 ? ramp(u, 0, 0.8) : 1 - ramp(u, 0.8, 1); return { sy: 1 - 0.05 * d, sx: 1 + 0.03 * d, lean: -0.03 * d, turn: -0.3 * d } },
}

/** How long each kind's way out of the egg takes. The light ones are out first. */
export const ENTRANCE_SECONDS: Readonly<Record<Kind, number>> = { pip: 0.5, tok: 0.62, wheep: 0.74, dooo: 0.86, brrl: 1.05, hoom: 1.2 }

/** The way out of the egg: squashed down in the shell at 0, standing at 1. The names are in grid.ts. */
export const ENTRANCES: Readonly<Record<Kind, Curve>> = {
  // Like a cork: straight up, high and at once, one tumble in the air, and a little bounce on landing.
  pip: (t) => {
    const stretch = hump(t, 0.05, 0.4), land = hump(t, 0.62, 0.8, 0.3)
    return { sy: 0.15 + 0.85 * ramp(t, 0, 0.12) + 0.3 * stretch - 0.22 * land + 0.06 * ring(t, 0.8, 1.5), sx: 1 - 0.18 * stretch + 0.2 * land, dy: -1.2 * hump(t, 0.08, 0.66, 0.45) - 0.14 * hump(t, 0.74, 0.94), face: Math.cos(TAU * ramp(t, 0.15, 0.62)) }
  },
  // Two pecks: half up, a stop while it rears back, then all the way up with a hop.
  tok: (t) => {
    const one = ramp(t, 0.12, 0.19), two = ramp(t, 0.5, 0.57)
    return { sy: 0.15 + 0.4 * one + 0.45 * two, dx: -0.12 + 0.05 * one + 0.07 * two, dy: -0.18 * hump(t, 0.5, 0.78, 0.3), lean: 0.4 * hump(t, 0.1, 0.3, 0.25) - 0.1 * hump(t, 0.34, 0.5) + 0.5 * hump(t, 0.48, 0.7, 0.25) - 0.06 * ring(t, 0.75, 1.5) }
  },
  // Rolls up out of the burst shell: slowly, over on one side and back by way of the other, wide all the while.
  hoom: (t) => {
    const over = hump(t, 0, 0.6), back = hump(t, 0.5, 0.92)
    return { sy: 0.2 + 0.8 * ramp(t, 0.1, 0.7), sx: 1 + 0.35 * hump(t, 0.05, 0.75) + 0.08 * ring(t, 0.7, 2.5), lean: -0.55 * over + 0.3 * back, dx: -0.2 * over + 0.12 * back }
  },
  // Long and thin first: up tall and narrow, shivering, the head looking about, and only then as wide as it is.
  brrl: (t) => {
    const tall = hump(t, 0.1, 0.85, 0.4)
    return { sy: 0.15 + 0.85 * ramp(t, 0, 0.4) + 0.55 * tall, sx: 1 - 0.4 * hump(t, 0.05, 0.8, 0.4), dx: 0.05 * Math.sin(TAU * 11 * t) * hump(t, 0.05, 0.9), turn: 0.7 * Math.sin(TAU * 1.5 * t) * hump(t, 0.3, 1) }
  },
  // Springs out upwards and cannot stop: three bounces, each lower, long in the air and flat on the ground.
  wheep: (t) => {
    const air = hops(t, 0.06, 0.92, 3, 0.45), flat = 0.25 * hump(t, 0.3, 0.4) + 0.15 * hump(t, 0.58, 0.68) + 0.1 * hump(t, 0.87, 1)
    return { sy: 0.15 + 0.85 * ramp(t, 0, 0.08) + 0.4 * air - flat, sx: 1 - 0.2 * air + 0.8 * flat, dy: -1.15 * air }
  },
  // Slides out sideways, lying down, gets up late and all at once, and flops.
  dooo: (t) => {
    const flop = hump(t, 0.66, 0.98, 0.3)
    return { dx: -0.5 * (1 - ramp(t, 0, 0.45)), sy: 0.18 + 0.3 * ramp(t, 0, 0.4) + 0.52 * ramp(t, 0.45, 0.62) + 0.14 * hump(t, 0.5, 0.72) - 0.25 * flop, sx: 1 + 0.2 * flop, lean: -0.7 * held(t, 0, 0.1, 0.35, 0.62) + 0.15 * flop, turn: -0.6 * hump(t, 0.6, 1) }
  },
}

export type Trick = { name: string; seconds: number; curve: Curve }

/** Each kind's own tricks. The first is the one grid.ts names; all start with a small move the other way and end with a settle. */
export const TRICK_SET: Readonly<Record<Kind, readonly Trick[]>> = {
  pip: [
    // Winds up the other way and ducks, then twice round on the spot, a little off the ground.
    { name: 'spins-on-the-spot', seconds: 0.7, curve: (t) => ({ sy: 1 - 0.14 * hump(t, 0, 0.16) + 0.2 * hump(t, 0.14, 0.8) + 0.05 * ring(t, 0.8, 1.5), dy: -0.22 * hump(t, 0.14, 0.8), face: Math.cos(TAU * 2 * ramp(t, 0.14, 0.8)), turn: -0.6 * hump(t, 0, 0.16), wings: hump(t, 0.14, 0.85) }) },
    { name: 'three-tiny-bounces', seconds: 0.8, curve: (t) => { const air = hops(t, 0.14, 0.92, 3, 0.6), duck = hump(t, 0, 0.18, 0.6); return { dy: -0.5 * air, sy: 1 - 0.14 * duck + 0.24 * air, sx: 1 + 0.12 * duck - 0.1 * air, blink: hump(t, 0.86, 1) } } },
    // A ball rolls: as far as it tips, so far it goes.
    { name: 'rolls-side-to-side', seconds: 1, curve: (t) => { const roll = -0.2 * hump(t, 0, 0.16) + 0.75 * hump(t, 0.12, 0.5) - 0.6 * hump(t, 0.44, 0.8) + 0.2 * ring(t, 0.78, 1.5); return { lean: roll, dx: 0.45 * roll } } },
  ],
  tok: [
    // Rears back, then two jabs at the ground, eyes shut at each blow.
    { name: 'pecks-the-ground-twice', seconds: 0.6, curve: (t) => { const jab = hump(t, 0.14, 0.44, 0.3) + hump(t, 0.5, 0.8, 0.3); return { lean: -0.16 * hump(t, 0, 0.16) + 0.75 * jab - 0.05 * ring(t, 0.82, 1.5), sy: 1 - 0.12 * jab, dx: 0.06 * jab, blink: unit(jab) } } },
    // Four jumps, each one a jerk: right, left, right and home, each shorter than the last.
    { name: 'hops-in-a-zigzag', seconds: 0.8, curve: (t) => {
      const zig = 0.34 * ramp(t, 0.12, 0.2) - 0.6 * ramp(t, 0.36, 0.44) + 0.46 * ramp(t, 0.6, 0.68) - 0.2 * ramp(t, 0.84, 0.92)
      return { dx: -0.07 * hump(t, 0, 0.14) + zig, dy: -0.16 * (hump(t, 0.12, 0.2) + hump(t, 0.36, 0.44) + hump(t, 0.6, 0.68) + hump(t, 0.84, 0.92)), turn: 3 * zig }
    } },
    { name: 'snaps-its-beak-left-and-right', seconds: 0.7, curve: (t) => { const snap = ramp(t, 0.12, 0.17) - 1.8 * ramp(t, 0.4, 0.45) + 0.8 * ramp(t, 0.7, 0.75); return { turn: -0.3 * hump(t, 0, 0.14) + snap, lean: 0.12 * snap, sy: 1 + 0.1 * hump(t, 0.1, 0.8) } } },
  ],
  hoom: [
    // Draws itself in, then swells, more upwards than sideways so that it stays clear of whoever stands beside it,
    // and the belly goes on wobbling while it is full.
    { name: 'swells-up-belly-wobbling', seconds: 1.3, curve: (t) => { const full = hump(t, 0.15, 0.9, 0.35), drawn = hump(t, 0, 0.2); return { sx: 1 - 0.1 * drawn + 0.2 * full + 0.05 * Math.sin(TAU * 5 * t) * hump(t, 0.3, 0.95), sy: 1 - 0.05 * drawn + 0.3 * full, wings: 0.35 * hump(t, 0.2, 0.9) } } },
    { name: 'rocks-like-a-boat', seconds: 1.4, curve: (t) => { const rock = -0.1 * hump(t, 0, 0.18) + 0.34 * hump(t, 0.14, 0.5) - 0.3 * hump(t, 0.42, 0.8) + 0.12 * hump(t, 0.74, 1); return { lean: rock, dx: 0.3 * rock } } },
    // Up a little, then down on its bottom: wide, eyes shut at the bump, the belly shaking after it.
    { name: 'sits-down-with-a-bump', seconds: 1.1, curve: (t) => { const sat = hump(t, 0.16, 0.95, 0.25), up = hump(t, 0, 0.2); return { sy: 1 + 0.07 * up - 0.32 * sat, sx: 1 - 0.04 * up + 0.2 * sat + 0.05 * Math.sin(TAU * 4 * t) * hump(t, 0.35, 0.9), blink: hump(t, 0.28, 0.6) } } },
  ],
  brrl: [
    // The ripple starts low, in the body, and reaches the head last.
    { name: 'shiver-runs-up-from-body-to-head', seconds: 1.1, curve: (t) => { const tall = hump(t, 0.12, 0.92, 0.6), duck = hump(t, 0, 0.16); return { sy: 1 - 0.1 * duck + 0.38 * tall, sx: 1 + 0.06 * duck - 0.2 * tall, dx: 0.09 * Math.sin(TAU * 5 * t) * hump(t, 0.12, 0.7), turn: 0.9 * Math.sin(TAU * 5 * t - 1.6) * hump(t, 0.4, 0.98) } } },
    // The head goes once round on the end of the neck: it dips first, then over the top.
    { name: 'head-circles-on-its-neck', seconds: 1.2, curve: (t) => { const round = TAU * unit((t - 0.04) / 0.92), far = held(t, 0.04, 0.22, 0.78, 0.96); return { turn: Math.sin(round) * far, sy: 1 - 0.22 * Math.cos(round) * far, lean: 0.15 * Math.sin(round) * far, dx: 0.08 * Math.sin(round) * far } } },
    { name: 'bows-low-and-sweeps', seconds: 1, curve: (t) => { const bow = hump(t, 0.14, 0.9), sweep = hump(t, 0.5, 0.85) - hump(t, 0.2, 0.55); return { sy: 1 + 0.1 * hump(t, 0, 0.18) - 0.4 * bow, lean: 0.5 * bow, dx: 0.28 * sweep, turn: sweep } } },
  ],
  wheep: [
    // Down on its springs, then up with the glide, tipped the way the voice goes, and two bounces to stop.
    { name: 'crouches-and-springs-with-the-glide', seconds: 0.9, curve: (t) => {
      const down = hump(t, 0, 0.3, 0.6), long = hump(t, 0.24, 0.62, 0.3), land = hump(t, 0.6, 0.74)
      return { sy: 1 - 0.4 * down + 0.5 * long - 0.22 * land + 0.1 * ring(t, 0.72, 2), sx: 1 + 0.25 * down - 0.2 * long + 0.15 * land, dy: -1.1 * hump(t, 0.26, 0.66) - 0.25 * hump(t, 0.7, 0.9), lean: 0.3 * hump(t, 0.2, 0.7), wings: hump(t, 0.25, 0.7) }
    } },
    // Four bounces that grow: each higher than the one before, and then a flat stop.
    { name: 'boings-on-the-spot', seconds: 1, curve: (t) => { const air = hops(1 - t, 0.08, 0.88, 4, 0.7), flat = hump(t, 0.88, 1, 0.4); return { dy: -0.75 * air, sy: 1 - 0.15 * hump(t, 0, 0.14) + 0.3 * air - 0.2 * flat, sx: 1 - 0.14 * air + 0.16 * flat } } },
    // Pulled to one side and let go: it swings back and forth, less each time.
    { name: 'twangs-side-to-side', seconds: 0.9, curve: (t) => { const twang = ring(t, 0.14, 3.5, 1.5); return { lean: -0.15 * hump(t, 0, 0.14) + 0.6 * twang, dx: 0.15 * twang, sy: 1 + 0.1 * Math.abs(twang) } } },
  ],
  dooo: [
    // Slowly down with the glide, ears and eyelids too, and back up in a moment, too far, with one ear flying.
    { name: 'droops-to-the-ground-and-snaps-back', seconds: 1.2, curve: (t) => {
      const low = held(t, 0.1, 0.66, 0.68, 0.76), snap = hump(t, 0.72, 0.9, 0.3)
      return { sy: 1 + 0.07 * hump(t, 0, 0.14) - 0.6 * low + 0.18 * snap + 0.05 * ring(t, 0.86, 1.5), sx: 1 + 0.3 * low - 0.08 * snap, lean: -0.3 * low, turn: -0.8 * low + 0.9 * snap, blink: low }
    } },
    // One ear up, then the other, then the first again: each slow to rise and quick to fall.
    { name: 'flaps-its-ears', seconds: 0.9, curve: (t) => ({ turn: -0.25 * hump(t, 0, 0.14) + hump(t, 0.12, 0.4, 0.7) - 0.85 * hump(t, 0.36, 0.64, 0.7) + 0.9 * hump(t, 0.6, 0.9, 0.7), wings: 0.6 * hump(t, 0.1, 0.9), dy: -0.08 * hump(t, 0.6, 0.9, 0.7) }) },
    { name: 'slumps-sideways-and-pops-up', seconds: 1.1, curve: (t) => { const slump = held(t, 0.1, 0.62, 0.64, 0.72), pop = hump(t, 0.7, 0.88, 0.3); return { lean: -0.1 * hump(t, 0, 0.14) + 0.7 * slump - 0.2 * pop, dx: 0.22 * slump, sy: 1 - 0.2 * slump + 0.12 * pop } } },
  ],
}

/** How long each kind takes to join in with another's call. */
export const JOIN_SECONDS: Readonly<Record<Kind, number>> = { pip: 0.8, tok: 0.9, wheep: 0.7, dooo: 1, brrl: 1.3, hoom: 1.4 }

/** How long the body takes over one note of a join that is sounded note by note, in seconds: a little longer than the note. */
export const JOIN_NOTE_SECONDS = 0.2

/**
 * What the body does on each single note when a join is sounded note by note, on top of the picture of the note:
 * `tok` pecks at its foot, at its lowest as the note starts to sound; `pip` only hops, which the picture of its
 * peep already is.
 */
export const JOIN_NOTE: Readonly<Partial<Record<Kind, Curve>>> = {
  tok: (t) => { const jab = hump(t, 0, 1, 0.3); return { lean: 0.5 * jab, sy: 1 - 0.1 * jab, blink: jab } },
}

/** What each kind does when it is tapped while another one calls (grid.ts, JOINS). */
export const JOINS: Readonly<Record<Kind, Curve>> = {
  // Peeps on every beat: it holds its wings out and turns its ear to the other, and each peep is a hop of its own (JOIN_NOTE).
  pip: (t) => { const on = held(t, 0.04, 0.16, 0.8, 0.97); return { wings: on, turn: 0.5 * on, sy: 1 + 0.05 * on } },
  // Leans over its own foot, wings and all, and stays there: each of its two peeps is a peck at that foot (JOIN_NOTE).
  tok: (t) => { const over = held(t, 0.04, 0.2, 0.82, 0.96); return { dx: 0.12 * over, lean: 0.25 * over, reach: over, wings: 0.7 * over, turn: over } },
  // A floor under the other voice: down low and wide for a long while, eyes shut, humming.
  hoom: (t) => { const low = held(t, 0.04, 0.3, 0.75, 0.97); return { sy: 1 - 0.25 * low, sx: 1 + 0.3 * low + 0.04 * Math.sin(TAU * 6 * t) * low, blink: low } },
  // Warbles around: the head goes twice round a loop, out to one side, down through the bottom, out to the other
  // and over the top, on a neck that is long and shivering.
  brrl: (t) => { const far = hump(t, 0.02, 0.98), round = TAU * 2 * t; return { turn: Math.sin(round) * far, lean: 0.16 * Math.sin(round) * far, sy: 1 + 0.12 * far + 0.2 * Math.cos(round) * far, sx: 1 - 0.08 * far, dx: 0.05 * Math.sin(TAU * 9 * t) * far } },
  // Like a question: up, tipped, head on one side, and it hangs there before it comes down.
  wheep: (t) => { const asks = held(t, 0.05, 0.6, 0.8, 0.98); return { dy: -0.5 * asks, sy: 1 + 0.3 * asks, sx: 1 - 0.12 * asks, lean: 0.3 * asks, turn: 0.8 * asks } },
  // Like a sigh: a breath in, then a long way down with the eyes shut.
  dooo: (t) => { const out = held(t, 0.25, 0.7, 0.86, 0.99); return { sy: 1 + 0.1 * hump(t, 0.02, 0.3) - 0.35 * out, sx: 1 + 0.18 * out, lean: -0.25 * out, turn: -0.5 * out, blink: out } },
}
