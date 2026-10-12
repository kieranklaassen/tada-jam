import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// A small kit for building the folk and the rocks out of rounded lumps: each
// lump is a ball, a rod or a cone with its own colour, set in place and then
// merged into one mesh, so a body with ten parts is one draw.

export type Rgb = readonly [number, number, number]

type Place = {
  at?: readonly [number, number, number]
  /** Turns about x, y and z, in radians, applied in that order. */
  turn?: readonly [number, number, number]
  scale?: readonly [number, number, number]
  /** A second colour for the top of the lump; the first is its bottom. */
  top?: Rgb
}

const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler(), position = new THREE.Vector3(), scale = new THREE.Vector3()

export class Lumps {
  private readonly parts: THREE.BufferGeometry[] = []

  ball(radius: number, colour: Rgb, place: Place = {}, detail = 14): this {
    return this.add(new THREE.SphereGeometry(radius, detail, Math.max(6, Math.round(detail * 0.7))), colour, place)
  }

  rod(radius: number, length: number, colour: Rgb, place: Place = {}, detail = 10): this {
    return this.add(new THREE.CapsuleGeometry(radius, length, 3, detail), colour, place)
  }

  cone(radius: number, height: number, colour: Rgb, place: Place = {}, detail = 10): this {
    return this.add(new THREE.ConeGeometry(radius, height, detail), colour, place)
  }

  /** An open tube, wider at one end: the wall of a bucket. */
  tube(top: number, bottom: number, height: number, colour: Rgb, place: Place = {}, detail = 20): this {
    return this.add(new THREE.CylinderGeometry(top, bottom, height, detail, 1, true), colour, place)
  }

  /** A flat round plate, facing up. */
  disc(radius: number, colour: Rgb, place: Place = {}, detail = 20): this {
    return this.add(new THREE.CircleGeometry(radius, detail).rotateX(-Math.PI / 2), colour, place)
  }

  /** Part of a hoop standing upright: a handle. */
  arc(radius: number, thick: number, sweep: number, colour: Rgb, place: Place = {}): this {
    return this.add(new THREE.TorusGeometry(radius, thick, 6, 16, sweep), colour, place)
  }

  /** A lumpy rock: a ball with few faces, each face shaded flat. */
  rock(radius: number, colour: Rgb, place: Place = {}): this {
    return this.add(new THREE.IcosahedronGeometry(radius, 1), colour, place, true)
  }

  private add(source: THREE.BufferGeometry, colour: Rgb, place: Place, flat = false): this {
    // Every lump is unindexed, so lumps of any kind merge.
    const geometry = source.index ? source.toNonIndexed() : source
    if (geometry !== source) source.dispose()
    const count = geometry.getAttribute('position').count
    const colours = new Float32Array(count * 3)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const positions = geometry.getAttribute('position')
    for (let i = 0; i < count; i++) {
      const t = place.top ? (positions.getY(i) - box.min.y) / Math.max(1e-6, box.max.y - box.min.y) : 0
      for (let c = 0; c < 3; c++) colours[i * 3 + c] = place.top ? colour[c] + (place.top[c] - colour[c]) * t : colour[c]
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
    geometry.deleteAttribute('uv')
    const [tx, ty, tz] = place.turn ?? [0, 0, 0]
    quaternion.setFromEuler(euler.set(tx, ty, tz))
    position.fromArray(place.at ?? [0, 0, 0])
    scale.fromArray(place.scale ?? [1, 1, 1])
    geometry.applyMatrix4(matrix.compose(position, quaternion, scale))
    // A round lump keeps the smooth normals it was made with; a rock takes one normal a face.
    if (flat) geometry.computeVertexNormals()
    this.parts.push(geometry)
    return this
  }

  /** All the lumps as one geometry. The kit is used up. */
  build(): THREE.BufferGeometry {
    const merged = mergeGeometries(this.parts, false)
    for (const part of this.parts) part.dispose()
    this.parts.length = 0
    return merged
  }
}
