// Sand Kingdom: a beach at low tide, in real 3D. The sand is one height field
// the hand shapes: a finger draws moats, the bucket and moulds turn out towers,
// a flat hand pats, wet sand from the rock pool drips into spires, and shells,
// feathers and driftwood are pressed in where the child likes. Nothing happens
// until the child draws the sun down. Then the sea comes in over the sand,
// fills what was dug, and the sea folk use exactly what was built. Lifting the
// sun lets the tide take it all back and leaves the beach smooth and new.

import * as THREE from 'three'
import { TAU, clamp, damp, ease, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { WEED_SEGMENTS, glowTexture, makeBucket, makeCone, makeCrab, makeDrop, makeFish, makeHandful, makeWallMould, makeMerChild, makeRocks, makeSpade, makeStarfish, makeTreasure } from './props.ts'
import type { MouldProp, SpadeProp, Treasure } from './props.ts'
import { createLight, propMaterial, sandMaterial, waterMaterial } from './shaders.ts'
import { createSky, skyColors } from './sky.ts'
import { CELL, DAY_LEVEL, DRY_Z, LIGHT_X, LIGHT_Z, MOULD_HEIGHT, NX, NZ, POOL, ROCKS, TIDE_LEVEL, X0, X1, Z0, createTerrain, inPool } from './terrain.ts'
import type { Mould, Occluder } from './terrain.ts'

const GL_SCALE = 1.5
const SUN_X = 905
const SUN_DAY = 76
const FAR_Z = -5.25
// Seconds the tide takes to cross the sand once the moats have filled.
const TIDE_SECONDS = 18
const MELT_SECONDS = 4
// Found things are drawn larger than life, for small hands.
const TREASURE_SIZE = 1.2
// Drops in one handful of wet sand from the pool.
const DRIPS = 30

type Kind = Mould | 'spade' | Treasure

interface Turn {
  t: number
  x: number
  z: number
  y0: number
  ref: number
  stamped: boolean
  taps: number
  lifted: boolean
  tx: number
  tz: number
  yaw: number
}

interface Item {
  kind: Kind
  obj: THREE.Object3D
  // Where it rests, or where the finger wants it.
  x: number
  z: number
  // Where it is drawn; follows with a little weight.
  cx: number
  cz: number
  lift: number
  held: boolean
  yaw: number
  variant: number
  grow: number
  gone: boolean
  // Pressed against steep sand rather than lying on it.
  wall: boolean
  nx: number
  ny: number
  nz: number
  // The child has put it somewhere on the damp sand.
  placed: boolean
  homeX: number
  homeZ: number
  pick: number
  fill: number
  shownFill: number
  load: number
  mould?: MouldProp
  spade?: SpadeProp
  turn?: Turn
  pour: number
  settle: number
  glow?: THREE.Sprite
  lit: number
  // A hermit crab is living in it.
  crab: boolean
  // Where its shadow was last laid.
  ox: number
  oz: number
  flat?: Float32Array
}

type Hold =
  | { kind: 'sun'; oy: number }
  | { kind: 'item'; item: Item; ox: number; oz: number; lx: number; lz: number; travel: number; cue: number }
  | { kind: 'dig'; lx: number; lz: number; has: boolean; wait: number; cue: number }
  | { kind: 'drip'; left: number; acc: number; x: number; z: number; ok: boolean; moved: number; speed: number }
  | { kind: 'none' }

interface Drop {
  mesh: THREE.Mesh
  x: number
  z: number
  y: number
  to: number
  live: boolean
}

interface Ripple {
  mesh: THREE.Mesh
  t: number
  life: number
  size: number
}

function isMould(kind: Kind): kind is Mould {
  return kind === 'bucket' || kind === 'cone' || kind === 'wall'
}
function isShell(kind: Kind): boolean {
  return kind === 'scallop' || kind === 'snail'
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const terrain = createTerrain()
  const sky = createSky(() => stage.rand())

  // ------------------------------------------------------------ the scene
  // Without a graphics chip (the screenshot tool, an old machine) the beach is
  // drawn small and without smoothing, so it still moves.
  let software = false
  {
    const probe = document.createElement('canvas').getContext('webgl2')
    const ext = probe?.getExtension('WEBGL_debug_renderer_info')
    const name = probe && ext ? String(probe.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    software = /swiftshader|llvmpipe|software/i.test(name)
    probe?.getExtension('WEBGL_lose_context')?.loseContext()
  }
  const glScale = software ? 0.5 : GL_SCALE
  const glCanvas = document.createElement('canvas')
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: !software, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(1)
  renderer.setSize(Math.round(W * glScale), Math.round(H * glScale), false)
  renderer.setClearColor(0x000000, 0)
  let soft: { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D; at: number; cost: number; lastT: number } | null = null
  if (software) {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const g2 = canvas.getContext('2d')
    if (g2) soft = { canvas, g: g2, at: -1e9, cost: 0, lastT: -1 }
  }
  // For whoever is measuring: draw calls and triangles of the last frame.
  const info = { calls: 0, triangles: 0, software, jsMs: 0 }
  ;(globalThis as unknown as { __sandKingdom?: unknown }).__sandKingdom = info
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, W / H, 1, 60)
  camera.position.set(0, 10, 11.9)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)

  const light = createLight()
  light.uCam.value.copy(camera.position)

  const sandGeo = new THREE.BufferGeometry()
  const posAttr = new THREE.BufferAttribute(terrain.pos, 3).setUsage(THREE.DynamicDrawUsage)
  const norAttr = new THREE.BufferAttribute(terrain.nor, 3).setUsage(THREE.DynamicDrawUsage)
  const lightAttr = new THREE.BufferAttribute(terrain.light, 2).setUsage(THREE.DynamicDrawUsage)
  sandGeo.setAttribute('position', posAttr)
  sandGeo.setAttribute('normal', norAttr)
  sandGeo.setAttribute('aLight', lightAttr)
  sandGeo.setAttribute('aBase', new THREE.BufferAttribute(terrain.base, 1))
  {
    const idx = new Uint32Array((NX - 1) * (NZ - 1) * 6)
    let q = 0
    for (let j = 0; j < NZ - 1; j++) {
      for (let i = 0; i < NX - 1; i++) {
        const a = j * NX + i
        const b = a + 1
        const c = a + NX
        const d = c + 1
        if ((i + j) % 2 === 0) {
          idx[q++] = a
          idx[q++] = c
          idx[q++] = b
          idx[q++] = b
          idx[q++] = c
          idx[q++] = d
        } else {
          idx[q++] = a
          idx[q++] = c
          idx[q++] = d
          idx[q++] = a
          idx[q++] = d
          idx[q++] = b
        }
      }
    }
    sandGeo.setIndex(new THREE.BufferAttribute(idx, 1))
  }
  const sandMat = sandMaterial(light)
  const sand = new THREE.Mesh(sandGeo, sandMat)
  sand.frustumCulled = false
  scene.add(sand)

  // The water needs to know how deep the sand is under every point of it.
  const half = new Uint16Array(NX * NZ)
  const heightTex = new THREE.DataTexture(half, NX, NZ, THREE.RedFormat, THREE.HalfFloatType)
  heightTex.magFilter = THREE.LinearFilter
  heightTex.minFilter = THREE.LinearFilter
  heightTex.wrapS = THREE.ClampToEdgeWrapping
  heightTex.wrapT = THREE.ClampToEdgeWrapping
  const uploadHeights = () => {
    const h = terrain.h
    for (let k = 0; k < half.length; k++) half[k] = THREE.DataUtils.toHalfFloat(h[k])
    heightTex.needsUpdate = true
  }

  const poolGeo = new THREE.CircleGeometry(POOL.r * 1.25, 30)
  poolGeo.rotateX(-Math.PI / 2)
  poolGeo.scale(1, 1, 0.8)
  poolGeo.translate(POOL.x, 0, POOL.z)
  const poolMat = waterMaterial(light, heightTex, true)
  const pool = new THREE.Mesh(poolGeo, poolMat)
  pool.frustumCulled = false
  pool.renderOrder = 1
  scene.add(pool)

  const seaGeo = new THREE.BufferGeometry()
  const seaPos = new THREE.BufferAttribute(new Float32Array([-11, 0, FAR_Z, -11, 0, 5.4, 11, 0, FAR_Z, 11, 0, 5.4]), 3)
  seaGeo.setAttribute('position', seaPos)
  seaGeo.setIndex([0, 1, 2, 2, 1, 3])
  const seaMat = waterMaterial(light, heightTex, false)
  const sea = new THREE.Mesh(seaGeo, seaMat)
  sea.frustumCulled = false
  sea.renderOrder = 2
  scene.add(sea)

  const mat = propMaterial(light)
  scene.add(makeRocks(mat))

  const glowTex = glowTexture()
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })

  const ringGeo = new THREE.RingGeometry(0.86, 1, 36)
  ringGeo.rotateX(-Math.PI / 2)
  const ripples: Ripple[] = []
  for (let i = 0; i < 6; i++) {
    const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }))
    mesh.visible = false
    mesh.renderOrder = 3
    scene.add(mesh)
    ripples.push({ mesh, t: 9, life: 1, size: 0.5 })
  }

  const drops: Drop[] = []
  for (let i = 0; i < 6; i++) {
    const mesh = makeDrop(mat)
    mesh.visible = false
    scene.add(mesh)
    drops.push({ mesh, x: 0, z: 0, y: 0, to: 0, live: false })
  }
  const handful = makeHandful(mat)
  handful.visible = false
  scene.add(handful)

  // ---------------------------------------------------------- projections
  const v3 = new THREE.Vector3()
  const cam = camera.position
  const castAt = (px: number, py: number) => {
    v3.set((px / W) * 2 - 1, 1 - (py / H) * 2, 0.5)
      .unproject(camera)
      .sub(cam)
      .normalize()
    return terrain.raycast(cam.x, cam.y, cam.z, v3.x, v3.y, v3.z)
  }
  // Where a ray through the pixel meets a flat sheet at height y.
  const castFlat = (px: number, py: number, y: number): [number, number] | null => {
    v3.set((px / W) * 2 - 1, 1 - (py / H) * 2, 0.5)
      .unproject(camera)
      .sub(cam)
      .normalize()
    if (v3.y > -1e-3) return null
    const t = (y - cam.y) / v3.y
    return [cam.x + v3.x * t, cam.z + v3.z * t]
  }
  const toScreen = (x: number, y: number, z: number): [number, number] => {
    v3.set(x, y, z).project(camera)
    return [((v3.x + 1) / 2) * W, ((1 - v3.y) / 2) * H]
  }
  // How far across the beach is in view at a given depth, with a margin.
  const reach = (z: number) => Math.min(X1 - 0.3, Math.hypot(10, 11.9 - z) * 0.268 * (W / H) - 0.55)

  // -------------------------------------------------------------- the sun
  let horizon = toScreen(0, DAY_LEVEL, FAR_Z)[1]
  let sunY = SUN_DAY
  let dusk = 0
  let phase: 'day' | 'night' | 'dawn' = 'day'
  let nightT = 0
  let dawnT = 0
  let level = DAY_LEVEL
  let levelFrom = DAY_LEVEL
  let shown = DAY_LEVEL
  let erodeAcc = 0
  let lastTouch = 0
  let lastTan = 0
  let built = 0
  let waveAt = 3

  // ---------------------------------------------------------------- sound
  const snd = {
    dig() {
      sfx.noise({ dur: 0.07 + Math.random() * 0.04, freq: 900 + Math.random() * 900, vol: 0.055, q: 0.7 })
    },
    digStart() {
      sfx.noise({ dur: 0.1, freq: 520, vol: 0.08, filter: 'lowpass' })
      sfx.tone({ freq: 150, to: 90, dur: 0.07, vol: 0.05 })
    },
    scoop() {
      sfx.noise({ dur: 0.2, freq: 1900, to: 520, vol: 0.085, q: 0.8 })
    },
    loaded() {
      sfx.tone({ freq: 190, to: 120, dur: 0.09, vol: 0.07 })
      sfx.noise({ dur: 0.06, freq: 700, vol: 0.05, filter: 'lowpass' })
    },
    pour() {
      sfx.noise({ dur: 0.42, freq: 3200, to: 1500, vol: 0.06, filter: 'highpass' })
      sfx.tone({ freq: 170, to: 110, dur: 0.1, vol: 0.06, delay: 0.36 })
    },
    wood(pitch = 1) {
      sfx.tone({ freq: 330 * pitch, to: 260 * pitch, dur: 0.07, type: 'triangle', vol: 0.07 })
      sfx.noise({ dur: 0.03, freq: 1200, vol: 0.03 })
    },
    thump() {
      sfx.tone({ freq: 120, to: 52, dur: 0.22, vol: 0.24 })
      sfx.noise({ dur: 0.12, freq: 320, vol: 0.12, filter: 'lowpass' })
    },
    tap() {
      sfx.tone({ freq: 520, to: 420, dur: 0.045, type: 'triangle', vol: 0.06 })
    },
    release() {
      sfx.noise({ dur: 0.16, freq: 500, to: 1500, vol: 0.06, q: 1.2 })
      sfx.noise({ dur: 0.3, freq: 2600, vol: 0.025, filter: 'highpass', delay: 0.1 })
    },
    pat() {
      sfx.tone({ freq: 145, to: 82, dur: 0.1, vol: 0.17 })
      sfx.noise({ dur: 0.05, freq: 520, vol: 0.07, filter: 'lowpass' })
    },
    plip() {
      const f = 520 + Math.random() * 380
      sfx.tone({ freq: f, to: f * 0.62, dur: 0.05, vol: 0.045 })
    },
    plink(step = 0) {
      const f = sfx.scale(step) * 1.5
      sfx.tone({ freq: f * 0.8, to: f, dur: 0.13, vol: 0.055 })
      sfx.noise({ dur: 0.05, freq: 3200, vol: 0.02, filter: 'highpass' })
    },
    shell() {
      sfx.tone({ freq: 1750 + Math.random() * 300, dur: 0.035, type: 'triangle', vol: 0.045 })
      sfx.noise({ dur: 0.05, freq: 900, vol: 0.04, q: 1 })
    },
    pebble() {
      sfx.tone({ freq: 900, to: 620, dur: 0.05, type: 'triangle', vol: 0.07 })
    },
    feather() {
      sfx.noise({ dur: 0.14, freq: 4200, vol: 0.03, filter: 'highpass' })
    },
    weed() {
      sfx.noise({ dur: 0.12, freq: 700, to: 300, vol: 0.06, filter: 'lowpass' })
    },
    wave(vol = 0.06, dur = 2.4) {
      sfx.noise({ dur: dur * 0.55, freq: 320, to: 1250, vol, q: 0.5 })
      sfx.noise({ dur: dur * 0.7, freq: 1250, to: 380, vol: vol * 0.8, q: 0.5, delay: dur * 0.4 })
    },
    breeze() {
      sfx.noise({ dur: 0.7, freq: 2400, to: 3400, vol: 0.02, filter: 'highpass' })
    },
    hum(step: number, delay = 0, dur = 1.1) {
      const f = sfx.scale(step)
      sfx.tone({ freq: f, dur, vol: 0.06, delay, attack: 0.14 })
      sfx.tone({ freq: f / 2, dur: dur * 0.9, type: 'triangle', vol: 0.016, delay, attack: 0.2 })
    },
  }

  const SANDS = ['#e9c88e', '#d9b376', '#f2d9a6', '#c79f66']
  const grains = (x: number, y: number, z: number, count: number, speed = 150) => {
    const [px, py] = toScreen(x, y, z)
    fx.burst(px, py, { count, color: SANDS, speed, life: 0.42, size: 3.6, gravity: 720, angle: -Math.PI / 2, spread: 1.9, drag: 0.95 })
  }
  const ripple = (x: number, y: number, z: number, size = 0.5, life = 1.1) => {
    let r = ripples[0]
    for (const c of ripples) if (c.t / c.life > r.t / r.life) r = c
    r.t = 0
    r.life = life
    r.size = size
    r.mesh.position.set(x, y + 0.012, z)
    r.mesh.visible = true
  }

  // ---------------------------------------------------------------- items
  const items: Item[] = []
  let occDirty = true

  const addItem = (kind: Kind, obj: THREE.Object3D, x: number, z: number, variant: number, pick: number): Item => {
    const it: Item = {
      kind,
      obj,
      x,
      z,
      cx: x,
      cz: z,
      lift: 0,
      held: false,
      yaw: 0,
      variant,
      grow: 0,
      gone: false,
      wall: false,
      nx: 0,
      ny: 1,
      nz: 0,
      placed: false,
      homeX: x,
      homeZ: z,
      pick,
      fill: 0,
      shownFill: 0,
      load: 0,
      pour: 0,
      settle: 0,
      lit: 0,
      crab: false,
      ox: x,
      oz: z,
    }
    scene.add(obj)
    items.push(it)
    return it
  }

  const addMould = (kind: Mould, prop: MouldProp, x: number, z: number, fill: number) => {
    const it = addItem(kind, prop.group, x, z, 0, kind === 'bucket' ? 72 : 64)
    it.mould = prop
    prop.group.rotation.order = 'YXZ'
    it.fill = fill
    it.shownFill = fill
    it.grow = 1
    prop.setFill(fill)
    return it
  }
  const bucket = addMould('bucket', makeBucket(mat), -3.3, 3.72, 1)
  addMould('cone', makeCone(mat), -2.35, 3.98, 1)
  addMould('wall', makeWallMould(mat), -1.3, 3.72, 1)
  const spadeProp = makeSpade(mat)
  const spade = addItem('spade', spadeProp.group, -4.15, 3.42, 0, 58)
  spade.spade = spadeProp
  spade.grow = 1
  spade.yaw = 0.5

  const BAG: Treasure[] = ['scallop', 'snail', 'pebble', 'feather', 'feather', 'wood', 'weed', 'scallop']
  const strewTreasures = () => {
    const kinds: Treasure[] = ['scallop', 'snail', 'pebble', 'feather', 'wood', 'weed']
    while (kinds.length < 10) kinds.push(BAG[Math.floor(stage.rand() * BAG.length)])
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(stage.rand() * (i + 1))
      const tmp = kinds[i]
      kinds[i] = kinds[j]
      kinds[j] = tmp
    }
    // Driftwood is long: keep it out of the last places by the grass.
    for (const i of [8, 9]) {
      const j = kinds.findIndex((k, at) => at < 6 && k !== 'wood')
      if (kinds[i] === 'wood' && j >= 0) {
        kinds[i] = kinds[j]
        kinds[j] = 'wood'
      }
    }
    kinds.forEach((kind, i) => {
      const row = i % 2
      const col = Math.floor(i / 2)
      const x = Math.min(4.1, 0.12 + col * 0.88 + row * 0.44 + (stage.rand() - 0.5) * 0.1)
      const z = (row === 0 ? 3.4 : 4.02) + (stage.rand() - 0.5) * 0.12
      const variant = Math.floor(stage.rand() * 12)
      const it = addItem(kind, makeTreasure(kind, variant, mat), x, z, variant, kind === 'wood' ? 62 : 54)
      it.yaw = kind === 'feather' ? (stage.rand() - 0.5) * 0.8 : kind === 'wood' || kind === 'weed' ? (stage.rand() - 0.5) * 0.7 : stage.rand() * TAU
      if (kind === 'weed') {
        const p = (obj(it).geometry.getAttribute('position').array as Float32Array).slice()
        it.flat = p
        obj(it).frustumCulled = false
      }
      if (isShell(kind)) {
        it.glow = new THREE.Sprite(glowMat.clone())
        it.glow.scale.set(1.05, 1.05, 1)
        it.glow.visible = false
        scene.add(it.glow)
      }
    })
    occDirty = true
  }
  const obj = (it: Item) => it.obj as THREE.Mesh
  strewTreasures()

  const removeItem = (it: Item) => {
    scene.remove(it.obj)
    obj(it).geometry?.dispose()
    if (it.glow) {
      scene.remove(it.glow)
      it.glow.material.dispose()
    }
    items.splice(items.indexOf(it), 1)
  }

  const m4 = new THREE.Matrix4()
  const bx = new THREE.Vector3()
  const by = new THREE.Vector3()
  const bz = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)

  const groundFor = (it: Item, x: number, z: number) => {
    let g = terrain.topAt(x, z)
    // At high tide wooden things float.
    if ((isMould(it.kind) || it.kind === 'spade' || it.kind === 'wood') && shown - 0.06 > g) g = shown - 0.06 + Math.sin(stage.time * 1.3 + x * 3) * 0.012
    return g
  }

  const poseItem = (it: Item, dt: number) => {
    it.cx = damp(it.cx, it.x, it.held ? 32 : 5, dt)
    it.cz = damp(it.cz, it.z, it.held ? 32 : 5, dt)
    it.lift = damp(it.lift, it.held ? 1 : 0, 13, dt)
    it.grow = damp(it.grow, it.gone ? 0 : 1, it.gone ? 3.2 : 6, dt)
    it.settle = Math.max(0, it.settle - dt * 3.2)
    const o = it.obj
    const t = stage.time
    const g = groundFor(it, it.cx, it.cz)
    const s = it.grow
    const wob = Math.sin(it.settle * 12) * it.settle * 0.12
    o.scale.setScalar(Math.max(0.001, s * (isMould(it.kind) || it.kind === 'spade' ? 1 : TREASURE_SIZE * (it.wall && !it.held ? 0.82 : 1))))
    o.rotation.set(0, 0, 0)

    if (isMould(it.kind) && it.mould) {
      it.shownFill = damp(it.shownFill, it.fill, 9, dt)
      it.mould.setFill(it.shownFill)
      if (it.turn) return
      o.position.set(it.cx, g + it.mould.half - it.mould.sunk * (1 - it.lift) + it.lift * 0.5, it.cz)
      o.rotation.set(wob * 0.6, it.yaw, wob + it.lift * Math.sin(t * 5) * 0.03)
      // A full bucket left alone gives the smallest wobble now and then.
      if (it === bucket && it.fill >= 1 && phase === 'day' && built === 0 && t - lastTouch > 7) {
        const u = (t % 5.5) / 0.7
        if (u < 1) o.rotation.z += Math.sin(u * TAU * 2) * 0.045 * Math.sin(u * Math.PI)
      }
      return
    }
    if (it.kind === 'spade' && it.spade) {
      it.pour = Math.max(0, it.pour - dt * 2.4)
      it.spade.setLoad(it.load)
      const carried = it.lift
      o.position.set(it.cx, g - 0.1 * (1 - carried) + carried * (it.load >= 1 ? 0.28 : 0.04), it.cz)
      o.rotation.set(lerp(-0.34, -0.2, carried) + it.pour * 0.5 + wob, it.yaw * (1 - carried), lerp(0.16, 0.34, carried) + it.pour * 0.8)
      // When every mould is empty and nothing is happening, the spade stirs.
      if (phase === 'day' && !it.held && t - lastTouch > 8 && items.every((m) => !isMould(m.kind) || m.fill < 0.99)) {
        const u = (t % 6) / 0.8
        if (u < 1) o.rotation.z += Math.sin(u * TAU * 2) * 0.07 * Math.sin(u * Math.PI)
      }
      return
    }
    if (it.kind === 'weed' && it.flat) {
      // Draped vertex by vertex over whatever sand is under it.
      const mesh = obj(it)
      const attr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      const p = attr.array as Float32Array
      const c = Math.cos(it.yaw)
      const sn = Math.sin(it.yaw)
      const count = (WEED_SEGMENTS + 1) * 3
      const sway = shown > g + 0.02 ? 1 : 0
      for (let i = 0; i < count; i++) {
        const lx = it.flat[i * 3] * s * TREASURE_SIZE
        const lz = it.flat[i * 3 + 2] * s * TREASURE_SIZE + sway * Math.sin(t * 1.4 + lx * 4) * 0.035
        const wx = it.cx + c * lx - sn * lz
        const wz = it.cz + sn * lx + c * lz
        const lay = terrain.topAt(wx, wz) + it.flat[i * 3 + 1]
        p[i * 3] = wx
        p[i * 3 + 1] = lerp(lay, g + 0.5 - Math.abs(lx) * 0.42 + Math.sin(t * 6 + lx * 5) * 0.015, it.lift)
        p[i * 3 + 2] = wz
      }
      attr.needsUpdate = true
      mesh.geometry.computeVertexNormals()
      o.position.set(0, 0, 0)
      o.scale.setScalar(1)
      return
    }
    if (it.kind === 'feather') {
      const flutter = Math.sin(t * 2.7 + it.variant) * (0.06 + dusk * 0.05) + Math.sin(t * 6.1 + it.variant * 2) * 0.02
      if (!it.placed && !it.held && it.lift < 0.05) {
        // Lying on the dry sand until it is stood somewhere.
        o.position.set(it.cx, g + 0.03, it.cz)
        o.rotation.set(1.45, it.yaw, 0)
        o.rotation.order = 'YXZ'
        return
      }
      o.rotation.order = 'YXZ'
      o.position.set(it.cx, g + it.lift * 0.42, it.cz)
      o.rotation.set(lerp(0.12, 0.5, it.lift) + wob, it.yaw * 0.3, -0.16 + flutter)
      return
    }
    if (it.wall && it.lift < 0.5) {
      // Pressed into a wall: its back against the sand, its arch upward.
      by.set(it.nx, it.ny, it.nz)
      bz.copy(up).addScaledVector(by, -up.dot(by)).normalize().negate()
      bx.crossVectors(by, bz).normalize()
      const out = it.kind === 'snail' ? 0.02 : it.kind === 'pebble' ? -0.04 : 0.0
      if (it.kind === 'snail') {
        // A snail shell keeps upright, its mouth facing out of the wall.
        o.position.set(it.cx + it.nx * out, g - 0.06, it.cz + it.nz * out)
        o.rotation.set(0, Math.atan2(it.nx, it.nz), 0)
      } else {
        m4.makeBasis(bx, by, bz)
        o.quaternion.setFromRotationMatrix(m4)
        o.position.set(it.cx + it.nx * out, g + it.ny * out + 0.02, it.cz + it.nz * out)
      }
      if (it.crab) o.position.y += Math.abs(Math.sin(t * 5)) * 0.01
      return
    }
    const float = it.kind === 'wood' ? Math.max(g, groundFor(it, it.cx + Math.cos(it.yaw) * 0.55, it.cz - Math.sin(it.yaw) * 0.55), groundFor(it, it.cx - Math.cos(it.yaw) * 0.55, it.cz + Math.sin(it.yaw) * 0.55)) : g
    o.position.set(it.cx, float + it.lift * 0.42 + (it.crab ? 0.07 + Math.abs(Math.sin(t * 4.2)) * 0.012 : 0), it.cz)
    o.rotation.set(it.kind === 'scallop' ? -0.3 + wob : wob, it.yaw, it.lift * Math.sin(t * 5 + it.variant) * 0.06 + (it.crab ? Math.sin(t * 2.1) * 0.12 : 0))
    o.rotation.order = 'YXZ'
  }

  const occluders = () => {
    const list: Occluder[] = []
    for (const it of items) {
      if (it.turn || it.gone || it.grow < 0.6) continue
      if (it.held) {
        // Something carried lays a small soft shadow on the sand under it.
        if (it.kind !== 'feather' && it.kind !== 'weed') list.push({ x: it.cx, z: it.cz, r: isMould(it.kind) ? 0.4 : 0.2, h: 0.1 })
        continue
      }
      if (it.kind === 'bucket') list.push({ x: it.x, z: it.z, r: 0.5, h: 0.95 })
      else if (it.kind === 'cone') list.push({ x: it.x, z: it.z, r: 0.3, h: 0.72 })
      else if (it.kind === 'wall') {
        for (const s of [-0.36, 0, 0.36]) list.push({ x: it.x + Math.cos(it.yaw) * s, z: it.z - Math.sin(it.yaw) * s, r: 0.27, h: 0.6 })
      }
      else if (it.kind === 'pebble') list.push({ x: it.x, z: it.z, r: 0.19, h: 0.16 })
      else if (it.kind === 'snail') list.push({ x: it.x, z: it.z, r: 0.2, h: 0.3 })
      else if (it.kind === 'scallop' && !it.wall) list.push({ x: it.x, z: it.z, r: 0.22, h: 0.1 })
      else if (it.kind === 'wood') {
        for (const s of [-0.5, 0, 0.5]) list.push({ x: it.x + Math.cos(it.yaw) * s, z: it.z - Math.sin(it.yaw) * s, r: 0.11, h: 0.15 })
      }
    }
    terrain.setOccluders(list)
  }

  // Turn a full mould out where it was let go.
  const turnOut = (it: Item) => {
    // The empty mould goes back to its place on the dry sand afterwards.
    const tx = it.homeX
    const tz = it.homeZ
    // A wall reaches toward the nearest tower, if one stands close by.
    let yaw = 0
    if (it.kind === 'wall') {
      const tower = terrain.nearestTower(it.x, it.z)
      if (tower) {
        yaw = Math.atan2(tower.z - it.z, tower.x - it.x)
        if (yaw > Math.PI / 2) yaw -= Math.PI
        if (yaw < -Math.PI / 2) yaw += Math.PI
      }
    }
    it.turn = { t: 0, x: it.x, z: it.z, y0: it.obj.position.y, ref: Math.max(terrain.heightAt(it.x, it.z), terrain.baseHeight(it.x, it.z)), stamped: false, taps: 0, lifted: false, tx, tz, yaw }
    sfx.noise({ dur: 0.18, freq: 600, to: 1500, vol: 0.035, q: 0.8 })
  }

  const runTurn = (it: Item, dt: number) => {
    const tr = it.turn
    const prop = it.mould
    if (!tr || !prop) return
    tr.t += dt
    const o = it.obj
    const kind = it.kind as Mould
    const A = 0.34
    const B = 0.56
    const C = 0.5
    const D = 0.62
    const restY = () => tr.ref + MOULD_HEIGHT[kind] - prop.half + 0.03
    if (tr.t < A) {
      const u = tr.t / A
      o.position.set(tr.x, lerp(tr.y0, restY(), u * u) + Math.sin(u * Math.PI) * 0.32, tr.z)
      o.rotation.set(Math.PI * ease.inOutQuad(u), -tr.yaw * ease.inOutQuad(u), 0)
      return
    }
    if (!tr.stamped) {
      tr.stamped = true
      tr.ref = terrain.stamp(kind, tr.x, tr.z, tr.yaw)
      it.fill = 0
      it.shownFill = 0
      prop.setFill(0)
      built++
      snd.thump()
      grains(tr.x, tr.ref + 0.05, tr.z + 0.3, 12, 190)
      occDirty = true
    }
    if (tr.t < A + B) {
      const b = tr.t - A
      // Down with a thump, then two small taps on its bottom to loosen it.
      let dip = Math.exp(-b * 16) * 0.05
      for (const [n, at] of [
        [1, 0.2],
        [2, 0.36],
      ]) {
        if (b > at) {
          if (tr.taps < n) {
            tr.taps = n
            snd.tap()
          }
          dip += Math.exp(-(b - at) * 22) * 0.028
        }
      }
      o.position.set(tr.x, restY() - dip, tr.z)
      o.rotation.set(Math.PI, -tr.yaw, 0)
      return
    }
    if (tr.t < A + B + C) {
      const u = (tr.t - A - B) / C
      if (!tr.lifted) {
        tr.lifted = true
        snd.release()
        grains(tr.x, tr.ref + 0.3, tr.z + 0.35, 7, 90)
      }
      o.position.set(tr.x, restY() + 1.3 * ease.outCubic(u), tr.z)
      o.rotation.set(Math.PI, -tr.yaw, Math.sin(u * 14) * 0.05 * (1 - u))
      return
    }
    const far = Math.hypot(tr.tx - tr.x, tr.tz - tr.z)
    const u = Math.min(1, (tr.t - A - B - C) / (D + far * 0.1))
    const e = ease.inOutQuad(u)
    const landY = terrain.topAt(tr.tx, tr.tz) + prop.half - prop.sunk
    o.position.set(lerp(tr.x, tr.tx, e), lerp(restY() + 1.3, landY, e * e) + Math.sin(u * Math.PI) * (0.12 + far * 0.07), lerp(tr.z, tr.tz, e))
    o.rotation.set(Math.PI * (1 - e), -tr.yaw * (1 - e), 0)
    if (u >= 1) {
      it.turn = undefined
      it.x = it.cx = tr.tx
      it.z = it.cz = tr.tz
      it.settle = 0.6
      snd.wood(kind === 'bucket' ? 0.8 : 1.1)
      occDirty = true
    }
  }

  // ------------------------------------------------------------- sea folk
  const crabMesh = makeCrab(mat)
  crabMesh.visible = false
  scene.add(crabMesh)
  const crab = { on: false, x: 0, z: 0, tx: 0, tz: 0, state: 'walk' as 'walk' | 'home' | 'roam', shell: null as Item | null, bridge: null as Item | null, path: [] as [number, number][], grow: 0, pause: 0, cx: 0, cz: 0, step: 0 }

  const mer = makeMerChild(mat)
  mer.group.visible = false
  scene.add(mer.group)
  const child = { on: false, state: 'swim' as 'swim' | 'climb' | 'sit', x: 0, y: 0, z: 0, fx: 0, fz: 0, t: 0, grow: 0, sing: 0, nextSong: 0, onRock: false, look: 0 }

  const stars = [0, 1, 2].map((i) => {
    const mesh = makeStarfish(i, mat)
    mesh.visible = false
    scene.add(mesh)
    return { mesh, on: false, x: 0, z: 0, tx: 0, tz: 0, grow: 0, spin: i * 1.3, arrived: false, nx: 0, ny: 1, nz: 0, rock: false }
  })
  const fishes = [0, 1, 2].map((i) => {
    const mesh = makeFish(mat)
    mesh.visible = false
    scene.add(mesh)
    return { mesh, on: false, x: 0, z: 0, a: Math.PI / 2, grow: 0, seed: i * 2.1 }
  })
  let goal = { x: 0, z: -0.8 }
  let folkGone = false

  // Where the mer-child sits: the front edge of the highest place, beside
  // (not on) whatever the child stood up there; with nothing built, the big
  // rock by the pool. Looked for afresh twice a second, as the tide works.
  let seat = { x: 0, y: 0, z: 0, rock: true }
  let seatAt = -9
  let seatSide: [number, number] | null = null
  const seatOf = () => {
    if (stage.time - seatAt < 0.5) {
      if (!seat.rock) seat.y = terrain.heightAt(seat.x, seat.z)
      return seat
    }
    seatAt = stage.time
    const top = terrain.highest()
    if (top.rise > 0.3) {
      if (!seatSide) {
        let room = -1
        for (const c of [
          [0, 0.2],
          [-0.24, 0.13],
          [0.24, 0.13],
        ] as [number, number][]) {
          let near = 9
          for (const it of items) {
            if (!it.placed || it.gone || isMould(it.kind)) continue
            near = Math.min(near, Math.hypot(it.x - (top.x + c[0]), it.z - (top.z + c[1])))
          }
          if (near > room + 0.08) {
            room = near
            seatSide = c
          }
        }
      }
      const side = seatSide ?? [0, 0.2]
      const x = top.x + side[0]
      const z = top.z + side[1]
      seat = { x, y: terrain.heightAt(x, z), z, rock: false }
    } else {
      const r = ROCKS[0]
      seat = { x: r.x + 0.1, y: terrain.topAt(r.x + 0.1, r.z + 0.16) - 0.03, z: r.z + 0.16, rock: true }
    }
    return seat
  }

  // The shell the crab would choose: one pressed into a wall, low down, like
  // a doorway; failing that, any shell the child laid on the damp sand.
  const bestShell = (): Item | null => {
    let best: Item | null = null
    let score = -1
    for (const it of items) {
      if (!isShell(it.kind) || !it.placed || it.gone || it.z > DRY_Z + 0.2) continue
      const rise = terrain.rise(it.x, it.z)
      const s = (it.wall ? 4 : 0) + (rise > 0.12 ? 2 : 0) - rise * 0.8 + (it.kind === 'scallop' ? 0.3 : 0.5)
      if (s > score) {
        score = s
        best = it
      }
    }
    return best
  }

  const findPerches = () => {
    const found: { x: number; z: number; score: number }[] = []
    for (let j = 3; j < NZ - 3; j += 2) {
      const z = Z0 + j * CELL
      if (z > DRY_Z) break
      for (let i = 3; i < NX - 3; i += 2) {
        const k = j * NX + i
        const y = terrain.h[k]
        const rise = y - terrain.base[k]
        if (rise < 0.14 || y < TIDE_LEVEL + 0.05 || y > TIDE_LEVEL + 0.55) continue
        const x = X0 + i * CELL
        const n = terrain.normalAt(x, z)
        if (n[2] < 0.15 && n[1] < 0.9) continue
        found.push({ x, z, score: n[2] * 2 - (y - TIDE_LEVEL) + Math.sin(i * 12.9 + j * 78.2) * 0.4 })
      }
    }
    found.sort((a, b) => b.score - a.score)
    const picked: { x: number; z: number; rock: boolean }[] = []
    for (const f of found) {
      if (picked.every((p) => Math.hypot(p.x - f.x, p.z - f.z) > 0.75)) picked.push({ x: f.x, z: f.z, rock: false })
      if (picked.length === 3) break
    }
    // No walls: the rocks will do.
    const spare = [
      { x: ROCKS[2].x + 0.05, z: ROCKS[2].z + 0.2, rock: true },
      { x: ROCKS[1].x - 0.1, z: ROCKS[1].z + 0.22, rock: true },
      { x: ROCKS[4].x, z: ROCKS[4].z + 0.05, rock: true },
    ]
    while (picked.length < 3) picked.push(spare[picked.length])
    return picked
  }

  const startNight = () => {
    phase = 'night'
    nightT = 0
    levelFrom = level
    erodeAcc = 0
    folkGone = false
    seatAt = -9
    seatSide = null
    snd.wave(0.07, 3)
    // Whatever was left out on the damp sand, the first wave carries home.
    for (const it of items) {
      if ((isMould(it.kind) || it.kind === 'spade') && it.z < DRY_Z + 0.25 && !it.turn) {
        it.x = it.homeX
        it.z = it.homeZ
        it.load = 0
      }
    }
    for (const [id, h] of holds) if (h.kind !== 'sun') holds.set(id, { kind: 'none' })
    for (const it of items) it.held = false
    occDirty = true
    const top = terrain.highest()
    goal = top.rise > 0.3 ? { x: top.x, z: top.z } : { x: 0, z: -0.8 }
    crab.on = false
    child.on = false
    for (const s of stars) s.on = false
    for (const f of fishes) f.on = false
  }

  const startDawn = () => {
    phase = 'dawn'
    dawnT = 0
    folkGone = true
    snd.wave(0.07, 3.2)
    for (const it of items) if (!isMould(it.kind) && it.kind !== 'spade') it.gone = true
    occDirty = true
    if (child.on) {
      const s = child
      ripple(s.x, shown, s.z + 0.5, 0.7, 1.4)
    }
  }

  const sing = () => {
    // A few slow notes that wander down to rest.
    let step = 2 + Math.floor(Math.random() * 3)
    const count = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      snd.hum(i === count - 1 ? (Math.random() < 0.5 ? 0 : 2) : step, i * 0.66, i === count - 1 ? 1.7 : 1.05)
      step = clamp(step + (Math.random() < 0.6 ? -1 : 1) * (1 + Math.floor(Math.random() * 2)), 0, 6)
    }
    child.sing = count * 0.66 + 1.2
  }

  const updateFolk = (dt: number) => {
    const t = stage.time
    const night = phase === 'night'

    // Minnows come first, as soon as there is water to swim in.
    fishes.forEach((f, i) => {
      if (night && !f.on && nightT > 4 + i * 1.6) {
        f.on = true
        f.x = goal.x + (i - 1) * 1.4
        f.z = Z0 + 0.3
        f.a = Math.PI / 2
        f.grow = 0
      }
      if (!f.on) return
      f.grow = damp(f.grow, folkGone ? 0 : 1, 3, dt)
      const depthAt = (a: number) => shown - terrain.topAt(f.x + Math.cos(a) * 0.4, f.z + Math.sin(a) * 0.4)
      const ahead = depthAt(f.a)
      const left = depthAt(f.a - 0.75)
      const right = depthAt(f.a + 0.75)
      let turn = 0
      if (left > ahead + 0.01 && left >= right) turn = -1
      else if (right > ahead + 0.01) turn = 1
      if (ahead < 0.05) turn = left > right ? -1.6 : 1.6
      // Keep near what was built, and inside the picture.
      const home = Math.atan2(goal.z - f.z, goal.x - f.x)
      const far = Math.hypot(goal.x - f.x, goal.z - f.z)
      if (far > 2.4 || Math.abs(f.x) > reach(f.z) - 0.5 || f.z < Z0 + 0.25) {
        let da = home - f.a
        while (da > Math.PI) da -= TAU
        while (da < -Math.PI) da += TAU
        turn += clamp(da, -1, 1) * 1.2
      }
      turn += Math.sin(t * 0.9 + f.seed * 3) * 0.5
      f.a += turn * dt * 1.5
      const speed = 0.5 + Math.sin(t * 1.3 + f.seed) * 0.15
      const nx = f.x + Math.cos(f.a) * speed * dt
      const nz = f.z + Math.sin(f.a) * speed * dt
      if (shown - terrain.topAt(nx, nz) > 0.035) {
        f.x = nx
        f.z = nz
      } else f.a += dt * 3
      const depth = shown - terrain.topAt(f.x, f.z)
      f.mesh.visible = f.grow > 0.02
      f.mesh.position.set(f.x, shown - clamp(depth * 0.55, 0.03, 0.09), f.z)
      f.mesh.rotation.set(0, -f.a + Math.sin(t * 9 + f.seed) * 0.22, 0)
      f.mesh.scale.setScalar(Math.max(0.001, f.grow))
    })

    // The hermit crab walks up out of the sea to the shell it likes best.
    if (night && !crab.on && nightT > 7) {
      crab.on = true
      crab.grow = 0
      crab.shell = bestShell()
      crab.state = 'walk'
      crab.path = []
      crab.bridge = null
      const s = crab.shell
      if (s) {
        // Round the side of things rather than over the top, and across the
        // driftwood bridge if the child laid one over a moat.
        crab.path.push([s.x + 1.3, s.z - 0.5])
        const bridge = items.find((w) => w.kind === 'wood' && w.placed && !w.gone && terrain.rise(w.x, w.z) < -0.04 && Math.hypot(w.x - s.x, w.z - s.z) < 3.4)
        if (bridge) {
          const ax = Math.cos(bridge.yaw) * 0.62
          const az = -Math.sin(bridge.yaw) * 0.62
          const a: [number, number] = [bridge.x + ax, bridge.z + az]
          const b: [number, number] = [bridge.x - ax, bridge.z - az]
          const aFar = Math.hypot(a[0] - s.x, a[1] - s.z) > Math.hypot(b[0] - s.x, b[1] - s.z)
          crab.path.push(aFar ? a : b, aFar ? b : a)
          crab.bridge = bridge
        }
        crab.path.push([s.x + (s.wall ? s.nx * 0.4 : 0.25), s.z + (s.wall ? s.nz * 0.4 : 0.2) + 0.2])
        crab.path.push([s.x, s.z + (s.wall ? 0.1 : 0)])
      } else {
        crab.path.push([goal.x + 0.9, Math.min(DRY_Z - 0.4, goal.z + 1.3)])
      }
      const first = crab.path.shift() as [number, number]
      crab.tx = first[0]
      crab.tz = first[1]
      crab.x = first[0] + 0.5
      crab.z = Z0 + 0.4
    }
    if (crab.on) {
      crab.grow = damp(crab.grow, folkGone ? 0 : 1, 3, dt)
      const dx = crab.tx - crab.x
      const dz = crab.tz - crab.z
      const d = Math.hypot(dx, dz)
      let moving = false
      if (crab.state === 'walk' || (crab.state === 'roam' && crab.pause <= 0)) {
        if (d > 0.06) {
          const sp = (crab.state === 'walk' ? 0.62 : 0.3) * dt
          crab.x += (dx / d) * Math.min(d, sp)
          crab.z += (dz / d) * Math.min(d, sp)
          moving = true
          crab.step += dt
          if (crab.step > 0.24) {
            crab.step = 0
            sfx.tone({ freq: 2100 + Math.random() * 500, dur: 0.015, type: 'triangle', vol: 0.012 })
          }
        } else if (crab.state === 'walk' && crab.path.length > 0) {
          const next = crab.path.shift() as [number, number]
          crab.tx = next[0]
          crab.tz = next[1]
        } else if (crab.state === 'walk') {
          crab.cx = crab.x
          crab.cz = crab.z
          if (crab.shell && !crab.shell.gone) {
            crab.state = 'home'
            crab.shell.crab = true
            crab.shell.settle = 0.7
            snd.shell()
            stage.after(0.16, () => snd.shell())
          } else crab.state = 'roam'
        } else {
          crab.pause = 1.5 + Math.random() * 3
          crab.tx = crab.cx + (Math.random() - 0.5) * 1.3
          crab.tz = crab.cz + (Math.random() - 0.5) * 0.4
        }
      }
      crab.pause -= dt
      let y = terrain.topAt(crab.x, crab.z)
      const br = crab.bridge
      if (br && Math.hypot(br.x - crab.x, br.z - crab.z) < 0.66) y = Math.max(y, br.obj.position.y + 0.1 * TREASURE_SIZE)
      const m = crabMesh
      m.visible = crab.grow > 0.02
      if (crab.state === 'home' && crab.shell) {
        const s = crab.shell
        // Tucked under its shell, eyes out toward the child.
        const peek = 0.5 + 0.5 * Math.sin(t * 0.8)
        if (s.wall) m.position.set(s.cx + s.nx * 0.1, terrain.heightAt(s.cx, s.cz) - 0.1, s.cz + s.nz * 0.1 + 0.05)
        else m.position.set(s.cx + 0.03, y - 0.02, s.cz + 0.1 + peek * 0.03)
        m.rotation.set(0, Math.sin(t * 0.7) * 0.25, 0)
        m.scale.setScalar(Math.max(0.001, crab.grow * 0.92))
      } else {
        m.position.set(crab.x, y + (moving ? Math.abs(Math.sin(t * 13)) * 0.02 : 0), crab.z)
        // Sideways, as crabs go.
        m.rotation.set(0, moving ? Math.atan2(dx, dz) + Math.PI / 2 : m.rotation.y, moving ? Math.sin(t * 13) * 0.1 : 0)
        m.scale.setScalar(Math.max(0.001, crab.grow))
      }
    }

    // Starfish crawl in and settle on the walls at the water's edge.
    if (night && !stars[0].on && nightT > 8.5) {
      const perches = findPerches()
      stars.forEach((s, i) => {
        s.on = true
        s.grow = 0
        s.arrived = false
        s.tx = perches[i].x
        s.tz = perches[i].z
        s.rock = perches[i].rock
        s.x = perches[i].x + (i - 1) * 0.7
        s.z = Z0 + 0.3 - i * 0.5
      })
    }
    for (const s of stars) {
      if (!s.on) continue
      s.grow = damp(s.grow, folkGone ? 0 : 1, 3, dt)
      const dx = s.tx - s.x
      const dz = s.tz - s.z
      const d = Math.hypot(dx, dz)
      if (s.z < Z0 + 0.25) s.z += dt * 0.5
      else if (d > 0.03) {
        const sp = 0.5 * dt
        s.x += (dx / d) * Math.min(d, sp)
        s.z += (dz / d) * Math.min(d, sp)
        s.spin += dt * 0.5
      } else if (!s.arrived) {
        s.arrived = true
        sfx.noise({ dur: 0.1, freq: 600, vol: 0.025, filter: 'lowpass' })
      }
      const n = s.rock ? ([0, 1, 0] as [number, number, number]) : terrain.normalAt(s.x, s.z)
      s.nx = damp(s.nx, n[0], 6, dt)
      s.ny = damp(s.ny, n[1], 6, dt)
      s.nz = damp(s.nz, n[2], 6, dt)
      by.set(s.nx, s.ny, s.nz).normalize()
      bx.set(Math.cos(s.spin), 0, Math.sin(s.spin))
      bx.addScaledVector(by, -bx.dot(by)).normalize()
      bz.crossVectors(bx, by)
      m4.makeBasis(bx, by, bz)
      s.mesh.quaternion.setFromRotationMatrix(m4)
      const y = terrain.topAt(s.x, s.z)
      s.mesh.position.set(s.x + by.x * 0.02, y + by.y * 0.02, s.z + by.z * 0.02)
      const breathe = 1 + Math.sin(t * 0.9 + s.spin) * 0.035
      s.mesh.scale.setScalar(Math.max(0.001, s.grow * breathe))
      s.mesh.visible = s.grow > 0.02
    }

    // The mer-child swims in, climbs to the highest place there is, and sings.
    if (night && !child.on && nightT > 10.5) {
      const seat = seatOf()
      child.on = true
      child.state = 'swim'
      child.grow = 0
      child.t = 0
      child.onRock = seat.rock
      child.x = seat.x + 1.6
      child.z = Z0 - 0.1
      child.fx = seat.x + 0.25
      child.fz = seat.z - 0.75
      child.nextSong = 1.6
      child.sing = 0
    }
    if (child.on) {
      const c = child
      c.grow = damp(c.grow, folkGone ? 0 : 1, folkGone ? 2.2 : 3, dt)
      c.sing = Math.max(0, c.sing - dt)
      c.look = damp(c.look, 0, 0.6, dt)
      const g = mer.group
      g.visible = c.grow > 0.02
      const seat = seatOf()
      let yaw = 0.35
      let tilt = 0
      if (c.state === 'swim') {
        const dx = c.fx - c.x
        const dz = c.fz - c.z
        const d = Math.hypot(dx, dz)
        if (d > 0.08) {
          c.x += (dx / d) * Math.min(d, 0.75 * dt)
          c.z += (dz / d) * Math.min(d, 0.75 * dt)
        } else {
          c.state = 'climb'
          c.t = 0
          ripple(c.x, shown, c.z, 0.6, 1.2)
          snd.plink(2)
        }
        // Only her head and shoulders show above the water.
        c.y = Math.max(terrain.topAt(c.x, c.z) - 0.1, shown - 0.42 + Math.sin(t * 2.2) * 0.02)
        yaw = Math.atan2(dx, dz)
        tilt = 0.5
      } else if (c.state === 'climb') {
        c.t += dt
        const u = Math.min(1, c.t / 1.5)
        const e = ease.inOutQuad(u)
        c.x = lerp(c.fx, seat.x, e)
        c.z = lerp(c.fz, seat.z, e)
        c.y = lerp(shown - 0.42, seat.y, e) + Math.sin(u * Math.PI) * 0.45
        yaw = lerp(0, 0.35, e) + (1 - e) * 2.2
        tilt = (1 - e) * 0.4
        if (u >= 1) {
          c.state = 'sit'
          c.t = 0
        }
      } else {
        c.t += dt
        c.x = seat.x
        c.z = seat.z
        c.y = damp(c.y, seat.y, 6, dt)
        if (!folkGone) {
          c.nextSong -= dt
          if (c.nextSong <= 0) {
            sing()
            c.nextSong = c.sing + 6 + Math.random() * 5
          }
        }
        yaw = 0.35 + Math.sin(t * 0.5) * 0.08 + c.look
      }
      if (folkGone) c.y -= dt * 0.9
      g.position.set(c.x, c.y, c.z)
      g.rotation.set(tilt, yaw, Math.sin(t * 0.8) * 0.035)
      g.scale.setScalar(Math.max(0.001, c.grow * 1.15))
      mer.fin.rotation.set(Math.sin(t * 1.4) * 0.25, 0, Math.sin(t * 1.1) * 0.3)
      mer.head.rotation.set(c.sing > 0 ? -0.22 + Math.sin(t * 1.5) * 0.05 : Math.sin(t * 0.6) * 0.05, Math.sin(t * 0.4) * 0.15, 0)
      mer.mouth.scale.setScalar(c.sing > 0.6 ? 1.5 + Math.sin(t * 5) * 0.3 : 0.55)
    }

    // Windows: every shell pressed into the kingdom glows from inside.
    for (const it of items) {
      if (!it.glow) continue
      const want = night && nightT > 6 && !folkGone && it.placed && !it.crab && terrain.rise(it.x, it.z) > 0.12 ? 1 : 0
      it.lit = damp(it.lit, want, 1.2, dt)
      it.glow.visible = it.lit > 0.01
      if (it.glow.visible) {
        const p = it.obj.position
        it.glow.position.set(p.x + it.nx * 0.12, p.y + 0.1, p.z + it.nz * 0.12 + 0.06)
        it.glow.material.opacity = it.lit * (0.5 + Math.sin(t * 2.3 + it.variant) * 0.05)
      }
    }
  }

  // --------------------------------------------------------------- touch
  const holds = new Map<number, Hold>()

  const digAlong = (h: { lx: number; lz: number }, x: number, z: number): number => {
    const d = Math.hypot(x - h.lx, z - h.lz)
    if (d > 1.4) return 0
    const steps = Math.max(1, Math.ceil(d / 0.045))
    for (let s = 1; s <= steps; s++) {
      const px = lerp(h.lx, x, s / steps)
      const pz = lerp(h.lz, z, s / steps)
      if (!inPool(px, pz, 0.12) && !terrain.onRock(px, pz)) terrain.dig(px, pz, 0.62)
    }
    return d
  }

  const pickItem = (p: Pointer): Item | null => {
    let best: Item | null = null
    let bestD = 1
    for (const it of items) {
      if (it.turn || it.gone || it.grow < 0.5) continue
      const o = it.obj.position
      const points: [number, number, number][] =
        it.kind === 'spade' ? [[o.x, o.y + 0.25, o.z], [o.x, o.y + 0.8, o.z - 0.25], [o.x, o.y + 1.1, o.z - 0.4]] : it.kind === 'weed' ? [[it.cx, terrain.topAt(it.cx, it.cz), it.cz]] : it.kind === 'feather' && it.placed ? [[o.x, o.y + 0.5, o.z], [o.x, o.y + 0.15, o.z]] : [[o.x, o.y + (isMould(it.kind) ? 0 : 0.08), o.z]]
      for (const q of points) {
        const [sx, sy] = toScreen(q[0], q[1], q[2])
        const d = Math.hypot(sx - p.x, sy - p.y) / it.pick
        if (d < bestD) {
          bestD = d
          best = it
        }
      }
    }
    return best
  }

  const pickSound = (it: Item) => {
    if (isMould(it.kind)) snd.wood(it.kind === 'bucket' ? 0.75 : 1.05)
    else if (it.kind === 'spade') snd.wood(1.3)
    else if (it.kind === 'feather') snd.feather()
    else if (it.kind === 'weed') snd.weed()
    else if (it.kind === 'wood') snd.wood(0.6)
    else if (it.kind === 'pebble') snd.pebble()
    else snd.shell()
  }

  const setDown = (it: Item) => {
    it.held = false
    it.settle = 0.5
    occDirty = true
    let x = it.x
    let z = it.z
    const y = terrain.topAt(x, z)
    if (isMould(it.kind)) {
      const canBuild = it.fill >= 0.99 && z < DRY_Z - 0.05 && !inPool(x, z, 0.45) && !terrain.onRock(x, z) && shown < terrain.baseHeight(x, z) + 0.04
      if (canBuild) turnOut(it)
      else snd.wood(it.kind === 'bucket' ? 0.8 : 1.1)
      return
    }
    if (it.kind === 'spade') {
      it.yaw = 0.5
      snd.wood(1.2)
      sfx.noise({ dur: 0.08, freq: 900, vol: 0.05, q: 0.8 })
      return
    }
    it.placed = z < DRY_Z + 0.5
    let n = terrain.normalAt(x, z)
    let steep = n[1] < 0.72 && !terrain.onRock(x, z)
    const pressable = it.kind === 'scallop' || it.kind === 'snail' || it.kind === 'pebble'
    if (pressable && !steep && it.placed) {
      // Let go at the foot of a wall, it is pressed into the wall: a door.
      let best = 0.72
      for (let a = 0; a < 8; a++) {
        const qx = x + Math.cos((a / 8) * TAU) * 0.24
        const qz = z + Math.sin((a / 8) * TAU) * 0.24
        const qn = terrain.normalAt(qx, qz)
        if (qn[1] < best && terrain.rise(qx, qz) > 0.2 && !terrain.onRock(qx, qz)) {
          best = qn[1]
          n = qn
          steep = true
          it.x = qx
          it.z = qz
        }
      }
    }
    it.wall = steep && pressable
    x = it.x
    z = it.z
    if (it.wall) {
      const l = Math.hypot(n[0], n[2]) || 1
      // Mostly outward, so it reads as a door or a window.
      it.nx = (n[0] / l) * 0.94
      it.ny = 0.34
      it.nz = (n[2] / l) * 0.94
    } else {
      it.nx = 0
      it.ny = 1
      it.nz = 0
    }
    if (it.kind === 'wood') {
      // Laid across a moat it turns to bridge it.
      let best = it.yaw
      let most = -1
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI
        const along = terrain.heightAt(x + Math.cos(ang) * 0.55, z - Math.sin(ang) * 0.55) + terrain.heightAt(x - Math.cos(ang) * 0.55, z + Math.sin(ang) * 0.55)
        const score = along / 2 - terrain.heightAt(x, z)
        if (score > most) {
          most = score
          best = ang
        }
      }
      if (most > 0.07) it.yaw = best
      snd.wood(0.62)
    } else if (it.kind === 'feather') {
      snd.feather()
      sfx.noise({ dur: 0.05, freq: 1100, vol: 0.035, q: 1 })
    } else if (it.kind === 'weed') snd.weed()
    else if (it.kind === 'pebble') {
      snd.pebble()
      if (it.wall) snd.pat()
    } else {
      snd.shell()
      if (it.wall) snd.pat()
    }
    if (it.placed) {
      built++
      grains(x, y + 0.05, z, it.wall ? 6 : 3, 90)
    }
  }

  const waterAt = (x: number, z: number) => shown - terrain.heightAt(x, z) > 0.012

  const game: Game = {
    update(dt) {
      const t = stage.time
      const began = performance.now()

      // The sun settles where it is left: up for day, down for evening.
      let sunHeld = false
      for (const h of holds.values()) if (h.kind === 'sun') sunHeld = true
      if (!sunHeld) sunY = damp(sunY, phase === 'night' ? horizon + 4 : SUN_DAY, phase === 'night' ? 3 : 2.2, dt)
      if (phase === 'day' && sunY > horizon - 18) startNight()
      else if (phase === 'night' && sunY < horizon - 48 && nightT > 1) startDawn()
      dusk = clamp((sunY - SUN_DAY) / (horizon - SUN_DAY), 0, 1)

      // The sea.
      if (phase === 'night') {
        nightT += dt
        const first = Math.max(levelFrom, 0)
        level = nightT < 5 ? lerp(levelFrom, first, ease.inOutQuad(nightT / 5)) : lerp(first, TIDE_LEVEL, ease.inOutQuad(clamp((nightT - 5) / TIDE_SECONDS, 0, 1)))
        if (nightT > 1.5 && nightT < 5 + TIDE_SECONDS + 7) {
          erodeAcc += dt
          if (erodeAcc > 0.09) {
            erodeAcc = 0
            terrain.erode(level)
          }
        }
      } else if (phase === 'dawn') {
        dawnT += dt
        if (dawnT < MELT_SECONDS) terrain.melt(1 - Math.exp(-dt * (0.25 + dawnT * 0.35)))
        else {
          terrain.melt(1)
          for (const it of [...items]) if (it.gone) removeItem(it)
          // A new day: the tools are in their places and the moulds stand
          // packed and ready, as on the first morning.
          for (const it of items) {
            if (isMould(it.kind) || it.kind === 'spade') {
              it.x = it.homeX
              it.z = it.homeZ
              it.load = 0
              if (isMould(it.kind)) it.fill = 1
            }
          }
          occDirty = true
          crab.on = false
          crabMesh.visible = false
          child.on = false
          mer.group.visible = false
          for (const s of stars) {
            s.on = false
            s.mesh.visible = false
          }
          for (const f of fishes) {
            f.on = false
            f.mesh.visible = false
          }
          strewTreasures()
          built = 0
          phase = 'day'
          snd.wave(0.05, 3.4)
        }
      } else {
        level = damp(level, DAY_LEVEL, 0.5, dt)
        if (level < DAY_LEVEL + 0.003) level = DAY_LEVEL
      }
      const swash = Math.sin(t * 1.05) * 0.011 + Math.sin(t * 0.47 + 1) * 0.005
      shown = level + swash * (phase === 'day' && level === DAY_LEVEL ? 0.7 : 1)
      horizon = toScreen(0, shown, FAR_Z)[1]

      // Far-off waves by day; the tide's own breathing in the evening.
      waveAt -= dt
      if (waveAt <= 0) {
        if (phase === 'night') {
          snd.wave(nightT < 5 + TIDE_SECONDS ? 0.05 : 0.032, 2.6)
          waveAt = 5.2 + Math.random() * 2.5
        } else {
          snd.wave(0.022, 2.8)
          waveAt = 8 + Math.random() * 6
        }
      }

      // Hands at work.
      for (const [id, h] of holds) {
        if (h.kind !== 'drip') continue
        if (!stage.pointers.has(id)) continue
        handful.visible = h.left > 0
        if (h.left <= 0) continue
        const g = terrain.topAt(h.x, h.z)
        handful.position.set(h.x, g + 0.95, h.z)
        handful.scale.setScalar(0.45 + 0.55 * (h.left / DRIPS))
        handful.rotation.y = t * 0.6
        // A hand held still drips fast; a hand on its way hardly at all, so
        // the handful arrives where it is wanted.
        h.speed = damp(h.speed, h.moved / Math.max(dt, 0.001), 5, dt)
        h.moved = 0
        if (!h.ok || inPool(h.x, h.z, 0.12)) continue
        h.acc += dt
        if (h.acc > clamp(0.085 + h.speed * 0.3, 0.085, 0.7)) {
          h.acc = 0
          const d = drops.find((q) => !q.live)
          if (d) {
            d.live = true
            d.x = h.x + (Math.random() - 0.5) * 0.15
            d.z = h.z + (Math.random() - 0.5) * 0.15
            d.y = g + 0.85
            d.to = 0
            h.left--
          }
        }
      }
      for (const d of drops) {
        d.mesh.visible = d.live
        if (!d.live) continue
        d.to += dt * 9
        d.y -= d.to * dt * 4
        const g = terrain.heightAt(d.x, d.z)
        d.mesh.position.set(d.x, d.y, d.z)
        d.mesh.scale.set(0.8, 1.3, 0.8)
        if (d.y <= g) {
          d.live = false
          d.mesh.visible = false
          if (!terrain.onRock(d.x, d.z)) {
            terrain.drip(d.x, d.z)
            built++
          }
          snd.plip()
        }
      }

      for (const it of items) {
        if (it.turn) runTurn(it, dt)
        poseItem(it, dt)
      }
      updateFolk(dt)

      for (const r of ripples) {
        if (!r.mesh.visible) continue
        r.t += dt
        const u = r.t / r.life
        if (u >= 1) {
          r.mesh.visible = false
          continue
        }
        r.mesh.scale.setScalar(r.size * (0.25 + ease.outCubic(u)))
        ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - u) * 0.5
      }

      for (const it of items) if (it.held && Math.hypot(it.cx - it.ox, it.cz - it.oz) > 0.06) occDirty = true
      if (occDirty) {
        occDirty = false
        for (const it of items) {
          it.ox = it.cx
          it.oz = it.cz
        }
        occluders()
      }
      const elevation = lerp(0.6, 0.16, dusk ** 0.85)
      const tan = Math.round(Math.tan(elevation) * 400) / 400
      if (terrain.refresh(tan) || tan !== lastTan) {
        lastTan = tan
        posAttr.needsUpdate = true
        norAttr.needsUpdate = true
        lightAttr.needsUpdate = true
        uploadHeights()
      }
      light.uSun.value.set(-LIGHT_X * Math.cos(elevation), Math.sin(elevation), -LIGHT_Z * Math.cos(elevation))
      info.jsMs += (performance.now() - began - info.jsMs) * 0.02
    },

    draw(g) {
      const t = stage.time
      const k = dusk
      const [, mid, low] = skyColors(k)
      const breathe = phase === 'day' && built > 0 && t - lastTouch > 9 ? Math.sin(t * 1.6) : Math.sin(t * 0.7) * 0.3
      sky.draw(g, k, SUN_X, sunY, horizon, t, breathe)

      const set = (c: THREE.Color, a: number[], b: number[]) => c.setRGB(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k))
      set(light.uSunCol.value, [0.8, 0.72, 0.58], [1.32, 0.74, 0.36])
      set(light.uAmb.value, [0.47, 0.49, 0.53], [0.5, 0.43, 0.56])
      set(light.uFill.value, [0.1, 0.09, 0.07], [0.17, 0.11, 0.11])
      set(light.uDeep.value, [0.37, 0.63, 0.68], [0.36, 0.34, 0.52])
      set(light.uShallow.value, [0.8, 0.87, 0.8], [0.84, 0.62, 0.5])
      light.uSkyTop.value.setRGB(mid[0] / 255, mid[1] / 255, mid[2] / 255)
      light.uSkyHor.value.setRGB(low[0] / 255, low[1] / 255, low[2] / 255)
      // The sea sheet only reaches as far up the beach as water could be.
      const nearZ = clamp((shown + 0.24) / 0.046 - 3.4, -3.3, 5.4)
      if (Math.abs(seaPos.getZ(1) - nearZ) > 0.01) {
        seaPos.setZ(1, nearZ)
        seaPos.setZ(3, nearZ)
        seaPos.needsUpdate = true
      }
      light.uLevel.value = shown
      light.uTime.value = t
      light.uDusk.value = k
      // The sun's road on the water lies under the sun.
      const far = castFlat(SUN_X, horizon + 2, shown)
      if (far) {
        const dx = far[0] - cam.x
        const dz = far[1] - cam.z
        const l = Math.hypot(dx, dz)
        light.uGlint.value.set((dx / l) * 0.866, 0.5, (dz / l) * 0.866)
      }
      if (!soft) {
        renderer.render(scene, camera)
        g.drawImage(glCanvas, 0, 0, W, H)
      } else {
        // No graphics chip: draw the beach only now and then, and keep the
        // last picture between. A jump in time (the screenshot tool running
        // the game forward) gets a fresh, sharp one.
        const now = performance.now()
        const jumped = t - soft.lastT > 0.2 || soft.lastT < 0
        if (jumped || now - soft.at > Math.max(300, soft.cost * 2)) {
          const scale = jumped ? 1 : 0.5
          renderer.setSize(Math.round(W * scale), Math.round(H * scale), false)
          renderer.render(scene, camera)
          soft.g.clearRect(0, 0, W, H)
          soft.g.drawImage(glCanvas, 0, 0, W, H)
          soft.at = performance.now()
          soft.cost = soft.at - now
        }
        soft.lastT = t
        g.drawImage(soft.canvas, 0, 0, W, H)
      }
      sky.drawGrass(g, k, t)
      sky.drawOver(g, k, SUN_X, sunY, horizon)
      info.calls = renderer.info.render.calls
      info.triangles = renderer.info.render.triangles
    },

    down(p) {
      lastTouch = stage.time
      if (Math.hypot(p.x - SUN_X, p.y - sunY) < 92) {
        holds.set(p.id, { kind: 'sun', oy: sunY - p.y })
        snd.breeze()
        return
      }
      const hit = castAt(p.x, p.y)

      if (phase !== 'day') {
        holds.set(p.id, { kind: 'none' })
        // Evening: the hand rests. The water answers a touch, and so does she.
        if (child.on && child.state === 'sit') {
          const [sx, sy] = toScreen(child.x, child.y + 0.35, child.z)
          if (Math.hypot(sx - p.x, sy - p.y) < 70) {
            child.look = p.x < sx ? -0.5 : 0.5
            if (child.sing <= 0) {
              snd.hum(2 + Math.floor(Math.random() * 3), 0, 0.9)
              child.sing = 1.3
            }
            return
          }
        }
        const flat = castFlat(p.x, p.y, shown)
        if (flat && (!hit || waterAt(hit.x, hit.z)) && flat[1] > FAR_Z) {
          ripple(flat[0], shown, flat[1], 0.55, 1.3)
          snd.plink(Math.floor(Math.random() * 4))
        } else if (hit) {
          snd.pat()
          grains(hit.x, hit.y, hit.z, 3, 80)
        } else {
          snd.breeze()
          sky.nudge()
        }
        return
      }

      const it = pickItem(p)
      if (it) {
        it.held = true
        it.crab = false
        occDirty = true
        const at = hit ?? { x: it.x, y: 0, z: it.z }
        holds.set(p.id, { kind: 'item', item: it, ox: it.x - at.x, oz: it.z - at.z, lx: at.x, lz: at.z, travel: 0, cue: 0 })
        pickSound(it)
        return
      }
      if (!hit) {
        holds.set(p.id, { kind: 'none' })
        const flat = castFlat(p.x, p.y, shown)
        if (p.y > horizon && flat && flat[1] > FAR_Z) {
          ripple(flat[0], shown, flat[1], 0.6, 1.3)
          snd.plink(Math.floor(Math.random() * 4))
        } else {
          snd.breeze()
          sky.nudge()
        }
        return
      }
      if (inPool(hit.x, hit.z, 0.05)) {
        // A handful of wet sand comes up out of the pool, dripping.
        holds.set(p.id, { kind: 'drip', left: DRIPS, acc: 0, x: hit.x, z: hit.z, ok: true, moved: 0, speed: 0 })
        ripple(hit.x, POOL.level, hit.z, 0.32, 1)
        snd.plink(1)
        return
      }
      if (terrain.onRock(hit.x, hit.z)) {
        holds.set(p.id, { kind: 'none' })
        snd.pebble()
        return
      }
      if (waterAt(hit.x, hit.z)) {
        holds.set(p.id, { kind: 'none' })
        ripple(hit.x, shown, hit.z, 0.5, 1.2)
        snd.plink(Math.floor(Math.random() * 4))
        return
      }
      if (terrain.rise(hit.x, hit.z) > 0.22) {
        // A flat hand on built sand firms it.
        terrain.pat(hit.x, hit.z)
        snd.pat()
        grains(hit.x, hit.y, hit.z, 5, 110)
        holds.set(p.id, { kind: 'dig', lx: hit.x, lz: hit.z, has: true, wait: 0.3, cue: 0 })
        return
      }
      terrain.dig(hit.x, hit.z, 1)
      snd.digStart()
      grains(hit.x, hit.y, hit.z, 4, 100)
      built++
      holds.set(p.id, { kind: 'dig', lx: hit.x, lz: hit.z, has: true, wait: 0, cue: 0 })
    },

    move(p) {
      const h = holds.get(p.id)
      if (!h || h.kind === 'none') return
      lastTouch = stage.time
      if (h.kind === 'sun') {
        sunY = clamp(p.y + h.oy, SUN_DAY - 10, horizon + 8)
        return
      }
      const hit = castAt(p.x, p.y)
      if (h.kind === 'item') {
        if (!hit) return
        const it = h.item
        const zMax = 4.25
        it.z = clamp(hit.z + h.oz, Z0 + 0.9, zMax)
        it.x = clamp(hit.x + h.ox, -reach(it.z), reach(it.z))
        // Forgive the grab: the thing drifts to sit right under the finger.
        h.ox *= 0.94
        h.oz *= 0.94
        if (it.kind === 'spade') {
          const d = Math.hypot(it.x - h.lx, it.z - h.lz)
          const near = items.find((m) => isMould(m.kind) && !m.turn && m.fill < 0.99 && Math.hypot(m.x - it.x, m.z - it.z) < 0.85)
          if (it.load >= 1 && near) {
            // Tip the spadeful into the mould.
            it.load = 0
            it.pour = 1
            near.fill = Math.min(1, near.fill + (near.kind === 'cone' ? 1 : 0.5))
            near.settle = 0.35
            snd.pour()
            grains(near.x, terrain.topAt(near.x, near.z) + 0.9, near.z, 8, 60)
          } else if (it.load < 1 && !near && d > 0.001 && !inPool(it.x, it.z, 0.2) && !terrain.onRock(it.x, it.z) && !waterAt(it.x, it.z)) {
            const steps = Math.max(1, Math.ceil(d / 0.07))
            for (let s = 1; s <= steps; s++) terrain.scoop(lerp(h.lx, it.x, s / steps), lerp(h.lz, it.z, s / steps))
            it.load += d / 0.9
            h.cue += d
            if (h.cue > 0.24) {
              h.cue = 0
              snd.scoop()
              grains(it.x, terrain.heightAt(it.x, it.z), it.z, 3, 90)
            }
            if (it.load >= 1) {
              it.load = 1
              snd.loaded()
              grains(it.x, terrain.heightAt(it.x, it.z) + 0.1, it.z, 6, 130)
            }
          }
          h.lx = it.x
          h.lz = it.z
        }
        return
      }
      if (h.kind === 'drip') {
        h.ok = !!hit
        if (hit) {
          h.moved += Math.hypot(hit.x - h.x, hit.z - h.z)
          h.x = hit.x
          h.z = hit.z
        }
        return
      }
      // Drawing a finger through the sand.
      if (!hit || waterAt(hit.x, hit.z)) {
        h.has = false
        return
      }
      if (!h.has) {
        h.has = true
        h.lx = hit.x
        h.lz = hit.z
        return
      }
      if (h.wait > 0) {
        if (Math.hypot(hit.x - h.lx, hit.z - h.lz) < h.wait) return
        h.wait = 0
        h.lx = hit.x
        h.lz = hit.z
        return
      }
      const d = digAlong(h, hit.x, hit.z)
      h.lx = hit.x
      h.lz = hit.z
      h.cue += d
      if (h.cue > 0.2) {
        h.cue = 0
        snd.dig()
        grains(hit.x, hit.y + 0.03, hit.z, 2, 80)
        built++
      }
    },

    up(p) {
      const h = holds.get(p.id)
      holds.delete(p.id)
      if (!h) return
      if (h.kind === 'item') setDown(h.item)
      if (h.kind === 'drip') handful.visible = false
    },

    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
      })
      for (const r of ripples) (r.mesh.material as THREE.Material).dispose()
      for (const it of items) it.glow?.material.dispose()
      sandMat.dispose()
      seaMat.dispose()
      poolMat.dispose()
      mat.dispose()
      glowMat.dispose()
      glowTex.dispose()
      heightTex.dispose()
      light.uNoise.value?.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }

  uploadHeights()
  return game
}

export const proto: Proto = {
  meta: {
    key: 'sand-kingdom',
    name: 'Sand Kingdom',
    emoji: '🐚',
    ages: [3, 7],
    set: 'gentle',
    pitch: 'Shape a kingdom in damp sand with a bucket, a spade and a finger, then draw the sun down and let the tide and the sea folk come in.',
    howTo:
      'Carry a full mould (bucket, cone or wall) onto the damp sand and let go to turn it out. Draw a finger through the sand for a moat. Tap a tower to pat it. Drag the spade through sand, then to a mould, to fill it. Touch the rock pool and carry the wet sand to drip a spire. Press shells into walls, stand feathers, lay driftwood. Drag the sun down to the sea for the tide; lift it for a new morning.',
    basedOn: 'Waldorf sand and water play, and the tide as the rhythm of the day; Montessori practical work with a bucket, spade and moulds',
    whyFun: 'Damp sand answers the hand: a groove opens under the finger, a tower stands when the bucket lifts, and then the sea itself comes to live in what you made.',
  },
  create,
}
