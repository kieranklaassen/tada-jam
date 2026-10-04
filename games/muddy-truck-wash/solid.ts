import { PAINT, built, type VehicleDef, type VehicleId } from './roster'
import { MAT, Shape } from './shapes'

// A vehicle as the triangles it is drawn from, at rest, in its own space:
// its body, its moving part and its wheels. A finger's ray is tried against
// them, so a touch is on the vehicle exactly where the vehicle is drawn, and
// nowhere else. Pure: no renderer; built once a vehicle.

export type Solid = {
  /** Nine numbers a triangle. */
  triangles: Float32Array
  min: readonly [number, number, number]
  max: readonly [number, number, number]
}

const solids = new Map<VehicleId, Solid>()

export function solidOf(def: VehicleDef): Solid {
  const known = solids.get(def.id)
  if (known) return known
  const shapes = built(def)
  const wheels = new Shape()
  // A tyre with its tread, as wide and as round as it is drawn.
  for (const wheel of def.wheels) for (const side of [1, -1]) wheels.round(wheel.r * 1.09, wheel.w * 1.04, PAINT.rubber, { at: [wheel.x, wheel.r, side * wheel.z] }, { axis: 'z', mat: MAT.rubber, segs: 16, bevel: 0.02 })
  const triangles = Float32Array.from([...shapes.body.position, ...shapes.part.position, ...wheels.position])
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < triangles.length; i += 3) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], triangles[i + k])
    max[k] = Math.max(max[k], triangles[i + k])
  }
  const solid = { triangles, min, max }
  solids.set(def.id, solid)
  return solid
}

/**
 * Where a ray first meets a solid: how far along the ray, and the point, in the solid's own space. Null when it
 * misses. The ray is given in that space: where it starts and the way it goes.
 */
export function rayMeets(solid: Solid, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): { t: number; x: number; y: number; z: number } | null {
  // The box round everything first: most rays miss it.
  let near = 0, far = Infinity
  const o = [ox, oy, oz], d = [dx, dy, dz]
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-12) {
      if (o[k] < solid.min[k] || o[k] > solid.max[k]) return null
      continue
    }
    const a = (solid.min[k] - o[k]) / d[k], b = (solid.max[k] - o[k]) / d[k]
    near = Math.max(near, Math.min(a, b))
    far = Math.min(far, Math.max(a, b))
    if (near > far) return null
  }
  const p = solid.triangles
  let best = Infinity
  for (let i = 0; i < p.length; i += 9) {
    const e1x = p[i + 3] - p[i], e1y = p[i + 4] - p[i + 1], e1z = p[i + 5] - p[i + 2]
    const e2x = p[i + 6] - p[i], e2y = p[i + 7] - p[i + 1], e2z = p[i + 8] - p[i + 2]
    const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x
    const det = e1x * hx + e1y * hy + e1z * hz
    if (det > -1e-10 && det < 1e-10) continue
    const inv = 1 / det
    const sx = ox - p[i], sy = oy - p[i + 1], sz = oz - p[i + 2]
    const u = (sx * hx + sy * hy + sz * hz) * inv
    if (u < 0 || u > 1) continue
    const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x
    const v = (dx * qx + dy * qy + dz * qz) * inv
    if (v < 0 || u + v > 1) continue
    const t = (e2x * qx + e2y * qy + e2z * qz) * inv
    if (t > 1e-6 && t < best) best = t
  }
  return best < Infinity ? { t: best, x: ox + dx * best, y: oy + dy * best, z: oz + dz * best } : null
}
