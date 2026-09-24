import * as THREE from 'three'
import { CREEK_Y, groundY } from './world'

/** One hop, landing to landing: the arc rises `height` above the straight line between them at its middle. */
export type Hop = { from: THREE.Vector3; to: THREE.Vector3; height: number }

const SAMPLES = 32
/** A hop on the flat, and how much higher a hop up a step goes per unit it climbs. */
const FLAT_HOP = 0.22
const CLIMB = 0.6

/**
 * Hops along a route of landings, each leg split into hops about `step` long. Every landing between the route's
 * points is on the ground, and every arc clears the ground it passes over by `clearance` at its middle, tapering to
 * the landings: a terrace wall between two landings is jumped, never passed through. Legs flung out `trail` behind
 * the feet clear it too. A landing between the route's points holds the body `stand` over the ground.
 */
export function planHops(
  route: readonly THREE.Vector3[],
  step: number,
  clearance: number,
  out: Hop[] = [],
  trail = 0,
  stand = 0,
): Hop[] {
  out.length = 0
  for (let i = 0; i + 1 < route.length; i++) {
    const a = route[i]
    const b = route[i + 1]
    let n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / step))
    // No landing between the route's points is in the creek: out of the pond (or back in) is one leap.
    while (n > 1 && Array.from({ length: n - 1 }, (_, k) => inCreek(a, b, (k + 1) / n)).some(Boolean)) n--
    let from = a.clone()
    for (let k = 1; k <= n; k++) {
      const to = k === n ? b.clone() : new THREE.Vector3().lerpVectors(a, b, k / n)
      if (k < n) to.y = groundY(to.x, to.z) + stand
      out.push({ from, to, height: arcHeight(from, to, clearance, trail) })
      from = to
    }
  }
  return out
}

function inCreek(a: THREE.Vector3, b: THREE.Vector3, s: number): boolean {
  return groundY(a.x + (b.x - a.x) * s, a.z + (b.z - a.z) * s) === CREEK_Y
}

function arcHeight(from: THREE.Vector3, to: THREE.Vector3, clearance: number, trail: number): number {
  let over = 0
  const behind = trail / Math.max(1e-6, Math.hypot(to.x - from.x, to.z - from.z))
  for (let i = 1; i < SAMPLES; i++) {
    const s = i / SAMPLES
    const line = from.y + (to.y - from.y) * s
    const under = (t: number) => groundY(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t)
    const ground = Math.max(under(s), s > behind ? under(s - behind) : -Infinity)
    over = Math.max(over, (ground - line) / Math.sin(s * Math.PI))
  }
  return Math.max(FLAT_HOP + Math.max(0, to.y - from.y) * CLIMB, over + clearance)
}

/** Where along a hop a body is at `air` (0 on the takeoff, 1 on the landing): its feet, and the ground under them. */
export function hopPoint(hop: Hop, air: number, out: THREE.Vector3): number {
  out.lerpVectors(hop.from, hop.to, air)
  out.y += Math.sin(air * Math.PI) * hop.height
  return hop.from.y + (hop.to.y - hop.from.y) * air
}
