import { isAwake, makeCreature, moveBed, pickBed, seededRandom, stepCreature, type Creature, type CreatureEvent } from './creatures'
import { chooseHint, handPose, HintScheduler, type GardenSummary, type GuidanceTiming, type HandPose, type Hint, type Placed, type Spot } from './guidance'
import { GestureTracker, type Intent, type Target } from './input'
import { clampToPanel, CREATURES, KNOB, onPanel, overTray, PANEL, PIECES, slotPoint, trayAngle, TURN_STEP, type CreatureKind, type PieceKind, type PieceSpec, type PiecePose, type Point } from './layout'
import { CATCH_HEIGHT, makePose, poke, poseCreature, type Carry, type Pose } from './motion'
import { BeamBuffer, lightAt, OpticsScene, trace, WHITE, type Mask } from './optics'
import { SaveCadence } from './saveCadence'
import { buildScene, makeSources, PIECE_OWNER, type OpticCreature, type OpticPiece } from './scene'
import { serialize, type GardenState } from './state'

// The garden's rules, timing, input, saving, and guidance. It knows nothing
// about rendering: the view reads pieces, creatures, beams, and guidance by
// reference every frame. Nothing here allocates per frame.

export type Sound = {
  unlock(): void
  setActive(active: boolean): void
  dispose(): void
  pick(kind: PieceKind): void
  drop(kind: PieceKind, strength: number): void
  turn(kind: PieceKind): void
  tick(): void
  home(): void
  ripple(): void
  creature(kind: CreatureKind, event: CreatureEvent | 'nudge' | 'lift' | 'set'): void
  poke(kind: CreatureKind, variant: number): void
  garden(): void
}

const silent: Sound = {
  unlock() {},
  setActive() {},
  dispose() {},
  pick() {},
  drop() {},
  turn() {},
  tick() {},
  home() {},
  ripple() {},
  creature() {},
  poke() {},
  garden() {},
}

export type Projector = {
  /** Where a screen point meets the horizontal plane `height` above the panel; written into `out` when given. */
  toPlane(screen: Point, height: number, out?: Point): Point | null
  toScreen(x: number, y: number, height: number): Point | null
}

export type Spring = { x: number; v: number }

/** Damped spring toward `target`; low damping overshoots, which is the charm. */
export function springStep(spring: Spring, target: number, dt: number, stiffness: number, damping: number): number {
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    spring.v += (stiffness * (target - spring.x) - damping * spring.v) * h
    spring.x += spring.v * h
  }
  return spring.x
}

export type PieceSim = {
  readonly spec: PieceSpec
  readonly pose: PiecePose
  /** Displayed centre on the table (lags the finger a little, flies home). */
  x: number
  y: number
  angle: Spring
  lift: Spring
  wobble: Spring
  hop: Spring
  squash: Spring
  /** Wobble spring constants for the current nudge (each creature nudges its own way). */
  wobbleK: number
  wobbleD: number
  heldBy: number | null
  grabX: number
  grabY: number
  knobBy: number | null
  lastTick: number
  /** Seconds left flying home to the tray. */
  flying: number
  fromX: number
  fromY: number
  /** Light touching the piece this frame. */
  lit: Mask
  /** Light arriving at a filter or prism before it acts. */
  input: Mask
}

export type CreatureSim = {
  readonly c: Creature
  readonly pose: Pose
  x: number
  y: number
  heldBy: number | null
  heldFor: number
  grabX: number
  grabY: number
  lift: Spring
  /** Eased sidestep (cm) that keeps a moving creature from flying through another. */
  apartX: number
  apartY: number
  /** Light the creature is catching where it is now. */
  caught: Mask
  /** Carried state and how strongly it is the scene's want, handed to its motion each frame. */
  readonly carry: Carry
}

export type Ripple = { x: number; y: number; t0: number; mask: Mask; size: number }

export type GuideView = {
  hint: Hint | null
  hand: HandPose
  handVisible: boolean
  glow: number
  peek: number | null
}

const LIFT = 3.6
const KNOB_HIT_PX = 30
const BODY_SLOP_PX = 14
const HOME_SECONDS = 0.55
const NUDGE_EVERY = 7
const RIPPLES = 10
/** Displayed centres closer than this (cm) ease apart; about the width of one drawn creature. */
const CREATURE_GAP = 14
const APART_RATE = 5
/** How quickly the want passes from one sleeper to the next. */
const WANT_RATE = 1.6

/** How far `value` lies outside [min, max] (signed), or 0 inside. */
const excess = (value: number, min: number, max: number) => (value < min ? value - min : value > max ? value - max : 0)

const movesAside = (creature: CreatureSim) =>
  creature.heldBy === null && (creature.c.phase === 'awake' || creature.c.phase === 'drowsy' || creature.c.phase === 'wandering')

export class GardenController {
  readonly state: GardenState
  readonly pieces: PieceSim[]
  readonly creatures: CreatureSim[]
  readonly beams = new BeamBuffer()
  readonly ripples: Ripple[] = Array.from({ length: RIPPLES }, () => ({ x: 0, y: 0, t0: -99, mask: 0, size: 1 }))
  readonly guide: GuideView = { hint: null, hand: { x: 0, y: 0, press: 0, opacity: 0 }, handVisible: false, glow: 0, peek: null }
  /** Attended seconds; stands still while the garden is put away. */
  t = 0
  /** When all four were last awake together, or -Infinity. */
  gardenAt = -Infinity
  /** The sleeper the next act is for (the scene's one obvious want), or -1. */
  wantIndex = -1
  private wantStale = false
  private rippleCursor = 0
  private readonly sound: Sound
  private readonly cadence: SaveCadence
  private readonly tracker: GestureTracker
  private readonly scheduler = new HintScheduler(0)
  private readonly timing: GuidanceTiming = { demo: null, glow: 0, peek: null }
  private readonly scene = new OpticsScene()
  private readonly sources = makeSources(2)
  private readonly opticPieces: OpticPiece[]
  private readonly opticCreatures: OpticCreature[]
  private readonly random = seededRandom(20260923)
  private projector: Projector | null = null
  private readonly screens = new Map<number, Point>()
  private allAwake = false
  private peekWasOn = false
  private hintTried = false
  private ghostPressed = false
  private readonly finger: Point = { x: 0, y: 0 }
  private readonly chooseBed = (c: Creature) =>
    pickBed(
      c,
      this.random,
      (at) => this.roomAt(at, c.index),
      (at) => lightAt(this.beams, at.x, at.y, c.radius),
    )

  constructor(state: GardenState, options: { save: (state: GardenState) => void; sound?: Sound }) {
    this.state = state
    this.sound = options.sound ?? silent
    this.cadence = new SaveCadence(() => {
      this.creatures.forEach((creature, i) => {
        state.beds[i] = { x: creature.c.bed.x, y: creature.c.bed.y }
      })
      options.save(serialize(state))
    })
    this.tracker = new GestureTracker((screen) => this.hitTest(screen))
    this.pieces = PIECES.map((spec) => {
      const pose = state.pieces.find((p) => p.id === spec.id)!
      return {
        spec,
        pose,
        x: pose.x,
        y: pose.y,
        angle: { x: pose.angle, v: 0 },
        lift: { x: 0, v: 0 },
        wobble: { x: 0, v: 0 },
        hop: { x: 0, v: 0 },
        squash: { x: 0, v: 0 },
        wobbleK: 160,
        wobbleD: 7,
        heldBy: null,
        grabX: 0,
        grabY: 0,
        knobBy: null,
        lastTick: pose.angle,
        flying: 0,
        fromX: 0,
        fromY: 0,
        lit: 0,
        input: 0,
      }
    })
    this.creatures = CREATURES.map((spec, index) => {
      const bed = state.beds[index]
      return {
        c: makeCreature(index, spec.kind, spec.wants, spec.radius, bed),
        pose: makePose(),
        x: bed.x,
        y: bed.y,
        heldBy: null,
        heldFor: 0,
        grabX: 0,
        grabY: 0,
        lift: { x: 0, v: 0 },
        apartX: 0,
        apartY: 0,
        caught: 0,
        carry: { held: false, heldFor: 0, want: 0 },
      }
    })
    this.opticPieces = this.pieces.map((piece) => ({ id: piece.spec.id, x: 0, y: 0, angle: 0, active: false }))
    this.opticCreatures = this.creatures.map((creature) => ({ x: 0, y: 0, r: creature.c.radius, absorbs: true }))
    this.traceNow()
    this.chooseWant()
    if (this.wantIndex >= 0) this.creatures[this.wantIndex].carry.want = 1
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
    this.cadence.settle(performance.now())
    this.sound.dispose()
  }

  /** Put away mid-anything: every gesture ends where it is, and the garden is saved. */
  pause(): void {
    this.tracker.reset()
    for (const piece of this.pieces) {
      if (piece.heldBy !== null) this.dropPiece(piece)
      piece.knobBy = null
    }
    for (const creature of this.creatures) if (creature.heldBy !== null) this.dropCreature(creature)
    this.screens.clear()
    this.cadence.settle(performance.now())
  }

  // --- frame ---------------------------------------------------------------

  step(dt: number): void {
    this.t += dt
    const now = this.t
    const timing = this.scheduler.state(now, this.timing)
    this.stepPieces(dt, timing.peek)
    this.stepCreatures(dt)
    this.traceNow()
    this.stepLife(dt, now)
    if (this.wantStale && !this.holding() && this.guide.hint === null) this.chooseWant()
    this.stepGuidance(timing)
  }

  /** Seconds the garden has rested: untouched, nothing held or flying home, no demonstration or peek, nobody waking. */
  restingFor(): number {
    if (this.timing.demo !== null || this.timing.peek !== null || this.holding()) return 0
    for (const piece of this.pieces) if (piece.flying > 0) return 0
    for (const creature of this.creatures) if (creature.c.phase === 'waking') return 0
    return this.scheduler.idleFor(this.t)
  }

  private holding(): boolean {
    for (const piece of this.pieces) if (piece.heldBy !== null || piece.knobBy !== null) return true
    for (const creature of this.creatures) if (creature.heldBy !== null) return true
    return false
  }

  /** Only when the table has changed: the summary allocates. */
  private chooseWant(): void {
    this.wantStale = false
    this.wantIndex = chooseHint(this.summary())?.sleeper ?? -1
  }

  private stepPieces(dt: number, peek: number | null): void {
    const follow = 1 - Math.exp(-dt * 22)
    for (const piece of this.pieces) {
      const pose = piece.pose
      if (piece.heldBy !== null) {
        const screen = this.screens.get(piece.heldBy)
        const at = screen && this.projector?.toPlane(screen, LIFT, this.finger)
        if (at) {
          pose.x = Math.min(PANEL.maxX + 12, Math.max(PANEL.minX - 12, at.x + piece.grabX))
          pose.y = Math.min(PANEL.maxY + 26, Math.max(PANEL.minY - 10, at.y + piece.grabY))
        }
        piece.x += (pose.x - piece.x) * follow
        piece.y += (pose.y - piece.y) * follow
      } else if (piece.flying > 0) {
        piece.flying = Math.max(0, piece.flying - dt)
        const k = 1 - piece.flying / HOME_SECONDS
        const e = k * k * (3 - 2 * k)
        piece.x = piece.fromX + (pose.x - piece.fromX) * e
        piece.y = piece.fromY + (pose.y - piece.fromY) * e
        piece.lift.x = Math.sin(k * Math.PI) * 7
        if (piece.flying === 0) {
          piece.squash.v -= 2.2
          this.sound.home()
          this.wantStale = true
        }
      } else {
        piece.x = pose.x
        piece.y = pose.y
      }
      if (piece.knobBy !== null) this.followKnob(piece)
      if (piece.knobBy !== null) {
        piece.angle.x = pose.angle
        piece.angle.v = 0
      } else springStep(piece.angle, pose.angle, dt, 170, 12)
      if (piece.flying === 0) springStep(piece.lift, piece.heldBy !== null ? LIFT : 0, dt, 260, 17)
      springStep(piece.wobble, 0, dt, piece.wobbleK, piece.wobbleD)
      springStep(piece.hop, 0, dt, 300, 14)
      springStep(piece.squash, 0, dt, 420, 11)
    }
    if (peek !== null && !this.peekWasOn && this.wantIndex >= 0) this.creatures[this.wantIndex].c.stirAt = this.t + 0.45
    this.peekWasOn = peek !== null
    if (peek !== null) {
      const lamp = this.pieces[0]
      if (!lamp.pose.inTray && lamp.heldBy === null) lamp.wobble.x = Math.sin(peek * Math.PI * 2) * Math.sin(peek * Math.PI) * 0.17
    }
  }

  private stepCreatures(dt: number): void {
    const follow = 1 - Math.exp(-dt * 18)
    for (const creature of this.creatures) {
      const c = creature.c
      if (creature.heldBy !== null) {
        creature.heldFor += dt
        const screen = this.screens.get(creature.heldBy)
        const at = screen && this.projector?.toPlane(screen, 6, this.finger)
        if (at) {
          const target = clampToPanel({ x: at.x + creature.grabX, y: at.y + creature.grabY }, c.radius)
          c.bed.x += (target.x - c.bed.x) * follow
          c.bed.y += (target.y - c.bed.y) * follow
        }
      }
      springStep(creature.lift, creature.heldBy !== null ? 6 : 0, dt, 200, 14)
      const carry = creature.carry
      const wanting = c.index === this.wantIndex && c.phase === 'asleep' && creature.heldBy === null ? 1 : 0
      carry.want += (wanting - carry.want) * (1 - Math.exp(-dt * WANT_RATE))
      carry.held = creature.heldBy !== null
      carry.heldFor = creature.heldFor
      poseCreature(c, this.t, carry, creature.pose)
    }
    this.keepApart(dt)
    for (const creature of this.creatures) {
      const r = creature.c.radius
      creature.x = Math.min(PANEL.maxX - r, Math.max(PANEL.minX + r, creature.c.bed.x + creature.pose.dx + creature.apartX))
      creature.y = Math.min(PANEL.maxY - r, Math.max(PANEL.minY + r, creature.c.bed.y + creature.pose.dy + creature.apartY))
    }
  }

  /**
   * Moving creatures (awake, drowsy, or off to a new bed) ease around each other instead of flying through,
   * so two silhouettes never merge into one. Sleeping and carried ones hold still and are simply avoided.
   */
  private keepApart(dt: number): void {
    const ease = 1 - Math.exp(-dt * APART_RATE)
    const creatures = this.creatures
    for (let i = 0; i < creatures.length; i++) {
      const a = creatures[i]
      let pushX = 0
      let pushY = 0
      if (movesAside(a)) {
        const ax = a.c.bed.x + a.pose.dx
        const ay = a.c.bed.y + a.pose.dy
        for (let j = 0; j < creatures.length; j++) {
          if (j === i) continue
          const b = creatures[j]
          const dx = ax - (b.c.bed.x + b.pose.dx)
          const dy = ay - (b.c.bed.y + b.pose.dy)
          const distance = Math.hypot(dx, dy)
          if (distance >= CREATURE_GAP) continue
          // Two movers split the sidestep; a mover passing a still creature takes all of it.
          const share = movesAside(b) ? 0.5 : 1
          const need = (CREATURE_GAP - distance) * share
          pushX += (distance > 0.01 ? dx / distance : i < j ? -1 : 1) * need
          pushY += distance > 0.01 ? (dy / distance) * need : 0
        }
        // Against the panel's edge, slide along it instead of pushing into it.
        const r = a.c.radius
        const lostX = excess(ax + pushX, PANEL.minX + r, PANEL.maxX - r)
        const lostY = excess(ay + pushY, PANEL.minY + r, PANEL.maxY - r)
        pushX += (pushX < 0 ? -1 : 1) * Math.abs(lostY) - lostX
        pushY += (pushY < 0 ? -1 : 1) * Math.abs(lostX) - lostY
      }
      a.apartX += (pushX - a.apartX) * ease
      a.apartY += (pushY - a.apartY) * ease
    }
  }

  /** Rebuild the optics from what is displayed and trace every lamp. */
  private traceNow(): void {
    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i]
      const optic = this.opticPieces[i]
      optic.x = piece.x
      optic.y = piece.y
      optic.angle = piece.angle.x + piece.wobble.x
      optic.active = !piece.pose.inTray && piece.flying === 0 && (piece.heldBy === null || onPanel(piece))
    }
    for (let i = 0; i < this.creatures.length; i++) {
      const creature = this.creatures[i]
      const optic = this.opticCreatures[i]
      optic.x = creature.x
      optic.y = creature.y
      optic.absorbs = creature.heldBy === null && creature.pose.alt + creature.lift.x < CATCH_HEIGHT
    }
    const count = buildScene(this.opticPieces, this.opticCreatures, this.scene, this.sources)
    trace(this.scene, this.sources, this.beams, count)
  }

  private stepLife(dt: number, now: number): void {
    let awake = 0
    for (const creature of this.creatures) {
      const c = creature.c
      creature.caught = this.beams.creatureLight[c.index]
      if (creature.heldBy === null) {
        // What it catches itself, plus light crossing its bed while it flies above.
        const light = creature.caught | lightAt(this.beams, c.bed.x, c.bed.y, c.radius + 0.5)
        const event = stepCreature(c, light, dt, now, this.chooseBed)
        if (event) this.onCreatureEvent(creature, event)
        if (event === 'nap') this.cadence.change(performance.now(), true)
      }
      if (isAwake(c)) awake++
      if (c.phase === 'awake' && creature.heldBy === null && now - c.nudgeAt > NUDGE_EVERY) this.tryNudge(creature, now)
    }
    const all = awake === this.creatures.length
    if (all && !this.allAwake) {
      this.gardenAt = now
      this.sound.garden()
      this.addRipple((PANEL.minX + PANEL.maxX) / 2, (PANEL.minY + PANEL.maxY) / 2, WHITE, 4)
      for (const creature of this.creatures) creature.c.nudgeAt = now + 0.2 * creature.c.index
    }
    this.allAwake = all
    for (const piece of this.pieces) {
      const owner = PIECE_OWNER[piece.spec.id]
      piece.lit = piece.pose.inTray ? 0 : lightAt(this.beams, piece.x, piece.y, piece.spec.radius)
      piece.input = piece.spec.kind === 'prism' ? this.beams.prismLit[owner] : piece.spec.kind === 'filter' ? this.beams.filterLit[owner] : 0
    }
  }

  private onCreatureEvent(creature: CreatureSim, event: CreatureEvent): void {
    this.sound.creature(creature.c.kind, event)
    if (event === 'wake' || event === 'nap') this.wantStale = true
    if (event === 'wake') this.addRipple(creature.x, creature.y, creature.c.wants, 1.4)
  }

  private tryNudge(creature: CreatureSim, now: number): void {
    for (const piece of this.pieces) {
      if (piece.pose.inTray || piece.heldBy !== null || piece.knobBy !== null || piece.flying > 0) continue
      const reach = creature.c.radius + piece.spec.radius + 1.2
      if (Math.hypot(piece.x - creature.x, piece.y - creature.y) > reach) continue
      creature.c.nudgeAt = now
      this.sound.creature(creature.c.kind, 'nudge')
      // Each creature nudges its own way; the piece springs back to where the child left it.
      switch (creature.c.kind) {
        case 'fish':
          piece.wobbleK = 220
          piece.wobbleD = 9
          piece.wobble.v += 1.9
          piece.hop.v += 9
          break
        case 'snail':
          piece.wobbleK = 40
          piece.wobbleD = 9
          piece.wobble.v += 0.5
          break
        case 'moth':
          piece.wobbleK = 160
          piece.wobbleD = 10
          piece.hop.v -= 12
          piece.squash.v -= 1.5
          break
        case 'jelly':
          piece.wobbleK = 900
          piece.wobbleD = 6
          piece.wobble.v += 2.4
          break
        default: {
          const never: never = creature.c.kind
          return never
        }
      }
      return
    }
  }

  private addRipple(x: number, y: number, mask: Mask, size: number): void {
    const ripple = this.ripples[this.rippleCursor]
    this.rippleCursor = (this.rippleCursor + 1) % RIPPLES
    ripple.x = x
    ripple.y = y
    ripple.t0 = this.t
    ripple.mask = mask
    ripple.size = size
  }

  /** Distance from `at` to the nearest other thing on the panel (edge included). */
  private roomAt(at: Point, exceptCreature: number): number {
    let room = Math.min(at.x - PANEL.minX, PANEL.maxX - at.x, at.y - PANEL.minY, PANEL.maxY - at.y) * 2
    for (const piece of this.pieces) {
      if (piece.pose.inTray) continue
      room = Math.min(room, Math.hypot(piece.pose.x - at.x, piece.pose.y - at.y) - piece.spec.radius)
    }
    for (const creature of this.creatures) {
      if (creature.c.index === exceptCreature) continue
      room = Math.min(room, Math.hypot(creature.c.bed.x - at.x, creature.c.bed.y - at.y) - creature.c.radius)
    }
    return room
  }

  // --- guidance ------------------------------------------------------------

  private stepGuidance(timing: GuidanceTiming): void {
    const guide = this.guide
    guide.glow = timing.glow
    guide.peek = timing.peek
    if (timing.demo === null) {
      guide.hint = null
      guide.handVisible = false
      this.hintTried = false
      this.ghostPressed = false
      return
    }
    if (!this.hintTried) {
      this.hintTried = true
      guide.hint = chooseHint(this.summary())
      // The sleeper facing the child is the one the ghost hand is about to help.
      if (guide.hint) this.wantIndex = guide.hint.sleeper
    }
    if (!guide.hint) {
      guide.handVisible = false
      return
    }
    handPose(guide.hint, timing.demo, guide.hand)
    guide.handVisible = guide.hand.opacity > 0.01
    const pressed = guide.hand.press > 0.6
    if (pressed && !this.ghostPressed) this.answerGhostPress(guide.hint)
    this.ghostPressed = pressed
  }

  /** A ghost press gets a small, silent answer, so a demonstration shows what the move does without doing it. */
  private answerGhostPress(hint: Hint): void {
    let piece: PieceSim | null = null
    for (const p of this.pieces) if (p.spec.id === hint.piece) piece = p
    switch (hint.kind) {
      case 'tapLamp':
      case 'tapPiece':
        // Part of a turn and back: its beam swings toward the next step, then settles where it was.
        if (!piece) return
        piece.wobbleK = 55
        piece.wobbleD = 7
        piece.wobble.v += 2.4
        return
      case 'bringPiece':
        if (piece) piece.hop.v += 12
        return
      case 'carrySleeper':
        this.creatures[hint.sleeper].c.stirAt = this.t
        return
      default: {
        const never: never = hint.kind
        return never
      }
    }
  }

  summary(): GardenSummary {
    const onPanelPieces = this.pieces.filter((p) => !p.pose.inTray && p.heldBy === null)
    const placed = (p: PieceSim): Placed => ({ id: p.spec.id, x: p.pose.x, y: p.pose.y })
    const sleeping = this.creatures.filter((cr) => cr.c.phase === 'asleep' && cr.heldBy === null)
    return {
      sleepers: sleeping.map((cr) => ({ index: cr.c.index, x: cr.c.bed.x, y: cr.c.bed.y, wants: cr.c.wants })),
      lamps: onPanelPieces.filter((p) => p.spec.kind === 'lamp').map(placed),
      tray: this.pieces.filter((p) => p.pose.inTray && p.flying === 0).map((p) => ({ id: p.spec.id, ...slotPoint(p.spec.slot) })),
      whiteBeam: this.beamSpot(true),
      colourBeam: this.beamSpot(false),
      spots: sleeping.flatMap((cr) => this.ownLightSpot(cr) ?? []),
      lit: onPanelPieces.filter((p) => p.spec.kind !== 'lamp' && p.lit !== 0).map(placed),
      open: this.openSpot(),
    }
  }

  /** The open spot nearest a sleeper's bed where exactly its colour of light lands, if any. */
  private ownLightSpot(creature: CreatureSim): Spot | null {
    const c = creature.c
    const b = this.beams
    let best: Spot | null = null
    let bestDistance = Infinity
    for (let i = 0; i < b.count; i++) {
      if (b.inside[i] || (b.mask[i] & c.wants) === 0) continue
      for (const k of [0.25, 0.4, 0.55, 0.7, 0.85]) {
        const at = { x: b.ax[i] + (b.bx[i] - b.ax[i]) * k, y: b.ay[i] + (b.by[i] - b.ay[i]) * k }
        if (!onPanel(at, c.radius + 2) || lightAt(b, at.x, at.y, c.radius) !== c.wants || this.roomAt(at, c.index) < c.radius + 3) continue
        const distance = Math.hypot(at.x - c.bed.x, at.y - c.bed.y)
        if (distance < bestDistance) {
          bestDistance = distance
          best = { index: c.index, x: at.x, y: at.y }
        }
      }
    }
    return best
  }

  /** A clear spot along the longest beam of the kind asked for. */
  private beamSpot(white: boolean): Point | null {
    let best: Point | null = null
    let bestScore = 0
    const b = this.beams
    for (let i = 0; i < b.count; i++) {
      if (b.inside[i] || (b.mask[i] === WHITE) !== white) continue
      for (const k of [0.35, 0.5, 0.65]) {
        const at = { x: b.ax[i] + (b.bx[i] - b.ax[i]) * k, y: b.ay[i] + (b.by[i] - b.ay[i]) * k }
        if (!onPanel(at, 8)) continue
        const room = this.roomAt(at, -1)
        if (room > bestScore && room > 7) {
          bestScore = room
          best = at
        }
      }
    }
    return best
  }

  private openSpot(): Point {
    let best: Point = { x: 0, y: 0 }
    let bestRoom = -Infinity
    for (let x = -40; x <= 40; x += 10) {
      for (let y = -20; y <= 20; y += 10) {
        const room = this.roomAt({ x, y }, -1) - Math.hypot(x, y) * 0.2
        if (room > bestRoom) {
          bestRoom = room
          best = { x, y }
        }
      }
    }
    return best
  }

  // --- input ---------------------------------------------------------------

  pointerDown(pointerId: number, screen: Point, timeMs: number): void {
    this.sound.unlock()
    this.scheduler.touch(this.t)
    this.guide.hint = null
    this.hintTried = false
    this.screens.set(pointerId, screen)
    this.apply(this.tracker.down(pointerId, screen, this.planePoint(screen), timeMs))
  }

  pointerMove(pointerId: number, screen: Point): void {
    if (!this.screens.has(pointerId)) return
    this.screens.set(pointerId, screen)
    this.apply(this.tracker.move(pointerId, screen, this.planePoint(screen)))
  }

  pointerUp(pointerId: number, screen: Point, timeMs: number): void {
    this.scheduler.touch(this.t)
    this.wantStale = true
    if (this.screens.has(pointerId)) this.screens.set(pointerId, screen)
    this.apply(this.tracker.up(pointerId, this.planePoint(screen), timeMs))
    this.screens.delete(pointerId)
  }

  pointerCancel(pointerId: number): void {
    this.apply(this.tracker.cancel(pointerId))
    this.screens.delete(pointerId)
  }

  private planePoint(screen: Point): Point {
    return this.projector?.toPlane(screen, 0) ?? { x: 0, y: 0 }
  }

  /** What is under a finger: knobs first (they are small), then glass, then creatures, then the panel. */
  hitTest(screen: Point): Target {
    const projector = this.projector
    if (!projector) return { kind: 'none' }
    let best: Target = { kind: 'none' }
    let bestDistance = Infinity
    for (const piece of this.pieces) {
      if (piece.pose.inTray || piece.flying > 0) continue
      const knob = this.knobPoint(piece)
      const at = projector.toScreen(knob.x, knob.y, 2.4)
      if (!at) continue
      const distance = Math.hypot(at.x - screen.x, at.y - screen.y)
      if (distance < KNOB_HIT_PX && distance < bestDistance) {
        best = { kind: 'knob', piece: piece.spec.id }
        bestDistance = distance
      }
    }
    if (best.kind === 'knob') return best
    const consider = (x: number, y: number, h: number, r: number, target: Target) => {
      const centre = projector.toScreen(x, y, h)
      const rim = projector.toScreen(x + r, y, h)
      if (!centre || !rim) return
      const radius = Math.hypot(rim.x - centre.x, rim.y - centre.y) + BODY_SLOP_PX
      const distance = Math.hypot(centre.x - screen.x, centre.y - screen.y)
      if (distance < radius && distance / radius < bestDistance) {
        best = target
        bestDistance = distance / radius
      }
    }
    for (const piece of this.pieces) {
      if (piece.flying > 0) continue
      consider(piece.x, piece.y, 2.5, piece.spec.radius, { kind: 'body', piece: piece.spec.id })
    }
    for (const creature of this.creatures) consider(creature.x, creature.y, creature.pose.alt + 1.5, creature.c.radius + 0.6, { kind: 'creature', index: creature.c.index })
    if (best.kind !== 'none') return best
    const plane = projector.toPlane(screen, 0)
    return plane && onPanel(plane) ? { kind: 'panel' } : { kind: 'none' }
  }

  knobPoint(piece: PieceSim): Point {
    const knob = KNOB[piece.spec.kind]
    const angle = piece.angle.x + piece.wobble.x + knob.angle
    return { x: piece.x + Math.cos(angle) * knob.distance, y: piece.y + Math.sin(angle) * knob.distance }
  }

  private pieceOf(target: Target): PieceSim | null {
    if (target.kind !== 'body' && target.kind !== 'knob') return null
    return this.pieces.find((p) => p.spec.id === target.piece) ?? null
  }

  private apply(intents: Intent[]): void {
    for (const intent of intents) {
      switch (intent.type) {
        case 'press':
          this.press(intent.target, intent.at)
          break
        case 'tap':
          this.tap(intent.target, intent.at)
          break
        case 'dragStart':
          this.dragStart(intent.pointerId, intent.target, intent.at)
          break
        case 'dragMove':
          this.cadence.change(performance.now())
          break
        case 'dragEnd':
          this.dragEnd(intent.pointerId)
          break
        case 'cancelAll':
          for (const pointerId of intent.pointerIds) this.dragEnd(pointerId)
          break
        default: {
          const never: never = intent
          return never
        }
      }
    }
  }

  private press(target: Target, _at: Point): void {
    const piece = this.pieceOf(target)
    if (piece) {
      piece.squash.v -= 0.9
      this.sound.pick(piece.spec.kind)
    }
  }

  private tap(target: Target, at: Point): void {
    const piece = this.pieceOf(target)
    if (piece) {
      if (piece.pose.inTray) {
        piece.hop.v += 16
        piece.wobble.v += 1.2
        return
      }
      piece.pose.angle += TURN_STEP
      piece.lastTick = piece.pose.angle
      this.sound.turn(piece.spec.kind)
      this.cadence.change(performance.now(), true)
      return
    }
    if (target.kind === 'creature') {
      const creature = this.creatures[target.index]
      this.sound.poke(creature.c.kind, poke(creature.c, this.t))
      return
    }
    if (target.kind === 'panel') {
      this.addRipple(at.x, at.y, 0, 1)
      this.sound.ripple()
    }
  }

  private dragStart(pointerId: number, target: Target, at: Point): void {
    const piece = this.pieceOf(target)
    if (piece && target.kind === 'knob') {
      piece.knobBy = pointerId
      piece.lastTick = piece.pose.angle
      return
    }
    if (piece) {
      if (piece.heldBy !== null) return
      piece.heldBy = pointerId
      piece.flying = 0
      const lifted = this.projector && this.screens.get(pointerId) ? this.projector.toPlane(this.screens.get(pointerId)!, LIFT) : at
      const from = lifted ?? at
      if (piece.pose.inTray) {
        piece.grabX = 0
        piece.grabY = -3
        piece.pose.angle = this.bestAngleOutOfTray(piece)
      } else {
        piece.grabX = piece.pose.x - from.x
        piece.grabY = piece.pose.y - from.y
      }
      piece.pose.inTray = false
      this.sound.pick(piece.spec.kind)
      return
    }
    if (target.kind === 'creature') {
      const creature = this.creatures[target.index]
      if (creature.heldBy !== null) return
      creature.heldBy = pointerId
      creature.heldFor = 0
      const lifted = this.projector && this.screens.get(pointerId) ? this.projector.toPlane(this.screens.get(pointerId)!, 6) : at
      creature.grabX = creature.c.bed.x - (lifted ?? at).x
      creature.grabY = creature.c.bed.y - (lifted ?? at).y
      this.sound.creature(creature.c.kind, 'lift')
    }
  }

  /** Pieces come out of the tray facing the way that is most useful on a table: across it. */
  private bestAngleOutOfTray(piece: PieceSim): number {
    switch (piece.spec.kind) {
      case 'lamp':
        return 0
      case 'mirror':
        return Math.PI / 4
      case 'filter':
        return Math.PI / 2
      case 'prism':
        return -Math.PI / 2
      default: {
        const never: never = piece.spec.kind
        return never
      }
    }
  }

  private dragEnd(pointerId: number): void {
    for (const piece of this.pieces) {
      if (piece.knobBy === pointerId) {
        piece.knobBy = null
        this.cadence.change(performance.now(), true)
      }
      if (piece.heldBy === pointerId) this.dropPiece(piece)
    }
    for (const creature of this.creatures) if (creature.heldBy === pointerId) this.dropCreature(creature)
  }

  private dropPiece(piece: PieceSim): void {
    piece.heldBy = null
    const pose = piece.pose
    if (overTray(pose)) {
      this.sendHome(piece)
    } else {
      const spot = this.clearSpot({ x: pose.x, y: pose.y }, piece.spec.radius, piece, null)
      pose.x = spot.x
      pose.y = spot.y
      piece.squash.v -= 2.4
      piece.wobble.v += 0.4
      this.sound.drop(piece.spec.kind, 1)
    }
    this.cadence.change(performance.now(), true)
  }

  private sendHome(piece: PieceSim): void {
    const slot = slotPoint(piece.spec.slot)
    piece.fromX = piece.x
    piece.fromY = piece.y
    piece.pose.x = slot.x
    piece.pose.y = slot.y
    piece.pose.angle = this.nearestTurn(piece.angle.x, trayAngle(piece.spec.kind))
    piece.pose.inTray = true
    piece.flying = HOME_SECONDS
  }

  /** The tray angle closest to where the piece is now, so it doesn't spin the long way home. */
  private nearestTurn(current: number, target: number): number {
    const turn = Math.PI * 2
    return target + Math.round((current - target) / turn) * turn
  }

  private dropCreature(creature: CreatureSim): void {
    creature.heldBy = null
    const spot = this.clearSpot(creature.c.bed, creature.c.radius, null, creature)
    moveBed(creature.c, spot)
    this.sound.creature(creature.c.kind, 'set')
    this.cadence.change(performance.now(), true)
  }

  /** Nudge a dropped thing off anything it landed on, and back onto the panel. */
  private clearSpot(at: Point, radius: number, self: PieceSim | null, selfCreature: CreatureSim | null): Point {
    let spot = clampToPanel(at, radius)
    for (let pass = 0; pass < 8; pass++) {
      let moved = false
      const push = (x: number, y: number, r: number) => {
        const dx = spot.x - x
        const dy = spot.y - y
        const distance = Math.hypot(dx, dy)
        const need = radius + r + 1.5
        if (distance >= need) return
        const nx = distance > 0.01 ? dx / distance : 1
        const ny = distance > 0.01 ? dy / distance : 0
        spot = clampToPanel({ x: x + nx * need, y: y + ny * need }, radius)
        moved = true
      }
      for (const piece of this.pieces) if (piece !== self && !piece.pose.inTray) push(piece.pose.x, piece.pose.y, piece.spec.radius)
      for (const creature of this.creatures) if (creature !== selfCreature) push(creature.c.bed.x, creature.c.bed.y, creature.c.radius)
      if (!moved) break
    }
    return spot
  }

  private followKnob(piece: PieceSim): void {
    const screen = piece.knobBy !== null ? this.screens.get(piece.knobBy) : undefined
    const at = screen && this.projector?.toPlane(screen, 2.4, this.finger)
    if (!at) return
    // The knob points at the finger: absolute, so it never drifts from under it.
    const raw = Math.atan2(at.y - piece.y, at.x - piece.x) - KNOB[piece.spec.kind].angle
    // Continue from the current angle so a knob dragged round and round never jumps.
    const turn = Math.PI * 2
    let target = raw + Math.round((piece.pose.angle - raw) / turn) * turn
    const snapped = Math.round(target / TURN_STEP) * TURN_STEP
    if (Math.abs(target - snapped) < 0.06) target = snapped
    piece.pose.angle = target
    if (Math.abs(target - piece.lastTick) >= Math.PI / 24) {
      piece.lastTick = target
      this.sound.tick()
    }
  }
}
