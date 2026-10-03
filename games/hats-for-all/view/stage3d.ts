import * as THREE from 'three'
import type { LetGo, Target } from '../game'
import type { Hint } from '../guide'
import { MOST, type HatKind } from '../kinds'
import { DIMPLE_SECONDS, type ActorPose, type Play } from '../play'
import { CREATURE_DEPTH, HAND, HAT_HEIGHT, SLAB, TILE_DEPTH } from '../sizes'
import { ARCH_X, ARCH_Z, LANE_Z, TILE_Z } from '../stage'
import { tileWidth } from '../tile'
import { CREATURE_COLOUR, PALETTE, buildArch, buildMat, buildPieces, buildRoom, buildTile, type Pieces } from './build'
import { blobTexture, foamMaterials, handTexture, ringTexture } from './foam'

// The foam scene as three.js objects, with no renderer: it is built once,
// moves what is there from the theatre's numbers each frame, and answers
// where a finger landed. A test can build it and count what a frame would
// draw. It holds no rule and no timing of its own.

/** The most creatures on the mat at once: a crew walking off, the next walking in, and no more. */
const BODIES = MOST * 2
const BLOBS = BODIES + MOST + 8
const GLOWS = MOST
const HAT_REACH = 1.15
/** A hat in the hand floats on a wall in front of the row, and never lower than this above the floor: clear of every head, loose hat and the tile. */
const HOLD_Z = LANE_Z + 0.45
const CARRY_Y = 1.95

export type Guide = { hint: Hint; glow: number; press: number; opacity: number }

export class FoamStage {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(34, 1, 1, 200)
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
  private readonly glows: THREE.InstancedMesh
  private readonly hand: THREE.Sprite
  private readonly textures = [blobTexture(), handTexture(), ringTexture()]
  private readonly m = new THREE.Matrix4()
  private readonly body = new THREE.Matrix4()
  private readonly v = new THREE.Vector3()
  private readonly w = new THREE.Vector3()
  private readonly q = new THREE.Quaternion()
  private readonly s = new THREE.Vector3()
  private readonly colour = new THREE.Color()
  private readonly ray = new THREE.Raycaster()
  private readonly pose = {} as ActorPose
  private tileFor = ''
  private width = 1
  private height = 1

  constructor() {
    // Daylight from a window, not a lamp: a broad sky light and one soft sun, and no shadow map.
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#d9d2c2', 2.5))
    const sun = new THREE.DirectionalLight('#ffffff', 1.25)
    sun.position.set(-7, 15, 10)
    this.scene.add(sun)
    const add = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material = this.foam.stippled): THREE.Mesh => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = name
      this.scene.add(mesh)
      if (material === this.foam.stippled) this.solid.push(mesh)
      return mesh
    }
    add('room', buildRoom(), this.foam.plain)
    add('mat', buildMat())
    this.arch = add('arch', buildArch())
    this.arch.position.set(ARCH_X, 0, ARCH_Z)
    this.tile = add('tile', new THREE.BufferGeometry())
    this.tile.visible = false
    for (let i = 0; i < MOST; i++) {
      const hat = add(`hat-${i}`, this.pieces.hats.cone)
      hat.rotation.order = 'ZXY'
      hat.visible = false
      this.hats.push(hat)
    }
    for (let i = 0; i < BODIES; i++) {
      const body = add(`creature-${i}-body`, this.pieces.bodies.bop)
      body.rotation.order = 'YZX'
      body.userData.jamObject = `creature-${i}`
      body.visible = false
      this.bodies.push(body)
    }
    for (let i = 0; i < 4; i++) {
      const ear = add(`ear-${i}`, this.pieces.ear)
      ear.matrixAutoUpdate = false
      ear.visible = false
      this.ears.push(ear)
    }
    const instanced = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, count: number): THREE.InstancedMesh => {
      const mesh = new THREE.InstancedMesh(geometry, material, count)
      mesh.name = name
      mesh.frustumCulled = false
      mesh.count = 0
      this.scene.add(mesh)
      return mesh
    }
    const flat = (colour: string, opacity: number, map = 0): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color: colour, map: this.textures[map], transparent: true, opacity, depthWrite: false })
    this.hands = instanced('hands', this.pieces.hand, this.foam.plain, BODIES * 2)
    this.dots = instanced('dots', this.pieces.dot, new THREE.MeshBasicMaterial({ color: PALETTE.dot }), BODIES * 3)
    this.blobs = instanced('shadow-blobs', this.pieces.blob, flat(PALETTE.shadow, 0.5), BLOBS)
    this.glows = instanced('glow-blobs', this.pieces.blob, flat(PALETTE.glow, 0.9, 2), GLOWS)
    this.blobs.renderOrder = 1
    this.glows.renderOrder = 2
    // The owners of each hand and each dot, for a check that reads the scene: they belong to their creature.
    this.hands.userData.jamInstanceObjects = Array.from({ length: BODIES * 2 }, (_, i) => `creature-${Math.floor(i / 2)}`)
    this.dots.userData.jamInstanceObjects = Array.from({ length: BODIES * 3 }, (_, i) => `creature-${Math.floor(i / 3)}`)
    this.hand = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.textures[1], transparent: true, depthTest: false, depthWrite: false }))
    this.hand.name = 'ghost-hand'
    this.hand.center.set(0.5, 1)
    this.hand.renderOrder = 3
    this.hand.visible = false
    this.scene.add(this.hand)
  }

  /** The stipple is the first thing a slower tier sheds. Both materials exist from the start. */
  setStipple(on: boolean): void {
    for (const mesh of this.solid) mesh.material = on ? this.foam.stippled : this.foam.plain
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    // The whole row, the arch and the tile stay in view at any shape: a narrow surface moves the camera back.
    const aspect = width / height, half = THREE.MathUtils.degToRad(this.camera.fov / 2)
    const far = Math.max(11.6 / (Math.tan(half) * aspect), 6.5 / Math.tan(half))
    this.camera.aspect = aspect
    this.camera.position.set(2.6, 1.6 + far * Math.sin(0.6), 1.1 + far * Math.cos(0.6))
    this.camera.lookAt(2.6, 1.6, 1.1)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
  }

  /** Cuts the tile for this cycle's hats, when they have changed. */
  private cutTile(play: Play): void {
    const kinds: HatKind[] = []
    for (let hat = 0; hat < play.hatCount; hat++) kinds.push(play.hatKind(hat))
    const key = kinds.join(' ')
    if (key === this.tileFor) return
    this.tileFor = key
    this.tile.geometry.dispose()
    this.tile.geometry = buildTile(kinds)
    this.hats.forEach((mesh, hat) => { if (hat < kinds.length) mesh.geometry = this.pieces.hats[kinds[hat]] })
  }

  /** Moves everything to where the theatre has it this frame. With no theatre yet, the bare mat and the arch. */
  update(play: Play | null, guide: Guide | null): void {
    let blob = 0, dot = 0, hand = 0, ear = 0, glow = 0
    const shade = (x: number, z: number, wide: number, deep: number, y = 0.012): void => {
      if (blob < BLOBS) this.blobs.setMatrixAt(blob++, this.m.compose(this.v.set(x, y, z), this.q.identity(), this.s.set(wide, 1, deep)))
    }
    const lit = (target: Target): boolean => guide !== null && guide.glow > 0 && guide.hint.glow.some((one) => one.type === target.type && (one.type === 'hat' ? one.hat === (target as { hat: number }).hat : one.type === 'creature' && one.who === (target as { who: string }).who))
    const halo = (x: number, y: number, z: number, size: number): void => {
      if (glow < GLOWS) this.glows.setMatrixAt(glow++, this.m.compose(this.v.set(x, y, z), this.q.identity(), this.s.set(size, 1, size)))
    }
    const pulse = guide ? guide.glow * (0.75 + 0.25 * Math.sin((play?.time ?? 0) * 4)) : 0
    this.tile.visible = play !== null && play.hatCount > 0
    const cast = play ? play.cast : []
    this.bodies.forEach((mesh, i) => {
      const who = cast[i]
      mesh.visible = play !== null && who !== undefined
      if (!play || who === undefined) return
      const kind = play.kindOf(who), pose = play.actorPose(who, this.pose), cut = this.pieces.cuts[kind], wide = 1 / Math.sqrt(pose.squash)
      mesh.geometry = this.pieces.bodies[kind]
      mesh.position.set(pose.x, pose.y, pose.z)
      mesh.rotation.set(0, pose.turn, pose.lean)
      mesh.scale.set(wide, pose.squash, 1)
      mesh.updateMatrix()
      this.body.copy(mesh.matrix)
      const front = CREATURE_DEPTH / 2
      const part = (x: number, y: number, z: number, sx: number, sy: number): THREE.Matrix4 => this.m.compose(this.v.set(x, y, z), this.q.identity(), this.s.set(sx, sy, 1)).premultiply(this.body)
      const pupil = cut.eyeSize * 0.5, wander = cut.eyeSize * 0.42
      for (const side of [-1, 1]) {
        // Crossed eyes turn each pupil in towards the other.
        const lookX = pose.gazeX * (1 - pose.cross) - side * pose.cross
        this.dots.setMatrixAt(i * 3 + (side + 1) / 2, part(side * cut.eyeGap + lookX * wander, cut.faceY + pose.gazeY * wander, front + 0.17, pupil, pupil * pose.eyes))
        // A hand rests at its side, and goes up to pat the top of its bare head.
        const hx = side * (cut.reach + (0.36 - cut.reach) * pose.pat), hy = cut.top * 0.42 + (cut.top * 0.56 + 0.08) * pose.pat
        this.hands.setMatrixAt(i * 2 + (side + 1) / 2, part(hx, hy, HAND.front - HAND.depth / 2, 1, 1))
        this.hands.setColorAt(i * 2 + (side + 1) / 2, this.colour.set(CREATURE_COLOUR[kind]).multiplyScalar(0.86))
        if (kind === 'flop' && ear < this.ears.length) this.swing(this.ears[ear++], i, side, cut.top, pose)
      }
      this.dots.setMatrixAt(i * 3 + 2, part(0, cut.faceY - cut.eyeSize * 1.55, front + 0.02, 0.15 + 0.05 * pose.mouth, 0.045 + 0.15 * pose.mouth))
      dot = (i + 1) * 3
      hand = (i + 1) * 2
      shade(pose.x, pose.z + 0.1, cut.ground * 2.3 / (1 + pose.y * 0.4), 1.5 / (1 + pose.y * 0.4))
      if (lit({ type: 'creature', who })) halo(pose.x, 0.02, pose.z + 0.1, cut.ground * (2.6 + 1.2 * pulse))
    })
    while (ear < this.ears.length) this.ears[ear++].visible = false
    if (play) {
      this.cutTile(play)
      this.tile.position.set(0, 0, play.tileZ)
      this.hats.forEach((mesh, hat) => {
        mesh.visible = hat < play.hatCount
        if (!mesh.visible) return
        const pose = play.hatPose(hat), flat = 1 - pose.up, give = 1 - pose.squash, glowing = lit({ type: 'hat', hat })
        const stir = glowing ? pulse * (0.5 + 0.5 * Math.sin(play.time * 5 + hat * 1.7)) : 0
        mesh.position.set(pose.x, pose.y - flat * give * SLAB * 0.9 + stir * 0.1, pose.z)
        mesh.rotation.set(-Math.PI / 2 * flat - pose.flip, pose.turn, pose.tilt + stir * 0.05)
        // Lying in its hole a hat gives downwards; standing it squashes onto what it stands on and spreads.
        mesh.scale.set(1 + pose.up * (1 / Math.sqrt(pose.squash) - 1), 1 - pose.up * give, 1 - flat * give * 0.5)
        if (pose.up > 0.02) shade(pose.x, pose.z, 2 / (1 + pose.y * 0.25), 1.1 / (1 + pose.y * 0.25))
        if (glowing) halo(pose.x, flat > 0.5 ? SLAB + 0.02 : 0.02, pose.z - flat * HAT_HEIGHT[play.hatKind(hat)] / 2, 2.6 + 1.2 * pulse)
      })
      this.arch.scale.set(1 / Math.sqrt(play.arch.x), play.arch.x, 1)
      for (const dimple of play.dimples) {
        const size = Math.sin(Math.PI * dimple.age / DIMPLE_SECONDS) * 3.2
        shade(dimple.x, dimple.z, size, size * 0.8, Math.abs(dimple.z - play.tileZ) < TILE_DEPTH / 2 && Math.abs(dimple.x) < tileWidth(play.hatCount) / 2 ? SLAB + 0.012 : 0.012)
      }
    } else for (const mesh of this.hats) mesh.visible = false
    shade(ARCH_X - 2.3, ARCH_Z + 0.1, 1.5, 1.3)
    shade(ARCH_X + 2.3, ARCH_Z + 0.1, 1.5, 1.3)
    this.dots.count = dot
    this.hands.count = hand
    this.blobs.count = blob
    this.glows.count = glow
    for (const mesh of [this.dots, this.hands, this.blobs, this.glows]) {
      mesh.instanceMatrix.needsUpdate = true
      // An instanced mesh with nothing in it is not submitted at all.
      mesh.visible = mesh.count > 0
    }
    if (this.hands.instanceColor) this.hands.instanceColor.needsUpdate = true
    // The ghost hand comes down on one thing, once, and goes: it is a hand, and it shows a tap.
    const at = play && guide && guide.opacity > 0 && guide.hint.hand ? this.whereIs(guide.hint.hand, play) : null
    this.hand.visible = at !== null
    if (at && guide) {
      this.hand.position.set(at.x + 0.15, at.y + 0.1 + 0.6 * (1 - guide.press), at.z + 0.1)
      const size = 2.4 * (1 - 0.12 * guide.press)
      this.hand.scale.set(size, size, 1)
      this.hand.material.opacity = guide.opacity * 0.92
    }
  }

  /** Flop's ears hang from the top of its head, swing a little behind its lean, and fling out or droop as it feels. */
  private swing(ear: THREE.Mesh, slot: number, side: number, top: number, pose: ActorPose): void {
    ear.visible = true
    ear.userData.jamObject = `creature-${slot}`
    this.q.setFromAxisAngle(this.v.set(0, 0, 1), side * (0.2 + 0.5 * pose.pat + 0.9 * Math.max(0, pose.ears) - 0.15 * Math.max(0, -pose.ears)) - pose.lean * 2.5 + side * (1 - pose.squash) * 1.6)
    ear.matrix.compose(this.v.set(side * 0.78, top - 0.42, -0.1), this.q, this.s.set(1, 1, 1)).premultiply(this.body)
    ear.matrixWorldNeedsUpdate = true
  }

  /** The middle of a thing a finger can land on. */
  private whereIs(target: Target, play: Play): THREE.Vector3 | null {
    if (target.type === 'hat') {
      if (target.hat >= play.hatCount) return null
      const pose = play.hatPose(target.hat), half = HAT_HEIGHT[play.hatKind(target.hat)] / 2
      return this.w.set(pose.x, pose.y + half * pose.up, pose.z - half * (1 - pose.up))
    }
    if (target.type === 'creature') {
      if (!play.has(target.who)) return null
      const pose = play.actorPose(target.who, this.pose)
      return this.w.set(pose.x, pose.y + this.pieces.cuts[play.kindOf(target.who)].top / 2, pose.z)
    }
    return target.type === 'arch' ? this.w.set(ARCH_X, 2.4, ARCH_Z) : null
  }

  private toScreen(x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
    out.set(x, y, z).project(this.camera)
    return out.set((out.x + 1) / 2 * this.width, (1 - out.y) / 2 * this.height, 0)
  }

  /** Where on the surface a point of the mat is drawn, in its own pixels. */
  screenOf(x: number, y: number, z: number): { x: number; y: number } {
    const at = this.toScreen(x, y, z, new THREE.Vector3())
    return { x: at.x, y: at.y }
  }

  private aim(x: number, y: number): THREE.Ray {
    this.ray.setFromCamera(new THREE.Vector2(x / this.width * 2 - 1, 1 - y / this.height * 2), this.camera)
    return this.ray.ray
  }

  private floorUnder(x: number, y: number): { x: number; z: number } {
    const ray = this.aim(x, y), t = -ray.origin.y / ray.direction.y
    return { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t }
  }

  /** What is under a finger. A small hand is given room: the nearest thing within its reach wins, and `but` (a hat in the hand) is passed over. */
  pick(x: number, y: number, play: Play, but = -1): Target {
    let best: Target | null = null, bestScore = 1
    const centre = new THREE.Vector3(), edge = new THREE.Vector3()
    const tryFor = (target: Target, reach: number, favour = 1): void => {
      const at = this.whereIs(target, play)
      if (!at) return
      const cx = at.x, cy = at.y, cz = at.z
      this.toScreen(cx, cy, cz, centre)
      this.toScreen(cx + reach, cy, cz, edge)
      const score = Math.hypot(centre.x - x, centre.y - y) / Math.max(50, edge.x - centre.x) * favour
      if (score < bestScore) { bestScore = score; best = target }
    }
    for (let hat = 0; hat < play.hatCount; hat++) if (hat !== but) tryFor({ type: 'hat', hat }, HAT_REACH, 0.9)
    for (const who of play.cast) {
      const cut = this.pieces.cuts[play.kindOf(who)]
      tryFor({ type: 'creature', who }, Math.max(cut.reach, cut.top / 2) + 0.15)
    }
    tryFor({ type: 'arch' }, 2.4, 1.15)
    if (best) return best
    // Nothing near: the finger is on the foam floor, at the place its ray meets the mat.
    return { type: 'floor', ...this.floorUnder(x, y) }
  }

  /** Where a dragged thing is let go: on a creature (or the hat on its head), on the tile, or on the floor. A drag counts when it gets near. */
  letGoAt(x: number, y: number, play: Play, held: Target): LetGo {
    const under = this.pick(x, y, play, held.type === 'hat' ? held.hat : -1)
    if (under.type === 'creature' && !(held.type === 'creature' && held.who === under.who)) return { on: 'creature', who: under.who }
    if (under.type === 'hat') {
      const seen = play.seen(under.hat)
      if (seen.at === 'head' && !(held.type === 'creature' && held.who === seen.who)) return { on: 'creature', who: seen.who }
    }
    const floor = this.floorUnder(x, y)
    if (Math.abs(floor.z - play.tileZ) < TILE_DEPTH / 2 + 0.4 && Math.abs(floor.x) < tileWidth(play.hatCount) / 2 + 0.4) return { on: 'tile' }
    return { on: 'floor', ...floor }
  }

  /** Where a hat in the hand floats under a finger: on a wall in front of the row, and over the floor in front of that. */
  handPoint(x: number, y: number): { x: number; y: number; z: number } {
    const ray = this.aim(x, y), wall = (HOLD_Z - ray.origin.z) / ray.direction.z, wallY = ray.origin.y + ray.direction.y * wall
    if (wallY >= CARRY_Y) return { x: ray.origin.x + ray.direction.x * wall, y: wallY, z: HOLD_Z }
    const t = (CARRY_Y - ray.origin.y) / ray.direction.y
    return { x: ray.origin.x + ray.direction.x * t, y: CARRY_Y, z: Math.max(HOLD_Z, Math.min(TILE_Z + 4, ray.origin.z + ray.direction.z * t)) }
  }

  dispose(): void {
    this.scene.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
    for (const geometry of [...Object.values(this.pieces.hats), ...Object.values(this.pieces.bodies)]) geometry.dispose()
    for (const material of [this.foam.stippled, this.foam.plain, this.dots.material, this.blobs.material, this.glows.material, this.hand.material]) (material as THREE.Material).dispose()
    this.foam.stipple.dispose()
    for (const texture of this.textures) texture.dispose()
  }
}
