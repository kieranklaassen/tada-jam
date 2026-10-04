import * as THREE from 'three'

// Where the camera stands: down the tray from the child's side. In a file of
// its own so that what a finger points at can be worked out, and tested,
// without a renderer.

const EYE = new THREE.Vector3(0, 11.2, 11.6)
const AIM = new THREE.Vector3(0, 1.5, -0.35)
/** What must stay in frame: the tray with its rim, and room above for a toss. */
const FRAME_HALF_WIDTH = 6.9
/** The camera's field of view, in degrees. */
export const FIELD_OF_VIEW = 30

/** Stands the camera back until the tray fits across a surface of this shape, and aims it. */
export function placeCamera(camera: THREE.PerspectiveCamera, aspect: number): void {
  camera.aspect = aspect
  const direction = new THREE.Vector3().copy(EYE).sub(AIM)
  const base = direction.length()
  const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
  const needed = FRAME_HALF_WIDTH / (Math.tan(halfFov) * aspect)
  const distance = Math.max(base, needed + 3.4)
  camera.position.copy(AIM).addScaledVector(direction.normalize(), distance)
  camera.lookAt(AIM)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}
