import * as THREE from 'three'
import { FEATHERS } from '../layout'
import type { Village } from '../village'
import { cellOf, type Print } from './fabric'
import { C, d, scraps } from './palette'
import { Sew } from './puff'

// Mother Holle in her cloud, and the featherbed. The quilt is as fat as what
// is left in it: full patches stand out like buns, an empty one hangs flat.

const ACROSS = 5, DOWN = 3, SUB = 6
export const QUILT_W = 6.2, QUILT_H = 3.0
const SCRAPS: [number, Print][] = [[C.red, 'bigdots'], [C.mustard, 'flowers'], [C.teal, 'gingham'], [C.cream, 'sprigs'], [C.navy, 'dots'], [C.rose, 'plaid'], [0xe27d4b, 'stripes'], [C.plum, 'petals']]

export class Holle {
  readonly group = new THREE.Group()
  private readonly cloud = new THREE.Group()
  private readonly body = new THREE.Group()
  private readonly head = new THREE.Group()
  private readonly cap: THREE.Mesh
  private readonly pupils: THREE.Mesh
  private readonly lids: THREE.Mesh
  private readonly mouth: THREE.Mesh
  private readonly arms: THREE.Mesh[] = []
  private readonly hands: THREE.Mesh[] = []
  private readonly geo = new THREE.BufferGeometry()
  readonly quilt: THREE.Mesh
  private readonly s: number[] = []
  private readonly t: number[] = []
  private readonly b: number[] = []
  private fat = 1
  private swing = 0
  private hug = 0
  private cloudX = 0
  private readonly tmp = new THREE.Vector3()
  private readonly up = new THREE.Vector3(0, 1, 0)

  constructor(cloth: THREE.Material, sheet: THREE.Material) {
    const add = (name: string, sew: Sew, parent: THREE.Object3D) => {
      const m = new THREE.Mesh(sew.geometry(), cloth)
      m.name = name
      parent.add(m)
      return m
    }
    this.cloud.userData.jamObject = 'cloud'
    const puffs = new Sew()
    const lumps: [number, number, number, number][] = [[-5.2, 6.5, 1.5, -3.6], [-3.3, 7.4, 2, -3.8], [3.2, 7.3, 2.1, -3.8], [5.3, 6.4, 1.6, -3.6], [0, 8.6, 2.6, -4.2], [-1.8, 5.4, 1.35, -3.2], [1.8, 5.4, 1.4, -3.2], [-4, 5.6, 1.4, -3.3], [4, 5.5, 1.4, -3.3], [-6.9, 5.9, 1, -3.6], [7, 5.9, 1.05, -3.6]]
    lumps.forEach(([x, y, r, z]) => puffs.form({ at: [x, y, z], r: [r * 1.25, r, r * 0.6], across: 8, up: 4, puff: 0.1, dye: scraps(d(C.cloud), d(C.cloudB), d(C.cloud, 'smooth')) }))
    add('cloud', puffs, this.cloud)
    this.group.add(this.cloud)

    this.body.userData.jamObject = 'holle'
    add('holle-body', new Sew()
      .form({ at: [0, 4.9, -1.75], r: [2.0, 1.25, 0.8], across: 9, up: 3, puff: 0.1, dye: (i, j) => ((i + j) % 2 ? d(0x5a6fae, 'sprigs') : d(0x6f83c0, 'dots')) })
      .form({ at: [0, 5.2, -1.35], r: [1.55, 0.5, 0.75], across: 8, up: 2, puff: 0.1, dye: d(C.rose, 'plaid') })
      .form({ at: [0, 5.45, -1.1], r: [0.9, 0.26, 0.55], across: 8, up: 2, puff: 0.1, dye: d(C.white, 'scallops') }), this.body)
    this.head.position.set(0, 5.6, -1.0)
    this.head.scale.setScalar(1.18)
    const sew = new Sew().form({ at: [0, 0.85, 0], r: [1.12, 1.02, 0.9], across: 8, up: 4, puff: 0.04, dye: d(C.skin) })
      .form({ at: [0, 1.35, -0.25], r: [1.22, 0.75, 0.9], across: 9, up: 2, puff: 0.12, dye: d(C.hair, 'ticking') })
      .form({ at: [0, 0.62, 0.95], r: [0.3, 0.28, 0.28], across: 5, up: 2, puff: 0.03, dye: d(C.skinB, 'smooth') })
    for (const s of [-1, 1]) sew.form({ at: [s * 0.66, 0.42, 0.62], r: [0.34, 0.3, 0.22], across: 5, up: 2, puff: 0.03, dye: d(0xef9c8e, 'smooth') })
      .form({ at: [s * 0.4, 1.02, 0.76], r: [0.25, 0.27, 0.13], across: 5, up: 2, puff: 0, dye: d(C.white, 'smooth') })
      .form({ at: [s * 0.46, 1.44, 0.8], r: [0.28, 0.08, 0.1], turn: [0, 0, s * -0.3], across: 5, up: 2, dye: d(0xd9d4cc, 'ticking') })
      .form({ at: [s * 1.02, 0.75, 0.2], r: [0.28, 0.5, 0.35], across: 5, up: 2, puff: 0.1, dye: d(C.hair, 'ticking') })
    add('holle-head', sew, this.head)
    const pup = new Sew(), lid = new Sew()
    for (const s of [-1, 1]) { pup.form({ at: [s * 0.4, 0, 0], r: [0.13, 0.15, 0.06], across: 6, up: 2, puff: 0, dye: d(C.ink, 'smooth') }); lid.form({ at: [s * 0.4, 1.02, 0.82], r: [0.28, 0.29, 0.13], across: 5, up: 2, puff: 0, dye: d(C.skinB, 'smooth') }).form({ at: [s * 0.4, 0.9, 0.93], r: [0.2, 0.035, 0.04], turn: [0, 0, s * 0.2], across: 4, up: 2, puff: 0, dye: d(C.ink, 'smooth') }) }
    this.pupils = add('holle-pupils', pup, this.head)
    this.lids = add('holle-lids', lid, this.head)
    this.mouth = add('holle-mouth', new Sew().form({ at: [0, -0.02, 0], r: [0.27, 0.15, 0.08], across: 6, up: 2, puff: 0, dye: d(0xa8393c, 'smooth') }).form({ at: [-0.31, 0.12, -0.02], r: [0.14, 0.06, 0.07], turn: [0, 0, -0.7], across: 4, up: 2, puff: 0, dye: d(0xa8393c, 'smooth') }).form({ at: [0.31, 0.12, -0.02], r: [0.14, 0.06, 0.07], turn: [0, 0, 0.7], across: 4, up: 2, puff: 0, dye: d(0xa8393c, 'smooth') }), this.head)
    this.mouth.position.set(0, 0.24, 0.86)
    this.cap = add('holle-cap', new Sew().form({ at: [0, 0.2, 0], r: [1.15, 0.6, 0.9], across: 9, up: 2, puff: 0.14, dye: d(C.white, 'dots') }).form({ at: [0, -0.16, 0.1], r: [1.32, 0.17, 1.02], across: 12, up: 2, puff: 0.12, dye: d(C.white, 'stripes') }), this.head)
    this.body.add(this.head)
    for (let i = 0; i < 2; i++) {
      // One unit long from the shoulder, stretched to the hand.
      const arm = add(i ? 'holle-armR' : 'holle-armL', new Sew().form({ at: [0, 0.5, 0], r: [0.42, 0.56, 0.4], across: 7, up: 3, puff: 0.1, taper: 0.8, dye: d(0x6f83c0, 'dots') }), this.body)
      this.arms.push(arm)
      this.hands.push(add(i ? 'holle-handR' : 'holle-handL', new Sew().form({ r: [0.42, 0.38, 0.34], across: 6, up: 2, puff: 0.04, dye: d(C.skin) }).form({ at: [0, 0.16, 0.26], r: [0.4, 0.12, 0.16], across: 4, up: 2, dye: d(C.skinB) }), this.body))
    }
    this.group.add(this.body)

    const uv: number[] = [], col: number[] = [], idx: number[] = []
    const color = new THREE.Color()
    for (let j = 0; j < DOWN; j++) for (let i = 0; i < ACROSS; i++) {
      const [c, print] = SCRAPS[(i * 3 + j * 5) % SCRAPS.length]
      const cell = cellOf(print), start = this.s.length
      color.set(c)
      for (let b = 0; b <= SUB; b++) for (let a = 0; a <= SUB; a++) {
        const fa = a / SUB, fb = b / SUB
        this.s.push((i + fa) / ACROSS); this.t.push((j + fb) / DOWN); this.b.push(Math.pow(Math.sin(Math.PI * fa) * Math.sin(Math.PI * fb), 0.5))
        uv.push(cell.u + fa * cell.s, cell.v + fb * cell.s); col.push(color.r, color.g, color.b)
      }
      for (let b = 0; b < SUB; b++) for (let a = 0; a < SUB; a++) { const n = start + b * (SUB + 1) + a; idx.push(n, n + SUB + 2, n + 1, n, n + SUB + 1, n + SUB + 2) }
    }
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(this.s.length * 3), 3))
    this.geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    this.geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    this.geo.setIndex(idx)
    this.quilt = new THREE.Mesh(this.geo, sheet)
    this.quilt.name = 'quilt'
    this.quilt.userData.jamObject = 'quilt'
    this.quilt.frustumCulled = false
    this.group.add(this.quilt)
  }

  update(v: Village, time: number, dt: number, look: { x: number; y: number }, patted: number): void {
    const q = v.quilt, k = 1 - Math.exp(-dt * 7)
    this.fat += (q.left / FEATHERS - this.fat) * (1 - Math.exp(-dt * 5))
    this.swing += (Math.max(-1, Math.min(1, -q.vx * 0.06)) - this.swing) * k
    this.hug += ((v.night ? 1 : 0) - this.hug) * (1 - Math.exp(-dt * 3))
    const e = q.energy, breath = Math.sin(time * 0.9)
    // She leans after the quilt; the cloud comes along more slowly.
    this.cloudX += (q.x * 0.78 - this.cloudX) * (1 - Math.exp(-dt * 4))
    this.cloud.position.set(this.cloudX, 0.15 + breath * 0.07 + Math.max(0, q.hem - 1) * 0.22, 0)
    const bx = this.cloudX + (q.x - this.cloudX) * 0.6, high = Math.min(1, Math.max(0, (q.hem - 1) / 4.2)), rise = high * 0.6
    this.body.position.set(bx, 0.2 + rise + breath * 0.04 + e * 0.1 * Math.sin(time * 19) - (patted > 0 ? Math.sin(patted * Math.PI) * 0.25 : 0), 0)
    const lean = Math.max(-0.22, Math.min(0.22, (this.cloudX - q.x) * 0.05))
    this.head.rotation.set(0.1 + e * 0.12 * Math.sin(time * 17) + this.hug * (0.25 + breath * 0.08), Math.max(-0.4, Math.min(0.4, (look.x - bx) * 0.05)), lean + Math.sin(time * 0.6) * 0.04)
    this.cap.position.set(0, 1.72 + e * 0.24 * Math.abs(Math.sin(time * 13)), -0.1)
    this.cap.rotation.z = e * 0.14 * Math.sin(time * 15)
    this.pupils.position.set(Math.max(-1, Math.min(1, (look.x - bx) * 0.12)) * 0.1, 1.02 + Math.max(-1, Math.min(1, (look.y - 6) * 0.14)) * 0.1, 0.875)
    const blink = Math.max(0, Math.sin(time * 1.3) * 40 - 39)
    this.lids.visible = this.hug > 0.5 || blink > 0
    this.mouth.scale.set(1 + e * 0.15, 0.5 + e * 1.1 + (this.hug > 0.5 ? (breath * 0.5 + 0.5) * 0.9 : 0) + (q.empty ? 0.2 : 0), 1)
    this.mouth.rotation.z = q.empty && q.rising === 0 ? Math.sin(time * 2) * 0.1 : 0

    // The quilt: its top edge between her fists, hung and stuffed.
    const pos = this.geo.getAttribute('position') as THREE.BufferAttribute, P = pos.array as Float32Array
    const fat = 0.05 + this.fat * 0.95, tall = QUILT_H * (1 - high * 0.62), topY = q.hem + tall
    const jump = e * 0.5 * Math.sin(time * 16)
    for (let i = 0; i < this.s.length; i++) {
      const s = this.s[i] - 0.5, t = this.t[i], droop = (1 - 4 * s * s)
      const wave = Math.sin(s * 7 + time * 1.6) * 0.06 + e * 0.42 * t * Math.sin(s * 5 + t * 4 - time * 17)
      // Buns along the edge when it is full, a limp cloth when it is not.
      const side = Math.max(0, Math.abs(s) - 0.3) / 0.2 * Math.abs(Math.sin(this.t[i] * DOWN * Math.PI)) * this.fat * 0.36 * Math.sign(s), under = Math.max(0, t - 0.6) / 0.4 * Math.abs(Math.sin(this.s[i] * ACROSS * Math.PI)) * this.fat * 0.34
      const limp = (1 - this.fat) * t
      const x = s * QUILT_W * (1 - limp * 0.26) + side + this.swing * t * 1.5
      let y = topY - t * tall - under - droop * ((0.4 + (1 - this.fat) * 0.7) * (1 - t) + 0.04) + limp * Math.sin(s * 22) * 0.16 + jump * (1 - t) * 0.35 + wave * 0.35 + e * t * 0.4 * Math.abs(Math.sin(time * 16 + s * 3))
      // Fat corners roll out, so the whole thing is a pillow and not a sheet.
      let z = -0.15 + this.b[i] * fat * 0.9 + wave + fat * 0.7 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, t)))), 0.6)
      if (patted > 0) z -= Math.sin(patted * Math.PI) * 0.4 * Math.exp(-((s * 3) ** 2))
      if (this.hug > 0.001) { const hy = topY - 0.1 - t * 2.1 + droop * 0.35, hz = 0.35 + this.b[i] * fat * 0.7 + Math.sin(Math.PI * t) * 0.7 + breath * 0.06; y += (hy + 0.35 - y) * this.hug; z += (hz - z) * this.hug }
      P[i * 3] = q.x + x; P[i * 3 + 1] = y; P[i * 3 + 2] = z
    }
    pos.needsUpdate = true
    this.geo.computeVertexNormals()

    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1
      const hx = q.x + side * (QUILT_W / 2 - 0.1) - bx, hy = topY + jump * 0.35 + 0.05 - this.body.position.y, hz = 0.12
      this.hands[i].position.set(hx, hy, hz)
      this.hands[i].rotation.z = side * -0.4
      this.tmp.set(hx - side * 1.55, hy - 5.15, hz + 1.5)
      const long = this.tmp.length()
      this.arms[i].position.set(side * 1.55, 5.15, -1.5)
      this.arms[i].scale.set(1, long, 1)
      this.arms[i].quaternion.setFromUnitVectors(this.up, this.tmp.normalize())
    }
  }
}
