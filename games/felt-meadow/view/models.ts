import {
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  Euler,
  Group,
  HemisphereLight,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
} from 'three'
import { BEE_SCALE, MERGED_AT, pollenAt } from '../bee'
import { PRIMARIES, type Hue } from '../colors'
import { HELD_LIFT, PUFF_POOL, SEED_POOL, type MeadowController } from '../controller'
import { PETALS } from '../flowers'
import { BURROW, BURROW_HOLE, GRASS, groundY, PLOT_RADIUS, plotAt, plotTop, PLOTS, POUCH, POUCH_RADIUS, SEED_RADIUS, STEM_HEIGHT, TUFTS, tuftSpots } from '../layout'
import { mixOf } from '../meadow'
import type { Tier } from '../perf'
import { SEASON_LOOKS, type Season } from '../season'
import { blobMaterial, CENTRE_HEX, feltMaterial, feltTextures, fuzzMaterial, HUE_HEX, paint, PETAL_HEX, ringMaterial } from './felt'
import { beeHeadTurn, flowerHeadMatrix, MOUSE_SCALE, petalMatrix, poseBee, poseMouse, poseSnail, pouchMatrix, seedMatrix, tuftMatrix, WING_ROOT, wingPose, type MouseParts, type SnailParts } from './poses'
import {
  backdropGeometry,
  BEE_HEAD,
  beeBodyGeometry,
  beeHeadGeometry,
  beeShellGeometries,
  burrowGeometry,
  centreGeometry,
  decorGeometry,
  eyeStalkGeometry,
  flatQuad,
  hillGeometry,
  leafGeometry,
  molehillGeometry,
  MOUSE_HEAD,
  mouseBodyGeometry,
  mouseHeadGeometry,
  mouseTailGeometry,
  petalGeometry,
  pollenGeometry,
  pouchGeometry,
  puffGeometry,
  scatterGeometry,
  seedGeometry,
  SNAIL_SHELL,
  snailBodyGeometry,
  snailShellGeometry,
  stemGeometry,
  tuftGeometry,
  wallDecorGeometry,
  wingGeometry,
} from './geometry'

// The meadow's meshes, and how each frame poses them from the controller.
// Geometry is built once per page (per season) and reused by every mount.
// Repeating things are instanced; the fuzz shells share their base mesh's
// instance buffers. Nothing here allocates per frame.

type Geometries = ReturnType<typeof buildGeometries>

function buildGeometries(season: Season) {
  const look = SEASON_LOOKS[season]
  return {
    season,
    hill: hillGeometry(look),
    backdrop: backdropGeometry(look),
    decor: decorGeometry(),
    burrow: burrowGeometry(),
    wallDecor: wallDecorGeometry(look),
    tuft: tuftGeometry(),
    scatter: scatterGeometry(look.scatter),
    molehill: molehillGeometry(),
    seed: seedGeometry(),
    pouch: pouchGeometry(),
    stem: stemGeometry(),
    leaf: leafGeometry(),
    petal: petalGeometry(),
    centre: centreGeometry(),
    beeBody: beeBodyGeometry(),
    beeHead: beeHeadGeometry(),
    beeShell: beeShellGeometries(),
    wing: wingGeometry(),
    pollen: pollenGeometry(),
    snailBody: snailBodyGeometry(),
    snailShell: snailShellGeometry(),
    eyeStalk: eyeStalkGeometry(),
    mouseBody: mouseBodyGeometry(),
    mouseHead: mouseHeadGeometry(),
    mouseTail: mouseTailGeometry(),
    quad: flatQuad(),
    puff: puffGeometry(),
    hand: handPlane(),
  }
}

let cache: Geometries | null = null

function geometriesFor(season: Season): Geometries {
  if (!cache || cache.season !== season) cache = buildGeometries(season)
  return cache
}

/** The ghost hand's plane, with its fingertip at the origin. */
function handPlane(): BufferGeometry {
  const geometry = new PlaneGeometry(15, 15)
  geometry.translate(0.9, -15 * (0.5 - 12 / 128), 0)
  return geometry
}

/** A felt mitten pointing up: cream wool with fibre speckle and a blanket-stitch edge. Drawn once, no text. */
function handTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const g = canvas.getContext('2d')
  if (g) {
    const outline = () => {
      g.beginPath()
      g.moveTo(52, 20)
      g.arcTo(52, 10, 62, 10, 10)
      g.arcTo(72, 10, 72, 20, 10)
      g.lineTo(72, 58)
      g.bezierCurveTo(84, 54, 98, 60, 98, 78)
      g.bezierCurveTo(98, 104, 82, 118, 62, 118)
      g.bezierCurveTo(42, 118, 30, 106, 30, 90)
      g.bezierCurveTo(24, 84, 20, 74, 26, 68)
      g.bezierCurveTo(32, 62, 42, 68, 52, 76)
      g.closePath()
    }
    g.fillStyle = 'rgba(70, 58, 40, 0.22)'
    g.save()
    g.translate(4, 5)
    outline()
    g.fill()
    g.restore()
    outline()
    g.fillStyle = '#fbf4e6'
    g.fill()
    g.save()
    outline()
    g.clip()
    let seed = 7
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < 900; i++) {
      const shade = random() < 0.5 ? 'rgba(214, 196, 164, 0.35)' : 'rgba(255, 255, 255, 0.5)'
      g.fillStyle = shade
      g.fillRect(random() * 128, random() * 128, 1 + random() * 2, 1)
    }
    g.restore()
    outline()
    g.strokeStyle = '#c9ad84'
    g.lineWidth = 2.5
    g.setLineDash([4, 4])
    g.stroke()
  }
  const texture = new CanvasTexture(canvas)
  return texture
}

const M = new Matrix4()
const HEAD = new Matrix4()
const Q = new Quaternion()
const E = new Euler()
const V = new Vector3()
const S = new Vector3()
const P0 = new Vector3()
const P1 = new Vector3()
const UP = new Vector3(0, 1, 0)
const C = new Color()
const HEADPOS = { x: 0, y: 0, z: 0 }
const BALL = { x: 0, y: 0, z: 0 }

const HUE_COLORS = new Map<Hue, Color>()
const PETAL_COLORS = new Map<Hue, Color>()
const CENTRE_COLORS = new Map<Hue, Color>()
for (const key of [1, 2, 3, 4, 5, 6, 7] as Hue[]) {
  HUE_COLORS.set(key, paint(HUE_HEX[key]))
  PETAL_COLORS.set(key, paint(PETAL_HEX[key]))
  CENTRE_COLORS.set(key, paint(CENTRE_HEX[key]))
}
function hueColor(hue: Hue): Color {
  return HUE_COLORS.get(hue) ?? C
}

const STEM_SEGMENTS = 4
/** The intersection audit's object for each part of the flower at a plot: its molehill, stem, leaves, centre, and petals are one thing. */
const FLOWER_OBJECTS = PLOTS.map((_, plot) => `flower-${plot}`)
const BLOB_POOL = 32

function instanced(geometry: BufferGeometry, material: Material, count: number, colors = true): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, count)
  mesh.instanceMatrix.setUsage(DynamicDrawUsage)
  if (colors) {
    mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3)
    mesh.instanceColor.setUsage(DynamicDrawUsage)
  }
  mesh.frustumCulled = false
  mesh.count = 0
  return mesh
}

function shellOf(base: InstancedMesh, material: Material): InstancedMesh {
  const fuzz = new InstancedMesh(base.geometry, material, base.instanceMatrix.count)
  fuzz.instanceMatrix = base.instanceMatrix
  fuzz.instanceColor = base.instanceColor
  fuzz.frustumCulled = false
  fuzz.renderOrder = 1
  fuzz.count = 0
  return fuzz
}

/** Tells the intersection audit which object instance `i` of `mesh` is part of (`userData.jamInstanceObjects`). */
function partOf(mesh: InstancedMesh, i: number, object: string): void {
  ;(mesh.userData.jamInstanceObjects as string[])[i] = object
}

function fixed(object: Object3D): Object3D {
  object.updateMatrix()
  object.matrixAutoUpdate = false
  object.frustumCulled = false
  return object
}

export class MeadowModels {
  private readonly scene: Scene
  private readonly materials: Material[] = []
  private readonly textures: CanvasTexture[] = []
  private readonly seeds: InstancedMesh
  private readonly blobs: InstancedMesh
  private readonly molehills: InstancedMesh
  private readonly molehillFuzz: InstancedMesh
  private readonly stems: InstancedMesh
  private readonly leaves: InstancedMesh
  private readonly petals: InstancedMesh
  private readonly petalFuzz: InstancedMesh
  private readonly centres: InstancedMesh
  private readonly centreFuzz: InstancedMesh
  private readonly pouch: Mesh
  private readonly bee = new Group()
  private readonly beeHead = new Group()
  private readonly beeFuzz: Mesh[] = []
  private readonly wings: Mesh[] = []
  private readonly pollen: InstancedMesh
  private readonly snail = new Group()
  private readonly snailBody: Mesh
  private readonly snailShell: Mesh
  private readonly snailParts: SnailParts
  private readonly eyes: InstancedMesh
  private readonly mouse = new Group()
  private readonly mouseTilt = new Group()
  private readonly mouseHead = new Group()
  private readonly mouseParts: MouseParts
  private readonly rings: InstancedMesh
  private readonly hand: Mesh
  private readonly ghostSeed: Mesh
  private readonly ghostMaterial: MeshBasicMaterial
  private readonly handMaterial: MeshBasicMaterial
  private readonly puffs: InstancedMesh
  private readonly handTwist = new Quaternion().setFromEuler(new Euler(0, 0, -0.32))
  private readonly flowerMeshes: InstancedMesh[]
  private fuzz: Tier['fuzz'] = 3
  private particles = 1
  private blobCount = 0
  private ringCount = 0

  constructor(scene: Scene, season: Season) {
    this.scene = scene
    const g = geometriesFor(season)
    const textures = feltTextures()
    const track = <T extends Material>(material: T): T => {
      this.materials.push(material)
      return material
    }
    const hillMaterial = track(feltMaterial(textures, { sheen: 0.14, normalScale: 0.75 }))
    // three.js rebuilds a material's program parameters (garbage and a full
    // uniform upload) each time consecutive draws differ in instancing or
    // instance colour, so each mesh shape gets its own copy of the prop felt.
    const prop = track(feltMaterial(textures, { sheen: 0.3 }))
    const propInstanced = track(feltMaterial(textures, { sheen: 0.3 }))
    const propTinted = track(feltMaterial(textures, { sheen: 0.3 }))
    const seedMaterial = track(feltMaterial(textures, { sheen: 0.4, normalScale: 0.5 }))
    const pouchMaterial = track(feltMaterial(textures, { sheen: 0.26, side: DoubleSide }))
    const backdropMaterial = track(new MeshBasicMaterial({ vertexColors: true }))
    const appliqueMaterial = track(new MeshBasicMaterial({ vertexColors: true, map: textures.heather }))

    scene.add(new HemisphereLight(paint(0xfff3de), paint(0x7c8466), 2.35))
    const sun = new DirectionalLight(paint(0xfff0d6), 1.55)
    sun.position.set(-60, 120, 70)
    scene.add(sun)

    const backdrop = new Mesh(g.backdrop, backdropMaterial)
    backdrop.name = 'backdrop'
    backdrop.renderOrder = -3
    scene.add(fixed(backdrop))
    const hill = new Mesh(g.hill, hillMaterial)
    hill.name = 'hill'
    hill.renderOrder = -2
    scene.add(fixed(hill))
    const decor = new Mesh(g.decor, prop)
    decor.name = 'decor'
    scene.add(fixed(decor))
    const burrow = new Mesh(g.burrow, prop)
    burrow.name = 'burrow'
    scene.add(fixed(burrow))
    const wallDecor = new Mesh(g.wallDecor, appliqueMaterial)
    wallDecor.name = 'wall-decor'
    scene.add(fixed(wallDecor))

    const tufts = instanced(g.tuft, propTinted, TUFTS)
    tufts.name = 'tuft'
    this.scatterTufts(tufts, SEASON_LOOKS[season].grass, SEASON_LOOKS[season].grassFleck)
    scene.add(fixed(tufts))
    if (g.scatter) {
      const scatter = instanced(g.scatter, propTinted, 40)
      scatter.name = 'scatter'
      this.scatterSeason(scatter, SEASON_LOOKS[season].scatterColors)
      scene.add(fixed(scatter))
    }

    this.blobs = instanced(g.quad, track(blobMaterial()), BLOB_POOL)
    this.blobs.name = 'contact-shadow'
    this.blobs.renderOrder = -1
    scene.add(this.blobs)

    this.molehills = instanced(g.molehill, propInstanced, PLOTS.length, false)
    this.molehills.count = PLOTS.length
    this.molehillFuzz = shellOf(this.molehills, track(fuzzMaterial({ thickness: 0.75, edge: 0.4, lift: 0.2, vertexColors: true, fibre: 1.4 })))
    this.molehills.name = 'molehill'
    this.molehills.userData.jamInstanceObjects = FLOWER_OBJECTS
    this.molehillFuzz.name = 'molehill-fuzz'
    scene.add(this.molehills, this.molehillFuzz)

    this.pouch = new Mesh(g.pouch, pouchMaterial)
    this.pouch.name = 'pouch'
    this.pouch.frustumCulled = false
    scene.add(this.pouch)

    this.seeds = instanced(g.seed, seedMaterial, SEED_POOL)
    this.seeds.name = 'seed'
    scene.add(this.seeds)

    this.stems = instanced(g.stem, propInstanced, PLOTS.length * STEM_SEGMENTS, false)
    this.leaves = instanced(g.leaf, propInstanced, PLOTS.length * 2, false)
    this.petals = instanced(g.petal, seedMaterial, PLOTS.length * PETALS)
    this.petalFuzz = shellOf(this.petals, track(fuzzMaterial({ thickness: 0.32, edge: 0.55, lift: 0.3, vertexColors: true, fibre: 2.6 })))
    this.centres = instanced(g.centre, seedMaterial, PLOTS.length)
    this.centreFuzz = shellOf(this.centres, track(fuzzMaterial({ thickness: 0.38, edge: 0.5, lift: 0.25, vertexColors: true, fibre: 3 })))
    this.flowerMeshes = [this.stems, this.leaves, this.petals, this.centres]
    for (const mesh of this.flowerMeshes) mesh.userData.jamInstanceObjects = []
    this.stems.name = 'stem'
    this.leaves.name = 'leaf'
    this.petals.name = 'petal'
    this.petalFuzz.name = 'petal-fuzz'
    this.centres.name = 'centre'
    this.centreFuzz.name = 'centre-fuzz'
    scene.add(this.stems, this.leaves, this.petals, this.petalFuzz, this.centres, this.centreFuzz)

    const beeBody = new Mesh(g.beeBody, prop)
    beeBody.name = 'bee-body'
    const beeBodyFuzz = new Mesh(g.beeShell.body, track(fuzzMaterial({ thickness: 0.55, edge: 0.5, lift: 0.3, vertexColors: true, fibre: 2.4 })))
    beeBodyFuzz.name = 'bee-body-fuzz'
    beeBodyFuzz.renderOrder = 1
    const head = new Mesh(g.beeHead, prop)
    head.name = 'bee-face'
    const headFuzz = new Mesh(g.beeShell.head, track(fuzzMaterial({ thickness: 0.42, edge: 0.5, lift: 0.38, vertexColors: true, fibre: 2.8 })))
    headFuzz.name = 'bee-head-fuzz'
    headFuzz.renderOrder = 1
    this.beeHead.name = 'bee-head'
    this.beeHead.position.set(0, BEE_HEAD.y, BEE_HEAD.z)
    this.beeHead.add(head, headFuzz)
    this.beeFuzz.push(beeBodyFuzz, headFuzz)
    for (const side of [1, -1]) {
      const wing = new Mesh(g.wing, prop)
      wing.name = side > 0 ? 'bee-wing-right' : 'bee-wing-left'
      wing.position.set(side * WING_ROOT.x, WING_ROOT.y, WING_ROOT.z)
      this.wings.push(wing)
      this.bee.add(wing)
    }
    this.pollen = instanced(g.pollen, seedMaterial, 2)
    this.pollen.name = 'bee-pollen'
    this.pollen.userData.jamInstanceObjects = ['bee', 'bee']
    this.bee.add(beeBody, beeBodyFuzz, this.beeHead, this.pollen)
    this.bee.name = 'bee'
    this.bee.userData.jamObject = 'bee'
    this.bee.rotation.order = 'YXZ'
    scene.add(this.bee)

    this.snailBody = new Mesh(g.snailBody, prop)
    this.snailBody.name = 'snail-body'
    this.snailShell = new Mesh(g.snailShell, prop)
    this.snailShell.name = 'snail-shell'
    this.snailShell.position.set(0, SNAIL_SHELL.y, SNAIL_SHELL.z)
    this.eyes = instanced(g.eyeStalk, propInstanced, 2, false)
    this.eyes.name = 'snail-eye'
    this.eyes.userData.jamInstanceObjects = ['snail', 'snail']
    this.eyes.count = 2
    this.snail.add(this.snailBody, this.snailShell, this.eyes)
    this.snailParts = { root: this.snail, body: this.snailBody, shell: this.snailShell }
    this.snail.name = 'snail'
    this.snail.userData.jamObject = 'snail'
    scene.add(this.snail)

    const mouseBody = new Mesh(g.mouseBody, prop)
    mouseBody.name = 'mouse-body'
    mouseBody.position.z = 2.4
    const mouseHeadMesh = new Mesh(g.mouseHead, prop)
    mouseHeadMesh.name = 'mouse-head'
    this.mouseHead.position.set(0, MOUSE_HEAD.y, MOUSE_HEAD.z + 2.4)
    this.mouseHead.add(mouseHeadMesh)
    const mouseTail = new Mesh(g.mouseTail, prop)
    mouseTail.name = 'mouse-tail'
    this.mouseTilt.add(mouseBody, this.mouseHead, mouseTail)
    this.mouse.add(this.mouseTilt)
    this.mouseParts = { root: this.mouse, tilt: this.mouseTilt, head: this.mouseHead, tail: mouseTail }
    this.mouse.name = 'mouse'
    this.mouse.userData.jamObject = 'mouse'
    scene.add(this.mouse)

    this.puffs = instanced(g.puff, propTinted, PUFF_POOL)
    this.puffs.name = 'puff'
    scene.add(this.puffs)

    this.rings = instanced(g.quad, track(ringMaterial()), 2)
    this.rings.name = 'guide-ring'
    this.rings.renderOrder = 2
    scene.add(this.rings)

    const handMap = handTexture()
    this.textures.push(handMap)
    this.handMaterial = track(new MeshBasicMaterial({ map: handMap, transparent: true, depthTest: false, depthWrite: false, opacity: 0 }))
    this.hand = new Mesh(g.hand, this.handMaterial)
    this.hand.name = 'guide-hand'
    this.hand.renderOrder = 4
    this.hand.frustumCulled = false
    this.ghostMaterial = track(new MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 }))
    this.ghostSeed = new Mesh(g.seed, this.ghostMaterial)
    this.ghostSeed.name = 'guide-ghost-seed'
    this.ghostSeed.renderOrder = 3
    this.ghostSeed.frustumCulled = false
    scene.add(this.hand, this.ghostSeed)

    for (const object of [this.bee, this.snail, this.mouse]) object.traverse((child) => (child.frustumCulled = false))
  }

  setTier(tier: Tier): void {
    this.fuzz = tier.fuzz
    this.particles = tier.fuzz >= 2 ? 1 : tier.fuzz === 1 ? 0.5 : 0
    for (const mesh of this.beeFuzz) mesh.visible = this.fuzz >= 1
    this.petalFuzz.visible = this.centreFuzz.visible = this.fuzz >= 2
    this.molehillFuzz.visible = this.fuzz >= 3
    this.puffs.visible = this.particles > 0
  }

  dispose(): void {
    this.scene.clear()
    for (const material of this.materials) material.dispose()
    for (const texture of this.textures) texture.dispose()
  }

  private scatterTufts(mesh: InstancedMesh, grass: string, fleck: string): void {
    const dark = paint(parseInt(grass.slice(1), 16)).multiplyScalar(0.96)
    const light = paint(parseInt(fleck.slice(1), 16)).lerp(dark, 0.4)
    const tufts = tuftSpots(mesh.instanceMatrix.count)
    for (let i = 0; i < tufts.length; i++) {
      mesh.setMatrixAt(i, tuftMatrix(tufts[i], M))
      mesh.setColorAt(i, C.copy(dark).lerp(light, tufts[i].shade))
    }
    mesh.count = tufts.length
  }

  private scatterSeason(mesh: InstancedMesh, colors: readonly string[]): void {
    let seed = 57
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    let count = 0
    for (let tries = 0; tries < 400 && count < mesh.instanceMatrix.count; tries++) {
      const x = GRASS.left - 10 + random() * (GRASS.right - GRASS.left + 20)
      const z = GRASS.far - 20 + random() * (GRASS.near - GRASS.far + 26)
      if (plotAt(x, z, 3) >= 0 || Math.hypot(x - POUCH.x, z - POUCH.z) < POUCH_RADIUS + 2) continue
      if (Math.hypot(x - BURROW.x, z - BURROW.z) < BURROW_HOLE.ring + BURROW_HOLE.tube + 1) continue
      E.set(0, random() * Math.PI * 2, 0)
      Q.setFromEuler(E)
      const s = 0.8 + random() * 0.6
      M.compose(V.set(x, groundY(x, z) + 0.05, z), Q, S.set(s, s, s))
      mesh.setMatrixAt(count, M)
      mesh.setColorAt(count, paint(parseInt(colors[count % colors.length].slice(1), 16), C))
      count++
    }
    mesh.count = count
  }

  private addBlob(x: number, z: number, size: number, strength: number): void {
    if (this.blobCount >= BLOB_POOL) return
    M.compose(V.set(x, groundY(x, z) + 0.1, z), Q.identity(), S.set(size, 1, size * 0.82))
    this.blobs.setMatrixAt(this.blobCount, M)
    this.blobs.setColorAt(this.blobCount, C.setRGB(strength, 0, 0))
    this.blobCount++
  }

  private ringAt(x: number, y: number, z: number, size: number, strength: number, t: number): void {
    const breathe = 1 + Math.sin(t * 2.2) * 0.05
    M.compose(V.set(x, y, z), Q.identity(), S.set(size * breathe, 1, size * breathe * 0.85))
    this.rings.setMatrixAt(this.ringCount, M)
    this.rings.setColorAt(this.ringCount, C.setRGB(strength, 0, 0))
    this.ringCount++
  }

  sync(c: MeadowController, camera: Camera): void {
    this.blobCount = 0
    const t = c.t

    // Seeds.
    let seeds = 0
    for (const seed of c.seeds) {
      if (seed.mode === 'off') continue
      const grow = Math.max(0.001, seed.grow.x)
      this.seeds.setMatrixAt(seeds, seedMatrix(seed, M))
      this.seeds.setColorAt(seeds, hueColor(seed.hue))
      seeds++
      if (seed.mode !== 'pouch' && seed.mode !== 'sink') {
        const height = Math.max(0, seed.y - groundY(seed.x, seed.z) - SEED_RADIUS)
        this.addBlob(seed.x, seed.z, SEED_RADIUS * 2.7 * grow * (1 + height * 0.05), 0.62 / (1 + height * 0.12))
      }
    }
    this.seeds.count = seeds
    this.seeds.instanceMatrix.needsUpdate = true
    if (this.seeds.instanceColor) this.seeds.instanceColor.needsUpdate = true

    // Molehills heave, breathe while empty, and swell toward a seed held over them.
    for (let plot = 0; plot < PLOTS.length; plot++) {
      const p = PLOTS[plot]
      const flower = c.flowers[plot]
      const heave = c.heave[plot].x
      const open = c.open[plot].x
      const soil = flower.soil.x
      const breathe = flower.phase === 'empty' ? 0.014 * Math.sin(t * 1.15 + plot * 1.9) : 0
      const sy = 1 + heave * 0.08 + open * 0.09 - soil * 0.07 + breathe
      const sxz = 1 - heave * 0.035 + open * 0.05 + soil * 0.045 - breathe * 0.5
      E.set(0, plot * 1.3, 0)
      Q.setFromEuler(E)
      M.compose(V.set(p.x, groundY(p.x, p.z), p.z), Q, S.set(sxz, sy, sxz))
      this.molehills.setMatrixAt(plot, M)
    }
    this.molehills.instanceMatrix.needsUpdate = true
    this.molehillFuzz.count = this.molehills.count

    this.syncFlowers(c)
    this.syncPouch(c)
    this.syncBee(c)
    const bee = c.bee
    const beeHeight = Math.max(0, bee.y - groundY(bee.x, bee.z))
    this.addBlob(bee.x, bee.z, 8 * BEE_SCALE * (1 + beeHeight * 0.025), 0.5 / (1 + beeHeight * 0.06))
    this.syncSnail(c)
    this.addBlob(c.snail.x + c.snail.dir * 0.5, c.snail.z, 11 * c.snail.stretch, 0.5)
    this.syncMouse(c)
    if (c.mouse.visible() && c.mouse.out > 0.4) this.addBlob(this.mouse.position.x, this.mouse.position.z, 8 * MOUSE_SCALE, 0.45 * c.mouse.out)
    this.syncGuidance(c, camera)
    this.syncPuffs(c)

    this.blobs.count = this.blobCount
    this.blobs.instanceMatrix.needsUpdate = true
    if (this.blobs.instanceColor) this.blobs.instanceColor.needsUpdate = true
  }

  private syncFlowers(c: MeadowController): void {
    let stems = 0
    let leaves = 0
    let petals = 0
    let centres = 0
    for (let plot = 0; plot < PLOTS.length; plot++) {
      const flower = c.flowers[plot]
      if (flower.phase === 'empty') continue
      const p = PLOTS[plot]
      const plucked = flower.phase === 'plucked'
      const keep = flower.pluckStem()
      const head = flower.headAt(HEADPOS)
      const baseY = plotTop(plot) - 0.8
      const stemX = Math.max(0, flower.stem.x) * keep
      const bx = plucked ? head.x + (p.x - head.x) * keep : p.x
      const by = plucked ? head.y + (baseY - head.y) * keep : baseY
      const bz = plucked ? head.z + (p.z - head.z) * keep : p.z
      const length = Math.hypot(head.x - bx, head.y - by, head.z - bz)
      const cx = bx
      const cy = by + length * 0.55
      const cz = bz
      const width = Math.min(1, 0.25 + stemX * 1.4) * (plucked ? keep : 1)
      for (let i = 0; i < STEM_SEGMENTS; i++) {
        bezier(bx, by, bz, cx, cy, cz, head.x, head.y, head.z, i / STEM_SEGMENTS, P0)
        bezier(bx, by, bz, cx, cy, cz, head.x, head.y, head.z, (i + 1) / STEM_SEGMENTS, P1)
        V.subVectors(P1, P0)
        const segment = V.length()
        if (segment < 1e-4) V.set(0, 1, 0)
        else V.divideScalar(segment)
        Q.setFromUnitVectors(UP, V)
        const taper = width * (1 - 0.14 * i)
        M.compose(P0, Q, S.set(taper, Math.max(0.001, segment * 1.06), taper))
        partOf(this.stems, stems, FLOWER_OBJECTS[plot])
        this.stems.setMatrixAt(stems++, M)
      }

      const unfurl = Math.max(0, flower.leaves.x) * keep
      bezier(bx, by, bz, cx, cy, cz, head.x, head.y, head.z, 0.28, P0)
      for (let side = 0; side < 2; side++) {
        E.set(0, plot * 0.9 + 0.5 + side * Math.PI, 1.3 - unfurl * 1.05 + Math.sin(c.t * 1.4 + plot + side) * 0.05)
        Q.setFromEuler(E)
        const s = Math.max(0.001, Math.min(1.25, unfurl * 1.25))
        M.compose(P0, Q, S.set(s, s, s))
        partOf(this.leaves, leaves, FLOWER_OBJECTS[plot])
        this.leaves.setMatrixAt(leaves++, M)
      }

      flowerHeadMatrix(flower, head, bx, bz, HEAD)
      partOf(this.centres, centres, FLOWER_OBJECTS[plot])
      this.centres.setMatrixAt(centres, HEAD)
      this.centres.setColorAt(centres, CENTRE_COLORS.get(flower.hue) ?? C)
      centres++
      const petalColor = PETAL_COLORS.get(flower.hue) ?? C
      for (let i = 0; i < PETALS; i++) {
        partOf(this.petals, petals, FLOWER_OBJECTS[plot])
        this.petals.setMatrixAt(petals, petalMatrix(flower, i, HEAD, M))
        this.petals.setColorAt(petals, petalColor)
        petals++
      }
    }
    this.stems.count = stems
    this.leaves.count = leaves
    this.petals.count = petals
    this.petalFuzz.count = petals
    this.centres.count = centres
    this.centreFuzz.count = centres
    for (const mesh of this.flowerMeshes) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }

  private syncPouch(c: MeadowController): void {
    pouchMatrix(c.pouchPose, M).decompose(this.pouch.position, this.pouch.quaternion, this.pouch.scale)
  }

  private syncBee(c: MeadowController): void {
    const bee = c.bee
    poseBee(bee, this.bee)
    beeHeadTurn(bee, this.beeHead.rotation)
    for (let i = 0; i < this.wings.length; i++) wingPose(bee, i === 0 ? 1 : -1, this.wings[i].position, this.wings[i].rotation, this.wings[i].scale)
    const pollen = c.meadow.pollen
    const merge = bee.merge
    const mixed = mixOf(c.meadow)
    const together = merge >= MERGED_AT && mixed !== null
    let count = 0
    for (let i = 0; i < 2; i++) {
      const hue = together ? mixed : pollen[i]
      if (hue === undefined || (together && i > 0)) continue
      const size = pollenAt(i === 0 ? 1 : -1, merge, BALL)
      M.compose(V.set(BALL.x, BALL.y, BALL.z), Q.identity(), S.set(size, size, size))
      this.pollen.setMatrixAt(count, M)
      this.pollen.setColorAt(count, hueColor(hue))
      count++
    }
    this.pollen.count = count
    this.pollen.instanceMatrix.needsUpdate = true
    if (this.pollen.instanceColor) this.pollen.instanceColor.needsUpdate = true
  }

  private syncSnail(c: MeadowController): void {
    const snail = c.snail
    poseSnail(snail, this.snailParts)
    const stretch = snail.stretch
    const headZ = 4.9 * stretch + (stretch - 1) * 3.2
    // The head's top surface: it rises toward the front of the body, and sinks as the body pulls in.
    const headTop = 2.2 + 0.85 * Math.min(1, Math.max(0, (headZ - 2) / 2.9))
    const look = snail.eyeLook
    const towardChild = -Math.sin(snail.childSide()) * 0.65 * look
    const wobble = 1 + snail.wobble * 3
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1
      const eye = i === 0 ? snail.eyeLeft.x : snail.eyeRight.x
      const nod = Math.sin(snail.t * (2.1 + i * 0.4) * (1 + snail.wobble) + i) * 0.1 * wobble
      const sway = Math.sin(snail.t * 1.7 * (1 + snail.wobble * 1.5) + i * 2) * 0.08 * wobble
      E.set(0.26 * (1 - 0.7 * look) + nod, 0, side * (0.42 * (1 - 0.5 * look) + sway) + towardChild)
      Q.setFromEuler(E)
      const s = Math.max(0.02, eye)
      M.compose(V.set(side * 0.62, headTop, headZ), Q, S.set(Math.min(1, s * 1.5), s, Math.min(1, s * 1.5)))
      this.eyes.setMatrixAt(i, M)
    }
    this.eyes.instanceMatrix.needsUpdate = true
  }

  private syncMouse(c: MeadowController): void {
    const mouse = c.mouse
    const visible = mouse.visible()
    this.mouse.visible = visible
    if (!visible) return
    poseMouse(mouse, this.mouseParts)
  }

  private syncGuidance(c: MeadowController, camera: Camera): void {
    const hint = c.hint
    const glow = hint ? c.guide.glow : 0
    this.ringCount = 0
    if (hint && glow > 0.01) {
      switch (hint.kind) {
        case 'plantLoose':
          this.ringAt(hint.from.x, groundY(hint.from.x, hint.from.z) + 0.2, hint.from.z, SEED_RADIUS * 3.6, glow, c.t)
          break
        case 'plantPouch':
          // On the grass around the pouch: over the cream felt a gold ring barely shows,
          // and at seed height it crossed the seeds. The seed itself hops to say which one.
          this.ringAt(POUCH.x, groundY(POUCH.x, POUCH.z) + 0.2, POUCH.z, POUCH_RADIUS * 2.7, glow, c.t)
          break
        case 'callBee':
        case 'pick':
          this.ringAt(hint.from.x, plotTop(hint.plot) + 0.5, hint.from.z, PLOT_RADIUS * 2.4, glow, c.t)
          break
        default: {
          const unreachable: never = hint.kind
          return unreachable
        }
      }
      if (hint.to && (hint.kind === 'plantLoose' || hint.kind === 'plantPouch')) this.ringAt(hint.to.x, plotTop(hint.plot) + 0.3, hint.to.z, PLOT_RADIUS * 2.3, glow, c.t)
    }
    this.rings.count = this.ringCount
    this.rings.instanceMatrix.needsUpdate = true
    if (this.rings.instanceColor) this.rings.instanceColor.needsUpdate = true

    const hand = c.hand
    this.hand.visible = hand.visible
    this.ghostSeed.visible = false
    if (!hand.visible || !hint) return
    const carrying = hint.kind === 'plantLoose' || hint.kind === 'plantPouch'
    // The ghost seed rides where a seed the child held would, over the seed it shows and clear of the pouch.
    const ghostY = carrying ? c.heldY(null, hand.x, hand.z, HELD_LIFT) : 0
    const ground = groundY(hand.x, hand.z)
    const fingertip = carrying ? ghostY + SEED_RADIUS + 1.2 : hint.kind === 'callBee' ? plotTop(hint.plot) + STEM_HEIGHT : ground + 6
    const y = fingertip + (1 - hand.press) * 4.5
    this.hand.position.set(hand.x + 1.2, y, hand.z + 2)
    this.hand.quaternion.copy(camera.quaternion).multiply(this.handTwist)
    this.handMaterial.opacity = hand.opacity * 0.88
    if (carrying && hand.press > 0.05) {
      const hue = hint.kind === 'plantLoose' ? hueAt(c, hint.seedId) : PRIMARIES[hint.slot]
      if (hue !== null) {
        this.ghostSeed.visible = true
        this.ghostSeed.position.set(hand.x, ghostY, hand.z)
        this.ghostMaterial.color.copy(hueColor(hue))
        this.ghostMaterial.opacity = hand.opacity * 0.62 * Math.min(1, hand.press * 2)
      }
    }
  }

  private syncPuffs(c: MeadowController): void {
    let count = 0
    const limit = Math.floor(PUFF_POOL * this.particles)
    for (const puff of c.puffs) {
      if (puff.life <= 0 || count >= limit) continue
      const k = puff.life / puff.max
      const s = puff.size * Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(1, k * 1.15))))
      M.compose(V.set(puff.x, puff.y, puff.z), Q.identity(), S.set(s, s, s))
      this.puffs.setMatrixAt(count, M)
      this.puffs.setColorAt(count, puff.hue ? PETAL_COLORS.get(puff.hue) ?? C : paint(puff.tint, C))
      count++
    }
    this.puffs.count = count
    this.puffs.instanceMatrix.needsUpdate = true
    if (this.puffs.instanceColor) this.puffs.instanceColor.needsUpdate = true
  }
}

function hueAt(c: MeadowController, id: number): Hue | null {
  for (const seed of c.meadow.loose) if (seed.id === id) return seed.hue
  return null
}

function bezier(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, t: number, out: Vector3): Vector3 {
  const u = 1 - t
  return out.set(u * u * ax + 2 * u * t * bx + t * t * cx, u * u * ay + 2 * u * t * by + t * t * cy, u * u * az + 2 * u * t * bz + t * t * cz)
}
