import { insideCircle, SCALE } from './layout'
import type { Piece } from './state'

// The Honest Scale (R8, KTD5). Weight is the honest sum of quarter-stone
// amounts on each pan; the beam springs toward a saturating tilt and settles
// level, in silence, only when the pans truly match.

export type Side = 0 | 1
export type Beam = { angle: number; velocity: number; settledLevel: boolean }

const STIFFNESS = 44
const DAMPING = 6.4
const REST_VELOCITY = 0.01
const REST_ANGLE = 0.002

export function panOf(piece: { x: number; y: number }): Side | null {
  if (insideCircle(piece, SCALE.pans[0])) return 0
  if (insideCircle(piece, SCALE.pans[1])) return 1
  return null
}

export function panWeights(pieces: readonly Piece[]): [number, number] {
  const weights: [number, number] = [0, 0]
  for (const piece of pieces) {
    const side = panOf(piece)
    if (side !== null) weights[side] += piece.q
  }
  return weights
}

/** Positive angle tips the right pan down. Weights are in quarters; one stone is 4. */
export function targetTilt([left, right]: readonly [number, number]): number {
  return SCALE.maxTilt * Math.tanh((right - left) / 4 / 2)
}

export function restingBeam(): Beam {
  return { angle: 0, velocity: 0, settledLevel: true }
}

/** Advance the damped spring; `settledLevel` flips true once, when a level beam comes to rest. */
export function stepBeam(beam: Beam, target: number, dt: number): Beam {
  let { angle, velocity } = beam
  const steps = Math.max(1, Math.round(dt / (1 / 240)))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    velocity += (STIFFNESS * (target - angle) - DAMPING * velocity) * h
    angle += velocity * h
  }
  const atRest = Math.abs(velocity) < REST_VELOCITY && Math.abs(angle - target) < REST_ANGLE
  if (atRest) {
    angle = target
    velocity = 0
  }
  return { angle, velocity, settledLevel: atRest && target === 0 }
}

/** How far each pan sits below its rest position, in world units. */
export function panDrops(angle: number): [number, number] {
  const drop = (angle / SCALE.maxTilt) * SCALE.maxDrop
  return [-drop, drop]
}

/** The creak follows the beam: louder while it moves, higher as it tilts, silent at rest. */
export function creak(beam: Beam): { gain: number; pitch: number } {
  const gain = Math.min(1, Math.abs(beam.velocity) / 0.8)
  return { gain: gain < 0.02 ? 0 : gain, pitch: 140 + (Math.abs(beam.angle) / SCALE.maxTilt) * 160 }
}
