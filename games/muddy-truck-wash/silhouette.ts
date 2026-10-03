import type { VehicleDef } from './roster'
import { CELLS, GRID_H, GRID_W, type Surface } from './surface'

// Which patches of the grid a vehicle's side view covers: its body, its
// moving part at rest and its wheels, seen from the child's side. Pure.

const SAMPLES: readonly (readonly [number, number])[] = [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]
const cache = new Map<string, Surface>()
const reliefs = new Map<string, Float32Array>()

/** A clean, dull vehicle: `d` where there is body, `.` where there is none. */
export function silhouette(def: VehicleDef): Surface {
  const known = cache.get(def.id)
  if (known) return known.slice()
  const { x0, x1, y0, y1 } = def.side
  const built = def.build()
  const flat = [...built.body.position, ...built.part.position]
  const hits = new Uint8Array(CELLS * SAMPLES.length)
  // How far the near side stands out at each patch: the largest z of anything that covers it.
  const proud = new Float32Array(CELLS)
  const cw = (x1 - x0) / GRID_W, ch = (y1 - y0) / GRID_H
  const mark = (inside: (x: number, y: number) => boolean, lo: [number, number], hi: [number, number], z: number): void => {
    const c0 = Math.max(0, Math.floor((lo[0] - x0) / cw)), c1 = Math.min(GRID_W - 1, Math.floor((hi[0] - x0) / cw))
    const r0 = Math.max(0, Math.floor((lo[1] - y0) / ch)), r1 = Math.min(GRID_H - 1, Math.floor((hi[1] - y0) / ch))
    for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) SAMPLES.forEach(([u, v], i) => {
      const k = (row * GRID_W + col) * SAMPLES.length + i
      if ((!hits[k] || z > proud[row * GRID_W + col]) && inside(x0 + (col + u) * cw, y0 + (row + v) * ch)) {
        hits[k] = 1
        proud[row * GRID_W + col] = Math.max(proud[row * GRID_W + col], z)
      }
    })
  }
  for (let i = 0; i < flat.length; i += 9) {
    const ax = flat[i], ay = flat[i + 1], bx = flat[i + 3], by = flat[i + 4], cx = flat[i + 6], cy = flat[i + 7]
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
    if (Math.abs(area) < 1e-9) continue
    mark((x, y) => {
      const u = ((bx - x) * (cy - y) - (cx - x) * (by - y)) / area, v = ((cx - x) * (ay - y) - (ax - x) * (cy - y)) / area
      return u >= 0 && v >= 0 && u + v <= 1
    }, [Math.min(ax, bx, cx), Math.min(ay, by, cy)], [Math.max(ax, bx, cx), Math.max(ay, by, cy)], Math.max(flat[i + 2], flat[i + 5], flat[i + 8]))
  }
  for (const wheel of def.wheels) mark((x, y) => Math.hypot(x - wheel.x, y - wheel.r) <= wheel.r, [wheel.x - wheel.r, 0], [wheel.x + wheel.r, wheel.r * 2], wheel.z + wheel.w * 0.56)
  const surface: Surface = []
  for (let cell = 0; cell < CELLS; cell++) {
    let count = 0
    for (let i = 0; i < SAMPLES.length; i++) count += hits[cell * SAMPLES.length + i]
    // At least two of the five points, so a patch that is mostly air stays empty.
    surface.push(count >= 2 ? 'd' : '.')
  }
  cache.set(def.id, surface)
  reliefs.set(def.id, proud)
  return surface.slice()
}

/**
 * How far the vehicle's near side stands out around a patch, in its own z: a
 * wheel is prouder than a door. A tool works at this depth. It is the
 * proudest of the patch, the ring of patches about it and the two above, since
 * a sponge is wider than a patch and a cloth hangs from above it.
 */
export function reliefAt(def: VehicleDef, col: number, row: number): number {
  if (!reliefs.has(def.id)) silhouette(def)
  const proud = reliefs.get(def.id)!
  let most = 0
  for (let r = Math.max(0, row - 1); r <= Math.min(GRID_H - 1, row + 2); r++) for (let c = Math.max(0, col - 1); c <= Math.min(GRID_W - 1, col + 1); c++) most = Math.max(most, proud[r * GRID_W + c])
  return most || 0.92
}

/** The patch under a point of the vehicle's side, or null when the point is outside the grid. */
export function patchAt(def: VehicleDef, x: number, y: number): { col: number; row: number } | null {
  const { x0, x1, y0, y1 } = def.side
  const col = Math.floor(((x - x0) / (x1 - x0)) * GRID_W), row = Math.floor(((y - y0) / (y1 - y0)) * GRID_H)
  return col >= 0 && col < GRID_W && row >= 0 && row < GRID_H ? { col, row } : null
}

/** The middle of a patch, in the vehicle's x and y. */
export function patchCentre(def: VehicleDef, col: number, row: number): { x: number; y: number } {
  const { x0, x1, y0, y1 } = def.side
  return { x: x0 + ((col + 0.5) / GRID_W) * (x1 - x0), y: y0 + ((row + 0.5) / GRID_H) * (y1 - y0) }
}
