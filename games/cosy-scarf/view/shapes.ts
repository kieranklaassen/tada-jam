import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Geometry helpers for stuffed, crocheted shapes. Every primitive comes out
// with UVs scaled so one crochet tile (four stitches) covers the same world
// size on every part, rows running around the form like real amigurumi
// rounds. `part()` places and paints a primitive (vertex colours with baked
// contact and underside occlusion, plus bead and blush masks) so a whole
// prop or body part merges into one mesh and one draw call.

const TILE_STITCHES = 4

function scaleUv(geometry: THREE.BufferGeometry, around: number, along: number, stitch: number): THREE.BufferGeometry {
  const uv = geometry.attributes.uv
  const su = Math.max(1, Math.round(around / (stitch * TILE_STITCHES)))
  const sv = Math.max(0.25, along / (stitch * TILE_STITCHES))
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv)
  return geometry
}

export function ball(radius: number, stitch = 1.2, segments = 22): THREE.BufferGeometry {
  return scaleUv(new THREE.SphereGeometry(radius, segments, Math.round(segments * 0.7)), Math.PI * 2 * radius, Math.PI * radius, stitch)
}

/** The egg's outline from its bottom (y 0) to its top: radius as x, height as y. */
export function eggProfile(radius: number, height: number, bottomFlat = 0.35): THREE.Vector2[] {
  const points: THREE.Vector2[] = []
  const rows = 14
  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    const angle = -Math.PI / 2 + t * Math.PI
    const r = Math.cos(angle) * radius * (1 + 0.12 * Math.cos(angle * 2 + 0.6)) * (t < 0.5 ? 1 : 1 - (t - 0.5) * 0.25)
    let y = (Math.sin(angle) * 0.5 + 0.5) * height
    if (t < 0.25) y *= 1 - bottomFlat * (1 - t / 0.25)
    points.push(new THREE.Vector2(Math.max(0.001, r), y))
  }
  return points
}

/** An egg standing on end (a lathe), wider low: the stuffed amigurumi body. */
export function egg(radius: number, height: number, stitch = 1.2, bottomFlat = 0.35, segments = 22): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry(eggProfile(radius, height, bottomFlat), segments)
  return scaleUv(geometry, Math.PI * 2 * radius, height * 1.3, stitch)
}

export function capsule(radius: number, length: number, stitch = 1.2): THREE.BufferGeometry {
  return scaleUv(new THREE.CapsuleGeometry(radius, length, 5, 12), Math.PI * 2 * radius, length + Math.PI * radius, stitch)
}

export function cone(radius: number, height: number, stitch = 1.2, segments = 16): THREE.BufferGeometry {
  return scaleUv(new THREE.ConeGeometry(radius, height, segments, 3), Math.PI * 2 * radius, Math.hypot(radius, height), stitch)
}

export function cylinder(radiusTop: number, radiusBottom: number, height: number, stitch = 1.2, segments = 14): THREE.BufferGeometry {
  return scaleUv(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 2), Math.PI * 2 * Math.max(radiusTop, radiusBottom), height, stitch)
}

export function torus(radius: number, tube: number, stitch = 1.2, arc = Math.PI * 2): THREE.BufferGeometry {
  const geometry = new THREE.TorusGeometry(radius, tube, 10, 36, arc)
  const uv = geometry.attributes.uv
  // Torus UVs run u around the ring and v around the tube: swap so crochet rounds follow the ring.
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i))
  return scaleUv(geometry, Math.PI * 2 * tube, radius * arc, stitch)
}

export function lathe(profile: [number, number][], stitch = 1.2, segments = 24): THREE.BufferGeometry {
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y))
  let length = 0
  let widest = 0
  for (let i = 0; i < points.length; i++) {
    widest = Math.max(widest, points[i].x)
    if (i > 0) length += points[i].distanceTo(points[i - 1])
  }
  return scaleUv(new THREE.LatheGeometry(points, segments), Math.PI * 2 * widest, length, stitch)
}

export type ColorFn = (p: THREE.Vector3, n: THREE.Vector3) => THREE.ColorRepresentation

export type PartOptions = {
  color: THREE.ColorRepresentation | ColorFn
  at?: [number, number, number]
  rot?: [number, number, number]
  scale?: number | [number, number, number]
  bead?: boolean
  blush?: boolean
  /** Darken vertices near this height (after placement): contact occlusion without an AO pass. */
  ground?: number | null
  occlusion?: number
  /** How much downward-facing surfaces darken (baked sky occlusion). */
  underside?: number
}

const scratchP = new THREE.Vector3()
const scratchN = new THREE.Vector3()
const scratchC = new THREE.Color()

/** Place and paint one primitive. */
export function part(source: THREE.BufferGeometry, options: PartOptions): THREE.BufferGeometry {
  const g = source.index ? source.toNonIndexed() : source.clone()
  const position = g.attributes.position
  const normal = g.attributes.normal
  const colors = new Float32Array(position.count * 3)
  const flat = typeof options.color === 'function' ? null : new THREE.Color(options.color)
  for (let i = 0; i < position.count; i++) {
    if (flat) scratchC.copy(flat)
    else scratchC.set((options.color as ColorFn)(scratchP.fromBufferAttribute(position, i), scratchN.fromBufferAttribute(normal, i)))
    colors[i * 3] = scratchC.r
    colors[i * 3 + 1] = scratchC.g
    colors[i * 3 + 2] = scratchC.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const s = options.scale ?? 1
  const scale = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s)
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...(options.at ?? [0, 0, 0])),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...(options.rot ?? [0, 0, 0]))),
    scale,
  )
  g.applyMatrix4(matrix)
  const ground = options.ground === undefined ? null : options.ground
  const occlusion = options.occlusion ?? 0.35
  const underside = options.underside ?? 0.22
  for (let i = 0; i < position.count; i++) {
    let shade = 1 - underside * Math.max(0, -normal.getY(i))
    if (ground !== null) shade *= 1 - occlusion * (1 - THREE.MathUtils.smoothstep(position.getY(i) - ground, 0, 2.6))
    colors[i * 3] *= shade
    colors[i * 3 + 1] *= shade
    colors[i * 3 + 2] *= shade
  }
  g.setAttribute('aBead', new THREE.BufferAttribute(new Float32Array(position.count).fill(options.bead ? 1 : 0), 1))
  g.setAttribute('aBlush', new THREE.BufferAttribute(new Float32Array(position.count).fill(options.blush ? 1 : 0), 1))
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(position.count * 2), 2))
  return g
}

const KEEP = ['position', 'normal', 'uv', 'color', 'aBead', 'aBlush']

export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  for (const g of parts) for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name)
  const merged = mergeGeometries(parts, false)
  if (!merged) throw new Error('cosy-scarf: could not merge parts')
  for (const g of parts) g.dispose()
  merged.computeBoundingSphere()
  return merged
}

/** A bead eye with a white shine: two parts to merge into a head. */
export function beadEye(at: [number, number, number], radius: number, facing: [number, number, number]): THREE.BufferGeometry[] {
  const [fx, fy, fz] = facing
  const shine: [number, number, number] = [at[0] + fx * radius * 0.7 + radius * 0.35, at[1] + fy * radius * 0.7 + radius * 0.4, at[2] + fz * radius * 0.7]
  return [
    part(new THREE.SphereGeometry(radius, 12, 9), { color: '#1b1614', at, bead: true, underside: 0 }),
    part(new THREE.SphereGeometry(radius * 0.32, 8, 6), { color: '#ffffff', at: shine, bead: true, underside: 0 }),
  ]
}

/** Build a merged geometry once per page: remounting must not stall a frame. */
const built = new Map<string, unknown>()
export function once<T>(key: string, make: () => T): T {
  if (!built.has(key)) built.set(key, make())
  return built.get(key) as T
}
