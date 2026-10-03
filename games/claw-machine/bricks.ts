// Brick geometry, as plain arrays: no renderer is imported here, so the
// builds can be tested and the view only wraps the arrays in buffers.
//
// Everything in the world stands on one stud grid. A length is in studs (one
// stud is one world unit) and a height is in plates (three plates make a
// brick), as with the real thing.

/** One plate, in world units. */
export const PLATE = 0.4
export const STUD_RADIUS = 0.3
export const STUD_HEIGHT = 0.18
/** Sides of a stud. Studs are most of the triangles, so this is kept low. */
export const STUD_SIDES = 8
/** Sides of a round brick. */
export const ROUND_SIDES = 14

export type Rgb = readonly [number, number, number]

export type Brick = {
  /** The low corner: x and z in studs, y in plates. */
  x: number
  y: number
  z: number
  /** Width and depth in studs, height in plates. */
  w: number
  d: number
  h: number
  colour: Rgb
  /** A round brick is a cylinder that fills its box, standing on y unless `axis` is z. */
  round?: boolean
  axis?: 'y' | 'z'
  /** Studs on top. On by default; a brick under another gets none where it is covered. */
  studs?: boolean
  /** A ball that fills its box: the one shape that is not a brick, for an eye. Its box is `w` across each way, and `h` is ignored. */
  ball?: boolean
}

export type BrickMesh = {
  position: Float32Array
  normal: Float32Array
  color: Float32Array
  /** Per vertex: where it is on its face and how big the face is, in studs, so the seam can be drawn at the edge of every brick. */
  face: Float32Array
  index: Uint32Array
  studs: number
}

/** A face with no seam: far from every edge. */
const NO_SEAM = [500, 500, 1000, 1000] as const

class Builder {
  position: number[] = []
  normal: number[] = []
  color: number[] = []
  face: number[] = []
  index: number[] = []
  studs = 0

  vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, c: Rgb, u: number, v: number, su: number, sv: number): number {
    this.position.push(x, y, z)
    this.normal.push(nx, ny, nz)
    this.color.push(c[0], c[1], c[2])
    this.face.push(u, v, su, sv)
    return this.position.length / 3 - 1
  }

  /** A flat rectangle from a corner along two edges, facing along their cross product. */
  quad(o: readonly number[], a: readonly number[], b: readonly number[], c: Rgb): void {
    const nx = a[1] * b[2] - a[2] * b[1], ny = a[2] * b[0] - a[0] * b[2], nz = a[0] * b[1] - a[1] * b[0]
    const n = Math.hypot(nx, ny, nz) || 1
    const su = Math.hypot(a[0], a[1], a[2]), sv = Math.hypot(b[0], b[1], b[2])
    const i = this.vertex(o[0], o[1], o[2], nx / n, ny / n, nz / n, c, 0, 0, su, sv)
    this.vertex(o[0] + a[0], o[1] + a[1], o[2] + a[2], nx / n, ny / n, nz / n, c, su, 0, su, sv)
    this.vertex(o[0] + a[0] + b[0], o[1] + a[1] + b[1], o[2] + a[2] + b[2], nx / n, ny / n, nz / n, c, su, sv, su, sv)
    this.vertex(o[0] + b[0], o[1] + b[1], o[2] + b[2], nx / n, ny / n, nz / n, c, 0, sv, su, sv)
    this.index.push(i, i + 1, i + 2, i, i + 2, i + 3)
  }

  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: Rgb, bottom: boolean): void {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0
    this.quad([x0, y1, z1], [w, 0, 0], [0, 0, -d], c) // top
    this.quad([x0, y0, z1], [w, 0, 0], [0, h, 0], c) // front (+z)
    this.quad([x1, y0, z0], [-w, 0, 0], [0, h, 0], c) // back
    this.quad([x1, y0, z1], [0, 0, -d], [0, h, 0], c) // right (+x)
    this.quad([x0, y0, z0], [0, 0, d], [0, h, 0], c) // left
    if (bottom) this.quad([x0, y0, z0], [w, 0, 0], [0, 0, d], c)
  }

  /** A cylinder between two caps, along y or along z. Its side shades smoothly and carries no seam. */
  cylinder(cx: number, cy: number, cz: number, radius: number, length: number, axis: 'y' | 'z', sides: number, c: Rgb, farCap: boolean): void {
    const at = (angle: number, along: number): [number, number, number, number, number, number] => {
      const p = Math.cos(angle), q = Math.sin(angle)
      // Along y the circle lies in x and z; along z it lies in x and y.
      return axis === 'y' ? [cx + p * radius, cy + along, cz + q * radius, p, 0, q] : [cx + p * radius, cy + q * radius, cz + along, p, q, 0]
    }
    const first = this.position.length / 3
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2
      const lo = at(a, 0), hi = at(a, length)
      this.vertex(lo[0], lo[1], lo[2], lo[3], lo[4], lo[5], c, ...NO_SEAM)
      this.vertex(hi[0], hi[1], hi[2], hi[3], hi[4], hi[5], c, ...NO_SEAM)
    }
    for (let i = 0; i < sides; i++) {
      const a = first + i * 2, b = first + ((i + 1) % sides) * 2
      // Wound so the side faces outward on either axis.
      if (axis === 'y') this.index.push(a, a + 1, b + 1, a, b + 1, b)
      else this.index.push(a, b, b + 1, a, b + 1, a + 1)
    }
    const cap = (along: number, sign: number) => {
      const n: [number, number, number] = axis === 'y' ? [0, sign, 0] : [0, 0, sign]
      const start = this.position.length / 3
      for (let i = 0; i < sides; i++) {
        const p = at((i / sides) * Math.PI * 2, along)
        this.vertex(p[0], p[1], p[2], n[0], n[1], n[2], c, ...NO_SEAM)
      }
      for (let i = 1; i < sides - 1; i++) {
        const outward = (axis === 'y') === (sign > 0)
        if (outward) this.index.push(start, start + i + 1, start + i)
        else this.index.push(start, start + i, start + i + 1)
      }
    }
    cap(length, 1)
    if (farCap) cap(0, -1)
  }
}

/** A ball, in rings from pole to pole. It shades smoothly and carries no seam. */
function ball(b: Builder, cx: number, cy: number, cz: number, radius: number, c: Rgb): void {
  const rings = 8, around = 14, first = b.position.length / 3
  for (let ring = 0; ring <= rings; ring++) {
    const tilt = (ring / rings) * Math.PI, y = Math.cos(tilt), level = Math.sin(tilt)
    for (let i = 0; i < around; i++) {
      const a = (i / around) * Math.PI * 2, x = Math.cos(a) * level, z = Math.sin(a) * level
      b.vertex(cx + x * radius, cy + y * radius, cz + z * radius, x, y, z, c, ...NO_SEAM)
    }
  }
  for (let ring = 0; ring < rings; ring++) for (let i = 0; i < around; i++) {
    const p = first + ring * around + i, q = first + ring * around + ((i + 1) % around)
    if (ring > 0) b.index.push(p, q, p + around)
    if (ring < rings - 1) b.index.push(q, q + around, p + around)
  }
}

/** Whether the stud at this cell on top of `brick` is covered by another brick of the build. */
function covered(bricks: readonly Brick[], brick: Brick, sx: number, sz: number): boolean {
  const top = brick.y + brick.h
  for (const other of bricks) {
    if (other.ball) continue
    if (other === brick || other.y > top + 1e-6 || other.y + other.h <= top + 1e-6) continue
    if (sx + 0.5 > other.x && sx + 0.5 < other.x + other.w && sz + 0.5 > other.z && sz + 0.5 < other.z + other.d) return true
  }
  return false
}

/**
 * One mesh for a whole build. A build that never comes apart is one draw.
 * Every brick and every stud is built closed, underside and all: a closed
 * solid has an inside, so the intersection audit can tell what is in it from
 * what only stands on it.
 */
export function buildMesh(bricks: readonly Brick[], withBottoms = true): BrickMesh {
  const b = new Builder()
  for (const brick of bricks) {
    const y0 = brick.y * PLATE, y1 = (brick.y + brick.h) * PLATE
    if (brick.ball) {
      ball(b, brick.x + brick.w / 2, y0 + brick.w / 2, brick.z + brick.w / 2, brick.w / 2, brick.colour)
      continue
    }
    if (brick.round) {
      const axis = brick.axis ?? 'y'
      if (axis === 'y') b.cylinder(brick.x + brick.w / 2, y0, brick.z + brick.d / 2, Math.min(brick.w, brick.d) / 2, y1 - y0, 'y', ROUND_SIDES, brick.colour, withBottoms)
      else b.cylinder(brick.x + brick.w / 2, (y0 + y1) / 2, brick.z, Math.min(brick.w, y1 - y0) / 2, brick.d, 'z', ROUND_SIDES, brick.colour, true)
      if (axis === 'z') continue
    } else {
      b.box(brick.x, y0, brick.z, brick.x + brick.w, y1, brick.z + brick.d, brick.colour, withBottoms)
    }
    if (brick.studs === false) continue
    // A round brick narrower than two studs carries one stud in its middle.
    const single = brick.round && Math.min(brick.w, brick.d) < 2
    const cells: [number, number][] = []
    if (single) cells.push([brick.x + brick.w / 2 - 0.5, brick.z + brick.d / 2 - 0.5])
    else for (let ix = 0; ix + 1 <= brick.w + 1e-6; ix++) for (let iz = 0; iz + 1 <= brick.d + 1e-6; iz++) cells.push([brick.x + ix, brick.z + iz])
    for (const [sx, sz] of cells) {
      if (covered(bricks, brick, sx, sz)) continue
      b.cylinder(sx + 0.5, y1, sz + 0.5, STUD_RADIUS, STUD_HEIGHT, 'y', STUD_SIDES, brick.colour, true)
      b.studs++
    }
  }
  return {
    position: new Float32Array(b.position),
    normal: new Float32Array(b.normal),
    color: new Float32Array(b.color),
    face: new Float32Array(b.face),
    index: new Uint32Array(b.index),
    studs: b.studs,
  }
}

/** The box a build fills, in world units. */
export function bounds(bricks: readonly Brick[]): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const brick of bricks) {
    const lo = [brick.x, brick.y * PLATE, brick.z], hi = [brick.x + brick.w, (brick.y + brick.h) * PLATE, brick.z + brick.d]
    if (brick.ball) { hi[1] = lo[1] + brick.w; hi[2] = lo[2] + brick.w }
    if (brick.round && brick.axis === 'z') {
      // Lies on its side: w is its diameter, d its length, centred on the middle of its height.
      const mid = (brick.y + brick.h / 2) * PLATE, r = Math.min(brick.w, brick.h * PLATE) / 2
      lo[1] = mid - r; hi[1] = mid + r
    }
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], lo[i]); max[i] = Math.max(max[i], hi[i]) }
  }
  return { min, max }
}

/** The same build moved so its footprint is centred on the origin and it stands on y = 0. */
export function centred(bricks: readonly Brick[]): Brick[] {
  const { min, max } = bounds(bricks)
  const dx = (min[0] + max[0]) / 2, dz = (min[2] + max[2]) / 2, dy = Math.min(...bricks.map((brick) => brick.y))
  return bricks.map((brick) => ({ ...brick, x: brick.x - dx, y: brick.y - dy, z: brick.z - dz }))
}

/**
 * Several meshes as one, each scaled about its own origin and then moved: a
 * thing that never comes apart is one draw, whatever it is built from.
 */
export function mergeMeshes(parts: readonly { mesh: BrickMesh; scale?: number; at?: readonly [number, number, number] }[]): BrickMesh {
  const total = parts.reduce((sum, part) => sum + part.mesh.position.length / 3, 0)
  const indices = parts.reduce((sum, part) => sum + part.mesh.index.length, 0)
  const out: BrickMesh = { position: new Float32Array(total * 3), normal: new Float32Array(total * 3), color: new Float32Array(total * 3), face: new Float32Array(total * 4), index: new Uint32Array(indices), studs: 0 }
  let vertex = 0, index = 0
  for (const { mesh, scale = 1, at = [0, 0, 0] } of parts) {
    const count = mesh.position.length / 3
    for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) out.position[(vertex + i) * 3 + k] = mesh.position[i * 3 + k] * scale + at[k]
    out.normal.set(mesh.normal, vertex * 3)
    out.color.set(mesh.color, vertex * 3)
    // The seam keeps its place on a smaller copy: its face sizes shrink with it.
    for (let i = 0; i < count * 4; i++) out.face[vertex * 4 + i] = mesh.face[i] * scale
    for (let i = 0; i < mesh.index.length; i++) out.index[index + i] = mesh.index[i] + vertex
    vertex += count; index += mesh.index.length; out.studs += mesh.studs
  }
  return out
}
