// Geometry core of the jam intersection audit (scripts/jam-intersections.mjs).
//
// Input is one moment of a game's scene as world-space triangle soups, one per
// piece (a mesh, or one instance of an InstancedMesh). Output is findings:
//   penetration  two distinct objects cross by more than the tolerance
//                (a piece sinking into the surface it rests on is one of these)
//   contained    a piece sits wholly inside another object
//   pose         two parts of one object cross deeper at some moment than at
//                their shallowest (a limb or prop swinging through the body)
//   zfight       coplanar, overlapping faces of two pieces (or of one merged
//                mesh) closer than the depth buffer can separate
//   nearclip     a piece crosses the camera's near plane inside the view
// Pure: no browser, no renderer. test/intersections.test.ts pins it.

import { Box3, BufferAttribute, BufferGeometry, DoubleSide, Line3, Matrix4, Ray, Vector3 } from 'three'
import { ExtendedTriangle, MeshBVH } from 'three-mesh-bvh'

export type MaterialInfo = {
  type: string
  side: number
  transparent: boolean
  opacity: number
  depthTest: boolean
  depthWrite: boolean
  polygonOffset: boolean
  colorWrite: boolean
  customVertex: boolean
  renderOrder: number
}

export type PieceInput = {
  id: string
  mesh: string
  label: string
  object: string
  positions: Float32Array
  index: Uint32Array | null
  material: MaterialInfo
  // Changes whenever the piece's geometry or transform changes.
  version?: string
}

export type CameraInfo = {
  position: [number, number, number]
  forward: [number, number, number]
  ortho: boolean
  near: number
  far: number
  fov: number
  orthoHeight: number
  view: number[]
  projection: number[]
  viewport: [number, number]
  logDepth: boolean
}

export type Piece = PieceInput & {
  geometry: BufferGeometry
  bvh: MeshBVH
  box: Box3
  scale: number
  closed: boolean
  enclosure: boolean
  weld: Int32Array
  boundary: Set<number>
  triangles: number
}

export type Kind = 'penetration' | 'contained' | 'pose' | 'zfight' | 'nearclip'

export type Finding = {
  kind: Kind
  a: string
  b: string
  labelA: string
  labelB: string
  objectA: string
  objectB: string
  depth: number
  relative: number
  area: number
  pixels: number
  support: boolean
  visible: boolean
  onScreen: boolean
  focus: [number, number, number]
  radius: number
  segments: number[]
}

export type Tolerance = {
  // Depth allowed as a fraction of the smaller piece's middle extent.
  relative: number
  // Depth allowed as a fraction of the view width at the scene's depth.
  absolute: number
  // Screen area in CSS pixels a coplanar overlap may cover before it counts.
  zfightPixels: number
}

export const DEFAULT_TOLERANCE: Tolerance = { relative: 0.06, absolute: 0.002, zfightPixels: 6 }

const MAX_SAMPLES = 700
const MAX_SEGMENTS = 240
const MAX_ZFIGHT_TRIANGLES = 24000
const PARALLEL = Math.cos((1.5 * Math.PI) / 180)

const v1 = new Vector3()
const v2 = new Vector3()
const v3 = new Vector3()

export function triangleCount(input: { positions: Float32Array; index: Uint32Array | null }): number {
  return (input.index ? input.index.length : input.positions.length / 3) / 3
}

// Weld vertices by quantized position so seams (UV splits, lathe seams,
// sphere poles) do not look like holes, then find boundary edges. A piece is
// closed when almost no edge is a boundary, and only closed pieces have an
// inside a point can be tested against.
function weldAndBoundary(positions: Float32Array, index: Uint32Array | null, box: Box3) {
  const n = positions.length / 3
  const size = box.getSize(v1)
  const q = Math.max(size.x, size.y, size.z, 1e-9) * 1e-5
  const map = new Map<string, number>()
  const weld = new Int32Array(n)
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(positions[i * 3] / q)},${Math.round(positions[i * 3 + 1] / q)},${Math.round(positions[i * 3 + 2] / q)}`
    let id = map.get(key)
    if (id === undefined) {
      id = map.size
      map.set(key, id)
    }
    weld[i] = id
  }
  const tris = index ? index.length / 3 : n / 3
  const edges = new Map<number, number>()
  const edgeKey = (a: number, b: number) => (a < b ? a * 0x200000 + b : b * 0x200000 + a)
  let total = 0
  for (let t = 0; t < tris; t++) {
    const a = weld[index ? index[t * 3] : t * 3]
    const b = weld[index ? index[t * 3 + 1] : t * 3 + 1]
    const c = weld[index ? index[t * 3 + 2] : t * 3 + 2]
    if (a === b || b === c || a === c) continue
    for (const k of [edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)]) {
      edges.set(k, (edges.get(k) ?? 0) + 1)
      total++
    }
  }
  const boundary = new Set<number>()
  for (const [k, count] of edges) if (count === 1) boundary.add(k)
  const closed = total > 0 && boundary.size <= Math.max(0, total * 0.004)
  return { weld, boundary, closed, edgeKey }
}

const EDGE = (a: number, b: number) => (a < b ? a * 0x200000 + b : b * 0x200000 + a)

export function preparePiece(input: PieceInput, camera?: Pick<CameraInfo, 'position'>): Piece {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(input.positions, 3))
  if (input.index) geometry.setIndex(new BufferAttribute(input.index.slice(), 1))
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!.clone()
  const extents = box.getSize(new Vector3()).toArray().sort((a, b) => a - b)
  // Weld before the BVH reorders the index, against the original order.
  const { weld, boundary, closed } = weldAndBoundary(input.positions, input.index, box)
  const bvh = new MeshBVH(geometry)
  let enclosure = false
  if (closed && camera) {
    const cam = new Vector3(...camera.position)
    enclosure = input.material.side === 1 || (box.containsPoint(cam) && insideClosed(cam, bvh, box))
  } else if (closed) enclosure = input.material.side === 1
  return {
    ...input,
    geometry,
    bvh,
    box,
    scale: Math.max(extents[1], 1e-9),
    closed,
    enclosure,
    weld,
    boundary,
    triangles: triangleCount(input),
  }
}

const RAY_DIRS = [new Vector3(0.5377, 0.7071, 0.4581).normalize(), new Vector3(-0.6231, 0.2213, -0.7502).normalize(), new Vector3(0.1279, -0.8813, 0.4550).normalize()]

function parity(p: Vector3, bvh: MeshBVH, dir: Vector3, scale: number): boolean {
  const ray = new Ray(p, dir)
  const hits = bvh.raycast(ray, DoubleSide)
  const ds = hits.map((h) => h.distance).filter((d) => d > 1e-9).sort((a, b) => a - b)
  let count = 0
  let last = -Infinity
  for (const d of ds) {
    if (d - last > scale * 1e-7) count++
    last = d
  }
  return count % 2 === 1
}

function insideClosed(p: Vector3, bvh: MeshBVH, box: Box3): boolean {
  const scale = box.getSize(v3).length()
  let votes = 0
  for (const dir of RAY_DIRS) if (parity(p, bvh, dir, scale)) votes++
  return votes >= 2
}

type Hit = { point: Vector3; distance: number; faceIndex: number }

function faceVertices(piece: Piece, face: number): [number, number, number] {
  const idx = piece.geometry.index
  if (idx) return [idx.getX(face * 3), idx.getX(face * 3 + 1), idx.getX(face * 3 + 2)]
  return [face * 3, face * 3 + 1, face * 3 + 2]
}

function faceNormal(piece: Piece, face: number, out: Vector3): Vector3 {
  const [i, j, k] = faceVertices(piece, face)
  const p = piece.positions
  v1.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2])
  v2.set(p[j * 3] - v1.x, p[j * 3 + 1] - v1.y, p[j * 3 + 2] - v1.z)
  v3.set(p[k * 3] - v1.x, p[k * 3 + 1] - v1.y, p[k * 3 + 2] - v1.z)
  return out.crossVectors(v2, v3).normalize()
}

// Closest point lies on a boundary edge of an open piece: which side is
// "inside" is undefined there, so the sample is skipped.
function onBoundary(piece: Piece, hit: Hit): boolean {
  if (piece.boundary.size === 0) return false
  const [i, j, k] = faceVertices(piece, hit.faceIndex)
  const p = piece.positions
  const a = new Vector3(p[i * 3], p[i * 3 + 1], p[i * 3 + 2])
  const b = new Vector3(p[j * 3], p[j * 3 + 1], p[j * 3 + 2])
  const c = new Vector3(p[k * 3], p[k * 3 + 1], p[k * 3 + 2])
  const eps = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) * 1e-3
  const w = piece.weld
  const near = (x: Vector3, y: Vector3) => new Line3(x, y).closestPointToPoint(hit.point, true, v2).distanceTo(hit.point) < eps
  if (near(a, b) && piece.boundary.has(EDGE(w[i], w[j]))) return true
  if (near(b, c) && piece.boundary.has(EDGE(w[j], w[k]))) return true
  if (near(c, a) && piece.boundary.has(EDGE(w[k], w[i]))) return true
  return false
}

// Is p inside (behind the visible side of) `piece`? null when undecidable.
function isInside(p: Vector3, piece: Piece, hit: Hit, camera: CameraInfo): boolean | null {
  if (piece.closed) {
    const inside = insideClosed(p, piece.bvh, piece.box)
    return piece.enclosure ? !inside : inside
  }
  if (onBoundary(piece, hit)) return null
  const n = faceNormal(piece, hit.faceIndex, new Vector3())
  if (piece.material.side === 1) n.negate()
  if (piece.material.side === 2) {
    const toCam = camera.ortho ? new Vector3(...camera.forward).negate() : new Vector3(...camera.position).sub(hit.point)
    if (n.dot(toCam) < 0) n.negate()
  }
  return v1.subVectors(p, hit.point).dot(n) < 0
}

function samplePoints(from: Piece, within: Box3, limit: number): Vector3[] {
  const p = from.positions
  const out: Vector3[] = []
  const candidates: number[] = []
  for (let i = 0; i < p.length; i += 3) {
    if (p[i] < within.min.x || p[i] > within.max.x || p[i + 1] < within.min.y || p[i + 1] > within.max.y || p[i + 2] < within.min.z || p[i + 2] > within.max.z) continue
    candidates.push(p[i], p[i + 1], p[i + 2])
  }
  const tris = from.triangles
  const idx = from.geometry.index
  for (let t = 0; t < tris; t++) {
    const i = idx ? idx.getX(t * 3) : t * 3
    const j = idx ? idx.getX(t * 3 + 1) : t * 3 + 1
    const k = idx ? idx.getX(t * 3 + 2) : t * 3 + 2
    const x = (p[i * 3] + p[j * 3] + p[k * 3]) / 3
    const y = (p[i * 3 + 1] + p[j * 3 + 1] + p[k * 3 + 1]) / 3
    const z = (p[i * 3 + 2] + p[j * 3 + 2] + p[k * 3 + 2]) / 3
    if (x < within.min.x || x > within.max.x || y < within.min.y || y > within.max.y || z < within.min.z || z > within.max.z) continue
    candidates.push(x, y, z)
  }
  const count = candidates.length / 3
  const stride = Math.max(1, Math.ceil(count / limit))
  for (let i = 0; i < count; i += stride) out.push(new Vector3(candidates[i * 3], candidates[i * 3 + 1], candidates[i * 3 + 2]))
  return out
}

// Deepest sample of `a` behind `b`'s surface, from vertices and face centres
// of `a` inside `b`'s bounds.
export function depthInto(a: Piece, b: Piece, camera: CameraInfo, limit = MAX_SAMPLES): { depth: number; point: Vector3 | null } {
  // Reach past b's bounds by a's size: behind an open surface (a floor, a
  // table top) lies outside its flat bounding box.
  const within = a.box.clone().intersect(b.box.clone().expandByScalar(Math.min(a.scale, b.scale)))
  if (within.isEmpty()) return { depth: 0, point: null }
  const points = samplePoints(a, within, limit)
  let depth = 0
  let deepest: Vector3 | null = null
  const target = { point: new Vector3(), distance: 0, faceIndex: 0 }
  for (const p of points) {
    const hit = b.bvh.closestPointToPoint(p, target as never) as unknown as Hit | null
    if (!hit || hit.distance <= depth) continue
    const inside = isInside(p, b, hit, camera)
    if (inside) {
      depth = hit.distance
      deepest = p.clone()
    }
  }
  return { depth, point: deepest }
}

const IDENTITY = new Matrix4()

// Segments where the two surfaces cross, skipping coplanar triangle pairs
// (those are z-fighting, not crossing).
export function crossings(a: Piece, b: Piece, limit = MAX_SEGMENTS): number[] {
  const segs: number[] = []
  const line = new Line3()
  const na = new Vector3()
  const nb = new Vector3()
  a.bvh.bvhcast(b.bvh, IDENTITY, {
    intersectsTriangles(t1: ExtendedTriangle, t2: ExtendedTriangle) {
      t1.getNormal(na)
      t2.getNormal(nb)
      if (Math.abs(na.dot(nb)) > PARALLEL) {
        const d = Math.max(Math.abs(na.dot(v1.subVectors(t2.a, t1.a))), Math.abs(na.dot(v1.subVectors(t2.b, t1.a))), Math.abs(na.dot(v1.subVectors(t2.c, t1.a))))
        if (d < Math.max(a.scale, b.scale) * 1e-4) return false
      }
      // The third argument (suppressLog, missing from the typings) keeps
      // near-coplanar pairs that slip past the check above from logging.
      const intersects = (t1.intersectsTriangle as (other: ExtendedTriangle, target: Line3, suppressLog: boolean) => boolean).call(t1, t2, line, true)
      if (intersects && line.distance() > 0) {
        segs.push(line.start.x, line.start.y, line.start.z, line.end.x, line.end.y, line.end.z)
        if (segs.length >= limit * 6) return true
      }
      return false
    },
  } as never)
  return segs
}

function pointVisible(p: Vector3, camera: CameraInfo): { onScreen: boolean; ndc: Vector3 } {
  const ndc = p.clone().applyMatrix4(new Matrix4().fromArray(camera.view)).applyMatrix4(new Matrix4().fromArray(camera.projection))
  return { onScreen: Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z >= -1 && ndc.z <= 1, ndc }
}

// Is anything drawn in front of p? Checks a straight line to the camera
// against every opaque piece.
export function occluded(p: Vector3, pieces: Piece[], camera: CameraInfo): boolean {
  const cam = new Vector3(...camera.position)
  const dir = camera.ortho ? new Vector3(...camera.forward).negate() : cam.clone().sub(p)
  const far = camera.ortho ? camera.far * 2 : dir.length()
  dir.normalize()
  const eps = far * 1e-4
  const ray = new Ray(p.clone().addScaledVector(dir, eps), dir)
  for (const piece of pieces) {
    if (piece.material.transparent && piece.material.opacity < 0.9) continue
    if (piece.enclosure) continue
    if (!ray.intersectsBox(piece.box)) continue
    const hit = piece.bvh.raycastFirst(ray, piece.material.side === 1 ? 1 : piece.material.side === 2 ? 2 : 0, 0, far)
    if (hit && hit.distance > eps) return true
  }
  return false
}

function centroidAndRadius(segs: number[], fallback: Vector3 | null): { focus: Vector3; radius: number } {
  if (!segs.length) return { focus: fallback ?? new Vector3(), radius: 0 }
  const box = new Box3()
  for (let i = 0; i < segs.length; i += 3) box.expandByPoint(v1.set(segs[i], segs[i + 1], segs[i + 2]))
  return { focus: box.getCenter(new Vector3()), radius: box.getSize(v2).length() / 2 }
}

export function viewDepth(p: Vector3, camera: CameraInfo): number {
  return v1.subVectors(p, v2.set(...camera.position)).dot(v3.set(...camera.forward))
}

export function pixelsPerUnit(p: Vector3, camera: CameraInfo): number {
  const h = camera.viewport[1]
  if (camera.ortho) return h / Math.max(camera.orthoHeight, 1e-9)
  const z = Math.max(viewDepth(p, camera), camera.near)
  return h / (2 * z * Math.tan((camera.fov * Math.PI) / 360))
}

// Smallest separation the depth buffer resolves at p, with a margin for
// interpolation and float32 transforms. 24-bit depth, standard projection.
export function depthResolution(p: Vector3, camera: CameraInfo): number {
  const steps = 2 ** 24
  if (camera.ortho) return ((camera.far - camera.near) / steps) * 16
  const z = Math.max(viewDepth(p, camera), camera.near)
  if (camera.logDepth) return (z * Math.log2(camera.far + 1) / steps) * 16
  return ((z * z) / (camera.near * steps)) * 16
}

function isSupport(piece: Piece): boolean {
  const s = piece.box.getSize(v1)
  const flat = s.y <= 0.25 * Math.max(s.x, s.z)
  return flat || piece.enclosure
}

function basePair(a: Piece, b: Piece): Omit<Finding, 'kind' | 'depth' | 'relative' | 'area' | 'pixels' | 'support' | 'visible' | 'onScreen' | 'focus' | 'radius' | 'segments'> {
  return { a: a.id, b: b.id, labelA: a.label, labelB: b.label, objectA: a.object, objectB: b.object }
}

export type PairDepth = { depth: number; segments: number[]; contained: boolean; point: Vector3 | null; support: boolean }

// Crossing and depth for one pair; null when they do not cross or touch.
export function pairDepth(a: Piece, b: Piece, camera: CameraInfo): PairDepth | null {
  if (!a.box.intersectsBox(b.box)) return null
  const segments = crossings(a, b)
  if (segments.length === 0) {
    // No crossing: a piece may still sit wholly inside a closed one.
    const [small, big] = a.scale <= b.scale ? [a, b] : [b, a]
    if (!big.closed || big.enclosure || !big.box.containsBox(small.box)) return null
    const p = new Vector3(small.positions[0], small.positions[1], small.positions[2])
    if (!insideClosed(p, big.bvh, big.box)) return null
    return { depth: small.scale, segments, contained: true, point: small.box.getCenter(new Vector3()), support: false }
  }
  const ab = depthInto(a, b, camera)
  const ba = depthInto(b, a, camera)
  const deeper = ab.depth >= ba.depth ? ab : ba
  const surface = ab.depth >= ba.depth ? b : a
  return { depth: deeper.depth, segments, contained: false, point: deeper.point, support: isSupport(surface) }
}

export function tolerance(a: Piece, b: Piece, viewSize: number, tol: Tolerance): number {
  return Math.max(tol.relative * Math.min(a.scale, b.scale), tol.absolute * viewSize)
}

// `pair` passes in an already computed pairDepth; visibility always comes from
// the pieces given here, since anything in the scene may have moved in front of
// or away from the crossing since the pair itself was last measured.
export function penetrationFinding(a: Piece, b: Piece, all: Piece[], camera: CameraInfo, viewSize: number, tol: Tolerance, pair?: PairDepth | null): Finding | null {
  const r = pair === undefined ? pairDepth(a, b, camera) : pair
  if (!r) return null
  const limit = tolerance(a, b, viewSize, tol)
  if (r.depth <= limit) return null
  const { focus, radius } = centroidAndRadius(r.segments, r.point)
  const probe = r.segments.length ? spotsOf(r.segments) : [focus]
  const onScreen = probe.some((p) => pointVisible(p, camera).onScreen)
  const visible = onScreen && probe.some((p) => pointVisible(p, camera).onScreen && !occluded(p, all, camera))
  return {
    ...basePair(a, b),
    kind: r.contained ? 'contained' : 'penetration',
    depth: r.depth,
    relative: r.depth / Math.min(a.scale, b.scale),
    area: 0,
    pixels: r.depth * pixelsPerUnit(focus, camera),
    support: r.support,
    visible,
    onScreen,
    focus: focus.toArray() as [number, number, number],
    radius: Math.max(radius, r.depth),
    segments: r.segments,
  }
}

function spotsOf(segs: number[]): Vector3[] {
  const n = segs.length / 6
  const stride = Math.max(1, Math.floor(n / 8))
  const out: Vector3[] = []
  for (let i = 0; i < n; i += stride) out.push(new Vector3((segs[i * 6] + segs[i * 6 + 3]) / 2, (segs[i * 6 + 1] + segs[i * 6 + 4]) / 2, (segs[i * 6 + 2] + segs[i * 6 + 5]) / 2))
  return out
}

// --- z-fighting -------------------------------------------------------------

function facesCamera(n: Vector3, p: Vector3, camera: CameraInfo, side: number): boolean {
  if (side === 2) return true
  const toCam = camera.ortho ? v1.set(...camera.forward).negate() : v1.set(...camera.position).sub(p)
  const d = n.dot(toCam)
  return side === 1 ? d < 0 : d > 0
}

// Area of the overlap of two coplanar triangles (Sutherland-Hodgman in the
// plane of the first).
export function coplanarOverlapArea(a: [Vector3, Vector3, Vector3], b: [Vector3, Vector3, Vector3], normal: Vector3): number {
  const u = new Vector3().subVectors(a[1], a[0]).normalize()
  const w = new Vector3().crossVectors(normal, u).normalize()
  const to2 = (p: Vector3): [number, number] => [v1.subVectors(p, a[0]).dot(u), v1.subVectors(p, a[0]).dot(w)]
  let poly = a.map(to2)
  let clip = b.map(to2)
  const signed = (q: [number, number][]) => q.reduce((s, p, i) => s + p[0] * q[(i + 1) % q.length][1] - q[(i + 1) % q.length][0] * p[1], 0) / 2
  if (signed(clip) < 0) clip = clip.reverse()
  for (let i = 0; i < 3 && poly.length; i++) {
    const [ax, ay] = clip[i]
    const [bx, by] = clip[(i + 1) % 3]
    const side = (p: [number, number]) => (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax)
    const next: [number, number][] = []
    for (let j = 0; j < poly.length; j++) {
      const p = poly[j]
      const q = poly[(j + 1) % poly.length]
      const sp = side(p)
      const sq = side(q)
      if (sp >= 0) next.push(p)
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq)
        next.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
      }
    }
    poly = next
  }
  return poly.length >= 3 ? Math.abs(signed(poly)) : 0
}

// three.js draws every opaque mesh before any transparent one, each list in
// renderOrder, so a surface that writes no depth and is drawn first cannot
// fight one drawn after it.
function drawnBefore(x: MaterialInfo, y: MaterialInfo): boolean {
  return (!x.transparent && y.transparent) || (x.transparent === y.transparent && x.renderOrder < y.renderOrder)
}

export function canFight(a: MaterialInfo, b: MaterialInfo): boolean {
  if (!a.depthTest || !b.depthTest) return false
  if (a.polygonOffset || b.polygonOffset) return false
  if (!a.depthWrite && !b.depthWrite) return false
  if (a.depthWrite && !b.depthWrite && drawnBefore(b, a)) return false
  if (b.depthWrite && !a.depthWrite && drawnBefore(a, b)) return false
  return true
}

export function zfightFinding(a: Piece, b: Piece, camera: CameraInfo, tol: Tolerance): Finding | null {
  const same = a === b
  if (!canFight(a.material, b.material)) return null
  if (!same && a.mesh === b.mesh && a.id === b.id) return null
  const probe = a.box.clone().expandByScalar(a.scale * 1e-3)
  if (!same && !probe.intersectsBox(b.box)) return null
  const idx = a.geometry.index
  const p = a.positions
  const tris = a.triangles
  const stride = Math.max(1, Math.ceil(tris / MAX_ZFIGHT_TRIANGLES))
  const na = new Vector3()
  const nb = new Vector3()
  const ta: [Vector3, Vector3, Vector3] = [new Vector3(), new Vector3(), new Vector3()]
  const box = new Box3()
  let area = 0
  let pixels = 0
  const focusBox = new Box3()
  const segs: number[] = []
  for (let t = 0; t < tris; t += stride) {
    const i = idx ? idx.getX(t * 3) : t * 3
    const j = idx ? idx.getX(t * 3 + 1) : t * 3 + 1
    const k = idx ? idx.getX(t * 3 + 2) : t * 3 + 2
    ta[0].set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2])
    ta[1].set(p[j * 3], p[j * 3 + 1], p[j * 3 + 2])
    ta[2].set(p[k * 3], p[k * 3 + 1], p[k * 3 + 2])
    na.subVectors(ta[1], ta[0]).cross(v2.subVectors(ta[2], ta[0]))
    const triArea = na.length() / 2
    if (triArea < 1e-12) continue
    na.normalize()
    const centre = v3.copy(ta[0]).add(ta[1]).add(ta[2]).divideScalar(3).clone()
    if (!facesCamera(na, centre, camera, a.material.side)) continue
    const eps = depthResolution(centre, camera)
    box.setFromPoints(ta).expandByScalar(eps)
    if (!box.intersectsBox(b.box)) continue
    const wi = a.weld[i], wj = a.weld[j], wk = a.weld[k]
    b.bvh.shapecast({
      intersectsBounds: (bounds: Box3) => bounds.intersectsBox(box),
      intersectsTriangle: (tb: ExtendedTriangle, index: number) => {
        if (same) {
          if (index <= t) return false
          const [x, y, z] = faceVertices(b, index)
          const wb = [b.weld[x], b.weld[y], b.weld[z]]
          if (wb.includes(wi) || wb.includes(wj) || wb.includes(wk)) return false
        }
        tb.getNormal(nb)
        if (Math.abs(na.dot(nb)) < PARALLEL) return false
        const d = Math.max(Math.abs(na.dot(v1.subVectors(tb.a, ta[0]))), Math.abs(na.dot(v1.subVectors(tb.b, ta[0]))), Math.abs(na.dot(v1.subVectors(tb.c, ta[0]))))
        if (d > eps) return false
        if (!facesCamera(nb, centre, camera, b.material.side)) return false
        const overlap = coplanarOverlapArea([ta[0], ta[1], ta[2]], [tb.a, tb.b, tb.c], na)
        if (overlap <= triArea * 1e-3) return false
        const ppu = pixelsPerUnit(centre, camera)
        const facing = camera.ortho ? Math.abs(na.dot(v1.set(...camera.forward))) : Math.abs(na.dot(v1.set(...camera.position).sub(centre).normalize()))
        area += overlap
        pixels += overlap * ppu * ppu * facing
        focusBox.expandByPoint(ta[0]).expandByPoint(ta[1]).expandByPoint(ta[2])
        if (segs.length < MAX_SEGMENTS * 6) segs.push(ta[0].x, ta[0].y, ta[0].z, ta[1].x, ta[1].y, ta[1].z, ta[1].x, ta[1].y, ta[1].z, ta[2].x, ta[2].y, ta[2].z, ta[2].x, ta[2].y, ta[2].z, ta[0].x, ta[0].y, ta[0].z)
        return false
      },
    } as never)
  }
  pixels *= stride
  if (pixels < tol.zfightPixels) return null
  const focus = focusBox.getCenter(new Vector3())
  const { onScreen } = pointVisible(focus, camera)
  return {
    ...basePair(a, b),
    kind: 'zfight',
    depth: 0,
    relative: 0,
    area: area * stride,
    pixels,
    support: false,
    visible: onScreen,
    onScreen,
    focus: focus.toArray() as [number, number, number],
    radius: focusBox.getSize(v1).length() / 2,
    segments: segs,
  }
}

// --- near plane -------------------------------------------------------------

export function nearClipFinding(a: Piece, camera: CameraInfo): Finding | null {
  const view = new Matrix4().fromArray(camera.view)
  const proj = new Matrix4().fromArray(camera.projection)
  const p = a.positions
  let clipped = 0
  const box = new Box3()
  for (let i = 0; i < p.length; i += 3) {
    const v = v1.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(view)
    const depth = -v.z
    if (depth <= 0 || depth >= camera.near) continue
    const c = v.applyMatrix4(proj)
    if (Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1) {
      clipped++
      box.expandByPoint(v2.set(p[i], p[i + 1], p[i + 2]))
    }
  }
  if (!clipped) return null
  const focus = box.getCenter(new Vector3())
  return {
    a: a.id, b: '(near plane)', labelA: a.label, labelB: 'camera near plane', objectA: a.object, objectB: 'camera',
    kind: 'nearclip', depth: 0, relative: 0, area: 0, pixels: clipped, support: false, visible: true, onScreen: true,
    focus: focus.toArray() as [number, number, number], radius: box.getSize(v1).length() / 2, segments: [],
  }
}

// --- connected components -----------------------------------------------------

// Split a merged mesh into its connected parts (by welded vertices), for
// batches that hold many separate things in one geometry.
export function splitComponents(input: PieceInput): PieceInput[] {
  const box = new Box3().setFromArray(input.positions)
  const { weld } = weldAndBoundary(input.positions, input.index, box)
  const tris = triangleCount(input)
  const parent = new Int32Array(weld.reduce((m, v) => Math.max(m, v), 0) + 1).map((_, i) => i)
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  const idx = input.index
  const vertex = (t: number, c: number) => (idx ? idx[t * 3 + c] : t * 3 + c)
  for (let t = 0; t < tris; t++) {
    const a = find(weld[vertex(t, 0)])
    const b = find(weld[vertex(t, 1)])
    const c = find(weld[vertex(t, 2)])
    parent[b] = a
    parent[find(c)] = find(a)
  }
  const groups = new Map<number, number[]>()
  for (let t = 0; t < tris; t++) {
    const root = find(weld[vertex(t, 0)])
    let list = groups.get(root)
    if (!list) groups.set(root, (list = []))
    list.push(t)
  }
  if (groups.size <= 1) return [input]
  const out: PieceInput[] = []
  let n = 0
  for (const list of groups.values()) {
    const positions = new Float32Array(list.length * 9)
    list.forEach((t, i) => {
      for (let c = 0; c < 3; c++) {
        const v = vertex(t, c)
        positions[i * 9 + c * 3] = input.positions[v * 3]
        positions[i * 9 + c * 3 + 1] = input.positions[v * 3 + 1]
        positions[i * 9 + c * 3 + 2] = input.positions[v * 3 + 2]
      }
    })
    out.push({ ...input, id: `${input.id}~${n}`, object: `${input.object}~${n}`, positions, index: null })
    n++
  }
  return out
}

// --- one moment ------------------------------------------------------------

export type PoseTrack = { min: number; max: number; flagged: boolean; limit: number; scale: number }

export type MomentOptions = {
  camera: CameraInfo
  viewSize: number
  tolerance?: Partial<Tolerance>
  // Pairs to leave alone entirely (checked against ids, labels, objects).
  skipPair?: (a: Piece, b: Piece) => boolean
  // Depths of same-object part pairs seen so far, keyed by pair, for pose.
  poseHistory?: Map<string, PoseTrack>
  // Results of pairs whose pieces have not moved since they were computed,
  // keyed by piece versions and the camera.
  cache?: ResultCache
}

export type ResultCache = { has(key: string): boolean; get(key: string): unknown; set(key: string, value: unknown): unknown }

function cameraKey(camera: CameraInfo): string {
  return camera.view.map((v) => v.toFixed(4)).join(',') + camera.projection.map((v) => v.toFixed(4)).join(',')
}

function cached<T>(options: MomentOptions, key: string, compute: () => T): T {
  if (!options.cache) return compute()
  if (options.cache.has(key)) return options.cache.get(key) as T
  const value = compute()
  options.cache.set(key, value)
  return value
}

export function isAncestor(a: string, b: string): boolean {
  const base = (s: string) => s.replace(/[#~].*$/, '')
  const x = base(a)
  const y = base(b)
  return x !== y && (y.startsWith(x + '/') || x.startsWith(y + '/'))
}

export function pairKey(kind: Kind, a: string, b: string): string {
  return a <= b ? `${kind}|${a}|${b}` : `${kind}|${b}|${a}`
}

export function analyseMoment(pieces: Piece[], options: MomentOptions): Finding[] {
  const tol = { ...DEFAULT_TOLERANCE, ...options.tolerance }
  const { camera, viewSize } = options
  const cam = options.cache ? cameraKey(camera) : ''
  const at = (p: Piece) => `${p.id}@${p.version ?? ''}`
  const findings: Finding[] = []
  const order = pieces.map((p) => ({ p, x: p.box.min.x })).sort((m, n) => m.x - n.x)
  for (let ii = 0; ii < order.length; ii++) {
    const a = order[ii].p
    for (let jj = ii + 1; jj < order.length; jj++) {
      const b = order[jj].p
      if (b.box.min.x > a.box.max.x) break
      if (!a.box.intersectsBox(b.box)) continue
      if (isAncestor(a.mesh, b.mesh)) continue
      if (options.skipPair?.(a, b)) continue
      const key = `${at(a)}|${at(b)}|${cam}`
      const [small, big] = a.scale <= b.scale ? [a, b] : [b, a]
      const zf = cached(options, 'z|' + key, () => zfightFinding(small, big, camera, tol))
      if (zf) findings.push(zf)
      if (a.object === b.object) {
        if (!options.poseHistory) continue
        const r = cached(options, 'd|' + key, () => pairDepth(a, b, camera))
        const depth = r ? r.depth : 0
        const limit = tolerance(a, b, viewSize, tol)
        const pk = pairKey('pose', a.id, b.id)
        const h = options.poseHistory.get(pk) ?? { min: Infinity, max: 0, flagged: false, limit, scale: Math.min(a.scale, b.scale) }
        h.min = Math.min(h.min, depth)
        h.max = Math.max(h.max, depth)
        options.poseHistory.set(pk, h)
        if (r && depth - h.min > limit && depth > limit) {
          h.flagged = true
          const { focus, radius } = centroidAndRadius(r.segments, r.point)
          const probe = r.segments.length ? spotsOf(r.segments) : [focus]
          const onScreen = probe.some((p) => pointVisible(p, camera).onScreen)
          findings.push({
            ...basePair(a, b), kind: 'pose', depth: depth - h.min, relative: (depth - h.min) / Math.min(a.scale, b.scale), area: 0,
            pixels: (depth - h.min) * pixelsPerUnit(focus, camera), support: false,
            visible: onScreen && probe.some((p) => pointVisible(p, camera).onScreen && !occluded(p, pieces, camera)), onScreen,
            focus: focus.toArray() as [number, number, number], radius: Math.max(radius, depth), segments: r.segments,
          })
        }
        continue
      }
      const r = cached(options, 'd|' + key, () => pairDepth(a, b, camera))
      const f = penetrationFinding(a, b, pieces, camera, viewSize, tol, r)
      if (f) findings.push(f)
    }
    const self = cached(options, `s|${at(a)}|${cam}`, () => zfightFinding(a, a, camera, tol))
    if (self) findings.push(self)
    const nc = cached(options, `n|${at(a)}|${cam}`, () => nearClipFinding(a, camera))
    if (nc) findings.push(nc)
  }
  return findings
}
