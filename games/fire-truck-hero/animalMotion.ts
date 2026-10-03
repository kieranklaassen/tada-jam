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

  /** `fromY` and `toY` are how high it stands at the start and at the end: the sand is 0. */
  start(way: readonly Place[], speed: number, arc: number, hops: boolean, fromY = 0, toY = 0): void {
    this.fromY = fromY
    this.toY = toY
    this.points = way.map((point) => ({ ...point }))
    this.lengths = this.points.slice(1).map((point, i) => Math.hypot(point.x - this.points[i].x, point.z - this.points[i].z))
    const far = this.lengths.reduce((sum, length) => sum + length, 0)
    this.lasts = Math.max(0.35, far / speed)
    this.arc = arc
    this.hops = hops ? Math.max(1, Math.round(far / 0.9)) : 0
    this.age = 0
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

/** How big she is in the boat and on the truck, as a share of her size on the sand: she is a small cat in a small place. */
export const SIZE_IN_BOAT = 0.5
export const SIZE_ON_ROOF = 0.75

export class CatMotion {
  readonly pose = { x: 0, z: 0, y: 0, turn: 0, squash: 1, size: 1, headTurn: 0, headTilt: 0, shake: 0, ears: 0, tail: 0, tailUp: 0, paw: 0, eyesShut: 0, upright: 0 }
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
  private time = 0
  private home: Place = { x: 0, z: 0 }
  private facing = 0
  private onRoof = false
  private inAir = false

  /** Puts her where she is, as she was left. `faces` is the way she looks when nothing has her attention. */
  settle(at: Place, faces: number, onRoof: boolean, as: { warm: boolean; marooned: boolean; napping: boolean } = { warm: false, marooned: false, napping: false }): void {
    this.home = { ...at }
    this.facing = faces
    this.onRoof = onRoof
    this.going.start([at, at], 1, 0, false, onRoof ? ROOF_HEIGHT : 0, onRoof ? ROOF_HEIGHT : 0)
    this.going.step(1)
    this.size.value = this.size.target = onRoof ? SIZE_ON_ROOF : as.napping || as.marooned ? SIZE_IN_BOAT : 1
    // She is found as she was: eyes shut by a fire or asleep in the boat, bolt upright if she is afloat.
    this.upright.value = this.upright.target = as.marooned ? 1 : 0
    this.eyes.value = this.eyes.target = (as.warm || as.napping) && !as.marooned ? 1 : 0
  }

  answer(action: Action, strength = 1): void {
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
    this.going.start([this.home, ...(jump ? [] : (via ?? [])), to], jump ? 5.2 : 2.3, toRoof || this.onRoof ? 2.6 : jump ? 2.4 : 0, !jump, this.onRoof ? ROOF_HEIGHT : 0, toRoof ? ROOF_HEIGHT : 0)
    this.size.target = toRoof ? SIZE_ON_ROOF : 1
    this.home = { ...to }
    this.facing = faces
    this.onRoof = toRoof
  }

  /** The fire she sat by has gone out: she looks at the logs, then at the truck, and turns her back with her tail up. */
  fireOut(): void {
    this.huff.start()
  }

  /** `warm` is true while a fire burns in the yard; `marooned` while she floats in the boat; `toTruck` and `toFire` are the turns of her head toward them. */
  step(seconds: number, warm: boolean, marooned: boolean, napping: boolean, toTruck: number): typeof this.pose {
    this.time += seconds
    this.going.step(seconds)
    for (const gesture of [this.paw, this.glare, this.shake, this.duck, this.sneeze, this.huff]) gesture.step(seconds)
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
    pose.turn = way.heading ?? this.facing
    const ducking = hump(this.duck.through(0.7))
    // Stiff and stretched in the air, squashed under a stream, and breathing slowly at rest.
    pose.squash = 1 + (this.inAir ? 0.12 : 0) - ducking * 0.42 + Math.sin(this.time * TEMPO.cat * 2 * Math.PI) * 0.015 + this.upright.value * 0.14 - (napping ? 0.2 : 0)
    const glaring = this.glare.playing(1.5) && !this.glare.playing(0.35) ? 1 : 0
    const huffing = this.huff.through(2.4)
    pose.headTurn = glaring * toTruck + (huffing < 1 ? (huffing < 0.45 ? 0.5 : toTruck) : 0) + Math.sin(this.time * 0.31) * 0.12 * (1 - glaring)
    const sneezing = this.sneeze.through(0.45)
    pose.headTilt = sneezing < 1 ? -hump(sneezing) * 0.5 : 0
    const shaking = this.shake.through(0.8)
    pose.shake = shaking < 1 ? Math.sin(shaking * Math.PI * 9) * 0.5 * (1 - shaking) : 0
    pose.ears = Math.max(ducking, this.inAir ? 0.6 : 0) - this.upright.value * 0.3
    // Her tail flicks now and then, stands like a bottle brush under a stream, and goes up when she is put out.
    pose.tail = ducking > 0.1 ? 1 : Math.max(0, Math.sin(this.time * TEMPO.cat * 2 * Math.PI * 0.5) - 0.86) * 4
    pose.tailUp = huffing < 1 && huffing > 0.6 ? 1 : this.onRoof ? 0.4 : 0
    const pawing = this.paw.through(1.0)
    // A shaken paw after a gulp; on the roof, a paw washed slowly over and over.
    pose.paw = pawing < 1 && pawing > 0.3 ? Math.abs(Math.sin(pawing * Math.PI * 6)) : this.onRoof && !this.going.going ? 0.5 + 0.5 * Math.sin(this.time * 2.2) : 0
    pose.eyesShut = this.eyes.value
    pose.upright = this.upright.value
    pose.size = this.size.value
    return pose
  }
}

// --- The duck ----------------------------------------------------------------

/** The duck's lap: how far from the pool's middle it paddles, and how far round to each side, in radians. */
export const LAP_RADIUS = 0.7
export const LAP_SWING = 0.7

/** How long the duck's ride over the rim and its waddle back take. */
export const RIDE_S = 3

export class DuckMotion {
  readonly pose = { x: 0, z: 0, y: 0, turn: 0, tilt: 0, wiggle: 0, beak: 0 }
  /** It tapped the pool floor in this step: the game plays the tick. */
  tapped = false
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
   * floor, and how far the sand lies below the floor.
   */
  step(seconds: number, afloat: boolean, floats: number, rim: { far: number; high: number; floor?: number }, channels: Channels): typeof this.pose {
    this.time += seconds
    this.tap.step(seconds)
    this.ride.step(seconds)
    stepSpring(this.wiggle, { stiffness: 210, damping: 9 }, seconds)
    this.tapped = false
    // On a dry floor it taps the floor with its beak, which it dislikes, every few seconds.
    this.sinceTap += seconds
    if (!afloat && floats <= 0.001 && this.sinceTap > DUCK_TAPS_EVERY_S && !this.ride.playing(RIDE_S)) {
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
    pose.wiggle = this.wiggle.value * 0.08 + shaking
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
    // On an open flower she lands, and stays.
    const landed = open ? channels.beeLands : 0
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
  private from: Place = { x: 0.3, z: 0.25 }
  private to: Place = { x: -0.5, z: -0.2 }
  private time = 0

  /** Where it sits on the patch and where it glides to when it comes out, both measured from the middle of the patch. */
  settle(from: Place, to: Place, feelers = 0): void {
    this.from = { ...from }
    this.to = { ...to }
    // It is found as it was: its feelers as far out as its patch is wet.
    this.feelers.value = this.feelers.target = feelers
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
    pose.x = this.from.x + (this.to.x - this.from.x) * far
    pose.z = this.from.z + (this.to.z - this.from.z) * far
    pose.turn = Math.atan2(this.to.z - this.from.z, this.to.x - this.from.x)
    // It stretches and gathers as it glides, one slow wave at a time.
    pose.out = channels.snailOut * (1 + (far > 0 && far < 1 ? Math.sin(this.time * TEMPO.snail * 2 * Math.PI * 6) * 0.12 : 0))
    pose.feelers = Math.max(0, this.feelers.value)
    return pose
  }
}
