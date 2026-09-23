import { beatColumn, beatSeconds, columnTargets, fireflyAt, phaseAt, type Vec3 } from './choir'
import { chooseHint, handPose, HintScheduler, nearestFrog, type GuidanceTiming, type HandPose, type Hint } from './guidance'
import { GestureTracker } from './input'
import { COLUMNS, FROG_COUNT, PAD_COUNT, PADS, padUnder, ROW_PITCH_HZ, ROWS, rowZ } from './layout'
import { moveFrog, serialize, tempoForAge, type PondState } from './state'

// The pond while it is on screen: the loop, touch, sound, saving, and
// guidance. It knows nothing about rendering. The view reads its public
// fields each frame and hands it a projector for hit tests.

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
  preview(pitch: number): void
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
  /** Feet position. y is height above the pad or water surface. */
  x: number
  y: number
  z: number
  /** Smoothed velocity while held, for the lean and stretch. */
  vx: number
  vz: number
  pointer: number | null
  targetX: number
  targetZ: number
  /** The pad under a held frog, or null over open water. */
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
  splashedAt: number
}

export type Ripple = { x: number; z: number; at: number; size: number }

export const LIFT_HEIGHT = 0.85
/** A held frog's centre sits this far above its feet: the finger holds its middle. */
export const HOLD_CENTER = 0.45
export const LOOKAHEAD = 0.12
export const SPLASH_SECONDS = 0.55
const FROG_HIT_PX = 34
const FIREFLY_HIT_PX = 30
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
  fireflyLoopAt = -Infinity
  readonly padKickAt = new Float64Array(PAD_COUNT).fill(-Infinity)
  readonly padKickStrength = new Float32Array(PAD_COUNT)
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
  private readonly plane: Point = { x: 0, y: 0 }

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
      vx: 0,
      vz: 0,
      pointer: null,
      targetX: 0,
      targetZ: 0,
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
    const fireDistance = fire ? Math.hypot(fire.x - sx, fire.y - sy) : Infinity
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
          this.ripple(PADS[target.pad].x, PADS[target.pad].z, 1.2)
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
    this.kickPad(this.state.frogs[index], -0.8)
    this.sound.lift(index)
    this.aim(frog, sx, sy)
  }

  private dragTo(pointer: number, sx: number, sy: number): void {
    const frog = this.heldBy(pointer)
    if (frog) this.aim(frog, sx, sy)
  }

  private aim(frog: Frog, sx: number, sy: number): void {
    const on = this.projector?.toPlane(sx, sy, LIFT_HEIGHT + HOLD_CENTER, this.plane)
    if (!on) return
    frog.targetX = on.x
    frog.targetZ = on.y
  }

  private heldBy(pointer: number): Frog | null {
    return this.frogs.find((frog) => frog.pointer === pointer && frog.mode === 'held') ?? null
  }

  private drop(pointer: number): void {
    const frog = this.heldBy(pointer)
    if (!frog) return
    frog.pointer = null
    const pad = padUnder(frog.targetX, frog.targetZ, DROP_SLOP)
    if (!pad) {
      frog.mode = 'splash'
      frog.splashedAt = this.time
      frog.hover = null
      this.ripple(frog.x, frog.z, 1.6)
      this.sound.splash()
      return
    }
    const from = this.state.frogs[frog.index]
    const other = moveFrog(this.state, frog.index, pad.index)
    this.hop(frog, 0)
    if (other !== null) this.hop(this.frogs[other], 0.12)
    if (from !== pad.index) this.save(serialize(this.state))
  }

  /** End a hold with no effect: the frog hops back to its own pad. */
  private release(pointer: number): void {
    const frog = this.heldBy(pointer)
    if (!frog) return
    frog.pointer = null
    this.hop(frog, 0)
  }

  private hop(frog: Frog, delay: number): void {
    const pad = PADS[this.state.frogs[frog.index]]
    const distance = Math.hypot(pad.x - frog.x, pad.z - frog.z)
    frog.mode = 'hop'
    frog.hover = null
    frog.hopFromX = frog.x
    frog.hopFromY = frog.y
    frog.hopFromZ = frog.z
    frog.hopStart = this.time + delay
    frog.hopDuration = Math.min(0.62, 0.34 + distance * 0.06)
    frog.hopHeight = 0.35 + Math.min(1.2, distance * 0.16)
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
      frog.x = pad.x
      frog.y = 0
      frog.z = pad.z
    }
  }

  step(dt: number): void {
    this.time += dt
    this.clock += dt
    for (const frog of this.frogs) this.stepFrog(frog, dt)
    this.refreshTargets()
    const k = 1 - Math.exp(-dt * 5)
    for (let c = 0; c < COLUMNS; c++) this.targets[c] += (this.rawTargets[c] - this.targets[c]) * k
    this.placeFirefly()
    this.scheduleBeats()
    this.stepGuidance()
  }

  private stepFrog(frog: Frog, dt: number): void {
    switch (frog.mode) {
      case 'sit':
        return
      case 'held': {
        const follow = 1 - Math.exp(-dt * 16)
        const dx = (frog.targetX - frog.x) * follow
        const dz = (frog.targetZ - frog.z) * follow
        frog.x += dx
        frog.z += dz
        frog.y += (LIFT_HEIGHT - frog.y) * (1 - Math.exp(-dt * 12))
        const smooth = 1 - Math.exp(-dt * 10)
        frog.vx += (dx / Math.max(dt, 1e-3) - frog.vx) * smooth
        frog.vz += (dz / Math.max(dt, 1e-3) - frog.vz) * smooth
        const hover = padUnder(frog.targetX, frog.targetZ, DROP_SLOP)?.index ?? null
        if (hover !== frog.hover) {
          frog.hover = hover
          if (hover !== null) this.sound.preview(PADS[hover].pitch)
        }
        return
      }
      case 'hop': {
        const t = (this.time - frog.hopStart) / frog.hopDuration
        if (t < 0) return
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
        frog.y = frog.hopFromY * (1 - t) + 4 * frog.hopHeight * t * (1 - t)
        return
      }
      case 'splash':
        frog.y = -0.35 * Math.sin(Math.min(1, (this.time - frog.splashedAt) / SPLASH_SECONDS) * Math.PI)
        if (this.time - frog.splashedAt >= SPLASH_SECONDS) {
          frog.y = 0
          this.hop(frog, 0)
        }
        return
      default:
        return assertNever(frog.mode)
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
    this.inviteFrog = timing.invite !== null ? nearestFrog(this.seated) : null
  }

  /** The demonstration's touches are real: a demonstrated tap makes the frog sing, and a demonstrated drop plinks the new pad. */
  private demoBeats(hint: Hint, from: number, to: number): void {
    const crossed = (at: number) => from < at && to >= at
    if (hint.kind === 'tapFrog') {
      if (crossed(0.28) || crossed(0.58)) {
        const frog = this.frogs[hint.frog]
        if (frog.mode !== 'sit') return
        frog.tappedAt = this.time
        this.sing(frog, 0.9)
        this.sound.voice(hint.frog, PADS[this.state.frogs[hint.frog]].pitch, 0, 0.7)
      }
      return
    }
    if (hint.toPad !== null && crossed(0.76)) {
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
