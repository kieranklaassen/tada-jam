import {
  BufferAttribute, BufferGeometry, CircleGeometry, Color, CylinderGeometry, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial,
  PerspectiveCamera, Quaternion, RingGeometry, SRGBColorSpace, Scene, ShaderMaterial, SphereGeometry, Vector3, WebGLRenderer,
} from 'three'
import type { Ray } from '../aim'
import { toyBricks } from '../builds'
import { cabinetBricks, gateBricks } from '../cabinet'
import { ON_STUDS } from '../bricks'
import { bedMesh, cartMesh, crateMesh } from '../crateBuild'
import { HINGE_DROP, HINGE_OUT, JAW_SWING, hubBricks, jawBricks } from '../clawBuild'
import { LAMP_SIZE, lampGlow, lampSpots } from '../lamps'
import { WATCHER_BIG, WATCHER_EYE, WATCHER_EYES, watcherParts } from '../watcher'
import { BACKDROP_HEX, BULB_DIM, BULB_LIT, CUFF, GLOVE } from '../palette'
import { BED, TIP, deckTop } from '../layout'
import { GATE, RAIL, SHELF } from '../places'
import { fitCamera } from './fit'
import type { Picture, ToyLook } from '../picture'
import { GobblerRig } from './gobblerRig'
import { brickGeometry, meshGeometry, plasticMaterial } from './plastic'

// The stage: the one place three.js is driven from. It is handed a picture
// of the world each frame and makes the scene match it; it decides nothing.

const MAX_SHADOWS = 24
const MAX_GLOWS = 12
const UP = new Vector3(0, 1, 0)

export class Stage {
  readonly renderer: WebGLRenderer
  readonly scene = new Scene()
  readonly camera = new PerspectiveCamera()
  readonly plastic: ShaderMaterial
  /** The same plastic in the shade behind the parapet. */
  readonly shaded: ShaderMaterial
  private readonly toyGeometry = new Map<string, BufferGeometry>()
  private readonly toyMeshes = new Map<number, Mesh>()
  private readonly rigs = new Map<string, GobblerRig>()
  private readonly shadows: InstancedMesh
  private readonly cable: Mesh
  private readonly glows: InstancedMesh
  private readonly lamps: InstancedMesh
  private readonly watcher = new Group()
  private readonly watcherPupils: Mesh
  private readonly colour = new Color()
  private readonly gate: Mesh
  private readonly hand: Mesh
  private readonly ghost: ShaderMaterial
  private readonly crates = new Map<number, { key: string; group: Group; hinge: Group | null }>()
  private readonly carts = new Map<number, Mesh>()
  private cartGeometry: BufferGeometry | null = null
  private readonly clawGroup = new Group()
  private readonly jaws: Mesh[] = []
  private readonly hub: Mesh
  private readonly matrix = new Matrix4()
  private readonly quaternion = new Quaternion()
  private readonly position = new Vector3()
  private readonly scale = new Vector3()

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' })
    this.renderer.setClearColor(new Color(BACKDROP_HEX))
    this.plastic = plasticMaterial()
    this.shaded = plasticMaterial()
    this.shaded.uniforms.uTint.value = 0.3
    this.shaded.uniforms.uTintColor.value = new Vector3(0.3, 0.33, 0.56)
    this.scene.matrixAutoUpdate = false

    const cabinet = new Mesh(brickGeometry(cabinetBricks()), this.plastic)
    cabinet.name = 'cabinet'
    cabinet.matrixAutoUpdate = false
    this.scene.add(cabinet)

    // Round contact shadows, all in one draw: no shadow map anywhere.
    const disc = new CircleGeometry(1, 20)
    disc.rotateX(-Math.PI / 2)
    this.shadows = new InstancedMesh(disc, new MeshBasicMaterial({ color: 0x10141c, transparent: true, opacity: 0.22, depthWrite: false }), MAX_SHADOWS)
    this.shadows.name = 'shadows'
    this.shadows.instanceMatrix.setUsage(DynamicDrawUsage)
    this.shadows.frustumCulled = false
    this.shadows.renderOrder = 1
    this.scene.add(this.shadows)

    // The glow on what can be touched: a gold ring with a dark edge, so it reads on the pale tray and on the
    // dark wall alike. Every ring is as strong as every other, so one material serves them all.
    const ring = new RingGeometry(0.8, 1, 40, 2)
    ring.rotateX(-Math.PI / 2)
    const tint = new Float32Array(ring.getAttribute('position').count * 3)
    for (let i = 0; i < tint.length / 3; i++) {
      const x = ring.getAttribute('position').getX(i), z = ring.getAttribute('position').getZ(i)
      tint.set(Math.hypot(x, z) > 0.97 ? [0.6, 0.32, 0] : [1, 0.78, 0.12], i * 3)
    }
    ring.setAttribute('color', new BufferAttribute(tint, 3))
    this.glows = new InstancedMesh(ring, new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false }), MAX_GLOWS)
    this.glows.name = 'glow'
    this.glows.instanceMatrix.setUsage(DynamicDrawUsage)
    this.glows.frustumCulled = false
    this.glows.renderOrder = 3
    this.glows.count = 0
    this.scene.add(this.glows)

    // The lamps: one small ball for every bulb, all in one draw, each lit by its own colour.
    const spots = lampSpots()
    this.lamps = new InstancedMesh(new SphereGeometry(LAMP_SIZE / 2, 10, 8), new MeshBasicMaterial({ color: 0xffffff }), spots.length)
    this.lamps.name = 'lamps'
    spots.forEach((spot, i) => { this.lamps.setMatrixAt(i, this.matrix.makeTranslation(spot.x, spot.y, spot.z)); this.lamps.setColorAt(i, this.colour.setRGB(BULB_DIM[0], BULB_DIM[1], BULB_DIM[2], SRGBColorSpace)) })
    this.lamps.instanceMatrix.needsUpdate = true
    this.scene.add(this.lamps)

    // The watcher beside the tray: a body, and two pupils that ride on its eyes.
    const watcher = watcherParts()
    this.watcher.name = 'watcher'
    const watcherBody = new Mesh(brickGeometry(watcher.body, true), this.plastic)
    watcherBody.name = 'watcher-body'
    this.watcherPupils = new Mesh(brickGeometry(watcher.pupils), this.plastic)
    this.watcherPupils.name = 'watcher-pupils'
    this.watcher.add(watcherBody, this.watcherPupils)
    this.scene.add(this.watcher)

    this.gate = new Mesh(brickGeometry(gateBricks()), this.plastic)
    this.gate.name = 'gate'
    this.gate.position.set(GATE.x, GATE.top, GATE.z)
    this.scene.add(this.gate)

    // The ghost hand: a pale brick glove with one finger out, pointing down. Its fingertip is its origin.
    this.ghost = plasticMaterial(false)
    this.ghost.transparent = true
    this.ghost.depthWrite = false
    // A mitten: one long finger down, three knuckles curled beside it, a thumb out to the side and a cuff.
    this.hand = new Mesh(brickGeometry([
      { x: -0.55, y: 0, z: -0.55, w: 1.1, d: 1.1, h: 8, colour: GLOVE, round: true, studs: false },
      { x: 0.6, y: 5, z: -0.5, w: 1, d: 1, h: 3, colour: GLOVE, round: true, studs: false },
      { x: 1.6, y: 5.5, z: -0.5, w: 1, d: 1, h: 2.5, colour: GLOVE, round: true, studs: false },
      { x: -0.9, y: 8, z: -0.8, w: 3.8, d: 1.6, h: 5, colour: GLOVE, studs: false },
      { x: -2.2, y: 8.5, z: -0.5, w: 1.3, d: 1, h: 2.5, colour: GLOVE, round: true, axis: 'z', studs: false },
      { x: -0.5, y: 13, z: -0.7, w: 3, d: 1.4, h: 2.5, colour: CUFF, studs: false },
    ]), this.ghost)
    this.hand.name = 'ghost-hand'
    this.hand.scale.setScalar(1.2)
    this.hand.renderOrder = 4
    this.hand.visible = false
    this.scene.add(this.hand)

    // The cable: one thin cylinder, stretched from the rail above the frame to the hub.
    const rope = new CylinderGeometry(0.09, 0.09, 1, 6)
    rope.translate(0, -0.5, 0)
    this.cable = new Mesh(rope, new MeshBasicMaterial({ color: 0xc9d0d8 }))
    this.cable.name = 'cable'
    this.scene.add(this.cable)

    this.hub = new Mesh(brickGeometry(hubBricks()), this.plastic)
    this.hub.name = 'claw-hub'
    this.clawGroup.add(this.hub)
    for (const side of [-1, 1] as const) {
      const jaw = new Mesh(brickGeometry(jawBricks(side)), this.plastic)
      jaw.name = side < 0 ? 'claw-jaw-left' : 'claw-jaw-right'
      jaw.position.set(side * HINGE_OUT, -HINGE_DROP, 0)
      this.jaws.push(jaw)
      this.clawGroup.add(jaw)
    }
    this.clawGroup.name = 'claw'
    this.scene.add(this.clawGroup)
  }

  resize(width: number, height: number, ratio: number): void {
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    fitCamera(this.camera, width / height)
  }

  /** The line of sight through a point of the surface, given as fractions of its width and height. */
  ray(fx: number, fy: number): Ray {
    const origin = this.camera.position
    this.position.set(fx * 2 - 1, 1 - fy * 2, 0.5).unproject(this.camera).sub(origin).normalize()
    return { ox: origin.x, oy: origin.y, oz: origin.z, dx: this.position.x, dy: this.position.y, dz: this.position.z }
  }

  /** Where a point of the cabinet is on the surface, as fractions of its width and height. */
  project(x: number, y: number, z: number): { x: number; y: number } {
    this.position.set(x, y, z).project(this.camera)
    return { x: (this.position.x + 1) / 2, y: (1 - this.position.y) / 2 }
  }

  /** Compiles the programs ahead of the first frame that needs them. */
  warm(): void {
    this.renderer.compile(this.scene, this.camera)
  }

  private dropCrate(group: Group): void {
    this.scene.remove(group)
    group.traverse((object) => { const mesh = object as Mesh; if (mesh.isMesh) mesh.geometry.dispose() })
  }

  private toyMesh(look: ToyLook): Mesh {
    let mesh = this.toyMeshes.get(look.key)
    if (mesh) return mesh
    const id = `${look.toy.colour}-${look.toy.kind}-${look.toy.size}`
    let geometry = this.toyGeometry.get(id)
    if (!geometry) this.toyGeometry.set(id, (geometry = brickGeometry(toyBricks(look.toy), true)))
    mesh = new Mesh(geometry, this.plastic)
    mesh.name = `toy-${look.key}`
    this.toyMeshes.set(look.key, mesh)
    this.scene.add(mesh)
    return mesh
  }

  draw(picture: Picture): { drawCalls: number; triangles: number } {
    const seen = new Set<number>()
    for (const look of picture.toys) {
      seen.add(look.key)
      const mesh = this.toyMesh(look)
      const wide = look.wide
      mesh.position.set(look.x, look.y, look.z)
      if (look.ride) {
        // In or on a gobbler it is rolled, turned and pitched exactly as the gobbler is.
        mesh.rotation.set(look.ride.leanX, look.ride.turn, look.ride.leanZ)
      } else {
        // A toy in the jaws hangs the way the cable does.
        this.position.set(Math.sin(look.leanX), -Math.cos(look.leanX) * Math.cos(look.leanZ), Math.sin(look.leanZ)).normalize().negate()
        mesh.quaternion.setFromUnitVectors(UP, this.position)
        if (look.turn !== 0) mesh.rotateY(look.turn)
        if (look.pitch !== 0) mesh.rotateZ(look.pitch)
      }
      mesh.scale.set(wide * look.scale, look.squash * look.scale, wide * look.scale)
    }
    for (const [key, mesh] of this.toyMeshes) if (!seen.has(key)) { this.scene.remove(mesh); this.toyMeshes.delete(key) }

    const live = new Set<string>()
    for (const look of picture.gobblers) {
      live.add(look.id)
      let rig = this.rigs.get(look.id)
      if (rig && rig.waiting !== look.waiting) { this.scene.remove(rig.group); rig.dispose(); rig = undefined }
      if (!rig) { this.rigs.set(look.id, (rig = new GobblerRig(look, look.waiting ? this.shaded : this.plastic))); this.scene.add(rig.group) }
      rig.pose(look)
    }
    for (const [id, rig] of this.rigs) if (!live.has(id)) { this.scene.remove(rig.group); rig.dispose(); this.rigs.delete(id) }

    // A crate is built once for what it carries, and again only when that changes.
    const standing = new Set<number>()
    for (const look of picture.crates) {
      standing.add(look.which)
      // While its bed tips, the bed is a mesh of its own, turning about its front edge; otherwise a crate is one mesh.
      const tipping = look.tip > 0, key = `${look.key}-${tipping ? 'tipping' : 'level'}`
      let crate = this.crates.get(look.which)
      if (crate && crate.key !== key) { this.dropCrate(crate.group); crate = undefined }
      if (!crate) {
        const group = new Group()
        group.name = `crate-${look.which}-group`
        const mesh = new Mesh(meshGeometry(crateMesh(look.which, look.toys, look.places, look.crews, !tipping)), this.shaded)
        mesh.name = `crate-${look.which}`
        group.add(mesh)
        let hinge: Group | null = null
        if (tipping) {
          hinge = new Group()
          hinge.position.set(0, deckTop(look.which) + BED.lift, BED.front)
          const bed = new Mesh(meshGeometry(bedMesh(look.which)), this.shaded)
          bed.name = `crate-${look.which}-bed`
          bed.position.set(0, -hinge.position.y, -BED.front)
          hinge.add(bed)
          group.add(hinge)
        }
        this.scene.add(group)
        this.crates.set(look.which, (crate = { key, group, hinge }))
      }
      crate.group.position.set(look.x, look.y, look.z)
      if (crate.hinge) crate.hinge.rotation.x = look.tip * TIP
    }
    for (const [which, crate] of this.crates) if (!standing.has(which)) { this.dropCrate(crate.group); this.crates.delete(which) }
    // The carts: one build for all of them, each where its crate waits.
    const parked = new Set<number>()
    for (const look of picture.carts) {
      parked.add(look.which)
      let cart = this.carts.get(look.which)
      if (!cart) {
        cart = new Mesh(this.cartGeometry ?? (this.cartGeometry = meshGeometry(cartMesh())), this.shaded)
        cart.name = `cart-${look.which}`
        this.carts.set(look.which, cart)
        this.scene.add(cart)
      }
      cart.position.set(look.x, SHELF.top + ON_STUDS, look.z)
    }
    for (const [which, cart] of this.carts) if (!parked.has(which)) { this.scene.remove(cart); this.carts.delete(which) }

    // The gate jumps on its posts and rocks as it comes down: it is always higher than its rocking dips an end.
    this.gate.rotation.z = picture.gate * 0.07 * Math.sin(picture.gate * 40)
    this.gate.position.y = GATE.top + picture.gate * (0.3 + 0.08 * Math.abs(Math.sin(picture.gate * 31)))

    // The watcher: it squashes about its feet and turns where it sits; its pupils ride on its eyes as a gobbler's do.
    const peer = picture.watcher, bulge = 1 / Math.sqrt(Math.max(0.2, peer.squash))
    this.watcher.position.set(peer.x, peer.y, peer.z)
    this.watcher.rotation.y = peer.turn
    this.watcher.scale.set(bulge * WATCHER_BIG, peer.squash * WATCHER_BIG, bulge * WATCHER_BIG)
    const across = peer.gazeX * 0.75, lift = 0.5 + peer.gazeY * 0.6, reach = WATCHER_EYE / 2 - 0.08
    this.watcherPupils.position.set(Math.sin(across) * Math.cos(lift) * reach, WATCHER_EYES.y + Math.sin(lift) * reach, WATCHER_EYES.z + Math.cos(across) * Math.cos(lift) * reach)
    this.watcherPupils.scale.set(1, Math.max(0.1, 1 - peer.blink), 1)

    // The chase of the lamps.
    for (let i = 0; i < this.lamps.count; i++) {
      const lit = lampGlow(i, picture.seconds)
      this.lamps.setColorAt(i, this.colour.setRGB(BULB_DIM[0] + (BULB_LIT[0] - BULB_DIM[0]) * lit, BULB_DIM[1] + (BULB_LIT[1] - BULB_DIM[1]) * lit, BULB_DIM[2] + (BULB_LIT[2] - BULB_DIM[2]) * lit, SRGBColorSpace))
    }
    if (this.lamps.instanceColor) this.lamps.instanceColor.needsUpdate = true

    const rings = Math.min(MAX_GLOWS, picture.glows.length)
    for (let i = 0; i < rings; i++) {
      const g = picture.glows[i]
      this.matrix.compose(this.position.set(g.x, g.y, g.z), this.quaternion.identity(), this.scale.set(g.r, 1, g.r))
      this.glows.setMatrixAt(i, this.matrix)
    }
    this.glows.count = rings
    this.glows.instanceMatrix.needsUpdate = true
    ;(this.glows.material as MeshBasicMaterial).opacity = rings > 0 ? Math.min(0.95, picture.glows[0].a) : 0
    this.glows.visible = rings > 0 && picture.glows[0].a > 0.01

    const ghost = picture.hand
    this.hand.visible = ghost !== null && ghost.opacity > 0.01
    if (ghost) {
      this.hand.position.set(ghost.x, ghost.y + 2.4 - ghost.press * 2.2, ghost.z + 0.4)
      this.hand.rotation.x = 0.35
      this.ghost.uniforms.uOpacity.value = ghost.opacity * 0.9
    }

    const count = Math.min(MAX_SHADOWS, picture.shadows.length)
    for (let i = 0; i < count; i++) {
      const s = picture.shadows[i], r = s.r * (0.6 + 0.4 * s.a)
      this.matrix.compose(this.position.set(s.x, s.y + 0.02 + i * 0.001, s.z), this.quaternion.identity(), this.scale.set(r, 1, r * 0.82))
      this.shadows.setMatrixAt(i, this.matrix)
    }
    this.shadows.count = count
    this.shadows.instanceMatrix.needsUpdate = true

    // The cable swings from the rail above the frame; the hub hangs on its end and the jaws swing out from the hub.
    const claw = picture.claw
    this.position.set(Math.sin(claw.swingX), -Math.cos(claw.swingX) * Math.cos(claw.swingZ), Math.sin(claw.swingZ)).normalize()
    this.quaternion.setFromUnitVectors(UP, this.scale.copy(this.position).negate())
    this.clawGroup.position.set(claw.x, RAIL.top, claw.z).addScaledVector(this.position, claw.length)
    this.clawGroup.position.x += claw.shiftX; this.clawGroup.position.z += claw.shiftZ
    this.clawGroup.quaternion.copy(this.quaternion)
    if (claw.turn !== 0) this.clawGroup.rotateY(claw.turn)
    // The cable runs from the rail to wherever the hub is.
    this.cable.position.set(claw.x, RAIL.top, claw.z)
    this.scale.copy(this.clawGroup.position).sub(this.cable.position)
    const run = this.scale.length()
    this.cable.quaternion.setFromUnitVectors(UP, this.scale.divideScalar(-run))
    this.cable.scale.set(1, run, 1)
    // Only the hub squashes, onto its hinges: the jaws keep their length, so the teeth stay beside what they hold,
    // and the cable is as much longer as the hub is shorter.
    this.hub.scale.y = claw.squash
    this.hub.position.y = -HINGE_DROP * (1 - claw.squash)
    this.cable.scale.y = run + HINGE_DROP * (1 - claw.squash)
    this.jaws[0].rotation.z = -claw.open * JAW_SWING
    this.jaws[1].rotation.z = claw.open * JAW_SWING

    this.scene.updateMatrixWorld(true)
    this.renderer.render(this.scene, this.camera)
    return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  dispose(): void {
    for (const rig of this.rigs.values()) rig.dispose()
    for (const geometry of this.toyGeometry.values()) geometry.dispose()
    this.cartGeometry?.dispose()
    this.scene.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh) mesh.geometry.dispose()
    })
    this.plastic.dispose()
    this.shaded.dispose()
    this.ghost.dispose()
    this.renderer.dispose()
  }
}
