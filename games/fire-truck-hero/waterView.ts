// The water in the air as three.js draws it: every drop of drops.ts as one
// instance of one small ball, in one draw call. A drop is stretched along the
// way it flies, so a stream reads as a jet and a splash as a spray. Each
// instance has its colour: water is blue, and a blob thrown out of mud brown.

import * as THREE from 'three'
import { CAPACITY, type Drops } from './drops'
import { SAND, WATER } from './look'

/** A fast drop is drawn this many times longer than it is wide, at most. */
const MOST_STRETCH = 1.9

export type WaterView = {
  mesh: THREE.InstancedMesh
  /** Copies the drops onto the mesh. */
  show: (drops: Drops) => void
  dispose: () => void
}

/** `material` is white, since the colour of each drop is its own. */
export function buildWaterView(material: THREE.Material): WaterView {
  const ball = new THREE.IcosahedronGeometry(1, 1)
  const mesh = new THREE.InstancedMesh(ball, material, CAPACITY)
  mesh.name = 'water-drops'
  mesh.count = 0
  // The drops are all over the yard and their bounds are never made, so they are never culled.
  mesh.frustumCulled = false
  mesh.renderOrder = 2

  const matrix = new THREE.Matrix4()
  const place = new THREE.Vector3()
  const turn = new THREE.Quaternion()
  const size = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const way = new THREE.Vector3()
  const blue = new THREE.Color(WATER.body), brown = new THREE.Color(SAND.mud)
  // The colours are there from the start, so the program the first frame makes is the one every frame uses.
  mesh.setColorAt(0, blue)

  return {
    mesh,
    show: (drops) => {
      let count = 0
      drops.each((x, y, z, vx, vy, vz, radius, mud) => {
        const speed = Math.hypot(vx, vy, vz)
        const stretch = Math.min(MOST_STRETCH, 1 + speed * 0.03)
        if (speed > 0.001) turn.setFromUnitVectors(up, way.set(vx / speed, vy / speed, vz / speed))
        else turn.identity()
        // Longer along its way and thinner across, so it keeps its bulk.
        const across = radius / Math.sqrt(stretch)
        matrix.compose(place.set(x, y, z), turn, size.set(across, radius * stretch, across))
        mesh.setColorAt(count, mud ? brown : blue)
        mesh.setMatrixAt(count++, matrix)
      })
      mesh.count = count
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    },
    dispose: () => ball.dispose(),
  }
}
