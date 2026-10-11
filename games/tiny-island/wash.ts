import { KINDS, SLOT_DX } from './toys'

// The wave's one piece of work, the wash, as plain numbers: where the wave
// is at each moment and what shape it has. It rears first and can still be
// called off; then the scene (scene.ts) plays these beats over game time:
// it rolls across the island from right to left and takes the toys onto its
// crest, curls round to the front until the crest lies along the tray, stands
// each toy in its slot, and slides back to its edge.

/** The wave rears for this long before anything is moved or saved. A second touch on it in that time calls it off. */
export const REAR_S = 1.4
/** How long it takes to sink back when it is called off. */
export const SINK_S = 0.8
/** The beats of the scene, in seconds from its start. The roll is slow enough to watch. */
export const ROLL = { at: 0, lasts: 2.2 }
export const CURL = { at: 2.2, lasts: 0.8 }
/** The toys are stood in their slots one at a time: each has landed before the next one leaves the crest. */
export const SET = { at: 3, each: 0.45 }
export const SET_S = 0.28
export const BACK_S = 0.9
/** When the wave starts back for its edge, with that many toys to stand in their slots; and how long the whole wash is. */
export const backAt = (toys: number): number => SET.at + toys * SET.each + 0.1
export const washS = (toys: number): number => backAt(toys) + BACK_S
/** The longest wash: all five toys were out. */
export const WASH_S = washS(KINDS.length)
/** With no toy out it rolls over the bare island and goes back. */
export const BARE_ROLL = { at: 0, lasts: 1.6 }
export const BARE_BACK = { at: 1.6, lasts: 0.9 }
export const BARE_S = BARE_BACK.at + BARE_BACK.lasts
/** A toy is taken onto the crest every so often, the one nearest the wave first, and a lift takes this long. */
export const LIFT_EVERY = 0.3
export const LIFT_S = 0.5
/** How far ahead of its middle the wave's lip is, at the size it rolls at. */
export const LIP = 1.3
/** A toy on the crest is carried this high above the water. */
export const CREST_Y = 1.35
/** At work the wave is this many times as long as at rest, and its crest then reaches this far each way from its middle. */
export const LONG = 3
export const CREST_HALF = ((KINDS.length - 1) / 2) * SLOT_DX

/** Where the roll ends, and where the wave stands to set the toys down: its crest along the tray, a toy behind each slot. */
export const ROLL_Z = 0.5
const LEFT = { x: -2.2, z: ROLL_Z }
const FRONT = { x: 0, z: 4.9 }

export type WavePose = {
  /** Where it is, in the world, and which way it is turned: at 0 it breaks toward the left. */
  x: number
  z: number
  yaw: number
  /** Its size: across (the way it travels), up, and along its crest. */
  wide: number
  tall: number
  long: number
  /** Reared up, 0 to 1. */
  rear: number
  /** The crest curling toward the island and back. */
  curl: number
  /** Eyes: 0 shut to 1 wide open. At rest they are half open. */
  lids: number
}

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const span = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))
const smooth = (t: number): number => t * t * (3 - 2 * t)
const mix = (a: number, b: number, t: number): number => a + (b - a) * t

/** Half open, with the lids drifting a little: the wave is never quite asleep. */
const restLids = (time: number): number => 0.5 + Math.sin(time * 0.55) * 0.05

export type Washing = {
  /** Seconds it has been rearing, or -1. */
  rearing: number
  /** Seconds it has been sinking back after being called off, or -1; and how far it had reared. */
  sinking: number
  sankFrom: number
  /** Seconds into the scene, or -1. */
  at: number
  /** No toy was out. */
  bare: boolean
  /** When the wave starts back, in seconds into the scene. */
  back: number
  /** The wave may not pass this x yet: a toy there is still on its way up. */
  gate: number
}

/** The wave at this moment. `time` is the game's clock, for its breathing; `post` is where it lies. */
export function wavePose(time: number, washing: Washing, post: { x: number; z: number }, out: WavePose): WavePose {
  out.x = post.x
  out.z = post.z
  out.yaw = 0
  out.wide = out.tall = out.long = 1
  out.rear = 0
  out.curl = Math.sin(time * 0.55) * 0.5 + 0.5
  out.lids = restLids(time)
  if (washing.rearing >= 0) {
    // It wakes slowly: the lids go up first, then the whole wave.
    out.rear = smooth(span(washing.rearing, 0.15, REAR_S))
    out.lids = mix(out.lids, 1, smooth(span(washing.rearing, 0, 0.5)))
    return out
  }
  if (washing.sinking >= 0) {
    const down = smooth(span(washing.sinking, 0, SINK_S))
    out.rear = washing.sankFrom * (1 - down)
    out.lids = mix(1, out.lids, down)
    return out
  }
  const t = washing.at
  if (t < 0) return out
  out.lids = 1
  out.curl = 1
  if (washing.bare) {
    // Over the bare island and under on the far side; then it comes up again at its edge.
    const roll = smooth(span(t, BARE_ROLL.at, BARE_ROLL.at + BARE_ROLL.lasts)), back = span(t, BARE_BACK.at, BARE_BACK.at + BARE_BACK.lasts)
    out.rear = 1 - roll
    out.x = mix(post.x, LEFT.x, roll)
    out.z = mix(post.z, LEFT.z, smooth(span(roll, 0, 0.4)))
    out.long = mix(1, LONG, smooth(span(roll, 0, 0.3)))
    out.wide = 1.25
    out.tall = 0.9 * (1 - smooth(span(roll, 0.8, 1)))
    if (back > 0) {
      out.x = post.x
      out.z = post.z
      out.long = out.wide = 1
      out.tall = smooth(span(back, 0.1, 0.8))
      out.curl = 1 - back
      out.lids = mix(1, restLids(time), smooth(back))
    }
    return out
  }
  const roll = smooth(span(t, ROLL.at, ROLL.at + ROLL.lasts)), curl = smooth(span(t, CURL.at, CURL.at + CURL.lasts)), back = smooth(span(t, washing.back, washing.back + BACK_S))
  const spent = span(t, SET.at, washing.back)
  out.rear = 1 - span(roll, 0, 0.5)
  out.x = Math.max(mix(post.x, LEFT.x, roll), Math.min(post.x, washing.gate))
  out.z = mix(post.z, LEFT.z, smooth(span(roll, 0, 0.4)))
  out.long = mix(1, LONG, smooth(span(roll, 0, 0.3)))
  out.wide = mix(1, 1.25, smooth(span(roll, 0, 0.3)))
  out.tall = mix(0.9, 0.55, spent)
  if (curl > 0) {
    out.x = mix(LEFT.x, FRONT.x, curl)
    out.z = mix(LEFT.z, FRONT.z, curl)
    out.yaw = (Math.PI / 2) * curl
  }
  if (back > 0) {
    out.x = mix(FRONT.x, post.x, back)
    out.z = mix(FRONT.z, post.z, back)
    out.yaw = (Math.PI / 2) * (1 - back)
    out.long = mix(LONG, 1, back)
    out.wide = mix(1.25, 1, back)
    out.tall = mix(0.55, 1, smooth(span(back, 0.5, 1)))
    out.curl = 1 - back
    // It sighs, and the lids sink half-way with its eyes on the island again.
    out.lids = mix(1, restLids(time), smooth(span(back, 0.4, 1)))
  }
  return out
}

/**
 * Where each toy rides along the crest, as a distance from the wave's middle: each as near as it can be to
 * where the crest met it (`reach` is how far along the crest the toy stood), a slot's width from the next,
 * and none beyond the crest's ends. The order along the crest is the order in which the toys stood.
 */
export function crestRow(reach: readonly number[]): number[] {
  const order = reach.map((_, i) => i).sort((a, b) => reach[a] - reach[b]), row = new Array<number>(reach.length)
  let last = -Infinity
  order.forEach((i, rank) => {
    const most = CREST_HALF - (order.length - 1 - rank) * SLOT_DX
    last = Math.min(most, Math.max(-CREST_HALF, reach[i], last + SLOT_DX))
    row[i] = last
  })
  return row
}

/** Where a toy that rides `along` the crest is, in the world. */
export function crestSlot(along: number, wave: WavePose, out: { x: number; z: number }): { x: number; z: number } {
  out.x = wave.x + Math.sin(wave.yaw) * along
  out.z = wave.z + Math.cos(wave.yaw) * along
  return out
}

/** The x the wave's middle may not pass while a toy standing at `x` with ground `foot` is still going up. */
export function gateFor(x: number, foot: number): number {
  return x + foot + 0.3 + LIP
}
