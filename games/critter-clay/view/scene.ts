import * as THREE from 'three'
import type { WorkshopController } from '../controller'
import { TURNTABLE } from '../layout'
import { HUE_HEX, PALETTE } from '../palette'
import { BATCH_KEYS, type Batch, type BatchKey, type OverlayBatch, type Rig } from '../rig'
import type { ClayMaterials } from './clay'
import { buildBench, buildPartShapes, buildTurntableTop } from './shapes'

// The workshop's meshes, built once and fed every frame without React: one
// instanced draw per clay shape reads the rig's typed arrays as its
// instance buffers, the soft shadows and glows are two more instanced
// draws, and the bench is one merged mesh. Empty batches are skipped.

// the ghost part draws over the hand, so the part it brings is never hidden behind the glove
const RENDER_ORDER = { shadows: 1, glows: 5, hand: 6, ghost: 7, overlay: 10 } as const
const GHOST_COLORS = ([0, 1, 2] as const).map((hue) => new THREE.Color(HUE_HEX[hue]).lerp(new THREE.Color('#ffffff'), 0.15))

type Linked = { mesh: THREE.InstancedMesh; batch: Batch; boil: THREE.InstancedBufferAttribute }
type LinkedOverlay = { mesh: THREE.InstancedMesh; batch: OverlayBatch }

// Whole buffers go up every frame: the largest is under 3 KB, and an update
// range costs three a fresh range object, sort closure, and sort buffer per
// attribute per frame, which was the scene's biggest source of garbage.
function upload(attribute: THREE.BufferAttribute): void {
  attribute.needsUpdate = true
}

/** A chunky, friendly pointing glove drawn once into a texture: white with a soft blue outline, fingertip at the top left. */
function handTexture(): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')!
  g.lineJoin = 'round'
  g.lineCap = 'round'
  const outline = () => {
    g.beginPath()
    // index finger reaching up and left
    g.moveTo(58, 44)
    g.quadraticCurveTo(48, 26, 64, 20)
    g.quadraticCurveTo(80, 16, 90, 34)
    g.lineTo(130, 104)
    // curled fingers along the top of the fist
    g.quadraticCurveTo(152, 92, 166, 108)
    g.quadraticCurveTo(186, 100, 198, 120)
    g.quadraticCurveTo(220, 118, 224, 142)
    g.quadraticCurveTo(236, 176, 214, 204)
    g.quadraticCurveTo(190, 236, 150, 232)
    g.quadraticCurveTo(116, 230, 98, 206)
    // thumb tucked along the bottom
    g.quadraticCurveTo(76, 186, 86, 166)
    g.quadraticCurveTo(96, 150, 114, 150)
    g.lineTo(58, 44)
    g.closePath()
  }
  g.shadowColor = 'rgba(40, 70, 130, 0.35)'
  g.shadowBlur = 10
  g.shadowOffsetY = 5
  outline()
  g.fillStyle = PALETTE.hand
  g.fill()
  g.shadowColor = 'transparent'
  g.lineWidth = 9
  g.strokeStyle = PALETTE.handEdge
  outline()
  g.stroke()
  g.lineWidth = 5
  g.strokeStyle = 'rgba(91, 143, 217, 0.55)'
  for (const [x0, y0, x1, y1] of [
    [160, 112, 150, 140],
    [194, 124, 184, 150],
  ]) {
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export class WorkshopScene {
  readonly root = new THREE.Group()
  readonly overlay: THREE.Mesh
  private readonly linked: Linked[] = []
  private readonly shadows: LinkedOverlay
  private readonly glows: LinkedOverlay
  private readonly shapes: Record<BatchKey, THREE.BufferGeometry>
  private readonly bench: THREE.Mesh
  private readonly turntable: THREE.Mesh
  private readonly ghost: THREE.Mesh
  private readonly hand: THREE.Sprite
  private readonly handMaterial: THREE.SpriteMaterial
  private readonly overlayGeometry: THREE.BufferGeometry
  private readonly plane = new THREE.PlaneGeometry(1, 1)

  constructor(
    rig: Rig,
    private readonly materials: ClayMaterials,
  ) {
    this.shapes = buildPartShapes()
    this.bench = new THREE.Mesh(buildBench(), materials.props)
    this.bench.matrixAutoUpdate = false
    this.root.add(this.bench)
    this.turntable = new THREE.Mesh(buildTurntableTop(), materials.props)
    this.turntable.position.set(TURNTABLE.x, 0, TURNTABLE.z)
    this.root.add(this.turntable)

    for (const key of BATCH_KEYS) {
      const batch = rig.batches[key]
      const geometry = this.shapes[key]
      const mesh = new THREE.InstancedMesh(geometry, materials.critters, batch.capacity)
      mesh.instanceMatrix = new THREE.InstancedBufferAttribute(batch.matrices, 16).setUsage(THREE.DynamicDrawUsage)
      mesh.instanceColor = new THREE.InstancedBufferAttribute(batch.colors, 3).setUsage(THREE.DynamicDrawUsage)
      const boil = new THREE.InstancedBufferAttribute(batch.boil, 2).setUsage(THREE.DynamicDrawUsage)
      geometry.setAttribute('boil', boil)
      mesh.count = 0
      mesh.frustumCulled = false
      mesh.matrixAutoUpdate = false
      this.root.add(mesh)
      this.linked.push({ mesh, batch, boil })
    }

    this.shadows = this.overlayMesh(rig.shadows, materials.shadow, RENDER_ORDER.shadows)
    this.glows = this.overlayMesh(rig.glows, materials.glow, RENDER_ORDER.glows)

    this.ghost = new THREE.Mesh(this.shapes.legStub, materials.ghost)
    this.ghost.matrixAutoUpdate = false
    this.ghost.renderOrder = RENDER_ORDER.ghost
    this.ghost.visible = false
    this.ghost.frustumCulled = false
    this.root.add(this.ghost)

    this.handMaterial = new THREE.SpriteMaterial({ map: handTexture(), transparent: true, depthTest: false, depthWrite: false, toneMapped: false })
    this.hand = new THREE.Sprite(this.handMaterial)
    this.hand.center.set(58 / 256, 1 - 24 / 256)
    this.hand.renderOrder = RENDER_ORDER.hand
    this.hand.visible = false
    this.hand.frustumCulled = false
    this.root.add(this.hand)

    this.overlayGeometry = new THREE.BufferGeometry()
    this.overlayGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    this.overlay = new THREE.Mesh(this.overlayGeometry, materials.overlay)
    this.overlay.frustumCulled = false
    this.overlay.renderOrder = RENDER_ORDER.overlay
    this.overlay.matrixAutoUpdate = false
    this.root.add(this.overlay)
  }

  private overlayMesh(batch: OverlayBatch, material: THREE.Material, renderOrder: number): LinkedOverlay {
    const mesh = new THREE.InstancedMesh(this.plane, material, batch.capacity)
    mesh.instanceMatrix = new THREE.InstancedBufferAttribute(batch.matrices, 16).setUsage(THREE.DynamicDrawUsage)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(batch.params, 3).setUsage(THREE.DynamicDrawUsage)
    mesh.count = 0
    mesh.frustumCulled = false
    mesh.matrixAutoUpdate = false
    mesh.renderOrder = renderOrder
    this.root.add(mesh)
    return { mesh, batch }
  }

  /** Hand this frame's layout to the GPU. */
  sync(controller: WorkshopController): void {
    for (const { mesh, batch, boil } of this.linked) this.uploadBatch(mesh, batch.count, boil)
    this.uploadBatch(this.shadows.mesh, this.shadows.batch.count, null)
    this.uploadBatch(this.glows.mesh, this.glows.batch.count, null)
    this.turntable.rotation.y = controller.turntableAngle

    const guidance = controller.guidance
    const hand = guidance.hand
    this.hand.visible = hand !== null && hand.opacity > 0.01
    if (hand) {
      this.hand.position.set(hand.x, hand.y, hand.z)
      const scale = 13 * (1 - 0.1 * hand.press)
      this.hand.scale.set(scale, scale, 1)
      this.handMaterial.opacity = hand.opacity
    }
    const ghost = guidance.ghost
    this.ghost.visible = ghost !== null && hand !== null
    if (ghost && hand) {
      this.ghost.geometry = this.shapes[ghost]
      this.ghost.matrix.copy(controller.ghostMatrix)
      this.ghost.matrixWorldNeedsUpdate = true
      this.materials.ghost.color.copy(GHOST_COLORS[guidance.ghostHue])
      this.materials.ghost.opacity = 0.8 * hand.opacity
    }
  }

  private uploadBatch(mesh: THREE.InstancedMesh, count: number, boil: THREE.InstancedBufferAttribute | null): void {
    mesh.count = count
    mesh.visible = count > 0
    if (count === 0) return
    upload(mesh.instanceMatrix)
    if (mesh.instanceColor) upload(mesh.instanceColor)
    if (boil) upload(boil)
  }

  setOverlay(on: boolean): void {
    this.overlay.visible = on
  }

  dispose(): void {
    for (const geometry of Object.values(this.shapes)) geometry.dispose()
    this.bench.geometry.dispose()
    this.turntable.geometry.dispose()
    this.plane.dispose()
    this.overlayGeometry.dispose()
    this.handMaterial.map?.dispose()
    this.handMaterial.dispose()
    for (const { mesh } of this.linked) mesh.dispose()
    this.shadows.mesh.dispose()
    this.glows.mesh.dispose()
  }
}
