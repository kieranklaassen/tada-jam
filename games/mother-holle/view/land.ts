import * as THREE from 'three'
import { COLUMNS, HAY, LEFT, POND, RIGHT, STRIP, ground } from '../layout'
import type { Snow } from '../snow'
import { cellOf } from './fabric'
import { C, d, scraps } from './palette'
import { Sew } from './puff'

// The hill, the pond, what stands behind it, and the snow that lies on it.

/** Land height anywhere. The lane the sleds run in is flat across; behind it the land rises, in front it falls away. */
export function land(x: number, z: number): number {
  let y = ground(x)
  const mid = (POND.left + POND.right) / 2, half = (POND.right - POND.left) / 2
  if (x > POND.left - 0.3 && x < POND.right + 0.4) {
    // Only an oval of the stretch is pond; before and behind it there is bank.
    const bank = -6.2, across = Math.min(1, Math.abs(x - mid) / (half + 0.3))
    const reach = 2.75 * Math.sqrt(Math.max(0, 1 - across * across * 0.8))
    const t = Math.min(1, Math.max(0, (Math.abs(z) - reach) / 0.7))
    y = y + (Math.max(y, bank) - y) * t
    if (t < 1) y -= 0.42 * (1 - t) * (x > POND.left && x < POND.right ? 1 : 0)
  }
  if (z < -1.8) y += (-1.8 - z) * 0.16
  if (z > 2.9) y -= (z - 2.9) * 0.62
  return y
}

/** Half the width of the run that snow lies on. */
const RUN = 2.6

export class Land {
  readonly group = new THREE.Group()
  private readonly snowGeo = new THREE.BufferGeometry()
  private readonly sx: Float32Array
  private readonly sz: Float32Array
  private readonly sb: Float32Array
  private readonly last = new Float64Array(COLUMNS).fill(-1)
  readonly windows: THREE.Mesh
  readonly sun: THREE.Mesh
  readonly moon: THREE.Mesh
  readonly hay: THREE.Mesh
  readonly water: THREE.Mesh
  readonly sky: THREE.Mesh

  constructor(cloth: THREE.Material, glow: THREE.Material, skyCloth: THREE.Material) {
    const add = (name: string, geo: THREE.BufferGeometry, mat: THREE.Material = cloth) => {
      const m = new THREE.Mesh(geo, mat)
      m.name = name
      this.group.add(m)
      return m
    }
    const p = new THREE.Vector3()
    const fields = scraps(d(C.grass, 'sprigs'), d(C.grassB, 'dots'), d(C.grassC, 'petals'), d(C.grass), d(C.grassB, 'ticking'), d(C.grassC, 'sprigs'))
    const Z0 = -10, Z1 = 8.5
    add('hill', new Sew().patches(32, 11, 6, fields, (s, t, bulge) => {
      const x = -25 + s * 50, z = Z1 + t * (Z0 - Z1)
      return p.set(x, land(x, z) + bulge * 0.11, z)
    }).geometry())
    this.water = add('pond', new Sew().patches(3, 4, 4, scraps(d(C.water, 'scallops'), d(0x57a6d3, 'scallops')), (s, t, b) => {
      const x = POND.left - 0.15 + s * (POND.right - POND.left + 0.3)
      return p.set(x, POND.level + 0.02 + b * 0.04, 3.1 - t * 6.2)
    }).geometry())

    // The sky and far hills hang behind like a wall quilt.
    this.sky = add('sky', new Sew().patches(16, 9, 4, scraps(d(C.sky, 'dots'), d(C.skyB), d(C.sky, 'bigdots'), d(C.skyB, 'plain'), d(C.skyB, 'petals')), (s, t, b) => p.set(-34 + s * 68, -14 + t * 44, -19 + b * 0.35)).geometry(), skyCloth)
    const far = new Sew()
    const hills: [number, number, number, number, number][] = [[-15, -3.4, 8, 3.4, 0x9cc07e], [-4.5, -4.8, 8.5, 2.9, 0x8fb57a], [8, -5.6, 9, 3, 0xa5c783], [19, -5.2, 8, 3.6, 0x8db27c]]
    for (const [x, y, rx, ry, c] of hills) far.form({ at: [x, y, -13.5], r: [rx, ry, 1.6], across: 12, up: 4, puff: 0.12, dye: scraps(d(c, 'sprigs'), d(c), d(c, 'petals')) })
    this.village(far)
    add('village', far.geometry())
    this.windows = add('windows', this.makeWindows().geometry(), glow)

    const hay = new Sew()
    for (const [x, y, r] of [[0, 0.75, 1.15], [-0.15, 1.65, 0.85], [0, 2.35, 0.5]] as const) hay.form({ at: [x, y, 0], r: [r, 0.62, r * 1.05], across: 9, up: 2, puff: 0.12, dye: scraps(d(0xe8c254, 'ticking'), d(0xd9ac3d, 'stripes')) })
    this.hay = add('hay', hay.geometry())
    this.hay.position.set(HAY + 1.0, ground(HAY + 1), 0)

    const disc = (c: number, cb: number) => new Sew().form({ r: [1.25, 1.25, 0.4], across: 10, up: 4, puff: 0.1, dye: scraps(d(c, 'plain'), d(cb, 'dots')) })
    const face = (sew: Sew, shut: boolean) => {
      for (const s of [-1, 1]) sew.form({ at: [s * 0.4, 0.14, 0.42], r: [0.13, shut ? 0.05 : 0.17, 0.08], turn: [0, 0, shut ? s * 0.25 : 0], across: 4, up: 2, puff: 0, dye: d(C.ink, 'smooth') }).form({ at: [s * 0.62, -0.2, 0.34], r: [0.2, 0.14, 0.08], across: 4, up: 2, puff: 0, dye: d(shut ? 0xf3c8c8 : 0xee8a5f, 'smooth') })
      return sew.form({ at: [0, -0.28, 0.43], r: [0.24, 0.08, 0.06], across: 4, up: 2, puff: 0, dye: d(0xa83e34, 'smooth') })
    }
    const sunSew = disc(0xf8c63c, 0xf5b52e)
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; sunSew.form({ at: [Math.cos(a) * 1.5, Math.sin(a) * 1.5, -0.12], r: [0.3, 0.2, 0.12], turn: [0, 0, a], across: 4, up: 2, dye: d(i % 2 ? 0xf2913a : 0xf8c63c) }) }
    this.sun = add('sun', face(sunSew, false).geometry(), skyCloth)
    this.moon = add('moon', face(disc(0xf6f0dc, 0xe9e3d0), true).geometry(), glow)

    // Snow: white patches along the run, moved with the depth.
    const across = 22, deep = 4, sub = 6
    const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [], xs: number[] = [], zs: number[] = [], bs: number[] = []
    const cell = cellOf('plain'), cellB = cellOf('dots')
    for (let j = 0; j < deep; j++) for (let i = 0; i < across; i++) {
      const start = xs.length, c = (i + j) % 3 ? cell : cellB
      for (let b = 0; b <= sub; b++) for (let a = 0; a <= sub; a++) {
        const fa = a / sub, fb = b / sub
        const x = LEFT + ((i + fa) / across) * (RIGHT - LEFT), z = RUN - ((j + fb) / deep) * RUN * 2
        xs.push(x); zs.push(z); bs.push(Math.sqrt(Math.sin(Math.PI * fa) * Math.sin(Math.PI * fb)))
        pos.push(x, -20, z); uv.push(c.u + fa * c.s, c.v + fb * c.s); col.push(1, 1, 1)
      }
      for (let b = 0; b < sub; b++) for (let a = 0; a < sub; a++) { const n = start + b * (sub + 1) + a; idx.push(n, n + 1, n + sub + 2, n, n + sub + 2, n + sub + 1) }
    }
    this.sx = new Float32Array(xs); this.sz = new Float32Array(zs); this.sb = new Float32Array(bs)
    this.snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    this.snowGeo.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3))
    this.snowGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    this.snowGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    this.snowGeo.setIndex(idx)
    const snow = add('snow', this.snowGeo)
    snow.frustumCulled = false
  }

  private readonly houses: [number, number, number, number, number, number][] = [
    [-12.2, -6.6, 1.5, 1.5, 0xd98a6a, 0x7d4f7a], [-7.4, -7.4, 1.7, 1.35, 0xf0d9a8, 0xcb4338], [-0.4, -6.4, 1.4, 1.2, 0xbfd3e4, 0x35507f], [4.4, -7.2, 1.3, 1.5, 0xe9b6b9, 0x2f8d87], [11, -6.2, 1.6, 1.25, 0xf3e3bd, 0xc9622f],
  ]

  private village(sew: Sew): void {
    for (const [x, z, w, h, wall, roof] of this.houses) {
      const y = land(x, z) - 0.15
      sew.form({ at: [x, y + h, z], r: [w, h, 1.1], round: [0.2, 0.25], across: 8, up: 2, puff: 0.07, dye: scraps(d(wall, 'plain'), d(wall, 'sprigs'), d(wall, 'ticking')) })
      sew.form({ at: [x, y + h * 2 + 0.75, z], r: [w * 1.3, 0.95, 1.5], round: [0.35, 0.3], taper: 0.28, across: 8, up: 3, puff: 0.09, dye: scraps(d(roof, 'scallops'), d(roof, 'bigdots')) })
      sew.form({ at: [x + w * 0.5, y + h * 2 + 1.5, z - 0.3], r: [0.2, 0.5, 0.2], round: [0.4, 0.4], across: 4, up: 2, dye: d(C.red, 'checks') })
      sew.form({ at: [x, y + 0.62, z + 1.14], r: [0.36, 0.64, 0.1], round: [0.5, 0.5], across: 4, up: 2, dye: d(roof, 'stripes') })
    }
    const trees: [number, number, number, number][] = [[-9.9, -5, 1, 0], [-3.7, -5.2, 1.15, 1], [2.2, -5.4, 0.9, 0], [7.4, -5, 1.15, 1], [9.2, -8, 1.3, 0], [14, -5.6, 1.2, 1], [-14.6, -5, 1.2, 1], [-5.4, -9, 1.4, 0]]
    for (const [x, z, k, kind] of trees) {
      const y = land(x, z) - 0.1
      sew.form({ at: [x, y + 0.5 * k, z], r: [0.2 * k, 0.6 * k, 0.2 * k], across: 4, up: 2, dye: d(C.wood, 'stripes') })
      if (kind) sew.form({ at: [x, y + 1.9 * k, z], r: [0.95 * k, 1.05 * k, 0.8 * k], across: 7, up: 3, puff: 0.12, dye: scraps(d(0x5e8f4a, 'dots'), d(0x6f9f52, 'petals'), d(0x5e8f4a, 'flowers')) })
      else for (let i = 0; i < 3; i++) sew.form({ at: [x, y + (1.15 + i * 0.75) * k, z], r: [(1 - i * 0.24) * k, 0.55 * k, (0.8 - i * 0.2) * k], taper: 0.3, across: 7, up: 2, puff: 0.1, dye: scraps(d(0x3f7a55, 'ticking'), d(0x4c8a60, 'scallops')) })
    }
    // Along the front: cabbages, big button flowers and two sleeping sheep, none of them in the way of a finger.
    const front: [number, number, number][] = [[-11.6, 5.2, 0], [-9.3, 6.1, 1], [-7.2, 5.4, 2], [-3.4, 5.6, 0], [-1.4, 6.3, 1], [1.3, 6.2, 2], [4.4, 6.4, 0], [6.6, 5.6, 1], [10.4, 5.4, 2], [12.2, 5.2, 0]]
    front.forEach(([x, z, kind], i) => {
      const y = land(x, z)
      if (kind === 2) {
        sew.form({ at: [x, y + 0.55, z], r: [0.95, 0.6, 0.6], across: 8, up: 3, puff: 0.16, dye: scraps(d(0xfff6ea, 'rings'), d(0xf3e8da, 'dots')) })
        sew.form({ at: [x + 0.85, y + 0.5, z + 0.2], r: [0.34, 0.36, 0.3], across: 5, up: 2, dye: d(0x55495c) }).form({ at: [x + 0.85, y + 0.82, z + 0.16], r: [0.3, 0.16, 0.26], across: 5, up: 2, puff: 0.15, dye: d(0xfff6ea) })
        for (const s of [-1, 1]) sew.form({ at: [x + 0.85 + s * 0.13, y + 0.55, z + 0.48], r: [0.08, 0.025, 0.03], turn: [0, 0, s * 0.35], across: 4, up: 2, puff: 0, dye: d(0xfff6ea, 'smooth') })
      } else if (kind === 0) {
        for (let k = 0; k < 4; k++) sew.form({ at: [x + (k - 1.5) * 0.62, y + 0.3 + (k % 2) * 0.12, z + (k % 2) * 0.4], r: [0.48, 0.42, 0.42], across: 6, up: 2, puff: 0.14, dye: scraps(d(0x6aa06a, 'petals'), d(0x8abf7d, 'scallops')) })
      } else {
        const hues = [C.rose, C.mustard, 0xf4efe6, 0xe27d4b]
        for (let k = 0; k < 5; k++) { const fx = x + (k - 2) * 0.5, h = 0.55 + ((k * 7) % 3) * 0.2; sew.form({ at: [fx, y + h / 2, z], r: [0.05, h / 2 + 0.1, 0.05], across: 3, up: 2, sub: 1, puff: 0, dye: d(0x4f8a4c, 'smooth') }).form({ at: [fx, y + h + 0.14, z + 0.04], r: [0.27, 0.27, 0.12], across: 7, up: 2, puff: 0.12, dye: d(hues[(k + i) % 4], 'dots') }).form({ at: [fx, y + h + 0.14, z + 0.17], r: [0.1, 0.1, 0.05], across: 4, up: 2, puff: 0, dye: d(0x7a5230, 'smooth') }) }
      }
    })
    for (let i = 0; i < 9; i++) { const x = 8.6 + i * 0.75, z = -3.4; sew.form({ at: [x, land(x, z) + 0.4, z], r: [0.11, 0.45, 0.09], across: 4, up: 2, dye: d(C.cream, 'smooth') }) }
    sew.form({ at: [11.6, land(11, -3.4) + 0.5, -3.4], r: [3.2, 0.08, 0.06], across: 8, up: 2, dye: d(C.cream, 'stripes') })
  }

  private makeWindows(): Sew {
    const sew = new Sew()
    for (const [x, z, w, h] of this.houses) for (const s of [-1, 1]) sew.form({ at: [x + s * w * 0.55, land(x, z) - 0.15 + h * 1.25, z + 1.13], r: [0.27, 0.32, 0.06], round: [0.4, 0.4], across: 4, up: 2, dye: d(0xffd874, 'plain') })
    return sew
  }

  /** The snow as it lies now. Writes only what changed. */
  snow(snow: Snow): boolean {
    let changed = false
    for (let i = 0; i < COLUMNS; i++) if (Math.abs(this.last[i] - snow.depth[i]) > 1e-4) { changed = true; break }
    if (!changed) return false
    for (let i = 0; i < COLUMNS; i++) this.last[i] = snow.depth[i]
    const pos = this.snowGeo.getAttribute('position') as THREE.BufferAttribute, nor = this.snowGeo.getAttribute('normal') as THREE.BufferAttribute
    const P = pos.array as Float32Array, N = nor.array as Float32Array
    const height = (x: number, z: number, bulge: number): number => {
      // Softened along the hill, so strips do not show; drawn to the model's own depth in the middle of the run.
      const s = (snow.at(x - STRIP * 0.7) + snow.at(x) * 2 + snow.at(x + STRIP * 0.7)) / 4
      const edge = 1 - Math.pow(Math.min(1, Math.abs(z) / RUN), 4)
      const deep = s * (0.12 + 0.88 * edge) * (Math.abs(z) > RUN - 1e-3 ? 0 : 1)
      const onPond = x > POND.left && x < POND.right
      const base = onPond ? POND.level + 0.03 : Math.max(land(x, z), ground(x))
      return s < 0.012 ? base - 0.35 : base + deep + Math.min(0.1, s * 0.5) * bulge * edge + 0.11 * Math.min(1, s * 8) + (s < 0.04 ? -0.05 : 0)
    }
    for (let i = 0; i < this.sx.length; i++) {
      const x = this.sx[i], z = this.sz[i], b = this.sb[i]
      P[i * 3 + 1] = height(x, z, b)
      const e = 0.25
      const dx = (height(x + e, z, b) - height(x - e, z, b)) / (2 * e), dz = (height(x, Math.min(RUN, z + e), b) - height(x, Math.max(-RUN, z - e), b)) / (2 * e)
      // Seams tip the surface a little towards themselves.
      const l = 1 / Math.hypot(dx, 1, dz)
      N[i * 3] = -dx * l; N[i * 3 + 1] = l; N[i * 3 + 2] = -dz * l
    }
    pos.needsUpdate = true
    nor.needsUpdate = true
    return true
  }
}
