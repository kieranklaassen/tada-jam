import { GULL_SIZE, GULL_TALL, type Kind } from './toys'

// How each toy and each resident moves, as plain numbers: no renderer, no
// clock but the seconds passed in. Every toy has its own habit on the land,
// its own in the sea and its own answer to a tap, and no two share a curve
// (motion.test.ts holds that). The view lays these numbers on its meshes.

export type Part = { y: number; yaw: number; pitch: number; roll: number; s: number }

export type Pose = {
  /** Offsets from where the toy stands. */
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  roll: number
  /** Squash and stretch. */
  sx: number
  sy: number
  sz: number
  /** The toy's one moving part: the lamp, the sail, the head, the crown, the roof. */
  part: Part
  /** The lighthouse's lamp, from dark (0) to lit (1). */
  glow: number
}

export function restPose(): Pose {
  return { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, sx: 1, sy: 1, sz: 1, part: { y: 0, yaw: 0, pitch: 0, roll: 0, s: 1 }, glow: 0 }
}

export function clear(pose: Pose): Pose {
  pose.x = pose.y = pose.z = pose.yaw = pose.pitch = pose.roll = 0
  pose.sx = pose.sy = pose.sz = 1
  pose.part.y = pose.part.yaw = pose.part.pitch = pose.part.roll = 0
  pose.part.s = 1
  pose.glow = 0
  return pose
}

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
/** 0 to 1 over the stretch from a to b. */
const span = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))
const smooth = (t: number): number => t * t * (3 - 2 * t)
/** Up and down again over the stretch from a to b. */
const bump = (t: number, a: number, b: number): number => Math.sin(span(t, a, b) * Math.PI)
/** A ring that dies away: what a wooden thing does after a knock. */
const ring = (t: number, rate: number, life: number): number => (t < 0 ? 0 : Math.exp(-t / life) * Math.cos(t * rate))

/** What the sheep is doing on the land. */
export type Grazing = 'munch' | 'graze' | 'ask'

/** How long each toy's answer to a tap lasts, in seconds. A tap in the middle of one starts it again. */
export const POKE_S: Record<Kind, number> = { lighthouse: 1, boat: 0.9, sheep: 0.8, tree: 1.5, house: 0.7 }
/** How long the house on the land takes from one puff of smoke to the next. */
export const PUFF_S = 1.7
/** How fast the tree afloat rolls over about its own length, in radians a second. */
export const LOG_ROLL = 0.55
/** How long a toy rings after it comes down. */
export const LANDING_S = 0.6

/** The squash of a landing, shared by everything that has weight: it is the knock, not a habit. */
function landing(pose: Pose, age: number, weight: number): void {
  const squash = ring(age, 24 - weight * 8, 0.11 + weight * 0.05) * (0.22 + weight * 0.1)
  pose.sy *= 1 - squash
  pose.sx *= 1 + squash * 0.3
  pose.sz *= 1 + squash * 0.3
}

/** How far the boat's hull reaches from its middle to either end, as it is modelled: what a see-saw of the hull has to be lifted by. */
const HULL_HALF = 0.74
/** How far the hull see-saws when it flaps on the land. */
const FLAP = 0.22

/** The sheep's answer to a tap, laid over whatever it was doing, on the ground, in the sea or on the boat's deck: straight up, stiff, and the fleece puffs out to a ball. */
export function tappedSheep(poked: number, out: Pose): void {
  if (poked >= POKE_S.sheep) return
  const up = span(poked, 0, 0.5)
  out.y += 4 * up * (1 - up) * 0.9
  const puff = bump(poked, 0.05, 0.8)
  out.sx *= 1 + puff * 0.07
  out.sz *= 1 + puff * 0.07
  out.sy *= 1 + puff * 0.24
  out.part.pitch = -0.5
}

/**
 * One toy's pose where it stands. `age` is the seconds since it came to stand there, `poked` the seconds
 * since it was last tapped (Infinity when it was not), `grazing` what the sheep is doing on the land, and
 * `puffed` the seconds since a ball of smoke last left the house's chimney (Infinity when none has).
 */
export function toyPose(kind: Kind, where: 'land' | 'sea', age: number, poked: number, weight: number, grazing: Grazing, out: Pose, puffed = Infinity): Pose {
  clear(out)
  const tapped = poked < POKE_S[kind]
  switch (kind) {
    case 'lighthouse': {
      // Stiff and tall: it never leans. Its life is the lamp.
      out.glow = smooth(span(age, 0.05, 0.45))
      if (where === 'sea') {
        out.y = -0.45
        out.roll = Math.sin(age * 0.9) * 0.025
      }
      if (tapped) {
        // Three blinks, then the lamp stays lit while the beam whips round (the model turns the beam).
        if (poked < 0.42) out.glow = Math.floor(poked / 0.07) % 2 === 0 ? 0.15 : 1
        out.sy *= 1 + bump(poked, 0.36, 0.7) * 0.06
      }
      break
    }
    case 'boat': {
      if (where === 'land') {
        // A landed fish: the hull slaps from side to side and never lies still.
        // The sail's boom flops across from one side to the other, a beat behind the hull.
        const beat = age * 13
        out.roll = Math.sin(beat) * FLAP
        out.yaw = Math.sin(age * 3.1) * 0.28
        out.part.yaw = -Math.sin(beat - 0.9) * 0.7
        let spring = 0
        if (tapped) {
          // It springs up with its bow in the air, and belly-flops.
          const up = span(poked, 0, 0.34)
          spring = 4 * up * (1 - up) * 1.3
          out.roll = out.roll * span(poked, 0.5, 0.9) + Math.sin(up * Math.PI) * 0.35
          const flat = bump(poked, 0.34, 0.62)
          out.sy *= 1 - flat * 0.5
          out.sx *= 1 + flat * 0.05
          out.sz *= 1 + flat * 0.05
        }
        // Whichever end is down rests on the grass: the hull is lifted by as much as that end dips.
        out.y = spring + Math.abs(Math.sin(out.roll)) * HULL_HALF + 0.02
      } else {
        // Afloat it is calm: a long swell, the sail full.
        out.y = -0.08 + Math.sin(age * 2.2) * 0.04
        out.roll = Math.sin(age * 2.2 + 1) * 0.06
        out.pitch = Math.sin(age * 1.7) * 0.07
        out.part.yaw = 0.22 + Math.sin(age * 1.3) * 0.06
        out.part.s = 1 + smooth(span(age, 0, 0.5)) * 0.12
        // Tapped, the bow lifts as it darts ahead (the model speeds it along its ring).
        if (tapped) {
          const lift = bump(poked, 0.2, 0.9) * 0.3
          out.roll += lift
          // It tips about its deck, not its keel, so the mast stays over its own water.
          out.x += Math.sin(lift) * 0.5
        }
      }
      break
    }
    case 'sheep': {
      if (where === 'sea') {
        // Paddling in a small ring with its nose up.
        // (It is tipped about its middle, not its feet: the last term keeps its tail over its own water.)
        out.x = Math.cos(age * 1.4) * 0.08
        out.z = Math.sin(age * 1.4) * 0.08 + 0.24
        out.y = -0.36 + Math.sin(age * 3) * 0.04
        out.pitch = -0.3
        out.part.pitch = -0.35 + Math.sin(age * 6) * 0.06
      } else if (grazing === 'munch') {
        // Head level with the leaves, chewing fast.
        out.part.pitch = -0.25 + Math.sin(age * 18) * 0.12
        out.sy *= 1 + Math.sin(age * 18) * 0.02
      } else if (grazing === 'graze') {
        // Head down in the grass, tugging.
        out.part.pitch = 0.85 + Math.sin(age * 15) * 0.1
        out.part.y = -0.05
      } else {
        // Neck stretched toward a tree it cannot reach.
        out.part.pitch = -0.6 + Math.sin(age * 2) * 0.05
        out.part.y = 0.12
      }
      tappedSheep(poked, out)
      break
    }
    case 'tree': {
      if (where === 'sea') {
        // A log on its side, lying along the shore (the model turns it that way), rolling slowly over about its own length.
        out.pitch = Math.PI / 2
        out.yaw = age * LOG_ROLL
        out.z = -1.045
        out.y = 0.22 + Math.sin(age * 1.6) * 0.03
      } else {
        // The crown shakes itself out, then sways for good.
        out.part.roll = Math.sin(age * 1.1) * 0.07
        out.part.pitch = Math.sin(age * 0.8 + 1) * 0.04
        out.part.s = 1 + ring(age, 14, 0.3) * 0.12
      }
      if (tapped) {
        // Shaken bare, a moment of standing there with nothing on, and the leaves pop back.
        out.roll += Math.sin(poked * 40) * 0.1 * (1 - span(poked, 0.3, 0.5))
        const off = smooth(span(poked, 0.1, 0.45)), back = span(poked, 1.1, 1.18)
        out.part.s = back > 0 ? 1 + ring(poked - 1.1, 20, 0.12) * 0.2 * (1 - span(poked, 1.4, 1.5)) : 1 - off * 0.8
      }
      break
    }
    case 'house': {
      if (where === 'sea') {
        // A houseboat, low on one side.
        out.y = -0.3 + Math.sin(age * 1.5) * 0.05
        out.roll = 0.13 + Math.sin(age * 1.1) * 0.04
        out.pitch = Math.sin(age * 0.9) * 0.04
      } else {
        // The door pops open and shut: the walls bulge once.
        const pop = bump(age, 0.18, 0.4)
        out.sz *= 1 + pop * 0.08
        out.sx *= 1 + pop * 0.05
        // Each puff of the chimney lifts the roof a finger's breadth and the walls breathe out: in the frame the ball leaves, by the ball's own clock.
        const puff = bump(puffed / PUFF_S, 0, 0.22)
        out.part.y = puff * 0.07
        out.sy *= 1 - puff * 0.04
      }
      if (tapped) {
        // The roof lifts like a lid and claps down.
        out.part.y = bump(poked, 0, 0.24) * 0.6
        out.part.roll = bump(poked, 0, 0.24) * (where === 'sea' ? -0.3 : 0.4)
        out.sy *= 1 - bump(poked, 0.22, 0.5) * 0.14
      }
      break
    }
  }
  landing(out, age, weight)
  return out
}

/** A toy hanging in the hand over the tray, or carried by a finger: it rocks, and spins once when it is tapped there. */
/** How long a toy's hello lasts when it is lifted. */
export const HELLO_S = 0.45

/** A toy taken up stretches and rings back: by this much of its height at most, dying away over this long. */
const STRETCH = 0.2
const STRETCH_LIFE = 0.12
/** The most a toy held for `held` seconds is stretched upward, as a part of its height: what the lid of the frame has to leave room for. */
export const handStretch = (held: number): number => STRETCH * Math.exp(-Math.max(0, held) / STRETCH_LIFE)

export function handPoseOf(kind: Kind, held: number, whipped: number, out: Pose): Pose {
  clear(out)
  // Each toy rocks at its own pace, the heavy ones slowly.
  const pace = { lighthouse: 3.2, boat: 5.6, sheep: 7.4, tree: 4.6, house: 3.8 }[kind]
  out.roll = Math.sin(held * pace) * 0.1 * (0.4 + 0.6 * Math.exp(-held * 0.8))
  out.y = Math.sin(held * pace * 0.5) * 0.05
  const stretch = ring(held, 18, STRETCH_LIFE) * STRETCH
  out.sy = 1 + stretch
  out.sx = out.sz = 1 - stretch * 0.5
  if (whipped < 0.45) out.yaw = smooth(span(whipped, 0, 0.45)) * Math.PI * 2
  // In the frame it leaves the ground each says who it is, with its one moving part, and then hangs plain.
  const hello = bump(held, 0, HELLO_S)
  if (kind === 'lighthouse') out.glow = hello
  else if (kind === 'boat') out.part.yaw = Math.sin(span(held, 0, HELLO_S) * Math.PI * 2) * 0.3
  else if (kind === 'sheep') out.part.pitch = -0.4 * hello
  else if (kind === 'tree') out.part.s = 1 + 0.16 * hello
  else out.part.y = 0.1 * hello
  return out
}

// --- The residents -------------------------------------------------------------

export type CatPose = {
  /** Above its seat. */
  y: number
  /** Squash: 1 at rest. */
  squash: number
  /** The whole cat rocking from haunch to haunch, in radians. */
  roll: number
  /** The whole cat leaning forward (a pounce, a crouch) or back (dragged by a spinning island), in radians. */
  lean: number
  /** Stretched upward like toffee: 1 at rest. */
  stretch: number
  /** The head: up and down, and the tilt of a listening cat. */
  nod: number
  tilt: number
  /** Ears flat, 0 to 1. */
  ears: number
  /** The tail's swing. */
  tail: number
  /** A front paw's reach forward, 0 to 1, and how far it is lifted to the mouth to be washed. */
  paw: number
  wash: number
  /** Eyes open, 1 to 0. */
  lids: number
  /** The eyes rolling: how far round, in radians, and how wide the circle is, 0 to 1. */
  roving: number
  rove: number
  /** Puffed up with fright, 1 at rest. */
  puff: number
}

/** What has happened to the cat lately, each in seconds since (Infinity when it has not). */
export type CatDoing = {
  /** 0 to 1 through a jump to a new seat, or -1; and how high that jump goes, as a part of the highest. */
  leap: number
  reach: number
  hop: number
  poked: number
  patted: number
  startled: number
  /** A toy came down where it sat: once it has landed it glares, and then washes a paw. */
  landedOn: number
  /** A toy splashed in beside it. */
  splashed: number
  /** The light of the lamp passed close: it pounces. */
  pounced: number
  /** It waits for the light crouched: the lighthouse stands in the sea. */
  crouched: boolean
  /** How fast the island turns under it, 0 to 1, and the seconds since it stopped. */
  spun: number
  stopped: number
  /** Pulled by a finger: how far, 0 to 1, and the seconds since it was let go. */
  pulled: number
  twanged: number
  /** The wave is at work: it sits puffed up on the rim, ears flat. */
  flooded: boolean
  /** A carried toy is coming toward its seat: 0 far off to 1 at its seat. */
  wary: number
}

export function catPose(t: number, doing: CatDoing, out: CatPose): CatPose {
  const { leap, poked, patted, startled } = doing
  // A cat is never quite still: the tail has its own slow mind, the ears flick.
  out.tail = Math.sin(t * 1.9) * 0.5 + Math.sin(t * 4.7) * 0.12
  out.squash = 1 + Math.sin(t * 1.6) * 0.015
  out.y = doing.hop
  out.roll = 0
  out.lean = 0
  out.stretch = 1
  out.nod = Math.sin(t * 0.7) * 0.04
  out.tilt = Math.sin(t * 0.43 + 2) * 0.08
  out.ears = 0
  out.paw = 0
  out.wash = 0
  out.puff = 1
  out.roving = 0
  out.rove = 0
  // A slow blink about every five seconds.
  const blink = (t + 1.3) % 5.1
  out.lids = blink < 0.16 ? Math.abs(blink - 0.08) / 0.08 : 1
  if (doing.crouched) {
    // Waiting for the light: low on its front, bottom wiggling.
    out.lean = 0.2
    out.squash = 0.88
    out.roll = Math.sin(t * 9) * 0.05
    out.tail = Math.sin(t * 9) * 0.9
  }
  if (doing.pounced < 0.75) {
    // Pat, pat, thump: two quick paws and a hop onto where the light was.
    const p = doing.pounced
    out.paw = Math.max(bump(p, 0, 0.16), bump(p, 0.18, 0.34))
    out.lean = 0.3 * bump(p, 0, 0.6)
    out.y += bump(p, 0.36, 0.62) * 0.3
    out.squash = 1 - bump(p, 0.58, 0.75) * 0.14
    out.nod = 0.3 * bump(p, 0, 0.7)
  }
  if (doing.wary > 0.01 && leap < 0) {
    // A toy is coming its way: it shrinks down and back from it, ears flat, eyes wide on the toy.
    out.squash = Math.min(out.squash, 1 - doing.wary * 0.14)
    out.lean = -0.2 * doing.wary
    out.ears = Math.max(out.ears, doing.wary)
    out.tail = 1.1 + Math.sin(t * 14) * 0.2 * doing.wary
    out.lids = 1
  }
  if (leap >= 0) {
    // The higher the leap the longer it stretches: a long low bound to the rim hardly at all.
    out.squash = 1 + bump(leap, 0, 1) * 0.25 * doing.reach - bump(leap, 0.85, 1) * 0.2
    out.y = 0
    out.tail = 1.1
    out.lids = 1
  }
  if (startled < 0.9) {
    out.puff = 1 + bump(startled, 0, 0.9) * 0.3
    out.tail = 1.3
  }
  if (leap < 0 && doing.landedOn < 2.6) {
    // Landed beside the toy that took its seat: a glare, and then a paw washed as if nothing had happened.
    const p = doing.landedOn
    if (p < 0.8) {
      out.lids = 0.45
      out.ears = 1
      out.nod = -0.1
    } else {
      const lick = span(p, 0.8, 2.6)
      out.wash = Math.min(span(lick, 0, 0.15), 1 - span(lick, 0.85, 1))
      out.nod = 0.22 + Math.sin(lick * Math.PI * 8) * 0.08
      out.lids = 0.3
    }
  }
  if (doing.splashed < 1.5) {
    // A flinch from the spray, each front paw shaken, and a hiss at the water.
    const p = doing.splashed
    out.lean = -0.28 * bump(p, 0, 0.45)
    out.squash = 1 - bump(p, 0, 0.3) * 0.12
    out.paw = Math.max(bump(p, 0.3, 0.55), bump(p, 0.6, 0.85))
    out.roll = Math.sin(span(p, 0.3, 0.85) * Math.PI * 4) * 0.08
    if (p > 0.9) {
      out.puff = 1 + bump(p, 0.9, 1.5) * 0.25
      out.ears = 1
      out.lids = 0.5
    }
  }
  if (poked < 1.1) {
    // It rocks from haunch to haunch, flat with pleasure, eyes shut.
    out.roll = Math.sin(span(poked, 0, 0.9) * Math.PI * 3) * 0.22 * (1 - span(poked, 0.6, 1.1))
    out.squash = 1 - bump(poked, 0.1, 0.9) * 0.18
    out.tilt = 0.35 * bump(poked, 0, 1.1)
    out.lids = 0.2
  }
  if (patted < 0.7) {
    out.paw = bump(patted, 0, 0.7)
    out.nod = 0.25 * bump(patted, 0, 0.7)
  }
  if (doing.spun > 0.05) {
    // Claws in, dragged round: low, leaning back against the turn, eyes rolling.
    out.squash = 1 - doing.spun * 0.2
    out.lean = -0.25 * doing.spun
    out.ears = doing.spun
    out.tail = 1.2
    out.rove = doing.spun
    out.roving = t * 11
    out.lids = 1
  } else if (doing.stopped < 1) {
    // The island has stopped and the cat has not: it staggers.
    out.roll = Math.sin(doing.stopped * 13) * 0.2 * (1 - doing.stopped)
    out.rove = 1 - doing.stopped
    out.roving = t * 7
  }
  if (doing.pulled > 0) {
    out.stretch = 1 + doing.pulled * 0.55
    out.lids = 1
    out.ears = 0.6
  } else if (doing.twanged < 0.7) {
    // Let go, it twangs back and quivers.
    out.stretch = 1 + ring(doing.twanged, 30, 0.16) * 0.3
  }
  if (doing.flooded) {
    // It puffs up as it comes down on the rim: in the air it is still a cat's size.
    out.puff = leap >= 0 ? 1 + leap * leap * leap * leap : 2
    out.ears = 1
    out.tail = 1.3
    out.lids = 1
  }
  return out
}

export type GullPose = {
  y: number
  /** Tipped forward, in radians: a dive goes in beak first. */
  pitch: number
  /** Wings: 0 folded, 1 spread; and their beat. */
  spread: number
  flap: number
  /** The neck, stretched up by this much. */
  neck: number
  /** The beak, 0 shut to 1 wide. */
  beak: number
  /** Feathers on end, 1 at rest. */
  puff: number
  tilt: number
  lids: number
}

/** What the gull is doing, each in seconds since (Infinity when it has not). */
export type GullDoing = {
  /** 0 to 1 through a flight, or -1. */
  flying: number
  /** Where it is: on its buoy, in the house's smoke, or paddling beside the house in the sea. */
  place: 'buoy' | 'smoke' | 'paddle'
  /** A puff of smoke reached it; a bubble tickled it. */
  lifted: number
  tickled: number
  poked: number
  /** A toy came down on the island: it cranes its neck and its feet paddle. */
  craned: number
  /** It dived after a splash: 0 to 1 through the dive, or -1. */
  dive: number
  /** The wave is lifting its buoy: 0 to 1 through the swell, or -1. */
  surf: number
  /** How far it has to rise to let the boat pass under it, 0 to 1. */
  dodge: number
  /** How much room there is above its head where it is, under the lid of the frame; Infinity when nobody has measured. */
  room: number
}

/** How far a puff of smoke lifts the gull, as the size of the swing, and how much of that the top of the swing is. */
export const LIFT = 0.75
const LIFT_PEAK = 0.52

export function gullPose(t: number, doing: GullDoing, out: GullPose): GullPose {
  const { flying, lifted, poked, craned } = doing
  // On its buoy it shifts from foot to foot and cocks its head, a beat behind everything.
  out.y = Math.abs(Math.sin(t * 2.3)) * 0.03
  out.pitch = 0
  out.tilt = Math.sin(t * 0.9) > 0.6 ? 0.3 : Math.sin(t * 0.9) < -0.7 ? -0.25 : 0
  out.spread = 0
  out.flap = 0
  out.neck = 0
  out.beak = 0
  out.puff = 1
  const blink = (t + 3.1) % 3.7
  out.lids = blink < 0.12 ? Math.abs(blink - 0.06) / 0.06 : 1
  if (flying >= 0) {
    out.spread = 1
    out.flap = Math.sin(flying * 28)
    out.y = 0
  } else if (doing.place === 'smoke') {
    // Wings out flat on the warm air; each puff lifts it and it sinks back.
    out.spread = 1
    out.flap = Math.sin(t * 3) * 0.12
    out.y = Math.exp(-lifted * 1.6) * Math.sin(Math.min(lifted, 2) * 3.2) * Math.min(LIFT, Math.max(0, doing.room) / LIFT_PEAK)
    out.beak = lifted < 0.5 ? 0.6 : 0
  } else if (doing.place === 'paddle') {
    // Afloat beside the houseboat, rocking as it paddles; a bubble makes it wriggle and laugh.
    out.y = Math.sin(t * 2.6) * 0.04
    out.tilt = Math.sin(t * 2.6) * 0.1
    if (doing.tickled < 0.7) {
      out.tilt = Math.sin(doing.tickled * 30) * 0.3 * (1 - doing.tickled / 0.7)
      out.beak = 0.7
      out.spread = 0.3 * bump(doing.tickled, 0, 0.7)
      out.flap = Math.sin(doing.tickled * 40)
    }
  }
  if (doing.dodge > 0) {
    out.spread = Math.max(out.spread, doing.dodge)
    out.flap = Math.sin(t * 22)
  }
  if (craned < 0.9) {
    out.neck = bump(craned, 0, 0.9) * 0.5
    // Its feet paddle on the buoy.
    out.y = Math.abs(Math.sin(craned * 26)) * 0.07 * (1 - craned / 0.9)
  }
  if (doing.dive >= 0) {
    // Up, over and in beak first; under for a moment; up again with nothing, spitting water.
    const d = doing.dive
    out.pitch = d < 0.45 ? smooth(span(d, 0.08, 0.3)) * 2.2 : (1 - smooth(span(d, 0.5, 0.62))) * 2.2
    out.spread = d < 0.3 ? 1 - span(d, 0.15, 0.3) : d > 0.8 ? bump(d, 0.8, 1) : 0
    out.flap = Math.sin(d * 50)
    out.beak = d > 0.62 && d < 0.9 ? 1 : 0
    out.neck = 0
  }
  if (doing.surf >= 0) {
    out.spread = 1
    out.flap = Math.sin(doing.surf * 46)
    out.beak = 0.8
  }
  if (poked < 0.8) {
    out.beak = 1 - span(poked, 0.4, 0.8)
    out.puff = 1 + bump(poked, 0, 0.8) * 0.3
    out.neck = bump(poked, 0, 0.5) * 0.3
    out.spread = Math.max(out.spread, bump(poked, 0, 0.8) * 0.7)
  }
  if (doing.room !== Infinity) {
    // Whatever it does, its crown stays under the lid of the frame: the lift first, then the feathers on end, then the neck.
    let spare = Math.max(0, doing.room - Math.max(0, out.y))
    out.puff = Math.min(out.puff, 1 + spare / GULL_TALL)
    spare -= (out.puff - 1) * GULL_TALL
    out.neck = Math.min(out.neck, Math.max(0, spare) / (GULL_SIZE * out.puff))
  }
  return out
}

/** The whale: how far its back is out of the water, and its eye. */
export function whalePose(t: number, poked: number, out: { rise: number; lids: number; tail: number }): { rise: number; lids: number; tail: number } {
  out.rise = Math.sin(t * 0.8) * 0.08 + (poked < 1.2 ? bump(poked, 0, 1.2) * 0.3 : 0)
  out.tail = Math.sin(t * 1.3 + 0.5) * 0.25
  const blink = (t + 0.4) % 6.3
  out.lids = blink < 0.2 ? Math.abs(blink - 0.1) / 0.1 : 1
  return out
}

// --- The island spun, and the wave ------------------------------------------------

/**
 * What a spinning island does to a toy, laid over its pose where it stands. `spin` is how fast the island
 * turns, 0 to 1, and `t` the game's clock. Each toy takes it in its own way; the lighthouse stands stiff and
 * only its beam smears, which the model and the view do between them.
 */
export function spunPose(kind: Kind, where: 'land' | 'sea', spin: number, t: number, out: Pose): Pose {
  if (spin <= 0.02) return out
  switch (kind) {
    case 'lighthouse':
      break
    case 'boat':
      if (where === 'land') {
        // It lies still on its keel and swings like a needle (the model turns it): no flapping while it slides.
        out.roll *= 1 - spin
        out.y *= 1 - spin
        out.part.yaw *= 1 - spin
        out.pitch += 0.12 * spin
      } else {
        // The water turns under it and it surfs backward, bow high.
        out.roll += 0.3 * spin
        out.x += Math.sin(0.3 * spin) * 0.5
        out.y += 0.08 * spin
      }
      break
    case 'sheep':
      // Stiff-legged on ice: head up, the whole sheep quivering.
      out.part.pitch = out.part.pitch * (1 - spin) - 0.55 * spin
      out.sy *= 1 + 0.07 * spin
      out.roll += Math.sin(t * 31) * 0.07 * spin
      out.yaw += Math.sin(t * 5.3) * 0.5 * spin
      break
    case 'tree':
      // The crown is flung flat and wide; the model makes it lag behind the trunk.
      if (where === 'land') out.part.s *= 1 + 0.04 * spin
      break
    case 'house':
      // The whole house rattles.
      out.roll += Math.sin(t * 37) * 0.03 * spin
      out.part.y += Math.abs(Math.sin(t * 14)) * 0.08 * spin
      break
  }
  return out
}

/** How long a toy's first sound on the wave is from its second, in seconds: the bottle's glug, the top's whirr. */
export const RIDE_BEAT: Record<Kind, number> = { lighthouse: 0.45, boat: 0.9, sheep: 0.7, tree: 0.55, house: 0.8 }

/**
 * A toy riding the wave's crest, each in its own way. `t` is the seconds it has ridden and `heading` the way
 * the wave is going. `tall` is how tall the toy stands at rest, for the two that ride upside down.
 */
export function ridePose(kind: Kind, t: number, heading: number, tall: number, out: Pose): Pose {
  clear(out)
  const settle = smooth(span(t, 0, 0.3))
  switch (kind) {
    case 'lighthouse':
      // Upright like a bottle, sunk to its first stripe, bobbing, its lamp blinking.
      out.y = -0.5 * settle + Math.sin(t * 7) * 0.12
      out.roll = Math.sin(t * 3.5) * 0.08
      out.glow = Math.floor(t / 0.22) % 2 === 0 ? 1 : 0.15
      break
    case 'boat':
      // Bow first down the face of the wave.
      out.yaw = heading * settle
      out.roll = -0.3 * settle + Math.sin(t * 5) * 0.06
      out.y = Math.sin(t * 5) * 0.06
      out.part.yaw = 0.5
      out.part.s = 1.12
      break
    case 'sheep':
      // On its back with its legs in the air.
      out.roll = Math.PI * settle
      out.y = tall * 0.78 * settle + Math.sin(t * 6) * 0.05
      out.part.pitch = Math.sin(t * 9) * 0.2
      break
    case 'tree':
      // Spinning like a top, a little off its axis.
      out.yaw = t * 14
      out.roll = 0.12 * settle
      out.y = Math.sin(t * 4) * 0.05
      break
    case 'house':
      // Roof down, like a hat on the water.
      out.pitch = Math.PI * settle
      out.y = tall * 0.8 * settle + Math.sin(t * 3) * 0.06
      out.yaw = Math.sin(t * 1.7) * 0.25
      break
  }
  return out
}
