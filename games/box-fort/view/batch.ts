import * as THREE from 'three'
import type { Vec } from '../layout'
import type { Rgb } from './board'

// Geometry that is laid out again every frame, each kind as one draw: flat
// four-cornered pieces of board (the blanket, the string of lights, the strips
// of tape), soft blobs on the ground, and a ribbon along a path.

/** Up to `most` four-cornered pieces of board in one mesh. */
export class Batch {
  readonly mesh: THREE.Mesh
  private readonly geometry = new THREE.BufferGeometry()
  private readonly positions: Float32Array
  private readonly normals: Float32Array
  private readonly paints: Float32Array
  private readonly uvs: Float32Array
  private readonly glows: Float32Array
  private count = 0

  constructor(private readonly most: number, material: THREE.Material, name: string) {
    this.positions = new Float32Array(most * 12)
    this.normals = new Float32Array(most * 12)
    this.paints = new Float32Array(most * 12)
    this.uvs = new Float32Array(most * 8)
    this.glows = new Float32Array(most * 4)
    const index: number[] = []
    for (let i = 0; i < most; i++) index.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3)
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3))
    this.geometry.setAttribute('paint', new THREE.BufferAttribute(this.paints, 3))
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2))
    this.geometry.setAttribute('flute', new THREE.BufferAttribute(new Float32Array(most * 4), 1))
    this.geometry.setAttribute('glow', new THREE.BufferAttribute(this.glows, 1))
    this.geometry.setIndex(index)
    this.mesh = new THREE.Mesh(this.geometry, material)
    this.mesh.name = name
    this.mesh.frustumCulled = false
    this.mesh.visible = false
  }

  begin(): void {
    this.count = 0
  }

  /** One piece with its corners in order round it. `uv` is eight numbers, two a corner; left out, the kraft tile is laid by the corners' places. */
  quad(a: Vec, b: Vec, c: Vec, d: Vec, paint: Rgb, glow = 0, uv?: readonly number[]): void {
    if (this.count >= this.most) return
    const n = this.count++, corners = [a, b, c, d]
    // The piece's own normal, turned to the child.
    let nx = (b.y - a.y) * (d.z - a.z) - (b.z - a.z) * (d.y - a.y), ny = (b.z - a.z) * (d.x - a.x) - (b.x - a.x) * (d.z - a.z), nz = (b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x)
    const length = Math.hypot(nx, ny, nz) || 1, turn = ny * 0.4 + nz < 0 ? -1 : 1
    nx *= turn / length; ny *= turn / length; nz *= turn / length
    corners.forEach((corner, i) => {
      const at = (n * 4 + i) * 3
      this.positions[at] = corner.x; this.positions[at + 1] = corner.y; this.positions[at + 2] = corner.z
      this.normals[at] = nx; this.normals[at + 1] = ny; this.normals[at + 2] = nz
      this.paints[at] = paint[0]; this.paints[at + 1] = paint[1]; this.paints[at + 2] = paint[2]
      this.uvs[(n * 4 + i) * 2] = uv ? uv[i * 2] : corner.x * 0.55 + corner.z * 0.3
      this.uvs[(n * 4 + i) * 2 + 1] = uv ? uv[i * 2 + 1] : corner.y * 0.55
      this.glows[n * 4 + i] = glow
    })
  }

  /** A piece standing upright and facing the child: its middle, half its width and height, and how far it is turned. */
  card(at: Vec, hw: number, hh: number, turn: number, paint: Rgb, glow = 0): void {
    const c = Math.cos(turn), s = Math.sin(turn)
    const corner = (x: number, y: number): Vec => ({ x: at.x + x * c - y * s, y: at.y + x * s + y * c, z: at.z })
    this.quad(corner(-hw, -hh), corner(hw, -hh), corner(hw, hh), corner(-hw, hh), paint, glow)
  }

  end(): void {
    this.mesh.visible = this.count > 0
    this.geometry.setDrawRange(0, this.count * 6)
    for (const name of ['position', 'normal', 'paint', 'uv', 'glow']) this.geometry.attributes[name].needsUpdate = true
  }

  dispose(): void {
    this.geometry.dispose()
  }
}

/** Soft blobs lying on the ground, as one draw. */
export class Blobs {
  readonly mesh: THREE.Mesh
  private readonly geometry = new THREE.BufferGeometry()
  private readonly positions: Float32Array

  constructor(private readonly most: number, material: THREE.Material, name: string) {
    this.positions = new Float32Array(most * 12)
    const uvs = new Float32Array(most * 8), index: number[] = []
    for (let i = 0; i < most; i++) { uvs.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8); index.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3) }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    this.geometry.setIndex(index)
    this.mesh = new THREE.Mesh(this.geometry, material)
    this.mesh.name = name
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 1
  }

  /** Lays blob `i` under a thing at `x`, `z`, `w` wide and `d` deep; nothing of it shows when `w` is 0. */
  set(i: number, x: number, z: number, w: number, d: number): void {
    if (i >= this.most) return
    const y = 0.052 + i * 0.001
    this.positions.set([x - w / 2, y, z + d / 2, x + w / 2, y, z + d / 2, x + w / 2, y, z - d / 2, x - w / 2, y, z - d / 2], i * 12)
  }

  end(): void {
    this.geometry.attributes.position.needsUpdate = true
  }

  dispose(): void {
    this.geometry.dispose()
  }
}

/** A flat ribbon along a path: the line of a cut, the trail of the ghost hand, a strip of tape off the roll. */
export class Ribbon {
  readonly mesh: THREE.Mesh
  private readonly positions: Float32Array
  private readonly geometry = new THREE.BufferGeometry()

  constructor(private readonly most: number, material: THREE.Material, name: string) {
    this.positions = new Float32Array(most * 6)
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    const index: number[] = []
    for (let i = 0; i + 1 < most; i++) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    this.geometry.setIndex(index)
    this.mesh = new THREE.Mesh(this.geometry, material)
    this.mesh.name = name
    this.mesh.frustumCulled = false
    this.mesh.visible = false
  }

  /** Lays the ribbon along `count` points given by `at`, `width` wide. */
  lay(count: number, at: (i: number, out: Vec) => void, width: number): void {
    const n = Math.min(count, this.most)
    this.mesh.visible = n >= 2
    if (n < 2) return
    const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 0 }
    for (let i = 0; i < n; i++) {
      at(Math.max(0, i - 1), a); at(Math.min(n - 1, i + 1), b)
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1, nx = (-dy / length) * width / 2, ny = (dx / length) * width / 2
      at(i, a)
      this.positions.set([a.x + nx, a.y + ny, a.z, a.x - nx, a.y - ny, a.z], i * 6)
    }
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.setDrawRange(0, (n - 1) * 6)
  }

  dispose(): void {
    this.geometry.dispose()
  }
}
