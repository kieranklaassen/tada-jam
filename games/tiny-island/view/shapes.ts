import * as THREE from 'three'

// A small builder of chunky, flat-faced shapes. Everything of one thing is
// gathered into one geometry with a colour on every corner, so a toy is one
// draw. Each face gets its own flat normal, a slightly different value of its
// paint (milk paint never dries even), and the measure the paint shader needs
// to wear the hard edges pale: for every corner, how far it is from each edge
// of its triangle that is a real edge of the shape.

export type Rgb = readonly [number, number, number]

export function rgb(hex: number): Rgb {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]
}

export type Placing = {
  at?: readonly [number, number, number]
  /** Turns about x, y and z, in radians, applied in that order. */
  turn?: readonly [number, number, number]
  size?: number | readonly [number, number, number]
}

const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler(), position = new THREE.Vector3(), scale = new THREE.Vector3()

function matrixOf(placing: Placing): THREE.Matrix4 {
  const size = placing.size ?? 1
  position.fromArray(placing.at ?? [0, 0, 0])
  quaternion.setFromEuler(euler.set(...(placing.turn ?? [0, 0, 0]) as [number, number, number], 'XYZ'))
  if (typeof size === 'number') scale.setScalar(size)
  else scale.fromArray(size)
  return matrix.compose(position, quaternion, scale)
}

/** A stream of small differences, fixed, so the same shape is painted the same on every machine. */
function stream(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5
    return ((s >>> 0) / 4294967296)
  }
}

export class Shape {
  private readonly points: number[] = []
  private readonly paints: number[] = []
  /** Per triangle: 1 where the face glints as water does. */
  private readonly water: number[] = []

  /** Any geometry, placed and painted. Its faces are taken apart, so each gets its own normal. */
  add(geometry: THREE.BufferGeometry, color: Rgb, placing: Placing = {}, water = false): this {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry
    const m = matrixOf(placing), mirrored = m.determinant() < 0
    const at = flat.attributes.position, v = new THREE.Vector3()
    for (let i = 0; i < at.count; i += 3) {
      const order = mirrored ? [i, i + 2, i + 1] : [i, i + 1, i + 2]
      for (const index of order) {
        v.fromBufferAttribute(at, index).applyMatrix4(m)
        this.points.push(v.x, v.y, v.z)
        this.paints.push(color[0], color[1], color[2])
      }
      this.water.push(water ? 1 : 0)
    }
    if (flat !== geometry) flat.dispose()
    geometry.dispose()
    return this
  }

  box(w: number, h: number, d: number, color: Rgb, placing: Placing = {}): this {
    return this.add(new THREE.BoxGeometry(w, h, d), color, placing)
  }

  /** An upright post with flat sides: `top` and `bottom` are its radii, so it can taper. */
  post(top: number, bottom: number, h: number, sides: number, color: Rgb, placing: Placing = {}): this {
    return this.add(new THREE.CylinderGeometry(top, bottom, h, sides, 1), color, placing)
  }

  cone(r: number, h: number, sides: number, color: Rgb, placing: Placing = {}): this {
    return this.add(new THREE.ConeGeometry(r, h, sides, 1), color, placing)
  }

  /** A faceted lump: twenty faces, or eighty with `fine`. */
  lump(r: number, color: Rgb, placing: Placing = {}, fine = false): this {
    return this.add(new THREE.IcosahedronGeometry(r, fine ? 1 : 0), color, placing)
  }

  /** A flat disc of facets lying on the ground, with its corners nudged about so no two facets are alike. */
  disc(r: number, rings: number, color: Rgb, other: Rgb, placing: Placing = {}, water = false, seed = 7): this {
    const next = stream(seed), ringsOf: THREE.Vector3[][] = [[new THREE.Vector3(0, 0, 0)]]
    for (let ring = 1; ring <= rings; ring++) {
      const count = ring * 6, row: THREE.Vector3[] = []
      for (let i = 0; i < count; i++) {
        const a = ((i + (ring % 2) * 0.5) / count) * Math.PI * 2, edge = ring === rings
        const rr = (r * ring) / rings + (edge ? 0 : (next() - 0.5) * (r / rings) * 0.5)
        row.push(new THREE.Vector3(Math.cos(a + (edge ? 0 : (next() - 0.5) * 0.25 / ring)) * rr, 0, Math.sin(a) * rr))
      }
      ringsOf.push(row)
    }
    const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): void => {
      const geometry = new THREE.BufferGeometry().setFromPoints([a, c, b])
      this.add(geometry, next() < 0.5 ? color : other, placing, water)
    }
    for (let ring = 1; ring <= rings; ring++) {
      const outer = ringsOf[ring], inner = ringsOf[ring - 1], n = outer.length, m = inner.length
      // Walk both rings together, always closing the triangle whose next corner comes first round the circle.
      // A middle that is one point has no edge of its own to walk.
      let i = 0, j = m === 1 ? 1 : 0
      while (i < n || j < m) {
        const outerNext = (i + 1) / n, innerNext = m === 1 ? 2 : (j + 1) / m
        if (j >= m || (i < n && outerNext <= innerNext)) {
          triangle(outer[i % n], outer[(i + 1) % n], inner[j % m])
          i++
        } else {
          triangle(outer[i % n], inner[(j + 1) % m], inner[j % m])
          j++
        }
      }
    }
    return this
  }

  get triangles(): number {
    return this.points.length / 9
  }

  /**
   * The finished geometry. `uneven` is how far each face's paint may differ from its colour; `worn` whether the
   * hard edges are measured for wearing pale.
   */
  build(uneven = 0.035, worn = true, seed = 11): THREE.BufferGeometry {
    const count = this.points.length / 3, triangles = count / 3
    const positions = new Float32Array(this.points), colors = new Float32Array(this.paints)
    const normals = new Float32Array(count * 3), wear = new Float32Array(count * 3).fill(99), phase = new Float32Array(count)
    const next = stream(seed)
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3(), normal = new THREE.Vector3()
    const faceNormals: THREE.Vector3[] = []
    // Which faces meet at each edge, by the edge's two ends.
    const edges = new Map<string, number[]>()
    const key = (i: number): string => `${Math.round(positions[i * 3] * 2000)},${Math.round(positions[i * 3 + 1] * 2000)},${Math.round(positions[i * 3 + 2] * 2000)}`
    const edgeKey = (i: number, j: number): string => {
      const p = key(i), q = key(j)
      return p < q ? `${p}|${q}` : `${q}|${p}`
    }
    for (let t = 0; t < triangles; t++) {
      const i = t * 3
      a.fromArray(positions, i * 3); b.fromArray(positions, i * 3 + 3); c.fromArray(positions, i * 3 + 6)
      normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a)).normalize()
      faceNormals.push(normal.clone())
      const shade = 1 + (next() - 0.5) * 2 * uneven, glint = this.water[t] ? 0.05 + next() * 0.95 : 0
      for (let k = 0; k < 3; k++) {
        normal.toArray(normals, (i + k) * 3)
        for (let ch = 0; ch < 3; ch++) colors[(i + k) * 3 + ch] = Math.min(1, colors[(i + k) * 3 + ch] * shade)
        phase[i + k] = glint
      }
      if (!worn) continue
      for (let k = 0; k < 3; k++) {
        const e = edgeKey(i + ((k + 1) % 3), i + ((k + 2) % 3))
        const list = edges.get(e)
        if (list) list.push(t)
        else edges.set(e, [t])
      }
    }
    if (worn) {
      for (let t = 0; t < triangles; t++) {
        const i = t * 3
        for (let k = 0; k < 3; k++) {
          // The edge across from corner k is a real edge when the shape ends there or folds there.
          const others = edges.get(edgeKey(i + ((k + 1) % 3), i + ((k + 2) % 3)))!
          const hard = others.length === 1 || others.some((other) => other !== t && faceNormals[other].dot(faceNormals[t]) < 0.6)
          if (!hard) continue
          a.fromArray(positions, (i + k) * 3); b.fromArray(positions, (i + ((k + 1) % 3)) * 3); c.fromArray(positions, (i + ((k + 2) % 3)) * 3)
          const edge = ab.subVectors(c, b), height = ac.subVectors(a, b).cross(edge).length() / Math.max(1e-6, edge.length())
          // Its own corner is that far from the edge, and the other two lie on it.
          for (let j = 0; j < 3; j++) wear[(i + j) * 3 + k] = j === k ? height : 0
        }
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('wear', new THREE.BufferAttribute(wear, 3))
    geometry.setAttribute('phase', new THREE.BufferAttribute(phase, 1))
    geometry.computeBoundingSphere()
    return geometry
  }
}
