// Tiny Island: a wooden toy village set on a little island you can turn.
// Real 3D with three.js: a low-poly wooden-toy diorama on a turntable, soft
// pastels, a warm rim light from the sun behind. The sea, the island and every
// toy are rendered to our own WebGL canvas and copied onto the stage; the sky,
// the sun, the stars and the window glow are painted in 2D around it.

import * as THREE from 'three'
import { clamp, damp, ease, lerp, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import * as M from './models.ts'
import { sharedUniforms, toyMaterial } from './shade.ts'

type Kind = 'cottage' | 'tree' | 'sheep' | 'stones' | 'well' | 'bridge' | 'windmill' | 'jetty' | 'lighthouse'

interface Def {
  count: number
  // Footprint radius, height, size in the tray, blob-shadow radius.
  r: number
  h: number
  tray: number
  shadow: number
  // Pentatonic step of the soft chime when it is set down.
  note: number
  // How far in front of its middle the door is (0: no door).
  door: number
}

const KINDS: Kind[] = ['cottage', 'tree', 'sheep', 'stones', 'well', 'bridge', 'windmill', 'jetty', 'lighthouse']
const DEFS: Record<Kind, Def> = {
  cottage: { count: 3, r: 0.62, h: 1.05, tray: 0.72, shadow: 0.8, note: 0, door: 0.66 },
  tree: { count: 4, r: 0.34, h: 1.3, tray: 0.72, shadow: 0.46, note: 2, door: 0 },
  sheep: { count: 3, r: 0.3, h: 0.55, tray: 1.0, shadow: 0.34, note: 4, door: 0 },
  stones: { count: 5, r: 0.5, h: 0.08, tray: 1.0, shadow: 0, note: 5, door: 0 },
  well: { count: 1, r: 0.42, h: 0.95, tray: 0.85, shadow: 0.5, note: 3, door: 0.6 },
  bridge: { count: 1, r: 0.62, h: 0.5, tray: 0.6, shadow: 0, note: 1, door: 0 },
  windmill: { count: 1, r: 0.52, h: 1.7, tray: 0.55, shadow: 0.66, note: -1, door: 0.62 },
  jetty: { count: 1, r: 0.4, h: 0.5, tray: 0.46, shadow: 0, note: -2, door: 0 },
  lighthouse: { count: 1, r: 0.52, h: 2.3, tray: 0.48, shadow: 0.7, note: -3, door: 0.72 },
}

const DEG = Math.PI / 180
const ELEV = 27 * DEG
const DIST = 24
const FOV = 26
const LOOK_Y = -0.1
const SEA_FAR = -9.5
const GL_SCALE = 1.5

const TRAY_YAW = 0.5
const TRAY_DEPTH = 16
const TRAY_SCREEN_Y = 736
const SLOT_X0 = 110
const SLOT_DX = 120
const TRAY_PICK_Y = 618
const TRAY_DROP_Y = 652
// The carried toy rides this far above the fingertip so the hand never hides it.
const AIM = 44
const PLACE_R = 3.9
// A toy let go anywhere off the tray comes down on the nearest bit of island.
const SNAP_R = 40
const JETTY_R = 4.2
const LINK = 1.8

const SUN_X = 968
const SUN_UP = 84

interface Fly {
  from: THREE.Vector3
  to: () => THREE.Vector3
  yawFrom: number
  yawTo: () => number
  scaleFrom: number
  scaleTo: number
  t: number
  dur: number
  arc: number
  done: () => void
}

interface Piece {
  id: number
  kind: Kind
  variant: number
  def: Def
  group: THREE.Group
  extra: THREE.Mesh | null
  state: 'tray' | 'held' | 'fly' | 'placed'
  // Island-local while placed.
  x: number
  z: number
  yaw: number
  // Where it was picked up from, for a forgiving return.
  from: 'tray' | 'island'
  ox: number
  oz: number
  oyaw: number
  // World pose while in the tray, in the hand or in the air.
  w: THREE.Vector3
  wyaw: number
  scale: number
  squash: Spring
  tilt: number
  lift: number
  pointer: Pointer | null
  fly: Fly | null
  // Landing spot shown under a carried toy, island-local (null: none).
  spot: Spot | null
  // Life once placed.
  spin: number
  spinVel: number
  boatA: number
  moored: boolean
  tx: number
  tz: number
  wait: number
  walk: number
  gait: number
  sleep: number
}

interface Spot {
  x: number
  z: number
  yaw: number
}

interface Node {
  x: number
  z: number
  // Piece id of the building whose door this is, or -1.
  door: number
  indoor: boolean
}

interface Gnome {
  home: Piece
  mesh: THREE.Mesh
  state: 'in' | 'out' | 'pause' | 'visit'
  x: number
  z: number
  yaw: number
  path: { x: number; z: number }[]
  back: { x: number; z: number }[]
  at: number
  wait: number
  homeward: boolean
  hideAtEnd: boolean
  show: number
  gait: number
  layout: number
}

interface Puff {
  x: number
  y: number
  z: number
  age: number
  life: number
  size: number
}

interface Ripple {
  x: number
  z: number
  age: number
  life: number
  size: number
}

type Touch =
  | { kind: 'sun'; grab: number; moved: boolean }
  | { kind: 'carry'; piece: Piece; moved: boolean }
  | { kind: 'turn'; moved: boolean; place: { x: number; z: number } | null }

type RGB = [number, number, number]
const mix3 = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const css = (c: RGB, a = 1): string => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`
const sstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const rotY = (x: number, z: number, a: number): [number, number] => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [x * c + z * s, -x * s + z * c]
}
const wrapPi = (a: number): number => {
  let r = (a + Math.PI) % TAU
  if (r < 0) r += TAU
  return r - Math.PI
}

const SKY = {
  dayTop: [170, 219, 240] as RGB,
  dayLow: [254, 238, 216] as RGB,
  setTop: [186, 168, 216] as RGB,
  setLow: [255, 198, 160] as RGB,
  nightTop: [34, 40, 90] as RGB,
  nightLow: [110, 96, 152] as RGB,
}

const LIGHT = {
  day: { sky: [0.55, 0.61, 0.7], ground: [0.5, 0.44, 0.44], key: [0.5, 0.45, 0.36], rim: [0.52, 0.34, 0.17] },
  set: { sky: [0.58, 0.5, 0.58], ground: [0.55, 0.42, 0.4], key: [0.38, 0.28, 0.22], rim: [0.6, 0.31, 0.13] },
  night: { sky: [0.4, 0.4, 0.57], ground: [0.33, 0.29, 0.43], key: [0.12, 0.13, 0.2], rim: [0.2, 0.18, 0.3] },
} satisfies Record<string, Record<string, RGB>>

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  M.reseed(20260930)

  // ------------------------------------------------------------ renderer
  // Sharp and antialiased on a real GPU; plain and smaller where WebGL is
  // drawn in software (the screenshot tool), which would otherwise crawl.
  let glCanvas = document.createElement('canvas')
  let renderer: THREE.WebGLRenderer | null = null
  // Without a GPU the copy to the stage is the slow part, so there the 3D layer
  // is redrawn only a couple of times a second and a kept copy is shown between.
  let kept: HTMLCanvasElement | null = null
  let keptAt = -1e9
  const makeRenderer = (canvas: HTMLCanvasElement, fine: boolean): THREE.WebGLRenderer => {
    const r = new THREE.WebGLRenderer({ canvas, antialias: fine, alpha: true, powerPreference: 'high-performance' })
    const scale = fine ? GL_SCALE : 1
    r.setPixelRatio(1)
    r.setSize(Math.round(W * scale), Math.round(H * scale), false)
    r.setClearColor(0x000000, 0)
    r.autoClear = false
    r.info.autoReset = false
    return r
  }
  try {
    renderer = makeRenderer(glCanvas, true)
    const gl = renderer.getContext()
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    if (/swiftshader|llvmpipe|software/i.test(name)) {
      renderer.dispose()
      renderer.forceContextLoss()
      glCanvas = document.createElement('canvas')
      renderer = makeRenderer(glCanvas, false)
      kept = document.createElement('canvas')
      kept.width = W
      kept.height = H
    }
  } catch {
    renderer = null
  }

  const camera = new THREE.PerspectiveCamera(FOV, W / H, 2, 90)
  camera.position.set(0, LOOK_Y + DIST * Math.sin(ELEV), DIST * Math.cos(ELEV))
  camera.lookAt(0, LOOK_Y, 0)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)

  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const tmp = new THREE.Vector3()
  const toScreen = (x: number, y: number, z: number): { x: number; y: number } => {
    tmp.set(x, y, z).project(camera)
    return { x: ((tmp.x + 1) / 2) * W, y: ((1 - tmp.y) / 2) * H }
  }
  const setRay = (sx: number, sy: number): THREE.Ray => {
    ndc.set((sx / W) * 2 - 1, -(sy / H) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    return raycaster.ray
  }
  const horizonY = toScreen(0, 0, SEA_FAR).y
  const SUN_DOWN = horizonY + 20

  // ------------------------------------------------------------ scene
  const shared = sharedUniforms()
  const toyMat = toyMaterial(shared, 'toy')
  const seaMat = toyMaterial(shared, 'sea', SEA_FAR)
  const puffMat = toyMaterial(shared, 'plain')
  const disposables: { dispose(): void }[] = [toyMat, seaMat, puffMat]
  const keep = <T extends { dispose(): void }>(thing: T): T => {
    disposables.push(thing)
    return thing
  }

  const scene = new THREE.Scene()
  const topScene = new THREE.Scene()
  const isle = new THREE.Group()
  scene.add(isle)
  scene.add(new THREE.Mesh(keep(M.sea(SEA_FAR, 10, 26)), seaMat))
  const isleMesh = new THREE.Mesh(keep(M.island()), toyMat)
  isle.add(isleMesh)

  // The tray floats in front, level, at a fixed distance from the eye.
  const trayRay = setRay(W / 2, TRAY_SCREEN_Y)
  const trayAt = trayRay.origin.clone().addScaledVector(trayRay.direction, TRAY_DEPTH / trayRay.direction.dot(forward))
  const pxTray = toScreen(trayAt.x + 1, trayAt.y, trayAt.z).x - W / 2
  const slotX = KINDS.map((_, i) => (SLOT_X0 + i * SLOT_DX - W / 2) / pxTray)
  const trayMesh = new THREE.Mesh(keep(M.tray(1130 / pxTray, 1.7, slotX)), toyMat)
  trayMesh.position.copy(trayAt)
  scene.add(trayMesh)

  // Blob shadows, one draw call for all of them.
  const SHADOWS = 40
  const shadowGeo = keep(new THREE.CircleGeometry(1, 16))
  shadowGeo.rotateX(-Math.PI / 2)
  const shadowMat = keep(new THREE.MeshBasicMaterial({ color: 0x3a4468, transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))
  const shadows = new THREE.InstancedMesh(shadowGeo, shadowMat, SHADOWS)
  shadows.frustumCulled = false
  scene.add(shadows)

  // Adds light without touching the canvas's own alpha, so a glow in front of
  // the painted sky brightens it instead of punching a dark hole in it.
  const LIGHT_ONLY = {
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  } as const

  // Rings on the water.
  const RIPPLES = 14
  const rippleGeo = keep(new THREE.RingGeometry(0.93, 1, 28))
  rippleGeo.rotateX(-Math.PI / 2)
  const rippleMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, ...LIGHT_ONLY }))
  const rippleMesh = new THREE.InstancedMesh(rippleGeo, rippleMat, RIPPLES)
  rippleMesh.frustumCulled = false
  rippleMesh.setColorAt(0, new THREE.Color(0, 0, 0))
  scene.add(rippleMesh)
  const ripples: Ripple[] = []

  // Chimney smoke: little faceted puffs.
  const PUFFS = 18
  const puffMesh = new THREE.InstancedMesh(keep(M.puff()), puffMat, PUFFS)
  puffMesh.frustumCulled = false
  scene.add(puffMesh)
  const puffs: Puff[] = []

  // The lighthouse beam: a soft cone that fades along its length.
  const beamGeo = keep(new THREE.CylinderGeometry(1.3, 0.08, 7.5, 12, 1, true))
  beamGeo.translate(0, 3.75, 0)
  beamGeo.rotateZ(-Math.PI / 2)
  {
    const p = beamGeo.getAttribute('position')
    const colors: number[] = []
    for (let i = 0; i < p.count; i++) {
      const f = 1 - clamp(p.getX(i) / 7.5, 0, 1)
      colors.push(0.16 * f * f, 0.13 * f * f, 0.07 * f * f)
    }
    beamGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  }
  const beamMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, ...LIGHT_ONLY }))
  const beam = new THREE.Mesh(beamGeo, beamMat)
  beam.visible = false
  beam.rotation.order = 'YXZ'
  scene.add(beam)

  // ------------------------------------------------------------ state
  let theta = 0.5
  let angVel = 0
  let lastTick = Math.floor(theta / (15 * DEG))
  let lastTickAt = -1
  let lapAt = 0
  let idleLapAt = 9
  let lastTouch = 0
  let hintAt = 6
  let hintSlot = 0
  let everPlaced = false
  let layout = 1
  let sun = 1
  let sunTarget = 1
  let sunStep = 4
  let sunPulse = 0
  let beamAng = 0
  let chosen: Piece | null = null
  const touches = new Map<number, Touch>()

  const pieces: Piece[] = []
  const slots: Piece[][] = KINDS.map(() => [])

  const localToWorld = (lx: number, ly: number, lz: number, out: THREE.Vector3): THREE.Vector3 => {
    const [x, z] = rotY(lx, lz, theta)
    return out.set(x, ly, z)
  }
  const worldToLocal = (wx: number, wz: number): [number, number] => rotY(wx, wz, -theta)

  const groundY = (kind: Kind, x: number, z: number): number => (kind === 'jetty' ? 0 : M.groundH(x, z) - 0.01)

  const trayHome = (p: Piece, out: THREE.Vector3): THREE.Vector3 => {
    const s = KINDS.indexOf(p.kind)
    const j = Math.min(2, Math.max(0, slots[s]!.indexOf(p)))
    // The jetty is all length, so it sits further back to stay on its mat.
    const back = p.kind === 'jetty' ? 0.42 : 0
    return out.set(trayAt.x + slotX[s]! + 0.17 * j - back * 0.5, trayAt.y + 0.012, trayAt.z + 0.05 - 0.36 * j - back)
  }

  const geoOf = (kind: Kind, variant: number): THREE.BufferGeometry => {
    if (kind === 'cottage') return M.cottage(variant)
    if (kind === 'tree') return M.tree(variant)
    if (kind === 'sheep') return M.sheep()
    if (kind === 'stones') return M.stones()
    if (kind === 'well') return M.well()
    if (kind === 'bridge') return M.bridge()
    if (kind === 'windmill') return M.windmill()
    if (kind === 'jetty') return M.jetty()
    return M.lighthouse()
  }

  for (const kind of KINDS) {
    const def = DEFS[kind]
    for (let i = 0; i < def.count; i++) {
      const group = new THREE.Group()
      group.rotation.order = 'YXZ'
      group.add(new THREE.Mesh(keep(geoOf(kind, i)), toyMat))
      let extra: THREE.Mesh | null = null
      if (kind === 'windmill') {
        extra = new THREE.Mesh(keep(M.blades()), toyMat)
        extra.position.copy(M.HUB)
        group.add(extra)
      } else if (kind === 'jetty') {
        extra = new THREE.Mesh(keep(M.boat()), toyMat)
        group.add(extra)
      }
      const piece: Piece = {
        id: pieces.length,
        kind,
        variant: i,
        def,
        group,
        extra,
        state: 'tray',
        x: 0,
        z: 0,
        yaw: 0,
        from: 'tray',
        ox: 0,
        oz: 0,
        oyaw: 0,
        w: new THREE.Vector3(),
        wyaw: TRAY_YAW,
        scale: def.tray,
        squash: spring(1, 260, 13),
        tilt: 0,
        lift: 0,
        pointer: null,
        fly: null,
        spot: null,
        spin: i,
        spinVel: 0,
        boatA: 0,
        moored: true,
        tx: 0,
        tz: 0,
        wait: 0,
        walk: 0,
        gait: 0,
        sleep: 0,
      }
      pieces.push(piece)
      slots[KINDS.indexOf(kind)]!.push(piece)
      scene.add(group)
    }
  }
  for (const p of pieces) trayHome(p, p.w)

  const gnomes: Gnome[] = pieces
    .filter((p) => p.kind === 'cottage')
    .map((home) => {
      const mesh = new THREE.Mesh(keep(M.gnome(home.variant)), toyMat)
      mesh.visible = false
      mesh.rotation.order = 'YXZ'
      isle.add(mesh)
      return { home, mesh, state: 'in', x: 0, z: 0, yaw: 0, path: [], back: [], at: 0, wait: 3 + home.variant * 2, homeward: false, hideAtEnd: false, show: 0, gait: 0, layout: 0 }
    })

  const placed = (): Piece[] => pieces.filter((p) => p.state === 'placed')
  const night = (): number => 1 - sstep(0.04, 0.6, sun)
  const sunset = (): number => Math.exp(-(((sun - 0.26) / 0.22) ** 2))

  // ------------------------------------------------------------ sounds
  const soundPick = (): void => {
    sfx.tone({ freq: 430, to: 600, dur: 0.06, type: 'triangle', vol: 0.09 })
    sfx.noise({ dur: 0.025, freq: 2200, vol: 0.03, filter: 'bandpass' })
  }
  const soundWood = (strength = 1): void => {
    sfx.tone({ freq: 200, to: 120, dur: 0.11, type: 'triangle', vol: 0.15 * strength })
    sfx.noise({ dur: 0.04, freq: 1400, vol: 0.05 * strength, filter: 'bandpass', q: 1.4 })
  }
  const soundChime = (step: number, delay = 0.07): void => {
    sfx.tone({ freq: sfx.scale(step), dur: 0.9, type: 'sine', vol: 0.06, delay, attack: 0.01 })
    sfx.tone({ freq: sfx.scale(step) * 2, dur: 0.4, type: 'sine', vol: 0.015, delay })
  }
  const soundDrip = (): void => sfx.tone({ freq: 600 + Math.random() * 120, to: 1250, dur: 0.07, type: 'sine', vol: 0.07 })
  const soundLap = (vol: number, dur = 0.5): void => sfx.noise({ dur, freq: 520, to: 240, vol, filter: 'bandpass', q: 0.8 })

  // ------------------------------------------------------------ geometry of touch
  const viewPlanePoint = new THREE.Vector3(0, 0.6, 0)

  interface Ground {
    wx: number
    wy: number
    wz: number
    lx: number
    lz: number
    r: number
  }
  const castGround = (sx: number, sy: number): Ground => {
    const ray = setRay(sx, Math.max(sy, horizonY + 14))
    let y = 0.4
    let wx = 0
    let wz = 0
    let lx = 0
    let lz = 0
    let r = 0
    for (let i = 0; i < 5; i++) {
      const t = (y - ray.origin.y) / ray.direction.y
      wx = ray.origin.x + ray.direction.x * t
      wz = ray.origin.z + ray.direction.z * t
      ;[lx, lz] = worldToLocal(wx, wz)
      r = Math.hypot(lx, lz)
      y = r < M.ISLE_R ? M.groundH(lx, lz) : r < M.RIM_R ? M.RIM_TOP : 0
    }
    return { wx, wy: y, wz, lx, lz, r }
  }

  // Where a toy dropped at this island-local point would come to rest.
  const resolve = (p: Piece, lx: number, lz: number): Spot => {
    if (p.kind === 'jetty') {
      let a = Math.atan2(lx, lz)
      if (Math.hypot(lx, lz) < 0.5) a = Math.atan2(...worldToLocal(0, 1))
      return { x: Math.sin(a) * JETTY_R, z: Math.cos(a) * JETTY_R, yaw: a }
    }
    let x = lx
    let z = lz
    const yaw = p.wyaw - theta
    const clampR = (): void => {
      const r = Math.hypot(x, z)
      const max = PLACE_R - (p.kind === 'bridge' ? 0.4 : 0)
      if (r > max) {
        x *= max / r
        z *= max / r
      }
    }
    clampR()
    if (p.kind === 'bridge') {
      const b = M.brookNearest(x, z)
      if (b.d < 1.1 && b.u > 0.12) {
        const u = clamp(b.u, 0.22, 0.78)
        const at = M.BROOK[Math.round(u * (M.BROOK.length - 1))]!
        const near = M.brookNearest(at.x, at.z)
        // The bridge runs along its own x; lay that across the water.
        return { x: at.x, z: at.z, yaw: Math.atan2(-near.tx, -near.tz) }
      }
    }
    if (p.kind === 'sheep') return { x, z, yaw }
    const others = placed().filter((o) => o !== p && o.kind !== 'sheep' && o.kind !== 'jetty')
    for (let iter = 0; iter < 8; iter++) {
      for (const o of others) {
        const min = (p.def.r + o.def.r) * 0.92
        const dx = x - o.x
        const dz = z - o.z
        const d = Math.hypot(dx, dz)
        if (d >= min) continue
        if (d < 0.001) {
          x += min
          continue
        }
        x = o.x + (dx / d) * min
        z = o.z + (dz / d) * min
      }
      if (p.kind !== 'stones' && p.kind !== 'bridge') {
        const b = M.brookNearest(x, z)
        const min = 0.3 + Math.min(p.def.r, 0.5) * 0.8
        if (b.d < min) {
          const nx = b.d > 0.001 ? (x - b.x) / b.d : -b.tz
          const nz = b.d > 0.001 ? (z - b.z) / b.d : b.tx
          x = b.x + nx * min
          z = b.z + nz * min
        }
      }
      clampR()
    }
    return { x, z, yaw }
  }

  const slotAt = (x: number, y: number): number => {
    if (y < TRAY_PICK_Y) return -1
    const i = Math.round((x - SLOT_X0) / SLOT_DX)
    if (i < 0 || i >= KINDS.length || Math.abs(x - (SLOT_X0 + i * SLOT_DX)) > 60) return -1
    return i
  }

  const world = new THREE.Vector3()
  const placedAt = (sx: number, sy: number): Piece | null => {
    let best: Piece | null = null
    let bestScore = 1e9
    for (const p of pieces) {
      if (p.state !== 'placed') continue
      const y = groundY(p.kind, p.x, p.z)
      localToWorld(p.x, y, p.z, world)
      const a = toScreen(world.x, world.y, world.z)
      const b = toScreen(world.x, world.y + p.def.h, world.z)
      const t = clamp((sy - a.y) / (b.y - a.y || 1), 0, 1)
      const d = Math.hypot(sx - lerp(a.x, b.x, t), sy - lerp(a.y, b.y, t))
      const reach = Math.max(46, p.def.r * 72)
      if (d > reach) continue
      const score = d / reach - world.z * 0.02
      if (score < bestScore) {
        bestScore = score
        best = p
      }
    }
    return best
  }

  // ------------------------------------------------------------ carrying
  const startFly = (p: Piece, to: () => THREE.Vector3, yawTo: () => number, scaleTo: number, dur: number, arc: number, done: () => void): void => {
    p.state = 'fly'
    p.pointer = null
    p.spot = null
    topScene.add(p.group)
    p.fly = { from: p.w.clone(), to, yawFrom: p.wyaw, yawTo, scaleFrom: p.scale, scaleTo, t: 0, dur, arc, done }
  }

  const lift = (p: Piece, pointer: Pointer): void => {
    if (chosen && chosen !== p) chosen = null
    if (p.state === 'placed') {
      p.from = 'island'
      p.ox = p.x
      p.oz = p.z
      p.oyaw = p.yaw
      localToWorld(p.x, groundY(p.kind, p.x, p.z), p.z, p.w)
      p.wyaw = p.yaw + theta
      layout++
    } else {
      p.from = 'tray'
      const list = slots[KINDS.indexOf(p.kind)]!
      list.splice(list.indexOf(p), 1)
    }
    p.state = 'held'
    p.pointer = pointer
    p.lift = 0
    p.tilt = 0
    p.fly = null
    p.squash.value = 1.16
    topScene.add(p.group)
    soundPick()
  }

  const settle = (p: Piece, spot: Spot, quiet = false): void => {
    p.state = 'placed'
    p.fly = null
    p.x = spot.x
    p.z = spot.z
    p.yaw = spot.yaw
    p.scale = 1
    p.tilt = 0
    p.squash.value = 0.7
    p.tx = spot.x
    p.tz = spot.z
    p.wait = 1.2
    p.sleep = 0
    isle.add(p.group)
    layout++
    everPlaced = true
    if (p.kind === 'stones') {
      // Stepping stones turn to point at whatever is nearest, so paths read as paths.
      let best = 3
      for (const n of nodes(p)) {
        const d = Math.hypot(n.x - p.x, n.z - p.z)
        if (d < best && d > 0.3) {
          best = d
          p.yaw = Math.atan2(-(n.z - p.z), n.x - p.x)
        }
      }
    }
    const y = groundY(p.kind, p.x, p.z)
    localToWorld(p.x, y, p.z, world)
    const at = toScreen(world.x, world.y, world.z)
    if (p.kind === 'stones') {
      sfx.tone({ freq: 880, to: 560, dur: 0.05, type: 'triangle', vol: quiet ? 0.05 : 0.1 })
      sfx.noise({ dur: 0.03, freq: 2600, vol: 0.03, filter: 'bandpass' })
    } else soundWood(quiet ? 0.5 : p.kind === 'sheep' ? 0.6 : 1)
    if (!quiet) soundChime(p.def.note)
    if (p.kind === 'jetty') {
      soundLap(0.05, 0.4)
      const [ex, ez] = rotY(0, M.JETTY_END, p.yaw)
      localToWorld(p.x + ex, 0, p.z + ez, world)
      addRipple(world.x, world.z, 1.3)
    } else if (!quiet) {
      const sandy = Math.hypot(p.x, p.z) > 3.7
      fx.burst(at.x, at.y, { count: 6, color: sandy ? ['#f3dfb6', '#fff6e0'] : ['#cfeec2', '#eaf7d8', '#f7c6d0'], speed: 90, life: 0.45, size: 6, gravity: 240, angle: -Math.PI / 2, spread: Math.PI * 0.9, drag: 0.9 })
    }
  }

  const toTray = (p: Piece): void => {
    const s = KINDS.indexOf(p.kind)
    slots[s]!.unshift(p)
    const home = new THREE.Vector3()
    startFly(
      p,
      () => trayHome(p, home),
      () => TRAY_YAW,
      p.def.tray,
      0.3,
      0.5,
      () => {
        p.state = 'tray'
        p.fly = null
        p.wyaw = TRAY_YAW
        p.squash.value = 0.82
        scene.add(p.group)
        soundWood(0.45)
      },
    )
  }

  const flyToSpot = (p: Piece, spot: Spot, dur: number, arc: number, quiet = false): void => {
    const to = new THREE.Vector3()
    startFly(
      p,
      () => localToWorld(spot.x, groundY(p.kind, spot.x, spot.z), spot.z, to),
      () => spot.yaw + theta,
      1,
      dur,
      arc,
      () => settle(p, spot, quiet),
    )
  }

  const drop = (p: Piece, pointer: Pointer): void => {
    if (chosen === p) chosen = null
    if (pointer.y > TRAY_DROP_Y) {
      toTray(p)
      return
    }
    const g = castGround(pointer.x, pointer.y - AIM * p.lift)
    if (g.r <= SNAP_R) {
      const spot = resolve(p, g.lx, g.lz)
      localToWorld(spot.x, groundY(p.kind, spot.x, spot.z), spot.z, world)
      flyToSpot(p, spot, clamp(world.distanceTo(p.w) / 12, 0.12, 0.3), 0.05)
    } else if (p.from === 'island') flyToSpot(p, { x: p.ox, z: p.oz, yaw: p.oyaw }, 0.4, 0.8, true)
    else toTray(p)
  }

  // ------------------------------------------------------------ the folk and the paths
  const doorOf = (p: Piece): { x: number; z: number } => {
    const [dx, dz] = rotY(0, p.def.door, p.yaw)
    return { x: p.x + dx, z: p.z + dz }
  }

  const nodes = (skip: Piece | null = null): Node[] => {
    const out: Node[] = []
    for (const p of pieces) {
      if (p.state !== 'placed' || p === skip) continue
      if (p.def.door > 0) out.push({ ...doorOf(p), door: p.id, indoor: p.kind !== 'well' })
      else if (p.kind === 'stones') out.push({ x: p.x, z: p.z, door: -1, indoor: false })
      else if (p.kind === 'bridge') {
        for (const u of [-1, 0, 1]) {
          const [dx, dz] = rotY(u * 0.95, 0, p.yaw)
          out.push({ x: p.x + dx, z: p.z + dz, door: -1, indoor: false })
        }
      }
    }
    return out
  }

  // Breadth-first over everything within a step of everything else.
  const routes = (list: Node[], start: number): number[] => {
    const prev = list.map(() => -2)
    prev[start] = -1
    const queue = [start]
    while (queue.length > 0) {
      const i = queue.shift()!
      const a = list[i]!
      for (let j = 0; j < list.length; j++) {
        if (prev[j] !== -2) continue
        const b = list[j]!
        const reach = a.door >= 0 && b.door >= 0 ? 1.35 : LINK
        if (Math.hypot(a.x - b.x, a.z - b.z) > reach) continue
        prev[j] = i
        // People walk through open ground and wells, not through other houses.
        if (!(b.door >= 0 && b.indoor)) queue.push(j)
      }
    }
    return prev
  }

  const planTrip = (g: Gnome): boolean => {
    const list = nodes()
    const start = list.findIndex((n) => n.door === g.home.id)
    if (start < 0) return false
    const prev = routes(list, start)
    const reachable = list.map((_, i) => i).filter((i) => i !== start && prev[i] !== -2)
    if (reachable.length === 0) return false
    const doors = reachable.filter((i) => list[i]!.door >= 0)
    let goal: number
    if (doors.length > 0 && stage.rand() < 0.8) goal = doors[Math.floor(stage.rand() * doors.length)]!
    else {
      // No door to call at: stroll to the far end of the stones and back.
      const hops = (i: number): number => {
        let n = 0
        for (let k = i; prev[k]! >= 0; k = prev[k]!) n++
        return n
      }
      goal = reachable.reduce((a, b) => (hops(b) > hops(a) ? b : a))
    }
    const path: { x: number; z: number }[] = []
    for (let k = goal; k >= 0; k = prev[k]!) path.unshift({ x: list[k]!.x, z: list[k]!.z })
    g.path = path
    g.back = []
    g.at = 0
    g.x = path[0]!.x
    g.z = path[0]!.z
    g.homeward = false
    g.hideAtEnd = list[goal]!.indoor && list[goal]!.door >= 0
    g.layout = layout
    return true
  }

  const turnHome = (g: Gnome): void => {
    const door = doorOf(g.home)
    g.path = [{ x: g.x, z: g.z }, ...g.back.slice().reverse()]
    const last = g.path[g.path.length - 1]!
    if (Math.hypot(last.x - door.x, last.z - door.z) > 0.05) g.path.push(door)
    g.at = 0
    g.back = []
    g.homeward = true
    g.hideAtEnd = true
    g.layout = layout
  }

  const bridgeLift = (x: number, z: number): number => {
    for (const p of pieces) {
      if (p.kind !== 'bridge' || p.state !== 'placed') continue
      const [u, v] = rotY(x - p.x, z - p.z, -p.yaw)
      if (Math.abs(u) < 0.95 && Math.abs(v) < 0.4) return M.BRIDGE_RISE * (1 - (u / 0.95) ** 2) + 0.05
    }
    return 0
  }

  const updateGnome = (g: Gnome, dt: number): void => {
    const isNight = night() > 0.5
    if (g.home.state !== 'placed') {
      g.state = 'in'
      g.show = 0
      g.wait = 2.5
      return
    }
    g.show = damp(g.show, g.state === 'out' || g.state === 'pause' ? 1 : 0, 10, dt)
    if (g.state === 'in') {
      g.wait -= dt
      if (g.wait <= 0 && !isNight) {
        if (planTrip(g)) {
          g.state = 'out'
          g.yaw = g.home.yaw
        } else g.wait = 2
      }
      return
    }
    if (g.state === 'visit' || g.state === 'pause') {
      g.wait -= dt
      if (g.layout !== layout && g.state === 'visit') {
        // The house it was calling at was moved: it is simply home again.
        g.state = 'in'
        g.wait = 3
        return
      }
      if (g.wait <= 0 || (isNight && g.state === 'pause')) {
        turnHome(g)
        g.state = 'out'
      }
      return
    }
    // Walking.
    if ((g.layout !== layout || isNight) && !g.homeward) turnHome(g)
    else if (g.layout !== layout) {
      const door = doorOf(g.home)
      g.path = [{ x: g.x, z: g.z }, door]
      g.at = 0
      g.layout = layout
    }
    const next = g.path[g.at + 1]
    if (!next) {
      if (g.homeward) {
        g.state = 'in'
        g.wait = 4 + stage.rand() * 5
      } else if (g.hideAtEnd) {
        g.state = 'visit'
        g.wait = 3 + stage.rand() * 3
      } else {
        g.state = 'pause'
        g.wait = 2.5
      }
      return
    }
    const dx = next.x - g.x
    const dz = next.z - g.z
    const d = Math.hypot(dx, dz)
    const step = 0.42 * dt
    if (d <= step) {
      g.x = next.x
      g.z = next.z
      if (!g.homeward) g.back.push(g.path[g.at]!)
      g.at++
    } else {
      g.x += (dx / d) * step
      g.z += (dz / d) * step
      g.yaw += wrapPi(Math.atan2(dx, dz) - g.yaw) * Math.min(1, dt * 8)
    }
    g.gait += dt * 9
  }

  // ------------------------------------------------------------ small lives
  const updateSheep = (p: Piece, dt: number): void => {
    const isNight = night() > 0.5
    p.wait -= dt
    if (p.wait <= 0 && !(isNight && p.walk < 0.1)) {
      p.wait = 5 + stage.rand() * 6
      let tree: Piece | null = null
      let best = 1e9
      for (const o of pieces) {
        if (o.kind !== 'tree' || o.state !== 'placed') continue
        const d = Math.hypot(o.x - p.x, o.z - p.z)
        if (d < best) {
          best = d
          tree = o
        }
      }
      const a = stage.rand() * TAU
      if (tree) {
        p.tx = tree.x + Math.sin(a) * 0.78
        p.tz = tree.z + Math.cos(a) * 0.78
      } else {
        p.tx = p.x + Math.sin(a) * 0.7
        p.tz = p.z + Math.cos(a) * 0.7
      }
      const r = Math.hypot(p.tx, p.tz)
      if (r > 3.7) {
        p.tx *= 3.7 / r
        p.tz *= 3.7 / r
      }
    }
    const dx = p.tx - p.x
    const dz = p.tz - p.z
    const d = Math.hypot(dx, dz)
    const going = d > 0.08
    p.walk = damp(p.walk, going ? 1 : 0, 6, dt)
    if (going) {
      const step = Math.min(d, 0.24 * dt)
      p.x += (dx / d) * step
      p.z += (dz / d) * step
      p.yaw += wrapPi(Math.atan2(dx, dz) - p.yaw) * Math.min(1, dt * 3)
      p.gait += dt * 8
    }
    for (const o of pieces) {
      if (o === p || o.state !== 'placed' || o.kind === 'stones' || o.kind === 'jetty' || o.kind === 'bridge') continue
      const min = o.def.r * 0.8 + 0.28
      const ox = p.x - o.x
      const oz = p.z - o.z
      const od = Math.hypot(ox, oz)
      if (od < min && od > 0.001) {
        const push = Math.min(min - od, dt * 0.8)
        p.x += (ox / od) * push
        p.z += (oz / od) * push
      }
    }
    const r = Math.hypot(p.x, p.z)
    if (r > 3.85) {
      p.x *= 3.85 / r
      p.z *= 3.85 / r
    }
    p.sleep = damp(p.sleep, isNight && !going ? 1 : 0, 1.5, dt)
  }

  // The boat's place on its circle, in the jetty's own space.
  const boatAt = (a: number): [number, number] => [1.5 - Math.cos(a), M.JETTY_END + 0.3 + Math.sin(a)]

  const addRipple = (x: number, z: number, size: number): void => {
    if (z < SEA_FAR + 1.5) return
    if (ripples.length >= RIPPLES) ripples.shift()
    ripples.push({ x, z, age: 0, life: 1.6, size })
  }

  // ------------------------------------------------------------ painting the sky
  const stars: { x: number; y: number; s: number; ph: number }[] = []
  for (let i = 0; i < 64; i++) stars.push({ x: stage.rand() * W, y: 6 + stage.rand() ** 1.4 * (horizonY - 26), s: 1.2 + stage.rand() * 2, ph: stage.rand() * TAU })
  const clouds = [
    { x: 210, y: 70, s: 1.1, v: 5 },
    { x: 610, y: 44, s: 0.8, v: 3.5 },
    { x: 1010, y: 150, s: 0.62, v: 4.4 },
  ]

  const poly = (g: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rot: number): void => {
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * TAU
      if (i === 0) g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
      else g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    }
    g.closePath()
  }

  const drawSky = (g: CanvasRenderingContext2D): void => {
    const n = night()
    const s = sunset()
    const top = mix3(mix3(SKY.dayTop, SKY.nightTop, n), SKY.setTop, s * 0.75)
    const low = mix3(mix3(SKY.dayLow, SKY.nightLow, n), SKY.setLow, s * 0.85)
    const grad = g.createLinearGradient(0, 0, 0, horizonY + 4)
    grad.addColorStop(0, css(top))
    grad.addColorStop(1, css(low))
    g.fillStyle = grad
    g.fillRect(0, 0, W, H)

    if (n > 0.02) {
      for (const st of stars) {
        const tw = 0.6 + 0.4 * Math.sin(stage.time * 1.3 + st.ph)
        g.fillStyle = css([255, 248, 226], n * tw * 0.9)
        g.beginPath()
        poly(g, st.x, st.y, st.s * 1.6, 4, st.ph)
        g.fill()
      }
      // A thin moon.
      g.save()
      g.globalAlpha = n
      g.fillStyle = '#fff6da'
      g.beginPath()
      g.arc(196, 84, 30, 0, TAU)
      g.fill()
      g.fillStyle = css(mix3(top, low, 84 / horizonY))
      g.beginPath()
      g.arc(210, 76, 27, 0, TAU)
      g.fill()
      g.restore()
    }

    // The sun: a warm faceted disc with a soft halo; the sea hides it as it sinks.
    const sy = lerp(SUN_DOWN, SUN_UP, sun)
    const warm = mix3([255, 244, 200], [255, 170, 110], clamp(1 - sun * 1.2, 0, 1))
    const pulse = 1 + 0.03 * Math.sin(stage.time * 1.1) + sunPulse * 0.12
    const halo = g.createRadialGradient(SUN_X, sy, 20, SUN_X, sy, 150 * pulse)
    halo.addColorStop(0, css(warm, 0.55))
    halo.addColorStop(1, css(warm, 0))
    g.fillStyle = halo
    g.fillRect(SUN_X - 160, sy - 160, 320, 320)
    g.fillStyle = css(mix3(warm, [255, 255, 255], 0.25), 0.5)
    g.beginPath()
    poly(g, SUN_X, sy, 55 * pulse, 12, stage.time * 0.05)
    g.fill()
    g.fillStyle = css(warm)
    g.beginPath()
    poly(g, SUN_X, sy, 45 * pulse, 12, -stage.time * 0.03)
    g.fill()

    // Flat wooden-toy clouds.
    const tint = mix3(mix3([255, 255, 255], [96, 100, 150], n), [255, 214, 200], s * 0.7)
    const under = mix3(mix3([244, 232, 226], [70, 76, 128], n), [246, 178, 170], s * 0.7)
    for (const c of clouds) {
      const cx = ((c.x + stage.time * c.v + 200) % (W + 400)) - 200
      for (const pass of [0, 1]) {
        g.fillStyle = css(pass === 0 ? under : tint, 0.92 - n * 0.35)
        g.beginPath()
        const dy = pass === 0 ? 5 * c.s : 0
        poly(g, cx - 44 * c.s, c.y + dy + 6 * c.s, 30 * c.s, 8, 0.4)
        poly(g, cx, c.y + dy - 8 * c.s, 42 * c.s, 8, 0.2)
        poly(g, cx + 48 * c.s, c.y + dy + 4 * c.s, 32 * c.s, 8, 0.1)
        g.rect(cx - 62 * c.s, c.y + dy + 6 * c.s, 128 * c.s, 24 * c.s)
        g.fill()
      }
    }
  }

  // ------------------------------------------------------------ frame sync
  const m4 = new THREE.Matrix4()
  const quat = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const nrm = new THREE.Vector3()
  const scl = new THREE.Vector3()
  const pos = new THREE.Vector3()
  const black = new THREE.Color(0, 0, 0)
  const tone = new THREE.Color()
  const glowPoints: { x: number; y: number; a: number; r: number }[] = []

  const setLights = (): void => {
    const n = night()
    const s = sunset() * (1 - n * 0.5)
    const blend = (key: 'sky' | 'ground' | 'key' | 'rim', out: THREE.Vector3, gain = 1): void => {
      const c = mix3(mix3(LIGHT.day[key], LIGHT.night[key], n), LIGHT.set[key], s * 0.8)
      out.set(c[0] * gain, c[1] * gain, c[2] * gain)
    }
    blend('sky', shared.uSky.value)
    blend('ground', shared.uGround.value)
    blend('key', shared.uKey.value)
    blend('rim', shared.uRim.value)
    const low = mix3(mix3(SKY.dayLow, SKY.nightLow, n), SKY.setLow, sunset() * 0.85)
    shared.uHaze.value.set(low[0] / 255, low[1] / 255, low[2] / 255)
    shared.uNight.value = sstep(0.25, 0.9, n)
    shared.uTime.value = stage.time
  }

  const sync = (): void => {
    isle.rotation.y = theta
    setLights()
    const n = night()
    glowPoints.length = 0
    let si = 0
    // Shadows fall toward the front left, away from the sun, and lengthen as it sinks.
    const reachOut = 0.28 + sunset() * 0.3
    const shadowAt = (wx: number, wy: number, wz: number, r: number, nx: number, ny: number, nz: number): void => {
      if (si >= SHADOWS || r <= 0) return
      quat.setFromUnitVectors(up, nrm.set(nx, ny, nz).normalize())
      m4.compose(pos.set(wx - 0.55 * r * reachOut, wy + 0.025, wz + 0.7 * r * reachOut), quat, scl.set(r * 1.08, 1, r * 1.08))
      shadows.setMatrixAt(si++, m4)
    }
    const islandShadow = (lx: number, lz: number, r: number): void => {
      const e = 0.12
      const gx = (M.groundH(lx + e, lz) - M.groundH(lx - e, lz)) / (2 * e)
      const gz = (M.groundH(lx, lz + e) - M.groundH(lx, lz - e)) / (2 * e)
      const [wnx, wnz] = rotY(-gx, -gz, theta)
      localToWorld(lx, M.groundH(lx, lz), lz, world)
      shadowAt(world.x, world.y, world.z, r, wnx, 1, wnz)
    }
    const glowAt = (p: Piece, lx: number, ly: number, lz: number, nx: number, nz: number, strength: number, radius: number): void => {
      if (n < 0.3) return
      const [ox, oz] = rotY(lx, lz, p.yaw)
      localToWorld(p.x + ox, groundY(p.kind, p.x, p.z) + ly, p.z + oz, world)
      let facing = 1
      if (nx !== 0 || nz !== 0) {
        const [fx1, fz1] = rotY(nx, nz, p.yaw + theta)
        facing = clamp(fz1 * 0.9 + 0.25 - Math.abs(fx1) * 0.1, 0, 1)
      }
      if (facing <= 0.02) return
      const at = toScreen(world.x, world.y, world.z)
      glowPoints.push({ x: at.x, y: at.y, a: strength * facing * sstep(0.3, 0.9, n), r: radius })
    }

    let lamp: Piece | null = null
    let li = 0
    const lampOn = sstep(0.4, 0.95, n)
    for (const l of shared.uLamps.value) l.w = 0
    for (const p of pieces) {
      const g = p.group
      const sq = p.squash.value
      const wide = 1 / Math.sqrt(Math.max(0.3, sq))
      if (p.state === 'placed') {
        const y = groundY(p.kind, p.x, p.z)
        g.position.set(p.x, y - 0.03 * p.sleep, p.z)
        let rx = 0
        let rz = 0
        if (p.kind === 'tree') {
          rz = Math.sin(stage.time * 0.9 + p.id * 1.7) * 0.035
          rx = Math.cos(stage.time * 0.7 + p.id) * 0.02
        } else if (p.kind === 'sheep') {
          rz = Math.sin(p.gait) * 0.1 * p.walk
          rx = 0.2 * Math.max(0, Math.sin(stage.time * 0.9 + p.id * 2.1)) * (1 - p.walk) * (1 - p.sleep)
        }
        g.rotation.set(rx, p.yaw, rz)
        g.scale.set(wide, sq * (1 - 0.18 * p.sleep), wide)
        if (p.def.shadow > 0) islandShadow(p.x, p.z, p.def.shadow)
        if (p.kind === 'cottage') {
          glowAt(p, -0.31, 0.33, 0.42, 0, 1, 0.55, 34)
          glowAt(p, 0.31, 0.33, 0.42, 0, 1, 0.55, 34)
          glowAt(p, 0, 0.33, -0.42, 0, -1, 0.55, 34)
          glowAt(p, 0.53, 0.33, 0.05, 1, 0, 0.55, 34)
          glowAt(p, -0.53, 0.33, 0.05, -1, 0, 0.55, 34)
        } else if (p.kind === 'windmill') glowAt(p, 0, 0.7, 0.31, 0, 1, 0.5, 30)
        else if (p.kind === 'lighthouse') {
          glowAt(p, M.LAMP.x, M.LAMP.y, M.LAMP.z, 0, 0, 0.9, 70)
          glowAt(p, 0, 0.95, 0.31, 0, 1, 0.45, 26)
          lamp = p
        }
        if ((p.kind === 'cottage' || p.kind === 'windmill') && lampOn > 0 && li < 4) {
          // A warm pool on the ground in front of the door.
          const [ox, oz] = rotY(0, p.def.door + 0.25, p.yaw)
          localToWorld(p.x + ox, y + 0.5, p.z + oz, world)
          shared.uLamps.value[li++]!.set(world.x, world.y, world.z, 0.5 * lampOn)
        }
      } else {
        g.position.copy(p.w)
        g.rotation.set(0, p.wyaw, p.tilt)
        g.scale.set(p.scale * wide, p.scale * sq, p.scale * wide)
        if (p.state === 'tray') shadowAt(p.w.x, trayAt.y, p.w.z, p.def.shadow * p.scale, 0, 1, 0)
        else if (p.state === 'held' && p.spot) {
          if (p.kind === 'jetty' || p.def.shadow === 0) islandShadow(p.spot.x, p.spot.z, 0.42)
          else islandShadow(p.spot.x, p.spot.z, p.def.shadow)
        }
      }
      if (p.kind === 'windmill' && p.extra) p.extra.rotation.z = p.spin
      if (p.kind === 'jetty' && p.extra) {
        const afloat = p.state === 'placed'
        const a = p.boatA
        // A slow circle beside the end of the jetty.
        const [cx, cz] = boatAt(a)
        const bx = afloat ? cx : 0
        const bz = afloat ? cz : 0.9
        p.extra.position.set(bx, afloat ? Math.sin(stage.time * 1.4) * 0.02 : 0.35, bz)
        p.extra.rotation.set(Math.sin(stage.time * 1.1) * 0.05, afloat ? a : 0, Math.sin(stage.time * 0.9 + 1) * 0.06, 'YXZ')
        if (afloat && n > 0.3) {
          const [ox, oz] = rotY(bx, bz, p.yaw)
          localToWorld(p.x + ox, 0.72, p.z + oz, world)
          const at = toScreen(world.x, world.y, world.z)
          glowPoints.push({ x: at.x, y: at.y, a: 0.5 * sstep(0.3, 0.9, n), r: 24 })
        }
      }
    }

    for (const gn of gnomes) {
      gn.mesh.visible = gn.show > 0.03
      if (!gn.mesh.visible) continue
      const y = M.groundH(gn.x, gn.z) + bridgeLift(gn.x, gn.z)
      gn.mesh.position.set(gn.x, y, gn.z)
      gn.mesh.rotation.set(0, gn.yaw, gn.state === 'out' ? Math.sin(gn.gait) * 0.12 : 0)
      const s = 1.25 * ease.outBack(clamp(gn.show, 0, 1))
      gn.mesh.scale.set(s, s, s)
      islandShadow(gn.x, gn.z, 0.16 * gn.show)
    }

    for (let i = si; i < SHADOWS; i++) {
      m4.makeScale(0, 0, 0)
      shadows.setMatrixAt(i, m4)
    }
    shadows.instanceMatrix.needsUpdate = true
    shadowMat.opacity = lerp(0.2, 0.12, n)

    for (let i = 0; i < RIPPLES; i++) {
      const r = ripples[i]
      if (!r) {
        m4.makeScale(0, 0, 0)
        rippleMesh.setMatrixAt(i, m4)
        rippleMesh.setColorAt(i, black)
        continue
      }
      const t = r.age / r.life
      const size = r.size * (0.25 + 0.75 * ease.outCubic(t))
      m4.makeScale(size, 1, size).setPosition(r.x, 0.1, r.z)
      rippleMesh.setMatrixAt(i, m4)
      const a = (1 - t) * (1 - t) * lerp(0.3, 0.16, n)
      rippleMesh.setColorAt(i, tone.setRGB(a, a, a))
    }
    rippleMesh.instanceMatrix.needsUpdate = true
    if (rippleMesh.instanceColor) rippleMesh.instanceColor.needsUpdate = true

    for (let i = 0; i < PUFFS; i++) {
      const f = puffs[i]
      if (!f) {
        m4.makeScale(0, 0, 0)
        puffMesh.setMatrixAt(i, m4)
        continue
      }
      const t = f.age / f.life
      const s = f.size * Math.sin(Math.min(1, t * 1.15) * Math.PI) ** 0.6
      m4.makeRotationY(f.age * 0.5 + i).scale(scl.set(s, s, s)).setPosition(f.x, f.y, f.z)
      puffMesh.setMatrixAt(i, m4)
    }
    puffMesh.instanceMatrix.needsUpdate = true

    const beamOn = lamp ? sstep(0.45, 0.95, n) : 0
    shared.uBeamOn.value = beamOn
    beam.visible = beamOn > 0.01
    if (lamp && beam.visible) {
      localToWorld(lamp.x, groundY('lighthouse', lamp.x, lamp.z) + M.LAMP.y, lamp.z, world)
      shared.uBeamPos.value.copy(world)
      shared.uBeamAng.value = beamAng
      beam.position.copy(world)
      // The cone is built along +x; atan2(z, x) in the shader matches a turn of -angle about y.
      beam.rotation.set(0, -beamAng, -0.13)
      beamMat.opacity = beamOn
    }
  }

  // ------------------------------------------------------------ the game
  return {
    update(dt) {
      const time = stage.time
      const n = night()
      const isNight = n > 0.5
      const breeze = 0.75 + 0.25 * Math.sin(time * 0.23) + 0.1 * Math.sin(time * 0.61)
      sunPulse = damp(sunPulse, 0, 4, dt)

      // The sun glides on to wherever it was sent.
      let sunHeld = false
      for (const t of touches.values()) if (t.kind === 'sun') sunHeld = true
      if (!sunHeld && sun !== sunTarget) sun += clamp(sunTarget - sun, -dt * 0.75, dt * 0.75)
      const step = Math.round(sun * 4)
      if (step !== sunStep) {
        sunStep = step
        sfx.tone({ freq: sfx.scale([-3, 0, 2, 4, 7][step]!) / 2, dur: 1.1, type: 'sine', vol: 0.07, attack: 0.03 })
        if (step === 0) sfx.tone({ freq: 196, dur: 2, type: 'sine', vol: 0.04, attack: 0.2, delay: 0.3 })
      }

      // The turntable coasts, and clicks softly past its pegs.
      let turning = false
      for (const t of touches.values()) if (t.kind === 'turn') turning = true
      if (!turning && Math.abs(angVel) > 0.001) {
        theta += angVel * dt
        angVel *= Math.exp(-2.4 * dt)
        if (Math.abs(angVel) < 0.02) angVel = 0
      }
      const tick = Math.floor(theta / (15 * DEG))
      if (tick !== lastTick) {
        lastTick = tick
        if (time - lastTickAt > 0.06) {
          lastTickAt = time
          sfx.tone({ freq: 1050 + Math.random() * 120, to: 760, dur: 0.022, type: 'triangle', vol: 0.04 })
          sfx.noise({ dur: 0.012, freq: 2600, vol: 0.015, filter: 'highpass' })
        }
        if (time > lapAt) {
          lapAt = time + 0.8
          soundLap(0.03)
          const a = Math.random() * TAU
          addRipple(Math.sin(a) * (M.RIM_R + 0.2), Math.cos(a) * (M.RIM_R + 0.2), 1.1)
        }
      }
      if (time > idleLapAt) {
        idleLapAt = time + 9 + Math.random() * 7
        soundLap(0.016, 1.3)
      }

      if (n > 0.4) beamAng += dt * 0.55

      for (const p of pieces) {
        p.squash.update(dt)
        if (p.state === 'tray') {
          trayHome(p, pos)
          const picked = p === chosen
          if (picked) pos.y += 0.3 + Math.sin(time * 2.4) * 0.04
          p.w.lerp(pos, 1 - Math.exp(-12 * dt))
          p.scale = damp(p.scale, p.def.tray * (picked ? 1.18 : 1), 12, dt)
          p.wyaw = picked ? TRAY_YAW + Math.sin(time * 1.2) * 0.35 : damp(p.wyaw, TRAY_YAW, 8, dt)
          p.tilt = damp(p.tilt, 0, 8, dt)
        } else if (p.state === 'held' && p.pointer) {
          const ptr = p.pointer
          p.lift = damp(p.lift, 1, 14, dt)
          const sx = ptr.x
          const sy = ptr.y - AIM * p.lift
          const overTray = ptr.y > TRAY_DROP_Y
          const g = castGround(sx, sy)
          if (!overTray && g.r <= SNAP_R) {
            p.spot = resolve(p, g.lx, g.lz)
            if (p.kind === 'jetty') p.wyaw += wrapPi(p.spot.yaw + theta - p.wyaw) * Math.min(1, dt * 10)
          } else p.spot = null
          if (!overTray && g.r < M.RIM_R + 0.5 && sy > horizonY + 14) pos.set(g.wx, g.wy + 0.5 * p.lift, g.wz)
          else {
            const ray = setRay(sx, sy)
            const t = tmp.copy(viewPlanePoint).sub(ray.origin).dot(forward) / ray.direction.dot(forward)
            pos.copy(ray.origin).addScaledVector(ray.direction, t)
          }
          p.w.lerp(pos, 1 - Math.exp(-20 * dt))
          p.scale = damp(p.scale, 1, 12, dt)
          p.tilt = damp(p.tilt, clamp(-ptr.vx * 0.0005, -0.3, 0.3), 8, dt)
        } else if (p.state === 'fly' && p.fly) {
          const f = p.fly
          f.t = Math.min(1, f.t + dt / f.dur)
          const k = ease.inOutQuad(f.t)
          p.w.lerpVectors(f.from, f.to(), k)
          p.w.y += Math.sin(f.t * Math.PI) * f.arc
          p.scale = lerp(f.scaleFrom, f.scaleTo, k)
          p.wyaw = f.yawFrom + wrapPi(f.yawTo() - f.yawFrom) * k
          p.tilt = damp(p.tilt, 0, 10, dt)
          if (f.t >= 1) f.done()
        } else if (p.state === 'placed') {
          if (p.kind === 'windmill') {
            p.spinVel = damp(p.spinVel, breeze * (isNight ? 0.4 : 1.1), 1.2, dt)
            p.spin += p.spinVel * dt
          } else if (p.kind === 'jetty') {
            if (!isNight) p.moored = false
            if (!p.moored) {
              const before = p.boatA
              p.boatA += 0.26 * dt
              if (Math.floor(p.boatA / TAU) !== Math.floor(before / TAU)) {
                // Passing the jetty: tie up for the night, or leave a ring and sail on.
                if (isNight) {
                  p.moored = true
                  p.boatA = Math.round(p.boatA / TAU) * TAU
                }
              }
              if (Math.floor(p.boatA / 1.1) !== Math.floor(before / 1.1)) {
                const [ox, oz] = rotY(...boatAt(p.boatA), p.yaw)
                localToWorld(p.x + ox, 0, p.z + oz, world)
                addRipple(world.x, world.z, 0.7)
              }
            }
          } else if (p.kind === 'sheep') updateSheep(p, dt)
          else if (p.kind === 'cottage') {
            p.wait -= dt
            if (p.wait <= 0) {
              p.wait = 0.7 + Math.random() * 0.3
              const [ox, oz] = rotY(M.CHIMNEY.x, M.CHIMNEY.z, p.yaw)
              localToWorld(p.x + ox, groundY('cottage', p.x, p.z) + M.CHIMNEY.y, p.z + oz, world)
              if (puffs.length >= PUFFS) puffs.shift()
              puffs.push({ x: world.x, y: world.y, z: world.z, age: 0, life: 2.8, size: 0.06 + Math.random() * 0.025 })
            }
          }
        }
      }

      for (const g of gnomes) updateGnome(g, dt)

      for (let i = puffs.length - 1; i >= 0; i--) {
        const f = puffs[i]!
        f.age += dt
        f.y += dt * 0.26
        f.x += dt * (0.06 + 0.1 * breeze) * (0.3 + f.age * 0.5)
        f.size += dt * 0.014
        if (f.age >= f.life) puffs.splice(i, 1)
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]!
        r.age += dt
        if (r.age >= r.life) ripples.splice(i, 1)
      }

      // The tray itself invites: the toy at the front of a slot gives a small hop.
      if (!everPlaced && !chosen && time - lastTouch > 6 && time > hintAt) {
        hintAt = time + 3.2
        const front = slots[hintSlot % KINDS.length]![0]
        hintSlot += 2
        if (front && front.state === 'tray') {
          front.squash.value = 0.86
          front.squash.kick(3.5)
        }
      }
    },

    draw(g) {
      drawSky(g)
      if (!renderer) return
      const stale = kept !== null && performance.now() - keptAt < 420
      if (!stale) {
        sync()
        renderer.info.reset()
        renderer.clear()
        renderer.render(scene, camera)
        if (topScene.children.length > 0) {
          renderer.clearDepth()
          renderer.render(topScene, camera)
        }
        if (kept) {
          const k = kept.getContext('2d')
          if (k) {
            k.clearRect(0, 0, W, H)
            k.drawImage(glCanvas, 0, 0, W, H)
          }
          keptAt = performance.now()
        }
      }
      g.drawImage(kept ?? glCanvas, 0, 0, W, H)

      // The sun's path on the water, and a fainter one under the moon.
      const dusk = night()
      g.save()
      g.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 11; i++) {
        const wob = Math.sin(stage.time * 0.8 + i * 1.9)
        const flick = 0.5 + 0.5 * Math.sin(stage.time * 1.6 + i * 2.3)
        const y = horizonY + 6 + i * 9 + (i % 3) * 2
        const w = 10 + ((i * 37) % 23) + i * 2.5
        const off = (((i * 53) % 17) - 8) * (1 + i * 0.25)
        const day = (0.03 + 0.06 * flick) * (1 - dusk) * clamp(sun * 3, 0, 1) * (1 + sunset())
        if (day > 0.004) {
          g.fillStyle = `rgba(255,${Math.round(lerp(190, 236, sun))},${Math.round(lerp(130, 190, sun))},${day})`
          g.fillRect(SUN_X - w / 2 + off + wob * (4 + i), y, w, 2.5)
        }
        if (dusk > 0.5 && i < 7) {
          g.fillStyle = `rgba(255,246,218,${(0.03 + 0.04 * flick) * dusk})`
          g.fillRect(196 - w / 3 + off * 0.6 + wob * (3 + i), y, (w * 2) / 3, 2.5)
        }
      }
      g.restore()

      // Warm light from the windows after dusk.
      if (glowPoints.length > 0) {
        g.save()
        g.globalCompositeOperation = 'lighter'
        for (const p of glowPoints) {
          const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
          grad.addColorStop(0, `rgba(255,200,110,${p.a * 0.75})`)
          grad.addColorStop(1, 'rgba(255,170,80,0)')
          g.fillStyle = grad
          g.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)
        }
        g.restore()
      }
    },

    down(p: Pointer) {
      lastTouch = stage.time
      const sy = lerp(SUN_DOWN, SUN_UP, sun)
      if (Math.hypot(p.x - SUN_X, p.y - sy) < 86) {
        touches.set(p.id, { kind: 'sun', grab: sy - p.y, moved: false })
        sunPulse = 1
        sfx.tone({ freq: sfx.scale(sun > 0.5 ? 5 : 0) / 2, dur: 0.5, type: 'sine', vol: 0.05 })
        return
      }
      const s = slotAt(p.x, p.y)
      if (s >= 0 && slots[s]!.length > 0) {
        const piece = slots[s]![0]!
        if (piece.state === 'tray') {
          lift(piece, p)
          touches.set(p.id, { kind: 'carry', piece, moved: false })
          return
        }
      }
      if (p.y >= TRAY_PICK_Y + 30) {
        // The bare wood of the tray.
        soundWood(0.35)
        touches.set(p.id, { kind: 'turn', moved: false, place: null })
        angVel = 0
        return
      }
      const hit = placedAt(p.x, p.y)
      if (hit) {
        lift(hit, p)
        touches.set(p.id, { kind: 'carry', piece: hit, moved: false })
        return
      }
      angVel = 0
      const ground = castGround(p.x, p.y)
      const onLand = p.y > horizonY + 14 && ground.r < M.ISLE_R
      touches.set(p.id, { kind: 'turn', moved: false, place: chosen && p.y > horizonY + 14 && ground.r < 6 ? { x: ground.lx, z: ground.lz } : null })
      if (p.y < horizonY + 6) {
        sfx.noise({ dur: 0.35, freq: 900, to: 500, vol: 0.02, filter: 'bandpass', q: 0.6 })
        fx.ring(p.x, p.y, 'rgba(255,255,255,0.6)', 34, 0.5)
      } else if (onLand) {
        sfx.tone({ freq: 150, to: 110, dur: 0.09, type: 'sine', vol: 0.1 })
        fx.burst(p.x, p.y, { count: 4, color: ['#d9f2cc', '#ffffff'], speed: 70, life: 0.4, size: 5, gravity: 200, angle: -Math.PI / 2, spread: Math.PI })
      } else if (ground.r < M.RIM_R + 0.1) soundWood(0.5)
      else {
        soundDrip()
        addRipple(ground.wx, ground.wz, 1.2)
        addRipple(ground.wx, ground.wz, 0.6)
      }
    },

    move(p: Pointer) {
      const t = touches.get(p.id)
      if (!t) return
      lastTouch = stage.time
      if (!t.moved && Math.hypot(p.x - p.startX, p.y - p.startY) > 14) t.moved = true
      if (t.kind === 'sun') {
        sun = clamp((SUN_DOWN - (p.y + t.grab)) / (SUN_DOWN - SUN_UP), 0, 1)
      } else if (t.kind === 'turn' && t.moved) {
        theta += p.dx / 300
      }
    },

    up(p: Pointer) {
      const t = touches.get(p.id)
      if (!t) return
      touches.delete(p.id)
      if (t.kind === 'sun') {
        // Past a third of the way it carries on; otherwise it drifts back.
        if (sunTarget === 1) sunTarget = sun < 0.68 ? 0 : 1
        else sunTarget = sun > 0.32 ? 1 : 0
        return
      }
      if (t.kind === 'turn') {
        if (t.moved) angVel = clamp(p.vx / 300, -5, 5)
        else if (t.place && chosen && chosen.state === 'tray') {
          const piece = chosen
          chosen = null
          const list = slots[KINDS.indexOf(piece.kind)]!
          list.splice(list.indexOf(piece), 1)
          piece.from = 'tray'
          soundPick()
          flyToSpot(piece, resolve(piece, t.place.x, t.place.z), 0.5, 1.3)
        }
        return
      }
      const piece = t.piece
      if (piece.state !== 'held') return
      if (!t.moved && stage.time - p.downAt < 0.6) {
        if (piece.from === 'tray') {
          // A tap chooses it: it waits, raised, for a tap on the island.
          slots[KINDS.indexOf(piece.kind)]!.unshift(piece)
          piece.state = 'tray'
          piece.pointer = null
          piece.spot = null
          scene.add(piece.group)
          chosen = chosen === piece ? null : piece
          sfx.tone({ freq: sfx.scale(piece.def.note), dur: 0.35, type: 'sine', vol: 0.05 })
        } else {
          // A tap on a placed toy: it hops where it stands.
          piece.pointer = null
          piece.spot = null
          settle(piece, { x: piece.ox, z: piece.oz, yaw: piece.oyaw }, true)
          piece.squash.value = 0.78
          piece.squash.kick(4)
          if (piece.kind === 'windmill') piece.spinVel += 4
          if (piece.kind === 'sheep') sfx.tone({ freq: 560, to: 470, dur: 0.2, type: 'triangle', vol: 0.05, delay: 0.05 })
          if (piece.kind === 'tree') {
            const at = toScreen(piece.w.x, piece.w.y + 0.9, piece.w.z)
            fx.burst(at.x, at.y, { count: 4, color: piece.variant === 2 ? '#f7c6d0' : '#bfe6b8', speed: 60, life: 0.9, size: 6, gravity: 160, drag: 0.92 })
          }
        }
        return
      }
      drop(piece, p)
    },

    dispose() {
      for (const thing of disposables) thing.dispose()
      shadows.dispose()
      rippleMesh.dispose()
      puffMesh.dispose()
      if (renderer) {
        renderer.dispose()
        renderer.forceContextLoss()
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'tiny-island',
    name: 'Tiny Island',
    emoji: '🏝️',
    ages: [3, 7],
    pitch: 'Set wooden toy cottages, trees, sheep and a lighthouse on a little island you can turn, then draw the sun down and watch it glow.',
    howTo: 'Drag a toy from the tray onto the island (or tap it, then tap a place). Drag the sea or sky to turn the island. Pull the sun down for evening, lift it for morning.',
    basedOn: 'Waldorf small-world play with plain wooden figures on a play table; the wooden toy village and the lazy-Susan turntable',
    whyFun: 'A wooden toy settles with a knock exactly where the hand puts it, the whole island turns under one finger, and what was placed quietly comes to life.',
    set: 'gentle',
  },
  create,
}
