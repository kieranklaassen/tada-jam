import { Box3, DoubleSide, Line3, Matrix4, Object3D, Quaternion, Ray, Sphere, Triangle, Vector3, type BufferGeometry } from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import { describe, expect, it, vi } from 'vitest'
import { FeltAudio } from './audio'
import { MERGED_AT, pollenAt } from './bee'
import { BLUE, RED, YELLOW, type Hue } from './colors'
import { HELD_LIFT, MeadowController, REFILL_SECONDS, type Projector } from './controller'
import { Mouse, Snail } from './critters'
import { PETALS } from './flowers'
import { BURROW, BURROW_HOLE, BURROW_STAND, groundY, MOUSE_AREA, PLOTS, POUCH, POUCH_SLOTS, SEED_RADIUS, TUFT_MOUSE_BERTH, tuftFits, TUFTS, tuftSpots } from './layout'
import { defaultMeadow, deserialize, mixOf } from './meadow'
import { SEASON_LOOKS } from './season'
import {
  BEE_HEAD,
  beeBodyGeometry,
  beeHeadGeometry,
  burrowGeometry,
  centreGeometry,
  hillGeometry,
  MOUSE_HEAD,
  mouseBodyGeometry,
  mouseHeadGeometry,
  mouseTailGeometry,
  petalGeometry,
  pollenGeometry,
  pouchGeometry,
  seedGeometry,
  SLAB,
  snailBodyGeometry,
  snailShellGeometry,
  SNAIL_SHELL,
  tuftGeometry,
  wingGeometry,
} from './view/geometry'
import { beeHeadTurn, flowerHeadMatrix, petalMatrix, poseBee, poseMouse, poseSnail, pouchMatrix, seedMatrix, tuftMatrix, wingPose } from './view/poses'

// The meadow's moving pieces, posed from the controller's state exactly as the
// view draws them, checked for passing through each other the way the
// intersection audit measures it: how deep any vertex of one lies inside the
// other's closed mesh, in world units.

const FRAME = 1 / 60
/** The audit lets two pieces cross by this share of the smaller one's middle extent (its world bounding box). */
const ALLOWED = 0.06

/** Where the audit samples a piece for depth: its vertices and its faces' centres, as x, y, z runs. */
function samplesOf(geometry: BufferGeometry): Float32Array {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const faces = index ? index.count / 3 : position.count / 3
  const out = new Float32Array((position.count + faces) * 3)
  for (let i = 0; i < position.count; i++) out.set([position.getX(i), position.getY(i), position.getZ(i)], i * 3)
  for (let f = 0; f < faces; f++) {
    let x = 0
    let y = 0
    let z = 0
    for (let k = 0; k < 3; k++) {
      const v = index ? index.getX(f * 3 + k) : f * 3 + k
      x += position.getX(v) / 3
      y += position.getY(v) / 3
      z += position.getZ(v) / 3
    }
    out.set([x, y, z], (position.count + f) * 3)
  }
  return out
}

class Solid {
  readonly name: string
  readonly geometry: BufferGeometry
  readonly bvh: MeshBVH
  readonly bounds = new Sphere()
  readonly samples: Float32Array
  constructor(name: string, geometry: BufferGeometry) {
    this.name = name
    this.geometry = geometry
    this.bvh = new MeshBVH(geometry)
    geometry.boundsTree = this.bvh
    geometry.computeBoundingSphere()
    this.bounds.copy(geometry.boundingSphere as Sphere)
    this.samples = samplesOf(geometry)
  }
}

const RAYS = [new Vector3(0.31, 0.93, 0.19).normalize(), new Vector3(-0.83, 0.12, 0.55).normalize(), new Vector3(0.2, -0.45, -0.87).normalize()]
const ray = new Ray()
const inverse = new Matrix4()
const world = new Vector3()
const local = new Vector3()
const nearest = new Vector3()
const reach = new Sphere()
const hit = { point: new Vector3(), distance: 0, faceIndex: 0 }

function inside(solid: Solid, p: Vector3): boolean {
  let votes = 0
  for (const dir of RAYS) {
    ray.set(p, dir)
    if (solid.bvh.raycast(ray, DoubleSide).length % 2 === 1) votes++
  }
  return votes >= 2
}

/** How deep the deepest vertex of `a` (posed by `ma`) lies inside `b` (posed by `mb`), in world units. */
function depthInto(a: Solid, ma: Matrix4, b: Solid, mb: Matrix4): number {
  reach.copy(b.bounds).applyMatrix4(mb)
  inverse.copy(mb).invert()
  const position = a.geometry.getAttribute('position')
  let deepest = 0
  for (let i = 0; i < position.count; i++) {
    world.fromBufferAttribute(position, i).applyMatrix4(ma)
    if (world.distanceTo(reach.center) > reach.radius) continue
    local.copy(world).applyMatrix4(inverse)
    if (!inside(b, local)) continue
    b.bvh.closestPointToPoint(local, hit as never)
    deepest = Math.max(deepest, nearest.copy(hit.point).applyMatrix4(mb).distanceTo(world))
  }
  return deepest
}

const box = new Box3()
const size = new Vector3()

function middleExtent(solid: Solid, matrix: Matrix4): number {
  const position = solid.geometry.getAttribute('position')
  box.makeEmpty()
  for (let i = 0; i < position.count; i++) box.expandByPoint(world.fromBufferAttribute(position, i).applyMatrix4(matrix))
  const extents = box.getSize(size).toArray().sort((x, y) => x - y)
  return extents[1]
}

function depthBetween(a: Solid, ma: Matrix4, b: Solid, mb: Matrix4): number {
  return Math.max(depthInto(a, ma, b, mb), depthInto(b, mb, a, ma))
}

function allowance(a: Solid, ma: Matrix4, b: Solid, mb: Matrix4): number {
  return ALLOWED * Math.min(middleExtent(a, ma), middleExtent(b, mb))
}

/** How far two posed pieces cross, as a share of what the audit allows them: 1 or more is a finding. */
function crossing(a: Solid, ma: Matrix4, b: Solid, mb: Matrix4): number {
  const depth = depthBetween(a, ma, b, mb)
  return depth > 0 ? depth / allowance(a, ma, b, mb) : 0
}

const body = new Solid('body', beeBodyGeometry())
const face = new Solid('face', beeHeadGeometry())
const wing = new Solid('wing', wingGeometry())
const centre = new Solid('centre', centreGeometry())
const petal = new Solid('petal', petalGeometry())
const pollen = new Solid('pollen', pollenGeometry())
const ball = { x: 0, y: 0, z: 0 }
const offset = new Vector3()
const scale = new Vector3()
const still = new Quaternion()

/** The bee's pieces as the view nests them: body, head (turned inside it), and the two wings. */
class BeePose {
  readonly root = new Object3D()
  readonly head = new Object3D()
  readonly wings = [new Object3D(), new Object3D()]
  constructor() {
    this.head.position.set(0, BEE_HEAD.y, BEE_HEAD.z)
    this.root.add(this.head)
    for (const w of this.wings) this.root.add(w)
  }
  readonly pollen = [new Matrix4(), new Matrix4()]
  private balls = 0
  pose(c: MeadowController): void {
    poseBee(c.bee, this.root)
    beeHeadTurn(c.bee, this.head.rotation)
    for (let i = 0; i < 2; i++) wingPose(c.bee, i === 0 ? 1 : -1, this.wings[i].position, this.wings[i].rotation, this.wings[i].scale)
    this.root.updateMatrixWorld(true)
    const together = c.bee.merge >= MERGED_AT && mixOf(c.meadow) !== null
    this.balls = together ? 1 : c.meadow.pollen.length
    for (let i = 0; i < this.balls; i++) {
      const size = pollenAt(i === 0 ? 1 : -1, c.bee.merge, ball)
      this.pollen[i].compose(offset.set(ball.x, ball.y, ball.z), still, scale.set(size, size, size)).premultiply(this.root.matrixWorld)
    }
  }
  parts(): [Solid, Matrix4][] {
    const parts: [Solid, Matrix4][] = [
      [body, this.root.matrixWorld],
      [face, this.head.matrixWorld],
      [wing, this.wings[0].matrixWorld],
      [wing, this.wings[1].matrixWorld],
    ]
    for (let i = 0; i < this.balls; i++) parts.push([pollen, this.pollen[i]])
    return parts
  }
}

const HEAD = new Matrix4()
const PETAL_MATRICES = Array.from({ length: PETALS }, () => new Matrix4())
const headAt = { x: 0, y: 0, z: 0 }

/** The flower head at `plot`: its centre and petals, posed as the view poses them. */
function flowerParts(c: MeadowController, plot: number): [Solid, Matrix4][] {
  const flower = c.flowers[plot]
  flower.headAt(headAt)
  flowerHeadMatrix(flower, headAt, PLOTS[plot].x, PLOTS[plot].z, HEAD)
  const parts: [Solid, Matrix4][] = [[centre, HEAD]]
  for (let i = 0; i < PETALS; i++) parts.push([petal, petalMatrix(flower, i, HEAD, PETAL_MATRICES[i])])
  return parts
}

class Silent extends FeltAudio {
  override unlock(): void {}
}

function grownMeadow(hues: (Hue | null)[], childAge = 4): MeadowController {
  const meadow = deserialize({ ...defaultMeadow(), plots: hues })
  const controller = new MeadowController(meadow, { save: vi.fn(), sound: new Silent(), childAge })
  return controller
}

/** Deepest bee-through-flower crossing over `seconds`, split by whether the bee was on or over the flower it visits. */
function beeThroughFlowers(c: MeadowController, seconds: number): { visiting: number; flying: number; sat: number } {
  const bee = new BeePose()
  const result = { visiting: 0, flying: 0, sat: 0 }
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    c.update(FRAME)
    if (c.bee.sitting()) result.sat++
    bee.pose(c)
    for (let plot = 0; plot < PLOTS.length; plot++) {
      if (!c.flowers[plot].bloomed()) continue
      c.flowers[plot].headAt(headAt)
      if (Math.hypot(headAt.x - c.bee.x, headAt.y - c.bee.y, headAt.z - c.bee.z) > 24) continue
      const own = plot === c.bee.plot && (c.bee.mode === 'hover' || c.bee.sitting())
      for (const [a, ma] of bee.parts()) {
        for (const [b, mb] of flowerParts(c, plot)) {
          const depth = crossing(a, ma, b, mb)
          if (own) result.visiting = Math.max(result.visiting, depth)
          else result.flying = Math.max(result.flying, depth)
        }
      }
    }
  }
  return result
}

describe('the bee and the flowers', () => {
  it('sits on a flower on its feet: the face turns up level under it, and no part of the bee sinks into the felt', () => {
    const c = grownMeadow([RED, YELLOW, BLUE])
    const { visiting, sat } = beeThroughFlowers(c, 40)
    expect(sat).toBeGreaterThan(60 * 3)
    expect(visiting).toBeLessThan(1)
  }, 60_000)

  it('flies around or over every flower on its way, never through one', () => {
    const c = grownMeadow([RED, YELLOW, BLUE])
    const { flying } = beeThroughFlowers(c, 90)
    expect(flying).toBeLessThan(1)
  }, 60_000)

  it('carries the mixed seed as one ball clear of its belly, and lets it go from right there at its full size', () => {
    const c = grownMeadow([RED, null, BLUE])
    const bee = new BeePose()
    const dropped: { x: number; y: number; z: number }[] = []
    const seedsBefore = c.seeds.filter((seed) => seed.mode !== 'off').length
    let belly = 0
    let merged = 0
    let hanging = { x: 0, y: 0, z: 0 }
    for (let i = 0; i < 60 * 40 && dropped.length === 0; i++) {
      c.update(FRAME)
      const flying = c.seeds.filter((seed) => seed.mode === 'arc')
      if (c.seeds.filter((seed) => seed.mode !== 'off').length > seedsBefore && flying.length > 0) {
        dropped.push({ x: flying[0].x, y: flying[0].y, z: flying[0].z })
        expect(flying[0].grow.x).toBe(1)
        break
      }
      bee.pose(c)
      if (c.bee.merge < MERGED_AT) continue
      merged++
      // Before they merge, each ball is packed around a back leg's tip, as it should be.
      for (const [part, at] of bee.parts().slice(0, 2)) belly = Math.max(belly, crossing(pollen, bee.pollen[0], part, at))
      if (c.bee.merge >= 1) hanging = { x: bee.pollen[0].elements[12], y: bee.pollen[0].elements[13], z: bee.pollen[0].elements[14] }
    }
    expect(merged).toBeGreaterThan(10)
    expect(belly).toBeLessThan(1)
    expect(dropped).toHaveLength(1)
    expect(Math.hypot(dropped[0].x - hanging.x, dropped[0].y - hanging.y, dropped[0].z - hanging.z)).toBeLessThan(1.5)
  }, 60_000)

  it('flaps, folds its wings to sip, and giggles behind them without a wing sinking into its body or face', () => {
    // A wing root sits a little into the shoulder; the audit only minds a wing going deeper than that.
    const c = grownMeadow([RED, YELLOW, BLUE])
    const bee = new BeePose()
    const tracks = new Map<string, { min: number; max: number; limit: number }>()
    const variants = new Set<string>()
    for (let i = 0; i < 60 * 90; i++) {
      c.update(FRAME)
      if (i % (60 * 3) === 60 * 2) {
        c.bee.poke()
        if (c.bee.motion.poke) variants.add(c.bee.motion.poke)
      }
      bee.pose(c)
      const parts = bee.parts()
      for (const w of [2, 3]) {
        for (const p of [0, 1]) {
          const key = `${w}-${p}`
          const depth = depthBetween(parts[w][0], parts[w][1], parts[p][0], parts[p][1])
          const track = tracks.get(key) ?? { min: Infinity, max: 0, limit: allowance(parts[w][0], parts[w][1], parts[p][0], parts[p][1]) }
          track.min = Math.min(track.min, depth)
          track.max = Math.max(track.max, depth)
          tracks.set(key, track)
        }
      }
    }
    expect(variants).toEqual(new Set(['spin-hop', 'tumble', 'giggle']))
    for (const [key, track] of tracks) {
      expect(track.max - track.min, key).toBeLessThan(track.limit)
    }
  }, 60_000)
})

const closest = { point: new Vector3(), distance: 0, faceIndex: 0 }
const segment = new Line3()
const onSegment = new Vector3()
const triangle = new Triangle()
const facing = new Vector3()

/**
 * An open felt surface (the hill, the burrow) as the audit sees it: solid behind the front of its faces, and
 * undecided where the nearest point lies on a cut edge.
 */
class Surface {
  readonly bvh: MeshBVH
  readonly samples: Float32Array
  readonly scale: number
  private readonly corners: Vector3[]
  private readonly index: ArrayLike<number>
  private readonly weld: number[] = []
  private readonly boundary = new Set<number>()
  private readonly cells = new Map<number, number[]>()
  constructor(geometry: BufferGeometry) {
    this.bvh = new MeshBVH(geometry)
    const position = geometry.getAttribute('position')
    this.index = (geometry.getIndex() as NonNullable<ReturnType<BufferGeometry['getIndex']>>).array
    this.corners = Array.from({ length: position.count }, (_, i) => new Vector3().fromBufferAttribute(position, i))
    const ids = new Map<string, number>()
    for (const p of this.corners) {
      const key = `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)},${Math.round(p.z * 1e4)}`
      if (!ids.has(key)) ids.set(key, ids.size)
      this.weld.push(ids.get(key) as number)
    }
    const edges = new Map<number, number>()
    for (let f = 0; f < this.index.length; f += 3) {
      for (let k = 0; k < 3; k++) {
        const key = this.edgeKey(this.index[f + k], this.index[f + ((k + 1) % 3)])
        edges.set(key, (edges.get(key) ?? 0) + 1)
      }
    }
    for (const [key, count] of edges) if (count === 1) this.boundary.add(key)
    this.samples = samplesOf(geometry)
    for (let i = 0; i < this.samples.length; i += 3) {
      const cell = this.cellOf(this.samples[i], this.samples[i + 2])
      const list = this.cells.get(cell) ?? []
      list.push(i)
      this.cells.set(cell, list)
    }
    geometry.computeBoundingBox()
    this.scale = (geometry.boundingBox as Box3).getSize(size).toArray().sort((x, y) => x - y)[1]
  }

  /** How deep `p` lies behind the surface: 0 in front of it, or where its nearest point is on a cut edge. */
  depth(p: Vector3): number {
    if (!this.bvh.closestPointToPoint(p, closest as never, 0, 30)) return 0
    const f = closest.faceIndex * 3
    const a = this.index[f]
    const b = this.index[f + 1]
    const c = this.index[f + 2]
    triangle.set(this.corners[a], this.corners[b], this.corners[c])
    const eps = Math.max(triangle.a.distanceTo(triangle.b), triangle.b.distanceTo(triangle.c), triangle.c.distanceTo(triangle.a)) * 1e-3
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      if (!this.boundary.has(this.edgeKey(u, v))) continue
      segment.set(this.corners[u], this.corners[v]).closestPointToPoint(closest.point, true, onSegment)
      if (onSegment.distanceTo(closest.point) < eps) return 0
    }
    triangle.getNormal(facing)
    return world.copy(p).sub(closest.point).dot(facing) < 0 ? closest.distance : 0
  }

  /** Each of the surface's samples inside `within`. */
  samplesIn(within: Box3, visit: (p: Vector3) => void): void {
    const p = new Vector3()
    for (let cx = Math.floor(within.min.x / 4); cx <= Math.floor(within.max.x / 4); cx++) {
      for (let cz = Math.floor(within.min.z / 4); cz <= Math.floor(within.max.z / 4); cz++) {
        for (const i of this.cells.get(cx * 4096 + cz) ?? []) {
          p.set(this.samples[i], this.samples[i + 1], this.samples[i + 2])
          if (within.containsPoint(p)) visit(p)
        }
      }
    }
  }

  private edgeKey(u: number, v: number): number {
    const a = this.weld[u]
    const b = this.weld[v]
    return Math.min(a, b) * this.corners.length + Math.max(a, b)
  }

  private cellOf(x: number, z: number): number {
    return Math.floor(x / 4) * 4096 + Math.floor(z / 4)
  }
}

const hill = new Surface(hillGeometry(SEASON_LOOKS.winter))
const burrow = new Surface(burrowGeometry())
const SURFACES = [
  ['hill', hill],
  ['burrow', burrow],
] as const

function worldBox(solid: Solid, matrix: Matrix4, out: Box3): Box3 {
  const position = solid.geometry.getAttribute('position')
  out.makeEmpty()
  for (let i = 0; i < position.count; i++) out.expandByPoint(world.fromBufferAttribute(position, i).applyMatrix4(matrix))
  return out
}

const partBox = new Box3()
const groundPoint = new Vector3()
/** Where the deepest crossing of the measurement just taken was, from the burrow's middle, for a failing test to say. */
let deepestAt = ''

function noteDeepest(p: Vector3, what: string): void {
  deepestAt = `${what} ${Math.hypot(p.x - BURROW.x, p.z - BURROW.z).toFixed(1)} from the burrow, ${(p.y - groundY(p.x, p.z)).toFixed(1)} over the grass`
}

/**
 * How far the posed `part` and `surface` cross, the audit's way, as a share of what it allows: the part's samples
 * behind the surface, or the surface's inside the part. Only faces that cut each other count, so a part down the
 * burrow's hole is clear of the hill.
 */
function throughSurface(part: Solid, matrix: Matrix4, surface: Surface): number {
  if (!surface.bvh.intersectsGeometry(part.geometry, matrix)) return 0
  let deepest = 0
  const s = part.samples
  for (let i = 0; i < s.length; i += 3) {
    world.set(s[i], s[i + 1], s[i + 2]).applyMatrix4(matrix)
    // Nothing of the hill or the burrow's soil stands higher over the grass than this.
    if (world.y - groundY(world.x, world.z) > 2.5) continue
    const depth = surface.depth(groundPoint.copy(world))
    if (depth <= deepest) continue
    deepest = depth
    noteDeepest(groundPoint, `${part.name} point`)
  }
  inverse.copy(matrix).invert()
  surface.samplesIn(worldBox(part, matrix, partBox), (p) => {
    local.copy(p).applyMatrix4(inverse)
    if (!inside(part, local)) return
    part.bvh.closestPointToPoint(local, hit as never)
    const depth = nearest.copy(hit.point).applyMatrix4(matrix).distanceTo(p)
    if (depth <= deepest) return
    deepest = depth
    noteDeepest(p, 'ground point')
  })
  return deepest / (ALLOWED * Math.min(middleExtent(part, matrix), surface.scale))
}

const mouseBody = new Solid('mouse-body', mouseBodyGeometry())
const mouseHead = new Solid('mouse-head', mouseHeadGeometry())
const mouseTail = new Solid('mouse-tail', mouseTailGeometry())

/** The mouse's pieces as the view nests them: the body and head on the rearing tilt, and the tail on its rump. */
class MousePose {
  readonly root = new Object3D()
  readonly tilt = new Object3D()
  readonly head = new Object3D()
  readonly tail = new Object3D()
  private readonly body = new Object3D()
  constructor() {
    this.body.position.z = 2.4
    this.head.position.set(0, MOUSE_HEAD.y, MOUSE_HEAD.z + 2.4)
    this.tilt.add(this.body, this.head, this.tail)
    this.root.add(this.tilt)
  }
  pose(mouse: Mouse): void {
    poseMouse(mouse, this)
    this.root.updateMatrixWorld(true)
  }
  parts(): [Solid, Matrix4][] {
    return [
      [mouseBody, this.body.matrixWorld],
      [mouseHead, this.head.matrixWorld],
      [mouseTail, this.tail.matrixWorld],
    ]
  }
}

const snailBody = new Solid('snail-body', snailBodyGeometry())
const snailShell = new Solid('snail-shell', snailShellGeometry())

class SnailPose {
  readonly root = new Object3D()
  readonly body = new Object3D()
  readonly shell = new Object3D()
  constructor() {
    this.shell.position.set(0, SNAIL_SHELL.y, SNAIL_SHELL.z)
    this.root.add(this.body, this.shell)
  }
  pose(snail: Snail): void {
    poseSnail(snail, this)
    this.root.updateMatrixWorld(true)
  }
  parts(): [Solid, Matrix4][] {
    return [
      [snailBody, this.body.matrixWorld],
      [snailShell, this.shell.matrixWorld],
    ]
  }
}

const tuft = new Solid('tuft', tuftGeometry())
const TUFT_MATRICES = tuftSpots(TUFTS).map((spot) => ({ spot, matrix: tuftMatrix(spot, new Matrix4()) }))

type Worst = Map<string, { ratio: number; at: string }>

let moment = ''

function note(worst: Worst, key: string, ratio: number): void {
  if (ratio > (worst.get(key)?.ratio ?? 0)) worst.set(key, { ratio, at: deepestAt ? `${moment}; ${deepestAt}` : moment })
  else if (!worst.has(key)) worst.set(key, { ratio: 0, at: '' })
  deepestAt = ''
}

/** Each posed part against the hill, the burrow, and any grass tussock near it, noted under `phase`. */
function onTheHill(worst: Worst, phase: string, parts: [Solid, Matrix4][], x: number, z: number): void {
  for (const [part, matrix] of parts) {
    for (const [name, surface] of SURFACES) note(worst, `${phase} ${part.name} × ${name}`, throughSurface(part, matrix, surface))
    for (const { spot, matrix: at } of TUFT_MATRICES) {
      if (Math.hypot(spot.x - x, spot.z - z) < 16) note(worst, `${phase} ${part.name} × tuft`, crossing(part, matrix, tuft, at))
    }
  }
}

/**
 * The mouse and the snail over a long meadow life (the mouse poked now and then, its burrow knocked while it is
 * home), each part's deepest crossing with the hill, the burrow, a tussock, and the other critter, as shares of what
 * the audit allows, by what the mouse was doing.
 */
function crittersLife(seconds: number): { worst: Worst; modes: Set<string>; dives: number; spots: [number, number][] } {
  const c = grownMeadow([RED, YELLOW, BLUE])
  const mouse = new MousePose()
  const snail = new SnailPose()
  const worst: Worst = new Map()
  const modes = new Set<string>()
  const spots: [number, number][] = []
  let dives = 0
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    const was = c.mouse.mode
    c.update(FRAME)
    if (c.mouse.mode === 'dive' && was !== 'dive') dives++
    if (i % 170 === 169) {
      if (c.mouse.visible()) c.mouse.poke()
      else c.mouse.knock()
    }
    if (i % 6 === 0) {
      moment = `snail ${c.snail.mode} at x ${c.snail.x.toFixed(1)}, z ${c.snail.z.toFixed(1)}`
      snail.pose(c.snail)
      onTheHill(worst, 'snail', snail.parts(), c.snail.x, c.snail.z)
    }
    if (!c.mouse.visible()) continue
    modes.add(c.mouse.mode)
    const m = c.mouse
    moment = `${m.mode} ${m.motion.poke ?? m.motion.delight ?? ''} ${m.modeT.toFixed(2)} s in, out ${m.out.toFixed(2)}, sat up ${m.rear.toFixed(2)}`
    const phase = c.mouse.mode === 'dive' || c.mouse.mode === 'emerge' ? c.mouse.mode : 'about'
    if (phase === 'about' && i % 3 !== 0) continue
    mouse.pose(c.mouse)
    if (phase === 'about') spots.push([m.x, m.z])
    onTheHill(worst, phase, mouse.parts(), mouse.root.position.x, mouse.root.position.z)
    if (Math.hypot(c.mouse.x - c.snail.x, c.mouse.z - c.snail.z) < 24) {
      snail.pose(c.snail)
      for (const [a, ma] of mouse.parts()) for (const [b, mb] of snail.parts()) note(worst, `${phase} ${a.name} × ${b.name}`, crossing(a, ma, b, mb))
    }
  }
  return { worst, modes, dives, spots }
}

/** How a dive or an outing may start: the stand spot a little near or far, a sit-up not quite let go, a tail mid-swing. */
const DIVE_VARIANTS = [
  { off: 0, rear: 0, t: 0 },
  { off: -0.6, rear: 0.12, t: 0.4 },
  { off: 0.6, rear: 0.12, t: 1.3 },
]

/** The mouse diving in and coming out, headed `yaws` ways round, `frames` poses each, against the hill and the burrow. */
function diveWorst(yaws: number, frames: number): Worst {
  const pose = new MousePose()
  const worst: Worst = new Map()
  for (let k = 0; k < yaws; k++) {
    const yaw = (k / yaws) * Math.PI * 2
    for (const mode of ['dive', 'emerge'] as const) {
      for (const { off, rear, t } of DIVE_VARIANTS) {
        const dive = mode === 'dive'
        const m = { mode, out: 0, x: BURROW.x, z: BURROW.z, yaw, hop: 0, rear, stretch: dive ? 0.3 : 0, groom: 0, sniff: 0, look: 0.3, t, tailFlick: 0 } as unknown as Mouse
        if (dive) {
          m.x = BURROW.x - Math.sin(yaw) * (BURROW_STAND + off)
          m.z = BURROW.z - Math.cos(yaw) * (BURROW_STAND + off)
        }
        for (let f = 0; f <= frames; f++) {
          const p = f / frames
          m.out = dive ? 1 - p : p
          pose.pose(m)
          moment = `${mode} p${p.toFixed(2)} yaw${yaw.toFixed(2)} off${off} rear${rear} t${t}`
          for (const [part, matrix] of pose.parts()) for (const [name, surface] of SURFACES) note(worst, `${mode} ${part.name} × ${name}`, throughSurface(part, matrix, surface))
        }
      }
    }
  }
  return worst
}

function expectClear(worst: Worst): void {
  expect(worst.size).toBeGreaterThan(0)
  for (const [key, { ratio, at }] of worst) expect(ratio, `${key} at ${at}`).toBeLessThan(1)
}

describe('the mouse, its burrow, the snail, and the grass', () => {
  it('has a real hole for a burrow: looking down, every spot round it meets grass, soil, or the shaft floor, and nothing of the hill is left over the shaft', () => {
    const down = new Vector3(0, -1, 0)
    const { shaft, depth, ring, tube } = BURROW_HOLE
    let spots = 0
    for (let x = -10; x <= 10; x += 0.37) {
      for (let z = -10; z <= 10; z += 0.37) {
        const r = Math.hypot(x, z)
        if (r > ring + tube + 3) continue
        const px = BURROW.x + x
        const pz = BURROW.z + z
        ray.set(new Vector3(px, groundY(px, pz) + 20, pz), down)
        const onHill = hill.bvh.raycastFirst(ray, DoubleSide)
        const onBurrow = burrow.bvh.raycastFirst(ray, DoubleSide)
        expect(onHill ?? onBurrow, `a see-through gap ${r.toFixed(2)} from the burrow`).toBeTruthy()
        if (r < shaft - 0.05) {
          expect(onHill, `hill over the shaft ${r.toFixed(2)} from its middle`).toBeNull()
          expect((onBurrow as { point: Vector3 }).point.y).toBeLessThan(groundY(px, pz) - depth + 0.5)
        }
        spots++
      }
    }
    expect(spots).toBeGreaterThan(1000)
  })

  it('lines the shaft with felt that faces the hole, so the audit and the light see its inside, and ends it above the paper floor', () => {
    const geometry = burrowGeometry()
    const position = geometry.getAttribute('position')
    const index = geometry.getIndex() as NonNullable<ReturnType<BufferGeometry['getIndex']>>
    for (let i = 0; i < position.count; i++) expect(position.getY(i)).toBeGreaterThan(SLAB.bottom + 1)
    let walls = 0
    for (let f = 0; f < index.count; f += 3) {
      triangle.setFromAttributeAndIndices(position, index.getX(f), index.getX(f + 1), index.getX(f + 2))
      triangle.getMidpoint(world)
      const r = Math.hypot(world.x - BURROW.x, world.z - BURROW.z)
      if (Math.abs(r - BURROW_HOLE.shaft) > 0.1 || world.y > groundY(world.x, world.z) - 2) continue
      triangle.getNormal(facing)
      expect(facing.x * (BURROW.x - world.x) + facing.z * (BURROW.z - world.z)).toBeGreaterThan(0)
      walls++
    }
    expect(walls).toBeGreaterThan(20)
  })

  it('dives head first down its burrow and climbs out nose first, clear of the soil ring, the shaft, and the grass, whichever way it faces', () => {
    expectClear(diveWorst(16, 30))
  }, 120_000)

  it('lives a long meadow life (darting, sitting up, poked, knocked for) without passing through the hill, its burrow, a tussock, or the snail, and the snail glides flat on the slope', () => {
    const { worst, modes, dives, spots } = crittersLife(200)
    expect(modes).toEqual(new Set(['emerge', 'dart', 'freeze', 'rear', 'poked', 'flee', 'dive']))
    expect(dives).toBeGreaterThan(4)
    expectClear(worst)
    for (const [x, z] of spots) {
      expect(x).toBeGreaterThanOrEqual(MOUSE_AREA.left - 0.5)
      expect(x).toBeLessThanOrEqual(MOUSE_AREA.right + 0.5)
      expect(z).toBeGreaterThanOrEqual(MOUSE_AREA.far - 0.5)
      expect(z).toBeLessThanOrEqual(MOUSE_AREA.near + 0.5)
    }
  }, 300_000)

  it('keeps every grass tussock out of the mouse run, the snail path, the bushes, and the stones, and still grows most of them', () => {
    const tufts = tuftSpots(TUFTS)
    expect(tufts.length).toBeGreaterThan(TUFTS * 0.8)
    for (const { x, z } of tufts) {
      expect(tuftFits(x, z)).toBe(true)
      const m = TUFT_MOUSE_BERTH
      expect(x > MOUSE_AREA.left - m && x < MOUSE_AREA.right + m && z > MOUSE_AREA.far - m && z < MOUSE_AREA.near + m).toBe(false)
    }
  })
})

/** The audit's depth resolution this far from the camera, about: faces nearer each other than this fight. */
const FIGHT_GAP = 0.01
const PARALLEL = Math.cos((1.5 * Math.PI) / 180)

/** Do two coplanar triangles, seen along `normal`, cover some of the same area (more than touching)? */
function overlapFlat(a: Triangle, b: Triangle, normal: Vector3): boolean {
  const drop = Math.abs(normal.x) > Math.abs(normal.y) ? (Math.abs(normal.x) > Math.abs(normal.z) ? 0 : 2) : Math.abs(normal.y) > Math.abs(normal.z) ? 1 : 2
  const flat = (t: Triangle) => [t.a, t.b, t.c].map((p) => p.toArray().filter((_, k) => k !== drop))
  const pa = flat(a)
  const pb = flat(b)
  for (const poly of [pa, pb]) {
    for (let k = 0; k < 3; k++) {
      const [x0, y0] = poly[k]
      const [x1, y1] = poly[(k + 1) % 3]
      const nx = y1 - y0
      const ny = x0 - x1
      const along = (p: number[]) => p[0] * nx + p[1] * ny
      const sa = pa.map(along)
      const sb = pb.map(along)
      const slack = 1e-4 * Math.hypot(nx, ny)
      if (Math.max(...sa) <= Math.min(...sb) + slack || Math.max(...sb) <= Math.min(...sa) + slack) return false
    }
  }
  return true
}

/** Where two faces of `geometry` that share no corner lie in one plane over each other, which the audit calls a z-fight. */
function overlappingFaces(bvh: MeshBVH): string[] {
  const geometry = bvh.geometry
  const position = geometry.getAttribute('position')
  const index = (geometry.getIndex() as NonNullable<ReturnType<BufferGeometry['getIndex']>>).array
  const ids = new Map<string, number>()
  const weld = Array.from({ length: position.count }, (_, i) => {
    const key = [position.getX(i), position.getY(i), position.getZ(i)].map((v) => Math.round(v * 1e4)).join()
    if (!ids.has(key)) ids.set(key, ids.size)
    return ids.get(key) as number
  })
  const a = new Triangle()
  const na = new Vector3()
  const nb = new Vector3()
  const around = new Box3()
  const found: string[] = []
  for (let f = 0; f < index.length / 3; f++) {
    a.setFromAttributeAndIndices(position, index[f * 3], index[f * 3 + 1], index[f * 3 + 2])
    if (a.getArea() < 1e-9) continue
    a.getNormal(na)
    const corners = [0, 1, 2].map((k) => weld[index[f * 3 + k]])
    around.setFromPoints([a.a, a.b, a.c]).expandByScalar(FIGHT_GAP)
    bvh.shapecast({
      intersectsBounds: (bounds) => bounds.intersectsBox(around),
      intersectsTriangle: (b, g) => {
        if (g <= f || [0, 1, 2].some((k) => corners.includes(weld[index[g * 3 + k]]))) return false
        if (b.getArea() < 1e-9) return false
        b.getNormal(nb)
        if (Math.abs(na.dot(nb)) < PARALLEL) return false
        if ([b.a, b.b, b.c].some((p) => Math.abs(na.dot(world.subVectors(p, a.a))) > FIGHT_GAP)) return false
        if (overlapFlat(a, b, na)) found.push(`faces ${f} and ${g} at ${a.getMidpoint(world).toArray().map((v) => v.toFixed(1))}`)
        return false
      },
    })
  }
  return found
}

describe('the hill', () => {
  it('never lays one of its faces over another, so no part of the felt fights itself: not round the burrow, not along the tucked-under sides', () => {
    expect(overlappingFaces(hill.bvh)).toEqual([])
  })
})

/** A tilted orthographic camera for the child's finger: 4 px per world unit, looking down the slope. */
const FINGER_VIEW: Projector = {
  project: (x, y, z, out) => {
    out.x = 600 + x * 4
    out.y = 400 + (z - y * 0.6) * 4
    return out
  },
  ground: (px, py, lift, out) => {
    const x = (px - 600) / 4
    const v = (py - 400) / 4
    let z = v
    for (let i = 0; i < 12; i++) z = v + 0.6 * (groundY(x, z) + lift)
    out.x = x
    out.z = z
    return out
  },
  pixelsPerUnit: () => 4,
}

const pouchFelt = new Solid('pouch', pouchGeometry())
const seedBall = new Solid('seed', seedGeometry())

describe('the pouch and its seeds', () => {
  it('holds its three seeds in its mouth clear of its felt and of each other: resting, breathing, offered, wiggled, and popping back in after each is planted', () => {
    const c = grownMeadow([null, null, null])
    c.attach(FINGER_VIEW)
    const pouchAt = new Matrix4()
    const toPouch = new Matrix4()
    const inFelt = new Matrix4()
    const seats = [new Matrix4(), new Matrix4(), new Matrix4()]
    const through: string[] = []
    let pair = 0
    let grown = 0
    let clock = 0
    const step = (seconds: number) => {
      for (let i = 0; i < Math.round(seconds / FRAME); i++) {
        c.update(FRAME)
        clock += FRAME * 1000
        toPouch.copy(pouchMatrix(c.pouchPose, pouchAt)).invert()
        const posed = c.slotSeed.map((seed, slot) => (seed?.mode === 'pouch' ? seedMatrix(seed, seats[slot]) : null))
        posed.forEach((m, slot) => {
          if (!m) return
          const seed = c.slotSeed[slot] as NonNullable<(typeof c.slotSeed)[number]>
          grown = Math.max(grown, seed.grow.x)
          if (pouchFelt.bvh.intersectsGeometry(seedBall.geometry, inFelt.multiplyMatrices(toPouch, m))) through.push(`seed ${slot} at ${c.t.toFixed(2)} s, grown ${seed.grow.x.toFixed(2)}`)
        })
        for (let a = 0; a < 3; a++) {
          for (let b = a + 1; b < 3; b++) {
            const ma = posed[a]
            const mb = posed[b]
            if (ma && mb) pair = Math.max(pair, crossing(seedBall, ma, seedBall, mb))
          }
        }
      }
    }
    const screen = (x: number, y: number, z: number) => FINGER_VIEW.project(x, y, z, { x: 0, y: 0 })
    step(1.5)
    const pouch = screen(POUCH.x, groundY(POUCH.x, POUCH.z) + 2, POUCH.z + 5)
    c.pointerDown(7, pouch.x, pouch.y, clock)
    step(0.08)
    c.pointerUp(7, clock)
    step(2.5)
    for (let slot = 0; slot < 3; slot++) {
      const from = screen(POUCH_SLOTS[slot].x, POUCH_SLOTS[slot].y, POUCH_SLOTS[slot].z)
      const plot = PLOTS[slot]
      const to = screen(plot.x, groundY(plot.x, plot.z) + SEED_RADIUS + HELD_LIFT, plot.z)
      c.pointerDown(1, from.x, from.y, clock)
      for (let k = 1; k <= 12; k++) {
        c.pointerMove(1, from.x + ((to.x - from.x) * k) / 12, from.y + ((to.y - from.y) * k) / 12)
        step(FRAME)
      }
      step(0.2)
      c.pointerUp(1, clock)
      step(REFILL_SECONDS + 1.5)
    }
    expect(c.meadow.plots.every((hue) => hue !== null)).toBe(true)
    expect(grown).toBeGreaterThan(1.1)
    expect(through).toEqual([])
    expect(pair).toBeLessThan(1)
  }, 60_000)
})
