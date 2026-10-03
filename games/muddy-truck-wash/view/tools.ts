import * as THREE from 'three'
import type { ToolSpot } from '../play'
import { TOOL_HANG, TOOL_HOME } from '../props'
import { Shape } from '../shapes'
import type { Hand, Tool } from '../surface'
import { toGeometry } from './geometry'

// The three tools: each hangs on the rack until it is taken, then goes where
// the hand is. Plain movers: a tool follows the finger and does its work, and
// has no life of its own.

/** Where a tool sits from the point it works on, and how fast it gets there. */
const IN_HAND: Readonly<Record<Tool, readonly [number, number, number]>> = { sponge: [0, 0, 0.21], cloth: [0, 0.44, 0.19], hose: [0.7, 0.62, 0.95] }
/** The lowest a tool's own origin goes, so none of it dips into the floor when a wheel is washed. */
const FLOOR: Readonly<Record<Tool, number>> = { sponge: 0.34, cloth: 1.08, hose: 0.9 }
const DOWN = new THREE.Vector3(0, -1, 0)
/** A depth clear of every vehicle's proudest part: a tool in hand crosses from one spot to another out here, never through the body. */
const CLEAR = 1.42
const TOOLS: readonly Tool[] = ['sponge', 'hose', 'cloth']

export class ToolsView {
  private readonly jet: THREE.Mesh
  private readonly jetMaterial: THREE.MeshBasicMaterial
  private readonly aim = new THREE.Vector3()
  private readonly want = new THREE.Vector3()
  private readonly turn = new THREE.Quaternion()

  constructor(private readonly tools: Record<Tool, THREE.Mesh>, scene: THREE.Scene) {
    // The jet of the hose: a thin cone from the nozzle to where it lands, one unit long before it is stretched.
    const geometry = toGeometry(new Shape().round(0.03, 1, [1, 1, 1], { at: [0, -0.5, 0] }, { axis: 'y', r2: 0.085, segs: 8, bevel: 0.005 }))
    this.jetMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.82, 0.94, 1), transparent: true, opacity: 0.78, depthWrite: false })
    this.jet = new THREE.Mesh(geometry, this.jetMaterial)
    this.jet.name = 'jet'
    this.jet.visible = false
    this.jet.renderOrder = 4
    scene.add(this.jet)
    for (const tool of TOOLS) {
      tools[tool].position.set(...TOOL_HOME[tool])
      tools[tool].rotation.z = TOOL_HANG[tool]
    }
  }

  update(dt: number, seconds: number, hand: Hand, spot: ToolSpot): void {
    this.jet.visible = false
    for (const tool of TOOLS) {
      const mesh = this.tools[tool]
      const held = hand === tool
      const home = TOOL_HOME[tool], off = IN_HAND[tool]
      if (held) this.want.set(spot.x + off[0], Math.max(FLOOR[tool], spot.y + off[1]), spot.z + off[2])
      else this.want.set(home[0], home[1], home[2])
      if (tool === 'hose') {
        // The nozzle hangs inside its coil: it leaves and comes home along the coil's axis, toward the child, never across the hose.
        const off = Math.hypot(mesh.position.x - home[0], mesh.position.y - home[1])
        if (held && off < 0.6 && mesh.position.z < home[2] + 0.6) this.want.set(mesh.position.x, mesh.position.y, home[2] + 0.9)
        else if (!held && off > 0.1) this.want.z = home[2] + 0.9
      }
      if (held && tool !== 'hose') {
        // From one spot to a far one the tool first comes off the paint, crosses clear of the body, and goes down onto the new spot.
        const across = Math.hypot(this.want.x - mesh.position.x, this.want.y - mesh.position.y)
        if (across > 0.4 && this.want.z < CLEAR + off[2]) {
          if (mesh.position.z < CLEAR + off[2] - 0.1) this.want.set(mesh.position.x, mesh.position.y, CLEAR + off[2] + 0.05)
          else this.want.z = CLEAR + off[2]
        }
      }
      // Quick to the finger, slower back to the rack.
      mesh.position.lerp(this.want, 1 - Math.exp(-dt * (held && spot.working ? 26 : 9)))
      const work = held && spot.working ? 1 : 0
      if (tool === 'hose') {
        if (held) {
          // The nozzle points at where it works.
          this.aim.set(spot.x - mesh.position.x, spot.y - mesh.position.y, spot.z - mesh.position.z).normalize()
          this.turn.setFromUnitVectors(DOWN, this.aim)
        } else this.turn.setFromAxisAngle(this.aim.set(0, 0, 1), TOOL_HANG.hose)
        mesh.quaternion.slerp(this.turn, 1 - Math.exp(-dt * 16))
        if (work) {
          const tip = this.aim.set(0, -0.52, 0).applyQuaternion(mesh.quaternion).add(mesh.position)
          const length = Math.hypot(spot.x - tip.x, spot.y - tip.y, spot.z - tip.z)
          this.jet.visible = true
          this.jet.position.copy(tip)
          this.jet.quaternion.copy(mesh.quaternion)
          this.jet.scale.set(1 + 0.25 * Math.sin(seconds * 47), length, 1 + 0.25 * Math.cos(seconds * 53))
        }
      } else {
        // A rub wiggles the sponge and the cloth; the sponge is pressed flat against the paint.
        mesh.rotation.z = work * Math.sin(seconds * 22) * (tool === 'cloth' ? 0.22 : 0.12)
        const flat = tool === 'sponge' ? work * (0.28 + 0.08 * Math.sin(seconds * 30)) : 0
        mesh.scale.set(1 + flat * 0.4, 1 + flat * 0.25, 1 - flat)
      }
    }
  }

  dispose(): void {
    this.jet.geometry.dispose()
    this.jetMaterial.dispose()
  }
}
