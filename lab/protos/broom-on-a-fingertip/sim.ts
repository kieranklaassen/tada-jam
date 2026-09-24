// Broom on a Fingertip. A broom is pinned to a fingertip point the child
// drags along a rail. It is an inverted pendulum: the more it tilts, the
// harder gravity leans it, so the child slides the fingertip under the lean
// (and, with practice, under the lean before it shows) to keep it up and walk
// it to a flag. Let it fall and it swings down and hangs from the point. A
// hanging broom can be shaken back up to standing: no rule says so, it is
// just the physics, and finding it is the mystery half of the loop.
//
// Pure and deterministic: a seeded rng for the starting lean and the flags,
// tick counts for everything else. Physics substeps inside step().

import { between, createRng } from '../../kit/rng.ts'
import { FIELD_W, TICK_MS } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type Pose = 'up' | 'lean' | 'low' | 'hang'

// Field furniture, in logical coordinates. Rect x and y are the top-left corner.
export const PIVOT_Y = 400
export const HOME_X = 150
const START_X = 590
const X_MIN = 90
const X_MAX = 1090
// Rod lengths in px, longest (slowest to fall, easiest) first.
export const LENGTHS = [330, 240, 150] as const
const BROOM_NAMES = ['long', 'mid', 'short'] as const
export const RACK: readonly Rect[] = [0, 1, 2].map((i) => ({ x: 30 + i * 130, y: 704, w: 116, h: 90 }))

// Physics. G in px/s^2 gives a fall time constant sqrt(L / G): about 0.55 s for
// the long broom, 0.47 s for the mid one, 0.37 s for the short one.
export const G = 1100
// Linear damping settles a swing over half a minute; the quadratic term keeps a
// hard-shaken broom from spinning like a propeller forever.
const DAMP = 0.12
const DRAG = 0.03
const MAX_OMEGA = 12
const SUBSTEPS = 4
const DT = TICK_MS / 1000 / SUBSTEPS
const TICK_S = TICK_MS / 1000
// The fingertip follows the finger like a critically damped spring, so a
// jump of the finger is a bounded shove and not an impulse.
export const FOLLOW_TAU = 0.04
const FOLLOW_K = 1 / (FOLLOW_TAU * FOLLOW_TAU)
const FOLLOW_C = 2 / FOLLOW_TAU
const A_MAX = 15000
const V_MAX = 3000

// Angles in radians from straight up.
const UP_ANGLE = 0.35
const FALL_AT = 1.2
const HANG_FROM = 2.27
const SAVE_LEAN = 0.5

const STAND_CONFIRM = 10
// Ticks spent low or hanging before a stand-up counts as the shake-up trick
// (a catch on the rebound straight after a fall is a save, not the trick).
const SWING_LOW_TICKS = 90
const HIT_SLOP = 10
const GRAB_HALF_WIDTH = 150
const HANDLE = 150
const FLAG_R = 90
const FLAG_HALF = 70
const PLANT_TICKS = 30
const PLANT_ANGLE = 0.22
const PLANT_OMEGA = 0.9
const PLANT_SPEED = 150
const HINT_AFTER_TICKS = 150
const MAX_EVENTS = 64

export interface BroomSnapshot {
  tick: number
  broom: number
  // Rod length in px.
  length: number
  pivot: { x: number; y: number; vx: number }
  // Radians from straight up, positive leans right.
  theta: number
  omega: number
  tip: { x: number; y: number }
  pose: Pose
  held: boolean
  swungUp: boolean
  rack: readonly Rect[]
  // Null when the flags hook is removed.
  flag: { x: number; progress: number; flash: boolean } | null
  planted: number | null
  // Null when the best hook is removed. Seconds.
  best: { run: number; best: number } | null
  // Where the idle or lean hint points, or null. Only set when hints are on.
  hint: { kind: 'grab' | 'shake' | 'lean'; dir: number; x: number; y: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inside = (r: Rect, x: number, y: number, slop = 0) =>
  x >= r.x - slop && x <= r.x + r.w + slop && y >= r.y - slop && y <= r.y + r.h + slop

const poseOf = (angle: number): Pose => (angle < UP_ANGLE ? 'up' : angle < FALL_AT ? 'lean' : angle < HANG_FROM ? 'low' : 'hang')

export const createSim: CreateSim<BroomSnapshot> = (config): Sim<BroomSnapshot> => {
  const rng = createRng(config.seed)
  // Each hook is honoured only when named here, so an empty list means no hook
  // events and no hook behaviour, and each one can be removed alone.
  const hooks = new Set(config.hooks)

  let broom = 1
  let length: number = LENGTHS[broom]!
  let px = START_X
  let vx = 0
  let target = START_X
  let theta = (rng() < 0.5 ? -1 : 1) * between(rng, 0.04, 0.08)
  let omega = 0
  // Always drawn, so the world does not depend on which hooks are enabled.
  let flagX = rng() < 0.5 ? between(rng, 200, 400) : between(rng, 780, 980)

  let holder: number | null = null
  let grabOffset = 0
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0

  let armed = true
  let standTicks = 0
  let lowTicks = 0
  let maxLean = 0
  let trick = false
  let falls = 0
  let saves = 0
  let swingUps = 0
  let planted = 0
  let plantTicks = 0
  let plantFlash = 0
  let runTicks = 0
  let bestTicks = 0
  let bestAtStart = 0
  let recordArmed = true
  let uprightTicks = 0
  let walkedPx = 0
  let wobble = 0

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  const resetLatches = () => {
    armed = true
    standTicks = 0
    lowTicks = 0
    maxLean = 0
    runTicks = 0
    plantTicks = 0
  }

  const release = () => {
    if (holder === null) return
    holder = null
    emit({ kind: 'state', name: 'let-go' })
  }

  // Put a fresh broom of this size on the fingertip at home, standing with a
  // small lean. The walk back from a far flag is the price of a reset.
  const swap = (slot: number) => {
    release()
    broom = slot
    length = LENGTHS[slot]!
    px = HOME_X
    vx = 0
    target = HOME_X
    theta = (rng() < 0.5 ? -1 : 1) * between(rng, 0.04, 0.08)
    omega = 0
    resetLatches()
    emit({ kind: 'state', name: 'swap' })
  }

  // The sim's own hit-test for the fingertip point: the point, and the whole
  // broom above and below it, so a child who grabs the broom still holds it.
  const nearBroom = (x: number, y: number) =>
    Math.abs(x - px) <= GRAB_HALF_WIDTH && y >= PIVOT_Y - length - 30 && y <= PIVOT_Y + length + 30

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (phase === 'down') {
      if (!finite) return
      if (id === holder) release()
      const slot = RACK.findIndex((r) => inside(r, x, y, HIT_SLOP))
      if (slot >= 0) {
        swap(slot)
        return
      }
      if (holder === null && nearBroom(x, y)) {
        holder = id
        grabOffset = px - x
        target = clamp(x + grabOffset, X_MIN, X_MAX)
        emit({ kind: 'state', name: 'grab' })
      }
      return
    }
    if (id !== holder) return
    if (finite) target = clamp(x + grabOffset, X_MIN, X_MAX)
    if (phase === 'up') release()
  }

  const nextFlagX = () => (flagX < FIELD_W / 2 ? between(rng, 760, 980) : between(rng, 200, 420))

  const plant = () => {
    planted++
    plantFlash = 20
    plantTicks = 0
    emit({ kind: 'state', name: 'plant' })
    emit({ kind: 'hook', name: 'flags' })
    flagX = nextFlagX()
  }

  // One fixed substep of the physics.
  const integrate = () => {
    const vBefore = vx
    const ax = clamp(FOLLOW_K * (target - px) - FOLLOW_C * vx, -A_MAX, A_MAX)
    vx = clamp(vx + ax * DT, -V_MAX, V_MAX)
    px += vx * DT
    if (px < X_MIN) {
      px = X_MIN
      vx = Math.max(vx, 0)
    } else if (px > X_MAX) {
      px = X_MAX
      vx = Math.min(vx, 0)
    }
    // What the broom actually feels, after the walls and limits.
    const a = clamp((vx - vBefore) / DT, -A_MAX, A_MAX)
    const alpha = (G * Math.sin(theta) - a * Math.cos(theta)) / length - DAMP * omega - DRAG * Math.abs(omega) * omega
    omega = clamp(omega + alpha * DT, -MAX_OMEGA, MAX_OMEGA)
    theta += omega * DT
    if (theta > Math.PI) theta -= 2 * Math.PI
    else if (theta <= -Math.PI) theta += 2 * Math.PI
  }

  const step = () => {
    tick++
    idleTicks++
    for (let i = 0; i < SUBSTEPS; i++) integrate()

    const angle = Math.abs(theta)
    const pose = poseOf(angle)
    const held = holder !== null
    const upright = angle < UP_ANGLE

    if (armed && angle > FALL_AT) {
      armed = false
      falls++
      emit({ kind: 'state', name: 'fall' })
    }

    if (pose === 'low' || pose === 'hang') lowTicks++
    if (!upright && angle > maxLean) maxLean = angle
    standTicks = upright ? standTicks + 1 : 0
    if (standTicks === STAND_CONFIRM) {
      if (lowTicks >= SWING_LOW_TICKS) {
        swingUps++
        trick = true
        emit({ kind: 'state', name: 'swing-up' })
      } else if (maxLean > SAVE_LEAN && maxLean < FALL_AT) {
        saves++
        emit({ kind: 'state', name: 'save' })
      }
      lowTicks = 0
      maxLean = 0
      // Only a broom that has stood again can fall again, so a broom swinging
      // through the top does not count a fall on every pass.
      armed = true
    }

    if (held && upright) {
      if (runTicks === 0) {
        bestAtStart = bestTicks
        recordArmed = true
      }
      runTicks++
      uprightTicks++
      walkedPx += Math.abs(vx) * TICK_S
      if (runTicks > bestTicks) bestTicks = runTicks
      if (hooks.has('best') && recordArmed && runTicks * TICK_S > bestAtStart * TICK_S + 1) {
        recordArmed = false
        emit({ kind: 'hook', name: 'best' })
      }
    } else runTicks = 0
    if (held) wobble += (angle - wobble) * 0.02

    if (plantFlash > 0) plantFlash--
    if (hooks.has('flags')) {
      const ready =
        held && angle < PLANT_ANGLE && Math.abs(omega) < PLANT_OMEGA && Math.abs(vx) < PLANT_SPEED && Math.abs(px - flagX) <= FLAG_R
      plantTicks = ready ? plantTicks + 1 : 0
      if (plantTicks >= PLANT_TICKS) plant()
    }
  }

  const affordances = (): Affordance[] => {
    const list: Affordance[] = [
      { x: px - HANDLE / 2, y: PIVOT_Y - HANDLE / 2, w: HANDLE, h: HANDLE, kind: 'drag', salience: holder !== null ? 0.5 : 0.9 },
    ]
    if (hooks.has('flags')) {
      list.push({ x: flagX - FLAG_HALF, y: PIVOT_Y - FLAG_HALF, w: FLAG_HALF * 2, h: FLAG_HALF * 2, kind: 'hold', salience: 0.6 })
    }
    // A fallen broom draws the eye to the rack, the way back up.
    const fallen = poseOf(Math.abs(theta)) === 'low' || poseOf(Math.abs(theta)) === 'hang'
    for (const r of RACK) list.push({ ...r, kind: 'tap', salience: fallen ? 0.7 : 0.2 })
    return list
  }

  const atFlag = () => hooks.has('flags') && Math.abs(px - flagX) <= FLAG_R

  const observe = (): Observation => {
    const events = pending
    pending = []
    const angle = Math.abs(theta)
    const signature = `${BROOM_NAMES[broom]}/${poseOf(angle)}/${atFlag() ? 'at-flag' : 'open'}${trick ? '/swung' : ''}`
    return {
      signature,
      features: {
        uprightTime: uprightTicks * TICK_S,
        bestRun: bestTicks * TICK_S,
        wobble,
        tilt: angle,
        energy: (0.5 * omega * omega * length) / G + 1 + Math.cos(theta),
        planted,
        falls,
        saves,
        swingUps,
        walked: walkedPx / FIELD_W,
        broom,
        held: holder !== null ? 1 : 0,
      },
      events,
    }
  }

  // Only data for the view; a hint never changes what the sim does.
  const hint = (): BroomSnapshot['hint'] => {
    if (!config.hints) return null
    const angle = Math.abs(theta)
    if (holder !== null) return angle > 0.22 && angle < FALL_AT ? { kind: 'lean', dir: Math.sign(theta), x: px, y: PIVOT_Y } : null
    if (idleTicks < HINT_AFTER_TICKS) return null
    return { kind: angle >= FALL_AT ? 'shake' : 'grab', dir: 0, x: px, y: PIVOT_Y }
  }

  const snapshot = (): BroomSnapshot => ({
    tick,
    broom,
    length,
    pivot: { x: px, y: PIVOT_Y, vx },
    theta,
    omega,
    tip: { x: px + length * Math.sin(theta), y: PIVOT_Y - length * Math.cos(theta) },
    pose: poseOf(Math.abs(theta)),
    held: holder !== null,
    swungUp: trick,
    rack: RACK,
    flag: hooks.has('flags') ? { x: flagX, progress: plantTicks / PLANT_TICKS, flash: plantFlash > 0 } : null,
    planted: hooks.has('flags') ? planted : null,
    best: hooks.has('best') ? { run: runTicks * TICK_S, best: bestTicks * TICK_S } : null,
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
