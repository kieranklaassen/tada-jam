import { EffectComposer, EffectPass, RenderPass } from 'postprocessing'
import * as THREE from 'three'
import type { Projector, ScarfController, ScarfView } from '../controller'
import type { Point3 } from '../guidance'
import type { Point } from '../input'
import { CELL_H, CELL_W, LOOM, SCARF } from '../layout'
import { PerfMeter } from '../perf'
import { clamp01, smooth } from '../springs'
import { ANIMALS, WIDTH, type AnimalKey } from '../state'
import { forcedTier, TierController, TIERS } from '../tiers'
import { buildAnimals, type Animal, type Moment } from './animals'
import { KnitFinishEffect } from './finish'
import { Props } from './props'
import { ScarfMesh } from './scarf'
import { buildWorld, type World } from './world'
import { createMaterials, PALETTE, type YarnMaterials } from './yarn'

// The whole 3D view, in plain three.js: one renderer, one requestAnimationFrame
// loop that steps the controller and draws, and nothing React-driven per
// frame. Every per-frame write goes into objects made here, once.

const FOV = 30
const PITCH = THREE.MathUtils.degToRad(7)
const TARGET = new THREE.Vector3(1.5, 30, 0)
/** What must fit on screen around the target: the animal, the loom and the basket. */
const HALF_WIDTH = 64
const HALF_HEIGHT = 42
const MAX_DISTANCE = 240
const EXPOSURE = 1.12
/** Enough scarf meshes for three on every animal, one folding away and the loom's own. */
const POOL = 15
const FLIGHT_ARC = 24
const LEAVE_SECONDS = 0.9

export type SceneOptions = { search: string; coarse: boolean }

export class CosyScene {
  private readonly host: HTMLElement
  private readonly game: ScarfController
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 20, 1400)
  private readonly composer: EffectComposer
  private readonly finish: KnitFinishEffect
  private readonly materials: YarnMaterials
  private readonly world: World
  private readonly props: Props
  private readonly animals: Record<AnimalKey, Animal>
  private readonly pool: ScarfMesh[] = []
  private readonly used = new Int32Array(POOL)
  private readonly viewMesh = new Int32Array(POOL + 4)
  private readonly tiers: TierController
  private readonly perf = new PerfMeter()
  private readonly resize: ResizeObserver
  private readonly moment: Moment
  private readonly cleanupInput: () => void

  private width = 1
  private height = 1
  private raf = 0
  private last = 0
  private running = false
  private stamp = 0
  private disposed = false

  private readonly loomHang = new THREE.Matrix4()
  private readonly m = new THREE.Matrix4()
  private readonly n = new THREE.Matrix4()
  private readonly p0 = new THREE.Vector3()
  private readonly p1 = new THREE.Vector3()
  private readonly s0 = new THREE.Vector3()
  private readonly s1 = new THREE.Vector3()
  private readonly q0 = new THREE.Quaternion()
  private readonly q1 = new THREE.Quaternion()
  private readonly v = new THREE.Vector3()
  private readonly w = new THREE.Vector3()

  constructor(host: HTMLElement, game: ScarfController, options: SceneOptions) {
    this.host = host
    this.game = game
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false })
    this.renderer.info.autoReset = false
    this.renderer.toneMappingExposure = EXPOSURE
    const canvas = this.renderer.domElement
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', touchAction: 'none', userSelect: 'none', webkitUserSelect: 'none' })
    host.appendChild(canvas)

    this.scene.background = new THREE.Color(PALETTE.backdrop)
    this.scene.fog = new THREE.Fog(PALETTE.fog, 260, 1150)
    this.scene.matrixWorldAutoUpdate = false
    this.scene.add(new THREE.HemisphereLight('#eef3fb', '#b9a693', 1.25))
    const key = new THREE.DirectionalLight('#fff1dc', 1.7)
    key.position.set(-60, 120, 110)
    const fill = new THREE.DirectionalLight('#cddcf2', 0.45)
    fill.position.set(90, 40, 60)
    this.scene.add(key, fill)

    this.materials = createMaterials()
    const anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
    for (const texture of [this.materials.textures.knitNormal, this.materials.textures.knitShade]) texture.anisotropy = anisotropy
    this.world = buildWorld(this.materials)
    this.scene.add(this.world.group)
    this.props = new Props(this.materials, game.balls.length)
    this.scene.add(this.props.group)
    this.animals = buildAnimals(this.materials)
    for (const animal of ANIMALS) this.scene.add(this.animals[animal].root)
    for (let i = 0; i < POOL; i++) {
      const scarf = new ScarfMesh(this.materials.textures, i * 1.7)
      this.pool.push(scarf)
      this.scene.add(scarf.mesh)
    }

    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0, stencilBuffer: false })
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.finish = new KnitFinishEffect({ focusCenter: 0.5, focusBand: 0.26, exposure: EXPOSURE, recede: 0.5, vignette: 0.2 })
    this.composer.addPass(new EffectPass(this.camera, this.finish))

    const forced = forcedTier(options.search)
    this.tiers = new TierController(options.coarse ? 1 : 0, forced)
    this.perf.install()
    if (new URLSearchParams(options.search).get('fps') === '1') this.perf.showOverlay(host)

    const step = (animal: AnimalKey, weight: number) => game.footstep(animal, weight)
    this.moment = { t: 0, dt: 0, knitting: 0, hoping: false, focus: new THREE.Vector3(), step }

    game.setProjector(this.projector)
    this.cleanupInput = this.bindInput(canvas)
    this.resize = new ResizeObserver(() => this.fit())
    this.resize.observe(host)
    this.applyTier()
    this.fit()
    this.prewarm()
  }

  setRunning(running: boolean): void {
    if (this.disposed || running === this.running) return
    this.running = running
    if (running) {
      this.last = 0
      this.raf = requestAnimationFrame(this.frame)
    } else cancelAnimationFrame(this.raf)
  }

  dispose(): void {
    this.disposed = true
    this.running = false
    cancelAnimationFrame(this.raf)
    this.resize.disconnect()
    this.cleanupInput()
    this.perf.uninstall()
    this.props.dispose()
    for (const scarf of this.pool) scarf.dispose()
    for (const animal of ANIMALS) this.animals[animal].dispose()
    this.materials.dispose()
    this.composer.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  // --- sizing and quality ---------------------------------------------------------

  private fit(): void {
    const width = this.host.clientWidth
    const height = this.host.clientHeight
    if (width === 0 || height === 0) return
    this.width = width
    this.height = height
    const aspect = width / height
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const distance = Math.min(MAX_DISTANCE, Math.max(HALF_HEIGHT / t, HALF_WIDTH / (t * aspect)))
    this.camera.aspect = aspect
    this.camera.position.set(TARGET.x, TARGET.y + distance * Math.sin(PITCH), TARGET.z + distance * Math.cos(PITCH))
    this.camera.lookAt(TARGET)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height, false)
    this.props.setTier(TIERS[this.tiers.tier], height * this.renderer.getPixelRatio(), FOV)
    if (!this.running) this.draw()
  }

  private applyTier(): void {
    const tier = TIERS[this.tiers.tier]
    const dpr = Math.min(window.devicePixelRatio || 1, tier.dpr)
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(this.width, this.height, false)
    this.composer.setSize(this.width, this.height, false)
    this.renderer.toneMapping = tier.post ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping
    this.finish.setBlur(tier.blurTaps > 0 ? 1.8 * dpr : 0, tier.blurTaps)
    this.materials.setHillRelief(tier.hillRelief)
    this.props.setTier(tier, this.height * dpr, FOV)
  }

  /**
   * Compile every program now, while the game opens, so the first scarf, puff
   * or strand never stalls a frame: the current tier's variant synchronously,
   * the other (with or without the post pass) in the background.
   */
  private prewarm(): void {
    const hidden: THREE.Object3D[] = []
    this.scene.traverse((object) => {
      if (object.visible) return
      hidden.push(object)
      object.visible = true
    })
    const post = TIERS[this.tiers.tier].post
    const toneMapping = this.renderer.toneMapping
    this.renderer.setRenderTarget(post ? this.composer.inputBuffer : null)
    this.renderer.compile(this.scene, this.camera)
    this.renderer.setRenderTarget(post ? null : this.composer.inputBuffer)
    this.renderer.toneMapping = post ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping
    void this.renderer.compileAsync(this.scene, this.camera).catch(() => {})
    this.renderer.toneMapping = toneMapping
    this.renderer.setRenderTarget(null)
    for (const object of hidden) object.visible = false
  }

  // --- the loop --------------------------------------------------------------------

  private readonly frame = (now: number): void => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.frame)
    const interval = this.last > 0 ? now - this.last : 1000 / 60
    this.last = now
    const start = performance.now()
    this.game.step(Math.min(interval / 1000, 0.1))
    this.draw()
    const cpu = performance.now() - start
    const info = this.renderer.info.render
    this.perf.record(cpu, interval, this.tiers.tier, info.calls, info.triangles)
    if (this.tiers.sample(interval, now / 1000) >= 0) this.applyTier()
  }

  private draw(): void {
    this.update(1 / 60)
    this.renderer.info.reset()
    if (TIERS[this.tiers.tier].post) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  private update(dtFallback: number): void {
    const game = this.game
    const t = game.t
    const dt = Math.max(1e-4, Math.min(0.1, t - this.moment.t || dtFallback))
    this.moment.t = t
    this.moment.dt = dt
    this.moment.knitting = game.strand.alpha

    this.hangFrame(game.loom, true, this.loomHang)
    this.world.loom.rotation.z = game.loomRock.x * 0.022
    const wobble = t - game.basketAt
    this.world.basket.rotation.z = wobble >= 0 && wobble < 0.9 ? Math.sin(wobble * 24) * 0.05 * (1 - wobble / 0.9) : 0

    for (const animal of ANIMALS) {
      const actor = game.actors[animal]
      const rig = this.animals[animal]
      rig.sync(actor)
      if (!actor.visible) continue
      this.moment.hoping = game.offered && game.state.atLoom === animal
      this.focusFor(animal, this.moment.focus)
      rig.update(actor, this.moment)
    }
    this.scene.updateMatrixWorld()
    this.updateScarves(t)
    this.props.update(game, this.camera, this.loomHang, t)
  }

  /** Where an animal looks: the knitting while it happens, the scarf when it is offered, otherwise the child. */
  private focusFor(animal: AnimalKey, out: THREE.Vector3): void {
    const game = this.game
    const atLoom = game.state.atLoom === animal
    if (this.moment.hoping) out.set(0, 0, 0).applyMatrix4(this.loomHang)
    else if (game.strand.alpha > 0.3 && (atLoom || game.actors[animal].warm > 0.5)) out.set(SCARF.x, SCARF.top - game.loom.rows.length * CELL_H, SCARF.z)
    else out.copy(this.camera.position)
  }

  // --- scarves ---------------------------------------------------------------------

  /** The frame a scarf hangs in on the loom: under the rod, swinging, lifting when offered, following a pulling finger. */
  private hangFrame(view: ScarfView, rock: boolean, out: THREE.Matrix4): THREE.Matrix4 {
    const rows = Math.max(1, view.rows.length)
    const lift = view.lift.x
    const length = rows * CELL_H
    const angle = view.swing.x * 0.07 + THREE.MathUtils.clamp(view.pull.x / Math.max(8, length * 0.8), -0.45, 0.45)
    if (rock) {
      out.makeTranslation(LOOM.x, 0, LOOM.z)
      out.multiply(this.m.makeRotationZ(this.game.loomRock.x * 0.022))
      out.multiply(this.m.makeTranslation(SCARF.x - LOOM.x, SCARF.top + lift * 1.4 + view.pull.y, SCARF.z - LOOM.z + lift * 0.8))
    } else out.makeTranslation(SCARF.x, SCARF.top + lift * 1.4 + view.pull.y, SCARF.z + lift * 0.8)
    out.multiply(this.m.makeRotationZ(angle))
    out.multiply(this.m.makeRotationX(-lift * 0.05))
    return out.multiply(this.m.makeTranslation(0, -length / 2, 0))
  }

  private updateScarves(t: number): void {
    const game = this.game
    const stamp = ++this.stamp
    const count = Math.min(this.viewMesh.length, 1 + game.worn.length)
    for (let k = 0; k < count; k++) {
      const view = k === 0 ? game.loom : game.worn[k - 1]
      this.viewMesh[k] = -1
      for (let i = 0; i < POOL; i++) {
        if (this.pool[i].id === view.id) {
          this.viewMesh[k] = i
          this.used[i] = stamp
          break
        }
      }
    }
    for (let k = 0; k < count; k++) {
      if (this.viewMesh[k] >= 0) continue
      for (let i = 0; i < POOL; i++) {
        if (this.used[i] === stamp) continue
        this.pool[i].id = k === 0 ? game.loom.id : game.worn[k - 1].id
        this.pool[i].version = -1
        this.viewMesh[k] = i
        this.used[i] = stamp
        break
      }
    }
    for (let i = 0; i < POOL; i++) {
      if (this.used[i] !== stamp) {
        this.pool[i].mesh.visible = false
        this.pool[i].id = -1
      }
    }
    for (let k = 0; k < count; k++) {
      const index = this.viewMesh[k]
      if (index < 0) continue
      this.showScarf(k === 0 ? game.loom : game.worn[k - 1], this.pool[index], t)
    }
  }

  private showScarf(view: ScarfView, scarf: ScarfMesh, t: number): void {
    if (scarf.version !== view.version || scarf.id !== view.id) {
      scarf.write(view.rows)
      scarf.version = view.version
    }
    const rows = Math.max(1, view.rows.length)
    const u = scarf.uniforms
    scarf.mesh.visible = view.rows.length > 0 || view.reveal > 0.01
    u.uRows.value = rows
    u.uReveal.value = view.reveal
    u.uFringe.value = view.fringe
    u.uTime.value = t
    if (view.holder === null) {
      u.uHang.value.copy(this.loomHang)
      u.uWrap.value = 0
      u.uKnitRows.value = 2
      return
    }

    const rig = this.animals[view.holder]
    const stack = view.stack
    const radius = rig.neckRadius + stack * 1.15
    const band = rig.band * (1 + stack * 0.05)
    const tails = radius * Math.min(2.2, 0.5 + 0.12 * rows)
    const length = 5.1 * radius + 2 * tails
    let wrap = view.wrap
    let shrink = 1
    if (view.leavingAt >= 0) {
      const k = (t - view.leavingAt) / LEAVE_SECONDS
      wrap = 1 - smooth(clamp01(k / 0.55))
      shrink = 1 - smooth(clamp01((k - 0.5) / 0.5))
    }
    const neck = u.uNeck.value.copy(rig.neck.matrixWorld)
    neck.multiply(this.m.makeTranslation(0, -stack * band * 0.55, 0))

    // Target of the flight: laid out flat behind the neck, as long as the wrapped scarf.
    const target = this.n.copy(neck)
    target.multiply(this.m.makeTranslation(0, 0, -radius - 0.6))
    target.multiply(this.m.makeRotationZ(Math.PI / 2))
    target.multiply(this.m.makeScale((band / (WIDTH * CELL_W)) * shrink, (length / (rows * CELL_H)) * shrink, shrink))

    const fly = view.fly
    if (fly >= 1) u.uHang.value.copy(target)
    else {
      this.hangFrame(view, false, u.uHang.value)
      u.uHang.value.decompose(this.p0, this.q0, this.s0)
      target.decompose(this.p1, this.q1, this.s1)
      this.p0.lerp(this.p1, fly)
      this.p0.y += Math.sin(fly * Math.PI) * FLIGHT_ARC
      this.q0.slerp(this.q1, fly)
      this.s0.lerp(this.s1, fly)
      u.uHang.value.compose(this.p0, this.q0, this.s0)
    }
    u.uWrap.value = wrap
    u.uNeckR.value = radius
    u.uWrapSize.value.set(band, length)
    u.uDrape.value = rig.drape
    u.uLayer.value = stack * 0.45
    u.uKnitRows.value = THREE.MathUtils.lerp(2, length / rows / (band / (3 * WIDTH)), smooth(fly))
  }

  // --- projection and touch ------------------------------------------------------------

  private readonly projector: Projector = {
    toScreen: (p: Point3, out: Point) => {
      this.v.set(p.x, p.y, p.z).project(this.camera)
      if (this.v.z < -1 || this.v.z > 1) return false
      out.x = ((this.v.x + 1) / 2) * this.width
      out.y = ((1 - this.v.y) / 2) * this.height
      return true
    },
    toPlaneZ: (screen: Point, z: number, out: Point3) => {
      this.ray(screen)
      if (Math.abs(this.w.z) < 1e-6) return false
      const k = (z - this.camera.position.z) / this.w.z
      if (!(k > 0)) return false
      out.x = this.camera.position.x + this.w.x * k
      out.y = this.camera.position.y + this.w.y * k
      out.z = z
      return true
    },
    toPlaneY: (screen: Point, y: number, out: Point3) => {
      this.ray(screen)
      if (Math.abs(this.w.y) < 1e-6) return false
      const k = (y - this.camera.position.y) / this.w.y
      if (!(k > 0)) return false
      out.x = this.camera.position.x + this.w.x * k
      out.y = y
      out.z = this.camera.position.z + this.w.z * k
      return true
    },
    pixelsPerUnit: (p: Point3) => {
      this.v.set(p.x, p.y, p.z).applyMatrix4(this.camera.matrixWorldInverse)
      const depth = Math.max(1, -this.v.z)
      return this.height / 2 / (Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * depth)
    },
  }

  private ray(screen: Point): void {
    this.w.set((screen.x / this.width) * 2 - 1, -((screen.y / this.height) * 2 - 1), 0.5).unproject(this.camera).sub(this.camera.position).normalize()
  }

  private bindInput(element: HTMLCanvasElement): () => void {
    const game = this.game
    const local = (event: PointerEvent): Point => {
      const rect = element.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const down = (event: PointerEvent) => {
      event.preventDefault()
      element.setPointerCapture?.(event.pointerId)
      game.pointerDown(event.pointerId, local(event), event.timeStamp)
    }
    const move = (event: PointerEvent) => game.pointerMove(event.pointerId, local(event), event.timeStamp)
    const up = (event: PointerEvent) => game.pointerUp(event.pointerId, local(event), event.timeStamp)
    const cancel = (event: PointerEvent) => game.pointerCancel(event.pointerId)
    const menu = (event: Event) => event.preventDefault()
    element.addEventListener('pointerdown', down)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointercancel', cancel)
    element.addEventListener('contextmenu', menu)
    return () => {
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointercancel', cancel)
      element.removeEventListener('contextmenu', menu)
    }
  }
}
