import type { Kind } from './kinds'

// How each thing moves. Pure numbers: the view lays them on a mesh.
// Every thing has its own wobble on the rim, its own way of going in, its own
// answer to a finger, its own walk under a stack and its own way of riding on
// one; no two share a curve (motion.test.ts holds that).
// A working thing has no motion of its own at rest: it moves only when the
// hole or a finger makes it. The drummer alone keeps silent time.

/** Where a thing is relative to where it stands. `tilt` leans it toward the hole; `roll` leans it sideways to that. */
export type Pose = {
  /** 0..1 of the way from where it stands to the middle of the hole. */
  slide: number
  /** Up from the street; negative is down the hole. */
  lift: number
  tilt: number
  roll: number
  yaw: number
  /** A lean toward the near kerb, which is toward the finger that touched it. */
  fore: number
  /** Scale across (x and z) and up. */
  wide: number
  tall: number
  /** 0..1: how far it has turned its back to the hole. */
  about: number
}

export function rest(out: Pose): Pose {
  out.slide = 0; out.lift = 0; out.tilt = 0; out.roll = 0; out.yaw = 0; out.fore = 0; out.wide = 1; out.tall = 1; out.about = 0
  return out
}

// A thing is one mesh, and some of its parts move by themselves: the pie's
// plate and cherry, the dog's head, the drummer's arms. Each such part is a
// limb. A limb turns about its own root (three angles, applied about x, then
// y, then z), grows or shrinks along its upright, and shifts.

/** The most limbs any thing has. */
export const LIMBS = 5
/** Numbers to a limb: the turns about x, y and z, the growth along its upright, the shift along x, y and z, and the swell all round. */
export const LIMB = 8
export type Limbs = Float32Array

export function makeLimbs(): Limbs {
  return new Float32Array(LIMBS * LIMB)
}

export function still(limbs: Limbs): Limbs {
  limbs.fill(0)
  return limbs
}

/** Which limb is which, for each thing. The view builds the meshes to match. */
export const LIMB_OF = {
  pie: { plate: 0, cherry: 1, cream: 2 },
  hat: { brim: 0 },
  dog: { head: 0, tail: 1, ears: 2, front: 3, back: 4 },
  balloon: { body: 0, string: 1 },
  tuba: {},
  drummer: { left: 0, right: 1, leftLeg: 2, rightLeg: 3, cheeks: 4 },
} as const

const RX = 0, RY = 1, RZ = 2, GROW = 3, MX = 4, MY = 5, MZ = 6, SWELL = 7
const at = (limb: number, field: number): number => limb * LIMB + field

/** How long the balloon's string is at rest: when the balloon rises by `up`, the string grows to match. */
export const STRING = 0.5
function floatUp(limbs: Limbs, up: number): void {
  limbs[at(LIMB_OF.balloon.body, MY)] += up
  limbs[at(LIMB_OF.balloon.string, GROW)] += up / STRING
}

const TAU = Math.PI * 2
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const span = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))
const smooth = (t: number): number => t * t * (3 - 2 * t)
/** An angle that runs on for ever, folded back to within half a turn of rest, so it can die away. */
const folded = (angle: number): number => angle - TAU * Math.round(angle / TAU)

/** How many wobbles a second each thing makes on the rim: its tempo. */
export const TEETER_HZ: Readonly<Record<Kind, number>> = { pie: 3.4, hat: 2.2, dog: 5.2, balloon: 1.5, tuba: 1.1, drummer: 2.8 }

/** The tuba's wobble and the drummer's march get quicker the longer they are on the rim: by this much a second, up to three times their tempo. */
export function hurry(kind: Kind, onRim: number): number {
  return kind === 'tuba' || kind === 'drummer' ? Math.min(3, 1 + onRim * 0.7) : 1
}

/**
 * On the rim. `lean` is how far the hole is under it (0..1), `amp` how lively the wobble is (0..1, it dies away
 * when the hole rests), and `phase` runs on at the thing's own tempo. Adds to `out` and to `limbs`.
 */
export function teeter(kind: Kind, lean: number, amp: number, phase: number, out: Pose, limbs: Limbs): Pose {
  const wave = Math.sin(phase), cross = Math.cos(phase)
  switch (kind) {
    case 'pie':
      // The plate skates round the edge under the pie, and the cream leans the other way.
      out.tilt += lean * 0.2
      out.yaw += phase * 0.5 * amp
      out.roll += wave * 0.1 * amp
      out.slide += lean * 0.08
      limbs[at(LIMB_OF.pie.plate, MX)] += 0.16 * cross * amp
      limbs[at(LIMB_OF.pie.plate, MZ)] += 0.16 * wave * amp
      limbs[at(LIMB_OF.pie.cream, RZ)] += lean * 0.3 + 0.2 * cross * amp
      limbs[at(LIMB_OF.pie.cherry, MX)] += -0.07 * lean - 0.05 * cross * amp
      break
    case 'hat':
      // Rocks on its brim like a bell: a big slow swing either side of a lean.
      out.tilt += lean * 0.35 + wave * 0.42 * amp
      out.lift += Math.abs(wave) * 0.05 * amp
      break
    case 'dog':
      // Front wheels over the edge, spinning; nose well down, a fast small shiver, ears flapping.
      out.tilt += lean * 0.62
      out.roll += wave * 0.07 * amp
      out.lift += Math.max(0, cross) * 0.06 * amp
      limbs[at(LIMB_OF.dog.front, RZ)] -= folded(phase * 2.5) * Math.min(1, amp * 4 + lean)
      limbs[at(LIMB_OF.dog.ears, RX)] += 0.25 * lean + 0.7 * Math.abs(wave) * amp
      break
    case 'balloon':
      // Bulges over the edge: it squashes and swells slowly and hardly leans, and its string is pulled tight.
      out.tilt += lean * 0.18
      out.wide += (0.16 * wave * amp) + lean * 0.06
      out.tall -= 0.13 * wave * amp + lean * 0.05
      floatUp(limbs, 0.22 * lean)
      break
    case 'tuba':
      // Rolls round on the rim of its bell like a coin: the lean goes round and round.
      out.tilt += lean * 0.2 + cross * 0.3 * amp
      out.roll += wave * 0.3 * amp
      break
    case 'drummer': {
      // Marches on the spot, knees up, stiff as a post, with his arms windmilling.
      out.tilt += lean * 0.14
      out.roll += (wave > 0 ? 1 : -1) * 0.1 * amp
      out.lift += Math.abs(wave) * 0.16 * amp
      limbs[at(LIMB_OF.drummer.leftLeg, RX)] -= 0.9 * Math.max(0, wave) * amp
      limbs[at(LIMB_OF.drummer.rightLeg, RX)] -= 0.9 * Math.max(0, -wave) * amp
      const mill = Math.min(1, amp * 3)
      limbs[at(LIMB_OF.drummer.left, RX)] -= folded(phase * 1.5) * mill
      limbs[at(LIMB_OF.drummer.right, RX)] -= folded(phase * 1.5 + Math.PI) * mill
      break
    }
  }
  return out
}

/** Seconds each thing takes to go in, from tipping to out of sight. Small things are quick. */
export const FALL_SECONDS: Readonly<Record<Kind, number>> = { pie: 0.5, hat: 0.6, dog: 0.75, balloon: 0.85, tuba: 0.95, drummer: 1.15 }

/** How deep a thing has gone by the end of its fall. */
export const PIT_DEPTH = 3.4

/** Going in. `t` runs 0..1 over the thing's own time. Writes the whole pose, and adds to `limbs`. */
export function fall(kind: Kind, t: number, out: Pose, limbs: Limbs): Pose {
  rest(out)
  const tip = smooth(span(t, 0, 0.45)), go = span(t, 0.3, 1), down = go * go
  out.slide = smooth(span(t, 0, 0.6))
  out.lift = -PIT_DEPTH * down
  switch (kind) {
    case 'pie':
      // Flips cream side down early and slides off its plate, which hangs back and follows a moment later.
      out.tilt = Math.PI * smooth(span(t, 0, 0.35))
      out.lift += 0.25 * Math.sin(span(t, 0, 0.35) * Math.PI)
      limbs[at(LIMB_OF.pie.plate, MY)] -= 0.9 * Math.sin(span(t, 0.12, 0.95) * Math.PI)
      limbs[at(LIMB_OF.pie.plate, MX)] -= 0.3 * Math.sin(span(t, 0.12, 0.95) * Math.PI)
      break
    case 'hat':
      // Turns right over and goes crown first, turning as it goes.
      out.tilt = Math.PI * tip
      out.yaw = go * TAU * 0.75
      break
    case 'dog':
      // Noses down and rolls in on its wheels: it keeps its nose-down pitch, with no spin, and its wheels race.
      out.tilt = 1.35 * tip
      out.slide = span(t, 0, 0.5)
      limbs[at(LIMB_OF.dog.front, RZ)] -= t * 16
      limbs[at(LIMB_OF.dog.back, RZ)] -= t * 16
      limbs[at(LIMB_OF.dog.ears, RX)] += 0.9 * go
      break
    case 'balloon':
      // Sucked thin through the mouth, then springs round again inside.
      out.wide = 1 - 0.55 * Math.sin(span(t, 0.1, 0.75) * Math.PI) + 0.15 * Math.sin(span(t, 0.75, 1) * Math.PI)
      out.tall = 1 + 0.6 * Math.sin(span(t, 0.1, 0.75) * Math.PI)
      out.tilt = 0.25 * tip
      break
    case 'tuba':
      // Bell first: a slow heavy turn right over, which it makes as it sinks, so its bell goes down the mouth and not across it.
      out.tilt = Math.PI * smooth(span(t, 0.3, 0.9))
      out.lift += 0.5 * Math.sin(span(t, 0, 0.5) * Math.PI)
      break
    case 'drummer':
      // Falls in backwards, still drumming: he turns his back to the hole and topples into it, and his sticks keep going.
      out.about = smooth(span(t, 0, 0.3))
      out.tilt = 0.5 * smooth(span(t, 0.15, 0.6))
      out.roll = 0.12 * Math.sin(t * TAU * 3)
      limbs[at(LIMB_OF.drummer.left, RX)] += 0.7 * Math.max(0, Math.sin(t * TAU * 3))
      limbs[at(LIMB_OF.drummer.right, RX)] += 0.7 * Math.max(0, -Math.sin(t * TAU * 3))
      break
  }
  // Everything is a little smaller the deeper it is, so the hole reads as deep.
  const far = 1 - 0.35 * down
  out.wide *= far
  out.tall *= far
  return out
}

/** Seconds a touched thing's answer lasts. */
export const POKE_SECONDS: Readonly<Record<Kind, number>> = { pie: 0.7, hat: 0.5, dog: 0.8, balloon: 1.1, tuba: 0.9, drummer: 0.6 }

/** Touched where it stands. `t` is the seconds since the finger landed. Adds to `out` and to `limbs`. */
export function poke(kind: Kind, t: number, out: Pose, limbs: Limbs): Pose {
  const u = t / POKE_SECONDS[kind]
  if (u < 0 || u >= 1) return out
  const fade = 1 - u
  switch (kind) {
    case 'pie':
      // The cream wobbles like jelly, and the cherry hops off it and lands again.
      out.wide += 0.05 * Math.sin(u * TAU * 4) * fade
      limbs[at(LIMB_OF.pie.cream, RZ)] += 0.3 * Math.sin(u * TAU * 4) * fade
      limbs[at(LIMB_OF.pie.cream, RX)] += 0.22 * Math.cos(u * TAU * 4) * fade
      limbs[at(LIMB_OF.pie.cherry, MY)] += 0.42 * Math.abs(Math.sin(u * Math.PI * 2)) * fade
      break
    case 'hat':
      // The brim flips up and down like a lid, twice.
      out.lift += 0.08 * Math.sin(u * Math.PI)
      limbs[at(LIMB_OF.hat.brim, RZ)] += 0.85 * Math.abs(Math.sin(u * Math.PI * 2)) * fade
      break
    case 'dog':
      // Its head nods on its spring, and its tail twangs.
      out.tilt += 0.05 * Math.sin(u * TAU * 5) * fade
      limbs[at(LIMB_OF.dog.head, RZ)] += 0.5 * Math.sin(u * TAU * 3) * fade
      limbs[at(LIMB_OF.dog.tail, RZ)] += 0.9 * Math.sin(u * TAU * 7) * fade
      break
    case 'balloon':
      // Bobs on its string and bounces twice, slow and light.
      floatUp(limbs, 0.5 * Math.abs(Math.sin(u * TAU)) * fade)
      out.wide += 0.08 * Math.cos(u * TAU * 2) * fade
      out.tall -= 0.08 * Math.cos(u * TAU * 2) * fade
      break
    case 'tuba':
      // The bell swings toward the finger and back, heavy, twice: oom, pah.
      out.fore += 0.3 * Math.abs(Math.sin(u * TAU)) * fade
      out.tall += 0.07 * Math.sin(u * TAU * 2) * fade
      break
    case 'drummer': {
      // One big beat: he squashes down hard and springs up, one stick on the drum and the other on the cymbal.
      const beat = Math.sin(Math.min(1, u * 3) * Math.PI)
      out.tall -= 0.14 * beat
      out.wide += 0.1 * beat
      out.lift += 0.2 * Math.sin(span(u, 0.33, 1) * Math.PI) * fade
      limbs[at(LIMB_OF.drummer.left, RX)] += 0.9 * beat
      limbs[at(LIMB_OF.drummer.right, RX)] -= 1.1 * Math.sin(span(u, 0.2, 0.7) * Math.PI)
      limbs[at(LIMB_OF.drummer.cheeks, SWELL)] += 0.55 * Math.sin(Math.min(1, u * 1.6) * Math.PI)
      break
    }
  }
  return out
}

/**
 * Keeps a pose inside the room the thing has. `round` is how far any part of it may come out past its own foot
 * to any side, and `ahead` the same toward the hole; `high` is how tall it stands, `half` half its width, and
 * `far` how far off the middle of the hole is. A thing with room to fall its whole length leans as it likes.
 */
export function inRoom(pose: Pose, high: number, half: number, round: number, ahead: number, far: number): Pose {
  const most = (room: number): number => (room >= high ? Infinity : Math.asin(Math.max(0, room) * 0.5 / high))
  const forward = pose.tilt > 0 ? most(Math.max(round, ahead)) : most(round)
  if (Math.abs(pose.tilt) > forward) pose.tilt = Math.sign(pose.tilt) * forward
  const side = Math.hypot(pose.roll, pose.fore), sideMost = most(round)
  if (side > sideMost) { pose.roll *= sideMost / side; pose.fore *= sideMost / side }
  pose.wide = Math.min(pose.wide, 1 + Math.max(0, round) * 0.25 / half)
  const slid = far * pose.slide, slideMost = Math.max(0, Math.max(round, ahead)) * 0.25
  if (slid > slideMost && Math.max(round, ahead) < high) pose.slide = slideMost / Math.max(far, 1e-6)
  return pose
}

/** The turn that brings a thing's back round to the hole, which lies the way of (dirX, dirZ). */
export function backTo(dirX: number, dirZ: number): number {
  return Math.atan2(-dirX, -dirZ)
}

/** A landing: `squash` runs from 1 at the thump back to 0. Adds to `out`. */
export function land(squash: number, out: Pose): Pose {
  out.tall -= 0.28 * squash
  out.wide += 0.2 * squash
  return out
}

/** How far each thing gets with one step of its walk, and how long the step takes. */
export const STRIDE: Readonly<Record<Kind, number>> = { pie: 0.7, hat: 0.85, dog: 0.6, balloon: 1.1, tuba: 0.5, drummer: 0.55 }
export const STEP_SECONDS: Readonly<Record<Kind, number>> = { pie: 0.34, hat: 0.36, dog: 0.2, balloon: 0.44, tuba: 0.38, drummer: 0.3 }

/** How far through its way a walker is, for `phase` steps taken of `steps`: each thing covers the ground of a step in its own manner. */
export function strode(kind: Kind, phase: number, steps: number): number {
  const whole = Math.floor(phase), part = phase - whole
  let eased = part
  // The pie slides and stops; the tuba heaves itself round; the rest move evenly, or are in the air.
  if (kind === 'pie') eased = 1 - (1 - part) * (1 - part)
  else if (kind === 'tuba') eased = smooth(part)
  return Math.min(1, (whole + eased) / Math.max(1, steps))
}

/** A thing whose step leaves the street: the hat hops and the balloon bounces. Such a step is heard as it lands. */
export function airborne(kind: Kind): boolean {
  return kind === 'hat' || kind === 'balloon'
}

/**
 * How far a walker's own step lifts it off the street, `phase` steps into its walk with `load` on it. The view
 * draws it there and a finger finds it there (`liftOf` in play.ts).
 */
export function stepLift(kind: Kind, phase: number, load: number): number {
  const part = phase - Math.floor(phase)
  switch (kind) {
    case 'hat': return 0.5 * Math.sin(part * Math.PI)
    // The heavier the load the lower the bounce.
    case 'balloon': return (0.75 / (1 + 0.14 * load)) * Math.abs(Math.sin(part * Math.PI))
    case 'tuba': return 0.06 * Math.sin(part * Math.PI)
    case 'drummer': return 0.08 * Math.abs(Math.sin(phase * Math.PI))
    default: return 0
  }
}

/**
 * Walking, under a stack or alone. `phase` counts steps and runs on; `load` is the summed width of what it
 * carries. Adds to `out` and to `limbs`.
 */
export function walk(kind: Kind, phase: number, load: number, out: Pose, limbs: Limbs): Pose {
  const part = phase - Math.floor(phase), swing = Math.sin(phase * Math.PI), beat = Math.cos(phase * Math.PI)
  out.lift += stepLift(kind, phase, load)
  switch (kind) {
    case 'pie':
      // Slides along on its plate: a shove, a glide, a stop, and the cream slops forward at each stop.
      out.tilt += 0.1 * Math.sin(part * Math.PI)
      limbs[at(LIMB_OF.pie.cream, RZ)] += 0.25 * Math.sin(part * TAU)
      break
    case 'hat':
      // Hops like a frog: it crouches, leaps and lands.
      out.tall += 0.14 * Math.sin(part * TAU)
      out.tilt += 0.12 * Math.cos(part * Math.PI)
      break
    case 'dog':
      // Rolls on its wheels, the load swaying from side to side, and its ears streaming.
      out.roll += 0.06 * Math.sin(phase * Math.PI * 0.5) * Math.min(1.5, 0.5 + load * 0.15)
      limbs[at(LIMB_OF.dog.front, RZ)] -= phase * 3.4
      limbs[at(LIMB_OF.dog.back, RZ)] -= phase * 3.4
      limbs[at(LIMB_OF.dog.ears, RX)] += 0.3
      break
    case 'balloon': {
      // Bounces, and squashes wide where it lands.
      const touch = Math.cos(part * TAU)
      out.wide += 0.12 * Math.max(0, touch)
      out.tall -= 0.14 * Math.max(0, touch)
      break
    }
    case 'tuba':
      // Waddles: it heaves over onto one side of its bell, then the other.
      out.roll += 0.17 * (Math.floor(phase) % 2 === 0 ? 1 : -1) * Math.sin(part * Math.PI)
      break
    case 'drummer':
      // Marches: knees up by turns, a small bounce on each foot. His left foot comes down as each even step begins,
      // and his left stick is down in that same frame, which is the frame of his boom; the right stick ticks on the other foot.
      limbs[at(LIMB_OF.drummer.leftLeg, RX)] -= 0.75 * Math.max(0, -swing)
      limbs[at(LIMB_OF.drummer.rightLeg, RX)] -= 0.75 * Math.max(0, swing)
      limbs[at(LIMB_OF.drummer.left, RX)] += 0.8 * Math.max(0, beat)
      limbs[at(LIMB_OF.drummer.right, RX)] += 0.5 * Math.max(0, -beat)
      break
  }
  return out
}

/**
 * How a thing sits in a stack. `under` is true for the bottom thing of a stack of two or more, which is used
 * the wrong way; every thing above it is worn or used the right way. `flip` turns it upside down.
 */
/** `back` moves it toward the far side of the stack, so a thing that lies back stays over the stack's foot. */
export type Seat = { tilt: number; roll: number; yaw: number; lift: number; back: number; wide: number; tall: number; flip: boolean }

/** What a thing on a stack is told about its place. */
export type Riding = {
  /** Seconds since it came to sit where it sits. */
  since: number
  /** 0..1: the hole is on the move. */
  lively: number
  /** Which way the hole is from the stack, as an angle about the upright from the stack's own facing. */
  look: number
  /** The beat of the stack's bob or step, -1..1, 1 in the frame its note sounds; 0 when the stack stands still. */
  bob: number
  /** The thing below it is narrower than it is. */
  narrow: boolean
  /** Nothing sits on it. */
  top: boolean
  /** Seconds of play, for what runs on. */
  time: number
}

export function seat(kind: Kind, under: boolean, riding: Riding, out: Seat, limbs: Limbs): Seat {
  out.tilt = 0; out.roll = 0; out.yaw = 0; out.lift = 0; out.back = 0; out.wide = 1; out.tall = 1; out.flip = false
  const settle = clamp01(riding.since / 0.4)
  if (under) {
    switch (kind) {
      // A shoe: squashed flat, and whatever stands on it sinks in.
      case 'pie': out.tall = 0.45; out.wide = 1.2; break
      // A bucket: upside down, with the next thing sitting in it.
      case 'hat': out.flip = true; break
      // A cushion: squashed wide, and its string lies slack.
      case 'balloon': out.tall = 0.68; out.wide = 1.14; break
      // A seat: on its bell, with the next thing sitting in it.
      case 'tuba': out.flip = true; break
      // A cart: its ears are pressed flat by the load.
      case 'dog': limbs[at(LIMB_OF.dog.ears, RX)] -= 0.2; break
      // A pedestal: he stands as he always stands.
      case 'drummer': break
    }
    return out
  }
  switch (kind) {
    case 'pie': {
      // A dish, cream up. The cherry comes down last.
      const drop = 1 - clamp01(riding.since / 0.35)
      limbs[at(LIMB_OF.pie.cherry, MY)] += 0.9 * drop * drop + 0.12 * Math.sin(span(riding.since, 0.35, 0.6) * Math.PI)
      break
    }
    case 'hat':
      // Worn: tipped to one side, and down over the eyes of a thing narrower than itself.
      out.roll = 0.26
      if (riding.narrow) out.lift = -0.26 * settle
      break
    case 'dog':
      // Rides, wagging, and turns its head to wherever the hole goes.
      limbs[at(LIMB_OF.dog.head, RY)] += Math.max(-1.3, Math.min(1.3, riding.look))
      limbs[at(LIMB_OF.dog.tail, RZ)] += 0.7 * Math.sin(riding.time * 15) * Math.max(riding.lively, 1 - clamp01(riding.since / 1.2))
      break
    case 'balloon':
      // Floats up to the end of its string, when nothing sits on it.
      if (riding.top) floatUp(limbs, 0.6 * smooth(settle) + 0.05 * Math.sin(riding.time * 9))
      break
    case 'tuba':
      // Played: it lies back on the thing below with its bell up, and jumps a little with each note.
      out.tilt = 0.55
      out.back = 0.5
      out.lift = 0.3 + 0.08 * Math.max(0, riding.bob)
      break
    case 'drummer':
      // Sits astride, legs out to either side, and drums on what he sits on.
      out.lift = -0.5 * settle
      limbs[at(LIMB_OF.drummer.leftLeg, RZ)] -= 1.0 * settle
      limbs[at(LIMB_OF.drummer.rightLeg, RZ)] += 1.0 * settle
      // Both sticks are down on the beat, which is the frame of his boom, and up between beats.
      limbs[at(LIMB_OF.drummer.left, RX)] += 0.75 * Math.max(0, riding.bob)
      limbs[at(LIMB_OF.drummer.right, RX)] += 0.6 * Math.max(0, riding.bob)
      break
  }
  return out
}

/** The drummer's sticks go at this many beats a second, whatever happens. */
export const STICK_HZ = 1.2

/**
 * The drummer keeps silent time with his sticks whatever happens: a small lift of one stick, then the other, always
 * at the same tempo. `drum` (0..1) is how hard he is beating, and only how high the sticks lift follows it. `free`
 * (0..1) is how free the sticks are to lift: 0 in the frame of a beat that is heard (a bob of the breath, a step of
 * the stack he rides or carries), when they are down on the drum.
 */
export function keepTime(time: number, drum: number, limbs: Limbs, free = 1): void {
  const beat = Math.sin(time * TAU * STICK_HZ), lift = (0.12 + 0.5 * drum) * free
  limbs[at(LIMB_OF.drummer.left, RX)] -= lift * Math.max(0, beat)
  limbs[at(LIMB_OF.drummer.right, RX)] -= lift * Math.max(0, -beat)
}

/** How many seconds one bob on the breath takes: longer the heavier the load. */
export function bobSeconds(load: number): number {
  return TAU / (4.2 - 2.2 * Math.min(1, load / 8))
}

/**
 * Riding on the hole's breath: a bob that is lighter the smaller the load. `beat` is how far through the bob the
 * stack is, as an angle (`Play.bob`): the same clock its notes and the drummer's sticks keep.
 */
export function ride(load: number, beat: number): number {
  const heavy = Math.min(1, load / 8)
  return Math.sin(beat) * (0.12 - 0.05 * heavy)
}
