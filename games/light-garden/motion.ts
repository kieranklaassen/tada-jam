import { WAKING_SECONDS, type Creature } from './creatures'
import type { CreatureKind } from './layout'

// Four motion personalities. Each creature has its own routine for sleeping,
// stirring, waking, playing, getting drowsy, wandering, and being carried,
// with its own timing and curves. None is another's routine with different
// numbers:
//   jellyfish  pulses: a sharp squeeze and a slow relax lift it; it sinks between
//   moth       flutters in restless loops, lands, fans its wings, flutters again
//   snail      oozes out, stalks first, and slides in slow peristaltic waves
//   fish       sleeps on its side, wakes with a C-start, bursts and glides in figure eights

export type Pose = {
  /** Offset from the bed on the table (cm). */
  dx: number
  dy: number
  /** Height above the panel (cm). */
  alt: number
  /** Which way it faces on the table (radians, 0 = +x). */
  heading: number
  roll: number
  pitch: number
  /** Vertical squash (1 = rest) and lengthwise stretch (1 = rest). */
  squash: number
  stretch: number
  /** 0 closed .. 1 open. */
  eyes: number
  /** Emissive core: dim asleep, bright awake. */
  glow: number
  /** Kind channels:
   *  jelly: a bell squeeze, b tentacle sway, c tentacle droop
   *  moth:  a wing spread, b flap, c antenna lift
   *  snail: a body out of shell, b left stalk, c right stalk
   *  fish:  a tail beat, b fin fan, c body C-bend */
  a: number
  b: number
  c: number
}

export function makePose(): Pose {
  return { dx: 0, dy: 0, alt: 0, heading: 0, roll: 0, pitch: 0, squash: 1, stretch: 1, eyes: 0, glow: 0.15, a: 0, b: 0, c: 0 }
}

export type Carry = { held: boolean; heldFor: number }

const SLEEP_HEADING: Readonly<Record<CreatureKind, number>> = { moth: 1.9, fish: 2.75, snail: 0.55, jelly: Math.PI / 2 }
const TAU = Math.PI * 2

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const smooth = (t: number) => {
  const k = clamp01(t)
  return k * k * (3 - 2 * k)
}
const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3
const backOut = (t: number) => {
  const k = clamp01(t) - 1
  return 1 + 2.4 * k * k * k + 1.4 * k * k
}
const elasticOut = (t: number) => {
  const k = clamp01(t)
  return k === 0 || k === 1 ? k : 2 ** (-9 * k) * Math.sin((k * 9 - 0.75) * (TAU / 3)) + 1
}
const frac = (t: number) => t - Math.floor(t)
/** A decaying bump for reactions: 0 at age 0, peaks early, gone by `length`. */
const bump = (age: number, length: number) => (age < 0 || age > length ? 0 : Math.sin((age / length) * Math.PI) * (1 - age / length))
/** A decaying shake at `frequency` for `length` seconds after an event (0 when there was none). */
const shake = (age: number, frequency: number, length: number) => {
  const envelope = bump(age, length)
  return envelope === 0 ? 0 : Math.sin(age * frequency) * envelope
}

function reset(out: Pose, kind: CreatureKind): void {
  out.dx = 0
  out.dy = 0
  out.alt = 0
  out.heading = SLEEP_HEADING[kind]
  out.roll = 0
  out.pitch = 0
  out.squash = 1
  out.stretch = 1
  out.eyes = 0
  out.glow = 0.16
  out.a = 0
  out.b = 0
  out.c = 0
}

/** Seconds since it finished waking (negative while still waking). */
function awakeAge(creature: Creature, now: number): number {
  return now - creature.wokeAt - WAKING_SECONDS[creature.kind]
}

/** How far its play wanders from the bed: grows after waking, shrinks while drowsy. */
function range(creature: Creature, now: number): number {
  if (creature.phase === 'awake') return smooth(awakeAge(creature, now) / 1.4)
  if (creature.phase === 'drowsy') return 1 - smooth(creature.phaseT / 2.2)
  return 0
}

function headingOf(fromX: number, fromY: number, toX: number, toY: number, fallback: number): number {
  const dx = toX - fromX
  const dy = toY - fromY
  return dx * dx + dy * dy < 1e-6 ? fallback : Math.atan2(dy, dx)
}

// --- jellyfish ---------------------------------------------------------------

function jellyPulse(p: number): number {
  // A quick squeeze (first sixth), then a long slow relax.
  return p < 0.16 ? easeOut(p / 0.16) : 1 - smooth((p - 0.16) / 0.84)
}

function jelly(creature: Creature, now: number, carry: Carry, out: Pose): void {
  const breath = 0.5 - 0.5 * Math.cos(now * 0.85 + 1.3)
  out.heading = Math.PI / 2
  switch (creature.phase) {
    case 'asleep': {
      const stir = bump(now - creature.stirAt, 1.4)
      out.a = 0.06 * breath + 0.4 * stir
      out.alt = 0.9 + 0.15 * breath + 1.1 * stir
      out.b = 0.12
      out.c = 1 - 0.5 * stir
      out.glow = 0.16 + 0.05 * breath + 0.3 * stir
      out.squash = 1 - 0.05 * breath
      break
    }
    case 'waking': {
      const t = creature.phaseT
      if (t < 0.7) {
        const squeeze = smooth(t / 0.7)
        out.a = 0.8 * squeeze
        out.alt = 0.9 - 0.35 * squeeze
        out.squash = 1 - 0.18 * squeeze
      } else {
        const k = (t - 0.7) / 1.1
        const pulse = jellyPulse(frac(k * 3))
        out.a = 0.65 * pulse
        out.alt = 0.55 + 4.2 * easeOut(k) + 0.6 * pulse
        out.squash = 1 + 0.12 * pulse
      }
      out.c = 1 - smooth(t / 1.6)
      out.b = 0.3
      out.eyes = smooth((t - 0.8) / 0.3)
      out.glow = 0.2 + 0.8 * smooth((t - 0.6) / 0.8)
      break
    }
    case 'awake':
    case 'drowsy':
    case 'wandering': {
      const drowsy = creature.phase === 'drowsy' ? smooth(creature.phaseT / DROWSY_BLEND) : 0
      const period = creature.phase === 'wandering' ? 1.3 : 1.6 + 1.6 * drowsy
      const age = Math.max(0, awakeAge(creature, now))
      const p = frac(age / period)
      const pulse = jellyPulse(p) * (1 - 0.5 * drowsy)
      const lift = p < 0.16 ? p / 0.16 : Math.exp(-(p - 0.16) * 2.4)
      const reach = range(creature, now)
      const orbit = age * 0.26 + 1.3
      out.dx = Math.cos(orbit) * 6 * reach
      out.dy = Math.sin(orbit) * 4.5 * reach
      out.a = 0.62 * pulse
      out.alt = (4.6 - 3.2 * drowsy) + 1.3 * lift
      out.squash = 1 + 0.14 * pulse
      out.b = 0.7 - 0.4 * drowsy
      out.c = drowsy * 0.8
      out.eyes = 1 - 0.7 * drowsy
      out.glow = 1 - 0.35 * drowsy
      out.roll = Math.sin(orbit + 0.5) * 0.12 * reach
      const nudge = now - creature.nudgeAt
      if (nudge < 1.2) out.b += 1.4 * bump(nudge, 1.2)
      break
    }
  }
  if (carry.held) {
    const squish = Math.sin(carry.heldFor * 11) * Math.exp(-carry.heldFor * 1.5)
    out.a = 0.3 + 0.3 * squish
    out.c = 1
    out.squash = 1 - 0.12 * squish
  }
}

const DROWSY_BLEND = 2.4

// --- moth --------------------------------------------------------------------

function moth(creature: Creature, now: number, carry: Carry, out: Pose): void {
  switch (creature.phase) {
    case 'asleep': {
      const twitch = frac(now * 0.21 + 0.4) < 0.05 ? Math.sin(frac(now * 0.21 + 0.4) * 400) : 0
      const stir = bump(now - creature.stirAt, 0.9)
      out.a = 0.04 + 0.12 * stir
      out.b = stir * Math.sin(now * 115) * 0.35
      out.c = 0.15 + 0.25 * twitch + 0.7 * stir
      out.alt = 0.25
      out.glow = 0.16 + 0.25 * stir
      out.squash = 1 + 0.03 * Math.sin(now * 1.1)
      break
    }
    case 'waking': {
      const t = creature.phaseT
      const warm = clamp01(t / 0.85)
      out.c = 0.2 + 0.8 * smooth(t / 0.4)
      if (t < 0.85) {
        // Warming up: a shiver that grows before it dares to fly.
        out.a = 0.05 + 0.25 * warm
        out.b = Math.sin(now * 105) * 0.3 * warm
        out.alt = 0.25
        out.squash = 1 - 0.08 * warm
      } else {
        const pop = (t - 0.85) / 0.65
        out.a = 0.3 + 0.6 * backOut(pop)
        out.b = Math.sin(now * TAU * 9)
        out.alt = 0.25 + 6 * backOut(pop)
        out.squash = 1 + 0.1 * bump(t - 0.85, 0.4)
      }
      out.eyes = smooth((t - 0.3) / 0.3)
      out.glow = 0.2 + 0.8 * smooth((t - 0.5) / 0.9)
      break
    }
    case 'awake':
    case 'wandering': {
      const age = Math.max(0, awakeAge(creature, now))
      const cycle = frac(age / 8)
      const landing = creature.phase === 'awake' ? smooth((cycle - 0.68) / 0.08) * (1 - smooth((cycle - 0.96) / 0.04)) : 0
      const u = now * 0.95
      const reach = range(creature, now) * (1 - landing)
      const px = 8 * Math.sin(u * 1.1 + 0.6) + 2.2 * Math.sin(u * 3.4)
      const py = 5.5 * Math.sin(u * 0.72) + 2 * Math.cos(u * 2.9)
      const qx = 8 * Math.sin((u + 0.05) * 1.1 + 0.6) + 2.2 * Math.sin((u + 0.05) * 3.4)
      const qy = 5.5 * Math.sin((u + 0.05) * 0.72) + 2 * Math.cos((u + 0.05) * 2.9)
      out.dx = px * reach
      out.dy = py * reach
      const flap = Math.sin(now * TAU * 9)
      if (landing > 0.5) {
        // Resting on its bed, fanning its wings slowly.
        out.a = 0.55 + 0.4 * Math.sin(now * 4.2)
        out.b = 0
        out.alt = 0.25 + 6.5 * (1 - landing)
        out.squash = 1 - 0.1 * bump(cycle - 0.72, 0.05)
      } else {
        out.a = 0.85
        out.b = flap
        out.alt = 6.5 + 1.4 * Math.sin(u * 1.7) + 0.35 * flap
      }
      out.heading = creature.phase === 'wandering' ? headingOf(creature.from.x, creature.from.y, creature.to.x, creature.to.y, SLEEP_HEADING.moth) : headingOf(px, py, qx, qy, SLEEP_HEADING.moth)
      out.roll = (qx - px) * 0.25 * reach
      out.c = 0.9
      out.eyes = 1
      out.glow = 1
      const nudge = now - creature.nudgeAt
      if (nudge < 0.8) out.b = Math.sin(now * TAU * 16)
      break
    }
    case 'drowsy': {
      const t = creature.phaseT
      out.a = 0.55 - 0.45 * smooth(t / 2.5) + 0.2 * Math.sin(now * 2.2) * (1 - smooth(t / 2.5))
      out.alt = 0.25 + 6 * (1 - smooth(t / 0.8))
      out.c = 0.9 - 0.7 * smooth(t / 2.5)
      out.eyes = 1 - smooth((t - 1.5) / 1.5)
      out.glow = 1 - 0.6 * smooth(t / 3)
      break
    }
  }
  if (carry.held) {
    out.a = 0.9
    out.b = Math.sin(now * TAU * 14)
    out.c = 1
  }
}

// --- snail -------------------------------------------------------------------

function snail(creature: Creature, now: number, carry: Carry, out: Pose): void {
  switch (creature.phase) {
    case 'asleep': {
      const stirAge = now - creature.stirAt
      out.roll = 0.03 * Math.sin(now * 0.5) + 0.16 * shake(stirAge, 10, 1.1)
      out.b = 0.35 * bump(stirAge - 0.3, 1.2)
      out.glow = 0.16 + 0.2 * bump(stirAge, 1.5)
      break
    }
    case 'waking': {
      const t = creature.phaseT
      // Rocking in the shell, then oozing out, then one stalk and the other, springy.
      out.roll = 0.16 * Math.sin(t * 13) * clamp01(t / 0.9) * (1 - smooth((t - 0.9) / 0.4))
      out.a = smooth((t - 0.9) / 1.1)
      out.b = elasticOut((t - 1.6) / 0.7)
      out.c = elasticOut((t - 1.95) / 0.65)
      out.stretch = 1 + 0.12 * bump(t - 1.1, 0.9)
      out.eyes = out.b
      out.glow = 0.2 + 0.8 * smooth((t - 1) / 1.2)
      break
    }
    case 'awake':
    case 'wandering': {
      const age = Math.max(0, awakeAge(creature, now))
      const wave = Math.sin(now * 2.2)
      const reach = range(creature, now)
      // Always creeping forward, faster on each wave.
      const theta = 0.22 * age - 0.09 * Math.cos(2.2 * age)
      out.dx = Math.cos(theta) * 5 * reach
      out.dy = Math.sin(theta) * 3.5 * reach
      out.heading = creature.phase === 'wandering' ? headingOf(creature.from.x, creature.from.y, creature.to.x, creature.to.y, SLEEP_HEADING.snail) : reach > 0.05 ? Math.atan2(Math.cos(theta) * 3.5, -Math.sin(theta) * 5) : SLEEP_HEADING.snail
      out.a = 1
      out.stretch = 1 + 0.13 * wave
      out.squash = 1 - 0.06 * wave
      out.pitch = -0.05 * wave
      out.b = 1 + 0.16 * Math.sin(now * 1.3)
      out.c = 1 + 0.16 * Math.sin(now * 1.75 + 1)
      out.roll = 0.03 * Math.sin(now * 1.1)
      out.eyes = 1
      out.glow = 1
      const nudge = now - creature.nudgeAt
      if (nudge < 1.6) {
        const shy = bump(nudge, 1.6)
        out.b *= 1 - 0.8 * shy
        out.c *= 1 - 0.8 * shy
      }
      break
    }
    case 'drowsy': {
      const t = creature.phaseT
      out.b = 1 - smooth(t / 1.6)
      out.c = 1 - smooth((t - 0.3) / 1.6)
      out.a = 1 - 0.7 * smooth((t - 1) / 2)
      out.eyes = out.b
      out.glow = 1 - 0.6 * smooth(t / 3)
      break
    }
  }
  if (carry.held) {
    const tuck = smooth(carry.heldFor / 0.35)
    out.a *= 1 - tuck
    out.b *= 1 - tuck
    out.c *= 1 - tuck
    out.roll = 0.1 * Math.sin(carry.heldFor * 6)
  }
}

// --- fish --------------------------------------------------------------------

/** Burst-and-glide: distance along the path jumps on each tail burst, then coasts. */
function glide(age: number, cycle: number): number {
  const k = Math.floor(age / cycle)
  const p = frac(age / cycle)
  return k + (1 - Math.exp(-p * 3.2)) / (1 - Math.exp(-3.2))
}

function fish(creature: Creature, now: number, carry: Carry, out: Pose): void {
  switch (creature.phase) {
    case 'asleep': {
      const stirAge = now - creature.stirAt
      const flick = shake(stirAge, 17, 0.9)
      out.alt = 1.3 + 0.18 * Math.sin(now * 0.7)
      out.roll = 0.42 - 0.2 * bump(stirAge, 1)
      out.a = 0.05 * Math.sin(now * 1.1) + 0.6 * flick
      out.b = 0.2 + 0.15 * Math.sin(now * 1.4)
      out.glow = 0.16 + 0.25 * bump(stirAge, 1.2)
      break
    }
    case 'waking': {
      const t = creature.phaseT
      if (t < 0.3) {
        // C-start: the whole body curls before it snaps.
        out.c = easeOut(t / 0.3)
        out.roll = 0.42 * (1 - t / 0.3)
      } else {
        const dart = easeOut((t - 0.3) / 0.6)
        out.c = 1 - smooth((t - 0.3) / 0.12)
        out.a = Math.sin((t - 0.3) * 42) * 0.9 * (1 - dart)
        out.dx = Math.cos(SLEEP_HEADING.fish) * 5 * dart * (1 - smooth((t - 0.6) / 0.3))
        out.dy = Math.sin(SLEEP_HEADING.fish) * 5 * dart * (1 - smooth((t - 0.6) / 0.3))
      }
      out.alt = 1.3 + 0.5 * smooth(t / 0.9)
      out.eyes = smooth(t / 0.2)
      out.glow = 0.2 + 0.8 * smooth((t - 0.2) / 0.5)
      break
    }
    case 'awake':
    case 'drowsy':
    case 'wandering': {
      const drowsy = creature.phase === 'drowsy' ? smooth(creature.phaseT / DROWSY_BLEND) : 0
      const age = Math.max(0, awakeAge(creature, now))
      const cycle = 1.9 + 2 * drowsy
      const p = frac(age / cycle)
      const s = glide(age, cycle) * 0.62 + 0.4
      const reach = range(creature, now)
      const x = 9 * Math.sin(s)
      const y = 5 * Math.sin(s) * Math.cos(s)
      const x2 = 9 * Math.sin(s + 0.04)
      const y2 = 5 * Math.sin(s + 0.04) * Math.cos(s + 0.04)
      out.dx = x * reach
      out.dy = y * reach
      out.heading = creature.phase === 'wandering' ? headingOf(creature.from.x, creature.from.y, creature.to.x, creature.to.y, SLEEP_HEADING.fish) : reach > 0.05 ? headingOf(x, y, x2, y2, SLEEP_HEADING.fish) : SLEEP_HEADING.fish
      const burst = p < 0.24 ? 1 - p / 0.24 : 0
      out.a = Math.sin(now * 37) * 0.85 * burst + 0.14 * Math.sin(now * 8.5) * (1 - burst)
      out.c = -Math.cos(s) * Math.sin(s) * 0.5 * reach
      out.b = 0.5 + 0.5 * Math.sin(now * 6.5)
      out.alt = 1.9 + 0.3 * Math.sin(now * 1.1) - 0.5 * drowsy
      out.roll = 0.42 * drowsy
      out.eyes = 1 - 0.8 * drowsy
      out.glow = 1 - 0.4 * drowsy
      const nudge = now - creature.nudgeAt
      if (nudge < 0.9) {
        // Headbutt, then a startled back-off.
        const recoil = bump(nudge, 0.9)
        out.dx -= Math.cos(out.heading) * 2.2 * recoil
        out.dy -= Math.sin(out.heading) * 2.2 * recoil
        out.a = Math.sin(now * 45) * recoil
      }
      break
    }
  }
  if (carry.held) {
    out.a = Math.sin(carry.heldFor * 24) * 0.9
    out.roll = 0.5 * Math.sin(carry.heldFor * 9)
    out.c = 0.4 * Math.sin(carry.heldFor * 12)
  }
}

/** Write the creature's pose at world time `now` into `out` (no allocation). */
export function poseCreature(creature: Creature, now: number, carry: Carry, out: Pose): Pose {
  reset(out, creature.kind)
  switch (creature.kind) {
    case 'jelly':
      jelly(creature, now, carry, out)
      break
    case 'moth':
      moth(creature, now, carry, out)
      break
    case 'snail':
      snail(creature, now, carry, out)
      break
    case 'fish':
      fish(creature, now, carry, out)
      break
    default: {
      const never: never = creature.kind
      return never
    }
  }
  return out
}

/** Light passes over a creature that is flying high; low ones catch it. */
export const CATCH_HEIGHT = 3.5
