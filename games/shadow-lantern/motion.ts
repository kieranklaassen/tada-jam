import type { CreatureKind } from './creatures'
import { clearOfProscenium, PROSCENIUM } from './projection'

// Six motion personalities. Every creature has its own hand-written routine
// for each moment of its life (asleep on the screen, the stir before it
// wakes, its way of travelling to the sky, its idle up there, and what it
// does when tapped), with its own curves and timings rather than one shared
// routine with different numbers. Everything writes into caller-owned
// objects: nothing here allocates per frame.

const TAU = Math.PI * 2

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}
function smooth(t: number): number {
  const k = clamp01(t)
  return k * k * (3 - 2 * k)
}
function easeInOutSine(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t))
}
function easeOutCubic(t: number): number {
  return 1 - (1 - clamp01(t)) ** 3
}
function easeOutBack(t: number): number {
  const k = clamp01(t) - 1
  return 1 + 2.4 * k * k * k + 1.4 * k * k
}
/** 0 → 1 → 0 across [a, b]. */
function bump(t: number, a: number, b: number): number {
  return t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI)
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
/** 0 at both ends of a reaction, 1 in between with soft shoulders: how much it takes over from the idle. */
function envelope(k: number, edge = 0.15): number {
  return smooth(k / edge) * smooth((1 - k) / edge)
}
/** A blink: eyes shut briefly once per `period` seconds. */
function blink(t: number, period: number, offset: number, length = 0.14): number {
  const c = (t + offset) % period
  return c < length ? 1 - bump(c, 0, length) : 1
}

/** How the dotted outline breathes and twitches while the creature sleeps (screen cm, about its centre). */
export type SleepPose = { sx: number; sy: number; dx: number; dy: number; roll: number; part: number; partLift: number }

/** One sleep ring, bubble, spout drop or smoke ring, relative to where it rises from (cm). */
export type Ring = { x: number; y: number; r: number; alpha: number }

/** A paper creature card in the world. */
export type CreaturePose = {
  x: number
  y: number
  z: number
  /** Turn over and back in the card's own plane (radians; mirrored at π): the dragon's barrel roll. */
  spin: number
  /** Horizontal offset of the axis it spins or turns over about, from the creature's centre (cm, before scale). */
  hinge: number
  /** −1..1: which way it faces (the card mirrors through edge-on to turn around, or over like a page about `hinge`). */
  facing: number
  roll: number
  sx: number
  sy: number
  /** Angle of the moving part (wing, tail, flukes, shell) about its pivot. */
  part: number
  /** Lift of the moving part (cm). */
  partLift: number
  /** 0 shut .. 1 open. */
  eye: number
  scale: number
  /** 0..1: how much of the dark shadow face still shows. */
  dark: number
}

export function restPose(out: CreaturePose): CreaturePose {
  out.spin = 0
  out.hinge = 0
  out.roll = 0
  out.sx = 1
  out.sy = 1
  out.part = 0
  out.partLift = 0
  out.eye = 1
  out.dark = 0
  return out
}

export function blankPose(): CreaturePose {
  return restPose({ x: 0, y: 0, z: 0, spin: 0, hinge: 0, facing: 1, roll: 0, sx: 1, sy: 1, part: 0, partLift: 0, eye: 1, scale: 1, dark: 0 })
}

export type Personality = {
  /** Sleep on the screen; `stir` 0..1 rises as the outline fills. */
  sleep(t: number, stir: number, out: SleepPose): void
  /** Sleep rings rising from the creature's snore point; returns how many of `out` are used (≤ 4). */
  rings(t: number, stir: number, out: Ring[]): number
  /** The beat before it peels off, k 0..1 over ANTICIPATE_S. Applied on top of a rest pose. */
  anticipate(k: number, out: CreaturePose): void
  gaitSeconds: number
  /** Travel from where the peel ended to its home in the sky, k 0..1. Sets x, y and body motion. */
  gait(k: number, fromX: number, fromY: number, toX: number, toY: number, out: CreaturePose): void
  /** Idle at home in the sky. Sets x, y and body motion around the home point. */
  idle(t: number, homeX: number, homeY: number, out: CreaturePose): void
  /** Sky rings (spouts, bubbles, smoke) while idle; returns how many are used. */
  skyRings(t: number, out: Ring[]): number
  reactSeconds: number
  /** After a tap, k 0..1, layered on top of idle. Returns true once the creature should face the other way. */
  react(k: number, out: CreaturePose): boolean
}

export const SILHOUETTE_S = 0.45
export const ANTICIPATE_S = 0.85
export const PEEL_S = 0.95

function setRing(out: Ring, x: number, y: number, r: number, alpha: number): void {
  out.x = x
  out.y = y
  out.r = r
  out.alpha = alpha
}

// --- bird: quick, fluttery, a little nervous --------------------------------

const bird: Personality = {
  sleep(t, stir, o) {
    const ph = (t / 1.7) % 1
    // A quick inhale and a long, slow exhale.
    const breath = ph < 0.28 ? smooth(ph / 0.28) : 1 - smooth((ph - 0.28) / 0.72)
    const burst = t % 5.3
    const flutter = burst < 0.5 ? Math.sin((burst / 0.5) * 3 * TAU) * (1 - burst / 0.5) : 0
    o.sx = 1 + 0.012 * breath
    o.sy = 1 + 0.03 * breath
    o.dx = 0
    o.dy = 0.25 * breath
    o.roll = stir * 0.05 * Math.sin(t * 7.3)
    o.part = (0.05 + 0.14 * stir) * flutter + 0.03 * breath + stir * 0.06 * Math.sin(t * 9)
    o.partLift = 0
  },
  rings(t, stir, out) {
    let n = 0
    const period = 1.7 - stir * 0.5
    for (let i = 0; i < 2; i++) {
      const born = (Math.floor(t / period) - i) * period + 0.28 * period
      const age = t - born
      if (age < 0 || age > 2.4) continue
      setRing(out[n++], age * 0.8, age * 3.2, 0.45 + age * 0.35, Math.sin((age / 2.4) * Math.PI) * 0.8)
    }
    return n
  },
  anticipate(k, o) {
    // Ruffles its feathers, half-opens the wing, looks up.
    const jitter = Math.sin(k * TAU * 7) * (1 - k) * 0.07
    o.sx = 1 + jitter
    o.sy = 1 - jitter
    o.part = 0.3 * smooth(k * 1.4)
    o.roll = 0.1 * smooth(k)
  },
  gaitSeconds: 3.2,
  gait(k, fx, fy, tx, ty, o) {
    const t = k * 3.2
    // Three flap-flap-glide surges: flapping pushes it on, gliding coasts.
    const leg = (k * 3) % 1
    const flapping = leg < 0.6
    const along = (Math.floor(k * 3) + (flapping ? smooth(leg / 0.6) * 0.75 : 0.75 + 0.25 * easeOutCubic((leg - 0.6) / 0.4))) / 3
    const u = k >= 1 ? 1 : along
    o.x = lerp(fx, tx, u)
    o.y = lerp(fy, ty, u) + Math.sin(u * Math.PI) * 7 + (flapping ? Math.sin(t * TAU * 5) * 0.4 : -0.3)
    o.part = flapping ? Math.sin(t * TAU * 5) * 0.55 : 0.35
    o.roll = flapping ? 0.12 : -0.05
    o.sx = 1
    o.sy = 1
  },
  idle(t, hx, hy, o) {
    // Bursts of three flaps, then a glide that sinks a little.
    const c = t % 2
    const flapping = c < 0.75
    const climb = flapping ? smooth(c / 0.75) : 1 - smooth((c - 0.75) / 1.25)
    o.x = hx + Math.sin(t * 0.4) * 1.2
    o.y = hy + climb * 0.9 + (flapping ? Math.abs(Math.sin(c * TAU * 4)) * 0.25 : 0)
    o.part = flapping ? Math.sin(c * TAU * 4) * 0.55 : 0.3 - smooth((c - 0.75) / 1.25) * 0.2
    const tiltAt = t % 3.7
    o.roll = tiltAt < 0.3 ? bump(tiltAt, 0, 0.3) * 0.14 : 0
    o.sx = 1
    o.sy = 1
    o.eye = blink(t, 2.9, 0.4)
  },
  skyRings() {
    return 0
  },
  reactSeconds: 0.95,
  react(k, o) {
    // A little loop-the-loop.
    const u = easeInOutSine(k)
    o.roll += TAU * u
    o.x += Math.sin(TAU * u) * 2.5 * Math.sign(o.facing || 1)
    o.y += (1 - Math.cos(TAU * u)) * 2.5
    o.part = lerp(o.part, Math.sin(k * TAU * 6) * 0.6, envelope(k))
    return false
  },
}

// --- fish: fluid and sinuous --------------------------------------------------

const fish: Personality = {
  sleep(t, stir, o) {
    const gill = 0.5 - 0.5 * Math.cos((TAU * t) / 3.2)
    o.sx = 1 + 0.008 * gill
    o.sy = 1 + 0.02 * gill
    o.dx = Math.sin((TAU * t) / 6.1) * 0.3 * (1 + stir * 2)
    o.dy = 0
    o.roll = 0
    o.part = Math.sin((TAU * t) / 2.3 - 0.8) * (0.06 + 0.2 * stir)
    o.partLift = 0
  },
  rings(t, stir, out) {
    let n = 0
    const period = 2.2 - stir * 0.8
    for (let i = 0; i < 2; i++) {
      const born = (Math.floor(t / period) - i) * period
      const age = t - born
      if (age < 0 || age > 3.5) continue
      // Bubbles wobble as they rise.
      setRing(out[n++], Math.sin(age * 3.4 + i) * 0.7, age * 2.4, 0.4 + 0.12 * Math.sin(age * 5) + age * 0.1, Math.min(1, age * 3) * (1 - age / 3.5) * 0.85)
    }
    return n
  },
  anticipate(k, o) {
    // Two sharp tail flicks and a wriggle.
    o.part = Math.sin(k * TAU * 2) * 0.45 * (1 - k * 0.4)
    o.roll = Math.sin(k * TAU * 2 + 1) * 0.05
    o.sx = 1 + 0.05 * Math.sin(k * Math.PI)
  },
  gaitSeconds: 3.6,
  gait(k, fx, fy, tx, ty, o) {
    const t = k * 3.6
    const u = easeInOutSine(k)
    const dx = tx - fx
    const dy = ty - fy
    const len = Math.hypot(dx, dy) || 1
    // An S-curve across the line of travel that straightens as it arrives.
    const side = Math.sin(k * TAU * 1.5) * 5 * (1 - k)
    o.x = lerp(fx, tx, u) + (-dy / len) * side
    o.y = lerp(fy, ty, u) + (dx / len) * side
    o.roll = Math.cos(k * TAU * 1.5) * 0.3 * (1 - k)
    o.part = Math.sin(t * TAU * 2.2) * 0.45
    o.sx = 1 + 0.04 * Math.sin(t * TAU * 2.2 + 1)
    o.sy = 1
  },
  idle(t, hx, hy, o) {
    // A slow figure-eight, turning round at each end.
    o.x = hx + Math.sin(t * 0.55) * 3.5
    o.y = hy + Math.sin(t * 1.1) * 1.6
    o.roll = Math.cos(t * 1.1) * 0.22 * Math.sign(Math.cos(t * 0.55))
    o.part = Math.sin(t * TAU * 1.6) * 0.35
    o.sx = 1
    o.sy = 1
    o.eye = blink(t, 4.1, 1.3)
  },
  skyRings(t, out) {
    const age = t % 5.5
    if (age > 2.6) return 0
    setRing(out[0], Math.sin(age * 3) * 0.6, age * 2, 0.35 + age * 0.08, (1 - age / 2.6) * 0.7)
    return 1
  },
  reactSeconds: 1.4,
  react(k, o) {
    // Darts forward, then glides back.
    const f = Math.sign(o.facing || 1)
    o.x += f * 8 * (k < 0.2 ? easeOutCubic(k / 0.2) : 1 - smooth((k - 0.2) / 0.8))
    const dash = bump(k, 0, 0.35)
    o.sx *= 1 + 0.25 * dash
    o.sy *= 1 - 0.15 * dash
    o.part = lerp(o.part, Math.sin(k * TAU * 7) * 0.5 * (1 - k), envelope(k))
    return false
  },
}

// --- snail: slow, deliberate, with a springy shell ------------------------------

const snail: Personality = {
  sleep(t, stir, o) {
    const b = (0.5 - 0.5 * Math.cos((TAU * t) / 5)) ** 1.5
    o.sx = 1 + 0.02 * b
    o.sy = 1
    o.dx = 0
    o.dy = 0
    o.roll = stir * 0.02 * Math.sin(t * 0.9)
    o.part = stir * 0.1 * Math.sin(t * 1.3)
    o.partLift = 0.5 * b
  },
  rings(t, _stir, out) {
    const age = t % 5
    if (age > 4.6) return 0
    setRing(out[0], -age * 0.4, age * 1.5, 0.8 + age * 0.3, bump(age, 0, 4.6) * 0.7)
    return 1
  },
  anticipate(k, o) {
    // A long slow stretch while the shell lifts.
    const s = easeInOutSine(k)
    o.sx = 1 + 0.15 * s
    o.sy = 1 - 0.05 * s
    o.partLift = 0.6 * smooth(k)
  },
  gaitSeconds: 5.5,
  gait(k, fx, fy, tx, ty, o) {
    const t = k * 5.5
    // It floats up like a balloon: rising first, drifting across later,
    // swinging under its shell like a pendulum.
    o.x = lerp(fx, tx, smooth((k - 0.2) / 0.8))
    o.y = lerp(fy, ty, easeOutCubic(k))
    o.roll = Math.sin((t * TAU) / 2.4) * 0.12 * (1 - k)
    o.part = 0
    o.partLift = 0.8 * Math.sin(k * Math.PI)
    o.sx = 1 - 0.08 * Math.sin(k * Math.PI)
    o.sy = 1
  },
  idle(t, hx, hy, o) {
    // Inching: a slow stretch, a quick pull-in, the shell catching up late.
    const c = t % 4
    const stretch = c < 2.8 ? smooth(c / 2.8) : 1 - smooth((c - 2.8) / 1.2)
    const lag = (t - 0.5) % 4
    o.x = hx
    o.y = hy
    o.sx = 1 + 0.12 * stretch
    o.sy = 1 - 0.03 * stretch
    o.partLift = 0.4 * (lag < 2.8 ? smooth(lag / 2.8) : 1 - smooth((lag - 2.8) / 1.2))
    o.part = 0
    const peek = t % 9
    o.roll = bump(peek, 6.5, 8.5) * 0.06
    o.eye = blink(t, 5.2, 2, 0.3)
  },
  skyRings() {
    return 0
  },
  reactSeconds: 1.9,
  react(k, o) {
    // Hides in its shell, wobbles, then peeks out slowly.
    const hide = k < 0.12 ? smooth(k / 0.12) : 1 - easeOutCubic((k - 0.45) / 0.55)
    o.sx *= 1 - 0.45 * hide
    o.sy *= 1 - 0.25 * hide
    o.part = lerp(o.part, Math.sin(k * TAU * 3) * 0.25 * (1 - k), envelope(k))
    return false
  },
}

// --- whale: huge, slow, oceanic -------------------------------------------------

const whale: Personality = {
  sleep(t, stir, o) {
    const b = 0.5 - 0.5 * Math.cos((TAU * t) / 6)
    o.sx = 1 + 0.015 * b
    o.sy = 1 + 0.035 * b
    o.dx = 0
    o.dy = 0.3 * b
    o.roll = stir * 0.03 * Math.sin(t * 0.8)
    o.part = -0.1 * b + stir * 0.12 * Math.sin(t * 1.1)
    o.partLift = 0
  },
  rings(t, _stir, out) {
    // A little fountain of three drops at the top of each breath.
    let n = 0
    const peak = Math.floor((t - 3) / 6) * 6 + 3
    for (let i = 0; i < 3; i++) {
      const age = t - peak - i * 0.18
      if (age < 0 || age > 1.6) continue
      setRing(out[n++], (i - 1) * age * 1.5, age * 4 - age * age * 1.2, 0.4 + age * 0.3, (1 - age / 1.6) * 0.8)
    }
    return n
  },
  anticipate(k, o) {
    // A huge breath in, flukes curling.
    const swell = Math.sin((Math.min(k, 0.8) / 0.8) * (Math.PI / 2)) ** 2 * (k > 0.8 ? 1 - (k - 0.8) * 2 : 1)
    o.sx = 1 + 0.06 * swell
    o.sy = 1 + 0.09 * swell
    o.part = -0.22 * smooth(k)
  },
  gaitSeconds: 5,
  gait(k, fx, fy, tx, ty, o) {
    const t = k * 5
    const u = easeInOutSine(k)
    o.x = lerp(fx, tx, u)
    o.y = lerp(fy, ty, u) + Math.sin(u * Math.PI) * 9
    o.roll = Math.sin((t * TAU) / 2.2) * 0.1
    o.part = Math.sin((t * TAU) / 2.2 - Math.PI / 2) * 0.35
    o.sx = 1
    o.sy = 1
  },
  idle(t, hx, hy, o) {
    const w = (t * TAU) / 5.5
    o.x = hx + Math.sin(t * 0.3) * 2
    o.y = hy + Math.sin(w) * 1.2
    o.roll = Math.sin(w + 0.9) * 0.07
    o.part = Math.sin(w - 0.6) * 0.3
    o.sx = 1
    o.sy = 1
    o.eye = blink(t, 6.3, 0.8, 0.22)
  },
  skyRings(t, out) {
    let n = 0
    const peak = Math.floor(t / 9) * 9
    for (let i = 0; i < 3; i++) {
      const age = t - peak - i * 0.16
      if (age < 0 || age > 1.6) continue
      setRing(out[n++], (i - 1) * age * 1.2, age * 3.6 - age * age * 1.1, 0.35 + age * 0.25, (1 - age / 1.6) * 0.8)
    }
    return n
  },
  reactSeconds: 2,
  react(k, o) {
    // A slow breach and a fluke slap on the way down.
    o.y += Math.sin(k * Math.PI) * 5
    o.roll += Math.sin(k * Math.PI) * 0.35
    o.part += -0.2 * Math.sin(k * Math.PI) - 0.6 * bump(k, 0.7, 0.9)
    return false
  },
}

// --- fox: playful and springy ---------------------------------------------------

const fox: Personality = {
  sleep(t, stir, o) {
    const b = 0.5 - 0.5 * Math.cos((TAU * t) / 2.6)
    const c = t % 4.4
    o.sx = 1 + 0.01 * b
    o.sy = 1 + 0.022 * b
    o.dx = 0
    o.dy = 0
    const flick = t % 7.1
    o.roll = flick < 0.18 ? bump(flick, 0, 0.18) * 0.03 : 0
    o.part = (c < 1.2 ? 0.14 * Math.sin((c / 1.2) * Math.PI) : 0) + stir * 0.1 * Math.abs(Math.sin(t * 6))
    o.partLift = 0
  },
  rings(t, stir, out) {
    let n = 0
    const period = 2.6 - stir * 0.6
    for (let i = 0; i < 2; i++) {
      const born = (Math.floor(t / period) - i) * period
      const age = t - born
      if (age < 0 || age > 3) continue
      setRing(out[n++], age * 1.4, age * 2.2, 0.55 + age * 0.25, bump(age, 0, 3) * 0.8)
    }
    return n
  },
  anticipate(k, o) {
    // Crouches low with an excited tail, ready to spring.
    const crouch = easeOutBack(Math.min(1, k * 1.6))
    o.sy = 1 - 0.16 * crouch
    o.sx = 1 + 0.1 * crouch
    o.part = 0.3 * Math.sin(k * TAU * 3) * k
  },
  gaitSeconds: 3,
  gait(k, fx, fy, tx, ty, o) {
    // Three bounding leaps.
    const hops = 3
    const h = Math.min(hops - 1, Math.floor(k * hops))
    const f = k >= 1 ? 1 : k * hops - h
    const u = (h + smooth(f)) / hops
    o.x = lerp(fx, tx, u)
    o.y = lerp(fy, ty, u) + Math.sin(f * Math.PI) * 5
    const squash = f < 0.12 ? 1 - bump(f, 0, 0.24) * 0.15 : f > 0.88 ? 1 - bump(f, 0.76, 1) * 0.12 : 1 + 0.12 * Math.sin(((f - 0.12) / 0.76) * Math.PI)
    o.sy = squash
    o.sx = 1 / Math.sqrt(squash)
    o.part = Math.sin(f * Math.PI) * 0.35
    o.roll = (0.5 - f) * 0.3
  },
  idle(t, hx, hy, o) {
    // Sits: a lazy S-shaped tail swish, a curious head tilt, now and then a hop.
    const hop = t % 7.7
    const inHop = hop < 0.45
    const hf = hop / 0.45
    o.x = hx
    o.y = hy + (inHop ? Math.sin(hf * Math.PI) * 1.2 : 0)
    o.sy = inHop ? 1 + 0.1 * Math.sin(hf * Math.PI) : 1 + 0.015 * Math.sin(t * 2.4)
    o.sx = 1 / Math.sqrt(o.sy)
    o.part = 0.18 * Math.sin(t * 1.3) + 0.08 * Math.sin(t * 2.9 + 1)
    const tilt = t % 4.3
    o.roll = tilt < 1.2 ? smooth(tilt / 0.25) * (1 - smooth((tilt - 0.95) / 0.25)) * 0.12 : 0
    o.eye = blink(t, 3.4, 0.2)
  },
  skyRings() {
    return 0
  },
  reactSeconds: 1,
  react(k, o) {
    // Crouch, spring up stretched, turn round in the air, and land with a squash.
    const s = 1 - 0.18 * bump(k, 0, 0.3) + 0.1 * bump(k, 0.2, 0.6) - 0.15 * bump(k, 0.86, 1)
    o.sy *= s
    o.sx /= Math.sqrt(s)
    if (k > 0.25) {
      const f = (k - 0.25) / 0.75
      o.y += Math.sin(f * Math.PI) * 6
      o.part += 0.4 * Math.sin(f * Math.PI)
    }
    return k >= 0.5
  },
}

// --- dragon: powerful, a kite on the wind ----------------------------------------

/** A wing beat with a fast, strong downstroke and a slow recovery. */
function wingBeat(p: number): number {
  return p < 0.3 ? 0.5 - (p / 0.3) : -0.5 + (p - 0.3) / 0.7
}

const dragon: Personality = {
  sleep(t, stir, o) {
    const ph = (t / 3.6) % 1
    const b = ph < 0.45 ? smooth(ph / 0.45) : 1 - smooth((ph - 0.45) / 0.55)
    // A snore rumbles at the top of each breath.
    const rumble = ph > 0.4 && ph < 0.55 ? Math.sin(t * 60) * 0.12 * bump(ph, 0.4, 0.55) : 0
    const twitch = t % 8.3
    o.sx = 1 + 0.01 * b
    o.sy = 1 + 0.025 * b
    o.dx = rumble
    o.dy = 0
    o.roll = stir * 0.04 * Math.sin(t * 1.6)
    o.part = bump(twitch, 0, 1) * 0.08 + stir * 0.12 * smooth(Math.sin(t * 1.2))
    o.partLift = 0
  },
  rings(t, stir, out) {
    let n = 0
    const period = 3.6
    for (let i = 0; i < 2; i++) {
      const born = (Math.floor(t / period) - i) * period + 0.55 * period
      const age = t - born
      if (age < 0 || age > 2.6) continue
      // Smoke rings that widen as they drift out of the snout.
      setRing(out[n++], age * 2.4, age * 1.2, 0.6 + age * 0.9, (1 - age / 2.6) * (0.5 + stir * 0.3))
    }
    return n
  },
  anticipate(k, o) {
    // Rears back, grows, spreads its wing.
    const s = smooth(k)
    o.roll = 0.14 * s
    o.sx = 1 + 0.06 * s
    o.sy = 1 + 0.06 * s
    o.part = 0.45 * s
  },
  gaitSeconds: 4,
  gait(k, fx, fy, tx, ty, o) {
    const t = k * 4
    const p = (t / 0.7) % 1
    const dx = tx - fx
    const dy = ty - fy
    const len = Math.hypot(dx, dy) || 1
    const zig = Math.sin(k * TAU * 2) * 4 * (1 - k)
    const surge = p < 0.3 ? Math.sin((p / 0.3) * Math.PI) * 0.8 : 0
    o.x = lerp(fx, tx, k) + (-dy / len) * zig
    o.y = lerp(fy, ty, k) + (dx / len) * zig + surge
    o.part = wingBeat(p)
    o.roll = Math.cos(k * TAU * 2) * 0.18 * (1 - k)
    o.sx = 1
    o.sy = 1
  },
  idle(t, hx, hy, o) {
    const p = (t / 1.6) % 1
    o.x = hx + Math.sin(t * 0.45) * 3
    o.y = hy + Math.sin(t * 0.9) * 1.4 + (p < 0.3 ? Math.sin((p / 0.3) * Math.PI) * 0.5 : 0)
    o.part = wingBeat(p) * 0.8
    o.roll = Math.cos(t * 0.45) * 0.12
    o.sx = 1
    o.sy = 1
    o.eye = blink(t, 4.7, 3.1)
  },
  skyRings(t, out) {
    const age = t % 8
    if (age > 2.2) return 0
    setRing(out[0], age * 2, age * 1, 0.5 + age * 0.8, (1 - age / 2.2) * 0.55)
    return 1
  },
  reactSeconds: 1.3,
  react(k, o) {
    // A barrel roll and a proud puff.
    o.spin += TAU * easeInOutSine(k)
    o.y += Math.sin(k * Math.PI) * 2
    o.part = lerp(o.part, wingBeat((k * 3) % 1), envelope(k))
    return false
  },
}

export const PERSONALITIES: Record<CreatureKind, Personality> = { bird, fish, snail, whale, fox, dragon }

/**
 * Homes in the paper sky (world cm, on the sky layer), one per sky slot.
 * Placed by their projection: clear of the moon's halo, each other, the pine
 * tops and the top edge, and (in the screen plane, not just on screen) of the
 * proscenium, even at the whale's size: a creature that only perspective
 * lifts clear would still pass behind the valance on its way back.
 */
export const SKY_HOMES: readonly { x: number; y: number }[] = [
  { x: -24, y: 55.5 },
  { x: 26, y: 55.5 },
  { x: -46, y: 55 },
  { x: 60, y: 35 },
  { x: -61, y: 41 },
  { x: 0, y: 59.5 },
  { x: -66, y: 28 },
  { x: 62, y: 25.5 },
]
export const SKY_Z = -12
export const SKY_SCALE = 0.33

/** Each slot sits a hair nearer than the last, so companions drifting across each other never flicker. */
export function skyDepth(slot: number): number {
  return SKY_Z + slot * 0.2
}

/** Size in the sky relative to SKY_SCALE: the whale is huge, the snail small. */
const SKY_SIZE: Record<CreatureKind, number> = { bird: 1, fish: 0.95, snail: 0.8, whale: 1.15, fox: 0.95, dragon: 0.95 }

export function skyScale(kind: CreatureKind): number {
  return SKY_SCALE * SKY_SIZE[kind]
}

/**
 * A waking creature's size at gait progress k: at its sky size by 60% of the
 * trip, so it crosses the curtains and valance small rather than covering them.
 */
export function flightScale(kind: CreatureKind, k: number): number {
  return 1 + (skyScale(kind) - 1) * smooth(k * 1.6)
}

/**
 * A creature card's paper layers along its own z (cm, before scale), with
 * air between each so no two faces share a plane: the offset shadow card,
 * the backing, the moving part when it hangs behind (tails, flukes), the
 * body, the eye, and the moving part when it sits in front (wings, shells).
 * While dark, the shadow face takes the body's place just in front of the
 * eye's white, so only the golden pupil shows through it.
 */
export const CREATURE_STACK = {
  drop: -0.86,
  backing: -0.646,
  /** Thickness of the body card, centred on 0. */
  body: 0.36,
  /** Thickness of the moving part's card, */
  part: 0.324,
  /** centred this far in front of (or behind) the body. */
  partZ: 0.442,
  /** The eye's white; its pupil and glint lie 0.02 and 0.04 above it. */
  eye: 0.2,
  darkFace: 0.21,
  /** Nearest face: a front part's. */
  front: 0.604,
} as const

/** Just in front of the proscenium's nearest face, allowing for the creature card's own thickness. */
export const FLIGHT_Z = PROSCENIUM.front + 0.9

/**
 * Where a creature wakes on the screen: its hindmost layer clear of what
 * lies on the paper (the sleeping outline's dots and rings, the shadows,
 * the stars a tap on the screen throws, all within 0.6 cm of it).
 */
export const WAKE_Z = 1.3

/**
 * Where a tap's stars fly (z, cm), clear of all else there: just off the lit
 * paper, behind a waking creature; over the proscenium, in front of every
 * waking and flying creature (the peel comes nearest, at 6.8) and behind the
 * nearest stand; in the night, in front of the companions at home.
 */
export const SPARK_Z = { screen: 0.6, proscenium: 7, sky: skyDepth(SKY_HOMES.length - 1) + 0.4 } as const

/** How far a creature's offset shadow card and backing reach past its outline, and its wing past it mid-beat (cm, world). */
const PAPER_REACH = 1

/**
 * How deep a waking creature flies at gait progress k, with its centre at
 * (x, y), reaching rx and ry to each side: where the peel left it, in front
 * of the screen and its proscenium, while over them (behind, it would pass
 * through the paper); easing back to its sky depth over its first 10 cm
 * clear of them, and over its last stretch within ever less, so it is on the
 * sky layer by arrival at any home a little clear of them. At a home right
 * by the frame it lands a touch short and settles back there (SETTLE_S).
 */
export function flightDepth(k: number, x: number, y: number, rx: number, ry: number, skyZ = SKY_Z): number {
  const reach = 10 - 9.75 * smooth((k - 0.86) / 0.14)
  const back = smooth(clearOfProscenium(x, y, rx + PAPER_REACH, ry + PAPER_REACH) / reach)
  return FLIGHT_Z + (skyZ - FLIGHT_Z) * back
}

/** How long a creature that landed short of its sky layer takes to settle back onto it, at home and clear of everything (s). */
export const SETTLE_S = 0.8

/**
 * The shared peel: the dark card turns over like a page about its tail
 * edge, narrowing onto it and opening out mirrored on the far side, in
 * colour. It turns in its own plane: a page swung out toward the child
 * would sweep a whole creature's width into the stands on the stage.
 */
export function peelPose(k: number, hingeOffset: number, out: CreaturePose): CreaturePose {
  const u = easeInOutSine(k)
  out.spin = 0
  out.facing = Math.cos(u * Math.PI)
  out.hinge = hingeOffset
  out.dark = u < 0.5 ? 1 : 0
  // Lifting off as it turns: a big creature lands partly beyond the screen's edge, so it lands in front of the frame.
  out.z = WAKE_Z + (FLIGHT_Z - WAKE_Z) * u + Math.sin(u * Math.PI) * 3
  return out
}
