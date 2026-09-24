import { DOOR, type Point } from './layout'
import { to3 } from './physics3d'

// Knock-Knock's visitors: clay mice that come out of the little house's door
// one after another, walk to their spots in the yard, and go back in the same
// way. They grow out of the doorstep as they walk straight out of the door,
// turn for their spots only once full-grown and clear of the house and its
// open door, and keep a visitor's length apart on the way, so none ever
// reaches into the house, its door, or another visitor (view/models.tsx
// draws them from here).

/** How far (cm) a drawn visitor reaches across the table from its middle, whichever way it faces. */
export const VISITOR_REACH = 9
/** Where visitors come out and go back in: on the doorstep, just in front of where the house's door swings open to. */
export const DOORSTEP: Point = { x: DOOR.door.x, y: DOOR.house.y + 185 }
/** Where visitors turn for their spots: straight out from the doorstep by a visitor's reach, so they are full-grown there. */
export const GATE: Point = { x: DOORSTEP.x, y: DOORSTEP.y + VISITOR_REACH * 10 }
/** How fast visitors walk, in world units a second. */
export const VISITOR_SPEED = 500
/** How far apart visitors keep on the way out and back, in world units: twice their reach and a centimetre. */
export const VISITOR_SPACING = VISITOR_REACH * 20 + 10
/** The time between two visitors coming out, or going back in. */
export const VISITOR_GAP = VISITOR_SPACING / VISITOR_SPEED
/** How long the door takes to swing open or shut; visitors wait for it. */
export const DOOR_SWING = 0.45

export type VisitorTimes = { home: Point; outAt: number; leaveAt: number | null; pokeAt: number | null }

const STEP_OUT = GATE.y - DOORSTEP.y
const pathLength = (home: Point) => STEP_OUT + Math.hypot(home.x - GATE.x, home.y - GATE.y)

/** How long a visitor takes to walk between the doorstep and its spot. */
export function visitorWalk(home: Point): number {
  return pathLength(home) / VISITOR_SPEED
}

/** How far a visitor has walked from the doorstep at `now`, in world units: 0 before it comes out and once it is back in. */
export function visitorDistance({ home, outAt, leaveAt }: VisitorTimes, now: number): number {
  const out = Math.min(pathLength(home), Math.max(0, VISITOR_SPEED * (Math.min(now, leaveAt ?? now) - outAt)))
  return leaveAt === null || now <= leaveAt ? out : Math.max(0, out - VISITOR_SPEED * (now - leaveAt))
}

/** Whether a visitor is out and standing on its spot. */
export function visitorHome(visitor: VisitorTimes, now: number): boolean {
  return (visitor.leaveAt === null || now <= visitor.leaveAt) && visitorDistance(visitor, now) >= pathLength(visitor.home)
}

/** Whether a visitor has gone back in for good. */
export function visitorGone(visitor: VisitorTimes, now: number): boolean {
  return visitor.leaveAt !== null && now > visitor.leaveAt && visitorDistance(visitor, now) === 0
}

/** When each visitor comes out, the door having opened at `openAt`: those going farthest first, so nobody walks past a visitor already standing on its spot. */
export function comingOut(homes: readonly Point[], openAt: number): number[] {
  const order = homes.map((home, index) => ({ index, length: pathLength(home) })).sort((a, b) => b.length - a.length)
  const times = homes.map(() => 0)
  order.forEach(({ index }, rank) => (times[index] = openAt + DOOR_SWING + rank * VISITOR_GAP))
  return times
}

/**
 * Sends every visitor home, returning when the last is back in. Those still
 * on their way out turn round at once (they are already a gap apart), those
 * not yet out stay in, and those in the yard follow, nearest the door first,
 * each arriving a gap after the one before.
 */
export function goingHome(visitors: VisitorTimes[], now: number): number {
  const out = visitors.filter((visitor) => {
    if (visitor.outAt >= now) visitor.leaveAt = now
    return visitor.outAt < now
  })
  const walking = (visitor: VisitorTimes) => !visitorHome(visitor, now)
  const order = out.map((visitor) => ({ visitor, distance: visitorDistance(visitor, now) }))
  order.sort((a, b) => (walking(a.visitor) === walking(b.visitor) ? a.distance - b.distance : walking(a.visitor) ? -1 : 1))
  let last = now
  let previous = -Infinity
  for (const { visitor, distance } of order) {
    const arrive = Math.max(now + distance / VISITOR_SPEED, previous + VISITOR_GAP)
    visitor.leaveAt = arrive - distance / VISITOR_SPEED
    previous = arrive
    last = Math.max(last, arrive)
  }
  return last
}

export type VisitorPose = { x: number; y: number; z: number; facing: number; grow: number; squash: number; walking: boolean }

function smooth(k: number): number {
  const c = Math.min(1, Math.max(0, k))
  return c * c * (3 - 2 * c)
}

/** Where on its way a visitor `distance` from the doorstep stands, on the table's plane. */
function along(home: Point, distance: number): Point {
  if (distance <= STEP_OUT) return { x: DOORSTEP.x, y: DOORSTEP.y + distance }
  const k = (distance - STEP_OUT) / (pathLength(home) - STEP_OUT)
  return { x: GATE.x + (home.x - GATE.x) * k, y: GATE.y + (home.y - GATE.y) * k }
}

/** Where a visitor is drawn at `now` (3D, cm), or null while it is indoors. `index` staggers the idle wiggles. */
export function visitorPose(visitor: VisitorTimes, index: number, now: number): VisitorPose | null {
  const distance = visitorDistance(visitor, now)
  if (distance <= 0) return null
  const length = pathLength(visitor.home)
  const at = to3(along(visitor.home, distance))
  const leaving = visitor.leaveAt !== null && now > visitor.leaveAt
  const walking = leaving || distance < length
  const hop = walking ? Math.abs(Math.sin((distance / length) * Math.PI * 3)) * 3 : 0
  const pokeAge = visitor.pokeAt === null ? Infinity : now - visitor.pokeAt
  const poke = pokeAge < 0.5 ? Math.sin((pokeAge / 0.5) * Math.PI) * 4 : 0
  const wiggle = walking ? 0 : Math.sin(now * 5 + index * 1.7) * 0.12
  // They face the yard, and the child, everywhere in it; going in, they turn for the door only once past the
  // gate, where no one else is within reach of them.
  const facing = leaving ? Math.PI * smooth((STEP_OUT - distance) / (STEP_OUT / 3)) : 0
  return {
    x: at.x,
    y: hop + poke,
    z: at.z,
    facing: facing + wiggle,
    // Grown only as far as it has come out, so its back never reaches behind the doorstep.
    grow: Math.min(1, distance / STEP_OUT),
    squash: 1 - poke * 0.02,
    walking,
  }
}
