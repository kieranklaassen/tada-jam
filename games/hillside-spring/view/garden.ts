import * as THREE from 'three'
import type { GardenController } from '../controller'
import type { QualitySettings } from '../quality'
import { CreaturesView } from './creatures'
import { FxView } from './fx'
import { Grade } from './grade'
import { shared } from './materials'
import { paintAtlas, paintFlow, paintHand, paintPaper, paintSky } from './paint'
import { PiecesView } from './pieces'
import { PlotsView } from './plots'
import { Projector } from './projector'
import { buildScenery, sceneFog, type Scenery } from './scenery'
import { WaterView } from './water'
import { fitCamera } from './world'

// Owns the WebGL renderer and every mesh. The frame loop lives in the
// Mount; each frame the view reads the garden's state and draws it.

/** The sky-foot colour behind everything, also shown while the garden loads. */
export const BACKDROP = '#bcd7e0'

export class GardenView {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(27, 1, 1, 100)
  readonly projector: Projector
  private readonly atlas: THREE.CanvasTexture
  private readonly sky: THREE.CanvasTexture
  private readonly flowTexture: THREE.CanvasTexture
  private readonly scenery: Scenery
  private readonly pieces: PiecesView
  private readonly water: WaterView
  private readonly plots: PlotsView
  private readonly creatures: CreaturesView
  private readonly fx: FxView
  private readonly grade: Grade
  private width = 1
  private height = 1
  private last = -1

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' })
    this.renderer.setClearColor(BACKDROP)
    this.atlas = paintAtlas()
    this.sky = paintSky()
    this.flowTexture = paintFlow()
    this.scene.fog = sceneFog()
    this.scenery = buildScenery(this.atlas, this.sky, shared.time)
    this.scene.add(this.scenery.group)
    this.projector = new Projector(this.camera)
    this.plots = new PlotsView(this.atlas, this.flowTexture)
    this.scene.add(this.plots.group)
    this.pieces = new PiecesView(this.atlas, this.projector)
    this.scene.add(this.pieces.group)
    this.water = new WaterView(this.flowTexture)
    this.scene.add(this.water.group)
    this.creatures = new CreaturesView(this.projector)
    this.scene.add(this.creatures.group)
    this.fx = new FxView(this.atlas, paintHand())
    this.scene.add(this.fx.group)
    this.grade = new Grade(paintPaper())
    this.scene.add(this.grade.mesh)
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.renderer.setSize(width, height, false)
    fitCamera(this.camera, width, height)
    this.projector.resize(width, height)
    this.grade.resize(width, height)
    this.fx.resize(this.camera, height * this.renderer.getPixelRatio())
    this.scenery.sky.material.uniforms.uScale.value = (width / height) * (this.sky.image.height / this.sky.image.width)
  }

  applyTier(tier: QualitySettings): void {
    this.renderer.setPixelRatio(Math.min(tier.dpr, window.devicePixelRatio || 1))
    this.renderer.setSize(this.width, this.height, false)
    this.fx.resize(this.camera, this.height * this.renderer.getPixelRatio())
    this.fx.setParticles(tier.particles)
    this.scenery.showShafts(tier.shafts)
    shared.wind.value = tier.sway ? 1 : 0
  }

  frame(garden: GardenController): void {
    const t = garden.now
    const dt = this.last < 0 ? 0 : Math.min(0.05, Math.max(0, t - this.last))
    this.last = t
    shared.time.value = t
    this.scenery.sky.material.uniforms.uDrift.value = (t * 0.0015) % 1
    this.fx.beginFrame(garden, this.projector)
    this.plots.update(garden)
    this.pieces.update(garden, this.fx, this.fx.demo)
    this.creatures.update(garden, this.fx)
    this.water.update(garden)
    this.fx.update(garden, this.projector, this.water, dt)
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.pieces.dispose()
    this.water.dispose()
    this.plots.dispose()
    this.creatures.dispose()
    this.fx.dispose()
    this.grade.dispose()
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      mesh.geometry?.dispose()
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material?.dispose()
    })
    this.atlas.dispose()
    this.sky.dispose()
    this.flowTexture.dispose()
    this.renderer.dispose()
  }
}
