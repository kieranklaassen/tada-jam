import * as THREE from 'three'

// Cardboard, as geometry. Everything in the room is cut from board with
// thickness: a flat outline, painted on its faces up to a bare kraft rim,
// with a fluted strip round its edge. A `Board` gathers many such pieces into
// one geometry, so a whole structure is one draw.

export type Rgb = readonly [number, number, number]
export type Outline = readonly (readonly [number, number])[]

/** A colour as it is shown, from its hex number. */
export const rgb = (hex: number): Rgb => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]

export const KRAFT = rgb(0xc69a63)
export const FLUTE = rgb(0x8f6a3f)
export const INSIDE = rgb(0x7a5a38)
export const MARKER = rgb(0x2b2622)
/** The least gap between two pieces of board that lie side by side: nothing drawn shares a plane with anything else. */
export const HAIR = 0.003

export function rect(w: number, h: number, x = 0, y = 0): Outline {
  return [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]]
}

/** An oval, or with `power` above 2 a box with soft corners. */
export function oval(w: number, h: number, steps = 20, x = 0, y = 0, power = 2): Outline {
  const points: [number, number][] = []
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a)
    points.push([x + Math.sign(c) * Math.abs(c) ** (2 / power) * w / 2, y + Math.sign(s) * Math.abs(s) ** (2 / power) * h / 2])
  }
  return points
}

/** Moves every corner of an outline inwards by `by`. */
function inset(outline: Outline, by: number): [number, number][] {
  const n = outline.length
  return outline.map(([x, y], i) => {
    const [px, py] = outline[(i + n - 1) % n], [nx, ny] = outline[(i + 1) % n]
    const ax = x - px, ay = y - py, bx = nx - x, by2 = ny - y
    const al = Math.hypot(ax, ay) || 1, bl = Math.hypot(bx, by2) || 1
    // The inward normals of the two edges that meet here, for an outline that runs anticlockwise.
    let mx = -ay / al - by2 / bl, my = ax / al + bx / bl
    const ml = Math.hypot(mx, my) || 1
    mx /= ml; my /= ml
    return [x + mx * by, y + my * by] as [number, number]
  })
}

function area(outline: Outline): number {
  let sum = 0
  for (let i = 0; i < outline.length; i++) {
    const [x1, y1] = outline[i], [x2, y2] = outline[(i + 1) % outline.length]
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

export type Place = { at?: readonly [number, number, number]; rx?: number; ry?: number; rz?: number; scale?: number }

export type PanelLook = {
  /** The paint on the face turned to +z. */
  front: Rgb
  /** The other face; bare kraft when left out. */
  back?: Rgb
  /** The width of bare kraft left round the paint; 0 paints to the edge. */
  rim?: number
  /** The thickness of the board. */
  t?: number
  edge?: Rgb
  /** How it shines once the room is dark: 0 not at all, 1 as warm light, 2 in its own colour. */
  glow?: number
}

export class Board {
  private readonly positions: number[] = []
  private readonly normals: number[] = []
  private readonly paints: number[] = []
  private readonly uvs: number[] = []
  private readonly edges: number[] = []
  private readonly glows: number[] = []
  private glow = 0
  private readonly index: number[] = []
  private readonly matrix = new THREE.Matrix4()
  private readonly normalMatrix = new THREE.Matrix3()
  private readonly v = new THREE.Vector3()
  private pieces = 0

  private put(x: number, y: number, z: number, nx: number, ny: number, nz: number, paint: Rgb, u: number, v: number, edge: number): number {
    this.v.set(x, y, z).applyMatrix4(this.matrix)
    this.positions.push(this.v.x, this.v.y, this.v.z)
    this.v.set(nx, ny, nz).applyMatrix3(this.normalMatrix).normalize()
    this.normals.push(this.v.x, this.v.y, this.v.z)
    this.paints.push(paint[0], paint[1], paint[2])
    this.uvs.push(u, v)
    this.edges.push(edge)
    this.glows.push(this.glow)
    return this.positions.length / 3 - 1
  }

  private fill(outline: Outline, z: number, facing: 1 | -1, paint: Rgb): void {
    const contour = outline.map(([x, y]) => new THREE.Vector2(x, y))
    const first = this.positions.length / 3, shift = this.pieces * 0.37
    for (const [x, y] of outline) this.put(x, y, z, 0, 0, facing, paint, x * 0.55 + shift, y * 0.55 + shift * 1.7, 0)
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, [])) {
      const [ax, ay] = outline[a], [bx, by] = outline[b], [cx, cy] = outline[c]
      const anticlockwise = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax) > 0
      if (anticlockwise === (facing > 0)) this.index.push(first + a, first + b, first + c)
      else this.index.push(first + a, first + c, first + b)
    }
  }

  /** One piece of board: `outline` in its own plane, middle of its thickness at z = 0, set in place by `place`. */
  panel(outline: Outline, look: PanelLook, place: Place = {}): this {
    const points = area(outline) < 0 ? [...outline].reverse() : outline
    const t = look.t ?? 0.035, rim = look.rim ?? 0, at = place.at ?? [0, 0, 0], scale = place.scale ?? 1
    this.matrix.compose(new THREE.Vector3(at[0], at[1], at[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(place.rx ?? 0, place.ry ?? 0, place.rz ?? 0, 'YXZ')), new THREE.Vector3(scale, scale, scale))
    this.normalMatrix.setFromMatrix4(this.matrix)
    this.pieces += 1
    this.glow = look.glow ?? 0
    if (rim > 0) {
      this.fill(points, t / 2, 1, KRAFT)
      this.fill(inset(points, rim), t / 2 + 0.002, 1, look.front)
    } else this.fill(points, t / 2, 1, look.front)
    this.fill(points, -t / 2, -1, look.back ?? KRAFT)
    // The fluted strip round the edge, one flute to about every 3 cm.
    const edge = look.edge ?? FLUTE
    let along = 0
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % points.length]
      const length = Math.hypot(x2 - x1, y2 - y1) || 1, nx = (y2 - y1) / length, ny = -(x2 - x1) / length
      const a = this.put(x1, y1, t / 2, nx, ny, 0, edge, along * 30, 1, 1), b = this.put(x2, y2, t / 2, nx, ny, 0, edge, (along + length) * 30, 1, 1)
      const c = this.put(x2, y2, -t / 2, nx, ny, 0, edge, (along + length) * 30, 0, 1), d = this.put(x1, y1, -t / 2, nx, ny, 0, edge, along * 30, 0, 1)
      this.index.push(a, d, c, a, c, b)
      along += length
    }
    return this
  }

  /**
   * A box of board standing on y = 0 round the origin, open at the back: five panels, or six with `front`.
   * `inside` paints the faces turned inwards. No panel lies in another's plane: the two sides stand the whole
   * height, the top and the bottom lie between them, and the back and the front stand between all four, each a
   * hair short of its neighbours. Without `ends` it has neither top nor bottom: a sleeve.
   */
  carton(w: number, h: number, d: number, paint: Rgb, inside: Rgb, place: Place = {}, front = false, glow = 0, ends = true): this {
    const at = place.at ?? [0, 0, 0], t = 0.035, hair = HAIR
    const set = (x: number, y: number, z: number, more: Place): Place => ({ ...more, at: [at[0] + x, at[1] + y, at[2] + z] })
    const iw = w - 2 * t - 2 * hair, ih = h - 2 * t - 2 * hair
    this.panel(rect(d, h), { front: paint, back: inside, t }, set(-w / 2 + t / 2, h / 2, 0, { ry: -Math.PI / 2 }))
    this.panel(rect(d, h), { front: paint, back: inside, t }, set(w / 2 - t / 2, h / 2, 0, { ry: Math.PI / 2 }))
    if (ends) {
      this.panel(rect(iw, d), { front: paint, back: inside, t }, set(0, h - t / 2, 0, { rx: -Math.PI / 2 }))
      this.panel(rect(iw, d), { front: inside, back: paint, t }, set(0, t / 2, 0, { rx: -Math.PI / 2 }))
    }
    this.panel(rect(iw, ih), { front: inside, back: paint, t, glow }, set(0, h / 2, -d / 2 + t / 2, {}))
    if (front) this.panel(rect(iw, ih), { front: paint, back: inside, t }, set(0, h / 2, d / 2 - t / 2, {}))
    return this
  }

  geometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3))
    geometry.setAttribute('paint', new THREE.Float32BufferAttribute(this.paints, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2))
    geometry.setAttribute('flute', new THREE.Float32BufferAttribute(this.edges, 1))
    geometry.setAttribute('glow', new THREE.Float32BufferAttribute(this.glows, 1))
    geometry.setIndex(this.index)
    geometry.computeBoundingSphere()
    return geometry
  }
}
