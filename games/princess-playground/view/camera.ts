import * as THREE from 'three'
import { PLANK, TRAY } from '../world'

// Where the camera stands: down the tray from the child's side. In a file of
// its own so that what a finger points at can be worked out, and tested,
// without a renderer.

/** How steeply the camera looks down on the tray, in degrees: steep enough that the deep tray fills the frame, flat enough that the faces show. */
const PITCH = 46
/** The camera's field of view, in degrees. A long lens: the friends at the far rim are not much smaller than those in front. */
export const FIELD_OF_VIEW = 26
/** The height the camera aims at: about the friends' eyes. */
const AIM_HEIGHT = 1
/** The tray with its rim, as the frame must hold it. */
const HALF_WIDTH = TRAY.halfWidth + TRAY.rimThick
const HALF_DEPTH = TRAY.halfDepth + TRAY.rimThick
/** Room above the plank for a tower of four and a toss. */
const AIR = 6.8
/** How near the edges of the frame the tray and the air may come, as shares of the half frame: sides, bottom, top. */
const MARGIN = { side: 0.975, bottom: 0.94, top: 0.96 } as const

const point = new THREE.Vector3()

function stand(camera: THREE.PerspectiveCamera, distance: number, aimZ: number): void {
  const pitch = THREE.MathUtils.degToRad(PITCH)
  camera.position.set(0, AIM_HEIGHT + Math.sin(pitch) * distance, aimZ + Math.cos(pitch) * distance)
  camera.lookAt(0, AIM_HEIGHT, aimZ)
  camera.updateMatrixWorld()
}

/** Where a place in the tray falls in the frame: x and y from -1 to 1. */
function seen(camera: THREE.PerspectiveCamera, x: number, y: number, z: number): THREE.Vector3 {
  return point.set(x, y, z).project(camera)
}

/** The aim, along the tray, at which `height(camera)` is `wanted`; `height` rises as the aim comes toward the child. */
function aimFor(camera: THREE.PerspectiveCamera, distance: number, wanted: number, height: () => number): number {
  let low = -TRAY.halfDepth * 2, high = TRAY.halfDepth * 2
  for (let i = 0; i < 28; i++) {
    const mid = (low + high) / 2
    stand(camera, distance, mid)
    if (height() < wanted) low = mid
    else high = mid
  }
  return (low + high) / 2
}

/**
 * Stands the camera as near as it can be with the whole tray in the frame, whatever the shape of the surface: the
 * near rim just above the bottom edge, the sides inside the side edges, and the air above the plank below the top.
 * Where the frame is taller than that needs, the tray sits in the middle of what is left.
 */
export function placeCamera(camera: THREE.PerspectiveCamera, aspect: number): void {
  camera.aspect = aspect
  camera.updateProjectionMatrix()
  for (let distance = 10; distance <= 90; distance *= 1.01) {
    // The aim must come at least this far toward the child for the near rim to be in the frame,
    const nearest = aimFor(camera, distance, -MARGIN.bottom, () => seen(camera, 0, 0, HALF_DEPTH).y)
    // and no further than this, or the air above the plank is out of it.
    const furthest = aimFor(camera, distance, MARGIN.top, () => seen(camera, 0, AIR, PLANK.z).y)
    if (nearest > furthest) continue
    stand(camera, distance, (nearest + furthest) / 2)
    const wide = Math.max(Math.abs(seen(camera, HALF_WIDTH, 0, HALF_DEPTH).x), Math.abs(seen(camera, HALF_WIDTH, TRAY.rimHeight, -HALF_DEPTH).x), Math.abs(seen(camera, PLANK.halfLength, AIR, PLANK.z).x))
    if (wide <= MARGIN.side) return
  }
}
