import {
  arrangementCount,
  arrangementFromKey,
  cellPosition,
  pack,
  type GroupDef,
  type Room,
  type TurnDef,
  type Vec3,
} from './world'

// The isometric camera as plain math, shared by the controller (hit tests,
// drag planes, guidance paths) and the view (camera placement), so a touch
// always lands on exactly what is drawn under it.

const R2 = Math.SQRT1_2
const R6 = 1 / Math.sqrt(6)
const R3 = 1 / Math.sqrt(3)

/** Screen right, screen up, and toward the camera, in world units. */
export const SCREEN_RIGHT: Vec3 = [R2, 0, -R2]
export const SCREEN_UP: Vec3 = [-R6, 2 * R6, -R6]
export const TOWARD_CAMERA: Vec3 = [R3, R3, R3]

export type Point = { x: number; y: number }
export type MutableVec3 = [number, number, number]

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

/** Where every cell of a diorama can ever be on screen, in iso units. */
export function roomBounds(room: Room, extra: readonly Vec3[] = []): Bounds {
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  const add = (x: number, y: number, z: number) => {
    const sx = (x - z) * R2
    const sy = (2 * y - x - z) * R6
    bounds.minX = Math.min(bounds.minX, sx)
    bounds.maxX = Math.max(bounds.maxX, sx)
    bounds.minY = Math.min(bounds.minY, sy)
    bounds.maxY = Math.max(bounds.maxY, sy)
  }
  const seen = new Set<number>()
  for (let key = 0; key < arrangementCount(room); key++) {
    const arrangement = arrangementFromKey(room, key)
    for (let cell = 0; cell < room.cells.length; cell++) {
      if (room.cells[cell].group < 0 && key > 0) continue
      const [x, y, z] = cellPosition(room, cell, arrangement)
      const id = pack(x, y, z)
      if (seen.has(id)) continue
      seen.add(id)
      // The deep base fades into the dusk; frame the tower, not the whole plinth.
      const y0 = Math.max(y, -1.2)
      if (y + 1 < y0) continue
      for (const dx of [0, 1]) for (const dz of [0, 1]) for (const top of [y0, y + 1]) add(x + dx, top, z + dz)
    }
  }
  for (const [x, y, z] of extra) add(x, y, z)
  return bounds
}

export type Fit = { scale: number; camX: number; camY: number }

export const MIN_SCALE = 30
export const MAX_SCALE = 96

/** Fit a diorama into the part of the screen above the ring. */
export function fitRoom(bounds: Bounds, width: number, height: number, ringHeight: number): Fit {
  const padX = Math.max(40, width * 0.06)
  // Room above the highest ledge for the wanderer's hood and the bird.
  const padTop = Math.max(56, height * 0.1)
  const availableW = Math.max(100, width - padX * 2)
  const availableH = Math.max(100, height - ringHeight - padTop * 1.5)
  const w = bounds.maxX - bounds.minX
  const h = bounds.maxY - bounds.minY
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, availableW / w, availableH / h))
  const centreX = (bounds.minX + bounds.maxX) / 2
  const centreY = (bounds.minY + bounds.maxY) / 2
  // The fitted box is centred in the area above the ring.
  const areaCentrePx = padTop + availableH / 2
  const camY = centreY - (height / 2 - areaCentrePx) / scale
  return { scale, camX: centreX, camY }
}

export class Projector {
  width = 1
  height = 1
  scale = 60
  camX = 0
  camY = 0

  set(width: number, height: number, fit: Fit): void {
    this.width = width
    this.height = height
    this.scale = fit.scale
    this.camX = fit.camX
    this.camY = fit.camY
  }

  toScreen(x: number, y: number, z: number, out: Point): Point {
    out.x = this.width / 2 + ((x - z) * R2 - this.camX) * this.scale
    out.y = this.height / 2 - ((2 * y - x - z) * R6 - this.camY) * this.scale
    return out
  }

  /** The world point on the plane through the origin (perpendicular to the view) under a screen pixel. */
  rayOrigin(px: number, py: number, out: MutableVec3): MutableVec3 {
    const sx = this.camX + (px - this.width / 2) / this.scale
    const sy = this.camY - (py - this.height / 2) / this.scale
    out[0] = SCREEN_RIGHT[0] * sx + SCREEN_UP[0] * sy
    out[1] = SCREEN_RIGHT[1] * sx + SCREEN_UP[1] * sy
    out[2] = SCREEN_RIGHT[2] * sx + SCREEN_UP[2] * sy
    return out
  }

  /** World point where the view centre sits (the camera target). */
  target(out: MutableVec3): MutableVec3 {
    out[0] = SCREEN_RIGHT[0] * this.camX + SCREEN_UP[0] * this.camY
    out[1] = SCREEN_RIGHT[1] * this.camX + SCREEN_UP[1] * this.camY
    out[2] = SCREEN_RIGHT[2] * this.camX + SCREEN_UP[2] * this.camY
    return out
  }
}

export type RayHit = { x: number; y: number; z: number; face: number }

/**
 * March from the camera side along -(1,1,1) through the lattice and report the
 * first solid cell and the face the ray entered through (+x 0, +y 2, +z 4).
 */
export function castRay(solid: Set<number>, origin: Vec3, out: RayHit): RayHit | null {
  const far = 40
  const ox = origin[0] + far
  const oy = origin[1] + far
  const oz = origin[2] + far
  let x = Math.floor(ox)
  let y = Math.floor(oy)
  let z = Math.floor(oz)
  let tx = ox - x
  let ty = oy - y
  let tz = oz - z
  for (let i = 0; i < 400; i++) {
    let face: number
    if (tx <= ty && tx <= tz) {
      x -= 1
      tx += 1
      face = 0
    } else if (ty <= tz) {
      y -= 1
      ty += 1
      face = 2
    } else {
      z -= 1
      tz += 1
      face = 4
    }
    if (solid.has(pack(x, y, z))) {
      out.x = x
      out.y = y
      out.z = z
      out.face = face
      return out
    }
    if (x < -40 && y < -40 && z < -40) break
  }
  return null
}

const LEVEL_LIFT_MARGIN = 0.02

/**
 * A cell turning about a level axle through its own centre dips its lowest
 * corner below its bottom face by ½(|sin φ| + |cos φ| − 1) mid-swing. The
 * segment rises by that much, and a hair more, so it swings over the block it
 * rests on instead of through it; at every quarter the rise is zero.
 */
export function levelLift(value: number): number {
  const angle = (value * Math.PI) / 2
  return 0.5 * (Math.abs(Math.sin(angle)) + Math.abs(Math.cos(angle)) - 1) + LEVEL_LIFT_MARGIN * Math.abs(Math.sin(2 * angle))
}

/** Rotate or slide a quarter-0 point by a group's continuous value (quarters for turns, cells for slides). */
export function placePoint(group: GroupDef | null, value: number, x: number, y: number, z: number, out: MutableVec3): MutableVec3 {
  if (!group) {
    out[0] = x
    out[1] = y
    out[2] = z
    return out
  }
  if (group.kind === 'slide') {
    out[0] = x + (group.axis === 'x' ? value : 0)
    out[1] = y + (group.axis === 'y' ? value : 0)
    out[2] = z + (group.axis === 'z' ? value : 0)
    return out
  }
  const angle = (value * Math.PI) / 2
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const [px, py, pz] = group.pivot
  const dx = x - px
  const dy = y - py
  const dz = z - pz
  switch (group.axis) {
    case 'x':
      out[0] = x
      out[1] = py + dy * c - dz * s + levelLift(value)
      out[2] = pz + dy * s + dz * c
      return out
    case 'y':
      out[0] = px + dx * c + dz * s
      out[1] = y
      out[2] = pz - dx * s + dz * c
      return out
    case 'z':
      out[0] = px + dx * c - dy * s
      out[1] = py + dx * s + dy * c + levelLift(value)
      out[2] = z
      return out
    default: {
      const unreachable: never = group.axis
      return unreachable
    }
  }
}

/** Angle (radians, about the group's axis) of a screen pixel projected onto the turn plane through the pivot. */
export function turnAngle(projector: Projector, group: TurnDef, px: number, py: number, scratch: MutableVec3): number | null {
  const o = projector.rayOrigin(px, py, scratch)
  const axis = group.axis === 'x' ? 0 : group.axis === 'y' ? 1 : 2
  const t = (group.pivot[axis] - o[axis]) / R3
  const vx = o[0] + R3 * t - group.pivot[0]
  const vy = o[1] + R3 * t - group.pivot[1]
  const vz = o[2] + R3 * t - group.pivot[2]
  switch (group.axis) {
    case 'x':
      return Math.hypot(vy, vz) < 0.25 ? null : Math.atan2(vz, vy)
    case 'y':
      return Math.hypot(vx, vz) < 0.25 ? null : Math.atan2(vx, vz)
    case 'z':
      return Math.hypot(vx, vy) < 0.25 ? null : Math.atan2(vy, vx)
    default: {
      const unreachable: never = group.axis
      return unreachable
    }
  }
}
