import { Color, Euler, Matrix4, PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer } from 'three'
import type { KindName } from './bodies'
import { eyeBits, mouthBits, type Bit, type FacePlan, type FaceState } from './faces'
import { applyPose, buildFriend, disposeFriends, type FriendRig } from './friends'
import { BALLOON, FOV, viewFor, type View } from './layout'
import type { Pose } from './pose'
import { buildScenery, MAX_BALLOONS, MAX_BITS, MAX_SHADOWS, MAX_STRINGS, type Scenery } from './scenery'
import { CLOUD_FACE, TOYS, type ToyName } from './setting'
import { sharedVinyl, type VinylUniforms } from './vinyl'

// The stage draws what it is told and decides nothing. Each frame the game
// poses the friends it asked for and lists the balloons, strings and shadows
// of that frame; the stage writes them into its three batches and renders.
// Nothing in a frame allocates.

/** What a quality tier changes here, besides the pixel ratio the Mount applies. */
export type StageLook = { gloss: boolean; wobble: boolean }

const UP = new Vector3(0, 1, 0)
const KINDS: readonly KindName[] = ['duck', 'frog', 'hippo', 'crab']

export class Stage {
  readonly scene = new Scene()
  readonly camera = new PerspectiveCamera(FOV, 1, 1, 80)
  view: View = viewFor(1180, 820)
  private readonly renderer: WebGLRenderer
  private readonly shared: VinylUniforms = sharedVinyl()
  private readonly scenery: Scenery
  private readonly friends = new Map<string, FriendRig>()
  private balloons = 0
  private strings = 0
  private shadows = 0
  private bits = 0
  /** What carries the face being written: its place in the world. */
  private carrier = new Matrix4()
  private readonly local = new Matrix4()
  private readonly euler = new Euler()
  private readonly marchers: Record<KindName, number> = { duck: 0, frog: 0, hippo: 0, crab: 0 }
  private readonly strollers: Record<KindName, number> = { duck: 0, frog: 0, hippo: 0, crab: 0 }
  private readonly matrix = new Matrix4()
  private readonly quaternion = new Quaternion()
  private readonly tilt = new Quaternion()
  private readonly position = new Vector3()
  private readonly scale = new Vector3()
  private readonly along = new Vector3()
  private readonly colour = new Color()
  private readonly colours = new Map<string, Color>()

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' })
    this.scenery = buildScenery(this.shared)
    this.scene.add(this.scenery.group)
    this.scene.matrixWorldAutoUpdate = true
  }

  /** `width` and `height` in logical pixels. Sizes the drawing buffer and frames the view so the sky and a troop of three always fit. */
  resize(width: number, height: number, pixelRatio: number): void {
    this.view = viewFor(width, height)
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.position.set(0, 0, this.view.distance)
    this.camera.lookAt(0, 0, 0)
    this.camera.updateProjectionMatrix()
    // The sky stands far behind and is sized to cover the view there, with room to spare.
    const depth = this.view.distance - this.scenery.sky.position.z
    const tall = 2 * depth * Math.tan((FOV * Math.PI) / 360)
    this.scenery.sky.scale.set(tall * this.camera.aspect * 1.1, tall * 1.1, 1)
  }

  setLook(look: StageLook): void {
    this.shared.uGloss.value = look.gloss ? 1 : 0
    this.shared.uWobble.value = look.wobble ? 0.012 : 0
  }

  /** The friend of that name, built the first time it is asked for. A name belongs to one kind. */
  friend(name: string, kind: KindName): FriendRig {
    let rig = this.friends.get(name)
    if (rig && rig.kind !== kind) {
      this.dropFriend(name)
      rig = undefined
    }
    if (!rig) {
      rig = buildFriend(kind, name, this.shared)
      this.friends.set(name, rig)
      this.scene.add(rig.root)
    }
    return rig
  }

  dropFriend(name: string): void {
    const rig = this.friends.get(name)
    if (!rig) return
    this.scene.remove(rig.root)
    rig.material.dispose()
    this.friends.delete(name)
  }

  /** Poses the friend of that name, building it if this is the first frame it is on. */
  place(name: string, kind: KindName, pose: Pose): void {
    applyPose(this.friend(name, kind), pose)
  }

  drop(name: string): void {
    this.dropFriend(name)
  }

  /** Starts a frame's lists. */
  begin(time: number): void {
    this.shared.uTime.value = time
    this.balloons = 0
    this.strings = 0
    this.shadows = 0
    this.bits = 0
    for (const toy of Object.values(this.scenery.toys)) toy.visible = false
    this.marchers.duck = this.marchers.frog = this.marchers.hippo = this.marchers.crab = 0
    this.strollers.duck = this.strollers.frog = this.strollers.hippo = this.strollers.crab = 0
    this.scenery.hand.visible = false
  }

  /** One balloon: its middle, how wide and how tall it is against its resting size, its lean, its colour, and how far it glows. */
  balloon(x: number, y: number, z: number, wide: number, tall: number, lean: number, colour: string, glow = 0): void {
    if (this.balloons >= MAX_BALLOONS) return
    this.quaternion.setFromAxisAngle(this.along.set(0, 0, 1), lean)
    // The breathing glow on a balloon that can be touched is a swell, never a change of colour: its colour is what the child sorts by.
    const swell = 1 + glow * 0.15
    this.matrix.compose(this.position.set(x, y, z), this.quaternion, this.scale.set(BALLOON * wide * swell, BALLOON * tall * swell, BALLOON * wide * swell))
    this.scenery.balloons.setMatrixAt(this.balloons, this.matrix)
    this.scenery.balloons.setColorAt(this.balloons, this.colourOf(colour))
    this.balloons += 1
  }

  /** One straight piece of string, `thick` in radius. */
  string(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, colour: string, thick = 0.022): void {
    if (this.strings >= MAX_STRINGS) return
    this.along.set(x1 - x0, y1 - y0, z1 - z0)
    const length = this.along.length()
    if (length < 1e-4) return
    this.quaternion.setFromUnitVectors(UP, this.along.divideScalar(length))
    this.matrix.compose(this.position.set(x0, y0, z0), this.quaternion, this.scale.set(thick, length, thick))
    this.scenery.strings.setMatrixAt(this.strings, this.matrix)
    this.scenery.strings.setColorAt(this.strings, this.colourOf(colour))
    this.strings += 1
  }

  /** One blob shadow lying on the hill, tinted by the toy above it. */
  shadow(x: number, y: number, z: number, wide: number, deep: number, colour: string): void {
    if (this.shadows >= MAX_SHADOWS) return
    this.quaternion.identity()
    this.matrix.compose(this.position.set(x, y, z), this.quaternion, this.scale.set(wide, 1, deep))
    this.scenery.shadows.setMatrixAt(this.shadows, this.matrix)
    this.scenery.shadows.setColorAt(this.shadows, this.colourOf(colour))
    this.shadows += 1
  }

  /** One friend on the far hill: a whole toy at its feet's place, turned the way it walks and leaning with its step, with its string hand up if it holds a balloon. */
  marcher(kind: KindName, x: number, y: number, z: number, scale: number, turn: number, lean: number, holds = true): void {
    const strolling = holds ? undefined : this.scenery.strolling[kind]
    const batch = strolling ?? this.scenery.parade[kind], count = strolling ? this.strollers : this.marchers, index = count[kind]
    if (index >= batch.instanceMatrix.count) return
    this.quaternion.setFromAxisAngle(this.along.set(0, 1, 0), turn)
    this.tilt.setFromAxisAngle(this.along.set(0, 0, 1), lean)
    this.matrix.compose(this.position.set(x, y, z), this.quaternion.multiply(this.tilt), this.scale.setScalar(scale))
    batch.setMatrixAt(index, this.matrix)
    count[kind] = index + 1
  }

  /** The ghost hand: its fingertip at this point, this large (it grows in and out instead of fading), pressed this far. */
  hand(x: number, y: number, size: number, press: number): void {
    const hand = this.scenery.hand
    hand.visible = size > 0.02
    // It comes up from below and to the right, so it never covers what it points at, and dips onto it as it presses.
    hand.position.set(x + 0.22 * (1 - press), y - 0.34 * (1 - press), 1.2)
    hand.rotation.z = 0.5
    const grown = size * 1.45
    hand.scale.set(grown * (1 + press * 0.1), grown * (1 - press * 0.12), grown)
  }

  /** A cloud squashed or stretched: 1 at rest. With `face`, the face printed on it, as it is now. */
  cloud(index: number, squash: number, face?: FaceState): void {
    const cloud = this.scenery.clouds[index]
    if (!cloud) return
    const scale = cloud.scale.z
    cloud.scale.set(scale / Math.sqrt(Math.max(0.3, squash)), scale * squash, scale)
    if (face) {
      cloud.updateMatrixWorld()
      this.face(cloud.matrixWorld, cloud.matrixWorld, CLOUD_FACE, face)
    }
  }

  /** One of the toys that live in the setting: where its feet are, how large, turned and leaning how far, squashed how flat, and its face if it has one. */
  prop(name: ToyName, x: number, y: number, z: number, scale: number, turn: number, lean: number, squash: number, face?: FaceState): void {
    const toy = this.scenery.toys[name], wide = scale / Math.sqrt(Math.max(0.3, squash))
    toy.visible = true
    toy.position.set(x, y, z)
    toy.rotation.set(0, turn, lean)
    toy.scale.set(wide, scale * squash, wide)
    if (face && TOYS[name].face.eyeSize > 0) {
      toy.updateMatrixWorld()
      this.face(toy.matrixWorld, toy.matrixWorld, TOYS[name].face, face)
    }
  }

  /** Writes a face into the batch: its eyes on whatever carries the eyes, its mouth on whatever carries the mouth. */
  private face(eyesOn: Matrix4, mouthOn: Matrix4, plan: FacePlan, state: FaceState): void {
    this.carrier = eyesOn
    eyeBits(plan, state, this.bit)
    this.carrier = mouthOn
    mouthBits(plan, state, this.bit)
  }

  /** One small pillow of a face, in the space of what carries it. */
  private readonly bit: Bit = (x, y, z, wide, tall, deep, turn, colour) => {
    if (this.bits >= MAX_BITS) return
    this.quaternion.setFromEuler(this.euler.set(0, 0, turn))
    this.local.compose(this.position.set(x, y, z), this.quaternion, this.scale.set(wide, Math.max(1e-3, tall), deep))
    this.matrix.multiplyMatrices(this.carrier, this.local)
    this.scenery.bits.setMatrixAt(this.bits, this.matrix)
    this.scenery.bits.setColorAt(this.bits, this.colourOf(colour))
    this.bits += 1
  }

  /** Ends the frame's lists and draws. */
  render(): void {
    const { balloons, strings, shadows, bits } = this.scenery
    balloons.count = this.balloons
    strings.count = this.strings
    shadows.count = this.shadows
    bits.count = this.bits
    for (const batch of [balloons, strings, shadows, bits]) {
      batch.instanceMatrix.needsUpdate = true
      if (batch.instanceColor) batch.instanceColor.needsUpdate = true
    }
    for (const kind of KINDS) {
      const batch = this.scenery.parade[kind], strolling = this.scenery.strolling[kind]
      batch.count = this.marchers[kind]
      batch.instanceMatrix.needsUpdate = true
      if (strolling) {
        strolling.count = this.strollers[kind]
        strolling.instanceMatrix.needsUpdate = true
      }
    }
    this.renderer.render(this.scene, this.camera)
  }

  /** Compiles every program now, so nothing is compiled in the middle of play. */
  warm(): void {
    this.renderer.compile(this.scene, this.camera)
  }

  get drawn(): { drawCalls: number; triangles: number } {
    return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  dispose(): void {
    for (const name of [...this.friends.keys()]) this.dropFriend(name)
    disposeFriends()
    this.scenery.dispose()
    this.renderer.dispose()
  }

  private colourOf(hex: string): Color {
    let colour = this.colours.get(hex)
    if (!colour) {
      colour = new Color(hex)
      this.colours.set(hex, colour)
    }
    return this.colour.copy(colour)
  }
}
