// Toes in Clouds, the sim. A rider sits on a swing (a pendulum). Holding the
// legs pad stretches the legs out, which pushes the seat FORWARD: that adds
// energy while the seat is going forward and takes it away while it comes
// back, so the arc grows only when the pumping is in step. Tapping the let-go
// pad (or the rider) drops the rope; the rider leaves along the tangent of the
// arc with the speed the swing had, and flies as a plain projectile. Where in
// the arc that happens decides where the rider lands: the best launch is a
// little before the forward peak (still fast, already rising), not at the peak
// (no speed left, so the rider drops straight down).
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random or clocks.
// The seeded rng only picks the swing's first small push.

import { between, createRng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W, TICK_MS } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// Field furniture in logical coordinates. Rect x and y are the top-left corner.
export const PIVOT = { x: 400, y: 60 }
export const ROPE = 380
export const LEGS_PAD: Rect = { x: 30, y: 610, w: 230, h: 190 }
export const LETGO_PAD: Rect = { x: 290, y: 610, w: 230, h: 190 }
export const GROUND_Y = 730
export const SAND_END = 250
export const POND_START = 780
export const HILL_START = 1020
export const HILL_TOP = 640
export const ISLAND = { x0: 850, x1: 980, top: 330 }

export type Outcome = 'sand' | 'lawn' | 'pond' | 'hill' | 'cloud'
export type Mode = 'ride' | 'fly' | 'land'

// Physics. G is in field pixels per second squared, tuned so a swing takes
// about 2.6 s to go there and back.
const G = 2200
const SUBSTEPS = 3
const DT = TICK_MS / 1000 / SUBSTEPS
const DAMP = 0.2
const PUMP = 0.9
const LEG_STEP = 1 / 6
const THETA_CAP = 1.45
// The widest arc pumping can make, for normalising features.
const MAX_ARC = 1.3
const ARC_STILL = 0.15
const ARC_LOW = 0.55
const ARC_MID = 0.95
const WALL = 20
const RIDER_HIT = 80
const DWELL_TICKS = 50
const HINT_AFTER_TICKS = 150
const TRAIL_MAX = 90
// The browser view never calls observe(), so the queue must not grow forever.
const MAX_EVENTS = 64

export interface SwingSnapshot {
  tick: number
  mode: Mode
  riding: boolean
  theta: number
  omega: number
  amp: number
  legs: number
  held: boolean
  seat: { x: number; y: number }
  // Where the rider is now: on the seat, in the air, or where it landed.
  rider: { x: number; y: number }
  landed: { cls: Outcome; x: number; y: number } | null
  lastOutcome: Outcome | 'none'
  flights: number
  trail: Array<[number, number]>
  // Null when the flag hook is removed.
  flags: number | null
  // True once the island hook has opened the cloud island.
  island: boolean
  // Where the idle hint points, or null. Only ever set when config.hints is on.
  hint: { pad: 'legs' | 'letgo'; on: boolean } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h

function classify(x: number): Outcome {
  if (x < SAND_END) return 'sand'
  if (x < POND_START) return 'lawn'
  if (x < HILL_START) return 'pond'
  return 'hill'
}

export const createSim: CreateSim<SwingSnapshot> = (config): Sim<SwingSnapshot> => {
  const rng = createRng(config.seed)
  // Each hook is honoured only when it is in this list, so an empty list means
  // no hook events and no hook behaviour, and each one can be removed alone.
  const hooks = new Set(config.hooks)

  let theta = (rng() < 0.5 ? -1 : 1) * between(rng, 0.22, 0.34)
  let omega = 0
  let legs = 0
  let mode: Mode = 'ride'
  let fx = 0
  let fy = 0
  let fvx = 0
  let fvy = 0
  let landed: { cls: Outcome; x: number; y: number } | null = null
  let dwell = 0
  let lastOutcome: Outcome | 'none' = 'none'
  let flights = 0
  let reach = 0
  let sync = 0
  let flags = 0
  let islandOpen = false
  let tick = 0
  let idleTicks = 0
  let trail: Array<[number, number]> = []
  const pumpers = new Set<number>()
  let pending: SimEvent[] = []

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  const seatX = () => PIVOT.x + ROPE * Math.sin(theta)
  const seatY = () => PIVOT.y + ROPE * Math.cos(theta)
  const amplitude = () => Math.acos(clamp(Math.cos(theta) - (omega * omega * ROPE) / (2 * G), -1, 1))

  const letGo = () => {
    if (mode !== 'ride') return
    fx = seatX()
    fy = seatY()
    // Tangent of the arc, at the speed of the seat.
    fvx = ROPE * omega * Math.cos(theta)
    fvy = -ROPE * omega * Math.sin(theta)
    mode = 'fly'
    flights++
    trail = [[fx, fy]]
    emit({ kind: 'state', name: 'let-go' })
  }

  const land = (cls: Outcome, x: number, y: number) => {
    mode = 'land'
    landed = { cls, x, y }
    dwell = 0
    lastOutcome = cls
    trail.push([x, y])
    reach = clamp((x - PIVOT.x) / (FIELD_W - WALL - PIVOT.x), 0, 1)
    emit({ kind: 'state', name: `landed-${cls}` })
    if ((cls === 'hill' || cls === 'cloud') && hooks.has('flag')) {
      flags++
      emit({ kind: 'hook', name: 'flag' })
    }
    if (cls === 'hill' && hooks.has('island') && !islandOpen) {
      islandOpen = true
      emit({ kind: 'hook', name: 'island' })
    }
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    if (phase === 'up') {
      pumpers.delete(id)
      return
    }
    if (phase !== 'down' || !Number.isFinite(x) || !Number.isFinite(y)) return
    pumpers.delete(id)
    if (inside(LEGS_PAD, x, y)) {
      pumpers.add(id)
      emit({ kind: 'state', name: 'legs-out' })
    } else if (mode === 'ride' && (inside(LETGO_PAD, x, y) || Math.hypot(x - seatX(), y - seatY()) <= RIDER_HIT)) {
      letGo()
    }
  }

  const stepFlight = () => {
    for (let i = 0; i < SUBSTEPS && mode === 'fly'; i++) {
      const px = fx
      const py = fy
      fvy += G * DT
      fx += fvx * DT
      fy += fvy * DT
      if (fx < WALL) {
        fx = WALL
        fvx = Math.abs(fvx) * 0.3
      } else if (fx > FIELD_W - WALL) {
        fx = FIELD_W - WALL
        fvx = -Math.abs(fvx) * 0.3
      }
      // The island is a one-way cloud: the rider lands on it coming down.
      if (islandOpen && fvy > 0 && py < ISLAND.top && fy >= ISLAND.top && fx >= ISLAND.x0 && fx <= ISLAND.x1) {
        land('cloud', fx, ISLAND.top)
      } else if (px < HILL_START && fx >= HILL_START && fy > HILL_TOP) {
        // Too low: the rider bumps the foot of the hill and slides into the pond.
        land('pond', HILL_START - 30, GROUND_Y)
      } else {
        const surface = fx >= HILL_START ? HILL_TOP : GROUND_Y
        if (fy >= surface) land(classify(fx), fx, surface)
      }
    }
    if (mode === 'fly') {
      trail.push([fx, fy])
      if (trail.length > TRAIL_MAX) trail.shift()
    }
  }

  const step = () => {
    tick++
    idleTicks++
    legs += clamp((pumpers.size > 0 ? 1 : 0) - legs, -LEG_STEP, LEG_STEP)
    if (mode === 'ride' && legs > 0.3) sync += ((omega > 0 ? 1 : 0) - sync) * 0.04
    for (let i = 0; i < SUBSTEPS; i++) {
      const push = mode === 'ride' ? PUMP * legs : 0
      omega += (-(G / ROPE) * Math.sin(theta) - DAMP * omega + push) * DT
      theta += omega * DT
      if (Math.abs(theta) > THETA_CAP) {
        theta = Math.sign(theta) * THETA_CAP
        omega = 0
      }
    }
    if (mode === 'fly') stepFlight()
    else if (mode === 'land' && ++dwell >= DWELL_TICKS) mode = 'ride'
  }

  const riderAt = (): { x: number; y: number } => {
    if (mode === 'fly') return { x: fx, y: fy }
    if (mode === 'land' && landed) return { x: landed.x, y: landed.y }
    return { x: seatX(), y: seatY() }
  }

  const affordances = (): Affordance[] => {
    const frac = clamp(amplitude() / MAX_ARC, 0, 1)
    const riding = mode === 'ride'
    const list: Affordance[] = [
      { ...LEGS_PAD, kind: 'hold', salience: riding ? (omega > 0 ? 0.7 : 0.35) : 0.2 },
      { ...LETGO_PAD, kind: 'tap', salience: riding ? 0.25 + 0.5 * frac : 0.1 },
    ]
    if (riding) {
      const half = 50
      const x = clamp(seatX() - half, 0, FIELD_W - 2 * half)
      const y = clamp(seatY() - half, 0, FIELD_H - 2 * half)
      list.push({ x, y, w: 2 * half, h: 2 * half, kind: 'tap', salience: 0.3 + 0.4 * frac })
    }
    return list
  }

  const arcClass = () => {
    const a = amplitude()
    return a < ARC_STILL ? 'still' : a < ARC_LOW ? 'low' : a < ARC_MID ? 'mid' : 'wide'
  }

  const signature = (): string => {
    if (mode === 'fly') return `fly/${lastOutcome}`
    if (mode === 'land') return `land-${landed!.cls}`
    return `ride-${arcClass()}/${lastOutcome}`
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    return {
      signature: signature(),
      features: {
        arc: clamp(amplitude() / MAX_ARC, 0, 1),
        reach,
        sync,
        height: clamp((GROUND_Y - riderAt().y) / (GROUND_Y - PIVOT.y), 0, 1),
        flights,
      },
      events,
    }
  }

  // Off by default for return and self-aim runs. The hint is only data for the
  // view: the legs pad pulses exactly while the seat goes forward, and once the
  // swing is wide the let-go pad glows. It never changes what the sim does.
  const hint = (): SwingSnapshot['hint'] => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS || mode !== 'ride') return null
    if (amplitude() >= ARC_MID && idleTicks >= 2 * HINT_AFTER_TICKS) return { pad: 'letgo', on: true }
    return { pad: 'legs', on: omega > 0 }
  }

  const snapshot = (): SwingSnapshot => ({
    tick,
    mode,
    riding: mode === 'ride',
    theta,
    omega,
    amp: amplitude(),
    legs,
    held: pumpers.size > 0,
    seat: { x: seatX(), y: seatY() },
    rider: riderAt(),
    landed: landed ? { ...landed } : null,
    lastOutcome,
    flights,
    trail: trail.map(([x, y]) => [x, y]),
    flags: hooks.has('flag') ? flags : null,
    island: islandOpen,
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
