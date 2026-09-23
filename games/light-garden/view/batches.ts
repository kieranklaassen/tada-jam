import * as THREE from 'three'
import type { BeamBuffer } from '../optics'
import { lightColour } from './palette'

// Two dynamic batches, rewritten in place every frame with no allocation:
// every sprite (glows, decals, orbs, ripples, motes; or shadows and eyes) in
// one instanced draw, and every beam in one ribbon draw.

export class SpriteBatch {
  readonly mesh: THREE.Mesh
  readonly capacity: number
  count = 0
  private readonly pos: Float32Array
  private readonly colour: Float32Array
  private readonly shape: Float32Array
  private readonly geometry: THREE.InstancedBufferGeometry
  private readonly attributes: THREE.InstancedBufferAttribute[]

  constructor(capacity: number, material: THREE.Material) {
    this.capacity = capacity
    const geometry = new THREE.InstancedBufferGeometry()
    const quad = new THREE.PlaneGeometry(1, 1)
    geometry.setIndex(quad.getIndex())
    geometry.setAttribute('position', quad.getAttribute('position'))
    this.pos = new Float32Array(capacity * 4)
    this.colour = new Float32Array(capacity * 4)
    this.shape = new Float32Array(capacity * 4)
    this.attributes = [
      new THREE.InstancedBufferAttribute(this.pos, 4).setUsage(THREE.DynamicDrawUsage),
      new THREE.InstancedBufferAttribute(this.colour, 4).setUsage(THREE.DynamicDrawUsage),
      new THREE.InstancedBufferAttribute(this.shape, 4).setUsage(THREE.DynamicDrawUsage),
    ]
    geometry.setAttribute('iPos', this.attributes[0])
    geometry.setAttribute('iColour', this.attributes[1])
    geometry.setAttribute('iShape', this.attributes[2])
    geometry.instanceCount = 0
    this.geometry = geometry
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.frustumCulled = false
  }

  begin(): void {
    this.count = 0
  }

  /** One sprite at world (x, y, z); `size` is its full width in cm. */
  push(x: number, y: number, z: number, size: number, r: number, g: number, b: number, a: number, shape: number, facing: number, rotation = 0, param = 0): void {
    if (this.count >= this.capacity || a <= 0.002 || size <= 0) return
    const o = this.count * 4
    this.pos[o] = x
    this.pos[o + 1] = y
    this.pos[o + 2] = z
    this.pos[o + 3] = size
    this.colour[o] = r
    this.colour[o + 1] = g
    this.colour[o + 2] = b
    this.colour[o + 3] = a
    this.shape[o] = shape
    this.shape[o + 1] = facing
    this.shape[o + 2] = rotation
    this.shape[o + 3] = param
    this.count++
  }

  end(): void {
    this.geometry.instanceCount = this.count
    for (let k = 0; k < this.attributes.length; k++) {
      const attribute = this.attributes[k]
      attribute.clearUpdateRanges()
      attribute.addUpdateRange(0, this.count * 4)
      attribute.needsUpdate = true
    }
  }

  dispose(): void {
    this.geometry.dispose()
  }
}

/** Beam ribbon kinds: a camera-facing core in the air, a wash on the panel, and a line across the top of glass. */
const CORE = 0
const WASH = 1
const INSIDE = 2
const CORE_HEIGHT = 1.9
const WASH_HEIGHT = 0.05
/** Just above the prism's bevelled top, the only glass light travels inside. */
const INSIDE_HEIGHT = 4.42
const QUADS_PER_SEGMENT = 2

export class BeamRibbon {
  readonly mesh: THREE.Mesh
  private readonly capacity: number
  private readonly position: Float32Array
  private readonly dir: Float32Array
  private readonly side: Float32Array
  private readonly along: Float32Array
  private readonly colour: Float32Array
  private readonly attributes: THREE.BufferAttribute[]
  private readonly geometry: THREE.BufferGeometry
  private readonly rgb = new Float32Array(3)
  private quads = 0

  constructor(maxSegments: number, material: THREE.Material) {
    const quads = maxSegments * QUADS_PER_SEGMENT
    this.capacity = quads
    this.position = new Float32Array(quads * 4 * 3)
    this.dir = new Float32Array(quads * 4 * 3)
    this.side = new Float32Array(quads * 4 * 2)
    this.along = new Float32Array(quads * 4 * 2)
    this.colour = new Float32Array(quads * 4 * 4)
    const index = new Uint16Array(quads * 6)
    for (let q = 0; q < quads; q++) {
      const v = q * 4
      index.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], q * 6)
    }
    const geometry = new THREE.BufferGeometry()
    this.attributes = [
      new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage),
      new THREE.BufferAttribute(this.dir, 3).setUsage(THREE.DynamicDrawUsage),
      new THREE.BufferAttribute(this.side, 2).setUsage(THREE.DynamicDrawUsage),
      new THREE.BufferAttribute(this.along, 2).setUsage(THREE.DynamicDrawUsage),
      new THREE.BufferAttribute(this.colour, 4).setUsage(THREE.DynamicDrawUsage),
    ]
    geometry.setAttribute('position', this.attributes[0])
    geometry.setAttribute('aDir', this.attributes[1])
    geometry.setAttribute('aSide', this.attributes[2])
    geometry.setAttribute('aAlong', this.attributes[3])
    geometry.setAttribute('aColour', this.attributes[4])
    geometry.setIndex(new THREE.BufferAttribute(index, 1))
    geometry.setDrawRange(0, 0)
    this.geometry = geometry
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.frustumCulled = false
  }

  private quad(kind: number, ax: number, az: number, bx: number, bz: number, y: number, intensity: number): void {
    if (this.quads >= this.capacity) return
    const dx = bx - ax
    const dz = bz - az
    const length = Math.hypot(dx, dz)
    if (length < 1e-3) return
    const ux = dx / length
    const uz = dz / length
    const rgb = this.rgb
    for (let corner = 0; corner < 4; corner++) {
      const v = this.quads * 4 + corner
      const end = corner >> 1
      const sideSign = corner & 1 ? 1 : -1
      this.position[v * 3] = end ? bx : ax
      this.position[v * 3 + 1] = y
      this.position[v * 3 + 2] = end ? bz : az
      this.dir[v * 3] = ux
      this.dir[v * 3 + 1] = 0
      this.dir[v * 3 + 2] = uz
      this.side[v * 2] = sideSign
      this.side[v * 2 + 1] = kind
      this.along[v * 2] = end
      this.along[v * 2 + 1] = length
      this.colour[v * 4] = rgb[0]
      this.colour[v * 4 + 1] = rgb[1]
      this.colour[v * 4 + 2] = rgb[2]
      this.colour[v * 4 + 3] = intensity
    }
    this.quads++
  }

  update(beams: BeamBuffer, brightness: number): void {
    this.quads = 0
    for (let i = 0; i < beams.count; i++) {
      lightColour(beams.mask[i], this.rgb)
      const ax = beams.ax[i]
      const az = beams.ay[i]
      const bx = beams.bx[i]
      const bz = beams.by[i]
      if (beams.inside[i]) {
        this.quad(INSIDE, ax, az, bx, bz, INSIDE_HEIGHT, brightness)
      } else {
        this.quad(WASH, ax, az, bx, bz, WASH_HEIGHT, brightness)
        this.quad(CORE, ax, az, bx, bz, CORE_HEIGHT, brightness)
      }
    }
    this.geometry.setDrawRange(0, this.quads * 6)
    const vertices = this.quads * 4
    for (let k = 0; k < this.attributes.length; k++) {
      const attribute = this.attributes[k]
      attribute.clearUpdateRanges()
      attribute.addUpdateRange(0, vertices * attribute.itemSize)
      attribute.needsUpdate = true
    }
  }

  dispose(): void {
    this.geometry.dispose()
  }
}
