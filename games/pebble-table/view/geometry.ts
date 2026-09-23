import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { pebbleRings, stoneVertices, type Cut } from '../stoneShape'
import { BOWL_PROFILE, DISH_PROFILE, PLATE_PROFILE } from '../surfaces'

// Primitive and lathe shapes for Pebble Table's props, cached by key. Big,
// simple silhouettes are part of the jam quality bar (docs/art-direction.md).

const cache = new Map<string, THREE.BufferGeometry>()

function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let geometry = cache.get(key)
  if (!geometry) {
    geometry = make()
    cache.set(key, geometry)
  }
  return geometry
}

export function sphere(segments: number): THREE.BufferGeometry {
  return cached(`sphere:${segments}`, () => new THREE.SphereGeometry(1, segments, Math.max(4, Math.round(segments * 0.66))))
}

export function cylinder(segments: number, top = 1, bottom = 1): THREE.BufferGeometry {
  return cached(`cyl:${segments}:${top}:${bottom}`, () => new THREE.CylinderGeometry(top, bottom, 1, segments))
}

export function capsule(segments: number): THREE.BufferGeometry {
  return cached(`capsule:${segments}`, () => new THREE.CapsuleGeometry(0.5, 1, Math.max(2, Math.round(segments / 4)), segments))
}

export function roundedBox(segments: number, radius = 0.08): THREE.BufferGeometry {
  return cached(`rbox:${segments}:${radius}`, () => new RoundedBoxGeometry(1, 1, 1, Math.max(1, Math.round(segments / 8)), radius))
}

export function torus(segments: number, tube = 0.12): THREE.BufferGeometry {
  return cached(`torus:${segments}:${tube}`, () => new THREE.TorusGeometry(1, tube, Math.max(4, Math.round(segments / 3)), segments))
}

function stone(segments: number, cut: Cut): THREE.BufferGeometry {
  return cached(`stone:${cut}:${segments}`, () => {
    const geometry = new THREE.SphereGeometry(1, segments, pebbleRings(segments))
    const position = geometry.attributes.position
    position.array.set(stoneVertices(cut, segments))
    geometry.computeVertexNormals()
    const colors = new Float32Array(position.count * 3)
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i)
      const shade = y < 0 ? 0.72 + (y + 0.3) * 0.6 : 0.9 + y * 0.28
      colors.set([shade, shade * 0.98, shade * 0.96], i * 3)
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  })
}

/** A pebble: a squashed sphere with a slightly flattened belly, unit radius (see stoneShape.ts). */
export function pebble(segments: number): THREE.BufferGeometry {
  return stone(segments, 'whole')
}

function lathe(key: string, points: readonly (readonly [number, number])[], segments: number): THREE.BufferGeometry {
  return cached(`lathe:${key}:${segments}`, () => {
    const geometry = new THREE.LatheGeometry(
      points.map(([x, y]) => new THREE.Vector2(x, y)),
      segments,
    )
    geometry.computeVertexNormals()
    return geometry
  })
}

/** Bowl: a deep flared body with a rolled lip, unit radius at the inner rim (surfaces.ts). */
export function bowl(segments: number): THREE.BufferGeometry {
  return lathe('bowl-deep', BOWL_PROFILE, segments)
}

/** A pebble cut in half (keep = 'half') or in quarters: the cut faces are flat, so the piece reads as part of a stone. */
export function cutPebble(segments: number, keep: 'half' | 'quarter'): THREE.BufferGeometry {
  return stone(segments, keep)
}

/** A shallow scale pan with a lip, unit radius (surfaces.ts). */
export function dish(segments: number): THREE.BufferGeometry {
  return lathe('dish', DISH_PROFILE, segments)
}

/** A plate with a raised rim, unit radius (surfaces.ts). */
export function plate(segments: number): THREE.BufferGeometry {
  return lathe('plate', PLATE_PROFILE, segments)
}

/** The cloth bag: round bottom, gathered neck, ruffled top; unit radius, about 1.25 tall. */
export function sack(segments: number): THREE.BufferGeometry {
  return cached(`sack:${segments}`, () => {
    const profile: [number, number][] = [
      [0, 0],
      [0.55, 0.03],
      [0.9, 0.2],
      [1.0, 0.45],
      [0.92, 0.72],
      [0.62, 0.92],
      [0.4, 1.0],
      [0.42, 1.06],
      [0.58, 1.18],
      [0.62, 1.24],
      [0.54, 1.24],
      [0.36, 1.1],
    ]
    const smooth = new THREE.SplineCurve(profile.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(56)
    const geometry = new THREE.LatheGeometry(smooth, segments)
    const position = geometry.attributes.position
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const z = position.getZ(i)
      const y = position.getY(i)
      const angle = Math.atan2(z, x)
      const folds = 1 + Math.sin(angle * 7) * 0.035 * Math.min(1, y) + Math.sin(angle * 13 + y * 4) * 0.015
      const slump = 1 + Math.max(0, 0.5 - y) * 0.12
      position.setX(i, x * folds * slump)
      position.setZ(i, z * folds * slump)
    }
    geometry.computeVertexNormals()
    return geometry
  })
}

/** A butter knife blade, flat, pointing along +x. */
export function blade(): THREE.BufferGeometry {
  return cached('blade', () => {
    const shape = new THREE.Shape()
    shape.moveTo(0, -0.5)
    shape.lineTo(3.4, -0.5)
    shape.quadraticCurveTo(4.6, -0.1, 3.8, 0.5)
    shape.lineTo(0, 0.5)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.05, bevelSegments: 2 })
    geometry.rotateX(-Math.PI / 2)
    return geometry
  })
}

/** An elliptical tablecloth disc with a scalloped hem. */
export function cloth(segments: number): THREE.BufferGeometry {
  return cached(`cloth:${segments}`, () => {
    const shape = new THREE.Shape()
    const points = Math.max(48, segments * 4)
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2
      const scallop = 1 + Math.abs(Math.sin(a * 14)) * 0.02
      const x = Math.cos(a) * scallop
      const y = Math.sin(a) * scallop
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false })
    geometry.rotateX(-Math.PI / 2)
    return geometry
  })
}
