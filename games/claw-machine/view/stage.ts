import {
  BufferGeometry, CircleGeometry, Color, CylinderGeometry, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial,
  PerspectiveCamera, Quaternion, Scene, ShaderMaterial, Vector3, WebGLRenderer,
} from 'three'
import { toyBricks } from '../builds'
import { cabinetBricks } from '../cabinet'
import { HINGE_DROP, HINGE_OUT, hubBricks, jawBricks } from '../clawBuild'
import { BACKDROP_HEX } from '../palette'
import { RAIL } from '../places'
import { fitCamera } from './fit'
import type { Picture, ToyLook } from '../picture'
import { GobblerRig } from './gobblerRig'
import { brickGeometry, plasticMaterial } from './plastic'

// The stage: the one place three.js is driven from. It is handed a picture
// of the world each frame and makes the scene match it; it decides nothing.

const MAX_SHADOWS = 24
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
  private readonly clawGroup = new Group()
  private readonly jaws: Mesh[] = []
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
    this.shaded.uniforms.uTintColor.value = new Vector3(0.19, 0.23, 0.29)
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

    // The cable: one thin cylinder, stretched from the gantry to the hub.
    const rope = new CylinderGeometry(0.09, 0.09, 1, 6)
    rope.translate(0, -0.5, 0)
    this.cable = new Mesh(rope, new MeshBasicMaterial({ color: 0xc9d0d8 }))
    this.cable.name = 'cable'
    this.scene.add(this.cable)

    const hub = new Mesh(brickGeometry(hubBricks(), true), this.plastic)
    hub.name = 'claw-hub'
    this.clawGroup.add(hub)
    for (const side of [-1, 1] as const) {
      const jaw = new Mesh(brickGeometry(jawBricks(side), true), this.plastic)
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

  /**
   * The point of the level plane at height `y` that lies under a point of the surface, given as fractions of
   * its width and height: where in the cabinet a finger is pointing.
   */
  pointOnPlane(fx: number, fy: number, y: number): { x: number; z: number } {
    const origin = this.camera.position
    this.position.set(fx * 2 - 1, 1 - fy * 2, 0.5).unproject(this.camera).sub(origin)
    const t = (y - origin.y) / this.position.y
    return { x: origin.x + this.position.x * t, z: origin.z + this.position.z * t }
  }

  /** Compiles the programs ahead of the first frame that needs them. */
  warm(): void {
    this.renderer.compile(this.scene, this.camera)
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
      const wide = 1 / Math.sqrt(Math.max(0.2, look.squash))
      mesh.position.set(look.x, look.y, look.z)
      // A toy in the jaws hangs the way the cable does.
      this.position.set(Math.sin(look.leanX), -Math.cos(look.leanX) * Math.cos(look.leanZ), Math.sin(look.leanZ)).normalize().negate()
      mesh.quaternion.setFromUnitVectors(UP, this.position)
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

    const count = Math.min(MAX_SHADOWS, picture.shadows.length)
    for (let i = 0; i < count; i++) {
      const s = picture.shadows[i], r = s.r * (0.6 + 0.4 * s.a)
      this.matrix.compose(this.position.set(s.x, s.y + 0.02 + i * 0.001, s.z), this.quaternion.identity(), this.scale.set(r, 1, r * 0.82))
      this.shadows.setMatrixAt(i, this.matrix)
    }
    this.shadows.count = count
    this.shadows.instanceMatrix.needsUpdate = true

    // The cable swings from the gantry; the hub hangs on its end and the jaws swing out from the hub.
    const claw = picture.claw
    this.position.set(Math.sin(claw.swingX), -Math.cos(claw.swingX) * Math.cos(claw.swingZ), Math.sin(claw.swingZ)).normalize()
    this.quaternion.setFromUnitVectors(UP, this.scale.copy(this.position).negate())
    this.cable.position.set(claw.x, RAIL.top, claw.z)
    this.cable.quaternion.copy(this.quaternion)
    this.cable.scale.set(1, claw.length, 1)
    this.clawGroup.position.set(claw.x, RAIL.top, claw.z).addScaledVector(this.position, claw.length)
    this.clawGroup.quaternion.copy(this.quaternion)
    this.clawGroup.scale.set(1 / Math.sqrt(claw.squash), claw.squash, 1 / Math.sqrt(claw.squash))
    this.jaws[0].rotation.z = -claw.open * 0.75
    this.jaws[1].rotation.z = claw.open * 0.75

    this.scene.updateMatrixWorld(true)
    this.renderer.render(this.scene, this.camera)
    return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  dispose(): void {
    for (const rig of this.rigs.values()) rig.dispose()
    for (const geometry of this.toyGeometry.values()) geometry.dispose()
    this.scene.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh) mesh.geometry.dispose()
    })
    this.plastic.dispose()
    this.shaded.dispose()
    this.renderer.dispose()
  }
}
