import * as THREE from 'three'
import { RIPPLES, type RoomInfo, type TowerController } from '../controller'
import { levelLift, SCREEN_RIGHT, SCREEN_UP, TOWARD_CAMERA, type MutableVec3 } from '../projection'
import { pinnedTier, startingTier, TierGovernor, type Tier } from '../tiers'
import { axisVector } from '../world'
import { buildDoorGeometry, buildRoomGeometry, DOOR } from './build'
import { WANDERER_SCALE } from '../anatomy'
import { buildBird, buildWanderer, type BirdRig, type WandererRig } from './characters'
import {
  facetMaterial,
  flatMaterial,
  glintTexture,
  glowTexture,
  handTexture,
  motes,
  plainMaterial,
  raw,
  ringTexture,
  shadowTexture,
  skyMesh,
  type FlatUniforms,
} from './materials'
import { PALETTE } from './palette'
import { CornerTaps, PerfMonitor } from './perf'

// The whole picture in one scene and one render call (R16): sky, the current
// diorama, its door and characters, the little models on the ring, and a
// pixel-space layer for touch ripples and the ghost hand. The
// camera never rotates, so every billboard shares its orientation. Nothing in
// `sync` allocates.

const CAMERA_DISTANCE = 80
/** How far toward the camera the ring models and the pixel layer float, clear of any diorama. */
export const MINI_DEPTH = 30
const HUD_DEPTH = 50
/**
 * The door's and the lantern's light float this far toward the camera from
 * the plane through the origin: in front of every block of every diorama, so
 * a glow is never cut off by a wall it happens to stand in, and behind the
 * ring. The camera is orthographic, so on screen they stay exactly where they
 * shine; the controller fades each one by how much of its source the child
 * can actually see.
 */
export const HALO_DEPTH = 20
/** Glows draw after the dioramas; the door and both characters draw over them, so the light sits behind what gives it off. */
const GLOW_ORDER = 2
const LIT_ORDER = 3
const DOOR_SWING = 1.35

export function toHaloDepth(position: THREE.Vector3): void {
  const push = HALO_DEPTH - (position.x * TOWARD_CAMERA[0] + position.y * TOWARD_CAMERA[1] + position.z * TOWARD_CAMERA[2])
  position.x += TOWARD_CAMERA[0] * push
  position.y += TOWARD_CAMERA[1] * push
  position.z += TOWARD_CAMERA[2] * push
}

/** A glow that draws with the opaque pass, in `renderOrder`, instead of being depth-sorted among the transparent sprites. */
function inOrder(mesh: FlatMesh, order: number): FlatMesh {
  mesh.material.transparent = false
  mesh.renderOrder = order
  return mesh
}

function drawnAfterGlows(root: THREE.Object3D): void {
  root.traverse((object) => {
    object.renderOrder = LIT_ORDER
  })
}

type FlatMesh = THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial & { uniforms: FlatUniforms }>

export type GroupView = { object: THREE.Mesh; axis: THREE.Vector3; kind: 'turn' | 'slide'; slideAxis: number; pivotY: number; level: boolean }

type RoomView = { root: THREE.Object3D; groups: (GroupView | null)[] }

type MiniView = { root: THREE.Object3D; groups: (GroupView | null)[]; centreX: number; centreY: number; extent: number; version: number }

export function groupViews(info: RoomInfo, meshes: (THREE.BufferGeometry | null)[], material: THREE.Material, parent: THREE.Object3D): (GroupView | null)[] {
  return info.spec.groups.map((def, g) => {
    const geometry = meshes[g]
    if (!geometry) return null
    const object = new THREE.Mesh(geometry, material)
    object.name = `segment-${g}`
    parent.add(object)
    if (def.kind === 'turn') {
      object.position.set(def.pivot[0], def.pivot[1], def.pivot[2])
      const [ax, ay, az] = axisVector(def.axis)
      return { object, axis: new THREE.Vector3(ax, ay, az), kind: 'turn', slideAxis: 0, pivotY: def.pivot[1], level: def.axis !== 'y' }
    }
    return { object, axis: new THREE.Vector3(), kind: 'slide', slideAxis: def.axis === 'x' ? 0 : def.axis === 'y' ? 1 : 2, pivotY: 0, level: false }
  })
}

export function poseGroup(view: GroupView, value: number, dip = 0): void {
  if (view.kind === 'turn') {
    view.object.quaternion.setFromAxisAngle(view.axis, (value * Math.PI) / 2)
    view.object.position.y = view.pivotY + dip + (view.level ? levelLift(value) : 0)
    return
  }
  view.object.position.set(view.slideAxis === 0 ? value : 0, (view.slideAxis === 1 ? value : 0) + dip, view.slideAxis === 2 ? value : 0)
}

export type DoorView = { root: THREE.Object3D; leafLeft: THREE.Mesh; leafRight: THREE.Mesh; light: THREE.Mesh<THREE.BufferGeometry, ReturnType<typeof plainMaterial>> }

/** The one door every diorama shares: its arch, two leaves, and the light they open onto. */
export function doorView(material: THREE.Material): DoorView {
  const geometry = buildDoorGeometry()
  const root = new THREE.Object3D()
  root.name = 'door'
  root.userData.jamObject = 'door'
  root.rotation.y = Math.PI / 4
  const frame = new THREE.Mesh(geometry.frame, material)
  frame.name = 'frame'
  const leafLeft = new THREE.Mesh(geometry.leafLeft, material)
  leafLeft.name = 'leaf-left'
  leafLeft.position.set(-DOOR.width / 2, 0, -DOOR.leaf / 2)
  const leafRight = new THREE.Mesh(geometry.leafRight, material)
  leafRight.name = 'leaf-right'
  leafRight.position.set(DOOR.width / 2, 0, -DOOR.leaf / 2)
  const light = new THREE.Mesh(geometry.light, plainMaterial(PALETTE.doorLight, 0))
  light.name = 'light'
  root.add(frame, leafLeft, leafRight, light)
  return { root, leafLeft, leafRight, light }
}

/** Stand the door at the controller's door point, open by `open` (0 to 1): the leaves swing in behind the light. */
export function poseDoor(door: DoorView, at: readonly number[], open: number, fade: number): void {
  door.root.position.set(at[0], at[1], at[2])
  door.leafLeft.rotation.y = open * DOOR_SWING
  door.leafRight.rotation.y = -open * DOOR_SWING
  const k = Math.min(1, open / 0.4)
  const light = k * k * (3 - 2 * k) * (1 - fade)
  door.light.material.uniforms.uOpacity.value = light
  // The shader reads the uniform; the material's own opacity says the same to anything inspecting the scene.
  door.light.material.opacity = light
  door.light.visible = light > 0.01
}

// Every sprite shares one of two quads, so a ripple or hand appearing for the
// first time never needs a new buffer mid-play.
const UPRIGHT_QUAD = new THREE.PlaneGeometry(1, 1)
const FLAT_QUAD = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
/** A shadow's round texture fades out at the quad's inscribed circle, so the shadow is cut to that circle: its corners would reach into whatever stands beside the caster. */
export const SHADOW_DISC = new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2)

function quad(material: THREE.ShaderMaterial & { uniforms: FlatUniforms }, flat = false, geometry: THREE.BufferGeometry = flat ? FLAT_QUAD : UPRIGHT_QUAD): FlatMesh {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  return mesh
}

function ellipseBand(inner: number, segments: number): THREE.BufferGeometry {
  const positions: number[] = []
  const index: number[] = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    positions.push(Math.cos(a), Math.sin(a), 0, Math.cos(a) * inner, Math.sin(a) * inner, 0)
    if (i < segments) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(index)
  return geometry
}

export class TowerView {
  private readonly controller: TowerController
  private readonly host: HTMLElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400)
  private readonly governor: TierGovernor
  private readonly perf = new PerfMonitor()
  private readonly corner = new CornerTaps()
  private detachOverlay: (() => void) | null = null
  private readonly cleanups: (() => void)[] = []

  private readonly stage = new THREE.Object3D()
  private readonly rooms: RoomView[] = []
  private readonly minis: MiniView[] = []
  private readonly miniRoot = new THREE.Object3D()
  private readonly hud = new THREE.Object3D()
  private readonly architecture = facetMaterial()
  private readonly miniMaterial = facetMaterial({ fog: 0 })
  private readonly walkerMaterial = facetMaterial()
  private readonly birdMaterial = facetMaterial()
  /** Swapped onto the one segment worth touching while the child is idle: it warms from within. */
  private readonly hintMaterial = facetMaterial()
  private readonly sky = skyMesh()
  private readonly motes = motes(48, 16)
  private readonly door: DoorView
  private readonly doorHalo: FlatMesh
  private readonly walker: WandererRig
  private readonly bird: BirdRig
  private readonly handleGlow: FlatMesh
  private readonly tileGlow: FlatMesh
  private readonly sparkle: FlatMesh
  private readonly ripples: FlatMesh[] = []
  private readonly hand: FlatMesh
  private readonly press: FlatMesh
  private readonly track: THREE.Mesh<THREE.BufferGeometry, ReturnType<typeof plainMaterial>>
  private readonly tray: FlatMesh

  private width = 1
  private height = 1
  private dpr = 1
  private running = false
  private handle = 0
  private last = 0
  /** Once guidance has gone quiet the scene only breathes, so every other frame is skipped to save battery. */
  private skip = false
  private steady = true
  private shownRoom = -1
  private cameraScale = 0
  private readonly target: MutableVec3 = [0, 0, 0]
  private readonly origin: MutableVec3 = [0, 0, 0]
  private readonly slot = { x: 0, y: 0, scale: 1, depth: 0 }
  private readonly spin = new THREE.Quaternion()
  private readonly forward = new THREE.Vector3()
  private rect: DOMRect | null = null

  constructor(host: HTMLElement, controller: TowerController, search: string) {
    this.host = host
    this.controller = controller
    this.governor = new TierGovernor(startingTier(window.matchMedia?.('(pointer: coarse)').matches ?? false), pinnedTier(search))
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' })
    // Every shader here writes display-space colour directly.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    this.renderer.setClearColor(raw(PALETTE.backdrop))
    const canvas = this.renderer.domElement
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', touchAction: 'none', userSelect: 'none' })
    host.appendChild(canvas)

    this.camera.position.set(CAMERA_DISTANCE, CAMERA_DISTANCE, CAMERA_DISTANCE)
    this.camera.lookAt(0, 0, 0)
    this.camera.updateMatrixWorld()
    this.forward.set(-TOWARD_CAMERA[0], -TOWARD_CAMERA[1], -TOWARD_CAMERA[2])

    // Background.
    this.sky.name = 'sky'
    this.scene.add(this.sky)
    this.motes.name = 'motes'
    this.motes.renderOrder = 5
    this.scene.add(this.motes)

    // Dioramas: all built now, one shown at a time.
    this.stage.name = 'stage'
    this.miniRoot.name = 'ring'
    this.hud.name = 'hud'
    this.scene.add(this.stage)
    for (const info of controller.rooms) {
      const geometry = buildRoomGeometry(info)
      const root = new THREE.Object3D()
      root.name = `room-${info.spec.key}`
      const architecture = new THREE.Mesh(geometry.static, this.architecture)
      architecture.name = 'architecture'
      root.add(architecture)
      const groups = groupViews(info, geometry.groups, this.architecture, root)
      root.visible = false
      this.stage.add(root)
      this.rooms.push({ root, groups })

      const mini = new THREE.Object3D()
      mini.name = `mini-${info.spec.key}`
      mini.userData.jamObject = mini.name
      const staticMini = new THREE.Mesh(geometry.static, this.miniMaterial)
      staticMini.name = 'architecture'
      staticMini.frustumCulled = false
      mini.add(staticMini)
      const miniGroups = groupViews(info, geometry.groups, this.miniMaterial, mini)
      for (const g of miniGroups) if (g) g.object.frustumCulled = false
      const b = info.bounds
      this.minis.push({ root: mini, groups: miniGroups, centreX: (b.minX + b.maxX) / 2, centreY: (b.minY + b.maxY) / 2, extent: Math.max(b.maxX - b.minX, (b.maxY - b.minY) * 1.1), version: -1 })
      this.miniRoot.add(mini)
    }
    this.scene.add(this.miniRoot)

    // The door: one arch shared by every diorama.
    this.door = doorView(this.architecture)
    drawnAfterGlows(this.door.root)
    this.stage.add(this.door.root)

    const glow = glowTexture()
    const shadow = shadowTexture()
    this.doorHalo = inOrder(quad(flatMaterial(glow, PALETTE.doorLight, { additive: true })), GLOW_ORDER)
    this.doorHalo.name = 'door-halo'
    this.doorHalo.quaternion.copy(this.camera.quaternion)
    this.stage.add(this.doorHalo)

    // Characters.
    const walkerShadow = quad(flatMaterial(shadow, PALETTE.shadow, { opacity: 0.42 }), true, SHADOW_DISC)
    walkerShadow.name = 'wanderer-shadow'
    const lanternHalo = inOrder(quad(flatMaterial(glow, PALETTE.lantern, { additive: true, opacity: 0.7 })), GLOW_ORDER)
    lanternHalo.name = 'lantern-halo'
    lanternHalo.quaternion.copy(this.camera.quaternion)
    this.walker = buildWanderer(this.walkerMaterial, lanternHalo, walkerShadow)
    drawnAfterGlows(this.walker.root)
    this.stage.add(this.walker.root, walkerShadow)
    this.scene.add(lanternHalo)
    const birdShadow = quad(flatMaterial(shadow, PALETTE.shadow, { opacity: 0.36 }), true, SHADOW_DISC)
    birdShadow.name = 'bird-shadow'
    this.bird = buildBird(this.birdMaterial, birdShadow)
    drawnAfterGlows(this.bird.root)
    this.stage.add(this.bird.root, birdShadow)

    // Guidance and feedback in the world.
    this.handleGlow = quad(flatMaterial(glow, '#fff2b8', { additive: true, depthTest: false }))
    this.handleGlow.name = 'handle-glow'
    this.handleGlow.quaternion.copy(this.camera.quaternion)
    this.handleGlow.renderOrder = 7
    this.tileGlow = quad(flatMaterial(ringTexture(), '#eafff9', { additive: true }), true)
    this.tileGlow.name = 'tile-glow'
    this.tileGlow.renderOrder = 7
    this.sparkle = quad(flatMaterial(glintTexture(), '#fffbe8', { additive: true, depthTest: false }))
    this.sparkle.name = 'sparkle'
    this.sparkle.renderOrder = 8
    this.stage.add(this.handleGlow, this.tileGlow, this.sparkle)

    // The pixel layer: children are placed in CSS pixels, y down.
    this.scene.add(this.hud)
    const ring = ringTexture()
    this.track = new THREE.Mesh(ellipseBand(0.86, 72), plainMaterial(PALETTE.ring, 0.34))
    this.track.name = 'ring-track'
    this.track.frustumCulled = false
    this.track.position.z = MINI_DEPTH - HUD_DEPTH - 8
    this.hud.add(this.track)
    this.tray = quad(flatMaterial(glow, '#fff6e6', { opacity: 0.55 }))
    this.tray.name = 'ring-tray'
    this.tray.position.z = MINI_DEPTH - HUD_DEPTH - 6
    this.hud.add(this.tray)
    for (let i = 0; i < RIPPLES; i++) {
      const ripple = quad(flatMaterial(ring, '#ffffff', { depthTest: false }))
      ripple.name = 'ripple'
      ripple.renderOrder = 20
      this.ripples.push(ripple)
      this.hud.add(ripple)
    }
    this.press = quad(flatMaterial(ring, '#ffffff', { depthTest: false }))
    this.press.name = 'press'
    this.press.renderOrder = 21
    this.hand = quad(flatMaterial(handTexture(), '#ffffff', { depthTest: false }))
    this.hand.name = 'ghost-hand'
    this.hand.renderOrder = 22
    this.hud.add(this.press, this.hand)

    this.cleanups.push(this.perf.expose())
    if (/[?&]fps=1/.test(search)) this.toggleOverlay()
    this.cleanups.push(() => this.detachOverlay?.())
    this.bindPointers(canvas)
    const observer = new ResizeObserver(() => this.resize())
    observer.observe(host)
    this.cleanups.push(() => observer.disconnect())
    this.applyTier()
    this.resize()
    this.warm()
  }

  /**
   * Draws everything once, hidden or not, so every buffer, texture and program
   * reaches the GPU at mount instead of on the frame a ripple, the ghost hand
   * or another diorama first appears. The real picture is drawn straight after
   * in the same task, so this frame is never shown.
   */
  private warm(): void {
    const restore: [THREE.Object3D, boolean, boolean][] = []
    this.scene.traverse((object) => {
      restore.push([object, object.visible, object.frustumCulled])
      object.visible = true
      object.frustumCulled = false
    })
    this.renderer.render(this.scene, this.camera)
    for (const [object, visible, culled] of restore) {
      object.visible = visible
      object.frustumCulled = culled
    }
    this.sync(performance.now() / 1000)
    this.renderer.render(this.scene, this.camera)
  }

  setRunning(running: boolean): void {
    if (running === this.running) return
    this.running = running
    if (running) {
      this.last = 0
      this.handle = requestAnimationFrame(this.loop)
    } else {
      cancelAnimationFrame(this.handle)
      // Draw the put-away state once so the paused picture is at rest.
      this.sync(performance.now() / 1000)
      this.renderer.render(this.scene, this.camera)
    }
  }

  dispose(): void {
    this.setRunning(false)
    for (const cleanup of this.cleanups) cleanup()
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose()
        const material = object.material as THREE.Material & { uniforms?: Record<string, { value: unknown }> }
        const map = material.uniforms?.uMap?.value
        if (map instanceof THREE.Texture) map.dispose()
        material.dispose()
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private readonly loop = (): void => {
    this.handle = requestAnimationFrame(this.loop)
    const resting = this.controller.isResting
    this.skip = resting && !this.skip
    if (this.skip) return
    const start = performance.now()
    const interval = this.last > 0 ? start - this.last : 1000 / 60
    this.last = start
    this.controller.update(Math.min(0.1, interval / 1000), start / 1000)
    this.sync(start / 1000)
    this.renderer.render(this.scene, this.camera)
    const cpu = performance.now() - start
    const info = this.renderer.info.render
    this.perf.drawCalls = info.calls
    this.perf.triangles = info.triangles
    this.perf.record(cpu, interval)
    // Half-rate intervals say nothing about the device; judge only back-to-back full-rate frames.
    const steady = this.steady && !resting
    this.steady = !resting
    if (steady && this.governor.sample(interval, cpu)) this.applyTier()
  }

  private resize(): void {
    const width = Math.max(1, this.host.clientWidth)
    const height = Math.max(1, this.host.clientHeight)
    this.width = width
    this.height = height
    this.rect = null
    this.renderer.setSize(width, height, false)
    this.controller.resize(width, height)
    this.cameraScale = 0
    if (!this.running) {
      this.sync(performance.now() / 1000)
      this.renderer.render(this.scene, this.camera)
    }
  }

  private applyTier(): void {
    const tier: Tier = this.governor.settings
    this.perf.tier = this.governor.tier
    this.dpr = Math.min(window.devicePixelRatio || 1, tier.dpr)
    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(this.width, this.height, false)
    this.motes.visible = tier.motes > 0
    this.motes.geometry.setDrawRange(0, tier.motes)
    this.sky.material.uniforms.uDither.value = tier.dither ? 1 : 0
  }

  private toggleOverlay(): void {
    if (this.detachOverlay) {
      this.detachOverlay()
      this.detachOverlay = null
    } else {
      this.detachOverlay = this.perf.attachOverlay(this.host)
    }
  }

  private bindPointers(canvas: HTMLCanvasElement): void {
    const local = (event: PointerEvent): [number, number] => {
      const rect = this.rect ?? (this.rect = canvas.getBoundingClientRect())
      return [event.clientX - rect.left, event.clientY - rect.top]
    }
    const down = (event: PointerEvent) => {
      event.preventDefault()
      this.rect = null
      canvas.setPointerCapture?.(event.pointerId)
      const [x, y] = local(event)
      if (this.corner.tap(x, y, event.timeStamp)) this.toggleOverlay()
      this.controller.pointerDown(event.pointerId, x, y, event.timeStamp)
    }
    const move = (event: PointerEvent) => {
      const [x, y] = local(event)
      this.controller.pointerMove(event.pointerId, x, y, event.timeStamp)
    }
    const up = (event: PointerEvent) => {
      const [x, y] = local(event)
      this.controller.pointerUp(event.pointerId, x, y, event.timeStamp)
    }
    const cancel = (event: PointerEvent) => this.controller.pointerCancel(event.pointerId)
    const menu = (event: Event) => event.preventDefault()
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', cancel)
    canvas.addEventListener('lostpointercapture', cancel)
    canvas.addEventListener('contextmenu', menu)
    this.cleanups.push(() => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('lostpointercapture', cancel)
      canvas.removeEventListener('contextmenu', menu)
    })
  }

  /** World point `depth` toward the camera from the pixel (px, py). */
  private pixelToWorld(px: number, py: number, depth: number, out: THREE.Vector3): THREE.Vector3 {
    const o = this.controller.projector.rayOrigin(px, py, this.origin)
    return out.set(o[0] + TOWARD_CAMERA[0] * depth, o[1] + TOWARD_CAMERA[1] * depth, o[2] + TOWARD_CAMERA[2] * depth)
  }

  private sync(now: number): void {
    const controller = this.controller
    const frame = controller.frame
    const projector = controller.projector
    const scale = projector.scale

    // Camera: fixed orientation, frustum from the controller's fit.
    if (scale !== this.cameraScale || this.camera.right !== this.width / 2 / scale) {
      this.cameraScale = scale
      this.camera.left = -this.width / 2 / scale
      this.camera.right = this.width / 2 / scale
      this.camera.top = this.height / 2 / scale
      this.camera.bottom = -this.height / 2 / scale
      this.camera.updateProjectionMatrix()
    }
    const t = projector.target(this.target)
    this.camera.position.set(t[0] + TOWARD_CAMERA[0] * CAMERA_DISTANCE, t[1] + TOWARD_CAMERA[1] * CAMERA_DISTANCE, t[2] + TOWARD_CAMERA[2] * CAMERA_DISTANCE)
    this.motes.position.set(t[0], t[1], t[2])
    this.motes.material.uniforms.uTime.value = now
    this.motes.material.uniforms.uPixel.value = this.dpr * (scale / 42)
    this.motes.material.uniforms.uFade.value = frame.fade

    // The diorama.
    const index = frame.room
    const info = controller.rooms[index]
    if (index !== this.shownRoom) {
      if (this.shownRoom >= 0) this.rooms[this.shownRoom].root.visible = false
      this.rooms[index].root.visible = true
      this.shownRoom = index
      const d = info.door
      this.doorHalo.position.set(d[0], d[1] + DOOR.height * 0.55, d[2])
      toHaloDepth(this.doorHalo.position)
    }
    this.stage.position.y = frame.drop
    const room = this.rooms[index]
    const hint = frame.glow
    const hinted = hint.kind === 'group' && hint.strength > 0.01 ? hint.group : -1
    const warmth = hint.strength * (0.72 + 0.28 * Math.sin(now * 2.6))
    for (let g = 0; g < room.groups.length; g++) {
      const view = room.groups[g]
      if (!view) continue
      poseGroup(view, frame.values[g], frame.dips[g])
      view.object.material = g === hinted ? this.hintMaterial : this.architecture
    }
    this.architecture.uniforms.uFade.value = frame.fade
    this.hintMaterial.uniforms.uFade.value = frame.fade
    this.hintMaterial.uniforms.uTintAmount.value = 0.2 * warmth
    this.hintMaterial.uniforms.uLift.value = 1.6 * warmth
    const open = frame.door.open
    poseDoor(this.door, info.door, open, frame.fade)
    const doorHint = frame.glow.kind === 'door' ? frame.glow.strength : 0
    const haloSize = 1.5 + 0.35 * open + 0.25 * doorHint
    this.doorHalo.scale.set(haloSize, haloSize * 1.15, 1)
    this.doorHalo.material.uniforms.uOpacity.value = (0.5 * frame.door.glow + 0.35 * open + 0.3 * doorHint) * (1 - frame.fade) * frame.seen.door

    // Characters.
    const walker = frame.walker
    this.walker.apply(walker)
    this.walkerMaterial.uniforms.uFade.value = Math.max(frame.fade, frame.phase === 'enter' ? 0 : 1 - walker.alpha)
    this.walkerMaterial.uniforms.uTintAmount.value = frame.phase === 'enter' ? 1 - walker.alpha : 0
    const lantern = this.walker.halo as FlatMesh
    toHaloDepth(lantern.position)
    const glow = walker.glow
    const size = 0.95 * WANDERER_SCALE * walker.scale * glow
    lantern.scale.set(size, size, 1)
    lantern.material.uniforms.uOpacity.value = 0.62 * walker.alpha * (1 - frame.fade) * Math.min(1.3, glow) * frame.seen.lantern
    const walkerShadow = this.walker.shadow as FlatMesh
    walkerShadow.material.uniforms.uOpacity.value = 0.42 * walker.alpha * (1 - frame.fade)
    const bird = frame.bird
    this.bird.apply(bird)
    // Like the wanderer, the bird goes into the door as light, not into the dusk.
    const entering = frame.phase === 'enter'
    this.birdMaterial.uniforms.uFade.value = Math.max(frame.fade, entering ? 0 : 1 - bird.alpha)
    this.birdMaterial.uniforms.uTintAmount.value = entering ? 1 - bird.alpha : hinted >= 0 && hinted === info.birdGroup ? 0.2 * warmth : 0
    const birdShadow = this.bird.shadow as FlatMesh
    birdShadow.material.uniforms.uOpacity.value = 0.36 * bird.alpha * (1 - frame.fade)

    // Guidance glows: a soft halo at the handle, over the warmth in the segment itself.
    this.handleGlow.visible = hint.kind === 'group' && hint.strength > 0.01
    if (this.handleGlow.visible) {
      const size = (info.handleRadius[hint.group] ?? 0.45) * 1.6 + 0.7
      this.handleGlow.position.set(hint.x, hint.y, hint.z)
      this.handleGlow.scale.set(size, size, 1)
      this.handleGlow.material.uniforms.uOpacity.value = hint.strength * 0.4
    }
    this.tileGlow.visible = hint.kind === 'tile' && hint.strength > 0.01
    if (this.tileGlow.visible) {
      const size = 0.95 + 0.12 * Math.sin(now * 3.1)
      this.tileGlow.position.set(hint.x, hint.y + 0.07, hint.z)
      this.tileGlow.scale.set(size, 1, size)
      this.tileGlow.material.uniforms.uOpacity.value = hint.strength
    }
    const sparkle = frame.sparkle
    this.sparkle.visible = sparkle.age < 0.9
    if (this.sparkle.visible) {
      const k = sparkle.age / 0.9
      const size = 0.3 + 1.3 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (1 - k * 0.5)
      this.sparkle.position.set(sparkle.x, sparkle.y, sparkle.z)
      this.sparkle.scale.set(size, size, 1)
      this.spin.setFromAxisAngle(this.forward, k * 1.4)
      this.sparkle.quaternion.copy(this.camera.quaternion).multiply(this.spin)
      this.sparkle.material.uniforms.uOpacity.value = 1 - k * k
    }

    // The ring of little dioramas.
    const ring = frame.ring
    for (let r = 0; r < this.minis.length; r++) {
      const mini = this.minis[r]
      const slot = controller.ringSlot(r, this.slot)
      const pulse = ring.pulse[r]
      const bounce = 1 + 0.14 * Math.sin(pulse * Math.PI) * pulse
      const m = ((ring.size * slot.scale) / mini.extent / scale) * bounce
      const lift = r === index ? ring.size * 0.08 : 0
      const p = this.pixelToWorld(slot.x, slot.y - lift, MINI_DEPTH + slot.depth * 3, mini.root.position)
      p.x -= m * (SCREEN_RIGHT[0] * mini.centreX + SCREEN_UP[0] * mini.centreY)
      p.y -= m * (SCREEN_RIGHT[1] * mini.centreX + SCREEN_UP[1] * mini.centreY)
      p.z -= m * (SCREEN_RIGHT[2] * mini.centreX + SCREEN_UP[2] * mini.centreY)
      mini.root.scale.setScalar(m)
      if (r === index) {
        for (let g = 0; g < mini.groups.length; g++) {
          const view = mini.groups[g]
          if (view) poseGroup(view, frame.values[g])
        }
        mini.version = -1
      } else if (mini.version !== frame.version) {
        mini.version = frame.version
        const values = controller.savedGroups(r)
        for (let g = 0; g < mini.groups.length; g++) {
          const view = mini.groups[g]
          if (view) poseGroup(view, values[g])
        }
      }
    }

    // The pixel layer.
    this.pixelToWorld(0, 0, HUD_DEPTH, this.hud.position)
    this.hud.quaternion.copy(this.camera.quaternion)
    this.hud.scale.set(1 / scale, -1 / scale, 1)
    this.track.position.x = ring.cx
    this.track.position.y = ring.cy + ring.ry * 0.25
    this.track.scale.set(ring.rx * 1.12, ring.ry * 1.9, 1)
    const current = controller.ringSlot(index, this.slot)
    this.tray.position.x = current.x
    this.tray.position.y = current.y - ring.size * 0.02
    this.tray.scale.set(ring.size * 1.9, ring.size * 0.9, 1)
    for (let i = 0; i < this.ripples.length; i++) {
      const source = frame.ripples[i]
      const ripple = this.ripples[i]
      const life = source.strong ? 0.55 : 0.4
      ripple.visible = source.age < life
      if (!ripple.visible) continue
      const k = source.age / life
      const size = (source.strong ? 26 : 18) + k * (source.strong ? 46 : 26)
      ripple.position.set(source.x, source.y, 0)
      ripple.scale.set(size, size, 1)
      ripple.material.uniforms.uOpacity.value = (1 - k) * (source.strong ? 0.85 : 0.5)
    }
    const hand = frame.hand
    this.hand.visible = hand.visible && hand.opacity > 0.01
    this.press.visible = this.hand.visible && hand.press > 0.05
    if (this.hand.visible) {
      const size = 92 * (1 - 0.08 * hand.press)
      this.hand.position.set(hand.x + size * 0.1, hand.y + size * 0.4, 0)
      this.hand.scale.set(size, -size, 1)
      this.hand.material.uniforms.uOpacity.value = hand.opacity * 0.92
      const ring = 22 + 10 * hand.press
      this.press.position.set(hand.x, hand.y, 0)
      this.press.scale.set(ring, ring, 1)
      this.press.material.uniforms.uOpacity.value = hand.press * hand.opacity * 0.7
    }
  }
}
