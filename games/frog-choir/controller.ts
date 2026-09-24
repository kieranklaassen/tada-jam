import { BODIES, clearOver, DEEPEST_AIRBORNE, emptyShape, fireflyOver, MARGIN, PAD_HEIGHTS, PAIR_FADE, PAIR_REACH, shapeOf, TALLEST, type Shape } from './bodies'
import { beatColumn, beatSeconds, columnTargets, fireflyAt, phaseAt, type Vec3 } from './choir'
import { chooseHint, handPose, HintScheduler, nearestFrog, type GuidanceTiming, type HandPose, type Hint } from './guidance'
import { GestureTracker } from './input'
import { COLUMNS, FROG_COUNT, PAD_COUNT, PAD_RIM, PAD_TOP, PADS, padUnder, POND, ROW_PITCH_HZ, ROWS, rowZ, SHORE_Z } from './layout'
import { moveFrog, serialize, tempoForAge, type PondState } from './state'

// The pond while it is on screen: the loop, touch, sound, saving, and
// guidance. It knows nothing about rendering. The view reads its public
// fields each frame and hands it a projector for hit tests.
//
// It also keeps things from passing through each other. Every frog's room
// is measured from its rig (bodies.ts): a carried frog rises over the frogs
// below it, a hop arcs over the frogs on its way, a frog dropped on another
// waits in the air until that one has hopped out, a frog dropped in the
// water comes down in open water, and the firefly flies over heads.

export type Sound = {
  /** Call from inside a real touch: creates or revives the audio context. */
  unlock(): void
  setActive(active: boolean): void
  /** A frog's voice. `delay` is seconds from now on the audio clock. */
  voice(frog: number, pitch: number, delay: number, strength: number): void
  plink(pitch: number, strength: number): void
  bloop(pitch: number): void
  lift(frog: number): void
  land(frog: number): void
  splash(): void
  chime(): void
  /** A carried frog softly sings the note of the pad under it; a newer preview cuts the last one off. */
  preview(frog: number, pitch: number): void
  dispose(): void
}

export const silentSound: Sound = {
  unlock() {},
  setActive() {},
  voice() {},
  plink() {},
  bloop() {},
  lift() {},
  land() {},
  splash() {},
  chime() {},
  preview() {},
  dispose() {},
}

export type Point = { x: number; y: number }

/** How the view maps between CSS pixels on the canvas and the pond. Both write into `out`. */
export type Projector = {
  toScreen(x: number, y: number, z: number, out: Point): Point | null
  /** The pond point (x, z) under a screen point on the plane y = height, as { x, y: z }. */
  toPlane(sx: number, sy: number, height: number, out: Point): Point | null
}

export type Target = { kind: 'frog'; frog: number } | { kind: 'pad'; pad: number } | { kind: 'firefly' } | { kind: 'water'; x: number; z: number } | { kind: 'none' }

export type FrogMode = 'sit' | 'held' | 'hop' | 'splash'

export type Frog = {
  readonly index: number
  mode: FrogMode
  /** Feet position. y is height above the surface it is over: its pad's top while sitting, PAD_TOP otherwise. */
  x: number
  y: number
  z: number
  /** That surface's height, and the feet's height in the pond: raised so the belly rests on the surface, not in it. */
  surface: number
  baseY: number
  /** Its room right now, above baseY. */
  readonly shape: Shape
  /** Where a held or waiting frog floats when nothing is under it: x and z on the pond, y above PAD_TOP. */
  carryX: number
  carryY: number
  carryZ: number
  /** How much higher it floats to clear the frogs under it, along the line of sight so it stays over the fingertip. */
  rise: number
  /** Dropped on another frog: it floats until that frog has hopped off the pad. */
  waiting: boolean
  /** The hop's height and length are set when it takes off, from where it is then. */
  planned: boolean
  hopFromSurface: number
  /** Dropped in the water: it falls from where it was let go to open water there. */
  fallFromX: number
  fallFromY: number
  fallFromZ: number
  fallSeconds: number
  fallLeap: number
  splashX: number
  splashZ: number
  /** Smoothed velocity while held, for the lean and stretch. */
  vx: number
  vz: number
  pointer: number | null
  /** The pond point under the carrying fingertip: the frog lands on the pad there. */
  fingerX: number
  fingerZ: number
  /** Where the frog sat relative to the fingertip when picked up; eases to zero so it rises to float just above the finger. */
  grabX: number
  grabZ: number
  /** The pad under the fingertip while held, or null over open water. */
  hover: number | null
  hopFromX: number
  hopFromY: number
  hopFromZ: number
  hopStart: number
  hopDuration: number
  hopHeight: number
  /** Times (controller seconds) of the latest events; -Infinity when never. */
  sungAt: number
  singStrength: number
  pressedAt: number
  tappedAt: number
  liftedAt: number
  landedAt: number
  /** When a frog dropped in the water hits it (after its fall). */
  splashedAt: number
}

export type Ripple = { x: number; z: number; at: number; size: number }

/** How far a struck pad sinks at most: its top stays this far above the water minus its bob, so the two never meet. */
export const PAD_SINK = 0.032
/** How much a pad rises to meet a carried frog hovering over it. */
const PAD_LIFT = 0.07
/** A struck pad spreads a little as it sinks. */
export const PAD_SPREAD_MAX = 1.03

/** A struck pad's bounce, `age` seconds after a strike of `strength`: negative is down. Its sink is softened below PAD_SINK. */
export function padWave(age: number, strength: number): number {
  return age >= 0 && age < 2 ? -strength * 0.1 * Math.exp(-age * 4.5) * Math.sin(age * 2.4 * Math.PI * 2 + 0.3) : 0
}

export function padDip(wave: number): number {
  return wave < 0 ? -PAD_SINK * Math.tanh(-wave / PAD_SINK) : wave
}

/**
 * Carried and waiting frogs rise in steps this big, and sink back at
 * RISE_EASE per second once clear. They rise at most high enough to clear
 * the tallest frog standing on the highest pad.
 */
const RISE_STEP = 0.05
const RISE_MAX = PAD_HEIGHTS.high + TALLEST - DEEPEST_AIRBORNE + MARGIN
const RISE_EASE = 12
/** A hop is checked against the frogs under its path at this many points, and arcs at most this high. */
const HOP_SAMPLES = 16
const HOP_MAX = 3
/** How fast a dropped frog falls, units per second squared, and the longest it takes to reach the water. */
const FALL_GRAVITY = 24
export const FALL_LONGEST = 0.55

export const LIFT_HEIGHT = 0.85
/** How fast a picked-up frog slides from under the finger to float over the fingertip, per second. */
const GRAB_EASE = 7
export const LOOKAHEAD = 0.12
export const SPLASH_SECONDS = 0.55

/** A frog in the water `age` seconds after it hits: its feet's height above PAD_TOP (below, while it is dunked). */
export function dunk(age: number): number {
  return -0.35 * Math.sin(Math.min(1, age / SPLASH_SECONDS) * Math.PI)
}
/** The smallest frog touch radius, CSS px. It only binds on phones, where the pond is small; frog centres are ~100 px apart there. */
const FROG_HIT_PX = 44
const FIREFLY_HIT_PX = 30
/** A child taps where the firefly was: at the slowest tempo it flies ~230 px/s, so the touch area trails it along this much of its path. */
const FIREFLY_TRAIL_SECONDS = 0.3
const DROP_SLOP = 0.35
const RIPPLES = 12
/** The loop starts partway round the flight home, so the firefly glides in before the first note. */
const START_PHASE = 6.3

export type ControllerOptions = {
  save: (state: PondState) => void
  sound?: Sound
  childAge?: number | null
}

export class PondController {
  readonly state: PondState
  readonly frogs: Frog[]
  readonly sound: Sound
  readonly beat: number
  /** Attended seconds since the pond opened. */
  time = 0
  /** Loop clock: beat k happens at clock = k × beat. */
  clock: number
  readonly firefly: Vec3 = { x: 0, y: 2, z: 0 }
  private readonly fireflyPast: Vec3 = { x: 0, y: 2, z: 0 }
  fireflyLoopAt = -Infinity
  readonly padKickAt = new Float64Array(PAD_COUNT).fill(-Infinity)
  readonly padKickStrength = new Float32Array(PAD_COUNT)
  /** Each pad's bob, its tilt (a vertical stretch), how far it has spread, and its top's height. */
  readonly padY = new Float32Array(PAD_COUNT)
  readonly padTilt = new Float32Array(PAD_COUNT)
  readonly padSpread = new Float32Array(PAD_COUNT).fill(1)
  readonly padTop = new Float32Array(PAD_COUNT).fill(PAD_TOP)
  private readonly padLift = new Float32Array(PAD_COUNT)
  readonly ripples: Ripple[] = Array.from({ length: RIPPLES }, () => ({ x: 0, z: 0, at: -Infinity, size: 1 }))
  readonly guidance: HintScheduler
  timing: GuidanceTiming
  hint: Hint | null = null
  readonly hand: HandPose = { x: 0, z: 0, press: 0, opacity: 0, carry: false }
  /** The frog that invites before the first touch. */
  inviteFrog: number | null = null
  running = false

  private readonly save: (state: PondState) => void
  private readonly gestures: GestureTracker<Target>
  private projector: Projector | null = null
  private everTapped = false
  private hintDemo = -1
  private demoProgress = 0
  private nextSoundBeat: number
  private nextSeenBeat: number
  private readonly scheduled = new Uint8Array(4)
  private readonly rawTargets = new Float32Array(COLUMNS)
  readonly targets = new Float32Array(COLUMNS)
  readonly occupied = new Uint8Array(COLUMNS)
  private readonly seated: (number | null)[] = new Array(FROG_COUNT).fill(null)
  private rippleNext = 0
  private readonly screen: Point = { x: 0, y: 0 }
  private readonly edge: Point = { x: 0, y: 0 }
  private readonly trailScreen: Point = { x: 0, y: 0 }
  private readonly plane: Point = { x: 0, y: 0 }
  private readonly sight: Point = { x: 0, y: 0 }
  private readonly along: Point = { x: 0, y: 0 }
  private readonly ranks = new Uint8Array(FROG_COUNT)

  constructor(state: PondState, options: ControllerOptions) {
    this.state = state
    this.save = options.save
    this.sound = options.sound ?? silentSound
    this.beat = beatSeconds(tempoForAge(options.childAge ?? null))
    this.clock = START_PHASE * this.beat
    this.nextSoundBeat = Math.ceil(this.clock / this.beat)
    this.nextSeenBeat = this.nextSoundBeat
    this.frogs = state.frogs.map((pad, index) => ({
      index,
      mode: 'sit',
      x: PADS[pad].x,
      y: 0,
      z: PADS[pad].z,
      surface: PAD_TOP,
      baseY: PAD_TOP,
      shape: emptyShape(),
      carryX: 0,
      carryY: 0,
      carryZ: 0,
      rise: 0,
      waiting: false,
      planned: false,
      hopFromSurface: PAD_TOP,
      fallFromX: 0,
      fallFromY: 0,
      fallFromZ: 0,
      fallSeconds: 0,
      fallLeap: 0,
      splashX: 0,
      splashZ: 0,
      vx: 0,
      vz: 0,
      pointer: null,
      fingerX: 0,
      fingerZ: 0,
      grabX: 0,
      grabZ: 0,
      hover: null,
      hopFromX: 0,
      hopFromY: 0,
      hopFromZ: 0,
      hopStart: 0,
      hopDuration: 0,
      hopHeight: 0,
      sungAt: -Infinity,
      singStrength: 1,
      pressedAt: -Infinity,
      tappedAt: -Infinity,
      liftedAt: -Infinity,
      landedAt: -Infinity,
      splashedAt: -Infinity,
    }))
    this.guidance = new HintScheduler(0)
    this.timing = this.guidance.update(0)
    this.movePads(0)
    for (const frog of this.frogs) this.place(frog)
    this.refreshTargets()
    this.targets.set(this.rawTargets)
    this.placeFirefly()
    this.gestures = new GestureTracker<Target>((x, y) => this.pick(x, y), {
      press: (_, target) => this.press(target),
      tap: (_, target) => this.tap(target),
      dragStart: (pointer, target, x, y) => {
        if (target.kind === 'frog') this.grab(pointer, target.frog, x, y)
      },
      dragMove: (pointer, target, x, y) => {
        if (target.kind === 'frog') this.dragTo(pointer, x, y)
      },
      dragEnd: (pointer, target, x, y) => {
        if (target.kind !== 'frog') return
        this.dragTo(pointer, x, y)
        this.drop(pointer)
      },
      cancel: (pointer, target) => {
        if (target.kind === 'frog') this.release(pointer)
      },
    })
  }

  setProjector(projector: Projector): void {
    this.projector = projector
  }

  get phase(): number {
    return phaseAt(this.clock, this.beat)
  }

  // Touch, in CSS pixels on the canvas.

  pointerDown(pointer: number, x: number, y: number, timeMs: number): void {
    this.sound.unlock()
    this.gestures.down(pointer, x, y, timeMs)
  }

  pointerMove(pointer: number, x: number, y: number): void {
    this.gestures.move(pointer, x, y)
  }

  pointerUp(pointer: number, x: number, y: number, timeMs: number): void {
    this.sound.unlock()
    this.gestures.up(pointer, x, y, timeMs)
  }

  pointerCancel(pointer: number): void {
    this.gestures.pointerCancel(pointer)
  }

  /** What is under a screen point: the firefly, a frog, a pad, or open water. */
  pick(sx: number, sy: number): Target {
    const projector = this.projector
    if (!projector) return { kind: 'none' }
    let bestFrog = -1
    let bestFrogScore = Infinity
    for (const frog of this.frogs) {
      if (frog.mode === 'splash' || frog.pointer !== null) continue
      const radius = this.frogRadiusPx(frog)
      if (radius === null) continue
      const score = Math.hypot(this.edge.x - sx, this.edge.y - sy) / radius
      if (score <= 1 && score < bestFrogScore) {
        bestFrog = frog.index
        bestFrogScore = score
      }
    }
    const fire = projector.toScreen(this.firefly.x, this.firefly.y, this.firefly.z, this.screen)
    const past = this.overHeads(fireflyAt(phaseAt(this.clock - FIREFLY_TRAIL_SECONDS, this.beat), this.targets, this.occupied, this.fireflyPast))
    const trail = projector.toScreen(past.x, past.y, past.z, this.trailScreen)
    const fireDistance = fire ? segmentDistance(sx, sy, fire, trail ?? fire) : Infinity
    if (fireDistance <= FIREFLY_HIT_PX && (bestFrog < 0 || fireDistance / FIREFLY_HIT_PX < bestFrogScore)) return { kind: 'firefly' }
    if (bestFrog >= 0) return { kind: 'frog', frog: bestFrog }
    const on = projector.toPlane(sx, sy, 0.05, this.plane)
    if (!on) return { kind: 'none' }
    const pad = padUnder(on.x, on.y, 0.1)
    if (pad) return { kind: 'pad', pad: pad.index }
    return { kind: 'water', x: on.x, z: on.y }
  }

  /** A frog's touch radius in pixels; leaves its screen centre in `edge`. */
  private frogRadiusPx(frog: Frog): number | null {
    const projector = this.projector!
    const center = projector.toScreen(frog.x, frog.y + 0.65, frog.z, this.edge)
    if (!center) return null
    const side = projector.toScreen(frog.x + 0.75, frog.y + 0.65, frog.z, this.screen)
    return side ? Math.max(FROG_HIT_PX, Math.hypot(side.x - center.x, side.y - center.y)) : FROG_HIT_PX
  }

  private press(target: Target): void {
    this.guidance.touch(this.time)
    this.hint = null
    switch (target.kind) {
      case 'frog':
        this.frogs[target.frog].pressedAt = this.time
        return
      case 'pad':
        this.kickPad(target.pad, 0.5)
        return
      case 'water':
        this.ripple(target.x, target.z, 1)
        this.sound.bloop(pitchAtDepth(target.z) / 2)
        return
      case 'firefly':
      case 'none':
        return
      default:
        return assertNever(target)
    }
  }

  private tap(target: Target): void {
    switch (target.kind) {
      case 'frog':
        this.tapFrog(target.frog)
        return
      case 'pad': {
        const frog = this.state.frogs.indexOf(target.pad)
        if (frog >= 0 && this.frogs[frog].mode === 'sit') this.tapFrog(frog)
        else {
          this.kickPad(target.pad, 1)
          this.ripple(PADS[target.pad].x, PADS[target.pad].z, PADS[target.pad].radius * 2.6)
          this.sound.plink(PADS[target.pad].pitch, 1)
        }
        return
      }
      case 'firefly':
        this.fireflyLoopAt = this.time
        this.sound.chime()
        return
      case 'water':
      case 'none':
        return
      default:
        return assertNever(target)
    }
  }

  tapFrog(index: number): void {
    const frog = this.frogs[index]
    if (frog.mode === 'held' || frog.mode === 'splash') return
    this.everTapped = true
    frog.tappedAt = this.time
    this.sing(frog, 1.25)
    this.sound.voice(index, PADS[this.state.frogs[index]].pitch, 0, 1.2)
  }

  private sing(frog: Frog, strength: number): void {
    frog.sungAt = this.time
    frog.singStrength = strength
    if (frog.mode === 'sit') this.kickPad(this.state.frogs[frog.index], 0.45 * strength)
  }

  private grab(pointer: number, index: number, sx: number, sy: number): void {
    const frog = this.frogs[index]
    if (frog.mode === 'held' || frog.mode === 'splash') return
    frog.mode = 'held'
    frog.pointer = pointer
    frog.liftedAt = this.time
    frog.vx = 0
    frog.vz = 0
    frog.hover = this.state.frogs[index]
    frog.waiting = false
    this.kickPad(this.state.frogs[index], -0.8)
    this.sound.lift(index)
    frog.carryX = frog.x
    frog.carryY = frog.surface + frog.y - PAD_TOP
    frog.carryZ = frog.z
    frog.rise = 0
    frog.fingerX = frog.x
    frog.fingerZ = frog.z
    this.aim(frog, sx, sy)
    frog.grabX = frog.x - frog.fingerX
    frog.grabZ = frog.z - frog.fingerZ
  }

  private dragTo(pointer: number, sx: number, sy: number): void {
    const frog = this.heldBy(pointer)
    if (frog) this.aim(frog, sx, sy)
  }

  private aim(frog: Frog, sx: number, sy: number): void {
    const on = this.projector?.toPlane(sx, sy, 0.05, this.plane)
    if (!on) return
    frog.fingerX = on.x
    frog.fingerZ = on.y
  }

  private heldBy(pointer: number): Frog | null {
    return this.frogs.find((frog) => frog.pointer === pointer && frog.mode === 'held') ?? null
  }

  private drop(pointer: number): void {
    const frog = this.heldBy(pointer)
    if (!frog) return
    frog.pointer = null
    const pad = padUnder(frog.fingerX, frog.fingerZ, DROP_SLOP)
    if (!pad) {
      frog.mode = 'splash'
      frog.hover = null
      this.openWater(frog)
      frog.fallFromX = frog.x
      frog.fallFromY = frog.y
      frog.fallFromZ = frog.z
      // Straight down when the water under it is open; a leap when it has to go further to find open water.
      const leap = Math.hypot(frog.splashX - frog.x, frog.splashZ - frog.z)
      frog.fallLeap = Math.min(0.6, leap * 0.3)
      frog.fallSeconds = Math.min(FALL_LONGEST, Math.max(0.12, Math.sqrt((2 * Math.max(0, frog.y)) / FALL_GRAVITY), 0.12 + leap * 0.12))
      frog.splashedAt = this.time + frog.fallSeconds
      return
    }
    const from = this.state.frogs[frog.index]
    const other = moveFrog(this.state, frog.index, pad.index)
    // A partner still in another finger keeps being carried; it hops to its new pad when let go.
    if (other !== null && this.frogs[other].mode !== 'held') this.hop(this.frogs[other], 0)
    this.hop(frog, 0)
    if (from !== pad.index) this.save(serialize(this.state))
  }

  /** End a hold with no effect: the frog hops back to its own pad. */
  private release(pointer: number): void {
    const frog = this.heldBy(pointer)
    if (!frog) return
    frog.pointer = null
    this.hop(frog, 0)
  }

  /** Sends a frog home to its pad. It waits in the air while another frog is still leaving that pad. */
  private hop(frog: Frog, delay: number): void {
    if (frog.mode !== 'held') {
      frog.carryX = frog.x
      frog.carryY = frog.surface + frog.y - PAD_TOP
      frog.carryZ = frog.z
      frog.rise = 0
    }
    frog.mode = 'hop'
    frog.hover = null
    frog.hopStart = this.time + delay
    frog.planned = false
    frog.waiting = !this.seatClear(frog)
  }

  /** Takes off from where the frog is now, arcing high enough to clear every frog under its path. */
  private planHop(frog: Frog): void {
    const pad = PADS[this.state.frogs[frog.index]]
    const distance = Math.hypot(pad.x - frog.x, pad.z - frog.z)
    frog.hopFromX = frog.x
    frog.hopFromY = frog.y
    frog.hopFromZ = frog.z
    frog.hopFromSurface = frog.surface
    // Let go of right above its pad, a frog falls with weight instead of hopping.
    const dropped = frog.y > 0.3 && distance < 0.8
    let duration = dropped ? 0.22 + distance * 0.1 : Math.min(0.62, 0.34 + distance * 0.06)
    let height = dropped ? 0.05 : 0.35 + Math.min(1.2, distance * 0.16)
    const seat = BODIES[frog.index].seat
    for (let k = 1; k < HOP_SAMPLES; k++) {
      const t = k / HOP_SAMPLES
      const surface = frog.hopFromSurface + (this.padTop[pad.index] - frog.hopFromSurface) * t
      const need = this.clearance(frog, frog.hopFromX + (pad.x - frog.hopFromX) * t, frog.hopFromZ + (pad.z - frog.hopFromZ) * t) - surface - seat
      const falling = frog.hopFromY * (1 - t * t)
      if (need > falling) height = Math.max(height, (need - falling) / (4 * t * (1 - t)))
    }
    height = Math.min(HOP_MAX, height)
    duration = Math.max(duration, 0.1 + 0.42 * Math.sqrt(height), Math.sqrt((2 * Math.max(0, frog.hopFromY)) / FALL_GRAVITY))
    frog.hopHeight = height
    frog.hopDuration = duration
    frog.planned = true
  }

  /** No other frog, except one in a hand, is near enough to the frog's pad to be in the way of landing there. */
  private seatClear(frog: Frog): boolean {
    const pad = PADS[this.state.frogs[frog.index]]
    for (const other of this.frogs) {
      if (other === frog || other.mode === 'held' || other.mode === 'sit') continue
      if (Math.hypot(other.x - pad.x, other.z - pad.z) < PAIR_REACH + PAIR_FADE) return false
    }
    return true
  }

  private kickPad(pad: number, strength: number): void {
    this.padKickAt[pad] = this.time
    this.padKickStrength[pad] = strength
  }

  private ripple(x: number, z: number, size: number): void {
    const ripple = this.ripples[this.rippleNext]
    this.rippleNext = (this.rippleNext + 1) % RIPPLES
    ripple.x = x
    ripple.z = z
    ripple.at = this.time
    ripple.size = size
  }

  setRunning(running: boolean): void {
    if (this.running === running) return
    this.running = running
    this.sound.setActive(running)
    if (!running) this.park()
  }

  /** Put-away: every frog is back on a pad at once, and no gesture survives. */
  park(): void {
    this.gestures.reset()
    for (const frog of this.frogs) {
      if (frog.mode === 'sit') continue
      const pad = PADS[this.state.frogs[frog.index]]
      frog.mode = 'sit'
      frog.pointer = null
      frog.hover = null
      frog.waiting = false
      frog.rise = 0
      frog.x = pad.x
      frog.y = 0
      frog.z = pad.z
      this.place(frog)
    }
  }

  step(dt: number): void {
    this.time += dt
    this.clock += dt
    this.movePads(dt)
    // Frogs that give way move after the frogs they give way to: sitting,
    // then splashing, hopping, waiting to land, and carried.
    for (const frog of this.frogs) this.ranks[frog.index] = rankOf(frog)
    for (let rank = 0; rank <= RANKS; rank++) for (const frog of this.frogs) if (this.ranks[frog.index] === rank) this.stepFrog(frog, dt)
    this.refreshTargets()
    const k = 1 - Math.exp(-dt * 5)
    for (let c = 0; c < COLUMNS; c++) this.targets[c] += (this.rawTargets[c] - this.targets[c]) * k
    this.placeFirefly()
    this.scheduleBeats()
    this.stepGuidance()
  }

  private stepFrog(frog: Frog, dt: number): void {
    this.place(frog)
    this.moveFrog(frog, dt)
    this.place(frog)
  }

  private moveFrog(frog: Frog, dt: number): void {
    switch (frog.mode) {
      case 'sit':
        return
      case 'held': {
        const keep = Math.exp(-dt * GRAB_EASE)
        frog.grabX *= keep
        frog.grabZ *= keep
        const follow = 1 - Math.exp(-dt * 16)
        const dx = (frog.fingerX + frog.grabX - frog.carryX) * follow
        const dz = (frog.fingerZ + frog.grabZ - frog.carryZ) * follow
        frog.carryX += dx
        frog.carryZ += dz
        frog.carryY += (LIFT_HEIGHT - frog.carryY) * (1 - Math.exp(-dt * 12))
        const smooth = 1 - Math.exp(-dt * 10)
        frog.vx += (dx / Math.max(dt, 1e-3) - frog.vx) * smooth
        frog.vz += (dz / Math.max(dt, 1e-3) - frog.vz) * smooth
        this.rise(frog, dt)
        const hover = padUnder(frog.fingerX, frog.fingerZ, DROP_SLOP)?.index ?? null
        if (hover !== frog.hover) {
          frog.hover = hover
          if (hover !== null) {
            this.sing(frog, 0.55)
            this.sound.preview(frog.index, PADS[hover].pitch)
          }
        }
        return
      }
      case 'hop': {
        if (frog.waiting) {
          if (!this.seatClear(frog)) {
            this.rise(frog, dt)
            return
          }
          frog.waiting = false
          frog.hopStart = this.time
        }
        if (this.time < frog.hopStart) return
        if (!frog.planned) this.planHop(frog)
        const t = (this.time - frog.hopStart) / frog.hopDuration
        const pad = PADS[this.state.frogs[frog.index]]
        if (t >= 1) {
          frog.mode = 'sit'
          frog.x = pad.x
          frog.y = 0
          frog.z = pad.z
          frog.landedAt = this.time
          this.kickPad(pad.index, 1)
          this.sound.land(frog.index)
          this.sing(frog, 1)
          this.sound.voice(frog.index, pad.pitch, 0.05, 0.9)
          return
        }
        frog.x = frog.hopFromX + (pad.x - frog.hopFromX) * t
        frog.z = frog.hopFromZ + (pad.z - frog.hopFromZ) * t
        frog.y = frog.hopFromY * (1 - t * t) + 4 * frog.hopHeight * t * (1 - t)
        // Whatever moved into its way since take-off (a tap's leap), it passes over.
        const surface = this.surfaceOf(frog)
        frog.y = Math.max(frog.y, this.clearance(frog, frog.x, frog.z) - surface - BODIES[frog.index].seat)
        return
      }
      case 'splash': {
        const age = this.time - frog.splashedAt
        if (age < 0) {
          const u = 1 + age / frog.fallSeconds
          const slide = u * u * (3 - 2 * u)
          frog.x = frog.fallFromX + (frog.splashX - frog.fallFromX) * slide
          frog.z = frog.fallFromZ + (frog.splashZ - frog.fallFromZ) * slide
          frog.y = frog.fallFromY * (1 - u * u) + 4 * frog.fallLeap * u * (1 - u)
          // It comes down past a sitting frog it was let go beside, not through it.
          frog.y = Math.max(frog.y, this.clearance(frog, frog.x, frog.z) - PAD_TOP - BODIES[frog.index].seat)
          return
        }
        if (age < dt) {
          this.ripple(frog.splashX, frog.splashZ, 1.6)
          this.sound.splash()
        }
        frog.x = frog.splashX
        frog.z = frog.splashZ
        frog.y = dunk(age)
        if (age >= SPLASH_SECONDS) {
          frog.y = 0
          this.hop(frog, 0)
        }
        return
      }
      default:
        return assertNever(frog.mode)
    }
  }

  /** The surface a frog is over: its pad's top while sitting, sliding from where it took off to its pad's top while hopping. */
  private surfaceOf(frog: Frog): number {
    const pad = this.state.frogs[frog.index]
    if (frog.mode === 'sit') return this.padTop[pad]
    if (frog.mode === 'hop' && frog.planned) {
      const t = Math.min(1, Math.max(0, (this.time - frog.hopStart) / frog.hopDuration))
      return frog.hopFromSurface + (this.padTop[pad] - frog.hopFromSurface) * t
    }
    return PAD_TOP
  }

  /** Where the frog's feet are in the pond, and its room for what it is doing now. */
  private place(frog: Frog): void {
    const body = BODIES[frog.index]
    frog.surface = this.surfaceOf(frog)
    frog.baseY = frog.surface + frog.y + body.seat
    shapeOf(body, frog.mode === 'sit' ? 'sit' : frog.mode === 'splash' ? 'splash' : 'air', this.time - frog.tappedAt, frog.shape)
  }

  /** The lowest the frog's feet may be at (x, z) to pass over every frog it gives way to. */
  private clearance(frog: Frog, x: number, z: number): number {
    const rank = this.ranks[frog.index]
    let need = -Infinity
    for (const other of this.frogs) {
      if (other === frog) continue
      const r = this.ranks[other.index]
      if (r > rank || (r === rank && other.index > frog.index)) continue
      need = Math.max(need, clearOver(other.baseY, other.shape.top, frog.shape.low, Math.hypot(x - other.x, z - other.z)))
    }
    return need
  }

  /**
   * A carried or waiting frog floats at its carry point. Over another frog it
   * rises along the line of sight through that point, so on screen it stays
   * over the fingertip while it passes over, and sinks back once past.
   */
  private rise(frog: Frog, dt: number): void {
    const sight = this.projector?.toScreen(frog.carryX, PAD_TOP + frog.carryY, frog.carryZ, this.sight) ?? null
    let h = frog.rise * Math.exp(-dt * RISE_EASE)
    if (!this.clearAt(frog, sight, h)) {
      let below = h
      h = Math.min(RISE_MAX, h + RISE_STEP)
      while (h < RISE_MAX && !this.clearAt(frog, sight, h)) {
        below = h
        h = Math.min(RISE_MAX, h + RISE_STEP)
      }
      for (let i = 0; i < 5; i++) {
        const mid = (below + h) / 2
        if (this.clearAt(frog, sight, mid)) h = mid
        else below = mid
      }
      this.clearAt(frog, sight, h)
    }
    frog.rise = h
    frog.y = frog.carryY + h
  }

  /** Moves a carried frog `h` above its carry point along the line of sight; whether it clears there every frog it gives way to. */
  private clearAt(frog: Frog, sight: Point | null, h: number): boolean {
    const at = sight ? this.projector!.toPlane(sight.x, sight.y, PAD_TOP + frog.carryY + h, this.along) : null
    frog.x = at ? at.x : frog.carryX
    frog.z = at ? at.y : frog.carryZ
    return PAD_TOP + frog.carryY + h + BODIES[frog.index].seat >= this.clearance(frog, frog.x, frog.z)
  }

  /**
   * Where a frog dropped in the water comes down: the nearest spot to the
   * fingertip with room for it at the waterline, clear of every pad (as far
   * as it spreads when struck), every other frog, the shore, and the sides.
   */
  private openWater(frog: Frog): void {
    const room = BODIES[frog.index].splashWater
    const open = (x: number, z: number): boolean => {
      if (x < POND.minX + room || x > POND.maxX - room || z < SHORE_Z + room + MARGIN || z > POND.nearZ) return false
      for (const pad of PADS) if (Math.hypot(pad.x - x, pad.z - z) < pad.radius * PAD_RIM * PAD_SPREAD_MAX + room + MARGIN) return false
      for (const other of this.frogs) {
        if (other === frog || other.mode === 'held') continue
        const ox = other.mode === 'splash' ? other.splashX : other.x
        const oz = other.mode === 'splash' ? other.splashZ : other.z
        if (Math.hypot(ox - x, oz - z) < PAIR_REACH + PAIR_FADE) return false
      }
      return true
    }
    frog.splashX = frog.fingerX
    frog.splashZ = frog.fingerZ
    for (let r = 0; r <= 8; r += 0.1) {
      const n = Math.max(8, Math.round((Math.PI * 2 * r) / 0.1))
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2
        const x = frog.fingerX + Math.cos(a) * r
        const z = frog.fingerZ + Math.sin(a) * r
        if (!open(x, z)) continue
        frog.splashX = x
        frog.splashZ = z
        return
      }
    }
  }

  /** The pads' bob and tilt, a strike's bounce, and a pad rising to meet a carried frog hovering over it. */
  private movePads(dt: number): void {
    const t = this.time
    const lift = 1 - Math.exp(-dt * 14)
    for (let i = 0; i < PAD_COUNT; i++) {
      let hovered = false
      for (const frog of this.frogs) if (frog.mode === 'held' && frog.hover === i && this.state.frogs[frog.index] !== i) hovered = true
      this.padLift[i] += ((hovered ? PAD_LIFT : 0) - this.padLift[i]) * lift
      const wave = padWave(t - this.padKickAt[i], this.padKickStrength[i])
      const dip = padDip(wave)
      this.padY[i] = Math.sin(t * 1.25 + i * 1.7) * 0.012 + dip + this.padLift[i]
      this.padTilt[i] = Math.sin(t * 0.9 + i * 2.3) * 0.025 + dip * 0.6
      this.padSpread[i] = 1 + Math.max(0, -wave) * 0.4
      this.padTop[i] = this.padY[i] + PAD_TOP * (1 + this.padTilt[i])
    }
  }

  private refreshTargets(): void {
    for (let i = 0; i < FROG_COUNT; i++) this.seated[i] = this.frogs[i].mode === 'sit' ? this.state.frogs[i] : null
    columnTargets(this.seated, this.rawTargets, this.occupied)
  }

  private placeFirefly(): void {
    fireflyAt(this.phase, this.targets, this.occupied, this.firefly)
    const since = this.time - this.fireflyLoopAt
    if (since >= 0 && since < FIREFLY_LOOP_SECONDS) {
      const u = since / FIREFLY_LOOP_SECONDS
      const a = easeInOut(u) * Math.PI * 2
      const r = 0.55 * Math.sin(u * Math.PI)
      this.firefly.x += Math.sin(a) * r
      this.firefly.y += (1 - Math.cos(a)) * r * 0.9
    }
    this.overHeads(this.firefly)
  }

  /** Raises a point on the firefly's flight over every frog's head, wings and all. */
  private overHeads(p: Vec3): Vec3 {
    for (const frog of this.frogs) p.y = Math.max(p.y, fireflyOver(frog.baseY, frog.shape.top, Math.hypot(p.x - frog.x, p.z - frog.z)))
    return p
  }

  /** Loop notes go to the audio clock a little early; the frogs sing on the frame that crosses the beat. */
  private scheduleBeats(): void {
    while (this.nextSoundBeat * this.beat <= this.clock + LOOKAHEAD) {
      const k = this.nextSoundBeat++
      const column = beatColumn(k)
      let singers = 0
      if (column >= 0) {
        for (const frog of this.frogs) {
          if (frog.mode !== 'sit') continue
          const pad = PADS[this.state.frogs[frog.index]]
          if (pad.column !== column) continue
          singers |= 1 << frog.index
          this.sound.voice(frog.index, pad.pitch, Math.max(0, k * this.beat - this.clock), 1)
        }
      }
      this.scheduled[k & 3] = singers
    }
    while (this.nextSeenBeat * this.beat <= this.clock) {
      const k = this.nextSeenBeat++
      const singers = this.scheduled[k & 3]
      for (const frog of this.frogs) if (singers & (1 << frog.index) && frog.mode === 'sit') this.sing(frog, 1)
    }
  }

  private stepGuidance(): void {
    const timing = this.guidance.update(this.time)
    this.timing = timing
    if (timing.demoIndex !== this.hintDemo) {
      this.hintDemo = timing.demoIndex
      this.demoProgress = 0
      this.hint = timing.demoIndex >= 0 ? chooseHint({ frogs: this.seated, everTapped: this.everTapped }, timing.demoIndex) : null
    }
    const hint = this.hint
    if (hint && timing.demo !== null) {
      handPose(hint, timing.demo, this.hand)
      this.demoBeats(hint, this.demoProgress, timing.demo)
      this.demoProgress = timing.demo
    } else this.hand.opacity = 0
    if (timing.invite === null) this.inviteFrog = null
    else if (this.inviteFrog === null) this.inviteFrog = nearestFrog(this.seated)
  }

  /** The demonstration's touches are real: a demonstrated tap makes the frog sing, and a demonstrated drop plinks the new pad. */
  private demoBeats(hint: Hint, from: number, to: number): void {
    if (hint.kind === 'tapFrog') {
      if (crossed(from, to, 0.28) || crossed(from, to, 0.58)) {
        const frog = this.frogs[hint.frog]
        if (frog.mode !== 'sit') return
        frog.tappedAt = this.time
        this.sing(frog, 0.9)
        this.sound.voice(hint.frog, PADS[this.state.frogs[hint.frog]].pitch, 0, 0.7)
      }
      return
    }
    if (hint.toPad !== null && crossed(from, to, 0.76)) {
      this.kickPad(hint.toPad, 0.8)
      this.sound.plink(PADS[hint.toPad].pitch, 0.6)
    }
  }

  dispose(): void {
    this.gestures.reset()
    this.sound.dispose()
  }
}

export const FIREFLY_LOOP_SECONDS = 1.1

const RANKS = 4

/**
 * Who gives way to whom: a frog passes over every frog of a lower rank, and
 * of its own rank with a lower index. A frog in the water is on a set path,
 * so everything but a sitting frog gives way to it.
 */
function rankOf(frog: Frog): number {
  switch (frog.mode) {
    case 'sit':
      return 0
    case 'splash':
      return 1
    case 'hop':
      return frog.waiting ? 3 : 2
    case 'held':
      return 4
    default:
      return assertNever(frog.mode)
  }
}

/** Whether progress moved past `at` this frame. */
function crossed(from: number, to: number, at: number): boolean {
  return from < at && to >= at
}

/** Distance from a point to the segment a–b. */
function segmentDistance(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lengthSq)) : 0
  return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t))
}

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t)
}

/** The row pitch nearest a depth on the pond, for water taps. */
export function pitchAtDepth(z: number): number {
  let best = 0
  for (let row = 1; row < ROWS; row++) if (Math.abs(rowZ(row) - z) < Math.abs(rowZ(best) - z)) best = row
  return ROW_PITCH_HZ[best]
}

function assertNever(value: never): never {
  throw new Error(`unhandled: ${JSON.stringify(value)}`)
}
