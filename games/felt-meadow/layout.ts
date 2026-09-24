import { smoothstep } from './math'

// The hillside in world units (about a centimetre each): x runs right, z runs
// toward the child, y is up. The hill rises gently away from the child to a
// crest near the back, so the whole slope faces the camera. Everything that
// sits on the hill asks `groundY` for its height.

export type Point = { x: number; z: number }
export type Spot = Point & { y: number }

export const HILL = { left: -96, right: 96, near: 44, far: -70, crestZ: -52, crestY: 13 }

/** Where seeds and critters may rest: the open grass of the slope. */
export const GRASS = { left: -80, right: 80, near: 30, far: -40 }

export const PLOTS: readonly Point[] = [
  { x: -34, z: 1 },
  { x: 0, z: -15 },
  { x: 34, z: 1 },
]
export const PLOT_RADIUS = 8.5
export const MOLEHILL_HEIGHT = 4.2
/** Height of a bloomed flower head above the molehill top. */
export const STEM_HEIGHT = 15.5

export const POUCH: Point = { x: -62, z: 19 }
export const POUCH_HEIGHT = 12
export const POUCH_RADIUS = 9
/** The pouch leans back a touch and turns toward the meadow: radians about x, then y, as the view poses it. */
export const POUCH_LEAN = { x: 0.1, y: 0.25 }
/** How the pouch is posed this frame: its roll about its own axis (a wiggle), and its squash and breath. */
export type PouchPose = { roll: number; width: number; height: number }
export const POUCH_REST: PouchPose = { roll: 0, width: 1, height: 1 }
/**
 * The three seeds sit in the pouch's mouth, in the pouch's own frame from the middle of its base: red, yellow,
 * blue from left to right, the middle one further back and a little higher. Each clears the ruffle, the
 * drawstring, and the other two.
 */
const POUCH_NEST: readonly Spot[] = [
  { x: -3, y: 13.8, z: 1.5 },
  { x: 0, y: 14.6, z: -3.6 },
  { x: 3, y: 13.8, z: 1.5 },
]

/** Where seed `slot` waits in the pouch's mouth with the pouch posed so, written into `out`. */
export function pouchSeat(slot: number, pose: PouchPose, out: Spot): Spot {
  const nest = POUCH_NEST[slot]
  const lx = nest.x * pose.width
  const ly = nest.y * pose.height
  const lz = nest.z * pose.width
  // The view's Euler order (XYZ): the roll about z first, then the lean about y, then about x.
  const rx = lx * Math.cos(pose.roll) - ly * Math.sin(pose.roll)
  const ry = lx * Math.sin(pose.roll) + ly * Math.cos(pose.roll)
  const tx = rx * Math.cos(POUCH_LEAN.y) + lz * Math.sin(POUCH_LEAN.y)
  const tz = -rx * Math.sin(POUCH_LEAN.y) + lz * Math.cos(POUCH_LEAN.y)
  out.x = POUCH.x + tx
  out.y = groundY(POUCH.x, POUCH.z) + ry * Math.cos(POUCH_LEAN.x) - tz * Math.sin(POUCH_LEAN.x)
  out.z = POUCH.z + ry * Math.sin(POUCH_LEAN.x) + tz * Math.cos(POUCH_LEAN.x)
  return out
}

/** The seats with the pouch at rest: where each seed waits and where the child reaches for it. */
export const POUCH_SLOTS: readonly Spot[] = POUCH_NEST.map((_, slot) => pouchSeat(slot, POUCH_REST, { x: 0, y: 0, z: 0 }))
export const SEED_RADIUS = 2.8

/** The pouch's lathe profile in its own frame, [radius, height] from the middle of its base up to the ruffle's lip. */
export const POUCH_PROFILE: readonly (readonly [number, number])[] = [
  [0.01, -0.8],
  [4.6, -0.6],
  [7.4, 0.7],
  [9.0, 2.9],
  [9.4, 5.3],
  [8.8, 7.7],
  [7.2, 9.5],
  [5.9, 10.5],
  [5.5, 11.0],
  [6.2, 11.5],
  [7.3, 11.9],
  [8.0, 12.0],
  [8.3, 11.6],
]
/** Above this height the profile is the ruffle, which ripples in and out and up and down. */
export const POUCH_RUFFLE_Y = 11.1
/** The drawstring round the neck, and the dark felt that fills the mouth below the seeds. */
export const POUCH_STRING = { radius: 5.9, y: 10.75, tube: 0.45 }
export const POUCH_INSIDE = { radius: 5.7, y: 10.3, depth: 0.35 }
/** How far clear of the pouch's felt a seed lifted over it stays. */
const POUCH_CLEAR = 0.15

/**
 * How high a seed's centre near (x, y, z) must be to clear the posed pouch's felt (its body, ruffle, drawstring,
 * and the felt inside its mouth): `y` itself when it is clear already.
 */
export function pouchFloor(x: number, y: number, z: number, pose: PouchPose): number {
  // Into the pouch's own frame: undo the lean about x, then about y, then the roll and the squash.
  const px = x - POUCH.x
  const py = y - groundY(POUCH.x, POUCH.z)
  const pz = z - POUCH.z
  const y1 = py * Math.cos(POUCH_LEAN.x) + pz * Math.sin(POUCH_LEAN.x)
  const z1 = -py * Math.sin(POUCH_LEAN.x) + pz * Math.cos(POUCH_LEAN.x)
  const x2 = px * Math.cos(POUCH_LEAN.y) - z1 * Math.sin(POUCH_LEAN.y)
  const z2 = px * Math.sin(POUCH_LEAN.y) + z1 * Math.cos(POUCH_LEAN.y)
  const x3 = x2 * Math.cos(pose.roll) + y1 * Math.sin(pose.roll)
  const y3 = -x2 * Math.sin(pose.roll) + y1 * Math.cos(pose.roll)
  const d = Math.hypot(x3, z2) / pose.width
  const ly = y3 / pose.height
  const reach = SEED_RADIUS + POUCH_CLEAR
  let floor = ringFloor(d, POUCH_STRING.radius, POUCH_STRING.y, reach + POUCH_STRING.tube)
  // The profile's folds and ruffle stand off its rings by up to this much.
  for (let i = 0; i < POUCH_PROFILE.length; i++) {
    const r = POUCH_PROFILE[i][0]
    const h = POUCH_PROFILE[i][1]
    floor = Math.max(floor, ringFloor(d, r, h, reach + (h > POUCH_RUFFLE_Y ? 0.45 : r * 0.05)))
  }
  if (d < POUCH_INSIDE.radius) floor = Math.max(floor, POUCH_INSIDE.y + POUCH_INSIDE.depth * Math.sqrt(1 - (d / POUCH_INSIDE.radius) ** 2) + reach)
  return floor > ly ? y + (floor - ly) * pose.height : y
}

/** The lowest a ball's centre `d` from the axis can be and stay `reach` from a ring of radius `r` at height `h`. */
function ringFloor(d: number, r: number, h: number, reach: number): number {
  const gap = Math.abs(d - r)
  return gap < reach ? h + Math.sqrt(reach * reach - gap * gap) : -Infinity
}

export const SNAIL_PATH = { left: 14, right: 72, z: 27 }
/** Right of the meadow, level with the molehills, so the mouse's outings happen where the child looks. */
export const BURROW: Point = { x: 66, z: -6 }
/**
 * The burrow is a real hole: the hill is cut away nearer than `open` to its middle, and the grass left round the
 * cut is drawn in to `rim`, under a soil ring (a torus of radius `ring`, tube `tube`, squashed to `squash` and
 * raised `lift` off the grass) that hides the cut's edge. A dark shaft of radius `shaft` runs `depth` down from
 * there, ending above the paper floor under the hill. The mouse, ears and all, fits down the shaft.
 */
export const BURROW_HOLE = { open: 4.5, rim: 5.8, shaft: 4, depth: 20, ring: 5.25, tube: 1.15, squash: 0.8, lift: 0.45 }
/** How far from the burrow's middle the mouse stands to dive in, and lands when it comes out. */
export const BURROW_STAND = 11
/** Where the mouse darts about: right of the molehills and clear of them, so it never crowds the one the meadow is pointing at. */
export const MOUSE_AREA = { left: 52, right: 76, far: -30, near: 10 }
/** Felt bushes on the crest, [x, z, size]: each is four balls about `size` across. */
export const BUSHES: readonly (readonly [number, number, number])[] = [
  [-84, -58, 7],
  [-66, -62, 5.5],
  [70, -60, 6.5],
  [86, -54, 5],
]
/** Two felt stones on the slope's corners, [x, z, radius]. */
export const STONES: readonly (readonly [number, number, number])[] = [
  [-86, 34, 3.2],
  [80, 32, 2.6],
]
/** Grass tussocks keep this far outside the mouse's run, so it never scurries or spins through one. */
export const TUFT_MOUSE_BERTH = 6

export type Tuft = { x: number; z: number; turn: number; size: number; height: number; shade: number }
/** How many grass tussocks the hill has room for. */
export const TUFTS = 90

/** Can a grass tussock stand at (x, z)? Not on a molehill, the pouch, the mouse's run, the snail's path, a bush, or a stone. */
export function tuftFits(x: number, z: number): boolean {
  if (plotAt(x, z, 5) >= 0) return false
  if (Math.hypot(x - POUCH.x, z - POUCH.z) < POUCH_RADIUS + 4) return false
  const m = TUFT_MOUSE_BERTH
  if (x > MOUSE_AREA.left - m && x < MOUSE_AREA.right + m && z > MOUSE_AREA.far - m && z < MOUSE_AREA.near + m) return false
  if (x > SNAIL_PATH.left - 8 && x < SNAIL_PATH.right + 8 && Math.abs(z - SNAIL_PATH.z) < 5) return false
  for (const [bx, bz, size] of BUSHES) if (Math.hypot(x - bx, z - bz) < size * 1.3 + 1.5) return false
  for (const [sx, sz, s] of STONES) if (Math.hypot(x - sx, z - sz) < s * 1.5 + 1.5) return false
  return true
}

/** Up to `count` grass tussocks over the hill, the same every time: thinner on the open grass than round its edges. */
export function tuftSpots(count: number): Tuft[] {
  let seed = 91
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const tufts: Tuft[] = []
  for (let tries = 0; tries < 900 && tufts.length < count; tries++) {
    const x = -92 + random() * 184
    const z = -66 + random() * 106
    if (!tuftFits(x, z)) continue
    if (onGrass(x, z) && random() < 0.55) continue
    const turn = random() * Math.PI * 2
    const size = 0.95 + random() * 0.5
    const height = size * (0.75 + random() * 0.4)
    tufts.push({ x, z, turn, size, height, shade: random() * 0.7 })
  }
  return tufts
}
/** Where the child sits, under the camera, for characters that turn to look at her. */
export const CHILD: Point = { x: 0, z: 210 }

/** Height of the felt hill at (x, z): a slope that rises to a rounded crest, with soft swells. */
export function groundY(x: number, z: number): number {
  const rise = HILL.crestY * smoothstep(HILL.near - 6, HILL.crestZ, z)
  const beyond = z < HILL.crestZ ? (HILL.crestZ - z) * (HILL.crestZ - z) * 0.018 : 0
  const swell = 3.2 * Math.exp(-((x + 8) * (x + 8)) / 2400 - ((z + 30) * (z + 30)) / 700)
  const ripple = 0.7 * Math.sin(x * 0.061 + 1.3) * Math.sin(z * 0.083 + 0.4)
  return rise - beyond + swell + ripple
}

/**
 * How a critter at (x, z) heading `yaw` leans to stand flat on the hill: `pitch` about its own x axis (nose
 * down positive, as three.js turns it) and `roll` about its own z axis, written into `out`.
 */
export function groundTilt(x: number, z: number, yaw: number, out: { pitch: number; roll: number }): { pitch: number; roll: number } {
  const e = 0.5
  const dx = (groundY(x + e, z) - groundY(x - e, z)) / (2 * e)
  const dz = (groundY(x, z + e) - groundY(x, z - e)) / (2 * e)
  const ahead = dx * Math.sin(yaw) + dz * Math.cos(yaw)
  const right = dx * Math.cos(yaw) - dz * Math.sin(yaw)
  out.pitch = -Math.atan(ahead)
  out.roll = Math.atan(right * Math.cos(out.pitch))
  return out
}

/** Top of a molehill's dimple, where a seed goes in and a stem comes out. */
export function plotTop(plot: number): number {
  const p = PLOTS[plot]
  return groundY(p.x, p.z) + MOLEHILL_HEIGHT * 0.86
}

export function clampToGrass(x: number, z: number, out: Point): Point {
  out.x = Math.min(GRASS.right, Math.max(GRASS.left, x))
  out.z = Math.min(GRASS.near, Math.max(GRASS.far, z))
  return out
}

export function onGrass(x: number, z: number): boolean {
  return x >= GRASS.left && x <= GRASS.right && z >= GRASS.far && z <= GRASS.near
}

export function plotAt(x: number, z: number, slop = 0): number {
  for (let i = 0; i < PLOTS.length; i++) {
    const p = PLOTS[i]
    if (Math.hypot(x - p.x, z - p.z) <= PLOT_RADIUS + slop) return i
  }
  return -1
}

export function onPouch(x: number, z: number): boolean {
  return Math.hypot(x - POUCH.x, z - POUCH.z) <= POUCH_RADIUS
}

/** Somewhere a seed can rest that is not a molehill, the pouch, or the burrow's hole and soil ring, as close to (x, z) as possible. */
export function restingSpot(x: number, z: number, taken: readonly Point[], out: Point): Point {
  clampToGrass(x, z, out)
  const startX = out.x
  const startZ = out.z
  const burrowBerth = BURROW_HOLE.ring + BURROW_HOLE.tube + SEED_RADIUS + 0.5
  for (let ring = 0; ring < 40; ring++) {
    const radius = ring * 2.4
    const steps = ring === 0 ? 1 : 6 + ring * 2
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2 + ring * 0.7
      const cx = startX + Math.cos(a) * radius
      const cz = startZ + Math.sin(a) * radius * 0.8
      if (!onGrass(cx, cz) || plotAt(cx, cz, SEED_RADIUS + 1.5) >= 0 || Math.hypot(cx - POUCH.x, cz - POUCH.z) < POUCH_RADIUS + SEED_RADIUS + 1) continue
      if (Math.hypot(cx - BURROW.x, cz - BURROW.z) < burrowBerth) continue
      let free = true
      for (const other of taken) {
        if (Math.hypot(other.x - cx, other.z - cz) < SEED_RADIUS * 2.1) {
          free = false
          break
        }
      }
      if (free) {
        out.x = cx
        out.z = cz
        return out
      }
    }
  }
  return out
}
