// Where everything stands, in world units, for a surface of any shape. Pure:
// the stage reads it to place things, the touch reads it to find them, and
// the tests hold the sizes a two-year-old needs (pack: game-design,
// ages-2-to-4.md): every balloon and friend about 100 logical pixels across
// or more, well apart, and nothing to touch in the bottom strip.
//
// The friends stand in the plane z = 0 with the camera straight in front, so
// one world unit there is the same number of pixels everywhere on screen.

/** The height of the view at z = 0 on a wide surface. A narrow one sees more height, so the width below always fits. */
export const VIEW_HEIGHT = 10
/** The width the sky and a troop of three need. */
export const VIEW_WIDTH = 13.4
export const FOV = 26

/** Where the friends' feet are. Below it is only the hill: the strip where wrists rest. */
export const GROUND = -3.3
/** A balloon's radius, and the height of the row of bunches in the sky. */
export const BALLOON = 0.66
export const SKY_ROW = 3.1
/** How high above the ground a held balloon bobs, at its middle. */
export const HELD_HEIGHT = 4.0
/** From the middle of one friend of a troop to the next. */
export const FRIEND_GAP = 2.95
/** The friends are drawn this much larger than their plans in bodies.ts. */
export const FRIEND_SCALE = 1.08
/** The troop that waits stands back and to the left, smaller. */
export const WAITING_SCALE = 0.66
export const WAITING_DEPTH = -3.2

/** The hill is the top of a wide pillow. */
export const HILL = { x: 0, z: -0.4, rx: 22, ry: 4.6, rz: 10 } as const

/** The far hill, where the troops that were served go round: the top of another pillow, a long way back and to the right. */
export const FAR_HILL = { x: 9, y: GROUND - 4.4, z: -19, rx: 11, ry: 5.6, rz: 5 } as const
/** The clouds: pillows far behind, kept below the row of balloons so nothing stands behind a balloon but sky. The last hangs over the troop. */
export const CLOUDS = [
  { x: -9.5, y: 1.6, z: -15, scale: 1.25 },
  { x: 9.6, y: 3.0, z: -15, scale: 0.95 },
  { x: 0.8, y: 0.9, z: -15, scale: 0.75 },
] as const

export type View = {
  /** World units seen at z = 0. */
  width: number
  height: number
  /** How far the camera stands from z = 0. */
  distance: number
  /** Logical pixels to one world unit at z = 0. */
  pixelsPerUnit: number
}

export function viewFor(widthPx: number, heightPx: number): View {
  const aspect = widthPx / Math.max(1, heightPx)
  const height = Math.max(VIEW_HEIGHT, VIEW_WIDTH / aspect)
  return { width: height * aspect, height, distance: height / 2 / Math.tan((FOV * Math.PI) / 360), pixelsPerUnit: heightPx / height }
}

/** The height of the hill's skin under a point. */
export function groundAt(x: number, z: number): number {
  const dx = (x - HILL.x) / HILL.rx, dz = (z - HILL.z) / HILL.rz
  return GROUND - HILL.ry + HILL.ry * Math.sqrt(Math.max(0, 1 - dx * dx - dz * dz))
}

/** The x of friend `index` in a troop of `size`, the troop centred. */
export function friendX(index: number, size: number): number {
  return (index - (size - 1) / 2) * FRIEND_GAP
}

/** Where friend `index` of the waiting troop stands: the first in view at the left edge, the others behind it and further out. */
export function waitingSpot(index: number, view: View): { x: number; z: number } {
  return { x: -view.width / 2 + 1.1 - index * 0.8, z: WAITING_DEPTH - index * 1.5 }
}

/** The middle of each place in the sky, for `slots` bunches. */
export function skySlots(slots: number, view: View): { x: number; y: number }[] {
  const room = view.width - 2 * (BALLOON * 1.9)
  const gap = slots > 1 ? Math.min(3.6, room / (slots - 1)) : 0
  return Array.from({ length: slots }, (_, i) => ({ x: (i - (slots - 1) / 2) * gap, y: SKY_ROW }))
}

/**
 * Where each balloon of a bunch sits round the middle of its place, always the same arrangement: one; two side
 * by side; three as a triangle with one on top.
 */
export function bunchOffsets(count: number): readonly { x: number; y: number }[] {
  return OFFSETS[count <= 1 ? 0 : count === 2 ? 1 : 2]
}

// Made once: the frame loop asks for these many times a frame.
const OFFSETS: readonly (readonly { x: number; y: number }[])[] = [
  [{ x: 0, y: 0 }],
  [{ x: -BALLOON * 0.86, y: 0 }, { x: BALLOON * 0.86, y: 0 }],
  [{ x: -BALLOON * 0.86, y: -BALLOON * 0.42 }, { x: BALLOON * 0.86, y: -BALLOON * 0.42 }, { x: 0, y: BALLOON * 1.02 }],
]

/** The half-size of a bunch as a touch target, in world units. */
export function bunchReach(count: number): { x: number; y: number } {
  return REACH[count <= 1 ? 0 : count === 2 ? 1 : 2]
}

const REACH = OFFSETS.map((offsets) => ({ x: Math.max(...offsets.map((o) => Math.abs(o.x))) + BALLOON, y: Math.max(...offsets.map((o) => Math.abs(o.y))) + BALLOON * 1.12 }))

/** A point of the surface, in logical pixels from its top left, as a point of the plane z = 0. */
export function toWorld(xPx: number, yPx: number, widthPx: number, heightPx: number, view: View): { x: number; y: number } {
  return { x: (xPx - widthPx / 2) / view.pixelsPerUnit, y: (heightPx / 2 - yPx) / view.pixelsPerUnit }
}

/** The height of the far hill's skin under a point. */
export function farGroundAt(x: number, z: number): number {
  const dx = (x - FAR_HILL.x) / FAR_HILL.rx, dz = (z - FAR_HILL.z) / FAR_HILL.rz
  return FAR_HILL.y + FAR_HILL.ry * Math.sqrt(Math.max(0, 1 - dx * dx - dz * dz))
}

/** How many troops go round the far hill at most, and the friends in them. */
export const PARADE_TROOPS = 4
export const PARADE_FRIENDS = PARADE_TROOPS * 3

/**
 * Where friend `member` of troop `troop` of the parade is at `time`: the troops go slowly round the top of the
 * far hill, evenly spaced, each friend a step behind the one in front. `turn` is which way it faces.
 */
export function paradeSpot(troop: number, member: number, time: number, out: { x: number; y: number; z: number; turn: number }): { x: number; y: number; z: number; turn: number } {
  const angle = time * 0.1 + (troop / PARADE_TROOPS) * Math.PI * 2 - member * 0.21
  out.x = FAR_HILL.x + Math.cos(angle) * 4.6
  out.z = FAR_HILL.z + Math.sin(angle) * 1.5 + 1.2
  out.y = farGroundAt(out.x, out.z)
  // It walks along the ring: at the front of it to the left, at the back to the right.
  out.turn = Math.atan2(-Math.sin(angle) * 4.6, Math.cos(angle) * 1.5)
  return out
}

/** Where a far point is seen in the friends' plane, z = 0: its x and y there, and how much smaller it looks. */
export function seenAt(x: number, y: number, z: number, view: View, out: { x: number; y: number; scale: number }): { x: number; y: number; scale: number } {
  const scale = view.distance / (view.distance - z)
  out.x = x * scale
  out.y = y * scale
  out.scale = scale
  return out
}
