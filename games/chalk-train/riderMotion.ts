import { CHARACTERS, type Feel, type RiderKind } from './tastes'

// How each rider moves, as plain numbers on game time. Every rider has its
// own tempo and weight and one part of it that is funniest, and each acts out
// what a ride does to it in its own way: a like and a dislike are different
// pieces of acting, and no two riders share one. The view maps the numbers
// onto the chalk figures.

/** What a rider's eyes are doing. */
export type Eyes = 'open' | 'shut' | 'wide' | 'spiral'

/** One piece of acting, as how far each thing goes at its fullest. */
export type Clip = {
  /** How long it lasts, in seconds. */
  secs: number
  /** A hop off the ground, in tar units, and how many hops there are in the piece. */
  hop: number
  hops: number
  /** Squash low and wide (above 0) or stretch tall (below 0). */
  squash: number
  /** A lean, in radians, forward when positive. */
  tilt: number
  /** Whole turns on the spot. */
  spin: number
  /** A shiver from side to side, in tar units. */
  shake: number
  /** The funniest part: how far it swings, -1 to 1, and how many times; 0 times means it is held out. */
  part: number
  partBeats: number
  eyes: Eyes
  /** Puffed up, as a share of its size. */
  puff: number
  /** Flattened against what is behind it, 0 to 1. */
  flat: number
  /** Drawn in on itself, 0 to 1: the snail into its shell. */
  hide: number
  /** White with chalk dust, 0 to 1. */
  pale: number
  /** The share of the piece after which it is out of hiding again: 1 hides to the end. */
  out: number
  /** A step to one side and the other with each hop, in tar units: bounced along as on stepping stones. */
  stride: number
  /** Ears laid back, 0 to 1. */
  ears: number
  /** Up on the engine's funnel, 0 to 1: it leaps there, sits, and comes back to its seat. */
  perch: number
}

const still: Clip = { secs: 1, hop: 0, hops: 1, squash: 0, tilt: 0, spin: 0, shake: 0, part: 0, partBeats: 0, eyes: 'open', puff: 0, flat: 0, hide: 0, pale: 0, out: 1, perch: 0, stride: 0, ears: 0 }
const c = (over: Partial<Clip>): Clip => ({ ...still, ...over })

/** What a rider can be doing. The six in the middle are what a ride does to it; the `out-` ones are how it gets out at home. */
export const CLIPS = [
  'wait', 'reach', 'trick', 'walk', 'board', 'drawn-in', 'wave', 'tickled', 'hoop', 'dusted', 'full', 'greet', 'ride',
  'fast', 'corner', 'loop', 'splash', 'bump', 'scribble',
  'out-fast', 'out-corner', 'out-loop', 'out-splash', 'out-bump', 'out-scribble', 'out-plain',
  'to-home', 'home-act', 'at-home',
] as const
export type ClipName = (typeof CLIPS)[number]
/** The pieces that go round and round for as long as the rider is in that state. */
export const LOOPS: readonly ClipName[] = ['wait', 'ride', 'at-home', 'walk']

/** Each piece in its plain form, before a rider makes it its own. */
const PLAIN: Record<ClipName, Clip> = {
  wait: c({ secs: 2.4, squash: 0.03, part: 0.2, partBeats: 1 }),
  reach: c({ secs: 1.2, tilt: 0.22, hop: 6, part: 0.6 }),
  // Walking over to the train: a step at a time, leaning the way it goes.
  walk: c({ secs: 0.5, hop: 9, hops: 1, tilt: 0.1, squash: 0.05 }),
  trick: c({ secs: 0.9, hop: 26, squash: 0.12, part: 1, partBeats: 2 }),
  board: c({ secs: 0.6, hop: 60, squash: 0.14, tilt: 0.1 }),
  'drawn-in': c({ secs: 0.6, squash: -0.1, hop: 8 }),
  wave: c({ secs: 1.0, tilt: -0.15, part: 1, partBeats: 3 }),
  tickled: c({ secs: 1.0, hop: 16, hops: 4, stride: 14, shake: 3, part: 0.8, partBeats: 4, eyes: 'shut' }),
  hoop: c({ secs: 1.6, spin: 3, tilt: 0.08, part: 0.5, partBeats: 3 }),
  dusted: c({ secs: 1.3, pale: 1, shake: 5, squash: -0.16, eyes: 'shut' }),
  full: c({ secs: 1.4, tilt: 0.3, part: 0.3, eyes: 'wide' }),
  greet: c({ secs: 1.0, hop: 12, tilt: 0.2, part: 0.9, partBeats: 2 }),
  ride: c({ secs: 0.8, hop: 3, squash: 0.03, part: 0.15, partBeats: 1 }),
  fast: c({ secs: 0.8, tilt: -0.08, part: 0.3 }),
  corner: c({ secs: 0.4, hop: 9, squash: 0.08 }),
  loop: c({ secs: 0.9, hop: 5, part: 0.3, eyes: 'wide' }),
  splash: c({ secs: 0.6, hop: 8, squash: 0.06, eyes: 'shut' }),
  bump: c({ secs: 0.3, hop: 7, squash: 0.05 }),
  scribble: c({ secs: 0.8, shake: 2, pale: 0.4 }),
  'out-fast': c({ secs: 1.2, flat: 0.5, tilt: -0.2, hop: 20, eyes: 'wide' }),
  'out-corner': c({ secs: 1.2, hop: 22, hops: 3, stride: 16, tilt: 0.12 }),
  'out-loop': c({ secs: 1.3, hop: 16, spin: 0.25, tilt: 0.2, eyes: 'spiral' }),
  'out-splash': c({ secs: 1.2, hop: 18, shake: 6, squash: -0.1, eyes: 'shut' }),
  'out-bump': c({ secs: 1.2, hop: 12, hops: 2, shake: 3, squash: 0.1 }),
  'out-scribble': c({ secs: 1.3, hop: 10, pale: 0.8, shake: 2 }),
  'out-plain': c({ secs: 0.9, hop: 24, squash: 0.1 }),
  'to-home': c({ secs: 0.7, hop: 34, squash: 0.12, tilt: 0.1 }),
  'home-act': c({ secs: 1.8, squash: 0.1, part: 0.6, partBeats: 2 }),
  'at-home': c({ secs: 3, squash: 0.03, part: 0.2, partBeats: 1 }),
}

/**
 * What a rider makes of a piece when the sheet says something particular
 * about it: each rider's two likes and two dislikes, its trick, the way it
 * boards and what it does at home.
 */
const OWN: Record<RiderKind, Partial<Record<ClipName, Partial<Clip>>>> = {
  frog: {
    // Waiting, its throat goes in and out; riding, it sits low; at home it floats.
    wait: { part: 0.7, partBeats: 3, squash: 0.06 },
    ride: { squash: 0.09, part: 0.5, partBeats: 2, hop: 5 },
    'at-home': { hide: 0.6, part: 0.4, partBeats: 2 },
    trick: { hop: 54, part: 1, partBeats: 1 },
    board: { hop: 96, squash: 0.2 },
    // Likes corners: hops in time with each one, throat out. Likes splashes: dives through the spray.
    corner: { hop: 30, part: 1, partBeats: 1, squash: 0.14 },
    splash: { hop: 34, spin: 1, eyes: 'open', secs: 0.8 },
    // Dislikes fast runs: flattened against the wagon back, eyes bulging. Dislikes scribbles: sneezes a croak.
    fast: { flat: 1, eyes: 'wide', tilt: -0.3, part: 0 },
    scribble: { squash: -0.28, eyes: 'shut', part: 1, partBeats: 1, hop: 14, secs: 0.7 },
    'home-act': { hop: 46, spin: 0.5, squash: 0.2, hide: 0.8, secs: 1.6 },
  },
  chick: {
    // Waiting, it pecks about; riding, it bobs; at home it sits tucked.
    wait: { hop: 5, hops: 3, tilt: 0.16, part: 0.3, partBeats: 4 },
    ride: { hop: 7, hops: 2, part: 0.4, partBeats: 4 },
    'at-home': { squash: 0.12, eyes: 'shut', hide: 0.3 },
    trick: { part: 1, partBeats: 6, hop: 20 },
    board: { hop: 44, part: 1, partBeats: 5 },
    // Likes loops: flaps and whoops. Likes fast runs: wings held out like a plane.
    loop: { part: 1, partBeats: 8, hop: 22, eyes: 'open', secs: 1.0 },
    fast: { part: 1, partBeats: 0, tilt: 0.3 },
    // Dislikes splashes: puffs into a wet ball and shakes. Dislikes bumps: a peep at each, like hiccups.
    splash: { puff: 0.4, shake: 7, eyes: 'shut', hop: 0, secs: 0.9 },
    bump: { hop: 16, eyes: 'shut', squash: -0.14, part: 0.5, partBeats: 1 },
    'home-act': { squash: 0.22, part: 0.5, partBeats: 3, eyes: 'shut', hide: 0.3, secs: 2.0 },
  },
  snail: {
    // Waiting, its eye stalks sway; riding, it leans out; at home it munches.
    wait: { part: 0.6, partBeats: 1, tilt: 0.05, secs: 3.6 },
    ride: { tilt: 0.12, part: 0.5, partBeats: 1, hop: 0, secs: 1.8 },
    'at-home': { part: 0.5, partBeats: 4, tilt: 0.2 },
    trick: { hide: 1, hop: 0, secs: 1.3 },
    board: { hop: 18, secs: 1.1, tilt: 0.25 },
    // Likes bumps: the slow way suits it, eye stalks swaying. Likes scribbles: curls up inside one with a sigh.
    bump: { hop: 2, tilt: 0.1, part: 0.9, partBeats: 1, secs: 0.9 },
    scribble: { hide: 0.55, eyes: 'shut', shake: 0, pale: 0.3, squash: 0.12, secs: 1.4 },
    // Dislikes loops: hides, its shell rolls round the wagon, and it peers out with spiral eyes. Dislikes fast runs: eye stalks stream out behind.
    loop: { hide: 1, out: 0.62, spin: 2, eyes: 'spiral', hop: 0, secs: 2.1 },
    // The stalks swing toward the back of it for a part above nothing: held at 1, they stream out behind.
    fast: { part: 1, partBeats: 0, flat: 0.3, eyes: 'wide', tilt: -0.12 },
    'home-act': { part: 0.7, partBeats: 5, tilt: 0.3, squash: 0.06, secs: 2.4 },
  },
  cat: {
    // Waiting, its tail swishes; riding, it sits tall; at home it sleeps in a ring.
    wait: { part: 0.5, partBeats: 1, squash: -0.03, tilt: -0.04, secs: 2.9 },
    ride: { squash: -0.05, part: 0.3, partBeats: 2, hop: 1, tilt: -0.05 },
    'at-home': { hide: 0.5, eyes: 'shut', squash: 0.1, part: 0.15, partBeats: 1 },
    trick: { squash: -0.3, tilt: 0.35, part: 1, partBeats: 1, hop: 0, secs: 1.2 },
    board: { hop: 78, tilt: 0.3, secs: 0.5 },
    // Likes fast runs: ears back and a loud purr. Likes scribbles: bats at the dust.
    fast: { part: -1, partBeats: 0, tilt: 0.24, squash: 0.08, ears: 1 },
    scribble: { part: 1, partBeats: 5, hop: 12, hops: 3, shake: 0, pale: 0.2, secs: 1.0 },
    // Dislikes corners: fur on end, tail like a bottle brush. Dislikes splashes: leaps straight up and lands on the engine's funnel.
    corner: { puff: 0.35, eyes: 'wide', part: 1, partBeats: 0, hop: 4, secs: 0.6 },
    splash: { perch: 1, hop: 0, eyes: 'wide', squash: -0.2, puff: 0.2, secs: 1.6 },
    'home-act': { spin: 2, squash: 0.2, hide: 0.5, eyes: 'shut', secs: 2.2 },
  },
}

/**
 * Each rider's manner, which colours every piece it has no version of its
 * own for: the frog is all spring, the chick all flap and lean, the snail
 * slow and swaying, the cat smooth and spare.
 */
const MANNER: Record<RiderKind, { hop: number; squash: number; tilt: number; part: number; secs: number }> = {
  frog: { hop: 1.35, squash: 1.5, tilt: 0.55, part: 1, secs: 1 },
  chick: { hop: 0.8, squash: 0.5, tilt: 1.35, part: 1.5, secs: 0.8 },
  snail: { hop: 0.3, squash: 1, tilt: 1.7, part: 0.7, secs: 1.6 },
  cat: { hop: 1, squash: 0.7, tilt: 0.9, part: 0.45, secs: 1.15 },
}

/** A rider's own version of a piece: the plain piece at the rider's tempo, weight and manner, and then what is its alone. */
export function clipOf(kind: RiderKind, name: ClipName): Clip {
  const { tempo, weight } = CHARACTERS[kind], plain = PLAIN[name], manner = MANNER[kind]
  // A quick light rider does everything sooner, higher and more often; a slow heavy one later, lower and with more sag.
  const quick = 0.55 + tempo / 4
  const own: Clip = {
    ...plain,
    secs: (plain.secs / Math.sqrt(quick)) * manner.secs,
    hop: plain.hop * (1.25 - weight * 0.9) * manner.hop,
    hops: Math.max(1, Math.round(plain.hops * quick)),
    squash: plain.squash * (0.6 + weight) * manner.squash,
    tilt: plain.tilt * (1.2 - weight * 0.5) * manner.tilt,
    shake: plain.shake * (1.3 - weight),
    part: Math.max(-1, Math.min(1, plain.part * manner.part)),
    partBeats: plain.partBeats === 0 ? 0 : Math.max(1, Math.round(plain.partBeats * quick)),
  }
  return { ...own, ...OWN[kind][name] }
}

/** How a rider holds itself this frame. */
export type RiderBearing = {
  hop: number
  squash: number
  tilt: number
  spin: number
  shake: number
  part: number
  eyes: Eyes
  puff: number
  flat: number
  hide: number
  pale: number
  perch: number
  stride: number
  ears: number
}

const bell = (t: number): number => Math.sin(Math.min(1, Math.max(0, t)) * Math.PI)
const plateau = (t: number): number => Math.max(0, Math.min(1, t / 0.15, (1 - t) / 0.15))

/** A rider's bearing `t` of the way through a piece, 0 to 1. `clock` is game time, for a shiver. */
export function bearingOf(clip: Clip, t: number, clock: number): RiderBearing {
  const u = Math.min(1, Math.max(0, t))
  return {
    hop: clip.hop * Math.abs(Math.sin(Math.PI * clip.hops * u)),
    squash: clip.squash * Math.sin(Math.PI * 2 * u) * (1 - u * 0.5),
    tilt: clip.tilt * bell(u),
    spin: clip.spin * Math.PI * 2 * u * u * (3 - 2 * u),
    shake: clip.shake * Math.sin(clock * 55) * bell(u),
    part: clip.partBeats === 0 ? clip.part * plateau(u) : clip.part * Math.sin(Math.PI * 2 * clip.partBeats * u),
    eyes: u < 0.92 ? clip.eyes : 'open',
    puff: clip.puff * plateau(u),
    flat: clip.flat * plateau(u),
    hide: u >= clip.out ? 0 : clip.hide * plateau(u / clip.out),
    pale: clip.pale * (1 - u * u),
    perch: clip.perch * Math.max(0, Math.min(1, u / 0.25, (1 - u) / 0.25)),
    // It lands to one side and then the other, once for each hop.
    stride: clip.stride * Math.cos(Math.PI * clip.hops * u) * Math.max(0, Math.min(1, u / 0.1, (1 - u) / 0.1)),
    ears: clip.ears * plateau(u),
  }
}

/** The piece a rider acts when a ride does something to it. */
export const feelClip = (feel: Feel): ClipName => feel
/** The piece a rider gets out with at home, from what the ride did to it most. */
export const outClip = (how: Feel | null): ClipName => (how ? (`out-${how}` as ClipName) : 'out-plain')


