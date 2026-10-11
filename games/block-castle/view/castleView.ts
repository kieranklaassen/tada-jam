import * as THREE from 'three'
import type { Ray } from '../aim'
import { KINDS, PER_KIND, type Kind } from '../blocks'
import type { Tier } from '../config'
import { WHO } from '../folk'
import { handPose, type Guidance, type HandPose } from '../guidance'
import { BASKET, BASKET_TIP, BELL, FOLK, SIZE, WALL_Z, cameraFor, tippedAt } from '../layout'
import { landingDust, type Dust } from '../dust'
import { liftPose, liftStretch, settlePose, smooth, type SettlePose } from '../motion'
import type { Play, PlayEvent } from '../play'
import { makeRng } from '../rng'
import { EveningView } from './eveningView'
import { buildFolk, ride, type FolkView, type Manner } from './folkView'
import { ROOM, WALL, blotTexture, handTexture, softSquareTexture, woodAtlas } from './paint'
import { SHADOW, SUN_DIR, buildRoom, type Room } from './room'
import { blockGeometry } from './shapes'

// The view: the room, the eighteen blocks, the folk, and everything that
// drifts. It draws what the toy holds (play.ts) and decides nothing. All its
// own motion (dust, motes, the branch at the window) runs on the seconds of
// play it is handed, so a paused game is a still picture.
//
// Draws: the room is about twenty, the blocks six (one instanced mesh per
// kind, all on one material), the shadows two, the folk about twenty-six, the
// evening seven, and dust, motes, glow and the ghost hand one each.

const MOTES = 60
const PUFFS = 32
const SHADOWS = PER_KIND * KINDS.length + 1
/** How far the basket tips toward the rug, in radians. */

const DAY = { sun: '#ffd9a0', sky: '#e9eef5', ground: '#9c9468', paint: '#ffffff' }
const NIGHT = { sun: '#8ea4ff', sky: '#93a5e6', ground: '#465078', wall: '#7483b4', floor: '#8189b8', outside: '#2b3a70', branch: '#46578a' }

type Puff = { x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; life: number; size: number }

export class CastleView {
  readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 1, 80)
  private readonly room: Room
  private readonly folk: Record<'king' | 'cook' | 'dragon', FolkView>
  private readonly blocks = {} as Record<Kind, THREE.InstancedMesh>
  private readonly shadows: THREE.InstancedMesh
  private readonly blots: THREE.InstancedMesh
  private readonly evening = new EveningView()
  private readonly sun: THREE.DirectionalLight
  private readonly sky: THREE.HemisphereLight
  private readonly painted: { material: THREE.MeshBasicMaterial; night: string }[] = []
  private readonly fading: { material: THREE.Material; day: number }[] = []
  private readonly manner: Manner = { sits: 0, high: 0, tuck: 0, shake: 0, time: 0 }
  private aspect = 1
  private back = -1
  private readonly dayColour = new THREE.Color()
  private readonly nightColour = new THREE.Color()
  private readonly halos: THREE.InstancedMesh
  private readonly puffMesh: THREE.InstancedMesh
  private readonly puffs: Puff[] = []
  private readonly motes: THREE.Points
  private readonly moteSeeds: Float32Array
  private readonly hand: THREE.Mesh
  private readonly chance = makeRng(977)
  /** Wool dust of landings that has still to come up. */
  private landings: Dust[] = []
  private seconds = 0
  private leafShadows = true
  // Scratch, so a frame allocates nothing.
  private readonly matrix = new THREE.Matrix4()
  private readonly at = new THREE.Vector3()
  private readonly turn = new THREE.Quaternion()
  private readonly size = new THREE.Vector3()
  private readonly euler = new THREE.Euler(0, 0, 0, 'YZX')
  private readonly tint = new THREE.Color()
  private readonly settle: SettlePose = { squash: 1, tilt: 0, turn: 0 }
  private readonly lifting: SettlePose = { squash: 1, tilt: 0, turn: 0 }
  private readonly handOut: HandPose = { travel: 0, press: 0, opacity: 0 }
  private readonly ndc = new THREE.Vector3()

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setClearColor(new THREE.Color(ROOM.floorDark))
    this.scene.name = 'block-castle'

    // Low sun through the window, and the soft light of the room: cool from above, warm green from the rug.
    this.sun = new THREE.DirectionalLight(DAY.sun, 2.4)
    this.sun.position.copy(SUN_DIR).multiplyScalar(-10)
    this.scene.add(this.sun)
    this.sky = new THREE.HemisphereLight(DAY.sky, DAY.ground, 1.75)
    this.scene.add(this.sky)

    this.room = buildRoom()
    this.scene.add(this.room.group)
    // What is painted and takes no light is tinted toward the evening by hand; what the sun throws fades with it.
    for (const [name, night] of [['wall', NIGHT.wall], ['floor', NIGHT.floor], ['outside', NIGHT.outside], ['branch', NIGHT.branch]] as const) {
      const mesh = this.room.group.getObjectByName(name) as THREE.Mesh | undefined
      if (mesh) this.painted.push({ material: mesh.material as THREE.MeshBasicMaterial, night })
    }
    for (const name of ['sun-patch', 'leaf-shadows']) {
      const mesh = this.room.group.getObjectByName(name) as THREE.Mesh | undefined
      if (mesh) this.fading.push({ material: mesh.material as THREE.Material, day: (mesh.material as THREE.Material).opacity })
    }
    this.scene.add(this.evening.group)

    // The blocks: one instanced mesh for each kind, all with the one wood material.
    const wood = new THREE.MeshLambertMaterial({ map: woodAtlas() })
    KINDS.forEach((kind, k) => {
      const mesh = new THREE.InstancedMesh(blockGeometry(kind), wood, PER_KIND)
      mesh.name = `blocks-${kind}`
      mesh.frustumCulled = false
      mesh.userData.jamInstanceObjects = Array.from({ length: PER_KIND }, (_, n) => `block-${k * PER_KIND + n}`)
      mesh.count = 0
      for (let n = 0; n < PER_KIND; n++) mesh.setColorAt(n, this.tint.set('#ffffff'))
      this.blocks[kind] = mesh
      this.scene.add(mesh)
    })

    const flat = new THREE.PlaneGeometry(1, 1)
    flat.rotateX(-Math.PI / 2)
    // The shadow of a block: its foot, laid over along the sun's way as far as the block is high.
    this.shadows = new THREE.InstancedMesh(flat, new THREE.MeshBasicMaterial({ map: softSquareTexture(), color: ROOM.shadow, transparent: true, opacity: 0.5, depthWrite: false }), SHADOWS)
    this.shadows.name = 'shadows'
    this.shadows.frustumCulled = false
    this.shadows.renderOrder = 3
    this.scene.add(this.shadows)
    // The folk are round, and throw round shadows.
    this.blots = new THREE.InstancedMesh(flat, new THREE.MeshBasicMaterial({ map: blotTexture(0.72), color: ROOM.shadow, transparent: true, opacity: 0.55, depthWrite: false }), 4)
    this.blots.name = 'folk-shadows'
    this.blots.frustumCulled = false
    this.blots.renderOrder = 3
    this.scene.add(this.blots)
    this.fading.push({ material: this.shadows.material as THREE.Material, day: 0.5 }, { material: this.blots.material as THREE.Material, day: 0.55 })

    const facing = new THREE.PlaneGeometry(1, 1)
    this.halos = new THREE.InstancedMesh(facing, new THREE.MeshBasicMaterial({ map: blotTexture(0.2), color: '#ffc46a', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }), PER_KIND * KINDS.length + 2)
    this.halos.name = 'glow'
    this.halos.frustumCulled = false
    this.halos.renderOrder = 6
    this.scene.add(this.halos)

    this.puffMesh = new THREE.InstancedMesh(facing, new THREE.MeshBasicMaterial({ map: blotTexture(0.3), color: '#e6e8c2', transparent: true, opacity: 0.55, depthWrite: false }), PUFFS)
    this.puffMesh.name = 'wool-dust'
    this.puffMesh.frustumCulled = false
    this.puffMesh.renderOrder = 5
    this.puffMesh.count = 0
    this.scene.add(this.puffMesh)

    // Dust motes in the beam: each has a place in the window and a way along the beam, and drifts about it.
    this.moteSeeds = new Float32Array(MOTES * 4)
    for (let i = 0; i < MOTES * 4; i++) this.moteSeeds[i] = this.chance.next()
    const moteGeometry = new THREE.BufferGeometry()
    moteGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(MOTES * 3), 3))
    this.motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ map: blotTexture(0.3), color: '#fff0c8', size: 0.085, sizeAttenuation: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.motes.name = 'motes'
    this.motes.frustumCulled = false
    this.scene.add(this.motes)
    this.fading.push({ material: this.motes.material as THREE.Material, day: 0.6 })

    this.folk = buildFolk()
    for (const who of WHO) {
      this.folk[who].root.visible = false
      this.scene.add(this.folk[who].root)
    }

    // The ghost hand: a pale mitten whose fingertip is its origin, drawn over everything.
    const mitten = new THREE.PlaneGeometry(0.9, 1.125)
    mitten.translate(0, -0.5, 0)
    this.hand = new THREE.Mesh(mitten, new THREE.MeshBasicMaterial({ map: handTexture(), transparent: true, depthTest: false, depthWrite: false }))
    this.hand.name = 'ghost-hand'
    this.hand.renderOrder = 9
    this.hand.visible = false
    this.scene.add(this.hand)
  }

  /** The size of the surface in CSS pixels and the pixel ratio to draw at. */
  resize(width: number, height: number, ratio: number): void {
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.aspect = width / height
    this.frame(Math.max(0, this.back), true)
  }

  /** Points the camera for this surface. `back` steps it back for an evening castle too tall for the frame. */
  private frame(back: number, always = false): void {
    if (!always && Math.abs(back - this.back) < 1e-4) return
    this.back = back
    const pose = cameraFor(this.aspect, back)
    this.camera.aspect = this.aspect
    this.camera.fov = pose.fovDeg
    this.camera.position.set(...pose.position)
    this.camera.lookAt(...pose.target)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
  }

  /** The room by day, by night, or between. */
  private light(dusk: number): void {
    const d = smooth(dusk)
    this.sun.color.copy(this.dayColour.set(DAY.sun)).lerp(this.nightColour.set(NIGHT.sun), d)
    this.sun.intensity = 2.4 - 1.35 * d
    this.sky.color.copy(this.dayColour.set(DAY.sky)).lerp(this.nightColour.set(NIGHT.sky), d)
    this.sky.groundColor.copy(this.dayColour.set(DAY.ground)).lerp(this.nightColour.set(NIGHT.ground), d)
    this.sky.intensity = 1.75 - 0.45 * d
    for (const { material, night } of this.painted) material.color.copy(this.dayColour.set(DAY.paint)).lerp(this.nightColour.set(night), d)
    for (const { material, day } of this.fading) material.opacity = day * (1 - 0.8 * d)
  }

  /** A tier changes how much is drawn, never what happens. */
  applyTier(tier: Tier): void {
    this.motes.geometry.setDrawRange(0, tier.motes)
    this.motes.visible = tier.motes > 0
    this.leafShadows = tier.leafShadows
    this.room.leaves.visible = tier.leafShadows
  }

  /** The ray through the camera at a point of the surface, in CSS pixels. */
  rayAt(x: number, y: number, width: number, height: number): Ray {
    this.ndc.set((x / width) * 2 - 1, 1 - (y / height) * 2, 0.5).unproject(this.camera).sub(this.camera.position).normalize()
    return { origin: [this.camera.position.x, this.camera.position.y, this.camera.position.z], dir: [this.ndc.x, this.ndc.y, this.ndc.z] }
  }

  /** What just happened in the toy that leaves a mark in the air: wool dust where a block lands on the rug or a finger pats it. */
  mark(events: readonly PlayEvent[]): void {
    for (const event of events) {
      // One ring round its foot; the long one a puff at each end, the second as its other end comes down.
      if (event.type === 'land' && !event.wood && !event.soft) this.landings.push(...landingDust(event.kind, event.at, () => this.chance.next()))
      // Water thrown up out of the moat.
      if (event.type === 'splash') for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2
        this.puff(event.at[0], 0.05, event.at[2], Math.cos(angle) * 1.5, 2.2 + this.chance.next(), Math.sin(angle) * 1.5, 0.3)
      }
      // A ring of smoke as smoke is: lumps of different sizes run together, no two alike, widening as it rises.
      if (event.type === 'puff') for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + (this.chance.next() - 0.5) * 0.5, out = 0.18 + this.chance.next() * 0.08
        this.puff(event.at[0] + Math.cos(angle) * out, event.at[1] + Math.sin(angle) * out, event.at[2], Math.cos(angle) * 0.25, 0.9 + Math.sin(angle) * 0.25, 0.5, 0.2 + this.chance.next() * 0.16, 1.5)
      }
      // A pat is answered where it lands: wool dust off the rug, a little dust off the boards, and a few flakes
      // of plaster that fall from the wall.
      if (event.type === 'pat') {
        const rug = event.surface === 'rug', wall = event.surface === 'wall'
        for (let i = 0; i < (rug ? 4 : 3); i++) {
          const angle = this.chance.next() * Math.PI * 2, far = rug ? 0.5 : 0.35
          if (wall) this.puff(event.at[0], event.at[1], event.at[2] + 0.06, Math.cos(angle) * 0.3, -0.3 - this.chance.next() * 0.4, 0.25, 0.14)
          else this.puff(event.at[0], 0.04, event.at[2], Math.cos(angle) * far, rug ? 0.5 : 0.3, Math.sin(angle) * far, rug ? 0.24 : 0.16)
        }
      }
    }
  }

  private puff(x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, life = 0.5): void {
    if (this.puffs.length >= PUFFS) this.puffs.shift()
    this.puffs.push({ x, y, z, vx, vy, vz, age: 0, life: life + this.chance.next() * 0.35, size })
  }

  /**
   * Draws the frame. With no toy yet (the slot has not been read) it draws the
   * bare room. `step` is the seconds of play this frame advances: 0 draws the
   * room as it stands.
   */
  draw(play: Play | null, guidance: Guidance | null, step: number): { drawCalls: number; triangles: number } {
    if (this.landings.length > 0) {
      for (const dust of this.landings) {
        dust.delay -= step
        if (dust.delay <= 0) this.puff(dust.x, 0.05, dust.z, Math.cos(dust.angle) * 0.9, 0.5 + this.chance.next() * 0.4, Math.sin(dust.angle) * 0.9, 0.34)
      }
      this.landings = this.landings.filter((dust) => dust.delay > 0)
    }
    this.seconds += step
    const t = this.seconds

    // The branch at the window sways, and the shadows of its leaves slide over the patch of sun.
    this.room.branch.rotation.z = 0.05 * Math.sin(t * 0.7) + 0.02 * Math.sin(t * 1.9)
    if (this.leafShadows) {
      const map = (this.room.leaves.material as THREE.MeshBasicMaterial).map!
      map.offset.set(0.04 * Math.sin(t * 0.7) + 0.012 * Math.sin(t * 1.9), 0.03 * Math.sin(t * 0.5 + 1))
    }
    this.drift(t)
    this.dust(step)

    let shadow = 0
    let blot = 0
    /** A shadow on the floor: a foot `w` by `d` about (x, z), thrown along the sun's way from height `from` to height `to`. */
    const cast = (x: number, z: number, w: number, d: number, from: number, to: number): void => {
      if (shadow >= SHADOWS) return
      const k = SHADOW.reach
      const bx = x + SHADOW.x * from * k, bz = z - d / 2 + SHADOW.z * from * k
      const fx = x + SHADOW.x * to * k, fz = z + d / 2 + SHADOW.z * to * k
      this.matrix.set(
        w, 0, fx - bx, (bx + fx) / 2,
        0, 1, 0, 0.012,
        0, 0, fz - bz, (bz + fz) / 2,
        0, 0, 0, 1)
      this.shadows.setMatrixAt(shadow++, this.matrix)
    }
    const round = (x: number, z: number, long: number, wide: number, turn: number, y = -0.03): void => {
      if (blot >= 4) return
      this.at.set(x, y, z)
      this.euler.set(0, turn, 0)
      this.turn.setFromEuler(this.euler)
      this.size.set(long, 1, wide)
      this.matrix.compose(this.at, this.turn, this.size)
      this.blots.setMatrixAt(blot++, this.matrix)
    }
    const along = Math.atan2(-SHADOW.z, SHADOW.x)

    for (const who of WHO) this.folk[who].root.visible = play !== null
    this.evening.group.visible = play !== null
    let glow = 0
    let halo = 0
    this.hand.visible = false
    if (play) {
      const evening = play.evening
      this.frame(evening.back)
      this.light(evening.dusk)
      this.evening.update(evening, t, this.camera)
      // The folk, each where the toy has him. One who is on the floor throws his shadow there; the cook's by day is
      // painted with his stool's.
      const manner = this.manner
      manner.time = t
      for (const who of WHO) {
        const placing = evening.actors[who].placing
        const shook = evening.shook[who]
        manner.sits = who === 'king' ? evening.kingSits : 0
        manner.high = who === 'cook' ? evening.cookHigh : 0
        manner.tuck = who === 'dragon' ? evening.tucked : 0
        manner.shake = shook > 0.45 && shook < 1.1 ? Math.sin(((shook - 0.45) / 0.65) * Math.PI) : 0
        this.folk[who].apply(play.folk.pose(who), placing, manner)
        // Out of the moat he drips: drops fly off him as he shakes.
        if (manner.shake > 0.2 && step > 0) for (let i = 0; i < 2; i++) {
          const angle = this.chance.next() * Math.PI * 2
          this.puff(placing.at[0] + Math.cos(angle) * 0.4, placing.at[1] + 0.5 + this.chance.next() * 0.8, placing.at[2] + Math.sin(angle) * 0.4, Math.cos(angle) * 2.2, -0.6 - this.chance.next(), Math.sin(angle) * 2.2, 0.1, 0.12)
        }
        // On the point of a roof that sags under him, he goes down with it; on a board that bends, with the board.
        if (who === 'king') this.folk.king.root.position.y -= evening.kingSags()
        ride(this.folk[who].root, evening.rides(who), evening.leans(who))
        const [x, y, z] = placing.at
        if (y > 0.5 || (who === 'cook' && y > 0.2)) continue
        if (who === 'king') round(x + 0.58 * FOLK.king.size, z + 0.73 * FOLK.king.size, 2.8 * FOLK.king.size, 1.55 * FOLK.king.size, along)
        if (who === 'cook') round(x + 0.3, z + 0.3, 2.2, 1.5, along, 0.012)
        if (who === 'dragon' && Math.hypot(x - FOLK.dragon.x, z - FOLK.dragon.z) < 0.6) round(x - 1.3 * FOLK.dragon.size, z + 0.3 * FOLK.dragon.size, 5.2 * FOLK.dragon.size, 1.5 * FOLK.dragon.size, 0)
      }
      // The basket rocks where it stands, and tips over toward the rug about its near bottom edge.
      const tip = play.basketTip * BASKET_TIP + play.basketRock.value * 0.03
      const pivot = BASKET.x - BASKET.wide / 2
      const cos = Math.cos(tip), sin = Math.sin(tip)
      this.room.basket.rotation.z = tip
      this.room.basket.position.set(pivot + cos * (BASKET.wide / 2), sin * (BASKET.wide / 2), BASKET.z)
      glow = guidance ? guidance.glow : 0
      const touchable = glow > 0 ? play.touchable() : []
      const breath = 0.7 + 0.3 * Math.sin(t * 3.2)
      const bent = evening.bent(), bentThing = bent ? evening.things[bent.index] : null
      for (const piece of play.pieces) {
        const mesh = this.blocks[piece.kind]
        const n = piece.id % PER_KIND
        const [w, h, d] = SIZE[piece.kind]
        settlePose(piece.kind, piece.settled, this.settle, piece.level > 0)
        // Coming up into the hand, each kind has its own way on top of the stretch they share.
        const lifted = piece.state === 'hand' || piece.lift.target > 0
        liftPose(piece.kind, lifted ? piece.sinceLift : -1, this.lifting)
        const stretch = lifted ? liftStretch(piece.sinceLift) : 1
        const tall = this.settle.squash * stretch * this.lifting.squash
        const broad = 1 / Math.sqrt(tall)
        const shown = Math.max(0, piece.scale.value)
        let tilt = this.settle.tilt + this.lifting.tilt + piece.leanZ
        // A block that rocks does so about the end that is down, so it never dips into what it stands on.
        const raise = (w / 2) * Math.abs(Math.sin(tilt)) + (d / 2) * Math.abs(Math.sin(piece.leanX))
        let px = piece.x, py = piece.y + piece.lift.value + piece.hop.value + raise
        // A bridge that bends turns about the edge of what holds it up.
        if (bent && piece.kind === 'long' && piece.state === 'rug' && Math.abs(piece.x - bentThing!.x) < 0.01 && Math.abs(piece.y - bent.base) < 0.01 && Math.abs(piece.z - bentThing!.z) < 0.01) {
          const dx = px - bent.pivot
          px = bent.pivot + Math.cos(bent.angle) * dx
          py += Math.sin(bent.angle) * dx
          tilt += bent.angle
        }
        // A block that stands in the basket tips with it.
        if (piece.state === 'offer' && piece.legs.length === 0 && Math.abs(tip) > 1e-4) {
          ;[px, py] = tippedAt(px, py, tip)
          tilt += tip
        }
        this.at.set(px, py, piece.z)
        this.euler.set(piece.leanX, piece.yaw + piece.jitter + this.settle.turn + this.lifting.turn, tilt)
        this.turn.setFromEuler(this.euler)
        this.size.set(broad * shown, tall * shown, broad * shown)
        this.matrix.compose(this.at, this.turn, this.size)
        mesh.setMatrixAt(n, this.matrix)
        // No two blocks are quite one colour, and the ones a child can take glow when the child is idle.
        const tone = 0.93 + 0.1 * ((piece.id * 7) % 5) / 4
        const lit = touchable.includes(piece.id) ? 1 + 0.2 * glow * breath : 1
        mesh.setColorAt(n, this.tint.setRGB(tone * lit, tone * lit, (tone - 0.02) * lit))
        if (lit > 1 && halo < KINDS.length) {
          this.at.set(piece.x, piece.y + h * 0.5, piece.z)
          this.size.setScalar(Math.max(w, h) * 1.7 * (0.85 + 0.15 * breath))
          this.matrix.compose(this.at, this.camera.quaternion, this.size)
          this.halos.setMatrixAt(halo++, this.matrix)
        }
        // Every block on the rug throws its own shadow: from the height of its foot to the height of its top.
        if (piece.state === 'rug') {
          const air = piece.y + piece.lift.value + piece.hop.value
          cast(piece.x, piece.z, w, d, air, air + h)
        }
      }
      // The block in the hand lays its shadow where it would land.
      const spot = play.landingSpot()
      if (spot && shadow < SHADOWS) {
        const [w, , d] = SIZE[spot.kind]
        this.matrix.set(w * 1.2, 0, 0, spot.at[0], 0, 1, 0, spot.at[1] + 0.014, 0, 0, d * 1.25, spot.at[2], 0, 0, 0, 1)
        this.shadows.setMatrixAt(shadow++, this.matrix)
      }
      // The bell glows with the blocks, once there is something for it to do.
      if (glow > 0 && play.bellGlows()) {
        this.at.set(BELL.x + 0.22, BELL.hangs, BELL.z)
        this.size.setScalar(1.5 * (0.85 + 0.15 * breath))
        this.matrix.compose(this.at, this.camera.quaternion, this.size)
        this.halos.setMatrixAt(halo++, this.matrix)
      }
      // In the evening what can be tapped is the castle: each thing glows where it stands.
      if (glow > 0) for (const thing of play.tappable()) {
        const [w, , d] = SIZE[thing.kind]
        this.at.set(thing.x, (thing.base + thing.crown) / 2, thing.z + d / 2)
        this.size.setScalar(Math.max(w, thing.crown - thing.base) * 1.5 * (0.85 + 0.15 * breath))
        this.matrix.compose(this.at, this.camera.quaternion, this.size)
        this.halos.setMatrixAt(halo++, this.matrix)
      }
      // The basket glows when tipping it is a thing to do: empty, or with the castle seen and the afternoon back.
      if (glow > 0 && play.basketGlows()) {
        this.at.set(BASKET.x, BASKET.rim, BASKET.z)
        this.size.setScalar(4.6 * (0.85 + 0.15 * breath))
        this.matrix.compose(this.at, this.camera.quaternion, this.size)
        this.halos.setMatrixAt(halo++, this.matrix)
      }
      for (const kind of KINDS) {
        const mesh = this.blocks[kind]
        mesh.count = PER_KIND
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      }
      this.showHand(play, guidance)
    } else {
      for (const kind of KINDS) this.blocks[kind].count = 0
    }
    this.shadows.count = shadow
    this.shadows.instanceMatrix.needsUpdate = true
    this.blots.count = blot
    this.blots.instanceMatrix.needsUpdate = true
    this.halos.count = halo
    this.halos.instanceMatrix.needsUpdate = true
    ;(this.halos.material as THREE.MeshBasicMaterial).opacity = 0.13 * glow

    this.renderer.render(this.scene, this.camera)
    return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  /** The idle hand shows one move: a block of the basket carried out to the rug, the bell or the empty basket tapped, the basket pulled over by its wicker. */
  private showHand(play: Play, guidance: Guidance | null): void {
    if (!guidance || guidance.demo === null) return
    const guide = play.guide(guidance.demoIndex)
    if (!guide) return
    if (guide.kind === 'tap') {
      // One press on the bell, or on the empty basket.
      const pose = handPose(guidance.demo, false, this.handOut)
      this.hand.position.set(guide.at[0] + 0.22, guide.at[1] + (1 - pose.press) * 0.3, guide.at[2] + 0.3)
      this.hand.quaternion.copy(this.camera.quaternion)
      this.hand.scale.setScalar(1.25 - 0.1 * pose.press)
      ;(this.hand.material as THREE.MeshBasicMaterial).opacity = pose.opacity * 0.92
      this.hand.visible = pose.opacity > 0.01
      return
    }
    const pose = handPose(guidance.demo, true, this.handOut)
    // A block is carried up and over; the wicker is pulled straight along.
    const arc = guide.kind === 'carry' ? Math.sin(pose.travel * Math.PI) * 1.1 : 0
    this.hand.position.set(
      guide.from[0] + (guide.to[0] - guide.from[0]) * pose.travel,
      guide.from[1] + (guide.to[1] - guide.from[1]) * pose.travel + arc + (1 - pose.press) * 0.25,
      guide.from[2] + (guide.to[2] - guide.from[2]) * pose.travel,
    )
    this.hand.quaternion.copy(this.camera.quaternion)
    this.hand.scale.setScalar(1.25 - 0.1 * pose.press)
    ;(this.hand.material as THREE.MeshBasicMaterial).opacity = pose.opacity * 0.92
    this.hand.visible = pose.opacity > 0.01
  }

  private drift(t: number): void {
    const position = this.motes.geometry.getAttribute('position') as THREE.BufferAttribute
    const win = WALL.window
    for (let i = 0; i < MOTES; i++) {
      const a = this.moteSeeds[i * 4], b = this.moteSeeds[i * 4 + 1], c = this.moteSeeds[i * 4 + 2], e = this.moteSeeds[i * 4 + 3]
      const wx = -WALL.wide / 2 + win.x0 + (win.x1 - win.x0) * a, wy = win.y0 + (win.y1 - win.y0) * b
      // Somewhere along the beam between the window and the floor, sinking slowly and wandering.
      const far = ((c + t * 0.012 * (0.5 + e)) % 1) * (wy / -SUN_DIR.y) * 0.96
      position.setXYZ(i,
        wx + SUN_DIR.x * far + 0.12 * Math.sin(t * 0.4 + e * 40),
        wy + SUN_DIR.y * far + 0.1 * Math.sin(t * 0.33 + a * 40),
        WALL_Z + SUN_DIR.z * far + 0.12 * Math.cos(t * 0.37 + b * 40))
    }
    position.needsUpdate = true
  }

  private dust(step: number): void {
    let n = 0
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const puff = this.puffs[i]
      puff.age += step
      if (puff.age >= puff.life) { this.puffs.splice(i, 1); continue }
      puff.x += puff.vx * step; puff.y += puff.vy * step; puff.z += puff.vz * step
      const slow = Math.exp(-step * 4)
      puff.vx *= slow; puff.vy *= slow; puff.vz *= slow
    }
    for (const puff of this.puffs) {
      const life = puff.age / puff.life
      this.at.set(puff.x, puff.y, puff.z)
      // It swells as it rises and thins away to nothing.
      this.size.setScalar(puff.size * (0.5 + 1.3 * life) * (1 - life * life))
      this.matrix.compose(this.at, this.camera.quaternion, this.size)
      this.puffMesh.setMatrixAt(n++, this.matrix)
    }
    this.puffMesh.count = n
    this.puffMesh.instanceMatrix.needsUpdate = true
  }

  dispose(): void {
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
      for (const material of materials) {
        const map = (material as THREE.MeshBasicMaterial).map
        if (map) map.dispose()
        material.dispose()
      }
    })
    this.renderer.dispose()
  }
}
