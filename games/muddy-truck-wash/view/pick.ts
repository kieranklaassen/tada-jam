import * as THREE from 'three'
import type { Target } from '../play'
import { LAYOUT, TOOL_HOME, TOOL_MIDDLE } from '../props'
import type { VehicleDef } from '../roster'
import { patchAt } from '../silhouette'
import { GRID_H, GRID_W, cellAt, type Surface, type Tool } from '../surface'

// What a finger is on. Generous on purpose: a tool answers within a wide
// circle, and a touch just off the vehicle's edge counts as its nearest patch
// (pack: game-design, ages-2-to-4.md).

/** A tool answers a touch within this many logical pixels of its middle, so its target is at least 120 across. */
const TOOL_REACH = 62
/** The vehicle's side is tried at these depths, nearest first, so a touch on its nose or roof finds a patch too. */
const DEPTHS = [0.92, 0.45, 0, -0.45, -0.92]

export type Standing = { def: VehicleDef; x: number; z: number; surface: Surface }

export class Picker {
  private readonly ray = new THREE.Raycaster()
  private readonly ndc = new THREE.Vector2()
  private readonly point = new THREE.Vector3()
  private readonly box = new THREE.Box3()

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  /** Where a world point is on the surface, in logical pixels. */
  project(x: number, y: number, z: number, width: number, height: number): { x: number; y: number } {
    this.point.set(x, y, z).project(this.camera)
    return { x: (this.point.x * 0.5 + 0.5) * width, y: (0.5 - this.point.y * 0.5) * height }
  }

  pick(px: number, py: number, width: number, height: number, bay: Standing | null, next: Standing | null): Target {
    for (const tool of ['sponge', 'hose', 'cloth'] as Tool[]) {
      const home = TOOL_HOME[tool], mid = TOOL_MIDDLE[tool]
      const at = this.project(home[0] + mid[0], home[1] + mid[1], home[2] + mid[2], width, height)
      if (Math.hypot(at.x - px, at.y - py) <= TOOL_REACH) return { kind: 'tool', tool }
    }
    this.ndc.set((px / width) * 2 - 1, 1 - (py / height) * 2)
    this.ray.setFromCamera(this.ndc, this.camera)
    const o = this.ray.ray.origin, d = this.ray.ray.direction
    if (bay) {
      let near: { col: number; row: number; x: number; y: number } | null = null
      for (const depth of DEPTHS) {
        const t = (bay.z + depth - o.z) / d.z
        if (!(t > 0)) continue
        const x = o.x + d.x * t - bay.x, y = o.y + d.y * t
        const patch = patchAt(bay.def, x, y)
        if (patch && bay.surface[cellAt(patch.col, patch.row)] !== '.') return { kind: 'truck', ...patch, x, y }
        if (depth === DEPTHS[0]) near = this.nearest(bay, x, y)
      }
      if (near) return { kind: 'truck', ...near }
    }
    if (next) {
      const side = next.def.side
      this.box.min.set(next.x + side.x0, 0, next.z - 0.95)
      this.box.max.set(next.x + side.x1, side.y1, next.z + 0.95)
      if (this.ray.ray.intersectsBox(this.box)) return { kind: 'next' }
    }
    if (d.y < 0) {
      const t = -o.y / d.y, x = o.x + d.x * t, z = o.z + d.z * t
      const p = LAYOUT.puddle
      if (Math.hypot((x - p.x) / (p.rx * 1.3), (z - p.z) / (p.rz * 1.5)) <= 1) return { kind: 'puddle' }
    }
    return { kind: 'none' }
  }

  /** A touch just off the body takes the patch of body beside it, when there is one within a patch. */
  private nearest(bay: Standing, x: number, y: number): { col: number; row: number; x: number; y: number } | null {
    const side = bay.def.side
    const fc = ((x - side.x0) / (side.x1 - side.x0)) * GRID_W, fr = ((y - side.y0) / (side.y1 - side.y0)) * GRID_H
    let best: { col: number; row: number } | null = null, least = 1.3
    for (let row = Math.max(0, Math.floor(fr) - 1); row <= Math.min(GRID_H - 1, Math.floor(fr) + 1); row++) {
      for (let col = Math.max(0, Math.floor(fc) - 1); col <= Math.min(GRID_W - 1, Math.floor(fc) + 1); col++) {
        if (bay.surface[cellAt(col, row)] === '.') continue
        const gap = Math.hypot(col + 0.5 - fc, row + 0.5 - fr)
        if (gap < least) { least = gap; best = { col, row } }
      }
    }
    return best ? { ...best, x, y } : null
  }
}
