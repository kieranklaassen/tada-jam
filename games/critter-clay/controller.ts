import * as THREE from 'three'
import { CARRY_HEIGHT, Critter, findGreetings, type CritterSound, type WorldView } from './critter'
import { SLEEP_BREATH, snoreBubble, WAKE_HOP_LATEST } from './gait'
import { chooseHint, friendsCheer, handPose, HintScheduler, PARTS_BEFORE_NOSE, partToShow, type GuidanceTiming, type HandPose, type Hint, type WorkshopSummary } from './guidance'
import { GestureTracker, type Intent, type Screen } from './input'
import { onTurntable, TRAY, traySlot, TRAY_SLOT_RADIUS, TURNTABLE, type Point } from './layout'
import { PART_KINDS, type Hue, type Part, type PartKind } from './parts'
import { displayBase, GLOW_SHAPE, Rig, SHADOW_SHAPE } from './rig'
import { SaveCadence } from './saveCadence'
import { attach, detach, putToSleep, serialize, takeFromTray, turntableFree, wake, type CritterSave, type WorkshopState } from './state'
import { MEET_RADIUS } from './wander'

// The workshop while it is on screen: touch, rules, critter behaviour,
// guidance, sound, and saving. It knows nothing about WebGL. Each step it
// updates every critter, lays the whole bench out through the rig (which
// also records where things are, for hit tests), and the view uploads the
// rig's batches and renders.

export type Sound = CritterSound & {
  unlock(): void
  setActive(active: boolean): void
  dispose(): void
  pat(): void
  pick(): void
  squish(pitch: number): void
  pop(pitch: number): void
  boing(): void
  whoosh(): void
  plop(): void
  /** `size` follows the sleeper's snore bubble: a big sprawling snore or a small shy one. */
  snore(pitch: number, size: number): void
  spin(speed: number): void
  mumble(pitch: number): void
}

export const silentSound: Sound = {
  unlock() {},
  setActive() {},
  dispose() {},
  pat() {},
  pick() {},
  squish() {},
  pop() {},
  boing() {},
  whoosh() {},
  plop() {},
  snore() {},
  spin() {},
  mumble() {},
  step() {},
  voice() {},
  thud() {},
  sniff() {},
  shake() {},
}

/** How the view maps between the screen and the bench. */
export type Projector = {
  /** Screen position of a world point into `out`; false when it is behind the camera. */
  toScreen(x: number, y: number, z: number, out: Screen): boolean
  /** The point under `screen` on the horizontal plane at `height`, into `out`. */
  toPlane(screen: Screen, height: number, out: Point): boolean
  /** Screen pixels per world unit near a point, for finger-sized hit radii. */
  scaleAt(x: number, y: number, z: number): number
}

export type Target =
  | { kind: 'part'; critterId: number; index: number }
  | { kind: 'nose'; critterId: number }
  | { kind: 'body'; critterId: number }
  | { kind: 'tray'; part: PartKind }
  | { kind: 'turntable' }
  | { kind: 'bench' }

type PartDrag = {
  type: 'part'
  pointerId: number
  part: Part
  screen: Screen
  at: THREE.Vector3
  vx: number
  vz: number
  magnet: Critter | null
  pull: number
  age: number
}
type PullDrag = { type: 'pull'; pointerId: number; critter: Critter; index: number; screen: Screen; from: Screen }
type CarryDrag = { type: 'carry'; pointerId: number; critter: Critter; screen: Screen }
type SpinDrag = { type: 'spin'; pointerId: number; lastX: number; lastT: number }
type Drag = PartDrag | PullDrag | CarryDrag | SpinDrag

type Flight = { part: Part; from: THREE.Vector3; t0: number; duration: number; spin: number }
type Dent = { x: number; z: number; t0: number }

export type GuidanceView = {
  hint: Hint | null
  /** The ghost hand in world space while a demonstration plays. */
  hand: (HandPose & { y: number }) | null
  glow: number
  invite: number | null
  /** A translucent part carried by the ghost hand, in the colour it has in the tray. */
  ghost: PartKind | null
  ghostHue: Hue
  /** 0..1 as the ghost part, let go on top of the lump, settles into the place it will take. */
  ghostSettle: number
}

/** Where the demonstration lets go of a part: high on the lump, over its body and well clear of the nose. */
const DEMO_DROP_HEIGHT = 0.8

export const DRAG_HEIGHT = 11
const POP_PX = 58
const MIN_HIT_PX = 22
/** A finger this close to a part's centre (share of its hit radius) takes the part even over a belly. */
const SURE_PART = 0.5
/** The middle of an awake critter's belly (share of its hit radius) lifts it, so a well-decorated one can still be carried. */
const BELLY_CORE = 0.6
const TRAY_GROW_SECONDS = 0.45
const FLIGHT_SECONDS = 0.6
/** A tapped lump answers with what it wants: the tray part hops, or its own nose glows, once it has turned to look. */
const CALL_DELAY = 0.35
const CALL_SECONDS = 0.7

type CallOut = { t0: number } & ({ at: 'tray'; kind: PartKind } | { at: 'nose'; critterId: number })
const DENT_SECONDS = 2.4
const PART_HIT: Record<PartKind, number> = { legStub: 2.2, legLong: 2.4, eye: 1.9, earRound: 2.2, earPoint: 2.2, earFlop: 2.4, tailCurl: 2.4, tailLong: 2.8, head: 4.6, horn: 1.9 }

export class WorkshopController {
  readonly state: WorkshopState
  readonly rig = new Rig()
  readonly critters: Critter[] = []
  private readonly awake: Critter[] = []
  private readonly sound: Sound
  private readonly cadence: SaveCadence
  private readonly tracker: GestureTracker<Target>
  private readonly scheduler: HintScheduler
  private readonly childAge: number | null
  private projector: Projector | null = null
  private readonly drags: Drag[] = []
  private readonly flights: Flight[] = []
  private readonly dents: Dent[] = []
  private readonly trayGrow: Record<PartKind, number>
  private readonly traySquash: Record<PartKind, number>
  private readonly traySquashV: Record<PartKind, number>
  private pendingLump: { save: CritterSave; at: number } | null = null
  /** What a tapped lump points at: the tray part it wants hops once, or its nose glows. */
  private callOut: CallOut | null = null
  /** Seconds of attended play; stands still while the workshop is put away. */
  t = 0
  turntableAngle = 0.25
  private spinVelocity = 0
  guidance: GuidanceView = { hint: null, hand: null, glow: 0, invite: null, ghost: null, ghostHue: 0, ghostSettle: 0 }
  private readonly timing: GuidanceTiming = { demo: null, glow: 0, invite: null }
  private readonly handOut: HandPose & { y: number } = { x: 0, y: 0, z: 0, height: 0, press: 0, opacity: 0, carry: false, release: 0 }
  private hint: Hint | null = null
  private hintStale = true
  private sleeperMode: string | null = null
  private readonly handFrom: Point = { x: 0, z: 0 }
  private readonly world: WorldView
  private readonly offerPoint: Point = { x: 0, z: 0 }
  private readonly shownPoint: Point = { x: 0, z: 0 }
  private readonly cheerPoint: Point = { x: 0, z: 0 }
  private lastSnore = 0
  readonly ghostMatrix = new THREE.Matrix4()
  private readonly ghostSocket = new THREE.Matrix4()
  private readonly demoDrop = new THREE.Vector3()
  private readonly m = new THREE.Matrix4()
  private readonly m2 = new THREE.Matrix4()
  private readonly v = new THREE.Vector3()
  private readonly v2 = new THREE.Vector3()
  private readonly q = new THREE.Quaternion()
  private readonly q2 = new THREE.Quaternion()
  private readonly s = new THREE.Vector3()
  private readonly s2 = new THREE.Vector3()
  private readonly screen: Screen = { x: 0, y: 0 }
  private readonly plane: Point = { x: 0, z: 0 }
  private readonly greet = (a: Critter, b: Critter) => {
    a.greet(b)
    b.greet(a)
  }

  constructor(state: WorkshopState, options: { save: (state: WorkshopState) => void; sound?: Sound; childAge?: number | null }) {
    this.state = state
    this.sound = options.sound ?? silentSound
    this.childAge = options.childAge ?? null
    this.cadence = new SaveCadence(() => {
      this.syncSaves()
      options.save(serialize(this.state))
    })
    this.tracker = new GestureTracker<Target>(
      (at) => this.hitTest(at),
      (target) => target.kind === 'tray',
    )
    this.scheduler = new HintScheduler(0)
    this.trayGrow = {} as Record<PartKind, number>
    this.traySquash = {} as Record<PartKind, number>
    this.traySquashV = {} as Record<PartKind, number>
    for (const kind of PART_KINDS) {
      this.trayGrow[kind] = 1
      this.traySquash[kind] = 0
      this.traySquashV[kind] = 0
    }
    if (state.sleeper) this.critters.push(new Critter(state.sleeper, 'sleeping'))
    for (const save of state.awake) this.critters.push(new Critter(save, 'idling'))
    this.world = { t: 0, awake: this.awake, offer: null, shown: null, cheer: null, turntableAngle: this.turntableAngle, sound: this.sound }
    this.refreshAwake()
    this.step(0)
  }

  setProjector(projector: Projector): void {
    this.projector = projector
    this.step(0)
  }

  /** Attended and visible: sound and time run. Otherwise every gesture ends where it is. */
  setRunning(running: boolean): void {
    this.sound.setActive(running)
    if (!running) this.pause()
  }

  dispose(): void {
    this.pause()
    this.sound.dispose()
  }

  get snapPx(): number {
    return this.childAge === null || this.childAge <= 4 ? 84 : 66
  }

  // --- lifecycle -------------------------------------------------------------------

  pause(): void {
    this.tracker.reset()
    for (const drag of this.drags) this.endDrag(drag, false)
    this.drags.length = 0
    this.cadence.settle(performance.now())
  }

  private syncSaves(): void {
    for (const critter of this.critters) {
      if (!critter.awake || critter.gone) continue
      critter.save.x = critter.mode === 'carried' ? critter.carryAt.x : critter.mover.x
      critter.save.z = critter.mode === 'carried' ? critter.carryAt.z : critter.mover.z
      critter.save.heading = critter.mover.heading
    }
  }

  private refreshAwake(): void {
    this.awake.length = 0
    for (const critter of this.critters) if (critter.awake && !critter.gone) this.awake.push(critter)
    this.hintStale = true
  }

  private critterById(id: number): Critter | null {
    for (const critter of this.critters) if (critter.save.id === id && !critter.gone) return critter
    return null
  }

  get sleeper(): Critter | null {
    const id = this.state.sleeper?.id
    return id === undefined ? null : this.critterById(id)
  }

  // --- the frame ---------------------------------------------------------------------

  step(dt: number): void {
    this.t += dt
    const now = this.t
    if (this.callOut && now >= this.callOut.t0 + CALL_SECONDS) this.callOut = null
    this.spinTurntable(dt)
    this.updateDrags(dt)
    if (this.pendingLump && now >= this.pendingLump.at) {
      if (this.state.sleeper?.id === this.pendingLump.save.id) {
        this.critters.push(new Critter(this.pendingLump.save, 'plopping'))
        this.sound.whoosh()
      }
      this.pendingLump = null
    }

    const timing = this.scheduler.timing(now, this.timing)
    const sleeperMode = this.sleeper?.mode ?? null
    if (sleeperMode !== this.sleeperMode) {
      this.sleeperMode = sleeperMode
      this.hintStale = true
    }
    if (this.hintStale) {
      this.hint = chooseHint(this.summary(), TURNTABLE)
      this.hintStale = false
    }
    const world = this.world
    world.t = now
    world.turntableAngle = this.turntableAngle
    world.offer = null
    for (const drag of this.drags) {
      if (drag.type !== 'part') continue
      this.offerPoint.x = drag.at.x
      this.offerPoint.z = drag.at.z
      world.offer = this.offerPoint
      break
    }
    const shown = this.guidance.hand
    world.shown = null
    if (shown && this.guidance.ghost) {
      this.shownPoint.x = shown.x
      this.shownPoint.z = shown.z
      world.shown = this.shownPoint
    }
    const sleeper = this.sleeper
    world.cheer = null
    if (sleeper && sleeper.mode === 'sleeping' && friendsCheer(this.summaryScratch(sleeper), timing.glow)) {
      this.cheerPoint.x = sleeper.mover.x
      this.cheerPoint.z = sleeper.mover.z
      world.cheer = this.cheerPoint
    }

    let changed = false
    for (const critter of this.critters) {
      const wasAwake = critter.awake
      critter.update(dt, world)
      if (critter.awake !== wasAwake || critter.gone) changed = true
      if (critter.drifted) {
        critter.drifted = false
        this.cadence.drift(performance.now())
      }
    }
    if (changed) {
      for (let i = this.critters.length - 1; i >= 0; i--) if (this.critters[i].gone) this.critters.splice(i, 1)
      this.refreshAwake()
    }
    findGreetings(this.awake, MEET_RADIUS, this.greet)
    if (sleeper && sleeper.mode === 'sleeping') {
      const bubble = snoreBubble(sleeper.profile.temperament, sleeper.age)
      if (bubble > 0 && this.lastSnore === 0 && sleeper.sniff < 0.2) this.sound.snore(sleeper.profile.voice, SLEEP_BREATH[sleeper.profile.temperament].bubble)
      this.lastSnore = bubble
    }
    this.updateTray(dt)
    this.guidance = this.computeGuidance(timing)
    this.layout()
  }

  private readonly summaryObject: { sleeper: { parts: readonly Part[] } | null; awake: { id: number; x: number; z: number }[]; childAge: number | null } = {
    sleeper: null,
    awake: [],
    childAge: null,
  }
  private readonly sleeperView: { parts: readonly Part[] } = { parts: [] }

  private summaryScratch(sleeper: Critter | null): WorkshopSummary {
    const summary = this.summaryObject
    summary.childAge = this.childAge
    if (sleeper && sleeper.mode === 'sleeping') {
      this.sleeperView.parts = sleeper.save.parts
      summary.sleeper = this.sleeperView
    } else summary.sleeper = null
    while (summary.awake.length < this.awake.length) summary.awake.push({ id: 0, x: 0, z: 0 })
    summary.awake.length = this.awake.length
    for (let i = 0; i < this.awake.length; i++) {
      const entry = summary.awake[i]
      entry.id = this.awake[i].save.id
      entry.x = this.awake[i].mover.x
      entry.z = this.awake[i].mover.z
    }
    return summary
  }

  private summary(): WorkshopSummary {
    return this.summaryScratch(this.sleeper)
  }

  private spinTurntable(dt: number): void {
    let spinning = false
    for (const drag of this.drags) if (drag.type === 'spin') spinning = true
    if (!spinning) this.spinVelocity *= Math.exp(-dt * 2.2)
    this.turntableAngle += this.spinVelocity * dt
    if (Math.abs(this.spinVelocity) < 0.01) this.spinVelocity = 0
  }

  private updateTray(dt: number): void {
    for (const kind of PART_KINDS) {
      if (this.trayGrow[kind] < 1) this.trayGrow[kind] = Math.min(1, this.trayGrow[kind] + dt / TRAY_GROW_SECONDS)
      const v = this.traySquashV[kind] + (-this.traySquash[kind] * 220 - this.traySquashV[kind] * 12) * dt
      this.traySquashV[kind] = v
      this.traySquash[kind] += v * dt
    }
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i]
      if (this.t - flight.t0 < flight.duration) continue
      this.flights.splice(i, 1)
      this.traySquashV[flight.part.kind] += 9
      this.sound.plop()
    }
    for (let i = this.dents.length - 1; i >= 0; i--) if (this.t - this.dents[i].t0 > DENT_SECONDS) this.dents.splice(i, 1)
  }

  // --- touch ---------------------------------------------------------------------

  pointerDown(pointerId: number, at: Screen, time: number): void {
    this.sound.unlock()
    this.scheduler.touch(this.t)
    this.handle(this.tracker.down(pointerId, at, time))
  }

  pointerMove(pointerId: number, at: Screen, time: number): void {
    this.handle(this.tracker.move(pointerId, at, time))
  }

  pointerUp(pointerId: number, at: Screen, time: number): void {
    this.handle(this.tracker.up(pointerId, at, time))
  }

  pointerCancel(pointerId: number): void {
    this.handle(this.tracker.cancel(pointerId))
  }

  private handle(intents: Intent<Target>[]): void {
    for (const intent of intents) {
      switch (intent.type) {
        case 'press':
          this.press(intent.pointerId, intent.target)
          break
        case 'tap':
          this.tap(intent.target)
          break
        case 'dragStart':
          this.dragStart(intent.pointerId, intent.target)
          break
        case 'dragMove': {
          const drag = this.dragOf(intent.pointerId)
          if (drag && drag.type !== 'spin') {
            drag.screen.x = intent.at.x
            drag.screen.y = intent.at.y
          } else if (drag) this.spinMove(drag, intent.at)
          break
        }
        case 'dragEnd': {
          const drag = this.dragOf(intent.pointerId)
          if (!drag) break
          if (drag.type !== 'spin') {
            drag.screen.x = intent.at.x
            drag.screen.y = intent.at.y
          }
          this.removeDrag(drag)
          this.endDrag(drag, true)
          break
        }
        case 'cancelAll':
          for (const pointerId of intent.pointerIds) {
            const drag = this.dragOf(pointerId)
            if (!drag) continue
            this.removeDrag(drag)
            this.endDrag(drag, false)
          }
          break
        default: {
          const unreachable: never = intent
          return unreachable
        }
      }
    }
  }

  private lastPress: Screen = { x: 0, y: 0 }

  private dragOf(pointerId: number): Drag | null {
    for (const drag of this.drags) if (drag.pointerId === pointerId) return drag
    return null
  }

  private removeDrag(drag: Drag): void {
    const index = this.drags.indexOf(drag)
    if (index >= 0) this.drags.splice(index, 1)
  }

  private setDrag(drag: Drag): void {
    const existing = this.dragOf(drag.pointerId)
    if (existing) this.removeDrag(existing)
    this.drags.push(drag)
  }

  private hitTest(at: Screen): Target {
    this.lastPress = { x: at.x, y: at.y }
    const projector = this.projector
    if (!projector) return { kind: 'bench' }
    let best: Target | null = null
    let bestScore = 1
    const consider = (x: number, y: number, z: number, radius: number, target: Target, minPx = MIN_HIT_PX) => {
      if (!projector.toScreen(x, y, z, this.screen)) return
      const r = Math.max(minPx, projector.scaleAt(x, y, z) * radius)
      const score = Math.hypot(this.screen.x - at.x, this.screen.y - at.y) / r
      if (score < bestScore) {
        bestScore = score
        best = target
      }
    }
    let asleep = false
    for (const critter of this.critters) {
      if (critter.gone || critter.mode === 'waking' || critter.mode === 'plopping' || critter.mode === 'squashing') continue
      const w = critter.world
      const before: Target | null = best
      consider(w.nose[0], w.nose[1], w.nose[2], 2.4, { kind: 'nose', critterId: critter.save.id }, critter.sleeping ? 34 : MIN_HIT_PX)
      for (let i = 0; i < critter.save.parts.length; i++) {
        consider(w.parts[i * 3], w.parts[i * 3 + 1], w.parts[i * 3 + 2], PART_HIT[critter.save.parts[i].kind], { kind: 'part', critterId: critter.save.id, index: i })
      }
      if (best !== before) asleep = !critter.awake
    }
    if (best && (asleep || bestScore < SURE_PART)) return best
    const feature = best
    const featureScore = bestScore
    best = null
    bestScore = BELLY_CORE
    for (const critter of this.critters) {
      if (critter.gone || !critter.awake) continue
      const w = critter.world
      consider(w.body[0], w.body[1], w.body[2], w.bodyR, { kind: 'body', critterId: critter.save.id }, 30)
    }
    if (best) return best
    best = feature
    bestScore = featureScore
    if (best) return best
    bestScore = 1
    for (const critter of this.critters) {
      if (critter.gone || critter.mode === 'waking' || critter.mode === 'plopping' || critter.mode === 'squashing') continue
      const w = critter.world
      consider(w.body[0], w.body[1], w.body[2], w.bodyR, { kind: 'body', critterId: critter.save.id }, 30)
    }
    if (best) return best
    for (const kind of PART_KINDS) {
      const slot = traySlot(kind)
      consider(slot.x, TRAY.height + displayBase(kind) * 0.6, slot.z, TRAY_SLOT_RADIUS, { kind: 'tray', part: kind }, 28)
    }
    if (best) return best
    if (projector.toPlane(at, TURNTABLE.height, this.plane) && onTurntable(this.plane, 2)) return { kind: 'turntable' }
    return { kind: 'bench' }
  }

  private press(pointerId: number, target: Target): void {
    switch (target.kind) {
      case 'bench': {
        const projector = this.projector
        if (projector && projector.toPlane(this.lastPress, 0, this.plane)) {
          this.dents.push({ x: this.plane.x, z: this.plane.z, t0: this.t })
          if (this.dents.length > 6) this.dents.shift()
        }
        this.sound.pat()
        break
      }
      case 'tray':
        this.pickFromTray(pointerId, target.part)
        break
      case 'part':
      case 'nose':
      case 'body':
      case 'turntable':
        break
      default: {
        const unreachable: never = target
        return unreachable
      }
    }
  }

  private tap(target: Target): void {
    switch (target.kind) {
      case 'nose': {
        const critter = this.critterById(target.critterId)
        if (!critter) return
        if (critter.mode === 'sleeping' && critter.save.id === this.state.sleeper?.id) {
          if (critter.save.parts.length === 0) this.peekAtTray(critter)
          else this.wakeSleeper(critter)
        } else if (critter.onFeet) {
          critter.react()
          critter.kick(0.4)
          this.sound.voice(critter, 'tap')
        } else if (!critter.awake) critter.nudge()
        return
      }
      case 'part': {
        const critter = this.critterById(target.critterId)
        if (!critter) return
        critter.poke = { index: target.index, t: 0 }
        this.sound.boing()
        if (critter.onFeet) {
          critter.react()
          this.sound.voice(critter, 'tap')
        } else if (!critter.awake) {
          critter.nudge()
          this.sound.mumble(critter.profile.voice)
        }
        return
      }
      case 'body': {
        const critter = this.critterById(target.critterId)
        if (!critter) return
        if (critter.onFeet) {
          critter.react()
          critter.kick(0.5)
          this.sound.voice(critter, 'tap')
        } else if (!critter.awake) {
          critter.nudge()
          this.sound.mumble(critter.profile.voice)
          if (critter.mode === 'sleeping' && critter.save.id === this.state.sleeper?.id) this.callOutWant(critter)
        }
        return
      }
      case 'turntable':
        this.spinVelocity += 2.4
        this.sound.spin(0.6)
        return
      case 'tray':
      case 'bench':
        return
      default: {
        const unreachable: never = target
        return unreachable
      }
    }
  }

  private dragStart(pointerId: number, target: Target): void {
    if (this.dragOf(pointerId)) return
    const screen = { x: this.lastPress.x, y: this.lastPress.y }
    switch (target.kind) {
      case 'part': {
        const critter = this.critterById(target.critterId)
        if (!critter || target.index >= critter.save.parts.length) return
        for (const drag of this.drags) if (drag.type === 'pull' && drag.critter === critter) return
        this.setDrag({ type: 'pull', pointerId, critter, index: target.index, screen, from: { x: screen.x, y: screen.y } })
        critter.pull = { index: target.index, amount: 0, x: critter.mover.x, z: critter.mover.z }
        return
      }
      case 'body':
      case 'nose': {
        const critter = this.critterById(target.critterId)
        if (!critter) return
        if (critter.onFeet) {
          critter.pickUp()
          this.setDrag({ type: 'carry', pointerId, critter, screen })
          this.sound.voice(critter, 'carry')
          this.refreshAwake()
        } else if (critter.sleeping) this.setDrag({ type: 'spin', pointerId, lastX: screen.x, lastT: this.t })
        return
      }
      case 'turntable':
        this.setDrag({ type: 'spin', pointerId, lastX: screen.x, lastT: this.t })
        return
      case 'tray':
      case 'bench':
        return
      default: {
        const unreachable: never = target
        return unreachable
      }
    }
  }

  private spinMove(drag: SpinDrag, at: Screen): void {
    const dx = at.x - drag.lastX
    const dt = Math.max(1 / 120, this.t - drag.lastT)
    this.turntableAngle += dx * 0.012
    this.spinVelocity = this.spinVelocity * 0.6 + ((dx * 0.012) / dt) * 0.4
    drag.lastX = at.x
    drag.lastT = this.t
  }

  private pickFromTray(pointerId: number, kind: PartKind): void {
    if (this.trayGrow[kind] < 0.6) return
    const hue = takeFromTray(this.state, kind)
    this.trayGrow[kind] = -0.3
    const slot = traySlot(kind)
    const at = new THREE.Vector3(slot.x, TRAY.height + displayBase(kind), slot.z)
    this.setDrag({ type: 'part', pointerId, part: { kind, hue }, screen: { x: this.lastPress.x, y: this.lastPress.y }, at, vx: 0, vz: 0, magnet: null, pull: 0, age: 0 })
    this.sound.pick()
    this.cadence.now(performance.now())
    this.hintStale = true
  }

  private updateDrags(dt: number): void {
    const projector = this.projector
    for (const drag of this.drags) {
      switch (drag.type) {
        case 'part':
          this.updatePartDrag(drag, dt)
          break
        case 'pull':
          this.updatePull(drag)
          break
        case 'carry':
          if (projector && projector.toPlane(drag.screen, CARRY_HEIGHT, this.plane)) {
            const k = 1 - Math.exp(-dt * 20)
            drag.critter.carryAt.x += (this.plane.x - drag.critter.carryAt.x) * k
            drag.critter.carryAt.z += (this.plane.z - drag.critter.carryAt.z) * k
          }
          break
        case 'spin':
          break
        default: {
          const unreachable: never = drag
          return unreachable
        }
      }
    }
  }

  private updatePartDrag(drag: PartDrag, dt: number): void {
    drag.age += dt
    const projector = this.projector
    if (!projector) return
    if (projector.toPlane(drag.screen, DRAG_HEIGHT, this.plane)) {
      const k = 1 - Math.exp(-dt * 24)
      const nx = drag.at.x + (this.plane.x - drag.at.x) * k
      const nz = drag.at.z + (this.plane.z - drag.at.z) * k
      const lift = Math.min(1, drag.age / 0.12)
      const ny = drag.at.y + (DRAG_HEIGHT - drag.at.y) * lift
      if (dt > 0) {
        drag.vx += ((nx - drag.at.x) / dt - drag.vx) * Math.min(1, dt * 10)
        drag.vz += ((nz - drag.at.z) / dt - drag.vz) * Math.min(1, dt * 10)
      }
      drag.at.set(nx, ny, nz)
    }
    // magnet: the nearest body with room, measured on screen from the finger
    let best: Critter | null = null
    let bestD = this.snapPx
    for (const critter of this.critters) {
      if (critter.gone || critter.mode === 'carried' || critter.mode === 'waking' || critter.mode === 'plopping' || critter.mode === 'squashing') continue
      if (!this.rig.socket(critter, drag.part.kind, this.m)) continue
      this.v.setFromMatrixPosition(this.m)
      if (!projector.toScreen(this.v.x, this.v.y, this.v.z, this.screen)) continue
      let d = Math.hypot(this.screen.x - drag.screen.x, this.screen.y - drag.screen.y)
      // anywhere over the body takes the part too, however far its socket is from the finger
      const w = critter.world
      if (projector.toScreen(w.body[0], w.body[1], w.body[2], this.screen)) {
        const over = Math.hypot(this.screen.x - drag.screen.x, this.screen.y - drag.screen.y)
        if (over < projector.scaleAt(w.body[0], w.body[1], w.body[2]) * w.bodyR) d = Math.min(d, over * 0.5)
      }
      if (d < bestD) {
        bestD = d
        best = critter
      }
    }
    if (best !== drag.magnet) drag.pull = 0
    drag.magnet = best
    drag.pull = Math.min(1, drag.pull + dt * 7)
  }

  private updatePull(drag: PullDrag): void {
    const critter = drag.critter
    const pull = critter.pull
    if (!pull || drag.index >= critter.save.parts.length) return
    const d = Math.hypot(drag.screen.x - drag.from.x, drag.screen.y - drag.from.y)
    pull.amount = Math.min(1, d / POP_PX)
    const projector = this.projector
    if (projector && projector.toPlane(drag.screen, 0, this.plane)) {
      pull.x = this.plane.x
      pull.z = this.plane.z
    }
    if (d < POP_PX) return
    // pop! the part comes away in the finger
    const index = drag.index
    const i3 = index * 3
    const at = new THREE.Vector3(critter.world.parts[i3], critter.world.parts[i3 + 1], critter.world.parts[i3 + 2])
    const part = detach(critter.save, index)
    critter.pull = null
    if (!part) return
    critter.partRemoved(index)
    this.setDrag({ type: 'part', pointerId: drag.pointerId, part, screen: drag.screen, at, vx: 0, vz: 0, magnet: null, pull: 0, age: 0 })
    this.sound.pop(critter.profile.voice)
    if (critter.awake) {
      critter.react()
      this.sound.voice(critter, 'tap')
    } else this.sound.mumble(critter.profile.voice)
    this.cadence.now(performance.now())
    this.hintStale = true
  }

  private endDrag(drag: Drag, released: boolean): void {
    switch (drag.type) {
      case 'part': {
        const target = released ? drag.magnet : null
        if (target && !target.gone && attach(target.save, drag.part)) {
          target.partAttached()
          this.sound.squish(target.profile.voice)
          if (target.awake) this.sound.voice(target, 'greet')
          else this.sound.mumble(target.profile.voice)
          this.cadence.now(performance.now())
          this.hintStale = true
          return
        }
        this.flights.push({ part: drag.part, from: drag.at.clone(), t0: this.t, duration: FLIGHT_SECONDS, spin: (drag.vx >= 0 ? 1 : -1) * 5 })
        this.sound.whoosh()
        return
      }
      case 'pull':
        drag.critter.pull = null
        this.sound.boing()
        drag.critter.kick(-0.25)
        return
      case 'carry': {
        const critter = drag.critter
        if (critter.mode !== 'carried') return
        const blank = this.sleeper
        if (released && onTurntable(critter.carryAt, 5) && turntableFree(this.state)) {
          if (blank) blank.squashAway()
          this.pendingLump = null
          putToSleep(this.state, critter.save.id)
          critter.lieDown()
          this.sound.voice(critter, 'yawn')
        } else {
          critter.setDown()
        }
        this.refreshAwake()
        this.cadence.now(performance.now())
        return
      }
      case 'spin':
        if (Math.abs(this.spinVelocity) > 0.5) this.sound.spin(Math.min(1, Math.abs(this.spinVelocity) / 6))
        return
      default: {
        const unreachable: never = drag
        return unreachable
      }
    }
  }

  /** A bare lump is not ready to wake: it peeks at the tray, and the part it wants hops to answer. */
  private peekAtTray(critter: Critter): void {
    critter.peek()
    this.sound.mumble(critter.profile.voice)
    this.callOut = { at: 'tray', kind: partToShow(critter.save.parts, this.childAge), t0: this.t + CALL_DELAY }
  }

  /** A tap on the sleeper's body points at what it wants next: a part from the tray, or its nose once it could wake. */
  private callOutWant(critter: Critter): void {
    this.callOut =
      critter.save.parts.length < PARTS_BEFORE_NOSE
        ? { at: 'tray', kind: partToShow(critter.save.parts, this.childAge), t0: this.t + CALL_DELAY }
        : { at: 'nose', critterId: critter.save.id, t0: this.t + CALL_DELAY }
  }

  /** 0..1 through the call-out, or null before it starts and after it ends. */
  private callOutProgress(): number | null {
    const call = this.callOut
    if (!call) return null
    const k = (this.t - call.t0) / CALL_SECONDS
    return k > 0 && k < 1 ? k : null
  }

  private wakeSleeper(critter: Critter): void {
    const woken = wake(this.state)
    if (!woken) return
    critter.wake()
    if (this.state.sleeper) this.pendingLump = { save: this.state.sleeper, at: this.t + WAKE_HOP_LATEST + 0.3 }
    this.cadence.now(performance.now())
    this.hintStale = true
  }

  // --- guidance ---------------------------------------------------------------------

  private computeGuidance(timing: GuidanceTiming): GuidanceView {
    const g = this.guidance
    g.hint = this.hint
    g.glow = timing.glow
    g.invite = timing.invite
    g.hand = null
    g.ghost = null
    const hint = this.hint
    if (!hint || timing.demo === null || this.drags.length > 0) return g
    const from = this.v
    const to = this.v2
    let hasTo = true
    switch (hint.kind) {
      case 'givePart': {
        const sleeper = this.sleeper
        if (!sleeper || !this.rig.socket(sleeper, hint.part, this.ghostSocket)) return g
        const body = sleeper.world.body
        to.set(body[0], body[1] + sleeper.world.bodyR * DEMO_DROP_HEIGHT, body[2])
        this.demoDrop.copy(to)
        const slot = traySlot(hint.part)
        from.set(slot.x, TRAY.height + displayBase(hint.part), slot.z)
        break
      }
      case 'tapNose': {
        const sleeper = this.sleeper
        if (!sleeper) return g
        from.set(sleeper.world.nose[0], sleeper.world.nose[1], sleeper.world.nose[2])
        hasTo = false
        break
      }
      case 'carryToTurntable': {
        const critter = this.critterById(hint.critterId)
        if (!critter) return g
        from.set(critter.world.body[0], critter.world.body[1] + 3, critter.world.body[2])
        to.set(TURNTABLE.x, TURNTABLE.height + 6, TURNTABLE.z)
        break
      }
      default: {
        const unreachable: never = hint
        return unreachable
      }
    }
    const hand = this.handOut
    this.plane.x = to.x
    this.plane.z = to.z
    this.handFrom.x = from.x
    this.handFrom.z = from.z
    handPose(this.handFrom, hasTo ? this.plane : null, timing.demo, hand)
    const span = Math.hypot(to.x - from.x, to.z - from.z)
    const travelled = hasTo && span > 0 ? Math.min(1, Math.hypot(hand.x - from.x, hand.z - from.z) / span) : 0
    hand.y = from.y + (to.y - from.y) * (hasTo ? travelled : 0) + hand.height
    g.hand = hand
    g.ghostSettle = 0
    if (hint.kind === 'givePart' && (hand.carry || hand.release > 0)) {
      g.ghost = hint.part
      g.ghostHue = this.state.tray[hint.part]
      g.ghostSettle = hand.release
    }
    return g
  }

  /** What glows now: tray slot, sockets, nose, a critter, the turntable. */
  private guidanceGlows(): void {
    const g = this.guidance
    const hint = g.hint
    const rig = this.rig
    const strength = Math.max(g.glow, g.hand ? g.hand.opacity * 0.6 : 0)
    if (hint && strength > 0.01) {
      switch (hint.kind) {
        case 'givePart': {
          this.trayGlow(hint.part, strength)
          const sleeper = this.sleeper
          if (sleeper && rig.socketMark(sleeper, hint.part, this.v)) rig.glow(this.v.x, this.v.y, this.v.z, 5.5, strength)
          break
        }
        case 'tapNose': {
          const sleeper = this.sleeper
          if (sleeper) rig.glow(sleeper.world.nose[0], sleeper.world.nose[1], sleeper.world.nose[2], 6.5, strength)
          break
        }
        case 'carryToTurntable': {
          const critter = this.critterById(hint.critterId)
          if (critter) rig.glow(critter.world.body[0], critter.world.body[1], critter.world.body[2], critter.world.bodyR * 2.6, strength * 0.8)
          rig.glow(TURNTABLE.x, TURNTABLE.height + 1, TURNTABLE.z, TURNTABLE.r * 2.4, strength * 0.8)
          break
        }
        default: {
          const unreachable: never = hint
          return unreachable
        }
      }
    }
    if (g.invite !== null && hint?.kind === 'givePart') this.trayGlow(hint.part, Math.sin(Math.PI * g.invite))
    const call = this.callOutProgress()
    const callOut = this.callOut
    if (call !== null && callOut) {
      const strength = Math.sin(Math.PI * call)
      switch (callOut.at) {
        case 'tray':
          this.trayGlow(callOut.kind, strength)
          break
        case 'nose': {
          const critter = this.critterById(callOut.critterId)
          if (critter) rig.glow(critter.world.nose[0], critter.world.nose[1], critter.world.nose[2], 6.5, strength)
          break
        }
        default: {
          const unreachable: never = callOut
          return unreachable
        }
      }
    }
  }

  private trayGlow(kind: PartKind, strength: number): void {
    const slot = traySlot(kind)
    this.rig.glow(slot.x, TRAY.height + displayBase(kind) * 0.7, slot.z, TRAY_SLOT_RADIUS * 2.3, strength)
  }

  // --- layout ------------------------------------------------------------------------

  private layout(): void {
    const rig = this.rig
    rig.begin()
    for (const critter of this.critters) {
      rig.critter(critter)
      this.critterShadow(critter)
    }
    // the tray
    const invite = this.guidance.invite
    const invitePart = invite !== null && this.hint?.kind === 'givePart' ? this.hint.part : null
    const call = this.callOutProgress()
    const callPart = call !== null && this.callOut?.at === 'tray' ? this.callOut.kind : null
    for (const kind of PART_KINDS) {
      const grow = this.trayGrow[kind]
      if (grow <= 0) continue
      const g = grow >= 1 ? 1 : 1 + 0.18 * Math.sin(grow * Math.PI * 1.5) * (1 - grow) - (1 - grow) * (1 - grow)
      const hopping = kind === invitePart && invite !== null ? invite : kind === callPart ? call : null
      const hop = hopping !== null ? 3.2 * Math.sin(Math.PI * hopping) : 0
      const squash = this.traySquash[kind] + (hopping !== null ? 0.12 * Math.sin(Math.PI * 2 * hopping) : 0)
      rig.trayPart(kind, this.state.tray[kind], Math.max(0.01, g), hop, squash, hop > 0 || grow < 1 ? 1 : 0)
      const slot = traySlot(kind)
      rig.shadow(slot.x, TRAY.height, slot.z, 3.2 * g, 0.34 / (1 + hop * 0.3))
    }
    // parts on fingers
    for (const drag of this.drags) {
      if (drag.type !== 'part') continue
      this.dragMatrix(drag, this.m)
      rig.loose(drag.part.kind, drag.part.hue, this.m, 1, drag.pointerId * 0.13, Math.sin(this.t * 3) * 0.8, 0.3)
      rig.shadow(drag.at.x, 0, drag.at.z, 2.6, 0.3, SHADOW_SHAPE.blob, 1)
      // every body with room shows where this part would go
      for (const critter of this.critters) {
        if (critter.gone || critter.mode === 'carried' || critter.mode === 'waking' || critter.mode === 'plopping' || critter.mode === 'squashing') continue
        if (!rig.socketMark(critter, drag.part.kind, this.v)) continue
        const near = critter === drag.magnet ? 1 : 0.55
        rig.glow(this.v.x, this.v.y, this.v.z, 4.5 + 1.5 * near + 0.5 * Math.sin(this.t * 7), near)
      }
    }
    // parts flying home to the tray
    for (const flight of this.flights) {
      const k = Math.min(1, (this.t - flight.t0) / flight.duration)
      const slot = traySlot(flight.part.kind)
      const e = k * k * (3 - 2 * k)
      const x = flight.from.x + (slot.x - flight.from.x) * e
      const z = flight.from.z + (slot.z - flight.from.z) * e
      const base = TRAY.height + displayBase(flight.part.kind)
      const y = flight.from.y + (base - flight.from.y) * e + Math.sin(Math.PI * k) * 12
      this.m.makeRotationY(flight.spin * k).premultiply(this.m2.makeTranslation(x, y, z)).multiply(this.rig.display[flight.part.kind])
      const shrink = 1 - 0.35 * Math.sin(Math.PI * k)
      this.m.multiply(this.m2.makeScale(shrink, shrink, shrink))
      rig.loose(flight.part.kind, flight.part.hue, this.m, 1, 0.3)
      rig.shadow(x, k > 0.7 ? TRAY.height : 0, z, 2.4, 0.25)
    }
    // the ghost part in the demonstration hand
    const hand = this.guidance.hand
    if (hand && this.guidance.ghost) {
      const settle = this.guidance.ghostSettle
      if (settle > 0) {
        // let go on top of the lump, it slides down into the socket it will really take
        this.v.setFromMatrixPosition(this.ghostSocket)
        const k = 1 - settle
        const drop = this.demoDrop
        this.ghostMatrix.makeTranslation((drop.x - this.v.x) * k, (drop.y - this.v.y) * k, (drop.z - this.v.z) * k).multiply(this.ghostSocket)
      } else this.ghostMatrix.makeTranslation(hand.x, hand.y - 1.6, hand.z).multiply(rig.display[this.guidance.ghost])
    }
    if (hand) rig.shadow(hand.x, 0, hand.z, 2.2 + (1 - hand.press) * 1.2, 0.22 * hand.opacity)
    // thumbprint dents where the bench was patted
    for (const dent of this.dents) {
      const age = (this.t - dent.t0) / DENT_SECONDS
      rig.shadow(dent.x, 0, dent.z, 2.4 * (1 + 0.15 * Math.min(1, age * 8)), 0.55 * (1 - age), SHADOW_SHAPE.dent)
    }
    this.guidanceGlows()
    // the sleeper's snore bubble
    const sleeper = this.sleeper
    if (sleeper && sleeper.mode === 'sleeping') {
      // the bubble holds while it sniffs, so the socket glow is the only ring on its face
      const size = snoreBubble(sleeper.profile.temperament, sleeper.age) * (1 - sleeper.sniff)
      if (size > 0.02) {
        const n = sleeper.world.nose
        const heading = sleeper.mover.heading
        const out = 1.6 + size * 1.8
        rig.glow(n[0] + Math.sin(heading) * out, n[1] + 0.6 + size * 0.8, n[2] + Math.cos(heading) * out, 1 + size * 3.6, 0.9, GLOW_SHAPE.bubble)
      }
    }
    // the turntable's own soft contact shadow
    rig.shadow(TURNTABLE.x + 0.6, 0, TURNTABLE.z, TURNTABLE.r * 1.3, 0.55)
  }

  private critterShadow(critter: Critter): void {
    if (critter.gone) return
    const w = critter.world
    const height = Math.max(0, w.body[1] - critter.standLift - critter.ground)
    const onTable = critter.sleeping || critter.mode === 'lyingDown' || (critter.mode === 'waking' && critter.ground > 0.2)
    const ground = onTable ? critter.ground : 0
    const lifted = w.body[1] - ground
    // leans away from the key light (upper left, in front) so it peeks out beside the body instead of hiding under it
    this.rig.shadow(w.body[0] + lifted * 0.22, ground, w.body[2] - lifted * 0.12, w.bodyR * (1.15 + lifted * 0.02), 0.7 / (1 + height * 0.18), SHADOW_SHAPE.blob, 1.15)
    for (let i = 0; i < w.feetCount; i++) {
      const fy = w.feet[i * 3 + 1] - ground
      this.rig.shadow(w.feet[i * 3] + 0.3, ground, w.feet[i * 3 + 2], 2.1, 0.7 / (1 + Math.max(0, fy) * 0.8))
    }
  }

  /** A part on a finger: under the fingertip, tilting with its motion, sliding onto its socket when a body is near. */
  private dragMatrix(drag: PartDrag, out: THREE.Matrix4): THREE.Matrix4 {
    const tiltX = Math.max(-0.6, Math.min(0.6, drag.vz * 0.012))
    const tiltZ = Math.max(-0.6, Math.min(0.6, -drag.vx * 0.012))
    const wobble = 1 + 0.12 * Math.sin(drag.age * 18) * Math.exp(-drag.age * 5)
    this.m2.makeRotationFromEuler(eulerScratch.set(tiltX, 0, tiltZ))
    out.makeTranslation(drag.at.x, drag.at.y, drag.at.z).multiply(this.m2).multiply(this.rig.display[drag.part.kind])
    out.multiply(this.m2.makeScale(1 / Math.sqrt(wobble), wobble, 1 / Math.sqrt(wobble)))
    const magnet = drag.magnet
    if (!magnet || !this.rig.socket(magnet, drag.part.kind, this.m2)) return out
    const k = 0.75 * drag.pull
    out.decompose(this.v, this.q, this.s)
    this.m2.decompose(this.v2, this.q2, this.s2)
    this.v.lerp(this.v2, k)
    this.q.slerp(this.q2, k)
    this.s.lerp(this.s2, k)
    return out.compose(this.v, this.q, this.s)
  }
}

const eulerScratch = new THREE.Euler()
