import * as THREE from 'three'
import type { Companion, SparkSurface, TheatreController, Waking } from '../controller'
import { CREATURES, type CreatureKind, buildCreature } from '../creatures'
import { chaikinClosed, polygonArea, wobble, type Point } from '../geometry2d'
import { SILHOUETTE_S, type CreaturePose, type Ring } from '../motion'
import { LAMP, penumbra, PIN_HEIGHT, projectCardPoint, SCREEN, shadowScale, type CardPose } from '../projection'
import { OUTLINE_POINTS, SHAPES, type ShapeKind } from '../shapes'
import { PerfRing, startingTier, TierGovernor, TIERS } from '../tiers'
import { cardGeometry, flatGeometry, glowRingTexture, GRAIN_REPEAT, grainTexture, paintCard, paintFlat, paper, softSpotTexture, withInstanceAlpha } from './paper'
import { buildScenery, PALETTE } from './scenery'

// The theatre drawn with raw three.js and one hand-written frame loop:
// no reconciler, no post pass, no shadow maps. Static scenery is one merged
// unlit mesh; the shapes are lit cards; every shadow on the screen is the
// card's outline projected from the lamp point, written into one dynamic
// buffer with a soft penumbra ring. The loop measures its own CPU time for
// window.__jamPerf and the adaptive tiers. Nothing in the frame allocates.

declare global {
  interface Window {
    __jamPerf?: { readonly cpuMs: number[]; readonly tier: number; readonly drawCalls: number; readonly triangles: number; reset(): void }
  }
}

const FOV = 30
/** The camera looks down into the box from above and behind the lamp, so the flame sits at the bottom of the view. */
const PITCH = (31 * Math.PI) / 180
const TARGET = new THREE.Vector3(0, 24, 22)
const HALF_WIDTH = 64
const HALF_HEIGHT = 50

const SLOTS = 8
const GHOST_SLOT = 7
const RING_PTS = OUTLINE_POINTS
const VERTS_PER_SLOT = RING_PTS * 2 + 4
const SHADOW_ALPHA = 0.94
const MIN_SOFT = 0.12
const STICK_HALF = 0.17
const CARD_DEPTH = 0.26
const CARD_STAGGER = 0.3
const CREATURE_DEPTH = 0.36
/** How far a creature's backing card drops below it (world cm, like the scenery's). */
const BACKING_DROP = 0.55
const MAX_DOTS = 220
const MAX_RINGS = 44
/** Sleep rings on the screen drawn bigger than they rise, so a six-year-old reads them from arm's length and they stay on the paper. */
const SLEEP_RING_GROW = 2.2
const RIGS = 10
const REST_BEFORE_PACING = 20
const SPARK_STARS = 6
const SPARK_S = 0.9
const WAKE_STARS = 14
const WAKE_BURST_S = 1.4
const burstScale = new THREE.Vector3()

/** Parts drawn in front of the body (wings, shells) rather than behind it (tails, flukes). */
const FRONT_PART: Record<CreatureKind, boolean> = { bird: true, fish: false, snail: true, whale: false, fox: false, dragon: true }

const INK = paper(PALETTE.ink)
const GOLD = paper('#ffd35a')
const GLOW_INK = paper('#b3542e')
const RING_INK = paper('#3b3160')
const SMOKE = paper('#6d6788')
const SKY_RING = paper('#cfd6ff')

type Rig = {
  group: THREE.Group
  body: THREE.Mesh
  part: THREE.Mesh
  eye: THREE.Mesh
  dark: THREE.Mesh
  kind: CreatureKind | null
  paper: 0 | 1
}

type CreatureGeometry = { body: THREE.BufferGeometry; part: THREE.BufferGeometry; eye: THREE.BufferGeometry; dark: THREE.BufferGeometry }

function smooth(t: number): number {
  const k = t < 0 ? 0 : t > 1 ? 1 : t
  return k * k * (3 - 2 * k)
}

function recentre(outline: readonly Point[], cx: number, cy: number): Point[] {
  return outline.map((p) => ({ x: p.x - cx, y: p.y - cy }))
}

export type ViewOptions = { overlay: boolean; tierOverride: number | null }

export class TheatreView {
  private readonly controller: TheatreController
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 20, 700)
  private readonly governor: TierGovernor
  private readonly cpu = new PerfRing(600)
  private readonly intervals = new PerfRing(600)
  private readonly observer: ResizeObserver
  private readonly overlay: HTMLCanvasElement | null
  private width = 0
  private height = 0
  private running = false
  private handle = 0
  private last = 0
  private frameCount = 0

  private readonly cards: THREE.Mesh[] = []
  private readonly cardMaterials: THREE.MeshLambertMaterial[] = []
  private readonly cardGeometries = new Map<ShapeKind, THREE.BufferGeometry>()
  private readonly sticks: THREE.InstancedMesh
  private readonly blobs: THREE.InstancedMesh
  private readonly blobAlpha: THREE.InstancedBufferAttribute
  private readonly glows: THREE.InstancedMesh
  private readonly glowAlpha: THREE.InstancedBufferAttribute
  private readonly shadowGeometry = new THREE.BufferGeometry()
  private readonly shadowPos: Float32Array
  private readonly shadowCol: Float32Array
  private readonly shadowUV: Float32Array
  private readonly slotKind: (ShapeKind | null)[] = new Array(SLOTS).fill(null)
  private readonly slotIndexStart: number[] = []
  private readonly shadowIndex: Uint16Array
  private readonly dots: THREE.InstancedMesh
  private readonly dotAlpha: THREE.InstancedBufferAttribute
  private readonly rings: THREE.InstancedMesh
  private readonly ringAlpha: THREE.InstancedBufferAttribute
  private readonly rigs: Rig[] = []
  private readonly creatureGeometry = new Map<string, CreatureGeometry>()
  private readonly creatureMaterial: THREE.MeshLambertMaterial
  private readonly darkMaterial: THREE.MeshBasicMaterial
  private readonly eyeMaterial: THREE.MeshBasicMaterial
  private readonly shadowEyeMaterial: THREE.MeshBasicMaterial
  private readonly backingMaterial: THREE.MeshBasicMaterial
  private readonly flame: THREE.Mesh
  private readonly halo: THREE.Mesh
  private readonly haloMaterial: THREE.MeshBasicMaterial
  private readonly motes: THREE.InstancedMesh
  private readonly moteAlpha: THREE.InstancedBufferAttribute
  private readonly moteSeeds: Float32Array
  private readonly twinkles: THREE.InstancedMesh
  private readonly twinkleAlpha: THREE.InstancedBufferAttribute
  private readonly twinkleAnchors: Float32Array
  /** The spark stars' colours relative to the twinkle material: cream as it is, and shadow ink for the lit screen. */
  private readonly sparkCream = new THREE.Color(1, 1, 1)
  private readonly sparkInk = new THREE.Color()
  private sparkPainted: SparkSurface = 'sky'
  private readonly hand: THREE.Mesh
  private readonly handMaterial: THREE.MeshBasicMaterial
  private readonly ghost: THREE.Mesh
  private readonly ghostMaterial: THREE.MeshBasicMaterial
  private readonly lampLight: THREE.PointLight
  private readonly disposables: { dispose(): void }[] = []

  private readonly m = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly e = new THREE.Euler()
  private readonly v = new THREE.Vector3()
  private readonly s = new THREE.Vector3()
  private readonly c = new THREE.Color()
  private readonly p2 = { x: 0, y: 0 }
  private readonly ndc = new THREE.Vector2()
  private readonly raycaster = new THREE.Raycaster()
  private readonly lastPoses = new Float64Array(SLOTS * 6).fill(NaN)
  private ghostDrawn = -1
  private penumbraOn = true

  constructor(container: HTMLElement, controller: TheatreController, options: ViewOptions) {
    this.controller = controller
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
    this.governor = new TierGovernor(startingTier(coarse), options.tierOverride)

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false })
    renderer.setClearColor(PALETTE.night)
    renderer.localClippingEnabled = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.governor.settings.dpr))
    const canvas = renderer.domElement
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', touchAction: 'none', userSelect: 'none', webkitUserSelect: 'none', webkitTouchCallout: 'none' })
    container.appendChild(canvas)
    this.renderer = renderer

    const grain = grainTexture()
    grain.repeat.set(GRAIN_REPEAT, GRAIN_REPEAT)
    const spot = softSpotTexture()
    this.disposables.push(grain, spot)

    // --- static scenery -----------------------------------------------------
    const { geometry: sceneryGeometry, anchors } = buildScenery()
    const sceneryMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, map: grain })
    const scenery = new THREE.Mesh(sceneryGeometry, sceneryMaterial)
    scenery.matrixAutoUpdate = false
    this.scene.add(scenery)
    this.disposables.push(sceneryGeometry, sceneryMaterial)

    // --- lights for the moving paper ------------------------------------------
    this.lampLight = new THREE.PointLight('#ffd6a0', 5.2, 0, 0)
    this.lampLight.position.set(LAMP.x, LAMP.y, LAMP.z)
    this.scene.add(this.lampLight)
    this.scene.add(new THREE.HemisphereLight('#aab2ff', '#6a4a3c', 1.6))

    // --- shapes: lit cards, instanced sticks and feet, floor contact spots ------
    for (const shape of controller.shapes) {
      const material = new THREE.MeshLambertMaterial({ vertexColors: true, map: grain, emissive: new THREE.Color('#ff9a3c'), emissiveIntensity: 0 })
      const mesh = new THREE.Mesh(this.cardFor(shape.kind), material)
      mesh.matrixAutoUpdate = false
      this.cards.push(mesh)
      this.cardMaterials.push(material)
      this.scene.add(mesh)
      this.disposables.push(material)
    }
    {
      const stick = paintFlat(new THREE.BoxGeometry(STICK_HALF * 2, PIN_HEIGHT, STICK_HALF * 2).toNonIndexed(), paper('#6b4a2e'))
      stick.translate(0, PIN_HEIGHT / 2, -CARD_DEPTH)
      const foot = paintCard(cardGeometry([{ x: -2.4, y: 0 }, { x: 2.4, y: 0 }, { x: 0, y: 1.5 }], 2.8, 0.05), paper('#e9dcc4'), paper('#e9dcc4'), paper('#cbbba0'))
      foot.translate(0, 0, -CARD_DEPTH)
      const merged = mergeTwo(stick, foot)
      const material = new THREE.MeshLambertMaterial({ vertexColors: true, map: grain })
      this.sticks = new THREE.InstancedMesh(merged, material, controller.shapes.length)
      this.sticks.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      controller.shapes.forEach((shape, i) => this.sticks.setColorAt(i, this.c.set(SHAPES[shape.kind].color).lerp(paper('#ffffff'), 0.35)))
      this.scene.add(this.sticks)
      this.disposables.push(merged, material)
    }
    {
      const geometry = new THREE.PlaneGeometry(1, 1)
      geometry.rotateX(-Math.PI / 2)
      const material = new THREE.MeshBasicMaterial({ map: spot, color: PALETTE.dropShadow, transparent: true, depthWrite: false })
      this.blobs = new THREE.InstancedMesh(geometry, material, controller.shapes.length + 1)
      this.blobAlpha = withInstanceAlpha(material, this.blobs)
      this.blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.blobs.renderOrder = 1
      this.scene.add(this.blobs)
      this.disposables.push(geometry, material)
    }
    {
      // Guidance halos: a golden ring behind each card, which the card itself hides in the middle.
      const ring = glowRingTexture()
      const geometry = new THREE.PlaneGeometry(1, 1)
      // Normal blending: an additive glow vanishes against the warm stage floor behind most cards.
      const material = new THREE.MeshBasicMaterial({ map: ring, color: '#fff1b8', transparent: true, depthWrite: false })
      this.glows = new THREE.InstancedMesh(geometry, material, controller.shapes.length)
      this.glowAlpha = withInstanceAlpha(material, this.glows)
      this.glows.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.glows.frustumCulled = false
      this.glows.visible = false
      this.scene.add(this.glows)
      this.disposables.push(ring, geometry, material)
    }

    // --- shadows on the screen: one dynamic buffer ------------------------------
    this.shadowPos = new Float32Array(SLOTS * VERTS_PER_SLOT * 3)
    this.shadowCol = new Float32Array(SLOTS * VERTS_PER_SLOT * 4)
    this.shadowUV = new Float32Array(SLOTS * VERTS_PER_SLOT * 2)
    const perSlotIndex = (RING_PTS - 2) * 3 + RING_PTS * 6 + 6
    this.shadowIndex = new Uint16Array(SLOTS * perSlotIndex)
    for (let s = 0; s < SLOTS; s++) {
      this.slotIndexStart.push(s * perSlotIndex)
      this.writeRingIndices(s)
    }
    controller.shapes.forEach((shape, i) => this.setSlotKind(i, shape.kind))
    this.setSlotKind(GHOST_SLOT, controller.shapes[0].kind)
    const posAttr = new THREE.BufferAttribute(this.shadowPos, 3).setUsage(THREE.DynamicDrawUsage)
    const colAttr = new THREE.BufferAttribute(this.shadowCol, 4).setUsage(THREE.DynamicDrawUsage)
    const uvAttr = new THREE.BufferAttribute(this.shadowUV, 2).setUsage(THREE.DynamicDrawUsage)
    this.shadowGeometry.setAttribute('position', posAttr)
    this.shadowGeometry.setAttribute('color', colAttr)
    this.shadowGeometry.setAttribute('uv', uvAttr)
    this.shadowGeometry.setIndex(new THREE.BufferAttribute(this.shadowIndex, 1).setUsage(THREE.DynamicDrawUsage))
    this.shadowGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 24, 0), 80)
    const clip = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -SCREEN.left), new THREE.Plane(new THREE.Vector3(-1, 0, 0), SCREEN.right), new THREE.Plane(new THREE.Vector3(0, 1, 0), -SCREEN.bottom), new THREE.Plane(new THREE.Vector3(0, -1, 0), SCREEN.top)]
    const shadowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, map: grain, clippingPlanes: clip })
    const shadows = new THREE.Mesh(this.shadowGeometry, shadowMaterial)
    shadows.renderOrder = 2
    shadows.frustumCulled = false
    shadows.matrixAutoUpdate = false
    this.scene.add(shadows)
    this.disposables.push(this.shadowGeometry, shadowMaterial)

    // --- the sleeping outline and its sleep rings -------------------------------
    {
      const geometry = new THREE.CircleGeometry(0.34, 10)
      const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })
      this.dots = new THREE.InstancedMesh(geometry, material, MAX_DOTS)
      this.dotAlpha = withInstanceAlpha(material, this.dots)
      this.dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.dots.setColorAt(0, INK)
      this.dots.instanceColor!.setUsage(THREE.DynamicDrawUsage)
      this.dots.count = 0
      this.dots.renderOrder = 3
      this.dots.frustumCulled = false
      this.scene.add(this.dots)
      this.disposables.push(geometry, material)
    }
    {
      const geometry = new THREE.RingGeometry(0.64, 1, 22)
      const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })
      this.rings = new THREE.InstancedMesh(geometry, material, MAX_RINGS)
      this.ringAlpha = withInstanceAlpha(material, this.rings)
      this.rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.rings.setColorAt(0, RING_INK)
      this.rings.instanceColor!.setUsage(THREE.DynamicDrawUsage)
      this.rings.count = 0
      this.rings.renderOrder = 4
      this.rings.frustumCulled = false
      this.scene.add(this.rings)
      this.disposables.push(geometry, material)
    }

    // --- paper creatures ----------------------------------------------------------
    this.creatureMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, map: grain })
    this.darkMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.ink, map: grain, transparent: true })
    this.eyeMaterial = new THREE.MeshBasicMaterial({ vertexColors: true })
    this.shadowEyeMaterial = new THREE.MeshBasicMaterial({ color: '#ffd35a' })
    this.backingMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.dropShadow, map: grain })
    this.disposables.push(this.creatureMaterial, this.darkMaterial, this.eyeMaterial, this.shadowEyeMaterial, this.backingMaterial)
    const empty = new THREE.BufferGeometry()
    for (let i = 0; i < RIGS; i++) {
      const group = new THREE.Group()
      const body = new THREE.Mesh(empty, this.creatureMaterial)
      const part = new THREE.Mesh(empty, this.creatureMaterial)
      const eye = new THREE.Mesh(empty, this.eyeMaterial)
      const dark = new THREE.Mesh(empty, this.darkMaterial)
      dark.renderOrder = 5
      group.add(body, part, eye, dark)
      group.visible = false
      this.scene.add(group)
      this.rigs.push({ group, body, part, eye, dark, kind: null, paper: 0 })
    }

    // --- the lamp's flame, halo, and dust in the beam ------------------------------
    {
      const outer: Point[] = []
      const inner: Point[] = []
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2
        const r = 1 - 0.35 * Math.max(0, Math.sin(a))
        outer.push({ x: Math.cos(a) * 1.2 * r, y: Math.sin(a) > 0 ? Math.sin(a) * 3.4 : Math.sin(a) * 1.1 })
        inner.push({ x: Math.cos(a) * 0.6 * r, y: Math.sin(a) > 0 ? Math.sin(a) * 1.9 : Math.sin(a) * 0.6 - 0.2 })
      }
      const o = paintFlat(flatGeometry(outer), paper('#ff9a2e'))
      const n = paintFlat(flatGeometry(inner), paper('#fff3b0'))
      n.translate(0, 0, 0.05)
      const geometry = mergeTwo(o, n)
      const material = new THREE.MeshBasicMaterial({ vertexColors: true })
      this.flame = new THREE.Mesh(geometry, material)
      this.flame.position.set(LAMP.x, LAMP.y - 1, LAMP.z)
      this.scene.add(this.flame)
      this.disposables.push(geometry, material)
    }
    {
      const geometry = new THREE.PlaneGeometry(1, 1)
      this.haloMaterial = new THREE.MeshBasicMaterial({ map: spot, color: '#ffb866', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 })
      this.halo = new THREE.Mesh(geometry, this.haloMaterial)
      this.halo.position.set(LAMP.x, LAMP.y, LAMP.z + 0.5)
      this.halo.renderOrder = 8
      this.scene.add(this.halo)
      this.disposables.push(geometry, this.haloMaterial)
    }
    {
      const geometry = new THREE.CircleGeometry(0.16, 6)
      const material = new THREE.MeshBasicMaterial({ color: '#ffe2a8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
      this.motes = new THREE.InstancedMesh(geometry, material, TIERS[0].motes)
      this.moteAlpha = withInstanceAlpha(material, this.motes)
      this.motes.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.motes.renderOrder = 7
      this.motes.frustumCulled = false
      this.moteSeeds = new Float32Array(TIERS[0].motes * 4)
      let seed = 3
      const random = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
      }
      for (let i = 0; i < this.moteSeeds.length; i++) this.moteSeeds[i] = random()
      this.scene.add(this.motes)
      this.disposables.push(geometry, material)
    }
    {
      const starOutline: Point[] = []
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2
        const r = i % 2 === 0 ? 1 : 0.45
        starOutline.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
      }
      const geometry = flatGeometry(starOutline)
      const material = new THREE.MeshBasicMaterial({ color: PALETTE.star, transparent: true, depthWrite: false })
      this.twinkleAnchors = anchors.twinkles
      const fixed = anchors.twinkles.length / 4
      this.twinkles = new THREE.InstancedMesh(geometry, material, fixed + SPARK_STARS + WAKE_STARS)
      this.twinkleAlpha = withInstanceAlpha(material, this.twinkles)
      this.twinkles.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      this.twinkles.frustumCulled = false
      // After the shadows and the dark face, so the wake's stars spring over them.
      this.twinkles.renderOrder = 6
      // Gold (cream paper would vanish on the lit screen): the material's cream times this.
      const gold = new THREE.Color(PALETTE.brass)
      gold.setRGB(gold.r / material.color.r, gold.g / material.color.g, gold.b / material.color.b)
      for (let i = 0; i < WAKE_STARS; i++) this.twinkles.setColorAt(fixed + SPARK_STARS + i, gold)
      this.sparkInk.setRGB(INK.r / material.color.r, INK.g / material.color.g, INK.b / material.color.b)
      this.scene.add(this.twinkles)
      this.disposables.push(geometry, material)
    }

    // --- guidance: a paper ghost hand and a see-through copy of the shape ----------
    {
      const geometry = handGeometry()
      this.handMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, depthTest: false, opacity: 0 })
      this.hand = new THREE.Mesh(geometry, this.handMaterial)
      this.hand.renderOrder = 10
      this.hand.visible = false
      this.scene.add(this.hand)
      this.ghostMaterial = new THREE.MeshBasicMaterial({ color: '#fff6e2', transparent: true, depthWrite: false, opacity: 0 })
      this.ghost = new THREE.Mesh(this.cardFor(controller.shapes[0].kind), this.ghostMaterial)
      this.ghost.renderOrder = 9
      this.ghost.visible = false
      this.ghost.matrixAutoUpdate = false
      this.scene.add(this.ghost)
      this.disposables.push(geometry, this.handMaterial, this.ghostMaterial)
    }

    // --- grown-up perf overlay (?fps=1) ------------------------------------------
    this.overlay = options.overlay ? document.createElement('canvas') : null
    if (this.overlay) {
      Object.assign(this.overlay.style, { position: 'absolute', left: '8px', top: '8px', width: '240px', height: '64px', pointerEvents: 'none', zIndex: '2', borderRadius: '8px' })
      this.overlay.width = 480
      this.overlay.height = 128
      container.appendChild(this.overlay)
    }

    this.applyTier()
    controller.setProjector({ ray: (screen, origin, dir) => this.ray(screen, origin, dir) })
    this.observer = new ResizeObserver((entries) => {
      const rect = entries[entries.length - 1]?.contentRect
      if (!rect || rect.width === 0 || rect.height === 0) return
      this.resize(rect.width, rect.height)
    })
    this.observer.observe(container)
    const rect = container.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) this.resize(rect.width, rect.height)
    this.bindInput(canvas)
    this.installPerf()
  }

  // --- lifecycle ----------------------------------------------------------------

  setRunning(running: boolean): void {
    if (running === this.running) return
    this.running = running
    if (running) {
      this.last = 0
      this.handle = requestAnimationFrame(this.frame)
    } else cancelAnimationFrame(this.handle)
  }

  dispose(): void {
    this.setRunning(false)
    this.observer.disconnect()
    this.unbindInput?.()
    if (window.__jamPerf === this.perf) delete window.__jamPerf
    for (const geometry of this.cardGeometries.values()) geometry.dispose()
    for (const g of this.creatureGeometry.values()) {
      g.body.dispose()
      g.part.dispose()
      g.eye.dispose()
      g.dark.dispose()
    }
    for (const item of this.disposables) item.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.overlay?.remove()
  }

  private perf: NonNullable<Window['__jamPerf']> | null = null

  private installPerf(): void {
    const view = this
    this.perf = {
      get cpuMs() {
        return view.cpu.values()
      },
      get tier() {
        return view.governor.tier
      },
      get drawCalls() {
        return view.renderer.info.render.calls
      },
      get triangles() {
        return view.renderer.info.render.triangles
      },
      reset() {
        view.cpu.reset()
        view.intervals.reset()
      },
    }
    window.__jamPerf = this.perf
  }

  private resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.renderer.setSize(width, height, false)
    const aspect = width / height
    const vHalf = THREE.MathUtils.degToRad(FOV / 2)
    const hHalf = Math.atan(Math.tan(vHalf) * aspect)
    const distance = Math.max(HALF_HEIGHT / Math.tan(vHalf), HALF_WIDTH / Math.tan(hHalf))
    this.camera.aspect = aspect
    this.camera.position.set(TARGET.x, TARGET.y + Math.sin(PITCH) * distance, TARGET.z + Math.cos(PITCH) * distance)
    this.camera.lookAt(TARGET)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
    // The halo and hand face the camera; the flame turns to it about the vertical.
    this.halo.quaternion.copy(this.camera.quaternion)
    this.hand.quaternion.copy(this.camera.quaternion)
    if (!this.running) this.render()
  }

  private applyTier(): void {
    const settings = this.governor.settings
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.dpr))
    if (this.width > 0) this.renderer.setSize(this.width, this.height, false)
    this.motes.count = settings.motes
    this.motes.visible = settings.motes > 0
    this.penumbraOn = settings.penumbra
    this.lastPoses.fill(NaN)
    this.renderer.domElement.dataset.tier = settings.name
  }

  private ray(screen: Point, origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }): boolean {
    if (this.width === 0) return false
    this.ndc.set((screen.x / this.width) * 2 - 1, -(screen.y / this.height) * 2 + 1)
    this.raycaster.setFromCamera(this.ndc, this.camera)
    const r = this.raycaster.ray
    origin.x = r.origin.x
    origin.y = r.origin.y
    origin.z = r.origin.z
    dir.x = r.direction.x
    dir.y = r.direction.y
    dir.z = r.direction.z
    return true
  }

  private unbindInput: (() => void) | null = null

  private bindInput(canvas: HTMLCanvasElement): void {
    const c = this.controller
    const local = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const down = (event: PointerEvent) => {
      event.preventDefault()
      canvas.setPointerCapture?.(event.pointerId)
      c.pointerDown(event.pointerId, local(event), event.timeStamp)
    }
    const move = (event: PointerEvent) => c.pointerMove(event.pointerId, local(event))
    const up = (event: PointerEvent) => c.pointerUp(event.pointerId, local(event), event.timeStamp)
    const cancel = (event: PointerEvent) => c.pointerCancel(event.pointerId)
    const menu = (event: Event) => event.preventDefault()
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', cancel)
    canvas.addEventListener('contextmenu', menu)
    this.unbindInput = () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('contextmenu', menu)
    }
  }

  // --- the frame ----------------------------------------------------------------

  private readonly frame = (now: number): void => {
    if (!this.running) return
    this.handle = requestAnimationFrame(this.frame)
    const interval = this.last > 0 ? now - this.last : 16.7
    this.frameCount += 1
    // At rest (untouched and still for a while) draw every other display frame.
    if (this.controller.restingFor() > REST_BEFORE_PACING && this.frameCount % 2 === 1) return
    this.last = now
    const start = performance.now()
    this.controller.step(Math.min(interval / 1000, 1 / 20))
    this.controller.flushTimedSounds()
    this.update()
    this.render()
    const work = performance.now() - start
    this.cpu.push(work)
    this.intervals.push(interval)
    if (this.governor.sample(interval, work)) this.applyTier()
    if (this.overlay && this.frameCount % 6 === 0) this.drawOverlay()
  }

  private render(): void {
    if (this.width === 0) return
    this.renderer.render(this.scene, this.camera)
  }

  private update(): void {
    const c = this.controller
    const t = c.t
    this.updateShapes()
    this.updateShadows()
    this.updateDots()
    this.updateCreatures()
    this.updateRings()
    // The flame flickers; tapping the lamp makes it flare.
    const flare = c.lampFlare()
    const flicker = 1 + 0.07 * Math.sin(t * 11.3) + 0.05 * Math.sin(t * 17.9 + 1) + 0.35 * flare
    this.flame.scale.set(1 / Math.sqrt(flicker), flicker, 1)
    this.flame.rotation.y = Math.atan2(this.camera.position.x - LAMP.x, this.camera.position.z - LAMP.z)
    this.flame.rotation.z = 0.05 * Math.sin(t * 7.1)
    const halo = 26 * (1 + 0.04 * Math.sin(t * 9.7) + 0.4 * flare)
    this.halo.scale.set(halo, halo, 1)
    this.haloMaterial.opacity = 0.42 + 0.05 * Math.sin(t * 13.1) + 0.3 * flare
    this.lampLight.intensity = 5.2 * (1 + 0.025 * Math.sin(t * 11.3) + 0.3 * flare)
    this.updateMotes(t, flicker)
    this.updateTwinkles(t)
    this.updateGuidance()
  }

  private updateShapes(): void {
    const c = this.controller
    let glowing = false
    for (let i = 0; i < c.shapes.length; i++) {
      const shape = c.shapes[i]
      const pose = shape.pose
      const card = this.cards[i]
      const landing = c.landing(shape)
      // Each card stands a hair off its pin's depth, so two cards a child puts at one depth never cut through each other.
      const z = pose.z + (i - (c.shapes.length - 1) / 2) * CARD_STAGGER
      this.e.set(0, pose.yaw, pose.angle, 'YXZ')
      this.q.setFromEuler(this.e)
      this.v.set(pose.x, PIN_HEIGHT + pose.lift, z)
      this.s.set(1 + landing * 0.06, 1 - landing * 0.08, 1)
      card.matrix.compose(this.v, this.q, this.s)
      card.matrixWorldNeedsUpdate = true
      const material = this.cardMaterials[i]
      material.emissiveIntensity = shape.glow * 0.32 + c.pulse(shape) * 0.45 + (shape.heldBy !== null ? 0.08 : 0)
      this.e.set(0, pose.yaw, 0)
      this.q.setFromEuler(this.e)
      this.v.set(pose.x, pose.lift, z)
      this.s.set(1, 1, 1)
      this.m.compose(this.v, this.q, this.s)
      this.sticks.setMatrixAt(i, this.m)
      // A soft contact spot under the foot that shrinks and fades as the stand lifts.
      const lift = Math.max(0, pose.lift)
      const size = 6.5 - lift * 0.8
      this.m.makeScale(size, 1, size * 0.62).setPosition(pose.x, 0.06, z - CARD_DEPTH)
      this.blobs.setMatrixAt(i, this.m)
      this.blobAlpha.setX(i, 0.5 / (1 + lift * 0.5))
      if (shape.glow > 0.01) {
        glowing = true
        const spec = SHAPES[shape.kind]
        const ca = Math.cos(pose.angle)
        const sa = Math.sin(pose.angle)
        const size = spec.radius * 2.9 * (1 + 0.06 * Math.sin(c.t * 2.4 + i))
        this.m.makeScale(size, size, 1).setPosition(pose.x + spec.center.x * ca - spec.center.y * sa, PIN_HEIGHT + pose.lift + spec.center.x * sa + spec.center.y * ca, z - CARD_DEPTH - 0.4)
        this.glows.setMatrixAt(i, this.m)
      }
      this.glowAlpha.setX(i, shape.glow)
    }
    this.glows.visible = glowing
    if (glowing) {
      this.glows.instanceMatrix.needsUpdate = true
      this.glowAlpha.needsUpdate = true
    }
    this.m.makeScale(17, 1, 12).setPosition(LAMP.x, 0.05, LAMP.z)
    this.blobs.setMatrixAt(c.shapes.length, this.m)
    this.blobAlpha.setX(c.shapes.length, 0.55)
    this.sticks.instanceMatrix.needsUpdate = true
    this.blobs.instanceMatrix.needsUpdate = true
    this.blobAlpha.needsUpdate = true
  }

  // --- shadows ------------------------------------------------------------------

  private setSlotKind(slot: number, kind: ShapeKind): void {
    if (this.slotKind[slot] === kind) return
    this.slotKind[slot] = kind
    const triangles = umbraTriangles(kind)
    const base = slot * VERTS_PER_SLOT
    let k = this.slotIndexStart[slot]
    for (let i = 0; i < triangles.length; i++) this.shadowIndex[k++] = base + triangles[i]
    const index = this.shadowGeometry.getIndex()
    if (index) index.needsUpdate = true
  }

  private writeRingIndices(slot: number): void {
    const base = slot * VERTS_PER_SLOT
    let k = this.slotIndexStart[slot] + (RING_PTS - 2) * 3
    for (let i = 0; i < RING_PTS; i++) {
      const j = (i + 1) % RING_PTS
      const a = base + i
      const b = base + j
      const oa = base + RING_PTS + i
      const ob = base + RING_PTS + j
      this.shadowIndex[k++] = a
      this.shadowIndex[k++] = oa
      this.shadowIndex[k++] = ob
      this.shadowIndex[k++] = a
      this.shadowIndex[k++] = ob
      this.shadowIndex[k++] = b
    }
    const s = base + RING_PTS * 2
    this.shadowIndex[k++] = s
    this.shadowIndex[k++] = s + 1
    this.shadowIndex[k++] = s + 2
    this.shadowIndex[k++] = s
    this.shadowIndex[k++] = s + 2
    this.shadowIndex[k++] = s + 3
  }

  private updateShadows(): void {
    const c = this.controller
    let dirty = false
    for (let i = 0; i < c.shapes.length; i++) dirty = this.writeSlot(i, c.shapes[i].kind, c.shapes[i].pose, SHADOW_ALPHA) || dirty
    const demo = c.demo
    const ghostOpacity = demo && c.demoPose.opacity > 0 ? c.demoPose.ghostOpacity : 0
    if (demo && ghostOpacity > 0) {
      this.setSlotKind(GHOST_SLOT, c.shapes[demo.index].kind)
      dirty = this.writeSlot(GHOST_SLOT, c.shapes[demo.index].kind, c.demoPose.ghost, 0.42 * ghostOpacity) || dirty
      this.ghostDrawn = 1
    } else if (this.ghostDrawn !== 0) {
      this.clearSlot(GHOST_SLOT)
      this.ghostDrawn = 0
      dirty = true
    }
    if (!dirty) return
    this.shadowGeometry.getAttribute('position').needsUpdate = true
    this.shadowGeometry.getAttribute('color').needsUpdate = true
    this.shadowGeometry.getAttribute('uv').needsUpdate = true
  }

  private clearSlot(slot: number): void {
    const base = slot * VERTS_PER_SLOT
    for (let i = 0; i < VERTS_PER_SLOT; i++) this.shadowCol[(base + i) * 4 + 3] = 0
    this.lastPoses[slot * 6] = NaN
  }

  /** Project one card's outline from the lamp onto the screen. Returns false when nothing changed. */
  private writeSlot(slot: number, kind: ShapeKind, pose: CardPose, alpha: number): boolean {
    const j = slot * 6
    const lp = this.lastPoses
    if (lp[j] === pose.x && lp[j + 1] === pose.z && lp[j + 2] === pose.angle && lp[j + 3] === pose.yaw && lp[j + 4] === pose.lift && lp[j + 5] === alpha) return false
    lp[j] = pose.x
    lp[j + 1] = pose.z
    lp[j + 2] = pose.angle
    lp[j + 3] = pose.yaw
    lp[j + 4] = pose.lift
    lp[j + 5] = alpha
    const spec = SHAPES[kind]
    const base = slot * VERTS_PER_SLOT
    const pos = this.shadowPos
    const col = this.shadowCol
    const uv = this.shadowUV
    const k = shadowScale(pose.z)
    const soft = this.penumbraOn ? Math.max(MIN_SOFT, penumbra(k)) : MIN_SOFT
    const inset = soft * 0.4
    const outset = soft * 0.6
    const outline = spec.outline
    // Project the outline first (into the outer ring's slots as scratch).
    for (let i = 0; i < RING_PTS; i++) {
      projectCardPoint(pose, outline[i].x, outline[i].y, this.p2)
      const o = (base + RING_PTS + i) * 3
      pos[o] = this.p2.x
      pos[o + 1] = this.p2.y
    }
    for (let i = 0; i < RING_PTS; i++) {
      const prev = (base + RING_PTS + ((i + RING_PTS - 1) % RING_PTS)) * 3
      const next = (base + RING_PTS + ((i + 1) % RING_PTS)) * 3
      const here = (base + RING_PTS + i) * 3
      let nx = pos[next + 1] - pos[prev + 1]
      let ny = -(pos[next] - pos[prev])
      const len = Math.hypot(nx, ny) || 1
      nx /= len
      ny /= len
      const x = pos[here]
      const y = pos[here + 1]
      const ii = (base + i) * 3
      pos[ii] = x - nx * inset
      pos[ii + 1] = y - ny * inset
      pos[ii + 2] = 0.03
      // The outer ring is written after the inner ring has read this point's neighbours.
      scratchOuter[i * 2] = x + nx * outset
      scratchOuter[i * 2 + 1] = y + ny * outset
    }
    for (let i = 0; i < RING_PTS; i++) {
      const o = (base + RING_PTS + i) * 3
      pos[o] = scratchOuter[i * 2]
      pos[o + 1] = scratchOuter[i * 2 + 1]
      pos[o + 2] = 0.03
    }
    for (let i = 0; i < RING_PTS * 2; i++) {
      const v = base + i
      col[v * 4] = INK.r
      col[v * 4 + 1] = INK.g
      col[v * 4 + 2] = INK.b
      col[v * 4 + 3] = i < RING_PTS ? alpha : 0
      uv[v * 2] = pos[v * 3]
      uv[v * 2 + 1] = pos[v * 3 + 1]
    }
    // The stick's shadow, running down from the pin's shadow off the bottom of the screen.
    const s = base + RING_PTS * 2
    const top = PIN_HEIGHT + pose.lift
    const cy = Math.cos(pose.yaw)
    const sy = Math.sin(pose.yaw)
    for (let q = 0; q < 4; q++) {
      const lx = q === 0 || q === 3 ? -STICK_HALF : STICK_HALF
      const ly = q < 2 ? pose.lift : top
      const wx = pose.x + lx * cy
      const wz = pose.z - CARD_DEPTH - lx * sy
      const kk = LAMP.z / (LAMP.z - wz)
      const o = (s + q) * 3
      pos[o] = LAMP.x + (wx - LAMP.x) * kk
      pos[o + 1] = LAMP.y + (ly - LAMP.y) * kk
      pos[o + 2] = 0.028
      col[(s + q) * 4] = INK.r
      col[(s + q) * 4 + 1] = INK.g
      col[(s + q) * 4 + 2] = INK.b
      col[(s + q) * 4 + 3] = alpha * 0.9
      uv[(s + q) * 2] = pos[o]
      uv[(s + q) * 2 + 1] = pos[o + 1]
    }
    return true
  }

  // --- the sleeping outline -----------------------------------------------------

  private updateDots(): void {
    const c = this.controller
    const t = c.t
    let n = 0
    const sleeper = c.sleeper
    if (sleeper) {
      const built = sleeper.built
      const pose = sleeper.pose
      const enter = c.enterProgress()
      const covered = sleeper.meter.dotCovered
      const glow = c.guidance.glow
      const dots = built.dots
      const cx = built.center.x
      const cy = built.center.y
      const cr = Math.cos(pose.roll)
      const sr = Math.sin(pose.roll)
      const part = built.def.parts[0]
      const cp = Math.cos(pose.part)
      const sp = Math.sin(pose.part)
      for (let d = 0; d < dots.length && n < MAX_DOTS - 3; d++) {
        let x = dots[d].x
        let y = dots[d].y
        if (built.dotPart[d] >= 0 && part) {
          const dx = x - part.pivot.x
          const dy = y - part.pivot.y
          x = part.pivot.x + dx * cp - dy * sp
          y = part.pivot.y + dx * sp + dy * cp + pose.partLift
        }
        const bx = (x - cx) * pose.sx
        const by = (y - cy) * pose.sy
        x = cx + bx * cr - by * sr + pose.dx
        y = cy + bx * sr + by * cr + pose.dy
        const dk = smooth((enter - (d / dots.length) * 0.35) / 0.65)
        x += (1 - dk) * (30 + 8 * Math.sin(d * 0.7))
        y += (1 - dk) * 5 * Math.sin(d * 0.37 + t * 2)
        const lit = sleeper.dotLit[d]
        const flash = lit >= 0 ? 1 + 0.9 * (1 - lit) : 1
        const size = flash * (covered[d] ? 1.12 : 1) * (1 + glow * 0.18 * Math.sin(t * 5 - d * 0.35))
        this.m.makeScale(size, size, 1).setPosition(x, y, 0.07)
        this.dots.setMatrixAt(n, this.m)
        if (covered[d]) this.c.copy(GOLD)
        else this.c.copy(INK).lerp(GLOW_INK, glow * (0.5 + 0.5 * Math.sin(t * 5 - d * 0.35)))
        this.dots.setColorAt(n, this.c)
        this.dotAlpha.setX(n, dk)
        n++
      }
      // A closed, sleeping eye: a little smile of dots.
      const eye = built.def.eye
      for (let k = -1; k <= 1; k++) {
        const ex = eye.x + k * 0.75 - cx
        const ey = eye.y + (k === 0 ? -0.28 : 0.1) - cy
        const bx = ex * pose.sx
        const by = ey * pose.sy
        this.m.makeScale(0.8, 0.8, 1).setPosition(cx + bx * cr - by * sr + pose.dx, cy + bx * sr + by * cr + pose.dy, 0.07)
        this.dots.setMatrixAt(n, this.m)
        this.dots.setColorAt(n, INK)
        this.dotAlpha.setX(n, enter)
        n++
      }
    } else if (c.waking && c.t - c.waking.start < SILHOUETTE_S) {
      // The outline turns gold and melts into the dark silhouette as it fills in.
      const w = c.waking
      const fade = 1 - w.fillIn
      for (let d = 0; d < w.built.dots.length && n < MAX_DOTS; d++) {
        const dot = w.built.dots[d]
        const size = 1 + w.fillIn * 0.8
        this.m.makeScale(size, size, 1).setPosition(dot.x, dot.y, 0.4)
        this.dots.setMatrixAt(n, this.m)
        this.dots.setColorAt(n, GOLD)
        this.dotAlpha.setX(n, fade)
        n++
      }
    }
    this.dots.count = n
    this.dots.instanceMatrix.needsUpdate = true
    if (this.dots.instanceColor) this.dots.instanceColor.needsUpdate = true
    this.dotAlpha.needsUpdate = true
  }

  // --- creatures ----------------------------------------------------------------

  private geometryFor(kind: CreatureKind, sheet: 0 | 1): CreatureGeometry {
    const key = `${kind}:${sheet}`
    const cached = this.creatureGeometry.get(key)
    if (cached) return cached
    const built = buildCreature(kind)
    const def = CREATURES[kind]
    const { x: cx, y: cy } = built.center
    const papers = sheet === 1 ? def.second : def
    const color = paper(papers.color)
    const accent = paper(papers.accent)
    const edge = color.clone().multiplyScalar(0.72)
    const bodyOutline = wobble(recentre(built.bodyOutline, cx, cy), 0.07, 11)
    const body = paintCard(cardGeometry(bodyOutline, CREATURE_DEPTH), color, color, edge)
    // The style's offset shadow card, riding just behind the body.
    const drop = paintFlat(flatGeometry(bodyOutline), paper(PALETTE.dropShadow))
    drop.translate(0.7, -0.9, -CREATURE_DEPTH - 0.5)
    const pivot = def.parts[0].pivot
    const partOutline = wobble(recentre(built.partOutlines[0], pivot.x, pivot.y), 0.07, 12)
    const part = paintCard(cardGeometry(partOutline, CREATURE_DEPTH * 0.9), accent, accent, accent.clone().multiplyScalar(0.72))
    const eyeWhite = paintFlat(flatGeometry(circleOutline(0, 0, 1.25, 16)), paper('#fffaf0'))
    const pupil = paintFlat(flatGeometry(circleOutline(0.3, 0.05, 0.68, 14)), paper('#1f1a33'))
    pupil.translate(0, 0, 0.02)
    const glint = paintFlat(flatGeometry(circleOutline(0.55, 0.35, 0.2, 8)), paper('#ffffff'))
    glint.translate(0, 0, 0.04)
    const geometry: CreatureGeometry = {
      body: mergeTwo(body, drop),
      part,
      eye: mergeTwo(mergeTwo(eyeWhite, pupil), glint),
      // The shadow face is the body alone; the part goes dark itself, so a stirring wing moves in silhouette.
      dark: flatGeometry(bodyOutline),
    }
    this.creatureGeometry.set(key, geometry)
    return geometry
  }

  private assign(rig: Rig, kind: CreatureKind, sheet: 0 | 1): void {
    if (rig.kind === kind && rig.paper === sheet) return
    rig.kind = kind
    rig.paper = sheet
    const g = this.geometryFor(kind, sheet)
    rig.body.geometry = g.body
    rig.part.geometry = g.part
    rig.eye.geometry = g.eye
    rig.dark.geometry = g.dark
    const def = CREATURES[kind]
    const built = buildCreature(kind)
    const pivot = def.parts[0].pivot
    rig.part.userData.base = { x: pivot.x - built.center.x, y: pivot.y - built.center.y, z: FRONT_PART[kind] ? CREATURE_DEPTH * 0.95 : -CREATURE_DEPTH * 0.95 }
    rig.eye.position.set(def.eye.x - built.center.x, def.eye.y - built.center.y, CREATURE_DEPTH / 2 + 0.05)
  }

  private poseRig(rig: Rig, pose: CreaturePose): void {
    const g = rig.group
    const s = pose.scale
    const h = pose.hinge * s
    g.position.set(pose.x + h - h * Math.cos(pose.spin), pose.y, pose.z - h * Math.sin(pose.spin))
    g.rotation.set(0, -pose.spin, pose.roll, 'YXZ')
    const facing = Math.abs(pose.facing) < 0.02 ? 0.02 * Math.sign(pose.facing || 1) : pose.facing
    g.scale.set(pose.sx * s * facing, pose.sy * s, s)
    const base = rig.part.userData.base as { x: number; y: number; z: number }
    rig.part.position.set(base.x, base.y + pose.partLift, base.z)
    rig.part.rotation.z = pose.part
    rig.eye.scale.set(1, Math.max(0.08, pose.eye), 1)
    const dark = pose.dark > 0
    rig.body.visible = !dark
    rig.part.material = dark ? this.darkMaterial : this.creatureMaterial
    rig.eye.material = dark ? this.shadowEyeMaterial : this.eyeMaterial
    // In colour, the silhouette becomes the dark backing card every cut-paper piece has, glued behind and dropped a little.
    rig.dark.material = dark ? this.darkMaterial : this.backingMaterial
    if (dark) rig.dark.position.set(0, 0, CREATURE_DEPTH / 2 + 0.06)
    else rig.dark.position.set(0, -BACKING_DROP / s, -CREATURE_DEPTH * 1.6)
    g.visible = true
  }

  private updateCreatures(): void {
    const c = this.controller
    let r = 0
    const waking: Waking | null = c.waking
    if (waking) {
      const rig = this.rigs[r++]
      this.assign(rig, waking.kind, waking.paper)
      this.poseRig(rig, waking.pose)
      this.darkMaterial.opacity = waking.fillIn
    }
    for (let i = 0; i < c.companions.length && r < RIGS; i++) {
      const companion: Companion = c.companions[i]
      const rig = this.rigs[r++]
      this.assign(rig, companion.kind, companion.paper)
      this.poseRig(rig, companion.pose)
    }
    for (; r < RIGS; r++) this.rigs[r].group.visible = false
  }

  private updateRings(): void {
    const c = this.controller
    let n = 0
    const sleeper = c.sleeper
    if (sleeper) {
      const snore = sleeper.built.def.snore
      const enter = c.enterProgress()
      const color = sleeper.kind === 'dragon' ? SMOKE : RING_INK
      for (let i = 0; i < sleeper.ringCount && n < MAX_RINGS; i++) n = this.writeRing(n, sleeper.rings[i], snore.x, snore.y, 0.09, 1, color, enter, 1, SLEEP_RING_GROW)
    }
    for (const companion of c.companions) {
      if (companion.ringCount === 0) continue
      const built = buildCreature(companion.kind)
      const pose = companion.pose
      const snore = built.def.snore
      const s = pose.scale
      const ox = pose.x + (snore.x - built.center.x) * s * pose.facing
      const oy = pose.y + (snore.y - built.center.y) * s
      for (let i = 0; i < companion.ringCount && n < MAX_RINGS; i++) n = this.writeRing(n, companion.rings[i], ox, oy, pose.z + 0.5, s * 1.6, companion.kind === 'dragon' ? SMOKE : SKY_RING, 1, pose.facing)
    }
    this.rings.count = n
    this.rings.instanceMatrix.needsUpdate = true
    if (this.rings.instanceColor) this.rings.instanceColor.needsUpdate = true
    this.ringAlpha.needsUpdate = true
  }

  private writeRing(n: number, ring: Ring, ox: number, oy: number, z: number, scale: number, color: THREE.Color, alpha: number, facing = 1, grow = 1): number {
    const r = ring.r * scale * grow
    this.m.makeScale(r, r, 1).setPosition(ox + ring.x * scale * facing, oy + ring.y * scale, z)
    this.rings.setMatrixAt(n, this.m)
    this.rings.setColorAt(n, color)
    this.ringAlpha.setX(n, ring.alpha * alpha)
    return n + 1
  }

  // --- motes, stars, guidance -----------------------------------------------------

  private updateMotes(t: number, flicker: number): void {
    const count = this.motes.count
    if (count === 0) return
    const s = this.moteSeeds
    for (let i = 0; i < count; i++) {
      const a = s[i * 4]
      const b = s[i * 4 + 1]
      const cc = s[i * 4 + 2]
      const d = s[i * 4 + 3]
      // Motes drift through the cone of light between the lamp and the screen.
      const z = 8 + ((a * 50 + t * (0.6 + d)) % 50)
      const spread = (z / LAMP.z) * 0.6 + 0.25
      const x = LAMP.x + (b - 0.5) * 44 * (1 - spread * 0.4) + Math.sin(t * 0.3 + i) * 1.5
      const y = LAMP.y + (cc - 0.5) * 22 + Math.sin(t * 0.45 + i * 1.7) * 1.2
      this.m.makeScale(1, 1, 1).setPosition(x, y, z)
      this.motes.setMatrixAt(i, this.m)
      this.moteAlpha.setX(i, (0.25 + 0.35 * Math.sin(t * (1 + d) + i)) * flicker * Math.min(1, (LAMP.z - z) / 12))
    }
    this.motes.instanceMatrix.needsUpdate = true
    this.moteAlpha.needsUpdate = true
  }

  private twinkled = false
  private burstsShown = true

  private updateTwinkles(t: number): void {
    const animate = this.governor.settings.twinkle
    const a = this.twinkleAnchors
    const count = a.length / 4
    let dirty = false
    if (animate || !this.twinkled) {
      for (let i = 0; i < count; i++) {
        const tw = animate ? 0.75 + 0.25 * Math.sin(t * (1.3 + (i % 5) * 0.37) + i * 2.1) : 1
        const size = a[i * 4 + 3] * tw
        this.m.makeScale(size, size, 1).setPosition(a[i * 4], a[i * 4 + 1], a[i * 4 + 2])
        this.twinkles.setMatrixAt(i, this.m)
        this.twinkleAlpha.setX(i, 0.55 + 0.45 * tw)
      }
      this.twinkled = !animate
      dirty = true
    }
    // The bursts play on every tier: they answer the child.
    const c = this.controller
    const sparkAge = c.t - c.spark.at
    const wakeAge = c.t - c.wakeBurst.at
    const sparking = sparkAge >= 0 && sparkAge <= SPARK_S
    const waking = wakeAge >= 0 && wakeAge <= WAKE_BURST_S
    if (sparking || waking || this.burstsShown) {
      // A tap on nothing in particular makes a little burst of stars: fanning up out of
      // the floor, in shadow ink on the lit screen, and in a ring anywhere else.
      const spark = c.spark
      if (sparking && spark.surface !== this.sparkPainted && (spark.surface === 'screen' || this.sparkPainted === 'screen')) {
        const color = spark.surface === 'screen' ? this.sparkInk : this.sparkCream
        for (let k = 0; k < SPARK_STARS; k++) this.twinkles.setColorAt(count + k, color)
        if (this.twinkles.instanceColor) this.twinkles.instanceColor.needsUpdate = true
      }
      if (sparking) this.sparkPainted = spark.surface
      const up = spark.surface === 'floor'
      for (let k = 0; k < SPARK_STARS; k++) {
        const angle = up ? ((k + 0.5) / SPARK_STARS) * Math.PI : (k / SPARK_STARS) * Math.PI * 2 + 0.4
        const reach = 1.5 + sparkAge * 7
        const size = 0.9 * (1 - sparkAge / SPARK_S) + 0.2
        const x = spark.x + Math.cos(angle) * reach
        const y = spark.y + (up ? 0.8 : 0) + Math.sin(angle) * reach
        this.setBurstStar(count + k, sparking, x, y, spark.z + 0.5, size, 1 - sparkAge / SPARK_S)
      }
      // The shadow comes alive: gold stars spring out of it and past the edge of its outline.
      const burst = c.wakeBurst
      const u = 1 - (1 - Math.min(1, wakeAge / WAKE_BURST_S)) ** 3
      for (let k = 0; k < WAKE_STARS; k++) {
        const angle = (k / WAKE_STARS) * Math.PI * 2 + (k % 2) * 0.2
        const out = 0.55 + (0.75 + (k % 3) * 0.12) * u
        const size = (k % 2 ? 1.5 : 2.1) * (1 - 0.55 * u)
        const x = burst.x + Math.cos(angle) * burst.rx * out
        const y = burst.y + Math.sin(angle) * burst.ry * out
        this.setBurstStar(count + SPARK_STARS + k, waking, x, y, 0.8, size, 1 - u ** 3, (k % 2 ? -1 : 1) * u * 1.6)
      }
      this.burstsShown = sparking || waking
      dirty = true
    }
    if (!dirty) return
    this.twinkles.instanceMatrix.needsUpdate = true
    this.twinkleAlpha.needsUpdate = true
  }

  private setBurstStar(i: number, shown: boolean, x: number, y: number, z: number, size: number, alpha: number, spin = 0): void {
    if (shown) this.m.makeRotationZ(spin).scale(burstScale.set(size, size, 1)).setPosition(x, y, z)
    else this.m.makeScale(0, 0, 0)
    this.twinkles.setMatrixAt(i, this.m)
    this.twinkleAlpha.setX(i, shown ? alpha : 0)
  }

  private updateGuidance(): void {
    const c = this.controller
    const pose = c.demoPose
    const demo = c.demo
    if (!demo || pose.opacity <= 0.001) {
      this.hand.visible = false
      this.ghost.visible = false
      return
    }
    this.hand.visible = true
    this.handMaterial.opacity = pose.opacity * 0.92
    const press = 1 - pose.press * 0.08
    this.hand.scale.set(press * 1.7, press * 1.7, 1)
    this.hand.position.set(pose.hand.x, pose.hand.y, pose.hand.z)
    const kind = c.shapes[demo.index].kind
    this.ghost.geometry = this.cardFor(kind)
    this.ghost.visible = pose.ghostOpacity > 0.01
    this.ghostMaterial.opacity = pose.ghostOpacity * 0.55
    this.e.set(0, 0, pose.ghost.angle, 'YXZ')
    this.q.setFromEuler(this.e)
    this.v.set(pose.ghost.x, PIN_HEIGHT + pose.ghost.lift, pose.ghost.z + 0.2)
    this.s.set(1, 1, 1)
    this.ghost.matrix.compose(this.v, this.q, this.s)
    this.ghost.matrixWorldNeedsUpdate = true
  }

  private cardFor(kind: ShapeKind): THREE.BufferGeometry {
    const cached = this.cardGeometries.get(kind)
    if (cached) return cached
    const spec = SHAPES[kind]
    const color = paper(spec.color)
    const card = paintCard(cardGeometry(spec.outline, CARD_DEPTH), color, color, color.clone().multiplyScalar(0.78))
    // The brass pin the card turns on.
    const pin = paintCard(cardGeometry(circleOutline(0, 0, 0.42, 12), 0.2, 0.04), paper(PALETTE.brass), paper(PALETTE.brass), paper(PALETTE.brassDark))
    pin.translate(0, 0, CARD_DEPTH / 2 + 0.1)
    const geometry = mergeTwo(card, pin)
    this.cardGeometries.set(kind, geometry)
    return geometry
  }

  // --- grown-up overlay ------------------------------------------------------------

  private drawOverlay(): void {
    const canvas = this.overlay!
    const g = canvas.getContext('2d')
    if (!g) return
    const w = canvas.width
    const h = canvas.height
    g.clearRect(0, 0, w, h)
    g.fillStyle = 'rgba(12,10,30,0.72)'
    g.fillRect(0, 0, w, h)
    const bars = Math.min(this.intervals.size, 110)
    const barW = (w - 60) / 110
    for (let i = 0; i < bars; i++) {
      const ms = this.intervals.recent(i)
      const work = this.cpu.recent(i)
      const x = w - 12 - (i + 1) * barW
      const bh = Math.min(h - 12, ms * 2.2)
      g.fillStyle = ms <= 17.5 ? '#6fd08c' : ms <= 34 ? '#f1c050' : '#ef6a5a'
      g.fillRect(x, h - 6 - bh, barW - 1, bh)
      g.fillStyle = 'rgba(255,255,255,0.8)'
      g.fillRect(x, h - 6 - Math.min(h - 12, work * 2.2), barW - 1, 2)
    }
    // A 16.7 ms guide line, then the tier as four squares (filled ones are the tiers stepped down).
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.fillRect(40, h - 6 - 16.7 * 2.2, w - 52, 1)
    for (let i = 0; i < TIERS.length; i++) {
      g.fillStyle = i <= this.governor.tier ? (this.governor.forced ? '#8fb4ff' : '#ffffff') : 'rgba(255,255,255,0.18)'
      g.fillRect(8, 8 + i * 28, 22, 22)
    }
  }
}

const scratchOuter = new Float32Array(RING_PTS * 2)

const umbraCache = new Map<ShapeKind, number[]>()

/** A fixed triangulation of a shape's outline; a lamp projection never folds a card, so it stays valid. */
function umbraTriangles(kind: ShapeKind): number[] {
  const cached = umbraCache.get(kind)
  if (cached) return cached
  const contour = SHAPES[kind].outline.map((p) => new THREE.Vector2(p.x, p.y))
  const faces = THREE.ShapeUtils.triangulateShape(contour, [])
  const out: number[] = []
  for (const [a, b, c] of faces) out.push(a, b, c)
  while (out.length < (RING_PTS - 2) * 3) out.push(0, 0, 0)
  umbraCache.set(kind, out)
  return out
}

function circleOutline(cx: number, cy: number, r: number, n: number): Point[] {
  const out: Point[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return out
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const names = ['position', 'normal', 'uv', 'color'] as const
  const out = new THREE.BufferGeometry()
  for (const name of names) {
    const aa = a.getAttribute(name)
    const bb = b.getAttribute(name)
    if (!aa || !bb) continue
    const data = new Float32Array(aa.array.length + bb.array.length)
    data.set(aa.array as Float32Array, 0)
    data.set(bb.array as Float32Array, aa.array.length)
    out.setAttribute(name, new THREE.BufferAttribute(data, aa.itemSize))
  }
  a.dispose()
  b.dispose()
  return out
}

/** A paper hand pointing up with its index finger (fingertip at the origin), a curled fist, a thumb and a cuff below. */
function handOutline(): Point[] {
  const pts: [number, number][] = [
    [0, -0.05],
    [0.42, 0.12],
    [0.6, 0.55],
    [0.62, 2.9],
    [1.15, 3.0],
    [1.8, 3.1],
    [2.1, 3.55],
    [1.9, 4.0],
    [2.2, 4.45],
    [2.05, 4.95],
    [2.25, 5.4],
    [1.95, 5.95],
    [1.65, 6.35],
    [1.7, 7.7],
    [-1.4, 7.7],
    [-1.35, 6.35],
    [-1.8, 6.05],
    [-2.3, 5.45],
    [-2.5, 4.75],
    [-2.3, 4.1],
    [-1.8, 3.7],
    [-1.15, 3.55],
    [-0.62, 3.2],
    [-0.6, 0.55],
    [-0.42, 0.12],
  ]
  return chaikinClosed(
    pts.map(([x, y]) => ({ x, y: -y })),
    2,
  )
}

/** The outline pushed out along its normals by `d` (either winding). */
function offsetOutline(points: readonly Point[], d: number): Point[] {
  const n = points.length
  const sign = polygonArea(points) >= 0 ? 1 : -1
  return points.map((p, i) => {
    const a = points[(i + n - 1) % n]
    const b = points[(i + 1) % n]
    const tx = b.x - a.x
    const ty = b.y - a.y
    const len = Math.hypot(tx, ty) || 1
    return { x: p.x + ((ty / len) * d) * sign, y: p.y - ((tx / len) * d) * sign }
  })
}

/** The ghost hand: warm paper with an ink edge (so it reads on the cream screen and pale cards) and a blue cuff. */
function handGeometry(): THREE.BufferGeometry {
  const hand = handOutline()
  const edge = paintFlat(flatGeometry(offsetOutline(hand, 0.3)), paper(PALETTE.ink))
  edge.translate(0.12, -0.12, -0.02)
  const face = paintFlat(flatGeometry(hand), paper('#fff4e0'))
  const cuff = paintFlat(
    flatGeometry([
      { x: -1.38, y: -6.55 },
      { x: 1.68, y: -6.55 },
      { x: 1.7, y: -7.7 },
      { x: -1.4, y: -7.7 },
    ]),
    paper('#b9c6ff'),
  )
  cuff.translate(0, 0, 0.01)
  return mergeTwo(mergeTwo(edge, face), cuff)
}
