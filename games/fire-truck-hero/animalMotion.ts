// How the four animals move, as numbers: the cat, the duck, the bee and the
// snail. No renderer. Each moves like itself and no two share a move (ART.md,
// "The characters and their fixed tastes"):
// - the cat is slow and heavy until water touches her, and then all at once;
// - the duck is a bath toy: it bobs, wriggles and paddles in quick little beats;
// - the bee never stops: she circles, bumps, zigzags and hums;
// - the snail does one thing at a time, very slowly.
// Their tastes never change, so what each does about water is always the same.

import type { Place } from './layout'
import { ROOF_HEIGHT } from './places'
import type { Channels } from './scenes'
import { kick, spring, stepSpring, type Feel } from './springs'
import { Gesture, hump } from './thingMotion'
import type { Action } from './things'

/** How often each animal's idle move comes round, in beats a second. No two are near each other. */
export const TEMPO = { cat: 0.28, duck: 1.7, bee: 0.5, snail: 0.16 } as const

/** How often the duck taps a dry pool floor, in seconds. */
export const DUCK_TAPS_EVERY_S = 3.1

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** Going from one place to another: a walk in small hops, by a point to the side where something stands in the way, or one jump in an arc. */
class Going {
  private points: Place[] = [{ x: 0, z: 0 }, { x: 0, z: 0 }]
  private lengths: number[] = [0]
  private age = Infinity
  private lasts = 1
  private arc = 0
  private hops = 0
  private fromY = 0
  private toY = 0

  /** `fromY` and `toY` are how high it stands at the start and at the end: the sand is 0. `after` is how long it waits where it is before it sets off. */
  start(way: readonly Place[], speed: number, arc: number, hops: boolean, fromY = 0, toY = 0, after = 0): void {
    this.fromY = fromY
    this.toY = toY
    this.points = way.map((point) => ({ ...point }))
    this.lengths = this.points.slice(1).map((point, i) => Math.hypot(point.x - this.points[i].x, point.z - this.points[i].z))
    const far = this.lengths.reduce((sum, length) => sum + length, 0)
    this.lasts = Math.max(0.35, far / speed)
    this.arc = arc
    this.hops = hops ? Math.max(1, Math.round(far / 0.9)) : 0
    this.age = -after
  }

  step(seconds: number): void {
    if (this.age !== Infinity) this.age += seconds
  }

  get going(): boolean {
    return this.age < this.lasts
  }

  /** Where it is now, how high, and which way it is headed (0 is along +x, toward +z is positive). */
  at(rest: Place): { x: number; z: number; y: number; heading: number | null } {
    if (!this.going) return { x: rest.x, z: rest.z, y: this.toY, heading: null }
    // Before it sets off it stands where it was, facing as it did.
    if (this.age < 0) return { x: this.points[0].x, z: this.points[0].z, y: this.fromY, heading: null }
    const t = this.age / this.lasts
    const far = this.lengths.reduce((sum, length) => sum + length, 0)
    let left = smooth(t) * far
    let leg = 0
    while (leg < this.lengths.length - 1 && left > this.lengths[leg]) left -= this.lengths[leg++]
    const from = this.points[leg], to = this.points[leg + 1]
    const share = this.lengths[leg] > 0 ? Math.min(1, left / this.lengths[leg]) : 1
    const lift = this.hops > 0 ? Math.abs(Math.sin(t * Math.PI * this.hops)) * 0.16 : Math.sin(t * Math.PI) * this.arc
    const y = this.fromY + (this.toY - this.fromY) * smooth(t) + lift
    return { x: from.x + (to.x - from.x) * share, z: from.z + (to.z - from.z) * share, y, heading: Math.atan2(to.z - from.z, to.x - from.x) }
  }
}

// --- The cat -----------------------------------------------------------------

const CAT_BODY: Feel = { stiffness: 120, damping: 11 }

/** How high she jumps when there is no way round what stands between: higher than the tallest thing in a yard. */
export const JUMP_OVER = 3.1

/** How big she is in the boat and on the truck, as a share of her size on the sand: she is a small cat in a small place. */
export const SIZE_IN_BOAT = 0.45
export const SIZE_ON_ROOF = 0.75

/** How long she lifts her paws out of creeping run-off, one at a time, before she moves over. */
export const PAWS_S = 1.0
/** How far she rocks to the side off a lifted paw, in radians. */
export const PAW_ROCK = 0.2
/** How long she looks at the wet logs and at the truck before she turns her back. */
export const HUFF_S = 2.4

export class CatMotion {
  readonly pose = { x: 0, z: 0, y: 0, turn: 0, squash: 1, size: 1, headTurn: 0, headTilt: 0, shake: 0, ears: 0, tail: 0, tailUp: 0, paw: 0, pawFar: 0, lean: 0, eyesShut: 0, upright: 0 }
  private readonly going = new Going()
  private leap = spring(0)
  private upright = spring(0)
  private eyes = spring(0)
  private size = spring(1)
  private readonly paw = new Gesture()
  private readonly glare = new Gesture()
  private readonly shake = new Gesture()
  private readonly duck = new Gesture()
  private readonly sneeze = new Gesture()
  private readonly huff = new Gesture()
  private readonly paws = new Gesture()
  /** How far she has turned her back on the truck, 0 to 1. Once the fire is out she sits that way wherever she sits on the sand. */
  private back = spring(0)
  private time = 0
  private home: Place = { x: 0, z: 0 }
  private facing = 0
  private onRoof = false
  private inAir = false

  /** Puts her where she is, as she was left. `faces` is the way she looks when nothing has her attention. `putOut` is true where a fire has gone out: she is found with her back turned. */
  settle(at: Place, faces: number, onRoof: boolean, as: { warm: boolean; marooned: boolean; napping: boolean; putOut?: boolean } = { warm: false, marooned: false, napping: false }): void {
    this.home = { ...at }
    this.facing = faces
    this.onRoof = onRoof
    this.going.start([at, at], 1, 0, false, onRoof ? ROOF_HEIGHT : 0, onRoof ? ROOF_HEIGHT : 0)
    this.going.step(1)
    this.size.value = this.size.target = onRoof ? SIZE_ON_ROOF : as.napping || as.marooned ? SIZE_IN_BOAT : 1
    // She is found as she was: eyes shut by a fire or asleep in the boat, bolt upright if she is afloat.
    this.upright.value = this.upright.target = as.marooned ? 1 : 0
    this.eyes.value = this.eyes.target = (as.warm || as.napping) && !as.marooned ? 1 : 0
    this.back.value = this.back.target = as.putOut ? 1 : 0
    this.back.velocity = 0
  }

  /** `creeping` is true when the water is run-off on the ground and not drops in the air. */
  answer(action: Action, strength = 1, creeping = false): void {
    if (this.onRoof) {
      // On the roof she takes no water: a shrug, and she goes on washing her paw.
      kick(this.leap, 0.8)
      return
    }
    // One gulp: straight up on four stiff legs, a shaken paw, and a glare at the truck.
    if (action === 'gulp') {
      kick(this.leap, 5.2 * strength)
      this.inAir = true
      this.paw.start()
      this.glare.start()
    } else if (action === 'fill') this.shake.start()
    else if (action === 'sweep') this.duck.start()
    // Run-off creeps toward her: she lifts her paws one at a time. A flung drop on her nose: she sneezes.
    else if (action === 'neighbour' && creeping) this.paws.start()
    else if (action === 'neighbour') this.sneeze.start()
  }

  /**
   * She goes somewhere else. `via` is the way round whatever stands between: no
   * points for a straight stalk across the sand, one point to go round a thing,
   * and null when there is no way round, or when she goes onto or off the
   * truck's roof: then it is one jump in a high arc.
   */
  move(to: Place, faces: number, toRoof: boolean, via: readonly Place[] | null = []): void {
    const jump = toRoof || this.onRoof || via === null
    // Onto the roof and off it she goes in one high arc, well clear of the truck's light and nozzle.
    // Paws that are being lifted are lifted first, and then she goes.
    const after = this.paws.playing(PAWS_S) ? PAWS_S * (1 - this.paws.through(PAWS_S)) : 0
    this.going.start([this.home, ...(jump ? [] : (via ?? [])), to], jump ? 5.2 : 2.3, toRoof || this.onRoof ? 2.6 : jump ? JUMP_OVER : 0, !jump, this.onRoof ? ROOF_HEIGHT : 0, toRoof ? ROOF_HEIGHT : 0, after)
    this.size.target = toRoof ? SIZE_ON_ROOF : 1
    this.home = { ...to }
    this.facing = faces
    this.onRoof = toRoof
  }

  /** The fire she sat by has gone out: she looks at the logs, then at the truck, and turns her back with her tail up. */
  fireOut(): void {
    this.huff.start()
  }

  /**
   * `warm` is true while a fire burns in the yard; `marooned` while she floats in the boat; `toTruck` is the turn
   * of her head toward the truck, and `away` the turn of her whole body that puts her back to it.
   */
  step(seconds: number, warm: boolean, marooned: boolean, napping: boolean, toTruck: number, away = Math.PI): typeof this.pose {
    this.time += seconds
    this.going.step(seconds)
    for (const gesture of [this.paw, this.glare, this.shake, this.duck, this.sneeze, this.huff, this.paws]) gesture.step(seconds)
    stepSpring(this.leap, CAT_BODY, seconds)
    if (this.leap.value < 0) {
      this.leap.value = 0
      this.leap.velocity = 0
      this.inAir = false
    }
    this.upright.target = marooned ? 1 : 0
    stepSpring(this.upright, CAT_BODY, seconds)
    stepSpring(this.size, { stiffness: 30, damping: 11 }, seconds)
    // By a fire, or asleep in the boat, her eyes are shut.
    this.eyes.target = (warm || napping) && !marooned && !this.going.going ? 1 : 0
    stepSpring(this.eyes, { stiffness: 30, damping: 11 }, seconds)

    const pose = this.pose
    const way = this.going.at(this.home)
    pose.x = way.x
    pose.z = way.z
    pose.y = way.y + this.leap.value
    const huffing = this.huff.through(HUFF_S)
    // After her two looks she turns her back, and that is how she sits from then on. On the truck her back is to the hose already.
    if (huffing < 1 && huffing > 0.6) this.back.target = 1
    stepSpring(this.back, { stiffness: 26, damping: 9 }, seconds)
    const backTurned = this.onRoof ? 0 : Math.max(0, Math.min(1, this.back.value))
    pose.turn = way.heading ?? this.facing + away * backTurned
    const ducking = hump(this.duck.through(0.7))
    // Stiff and stretched in the air, squashed under a stream, and breathing slowly at rest.
    pose.squash = 1 + (this.inAir ? 0.12 : 0) - ducking * 0.42 + Math.sin(this.time * TEMPO.cat * 2 * Math.PI) * 0.015 + this.upright.value * 0.14 - (napping ? 0.2 : 0)
    const glaring = this.glare.playing(1.5) && !this.glare.playing(0.35) ? 1 : 0
    // With her back turned the truck is behind her: a glare is then a look over her shoulder.
    const round = toTruck - away * backTurned
    const toward = Math.max(-1.3, Math.min(1.3, Math.atan2(Math.sin(round), Math.cos(round))))
    pose.headTurn = glaring * toward + (huffing < 1 ? (huffing < 0.45 ? 0.5 : toTruck) * (1 - backTurned) : 0) + Math.sin(this.time * 0.31) * 0.12 * (1 - glaring)
    const sneezing = this.sneeze.through(0.45)
    pose.headTilt = sneezing < 1 ? -hump(sneezing) * 0.5 : 0
    const shaking = this.shake.through(0.8)
    pose.shake = shaking < 1 ? Math.sin(shaking * Math.PI * 9) * 0.5 * (1 - shaking) : 0
    pose.ears = Math.max(ducking, this.inAir ? 0.6 : 0) - this.upright.value * 0.3
    // Her tail flicks now and then, stands like a bottle brush under a stream, and goes up when she is put out.
    pose.tail = ducking > 0.1 ? 1 : Math.max(0, Math.sin(this.time * TEMPO.cat * 2 * Math.PI * 0.5) - 0.86) * 4
    pose.tailUp = this.onRoof ? 0.4 : backTurned
    const pawing = this.paw.through(1.0)
    // Out of creeping wet she lifts one front paw and then the other, twice over, each held up for a moment.
    const lifting = this.paws.through(PAWS_S)
    const lift = (from: number) => (lifting < 1 ? hump((lifting - from) / 0.25) * (lifting >= from && lifting < from + 0.25 ? 1 : 0) : 0)
    // A shaken paw after a gulp; on the roof, a paw washed slowly over and over.
    pose.paw = lifting < 1 ? Math.max(lift(0), lift(0.5)) : pawing < 1 && pawing > 0.3 ? Math.abs(Math.sin(pawing * Math.PI * 6)) : this.onRoof && !this.going.going ? 0.5 + 0.5 * Math.sin(this.time * 2.2) : 0
    pose.pawFar = Math.max(lift(0.25), lift(0.75))
    // Her whole body rocks off the paw she lifts, from side to side, so the lifting shows from across the yard.
    pose.lean = lifting < 1 ? (pose.pawFar - pose.paw) * PAW_ROCK : 0
    pose.eyesShut = this.eyes.value
    pose.upright = this.upright.value
    pose.size = this.size.value
    return pose
  }
}

// --- The duck ----------------------------------------------------------------

/** The duck's lap: how far from the pool's middle it paddles, and how far round to each side, in radians. */
export const LAP_RADIUS = 0.7
export const LAP_SWING = 0.6

/** How far the duck's wriggle rolls it, in radians for each unit of its spring: enough to see from across the yard. */
export const WRIGGLE = 0.3

/** How long the duck's ride over the rim and its waddle back take. */
export const RIDE_S = 3

export class DuckMotion {
  readonly pose = { x: 0, z: 0, y: 0, turn: 0, tilt: 0, wiggle: 0, beak: 0 }
  /** It tapped the pool floor in this step: the game plays the tick. */
  tapped = false
  /** It reached the puddle its ride over the rim left it in, in this step: it wriggles, and the game plays its quack. */
  splashed = false
  private rode = 1
  private wiggle = spring(0)
  private readonly tap = new Gesture()
  private readonly ride = new Gesture()
  private time = 0
  private sinceTap = DUCK_TAPS_EVERY_S - 1.2

  /** Water on the pool is water on the duck, which it likes: it wriggles. Too much and it rides out over the rim. */
  answer(action: Action, strength = 1): void {
    if (action === 'too-much') this.ride.start()
    else kick(this.wiggle, (action === 'sweep' || action === 'neighbour' ? 5 : 9) * strength)
  }

  /**
   * `floats` is how high the water holds it above the pool floor, in yard
   * units (0 on the floor); `rim` is how far the low side of the rim is from
   * the duck's place, toward the child, how high the wall stands above the
   * floor, and how far the sand lies below the floor. `dry` is true while the
   * pool holds no water at all.
   */
  step(seconds: number, afloat: boolean, floats: number, rim: { far: number; high: number; floor?: number }, channels: Channels, dry = !afloat && floats <= 0.001): typeof this.pose {
    this.time += seconds
    this.tap.step(seconds)
    this.ride.step(seconds)
    stepSpring(this.wiggle, { stiffness: 210, damping: 9 }, seconds)
    this.tapped = false
    // On a dry floor it taps the floor with its beak, which it dislikes, every few seconds. With water under it,
    // though too little to float on, the floor is not dry and it does not tap.
    this.sinceTap += seconds
    if (dry && !afloat && this.sinceTap > DUCK_TAPS_EVERY_S && !this.ride.playing(RIDE_S)) {
      this.sinceTap = 0
      this.tap.start()
      this.tapped = true
    }
    const pose = this.pose
    const beat = Math.sin(this.time * TEMPO.duck * 2 * Math.PI)
    // The lap of the ending: along its own side of the pool one way, back the other way, and home. It keeps to
    // its side, so it never meets the boat.
    const swing = Math.sin(channels.lap * Math.PI * 2) * LAP_SWING
    pose.x = afloat ? LAP_RADIUS * (1 - Math.cos(swing)) : 0
    pose.z = afloat ? LAP_RADIUS * Math.sin(swing) : 0
    pose.turn = channels.lap > 0 && channels.lap < 1 ? -0.6 + Math.cos(channels.lap * Math.PI * 2) * 1.3 * Math.sign(Math.sin(channels.lap * Math.PI * 4) || 1) : -0.6
    pose.y = floats + (afloat ? beat * 0.025 : 0)
    pose.tilt = hump(channels.dunk) * 1.15 + this.tapBow()
    const riding = this.ride.through(RIDE_S)
    // Down on the sand it stands in the puddle the overflow made, which it likes: a wriggle and a quack.
    this.splashed = riding < 1 && riding >= 0.42 && this.rode < 0.42
    this.rode = riding
    if (this.splashed) kick(this.wiggle, 12)
    if (riding < 1) {
      // Out over the low side of the rim on the overflow, a waddle on the sand, and back in the same way.
      const sand = -(rim.floor ?? 0)
      const out = rim.far + 0.75
      const leg = riding < 0.38 ? riding / 0.38 : riding > 0.62 ? (1 - riding) / 0.38 : 1
      pose.x = 0
      pose.z = out * smooth(leg)
      // It clears the wall in an arc each way, and stands on the sand in between.
      pose.y = leg < 1 ? floats + (sand - floats) * smooth(leg) + Math.sin(leg * Math.PI) * (rim.high + 0.5) : sand + Math.abs(Math.sin(riding * Math.PI * 16)) * 0.05
      pose.turn = riding < 0.5 ? Math.PI / 2 : -Math.PI / 2
      pose.tilt = Math.sin(riding * Math.PI * 14) * 0.12
    }
    const shaking = channels.shake > 0 && channels.shake < 1 ? Math.sin(channels.shake * Math.PI * 12) * 0.35 * (1 - channels.shake) : 0
    pose.wiggle = this.wiggle.value * WRIGGLE + shaking
    pose.beak = this.tap.playing(0.5) ? hump(this.tap.through(0.5)) : 0
    return pose
  }

  private tapBow(): number {
    return this.tap.playing(0.5) ? hump(this.tap.through(0.5)) * 0.7 : 0
  }
}

// --- The bee -----------------------------------------------------------------

/** How long the bee stays up after drops reach her. */
export const STARTLE_S = 1.8

export class BeeMotion {
  readonly pose = { x: 0, y: 0, z: 0, turn: 0, wings: 0, landed: 0 }
  private readonly startle = new Gesture()
  private time = 0

  /** Drops near her wings, which she dislikes: she zigzags up and comes back when the water stops. */
  answer(): void {
    this.startle.start()
  }

  /** `budTop` is how high the bud or the flower stands above the ground; `open` is true once the flower is open. */
  step(seconds: number, budTop: number, open: boolean, channels: Channels): typeof this.pose {
    this.time += seconds
    this.startle.step(seconds)
    const pose = this.pose
    const round = this.time * TEMPO.bee * 2 * Math.PI
    // She circles the pot, and once a lap she darts in and bumps the closed bud.
    const lap = (round / (2 * Math.PI)) % 1
    const bump = open ? 0 : hump(Math.min(1, Math.max(0, (lap - 0.78) / 0.16)))
    const radius = 0.95 - bump * 0.72
    let x = Math.cos(round) * radius
    let z = Math.sin(round) * radius
    let y = budTop + 0.42 - bump * 0.34 + Math.sin(this.time * 5.3) * 0.05
    const startled = this.startle.through(STARTLE_S)
    if (startled < 1) {
      const up = hump(Math.min(1, startled * 1.15))
      y += up * 1.5
      x += Math.sin(startled * 34) * 0.32 * up
    }
    // On an open flower she lands, and stays. Drops on her wings send her up off it every time, and she comes back down.
    const landed = (open ? channels.beeLands : 0) * (startled < 1 ? 1 - hump(Math.min(1, startled * 1.15)) : 1)
    pose.x = x * (1 - landed)
    pose.z = z * (1 - landed)
    pose.y = y * (1 - landed) + (budTop + 0.2) * landed
    pose.turn = -(round + Math.PI / 2) * (1 - landed)
    pose.wings = landed > 0.95 && startled >= 1 ? 0.25 : 1
    pose.landed = landed
    return pose
  }
}

// --- The snail ---------------------------------------------------------------

export class SnailMotion {
  readonly pose = { x: 0, z: 0, turn: 0, out: 0, feelers: 0 }
  private feelers = spring(0)
  /** The way it glides, point by point, measured from the middle of the patch. The first point is where it sits. */
  private way: Place[] = [{ x: 0.3, z: 0.25 }, { x: -0.5, z: -0.2 }]
  private lengths: number[] = [0.92]
  private time = 0

  /** Where it sits on the patch and the way it glides when it comes out, measured from the middle of the patch. */
  settle(from: Place, way: readonly Place[], feelers = 0): void {
    this.setOut(from, way)
    // It is found as it was: its feelers as far out as its patch is wet.
    this.feelers.value = this.feelers.target = feelers
  }

  /** The way it will glide, laid when it comes out: along the wet the child made. */
  setOut(from: Place, way: readonly Place[]): void {
    this.way = [{ ...from }, ...way.map((point) => ({ ...point }))]
    if (this.way.length < 2) this.way.push({ ...from })
    this.lengths = this.way.slice(1).map((point, i) => Math.hypot(point.x - this.way[i].x, point.z - this.way[i].z))
  }

  /** How far out its feelers are for the water its patch holds, with no fire near. */
  static feelersFor(gulps: number, out: number): number {
    return Math.max(out, Math.min(0.7, gulps * 0.3))
  }

  /** `gulps` is the water its patch holds; `heat` is true while a fire burns near, which it dislikes. */
  step(seconds: number, gulps: number, heat: boolean, channels: Channels): typeof this.pose {
    this.time += seconds
    // Its feelers come out a little further with each gulp, and go in from the heat of a fire.
    this.feelers.target = heat ? 0 : SnailMotion.feelersFor(gulps, channels.snailOut)
    stepSpring(this.feelers, { stiffness: 14, damping: 6.5 }, seconds)
    const pose = this.pose
    const far = channels.glide
    // Along its way leg by leg, at one pace, turning into each leg as it comes to it.
    let left = far * this.lengths.reduce((sum, length) => sum + length, 0)
    let leg = 0
    while (leg < this.lengths.length - 1 && left > this.lengths[leg]) left -= this.lengths[leg++]
    const from = this.way[leg], to = this.way[leg + 1]
    const share = this.lengths[leg] > 0 ? Math.min(1, left / this.lengths[leg]) : 0
    pose.x = from.x + (to.x - from.x) * share
    pose.z = from.z + (to.z - from.z) * share
    const heading = Math.atan2(to.z - from.z, to.x - from.x)
    // Round a corner its head comes round over the first part of the new leg.
    const before = leg > 0 ? Math.atan2(from.z - this.way[leg - 1].z, from.x - this.way[leg - 1].x) : heading
    const swing = Math.atan2(Math.sin(heading - before), Math.cos(heading - before))
    pose.turn = before + swing * smooth(Math.min(1, left / 0.45))
    // It stretches and gathers as it glides, one slow wave at a time.
    pose.out = channels.snailOut * (1 + (far > 0 && far < 1 ? Math.sin(this.time * TEMPO.snail * 2 * Math.PI * 6) * 0.12 : 0))
    pose.feelers = Math.max(0, this.feelers.value)
    return pose
  }
}
