import * as THREE from 'three'
import { makeFigure, type Figure } from './figurines'
import { POT, bowlOf, dishOf, surfaceOf } from './forms'
import { Guide } from './guide'
import type { Guidance } from './guidance'
import { Drops, Puddles, Ripples, Stream } from './liquid'
import { TURN_SEGMENTS, cupGeometry, makeKit, poolGeometry, saucerGeometry, teaDiscGeometry, turn, type Kit } from './pieces'
import { liftOf, type Pot } from './pour'
import { SPOUT_TIP, clothMesh, potGeometry, shadowBlobs, spongeGeometry, spoonGeometry, wallMesh } from './props'
import { holds, thingById, type GuestId, type Thing, type World } from './world'

// The table as three.js draws it. It is given the model (the world's things,
// the pot, the guests) and shows it: where each piece stands, how high the tea
// is in each cup, the stream, the puddles. Springs live here because they are
// only looks: a piece that is nudged wobbles and settles, and the model never
// hears of it.

type Piece = {
  group: THREE.Group
  /** The surface of the tea, in a cup. */
  tea?: THREE.Mesh
  /** The pool, in a saucer. */
  pool?: THREE.Mesh
  /** What the thing looked like when its meshes were built; a change rebuilds them. */
  key: string
  /** A wobble: displacement and speed of a spring that squashes the piece and rocks its tea. */
  wobble: number
  speed: number
  height: number
  girth: number
}

const CAMERA = { fov: 27, pitch: 0.8, lookAt: new THREE.Vector3(0, 0.75, 0.62), halfWidth: 6.75, halfDepth: 4.6 } as const

export class TableView {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 1, 80)
  readonly renderer: THREE.WebGLRenderer
  private readonly kit: Kit
  private readonly segments: number
  private readonly pieces = new Map<string, Piece>()
  private readonly figures = new Map<GuestId, Figure>()
  private readonly shadows: THREE.InstancedMesh
  private readonly stream: Stream
  private readonly drops: Drops
  private readonly ripples = new Ripples()
  private readonly puddles = new Puddles()
  private readonly guide: Guide
  private readonly potRoot = new THREE.Group()
  private readonly potTilt = new THREE.Group()
  private readonly lid: THREE.Mesh
  private lidHop = 0
  private lidSpeed = 0
  private potSquash = 0
  private potSquashSpeed = 0
  private readonly matrix = new THREE.Matrix4()
  private readonly vector = new THREE.Vector3()
  private width = 1
  private height = 1
  private time = 0

  constructor(canvas: HTMLCanvasElement, doc: Document, tier: number) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor('#dfe6f2')
    this.renderer.info.autoReset = false
    this.kit = makeKit(doc)
    this.segments = TURN_SEGMENTS[Math.min(TURN_SEGMENTS.length - 1, Math.max(0, tier))]
    this.scene.add(clothMesh(doc), wallMesh(doc))
    this.shadows = shadowBlobs(doc, 28)
    this.stream = new Stream(this.kit.tea)
    this.drops = new Drops(this.kit.tea)
    this.guide = new Guide(doc)
    this.scene.add(this.shadows, this.puddles.mesh, this.ripples.mesh, this.stream.mesh, this.drops.mesh, this.guide.group)
    const pot = potGeometry(this.segments)
    const body = new THREE.Mesh(pot.body, this.kit.glaze)
    body.name = 'pot-body'
    this.lid = new THREE.Mesh(pot.lid, this.kit.glaze)
    this.lid.name = 'pot-lid'
    // The pot tips about the front of its foot, under the spout.
    this.potTilt.position.set(0.6, 0, 0)
    body.position.set(-0.6, 0, 0)
    this.lid.position.set(-0.6, 0, 0)
    this.potTilt.add(body, this.lid)
    this.potRoot.add(this.potTilt)
    this.potRoot.name = 'pot'
    this.scene.add(this.potRoot)
  }

  /** The surface was sized: `ratio` is the pixel ratio the tier allows. */
  resize(width: number, height: number, ratio: number): void {
    this.width = width
    this.height = height
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    const aspect = width / height
    this.camera.aspect = aspect
    // The whole table stays in view at any shape of surface: fit its width, or its depth on a tall one.
    const half = Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2))
    const distance = Math.max(CAMERA.halfWidth / (half * aspect), CAMERA.halfDepth / half)
    this.camera.position.set(CAMERA.lookAt.x, CAMERA.lookAt.y + Math.sin(CAMERA.pitch) * distance, CAMERA.lookAt.z + Math.cos(CAMERA.pitch) * distance)
    this.camera.lookAt(CAMERA.lookAt)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
  }

  private build(thing: Thing): Piece {
    const group = new THREE.Group()
    group.name = thing.id
    const piece: Piece = { group, key: keyOf(thing), wobble: 0, speed: 0, height: 0.3, girth: 0.5 }
    if (thing.kind === 'cup') {
      const bowl = bowlOf(thing.size)
      const mesh = new THREE.Mesh(cupGeometry(bowl, thing.ring, this.segments), this.kit.glaze)
      mesh.name = `${thing.id}-glaze`
      piece.tea = new THREE.Mesh(teaDiscGeometry(this.segments), this.kit.teaSkin)
      piece.tea.name = `${thing.id}-tea`
      piece.tea.renderOrder = 2
      group.add(mesh, piece.tea)
      piece.height = bowl.rimY
      piece.girth = bowl.rimR
    } else if (thing.kind === 'saucer') {
      const dish = dishOf(thing.size)
      const mesh = new THREE.Mesh(saucerGeometry(thing.size, this.segments), this.kit.glaze)
      mesh.name = `${thing.id}-glaze`
      piece.pool = new THREE.Mesh(poolGeometry(this.segments), this.kit.tea)
      piece.pool.name = `${thing.id}-pool`
      group.add(mesh, piece.pool)
      piece.height = dish.rimY
      piece.girth = dish.rimR
    } else if (thing.kind === 'spoon') {
      const mesh = new THREE.Mesh(spoonGeometry(), this.kit.glaze)
      mesh.rotation.y = -0.25
      group.add(mesh)
      piece.height = 0.12
      piece.girth = 0.5
    } else if (thing.kind === 'sponge') {
      group.add(new THREE.Mesh(spongeGeometry(), this.kit.matte))
      piece.height = 0.34
      piece.girth = 0.5
    } else if (thing.kind === 'bowl') {
      const profile = [{ r: 0, y: 0 }, { r: 0.5, y: 0 }, { r: 0.52, y: 0.08 }, { r: 0.82, y: 0.42 }, { r: 0.92, y: 0.62 }, { r: 0.87, y: 0.64 }, { r: 0.76, y: 0.42 }, { r: 0.42, y: 0.12 }, { r: 0, y: 0.1 }]
      group.add(new THREE.Mesh(turn(profile, this.segments), this.kit.glaze))
      piece.tea = new THREE.Mesh(teaDiscGeometry(this.segments), this.kit.teaSkin)
      group.add(piece.tea)
      piece.height = 0.64
      piece.girth = 0.92
    }
    this.scene.add(group)
    return piece
  }

  /** Shows the world as it is: pieces are made, moved and removed to match, and every level of tea is set. */
  syncWorld(world: World): void {
    for (const [id, piece] of this.pieces) {
      const thing = thingById(world, id)
      if (thing && keyOf(thing) === piece.key) continue
      this.scene.remove(piece.group)
      piece.group.traverse((node) => { if (node instanceof THREE.Mesh) node.geometry.dispose() })
      this.pieces.delete(id)
    }
    for (const thing of world.things) {
      if (thing.kind === 'pot') continue
      let piece = this.pieces.get(thing.id)
      if (!piece) this.pieces.set(thing.id, (piece = this.build(thing)))
      const under = thingById(world, thing.on)
      // A thing that stands on another stands at its spot, raised by what is under it.
      const lift = under ? (under.kind === 'saucer' ? 0.035 * Math.cbrt(holds(under) / 0.2) : 0.1) : 0
      piece.group.position.set(under ? under.x : thing.x, lift, under ? under.z : thing.z)
      if (piece.tea) {
        const bowl = thing.kind === 'cup' ? bowlOf(thing.size) : { floorR: 0.42, rimR: 0.87, floorY: 0.12, rimY: 0.62, holds: holds(thing) }
        const surface = surfaceOf(bowl, thing.tea)
        piece.tea.visible = thing.tea > 1e-4
        // A cup filled to its rim bulges a little above it before it runs over.
        const brim = thing.tea >= bowl.holds * 0.985 ? 0.012 : 0
        piece.tea.position.y = surface.y + brim
        piece.tea.scale.set(surface.r * 0.995, 1, surface.r * 0.995)
      }
      if (piece.pool) {
        const dish = dishOf(thing.size)
        const share = Math.min(1, thing.tea / dish.holds)
        piece.pool.visible = share > 0.01
        const reach = dish.wellR * 1.3 + (dish.rimR * 0.95 - dish.wellR * 1.3) * Math.sqrt(share)
        piece.pool.scale.set(reach, 1, reach)
        piece.pool.position.y = 0.04 + dish.rimY * (reach / dish.rimR) ** 2 * 0.9
      }
    }
  }

  /** Shows the world at once, as on load: every piece where it stands and every puddle at its full size, with nothing easing in. */
  showAsLeft(world: World): void {
    this.syncWorld(world)
    this.puddles.update(world, 0)
  }

  /** Makes the guests of a party, each standing at its seat and facing the child. */
  setGuests(guests: readonly { who: GuestId; x: number; z: number }[]): void {
    for (const figure of this.figures.values()) this.scene.remove(figure.root)
    this.figures.clear()
    for (const guest of guests) {
      const figure = makeFigure(guest.who, this.kit.glaze, this.segments)
      figure.root.position.set(guest.x, 0, guest.z)
      this.figures.set(guest.who, figure)
      this.scene.add(figure.root)
    }
  }

  /** A piece was touched or tea landed in it: it squashes and rings on its spring. */
  nudge(id: string, strength: number): void {
    if (id === 'pot') {
      this.potSquashSpeed -= strength * 5
      this.lidSpeed += strength * 2.2
      return
    }
    const piece = this.pieces.get(id)
    if (piece) piece.speed -= strength * 5
  }

  /** A drop leaves the spout for the place the tea lands. */
  drop(to: { x: number; y: number; z: number }): void {
    this.drops.fall(this.spoutTip(this.vector), to)
  }

  /** Where the tea leaves the spout, in the world. */
  spoutTip(out: THREE.Vector3): THREE.Vector3 {
    return this.potTilt.localToWorld(out.copy(SPOUT_TIP).sub(this.vector2.set(0.6, 0, 0)))
  }
  private readonly vector2 = new THREE.Vector3()

  /** One frame: springs, the pot's pose, the liquid, the guests' idle life, and the draw. `stream` is where the tea lands, or null. */
  frame(dt: number, world: World, pot: Pot, stream: { x: number; y: number; z: number } | null, guidance: Guidance): { drawCalls: number; triangles: number } {
    this.time += dt
    const spring = (x: number, v: number, stiffness: number, damping: number): [number, number] => {
      const speed = v + (-stiffness * x - damping * v) * dt
      return [x + speed * dt, speed]
    }
    ;[this.potSquash, this.potSquashSpeed] = spring(this.potSquash, this.potSquashSpeed, 260, 13)
    ;[this.lidHop, this.lidSpeed] = spring(this.lidHop, this.lidSpeed, 420, 9)
    // The lid chatters while the tea runs.
    if (pot.flow > 0) this.lidSpeed += Math.sin(this.time * 61) * dt * 9
    this.potRoot.position.set(pot.x, liftOf(pot), pot.z)
    this.potRoot.rotation.y = -pot.heading
    this.potRoot.scale.set(1 - this.potSquash * 0.5, 1 + this.potSquash, 1 - this.potSquash * 0.5)
    this.potTilt.rotation.z = -pot.tilt * 0.62
    this.lid.position.y = Math.max(0, this.lidHop) * 0.5
    this.lid.rotation.z = this.lidHop * 0.35
    this.potRoot.updateMatrixWorld(true)

    let blobs = 0
    const blob = (x: number, z: number, size: number, lift: number) => {
      // A thing lifted off the cloth throws a wider, fainter shadow: drawn here as a smaller, softer one.
      const s = size * (1 - lift * 0.18)
      this.matrix.makeScale(s, 1, s * 0.82).setPosition(x, 0.004, z)
      if (blobs < this.shadows.instanceMatrix.count) this.shadows.setMatrixAt(blobs++, this.matrix)
    }
    blob(pot.x, pot.z, POT.bellyR * 1.25, liftOf(pot))
    for (const thing of world.things) {
      const piece = this.pieces.get(thing.id)
      if (!piece) continue
      ;[piece.wobble, piece.speed] = spring(piece.wobble, piece.speed, 300, 11)
      piece.group.scale.set(1 - piece.wobble * 0.5, 1 + piece.wobble, 1 - piece.wobble * 0.5)
      // The tea rocks against the wall as the cup settles.
      if (piece.tea) piece.tea.rotation.set(piece.wobble * 1.4, 0, piece.speed * 0.012)
      if (!thing.on) blob(thing.x, thing.z, piece.girth * 1.2, 0)
    }
    for (const figure of this.figures.values()) {
      this.idle(figure)
      blob(figure.root.position.x, figure.root.position.z + 0.1, figure.girth * 1.45, 0)
    }
    this.shadows.count = blobs
    this.shadows.instanceMatrix.needsUpdate = true

    const tip = this.spoutTip(this.vector)
    this.stream.update(dt, stream ? pot.flow / 0.27 : 0, tip, stream ? this.vector2.set(stream.x, stream.y, stream.z) : tip, this.time)
    this.drops.update(dt)
    for (const landed of this.drops.landed.splice(0)) this.ripples.ring(landed.x, landed.y, landed.z, 0.3)
    if (stream && pot.flow > 0 && Math.floor(this.time * 7) !== Math.floor((this.time - dt) * 7)) this.ripples.ring(stream.x, stream.y, stream.z, 0.22 + 0.2 * (pot.flow / 0.27))
    this.ripples.update(dt)
    this.puddles.update(world, dt)
    // Steam only from a pot at rest; the ghost hand's press squashes the pot as a finger will.
    const resting = pot.tilt === 0 && pot.hop === null
    if (this.guide.update(dt, guidance, { x: pot.x, z: pot.z, girth: POT.bellyR, top: POT.height + 0.5 }, resting ? this.spoutTip(this.vector) : null)) this.nudge('pot', 0.07)

    this.renderer.info.reset()
    this.renderer.render(this.scene, this.camera)
    return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  /** Each guest is alive while the child only watches, in its own tempo: it breathes, blinks and looks from its cup to the pot. */
  private idle(figure: Figure): void {
    const t = this.time
    const tempo = figure.who === 'bear' ? 0.34 : figure.who === 'mouse' ? 1.15 : figure.who === 'hen' ? 0.7 : 0.9
    const phase = figure.root.position.x * 1.7
    const breath = Math.sin(t * tempo * Math.PI * 2 + phase)
    figure.body.scale.set(1 - breath * 0.008, 1 + breath * (figure.who === 'bear' ? 0.02 : 0.012), 1 - breath * 0.008)
    // A blink every few seconds, never two guests together.
    const blink = (t * (0.21 + tempo * 0.05) + phase * 0.37) % 1
    figure.eyes.scale.y = blink > 0.965 ? 0.12 : 1
    const look = Math.sin(t * tempo * 0.9 + phase)
    // The Hen's head moves in jerks; the others turn smoothly.
    figure.head.rotation.y = figure.who === 'hen' ? Math.round(look * 2) * 0.14 : look * 0.2
    figure.head.rotation.x = 0.18 + 0.05 * Math.sin(t * tempo * 1.7 + phase)
    if (figure.who === 'mouse') figure.funny.rotation.z = Math.sin(t * 2.6) * 0.28
    else if (figure.who === 'hen') figure.funny.rotation.x = Math.sin(t * 4.2) * 0.1 + look * 0.12
    else if (figure.who === 'bear') figure.funny.rotation.x = -0.12 + breath * 0.02
    else figure.funny.rotation.y = Math.sin(t * 9 + phase) * 0.5
  }

  /** Where a point of the table is on the surface, in its own pixels. */
  screenOf(x: number, y: number, z: number): { x: number; y: number } {
    this.vector.set(x, y, z).project(this.camera)
    return { x: (this.vector.x * 0.5 + 0.5) * this.width, y: (-this.vector.y * 0.5 + 0.5) * this.height }
  }

  /** The spot of the cloth under a point of the surface. */
  clothAt(px: number, py: number): { x: number; z: number } {
    const near = this.vector.set((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1, 0.5).unproject(this.camera)
    const origin = this.camera.position
    const t = origin.y / (origin.y - near.y)
    return { x: origin.x + (near.x - origin.x) * t, z: origin.z + (near.z - origin.z) * t }
  }

  /** How high and how wide a thing is, for picking it with a finger. */
  sizeOf(id: string): { height: number; girth: number } {
    if (id === 'pot') return { height: POT.height, girth: POT.bellyR }
    const piece = this.pieces.get(id)
    return piece ? { height: piece.height, girth: piece.girth } : { height: 0.3, girth: 0.5 }
  }

  dispose(): void {
    this.guide.dispose()
    this.scene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose()
        const material = node.material as THREE.Material & { map?: THREE.Texture | null }
        material.map?.dispose()
        material.dispose()
      }
    })
    this.kit.dispose()
    this.renderer.dispose()
  }
}

function keyOf(thing: Thing): string {
  return `${thing.kind}:${thing.size}:${thing.ring}`
}
