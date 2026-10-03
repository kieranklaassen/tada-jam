import { COLLAR_Y, FLOOR_Y, HEAD, LOCK_X, STEP, STRIP_W, tipY } from './layout'
import type { ClippingPlace, FaceSpot, Salon } from './world'

// Where every touchable thing of the toy is, in scene units, at rest: the
// lock, the nine tufts of the mane, the face, and the clippings. Pure
// geometry, shared by the rules of touch (what is under a finger, what a
// stroke of the scissors crosses) and by the view that draws them, so the two
// can never disagree about where a thing is.

export type Point = { x: number; y: number }

/** A finger is no point: a touch this near a thing is on it. */
export const SLOP = 16

// --- The mane ---------------------------------------------------------------

/** How long a tuft is drawn, in scene units, for a length in steps. */
export const TUFT_BASE = 40
export const TUFT_STEP = 1.3

/** Each tuft's own lean off the fan, in degrees, its width and its hook: wild hair is not a neat fan. */
const TUFTS_OWN: readonly { lean: number; width: number; curl: number }[] = [
  { lean: -8, width: 92, curl: 0.3 }, { lean: 10, width: 86, curl: -0.25 }, { lean: -12, width: 98, curl: 0.35 },
  { lean: 6, width: 88, curl: -0.2 }, { lean: 0, width: 100, curl: 0.28 }, { lean: -9, width: 90, curl: -0.32 },
  { lean: 12, width: 96, curl: 0.22 }, { lean: -6, width: 86, curl: -0.3 }, { lean: 9, width: 94, curl: 0.26 },
]

export type TuftPose = {
  /** Where it leaves the head, relative to the head's centre. */
  base: Point
  /** The way it points, in radians from straight up, clockwise. */
  angle: number
  /** How long it is drawn. */
  reach: number
  width: number
  curl: number
}

/** A tuft at rest, relative to the head's centre: from the left cheek over the top to the right cheek. */
export function tuftPose(index: number, steps: number, count = TUFTS_OWN.length): TuftPose {
  const own = TUFTS_OWN[index % TUFTS_OWN.length]
  const t = count <= 1 ? 0.5 : index / (count - 1)
  const fan = (-108 + t * 216) * (Math.PI / 180)
  return {
    base: { x: Math.sin(fan) * HEAD.rx * 0.82, y: -Math.cos(fan) * HEAD.ry * 0.82 },
    angle: fan + own.lean * (Math.PI / 180) + droop(fan, own.curl, steps),
    reach: TUFT_BASE + steps * TUFT_STEP,
    width: own.width,
    curl: own.curl,
  }
}

/** A long tuft is top-heavy and flops over, to the side it already leans or hooks to. In radians. */
export function droop(fan: number, curl: number, steps: number): number {
  const heavy = Math.max(0, (steps - 55) / 45)
  const side = Math.abs(Math.sin(fan)) > 0.2 ? Math.sign(Math.sin(fan)) : Math.sign(curl || 1)
  return side * 0.55 * heavy * heavy
}

/** The free end of a tuft at rest, relative to the head's centre. */
export function tuftTip(pose: TuftPose): Point {
  return { x: pose.base.x + Math.sin(pose.angle) * pose.reach, y: pose.base.y - Math.cos(pose.angle) * pose.reach }
}

// --- The lock ---------------------------------------------------------------

export const LOCK_ROOT: Point = { x: LOCK_X, y: COLLAR_Y }

// --- The floor --------------------------------------------------------------

/** A place along the floor (0 to 100) as a scene x, and back. */
export function floorX(place: number): number {
  return 150 + place * 8.8
}
export function placeOnFloor(sceneX: number): number {
  return Math.max(0, Math.min(100, Math.round((sceneX - 150) / 8.8)))
}
/** Pieces lie in three loose rows, by where they are, so neighbours do not hide each other. */
export function floorY(place: number): number {
  return FLOOR_Y + 72 + ((Math.round(place) % 3) - 1) * 16
}

// --- The face ---------------------------------------------------------------

/** Where a worn piece sits, relative to the head's centre. */
export const SPOT_Y: Record<FaceSpot, number> = { brow: -44, lip: 42, chin: 80 }

export type FacePart = 'nose' | 'ear' | 'chin' | 'cheek'

function inHead(p: Point, grow = 1): boolean {
  const dx = (p.x - HEAD.x) / (HEAD.rx * grow), dy = (p.y - HEAD.y) / (HEAD.ry * grow)
  return dx * dx + dy * dy <= 1
}

/** Which part of the face a point is on. */
export function facePart(p: Point): FacePart {
  if (Math.hypot(p.x - HEAD.x, p.y - (HEAD.y + 24)) <= 34) return 'nose'
  if (p.y < HEAD.y - 52 && Math.abs(p.x - HEAD.x) > 40) return 'ear'
  if (p.y > HEAD.y + 50) return 'chin'
  return 'cheek'
}

/** Where a clipping let go at a point comes to lie: on the face, at the nearest spot, or on the floor below. */
export function dropPlace(p: Point): ClippingPlace {
  if (!inHead(p)) return { on: 'floor', x: placeOnFloor(p.x) }
  const dy = p.y - HEAD.y
  const spots = Object.keys(SPOT_Y) as FaceSpot[]
  const spot = spots.reduce((best, s) => (Math.abs(SPOT_Y[s] - dy) < Math.abs(SPOT_Y[best] - dy) ? s : best), spots[0])
  return { on: 'face', who: 'chair', spot }
}

/** The middle of a clipping and half its length, in scene units. */
export function clippingBox(piece: { len: number } & ClippingPlace): { x: number; y: number; half: number } {
  const half = (piece.len * STEP) / 2
  return piece.on === 'floor' ? { x: floorX(piece.x), y: floorY(piece.x), half } : { x: HEAD.x, y: HEAD.y + SPOT_Y[piece.spot], half }
}

// --- What is under a finger -------------------------------------------------

export type Touched =
  /** `along` is how far from its root the lock was touched, in steps. */
  | { object: 'lock'; along: number }
  | { object: 'tuft'; index: number; along: number }
  | { object: 'face'; part: FacePart }
  | { object: 'clipping'; index: number }

/** How far along a segment the nearest point to `p` is (0 to 1), and how far away it is. */
function nearestOn(a: Point, b: Point, p: Point): { t: number; distance: number } {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length))
  return { t, distance: Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)) }
}

/**
 * The thing under a finger, or nothing. What lies on top is found first: a
 * clipping, then the lock, then the face, then the mane behind it. With
 * nobody in the chair only the floor has anything on it.
 */
export function whatIsAt(salon: Salon, p: Point): Touched | null {
  const somebody = salon.chair !== null
  for (let index = salon.clippings.length - 1; index >= 0; index--) {
    const piece = salon.clippings[index]
    if (piece.on === 'face' && (!somebody || piece.who !== 'chair')) continue
    const box = clippingBox(piece)
    if (Math.abs(p.x - box.x) <= box.half + SLOP && Math.abs(p.y - box.y) <= STRIP_W / 2 + SLOP) return { object: 'clipping', index }
  }
  if (!somebody) return null
  const tip = tipY(salon.lock)
  // A stub is still a thing a finger can catch: the lock is never a smaller target than a fingertip.
  if (Math.abs(p.x - LOCK_X) <= STRIP_W / 2 + SLOP && p.y >= COLLAR_Y - 4 && p.y <= Math.max(tip, COLLAR_Y + 34) + SLOP) {
    return { object: 'lock', along: Math.max(0, Math.min(salon.lock, (p.y - COLLAR_Y) / STEP)) }
  }
  if (inHead(p)) return { object: 'face', part: facePart(p) }
  let best: Touched | null = null, nearest = Infinity
  for (let index = 0; index < salon.mane.length; index++) {
    const pose = tuftPose(index, salon.mane[index], salon.mane.length), end = tuftTip(pose)
    const hit = nearestOn({ x: HEAD.x + pose.base.x, y: HEAD.y + pose.base.y }, { x: HEAD.x + end.x, y: HEAD.y + end.y }, p)
    // A tuft is widest near its root and comes to a point.
    const half = (pose.width / 2) * (1 - hit.t * 0.6) + SLOP
    if (hit.distance <= half && hit.distance < nearest) {
      nearest = hit.distance
      best = { object: 'tuft', index, along: hit.t * salon.mane[index] }
    }
  }
  return best
}

// --- What a stroke of the scissors crosses ----------------------------------

export type Crossed =
  /** `at` is how far from the root the hair was crossed, in steps. */
  | { object: 'lock'; at: number; where: Point }
  | { object: 'tuft'; index: number; at: number; where: Point }
  | { object: 'clipping'; index: number; where: Point }
  | { object: 'face'; where: Point }

/** Where two segments cross: how far along each (0 to 1), or nothing. */
function crossing(a: Point, b: Point, c: Point, d: Point): { u: number; v: number } | null {
  const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y
  const denominator = rx * sy - ry * sx
  if (denominator === 0) return null
  const u = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denominator, v = ((c.x - a.x) * ry - (c.y - a.y) * rx) / denominator
  return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { u, v } : null
}

/**
 * Everything the scissors cross on their way from `a` to `b`, in the order
 * they meet it. Hair is cut where its middle line is crossed, so blades that
 * only brush its edge cut nothing. The face is crossed, and never cut, when
 * the blades come in over the middle of it.
 */
export function crossedBy(salon: Salon, a: Point, b: Point): Crossed[] {
  const found: { u: number; hit: Crossed }[] = []
  const at = (u: number): Point => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u })
  const somebody = salon.chair !== null
  salon.clippings.forEach((piece, index) => {
    if (piece.on !== 'floor') return
    const box = clippingBox(piece)
    const hit = crossing(a, b, { x: box.x - box.half, y: box.y }, { x: box.x + box.half, y: box.y })
    if (hit) found.push({ u: hit.u, hit: { object: 'clipping', index, where: at(hit.u) } })
  })
  if (somebody) {
    const hit = crossing(a, b, LOCK_ROOT, { x: LOCK_X, y: tipY(salon.lock) })
    if (hit) found.push({ u: hit.u, hit: { object: 'lock', at: hit.v * salon.lock, where: at(hit.u) } })
    salon.mane.forEach((steps, index) => {
      const pose = tuftPose(index, steps, salon.mane.length), end = tuftTip(pose)
      const root = { x: HEAD.x + pose.base.x, y: HEAD.y + pose.base.y }
      const cut = crossing(a, b, root, { x: HEAD.x + end.x, y: HEAD.y + end.y })
      // Only the part of a tuft that shows outside the face can be cut.
      if (cut && !inHead(at(cut.u))) found.push({ u: cut.u, hit: { object: 'tuft', index, at: cut.v * steps, where: at(cut.u) } })
    })
    if (!inHead(a, 0.6) && inHead(b, 0.6)) found.push({ u: 1, hit: { object: 'face', where: b } })
  }
  return found.sort((x, y) => x.u - y.u).map((entry) => entry.hit)
}
