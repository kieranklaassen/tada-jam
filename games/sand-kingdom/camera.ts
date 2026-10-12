// The one camera of the beach, as plain numbers: where it stands, how it is
// turned, and how wide it sees for a surface of a given shape. The view sets
// its own camera from these numbers, and every touch is brought back to the
// beach through them, so what is drawn and what is touched cannot drift apart.

/** Where the camera stands: above the dry sand, looking out over the beach to the sea. */
export const EYE = { x: 0, y: 8, z: 14 } as const
/** How far it looks down from level, in radians. */
export const PITCH = (30 * Math.PI) / 180
/** Half of what it sees top to bottom on a tablet held wide, as a tangent. */
const TAN_Y = Math.tan((22.5 * Math.PI) / 180)
/** The shape of the surface the frame was composed for. */
const COMPOSED = 1180 / 820
/** Where the sea ends and the sky stands, in world z: a line straight across the frame. */
export const HORIZON_Z = -14

export type Camera = {
  width: number
  height: number
  /** Half of what it sees left to right and top to bottom, as tangents. */
  tanX: number
  tanY: number
  /** Top to bottom, in degrees, as a three.js camera takes it. */
  fovY: number
}

/**
 * The camera for a surface. It always sees the beach as wide as it was
 * composed: a narrower surface sees more sky and more dry sand, and a wider
 * one sees more beach to the sides.
 */
export function cameraFor(width: number, height: number): Camera {
  const aspect = width / height
  const tanY = Math.max(TAN_Y, (TAN_Y * COMPOSED) / aspect)
  return { width, height, tanX: tanY * aspect, tanY, fovY: (2 * Math.atan(tanY) * 180) / Math.PI }
}

const SIN = Math.sin(PITCH), COS = Math.cos(PITCH)

/** A world point on the surface, in its own pixels from the top left, with how far ahead of the camera it is. */
export function project(camera: Camera, x: number, y: number, z: number): { x: number; y: number; depth: number } {
  const dx = x - EYE.x, dy = y - EYE.y, dz = z - EYE.z
  // The camera looks along (0, -sin, -cos); its up is (0, cos, -sin) and its right is the world's x.
  const depth = -dy * SIN - dz * COS
  const up = dy * COS - dz * SIN
  const safe = Math.max(depth, 1e-6)
  return {
    x: (0.5 + (dx / safe / camera.tanX) * 0.5) * camera.width,
    y: (0.5 - (up / safe / camera.tanY) * 0.5) * camera.height,
    depth,
  }
}

/** The direction a point of the surface looks along, from the eye. Not of unit length. */
export function ray(camera: Camera, sx: number, sy: number): { x: number; y: number; z: number } {
  const nx = ((sx / camera.width) * 2 - 1) * camera.tanX
  const ny = (1 - (sy / camera.height) * 2) * camera.tanY
  return { x: nx, y: -SIN + ny * COS, z: -COS - ny * SIN }
}

/**
 * Where a point of the surface meets the ground, whose height `heightAt`
 * gives. Null when it looks at or above the level of the horizon. The ground
 * is nearly flat, so a few rounds of meeting a level plane and reading the
 * height there are enough.
 */
export function groundAt(camera: Camera, sx: number, sy: number, heightAt: (x: number, z: number) => number): { x: number; z: number } | null {
  const dir = ray(camera, sx, sy)
  if (dir.y >= -1e-4) return null
  let level = 0, x = 0, z = 0
  for (let i = 0; i < 4; i++) {
    const t = (level - EYE.y) / dir.y
    x = EYE.x + dir.x * t
    z = EYE.z + dir.z * t
    level = heightAt(x, z)
  }
  return { x, z }
}

/** The row of the surface the horizon lies on, in its pixels from the top. */
export function horizonY(camera: Camera): number {
  return project(camera, 0, 0, HORIZON_Z).y
}
