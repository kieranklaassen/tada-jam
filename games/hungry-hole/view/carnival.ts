import * as THREE from 'three'
import { KEEPER_BUILD, MAYOR_BUILD, type Arm, type Bystanders, type Vec } from '../bystanders'
import { BACKDROP } from '../config'
import type { Hint } from '../guide'
import { KIND, KINDS, heightOf, seatOf, widthOf, type Kind } from '../kinds'
import { backTo, fall, inRoom, keepTime, land, makeLimbs, poke, rest, ride, seat, still, teeter, walk, type Limbs, type Pose, type Riding, type Seat } from '../motion'
import { holePoint, type Ray } from '../pick'
import { CROWD, GATE, KEEPER, MAYOR, STREET, YARD } from '../places'
import { HOVER, LET_DOWN, liftOf, type Cue, type Play, type Thing } from '../play'
import type { Rng } from '../rng'
import type { Stage } from '../scenes'
import { ELEVATION as ELEVATION_DEGREES, FLOAT } from '../seen'
import { makeFigureMaterial, makeGlowMaterial, makeGroundMaterial, makePaperTexture, makePitMaterial, makeScrapMaterial, makeShadowMaterial, makeShared, rgb, type Shared } from './paper'
import { makeKeeper, makeMayor } from './people'
import { Sculpt } from './sculpt'
import { makeLeaf, makeSetting, type Blob } from './setting'
import { makeThingGeometries } from './things'

// The carnival street as three.js draws it. It is built with no renderer and
// no canvas, so a test can build it, step it and count what it would draw.
// Everything here is a view of `Play` and `Bystanders`: it keeps nothing a
// save would need, and it eases nothing in when it is first shown.

const PI = Math.PI
/** The eye looks down on the street from the near side, at this angle above the ground. */
const ELEVATION = (ELEVATION_DEGREES * PI) / 180
const FOV = 30
const LOOK_AT = new THREE.Vector3(0, 0.9, -1.0)
/** What must be inside the frame whatever its shape: the street's corners, the tops of the bystanders, and the heads along the near kerb. */
const MUST_SEE: readonly (readonly [number, number, number])[] = [
  [STREET.x0 - 0.6, 0, STREET.z1], [STREET.x1 + 0.6, 0, STREET.z1], [STREET.x0 - 0.6, 0, STREET.z0], [STREET.x1 + 0.6, 0, STREET.z0],
  [MAYOR.x0 - 1.2, 4.6, MAYOR.z], [KEEPER.x, 5.3, KEEPER.z], [GATE.x, GATE.high + 0.5, GATE.z], [0, 0, STREET.z1 + 1.5],
]
/** Of those, the ones that hold the bottom edge of the frame when the eye lifts for a tall stack: the near corners of the street. The heads along the near kerb may then slide out. */
const NEAR_CORNERS = 2
/** The jam's round home control at the top centre of the surface, in CSS pixels: nothing a child made is drawn above its lower edge, with a little room. */
export const HOME_CONTROL = { size: 48, top: 10, room: 8 } as const
/** The furthest the eye backs off for a tall stack. */
const FARTHEST = 90
/** How far the leaves of the gate swing when it stands open, in radians. */
const SWING = 1.6
const SHADOWS = 128
const SCRAPS = 48
/** Scraps that drift down over the street all the time, so the air is never still. */
const DRIFTING = 10
const PIT = 4
const SCRAP_COLORS = [0xd8343c, 0xffd23c, 0x2f7fe0, 0x35b07a, 0xf08ab0, 0xfdf3dc] as const
const KIND_COLOR: Readonly<Record<Kind, number>> = { pie: 0xfffaf0, hat: 0xd8343c, dog: 0xf2a02c, balloon: 0x2f7fe0, tuba: 0xf5c22e, drummer: 0xd8343c }

/** What the idle ladder shows now: how strong the glow is, and the ghost hand's press and opacity. */
export type Guide = { hint: Hint; glow: number; press: number; opacity: number }

/** A smear of cream a pie left as it slid under a stack: it fades in a few seconds. */
type Smear = { x: number; z: number; life: number }
const SMEAR_SECONDS = 3

type Scrap = { x: number; y: number; z: number; vx: number; vy: number; vz: number; spin: number; turn: number; life: number; color: number; drifts: boolean }

function freeze<T extends THREE.Object3D>(object: T): T {
  object.matrixAutoUpdate = false
  return object
}

/** The ghost hand: a white glove lying flat, seen from above, its one pointing fingertip at the origin and its cuff toward the near side. */
function gloveGeometry(): THREE.BufferGeometry {
  const white = { c: 0xfffaf0 }, flat = PI / 2
  return new Sculpt()
    // The pointing finger, then the three that are curled, the thumb, the back of the hand and a red cuff.
    .tube(0.1, 0.12, 0.62, white, { at: [0, 0, 0.62], turn: [-flat, 0, 0], lump: 0.01 })
    .ball(0.1, white, { at: [0, 0, 0.02], lump: 0 })
    .ball(0.13, white, { at: [0.22, 0, 0.6], size: [1, 0.9, 1.2], lump: 0.01 })
    .ball(0.13, white, { at: [0.42, 0, 0.66], size: [1, 0.9, 1.2], lump: 0.01 })
    .ball(0.12, white, { at: [0.6, 0, 0.76], size: [1, 0.9, 1.2], lump: 0.01 })
    .ball(0.13, white, { at: [-0.26, 0, 0.82], size: [1.2, 0.8, 1.7], turn: [0, 0.7, 0], lump: 0.01 })
    .ball(0.42, white, { at: [0.24, 0, 0.98], size: [1.05, 0.5, 1], lump: 0.03 })
    .tube(0.3, 0.33, 0.26, { c: 0xd8343c }, { at: [0.26, 0, 1.62], turn: [-flat, 0, 0], size: [1, 1, 0.55], lump: 0.02 })
    .build()
}

/** The lip of the hole: a ring of torn paper flaps curling up and out, at a radius of 1. */
function rimGeometry(): THREE.BufferGeometry {
  const sculpt = new Sculpt(), flaps = 22
  sculpt.ring(1.03, 0.08, { c: 0xfdf3dc }, { turn: [PI / 2, 0, 0], at: [0, 0.03, 0], lump: 0.03 })
  for (let i = 0; i < flaps; i++) {
    const a = (i / flaps) * PI * 2 + (i % 3) * 0.06, long = 0.3 + ((i * 7) % 5) * 0.045
    // A strip hangs from its top edge: turned up and outward, it stands as a torn flap round the mouth.
    sculpt.strip(0.4, long, { c: i % 4 === 0 ? 0xf2909a : i % 4 === 2 ? 0xfbd66b : 0xfdf3dc }, { at: [Math.cos(a) * 1.04, 0.05, Math.sin(a) * 1.04], turn: [PI + 1.0, -a + PI / 2, 0], sway: [0.035, i * 1.7, 0] })
  }
  return sculpt.build()
}

/** The hole's breath: a fan of paper streamers standing one unit tall, fluttering. */
function breathGeometry(): THREE.BufferGeometry {
  const sculpt = new Sculpt(), streamers = 9
  for (let i = 0; i < streamers; i++) {
    const a = (i / streamers) * PI * 2, out = 0.22 + (i % 3) * 0.1
    sculpt.strip(0.16, 1, { c: SCRAP_COLORS[i % SCRAP_COLORS.length] }, { at: [Math.cos(a) * out, 1, Math.sin(a) * out], turn: [0, -a, 0], sway: [0.09, i * 2.3, 0] })
  }
  return sculpt.build()
}

function pitGeometry(): THREE.BufferGeometry {
  const wall = new THREE.CylinderGeometry(1, 0.8, PIT, 28, 1, true).translate(0, -PIT / 2, 0)
  wall.deleteAttribute('uv')
  wall.deleteAttribute('normal')
  return wall
}

/** What a drawn stack is told, beyond where it stands. */
type Drawn = {
  /** Above its foot, each part's height; null takes the heights a stack stands at. */
  heights: readonly number[] | null
  /** Seconds each part has sat where it sits. */
  since: (index: number) => number
  /** 0..1: the hole is on the move. */
  lively: number
  /** The swing of the stack's bob or step, -1..1. */
  bob: number
  /** How hard the drummer beats, 0..1. */
  drum: number
  /** The key the intersection audit groups its parts under. */
  object: string
  /** Which part above the bottom one a finger landed on, or -1, and the seconds since. */
  pokedPart: number
  poked: number
}

const UP = new THREE.Vector3(0, 1, 0)

/** How tall a stack stands, with the balloon on top of one afloat at the end of its string. */
function tallOf(parts: readonly Kind[]): number {
  return heightOf(parts) + (parts.length > 1 && parts[parts.length - 1] === 'balloon' ? FLOAT : 0)
}

export class Carnival {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(FOV, 1180 / 820, 4, 220)
  private readonly shared: Shared
  private readonly paper: THREE.DataTexture
  private readonly figure: THREE.ShaderMaterial
  private readonly ghost: THREE.ShaderMaterial
  private readonly geometries: Record<Kind, THREE.BufferGeometry>
  private readonly parts: Record<Kind, THREE.Mesh[]> = { pie: [], hat: [], dog: [], balloon: [], tuba: [], drummer: [] }
  private readonly used: Record<Kind, number> = { pie: 0, hat: 0, dog: 0, balloon: 0, tuba: 0, drummer: 0 }
  private readonly pit: THREE.Mesh
  private readonly rim: THREE.Mesh
  private readonly breath: THREE.Mesh
  private readonly leaves: [THREE.Mesh, THREE.Mesh]
  private readonly shadows: THREE.InstancedMesh
  private readonly shadowDark: THREE.InstancedBufferAttribute
  private readonly blobs: readonly Blob[]
  private readonly scrapMesh: THREE.InstancedMesh
  private readonly scraps: Scrap[] = []
  private readonly smears: Smear[] = []
  private scrapCap = SCRAPS
  private readonly glowHole: THREE.Mesh
  private readonly glowThing: THREE.Mesh
  private readonly glowGate: THREE.Mesh
  private readonly hand: THREE.Mesh
  private readonly mayor: { group: THREE.Group; body: THREE.Mesh; head: THREE.Group; pupils: THREE.Mesh; brows: THREE.Mesh; mouth: THREE.Mesh; moustache: THREE.Mesh; arm: THREE.Mesh; tuft: THREE.Mesh; upper: THREE.Mesh; fore: THREE.Mesh }
  private readonly keeper: { group: THREE.Group; head: THREE.Group; pupils: THREE.Mesh; brows: THREE.Mesh; mouth: THREE.Mesh; keyUpper: THREE.Mesh; keyFore: THREE.Mesh; barUpper: THREE.Mesh; barFore: THREE.Mesh; key: THREE.Mesh; cap: THREE.Mesh }
  private readonly disposables: { dispose(): void }[] = []
  private readonly rng: Rng
  private time = 0
  /** The way the mouth is stretched, eased so it never snaps round. */
  private axisX = 1
  private axisZ = 0
  private stretch = 0
  /** 0..1: the mouth has hold of the foot of a thing too wide for it, and reaches under it. */
  private hold = 0
  /** The surface in CSS pixels, the distance at which the whole street is in the frame, and where the eye is now: how far off, and how far lifted. */
  private surface = { width: 1180, height: 820 }
  private whole = 20
  private distance = 20
  private lifted = 0
  /** The tops of what the child has made, as x, y, z in a row: the frame keeps them in view. */
  private readonly tops: number[] = []

  // Scratch, so a frame allocates nothing.
  private readonly pose: Pose = { slide: 0, lift: 0, tilt: 0, roll: 0, yaw: 0, fore: 0, wide: 1, tall: 1, about: 0 }
  private readonly sit: Seat = { tilt: 0, roll: 0, yaw: 0, lift: 0, back: 0, wide: 1, tall: 1, flip: false }
  private readonly riding: Riding = { since: 0, lively: 0, look: 0, bob: 0, narrow: false, top: false, time: 0 }
  private readonly limbs: Limbs = makeLimbs()
  private readonly drawn: Drawn = { heights: null, since: () => 99, lively: 0, bob: 0, drum: 0, object: '', pokedPart: -1, poked: 99 }
  private readonly answer: Pose = { slide: 0, lift: 0, tilt: 0, roll: 0, yaw: 0, fore: 0, wide: 1, tall: 1, about: 0 }
  private readonly m = new THREE.Matrix4()
  private readonly m2 = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly q2 = new THREE.Quaternion()
  private readonly v = new THREE.Vector3()
  private readonly v2 = new THREE.Vector3()
  private readonly s = new THREE.Vector3()
  private readonly axis = new THREE.Vector3()
  private readonly color = new THREE.Color()
  private readonly e = new THREE.Euler()

  /** `rng` is the view's own stream: where a scrap flies changes nothing in the game. */
  constructor(rng: Rng) {
    this.rng = rng
    this.paper = makePaperTexture()
    this.shared = makeShared(this.paper)
    this.figure = makeFigureMaterial(this.shared)
    this.ghost = makeFigureMaterial(this.shared, 0.9)
    this.scene.background = new THREE.Color(BACKDROP)
    this.disposables.push(this.paper, this.figure, this.ghost)

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 50).rotateX(-PI / 2).translate(0, 0, -6), this.keep(makeGroundMaterial(this.shared, new THREE.Vector4(STREET.x0, STREET.x1, STREET.z0, STREET.z1))))
    ground.name = 'ground'
    this.add(ground)

    const setting = makeSetting()
    this.blobs = setting.blobs
    const scenery = new THREE.Mesh(setting.geometry, this.figure)
    scenery.name = 'setting'
    const crowd = new THREE.Mesh(setting.crowd, this.figure)
    crowd.name = 'crowd'
    this.add(scenery, crowd)

    // The two leaves of the gate, each hinged on its post.
    const leaf = this.keep(makeLeaf())
    this.leaves = [new THREE.Mesh(leaf, this.figure), new THREE.Mesh(leaf, this.figure)]
    this.leaves[0].name = 'gate:leaf:0'
    this.leaves[1].name = 'gate:leaf:1'
    this.leaves[0].position.set(GATE.x - GATE.half, 0, GATE.z)
    this.leaves[1].position.set(GATE.x + GATE.half, 0, GATE.z)
    this.leaves[1].rotation.y = PI
    this.scene.add(...this.leaves)

    this.pit = freeze(new THREE.Mesh(pitGeometry(), this.keep(makePitMaterial(this.shared))))
    this.pit.name = 'pit'
    this.rim = freeze(new THREE.Mesh(rimGeometry(), this.figure))
    this.rim.name = 'rim'
    this.breath = freeze(new THREE.Mesh(breathGeometry(), this.figure))
    this.breath.name = 'breath'
    this.add(this.pit, this.rim, this.breath)

    const disc = new THREE.CircleGeometry(1, 20).rotateX(-PI / 2)
    this.shadowDark = new THREE.InstancedBufferAttribute(new Float32Array(SHADOWS), 1)
    disc.setAttribute('aDark', this.shadowDark)
    this.shadows = new THREE.InstancedMesh(disc, this.keep(makeShadowMaterial(this.shared)), SHADOWS)
    this.shadows.name = 'shadows'
    this.shadows.frustumCulled = false
    this.shadows.renderOrder = 1

    const scrap = new THREE.BufferGeometry()
    scrap.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.09, 0, -0.06, 0.09, 0, -0.05, 0.07, 0, 0.07, -0.09, 0, -0.06, 0.07, 0, 0.07, -0.08, 0, 0.05]), 3))
    scrap.computeVertexNormals()
    this.scrapMesh = new THREE.InstancedMesh(scrap, this.keep(makeScrapMaterial(this.shared)), SCRAPS)
    this.scrapMesh.name = 'scraps'
    this.scrapMesh.frustumCulled = false
    this.scrapMesh.setColorAt(0, this.color.setRGB(1, 1, 1))
    this.add(this.shadows, this.scrapMesh)
    for (let i = 0; i < DRIFTING; i++) this.drift(true)

    const ring = new THREE.CircleGeometry(1, 40).rotateX(-PI / 2)
    const glow = (name: string): THREE.Mesh => {
      const made = freeze(new THREE.Mesh(ring, this.keep(makeGlowMaterial())))
      made.name = name
      made.renderOrder = 2
      made.visible = false
      return made
    }
    this.glowHole = glow('glow:hole')
    this.glowThing = glow('glow:thing')
    this.glowGate = glow('glow:gate')
    this.hand = freeze(new THREE.Mesh(gloveGeometry(), this.ghost))
    this.hand.name = 'hand'
    this.hand.renderOrder = 3
    this.hand.visible = false
    this.add(this.glowHole, this.hand)
    this.scene.add(this.glowThing, this.glowGate)

    this.geometries = makeThingGeometries()

    // The mayor: his head carries his face, and each piece of the face its own small move.
    const mayor = makeMayor(), mesh = (geometry: THREE.BufferGeometry, name: string): THREE.Mesh => { const made = new THREE.Mesh(geometry, this.figure); made.name = name; this.disposables.push(geometry); return made }
    const mayorGroup = new THREE.Group(), mayorHead = new THREE.Group()
    mayorGroup.name = 'mayor'
    this.mayor = {
      group: mayorGroup, body: mesh(mayor.body, 'mayor:body'), head: mayorHead, pupils: mesh(mayor.pupils, 'mayor:pupils'), brows: mesh(mayor.brows, 'mayor:brows'), mouth: mesh(mayor.mouth, 'mayor:mouth'),
      moustache: mesh(mayor.moustache, 'mayor:moustache'), arm: mesh(mayor.arm, 'mayor:arm'), tuft: mesh(mayor.tuft, 'mayor:tuft'), upper: mesh(mayor.upper, 'mayor:upper'), fore: mesh(mayor.fore, 'mayor:fore'),
    }
    mayorHead.position.set(MAYOR_BUILD.neck.x, MAYOR_BUILD.neck.y, MAYOR_BUILD.neck.z)
    mayorHead.add(mesh(mayor.head, 'mayor:head'), this.mayor.pupils, this.mayor.brows, this.mayor.mouth, this.mayor.moustache, this.mayor.tuft)
    this.mayor.arm.position.set(MAYOR_BUILD.reach.x, MAYOR_BUILD.reach.y, MAYOR_BUILD.reach.z)
    this.mayor.arm.rotation.order = 'YXZ'
    this.mayor.tuft.position.set(0, 2.28, -0.1)
    mayorGroup.add(this.mayor.body, mayorHead, this.mayor.arm, this.mayor.upper, this.mayor.fore)
    mayorGroup.scale.setScalar(MAYOR.size)
    mayorGroup.userData.jamObject = 'mayor'
    this.scene.add(mayorGroup)

    const keeper = makeKeeper(), keeperGroup = new THREE.Group(), keeperHead = new THREE.Group()
    keeperGroup.name = 'keeper'
    const upper = keeper.upper, fore = keeper.fore
    this.keeper = {
      group: keeperGroup, head: keeperHead, pupils: mesh(keeper.pupils, 'keeper:pupils'), brows: mesh(keeper.brows, 'keeper:brows'), mouth: mesh(keeper.mouth, 'keeper:mouth'),
      keyUpper: mesh(upper, 'keeper:key:upper'), keyFore: mesh(fore, 'keeper:key:fore'), barUpper: mesh(upper, 'keeper:bar:upper'), barFore: mesh(fore, 'keeper:bar:fore'),
      key: mesh(keeper.key, 'keeper:key'), cap: mesh(keeper.cap, 'keeper:cap'),
    }
    keeperHead.add(mesh(keeper.head, 'keeper:head'), this.keeper.pupils, this.keeper.brows, this.keeper.mouth)
    keeperGroup.add(mesh(keeper.body, 'keeper:body'), keeperHead, this.keeper.keyUpper, this.keeper.keyFore, this.keeper.barUpper, this.keeper.barFore, this.keeper.key, this.keeper.cap)
    keeperGroup.scale.setScalar(KEEPER.size)
    keeperGroup.userData.jamObject = 'keeper'
    this.scene.add(keeperGroup)

    // Until the street has been read from the save, only the setting shows.
    this.pit.visible = this.rim.visible = this.breath.visible = mayorGroup.visible = keeperGroup.visible = false
    this.resize(1180, 820)
  }

  private keep<T extends { dispose(): void }>(made: T): T {
    this.disposables.push(made)
    return made
  }

  private add(...meshes: THREE.Mesh[]): void {
    for (const mesh of meshes) {
      this.disposables.push(mesh.geometry)
      this.scene.add(mesh)
    }
  }

  /** What a tier sets besides the pixel ratio. Nothing is compiled: the relief is a number the paint reads. */
  setTier(tier: { relief: boolean; scraps: number }): void {
    this.shared.uRelief.value = tier.relief ? 1 : 0
    this.scrapCap = Math.min(SCRAPS, tier.scraps)
    if (this.scraps.length > this.scrapCap) this.scraps.length = this.scrapCap
  }

  /**
   * Whether the frame holds what it must with the eye `distance` off and lifted by `lift` along the picture's
   * upright. Worked out in plain numbers, as the camera would: the eye looks down at a fixed angle and never rolls.
   * `least` is how far the eye must be lifted for the tops of what the child made (`tops`) to be below the home
   * control, and `most` how far it may be lifted before a near corner of the street leaves the bottom edge.
   */
  private framing(distance: number): { fits: boolean; least: number; most: number } {
    const aspect = this.surface.width / this.surface.height, half = Math.tan((FOV * PI) / 360)
    const sin = Math.sin(ELEVATION), cos = Math.cos(ELEVATION)
    // Across, up the picture and away from the eye, for a point of the scene.
    const up = (y: number, z: number): number => (y - LOOK_AT.y) * cos - (z - LOOK_AT.z) * sin
    const deep = (y: number, z: number): number => distance - (y - LOOK_AT.y) * sin - (z - LOOK_AT.z) * cos
    let fits = true, most = Infinity
    MUST_SEE.forEach(([x, y, z], index) => {
      const far = deep(y, z) * half
      if (far <= 0 || Math.abs(x - LOOK_AT.x) > far * aspect || Math.abs(up(y, z)) > far) fits = false
      if (index < NEAR_CORNERS) most = Math.min(most, up(y, z) + far)
    })
    // The top of everything the child made stays below the home control's lower edge.
    const limit = 1 - (2 * (HOME_CONTROL.top + HOME_CONTROL.size + HOME_CONTROL.room)) / this.surface.height
    let least = 0
    for (let at = 0; at < this.tops.length; at += 3) {
      const x = this.tops[at], y = this.tops[at + 1], z = this.tops[at + 2], far = deep(y, z) * half
      if (far <= 0 || Math.abs(x - LOOK_AT.x) > far * aspect) fits = false
      least = Math.max(least, up(y, z) - limit * far)
    }
    return { fits: fits && least <= most, least, most }
  }

  /** Puts the eye `distance` off, lifted by `lift`. */
  private place(distance: number, lift: number): void {
    const camera = this.camera, sin = Math.sin(ELEVATION), cos = Math.cos(ELEVATION)
    // Lifted along the picture's upright: the whole frame slides up the scene, and nothing in it turns.
    const x = LOOK_AT.x, y = LOOK_AT.y + lift * cos, z = LOOK_AT.z - lift * sin
    camera.position.set(x, y + sin * distance, z + cos * distance)
    camera.lookAt(x, y, z)
    camera.updateMatrixWorld()
  }

  /** The nearest the eye can be with the frame holding what it must, from `near` outward. */
  private nearestFit(near: number): number {
    if (this.framing(near).fits) return near
    let low = near, high = FARTHEST
    for (let i = 0; i < 20; i++) {
      const middle = (low + high) / 2
      if (this.framing(middle).fits) high = middle
      else low = middle
    }
    return high
  }

  /** Frames the street for a surface of this shape: the eye backs off until everything that must be seen is. */
  resize(width: number, height: number): void {
    if (!(width > 0) || !(height > 0)) return
    this.surface.width = width
    this.surface.height = height
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    const tops = this.tops.splice(0)
    this.whole = this.nearestFit(12)
    this.tops.push(...tops)
    this.look(0)
  }

  /**
   * Keeps what the child made in the frame. A stack taller than the frame lifts the eye first, as far as the near
   * kerb allows, and then draws it back, so the top of the stack is always seen and is never under the home
   * control. It moves out quickly and comes back slowly; a frame of no time is where it should be at once.
   */
  private look(dt: number): void {
    let distance = this.whole
    let framing = this.framing(distance)
    if (!framing.fits) {
      distance = this.nearestFit(this.whole)
      framing = this.framing(distance)
    }
    const lift = Math.max(0, Math.min(framing.least, framing.most))
    const out = distance > this.distance || lift > this.lifted
    const ease = dt > 0 ? Math.min(1, dt * (out ? 10 : 2.2)) : 1
    this.distance += (distance - this.distance) * ease
    this.lifted += (lift - this.lifted) * ease
    this.place(this.distance, this.lifted)
  }

  /** How far off the eye is, and how far it is lifted: for a test and a still. */
  get eye(): { distance: number; lifted: number; whole: number } {
    return { distance: this.distance, lifted: this.lifted, whole: this.whole }
  }

  /** The line of sight through a point of the surface, in CSS pixels. */
  ray(x: number, y: number, width: number, height: number): Ray {
    const camera = this.camera
    this.v.set((x / width) * 2 - 1, 1 - (y / height) * 2, 0.5).unproject(camera).sub(camera.position).normalize()
    return { ox: camera.position.x, oy: camera.position.y, oz: camera.position.z, dx: this.v.x, dy: this.v.y, dz: this.v.z }
  }

  /** Where a point of the scene lands on a surface of this size, in CSS pixels: for a probe, a still or a test. */
  project(x: number, y: number, z: number, width: number, height: number): { x: number; y: number } {
    this.v.set(x, y, z).project(this.camera)
    return { x: ((this.v.x + 1) / 2) * width, y: ((1 - this.v.y) / 2) * height }
  }

  /** Put away, or found on load: the scraps that were flying have landed and the cream has dried. Those that drift go on drifting. */
  settle(): void {
    for (let index = this.scraps.length - 1; index >= 0; index--) if (!this.scraps[index].drifts) this.scraps.splice(index, 1)
    this.smears.length = 0
  }

  /** Something happened: scraps fly, and a pie sliding under a stack leaves its cream. */
  cue(cue: Cue, play: Play): void {
    if (cue.type === 'drop') this.burst(play.x, 0.1, play.z, 7 + Math.round(KIND[cue.kind].width * 3), 2.4, 4.2, KIND_COLOR[cue.kind], play.mouth / 2)
    else if (cue.type === 'burp') this.burst(play.x, 0.2, play.z, 12, 1.6, 6, KIND_COLOR[cue.kind], play.mouth / 3)
    else if (cue.type === 'hiccup') this.burst(play.x, 0.1, play.z, 6, 1.2, 3.2, 0xfdf3dc, play.mouth / 3)
    else if (cue.type === 'setdown') this.burst(cue.x, 0.1, cue.z, 10, 3, 2.2, 0xfdf3dc, widthOf(cue.parts) / 2)
    else if (cue.type === 'thud') this.burst(cue.x, 0.1, cue.z, 16, 3.4, 2.6, 0xfdf3dc, widthOf(cue.parts) / 2)
    else if (cue.type === 'step' && cue.parts[0] === 'pie' && cue.parts.length > 1) {
      if (this.smears.length >= 12) this.smears.shift()
      this.smears.push({ x: cue.x, z: cue.z, life: SMEAR_SECONDS })
    }
  }

  private burst(x: number, y: number, z: number, count: number, out: number, up: number, tint: number, radius: number): void {
    for (let i = 0; i < count; i++) {
      const a = this.rng.next() * PI * 2, speed = out * (0.5 + this.rng.next() * 0.7)
      const scrap: Scrap = { x: x + Math.cos(a) * radius, y, z: z + Math.sin(a) * radius, vx: Math.cos(a) * speed, vy: up * (0.6 + this.rng.next() * 0.6), vz: Math.sin(a) * speed, spin: this.rng.next() * 6, turn: 5 + this.rng.next() * 9, life: 1.1 + this.rng.next() * 0.6, color: i % 3 === 0 ? tint : SCRAP_COLORS[Math.floor(this.rng.next() * SCRAP_COLORS.length)], drifts: false }
      // A full air gives up its oldest flying scrap, never one of those that drift.
      if (this.scraps.length >= this.scrapCap) {
        const oldest = this.scraps.findIndex((other) => !other.drifts)
        if (oldest < 0) return
        this.scraps.splice(oldest, 1)
      }
      this.scraps.push(scrap)
    }
  }

  private drift(anywhere: boolean): void {
    this.scraps.push({ x: -10 + this.rng.next() * 20, y: anywhere ? 0.5 + this.rng.next() * 7 : 7.5, z: -5 + this.rng.next() * 9, vx: 0.25 + this.rng.next() * 0.3, vy: -(0.35 + this.rng.next() * 0.3), vz: 0.1, spin: this.rng.next() * 6, turn: 1.5 + this.rng.next() * 2, life: 99, color: SCRAP_COLORS[Math.floor(this.rng.next() * SCRAP_COLORS.length)], drifts: true })
  }

  private stepScraps(dt: number): void {
    let drifting = 0
    for (let index = this.scraps.length - 1; index >= 0; index--) {
      const scrap = this.scraps[index]
      scrap.spin += scrap.turn * dt
      if (scrap.drifts) {
        scrap.x += (scrap.vx + Math.sin(scrap.spin * 0.7) * 0.4) * dt
        scrap.y += scrap.vy * dt
        if (scrap.y < 0.02 || scrap.x > 11) { this.scraps.splice(index, 1); continue }
        drifting += 1
        continue
      }
      scrap.life -= dt
      scrap.vy -= 9 * dt
      scrap.x += scrap.vx * dt; scrap.y += scrap.vy * dt; scrap.z += scrap.vz * dt
      if (scrap.y < 0.02) { scrap.y = 0.02; scrap.vy = 0; scrap.vx *= 0.8; scrap.vz *= 0.8; scrap.turn = 0 }
      if (scrap.life <= 0) this.scraps.splice(index, 1)
    }
    const wanted = Math.min(DRIFTING, Math.floor(this.scrapCap / 3))
    if (dt > 0 && drifting < wanted && this.scraps.length < this.scrapCap) this.drift(false)
    for (let index = this.smears.length - 1; index >= 0; index--) {
      this.smears[index].life -= dt
      if (this.smears[index].life <= 0) this.smears.splice(index, 1)
    }
  }

  private writeScraps(): void {
    const mesh = this.scrapMesh
    this.scraps.forEach((scrap, index) => {
      // A scrap that is nearly spent shrinks away.
      const size = scrap.drifts ? 1.25 : Math.min(1, scrap.life * 3) * 1.3
      this.q.setFromEuler(this.e.set(scrap.spin, scrap.spin * 0.6, scrap.spin * 0.3, 'XYZ'))
      mesh.setMatrixAt(index, this.m.compose(this.v.set(scrap.x, scrap.y, scrap.z), this.q, this.s.set(size, size, size)))
      const [r, g, b] = rgb(scrap.color)
      mesh.setColorAt(index, this.color.setRGB(r, g, b))
    })
    mesh.count = this.scraps.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  /** A mesh of this kind from the pool. Each carries its own limbs, which the paint is handed as the mesh is drawn. */
  private part(kind: Kind): THREE.Mesh {
    const pool = this.parts[kind], at = this.used[kind]++
    if (at < pool.length) { pool[at].visible = true; return pool[at] }
    const mesh = freeze(new THREE.Mesh(this.geometries[kind], this.figure))
    mesh.name = `thing:${kind}:${at}`
    const limbs = makeLimbs(), figure = this.figure
    mesh.userData.limbs = limbs
    mesh.onBeforeRender = () => {
      figure.uniforms.uLimbs.value = limbs
      figure.uniformsNeedUpdate = true
    }
    pool.push(mesh)
    this.scene.add(mesh)
    return mesh
  }

  /** Lays the frame's pose on the scratch matrix `m`: where the stack's foot is, leaning toward (dirX, dirZ). */
  private stackMatrix(x: number, y: number, z: number, dirX: number, dirZ: number, pose: Pose, size = 1): THREE.Matrix4 {
    this.q.setFromAxisAngle(this.axis.set(dirZ, 0, -dirX), pose.tilt)
    this.q.multiply(this.q2.setFromAxisAngle(this.axis.set(dirX, 0, dirZ), pose.roll))
    this.q.premultiply(this.q2.setFromAxisAngle(this.axis.set(1, 0, 0), pose.fore))
    this.q.multiply(this.q2.setFromAxisAngle(this.axis.set(0, 1, 0), pose.yaw + pose.about * backTo(dirX, dirZ)))
    return this.m.compose(this.v.set(x, y, z), this.q, this.s.set(pose.wide * size, pose.tall * size, pose.wide * size))
  }

  /**
   * Draws one stack on the matrix `base`: every part sitting as it sits, the bottom one of two or more used the
   * wrong way and carrying the rest. `limbs` holds what the stack's own motion asks of its bottom thing's limbs.
   */
  private stack(parts: readonly Kind[], base: THREE.Matrix4, limbs: Limbs, x: number, z: number, play: Play, told: Drawn): void {
    const many = parts.length > 1, riding = this.riding
    // A balloon on top pulls the whole stack onto tiptoe.
    const tiptoe = many && parts[parts.length - 1] === 'balloon' ? 0.14 : 0
    riding.lively = told.lively
    riding.bob = told.bob
    riding.time = this.time
    // Which way the hole is from here, as a turn about the upright from the way a thing faces.
    riding.look = Math.atan2(-(play.z - z), play.x - x)
    parts.forEach((kind, index) => {
      const mesh = this.part(kind), own = mesh.userData.limbs as Limbs
      if (index === 0) own.set(limbs)
      else still(own)
      riding.since = told.since(index)
      riding.narrow = index > 0 && KIND[kind].width > KIND[parts[index - 1]].width
      riding.top = index === parts.length - 1
      const sit = seat(kind, many && index === 0, riding, this.sit, own)
      // His sticks lift between beats and never on one: in the frame a beat is heard they are down.
      if (kind === 'drummer') keepTime(this.time, told.drum, own, 1 - Math.max(0, told.bob))
      // The thing a tuba lies on plays it: it puffs with each note.
      const puff = parts[index + 1] === 'tuba' ? 1 + 0.07 * Math.max(0, told.bob) : 1
      // A thing of a stack that a finger landed on answers as itself, where it sits; the bottom one's answer moves the whole stack.
      const answer = rest(this.answer)
      if (index > 0 && index === told.pokedPart) poke(kind, told.poked, answer, own)
      const y = (told.heights ? told.heights[index] : seatOf(parts, index)) + (many && index > 0 ? sit.lift : 0) + tiptoe + answer.lift
      const flip = sit.flip ? PI : 0
      this.q2.setFromEuler(this.e.set(sit.tilt + flip + answer.fore + answer.tilt, sit.yaw + answer.yaw, sit.roll + answer.roll, 'XYZ'))
      this.m2.compose(this.v.set(0, y + (sit.flip ? KIND[kind].height : 0), many && index > 0 ? -sit.back : 0), this.q2, this.s.set(sit.wide * puff * answer.wide, sit.tall * answer.tall, sit.wide * puff * answer.wide))
      mesh.matrix.multiplyMatrices(base, this.m2)
      mesh.matrixWorldNeedsUpdate = true
      mesh.userData.jamObject = told.object
    })
  }

  /** Notes the top of something the child made, for the frame: its middle and both sides. */
  private top(x: number, y: number, z: number, wide: number): void {
    this.tops.push(x - wide / 2, y, z, x, y, z, x + wide / 2, y, z)
  }

  private tell(object: string, since: number, lively = 0, bob = 0, drum = 0): Drawn {
    const told = this.drawn
    told.pokedPart = -1
    told.poked = 99
    told.heights = null
    told.since = () => since
    told.lively = lively
    told.bob = bob
    told.drum = drum
    told.object = object
    return told
  }

  /** One thing or stack that stands on the street, hops down to it, walks on it or comes onto it. Returns how far above the street it is. */
  private standing(thing: Thing, index: number, play: Play): number {
    const bottom = thing.parts[0], pose = rest(this.pose), limbs = still(this.limbs)
    let load = 0
    for (const kind of thing.parts) load += KIND[kind].width
    let x = thing.sx, z = thing.sz, y = 0, bob = 0
    const dirX = thing.dirX, dirZ = thing.dirZ, moving = thing.coming || thing.walk !== null, standing = !moving && thing.hop >= 1
    const far = standing ? Math.hypot(play.x - thing.x, play.z - thing.z) : 0
    if (thing.hop < 1) {
      // Let down from the breath: it hangs where it rode until its turn, then one hop over to where it drops.
      y = liftOf(thing)
    } else if (moving) {
      walk(bottom, thing.gait, load, pose, limbs)
      // What rides on it keeps the beat of its steps: 1 as each step that is heard begins, and still again when it stops.
      bob = (0.5 + 0.5 * Math.cos(thing.gait * PI * 2)) * (thing.walk ? Math.min(1, 2 * (thing.walk.steps - thing.walk.phase)) : 1)
      // As high as its own step takes it, as it leaps over another, and as two balloons take the whole way in one long
      // bounce: the one height a finger finds it at as well (`liftOf`).
      y = liftOf(thing)
      // What rolls on wheels turns to roll the way it goes.
      if (bottom === 'dog') pose.yaw += Math.atan2(-dirZ, dirX)
      // A walker leans a little the way it goes, not toward the hole.
      pose.tilt *= 0.5
    } else {
      teeter(bottom, thing.lean, thing.amp, thing.phase, pose, limbs)
      if (thing.pokedPart === 0) poke(bottom, thing.poked, pose, limbs)
      y = pose.lift
    }
    // Touched while it hangs, hops or walks, it answers with what is its own to move: its limbs, and a stretch or a squash upright. Where it is and how it leans stay the walk's.
    if (!standing && thing.pokedPart === 0) pose.tall *= poke(bottom, thing.poked, rest(this.answer), limbs).tall
    land(thing.squash, pose)
    // It leans, slides and spreads only as far as it has room: nothing on the street passes through its neighbour.
    inRoom(pose, tallOf(thing.parts), widthOf(thing.parts) / 2, play.room(thing), play.room(thing, true), far)
    x += dirX * far * pose.slide
    z += dirZ * far * pose.slide
    const drum = Math.min(1, thing.amp + (thing.poked < 0.6 ? 1 : 0) + (moving ? 0.6 : 0))
    const told = this.tell(`thing:${index}`, thing.since, Math.min(1, play.speed * 0.3), bob, drum)
    told.pokedPart = thing.pokedPart
    told.poked = thing.poked
    this.stack(thing.parts, this.stackMatrix(x, y, z, dirX, dirZ, pose, thing.size), limbs, x, z, play, told)
    // The frame keeps its top in view: as high as it stands, hops or bounces.
    this.top(thing.sx, tallOf(thing.parts) * thing.size + y, thing.sz, widthOf(thing.parts))
    return y
  }

  /** One frame of the view: `dt` is the seconds of play since the last, 0 when the scene is drawn as it stands. */
  update(play: Play, bystanders: Bystanders, stage: Stage, guide: Guide | null, dt: number): void {
    this.time += dt
    const t = this.time
    this.shared.uTime.value = t
    for (const kind of KINDS) this.used[kind] = 0
    this.tops.length = 0
    this.pit.visible = this.rim.visible = this.mayor.group.visible = this.keeper.group.visible = true

    // The mouth: stretched the way it travels, reaching for the finger that has just called it, and lapping toward the nearest thing that fits when it rests.
    const nearest = play.nearestThatFits()
    let wantX = play.headingX, wantZ = play.headingZ, want = Math.min(0.22, play.speed * 0.022) + 0.16 * play.lurch
    if (play.speed < 0.4 && play.lurch <= 0 && nearest) {
      const far = Math.hypot(nearest.x - play.x, nearest.z - play.z) || 1
      wantX = (nearest.x - play.x) / far; wantZ = (nearest.z - play.z) / far
      want = 0.05 + 0.05 * Math.sin(t * 2.1)
    }
    // At the foot of a thing too wide for it the mouth takes hold: it stretches toward the thing in quick tugs, which die away as it lets go.
    const strained = play.strain > 0.01
    if (strained) {
      wantX = play.strainX; wantZ = play.strainZ
      want = play.strain * (0.3 + 0.14 * Math.sin(t * 19))
    }
    const ease = dt > 0 ? Math.min(1, dt * 8) : 1
    // The frame the finger lands in already shows the rim stretched its way.
    const snap = play.lurch >= 1 ? 1 : ease
    this.hold += ((strained ? 1 : 0) - this.hold) * ease
    this.axisX += (wantX - this.axisX) * snap; this.axisZ += (wantZ - this.axisZ) * snap
    const long = Math.hypot(this.axisX, this.axisZ) || 1
    this.stretch += (want - this.stretch) * snap
    const ax = this.axisX / long, az = this.axisZ / long
    const radius = (play.mouth / 2) * (1 + 0.1 * play.gulp - 0.14 * play.pucker + 0.012 * Math.sin(t * 1.7))
    const ra = Math.max(0.2, radius * (1 + this.stretch)), rb = Math.max(0.2, radius * (1 - this.stretch * 0.5))
    // With a hold on a thing the mouth keeps its near edge where it is and reaches under the thing's foot with the far one.
    const reach = radius * this.stretch * this.hold
    const holeX = play.x + ax * reach, holeZ = play.z + az * reach
    this.shared.uHole.value.set(holeX, holeZ, ra, rb)
    this.shared.uAxis.value.set(ax, az)
    this.q.setFromAxisAngle(this.axis.set(0, 1, 0), -Math.atan2(az, ax))
    this.pit.matrix.compose(this.v.set(holeX, 0, holeZ), this.q, this.s.set(ra, 1, rb))
    // The lip stands taller while it swallows, burps or tugs, and flattens when a finger rests on it.
    this.rim.matrix.compose(this.v.set(holeX, 0, holeZ), this.q, this.s.set(ra, Math.max(0.3, 1 + 1.4 * play.gulp - 0.5 * play.pucker + 0.7 * play.strain * (0.6 + 0.4 * Math.sin(t * 19))), rb))
    this.pit.matrixWorldNeedsUpdate = this.rim.matrixWorldNeedsUpdate = true

    let shadow = 0
    const shade = (x: number, z: number, wide: number, deep: number, dark: number): void => {
      if (shadow >= SHADOWS) return
      this.shadows.setMatrixAt(shadow, this.m2.compose(this.v.set(x, 0.012, z), this.q2.identity(), this.s.set(wide / 2, 1, deep / 2)))
      this.shadowDark.setX(shadow, dark)
      shadow += 1
    }
    for (const blob of this.blobs) shade(blob.x, blob.z, blob.wide, blob.deep, blob.dark)
    // The cream a pie left under a stack, fading.
    for (const smear of this.smears) shade(smear.x, smear.z, 0.9, 0.6, -smear.life / SMEAR_SECONDS)

    // What stands on the street.
    play.things.forEach((thing, index) => {
      if (thing.away) return
      const y = this.standing(thing, index, play), width = widthOf(thing.parts) * thing.size
      shade(thing.sx + 0.12 + y * 0.2, thing.sz + 0.1, width * 1.2, width * 0.95, 1 / (1 + y * 1.5))
    })
    // What is on its way in.
    play.falling.forEach((going, index) => {
      const pose = fall(going.parts[0], going.t, this.pose, still(this.limbs))
      inRoom(pose, tallOf(going.parts), widthOf(going.parts) / 2, going.round, going.ahead, Math.hypot(play.x - going.x, play.z - going.z))
      const x = going.x + (play.x - going.x) * pose.slide, z = going.z + (play.z - going.z) * pose.slide
      this.stack(going.parts, this.stackMatrix(x, pose.lift, z, going.dirX, going.dirZ, pose), this.limbs, x, z, play, this.tell(`falling:${index}`, 99, 0, 0, 1))
    })
    // What rides on the breath, and the breath under it.
    const riding = play.riders.length > 0
    this.breath.visible = riding
    if (riding) {
      const up = play.riding, parts = up.map((rider) => rider.kind)
      const bob = ride(play.load, play.bob), anchor = play.anchor
      // A thing that still waits down in the mouth is seen there, by itself: it is not part of the stack yet.
      for (const rider of play.riders) {
        if (rider.wait <= 0) continue
        this.stack([rider.kind], this.stackMatrix(anchor.x, rider.y, anchor.z, 1, 0, rest(this.pose)), still(this.limbs), anchor.x, anchor.z, play, this.tell('riding', 99))
      }
      if (up.length > 0) {
        const pose = rest(this.pose), limbs = still(this.limbs)
        pose.roll = 0.04 * Math.sin(play.time * 1.9)
        // The beat is 1 in the frame the bob begins, which is the frame its notes sound: the sticks are down and the tuba puffs then.
        const told = this.tell('riding', 0, Math.min(1, play.speed * 0.3), Math.cos(play.bob), 0.5)
        told.heights = up.map((rider) => rider.y)
        told.since = (index) => up[index].since
        // The one a finger landed on last answers as itself, where it hangs: the bottom one with what is its own to move.
        up.forEach((rider, index) => { if (rider.poked < told.poked) { told.poked = rider.poked; told.pokedPart = index } })
        if (told.pokedPart === 0) pose.tall *= poke(parts[0], told.poked, rest(this.answer), limbs).tall
        this.stack(parts, this.stackMatrix(anchor.x, bob, anchor.z, 1, 0, pose), limbs, anchor.x, anchor.z, play, told)
      }
      const foot = Math.max(0.2, (up.length > 0 ? up[0].y : 0) + bob)
      // A stack the hole has left, waiting for the street to stand still before it is let down, keeps the breath under it.
      const left = Math.hypot(play.x - anchor.x, play.z - anchor.z) > LET_DOWN
      this.breath.matrix.compose(this.v.set(left ? anchor.x : play.x, 0, left ? anchor.z : play.z), this.q2.identity(), this.s.set(Math.min(1.6, play.mouth * 0.5), foot + 0.25, Math.min(1.6, play.mouth * 0.5)))
      this.breath.matrixWorldNeedsUpdate = true
      if (up.length > 0) shade(anchor.x + 0.2, anchor.z + 0.12, widthOf(parts) * 1.1, widthOf(parts) * 0.85, 0.6)
      // The frame makes room for the stack as tall as it will hang, the moment a thing is on its way up under it.
      const all = play.riders.map((rider) => rider.kind)
      this.top(anchor.x, HOVER + tallOf(all) + 0.25, anchor.z, widthOf(all))
    }
    // The last thing eaten, dim in the mouth.
    const last = play.belly[play.belly.length - 1]
    if (last && play.falling.length === 0) {
      const shrink = Math.min(1, (play.mouth * 0.8) / KIND[last].width)
      const pose = rest(this.pose)
      pose.wide = pose.tall = shrink
      pose.yaw = 0.3 * Math.sin(t * 0.6)
      this.stack([last], this.stackMatrix(play.x, -1.25 - KIND[last].height * shrink + 0.05 * Math.sin(t * 1.3), play.z, 1, 0, pose), still(this.limbs), play.x, play.z, play, this.tell('belly', 99, 0, 0, 0.3))
    }
    this.showStage(stage, play, shade)
    for (const kind of KINDS) for (let i = this.used[kind]; i < this.parts[kind].length; i++) this.parts[kind][i].visible = false

    this.shadows.count = shadow
    this.shadows.instanceMatrix.needsUpdate = true
    this.shadowDark.needsUpdate = true

    this.look(dt)
    this.stepScraps(dt)
    this.writeScraps()
    this.poseBystanders(bystanders, t)
    this.showGuide(play, guide, t)
  }

  /** What the two scenes show: the float on its way out, the gate, and the next street's things waiting behind its bars. */
  private showStage(stage: Stage, play: Play, shade: (x: number, z: number, wide: number, deep: number, dark: number) => void): void {
    const rattle = 0.05 * stage.rattle * Math.sin(this.time * 46)
    this.leaves[0].rotation.y = -stage.gate * SWING + rattle
    this.leaves[1].rotation.y = PI + stage.gate * SWING - rattle
    const float = stage.float
    if (float && float.tower) {
      // Still the tower it was on the breath: every thing worn and used as it rode, dropping and swaying as one.
      const pose = rest(this.pose), foot = float.parts[0]
      pose.roll = float.sway
      land(float.squash, pose)
      const told = this.tell('float', 99, 0, 0, 0.5)
      told.heights = float.parts.map((part) => part.y)
      this.stack(float.parts.map((part) => part.kind), this.stackMatrix(foot.x, 0, foot.z, 1, 0, pose), still(this.limbs), foot.x, foot.z, play, told)
      shade(foot.x + 0.2, foot.z + 0.12, KIND[foot.kind].width * 1.2, KIND[foot.kind].width * 0.95, 1 / (1 + foot.y * 1.5))
      const last = float.parts[float.parts.length - 1]
      this.top(foot.x, last.y + KIND[last.kind].height + (last.kind === 'balloon' && float.parts.length > 1 ? FLOAT : 0) + 0.25, foot.z, widthOf(float.parts.map((part) => part.kind)))
    } else if (float) {
      float.parts.forEach((part, index) => {
        const pose = rest(this.pose), limbs = still(this.limbs)
        // The bottom thing rolls the float out in its own walk; the rest are carried, nodding with it.
        if (index === 0 && float.gait > 0) walk(float.bottom, float.gait, float.load, pose, limbs)
        pose.yaw += part.yaw
        pose.roll += float.sway
        land(float.squash, pose)
        // Each leans on the one in front of it.
        this.q.setFromAxisAngle(this.axis.set(0, 1, 0), pose.yaw)
        this.q.multiply(this.q2.setFromEuler(this.e.set(pose.roll, 0, -part.lean, 'XYZ')))
        const bob = index > 0 && float.gait > 0 ? 0.04 * Math.abs(Math.sin(float.gait * PI + index)) : 0
        this.m.compose(this.v.set(part.x, part.y + pose.lift + bob, part.z), this.q, this.s.set(pose.wide * part.size, pose.tall * part.size, pose.wide * part.size))
        this.stack([part.kind], this.m, limbs, part.x, part.z, play, this.tell('float', 99, 0, 0, 1))
        if (part.size > 0.05) shade(part.x + 0.12, part.z + 0.1, KIND[part.kind].width * 1.2 * part.size, KIND[part.kind].width * 0.95 * part.size, 1 / (1 + part.y * 1.5))
        if (part.size > 0.05) this.top(part.x, part.y + KIND[part.kind].height + 0.25, part.z, KIND[part.kind].width)
      })
    }
    // Behind the bars: two things of the next street, side by side, stepping up to the gate.
    stage.waiting.forEach((kind, index) => {
      const pose = rest(this.pose)
      const x = GATE.x + (index === 0 ? -0.8 : 0.95), z = YARD.z - 0.9 * (1 - stage.stepped)
      this.stack([kind], this.stackMatrix(x, 0, z, 0, 1, pose, 0.9), still(this.limbs), x, z, play, this.tell(`waiting:${index}`, 99))
    })
  }

  /** Lays one straight part of an arm from `from` to `to`, in its figure's own measure. */
  private limbTo(mesh: THREE.Mesh, from: Vec, to: Vec): void {
    this.v2.set(to.x - from.x, to.y - from.y, to.z - from.z).normalize()
    mesh.quaternion.setFromUnitVectors(UP, this.v2)
    mesh.position.set(from.x, from.y, from.z)
  }

  private arm(upper: THREE.Mesh, fore: THREE.Mesh, shoulder: Vec, arm: Arm): void {
    this.limbTo(upper, shoulder, arm.elbow)
    this.limbTo(fore, arm.elbow, arm.hand)
  }

  private poseBystanders(bystanders: Bystanders, t: number): void {
    const pose = bystanders.mayor, mayor = this.mayor
    mayor.group.position.set(pose.x, MAYOR.floor + pose.bob * MAYOR.size, MAYOR.z)
    mayor.group.rotation.set(pose.lean * MAYOR_BUILD.leanTurn, 0, 0)
    // His belly shakes when he laughs.
    mayor.body.scale.set(1 + 0.03 * pose.belly, 1 - 0.03 * pose.belly, 1 + 0.07 * pose.belly)
    mayor.head.rotation.set(pose.lean * (1 - MAYOR_BUILD.leanTurn), pose.headYaw, pose.headTilt)
    mayor.pupils.position.set(pose.eyeX * 0.13, 1.4 + pose.eyeY * 0.12, 1.13)
    mayor.brows.position.set(0, 1.86 + pose.brow * 0.12, 1.02)
    mayor.brows.scale.set(1, 1 + Math.abs(pose.brow) * 0.3, 1)
    mayor.mouth.position.set(0, 0.5, 1.08)
    mayor.mouth.scale.set(1 + 0.5 * pose.mouthWide, 0.2 + 0.9 * pose.mouthOpen, 1)
    mayor.moustache.position.set(0, 0.8, 1.2)
    mayor.moustache.scale.set(1, Math.abs(pose.curl) < 0.15 ? 0.15 : pose.curl, 1)
    mayor.arm.rotation.set(-pose.armPitch, pose.armYaw, 0)
    mayor.arm.scale.set(1, 1, pose.armLong)
    mayor.tuft.scale.set(1, 0.5 + pose.tuft * 1.1, 1)
    this.arm(mayor.upper, mayor.fore, MAYOR_BUILD.shoulder, pose.arm)

    const stilt = bystanders.keeper, keeper = this.keeper, build = KEEPER_BUILD
    keeper.group.position.set(KEEPER.x, stilt.lift * KEEPER.size, KEEPER.z)
    keeper.group.rotation.set(-stilt.back, 0, stilt.sway)
    const headY = build.headY(stilt.neck)
    keeper.head.position.set(0, headY, 0)
    keeper.head.rotation.set(0, stilt.headYaw, stilt.headTilt)
    keeper.pupils.position.set(stilt.eyeX * 0.06, 1.05 + stilt.eyeY * 0.06, 0.45)
    keeper.brows.position.set(0, 1.27 + stilt.brow * 0.05, 0.42)
    keeper.mouth.position.set(0, 0.64, 0.41)
    keeper.mouth.scale.set(1 + 0.4 * stilt.mouthWide, 0.25 + 0.9 * stilt.mouthOpen, 1)
    this.arm(keeper.keyUpper, keeper.keyFore, build.keyShoulder, stilt.keyArm)
    this.arm(keeper.barUpper, keeper.barFore, build.barShoulder, stilt.barArm)
    // The key stands up in his hand and shakes in a salute; dropped, it lies on the pavement.
    keeper.key.position.set(stilt.key.x, stilt.key.y, stilt.key.z)
    keeper.key.rotation.set(0, 0, (1 - stilt.dropped) * 0.14 * stilt.jingle * Math.sin(t * 31) + stilt.dropped * (PI / 2))
    // The cap sits on his head and turns with it, and is in his bar hand while he fans.
    this.v.set(0, build.crown, 0).applyEuler(keeper.head.rotation).add(keeper.head.position)
    this.v2.set(stilt.barArm.hand.x, stilt.barArm.hand.y + 0.12, stilt.barArm.hand.z)
    keeper.cap.position.lerpVectors(this.v, this.v2, stilt.capOff)
    keeper.cap.rotation.set(stilt.capOff * 1.1, stilt.headYaw * (1 - stilt.capOff), stilt.headTilt * (1 - stilt.capOff))

    // The crowd: which head is ducking and how far, and how far all of them have jerked back.
    const ducking = bystanders.ducking >= 0 ? CROWD[bystanders.ducking] : null
    this.shared.uCrowd.value.set(ducking ? ducking.x : 0, ducking ? ducking.z : 0, ducking ? bystanders.duck : 0, bystanders.flinch)
  }

  private ring(mesh: THREE.Mesh, show: boolean, x: number, z: number, wide: number, deep: number, glow: number): void {
    mesh.visible = show
    if (!show) return
    mesh.matrix.compose(this.v.set(x, 0.03, z), this.q2.identity(), this.s.set(wide, 1, deep))
    mesh.matrixWorldNeedsUpdate = true
    ;(mesh.material as THREE.ShaderMaterial).uniforms.uGlow.value = glow
  }

  private showGuide(play: Play, guide: Guide | null, t: number): void {
    const glow = guide ? guide.glow * (0.7 + 0.3 * Math.sin(t * 4)) : 0, lit = glow > 0.01, hint = guide?.hint
    // On the bare street after a float the gate keeper glows together with the gate; otherwise the hole and the thing that fits.
    const gate = lit && !!hint?.gate, thing = hint?.thing
    const size = play.mouth / 2 + 0.55
    this.ring(this.glowHole, lit && !gate, play.x, play.z, size, size, glow)
    if (gate) this.ring(this.glowThing, true, KEEPER.x, KEEPER.z + 0.2, 1.05, 0.9, glow)
    else this.ring(this.glowThing, lit && !!thing, thing ? thing.x : 0, thing ? thing.z : 0, thing ? widthOf(thing.parts) / 2 + 0.4 : 1, thing ? widthOf(thing.parts) / 2 + 0.4 : 1, glow)
    this.ring(this.glowGate, gate, GATE.x, GATE.z + 0.45, GATE.half + 0.5, 0.95, glow)
    const hand = hint?.hand ?? null
    this.hand.visible = !!guide && guide.opacity > 0.01 && hand !== null
    if (!this.hand.visible || !guide || !hand) return
    // On the hole the hand taps where a finger finds it: its middle, or the thing at the bottom of a stack that rides over it.
    const mouth = holePoint(play)
    let x = mouth.x, y = 0.05 + mouth.y, z = mouth.z
    if (hand.on === 'thing') { x = hand.thing.x; y = heightOf(hand.thing.parts) * 0.75; z = hand.thing.z + 0.1 }
    else if (hand.on === 'street') { x = hand.x; z = hand.z }
    else if (hand.on === 'keeper') { x = hand.x; y = 2.3; z = hand.z + 0.5 }
    // The hand lies flat to the eye and comes in from the near right, so its pointing finger is seen whole and
    // what it points at stays in view beside the fingertip. It lifts off between presses.
    this.q2.setFromEuler(this.e.set(-0.12, 0.64, 0, 'YXZ'))
    const up = 0.55 * (1 - guide.press)
    this.hand.matrix.compose(this.v.set(x + 0.12, y + 0.2 + up, z + 0.16), this.q2, this.s.set(1.3, 1.3, 1.3))
    this.hand.matrixWorldNeedsUpdate = true
    this.ghost.uniforms.uOpacity.value = 0.92 * guide.opacity
  }

  dispose(): void {
    for (const made of this.disposables) made.dispose()
    for (const kind of KINDS) this.geometries[kind].dispose()
    this.shadows.dispose()
    this.scrapMesh.dispose()
  }
}
