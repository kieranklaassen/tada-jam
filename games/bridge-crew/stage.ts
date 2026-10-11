import { WATER } from './pose'
import { groundAt, groundOutline } from './sheet'
import { WAIT } from './ride'
import type { Beat } from './scene'
import type { Site, VehicleId } from './sites'
import type { Reaction } from './vehicles'

// The short scenes as lists of timed beats (scene.ts), and what they show.
// Pure: a beat only writes its progress into a `Show`, and the functions below
// turn a show into where a vehicle is. The game starts a scene and saves its
// outcome at that moment; the view reads the show and never changes it.

/** What a scene is showing at this instant: each beat's progress, 0 before it and 1 after. */
export type Show = {
  kind: 'give' | 'crossing' | null
  vehicle: VehicleId | null
  /** The run was the way home: the vehicle ends at the near bank. */
  homeward: boolean
  /** Where the vehicle's front axle was when the scene began, in cells, and how its body was tilted. */
  from: readonly [number, number]
  tilt: number
  /** The give: the part gives and the pieces part; the vehicle falls; it floats and paddles to the near bank; it drives up; it shakes the water off; the bridge goes back as built. */
  snap: number
  fall: number
  paddle: number
  climb: number
  shake: number
  restore: number
  /** The crossing: the bridge springs up and rings; the vehicle shows how the ride went; it parks; the ring fades; the next roll and the other vehicle arrive. */
  spring: number
  react: number
  park: number
  fade: number
  arrive: number
  /** How the vehicle took the ride, for the crossing. */
  reaction: Reaction | null
  /** What this crossing brings: the next sheet's roll, and the vehicle that draws up at the near bank. A later crossing on the same sheet brings neither again. */
  rollArrives: boolean
  arriving: VehicleId | null
}

export const idleShow = (): Show => ({ kind: null, vehicle: null, homeward: false, from: [0, 0], tilt: 0, snap: 0, fall: 0, paddle: 0, climb: 0, shake: 0, restore: 0, spring: 0, react: 0, park: 0, fade: 0, arrive: 0, reaction: null, rollArrives: false, arriving: null })

/** A cue for a sound, played once when its beat begins: the game queues the voice. */
export type Cue = 'splash' | 'ring' | 'react' | 'arrive' | 'restore'

const beat = (at: number, lasts: number, write: (progress: number) => void): Beat => ({ at, lasts, play: write })

/**
 * The give (a consequence; 4 to 6 seconds): the part gives at its spot and the
 * pieces drop; the vehicle falls, floats on its crates, paddles to the near
 * bank and drives up, shaking off water; it ends with the bridge back as built.
 */
export function giveBeats(show: Show, cue: (what: Cue) => void): Beat[] {
  let splashed = false, restored = false
  return [
    beat(0, 0.3, (p) => { show.snap = p }),
    beat(0.15, 0.75, (p) => { show.fall = p; if (p >= 1 && !splashed) { splashed = true; cue('splash') } }),
    beat(0.9, 1.9, (p) => { show.paddle = p }),
    beat(2.8, 1.6, (p) => { show.climb = p }),
    beat(4.4, 0.7, (p) => { show.shake = p }),
    beat(4.5, 0.9, (p) => { show.restore = p; if (p > 0 && !restored) { restored = true; cue('restore') } }),
  ]
}

/**
 * The crossing (the ending; about 8 seconds): the wheels leave the last plank
 * and the bridge springs up and rings with the notes of its own parts; the
 * cargo and the driver show how this ride went; the vehicle parks in the
 * lay-by and stays there; the pencil ring fades; the next roll slides in and
 * one other vehicle draws up at the near bank.
 */
export function crossingBeats(show: Show, cue: (what: Cue) => void): Beat[] {
  let rung = false, reacted = false, arrived = false
  return [
    beat(0, 0.7, (p) => { show.spring = p; if (!rung) { rung = true; cue('ring') } }),
    beat(0.5, 3.4, (p) => { show.react = p; if (!reacted) { reacted = true; cue('react') } }),
    beat(3.9, 1.3, (p) => { show.park = p }),
    beat(4.6, 1.2, (p) => { show.fade = p }),
    beat(5.8, 1.9, (p) => { show.arrive = p; if (!arrived) { arrived = true; cue('arrive') } }),
  ]
}

const ease = (t: number) => t * t * (3 - 2 * t)
/** The share of the fall in which the vehicle rolls out over the water before it drops. */
const ROLL_OUT = 0.6

/** Where a vehicle in a scene is drawn: its front axle in cells, its tilt, how deep it sits in the water, and a wiggle for shaking dry. */
export type Place = { x: number; y: number; tilt: number; afloat: number; wiggle: number }

/** How deep a floating vehicle sits: its wheels are under, and the water's surface is at the foot of its crates. */
export const DRAUGHT = 0.45

/** The climb out, in shares of its beat: the tail rears up against the bank, the wheels drive up it, the vehicle tips over the lip onto the bank, and it rolls back to where it waits. */
export const CLIMB = { rear: 0.28, drive: 0.7, tip: 0.9 } as const

/** How far a vehicle's nose reaches ahead of its front axle, and how high it stands over its wheels' ground, in cells: the room it needs to lie in the water and to rear up in it. */
export const BODY = { nose: 0.6, high: 1.7 } as const

/** How far ahead of a rock in the water, in cells, a floating vehicle begins to come up onto it. */
const RISE = 0.6

/**
 * The face of the near bank, as a vehicle drives up it: the straight line
 * from `foot`, out on the water at the height `base`, to the lip. Up a wall
 * it is the wall. Up a wall that steps into the gap it is the line of the
 * steps' corners, which starts farther out: no corner stands through it.
 */
export function bankFace(at: Site, base: number): Face {
  const [near] = openWater(at), lip = at.left
  let foot = near + 0.05
  for (const [vx, vy] of groundOutline(at)) if (vx > lip[0] && vx <= near && vy > base && vy < lip[1]) foot = Math.max(foot, lip[0] + ((vx - lip[0]) * (lip[1] - base)) / (lip[1] - vy) + 0.05)
  return faceFrom(at, foot, base)
}
export type Face = { foot: number; steep: number; long: number; ux: number; uy: number }
function faceFrom(at: Site, foot: number, base: number): Face {
  const lip = at.left, long = Math.hypot(lip[0] - foot, lip[1] - base), ux = (lip[0] - foot) / long, uy = (lip[1] - base) / long
  // On the face a vehicle points down it, nose to the water: its wheels are on the face and its body over the gap.
  return { foot, steep: Math.atan2(-uy, -ux), long, ux, uy }
}

/** How high each vehicle sits when it has come ashore on a sheet: worked out once for each. */
const SHORE = new WeakMap<Site, Map<number, number>>()
const FACE = new WeakMap<Site, Face>()

/** How far out from the foot of the face a vehicle's nose and top reach while its tail rears up against it: the room it needs, in cells. */
export function sweep(face: Face, reach: number): number {
  let most = 0
  for (let i = 0; i <= 16; i++) {
    const tilt = (face.steep * i) / 16
    most = Math.max(most, ((-reach * Math.sin(tilt)) / face.uy) * face.ux + (reach + BODY.nose) * Math.cos(tilt) - BODY.high * Math.sin(tilt))
  }
  return most
}

/**
 * The vehicle during the give: off the road and down into the water, along it
 * to the near bank, up the bank, and still. `long` is the distance from its
 * front axle to its last, and `tail` how far its body reaches behind that: it
 * comes down and floats far enough out for its whole length to be clear of the bank.
 *
 * It floats on its crates, with its wheels under. It paddles tail first to the
 * bank, and it drives up the bank the same way, in reverse: its tail rears up
 * against the bank, its wheels take the bank's face and drive up it, and when
 * its front wheels are at the lip it tips over onto the bank, facing the gap,
 * and rolls back to where it waits.
 *
 * In a gap too narrow for it to lie in, it tips over the lip nose first and
 * slides down the bank's face, floats there standing on its nose, and drives
 * up again from there.
 */
export function givePlace(show: Show, at: Site, long: number, tail = 0): Place {
  const [near, far] = openWater(at)
  const reach = long + tail, afloat = WATER - DRAUGHT, lip = at.left
  const wait = lip[0] - WAIT.before
  const wiggle = show.shake > 0 && show.shake < 1 ? Math.sin(show.shake * 40) * (1 - show.shake) : 0
  const level = FACE.get(at) ?? bankFace(at, afloat)
  if (!FACE.has(at)) FACE.set(at, level)
  // No room to lie in the water, or to rear up in it: nose first down the face.
  const dart = far - level.foot < sweep(level, reach) + 0.2
  const shore = level.foot + reach
  // Where a bank, a rock or a ledge is under its wheels or its tail, it rides over it: no part of it is ever inside
  // one. It comes up onto a rock in the water as it nears it, and down again after it, and never in one step.
  const over = (x: number) => {
    let high = afloat
    const lift = (there: number, share: number) => {
      const ground = Math.min(lip[1], groundAt(at, there)) + 0.02
      if (ground > afloat) high = Math.max(high, afloat + (ground - afloat) * share)
    }
    // Under it from its nose to the end of its tail, and under each axle exactly.
    const steps = Math.ceil((reach + BODY.nose) / 0.125)
    for (let i = 0; i <= steps; i++) { const there = x + BODY.nose - ((reach + BODY.nose) * i) / steps; if (there <= x || (there > near && there < far)) lift(there, 1) }
    for (const back of [long, 0]) lift(x - back, 1)
    for (let out = 0.1; out < RISE; out += 0.1) for (const there of [x + BODY.nose + out, x - reach - out]) if (there > near && there < far) lift(there, 1 - out / RISE)
    return high
  }
  // Come ashore on a rock, it starts up the face from the rock's height.
  const known = SHORE.get(at) ?? new Map<number, number>()
  if (!SHORE.has(at)) SHORE.set(at, known)
  if (!dart && !known.has(reach * 100 + long)) known.set(reach * 100 + long, over(shore))
  const base = dart ? afloat : known.get(reach * 100 + long)!, face = base === afloat ? level : faceFrom(at, level.foot, base)
  const { foot, steep, ux, uy } = face
  // On the face: this far up it from its foot.
  const onFace = (along: number) => ({ x: foot + along * ux, y: base + along * uy })
  if (show.climb <= 0 && dart) {
    // Over the lip: back to it along the road's line, tipping nose down over it; then down the face to the water.
    const out = show.fall / ROLL_OUT, back = Math.min(1, out / 0.8), tip = ease(Math.max(0, Math.min(1, out * 2 - 1))), drop = Math.max(0, (show.fall - ROLL_OUT) / (1 - ROLL_OUT))
    if (show.fall < ROLL_OUT) return { x: show.from[0] + (lip[0] - show.from[0]) * back, y: show.from[1] + (lip[1] - show.from[1]) * back, tilt: show.tilt * (1 - back) + steep * tip, afloat: 0, wiggle: 0 }
    const down = onFace(face.long * (1 - drop * drop))
    if (show.paddle <= 0) return { ...down, tilt: steep, afloat: show.fall >= 1 ? 1 : 0, wiggle: 0 }
    // Afloat on its nose: it bobs against the face.
    return { ...onFace(0.08 * Math.abs(Math.sin(show.paddle * 14)) * (1 - show.paddle)), tilt: steep, afloat: 1, wiggle: 0 }
  }
  if (show.climb <= 0) {
    // It goes on from where the road left it, out to where its whole length is over open water, and never into the far
    // bank: it rolls out for the first part of the fall, and only then drops, nose first.
    // Its nose goes down first, so it comes down with its nose and its top clear of the far bank.
    const lands = Math.max(shore, Math.min(Math.max(show.from[0], shore) + 0.3, far - 1.25))
    // Rolling out it gathers way and loses it gently: it is never thrown from one place to another.
    const out = Math.min(1, show.fall / ROLL_OUT), dropX = show.from[0] + (lands - show.from[0]) * out * out * (3 - 2 * out)
    const drop = Math.max(0, (show.fall - ROLL_OUT) / (1 - ROLL_OUT)), fallY = show.from[1] + (afloat - show.from[1]) * drop * drop
    // Its nose goes down as it leaves the road and comes up again as it drops: it lands flat on the water.
    if (show.paddle <= 0) return { x: dropX, y: Math.max(fallY, over(dropX)), tilt: show.tilt * (1 - show.fall) - 0.35 * Math.sin(Math.PI * show.fall), afloat: show.fall >= 1 ? 1 : 0, wiggle: 0 }
    // Afloat on its crates: it bobs, and paddles back toward the near bank.
    const x = dropX + (shore - dropX) * ease(show.paddle), rides = over(x), bob = 0.08 * Math.abs(Math.sin(show.paddle * 14)) * (1 - show.paddle)
    // On a rock it is level: it rocks only on the water.
    return { x, y: rides + (rides > afloat ? 0 : bob), tilt: rides > afloat ? 0 : 0.06 * Math.sin(show.paddle * 9) * (1 - show.paddle), afloat: rides > afloat + DRAUGHT ? 0 : 1, wiggle: 0 }
  }
  // Out of the water on its wheels.
  const c = show.climb, wet = base > afloat + DRAUGHT ? 0 : 1
  if (c < CLIMB.rear) {
    // The tail rears up against the face while the front wheels come in over the water.
    const tilt = dart ? steep : steep * ease(c / CLIMB.rear)
    // The end of its tail is on the face, and its front wheels on the water.
    const tailAlong = (-reach * Math.sin(tilt)) / uy, x = foot + tailAlong * ux + reach * Math.cos(tilt)
    // Beside a rock it rears up over it: its nose, its top and its wheels stay clear of the rock.
    let clear = 0
    const fx = Math.cos(tilt), fy = Math.sin(tilt)
    for (const [along, high] of [[BODY.nose, 0], [BODY.nose, BODY.high], [0, 0], [-long, 0], [BODY.nose / 2, 0]] as const) {
      const there = x + along * fx - high * fy
      if (there > near && there < far) clear = Math.max(clear, groundAt(at, there) + 0.02 - (base + along * fy + high * fx))
    }
    return { x, y: base + clear, tilt, afloat: clear > DRAUGHT ? 0 : wet, wiggle }
  }
  if (c < CLIMB.drive) {
    const along = face.long * ease((c - CLIMB.rear) / (CLIMB.drive - CLIMB.rear))
    return { ...onFace(along), tilt: steep, afloat: wet * Math.max(0, 1 - (along * uy) / 0.8), wiggle }
  }
  if (c < CLIMB.tip) {
    // Its front wheels are at the lip: it tips over them onto the bank, faster as it goes.
    const fallen = (c - CLIMB.drive) / (CLIMB.tip - CLIMB.drive)
    return { x: lip[0], y: lip[1], tilt: steep * (1 - fallen * fallen), afloat: 0, wiggle }
  }
  return { x: lip[0] + (wait - lip[0]) * ease((c - CLIMB.tip) / (1 - CLIMB.tip)), y: lip[1], tilt: 0, afloat: 0, wiggle }
}

/** The stretch of the gap where the water is open: from where the near bank's foot goes under the surface to where the far bank's comes out of it. A rock that stands out of it in between is ridden over. */
export function openWater(at: Site): readonly [number, number] {
  const known = OPEN.get(at)
  if (known) return known
  let near = at.left[0], far = at.right[0]
  while (near < at.right[0] && groundAt(at, near + 0.05) >= WATER) near += 0.25
  while (far > near && groundAt(at, far - 0.05) >= WATER) far -= 0.25
  const open = [near, far] as const
  OPEN.set(at, open)
  return open
}
const OPEN = new WeakMap<Site, readonly [number, number]>()

/** The vehicle during the crossing: where the run left it while it reacts, then on to where it stays: the lay-by on the far bank, or, come home, its place in the line at the near bank. `stays` is that place's x. */
export function crossingPlace(show: Show, at: Site, stays: number): Place {
  return { x: show.from[0] + (stays - show.from[0]) * ease(show.park), y: show.homeward ? at.left[1] : at.right[1], tilt: 0, afloat: 0, wiggle: 0 }
}

/** Where the next roll stands as it slides in from the right edge: its x in cells, for a sheet `cols` wide. */
export const rollPlace = (arrive: number, cols: number): number => cols + 2.2 - 2.3 * ease(Math.min(1, arrive * 1.6))

/** How far the other vehicle has drawn up to the near bank from off the sheet: its front axle's x. `place` is its place in the line, 0 at the front. */
export const drawUp = (arrive: number, at: Site, place: number): number => {
  const stand = at.left[0] - WAIT.before - WAIT.apart * place
  return stand - (stand + 4) * (1 - ease(Math.max(0, Math.min(1, (arrive - 0.25) / 0.75))))
}
