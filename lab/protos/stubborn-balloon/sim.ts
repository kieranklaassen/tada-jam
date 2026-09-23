// Stubborn Balloon. One slow balloon sinks through the field. A pat anywhere on
// it lifts it, but WHERE decides the rest: under the middle goes straight up,
// off to one side spins it so it curls that way (spin builds when pats repeat on
// one side and is taken away by a pat on the other). A finger held beneath
// catches and cradles it. A bear on the far side reaches up and bats it back
// when it floats over, harder when the balloon crosses at the paw's sweet height.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now, or
// performance.now. Randomness is the seeded rng (wind, pat noise, layout) and
// time is counted in ticks.

import { between, createRng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const R = 84
// The finger is not a pixel: the hit-test forgives this much around the body.
const HIT_SLOP = 30
// How far below the balloon's rim a held finger still counts as "beneath".
const UNDER_REACH = 150
const SINK = 1.5
const KICK = 9.5
const CURL_AX = 0.17
const VX_DRAG = 0.975
const SPIN_DECAY = 0.988
const MAX_SPIN = 1.3
// Below this many radii from the middle a pat counts as straight.
const STRAIGHT_U = 0.22
const REACH_X = 140
const BEAR_SPEED = 2.5
// Ticks the bear waits after a bat before it ambles to its next spot.
const BEAR_PAUSE = 30
const BEAR_MIN = 140
const BEAR_MAX = 1040
const REACH_TOP = 110
// The paw's sweet height: a balloon crossing near it gets the strongest bat.
const SWEET_Y = 340
const REACH_BOTTOM = 620
const BAT_COOL = 45
const BAT_POSE = 14
const WAVE_POSE = 30
const HINT_AFTER_TICKS = 150
const MAX_EVENTS = 64
const TRAIL_LEN = 16

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const sign = (n: number) => (n < 0 ? -1 : 1)

export interface BalloonSnapshot {
  tick: number
  balloon: { x: number; y: number; r: number; spin: number; angle: number; cradled: boolean; onFloor: boolean }
  bear: { x: number; side: 'left' | 'right'; pose: 'wait' | 'wave' | 'bat' | 'walk'; poseT: number; body: Rect; reach: Rect }
  fingers: Array<{ x: number; y: number }>
  trail: Array<{ x: number; y: number }>
  bats: number
  rally: number
  pats: number
  curlPats: number
  landings: number
  // Where the idle hint points, or null. Only ever set when config.hints is on.
  hint: { x: number; y: number; kind: 'ring' | 'side' } | null
}

export const createSim: CreateSim<BalloonSnapshot> = (config): Sim<BalloonSnapshot> => {
  const rng = createRng(config.seed)

  // The bear starts across the field from the balloon, on either side by seed.
  const startRight = rng() < 0.5
  let bearX = startRight ? between(rng, 880, BEAR_MAX) : between(rng, BEAR_MIN, 300)
  let bearTarget = bearX
  let walkDelay = 0
  const b = {
    x: startRight ? between(rng, 180, 460) : between(rng, 720, 1000),
    y: between(rng, 130, 260),
    vx: 0,
    vy: 0,
    spin: 0,
    angle: 0,
  }
  const bodyRect = (): Rect => ({ x: bearX - 120, y: 540, w: 240, h: 280 })
  const reachRect = (): Rect => ({ x: bearX - REACH_X, y: REACH_TOP, w: REACH_X * 2, h: REACH_BOTTOM - REACH_TOP })

  const fingers = new Map<number, { x: number; y: number }>()
  let cradle: number | null = null
  let onFloor = false
  let pose: 'wait' | 'wave' | 'bat' = 'wait'
  const moving = () => bearX !== bearTarget
  let poseT = 0
  let cool = 0
  let wind = 0
  let windTarget = 0
  let pending: SimEvent[] = []
  let trail: Array<{ x: number; y: number }> = []
  let tick = 0
  let idleTicks = 0
  let bats = 0
  let rally = 0
  let pats = 0
  let curlPats = 0
  let landings = 0

  const emit = (name: string) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push({ kind: 'state', name })
  }

  // A pat at (x, y). Sideways offset u (in radii) decides the curl, how far
  // down the balloon v decides the lift. Anywhere on it lifts.
  const pat = (x: number, y: number) => {
    cradle = null
    const u = clamp((x - b.x) / R, -1, 1)
    const v = clamp((y - b.y) / R, -1, 1)
    const straight = Math.abs(u) < STRAIGHT_U
    const mag = clamp((Math.abs(u) - 0.12) / 0.75, 0, 1) * 0.95
    // Stubborn: it never goes quite where you aim.
    b.spin = clamp(b.spin * (straight ? 0.2 : 0.5) + sign(u) * mag * between(rng, 0.85, 1.15), -MAX_SPIN, MAX_SPIN)
    b.vx = b.vx * (straight ? 0.2 : 0.6) + between(rng, -0.4, 0.4)
    b.vy = -KICK * (0.8 + 0.2 * v) * between(rng, 0.92, 1.08)
    pats++
    if (straight) emit('pat-straight')
    else {
      curlPats++
      emit(u > 0 ? 'pat-curl-right' : 'pat-curl-left')
    }
  }

  // The bear sends the balloon back the way it came, then ambles to a new spot
  // across the field from where the balloon is headed, so the next crossing is
  // a new aiming problem (which side to pat, and how far out).
  const bat = () => {
    const strength = 1 - clamp(Math.abs(b.y - SWEET_Y) / 260, 0, 0.55)
    const away = b.x >= bearX ? 1 : -1
    b.vx = away * (4 + 3.5 * strength) * between(rng, 0.92, 1.08)
    b.vy = -(8.5 + 2 * strength)
    b.spin = away * 0.5 * strength
    const dest = clamp(b.x + away * 300, R, FIELD_W - R)
    let next = dest < FIELD_W / 2 ? BEAR_MAX : BEAR_MIN
    for (let tries = 0; tries < 8; tries++) {
      const candidate = between(rng, BEAR_MIN, BEAR_MAX)
      if (Math.abs(candidate - dest) >= 380 && Math.abs(candidate - bearX) >= 250) {
        next = candidate
        break
      }
    }
    bearTarget = next
    walkDelay = BEAR_PAUSE
    cool = BAT_COOL
    pose = 'bat'
    poseT = BAT_POSE
    bats++
    rally++
    emit('bat')
    if (strength >= 0.7) emit('bat-sweet')
  }

  const release = (id: number) => {
    fingers.delete(id)
    if (cradle === id) {
      cradle = null
      b.vx = 0
      b.vy = 0.5
      emit('cradle-release')
    }
  }

  const insideBear = (x: number, y: number) => {
    const body = bodyRect()
    return x >= body.x && x <= body.x + body.w && y >= body.y && y <= body.y + body.h
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (phase === 'down') {
      if (!finite) return
      release(id)
      if (Math.hypot(x - b.x, y - b.y) <= R + HIT_SLOP) {
        pat(x, y)
        fingers.set(id, { x, y })
      } else if (cradle === null && !onFloor && Math.abs(x - b.x) <= R + 10 && y > b.y + R && y <= b.y + R + UNDER_REACH) {
        // A finger held beneath: the balloon will sink onto it.
        fingers.set(id, { x, y })
        emit('finger-under')
      } else if (insideBear(x, y)) {
        pose = 'wave'
        poseT = WAVE_POSE
        emit('bear-wave')
      }
      return
    }
    const f = fingers.get(id)
    if (phase === 'move') {
      if (f && finite) {
        f.x = x
        f.y = y
      }
      return
    }
    release(id)
  }

  const inReach = () => Math.abs(b.x - bearX) <= REACH_X && b.y >= REACH_TOP && b.y <= REACH_BOTTOM

  const step = () => {
    tick++
    idleTicks++
    if (tick % 40 === 0) windTarget = between(rng, -0.02, 0.02)
    wind += (windTarget - wind) * 0.08
    if (cool > 0) cool--
    if (poseT > 0 && --poseT === 0) pose = 'wait'
    if (walkDelay > 0) walkDelay--
    else if (moving()) {
      bearX += clamp(bearTarget - bearX, -BEAR_SPEED, BEAR_SPEED)
    }

    // A held finger beneath a descending balloon catches it.
    if (cradle === null && !onFloor && b.vy >= -0.5) {
      for (const [id, f] of fingers) {
        const rel = f.y - b.y
        if (Math.abs(f.x - b.x) <= 0.8 * R && rel >= 0.5 * R && rel <= R + 6) {
          cradle = id
          b.vx = 0
          b.vy = 0
          emit('cradle')
          break
        }
      }
    }

    const held = cradle === null ? undefined : fingers.get(cradle)
    if (cradle !== null && held) {
      const dx = held.x - b.x
      if (Math.abs(dx) > 0.95 * R) {
        // It slid off the fingertip and curls away from it.
        cradle = null
        b.vx = -sign(dx) * 1.5
        b.spin = -sign(dx) * 0.5
        emit('slip')
      } else {
        b.x += clamp(dx * 0.15, -3, 3)
        b.y = clamp(b.y + clamp((held.y - 0.92 * R - b.y) * 0.3, -8, 8), R, FIELD_H - R)
        b.vx = 0
        b.vy = 0
        b.spin *= 0.9
      }
    } else {
      cradle = null
      b.vy += (SINK - b.vy) * 0.03
      b.vx = (b.vx + b.spin * CURL_AX + wind) * VX_DRAG
      b.spin *= SPIN_DECAY
      b.x += b.vx
      b.y += b.vy
      if (b.x < R) {
        b.x = R
        b.vx = -b.vx * 0.5
        b.spin *= -0.5
      } else if (b.x > FIELD_W - R) {
        b.x = FIELD_W - R
        b.vx = -b.vx * 0.5
        b.spin *= -0.5
      }
      if (b.y < R) {
        b.y = R
        b.vy = Math.abs(b.vy) * 0.3
      }
      if (b.y >= FIELD_H - R) {
        b.y = FIELD_H - R
        b.vy = b.vy > 0.6 ? -b.vy * 0.3 : 0
        b.vx *= 0.85
        b.spin *= 0.85
        if (!onFloor) {
          onFloor = true
          landings++
          rally = 0
          emit('landing')
        }
      } else if (b.y < FIELD_H - R - 10) onFloor = false
    }
    b.angle += b.spin * 0.25

    if (cradle === null && cool === 0 && !onFloor && inReach()) bat()

    if (tick % 2 === 0) {
      trail.push({ x: b.x, y: b.y })
      if (trail.length > TRAIL_LEN) trail = trail.slice(trail.length - TRAIL_LEN)
    }
  }

  const affordances = (): Affordance[] => {
    const list: Affordance[] = [
      { x: b.x - R, y: b.y - R, w: R * 2, h: R * 2, kind: 'tap', salience: 0.5 + 0.45 * (b.y / FIELD_H) },
    ]
    if (cradle === null && !onFloor) {
      // Starts past the pat's forgiving edge, so every point of it is a true
      // "finger beneath" touch and none of it is a pat from below.
      const y = b.y + R + HIT_SLOP + 2
      const h = Math.min(UNDER_REACH - HIT_SLOP - 4, FIELD_H - y)
      if (h >= 30) list.push({ x: clamp(b.x - R, 0, FIELD_W - R * 2), y, w: R * 2, h, kind: 'hold', salience: 0.3 })
    }
    list.push({ ...bodyRect(), kind: 'tap', salience: 0.3 })
    return list
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    const place = cradle !== null ? 'cradle' : onFloor ? 'floor' : b.y < 380 ? 'high' : 'low'
    const curl = place === 'high' || place === 'low' ? (b.spin > 0.25 ? '-curl-right' : b.spin < -0.25 ? '-curl-left' : '-straight') : ''
    // 'batted' lasts through the bear's amble to its new spot.
    const bearState = cool > 0 || walkDelay > 0 || moving() ? 'batted' : Math.abs(b.x - bearX) < REACH_X + 220 ? 'reaching' : 'waiting'
    return {
      signature: `${place}${curl}/${bearState}`,
      features: {
        bats,
        landings,
        pats,
        curlPats,
        rally,
        nearBear: 1 - clamp(Math.abs(b.x - bearX) / FIELD_W, 0, 1),
        height: 1 - b.y / FIELD_H,
      },
      events,
    }
  }

  // Off by default for return and self-aim runs. Data for the view only: it
  // never touches the rng or the physics. First a ring on the balloon; if the
  // child has only ever patted straight, a ghost pat on the bear's side of it.
  const hint = (): BalloonSnapshot['hint'] => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS || cradle !== null) return null
    if (curlPats === 0 && pats >= 3) {
      return { x: b.x + (bearX > b.x ? 1 : -1) * R * 0.75, y: b.y + R * 0.3, kind: 'side' }
    }
    return { x: b.x, y: b.y, kind: 'ring' }
  }

  const snapshot = (): BalloonSnapshot => ({
    tick,
    balloon: { x: b.x, y: b.y, r: R, spin: b.spin, angle: b.angle, cradled: cradle !== null, onFloor },
    bear: {
      x: bearX,
      side: bearX < FIELD_W / 2 ? 'left' : 'right',
      pose: pose === 'wait' && moving() && walkDelay === 0 ? 'walk' : pose,
      poseT,
      body: bodyRect(),
      reach: reachRect(),
    },
    fingers: [...fingers.values()].map((f) => ({ x: f.x, y: f.y })),
    trail: trail.map((p) => ({ x: p.x, y: p.y })),
    bats,
    rally,
    pats,
    curlPats,
    landings,
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
