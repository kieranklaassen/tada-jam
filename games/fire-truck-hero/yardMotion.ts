// The motion of everything in one yard, as numbers. No renderer: the stage
// copies these poses onto the models each frame and decides nothing. The game
// tells this module what the rules said happened (a result of the grid on a
// thing, a thing that moved, a secret, a honk, a ring of the bell), and it
// keeps every spring, gesture, puff of steam and ripple going on game time.
//
// A yard never holds two things of one kind, so there is one motion for each
// kind and each animal.

import { BeeMotion, CatMotion, DuckMotion, SnailMotion } from './animalMotion'
import { BELL, TRUCK, distance, type Place } from './layout'
import { NEST, placeOf, wayRound } from './places'
import { restChannels, type Channels } from './scenes'
import { snailWay } from './snailWay'
import { kick, spring, stepSpring } from './springs'
import { BoatMotion, FireMotion, PatchMotion, PoolMotion, SeedMotion, WheelMotion } from './thingMotion'
import { KINDS, THINGS, type Action, type Kind } from './things'
import { afloat, FLOATS_AT, type Came, type Yard } from './world'

/** The most puffs of steam and the most ripples alive at once. The stage draws each set in one call. */
export const PUFFS = 28
export const RINGS = 14

/** The pool as the duck knows it, in yard units: how far its rim is from its middle, how deep it is to the brim, and how high its floor is above the sand. */
export const POOL_RIM = 1.38
export const POOL_DEEP = 0.4
export const POOL_FLOOR = 0.07

/** The way the cat looks when nothing has her attention: toward the child and a little toward the truck. */
export const CAT_FACES = 2.0

/** Where the snail sits on its patch, measured from the patch's middle. */
export const SNAIL_SITS: Place = { x: 0.34, z: 0.22 }

type Puff = { alive: boolean; x: number; y: number; z: number; size: number; age: number; life: number; grow: number; drift: number }
type Ring = { alive: boolean; x: number; z: number; radius: number; age: number; life: number; most: number }

/** Steam: soft white puffs that rise, swell and thin away. */
export class Steam {
  readonly puffs: Puff[] = Array.from({ length: PUFFS }, () => ({ alive: false, x: 0, y: 0, z: 0, size: 0, age: 0, life: 1, grow: 1, drift: 0 }))
  private seed: number

  constructor(seed: number) {
    this.seed = seed >>> 0 || 7
  }

  puff(at: Place, high: number, count: number, size: number): void {
    for (let i = 0; i < count; i++) {
      const puff = this.puffs.find((p) => !p.alive)
      if (!puff) return
      puff.alive = true
      puff.x = at.x + (this.random() - 0.5) * 0.7
      puff.z = at.z + (this.random() - 0.5) * 0.5
      puff.y = high + this.random() * 0.3
      puff.grow = size * (0.7 + this.random() * 0.6)
      puff.size = puff.grow * 0.3
      puff.age = -i * 0.05
      puff.life = 1.5 + this.random() * 1.3
      puff.drift = (this.random() - 0.3) * 0.35
    }
  }

  step(seconds: number): void {
    for (const puff of this.puffs) {
      if (!puff.alive) continue
      puff.age += seconds
      if (puff.age < 0) continue
      const through = puff.age / puff.life
      if (through >= 1) {
        puff.alive = false
        continue
      }
      puff.y += seconds * (0.95 - through * 0.5)
      puff.x += seconds * puff.drift
      // It swells quickly, then thins away to nothing.
      puff.size = puff.grow * Math.min(1, 0.3 + through * 3) * (1 - Math.max(0, through - 0.55) / 0.45)
    }
  }

  get alive(): number {
    return this.puffs.filter((puff) => puff.alive && puff.age >= 0).length
  }

  private random(): number {
    this.seed ^= this.seed << 13
    this.seed ^= this.seed >>> 17
    this.seed ^= this.seed << 5
    return (this.seed >>> 0) / 2 ** 32
  }
}

/** Ripples on the pool: rings that widen from where water landed and are gone. Measured from the pool's middle. */
export class Ripples {
  readonly rings: Ring[] = Array.from({ length: RINGS }, () => ({ alive: false, x: 0, z: 0, radius: 0, age: 0, life: 1, most: 1 }))

  ring(x: number, z: number, most: number, delay = 0): void {
    const ring = this.rings.find((r) => !r.alive)
    if (!ring) return
    ring.alive = true
    ring.x = x
    ring.z = z
    ring.most = most
    ring.radius = 0
    ring.age = -delay
    ring.life = 0.9
  }

  step(seconds: number): void {
    for (const ring of this.rings) {
      if (!ring.alive) continue
      ring.age += seconds
      if (ring.age >= ring.life) ring.alive = false
      else ring.radius = ring.age < 0 ? 0 : ring.most * Math.sqrt(ring.age / ring.life)
    }
  }
}

export class YardMotion {
  /** The scene channels this yard was left with, for a yard that is sliding away. */
  ownChannels: Channels = restChannels()
  readonly fire = new FireMotion()
  readonly pool = new PoolMotion()
  readonly seed = new SeedMotion()
  readonly patch = new PatchMotion()
  readonly boat = new BoatMotion()
  readonly wheel = new WheelMotion()
  readonly cat = new CatMotion()
  readonly duck = new DuckMotion()
  readonly bee = new BeeMotion()
  readonly snail = new SnailMotion()
  readonly steam: Steam
  readonly ripples = new Ripples()
  /** The bell: how far it swings, and how far the gate's latch is lifted, 0 to 1. */
  readonly bell = { swing: 0, latch: 0 }
  /** How high the one who waits beyond the fence has hopped. */
  peek = 0
  /** The index of the thing of each kind in this yard, or -1. */
  readonly has: Record<Kind, number>
  /** Seconds of game time this yard has been on screen, for what idles by the clock alone. */
  time = 0
  /** A worm, a cat on the roof or a marooned cat happened in this step: the stage has nothing to do, the game plays the scene. */
  private bellSwing = spring(0)
  private latch = spring(0)
  private steamOwed = 0
  private peekHop = spring(0)
  private fireOut = false

  constructor(yard: Yard, seed = 1) {
    this.steam = new Steam(seed * 2654435761)
    this.has = Object.fromEntries(KINDS.map((kind) => [kind, yard.things.findIndex((thing) => thing.kind === kind)])) as Record<Kind, number>
  }

  /** Sets everything where the yard has it, as it was left: nothing eases in. */
  settle(yard: Yard, channels: Channels): void {
    const gulps = (kind: Kind) => yard.things[this.has[kind]]?.gulps ?? 0
    this.fire.settle(gulps('fire'))
    this.pool.settle(gulps('pool'))
    this.seed.settle(gulps('seed'))
    this.patch.settle(gulps('patch'))
    this.boat.settle(gulps('boat'))
    this.wheel.settle()
    const lit = this.has.fire >= 0 && gulps('fire') < THINGS.fire.fill
    this.fireOut = this.has.fire >= 0 && !lit
    if (this.has.cat >= 0) {
      const cat = yard.things[this.has.cat]
      const inBoat = cat.in !== undefined && yard.things[cat.in]?.kind === 'boat'
      const marooned = inBoat && afloat(yard, cat.in!)
      this.cat.settle(placeOf(yard, this.has.cat), cat.spot === 'roof' ? Math.PI : CAT_FACES, cat.spot === 'roof', { warm: lit, marooned, napping: inBoat && !marooned, putOut: this.fireOut && !inBoat })
    }
    if (this.has.patch >= 0) this.snail.settle(SNAIL_SITS, this.snailWay(yard), lit ? 0 : SnailMotion.feelersFor(gulps('patch'), channels.snailOut))
    this.latch.value = this.latch.target = 0
    this.latch.velocity = 0
    this.bellSwing.value = this.bellSwing.velocity = 0
    this.ownChannels = { ...channels }
  }

  /** A cell of the grid happened to a thing. Each kind answers each action in its own way. `by` is how a neighbour's water came. */
  result(index: number, action: Action, yard: Yard, strength = 1, by?: Came): void {
    const thing = yard.things[index]
    if (!thing) return
    const at = placeOf(yard, index)
    if (thing.kind === 'fire') {
      const creeping = action === 'neighbour' && by === 'run-off'
      this.fire.answer(action, thing.gulps, strength, creeping)
      if (action === 'gulp') this.steam.puff(at, 0.9, 2, 0.5 * strength)
      else if (action === 'fill') this.steam.puff(at, 0.7, 9, 1.05)
      // Run-off steams low, round the ring, where it meets the embers. Flung drops make pips higher up.
      else if (creeping) this.steam.puff(at, 0.25, 4, 0.42)
      else if (action === 'neighbour') this.steam.puff(at, 0.8, 2, 0.28)
      // The moment it goes out, and only then, the cat who sat by it is put out too.
      if (thing.gulps >= THINGS.fire.fill && !this.fireOut) {
        this.fireOut = true
        // She looks at the logs themselves: from where she sits, by the way she faces.
        const cat = this.has.cat >= 0 ? placeOf(yard, this.has.cat) : at
        const toLogs = Math.atan2(at.z - cat.z, at.x - cat.x) - CAT_FACES
        this.cat.fireOut(Math.atan2(Math.sin(toLogs), Math.cos(toLogs)))
        // Put out by a neighbour's water it gives up its cloud all the same.
        if (action === 'neighbour') this.steam.puff(at, 0.6, 7, 0.95)
      }
    } else if (thing.kind === 'pool') {
      this.pool.answer(action, thing.gulps, strength)
      this.duck.answer(action, strength)
      // A sweep across the pool: what floats bobs, the boat with the duck.
      if (action === 'sweep' && this.has.boat >= 0 && afloat(yard, this.has.boat)) this.boat.bobs()
      if (action === 'gulp' || action === 'fill') this.ripples.ring(0.1, 0, 1.0)
      // A dry pool has no water to ripple: swept, it only rattles like a drum.
      else if (action === 'sweep' && thing.gulps > 0) for (let i = 0; i < 3; i++) this.ripples.ring(-0.6 + i * 0.6, 0.1, 0.45, i * 0.09)
      else if (action === 'neighbour') for (let i = 0; i < 4; i++) this.ripples.ring(Math.cos(i * 2.4) * 0.6, Math.sin(i * 2.4) * 0.5, 0.25, i * 0.07)
    } else if (thing.kind === 'seed') {
      this.seed.answer(action, thing.gulps, strength, by !== 'drops')
      // Drops by her wings, aimed or flung: the bee goes up. Water soaked up from below does not reach her.
      if (action !== 'neighbour' || by === 'drops') this.bee.answer()
    } else if (thing.kind === 'patch') {
      this.patch.answer(action, thing.gulps, strength)
    } else if (thing.kind === 'boat') {
      const far = Math.max(0.001, distance(TRUCK, at))
      this.boat.answer(action, thing.gulps, afloat(yard, index), { x: (at.x - TRUCK.x) / far, z: (at.z - TRUCK.z) / far }, strength)
    } else if (thing.kind === 'wheel') {
      this.wheel.answer(action, thing.gulps, strength)
    } else {
      this.cat.answer(action, strength, by === 'run-off')
    }
  }

  /** The snail comes out: its way is laid now, along the wet the child has made. */
  snailSetsOut(yard: Yard): void {
    if (this.has.patch >= 0) this.snail.setOut(SNAIL_SITS, this.snailWay(yard))
  }

  /**
   * The truck shows a thing the child has not met: its one-gulp answer at half size. The seed and the dry patch
   * answer a gulp with a change that stays, and the spit carries no water, so theirs is that change for a moment.
   */
  shown(index: number, yard: Yard): void {
    this.result(index, 'gulp', yard, 0.5)
    const kind = yard.things[index]?.kind
    if (kind === 'seed') this.seed.shown()
    else if (kind === 'patch') this.patch.shown()
  }

  /** A thing went somewhere else: the cat stalks or jumps, the boat is carried over the rim. */
  moved(index: number, before: Yard, yard: Yard): void {
    const thing = yard.things[index]
    if (thing?.kind === 'boat') {
      const was = placeOf(before, index), now = placeOf(yard, index)
      this.boat.carried({ x: was.x - now.x, z: was.z - now.z })
    }
    if (thing?.kind !== 'cat') return
    const to = placeOf(yard, index)
    const from = { x: this.cat.pose.x, z: this.cat.pose.z }
    // She walks round whatever stands between, the truck and the bell included.
    const others = [TRUCK, BELL, ...yard.things.map((_, at) => at).filter((at) => at !== index && yard.things[at].in === undefined).map((at) => placeOf(yard, at))]
    // A snail that has come out is somewhere of its own.
    if (this.has.patch >= 0) {
      const patch = placeOf(yard, this.has.patch)
      others.push({ x: patch.x + this.snail.pose.x, z: patch.z + this.snail.pose.z })
    }
    this.cat.move(to, thing.spot === 'roof' ? Math.PI : CAT_FACES, thing.spot === 'roof', thing.spot === 'roof' ? [] : wayRound(from, to, others))
  }

  secret(_id: 'worm' | 'cat-on-roof' | 'marooned-cat', _yard: Yard): void {
    // The cat's own motion carries both of hers: she is on the roof, or afloat in the boat.
  }

  /** The truck honked. A cat on its roof jumps off; the game has already moved her. */
  honked(_yard: Yard): void {
    kick(this.bellSwing, 0.4)
  }

  /** The bell rang for the nth time: it swings, and the latch lifts by a third. */
  rang(ring: number): void {
    kick(this.bellSwing, 5)
    this.latch.target = Math.min(1, ring / 3)
  }

  /** Water landed by the fence in front of the one who waits beyond it: it hops. */
  peeked(): void {
    kick(this.peekHop, 4.5)
  }

  /** The latch dropped again. */
  latchDown(): void {
    this.latch.target = 0
  }

  /** The stream stopped. */
  runDown(): void {
    this.wheel.runDown()
  }

  step(seconds: number, yard: Yard, channels: Channels): void {
    this.time += seconds
    const thingOf = (kind: Kind) => (this.has[kind] >= 0 ? yard.things[this.has[kind]] : undefined)
    const fire = thingOf('fire'), pool = thingOf('pool'), seed = thingOf('seed'), patch = thingOf('patch'), boat = thingOf('boat'), cat = thingOf('cat')
    const lit = fire !== undefined && fire.gulps < THINGS.fire.fill

    if (fire) {
      this.fire.step(seconds)
      // While the ending plays, the wet logs go on steaming a little.
      if (!lit && channels.steam > 0 && channels.steam < 1) {
        this.steamOwed += seconds * 2.2
        while (this.steamOwed >= 1) {
          this.steamOwed -= 1
          this.steam.puff(placeOf(yard, this.has.fire), 0.5, 1, 0.5)
        }
      }
    }
    if (pool) {
      const pose = this.pool.step(seconds)
      const deep = pool.gulps >= FLOATS_AT
      // Where the duck's floating is the want of the yard, it lifts off the floor as its ending begins.
      const lifted = this.has.pool === yard.want ? channels.liftOff : 1
      this.duck.step(seconds, deep, deep ? pose.level * POOL_DEEP * lifted : 0, { far: POOL_RIM - NEST.duckInPool.z, high: POOL_DEEP, floor: POOL_FLOOR }, channels, pool.gulps === 0)
    }
    if (seed) {
      const pose = this.seed.step(seconds)
      this.bee.step(seconds, 0.82 + (0.3 + pose.shoot) * 1.0, seed.gulps >= THINGS.seed.fill, channels)
    }
    if (patch) {
      this.patch.step(seconds)
      this.snail.step(seconds, patch.gulps, lit, channels)
    }
    if (boat) this.boat.step(seconds, afloat(yard, this.has.boat), boat.in !== undefined)
    if (this.has.wheel >= 0) {
      if ((thingOf('wheel')?.gulps ?? 0) === 0) this.wheel.runDown()
      this.wheel.step(seconds)
    }
    if (cat) {
      const inBoat = cat.in !== undefined && yard.things[cat.in]?.kind === 'boat'
      const marooned = inBoat && afloat(yard, cat.in!)
      const at = placeOf(yard, this.has.cat)
      const toTruck = Math.atan2(TRUCK.z - at.z, TRUCK.x - at.x) - CAT_FACES
      const away = toTruck + Math.PI
      this.cat.step(seconds, lit, marooned, inBoat && !marooned, Math.max(-1.3, Math.min(1.3, Math.atan2(Math.sin(toTruck), Math.cos(toTruck)))), Math.atan2(Math.sin(away), Math.cos(away)))
    }
    this.steam.step(seconds)
    this.ripples.step(seconds)
    stepSpring(this.bellSwing, { stiffness: 60, damping: 3.2 }, seconds)
    stepSpring(this.latch, { stiffness: 140, damping: 12 }, seconds)
    stepSpring(this.peekHop, { stiffness: 110, damping: 7 }, seconds)
    this.peek = Math.max(0, this.peekHop.value)
    this.bell.swing = this.bellSwing.value * 0.12
    this.bell.latch = Math.max(0, Math.min(1.1, this.latch.value))
  }

  /** The way the snail glides when it comes out, measured from the middle of its patch: along the wet, clear of every other thing. */
  private snailWay(yard: Yard): Place[] {
    const home = placeOf(yard, this.has.patch)
    const others = [TRUCK, BELL, ...yard.things.map((_, index) => placeOf(yard, index)).filter((_, index) => index !== this.has.patch)]
    return snailWay(yard.ground, home, others)
  }
}
