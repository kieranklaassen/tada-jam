import type { ThingId } from './yard'

// How each figure moves like itself, as plain numbers the frame lays onto
// rigid cards. The look's rule is that a figure never bends: it slides, tilts,
// hops and flips on its stick, and its comedy is in the stiffness. So every
// function here returns a lift, a tilt or a flip, never a squash, and no two
// characters share a rhythm. Time is the game's own seconds.

const TAU = Math.PI * 2
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
/** 0..1 through the stretch of every `period` seconds that starts at `at` and lasts `lasts`, else -1. */
function during(t: number, period: number, at: number, lasts: number): number {
  const phase = ((t % period) + period) % period
  return phase >= at && phase < at + lasts ? (phase - at) / lasts : -1
}

/** The raccoon leans into each push of its wire and is stood up again. `k` is 0..1 through the push. */
export function raccoonPush(k: number): { tilt: number; lift: number } {
  return { tilt: 0.16 * Math.sin(Math.PI * clamp01(k)) * (k < 0.5 ? 1 : 0.6), lift: -3 * Math.sin(Math.PI * clamp01(k)) }
}

/** In a bush it peeps: up in a jerk every few seconds, a look, and down again. Returns how far it rises, 0..1. */
export function raccoonPeep(rested: number): number {
  const up = during(rested, 3.1, 0.5, 1.5)
  if (up < 0) return 0
  return up < 0.08 ? up / 0.08 : up > 0.9 ? (1 - up) / 0.1 : 1
}

/** In the open and standing still, its ears-up card twitches now and then. */
export function raccoonFidget(rested: number): number {
  const k = during(rested, 2.3, 1.4, 0.24)
  return k < 0 ? 0 : 0.07 * Math.sin(k * TAU)
}

/** The goose rocks from foot to foot as she is pushed along: a stiff tilt each way, held, never a smooth sway. */
export function gooseWaddle(t: number): { tilt: number; lift: number } {
  const phase = (t * 2.4) % 2
  const side = phase < 1 ? 1 : -1
  const within = phase % 1
  const snap = within < 0.18 ? within / 0.18 : 1
  return { tilt: side * 0.075 * snap, lift: -5 * Math.sin(Math.PI * Math.min(1, within / 0.5)) * (within < 0.5 ? 1 : 0) }
}

/** At the end of a lane she looks about: her card tips back and forward, slowly, twice. */
export function gooseLook(k: number): number {
  return 0.09 * Math.sin(clamp01(k) * TAU * 2)
}

/** When in her stop beside the nest she nods at her egg, as parts of the stop: the model clucks at the same moments. */
export const NEST_NODS = [0.25, 0.75] as const
/** When she straightens up from an empty nest and honks, puzzled. */
export const NEST_PUZZLED = 0.6

/**
 * Her stop beside the nest. An egg gets two nods; an empty nest gets her head right down to look underneath it and
 * then her neck straight up; anything else, or a stop she was found in the middle of, gets a plain look.
 */
export function gooseNestLook(k: number, saw: 'egg' | 'empty' | 'other' | null): { tilt: number; lift: number; alert: boolean } {
  const t = clamp01(k)
  if (saw === 'egg') return { tilt: 0.3 * Math.abs(Math.sin(t * TAU)) , lift: 0, alert: false }
  if (saw === 'empty') {
    if (t < NEST_PUZZLED) return { tilt: 0.52 * Math.min(1, t / 0.15), lift: 0, alert: false }
    return { tilt: -0.06, lift: -14 * Math.sin(Math.PI * Math.min(1, (t - NEST_PUZZLED) / 0.2)), alert: true }
  }
  return { tilt: 0.16 * Math.sin(Math.PI * t), lift: 0, alert: false }
}

/** The raccoon snaps to attention when a tap sends it somewhere: a jerk up and back. `since` is seconds since the tap. */
export function raccoonPerk(since: number): { tilt: number; lift: number } {
  if (since >= 0.18) return { tilt: 0, lift: 0 }
  const up = Math.sin(Math.PI * (since / 0.18))
  return { tilt: -0.13 * up, lift: -12 * up }
}

/** It pokes an empty place: a stiff lean in and back, and after a toe in the pond it shivers. */
export function raccoonPoke(since: number, shivers: boolean): number {
  if (since < 0.4) return 0.3 * Math.sin(Math.PI * (since / 0.4))
  if (shivers && since < 1.1) return 0.07 * Math.sin(since * 70) * (1 - (since - 0.4) / 0.7)
  return 0
}

/** Her strut home after a punt: a bounce on every beat, chest out. */
export function gooseStrut(t: number): { tilt: number; lift: number } {
  return { tilt: -0.12, lift: -9 * Math.abs(Math.sin(t * 7.5)) }
}

/** A plucked goose shoots straight up and spins on her stick. `k` is 0..1. Returns the lift and how many half-turns she has made. */
export function gooseStartle(k: number): { lift: number; turns: number } {
  const t = clamp01(k)
  return { lift: -96 * Math.sin(Math.PI * Math.min(1, t / 0.7)) * (t < 0.7 ? 1 : 0), turns: t < 0.7 ? (t / 0.7) * 3 : 3 }
}

/** The dog's tail wags in bursts, with rests between. */
export function dogTail(t: number): number {
  const k = during(t, 3.4, 0.4, 1.3)
  return k < 0 ? 0.12 : 0.12 + 0.5 * Math.sin(k * TAU * 6) * Math.sin(k * Math.PI)
}

/** The dog pants: a small quick nod. */
export function dogPant(t: number): number {
  return 0.018 * Math.sin(t * 9.2)
}

/** The scarecrow creaks about on his pole in the wind. */
export function scarecrowSway(t: number): number {
  return 0.03 * Math.sin(t * 0.83) + 0.012 * Math.sin(t * 2.1 + 1)
}

/** The crow on his shoulder pecks twice every few seconds and otherwise cocks its head in jumps. */
export function crowPeck(t: number): { tilt: number; lift: number } {
  const peck = during(t, 4.7, 3.6, 0.6)
  if (peck >= 0) return { tilt: 0.55 * Math.abs(Math.sin(peck * TAU)), lift: 0 }
  const cocked = Math.floor(t / 1.3) % 3
  return { tilt: [-0.14, 0.05, 0.16][cocked], lift: 0 }
}

/** The frog sits, and every so often hops on the spot. */
export function frogHop(t: number): { lift: number; tilt: number } {
  const k = during(t, 6.3, 5.2, 0.42)
  return k < 0 ? { lift: 0, tilt: 0 } : { lift: -24 * Math.sin(k * Math.PI), tilt: 0.12 * Math.sin(k * TAU) }
}

/** The frog's eyes shut for a moment now and then. */
export function frogBlinks(t: number): boolean {
  return during(t, 3.7, 2.9, 0.16) >= 0
}

/** The farmer dozes over his half-door: his head sinks slowly and jerks back up. */
export function farmerNod(t: number): number {
  const sink = during(t, 5.6, 0, 4.6)
  if (sink >= 0) return 0.17 * sink * sink
  const jerk = during(t, 5.6, 4.6, 1)
  return 0.17 * Math.max(0, 1 - jerk * 5) - 0.03 * Math.sin(clamp01(jerk * 2) * Math.PI)
}

/** Each piece of washing swings on its own peg, in gusts. `piece` is 0..3 along the line. */
export function washingSwing(piece: number, t: number): number {
  const gust = 0.55 + 0.45 * Math.sin(t * 0.37 + piece * 0.9)
  return (0.05 + piece * 0.012) * gust * Math.sin(t * (1.5 + piece * 0.31) + piece * 1.7)
}

/** The sun's card is turned a notch at a time. */
export function sunTurn(t: number): number {
  return Math.floor(t / 0.9) * 0.13
}

/** The sun tapped on its pin whirls once round and stops where it was. `since` is seconds since the tap. */
export function sunSpin(since: number): number {
  const k = since / 0.9
  return k >= 1 ? 0 : Math.PI * 2 * (1 - (1 - k) ** 3)
}
/** How long an apple takes to fall out of the tree, in seconds; its thud sounds as it reaches the grass. */
export const APPLE_FALLS = 0.8
/** An apple shaken out of the tree: how far it has fallen, 0..1, and how much of it shows, or null when none falls. */
export function appleFall(since: number): { k: number; alpha: number } | null {
  const k = since / APPLE_FALLS
  return k >= 1 ? null : { k: k * k, alpha: k < 0.8 ? 1 : (1 - k) / 0.2 }
}
/** The sparrow that a rattle of the fence sends up: two hops along the top rail, and gone. */
export function fenceHop(since: number): { lift: number; along: number; alpha: number } | null {
  const k = since / 0.8
  return k >= 1 ? null : { lift: -18 * Math.abs(Math.sin(k * Math.PI * 2)), along: 34 * k, alpha: Math.min(1, k / 0.1, (1 - k) / 0.15) }
}
/**
 * The gilt frame knocked: it jumps away from the stage, 0..1, and settles in three bounces, each lower. Never
 * towards the stage, so it covers nothing. The first frame after the knock already has it on its way.
 */
export const FRAME_SETTLES = 0.62
export function frameKnock(since: number): number {
  if (since < 0 || since >= FRAME_SETTLES) return 0
  if (since < 0.3) return Math.sin((Math.PI * (since + 0.03)) / 0.33)
  if (since < 0.5) return 0.42 * Math.sin((Math.PI * (since - 0.3)) / 0.2)
  return 0.14 * Math.sin((Math.PI * (since - 0.5)) / 0.12)
}
/** A small bird flushed out of the far hills: it flutters up and away to one side, and is gone. */
export function hillBird(since: number): { dx: number; dy: number; tilt: number; alpha: number } | null {
  const k = since / 1.1
  return k >= 1 ? null : { dx: 70 * k, dy: -90 * Math.sin((Math.PI / 2) * k) - 6 * Math.abs(Math.sin(k * 26)), tilt: -0.5 + 0.3 * Math.sin(k * 26), alpha: Math.min(1, (1 - k) / 0.3) }
}
/** The goose's ruffle: feathers shaken loose over her back, drifting down. */
export function gooseRuffle(since: number): { dx: number; dy: number; tilt: number; alpha: number } | null {
  const k = since / 0.7
  return k >= 1 ? null : { dx: 10 * Math.sin(k * 10), dy: -26 * Math.sin(Math.PI * Math.min(1, k * 2.4)) + 50 * k * k, tilt: 1.2 * Math.sin(k * 12), alpha: 1 - k * k }
}
/** The half-door shaken by a knock on the barn: a rattle that dies away, -1..1. */
export function doorShake(since: number): number {
  return since >= 0.45 ? 0 : Math.cos(since * 50) * (1 - since / 0.45)
}

/** A cloud tapped on its wire bobs and settles. `since` is seconds since the tap. */
export function cloudBob(since: number): number {
  return since > 1.4 ? 0 : -16 * Math.exp(-since * 3.2) * Math.cos(since * 13)
}

/** A bush rustled or crashed into shakes and settles. */
export function bushShake(since: number): number {
  return since > 1 ? 0 : 0.11 * Math.exp(-since * 4.5) * Math.sin(since * 34)
}

/** When the potato, set down, has rolled its half turn: the knock the voice sounds. */
export const POTATO_KNOCKS = 0.21
/** When the leaf slides off a cabbage that was set down, and for how long: the rustle the voice sounds. */
export const LEAF_SLIDES = { at: 0.3, lasts: 0.45 } as const
/** Where the cabbage's leaf is as it slides off, from the cabbage's own spot, or null when none is sliding. */
export function leafSlide(t: number): { dx: number; dy: number; tilt: number; alpha: number } | null {
  const k = (t - LEAF_SLIDES.at) / LEAF_SLIDES.lasts
  if (k < 0 || k >= 1) return null
  const e = k * k * (3 - 2 * k)
  return { dx: 14 + 26 * e, dy: -34 + 30 * e, tilt: 1.5 * e, alpha: k < 0.75 ? 1 : (1 - k) / 0.25 }
}

/** When, after a poke, each part of the answer happens: the times the voice sounds them at. */
export const POKE_AT = { caw: 0.26, cawLasts: 0.3, lick: 0, lickLasts: 0.3, growl: 0.15, growlLasts: 0.52 } as const
/** How far through its caw the crow is, `since` seconds after the scarecrow was tickled, or -1. */
export function crowCaws(since: number): number {
  const k = (since - POKE_AT.caw) / POKE_AT.cawLasts
  return k >= 0 && k < 1 ? k : -1
}
/** The dog's low growl after his empty bowl was licked: he leans over it and shudders. */
export function dogGrowl(since: number): number {
  const k = (since - POKE_AT.growl) / POKE_AT.growlLasts
  return k >= 0 && k < 1 ? -0.12 * Math.sin(Math.PI * k) + 0.025 * Math.sin(since * 80) : 0
}
/** Where the two drops are that the raccoon's tongue flicks out of the bowl: up and over, one after the other. */
export function lickDrops(since: number): { dx: number; dy: number; alpha: number }[] {
  const drops: { dx: number; dy: number; alpha: number }[] = []
  for (const [i, starts] of [0, 0.12].entries()) {
    const k = (since - POKE_AT.lick - starts) / (POKE_AT.lickLasts - 0.12)
    if (k >= 0 && k < 1) drops.push({ dx: (i ? 12 : -10) * k - 4, dy: -34 * Math.sin(Math.PI * k) - 6, alpha: 1 - k * k })
  }
  return drops
}

/** A place that was poked or looked at tips once and settles. */
export function placeNudge(since: number): number {
  return since > 0.8 ? 0 : 0.07 * Math.exp(-since * 5) * Math.sin(since * 26)
}

/** The curtain swings on its rod after a tap. */
export function curtainSway(since: number): number {
  return since > 2 ? 0 : 0.035 * Math.exp(-since * 1.8) * Math.sin(since * 8)
}

export type CardMove = { lift: number; tilt: number; slide: number }

/** A thing hops where it lies when the finger lands on it, each with its own turn. `k` is 0..1. */
export function thingHop(id: ThingId, k: number): CardMove {
  const up = Math.sin(Math.PI * clamp01(k))
  const turn: Record<ThingId, number> = { ball: 0.5, potato: -0.2, clock: 0.12, boot: -0.3, cabbage: 0.08, egg: 0.26 }
  const high: Record<ThingId, number> = { ball: 30, potato: 12, clock: 18, boot: 14, cabbage: 16, egg: 22 }
  return { lift: -high[id] * up, tilt: turn[id] * up * (id === 'clock' ? Math.sin(k * 40) : 1), slide: 0 }
}

/** How each thing comes to rest when it is set down: the ball bounces, the potato rocks, the clock shivers, the boot stands itself up, the cabbage flumps, the egg wobbles upright. `t` is seconds since it touched down. */
export function thingLand(id: ThingId, t: number): CardMove {
  switch (id) {
    case 'ball': {
      // Three bounces, each lower: the same times the voice sounds them at.
      const bounces = [{ at: 0, lasts: 0.22, high: 44 }, { at: 0.22, lasts: 0.18, high: 20 }, { at: 0.4, lasts: 0.13, high: 8 }]
      for (const b of bounces) if (t >= b.at && t < b.at + b.lasts) return { lift: -b.high * Math.sin(((t - b.at) / b.lasts) * Math.PI), tilt: t * 2.2, slide: 0 }
      return { lift: 0, tilt: 0, slide: 0 }
    }
    case 'potato': {
      // It rolls half a turn to the knock, and rocks to rest.
      const k = Math.min(1, t / POTATO_KNOCKS), e = k * k * (3 - 2 * k)
      const rock = t > POTATO_KNOCKS ? 0.16 * Math.exp(-(t - POTATO_KNOCKS) * 4.5) * Math.sin((t - POTATO_KNOCKS) * 13) : 0
      return { lift: 0, tilt: -Math.PI * (1 - e) + rock, slide: -24 * (1 - e) }
    }
    case 'clock': return { lift: 0, tilt: 0.13 * Math.exp(-t * 3.5) * Math.sin(t * 46), slide: 0 }
    case 'boot': return { lift: 0, tilt: -0.62 * Math.exp(-t * 6) * Math.cos(t * 8.5), slide: 0 }
    case 'cabbage': return { lift: 7 * Math.exp(-t * 7), tilt: 0.09 * Math.exp(-t * 3) * Math.sin(t * 12), slide: 0 }
    case 'egg': return { lift: 0, tilt: 0.46 * Math.exp(-t * 1.9) * Math.cos(t * 11.5), slide: 0 }
  }
}
