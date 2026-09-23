import * as THREE from 'three'
import { LIFT_HEIGHT, type PondController, type Projector } from '../controller'
import { columnX, COLUMNS, NEAR_Z, PADS, ROWS, rowZ } from '../layout'
import { TierMonitor, tierLook, tierOverride, type TierLook } from '../tiers'
import { buildFirefly, type FireflyView } from './firefly'
import { buildFrog, CAST, type FrogRig } from './frog'
import { buildOverlays, hideFlat, placeFlat, RIPPLE_SLOTS, type Overlays } from './overlays'
import { PALETTE } from './palette'
import { animatorFor, applyPose, overlays as poseOverlays, resetPose, restPose, type Animator, type FrogMoment, type Pose } from './personalities'
import { PerfMeter } from './perf'
import { buildPond, fitBackdrop, PAD_TOP, type PondSet } from './pond'
import { aimRim, createShared, gradientMap, outlineMaterial, toonMaterial, type SharedUniforms } from './toon'

// The 3D pond. One requestAnimationFrame loop steps the controller, poses
// everything, and renders; nothing in the loop allocates. The camera looks
// down at the pond like a diorama on a table, framed on every resize so the
// whole staff fits and the painted sky fills the top.

const PITCH = 0.72
const FOV = 30
const BOTTOM_Z = NEAR_Z + 1.25
const HALF_WIDTH = columnX(COLUMNS - 1) + 1.05
const FAR_HEAD = { y: 1.35, z: rowZ(ROWS - 1) - 0.1 }
const RIPPLE_LIFE = 1.4
const WARM = new THREE.Color(PALETTE.glow)
const SKINS = CAST.map((spec) => new THREE.Color(spec.skin))

type FrogSlot = { rig: FrogRig; animate: Animator; pose: Pose; moment: FrogMoment }

export type PondViewOptions = { search: string; deviceDpr: number }

export class PondView {
  readonly canvas: HTMLCanvasElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 80)
  private readonly shared: SharedUniforms = createShared()
  private readonly pond: PondSet
  private readonly frogs: FrogSlot[]
  private readonly firefly: FireflyView
  private readonly overlays: Overlays
  private readonly meter = new PerfMeter()
  private readonly tiers: TierMonitor
  private look: TierLook
  private readonly deviceDpr: number
  private readonly padY = new Float32Array(PADS.length)
  private readonly padLift = new Float32Array(PADS.length)
  private readonly observer: ResizeObserver
  private width = 1
  private height = 1
  private frame = 0
  private last = -1
  private running = false
  private disposed = false
  private readonly container: HTMLElement
  private readonly pondState: PondController

  constructor(container: HTMLElement, pondState: PondController, options: PondViewOptions) {
    this.container = container
    this.pondState = pondState
    this.deviceDpr = options.deviceDpr
    const pinned = tierOverride(options.search)
    this.tiers = new TierMonitor({ pinned })
    this.look = tierLook(this.tiers.tier, this.deviceDpr)

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false })
    this.renderer.setClearColor(PALETTE.fog)
    this.canvas = this.renderer.domElement
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', touchAction: 'none', display: 'block' })
    container.appendChild(this.canvas)

    const gradient = gradientMap()
    const key = new THREE.DirectionalLight(PALETTE.keyLight, 1.9)
    key.position.set(-4, 9, 7)
    const hemi = new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, 1.25)
    this.scene.add(key, hemi)

    this.pond = buildPond(this.shared, gradient)
    this.scene.add(this.pond.group)

    const frogMaterials = { toon: toonMaterial(this.shared, gradient), outline: outlineMaterial(this.shared, 0.028) }
    this.frogs = CAST.map((_, index) => {
      const rig = buildFrog(index, frogMaterials)
      this.scene.add(rig.group)
      return { rig, animate: animatorFor(rig.spec.character), pose: restPose(), moment: emptyMoment() }
    })

    this.firefly = buildFirefly(this.shared, gradient)
    this.scene.add(this.firefly.group, this.firefly.trail, this.firefly.ambient)

    this.overlays = buildOverlays()
    this.scene.add(this.overlays.shadows, this.overlays.rings, this.overlays.ripples, this.overlays.hand, this.overlays.ghost)

    pondState.setProjector(this.projector)
    this.meter.install(container, new URLSearchParams(options.search).get('fps') === '1')
    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(container)
    this.resize()
    this.bindInput()
    this.renderFrame(0)
  }

  // Screen ⇄ pond, in CSS pixels on the canvas. Allocation-free.
  private readonly v = new THREE.Vector3()
  private readonly rayOrigin = new THREE.Vector3()
  private readonly rayDir = new THREE.Vector3()
  readonly projector: Projector = {
    toScreen: (x, y, z, out) => {
      const v = this.v.set(x, y, z).project(this.camera)
      if (v.z > 1) return null
      out.x = (v.x * 0.5 + 0.5) * this.width
      out.y = (-v.y * 0.5 + 0.5) * this.height
      return out
    },
    toPlane: (sx, sy, planeY, out) => {
      this.rayOrigin.setFromMatrixPosition(this.camera.matrixWorld)
      this.rayDir.set((sx / this.width) * 2 - 1, -(sy / this.height) * 2 + 1, 0.5).unproject(this.camera).sub(this.rayOrigin)
      if (Math.abs(this.rayDir.y) < 1e-6) return null
      const t = (planeY - this.rayOrigin.y) / this.rayDir.y
      if (t <= 0) return null
      out.x = this.rayOrigin.x + this.rayDir.x * t
      out.y = this.rayOrigin.z + this.rayDir.z * t
      return out
    },
  }

  setRunning(running: boolean): void {
    if (this.running === running || this.disposed) return
    this.running = running
    this.pondState.setRunning(running)
    if (running) {
      this.last = -1
      this.frame = requestAnimationFrame(this.tick)
    } else cancelAnimationFrame(this.frame)
  }

  private readonly tick = (now: number) => {
    if (!this.running) return
    this.frame = requestAnimationFrame(this.tick)
    const interval = this.last < 0 ? 16.7 : now - this.last
    this.last = now
    if (this.tiers.sample(interval, now)) this.applyTier()
    const start = performance.now()
    this.pondState.step(Math.min(1 / 20, interval / 1000))
    this.renderFrame(Math.min(1 / 20, interval / 1000))
    this.meter.record(performance.now() - start, interval)
  }

  private applyTier(): void {
    this.look = tierLook(this.tiers.tier, this.deviceDpr)
    this.meter.tier = this.tiers.tier
    this.renderer.setPixelRatio(this.look.dpr)
    this.renderer.setSize(this.width, this.height, false)
    this.pond.padOutlines.visible = this.look.padOutlines
    this.shared.uSway.value = this.look.reedSway ? 1 : 0
    this.firefly.setPixelScale((this.height * this.look.dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2))))
  }

  private resize(): void {
    const width = Math.max(1, this.container.clientWidth)
    const height = Math.max(1, this.container.clientHeight)
    if (this.container.clientWidth === 0 || this.container.clientHeight === 0) return
    this.width = width
    this.height = height
    this.camera.aspect = width / height
    frameCamera(this.camera)
    aimRim(this.shared, this.camera)
    fitBackdrop(this.pond.backdrop, this.camera)
    this.applyTier()
    if (!this.running) this.renderFrame(0)
  }

  private bindInput(): void {
    const canvas = this.canvas
    const local = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return [event.clientX - rect.left, event.clientY - rect.top] as const
    }
    const down = (event: PointerEvent) => {
      if (!this.running) return
      event.preventDefault()
      canvas.setPointerCapture?.(event.pointerId)
      const [x, y] = local(event)
      this.pondState.pointerDown(event.pointerId, x, y, event.timeStamp)
    }
    const move = (event: PointerEvent) => {
      if (!this.running) return
      const [x, y] = local(event)
      this.pondState.pointerMove(event.pointerId, x, y)
    }
    const up = (event: PointerEvent) => {
      if (!this.running) return
      const [x, y] = local(event)
      this.pondState.pointerUp(event.pointerId, x, y, event.timeStamp)
    }
    const cancel = (event: PointerEvent) => this.pondState.pointerCancel(event.pointerId)
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', cancel)
    canvas.addEventListener('contextmenu', (event) => event.preventDefault())
    this.unbind = () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancel)
    }
  }

  private unbind: () => void = () => {}

  private renderFrame(dt: number): void {
    const c = this.pondState
    const t = c.time
    this.shared.uTime.value = t
    this.posePads(t, dt)
    let flare = 0
    for (const slot of this.frogs) flare = Math.max(flare, this.poseFrog(slot, dt))
    this.firefly.update(c.firefly, t, dt, flare, this.look)
    this.placeOverlays(t)
    this.renderer.render(this.scene, this.camera)
    const info = this.renderer.info.render
    this.meter.drawCalls = info.calls
    this.meter.triangles = info.triangles
  }

  private readonly matrix = new THREE.Matrix4()
  private readonly position = new THREE.Vector3()
  private readonly quaternion = new THREE.Quaternion()
  private readonly scale = new THREE.Vector3()
  private readonly up = new THREE.Vector3(0, 1, 0)

  private posePads(t: number, dt: number): void {
    const c = this.pondState
    const { pads, padOutlines, padRings } = this.pond
    for (let i = 0; i < PADS.length; i++) {
      const pad = PADS[i]
      let hovered = false
      for (const frog of c.frogs) if (frog.mode === 'held' && frog.hover === i && c.state.frogs[frog.index] !== i) hovered = true
      this.padLift[i] += ((hovered ? 0.07 : 0) - this.padLift[i]) * (1 - Math.exp(-dt * 14))
      const kick = t - c.padKickAt[i]
      const dip = kick < 2 ? -c.padKickStrength[i] * 0.075 * Math.exp(-kick * 4.5) * Math.sin(kick * 2.4 * Math.PI * 2 + 0.3) : 0
      const y = Math.sin(t * 1.25 + i * 1.7) * 0.012 + dip + this.padLift[i]
      this.padY[i] = y
      const tilt = Math.sin(t * 0.9 + i * 2.3) * 0.025 + dip * 0.6
      this.quaternion.setFromAxisAngle(this.up, pad.notch)
      this.position.set(pad.x, y, pad.z)
      const s = 1 + Math.max(0, -dip) * 0.4
      this.scale.set(pad.radius * s, 1 + tilt, pad.radius * s)
      this.matrix.compose(this.position, this.quaternion, this.scale)
      pads.setMatrixAt(i, this.matrix)
      padOutlines.setMatrixAt(i, this.matrix)
      const wave = pad.radius * (2.55 + Math.sin(t * 0.8 + i) * 0.08)
      this.position.set(pad.x, 0.004, pad.z)
      this.scale.set(wave, 1, wave)
      this.matrix.compose(this.position, this.quaternion, this.scale)
      padRings.setMatrixAt(i, this.matrix)
    }
    pads.instanceMatrix.needsUpdate = true
    padOutlines.instanceMatrix.needsUpdate = true
    padRings.instanceMatrix.needsUpdate = true
  }

  /** Poses one frog; returns how brightly the firefly should flare for it. */
  private poseFrog(slot: FrogSlot, dt: number): number {
    const c = this.pondState
    const frog = c.frogs[slot.rig.index]
    const spec = slot.rig.spec
    const m = slot.moment
    const t = c.time
    const pad = c.state.frogs[frog.index]
    const surface = frog.mode === 'sit' ? this.padY[pad] + PAD_TOP : PAD_TOP
    const group = slot.rig.group
    group.position.set(frog.x, surface + frog.y, frog.z)
    this.rayOrigin.setFromMatrixPosition(this.camera.matrixWorld)
    group.rotation.y = Math.atan2(this.rayOrigin.x - frog.x, this.rayOrigin.z - frog.z) * 0.7

    m.time = t
    m.dt = dt
    m.clock = c.clock
    m.beat = c.beat
    m.mode = frog.mode
    m.sing = t - frog.sungAt
    m.singStrength = frog.singStrength
    m.press = t - frog.pressedAt
    m.tap = t - frog.tappedAt
    m.lift = t - frog.liftedAt
    m.land = t - frog.landedAt
    m.splash = t - frog.splashedAt
    m.hop = frog.mode === 'hop' ? Math.max(0, Math.min(1, (t - frog.hopStart) / frog.hopDuration)) : -1
    m.vx = frog.vx
    m.vz = frog.vz
    const f = c.firefly
    m.gazeX = (f.x - frog.x) / spec.scale
    m.gazeY = (f.y - (surface + frog.y + 1.05 * spec.scale)) / spec.scale
    m.gazeZ = (f.z - frog.z) / spec.scale
    m.fireNear = Math.max(0, 1 - Math.hypot(f.x - frog.x, f.z - frog.z) / 2.4)
    m.invite = c.inviteFrog === frog.index ? c.timing.invite : null

    resetPose(slot.pose)
    slot.animate(m, slot.pose)
    poseOverlays(m, slot.pose)
    applyPose(slot.rig, slot.pose)
    return m.sing < 0.35 ? 1 - m.sing / 0.35 : 0
  }

  private placeOverlays(t: number): void {
    const c = this.pondState
    const { shadows, rings, ripples, hand, ghost } = this.overlays
    const shadowY = PAD_TOP + 0.03
    for (const slot of this.frogs) {
      const frog = c.frogs[slot.rig.index]
      const lift = Math.max(0, frog.y)
      const size = slot.rig.spec.scale * 1.3 * Math.max(0.35, 1 - lift * 0.4)
      const over = frog.mode === 'sit' ? this.padY[c.state.frogs[frog.index]] : 0
      placeFlat(shadows, slot.rig.index, frog.x, shadowY + over, frog.z + 0.05, size, size * 0.8)
    }
    const f = c.firefly
    placeFlat(shadows, 5, f.x, shadowY, f.z, 0.42, 0.34)
    shadows.instanceMatrix.needsUpdate = true

    const glow = c.timing.glow
    const warm = WARM
    let ring = 0
    for (const frog of c.frogs) {
      const g = frog.mode === 'sit' ? glow : 0
      const pad = PADS[c.state.frogs[frog.index]]
      if (g > 0.01) placeFlat(rings, ring, pad.x, this.padY[pad.index] + PAD_TOP + 0.02, pad.z, pad.radius * 2.5, pad.radius * 2.5, warm.r * g, warm.g * g, warm.b * g)
      else hideFlat(rings, ring)
      ring++
    }
    let target: number | null = null
    let strength = 0
    for (const frog of c.frogs) {
      if (frog.mode === 'held' && frog.hover !== null) {
        target = frog.hover
        strength = 1
      }
    }
    if (target === null && c.hint?.kind === 'dragFrog' && c.timing.demo !== null) {
      target = c.hint.toPad
      strength = c.hand.opacity
    }
    if (target !== null) {
      const pad = PADS[target]
      const pulse = strength * (0.75 + 0.25 * Math.sin(t * 7))
      placeFlat(rings, ring, pad.x, this.padY[target] + PAD_TOP + 0.02, pad.z, pad.radius * 2.6, pad.radius * 2.6, pulse, pulse * 0.95, pulse * 0.8)
    } else hideFlat(rings, ring)
    rings.instanceMatrix.needsUpdate = true
    rings.instanceColor!.needsUpdate = true

    for (let i = 0; i < RIPPLE_SLOTS; i++) {
      const ripple = c.ripples[i]
      const age = t - ripple.at
      if (age < 0 || age >= RIPPLE_LIFE) {
        hideFlat(ripples, i)
        continue
      }
      const k = age / RIPPLE_LIFE
      const size = ripple.size * (0.5 + age * 1.9)
      const fade = (1 - k) * 0.7
      placeFlat(ripples, i, ripple.x, 0.01, ripple.z, size, size, fade, fade, fade)
    }
    ripples.instanceMatrix.needsUpdate = true
    ripples.instanceColor!.needsUpdate = true

    const pose = c.hand
    const hint = c.hint
    if (pose.opacity > 0.01 && hint) {
      const frogScale = CAST[hint.frog].scale
      hand.visible = true
      const top = PAD_TOP + (0.7 + (1 - pose.press) * 0.45) * frogScale + (pose.carry ? LIFT_HEIGHT * 0.6 : 0)
      hand.position.set(pose.x + 0.1, top, pose.z + 0.15)
      const s = 1.45 * (1 - pose.press * 0.07)
      hand.scale.set(s * 0.8, s, 1)
      hand.material.opacity = pose.opacity * 0.95
      ghost.visible = pose.carry
      if (pose.carry) {
        ghost.position.set(pose.x, PAD_TOP + LIFT_HEIGHT * 0.6 + 0.1, pose.z)
        ghost.scale.setScalar(1.05 * frogScale)
        ghost.material.color.copy(SKINS[hint.frog])
        ghost.material.opacity = pose.opacity * 0.6
      }
    } else {
      hand.visible = false
      ghost.visible = false
    }
  }

  dispose(): void {
    this.disposed = true
    this.running = false
    cancelAnimationFrame(this.frame)
    this.observer.disconnect()
    this.unbind()
    this.meter.uninstall()
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      mesh.geometry?.dispose()
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined
      for (const m of Array.isArray(material) ? material : material ? [material] : []) {
        for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose()
        m.dispose()
      }
    })
    this.renderer.dispose()
    this.canvas.remove()
  }
}

function emptyMoment(): FrogMoment {
  return {
    time: 0,
    dt: 0,
    clock: 0,
    beat: 1,
    mode: 'sit',
    sing: Infinity,
    singStrength: 1,
    press: Infinity,
    tap: Infinity,
    lift: Infinity,
    land: Infinity,
    splash: Infinity,
    hop: -1,
    vx: 0,
    vz: 0,
    gazeX: 0,
    gazeY: 1,
    gazeZ: 0,
    fireNear: 0,
    invite: null,
  }
}

const probe = new THREE.Vector3()

function ndc(camera: THREE.PerspectiveCamera, x: number, y: number, z: number): THREE.Vector3 {
  return probe.set(x, y, z).project(camera)
}

/**
 * Fit the pond: the near edge at the bottom of the screen, the widest row
 * inside the sides, and the far frogs' heads low enough to leave the top
 * quarter for the sky. Pulls back until all three hold.
 */
function frameCamera(camera: THREE.PerspectiveCamera): void {
  camera.fov = FOV
  const bottomAngle = PITCH + THREE.MathUtils.degToRad(FOV / 2)
  for (let distance = 12; distance < 60; distance += 0.25) {
    const height = distance * Math.sin(PITCH)
    const back = distance * Math.cos(PITCH)
    const cameraZ = BOTTOM_Z + height / Math.tan(bottomAngle)
    const targetZ = cameraZ - back
    camera.position.set(0, height, cameraZ)
    camera.lookAt(0, 0, targetZ)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    const nearRow = ndc(camera, HALF_WIDTH, 0, NEAR_Z)
    const nearX = nearRow.x
    const farRow = ndc(camera, HALF_WIDTH, 0, rowZ(ROWS - 1))
    const farX = farRow.x
    const head = ndc(camera, 0, FAR_HEAD.y, FAR_HEAD.z).y
    if (nearX <= 0.94 && farX <= 0.94 && head <= 0.42) return
  }
}
