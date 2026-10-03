import * as THREE from 'three'
import type { Shape } from '../shapes'

/** Wraps a shape's arrays in a geometry, moved so that `pivot` is its origin. */
export function toGeometry(shape: Shape, pivot: readonly [number, number, number] = [0, 0, 0]): THREE.BufferGeometry {
  const position = Float32Array.from(shape.position)
  if (pivot[0] || pivot[1] || pivot[2]) for (let i = 0; i < position.length; i += 3) {
    position[i] -= pivot[0]; position[i + 1] -= pivot[1]; position[i + 2] -= pivot[2]
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(shape.normal), 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(Float32Array.from(shape.color), 3))
  geometry.setAttribute('surface', new THREE.BufferAttribute(Float32Array.from(shape.surface), 2))
  geometry.computeBoundingSphere()
  geometry.computeBoundingBox()
  return geometry
}
