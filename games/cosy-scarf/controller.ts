import { chooseHint, handPose, HintScheduler, type GuidanceFrame, type HandPose, type Hint, type Point3 } from './guidance'
import { GestureTracker, type Intent, type Point } from './input'
import { BALL_SWELL, ballReach, ballRest, BASKET_KEEP_OUT, clearBall, hopPast, MAX_STRETCH, type BallScene } from './balls'
import { canOffer, give, isFull, knitRow, paintStitch, summonIfReady, unravelRow } from './knitting'
import { BASKET_FOOTPRINT, LOOM_FOOTPRINT, planRoute, type Obstacle, type Point2 } from './paths'
import {
  BALL_RADIUS,
  BASKET,
  BODY,
  BUTTERFLY,
  CELL_H,
  ENTRY,
  HILL_SPOTS,
  LOOM,
  LOOM_SPOT,
  MAX_SWING,
  NEEDLE_BAR,
  NEEDLES_FLOOR,
  SCARF,
  cellAt,
  cellCentre,
  groundY,
  maxDrop,
  needlesY,
  swingRoom,
  type KeepOut,
  type NeedlePose,
  type Spot,
} from './layout'
import { completedRepeat, stripeColours, suggestColour } from './pattern'
import { SaveCadence } from './saveCadence'
import { clamp01, smooth, spring, springStep, type Spring } from './springs'
import { ANIMALS, ballsForAge, offerRowsForAge, WIDTH, type AnimalKey, type GameState, type Scarf } from './state'

// Cosy Scarf while it is on screen: touch, the knitting rules, the gift
// sequence, the animals' comings and goings, guidance, sound cues and
// saving. It knows nothing about three.js; the view reads its public fields
// every frame (without allocating) and hands it a projector for hit tests.

export type Sound = {
  unlock(): void
  setActive(active: boolean): void
  /** One stitch slipping off the needle. */
  stitch(colour: number): void
  /** A row finished: that colour's note. */
  row(colour: number): void
  hop(colour: number): void
  /** A ball lifted out of the basket by a finger. */
  lift(colour: number): void
  /** A carried ball back in the basket. */
  settle(colour: number): void
  unravel(): void
  paint(colour: number): void
  flutter(open: boolean): void
  /** The newest rows repeated a unit: the loom hums it back. */
  hum(unit: readonly number[]): void
  /** The scarf is long enough to give. */
  offer(): void
  /** The needles let go of the given scarf as it lifts off the loom. */
  castOff(): void
  swish(): void
  warm(animal: AnimalKey): void
  shiver(animal: AnimalKey): void
  happy(animal: AnimalKey): void
  /** The warm animal's own dance tune, played on the scarf's stripes. */
  dance(animal: AnimalKey, colours: readonly number[]): void
  crunch(): void
  /** A touch on the sky: a soft flurry. */
  flurry(): void
  basket(): void
  footstep(animal: AnimalKey, weight: number): void
  dispose(): void
}

export const silentSound: Sound = {
  unlock() {},
  setActive() {},
  stitch() {},
  row() {},
  hop() {},
  lift() {},
  settle() {},
  unravel() {},
  paint() {},
  flutter() {},
  hum() {},
  offer() {},
  castOff() {},
  swish() {},
  warm() {},
  shiver() {},
  happy() {},
  dance() {},
  crunch() {},
  flurry() {},
  basket() {},
  footstep() {},
  dispose() {},
}

/** How the view maps between the screen (CSS pixels) and the world. */
export type Projector = {
  /** Writes the screen point of `p`; false when it is behind the camera. */
  toScreen(p: Point3, out: Point): boolean
  /** The world point under a screen point on the plane z = `z`. */
  toPlaneZ(screen: Point, z: number, out: Point3): boolean
  /** The world point under a screen point on the snow (plane y = `y`). */
  toPlaneY(screen: Point, y: number, out: Point3): boolean
  /** Screen pixels per world unit around `p`. */
  pixelsPerUnit(p: Point3): number
}

export type Target =
  | { kind: 'ball'; index: number }
  | { kind: 'animal'; animal: AnimalKey }
  | { kind: 'needles' }
  | { kind: 'scarf' }
  | { kind: 'loom' }
  | { kind: 'butterfly' }
  | { kind: 'basket' }
  | { kind: 'snow' }

// --- per-animal timing: each walks and dances at its own pace -----------------

export const WALK_SPEED: Record<AnimalKey, number> = { bunny: 30, penguin: 15, fox: 36, bear: 18 }
/** A walker passes this much further from things than its body reaches. */
export const WALK_MARGIN = 1.5
/** How much snow a friend standing still takes up round it: its body and head, and the fox's tail curling out behind. */
export const STANDS_IN: Record<AnimalKey, number> = { bunny: BODY.bunny.reach, penguin: BODY.penguin.reach, fox: 16, bear: BODY.bear.reach }

export const walkRoom = (animal: AnimalKey) => BODY[animal].reach + WALK_MARGIN
const legSeconds = (animal: AnimalKey, from: Point2, to: Point2) => Math.max(0.6, Math.hypot(to.x - from.x, to.z - from.z) / WALK_SPEED[animal])
export const DANCE_SECONDS: Record<AnimalKey, number> = { bunny: 3.1, penguin: 3.6, fox: 3.3, bear: 4.2 }

// --- gift timeline (seconds after the child hands the scarf over) --------------

export const CAST_OFF = 0.35
export const FLY_END = 1.25
/** The middle starts round the neck while the scarf is still landing, so it never rests there as a flat bar. */
export const WRAP_START = 0.95
export const WRAP_END = 2.05
export const DANCE_START = 2.35
/** The hum's rhythm: its first note after this lead, then one note per row this far apart. The scarf lights each row on its note. */
export const HUM_LEAD_S = 0.08
export const HUM_STEP_S = 0.2
const NEXT_ARRIVES_AFTER = 0.7
const WINDOW_SAMPLES = 40

const KNIT_CELLS_PER_S = 10
const KNIT_FAST_CELLS_PER_S = 24
const UNRAVEL_CELLS_PER_S = 30
/** Painting starts only after the ball rests on one stitch this long, so a carry to the loom never paints. */
export const PAINT_DWELL_S = 0.4
/** The ball is carried on this plane, just in front of the needles even when it is stretched. */
const CARRY_Z = SCARF.z + NEEDLE_BAR.z + NEEDLE_BAR.apart + NEEDLE_BAR.radius + BALL_RADIUS * (1 + MAX_STRETCH) + 0.15
/** A carried ball trails the finger a touch and overshoots when it stops: it has weight in the hand. */
const CARRY_STIFFNESS = 700
const CARRY_DAMPING = 30
const RETURN_SECONDS = 0.5
/** Yarn let go over the animal waiting at the loom flies into the loom and is knitted there, then goes home. */
const TO_LOOM_SECONDS = 0.45
const GRAVITY = 260
/** A loom tap's answer: the wanted ball hops a little lower than a tapped ball, just after the loom starts to sway. */
const ASK_HOP_SPEED = 46
const ASK_HOP_DELAY = 0.15
const HIT_SLOP_PX = 16
/** A touch on the snow is traced from in front of the blanket to the hill's far edge; beyond it is sky. */
const SNOW_NEAR_Z = 60
const SNOW_FAR_Z = -300
const SNOW_STEP = 6
/** A sky flurry sits on the hill's far edge. */
const SKY_PUFF_Z = -300
/** A touch puff's size on screen, the same near the blanket or far up the slope, where a fixed world size shrinks to a speck. */
const TOUCH_PUFF_PX = 24

export type BallView = {
  readonly colour: number
  readonly rest: Point3
  /** Where the ball is drawn (rest plus hop, or under the finger). */
  readonly pos: Point3
  hopY: number
  hopV: number
  /** 0 round; positive squashed flat, negative stretched tall. */
  squash: Spring
  spin: number
  spinV: number
  held: number | null
  /** The carry's springy follow of the finger; its velocity (easing to rest once let go) stretches the ball along its path. */
  readonly carry: { x: Spring; y: Spring; z: Spring }
  /** 0..1 through the arc home (or into the loom first), or -1. */
  returning: number
  readonly returnFrom: Point3
  /** The arc runs into the loom, which knits a row of this ball before it flies home. */
  toLoom: boolean
  launchAt: number
  launchV: number
  airborne: boolean
}

export type ScarfView = {
  readonly id: number
  rows: Scarf
  /** null while it hangs on the loom. */
  holder: AnimalKey | null
  /** 0 is the scarf nearest the neck. */
  stack: number
  /** Bumps whenever `rows` changes; the view rewrites its colour texture then. */
  version: number
  /** Stitches shown, in knitting order (the reveal runs a little behind the rules). */
  reveal: number
  fringe: number
  fly: number
  wrap: number
  /** Seconds since the gift, or -1 once it is fully on. */
  giftAt: number
  /** Time the scarf started folding away (a fourth scarf), or -1. */
  leavingAt: number
  swing: Spring
  /** How far the offered scarf lifts off the rod. */
  lift: Spring
  /** Offset toward a finger tugging the scarf (world units). */
  readonly pull: Point3
}

export type ActorView = {
  readonly animal: AnimalKey
  visible: boolean
  x: number
  z: number
  yaw: number
  walking: boolean
  /** The current leg of the walk: a walk is a few straight legs round what is in the way. */
  readonly walkFrom: Spot
  readonly walkTo: Spot
  walkT0: number
  walkDuration: number
  /** 0..1 linear progress along the current leg (each gait eases it its own way). */
  walkProgress: number
  /** When the walk's first leg started. */
  walkBegan: number
  destination: 'loom' | 'hill' | null
  /** 0 shivering cold, 1 cosy. */
  warm: number
  warmAt: number
  tapAt: number
  /** When the last row knitted for this animal (while it waits at the loom) was finished. */
  rowAt: number
  danceAt: number
  danceLength: number
  reach: Spring
}

/** A yarn index, WHITE_PUFF (breath, snow off a head, the sky) or POWDER_PUFF (kicked-up snow, which white would vanish into). */
export type Puff = { x: number; y: number; z: number; t0: number; size: number; colour: number }
export const WHITE_PUFF = -1
export const POWDER_PUFF = -2

export type Strand = { alpha: number; colour: number; ball: number; row: number; column: number }

/** The loom's rows being hummed from `at`: `period` rows, one note each, from row `first`, `copies` times over (the copies sound and light together). */
export type Song = { at: number; first: number; period: number; copies: number }

export type Guidance = {
  hint: Hint | null
  frame: GuidanceFrame
  hand: HandPose
  handVisible: boolean
  /** The demonstration is a carry (drag), not a tap. */
  handCarries: boolean
  glowBalls: boolean
  glowBall: number
  glowScarf: boolean
}

const PUFFS = 32

type Drag =
  | { kind: 'ball'; index: number; screen: Point; painted: boolean; cellRow: number; cellColumn: number; cellSince: number }
  | { kind: 'needles'; screen: Point; grab: Point; pulled: number }
  | { kind: 'scarf'; screen: Point; start: Point }

type Timer = { at: number; run: () => void }

export class ScarfController {
  readonly state: GameState
  readonly balls: BallView[]
  readonly actors: Record<AnimalKey, ActorView>
  readonly worn: ScarfView[] = []
  loom: ScarfView
  readonly strand: Strand = { alpha: 0, colour: 0, ball: -1, row: 0, column: 0 }
  readonly needles = { pull: spring(0), castOffAt: -Infinity, held: false }
  readonly butterfly = { show: spring(0), open: spring(0), flapAt: -Infinity }
  readonly loomRock: Spring = spring(0)
  /** Where the loom scarf's needles hang this step, and how far that scarf swings (only as far as they stay clear). */
  readonly needlePose: NeedlePose = { pivotY: SCARF.top, pivotZ: SCARF.z, rock: 0, lean: 0, x: 0, y: 0, click: 0 }
  needleSwing = 0
  readonly puffs: Puff[] = Array.from({ length: PUFFS }, () => ({ x: 0, y: 0, z: 0, t0: -Infinity, size: 1, colour: WHITE_PUFF }))
  readonly guidance: Guidance
  basketAt = -Infinity
  humAt = -Infinity
  readonly song: Song = { at: -Infinity, first: 0, period: 1, copies: 0 }
  /** Seconds of attended play. */
  t = 0
  /** The loom's scarf is long enough and its animal is standing there. */
  offered = false
  readonly offerRows: number

  private readonly sound: Sound
  private readonly cadence: SaveCadence
  private readonly tracker: GestureTracker<Target>
  private readonly scheduler: HintScheduler
  private projector: Projector | null = null
  private readonly drags = new Map<number, Drag>()
  private needlesDrag: Extract<Drag, { kind: 'needles' }> | null = null
  private scarfDrag: Extract<Drag, { kind: 'scarf' }> | null = null
  private timers: Timer[] = []
  private nextScarfId = 1
  private puffCursor = 0
  private lastHumRow = -1
  private hintVersion = -1
  private hintBusy = false
  private peekStep = -1
  private readonly ballTargets: Target[]
  private readonly animalTargets: Record<AnimalKey, Target>
  private readonly handFrom: Point3 = { x: 0, y: 0, z: 0 }
  private readonly handTo: Point3 = { x: 0, y: 0, z: 0 }
  private readonly scratch: Point3 = { x: 0, y: 0, z: 0 }
  private readonly scratch2: Point3 = { x: 0, y: 0, z: 0 }
  private readonly entry: Point3 = { x: 0, y: 0, z: 0 }
  private readonly screen: Point = { x: 0, y: 0 }
  /** What the needles keep clear of when the scarf swings: the basket, then each animal in turn. */
  private readonly keepOuts: KeepOut[] = [BASKET_KEEP_OUT, ...ANIMALS.map(() => ({ x: 0, z: 0, r: 0, top: -Infinity }))]
  private readonly ballPositions: Point3[]
  private readonly ballRests: Point3[]
  private readonly ballReaches: number[]
  private readonly ballScene: BallScene
  private readonly towardEye: Point3 = { x: 0, y: 0, z: 1 }
  /** Each walker's route: the legs' ends, the next leg to walk, and the way it faces once there. */
  private readonly routes = Object.fromEntries(ANIMALS.map((animal) => [animal, { legs: [] as Point2[], next: 0, yaw: 0 }])) as Record<AnimalKey, { legs: Point2[]; next: number; yaw: number }>

  constructor(state: GameState, options: { save: (state: GameState) => void; sound?: Sound; childAge: number | null }) {
    this.state = state
    this.sound = options.sound ?? silentSound
    this.offerRows = offerRowsForAge(options.childAge)
    this.cadence = new SaveCadence(() => options.save(JSON.parse(JSON.stringify(this.state)) as GameState))
    this.tracker = new GestureTracker<Target>(
      (at) => this.hitTest(at),
      (target) => target.kind === 'needles',
    )
    this.scheduler = new HintScheduler(0)

    const count = ballsForAge(options.childAge)
    this.balls = Array.from({ length: count }, (_, colour) => {
      const rest = ballRest(colour, count)
      return {
        colour,
        rest,
        pos: { ...rest },
        hopY: 0,
        hopV: 0,
        squash: spring(0),
        spin: colour * 1.7,
        spinV: 0,
        held: null,
        carry: { x: spring(rest.x), y: spring(rest.y), z: spring(rest.z) },
        returning: -1,
        returnFrom: { ...rest },
        toLoom: false,
        launchAt: -Infinity,
        launchV: 0,
        airborne: false,
      }
    })
    this.ballPositions = this.balls.map((ball) => ball.pos)
    this.ballRests = this.balls.map((ball) => ball.rest)
    this.ballReaches = this.balls.map(() => BALL_RADIUS)
    this.ballScene = { needles: this.needlePose, swing: 0, rows: 0, butterfly: 0, animals: this.keepOuts.slice(1) }
    this.ballTargets = this.balls.map((_, index) => ({ kind: 'ball', index }))
    this.animalTargets = { bunny: { kind: 'animal', animal: 'bunny' }, penguin: { kind: 'animal', animal: 'penguin' }, fox: { kind: 'animal', animal: 'fox' }, bear: { kind: 'animal', animal: 'bear' } }

    this.loom = this.newScarf(state.loom, null)
    this.loom.reveal = state.loom.length * WIDTH
    this.actors = {} as Record<AnimalKey, ActorView>
    for (const animal of ANIMALS) this.actors[animal] = this.newActor(animal)
    for (const animal of ANIMALS) {
      const worn = state.scarves[animal]
      worn.forEach((scarf, stack) => {
        const view = this.newScarf(scarf, animal)
        view.stack = stack
        view.reveal = scarf.length * WIDTH
        view.fringe = 1
        view.fly = 1
        view.wrap = 1
        this.worn.push(view)
      })
    }
    this.butterfly.show.x = this.butterflyWanted() ? 1 : 0
    this.butterfly.open.x = state.mirror ? 1 : 0
    this.placeActorsOnOpen()

    this.guidance = {
      hint: null,
      frame: { demo: -1, glow: 0, peek: -1, idle: 0 },
      hand: { x: 0, y: 0, z: 0, press: 0, opacity: 0 },
      handVisible: false,
      handCarries: false,
      glowBalls: false,
      glowBall: -1,
      glowScarf: false,
    }
    this.poseNeedles()
  }

  setProjector(projector: Projector): void {
    this.projector = projector
  }

  /** Attended and visible: sound and time run. Otherwise everything pauses where it is. */
  setRunning(running: boolean): void {
    this.sound.setActive(running)
    if (!running) this.pause()
  }

  dispose(): void {
    this.pause()
    this.sound.dispose()
  }

  /** Forwarded by the view's gaits so each foot lands with its own weight. */
  footstep(animal: AnimalKey, weight: number): void {
    this.sound.footstep(animal, weight)
    if (weight > 0.6) {
      const actor = this.actors[animal]
      this.puff(actor.x, groundY(actor.x, actor.z) + 0.5, actor.z + 3, 0.8 + weight, POWDER_PUFF)
    }
  }

  /** A white puff the view asks for: frosty breath, or snow shaken off a warmed head. */
  frostPuff(x: number, y: number, z: number, size: number): void {
    this.puff(x, y, z, size, WHITE_PUFF)
  }

  // --- opening ------------------------------------------------------------------

  private newScarf(rows: Scarf, holder: AnimalKey | null): ScarfView {
    return {
      id: this.nextScarfId++,
      rows,
      holder,
      stack: 0,
      version: 0,
      reveal: 0,
      fringe: 0,
      fly: 0,
      wrap: 0,
      giftAt: -1,
      leavingAt: -1,
      swing: spring(0),
      lift: spring(0),
      pull: { x: 0, y: 0, z: 0 },
    }
  }

  private newActor(animal: AnimalKey): ActorView {
    return {
      animal,
      visible: false,
      x: ENTRY.x,
      z: ENTRY.z,
      yaw: ENTRY.yaw,
      walking: false,
      walkFrom: { ...ENTRY },
      walkTo: { ...ENTRY },
      walkT0: 0,
      walkDuration: 1,
      walkProgress: 0,
      walkBegan: 0,
      destination: null,
      warm: 0,
      warmAt: -Infinity,
      tapAt: -Infinity,
      danceAt: -Infinity,
      rowAt: -Infinity,
      danceLength: 0,
      reach: spring(0),
    }
  }

  private placeActorsOnOpen(): void {
    for (const animal of ANIMALS) {
      const actor = this.actors[animal]
      if (this.state.scarves[animal].length === 0) continue
      const home = HILL_SPOTS[animal]
      actor.visible = true
      actor.x = home.x
      actor.z = home.z
      actor.yaw = home.yaw
      actor.warm = 1
      actor.warmAt = -10
      actor.destination = 'hill'
    }
    const atLoom = this.state.atLoom
    if (atLoom) this.walkTo(this.actors[atLoom], LOOM_SPOT, 'loom', 0.6)
    else if (summonIfReady(this.state, this.offerRows)) this.walkTo(this.actors[this.state.atLoom!], LOOM_SPOT, 'loom', 0.6)
  }

  private walkTo(actor: ActorView, spot: Spot, destination: 'loom' | 'hill', delay: number): void {
    if (destination === 'loom' && actor.destination === 'loom' && actor.visible) return
    if (!actor.visible) {
      actor.visible = true
      actor.x = ENTRY.x
      actor.z = ENTRY.z
      actor.yaw = ENTRY.yaw
    }
    const route = this.routes[actor.animal]
    route.legs = planRoute(actor, spot, walkRoom(actor.animal), this.walkObstacles(actor.animal))
    route.next = 0
    route.yaw = spot.yaw
    actor.walkBegan = this.t + delay
    this.startLeg(actor, this.t + delay)
    actor.walking = true
    actor.destination = destination
  }

  /** What a walker keeps clear of on the snow: the loom, the basket and friends standing still. */
  private walkObstacles(walker: AnimalKey): Obstacle[] {
    const obstacles: Obstacle[] = [LOOM_FOOTPRINT, BASKET_FOOTPRINT]
    for (const animal of ANIMALS) {
      const other = this.actors[animal]
      if (animal !== walker && other.visible && !other.walking) obstacles.push({ kind: 'round', x: other.x, z: other.z, r: STANDS_IN[animal] })
    }
    return obstacles
  }

  private startLeg(actor: ActorView, at: number): void {
    const route = this.routes[actor.animal]
    const to = route.legs[route.next++]
    actor.walkFrom.x = actor.x
    actor.walkFrom.z = actor.z
    actor.walkFrom.yaw = actor.yaw
    actor.walkTo.x = to.x
    actor.walkTo.z = to.z
    actor.walkTo.yaw = route.next === route.legs.length ? route.yaw : Math.atan2(to.x - actor.x, to.z - actor.z)
    actor.walkT0 = at
    actor.walkDuration = legSeconds(actor.animal, actor, to)
    actor.walkProgress = 0
  }

  // --- touch ----------------------------------------------------------------------

  pointerDown(id: number, at: Point, time: number): void {
    this.sound.unlock()
    for (const intent of this.tracker.down(id, at, time)) this.handle(intent)
  }

  pointerMove(id: number, at: Point, time: number): void {
    const drag = this.drags.get(id)
    if (drag) {
      drag.screen.x = at.x
      drag.screen.y = at.y
    }
    for (const intent of this.tracker.move(id, at, time)) this.handle(intent)
  }

  pointerUp(id: number, at: Point, time: number): void {
    for (const intent of this.tracker.up(id, at, time)) this.handle(intent)
  }

  pointerCancel(id: number): void {
    for (const intent of this.tracker.cancel(id)) this.handle(intent)
  }

  private handle(intent: Intent<Target>): void {
    switch (intent.type) {
      case 'press':
        this.scheduler.touch(this.t)
        this.press(intent.target)
        return
      case 'tap':
        this.tap(intent.target, intent.at)
        return
      case 'dragStart':
        this.dragStart(intent.id, intent.target, intent.at)
        return
      case 'dragMove': {
        const drag = this.drags.get(intent.id)
        if (drag) {
          drag.screen.x = intent.at.x
          drag.screen.y = intent.at.y
          if (drag.kind === 'needles') this.pullNeedles(drag)
        }
        return
      }
      case 'dragEnd':
        this.dragEnd(intent.id, intent.at, true)
        return
      case 'cancelAll':
        for (const id of intent.ids) this.dragEnd(id, null, false)
        return
      default: {
        const never: never = intent
        return never
      }
    }
  }

  private press(target: Target): void {
    if (target.kind === 'ball') this.balls[target.index].squash.v += 3
  }

  private tap(target: Target, at: Point): void {
    switch (target.kind) {
      case 'ball':
        this.tapBall(target.index)
        return
      case 'animal':
        this.tapAnimal(target.animal)
        return
      case 'needles':
      case 'scarf':
      case 'loom':
        if (this.offered) this.startGift()
        else this.askForYarn()
        return
      case 'butterfly':
        this.toggleMirror()
        return
      case 'basket':
        this.basketAt = this.t
        this.sound.basket()
        for (const ball of this.balls) if (ball.held === null && ball.returning < 0) this.launch(ball, 22 + ball.colour * 3, 0.02 * ball.colour)
        return
      case 'snow':
        this.touchSnow(at)
        return
      default: {
        const never: never = target
        return never
      }
    }
  }

  /** A loom that has nothing to give yet sways, and the ball it would like next hops in the basket. */
  private askForYarn(): void {
    this.loom.swing.v += 0.5
    if (this.loom.rows.length > 0) this.sing(stripeColours(this.loom.rows), 0, 1)
    if (isFull(this.state)) return
    const ball = this.balls[suggestColour(stripeColours(this.loom.rows), this.balls.length)]
    if (!ball || ball.held !== null || ball.returning >= 0 || ball.airborne) return
    this.launch(ball, ASK_HOP_SPEED, ASK_HOP_DELAY)
    this.sound.hop(ball.colour)
  }

  /** A puff where the touch meets the snow, on the blanket or up the slope; above the hill, a flurry in the sky. */
  private touchSnow(at: Point): void {
    const p = this.projector
    if (!p) return
    const s = this.scratch
    if (this.snowUnder(p, at, s)) {
      const size = TOUCH_PUFF_PX / p.pixelsPerUnit(s)
      this.puff(s.x, s.y + size * 0.6, s.z, size, POWDER_PUFF)
      this.puff(s.x - size * 0.9, s.y + size * 0.4, s.z, size * 0.7, POWDER_PUFF)
      this.puff(s.x + size * 0.9, s.y + size * 0.5, s.z, size * 0.75, POWDER_PUFF)
      this.sound.crunch()
    } else if (p.toPlaneZ(at, SKY_PUFF_Z, s)) {
      this.puff(s.x, s.y, SKY_PUFF_Z, TOUCH_PUFF_PX / p.pixelsPerUnit(s), WHITE_PUFF)
      this.sound.flurry()
    }
  }

  /**
   * Where the touch's ray first dips under the snow: marched from the front of
   * the blanket to the far edge of the hill, then narrowed by halving. (The
   * slope is steeper than rays near the horizon, so settling onto the ground's
   * height from the flat plane would not converge.)
   */
  private snowUnder(p: Projector, at: Point, out: Point3): boolean {
    let near = SNOW_NEAR_Z
    for (let z = SNOW_NEAR_Z; z >= SNOW_FAR_Z; z -= SNOW_STEP) {
      if (!p.toPlaneZ(at, z, out)) return false
      if (out.y <= groundY(out.x, z)) {
        let far = z
        for (let i = 0; i < 6; i++) {
          const mid = (near + far) / 2
          if (p.toPlaneZ(at, mid, out) && out.y <= groundY(out.x, mid)) far = mid
          else near = mid
        }
        p.toPlaneZ(at, far, out)
        out.y = groundY(out.x, far)
        return true
      }
      near = z
    }
    return false
  }

  private tapBall(index: number): void {
    const ball = this.balls[index]
    this.launch(ball, 58, 0.05)
    this.sound.hop(ball.colour)
    this.knit(ball.colour)
  }

  private knit(colour: number): void {
    if (isFull(this.state)) {
      this.loom.swing.v += 0.25
      return
    }
    knitRow(this.state, colour)
    this.loom.version++
    this.cadence.change(this.t * 1000, true)
    this.afterKnitChange()
  }

  private afterKnitChange(): void {
    if (this.state.atLoom === null && summonIfReady(this.state, this.offerRows)) {
      this.walkTo(this.actors[this.state.atLoom!], LOOM_SPOT, 'loom', 0.3)
      this.cadence.change(this.t * 1000, true)
    }
  }

  private tapAnimal(animal: AnimalKey): void {
    const actor = this.actors[animal]
    if (this.offered && this.state.atLoom === animal) {
      this.startGift()
      return
    }
    actor.tapAt = this.t
    if (actor.warm < 0.5) this.sound.shiver(animal)
    else this.sound.happy(animal)
  }

  private toggleMirror(): void {
    this.state.mirror = !this.state.mirror
    this.butterfly.flapAt = this.t
    this.sound.flutter(this.state.mirror)
    this.cadence.change(this.t * 1000, true)
  }

  private dragStart(id: number, target: Target, at: Point): void {
    switch (target.kind) {
      case 'ball': {
        const ball = this.balls[target.index]
        if (ball.held !== null) return
        ball.held = id
        ball.returning = -1
        ball.toLoom = false
        ball.airborne = false
        ball.hopY = 0
        ball.hopV = 0
        ball.squash.v -= 4
        ball.carry.x.x = ball.pos.x
        ball.carry.y.x = ball.pos.y
        ball.carry.z.x = ball.pos.z
        ball.carry.x.v = ball.carry.y.v = ball.carry.z.v = 0
        this.drags.set(id, { kind: 'ball', index: target.index, screen: { x: at.x, y: at.y }, painted: false, cellRow: -1, cellColumn: -1, cellSince: 0 })
        this.sound.lift(ball.colour)
        return
      }
      case 'needles': {
        if (this.needlesDrag || this.loom.rows.length === 0) return
        this.needles.held = true
        const drag: Drag = { kind: 'needles', screen: { x: at.x, y: at.y }, grab: { x: at.x, y: at.y }, pulled: 0 }
        this.needlesDrag = drag
        this.drags.set(id, drag)
        return
      }
      case 'scarf': {
        if (this.scarfDrag || this.loom.rows.length === 0) return
        const drag: Drag = { kind: 'scarf', screen: { x: at.x, y: at.y }, start: { x: at.x, y: at.y } }
        this.scarfDrag = drag
        this.drags.set(id, drag)
        this.sound.lift(this.loom.rows[this.loom.rows.length - 1][0])
        return
      }
      // Nothing here follows a finger, so a stroke answers like a tap where it began: no touch lands in silence.
      case 'loom':
      case 'animal':
      case 'butterfly':
      case 'basket':
      case 'snow':
        this.tap(target, at)
        return
      default: {
        const never: never = target
        return never
      }
    }
  }

  private dragEnd(id: number, at: Point | null, commit: boolean): void {
    const drag = this.drags.get(id)
    if (!drag) return
    this.drags.delete(id)
    switch (drag.kind) {
      case 'ball': {
        const ball = this.balls[drag.index]
        ball.held = null
        const drop = commit && at && !drag.painted
        const onLoom = drop && this.overLoom(at)
        if (onLoom) {
          this.sound.hop(ball.colour)
          this.knit(ball.colour)
        }
        if (drag.painted) this.cadence.settle(this.t * 1000)
        this.sendHome(ball)
        // A newcomer offers the yarn to the cold animal itself: the ball shows the way by flying into the loom.
        if (drop && !onLoom && this.overWaiting(at)) {
          ball.toLoom = true
          this.sound.hop(ball.colour)
        }
        return
      }
      case 'needles':
        this.needles.held = false
        this.needlesDrag = null
        // A stroke that unravels nothing (down, sideways, or too short) answers like a tap on the knitting.
        if (drag.pulled > 0) this.cadence.change(this.t * 1000, true)
        else if (commit && at) this.tap(SCARF_TARGET, at)
        return
      case 'scarf': {
        this.scarfDrag = null
        this.loom.pull.x = 0
        this.loom.pull.y = 0
        // Let go short of the animal, the scarf answers like a tap: an offered scarf is given all the same.
        if (commit && at) this.tap(SCARF_TARGET, at)
        else this.loom.swing.v += 0.4
        return
      }
      default: {
        const never: never = drag
        return never
      }
    }
  }

  private overLoom(at: Point): boolean {
    const p = this.projector
    if (!p || !p.toPlaneZ(at, SCARF.z, this.scratch)) return false
    return Math.abs(this.scratch.x - LOOM.x) < LOOM.postX + 3 && this.scratch.y > -2 && this.scratch.y < LOOM.rodY + 5
  }

  /** Over the cold animal at the loom (or on its way there), waiting for its scarf. */
  private overWaiting(at: Point): boolean {
    const animal = this.state.atLoom
    const p = this.projector
    if (!animal || !p) return false
    const actor = this.actors[animal]
    if (!actor.visible || actor.destination !== 'loom') return false
    return this.near(p, at, actor.x, groundY(actor.x, actor.z) + BODY[animal].height * 0.48, actor.z, BODY[animal].height * 0.55)
  }

  private pullNeedles(drag: Extract<Drag, { kind: 'needles' }>): void {
    const p = this.projector
    if (!p) return
    this.scratch.x = SCARF.x
    this.scratch.y = needlesY(this.loom.rows.length)
    this.scratch.z = SCARF.z
    const rowPx = CELL_H * p.pixelsPerUnit(this.scratch)
    const up = drag.grab.y - drag.screen.y
    const want = Math.max(0, Math.floor(up / rowPx))
    while (drag.pulled < want && this.loom.rows.length > 0) {
      const row = unravelRow(this.state)
      if (!row) break
      drag.pulled++
      this.loom.version++
      this.loom.swing.v -= 0.2
      this.sound.unravel()
      const ball = this.balls[row[0]]
      if (ball && ball.held === null) {
        this.launch(ball, 30, 0)
        ball.spinV -= 9
      }
      this.puff(SCARF.x, needlesY(this.loom.rows.length), SCARF.z + 2, 1.4, row[0])
    }
    this.lastHumRow = Math.min(this.lastHumRow, this.loom.rows.length - 1)
  }

  // --- the gift -----------------------------------------------------------------------

  private startGift(): void {
    if (!this.offered) return
    const colours = stripeColours(this.state.loom)
    const gift = give(this.state, this.offerRows)
    if (!gift) return
    const view = this.loom
    view.holder = gift.to
    view.giftAt = 0
    view.reveal = view.rows.length * WIDTH
    view.pull.x = 0
    view.pull.y = 0
    if (gift.folded) {
      const oldest = this.worn.find((w) => w.holder === gift.to && w.rows === gift.folded && w.leavingAt < 0)
      if (oldest) oldest.leavingAt = this.t
    }
    const stays = this.worn.filter((w) => w.holder === gift.to && w.leavingAt < 0)
    stays.forEach((w, i) => (w.stack = i))
    view.stack = stays.length
    this.worn.push(view)
    this.loom = this.newScarf(this.state.loom, null)
    this.needles.castOffAt = this.t
    this.lastHumRow = -1
    this.offered = false
    this.cadence.change(this.t * 1000, true)

    const actor = this.actors[gift.to]
    actor.reach.v += 2
    this.sound.castOff()
    this.after(FLY_END + 0.05, () => this.sound.swish())
    this.after(WRAP_END, () => {
      actor.warmAt = this.t
      this.sound.warm(gift.to)
      this.puff(actor.x, groundY(actor.x, actor.z) + BODY[gift.to].neck, actor.z + 4, 2.2, colours[0] ?? 0)
    })
    this.after(DANCE_START, () => {
      actor.danceAt = this.t
      actor.danceLength = DANCE_SECONDS[gift.to]
      this.sound.dance(gift.to, colours)
    })
    this.after(DANCE_START + DANCE_SECONDS[gift.to] + 0.2, () => {
      if (this.state.atLoom !== gift.to) this.walkTo(actor, HILL_SPOTS[gift.to], 'hill', 0)
      const next = this.state.atLoom
      if (!next || next === gift.to) return
      // The next cold animal arrives as the friend walking home behind the loom leaves its window, so its first rows are knitted over plain snow.
      const walkIn = this.walkSeconds(next, ENTRY, LOOM_SPOT)
      this.walkTo(this.actors[next], LOOM_SPOT, 'loom', Math.max(NEXT_ARRIVES_AFTER, this.inWindowUntil(actor) - walkIn))
    })
  }

  /** Seconds from now until a walking animal last shows through the loom's open window (0 if it never does). */
  private inWindowUntil(actor: ActorView): number {
    const p = this.projector
    if (!p || !actor.walking) return 0
    this.scratch.x = LOOM.x - LOOM.postX
    this.scratch.y = LOOM.rodY
    this.scratch.z = LOOM.z
    if (!p.toScreen(this.scratch, this.screen)) return 0
    const left = this.screen.x
    const top = this.screen.y
    this.scratch.x = LOOM.x + LOOM.postX
    this.scratch.y = LOOM.footY
    if (!p.toScreen(this.scratch, this.screen)) return 0
    const right = this.screen.x
    const bottom = this.screen.y
    const route = this.routes[actor.animal]
    let last = -Infinity
    let t0 = actor.walkT0
    let duration = actor.walkDuration
    for (let leg = route.next - 1; leg < route.legs.length; leg++) {
      const from = leg === route.next - 1 ? actor.walkFrom : route.legs[leg - 1]
      const to = route.legs[leg]
      if (leg >= route.next) {
        t0 += duration
        duration = legSeconds(actor.animal, from, to)
      }
      for (let i = 0; i <= WINDOW_SAMPLES; i++) {
        const s = i / WINDOW_SAMPLES
        const x = from.x + (to.x - from.x) * s
        const z = from.z + (to.z - from.z) * s
        if (z > LOOM.z) continue
        this.scratch.x = x
        this.scratch.y = groundY(x, z) + BODY[actor.animal].height * 0.5
        this.scratch.z = z
        if (p.toScreen(this.scratch, this.screen) && this.screen.x > left && this.screen.x < right && this.screen.y > top && this.screen.y < bottom) last = t0 + Math.min(1, s + 1 / WINDOW_SAMPLES) * duration
      }
    }
    return last > -Infinity ? last - this.t : 0
  }

  /** Seconds a walk from `from` to `spot` takes round what is in the way now. */
  private walkSeconds(animal: AnimalKey, from: Point2, spot: Point2): number {
    let seconds = 0
    let at = from
    for (const to of planRoute(from, spot, walkRoom(animal), this.walkObstacles(animal))) {
      seconds += legSeconds(animal, at, to)
      at = to
    }
    return seconds
  }

  private after(delay: number, run: () => void): void {
    this.timers.push({ at: this.t + delay, run })
  }

  // --- balls ------------------------------------------------------------------------------

  private launch(ball: BallView, speed: number, delay: number): void {
    if (ball.held !== null) return
    ball.launchAt = this.t + delay
    ball.launchV = speed
    ball.squash.v += 5
  }

  /** Just under the needles, in front of the scarf: where a row is knitted. */
  private needlesEntry(): Point3 {
    this.entry.x = SCARF.x
    this.entry.y = needlesY(this.loom.reveal / WIDTH) - CELL_H
    this.entry.z = CARRY_Z
    return this.entry
  }

  /** The ball given to the waiting animal reaches the loom: its row is knitted, then it flies home. */
  private knitFromFlight(ball: BallView): void {
    ball.toLoom = false
    ball.squash.v += 6
    this.knit(ball.colour)
    this.sendHome(ball)
  }

  private sendHome(ball: BallView): void {
    ball.returnFrom.x = ball.pos.x
    ball.returnFrom.y = ball.pos.y
    ball.returnFrom.z = ball.pos.z
    ball.returning = 0
  }

  private stepBalls(dt: number): void {
    const p = this.projector
    const knittingColour = this.strand.alpha > 0.5 ? this.strand.colour : -1
    const letGo = Math.exp(-dt * 10)
    for (const ball of this.balls) {
      if (ball.held !== null) {
        const drag = this.drags.get(ball.held)
        if (drag && drag.kind === 'ball' && p && p.toPlaneZ(drag.screen, CARRY_Z, this.scratch)) {
          ball.pos.x = springStep(ball.carry.x, this.scratch.x, dt, CARRY_STIFFNESS, CARRY_DAMPING)
          ball.pos.y = springStep(ball.carry.y, Math.max(BALL_RADIUS, this.scratch.y), dt, CARRY_STIFFNESS, CARRY_DAMPING)
          ball.pos.z = springStep(ball.carry.z, CARRY_Z, dt, CARRY_STIFFNESS, CARRY_DAMPING)
          this.paintUnder(ball, drag)
        }
      } else if (ball.returning >= 0) {
        const to = ball.toLoom ? this.needlesEntry() : ball.rest
        ball.returning = Math.min(1, ball.returning + dt / (ball.toLoom ? TO_LOOM_SECONDS : RETURN_SECONDS))
        const k = smooth(ball.returning)
        const arc = Math.sin(ball.returning * Math.PI) * 9
        ball.pos.x = ball.returnFrom.x + (to.x - ball.returnFrom.x) * k
        ball.pos.y = ball.returnFrom.y + (to.y - ball.returnFrom.y) * k + arc
        ball.pos.z = ball.returnFrom.z + (to.z - ball.returnFrom.z) * k
        if (ball.returning >= 1 && ball.toLoom) {
          this.knitFromFlight(ball)
        } else if (ball.returning >= 1) {
          ball.returning = -1
          ball.squash.v += 9
          ball.spinV += 4
          this.sound.settle(ball.colour)
        }
      } else {
        if (!ball.airborne && this.t >= ball.launchAt && ball.launchV > 0) {
          ball.airborne = true
          ball.hopV = ball.launchV
          ball.launchV = 0
          ball.squash.v -= 6
        }
        if (ball.airborne) {
          ball.hopV -= GRAVITY * dt
          ball.hopY += ball.hopV * dt
          if (ball.hopY <= 0) {
            ball.hopY = 0
            ball.airborne = false
            ball.squash.v += Math.min(14, 4 + Math.abs(ball.hopV) * 0.12)
            ball.hopV = 0
          }
        }
        ball.pos.x = ball.rest.x
        ball.pos.y = ball.rest.y + ball.hopY
        ball.pos.z = ball.rest.z
      }
      if (ball.held === null) {
        ball.carry.x.v *= letGo
        ball.carry.y.v *= letGo
        ball.carry.z.v *= letGo
      }
      if (ball.colour === knittingColour) ball.spinV += (7 - ball.spinV) * Math.min(1, dt * 6)
      else ball.spinV *= Math.exp(-dt * 2.5)
      ball.spin += ball.spinV * dt
      springStep(ball.squash, 0, dt, 320, 13)
    }
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i]
      if (ball.airborne && ball.held === null && ball.returning < 0) hopPast(ball.pos, ball.rest, this.ballPositions, this.ballRests, i)
    }
  }

  /**
   * Moving balls keep clear of everything in their way: they ride over the
   * snow and the basket, then slide toward the child along their line of
   * sight, so on screen they stay where the finger or the throw put them.
   */
  private clearMovingBalls(): void {
    const g = this.guidance
    let moving = false
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i]
      const swell = g.glowBalls && ball.colour === g.glowBall ? 1 + (BALL_SWELL - 1) * g.frame.glow : 1
      this.ballReaches[i] = ballReach(ball.carry.x.v, ball.carry.y.v, swell, ball.squash.x)
      if (ball.held !== null || ball.returning >= 0) moving = true
    }
    if (!moving) return
    const scene = this.ballScene
    scene.swing = this.needleSwing
    scene.rows = this.loom.rows.length
    scene.butterfly = this.butterfly.show.x
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i]
      if (ball.held === null && ball.returning < 0) continue
      this.lineOfSight(ball.pos)
      clearBall(ball.pos, i, this.ballPositions, this.ballReaches, this.towardEye, scene)
    }
  }

  /** The way from `p` toward the eye, per unit of depth. */
  private lineOfSight(p: Point3): void {
    const projector = this.projector
    const eye = this.towardEye
    eye.x = 0
    eye.y = 0
    eye.z = 1
    if (!projector || !projector.toScreen(p, this.screen) || !projector.toPlaneZ(this.screen, p.z + 1, this.scratch)) return
    eye.x = this.scratch.x - p.x
    eye.y = this.scratch.y - p.y
  }

  /**
   * Where the loom scarf's needles hang: under the last row shown, lower
   * still on an empty loom so they clear the rod, sliding with the stitch
   * being knitted and away when cast off, never below the needles' floor.
   * The scarf then swings only as far as they stay clear of the basket and
   * the animals.
   */
  private poseNeedles(): void {
    const loom = this.loom
    const lift = loom.lift.x
    const pose = this.needlePose
    pose.pivotY = SCARF.top + lift * 1.4 + loom.pull.y
    pose.pivotZ = SCARF.z + lift * 0.8
    pose.rock = this.loomRock.x * 0.022
    pose.lean = -lift * 0.05
    const shown = loom.reveal / WIDTH
    const castOff = this.t - this.needles.castOffAt
    const knitting = this.strand.alpha
    const slide = castOff < 0.35 ? smooth(castOff / 0.35) * 26 : 0
    const along = this.strand.column - (WIDTH - 1) / 2
    const castOn = Math.max(0, 1 - shown) * NEEDLE_BAR.castOnDrop
    pose.x = slide + along * knitting * 1.3
    pose.y = Math.max(NEEDLES_FLOOR - pose.pivotY, -shown * CELL_H - 0.5 - castOn + this.needles.pull.x)
    pose.click = Math.sin(this.t * 26) * NEEDLE_BAR.click * knitting
    for (let i = 0; i < ANIMALS.length; i++) {
      const animal = ANIMALS[i]
      const actor = this.actors[animal]
      const k = this.keepOuts[i + 1]
      k.x = actor.x
      k.z = actor.z
      k.r = BODY[animal].reach
      k.top = actor.visible ? groundY(actor.x, actor.z) + BODY[animal].top : -Infinity
    }
    const length = Math.max(1, loom.rows.length) * CELL_H
    const angle = loom.swing.x * 0.07 + Math.max(-MAX_SWING, Math.min(MAX_SWING, loom.pull.x / Math.max(8, length * 0.8)))
    const side = angle < 0 ? -1 : 1
    this.needleSwing = side * swingRoom(side, Math.abs(angle), pose, this.keepOuts)
  }

  private paintUnder(ball: BallView, drag: Extract<Drag, { kind: 'ball' }>): void {
    const p = this.projector
    if (!p || !p.toPlaneZ(drag.screen, SCARF.z, this.scratch2)) return
    const shown = Math.min(this.loom.rows.length, Math.floor(this.loom.reveal / WIDTH + 1e-6))
    const cell = cellAt(this.scratch2.x, this.scratch2.y, shown)
    if (!cell) {
      drag.cellRow = -1
      return
    }
    if (cell.row !== drag.cellRow || cell.column !== drag.cellColumn) {
      drag.cellRow = cell.row
      drag.cellColumn = cell.column
      drag.cellSince = this.t
      if (!drag.painted) return
    } else if (!drag.painted && this.t - drag.cellSince < PAINT_DWELL_S) return
    else if (drag.painted) return
    const changed = paintStitch(this.state, cell.row, cell.column, ball.colour)
    if (changed.length === 0) {
      // Resting on a stitch that is already this colour must not turn the carry into a paint, or the drop knits nothing.
      if (!drag.painted) drag.cellSince = Number.POSITIVE_INFINITY
      return
    }
    drag.painted = true
    this.loom.version++
    this.sound.paint(ball.colour)
    ball.squash.v += 6
    for (const [row, column] of changed) {
      const c = cellCentre(row, column)
      this.puff(c.x, c.y, SCARF.z + 1.5, 1, ball.colour)
    }
    this.cadence.change(this.t * 1000)
  }

  // --- hit testing ---------------------------------------------------------------------

  private hitTest(at: Point): Target {
    const p = this.projector
    if (!p) return SNOW
    if (this.butterfly.show.x > 0.5 && this.near(p, at, BUTTERFLY.x, BUTTERFLY.y, BUTTERFLY.z, 6.5)) return BUTTERFLY_TARGET
    const rows = this.loom.rows.length
    const freeEdge = needlesY(this.loom.reveal / WIDTH)
    if (rows > 0) {
      this.scratch.x = SCARF.x
      this.scratch.y = freeEdge
      this.scratch.z = SCARF.z
      if (p.toScreen(this.scratch, this.screen)) {
        const ppu = p.pixelsPerUnit(this.scratch)
        if (Math.abs(at.y - this.screen.y) < Math.max(18, 1.6 * ppu) && Math.abs(at.x - this.screen.x) < (SCARF.halfWidth + 5) * ppu) return NEEDLES
      }
    }
    let best = -1
    let bestDistance = Infinity
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i]
      if (!p.toScreen(ball.pos, this.screen)) continue
      const d = Math.hypot(at.x - this.screen.x, at.y - this.screen.y)
      if (d < BALL_RADIUS * 1.15 * p.pixelsPerUnit(ball.pos) + HIT_SLOP_PX && d < bestDistance) {
        best = i
        bestDistance = d
      }
    }
    if (best >= 0) return this.ballTargets[best]
    if (rows > 0 && p.toPlaneZ(at, SCARF.z, this.scratch)) {
      const x = this.scratch.x - SCARF.x - this.loom.pull.x
      if (Math.abs(x) < SCARF.halfWidth + 1.5 && this.scratch.y < SCARF.top + 1.5 && this.scratch.y > freeEdge - 1) return SCARF_TARGET
    }
    for (const animal of ANIMALS) {
      const actor = this.actors[animal]
      if (!actor.visible) continue
      if (this.near(p, at, actor.x, groundY(actor.x, actor.z) + BODY[animal].height * 0.48, actor.z, BODY[animal].height * 0.55)) return this.animalTargets[animal]
    }
    if (this.near(p, at, BASKET.x, BASKET.rimY * 0.6, BASKET.z, BASKET.radius)) return BASKET_TARGET
    if (this.overLoom(at)) return LOOM_TARGET
    return SNOW
  }

  private near(p: Projector, at: Point, x: number, y: number, z: number, radius: number): boolean {
    this.scratch.x = x
    this.scratch.y = y
    this.scratch.z = z
    if (!p.toScreen(this.scratch, this.screen)) return false
    return Math.hypot(at.x - this.screen.x, at.y - this.screen.y) < radius * p.pixelsPerUnit(this.scratch) + HIT_SLOP_PX
  }

  // --- lifecycle -----------------------------------------------------------------------

  /** Seconds the hillside has only been breathing: no touch, no gift, and no guidance playing. */
  get restingFor(): number {
    const frame = this.guidance.frame
    return frame.demo >= 0 || frame.peek >= 0 ? 0 : frame.idle
  }

  /** Put away, faded, or hidden mid-anything: every gesture ends where it is and nothing is lost. */
  pause(): void {
    this.tracker.reset()
    for (const id of [...this.drags.keys()]) this.dragEnd(id, null, false)
    // A ball still flying into the loom was already given: knit its row now, so the stitch is saved.
    for (const ball of this.balls) if (ball.toLoom) this.knitFromFlight(ball)
    this.cadence.settle(this.t * 1000)
  }

  step(dt: number): void {
    const h = Math.min(Math.max(dt, 0), 0.1)
    this.t += h
    this.runTimers()
    this.stepActors(h)
    this.stepBalls(h)
    this.stepLoom(h)
    this.stepWorn(h)
    this.stepGuidance()
    this.poseNeedles()
    this.clearMovingBalls()
  }

  private runTimers(): void {
    if (this.timers.length === 0) return
    for (let i = 0; i < this.timers.length; ) {
      const timer = this.timers[i]
      if (this.t >= timer.at) {
        this.timers.splice(i, 1)
        timer.run()
      } else i++
    }
  }

  private stepActors(dt: number): void {
    const atLoom = this.state.atLoom
    for (const animal of ANIMALS) {
      const actor = this.actors[animal]
      if (actor.walking) {
        const route = this.routes[animal]
        let progress = clamp01((this.t - actor.walkT0) / actor.walkDuration)
        while (progress >= 1 && route.next < route.legs.length) {
          actor.x = actor.walkTo.x
          actor.z = actor.walkTo.z
          this.startLeg(actor, actor.walkT0 + actor.walkDuration)
          progress = clamp01((this.t - actor.walkT0) / actor.walkDuration)
        }
        actor.walkProgress = progress
        actor.x = actor.walkFrom.x + (actor.walkTo.x - actor.walkFrom.x) * progress
        actor.z = actor.walkFrom.z + (actor.walkTo.z - actor.walkFrom.z) * progress
        if (progress > 0) actor.yaw = Math.atan2(actor.walkTo.x - actor.walkFrom.x, actor.walkTo.z - actor.walkFrom.z)
        if (progress >= 1) {
          actor.walking = false
          actor.yaw = actor.walkTo.yaw
        }
      }
      if (actor.warmAt > -Infinity) actor.warm = Math.max(actor.warm, clamp01((this.t - actor.warmAt) / 1.2))
      const reaching = this.offered && animal === atLoom
      springStep(actor.reach, reaching ? 1 : 0, dt, 40, 9)
    }
  }

  private recipientReady(): boolean {
    const animal = this.state.atLoom
    if (!animal) return false
    const actor = this.actors[animal]
    return !actor.walking && actor.destination === 'loom' && this.t > actor.danceAt + actor.danceLength
  }

  private stepLoom(dt: number): void {
    const loom = this.loom
    const target = loom.rows.length * WIDTH
    if (loom.reveal < target) {
      const before = loom.reveal
      const speed = target - before > WIDTH + 0.5 ? KNIT_FAST_CELLS_PER_S : KNIT_CELLS_PER_S
      loom.reveal = Math.min(target, before + speed * dt)
      for (let k = Math.floor(before) + 1; k <= Math.floor(loom.reveal + 1e-6); k++) this.stitched(k - 1)
    } else if (loom.reveal > target) loom.reveal = Math.max(target, loom.reveal - UNRAVEL_CELLS_PER_S * dt)

    const knitting = loom.reveal < target
    const cell = Math.min(Math.floor(loom.reveal), Math.max(0, target - 1))
    if (knitting) {
      const row = Math.floor(cell / WIDTH)
      const within = cell % WIDTH
      this.strand.row = row
      this.strand.column = row % 2 === 0 ? within : WIDTH - 1 - within
      this.strand.colour = loom.rows[row]?.[this.strand.column] ?? 0
      this.strand.ball = this.strand.colour < this.balls.length ? this.strand.colour : -1
    }
    this.strand.alpha += ((knitting ? 1 : 0) - this.strand.alpha) * Math.min(1, dt * (knitting ? 14 : 5))

    const wasOffered = this.offered
    this.offered = canOffer(this.state, this.offerRows) && this.recipientReady() && !knitting
    if (this.offered && !wasOffered) this.sound.offer()
    springStep(loom.lift, this.offered ? 1 : 0, dt, 30, 7)
    springStep(loom.swing, 0, dt, 9, 1.3)
    const scarfDrag = this.scarfDrag
    if (scarfDrag && this.projector && this.projector.toPlaneZ(scarfDrag.screen, SCARF.z, this.scratch) && this.projector.toPlaneZ(scarfDrag.start, SCARF.z, this.scratch2)) {
      const reach = this.offered ? 16 : 3
      loom.pull.x = Math.max(-reach, Math.min(reach, this.scratch.x - this.scratch2.x))
      // Pulled down no further than keeps its needles off the loom's feet and the blanket.
      loom.pull.y = Math.max(-Math.min(reach * 0.5, maxDrop(loom.rows.length)), Math.min(reach * 0.5, this.scratch.y - this.scratch2.y))
    }
    const needlesTarget = this.needlesDragLift()
    springStep(this.needles.pull, needlesTarget, dt, 180, 16)
    springStep(this.loomRock, 0, dt, 60, 5)
    springStep(this.butterfly.show, this.butterflyWanted() ? 1 : 0, dt, 40, 8)
    springStep(this.butterfly.open, this.state.mirror ? 1 : 0, dt, 70, 9)
  }

  private needlesDragLift(): number {
    const p = this.projector
    const drag = this.needlesDrag
    if (!p || !drag) return 0
    this.scratch.x = SCARF.x
    this.scratch.y = needlesY(this.loom.rows.length)
    this.scratch.z = SCARF.z
    const lift = (drag.grab.y - drag.screen.y) / p.pixelsPerUnit(this.scratch) - drag.pulled * CELL_H
    return Math.max(-1.5, Math.min(CELL_H * 0.9, lift))
  }

  private butterflyWanted(): boolean {
    return this.state.mirror || this.loom.rows.length >= 4 || this.worn.length > 0
  }

  /** A stitch slipped off the needle; at the end of a row, the row rings and patterns are heard. */
  private stitched(index: number): void {
    const loom = this.loom
    const row = Math.floor(index / WIDTH)
    const within = index % WIDTH
    const column = row % 2 === 0 ? within : WIDTH - 1 - within
    const colour = loom.rows[row]?.[column] ?? 0
    this.sound.stitch(colour)
    if (within !== WIDTH - 1) return
    this.sound.row(colour)
    loom.swing.v += 0.22
    const waiting = this.state.atLoom
    if (waiting) this.actors[waiting].rowAt = this.t
    const unit = completedRepeat(stripeColours(loom.rows.slice(0, row + 1)))
    if (unit && row - this.lastHumRow >= unit.length) {
      this.lastHumRow = row
      this.humAt = this.t
      this.loomRock.v += 1.4
      this.sing(unit, row + 1 - 2 * unit.length, 2)
    }
  }

  /** Hum `unit`, lighting its rows on the loom note by note, from row `first`, `copies` times over. */
  private sing(unit: readonly number[], first: number, copies: number): void {
    this.song.at = this.t
    this.song.first = first
    this.song.period = unit.length
    this.song.copies = copies
    this.sound.hum(unit)
  }

  private stepWorn(dt: number): void {
    for (let i = this.worn.length - 1; i >= 0; i--) {
      const view = this.worn[i]
      springStep(view.swing, 0, dt, 14, 2.2)
      if (view.leavingAt >= 0 && this.t - view.leavingAt > 0.9) {
        this.worn.splice(i, 1)
        continue
      }
      if (view.giftAt < 0) continue
      view.giftAt += dt
      const g = view.giftAt
      view.fringe = clamp01(g / CAST_OFF)
      view.fly = smooth((g - CAST_OFF) / (FLY_END - CAST_OFF))
      view.wrap = clamp01((g - WRAP_START) / (WRAP_END - WRAP_START))
      if (g >= WRAP_END) {
        view.giftAt = -1
        view.swing.v += 1.2
      }
    }
  }

  private giftInProgress(): boolean {
    for (const view of this.worn) if (view.giftAt >= 0) return true
    return this.timers.length > 0
  }

  private stepGuidance(): void {
    const g = this.guidance
    const held = this.drags.size > 0 || this.giftInProgress()
    if (held) this.scheduler.hold(this.t)
    const frame = this.scheduler.frame(this.t, g.frame)
    let walking = false
    for (const animal of ANIMALS) walking ||= this.actors[animal].walking
    const busy = walking || held || this.loom.reveal < this.loom.rows.length * WIDTH
    if (this.loom.version !== this.hintVersion || busy !== this.hintBusy || (g.hint?.kind === 'give') !== this.offered) {
      this.hintVersion = this.loom.version
      this.hintBusy = busy
      g.hint = chooseHint({
        colours: stripeColours(this.loom.rows),
        balls: this.balls.length,
        canOffer: this.offered,
        full: isFull(this.state),
        recipient: this.recipientReady(),
        busy,
      })
    }
    const hint = g.hint
    g.glowBalls = hint?.kind === 'knit'
    g.glowBall = hint?.kind === 'knit' ? hint.colour : -1
    g.glowScarf = hint?.kind === 'give'
    g.handVisible = false
    g.handCarries = false
    if (hint && frame.demo >= 0) {
      if (hint.kind === 'knit') {
        const ball = this.balls[hint.colour]
        if (ball) {
          this.handFrom.x = ball.rest.x
          this.handFrom.y = ball.rest.y + BALL_RADIUS * 0.6
          this.handFrom.z = ball.rest.z + BALL_RADIUS
          handPose(g.hand, this.handFrom, null, frame.demo)
          g.handVisible = true
        }
      } else {
        const animal = this.state.atLoom
        if (animal) {
          const rows = this.loom.rows.length
          const middle = cellCentre(Math.floor(rows * 0.55), 2)
          this.handFrom.x = middle.x
          this.handFrom.y = middle.y
          this.handFrom.z = SCARF.z + 3
          const actor = this.actors[animal]
          this.handTo.x = actor.x + 4
          this.handTo.y = groundY(actor.x, actor.z) + BODY[animal].neck
          this.handTo.z = actor.z + 6
          handPose(g.hand, this.handFrom, this.handTo, frame.demo)
          g.handVisible = true
          g.handCarries = true
        }
      }
    }
    if (frame.peek >= 0) {
      const step = Math.floor(frame.peek * (this.balls.length + 1))
      if (step !== this.peekStep && step < this.balls.length) {
        this.peekStep = step
        this.launch(this.balls[step], 26, 0)
      }
    } else this.peekStep = -1
  }

  private puff(x: number, y: number, z: number, size: number, colour: number): void {
    const puff = this.puffs[this.puffCursor]
    this.puffCursor = (this.puffCursor + 1) % PUFFS
    puff.x = x
    puff.y = y
    puff.z = z
    puff.size = size
    puff.colour = colour
    puff.t0 = this.t
  }

  /** Worn scarves of one animal, innermost first (the view stacks them). */
  wornBy(animal: AnimalKey): number {
    let count = 0
    for (const view of this.worn) if (view.holder === animal && view.leavingAt < 0) count++
    return count
  }
}

const SNOW: Target = { kind: 'snow' }
const NEEDLES: Target = { kind: 'needles' }
const SCARF_TARGET: Target = { kind: 'scarf' }
const LOOM_TARGET: Target = { kind: 'loom' }
const BUTTERFLY_TARGET: Target = { kind: 'butterfly' }
const BASKET_TARGET: Target = { kind: 'basket' }
