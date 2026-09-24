import { inBowl, plateOf } from './feeding'
import { FEEDING, SCALE, type MatKey, type Point } from './layout'
import { panOf } from './scale'

// What pieces rest on besides the bare table: the rug, the plates on it, the
// bowl's floor, and the pans' floors. Heights are centimetres above the table
// top (the physics' units). The models draw these surfaces from the same
// numbers and the physics holds stones on them, so a resting stone sits on
// what is drawn instead of sinking into it.

/** The Fair Feeding rug: a thin cloth ellipse (world units in the plane, cm up). */
export const RUG = { center: { x: 780, y: 470 } as Point, rx: 420, rz: 300, bottom: 0.04, top: 0.12 } as const

/** The rug's hem: a clay rope pressed flat into the cloth's edge, low enough to stand and rest on; its lumps push it out by up to `lump` (cm, before it is flattened). */
export const RUG_HEM = { tube: 0.42, flatten: 0.3, lump: 0.06 } as const
export const RUG_HEM_Y = RUG_HEM.tube * RUG_HEM.flatten
/** The top of the hem's highest lump, and how far its lumps reach either side of the line it follows (cm). */
export const RUG_HEM_TOP = RUG_HEM_Y + (RUG_HEM.tube + RUG_HEM.lump) * RUG_HEM.flatten
export const RUG_HEM_REACH = RUG_HEM.tube + RUG_HEM.lump
/** How many points the hem's line is drawn through. */
export const HEM_POINTS = 160

const HEM_SCALLOP = 0.02

/** The line the hem follows, `t` of the way round: the rug's ellipse, gently scalloped (world units). */
export function hemAt(t: number): Point {
  const a = t * Math.PI * 2
  const scallop = 1 + Math.abs(Math.sin(a * 14)) * HEM_SCALLOP
  return { x: RUG.center.x + Math.cos(a) * RUG.rx * scallop, y: RUG.center.y + Math.sin(a) * RUG.rz * scallop }
}

const HEM_LINE: readonly Point[] = Array.from({ length: HEM_POINTS + 1 }, (_, i) => hemAt(i / HEM_POINTS))

/** How far `at` is from the hem's line, in world units. */
function hemDistance(at: Point): number {
  let near = Infinity
  for (let i = 1; i < HEM_LINE.length; i++) {
    const a = HEM_LINE[i - 1]
    const [dx, dy] = [HEM_LINE[i].x - a.x, HEM_LINE[i].y - a.y]
    const k = Math.min(1, Math.max(0, ((at.x - a.x) * dx + (at.y - a.y) * dy) / (dx * dx + dy * dy)))
    near = Math.min(near, Math.hypot(at.x - a.x - k * dx, at.y - a.y - k * dy))
  }
  return near
}

/**
 * A cheap lower bound on `hemDistance`: the hem lies between the rug's ellipse
 * and the same ellipse scalloped out, and two such ellipses are nowhere closer
 * than across their short axis.
 */
function hemDistanceAtLeast(at: Point): number {
  const out = Math.hypot((at.x - RUG.center.x) / RUG.rx, (at.y - RUG.center.y) / RUG.rz)
  return Math.max(0, out - 1 - HEM_SCALLOP, 1 - out) * Math.min(RUG.rx, RUG.rz)
}

/** The highest the feeding mat stands anywhere within `reach` cm of `at`: the hem's top, the rug's, or the bare table. */
export function feedingFloor(at: Point, reach: number): number {
  if (hemDistance(at) * 0.1 < reach + RUG_HEM_REACH) return RUG_HEM_TOP
  return onRug(at) ? RUG.top : 0
}

/** Where the plates and the bowl stand: a hair above the rug's top, so their flat bases never share its plane (which flickers). */
export const ON_RUG = RUG.top + 0.05

export function onRug(p: Point): boolean {
  const dx = (p.x - RUG.center.x) / RUG.rx
  const dy = (p.y - RUG.center.y) / RUG.rz
  return dx * dx + dy * dy <= 1
}

/** Plate profile (unit radius) and how tall it is drawn: the flat top is where stones rest. */
export const PLATE_PROFILE: readonly [number, number][] = [
  [0, 0],
  [0.95, 0],
  [1, 0.05],
  [0.98, 0.09],
  [0.74, 0.04],
  [0, 0.04],
]
export const PLATE_HEIGHT = 3.5
export const PLATE_TOP = ON_RUG + 0.04 * PLATE_HEIGHT
/** How lumpy the plate is modelled; its flat top is held level, and its lumps push its edge out by up to half this (of its radius). */
export const PLATE_LUMP = 0.08

/** Bowl profile (unit radius at the inner rim, drawn at the bowl's radius): a flat floor, a flared inner wall, a rolled lip. */
export const BOWL_PROFILE: readonly [number, number][] = [
  [0, 0.0],
  [0.62, 0.0],
  [0.82, 0.05],
  [0.98, 0.2],
  [1.1, 0.4],
  [1.17, 0.47],
  [1.13, 0.52],
  [1.05, 0.5],
  [0.99, 0.42],
  [0.88, 0.22],
  [0.72, 0.06],
  [0, 0.06],
]
export const BOWL_SCALE = FEEDING.bowl.r * 0.1
/** How lumpy the bowl is modelled; its lumps push its outside out by up to half this (of its scale). */
export const BOWL_LUMP = 0.22
/** The bowl stands on the rug; its floor is this far above the table. */
export const BOWL_FLOOR = ON_RUG + 0.06 * BOWL_SCALE
/** The inner wall as (radius, height above the bowl's base) in cm: from the floor, up to the lip, over the lip's crown. */
export const BOWL_WALL: readonly (readonly [number, number])[] = [
  [0.72 * BOWL_SCALE, 0.06 * BOWL_SCALE],
  [0.99 * BOWL_SCALE, 0.42 * BOWL_SCALE],
  [1.13 * BOWL_SCALE, 0.52 * BOWL_SCALE],
]
/** How thick the bowl's wall is drawn, measured square to it. */
export const BOWL_WALL_THICKNESS = 1

/** The bowl's flared outside as (radius, height above its base) in cm, from its foot up to its widest. */
export const BOWL_OUTSIDE: readonly (readonly [number, number])[] = BOWL_PROFILE.slice(1, 6).map(([r, h]) => [r * BOWL_SCALE, h * BOWL_SCALE])

/** The radius of a (radius, height) outline rising up its points, at `height`; level with its ends below and above them. */
export function radiusAt(line: readonly (readonly [number, number])[], height: number): number {
  for (let i = 1; i < line.length; i++) {
    const [r0, h0] = line[i - 1]
    const [r1, h1] = line[i]
    if (height <= h1) return r0 + ((Math.max(height, h0) - h0) / (h1 - h0)) * (r1 - r0)
  }
  return line[line.length - 1][0]
}

/** Scale pan profile (unit radius) and its drawn depth: a flat floor with a steep inner rim. */
export const DISH_PROFILE: readonly [number, number][] = [
  [0, -0.05],
  [0.85, -0.04],
  [1.02, 0.08],
  [1.06, 0.13],
  [1.0, 0.13],
  [0.975, 0.05],
  [0.96, 0.03],
  [0, 0.03],
]
export const PAN_DEPTH = 13
/** A pan's floor above its hanging point. */
export const PAN_FLOOR = 0.03 * PAN_DEPTH
/** The rolled clay rim laid on a pan's edge: a ring (radius and tube as fractions of the pan's radius) at `y` cm above the hanging point. */
export const PAN_ROLL = { radius: 1.03, tube: 0.08, y: 1.6 } as const
/** Where pieces in a pan stop against its rim, as a fraction of its radius: inside the rolled rim's inner edge. */
export const PAN_RIM = PAN_ROLL.radius * (1 - PAN_ROLL.tube) - 0.01

export type Surfaces = { mat: MatKey; seats: readonly boolean[]; panFloors: readonly [number, number] }

/** The height of what a piece lying at `at` rests on: a pan's floor, the bowl's floor, a seated plate, the rug, or the table. */
export function surfaceUnder(at: Point, { mat, seats, panFloors }: Surfaces): number {
  if (mat === 'scale') {
    const side = panOf(at)
    return side === null ? 0 : panFloors[side]
  }
  if (mat !== 'feeding') return 0
  if (inBowl(at)) return BOWL_FLOOR
  const plate = plateOf(at)
  if (plate !== null && seats[plate]) return PLATE_TOP
  return onRug(at) ? RUG.top : 0
}

/** Contact shadows and glow rings lie this far above what they are cast on; their material's polygon offset keeps them in front of it. */
export const DECAL_LIFT = 0.02

const PLATE_FLAT = PLATE_PROFILE[4][0]
const PLATE_REACH = Math.max(...PLATE_PROFILE.map(([r]) => r)) + PLATE_LUMP / 2
const BOWL_REACH = (Math.max(...BOWL_PROFILE.map(([r]) => r)) + BOWL_LUMP / 2) * BOWL_SCALE
const PAN_FLAT = DISH_PROFILE[6][0]

/**
 * How far (cm) a flat decal lying `DECAL_LIFT` above `ground`, centred at
 * `at`, may reach before it meets something drawn higher: the rim of the pan,
 * bowl or plate it lies in (told by `ground`, since a shadow's centre can
 * slide past the rim of what it lies in), the rug's hem, or the side of a
 * plate or the bowl it lies above the foot of. Never more than `most`; below zero when
 * the centre is already past a rim.
 */
export function decalReach(at: Point, ground: number, { mat, seats, panFloors }: Surfaces, most: number): number {
  const level = ground + DECAL_LIFT
  const cm = (to: Point) => Math.hypot(at.x - to.x, at.y - to.y) * 0.1
  if (mat === 'scale') {
    const pan = SCALE.pans.reduce((near, p) => (cm(p) < cm(near) ? p : near))
    const side = SCALE.pans.indexOf(pan)
    return ground > panFloors[side] - 0.01 ? Math.min(most, PAN_FLAT * pan.r * 0.1 - cm(pan)) : most
  }
  if (mat !== 'feeding') return most
  if (ground === BOWL_FLOOR) return Math.min(most, BOWL_WALL[0][0] - cm(FEEDING.bowl))
  const plateR = FEEDING.plateRadius * 0.1
  let reach = most
  if (level < RUG_HEM_TOP && hemDistanceAtLeast(at) * 0.1 - RUG_HEM_REACH < reach) reach = Math.min(reach, hemDistance(at) * 0.1 - RUG_HEM_REACH)
  if (ground === PLATE_TOP) {
    const off = Math.min(...FEEDING.seats.filter((_, index) => seats[index]).map((seat) => cm(seat.plate)))
    return Math.min(reach, PLATE_FLAT * plateR - off)
  }
  if (level <= ON_RUG) return reach
  reach = Math.min(reach, cm(FEEDING.bowl) - BOWL_REACH)
  FEEDING.seats.forEach((seat, index) => {
    if (seats[index]) reach = Math.min(reach, cm(seat.plate) - PLATE_REACH * plateR)
  })
  return reach
}
