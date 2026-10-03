import { PerspectiveCamera, Vector3 } from 'three'
import { FRAME } from '../places'

// The camera looks into the cabinet from the front and above, as a child
// stands at a claw machine, and backs off until the whole cabinet is in the
// frame, whatever the shape of the surface.

const PITCH = (37 * Math.PI) / 180
const FOV = 26

/** What has to stay in frame: the front of the tray's floor, and the top of what stands at the back. */
const KEY_POINTS: readonly Vector3[] = [
  new Vector3(FRAME.minX, 0, FRAME.floorZ), new Vector3(FRAME.maxX, 0, FRAME.floorZ),
  new Vector3(FRAME.minX, FRAME.top, FRAME.topZ), new Vector3(FRAME.maxX, FRAME.top, FRAME.topZ),
  new Vector3(FRAME.minX, 0, -9), new Vector3(FRAME.maxX, 0, -9),
  // The claw at its highest, carrying a tall toy over a gobbler.
  new Vector3(0, 19, -4.5),
]

const forward = new Vector3(0, -Math.sin(PITCH), -Math.cos(PITCH))
const up = new Vector3(0, Math.cos(PITCH), -Math.sin(PITCH))
const right = new Vector3(1, 0, 0)
const scratch = new Vector3()

export function fitCamera(camera: PerspectiveCamera, aspect: number): void {
  camera.fov = FOV
  camera.aspect = aspect
  const tanV = Math.tan((FOV * Math.PI) / 360), tanH = tanV * aspect
  // The view is centred on a point `shift` up the camera's own up axis. For a given shift, the distance is the
  // least that holds every key point inside the frame; for a given distance, the shift is the one that leaves
  // as much room above the highest point as below the lowest. A few rounds settle both.
  const distanceFor = (shift: number): number => {
    let distance = 1
    for (const point of KEY_POINTS) {
      scratch.copy(point).addScaledVector(up, -shift)
      const along = scratch.dot(forward)
      distance = Math.max(distance, Math.abs(scratch.dot(right)) / tanH - along, Math.abs(scratch.dot(up)) / tanV - along)
    }
    return distance
  }
  let shift = 0, distance = distanceFor(0)
  for (let pass = 0; pass < 12; pass++) {
    let low = Infinity, high = -Infinity
    for (const point of KEY_POINTS) {
      scratch.copy(point).addScaledVector(up, -shift)
      const rise = scratch.dot(up) / ((distance + scratch.dot(forward)) * tanV)
      low = Math.min(low, rise); high = Math.max(high, rise)
    }
    shift += ((low + high) / 2) * distance * tanV * 0.9
    distance = distanceFor(shift)
  }
  camera.position.copy(up).multiplyScalar(shift).addScaledVector(forward, -distance)
  camera.up.copy(up)
  camera.lookAt(scratch.copy(up).multiplyScalar(shift))
  camera.near = Math.max(1, distance - 40)
  camera.far = distance + 60
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}
