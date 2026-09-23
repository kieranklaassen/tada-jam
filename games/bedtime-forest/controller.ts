import { CARRY_LIFT, Creature, type BrainEvent, type BrainWorld } from './brain'
import { ForestCycle, type Phase } from './cycle'
import { chooseHint, handPose, HintScheduler, type HandPose, type HintCandidate } from './guidance'
import { GestureTracker, type Intent, type ScreenPoint } from './input'
import { ANIMAL_KEYS, HOME_KEYS, HOMES, WAKE_ORDER, type AnimalKey, type HomeKey, type HomeSpec, type Point } from './layout'
import { createRng, type Rng } from './rng'
import { SaveCadence } from './saveCadence'
import { serialize, type ForestState } from './state'

// The forest while it is on screen: the animals' brains, the dusk-to-dawn
// cycle, touch, guidance, sound, and saving. It knows nothing about
// rendering; the 3D view reads its fields every frame and hands it a
// projector for hit tests. Everything that runs per frame is
// allocation-free.

export type Cue = BrainEvent | 'pickup' | 'hover' | 'stir' | 'rustle' | 'twinkle' | 'invite' | 'answer'

export type Sound = {
  unlock(): void
  setActive(active: boolean): void
  cue(cue: Cue, animal: AnimalKey | null, strength: number): void
  knock(home: HomeKey): void
  phase(phase: Phase): void
  dispose(): void
}

export const silentSound: Sound = {
  unlock() {},
  setActive() {},
  cue() {},
  knock() {},
  phase() {},
  dispose() {},
}

/** How the view maps between the screen and the world. Both write into `out` and return false when off screen. */
export type Projector = {
  toScreen(x: number, y: number, z: number, out: ScreenPoint): boolean
  toPlane(sx: number, sy: number, height: number, out: Point): boolean
}

export type FxKind = 'dust' | 'splash' | 'leaves' | 'sparkle' | 'puff' | 'feather'

export type FxEvent = { kind: FxKind; x: number; y: number; z: number; t: number; animal: number; home: number; strength: number }

export const FX_CAPACITY = 32
const HIT_SLOP_PX = 18
const HOME_SLOP_PX = 10
const DEMO_LIFT_AT = 0.24
const DEMO_SET_DOWN_AT = 0.74
const NO_POINTER = -1
/** The front of the homes and trees at the back of the clearing: a carried animal is never held behind it. */
const CARRY_BACK_Z = -36
/** How far up the finger's ray a carried animal may rise to stay in front of them. */
const MAX_CARRY_RAISE = 60

const HOME_INDEX = Object.fromEntries(HOME_KEYS.map((key, index) => [key, index])) as Record<HomeKey, number>
/** Creatures are indexed like ANIMAL_KEYS, homes like HOME_KEYS; each animal shares its home's index. */
const WAKE_INDEX: readonly number[] = WAKE_ORDER.map((key) => ANIMAL_KEYS.indexOf(key))

export class ForestController implements BrainWorld {
  readonly state: ForestState
  readonly creatures: Creature[]
  readonly cycle = new ForestCycle()
  readonly rng: Rng
  gazeHome = false
  readonly leanWhenHeld: boolean
  /** Seconds of attended play; stands still while the forest is put away. */
  t = 0
  /** Per creature: the pointer carrying it, or -1. */
  readonly holder: number[]
  /** Per creature: the home it is carried over (index into HOME_KEYS), or -1. */
  readonly hovering: number[]
  /** Per creature: has the finger holding it moved past the tap slop? Only a real carry reaches a home. */
  private readonly carried: boolean[]
  /** Per home: when it was last knocked, bumped, or shaken (attended seconds), for the view's wobble. */
  readonly shook: number[]
  /** Guidance for the view: which animal gets the breathing ring and how strongly. */
  glowIndex = -1
  glow = 0
  readonly hand: HandPose = { x: 0, z: 0, press: 0, opacity: 0 }
  /** Which animal the ghost hand is showing, or -1. */
  handAnimal = -1
  readonly fx: FxEvent[] = []
  /** Total fx events ever pushed; the view reads the ring from its last count to this. */
  fxCount = 0

  private readonly sound: Sound
  private readonly cadence: SaveCadence
  private readonly tracker = new GestureTracker()
  private readonly scheduler = new HintScheduler(0)
  private projector: Projector | null = null
  private readonly screens = new Map<number, ScreenPoint>()
  private readonly candidates: HintCandidate[] = []
  private readonly screenA: ScreenPoint = { x: 0, y: 0 }
  private readonly screenB: ScreenPoint = { x: 0, y: 0 }
  private readonly plane: Point = { x: 0, z: 0 }
  private readonly resting: Point = { x: 0, z: 0 }
  private readonly demoFrom: Point = { x: 0, z: 0 }
  private readonly demoTo: Point = { x: 0, z: 0 }
  private hintIndex = -1
  private demoActive = false
  private demoCarry = -1
  private inviteIndex = -1
  private inviteUntil = 0
  private carrying = false

  constructor(state: ForestState, options: { save: (state: ForestState) => void; sound?: Sound; childAge?: number | null; seed?: number }) {
    this.state = state
    this.sound = options.sound ?? silentSound
    this.leanWhenHeld = options.childAge === undefined || options.childAge === null || options.childAge <= 4
    this.rng = createRng(options.seed ?? 20260923)
    this.cadence = new SaveCadence(() => options.save(serialize(this.snapshot())))
    this.creatures = ANIMAL_KEYS.map((key, index) => new Creature(key, index, index / ANIMAL_KEYS.length))
    this.holder = this.creatures.map(() => NO_POINTER)
    this.hovering = this.creatures.map(() => -1)
    this.carried = this.creatures.map(() => false)
    this.shook = HOME_KEYS.map(() => -10)
    for (let i = 0; i < this.creatures.length; i++) this.candidates.push({ index: i, x: 0, z: 0, homeX: 0, homeZ: 0 })
    for (let i = 0; i < FX_CAPACITY; i++) this.fx.push({ kind: 'dust', x: 0, y: 0, z: 0, t: -10, animal: -1, home: -1, strength: 0 })
    for (const creature of this.creatures) {
      const saved = state.animals[creature.key]
      if (saved.asleep) creature.sleepAtHome()
      else creature.placeAt(saved.x, saved.z)
    }
    if (this.allAsleep()) this.cycle.startNight()
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

  /** The forest was put away, faded, or hidden mid-carry: every animal is set down where it is. */
  pause(): void {
    this.tracker.reset()
    this.screens.clear()
    for (let i = 0; i < this.creatures.length; i++) if (this.holder[i] !== NO_POINTER) this.letGo(i, false)
    this.endDemo()
    this.cadence.settle(performance.now())
  }

  // --- BrainWorld --------------------------------------------------------------

  occupied(home: HomeKey, except: Creature): boolean {
    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i]
      if (c === except || c.spec.home !== home) continue
      if (c.atHome || c.mode === 'travel' || (c.mode === 'toHome' && c.visiting === home)) return true
    }
    return false
  }

  emit(event: BrainEvent, creature: Creature): void {
    const weight = creature.spec.weight
    this.sound.cue(event, creature.key, event === 'land' ? 0.35 + weight * 0.65 : 1)
    const home = creature.visiting === null ? -1 : HOME_INDEX[creature.visiting]
    const mouth = creature.visiting === null ? null : HOMES[creature.visiting].mouth
    const i = creature.index
    switch (event) {
      case 'land':
        this.pushFx('dust', creature.x, 0, creature.z, i, -1, 0.4 + weight)
        break
      case 'settle':
        this.pushFx('sparkle', creature.x, creature.y + creature.spec.size * 0.6, creature.z, i, home, 1)
        this.cadence.change(performance.now(), true)
        break
      case 'bumped':
        if (home >= 0 && mouth) {
          this.shook[home] = this.t
          this.pushFx('leaves', mouth.x, mouth.y + 4, mouth.z, i, home, 0.6 + weight)
          const occupant = this.creatures[HOME_INDEX[creature.visiting!]]
          if (occupant !== creature) occupant.stir()
        }
        break
      case 'splash':
      case 'plop':
        if (mouth) this.pushFx('splash', mouth.x, 0, mouth.z, i, home, event === 'plop' ? 0.6 : 1)
        break
      case 'shake':
        this.pushFx('splash', creature.x, creature.spec.size * 0.5, creature.z, i, -1, 0.45)
        break
      case 'slid':
      case 'tipped':
        if (home >= 0 && mouth) {
          this.shook[home] = this.t
          this.pushFx('leaves', mouth.x, mouth.y, mouth.z, i, home, 0.5)
        }
        break
      case 'flap':
        this.pushFx('feather', creature.x, creature.y + creature.spec.size * 0.5, creature.z, i, home, 0.7)
        break
      case 'flop':
        this.pushFx('dust', creature.x, creature.y, creature.z, i, home, 0.4)
        break
      case 'snore':
        this.pushFx('puff', creature.x, creature.y + creature.spec.size * 0.7, creature.z, i, HOME_INDEX[creature.spec.home], 0.5)
        break
      case 'wake':
        this.pushFx('puff', creature.x, creature.y + creature.spec.size * 0.8, creature.z, i, HOME_INDEX[creature.spec.home], 1)
        break
      case 'exit':
        this.cadence.change(performance.now(), true)
        break
      case 'yawn':
      case 'trick':
      case 'shiver':
        break
      default: {
        const unreachable: never = event
        return unreachable
      }
    }
  }

  // --- the step ----------------------------------------------------------------

  step(dt: number): void {
    this.t += dt
    const now = this.t
    for (let i = 0; i < this.creatures.length; i++) {
      const pointerId = this.holder[i]
      if (pointerId === NO_POINTER) continue
      const creature = this.creatures[i]
      const screen = this.screens.get(pointerId)
      const height = screen ? this.holdPoint(creature, screen) : -1
      if (height >= 0) creature.setGrab(this.plane.x, this.plane.z, height)
      this.updateHover(i, screen)
    }

    this.updateGuidance(now)

    this.cycle.step(dt, this.allAsleep())
    const entered = this.cycle.entered
    if (entered !== null) this.sound.phase(entered)
    if (this.cycle.phase === 'dawn') {
      for (let order = 0; order < WAKE_INDEX.length; order++) {
        const creature = this.creatures[WAKE_INDEX[order]]
        if ((creature.mode === 'asleep' || creature.mode === 'settle') && this.cycle.wakeDue(order)) {
          creature.wake()
          this.emit('wake', creature)
        }
      }
    }

    for (let i = 0; i < this.creatures.length; i++) this.creatures[i].step(dt, this)
    if (this.carrying) this.cadence.change(performance.now())
  }

  allAsleep(): boolean {
    for (let i = 0; i < this.creatures.length; i++) if (!this.creatures[i].asleep) return false
    return true
  }

  private updateGuidance(now: number): void {
    let count = 0
    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i]
      if (!this.free(i)) continue
      const door = HOMES[c.spec.home].door
      const candidate = this.candidates[count++]
      candidate.index = i
      candidate.x = c.x
      candidate.z = c.z
      candidate.homeX = door.x
      candidate.homeZ = door.z
    }
    const quiet = !this.cycle.playful || count === 0 || this.anyHeldByChild()
    const timing = this.scheduler.update(now, quiet)
    this.gazeHome = timing.glow > 0

    // Before the first touch, the animal that invites is the one the ring and the ghost hand then show,
    // so a newcomer follows one animal from its yawn to the demonstration.
    const inviter = !this.scheduler.touched && this.inviteIndex >= 0 && this.free(this.inviteIndex) ? this.inviteIndex : -1
    if (timing.invite && count > 0) {
      const index = this.hintIndex >= 0 ? this.hintIndex : inviter >= 0 ? inviter : chooseHint(this.candidates, count)
      const creature = this.creatures[index]
      if (creature.mode === 'idle' || creature.mode === 'walk') {
        creature.invite()
        this.sound.cue('invite', creature.key, 1)
        this.inviteIndex = index
        this.inviteUntil = now + creature.motion.yawn
      }
    }

    if (timing.glow <= 0 && timing.demo < 0) this.hintIndex = -1
    else if (this.hintIndex < 0 || !this.free(this.hintIndex)) this.hintIndex = inviter >= 0 ? inviter : chooseHint(this.candidates, count)

    if (timing.demo >= 0 && this.hintIndex >= 0) this.runDemo(timing.demo)
    else this.endDemo()

    if (this.hintIndex >= 0 && timing.glow > 0) {
      this.glowIndex = this.hintIndex
      this.glow = timing.glow
    } else if (this.inviteIndex >= 0 && now < this.inviteUntil) {
      this.glowIndex = this.inviteIndex
      this.glow = Math.sin(((this.inviteUntil - now) / this.creatures[this.inviteIndex].motion.yawn) * Math.PI)
    } else {
      this.glowIndex = -1
      this.glow = 0
    }
  }

  private runDemo(progress: number): void {
    const index = this.hintIndex
    const creature = this.creatures[index]
    if (!this.demoActive) {
      this.demoActive = true
      const door = HOMES[creature.spec.home].door
      this.demoFrom.x = creature.x
      this.demoFrom.z = creature.z
      this.demoTo.x = door.x
      this.demoTo.z = door.z
    }
    handPose(this.demoFrom, this.demoTo, progress, this.hand)
    this.handAnimal = index
    if (this.demoCarry < 0 && progress >= DEMO_LIFT_AT && progress < DEMO_SET_DOWN_AT && creature.roaming) {
      creature.pickUp()
      this.demoCarry = index
      this.sound.cue('pickup', creature.key, 0.45)
    }
    if (this.demoCarry < 0) return
    if (progress >= DEMO_SET_DOWN_AT) {
      creature.drop(false)
      this.demoCarry = -1
    } else creature.setGrab(this.hand.x, this.hand.z)
  }

  private endDemo(): void {
    if (this.demoCarry >= 0) this.creatures[this.demoCarry].drop(false)
    this.demoCarry = -1
    this.demoActive = false
    this.handAnimal = -1
    this.hand.opacity = 0
    this.hand.press = 0
  }

  /** Awake on the open ground (or in the ghost hand): something guidance can point at. */
  private free(index: number): boolean {
    const c = this.creatures[index]
    return c.roaming || c.mode === 'fall' || index === this.demoCarry
  }

  private anyHeldByChild(): boolean {
    for (let i = 0; i < this.holder.length; i++) if (this.holder[i] !== NO_POINTER) return true
    return false
  }

  // --- saving ------------------------------------------------------------------

  /** The forest as it would be remembered right now. */
  snapshot(): ForestState {
    for (const creature of this.creatures) {
      const saved = this.state.animals[creature.key]
      creature.restingPoint(this.resting)
      saved.asleep = creature.homeBound
      saved.x = this.resting.x
      saved.z = this.resting.z
    }
    return this.state
  }

  // --- input -------------------------------------------------------------------

  pointerDown(pointerId: number, screen: ScreenPoint, timeMs: number): void {
    this.sound.unlock()
    this.scheduler.touch(this.t)
    this.endDemo()
    this.screens.set(pointerId, { x: screen.x, y: screen.y })
    this.apply(this.tracker.down(pointerId, screen, timeMs), screen)
  }

  pointerMove(pointerId: number, screen: ScreenPoint): void {
    const known = this.screens.get(pointerId)
    if (!known) return
    known.x = screen.x
    known.y = screen.y
    this.apply(this.tracker.move(pointerId, screen), screen)
  }

  pointerUp(pointerId: number, screen: ScreenPoint, timeMs: number): void {
    this.scheduler.touch(this.t)
    const known = this.screens.get(pointerId)
    if (known) {
      known.x = screen.x
      known.y = screen.y
    }
    this.apply(this.tracker.up(pointerId, timeMs), screen)
    this.screens.delete(pointerId)
  }

  pointerCancel(pointerId: number): void {
    const index = this.holder.indexOf(pointerId)
    this.tracker.cancel(pointerId)
    if (index >= 0) this.letGo(index, false)
    this.screens.delete(pointerId)
  }

  private apply(intents: Intent[], screen: ScreenPoint): void {
    for (const intent of intents) this.handle(intent, screen)
  }

  private handle(intent: Intent, screen: ScreenPoint): void {
    switch (intent.type) {
      case 'press':
        return this.press(intent.pointerId, screen)
      case 'tap':
        return this.release(intent.pointerId, screen, true)
      case 'dragStart':
        return this.dragStart(intent.pointerId, screen)
      case 'dragEnd':
        return this.release(intent.pointerId, screen, false)
      case 'cancelAll':
        for (const pointerId of intent.pointerIds) {
          const index = this.holder.indexOf(pointerId)
          if (index >= 0) this.letGo(index, false)
        }
        return
      default: {
        const unreachable: never = intent
        return unreachable
      }
    }
  }

  private press(pointerId: number, screen: ScreenPoint): void {
    const index = this.creatureAt(screen)
    if (index >= 0) {
      const creature = this.creatures[index]
      if (creature.roaming || creature.mode === 'fall') return this.lift(index, pointerId)
      if (creature.asleep) {
        creature.stir()
        this.sound.cue('stir', creature.key, 1)
        return
      }
      this.sound.cue('rustle', null, 0.5)
      return
    }
    const home = this.homeAt(screen.x, screen.y)
    if (home >= 0) {
      this.shook[home] = this.t
      this.sound.knock(HOME_KEYS[home])
      // Whoever lives there answers the knock, so a tap on a home says whose it is.
      const owner = this.creatures[home]
      if (owner.asleep) owner.stir()
      else if (this.cycle.playful && owner.answer()) this.sound.cue('answer', owner.key, 1)
      const mouth = HOMES[HOME_KEYS[home]].mouth
      this.pushFx(HOME_KEYS[home] === 'pond' ? 'splash' : 'leaves', mouth.x, mouth.y + 2, mouth.z, -1, home, 0.35)
      return
    }
    if (!this.projector?.toPlane(screen.x, screen.y, 0, this.plane)) return
    if (this.cycle.playful) {
      this.sound.cue('rustle', null, 1)
      this.pushFx('leaves', this.plane.x, 0.5, this.plane.z, -1, -1, 0.3)
    } else {
      this.sound.cue('twinkle', null, 1)
      this.pushFx('sparkle', this.plane.x, 4, this.plane.z, -1, -1, 0.6)
    }
  }

  /** A sleeping animal can be lifted back out of bed with a drag while it is still dusk. */
  private dragStart(pointerId: number, screen: ScreenPoint): void {
    const held = this.holder.indexOf(pointerId)
    if (held >= 0) {
      this.carried[held] = true
      return
    }
    if (!this.cycle.playful) return
    const index = this.creatureAt(screen)
    if (index >= 0 && this.creatures[index].asleep) {
      this.lift(index, pointerId)
      this.carried[index] = this.holder[index] === pointerId
    }
  }

  private lift(index: number, pointerId: number): void {
    const creature = this.creatures[index]
    if (!creature.pickable(this.cycle.playful) || this.holder[index] !== NO_POINTER) return
    creature.pickUp()
    this.holder[index] = pointerId
    this.carried[index] = false
    this.carrying = true
    this.sound.cue('pickup', creature.key, 1)
    this.cadence.change(performance.now(), true)
  }

  private release(pointerId: number, screen: ScreenPoint, quick: boolean): void {
    const index = this.holder.indexOf(pointerId)
    if (index < 0) return
    this.updateHover(index, screen)
    this.letGo(index, quick)
  }

  private letGo(index: number, quick: boolean): void {
    const creature = this.creatures[index]
    const home = this.hovering[index]
    this.holder[index] = NO_POINTER
    this.hovering[index] = -1
    this.carrying = this.anyHeldByChild()
    if (home >= 0) creature.sendTo(HOME_KEYS[home])
    else creature.drop(quick)
    this.cadence.change(performance.now(), true)
  }

  // --- hit tests (screen space: the forest is seen at an angle) ---------------

  /**
   * Where a finger holds an animal: at its carrying height under the finger or, where that would sink it
   * behind the homes at the back of the clearing, higher up the finger's own ray in front of them.
   * Writes `plane` and returns the pivot height, or -1 when the ray misses.
   */
  private holdPoint(creature: Creature, screen: ScreenPoint): number {
    const projector = this.projector
    const height = creature.spec.hang + CARRY_LIFT
    if (!projector?.toPlane(screen.x, screen.y, height, this.plane)) return -1
    const back = CARRY_BACK_Z + creature.spec.radius
    const x0 = this.plane.x
    const z0 = this.plane.z
    if (z0 >= back) return height
    // Along one ray the hit point moves linearly with the plane's height, so one more sample finds the rise.
    if (!projector.toPlane(screen.x, screen.y, height + 1, this.plane)) {
      this.plane.x = x0
      this.plane.z = z0
      return height
    }
    const dx = this.plane.x - x0
    const dz = this.plane.z - z0
    const raise = dz > 0.01 ? Math.min(MAX_CARRY_RAISE, (back - z0) / dz) : 0
    this.plane.x = x0 + dx * raise
    this.plane.z = z0 + dz * raise
    return height + raise
  }

  private creatureAt(screen: ScreenPoint): number {
    const projector = this.projector
    if (!projector) return -1
    let best = -1
    let bestDistance = Infinity
    for (let i = 0; i < this.creatures.length; i++) {
      if (this.holder[i] !== NO_POINTER || i === this.demoCarry) continue
      const c = this.creatures[i]
      if (!(c.roaming || c.mode === 'fall' || c.asleep)) continue
      const size = c.spec.size
      if (!projector.toScreen(c.x, c.y + size * 0.45, c.z, this.screenA)) continue
      if (!projector.toScreen(c.x + size * 0.6, c.y + size * 0.45, c.z, this.screenB)) continue
      const radius = Math.hypot(this.screenB.x - this.screenA.x, this.screenB.y - this.screenA.y) + HIT_SLOP_PX
      const distance = Math.hypot(this.screenA.x - screen.x, this.screenA.y - screen.y)
      if (distance <= radius && distance < bestDistance) {
        best = i
        bestDistance = distance
      }
    }
    return best
  }

  /** The home whose entrance (or the trunk or bank below it) is under a screen point, or -1. */
  private homeAt(sx: number, sy: number): number {
    const projector = this.projector
    if (!projector) return -1
    let best = -1
    let bestDistance = Infinity
    for (let h = 0; h < HOME_KEYS.length; h++) {
      const spec = HOMES[HOME_KEYS[h]]
      const mouth = spec.mouth
      if (!projector.toScreen(mouth.x, mouth.y, mouth.z, this.screenA)) continue
      const ax = this.screenA.x
      const ay = this.screenA.y
      if (!projector.toScreen(mouth.x + spec.dropRadius, mouth.y, mouth.z, this.screenB)) continue
      const radius = Math.hypot(this.screenB.x - ax, this.screenB.y - ay) + HOME_SLOP_PX
      if (!projector.toScreen(mouth.x, 0, mouth.z, this.screenB)) continue
      const distance = segmentDistance(sx, sy, ax, ay, this.screenB.x, this.screenB.y)
      const inside = distance <= radius ? distance : this.insideBody(spec, sx, sy)
      if (inside < bestDistance) {
        best = h
        bestDistance = inside
      }
    }
    return best
  }

  /** How far a screen point is from the spine of a home's body, or Infinity when it is outside it. */
  private insideBody(spec: HomeSpec, sx: number, sy: number): number {
    const body = spec.body
    const projector = this.projector
    if (!body || !projector) return Infinity
    if (!projector.toScreen(body.from.x, body.from.y, body.from.z, this.screenA)) return Infinity
    const ax = this.screenA.x
    const ay = this.screenA.y
    if (!projector.toScreen(body.from.x + body.radius, body.from.y, body.from.z, this.screenB)) return Infinity
    const radius = Math.hypot(this.screenB.x - ax, this.screenB.y - ay) + HOME_SLOP_PX
    if (!projector.toScreen(body.to.x, body.to.y, body.to.z, this.screenB)) return Infinity
    const distance = segmentDistance(sx, sy, ax, ay, this.screenB.x, this.screenB.y)
    return distance <= radius ? distance : Infinity
  }

  private updateHover(index: number, screen: ScreenPoint | undefined): void {
    const home = screen && this.carried[index] ? this.homeAt(screen.x, screen.y) : -1
    if (home !== this.hovering[index] && home >= 0) this.sound.cue('hover', this.creatures[index].key, 1)
    this.hovering[index] = home
  }

  private pushFx(kind: FxKind, x: number, y: number, z: number, animal: number, home: number, strength: number): void {
    const e = this.fx[this.fxCount % FX_CAPACITY]
    e.kind = kind
    e.x = x
    e.y = y
    e.z = z
    e.t = this.t
    e.animal = animal
    e.home = home
    e.strength = strength
    this.fxCount += 1
  }
}

function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const length2 = dx * dx + dy * dy
  const k = length2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2)) : 0
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k))
}
