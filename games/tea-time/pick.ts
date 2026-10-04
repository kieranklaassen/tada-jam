// Which thing a finger landed on. Pure: the view says where each thing is on
// the surface and how big it looks there, and this picks one. A small thing
// in front of a big one wins, a thing is never smaller to the finger than a
// fingertip, and the bare cloth is what is left.

export type Target = {
  id: string
  /** Its middle on the surface, in the surface's own pixels. */
  x: number
  y: number
  /** How far from its middle it reaches on the surface, in pixels. */
  reach: number
  /** Things with a higher rank are picked first where two overlap: the pot before a cup, a cup before the saucer under it. */
  rank: number
}

/** No target is smaller than this to a finger, in pixels from its middle: about a 68 px target, above the jam's 48 px floor. */
export const LEAST_REACH = 34

/** The id of the thing under the point, or null for the bare cloth. */
export function pick(targets: readonly Target[], x: number, y: number): string | null {
  let best: Target | null = null, bestScore = Infinity
  for (const target of targets) {
    const reach = Math.max(LEAST_REACH, target.reach)
    const far = Math.hypot(target.x - x, target.y - y) / reach
    if (far > 1) continue
    // Nearer its middle is better; rank breaks the overlap of a cup and its saucer, whose middles are one.
    const score = far - target.rank * 10
    if (score < bestScore) {
      best = target
      bestScore = score
    }
  }
  return best ? best.id : null
}
