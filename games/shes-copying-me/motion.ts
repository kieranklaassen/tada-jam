import { bump, clamp, jolt } from './silk'
import type { Antic, Coat, Guest, Mood } from './rules'

// How each guest moves. An antic is what a body does when something happens
// to it; the personality is how that particular body does it, at its own
// tempo and weight, and with its own idle life. Numbers only.

export type Pose = {
  x: number
  y: number
  turn: number
  sx: number
  sy: number
  /** -1 furious, 0 plain, 1 delighted. */
  mouth: number
  /** How far the mouth is open, 0 to 1. */
  open: number
  eyes: number
  brow: number
  /** The part that is this guest's own: moustache, ears, neck, snout. */
  part: number
  blush: number
}

type Nature = { tempo: number; heavy: number; sway: number; breath: number; part: number }

export const NATURE: Record<Guest, Nature> = {
  walrus: { tempo: 0.7, heavy: 0.6, sway: 0.012, breath: 0.02, part: 0.5 },
  dog: { tempo: 1.6, heavy: 1.25, sway: 0.02, breath: 0.034, part: 1.4 },
  goose: { tempo: 1.05, heavy: 0.9, sway: 0.03, breath: 0.014, part: 1 },
  pig: { tempo: 1.3, heavy: 1.1, sway: 0.016, breath: 0.03, part: 0.8 },
}

type Move = (t: number) => Partial<Pose>

const squash = (a: number): Partial<Pose> => ({ sx: 1 + a, sy: 1 - a })

/** Seconds an antic's body movement lasts at tempo 1. */
export const ANTIC_SECONDS = 1.5

const MOVES: Record<Antic, Move> = {
  drip: (t) => ({ ...squash(jolt(t, 14, 3) * 0.1), brow: 0.6 * bump(t) }),
  glop: (t) => ({ ...squash(0.2 * bump(t / 1.4)), eyes: 1 - bump(t / 1.2) * 0.9 }),
  nose: (t) => ({ turn: -0.12 * clamp(t * 3) + jolt(t - 0.8, 24, 5) * 0.2, y: -18 * bump((t - 0.75) * 3) }),
  puff: (t) => ({ sx: 1 + 0.3 * bump(t / 1.2), sy: 1 + 0.3 * bump(t / 1.2), y: -10 * bump(t) }),
  wobble: (t) => ({ turn: jolt(t, 16, 2.6) * 0.22 }),
  onEnd: (t) => ({ sy: 1 + 0.34 * Math.exp(-t * 2.6), sx: 1 - 0.18 * Math.exp(-t * 2.6), y: -30 * bump(t * 2) }),
  puddle: (t) => ({ ...squash(0.24 * bump(t / 1.3)), y: 6 * bump(t / 1.3) }),
  slide: (t) => ({ x: jolt(t, 7, 2) * 34, turn: jolt(t, 7, 2) * 0.1 }),
  clump: (t) => ({ turn: Math.sin(t * 30) * 0.06 * clamp(1.2 - t), y: -8 * bump(t) }),
  dry: (t) => ({ sx: 1 + jolt(t, 18, 2.4) * 0.14 + 0.1 * bump(t), sy: 1 + jolt(t + 0.1, 18, 2.4) * 0.14 + 0.1 * bump(t) }),
  shake: (t) => ({ turn: Math.sin(t * 34) * 0.16 * clamp(1.1 - t), sx: 1 + Math.sin(t * 34) * 0.05 * clamp(1.1 - t) }),
  spray: (t) => ({ x: 30 * Math.exp(-t * 3) * (t > 0 ? 1 : 0), turn: 0.26 * Math.exp(-t * 3) }),
  wash: (t) => ({ ...squash(jolt(t, 9, 2.4) * 0.16), turn: jolt(t, 5, 2) * 0.1 }),
  thicken: (t) => ({ ...squash(0.3 * bump(t / 1.5)) }),
  stick: (t) => ({ y: -22 * bump((t * 2) % 1) * clamp(1.4 - t), turn: jolt(t, 12, 2) * 0.12 }),
  set: (t) => ({ sy: 1 + 0.12 * bump(t), turn: -0.06 * bump(t), eyes: 1.3 }),
  stretch: (t) => ({ x: -70 * bump(clamp(t / 0.9)) + jolt(t - 0.85, 24, 4) * 34, sx: 1 + 0.5 * bump(clamp(t / 0.9)), sy: 1 - 0.16 * bump(clamp(t / 0.9)) }),
  blow: (t) => ({ sx: 1 - 0.1 * bump(t), sy: 1 - 0.1 * bump(t), y: -26 * clamp(t) * bump(clamp(t / 1.5)) }),
  rinse: (t) => ({ sy: 1 - 0.2 * bump(t), turn: jolt(t, 10, 3) * 0.16 }),
  bigger: (t) => ({ sx: 1 + 0.3 * bump(t / 1.5), sy: 1 + 0.16 * bump(t / 1.5) }),
  layer: (t) => ({ sx: 1 + 0.16 * bump(t / 1.2), turn: Math.sin(t * 14) * 0.08 * clamp(1.3 - t) }),
  flap: (t) => ({ y: -118 * bump(t / 1.45), turn: Math.sin(t * 20) * 0.16 * bump(t / 1.45), sx: 1 + 0.16 * Math.abs(Math.sin(t * 22)) * bump(t / 1.45) }),
  burst: (t) => ({ sx: 1 + 0.4 * Math.exp(-t * 6) * jolt(t, 30, 1), sy: 1 + 0.3 * Math.exp(-t * 6), y: -24 * bump(t * 1.6) }),
  crow: (t) => ({ sy: 1 + 0.24 * bump(t / 1.3), turn: -0.2 * bump(t / 1.3), open: bump(t / 1.2) }),
  flatten: (t) => ({ ...squash(0.34 * Math.exp(-t * 2)) }),
  paste: (t) => ({ ...squash(0.14 * bump(t)), turn: -0.14 * bump(t / 1.2) }),
  choke: (t) => ({ y: -10 * bump((t * 3) % 1) * clamp(1 - t), turn: 0.2 * jolt(t - 0.6, 20, 4) }),
  rounder: (t) => ({ sx: 1 + 0.44 * bump(t / 1.5), sy: 1 + 0.2 * bump(t / 1.5) }),
  deflate: (t) => ({ x: Math.sin(t * 22) * 40 * clamp(1 - t), y: -50 * bump(t), turn: Math.sin(t * 17) * 0.4 * clamp(1 - t), sx: 1.2 - 0.2 * clamp(t * 2) }),
  spin: (t) => ({ sx: Math.cos(clamp(t / 1.4) * Math.PI * 6) * 0.7 + 0.3, y: -16 * bump(t / 1.4) }),
  soften: (t) => ({ turn: 0.22 * bump(t / 1.4), ...squash(0.16 * bump(t)) }),
  coat: (t) => ({ ...squash(0.1 * bump(t)), eyes: 1 - bump(t) }),
  slip: (t) => ({ turn: 0.05 * jolt(t, 5, 1.5) }),
  rock: (t) => ({ turn: 0.26 * jolt(t, 8, 1.4) }),
  crack: (t) => ({ x: Math.sin(t * 60) * 5 * clamp(0.6 - t), sx: 1 + 0.2 * jolt(t - 0.4, 18, 3), y: -20 * bump((t - 0.4) * 2) }),
  ring: (t) => ({ x: Math.sin(t * 80) * 8 * clamp(1 - t), turn: jolt(t, 40, 3) * 0.1 }),
  roll: (t) => ({ turn: clamp(t / 1.4) >= 1 ? 0 : clamp(t / 1.4) * Math.PI * 2, x: 26 * Math.sin(clamp(t / 1.4) * Math.PI * 2) }),
  double: (t) => ({ sx: 1 - 0.14 * bump(t / 1.4), sy: 1 - 0.14 * bump(t / 1.4), x: jolt(t, 10, 2) * 14 }),
  prick: (t) => ({ y: -34 * bump(t * 1.8), sx: 1 + jolt(t, 24, 4) * 0.2 }),
  float: (t) => ({ y: -130 * bump(t / 1.5), x: 24 * Math.sin(t * 4) * bump(t / 1.5) }),
  pop: (t) => ({ y: 12 * jolt(t, 14, 3), sy: 1 - 0.3 * Math.exp(-t * 5), sx: 1 + 0.3 * Math.exp(-t * 5) }),
  bounce: (t) => ({ y: -90 * Math.abs(Math.sin(t * 5.6)) * clamp(1.4 - t) }),
}

const MOODS: Record<Mood, (t: number) => Partial<Pose>> = {
  delight: (t) => ({ mouth: 1, open: 0.5 + 0.3 * Math.sin(t * 9), eyes: 0.35, brow: 0.5, blush: 1 }),
  outrage: (t) => ({ mouth: -1, open: 0.75 + 0.25 * Math.sin(t * 22), eyes: 1.25, brow: -1 }),
  puzzled: (t) => ({ mouth: -0.2, open: 0.1, eyes: 1.2, brow: 0.9 * Math.sin(t * 3) }),
  giggle: (t) => ({ mouth: 1, open: 0.4 + 0.5 * Math.abs(Math.sin(t * 14)), eyes: 0.2, y: -5 * Math.abs(Math.sin(t * 14)), blush: 1 }),
  sneeze: (t) => ({ mouth: t < 0.9 ? -0.3 : 0, open: t < 0.9 ? 0.5 * t : t < 1.2 ? 1 : 0.1, eyes: t < 0.8 ? 0.5 : 0.1, brow: 1 }),
  sing: (t) => ({ mouth: 0.3, open: 0.8 + 0.2 * Math.sin(t * 8), eyes: 0.15, turn: -0.08 + 0.05 * Math.sin(t * 5), brow: 0.8 }),
  salute: (t) => ({ mouth: 0, open: 0, eyes: 1.2, brow: 0.5, sy: 1 + 0.06 * bump(t / 1.8) }),
  chase: (t) => ({ mouth: 0.8, open: 0.6, eyes: 1, sx: t < 1.5 ? (Math.cos(t * 9) > 0 ? 1 : -1) : 1, x: t < 1.5 ? 24 * Math.sin(t * 9) : 0 }),
  faint: (t) => ({ mouth: -0.3, open: 0.3, eyes: t < 1.3 ? 0 : 1, turn: t < 1.3 ? 0.9 * clamp(t * 4) : 0.9 * clamp(1 - (t - 1.3) * 4), y: 16 * clamp(t * 4) * clamp(1.6 - t) }),
}

export const MOOD_SECONDS = 2.3

const REST: Pose = { x: 0, y: 0, turn: 0, sx: 1, sy: 1, mouth: 0.15, open: 0, eyes: 1, brow: 0, part: 0, blush: 0 }

function lay(pose: Pose, over: Partial<Pose>): void {
  for (const key of Object.keys(over) as (keyof Pose)[]) {
    const v = over[key]!
    if (key === 'x' || key === 'y' || key === 'turn' || key === 'brow' || key === 'part') pose[key] += v
    else if (key === 'sx' || key === 'sy') pose[key] *= v
    else pose[key] = v
  }
}

/** A guest's whole body at `time`, `t` seconds into what last happened to it. */
export function guestPose(guest: Guest, coat: Coat, antic: Antic | null, mood: Mood | null, t: number, time: number): Pose {
  const nature = NATURE[guest]
  const pose: Pose = { ...REST }
  const pace = time * nature.tempo
  const stiff = coat === 'stiff' && t > 0.6
  if (!stiff) {
    pose.sy += Math.sin(pace * 2.2) * nature.breath
    pose.sx -= Math.sin(pace * 2.2) * nature.breath * 0.6
    pose.turn += Math.sin(pace * 0.9) * nature.sway
    pose.part = Math.sin(pace * 2.9) * 0.12 * nature.part
    // A blink, at each guest's own time.
    const blink = (pace * 0.31 + nature.heavy) % 1
    if (blink > 0.965) pose.eyes = 0.06
  }
  if (antic && t >= 0 && t < ANTIC_SECONDS / nature.tempo ** 0.35) {
    const own = t * nature.tempo ** 0.35
    const move = MOVES[antic](own)
    const scaled: Partial<Pose> = {}
    for (const key of Object.keys(move) as (keyof Pose)[]) {
      const v = move[key]!
      if (key === 'x' || key === 'y') scaled[key] = v * nature.heavy
      else if (key === 'turn') scaled[key] = antic === 'roll' ? v : v * nature.heavy
      else if (key === 'sx' || key === 'sy') scaled[key] = antic === 'spin' ? v : 1 + (v - 1) * nature.heavy
      else scaled[key] = v
    }
    lay(pose, scaled)
    pose.part += Math.sin(own * 18) * Math.exp(-own * 2.4) * nature.part
  }
  if (mood && t >= 0 && t < MOOD_SECONDS && !stiff) lay(pose, MOODS[mood](t))
  if (stiff) {
    pose.eyes = 1.2
    pose.mouth = -0.1
  }
  if (coat === 'puffed') {
    pose.sx *= 1.16
    pose.sy *= 1.1
  }
  if (coat === 'bubble' && t > 0.5) pose.y -= 16 + Math.sin(pace * 1.7) * 7
  if (coat === 'wet' && t > 0.4) pose.y += 2
  return pose
}
