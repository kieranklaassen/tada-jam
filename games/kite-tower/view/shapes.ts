import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Vec2 } from '../pieces'
import { atlasUv, REGION_H, REGION_W } from './wood'

// Wooden geometry, built once. Every block is its outline with filleted
// corners, extruded with a small rounded bevel on both faces, so edges catch
// the light the way sanded beech does. Faces get grain windows from the
// atlas: the big faces and the edges that run along the grain get long
// grain, the cut ends get end grain, and the stain is paler on the bevels.

const MARGIN = 0.06
const RUN = REGION_W - 2 * MARGIN

export type SlabOptions = {
  bevel?: number
  segments?: number
  /** Extra darkening (0..1 multiplier) at a point, baked into wear.y. */
  shade?: (x: number, y: number, z: number) => number
  /** Where the windows start inside each region (units), for variety between parts. */
  offset?: Vec2
}

/**
 * Round every sharp corner of `outline`. `reach` gets, per output point, how
 * far that point may be inset before it passes its corner's centre: a corner
 * next to a short edge gets a tighter fillet than the bevel, and insetting
 * past it would fold the cap over itself.
 */
function fillet(outline: readonly Vec2[], radius: number, reach: number[] = []): Vec2[] {
  const n = outline.length
  const out: Vec2[] = []
  reach.length = 0
  for (let i = 0; i < n; i++) {
    const p = outline[i]
    const a = outline[(i - 1 + n) % n]
    const b = outline[(i + 1) % n]
    const d1x = a.x - p.x
    const d1y = a.y - p.y
    const d2x = b.x - p.x
    const d2y = b.y - p.y
    const l1 = Math.hypot(d1x, d1y)
    const l2 = Math.hypot(d2x, d2y)
    const u1 = { x: d1x / l1, y: d1y / l1 }
    const u2 = { x: d2x / l2, y: d2y / l2 }
    const cos = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y))
    const interior = Math.acos(cos)
    if (Math.PI - interior < (25 * Math.PI) / 180) {
      out.push(p)
      reach.push(Infinity)
      continue
    }
    const tangent = Math.min(radius / Math.tan(interior / 2), 0.45 * Math.min(l1, l2))
    const r = tangent * Math.tan(interior / 2)
    const bis = { x: u1.x + u2.x, y: u1.y + u2.y }
    const bl = Math.hypot(bis.x, bis.y)
    const center = { x: p.x + (bis.x / bl) * (r / Math.sin(interior / 2)), y: p.y + (bis.y / bl) * (r / Math.sin(interior / 2)) }
    const t1 = { x: p.x + u1.x * tangent, y: p.y + u1.y * tangent }
    const t2 = { x: p.x + u2.x * tangent, y: p.y + u2.y * tangent }
    let a1 = Math.atan2(t1.y - center.y, t1.x - center.x)
    let a2 = Math.atan2(t2.y - center.y, t2.x - center.x)
    let sweep = a2 - a1
    while (sweep > Math.PI) sweep -= Math.PI * 2
    while (sweep < -Math.PI) sweep += Math.PI * 2
    const steps = 3
    for (let k = 0; k <= steps; k++) {
      const angle = a1 + (sweep * k) / steps
      out.push({ x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r })
      reach.push(r)
    }
    a1 = a2
  }
  return out
}

function signedArea(poly: readonly Vec2[]): number {
  let sum = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

class Builder {
  positions: number[] = []
  normals: number[] = []
  uvs: number[] = []
  wear: number[] = []
  indices: number[] = []
  private uv: [number, number] = [0, 0]

  vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, long: boolean, u: number, v: number, edge: number, shade: number): number {
    const index = this.positions.length / 3
    this.positions.push(x, y, z)
    this.normals.push(nx, ny, nz)
    atlasUv(long, u, v, this.uv)
    this.uvs.push(this.uv[0], this.uv[1])
    this.wear.push(edge, shade)
    return index
  }

  geometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2))
    geometry.setAttribute('wear', new THREE.Float32BufferAttribute(this.wear, 2))
    geometry.setIndex(this.indices)
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()
    return geometry
  }
}

function ringNormals(ring: readonly Vec2[]): Vec2[] {
  const n = ring.length
  const normals: Vec2[] = []
  for (let i = 0; i < n; i++) {
    const a = ring[(i - 1 + n) % n]
    const p = ring[i]
    const b = ring[(i + 1) % n]
    const e1 = { x: p.x - a.x, y: p.y - a.y }
    const e2 = { x: b.x - p.x, y: b.y - p.y }
    const l1 = Math.hypot(e1.x, e1.y) || 1
    const l2 = Math.hypot(e2.x, e2.y) || 1
    const nx = e1.y / l1 + e2.y / l2
    const ny = -e1.x / l1 - e2.x / l2
    const l = Math.hypot(nx, ny) || 1
    normals.push({ x: nx / l, y: ny / l })
  }
  return normals
}

type SlabRing = { ring: Vec2[]; normals: Vec2[]; inset: number[] }

/** The filleted outline, its vertex normals, and how deep the bevel may cut in at each point. */
function slabRing(outline: readonly Vec2[], radius: number): SlabRing {
  const ccw = signedArea(outline) >= 0 ? outline : [...outline].reverse()
  const reach: number[] = []
  const ring = fillet(ccw, radius, reach)
  return { ring, normals: ringNormals(ring), inset: reach.map((r) => Math.min(radius, r * 0.95)) }
}

/** The flat cap of a slab: its outline filleted and inset by the bevel. */
export function slabCap(outline: readonly Vec2[], radius: number): Vec2[] {
  const { ring, normals, inset } = slabRing(outline, radius)
  return ring.map((p, i) => ({ x: p.x - normals[i].x * inset[i], y: p.y - normals[i].y * inset[i] }))
}

/**
 * A bevelled wooden slab: `outline` (counter-clockwise, x/y) extruded along z
 * by `depth`, centred on z = 0. `grain` is the axis the wood runs along.
 */
export function woodSlab(outline: readonly Vec2[], depth: number, grain: 'x' | 'y', options: SlabOptions = {}): THREE.BufferGeometry {
  const radius = options.bevel ?? 0.05
  const segments = options.segments ?? 3
  const shade = options.shade ?? (() => 1)
  const offset = options.offset ?? { x: 0, y: 0 }
  const { ring, normals, inset: depthAt } = slabRing(outline, radius)
  const n = ring.length

  // Profile rings from the back cap edge, round the back bevel, along the wall, round the front bevel.
  type Ring = { inset: number; z: number; nxy: number; nz: number; edge: number; w: number }
  const rings: Ring[] = []
  for (let j = 0; j <= segments; j++) {
    const phi = (Math.PI / 2) * (1 - j / segments)
    rings.push({ inset: radius * (1 - Math.cos(phi)), z: -depth / 2 + radius - radius * Math.sin(phi), nxy: Math.cos(phi), nz: -Math.sin(phi), edge: Math.sin(2 * phi), w: 0 })
  }
  for (let j = 0; j <= segments; j++) {
    const phi = (Math.PI / 2) * (j / segments)
    rings.push({ inset: radius * (1 - Math.cos(phi)), z: depth / 2 - radius + radius * Math.sin(phi), nxy: Math.cos(phi), nz: Math.sin(phi), edge: Math.sin(2 * phi), w: 0 })
  }
  for (let j = 1; j < rings.length; j++) {
    const a = rings[j - 1]
    const b = rings[j]
    b.w = a.w + Math.hypot(b.inset - a.inset, b.z - a.z)
  }
  // Across the grain a window cannot wrap (the atlas halves sit on top of each other), so very deep walls squeeze their rings a little.
  const across = REGION_H - 2 * MARGIN - offset.y
  const wallSqueeze = Math.min(1, across / Math.max(1e-6, rings[rings.length - 1].w))
  for (const r of rings) r.w *= wallSqueeze

  const b = new Builder()
  const along = grain === 'x' ? { x: 1, y: 0 } : { x: 0, y: 1 }
  let s = MARGIN + offset.x
  let runLong: boolean | null = null
  for (let i = 0; i < n; i++) {
    const p = ring[i]
    const q = ring[(i + 1) % n]
    const ex = q.x - p.x
    const ey = q.y - p.y
    const length = Math.hypot(ex, ey)
    if (length < 1e-6) continue
    const long = Math.abs((ex * along.x + ey * along.y) / length) >= 0.5
    if (long !== runLong || s + length > RUN) {
      s = MARGIN + (runLong === null ? offset.x : (s * 0.37 + 0.2) % Math.max(0.01, RUN - length - MARGIN))
      runLong = long
    }
    const corner = (k: number) => {
      const a = ring[(k - 1 + n) % n]
      const c = ring[(k + 1) % n]
      const t1 = Math.atan2(ring[k].y - a.y, ring[k].x - a.x)
      const t2 = Math.atan2(c.y - ring[k].y, c.x - ring[k].x)
      let turn = Math.abs(t2 - t1)
      if (turn > Math.PI) turn = Math.PI * 2 - turn
      return turn > 0.2 ? 0.55 : 0
    }
    const cols: number[][] = []
    for (const [k, point, su] of [
      [i, p, s],
      [(i + 1) % n, q, s + length],
    ] as [number, Vec2, number][]) {
      const nrm = normals[k]
      const bend = corner(k)
      const cut = depthAt[k] / radius
      const col: number[] = []
      for (const r of rings) {
        const x = point.x - nrm.x * r.inset * cut
        const y = point.y - nrm.y * r.inset * cut
        col.push(
          b.vertex(x, y, r.z, nrm.x * r.nxy, nrm.y * r.nxy, r.nz, long, su, MARGIN + offset.y + r.w, Math.max(r.edge, bend), shade(x, y, r.z)),
        )
      }
      cols.push(col)
    }
    const [A, B] = cols
    for (let j = 0; j < rings.length - 1; j++) {
      b.indices.push(A[j], B[j], B[j + 1], A[j], B[j + 1], A[j + 1])
    }
    s += length
  }

  // Caps: the inset outline, long grain running along the piece's grain axis.
  const inset = ring.map((p, i) => ({ x: p.x - normals[i].x * depthAt[i], y: p.y - normals[i].y * depthAt[i] }))
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of inset) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const capAcross = grain === 'x' ? maxY - minY : maxX - minX
  const capSqueeze = Math.min(1, (across - 0.2) / Math.max(1e-6, capAcross))
  const contour = inset.map((p) => new THREE.Vector2(p.x, p.y))
  const triangles = THREE.ShapeUtils.triangulateShape(contour, [])
  for (const side of [1, -1]) {
    const z = (side * depth) / 2
    const base = b.positions.length / 3
    for (const p of inset) {
      const lx = p.x - minX
      const ly = p.y - minY
      const u = grain === 'x' ? lx : ly
      const v = (grain === 'x' ? ly : lx) * capSqueeze
      b.vertex(p.x, p.y, z, 0, 0, side, true, MARGIN + offset.x + (side < 0 ? 0.3 : 0) + u, MARGIN + offset.y + (side < 0 ? 0.2 : 0) + v, 0, shade(p.x, p.y, z))
    }
    for (const [i0, i1, i2] of triangles) {
      const a = inset[i0]
      const c = inset[i1]
      const d = inset[i2]
      const area = (c.x - a.x) * (d.y - a.y) - (d.x - a.x) * (c.y - a.y)
      const front = area > 0
      if (front === side > 0) b.indices.push(base + i0, base + i1, base + i2)
      else b.indices.push(base + i0, base + i2, base + i1)
    }
  }
  return b.geometry()
}

export function rect(w: number, h: number, cx = 0, cy = 0): Vec2[] {
  return [
    { x: cx - w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy + h / 2 },
    { x: cx - w / 2, y: cy + h / 2 },
  ]
}

/** A bevelled wooden box of size (w, h, d) centred at `at`, grain along one axis. */
export function woodBox(w: number, h: number, d: number, at: THREE.Vector3Like, grain: 'x' | 'y' | 'z', options: SlabOptions = {}): THREE.BufferGeometry {
  let geometry: THREE.BufferGeometry
  if (grain === 'z') {
    // Build with the grain along x, then turn it so x runs into the room.
    geometry = woodSlab(rect(d, h), w, 'x', options)
    geometry.rotateY(Math.PI / 2)
  } else geometry = woodSlab(rect(w, h), d, grain, options)
  geometry.translate(at.x, at.y, at.z)
  return geometry
}

export function merge(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(geometries, false)
  for (const g of geometries) g.dispose()
  if (!merged) throw new Error('could not merge wooden parts')
  merged.computeBoundingSphere()
  return merged
}

/**
 * A lathed wooden body (a peg doll, a lamp base). The grain runs up the axis,
 * so the long-grain window is laid with u up the profile and v around it.
 * The seam sits at the back.
 */
export function woodLathe(profile: readonly Vec2[], segments: number, shade?: (y: number, around: number) => number): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry(
    profile.map((p) => new THREE.Vector2(p.x, p.y)),
    segments,
    Math.PI,
    Math.PI * 2,
  )
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  let maxR = 0
  let minY = Infinity
  for (const p of profile) {
    maxR = Math.max(maxR, p.x)
    minY = Math.min(minY, p.y)
  }
  const across = Math.min(REGION_H - 2 * MARGIN, Math.PI * 2 * maxR)
  const wear: number[] = []
  const out: [number, number] = [0, 0]
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i)
    const around = uv.getX(i)
    atlasUv(true, Math.min(REGION_W - MARGIN, MARGIN + 0.3 + y - minY), MARGIN + around * across, out)
    uv.setXY(i, out[0], out[1])
    wear.push(0, shade ? shade(y, around) : 1)
  }
  geometry.setAttribute('wear', new THREE.Float32BufferAttribute(wear, 2))
  return geometry
}

/** Give a plain three.js geometry the attributes the wood material reads (no sanded edge, no contact shade). */
export function withWear(geometry: THREE.BufferGeometry, shade = 1): THREE.BufferGeometry {
  const count = geometry.getAttribute('position').count
  const wear = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) wear[i * 2 + 1] = shade
  geometry.setAttribute('wear', new THREE.BufferAttribute(wear, 2))
  return geometry
}

/** Paint every vertex one stain (for merged props that share one material). */
export function stained(geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const c = new THREE.Color(color)
  const count = geometry.getAttribute('position').count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}
