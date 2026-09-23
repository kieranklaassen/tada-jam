import * as THREE from 'three'
import { TRAY, trayToWorld, type Vec3 } from '../layout'

// The fixed playroom camera, looking down on the rug at the wall the way a
// child looks down at a toy shelf. It is solved per aspect so the whole
// build plane, the tray and the highest perch always fit the frame.

export const PITCH = THREE.MathUtils.degToRad(30)
export const FOV = 30
const FIT: readonly Vec3[] = [
  { x: -8.2, y: 0, z: 0.4 },
  { x: 8.2, y: 0, z: 0.4 },
  { x: -8.2, y: 8.5, z: -1.4 },
  { x: 8.2, y: 8.5, z: -1.4 },
  trayToWorld(-TRAY.halfX - 0.1, TRAY.halfZ + 0.2),
  trayToWorld(TRAY.halfX + 0.1, TRAY.halfZ + 0.2),
]
const MARGIN = 0.97

/** Solve the camera distance and height so every fit point lands inside the frame. */
export function fitCamera(camera: THREE.PerspectiveCamera, aspect: number): void {
  const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  const tanH = tanV * aspect
  const up = new THREE.Vector3(0, Math.cos(PITCH), -Math.sin(PITCH))
  const forward = new THREE.Vector3(0, -Math.sin(PITCH), -Math.cos(PITCH))
  const target = new THREE.Vector3(0, 4, 0)
  let distance = 30
  const position = new THREE.Vector3()
  const rel = new THREE.Vector3()
  for (let iteration = 0; iteration < 60; iteration++) {
    position.copy(target).addScaledVector(forward, -distance)
    let maxX = 0
    let minY = Infinity
    let maxY = -Infinity
    let depth = 0
    for (const p of FIT) {
      rel.set(p.x, p.y, p.z).sub(position)
      const z = rel.dot(forward)
      maxX = Math.max(maxX, Math.abs(rel.x) / (z * tanH))
      const ny = rel.dot(up) / (z * tanV)
      minY = Math.min(minY, ny)
      maxY = Math.max(maxY, ny)
      depth += z / FIT.length
    }
    const scale = Math.max(maxX, (maxY - minY) / 2) / MARGIN
    target.addScaledVector(up, ((maxY + minY) / 2) * depth * tanV * 0.8)
    distance *= 1 + (scale - 1) * 0.8
  }
  position.copy(target).addScaledVector(forward, -distance)
  camera.fov = FOV
  camera.aspect = aspect
  camera.near = 1
  camera.far = distance * 3
  camera.position.copy(position)
  camera.up.set(0, 1, 0)
  camera.lookAt(target)
  camera.updateProjectionMatrix()
}
