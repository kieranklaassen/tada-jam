import * as THREE from 'three'
import { cellOf, type Print } from './fabric'

// Everything is sewn: a round or square-ish form cut into patches, each patch
// stuffed, so it bulges between its seams. A `Sew` collects many forms into
// one geometry, so one draw shows a whole character's part.

export type Dye = { color: number; print: Print }
export type DyeBy = Dye | ((across: number, up: number) => Dye)
export type Form = {
  at?: readonly [number, number, number]
  /** Half sizes. */
  r: readonly [number, number, number]
  turn?: readonly [number, number, number]
  /** 1 is round; towards 0.2 is a box. Up and down, then around. */
  round?: readonly [number, number]
  across?: number
  up?: number
  sub?: number
  puff?: number
  /** How wide the top is against the bottom. */
  taper?: number
  /** How far the top leans. */
  lean?: readonly [number, number]
  dye: DyeBy
}

const pow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e)
const tmp = { c: null as THREE.Color | null }

export class Sew {
  private readonly pos: number[] = []
  private readonly uv: number[] = []
  private readonly col: number[] = []
  private readonly index: number[] = []

  form(f: Form): this {
    const across = f.across ?? 6, up = f.up ?? 3, sub = f.sub ?? 3
    const [e1, e2] = f.round ?? [1, 1]
    const puff = f.puff ?? 0.07, taper = f.taper ?? 1
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...(f.at ?? [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(f.turn ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1))
    const p = new THREE.Vector3()
    const size = Math.min(...f.r)
    this.patches(across, up, sub, f.dye, (s, t, bulge) => {
      const th = -Math.PI + s * Math.PI * 2, ph = -Math.PI / 2 + t * Math.PI
      const cx = pow(Math.cos(ph), e1) * pow(Math.sin(th), e2), cy = pow(Math.sin(ph), e1), cz = pow(Math.cos(ph), e1) * pow(Math.cos(th), e2)
      const k = 1 + (taper - 1) * (cy * 0.5 + 0.5), l = cy * 0.5 + 0.5
      const b = 1 + (bulge * puff * Math.max(0.35, size)) / size
      p.set(f.r[0] * cx * k * b + (f.lean?.[0] ?? 0) * l, f.r[1] * cy * b, f.r[2] * cz * k * b + (f.lean?.[1] ?? 0) * l).applyMatrix4(m)
      return p
    })
    return this
  }

  /** Any surface at all, cut into patches: `at` gives the place for s and t from 0 to 1, with how stuffed that spot is. */
  patches(across: number, up: number, sub: number, dye: DyeBy, at: (s: number, t: number, bulge: number) => THREE.Vector3): this {
    const color = (tmp.c ??= new THREE.Color())
    for (let j = 0; j < up; j++) for (let i = 0; i < across; i++) {
      const d = typeof dye === 'function' ? dye(i, j) : dye
      color.set(d.color)
      const cell = cellOf(d.print)
      const start = this.pos.length / 3
      for (let b = 0; b <= sub; b++) for (let a = 0; a <= sub; a++) {
        const fa = a / sub, fb = b / sub
        const bulge = Math.pow(Math.sin(Math.PI * fa) * Math.sin(Math.PI * fb), 0.5)
        const q = at((i + fa) / across, (j + fb) / up, bulge)
        this.pos.push(q.x, q.y, q.z)
        this.uv.push(cell.u + fa * cell.s, cell.v + fb * cell.s)
        this.col.push(color.r, color.g, color.b)
      }
      for (let b = 0; b < sub; b++) for (let a = 0; a < sub; a++) {
        const n = start + b * (sub + 1) + a
        this.index.push(n, n + 1, n + sub + 2, n, n + sub + 2, n + sub + 1)
      }
    }
    return this
  }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3))
    g.setIndex(this.index)
    g.computeVertexNormals()
    return g
  }
}
