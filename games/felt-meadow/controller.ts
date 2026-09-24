import type { FeltAudio } from './audio'
import { Bee, type BeeEvents, type BeeWorld, type Vec3 } from './bee'
import { isPrimary, PRIMARIES, RED, type Hue } from './colors'
import { Mouse, Snail } from './critters'
import { faceRise, Flower } from './flowers'
import { chooseHint, GuidanceClock, handPose, type GuidanceTiming, type HandPose, type Hint, type MeadowSummary } from './guidance'
import { GestureTracker, type GestureHandler, type Target } from './input'
import {
  BURROW,
  groundY,
  onPouch,
  PLOT_RADIUS,
  plotAt,
  plotTop,
  PLOTS,
  POUCH,
  POUCH_HEIGHT,
  POUCH_LEAN,
  POUCH_RADIUS,
  POUCH_SLOTS,
  pouchFloor,
  pouchSeat,
  restingSpot,
  SEED_RADIUS,
  type Point,
  type PouchPose,
  type Spot,
} from './layout'
import { clamp, smoothstep, spring, STEADY_STEP, substeps, toward, type Spring } from './math'
import { addLoose, BEE_ROOM, blend, emptyPlots, pick, plant, readyToMix, serialize, takeLoose, visit, type MeadowState } from './meadow'
import { SaveCadence } from './saveCadence'

// The meadow's rules and life, without any drawing. The view hands in a
// projector for hit tests and finger rays, calls `update` every frame, and
// reads the public fields (seed bodies, flowers, bee, critters, guidance) to
// pose its meshes. The saved meadow changes the moment an act happens; the
// animations only catch up with it, so putting the meadow away mid-flight
// never loses a seed.

export type ScreenPoint = { x: number; y: number }

export type Projector = {
  project(x: number, y: number, z: number, out: ScreenPoint): ScreenPoint
  /** Where the finger ray at canvas pixel (px, py) meets the hill raised by `lift`. */
  ground(px: number, py: number, lift: number, out: Point): Point
  pixelsPerUnit(x: number, y: number, z: number): number
}

export type SeedMode = 'off' | 'pouch' | 'held' | 'arc' | 'rest' | 'sink'
type Landing = 'rest' | 'home' | 'slot'

export class SeedBody {
  readonly index: number
  mode: SeedMode = 'off'
  hue: Hue = RED
  /** The loose seed's id in the meadow while it lies (or flies to lie) on the grass, else -1. */
  id = -1
  slot = -1
  plot = -1
  pointer = -1
  x = 0
  y = 0
  z = 0
  vx = 0
  vy = 0
  vz = 0
  tx = 0
  ty = 0
  tz = 0
  fromX = 0
  fromY = 0
  fromZ = 0
  t = 0
  duration = 0
  peak = 0
  landing: Landing = 'rest'
  readonly grow: Spring = { x: 1, v: 0 }
  readonly squash: Spring = { x: 0, v: 0 }
  /** Height above the grass while held; it starts wherever the seed was picked up and eases to HELD_LIFT. */
  lift = 0
  rollX = 0
  rollZ = 0

  constructor(index: number) {
    this.index = index
  }
}

export class Puff {
  x = 0
  y = 0
  z = 0
  vx = 0
  vy = 0
  vz = 0
  life = 0
  max = 1
  size = 1
  tint = 0xffffff
  /** A seed colour to draw the puff in instead of `tint`, or 0. */
  hue: Hue | 0 = 0
}

type Finger = { id: number; x: number; y: number; active: boolean }

export const SEED_POOL = 24
export const PUFF_POOL = 48
export const HELD_LIFT = 5.5
export const REFILL_SECONDS = 0.9
export const SINK_SECONDS = 0.3
export const MIN_TOUCH_PX = 30
/** Seconds untouched, with nothing the child set going, before the meadow is drawn at half rate. */
export const REST_BEFORE_PACING = 20
const DROP_SLOP = 5
const MAGNET_REACH = PLOT_RADIUS + 7
/** How far clear of a seed lying still a held seed passes over it. */
const HELD_CLEAR = 0.3
const POUCH_BASE_Y = groundY(POUCH.x, POUCH.z)
/** A seed going home to a full pouch dives into the middle of its mouth, shrinking as it goes in. */
const POUCH_MOUTH = {
  x: POUCH.x,
  y: POUCH_BASE_Y + 11.5 * Math.cos(POUCH_LEAN.x),
  z: POUCH.z + 11.5 * Math.sin(POUCH_LEAN.x),
}
/** A tap on the pouch offers its seeds: each pops up out of the mouth in turn, as if to say "take one". */
export const OFFER_STAGGER = 0.12
export const OFFER_HOP = 0.42
const OFFER_HEIGHT = 5
const OFFER_END = OFFER_HOP + OFFER_STAGGER * 2 + 0.1

export const FIBRE_TINT = 0xf4ead8
export const SOIL_TINT = 0x6b4630
export const POLLEN_TINT = 0xf3d36b

/** 0..0.5 how hard an empty molehill draws a seed held at (x, z) toward its middle. */
function magnetPull(plot: number, x: number, z: number): number {
  return 0.5 * (1 - Math.hypot(x - PLOTS[plot].x, z - PLOTS[plot].z) / MAGNET_REACH)
}

/** How long the bee wanders between visits of its own: little ones get more visits, older ones plan crosses by tapping. */
export function visitEveryFor(age: number | null): number {
  if (age === null) return 5
  if (age <= 4) return 3.5
  if (age <= 5) return 5
  if (age <= 6) return 7
  return 9
}

export type ControllerOptions = {
  save(state: MeadowState): void
  sound: FeltAudio
  childAge: number | null
}

const scratchScreen: ScreenPoint = { x: 0, y: 0 }
const scratchPoint: Point = { x: 0, z: 0 }
const scratchHead: Vec3 = { x: 0, y: 0, z: 0 }
const scratchSeat: Spot = { x: 0, y: 0, z: 0 }
const scratchLean: Point = { x: 0, z: 0 }

export class MeadowController implements GestureHandler {
  readonly meadow: MeadowState
  readonly flowers: Flower[] = PLOTS.map((_, plot) => new Flower(plot))
  readonly bee: Bee
  readonly snail = new Snail()
  readonly mouse = new Mouse(11)
  readonly seeds: SeedBody[] = Array.from({ length: SEED_POOL }, (_, i) => new SeedBody(i))
  readonly puffs: Puff[] = Array.from({ length: PUFF_POOL }, () => new Puff())
  readonly slotSeed: (SeedBody | null)[] = [null, null, null]
  readonly guide: GuidanceTiming = { demo: -1, glow: 0, invite: -1, idle: 0, beckon: false }
  readonly hand: HandPose = { x: 0, z: 0, press: 0, opacity: 0, visible: false }
  hint: Hint | null = null
  /** The seed body the current hint is about (a loose seed), for its wiggle. */
  hintSeed: SeedBody | null = null
  readonly pouchWiggle: Spring = { x: 0, v: 0 }
  readonly pouchSquash: Spring = { x: 0, v: 0 }
  /** The pouch's roll, squash, and breath this frame: the view poses the pouch by it and the seeds sit in it. */
  readonly pouchPose: PouchPose = { roll: 0, width: 1, height: 1 }
  /** Seconds into the pouch's offer after a tap, or -1. */
  pouchOffer = -1
  readonly heave: Spring[] = PLOTS.map(() => ({ x: 0, v: 0 }))
  /** 0..1 how far a molehill opens for a seed hovering over it. */
  readonly open: Spring[] = PLOTS.map(() => ({ x: 0, v: 0 }))
  /** Per plot: the seed a picked flower is folding into. */
  private readonly pluckSeed: (SeedBody | null)[] = PLOTS.map(() => null)
  t = 0
  private readonly slotRefill = [-1, -1, -1]
  private readonly tracker: GestureTracker
  private projector: Projector | null = null
  private readonly fingers: Finger[] = Array.from({ length: 6 }, () => ({ id: -1, x: 0, y: 0, active: false }))
  private readonly clock: GuidanceClock
  private readonly cadence: SaveCadence
  private readonly sound: FeltAudio
  private readonly world: BeeWorld
  private stateVersion = 1
  private hintVersion = 0
  private nextPuff = 0
  private buzzAt = 0
  private running = true
  /** A finger landed since the last frame; the guidance clock has not seen it yet. */
  private touchedSinceUpdate = false
  private readonly held: SeedBody[] = []
  private readonly summaryEmpty: number[] = []
  private readonly summaryBloomed: { plot: number; hue: Hue }[] = []
  private readonly magnetOpen = [0, 0, 0]

  constructor(meadow: MeadowState, options: ControllerOptions) {
    this.meadow = meadow
    this.sound = options.sound
    this.clock = new GuidanceClock(0)
    this.cadence = new SaveCadence(() => options.save(this.snapshot()))
    for (let plot = 0; plot < PLOTS.length; plot++) {
      const hue = meadow.plots[plot]
      if (hue !== null) this.flowers[plot].grown(hue)
    }
    for (const seed of meadow.loose) {
      const body = this.alloc()
      if (!body) break
      body.hue = seed.hue
      body.id = seed.id
      body.mode = 'rest'
      body.x = seed.x
      body.z = seed.z
      body.y = groundY(seed.x, seed.z) + SEED_RADIUS
    }
    for (let slot = 0; slot < PRIMARIES.length; slot++) this.fillSlot(slot, false)
    this.world = {
      flowerHead: (plot, out) => {
        const flower = this.flowers[plot]
        if (flower.phase === 'plucked' || !flower.bloomed()) return false
        flower.headAt(out)
        return true
      },
      isNew: (plot) => this.flowers[plot].isNew(),
      wouldMix: (plot) => {
        const hue = this.meadow.plots[plot]
        return hue !== null && !this.meadow.pollen.includes(hue)
      },
      readyToMix: () => readyToMix(this.meadow),
      dropSpot: (out) => this.dropSpot(out),
      berth: (plot, out) => {
        const flower = this.flowers[plot]
        if (flower.phase !== 'growing' && flower.phase !== 'bloom') return -Infinity
        flower.headAt(out)
        const lean = flower.lean(out, PLOTS[plot].x, PLOTS[plot].z, scratchLean)
        return out.y + faceRise(lean.x, lean.z) * Math.max(0, flower.bud.x)
      },
      pointAt: -1,
      visitEvery: visitEveryFor(options.childAge),
    }
    const events: BeeEvents = {
      land: (plot) => {
        this.flowers[plot].beeOn = true
        this.sound.pat(0.7)
      },
      sip: (plot) => {
        const hue = this.meadow.plots[plot]
        if (hue === null) return
        visit(this.meadow, hue)
        this.changed()
        this.sound.sip(hue)
        const head = this.flowers[plot].headAt(scratchHead)
        this.emit(head.x, head.y + 1, head.z, 4, POLLEN_TINT, 5)
        this.cadence.now(this.t * 1000)
      },
      takeoff: (plot) => {
        if (plot >= 0) this.flowers[plot].beeOn = false
      },
      drop: (at) => this.beeDrops(at),
      startle: (variant) => this.sound.beePoke(variant, this.bee.motion.seconds),
    }
    this.bee = new Bee(events)
    this.tracker = new GestureTracker(this, (x, y) => this.hitTest(x, y))
  }

  attach(projector: Projector | null): void {
    this.projector = projector
  }

  /** The saved shape of the meadow right now, with any seed under a finger laid where the finger is. */
  snapshot(): MeadowState {
    this.held.length = 0
    for (const seed of this.seeds) if (seed.mode === 'held') this.held.push(seed)
    return serialize(this.meadow, this.held)
  }

  /**
   * The meadow has rested: untouched a while, no demonstration or beckon near,
   * and no seed, flower, or answered call still in motion. Only the meadow's
   * own idle life plays, so the view may draw every other display frame.
   */
  resting(): boolean {
    const guide = this.guide
    if (this.touchedSinceUpdate || guide.idle < REST_BEFORE_PACING || guide.demo >= 0 || guide.beckon || guide.invite >= 0 || this.bee.answering) return false
    for (const seed of this.seeds) if (seed.mode === 'held' || seed.mode === 'arc' || seed.mode === 'sink') return false
    for (const flower of this.flowers) if (flower.phase === 'growing' || flower.phase === 'plucked') return false
    return true
  }

  setRunning(running: boolean): void {
    if (running === this.running) return
    this.running = running
    if (!running) {
      this.tracker.reset()
      for (const finger of this.fingers) finger.active = false
      this.cadence.settle(this.t * 1000)
      this.sound.buzz(0, 180)
    }
    this.sound.setActive(running)
  }

  dispose(): void {
    this.setRunning(false)
    this.sound.dispose()
  }

  // ---- pointers (canvas CSS pixels) ------------------------------------

  pointerDown(id: number, x: number, y: number, timeMs: number): void {
    this.touchedSinceUpdate = true
    this.sound.unlock()
    const finger = this.fingers.find((f) => !f.active)
    if (finger) {
      finger.active = true
      finger.id = id
      this.moveFinger(finger, x, y)
    }
    this.clock.touch(this.t)
    this.tracker.down(id, x, y, timeMs)
  }

  pointerMove(id: number, x: number, y: number): void {
    const finger = this.finger(id)
    if (!finger) return
    this.moveFinger(finger, x, y)
    this.tracker.move(id, x, y)
    for (const seed of this.seeds) {
      if (seed.mode === 'held' && seed.pointer === id) {
        this.cadence.moving(this.t * 1000)
        break
      }
    }
  }

  pointerUp(id: number, timeMs: number): void {
    // A touch's pointerdown does not count as a user gesture for audio (its pointerup does), so unlock on both.
    this.sound.unlock()
    this.tracker.up(id, timeMs)
    this.release(id)
  }

  pointerCancel(id: number): void {
    this.tracker.cancelPointer(id)
    this.release(id)
  }

  private release(id: number): void {
    const finger = this.finger(id)
    if (finger) finger.active = false
    this.clock.touch(this.t)
  }

  private finger(id: number): Finger | null {
    for (const finger of this.fingers) if (finger.active && finger.id === id) return finger
    return null
  }

  private moveFinger(finger: Finger, x: number, y: number): void {
    finger.x = x
    finger.y = y
  }

  // ---- hit testing -------------------------------------------------------

  hitTest(px: number, py: number): Target {
    const projector = this.projector
    if (!projector) return { kind: 'grass' }
    const near = (x: number, y: number, z: number, radius: number): number => {
      projector.project(x, y, z, scratchScreen)
      const reach = Math.max(MIN_TOUCH_PX, radius * projector.pixelsPerUnit(x, y, z))
      const d = Math.hypot(scratchScreen.x - px, scratchScreen.y - py)
      return d <= reach ? d / reach : Infinity
    }

    let best: SeedBody | null = null
    let bestScore = Infinity
    for (const seed of this.seeds) {
      const catchable = seed.mode === 'pouch' || seed.mode === 'rest' || (seed.mode === 'arc' && seed.landing === 'rest')
      if (!catchable) continue
      const score = near(seed.x, seed.y, seed.z, SEED_RADIUS * 2)
      if (score < bestScore) {
        bestScore = score
        best = seed
      }
    }
    if (best) return best.mode === 'pouch' ? { kind: 'pouchSeed', slot: best.slot } : { kind: 'seed', id: best.index }

    if (near(this.bee.x, this.bee.y, this.bee.z, 6.5) < 1) return { kind: 'bee' }

    for (let plot = 0; plot < PLOTS.length; plot++) {
      const flower = this.flowers[plot]
      if (flower.phase !== 'growing' && flower.phase !== 'bloom') continue
      const head = flower.headAt(scratchHead)
      const p = PLOTS[plot]
      const top = plotTop(plot)
      if (near(head.x, head.y, head.z, 7.5) < 1 || near((head.x + p.x) / 2, (head.y + top) / 2, (head.z + p.z) / 2, 4.5) < 1) return { kind: 'flower', plot }
    }

    const snail = this.snail
    if (near(snail.x, groundY(snail.x, snail.z) + 2.5, snail.z, 6) < 1) return { kind: 'snail' }
    const mouse = this.mouse
    // Only once it is out on its feet: while it climbs out or dives it is on the way up or down the shaft, not where
    // (mouse.x, mouse.z) says, so the hole answers those taps instead.
    if (mouse.visible() && mouse.out >= 1 && near(mouse.x, groundY(mouse.x, mouse.z) + 2.4, mouse.z, 6.5) < 1) return { kind: 'mouse' }
    if (near(BURROW.x, groundY(BURROW.x, BURROW.z) + 0.3, BURROW.z, 5.5) < 1) return { kind: 'burrow' }

    if (near(POUCH.x, POUCH_BASE_Y + POUCH_HEIGHT * 0.5, POUCH.z, POUCH_RADIUS * 1.1) < 1) return { kind: 'pouch' }

    for (let plot = 0; plot < PLOTS.length; plot++) {
      if (near(PLOTS[plot].x, plotTop(plot) - 1, PLOTS[plot].z, PLOT_RADIUS) < 1) {
        const flower = this.flowers[plot]
        return flower.phase === 'growing' || flower.phase === 'bloom' ? { kind: 'flower', plot } : { kind: 'molehill', plot }
      }
    }
    return { kind: 'grass' }
  }

  // ---- gestures ----------------------------------------------------------

  press(pointerId: number, target: Target): void {
    switch (target.kind) {
      case 'pouchSeed': {
        const seed = this.slotSeed[target.slot]
        if (!seed) return
        this.slotSeed[target.slot] = null
        this.slotRefill[target.slot] = REFILL_SECONDS
        this.pouchSquash.v += 3
        this.grab(seed, pointerId)
        return
      }
      case 'seed': {
        const seed = this.seeds[target.id]
        if (!seed || (seed.mode !== 'rest' && seed.mode !== 'arc')) return
        if (seed.id >= 0) takeLoose(this.meadow, seed.id)
        seed.id = -1
        this.changed()
        this.grab(seed, pointerId)
        this.cadence.now(this.t * 1000)
        return
      }
      case 'flower': {
        const flower = this.flowers[target.plot]
        flower.droop.v += 6
        this.sound.pat(0.8)
        return
      }
      case 'bee':
        this.bee.poke()
        return
      case 'snail': {
        const variant = this.snail.poke()
        if (variant !== null) this.sound.snailPoke(variant, this.snail.motion.seconds)
        return
      }
      case 'mouse': {
        const variant = this.mouse.poke()
        if (variant !== null) this.sound.mousePoke(variant)
        return
      }
      case 'burrow':
        this.mouse.knock()
        this.sound.heave()
        this.emit(BURROW.x, groundY(BURROW.x, BURROW.z) + 0.6, BURROW.z, 3, SOIL_TINT, 3)
        return
      case 'pouch':
        this.pouchWiggle.v += 2.6
        this.pouchSquash.v += 4
        if (this.pouchOffer < 0) {
          this.pouchOffer = 0
          this.sound.offer(OFFER_STAGGER)
        } else this.sound.rustle()
        return
      case 'molehill': {
        this.heave[target.plot].v += 7
        this.flowers[target.plot].soil.v -= 4
        this.sound.heave()
        const p = PLOTS[target.plot]
        this.emit(p.x, plotTop(target.plot), p.z, 3, SOIL_TINT, 4)
        return
      }
      case 'grass': {
        const finger = this.finger(pointerId)
        this.sound.brush()
        if (finger && this.projector) {
          this.projector.ground(finger.x, finger.y, 0, scratchPoint)
          this.emit(scratchPoint.x, groundY(scratchPoint.x, scratchPoint.z) + 0.6, scratchPoint.z, 3, FIBRE_TINT, 3)
        }
        return
      }
      default: {
        const unreachable: never = target
        return unreachable
      }
    }
  }

  tap(pointerId: number, target: Target): void {
    if (target.kind === 'flower') {
      const flower = this.flowers[target.plot]
      flower.boing()
      this.sound.boing()
      this.bee.call(target.plot, this.world)
    }
    this.drop(pointerId)
  }

  dragStart(pointerId: number, target: Target): void {
    if (target.kind === 'flower') this.pickFlower(target.plot, pointerId)
  }

  dragEnd(pointerId: number): void {
    this.drop(pointerId)
  }

  cancel(pointerId: number): void {
    this.drop(pointerId)
  }

  // ---- acts ----------------------------------------------------------------

  private grab(seed: SeedBody, pointerId: number): void {
    seed.mode = 'held'
    seed.pointer = pointerId
    seed.slot = -1
    seed.lift = Math.max(0, seed.y - groundY(seed.x, seed.z) - SEED_RADIUS)
    seed.tx = seed.x
    seed.tz = seed.z
    seed.squash.v -= 7
    this.sound.lift()
    this.emit(seed.x, seed.y - SEED_RADIUS * 0.6, seed.z, 2, FIBRE_TINT, 2.5)
  }

  private pickFlower(plot: number, pointerId: number): void {
    const flower = this.flowers[plot]
    if (flower.phase === 'plucked' || !flower.bloomed()) return
    const hue = pick(this.meadow, plot)
    if (hue === null) return
    const seed = this.alloc()
    if (!seed) {
      plant(this.meadow, plot, hue)
      return
    }
    this.changed()
    const head = flower.headAt(scratchHead)
    flower.pluck(head.x, head.y, head.z)
    seed.hue = hue
    seed.x = head.x
    seed.y = head.y
    seed.z = head.z
    seed.vx = seed.vy = seed.vz = 0
    seed.grow.x = 0.3
    seed.grow.v = 0
    this.pluckSeed[plot] = seed
    this.grab(seed, pointerId)
    this.sound.pluck()
    this.emit(head.x, head.y, head.z, 6, 0, 7, hue)
    this.emit(PLOTS[plot].x, plotTop(plot), PLOTS[plot].z, 3, SOIL_TINT, 4)
    this.cadence.now(this.t * 1000)
  }

  private drop(pointerId: number): void {
    for (const seed of this.seeds) {
      if (seed.mode === 'held' && seed.pointer === pointerId) {
        seed.pointer = -1
        this.place(seed)
        this.cadence.now(this.t * 1000)
        this.changed()
      }
    }
  }

  /** A seed let go of: plant it, bounce it off a full molehill, send it home to the pouch, or lay it on the grass. */
  private place(seed: SeedBody): void {
    const x = seed.tx
    const z = seed.tz
    const plot = this.magnetPlot(x, z)
    if (plot >= 0) {
      this.sink(seed, plot)
      return
    }
    const onPlot = plotAt(x, z, DROP_SLOP)
    if (onPlot >= 0) {
      const p = PLOTS[onPlot]
      let dx = x - p.x
      let dz = z - p.z
      const length = Math.hypot(dx, dz)
      if (length < 0.5) {
        dx = 0
        dz = 1
      } else {
        dx /= length
        dz /= length
      }
      restingSpot(p.x + dx * (PLOT_RADIUS + 3.5), p.z + dz * (PLOT_RADIUS + 3.5), this.meadow.loose, scratchPoint)
      this.flowers[onPlot].boing()
      this.heave[onPlot].v += 4
      this.lay(seed, scratchPoint.x, scratchPoint.z, 7)
      return
    }
    if (isPrimary(seed.hue) && (onPouch(x, z) || Math.hypot(x - POUCH.x, z - POUCH.z) < POUCH_RADIUS + DROP_SLOP)) {
      this.home(seed)
      return
    }
    restingSpot(x, z, this.meadow.loose, scratchPoint)
    this.lay(seed, scratchPoint.x, scratchPoint.z, 1.2)
  }

  /** An empty molehill close enough to pull the seed in, or -1. */
  private magnetPlot(x: number, z: number): number {
    let best = -1
    let bestD = MAGNET_REACH
    for (let plot = 0; plot < PLOTS.length; plot++) {
      if (this.meadow.plots[plot] !== null || this.flowers[plot].phase !== 'empty') continue
      const d = Math.hypot(x - PLOTS[plot].x, z - PLOTS[plot].z)
      if (d < bestD) {
        bestD = d
        best = plot
      }
    }
    return best
  }

  /**
   * How high a seed held at (x, z) rides, `lift` over the grass: drawn down over an empty molehill, and lifted
   * clear of the pouch and of the seeds lying still. The guidance hand's ghost seed rides here too (`self` null).
   */
  heldY(self: SeedBody | null, x: number, z: number, lift: number): number {
    let y = groundY(x, z) + SEED_RADIUS + lift
    const plot = this.magnetPlot(x, z)
    if (plot >= 0) y += (plotTop(plot) + SEED_RADIUS + HELD_LIFT * 0.6 - y) * magnetPull(plot, x, z)
    return this.clearAbove(self, x, y, z)
  }

  /** The height a held seed's centre at (x, z), about `y` high, must rise to so it touches neither the pouch nor a seed lying still. */
  private clearAbove(self: SeedBody | null, x: number, y: number, z: number): number {
    let clear = pouchFloor(x, y, z, this.pouchPose)
    for (const other of this.seeds) {
      if (other === self || (other.mode !== 'pouch' && other.mode !== 'rest')) continue
      const reach = SEED_RADIUS * (1 + Math.max(0, other.grow.x)) + HELD_CLEAR
      const gap = Math.hypot(x - other.x, z - other.z)
      if (gap < reach) clear = Math.max(clear, other.y + Math.sqrt(reach * reach - gap * gap))
    }
    return clear
  }

  private sink(seed: SeedBody, plot: number): void {
    plant(this.meadow, plot, seed.hue)
    seed.mode = 'sink'
    seed.plot = plot
    seed.t = 0
    seed.fromX = seed.x
    seed.fromY = seed.y
    seed.fromZ = seed.z
    this.open[plot].v += 4
  }

  private lay(seed: SeedBody, x: number, z: number, peak: number): void {
    const { seed: loose, returned } = addLoose(this.meadow, seed.hue, { x, z })
    seed.id = loose.id
    this.arc(seed, x, groundY(x, z) + SEED_RADIUS, z, peak, 'rest')
    for (const back of returned) {
      const body = this.seeds.find((other) => other.id === back.id && (other.mode === 'rest' || other.mode === 'arc'))
      if (body) {
        body.id = -1
        this.home(body)
      }
    }
  }

  private home(seed: SeedBody): void {
    seed.id = -1
    const slot = PRIMARIES.indexOf(seed.hue)
    if (slot >= 0 && this.slotSeed[slot] === null) {
      this.slotSeed[slot] = seed
      this.slotRefill[slot] = -1
      seed.slot = slot
      this.arc(seed, POUCH_SLOTS[slot].x, POUCH_SLOTS[slot].y, POUCH_SLOTS[slot].z, 7, 'slot')
      return
    }
    this.arc(seed, POUCH_MOUTH.x, POUCH_MOUTH.y, POUCH_MOUTH.z, 8, 'home')
  }

  private arc(seed: SeedBody, x: number, y: number, z: number, peak: number, landing: Landing): void {
    seed.mode = 'arc'
    seed.landing = landing
    seed.fromX = seed.x
    seed.fromY = seed.y
    seed.fromZ = seed.z
    seed.tx = x
    seed.ty = y
    seed.tz = z
    seed.peak = peak
    seed.t = 0
    const distance = Math.hypot(x - seed.x, z - seed.z) + Math.abs(y - seed.y) * 0.5
    seed.duration = clamp(0.2 + distance * 0.009 + peak * 0.025, 0.24, 0.8)
  }

  private beeDrops(at: Vec3): void {
    const a = this.meadow.pollen[0]
    const b = this.meadow.pollen[1]
    const hue = blend(this.meadow)
    if (hue === null) return
    this.changed()
    const seed = this.alloc()
    this.dropSpot(scratchHead)
    if (!seed) {
      addLoose(this.meadow, hue, { x: scratchHead.x, z: scratchHead.z })
      this.cadence.now(this.t * 1000)
      return
    }
    seed.hue = hue
    seed.x = at.x
    seed.y = at.y
    seed.z = at.z
    this.lay(seed, scratchHead.x, scratchHead.z, 0.6)
    this.sound.mixed(a, b, hue)
    this.emit(at.x, at.y, at.z, 6, POLLEN_TINT, 6)
    this.clock.settle(this.t)
    this.cadence.now(this.t * 1000)
  }

  private dropSpot(out: Vec3): void {
    const bee = this.bee
    let best = -1
    let bestD = Infinity
    for (let plot = 0; plot < PLOTS.length; plot++) {
      if (this.meadow.plots[plot] !== null) continue
      const d = Math.hypot(PLOTS[plot].x - bee.x, PLOTS[plot].z - bee.z)
      if (d < bestD) {
        bestD = d
        best = plot
      }
    }
    if (best >= 0) {
      const p = PLOTS[best]
      const side = bee.x < p.x ? -1 : 1
      restingSpot(p.x + side * (PLOT_RADIUS + 3), p.z + 6, this.meadow.loose, scratchPoint)
    } else restingSpot(bee.x, bee.z + 6, this.meadow.loose, scratchPoint)
    out.x = scratchPoint.x
    out.z = scratchPoint.z
    out.y = groundY(out.x, out.z) + SEED_RADIUS
  }

  private fillSlot(slot: number, pop: boolean): void {
    const seed = this.alloc()
    if (!seed) return
    seed.mode = 'pouch'
    seed.hue = PRIMARIES[slot]
    seed.slot = slot
    pouchSeat(slot, this.pouchPose, scratchSeat)
    seed.x = scratchSeat.x
    seed.y = scratchSeat.y
    seed.z = scratchSeat.z
    seed.grow.x = pop ? 0 : 1
    seed.grow.v = pop ? 2 : 0
    this.slotSeed[slot] = seed
    this.slotRefill[slot] = -1
    if (pop) {
      this.pouchSquash.v -= 3
      this.sound.refill()
    }
  }

  private alloc(): SeedBody | null {
    for (const seed of this.seeds) {
      if (seed.mode !== 'off') continue
      seed.id = -1
      seed.slot = -1
      seed.plot = -1
      seed.pointer = -1
      seed.vx = seed.vy = seed.vz = 0
      seed.grow.x = 1
      seed.grow.v = 0
      seed.squash.x = seed.squash.v = 0
      return seed
    }
    return null
  }

  private emit(x: number, y: number, z: number, count: number, tint: number, speed: number, hue?: Hue): void {
    for (let i = 0; i < count; i++) {
      const puff = this.puffs[this.nextPuff]
      this.nextPuff = (this.nextPuff + 1) % PUFF_POOL
      const a = (i / count) * Math.PI * 2 + this.t * 3.7
      puff.x = x
      puff.y = y
      puff.z = z
      puff.vx = Math.cos(a) * speed * (0.6 + 0.4 * Math.sin(i * 12.3))
      puff.vz = Math.sin(a) * speed * 0.7
      puff.vy = speed * (0.5 + 0.3 * Math.cos(i * 7.1))
      puff.max = 0.7 + 0.25 * Math.abs(Math.sin(i * 3.3 + this.t))
      puff.life = puff.max
      puff.size = hue === undefined ? 0.5 : 0.8
      puff.tint = tint
      puff.hue = hue ?? 0
    }
  }

  private changed(): void {
    this.stateVersion += 1
  }

  // ---- the frame -----------------------------------------------------------

  update(dt: number): void {
    this.touchedSinceUpdate = false
    this.t += dt
    const t = this.t
    let touching = false
    for (const finger of this.fingers) if (finger.active) touching = true
    if (touching) this.clock.touch(t)

    this.updateGuidance(t)

    for (let plot = 0; plot < this.flowers.length; plot++) {
      const flower = this.flowers[plot]
      const before = flower.age
      const pluckedBefore = flower.phase === 'plucked'
      flower.beeComing = this.bee.visiting(plot)
      if (flower.step(dt, t)) {
        this.sound.bloom(flower.hue)
        const head = flower.headAt(scratchHead)
        this.emit(head.x, head.y, head.z, 5, 0, 5, flower.hue)
        this.changed()
      }
      if (flower.phase === 'growing' && before < 0.3 && flower.age >= 0.3) this.sound.sprout()
      const carrier = this.pluckSeed[plot]
      if (flower.phase === 'plucked' && carrier) {
        flower.carryX = carrier.x
        flower.carryY = carrier.y
        flower.carryZ = carrier.z
      } else if (pluckedBefore || carrier) {
        // The bud has shrunk into the seed: the seed pops a little, as if it just arrived.
        if (pluckedBefore && carrier && carrier.mode !== 'off') carrier.squash.v -= 6
        this.pluckSeed[plot] = null
      }
      spring(this.heave[plot], 0, dt, 180, 9)
      spring(this.open[plot], this.magnetOpen[plot], dt, 160, 12)
      this.magnetOpen[plot] = 0
    }

    this.bee.step(dt, this.world)
    this.snail.step(dt)
    this.mouse.step(dt)

    for (let slot = 0; slot < this.slotRefill.length; slot++) {
      if (this.slotRefill[slot] < 0) continue
      this.slotRefill[slot] -= dt
      if (this.slotRefill[slot] <= 0) this.fillSlot(slot, true)
    }
    spring(this.pouchWiggle, 0, dt, 60, 5)
    spring(this.pouchSquash, 0, dt, 200, 10)
    const invite = this.guide.invite
    const breathe = Math.sin(t * 1.05) * 0.012
    this.pouchPose.roll = this.pouchWiggle.x * 0.13 + (invite >= 0 ? Math.sin(invite * Math.PI * 4) * 0.08 * Math.sin(invite * Math.PI) : 0)
    this.pouchPose.width = 1 + this.pouchSquash.x * 0.04 - breathe * 0.4
    this.pouchPose.height = 1 - this.pouchSquash.x * 0.06 + breathe
    if (this.pouchOffer >= 0) {
      this.pouchOffer += dt
      if (this.pouchOffer > OFFER_END) this.pouchOffer = -1
    }

    for (const seed of this.seeds) if (seed.mode !== 'off') this.stepSeed(seed, dt, t)
    for (const puff of this.puffs) {
      if (puff.life <= 0) continue
      puff.life -= dt
      const drag = 1 - Math.min(1, dt * 3.2)
      puff.vx *= drag
      puff.vz *= drag
      puff.vy = puff.vy * drag - 4 * dt
      puff.x += puff.vx * dt
      puff.y += puff.vy * dt
      puff.z += puff.vz * dt
    }

    if (t - this.buzzAt > 0.066) {
      this.buzzAt = t
      const bee = this.bee
      const sitting = bee.sitting()
      this.sound.buzz(sitting ? 0.15 : 0.45 + Math.min(0.55, bee.speed / 40), sitting ? 150 : 175 + bee.speed * 2.2)
    }
  }

  private updateGuidance(t: number): void {
    // A flower the child planted still opening, or the bee answering a tapped one, is the child's own act
    // playing out; a hint then would talk over it.
    let opening = false
    for (const flower of this.flowers) if (flower.isNew()) opening = true
    if (opening || this.bee.answering) this.clock.settle(t)
    let untouched = this.meadow.loose.length === 0
    for (const hue of this.meadow.plots) if (hue !== null) untouched = false
    this.clock.timing(t, untouched, this.guide)
    const showing = this.guide.glow > 0 || this.guide.demo >= 0
    if (showing && this.hintVersion !== this.stateVersion) {
      this.hintVersion = this.stateVersion
      this.hint = chooseHint(this.summary())
      this.hintSeed = null
      if (this.hint?.kind === 'plantLoose') {
        const id = this.hint.seedId
        this.hintSeed = this.seeds.find((seed) => seed.id === id && seed.mode === 'rest') ?? null
      }
    }
    const hint = showing ? this.hint : null
    this.world.pointAt = hint && (hint.kind === 'plantLoose' || hint.kind === 'plantPouch') && this.guide.beckon ? hint.plot : -1
    if (hint && this.guide.demo >= 0) handPose(hint, this.guide.demo, this.hand)
    else {
      this.hand.visible = false
      this.hand.opacity = 0
    }
  }

  private summary(): MeadowSummary {
    const empty = this.summaryEmpty
    empty.length = 0
    for (const plot of emptyPlots(this.meadow)) if (this.flowers[plot].phase === 'empty') empty.push(plot)
    const bloomed = this.summaryBloomed
    bloomed.length = 0
    for (let plot = 0; plot < PLOTS.length; plot++) {
      const hue = this.meadow.plots[plot]
      if (hue !== null && this.flowers[plot].bloomed()) bloomed.push({ plot, hue })
    }
    return { empty, bloomed, loose: this.meadow.loose, pollen: this.meadow.pollen, beeHasRoom: this.meadow.loose.length < BEE_ROOM }
  }

  private stepSeed(seed: SeedBody, dt: number, t: number): void {
    spring(seed.grow, 1, dt, 150, 11)
    spring(seed.squash, 0, dt, 240, 11)
    switch (seed.mode) {
      case 'pouch': {
        const slot = seed.slot
        const invite = this.guide.invite
        const bounce = invite >= 0 ? Math.abs(Math.sin(invite * Math.PI * 3 + slot * 0.7)) * 2.6 * Math.sin(invite * Math.PI) : 0
        const breathe = Math.sin(t * 1.3 + slot * 1.1) * 0.25
        const hinted = this.hint?.kind === 'plantPouch' && this.hint.slot === slot ? Math.max(0, Math.sin(t * 5.5)) * 1.3 * this.guide.glow : 0
        let offer = 0
        if (this.pouchOffer >= 0) {
          const k = (this.pouchOffer - slot * OFFER_STAGGER) / OFFER_HOP
          const before = (this.pouchOffer - dt - slot * OFFER_STAGGER) / OFFER_HOP
          if (k > 0 && k < 1) offer = Math.sin(k * Math.PI) * OFFER_HEIGHT
          if (before <= 0 && k > 0) seed.squash.v -= 7
          else if (before < 1 && k >= 1) seed.squash.v += 6
        }
        pouchSeat(slot, this.pouchPose, scratchSeat)
        seed.x = scratchSeat.x
        seed.z = scratchSeat.z
        // A seed popping in grows from its seat's bottom up, so its overshoot swells above the pouch mouth, not into it.
        seed.y = scratchSeat.y + SEED_RADIUS * (seed.grow.x - 1) + breathe + bounce + offer + hinted
        break
      }
      case 'held': {
        const finger = this.finger(seed.pointer)
        if (!finger) {
          seed.pointer = -1
          this.place(seed)
          this.changed()
          this.cadence.now(this.t * 1000)
          break
        }
        seed.lift = toward(seed.lift, HELD_LIFT, dt, 6)
        if (this.projector) {
          this.projector.ground(finger.x, finger.y, SEED_RADIUS + seed.lift, scratchPoint)
          seed.tx = scratchPoint.x
          seed.tz = scratchPoint.z
        }
        let x = seed.tx
        let z = seed.tz
        const y = this.heldY(seed, x, z, seed.lift)
        const plot = this.magnetPlot(x, z)
        if (plot >= 0) {
          const pull = magnetPull(plot, x, z)
          x += (PLOTS[plot].x - x) * pull
          z += (PLOTS[plot].z - z) * pull
          this.magnetOpen[plot] = 1
        }
        // Underdamped a little, so a seed swung and stopped hard swings on past the finger and back.
        const k = 520
        const c = 27
        const steps = substeps(dt, STEADY_STEP)
        const h = dt / steps
        for (let i = 0; i < steps; i++) {
          seed.vx += (k * (x - seed.x) - c * seed.vx) * h
          seed.vy += (k * (y - seed.y) - c * seed.vy) * h
          seed.vz += (k * (z - seed.z) - c * seed.vz) * h
          this.integrate(seed, h)
        }
        const clear = this.clearAbove(seed, seed.x, seed.y, seed.z)
        if (clear > seed.y) {
          seed.y = clear
          if (seed.vy < 0) seed.vy = 0
        }
        break
      }
      case 'arc': {
        seed.t += dt
        const k = Math.min(1, seed.t / seed.duration)
        const px = seed.x
        const py = seed.y
        const pz = seed.z
        seed.x = seed.fromX + (seed.tx - seed.fromX) * k
        seed.z = seed.fromZ + (seed.tz - seed.fromZ) * k
        seed.y = seed.fromY + (seed.ty - seed.fromY) * k * k + seed.peak * 4 * k * (1 - k)
        seed.vx = (seed.x - px) / Math.max(dt, 1e-4)
        seed.vy = (seed.y - py) / Math.max(dt, 1e-4)
        seed.vz = (seed.z - pz) / Math.max(dt, 1e-4)
        if (seed.landing === 'home') seed.grow.x = 1 - smoothstep(0.55, 1, k) * 0.8
        this.roll(seed, dt)
        if (k >= 1) this.land(seed)
        break
      }
      case 'rest': {
        seed.y = groundY(seed.x, seed.z) + SEED_RADIUS
        seed.vx = seed.vy = seed.vz = 0
        if (seed === this.hintSeed && this.guide.glow > 0) seed.y += Math.max(0, Math.sin(t * 5.5)) * 0.9 * this.guide.glow
        break
      }
      case 'sink': {
        seed.t += dt
        const plot = seed.plot
        const p = PLOTS[plot]
        const top = plotTop(plot)
        const k = Math.min(1, seed.t / SINK_SECONDS)
        const into = k * k
        seed.x = seed.fromX + (p.x - seed.fromX) * Math.min(1, k * 1.6)
        seed.z = seed.fromZ + (p.z - seed.fromZ) * Math.min(1, k * 1.6)
        seed.y = seed.fromY + (top + SEED_RADIUS * 0.4 - seed.fromY) * Math.min(1, k * 1.6) - into * SEED_RADIUS * 1.6
        seed.grow.x = 1 - into * 0.7
        this.magnetOpen[plot] = 1
        if (k >= 1) {
          seed.mode = 'off'
          this.flowers[plot].plant(seed.hue)
          this.heave[plot].v -= 5
          this.sound.plop()
          this.emit(p.x, top + 0.5, p.z, 5, SOIL_TINT, 6)
          this.changed()
        }
        break
      }
      case 'off':
        break
      default: {
        const unreachable: never = seed.mode
        return unreachable
      }
    }
  }

  private land(seed: SeedBody): void {
    const speed = Math.abs(seed.vy)
    seed.x = seed.tx
    seed.y = seed.ty
    seed.z = seed.tz
    seed.vx = seed.vy = seed.vz = 0
    switch (seed.landing) {
      case 'rest':
        seed.mode = 'rest'
        seed.squash.v += 3 + Math.min(9, speed * 0.12)
        this.sound.thud(0.4 + speed / 60)
        this.emit(seed.x, seed.y - SEED_RADIUS * 0.8, seed.z, 3, FIBRE_TINT, 3)
        break
      case 'slot':
        seed.mode = 'pouch'
        seed.squash.v += 4
        this.pouchSquash.v += 3
        this.sound.home()
        break
      case 'home':
        seed.mode = 'off'
        this.pouchSquash.v += 4
        this.pouchWiggle.v += 1.2
        this.sound.home()
        break
      default: {
        const unreachable: never = seed.landing
        return unreachable
      }
    }
  }

  private integrate(seed: SeedBody, dt: number): void {
    seed.x += seed.vx * dt
    seed.y += seed.vy * dt
    seed.z += seed.vz * dt
    this.roll(seed, dt)
  }

  private roll(seed: SeedBody, dt: number): void {
    seed.rollX += (seed.vz * dt) / SEED_RADIUS
    seed.rollZ -= (seed.vx * dt) / SEED_RADIUS
  }
}
