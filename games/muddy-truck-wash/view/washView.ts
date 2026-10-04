import * as THREE from 'three'
import type { VehicleDef, VehicleId } from '../roster'
import type { Surface } from '../surface'
import type { Particles } from '../fx'
import type { Hint } from '../guide'
import { MAT, Shape } from '../shapes'
import { enamelMaterial } from './enamel'
import { toGeometry } from './geometry'
import type { Hand, Tool } from '../surface'
import { TOOL_MIDDLE } from '../props'
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
  /** The two in the queue have lumps of mud standing out from them. */
  queueLumps: boolean
}

export class WashView {
  readonly renderer: THREE.WebGLRenderer
  readonly stage: Stage
  private readonly kit: EnamelKit
  private readonly trucks = new Map<VehicleId, TruckView>()
  private reflections = true
  private queueLumps = true
  readonly picker: Picker
  private readonly fx = new FxView()
  private readonly toolsView: ToolsView
  private readonly hand: THREE.Mesh
  private readonly held: Record<Tool, THREE.Mesh>

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
    // What the ghost hand holds: a pale copy of the tool the child has in hand, drawn from that tool's own shape.
    const heldMaterial = enamelMaterial(this.kit, {})
    heldMaterial.transparent = true
    heldMaterial.depthTest = false
    const held = (tool: Tool): THREE.Mesh => {
      const mesh = new THREE.Mesh(this.stage.tools[tool].geometry, heldMaterial)
      mesh.name = `ghost-${tool}`
      mesh.renderOrder = 7
      mesh.visible = false
      this.stage.scene.add(mesh)
      return mesh
    }
    this.held = { sponge: held('sponge'), hose: held('hose'), cloth: held('cloth') }
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

  /** Where a tool is drawn just now: its middle, in the world. */
  toolAt(tool: Tool): { x: number; y: number; z: number } {
    const at = this.stage.tools[tool].position, middle = TOOL_MIDDLE[tool]
    return { x: at.x + middle[0], y: at.y + middle[1], z: at.z + middle[2] }
  }

  /** Which vehicles are on stage. */
  show(ids: readonly VehicleId[]): void {
    for (const [id, truck] of this.trucks) {
      truck.root.visible = ids.includes(id)
      truck.mirror.visible = truck.root.visible && this.reflections
    }
  }

  /** `from` is the patch a change spreads out from, or -1. */
  setSurface(id: VehicleId, surface: Surface, instant = false, from = -1): void {
    this.truck(id).setSurface(surface, instant, from)
  }

  setTier(tier: Tiering): void {
    this.reflections = tier.reflections
    this.queueLumps = tier.queueLumps
    for (const truck of this.trucks.values()) truck.mirror.visible = truck.root.visible && this.reflections
  }

  resize(width: number, height: number, ratio: number): void {
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.stage.fit(width, height)
  }

  /** `tap` is how far the tap has swung on its arm, in radians; `bits` is where the moving pieces of the place are. */
  update(dt: number, seconds: number, poses: ReadonlyMap<VehicleId, TruckPose>, particles: Particles, hand: Hand, spot: ToolSpot, hint: Hint, tap = 0, bits: { roller: number; pinwheel: number; shelf: number; lamp: number } | null = null, wears: 'foam' | 'mud' | null = null): void {
    this.stage.tap.rotation.z = tap
    if (bits) this.stage.place(bits.roller, bits.pinwheel, bits.shelf, bits.lamp)
    this.stage.tick(seconds)
    for (const [id, pose] of poses) {
      const truck = this.truck(id)
      truck.update(dt, pose)
      truck.mirror.visible = truck.root.visible && this.reflections && truck.onPad
      truck.showLumps(this.queueLumps || !truck.farBack)
    }
    // The idle glow breathes on the tools that hang on the rack: a light on them, with no move of theirs. The vehicles are
    // alive already and take no glow: on a body that size it reads as haze.
    const pulse = 0.55 + 0.45 * Math.sin(seconds * 3.2), glow = hint.glow * pulse
    for (const tool of ['sponge', 'hose', 'cloth'] as const) (this.stage.tools[tool].material as THREE.ShaderMaterial).uniforms.uGlow.value = hint.tools.includes(tool) ? glow : 0
    this.hand.visible = hint.hand !== null && hint.hand.opacity > 0.01
    for (const tool of ['sponge', 'hose', 'cloth'] as const) this.held[tool].visible = this.hand.visible && hint.hand?.holding === tool
    if (hint.hand) {
      // The hand hovers off the thing and comes down onto it as it presses.
      this.hand.position.set(hint.hand.x, hint.hand.y, hint.hand.z + 0.45 * (1 - hint.hand.press))
      ;(this.hand.material as THREE.ShaderMaterial).uniforms.uAlpha.value = hint.hand.opacity * 0.9
      if (hint.hand.holding) {
        // Its middle is under the fingertip, a little behind it, so the finger lies on the tool.
        const mesh = this.held[hint.hand.holding], middle = TOOL_MIDDLE[hint.hand.holding]
        mesh.position.set(this.hand.position.x - middle[0], this.hand.position.y - middle[1], this.hand.position.z - 0.12 - middle[2])
        ;(mesh.material as THREE.ShaderMaterial).uniforms.uAlpha.value = hint.hand.opacity * 0.6
      }
    }
    this.fx.update(particles)
    // What lies on the floor creeps to the drain and dries, on attended time.
    this.stage.marks.step(dt)
    this.toolsView.update(dt, seconds, hand, spot, wears)
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
