import type { Turn } from './cast'
import { FIGURES, STAND, type Id } from './cast'

// Where everything stands, in plain numbers. x to the child's right, y up, z
// towards the child. The table's top is y = 0.

export type P3 = { x: number; y: number; z: number }

/** Four places on the table: 0 and 1 near the child (left, right), 2 and 3 near the painter (left, right, as the child sees it). */
export const SPOTS: readonly P3[] = [
  { x: -1.31, y: 0, z: 1.31 }, { x: 1.31, y: 0, z: 1.31 },
  { x: -1.31, y: 0, z: -1.31 }, { x: 1.31, y: 0, z: -1.31 },
]
export const TABLE = { r: 2.95, h: 0.62 } as const
export const FLOOR_Y = -1.5

/** Six steps where the others wait: three up each side. */
export const STEPS: readonly P3[] = [
  { x: -4.45, y: -0.75, z: 2.05 }, { x: -4.75, y: -0.1, z: -0.75 }, { x: -5.05, y: 0.55, z: -3.95 },
  { x: 4.45, y: -0.75, z: 2.05 }, { x: 4.75, y: -0.1, z: -0.75 }, { x: 5.05, y: 0.55, z: -3.95 },
]

export const MAESTRO: P3 = { x: 0, y: 0, z: -5.6 }
/** The picture is drawn from his side and at the height of his eye, stood back the length of a room, so near and far keep their places. */
export const EYE: P3 = { x: 0, y: 3.6, z: -11 }
/** The shape of every picture. */
export const FRAME_ASPECT = 4 / 3

/** The easel, its back to the child, and the picture's size on it. */
export const EASEL: P3 & { yaw: number } = { x: -2.62, y: 2.7, z: -5.1, yaw: Math.PI + 0.35 }
export const PICTURE = { w: 2.2, h: 1.65 } as const
/** Where the finished picture is shown to the child: forward and up, over the table's back. */
export const SHOWN: P3 & { size: number } = { x: -3.12, y: 4.0, z: -2.65, size: 1.64 }
/** Six nails, in the order they are filled. */
export const NAILS: readonly P3[] = [
  { x: 3.75, y: 5.0, z: -7.45 }, { x: 6.2, y: 5.25, z: -7.45 }, { x: 8.6, y: 4.95, z: -7.45 },
  { x: -7.35, y: 5.0, z: -7.45 }, { x: -7.5, y: 2.8, z: -7.45 }, { x: 8.5, y: 2.75, z: -7.45 },
]
export const HUNG = 0.8
/** The key that turns the table, at its rim. */
export const KEY: P3 = { x: 0, y: -0.1, z: 3.06 }

export const CAMERA = { at: { x: 0, y: 7.5, z: 13.8 }, to: { x: 0, y: 1.72, z: -1.0 }, near: 1, far: 60 } as const

const D2R = Math.PI / 180

/** The vertical field of view, in degrees, that keeps the steps and the top of the painter's hat in sight on any surface. */
export function fieldOfView(width: number, height: number): number {
  const aspect = width / Math.max(1, height), wide = 25.2 * D2R, high = 31
  return Math.max(high, (2 * Math.atan(Math.tan(wide) / aspect)) / D2R)
}

export type View = { at: P3; to: P3; fov: number; aspect: number }

/** A point seen from a view: -1..1 across (right is positive) and up, and how far it is. */
export function seenFrom(view: View, p: P3): { x: number; y: number; far: number } {
  const f = norm(sub(view.to, view.at)), r = norm({ x: -f.z, y: 0, z: f.x }), u = cross(r, f)
  const d = sub(p, view.at), far = dot(d, f), t = Math.tan((view.fov * D2R) / 2)
  return { x: dot(d, r) / (far * t * view.aspect), y: dot(d, u) / (far * t), far }
}

export const childView = (width: number, height: number): View => ({ at: CAMERA.at, to: CAMERA.to, fov: fieldOfView(width, height), aspect: width / Math.max(1, height) })

/** A surface point carried onto the plane z = `z`. */
export function onPlane(view: View, sx: number, sy: number, width: number, height: number, z: number): P3 {
  const f = norm(sub(view.to, view.at)), r = norm({ x: -f.z, y: 0, z: f.x }), u = cross(r, f), t = Math.tan((view.fov * D2R) / 2)
  const a = ((sx / width) * 2 - 1) * t * view.aspect, b = (1 - (sy / height) * 2) * t
  const d = { x: f.x + r.x * a + u.x * b, y: f.y + r.y * a + u.y * b, z: f.z + r.z * a + u.z * b }, k = (z - view.at.z) / d.z
  return { x: view.at.x + d.x * k, y: view.at.y + d.y * k, z }
}

/** A point in a sitter's own axes, for a sitter whose foot is at `at` and turn is `turn`. */
export function inRoom(at: P3, turn: Turn | number, x: number, y: number, z: number): P3 {
  const a = (turn * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a)
  return { x: at.x + x * c + z * s, y: at.y + y, z: at.z - x * s + z * c }
}

export const headOf = (id: Id): number => FIGURES[id].head.y + STAND.h

const sub = (a: P3, b: P3): P3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const dot = (a: P3, b: P3): number => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: P3, b: P3): P3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
const norm = (a: P3): P3 => { const l = Math.hypot(a.x, a.y, a.z); return { x: a.x / l, y: a.y / l, z: a.z / l } }
