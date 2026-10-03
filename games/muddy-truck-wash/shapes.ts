// Die-cast shapes as plain numbers: chamfered boxes, turned cylinders, domes
// and rings, each written into a flat triangle list with a paint colour, a
// material class and an edge flag (where enamel chips to bare zinc). No
// renderer is imported here, so the vehicles and tools can be built and
// measured in a test; the view wraps the arrays in a geometry.

export type Rgb = readonly [number, number, number]

/** How a surface takes light. One shader draws them all. */
/** `eye` is lamp glass that mud, foam and water never cover: a vehicle's eyes always show. */
export const MAT = { enamel: 0, rubber: 1, metal: 2, lamp: 3, soft: 4, eye: 5 } as const
export type Mat = (typeof MAT)[keyof typeof MAT]

export function rgb(hex: number): Rgb {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]
}

type Vec = [number, number, number]

/** A rigid placement: a turn about one axis, then a move. */
export type Place = { at?: Vec; turn?: { axis: 'x' | 'y' | 'z'; by: number } }

export class Shape {
  readonly position: number[] = []
  readonly normal: number[] = []
  readonly color: number[] = []
  /** Material class, then the edge flag, a pair per vertex. */
  readonly surface: number[] = []

  get triangles(): number {
    return this.position.length / 9
  }

  /** Lowest and highest corner of everything written so far. */
  bounds(): { min: Vec; max: Vec } {
    const min: Vec = [Infinity, Infinity, Infinity], max: Vec = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < this.position.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], this.position[i + k])
        max[k] = Math.max(max[k], this.position[i + k])
      }
    }
    return { min, max }
  }

  /** One triangle with a normal per corner. */
  private tri(a: Vec, b: Vec, c: Vec, na: Vec, nb: Vec, nc: Vec, paint: Rgb, mat: Mat, edge: number): void {
    this.position.push(...a, ...b, ...c)
    this.normal.push(...na, ...nb, ...nc)
    for (let i = 0; i < 3; i++) {
      this.color.push(paint[0], paint[1], paint[2])
      this.surface.push(mat, edge)
    }
  }

  /** A flat polygon (three or four corners), turned to face away from `inside`. */
  private flat(corners: Vec[], inside: Vec, paint: Rgb, mat: Mat, edge: number): void {
    let n = cross(sub(corners[1], corners[0]), sub(corners[2], corners[0]))
    if (corners.length === 4 && length(n) < 1e-9) n = cross(sub(corners[2], corners[0]), sub(corners[3], corners[0]))
    n = unit(n)
    let ring = corners
    if (dot(n, sub(corners[0], inside)) < 0) {
      n = [-n[0], -n[1], -n[2]]
      ring = [...corners].reverse()
    }
    this.tri(ring[0], ring[1], ring[2], n, n, n, paint, mat, edge)
    if (ring.length === 4) this.tri(ring[0], ring[2], ring[3], n, n, n, paint, mat, edge)
  }

  /**
   * A box with chamfered edges, centred on `place`. `top` narrows and shifts
   * its upper face, which makes a sloped windscreen or a wedge of a bonnet.
   */
  box(size: Vec, paint: Rgb, place: Place = {}, opts: { bevel?: number; mat?: Mat; top?: { sx?: number; sz?: number; dx?: number } } = {}): this {
    const half: Vec = [size[0] / 2, size[1] / 2, size[2] / 2]
    const bevel = Math.min(opts.bevel ?? 0.05, half[0] * 0.9, half[1] * 0.9, half[2] * 0.9)
    const mat = opts.mat ?? MAT.enamel
    const top = opts.top
    const put = placer(place)
    const corner = (s: Vec, axis: number): Vec => {
      const p: Vec = [0, 0, 0]
      for (let k = 0; k < 3; k++) p[k] = s[k] * (k === axis ? half[k] : half[k] - bevel)
      if (top) {
        const t = (p[1] + half[1]) / size[1]
        p[0] = p[0] * (1 + ((top.sx ?? 1) - 1) * t) + (top.dx ?? 0) * t
        p[2] = p[2] * (1 + ((top.sz ?? 1) - 1) * t)
      }
      return put(p)
    }
    const inside = put([(top?.dx ?? 0) / 2, 0, 0])
    const signs = [-1, 1]
    for (let axis = 0; axis < 3; axis++) {
      const [u, v] = [(axis + 1) % 3, (axis + 2) % 3]
      for (const side of signs) {
        const s = (su: number, sv: number): Vec => {
          const out: Vec = [0, 0, 0]
          out[axis] = side; out[u] = su; out[v] = sv
          return out
        }
        this.flat([corner(s(-1, -1), axis), corner(s(1, -1), axis), corner(s(1, 1), axis), corner(s(-1, 1), axis)], inside, paint, mat, 0)
      }
    }
    for (let a = 0; a < 3; a++) {
      for (let b = a + 1; b < 3; b++) {
        const c = 3 - a - b
        for (const sa of signs) for (const sb of signs) {
          const s = (sc: number): Vec => {
            const out: Vec = [0, 0, 0]
            out[a] = sa; out[b] = sb; out[c] = sc
            return out
          }
          this.flat([corner(s(-1), a), corner(s(1), a), corner(s(1), b), corner(s(-1), b)], inside, paint, mat, 1)
        }
      }
    }
    for (const sx of signs) for (const sy of signs) for (const sz of signs) {
      const s: Vec = [sx, sy, sz]
      this.flat([corner(s, 0), corner(s, 1), corner(s, 2)], inside, paint, mat, 1)
    }
    return this
  }

  /**
   * A turned piece along `axis`: a cylinder, or a cone when `r2` differs, with
   * chamfered rims. Round faces shade smoothly; rims and caps are flat.
   */
  round(r: number, len: number, paint: Rgb, place: Place = {}, opts: { axis?: 'x' | 'y' | 'z'; segs?: number; bevel?: number; mat?: Mat; r2?: number; capPaint?: Rgb; capMat?: Mat } = {}): this {
    const segs = opts.segs ?? 20
    const r2 = opts.r2 ?? r
    const bevel = Math.min(opts.bevel ?? 0.04, r * 0.5, r2 * 0.5, len * 0.45)
    const mat = opts.mat ?? MAT.enamel
    const capPaint = opts.capPaint ?? paint, capMat = opts.capMat ?? mat
    const put = placer(place), spin = placer({ turn: place.turn })
    const axis = opts.axis ?? 'z'
    // Built along z, then laid along the asked axis.
    const lay = (p: Vec): Vec => (axis === 'z' ? p : axis === 'x' ? [p[2], p[1], -p[0]] : [p[0], p[2], -p[1]])
    const h = len / 2
    // The profile from one cap to the other: radius and height at each ring.
    const rings: [number, number][] = [[r - bevel, -h], [r, -h + bevel], [r2, h - bevel], [r2 - bevel, h]]
    const slope = (r - r2) / Math.max(1e-6, len - 2 * bevel)
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2
      const at = (ring: [number, number], a: number): Vec => put(lay([Math.cos(a) * ring[0], Math.sin(a) * ring[0], ring[1]]))
      const nrm = (a: number, z: number): Vec => unit(spin(lay([Math.cos(a), Math.sin(a), z])))
      for (let k = 0; k < 3; k++) {
        const lo = rings[k], hi = rings[k + 1]
        const nz = k === 0 ? -1 : k === 2 ? 1 : slope
        const edge = k === 1 ? 0 : 1
        const p00 = at(lo, a0), p01 = at(lo, a1), p10 = at(hi, a0), p11 = at(hi, a1)
        this.tri(p00, p01, p11, nrm(a0, nz), nrm(a1, nz), nrm(a1, nz), paint, mat, edge)
        this.tri(p00, p11, p10, nrm(a0, nz), nrm(a1, nz), nrm(a0, nz), paint, mat, edge)
      }
      for (const end of [0, 3]) {
        const z = rings[end][1]
        const n = unit(spin(lay([0, 0, Math.sign(z)])))
        const centre = put(lay([0, 0, z])), e0 = at(rings[end], a0), e1 = at(rings[end], a1)
        if (z > 0) this.tri(centre, e0, e1, n, n, n, capPaint, capMat, 0)
        else this.tri(centre, e1, e0, n, n, n, capPaint, capMat, 0)
      }
    }
    return this
  }

  /** A ball, or its upper part when `from` is above -1 (as a share of the radius). */
  ball(r: number, paint: Rgb, place: Place = {}, opts: { segs?: number; mat?: Mat; from?: number; squash?: Vec } = {}): this {
    const segs = opts.segs ?? 14, rows = Math.max(4, Math.round(segs / 2))
    const mat = opts.mat ?? MAT.enamel
    const put = placer(place), spin = placer({ turn: place.turn })
    const squash = opts.squash ?? [1, 1, 1]
    const low = Math.asin(Math.max(-1, Math.min(1, opts.from ?? -1)))
    const at = (i: number, j: number): [Vec, Vec] => {
      const lat = low + (j / rows) * (Math.PI / 2 - low), lon = (i / segs) * Math.PI * 2
      const n: Vec = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)]
      const sn = unit(spin([n[0] / squash[0], n[1] / squash[1], n[2] / squash[2]]))
      return [put([n[0] * r * squash[0], n[1] * r * squash[1], n[2] * r * squash[2]]), sn]
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < segs; i++) {
      const [p00, n00] = at(i, j), [p10, n10] = at(i + 1, j), [p01, n01] = at(i, j + 1), [p11, n11] = at(i + 1, j + 1)
      this.tri(p00, p11, p10, n00, n11, n10, paint, mat, 0)
      if (j < rows - 1) this.tri(p00, p01, p11, n00, n01, n11, paint, mat, 0)
    }
    return this
  }

  /** A ring of round section lying in the plane across `axis`, or part of one. */
  ring(R: number, r: number, paint: Rgb, place: Place = {}, opts: { segs?: number; sides?: number; mat?: Mat; arc?: number; rise?: number } = {}): this {
    const segs = opts.segs ?? 24, sides = opts.sides ?? 8
    const mat = opts.mat ?? MAT.enamel
    const arc = opts.arc ?? Math.PI * 2, rise = opts.rise ?? 0
    const put = placer(place), spin = placer({ turn: place.turn })
    const at = (i: number, j: number): [Vec, Vec] => {
      const a = (i / segs) * arc, b = (j / sides) * Math.PI * 2
      const n: Vec = [Math.cos(a) * Math.cos(b), Math.sin(a) * Math.cos(b), Math.sin(b)]
      return [put([Math.cos(a) * R + n[0] * r, Math.sin(a) * R + n[1] * r, n[2] * r + (a / (Math.PI * 2)) * rise]), unit(spin(n))]
    }
    for (let i = 0; i < segs; i++) for (let j = 0; j < sides; j++) {
      const [p00, n00] = at(i, j), [p10, n10] = at(i + 1, j), [p01, n01] = at(i, j + 1), [p11, n11] = at(i + 1, j + 1)
      this.tri(p00, p10, p11, n00, n10, n11, paint, mat, 0)
      this.tri(p00, p11, p01, n00, n11, n01, paint, mat, 0)
    }
    return this
  }
}

function placer(place: Place): (p: Vec) => Vec {
  const at = place.at ?? [0, 0, 0]
  const turn = place.turn
  const c = turn ? Math.cos(turn.by) : 1, s = turn ? Math.sin(turn.by) : 0
  return (p) => {
    let [x, y, z] = p
    if (turn?.axis === 'z') [x, y] = [x * c - y * s, x * s + y * c]
    else if (turn?.axis === 'y') [x, z] = [x * c + z * s, -x * s + z * c]
    else if (turn?.axis === 'x') [y, z] = [y * c - z * s, y * s + z * c]
    return [x + at[0], y + at[1], z + at[2]]
  }
}

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const length = (a: Vec): number => Math.hypot(a[0], a[1], a[2])
function unit(a: Vec): Vec {
  const l = length(a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
