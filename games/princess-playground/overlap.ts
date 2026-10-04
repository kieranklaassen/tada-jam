import type { FriendPose } from './pose'
import { FRIENDS, type FriendId } from './world'

// How far one friend's body is inside another's, measured on the shapes as
// they are drawn: an egg a little wider below its middle, squashed, spread
// and leaned by its pose. Pure, and used by tests only: it is what holds
// "nothing passes through anything" on every frame of a long play, where the
// intersection audit samples a few moments.

/** How far a squashed body spreads sideways; the view draws with the same rule. */
export function spread(squash: number): number {
  return Math.min(1.2, 1 / Math.sqrt(Math.max(0.2, squash)))
}

/** The bulge below the middle of a body, at `height` from -1 (its underside) to 1 (its top). */
export function belly(height: number): number {
  return 1 + 0.1 * (1 - height) * (1 - height * height)
}

const RINGS = 28
const SPOKES = 28

/** The deepest any point of `b`'s surface lies inside `a`, in tray units; 0 when they do not overlap. */
export function depthInside(a: FriendId, pa: FriendPose, b: FriendId, pb: FriendPose): number {
  const fa = FRIENDS[a], fb = FRIENDS[b]
  const wideA = spread(pa.squash), wideB = spread(pb.squash)
  const cosB = Math.cos(pb.lean), sinB = Math.sin(pb.lean), cosA = Math.cos(pa.lean), sinA = Math.sin(pa.lean)
  let worst = 0
  for (let i = 0; i <= RINGS; i++) {
    const up = Math.cos((i / RINGS) * Math.PI), out = Math.sin((i / RINGS) * Math.PI), bulge = belly(up)
    const ly = (up + 1) * fb.halfHeight * pb.squash
    for (let j = 0; j < SPOKES; j++) {
      const angle = (j / SPOKES) * Math.PI * 2
      const lx = out * Math.cos(angle) * fb.radius * bulge * wideB, lz = out * Math.sin(angle) * fb.radius * 0.94 * bulge * wideB
      // b's point in the tray: leaned about its underside (a positive lean tips its top to the right).
      const dx = pb.x + lx * cosB + ly * sinB - pa.x, dy = pb.y - lx * sinB + ly * cosB - pa.y, dz = pb.z + lz - pa.z
      // The same point in a's own frame.
      const ax = dx * cosA - dy * sinA, ay = dx * sinA + dy * cosA
      const ny = ay / (fa.halfHeight * pa.squash) - 1
      if (ny < -1 || ny > 1) continue
      const reach = fa.radius * belly(ny) * wideA
      const d = Math.hypot(ax / reach, ny, dz / (reach * 0.94))
      if (d < 1) worst = Math.max(worst, (1 - d) * Math.min(fa.halfHeight * pa.squash, reach))
    }
  }
  return worst
}

/** The deeper of the two ways round. */
export function overlap(a: FriendId, pa: FriendPose, b: FriendId, pb: FriendPose): number {
  return Math.max(depthInside(a, pa, b, pb), depthInside(b, pb, a, pa))
}
