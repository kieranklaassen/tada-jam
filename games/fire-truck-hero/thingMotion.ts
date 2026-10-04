// How the six plain things of a yard move, as numbers: the fire, the pool, the
// seed, the dry patch, the boat and the wheel. No renderer. Each thing answers
// each of the five ways water can reach it with a motion of its own (ART.md,
// "The object-by-action grid"), and shows how much water it holds in itself:
// the height of the flame, the level in the pool, the stage of the plant.
//
// A working thing moves only as its idea needs: it has no idle fidgets and no
// face. What is alive at idle is the flame, the water and the animals.

import { kick, spring, stepSpring, type Feel, type Spring } from './springs'
import { THINGS, type Action } from './things'

/** A quick, lively answer, and a slow soft one for things that give. */
export const SNAPPY: Feel = { stiffness: 260, damping: 15 }
export const SOFT: Feel = { stiffness: 46, damping: 9 }
export const HEAVY: Feel = { stiffness: 70, damping: 17 }

/** A one-off move that plays for a while and is then over. */
export class Gesture {
  private age = Infinity

  start(): void {
    this.age = 0
  }

  step(seconds: number): void {
    if (this.age !== Infinity) this.age += seconds
  }

  /** 0 to 1 through a gesture of this length; 1 when it is over or never began. */
  through(lasts: number): number {
    return this.age >= lasts ? 1 : this.age / lasts
  }

  playing(lasts: number): boolean {
    return this.age < lasts
  }

  /** Puts the gesture at its end. */
  end(): void {
    this.age = Infinity
  }
}

/** A hump from 0 up to 1 and back to 0 over a gesture: a nod, a hop, a dip. */
export function hump(through: number): number {
  return Math.sin(Math.min(1, Math.max(0, through)) * Math.PI)
}

// --- The small fire ----------------------------------------------------------

/** How tall the flame stands for the gulps the fire holds: lower with each, and out at its fill. */
export const FLAME_FOR_GULPS = [1, 0.72, 0.46, 0, 0] as const

export class FireMotion {
  readonly pose = { flame: 1, flat: 0, lean: 0, flicker: 0, spit: 0, wet: false, logsX: 0, logsZ: 0, logsY: 0, logsTurn: 0 }
  private flame = spring(1)
  private flat = spring(0)
  private lean = spring(0)
  private spit = new Gesture()
  private gutter = new Gesture()
  private drift = spring(0)
  private adrift = 0
  private time = 0

  settle(gulps: number): void {
    this.flame.value = this.flame.target = FLAME_FOR_GULPS[Math.min(4, gulps)]
    this.drift.value = this.drift.target = gulps > THINGS.fire.fill ? 1 : 0
  }

  /** `creeping` is true when a neighbour's water is run-off on the ground and not drops in the air. */
  answer(action: Action, gulps: number, strength = 1, creeping = false): void {
    this.flame.target = FLAME_FOR_GULPS[Math.min(4, gulps)]
    // A gulp flattens the flame, a sweep makes it lean away, flung drops make it spit, and too much floats the logs.
    // Run-off reaches the ring from below: the flame gutters, a slow shiver from side to side, and sinks.
    if (action === 'gulp' || action === 'fill') kick(this.flat, 9 * strength)
    else if (action === 'sweep') kick(this.lean, 7 * strength)
    else if (action === 'neighbour' && creeping) this.gutter.start()
    else if (action === 'neighbour') this.spit.start()
    else this.drift.target = 1
  }

  step(seconds: number): typeof this.pose {
    this.time += seconds
    this.spit.step(seconds)
    this.gutter.step(seconds)
    stepSpring(this.flame, HEAVY, seconds)
    stepSpring(this.flat, SNAPPY, seconds)
    stepSpring(this.lean, SOFT, seconds)
    stepSpring(this.drift, { stiffness: 5, damping: 4.4 }, seconds)
    const pose = this.pose
    pose.flame = Math.max(0, this.flame.value)
    pose.flat = Math.max(0, Math.min(0.8, this.flat.value))
    const guttering = this.gutter.through(1.2)
    pose.lean = Math.max(-0.7, Math.min(0.7, this.lean.value + (guttering < 1 ? Math.sin(guttering * Math.PI * 5) * 0.3 * (1 - guttering) : 0)))
    pose.flicker = this.time
    pose.spit = hump(this.spit.through(0.5))
    pose.wet = this.flame.target === 0
    // Wet logs float off on their own puddle: a slow drift round the ring, bobbing.
    // They lift off gently and then go round: the drift is counted only while they float.
    const drift = Math.max(0, Math.min(1, this.drift.value))
    this.adrift += seconds * drift
    pose.logsX = Math.sin(this.adrift * 0.6) * 0.16 * drift
    pose.logsZ = Math.sin(this.adrift * 0.37) * 0.16 * drift
    pose.logsY = (0.03 + Math.sin(this.adrift * 2.1) * 0.02) * drift
    pose.logsTurn = Math.sin(this.adrift * 0.4) * 0.5 * drift
    return pose
  }
}

// --- The paddling pool -------------------------------------------------------

/** How deep the water stands for the gulps the pool holds, as a share of the wall: full at its fill, brimming past it. */
export function levelForGulps(gulps: number): number {
  return Math.min(1.06, (Math.max(0, gulps) / THINGS.pool.fill) * 0.92 + (gulps > THINGS.pool.fill ? 0.14 : 0))
}

export class PoolMotion {
  readonly pose = { level: 0, bonk: 0, slosh: 0, spill: 0 }
  private level = spring(0)
  private bonk = spring(0)
  private slosh = spring(0)
  private spill = new Gesture()

  settle(gulps: number): void {
    this.level.value = this.level.target = levelForGulps(gulps)
  }

  answer(action: Action, gulps: number, strength = 1): void {
    this.level.target = levelForGulps(gulps)
    // An empty pool is knocked like a drum; a full one sloshes. Too much runs over the low side.
    if (action === 'gulp') kick(gulps <= 1 ? this.bonk : this.slosh, 6 * strength)
    else if (action === 'fill') kick(this.slosh, 8)
    else if (action === 'too-much') this.spill.start()
    else if (action === 'sweep') kick(gulps === 0 ? this.bonk : this.slosh, 3)
    else kick(this.slosh, 1.5)
  }

  step(seconds: number): typeof this.pose {
    this.spill.step(seconds)
    stepSpring(this.level, SOFT, seconds)
    stepSpring(this.bonk, SNAPPY, seconds)
    stepSpring(this.slosh, SOFT, seconds)
    const pose = this.pose
    pose.level = Math.max(0, this.level.value)
    pose.bonk = this.bonk.value
    pose.slosh = this.slosh.value
    pose.spill = hump(this.spill.through(1.1))
    return pose
  }
}

// --- The seed in its pot -----------------------------------------------------

export class SeedMotion {
  readonly pose = { soil: 0, shoot: 0, leaves: 0, bud: 0, flower: 0, pop: 0, flutter: 0, nod: 0, saucer: 0, soak: 0 }
  private shoot = spring(0)
  private leaves = spring(0)
  private flower = spring(0)
  private pop = spring(0)
  private flutter = spring(0)
  private nod = new Gesture()
  private soak = new Gesture()
  private peek = new Gesture()
  private gulps = 0
  private slow = false

  settle(gulps: number): void {
    this.gulps = gulps
    this.shoot.value = this.shoot.target = gulps >= 1 ? 1 : 0
    this.leaves.value = this.leaves.target = gulps >= 2 ? 1 : 0
    this.flower.value = this.flower.target = gulps >= 3 ? 1 : 0
  }

  /** `creeping` is true when a neighbour's water is run-off on the ground and not drops in the air. */
  answer(action: Action, gulps: number, strength = 1, creeping = true): void {
    this.gulps = gulps
    this.shoot.target = gulps >= 1 ? 1 : 0
    this.leaves.target = gulps >= 2 ? 1 : 0
    this.flower.target = gulps >= 3 ? 1 : 0
    // Water soaked up from below grows the plant as surely, and slowly, and the dark climbs the pot's wall.
    // Drops flung onto it land on its leaves, which flutter.
    this.slow = action === 'neighbour' && creeping
    if (action === 'neighbour' && creeping) this.soak.start()
    else if (action === 'neighbour') kick(this.flutter, 6)
    if (action === 'gulp' || action === 'fill') kick(this.pop, 5 * strength)
    else if (action === 'sweep') kick(this.flutter, 9)
    else if (action === 'too-much') this.nod.start()
  }

  /** The truck shows the seed to a child who has not met it: for a moment the soil goes dark and a shoot pokes half way up, and it is a seed again. */
  shown(): void {
    this.peek.start()
  }

  step(seconds: number): typeof this.pose {
    this.nod.step(seconds)
    this.soak.step(seconds)
    this.peek.step(seconds)
    const grow = this.slow ? { stiffness: 6, damping: 4.6 } : SOFT
    stepSpring(this.shoot, grow, seconds)
    stepSpring(this.leaves, grow, seconds)
    stepSpring(this.flower, grow, seconds)
    stepSpring(this.pop, SNAPPY, seconds)
    stepSpring(this.flutter, { stiffness: 320, damping: 7 }, seconds)
    const pose = this.pose
    const peeking = this.peek.playing(SHOWN_S) ? hump(this.peek.through(SHOWN_S)) : 0
    pose.soil = this.gulps >= 1 ? 1 : peeking
    pose.shoot = Math.max(0, this.shoot.value, this.gulps === 0 ? peeking * 0.5 : 0)
    pose.leaves = Math.max(0, this.leaves.value)
    // The bud is there from the first shoot until the flower takes its place.
    pose.bud = Math.max(0, pose.shoot - Math.max(0, this.flower.value))
    pose.flower = Math.max(0, this.flower.value)
    pose.pop = this.pop.value
    pose.flutter = this.flutter.value
    // The cup fills, nods over and tips, and comes up again.
    pose.nod = hump(this.nod.through(1.4))
    pose.saucer = this.gulps > THINGS.seed.fill ? 1 : 0
    // The dark climbs the wall in a second and a half, stands, and dries off again from the top down.
    const soaking = this.soak.through(SOAK_S) * SOAK_S
    const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x) }
    pose.soak = this.soak.playing(SOAK_S) ? Math.min(smooth(soaking / 1.5), smooth((SOAK_S - soaking) / 1.5)) : 0
    return pose
  }
}

/** How long the half-size answer of a first showing lasts on a thing whose answer is a change that stays: the seed, the patch. */
export const SHOWN_S = 1.3

/** How long the pot's wall stays dark after it drank from below. */
export const SOAK_S = 7

// --- The dry patch -----------------------------------------------------------

export class PatchMotion {
  readonly pose = { wet: 0, puddle: 0, mud: 0, blot: 0, line: 0 }
  private wet = spring(0)
  private puddle = spring(0)
  private mud = spring(0)
  private blot = spring(0)
  private line = new Gesture()
  private peek = new Gesture()

  /** The truck shows the dry patch to a child who has not met it: it goes half dark for a moment, as from a small blot, and is dry again. */
  shown(): void {
    this.peek.start()
  }

  settle(gulps: number): void {
    this.aim(gulps)
    this.wet.value = this.wet.target
    this.puddle.value = this.puddle.target
    this.mud.value = this.mud.target
  }

  answer(action: Action, gulps: number, strength = 1): void {
    this.aim(gulps)
    if (action === 'sweep') this.line.start()
    else kick(this.blot, (action === 'neighbour' ? 2 : 5) * strength)
  }

  step(seconds: number): typeof this.pose {
    this.line.step(seconds)
    this.peek.step(seconds)
    stepSpring(this.wet, SOFT, seconds)
    stepSpring(this.puddle, SOFT, seconds)
    stepSpring(this.mud, SOFT, seconds)
    stepSpring(this.blot, SNAPPY, seconds)
    const pose = this.pose
    pose.wet = Math.max(0, Math.min(1, this.wet.value), this.peek.playing(SHOWN_S) ? hump(this.peek.through(SHOWN_S)) * 0.5 : 0)
    pose.puddle = Math.max(0, this.puddle.value)
    pose.mud = Math.max(0, Math.min(1, this.mud.value))
    pose.blot = this.blot.value
    // A sweep darkens the patch for a moment, as a line of water would.
    pose.line = hump(this.line.through(0.8))
    return pose
  }

  private aim(gulps: number): void {
    const { fill } = THINGS.patch
    this.wet.target = Math.min(1, gulps / (fill - 1))
    this.puddle.target = gulps === fill ? 1 : 0
    this.mud.target = gulps > fill ? 1 : 0
  }
}

// --- The boat ----------------------------------------------------------------

/** How long the ride over the rim takes. */
export const CARRY_S = 1.1

/** How long a swamped boat takes to sink, roll over, empty itself and pop up. */
export const SINK_S = 1.7

/** The way the boat's nose points as it lies, as a turn from +x toward +z, and how far round a push can bring it. */
export const BOAT_HEADS = 0.3
export const NOSE_ROUND = 0.4

export class BoatMotion {
  readonly pose = { rock: 0, roll: 0, sunk: 0, water: 0, pushX: 0, pushZ: 0, bob: 0, brim: 0, carryX: 0, carryZ: 0, carryY: 0, yaw: 0 }
  private rock = spring(0)
  private pushX = spring(0)
  private pushZ = spring(0)
  private water = spring(0)
  private bob = spring(0)
  private yaw = spring(0)
  private sink = new Gesture()
  private brim = new Gesture()
  private carry = new Gesture()
  private carriedFrom = { x: 0, z: 0 }
  private inPool = false
  private time = 0

  settle(gulps: number): void {
    this.water.value = this.water.target = Math.min(1, gulps / THINGS.boat.fill)
  }

  /** An overflow carries it over the rim: `from` is where it was, measured from where it now lies aground. */
  carried(from: { x: number; z: number }): void {
    this.carriedFrom = { ...from }
    this.pushX.value = this.pushX.target = 0
    this.pushZ.value = this.pushZ.target = 0
    this.yaw.value = this.yaw.target = 0
    this.carry.start()
    kick(this.rock, 5)
  }

  /** A stream sweeps across the pool it floats in: what floats bobs. */
  bobs(): void {
    kick(this.bob, 3)
    kick(this.rock, 1.5)
  }

  /** `away` is the way the water pushes: from the truck to the boat, as a unit step. */
  answer(action: Action, gulps: number, afloat: boolean, away: { x: number; z: number }, strength = 1): void {
    this.water.target = Math.min(1, gulps / THINGS.boat.fill)
    if (action === 'gulp') {
      kick(this.rock, 4 * strength)
      // The force of the water pushes it a hand's width, and no further than its place allows.
      if (!afloat) this.push(away, 0.22)
    } else if (action === 'fill') {
      // Full to the brim: it does not rock or slide any more, it sits down low with a slow heave.
      kick(this.bob, -7)
    } else if (action === 'too-much') {
      if (afloat) this.sink.start()
      else this.brim.start()
      kick(this.rock, 6)
    } else if (action === 'sweep') {
      this.push(away, afloat ? 0.34 : 0.26)
      kick(this.rock, 2)
      // Afloat the slap swings it round at its mooring and it swings back. On sand it slides nose first: its nose
      // comes round toward the way it is pushed, as far as the things beside it leave room.
      const toward = Math.atan2(away.z, away.x) - BOAT_HEADS
      if (afloat) kick(this.yaw, 2.6)
      else this.yaw.target = Math.max(-NOSE_ROUND, Math.min(NOSE_ROUND, Math.atan2(Math.sin(toward), Math.cos(toward))))
    } else {
      kick(this.bob, 3)
    }
  }

  step(seconds: number, afloat: boolean, inPool = afloat): typeof this.pose {
    this.inPool = inPool
    this.time += seconds
    this.sink.step(seconds)
    this.brim.step(seconds)
    this.carry.step(seconds)
    stepSpring(this.rock, { stiffness: 90, damping: 5 }, seconds)
    stepSpring(this.pushX, afloat ? { stiffness: 14, damping: 6 } : HEAVY, seconds)
    stepSpring(this.pushZ, afloat ? { stiffness: 14, damping: 6 } : HEAVY, seconds)
    stepSpring(this.water, SOFT, seconds)
    stepSpring(this.bob, SOFT, seconds)
    stepSpring(this.yaw, afloat ? { stiffness: 22, damping: 3.2 } : HEAVY, seconds)
    const pose = this.pose
    pose.yaw = Math.max(-NOSE_ROUND, Math.min(NOSE_ROUND, this.yaw.value))
    const sinking = this.sink.through(SINK_S)
    pose.rock = this.rock.value + (afloat ? Math.sin(this.time * 1.3) * 0.04 : 0)
    // Down with three glugs, over, and up again empty.
    pose.sunk = sinking < 1 ? hump(Math.min(1, sinking * 1.25)) : 0
    pose.roll = sinking < 1 ? Math.min(1, Math.max(0, (sinking - 0.3) / 0.5)) * Math.PI * 2 : 0
    pose.water = sinking < 1 && sinking > 0.5 ? 0 : Math.max(0, this.water.value)
    pose.pushX = this.pushX.value
    pose.pushZ = this.pushZ.value
    pose.bob = this.bob.value
    pose.brim = hump(this.brim.through(0.9))
    // The ride over the rim: out and down in about a second, lifted over the wall on the way.
    const riding = this.carry.through(CARRY_S)
    const left = riding < 1 ? 1 - riding * riding * (3 - 2 * riding) : 0
    pose.carryX = this.carriedFrom.x * left
    pose.carryZ = this.carriedFrom.z * left
    pose.carryY = riding < 1 ? 0.2 * left + hump(riding) * 0.85 : 0
    return pose
  }

  private push(away: { x: number; z: number }, by: number): void {
    // In the pool there is a hand's width of water round it; on the sand it has more room.
    const limit = this.inPool ? 0.05 : 0.3
    this.pushX.target = Math.max(-limit, Math.min(limit, this.pushX.target + away.x * by))
    this.pushZ.target = Math.max(-limit, Math.min(limit, this.pushZ.target + away.z * by))
  }
}

// --- The wheel ---------------------------------------------------------------

/** How quickly the wheel slows when let go: its speed falls by this share a second. A push of `speed` turns it `speed / FRICTION` before it stops. */
export const FRICTION = 1.15
/** How far one gulp turns it, and how far one flick of a sweep: a third of a turn and half a turn, in radians. */
export const GULP_TURN = (Math.PI * 2) / 3
export const HALF_TURN = Math.PI

/** How fast the wheel turns, in radians a second, when it spins steadily and when it spins to a blur. */
export const SPIN = 7
export const BLUR = 17

export class WheelMotion {
  readonly pose = { angle: 0, speed: 0, shuffle: 0 }
  private speed = 0
  private drive = 0
  private time = 0

  settle(): void {
    this.speed = 0
    this.drive = 0
  }

  answer(action: Action, gulps: number, strength = 1): void {
    const { fill } = THINGS.wheel
    // A gulp is a part-turn that ticks and slows. A held stream spins it, and more spins it to a blur.
    if (action === 'gulp') this.speed += GULP_TURN * FRICTION * strength
    else if (action === 'fill') this.drive = SPIN
    else if (action === 'too-much') this.drive = BLUR
    else if (action === 'sweep') this.speed = Math.max(this.speed, HALF_TURN * FRICTION)
    else this.speed = Math.max(this.speed, 1.1)
    if (gulps < fill && action !== 'fill' && action !== 'too-much') this.drive = 0
  }

  /** The stream stopped: the wheel runs down. */
  runDown(): void {
    this.drive = 0
  }

  step(seconds: number): typeof this.pose {
    this.time += seconds
    // Driven, it comes up to speed; let go, it slows by its own friction.
    if (this.drive > this.speed) this.speed += (this.drive - this.speed) * Math.min(1, seconds * 3.5)
    else this.speed *= Math.exp(-seconds * FRICTION)
    if (this.speed < 0.02) this.speed = 0
    const pose = this.pose
    pose.angle = (pose.angle + this.speed * seconds) % (Math.PI * 2)
    pose.speed = this.speed
    // Spun to a blur it shuffles on its stand.
    pose.shuffle = this.speed > SPIN * 1.4 ? Math.sin(this.time * 31) * 0.02 : 0
    return pose
  }
}

export type { Spring }
