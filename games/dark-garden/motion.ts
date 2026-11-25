import type { Carrier } from './cast'

// How each carrier moves: a gait, a breath, a way of being touched and a way
// home of its own. Numbers only; walkers.ts maps them onto glass.

export type Pose = {
  lift: number
  turn: number
  squash: number
  /** Each foot: forward (-1..1) and up (0..1). */
  left: { x: number; up: number }
  right: { x: number; up: number }
  /** How far the hands with the apple are up and forward. */
  hands: number
  /** The funniest part: hat, neck, ears, belly. */
  part: number
  mouth: number
  eyes: number
}

export function rest(): Pose {
  return { lift: 0, turn: 0, squash: 1, left: { x: 0, up: 0 }, right: { x: 0, up: 0 }, hands: 0, part: 0, mouth: 0, eyes: 1 }
}

const hump = (p: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, p)))

/** Stride lengths in units walked; no two are alike. */
export const STRIDE: Readonly<Record<Carrier, number>> = { gnome: 124, goose: 92, hare: 210, bear: 170 }
/** Breaths a second over two pi, and seconds between blinks. */
const LIFE: Readonly<Record<Carrier, { breath: number; blink: number }>> = { gnome: { breath: 2.1, blink: 3.7 }, goose: { breath: 3.1, blink: 2.3 }, hare: { breath: 5.2, blink: 4.6 }, bear: { breath: 1.2, blink: 5.9 } }

export function move(who: Carrier, o: { walked: number; speed: number; time: number; squash: number; hop: number; /** Seconds since its candle caught, and how far it is in setting its apple down, 0..1. */ caught?: number; setting?: number }, pose: Pose): Pose {
  const go = Math.min(1, o.speed / 420), p = (o.walked / STRIDE[who]) * Math.PI * 2, s = Math.sin(p), c = Math.cos(p), life = LIFE[who]
  pose.lift = 0; pose.turn = 0; pose.hands = 0; pose.mouth = 0
  const breath = Math.sin(o.time * life.breath)
  pose.squash = 1 + breath * 0.014
  pose.part = breath * 0.4
  const b = (o.time + life.blink * 0.4) % life.blink
  pose.eyes = b < 0.13 ? 0.05 : 1
  pose.left.x = s * go; pose.left.up = Math.max(0, c) * go
  pose.right.x = -s * go; pose.right.up = Math.max(0, -c) * go
  if (who === 'gnome') {
    // Every fifth step he trips over his own beard.
    const trip = hump((((o.walked / 62) % 5) - 4)) * go
    pose.lift = Math.abs(s) * 9 * go
    pose.turn = s * 0.1 * go + trip * 0.34
    pose.part += s * 1.2 * go + trip * 2
    pose.mouth = trip
    pose.squash -= trip * 0.1
  } else if (who === 'goose') {
    pose.turn = s * 0.24 * go
    pose.lift = Math.abs(c) * 4 * go
    pose.part += Math.cos(p * 2) * 1.1 * go
    pose.mouth = Math.max(0, Math.sin(o.time * 0.7) - 0.93) * 8
  } else if (who === 'hare') {
    const hop = Math.max(0, Math.sin(p)) * go
    pose.lift = hop * 46
    pose.left.x = pose.right.x = Math.cos(p) * go
    pose.left.up = pose.right.up = hop
    pose.squash += hop * 0.12 - Math.max(0, -Math.sin(p)) * 0.14 * go
    pose.part += -Math.cos(p) * 1.6 * go + (Math.sin(o.time * 1.3) > 0.9 ? Math.sin(o.time * 30) * 0.6 : 0)
  } else {
    // On the tips of its toes, and only its feet hurry.
    pose.lift = (7 + Math.abs(s) * 5) * go
    pose.squash += 0.05 * go
    pose.turn = Math.sin(p * 0.5) * 0.05 * go
    pose.hands = 0.5 * go
    pose.part += Math.abs(s) * go
  }
  // Touched: each in its own way.
  const q = o.squash, shake = Math.sin(q * 19) * q
  if (q > 0.01) {
    if (who === 'gnome') { pose.squash -= hump(q) * 0.16; pose.part += shake * 3; pose.mouth = Math.max(pose.mouth, hump(q)) }
    else if (who === 'goose') { pose.squash += hump(q) * 0.1; pose.part += hump(q) * 4; pose.mouth = hump(q) * 1.2 }
    else if (who === 'hare') { pose.lift += hump(q) * 34; pose.part += hump(q) * 3; pose.eyes = 1.2 }
    else { pose.squash -= hump(q) * 0.07; pose.mouth = hump(q) * 1.3; pose.eyes = Math.min(pose.eyes, 1 - hump(q)) ; pose.turn += shake * 0.04 }
  }
  if (o.hop > 0.01) {
    const n = who === 'gnome' ? 2 : who === 'goose' ? 3 : who === 'hare' ? 1 : 1.5
    pose.lift += Math.abs(Math.sin(o.hop * Math.PI * n)) * (who === 'hare' ? 60 : who === 'bear' ? 14 : 28)
    if (who === 'goose') pose.part += Math.sin(o.hop * 25) * 2
    if (who === 'bear') pose.turn += Math.sin(o.hop * 12) * 0.1
    if (who === 'gnome') pose.part += Math.sin(o.hop * 20) * 2
  }
  // The candle catches: a sneeze, a look the other way, a jump back, a huff.
  const c2 = (o.caught ?? 9) / 0.7
  if (c2 < 1) {
    const n = hump(c2)
    if (who === 'gnome') { pose.turn += c2 < 0.45 ? -hump(c2 / 0.45) * 0.28 : hump((c2 - 0.45) / 0.55) * 0.42; pose.mouth = n; pose.eyes = 0.05; pose.part += n * 2 }
    else if (who === 'goose') { pose.turn -= n * 0.2; pose.part += n * 3 }
    else if (who === 'hare') { pose.lift += n * 58; pose.turn -= n * 0.3; pose.eyes = 1.25; pose.part += n * 3 }
    else { pose.squash += n * 0.07; pose.mouth = n; pose.lift += n * 3 }
  }
  // Setting it down: pats, a turn just so, a drop and a catch, two careful claws.
  const d = o.setting ?? 0
  if (d > 0) {
    const n = hump(d)
    if (who === 'gnome') { pose.hands = -1.6 * Math.abs(Math.sin(d * Math.PI * 3)); pose.turn += n * 0.18; pose.part += Math.sin(d * 19) }
    else if (who === 'goose') { pose.turn += n * 0.26 + Math.sin(d * 25) * 0.05 * n; pose.hands = -n }
    else if (who === 'hare') { pose.hands = d < 0.5 ? -hump(d * 2) * 3 : hump(d * 2 - 1) * 2.4; pose.lift += hump(d * 2 - 1) * 26; pose.eyes = 1.25 }
    else { pose.squash -= n * 0.16; pose.hands = -n * 1.5; pose.eyes = 0.4 }
  }
  return pose
}

/** The turn of the body on the way home: somersault, flapping level, forward bounds, a roll. */
export function homeTurn(who: Carrier, t: number): number {
  if (who === 'gnome') return t * Math.PI * 2
  if (who === 'goose') return Math.sin(t * 26) * 0.16
  if (who === 'hare') return Math.sin(t * Math.PI * 2) * 0.4
  return -t * Math.PI * 4
}
