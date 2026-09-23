import * as THREE from 'three'
import { uvRect, type RegionName } from './paint'

// A small mesh builder: quads and shapes pushed into flat arrays, each
// mapped into a painted atlas region and tinted by a baked vertex colour,
// then turned into one BufferGeometry. Static scenery becomes one draw call.

const tmp = new THREE.Color()

/** Wraps a UV into 0..1 but keeps an exact 1 as 1, so a primitive's far edge doesn't fold back to 0. */
function wrap(x: number): number {
  return x > 0 && x % 1 === 0 ? 1 : x - Math.floor(x)
}

export class MeshBuilder {
  readonly positions: number[] = []
  readonly normals: number[] = []
  readonly uvs: number[] = []
  readonly colours: number[] = []
  readonly extra: number[] = []
  readonly indices: number[] = []

  get vertexCount(): number {
    return this.positions.length / 3
  }

  vertex(p: THREE.Vector3, n: THREE.Vector3, u: number, v: number, colour: THREE.Color, extra = 0): number {
    this.positions.push(p.x, p.y, p.z)
    this.normals.push(n.x, n.y, n.z)
    this.uvs.push(u, v)
    this.colours.push(colour.r, colour.g, colour.b)
    this.extra.push(extra)
    return this.vertexCount - 1
  }

  /**
   * A quad a-b-c-d (counter-clockwise seen from the front) mapped onto a region.
   * `uv` picks a sub-rectangle of the region in 0..1 (for tiling pieces of a big painting).
   */
  quad(
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    d: THREE.Vector3,
    region: RegionName,
    tint: THREE.Color | [THREE.Color, THREE.Color, THREE.Color, THREE.Color],
    uv: [number, number, number, number] = [0, 0, 1, 1],
    extra: [number, number, number, number] = [0, 0, 0, 0],
  ): void {
    const r = uvRect(region)
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize()
    const lerpU = (t: number) => r.u0 + (r.u1 - r.u0) * t
    const lerpV = (t: number) => r.v0 + (r.v1 - r.v0) * t
    const tints = Array.isArray(tint) ? tint : [tint, tint, tint, tint]
    const i0 = this.vertex(a, n, lerpU(uv[0]), lerpV(uv[1]), tints[0], extra[0])
    const i1 = this.vertex(b, n, lerpU(uv[2]), lerpV(uv[1]), tints[1], extra[1])
    const i2 = this.vertex(c, n, lerpU(uv[2]), lerpV(uv[3]), tints[2], extra[2])
    const i3 = this.vertex(d, n, lerpU(uv[0]), lerpV(uv[3]), tints[3], extra[3])
    this.indices.push(i0, i1, i2, i0, i2, i3)
  }

  /** A vertical card standing on `base`, facing +z, for painted foliage. Sway rises from 0 at the root to 1 at the top. */
  card(base: THREE.Vector3, width: number, height: number, region: RegionName, tint: THREE.Color, yaw = 0, sway = 1): void {
    const cos = Math.cos(yaw) * width * 0.5
    const sin = Math.sin(yaw) * width * 0.5
    const a = new THREE.Vector3(base.x - cos, base.y, base.z + sin)
    const b = new THREE.Vector3(base.x + cos, base.y, base.z - sin)
    const c = new THREE.Vector3(b.x, base.y + height, b.z)
    const d = new THREE.Vector3(a.x, base.y + height, a.z)
    this.quad(a, b, c, d, region, tint, [0, 0, 1, 1], [0, 0, sway, sway])
  }

  /** Appends another geometry (already positioned) with a flat colour and a region's centre UV. */
  append(geometry: THREE.BufferGeometry, colour: THREE.Color, region: RegionName, matrix?: THREE.Matrix4, uvScale = 1): void {
    const g = matrix ? geometry.clone().applyMatrix4(matrix) : geometry
    const pos = g.getAttribute('position')
    const nor = g.getAttribute('normal')
    const uv = g.getAttribute('uv')
    const col = g.getAttribute('color')
    const r = uvRect(region)
    const base = this.vertexCount
    const p = new THREE.Vector3()
    const n = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i)
      n.fromBufferAttribute(nor, i)
      const u = uv ? uv.getX(i) * uvScale : 0.5
      const v = uv ? uv.getY(i) * uvScale : 0.5
      if (col) tmp.setRGB(col.getX(i) * colour.r, col.getY(i) * colour.g, col.getZ(i) * colour.b)
      else tmp.copy(colour)
      this.vertex(p, n, r.u0 + (r.u1 - r.u0) * wrap(u), r.v0 + (r.v1 - r.v0) * wrap(v), tmp)
    }
    const index = g.getIndex()
    if (index) for (let i = 0; i < index.count; i++) this.indices.push(base + index.getX(i))
    else for (let i = 0; i < pos.count; i++) this.indices.push(base + i)
    if (matrix) g.dispose()
  }

  build(withExtra = false): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colours, 3))
    if (withExtra) g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.extra, 1))
    g.setIndex(this.indices)
    g.computeBoundingSphere()
    return g
  }
}

export function colour(hex: string, scale = 1): THREE.Color {
  return new THREE.Color(hex).multiplyScalar(scale)
}
