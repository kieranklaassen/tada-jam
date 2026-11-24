import * as THREE from 'three'
import type { Game, Pose } from '../game'
import { CELLS, type Kind } from '../loads'
import { size } from '../cells'
import { DEPTH } from '../space'
import { COLOURS as C, ball, box, join, paint, rod, type Look } from './look'

// The six loads: plain wafer on exactly their cells, with the passenger on the
// front and something of it on the back. A passenger goes by where down is in
// the load's own frame, so each way up shows another small thing. It keeps
// inside the cells except for a moment after it was disturbed.

const FACE = DEPTH / 2
const TINT: Record<Kind, [string, string]> = { bath: ['#f0d9a8', '#fff6e2'], sofa: ['#c4783f', '#f6d9a5'], granny: ['#b5703f', '#b9e0c8'], lamp: ['#e0a64a', '#fff0c8'], piano: ['#7a4426', '#f3d7ac'], giraffe: ['#e6b45c', '#fff3dc'] }

function bodyOf(kind: Kind): THREE.BufferGeometry {
  const cells = CELLS[kind], { w, h } = size(cells), parts: THREE.BufferGeometry[] = [], has = new Set(cells.map(String)), [wafer, cream] = TINT[kind]
  for (const [x, y] of cells) {
    const cx = x - (w - 1) / 2, cy = y - (h - 1) / 2
    parts.push(paint(box(0.93, 0.93, DEPTH, 0.11, cx, cy), wafer))
    // Cream between the cells: the seams that show what it is made of.
    if (has.has(`${x + 1},${y}`)) parts.push(paint(box(0.16, 0.8, DEPTH - 0.14, 0.05, cx + 0.5, cy, 0, 1), cream))
    if (has.has(`${x},${y + 1}`)) parts.push(paint(box(0.8, 0.16, DEPTH - 0.14, 0.05, cx, cy + 0.5, 0, 1), cream))
  }
  return join(parts, `load-${kind}`)
}

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z)
const eyes = (x: number, y: number, z: number, gap: number, r: number): THREE.BufferGeometry[] => [-1, 1].map((s) => paint(ball(r, x + s * gap, y, z, 1, 1.15, 0.6, 8), C.black))

/** What stands still on a load: front and back. */
function still(kind: Kind): THREE.BufferGeometry[] {
  const f = FACE, b = -FACE
  switch (kind) {
    case 'bath': return [paint(box(2.72, 0.74, 0.1, 0.05, 0, 0, f + 0.01), '#fffdf8'), paint(box(2.5, 0.54, 0.06, 0.03, 0, 0, f + 0.05, 1), '#b98f74'), ...[-1, 1].map((s) => paint(ball(0.1, s * 1.2, -0.36, f + 0.06, 1, 0.8, 0.7, 8), C.vanilla)),
      paint(ball(0.26, 0.5, -0.02, b - 0.04, 1.2, 0.8, 0.5), C.duck), paint(ball(0.17, 0.32, 0.22, b - 0.05, 1, 1, 0.6), C.duck), paint(box(2.72, 0.7, 0.08, 0.04, 0, 0, b + 0.01, 1), '#fffdf8')]
    case 'sofa': return [...[-1, 0, 1].map((x) => paint(box(0.84, 0.5, 0.16, 0.08, x, -0.62, f + 0.03), C.jam)), ...[-1, 1].map((s) => paint(box(0.62, 0.62, 0.12, 0.06, s, 0.5, f + 0.02), C.jam)), ...[-1, 1].map((s) => paint(ball(0.07, s, 0.5, f + 0.09, 1, 1, 0.6, 8), C.vanilla)),
      ...[-1, 0, 1].map((x) => paint(box(0.8, 0.7, 0.1, 0.05, x, -0.5, b, 1), C.jamDark))]
    case 'granny': {
      // Two wide and three high: the head is the cell above on the left.
      return [paint(box(1.7, 0.56, 0.14, 0.07, 0, -1, f + 0.02), C.mint), paint(box(0.24, 0.8, 0.2, 0.08, -0.82, -0.2, f + 0.02), C.mint), paint(box(0.24, 0.8, 0.2, 0.08, 0.82, -0.2, f + 0.02), C.mint),
        paint(ball(0.44, -0.3, -0.32, f + 0.06, 1, 1.05, 0.5), '#b892c8'), paint(ball(0.34, -0.5, 0.98, f + 0.02, 1, 1, 0.5), '#f9e2cf'), paint(ball(0.36, -0.5, 1.1, f - 0.04, 1, 0.8, 0.5), '#ffffff'),
        ...eyes(-0.5, 1, f + 0.2, 0.13, 0.035), ...[-1, 1].map((s) => paint(new THREE.TorusGeometry(0.11, 0.022, 6, 16).translate(-0.5 + s * 0.135, 0.98, f + 0.2), C.jam)),
        paint(ball(0.06, -0.5, 0.88, f + 0.2, 1, 1, 0.7, 8), '#eab79c'), paint(new THREE.TorusGeometry(0.1, 0.022, 6, 12, Math.PI).rotateZ(Math.PI).translate(-0.5, 0.82, f + 0.16), C.jamDark),
        paint(ball(0.4, -0.5, 1, b, 1, 1, 0.4), '#ffffff'), paint(ball(0.22, -0.5, 1.12, b - 0.14, 1, 1, 0.7), '#f2ecec'), paint(box(1.7, 1.7, 0.1, 0.05, 0, -0.5, b, 1), C.mint)]
    }
    case 'lamp': return [paint(new THREE.CylinderGeometry(0.72, 1.28, 0.74, 24, 1).scale(1, 1, 0.16).translate(0, 0.5, f + 0.02), '#fff2bd'), ...[-0.9, -0.45, 0, 0.45, 0.9].map((x) => paint(box(0.05, 0.7, 0.05, 0.02, x * 0.9, 0.5, f + 0.14 * (1 - Math.abs(x) * 0.5), 1), '#f1cf6f')),
      paint(box(0.16, 0.8, 0.16, 0.06, 0, -0.5, f + 0.02), C.dark), paint(box(0.7, 0.16, 0.2, 0.07, 0, -0.84, f + 0.02), C.dark),
      paint(new THREE.CylinderGeometry(0.72, 1.28, 0.74, 24, 1).scale(1, 1, 0.14).translate(0, 0.5, b), '#f3dc94'), paint(box(0.14, 0.8, 0.1, 0.04, 0, -0.5, b - 0.02, 1), C.dark)]
    case 'piano': return [paint(box(2.7, 0.3, 0.2, 0.06, 0, -0.42, f + 0.04), '#fffdf4'), ...[-1.1, -0.8, -0.5, 0.02, 0.32, 0.85, 1.15].map((x) => paint(box(0.12, 0.2, 0.12, 0.03, x, -0.38, f + 0.14, 1), C.black)), ...[-1.2, -0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9, 1.2].map((x) => paint(box(0.015, 0.28, 0.02, 0.005, x, -0.42, f + 0.145, 1), '#b9a58c')),
      paint(box(0.74, 0.66, 0.1, 0.05, -1, 0.5, f + 0.01), '#8f5230'), paint(box(0.5, 0.4, 0.04, 0.02, -1, 0.52, f + 0.06, 1), '#fff6e2'), paint(box(2.7, 0.16, 0.12, 0.05, 0, -0.84, f + 0.01, 1), '#5a3018'),
      paint(box(2.6, 0.7, 0.04, 0.02, 0, -0.5, b, 1), '#4b2a18')]
    case 'giraffe': return [paint(box(2.6, 0.18, 0.16, 0.08, 0, -1.34, f + 0.02), C.jam), ...[-0.9, 0.9].map((x) => paint(box(0.3, 0.5, 0.14, 0.07, x, -1.02, f + 0.02), '#fff0cf')), paint(box(1.1, 0.34, 0.2, 0.09, -0.1, -0.72, f + 0.04), C.jam),
      paint(box(0.14, 1.5, 0.14, 0.06, 0.66, -0.1, f + 0.02), C.dark), paint(rod(V(-1.3, -0.72, b), V(-1.34, -1.1, b - 0.1), 0.05), C.dark), paint(box(2.6, 0.18, 0.1, 0.05, 0, -1.34, b, 1), C.jam)]
  }
}

/** Every passenger's moving parts. */
function moving(kind: Kind, look: Look): Record<string, THREE.Object3D> {
  const mesh = (name: string, parts: THREE.BufferGeometry[], material: THREE.Material = look.icing): THREE.Mesh => {
    const m = new THREE.Mesh(join(parts, `${kind}-${name}`), material)
    m.name = `${kind}-${name}`
    return m
  }
  switch (kind) {
    case 'bath': {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3))
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(40 * 3).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3))
      const index: number[] = []
      for (let i = 1; i < 39; i++) index.push(0, i, i + 1)
      g.setIndex(index)
      const milk = new THREE.Mesh(g, look.milk)
      milk.name = 'bath-milk'
      milk.frustumCulled = false
      const duck = mesh('duck', [paint(ball(0.2, 0, 0, 0, 1.2, 0.85, 0.7), C.duck), paint(ball(0.13, 0.16, 0.2, 0.02, 1, 1, 0.8), C.duck), paint(ball(0.07, 0.31, 0.18, 0.03, 1.2, 0.5, 0.8, 8), C.beak), paint(ball(0.028, 0.2, 0.25, 0.12, 1, 1, 0.6, 8), C.black), paint(ball(0.1, -0.22, 0.06, 0, 1, 0.7, 0.5, 8), C.duck)])
      return { milk, duck }
    }
    case 'sofa': return {
      dog: mesh('dog', [paint(ball(0.3, 0, 0, 0, 1.25, 0.68, 0.6), C.bun), paint(ball(0.2, 0.3, 0.1, 0.06, 1, 0.9, 0.8), '#c98245'), paint(ball(0.1, 0.46, 0.05, 0.1, 1.1, 0.8, 0.8, 8), '#e6b27c'), paint(ball(0.05, 0.55, 0.08, 0.12, 1, 1, 1, 8), C.black), paint(ball(0.11, 0.2, 0.16, 0.16, 0.7, 1.3, 0.5, 8), C.dark), paint(rod(V(0.33, 0.12, 0.2), V(0.42, 0.11, 0.2), 0.018), C.black)]),
      tail: mesh('tail', [paint(rod(V(0, 0, 0), V(0, 0.34, -0.04), 0.08, 0.05), C.bun), paint(ball(0.07, 0, 0.36, -0.04, 1, 1, 1, 8), '#e6b27c')]),
    }
    case 'granny': return {
      needles: mesh('needles', [paint(rod(V(-0.3, -0.06, 0), V(0.16, 0.16, 0), 0.025), '#e6e6ee'), paint(rod(V(0.3, -0.06, 0.04), V(-0.14, 0.16, 0.04), 0.025), '#e6e6ee'), paint(box(0.4, 0.26, 0.1, 0.05, 0, -0.2, 0), C.jam), paint(ball(0.12, 0.3, -0.26, 0.02, 1, 1, 0.8, 8), C.jam)]),
      bun: mesh('bun', [paint(ball(0.15, 0, 0, 0, 1, 1, 0.7), '#ffffff'), paint(new THREE.TorusGeometry(0.09, 0.03, 6, 14).translate(0, 0, 0.09), '#e9e2e8')]),
      strand: mesh('strand', [paint(new THREE.CylinderGeometry(0.06, 0.1, 1, 10).translate(0, -0.5, 0), '#ffffff')]),
    }
    case 'lamp': return {
      bulb: mesh('bulb', [paint(ball(0.16, 0, 0, 0, 1, 1.1, 0.7), '#fff9d6')], look.lit),
      drop: mesh('drop', [paint(ball(0.16, 0, 0, 0, 1, 1.1, 0.7), '#fff2a8')], look.lit),
      moth: mesh('moth', [paint(ball(0.06, 0, 0, 0, 0.8, 1.6, 0.8, 8), C.dark), ...[-1, 1].map((s) => paint(ball(0.12, s * 0.12, 0.04, 0, 1, 0.8, 0.15, 8).rotateZ(s * 0.4), '#f3e3ea')), ...eyes(0, 0.1, 0.05, 0.04, 0.02)]),
      moth2: mesh('moth2', [paint(ball(0.06, 0, 0, 0, 0.8, 1.6, 0.8, 8), C.dark), ...[-1, 1].map((s) => paint(ball(0.12, s * 0.12, 0.04, 0, 1, 0.8, 0.15, 8).rotateZ(s * 0.4), '#f3e3ea'))]),
    }
    case 'piano': return {
      mouse: mesh('mouse', [paint(ball(0.18, 0, 0, 0, 0.9, 1, 0.7), C.pink), paint(ball(0.15, 0, 0.22, 0.04), C.pink), ...[-1, 1].map((s) => paint(ball(0.09, s * 0.14, 0.34, 0, 1, 1, 0.4, 8), '#fbd3da')), ...eyes(0, 0.24, 0.17, 0.06, 0.025), paint(ball(0.03, 0, 0.18, 0.19, 1, 1, 1, 8), C.jam), ...[-1, 1].map((s) => paint(ball(0.05, s * 0.16, -0.08, 0.12, 1, 1, 1, 8), '#fbd3da'))]),
      lid: mesh('lid', [paint(box(1.8, 0.28, 0.08, 0.04, 0, -0.14, 0, 1), '#8f5230')]),
      hammers: mesh('hammers', [-1, -0.6, -0.2, 0.2, 0.6, 1].flatMap((x) => [paint(rod(V(x, -0.2, 0), V(x, 0.12, 0), 0.025), '#e6b27c'), paint(ball(0.08, x, 0.14, 0, 1, 0.8, 0.8, 8), '#fff6e2')])),
    }
    case 'giraffe': return {
      head: mesh('head', [paint(ball(0.26, 0, 0.02, 0, 0.9, 1, 0.6), '#f3c873'), paint(ball(0.19, 0.16, -0.1, 0.04, 1.25, 0.8, 0.7), '#fff0cf'), ...[-0.12, 0.06].map((x) => paint(rod(V(x, 0.2, 0), V(x, 0.34, 0), 0.03), C.dark)), ...[-0.12, 0.06].map((x) => paint(ball(0.05, x, 0.35, 0, 1, 1, 1, 8), C.jam)), paint(ball(0.07, 0.02, 0.07, 0.15, 1, 1.1, 0.6, 10), '#ffffff'), paint(ball(0.04, 0.04, 0.07, 0.19, 1, 1.1, 0.6, 8), C.black), ...[-1, 1].map((s) => paint(ball(0.025, 0.3, -0.08 + s * 0.04, 0.15, 1, 1, 1, 6), C.dark)), paint(ball(0.1, -0.24, 0.12, 0, 1.3, 0.6, 0.4, 8), '#f3c873')]),
      bell: mesh('bell', [paint(rod(V(0, 0, 0), V(0, -0.1, 0), 0.02), C.dark), paint(ball(0.11, 0, -0.18, 0, 1, 1.1, 0.8, 10), C.vanilla), paint(ball(0.04, 0, -0.3, 0, 1, 1, 1, 8), C.dark)]),
      tail: mesh('tail', [paint(rod(V(0, 0, 0), V(0, -0.3, 0), 0.03), C.dark), paint(ball(0.08, 0, -0.34, 0, 0.8, 1.4, 0.8, 8), C.dark)]),
    }
  }
}

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v))

/** The bodies are made once and shared: a house and the cart may show one kind twice. */
export class LoadShapes {
  readonly bodies = new Map<Kind, THREE.BufferGeometry>()
  readonly fronts = new Map<Kind, THREE.BufferGeometry>()
  body(kind: Kind): THREE.BufferGeometry { let g = this.bodies.get(kind); if (!g) { g = bodyOf(kind); this.bodies.set(kind, g) } return g }
  front(kind: Kind): THREE.BufferGeometry { let g = this.fronts.get(kind); if (!g) { g = join(still(kind), `front-${kind}`); this.fronts.set(kind, g) } return g }
}

export class LoadFigure {
  readonly root = new THREE.Group()
  private readonly parts: Record<string, THREE.Object3D>
  private level = 0.62
  private slide = 0
  private vSlide = 0
  private swing = 0
  private vSwing = 0
  private readonly body: THREE.Mesh
  private readonly front: THREE.Mesh
  private readonly turn = new THREE.Matrix4()
  private readonly m = new THREE.Matrix4()

  constructor(readonly kind: Kind, owner: string, shapes: LoadShapes, look: Look) {
    this.root.matrixAutoUpdate = false
    this.root.name = owner
    this.body = new THREE.Mesh(shapes.body(kind), look.wafer)
    this.body.name = `${owner}-body`
    this.front = new THREE.Mesh(shapes.front(kind), kind === 'sofa' || kind === 'giraffe' ? look.jelly : look.icing)
    this.front.name = `${owner}-front`
    this.root.add(this.body, this.front)
    this.parts = moving(kind, look)
    for (const part of Object.values(this.parts)) this.root.add(part)
    this.root.traverse((o) => { o.userData.jamObject = owner })
  }

  hide(): void { this.root.visible = false }

  /** `since` is the seconds since this load's passenger was last disturbed. */
  update(pose: Pose | null, game: Game, step: number): void {
    this.root.visible = pose !== null
    if (!pose) return
    const e = this.root.matrix
    e.makeTranslation(pose.x, pose.y, pose.z)
    e.multiply(this.m.makeScale(pose.sx, pose.sy, pose.sz))
    e.multiply(this.turn.makeRotationY(pose.flip))
    e.multiply(this.turn.makeRotationZ(pose.angle))
    if (pose.back) e.multiply(this.turn.makeRotationY(Math.PI))
    this.root.matrixWorldNeedsUpdate = true
    // Down, in the load's own frame.
    const gx = -Math.sin(pose.angle) * (pose.back ? -1 : 1), gy = -Math.cos(pose.angle), th = Math.atan2(gx, -gy)
    const event = game.riderEvent && game.riderEvent.kind === this.kind ? game.time - game.riderEvent.at : 99, what = game.riderEvent?.what
    const pulse = event < 1.5 ? Math.sin((event / 1.5) * Math.PI) : 0, shake = event < 0.9 ? Math.exp(-4 * event) * Math.sin(event * 34) : 0
    const t = game.time
    const spring = (to: number, k: number, d: number): void => { this.vSlide += ((to - this.slide) * k - this.vSlide * d) * step; this.slide += this.vSlide * step }
    this.vSwing += (-Math.sin(this.swing - th) * 90 - this.vSwing * 3.2) * step
    this.swing += this.vSwing * step
    const p = this.parts, z = FACE
    switch (this.kind) {
      case 'bath': {
        const to = gy < -0.5 ? 0.62 : gy > 0.5 ? 0.02 : 0.34
        this.level += (to - this.level) * Math.min(1, step * (to > this.level ? 1.2 : 4))
        const reach = Math.abs(gx) * 1.22 + Math.abs(gy) * 0.25, d = reach * (1 - 2 * this.level)
        this.pour(p.milk as THREE.Mesh, gx, gy, d + shake * 0.1)
        const hang = gy > 0.6
        const cx = clamp(gx * d, -0.95, 0.95) + (hang ? 0.6 : 0), cy = clamp(gy * d, -0.1, 0.12) + (gy < -0.5 ? 0.03 : 0)
        p.duck.position.set(cx + (gy < -0.5 ? Math.sin(t * 0.8) * 0.5 : 0), cy, z + 0.18)
        p.duck.rotation.z = hang ? 0.7 + Math.sin(t * 3) * 0.1 : th + Math.sin(t * 2) * 0.08 + shake * 0.5
        break
      }
      case 'sofa': {
        if (gy < 0.6) spring(gx * 0.95, 60, 9)
        p.dog.position.set(clamp(this.slide, -0.95, 0.95) - 0.05, -0.3, z + 0.2)
        p.dog.scale.set(1, 1 + Math.sin(t * 2.2) * 0.05 + shake * 0.2, 1)
        p.dog.rotation.z = shake * 0.1
        p.tail.position.set(0.5, -0.3, -z - 0.1)
        p.tail.rotation.z = Math.sin(t * 9) * 0.35 * (what === 'swap' && event < 2 ? 1 : 0.3)
        break
      }
      case 'granny': {
        const side = Math.abs(gx) > 0.6
        p.needles.position.set(0.16, -0.14, z + 0.32)
        p.needles.rotation.z = Math.sin(t * (side ? 22 : 11)) * 0.14 + (side ? 0.3 : 0)
        const out = gy > 0.6 && what === 'turn' && event < 1.5 ? pulse : 0
        p.bun.position.set(-0.5, 1.22 + shake * 0.02, z + 0.16)
        p.bun.rotation.z = out * 9
        p.strand.position.set(-0.36, 1.2, z + 0.2)
        p.strand.rotation.z = th
        p.strand.scale.y = Math.max(0.01, out * 0.7)
        p.strand.visible = out > 0.02
        break
      }
      case 'lamp': {
        const fall = gy > 0.6 && what === 'turn' && event < 1.5 ? event / 1.5 : 1
        p.bulb.position.set(0, 0.36, z + 0.2)
        p.bulb.scale.setScalar(fall < 1 ? 0.35 + 0.65 * clamp((fall - 0.7) / 0.3, 0, 1) : 1 + Math.sin(t * 5) * 0.04)
        p.drop.visible = fall < 0.7
        p.drop.position.set(gx * fall * fall * 2.6, 0.36 + gy * fall * fall * 2.6, z + 0.2)
        p.drop.scale.setScalar(Math.max(0.05, 1 - fall * 1.3))
        const a = t * 2.4 + shake * 2
        p.moth.position.set(Math.cos(a) * 0.36, 0.48 + Math.sin(a * 1.3) * 0.16, z + 0.34 + Math.sin(a) * 0.05)
        p.moth.rotation.set(0, Math.sin(t * 22) * 0.7, th + Math.sin(a) * 0.3)
        p.moth2.position.set(Math.sin(a) * 0.3, 0.5 + Math.abs(Math.sin(t * 6)) * 0.08, -z - 0.2)
        p.moth2.rotation.set(0, Math.sin(t * 22) * 0.7, th)
        break
      }
      case 'piano': {
        const run = what === 'in' && event < 1.5 ? Math.sin(event * 8) * 0.5 : what === 'bump' && event < 1 ? shake * 0.3 : 0
        p.mouse.scale.setScalar(0.82)
        p.mouse.position.set(0.45 + run, -0.52 + (gy < -0.5 ? Math.abs(Math.sin(t * 5)) * 0.03 : 0), z + 0.3)
        p.mouse.rotation.z = gy > 0.6 ? 0.3 + Math.sin(t * 8) * 0.12 : clamp(th, -0.5, 0.5)
        // The lid falls over the keys when they are above it.
        spring(gy > 0.5 ? 1 : 0, 120, 10)
        p.lid.position.set(0.42, -0.3, z + 0.16)
        p.lid.rotation.x = -3.05 + clamp(this.slide, 0, 1.1) * 2.8
        p.mouse.position.z += clamp(this.slide, 0, 1) * 0.12
        p.hammers.position.set(0, -0.45, -z - 0.1)
        p.hammers.rotation.x = Math.sin(t * 14) * 0.2 * (event < 2 ? 1 : 0.15)
        break
      }
      case 'giraffe': {
        p.head.position.set(0.95, 1, z + 0.14)
        p.head.rotation.z = clamp(th * 0.55, -0.9, 0.9) + shake * 0.5 + Math.sin(t * 0.9) * 0.03
        p.bell.position.set(0.95, 0.42, z + 0.16)
        p.bell.rotation.z = this.swing
        p.tail.position.set(-1.22, -0.6, z + 0.12)
        p.tail.rotation.z = Math.sin(t * 3) * 0.25 + clamp(th, -0.6, 0.6)
        break
      }
    }
  }

  /** The milk lies level whatever way the bath is held: the trough cut by the line of its surface. */
  private pour(mesh: THREE.Mesh, gx: number, gy: number, d: number): void {
    const HW = 1.22, HH = 0.25, R = 0.14, outline: [number, number][] = []
    for (const [sx, sy, from] of [[1, 1, 0], [-1, 1, 1], [-1, -1, 2], [1, -1, 3]] as const) for (let k = 0; k <= 3; k++) {
      const a = (from + k / 3) * Math.PI / 2
      outline.push([sx * (HW - R) + Math.cos(a) * R, sy * (HH - R) + Math.sin(a) * R])
    }
    const inside = ([x, y]: [number, number]): number => x * gx + y * gy - d, cut: [number, number][] = []
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length], ia = inside(a), ib = inside(b)
      if (ia >= 0) cut.push(a)
      if (ia >= 0 !== ib >= 0) { const k = ia / (ia - ib); cut.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]) }
    }
    const p = mesh.geometry.attributes.position as THREE.BufferAttribute
    mesh.visible = cut.length > 2
    if (!mesh.visible) return
    for (let i = 0; i < 40; i++) { const c = cut[Math.min(i, cut.length - 1)]; p.setXYZ(i, c[0], c[1], FACE + 0.1) }
    p.needsUpdate = true
  }
}

