import * as THREE from 'three'
import { handPose, type Guidance, type HandPose } from '../guidance'
import { BEHIND, EYE, IDS, POND, SIZE, SLEDS, SUN, ground, seen, unseen, type Id } from '../layout'
import { moveToShow } from '../guide'
import { newPose, poseOf, type Sight } from '../motion'
import { scaleOf } from '../play'
import { HEADFUL, SHOWING_S, type Happened, type Village } from '../village'
import type { Tier } from '../config'
import { makeFabric } from './fabric'
import { makeFigure, type Figure } from './figures'
import { Land } from './land'
import { C, d } from './palette'
import { Sew } from './puff'
import { Holle } from './quilt'

// Draws the village. It decides nothing. Everything is made here, at mount,
// and nothing when the module loads.

/** The most loose bits in the air at once: feathers, snow dust, water, straw. */
export const MOST_BITS = 380
const SUN_Z = -10
export const MOST_FEATHERS = 260

type Bit = { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number; s: number; size: number; color: number; up: boolean }

export class View {
  readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera()
  private readonly cloth: THREE.MeshLambertMaterial
  private readonly skyCloth: THREE.MeshLambertMaterial
  private readonly sheet: THREE.MeshLambertMaterial
  private readonly fluff: THREE.MeshLambertMaterial
  private readonly glow: THREE.MeshBasicMaterial
  private readonly hemi = new THREE.HemisphereLight(0xffffff, 0xd6d0bd, 2.5)
  private readonly lamp = new THREE.DirectionalLight(0xfff2d8, 2.05)
  private readonly land: Land
  private readonly holle: Holle
  private readonly figures: Record<Id, Figure>
  private readonly eggs: THREE.InstancedMesh
  private readonly lanterns: THREE.InstancedMesh
  private readonly shadows: THREE.InstancedMesh
  private readonly bits: THREE.InstancedMesh
  private readonly loose: Bit[] = []
  private readonly hand: THREE.Mesh
  private readonly ring: THREE.Mesh
  private readonly handTexture: THREE.CanvasTexture
  private readonly ringTexture: THREE.CanvasTexture
  private readonly pose = newPose()
  private readonly sight: Sight = { asks: false, right: 0, up: 0 }
  private readonly handAt: HandPose = { travel: 0, press: 0, opacity: 0 }
  private readonly m = new THREE.Object3D()
  private readonly tint = new THREE.Color()
  private readonly a = new THREE.Color()
  private dark = 0
  private time = 0
  private patted = 0
  private hayHit = 0
  private dips = 0
  private most = MOST_BITS
  readonly counts = { drawCalls: 0, triangles: 0 }

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(C.sky)
    const fabric = makeFabric()
    this.cloth = new THREE.MeshLambertMaterial({ map: fabric, vertexColors: true })
    this.skyCloth = new THREE.MeshLambertMaterial({ map: fabric, vertexColors: true })
    this.sheet = new THREE.MeshLambertMaterial({ map: fabric, vertexColors: true, side: THREE.DoubleSide })
    this.fluff = new THREE.MeshLambertMaterial({ map: fabric, vertexColors: true, emissive: 0x4a4a52 })
    this.glow = new THREE.MeshBasicMaterial({ map: fabric, vertexColors: true })
    this.lamp.position.set(-7, 12, 14)
    this.scene.add(this.hemi, this.lamp)
    this.land = new Land(this.cloth, this.glow, this.skyCloth)
    this.scene.add(this.land.group)
    this.holle = new Holle(this.cloth, this.sheet)
    this.scene.add(this.holle.group)
    this.figures = Object.fromEntries(IDS.map((id) => [id, makeFigure(id, this.cloth)])) as Record<Id, Figure>
    for (const id of IDS) this.scene.add(this.figures[id].root)

    const many = (name: string, geo: THREE.BufferGeometry, mat: THREE.Material, n: number) => {
      const mesh = new THREE.InstancedMesh(geo, mat, n)
      mesh.name = name
      mesh.frustumCulled = false
      mesh.count = 0
      this.scene.add(mesh)
      return mesh
    }
    this.eggs = many('eggs', new Sew().form({ at: [0, 0.22, 0], r: [0.2, 0.26, 0.2], across: 6, up: 3, puff: 0.03, dye: d(C.cream, 'dots') }).geometry(), this.cloth, 6)
    this.lanterns = many('lanterns', new Sew().form({ r: [0.2, 0.25, 0.2], across: 6, up: 2, dye: d(0xffd56a, 'stripes') }).geometry(), this.glow, 4)
    const disc = new THREE.CircleGeometry(1, 20)
    disc.rotateX(-Math.PI / 2)
    this.shadows = many('shadows', disc, new THREE.MeshBasicMaterial({ color: 0x27304a, transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), IDS.length)
    this.shadows.renderOrder = 1
    this.bits = many('bits', new Sew().form({ r: [0.62, 0.9, 0.4], taper: 0.75, across: 7, up: 3, sub: 1, puff: 0, dye: d(C.white, 'smooth') }).geometry(), this.fluff, MOST_BITS)
    this.bits.setColorAt(0, this.tint.set(0xffffff))

    this.handTexture = new THREE.CanvasTexture(paintHand())
    this.ringTexture = new THREE.CanvasTexture(paintRing())
    this.handTexture.colorSpace = this.ringTexture.colorSpace = THREE.SRGBColorSpace
    const over = (name: string, map: THREE.Texture, w: number, h: number, order: number) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, depthTest: false, depthWrite: false }))
      mesh.name = name
      mesh.renderOrder = order
      mesh.visible = false
      this.scene.add(mesh)
      return mesh
    }
    this.ring = over('ring', this.ringTexture, 1, 1, 9)
    this.hand = over('ghost-hand', this.handTexture, 2.7, 2.7, 10)
    const s = unseen(SUN.x, SUN.y, SUN_Z)
    this.land.sun.position.set(s.x, s.y, SUN_Z)
    this.land.moon.position.set(s.x, s.y, SUN_Z)
  }

  setTier(tier: Tier): void {
    this.most = tier.bits
  }

  resize(w: number, h: number, dpr: number): void {
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h, false)
    // Straight on and shifted, so the lane the sleds run in is drawn to one scale and the land is seen from above.
    const s = scaleOf(w, h), hw = w / 2 / s, hh = h / 2 / s, n = 8, k = n / EYE.z
    this.camera.position.set(0, EYE.y, EYE.z)
    this.camera.matrixAutoUpdate = true
    this.camera.projectionMatrix.makePerspective(-hw * k, hw * k, (hh - EYE.y) * k, (-hh - EYE.y) * k, n, 80, this.camera.coordinateSystem)
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert()
  }

  /** What just happened, for what it throws up. */
  on(e: Happened, v: Village): void {
    const b = e.id ? v.bodies[e.id] : null
    if (e.type === 'pat') this.patted = 1
    if (e.type === 'hay') { this.hayHit = 1; this.burst(e.x ?? 0, (b?.y ?? -5) + 1, 22, 0xf0cf5c, 4.5, 0.2) }
    if (!b) return
    if (e.type === 'land' && v.snow.at(b.x) > 0.08) this.burst(b.x, b.y + 0.1, 10, 0xffffff, 3.2 * (0.5 + (e.power ?? 0)), 0.2)
    if (e.type === 'stop') this.burst(b.x + b.face * SIZE[b.id].half, b.y + 0.1, 9, C.grassB, 2.6, 0.17)
    if (e.type === 'splash') { this.burst(b.x, POND.level + 0.2, 30, 0x8cc9ea, 6.5 * (0.4 + (e.power ?? 0.5)), 0.24); this.dips = 1 }
    if (e.type === 'poke' && b.id === 'walrus') this.burst(b.x + 0.2, b.y + 3.4, 8, 0x9fd3ee, 2.4, 0.16)
    if (e.type === 'stop' && b.id === 'walrus') this.burst(b.x + b.face * 1.2, b.y + 1.5, 9, 0x8cc9ea, 3, 0.16)
  }

  private burst(x: number, y: number, n: number, color: number, speed: number, size: number): void {
    const count = Math.round(n * Math.min(1, this.most / 260))
    for (let i = 0; i < count && this.loose.length < 120; i++) {
      const a = (i / count) * Math.PI * 2 + i, up = 0.45 + ((i * 37) % 10) / 14
      this.loose.push({ x, y, z: Math.sin(a) * 0.4 + 0.5, vx: Math.cos(a) * speed * 0.6, vy: speed * up, vz: Math.sin(a) * speed * 0.35, t: 0, s: 0.9, size, color, up: false })
    }
  }

  draw(v: Village, guidance: Guidance | null, dt: number): void {
    this.time += dt
    const time = this.time
    this.evening(v, dt)
    this.land.snow(v.snow)
    this.patted = Math.max(0, this.patted - dt / 0.45)
    this.hayHit = Math.max(0, this.hayHit - dt / 0.9)
    this.dips = Math.max(0, this.dips - dt / 1.6)
    this.land.hay.scale.set(1 - Math.sin(this.hayHit * 12) * 0.12 * this.hayHit, 1 + Math.sin(this.hayHit * 12) * 0.12 * this.hayHit, 1)
    this.land.water.position.y = Math.sin(time * 1.1) * 0.025 + Math.sin(this.dips * 14) * 0.12 * this.dips

    // Where everybody looks: whoever moves, else what is asked for.
    const asker = v.night || v.quilt.empty ? null : v.asker
    const mover = v.list.find((b) => b.mode === 'slide' || b.mode === 'air' || b.mode === 'held')
    const end = asker ? v.snowEnds(asker.x) : 0
    const eye = mover ? { x: mover.x, y: mover.y + 1 } : asker ? { x: asker.x, y: asker.y + 1 } : { x: v.quilt.x, y: -3 }
    this.holle.update(v, time, dt, eye, this.patted)

    let shades = 0, eggs = 0, lamps = 0
    for (const id of IDS) {
      const b = v.bodies[id], f = this.figures[id]
      const sight = this.sight
      sight.asks = b === asker
      // The one who asks looks from the bare grass to the quilt and back.
      const at = b === asker ? (Math.sin(time * 1.1) > -0.1 ? { x: v.quilt.x, y: v.quilt.hem + 1.5 } : { x: end + 1, y: ground(end + 1) }) : mover && mover !== b ? { x: mover.x, y: mover.y + 1 } : { x: v.quilt.x, y: v.quilt.hem }
      const dx = at.x - b.x, dy = at.y - b.y - 1.6, l = Math.max(1, Math.hypot(dx, dy))
      sight.right = dx / l
      sight.up = dy / l
      const p = poseOf(b, time, sight, this.pose)
      const a = b.tilt + (id === 'granny' ? 0 : p.lean) + p.flip * (id === 'cow' ? 1 : 0), mid = 1.1
      if (id !== 'cow' && id !== 'grandpa') p.flip = 0
      if (id === 'cow') p.up += 1.5 * Math.abs(Math.sin(p.flip)) + 0.4 * (1 - Math.cos(p.flip))
      const ridden = v.above(id) !== null
      // With somebody on the head there is no fountain, no hat in the air and no snow.
      if (ridden && (id === 'walrus' || id === 'mayor')) p.c = 0
      f.root.position.set(b.x + Math.sin(a) * mid - Math.sin(b.tilt) * mid, b.y + p.up + (Math.cos(b.tilt) - Math.cos(a)) * mid, b.z)
      f.root.rotation.set(0, b.face < 0 ? -0.5 : 0.12, a)
      f.apply(p)
      const snow = Math.min(1, b.cap / HEADFUL)
      f.cap.visible = !ridden && snow > 0.04 && !(b.sneeze > 0.62)
      f.cap.scale.setScalar(0.35 + 0.65 * snow)
      if (b.sneeze > 0.62 && b.sneeze - dt <= 0.62) this.burst(b.x, b.y + SIZE[id].tall * 0.8, 22, 0xffffff, 5, 0.22)
      if (b.egg && !v.above(id)) { this.m.position.set(b.x + f.egg[0] - Math.sin(a) * f.egg[1], b.y + f.egg[1] * Math.cos(a) + p.up, b.z + f.egg[2]); this.m.rotation.set(0, 0, a); this.m.scale.setScalar(1); this.m.updateMatrix(); this.eggs.setMatrixAt(eggs++, this.m.matrix) }
      if (v.night && b.out && (SLEDS as readonly Id[]).includes(id)) { this.m.position.set(b.x + SIZE[id].half * 0.9, b.y + 1.75 + Math.sin(time * 2 + b.x) * 0.06, b.z + 0.85); this.m.rotation.set(0, 0, Math.sin(time * 3 + b.x) * 0.15); this.m.scale.setScalar(1); this.m.updateMatrix(); this.lanterns.setMatrixAt(lamps++, this.m.matrix) }
      if (!b.on && !v.snow.water(b.x)) {
        const top = b.z < -1 || b.z > 1 ? ground(b.x) + 0.05 + (b.z < -1.8 ? (-1.8 - b.z) * 0.16 : 0) : v.snow.top(b.x) + 0.12
        const high = Math.max(0, b.y - top), k = 1 / (1 + high * 0.35)
        this.m.position.set(b.x, top, b.z)
        this.m.rotation.set(0, 0, Math.atan((v.snow.top(b.x + 0.7) - v.snow.top(b.x - 0.7)) / 1.4))
        this.m.scale.set(SIZE[id].half * 1.15 * k, 1, 0.95 * k)
        this.m.updateMatrix()
        this.shadows.setMatrixAt(shades++, this.m.matrix)
      }
    }
    for (const [mesh, n] of [[this.shadows, shades], [this.eggs, eggs], [this.lanterns, lamps]] as const) { mesh.count = n; mesh.instanceMatrix.needsUpdate = true }
    this.air(v, dt)
    this.guide(v, guidance)
    this.renderer.render(this.scene, this.camera)
    this.counts.drawCalls = this.renderer.info.render.calls
    this.counts.triangles = this.renderer.info.render.triangles
  }

  private air(v: Village, dt: number): void {
    let n = 0
    const m = this.m, mesh = this.bits
    const put = (color: number) => { m.updateMatrix(); mesh.setMatrixAt(n, m.matrix); mesh.setColorAt(n, this.tint.set(color)); n++ }
    for (const f of v.feathers) {
      if (n >= MOST_FEATHERS) break
      if (f.age < 0) continue
      // A feather at the quilt, a round flake of snow by the time it is down.
      const fall = Math.min(1, Math.max(0, f.y - v.snow.top(f.x)) / 4.5)
      const rock = Math.sin(f.age * 5 + f.seed * 9)
      const back = f.z + (BEHIND - f.z) * Math.max(0, fall * 1.6 - 0.6), w = unseen(f.x + rock * 0.28 * fall, f.y, back)
      m.position.set(w.x, w.y, back)
      m.rotation.set(0.4, (f.seed - 0.5) * 0.8, (f.seed - 0.5) * 2 + rock * 0.9 * fall + Math.PI / 2 * fall)
      m.scale.set(0.3 + fall * 0.1, 0.2 + fall * 0.3, 0.3)
      put(0xffffff)
      // Each has a smaller one by it, so a shake looks like a shake.
      if (n >= MOST_FEATHERS) break
      m.position.x += (f.seed < 0.5 ? -1 : 1) * (0.28 + f.seed * 0.3) * fall
      m.position.y += 0.3 + f.seed * 0.35 * fall
      m.rotation.z += 1.1
      m.scale.multiplyScalar(0.72)
      put(0xffffff)
    }
    // Feathers on their way back up, drawn from whatever the pat takes off the hill.
    if (v.quilt.rising > 0 && this.loose.length < 110) {
      for (let k = 0; k < 2; k++) {
        const x = v.quilt.x + (((this.loose.length * 7.31 + this.time * 37 + k * 5.7) % 18) - 9)
        if (v.snow.at(x) > 0.02) this.loose.push({ x, y: v.snow.top(x) + 0.1, z: 0.4, vx: 0, vy: 0, vz: 0, t: 0, s: 0.75, size: 0.3, color: 0xffffff, up: true })
      }
    }
    for (let i = this.loose.length - 1; i >= 0; i--) {
      const b = this.loose[i]
      b.t += dt
      if (b.t >= b.s) { this.loose.splice(i, 1); continue }
      if (b.up) {
        const k = (dt / Math.max(dt, b.s - b.t)) * 1
        b.x += (v.quilt.x - b.x) * k
        b.y += (v.quilt.hem + 1.2 - b.y) * k
      } else { b.vy -= 11 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt }
      if (n >= MOST_BITS) continue
      m.position.set(b.x, b.y, b.z)
      m.rotation.set(b.t * 4, b.t * 3, b.t * 6)
      const s = b.size * (b.up ? 1 : 1 - (b.t / b.s) * 0.6)
      m.scale.set(s, s, s)
      put(b.color)
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  private evening(v: Village, dt: number): void {
    this.dark += ((v.night ? 1 : 0) - this.dark) * (1 - Math.exp(-dt * 1.6))
    const k = this.dark
    this.hemi.color.set(0xffffff).lerp(this.a.set(0x7f90d8), k)
    this.hemi.groundColor.set(0xd6d0bd).lerp(this.a.set(0x3c3f6b), k)
    this.hemi.intensity = 2.5 - k * 1.2
    this.lamp.color.set(0xfff2d8).lerp(this.a.set(0xa9bbff), k)
    this.lamp.intensity = 2.05 - k * 1.45
    this.skyCloth.color.set(0xffffff).lerp(this.a.set(0x6a74c0), k)
    this.renderer.setClearColor(this.a.set(C.sky).lerp(this.tint.set(0x2b3569), k))
    const u = unseen(SUN.x, SUN.y, SUN_Z)
    this.land.sun.position.y = u.y - k * 15
    this.land.sun.rotation.z = Math.sin(this.time * 0.5) * 0.06
    this.land.moon.position.y = u.y + (1 - k) * 9
    this.land.moon.visible = k > 0.02
    this.land.sun.visible = k < 0.98
    this.land.windows.visible = k > 0.3
  }

  private guide(v: Village, g: Guidance | null): void {
    this.hand.visible = this.ring.visible = false
    // The first shake, before anyone has touched, is seen to be done by a hand.
    if (v.showingLeft > 0) { this.handOn(v.quilt.x, v.quilt.hem + 1.2, 1 - v.showingLeft / SHOWING_S, false); return }
    if (!g || g.glow <= 0.01) return
    const move = moveToShow(v, g)
    const wide = move.on === 'quilt' ? 7.8 : 4.6, tall = move.on === 'quilt' ? 4.9 : 4.4
    const beat = 1 + Math.sin(this.time * 2.6) * 0.04, back = seen(0, 0, 1.5).k
    this.ring.visible = true
    this.ring.position.set(move.from.x / back, EYE.y + (move.from.y - EYE.y) / back, 1.5)
    this.ring.scale.set(wide * beat, tall * beat, 1)
    ;(this.ring.material as THREE.MeshBasicMaterial).opacity = g.glow * 0.85
    if (g.demo !== null) this.handOn(move.from.x, move.from.y, g.demo, move.drag, move.to)
  }

  private handOn(x: number, y: number, progress: number, drag: boolean, to = { x, y }): void {
    const pose = handPose(progress, drag, this.handAt, 1), s = 1.15 - pose.press * 0.25
    this.hand.visible = true
    this.hand.position.set(x + (to.x - x) * pose.travel + 0.5, y + (to.y - y) * pose.travel - 1.0, 3)
    const u = unseen(this.hand.position.x, this.hand.position.y, 3)
    this.hand.position.set(u.x, u.y, 3)
    this.hand.scale.setScalar(s)
    ;(this.hand.material as THREE.MeshBasicMaterial).opacity = pose.opacity
  }

  blank(): void {
    this.renderer.clear()
  }

  dispose(): void {
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      mesh.geometry?.dispose()
      if (o instanceof THREE.InstancedMesh) o.dispose()
      const mat = mesh.material as THREE.Material | undefined
      mat?.dispose()
    })
    this.cloth.map?.dispose()
    this.handTexture.dispose()
    this.ringTexture.dispose()
    this.renderer.dispose()
  }
}

function paintHand(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.lineJoin = g.lineCap = 'round'
  const shape = () => {
    g.beginPath()
    g.moveTo(92, 34); g.quadraticCurveTo(110, 18, 124, 38); g.lineTo(130, 112)
    g.quadraticCurveTo(150, 92, 162, 116); g.quadraticCurveTo(182, 102, 190, 126); g.quadraticCurveTo(210, 118, 212, 146)
    g.quadraticCurveTo(216, 208, 176, 236); g.lineTo(112, 236); g.quadraticCurveTo(84, 208, 58, 168); g.quadraticCurveTo(52, 144, 78, 146); g.lineTo(98, 164); g.closePath()
  }
  g.shadowColor = 'rgba(30,30,60,.45)'; g.shadowBlur = 12; g.shadowOffsetY = 6
  g.fillStyle = '#fff6e6'; shape(); g.fill()
  g.shadowColor = 'transparent'
  g.lineWidth = 7; g.strokeStyle = '#5b4a78'; shape(); g.stroke()
  g.setLineDash([9, 8]); g.lineWidth = 3; g.strokeStyle = '#cb4338'; g.save(); shape(); g.clip(); g.lineWidth = 26; g.globalAlpha = 0.25; shape(); g.stroke(); g.restore()
  return c
}

function paintRing(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  for (let i = 0; i < 20; i++) { g.strokeStyle = `rgba(255,214,84,${0.075})`; g.lineWidth = 4 + i * 1.5; g.beginPath(); g.ellipse(128, 128, 104, 104, 0, 0, 7); g.stroke() }
  g.setLineDash([22, 14]); g.lineCap = 'round'; g.lineWidth = 7; g.strokeStyle = 'rgba(255,250,225,.95)'
  g.beginPath(); g.ellipse(128, 128, 104, 104, 0, 0, 7); g.stroke()
  return c
}
