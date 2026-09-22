import { insideRect, type Rect } from './layout'

// Top-down clay-on-wood physics (KTD2): no gravity, exponential friction,
// circle collisions, and a table edge that stones fall off. Fixed substeps
// keep it deterministic.

export const STEP = 1 / 120
export const REST_SPEED = 6
export const CLACK_SPEED = 90
const RESTITUTION = 0.45
const MAX_SUBSTEPS = 8

export type Body = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  r: number
  /** Held by a finger or in flight: moves others, is never moved. */
  kinematic: boolean
  /** Per-second velocity decay rate; higher stops sooner. */
  friction: number
}

/** A sweeping finger: pushes bodies it passes over. */
export type Pusher = { x: number; y: number; vx: number; vy: number; r: number }

export type StepReport = {
  fallen: number[]
  impacts: { speed: number; x: number; y: number }[]
  moving: boolean
}

export function speed(body: Body): number {
  return Math.hypot(body.vx, body.vy)
}

function integrate(bodies: Body[], dt: number): void {
  for (const body of bodies) {
    if (body.kinematic) continue
    const decay = Math.exp(-body.friction * dt)
    body.vx *= decay
    body.vy *= decay
    if (speed(body) < REST_SPEED) {
      body.vx = 0
      body.vy = 0
    }
    body.x += body.vx * dt
    body.y += body.vy * dt
  }
}

function collide(bodies: Body[], impacts: StepReport['impacts']): void {
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i]
      const b = bodies[j]
      if (a.kinematic && b.kinematic) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const distance = Math.hypot(dx, dy)
      const overlap = a.r + b.r - distance
      if (overlap <= 0) continue
      const nx = distance > 1e-6 ? dx / distance : 1
      const ny = distance > 1e-6 ? dy / distance : 0
      const aMass = a.kinematic ? 0 : a.r * a.r
      const bMass = b.kinematic ? 0 : b.r * b.r
      const inverseA = aMass > 0 ? 1 / aMass : 0
      const inverseB = bMass > 0 ? 1 / bMass : 0
      const inverseSum = inverseA + inverseB
      a.x -= nx * overlap * (inverseA / inverseSum)
      a.y -= ny * overlap * (inverseA / inverseSum)
      b.x += nx * overlap * (inverseB / inverseSum)
      b.y += ny * overlap * (inverseB / inverseSum)
      const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
      if (closing <= 0) continue
      const impulse = ((1 + RESTITUTION) * closing) / inverseSum
      a.vx -= impulse * inverseA * nx
      a.vy -= impulse * inverseA * ny
      b.vx += impulse * inverseB * nx
      b.vy += impulse * inverseB * ny
      if (closing > CLACK_SPEED) impacts.push({ speed: closing, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    }
  }
}

function push(bodies: Body[], pushers: readonly Pusher[]): void {
  for (const pusher of pushers) {
    for (const body of bodies) {
      if (body.kinematic) continue
      const dx = body.x - pusher.x
      const dy = body.y - pusher.y
      const distance = Math.hypot(dx, dy)
      const overlap = pusher.r + body.r - distance
      if (overlap <= 0) continue
      const nx = distance > 1e-6 ? dx / distance : 1
      const ny = distance > 1e-6 ? dy / distance : 0
      body.x += nx * overlap
      body.y += ny * overlap
      const along = pusher.vx * nx + pusher.vy * ny
      const current = body.vx * nx + body.vy * ny
      if (along > current) {
        body.vx += (along - current) * nx * 1.1
        body.vy += (along - current) * ny * 1.1
      }
    }
  }
}

/** Advance `elapsed` seconds in fixed substeps. Bodies whose centers leave `table` are reported as fallen. */
export function stepWorld(bodies: Body[], elapsed: number, table: Rect, pushers: readonly Pusher[] = []): StepReport {
  const impacts: StepReport['impacts'] = []
  const steps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.round(elapsed / STEP)))
  for (let i = 0; i < steps; i++) {
    push(bodies, pushers)
    integrate(bodies, STEP)
    collide(bodies, impacts)
  }
  const fallen = bodies.filter((body) => !body.kinematic && !insideRect(body, table)).map((body) => body.id)
  const moving = bodies.some((body) => !body.kinematic && speed(body) > 0)
  return { fallen, impacts, moving }
}
