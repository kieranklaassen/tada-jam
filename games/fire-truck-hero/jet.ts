// How water flies from the nozzle to where the finger is: one arc for each
// gulp. Numbers only, no renderer. The view moves drops along these arcs and
// the hose says when each lands.
//
// The water needs time to arrive, because it flies. The answer to a touch does
// not wait for it: the nozzle, the truck and the sound answer in the frame the
// finger lands (ART.md, "The toy").

export type Vec3 = { x: number; y: number; z: number }
export type Ground2 = { x: number; z: number }

/**
 * How high the water arches above the straight line from the nozzle to the
 * ground: this much for a near target, and more for each yard unit of
 * distance. A toy's hose throws a fat, low rainbow of an arc.
 */
export const ARCH_NEAR = 0.7
export const ARCH_PER_UNIT = 0.11

/** The shortest and the longest flight, in seconds. Near water lands at once; far water is still there in a third of a second. */
export const SHORTEST_FLIGHT_S = 0.2
export const LONGEST_FLIGHT_S = 0.34
/** Each yard unit of distance adds this much flight. */
export const FLIGHT_S_PER_UNIT = 0.011

export type Arc = {
  from: Vec3
  to: Ground2
  /** How long the flight takes. */
  seconds: number
  /** How high it arches above the straight line, at the middle of the flight. */
  arch: number
  /** The distance along the ground. */
  reach: number
}

export function flightSeconds(reach: number): number {
  return Math.min(LONGEST_FLIGHT_S, Math.max(SHORTEST_FLIGHT_S, SHORTEST_FLIGHT_S + FLIGHT_S_PER_UNIT * reach))
}

/** The arc from the nozzle to a point on the ground. It always arrives: no place in the yard is out of reach. */
export function arcTo(from: Vec3, to: Ground2): Arc {
  const reach = Math.hypot(to.x - from.x, to.z - from.z)
  return { from: { x: from.x, y: from.y, z: from.z }, to: { x: to.x, z: to.z }, seconds: flightSeconds(reach), arch: ARCH_NEAR + ARCH_PER_UNIT * reach, reach }
}

/** Where the water is `t` seconds after it left. Before the start it is at the nozzle, after the end on the ground. */
export function pointOn(arc: Arc, t: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const share = Math.min(1, Math.max(0, t / arc.seconds))
  out.x = arc.from.x + (arc.to.x - arc.from.x) * share
  out.z = arc.from.z + (arc.to.z - arc.from.z) * share
  // The straight line down to the ground, with a parabola arched over it.
  out.y = arc.from.y * (1 - share) + arc.arch * 4 * share * (1 - share)
  return out
}

/** The highest the water gets on this arc. */
export function apexOf(arc: Arc): number {
  // The top of the parabola, or the nozzle itself when the water only falls.
  const share = Math.min(1, Math.max(0, 0.5 - arc.from.y / (8 * arc.arch)))
  return arc.from.y * (1 - share) + arc.arch * 4 * share * (1 - share)
}

/** The direction the nozzle points to throw this arc: a turn about the upright (0 is along x) and a tilt up from level. */
export function nozzleFor(arc: Arc): { turn: number; tilt: number } {
  const turn = Math.atan2(arc.to.z - arc.from.z, arc.to.x - arc.from.x)
  // How steeply the arc leaves the nozzle.
  return { turn, tilt: Math.atan2(4 * arc.arch - arc.from.y, Math.max(0.0001, arc.reach)) }
}
