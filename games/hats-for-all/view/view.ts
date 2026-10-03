import * as THREE from 'three'
import { MOST } from '../kinds'
import { placeOf, type World } from '../rules'
import { HAT_HEIGHT, SLAB } from '../sizes'
import { ARCH_X, ARCH_Z, TILE_Z } from '../stage'
import { DIMPLE_SECONDS, type CreaturePose, type Target, type Toy } from '../toy'
import { CREATURE_COLOUR, CREATURE_DEPTH, PALETTE, buildArch, buildMat, buildPieces, buildRoom, buildTile, type Pieces } from './build'
import { blobTexture, foamMaterials } from './foam'

// The foam scene in three.js: it draws the numbers the toy gives it and
// answers where a finger landed. It holds no rule and no timing of its own.
// Everything is built once; a frame only moves what is there.

const BLOBS = MOST * 2 + 6
const HAT_REACH = 1.15

export class FoamView {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 1, 200)
  private readonly foam = foamMaterials()
  private readonly pieces: Pieces = buildPieces()
  private readonly solid: THREE.Mesh[] = []
  private readonly tile: THREE.Mesh
  private readonly arch: THREE.Mesh
  private readonly hats: THREE.Mesh[] = []
  private readonly bodies: THREE.Mesh[] = []
  private readonly ears: THREE.Mesh[] = []
  private readonly dots: THREE.InstancedMesh
  private readonly hands: THREE.InstancedMesh
  private readonly blobs: THREE.InstancedMesh
  private readonly blobMap = blobTexture()
  private readonly m = new THREE.Matrix4()
  private readonly body = new THREE.Matrix4()
  private readonly v = new THREE.Vector3()
  private readonly q = new THREE.Quaternion()
  private readonly s = new THREE.Vector3()
  private readonly colour = new THREE.Color()
  private readonly pose: CreaturePose = { x: 0, y: 0, z: 0, squash: 1, lean: 0, gazeX: 0, gazeY: 0, pat: 0, mouth: 0, eyes: 1 }
  private width = 1
  private height = 1

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' })
    this.renderer.setClearColor(PALETTE.wall)
    this.renderer.toneMapping = THREE.NoToneMapping
    // Daylight from a window, not a lamp: a broad sky light and one soft sun, and no shadow map.
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#d9d2c2', 2.5))
    const sun = new THREE.DirectionalLight('#ffffff', 1.25)
    sun.position.set(-7, 15, 10)
    this.scene.add(sun)
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material = this.foam.stippled): THREE.Mesh => {
      const mesh = new THREE.Mesh(geometry, material)
      this.scene.add(mesh)
      if (material === this.foam.stippled) this.solid.push(mesh)
      return mesh
    }
    add(buildRoom(), this.foam.plain)
    add(buildMat())
    this.arch = add(buildArch())
    this.arch.position.set(ARCH_X, 0, ARCH_Z)
    this.tile = add(new THREE.BufferGeometry())
    this.tile.position.set(0, 0, TILE_Z)
    for (let i = 0; i < MOST; i++) {
      const hat = add(this.pieces.hats.cone)
      hat.rotation.order = 'ZXY'
      this.hats.push(hat)
      this.bodies.push(add(this.pieces.bodies.bop))
    }
    for (let i = 0; i < 2; i++) this.ears.push(add(this.pieces.ear))
    this.hands = new THREE.InstancedMesh(this.pieces.hand, this.foam.plain, MOST * 2)
    this.dots = new THREE.InstancedMesh(this.pieces.dot, new THREE.MeshBasicMaterial({ color: PALETTE.dot }), MOST * 3)
    this.blobs = new THREE.InstancedMesh(this.pieces.blob, new THREE.MeshBasicMaterial({ color: PALETTE.shadow, map: this.blobMap, transparent: true, opacity: 0.5, depthWrite: false }), BLOBS)
    for (const instanced of [this.hands, this.dots, this.blobs]) {
      instanced.frustumCulled = false
      this.scene.add(instanced)
    }
    this.blobs.renderOrder = 1
  }

  /** Lays out a cycle: its tile with one hole for each hat, a hat of the right kind in each mesh, a body for each creature. */
  layOut(world: World): void {
    this.tile.geometry.dispose()
    this.tile.geometry = buildTile(world.tile)
    this.hats.forEach((mesh, hat) => {
      mesh.visible = hat < world.tile.length
      if (mesh.visible) mesh.geometry = this.pieces.hats[world.tile[hat]]
    })
  }

  /** The stipple is the first thing a slower tier sheds. Both materials are compiled from the start. */
  setStipple(on: boolean): void {
    for (const mesh of this.solid) mesh.material = on ? this.foam.stippled : this.foam.plain
  }

  /** Compiles everything a tier change can need, before the first frame. */
  warm(): void {
    this.setStipple(false)
    this.renderer.compile(this.scene, this.camera)
    this.setStipple(true)
    this.renderer.compile(this.scene, this.camera)
  }

  resize(width: number, height: number, ratio: number): void {
    this.width = width
    this.height = height
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    // The whole row, the arch and the tile stay in view at any shape: a narrow surface moves the camera back.
    const aspect = width / height, half = THREE.MathUtils.degToRad(this.camera.fov / 2)
    const far = Math.max(10.9 / (Math.tan(half) * aspect), 6.1 / Math.tan(half))
    this.camera.aspect = aspect
    this.camera.position.set(2.3, 1.5 + far * Math.sin(0.6), 1.55 + far * Math.cos(0.6))
    this.camera.lookAt(2.3, 1.5, 1.55)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
  }

  /** Draws one frame from the toy's numbers. `glow` is the idle ladder's: the hats that can be taken stir. */
  draw(toy: Toy, glow: number): { drawCalls: number; triangles: number } {
    const world = toy.world
    let blob = 0, dot = 0, hand = 0, ear = 0
    const shade = (x: number, z: number, wide: number, deep: number, y = 0.012): void => {
      if (blob >= BLOBS) return
      this.blobs.setMatrixAt(blob++, this.m.compose(this.v.set(x, y, z), this.q.identity(), this.s.set(wide, 1, deep)))
    }
    this.bodies.forEach((mesh, i) => {
      const creature = world.crew[i]
      mesh.visible = creature !== undefined
      if (!creature) return
      const pose = toy.creaturePose(creature.spot, this.pose), cut = this.pieces.cuts[creature.kind], wide = 1 / Math.sqrt(pose.squash)
      mesh.geometry = this.pieces.bodies[creature.kind]
      mesh.position.set(pose.x, pose.y, pose.z)
      mesh.rotation.z = pose.lean
      mesh.scale.set(wide, pose.squash, 1)
      mesh.updateMatrix()
      this.body.copy(mesh.matrix)
      const front = CREATURE_DEPTH / 2
      const part = (x: number, y: number, z: number, sx: number, sy: number, sz = 1): THREE.Matrix4 => this.m.compose(this.v.set(x, y, z), this.q.identity(), this.s.set(sx, sy, sz)).premultiply(this.body)
      const pupil = cut.eyeSize * 0.5, wander = cut.eyeSize * 0.42
      for (const side of [-1, 1]) {
        this.dots.setMatrixAt(dot++, part(side * cut.eyeGap + pose.gazeX * wander, cut.faceY + pose.gazeY * wander, front + 0.17, pupil, pupil * pose.eyes))
        // A hand rests at its side, and goes up to pat the top of its bare head.
        const hx = side * (cut.reach + (0.36 - cut.reach) * pose.pat), hy = cut.top * 0.42 + (cut.top * 0.56 + 0.08) * pose.pat
        this.hands.setMatrixAt(hand, part(hx, hy, 0.16 + 0.2 * pose.pat, 1, 1))
        this.hands.setColorAt(hand++, this.colour.set(CREATURE_COLOUR[creature.kind]).multiplyScalar(0.86))
        if (creature.kind === 'flop' && ear < this.ears.length) this.swing(this.ears[ear++], side, cut.top, pose)
      }
      this.dots.setMatrixAt(dot++, part(0, cut.faceY - cut.eyeSize * 1.55, front + 0.02, 0.15 + 0.05 * pose.mouth, 0.045 + 0.15 * pose.mouth))
      shade(pose.x, pose.z + 0.1, cut.ground * 2.3 / (1 + pose.y * 0.4), 1.5 / (1 + pose.y * 0.4))
    })
    while (ear < this.ears.length) this.ears[ear++].visible = false
    world.tile.forEach((_, hat) => {
      const pose = toy.hatPose(hat), mesh = this.hats[hat], flat = 1 - pose.up, give = 1 - pose.squash
      const stir = placeOf(world, hat).at === 'tile' ? glow * (0.5 + 0.5 * Math.sin(toy.time * 5 + hat * 1.7)) : 0
      mesh.position.set(pose.x, pose.y - flat * give * SLAB * 0.9 + stir * 0.1, pose.z)
      mesh.rotation.set(-Math.PI / 2 * flat - pose.flip, 0, pose.tilt + stir * 0.05)
      // Lying in its hole a hat gives downwards; standing it squashes onto what it stands on and spreads.
      mesh.scale.set(1 + pose.up * (1 / Math.sqrt(pose.squash) - 1), 1 - pose.up * give, 1 - flat * give * 0.5)
      if (pose.up > 0.02) shade(pose.x, pose.z, 2 / (1 + pose.y * 0.25), 1.1 / (1 + pose.y * 0.25))
    })
    this.arch.scale.set(1 / Math.sqrt(toy.arch.x), toy.arch.x, 1)
    shade(ARCH_X - 1.9, ARCH_Z + 0.1, 1.5, 1.3)
    shade(ARCH_X + 1.9, ARCH_Z + 0.1, 1.5, 1.3)
    for (const dimple of toy.dimples) {
      const size = Math.sin(Math.PI * dimple.age / DIMPLE_SECONDS) * 3.2
      shade(dimple.x, dimple.z, size, size * 0.8, dimple.z > TILE_Z - 1.6 && dimple.z < TILE_Z + 1.6 ? SLAB + 0.012 : 0.012)
    }
    this.dots.count = dot
    this.hands.count = hand
    this.blobs.count = blob
    for (const instanced of [this.dots, this.hands, this.blobs]) instanced.instanceMatrix.needsUpdate = true
    if (this.hands.instanceColor) this.hands.instanceColor.needsUpdate = true
    this.renderer.render(this.scene, this.camera)
    return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  /** Flop's ears hang from the top of its head and swing a little behind its lean. */
  private swing(ear: THREE.Mesh, side: number, top: number, pose: CreaturePose): void {
    ear.visible = true
    ear.matrixAutoUpdate = false
    this.q.setFromAxisAngle(this.v.set(0, 0, 1), side * (0.2 + 0.5 * pose.pat) - pose.lean * 2.5 + side * (1 - pose.squash) * 1.6)
    ear.matrix.compose(this.v.set(side * 0.78, top - 0.42, -0.1), this.q, this.s.set(1, 1, 1)).premultiply(this.body)
    ear.matrixWorldNeedsUpdate = true
  }

  private toScreen(x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
    out.set(x, y, z).project(this.camera)
    return out.set((out.x + 1) / 2 * this.width, (1 - out.y) / 2 * this.height, 0)
  }

  /** What is under a finger at `x`, `y` on the surface. A small hand is given room: the nearest thing within its reach wins. */
  pick(x: number, y: number, toy: Toy): Target {
    let best: Target | null = null, bestScore = 1
    const centre = new THREE.Vector3(), edge = new THREE.Vector3()
    const tryFor = (target: Target, cx: number, cy: number, cz: number, reach: number, favour = 1): void => {
      this.toScreen(cx, cy, cz, centre)
      this.toScreen(cx + reach, cy, cz, edge)
      const score = Math.hypot(centre.x - x, centre.y - y) / Math.max(50, edge.x - centre.x) * favour
      if (score < bestScore) { bestScore = score; best = target }
    }
    toy.world.tile.forEach((kind, hat) => {
      const pose = toy.hatPose(hat), half = HAT_HEIGHT[kind] / 2
      tryFor({ type: 'hat', hat }, pose.x, pose.y + half * pose.up, pose.z - half * (1 - pose.up), HAT_REACH, 0.9)
    })
    for (const creature of toy.world.crew) {
      const cut = this.pieces.cuts[creature.kind], pose = toy.creaturePose(creature.spot, this.pose)
      tryFor({ type: 'creature', spot: creature.spot }, pose.x, pose.y + cut.top / 2, pose.z, Math.max(cut.reach, cut.top / 2) + 0.15)
    }
    tryFor({ type: 'arch' }, ARCH_X, 2.4, ARCH_Z, 2.4)
    if (best) return best
    // Nothing near: the finger is on the foam floor, at the place its ray meets the mat.
    const ray = new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2(x / this.width * 2 - 1, 1 - y / this.height * 2), this.camera)
    const t = -ray.ray.origin.y / ray.ray.direction.y
    return { type: 'floor', x: ray.ray.origin.x + ray.ray.direction.x * t, z: ray.ray.origin.z + ray.ray.direction.z * t }
  }

  dispose(): void {
    this.scene.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
    for (const geometry of [...Object.values(this.pieces.hats), ...Object.values(this.pieces.bodies)]) geometry.dispose()
    for (const material of [this.foam.stippled, this.foam.plain, this.dots.material, this.blobs.material]) (material as THREE.Material).dispose()
    this.foam.stipple.dispose()
    this.blobMap.dispose()
    this.renderer.dispose()
  }
}
