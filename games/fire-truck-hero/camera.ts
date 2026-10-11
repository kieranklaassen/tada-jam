// Where the camera stands, for every size of surface. It is apart from the
// stage so that a test can ask where a place of the yard comes on the screen
// without a renderer (ART.md, "The scene").

import * as THREE from 'three'
import { COLS, ROWS } from './ground'
import { GATE, TRUCK } from './layout'

/** What the camera looks at, and from where: over the near edge of the yard, well above it. */
const LOOK_AT = new THREE.Vector3(COLS / 2, 0.5, ROWS / 2 - 0.6)
const CAMERA_PITCH = (55 * Math.PI) / 180
export const CAMERA_FOV = 26

/** The corners the camera keeps in view at every size of surface. */
const KEEP_IN_VIEW: readonly THREE.Vector3[] = [
  // The sand, corner to corner. The hedges at the sides may run off the surface.
  new THREE.Vector3(-0.2, 0, 9.6), new THREE.Vector3(COLS + 0.2, 0, 9.6),
  new THREE.Vector3(-0.2, 0, 0), new THREE.Vector3(COLS + 0.2, 0, 0),
  // The top of the gate's tall post, and the truck's roof.
  new THREE.Vector3(GATE.x + GATE.half, 3.3, GATE.z), new THREE.Vector3(TRUCK.x - 1.6, 2.8, TRUCK.z),
]

const projected = new THREE.Vector3()

function fits(camera: THREE.PerspectiveCamera): boolean {
  camera.updateMatrixWorld()
  for (const corner of KEEP_IN_VIEW) {
    projected.copy(corner).project(camera)
    if (Math.abs(projected.x) > 0.97 || projected.y > 0.95 || projected.y < -0.99) return false
  }
  return true
}

/** Stands the camera for a surface of this size: it backs off until the whole yard is in view. A wide surface is bound by its height, a tall one by its width. */
export function frameCamera(camera: THREE.PerspectiveCamera, width: number, height: number): void {
  camera.aspect = width / Math.max(1, height)
  camera.updateProjectionMatrix()
  for (let far = 14; far < 90; far *= 1.03) {
    camera.position.set(LOOK_AT.x, LOOK_AT.y + Math.sin(CAMERA_PITCH) * far, LOOK_AT.z + Math.cos(CAMERA_PITCH) * far)
    camera.lookAt(LOOK_AT)
    if (fits(camera)) break
  }
}
