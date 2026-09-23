import { LinearSRGBColorSpace, NoToneMapping, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three'
import type { MeadowController, Projector, ScreenPoint } from '../controller'
import { groundY, type Point } from '../layout'
import { parseTier, PerfRecorder, startingTier, TierController } from '../perf'
import type { Season } from '../season'
import { paint, PALETTE } from './felt'
import { MeadowModels } from './models'
import { PostPass } from './post'

// The drawing side of the meadow: one canvas, one three.js scene built once,
// and a requestAnimationFrame loop that runs only while the meadow is
// attended and visible, and draws every other display frame once the meadow
// has rested a while. Each frame measures its own CPU cost (update plus
// render submit) for window.__jamPerf and feeds frame intervals to the tier
// controller, which trades DPR, blur, the post pass, fuzz shells, and puffs
// for frame rate.

const FOV = 30
const ELEVATION = 0.64
const TARGET = new Vector3(0, 1, -9)

type JamPerf = { readonly cpuMs: number[]; readonly tier: number; readonly drawCalls: number; readonly triangles: number; reset(): void }

const ray = new Vector3()

export class MeadowView {
  private readonly controller: MeadowController
  private readonly canvas: HTMLCanvasElement
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(FOV, 1, 10, 3000)
  private readonly models: MeadowModels
  private readonly post = new PostPass()
  private readonly tiers: TierController
  /** CPU work of the last drawn frame (ms), for the tier controller's step-up check. */
  private work = 0
  private readonly perf = new PerfRecorder()
  private readonly observer: ResizeObserver
  private readonly overlay: PerfOverlay | null
  private readonly jamPerf: JamPerf
  private width = 0
  private height = 0
  private left = 0
  private top = 0
  private raf = 0
  private last = -1
  /** The previous display frame was left undrawn because the meadow rests (half rate). */
  private skipped = false
  private running = false

  constructor(host: HTMLElement, controller: MeadowController, options: { search: string; season: Season }) {
    this.controller = controller
    this.canvas = document.createElement('canvas')
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none'
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' })
    host.appendChild(this.canvas)
    this.renderer.outputColorSpace = LinearSRGBColorSpace
    this.renderer.toneMapping = NoToneMapping
    this.renderer.info.autoReset = false
    this.renderer.setClearColor(paint(PALETTE.wallLow))
    this.scene.matrixWorldAutoUpdate = true

    this.models = new MeadowModels(this.scene, options.season)
    this.tiers = new TierController(parseTier(options.search), 0, startingTier(window.matchMedia?.('(pointer: coarse)').matches ?? false))
    this.applyTier()

    const projector: Projector = {
      project: (x, y, z, out) => this.project(x, y, z, out),
      ground: (px, py, lift, out) => this.ground(px, py, lift, out),
      pixelsPerUnit: (x, y, z) => this.pixelsPerUnit(x, y, z),
    }
    controller.attach(projector)

    this.canvas.addEventListener('pointerdown', this.onDown)
    this.canvas.addEventListener('pointermove', this.onMove)
    this.canvas.addEventListener('pointerup', this.onUp)
    this.canvas.addEventListener('pointercancel', this.onCancel)
    this.canvas.addEventListener('lostpointercapture', this.onCancel)
    this.canvas.addEventListener('contextmenu', this.onContextMenu)

    this.observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (!box || box.width < 1 || box.height < 1) return
      this.resize(box.width, box.height)
    })
    this.observer.observe(host)
    const box = host.getBoundingClientRect()
    if (box.width >= 1 && box.height >= 1) this.resize(box.width, box.height)

    const perf = this.perf
    const tiers = this.tiers
    this.jamPerf = {
      get cpuMs() {
        return perf.list()
      },
      get tier() {
        return tiers.tier
      },
      get drawCalls() {
        return perf.drawCalls
      },
      get triangles() {
        return perf.triangles
      },
      reset: () => perf.reset(),
    }
    ;(window as unknown as { __jamPerf?: JamPerf }).__jamPerf = this.jamPerf
    this.overlay = new URLSearchParams(options.search).get('fps') === '1' ? new PerfOverlay(host) : null
  }

  setRunning(running: boolean): void {
    if (running === this.running) return
    this.running = running
    if (running) {
      this.last = -1
      this.raf = requestAnimationFrame(this.frame)
    } else cancelAnimationFrame(this.raf)
  }

  dispose(): void {
    this.setRunning(false)
    this.observer.disconnect()
    this.canvas.removeEventListener('pointerdown', this.onDown)
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointerup', this.onUp)
    this.canvas.removeEventListener('pointercancel', this.onCancel)
    this.canvas.removeEventListener('lostpointercapture', this.onCancel)
    this.canvas.removeEventListener('contextmenu', this.onContextMenu)
    this.controller.attach(null)
    const global = window as unknown as { __jamPerf?: JamPerf }
    if (global.__jamPerf === this.jamPerf) delete global.__jamPerf
    this.overlay?.dispose()
    this.models.dispose()
    this.post.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.canvas.remove()
  }

  private readonly frame = (now: number): void => {
    this.raf = requestAnimationFrame(this.frame)
    if (!this.skipped && this.last >= 0 && this.controller.resting()) {
      this.skipped = true
      return
    }
    const start = performance.now()
    const interval = this.last < 0 ? 1000 / 60 : now - this.last
    this.last = now
    if (this.skipped) this.tiers.skip(now / 1000)
    else if (this.tiers.frame(interval, now / 1000, this.work)) this.applyTier()
    this.skipped = false
    this.controller.update(Math.min(0.05, interval / 1000))
    this.models.sync(this.controller, this.camera)
    const info = this.renderer.info
    info.reset()
    const tier = this.tiers.current
    if (tier.post) this.post.render(this.renderer, this.scene, this.camera, tier.blur)
    else this.renderer.render(this.scene, this.camera)
    const perf = this.perf
    this.work = performance.now() - start
    perf.push(this.work)
    perf.tier = this.tiers.tier
    perf.drawCalls = info.render.calls
    perf.triangles = info.render.triangles
    this.overlay?.draw(perf, interval, this.tiers.tier)
  }

  private applyTier(): void {
    const tier = this.tiers.current
    const dpr = Math.min(tier.dpr, window.devicePixelRatio || 1, 2)
    this.renderer.setPixelRatio(dpr)
    if (this.width > 0) {
      this.renderer.setSize(this.width, this.height, false)
      this.post.setSize(Math.round(this.width * dpr), Math.round(this.height * dpr))
    }
    this.models.setTier(tier)
  }

  private resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.measure()
    const aspect = width / height
    const t = Math.tan((FOV / 2) * (Math.PI / 180))
    const distance = Math.max(64 / t, 101 / (t * aspect))
    this.camera.aspect = aspect
    this.camera.position.set(TARGET.x, TARGET.y + Math.sin(ELEVATION) * distance, TARGET.z + Math.cos(ELEVATION) * distance)
    this.camera.near = distance * 0.35
    this.camera.far = distance * 3
    this.camera.lookAt(TARGET)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
    this.applyTier()
  }

  private measure(): void {
    const box = this.canvas.getBoundingClientRect()
    this.left = box.left
    this.top = box.top
  }

  private project(x: number, y: number, z: number, out: ScreenPoint): ScreenPoint {
    ray.set(x, y, z).project(this.camera)
    out.x = (ray.x * 0.5 + 0.5) * this.width
    out.y = (-ray.y * 0.5 + 0.5) * this.height
    return out
  }

  /** Walk the finger's ray down to the hill raised by `lift` (a few fixed-point steps: the slope is gentle). */
  private ground(px: number, py: number, lift: number, out: Point): Point {
    const camera = this.camera
    ray.set((px / Math.max(1, this.width)) * 2 - 1, -(py / Math.max(1, this.height)) * 2 + 1, 0.5).unproject(camera)
    const ox = camera.position.x
    const oy = camera.position.y
    const oz = camera.position.z
    const dx = ray.x - ox
    const dy = ray.y - oy
    const dz = ray.z - oz
    if (dy > -1e-6) {
      out.x = ox
      out.z = oz
      return out
    }
    let x = ox + (dx * (lift - oy)) / dy
    let z = oz + (dz * (lift - oy)) / dy
    for (let i = 0; i < 5; i++) {
      const s = (groundY(x, z) + lift - oy) / dy
      x = ox + dx * s
      z = oz + dz * s
    }
    out.x = x
    out.z = z
    return out
  }

  private pixelsPerUnit(x: number, y: number, z: number): number {
    ray.set(x, y, z).applyMatrix4(this.camera.matrixWorldInverse)
    const depth = Math.max(1, -ray.z)
    return this.height / (2 * depth * Math.tan((FOV / 2) * (Math.PI / 180)))
  }

  private readonly onDown = (event: PointerEvent): void => {
    event.preventDefault()
    this.measure()
    this.canvas.setPointerCapture?.(event.pointerId)
    this.controller.pointerDown(event.pointerId, event.clientX - this.left, event.clientY - this.top, event.timeStamp)
  }

  private readonly onMove = (event: PointerEvent): void => {
    this.controller.pointerMove(event.pointerId, event.clientX - this.left, event.clientY - this.top)
  }

  private readonly onUp = (event: PointerEvent): void => {
    this.controller.pointerUp(event.pointerId, event.timeStamp)
  }

  private readonly onCancel = (event: PointerEvent): void => {
    this.controller.pointerCancel(event.pointerId)
  }

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault()
  }
}

const OVERLAY_BARS = 90

/** `?fps=1`: a grown-up's frame graph in the corner (CPU ms per frame as bars, with the numbers). */
class PerfOverlay {
  private readonly canvas = document.createElement('canvas')
  private readonly context: CanvasRenderingContext2D | null
  private readonly samples = new Float32Array(OVERLAY_BARS)
  private readonly sorted = new Float32Array(OVERLAY_BARS)
  private frames = 0
  private intervalSum = 0

  constructor(host: HTMLElement) {
    this.canvas.width = 360
    this.canvas.height = 120
    this.canvas.style.cssText = 'position:absolute;left:8px;top:8px;width:180px;height:60px;pointer-events:none;border-radius:6px'
    host.appendChild(this.canvas)
    this.context = this.canvas.getContext('2d')
  }

  draw(perf: PerfRecorder, interval: number, tier: number): void {
    this.frames += 1
    this.intervalSum += interval
    if (this.frames % 6 !== 0 || !this.context) return
    const g = this.context
    const count = perf.recent(this.samples)
    g.fillStyle = 'rgba(40, 34, 28, 0.72)'
    g.fillRect(0, 0, 360, 120)
    const barWidth = 360 / OVERLAY_BARS
    for (let i = 0; i < count; i++) {
      const ms = this.samples[i]
      const h = Math.min(1, ms / 16) * 80
      g.fillStyle = ms < 8 ? '#9fd27a' : ms < 16 ? '#f2c14e' : '#e0664f'
      g.fillRect(i * barWidth, 120 - h, barWidth - 1, h)
    }
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.fillRect(0, 120 - 40, 360, 1)
    this.sorted.set(this.samples)
    const ordered = this.sorted.subarray(0, count).sort()
    const p95 = count ? ordered[Math.min(count - 1, Math.floor(count * 0.95))] : 0
    const fps = (1000 * 6) / Math.max(1, this.intervalSum)
    this.intervalSum = 0
    g.fillStyle = '#fbf4e6'
    g.font = '22px system-ui, sans-serif'
    // wordless-ok: grown-up perf overlay, only behind ?fps=1
    g.fillText(`${fps.toFixed(0)} fps  cpu95 ${p95.toFixed(1)}ms  t${tier}  dc${perf.drawCalls}`, 8, 26)
  }

  dispose(): void {
    this.canvas.remove()
  }
}
