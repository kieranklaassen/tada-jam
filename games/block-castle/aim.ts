import { COLS, ROWS } from './blocks'
import { BASKET, HALF_LEVEL, placeX, placeZ } from './layout'

// Where a finger points, worked out from a ray through the camera. Pure
// geometry, so tests can aim without a renderer.
//
// A finger on the side of a tower means that tower: the ray is tried against
// the pile standing on each place before the rug behind it, so a block is set
// on top of what the child touches, not on the rug that shows past it.

export type Ray = { origin: [number, number, number]; dir: [number, number, number] }
export type Box = { min: [number, number, number]; max: [number, number, number] }

/** How far along the ray it enters the box, or null when it misses. */
export function hitBox(ray: Ray, box: Box): number | null {
  let near = 0, far = Infinity
  for (let axis = 0; axis < 3; axis++) {
    const o = ray.origin[axis], d = ray.dir[axis]
    if (Math.abs(d) < 1e-9) {
      if (o < box.min[axis] || o > box.max[axis]) return null
      continue
    }
    let a = (box.min[axis] - o) / d, b = (box.max[axis] - o) / d
    if (a > b) [a, b] = [b, a]
    near = Math.max(near, a)
    far = Math.min(far, b)
    if (near > far) return null
  }
  return near
}

/** Where the ray meets a level plane at height `y`, or null when it runs away from it. */
export function hitLevel(ray: Ray, y: number): [number, number, number] | null {
  if (Math.abs(ray.dir[1]) < 1e-9) return null
  const t = (y - ray.origin[1]) / ray.dir[1]
  if (t <= 0) return null
  return [ray.origin[0] + ray.dir[0] * t, y, ray.origin[2] + ray.dir[2] * t]
}

/** The space the basket and the blocks standing in it take up. */
export const BASKET_BOX: Box = {
  min: [BASKET.x - BASKET.wide / 2, 0, BASKET.z - BASKET.deep / 2],
  max: [BASKET.x + BASKET.wide / 2, BASKET.rim + 0.5, BASKET.z + BASKET.deep / 2],
}

export type Aim = { over: 'basket' } | { over: 'rug'; col: number; row: number }

/** The place of the rug nearest a point on the floor. */
export function placeNear(x: number, z: number): { col: number; row: number } {
  return {
    col: Math.max(0, Math.min(COLS - 1, Math.round(x - placeX(0)))),
    row: Math.max(0, Math.min(ROWS - 1, Math.round(z - placeZ(0)))),
  }
}

/**
 * What a carried block is over: the basket, or a place of the rug. `heights`
 * are the heights of the places in half levels, row by row. A ray that meets
 * nothing of the rug still gives the nearest place, so a block let go anywhere
 * lands somewhere.
 */
export function aimAt(ray: Ray, heights: readonly number[]): Aim {
  let best = Infinity
  let aim: Aim | null = null
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const high = heights[row * COLS + col]
      if (high <= 0) continue
      const x = placeX(col), z = placeZ(row)
      const t = hitBox(ray, { min: [x - 0.5, 0, z - 0.5], max: [x + 0.5, high * HALF_LEVEL, z + 0.5] })
      if (t !== null && t < best) {
        best = t
        aim = { over: 'rug', col, row }
      }
    }
  }
  const basket = hitBox(ray, BASKET_BOX)
  if (basket !== null && basket < best) return { over: 'basket' }
  if (aim) return aim
  const floor = hitLevel(ray, 0)
  if (!floor) return { over: 'rug', col: (COLS - 1) / 2, row: ROWS - 1 }
  return { over: 'rug', ...placeNear(floor[0], floor[2]) }
}

/** The nearest of some boxes the ray enters: its index and how far along the ray, or null. */
export function nearestBox(ray: Ray, boxes: readonly Box[]): { index: number; t: number } | null {
  let index = -1
  let nearest = Infinity
  for (let i = 0; i < boxes.length; i++) {
    const t = hitBox(ray, boxes[i])
    if (t !== null && t < nearest) { nearest = t; index = i }
  }
  return index < 0 ? null : { index, t: nearest }
}
