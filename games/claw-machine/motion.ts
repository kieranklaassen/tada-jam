import { GOBBLER, type GobblerId, type LiftWay, type WrongWay } from './gobblers'

// How each gobbler moves. A pose is plain numbers laid over a gobbler at
// rest; the view only draws it. Every gobbler has its own tempo and weight,
// its own way with a toy that is not its sort and its own way of being
// lifted, so no two ever move alike, and a child can tell them apart with the
// colour turned off. Plastic is hard: a gobbler does not bend, it squashes,
// stretches, leans, turns, hops and steps.

export type Pose = {
  /** Its feet, moved from where it stands. */
  dx: number
  dy: number
  dz: number
  /** 1 at rest; below 1 squashed, above 1 stretched tall. */
  squash: number
  /** Lean forward (toward the child) and to its side, and a turn about its upright, in radians. */
  leanX: number
  leanZ: number
  turn: number
  /** Where it looks, -1 to 1 across and up, when `looks` is set; otherwise it watches the claw. */
  looks: boolean
  gazeX: number
  gazeY: number
  /** 0 eyes open, 1 shut. */
  blink: number
}

export function restPose(out: Pose): Pose {
  out.dx = out.dy = out.dz = 0
  out.squash = 1
  out.leanX = out.leanZ = out.turn = 0
  out.looks = false
  out.gazeX = out.gazeY = 0
  out.blink = 0
  return out
}

export type Personality = {
  /** Breaths a second, more or less, and how deep. */
  tempo: number
  depth: number
  /** How much of a knock gets through: a heavy one barely starts. */
  spring: number
  /** Seconds between blinks, and where in that it starts. */
  blinkEvery: number
  phase: number
}

export const PERSONALITY: { readonly [G in GobblerId]: Personality } = {
  red: { tempo: 2.1, depth: 0.022, spring: 1.2, blinkEvery: 3.7, phase: 0.4 },
  blue: { tempo: 1.1, depth: 0.03, spring: 0.7, blinkEvery: 5.9, phase: 2.9 },
  yellow: { tempo: 2.7, depth: 0.016, spring: 1.5, blinkEvery: 2.9, phase: 4.6 },
  duck: { tempo: 1.6, depth: 0.02, spring: 1.1, blinkEvery: 4.3, phase: 1.3 },
  car: { tempo: 3.2, depth: 0.012, spring: 0.9, blinkEvery: 4.9, phase: 3.3 },
  rocket: { tempo: 1.3, depth: 0.026, spring: 1.3, blinkEvery: 6.4, phase: 5.2 },
  big: { tempo: 0.7, depth: 0.04, spring: 0.4, blinkEvery: 7.5, phase: 0.9 },
  little: { tempo: 3.6, depth: 0.014, spring: 1.8, blinkEvery: 2.3, phase: 2.2 },
}

const TAU = Math.PI * 2
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
/** 0 before `a`, 1 after `b`, eased between. */
const ramp = (t: number, a: number, b: number) => { const u = clamp01((t - a) / (b - a)); return u * u * (3 - 2 * u) }
/** Up and back down between `a` and `b`. */
const bump = (t: number, a: number, b: number) => Math.sin(clamp01((t - a) / (b - a)) * Math.PI)

/** Alive at idle: a breath and a blink at its own pace, and its own small habit. */
export function idlePose(who: GobblerId, time: number, out: Pose): Pose {
  const p = PERSONALITY[who]
  restPose(out)
  out.squash = 1 + p.depth * Math.sin(time * p.tempo + p.phase)
  out.leanZ = 0.012 * Math.sin(time * p.tempo * 0.5 + p.phase)
  out.blink = (time + p.phase) % p.blinkEvery < 0.12 ? 1 : 0
  // Big is sleepy: every so often a huge slow yawn, eyes shut. Little is bouncy: it cannot stand still.
  if (who === 'big') {
    const yawn = bump((time + 3) % 11, 0, 2.4)
    out.squash += 0.1 * yawn; out.blink = Math.max(out.blink, yawn > 0.35 ? 1 : 0)
  } else if (who === 'little') {
    out.dy = 0.35 * Math.abs(Math.sin(time * 4.4)) * bump((time + 1) % 5, 0, 1.6)
  }
  return out
}

/** How long each way with a wrong toy takes, and how far through it the toy leaves, and how long the toy is in the air. */
export const WRONG: { readonly [W in WrongWay]: { seconds: number; release: number; air: number } } = {
  cannon: { seconds: 1.0, release: 0.36, air: 0.42 },
  'slow-slide': { seconds: 1.7, release: 0.72, air: 0.7 },
  hiccups: { seconds: 1.25, release: 0.66, air: 0.5 },
  'head-shake': { seconds: 1.1, release: 0.6, air: 0.55 },
  reverse: { seconds: 1.15, release: 0.3, air: 0.62 },
  'straight-up': { seconds: 1.5, release: 0.4, air: 1.05 },
  'falls-through': { seconds: 1.9, release: 0, air: 0.45 },
  hat: { seconds: 1.6, release: 0.7, air: 0.5 },
}

/** A gobbler's way with a toy that is not its sort, at `t` from 0 to 1. */
export function wrongPose(way: WrongWay, t: number, out: Pose): Pose {
  restPose(out)
  switch (way) {
    case 'cannon': {
      // Goes stiff and trembles, fires, and is blown back a step by it.
      const stiff = 1 - ramp(t, 0.36, 0.42)
      out.squash = 1 + 0.14 * stiff * ramp(t, 0, 0.12) - 0.12 * bump(t, 0.36, 0.56)
      out.dx = 0.08 * stiff * Math.sin(t * 190)
      // (A short step and a small lean: the parapet and a corner post are right behind it.)
      out.dz = -0.6 * ramp(t, 0.36, 0.44) * (1 - ramp(t, 0.6, 1))
      out.leanX = -0.06 * bump(t, 0.36, 0.7)
      break
    }
    case 'slow-slide': {
      // Chews slowly, slowly notices, and leans until the toy slides off its tongue.
      out.squash = 1 - 0.09 * Math.abs(Math.sin(t * TAU * 1.5)) * (1 - ramp(t, 0.4, 0.5))
      out.blink = bump(t, 0.46, 0.6) > 0.3 ? 1 : 0
      out.leanX = 0.42 * ramp(t, 0.55, 0.74) * (1 - ramp(t, 0.82, 1))
      out.looks = true; out.gazeY = -0.9 * ramp(t, 0.3, 0.5)
      break
    }
    case 'hiccups': {
      // Three hiccups, each a bigger hop, and the toy pops out on the third.
      const hic = bump(t, 0.1, 0.26) * 0.45 + bump(t, 0.36, 0.52) * 0.7 + bump(t, 0.62, 0.8) * 1.15
      out.dy = hic
      out.squash = 1 + 0.12 * hic - 0.1 * (bump(t, 0.04, 0.12) + bump(t, 0.3, 0.38) + bump(t, 0.56, 0.64))
      out.blink = hic > 0.3 ? 1 : 0
      break
    }
    case 'head-shake': {
      // Shakes its head wider and wider until the toy flies out sideways.
      const wide = ramp(t, 0, 0.55) * (1 - ramp(t, 0.6, 0.85))
      out.turn = 0.42 * wide * Math.sin(t * TAU * 4.5)
      out.leanZ = 0.08 * wide * Math.sin(t * TAU * 4.5 + 1)
      out.blink = wide > 0.5 ? 1 : 0
      break
    }
    case 'reverse': {
      // Revs on the spot, then reverses out from under the toy and rolls back.
      // (As far back as the lamps on the parapet let it, and it never leans back toward them.)
      // It lets go standing still, and is off only once the toy is up out of its mouth.
      out.dz = 0.18 * Math.sin(t * 150) * (1 - ramp(t, 0.2, 0.26)) - 1.2 * ramp(t, 0.42, 0.56) * (1 - ramp(t, 0.7, 0.96))
      out.leanX = 0.14 * bump(t, 0.42, 0.62) + 0.06 * bump(t, 0.7, 0.96)
      out.looks = true; out.gazeY = 0.8 * bump(t, 0.3, 0.9)
      break
    }
    case 'straight-up': {
      // Crouches, puffs up and shoots the toy straight up, then watches it come down.
      out.squash = 1 - 0.3 * ramp(t, 0, 0.36) + 0.62 * ramp(t, 0.36, 0.43) - 0.32 * ramp(t, 0.5, 0.8)
      out.looks = true; out.gazeY = ramp(t, 0.4, 0.5) - 1.6 * ramp(t, 0.75, 0.98)
      break
    }
    case 'falls-through': {
      // The toy has dropped through. It looks for it everywhere but down.
      out.looks = true
      out.gazeX = Math.sin(t * TAU * 1.5) * ramp(t, 0.1, 0.25)
      out.gazeY = 0.8 * Math.abs(Math.sin(t * TAU * 0.75))
      // Too wide to turn where it stands: it leans from side to side to look.
      out.leanZ = 0.05 * Math.sin(t * TAU * 1.5) * (1 - ramp(t, 0.85, 1))
      out.squash = 1 + 0.05 * bump(t, 0.1, 0.5)
      break
    }
    case 'hat': {
      // The toy sits on its head, and it staggers about under it until it slides off.
      const stagger = ramp(t, 0.05, 0.2) * (1 - ramp(t, 0.72, 0.85))
      out.squash = 1 - 0.12 * stagger + 0.14 * bump(t, 0.76, 0.96)
      out.dx = 0.7 * stagger * Math.sin(t * TAU * 2.2)
      out.leanZ = -0.07 * stagger * Math.sin(t * TAU * 2.2)
      out.dy = 0.5 * bump(t, 0.78, 0.96)
      out.looks = true; out.gazeY = 1 - 1.2 * ramp(t, 0.75, 0.9)
      break
    }
  }
  return out
}

/** How long a lift lasts before the claw lets go by itself, in seconds. */
export const LIFT_SECONDS = 1.5
/** When a lifted top begins to spin, and how fast: two whole turns by the time it is let go. */
const SPIN_FROM = 0.6
const SPIN = (4 * Math.PI) / (LIFT_SECONDS - SPIN_FROM)

/** A gobbler in the jaws, `seconds` after it left the step. */
export function liftedPose(way: LiftWay, seconds: number, out: Pose): Pose {
  restPose(out)
  switch (way) {
    case 'kicks-and-squeals': // loves it: kicks its legs
      out.leanZ = 0.15 * Math.sin(seconds * 17); out.squash = 1 + 0.07 * Math.sin(seconds * 34)
      break
    case 'goes-rigid': // hates it: stiff as a board, eyes shut, trembling
      out.squash = 1.16; out.blink = 1; out.dx = 0.05 * Math.sin(seconds * 120)
      break
    case 'hiccups': // a hiccup every beat
      out.dy = 0.5 * Math.pow(Math.abs(Math.sin(seconds * 6.5)), 6); out.blink = out.dy > 0.2 ? 1 : 0
      break
    case 'flaps': // flaps its side plates
      out.leanZ = 0.15 * Math.sin(seconds * 9); out.turn = 0.2 * Math.sin(seconds * 4.5); out.dy = 0.25 * Math.abs(Math.sin(seconds * 9))
      break
    case 'wheels-spin': // wheels spinning in the air: it shakes with them
      out.dz = 0.1 * Math.sin(seconds * 90); out.leanX = 0.1 * Math.sin(seconds * 6)
      break
    case 'stretches-tall': // up on tiptoe, taller and taller
      out.squash = 1 + 0.38 * ramp(seconds, 0, 0.9); out.looks = true; out.gazeY = 1
      break
    case 'thuds-back': // too heavy: it sags in the jaws and yawns
      out.squash = 1 - 0.1 * ramp(seconds, 0, 0.5); out.blink = seconds > 0.4 ? 1 : 0
      break
    case 'spins': // spins like a top, about its own middle, once it is up clear of the step: twice round, and it comes down facing front
      out.turn = SPIN * Math.max(0, seconds - SPIN_FROM)
      break
  }
  return out
}

/** The acts every gobbler has, each played in its own tempo and weight. */
export type Act = 'gulp' | 'hold' | 'open-wide' | 'duck' | 'snap' | 'start' | 'show' | 'tip' | 'drum' | 'burp' | 'bonked' | 'lean' | 'stare' | 'catch' | 'heave' | 'land'

export const ACT_SECONDS: { readonly [A in Act]: number } = {
  gulp: 0.5, hold: 0.9, 'open-wide': 1.2, duck: 0.7, snap: 0.5, start: 0.45, show: 1.5, tip: 0.9, drum: 1.0, burp: 0.7, bonked: 0.9, lean: 0.8, stare: 1.6, catch: 0.9, heave: 1.3, land: 0.5,
}

/** How long an act takes for this gobbler: the quick ones are quicker at everything. */
export function actSeconds(who: GobblerId, act: Act, chomps = 1): number {
  const quick = 0.75 + 0.5 / PERSONALITY[who].tempo
  return ACT_SECONDS[act] * quick * (act === 'gulp' ? 0.6 + 0.4 * chomps : 1)
}

/** A shared act at `t` from 0 to 1. `n` is the number of chomps of a gulp, or the direction of a lean. */
export function actPose(who: GobblerId, act: Act, t: number, n: number, out: Pose): Pose {
  const p = PERSONALITY[who], s = p.spring
  restPose(out)
  switch (act) {
    case 'gulp': {
      // One chomp for a small toy, three with bulging cheeks for a big one, then the swallow.
      const chew = Math.abs(Math.sin(clamp01(t / 0.7) * Math.PI * n))
      out.squash = 1 - 0.16 * chew * (1 - ramp(t, 0.68, 0.72)) + 0.12 * s * bump(t, 0.72, 1)
      out.blink = t < 0.7 && chew > 0.5 ? 1 : 0
      out.dy = 0.25 * s * bump(t, 0.74, 1)
      break
    }
    case 'hold': // a chomp and a freeze: eyes on the toy on its tongue
      out.squash = 1 - 0.16 * bump(t, 0, 0.14)
      out.looks = true; out.gazeX = 0; out.gazeY = -1
      break
    case 'open-wide': // wider and wider, on tiptoe, shuffling to stay under the claw
      out.squash = 1 + (0.06 + 0.1 * t) * (1 + 0.15 * Math.sin(t * 30 * p.tempo))
      out.dx = 0.14 * Math.sin(t * 22 * p.tempo)
      out.looks = true; out.gazeY = 1
      break
    case 'duck': // ducks the bare claw and pops up again
      out.squash = 1 - 0.38 * bump(t, 0, 0.6) + 0.12 * s * bump(t, 0.6, 1)
      out.blink = t < 0.5 ? 1 : 0
      break
    case 'snap': // snaps at a toy swinging past, and misses
      out.squash = 1 + 0.2 * bump(t, 0, 0.3) - 0.14 * bump(t, 0.3, 0.5)
      out.leanZ = 0.07 * n * bump(t, 0, 0.5)
      out.dy = 0.5 * s * bump(t, 0, 0.4)
      break
    case 'start': // a start at a bang: down and up past rest
      out.squash = 1 - 0.07 * s * Math.sin(t * TAU) * (1 - t)
      break
    case 'show': // holds its snack up beside itself, looks from one to the other
      out.looks = true
      out.gazeX = 0.9 * Math.sin(t * TAU * 1.5) * (1 - ramp(t, 0.7, 0.8)); out.gazeY = -0.5
      out.squash = 1 + 0.05 * bump(t, 0, 0.7) - 0.14 * bump(t, 0.72, 0.9)
      break
    case 'tip': // leans over and tips its belly out
      out.leanX = 0.5 * bump(t, 0, 1); out.squash = 1 - 0.08 * bump(t, 0.3, 0.7)
      break
    case 'drum': // drums on its belly: a bounce for each beat
      out.squash = 1 + 0.07 * s * Math.sin(t * TAU * Math.max(1, n)); out.leanZ = 0.06 * Math.sin(t * TAU * Math.max(1, n) * 0.5)
      break
    case 'burp': // a big one: swells, lets go, settles
      out.squash = 1 + 0.2 * bump(t, 0, 0.5) - 0.1 * bump(t, 0.5, 0.75); out.blink = t > 0.4 && t < 0.7 ? 1 : 0
      break
    case 'bonked': // ducks, and pops up further along, then shuffles back
      // It ducks by squashing flat where it stands, and comes up a little way along.
      out.squash = 1 - 0.3 * bump(t, 0, 0.45) + 0.12 * s * bump(t, 0.45, 0.7)
      out.dx = 0.9 * n * ramp(t, 0.15, 0.4) * (1 - ramp(t, 0.6, 1))
      out.blink = t < 0.3 ? 1 : 0
      break
    case 'lean': // leans out of the way like grass
      out.leanZ = -0.2 * n * bump(t, 0, 1)
      break
    case 'stare': // stares up, following the sway
      out.looks = true; out.gazeY = 1; out.gazeX = 0.8 * Math.sin(t * TAU * 1.2)
      out.squash = 1 + 0.05 * bump(t, 0, 1)
      break
    case 'catch': // catches, winds up, lobs
      out.squash = 1 - 0.14 * bump(t, 0, 0.25) + 0.2 * bump(t, 0.45, 0.7)
      // It winds up with a dip and lobs with a stretch: it never leans out over the gate in front of it, nor back
      // into the wall behind it.
      out.leanX = 0.08 * bump(t, 0.5, 0.75)
      break
    case 'heave': // staggers under a big one, then heaves
      out.dx = 0.4 * Math.sin(t * TAU * 2) * (1 - ramp(t, 0.55, 0.65)); out.squash = 1 - 0.18 * ramp(t, 0, 0.08) * (1 - ramp(t, 0.6, 0.7)) + 0.24 * bump(t, 0.62, 0.9)
      out.leanX = 0.08 * bump(t, 0.6, 0.85)
      break
    case 'land': // down onto the step: a squash that springs back, deeper for a heavy one
      out.squash = 1 - (0.2 / s) * bump(t, 0, 0.5) + 0.08 * s * bump(t, 0.5, 1)
      // The car-head shoots forward a little when it is put down, and rolls back.
      if (who === 'car') out.dz = 1.3 * bump(t, 0.05, 0.9)
      break
  }
  return out
}

/** The way a gobbler has with a wrong toy, and with being lifted. */
export function waysOf(who: GobblerId): { wrong: WrongWay; lifted: LiftWay } {
  return { wrong: GOBBLER[who].wrong, lifted: GOBBLER[who].lifted }
}
