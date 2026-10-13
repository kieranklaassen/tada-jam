import { type Camera, EYE, HORIZON_Z, groundAt, horizonY, project, ray } from './camera'
import { type Field, Z0, base, heightAt, inField, isUnderSea } from './field'

// Where everything on the beach stands, in world units, and what a point of
// the surface is a touch on. The open sand in the middle is the child's; the
// folk and their rocks stand round its edges, and the sky holds the sun.

export type FolkKind = 'crab' | 'starfish' | 'eel' | 'gull'

/** The crab's day place: the middle of the small ring it walks, and the ring's size. */
export const CRAB_HOME = { x: -3.9, z: 5.7 } as const
export const CRAB_RING = 0.42
/** How far from its home the crab will run from a digging finger. */
export const CRAB_ROAM = 1.3

/** The starfish's rock: where it stands, how big it is, and the height of its flat top. */
export const STAR_ROCK = { x: 4.9, z: 6.3, radius: 1.3, top: base(6.3) + 0.5 } as const
/** Where the starfish stands on it. */
export const STAR_HOME = { x: STAR_ROCK.x, y: STAR_ROCK.top, z: STAR_ROCK.z + 0.15 } as const

/**
 * The eel's rock, and the two ways out of it. The first is the one dark hole in its face. The second is round
 * its right side, at the foot, where the eel slides out from behind the rock: no second hole shows, so the
 * rock never has two dark rounds side by side. The side way is behind the small rock at its right foot, and
 * far enough up the beach from it that the eel's head goes by the back of that rock and not through it: it
 * comes out from behind a rock and through none but its own.
 */
export const EEL_ROCK = { x: -6.5, z: 1.0, radius: 1.9, top: base(1.0) + 2.0 } as const
export const EEL_EXIT = { x: -3.5, z: -0.05 } as const
export const EEL_HOLES = [
  { x: -6.9, y: base(1.0) + 0.85, z: 2.2, turn: 0 },
  { x: EEL_EXIT.x - 0.1, y: base(EEL_EXIT.z) + 0.34, z: EEL_EXIT.z, turn: Math.PI / 2 },
] as const

/**
 * Every rock that is drawn, as a rounded lump: its middle and how far it reaches each way. The picture is built
 * from this list and so is everything that rests on a rock or knocks on one. `of` says whose rock it is.
 */
export type Lump = { x: number; y: number; z: number; rx: number; ry: number; rz: number; of: 'star' | 'eel' | 'sea' | 'pebble'; big: boolean }
/** Rocks out in the shallows, for the sea to break on: x, z, radius. */
export const SEA_ROCKS = [
  { x: -9.5, z: -5.2, radius: 0.9 },
  { x: 2.6, z: -6.4, radius: 0.7 },
  { x: 11.5, z: -4.8, radius: 1.1 },
] as const
/** Pebbles at the feet of the rocks: x, z, radius. */
export const PEBBLES = [[3.15, 6.85, 0.16], [6.6, 7.1, 0.13], [-5.0, 2.4, 0.15], [-9.3, 2.6, 0.18], [4.0, 1.9, 0.12], [8.7, 2.2, 0.15]] as const
function lump(of: Lump['of'], big: boolean, radius: number, x: number, y: number, z: number, sx: number, sy: number, sz: number): Lump {
  return { x, y, z, rx: radius * sx, ry: radius * sy, rz: radius * sz, of, big }
}
export const LUMPS: readonly Lump[] = [
  // The starfish's rock: low and broad, with a flat seat, and a small rock at either foot.
  lump('star', true, STAR_ROCK.radius, STAR_ROCK.x, STAR_ROCK.top - 0.62, STAR_ROCK.z, 1.05, 0.5, 0.8),
  lump('star', false, STAR_ROCK.radius * 0.55, STAR_ROCK.x - 1.25, STAR_ROCK.top - 0.72, STAR_ROCK.z + 0.3, 1, 0.6, 0.9),
  lump('star', false, STAR_ROCK.radius * 0.42, STAR_ROCK.x + 1.3, STAR_ROCK.top - 0.66, STAR_ROCK.z + 0.25, 1, 0.7, 1),
  // The eel's rock: tall, and a small rock at either foot.
  lump('eel', true, EEL_ROCK.radius, EEL_ROCK.x, EEL_ROCK.top - 1.25, EEL_ROCK.z, 1.08, 0.68, 0.7),
  lump('eel', false, EEL_ROCK.radius * 0.5, EEL_ROCK.x - 2.15, EEL_ROCK.top - 1.7, EEL_ROCK.z + 0.5, 1, 0.75, 1),
  lump('eel', false, EEL_ROCK.radius * 0.45, EEL_ROCK.x + 1.95, EEL_ROCK.top - 1.75, EEL_ROCK.z + 0.4, 1, 0.7, 1),
  ...SEA_ROCKS.map((rock) => lump('sea', false, rock.radius, rock.x, 0.05, rock.z, 1.2, 0.7, 1)),
  ...PEBBLES.map(([x, z, r]) => lump('pebble', false, r, x, base(z) + r * 0.3, z, 1.2, 0.6, 1)),
]

/** How high the top of the rocks stands over a point, or -Infinity where no rock is under it. */
export function rockTop(x: number, z: number): number {
  let top = -Infinity
  for (const rock of LUMPS) {
    const dx = (x - rock.x) / rock.rx, dz = (z - rock.z) / rock.rz, inside = 1 - dx * dx - dz * dz
    if (inside > 0) top = Math.max(top, rock.y + rock.ry * Math.sqrt(inside))
  }
  return top
}

/** The gulls' log: its two ends and how high its top is. */
export const LOG = { x0: 3.3, x1: 6.9, z: 1.2, top: base(1.2) + 0.78, radius: 0.26 } as const
/**
 * The broken stub of a branch near the log's far end: a short rod, its middle, how thick and how long it is, and
 * how far it is tipped over toward the child. It leaves the log's front below its top, where no gull's wing
 * comes: a bird that lands at that end, squashed down and leaning, has nothing under its wing but air.
 */
export const LOG_STUB = { x: LOG.x1 - 0.2, y: LOG.top - 0.2, z: LOG.z + 0.26, radius: 0.09, length: 0.5, tip: 1.15 } as const
/** Where the three stand along it, 0 to 1: no two gaps alike, so the row reads as birds and never as a count. */
export const GULL_PERCHES = [0.15, 0.46, 0.86] as const
/** How big each gull is beside the others: no two the same, so the row reads as three birds and never as a count. */
export const GULL_SIZES = [1.0, 0.86, 1.1] as const

/** The sun by day, on the sky that stands at the horizon: world x and height. */
export const SUN = { x: -8.2, y: 2.3, radius: 1.7, downY: 0.2 } as const
/**
 * Clouds on that sky: where each is on a visit's first frame, its height, half width and half height, and how
 * it drifts by itself: slowly to and fro, `sway` to either side, there and back in `every` seconds. No two alike.
 */
export const CLOUDS = [
  { x: -13.2, y: 3.6, w: 2.4, h: 0.42, sway: 1.4, every: 80 },
  { x: 6.0, y: 3.3, w: 3.2, h: 0.5, sway: -1.7, every: 110 },
  { x: 10.6, y: 2.3, w: 2.0, h: 0.38, sway: 0.8, every: 65 },
] as const

/** Half the length of a piece of driftwood, for a touch. */
const WOOD_REACH = 1.2

/** The jam's home control: a round button at the top centre, with room round it. */
export const HOME_CONTROL = { size: 48, top: 10, room: 12 } as const
/** The grown-up's corner at the top right. */
export const CORNER = 72

/** How big each of the folk is to a finger, in world units, round its middle. */
export const FOLK_REACH: Record<FolkKind, number> = { crab: 1.15, starfish: 0.95, eel: 0.75, gull: 0.62 }

export type Target =
  | { kind: 'sand'; x: number; z: number }
  | { kind: 'water'; x: number; z: number }
  | { kind: 'folk'; who: FolkKind; index: number }
  | { kind: 'bucket' }
  | { kind: 'shell'; index: number }
  | { kind: 'wood'; index: number }
  | { kind: 'sun' }
  | { kind: 'rock'; x: number; y: number; z: number }
  /** The gulls' log, which is fixed and is not one of the two pieces. */
  | { kind: 'log'; x: number; y: number; z: number }
  | { kind: 'cloud'; index: number }
  /** The open sky, at a world x on the sky that stands at the horizon. */
  | { kind: 'sky'; x: number }

/** Where each of the folk is now, for a touch to find: its middle in the world. */
export type FolkSpots = {
  crab: { x: number; y: number; z: number }
  /** `flat` is how far it lies spread out flat, 0 to 1: lying flat it is drawn far wider than it is tall. */
  starfish: { x: number; y: number; z: number; flat?: number }
  eel: { x: number; y: number; z: number; out: boolean }
  gulls: readonly { x: number; y: number; z: number }[]
}

/** Where each thing a finger picks up is drawn now: the touch is taken from the drawn shape. */
export type Drawn = {
  bucket: { x: number; y: number; z: number }
  /** A shell in the bucket or on the crab's head is not there to be touched. */
  shells: readonly { x: number; y: number; z: number; shown: boolean }[]
  wood: readonly { x: number; y: number; z: number; turn: number }[]
  /** The sun on the sky that stands at the horizon. */
  sun: { x: number; y: number }
}

/** How big each thing is as it is drawn, in world units round its middle. */
export const THING_REACH = { bucket: 0.68, shell: 0.6, wood: 0.3 } as const
/** A thing a finger must find answers within this of its middle at least, in pixels. */
export const THING_TOUCH = 50

/** How far a point of the surface is from a thing, as a share of the thing's size: under 1 is on its drawn shape. */
type Hit = { target: Target; on: number; near: number }

function hit(camera: Camera, sx: number, sy: number, x: number, y: number, z: number, reach: number, least: number, target: Target, flat = 0): Hit {
  const at = project(camera, x, y, z)
  const drawn = Math.max(1, project(camera, x + reach, y, z).x - at.x)
  // A thing that lies flat on the sand is drawn as wide as it is and only as tall as the beach shows it from the
  // side: its reach up the beach, and a hand of thickness. What lies beyond it up the beach is not under it.
  const lying = Math.abs(project(camera, x, y, z + reach).y - at.y) + Math.abs(project(camera, x, y + 0.25, z).y - at.y)
  const tall = Math.max(1, drawn + (Math.min(drawn, lying) - drawn) * flat)
  const dx = sx - at.x, dy = sy - at.y
  return { target, on: Math.hypot(dx / drawn, dy / tall), near: Math.hypot(dx / Math.max(least, drawn), dy / Math.max(least, tall)) }
}

function within(camera: Camera, sx: number, sy: number, x: number, y: number, z: number, reach: number): boolean {
  const at = project(camera, x, y, z)
  const edge = project(camera, x + reach, y, z)
  // A finger is given a little more than the thing itself, and never less than 30 pixels.
  const radius = Math.max(30, edge.x - at.x)
  return Math.hypot(sx - at.x, sy - at.y) <= radius
}

/** The sun's place on the sky for how far down it is, 0 up to 1 down. */
export function sunAt(t: number): { x: number; y: number } {
  return { x: SUN.x, y: SUN.y + (SUN.downY - SUN.y) * t }
}

/** How far down its path a finger has moved the sun, for a move on the surface of `dy` pixels. */
export function sunShift(camera: Camera, dy: number): number {
  const up = project(camera, SUN.x, SUN.y, HORIZON_Z), down = project(camera, SUN.x, SUN.downY, HORIZON_Z)
  return dy / Math.max(1, down.y - up.y)
}

/**
 * The rocks a finger can knock on: each a ball round its middle, with the height a grain falls from. Every rock
 * that is drawn is one: the two big ones, the small ones at their feet and the three out in the shallows.
 */
const ROCKS = [
  { x: STAR_ROCK.x, y: STAR_ROCK.top - 0.35, z: STAR_ROCK.z, reach: STAR_ROCK.radius, top: STAR_ROCK.top, log: false },
  { x: EEL_ROCK.x, y: EEL_ROCK.top - 1.0, z: EEL_ROCK.z, reach: EEL_ROCK.radius, top: EEL_ROCK.top, log: false },
  { x: (LOG.x0 + LOG.x1) / 2 - 1, y: LOG.top - 0.3, z: LOG.z, reach: 0.8, top: LOG.top, log: true },
  { x: (LOG.x0 + LOG.x1) / 2 + 1, y: LOG.top - 0.3, z: LOG.z, reach: 0.8, top: LOG.top, log: true },
  ...LUMPS.filter((rock) => !rock.big && rock.of !== 'pebble').map((rock) => ({ x: rock.x, y: rock.y + rock.ry * 0.5, z: rock.z, reach: Math.min(rock.rx, rock.ry + rock.ry * 0.5), top: rock.y + rock.ry, log: false })),
]

/**
 * What a point of the surface is a touch on. The folk and the things a finger
 * picks up come first, and among them the one whose drawn shape the finger is
 * on wins, so a finger on a shell beside the crab is never a poke; where it is
 * on none, the nearest within reach. Then the rocks, then the ground: sand
 * where the sand shows, water where the sea stands over it or beyond its
 * edge. Above the horizon it is the sky.
 */
export function targetAt(camera: Camera, sx: number, sy: number, field: Field, spots: FolkSpots, sea: number, drawn: Drawn, clouds: readonly number[] = CLOUDS.map((cloud) => cloud.x)): Target {
  const hits: Hit[] = []
  hits.push(hit(camera, sx, sy, spots.crab.x, spots.crab.y, spots.crab.z, FOLK_REACH.crab, 30, { kind: 'folk', who: 'crab', index: 0 }))
  hits.push(hit(camera, sx, sy, spots.starfish.x, spots.starfish.y, spots.starfish.z, FOLK_REACH.starfish, 30, { kind: 'folk', who: 'starfish', index: 0 }, spots.starfish.flat ?? 0))
  spots.gulls.forEach((gull, index) => hits.push(hit(camera, sx, sy, gull.x, gull.y, gull.z, FOLK_REACH.gull, 30, { kind: 'folk', who: 'gull', index })))
  if (spots.eel.out) hits.push(hit(camera, sx, sy, spots.eel.x, spots.eel.y, spots.eel.z, FOLK_REACH.eel, 30, { kind: 'folk', who: 'eel', index: 0 }))
  hits.push(hit(camera, sx, sy, drawn.bucket.x, drawn.bucket.y, drawn.bucket.z, THING_REACH.bucket, THING_TOUCH, { kind: 'bucket' }))
  drawn.shells.forEach((shell, index) => {
    if (shell.shown) hits.push(hit(camera, sx, sy, shell.x, shell.y, shell.z, THING_REACH.shell, THING_TOUCH, { kind: 'shell', index }))
  })
  drawn.wood.forEach((wood, index) => {
    // A long thing: the nearest point of its middle line to the finger, on the surface.
    const ax = Math.cos(wood.turn) * WOOD_REACH, az = Math.sin(wood.turn) * WOOD_REACH
    const a = project(camera, wood.x - ax, wood.y, wood.z - az), b = project(camera, wood.x + ax, wood.y, wood.z + az)
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const t = Math.min(1, Math.max(0, ((sx - a.x) * (b.x - a.x) + (sy - a.y) * (b.y - a.y)) / (length * length)))
    hits.push(hit(camera, sx, sy, wood.x - ax + 2 * ax * t, wood.y, wood.z - az + 2 * az * t, THING_REACH.wood, THING_TOUCH, { kind: 'wood', index }))
  })
  const sun = project(camera, drawn.sun.x, drawn.sun.y, HORIZON_Z)
  const sunDrawn = Math.max(1, project(camera, drawn.sun.x + SUN.radius, drawn.sun.y, HORIZON_Z).x - sun.x), sunGap = Math.hypot(sx - sun.x, sy - sun.y)
  hits.push({ target: { kind: 'sun' }, on: sunGap / sunDrawn, near: sunGap / Math.max(THING_TOUCH, sunDrawn) })
  let best: Hit | null = null
  for (const one of hits) if (one.on <= 1 && (!best || one.on < best.on)) best = one
  if (!best) for (const one of hits) if (one.near <= 1 && (!best || one.near < best.near)) best = one
  if (best) return best.target
  for (const rock of ROCKS) if (within(camera, sx, sy, rock.x, rock.y, rock.z, rock.reach)) return { kind: rock.log ? 'log' : 'rock', x: rock.x, y: rock.top, z: rock.z }
  if (sy <= horizonY(camera)) {
    for (let i = 0; i < CLOUDS.length; i++) {
      // Where it is drawn now: a pushed cloud is touched where it has slid to.
      const touch = cloudTouch(camera, CLOUDS[i], clouds[i])
      if (Math.abs(sx - touch.x) <= touch.across && Math.abs(sy - touch.y) <= touch.high) return { kind: 'cloud', index: i }
    }
    return { kind: 'sky', x: skyX(camera, sx, sy) }
  }
  const ground = groundPoint(camera, sx, sy, field, sea)
  if (!ground) return { kind: 'sky', x: skyX(camera, sx, sy) }
  if (ground.z < Z0 + 0.4 || !inField(ground.x, ground.z)) {
    // Beyond the grid: sea toward the horizon, and plain sand at the sides and below, which a finger shapes at the grid's edge.
    if (ground.z < Z0 + 0.4) return { kind: 'water', x: ground.x, z: ground.z }
    return { kind: 'sand', x: ground.x, z: ground.z }
  }
  if (isUnderSea(field, ground.x, ground.z, sea)) return { kind: 'water', x: ground.x, z: ground.z }
  return { kind: 'sand', x: ground.x, z: ground.z }
}

/** Where a point of the surface meets the beach or the sea standing on it, whatever stands in front. Null above the horizon. */
export function groundPoint(camera: Camera, sx: number, sy: number, field: Field, sea: number): { x: number; z: number } | null {
  if (sy <= horizonY(camera)) return null
  return groundAt(camera, sx, sy, (x, z) => Math.max(sea, inField(x, z) ? heightAt(field, x, z) : base(z)))
}

function skyX(camera: Camera, sx: number, sy: number): number {
  const dir = ray(camera, sx, sy)
  return EYE.x + dir.x * ((HORIZON_Z - EYE.z) / dir.z)
}

/** Half of the least a cloud is touched over, each way, in points of the surface: a small finger's width in all. */
export const CLOUD_TOUCH = 24

/**
 * Where a cloud that is `x` along the sky is touched on a surface: its middle, and how far to either side and up
 * and down from it. On a small surface that is more than the cloud as it is drawn, never less than a finger.
 */
export function cloudTouch(camera: Camera, cloud: { y: number; w: number; h: number }, x: number): { x: number; y: number; across: number; high: number } {
  const at = project(camera, x, cloud.y, HORIZON_Z), side = project(camera, x + cloud.w, cloud.y + cloud.h, HORIZON_Z)
  return { x: at.x, y: at.y, across: Math.max(CLOUD_TOUCH, side.x - at.x), high: Math.max(CLOUD_TOUCH, (at.y - side.y) * 1.6) }
}

/** How far to either side of the middle the sky shows on a surface, at the height of its highest cloud, where it shows the least. */
export function skyHalfWidth(camera: Camera): number {
  return camera.tanX * project(camera, 0, Math.max(...CLOUDS.map((cloud) => cloud.y)), HORIZON_Z).depth
}

/** The room a cloud keeps between its edge and the home control's box or the grown-up's corner, along the sky. */
export const CLOUD_ROOM = 0.15

/**
 * How far along the sky each cloud may be, by its middle, on a surface. Most of it stays inside the sky that
 * shows. A cloud drawn in the rows of the surface that hold the home control stays to its own side of the home
 * control's box, and one drawn in the rows of the grown-up's corner stays left of the corner: nothing a child
 * touches ever lies under either. A cloud that is pushed or drifts that far stops there and turns back.
 */
export function cloudRanges(camera: Camera): { from: number; to: number }[] {
  const half = skyHalfWidth(camera), box = homeControlBox(camera), middle = camera.width / 2
  return CLOUDS.map((cloud) => {
    const at = project(camera, 0, cloud.y, HORIZON_Z), side = project(camera, cloud.w, cloud.y + cloud.h, HORIZON_Z), touch = cloudTouch(camera, cloud, 0)
    // How many points of the surface one unit of the sky is at its height, the highest row it is touched in, and
    // how far along the sky it is touched to either side of its middle.
    const scale = (side.x - at.x) / cloud.w, top = touch.y - touch.high, reach = touch.across / scale + CLOUD_ROOM
    let from = -(half - cloud.w * 0.3), to = half - cloud.w * 0.3
    if (top <= CORNER) to = Math.min(to, (camera.width - CORNER - middle) / scale - reach)
    if (top <= box.bottom) {
      const left = { from, to: Math.min(to, (box.left - middle) / scale - reach) }, right = { from: Math.max(from, (box.right - middle) / scale + reach), to }
      // Its own side of the home control, where it has room there; where it has none, the other side.
      const own = cloud.x < 0 ? left : right, other = cloud.x < 0 ? right : left
      const side = own.to >= own.from ? own : other.to >= other.from ? other : cloud.x < 0 ? { from: left.to, to: left.to } : { from: right.from, to: right.from }
      from = side.from
      to = side.to
    }
    return { from: Math.min(from, to), to }
  })
}

/** How far up the beach the bottom edge of a surface shows, in world z. */
export function beachEnd(camera: Camera): number {
  return groundAt(camera, camera.width / 2, camera.height, (_, z) => base(z))?.z ?? Z0
}

/** The box on the surface that the home control takes, with the room kept round it. */
export function homeControlBox(camera: Camera): { left: number; right: number; top: number; bottom: number } {
  const half = HOME_CONTROL.size / 2 + HOME_CONTROL.room
  return { left: camera.width / 2 - half, right: camera.width / 2 + half, top: 0, bottom: HOME_CONTROL.top + HOME_CONTROL.size + HOME_CONTROL.room }
}
