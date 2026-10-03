import { Color, Matrix4, PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer } from 'three'
import type { KindName } from './bodies'
import { applyPose, buildFriend, disposeFriends, type FriendRig } from './friends'
import { BALLOON, FOV, viewFor, type View } from './layout'
import type { Pose } from './pose'
import { buildScenery, MAX_BALLOONS, MAX_SHADOWS, MAX_STRINGS, type Scenery } from './scenery'
import { sharedVinyl, type VinylUniforms } from './vinyl'

// The stage draws what it is told and decides nothing. Each frame the game
// poses the friends it asked for and lists the balloons, strings and shadows
// of that frame; the stage writes them into its three batches and renders.
// Nothing in a frame allocates.

/** What a quality tier changes here, besides the pixel ratio the Mount applies. */
export type StageLook = { gloss: boolean; wobble: boolean; clouds: boolean }

const UP = new Vector3(0, 1, 0)

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
  private readonly matrix = new Matrix4()
  private readonly quaternion = new Quaternion()
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
    for (const cloud of this.scenery.clouds) cloud.visible = look.clouds
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
  }

  /** One balloon: its middle, how wide and how tall it is against its resting size, its lean, and its colour. */
  balloon(x: number, y: number, z: number, wide: number, tall: number, lean: number, colour: string): void {
    if (this.balloons >= MAX_BALLOONS) return
    this.quaternion.setFromAxisAngle(this.along.set(0, 0, 1), lean)
    this.matrix.compose(this.position.set(x, y, z), this.quaternion, this.scale.set(BALLOON * wide, BALLOON * tall, BALLOON * wide))
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

  /** Ends the frame's lists and draws. */
  render(): void {
    const { balloons, strings, shadows } = this.scenery
    balloons.count = this.balloons
    strings.count = this.strings
    shadows.count = this.shadows
    for (const batch of [balloons, strings, shadows]) {
      batch.instanceMatrix.needsUpdate = true
      if (batch.instanceColor) batch.instanceColor.needsUpdate = true
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
