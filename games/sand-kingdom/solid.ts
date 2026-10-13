import { GULL_SIZES } from './layout'
import type { Patch } from './things'

// How much room each of the folk and each thing takes up, so that nothing is
// drawn through anything. Two measures are kept here, both plain numbers:
//
//   rounds   the sand a body stands over, as a few round patches. Two bodies
//            whose rounds are apart cannot touch, whatever their height.
//   pillars  the same rounds with the height of the top of what stands there.
//            Whatever is carried or flies across is lifted over a pillar
//            before its own rounds reach the pillar's, and is all the way up
//            by the time they would touch.
//
// The shapes here follow the meshes in view/folkView.ts and
// view/thingsView.ts; solid.test.ts holds the two together.

export type Pillar = Patch & { top: number }

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value
}
function smooth(t: number): number {
  const c = clamp(t, 0, 1)
  return c * c * (3 - 2 * c)
}

/** The lift is whole while two rounds are still this far apart, and begins this much further out. */
export const LIFT_GAP = 0.08
export const LIFT_RAMP = 0.42

/** How far apart the nearest two rounds of two bodies are, edge to edge. Below zero they overlap. */
export function apart(own: readonly Patch[], other: readonly Patch[]): number {
  let least = Infinity
  for (const mine of own) for (const patch of other) least = Math.min(least, Math.hypot(mine.x - patch.x, mine.z - patch.z) - mine.r - patch.r)
  return least
}

/**
 * How high the underside of something must be at a place: on its own floor where nothing is near, and `under`
 * above the top of every pillar its rounds have come up to. Between the two it rises as it nears.
 */
export function over(own: readonly Patch[], floor: number, under: number, pillars: readonly Pillar[], whole: number = LIFT_GAP, ramp: number = LIFT_RAMP): number {
  let up = floor
  for (const pillar of pillars) {
    const need = pillar.top + under
    if (need <= up) continue
    let gap = Infinity
    for (const mine of own) gap = Math.min(gap, Math.hypot(mine.x - pillar.x, mine.z - pillar.z) - mine.r - pillar.r)
    if (gap >= whole + ramp) continue
    up = Math.max(up, floor + (need - floor) * smooth(1 - (gap - whole) / ramp))
  }
  return up
}

// --- The crab ------------------------------------------------------------------

/**
 * The crab on the sand: its shell with its eyes and mouth, and to either side its legs and its claw, however the
 * claw is held. `turn` is how far it is turned about the upright.
 */
export function crabRounds(crab: { x: number; z: number; turn: number }): Patch[] {
  const ax = Math.cos(crab.turn), az = -Math.sin(crab.turn), fx = Math.sin(crab.turn), fz = Math.cos(crab.turn)
  return [
    { x: crab.x + fx * 0.1, z: crab.z + fz * 0.1, r: 0.8 },
    { x: crab.x - ax + fx * 0.15, z: crab.z - az + fz * 0.15, r: 0.75 },
    { x: crab.x + ax + fx * 0.15, z: crab.z + az + fz * 0.15, r: 0.75 },
  ]
}
/** How the crab is turned as it goes sideways along a way: its side leads. */
export function crabTurn(dx: number, dz: number): number {
  let want = Math.atan2(-dz, dx)
  if (want > Math.PI / 2) want -= Math.PI
  if (want < -Math.PI / 2) want += Math.PI
  return want
}
/** Where the crab's six feet stand, in its own frame: across, and toward its front. */
export const CRAB_FEET: readonly (readonly [number, number])[] = [-1, 1].flatMap((side) => [-0.36, -0.1, 0.16].map((front) => [side * 1.4, front] as const))
/**
 * The underside of the crab, in its own frame: points across and toward its front, each with how high over its
 * feet the lowest of it is there. Its belly hangs just clear of the sand in the middle and its shell rises to
 * the sides; its legs arch out from the shell and come down to its feet; a claw held low all but touches.
 */
export const CRAB_UNDER: readonly (readonly [number, number, number])[] = (() => {
  const out: [number, number, number][] = CRAB_FEET.map(([across, front]) => [across, front, 0])
  for (let across = -1.45; across <= 1.4501; across += 0.29) for (let front = -0.6; front <= 0.8501; front += 0.29) {
    const wide = Math.abs(across), dx = across / 0.92, dz = front / 0.64, inside = 1 - dx * dx - dz * dz
    let low = Infinity
    if (inside > 0) low = 0.5 - 0.46 * Math.sqrt(inside)
    if (wide >= 0.8 && front >= -0.55 && front <= 0.32) low = Math.min(low, wide < 1.15 ? 0.2 : 0)
    if (wide >= 0.6 && front >= 0.2) low = Math.min(low, 0.1)
    if (low < Infinity) out.push([across, front, low])
  }
  return out
})()
/**
 * How high the crab's feet stand: on what is under them. `footing` gives the height of the sand, or of a bough
 * that lies on it, at a point. No foot, no part of its belly and no claw is lower than what is under it, however
 * it is turned and however far it leans: on level sand that is the sand, over a groove narrower than itself it
 * is the banks, and on the side of a tower it is the tower.
 */
export function crabFloor(crab: { x: number; z: number; turn: number; lean: number }, footing: (x: number, z: number) => number): number {
  const cos = Math.cos(crab.turn), sin = Math.sin(crab.turn), level = Math.cos(crab.lean), tip = Math.sin(crab.lean)
  let floor = -Infinity
  for (const [across, front, low] of CRAB_UNDER) {
    const flat = across * level
    floor = Math.max(floor, footing(crab.x + flat * cos + front * sin, crab.z - flat * sin + front * cos) - across * tip - low)
  }
  return floor
}
/** How far the sand under its feet tips it: the lean that sets the feet of either side on what is under them. */
export function crabTilt(crab: { x: number; z: number; turn: number }, footing: (x: number, z: number) => number): number {
  const cos = Math.cos(crab.turn), sin = Math.sin(crab.turn)
  const high = [-Infinity, -Infinity]
  for (const [across, front] of CRAB_FEET) {
    const side = across < 0 ? 0 : 1
    high[side] = Math.max(high[side], footing(crab.x + across * cos + front * sin, crab.z - across * sin + front * cos))
  }
  return clamp(Math.atan2(high[1] - high[0], 2.8), -0.5, 0.5)
}
/** How far down below the rest of it a leg stretches to set its foot on the sand. */
export const CRAB_REACH = 0.25
/**
 * How far the legs of either side stretch down to the sand: where its belly rides over a mound, or one side of
 * it over a rim, the feet beyond would hang in the air, and the legs reach down as far as the highest sand
 * under that side's feet, so no foot is under the sand and one at least is on it.
 */
export function legReach(crab: { x: number; z: number; turn: number; lean: number }, floor: number, ground: (x: number, z: number) => number): [number, number] {
  const cos = Math.cos(crab.turn), sin = Math.sin(crab.turn), level = Math.cos(crab.lean), tip = Math.sin(crab.lean)
  const gap = [Infinity, Infinity]
  for (const [across, front] of CRAB_FEET) {
    const side = across < 0 ? 0 : 1, flat = across * level
    gap[side] = Math.min(gap[side], floor + across * tip - ground(crab.x + flat * cos + front * sin, crab.z - flat * sin + front * cos))
  }
  return [clamp(gap[0], 0, CRAB_REACH), clamp(gap[1], 0, CRAB_REACH)]
}
/** How high the top of the crab stands above the sand: its eyes on their stalks, and its claws held high. */
export const CRAB_TOP = 1.95
/** The crab's shell, in its own frame: where its middle is and how far it reaches each way. */
export const CRAB_SHELL = { y: 0.5, rx: 0.92, ry: 0.46, rz: 0.64 } as const
/** Where the starfish stands on the crab's back, in the crab's own frame: behind the eye stalks. */
export const RIDE_AT = { x: 0, z: -0.52 } as const

/** How high the crab's shell stands over a point of its own frame, or -Infinity off the shell. `lift` is the crab's own. */
export function shellTop(x: number, z: number, lift: number): number {
  const dx = x / CRAB_SHELL.rx, dz = z / CRAB_SHELL.rz, inside = 1 - dx * dx - dz * dz
  return inside > 0 ? (CRAB_SHELL.y + CRAB_SHELL.ry * Math.sqrt(inside)) * (1 + lift * 0.5) : -Infinity
}

/**
 * How far one of the crab's eye stalks leans to the side and forward, in radians, for where it looks: `across`
 * and `toward` from -1 to 1, `side` -1 for its left eye, `out` how far the stalk is out of its socket, `raise`
 * how high the claw on its side is held. The two eyes stand 0.6 apart and each is 0.4 across, so a stalk leans
 * toward the other eye only a little; it leans away from it, toward its own claw, only as far as that claw is
 * down, because a claw held high brings its arm up beside the eye. It leans well forward, over the front of the
 * shell, and only a little back, where the shell rises behind it. A stalk that is pulled in straightens as it
 * goes down into its socket.
 */
export const EYE_LEAN = { apart: 0.5, together: 0.1, forward: 0.6, back: 0.25 } as const
export function eyeLean(across: number, toward: number, side: number, out: number, raise: number): { side: number; forward: number } {
  const stands = clamp(out, 0, 1), down = 1 - clamp(raise * 1.5, 0, 1)
  return { side: across * (across * side > 0 ? EYE_LEAN.apart * down : EYE_LEAN.together) * stands, forward: toward * (toward > 0 ? EYE_LEAN.forward : EYE_LEAN.back) * stands }
}

/** The room the crab keeps between itself and a body that lies over it, each way. */
export const CRAB_ROOM = 0.12
/** How far ahead of an arm over its way the crab starts to lower a claw or pull in an eye. */
export const CRAB_AHEAD = 0.25
/** How far its claws and eyes keep from the starfish as it swings right round where it stands. */
export const SWING_ROOM = 0.04
/** How high a claw's fingers and an eye stand over the sand at their lowest: the claw held down, the stalk pulled right in. */
export const CLAW_LOW = 1.16
/**
 * How far down a claw is held to go by under an arm: nearly to where it taps the sand (-0.5), with a little room
 * left for when the arm moves. Held less far down than this, an arm over the place where the crab swings round
 * stopped it part of the way round, and it stood there for good.
 */
export const CLAW_DOWN = -0.45
export const EYE_LOW = 0.98

/** What a body lying over the crab leaves it room for. */
export type CrabRoom = {
  /** It cannot be here at all: the body is in its shell, in a shell it wears, or lower than a claw held down or an eye pulled in. */
  barred: boolean
  /** How high each claw may be held, and how far out each eye stalk may stand, left then right. */
  claws: [number, number]
  eyes: [number, number]
}

/**
 * The room the crab has under a body whose skin is given as points in the crab's own frame (across it, up from
 * the sand under it, to its front). Its shell and a shell it wears cannot give way; a claw can be lowered and an
 * eye pulled in, so each of those is given the most it may stand: a claw's fingers reach from `CLAW_LOW` with the
 * claw down to half as much again held high, and lean out as it is raised, so a claw's place is 0.66 to 1.54
 * to the side and a quarter either way of 0.5 to the front; an eye stands on a stalk 0.9 up, 0.3
 * to the side and 0.22 to the front, leaning as `leans` says; seen from above it is within 0.24 of its stalk, and
 * its top is 0.66 over the stalk's foot at rest.
 * `ahead` widens the place of each claw and eye, so that it gives way before it is under the body; `room` is how
 * far it keeps from the body all round.
 */
export function crabRoom(points: Iterable<readonly [number, number, number]>, lift: number, leans: readonly { side: number; forward: number }[], hatted: boolean, ahead = 0, room = CRAB_ROOM): CrabRoom {
  const out: CrabRoom = { barred: false, claws: [9, 9], eyes: [9, 9] }
  const tall = CRAB_SHELL.ry * (1 + lift * 0.5) + room
  for (const [across, up, front] of points) {
    const dy = (up - CRAB_SHELL.y) / tall, dx = across / (CRAB_SHELL.rx + room), dz = front / (CRAB_SHELL.rz + room)
    if (dx * dx + dy * dy + dz * dz < 1) out.barred = true
    if (hatted && up < 2.1 + room && Math.hypot(across, front - 0.34) < 0.85 + room) out.barred = true
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1
      // Held lower than level a claw turns in, and its big finger stands a little higher for it: that much more room is kept.
      if (Math.abs(across - side * 1.1) < 0.44 + room + ahead && Math.abs(front - 0.5) < 0.25 + room + ahead) {
        const most = (up - room - CLAW_LOW) / 0.5
        out.claws[i] = Math.min(out.claws[i], most < 0 ? most - 0.06 : most)
      }
      // The stalk from its foot to where its top leans to, seen from above.
      const lean = leans[i], tx = Math.sin(lean.side) * 0.64, tz = Math.sin(lean.forward) * 0.64, px = across - side * 0.3, pz = front - 0.22
      const along = tx * tx + tz * tz > 1e-9 ? clamp((px * tx + pz * tz) / (tx * tx + tz * tz), 0, 1) : 0
      if (Math.hypot(px - tx * along, pz - tz * along) < 0.24 + room + ahead) out.eyes[i] = Math.min(out.eyes[i], ((up - room - 0.9) / 0.66 - 0.12) / 0.88)
    }
  }
  // A claw goes down part of the way to the sand, and an eye right in: lower than that there is no room.
  if (out.claws[0] < CLAW_DOWN || out.claws[1] < CLAW_DOWN || out.eyes[0] < 0 || out.eyes[1] < 0) out.barred = true
  return out
}

// --- The starfish --------------------------------------------------------------

/** What of the starfish its shape is made from: the numbers the picture lays on its meshes. */
export type StarShape = {
  spread: number
  stretch: number
  sway: number
  squash: number
  turn: number
  /** How far it leans back, in radians, where it stands up. */
  back: number
  /** How far it is turned about the upright, and rolled about the way it faces: the crab's, when it rides. */
  yaw: number
  roll: number
  arms: readonly number[]
  waving: number
  wave: number
  /** The gap between arm `gap` and the next that it has turned to a thing standing by it, and how far those two arms are parted round the thing, 0 to 1. */
  gap?: number
  part?: number
}

export const STAR_SCALE = 1.15
/** How far each of the two arms beside a gap swings away from it when the starfish makes room there, in radians. */
export const STAR_PART = 0.38
/** How far the tip of an arm is from its middle as it lies flat. */
export const STAR_REACH = 1.3
/**
 * How far the two arms part for a thing that stands so far from its middle: all the way for one right by it, and
 * not at all for one out at the tips of its arms, where the gap turned to it is room enough.
 */
export function starPartFor(far: number): number {
  return Math.min(1, Math.max(0, (1.9 - far) / 0.4))
}

/** How far back the body is tipped: `back` standing up, flat on its back spread out. */
export function starTilt(star: { back: number; spread: number }): number {
  return -(star.back + (Math.PI / 2 - star.back) * star.spread)
}
/** How high its middle is above its foot, before its size. */
export function starMiddle(star: { stretch: number; spread: number; squash: number }): number {
  return (0.7 + star.stretch * 0.4) * (1 - star.spread * 0.78) - star.squash * 0.12
}
/** How far round arm `i` points, from straight up. Stretched, the two lower arms come together like legs. */
export function armAngle(star: { turn: number; stretch: number; waving: number; wave: number; gap?: number; part?: number }, i: number): number {
  let angle = (i * Math.PI * 2) / 5 + star.turn
  if (i === 2) angle += star.stretch * 0.38
  if (i === 3) angle -= star.stretch * 0.38
  if (i === star.waving) angle += star.wave * 0.5
  // The two arms beside the gap it has turned to a thing swing apart, away from the thing.
  const part = star.part ?? 0, gap = star.gap ?? -1
  if (part > 0 && gap >= 0) {
    if (i === gap) angle -= part * STAR_PART
    if (i === (gap + 1) % 5) angle += part * STAR_PART
  }
  return angle
}

/**
 * How the starfish lies flat beside a thing that stands by it: with the gap between two of its arms turned to
 * the thing. With no gap chosen yet (-1) it takes the gap that is nearest as it is turned now; the turn that
 * comes back is the one nearest to the turn it has.
 */
export function starGap(at: { x: number; z: number }, turn: number, gap: number, thing: { x: number; z: number }): { gap: number; turn: number } {
  // Lying flat, an arm at angle a points to (-sin a, -cos a) on the sand.
  const toward = Math.atan2(-(thing.x - at.x), -(thing.z - at.z)), fifth = (Math.PI * 2) / 5
  const chosen = gap >= 0 ? gap : ((Math.round((toward - turn) / fifth - 0.5) % 5) + 5) % 5
  const want = toward - (chosen + 0.5) * fifth
  return { gap: chosen, turn: want + Math.round((turn - want) / (Math.PI * 2)) * Math.PI * 2 }
}
export function armLength(star: { arms: readonly number[]; stretch: number }, i: number): number {
  return 1 - star.arms[i] * 0.35 + (i === 2 || i === 3 ? star.stretch * 0.12 : 0)
}

type Mat = readonly [number, number, number, number, number, number, number, number, number]
function mul(a: Mat, b: Mat): Mat {
  const out = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]
  return out as unknown as Mat
}
function rotX(t: number): Mat {
  const c = Math.cos(t), s = Math.sin(t)
  return [1, 0, 0, 0, c, -s, 0, s, c]
}
function rotY(t: number): Mat {
  const c = Math.cos(t), s = Math.sin(t)
  return [c, 0, s, 0, 1, 0, -s, 0, c]
}
function rotZ(t: number): Mat {
  const c = Math.cos(t), s = Math.sin(t)
  return [c, -s, 0, s, c, 0, 0, 0, 1]
}
function scale(x: number, y: number, z: number): Mat {
  return [x, 0, 0, 0, y, 0, 0, 0, z]
}
function apply(m: Mat, x: number, y: number, z: number): [number, number, number] {
  return [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z]
}

/** A rounded lump of a body: where its middle is from the body's foot, and the matrix that lays a unit ball on it. */
export type Part = { cx: number; cy: number; cz: number; m: Mat }

/** The five arms and the middle of the starfish as lumps, measured from its foot. */
export function starParts(star: StarShape): Part[] {
  const whole = mul(mul(rotY(star.yaw), rotZ(star.roll)), scale(STAR_SCALE, STAR_SCALE, STAR_SCALE))
  const body = mul(mul(rotX(starTilt(star)), rotZ(star.sway)), scale(1 + star.squash * 0.22, 1 - star.squash * 0.3, 1))
  const at = apply(whole, 0, starMiddle(star), 0)
  const parts: Part[] = []
  for (let i = 0; i < 5; i++) {
    const long = armLength(star, i)
    const arm = mul(mul(body, mul(rotX(star.arms[i] * 1.5), rotZ(armAngle(star, i)))), scale(1, long, 1))
    const m = mul(whole, arm)
    const middle = apply(m, 0, 0.52, 0)
    parts.push({ cx: at[0] + middle[0], cy: at[1] + middle[1], cz: at[2] + middle[2], m: mul(m, scale(0.25, 0.6, 0.17)) })
  }
  parts.push({ cx: at[0], cy: at[1], cz: at[2], m: mul(mul(whole, body), scale(0.44, 0.44, 0.22)) })
  return parts
}

/** Points over the skin of the starfish's lumps, measured from its foot: six rings of eight round each lump. */
export function starSkin(star: StarShape): [number, number, number][] {
  const out: [number, number, number][] = []
  for (const part of starParts(star)) for (let i = 0; i < 6; i++) for (let j = 0; j < 8; j++) {
    const tip = ((i + 0.5) / 6) * Math.PI, round = ((j + (i % 2) * 0.5) / 8) * Math.PI * 2
    const [x, y, z] = apply(part.m, Math.sin(tip) * Math.cos(round), Math.cos(tip), Math.sin(tip) * Math.sin(round))
    out.push([part.cx + x, part.cy + y, part.cz + z])
  }
  return out
}

/**
 * Whether the starfish lying flat at a place, turned so and with that gap parted, is clear of a thing that stands
 * by it: no point of its skin is within the thing's round and under its top.
 */
export function starClearOf(at: { x: number; y: number; z: number }, turn: number, gap: number, thing: Pillar, room = 0.04): boolean {
  const part = starPartFor(Math.hypot(thing.x - at.x, thing.z - at.z))
  const star: StarShape = { spread: 1, stretch: 0, sway: 0, squash: 0, turn, back: 0.3, yaw: 0, roll: 0, arms: [0, 0, 0, 0, 0], waving: 1, wave: 0, gap, part }
  for (const [x, y, z] of starSkin(star)) if (at.y + y < thing.top && Math.hypot(at.x + x - thing.x, at.z + z - thing.z) < thing.r + room) return false
  return true
}

/** Points over the lower side of a unit ball: straight down, and two rings round it. */
const UNDER: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [[0, 0]]
  for (const tip of [0.5, 1.0, 1.45]) for (let i = 0; i < 8; i++) out.push([tip, (i / 8) * Math.PI * 2])
  return out
})()

/**
 * How high a body's foot must be for every lump of it to rest on what is under it and in none of it: `support`
 * gives the height of the sand, a rock or a back under a point measured from the foot.
 */
export function restOn(parts: readonly Part[], support: (x: number, z: number) => number): number {
  let foot = -Infinity
  for (const part of parts) {
    const m = part.m
    // The way down, in the ball's own frame, and two ways across it.
    const nx = -m[3], ny = -m[4], nz = -m[5], n = Math.hypot(nx, ny, nz) || 1
    const dx = nx / n, dy = ny / n, dz = nz / n
    let ux = dy, uy = -dx, uz = 0
    if (Math.hypot(ux, uy) < 1e-3) {
      ux = 1
      uy = 0
    }
    const u = Math.hypot(ux, uy, uz)
    ux /= u
    uy /= u
    const vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux
    for (const [tip, round] of UNDER) {
      const c = Math.cos(tip), s = Math.sin(tip), cr = Math.cos(round) * s, sr = Math.sin(round) * s
      const px = dx * c + ux * cr + vx * sr, py = dy * c + uy * cr + vy * sr, pz = dz * c + uz * cr + vz * sr
      const [wx, wy, wz] = apply(m, px, py, pz)
      const under = support(part.cx + wx, part.cz + wz)
      if (under > -Infinity) foot = Math.max(foot, under - (part.cy + wy))
    }
  }
  return foot
}

/** The lowest point of a body's lumps, measured from its foot. */
export function lowest(parts: readonly Part[]): number {
  let low = Infinity
  for (const part of parts) low = Math.min(low, part.cy - Math.hypot(part.m[3], part.m[4], part.m[5]))
  return low
}

/** The highest point of a body's lumps, measured from its foot. */
export function highest(parts: readonly Part[]): number {
  let high = -Infinity
  for (const part of parts) high = Math.max(high, part.cy + Math.hypot(part.m[3], part.m[4], part.m[5]))
  return high
}

/**
 * The sand the starfish stands over while it stands up: five rounds across the way it faces, which hold its arms
 * however it wheels (they reach 1.37 to either side of its foot, 0.71 behind it and 0.6 in front).
 */
export function starRounds(star: { x: number; z: number; yaw: number }): Patch[] {
  const ax = Math.cos(star.yaw), az = -Math.sin(star.yaw)
  return [-0.78, -0.39, 0, 0.39, 0.78].map((across) => ({ x: star.x + ax * across, z: star.z + az * across - 0.06, r: 0.68 }))
}

/**
 * The sand its lumps are over as it is now, leaning back or spread out flat: each lump seen from above is an oval,
 * held by three rounds along it.
 */
export function starLies(star: StarShape & { x: number; z: number }): Patch[] {
  const out: Patch[] = []
  for (const part of starParts(star)) {
    const m = part.m
    const a = m[0] * m[0] + m[1] * m[1] + m[2] * m[2], c = m[6] * m[6] + m[7] * m[7] + m[8] * m[8], b = m[0] * m[6] + m[1] * m[7] + m[2] * m[8]
    const half = (a + c) / 2, spread = Math.hypot((a - c) / 2, b)
    const long = Math.sqrt(half + spread), wide = Math.sqrt(Math.max(0, half - spread))
    // The way the oval is long.
    let dx = b, dz = half + spread - a
    if (Math.hypot(dx, dz) < 1e-9) {
      dx = half + spread - c
      dz = b
    }
    const d = Math.hypot(dx, dz) || 1
    const reach = Math.max(0, long - wide), r = wide * 1.2
    for (const along of reach > 0.05 ? [-1, 0, 1] : [0]) out.push({ x: star.x + part.cx + (dx / d) * reach * along, z: star.z + part.cz + (dz / d) * reach * along, r })
  }
  return out
}

// --- The gulls -----------------------------------------------------------------

/** A gull's body with its wings folded reaches this far to either side of its feet, for a bird of size 1. */
export const GULL_HALF = 0.4
/** How far a wing reaches out from the middle of the bird when it is spread `wing` of the way, for a bird of size 1. */
export function wingReach(wing: number): number {
  const w = clamp(wing, 0, 1), long = 0.56 * (1 + 0.9 * w), round = Math.min(Math.PI / 2, 1.85 * w)
  return Math.max(GULL_HALF, 0.31 + long * Math.sin(round) + 0.09)
}
/** How far its beak reaches to one side as its head turns that way, for a bird of size 1. */
export function beakReach(head: number): number {
  return Math.max(0.24, Math.sin(clamp(head, 0, Math.PI / 2)) * 0.48 + 0.06)
}

export type GullShape = { lean: number; head: number; wings: readonly [number, number] | readonly number[] }

/**
 * How far a gull reaches to one side of its feet: `side` is -1 for its left, toward smaller x, and 1 for its
 * right. A lean carries the whole of it over.
 */
export function gullSpan(bird: GullShape, index: number, side: number): number {
  const size = GULL_SIZES[index]
  // A lean to the left is positive: its top goes toward smaller x.
  const over = Math.sin(clamp(side < 0 ? bird.lean : -bird.lean, 0, Math.PI / 2)) * 1.35
  const wing = wingReach(bird.wings[side < 0 ? 0 : 1])
  const beak = beakReach(side < 0 ? -bird.head : bird.head)
  return size * (over + Math.max(wing, beak))
}
/** How tall a gull stands from its feet. */
export function gullTall(index: number): number {
  return 1.5 * GULL_SIZES[index]
}
