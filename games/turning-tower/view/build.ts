import * as THREE from 'three'
import type { RoomInfo } from '../controller'
import type { Decor } from '../rooms'
import { FACE_NORMALS, pack, type CellDef, type GroupDef, type Vec3 } from '../world'
import { hex, PALETTE, TONES, type RGB } from './palette'

// Geometry is built once per page (R16): every diorama becomes one merged
// static mesh plus one mesh per moving group, flat shaded with baked vertex
// colours. Static cells are greedy-meshed and only their camera-facing faces
// (+x, +y, +z) are kept; moving groups keep every face because they turn.

type V = [number, number, number]

export class Builder {
  private readonly positions: number[] = []
  private readonly normals: number[] = []
  private readonly colors: number[] = []
  private readonly indices: number[] = []
  private count = 0

  get empty(): boolean {
    return this.count === 0
  }

  /** Four corners counter-clockwise as seen from outside. */
  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, color: RGB): void {
    const n = normal(a, b, d)
    const base = this.count
    for (const p of [a, b, c, d]) this.vertex(p, n, color)
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }

  tri(a: Vec3, b: Vec3, c: Vec3, color: RGB): void {
    const n = normal(a, b, c)
    const base = this.count
    for (const p of [a, b, c]) this.vertex(p, n, color)
    this.indices.push(base, base + 1, base + 2)
  }

  /** A quad wound to face away from `inside`, whatever order the corners came in. */
  quadAway(a: Vec3, b: Vec3, c: Vec3, d: Vec3, inside: Vec3, color: RGB): void {
    if (facesAway(normal(a, b, d), inside, a, b, c, d)) this.quad(a, b, c, d, color)
    else this.quad(a, d, c, b, color)
  }

  triAway(a: Vec3, b: Vec3, c: Vec3, inside: Vec3, color: RGB): void {
    if (facesAway(normal(a, b, c), inside, a, b, c)) this.tri(a, b, c, color)
    else this.tri(a, c, b, color)
  }

  /** A flat two-sided plate (tails, wings): one face each way. */
  plate(points: readonly Vec3[], color: RGB, backColor: RGB = color): void {
    for (let i = 1; i + 1 < points.length; i++) {
      this.tri(points[0], points[i], points[i + 1], color)
      this.tri(points[0], points[i + 1], points[i], backColor)
    }
  }

  private vertex(p: Vec3, n: Vec3, color: RGB): void {
    this.positions.push(p[0], p[1], p[2])
    this.normals.push(n[0], n[1], n[2])
    this.colors.push(color[0], color[1], color[2])
    this.count += 1
  }

  geometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3))
    geometry.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.indices, 1) : new THREE.Uint16BufferAttribute(this.indices, 1))
    geometry.computeBoundingSphere()
    return geometry
  }
}

function sub(a: Vec3, b: Vec3): V {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function cross(a: Vec3, b: Vec3): V {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function normal(a: Vec3, b: Vec3, c: Vec3): V {
  const n = cross(sub(b, a), sub(c, a))
  const l = Math.hypot(n[0], n[1], n[2]) || 1
  return [n[0] / l, n[1] / l, n[2] / l]
}

function facesAway(n: Vec3, inside: Vec3, ...corners: Vec3[]): boolean {
  let mx = 0
  let my = 0
  let mz = 0
  for (const p of corners) {
    mx += p[0] / corners.length
    my += p[1] / corners.length
    mz += p[2] / corners.length
  }
  return n[0] * (mx - inside[0]) + n[1] * (my - inside[1]) + n[2] * (mz - inside[2]) >= 0
}

export function scaleColor(color: RGB, k: number): RGB {
  return [Math.min(1, color[0] * k), Math.min(1, color[1] * k), Math.min(1, color[2] * k)]
}

/** Marks a colour as unlit for the facet shader (it decodes anything above 1.5). */
export function emissive(color: RGB): RGB {
  return [color[0] + 2, color[1] + 2, color[2] + 2]
}

const PATH = hex(PALETTE.path)
const PATH_EDGE = hex(PALETTE.pathEdge)
const HANDLE = hex(PALETTE.handle)
const HUB = hex(PALETTE.hub)
const TRIM = hex(PALETTE.trim)
const WINDOW = hex(PALETTE.window)
const WINDOW_LIT = hex(PALETTE.windowLit)
const INDIGO = hex(PALETTE.indigo)
const INDIGO_LIGHT = hex(PALETTE.indigoLight)

/**
 * Greedy-merge the exposed faces of a set of unit cells. `faces` lists which
 * face directions to emit; `solid` decides which neighbours hide a face.
 */
export function greedyCells(builder: Builder, cells: readonly CellDef[], solid: Set<number>, faces: readonly number[], offset: Vec3): void {
  for (const face of faces) {
    const n = FACE_NORMALS[face]
    const axis = n[0] !== 0 ? 0 : n[1] !== 0 ? 1 : 2
    const sign = n[axis]
    const ua = (axis + 1) % 3
    const va = (axis + 2) % 3
    const slices = new Map<number, Map<string, { u: number; v: number; tone: string }>>()
    for (const cell of cells) {
      const at = cell.at
      if (solid.has(pack(at[0] + n[0], at[1] + n[1], at[2] + n[2]))) continue
      const plane = at[axis] + (sign > 0 ? 1 : 0)
      let slice = slices.get(plane)
      if (!slice) slices.set(plane, (slice = new Map()))
      slice.set(`${at[ua]},${at[va]}`, { u: at[ua], v: at[va], tone: cell.tone ?? 'stone' })
    }
    for (const [plane, slice] of slices) {
      const done = new Set<string>()
      const entries = [...slice.values()].sort((a, b) => a.v - b.v || a.u - b.u)
      for (const entry of entries) {
        const key = `${entry.u},${entry.v}`
        if (done.has(key)) continue
        let w = 1
        while (slice.get(`${entry.u + w},${entry.v}`)?.tone === entry.tone && !done.has(`${entry.u + w},${entry.v}`)) w += 1
        let h = 1
        grow: for (;;) {
          for (let du = 0; du < w; du++) {
            const k = `${entry.u + du},${entry.v + h}`
            if (slice.get(k)?.tone !== entry.tone || done.has(k)) break grow
          }
          h += 1
        }
        for (let dv = 0; dv < h; dv++) for (let du = 0; du < w; du++) done.add(`${entry.u + du},${entry.v + dv}`)
        const corner = (u: number, v: number): V => {
          const p: V = [0, 0, 0]
          p[axis] = plane - offset[axis]
          p[ua] = u - offset[ua]
          p[va] = v - offset[va]
          return p
        }
        const a = corner(entry.u, entry.v)
        const b = corner(entry.u + w, entry.v)
        const c = corner(entry.u + w, entry.v + h)
        const d = corner(entry.u, entry.v + h)
        const color = TONES[entry.tone as keyof typeof TONES]
        if (sign > 0) builder.quad(a, b, c, d, color)
        else builder.quad(a, d, c, b, color)
      }
    }
  }
}

/** A raised, bevelled mint paver on one face of a cell: walkable paths read at a glance. */
export function paver(builder: Builder, at: Vec3, face: number, offset: Vec3): void {
  const n = FACE_NORMALS[face]
  const axis = n[0] !== 0 ? 0 : n[1] !== 0 ? 1 : 2
  const ua = (axis + 1) % 3
  const va = (axis + 2) % 3
  const inset = 0.085
  const raise = 0.055
  const c: V = [at[0] + 0.5 + n[0] * 0.5 - offset[0], at[1] + 0.5 + n[1] * 0.5 - offset[1], at[2] + 0.5 + n[2] * 0.5 - offset[2]]
  const point = (u: number, v: number, up: number): V => {
    const p: V = [c[0], c[1], c[2]]
    p[ua] += u
    p[va] += v
    p[0] += n[0] * up
    p[1] += n[1] * up
    p[2] += n[2] * up
    return p
  }
  const h = 0.5 - inset
  const top = [point(-h, -h, raise), point(h, -h, raise), point(h, h, raise), point(-h, h, raise)]
  const base = [point(-h - 0.03, -h - 0.03, 0.002), point(h + 0.03, -h - 0.03, 0.002), point(h + 0.03, h + 0.03, 0.002), point(-h - 0.03, h + 0.03, 0.002)]
  const sign = n[axis]
  const order = sign > 0 ? [0, 1, 2, 3] : [0, 3, 2, 1]
  builder.quad(top[order[0]], top[order[1]], top[order[2]], top[order[3]], PATH)
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    if (sign > 0) builder.quad(base[i], base[j], top[j], top[i], PATH_EDGE)
    else builder.quad(base[j], base[i], top[i], top[j], PATH_EDGE)
  }
}

function ring(builder: Builder, centre: Vec3, axis: 'x' | 'y' | 'z', radius: number, y0: number, y1: number, sides: number, color: RGB, capColor: RGB = color, phase = 0): void {
  // Builds a prism around `axis` from offset y0 to y1 along it.
  const basis = (angle: number, along: number): V => {
    const a = Math.cos(angle) * radius
    const b = Math.sin(angle) * radius
    if (axis === 'y') return [centre[0] + a, centre[1] + along, centre[2] + b]
    if (axis === 'x') return [centre[0] + along, centre[1] + b, centre[2] + a]
    return [centre[0] + b, centre[1] + a, centre[2] + along]
  }
  const top: V = axis === 'y' ? [centre[0], centre[1] + y1, centre[2]] : axis === 'x' ? [centre[0] + y1, centre[1], centre[2]] : [centre[0], centre[1], centre[2] + y1]
  const bottom: V = axis === 'y' ? [centre[0], centre[1] + y0, centre[2]] : axis === 'x' ? [centre[0] + y0, centre[1], centre[2]] : [centre[0], centre[1], centre[2] + y0]
  for (let i = 0; i < sides; i++) {
    const a0 = phase + (i / sides) * Math.PI * 2
    const a1 = phase + ((i + 1) / sides) * Math.PI * 2
    const p0 = basis(a0, y0)
    const p1 = basis(a1, y0)
    const q0 = basis(a0, y1)
    const q1 = basis(a1, y1)
    builder.quad(p0, q0, q1, p1, color)
    builder.tri(top, q1, q0, capColor)
    builder.tri(bottom, p0, p1, scaleColor(capColor, 0.9))
  }
}

export function box(builder: Builder, min: Vec3, max: Vec3, color: RGB): void {
  const [x0, y0, z0] = min
  const [x1, y1, z1] = max
  builder.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], color)
  builder.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], color)
  builder.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], color)
  builder.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], color)
  builder.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], color)
  builder.quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], color)
}

function dome(builder: Builder, at: Vec3, radius: number, color: RGB): void {
  const sides = 8
  const rings = 3
  const point = (ring: number, side: number): V => {
    const phi = (ring / rings) * (Math.PI / 2)
    const theta = (side / sides) * Math.PI * 2 + (ring % 2) * (Math.PI / sides)
    return [at[0] + Math.cos(theta) * Math.cos(phi) * radius, at[1] + Math.sin(phi) * radius, at[2] + Math.sin(theta) * Math.cos(phi) * radius]
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sides; s++) {
      const a = point(r, s)
      const b = point(r, s + 1)
      if (r === rings - 1) {
        builder.tri(a, [at[0], at[1] + radius, at[2]], b, color)
        continue
      }
      const c = point(r + 1, s + 1)
      const d = point(r + 1, s)
      builder.tri(a, d, b, color)
      builder.tri(b, d, c, color)
    }
  }
  ring(builder, at, 'y', radius * 1.08, -0.02, 0.05, sides, TRIM)
}

function cone(builder: Builder, at: Vec3, radius: number, height: number, color: RGB): void {
  const sides = 8
  const apex: V = [at[0], at[1] + height, at[2]]
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2
    const a1 = ((i + 1) / sides) * Math.PI * 2
    builder.tri([at[0] + Math.cos(a0) * radius, at[1], at[2] + Math.sin(a0) * radius], apex, [at[0] + Math.cos(a1) * radius, at[1], at[2] + Math.sin(a1) * radius], color)
  }
  ring(builder, at, 'y', radius * 1.12, 0, 0.06, sides, TRIM)
}

function arch(u0: number, width: number, height: number, segments: number): [number, number][] {
  // Outline of an arch opening, left base up, over, and down to the right base.
  const r = width / 2
  const spring = height - r
  const points: [number, number][] = [[u0 - r, 0], [u0 - r, spring]]
  for (let i = 1; i < segments; i++) {
    const a = Math.PI - (i / segments) * Math.PI
    points.push([u0 + Math.cos(a) * r, spring + Math.sin(a) * r])
  }
  points.push([u0 + r, spring], [u0 + r, 0])
  return points
}

function flatPolygon(builder: Builder, outline: readonly [number, number][], map: (u: number, v: number) => V, color: RGB): void {
  let cu = 0
  let cv = 0
  for (const [u, v] of outline) {
    cu += u
    cv += v
  }
  const centre = map(cu / outline.length, cv / outline.length)
  for (let i = 0; i < outline.length; i++) {
    const [u0, v0] = outline[i]
    const [u1, v1] = outline[(i + 1) % outline.length]
    builder.tri(centre, map(u0, v0), map(u1, v1), color)
  }
}

function window(builder: Builder, at: Vec3, face: 'x' | 'z', height: number, lit: boolean): void {
  const outline = arch(0, 0.36, height, 6)
  const map = (u: number, v: number): V => (face === 'x' ? [at[0] + 0.012, at[1] + v, at[2] - u] : [at[0] + u, at[1] + v, at[2] + 0.012])
  flatPolygon(builder, [...outline].reverse(), map, lit ? emissive(WINDOW_LIT) : WINDOW)
  const sill = (u: number, v: number): V => (face === 'x' ? [at[0] + 0.02, at[1] + v, at[2] - u] : [at[0] + u, at[1] + v, at[2] + 0.02])
  builder.quad(sill(-0.24, -0.07), sill(0.24, -0.07), sill(0.24, 0), sill(-0.24, 0), TRIM)
}

function wheel(builder: Builder, at: Vec3, axis: 'x' | 'y' | 'z', radius: number): void {
  ring(builder, at, axis, radius, -0.05, 0.05, 14, HANDLE, HANDLE, Math.PI / 14)
  ring(builder, at, axis, 0.2, -0.08, 0.1, 8, HUB)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const r = radius - 0.13
    const centre: V = axis === 'y' ? [at[0] + Math.cos(a) * r, at[1] + 0.05, at[2] + Math.sin(a) * r] : axis === 'x' ? [at[0] + 0.05, at[1] + Math.sin(a) * r, at[2] + Math.cos(a) * r] : [at[0] + Math.sin(a) * r, at[1] + Math.cos(a) * r, at[2] + 0.05]
    ring(builder, centre, axis, 0.08, 0, 0.1, 6, HUB)
  }
}

function grip(builder: Builder, at: Vec3, face: 'x' | 'z' | 'y'): void {
  const s = 0.2
  if (face === 'x') {
    box(builder, [at[0] - 0.02, at[1] - s, at[2] - s], [at[0] + 0.12, at[1] + s, at[2] + s], HANDLE)
    box(builder, [at[0] + 0.12, at[1] - 0.04, at[2] - 0.13], [at[0] + 0.15, at[1] + 0.04, at[2] + 0.13], HUB)
  } else if (face === 'z') {
    box(builder, [at[0] - s, at[1] - s, at[2] - 0.02], [at[0] + s, at[1] + s, at[2] + 0.12], HANDLE)
    box(builder, [at[0] - 0.13, at[1] - 0.04, at[2] + 0.12], [at[0] + 0.13, at[1] + 0.04, at[2] + 0.15], HUB)
  } else {
    box(builder, [at[0] - s, at[1] - 0.02, at[2] - s], [at[0] + s, at[1] + 0.12, at[2] + s], HANDLE)
  }
}

function shaft(builder: Builder, at: Vec3, height: number): void {
  for (const dz of [-0.4, 0.4]) box(builder, [at[0] + 0.5, at[1], at[2] + dz - 0.04], [at[0] + 0.58, at[1] + height, at[2] + dz + 0.04], TRIM)
  box(builder, [at[0] + 0.5, at[1] + height, at[2] - 0.48], [at[0] + 0.62, at[1] + height + 0.1, at[2] + 0.48], TRIM)
}

function finial(builder: Builder, at: Vec3, color: RGB): void {
  ring(builder, at, 'y', 0.16, 0, 0.12, 6, TRIM)
  cone(builder, [at[0], at[1] + 0.12, at[2]], 0.1, 0.36, color)
}

function column(builder: Builder, at: Vec3, radius: number, height: number, color: RGB): void {
  ring(builder, at, 'y', radius, 0, height, 8, color)
  ring(builder, [at[0], at[1] + height, at[2]], 'y', radius * 1.35, 0, 0.07, 8, TRIM)
}

export function decor(builder: Builder, item: Decor, offset: Vec3, index: number): void {
  const at: V = [item.at[0] - offset[0], item.at[1] - offset[1], item.at[2] - offset[2]]
  switch (item.kind) {
    case 'dome':
      dome(builder, at, item.radius, TONES[item.tone])
      return
    case 'cone':
      cone(builder, at, item.radius, item.height, TONES[item.tone])
      return
    case 'column':
      column(builder, at, item.radius, item.height, TONES[item.tone])
      return
    case 'window':
      window(builder, at, item.face, item.height, index % 3 === 1)
      return
    case 'wheel':
      wheel(builder, at, item.axis, item.radius)
      return
    case 'grip':
      grip(builder, at, item.face)
      return
    case 'shaft':
      shaft(builder, at, item.height)
      return
    case 'finial':
      finial(builder, at, TONES[item.tone])
      return
    default: {
      const unreachable: never = item
      return unreachable
    }
  }
}

function decorGroup(item: Decor): number | undefined {
  return 'group' in item ? item.group : undefined
}

function groupOffset(group: GroupDef): Vec3 {
  return group.kind === 'turn' ? group.pivot : [0, 0, 0]
}

/** A cream coping around a rectangle's top edge: it sits proud of the sides and a little above the top. */
function coping(builder: Builder, y: number, x0: number, x1: number, z0: number, z1: number): void {
  const out = 0.035
  const inset = 0.12
  const below = y - 0.09
  const above = y + 0.035
  box(builder, [x0 - out, below, z1 - inset], [x1 + out, above, z1 + out], TRIM)
  box(builder, [x0 - out, below, z0 - out], [x1 + out, above, z0 + inset], TRIM)
  box(builder, [x1 - inset, below, z0 + inset], [x1 + out, above, z1 - inset], TRIM)
  box(builder, [x0 - out, below, z0 + inset], [x0 + inset, above, z1 - inset], TRIM)
}

/**
 * The lowest slab becomes a stepped plinth like the reference: a coping on its
 * edge and a wider step around its lower half. It stays within the slab's own
 * height so it never reaches down into the ring.
 */
function plinth(builder: Builder, cells: readonly CellDef[]): void {
  let floor = Infinity
  for (const cell of cells) floor = Math.min(floor, cell.at[1])
  let x0 = Infinity
  let x1 = -Infinity
  let z0 = Infinity
  let z1 = -Infinity
  for (const cell of cells) {
    if (cell.at[1] !== floor) continue
    x0 = Math.min(x0, cell.at[0])
    x1 = Math.max(x1, cell.at[0] + 1)
    z0 = Math.min(z0, cell.at[2])
    z1 = Math.max(z1, cell.at[2] + 1)
  }
  const step = 0.42
  const ledge = floor + 0.45
  coping(builder, floor + 1, x0, x1, z0, z1)
  box(builder, [x0 - step, floor, z0 - step], [x1 + step, ledge, z1 + step], TONES.plinth)
  coping(builder, ledge, x0 - step, x1 + step, z0 - step, z1 + step)
}

export type RoomGeometry = {
  static: THREE.BufferGeometry
  /** One per group; null for the bird (it is drawn as itself). */
  groups: (THREE.BufferGeometry | null)[]
}

export function buildRoomGeometry(info: RoomInfo): RoomGeometry {
  const spec = info.spec
  const staticSolid = new Set<number>()
  for (const cell of spec.cells) staticSolid.add(pack(cell.at[0], cell.at[1], cell.at[2]))
  const builder = new Builder()
  greedyCells(builder, spec.cells, staticSolid, [0, 2, 4], [0, 0, 0])
  plinth(builder, spec.cells)
  for (const cell of spec.cells) for (const face of cell.paths ?? []) paver(builder, cell.at, face, [0, 0, 0])
  spec.decor.forEach((item, index) => {
    if (decorGroup(item) === undefined) decor(builder, item, [0, 0, 0], index)
  })
  const groups = spec.groups.map((group, g) => {
    if (group.kind === 'slide' && group.bird) return null
    const offset = groupOffset(group)
    const b = new Builder()
    const solid = new Set<number>()
    for (const cell of group.cells) solid.add(pack(cell.at[0], cell.at[1], cell.at[2]))
    greedyCells(b, group.cells, solid, [0, 1, 2, 3, 4, 5], offset)
    for (const cell of group.cells) for (const face of cell.paths ?? []) paver(b, cell.at, face, offset)
    spec.decor.forEach((item, index) => {
      if (decorGroup(item) === g) decor(b, item, offset, index)
    })
    return b.geometry()
  })
  return { static: builder.geometry(), groups }
}

export type DoorGeometry = {
  /** The arch, its step, the finial and the light inside (emissive). */
  frame: THREE.BufferGeometry
  /** Hinged at the origin; the left leaf reaches toward +u, the right toward -u. */
  leafLeft: THREE.BufferGeometry
  leafRight: THREE.BufferGeometry
}

export const DOOR = { width: 0.5, height: 0.84, frame: 0.1, depth: 0.14 }

/**
 * The door stands facing the camera across the diagonal, so on screen it is a
 * clean, symmetric arch: the one shape in the diorama that means "home".
 * Local frame: u to screen right, v up, w toward the camera.
 */
export function buildDoorGeometry(): DoorGeometry {
  const map = (u: number, v: number, w: number): V => [u, v, w]
  const inner = arch(0, DOOR.width, DOOR.height, 8)
  const outer = arch(0, DOOR.width + DOOR.frame * 2, DOOR.height + DOOR.frame, 8)
  const frame = new Builder()
  const half = DOOR.depth / 2
  for (let i = 0; i < inner.length - 1; i++) {
    const [iu0, iv0] = inner[i]
    const [iu1, iv1] = inner[i + 1]
    const [ou0, ov0] = outer[i]
    const [ou1, ov1] = outer[i + 1]
    frame.quad(map(ou0, ov0, half), map(iu0, iv0, half), map(iu1, iv1, half), map(ou1, ov1, half), INDIGO)
    frame.quad(map(ou0, ov0, -half), map(ou1, ov1, -half), map(iu1, iv1, -half), map(iu0, iv0, -half), INDIGO)
    frame.quad(map(ou0, ov0, -half), map(ou0, ov0, half), map(ou1, ov1, half), map(ou1, ov1, -half), INDIGO_LIGHT)
    frame.quad(map(iu0, iv0, half), map(iu0, iv0, -half), map(iu1, iv1, -half), map(iu1, iv1, half), INDIGO_LIGHT)
  }
  box(frame, [-DOOR.width / 2 - DOOR.frame - 0.06, -0.001, -half - 0.06], [DOOR.width / 2 + DOOR.frame + 0.06, 0.05, half + 0.06], TRIM)
  ring(frame, [0, DOOR.height + DOOR.frame, 0], 'y', 0.07, 0, 0.1, 6, emissive(hex(PALETTE.lantern)))
  // Arch outlines run clockwise as seen from the camera; faces toward it need them reversed.
  flatPolygon(frame, [...inner].reverse(), (u, v) => map(u, v, -half * 0.4), emissive(hex(PALETTE.doorLight)))

  const r = DOOR.width / 2
  const spring = DOOR.height - r
  const outline: [number, number][] = [[0, 0], [r, 0]]
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2)
    outline.push([Math.cos(a) * r, spring + Math.sin(a) * r])
  }
  outline.push([0, spring])
  // Hinged at u = 0 (the outer edge of the opening), reaching to its middle.
  const hinged = outline.map(([u, v]) => [r - u, v] as [number, number])
  const leaf = (mirror: number): THREE.BufferGeometry => {
    const b = new Builder()
    const front = mirror > 0 ? [...hinged].reverse() : hinged
    const back = mirror > 0 ? hinged : [...hinged].reverse()
    // Closed, the door still glows: warm light leaves in a dark arch.
    flatPolygon(b, front, (u, v) => map(u * mirror, v, 0.012), emissive(hex(PALETTE.doorLeaf)))
    flatPolygon(b, back, (u, v) => map(u * mirror, v, -0.012), INDIGO_LIGHT)
    b.quadAway(map((r - 0.02) * mirror, 0.02, 0.016), map(r * mirror, 0.02, 0.016), map(r * mirror, spring, 0.016), map((r - 0.02) * mirror, spring, 0.016), [0, 0.3, 0], INDIGO)
    return b.geometry()
  }
  return { frame: frame.geometry(), leafLeft: leaf(1), leafRight: leaf(-1) }
}
