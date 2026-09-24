import * as THREE from 'three'
import { COLS, E, N, ROWS, S, SPRING_COL, W, type Side } from '../layout'

// Grid space to world space. One cell is one unit across; each terrace row
// is a little less deep and one step lower than the row behind it. Row 0 is
// the highest and furthest; the camera looks up the hill from the creek.

export const CELL = 1
export const ROW_DEPTH = 0.95
export const STEP = 0.42
export const PIPE_Y = 0.17
export const CREEK_Y = -0.36
export const WALL_OUT = 0.035

export function cellX(c: number): number {
  return (c - (COLS - 1) / 2) * CELL
}

export function rowZ(r: number): number {
  return (r - (ROWS - 1) / 2) * ROW_DEPTH
}

export function floorY(r: number): number {
  return r >= ROWS ? CREEK_Y : (ROWS - 1 - r) * STEP
}

export function frontZ(r: number): number {
  return rowZ(r) + ROW_DEPTH / 2
}

export function backZ(r: number): number {
  return rowZ(r) - ROW_DEPTH / 2
}

export const GRID_LEFT = cellX(0) - CELL / 2
export const GRID_RIGHT = cellX(COLS - 1) + CELL / 2
/** Beyond the build grid each terrace rises gently toward the hillside, this much per unit outward. */
export const SIDE_RISE = 0.1
/** Either end of the terraces, the tanuki naps this far out past the grid. */
export const TANUKI_NAP_OUT = 0.62
/**
 * Circling there before it curls up, its head and wrapped tail sweep this far to either side of it, over the back of
 * its terrace and the tops of the bushes below its edge, so no bush or flowers grow there.
 */
export const TANUKI_CLEARING = 0.6

/** How far a terrace has risen at `x`: flat across the grid, rising beside it. */
export function sideRise(x: number): number {
  return Math.max(0, Math.abs(x) - GRID_RIGHT) * SIDE_RISE
}

/** The ground's height at (x, z): a terrace floor (its lawn runs out over the wall's top), or the creek in front. */
export function groundY(x: number, z: number): number {
  if (z > frontZ(ROWS - 1) + WALL_OUT) return CREEK_Y
  for (let r = ROWS - 1; r > 0; r--) if (z >= backZ(r) + WALL_OUT) return floorY(r) + sideRise(x)
  return floorY(0) + sideRise(x)
}

/** The spring's pool sits on a ledge behind the top terrace. */
export const SPRING = new THREE.Vector3(cellX(SPRING_COL), floorY(0) + 0.46, backZ(0) - 0.42)
/** Where its overflow leaves the ledge: a hair over the ledge's lawn, which rises gently behind the wall's top. */
export const SPRING_LIP = new THREE.Vector3(cellX(SPRING_COL), floorY(0) + 0.42, backZ(0) - 0.06)

/** The creek runs along the foot of the terraces; the rack lies on the near bank. */
export const CREEK_Z0 = frontZ(ROWS - 1) + 0.02
export const CREEK_Z1 = CREEK_Z0 + 0.62
export const BANK_Y = -0.2
export const RACK_Z = CREEK_Z1 + 0.6
export const RACK_Y = BANK_Y + 0.02
export const RACK_SPACING = 1.25
export const POND = new THREE.Vector3(cellX(0) - 0.9, CREEK_Y, CREEK_Z0 + 0.45)
/**
 * The pond's topmost lily pad, where the frog waits and hops from: in open water right of the reeds, in front of the
 * grid's left edge so it leaps the wall onto flat terrace, and far enough out from the bank below the wall that the
 * frog, facing it and crouching to leap, keeps its chin off it.
 */
export const FROG_PAD = { x: POND.x + 0.45, y: CREEK_Y + 0.024, z: POND.z, size: 0.21 }

export function rackX(slot: number, slots: number): number {
  return (slot - (slots - 1) / 2) * RACK_SPACING
}

/** Point on a cell at pipe height: an edge midpoint (side) or the centre. */
export function pipePoint(c: number, r: number, side: Side | 4, out: THREE.Vector3): THREE.Vector3 {
  const y = floorY(r) + PIPE_Y
  out.set(cellX(c), y, rowZ(r))
  if (side === N) out.z = backZ(r)
  else if (side === S) out.z = frontZ(r)
  else if (side === E) out.x += CELL / 2
  else if (side === W) out.x -= CELL / 2
  return out
}

export const cameraRig = {
  fov: 27,
  pitch: (37 * Math.PI) / 180,
  target: new THREE.Vector3(0, 1.25, 0.5),
  halfWidth: 5.0,
  halfHeight: 4.05,
}

/** Fits the fixed three-quarter camera to the surface so the whole garden and the rack are always in view. */
export function fitCamera(camera: THREE.PerspectiveCamera, width: number, height: number): void {
  const aspect = width / height
  const vHalf = THREE.MathUtils.degToRad(cameraRig.fov / 2)
  const hHalf = Math.atan(Math.tan(vHalf) * aspect)
  const distance = Math.max(cameraRig.halfWidth / Math.tan(hHalf), cameraRig.halfHeight / Math.tan(vHalf))
  camera.aspect = aspect
  camera.fov = cameraRig.fov
  camera.near = 1
  camera.far = distance + 40
  const t = cameraRig.target
  camera.position.set(t.x, t.y + Math.sin(cameraRig.pitch) * distance, t.z + Math.cos(cameraRig.pitch) * distance)
  camera.lookAt(t)
  camera.updateProjectionMatrix()
}
