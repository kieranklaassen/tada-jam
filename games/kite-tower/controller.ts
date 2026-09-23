import type { Doll, KiteSound } from './audio'
import { planClimb, spotValue, standableSpots, type Spot } from './climb'
import { chooseHint, handPose, HintClock, type HandPose, type Hint, type PlayroomSummary } from './guidance'
import { buildRoute, routePose, type RoutePose, type Segment } from './hero'
import { Gestures, type Intent, type Target } from './input'
import { slotCenter, TRAY, TRAY_SLOTS, trayToWorld, WATCHERS, type Vec3 } from './layout'
import { kiteTarget, nextPerch, PERCHES } from './perches'
import { DOLL_WEIGHT, PlayPhysics } from './physics'
import { clampX, PIECES, PLAY_MAX_X, PLAY_MIN_X, pieceShape, pointInConvex, restHeight, SHAPES, skylineAt, transformInto, type Placed, type Pose, type Vec2 } from './pieces'
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
}

export type ControllerDeps = { save: (state: KiteState) => void; sound?: KiteSound }

const LIFT = 1.1
const FOLLOW = 18
const TURN_SECONDS = 0.26
const GRAB_SECONDS = 0.8
const FLIGHT_SECONDS = 7
/** The kite's highest point in flight; any higher and its top leaves the picture. */
const FLIGHT_CEILING = 8.0
/** A dangling doll swings, but never so far that it lies flat. */
const MAX_SWING = 0.5
const LAND_SECONDS = 0.9
const DRIFT_SECONDS = 3.4
const STRING = 1.5
const HANDS = 2.05
/** How far the doll's support may shift (units, radians) before the doll loses its footing. */
const SUPPORT_SHIFT = 0.14
const SUPPORT_TURN = 0.12
const HIT_PAD = 0.32
const MAX_TOKS_PER_FRAME = 2
const HINT_BATCH = 3
/** How long everyone keeps watching a piece the child has just let go of. */
const NOTICE_SECONDS = 1.4

type Drag = { pointer: number; id: number; offset: Vec2; goal: Vec2; at: Vec2; lastX: number; vx: number }
type Turn = { id: number; start: number; from: number; to: number }
type HintSearch = { candidates: number[]; index: number; best: Vec2; bestScore: number }

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
  readonly guidance: GuidanceView = { glow: 0, hint: null, hand: null, peek: null, buildAt: { x: 0, y: 0 } }

  private readonly deps: ControllerDeps
  private readonly sound: KiteSound | null
  private readonly saves: SaveCadence
  private readonly gestures: Gestures
  private readonly clock: HintClock
  private projector: Projector | null = null
  private readonly drags: Drag[] = []
  private readonly heldPool: Held[] = PIECES.map(() => ({ id: 0, x: 0, y: 0, angle: 0, landY: 0 }))
  private hintChecked = false
  private turn: Turn | null = null
  private route: Segment[] = []
  private routeStart = 0
  private planReaches = false
  private wantPlan = true
  private tumbleFrom: Vec2 = { x: 0, y: 0 }
  private tumbleTo: Vec2 = { x: 0, y: 0 }
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
  private demoActive = false
  private hintSearch: HintSearch | null = null
  private calmSince = 0
  private recentImpacts = 0
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
      const shape = pieceShape(id)
      const pose = this.physics.pose(id, this.poseScratch)
      const cache = this.partCache[id]
      for (let k = 0; k < shape.parts.length; k++) transformInto(shape.parts[k], pose, cache[k])
      list.push(this.placedCache[id])
    }
    return list
  }

  get kiteGoal(): { x: number; grabY: number } {
    return kiteTarget(this.state.perch)
  }

  isHeld(id: number): boolean {
    return this.physics.isHeld(id)
  }

  /** Seconds the playroom has been untouched and entirely still; the view renders at half rate after a while. */
  restingFor(): number {
    if (this.hero.mode !== 'stand' || this.kite.mode !== 'perched' || this.drags.length > 0 || this.turn || !this.physics.isResting || this.guidance.hand) return 0
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
      this.physics.add(id, { x, y: restHeight(shape, 0, x, this.placedList(id)), angle: 0 })
      this.physics.hold(id)
      this.drags.push({ pointer, id, offset: { x: 0, y: 0 }, goal: { x, y: 0 }, at: { x, y: 0 }, lastX: x, vx: 0 })
      this.sound?.pickup()
      this.version += 1
    } else if (target.kind === 'piece') {
      const id = target.id
      if (this.physics.isHeld(id)) return
      if (this.turn?.id === id) this.turn = null
      const pose = this.physics.pose(id, this.poseScratch)
      this.supportLost(id)
      this.physics.hold(id)
      this.drags.push({ pointer, id, offset: { x: pose.x - p.x, y: pose.y - p.y }, goal: { x: pose.x, y: pose.y }, at: { x: pose.x, y: pose.y }, lastX: pose.x, vx: 0 })
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
    this.physics.release(drag.id, drag.vx * 0.35)
    this.noticeDrop(drag.id)
    this.dodgeIfUnder(drag.id)
    this.saves.change(this.t, true)
  }

  private noticeDrop(id: number): void {
    this.dropId = id
    this.dropAt = this.t
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
    this.sound?.putAway()
    this.saves.change(this.t, true)
    this.version += 1
  }

  private startTurn(id: number): void {
    if (this.physics.isHeld(id) || this.turn) return
    const pose = this.physics.pose(id, this.poseScratch)
    this.supportLost(id)
    this.physics.hold(id)
    this.turn = { id, start: this.t, from: pose.angle, to: pose.angle + Math.PI / 2 }
    this.sound?.turn()
  }

  private hopOutOfTray(id: number): void {
    const shape = pieceShape(id)
    const goal = this.kiteGoal
    const dir = Math.sign(goal.x - this.hero.x) || 1
    const x = clampX(this.hero.x + dir * (shape.half.x + 0.62), shape.half.x)
    this.trayed[id] = false
    this.popAt[id] = this.t
    this.physics.add(id, { x, y: restHeight(shape, 0, x, this.placedList(id)) + 0.9, angle: 0 })
    this.noticeDrop(id)
    this.dodgeIfUnder(id)
    this.sound?.pickup()
    this.saves.change(this.t, true)
    this.version += 1
  }

  /** The piece the doll stands on is being moved: the doll tumbles off, unhurt. */
  private supportLost(id: number): void {
    if (this.hero.on === id && (this.hero.mode === 'stand' || this.hero.mode === 'travel' || this.hero.mode === 'grab')) this.startTumble()
  }

  /** A piece is about to land on the doll: it hops aside if it can, otherwise tumbles clear. */
  private dodgeIfUnder(id: number): void {
    const hero = this.hero
    if (hero.mode !== 'stand' && hero.mode !== 'travel') return
    const body = this.physics.body(id)
    if (!body) return
    const shape = pieceShape(id)
    const lo = body.position.x - shape.half.x - 0.3
    const hi = body.position.x + shape.half.x + 0.3
    if (hero.x < lo || hero.x > hi || body.position.y - shape.half.y > hero.y + 2.2) return
    const placed = this.placedList(id)
    const spots = standableSpots(placed).filter((s) => (s.x < lo || s.x > hi) && Math.abs(s.y - hero.y) < 0.45 && Math.abs(s.x - hero.x) < 2.6)
    if (!spots.length) {
      this.startTumble()
      return
    }
    let best = spots[0]
    for (const s of spots) if (Math.abs(s.x - hero.x) < Math.abs(best.x - hero.x)) best = s
    this.startRoute(buildRoute({ x: hero.x, y: hero.y }, [{ kind: 'hop', to: best }]), false)
  }

  // ---- frame -------------------------------------------------------------

  step(dt: number): void {
    if (!this.running || !(dt > 0)) return
    this.t += dt
    const t = this.t
    this.updateHeld(dt)
    this.updateTurn()
    const report = this.physics.step(dt)
    const toks = Math.min(report.impacts, MAX_TOKS_PER_FRAME)
    for (let i = 0; i < report.impacts; i++) {
      const id = report.impactIds[i]
      const speed = report.impactSpeeds[i]
      if (i < toks) this.sound?.tok(PIECES[id].kind, speed)
      const stack = this.pieceStack[id]
      if (stack >= 0 && stack < this.stackKick.length) this.stackKick[stack] = Math.min(1, this.stackKick[stack] + speed * 0.12)
      if (speed > 2) this.recentImpacts += 1
    }
    this.recentImpacts = Math.max(0, this.recentImpacts - dt * 4)
    if (this.recentImpacts > 3) {
      this.recentImpacts = 0
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
      const angle = this.physics.body(id) ? this.heldAngle(id) : 0
      const x = clampX(drag.at.x + (drag.goal.x - drag.at.x) * k, shape.half.x)
      const rest = restHeight(shape, angle, x, this.placedList(id))
      const goalY = Math.min(rest + LIFT, Math.max(rest, drag.goal.y))
      drag.at.y = Math.max(rest, drag.at.y + (goalY - drag.at.y) * k)
      drag.vx = drag.vx * 0.7 + ((x - drag.lastX) / dt) * 0.3
      drag.lastX = x
      drag.at.x = x
      this.physics.moveHeld(id, x, drag.at.y, angle)
      const entry = this.heldPool[i]
      entry.id = id
      entry.x = x
      entry.y = drag.at.y
      entry.angle = angle
      entry.landY = rest - 0.06
      held.push(entry)
    }
    if (held.length) this.clock.touch(this.t)
  }

  private heldAngle(id: number): number {
    return this.physics.pose(id, this.poseScratch).angle
  }

  private updateTurn(): void {
    const turn = this.turn
    if (!turn) return
    const shape = pieceShape(turn.id)
    const p = Math.min(1, (this.t - turn.start) / TURN_SECONDS)
    const angle = turn.from + (turn.to - turn.from) * smooth(p)
    const pose = this.physics.pose(turn.id, this.poseScratch)
    const x = clampX(pose.x, Math.max(shape.half.x, shape.half.y))
    const rest = restHeight(shape, angle, x, this.placedList(turn.id))
    this.physics.moveHeld(turn.id, x, Math.max(pose.y, rest), angle)
    if (p >= 1) {
      this.physics.release(turn.id, 0)
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

  private startTumble(): void {
    const hero = this.hero
    this.tumbleFrom = { x: hero.x, y: hero.y }
    this.route = []
    const floor = standableSpots(this.placedList()).filter((s) => s.y === 0)
    let to = { x: hero.x, y: 0 }
    if (floor.length) {
      let best = floor[0]
      for (const s of floor) if (Math.abs(s.x - hero.x) < Math.abs(best.x - hero.x)) best = s
      to = { x: best.x, y: 0 }
    }
    this.tumbleTo = to
    hero.on = null
    this.physics.setLoad(null)
    this.setHero('tumble')
    this.sound?.whee()
    this.watchersReact()
  }

  private tumbleSeconds(): number {
    return 0.55 + Math.min(0.5, this.tumbleFrom.y * 0.12)
  }

  private updateHero(dt: number): void {
    const hero = this.hero
    const t = this.t
    const age = t - hero.since
    const goal = this.kiteGoal
    switch (hero.mode) {
      case 'stand': {
        if (hero.on !== null && this.supportMoved(hero.on)) {
          this.startTumble()
          return
        }
        if (this.wantPlan && this.physics.isResting && !this.turn && this.kite.mode === 'perched') this.plan()
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
      case 'tumble': {
        const duration = this.tumbleSeconds()
        const p = Math.min(1, age / duration)
        hero.x = this.tumbleFrom.x + (this.tumbleTo.x - this.tumbleFrom.x) * smooth(p)
        hero.y = this.tumbleFrom.y + (this.tumbleTo.y - this.tumbleFrom.y) * p * p + Math.sin(p * Math.PI) * 0.45
        hero.spin = p * Math.PI * 2 * Math.sign(this.tumbleTo.x - this.tumbleFrom.x || 1)
        hero.reach = 0.6 * Math.sin(p * Math.PI)
        if (p >= 1 && age < duration + dt * 1.5) this.sound?.giggle(0)
        if (age >= duration + 0.9) {
          hero.spin = 0
          hero.x = this.tumbleTo.x
          hero.y = 0
          this.setHero('stand')
          this.wantPlan = true
        }
        break
      }
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
    } else if (!this.droppedPiece(look)) {
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
    const plan = planClimb(this.placedList(), { x: hero.x, y: hero.y, on: hero.on }, this.kiteGoal)
    if (!plan) {
      this.startTumble()
      return
    }
    if (hero.on !== null) this.physics.setLoad(hero.on, hero.x, hero.y)
    this.recordSupports()
    if (plan.moves.length) this.startRoute(buildRoute({ x: hero.x, y: hero.y }, plan.moves), plan.reachesKite)
    else if (plan.reachesKite && this.kite.mode === 'perched') this.setHero('grab')
  }

  // ---- kite --------------------------------------------------------------

  private landingSpot(): Spot {
    const floor = standableSpots(this.placedList()).filter((s) => s.y === 0)
    const prefer = Math.max(PLAY_MIN_X + 1.5, Math.min(PLAY_MAX_X - 1.5, -this.hero.x * 0.35))
    let best: Spot = { x: prefer, y: 0, on: null }
    let bestDistance = Infinity
    for (const s of floor) {
      const d = Math.abs(s.x - prefer)
      if (d < bestDistance) {
        best = s
        bestDistance = d
      }
    }
    return best
  }

  private startFlight(): void {
    const kite = this.kite
    const hero = this.hero
    const landing = this.landingSpot()
    const s = kite.position
    const side = Math.sign(s.x) || 1
    const lift = HANDS + STRING
    // High enough that the dangling doll's feet pass well over the watchers' heads.
    this.flightPath = [
      { x: s.x, y: s.y, z: s.z },
      { x: s.x * 0.85, y: Math.min(FLIGHT_CEILING, s.y + 1.0), z: s.z + 0.7 },
      { x: s.x * 0.2 - 2.2 * side, y: FLIGHT_CEILING - 0.1, z: 0.3 },
      { x: -5.4 * side, y: FLIGHT_CEILING - 0.4, z: 0.5 },
      { x: -2.0 * side, y: FLIGHT_CEILING - 1.1, z: 0.9 },
      { x: 2.6 * side, y: FLIGHT_CEILING - 0.2, z: 0.6 },
      { x: 5.0 * side, y: FLIGHT_CEILING - 0.8, z: 0.3 },
      { x: landing.x + 1.2 * Math.sign(landing.x - 5.0 * side), y: lift + 1.4, z: 0.3 },
      { x: landing.x, y: lift, z: 0 },
    ]
    this.tumbleTo = { x: landing.x, y: 0 }
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
        this.updateHanging(dt, f)
        if (f >= 1) {
          kite.mode = 'drifting'
          kite.since = this.t
          this.driftFrom = { x: p.x, y: p.y, z: p.z }
          const hero = this.hero
          hero.x = this.tumbleTo.x
          hero.y = 0
          hero.z = 0
          hero.swing = 0
          this.setHero('land')
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

  /** The doll hangs from the kite string like a pendulum pushed by the kite's sideways acceleration. */
  private updateHanging(dt: number, progress: number): void {
    const hero = this.hero
    const kite = this.kite
    const ax = dt > 0 ? ((kite.position.x - this.kitePrev.x) / dt - kite.velocity.x) / dt : 0
    const length = STRING + HANDS * 0.6
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
    hero.x = kite.position.x + s * (STRING + HANDS)
    hero.y = kite.position.y - c * (STRING + HANDS)
    hero.z = kite.position.z
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

  private updateWatchers(dt: number): void {
    const t = this.t
    for (let i = 0; i < this.watchers.length; i++) {
      const w = this.watchers[i]
      const home = WATCHERS[i]
      const age = t - w.since
      const speed = i === 0 ? 0.55 : 1.7
      switch (w.mode) {
        case 'idle':
          if (t >= this.nextWander[i]) {
            let target = home.min + this.rng() * (home.max - home.min)
            if (Math.abs(target - w.x) < 0.4) target = w.x > (home.min + home.max) / 2 ? home.min + 0.1 : home.max - 0.1
            w.target = target
            w.mode = 'walk'
            w.since = t
          }
          break
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
      } else if (!this.droppedPiece(look)) {
        look.x = this.hero.x
        look.y = this.hero.y + 1.4
        look.z = 0
      }
      if (w.mode !== 'walk' && Math.abs(look.x - w.x) > 0.4) w.facing = Math.sign(look.x - w.x)
    }
  }

  // ---- guidance ----------------------------------------------------------

  /** Where one more block would help the doll most, found by asking the planner about a few spots near the kite, a few per frame. */
  private startHintSearch(): void {
    const goal = this.kiteGoal
    const candidates: number[] = []
    for (let x = goal.x - 3.5; x <= goal.x + 3.5 + 1e-6; x += 0.5) {
      if (x > PLAY_MIN_X + 0.6 && x < PLAY_MAX_X - 0.6) candidates.push(x)
    }
    this.hintSearch = { candidates, index: 0, best: { x: goal.x - Math.sign(goal.x) * 0.6, y: 0 }, bestScore: -Infinity }
  }

  private stepHintSearch(): void {
    const search = this.hintSearch
    if (!search) return
    const goal = this.kiteGoal
    const hero = this.hero
    const cube = SHAPES.cube
    for (let n = 0; n < HINT_BATCH && search.index < search.candidates.length; n++, search.index++) {
      const x = search.candidates[search.index]
      const placed = this.placedList()
      const y = restHeight(cube, 0, x, placed) - 0.06
      const probe: Placed = { id: -1, parts: cube.parts.map((part) => transformInto(part, { x, y, angle: 0 }, [])) }
      const plan = planClimb([...placed, probe], { x: hero.x, y: hero.y, on: hero.on }, goal)
      if (!plan) continue
      const score = (plan.reachesKite ? 100 : spotValue(plan.goal, goal)) - Math.abs(x - hero.x) * 0.05 - y * 0.02
      if (score > search.bestScore) {
        search.bestScore = score
        search.best = { x, y: skylineAt(placed, x) }
      }
    }
    if (search.index >= search.candidates.length) {
      this.guidance.buildAt = search.best
      this.hintSearch = null
    }
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
    return { flying: this.kite.mode !== 'perched', tray, loose, buildAt: this.guidance.buildAt }
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
      const top = g.buildAt.y + 0.5
      this.demoFrom = this.projector.toScreen(fromWorld, this.screenA) ? { ...this.screenA } : null
      this.demoTo = this.projector.toScreen({ x: g.buildAt.x, y: top, z: 0 }, this.screenB) ? { ...this.screenB } : null
    }
    if (!this.demoFrom || !this.demoTo) {
      g.hand = null
      return
    }
    g.hand = handPose(this.demoFrom, this.demoTo, state.demo, this.hand)
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
