import { DEMO_SECONDS, handPose, HintScheduler, INVITE_SECONDS, quietAfter, timingFor, type DemoPath, type HandPose } from './guidance'
import { GestureTracker, type Intent, type Point } from './input'
import { BirdMotion, Spring, WandererMotion, type Greet, type Poke } from './motion'
import {
  castRay,
  fitRoom,
  placePoint,
  Projector,
  roomBounds,
  turnAngle,
  type Bounds,
  type MutableVec3,
  type RayHit,
} from './projection'
import { ROOMS, type Decor, type RoomSpec } from './rooms'
import { canMoveUnder, LayoutCache, nextHint, type Hint } from './solver'
import { serialize, startSave, type SavedState } from './state'
import {
  axisVector,
  connected,
  FACE_NORMALS,
  findPath,
  isPerspectiveStep,
  isWalkable,
  nearestReachable,
  overlaps,
  pack,
  resolveRoom,
  stateRange,
  stepArrangement,
  tileCell,
  tileFace,
  type Layout,
  type Room,
  type Tile,
  type Vec3,
} from './world'

// The rules and the feel (KTD10). Framework-free: the view reads `frame`
// every animation frame and forwards pointer events; tests drive it with
// plain numbers. Everything the frame loop touches is preallocated.

export type ChirpKind = 'hop' | 'huff' | 'peep'

export type Sound = {
  unlock(): void
  setActive(active: boolean): void
  dispose(): void
  tock(): void
  grip(): void
  air(): void
  ringTap(slot: number): void
  grind(level: number): void
  scrape(level: number): void
  notch(): void
  settle(weight: number): void
  bump(): void
  step(foot: number, onBird: boolean): void
  shimmer(): void
  door(): void
  enter(): void
  travel(): void
  arrive(): void
  chirp(kind: ChirpKind): void
  flap(): void
  /** The bird's answer to a poke, in time with the reaction it picked. */
  poke(kind: Poke): void
  /** The wanderer's answer to a poke: its lantern chimes the way it moves. */
  greet(kind: Greet): void
  wonder(): void
}

export type Target =
  | { kind: 'ring'; room: number }
  | { kind: 'wanderer' }
  | { kind: 'bird' }
  | { kind: 'group'; group: number; tile: number | null; handle: boolean }
  | { kind: 'door' }
  | { kind: 'tile'; tile: number }
  | { kind: 'stone' }
  | { kind: 'sky' }

export type Phase = 'play' | 'enter' | 'leave' | 'arrive'

export const MAX_GROUPS = 3
export const RIPPLES = 4
export const WALK_SPEED = 1.6
const ANTICIPATION = 0.14
/** Once a landing opens the way to a tile the child asked for, the wanderer looks at it this long before setting off, so the landing reads first. */
export const WISH_BEAT = 0.45
/** How far into the invitation the bird stops watching the wanderer and follows its lantern to the door. */
const BIRD_FOLLOWS = 0.4
const TURN_DETENT = 0.3
const SLIDE_DETENT = 0.16
const RUBBER = 0.3
/** Landing dip: an underdamped spring kicked downward when a segment first reaches its stop. */
const DIP_STIFFNESS = 300
const DIP_DAMPING = 11
const DIP_KICK = 2.4
/**
 * How far (world units along the view ray) a slide grip may sit behind the
 * first solid the touch meets and still win it: a grip peeking out under a
 * tower's edge must still answer the finger the ghost hand showed.
 */
const GRIP_REACH = 0.8
const HOP_CROUCH = 0.09
const HOP_SECONDS = 0.34
const ENTER_SECONDS = 1.55
const LEAVE_SECONDS = 0.6
const ARRIVE_SECONDS = 0.95
/** The bird takes off as the wanderer steps through the door and follows it in. */
const FOLLOW_FROM = 0.9
const FOLLOW_TO = 1.5

export type RoomInfo = {
  spec: RoomSpec
  room: Room
  cache: LayoutCache
  bounds: Bounds
  birdGroup: number
  /** Where each group's handle or grip sits at quarter 0 / offset 0. */
  handles: Vec3[]
  handleRadius: number[]
  doorTop: Vec3
  door: Vec3
}

export type Ripple = { x: number; y: number; age: number; strong: boolean }

export type Frame = {
  room: number
  phase: Phase
  /** 0 fully shown, 1 gone into the dusk. */
  fade: number
  /** Vertical drift of the whole diorama during travel (world units). */
  drop: number
  values: Float64Array
  /** How far each group has sunk under its own weight after landing (world units, negative is down). */
  dips: Float64Array
  walker: WandererMotion['pose']
  bird: BirdMotion['pose']
  door: { open: number; glow: number }
  glow: { kind: 'none' | 'group' | 'tile' | 'door'; group: number; x: number; y: number; z: number; strength: number }
  hand: HandPose & { visible: boolean }
  ripples: Ripple[]
  sparkle: { x: number; y: number; z: number; age: number }
  ring: { turn: number; cx: number; cy: number; rx: number; ry: number; size: number; pulse: Float64Array }
  /** Increments whenever a group is released or grabbed, so the view can re-read settled values for the minis. */
  version: number
}

type Drag = {
  pointerId: number
  group: number
  kind: 'turn' | 'slide' | 'bird'
  active: boolean
  base: number
  lo: number
  hi: number
  accum: number
  lastAngle: number | null
  startX: number
  startY: number
  lastX: number
  lastY: number
  axisX: number
  axisY: number
  axisLen2: number
  raw: number
  prevRaw: number
  prevT: number
  velocity: number
  pushed: boolean
}

type Walk = {
  path: number[]
  index: number
  u: number
  delay: number
  layout: Layout
  wonder: Vec3 | null
}

function mod4(v: number): number {
  return ((Math.round(v) % 4) + 4) % 4
}

function smoothstep(a: number, b: number, t: number): number {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

function rubber(excess: number): number {
  return RUBBER * (1 - 1 / (1 + excess * 1.8))
}

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a))
}

function decorRadius(decor: readonly Decor[], group: number): number {
  for (const d of decor) if (d.kind === 'wheel' && d.group === group) return d.radius
  return 0.45
}

export function buildRoomInfo(spec: RoomSpec): RoomInfo {
  const room = resolveRoom(spec)
  const doorTop: Vec3 = [spec.door[0] + 0.5, spec.door[1] + 1, spec.door[2] + 0.5]
  const door: Vec3 = [doorTop[0] - 0.2, doorTop[1], doorTop[2] - 0.2]
  const bounds = roomBounds(room, [
    [door[0], door[1] + 1.5, door[2]],
    [spec.perch[0], spec.perch[1] + 1, spec.perch[2]],
  ])
  return {
    spec,
    room,
    cache: new LayoutCache(room),
    bounds,
    birdGroup: spec.groups.findIndex((group) => group.kind === 'slide' && group.bird === true),
    handles: spec.groups.map((group) => (group.kind === 'turn' ? group.handle : group.grip)),
    handleRadius: spec.groups.map((_, index) => decorRadius(spec.decor, index)),
    doorTop,
    door,
  }
}

export type ControllerOptions = {
  save: (state: SavedState) => void
  sound: Sound
  childAge: number | null
  now?: number
}

export class TowerController {
  readonly rooms: RoomInfo[]
  readonly projector = new Projector()
  readonly frame: Frame
  readonly input: GestureTracker<Target>
  private readonly state: SavedState
  private readonly sound: Sound
  private readonly save: (state: SavedState) => void
  private readonly scheduler: HintScheduler
  private readonly restAfter: number
  private readonly wanderer = new WandererMotion()
  private readonly bird = new BirdMotion()
  private readonly springs: Spring[] = []
  /** A heavy segment sinks a little when it lands and bobs back: weight without a verdict. */
  private readonly dips: Spring[] = []
  private readonly settling: boolean[] = [false, false, false]
  private readonly impact: boolean[] = [false, false, false]
  private readonly notchAt: number[] = [0, 0, 0]
  private readonly doorOpen = new Spring(0, 55, 10)
  private readonly ringTurn = new Spring(0, 40, 11)
  private info!: RoomInfo
  private current = 0
  private arrangement: number[] = []
  private layout!: Layout
  private walker = 0
  private walk: Walk | null = null
  private pendingGoal: { tile: number; wonder: Vec3 | null } | null = null
  private queuedGoal: { tile: number; wonder: Vec3 | null } | null = null
  /** A tile the child asked for that the wanderer could not reach yet. It survives drags; any other tile tap replaces it. */
  private wish: number | null = null
  private wishOpenAt = -1
  private drag: Drag | null = null
  private hop = { active: false, from: 0, to: 0, t: 0, wait: 0, goal: 0 }
  private hint: Hint | null = null
  private hintDirty = true
  private demoPath: DemoPath | null = null
  private demoWas = false
  private inviteWas = false
  private inviteFollowed = true
  private phase: Phase = 'play'
  private phaseT = 0
  private nextRoom = 0
  private viaDoor = false
  private now: number
  private running = true
  /** Coming back after looking away is not idleness: the guidance ladder starts over. */
  private resumed = false
  private rippleCursor = 0
  private ghost = 0
  private rideGroup = -1
  private rideValue = 0
  private onBirdBefore = false
  private width = 1
  private height = 1
  private readonly fits: { scale: number; camX: number; camY: number }[] = []
  private warmRoom = 0
  private readonly scratch: MutableVec3 = [0, 0, 0]
  private readonly scratch2: MutableVec3 = [0, 0, 0]
  private readonly hit: RayHit = { x: 0, y: 0, z: 0, face: 0 }
  private readonly screen: Point = { x: 0, y: 0 }

  constructor(state: SavedState, options: ControllerOptions) {
    this.state = state
    this.sound = options.sound
    this.save = options.save
    this.now = options.now ?? 0
    this.rooms = ROOMS.map(buildRoomInfo)
    const timing = timingFor(options.childAge)
    this.scheduler = new HintScheduler(this.now, timing)
    this.restAfter = quietAfter(timing)
    for (let i = 0; i < MAX_GROUPS; i++) {
      this.springs.push(new Spring(0, 260, 30))
      this.dips.push(new Spring(0, DIP_STIFFNESS, DIP_DAMPING))
    }
    const ripples: Ripple[] = []
    for (let i = 0; i < RIPPLES; i++) ripples.push({ x: 0, y: 0, age: 99, strong: false })
    this.frame = {
      room: 0,
      phase: 'play',
      fade: 0,
      drop: 0,
      values: new Float64Array(MAX_GROUPS),
      dips: new Float64Array(MAX_GROUPS),
      walker: this.wanderer.pose,
      bird: this.bird.pose,
      door: { open: 0, glow: 1 },
      glow: { kind: 'none', group: -1, x: 0, y: 0, z: 0, strength: 0 },
      hand: { x: 0, y: 0, press: 0, opacity: 0, visible: false },
      ripples,
      sparkle: { x: 0, y: 0, z: 0, age: 99 },
      ring: { turn: 0, cx: 0, cy: 0, rx: 1, ry: 1, size: 1, pulse: new Float64Array(this.rooms.length) },
      version: 0,
    }
    this.input = new GestureTracker<Target>((at) => this.hitTest(at))
    const start = Math.max(0, this.rooms.findIndex((info) => info.spec.key === state.current))
    this.ringTurn.snap(start)
    this.loadRoom(start)
    this.resize(1180, 820)
  }

  // ---------------------------------------------------------------- queries

  get currentRoom(): RoomInfo {
    return this.info
  }

  get walkerTile(): number {
    return this.walker
  }

  get arrangementNow(): readonly number[] {
    return this.arrangement
  }

  get currentHint(): Hint | null {
    return this.hint
  }

  get currentPhase(): Phase {
    return this.phase
  }

  get isWalking(): boolean {
    return this.walk !== null
  }

  get isBusy(): boolean {
    return this.walk !== null || this.drag !== null || this.phase !== 'play' || this.hop.active || this.settling.some(Boolean)
  }

  /** Nobody has touched anything since the last demonstration ended: only slow breathing is left on screen. */
  get isResting(): boolean {
    return !this.isBusy && this.scheduler.idleFor(this.now) > this.restAfter
  }

  /** Settled group values of any diorama (for the little models on the ring). */
  savedGroups(room: number): readonly number[] {
    return room === this.current ? this.arrangement : this.state.rooms[this.rooms[room].spec.key].groups
  }

  ringSlot(room: number, out: { x: number; y: number; scale: number; depth: number }): { x: number; y: number; scale: number; depth: number } {
    const ring = this.frame.ring
    const phi = ((room - this.ringTurn.value) * Math.PI * 2) / this.rooms.length
    out.depth = Math.cos(phi)
    out.x = ring.cx + ring.rx * Math.sin(phi)
    out.y = ring.cy + ring.ry * out.depth
    out.scale = 0.62 + 0.38 * ((out.depth + 1) / 2)
    return out
  }

  // ---------------------------------------------------------------- lifecycle

  resize(width: number, height: number): void {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    const ringHeight = Math.max(96, Math.min(150, this.height * 0.17))
    const ring = this.frame.ring
    ring.cx = this.width / 2
    ring.cy = this.height - ringHeight * 0.52
    ring.rx = Math.min(this.width * 0.3, 340)
    ring.ry = ringHeight * 0.17
    ring.size = ringHeight * 0.62
    this.fits.length = 0
    for (const info of this.rooms) this.fits.push(fitRoom(info.bounds, this.width, this.height, ringHeight))
    this.projector.set(this.width, this.height, this.fits[this.current])
    this.demoPath = null
  }

  setRunning(running: boolean): void {
    if (running === this.running) return
    this.running = running
    this.sound.setActive(running)
    if (!running) this.putAway()
    else this.resumed = true
  }

  dispose(): void {
    this.sound.dispose()
  }

  /** Put-away: nothing may be left mid-motion, because the loop stops here (R12). */
  private putAway(): void {
    for (const intent of this.input.reset()) this.handle(intent)
    if (this.drag) this.release(0)
    if (this.hop.active) {
      this.hop.goal = this.hop.to
      this.finishHop()
    }
    for (let g = 0; g < this.info.spec.groups.length; g++) {
      if (this.settling[g]) {
        this.springs[g].snap(this.springs[g].target)
        this.settling[g] = false
        this.commit(g)
      }
    }
    if (this.walk) {
      const walk = this.walk
      const index = walk.u >= 0.5 && walk.index + 1 < walk.path.length ? walk.index + 1 : walk.index
      this.walker = walk.path[index]
      this.walk = null
    }
    this.pendingGoal = null
    this.queuedGoal = null
    if (this.phase === 'enter') this.finishTravel(this.nextRoom)
    else if (this.phase === 'leave') this.finishTravel(this.nextRoom)
    else if (this.phase === 'arrive') this.phase = 'play'
    this.sound.grind(0)
    this.sound.scrape(0)
    this.persist()
  }

  // ---------------------------------------------------------------- input

  pointerDown(pointerId: number, x: number, y: number, t: number): void {
    this.sound.unlock()
    for (const intent of this.input.down(pointerId, { x, y }, t)) this.handle(intent)
  }

  pointerMove(pointerId: number, x: number, y: number, t: number): void {
    for (const intent of this.input.move(pointerId, { x, y }, t)) this.handle(intent)
  }

  pointerUp(pointerId: number, x: number, y: number, t: number): void {
    for (const intent of this.input.up(pointerId, { x, y }, t)) this.handle(intent)
  }

  pointerCancel(pointerId: number): void {
    for (const intent of this.input.lost(pointerId)) this.handle(intent)
  }

  hitTest(at: Point): Target {
    const ringSlot = { x: 0, y: 0, scale: 0, depth: 0 }
    let best = -1
    let bestDepth = -Infinity
    for (let i = 0; i < this.rooms.length; i++) {
      this.ringSlot(i, ringSlot)
      const radius = Math.max(30, this.frame.ring.size * 0.55 * ringSlot.scale)
      if (Math.hypot(at.x - ringSlot.x, at.y - ringSlot.y) < radius && ringSlot.depth > bestDepth) {
        best = i
        bestDepth = ringSlot.depth
      }
    }
    if (best >= 0) return { kind: 'ring', room: best }
    if (this.phase !== 'play') return { kind: 'sky' }
    const scale = this.projector.scale
    const w = this.wanderer.pose
    this.projector.toScreen(w.x, w.y + 0.3, w.z, this.screen)
    if (Math.hypot(at.x - this.screen.x, at.y - this.screen.y) < Math.max(26, scale * 0.3)) return { kind: 'wanderer' }
    const b = this.bird.pose
    this.projector.toScreen(b.x, b.y + 0.45, b.z, this.screen)
    const birdHit = Math.hypot(at.x - this.screen.x, at.y - this.screen.y) < Math.max(30, scale * 0.42)
    if (birdHit && this.info.birdGroup >= 0) return { kind: 'group', group: this.info.birdGroup, tile: null, handle: true }
    if (birdHit) return { kind: 'bird' }
    const origin = this.projector.rayOrigin(at.x, at.y, this.scratch2)
    const hit = castRay(this.layout.solid, origin, this.hit)
    // Depth along the view ray: larger is nearer the camera.
    const hitDepth = !hit ? -Infinity : hit.face === 0 ? hit.x + 1 - origin[0] : hit.face === 2 ? hit.y + 1 - origin[1] : hit.z + 1 - origin[2]
    const groups = this.info.spec.groups
    for (let g = 0; g < groups.length; g++) {
      if (g === this.info.birdGroup) continue
      const depth = this.handleDepth(g, at, origin)
      if (depth !== null && depth >= hitDepth - 0.05) return { kind: 'group', group: g, tile: null, handle: true }
    }
    const d = this.info.door
    this.projector.toScreen(d[0], d[1] + 0.55, d[2], this.screen)
    if (Math.abs(at.x - this.screen.x) < scale * 0.36 && Math.abs(at.y - this.screen.y) < scale * 0.6) return { kind: 'door' }
    if (!hit) return { kind: 'sky' }
    const cell = this.cellAt(hit.x, hit.y, hit.z)
    const tile = this.pickTile(at, hit)
    const group = cell >= 0 ? this.info.room.cells[cell].group : -1
    if (group >= 0) return { kind: 'group', group, tile, handle: false }
    return tile !== null ? { kind: 'tile', tile } : { kind: 'stone' }
  }

  /** If the touch lands on a group's wheel or grip, how near the camera that spot is; otherwise null. */
  private handleDepth(group: number, at: Point, origin: MutableVec3): number | null {
    const def = this.info.spec.groups[group]
    const [hx, hy, hz] = this.info.handles[group]
    if (def.kind === 'turn') {
      const axis = def.axis === 'x' ? 0 : def.axis === 'y' ? 1 : 2
      const t = this.info.handles[group][axis] - origin[axis]
      const qx = origin[0] + t - hx
      const qy = origin[1] + t - hy
      const qz = origin[2] + t - hz
      const radial = axis === 0 ? Math.hypot(qy, qz) : axis === 1 ? Math.hypot(qx, qz) : Math.hypot(qx, qy)
      return radial < this.info.handleRadius[group] + 0.22 ? t : null
    }
    placePoint(def, this.springs[group].value, hx, hy, hz, this.scratch)
    this.projector.toScreen(this.scratch[0], this.scratch[1], this.scratch[2], this.screen)
    if (Math.hypot(at.x - this.screen.x, at.y - this.screen.y) > Math.max(32, this.projector.scale * 0.4)) return null
    return (this.scratch[0] - origin[0] + this.scratch[1] - origin[1] + this.scratch[2] - origin[2]) / 3 + GRIP_REACH
  }

  private cellAt(x: number, y: number, z: number): number {
    const positions = this.layout.positions
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      if (p[0] === x && p[1] === y && p[2] === z) return i
    }
    return -1
  }

  private pickTile(at: Point, hit: RayHit): number | null {
    const tiles = this.layout.tiles
    if (hit.face === 2) {
      for (const tile of tiles) if (tile.x === hit.x && tile.y === hit.y && tile.z === hit.z) return tile.id
    }
    let best: number | null = null
    let bestDistance = this.projector.scale * 0.8
    for (const tile of tiles) {
      this.projector.toScreen(tile.x + 0.5, tile.top, tile.z + 0.5, this.screen)
      const distance = Math.hypot(at.x - this.screen.x, at.y - this.screen.y)
      if (distance < bestDistance) {
        best = tile.id
        bestDistance = distance
      }
    }
    return best
  }

  private handle(intent: Intent<Target>): void {
    const now = this.now
    this.scheduler.touch(now)
    this.frame.hand.visible = false
    const target = intent.target
    switch (intent.type) {
      case 'press':
        this.pressSound(target)
        return
      case 'tap':
        this.tap(target, intent.at)
        return
      case 'dragStart':
        if (target.kind === 'group' && this.phase === 'play') this.grab(intent.pointerId, target.group, intent.at)
        return
      case 'dragMove':
        if (this.drag && this.drag.pointerId === intent.pointerId) this.dragTo(intent.at)
        return
      case 'dragEnd':
        if (this.drag && this.drag.pointerId === intent.pointerId) this.release(this.drag.velocity)
        return
      case 'cancel':
        if (this.drag && this.drag.pointerId === intent.pointerId) this.release(0)
        return
      default: {
        const unreachable: never = intent
        return unreachable
      }
    }
  }

  private pressSound(target: Target): void {
    switch (target.kind) {
      case 'ring':
        this.sound.ringTap(target.room)
        return
      case 'group':
        if (target.group === this.info.birdGroup) this.sound.chirp('peep')
        else if (target.handle) this.sound.grip()
        else this.sound.tock()
        return
      case 'wanderer':
      case 'bird':
        // They answer on release, each with the sound of the reaction it picks.
        return
      case 'door':
      case 'tile':
      case 'stone':
        this.sound.tock()
        return
      case 'sky':
        this.sound.air()
        return
      default: {
        const unreachable: never = target
        return unreachable
      }
    }
  }

  private tap(target: Target, at: Point): void {
    const now = this.now
    switch (target.kind) {
      case 'ring':
        if (target.room === this.current || this.phase !== 'play') this.frame.ring.pulse[target.room] = 1
        else this.travel(target.room, false)
        return
      case 'wanderer':
        this.sound.greet(this.wanderer.greet(now))
        this.bird.lookAt(this.wanderer.pose.x, this.wanderer.pose.y + 0.4, this.wanderer.pose.z, now)
        return
      case 'bird':
        this.sound.poke(this.bird.poke(now))
        this.bird.lookAt(this.bird.pose.x + 3, this.bird.pose.y + 3, this.bird.pose.z + 3, now, 0.9)
        this.wanderer.aim(this.bird.pose.x, this.bird.pose.y + 0.4, this.bird.pose.z, now, 0.9)
        return
      case 'group':
        if (target.group === this.info.birdGroup) {
          this.sound.poke(this.bird.poke(now))
          return
        }
        if (target.tile !== null && !target.handle) {
          this.ripple(at, true)
          this.goTo(target.tile, null)
          return
        }
        // A tap on a handle nudges it and lets go: it moves, but only a drag turns it.
        if (!this.drag && !this.settling[target.group]) {
          this.springs[target.group].velocity += 1.6
          this.settling[target.group] = true
          this.impact[target.group] = true
          this.settleSpring(target.group)
        }
        return
      case 'door':
        this.ripple(at, true)
        this.goTo(this.info.room.doorTile, this.doorAim())
        return
      case 'tile':
        this.ripple(at, true)
        this.goTo(target.tile, null)
        return
      case 'stone':
      case 'sky':
        this.ripple(at, false)
        this.birdGlance(at)
        return
      default: {
        const unreachable: never = target
        return unreachable
      }
    }
  }

  private ripple(at: Point, strong: boolean): void {
    const ripple = this.frame.ripples[this.rippleCursor]
    this.rippleCursor = (this.rippleCursor + 1) % RIPPLES
    ripple.x = at.x
    ripple.y = at.y
    ripple.age = 0
    ripple.strong = strong
  }

  /** The bird turns its head to where a touch landed on nothing in particular: it is curious, not a verdict. */
  private birdGlance(at: Point): void {
    const o = this.projector.rayOrigin(at.x, at.y, this.scratch2)
    const b = this.bird.pose
    const s = (o[0] - b.x + (o[1] - b.y) + (o[2] - b.z)) / 3
    this.bird.lookAt(o[0] - s, o[1] - s, o[2] - s, this.now, 0.8)
  }

  private doorAim(): Vec3 {
    const d = this.info.door
    return [d[0], d[1] + 0.6, d[2]]
  }

  // ---------------------------------------------------------------- walking

  private tileById(layout: Layout, id: number): Tile | null {
    const index = layout.byId.get(id)
    return index === undefined ? null : layout.tiles[index]
  }

  private groupsSettled(): boolean {
    return !this.drag && !this.hop.active && !this.settling.some(Boolean)
  }

  private goTo(tile: number, wonder: Vec3 | null): void {
    if (this.phase !== 'play') return
    if (!this.groupsSettled()) {
      this.queuedGoal = { tile, wonder }
      return
    }
    if (this.walk) {
      this.pendingGoal = { tile, wonder }
      return
    }
    this.startWalk(this.walker, tile, wonder, true)
  }

  private startWalk(from: number, to: number, wonder: Vec3 | null, anticipate: boolean): void {
    const layout = this.layout
    let goal = to
    let curious = wonder
    if (!connected(layout, from, to)) {
      this.wish = to
      const target = this.tileById(layout, to)
      const aim: Vec3 = curious ?? (target ? [target.x + 0.5, target.top, target.z + 0.5] : this.doorAim())
      const nearest = nearestReachable(layout, from, aim)
      if (nearest === null) return
      goal = nearest
      curious = aim
    } else {
      this.wish = null
      if (to === this.info.room.doorTile) curious = null
    }
    const path = findPath(layout, from, goal)
    if (!path) return
    if (path.length === 1) {
      if (goal === this.info.room.doorTile && connected(layout, from, this.info.room.doorTile)) this.enterDoor()
      else if (curious) this.wonderAt(curious)
      return
    }
    this.walk = { path, index: 0, u: 0, delay: anticipate ? ANTICIPATION : 0, layout, wonder: curious }
    if (anticipate) this.wanderer.anticipate(this.now)
    this.faceStep(path[0], path[1])
  }

  /** The way to the child's wish has opened: the wanderer notices, then goes on its own. */
  private followWish(): void {
    const wish = this.wish
    if (wish === null || this.walk || this.phase !== 'play' || !this.groupsSettled() || !connected(this.layout, this.walker, wish)) {
      this.wishOpenAt = -1
      return
    }
    if (this.wishOpenAt < 0) {
      this.wishOpenAt = this.now
      const tile = this.tileById(this.layout, wish)
      if (tile) this.wanderer.aim(tile.x + 0.5, tile.top + 0.6, tile.z + 0.5, this.now, WISH_BEAT + 0.3)
      return
    }
    if (this.now - this.wishOpenAt < WISH_BEAT) return
    this.wishOpenAt = -1
    this.startWalk(this.walker, wish, null, true)
  }

  private wonderAt(target: Vec3): void {
    this.wanderer.aim(target[0], target[1], target[2], this.now, 1.9)
    this.bird.lookAt(target[0], target[1], target[2], this.now, 1.6)
    this.sound.wonder()
  }

  private faceStep(fromId: number, toId: number): void {
    const layout = this.walk ? this.walk.layout : this.layout
    const a = this.tileById(layout, fromId)
    const b = this.tileById(layout, toId)
    if (!a || !b) return
    this.wanderer.face(Math.atan2(b.kx - a.kx, b.kz - a.kz))
  }

  /** Render position on one step of a walk: continuous on screen and in depth across perspective seams. */
  private stepPosition(a: Tile, b: Tile, u: number, out: MutableVec3): MutableVec3 {
    const dkx = b.kx - a.kx
    const dkz = b.kz - a.kz
    const ax = a.x + 0.5
    const az = a.z + 0.5
    const bx = b.x + 0.5
    const bz = b.z + 0.5
    const sAx = ax + dkx * 0.5
    const sAz = az + dkz * 0.5
    const sBy = b.top
    const k = sBy - a.top
    let x: number
    let y: number
    let z: number
    let offset = 0
    if (u < 0.5) {
      const t = u / 0.5
      x = ax + (sAx - ax) * t
      y = a.top
      z = az + (sAz - az) * t
      if (k > 0) offset = k * smoothstep(0.4, 1, t)
    } else {
      const t = (u - 0.5) / 0.5
      const sBx = bx - dkx * 0.5
      const sBz = bz - dkz * 0.5
      x = sBx + (bx - sBx) * t
      y = b.top
      z = sBz + (bz - sBz) * t
      if (k < 0) offset = -k * (1 - smoothstep(0, 0.6, t))
    }
    out[0] = x + offset
    out[1] = y + offset
    out[2] = z + offset
    return out
  }

  /** Where the wanderer's feet are when it stands on a tile (riding any group under it). */
  private standPosition(tileId: number, out: MutableVec3): MutableVec3 {
    const cell = this.info.room.cells[tileCell(tileId)]
    const n = FACE_NORMALS[tileFace(tileId)]
    const at = cell.def.at
    const group = cell.group >= 0 ? this.info.spec.groups[cell.group] : null
    const value = cell.group >= 0 ? this.springs[cell.group].value : 0
    placePoint(group, value, at[0] + 0.5 + n[0] * 0.5, at[1] + 0.5 + n[1] * 0.5, at[2] + 0.5 + n[2] * 0.5, out)
    if (cell.group >= 0) out[1] += this.dips[cell.group].value
    if (cell.group === this.info.birdGroup && this.hop.active) out[1] += this.hopHeight()
    return out
  }

  private updateWalk(dt: number): void {
    const walk = this.walk
    if (!walk) return
    if (walk.delay > 0) {
      walk.delay -= dt
      return
    }
    const before = walk.u
    walk.u += dt * WALK_SPEED
    const a = walk.path[walk.index]
    const b = walk.path[walk.index + 1]
    if (before < 0.5 && walk.u >= 0.5 && isPerspectiveStep(walk.layout, a, b)) {
      this.sound.shimmer()
      const tile = this.tileById(walk.layout, a)
      const next = this.tileById(walk.layout, b)
      if (tile && next) {
        this.stepPosition(tile, next, 0.5, this.scratch2)
        this.sparkle(this.scratch2[0], this.scratch2[1], this.scratch2[2])
      }
    }
    while (walk.u >= 1) {
      walk.u -= 1
      walk.index += 1
      this.walker = walk.path[walk.index]
      const last = walk.index >= walk.path.length - 1
      if (last || this.drag || this.pendingGoal) {
        this.walk = null
        if (this.pendingGoal && !this.drag) {
          const goal = this.pendingGoal
          this.pendingGoal = null
          this.startWalk(this.walker, goal.tile, goal.wonder, false)
          if (this.walk) return
        }
        this.arrived(last ? walk.wonder : null)
        return
      }
      this.faceStep(walk.path[walk.index], walk.path[walk.index + 1])
    }
  }

  private arrived(wonder: Vec3 | null): void {
    this.wanderer.land()
    this.hintDirty = true
    this.persist()
    if (this.walker === this.info.room.doorTile) {
      this.enterDoor()
      return
    }
    if (wonder) this.wonderAt(wonder)
    if (this.drag && !this.drag.active) this.activate(this.drag)
  }

  // ---------------------------------------------------------------- turning and sliding

  private validFor(arrangement: readonly number[], group: number): boolean {
    const layout = this.info.cache.get(arrangement)
    return !overlaps(layout) && isWalkable(layout, this.walker) && canMoveUnder(this.info.room, group, this.walker)
  }

  /** How far a group may go from where it is now, in whole steps (unwrapped for turns). */
  private allowedRange(group: number): { lo: number; hi: number } {
    const def = this.info.spec.groups[group]
    const range = stateRange(def)
    const base = this.springs[group].target
    let hi = 0
    let lo = 0
    let arrangement: readonly number[] = this.arrangement
    for (let i = 0; i < (range.wraps ? 3 : range.max - range.min); i++) {
      const next = stepArrangement(this.info.room, arrangement, group, 1)
      if (!next || !this.validFor(next, group)) break
      hi += 1
      arrangement = next
    }
    arrangement = this.arrangement
    for (let i = 0; i < (range.wraps ? 3 : range.max - range.min); i++) {
      const next = stepArrangement(this.info.room, arrangement, group, -1)
      if (!next || !this.validFor(next, group)) break
      lo -= 1
      arrangement = next
    }
    if (range.wraps && hi === 3) return { lo: -Infinity, hi: Infinity }
    return { lo: base + lo, hi: base + hi }
  }

  private grab(pointerId: number, group: number, at: Point): void {
    if (this.drag) return
    const def = this.info.spec.groups[group]
    const kind = def.kind === 'turn' ? 'turn' : def.bird ? 'bird' : 'slide'
    const drag: Drag = {
      pointerId,
      group,
      kind,
      active: false,
      base: 0,
      lo: 0,
      hi: 0,
      accum: 0,
      lastAngle: null,
      startX: at.x,
      startY: at.y,
      lastX: at.x,
      lastY: at.y,
      axisX: 0,
      axisY: 0,
      axisLen2: 1,
      raw: 0,
      prevRaw: 0,
      prevT: this.now,
      velocity: 0,
      pushed: false,
    }
    this.drag = drag
    this.queuedGoal = null
    this.pendingGoal = null
    if (this.walk) return
    this.activate(drag)
  }

  private activate(drag: Drag): void {
    const group = drag.group
    const spring = this.springs[group]
    if (this.hop.active && drag.kind !== 'bird') {
      this.hop.goal = this.hop.to
      this.finishHop()
    }
    if (this.settling[group]) {
      this.settling[group] = false
      this.commit(group)
    }
    drag.active = true
    drag.base = spring.target
    const range = this.allowedRange(group)
    drag.lo = range.lo
    drag.hi = range.hi
    drag.accum = 0
    drag.lastAngle = null
    drag.startX = drag.lastX
    drag.startY = drag.lastY
    drag.raw = drag.base
    drag.prevRaw = drag.base
    drag.prevT = this.now
    const def = this.info.spec.groups[group]
    if (def.kind === 'slide') {
      const axis = axisVector(def.axis)
      const s = this.projector.scale
      drag.axisX = (axis[0] - axis[2]) * Math.SQRT1_2 * s
      drag.axisY = -((2 * axis[1] - axis[0] - axis[2]) / Math.sqrt(6)) * s
      drag.axisLen2 = drag.axisX * drag.axisX + drag.axisY * drag.axisY
    }
    spring.stiffness = 260
    spring.damping = 30
    this.frame.version += 1
    this.dragTo({ x: drag.lastX, y: drag.lastY })
  }

  private dragTo(at: Point): void {
    const drag = this.drag
    if (!drag) return
    drag.lastX = at.x
    drag.lastY = at.y
    if (!drag.active) return
    const def = this.info.spec.groups[drag.group]
    if (def.kind === 'turn') {
      const angle = turnAngle(this.projector, def, at.x, at.y, this.scratch)
      if (angle === null) return
      if (drag.lastAngle !== null) drag.accum += wrap(angle - drag.lastAngle) / (Math.PI / 2)
      drag.lastAngle = angle
    } else {
      drag.accum = ((at.x - drag.startX) * drag.axisX + (at.y - drag.startY) * drag.axisY) / drag.axisLen2
    }
    const raw = drag.base + drag.accum
    const dt = this.now - drag.prevT
    if (dt > 0.004) {
      drag.velocity = drag.velocity * 0.4 + ((raw - drag.prevRaw) / dt) * 0.6
      drag.prevRaw = raw
      drag.prevT = this.now
    }
    drag.raw = raw
    let v = raw
    if (v > drag.hi) v = drag.hi + rubber(v - drag.hi)
    else if (v < drag.lo) v = drag.lo - rubber(drag.lo - v)
    const pushing = raw > drag.hi + 0.22 || raw < drag.lo - 0.22
    if (pushing && !drag.pushed) {
      this.sound.bump()
      if (drag.kind === 'bird') {
        this.bird.ruffle(this.now)
        this.sound.chirp('huff')
      }
    }
    drag.pushed = pushing
    if (drag.kind === 'bird') {
      this.hop.goal = Math.max(drag.lo, Math.min(drag.hi, Math.round(v)))
      if (!this.hop.active && this.hop.goal !== this.springs[drag.group].target) this.startHop(drag.group, this.hop.goal)
      return
    }
    const detent = drag.kind === 'turn' ? TURN_DETENT : SLIDE_DETENT
    this.springs[drag.group].target = v - (detent * Math.sin(2 * Math.PI * v)) / (2 * Math.PI)
  }

  private release(velocity: number): void {
    const drag = this.drag
    this.drag = null
    if (!drag || !drag.active) return
    const group = drag.group
    this.frame.version += 1
    if (drag.kind === 'bird') return
    const projected = drag.raw + Math.max(-0.7, Math.min(0.7, velocity * 0.14))
    const final = Math.max(drag.lo, Math.min(drag.hi, Math.round(projected)))
    this.springs[group].target = final
    this.settling[group] = true
    this.impact[group] = true
    this.settleSpring(group)
  }

  private settleSpring(group: number): void {
    const spring = this.springs[group]
    // Released: heavy, underdamped, so it lands with a small overshoot.
    spring.stiffness = 150
    spring.damping = 11
  }

  private startHop(group: number, stop: number): void {
    const from = this.springs[group].target
    const to = from + Math.sign(stop - from)
    this.hop.active = true
    this.hop.from = from
    this.hop.to = to
    this.hop.t = 0
    this.hop.wait = HOP_CROUCH
    this.bird.crouch(this.now)
    this.sound.chirp('hop')
  }

  private hopHeight(): number {
    return this.hop.wait > 0 ? 0 : Math.sin(Math.PI * Math.min(1, this.hop.t)) * 0.5
  }

  private updateHop(dt: number): void {
    const hop = this.hop
    if (!hop.active) return
    const group = this.info.birdGroup
    if (hop.wait > 0) {
      hop.wait -= dt
      if (hop.wait <= 0) this.bird.flap(this.now, HOP_SECONDS)
      return
    }
    hop.t += dt / HOP_SECONDS
    const k = Math.min(1, hop.t)
    const eased = k * k * (3 - 2 * k)
    this.springs[group].snap(hop.from + (hop.to - hop.from) * eased)
    if (hop.t >= 1) {
      this.finishHop()
      // The bird keeps hopping to where the child sent it, even after the finger lifts.
      if (hop.goal !== this.springs[group].target) this.startHop(group, hop.goal)
    }
  }

  private finishHop(): void {
    const group = this.info.birdGroup
    this.hop.active = false
    this.springs[group].snap(this.hop.to)
    this.bird.land()
    this.commit(group)
  }

  private updateGroups(dt: number): void {
    const groups = this.info.spec.groups
    let grind = 0
    let scrape = 0
    for (let g = 0; g < groups.length; g++) {
      const spring = this.springs[g]
      const def = groups[g]
      if (g === this.info.birdGroup) {
        this.frame.values[g] = spring.value
        continue
      }
      const target = spring.target
      if (!this.drag || this.drag.group !== g) spring.target = target + this.ghostOffset(g)
      const before = spring.value
      spring.step(dt)
      spring.target = target
      const speed = Math.abs(spring.velocity)
      if (def.kind === 'turn') grind = Math.max(grind, Math.min(1, speed / 2.4))
      else scrape = Math.max(scrape, Math.min(1, speed / 3))
      const notch = Math.round(spring.value)
      if (notch !== this.notchAt[g]) {
        this.notchAt[g] = notch
        if (Math.abs(spring.value - before) > 1e-4) this.sound.notch()
      }
      if (this.settling[g]) {
        if (this.impact[g] && (before - target) * (spring.value - target) <= 0 && Math.abs(before - spring.value) > 1e-5) {
          this.impact[g] = false
          const weight = Math.min(1, 0.35 + speed / 3)
          this.sound.settle(weight)
          this.dips[g].velocity -= DIP_KICK * weight
        }
        if (Math.abs(spring.value - target) < 0.003 && speed < 0.03) {
          spring.snap(target)
          this.settling[g] = false
          this.commit(g)
        }
      }
      this.frame.values[g] = spring.value
      const dip = this.dips[g]
      if (dip.value !== 0 || dip.velocity !== 0) {
        dip.step(dt)
        if (Math.abs(dip.value) < 1e-4 && Math.abs(dip.velocity) < 1e-3) dip.snap(0)
      }
      this.frame.dips[g] = dip.value
    }
    this.sound.grind(grind)
    this.sound.scrape(scrape)
  }

  /** The ghost hand's demonstration nudges the handle it shows, a little, and lets it spring back. */
  private ghostOffset(group: number): number {
    const hint = this.hint
    if (!hint || hint.kind !== 'move' || hint.group !== group || this.ghost <= 0) return 0
    return hint.dir * 0.16 * this.ghost
  }

  private commit(group: number): void {
    const def = this.info.spec.groups[group]
    const spring = this.springs[group]
    const range = stateRange(def)
    let logical = Math.round(spring.target)
    if (range.wraps) {
      const shift = 4 * Math.floor(spring.target / 4)
      if (shift !== 0) {
        spring.value -= shift
        spring.target -= shift
        this.notchAt[group] -= shift
      }
      logical = mod4(spring.target)
    }
    this.frame.version += 1
    if (logical === this.arrangement[group]) return
    const before = this.layout
    const next = [...this.arrangement]
    next[group] = logical
    this.arrangement = next
    this.layout = this.info.cache.get(next)
    this.hintDirty = true
    this.celebrateNewJoins(before)
    this.persist()
  }

  /** A perspective join that just appeared within the wanderer's reach glints: the "aha" is made visible. */
  private celebrateNewJoins(before: Layout): void {
    const layout = this.layout
    const index = layout.byId.get(this.walker)
    if (index === undefined) return
    const component = layout.component[index]
    for (let i = 0; i < layout.tiles.length; i++) {
      if (layout.component[i] !== component) continue
      for (const edge of layout.edges[i]) {
        if (!edge.perspective || edge.to < i) continue
        const a = layout.tiles[i]
        const b = layout.tiles[edge.to]
        if (isPerspectiveStep(before, a.id, b.id)) continue
        this.stepPosition(a, b, 0.5, this.scratch2)
        this.sparkle(this.scratch2[0], this.scratch2[1], this.scratch2[2])
        this.sound.shimmer()
        return
      }
    }
  }

  private sparkle(x: number, y: number, z: number): void {
    const sparkle = this.frame.sparkle
    sparkle.x = x
    sparkle.y = y
    sparkle.z = z
    sparkle.age = 0
  }

  // ---------------------------------------------------------------- the door and travel

  private enterDoor(): void {
    if (this.phase !== 'play') return
    this.phase = 'enter'
    this.phaseT = 0
    this.nextRoom = (this.current + 1) % this.rooms.length
    this.viaDoor = true
    this.doorOpen.target = 1
    this.sound.door()
    this.bird.flap(this.now, 0.9)
    this.bird.lookAt(this.info.door[0], this.info.door[1] + 0.6, this.info.door[2], this.now, 1.5)
    this.sound.chirp('peep')
    this.wanderer.face(Math.atan2(-1, -1))
  }

  private travel(room: number, viaDoor: boolean): void {
    if (this.phase !== 'play') return
    if (this.drag) this.release(0)
    this.walk = null
    this.pendingGoal = null
    this.queuedGoal = null
    this.wish = null
    this.viaDoor = viaDoor
    this.nextRoom = room
    this.phase = 'leave'
    this.phaseT = 0
    this.sound.travel()
    this.persist()
  }

  private finishTravel(room: number): void {
    if (this.viaDoor) this.state.rooms[this.info.spec.key] = startSave(this.info.room)
    this.viaDoor = false
    this.loadRoom(room)
    this.phase = 'arrive'
    this.phaseT = 0
    this.persist()
  }

  private loadRoom(index: number): void {
    this.current = index
    this.info = this.rooms[index]
    this.state.current = this.info.spec.key
    const save = this.state.rooms[this.info.spec.key] ?? startSave(this.info.room)
    this.arrangement = [...save.groups]
    this.layout = this.info.cache.get(this.arrangement)
    this.walker = save.walker
    this.walk = null
    this.drag = null
    this.hop.active = false
    this.hop.goal = this.info.birdGroup >= 0 ? this.arrangement[this.info.birdGroup] : 0
    for (let g = 0; g < MAX_GROUPS; g++) {
      const value = g < this.arrangement.length ? this.arrangement[g] : 0
      this.springs[g].snap(value)
      this.settling[g] = false
      this.impact[g] = false
      this.notchAt[g] = Math.round(value)
      this.frame.values[g] = value
      this.dips[g].snap(0)
      this.frame.dips[g] = 0
    }
    this.doorOpen.snap(0)
    this.hint = null
    this.hintDirty = true
    this.demoPath = null
    this.frame.room = index
    this.frame.version += 1
    if (this.fits.length) this.projector.set(this.width, this.height, this.fits[index])
    this.scheduler.reopen(this.now)
    this.standPosition(this.walker, this.scratch)
    this.wanderer.arrive(this.scratch[0], this.scratch[1], this.scratch[2])
    this.wanderer.face(Math.PI / 4)
    const unwrapped = this.ringTurn.target + wrapRing(index - this.ringTurn.target, this.rooms.length)
    this.ringTurn.target = unwrapped
  }

  private updatePhase(dt: number): void {
    this.phaseT += dt
    const t = this.phaseT
    const frame = this.frame
    frame.phase = this.phase
    switch (this.phase) {
      case 'play':
        frame.fade = 0
        frame.drop = 0
        this.wanderer.pose.alpha = 1
        return
      case 'enter': {
        frame.fade = 0
        frame.drop = 0
        if (t >= 0.75 && t - dt < 0.75) this.wanderer.lookBack(this.now)
        if (t >= 0.95 && t - dt < 0.95) this.sound.enter()
        this.wanderer.pose.alpha = 1 - smoothstep(0.95, 1.4, t)
        if (t >= ENTER_SECONDS) {
          this.phase = 'leave'
          this.phaseT = 0
          this.sound.travel()
        }
        return
      }
      case 'leave': {
        const k = smoothstep(0, LEAVE_SECONDS, t)
        frame.fade = k
        frame.drop = -0.6 * k * k
        if (!this.viaDoor) this.wanderer.pose.alpha = 1 - k
        else this.wanderer.pose.alpha = 0
        if (t >= LEAVE_SECONDS) this.finishTravel(this.nextRoom)
        return
      }
      case 'arrive': {
        const k = smoothstep(0, ARRIVE_SECONDS * 0.8, t)
        frame.fade = 1 - k
        frame.drop = 0.5 * (1 - k) * (1 - k)
        this.wanderer.pose.alpha = smoothstep(0.3, 0.55, t)
        if (t >= 0.62 && t - dt < 0.62) {
          this.standPosition(this.walker, this.scratch)
          this.wanderer.arrive(this.scratch[0], this.scratch[1], this.scratch[2])
          this.sound.arrive()
          this.bird.lookAt(this.scratch[0], this.scratch[1] + 0.4, this.scratch[2], this.now, 1.2)
        }
        if (t >= ARRIVE_SECONDS) {
          this.phase = 'play'
          this.phaseT = 0
          this.scheduler.reopen(this.now)
        }
        return
      }
      default: {
        const unreachable: never = this.phase
        return unreachable
      }
    }
  }

  // ---------------------------------------------------------------- guidance

  private updateHint(): void {
    const cache = this.info.cache
    if (!cache.complete) {
      cache.fillOne()
      return
    }
    if (this.hintDirty && this.groupsSettled() && !this.walk) {
      this.hintDirty = false
      this.hint = nextHint(cache, this.arrangement, this.walker)
      this.demoPath = null
    }
    // Warm the other dioramas a little at a time so travel never stalls.
    const other = this.rooms[this.warmRoom]
    if (!other.cache.fillOne()) this.warmRoom = (this.warmRoom + 1) % this.rooms.length
  }

  private glowTarget(): void {
    const glow = this.frame.glow
    const hint = this.hint
    glow.kind = 'none'
    glow.group = -1
    if (!hint || this.phase !== 'play') return
    switch (hint.kind) {
      case 'door': {
        const d = this.info.door
        glow.kind = 'door'
        glow.x = d[0]
        glow.y = d[1] + 0.6
        glow.z = d[2]
        return
      }
      case 'move': {
        const def = this.info.spec.groups[hint.group]
        if (hint.group === this.info.birdGroup) {
          glow.x = this.bird.pose.x
          glow.y = this.bird.pose.y + 0.5
          glow.z = this.bird.pose.z
        } else {
          const [hx, hy, hz] = this.info.handles[hint.group]
          placePoint(def, this.springs[hint.group].value, hx, hy, hz, this.scratch)
          glow.x = this.scratch[0]
          glow.y = this.scratch[1]
          glow.z = this.scratch[2]
        }
        glow.kind = 'group'
        glow.group = hint.group
        return
      }
      case 'walk': {
        const tile = this.tileById(this.layout, hint.tile)
        if (!tile) return
        glow.kind = 'tile'
        glow.x = tile.x + 0.5
        glow.y = tile.top
        glow.z = tile.z + 0.5
        return
      }
      default: {
        const unreachable: never = hint
        return unreachable
      }
    }
  }

  private buildDemo(): DemoPath | null {
    const hint = this.hint
    if (!hint) return null
    const p = this.projector
    const point = (x: number, y: number, z: number): Point => {
      const out = { x: 0, y: 0 }
      p.toScreen(x, y, z, out)
      return out
    }
    switch (hint.kind) {
      case 'door': {
        const d = this.info.door
        return { kind: 'tap', at: point(d[0], d[1] + 0.5, d[2]) }
      }
      case 'walk': {
        const tile = this.tileById(this.layout, hint.tile)
        return tile ? { kind: 'tap', at: point(tile.x + 0.5, tile.top, tile.z + 0.5) } : null
      }
      case 'move': {
        const def = this.info.spec.groups[hint.group]
        if (def.kind === 'slide') {
          const axis = axisVector(def.axis)
          const from =
            hint.group === this.info.birdGroup
              ? ([this.bird.pose.x, this.bird.pose.y + 0.45, this.bird.pose.z] as const)
              : (() => {
                  const [gx, gy, gz] = this.info.handles[hint.group]
                  placePoint(def, this.springs[hint.group].value, gx, gy, gz, this.scratch)
                  return [this.scratch[0], this.scratch[1], this.scratch[2]] as const
                })()
          const reach = hint.group === this.info.birdGroup ? 0.7 : 0.55
          return {
            kind: 'drag',
            points: [point(from[0], from[1], from[2]), point(from[0] + axis[0] * hint.dir * reach, from[1] + axis[1] * hint.dir * reach, from[2] + axis[2] * hint.dir * reach)],
          }
        }
        const [hx, hy, hz] = this.info.handles[hint.group]
        const r = this.info.handleRadius[hint.group] * 0.92
        const rim: Vec3 = def.axis === 'y' ? [hx + r * 0.71, hy, hz + r * 0.71] : def.axis === 'x' ? [hx, hy + r * 0.71, hz + r * 0.71] : [hx + r * 0.71, hy + r * 0.71, hz]
        const pivotGroup = { ...def, pivot: [hx, hy, hz] as Vec3 }
        const points: Point[] = []
        for (let i = 0; i <= 6; i++) {
          placePoint(pivotGroup, (hint.dir * 0.42 * i) / 6, rim[0], rim[1], rim[2], this.scratch)
          points.push(point(this.scratch[0], this.scratch[1], this.scratch[2]))
        }
        return { kind: 'drag', points }
      }
      default: {
        const unreachable: never = hint
        return unreachable
      }
    }
  }

  private updateGuidance(): void {
    const now = this.now
    if (this.isBusy) this.scheduler.hold(now)
    const state = this.scheduler.update(now)
    this.glowTarget()
    const frame = this.frame
    frame.glow.strength = frame.glow.kind === 'none' ? 0 : state.glow
    frame.door.glow = 0.85 + 0.15 * Math.sin(now * 1.7) + (frame.glow.kind === 'door' ? state.glow * 0.5 : 0)
    const demo = state.demo
    this.ghost = 0
    frame.hand.visible = false
    if (demo !== null && this.hint && this.phase === 'play') {
      if (!this.demoWas || !this.demoPath) this.demoPath = this.buildDemo()
      if (this.demoPath) {
        handPose(this.demoPath, demo, frame.hand)
        frame.hand.visible = true
        if (this.demoPath.kind === 'drag') this.ghost = frame.hand.press * smoothstep(0.26, 0.6, demo) * (1 - smoothstep(0.7, 0.8, demo))
        if (!this.demoWas) {
          const glow = frame.glow
          this.bird.lookAt(glow.x, glow.y, glow.z, now, DEMO_SECONDS)
        }
      }
    }
    this.demoWas = demo !== null
    if (state.glow > 0.4 && frame.glow.kind !== 'none' && !this.bird.isLooking(now)) {
      this.bird.lookAt(frame.glow.x, frame.glow.y, frame.glow.z, now, 1.4)
    }
    const invite = state.invite
    if (invite !== null && !this.inviteWas && this.phase === 'play' && !this.walk) {
      const d = this.doorAim()
      const w = this.wanderer.pose
      this.wanderer.invite(d[0], d[1], d[2], now)
      this.bird.lookAt(w.x, w.y + 0.5, w.z, now, BIRD_FOLLOWS * INVITE_SECONDS)
      this.inviteFollowed = false
    }
    if (invite !== null && invite >= BIRD_FOLLOWS && !this.inviteFollowed) {
      const d = this.doorAim()
      this.bird.lookAt(d[0], d[1], d[2], now, 1.4)
      this.inviteFollowed = true
    }
    this.inviteWas = invite !== null
  }

  // ---------------------------------------------------------------- characters

  private updateWanderer(dt: number): void {
    const walk = this.walk
    const pose = this.wanderer.pose
    let walking = false
    let riding = false
    pose.tiltAxis = 0
    pose.tilt = 0
    if (this.phase === 'enter' && this.phaseT > 0.55) {
      const k = smoothstep(0.55, 1.35, this.phaseT)
      const top = this.info.doorTop
      this.scratch[0] = top[0] - 0.42 * k
      this.scratch[1] = top[1]
      this.scratch[2] = top[2] - 0.42 * k
      walking = k < 1
    } else if (walk && walk.delay <= 0) {
      const a = this.tileById(walk.layout, walk.path[walk.index])
      const b = this.tileById(walk.layout, walk.path[walk.index + 1])
      if (a && b) this.stepPosition(a, b, walk.u, this.scratch)
      walking = true
    } else {
      this.standPosition(this.walker, this.scratch)
      const group = this.info.room.cells[tileCell(this.walker)].group
      if (group >= 0 && group !== this.info.birdGroup) {
        const def = this.info.spec.groups[group]
        const spring = this.springs[group]
        riding = Math.abs(spring.velocity) > 0.02 || this.drag?.group === group
        if (def.kind === 'turn' && def.axis === 'y') {
          if (this.rideGroup === group) this.wanderer.turnWith((spring.value - this.rideValue) * (Math.PI / 2))
        } else if (def.kind === 'turn') {
          pose.tiltAxis = def.axis === 'x' ? 1 : 2
          pose.tilt = (spring.value - Math.round(spring.value)) * (Math.PI / 2)
        }
        this.rideValue = spring.value
      }
      this.rideGroup = group
    }
    let y = this.scratch[1]
    if (this.phase === 'arrive') y += Math.max(0, 0.7 * (1 - smoothstep(0.3, 0.62, this.phaseT)))
    this.wanderer.update(dt, this.now, this.scratch[0], y, this.scratch[2], walking, riding)
    if (this.wanderer.stepped) {
      const onBird = this.info.room.cells[tileCell(this.walker)].group === this.info.birdGroup && this.info.birdGroup >= 0
      this.sound.step(Math.round(this.now * 10) % 2, onBird)
    }
  }

  private updateBird(dt: number): void {
    const info = this.info
    const now = this.now
    let x: number
    let y: number
    let z: number
    let heading = Math.PI / 4
    let hovering = false
    if (info.birdGroup >= 0) {
      const def = info.spec.groups[info.birdGroup]
      const at = def.cells[0].at
      placePoint(def, this.springs[info.birdGroup].value, at[0] + 0.5, at[1], at[2] + 0.5, this.scratch2)
      x = this.scratch2[0]
      y = this.scratch2[1] + (this.hop.active ? this.hopHeight() : 0)
      z = this.scratch2[2]
      heading = 0
      const cx = Math.floor(x)
      const cz = Math.round(z - 0.5)
      hovering = !this.hop.active && !this.layout.solid.has(pack(cx, Math.round(this.scratch2[1]) - 1, cz))
      const onBird = info.room.cells[tileCell(this.walker)].group === info.birdGroup
      if (onBird && !this.onBirdBefore) {
        this.bird.stepOn()
        this.sound.chirp('huff')
      }
      if (onBird && this.wanderer.stepped) this.bird.stepOn()
      this.onBirdBefore = onBird
    } else {
      x = info.spec.perch[0]
      y = info.spec.perch[1]
      z = info.spec.perch[2]
      const w = this.wanderer.pose
      heading = Math.atan2(w.x - x, w.z - z) * 0.5 + Math.PI / 8
      if (this.walk && !this.bird.isLooking(now)) this.bird.lookAt(w.x, w.y + 0.4, w.z, now, 0.6)
    }
    let alpha = this.phase === 'leave' ? 1 - this.frame.fade : this.phase === 'arrive' ? smoothstep(0.2, 0.7, this.phaseT) : 1
    const following = this.phase === 'enter' || (this.phase === 'leave' && this.viaDoor)
    const s = !following ? 0 : this.phase === 'leave' ? 1 : smoothstep(FOLLOW_FROM, FOLLOW_TO, this.phaseT)
    if (s > 0) {
      const d = info.door
      heading = Math.atan2(d[0] - x, d[2] - z)
      x += (d[0] - x) * s
      y += (d[1] + 0.2 - y) * s + Math.sin(Math.PI * s) * 0.9
      z += (d[2] - z) * s
      hovering = s < 1
      alpha = this.phase === 'leave' ? 0 : 1 - smoothstep(FOLLOW_TO - 0.2, FOLLOW_TO, this.phaseT)
      if (this.phase === 'enter' && this.phaseT - dt < FOLLOW_FROM) this.sound.chirp('hop')
    }
    if (this.phase === 'arrive') y += 0.6 * (1 - smoothstep(0.2, 0.7, this.phaseT))
    this.bird.update(dt, now, x, y, z, heading, hovering || (this.phase === 'arrive' && this.phaseT < 0.7))
    this.bird.pose.alpha = alpha
    if (this.bird.flapped) this.sound.flap()
  }

  // ---------------------------------------------------------------- frame

  update(dt: number, now: number): void {
    this.now = now
    if (this.resumed) {
      this.resumed = false
      this.scheduler.hold(now)
    }
    const step = Math.min(Math.max(dt, 0), 0.05)
    this.updateHint()
    this.updateHop(step)
    this.updateGroups(step)
    this.updateWalk(step)
    if (this.queuedGoal && this.groupsSettled() && !this.walk) {
      const goal = this.queuedGoal
      this.queuedGoal = null
      this.goTo(goal.tile, goal.wonder)
    }
    this.followWish()
    this.updatePhase(step)
    this.updateGuidance()
    this.updateWanderer(step)
    this.updateBird(step)
    this.doorOpen.step(step)
    this.ringTurn.step(step)
    const frame = this.frame
    frame.door.open = Math.max(0, this.doorOpen.value)
    frame.ring.turn = this.ringTurn.value
    for (let i = 0; i < frame.ring.pulse.length; i++) frame.ring.pulse[i] = Math.max(0, frame.ring.pulse[i] - step * 2.2)
    for (const ripple of frame.ripples) ripple.age += step
    frame.sparkle.age += step
  }

  private persist(): void {
    this.state.current = this.info.spec.key
    this.state.rooms[this.info.spec.key] = { groups: [...this.arrangement], walker: this.walker }
    this.save(serialize(this.state))
  }
}

function wrapRing(delta: number, count: number): number {
  const half = count / 2
  let d = delta % count
  if (d > half) d -= count
  if (d < -half) d += count
  return d
}

export const SILENT: Sound = {
  unlock() {},
  setActive() {},
  dispose() {},
  tock() {},
  grip() {},
  air() {},
  ringTap() {},
  grind() {},
  scrape() {},
  notch() {},
  settle() {},
  bump() {},
  step() {},
  shimmer() {},
  door() {},
  enter() {},
  travel() {},
  arrive() {},
  chirp() {},
  flap() {},
  poke() {},
  greet() {},
  wonder() {},
}
