import { MANNERS, bump, clamp01, ease } from './motion'
import { PAIR_GAP } from './room'
import type { SoundId } from './voices'
import { type PairId, type ThingId } from './wood'

// Every cell of the grid as plain numbers: what a thing does when it is
// touched where it lies, set down before the hedgehog, put down on the open
// path, set on the toad's stone, set in the water, snatched by the jay, or
// set against another thing on the table. No two cells share a motion or a
// sound. A cell is one act of the thing on the model's clock: `pose` says how
// the thing is drawn `s` seconds into it, and `cues` are the sounds along it.
// Nothing here draws and nothing knows the time.

export type Cue = { after: number; sound: SoundId; pitch?: number }

/** How a thing is drawn in an act. `go` is the share of the way from where the act began to where it ends. */
export type Go = {
  go: number
  dx: number
  dy: number
  turn: number
  sx: number
  sy: number
  /** What is the thing's own: the worm's knot, the snail pulled in, the acorn's cap lifted, the button's glint. */
  own: number
  /** How much of it shows: 0 is out of sight (in the ground, through the door, in the beak's shadow). */
  show: number
  /** In the jay's theft: 0 on the ground, 1 in his beak. */
  held: number
  /** Where the acorn's cap is, from the acorn, when it is off. */
  capX: number
  capY: number
  /** How far out each of the snail's two horns is, from 0 to 1. */
  hornA: number
  hornB: number
}

export type Cell = { length: number; cues: readonly Cue[]; pose: (s: number) => Go }

const TAU = Math.PI * 2
export const still = (): Go => ({ go: 1, dx: 0, dy: 0, turn: 0, sx: 1, sy: 1, own: 0, show: 1, held: 0, capX: 0, capY: 0, hornA: 1, hornB: 1 })
/** From 0 to 1 between two moments. */
const span = (s: number, a: number, b: number): number => clamp01((s - a) / (b - a))
const smooth = (s: number, a: number, b: number): number => ease(span(s, a, b))
/** 0, up to 1 in the middle of the stretch, and 0 again. */
const hump = (s: number, a: number, b: number): number => bump(s, a, b)
/** A landing: a squash that rings out after the moment `at`. */
const thud = (s: number, at: number, depth = 0.2): number => (s < at ? 0 : depth * Math.exp(-9 * (s - at)) * Math.cos(24 * (s - at)))
/** Set down: the thing comes the last way from the hand to where it lies, and squashes as it lands. */
const down = (s: number, by = 0.22): Go => { const q = thud(s, by, 0.14); return { ...still(), go: smooth(s, 0, by), sx: 1 + q, sy: 1 - q } }

const one = (sound: SoundId): Cue[] => [{ after: 0, sound }]

/** Touched where it lies: the toy's own act of each thing. */
const touched = (thing: ThingId): Cell => {
  const manner = MANNERS[thing]
  return { length: manner.length, cues: one(thing), pose: (s) => ({ ...still(), ...manner.pose(clamp01(s / manner.length)) }) }
}
/**
 * The snail's two horns. Touched, they go in one after the other, the second as the first is nearly in (`in` is
 * when the second starts and how long each takes), and come out again one at a time, each with its pip
 * (voices.ts: `snail`): `first` and `second` are when, and `takes` how long each takes.
 */
export const HORNS = { in: 0.04, pulls: 0.05, first: 0.5, second: 0.68, takes: 0.14 } as const
/** The snail touched: the horns go in with the tok, one and then the other, then all of it, and the horns come out one at a time. */
const touchedSnail: Cell = { ...touched('snail'), pose: (s) => ({ ...touched('snail').pose(s), hornA: s < HORNS.first ? 1 - smooth(s, 0, HORNS.pulls) : smooth(s, HORNS.first, HORNS.first + HORNS.takes), hornB: s < HORNS.second ? 1 - smooth(s, HORNS.in, HORNS.in + HORNS.pulls) : smooth(s, HORNS.second, HORNS.second + HORNS.takes) }) }
export const TOUCHED: Readonly<Record<ThingId, Cell>> = { worm: touched('worm'), snail: touchedSnail, feather: touched('feather'), acorn: touched('acorn'), button: touched('button'), apple: touched('apple') }

/** Set down before the hedgehog while he is unrolled. The worm's is a scene, and its pose is here too. */
export const BEFORE_HOG: Readonly<Record<ThingId, Cell>> = {
  // It lies there while he snuffles, then dives into the ground between his paws.
  worm: { length: 4.2, cues: [], pose: (s) => { const dive = smooth(s, 1.4, 1.9); return { ...down(s), turn: Math.sin(s * 9) * 0.2 * (1 - dive), sy: (1 - 0.8 * dive) * (1 + 0.08 * Math.sin(s * 9)), dy: 26 * dive, show: s >= 1.9 ? 0 : 1 } } },
  // He rolls it about with his nose like a ball, loses it, and it rolls back to him.
  snail: { length: 2.4, cues: one('hogSnail'), pose: (s) => { const out = 150 * smooth(s, 0.3, 1.3) * (1 - smooth(s, 1.5, 2.1)); return { ...down(s), dx: out, turn: out / 27, own: s > 0.25 && s < 2.2 ? 1 : 0 } } },
  // The sneeze blows it up into the air, and it comes down where it lay.
  feather: { length: 2, cues: one('hogFeather'), pose: (s) => { const up = hump(s, 1.1, 2); return { ...down(s), dy: -170 * up, dx: Math.sin(span(s, 1.1, 2) * TAU * 1.5) * 34 * up, turn: span(s, 1.1, 2) * TAU * (1 - span(s, 1.7, 2)) } } },
  // Bitten, too hard, his teeth judder on it, and he bats it away: it rolls off and back.
  acorn: { length: 2.2, cues: one('hogAcorn'), pose: (s) => { const away = 120 * smooth(s, 1.1, 1.5) * (1 - smooth(s, 1.6, 2.1)); return { ...down(s), dx: away + (s > 0.56 && s < 0.92 ? Math.sin(s * 74) * 3 : 0), sy: 1 - 0.14 * hump(s, 0.36, 0.52), turn: away / 24 } } },
  // He pats it, and it flips.
  button: { length: 2, cues: one('hogButton'), pose: (s) => ({ ...down(s), dy: -40 * hump(s, 1.3, 1.8), sx: s > 1.3 && s < 1.8 ? Math.cos(span(s, 1.3, 1.8) * TAU * 1.5) : 1, own: Math.max(hump(s, 0.25, 0.7), hump(s, 1.7, 2)) }) },
  // He rolls onto it, and it is stuck on his spines.
  apple: { length: 2.6, cues: one('hogApple'), pose: (s) => { const q = thud(s, 0.6, 0.18); return { ...still(), go: smooth(s, 0.45, 0.62), sx: 1 + q, sy: 1 - q, turn: 0.5 * smooth(s, 0.45, 0.62) } } },
}

/** Brought to him while he is a ball: he stays a ball, and the thing does its own act on the ball. */
export const ON_BALL: Readonly<Record<Exclude<ThingId, 'worm'>, Cell>> = {
  // It climbs up, squelch by squelch, and sits on top of him like a hat.
  snail: { length: 2.6, cues: one('ballSnail'), pose: (s) => { const step = Math.min(3.999, Math.max(0, (s - 0.3) / 0.6)), k = Math.floor(step); return { ...still(), go: s < 0.3 ? 0 : (k + ease((step - k) * 1.6)) / 4, sy: 1 + 0.16 * Math.abs(Math.sin(step * Math.PI)), sx: 1 - 0.1 * Math.abs(Math.sin(step * Math.PI)) } } },
  // It sticks on a spine like a flag, and shakes with the ball's giggles.
  feather: { length: 1.6, cues: one('ballFeather'), pose: (s) => ({ ...still(), go: smooth(s, 0, 0.2), turn: -0.9 * smooth(s, 0, 0.25) + (s > 0.4 && s < 1.4 ? Math.sin(s * 52) * 0.16 : 0) }) },
  // It bounces off his spines high into the air and lands.
  acorn: { length: 1.4, cues: one('ballAcorn'), pose: (s) => { const q = thud(s, 1.1, 0.16); return { ...still(), go: smooth(s, 0.15, 1.1), dy: -230 * hump(s, 0.15, 1.1), turn: span(s, 0.15, 1.1) * TAU * 2, sx: 1 + q, sy: 1 - q } } },
  // It lies and glints, and one eye opens between the spines to look at it.
  button: { length: 1.6, cues: one('ballButton'), pose: (s) => ({ ...down(s), own: hump(s, 0.4, 1.3) }) },
  // It is stuck on the ball as it is on his back.
  apple: { length: 0.8, cues: one('ballApple'), pose: (s) => { const q = thud(s, 0.25, 0.2); return { ...still(), go: smooth(s, 0, 0.25), sx: 1 + q, sy: 1 - q, turn: 0.5 * smooth(s, 0, 0.25) } } },
}

/** Put down on the open path. The button is not here: the jay takes it. */
export const ON_PATH: Readonly<Record<Exclude<ThingId, 'button'>, Cell>> = {
  // Inches along in four humps and tucks its head in.
  worm: { length: 2.6, cues: one('pathWorm'), pose: (s) => { const step = Math.min(3.999, Math.max(0, (s - 0.2) / 0.5)), k = Math.floor(step), h = Math.sin((step - k) * Math.PI); return { ...still(), go: (k + ease(step - k)) / 4, sx: 1 - 0.24 * h, sy: 1 + 0.3 * h, own: h * 0.4, turn: smooth(s, 1.5, 2.2) } } },
  // Glides along, leaving a silver trail.
  snail: { length: 4, cues: one('pathSnail'), pose: (s) => ({ ...still(), go: smooth(s, 0.2, 1.4), sx: 1 + 0.06 * Math.sin(s * 10) * (1 - span(s, 1.2, 1.4)), own: s > 2.1 && s < 3.2 ? 1 : 0 }) },
  // Tumbles along on its own wind, and stops.
  feather: { length: 2.8, cues: one('pathFeather'), pose: (s) => ({ ...still(), go: smooth(s, 0.1, 1.2), turn: span(s, 0.1, 1.2) * TAU * 2, dy: -34 * Math.abs(Math.sin(span(s, 0.1, 1.2) * Math.PI * 3)) }) },
  // Rolls down the slope into the dip, and hops when the jay raps it.
  acorn: { length: 3.2, cues: one('pathAcorn'), pose: (s) => { const u = span(s, 0.1, 1), q = thud(s, 1, 0.12); return { ...still(), go: u * u, turn: u * u * TAU * 2, sx: 1 + q, sy: 1 - q, dy: -16 * hump(s, 2, 2.25) } } },
  // Rolls heavily against the log, and turns under the jay's feet.
  apple: { length: 4.2, cues: one('pathApple'), pose: (s) => { const u = span(s, 0.1, 1.1), q = thud(s, 1.1, 0.16); return { ...still(), go: u * u * (3 - 2 * u), turn: u * TAU + span(s, 2, 3) * TAU * 1.5, sx: 1 + q, sy: 1 - q } } },
}

/** Set on the toad's stone: what the thing does there while he leaps away. */
export const ON_STONE: Readonly<Record<ThingId, Cell>> = {
  // Stretches out full length on the warm stone.
  worm: { length: 4, cues: one('stoneWorm'), pose: (s) => { const long = smooth(s, 2, 2.6) * (1 - smooth(s, 3.2, 3.8)); return { ...down(s), sx: 1 + 0.4 * long, sy: 1 - 0.3 * long } } },
  // Sets off round the rim of the stone.
  snail: { length: 4, cues: one('stoneSnail'), pose: (s) => { const round = span(s, 1.8, 3.6) * TAU; return { ...down(s), dx: Math.sin(round) * 26, dy: (Math.cos(round) - 1) * 9 } } },
  // Stands on the stone like a plume.
  feather: { length: 4, cues: one('stoneFeather'), pose: (s) => ({ ...down(s), turn: -0.95 * smooth(s, 0.3, 0.8) + Math.sin(s * 3) * 0.06 }) },
  // Rocks when his knuckle knocks on it, twice.
  acorn: { length: 4, cues: one('stoneAcorn'), pose: (s) => ({ ...down(s), turn: 0.3 * (Math.exp(-7 * Math.max(0, s - 0.5)) * (s >= 0.5 ? Math.sin((s - 0.5) * 30) : 0) + Math.exp(-7 * Math.max(0, s - 0.85)) * (s >= 0.85 ? Math.sin((s - 0.85) * 30) : 0)) }) },
  // Glints at him.
  button: { length: 4, cues: one('stoneButton'), pose: (s) => ({ ...down(s), own: hump(s, 0.3, 1), sx: 1 - 0.3 * hump(s, 0.3, 0.6) }) },
  // Too heavy: it comes down on the bare half and the stone tips.
  apple: { length: 2.6, cues: one('stoneApple'), pose: (s) => { const q = thud(s, 0.3, 0.24); return { ...still(), go: smooth(s, 0, 0.3), sx: 1 + q, sy: 1 - q, dy: 6 * smooth(s, 0.3, 0.5) * (1 - smooth(s, 1.4, 1.9)) } } },
}

/** Set in the puddle, or in the bowl on the table. */
export const IN_WATER: Readonly<Record<ThingId, Cell>> = {
  // Swims across in S-curves, climbs out on the far bank and shakes itself.
  worm: { length: 3, cues: one('waterWorm'), pose: (s) => { const swim = 1 - span(s, 1.6, 1.9); return { ...still(), go: smooth(s, 0.2, 1.9), dy: Math.sin(s * 9) * 9 * swim * span(s, 0, 0.3), turn: Math.cos(s * 9) * 0.5 * swim, dx: s > 2.3 && s < 2.7 ? Math.sin(s * 80) * 4 : 0 } } },
  // Will not go under: it sails a slow circle.
  snail: { length: 3.2, cues: one('waterSnail'), pose: (s) => { const round = span(s, 0.5, 2.9) * TAU; return { ...still(), go: smooth(s, 0, 0.4), dx: Math.sin(round) * 24, dy: (Math.cos(round) - 1) * 8 } } },
  // Turns into the wind and glides across with a wake.
  feather: { length: 2.2, cues: one('waterFeather'), pose: (s) => ({ ...still(), go: smooth(s, 0, 0.3), dx: -44 * (1 - smooth(s, 0.1, 1.4)) * span(s, 0, 0.1) + 6 * Math.sin(s * 5) * span(s, 1.4, 1.6), turn: -0.5 * smooth(s, 0.1, 0.5) + 0.5 * smooth(s, 1.4, 2) }) },
  // Plops, sinks, and bobs up without its cap, which floats beside it.
  acorn: { length: 2, cues: one('waterAcorn'), pose: (s) => { const under = smooth(s, 0.15, 0.5) * (1 - smooth(s, 0.7, 0.95)); return { ...still(), go: smooth(s, 0, 0.15), dy: 18 * under + 3 * Math.sin(s * 8) * span(s, 0.95, 1.2), show: 1 - 0.7 * under, own: s >= 0.7 ? 1 : 0, capX: 38 * smooth(s, 0.7, 1.4), capY: 14 * smooth(s, 0.7, 1.4) } } },
  // Sinks and lies glinting on the bottom.
  button: { length: 1.2, cues: one('waterButton'), pose: (s) => { const sunk = smooth(s, 0.2, 1); return { ...still(), go: smooth(s, 0, 0.12), dy: 8 * sunk, sx: (1 - 0.14 * sunk) * Math.cos(span(s, 0.1, 0.9) * TAU), sy: 1 - 0.14 * sunk, show: 1 - 0.3 * sunk, own: hump(s, 0.9, 1.2) } } },
  // A big splash; it bobs and turns stalk up.
  apple: { length: 2.2, cues: one('waterApple'), pose: (s) => ({ ...still(), go: smooth(s, 0, 0.15), dy: 14 * Math.exp(-2.4 * Math.max(0, s - 0.15)) * Math.cos(9 * Math.max(0, s - 0.15)) * (s >= 0.15 ? 1 : 0), turn: 0.7 * (1 - smooth(s, 0.2, 1.6)) * span(s, 0, 0.15) }) },
}

/** How each thing rests in the water once its act is over. */
export function afloat(thing: ThingId, time: number): Go {
  const bob = Math.sin(time * 1.7 + thing.length) * 2
  if (thing === 'acorn') return { ...still(), dy: bob, own: 1, capX: 38, capY: 14 + bob * 0.6 }
  if (thing === 'button') return { ...still(), dy: 8, sx: 0.86, sy: 0.86, show: 0.7, own: 0.25 + 0.25 * Math.sin(time * 2.3) }
  return { ...still(), dy: bob, turn: thing === 'feather' ? Math.sin(time * 0.9) * 0.08 : 0 }
}

/**
 * The jay's theft: the thing lies where it was let go until he snatches it, rides in his beak, and is in the nest
 * when the act is over. `held` is how far it is in his beak; the rest is how it hangs there.
 */
export const STOLEN: Readonly<Record<ThingId, Cell>> = {
  button: { length: 5, cues: one('stealButton'), pose: (s) => ({ ...still(), held: smooth(s, 1.5, 1.62), own: s > 1.5 ? 0.5 + 0.5 * Math.sin(s * 14) : 0 }) },
  // It knots itself round his beak as he flies.
  worm: { length: 5, cues: one('stealWorm'), pose: (s) => ({ ...still(), held: smooth(s, 1.5, 1.62), own: smooth(s, 1.55, 1.9), turn: s > 1.6 ? (s - 1.6) * 5 : 0, sx: 1 - 0.3 * smooth(s, 1.55, 1.9), sy: 1 - 0.3 * smooth(s, 1.55, 1.9) }) },
  // Carried by its shell, peering down over the edge.
  snail: { length: 5, cues: one('stealSnail'), pose: (s) => ({ ...still(), held: smooth(s, 1.5, 1.62), dy: 22 * smooth(s, 1.55, 1.9), turn: 0.6 * smooth(s, 1.6, 2) + Math.sin(s * 4) * 0.12 * span(s, 1.9, 2.1), own: s > 1.45 && s < 1.9 ? 1 : 0 }) },
  // Wet, it droops from his beak and slaps at each beat.
  feather: { length: 5, cues: one('stealFeather'), pose: (s) => ({ ...still(), held: smooth(s, 1.5, 1.62), turn: 1.3 * smooth(s, 1.55, 1.8) + 0.5 * Math.max(hump(s, 2, 2.2), hump(s, 2.5, 2.7), hump(s, 3, 3.2)), dy: 16 * smooth(s, 1.55, 1.8) }) },
  // It slips out twice before he gets it home.
  acorn: { length: 5.4, cues: one('stealAcorn'), pose: (s) => { const held = s < 1.9 ? smooth(s, 1.5, 1.62) : s < 2.3 ? 1 - smooth(s, 1.9, 2.02) : s < 2.7 ? smooth(s, 2.3, 2.42) : s < 3.1 ? 1 - smooth(s, 2.7, 2.82) : smooth(s, 3.1, 3.22); return { ...still(), held, turn: (1 - held) * Math.sin(s * 20) * 0.3 } } },
  // Too heavy: dragged a hand's width, and left.
  apple: { length: 4.4, cues: one('stealApple'), pose: (s) => { const q = thud(s, 3.3, 0.14); return { ...still(), go: smooth(s, 1.6, 3.2), dy: -8 * Math.abs(Math.sin(s * 15.7)) * span(s, 1.6, 1.7) * (1 - span(s, 3.1, 3.3)), turn: Math.sin(s * 15.7) * 0.12 * span(s, 1.6, 1.7) * (1 - span(s, 3.1, 3.3)), sx: 1 + q, sy: 1 - q } } },
}

/** When in a theft the thing is dropped into the nest, in seconds: from then it is drawn in the nest. */
export const NESTED: Readonly<Record<ThingId, number>> = { button: 3.4, worm: 3.4, snail: 3.4, feather: 3.4, acorn: 4.3, apple: Infinity }

// --- Two things set together on the table ---------------------------------------

/** What the two of a pair do: the pose of the first and of the second of its name. `side` is 1 when the second lies to the right of the first. */
export type Pair = { length: number; cues: readonly Cue[]; pose: (s: number, side: number) => readonly [Go, Go] }

const D = PAIR_GAP

export const PAIRED: Readonly<Record<PairId, Pair>> = {
  // The worm coils round the shell like a ribbon, and the snail looks at it over the top.
  'worm+snail': { length: 1.8, cues: one('worm+snail'), pose: (s, side) => { const on = smooth(s, 0, 0.5); return [{ ...still(), dx: side * D * on, dy: -6 * on, turn: smooth(s, 0.2, 1.2) * TAU, sx: 1 - 0.1 * on, sy: 1 - 0.45 * on, own: on }, { ...still(), dy: -5 * hump(s, 1.3, 1.6), turn: -0.12 * side * smooth(s, 1.2, 1.5) }] } },
  // The feather tickles and the worm wriggles in giggling zigzags.
  'worm+feather': { length: 1.6, cues: one('worm+feather'), pose: (s, side) => { const env = hump(s, 0, 1.6); return [{ ...still(), dy: Math.sin(s * 48) * 9 * env, turn: Math.sin(s * 24) * 0.4 * env }, { ...still(), dx: -side * D * 0.4 * smooth(s, 0, 0.2), turn: Math.sin(s * 16) * 0.5 * env - side * 0.3 }] } },
  // The worm threads through the cap and wears it as a hat.
  'worm+acorn': { length: 1.4, cues: one('worm+acorn'), pose: (s, side) => { const up = smooth(s, 0.5, 0.95); return [{ ...still(), dx: side * D * 0.35 * smooth(s, 0, 0.5), dy: -10 * up, sy: 1 + 0.16 * up }, { ...still(), own: up, capX: (33 - side * D * 0.65) * up, capY: -22 * up - 12 * hump(s, 0.9, 1.2) }] } },
  // The worm goes through the button's two holes like a thread, in and out.
  'worm+button': { length: 1.6, cues: one('worm+button'), pose: (s, side) => { const on = smooth(s, 0, 0.3); return [{ ...still(), dx: side * (D * on + 22 * Math.sin(span(s, 0.3, 1.5) * TAU) * (1 - span(s, 1.4, 1.6))), sy: 1 - 0.5 * on, own: 0 }, { ...still(), own: hump(s, 0.3, 0.6) }] } },
  // The worm bores in at one side and looks out at the other.
  'worm+apple': { length: 2, cues: one('worm+apple'), pose: (s, side) => { const through = smooth(s, 1.45, 1.6), munch = Math.max(hump(s, 0.3, 0.5), hump(s, 0.7, 0.9)); return [{ ...still(), dx: side * (D * 0.5 * smooth(s, 0, 0.3) + D * 0.5 * smooth(s, 0.3, 1.4) + 30 * through), sx: 1 - 0.55 * smooth(s, 0.3, 1.4) + 0.2 * through, show: 1 }, { ...still(), sx: 1 + 0.08 * munch, sy: 1 - 0.08 * munch }] } },
  // The snail carries the feather upright on its shell like a sail, dips under it as it lands, and glides a hand's width.
  'snail+feather': { length: 2.2, cues: one('snail+feather'), pose: (s, side) => { const on = smooth(s, 0, 0.35), go = smooth(s, 0.4, 2); return [{ ...still(), go, sy: 1 - 0.08 * hump(s, 0.25, 0.7) }, { ...still(), go, dx: -side * (D + 6) * on, dy: -38 * on, turn: -0.95 * on + Math.sin(s * 5) * 0.06 }] } },
  // The snail climbs on top and the acorn rolls under it, slowly, the snail keeping its feet.
  'snail+acorn': { length: 2.4, cues: one('snail+acorn'), pose: (s, side) => { const on = smooth(s, 0, 0.4), roll = Math.sin(span(s, 0.4, 2.3) * TAU) * 12; return [{ ...still(), dx: side * D * on + roll * 0.5, dy: -48 * on, turn: -roll * 0.02 }, { ...still(), dx: roll * 0.5, turn: span(s, 0.4, 2.3) * TAU, own: 0 }] } },
  // The snail looks at itself in the button, and its horns go in and out.
  'snail+button': { length: 2, cues: one('snail+button'), pose: (s) => [{ ...still(), hornA: 1 - hump(s, 0.92, 1.3), hornB: 1 - hump(s, 1.32, 1.7), sy: 1 + 0.06 * hump(s, 0.2, 0.6) }, { ...still(), own: hump(s, 0.15, 0.8) }] },
  // The snail eats a hole in the apple, in three rasps.
  'snail+apple': { length: 2, cues: one('snail+apple'), pose: (s, side) => { const rasp = Math.max(hump(s, 0.4, 0.6), hump(s, 0.85, 1.05), hump(s, 1.3, 1.5)); return [{ ...still(), dx: side * (D * 0.3 * smooth(s, 0, 0.3) + 7 * rasp), sx: 1 + 0.06 * rasp }, { ...still(), dx: side * 3 * rasp, turn: side * 0.05 * rasp }] } },
  // The feather stands in the acorn's cap and sways.
  'feather+acorn': { length: 1.8, cues: one('feather+acorn'), pose: (s, side) => { const in_ = smooth(s, 0, 0.3); return [{ ...still(), dx: side * D * in_, dy: -44 * in_, turn: -0.95 * in_ + Math.sin(s * 3.5) * 0.22 * in_ }, still()] } },
  // The feather sweeps the button and it flashes.
  'feather+button': { length: 1.4, cues: one('feather+button'), pose: (s, side) => [{ ...still(), dx: side * (D * 0.6 * smooth(s, 0, 0.2) + 26 * Math.sin(span(s, 0.2, 0.8) * Math.PI) - D * 0.3 * smooth(s, 0.9, 1.3)), turn: side * 0.7 * hump(s, 0.1, 0.9), dy: -8 * hump(s, 0.1, 0.9) }, { ...still(), own: hump(s, 0.75, 1.3) }] },
  // The feather sticks in the apple like a plume in a hat, and the apple wobbles under it.
  'feather+apple': { length: 1.6, cues: one('feather+apple'), pose: (s, side) => { const in_ = smooth(s, 0, 0.3), wobble = s < 0.3 ? 0 : Math.sin((s - 0.3) * 17) * 0.2 * Math.exp(-2.6 * (s - 0.3)); return [{ ...still(), dx: side * D * in_ + wobble * 40, dy: -50 * in_, turn: -0.95 * in_ + wobble }, { ...still(), turn: wobble }] } },
  // The acorn spins on the button like a top, and falls over.
  'acorn+button': { length: 2.2, cues: one('acorn+button'), pose: (s, side) => { const on = smooth(s, 0, 0.2), spin = span(s, 0.2, 1.7), over = smooth(s, 1.7, 1.85); return [{ ...still(), dx: side * D * on, dy: -14 * on + 10 * over, sx: over >= 1 ? 1 : Math.cos(spin * spin * 60), turn: 1.45 * side * over }, { ...still(), own: 0.4 * hump(s, 0.2, 1.7) }] } },
  // They roll together and knock, and the acorn bounces off and rolls back.
  'acorn+apple': { length: 1.8, cues: one('acorn+apple'), pose: (s, side) => { const meet = smooth(s, 0.2, 0.5), off = hump(s, 0.5, 1.6); return [{ ...still(), dx: side * (D * 0.22 * meet * (1 - span(s, 0.5, 0.6)) - D * 0.9 * off), dy: -30 * hump(s, 0.5, 1), turn: -side * off * 5 }, { ...still(), dx: -side * D * 0.2 * meet * (1 - smooth(s, 0.5, 1.2)), turn: -side * 0.3 * meet * (1 - smooth(s, 0.5, 1.2)) }] } },
  // The apple rolls over the edge of the button and flicks it into the bowl.
  'button+apple': { length: 1.8, cues: one('button+apple'), pose: (s, side) => { const fly = span(s, 0.6, 1.4); return [{ ...still(), go: fly, dy: -150 * Math.sin(fly * Math.PI), sx: s > 0.6 && s < 1.4 ? Math.cos(fly * TAU * 3) : 1, own: hump(s, 0.5, 0.8) }, { ...still(), dx: -side * D * 0.5 * smooth(s, 0.1, 0.6) * (1 - smooth(s, 0.9, 1.6)), turn: -side * 1.2 * smooth(s, 0.1, 0.6) * (1 - smooth(s, 0.9, 1.6)) }] } },
}

/** How far the snail and the feather glide together. */
export const SAIL = D
