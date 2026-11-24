import * as THREE from 'three'
import type { BearPose } from '../game'
import { BEARS } from '../space'
import { COLOURS as C, ball, biscuit, join, paint, type Look } from './look'

// A removal bear: a pile of round biscuits with cream between, a round biscuit
// head, arms that are rolled wafers. Squashing presses the cream out of the
// sides. Everything is set from the pose each frame.

const BUILD = [
  { biscuits: 3, thick: 0.4, cream: C.jam, body: 1.86, head: 0.78, waves: 14, deep: 0.035, scarf: C.mint },
  { biscuits: 5, thick: 0.27, cream: C.cream, body: 2.5, head: 0.66, waves: 22, deep: 0.02, scarf: C.jam },
] as const

/** A head: a thick round biscuit standing on its edge, with ears and a pale muzzle. */
function headOf(who: 0 | 1): THREE.BufferGeometry {
  const r = BUILD[who].head, parts: THREE.BufferGeometry[] = []
  const face = biscuit(BUILD[who].waves, BUILD[who].deep).toNonIndexed()
  face.scale(r, r * 0.62, r).rotateX(Math.PI / 2)
  parts.push(face)
  for (const s of [-1, 1]) {
    parts.push(paint(ball(r * 0.36, s * r * 0.72, r * 0.74, -0.02, 1, 1, 0.55), C.crust), paint(ball(r * 0.21, s * r * 0.72, r * 0.74, r * 0.14, 1, 1, 0.5), C.biscuitPale))
    parts.push(paint(ball(r * 0.17, s * r * 0.62, -r * 0.16, r * 0.27, 1, 0.8, 0.4, 10), '#e8836b'))
  }
  parts.push(paint(ball(r * 0.4, 0, -r * 0.26, r * 0.3, 1.15, 0.82, 0.62), C.biscuitPale), paint(ball(r * 0.15, 0, -r * 0.1, r * 0.56, 1.3, 0.9, 0.7, 10), C.dark))
  return join(parts, `head-${who}`)
}

const merged = (parts: THREE.BufferGeometry[], name: string): THREE.BufferGeometry => join(parts, name)

export class BearFigure {
  readonly root = new THREE.Group()
  private readonly biscuits: THREE.InstancedMesh
  private readonly creams: THREE.InstancedMesh
  private readonly head = new THREE.Group()
  private readonly whites: THREE.Mesh
  private readonly pupils: THREE.Mesh[] = []
  private readonly lids: THREE.Mesh
  private readonly brows: THREE.Mesh[] = []
  private readonly mouths: Record<string, THREE.Mesh>
  private readonly scarf: THREE.Mesh
  private readonly arms: THREE.InstancedMesh
  private readonly paws: THREE.InstancedMesh
  private readonly m = new THREE.Matrix4()
  private readonly p = new THREE.Vector3()
  private readonly d = new THREE.Vector3()
  private readonly q = new THREE.Quaternion()
  private readonly s = new THREE.Vector3()
  private readonly up = new THREE.Vector3(0, 1, 0)

  constructor(readonly who: 0 | 1, look: Look) {
    const b = BUILD[who], r = b.head, owner = `bear-${who}`
    this.root.name = owner
    const disc = biscuit(b.waves, b.deep)
    disc.name = `${owner}-disc`
    this.biscuits = new THREE.InstancedMesh(disc, look.crumb, b.biscuits + 2)
    const filling = join([paint(new THREE.SphereGeometry(1, 26, 10), b.cream)], `${owner}-filling`)
    this.creams = new THREE.InstancedMesh(filling, look.jelly, b.biscuits - 1)
    const wafer = paint(new THREE.CylinderGeometry(1, 1, 1, 12).translate(0, 0.5, 0), C.crust)
    this.arms = new THREE.InstancedMesh(merged([wafer], `${owner}-arm`), look.crumb, 2)
    this.paws = new THREE.InstancedMesh(merged([paint(ball(1), C.biscuit)], `${owner}-paw`), look.crumb, 2)
    for (const one of [this.biscuits, this.creams, this.arms, this.paws]) { one.frustumCulled = false; this.root.add(one) }
    this.biscuits.name = `${owner}-biscuits`; this.creams.name = `${owner}-creams`; this.arms.name = `${owner}-arms`; this.paws.name = `${owner}-paws`
    const mesh = (name: string, parts: THREE.BufferGeometry[], material: THREE.Material, into: THREE.Object3D = this.head): THREE.Mesh => {
      const one = new THREE.Mesh(merged(parts, `${owner}-${name}`), material)
      one.name = `${owner}-${name}`
      into.add(one)
      return one
    }
    const face = new THREE.Mesh(headOf(who), look.crumb)
    face.name = `${owner}-head`
    this.head.add(face)
    const ex = r * (who ? 0.3 : 0.34), ey = r * 0.2, ez = r * 0.36
    this.whites = mesh('whites', [-1, 1].map((s) => paint(ball(r * 0.21, s * ex, ey, ez, 1, 1.15, 0.6), '#ffffff')), look.icing)
    for (const s of [-1, 1]) {
      const pupil = mesh(`pupil-${s}`, [paint(ball(r * 0.11, 0, 0, 0, 1, 1.15, 0.5, 10), C.black), paint(ball(r * 0.035, r * 0.04, r * 0.05, r * 0.05, 1, 1, 0.6, 6), '#ffffff')], look.icing)
      pupil.position.set(s * ex, ey, ez + r * 0.12)
      this.pupils.push(pupil)
      const brow = mesh(`brow-${s}`, [paint(new THREE.CapsuleGeometry(r * 0.055, r * 0.24, 4, 8).rotateZ(Math.PI / 2), C.dark)], look.icing)
      brow.position.set(s * ex, ey + r * 0.38, ez + r * 0.02)
      this.brows.push(brow)
    }
    this.lids = mesh('lids', [-1, 1].map((s) => paint(ball(r * 0.225, s * ex, ey, ez + r * 0.02, 1, 1.15, 0.62), C.biscuit)), look.crumb)
    const arc = (turn: number): THREE.BufferGeometry => new THREE.TorusGeometry(r * 0.17, r * 0.035, 6, 14, Math.PI).rotateZ(turn).translate(0, -r * 0.3, r * 0.53)
    this.mouths = {
      calm: mesh('mouth-calm', [paint(arc(Math.PI), C.dark)], look.icing),
      strain: mesh('mouth-strain', [paint(new THREE.BoxGeometry(r * 0.4, r * 0.14, r * 0.06).translate(0, -r * 0.4, r * 0.53), '#ffffff'), ...[-0.1, 0, 0.1].map((x) => paint(new THREE.BoxGeometry(r * 0.02, r * 0.14, r * 0.07).translate(r * x, -r * 0.4, r * 0.53), C.dark)), paint(new THREE.BoxGeometry(r * 0.46, r * 0.2, r * 0.04).translate(0, -r * 0.4, r * 0.52), C.dark)], look.icing),
      open: mesh('mouth-open', [paint(ball(r * 0.17, 0, -r * 0.42, r * 0.48, 1, 1.15, 0.6, 12), C.dark), paint(ball(r * 0.1, 0, -r * 0.5, r * 0.54, 1, 0.6, 0.6, 10), '#d8586a')], look.icing),
      glad: mesh('mouth-glad', [paint(new THREE.SphereGeometry(r * 0.24, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 1, 0.5).translate(0, -r * 0.33, r * 0.48), C.dark), paint(ball(r * 0.11, 0, -r * 0.5, r * 0.54, 1.1, 0.5, 0.5, 10), '#d8586a')], look.icing),
    }
    this.scarf = mesh('scarf', [paint(new THREE.TorusGeometry(1, 0.2, 10, 30).rotateX(Math.PI / 2), b.scarf), paint(ball(0.26, 0.5, -0.04, 0.92, 1, 1, 1, 10), b.scarf), paint(new THREE.BoxGeometry(0.3, 0.75, 0.14).rotateZ(0.2).translate(0.66, -0.45, 1.02), b.scarf)], look.crumb, this.root)
    this.root.add(this.head)
    this.root.traverse((o) => { o.userData.jamObject = owner })
    for (const one of [this.biscuits, this.creams, this.arms, this.paws]) one.userData.jamInstanceObjects = Array.from({ length: one.count }, () => owner)
  }

  update(pose: BearPose): void {
    const b = BUILD[this.who], size = BEARS[this.who], s = pose.squash, wide = 1 + (1 - Math.min(1.1, s)) * 0.42, sit = pose.sit, r0 = size.radius
    const base = pose.y + 0.12 * (1 - sit) * s, bodyTop = base + b.body * s * (1 - sit * 0.1)
    const gap = (bodyTop - base) / b.biscuits, set = (mesh: THREE.InstancedMesh, i: number): void => { mesh.setMatrixAt(i, this.m.compose(this.p, this.q, this.s)) }
    for (let i = 0; i < b.biscuits; i++) {
      const k = (i + 0.5) / b.biscuits, r = r0 * (1 - 0.22 * k * k) * wide * (this.who ? 0.96 : 1)
      const x = pose.x - pose.lean * (i + 0.5) * gap
      this.q.setFromAxisAngle(this.d.set(0, 0, 1), pose.lean * 0.8 + (pose.squash < 0.8 ? Math.sin(i * 2.1) * 0.04 : Math.sin(i * 2.1) * 0.02))
      this.p.set(x, base + (i + 0.5) * gap, pose.z)
      this.s.set(r, Math.min(b.thick, gap * 0.8), r)
      set(this.biscuits, i)
      if (i < b.biscuits - 1) {
        this.p.set(x, base + (i + 1) * gap, pose.z)
        const ooze = r * (0.93 + Math.max(0, 1 - s) * 0.22)
        this.s.set(ooze, Math.max(0.05, gap * 0.36), ooze)
        set(this.creams, i)
      }
    }
    // Feet: two small biscuits, which stick out to the front when it sits.
    for (const side of [0, 1]) {
      const x = pose.x + (side ? 1 : -1) * r0 * 0.46
      this.q.setFromAxisAngle(this.d.set(1, 0, 0), sit * 1.3)
      this.p.set(x, pose.y + 0.1 + sit * r0 * 0.4, pose.z + r0 * (0.35 + sit * 0.75))
      this.s.set(r0 * 0.36, 0.2, r0 * 0.46)
      set(this.biscuits, b.biscuits + side)
    }
    // The head.
    const lean = pose.lean, hx = pose.x - lean * (bodyTop - base + b.head), hs = 0.55 + 0.45 * Math.min(1.12, s)
    this.head.position.set(hx, bodyTop + b.head * hs * 0.86, pose.z + 0.14)
    this.head.scale.set(1 + (1 - hs) * 0.4, hs, 1)
    const dx = pose.look.u - hx, dy = pose.look.v - (this.head.position.y * 0.98 - pose.z * 0.2), far = Math.hypot(dx, dy) + 1.2
    this.head.rotation.set(-0.12 - (dy / far) * 0.16 + pose.nod, (dx / far) * 0.42, lean * 1.1)
    const r = b.head, ex = r * (this.who ? 0.3 : 0.34), px = (dx / far) * r * 0.1, py = (dy / far) * r * 0.11
    this.pupils.forEach((pupil, i) => pupil.position.set((i ? 1 : -1) * ex + px, r * 0.2 + py, r * 0.48))
    const shut = pose.blink > 0 || pose.mood === 'flat'
    this.lids.visible = shut
    this.whites.visible = !shut
    for (const one of this.pupils) one.visible = !shut
    const tilt = pose.mood === 'strain' ? 0.3 : pose.mood === 'ouch' ? 0.5 : pose.mood === 'glad' ? 0.25 : 0.06
    this.brows.forEach((brow, i) => { brow.rotation.z = (i ? -1 : 1) * tilt; brow.position.y = r * (0.58 + (pose.mood === 'ouch' ? 0.1 : pose.mood === 'strain' ? -0.06 : 0)) })
    const mouth = pose.mood === 'strain' ? 'strain' : pose.mood === 'ouch' || pose.mood === 'flat' ? 'open' : pose.mood === 'glad' ? 'glad' : 'calm'
    for (const [name, one] of Object.entries(this.mouths)) one.visible = name === mouth
    const neck = r0 * 0.66 * wide
    this.scarf.position.set(pose.x - lean * (bodyTop - base), bodyTop + 0.03, pose.z)
    this.scarf.scale.set(neck, Math.max(0.35, s) * 0.62, neck)
    this.scarf.rotation.z = lean
    // Arms from the shoulder to where each hand is.
    for (let i = 0; i < 2; i++) {
      const hand = pose.hands[i], toward = Math.sign(hand.x - pose.x) || 1
      this.p.set(pose.x - lean * gap * b.biscuits * 0.8 + toward * r0 * 0.78 * wide, base + (bodyTop - base) * 0.8, pose.z + (hand.z - pose.z) * 0.4)
      this.d.set(hand.x, hand.y, hand.z).sub(this.p)
      const length = Math.max(0.05, this.d.length())
      this.q.setFromUnitVectors(this.up, this.d.normalize())
      this.s.set(0.19, length, 0.19)
      set(this.arms, i)
      this.p.set(hand.x, hand.y, hand.z)
      this.q.identity()
      this.s.setScalar(0.25)
      set(this.paws, i)
    }
    for (const one of [this.biscuits, this.creams, this.arms, this.paws]) one.instanceMatrix.needsUpdate = true
  }
}

/** The cub: the same, very small, one mesh. */
export function cubOf(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 2; i++) {
    const b = biscuit(12, 0.04).toNonIndexed()
    b.scale(0.3 - i * 0.03, 0.17, 0.3 - i * 0.03).translate(0, 0.1 + i * 0.22, 0)
    parts.push(b, paint(ball(0.26, 0, 0.21, 0, 1, 0.22, 1), C.vanilla))
  }
  const face = biscuit(12, 0.04).toNonIndexed()
  face.scale(0.34, 0.24, 0.34).rotateX(Math.PI / 2).translate(0, 0.72, 0.03)
  parts.push(face)
  for (const s of [-1, 1]) parts.push(paint(ball(0.13, s * 0.25, 0.97, 0, 1, 1, 0.6, 10), C.crust), paint(ball(0.08, s * 0.13, 0.78, 0.15, 1, 1.15, 0.5, 8), '#ffffff'), paint(ball(0.045, s * 0.13, 0.78, 0.19, 1, 1.15, 0.5, 8), C.black), paint(ball(0.07, s * 0.2, 0.66, 0.14, 1, 0.8, 0.4, 8), '#e8836b'), paint(ball(0.09, s * 0.33, 0.36, 0.12, 1, 1, 1, 8), C.biscuit))
  parts.push(paint(ball(0.13, 0, 0.63, 0.15, 1.15, 0.8, 0.6, 10), C.biscuitPale), paint(ball(0.05, 0, 0.68, 0.23, 1.3, 0.9, 0.7, 8), C.dark), paint(new THREE.TorusGeometry(0.22, 0.06, 8, 18).rotateX(Math.PI / 2).translate(0, 0.46, 0), C.mint))
  return join(parts, 'cub')
}

/** The sugar mouse and its cart: a wafer box on two biscuit wheels, the mouse in front. */
export function cartOf(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [paint(new THREE.BoxGeometry(2.5, 0.28, 1.5).translate(0, 0.84, 0), C.crust), paint(new THREE.BoxGeometry(2.3, 0.1, 1.3).translate(0, 0.96, 0), C.cream)]
  for (const x of [-0.8, 0.8]) for (const z of [-0.62, 0.62]) {
    const wheel = biscuit(12, 0.03).toNonIndexed()
    wheel.scale(0.42, 0.2, 0.42).rotateX(Math.PI / 2).translate(x, 0.43, z)
    parts.push(wheel, paint(ball(0.12, x, 0.43, z + Math.sign(z) * 0.1, 1, 1, 0.6, 8), C.jam))
  }
  return join(parts, 'cart')
}

export function mouseOf(): THREE.BufferGeometry {
  const parts = [paint(ball(0.42, 0, 0.4, 0, 1, 1.05, 0.85), '#fff8f4'), paint(ball(0.2, 0, 0.34, 0.36, 1, 0.8, 1), '#fff8f4'), paint(ball(0.06, 0, 0.38, 0.56, 1, 1, 1, 8), C.jam)]
  for (const s of [-1, 1]) parts.push(paint(ball(0.18, s * 0.28, 0.82, -0.02, 1, 1, 0.45, 10), C.pink), paint(ball(0.055, s * 0.15, 0.54, 0.34, 1, 1.2, 0.6, 8), C.black), paint(ball(0.09, s * 0.3, 0.26, 0.3, 1, 1, 1, 8), '#fff8f4'))
  return join(parts, 'mouse')
}
