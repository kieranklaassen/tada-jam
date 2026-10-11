import { COLS, ROWS, SHAPE, slopeFaces, type Kind } from './blocks'

// Where everything stands in the room, in world units. Pure numbers, shared by
// the rules of the toy, the picking and the view, so a touch lands on what is
// drawn. x runs to the right, y up, z toward the child. One place of the rug
// is one unit across, and one half level is half a unit high.

export const HALF_LEVEL = 0.5

/** The middle place of the rug. */
export const GRID = { x: -0.9, z: 0 }

export function placeX(col: number): number {
  return GRID.x + (col - (COLS - 1) / 2)
}

export function placeZ(row: number): number {
  return GRID.z + (row - (ROWS - 1) / 2)
}

/** The middle of the foot of a block standing at a place, on the level it rests at. */
export function standAt(kind: Kind, col: number, row: number, level: number): [number, number, number] {
  return [placeX(col) + (SHAPE[kind].wide - 1) / 2, level * HALF_LEVEL, placeZ(row)]
}

/** How a block on the rug is turned about its upright axis: a slope's heel is away from the side it runs down to. */
export function yawAt(kind: Kind, col: number): number {
  return kind === 'slope' && slopeFaces(col) === 'left' ? Math.PI : 0
}

/** The size of each kind as drawn: across, up, and deep. A little under its places, so neighbours never touch. */
export const SIZE: Record<Kind, [number, number, number]> = {
  long: [2.86, 0.5, 0.82],
  arch: [1.86, 1.5, 0.82],
  round: [0.9, 1.5, 0.9],
  thin: [0.28, 2, 0.28],
  cube: [0.86, 1, 0.86],
  slope: [1.86, 1, 0.82],
}

/** The wool rug. */
export const RUG = { x0: -4.85, x1: 3.0, z0: -2.1, z1: 2.1, thick: 0.05 }

/** The back wall. */
export const WALL_Z = -3.3

/** The basket: its middle on the floor, its size, the height of its rim and of the bed the blocks stand on. */
export const BASKET = { x: 5.2, z: 0.25, wide: 3.2, deep: 3.8, rim: 0.72, bed: 0.34 }

/** How far the basket tips over toward the rug, in radians: about its bottom edge on the rug's side. */
export const BASKET_TIP = 0.66

/** Where a point of the upright basket is once it has tipped this far: x and y, turned about that bottom edge. */
export function tippedAt(x: number, y: number, tip: number): [number, number] {
  const pivot = BASKET.x - BASKET.wide / 2, rx = x - pivot
  return [pivot + rx * Math.cos(tip) - y * Math.sin(tip), rx * Math.sin(tip) + y * Math.cos(tip)]
}

/** The other way: where in the upright basket a point of the room is, seen from the basket tipped this far. */
export function untippedAt(x: number, y: number, tip: number): [number, number] {
  const pivot = BASKET.x - BASKET.wide / 2, rx = x - pivot
  return [pivot + rx * Math.cos(tip) + y * Math.sin(tip), -rx * Math.sin(tip) + y * Math.cos(tip)]
}

/**
 * Where the offered block of each kind stands in the basket: the middle of its
 * foot. Four rows from the wall toward the child, the tall kinds at the back
 * and the long one lying along the front, so every kind shows over the row
 * before it and none touches another.
 */
export const OFFER: Record<Kind, [number, number, number]> = {
  thin: [BASKET.x - 1.0, BASKET.bed, BASKET.z - 1.35],
  arch: [BASKET.x + 0.4, BASKET.bed, BASKET.z - 1.35],
  round: [BASKET.x - 0.9, BASKET.bed, BASKET.z - 0.42],
  cube: [BASKET.x + 0.5, BASKET.bed, BASKET.z - 0.42],
  slope: [BASKET.x, BASKET.bed, BASKET.z + 0.5],
  long: [BASKET.x, BASKET.bed, BASKET.z + 1.36],
}

export type Who = 'king' | 'cook' | 'dragon'

/**
 * Where each of the folk sits by day: the middle of his foot, how high he
 * stands off the floor (the cook is on a stool), how big he is drawn, the
 * way he faces (a turn about y, 0 facing the child), the height of his eyes,
 * and the box in which a touch is his, as distances from that middle.
 */
export const FOLK: Record<Who, { x: number; y: number; z: number; size: number; faces: number; eyes: number; box: { left: number; right: number; deep: number; tall: number } }> = {
  king: { x: -5.7, y: 0, z: 1.5, size: 1.5, faces: 0.45, eyes: 1.15, box: { left: 0.98, right: 0.98, deep: 0.92, tall: 3.0 } },
  cook: { x: 3.05, y: 1.15, z: -2.5, size: 1.05, faces: -0.3, eyes: 1.95, box: { left: 0.6, right: 0.6, deep: 0.56, tall: 2.7 } },
  dragon: { x: -0.6, y: 0, z: 3.45, size: 1.25, faces: 0, eyes: 0.69, box: { left: 4.1, right: 0.95, deep: 0.62, tall: 0.95 } },
}

/**
 * How big each of the folk is, in world units at his drawn size: half his
 * width, and his height from the point he stands on (the top of his cap, for
 * the cook). The dragon's are his
 * length behind and before the point he is placed by, and half his girth.
 */
export const BODY = {
  king: { half: 0.62 * FOLK.king.size, tall: 1.5 * FOLK.king.size },
  // The cook's cap has knobs on it: lying on his side he rests on them, `girth` off the ground.
  cook: { half: 0.47 * FOLK.cook.size, tall: 1.3 * FOLK.cook.size, girth: 0.545 * FOLK.cook.size },
  dragon: { behind: 3.55 * FOLK.dragon.size, before: 0.95 * FOLK.dragon.size, half: 0.53 * FOLK.dragon.size, tall: 0.76 * FOLK.dragon.size },
} as const

/** The bell: a brass bell hung from a forked branch, on the boards in front of the rug where no pile can grow over it. The middle of its foot, and the box in which a touch is the bell's. */
export const BELL = { x: 1.95, z: 3.4, wide: 1.4, deep: 0.9, tall: 1.75, hangs: 1.18 }

/** The moat of the evening: how far it reaches past the rug on the left, in front and on the right. */
export const MOAT = { left: 0.6, front: 0.45, right: 0.5, from: -1.8 }

/** The frame the room is composed for. */
export const DESIGN_ASPECT = 1180 / 820

export type CameraPose = { position: [number, number, number]; target: [number, number, number]; fovDeg: number }

/**
 * The fixed camera for a surface of this shape. The room is composed for the
 * design frame; a narrower surface steps the camera back so the same width of
 * room is in view, and a wider one shows more floor and wall at the sides.
 * `back` (0 to 1) steps it back and up for an evening castle too tall for the
 * frame, so the king on its highest seat is still in view.
 */
export function cameraFor(aspect: number, back = 0): CameraPose {
  const target: [number, number, number] = [0, 1.15 + 1.1 * back, 0]
  const pitch = (35 * Math.PI) / 180
  const distance = (16 + 4.5 * back) * Math.max(1, DESIGN_ASPECT / Math.max(0.2, aspect))
  return { position: [target[0], target[1] + Math.sin(pitch) * distance, target[2] + Math.cos(pitch) * distance], target, fovDeg: 36 }
}

/** How far the camera steps back for something whose top stands this high, in world units. */
export function backFor(top: number): number {
  return Math.max(0, Math.min(1, (top - 5.3) / 2.7))
}

/** Where a point of the room falls on a surface of this size, in its pixels from the top left, through the camera of that surface. */
export function screenAt(point: readonly [number, number, number], width: number, height: number, back = 0): [number, number] {
  const pose = cameraFor(width / height, back)
  const pitch = (35 * Math.PI) / 180
  // The camera looks along (0, -sin, -cos); its right is +x and its up is (0, cos, -sin).
  const dx = point[0] - pose.position[0], dy = point[1] - pose.position[1], dz = point[2] - pose.position[2]
  const depth = -dy * Math.sin(pitch) - dz * Math.cos(pitch)
  const up = dy * Math.cos(pitch) - dz * Math.sin(pitch)
  const t = Math.tan((pose.fovDeg * Math.PI) / 360)
  return [(dx / (depth * t * (width / height)) + 1) * 0.5 * width, (1 - up / (depth * t)) * 0.5 * height]
}
