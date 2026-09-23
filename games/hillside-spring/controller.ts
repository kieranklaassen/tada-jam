import { CREATURES, Presence, wantedSpot, type CreatureKind } from './creatures'
import { incomingSide, solveFlow, type FlowResult } from './flow'
import { chooseHint, HintClock, nearestWater, type GuidanceState, type Hint, type Reach } from './guidance'
import { Gestures, type Intent, type Point } from './input'
import { buildable, cellIndex, COLS, PLOTS, ROWS, type Cell } from './layout'
import { MotionDirector, type PokeName } from './motion'
import { normalTurn, PIECE_WEIGHT, sluiceTurnFor, tapTurns, type Piece, type PieceKind } from './pieces'
import { SaveCadence } from './saveCadence'
import { pieceAt, serialize, type GardenState } from './state'
import { NEVER, retime, settled, WATER_SPEED, type TimedSegment } from './waterTiming'

// The garden's rules and clock. Touches arrive as intents; the controller
// decides what they mean (carry a piece, turn it, open a gate, harvest a
// plot, greet a creature), re-solves the water whenever the build changes,
// and steps everything that moves with time: water fronts, blooming plots,
// wheels, springy turns, visitors, and the idle guidance. Time only runs
// while the garden is attended, so nothing happens behind the child's back.

export const RACK: readonly PieceKind[] = ['bend', 'straight', 'split', 'sluice', 'wheel']
export const GROW_SECONDS = 6
export const MAX_HELD = 3
/** Seconds of stillness (untouched, nothing new flowing, growing, arriving or being shown) before the view may draw at half rate. */
export const REST_BEFORE_PACING = 20

/** What lies around the build grid: the sky and crest trees, the side meadows and bank, the creek. */
export type Scenery = 'sky' | 'meadow' | 'creek'

export type Target =
  | { kind: 'rack'; slot: number }
  | { kind: 'cell'; c: number; r: number }
  | { kind: 'creature'; which: CreatureKind }
  | { kind: 'spring' }
  | { kind: 'scenery'; where: Scenery; at: Point }
  | { kind: 'none' }

/** Screen-space questions only the view can answer. */
export type Picker = {
  pick(at: Point): Target
  /** The buildable cell a carried piece would land in, or null. */
  dropCell(at: Point): Cell | null
}

export type GardenSound = {
  unlock(): void
  setActive(active: boolean): void
  /** A bamboo knock; a `weight` over 1 (a heavy piece landing) adds a thump of body under it. */
  tok(pitch: number, weight?: number): void
  /** A sluice board lifted, or let fall; a falling board lands `landIn` seconds from now. */
  clunk(open: boolean, landIn: number): void
  lift(weight: number): void
  putBack(weight: number): void
  chime(step: number): void
  pop(): void
  rustle(): void
  splash(): void
  /** A touch that landed on the scenery rather than on anything that can be built or greeted. */
  scenery(where: Scenery): void
  /** A visitor sets off toward the garden. */
  arrive(kind: CreatureKind): void
  /** A visitor answers a poke, in a voice that fits the move it chose (move names are unique per visitor). */
  poke(move: PokeName): void
  flow(stream: number, wheels: number): void
  dispose(): void
}

export type Effect =
  | { type: 'place'; c: number; r: number; kind: PieceKind }
  | { type: 'putBack'; at: Point }
  | { type: 'harvest'; plot: number }
  | { type: 'bloom'; plot: number }
  | { type: 'rustle'; c: number; r: number }
  | { type: 'splash' }
  | { type: 'wiggle'; plot: number }
  | { type: 'touch'; where: Scenery; at: Point }

export type Held = {
  id: number
  kind: PieceKind
  turn: number
  open: boolean
  /** Screen point under the finger. */
  at: Point
  hover: Cell | null
  /** The cell it was lifted from; a cancelled carry puts it back there. */
  origin: Cell | null
  /** When the piece was lifted, for its little hop. */
  since: number
}

/** Per-cell motion that outlives a single frame: springy turns, drop squash, gates and wheels. */
export type CellMotion = {
  /** Unbounded quarter-turn count the display springs toward. */
  target: number
  turn: number
  velocity: number
  placedAt: number
  tappedAt: number
  /** Sluice board height, 0 shut to 1 lifted, and how fast it is moving. */
  gate: number
  gateVelocity: number
  wheelAngle: number
  wheelSpeed: number
}

export type GardenOptions = {
  save: (state: GardenState) => void
  sound?: GardenSound
  now?: number
}

const TURN_STIFFNESS = 180
const TURN_DAMPING = 14
const WHEEL_DRIVE = 3.4
const WHEEL_DRAG = 1.2
/** A shut board drops under its own weight (gate units/s²) and bounces once; an opened one is lifted by hand. */
const GATE_GRAVITY = 38
const GATE_BOUNCE = 0.28
const GATE_LIFT = 7
const MAX_EFFECTS = 48
/** A tapped thirsty plot shakes, then reaches toward its nearest water: a wordless "over there". */
const TAP_REACH_DELAY = 0.3

function motion(target = 0, open = true): CellMotion {
  return { target, turn: target, velocity: 0, placedAt: -10, tappedAt: -10, gate: open ? 1 : 0, gateVelocity: 0, wheelAngle: 0, wheelSpeed: 0 }
}

export class GardenController {
  readonly state: GardenState
  flow: FlowResult
  water: TimedSegment[]
  /** Bumped whenever the water network changes, so the view rebuilds its ribbons only then. */
  waterVersion = 0
  /** Bumped whenever a piece is placed, moved, turned or removed. */
  buildVersion = 0
  now: number
  readonly held = new Map<number, Held>()
  readonly motion: CellMotion[] = []
  readonly rackTappedAt = RACK.map(() => -10)
  /** When water starts reaching each plot (NEVER while dry). */
  readonly wetAt: number[]
  /** 0..1 how soaked each plot's soil looks. */
  readonly wetness: number[]
  readonly harvestedAt: number[]
  readonly plotTappedAt: number[]
  /** Where each thirsty plot reaches, toward the nearest running water. */
  reach: Reach[]
  /** When each plot last saw water come closer: it reaches eagerly as that water arrives. */
  readonly reachAt: number[]
  readonly creatures: Presence[]
  /** How each visitor moves: pokes, arrivals and cheers start here; the view samples the pose. */
  readonly creatureMotion: Record<CreatureKind, MotionDirector>
  readonly effects: Effect[] = []
  readonly guide: GuidanceState = { demo: null, glow: 0, lean: null }
  hint: Hint | null = null
  springTappedAt = -10
  private readonly wheelAt = new Map<number, number>()
  private readonly gestures = new Gestures()
  private readonly clock: HintClock
  private readonly cadence: SaveCadence
  private readonly sound: GardenSound | null
  private picker: Picker | null = null
  private running = false
  private wheelCells: number[] = []
  private growing = false
  /** The last moment anything new happened (see `resting`). */
  private activeAt: number

  constructor(state: GardenState, options: GardenOptions) {
    this.state = state
    this.now = options.now ?? 0
    this.activeAt = this.now
    this.sound = options.sound ?? null
    this.cadence = new SaveCadence(() => options.save(serialize(this.saveable())))
    this.clock = new HintClock(this.now)
    for (let i = 0; i < COLS * ROWS; i++) this.motion.push(motion())
    for (const piece of state.pieces) this.motion[cellIndex(piece.c, piece.r)] = motion(piece.turn, piece.open)
    this.flow = solveFlow(state.pieces)
    this.water = settled(this.flow.segments, this.now)
    this.wetAt = PLOTS.map((plot) => (this.flow.plotFlow[plot.id] > 0 ? this.now - 60 : NEVER))
    this.wetness = PLOTS.map((plot) => (this.flow.plotFlow[plot.id] > 0 ? 1 : 0))
    this.harvestedAt = PLOTS.map(() => -10)
    this.plotTappedAt = PLOTS.map(() => -10)
    this.reach = nearestWater(this.flow)
    this.reachAt = PLOTS.map(() => -10)
    this.indexWheels(true)
    this.creatures = CREATURES.map((kind) => {
      const presence = new Presence(kind)
      presence.settle(this.wanted(kind), this.now)
      return presence
    })
    this.creatureMotion = { frog: new MotionDirector('frog', 1, this.now), sparrow: new MotionDirector('sparrow', 2, this.now), tanuki: new MotionDirector('tanuki', 3, this.now) }
    this.hint = chooseHint(this.state, this.flow)
  }

  setPicker(picker: Picker): void {
    this.picker = picker
  }

  setRunning(running: boolean): void {
    if (running === this.running) return
    this.running = running
    this.sound?.setActive(running)
    if (!running) {
      this.dropAll()
      this.gestures.reset()
      this.cadence.settle(this.now)
    }
  }

  dispose(): void {
    this.cadence.settle(this.now)
    this.sound?.dispose()
  }

  pointerDown(id: number, at: Point, t: number): void {
    this.sound?.unlock()
    this.clock.touch(this.now)
    this.activeAt = this.now
    this.handle(this.gestures.down(id, at, t))
  }

  pointerMove(id: number, at: Point): void {
    this.handle(this.gestures.move(id, at))
  }

  pointerUp(id: number, at: Point, t: number): void {
    this.clock.touch(this.now)
    this.activeAt = this.now
    this.handle(this.gestures.up(id, at, t))
  }

  pointerCancel(id: number): void {
    this.handle(this.gestures.cancel(id))
  }

  private handle(intents: Intent[]): void {
    for (const intent of intents) {
      switch (intent.type) {
        case 'press':
          break
        case 'tap':
          this.tap(this.pick(intent.at))
          break
        case 'dragStart':
          this.lift(intent.id, this.pick(intent.from), intent.at)
          break
        case 'dragMove': {
          const held = this.held.get(intent.id)
          if (held) {
            held.at.x = intent.at.x
            held.at.y = intent.at.y
            held.hover = this.picker?.dropCell(intent.at) ?? null
          }
          break
        }
        case 'dragEnd':
          this.drop(intent.id, intent.at)
          break
        case 'cancel':
          for (const id of intent.ids) this.drop(id, null)
          break
        default: {
          const never: never = intent
          return never
        }
      }
    }
  }

  private pick(at: Point): Target {
    return this.picker?.pick(at) ?? { kind: 'none' }
  }

  private tap(target: Target): void {
    switch (target.kind) {
      case 'rack':
        this.rackTappedAt[target.slot] = this.now
        this.sound?.tok(1.3)
        return
      case 'cell': {
        const piece = pieceAt(this.state, target.c, target.r)
        if (piece) return this.tapPiece(piece)
        const plot = PLOTS.find((p) => p.c === target.c && p.r === target.r)
        if (plot) return this.tapPlot(plot.id)
        this.effects.push({ type: 'rustle', c: target.c, r: target.r })
        this.sound?.rustle()
        return
      }
      case 'creature':
        this.sound?.poke(this.creatureMotion[target.which].poke(this.now))
        return
      case 'spring':
        this.springTappedAt = this.now
        this.effects.push({ type: 'splash' })
        this.sound?.splash()
        return
      case 'scenery':
        this.effects.push({ type: 'touch', where: target.where, at: { x: target.at.x, y: target.at.y } })
        this.sound?.scenery(target.where)
        return
      case 'none':
        return
      default: {
        const never: never = target
        return never
      }
    }
  }

  private tapPiece(piece: Piece): void {
    const m = this.motion[cellIndex(piece.c, piece.r)]
    m.tappedAt = this.now
    if (piece.kind === 'sluice') {
      piece.open = !piece.open
      this.sound?.clunk(piece.open, piece.open ? 0 : Math.sqrt((2 * m.gate) / GATE_GRAVITY))
      this.rebuild()
      return
    }
    if (piece.kind === 'wheel') {
      m.wheelSpeed += 5
      this.sound?.tok(0.8)
      return
    }
    if (tapTurns(piece.kind)) {
      piece.turn = normalTurn(piece.kind, piece.turn + 1)
      m.target += 1
      this.sound?.tok(1)
      this.rebuild()
    }
  }

  private tapPlot(id: number): void {
    if (this.state.growth[id] >= 1) {
      this.state.growth[id] = 0
      this.harvestedAt[id] = this.now
      this.effects.push({ type: 'harvest', plot: id })
      this.sound?.pop()
      this.hint = chooseHint(this.state, this.flow)
      this.cadence.now(this.now)
      return
    }
    this.plotTappedAt[id] = this.now
    if (this.wetness[id] < 0.5) this.reachAt[id] = this.now + TAP_REACH_DELAY
    this.effects.push({ type: 'wiggle', plot: id })
    this.sound?.rustle()
  }

  private lift(id: number, from: Target, at: Point): void {
    if (this.held.size >= MAX_HELD) return
    if (from.kind === 'rack') {
      this.held.set(id, { id, kind: RACK[from.slot], turn: 0, open: true, at: { ...at }, hover: this.picker?.dropCell(at) ?? null, origin: null, since: this.now })
      this.rackTappedAt[from.slot] = this.now
      this.sound?.lift(PIECE_WEIGHT[RACK[from.slot]])
      return
    }
    if (from.kind !== 'cell') return
    const piece = pieceAt(this.state, from.c, from.r)
    if (!piece) return
    this.state.pieces.splice(this.state.pieces.indexOf(piece), 1)
    this.held.set(id, { id, kind: piece.kind, turn: piece.turn, open: piece.open, at: { ...at }, hover: this.picker?.dropCell(at) ?? null, origin: { c: piece.c, r: piece.r }, since: this.now })
    this.sound?.lift(PIECE_WEIGHT[piece.kind])
    this.rebuild()
  }

  /** Ends a carry. `at` null means cancelled: a piece from the hillside goes home, one from the rack goes back. */
  private drop(id: number, at: Point | null): void {
    const held = this.held.get(id)
    if (!held) return
    this.held.delete(id)
    const home = held.origin && !pieceAt(this.state, held.origin.c, held.origin.r) ? held.origin : null
    const cell = at ? (this.picker?.dropCell(at) ?? null) : home
    if (!cell || !buildable(cell.c, cell.r)) {
      this.effects.push({ type: 'putBack', at: at ?? held.at })
      this.sound?.putBack(PIECE_WEIGHT[held.kind])
      return
    }
    const occupant = pieceAt(this.state, cell.c, cell.r)
    if (occupant) {
      this.state.pieces.splice(this.state.pieces.indexOf(occupant), 1)
      this.effects.push({ type: 'putBack', at: held.at })
    }
    const turn = held.kind === 'sluice' ? sluiceTurnFor(incomingSide(this.flow, cell.c, cell.r)) : held.turn
    this.state.pieces.push({ kind: held.kind, c: cell.c, r: cell.r, turn, open: held.open })
    const m = motion(turn, held.open)
    m.placedAt = this.now
    this.motion[cellIndex(cell.c, cell.r)] = m
    this.effects.push({ type: 'place', c: cell.c, r: cell.r, kind: held.kind })
    const weight = PIECE_WEIGHT[held.kind]
    this.sound?.tok(0.9 / Math.sqrt(weight), weight)
    this.rebuild()
  }

  private dropAll(): void {
    for (const id of [...this.held.keys()]) this.drop(id, null)
  }

  /** What to save: the build, with any piece still in a child's hand back where it came from. */
  private saveable(): GardenState {
    if (this.held.size === 0) return this.state
    const pieces = [...this.state.pieces]
    for (const held of this.held.values()) {
      if (!held.origin || pieces.some((piece) => piece.c === held.origin!.c && piece.r === held.origin!.r)) continue
      pieces.push({ kind: held.kind, c: held.origin.c, r: held.origin.r, turn: held.turn, open: held.open })
    }
    return { ...this.state, pieces }
  }

  /** The build changed: re-solve the water and let it run (or drain) from the point of change. */
  private rebuild(): void {
    const previous = this.flow
    this.flow = solveFlow(this.state.pieces)
    const timed = retime(this.water, this.flow.segments, this.now)
    this.water = timed.segments
    const fresh = timed.dFresh
    const reach = nearestWater(this.flow)
    for (const plot of PLOTS) {
      const was = previous.plotFlow[plot.id] > 0
      const is = this.flow.plotFlow[plot.id] > 0
      if (!is) this.wetAt[plot.id] = NEVER
      else if (!was || this.wetAt[plot.id] >= NEVER) this.wetAt[plot.id] = this.now + Math.max(0, this.flow.plotDist[plot.id] - fresh) / WATER_SPEED
      if (!is && reach[plot.id].cells < this.reach[plot.id].cells) this.reachAt[plot.id] = this.now + Math.max(0, reach[plot.id].dist - fresh) / WATER_SPEED
    }
    this.reach = reach
    this.indexWheels(false, fresh)
    this.activeAt = this.now
    this.waterVersion++
    this.buildVersion++
    this.hint = chooseHint(this.state, this.flow)
    this.cadence.now(this.now)
  }

  private indexWheels(initial: boolean, fresh = 0): void {
    const next = new Map<number, number>()
    for (const [index, flow] of this.flow.wheelFlow) {
      if (flow <= 0) continue
      const previous = this.wheelAt.get(index)
      next.set(index, initial ? this.now - 60 : (previous ?? this.now + Math.max(0, (this.flow.wheelDist.get(index) ?? 0) - fresh) / WATER_SPEED))
    }
    this.wheelAt.clear()
    for (const [index, at] of next) this.wheelAt.set(index, at)
    this.wheelCells = this.state.pieces.filter((piece) => piece.kind === 'wheel').map((piece) => cellIndex(piece.c, piece.r))
  }

  private wanted(kind: CreatureKind): Cell | null {
    return wantedSpot(kind, this.flow, this.state.growth, this.wheelCells)
  }

  /** Is water running through this wheel right now? */
  wheelDriven(index: number): boolean {
    const at = this.wheelAt.get(index)
    return at !== undefined && this.now >= at
  }

  plotWatered(id: number): boolean {
    return this.now >= this.wetAt[id]
  }

  /**
   * Nothing new for a while: no touch, no rebuilt water, nothing growing, no
   * visitor coming or going, no demonstration, nothing in hand. Steady motion
   * (wheels, idle visitors, scrolling water) reads fine at half rate.
   */
  get resting(): boolean {
    return this.now - this.activeAt >= REST_BEFORE_PACING
  }

  step(dt: number): void {
    // The view drains effects each frame; without one (tests, a lost context) they must not pile up.
    if (this.effects.length > MAX_EFFECTS) this.effects.splice(0, this.effects.length - MAX_EFFECTS)
    this.now += dt
    const now = this.now
    let growing = false
    for (let id = 0; id < PLOTS.length; id++) {
      const watered = this.plotWatered(id)
      const target = watered ? 1 : 0
      this.wetness[id] += (target - this.wetness[id]) * Math.min(1, dt * (watered ? 2.5 : 0.25))
      if (watered && this.state.growth[id] < 1) {
        growing = true
        const before = this.state.growth[id]
        this.state.growth[id] = Math.min(1, before + dt / GROW_SECONDS)
        if (before < 1 && this.state.growth[id] >= 1) {
          this.effects.push({ type: 'bloom', plot: id })
          this.sound?.chime(id)
          this.hint = chooseHint(this.state, this.flow)
          this.clock.wait(now)
          for (let k = 0; k < this.creatures.length; k++) if (this.creatures[k].phase === 'here') this.creatureMotion[this.creatures[k].kind].cue(now)
        }
      }
    }
    if (growing) this.cadence.soon(now)
    else if (this.growing) this.cadence.settle(now)
    this.growing = growing

    let spinning = 0
    const pieces = this.state.pieces
    for (let p = 0; p < pieces.length; p++) {
      const piece = pieces[p]
      const index = cellIndex(piece.c, piece.r)
      const m = this.motion[index]
      const force = (m.target - m.turn) * TURN_STIFFNESS - m.velocity * TURN_DAMPING
      m.velocity += force * dt
      m.turn += m.velocity * dt
      if (piece.kind === 'sluice') {
        if (piece.open) {
          m.gateVelocity = 0
          m.gate += (1 - m.gate) * Math.min(1, dt * GATE_LIFT)
        } else if (m.gate > 0 || m.gateVelocity > 0) {
          m.gateVelocity -= GATE_GRAVITY * dt
          m.gate += m.gateVelocity * dt
          if (m.gate <= 0) {
            m.gate = 0
            m.gateVelocity = m.gateVelocity < -1.5 ? -m.gateVelocity * GATE_BOUNCE : 0
          }
        }
      }
      if (piece.kind === 'wheel') {
        const drive = this.wheelDriven(index) ? WHEEL_DRIVE * Math.min(1, (this.flow.wheelFlow.get(index) ?? 0) * 1.6 + 0.2) : 0
        m.wheelSpeed += (drive - m.wheelSpeed) * Math.min(1, dt * WHEEL_DRAG)
        m.wheelAngle = (m.wheelAngle + m.wheelSpeed * dt) % (Math.PI * 2)
        spinning += Math.min(1, Math.abs(m.wheelSpeed) / WHEEL_DRIVE)
      }
    }

    for (let k = 0; k < this.creatures.length; k++) {
      const presence = this.creatures[k]
      const before = presence.phase
      presence.update(now, this.wanted(presence.kind))
      if (presence.phase !== before) this.activeAt = now
      if (before === 'away' && presence.phase === 'arriving') this.sound?.arrive(presence.kind)
      if (before === 'arriving' && presence.phase === 'here') this.creatureMotion[presence.kind].trigger('arrive', now)
    }

    this.clock.state(now, this.guide)
    if (growing || (this.hint && this.guide.demo !== null) || this.held.size > 0) this.activeAt = now
    let falls = 0
    for (let i = 0; i < this.water.length; i++) {
      const segment = this.water[i]
      if ((segment.kind === 'fall' || segment.kind === 'pourDown' || segment.kind === 'pourSide') && segment.tDepart >= NEVER && now >= segment.tArrive) falls++
    }
    this.sound?.flow(0.45 + Math.min(1, falls / 6) * 0.55, Math.min(1, spinning))
  }
}
