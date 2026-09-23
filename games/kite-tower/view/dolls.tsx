import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Hero, KiteController, Watcher } from '../controller'
import { WATCHERS } from '../layout'
import { swayAngle, type Rock } from '../sway'
import { merge, stained, woodLathe } from './shapes'
import { atlasUv, woodMaterial } from './wood'

// Three peg dolls, each a lathed beech body with painted clothes, a round
// head with painted hair or a hat, a face painted on a thin shell (four
// expressions in one atlas, swapped by texture offset), and two little arms.
// Each has its own way of moving: the hero hops on both feet, climbs with a
// crouch, a pull and a knee-over, and dangles from the kite kicking its
// feet; Moss, tall and slow, waddles and peeks through his hands; Bean,
// small and quick, scoots on a buzz, startles with a jump, and spins.

type Expression = 0 | 1 | 2 | 3
const OPEN: Expression = 0
const BLINK: Expression = 1
const HAPPY: Expression = 2
const SURPRISED: Expression = 3

type DollSpec = {
  row: number
  scale: number
  lower: string
  upper: string
  band: string
  hair: string
  hat?: string
  kind: 'bob' | 'cap' | 'beanie'
}

const HERO: DollSpec = { row: 0, scale: 1, lower: '#e25a47', upper: '#ee7a5d', band: '#f7e6c4', hair: '#6d4428', kind: 'bob' }
const MOSS: DollSpec = { row: 1, scale: 1.1, lower: '#6f9a78', upper: '#94b88f', band: '#e9dcc0', hair: '#d8d2c6', hat: '#9c8764', kind: 'cap' }
const BEAN: DollSpec = { row: 2, scale: 0.8, lower: '#3e72b8', upper: '#f3cf5e', band: '#3e72b8', hair: '#8a5a34', hat: '#d9473b', kind: 'beanie' }

const SKIN = '#f4dcc0'
const NECK_Y = 1.34
const HEAD_R = 0.37
const SHOULDER = { x: 0.31, y: 1.14 }
const ARM = 0.78
/** Feet to fingertips with both arms straight up (the hero's hands on the kite string). */
export const DOLL_HANDS = SHOULDER.y + ARM

// ---- faces -------------------------------------------------------------------

const CELL = 256
/** The face shell spans more arc across than down; features are drawn narrower so they land round. */
const SQUEEZE = 0.74

function faceAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = CELL * 4
  canvas.height = CELL * 3
  const context = canvas.getContext('2d')!
  const ink = '#3b2616'
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      context.save()
      context.translate(col * CELL + CELL / 2, row * CELL)
      context.scale(SQUEEZE, 1)
      const eyeY = 112
      const eyeX = 46
      const cheek = context.createRadialGradient(0, 0, 0, 0, 0, 30)
      cheek.addColorStop(0, 'rgba(240,120,110,0.55)')
      cheek.addColorStop(1, 'rgba(240,120,110,0)')
      for (const side of [-1, 1]) {
        context.save()
        context.translate(side * 74, 156)
        context.fillStyle = cheek
        context.beginPath()
        context.arc(0, 0, 30, 0, Math.PI * 2)
        context.fill()
        context.restore()
      }
      context.fillStyle = ink
      context.strokeStyle = ink
      context.lineCap = 'round'
      context.lineWidth = 7
      for (const side of [-1, 1]) {
        const x = side * eyeX
        if (col === OPEN) {
          context.beginPath()
          context.ellipse(x, eyeY, 11, 15, 0, 0, Math.PI * 2)
          context.fill()
          context.fillStyle = '#fff'
          context.beginPath()
          context.arc(x + 4, eyeY - 6, 4, 0, Math.PI * 2)
          context.fill()
          context.fillStyle = ink
        } else if (col === BLINK) {
          context.beginPath()
          context.arc(x, eyeY - 4, 13, Math.PI * 0.15, Math.PI * 0.85)
          context.stroke()
        } else if (col === HAPPY) {
          context.beginPath()
          context.arc(x, eyeY + 8, 14, Math.PI * 1.15, Math.PI * 1.85)
          context.stroke()
        } else {
          context.beginPath()
          context.ellipse(x, eyeY, 13, 18, 0, 0, Math.PI * 2)
          context.fill()
          context.fillStyle = '#fff'
          context.beginPath()
          context.arc(x + 4, eyeY - 7, 5, 0, Math.PI * 2)
          context.fill()
          context.fillStyle = ink
        }
      }
      if (row === 1) {
        // Moss: soft grey brows and a moustache.
        context.strokeStyle = '#9b938a'
        context.lineWidth = 9
        for (const side of [-1, 1]) {
          context.beginPath()
          context.moveTo(side * 30, eyeY - 30 - (col === SURPRISED ? 8 : 0))
          context.quadraticCurveTo(side * 48, eyeY - 38 - (col === SURPRISED ? 8 : 0), side * 64, eyeY - 28)
          context.stroke()
        }
        context.fillStyle = '#c9c1b6'
        context.beginPath()
        context.ellipse(-20, 170, 24, 11, 0.25, 0, Math.PI * 2)
        context.ellipse(20, 170, 24, 11, -0.25, 0, Math.PI * 2)
        context.fill()
        context.fillStyle = ink
        context.strokeStyle = ink
      }
      if (row === 2) {
        context.fillStyle = 'rgba(160,90,50,0.55)'
        for (const [fx, fy] of [
          [-70, 140],
          [-58, 150],
          [-80, 152],
          [70, 140],
          [58, 150],
          [80, 152],
        ]) {
          context.beginPath()
          context.arc(fx, fy, 3.2, 0, Math.PI * 2)
          context.fill()
        }
        context.fillStyle = ink
      }
      const mouthY = row === 1 ? 190 : 176
      context.lineWidth = 6
      if (col === HAPPY) {
        context.beginPath()
        context.moveTo(-22, mouthY - 4)
        context.quadraticCurveTo(0, mouthY + 30, 22, mouthY - 4)
        context.closePath()
        context.fillStyle = '#8a3b2c'
        context.fill()
        context.stroke()
      } else if (col === SURPRISED) {
        context.fillStyle = '#8a3b2c'
        context.beginPath()
        context.ellipse(0, mouthY + 4, 9, 12, 0, 0, Math.PI * 2)
        context.fill()
      } else {
        context.beginPath()
        context.arc(0, mouthY - 14, 18, Math.PI * 0.2, Math.PI * 0.8)
        context.stroke()
      }
      context.restore()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

// ---- geometry -----------------------------------------------------------------

function paintByHeight(geometry: THREE.BufferGeometry, colorAt: (y: number) => string): THREE.BufferGeometry {
  const position = geometry.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < position.count; i++) {
    c.set(colorAt(position.getY(i)))
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function bodyGeometry(spec: DollSpec): THREE.BufferGeometry {
  const profile = [
    { x: 0, y: 0 },
    { x: 0.32, y: 0 },
    { x: 0.355, y: 0.035 },
    { x: 0.36, y: 0.12 },
    { x: 0.33, y: 0.26 },
    { x: 0.295, y: 0.55 },
    { x: 0.285, y: 0.78 },
    { x: 0.3, y: 0.98 },
    { x: 0.3, y: 1.1 },
    { x: 0.265, y: 1.22 },
    { x: 0.18, y: 1.3 },
    { x: 0.13, y: NECK_Y },
    { x: 0, y: NECK_Y + 0.02 },
  ]
  const body = woodLathe(profile, 32, (y) => 0.86 + 0.14 * THREE.MathUtils.smoothstep(y, 0, 0.12))
  return paintByHeight(body, (y) => (y > 1.27 ? SKIN : y > 0.66 ? spec.upper : y > 0.58 ? spec.band : spec.lower))
}

/** A piece of sphere with wood grain running up it (for hair, hats, heads). */
function woodSphere(r: number, phiStart: number, phiLength: number, thetaStart: number, thetaLength: number, color: string, w = 28, h = 14): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, w, h, phiStart, phiLength, thetaStart, thetaLength)
  const position = g.getAttribute('position') as THREE.BufferAttribute
  const uv = g.getAttribute('uv') as THREE.BufferAttribute
  const out: [number, number] = [0, 0]
  const wear = new Float32Array(position.count * 2)
  for (let i = 0; i < position.count; i++) {
    atlasUv(true, 0.4 + position.getY(i) + r, 0.08 + uv.getX(i) * Math.min(1.8, Math.PI * 2 * r * (phiLength / (Math.PI * 2))), out)
    uv.setXY(i, out[0], out[1])
    wear[i * 2 + 1] = 1
  }
  g.setAttribute('wear', new THREE.BufferAttribute(wear, 2))
  return stained(g, color)
}

function headGeometry(spec: DollSpec): THREE.BufferGeometry {
  const r = HEAD_R
  const profile = Array.from({ length: 15 }, (_, i) => {
    const a = -Math.PI / 2 + (Math.PI * i) / 14
    return { x: Math.max(0, Math.cos(a) * r), y: r + Math.sin(a) * r }
  })
  const head = stained(woodLathe(profile, 32), SKIN)
  head.translate(0, -0.04, 0)
  const parts = [head]
  const cy = r - 0.04
  const hair = (g: THREE.BufferGeometry) => {
    g.translate(0, cy, 0)
    parts.push(g)
  }
  if (spec.kind === 'bob') {
    hair(woodSphere(r + 0.025, 0, Math.PI * 2, 0, 1.0, spec.hair))
    // Round the back and sides down to the jaw, leaving the face open.
    hair(woodSphere(r + 0.03, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0.6, 1.5, spec.hair))
  } else if (spec.kind === 'cap') {
    hair(woodSphere(r + 0.02, Math.PI / 2 + 1.1, Math.PI * 2 - 2.2, 0.9, 1.0, spec.hair))
    hair(woodSphere(r + 0.035, 0, Math.PI * 2, 0, 0.95, spec.hat!))
    const brim = woodLathe(
      [
        { x: 0, y: 0 },
        { x: 0.34, y: 0 },
        { x: 0.36, y: 0.02 },
        { x: 0.34, y: 0.045 },
        { x: 0, y: 0.045 },
      ],
      24,
    )
    brim.scale(1, 1, 1.25)
    brim.translate(0, r * 0.62, 0.14)
    hair(stained(brim, spec.hat!))
  } else {
    hair(woodSphere(r + 0.03, 0, Math.PI * 2, 0, 1.2, spec.hat!))
    const cuff = woodLathe(
      [
        { x: r * 0.9, y: -0.06 },
        { x: r + 0.06, y: -0.05 },
        { x: r + 0.075, y: 0.02 },
        { x: r + 0.05, y: 0.08 },
        { x: r * 0.8, y: 0.09 },
      ],
      32,
    )
    cuff.translate(0, r * 0.36, 0)
    hair(stained(cuff, spec.hat!))
    hair(woodSphere(r + 0.02, Math.PI / 2 + 1.2, Math.PI * 2 - 2.4, 1.1, 0.7, spec.hair))
  }
  return merge(parts)
}

function faceGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(HEAD_R + 0.006, 24, 14, Math.PI / 2 - 0.85, 1.7, 0.95, 1.25)
  g.translate(0, HEAD_R - 0.04, 0)
  return g
}

function armGeometry(spec: DollSpec): THREE.BufferGeometry {
  const r = 0.078
  const profile: { x: number; y: number }[] = []
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / 5)
    profile.push({ x: Math.cos(a) * r * 1.12, y: r + Math.sin(a) * r * 1.12 })
  }
  for (let i = 0; i <= 5; i++) {
    const a = (Math.PI / 2) * (i / 5)
    profile.push({ x: Math.cos(a) * r, y: ARM - r + Math.sin(a) * r })
  }
  const arm = woodLathe(profile, 12)
  arm.translate(0, -ARM, 0)
  return paintByHeight(arm, (y) => (y < -ARM + 0.17 ? SKIN : spec.upper))
}

// ---- rig ----------------------------------------------------------------------

class DollRig {
  readonly root = new THREE.Group()
  /** Pivots at the feet: lean, squash and roll. */
  readonly lean = new THREE.Group()
  readonly head = new THREE.Group()
  readonly armL = new THREE.Group()
  readonly armR = new THREE.Group()
  readonly pom: THREE.Mesh | null = null
  readonly texture: THREE.Texture
  private readonly geometries: THREE.BufferGeometry[] = []
  private expression = -1
  readonly spec: DollSpec

  constructor(spec: DollSpec, wood: THREE.Material, faces: THREE.Texture) {
    this.spec = spec
    const body = bodyGeometry(spec)
    const head = headGeometry(spec)
    const face = faceGeometry()
    const arm = armGeometry(spec)
    this.geometries.push(body, head, face, arm)
    this.texture = faces.clone()
    this.texture.repeat.set(1 / 4, 1 / 3)
    this.texture.offset.set(0, 1 - (spec.row + 1) / 3)
    const faceMaterial = new THREE.MeshStandardMaterial({ map: this.texture, transparent: true, depthWrite: false, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -1 })
    this.root.add(this.lean)
    this.lean.add(new THREE.Mesh(body, wood))
    this.head.position.set(0, NECK_Y, 0)
    this.head.add(new THREE.Mesh(head, wood))
    const faceMesh = new THREE.Mesh(face, faceMaterial)
    faceMesh.renderOrder = 3
    this.head.add(faceMesh)
    this.lean.add(this.head)
    this.armL.position.set(-SHOULDER.x, SHOULDER.y, 0)
    this.armR.position.set(SHOULDER.x, SHOULDER.y, 0)
    this.armL.add(new THREE.Mesh(arm, wood))
    this.armR.add(new THREE.Mesh(arm, wood))
    this.lean.add(this.armL, this.armR)
    if (spec.kind === 'beanie') {
      const pom = woodSphere(0.12, 0, Math.PI * 2, 0, Math.PI, '#f7efe0', 16, 10)
      this.geometries.push(pom)
      this.pom = new THREE.Mesh(pom, wood)
      this.pom.position.set(0, HEAD_R * 2 + 0.05, 0)
      this.head.add(this.pom)
    }
    this.root.scale.setScalar(spec.scale)
    this.root.traverse((o) => {
      o.frustumCulled = false
    })
  }

  setExpression(expression: Expression): void {
    if (expression === this.expression) return
    this.expression = expression
    this.texture.offset.x = expression / 4
  }

  /** Arms by how far each is raised (0 down .. PI straight up, outward) and swung forward. */
  arms(raiseL: number, raiseR: number, forwardL = 0, forwardR = 0): void {
    this.armL.rotation.set(forwardL, 0, -raiseL)
    this.armR.rotation.set(forwardR, 0, raiseR)
  }

  /** Turn the head toward a room point (yaw across, pitch up and down), limited like a neck. */
  look(target: { x: number; y: number }, from: { x: number; y: number }, bodyYaw: number, amount = 1): void {
    const dx = target.x - from.x
    const dy = target.y - from.y
    const yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(dx, 3.2))) - bodyYaw * 0.6
    const pitch = Math.max(-0.5, Math.min(0.35, -Math.atan2(dy, Math.abs(dx) + 1.4) * 0.8))
    this.head.rotation.y += (yaw * amount - this.head.rotation.y) * 0.15
    this.head.rotation.x += (pitch * amount - this.head.rotation.x) * 0.15
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose()
    this.texture.dispose()
  }
}

function useRig(spec: DollSpec, wood: THREE.Material, faces: THREE.Texture): DollRig {
  const rig = useMemo(() => new DollRig(spec, wood, faces), [spec, wood, faces])
  useEffect(() => () => rig.dispose(), [rig])
  return rig
}

function blinkAt(t: number, seed: number): boolean {
  const period = 3.1 + (seed % 1.7)
  return (t + seed) % period < 0.13
}

function smooth(t: number): number {
  const k = Math.min(1, Math.max(0, t))
  return k * k * (3 - 2 * k)
}

// ---- the hero -------------------------------------------------------------------

function HeroDoll({ controller, wood, faces }: { controller: KiteController; wood: THREE.Material; faces: THREE.Texture }) {
  const rig = useRig(HERO, wood, faces)
  const scratch = useMemo(() => ({ rock: { angle: 0, pivot: 0 } as Rock, from: { x: 0, y: 0 }, yaw: 0 }), [])
  useFrame((_, dt) => {
    const c = controller
    const hero: Hero = c.hero
    const t = c.t
    const age = t - hero.since
    let x = hero.x
    let y = hero.y
    let roll = 0
    let squash = 1
    let lift = 0
    let raise = 0.18 + hero.reach * 2.75
    let forward = 0
    let yawGoal = hero.facing * 0.55
    let expression: Expression = blinkAt(t, 0.4) ? BLINK : OPEN
    const boop = t - hero.boopAt
    switch (hero.mode) {
      case 'stand': {
        const breathe = Math.sin(t * 2.4)
        squash = 1 + breathe * 0.012
        const goal = c.kiteGoal
        const near = Math.abs(hero.x - goal.x) < 2.4 && c.kite.mode === 'perched'
        if (near && hero.reach > 0.6) {
          // Tiptoe reaching: little two-footed jumps toward the kite.
          const hop = Math.max(0, Math.sin(t * 7.5))
          lift = hop * hop * 0.14 * hero.reach
          squash = 1 + hop * 0.05 - (1 - hop) * 0.03
          expression = blinkAt(t, 0.4) ? BLINK : OPEN
        }
        raise += Math.sin(t * 3.1) * 0.08 * hero.reach
        break
      }
      case 'travel': {
        const seg = hero.segment
        const k = seg.phase
        switch (seg.kind) {
          case 'walk': {
            const hopPhase = k * seg.hops
            const local = hopPhase - Math.floor(hopPhase)
            const air = Math.sin(local * Math.PI)
            lift = air * 0.22
            squash = 0.9 + air * 0.16
            raise = 0.35 + air * 0.55
            forward = -0.3 * air
            break
          }
          case 'climb': {
            if (k < 0.25) {
              squash = 1 - 0.14 * smooth(k / 0.25)
              raise = 0.3 + 2.5 * smooth(k / 0.25)
            } else if (k < 0.75) {
              const p = (k - 0.25) / 0.5
              roll = -hero.facing * 0.42 * Math.sin(p * Math.PI * 0.5)
              squash = 0.9 + 0.04 * p
              raise = 2.8 - 1.9 * p
              forward = -0.9 * p
            } else {
              const p = (k - 0.75) / 0.25
              roll = -hero.facing * 0.42 * (1 - smooth(p))
              squash = 0.94 + 0.12 * Math.sin(p * Math.PI)
              raise = 0.9 - 0.5 * p
            }
            expression = OPEN
            break
          }
          case 'hop': {
            const air = Math.sin(k * Math.PI)
            squash = 0.9 + air * 0.22
            raise = 0.6 + air * 1.8
            roll = -hero.facing * 0.2 * Math.sin(k * Math.PI * 2)
            break
          }
          case 'drop': {
            raise = 2.8
            squash = 1.08
            expression = HAPPY
            break
          }
          case null:
            break
          default: {
            const never: never = seg.kind
            throw new Error(`unknown segment ${String(never)}`)
          }
        }
        break
      }
      case 'grab': {
        const k = Math.min(1, age / 0.8)
        lift = Math.sin(k * Math.PI) * 0.3
        squash = 1 + Math.sin(k * Math.PI) * 0.08
        raise = 3.0
        expression = HAPPY
        break
      }
      case 'fly': {
        // Dangling from the kite string, kicking.
        roll = hero.swing
        squash = 1.03
        raise = 3.05
        forward = Math.sin(t * 2.1) * 0.12
        yawGoal = Math.sin(t * 1.4) * 0.6
        expression = HAPPY
        break
      }
      case 'land': {
        const k = age / 0.9
        squash = 1 - 0.2 * Math.exp(-k * 7) * Math.cos(k * 18)
        raise = 2.2 * (1 - smooth(k))
        expression = HAPPY
        break
      }
      case 'tumble': {
        const duration = 0.55 + Math.min(0.5, Math.max(0, hero.y) * 0.12)
        if (age < duration) {
          roll = hero.spin
          raise = 1.6
          expression = SURPRISED
        } else {
          // Sat on the rug, giggling.
          const k = age - duration
          squash = 0.82 + 0.04 * Math.sin(k * 14) * Math.exp(-k * 2)
          roll = Math.sin(k * 11) * 0.12 * Math.exp(-k * 1.5)
          raise = 0.9 + Math.sin(k * 14) * 0.3
          expression = HAPPY
        }
        break
      }
      default: {
        const never: never = hero.mode
        throw new Error(`unknown hero mode ${String(never)}`)
      }
    }
    let spin = 0
    if (boop < 0.7) {
      spin = smooth(boop / 0.7) * Math.PI * 2
      lift += Math.sin((boop / 0.7) * Math.PI) * 0.18
      expression = HAPPY
    }
    // Ride the sway of whatever the doll stands on.
    if (hero.mode === 'stand' && hero.on !== null) {
      const stack = c.pieceStack[hero.on]
      if (stack >= 0 && stack < c.stacks.length) {
        const rock = swayAngle(c.stacks[stack], t, c.stackKick[stack] ?? 0, scratch.rock)
        const dx = x - rock.pivot
        const cos = Math.cos(rock.angle)
        const sin = Math.sin(rock.angle)
        x = rock.pivot + dx * cos - y * sin
        y = dx * sin + y * cos
        roll += rock.angle
      }
    }
    scratch.yaw += (yawGoal - scratch.yaw) * Math.min(1, dt * 8)
    rig.root.position.set(x, y + lift, hero.z)
    rig.root.rotation.set(0, scratch.yaw + spin, 0)
    if (hero.mode === 'fly') {
      rig.root.rotation.set(0, 0, roll)
      rig.lean.rotation.set(0, scratch.yaw, 0)
    } else if (hero.mode === 'tumble' && age < 0.55 + Math.min(0.5, Math.max(0, hero.y) * 0.12)) {
      // Roll about the middle of the body rather than the feet.
      rig.root.position.y += 0.9
      rig.lean.position.set(0, -0.9, 0)
      rig.root.rotation.set(0, 0, roll)
      rig.lean.rotation.set(0, 0, 0)
    } else {
      rig.lean.position.set(0, 0, 0)
      rig.lean.rotation.set(0, 0, roll)
    }
    if (hero.mode !== 'tumble' || age >= 0.55 + Math.min(0.5, Math.max(0, hero.y) * 0.12)) rig.lean.position.set(0, 0, 0)
    rig.lean.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash))
    rig.arms(raise, raise, forward, forward)
    scratch.from.x = x
    scratch.from.y = y + 1.7
    rig.look(hero.look, scratch.from, scratch.yaw, hero.mode === 'fly' ? 0.3 : 1)
    rig.setExpression(expression)
  })
  return <primitive object={rig.root} />
}

// ---- Moss: tall, slow, gentle ------------------------------------------------------------

function MossDoll({ controller, wood, faces }: { controller: KiteController; wood: THREE.Material; faces: THREE.Texture }) {
  const rig = useRig(MOSS, wood, faces)
  const scratch = useMemo(() => ({ from: { x: 0, y: 0 }, yaw: 0.4 }), [])
  useFrame((_, dt) => {
    const c = controller
    const w: Watcher = c.watchers[0]
    const t = c.t
    const age = t - w.since
    let lift = 0
    let roll = 0
    let squash = 1 + Math.sin(t * 1.5) * 0.012
    let raiseL = 0.12
    let raiseR = 0.12
    let forwardL = 0
    let forwardR = 0
    let yaw = w.facing * 0.45
    let expression: Expression = blinkAt(t, 1.3) ? BLINK : OPEN
    let lookAmount = 1
    switch (w.mode) {
      case 'idle':
        break
      case 'walk': {
        // A waddle: each step swings the whole body round a little and rocks it over.
        const step = (t / 0.62) * Math.PI
        yaw += Math.sin(step) * 0.28
        roll = Math.sin(step) * 0.07
        lift = Math.abs(Math.sin(step)) * 0.035
        forwardL = Math.sin(step) * 0.35
        forwardR = -Math.sin(step) * 0.35
        break
      }
      case 'react': {
        // Hands over the eyes, then one hand drops for a peek.
        const cover = smooth(age / 0.3)
        const peek = smooth((age - 1.2) / 0.4)
        raiseL = 0.12 + 1.9 * cover
        raiseR = 0.12 + 1.9 * cover * (1 - peek)
        forwardL = -1.5 * cover
        forwardR = -1.5 * cover * (1 - peek)
        expression = peek > 0.5 ? SURPRISED : BLINK
        lookAmount = 0.3
        break
      }
      case 'cheer': {
        // Slow arms-up V, rocking side to side.
        const rock = Math.sin(t * 3.4)
        raiseL = 2.5 + rock * 0.15
        raiseR = 2.5 - rock * 0.15
        roll = rock * 0.1
        lift = Math.max(0, Math.sin(t * 6.8)) * 0.05
        expression = HAPPY
        break
      }
      default: {
        const never: never = w.mode
        throw new Error(`unknown watcher mode ${String(never)}`)
      }
    }
    const boop = t - w.boopAt
    let bow = 0
    if (boop < 1.4) {
      // Tips his cap: a slow bow with a hand to the brim.
      const k = boop / 1.4
      bow = Math.sin(k * Math.PI) * 0.35
      raiseR = 0.12 + 2.3 * Math.sin(k * Math.PI)
      forwardR = -1.1 * Math.sin(k * Math.PI)
      expression = HAPPY
    }
    scratch.yaw += (yaw - scratch.yaw) * Math.min(1, dt * 4)
    rig.root.position.set(w.x, lift, WATCHERS[0].z)
    rig.root.rotation.set(0, scratch.yaw, 0)
    rig.lean.rotation.set(bow, 0, roll)
    rig.lean.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash))
    rig.arms(raiseL, raiseR, forwardL, forwardR)
    scratch.from.x = w.x
    scratch.from.y = 1.9
    rig.look(w.look, scratch.from, scratch.yaw, lookAmount)
    rig.setExpression(expression)
  })
  return <primitive object={rig.root} />
}

// ---- Bean: small, quick, bouncy --------------------------------------------------------------

function BeanDoll({ controller, wood, faces }: { controller: KiteController; wood: THREE.Material; faces: THREE.Texture }) {
  const rig = useRig(BEAN, wood, faces)
  const scratch = useMemo(() => ({ from: { x: 0, y: 0 }, yaw: -0.4, pom: 0, pomV: 0, prevX: 0, prevLift: 0 }), [])
  useFrame((_, dt) => {
    const c = controller
    const w: Watcher = c.watchers[1]
    const t = c.t
    const age = t - w.since
    let lift = 0
    let roll = 0
    let jitter = 0
    let squash = 1 + Math.sin(t * 7) * 0.015
    let raiseL = 0.25
    let raiseR = 0.25
    let yaw = w.facing * 0.5
    let spin = 0
    let expression: Expression = blinkAt(t, 2.2) ? BLINK : OPEN
    switch (w.mode) {
      case 'idle': {
        // Can't keep still: a little bounce every few seconds.
        const hop = (t * 0.45) % 1
        if (hop < 0.12) lift = Math.sin((hop / 0.12) * Math.PI) * 0.12
        break
      }
      case 'walk': {
        // A wind-up scoot: a fast buzz, leaning into the direction of travel.
        jitter = Math.sin(t * Math.PI * 18) * 0.018
        roll = -w.facing * 0.16 + Math.sin(t * Math.PI * 18) * 0.05
        lift = Math.abs(Math.sin(t * Math.PI * 9)) * 0.03
        raiseL = 0.6
        raiseR = 0.6
        break
      }
      case 'react': {
        // Startle: a straight-up jump with arms flung out.
        const k = Math.min(1, age / 0.5)
        lift = Math.sin(k * Math.PI) * 0.5
        squash = 1 + Math.sin(k * Math.PI) * 0.12
        raiseL = 1.5
        raiseR = 1.5
        expression = SURPRISED
        break
      }
      case 'cheer': {
        // Spin and bounce.
        spin = (t * 5.2) % (Math.PI * 2)
        lift = Math.abs(Math.sin(t * 6.5)) * 0.3
        squash = 0.92 + Math.abs(Math.sin(t * 6.5)) * 0.14
        raiseL = 2.7
        raiseR = 2.7
        expression = HAPPY
        break
      }
      default: {
        const never: never = w.mode
        throw new Error(`unknown watcher mode ${String(never)}`)
      }
    }
    const boop = t - w.boopAt
    if (boop < 0.9) {
      // A giggly wiggle; the pom-pom boings.
      roll += Math.sin(boop * 30) * 0.12 * (1 - boop / 0.9)
      expression = HAPPY
      if (boop < dt * 1.5) scratch.pomV += 9
    }
    scratch.yaw += (yaw - scratch.yaw) * Math.min(1, dt * 10)
    rig.root.position.set(w.x + jitter, lift, WATCHERS[1].z)
    rig.root.rotation.set(0, scratch.yaw + spin, 0)
    rig.lean.rotation.set(0, 0, roll)
    rig.lean.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash))
    rig.arms(raiseL, raiseR, 0, 0)
    // The pom-pom on a spring, pushed by the body's motion.
    if (dt > 0) {
      const vx = (w.x - scratch.prevX) / dt
      const vy = (lift - scratch.prevLift) / dt
      scratch.pomV += (-vx * 0.8 - vy * 0.5) * dt * 10
    }
    scratch.prevX = w.x
    scratch.prevLift = lift
    scratch.pomV += (-scratch.pom * 90 - scratch.pomV * 7) * dt
    scratch.pom += scratch.pomV * dt
    scratch.pom = Math.max(-0.6, Math.min(0.6, scratch.pom))
    if (rig.pom) {
      rig.pom.position.x = Math.sin(scratch.pom) * 0.12
      rig.pom.position.y = HEAD_R * 2 + 0.05 - Math.abs(scratch.pom) * 0.04
    }
    scratch.from.x = w.x
    scratch.from.y = 1.4
    rig.look(w.look, scratch.from, scratch.yaw, 1)
    rig.setExpression(expression)
  })
  return <primitive object={rig.root} />
}

export function Dolls({ controller }: { controller: KiteController }) {
  const { wood, faces } = useMemo(() => ({ wood: woodMaterial({ vertexColors: true }), faces: faceAtlas() }), [])
  useEffect(
    () => () => {
      wood.dispose()
      faces.dispose()
    },
    [wood, faces],
  )
  return (
    <>
      <MossDoll controller={controller} wood={wood} faces={faces} />
      <BeanDoll controller={controller} wood={wood} faces={faces} />
      <HeroDoll controller={controller} wood={wood} faces={faces} />
    </>
  )
}
