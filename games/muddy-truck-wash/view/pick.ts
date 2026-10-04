import * as THREE from 'three'
import type { Target } from '../play'
import { ROLLER_REACH } from '../place'
import { LAYOUT, TOOL_HOME, TOOL_MIDDLE } from '../props'
import type { VehicleDef, VehicleId } from '../roster'
import { patchAt, proudAt, silhouette } from '../silhouette'
import { rayMeets, solidOf } from '../solid'
import { GRID_H, GRID_W, cellAt, type Surface, type Tool } from '../surface'

// What a finger is on. First, whatever is drawn under it: of the solid things
// the finger's ray meets (the four vehicles, each on the triangles it is
// drawn from; the roller, the pinwheel, the lamp, the shelf), the one nearest
// the eye, so nothing answers for a thing that is drawn in front of it. Then, where nothing solid is under the
// finger, generous on purpose: a tool answers within a wide circle, and a
// touch just off the vehicle's edge counts as its nearest patch (pack:
// game-design, ages-2-to-4.md).

/** A tool answers a touch within this many logical pixels of its middle at most, so its target is up to 124 across, and never so far that two tools' circles come within this many pixels of each other. */
const TOOL_REACH = 62
const TOOL_GAP = 14
/** A tool in hand that waits by the vehicle answers within this many logical pixels of where it is drawn. */
const HELD_REACH = 46
/** The tap answers a touch within this many logical pixels of its body. */
const TAP_REACH = 52
/** The puddle answers a touch within this many logical pixels of its middle. */
const PUDDLE_REACH = 66
/** One that waits in the queue answers within this many logical pixels of its middle; it stands far back, so it is small on the glass. */
const QUEUE_REACH = 64
/** The roller brush, the pinwheel and the lamp answer within this many logical pixels, and the shelf within this many above and below its things. */
const BIT_REACH = 52
const SHELF_REACH = 46
/** The depth of the side itself, where a touch just off the edge is measured. */
const SIDE = 0.92

export type Standing = { def: VehicleDef; x: number; z: number; surface: Surface }
/** One that waits in the yard: where it stands, how high the ground is there, and how far it is turned. */
export type Waiting = { def: VehicleDef; x: number; z: number; ground: number; turn: number }

type Hit = { t: number; col: number; row: number; x: number; y: number }

const bodies = new Map<VehicleId, Surface>()
/** Where a vehicle has body, whatever is on it. */
function bodyOf(def: VehicleDef): Surface {
  let body = bodies.get(def.id)
  if (!body) bodies.set(def.id, (body = silhouette(def)))
  return body
}

export class Picker {
  private readonly ray = new THREE.Raycaster()
  private readonly ndc = new THREE.Vector2()
  private readonly point = new THREE.Vector3()
  private readonly ball = new THREE.Sphere()
  private readonly box = new THREE.Box3()

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  /** Where a world point is on the surface, in logical pixels. */
  project(x: number, y: number, z: number, width: number, height: number): { x: number; y: number } {
    this.point.set(x, y, z).project(this.camera)
    return { x: (this.point.x * 0.5 + 0.5) * width, y: (0.5 - this.point.y * 0.5) * height }
  }

  /**
   * Where the finger's ray first meets a vehicle, on the very triangles it is drawn from, and which patch of its side
   * that point belongs to. The vehicle stands at (x, ground, z), turned by `turn`.
   */
  private meets(def: VehicleDef, body: Surface, x: number, ground: number, z: number, turn: number): Hit | null {
    const o = this.ray.ray.origin, d = this.ray.ray.direction
    // The ray in the vehicle's own space: turned back by its turn about where it stands.
    const c = Math.cos(turn), s = Math.sin(turn)
    const ox = (o.x - x) * c - (o.z - z) * s, oy = o.y - ground, oz = (o.x - x) * s + (o.z - z) * c
    const dx = d.x * c - d.z * s, dy = d.y, dz = d.x * s + d.z * c
    const hit = rayMeets(solidOf(def), ox, oy, oz, dx, dy, dz)
    let first: Hit | null = null
    if (hit) {
      // The patch of the side that point is on. A thin part that is drawn across the edge of the grid's patches (a roof's far edge, a rail) belongs to the patch of body nearest it.
      const at = patchAt(def, hit.x, hit.y)
      const patch = at && body[cellAt(at.col, at.row)] !== '.' ? at : this.closest(def, body, hit.x, hit.y)
      if (patch) first = { t: hit.t, ...patch, x: hit.x, y: hit.y }
    }
    // A patch of body is the vehicle all over, at the depth it stands at, though what is drawn there has gaps: between the
    // rungs of a ladder, between the posts of a cab. A finger in such a gap is on that patch, not on what shows through it.
    for (let row = 0; row < GRID_H; row++) for (let col = 0; col < GRID_W; col++) {
      if (body[cellAt(col, row)] === '.') continue
      const t = (proudAt(def, col, row) - oz) / dz
      if (!(t > 0) || (first && t >= first.t)) continue
      const px = ox + dx * t, py = oy + dy * t
      const at = patchAt(def, px, py)
      if (at && at.col === col && at.row === row) first = { t, col, row, x: px, y: py }
    }
    return first
  }

  /** The patch of body nearest a point of the side, however far. */
  private closest(def: VehicleDef, body: Surface, x: number, y: number): { col: number; row: number } | null {
    const side = def.side
    const fc = ((x - side.x0) / (side.x1 - side.x0)) * GRID_W, fr = ((y - side.y0) / (side.y1 - side.y0)) * GRID_H
    let best: { col: number; row: number } | null = null, least = Infinity
    for (let row = 0; row < GRID_H; row++) for (let col = 0; col < GRID_W; col++) {
      if (body[cellAt(col, row)] === '.') continue
      const gap = Math.hypot(col + 0.5 - fc, row + 0.5 - fr)
      if (gap < least) { least = gap; best = { col, row } }
    }
    return best
  }

  /** How far along the finger's ray a ball is met, or Infinity. */
  private toBall(x: number, y: number, z: number, radius: number): number {
    this.ball.center.set(x, y, z)
    this.ball.radius = radius
    const at = this.ray.ray.intersectSphere(this.ball, this.point)
    return at ? at.distanceTo(this.ray.ray.origin) : Infinity
  }

  /** `held` is the tool in hand and where it is drawn, while it waits by the vehicle off the paint. */
  pick(px: number, py: number, width: number, height: number, bay: Standing | null, next: Standing | null, queue: readonly Waiting[] = [], held: { tool: Tool; x: number; y: number; z: number } | null = null): Target {
    // Each tool answers within a circle of its middle. On a smaller surface the tools hang closer on the glass, and the
    // circles shrink with them, so there is always ground between two tools that is neither.
    const tools = (['sponge', 'hose', 'cloth'] as Tool[]).map((tool) => {
      const home = TOOL_HOME[tool], mid = TOOL_MIDDLE[tool]
      return { tool, at: this.project(home[0] + mid[0], home[1] + mid[1], home[2] + mid[2], width, height) }
    })
    let between = Infinity
    for (let i = 0; i < tools.length; i++) for (let j = i + 1; j < tools.length; j++) between = Math.min(between, Math.hypot(tools[i].at.x - tools[j].at.x, tools[i].at.y - tools[j].at.y))
    const reach = Math.min(TOOL_REACH, between / 2 - TOOL_GAP / 2)
    for (const { tool, at } of tools) if (Math.hypot(at.x - px, at.y - py) <= reach) return { kind: 'tool', tool }
    // The tool in hand, where it waits above the vehicle: it is a tool there too, and a touch on it is a touch on that tool.
    if (held) {
      const at = this.project(held.x, held.y, held.z, width, height)
      if (Math.hypot(at.x - px, at.y - py) <= HELD_REACH) return { kind: 'tool', tool: held.tool }
    }
    const tap = this.project(LAYOUT.tap.x, LAYOUT.tap.hang - 0.24, LAYOUT.tap.z, width, height)
    if (Math.hypot(tap.x - px, tap.y - py) <= TAP_REACH) return { kind: 'tap' }
    this.ndc.set((px / width) * 2 - 1, 1 - (py / height) * 2)
    this.ray.setFromCamera(this.ndc, this.camera)
    const o = this.ray.ray.origin, d = this.ray.ray.direction

    // What is drawn under the finger: the nearest solid thing along its ray.
    let nearest = Infinity, found: Target = { kind: 'none' }
    const take = (t: number, target: Target): void => { if (t < nearest) { nearest = t; found = target } }
    const onBay = bay ? this.meets(bay.def, bay.surface, bay.x, 0, bay.z, 0) : null
    if (onBay) take(onBay.t, { kind: 'truck', col: onBay.col, row: onBay.row, x: onBay.x, y: onBay.y })
    const onNext = next ? this.meets(next.def, bodyOf(next.def), next.x, 0, next.z, 0) : null
    if (onNext) take(onNext.t, { kind: 'next' })
    queue.forEach((who, place) => {
      const hit = this.meets(who.def, bodyOf(who.def), who.x, who.ground, who.z, who.turn)
      if (hit) take(hit.t, { kind: 'queue', place })
    })
    const roller = LAYOUT.roller
    for (let y = roller.y0 + ROLLER_REACH; y < roller.y1; y += ROLLER_REACH * 1.2) take(this.toBall(roller.x, y, roller.z, ROLLER_REACH + 0.05), { kind: 'bit', bit: 'roller' })
    take(this.toBall(LAYOUT.pinwheel.x, LAYOUT.pinwheel.y, LAYOUT.pinwheel.z, 0.6), { kind: 'bit', bit: 'pinwheel' })
    // The suds bucket: its sides and its suds, under the sponge's own circle.
    take(this.toBall(LAYOUT.rack.x + LAYOUT.bucket.dx, LAYOUT.bucket.top * 0.55, LAYOUT.rack.z, LAYOUT.bucket.r), { kind: 'bucket' })
    take(this.toBall(LAYOUT.lamp.x, LAYOUT.lamp.y + 0.14, LAYOUT.lamp.z, 0.5), { kind: 'bit', bit: 'lamp' })
    const shelf = LAYOUT.shelf, back = LAYOUT.wall.z
    this.box.min.set(shelf.x - shelf.w / 2, shelf.y - 0.05, back)
    this.box.max.set(shelf.x + shelf.w / 2, shelf.y + 0.82, back + 0.48)
    const onShelf = this.ray.ray.intersectBox(this.box, this.point)
    if (onShelf) take(onShelf.distanceTo(o), { kind: 'bit', bit: 'shelf' })
    if (nearest < Infinity) return found

    // Nothing solid is under the finger. A touch just off the edge of the vehicle in the bay is a touch on it.
    if (bay) {
      const t = (bay.z + SIDE - o.z) / d.z
      if (t > 0) {
        const near = this.nearest(bay, o.x + d.x * t - bay.x, o.y + d.y * t)
        if (near) return { kind: 'truck', ...near }
      }
    }
    // The puddle lies flat and is seen from low down, so it is a thin shape on the glass: it answers within a wide circle of its middle.
    const puddle = this.project(LAYOUT.puddle.x, 0, LAYOUT.puddle.z, width, height)
    if (Math.hypot(puddle.x - px, puddle.y - py) <= PUDDLE_REACH) return { kind: 'puddle' }
    // The two that wait in the yard and the pieces of the place answer a little way off their own shape too.
    for (let place = 0; place < queue.length; place++) {
      const at = this.project(queue[place].x, queue[place].ground + 1.3, queue[place].z, width, height)
      if (Math.hypot(at.x - px, at.y - py) <= QUEUE_REACH) return { kind: 'queue', place }
    }
    const top = this.project(roller.x, roller.y1 - 0.5, roller.z, width, height), low = this.project(roller.x, roller.y1 - 1.5, roller.z, width, height)
    if (Math.hypot(top.x - px, top.y - py) <= BIT_REACH || Math.hypot(low.x - px, low.y - py) <= BIT_REACH) return { kind: 'bit', bit: 'roller' }
    const pin = this.project(LAYOUT.pinwheel.x, LAYOUT.pinwheel.y, LAYOUT.pinwheel.z, width, height)
    if (Math.hypot(pin.x - px, pin.y - py) <= BIT_REACH) return { kind: 'bit', bit: 'pinwheel' }
    const lamp = this.project(LAYOUT.lamp.x, LAYOUT.lamp.y + 0.12, LAYOUT.lamp.z, width, height)
    if (Math.hypot(lamp.x - px, lamp.y - py) <= BIT_REACH) return { kind: 'bit', bit: 'lamp' }
    const z = LAYOUT.wall.z + 0.24
    const left = this.project(shelf.x - shelf.w / 2, shelf.y + 0.38, z, width, height), right = this.project(shelf.x + shelf.w / 2, shelf.y + 0.38, z, width, height)
    if (px >= left.x - 12 && px <= right.x + 12) {
      const along = (px - left.x) / Math.max(1, right.x - left.x)
      if (Math.abs(py - (left.y + (right.y - left.y) * Math.max(0, Math.min(1, along)))) <= SHELF_REACH) return { kind: 'bit', bit: 'shelf' }
    }
    // The bare floor in front of the wall.
    if (d.y < 0) {
      const t = -o.y / d.y, x = o.x + d.x * t, z = o.z + d.z * t
      if (z > LAYOUT.wall.z + 0.2) return { kind: 'floor', x, z }
    }
    // The bay's back wall, or past the door the air over the yard: the point under the finger, so the knock can be seen there.
    const toWall = (LAYOUT.wall.z + 0.05 - o.z) / d.z, wx = o.x + d.x * toWall
    if (toWall > 0 && wx <= LAYOUT.yardFrom) return { kind: 'none', at: [wx, o.y + d.y * toWall, LAYOUT.wall.z + 0.05] }
    const far = (-7 - o.z) / d.z
    if (far > 0) return { kind: 'none', at: [o.x + d.x * far, Math.max(0.2, o.y + d.y * far), -7] }
    return { kind: 'none' }
  }

  /** A touch just off the body takes the patch of body beside it, when there is one within a patch. */
  private nearest(bay: Standing, x: number, y: number): { col: number; row: number; x: number; y: number } | null {
    const side = bay.def.side
    const fc = ((x - side.x0) / (side.x1 - side.x0)) * GRID_W, fr = ((y - side.y0) / (side.y1 - side.y0)) * GRID_H
    // Within four fifths of a patch: generous, and still short of the vehicle that waits behind its tail.
    let best: { col: number; row: number } | null = null, least = 0.8
    for (let row = Math.max(0, Math.floor(fr) - 1); row <= Math.min(GRID_H - 1, Math.floor(fr) + 1); row++) {
      for (let col = Math.max(0, Math.floor(fc) - 1); col <= Math.min(GRID_W - 1, Math.floor(fc) + 1); col++) {
        if (bay.surface[cellAt(col, row)] === '.') continue
        const gap = Math.hypot(col + 0.5 - fc, row + 0.5 - fr)
        if (gap < least) { least = gap; best = { col, row } }
      }
    }
    return best ? { ...best, x, y } : null
  }
}
