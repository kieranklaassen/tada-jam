import type { Doll, KiteSound } from './audio'
import { headClearAlong, headroom, planClimb, roomy, spotValue, standableSpots, type MoveKind, type Spot } from './climb'
import { FLY_GRIP, PIP_CLEAR } from './doll'
import { chooseHint, handPose, handTravel, HintClock, type HandPose, type Hint, type PlayroomSummary } from './guidance'
import { buildRoute, routePose, type RoutePose, type Segment } from './hero'
import { Gestures, type Intent, type Target } from './input'
import { slotCenter, TRAY, TRAY_SLOTS, trayToWorld, WATCHERS, type Vec3 } from './layout'
import { kiteTarget, nextPerch, PERCHES } from './perches'
import { DOLL_WEIGHT, PlayPhysics } from './physics'
import { clampX, HELD_SCALE, PIECES, PLAY_MAX_X, PLAY_MIN_X, pieceShape, pointInConvex, popScale, restHeight, restSliver, SHAPES, skylineAt, slideClear, spanAt, transformInto, type PieceShape, type Placed, type Pose, type Vec2 } from './pieces'
import { SaveCadence } from './saveCadence'
import { serialize, type KiteState, type SavedPiece } from './state'
import { findStacks, type Stack } from './sway'

// The playroom's rules. Input becomes physics; when the build settles the
// doll plans a climb and follows it; reaching the kite starts a flight round
// the room; the kite then drifts to its next perch. The controller owns
// game time and steps inside the render loop, so pausing the loop pauses
// everything. Every pose the view reads is kept here in reused objects.

export type Projector = {
  /** A room point to screen pixels, or null when behind the camera. */
  toScreen(p: Vec3, out: Vec2): Vec2 | null
  /** A screen point onto the vertical plane at depth z (x across, y up). */
  toPlane(screen: Vec2, z: number): Vec2 | null
  /** A screen point onto the tray bed, in tray-local x (across) and y (= tray z, toward the viewer). */
  toTray(screen: Vec2): Vec2 | null
}

export type HeroMode = 'stand' | 'travel' | 'grab' | 'fly' | 'land' | 'tumble'
/** A tumble: a hop toward the child out of the build, the roll down in front of it, a giggle on the rug, and a hop back in once all is still. */
export type TumblePhase = 'out' | 'roll' | 'sit' | 'back'
export type WatcherMode = 'idle' | 'walk' | 'react' | 'cheer'
export type KiteMode = 'perched' | 'flying' | 'drifting'

export type Hero = {
  mode: HeroMode
  since: number
  x: number
  y: number
  z: number
  on: number | null
  facing: number
  /** Swing on the kite string while flying, radians. */
  swing: number
  /** Arms up toward the kite, 0..1. */
  reach: number
  /** The current route segment kind and phase, for the gait. */
  segment: RoutePose
  /** Tumble spin, radians. */
  spin: number
  tumble: TumblePhase
  /** When the tumble's current phase began. */
  tumbleSince: number
  /** How high she bounces over the ground she is headed for, hopping back into the build. */
  hop: number
  boopAt: number
  /** Where the doll is looking. */
  look: Vec3
}

export type Watcher = {
  mode: WatcherMode
  since: number
  x: number
  target: number
  facing: number
  boopAt: number
  look: Vec3
}

export type Kite = {
  mode: KiteMode
  since: number
  position: Vec3
  velocity: Vec3
  tilt: number
  /** Pitch back against whatever it rests on, so its tail hangs over the front edge. */
  lean: number
  flutterAt: number
}

export type Held = { id: number; x: number; y: number; angle: number; landY: number }

export type GuidanceView = {
  glow: number
  hint: Hint | null
  /** The ghost hand in screen pixels during a demonstration. */
  hand: HandPose | null
  peek: number | null
  buildAt: Vec2
  /** The piece the search found helps at `buildAt` (from the tray or left over), or -1 for the ghost hand's usual pick. */
  buildWith: number
}

export type ControllerDeps = { save: (state: KiteState) => void; sound?: KiteSound }

const LIFT = 1.1
const FOLLOW = 18
const TURN_SECONDS = 0.26
/** How hard a tapped piece that holds another up knocks (as an impact speed): softly, as it stays put. */
const HELD_DOWN_TOK = 1.2
const GRAB_SECONDS = 0.8
const FLIGHT_SECONDS = 7
/** The kite's highest point in flight; any higher and its top leaves the picture. */
const FLIGHT_CEILING = 8.0
/** A dangling doll swings, but never so far that it lies flat. */
const MAX_SWING = 0.5
const LAND_SECONDS = 0.9
const DRIFT_SECONDS = 3.4
/**
 * How far a tumbling doll first hops toward the child: past the front of the
 * deepest block (1 deep) by her own round (head and hair 0.41) and a little,
 * so she rolls down in front of the build and never through it.
 */
export const TUMBLE_OUT = 1.0
const OUT_SECONDS = 0.18
const SIT_SECONDS = 0.9
/** How fast she scoots across the front of the build to the rug spot she hops back into. */
const SCOOT_SPEED = 3
const BACK_SECONDS = 0.3
/** With the rug full she hops back onto a block no higher than a cube, springing up in front of it first. */
const BACK_UP = 1.05
const RISE_SECONDS = 0.28
/** Bare rug wins over a block top unless it is this much further away. */
const BACK_UP_COST = 2
const BACK_LOOK_SECONDS = 0.3
const LAND_OUT_SECONDS = 0.6
const OUT_BUMP = 0.12
const BACK_BUMP = 0.18
/** The kite's flying line, from the bridle down to the middle of the spool (shared with the view). */
export const KITE_LINE = 1.9
/** Where the line is tied on, from the kite's middle (shared with the view). */
export const KITE_BRIDLE = { y: 0.2, z: 0.06 }
/** From the bridle to the dangling doll's middle, for how fast she swings. */
const SWING_LENGTH = 2.73
/** How far the doll's support may shift (units, radians) before the doll loses its footing. */
const SUPPORT_SHIFT = 0.14
const SUPPORT_TURN = 0.12
const HIT_PAD = 0.32
/** Hard knocks (a decaying count, four a second) that make a crash the watchers flinch at: three close together. A block set down, even across two others, makes one or two. */
const CRASH_KNOCKS = 2.5
const HINT_BATCH = 3
/** Space the ghost hand leaves between a block and the one it sets down flush beside it. */
const FLUSH_GAP = 0.01
/** A leftover piece the ghost hand moves goes at least this far, or it is no move at all. */
const LEFTOVER_MOVE = 1.2
/** A piece whose top is this close under another's underside is carrying it. */
const CARRY_TOUCH = 0.1
/** How long everyone keeps watching a piece the child has just let go of. */
const NOTICE_SECONDS = 1.4
/** A watcher closer than this to the doll while she is after the kite is where her reach ends, so he steps aside. */
const GIVE_ROOM = 2.5
/** Floor spots the kite weighs, nearest first, before it settles for the nearest; each costs one route search, once per flight. */
const LANDING_TRIES = 6
/** A block taller than this in front of a watcher hides more than half of him. */
const HIDDEN_BY = 1.1
const HIDE_SAMPLES = [-0.4, 0, 0.4]
const ASIDE_STEPS = 8

/** A dragged piece leans into the drag, this much per unit a second of sideways speed, up to MAX_LEAN, easing at LEAN_RATE. */
const LEAN = 0.025
const MAX_LEAN = 0.16
const LEAN_RATE = 10

/**
 * `angle` is the piece's turn when it was picked up; `lean` rides on top of it
 * and is let go with it. `free` is where the finger would hold it if Pip were
 * not in the way, and `raised` says she is lifting it higher than that.
 */
type Drag = { pointer: number; id: number; offset: Vec2; goal: Vec2; at: Vec2; lastX: number; vx: number; angle: number; lean: number; free: number; raised: boolean }
/** A piece let go of near Pip: it stays in the air while she is under it, then sets down to `y` and falls from there. */
type Pending = { id: number; since: number; y: number }
/** Longest a let-go piece waits over Pip; she is always out well before this. */
const PENDING_SECONDS = 2.5
/** Close enough to the height a waiting piece sets down to. */
const SET_DOWN = 0.02
/** How far Pip's outline slopes out at her feet for a dragged piece, which rides up her sides instead of jumping over her. */
const PIP_SLOPE = 0.8
/** Room kept between Pip's outline and a piece she hops away from. */
const DODGE_ROOM = 0.02
/** From Pip's middle to the near side of a piece tapped out of the tray beside her: past her hands hanging at her sides. */
const HOP_OUT_GAP = 0.62
const NOTHING: readonly Placed[] = []
/** `y` is the piece's height when the turn began. */
type Turn = { id: number; start: number; from: number; to: number; y: number }
/** A piece the ghost hand could carry: from the tray, or `loose` from where it lies at `x`. */
type HintPiece = { id: number; shape: PieceShape; loose: boolean; x: number }
/**
 * `from` is where the doll will stand when the search is done: she may be
 * partway up a climb while it runs. `shapes` are the pieces worth trying,
 * the one the ghost hand would pick first leading, then the other tray
 * shapes, then pieces left over from an earlier build; the next is tried only
 * when nothing the current one could do gives her a way on. `fallback` is
 * the spot nearest the kite where a piece at least sits still, off Pip, for
 * when no piece helps.
 */
type HintSearch = {
  from: Spot
  shapes: HintPiece[]
  shape: number
  candidates: number[]
  index: number
  best: Vec2
  bestWith: number
  bestScore: number
  fallback: Vec2 | null
  fallbackWith: number
}

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function catmull(points: readonly Vec3[], u: number, out: Vec3): Vec3 {
  const n = points.length - 1
  const k = Math.min(n - 1, Math.max(0, Math.floor(u)))
  const t = Math.min(1, Math.max(0, u - k))
  const p0 = points[Math.max(0, k - 1)]
  const p1 = points[k]
  const p2 = points[k + 1]
  const p3 = points[Math.min(n, k + 2)]
  const t2 = t * t
  const t3 = t2 * t
  const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
  out.x = f(p0.x, p1.x, p2.x, p3.x)
  out.y = f(p0.y, p1.y, p2.y, p3.y)
  out.z = f(p0.z, p1.z, p2.z, p3.z)
  return out
}

function smooth(t: number): number {
  const k = Math.min(1, Math.max(0, t))
  return k * k * (3 - 2 * k)
}

/** How far below its centre of mass a piece's lowest point is, lying as it comes out of the tray. */
function baseDepth(shape: PieceShape): number {
  let lowest = 0
  for (const part of shape.parts) for (const p of part) lowest = Math.min(lowest, p.y)
  return -lowest
}

/** Whether a piece `halfWidth` either side of its centre, set down at `x` with its base at `base`, stays put: its centre must be over what holds it up, with a margin, or it tips off. */
function balanced(placed: readonly Placed[], x: number, base: number, halfWidth: number): boolean {
  if (base < 0.05) return true
  let left = Infinity
  let right = -Infinity
  for (let i = 0; i <= 8; i++) {
    const at = x - halfWidth * 0.9 + (halfWidth * 1.8 * i) / 8
    if (skylineAt(placed, at) > base - 0.08) {
      left = Math.min(left, at)
      right = Math.max(right, at)
    }
  }
  return x > left + 0.2 && x < right - 0.2
}

/** Whether another placed piece rests on `piece`: moving it would bring that one down. */
function carries(placed: readonly Placed[], piece: Placed): boolean {
  const [lo, hi] = extentOf(piece)
  for (const other of placed) {
    if (other === piece) continue
    const [olo, ohi] = extentOf(other)
    const a = Math.max(lo, olo)
    const b = Math.min(hi, ohi)
    for (let i = 0; i <= 4 && a < b; i++) {
      const at = a + ((b - a) * i) / 4
      let top = -Infinity
      for (const part of piece.parts) {
        const span = spanAt(part, at)
        if (span && span[1] > top) top = span[1]
      }
      let bottom = Infinity
      for (const part of other.parts) {
        const span = spanAt(part, at)
        if (span && span[0] < bottom) bottom = span[0]
      }
      if (Math.abs(bottom - top) < CARRY_TOUCH) return true
    }
  }
  return false
}

function extentOf(piece: Placed): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (const part of piece.parts) for (const p of part) {
    lo = Math.min(lo, p.x)
    hi = Math.max(hi, p.x)
  }
  return [lo, hi]
}

export class KiteController {
  readonly physics = new PlayPhysics()
  readonly state: KiteState
  t = 0
  /** Bumped whenever something the React tree renders (not per-frame poses) changes. */
  version = 0
  readonly trayed: boolean[]
  /** When each piece last left the tray (for the pop-in), -Infinity if never. */
  readonly popAt: number[]
  readonly hero: Hero
  readonly kite: Kite
  readonly watchers: Watcher[]
  readonly held: Held[] = []
  stacks: Stack[] = []
  /** Index into `stacks` for each piece, -1 when loose or moving. */
  readonly pieceStack: number[]
  stackKick: number[] = []
  /** When something last toppled or crashed loudly enough for everyone to react. */
  toppleAt = -Infinity
  readonly guidance: GuidanceView = { glow: 0, hint: null, hand: null, peek: null, buildAt: { x: 0, y: 0 }, buildWith: -1 }

  private readonly deps: ControllerDeps
  private readonly sound: KiteSound | null
  private readonly saves: SaveCadence
  private readonly gestures: Gestures
  private readonly clock: HintClock
  private projector: Projector | null = null
  private readonly drags: Drag[] = []
  private readonly pending: Pending[] = []
  private readonly heldPool: Held[] = PIECES.map(() => ({ id: 0, x: 0, y: 0, angle: 0, landY: 0 }))
  private readonly pipPlaced: Placed = { id: -1, parts: [[0, 1, 2, 3].map(() => ({ x: 0, y: 0 }))] }
  private readonly pipList: readonly Placed[] = [this.pipPlaced]
  private readonly spanOut = { lo: 0, hi: 0, bottom: 0 }
  private landing = 0
  private liftX = 0
  /** The piece that last tipped under the doll: she won't stand on it again until the child moves something. */
  private wobbly: number | null = null
  private hintChecked = false
  private turn: Turn | null = null
  private route: Segment[] = []
  private routeStart = 0
  private planReaches = false
  private wantPlan = true
  private tumbleFrom: Vec2 = { x: 0, y: 0 }
  private tumbleTo: Spot = { x: 0, y: 0, on: null }
  /** Whether the spot she is scooting to was looked at again before she hops in. */
  private backChecked = false
  /** No sooner than this does a doll sat out in front look again for somewhere to hop back into. */
  private backLookAt = 0
  /** How high the tumble's hop out and hop back in bob her: no higher than the wood over her allows. */
  private outBump = OUT_BUMP
  private backBump = BACK_BUMP
  /** Whether the kite sets her down out in front of the build, and how far it has swung out toward there. */
  private landOut = false
  private landOutK = 0
  private flightPath: Vec3[] = []
  private driftFrom: Vec3 = { x: 0, y: 0, z: 0 }
  private readonly kitePrev: Vec3 = { x: 0, y: 0, z: 0 }
  private swingVelocity = 0
  private readonly rng = lcg(7)
  private readonly nextWander: number[]
  private lastHop = 0
  private lastWatcherStep: number[] = [0, 0]
  private readonly partCache: Vec2[][][] = PIECES.map((p) => SHAPES[p.kind].parts.map(() => []))
  private readonly placedCache: Placed[] = PIECES.map((_, id) => ({ id, parts: this.partCache[id] }))
  private readonly placed: Placed[] = []
  private readonly poseScratch: Pose = { x: 0, y: 0, angle: 0 }
  private readonly screenA: Vec2 = { x: 0, y: 0 }
  private readonly screenB: Vec2 = { x: 0, y: 0 }
  private readonly hand: HandPose = { at: { x: 0, y: 0 }, press: 0, opacity: 0, carry: 0 }
  private demoFrom: Vec2 | null = null
  private demoTo: Vec2 | null = null
  private readonly demoFromWorld: Vec3 = { x: 0, y: 0, z: 0 }
  private readonly demoToWorld: Vec3 = { x: 0, y: 0, z: 0 }
  private demoProgress = 0
  private demoActive = false
  private hintSearch: HintSearch | null = null
  private calmSince = 0
  private recentKnocks = 0
  private running = true
  private readonly supportRef = new Float64Array(PIECES.length * 3)
  private dropId = -1
  private dropAt = -Infinity

  constructor(state: KiteState, deps: ControllerDeps) {
    this.state = { v: state.v, perch: state.perch, pieces: state.pieces.map((p) => ({ ...p })) }
    this.deps = deps
    this.sound = deps.sound ?? null
    this.saves = new SaveCadence(() => this.deps.save(this.snapshot()))
    this.gestures = new Gestures((at) => this.hit(at))
    this.clock = new HintClock(0)
    this.trayed = PIECES.map(() => true)
    this.popAt = PIECES.map(() => -Infinity)
    this.pieceStack = PIECES.map(() => -1)
    this.restore(state.pieces)

    const perch = PERCHES[this.state.perch]
    const side = perch.x > 0 ? -1 : 1
    const startX = clampX(perch.x + side * 2.3, 0.5)
    this.hero = {
      mode: 'stand',
      since: 0,
      x: startX,
      y: 0,
      z: 0,
      on: null,
      facing: -side,
      swing: 0,
      reach: 0,
      segment: { x: startX, y: 0, facing: -side, kind: null, phase: 0, hops: 1, index: 0, done: true },
      spin: 0,
      tumble: 'out',
      tumbleSince: 0,
      hop: 0,
      boopAt: -Infinity,
      look: { x: perch.kite.x, y: perch.kite.y, z: perch.kite.z },
    }
    this.placeHeroOnFloor()
    this.kite = {
      mode: 'perched',
      since: 0,
      position: { x: perch.kite.x, y: perch.kite.y, z: perch.kite.z },
      velocity: { x: 0, y: 0, z: 0 },
      tilt: perch.kite.tilt,
      lean: perch.kite.lean,
      flutterAt: -Infinity,
    }
    this.watchers = WATCHERS.map((home, i) => ({
      mode: 'idle' as WatcherMode,
      since: 0,
      x: home.home,
      target: home.home,
      facing: i === 0 ? 1 : -1,
      boopAt: -Infinity,
      look: { x: this.hero.x, y: 1.4, z: 0 },
    }))
    this.nextWander = [6 + this.rng() * 4, 2.5 + this.rng() * 2]
    this.startHintSearch()
  }

  // ---- setup -------------------------------------------------------------

  private restore(pieces: readonly SavedPiece[]): void {
    const onPlane = pieces.filter((p): p is Extract<SavedPiece, { tray: false }> => !p.tray)
    const lowest = (p: Extract<SavedPiece, { tray: false }>) => {
      const parts = transformInto(pieceShape(p.id).outline, { x: p.x, y: p.y, angle: p.a }, [])
      return Math.min(...parts.map((q) => q.y))
    }
    onPlane.sort((a, b) => lowest(a) - lowest(b))
    for (const piece of onPlane) {
      const shape = pieceShape(piece.id)
      const rest = restHeight(shape, piece.a, piece.x, this.placedList()) - 0.058
      this.physics.add(piece.id, { x: piece.x, y: Math.max(piece.y, rest), angle: piece.a })
      this.trayed[piece.id] = false
    }
  }

  private placeHeroOnFloor(): void {
    const spots = standableSpots(this.placedList()).filter((s) => s.y === 0)
    if (!spots.length) return
    let best = spots[0]
    for (const s of spots) if (Math.abs(s.x - this.hero.x) < Math.abs(best.x - this.hero.x)) best = s
    this.hero.x = best.x
    this.hero.y = 0
    this.hero.on = null
  }

  setProjector(projector: Projector): void {
    this.projector = projector
  }

  setRunning(running: boolean): void {
    this.running = running
    this.sound?.setActive(running)
    if (!running) {
      for (const drag of [...this.drags]) this.drop(drag)
      this.gestures.reset()
      this.sound?.wind(false)
      this.saves.settle(this.t)
    } else if (this.kite.mode === 'flying') this.sound?.wind(true)
  }

  dispose(): void {
    this.saves.settle(this.t)
    this.sound?.dispose()
  }

  // ---- state -------------------------------------------------------------

  snapshot(): KiteState {
    const pieces: SavedPiece[] = PIECES.map((p) => {
      if (this.trayed[p.id] || !this.physics.has(p.id)) return { id: p.id, tray: true }
      const pose = this.physics.pose(p.id, this.poseScratch)
      return { id: p.id, tray: false, x: pose.x, y: pose.y, a: pose.angle }
    })
    return serialize({ v: this.state.v, perch: this.state.perch, pieces })
  }

  /** Pieces on the plane (not held, not turning), with world parts, into a reused list. */
  placedList(exclude = -1): Placed[] {
    const list = this.placed
    list.length = 0
    for (let id = 0; id < PIECES.length; id++) {
      if (id === exclude || this.trayed[id] || !this.physics.has(id) || this.physics.isHeld(id)) continue
      list.push(this.placedOf(id))
    }
    return list
  }

  /** Piece `id` with world parts where physics has it now (reused per piece). */
  private placedOf(id: number): Placed {
    const shape = pieceShape(id)
    const pose = this.physics.pose(id, this.poseScratch)
    const cache = this.partCache[id]
    for (let k = 0; k < shape.parts.length; k++) transformInto(shape.parts[k], pose, cache[k])
    return this.placedCache[id]
  }

  /** How high the ghost hand's piece `id`, carried upright near (x, y), is drawn: never lower than it would rest there on the rug, the build or over Pip. */
  ghostY(id: number, x: number, y: number): number {
    const shape = pieceShape(id)
    return Math.max(y, restHeight(shape, 0, x, this.placedList(id)), restHeight(shape, 0, x, this.pipOutline(PIP_SLOPE)))
  }

  /** Pip's outline as one more block, its sides sloping out by `slope` at her feet; nothing while she is up with the kite or out in front of the build. The list is reused. */
  pipOutline(slope = 0): readonly Placed[] {
    const hero = this.hero
    if (hero.mode === 'fly' || hero.z >= TUMBLE_OUT) return NOTHING
    const [a, b, c, d] = this.pipPlaced.parts[0]
    a.x = hero.x - PIP_CLEAR.half - slope
    b.x = hero.x + PIP_CLEAR.half + slope
    c.x = hero.x + PIP_CLEAR.half
    d.x = hero.x - PIP_CLEAR.half
    a.y = b.y = hero.y
    c.y = d.y = hero.y + PIP_CLEAR.top
    return this.pipList
  }

  /**
   * Where piece `id`, turned `angle` and drawn at `scale`, rides near `x`:
   * clear of the placed pieces and of Pip (her outline sloping out by
   * `slope`). It rides at `liftX`, which is `x` or a sliver aside to sit flush
   * with a neighbour instead of falling onto its corner; where it cannot slide
   * (a wall, or another neighbour), it rides over that corner. Pieces waiting
   * in the air to fall count as placed, so it is never set down inside one.
   * Where it would come to rest once let go, over the pieces alone rather than
   * Pip, is left in `landing`.
   */
  private lift(id: number, angle: number, x: number, scale: number, slope = 0): number {
    const shape = pieceShape(id)
    const placed = this.placedList(id)
    for (const p of this.pending) if (p.id !== id && this.physics.has(p.id)) placed.push(this.placedOf(p.id))
    const slid = slideClear(shape, angle, x, placed, scale)
    const reach = Math.abs(Math.cos(angle)) * shape.half.x + Math.abs(Math.sin(angle)) * shape.half.y
    this.liftX = clampX(slid, reach) === slid ? slid : x
    this.landing = restHeight(shape, angle, this.liftX, placed, scale)
    if (restSliver.left > 0 || restSliver.right > 0) this.landing = restSliver.over
    return Math.max(this.landing, restHeight(shape, angle, this.liftX, this.pipOutline(slope), scale))
  }

  /** How large piece `id` is drawn while held (bigger in the hand, and still popping in if it just left the tray). */
  private heldScale(id: number): number {
    return HELD_SCALE * popScale(this.t - this.popAt[id])
  }

  /** How far piece `id` reaches across the plane and its lowest point, where physics has it now (the result is reused). */
  private pieceSpan(id: number): { lo: number; hi: number; bottom: number } {
    const pose = this.physics.pose(id, this.poseScratch)
    const c = Math.cos(pose.angle)
    const s = Math.sin(pose.angle)
    const out = this.spanOut
    out.lo = Infinity
    out.hi = -Infinity
    out.bottom = Infinity
    for (const part of pieceShape(id).parts) {
      for (const p of part) {
        const x = pose.x + p.x * c - p.y * s
        const y = pose.y + p.x * s + p.y * c
        if (x < out.lo) out.lo = x
        if (x > out.hi) out.hi = x
        if (y < out.bottom) out.bottom = y
      }
    }
    return out
  }

  /** Whether piece `id`, let go of now, would come down on Pip rather than on a block above her head (never while she is up with the kite or out in front of the build). */
  private overPip(id: number): boolean {
    const hero = this.hero
    if (hero.mode === 'fly' || hero.z >= TUMBLE_OUT || !this.physics.has(id)) return false
    const span = this.pieceSpan(id)
    if (span.hi <= hero.x - PIP_CLEAR.half || span.lo >= hero.x + PIP_CLEAR.half || span.bottom < hero.y + 0.05) return false
    const pose = this.physics.pose(id, this.poseScratch)
    const below = pose.y - span.bottom
    return restHeight(pieceShape(id), pose.angle, pose.x, this.placedList(id)) - below < hero.y + PIP_CLEAR.top
  }

  /**
   * Let a held piece fall from where it would be without Pip, height `y`. Over
   * her, it waits in the air while she hops out from under it; lifted over
   * her, it first sets down to `y`.
   */
  private letGo(id: number, vx: number, y: number): void {
    const high = this.physics.pose(id, this.poseScratch).y > y + SET_DOWN
    if (high || this.overPip(id)) this.pending.push({ id, since: this.t, y })
    else this.physics.release(id, vx)
    this.dodgeIfUnder(id)
  }

  private updatePending(dt: number): void {
    const k = 1 - Math.exp(-dt * FOLLOW)
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i]
      if (!this.physics.has(p.id)) {
        this.pending.splice(i, 1)
        continue
      }
      const late = this.t - p.since >= PENDING_SECONDS
      if (!late && this.overPip(p.id)) {
        if (this.hero.mode === 'stand') this.dodgeIfUnder(p.id)
        continue
      }
      const pose = this.physics.pose(p.id, this.poseScratch)
      if (!late && pose.y > p.y + SET_DOWN) {
        this.physics.moveHeld(p.id, pose.x, pose.y + (p.y - pose.y) * k, pose.angle)
        continue
      }
      this.pending.splice(i, 1)
      this.physics.release(p.id, 0)
      this.noticeDrop(p.id)
      this.saves.change(this.t, true)
    }
  }

  /** Take piece `id` back from those waiting to fall, for a finger that catches it; false if it was not waiting. */
  private unpend(id: number): boolean {
    const index = this.pending.findIndex((p) => p.id === id)
    if (index < 0) return false
    this.pending.splice(index, 1)
    return true
  }

  /** Whether floor spot `x` leaves Pip out from under every piece waiting to fall. */
  private clearOfPending(x: number): boolean {
    for (const p of this.pending) {
      if (!this.physics.has(p.id)) continue
      const span = this.pieceSpan(p.id)
      if (x > span.lo - PIP_CLEAR.half - DODGE_ROOM && x < span.hi + PIP_CLEAR.half + DODGE_ROOM) return false
    }
    return true
  }

  get kiteGoal(): { x: number; grabY: number } {
    return kiteTarget(this.state.perch)
  }

  isHeld(id: number): boolean {
    return this.physics.isHeld(id)
  }

  /** Seconds the playroom has been untouched and entirely still; the view renders at half rate after a while. */
  restingFor(): number {
    if (this.hero.mode !== 'stand' || this.kite.mode !== 'perched' || this.drags.length > 0 || this.pending.length > 0 || this.turn || !this.physics.isResting || this.guidance.hand) return 0
    return Math.min(this.clock.idle(this.t), this.t - this.calmSince)
  }

  // ---- input -------------------------------------------------------------

  private hit(screen: Vec2): Target {
    const projector = this.projector
    if (!projector) return { kind: 'none' }
    const onTray = projector.toTray(screen)
    if (onTray && Math.abs(onTray.x) <= TRAY.halfX + 0.3 && Math.abs(onTray.y) <= TRAY.halfZ + 0.3) {
      let best = -1
      let bestDistance = 0.45
      for (const slot of TRAY_SLOTS) {
        if (!this.trayed[slot.id]) continue
        const dx = Math.max(0, Math.abs(onTray.x - slot.x) - slot.halfX)
        const dz = Math.max(0, Math.abs(onTray.y - slot.z) - slot.halfZ)
        const distance = Math.hypot(dx, dz)
        if (distance < bestDistance) {
          best = slot.id
          bestDistance = distance
        }
      }
      return best >= 0 ? { kind: 'tray', id: best } : { kind: 'none' }
    }
    const p = projector.toPlane(screen, 0.35)
    if (p) {
      let best = -1
      let bestDistance = HIT_PAD
      for (const piece of this.placedList()) {
        const distance = distanceToPiece(piece, p)
        if (distance < bestDistance) {
          best = piece.id
          bestDistance = distance
        }
      }
      for (const waiting of this.pending) {
        const distance = distanceToPiece(this.placedOf(waiting.id), p)
        if (distance < bestDistance) {
          best = waiting.id
          bestDistance = distance
        }
      }
      if (best >= 0) return { kind: 'piece', id: best }
      const hero = this.hero
      if ((hero.mode === 'stand' || hero.mode === 'travel') && Math.abs(p.x - hero.x) < 0.55 && p.y > hero.y - 0.2 && p.y < hero.y + 2.1) return { kind: 'doll' }
    }
    if (this.kite.mode === 'perched') {
      const at = projector.toScreen(this.kite.position, this.screenA)
      if (at && Math.hypot(at.x - screen.x, at.y - screen.y) < 70) return { kind: 'kite' }
    }
    for (let i = 0; i < this.watchers.length; i++) {
      const q = projector.toPlane(screen, WATCHERS[i].z)
      if (q && Math.abs(q.x - this.watchers[i].x) < 0.6 && q.y > -0.1 && q.y < 2.3) return { kind: 'watcher', index: i }
    }
    return { kind: 'none' }
  }

  pointerDown(pointer: number, at: Vec2, time: number): void {
    this.sound?.unlock()
    this.handle(this.gestures.down(pointer, at, time))
  }

  pointerMove(pointer: number, at: Vec2): void {
    this.handle(this.gestures.move(pointer, at))
  }

  /** Unlocks on the way up too: for a finger, WebKit and Chrome count only the lift as a user gesture. */
  pointerUp(pointer: number, at: Vec2, time: number): void {
    this.sound?.unlock()
    this.handle(this.gestures.up(pointer, at, time))
  }

  pointerCancel(pointer: number): void {
    this.handle(this.gestures.cancel(pointer))
  }

  private handle(intents: Intent[]): void {
    for (const intent of intents) {
      switch (intent.type) {
        case 'press':
          this.clock.touch(this.t)
          this.clearDemo()
          break
        case 'tap':
          this.onTap(intent.target)
          break
        case 'dragStart':
          this.onDragStart(intent.pointer, intent.target, intent.at)
          break
        case 'dragMove':
          this.onDragMove(intent.pointer, intent.at)
          break
        case 'dragEnd':
          this.onDragEnd(intent.pointer, intent.at)
          break
        case 'cancelAll':
          for (const drag of [...this.drags]) this.drop(drag)
          break
        default: {
          const never: never = intent
          throw new Error(`unknown intent ${String(never)}`)
        }
      }
    }
  }

  private onTap(target: Target): void {
    switch (target.kind) {
      case 'piece':
        this.startTurn(target.id)
        break
      case 'tray':
        this.hopOutOfTray(target.id)
        break
      case 'doll':
        this.hero.boopAt = this.t
        this.sound?.boop(0)
        break
      case 'watcher':
        this.watchers[target.index].boopAt = this.t
        this.sound?.boop((target.index + 1) as Doll)
        break
      case 'kite':
        this.kite.flutterAt = this.t
        this.sound?.flutter()
        break
      case 'none':
        break
      default: {
        const never: never = target
        throw new Error(`unknown target ${String(never)}`)
      }
    }
  }

  private planeAt(screen: Vec2): Vec2 | null {
    return this.projector?.toPlane(screen, 0.35) ?? null
  }

  private onDragStart(pointer: number, target: Target, at: Vec2): void {
    const p = this.planeAt(at)
    if (!p) return
    if (target.kind === 'tray') {
      const id = target.id
      const shape = pieceShape(id)
      const x = clampX(p.x, shape.half.x)
      this.trayed[id] = false
      this.popAt[id] = this.t
      const y = this.lift(id, 0, x, this.heldScale(id), PIP_SLOPE)
      this.physics.add(id, { x: this.liftX, y, angle: 0 })
      this.physics.hold(id)
      this.drags.push({ pointer, id, offset: { x: 0, y: 0 }, goal: { x, y: 0 }, at: { x, y }, lastX: x, vx: 0, angle: 0, lean: 0, free: y, raised: false })
      this.sound?.pickup()
      this.version += 1
    } else if (target.kind === 'piece') {
      const id = target.id
      if (this.physics.isHeld(id) && !this.unpend(id)) return
      if (this.turn?.id === id) this.turn = null
      const pose = this.physics.pose(id, this.poseScratch)
      this.supportLost(id)
      this.physics.hold(id)
      this.drags.push({ pointer, id, offset: { x: pose.x - p.x, y: pose.y - p.y }, goal: { x: pose.x, y: pose.y }, at: { x: pose.x, y: pose.y }, lastX: pose.x, vx: 0, angle: pose.angle, lean: 0, free: pose.y, raised: false })
      this.sound?.pickup()
    } else return
    this.onDragMove(pointer, at)
    this.saves.change(this.t)
  }

  private dragOf(pointer: number): Drag | undefined {
    return this.drags.find((drag) => drag.pointer === pointer)
  }

  private removeDrag(drag: Drag): void {
    const index = this.drags.indexOf(drag)
    if (index >= 0) this.drags.splice(index, 1)
  }

  private onDragMove(pointer: number, at: Vec2): void {
    const drag = this.dragOf(pointer)
    const p = this.planeAt(at)
    if (!drag || !p) return
    drag.goal.x = p.x + drag.offset.x
    drag.goal.y = p.y + drag.offset.y
    this.saves.change(this.t)
  }

  private overTray(screen: Vec2): boolean {
    const t = this.projector?.toTray(screen)
    return !!t && Math.abs(t.x) <= TRAY.halfX && Math.abs(t.y) <= TRAY.halfZ + 0.2
  }

  private onDragEnd(pointer: number, at: Vec2): void {
    const drag = this.dragOf(pointer)
    if (!drag) return
    if (this.overTray(at)) {
      this.removeDrag(drag)
      this.putAway(drag.id)
      return
    }
    this.drop(drag)
  }

  private drop(drag: Drag): void {
    this.removeDrag(drag)
    this.letGo(drag.id, drag.vx * 0.35, drag.raised ? Math.min(drag.at.y, drag.free) : drag.at.y)
    this.noticeDrop(drag.id)
    this.saves.change(this.t, true)
  }

  private noticeDrop(id: number): void {
    this.dropId = id
    this.dropAt = this.t
    this.wobbly = null
  }

  /** The piece the child just let go of, while everyone is still watching it land, into `out`. */
  private droppedPiece(out: Vec3): Vec3 | null {
    const id = this.dropId
    if (id < 0 || this.t - this.dropAt > NOTICE_SECONDS || this.trayed[id] || !this.physics.has(id) || this.physics.isHeld(id)) return null
    const pose = this.physics.pose(id, this.poseScratch)
    out.x = pose.x
    out.y = pose.y
    out.z = 0
    return out
  }

  private putAway(id: number): void {
    this.physics.remove(id)
    this.trayed[id] = true
    this.wobbly = null
    this.sound?.putAway()
    this.saves.change(this.t, true)
    this.version += 1
  }

  /**
   * A tapped piece turns a quarter where it lies. One holding another up stays
   * put with a soft knock instead: a held piece passes through the build, so
   * what it carried would fall into it, and a tap never brings a tower down.
   */
  private startTurn(id: number): void {
    if (this.physics.isHeld(id) || this.turn) return
    const placed = this.placedList()
    const piece = placed.find((p) => p.id === id)
    if (piece && carries(placed, piece)) {
      this.sound?.tok(PIECES[id].kind, HELD_DOWN_TOK)
      return
    }
    const pose = this.physics.pose(id, this.poseScratch)
    this.supportLost(id)
    this.physics.hold(id)
    this.turn = { id, start: this.t, from: pose.angle, to: pose.angle + Math.PI / 2, y: pose.y }
    this.wobbly = null
    this.sound?.turn()
  }

  private hopOutOfTray(id: number): void {
    const shape = pieceShape(id)
    const goal = this.kiteGoal
    const hero = this.hero
    const dir = Math.sign(goal.x - hero.x) || 1
    // Beside her on the kite's side; against a wall, the other side; with no room either side, over her (and she hops out from under it).
    const reach = shape.half.x + HOP_OUT_GAP
    let x = clampX(hero.x + dir * reach, shape.half.x)
    if (Math.abs(x - hero.x) < reach) {
      const other = clampX(hero.x - dir * reach, shape.half.x)
      if (Math.abs(other - hero.x) > Math.abs(x - hero.x)) x = other
    }
    this.trayed[id] = false
    this.popAt[id] = this.t
    const y = this.lift(id, 0, x, 1) + 0.9
    this.physics.add(id, { x: this.liftX, y, angle: 0 })
    this.physics.hold(id)
    this.letGo(id, 0, this.landing + 0.9)
    this.noticeDrop(id)
    this.sound?.pickup()
    this.saves.change(this.t, true)
    this.version += 1
  }

  /**
   * A loose piece knocked hard into the doll (it bounced off her). Standing
   * still, she startles where she is and thinks again once it settles; on the
   * move, she tumbles out of its way, unhurt, rather than walk on into it.
   */
  private knocked(): void {
    const hero = this.hero
    if (hero.mode === 'stand' || hero.mode === 'grab') {
      hero.boopAt = this.t
      this.wantPlan = true
    } else if (hero.mode === 'travel' || hero.mode === 'land') this.startTumble()
  }

  /** The piece the doll stands on is being moved: the doll tumbles off, unhurt. */
  private supportLost(id: number): void {
    if (this.hero.on === id && (this.hero.mode === 'stand' || this.hero.mode === 'travel' || this.hero.mode === 'grab')) this.startTumble()
  }

  /** A piece is about to land on the doll: she hops aside, her whole outline out from under it, if she can, otherwise tumbles clear. */
  private dodgeIfUnder(id: number): void {
    const hero = this.hero
    if (hero.mode !== 'stand' && hero.mode !== 'travel') return
    if (!this.physics.has(id)) return
    const span = this.pieceSpan(id)
    const lo = span.lo - PIP_CLEAR.half - DODGE_ROOM
    const hi = span.hi + PIP_CLEAR.half + DODGE_ROOM
    if (this.stopShortOf(lo, hi) || !this.overPip(id)) return
    const placed = this.placedList(id)
    const spots = standableSpots(placed, this.wobbly).filter((s) => (s.x < lo || s.x > hi) && Math.abs(s.y - hero.y) < 0.45 && Math.abs(s.x - hero.x) < 2.6)
    // Her head clear all the way there, of the build and of the piece waiting over her: a hop if it fits, else a walk.
    const around = [...placed, this.placedOf(id)]
    const from: Spot = { x: hero.x, y: hero.y, on: hero.on }
    let best: Spot | null = null
    let kind: MoveKind = 'hop'
    for (const s of spots) {
      if (best && Math.abs(s.x - hero.x) >= Math.abs(best.x - hero.x)) continue
      const way: MoveKind | null = headClearAlong(around, 'hop', from, s) ? 'hop' : headClearAlong(around, 'walk', from, s) ? 'walk' : null
      if (way) {
        best = s
        kind = way
      }
    }
    if (!best) {
      this.startTumble()
      return
    }
    this.startRoute(buildRoute({ x: hero.x, y: hero.y }, [{ kind, to: best }]), false)
  }

  /**
   * A piece coming down across the rest of a walk on the rug: the doll stops
   * short and watches it land, then plans again from there (often up it),
   * rather than walking through it and tumbling out.
   */
  private stopShortOf(lo: number, hi: number): boolean {
    const hero = this.hero
    if (hero.mode !== 'travel' || hero.segment.kind !== 'walk' || hero.y > 0.01 || (hero.x >= lo && hero.x <= hi)) return false
    const walk = this.route[hero.segment.index]
    if (!walk || walk.to.y > 0.01) return false
    const end = walk.to.x
    const ahead = end > hero.x ? lo <= end && hi >= hero.x : hi >= end && lo <= hero.x
    if (!ahead) return false
    this.route = []
    hero.on = null
    hero.facing = Math.sign(lo + hi - 2 * hero.x) || hero.facing
    this.setHero('stand')
    this.wantPlan = true
    return true
  }

  // ---- frame -------------------------------------------------------------

  step(dt: number): void {
    if (!this.running || !(dt > 0)) return
    this.t += dt
    const t = this.t
    this.updateHeld(dt)
    this.updateTurn()
    this.updatePending(dt)
    const hero = this.hero
    const stepping = hero.mode === 'travel' ? this.route[hero.segment.index] : undefined
    const from = stepping && hero.segment.index > 0 ? this.route[hero.segment.index - 1].on : hero.on
    this.physics.setDoll(hero.x, hero.y, hero.mode !== 'fly' && hero.z < TUMBLE_OUT, from, stepping ? stepping.on : null)
    const report = this.physics.step(dt)
    if (report.dollHit >= 0) this.knocked()
    let loudest = -1
    for (let i = 0; i < report.impacts; i++) {
      const id = report.impactIds[i]
      const speed = report.impactSpeeds[i]
      if (loudest < 0 || speed > report.impactSpeeds[loudest]) loudest = i
      const stack = this.pieceStack[id]
      if (stack >= 0 && stack < this.stackKick.length) this.stackKick[stack] = Math.min(1, this.stackKick[stack] + speed * 0.12)
    }
    // Two toks started at the same instant phase against each other, so a frame is heard as its loudest knock.
    if (loudest >= 0) this.sound?.tok(PIECES[report.impactIds[loudest]].kind, report.impactSpeeds[loudest])
    this.recentKnocks = Math.max(0, this.recentKnocks + report.hardKnocks - dt * 4)
    if (this.recentKnocks > CRASH_KNOCKS) {
      this.recentKnocks = 0
      this.watchersReact()
    }
    if (report.lost >= 0) this.putAway(report.lost)
    if (report.moving) {
      this.saves.mark()
      this.calmSince = t
      if (this.stacks.length) {
        this.stacks = []
        this.pieceStack.fill(-1)
      }
    }
    if (report.settledNow) {
      this.saves.settle(t)
      this.wantPlan = true
      this.refreshStacks()
      this.startHintSearch()
    }
    for (let i = 0; i < this.stackKick.length; i++) this.stackKick[i] *= Math.exp(-dt * 2.6)
    this.updateHero(dt)
    this.updateKite(dt)
    this.updateWatchers(dt)
    this.stepHintSearch()
    this.updateGuidance()
  }

  private updateHeld(dt: number): void {
    const held = this.held
    held.length = 0
    const k = 1 - Math.exp(-dt * FOLLOW)
    for (let i = 0; i < this.drags.length; i++) {
      const drag = this.drags[i]
      const id = drag.id
      const shape = pieceShape(id)
      const x = clampX(drag.at.x + (drag.goal.x - drag.at.x) * k, shape.half.x)
      drag.vx = drag.vx * 0.7 + ((x - drag.lastX) / dt) * 0.3
      drag.lastX = x
      const lean = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, -drag.vx * LEAN))
      drag.lean += (lean - drag.lean) * Math.min(1, dt * LEAN_RATE)
      const angle = drag.angle + drag.lean
      const rest = this.lift(id, angle, x, this.heldScale(id), PIP_SLOPE)
      const goalY = Math.min(rest + LIFT, Math.max(rest, drag.goal.y))
      drag.at.y = Math.max(rest, drag.at.y + (goalY - drag.at.y) * k)
      drag.at.x = x
      drag.free = Math.min(this.landing + LIFT, Math.max(this.landing, drag.goal.y))
      drag.raised = rest > this.landing + 1e-4
      this.physics.moveHeld(id, this.liftX, drag.at.y, angle)
      const entry = this.heldPool[i]
      entry.id = id
      entry.x = this.liftX
      entry.y = drag.at.y
      entry.angle = angle
      entry.landY = this.landing - 0.06
      held.push(entry)
    }
    if (held.length) this.clock.touch(this.t)
  }

  private updateTurn(): void {
    const turn = this.turn
    if (!turn) return
    const shape = pieceShape(turn.id)
    const p = Math.min(1, (this.t - turn.start) / TURN_SECONDS)
    const angle = turn.from + (turn.to - turn.from) * smooth(p)
    const pose = this.physics.pose(turn.id, this.poseScratch)
    const x = clampX(pose.x, Math.max(shape.half.x, shape.half.y))
    const rest = this.lift(turn.id, angle, x, this.heldScale(turn.id))
    this.physics.moveHeld(turn.id, this.liftX, Math.max(pose.y, rest), angle)
    if (p >= 1) {
      this.letGo(turn.id, 0, Math.max(turn.y, this.landing))
      this.turn = null
      this.saves.change(this.t, true)
    }
  }

  private refreshStacks(): void {
    const placed = this.placedList()
    const masses = placed.map((p) => ({ id: p.id, x: this.physics.pose(p.id, this.poseScratch).x, mass: pieceShape(p.id).mass }))
    const load = this.hero.on !== null && this.hero.mode === 'stand' ? { id: this.hero.on, x: this.hero.x, weight: DOLL_WEIGHT } : null
    this.stacks = findStacks(placed, masses, load)
    this.stackKick = this.stacks.map(() => 0)
    this.pieceStack.fill(-1)
    this.stacks.forEach((stack, index) => {
      for (const id of stack.ids) this.pieceStack[id] = index
    })
  }

  // ---- hero --------------------------------------------------------------

  /** Remember where every piece is, so a support that shifts under the doll can be noticed without trusting solver jitter. */
  private recordSupports(): void {
    for (let id = 0; id < PIECES.length; id++) {
      if (!this.physics.has(id)) continue
      const pose = this.physics.pose(id, this.poseScratch)
      this.supportRef[id * 3] = pose.x
      this.supportRef[id * 3 + 1] = pose.y
      this.supportRef[id * 3 + 2] = pose.angle
    }
  }

  private supportMoved(id: number): boolean {
    if (!this.physics.has(id) || this.physics.isHeld(id) || this.trayed[id]) return true
    const pose = this.physics.pose(id, this.poseScratch)
    const turn = pose.angle - this.supportRef[id * 3 + 2]
    return (
      Math.abs(pose.x - this.supportRef[id * 3]) > SUPPORT_SHIFT ||
      Math.abs(pose.y - this.supportRef[id * 3 + 1]) > SUPPORT_SHIFT ||
      Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn))) > SUPPORT_TURN
    )
  }

  private startRoute(route: Segment[], reaches: boolean): void {
    this.recordSupports()
    this.route = route
    this.routeStart = this.t
    this.planReaches = reaches
    this.lastHop = 0
    this.setHero('travel')
    this.physics.setLoad(null)
  }

  private setHero(mode: HeroMode): void {
    this.hero.mode = mode
    this.hero.since = this.t
  }

  /** The doll hops out in front of the build and falls, unhurt, toward the nearest bare rug, never under a piece waiting to fall. */
  private startTumble(): void {
    const hero = this.hero
    this.tumbleFrom = { x: hero.x, y: hero.y }
    this.route = []
    this.tumbleTo = { x: this.backSpot(hero.x)?.x ?? hero.x, y: 0, on: null }
    this.outBump = Math.min(OUT_BUMP, headroom(this.placedList(), hero.x, hero.y))
    hero.on = null
    this.physics.setLoad(null)
    this.setHero('tumble')
    this.setTumble('out')
    this.sound?.whee()
    this.watchersReact()
  }

  /**
   * Where the doll hops back into the build, nearest `x`: bare rug, else the
   * top of a low block, out from under any piece waiting to fall. Null when
   * nowhere has room for her, and she stays sat out in front until it does.
   */
  private backSpot(x: number): Spot | null {
    let best: Spot | null = null
    let bestCost = Infinity
    for (const s of standableSpots(this.placedList())) {
      if (s.y > BACK_UP) continue
      const cost = Math.abs(s.x - x) + (s.y > 0 ? BACK_UP_COST + s.y : 0) + (this.clearOfPending(s.x) ? 0 : 100)
      if (cost < bestCost) {
        best = s
        bestCost = cost
      }
    }
    return best
  }

  private setTumble(phase: TumblePhase): void {
    this.hero.tumble = phase
    this.hero.tumbleSince = this.t
  }

  private hopBackTo(spot: Spot): void {
    this.tumbleFrom = { x: this.hero.x, y: 0 }
    this.tumbleTo = spot
    this.backBump = Math.min(BACK_BUMP, headroom(this.placedList(), spot.x, spot.y))
    this.backChecked = false
    this.setTumble('back')
  }

  private tumbleSeconds(): number {
    return 0.55 + Math.min(0.5, this.tumbleFrom.y * 0.12)
  }

  private updateTumble(): void {
    const hero = this.hero
    const since = this.t - hero.tumbleSince
    const from = this.tumbleFrom
    const to = this.tumbleTo
    switch (hero.tumble) {
      case 'out': {
        const k = Math.min(1, since / OUT_SECONDS)
        hero.z = TUMBLE_OUT * smooth(k)
        hero.y = from.y + Math.sin(k * Math.PI) * this.outBump
        if (k >= 1) this.setTumble('roll')
        break
      }
      case 'roll': {
        const duration = this.tumbleSeconds()
        const p = Math.min(1, since / duration)
        hero.x = from.x + (to.x - from.x) * smooth(p)
        hero.y = from.y + (to.y - from.y) * p * p + Math.sin(p * Math.PI) * 0.45
        hero.spin = p * Math.PI * 2 * Math.sign(to.x - from.x || 1)
        hero.reach = 0.6 * Math.sin(p * Math.PI)
        if (p >= 1) {
          hero.spin = 0
          hero.x = to.x
          hero.y = 0
          this.sound?.giggle(0)
          this.setTumble('sit')
        }
        break
      }
      case 'sit': {
        // Back in only once nothing is moving, so the spot she hops into is still bare when she lands.
        if (since < SIT_SECONDS || !this.physics.isResting || this.pending.length || this.t < this.backLookAt) break
        const spot = this.backSpot(hero.x)
        if (!spot) {
          this.backLookAt = this.t + BACK_LOOK_SECONDS
          break
        }
        this.hopBackTo(spot)
        break
      }
      case 'back': {
        // Across the front of the build first, up in front of a block she hops onto, then straight back in.
        const scoot = Math.abs(to.x - from.x) / SCOOT_SPEED
        const rise = to.y > 0 ? RISE_SECONDS : 0
        if (since < scoot) {
          const k = since / scoot
          hero.x = from.x + (to.x - from.x) * smooth(k)
          hero.hop = Math.abs(Math.sin(k * Math.PI * Math.max(1, Math.round(scoot * 4)))) * 0.14
          hero.y = hero.hop
          hero.facing = Math.sign(to.x - from.x) || hero.facing
          break
        }
        if (!this.backChecked) {
          // A block set down on the way may have taken the spot: look again before hopping in.
          this.backChecked = true
          const spot = this.physics.isResting && !this.pending.length ? this.backSpot(hero.x) : null
          if (!spot || Math.abs(spot.x - to.x) > 0.05 || Math.abs(spot.y - to.y) > 0.05) {
            hero.x = to.x
            hero.y = 0
            hero.hop = 0
            if (spot) this.hopBackTo(spot)
            else this.setTumble('sit')
            break
          }
        }
        hero.x = to.x
        if (since < scoot + rise) {
          const k = (since - scoot) / rise
          hero.hop = Math.sin(k * Math.PI) * 0.2
          hero.y = to.y * smooth(k) + hero.hop
          break
        }
        const k = Math.min(1, (since - scoot - rise) / BACK_SECONDS)
        hero.z = TUMBLE_OUT * (1 - smooth(k))
        hero.hop = Math.sin(k * Math.PI) * this.backBump
        hero.y = to.y + hero.hop
        if (k >= 1) {
          hero.y = to.y
          hero.z = 0
          hero.hop = 0
          hero.on = to.on
          if (to.on !== null) this.recordSupports()
          this.setHero('stand')
          this.wantPlan = true
        }
        break
      }
      default: {
        const never: never = hero.tumble
        throw new Error(`unknown tumble phase ${String(never)}`)
      }
    }
  }

  private updateHero(dt: number): void {
    const hero = this.hero
    const t = this.t
    const age = t - hero.since
    const goal = this.kiteGoal
    switch (hero.mode) {
      case 'stand': {
        if (hero.on !== null && this.supportMoved(hero.on)) {
          this.wobbly = hero.on
          this.startTumble()
          return
        }
        if (this.wantPlan && this.physics.isResting && !this.turn && this.pending.length === 0 && this.kite.mode === 'perched') this.plan()
        const near = Math.abs(hero.x - goal.x) < 2.4
        const target = this.kite.mode === 'perched' ? (near ? 1 : 0.25 + 0.2 * Math.max(0, Math.sin(t * 0.9))) : 0
        hero.reach += (target - hero.reach) * (1 - Math.exp(-dt * 5))
        break
      }
      case 'travel': {
        const pose = routePose(this.route, t - this.routeStart, hero.segment)
        hero.x = pose.x
        hero.y = pose.y
        hero.facing = pose.facing
        hero.reach += (0 - hero.reach) * (1 - Math.exp(-dt * 8))
        const segment = this.route[pose.index]
        if (segment?.on !== undefined && segment.on !== null && pose.phase > 0.3 && this.supportMoved(segment.on)) {
          this.wobbly = segment.on
          this.startTumble()
          return
        }
        if (pose.kind === 'walk') {
          const hop = Math.floor(pose.phase * pose.hops)
          if (hop !== this.lastHop) {
            this.lastHop = hop
            this.sound?.step(0)
          }
        } else if (pose.kind === 'climb' && pose.phase > 0.2 && this.lastHop !== -1) {
          this.lastHop = -1
          this.sound?.climb()
        }
        if (pose.done) {
          const last = this.route[this.route.length - 1]
          hero.on = last?.on ?? null
          if (last) {
            hero.x = last.to.x
            hero.y = last.to.y
          }
          if (hero.on !== null) this.physics.setLoad(hero.on, hero.x, hero.y)
          if (this.planReaches && this.kite.mode === 'perched') {
            this.setHero('grab')
            this.sound?.giggle(0)
          } else {
            this.setHero('stand')
            this.wantPlan = true
          }
        }
        break
      }
      case 'grab': {
        hero.reach = 1
        if (age >= GRAB_SECONDS) this.startFlight()
        break
      }
      case 'fly':
        break
      case 'land': {
        hero.reach += (0 - hero.reach) * (1 - Math.exp(-dt * 4))
        if (age >= LAND_SECONDS) {
          this.setHero('stand')
          this.wantPlan = true
        }
        break
      }
      case 'tumble':
        this.updateTumble()
        break
      default: {
        const never: never = hero.mode
        throw new Error(`unknown hero mode ${String(never)}`)
      }
    }
    this.updateLook()
  }

  private updateLook(): void {
    const hero = this.hero
    const look = hero.look
    const drag = this.held[0]
    if (drag) {
      look.x = drag.x
      look.y = drag.y
      look.z = 0
    } else if (this.kite.mode !== 'perched' || hero.mode === 'grab') {
      look.x = this.kite.position.x
      look.y = this.kite.position.y
      look.z = this.kite.position.z
    } else if (!this.droppedPiece(look) && !this.demoLook(look)) {
      const w = Math.sin(this.t * 0.8) > -0.55 ? this.kite.position : SLOT_WORLD[this.guidance.hint?.id ?? 0]
      look.x = w.x
      look.y = w.y
      look.z = w.z
    }
    if (hero.mode === 'stand' && Math.abs(look.x - hero.x) > 0.3) hero.facing = Math.sign(look.x - hero.x)
  }

  private plan(): void {
    this.wantPlan = false
    if (this.kite.mode === 'flying') return
    const hero = this.hero
    const plan = planClimb(this.placedList(), { x: hero.x, y: hero.y, on: hero.on }, this.kiteGoal, this.wobbly)
    if (!plan) {
      this.startTumble()
      return
    }
    if (hero.on !== null) this.physics.setLoad(hero.on, hero.x, hero.y)
    this.recordSupports()
    this.startHintSearch(plan.goal)
    if (plan.moves.length) this.startRoute(buildRoute({ x: hero.x, y: hero.y }, plan.moves), plan.reachesKite)
    else if (plan.reachesKite && this.kite.mode === 'perched') this.setHero('grab')
  }

  // ---- kite --------------------------------------------------------------

  /**
   * Where the kite sets the doll down: on the rug a little in from her next
   * perch, and never walled in behind the last build, where no block the
   * child adds by the kite could help her.
   */
  private landingSpot(): Spot {
    const next = kiteTarget(nextPerch(this.state.perch))
    const placed = this.placedList()
    const prefer = Math.max(PLAY_MIN_X + 1.5, Math.min(PLAY_MAX_X - 1.5, next.x - Math.sign(next.x) * 1.6))
    const floor = standableSpots(placed).filter((s) => s.y === 0)
    if (!floor.length) return { x: prefer, y: 0, on: null }
    floor.sort((a, b) => Math.abs(a.x - prefer) - Math.abs(b.x - prefer))
    const tried: number[] = []
    for (const spot of floor) {
      if (tried.length >= LANDING_TRIES) break
      if (tried.some((x) => Math.abs(x - spot.x) < 0.75)) continue
      tried.push(spot.x)
      const plan = planClimb(placed, spot, next, this.wobbly)
      if (plan && (plan.reachesKite || spotValue(plan.goal, next) > -0.5)) return spot
    }
    return floor[0]
  }

  private startFlight(): void {
    const kite = this.kite
    const hero = this.hero
    const landing = this.landingSpot()
    const s = kite.position
    // The loop round the room ends on the landing's side, so the last swoop is short.
    const side = Math.sign(landing.x) || 1
    // The last point hangs her, straight down from the bridle by the spool in her hand, feet on the landing.
    const over = landing.x + FLY_GRIP.x
    const lift = FLY_GRIP.y + KITE_LINE - KITE_BRIDLE.y
    // High enough that the dangling doll's feet pass well over the watchers' heads.
    this.flightPath = [
      { x: s.x, y: s.y, z: s.z },
      { x: s.x * 0.85, y: Math.min(FLIGHT_CEILING, s.y + 1.0), z: s.z + 0.7 },
      { x: (s.x - 5.4 * side) / 2, y: FLIGHT_CEILING - 0.1, z: 0.3 },
      { x: -5.4 * side, y: FLIGHT_CEILING - 0.4, z: 0.5 },
      { x: -2.0 * side, y: FLIGHT_CEILING - 1.1, z: 0.9 },
      { x: 2.6 * side, y: FLIGHT_CEILING - 0.2, z: 0.6 },
      { x: 5.0 * side, y: FLIGHT_CEILING - 0.8, z: 0.3 },
      { x: over + 1.2 * Math.sign(landing.x - 5.0 * side), y: lift + 1.4, z: 0.3 },
      { x: over, y: lift, z: -KITE_BRIDLE.z },
    ]
    this.tumbleTo = { x: landing.x, y: 0, on: null }
    this.landOut = false
    this.landOutK = 0
    this.kitePrev.x = s.x
    this.kitePrev.y = s.y
    this.kitePrev.z = s.z
    this.swingVelocity = 0
    hero.swing = 0
    hero.on = null
    this.physics.setLoad(null)
    kite.mode = 'flying'
    kite.since = this.t
    this.setHero('fly')
    this.state.perch = nextPerch(this.state.perch)
    this.saves.change(this.t, true)
    this.clock.restart(this.t)
    this.sound?.freed()
    this.sound?.wind(true)
    for (const w of this.watchers) {
      w.mode = 'cheer'
      w.since = this.t
    }
  }

  private updateKite(dt: number): void {
    const kite = this.kite
    const age = this.t - kite.since
    const p = kite.position
    this.kitePrev.x = p.x
    this.kitePrev.y = p.y
    this.kitePrev.z = p.z
    switch (kite.mode) {
      case 'perched': {
        const perch = PERCHES[this.state.perch]
        p.x = perch.kite.x
        p.y = perch.kite.y
        p.z = perch.kite.z
        kite.tilt = perch.kite.tilt
        kite.lean = perch.kite.lean
        break
      }
      case 'flying': {
        const f = Math.min(1, age / FLIGHT_SECONDS)
        const eased = f < 0.5 ? 2 * f * f : 1 - 2 * (1 - f) * (1 - f)
        catmull(this.flightPath, (0.15 * f + 0.85 * eased) * (this.flightPath.length - 1), p)
        // A block the child sets down where she was to land: the kite brings her down out in front of the build instead.
        if (!this.landOut && !roomy(this.placedList(), this.tumbleTo.x, 0)) this.landOut = true
        if (this.landOut) {
          this.landOutK = Math.min(1, this.landOutK + dt / LAND_OUT_SECONDS)
          p.z = Math.max(p.z, TUMBLE_OUT * smooth(this.landOutK) - KITE_BRIDLE.z)
        }
        this.updateHanging(dt, f)
        if (f >= 1) {
          kite.mode = 'drifting'
          kite.since = this.t
          this.driftFrom = { x: p.x, y: p.y, z: p.z }
          const hero = this.hero
          hero.x = this.tumbleTo.x
          hero.y = 0
          hero.swing = 0
          if (this.landOut) {
            // Sat on the rug out front, where she hops back in from once there is room.
            hero.z = TUMBLE_OUT
            this.tumbleFrom = { x: hero.x, y: 0 }
            this.setHero('tumble')
            this.setTumble('sit')
          } else {
            hero.z = 0
            this.setHero('land')
          }
          this.sound?.land()
          this.sound?.wind(false)
          this.clock.restart(this.t)
          for (const w of this.watchers) {
            w.mode = 'idle'
            w.since = this.t
          }
        }
        break
      }
      case 'drifting': {
        const f = smooth(age / DRIFT_SECONDS)
        const perch = PERCHES[this.state.perch].kite
        const from = this.driftFrom
        p.x = from.x + (perch.x - from.x) * f
        p.y = from.y + (perch.y - from.y) * f + Math.sin(f * Math.PI) * 1.2
        p.z = from.z + (perch.z - from.z) * f + Math.sin(f * Math.PI) * 0.6
        kite.tilt = perch.tilt * f + Math.sin(age * 3) * 0.12 * (1 - f)
        kite.lean = perch.lean * f
        if (age >= DRIFT_SECONDS) {
          kite.mode = 'perched'
          kite.since = this.t
          // It catches on its new perch with a shiver and a rustle, so the child sees where it went.
          kite.flutterAt = this.t
          this.sound?.flutter()
          this.wantPlan = true
          this.version += 1
        }
        break
      }
      default: {
        const never: never = kite.mode
        throw new Error(`unknown kite mode ${String(never)}`)
      }
    }
    if (dt > 0) {
      kite.velocity.x = (p.x - this.kitePrev.x) / dt
      kite.velocity.y = (p.y - this.kitePrev.y) / dt
      kite.velocity.z = (p.z - this.kitePrev.z) / dt
    }
    if (kite.mode === 'flying') {
      kite.tilt = Math.max(-0.6, Math.min(0.6, -kite.velocity.x * 0.08))
      kite.lean = 0
    }
  }

  /** The doll hangs by the spool in her right hand from the kite's line, like a pendulum pushed by the kite's sideways acceleration. */
  private updateHanging(dt: number, progress: number): void {
    const hero = this.hero
    const kite = this.kite
    const ax = dt > 0 ? ((kite.position.x - this.kitePrev.x) / dt - kite.velocity.x) / dt : 0
    const length = SWING_LENGTH
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      const accel = -(9 / length) * Math.sin(hero.swing) - (Math.max(-12, Math.min(12, ax)) / length) * Math.cos(hero.swing) - 2.4 * this.swingVelocity
      this.swingVelocity += accel * h
      hero.swing += this.swingVelocity * h
      if (Math.abs(hero.swing) > MAX_SWING) {
        hero.swing = Math.sign(hero.swing) * MAX_SWING
        this.swingVelocity *= -0.3
      }
    }
    const settle = smooth((progress - 0.82) / 0.18)
    hero.swing *= 1 - settle
    const s = Math.sin(hero.swing)
    const c = Math.cos(hero.swing)
    // The grip hangs the line's length from the bridle along the swing; her feet are FLY_GRIP below it, turned with her.
    const gripX = kite.position.x + s * KITE_LINE
    const gripY = kite.position.y + KITE_BRIDLE.y - c * KITE_LINE
    hero.x = gripX - (FLY_GRIP.x * c - FLY_GRIP.y * s)
    hero.y = gripY - (FLY_GRIP.x * s + FLY_GRIP.y * c)
    // Never back inside the shelf or behind the build, where the kite starts: the line slants back to it instead.
    hero.z = Math.max(0, kite.position.z + KITE_BRIDLE.z)
    hero.reach = 1
    hero.facing = kite.velocity.x >= 0 ? 1 : -1
  }

  // ---- watchers ----------------------------------------------------------

  private watchersReact(): void {
    this.toppleAt = this.t
    for (const w of this.watchers) {
      if (w.mode === 'cheer') continue
      w.mode = 'react'
      w.since = this.t
    }
  }

  /** Whether a watcher standing at `x` would be where the doll's reach ends while she is after the kite. */
  private crowds(x: number): boolean {
    return this.kite.mode === 'perched' && this.hero.mode !== 'fly' && Math.abs(x - this.hero.x) < GIVE_ROOM
  }

  /** Whether a watcher at `x`, a step behind the build, would be mostly hidden by a block in front of him. */
  private hiddenAt(x: number, placed: readonly Placed[]): boolean {
    for (const piece of placed) {
      for (const part of piece.parts) {
        for (const dx of HIDE_SAMPLES) {
          const span = spanAt(part, x + dx)
          if (span && span[1] > HIDDEN_BY) return true
        }
      }
    }
    return false
  }

  /** Where watcher `i` steps to so the doll has room and the child can see him, or null if he is fine where he is or cannot do better. */
  private asideFor(i: number): number | null {
    const w = this.watchers[i]
    const home = WATCHERS[i]
    const lo = Math.min(home.min, home.aside)
    const hi = Math.max(home.max, home.aside)
    if (this.crowds(w.x)) {
      const hero = this.hero.x
      const far = Math.abs(lo - hero) > Math.abs(hi - hero) ? lo : hi
      return Math.abs(far - hero) > Math.abs(w.x - hero) + 0.3 ? far : null
    }
    const placed = this.placedList()
    if (!this.hiddenAt(w.x, placed)) return null
    let best: number | null = null
    for (let k = 0; k <= ASIDE_STEPS; k++) {
      const x = lo + ((hi - lo) * k) / ASIDE_STEPS
      if (this.crowds(x) || this.hiddenAt(x, placed)) continue
      if (best === null || Math.abs(x - w.x) < Math.abs(best - w.x)) best = x
    }
    return best
  }

  private updateWatchers(dt: number): void {
    const t = this.t
    for (let i = 0; i < this.watchers.length; i++) {
      const w = this.watchers[i]
      const home = WATCHERS[i]
      const age = t - w.since
      const speed = i === 0 ? 0.55 : 1.7
      switch (w.mode) {
        case 'idle': {
          const aside = this.asideFor(i)
          if (aside !== null) {
            w.target = aside
            w.mode = 'walk'
            w.since = t
          } else if (t >= this.nextWander[i]) {
            let target = home.min + this.rng() * (home.max - home.min)
            if (Math.abs(target - w.x) < 0.4) target = w.x > (home.min + home.max) / 2 ? home.min + 0.1 : home.max - 0.1
            if (this.crowds(target) || this.hiddenAt(target, this.placedList())) {
              this.nextWander[i] = t + 2
              break
            }
            w.target = target
            w.mode = 'walk'
            w.since = t
          }
          break
        }
        case 'walk': {
          const d = w.target - w.x
          w.facing = Math.sign(d) || w.facing
          const move = Math.min(Math.abs(d), speed * dt)
          w.x += Math.sign(d) * move
          const stride = i === 0 ? 0.62 : 0.2
          if (t - this.lastWatcherStep[i] > stride) {
            this.lastWatcherStep[i] = t
            if (i === 0) this.sound?.step(1)
          }
          if (Math.abs(w.target - w.x) < 1e-3) {
            w.mode = 'idle'
            w.since = t
            if (i === 1) this.sound?.step(2)
            this.nextWander[i] = t + (i === 0 ? 8 + this.rng() * 5 : 3.5 + this.rng() * 3)
          }
          break
        }
        case 'react':
          if (age > (i === 0 ? 2.4 : 1.2)) {
            w.mode = 'idle'
            w.since = t
          }
          break
        case 'cheer':
          break
        default: {
          const never: never = w.mode
          throw new Error(`unknown watcher mode ${String(never)}`)
        }
      }
      const look = w.look
      const drag = this.held[0]
      if (this.kite.mode !== 'perched') {
        look.x = this.kite.position.x
        look.y = this.kite.position.y
        look.z = this.kite.position.z
      } else if (drag) {
        look.x = drag.x
        look.y = drag.y
        look.z = 0
      } else if (!this.droppedPiece(look) && !this.demoLook(look)) {
        look.x = this.hero.x
        look.y = this.hero.y + 1.4
        look.z = 0
      }
      if (w.mode !== 'walk' && Math.abs(look.x - w.x) > 0.4) w.facing = Math.sign(look.x - w.x)
    }
  }

  // ---- guidance ----------------------------------------------------------

  /** Where the doll will stand once her current move ends: the end of her route, where her tumble lands, or where she is. */
  private restingSpot(): Spot {
    const hero = this.hero
    const last = this.route[this.route.length - 1]
    if (hero.mode === 'travel' && last) return { x: last.to.x, y: last.to.y, on: last.on }
    if (hero.mode === 'tumble') return { x: this.tumbleTo.x, y: this.tumbleTo.y, on: this.tumbleTo.on }
    return { x: hero.x, y: hero.y, on: hero.on }
  }

  /** Where one more block would help the doll most (standing at `from`), found by asking the planner about a few spots near the kite, a few per frame. */
  private startHintSearch(from: Spot = this.restingSpot()): void {
    const shapes = this.hintShapes(from)
    this.hintSearch = {
      from,
      shapes,
      shape: 0,
      candidates: this.hintCandidates(shapes[0].shape),
      index: 0,
      best: { x: 0, y: 0 },
      bestWith: -1,
      bestScore: -Infinity,
      fallback: null,
      fallbackWith: -1,
    }
  }

  /** Where the search tries `shape`: every half unit near the kite, and flush against each side of every block, where a child builds a stair or a wall. */
  private hintCandidates(shape: PieceShape): number[] {
    const goal = this.kiteGoal
    const candidates: number[] = []
    // Only where the piece fits between the walls: a drag stops it there, so the ghost hand must too.
    const fits = (x: number) => Math.abs(x - goal.x) <= 3.5 + 1e-6 && x > PLAY_MIN_X + 0.6 && x < PLAY_MAX_X - 0.6 && clampX(x, shape.half.x) === x
    for (let x = goal.x - 3.5; x <= goal.x + 3.5 + 1e-6; x += 0.5) if (fits(x)) candidates.push(x)
    for (const piece of this.placedList()) {
      let lo = Infinity
      let hi = -Infinity
      for (const part of piece.parts) for (const p of part) {
        lo = Math.min(lo, p.x)
        hi = Math.max(hi, p.x)
      }
      for (const x of [lo - shape.half.x - FLUSH_GAP, hi + shape.half.x + FLUSH_GAP]) if (fits(x)) candidates.push(x)
    }
    return candidates
  }

  /**
   * The pieces the search tries, one of each shape: first the one the ghost
   * hand picks by itself (the rule in `chooseHint`: the first cube left in
   * the tray, else the first piece), then the other tray pieces in order,
   * then pieces left over from an earlier build: standing upright (the hand
   * carries a piece as it lies), carrying nothing, and not under Pip. With
   * none of those, a cube stands in for whichever loose piece it moves.
   */
  private hintShapes(from: Spot): HintPiece[] {
    const shapes: HintPiece[] = []
    const add = (id: number, loose: boolean, x: number) => {
      const shape = pieceShape(id)
      if (!shapes.some((s) => s.shape === shape)) shapes.push({ id, shape, loose, x })
    }
    const cube = PIECES.find((p) => this.trayed[p.id] && p.kind === 'cube')
    if (cube) add(cube.id, false, 0)
    for (const piece of PIECES) if (this.trayed[piece.id]) add(piece.id, false, 0)
    const placed = this.placedList()
    for (const piece of placed) {
      const id = piece.id
      if (id === this.hero.on || id === from.on) continue
      const pose = this.physics.pose(id, this.poseScratch)
      const upright = PIECES[id].kind === 'cube' ? Math.abs(Math.sin(pose.angle * 2)) < 0.1 : Math.cos(pose.angle) > 0.995
      if (upright && !carries(placed, piece)) add(id, true, pose.x)
    }
    if (!shapes.length) shapes.push({ id: -1, shape: SHAPES.cube, loose: false, x: 0 })
    return shapes
  }

  private stepHintSearch(): void {
    const search = this.hintSearch
    if (!search) return
    const goal = this.kiteGoal
    const from = search.from
    for (let n = 0; n < HINT_BATCH; n++) {
      if (search.index >= search.candidates.length) {
        if (search.bestScore > -Infinity || search.shape + 1 >= search.shapes.length) break
        search.shape += 1
        search.candidates = this.hintCandidates(search.shapes[search.shape].shape)
        search.index = 0
        continue
      }
      const { id, shape, loose } = search.shapes[search.shape]
      const placed = this.placedList(loose ? id : -1)
      const x = slideClear(shape, 0, search.candidates[search.index++], placed)
      if (clampX(x, shape.half.x) !== x) continue
      if (loose && Math.abs(x - search.shapes[search.shape].x) < LEFTOVER_MOVE) continue
      let rest = restHeight(shape, 0, x, placed)
      if (restSliver.left > 0 || restSliver.right > 0) rest = restSliver.over
      const y = rest - 0.06
      const base = y - baseDepth(shape)
      if (!balanced(placed, x, base, shape.half.x)) continue
      // Never shown landing on or against Pip where she will stand: she would have to get out from under it first.
      const crowds = Math.abs(x - from.x) < shape.half.x + PIP_CLEAR.half && y + shape.half.y > from.y && base < from.y + PIP_CLEAR.top
      if (crowds) continue
      if (!search.fallback || Math.abs(x - goal.x) < Math.abs(search.fallback.x - goal.x)) {
        search.fallback = { x, y: base }
        search.fallbackWith = id
      }
      const probe: Placed = { id: -1, parts: shape.parts.map((part) => transformInto(part, { x, y, angle: 0 }, [])) }
      const plan = planClimb([...placed, probe], from, goal, this.wobbly)
      if (!plan) continue
      const score = (plan.reachesKite ? 100 : spotValue(plan.goal, goal)) - Math.abs(x - from.x) * 0.05 - base * 0.02
      if (score > search.bestScore) {
        search.bestScore = score
        search.best = { x, y: base }
        search.bestWith = id
      }
    }
    if (search.index < search.candidates.length || (search.bestScore === -Infinity && search.shape + 1 < search.shapes.length)) return
    const g = this.guidance
    if (search.bestScore > -Infinity) {
      g.buildAt = search.best
      g.buildWith = search.bestWith
    } else if (search.fallback) {
      g.buildAt = search.fallback
      g.buildWith = search.fallbackWith
    } else {
      const shape = search.shapes[0].shape
      const x = clampX(goal.x - Math.sign(goal.x) * 0.6, shape.half.x)
      g.buildAt = { x, y: restHeight(shape, 0, x, this.placedList()) - 0.06 - baseDepth(shape) }
      g.buildWith = -1
    }
    this.hintSearch = null
  }

  private summary(): PlayroomSummary {
    const tray = TRAY_SLOTS.filter((s) => this.trayed[s.id]).map((s) => ({ id: s.id, cube: PIECES[s.id].kind === 'cube' }))
    tray.sort((a, b) => a.id - b.id)
    const loose: { id: number; x: number; y: number }[] = []
    for (const piece of this.placedList()) {
      if (piece.id === this.hero.on) continue
      const pose = this.physics.pose(piece.id, this.poseScratch)
      loose.push({ id: piece.id, x: pose.x, y: pose.y })
    }
    return { flying: this.kite.mode !== 'perched', tray, loose, buildAt: this.guidance.buildAt, buildWith: this.guidance.buildWith }
  }

  private clearDemo(): void {
    this.demoActive = false
    this.guidance.hand = null
  }

  private updateGuidance(): void {
    const t = this.t
    const g = this.guidance
    if (this.hero.mode !== 'stand' || this.kite.mode !== 'perched' || !this.physics.isResting) this.clock.restart(t)
    const state = this.clock.state(t)
    g.glow = state.glow
    g.peek = state.peek
    if (state.glow <= 0 && state.demo === null && state.peek === null) {
      if (g.hint) {
        g.hint = null
        this.version += 1
      }
      this.hintChecked = false
      this.clearDemo()
      return
    }
    if (!this.hintChecked || (!this.demoActive && state.demo !== null)) {
      this.hintChecked = true
      const hint = chooseHint(this.summary())
      if (hint?.id !== g.hint?.id || hint?.kind !== g.hint?.kind) this.version += 1
      g.hint = hint
    }
    if (state.demo === null || !g.hint || !this.projector) {
      this.clearDemo()
      return
    }
    if (!this.demoActive) {
      this.demoActive = true
      const hint = g.hint
      const fromWorld = hint.kind === 'fromTray' ? SLOT_WORLD[hint.id] : { x: hint.from.x, y: hint.from.y, z: 0 }
      const top = g.buildAt.y + baseDepth(pieceShape(hint.id))
      Object.assign(this.demoFromWorld, fromWorld)
      Object.assign(this.demoToWorld, { x: g.buildAt.x, y: top, z: 0 })
      this.demoFrom = this.projector.toScreen(fromWorld, this.screenA) ? { ...this.screenA } : null
      this.demoTo = this.projector.toScreen(this.demoToWorld, this.screenB) ? { ...this.screenB } : null
    }
    if (!this.demoFrom || !this.demoTo) {
      g.hand = null
      return
    }
    this.demoProgress = state.demo
    g.hand = handPose(this.demoFrom, this.demoTo, state.demo, this.hand)
  }

  /**
   * Where the ghost hand's piece is in the room while it is on show: every
   * doll watches it lift off the tray and go, each at its own look speed, so
   * the room points at the demonstration with its heads.
   */
  private demoLook(out: Vec3): boolean {
    if (!this.guidance.hand || this.demoProgress < 0.05 || this.demoProgress > 0.9) return false
    const k = handTravel(this.demoProgress)
    const a = this.demoFromWorld
    const b = this.demoToWorld
    out.x = a.x + (b.x - a.x) * k
    out.y = a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * 1.2
    out.z = a.z + (b.z - a.z) * k
    return true
  }
}

export function slotWorld(id: number): Vec3 {
  const slot = TRAY_SLOTS[id]
  const center = slotCenter(slot)
  return trayToWorld(center.x, center.y, pieceShape(id).depth / 2)
}

const SLOT_WORLD: readonly Vec3[] = PIECES.map((p) => slotWorld(p.id))

function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = dx * dx + dy * dy
  const t = length > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
}

export function distanceToPiece(piece: Placed, p: Vec2): number {
  let best = Infinity
  for (const part of piece.parts) {
    if (pointInConvex(part, p)) return 0
    for (let i = 0; i < part.length; i++) best = Math.min(best, distanceToSegment(p, part[i], part[(i + 1) % part.length]))
  }
  return best
}
