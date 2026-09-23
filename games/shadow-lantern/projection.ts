// The theatre's optics, in centimetres. The paper screen is the plane z = 0
// facing the child; the lamp stands in front of it at LAMP; shapes stand on
// the stage floor (y = 0) between them, pinned at lamp height, with their
// cards parallel to the screen.
//
// A point P projects from the lamp L onto the screen at S = L + k (P − L)
// with k = L.z / (L.z − P.z). A card at depth z therefore casts its own
// outline scaled by k: about 1 at the screen, larger toward the lamp. A real
// flame has a size, so the soft edge (penumbra) is LAMP_RADIUS · (k − 1):
// sharp at the screen, blurry near the lamp.

export type Vec3 = { x: number; y: number; z: number }

export const SCREEN = { left: -32, right: 32, bottom: 4, top: 44 } as const
export const LAMP: Vec3 = { x: 0, y: 23, z: 64 }
/** Pins sit at lamp height, so every shadow hangs from the lamp's horizon line. */
export const PIN_HEIGHT = LAMP.y
export const LAMP_RADIUS = 0.55

/**
 * Where shapes may stand: from a hand's width off the screen (any nearer and,
 * seen from the child's seat above the lamp, a card would hide its own
 * shadow) to a hand-span from the lamp.
 */
export const STAGE = { zNear: 8, zFar: 48, xMin: -34, xMax: 34 } as const

export function shadowScale(z: number): number {
  return LAMP.z / (LAMP.z - z)
}

/** Depth that gives a shadow scale of `k` (inverse of shadowScale). */
export function depthForScale(k: number): number {
  return LAMP.z * (1 - 1 / k)
}

export function penumbra(k: number): number {
  return LAMP_RADIUS * Math.max(0, k - 1)
}

/** Project a world point from the lamp onto the screen plane. Writes into `out`. */
export function projectToScreen(x: number, y: number, z: number, out: { x: number; y: number }): { x: number; y: number } {
  const k = LAMP.z / (LAMP.z - z)
  out.x = LAMP.x + (x - LAMP.x) * k
  out.y = LAMP.y + (y - LAMP.y) * k
  return out
}

export type CardPose = {
  /** Pin position on the floor plane (the pin is at PIN_HEIGHT). */
  x: number
  z: number
  /** Turn around the pin, in the card's own plane (radians, counter-clockwise). */
  angle: number
  /** Swing around the wire (radians); 0 means parallel to the screen. */
  yaw: number
  /** Extra lift of the whole stand (cm), for pickup and landing. */
  lift: number
}

/**
 * Screen position of a card's local point (u, v) under `pose`. The card is
 * turned by `angle` about its pin and swung by `yaw` about the vertical wire.
 */
export function projectCardPoint(pose: CardPose, u: number, v: number, out: { x: number; y: number }): { x: number; y: number } {
  const c = Math.cos(pose.angle)
  const s = Math.sin(pose.angle)
  const ru = u * c - v * s
  const rv = u * s + v * c
  const cy = Math.cos(pose.yaw)
  const sy = Math.sin(pose.yaw)
  return projectToScreen(pose.x + ru * cy, PIN_HEIGHT + pose.lift + rv, pose.z - ru * sy, out)
}

/**
 * The card-local point whose shadow lands on screen point (sx, sy), for a
 * card parallel to the screen (yaw 0, no lift). Used by coverage.
 */
export function screenToCard(pose: CardPose, sx: number, sy: number, out: { x: number; y: number }): { x: number; y: number } {
  const k = LAMP.z / (LAMP.z - pose.z)
  const ru = LAMP.x + (sx - LAMP.x) / k - pose.x
  const rv = LAMP.y + (sy - LAMP.y) / k - PIN_HEIGHT
  const c = Math.cos(pose.angle)
  const s = Math.sin(pose.angle)
  out.x = ru * c + rv * s
  out.y = -ru * s + rv * c
  return out
}

export function clampToStage(x: number, z: number, out: { x: number; z: number }): { x: number; z: number } {
  out.x = Math.min(STAGE.xMax, Math.max(STAGE.xMin, x))
  out.z = Math.min(STAGE.zFar, Math.max(STAGE.zNear, z))
  return out
}
