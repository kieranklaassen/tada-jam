import type { VisitorId } from './cast'
import type { Kind } from './plants'

// How each visitor moves, as plain numbers. Nothing here draws: the garden
// says which act a visitor is playing and how far through it is, and this
// module answers with a pose for the view to map onto that visitor's parts.
// Every act has one choreography, and each visitor plays it in its own
// manner: its own tempo, its own size of gesture, its own way of arriving at
// a position, and its own body part that does the funny thing.

export type ActName =
  | 'poke' | 'lift' | 'take' | 'reach' | 'stepBack' | 'walk' | 'leave' | 'eat' | 'plain'
  | 'loves' | 'cannot' | 'stalks' | 'laugh' | 'unveil'
  | 'sniff' | 'drop'

/** What a visitor is doing: the act, the plant it is about where it has one, and how far through it is. */
export type Act = { name: ActName; plant: Kind | null; u: number; /** The aunt's stalks are of a length, so she nods. */ flag?: boolean }

export type Manner = {
  /** How long its acts take, as a factor: the goat is quick, the bee-keeper slow. */
  tempo: number
  /** How large its gestures are. */
  size: number
  /** How it gets from one position to the next: 0 to 1 in, 0 to 1 out. */
  ease(t: number): number
  /** How it walks: how many steps to the table, how high each step bobs, and how far it rolls from side to side. */
  steps: number
  bob: number
  roll: number
  /** What its special part is, for the reader of the code; the view draws it. */
  special: string
}

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const smooth = (t: number): number => t * t * (3 - 2 * t)

export const MANNER: Record<VisitorId, Manner> = {
  // Stocky and restless: it overshoots where it is going and bounces back.
  goat: { tempo: 0.85, size: 1.15, ease: (t) => { const s = clamp01(t); return 1 + 2.4 * (s - 1) ** 3 + 1.4 * (s - 1) ** 2 }, steps: 7, bob: 13, roll: 0.03, special: 'ears' },
  // Round, slow and padded: she starts late and arrives softly.
  beekeeper: { tempo: 1.25, size: 0.85, ease: (t) => smooth(smooth(clamp01(t))), steps: 4, bob: 5, roll: 0.11, special: 'veil and hat' },
  // Tall and floating: she drifts, and rises a little on the way.
  bride: { tempo: 1.1, size: 1, ease: (t) => (1 - Math.cos(clamp01(t) * Math.PI)) / 2, steps: 2, bob: -7, roll: 0.02, special: 'veil' },
  // Thin and stiff: she moves in straight lines, at one speed, and stops dead.
  aunt: { tempo: 1, size: 0.55, ease: (t) => clamp01(t), steps: 9, bob: 1.5, roll: 0, special: 'eyebrow and bun' },
}

/** Seconds each act takes before the visitor's tempo. */
const BASE: Record<ActName, number> = { poke: 0.75, lift: 0.7, take: 1.2, reach: 2, stepBack: 2.4, walk: 1.6, leave: 2.2, eat: 1.4, plain: 1, loves: 1.6, cannot: 1.8, stalks: 1.6, laugh: 2.2, unveil: 1.8, sniff: 1.3, drop: 1.9 }

/** How long an act lasts for a visitor, in seconds. */
export function lasts(who: VisitorId, name: ActName): number {
  // A walk is as long for everyone: the scene keeps its length, and the manner is in the steps.
  return name === 'walk' || name === 'leave' || name === 'reach' || name === 'stepBack' ? BASE[name] : Math.round(BASE[name] * MANNER[who].tempo * 100) / 100
}

export type Pose = {
  /** The whole figure, off its place: a hop, a step back. */
  dx: number
  dy: number
  /** 1 facing the child, -1 turned away: the width the figure is drawn at as it turns round. */
  turn: number
  /** The head, off its place on the shoulders, and its tilt in radians. */
  headX: number
  headY: number
  tilt: number
  /** Where the eyes look, -1 to 1 each way; null leaves them to the idle gaze. */
  lookX: number | null
  lookY: number | null
  /** 0 to 1 each: crossed eyes, eyes rolled up, eyes wide, eyes shut. */
  cross: number
  roll: number
  wide: number
  shut: number
  /** How far the mouth is open, 0 to 1. */
  mouth: number
  /** How far the hands or the muzzle are out to the vase, 0 to 1. */
  reach: number
  /** The visitor's own part: the goat's ears up, the bee-keeper's veil lifted, the bride's veil flown up, the aunt's eyebrow off her face. */
  special: number
  /** 0 to 1: tears standing in the eyes. */
  tears: number
  /** A colour over the face: 0 none, up to 1. */
  purple: number
}

export function neutral(): Pose {
  return { dx: 0, dy: 0, turn: 1, headX: 0, headY: 0, tilt: 0, lookX: null, lookY: null, cross: 0, roll: 0, wide: 0, shut: 0, mouth: 0, reach: 0, special: 0, tears: 0, purple: 0 }
}

/** A hump from 0 up to 1 and back to 0 between `a` and `b`. */
const hump = (u: number, a: number, b: number): number => (u <= a || u >= b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI))
/** 0 before `a`, 1 after `b`. */
const ramp = (u: number, a: number, b: number): number => clamp01((u - a) / (b - a))
/** 1 between `a` and `b`, with short ramps in and out. */
const hold = (u: number, a: number, b: number, edge = 0.08): number => Math.min(ramp(u, a, a + edge), 1 - ramp(u, b - edge, b))

/** The sneeze, which each visitor has in its own way. `at` is where in the act it goes off. */
function sneeze(who: VisitorId, pose: Pose, u: number, at: number): void {
  const before = hold(u, at - 0.22, at, 0.1), bang = hump(u, at, at + 0.22)
  pose.shut = Math.max(pose.shut, before, bang)
  pose.headY -= before * 12
  pose.tilt -= before * 0.12
  pose.mouth = Math.max(pose.mouth, bang)
  switch (who) {
    // A whole-body bleat that lifts all four hooves.
    case 'goat': pose.dy -= bang * 46; pose.headY += bang * 20; pose.special = Math.max(pose.special, bang); break
    // The hat jumps on her head.
    case 'beekeeper': pose.headY += bang * 10; pose.special = Math.max(pose.special, bang * 0.35); pose.dy -= bang * 6; break
    // The veil flies straight up.
    case 'bride': pose.headY += bang * 16; pose.special = Math.max(pose.special, ramp(u, at, at + 0.06) * (1 - ramp(u, at + 0.3, at + 0.45))); break
    // One dry twitch, which she pretends did not happen.
    case 'aunt': pose.headY += bang * 5; pose.shut = Math.max(before * 0.4, bang); pose.lookX = u > at + 0.22 ? -1 : pose.lookX; break
  }
}

/** The pose of a visitor part of the way through an act. */
export function poseOf(who: VisitorId, act: Act): Pose {
  const manner = MANNER[who], size = manner.size, u = clamp01(act.u), e = manner.ease
  const pose = neutral()
  switch (act.name) {
    case 'poke': {
      const up = hump(u, 0, 1)
      if (who === 'goat') { pose.headY = -16 * up; pose.tilt = Math.sin(u * 22) * 0.07 * up; pose.mouth = up; pose.special = 1 - u }
      else if (who === 'beekeeper') { pose.dx = Math.sin(u * 12) * 5 * (1 - u); pose.tilt = Math.sin(u * 12) * 0.05 * (1 - u); pose.special = up * 0.12 }
      else if (who === 'bride') { pose.dy = -10 * hump(u, 0, 0.4); pose.wide = up; pose.special = hump(u, 0.05, 0.6) * 0.3 }
      else { pose.headY = -6 * hold(u, 0.1, 0.8); pose.tilt = 0.06 * hold(u, 0.1, 0.8); pose.special = hold(u, 0.1, 0.8) * 0.4; pose.lookX = -1 }
      break
    }
    // The one who waits lifts its vase a little.
    case 'lift': {
      const up = hump(u, 0, 1)
      pose.dy = (who === 'goat' ? -14 : who === 'bride' ? -8 : who === 'aunt' ? -3 : -5) * up
      // The bee-keeper rocks it twice from mitt to mitt.
      pose.tilt = who === 'beekeeper' ? 0.13 * Math.sin(u * Math.PI * 4) * up : (who === 'aunt' ? 0 : 0.04) * Math.sin(u * Math.PI * 2)
      // The goat's ears go up with it, the bride's veil drifts, the aunt's eyebrow asks.
      pose.special = (who === 'goat' ? 1 : who === 'bride' ? 0.2 : who === 'aunt' ? 0.5 : 0) * up
      break
    }
    // The vase comes up to the nose.
    case 'take':
    case 'reach': {
      const there = act.name === 'take' ? e(ramp(u, 0, 0.55)) : hold(u, 0.1, 0.9, 0.3)
      pose.reach = there
      pose.headX = -30 * size * there
      pose.headY = 14 * size * there
      pose.tilt = -0.14 * size * there
      pose.lookX = -1; pose.lookY = 0.6
      // Taken up, it is sniffed twice; the reach sniffs at it once.
      pose.headY += (act.name === 'take' ? hump(u, 0.6, 0.72) + hump(u, 0.78, 0.9) : hump(u, 0.42, 0.6)) * 5
      // The goat goes in mouth first with its ears forward; the bee-keeper stoops, body and all; the bride rises to it;
      // the aunt does not bend at all, and looks at it down her nose.
      if (who === 'goat') { pose.mouth = 0.5 * there * Math.abs(Math.sin(u * 16)); pose.special = 0.6 * there }
      else if (who === 'beekeeper') pose.dy = 9 * there
      else if (who === 'bride') { pose.dy = -9 * there; pose.special = 0.12 * there }
      else { pose.headX = 0; pose.headY = 0; pose.tilt = 0.07 * there; pose.lookY = 1; pose.special = 0.3 * there }
      break
    }
    case 'stepBack': {
      const back = hold(u, 0.05, 0.7, 0.12)
      pose.dx = 26 * size * back
      pose.wide = back
      pose.lookX = -1; pose.lookY = 1
      pose.reach = hold(u, 0.72, 1, 0.1)
      break
    }
    case 'walk':
    case 'leave': {
      // The steps are its own; the scene moves it.
      const step = u * manner.steps
      pose.dy = -Math.abs(Math.sin(step * Math.PI)) * manner.bob
      pose.tilt = Math.sin(step * Math.PI) * manner.roll
      pose.dx = Math.sin(step * Math.PI) * manner.roll * 60
      if (who === 'bride' && act.name === 'leave') { pose.shut = 0.5; pose.tilt -= 0.05 }
      break
    }
    // A sniff that finds nothing to say.
    case 'plain': {
      pose.headY = hump(u, 0.1, 0.5) * 8 * size + hump(u, 0.55, 0.95) * 8 * size
      pose.reach = 1
      break
    }
    case 'sniff': sniffPose(who, act.plant, pose, u, e, size); own(who, pose, u); break
    case 'drop': dropPose(who, act.plant, pose, u, e, size); own(who, pose, u); break
    // The goat eats the bouquet: its head goes down to each piece and comes up chewing.
    case 'eat': {
      pose.reach = 1
      pose.headX = -22
      pose.headY = 10 + Math.abs(Math.sin(u * Math.PI * 5)) * 12
      pose.mouth = Math.abs(Math.sin(u * Math.PI * 5))
      pose.shut = 0.5
      break
    }
    case 'loves': {
      if (who === 'goat') { pose.roll = hold(u, 0.1, 0.9); pose.mouth = Math.abs(Math.sin(u * 20)) * 0.6 }
      // She sways with the hum, and the hat sways a beat behind.
      else if (who === 'beekeeper') { pose.tilt = Math.sin(u * Math.PI * 3) * 0.09; pose.shut = hold(u, 0.3, 0.95) * 0.7; pose.special = Math.max(0, Math.sin(u * Math.PI * 3 - 0.9)) * 0.1 }
      // She turns once on the spot.
      else if (who === 'bride') { pose.turn = Math.cos(e(ramp(u, 0.1, 0.8)) * Math.PI * 2); pose.dy = -10 * hump(u, 0.1, 0.8); pose.shut = hold(u, 0.2, 0.9) * 0.6 }
      // One stiff nod.
      else { pose.headY = hold(u, 0.3, 0.5, 0.04) * 13; pose.tilt = 0 }
      break
    }
    case 'cannot': {
      if (who === 'goat') { pose.tears = hold(u, 0.1, 0.95); pose.mouth = hold(u, 0.55, 0.9); pose.tilt = Math.sin(u * 30) * 0.05 * hold(u, 0.55, 0.9); pose.purple = 0 }
      // She turns it round, holds it to her ear and shakes it.
      else if (who === 'beekeeper') { pose.tilt = 0.2 * hold(u, 0.35, 0.95, 0.15); pose.headX = -14 * hold(u, 0.35, 0.95, 0.15); pose.lookX = -1; pose.reach = 1 }
      else if (who === 'bride') { sneeze(who, pose, u, 0.35); pose.special = Math.max(pose.special, hold(u, 0.36, 0.92, 0.06)) }
      // The eyebrow goes up off her face, and one fingertip straightens the piece.
      else { pose.special = hold(u, 0.08, 0.92, 0.06); pose.reach = hold(u, 0.3, 0.75, 0.1); pose.lookX = -1; pose.lookY = 0.3 }
      break
    }
    case 'stalks': {
      if (who === 'goat') { pose.shut = 0.75; pose.mouth = Math.abs(Math.sin(u * 18)) * 0.5; pose.headY = 6 }
      // She looks along each stalk through a glass.
      else if (who === 'beekeeper') { pose.headX = -24 * hold(u, 0.1, 0.9, 0.15); pose.tilt = -0.1 * hold(u, 0.1, 0.9, 0.15); pose.lookX = -1; pose.lookY = Math.sin(u * Math.PI * 4) * 0.8; pose.wide = 1 }
      // As proudly as roses.
      else if (who === 'bride') { pose.tilt = 0.1 * hold(u, 0.1, 1, 0.2); pose.headY = -8 * hold(u, 0.1, 1, 0.2); pose.shut = hold(u, 0.2, 1, 0.1); pose.dy = -6 * hold(u, 0.1, 1, 0.2) }
      // She measures them against each other, and then she nods.
      else { pose.lookX = Math.sign(Math.sin(u * Math.PI * 5)) * hold(u, 0.05, 0.7, 0.02); pose.lookY = 0.2; pose.headY = act.flag ? hold(u, 0.78, 0.9, 0.03) * 13 : 0; pose.reach = hold(u, 0.05, 0.7, 0.05) }
      break
    }
    // The thistle pricks, the gasp draws the fluff in, the sneeze shakes her bun loose, and she laughs.
    case 'laugh': {
      pose.headY = -14 * hump(u, 0.05, 0.2)
      pose.wide = hold(u, 0.05, 0.3, 0.04)
      pose.mouth = Math.max(hold(u, 0.2, 0.34, 0.03), hold(u, 0.5, 0.98, 0.05) * (0.6 + 0.4 * Math.abs(Math.sin(u * 60))))
      sneeze(who, pose, u, 0.36)
      const laughing = hold(u, 0.52, 0.98, 0.05)
      pose.headY += Math.abs(Math.sin(u * 60)) * 9 * laughing
      pose.shut = Math.max(pose.shut, laughing * 0.9)
      pose.tilt += 0.1 * laughing
      break
    }
    // The tendril takes hold of the veil and lifts it.
    case 'unveil': {
      pose.special = hold(u, 0.25, 0.85, 0.2)
      pose.wide = hold(u, 0.3, 0.85, 0.05)
      break
    }
  }
  return pose
}

/** Every cell of the grid ends in the visitor's own way of taking it: no two take the same flower alike. */
function own(who: VisitorId, pose: Pose, u: number): void {
  const after = hold(u, 0.62, 0.98, 0.08)
  switch (who) {
    // Its ears go up and it gives a small hop.
    case 'goat': pose.special = Math.max(pose.special, after); pose.dy -= 14 * hump(u, 0.62, 0.8); break
    // She rocks from boot to boot.
    case 'beekeeper': pose.tilt += Math.sin(u * 14) * 0.06 * after; pose.dx += Math.sin(u * 14) * 6 * after; break
    // She rises a little, and her veil drifts out.
    case 'bride': pose.dy -= 9 * after; pose.special = Math.max(pose.special, 0.22 * after); break
    // Her eyebrow goes half way up, and she looks away as if nothing had happened.
    case 'aunt': pose.special = Math.max(pose.special, 0.5 * after); if (after > 0.5) pose.lookX = 1; break
  }
}

function sniffPose(who: VisitorId, plant: Kind | null, pose: Pose, u: number, e: (t: number) => number, size: number): void {
  // Every sniff begins with the nose going to the flowers.
  const inn = e(ramp(u, 0, 0.25)) * (1 - ramp(u, 0.85, 1))
  pose.reach = 1
  pose.headX = -30 * size * inn
  pose.headY = 14 * size * inn
  pose.tilt = -0.14 * size * inn
  switch (plant) {
    // Nose to nose with the flower, and cross-eyed.
    case 'sunflower': pose.cross = hold(u, 0.28, 0.85, 0.06); pose.wide = hold(u, 0.28, 0.5, 0.05); break
    // A petal on the nose is blown up and watched down.
    case 'poppy': pose.cross = hold(u, 0.2, 0.45, 0.05); pose.mouth = hump(u, 0.45, 0.6); pose.lookX = 0; pose.lookY = u < 0.45 ? 0.5 : -1 + ramp(u, 0.7, 1) * 2; pose.headY -= 10 * hump(u, 0.45, 0.6); break
    // The eyes brim and squirt.
    case 'onion': pose.wide = hold(u, 0.15, 0.5, 0.05); pose.tears = ramp(u, 0.15, 0.5) * (1 - ramp(u, 0.85, 1)); pose.shut = hold(u, 0.52, 0.9, 0.05); pose.headY -= 8 * hold(u, 0.52, 0.9, 0.05); break
    // Pricked: the head springs back, and it looks at the thistle down both sides of its nose.
    case 'thistle': {
      const back = hold(u, 0.3, 0.95, 0.04)
      pose.headX += 30 * size * back; pose.headY -= 16 * size * back
      pose.wide = hold(u, 0.3, 0.45, 0.03)
      pose.cross = hold(u, 0.4, 0.95, 0.05)
      pose.lookX = Math.sign(Math.sin(u * Math.PI * 6)) * hold(u, 0.45, 0.95, 0.02); pose.lookY = 0.7
      break
    }
    // Tugged by the tendril and let go.
    case 'ivy': {
      const tug = hold(u, 0.45, 0.72, 0.08), sprung = ramp(u, 0.72, 0.74) * (1 - ramp(u, 0.74, 1))
      pose.headX -= 16 * tug - Math.sin(u * 50) * 12 * sprung
      pose.tilt -= 0.1 * tug - Math.sin(u * 50) * 0.08 * sprung
      pose.wide = tug
      break
    }
    case 'dandelion': sneeze(who, pose, u, 0.55); break
    default: break
  }
}

function dropPose(_who: VisitorId, plant: Kind | null, pose: Pose, u: number, e: (t: number) => number, size: number): void {
  switch (plant) {
    // A hat: the head sinks under it and is wound round to the window.
    case 'sunflower': {
      const on = hold(u, 0.08, 0.78, 0.05)
      pose.headY = 12 * hump(u, 0.05, 0.25) + 4 * on
      pose.tilt = -0.3 * size * e(ramp(u, 0.3, 0.6)) * (1 - ramp(u, 0.8, 1))
      pose.lookX = -1; pose.lookY = -1
      pose.shut = hump(u, 0.05, 0.2)
      break
    }
    // Petals on the eyelids, which blink under them twice.
    case 'poppy': pose.shut = Math.max(hold(u, 0.1, 0.36, 0.04), hold(u, 0.46, 0.66, 0.04)); pose.headY = 3 * hold(u, 0.1, 0.9); break
    // A bite, a purple face, a long green breath.
    case 'onion': {
      pose.mouth = Math.max(hump(u, 0.05, 0.22), hold(u, 0.5, 0.9, 0.08) * 0.8)
      pose.purple = hold(u, 0.24, 0.92, 0.1)
      pose.wide = hold(u, 0.24, 0.5, 0.05)
      pose.shut = hold(u, 0.5, 0.9, 0.06) * 0.6
      pose.headY = -6 * hold(u, 0.5, 0.9, 0.08)
      break
    }
    // A burr behind: a yip, and round twice looking for it.
    case 'thistle': {
      pose.dy = -22 * size * hump(u, 0.06, 0.24)
      pose.wide = hold(u, 0.06, 0.3, 0.04)
      pose.turn = Math.cos(e(ramp(u, 0.25, 0.9)) * Math.PI * 4)
      pose.lookX = 1; pose.lookY = 1
      break
    }
    // A scarf that winds and unwinds.
    case 'ivy': pose.tilt = Math.sin(u * Math.PI * 4) * 0.08 * size; pose.lookY = 1; pose.wide = hold(u, 0.1, 0.9, 0.1) * 0.6; pose.headY = -5 * hold(u, 0.3, 0.6); break
    // On the tip of the nose, and blown away.
    case 'dandelion': pose.cross = hold(u, 0.08, 0.5, 0.05); pose.mouth = hump(u, 0.5, 0.68); pose.headY = -8 * hump(u, 0.5, 0.68); pose.lookX = -0.6 * ramp(u, 0.6, 0.8); pose.lookY = -1 * ramp(u, 0.6, 0.8); break
    default: break
  }
}
