import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { rgb } from './paper'

// A figure is sculpted from a handful of round lumps and tubes, each pushed a
// little out of true once, here, as a paper shell is, and then merged into one
// mesh with its paint in the vertices. Nothing is sculpted again after that.

/** One colour, or two with the pattern that lays the second on the first. */
export type Paint = {
  c: number
  c2?: number
  /** `bands` go round the part's own upright, `spokes` run up it, `dots` are scattered round it, `bars` run across its x. */
  pattern?: 'bands' | 'spokes' | 'dots' | 'bars'
  /** How many bands to a unit of height, spokes or dots round, or bars to a unit. */
  count?: number
}

export type Place = {
  at?: readonly [number, number, number]
  /** Turns about x, y and z, in radians, applied in that order. */
  turn?: readonly [number, number, number]
  size?: number | readonly [number, number, number]
  /** How far the shell is pushed out of true, as a length. 0 keeps it machine-made. */
  lump?: number
  /** Keep its edges hard and its faces flat (a box, a board). */
  hard?: boolean
  /** Flutter: how far, the phase, and 0 for a flag's flap or 1 for a head's rocking. */
  sway?: readonly [number, number, number]
}

const PATTERN = { bands: 1, spokes: 2, dots: 3, bars: 4 } as const

function noise(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = x - xi, yf = y - yi, zf = z - zi
  const corner = (i: number, j: number, k: number): number => {
    let h = (Math.imul(xi + i, 374761393) + Math.imul(yi + j, 668265263) + Math.imul(zi + k, 2147483647)) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf), sz = zf * zf * (3 - 2 * zf)
  const mix = (a: number, b: number, t: number): number => a + (b - a) * t
  return mix(
    mix(mix(corner(0, 0, 0), corner(1, 0, 0), sx), mix(corner(0, 1, 0), corner(1, 1, 0), sx), sy),
    mix(mix(corner(0, 0, 1), corner(1, 0, 1), sx), mix(corner(0, 1, 1), corner(1, 1, 1), sx), sy),
    sz,
  )
}

type Chunk = { position: Float32Array; normal: Float32Array; color: Float32Array; color2: Float32Array; local: Float32Array; paint: Float32Array; sway: Float32Array; joint: Float32Array; parent: Float32Array }

/** The joint number of a head of the crowd that faces the eye, and of one that has its back to it (paper.ts). */
export const CROWD_FRONT = 100
export const CROWD_BACK = 101

export class Sculpt {
  private readonly chunks: Chunk[] = []
  private count = 0
  private readonly frames: THREE.Matrix4[] = [new THREE.Matrix4()]
  /** The joint the parts being added turn about: where it is, and its number plus one. None is all zero. */
  private joint: [number, number, number, number] = [0, 0, 0, 0]
  /** The limb that limb is on, and moves with: a cherry on the cream, the ears on a head. */
  private parent: [number, number, number, number] = [0, 0, 0, 0]
  private readonly coarse: boolean

  /** `coarse` rounds every part with fewer faces: for the setting, which nobody looks at closely. */
  constructor(coarse = false) {
    this.coarse = coarse
  }

  /**
   * Everything added inside `make` is a limb: a part of the figure that moves by itself, about `pivot` (in the
   * frame of the group being built). `limb` is its number in motion.ts, or a crowd head's (`CROWD_FRONT`).
   * A limb made inside another is on it, and moves with it as well.
   */
  limb(limb: number, pivot: readonly [number, number, number], make: () => void): this {
    const at = new THREE.Vector3(pivot[0], pivot[1], pivot[2]).applyMatrix4(this.frames[this.frames.length - 1])
    const before = this.joint, above = this.parent
    this.parent = before
    this.joint = [at.x, at.y, at.z, limb + 1]
    make()
    this.joint = before
    this.parent = above
    return this
  }

  /** Everything added inside `make` is placed as a group: moved, turned and sized together. */
  group(place: Place, make: () => void): this {
    this.frames.push(this.frames[this.frames.length - 1].clone().multiply(matrixOf(place)))
    make()
    this.frames.pop()
    return this
  }

  /** Adds one part. The geometry is used up. */
  add(geometry: THREE.BufferGeometry, paint: Paint, place: Place = {}): this {
    geometry.deleteAttribute('uv')
    let part = geometry
    if (!place.hard) {
      // Weld the seams so the shell is one skin and its shading is round.
      part.deleteAttribute('normal')
      part = mergeVertices(part, 1e-4)
    }
    const own = matrixOf(place), size = new THREE.Vector3().setFromMatrixScale(own)
    const position = part.getAttribute('position') as THREE.BufferAttribute
    // The pattern is laid in the part's own space, sized but not turned, so bands go round it however it is set.
    const local = new Float32Array(position.count * 3)
    for (let i = 0; i < position.count; i++) {
      local[i * 3] = position.getX(i) * size.x
      local[i * 3 + 1] = position.getY(i) * size.y
      local[i * 3 + 2] = position.getZ(i) * size.z
    }
    const matrix = this.frames[this.frames.length - 1].clone().multiply(own)
    part.applyMatrix4(matrix)
    const lump = place.lump ?? (place.hard ? 0 : 0.035)
    if (lump > 0) {
      const middle = new THREE.Vector3().setFromMatrixPosition(matrix), p = new THREE.Vector3(), seed = this.chunks.length * 3.7
      for (let i = 0; i < position.count; i++) {
        p.fromBufferAttribute(position, i)
        const push = (noise(p.x * 2.3 + seed, p.y * 2.3, p.z * 2.3) - 0.5) * 2 * lump
        const out = p.clone().sub(middle)
        if (out.lengthSq() < 1e-8) continue
        p.addScaledVector(out.normalize(), push)
        position.setXYZ(i, p.x, p.y, p.z)
      }
    }
    part.computeVertexNormals()
    const flat = part.index ? part.toNonIndexed() : part
    const indexOf = part.index ? Array.from(part.index.array) : null
    const count = flat.getAttribute('position').count
    const [r, g, b] = rgb(paint.c), [r2, g2, b2] = rgb(paint.c2 ?? paint.c)
    const chunk: Chunk = {
      position: flat.getAttribute('position').array as Float32Array,
      normal: flat.getAttribute('normal').array as Float32Array,
      color: new Float32Array(count * 3), color2: new Float32Array(count * 3), local: new Float32Array(count * 3), paint: new Float32Array(count * 2), sway: new Float32Array(count * 3), joint: new Float32Array(count * 4), parent: new Float32Array(count * 4),
    }
    const kind = paint.pattern ? PATTERN[paint.pattern] : 0, sway = place.sway ?? [0, 0, 0]
    for (let i = 0; i < count; i++) {
      const from = indexOf ? indexOf[i] : i
      chunk.color.set([r, g, b], i * 3)
      chunk.color2.set([r2, g2, b2], i * 3)
      chunk.local.set([local[from * 3], local[from * 3 + 1], local[from * 3 + 2]], i * 3)
      chunk.paint.set([kind, paint.count ?? 1], i * 2)
      chunk.sway.set(sway, i * 3)
      chunk.joint.set(this.joint, i * 4)
      chunk.parent.set(this.parent, i * 4)
    }
    this.chunks.push(chunk)
    this.count += count
    return this
  }

  /** A round lump. Small ones and those of the setting are rounded with fewer faces; a big head with more. */
  ball(radius: number, paint: Paint, place: Place = {}): this {
    const size = typeof place.size === 'number' ? place.size : place.size ? Math.max(place.size[0], place.size[1], place.size[2]) : 1
    const across = radius * size
    const [round, up] = this.coarse ? (across < 0.3 ? [6, 4] : [9, 6]) : across < 0.14 ? [7, 5] : across < 0.9 ? [12, 8] : [16, 11]
    return this.add(new THREE.SphereGeometry(radius, round, up), paint, place)
  }

  /** An upright tube from its foot at y 0, `top` and `foot` being its two radii. */
  tube(top: number, foot: number, height: number, paint: Paint, place: Place = {}, sides = this.coarse ? 8 : 12): this {
    return this.add(new THREE.CylinderGeometry(top, foot, height, sides, 1).translate(0, height / 2, 0), paint, place)
  }

  cone(radius: number, height: number, paint: Paint, place: Place = {}, sides = this.coarse ? 8 : 10): this {
    return this.add(new THREE.ConeGeometry(radius, height, sides, 1).translate(0, height / 2, 0), paint, place)
  }

  box(wide: number, high: number, deep: number, paint: Paint, place: Place = {}): this {
    return this.add(new THREE.BoxGeometry(wide, high, deep).translate(0, high / 2, 0), paint, { hard: true, ...place })
  }

  /** A ring lying in its own x and y, or an arch of it from the +x side round to `arc`, whose two ends are closed. */
  ring(radius: number, thick: number, paint: Paint, place: Place = {}, arc = Math.PI * 2): this {
    const round = this.coarse ? 5 : 6, torus = new THREE.TorusGeometry(radius, thick, round, this.coarse ? 12 : 16, arc)
    if (arc >= Math.PI * 2) return this.add(torus, paint, place)
    // An end left open would make the arch a shell with no inside: each end gets a lid of the same outline.
    const lid = (): THREE.BufferGeometry => new THREE.CircleGeometry(thick, round).rotateX(Math.PI / 2).translate(radius, 0, 0)
    return this.add(mergeGeometries([torus, lid(), lid().rotateZ(arc)]), paint, place)
  }

  /** A shape turned about the upright: `profile` is pairs of radius and height, foot first. */
  lathe(profile: readonly (readonly [number, number])[], paint: Paint, place: Place = {}, sides = 12): this {
    return this.add(new THREE.LatheGeometry(profile.map(([radius, y]) => new THREE.Vector2(radius, y)), sides), paint, place)
  }

  /** A thin pointed strip of tissue hanging from y 0 down to -`long`, seen from both sides: a flag when wide, a fringe when narrow. */
  strip(wide: number, long: number, paint: Paint, place: Place = {}): this {
    const geometry = new THREE.BufferGeometry()
    const h = wide / 2, e = 0.003
    // Two faces a hair apart and closed along their three edges, so it shows from either side without a two-sided
    // material and is a whole thin shell: the intersection audit can then tell its inside from its outside.
    const corners: readonly (readonly [number, number])[] = [[-h, 0], [0, -long], [h, 0]]
    const flat: number[] = []
    for (const [x, y] of corners) flat.push(x, y, e)
    for (const [x, y] of [...corners].reverse()) flat.push(x, y, -e)
    for (let i = 0; i < 3; i++) {
      const [ax, ay] = corners[i], [bx, by] = corners[(i + 1) % 3]
      flat.push(ax, ay, e, ax, ay, -e, bx, by, -e, ax, ay, e, bx, by, -e, bx, by, e)
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(flat), 3))
    return this.add(geometry, paint, { hard: true, lump: 0, ...place })
  }

  /** The finished figure: one geometry, every part's paint in its vertices. */
  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    const join = (pick: (chunk: Chunk) => Float32Array, width: number): THREE.BufferAttribute => {
      const all = new Float32Array(this.count * width)
      let at = 0
      for (const chunk of this.chunks) { all.set(pick(chunk), at); at += pick(chunk).length }
      return new THREE.BufferAttribute(all, width)
    }
    geometry.setAttribute('position', join((chunk) => chunk.position, 3))
    geometry.setAttribute('normal', join((chunk) => chunk.normal, 3))
    geometry.setAttribute('aColor', join((chunk) => chunk.color, 3))
    geometry.setAttribute('aColor2', join((chunk) => chunk.color2, 3))
    geometry.setAttribute('aLocal', join((chunk) => chunk.local, 3))
    geometry.setAttribute('aPaint', join((chunk) => chunk.paint, 2))
    geometry.setAttribute('aSway', join((chunk) => chunk.sway, 3))
    geometry.setAttribute('aJoint', join((chunk) => chunk.joint, 4))
    geometry.setAttribute('aParent', join((chunk) => chunk.parent, 4))
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()
    return geometry
  }
}

function matrixOf(place: Place): THREE.Matrix4 {
  const at = place.at ?? [0, 0, 0], turn = place.turn ?? [0, 0, 0]
  const size = typeof place.size === 'number' ? [place.size, place.size, place.size] : place.size ?? [1, 1, 1]
  return new THREE.Matrix4().compose(new THREE.Vector3(at[0], at[1], at[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(turn[0], turn[1], turn[2], 'XYZ')), new THREE.Vector3(size[0], size[1], size[2]))
}

/** A colour mixed toward pale sand: the setting is quieter than what can be touched. */
export function quiet(hex: number, by = 0.4): number {
  const [r, g, b] = rgb(hex), to = [0.93, 0.86, 0.76]
  const mix = (v: number, t: number): number => Math.round(255 * (v + (t - v) * by))
  return (mix(r, to[0]) << 16) | (mix(g, to[1]) << 8) | mix(b, to[2])
}
