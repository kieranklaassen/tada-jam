import * as THREE from 'three'
import { frame as frameCamera, seaFarZ, lensOf, postsFor, type Lens, type Posts } from '../camera'
import type { Tier } from '../config'
import type { Guide } from '../guide'
import type { Frame, Particle } from '../island'
import { CORNER } from '../overlay'
import { SKY_REACH, type Sky } from '../pick'
import { CAT_FOOT } from '../place'
import { riding } from '../route'
import { FOOT, KINDS, LAND_Y, RIM_IN, RIM_TOP, TRAY_Z, slotOf, type Kind, GULL_SIZE } from '../toys'
import { C, CAT, GULL, HOUSE_BITS, WHALE_EYE, beamShape, bitShape, buoyShape, catModel, cloudShape, gullModel, handShape, puffShape, seaShape, settingShape, skyShape, toyModel, turntableShape, waveModel, whaleModel } from './models'
import { film, makePaint, ownGlow, type Paint } from './paint'
import type { Rgb } from './shapes'

// The diorama as a scene: every mesh of the game, made once, and one method
// that lays a frame of the toy (island.ts) on them. It needs no canvas and no
// renderer, so a test can build it, count what it would draw and measure it
// with the same camera the child looks through. Every mesh has a name, which
// is how the intersection audit and the tests speak of it.

type ToyNode = { root: THREE.Group; pose: THREE.Group; part: THREE.Group; partMesh: THREE.Mesh; pivot: readonly [number, number, number]; beam: THREE.Mesh | null }

const RINGS = 24
const PUFFS = 48
/** Flat films on the ground: a shadow under each toy and the cat, the lamp's light, the grass the sheep has mown. */
const DISCS = KINDS.length + 3
const SKY_Z = -42
const Z_AXIS = new THREE.Vector3(0, 0, 1)
const CLOUD_Z = -30
/** How far a cloud reaches from its middle as it is drawn, as a part of its width: across (half its width swollen by a gust, its drift and the gust's push) and down or up (its height, its bob and the gust's). */
const CLOUD_WIDE = 0.86
const CLOUD_DEEP = 0.34
/** Where the clouds stand in the band of sky: across the frame, and up from the horizon (0) to the top (1), with a size. */
const CLOUDS: readonly { across: number; up: number; size: number }[] = [
  { across: 0.36, up: 0.5, size: 1 },
  { across: 0.62, up: 0.45, size: 0.9 },
  { across: 0.86, up: 0.55, size: 0.85 },
  { across: 0.035, up: 0.3, size: 0.8 },
]
const TINT: Record<Particle['tint'], Rgb> = { smoke: [1, 0.98, 0.95], water: [0.87, 0.97, 0.99], leaf: C.leafPale, bubble: [0.8, 0.96, 0.95], dust: C.sand, drift: C.leafPale }
/** The films' colours. They are laid on at one strength, so each is chosen for what it lies on. */
const SHADE: Rgb = [0.56, 0.58, 0.66]
const LIGHT: Rgb = [1, 0.95, 0.6]
const MOWN: Rgb = [0.66, 0.8, 0.52]
/** How much of the island's rocking is shown: its dip in units, its tilt in radians. */
const DIP = 0.6
/** The residents are bigger than the toys: they are who the child looks at. */
const CAT_SIZE = 1.35
const WHALE_SIZE = 0.85
const TILT = 0.35

const named = <T extends THREE.Object3D>(object: T, name: string, parent: THREE.Object3D): T => {
  object.name = name
  parent.add(object)
  return object
}
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const bump = (t: number, a: number, b: number): number => Math.sin(clamp01((t - a) / (b - a)) * Math.PI)

export class Diorama {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera()
  lens: Lens
  posts: Posts
  private readonly paint: Paint = makePaint()
  private readonly lampPaint: Paint
  private readonly rock = new THREE.Group()
  private readonly spin = new THREE.Group()
  private readonly toys: Record<Kind, ToyNode>
  private readonly sky: THREE.Mesh
  private readonly sea: THREE.Mesh
  private seaFar = 0
  private readonly clouds: THREE.InstancedMesh
  private readonly cloudAt: { x: number; y: number; z: number; s: number }[] = CLOUDS.map(() => ({ x: 0, y: 0, z: CLOUD_Z, s: 1 }))
  private readonly sunAt = { x: 0, y: 0, z: SKY_Z, r: 1 }
  private readonly buoy: THREE.Mesh
  private readonly bits: THREE.InstancedMesh
  private readonly cat: { root: THREE.Group; rock: THREE.Group; squash: THREE.Group; head: THREE.Group; pupils: THREE.Mesh; tail: THREE.Group; paw: THREE.Group }
  private readonly gull: { root: THREE.Group; puff: THREE.Group; head: THREE.Group; jaw: THREE.Group; pupils: THREE.Mesh; wings: THREE.Group[] }
  private readonly wave: { root: THREE.Group; lids: THREE.Mesh }
  private readonly whale: { root: THREE.Group; pupil: THREE.Mesh }
  private readonly discs: THREE.InstancedMesh
  private readonly aim: THREE.Mesh
  private readonly aimRing: THREE.BufferGeometry
  private readonly aimDisc: THREE.BufferGeometry
  private readonly rings: THREE.InstancedMesh
  private readonly puffs: THREE.InstancedMesh
  private readonly hand: THREE.Mesh
  private readonly m = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly e = new THREE.Euler()
  private readonly v = new THREE.Vector3()
  private readonly s = new THREE.Vector3()
  private readonly color = new THREE.Color()

  constructor() {
    const { scene, paint } = this
    this.lampPaint = ownGlow(paint)
    this.posts = postsFor(1180, 820)
    frameCamera(this.camera, 1180, 820)
    this.lens = lensOf(this.camera, 1180, 820)

    // The sky is flat colour behind everything, and is made again for each surface (resize).
    this.sky = named(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, depthWrite: false })), 'sky', scene)
    this.sky.renderOrder = -2
    this.sky.frustumCulled = false
    this.clouds = named(new THREE.InstancedMesh(cloudShape(), paint, CLOUDS.length), 'clouds', scene)
    this.clouds.frustumCulled = false
    this.sea = named(new THREE.Mesh(new THREE.BufferGeometry(), paint), 'sea', scene)
    named(new THREE.Mesh(settingShape(TRAY_Z, KINDS.map((kind) => slotOf(kind).x)), paint), 'setting', scene)
    this.buoy = named(new THREE.Mesh(buoyShape(), paint), 'buoy', scene)

    // The turntable: it rocks as a whole, and what stands on it turns with it.
    scene.add(this.rock)
    this.rock.add(this.spin)
    named(new THREE.Mesh(turntableShape(), paint), 'turntable', this.spin)
    const disc = new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2)
    this.discs = named(new THREE.InstancedMesh(disc, film([1, 1, 1], 0.36), DISCS), 'discs', this.spin)
    this.discs.frustumCulled = false
    this.discs.setColorAt(0, this.color.setRGB(SHADE[0], SHADE[1], SHADE[2]))

    const toys = {} as Record<Kind, ToyNode>
    for (const kind of KINDS) {
      const model = toyModel(kind), root = new THREE.Group(), pose = new THREE.Group(), part = new THREE.Group()
      root.name = `toy-${kind}`
      scene.add(root)
      root.add(pose)
      named(new THREE.Mesh(model.body, paint), `${kind}-body`, pose)
      pose.add(part)
      const partMesh = named(new THREE.Mesh(model.part, kind === 'lighthouse' ? this.lampPaint : paint), `${kind}-part`, part)
      let beam: THREE.Mesh | null = null
      if (kind === 'lighthouse') {
        beam = named(new THREE.Mesh(beamShape(), film([1, 0.84, 0.42], 0.16, true)), 'lighthouse-beam', part)
        beam.visible = false
      }
      toys[kind] = { root, pose, part, partMesh, pivot: model.pivot, beam }
    }
    this.toys = toys
    // The house's door and its two shutters: three boxes in one mesh, each on its own hinge.
    this.bits = named(new THREE.InstancedMesh(bitShape(), paint, HOUSE_BITS.length), 'house-bits', toys.house.pose)
    this.bits.frustumCulled = false
    HOUSE_BITS.forEach((bit, i) => this.bits.setColorAt(i, this.color.setRGB(bit.color[0], bit.color[1], bit.color[2])))

    {
      const model = catModel(), root = new THREE.Group(), rock = new THREE.Group(), squash = new THREE.Group(), head = new THREE.Group(), tail = new THREE.Group(), paw = new THREE.Group()
      root.name = 'cat'
      root.scale.setScalar(CAT_SIZE)
      this.spin.add(root)
      root.add(rock)
      rock.add(squash)
      named(new THREE.Mesh(model.body, paint), 'cat-body', squash)
      squash.add(head, tail, paw)
      head.position.fromArray(CAT.head)
      tail.position.fromArray(CAT.tail)
      paw.position.fromArray(CAT.paw)
      named(new THREE.Mesh(model.head, paint), 'cat-head', head)
      const pupils = named(new THREE.Mesh(model.pupils, paint), 'cat-pupils', head)
      named(new THREE.Mesh(model.tail, paint), 'cat-tail', tail)
      named(new THREE.Mesh(model.paw, paint), 'cat-paw', paw)
      this.cat = { root, rock, squash, head, pupils, tail, paw }
    }
    {
      const model = gullModel(), root = new THREE.Group(), puff = new THREE.Group(), head = new THREE.Group(), jaw = new THREE.Group()
      root.name = 'gull'
      root.scale.setScalar(GULL_SIZE)
      scene.add(root)
      root.add(puff)
      named(new THREE.Mesh(model.body, paint), 'gull-body', puff)
      puff.add(head)
      head.position.fromArray(GULL.head)
      named(new THREE.Mesh(model.head, paint), 'gull-head', head)
      head.add(jaw)
      jaw.position.fromArray(GULL.jaw)
      named(new THREE.Mesh(model.jaw, paint), 'gull-jaw', jaw)
      const pupils = named(new THREE.Mesh(model.pupils, paint), 'gull-pupils', head)
      // The same wing twice: the left one is the right one in a mirror.
      const wings = [1, -1].map((side) => {
        const wing = new THREE.Group()
        wing.position.set(GULL.wing[0] * side, GULL.wing[1], GULL.wing[2])
        wing.scale.x = side
        puff.add(wing)
        named(new THREE.Mesh(model.wing, paint), side === 1 ? 'gull-wing-right' : 'gull-wing-left', wing)
        return wing
      })
      this.gull = { root, puff, head, jaw, pupils, wings }
    }
    {
      const model = waveModel(), root = new THREE.Group()
      root.name = 'wave'
      scene.add(root)
      named(new THREE.Mesh(model.body, paint), 'wave-body', root)
      this.wave = { root, lids: named(new THREE.Mesh(model.lids, paint), 'wave-lids', root) }
    }
    {
      const model = whaleModel(), root = new THREE.Group()
      root.name = 'whale'
      root.scale.setScalar(WHALE_SIZE)
      scene.add(root)
      named(new THREE.Mesh(model.body, paint), 'whale-body', root)
      const pupil = named(new THREE.Mesh(model.pupil, paint), 'whale-pupil', root)
      this.whale = { root, pupil }
    }

    this.aimRing = new THREE.RingGeometry(0.8, 1, 24).rotateX(-Math.PI / 2)
    // On a slot of the tray the mark is a whole pale disc: a ring inside the slot's own disc could be read as a numeral.
    this.aimDisc = new THREE.CircleGeometry(0.78, 24).rotateX(-Math.PI / 2)
    this.aim = named(new THREE.Mesh(this.aimRing, film([1, 1, 1], 0.6)), 'aim', scene)
    this.rings = named(new THREE.InstancedMesh(new THREE.RingGeometry(0.84, 1, 28).rotateX(-Math.PI / 2), film([1, 1, 1], 1, true), RINGS), 'rings', scene)
    this.rings.frustumCulled = false
    this.rings.setColorAt(0, this.color.setRGB(0, 0, 0))
    this.puffs = named(new THREE.InstancedMesh(puffShape(), paint, PUFFS), 'puffs', scene)
    this.puffs.frustumCulled = false
    this.puffs.setColorAt(0, this.color.setRGB(1, 1, 1))
    this.hand = named(new THREE.Mesh(handShape(), paint), 'hand', scene)
    // The hand comes down from above, flat to the eye, with its finger on the thing it shows.
    this.hand.rotation.x = 2.45
    this.rest()
    this.resize(1180, 820)
  }

  /** Until the first frame of the toy there is the place alone: nobody stands in it, and nothing is in the air. */
  private rest(): void {
    this.aim.visible = this.hand.visible = this.rings.visible = this.puffs.visible = false
    this.rings.count = this.puffs.count = this.discs.count = 0
    for (const kind of KINDS) this.toys[kind].root.visible = false
    this.toys.lighthouse.beam!.visible = false
    this.cat.root.visible = this.gull.root.visible = false
  }

  /**
   * Has every mesh compiled before the first touch: the ones that only show later (the puffs, the rings, the
   * ring under a carried toy, the beam, the hand) are shown, at no size, for as long as `compile` runs.
   */
  warm(compile: (scene: THREE.Scene, camera: THREE.Camera) => void): void {
    const zero = this.m.makeScale(0, 0, 0)
    for (const mesh of [this.rings, this.puffs, this.discs]) {
      mesh.setMatrixAt(0, zero)
      mesh.count = 1
      mesh.visible = true
    }
    this.aim.visible = this.hand.visible = true
    for (const kind of KINDS) this.toys[kind].root.visible = true
    this.toys.lighthouse.beam!.visible = true
    this.cat.root.visible = this.gull.root.visible = true
    compile(this.scene, this.camera)
    this.rest()
  }

  /** The point of the upright plane at depth `z` that shows at a point of the glass. */
  private behind(px: number, py: number, z: number, out: THREE.Vector3): THREE.Vector3 {
    const { camera } = this, width = this.lens.width, height = this.lens.height
    out.set((px / width) * 2 - 1, 1 - (py / height) * 2, 0.5).unproject(camera).sub(camera.position)
    return out.multiplyScalar((z - camera.position.z) / out.z).add(camera.position)
  }

  /** Stands the camera for a surface of that size, and with it everything whose place the surface's shape decides. */
  resize(width: number, height: number): void {
    frameCamera(this.camera, width, height)
    this.lens = lensOf(this.camera, width, height)
    this.posts = postsFor(width, height)
    const { v, lens } = this
    // The sea reaches as far back as this shape of surface shows it, and is made again only when that changes.
    const far = seaFarZ(width, height)
    if (far !== this.seaFar) {
      this.seaFar = far
      this.sea.geometry.dispose()
      this.sea.geometry = seaShape(far)
    }
    // The sky runs from the far edge of the sea to the top of the frame.
    const horizon = lens.glass(0, 0, far).y
    const low = this.behind(width / 2, horizon, SKY_Z, v).y, high = this.behind(width / 2, 0, SKY_Z, v).y
    // The sun stands left of the home control, and is big enough for a small finger.
    const sun = this.behind(width * 0.2, horizon * 0.48, SKY_Z, v).clone()
    const sunPx = Math.max(20, Math.min(horizon * 0.36, 60))
    this.sunAt.x = sun.x; this.sunAt.y = sun.y; this.sunAt.r = sunPx / lens.scale(sun.x, sun.y, SKY_Z)
    this.sky.geometry.dispose()
    this.sky.geometry = skyShape(SKY_Z, low, high, 150, this.sunAt)
    CLOUDS.forEach((cloud, i) => {
      const wide = Math.max(104, Math.min(200, horizon * 1.25)) * cloud.size, y = horizon * (1 - cloud.up)
      // The grown-up's corner at the top right holds only sky: a cloud stands far enough to its left, or far enough
      // under it, that neither what is drawn of it (drifting, and blown by a breath of wind) nor its touch reaches in.
      const under = y - CORNER, drawn = under >= wide * CLOUD_DEEP ? 0 : wide * CLOUD_WIDE + 6, reach = Math.max(SKY_REACH, wide / 2)
      const touched = under >= reach ? 0 : Math.sqrt(reach * reach - Math.max(0, under) ** 2) + 2
      const at = this.behind(Math.min(width * cloud.across, width - CORNER - Math.max(drawn, touched)), y, CLOUD_Z, v)
      this.cloudAt[i] = { x: at.x, y: at.y, z: CLOUD_Z, s: wide / (3 * lens.scale(at.x, at.y, CLOUD_Z)) }
    })
    this.buoy.position.set(this.posts.buoy.x, 0, this.posts.buoy.z)
    this.whale.root.position.set(this.posts.whale.x, 0, this.posts.whale.z)
  }

  /** What hangs in the sky and can be touched, where it is in the world. */
  skyNow(): Sky {
    return { clouds: this.cloudAt.map((at) => ({ x: at.x, y: at.y, z: at.z, r: at.s * 1.5 })), sun: this.sunAt }
  }

  /** How far the rocking island has lifted the water inside its rim at a point of the world. */
  private lift(frame: Frame, x: number, z: number): number {
    return Math.hypot(x, z) > RIM_IN ? 0 : frame.dip * DIP - z * frame.tiltX * TILT + x * frame.tiltZ * TILT
  }

  /** Lays one frame of the toy on the meshes. `seconds` is the attended clock: the paint's glints and the clouds run on it. */
  update(frame: Frame, guide: Guide, seconds: number, tier: Tier): void {
    const { m, q, e, v, s, color } = this
    this.paint.uniforms.uTime.value = seconds
    this.paint.uniforms.uGlint.value = tier.glint ? 1 : 0
    this.rock.position.y = frame.dip * DIP
    this.rock.rotation.set(frame.tiltX * TILT, 0, frame.tiltZ * TILT)
    this.spin.rotation.y = frame.turn

    // The clouds drift a little, bob when the sky is touched, and one that is touched is squeezed.
    const gust = frame.breeze < 1.6 ? Math.sin((frame.breeze / 1.6) * Math.PI) : 0
    this.cloudAt.forEach((at, i) => {
      const squeeze = bump(frame.clouds[i], 0, 0.6)
      s.set(at.s * (1 + gust * 0.08 + squeeze * 0.14), at.s * (1 + gust * 0.08 - squeeze * 0.4), at.s)
      v.set(at.x + Math.sin(seconds * 0.11 + i * 2.1) * at.s * 0.25 + gust * at.s * 0.7, at.y + Math.sin(seconds * 0.23 + i) * at.s * 0.08 + gust * at.s * 0.2 * (i % 2 === 0 ? 1 : -1), at.z)
      this.clouds.setMatrixAt(i, m.compose(v, q.identity(), s))
    })
    this.clouds.instanceMatrix.needsUpdate = true
    // The sun bounces when it is touched: the whole card of sky goes with it, which is one flat colour where it moves.
    this.sky.position.y = frame.sun < 1.2 ? Math.abs(Math.sin(frame.sun * 9)) * Math.exp(-frame.sun * 3.5) * this.sunAt.r * 0.9 : 0

    // The toys.
    let discs = 0
    const disc = (x: number, y: number, z: number, r: number, tint: Rgb): void => {
      if (discs >= DISCS) return
      this.discs.setMatrixAt(discs, m.compose(v.set(x, y, z), q.identity(), s.setScalar(r)))
      this.discs.setColorAt(discs++, color.setRGB(tint[0], tint[1], tint[2]))
    }
    // The mown grass lies under the shadows, and the lamp's light over them.
    if (frame.mown) disc(frame.mown.x, LAND_Y + 0.012, frame.mown.z, frame.mown.r * Math.sqrt(frame.mown.level), MOWN)
    this.cat.root.visible = this.gull.root.visible = true
    for (const shown of frame.toys) {
      const node = this.toys[shown.kind], pose = shown.pose, holder = shown.on === 'island' ? this.spin : this.scene
      if (node.root.parent !== holder) holder.add(node.root)
      node.root.visible = true
      node.root.position.set(shown.x, shown.y, shown.z)
      node.root.rotation.y = shown.yaw
      node.root.scale.setScalar(shown.scale)
      node.pose.position.set(pose.x, pose.y, pose.z)
      node.pose.rotation.set(pose.pitch, pose.yaw, pose.roll)
      node.pose.scale.set(pose.sx, pose.sy, pose.sz)
      node.part.position.set(node.pivot[0], node.pivot[1] + pose.part.y, node.pivot[2])
      node.part.rotation.set(pose.part.pitch, pose.part.yaw, pose.part.roll)
      // The tree's crown is as big as what the sheep has left of it.
      node.part.scale.setScalar(Math.max(0.05, pose.part.s * (shown.kind === 'tree' ? shown.crown : 1)))
      if (node.beam) {
        this.lampPaint.uniforms.uGlow.value.setRGB(0.3 * pose.glow, 0.24 * pose.glow, 0.04 * pose.glow)
        node.beam.visible = shown.on === 'island' && pose.glow > 0.5
        // On a spun island the beam is smeared sideways into a ribbon.
        node.beam.scale.x = 1 + frame.smear * 3.5
        ;(node.beam.material as THREE.MeshBasicMaterial).opacity = 0.16 * pose.glow * (1 + frame.smear * 0.5)
      }
      if (shown.shadow > 0 && shown.on === 'island') {
        const high = Math.max(0, shown.y + pose.y * shown.scale - LAND_Y)
        disc(shown.x, LAND_Y + 0.02, shown.z, FOOT[shown.kind] * 1.02 / (1 + high * 0.6), SHADE)
      }
    }
    // The house's door and shutters, each swung on its hinge.
    HOUSE_BITS.forEach((bit, i) => {
      q.setFromEuler(e.set(0, bit.swing * frame.flap, 0))
      v.set((bit.out * bit.size[0]) / 2, 0, 0).applyQuaternion(q).add(s.set(bit.hinge[0], bit.hinge[1], bit.hinge[2]))
      this.bits.setMatrixAt(i, m.compose(v, q, s.set(bit.size[0], bit.size[1], bit.size[2])))
    })
    this.bits.instanceMatrix.needsUpdate = true

    // The cat.
    {
      const cat = this.cat, at = frame.cat, pose = at.pose, onLand = Math.hypot(at.x, at.z) < RIM_IN - 0.5
      cat.root.position.set(at.x, at.y, at.z)
      cat.root.rotation.y = at.yaw
      cat.rock.rotation.set(pose.lean, 0, pose.roll - at.leanX * 0.2)
      // It leans about whatever is on the ground: its front paws when it leans forward, its haunches when it leans back.
      cat.rock.position.y = 0.04 + Math.sin(Math.abs(pose.lean)) * (pose.lean > 0 ? 0.47 : 0.2) + Math.sin(Math.abs(pose.roll - at.leanX * 0.2)) * 0.3
      cat.squash.position.y = pose.y
      const wide = pose.puff / Math.sqrt(pose.squash * pose.stretch)
      // Fur on end makes it wide far more than tall: at twice its size it is twice as broad.
      cat.squash.scale.set(wide, (1 + (pose.puff - 1) * 0.28) * pose.squash * pose.stretch, wide)
      cat.head.rotation.set(pose.nod, 0, pose.tilt)
      // Flat ears: the head is pressed low and wide.
      cat.head.scale.set(1 + pose.ears * 0.08, 1 - pose.ears * 0.2, 1)
      cat.pupils.position.set(CAT.pupils[0] + at.lookX * 0.04 * (1 - pose.rove) + Math.cos(pose.roving) * 0.04 * pose.rove, CAT.pupils[1] + at.lookY * 0.035 * (1 - pose.rove) + Math.sin(pose.roving) * 0.035 * pose.rove, CAT.pupils[2])
      cat.pupils.scale.y = Math.max(0.12, pose.lids)
      cat.tail.rotation.z = pose.tail * 0.32
      // The paw reaches forward to pat, or comes up to the mouth to be washed.
      cat.paw.rotation.x = -pose.paw * 1.1 - pose.wash * 2.2
      cat.paw.position.set(CAT.paw[0] + pose.wash * 0.1, CAT.paw[1] + pose.wash * 0.18, CAT.paw[2])
      disc(at.x, (onLand ? LAND_Y : RIM_TOP) + 0.02, at.z, CAT_FOOT * 1.05 / (1 + Math.max(0, pose.y) * 0.6), SHADE)
    }
    if (frame.light) disc(frame.light.x, frame.light.y, frame.light.z, frame.light.r * frame.light.level, LIGHT)
    this.discs.count = discs
    this.discs.instanceMatrix.needsUpdate = true
    if (this.discs.instanceColor) this.discs.instanceColor.needsUpdate = true

    // The buoy rocks and rides the swell, and the gull standing on it goes with it.
    const lean = frame.buoy * 0.25 + Math.sin(seconds * 1.1) * 0.03
    this.buoy.rotation.z = lean
    this.buoy.position.y = frame.buoyLift
    {
      const gull = this.gull, at = frame.gull, pose = at.pose
      // On its buoy, and setting down on it or lifting off, it is carried by the buoy as the buoy is drawn: lifted with it and leant about its foot.
      const rides = riding(Math.hypot(at.x - this.posts.buoy.x, at.z - this.posts.buoy.z)), tilt = lean * rides
      const dx = at.x - this.posts.buoy.x, dy = at.y - frame.buoyLift, sin = Math.sin(tilt), cos = Math.cos(tilt)
      gull.root.quaternion.setFromEuler(this.e.set(pose.pitch, at.yaw, 0)).premultiply(this.q.setFromAxisAngle(Z_AXIS, tilt))
      gull.root.position.set(this.posts.buoy.x + dx * cos - dy * sin, frame.buoyLift + dx * sin + dy * cos + pose.y, at.z)
      gull.puff.scale.setScalar(pose.puff)
      gull.head.position.y = GULL.head[1] + pose.neck
      // The head turns to what it is after, and winds round with a spun island.
      gull.head.rotation.set(0, at.head, pose.tilt)
      gull.jaw.rotation.x = pose.beak * 0.55
      gull.pupils.position.set(GULL.pupils[0] + at.lookX * 0.04, GULL.pupils[1] + at.lookY * 0.035, GULL.pupils[2])
      gull.pupils.scale.y = Math.max(0.12, pose.lids)
      // The left wing is the right one in a mirror, so it turns the other way.
      gull.wings.forEach((wing, i) => { wing.rotation.z = (i === 0 ? 1 : -1) * (pose.spread * 1.25 + pose.flap * 0.45 * pose.spread) })
    }

    // The wave: at its edge it breathes with its eyes half open; called, it rears, rolls over the island and comes back.
    {
      const wave = this.wave, pose = frame.wave
      wave.root.position.set(pose.x, 0, pose.z)
      wave.root.rotation.set(0, pose.yaw, pose.curl * 0.05 + pose.rear * 0.16)
      wave.root.scale.set(pose.wide, pose.tall * (1 + pose.rear * 0.35 + pose.curl * 0.04), pose.long)
      wave.root.visible = pose.tall > 0.02
      wave.lids.position.y = pose.lids * 0.2
    }
    {
      const whale = this.whale
      whale.root.position.y = -0.34 + frame.whale.rise
      whale.root.rotation.z = frame.whale.tail * 0.03
      whale.pupil.position.fromArray(WHALE_EYE)
      whale.pupil.scale.y = Math.max(0.12, frame.whale.lids)
    }

    // Where the toy in the air will come down.
    this.aim.visible = frame.spot !== null
    if (frame.spot) {
      this.aim.geometry = frame.spot.home ? this.aimDisc : this.aimRing
      this.aim.position.set(frame.spot.x, frame.spot.y + 0.05 + this.lift(frame, frame.spot.x, frame.spot.z), frame.spot.z)
      this.aim.scale.setScalar(frame.spot.r * 1.12)
    }

    // Rings on the water and on the ground, and the glow of the idle guidance: one mesh, light added to what is under it.
    let rings = 0
    for (const ring of frame.rings) {
      if (rings >= RINGS) break
      const t = ring.age / ring.life, level = Math.pow(1 - t, 1.5) * (ring.tint === 'water' ? 0.5 : 0.3)
      s.setScalar(ring.size * (0.3 + 0.7 * (1 - (1 - t) * (1 - t))))
      this.rings.setMatrixAt(rings, m.compose(v.set(ring.x, ring.y + this.lift(frame, ring.x, ring.z), ring.z), q.identity(), s))
      this.rings.setColorAt(rings++, color.setRGB(level, level, level))
    }
    if (guide.glow > 0) {
      const level = guide.glow * (0.42 + 0.16 * Math.sin(seconds * 4))
      for (const ring of guide.rings) {
        if (rings >= RINGS) break
        s.setScalar(ring.r * (1 + 0.04 * Math.sin(seconds * 4)))
        this.rings.setMatrixAt(rings, m.compose(v.set(ring.x, ring.y + this.lift(frame, ring.x, ring.z), ring.z), q.identity(), s))
        this.rings.setColorAt(rings++, color.setRGB(level, level * 0.88, level * 0.5))
      }
    }
    this.rings.count = rings
    this.rings.visible = rings > 0
    this.rings.instanceMatrix.needsUpdate = true
    if (this.rings.instanceColor) this.rings.instanceColor.needsUpdate = true

    // Smoke balls, drops and leaves: the newest first, as many as the tier allows.
    let puffs = 0
    for (let i = frame.particles.length - 1; i >= 0 && puffs < Math.min(PUFFS, tier.puffs); i--) {
      const p = frame.particles[i], left = p.life - p.age
      s.setScalar(p.size * Math.min(1, p.age / 0.06 + 0.3) * Math.min(1, left / 0.25))
      // A leaf adrift lies flat on the water.
      if (p.tint === 'drift') s.y *= 0.3
      this.puffs.setMatrixAt(puffs, m.compose(v.set(p.x, p.y, p.z), q.identity(), s))
      this.puffs.setColorAt(puffs++, color.setRGB(TINT[p.tint][0], TINT[p.tint][1], TINT[p.tint][2]))
    }
    this.puffs.count = puffs
    this.puffs.visible = puffs > 0
    this.puffs.instanceMatrix.needsUpdate = true
    if (this.puffs.instanceColor) this.puffs.instanceColor.needsUpdate = true

    // The hand of the idle guidance.
    this.hand.visible = guide.hand !== null && guide.hand.there > 0.02
    if (guide.hand) {
      this.hand.position.set(guide.hand.x, guide.hand.y + 0.12 + (1 - guide.hand.press) * 0.5, guide.hand.z)
      this.hand.scale.setScalar(1.7 * guide.hand.there)
    }
  }

  /** The meshes a frame would draw as it stands: each visible mesh is one draw. */
  draws(): string[] {
    const names: string[] = []
    this.scene.traverseVisible((object) => {
      if ((object as THREE.Mesh).isMesh) names.push(object.name)
    })
    return names
  }

  dispose(): void {
    const materials = new Set<THREE.Material>()
    // Every toy is gathered first: one that is on the turntable is not under the scene's own list.
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      materials.add(mesh.material as THREE.Material)
      if ((mesh as THREE.InstancedMesh).isInstancedMesh) (mesh as THREE.InstancedMesh).dispose()
    })
    this.aimRing.dispose()
    this.aimDisc.dispose()
    for (const material of materials) material.dispose()
  }
}
