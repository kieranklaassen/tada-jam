import * as THREE from 'three'
import type { VehicleDef, VehicleId } from '../roster'
import type { Surface } from '../surface'
import type { Particles } from '../fx'
import type { Hand } from '../surface'
import type { ToolSpot } from '../play'
import { makeKit, type EnamelKit } from './enamel'
import { FxView } from './fxView'
import { Picker } from './pick'
import { ToolsView } from './tools'
import { Stage } from './stage'
import type { TruckPose } from '../pose'
import { TruckView } from './truck'

// Everything drawn: one renderer on the Mount's canvas, the bay, and a view
// per vehicle of the roster, of which two are on stage at a time. It shows
// what it is given and decides nothing.

export type Tiering = {
  /** The wet floor gives back a copy of each vehicle. */
  reflections: boolean
  /** How many of the small flying things are drawn. */
  particles: number
}

export class WashView {
  readonly renderer: THREE.WebGLRenderer
  readonly stage: Stage
  private readonly kit: EnamelKit
  private readonly trucks = new Map<VehicleId, TruckView>()
  private reflections = true
  private particleLimit = 260
  readonly picker: Picker
  private readonly fx = new FxView()
  private readonly toolsView: ToolsView

  constructor(canvas: HTMLCanvasElement, roster: readonly VehicleDef[]) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    // Colours are authored as shown.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    this.renderer.setClearColor(new THREE.Color(0.1, 0.12, 0.14))
    this.kit = makeKit()
    this.stage = new Stage(this.kit)
    this.picker = new Picker(this.stage.camera)
    this.toolsView = new ToolsView(this.stage.tools, this.stage.scene)
    this.stage.scene.add(this.fx.mesh)
    // Built once, at mount: every vehicle and its copy, hidden until it is on stage.
    for (const def of roster) {
      const truck = new TruckView(this.kit, def, true)
      truck.root.visible = false
      truck.mirror.visible = false
      this.stage.scene.add(truck.root, truck.mirror)
      this.trucks.set(def.id, truck)
    }
  }

  truck(id: VehicleId): TruckView {
    return this.trucks.get(id)!
  }

  /** Which vehicles are on stage. */
  show(ids: readonly VehicleId[]): void {
    for (const [id, truck] of this.trucks) {
      truck.root.visible = ids.includes(id)
      truck.mirror.visible = truck.root.visible && this.reflections
    }
  }

  setSurface(id: VehicleId, surface: Surface, instant = false): void {
    this.truck(id).setSurface(surface, instant)
  }

  setTier(tier: Tiering): void {
    this.reflections = tier.reflections
    this.particleLimit = tier.particles
    for (const truck of this.trucks.values()) truck.mirror.visible = truck.root.visible && this.reflections
  }

  resize(width: number, height: number, ratio: number): void {
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.stage.fit(width, height)
  }

  update(dt: number, seconds: number, poses: ReadonlyMap<VehicleId, TruckPose>, particles: Particles, hand: Hand, spot: ToolSpot): void {
    for (const [id, pose] of poses) this.truck(id).update(dt, pose)
    this.fx.update(particles, this.particleLimit)
    this.toolsView.update(dt, seconds, hand, spot)
  }

  render(): void {
    this.renderer.render(this.stage.scene, this.stage.camera)
  }

  get counts(): { drawCalls: number; triangles: number } {
    return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  dispose(): void {
    for (const truck of this.trucks.values()) truck.dispose()
    this.fx.dispose()
    this.toolsView.dispose()
    this.stage.dispose()
    this.kit.dispose()
    this.renderer.dispose()
  }
}
