import * as THREE from 'three'
import type { VehicleDef, VehicleId } from '../roster'
import type { Surface } from '../surface'
import type { Particles } from '../fx'
import type { Hint } from '../guide'
import { MAT, Shape } from '../shapes'
import { enamelMaterial } from './enamel'
import { toGeometry } from './geometry'
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
  private readonly hand: THREE.Mesh

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
    // The ghost hand: a pale mitten whose fingertip is its origin. It is drawn over everything and shows through.
    const mitten = new Shape()
    const pale: [number, number, number] = [1, 0.97, 0.9]
    // It reaches in from the lower right, from the open floor, so it never lies on the thing below the one it shows.
    mitten.round(0.1, 0.55, pale, { at: [0.19, -0.19, 0.05], turn: { axis: 'z', by: 0.785 } }, { axis: 'y', mat: MAT.soft, segs: 12, bevel: 0.05 })
    mitten.ball(0.3, pale, { at: [0.55, -0.52, 0.1] }, { mat: MAT.soft, segs: 14, squash: [1.05, 1.05, 0.6] })
    mitten.round(0.09, 0.3, pale, { at: [0.3, -0.62, 0.1], turn: { axis: 'z', by: 1.5 } }, { axis: 'y', mat: MAT.soft, segs: 10, bevel: 0.04 })
    const handMaterial = enamelMaterial(this.kit, {})
    handMaterial.transparent = true
    handMaterial.depthTest = false
    this.hand = new THREE.Mesh(toGeometry(mitten), handMaterial)
    this.hand.name = 'ghost-hand'
    this.hand.renderOrder = 8
    this.hand.visible = false
    this.stage.scene.add(this.hand)
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

  isShown(id: VehicleId): boolean {
    return this.truck(id).root.visible
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

  update(dt: number, seconds: number, poses: ReadonlyMap<VehicleId, TruckPose>, particles: Particles, hand: Hand, spot: ToolSpot, hint: Hint): void {
    for (const [id, pose] of poses) this.truck(id).update(dt, pose)
    // The idle glow breathes on the tools that hang on the rack, and they swell a little with it. The vehicles are
    // alive already and take no glow: on a body that size it reads as haze.
    const pulse = 0.55 + 0.45 * Math.sin(seconds * 3.2), glow = hint.glow * pulse
    for (const tool of ['sponge', 'hose', 'cloth'] as const) (this.stage.tools[tool].material as THREE.ShaderMaterial).uniforms.uGlow.value = hint.tools.includes(tool) ? glow : 0
    this.hand.visible = hint.hand !== null && hint.hand.opacity > 0.01
    if (hint.hand) {
      // The hand hovers off the thing and comes down onto it as it presses.
      this.hand.position.set(hint.hand.x, hint.hand.y, hint.hand.z + 0.45 * (1 - hint.hand.press))
      ;(this.hand.material as THREE.ShaderMaterial).uniforms.uAlpha.value = hint.hand.opacity * 0.9
    }
    this.fx.update(particles, this.particleLimit)
    // What lies on the floor creeps to the drain and dries, on attended time.
    this.stage.marks.step(dt)
    this.toolsView.update(dt, seconds, hand, spot, hint.tools, glow)
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
    this.hand.geometry.dispose()
    ;(this.hand.material as THREE.Material).dispose()
    this.toolsView.dispose()
    this.stage.dispose()
    this.kit.dispose()
    this.renderer.dispose()
  }
}
