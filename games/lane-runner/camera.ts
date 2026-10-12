import { LANE_WIDTH, SHELF_REACH } from './trail'

// Where the camera stands, as plain numbers: behind the fox and well above
// it, looking down the trail, so that the child reads how far away the next
// thing is and sees over the fox's head what stands just ahead in its lane. The view sets its camera from a `Shot`, and the same shot turns
// a place in the world into a place on the glass for the finger and for a
// test, with no renderer in it.
//
// The world here is the fox's own: the fox stands at the origin, x to the
// right, y up, and the trail runs away from the child towards minus z.

export type Vec3 = readonly [number, number, number]

export type Shot = {
  /** The vertical field of view, in degrees. */
  fov: number
  eye: Vec3
  target: Vec3
}

const FOV = 40
/** The widest the view opens on a narrow surface, in degrees. */
const WIDEST = 100
/** Pegs to each side of the trail's middle that are always in frame at the fox: the three lanes and the verge. */
export const HALF_IN_FRAME = 62
/** At the clearing it is more: the five who wait stand wider than the verge, and all of each of them is in frame on an upright surface too. */
export const HALF_AT_CLEARING = 72

type Stand = { back: number; up: number; ahead: number; height: number }
/** At the clearing the camera stands low behind the fox, so the five who wait and the shelf fill the frame. */
const CLEARING: Stand = { back: 128, up: 70, ahead: 110, height: 14 }
/**
 * Out on the trail it stands much higher and looks down steeply, with the fox low in the frame. What is ahead of
 * the fox is drawn above it on the glass, which is where a load over its head is: only from this high does what
 * stands in the fox's own lane show past the fox and its load at the last step before it.
 */
const TRAIL: Stand = { back: 76, up: 124, ahead: 48, height: 10 }

/**
 * For as long as a load can be taken from the shelf, three steps, the camera does not follow the fox: it stays
 * where it stood, so the shelf, the loads and the five who wait keep their places on the glass and a finger
 * finds them where they were.
 */
export const HOLDS = SHELF_REACH
/**
 * After the third step the camera goes after the fox, which is by then three steps ahead of it, and climbs to the
 * trail's stand as it closes. Its pace is the fox's own times this at the most: it gathers that pace over
 * `gathers` pegs of the fox's running, keeps it, and eases back to the fox's pace over the last `eases`. Twice
 * the fox's pace with the climb counted in (`CLOSES_AT_MOST`), so the board never streams past faster than that.
 */
const CLOSES = { pace: 1.95, gathers: 20, eases: 30 }
/** How far it has to make up: the three steps it stood still for, and how much nearer the fox it stands on the trail. */
const TO_MAKE_UP = HOLDS + CLEARING.back - TRAIL.back
/** Pegs the fox runs at the camera's full pace, so that what is made up is exactly `TO_MAKE_UP`. */
const KEEPS = (TO_MAKE_UP + CLOSES.gathers * (1 - CLOSES.pace / 2) - ((CLOSES.pace - 1) * CLOSES.eases) / 2) / (CLOSES.pace - 1)
/** Where it is beside the fox again at the trail's stand, in pegs from the shelf: past the stream, and well before the branch. */
export const CLOSED_AT = HOLDS + CLOSES.gathers + KEEPS + CLOSES.eases
/** The most the eye moves for each peg the fox runs, forward and up together. */
export const CLOSES_AT_MOST = Math.hypot(CLOSES.pace, ((TRAIL.up - CLEARING.up) * (CLOSES.pace - 1)) / TO_MAKE_UP)
/** Where the camera changes back to the clearing's stand after the last obstacle, in pegs from the shelf. */
const RETURNS = { from: -150, to: -70 }

/**
 * How many pegs the camera has made up on the fox, for a fox `along` pegs past the shelf: nothing while it holds,
 * a little less than nothing while it gathers pace (the fox still draws away), and `TO_MAKE_UP` in the end.
 */
function madeUp(along: number): number {
  const { pace, gathers, eases } = CLOSES
  let a = along - HOLDS
  if (a <= 0) return 0
  let made = 0
  const first = Math.min(a, gathers)
  made += (pace * first * first) / (2 * gathers) - first
  a -= first
  if (a <= 0) return made
  const kept = Math.min(a, KEEPS)
  made += (pace - 1) * kept
  a -= kept
  if (a <= 0) return made
  const last = Math.min(a, eases)
  made += (pace - 1) * (last - (last * last) / (2 * eases))
  return made
}

const smooth = (t: number): number => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/** How much of the trail's stand the camera has taken, 0 to 1, for a fox `along` pegs from the shelf by the shorter way (minus is before it). */
export function onTrail(along: number): number {
  if (along >= 0) return Math.min(1, Math.max(0, madeUp(along)) / TO_MAKE_UP)
  return 1 - smooth((along - RETURNS.from) / (RETURNS.to - RETURNS.from))
}

/**
 * The shot for a surface of this shape, with the fox `foxX` pegs to the right of the trail's middle and `along`
 * pegs from the shelf by the shorter way. Where the camera stands follows only where the fox is, never how it
 * moves, so a fox that stops is looked at from where it stopped. On a narrow surface the view opens wider until
 * the three lanes fit, so the trail is whole in portrait too and nothing changes places on the glass. The camera leans a little after the fox and never
 * as far as the fox goes.
 */
export function shotFor(width: number, height: number, foxX = 0, along = 0): Shot {
  const k = onTrail(along)
  const mix = (a: number, b: number): number => a + (b - a) * k
  const stand: Stand = { back: mix(CLEARING.back, TRAIL.back), up: mix(CLEARING.up, TRAIL.up), ahead: mix(CLEARING.ahead, TRAIL.ahead), height: mix(CLEARING.height, TRAIL.height) }
  const aspect = width / height
  const far = Math.hypot(stand.back, stand.up - stand.height)
  const half = mix(HALF_AT_CLEARING, HALF_IN_FRAME)
  const halfAtFox = Math.tan((FOV * Math.PI) / 360) * far * aspect
  // Too narrow for what must be in frame: the same eye opens wider, so the picture is the same one with more sky and more board.
  const fov = halfAtFox >= half ? FOV : Math.min(WIDEST, (Math.atan((half * 1.04) / (far * aspect)) * 360) / Math.PI)
  // What the camera has stayed behind by while the fox ran out from the shelf: all of it for three steps, and
  // then less and less as it goes after the fox. How near it stands is counted in what it has made up.
  const held = along <= HOLDS ? Math.max(along, 0) : HOLDS - madeUp(along) + (CLEARING.back - TRAIL.back) * k
  // It leans after the fox on the trail only. At the clearing it stands square, so the shelf and the five who wait
  // are in the same places on the glass whichever lane the fox stands in, and all of each is in the frame.
  const lean = foxX * k
  return {
    fov,
    eye: [lean * 0.35, stand.up, stand.back + held],
    target: [lean * 0.5, stand.height, -stand.ahead + held],
  }
}

/** A place in the world as a place on the surface, in its pixels from the top left, with how far in front of the camera it is (not in front when 0 or less). */
export function project(shot: Shot, width: number, height: number, point: Vec3): { x: number; y: number; depth: number } {
  const fx = shot.target[0] - shot.eye[0], fy = shot.target[1] - shot.eye[1], fz = shot.target[2] - shot.eye[2]
  const fl = Math.hypot(fx, fy, fz)
  const f: Vec3 = [fx / fl, fy / fl, fz / fl]
  // Right is forward crossed with up, and the camera's own up is right crossed with forward.
  const rl = Math.hypot(f[2], f[0])
  const r: Vec3 = [-f[2] / rl, 0, f[0] / rl]
  const u: Vec3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
  const vx = point[0] - shot.eye[0], vy = point[1] - shot.eye[1], vz = point[2] - shot.eye[2]
  const depth = vx * f[0] + vy * f[1] + vz * f[2]
  const tan = Math.tan((shot.fov * Math.PI) / 360)
  const safe = depth > 0 ? depth : 1e-6
  const nx = (vx * r[0] + vy * r[1] + vz * r[2]) / (safe * tan * (width / height))
  const ny = (vx * u[0] + vy * u[1] + vz * u[2]) / (safe * tan)
  return { x: ((nx + 1) / 2) * width, y: ((1 - ny) / 2) * height, depth }
}

/**
 * The other way: the place in the world under a place on the surface, on the upright plane `z` pegs towards the
 * child from the fox. Null when that plane is not in front of the camera there.
 */
export function onPlane(shot: Shot, width: number, height: number, x: number, y: number, z: number, out: { x: number; y: number } = { x: 0, y: 0 }): { x: number; y: number } | null {
  const fx = shot.target[0] - shot.eye[0], fy = shot.target[1] - shot.eye[1], fz = shot.target[2] - shot.eye[2]
  const fl = Math.hypot(fx, fy, fz)
  const f: Vec3 = [fx / fl, fy / fl, fz / fl]
  const rl = Math.hypot(f[2], f[0])
  const r: Vec3 = [-f[2] / rl, 0, f[0] / rl]
  const u: Vec3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
  const tan = Math.tan((shot.fov * Math.PI) / 360)
  const nx = ((x / width) * 2 - 1) * tan * (width / height), ny = (1 - (y / height) * 2) * tan
  const dx = f[0] + r[0] * nx + u[0] * ny, dy = f[1] + r[1] * nx + u[1] * ny, dz = f[2] + r[2] * nx + u[2] * ny
  if (Math.abs(dz) < 1e-9) return null
  const t = (z - shot.eye[2]) / dz
  if (t <= 0) return null
  out.x = shot.eye[0] + dx * t
  out.y = shot.eye[1] + dy * t
  return out
}

/** How many pixels lie between the middles of two neighbouring lanes where the fox stands. */
export function lanePixels(width: number, height: number, along = 0): number {
  const shot = shotFor(width, height, 0, along)
  return project(shot, width, height, [LANE_WIDTH, 0, 0]).x - project(shot, width, height, [0, 0, 0]).x
}

/** A box that stands facing the child: pegs right of the trail's middle, pegs above the board, and its depth in the fox's world. */
export type Box = { minX: number; maxX: number; minY: number; maxY: number; z: number }

/** The box as a rectangle on the surface, in its pixels, or null when it is behind the camera. */
export function onGlass(shot: Shot, width: number, height: number, box: Box): { left: number; right: number; top: number; bottom: number; depth: number } | null {
  const low = project(shot, width, height, [box.minX, box.minY, box.z])
  const high = project(shot, width, height, [box.maxX, box.maxY, box.z])
  if (low.depth <= 0 || high.depth <= 0) return null
  return { left: Math.min(low.x, high.x), right: Math.max(low.x, high.x), top: Math.min(low.y, high.y), bottom: Math.max(low.y, high.y), depth: low.depth }
}

/** A finger is wide: a touch this many pixels outside a thing still lands on it. */
export const SLACK = 10

/** Which of these boxes a finger at this place on the surface lands on, the nearest to the child first, or -1. */
export function boxAt(shot: Shot, width: number, height: number, x: number, y: number, boxes: readonly Box[], slack = SLACK): number {
  let found = -1, nearest = Infinity
  boxes.forEach((box, i) => {
    const rect = onGlass(shot, width, height, box)
    if (!rect) return
    if (x < rect.left - slack || x > rect.right + slack || y > rect.bottom + slack || y < rect.top - slack) return
    if (rect.depth < nearest) {
      nearest = rect.depth
      found = i
    }
  })
  return found
}
