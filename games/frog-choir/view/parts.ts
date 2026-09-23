import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Characters and props are built from primitives once, painted with flat
// vertex colours, and merged: one draw call per rigid prop, and one per
// character, whose parts are bound rigidly to bones so squash, blinks,
// throat bubbles, and limbs are bone transforms.

export type Paint = (position: THREE.Vector3, normal: THREE.Vector3, out: THREE.Color) => void

export type Part = {
  geometry: THREE.BufferGeometry
  paint: Paint
  bone: number
  outline: boolean
  /** Sway weight per vertex (reeds). */
  sway?: (position: THREE.Vector3) => number
}

export type Placement = {
  position?: readonly [number, number, number]
  scale?: number | readonly [number, number, number]
  rotation?: readonly [number, number, number]
  order?: THREE.EulerOrder
  quaternion?: THREE.Quaternion
}

const tmpColor = new THREE.Color()

export function flat(color: string): Paint {
  const linear = new THREE.Color(color)
  return (_, __, out) => out.copy(linear)
}

/** Lighter underneath (bellies) or on top, blended by the vertex height in part space. */
export function twoTone(top: string, bottom: string, split: number, softness = 0.06): Paint {
  const a = new THREE.Color(top)
  const b = new THREE.Color(bottom)
  return (position, _, out) => {
    const k = THREE.MathUtils.smoothstep(position.y, split - softness, split + softness)
    out.copy(b).lerp(a, k)
  }
}

export function part(geometry: THREE.BufferGeometry, paint: Paint | string, placement: Placement = {}, bone = 0, outline = true): Part {
  const g = geometry.clone()
  const matrix = new THREE.Matrix4()
  const scale = placement.scale ?? 1
  matrix.compose(
    new THREE.Vector3(...(placement.position ?? [0, 0, 0])),
    placement.quaternion ?? new THREE.Quaternion().setFromEuler(new THREE.Euler(...(placement.rotation ?? [0, 0, 0]), placement.order ?? 'XYZ')),
    typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : new THREE.Vector3(...scale),
  )
  g.applyMatrix4(matrix)
  return { geometry: g, paint: typeof paint === 'string' ? flat(paint) : paint, bone, outline }
}

/** Paint in part-local space before placing: the paint sees the primitive's own coordinates. */
export function paintedPart(geometry: THREE.BufferGeometry, paint: Paint, placement: Placement = {}, bone = 0, outline = true): Part {
  const g = geometry.clone()
  bake(g, paint)
  const placed = part(g, flat('#ffffff'), placement, bone, outline)
  placed.paint = keep
  return placed
}

const keep: Paint = () => {}

function bake(g: THREE.BufferGeometry, paint: Paint): void {
  const position = g.getAttribute('position')
  const normal = g.getAttribute('normal')
  const colors = new Float32Array(position.count * 3)
  const p = new THREE.Vector3()
  const n = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i)
    n.fromBufferAttribute(normal, i)
    paint(p, n, tmpColor)
    colors[i * 3] = tmpColor.r
    colors[i * 3 + 1] = tmpColor.g
    colors[i * 3 + 2] = tmpColor.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

export type MergeOptions = { skin?: boolean; sway?: boolean; outlineOnly?: boolean }

/** Merge parts into one geometry with colours (and bone weights, and sway weights). */
export function mergeParts(parts: readonly Part[], options: MergeOptions = {}): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  for (const piece of parts) {
    if (options.outlineOnly && !piece.outline) continue
    const g = piece.geometry.clone()
    if (piece.paint !== keep) bake(g, piece.paint)
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(name)) g.deleteAttribute(name)
    const count = g.getAttribute('position').count
    if (options.skin) {
      const indices = new Uint16Array(count * 4)
      const weights = new Float32Array(count * 4)
      for (let i = 0; i < count; i++) {
        indices[i * 4] = piece.bone
        weights[i * 4] = 1
      }
      g.setAttribute('skinIndex', new THREE.BufferAttribute(indices, 4))
      g.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4))
    }
    if (options.sway) {
      const position = g.getAttribute('position')
      const sway = new Float32Array(count)
      const p = new THREE.Vector3()
      for (let i = 0; i < count; i++) sway[i] = piece.sway ? piece.sway(p.fromBufferAttribute(position, i)) : 0
      g.setAttribute('sway', new THREE.BufferAttribute(sway, 1))
    }
    pieces.push(g)
  }
  const indexed = pieces.map((g) => (g.index ? g : indexify(g)))
  const merged = mergeGeometries(indexed, false)
  if (!merged) throw new Error('mergeParts: incompatible parts')
  merged.computeBoundingSphere()
  return merged
}

function indexify(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const count = g.getAttribute('position').count
  const index = new Uint32Array(count)
  for (let i = 0; i < count; i++) index[i] = i
  g.setIndex(new THREE.BufferAttribute(index, 1))
  return g
}

// Shared primitives, built once per page.
const cache = new Map<string, THREE.BufferGeometry>()

function once(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = cache.get(key)
  if (!g) {
    g = make()
    cache.set(key, g)
  }
  return g
}

export const shapes = {
  sphere: (detail = 1) => once(`sphere-${detail}`, () => new THREE.SphereGeometry(1, 12 + detail * 6, 8 + detail * 5)),
  /** For parts a few pixels across: toes, highlights, warts. */
  tiny: () => once('tiny', () => new THREE.SphereGeometry(1, 8, 6)),
  capsule: () => once('capsule', () => new THREE.CapsuleGeometry(0.5, 1, 4, 10)),
  cylinder: () => once('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 10, 1)),
  cone: () => once('cone', () => new THREE.ConeGeometry(1, 1, 14, 3)),
  /** A cut cone: a cap's crown. Used with `stick`, so its radius is set by the stick's radius. */
  frustum: () => once('frustum', () => new THREE.CylinderGeometry(0.12, 0.25, 1, 14, 1)),
  torus: () => once('torus', () => new THREE.TorusGeometry(1, 0.22, 8, 22)),
  smile: () => once('smile', () => new THREE.TorusGeometry(1, 0.1, 6, 18, Math.PI * 0.72)),
  /** The upper half of a sphere: an eyelid shell. */
  lid: () => once('lid', () => new THREE.SphereGeometry(1, 18, 7, 0, Math.PI * 2, 0, Math.PI / 2)),
}

/** A cylinder of `radius` from `a` to `b`, for stems and sticks. */
export function stick(a: readonly [number, number, number], b: readonly [number, number, number], radius: number): Placement {
  const from = new THREE.Vector3(...a)
  const to = new THREE.Vector3(...b)
  const direction = to.clone().sub(from)
  const length = direction.length()
  const mid = from.add(to).multiplyScalar(0.5)
  return {
    position: [mid.x, mid.y, mid.z],
    scale: [radius, length, radius],
    quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
  }
}
