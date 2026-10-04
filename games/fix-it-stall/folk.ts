import { Director, stepSpring, type Spring } from './motion'
import { type Who } from './tastes'

// The customers, as numbers. Each is a rig of six channels for its body and
// two for its face, which its painter reads in its own way; a tempo; a
// weight; a few small things it does while it waits; what it does, watching,
// at each thing that happens to its gadget on the mat; and one table of keys
// for every reaction it can have when the gadget is handed back (tastes.ts).
// No two share a table, a tempo or a weight: each moves like itself.
//
//             lean            turn          lids       special          arm           hop
// owl         over the bench  head round    shut       cap pulled down  wing reaches  bob
// moth        droop           spin          eyes dim   wings spread     feelers out   off the ground
// yak         wilt            head shake    shut       fringe in / out  nose reaches  shuffle
// tortoise    lean            head aside    shut       neck in / out    foot          rise
// cockatoo    slump           head to side  shut       crest up         wing beats    hop
// magpie      peck down       head cocked   shut       tail flicks      wing snatches hop

export type Channel = 'lean' | 'turn' | 'lids' | 'special' | 'arm' | 'hop'
export const CHANNELS: readonly Channel[] = ['lean', 'turn', 'lids', 'special', 'arm', 'hop']
/**
 * The face, beyond the lids: `brow` from -1, drawn together in worry, to 1,
 * right up; `gape` from 0, shut, to 1, a beak or a mouth wide open. Each
 * painter has its own brows and its own mouth.
 */
export type Feature = 'brow' | 'gape'
export const FEATURES: readonly Feature[] = ['brow', 'gape']
const EVERY: readonly (Channel | Feature)[] = [...CHANNELS, ...FEATURES]
export type Pose = Record<Channel | Feature, number>

/** For each channel that moves: where it is at which share of the way through, joined by straight lines and held at the last. */
export type Keys = Partial<Record<Channel | Feature, readonly (readonly [number, number])[]>>

/** What a customer does, watching, at each thing that happens to its gadget on the mat. */
export type Watched =
  /** A clip bites, a part is seated: a look, a small start. */
  | 'flinch'
  /** The gadget runs, for the first time since it stopped. */
  | 'delight'
  /** It ran, and now it does not. */
  | 'droop'
  /** A lamp blows. */
  | 'wince'
export const WATCHED: readonly Watched[] = ['flinch', 'delight', 'droop', 'wince']
/** How long each lasts, in seconds, for a customer of middling tempo. */
const LASTS: Record<Watched, number> = { flinch: 0.5, delight: 1.5, droop: 1.6, wince: 1.1 }

export function keyed(keys: Keys, t: number, into: Pose): Pose {
  for (const channel of EVERY) {
    const line = keys[channel]
    if (!line || line.length === 0) { into[channel] = 0; continue }
    let value = line[0][1]
    for (let i = 0; i < line.length; i++) {
      const [at, v] = line[i]
      if (t >= at) { value = v; continue }
      const [before, from] = line[i - 1] ?? [0, line[0][1]]
      value = at === before ? v : from + ((v - from) * (t - before)) / (at - before)
      break
    }
    into[channel] = value
  }
  return into
}

type Rig = {
  /** Breaths a second while it stands and waits. */
  breath: number
  /** How its channels follow where they are sent: stiff and light, or slow and heavy. */
  spring: { stiffness: number; damping: number }
  /** Seconds between two small things. */
  rest: readonly [number, number]
  /** How long one small thing takes, in seconds. */
  takes: number
  /** How it stands while its gadget lies open on the mat. */
  watching: Keys
  /** The small things it does while it waits, by name. */
  idle: Record<string, Keys>
  /** What a pop does to it. */
  startle: Keys
  /** What it does at each thing that happens to its gadget while it watches. */
  watched: Record<Watched, Keys>
  /** How it holds itself while a part of its gadget is out of it and in the hand. */
  alarm: Keys
  /** Its gauge: where its spirits take each channel, at -1 and at 1. The cockatoo's is its crest. */
  gauge: Partial<Record<Channel, readonly [number, number]>>
}

export const RIGS: Record<Who, Rig> = {
  owl: {
    breath: 0.25, spring: { stiffness: 60, damping: 12 }, rest: [3, 7], takes: 1.6,
    watching: { lean: [[0, 0.3]] },
    idle: {
      'head-swivel': { turn: [[0, 0], [0.4, 0.35], [0.7, 0.35], [1, 0]] },
      'slow-blink': { lids: [[0, 0], [0.45, 1], [0.6, 1], [1, 0]] },
      'cap-tug': { arm: [[0, 0], [0.3, 0.5], [1, 0]], special: [[0.2, 0], [0.5, 0.4], [1, 0]] },
    },
    startle: { lids: [[0, -0.6], [1, 0]], hop: [[0, 0.6], [1, 0]] },
    watched: {
      flinch: { brow: [[0, 0.6], [0.5, 0.2], [1, 0]], lean: [[0, 0.15], [1, 0]] },
      delight: { hop: [[0, 0], [0.2, 0.7], [0.4, 0], [0.6, 0.4], [0.8, 0]], brow: [[0, 1], [0.8, 0.6], [1, 0]], gape: [[0, 0.6], [0.6, 0.3], [1, 0]], lids: [[0, -0.5], [1, 0]] },
      droop: { brow: [[0, -0.8], [0.7, -0.6], [1, 0]], lean: [[0, 0], [0.3, 0.4], [1, 0]], lids: [[0.2, 0], [0.5, 0.5], [1, 0]] },
      wince: { lids: [[0, 1], [0.5, 1], [0.7, 0.3], [1, 0]], lean: [[0, -0.5], [1, 0]], brow: [[0, -1], [1, 0]] },
    },
    alarm: { lids: [[0, -1]], brow: [[0, 1]], gape: [[0, 0.7]], lean: [[0, 0.5]] },
    gauge: { lean: [0.1, 0.25], lids: [0.25, -0.2] },
  },
  moth: {
    breath: 0.9, spring: { stiffness: 180, damping: 14 }, rest: [1.5, 4], takes: 0.7,
    watching: { lean: [[0, 0.15]], special: [[0, 0.35]] },
    idle: {
      'wing-fan': { special: [[0, 0.3], [0.5, 0.9], [1, 0.3]] },
      'feeler-comb': { arm: [[0, 0], [0.25, 1], [0.5, 0.3], [0.75, 1], [1, 0]] },
      'sideways-shuffle': { turn: [[0, 0], [0.5, 0.12], [1, 0]], hop: [[0, 0], [0.25, 0.3], [0.5, 0], [0.75, 0.3], [1, 0]] },
    },
    startle: { hop: [[0, 1], [1, 0]], special: [[0, 1], [1, 0.3]] },
    watched: {
      flinch: { arm: [[0, 1], [0.5, 0.3], [1, 0]], hop: [[0, 0.4], [1, 0]] },
      delight: { special: [[0, 0.7], [0.3, 0.1], [0.6, 0.7], [1, 0.2]], hop: [[0, 0.8], [0.5, 0.5], [1, 0]], brow: [[0, 1], [1, 0]] },
      droop: { lean: [[0, 0], [0.4, 0.7], [1, 0]], special: [[0, -0.3], [1, 0]], brow: [[0, -1], [1, 0]] },
      wince: { special: [[0, -0.35], [0.6, -0.35], [1, 0]], lean: [[0, -0.6], [1, 0]], lids: [[0, 1], [0.6, 0.6], [1, 0]] },
    },
    alarm: { arm: [[0, 1]], hop: [[0, 0.5]], brow: [[0, 1]] },
    gauge: { special: [-0.3, 0.45], lean: [0.3, 0] },
  },
  yak: {
    breath: 0.18, spring: { stiffness: 30, damping: 9 }, rest: [4, 9], takes: 1.8,
    watching: { lean: [[0, 0.2]] },
    idle: {
      'fringe-puff': { special: [[0, 0], [0.3, 0.45], [1, 0]] },
      'ear-flap': { turn: [[0, 0], [0.2, 0.2], [0.4, -0.2], [0.6, 0.15], [1, 0]] },
      'slow-chew': { hop: [[0, 0], [0.2, 0.15], [0.4, 0], [0.6, 0.15], [0.8, 0], [1, 0]] },
    },
    startle: { special: [[0, 0.8], [1, 0]], lean: [[0, -0.3], [1, 0]] },
    watched: {
      flinch: { turn: [[0, 0.25], [0.5, -0.1], [1, 0]], brow: [[0, 0.4], [1, 0]] },
      delight: { special: [[0, 0.7], [0.6, 0.5], [1, 0]], brow: [[0, 0.9], [1, 0]], gape: [[0, 0.8], [0.7, 0.5], [1, 0]], hop: [[0, 0], [0.3, 0.4], [0.6, 0]] },
      droop: { lean: [[0, 0], [0.5, 0.6], [1, 0]], brow: [[0, -0.9], [1, 0]], arm: [[0.2, 0], [0.6, -0.5], [1, 0]] },
      wince: { lids: [[0, 1], [0.7, 0.8], [1, 0]], turn: [[0, -0.5], [0.6, -0.4], [1, 0]], brow: [[0, -0.7], [1, 0]] },
    },
    alarm: { brow: [[0, 1]], gape: [[0, 0.5]], special: [[0, 0.5]], lean: [[0, 0.4]] },
    gauge: { special: [0, 0.3], lean: [0.3, 0] },
  },
  tortoise: {
    breath: 0.1, spring: { stiffness: 11, damping: 6 }, rest: [5, 11], takes: 2.6,
    watching: { special: [[0, 0.3]] },
    idle: {
      'neck-crane': { special: [[0, 0], [0.5, 0.6], [0.8, 0.6], [1, 0]] },
      'one-eye-blink': { lids: [[0, 0], [0.5, 0.6], [1, 0]] },
      'foot-shift': { arm: [[0, 0], [0.5, 0.5], [1, 0]] },
    },
    startle: { special: [[0, -1], [0.8, -1], [1, 0]] },
    watched: {
      flinch: { special: [[0, -0.3], [0.6, -0.2], [1, 0]], lids: [[0, 0.4], [1, 0]] },
      delight: { special: [[0, 0.8], [0.8, 0.7], [1, 0]], brow: [[0, 0.8], [1, 0]], gape: [[0.1, 0], [0.4, 0.6], [1, 0]] },
      droop: { special: [[0, -0.4], [1, 0]], brow: [[0, -1], [1, 0]], turn: [[0.2, 0], [0.5, 0.4], [1, 0]] },
      wince: { special: [[0, -0.8], [0.7, -0.8], [1, 0]], lids: [[0, 1], [0.8, 1], [1, 0]] },
    },
    alarm: { special: [[0, 0.9]], brow: [[0, 1]], gape: [[0, 0.4]] },
    gauge: { special: [-0.25, 0.35] },
  },
  cockatoo: {
    breath: 0.5, spring: { stiffness: 140, damping: 11 }, rest: [1.2, 3.5], takes: 0.6,
    watching: { lean: [[0, 0.2]], special: [[0, 0.3]] },
    idle: {
      'crest-flick': { special: [[0, 0], [0.2, 1], [0.6, 1], [1, 0]] },
      'head-bob': { turn: [[0, 0], [0.25, 0.4], [0.5, -0.4], [0.75, 0.4], [1, 0]] },
      'wing-stretch': { arm: [[0, 0], [0.5, 0.8], [1, 0]] },
    },
    startle: { special: [[0, 1], [1, 0.2]], hop: [[0, 0.8], [1, 0]] },
    watched: {
      flinch: { special: [[0, 0.6], [0.4, 0.1], [1, 0]], turn: [[0, 0.2], [1, 0]] },
      delight: { special: [[0, 1], [1, 0.6]], hop: [[0, 0], [0.15, 1], [0.3, 0], [0.45, 0.8], [0.6, 0]], gape: [[0, 1], [0.7, 0.6], [1, 0]], arm: [[0, 0], [0.3, 0.8], [0.6, 0.2], [1, 0]], brow: [[0, 1], [1, 0]] },
      droop: { special: [[0, -0.5], [1, -0.2]], lean: [[0, 0], [0.4, 0.5], [1, 0.1]], brow: [[0, -1], [1, 0]] },
      wince: { special: [[0, 0.9], [0.3, -0.3], [1, 0]], lids: [[0, 1], [0.5, 1], [1, 0]], lean: [[0, -0.4], [1, 0]] },
    },
    alarm: { special: [[0, 0.9]], gape: [[0, 0.8]], brow: [[0, 1]], turn: [[0, 0.3]] },
    gauge: { special: [-0.3, 0.7] },
  },
  magpie: {
    breath: 0.7, spring: { stiffness: 220, damping: 16 }, rest: [1, 3], takes: 0.5,
    watching: { lean: [[0, 0.35]], turn: [[0, 0.25]] },
    idle: {
      'tail-flick': { special: [[0, 0], [0.3, 1], [0.6, 0.2], [1, 0]] },
      'head-cock': { turn: [[0, 0], [0.3, 0.6], [0.7, 0.6], [1, 0]] },
      'two-hops': { hop: [[0, 0], [0.25, 1], [0.5, 0], [0.75, 1], [1, 0]] },
    },
    startle: { hop: [[0, 1], [1, 0]], turn: [[0, -0.6], [1, 0]] },
    watched: {
      flinch: { hop: [[0, 0.5], [0.3, 0], [1, 0]], turn: [[0, -0.4], [0.5, 0.3], [1, 0]] },
      delight: { hop: [[0, 0], [0.12, 1], [0.24, 0], [0.36, 1], [0.48, 0], [0.6, 0.7], [0.72, 0]], special: [[0, 1], [0.5, 0.6], [1, 0]], gape: [[0, 0.7], [1, 0]], brow: [[0, 1], [1, 0]] },
      droop: { special: [[0, -0.6], [1, 0]], lean: [[0, 0], [0.3, 0.5], [1, 0]], brow: [[0, -1], [1, 0]] },
      wince: { turn: [[0, 0.9], [0.6, 0.9], [1, 0]], lids: [[0, 1], [0.6, 1], [1, 0]], hop: [[0, 0.3], [0.2, 0]] },
    },
    alarm: { lean: [[0, 0.7]], gape: [[0, 0.6]], brow: [[0, 1]], arm: [[0, 0.5]] },
    gauge: { special: [-0.3, 0.5], turn: [0.2, 0] },
  },
}

/** One table of keys for every reaction a customer can have, by the act's name in tastes.ts. Time runs over the whole reaction. */
export const ACTS: Record<string, Keys> = {
  // The owl. Likes it dim, and a switch. Dislikes glare.
  'owl-cap-down-head-right-round': { special: [[0, 0], [0.15, 1]], turn: [[0.15, 0], [0.5, 1]], lids: [[0, 0.2], [0.1, 1]], brow: [[0, 0], [0.12, -1]] },
  'owl-settles-in-the-glow': { lean: [[0, 0], [0.4, 0.6], [1, 0.5]], lids: [[0, 0], [0.5, 0.7], [1, 0.6]], hop: [[0.3, 0], [0.4, 0.3], [0.5, 0]], brow: [[0, 0], [0.4, 0.4], [1, 0.25]] },
  'owl-puts-it-out-and-on-again': { arm: [[0, 0], [0.2, 1], [0.3, 0.6], [0.5, 1], [0.6, 0.6], [0.8, 1], [1, 0.3]], turn: [[0.3, 0], [0.4, 0.15], [0.6, 0]], brow: [[0, 0], [0.2, 0.7], [0.3, 0.1], [0.5, 0.7], [0.6, 0.1], [0.8, 0.7], [1, 0.4]] },
  'owl-tries-it-twice-and-lays-it-back': { arm: [[0, 0], [0.25, 1], [0.35, 0.5], [0.5, 1], [0.7, 0.2], [1, 0]], lean: [[0.55, 0], [0.7, 0.8], [0.9, 0.2], [1, 0]], lids: [[0.6, 0], [0.75, -0.5], [1, 0]], brow: [[0, 0], [0.5, -0.4], [0.75, -0.9], [1, -0.5]], gape: [[0.6, 0], [0.75, 0.4], [1, 0]] },
  'owl-takes-it-and-nods-to-nobody': { hop: [[0.3, 0], [0.4, 0.5], [0.5, 0], [0.6, 0.4], [0.7, 0]], lean: [[0, 0], [0.3, 0.3], [1, 0.2]], brow: [[0, 0], [0.3, 0.3], [1, 0.15]] },
  // The moth. Likes the brightest lamp. Dislikes wind, and the dark.
  'moth-rides-the-blade': { turn: [[0, 0], [1, 3]], special: [[0, 0.3], [0.1, 1]], hop: [[0, 0], [0.2, 1]], brow: [[0, 0], [0.1, 1]], lids: [[0, 0], [0.1, -1]] },
  'moth-pinned-to-the-post': { lean: [[0, 0], [0.1, -1]], special: [[0, 0.3], [0.1, 1], [1, 0.9]], hop: [[0.1, 0], [0.2, 0.6]], brow: [[0, 0], [0.1, -1]] },
  'moth-bumps-the-glass-in-bliss': { arm: [[0, 0], [0.2, 1], [0.3, 0.2], [0.45, 1], [0.55, 0.2], [0.7, 1], [0.8, 0.3], [1, 0.8]], special: [[0, 0.3], [0.2, 1], [1, 0.8]], hop: [[0, 0], [0.2, 0.8], [1, 0.7]], brow: [[0, 0], [0.2, 0.9]] },
  'moth-circles-the-lamp': { turn: [[0, 0], [1, 1]], special: [[0, 0.3], [0.15, 0.8]], hop: [[0, 0], [0.15, 0.6]], brow: [[0, 0], [0.15, 0.5]] },
  'moth-droops': { lean: [[0, 0], [0.5, 1]], special: [[0, 0.3], [0.5, 0]], lids: [[0, 0], [0.6, 0.7]], brow: [[0, 0], [0.5, -1]] },
  'moth-tries-it-twice-and-lays-it-back': { arm: [[0, 0], [0.2, 1], [0.3, 0], [0.45, 1], [0.55, 0]], hop: [[0.6, 0], [0.7, 0.5], [0.85, 0]], special: [[0.55, 0.3], [0.7, 0.7], [1, 0.3]], brow: [[0.5, 0], [0.7, -0.8], [1, -0.4]] },
  // The yak. Likes a strong wind. Dislikes a fan that sucks, and a hot bright lamp.
  'yak-fringe-goes-in': { special: [[0, 0], [0.2, -1], [0.6, -1], [0.8, -0.3], [1, -0.6]], lean: [[0.2, 0], [0.5, -0.6], [1, -0.4]], turn: [[0.5, 0], [0.6, 0.5], [0.7, -0.5], [0.8, 0.3], [1, 0]], brow: [[0, 0], [0.2, -1]], gape: [[0.1, 0], [0.25, 0.7], [0.8, 0.4]] },
  'yak-hair-streams-back': { special: [[0, 0], [0.2, 1]], lids: [[0.2, 0], [0.4, 0.8]], lean: [[0, 0], [0.3, 0.5]], brow: [[0, 0], [0.3, 0.7]], gape: [[0.1, 0], [0.4, 0.8]] },
  'yak-wilts': { lean: [[0, 0], [0.6, 1]], turn: [[0.2, 0], [0.4, 0.3], [0.6, -0.3], [0.8, 0.2], [1, 0]], arm: [[0.5, 0], [0.8, -0.6]], special: [[0, 0], [0.6, -0.4]], brow: [[0, 0], [0.5, -1]], gape: [[0.3, 0], [0.7, 0.5]] },
  'yak-tries-it-twice-and-lays-it-back': { arm: [[0, 0], [0.3, 1], [0.45, 0.4], [0.6, 1], [0.8, 0]], turn: [[0.8, 0], [0.9, 0.3], [1, 0]], brow: [[0.5, 0], [0.8, -0.8], [1, -0.4]], gape: [[0.8, 0], [0.9, 0.4], [1, 0]] },
  'yak-takes-it-and-nods-to-nobody': { turn: [[0.2, 0], [0.35, 0.6], [0.5, -0.6], [0.65, 0.4], [0.8, 0]], special: [[0.2, 0], [0.5, 0.5], [1, 0.1]], arm: [[0, 0], [0.2, 0.7], [1, 0.4]], brow: [[0, 0], [0.3, 0.3]] },
  // The tortoise. Likes slow and soft. Dislikes anything fast or sudden.
  'tortoise-head-and-legs-in': { special: [[0, 0], [0.08, -1]], hop: [[0.08, 0], [0.15, -0.4]], brow: [[0, 0], [0.05, -1]] },
  'tortoise-stretches-its-neck-out': { special: [[0, 0], [0.7, 1]], lids: [[0.5, 0], [0.8, 0.5]], lean: [[0, 0], [0.8, 0.4]], brow: [[0, 0], [0.7, 0.7]], gape: [[0.6, 0], [0.9, 0.3]] },
  'tortoise-stays-in-a-beat-longer': { special: [[0, 0], [0.05, -1], [0.9, -1], [1, -0.6]], turn: [[0.1, 0], [0.2, 0.5], [0.3, -0.5], [0.4, 0.3], [0.5, -0.3], [0.6, 0]], arm: [[0.7, 0], [0.8, 0.6], [0.9, 0]], hop: [[0.05, 0], [0.1, -0.5], [1, -0.3]], brow: [[0, 0], [0.05, -1]] },
  'tortoise-tries-it-twice-and-lays-it-back': { arm: [[0, 0], [0.4, 1], [0.5, 0.6], [0.8, 1], [1, 0]], special: [[0.3, 0], [0.6, 0.5], [1, 0.2]], brow: [[0.5, 0], [0.9, -0.7]] },
  'tortoise-takes-it-and-nods-to-nobody': { special: [[0, 0], [0.5, 0.4]], lids: [[0.6, 0], [0.8, 1], [1, 0]], brow: [[0, 0], [0.5, 0.25]] },
  // The cockatoo. Likes it loud. Dislikes silence, and a lamp that is out.
  'cockatoo-asleep-at-once': { lids: [[0, 0], [0.08, 1]], lean: [[0.08, 0], [0.3, 0.7]], special: [[0, 0.2], [0.1, 0]], gape: [[0.3, 0], [0.5, 0.25], [0.7, 0.05], [0.9, 0.25], [1, 0.15]] },
  'cockatoo-conducts-the-duet': { arm: [[0, 0], [0.1, 1], [0.2, -1], [0.3, 1], [0.4, -1], [0.5, 1], [0.6, -1], [0.7, 1], [0.8, -1], [0.9, 1], [1, 0]], special: [[0, 0], [0.1, 1]], hop: [[0, 0], [0.1, 0.4]], gape: [[0, 0], [0.1, 0.8], [0.2, 0.3], [0.3, 0.8], [0.4, 0.3], [0.5, 0.8], [0.6, 0.3], [0.7, 0.8], [0.8, 0.3], [0.9, 0.8], [1, 0.6]], brow: [[0, 0], [0.1, 0.8]] },
  'cockatoo-joins-and-drowns-it-out': { special: [[0, 0], [0.1, 1]], turn: [[0.1, 0], [0.2, 1], [0.3, -1], [0.4, 1], [0.5, -1], [0.6, 1], [0.7, -1], [0.8, 1], [0.9, -1], [1, 0]], lean: [[0, 0], [0.1, -0.4]], gape: [[0, 0], [0.1, 1]], brow: [[0, 0], [0.1, 0.7]] },
  'cockatoo-taps-it-and-sulks': { arm: [[0, 0], [0.15, 1], [0.2, 0], [0.3, 1], [0.35, 0], [0.45, 1], [0.5, 0]], turn: [[0.55, 0], [0.75, 1]], special: [[0.5, 0.3], [0.7, 0]], brow: [[0, 0], [0.5, -0.6], [0.75, -1]] },
  'cockatoo-tries-it-twice-and-lays-it-back': { arm: [[0, 0], [0.15, 1], [0.25, 0], [0.4, 1], [0.5, 0]], special: [[0.5, 0], [0.6, 1], [0.8, 0]], turn: [[0.6, 0], [0.7, 0.5], [0.8, -0.5], [1, 0]], brow: [[0.5, 0], [0.6, -1], [1, -0.5]], gape: [[0.5, 0], [0.6, 0.6], [0.8, 0]] },
  'cockatoo-takes-it-and-nods-to-nobody': { special: [[0, 0], [0.2, 0.7], [1, 0.4]], hop: [[0.3, 0], [0.4, 0.5], [0.5, 0]], brow: [[0, 0], [0.2, 0.4]] },
  // The magpie. Likes it neat, and anything shiny. Dislikes trailing leads and the rubber band.
  'magpie-keeps-the-shiny-thing': { arm: [[0, 0], [0.25, 1], [0.4, 0.3]], hop: [[0.4, 0], [0.5, 1], [0.6, 0], [0.7, 1], [0.8, 0], [0.9, 0.6], [1, 0]], special: [[0.4, 0], [0.5, 1], [0.6, 0], [0.7, 1], [0.8, 0]], brow: [[0, 0], [0.25, 1]], gape: [[0.2, 0], [0.3, 0.5], [0.45, 0.1]] },
  'magpie-snaps-the-rubber-band': { lean: [[0, 0], [0.2, 1], [0.3, 0.6], [0.4, 1], [0.45, -0.4], [0.6, 0]], special: [[0.4, 0], [0.45, 1], [0.7, 0]], turn: [[0.6, 0], [0.75, 0.7], [1, 0.5]], brow: [[0, 0], [0.2, -0.8], [0.44, -0.8], [0.46, 1], [0.7, 0.3], [1, -0.4]], gape: [[0.44, 0], [0.46, 0.9], [0.7, 0]] },
  'magpie-picks-at-the-leads': { lean: [[0, 0], [0.15, 1], [0.25, 0.5], [0.35, 1], [0.45, 0.5], [0.55, 1], [0.65, 0.5], [0.75, 1], [1, 0.3]], turn: [[0.2, 0], [0.3, 0.3], [0.4, -0.3], [0.5, 0.3], [0.6, -0.3], [0.7, 0]], brow: [[0, 0], [0.15, -0.9]] },
  'magpie-pats-the-lid': { arm: [[0, 0], [0.2, 1], [0.3, 0.5], [0.4, 1], [0.5, 0.5], [0.6, 1], [0.7, 0]], hop: [[0.7, 0], [0.8, 0.6], [0.9, 0]], special: [[0.7, 0], [0.8, 0.8], [1, 0.2]], brow: [[0, 0], [0.2, 0.5]] },
  'magpie-tries-it-twice-and-lays-it-back': { lean: [[0, 0], [0.15, 1], [0.25, 0.3], [0.4, 1], [0.5, 0.3]], turn: [[0.5, 0], [0.6, 0.8], [0.8, -0.8], [1, 0]], hop: [[0.85, 0], [0.92, 0.5], [1, 0]], brow: [[0.5, 0], [0.6, -0.9], [1, -0.4]] },
}

const zero = (): Pose => ({ lean: 0, turn: 0, lids: 0, special: 0, arm: 0, hop: 0, brow: 0, gape: 0 })

/** What a customer sees and feels of the bench this frame. */
export type Sees = {
  /** Where it looks, as a step away from its own face in stage units; null for straight ahead, at nothing. */
  look?: { x: number; y: number } | null
  /** Its spirits about what lies on the mat: -1 a flag is up, 1 the thing runs. */
  mood?: number
  /** A part of its gadget is out of it and in the hand. */
  alarm?: boolean
  /** The order ticket on the gadget in its hands: 1 as it looks at an order that has been met, -1 at one that has not, 0 otherwise. */
  order?: number
}

/** One customer: where each channel is now, on its own springs, and what it is doing. */
export class Customer {
  readonly pose: Pose = zero()
  /** -1 to 1: out and in. */
  breath = 0
  /** The small thing it is doing while it waits, or null. */
  doing: string | null = null
  /** Where its eyes are turned, each from -1 to 1. */
  readonly gaze = { x: 0, y: 0.3 }
  /** Every feather and hair on end: 1 at a pop, and down again in a second or so. */
  fright = 0
  /** Its spirits, following what it was last told on its own weight. */
  mood = 0
  /** What it is doing at something that just happened on the mat, or null. */
  watched: Watched | null = null
  private readonly springs: Record<Channel | Feature, Spring>
  private readonly target: Pose = zero()
  private readonly add: Pose = zero()
  private readonly spirits: Spring = { x: 0, v: 0 }
  private seconds = 0
  private wait: number
  private progress = 0
  private since = 0
  private last: string | null = null
  private startled = 0

  constructor(readonly who: Who, private readonly director: Director) {
    this.springs = { lean: { x: 0, v: 0 }, turn: { x: 0, v: 0 }, lids: { x: 0, v: 0 }, special: { x: 0, v: 0 }, arm: { x: 0, v: 0 }, hop: { x: 0, v: 0 }, brow: { x: 0, v: 0 }, gape: { x: 0, v: 0 } }
    this.wait = director.between(0.5, RIGS[who].rest[1])
  }

  /** A cell's flag popped: each takes it in its own way, for a moment, and everything on it stands on end. */
  startle(): void {
    this.startled = 1
    this.fright = 1
    this.watched = null
  }

  /** Something happened to its gadget while it watched. */
  react(what: Watched): void {
    this.watched = what
    this.since = 0
  }

  /**
   * `act` is the reaction it is playing and how far through, or null while it
   * only waits; `watching` whether its own gadget lies open on the mat; `wind`
   * how hard a blade on the mat blows at it, which ruffles whatever it has to
   * ruffle: a crest, a fringe, a cap, a pair of wings. `sees` is where it
   * looks and how things stand on the mat.
   */
  step(dt: number, act: { name: string; progress: number } | null, watching: boolean, wind = 0, sees: Sees = {}): void {
    const rig = RIGS[this.who]
    this.seconds += dt
    this.breath = Math.sin(this.seconds * rig.breath * Math.PI * 2)
    stepSpring(this.spirits, act ? 0 : (sees.mood ?? 0), rig.spring.stiffness * 0.4, rig.spring.damping * 0.8, dt)
    this.mood = this.spirits.x
    if (act && ACTS[act.name]) {
      keyed(ACTS[act.name], act.progress, this.target)
      // The order on the card shows in its brow while it looks at it: up at one that is met, drawn at one that is not.
      this.target.brow += (sees.order ?? 0) * 0.5
      this.doing = null
      this.watched = null
    } else {
      keyed(watching ? rig.watching : {}, 0, this.target)
      if (this.doing) {
        this.progress += dt / rig.takes
        if (this.progress >= 1) { this.last = this.doing; this.doing = null; this.wait = this.director.between(rig.rest[0], rig.rest[1]) }
        else for (const channel of EVERY) this.target[channel] += keyed(rig.idle[this.doing], this.progress, this.add)[channel]
      } else if ((this.wait -= dt) <= 0) {
        this.doing = this.director.pick(Object.keys(rig.idle), this.last)
        this.progress = 0
      }
      // Its spirits show: in its brow, and in whatever it has for a gauge.
      const mood = Math.max(-1, Math.min(1, this.mood))
      this.target.brow += mood * (mood > 0 ? 0.35 : 0.6)
      for (const channel of CHANNELS) {
        const gauge = rig.gauge[channel]
        if (gauge) this.target[channel] += mood < 0 ? -mood * gauge[0] : mood * gauge[1]
      }
      if (this.watched) {
        this.since += dt / (LASTS[this.watched] * (0.7 + 0.25 * rig.takes))
        if (this.since >= 1) this.watched = null
        else for (const channel of EVERY) this.target[channel] += keyed(rig.watched[this.watched], this.since, this.add)[channel]
      }
      if (sees.alarm) for (const channel of EVERY) this.target[channel] += keyed(rig.alarm, 0, this.add)[channel]
    }
    if (wind !== 0 && !act) this.target.special += wind * 0.16 * (1 + 0.35 * Math.sin(this.seconds * 9 * (1 + rig.breath)))
    if (this.startled > 0) {
      keyed(rig.startle, 1 - this.startled, this.add)
      for (const channel of EVERY) this.target[channel] += this.add[channel]
      // Eyes round and a beak open, whoever it is.
      this.target.brow += this.startled
      this.target.gape += this.startled * 0.8
      this.startled = Math.max(0, this.startled - dt / 0.9)
    }
    this.fright = Math.max(0, this.fright - dt / (0.8 + rig.takes * 0.5))
    for (const channel of EVERY) {
      stepSpring(this.springs[channel], this.target[channel], rig.spring.stiffness, rig.spring.damping, dt)
      this.pose[channel] = this.springs[channel].x
    }
    // The eyes go where they are sent quickly, whatever the body weighs.
    const look = sees.look ?? null
    const far = look ? Math.hypot(look.x, look.y) || 1 : 1, reach = look ? Math.min(1, far / 140) : 0
    const gx = look ? (look.x / far) * reach : 0, gy = look ? (look.y / far) * reach : 0.3
    const follow = Math.min(1, dt * 10)
    this.gaze.x += (gx - this.gaze.x) * follow
    this.gaze.y += (gy - this.gaze.y) * follow
  }

  /** Set every channel straight to where a finished reaction leaves it: for a load, when nothing replays. */
  settle(act: string): void {
    if (!ACTS[act]) return
    keyed(ACTS[act], 1, this.target)
    for (const channel of EVERY) { this.springs[channel].x = this.target[channel]; this.springs[channel].v = 0; this.pose[channel] = this.target[channel] }
  }
}
