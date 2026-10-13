import * as THREE from 'three'
import type { Plaque } from '../beads'
import type { Atlas } from './atlas'

// Plaques as flat rectangles, all in one draw: one instanced mesh of a unit
// square, each instance with its own place and its own piece of the painted
// picture. Every rectangle stands in a plane that faces the child or lies
// flat on the board, so no two can ever cross: they only pass in front of
// and behind each other.

export type QuadLook = { fog?: boolean; transparent?: boolean; opacity?: number; overlay?: boolean }

export class Quads {
  readonly mesh: THREE.InstancedMesh
  readonly material: THREE.MeshBasicMaterial
  /** For the intersection audit: which thing each rectangle belongs to, so that the plaques of one figure are one object. */
  readonly objects: (string | null)[]
  private readonly atlas: Atlas
  private readonly tiles: THREE.InstancedBufferAttribute
  private readonly capacity: number
  private n = 0

  constructor(atlas: Atlas, capacity: number, name: string, look: QuadLook = {}) {
    this.atlas = atlas
    this.capacity = capacity
    const geometry = new THREE.PlaneGeometry(1, 1)
    this.tiles = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4)
    this.tiles.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('tile', this.tiles)
    this.material = new THREE.MeshBasicMaterial({
      map: atlas.texture,
      side: THREE.DoubleSide,
      alphaTest: look.transparent ? 0.02 : 0.5,
      fog: look.fog ?? true,
      transparent: look.transparent ?? false,
      opacity: look.opacity ?? 1,
      depthTest: !look.overlay,
      depthWrite: !look.transparent,
    })
    // Each rectangle shows its own piece of the picture.
    this.material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 tile;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n\tvMapUv = tile.xy + vMapUv * tile.zw;\n#endif')
    }
    this.material.customProgramCacheKey = () => 'lane-runner-plaque'
    this.mesh = new THREE.InstancedMesh(geometry, this.material, capacity)
    this.mesh.name = name
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false
    this.mesh.count = 0
    this.objects = new Array<string | null>(capacity).fill(null)
    this.mesh.userData.jamInstanceObjects = this.objects
  }

  begin(): void {
    this.n = 0
  }

  get count(): number {
    return this.n
  }

  /** A rectangle that stands facing the child: its middle, and its two sides as vectors in its plane. */
  upright(tile: Plaque, x: number, y: number, z: number, ax: number, ay: number, bx: number, by: number, object: string | null = null): void {
    if (this.n >= this.capacity) return
    const m = this.mesh.instanceMatrix.array, at = this.n * 16
    m[at] = ax; m[at + 1] = ay; m[at + 2] = 0; m[at + 3] = 0
    m[at + 4] = bx; m[at + 5] = by; m[at + 6] = 0; m[at + 7] = 0
    m[at + 8] = 0; m[at + 9] = 0; m[at + 10] = 1; m[at + 11] = 0
    m[at + 12] = x; m[at + 13] = y; m[at + 14] = z; m[at + 15] = 1
    this.put(tile, object)
  }

  /** A rectangle lying on the board, its top row away from the child: its middle, how wide and how long. */
  flat(tile: Plaque, x: number, y: number, z: number, wide: number, long: number, object: string | null = null): void {
    if (this.n >= this.capacity) return
    const m = this.mesh.instanceMatrix.array, at = this.n * 16
    m[at] = wide; m[at + 1] = 0; m[at + 2] = 0; m[at + 3] = 0
    m[at + 4] = 0; m[at + 5] = 0; m[at + 6] = -long; m[at + 7] = 0
    m[at + 8] = 0; m[at + 9] = 1; m[at + 10] = 0; m[at + 11] = 0
    m[at + 12] = x; m[at + 13] = y; m[at + 14] = z; m[at + 15] = 1
    this.put(tile, object)
  }

  private put(tile: Plaque, object: string | null): void {
    const rect = this.atlas.rect(tile)
    const t = this.tiles.array, at = this.n * 4
    t[at] = rect[0]; t[at + 1] = rect[1]; t[at + 2] = rect[2]; t[at + 3] = rect[3]
    this.objects[this.n] = object
    this.n += 1
  }

  end(): void {
    this.mesh.count = this.n
    this.mesh.instanceMatrix.needsUpdate = true
    this.tiles.needsUpdate = true
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.material.dispose()
    this.mesh.dispose()
  }
}
