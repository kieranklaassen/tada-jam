import * as THREE from 'three'
import { rgb } from './palette'

// Builds one merged geometry out of simple rounded primitives, the way a
// picture-book painter builds a creature out of ovals. Every vertex
// carries its pigment (`tint`), which rigid part it belongs to (`part`),
// what it is (`kind`: 0 paint, 1 a home's doorway that can glow, 2 water),
// and for the ink hull a brushed line width (`ink`) that swells and thins
// with a smooth noise over the surface. Built once per page.

export type Vec3Tuple = readonly [number, number, number]

export type Piece = {
  at?: Vec3Tuple
  rot?: Vec3Tuple
  scale?: number | Vec3Tuple
  color: string
  part?: number
  /** Line width multiplier; 0 draws no ink for this piece. */
  ink?: number
  kind?: number
}

let unitShapes: ReturnType<typeof makeUnitShapes> | null = null

function makeUnitShapes() {
  const disc = new THREE.CircleGeometry(1, 20)
  const cone = new THREE.ConeGeometry(1, 1, 14, 1)
  cone.translate(0, 0.5, 0)
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 14, 1)
  cylinder.translate(0, 0.5, 0)
  const taper = new THREE.CylinderGeometry(0.7, 1, 1, 14, 1)
  taper.translate(0, 0.5, 0)
  return {
    sphere: new THREE.SphereGeometry(1, 18, 12),
    /** A lighter sphere for background tree crowns, where the ink line hides the facets. */
    crown: new THREE.SphereGeometry(1, 14, 10),
    ball: new THREE.SphereGeometry(1, 12, 8),
    dome: new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    cone,
    cylinder,
    taper,
    disc,
    torus: new THREE.TorusGeometry(1, 0.32, 8, 20),
    capsule: new THREE.CapsuleGeometry(0.5, 1, 4, 10),
  }
}

/** Unit primitives: sphere and crown radius 1; cone, cylinder, taper stand on y=0 with height 1; disc faces +z. */
export function shapes() {
  unitShapes ??= makeUnitShapes()
  return unitShapes
}

function hash(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}

function smoothNoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const uz = fz * fz * (3 - 2 * fz)
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k
  const x00 = lerp(hash(ix, iy, iz), hash(ix + 1, iy, iz), ux)
  const x10 = lerp(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), ux)
  const x01 = lerp(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), ux)
  const x11 = lerp(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), ux)
  return lerp(lerp(x00, x10, uy), lerp(x01, x11, uy), uz)
}

type Arrays = { position: number[]; normal: number[]; tint: number[]; part: number[]; kind: number[]; ink: number[]; index: number[] }

function arrays(): Arrays {
  return { position: [], normal: [], tint: [], part: [], kind: [], ink: [], index: [] }
}

const matrix = new THREE.Matrix4()
const normalMatrix = new THREE.Matrix3()
const euler = new THREE.Euler()
const quaternion = new THREE.Quaternion()
const scaleVector = new THREE.Vector3()
const offset = new THREE.Vector3()
const v = new THREE.Vector3()
const n = new THREE.Vector3()

/** One added piece's run of indices in a target, and where the piece sits. */
type Span = { start: number; end: number; x: number; y: number; z: number }

export class ShapeBuilder {
  private readonly fill = arrays()
  private readonly line = arrays()
  private readonly fillSpans: Span[] = []
  private readonly lineSpans: Span[] = []
  /** Scale of the line-width noise: larger values vary the brush line faster over the surface. */
  private readonly inkFrequency: number

  constructor(inkFrequency = 0.35) {
    this.inkFrequency = inkFrequency
  }

  add(geometry: THREE.BufferGeometry, piece: Piece): this {
    const s = piece.scale ?? 1
    scaleVector.set(typeof s === 'number' ? s : s[0], typeof s === 'number' ? s : s[1], typeof s === 'number' ? s : s[2])
    const r = piece.rot ?? [0, 0, 0]
    euler.set(r[0], r[1], r[2], 'YXZ')
    quaternion.setFromEuler(euler)
    const a = piece.at ?? [0, 0, 0]
    offset.set(a[0], a[1], a[2])
    matrix.compose(offset, quaternion, scaleVector)
    normalMatrix.getNormalMatrix(matrix)
    const [cr, cg, cb] = rgb(piece.color)
    const ink = piece.ink ?? 1
    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    const targets = ink > 0 ? [this.fill, this.line] : [this.fill]
    for (const target of targets) {
      const base = target.position.length / 3
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(matrix)
        n.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize()
        target.position.push(v.x, v.y, v.z)
        target.normal.push(n.x, n.y, n.z)
        target.tint.push(cr, cg, cb)
        target.part.push(piece.part ?? 0)
        target.kind.push(piece.kind ?? 0)
        const f = this.inkFrequency
        target.ink.push(ink * (0.45 + 1.1 * smoothNoise(v.x * f, v.y * f, v.z * f)))
      }
      const start = target.index.length
      const index = geometry.getIndex()
      if (index) for (let i = 0; i < index.count; i++) target.index.push(base + index.getX(i))
      else for (let i = 0; i < position.count; i++) target.index.push(base + i)
      const spans = target === this.fill ? this.fillSpans : this.lineSpans
      spans.push({ start, end: target.index.length, x: a[0], y: a[1], z: a[2] })
    }
    return this
  }

  /**
   * Merge everything added. With `view` (the camera's forward direction), pieces are drawn nearest
   * first, so a fill-bound rasterizer's depth test rejects what they hide before shading it.
   */
  build(view?: THREE.Vector3): { fill: THREE.BufferGeometry; ink: THREE.BufferGeometry } {
    if (view) {
      nearFirst(this.fill, this.fillSpans, view)
      nearFirst(this.line, this.lineSpans, view)
    }
    return { fill: toGeometry(this.fill, false), ink: toGeometry(this.line, true) }
  }
}

function nearFirst(a: Arrays, spans: Span[], view: THREE.Vector3): void {
  const depth = (s: Span) => s.x * view.x + s.y * view.y + s.z * view.z
  const sorted = spans.slice().sort((p, q) => depth(p) - depth(q))
  const index = a.index.slice()
  let k = 0
  for (const s of sorted) for (let i = s.start; i < s.end; i++) a.index[k++] = index[i]
}

function toGeometry(a: Arrays, ink: boolean): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(a.position, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(a.normal, 3))
  geometry.setAttribute('part', new THREE.Float32BufferAttribute(a.part, 1))
  if (ink) geometry.setAttribute('ink', new THREE.Float32BufferAttribute(a.ink, 1))
  else {
    geometry.setAttribute('tint', new THREE.Float32BufferAttribute(a.tint, 3))
    geometry.setAttribute('kind', new THREE.Float32BufferAttribute(a.kind, 1))
  }
  const count = a.position.length / 3
  geometry.setIndex(count > 65535 ? new THREE.Uint32BufferAttribute(a.index, 1) : new THREE.Uint16BufferAttribute(a.index, 1))
  geometry.computeBoundingSphere()
  return geometry
}
