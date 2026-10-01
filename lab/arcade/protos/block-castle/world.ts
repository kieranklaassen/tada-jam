// The blocks as plain boxes on a half-unit grid: where each one is, how it
// turns, where a carried block lands, and what the finished building looks
// like to the castle that will grow out of it. No three.js, no DOM.
//
// One unit is the edge of a cube. y is up, the floor is y = 0, x runs left to
// right and z comes toward the child.

export type Kind = 'cube' | 'plank' | 'column' | 'arch' | 'tri' | 'triL' | 'cone' | 'log'

export type V3 = readonly [number, number, number]

// A way a block can lie: its box, and how its mesh is turned to fill it.
export interface Pose {
  size: V3
  rot: V3
}

const Q = Math.PI / 2

export const POSES: Record<Kind, readonly Pose[]> = {
  cube: [{ size: [1, 1, 1], rot: [0, 0, 0] }],
  plank: [
    { size: [3, 0.5, 1], rot: [0, 0, 0] },
    { size: [1, 0.5, 3], rot: [0, Q, 0] },
    { size: [0.5, 3, 1], rot: [0, 0, Q] },
  ],
  column: [
    { size: [1, 2, 1], rot: [0, 0, 0] },
    { size: [2, 1, 1], rot: [0, 0, Q] },
    { size: [1, 1, 2], rot: [Q, 0, 0] },
  ],
  arch: [
    { size: [2, 1.5, 1], rot: [0, 0, 0] },
    { size: [1, 1.5, 2], rot: [0, Q, 0] },
  ],
  tri: [
    { size: [1, 0.75, 1], rot: [0, 0, 0] },
    { size: [1, 0.75, 1], rot: [0, Q, 0] },
  ],
  triL: [
    { size: [2, 1, 1], rot: [0, 0, 0] },
    { size: [1, 1, 2], rot: [0, Q, 0] },
  ],
  cone: [{ size: [1, 1.25, 1], rot: [0, 0, 0] }],
  log: [
    { size: [1, 1.5, 1], rot: [0, 0, 0] },
    { size: [1.5, 1, 1], rot: [0, 0, Q] },
    { size: [1, 1, 1.5], rot: [Q, 0, 0] },
  ],
}

export interface Block {
  id: number
  kind: Kind
  // Which wood it is cut from (an index the scene turns into a texture).
  tone: number
  // Index into POSES[kind].
  o: number
  // The low corner of its box.
  x: number
  y: number
  z: number
}

export interface Region {
  x0: number
  x1: number
  z0: number
  z1: number
  // Nothing may stand taller than this here.
  top: number
}

export const BUILD: Region = { x0: -4.5, x1: 1.5, z0: -2, z1: 1.5, top: 5 }
export const BASKET: Region = { x0: 3, x1: 7, z0: -1.5, z1: 1.5, top: 4.5 }
// The far wall of the room.
export const WALL_Z = -2.9

const EPS = 0.01

export function sizeOf(b: Block): V3 {
  return POSES[b.kind][b.o]!.size
}

export function topOf(b: Block): number {
  return b.y + sizeOf(b)[1]
}

export function centreOf(b: Block): [number, number, number] {
  const s = sizeOf(b)
  return [b.x + s[0] / 2, b.y + s[1] / 2, b.z + s[2] / 2]
}

export function inBasket(b: Block): boolean {
  return b.x + sizeOf(b)[0] / 2 > (BUILD.x1 + BASKET.x0) / 2
}

function over(ax: number, az: number, asx: number, asz: number, b: Block): boolean {
  const s = sizeOf(b)
  return ax < b.x + s[0] - EPS && ax + asx > b.x + EPS && az < b.z + s[2] - EPS && az + asz > b.z + EPS
}

// The height of whatever stands under a footprint.
export function topUnder(blocks: readonly Block[], x: number, z: number, sx: number, sz: number, skip?: Block): number {
  let top = 0
  for (const b of blocks) {
    if (b === skip) continue
    if (over(x, z, sx, sz, b)) top = Math.max(top, topOf(b))
  }
  return top
}

const snap = (v: number) => Math.round(v * 2) / 2

function clampTo(r: Region, x: number, z: number, sx: number, sz: number): [number, number] {
  return [Math.min(Math.max(x, r.x0), r.x1 - sx), Math.min(Math.max(z, r.z0), r.z1 - sz)]
}

// A roof or a cone comes to a point: nothing can be stood on it.
function pointed(b: Block): boolean {
  return b.kind === 'tri' || b.kind === 'triL' || b.kind === 'cone'
}

// Would a block set down here be held? Not if all it touches is a point.
function held(blocks: readonly Block[], x: number, y: number, z: number, sx: number, sz: number, skip: Block): boolean {
  if (y < EPS) return true
  for (const b of blocks) {
    if (b === skip || Math.abs(topOf(b) - y) > EPS || !over(x, z, sx, sz, b)) continue
    if (!pointed(b)) return true
  }
  return false
}

// Where a carried block comes to rest when its foot is over (ax, az): on the
// grid, inside the floor or the basket, on top of whatever is beneath it. Set
// on the point of a roof it slides off to the nearest place that holds it.
// Null when the pile there is already as tall as the room allows.
export function landing(blocks: readonly Block[], b: Block, ax: number, az: number): { x: number; y: number; z: number } | null {
  const s = sizeOf(b)
  const region = ax > (BUILD.x1 + BASKET.x0) / 2 ? BASKET : BUILD
  const [x0, z0] = clampTo(region, snap(ax - s[0] / 2), snap(az - s[2] / 2), s[0], s[2])
  const lean = ax - s[0] / 2 >= x0 ? 1 : -1
  for (let step = 0; step <= 8; step++) {
    for (const dir of step === 0 ? [0] : [lean, -lean]) {
      const [x, z] = clampTo(region, x0 + dir * step * 0.5, z0, s[0], s[2])
      if (step > 0 && x === x0) continue
      const y = topUnder(blocks, x, z, s[0], s[2], b)
      if (y + s[1] > region.top + EPS) continue
      if (held(blocks, x, y, z, s[0], s[2], b)) return { x, y, z }
    }
  }
  return null
}

// What the finger is over: a place on the floor, or a block and which of its
// faces (0 its top, 1 a side facing along x, 2 a side facing along z).
export interface Under {
  x: number
  z: number
  on: Block | null
  side: 0 | 1 | 2 | 3
}

// From what is under the finger to where the carried block will rest. Over a
// block it means "on top of this": the carried block sits squarely on that
// top, or anywhere along a run of tops that are flush with it (so a plank can
// be laid across two towers, or bonded over a joint), never half off an edge
// by accident. `blocks` are the others, at rest.
export function place(blocks: readonly Block[], b: Block, under: Under): { x: number; y: number; z: number } | null {
  const s = sizeOf(b)
  let ax = under.x
  let az = under.z
  const on = under.on
  if (on) {
    const os = sizeOf(on)
    if (under.side === 1) ax -= Math.min(s[0], os[0]) / 2
    if (under.side === 2) az -= Math.min(s[2], os[2]) / 2
    const top = topOf(on)
    let x0 = on.x
    let x1 = on.x + os[0]
    let z0 = on.z
    let z1 = on.z + os[2]
    const px = Math.min(Math.max(ax, x0 + EPS), x1 - EPS)
    const pz = Math.min(Math.max(az, z0 + EPS), z1 - EPS)
    for (let grew = true; grew; ) {
      grew = false
      for (const k of blocks) {
        if (k === b || k === on || Math.abs(topOf(k) - top) > EPS || pointed(k)) continue
        const ks = sizeOf(k)
        if (k.z < pz && pz < k.z + ks[2] && k.x <= x1 + EPS && k.x + ks[0] >= x0 - EPS && (k.x < x0 - EPS || k.x + ks[0] > x1 + EPS)) {
          x0 = Math.min(x0, k.x)
          x1 = Math.max(x1, k.x + ks[0])
          grew = true
        }
        if (k.x < px && px < k.x + ks[0] && k.z <= z1 + EPS && k.z + ks[2] >= z0 - EPS && (k.z < z0 - EPS || k.z + ks[2] > z1 + EPS)) {
          z0 = Math.min(z0, k.z)
          z1 = Math.max(z1, k.z + ks[2])
          grew = true
        }
      }
    }
    const xa = x0 + s[0] / 2
    const xb = x1 - s[0] / 2
    ax = Math.min(Math.max(ax, Math.min(xa, xb)), Math.max(xa, xb))
    const za = z0 + s[2] / 2
    const zb = z1 - s[2] / 2
    az = Math.min(Math.max(az, Math.min(za, zb)), Math.max(za, zb))
  } else {
    // The strip of floor between the building floor and the basket is not a
    // place: a block let go there belongs to the floor.
    const mid = (BUILD.x1 + BASKET.x0) / 2
    if (ax > mid && (az > BASKET.z1 + 1.2 || az < BASKET.z0 - 1)) ax = mid - 0.1
  }
  return landing(blocks, b, ax, az)
}

// Let everything come to rest: lowest first, each block on whatever is now
// beneath it. `last` is settled after anything else that starts at its height,
// so a block the child just turned climbs onto its neighbours instead of
// lifting them. Returns the blocks whose height changed.
export function settle(blocks: Block[], last?: Block): Block[] {
  const order = [...blocks].sort((a, b) => a.y - b.y || (a === last ? 1 : b === last ? -1 : a.id - b.id))
  const done: Block[] = []
  const moved: Block[] = []
  for (const b of order) {
    const s = sizeOf(b)
    const y = topUnder(done, b.x, b.z, s[0], s[2])
    if (Math.abs(y - b.y) > EPS) moved.push(b)
    b.y = y
    done.push(b)
  }
  return moved
}

// Turn a block where it stands, about its own middle, to its next pose (or
// the one after, if the next would stand taller than the room allows).
// Returns false, leaving everything alone, when it has no other pose that fits.
export function turn(blocks: Block[], b: Block): boolean {
  const poses = POSES[b.kind]
  const before = { o: b.o, x: b.x, z: b.z }
  const heights = blocks.map((k) => k.y)
  const [cx, , cz] = centreOf(b)
  const region = inBasket(b) ? BASKET : BUILD
  for (let step = 1; step < poses.length; step++) {
    b.o = (before.o + step) % poses.length
    const s = sizeOf(b)
    ;[b.x, b.z] = clampTo(region, snap(cx - s[0] / 2), snap(cz - s[2] / 2), s[0], s[2])
    settle(blocks, b)
    if (!blocks.some((k) => topOf(k) > region.top + EPS)) return true
    b.o = before.o
    b.x = before.x
    b.z = before.z
    blocks.forEach((k, i) => (k.y = heights[i]!))
  }
  return false
}

// ------------------------------------------------------- reading the building

export function solidAt(blocks: readonly Block[], px: number, py: number, pz: number, skip?: Block): boolean {
  for (const b of blocks) {
    if (b === skip) continue
    const s = sizeOf(b)
    if (px > b.x + EPS && px < b.x + s[0] - EPS && py > b.y + EPS && py < b.y + s[1] - EPS && pz > b.z + EPS && pz < b.z + s[2] - EPS) return true
  }
  return false
}

// How much of a block's top has something standing on it, 0..1.
export function coveredShare(blocks: readonly Block[], b: Block): number {
  const s = sizeOf(b)
  const top = topOf(b)
  let hit = 0
  let all = 0
  for (let x = b.x + 0.25; x < b.x + s[0]; x += 0.5) {
    for (let z = b.z + 0.25; z < b.z + s[2]; z += 0.5) {
      all++
      if (solidAt(blocks, x, top + 0.1, z, b)) hit++
    }
  }
  return all ? hit / all : 0
}

// Which poses leave a flat top that someone could stand on or wall round.
export function flatTopped(b: Block): boolean {
  if (b.kind === 'tri' || b.kind === 'triL' || b.kind === 'cone') return false
  if ((b.kind === 'column' || b.kind === 'log') && b.o !== 0) return false
  return true
}

export interface Hollow {
  // The middle of the empty space and its size.
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  // The block that roofs it.
  under: Block
}

// The roofed-over spaces: wherever a block spans a gap with air beneath it
// tall enough to stand in. Each is one room that will have a light in it.
export function hollows(blocks: readonly Block[]): Hollow[] {
  const out: Hollow[] = []
  for (const b of blocks) {
    if (b.y < 0.7) continue
    const s = sizeOf(b)
    let x0 = Infinity
    let x1 = -Infinity
    let z0 = Infinity
    let z1 = -Infinity
    let floor = 0
    let cells = 0
    for (let x = b.x + 0.25; x < b.x + s[0]; x += 0.5) {
      for (let z = b.z + 0.25; z < b.z + s[2]; z += 0.5) {
        if (solidAt(blocks, x, b.y - 0.2, z, b)) continue
        const under = topUnder(blocks.filter((k) => topOf(k) <= b.y + EPS), x - 0.2, z - 0.2, 0.4, 0.4, b)
        if (b.y - under < 0.7) continue
        cells++
        floor = Math.max(floor, under)
        x0 = Math.min(x0, x - 0.25)
        x1 = Math.max(x1, x + 0.25)
        z0 = Math.min(z0, z - 0.25)
        z1 = Math.max(z1, z + 0.25)
      }
    }
    if (cells === 0) continue
    // Walled on two facing sides, or it is only an overhang.
    const my = (floor + b.y) / 2
    const mx = (x0 + x1) / 2
    const mz = (z0 + z1) / 2
    const lr = solidAt(blocks, x0 - 0.25, my, mz) && solidAt(blocks, x1 + 0.25, my, mz)
    const fb = solidAt(blocks, mx, my, z0 - 0.25) && solidAt(blocks, mx, my, z1 + 0.25)
    if (!lr && !fb) continue
    out.push({ x: mx, y: my, z: mz, w: x1 - x0, h: b.y - floor, d: z1 - z0, under: b })
  }
  return out
}

export interface Base {
  x0: number
  x1: number
  z0: number
  z1: number
  blocks: Block[]
}

// The building's feet: the blocks standing on the floor, gathered into groups
// that are near enough to be one building. Widest first.
export function bases(blocks: readonly Block[], gap = 1.6): Base[] {
  const feet = blocks.filter((b) => b.y < EPS)
  const group = new Map<Block, number>()
  let n = 0
  for (const b of feet) {
    if (group.has(b)) continue
    const id = n++
    const todo = [b]
    group.set(b, id)
    while (todo.length) {
      const a = todo.pop()!
      const as = sizeOf(a)
      for (const c of feet) {
        if (group.has(c)) continue
        const cs = sizeOf(c)
        const dx = Math.max(0, Math.max(a.x - (c.x + cs[0]), c.x - (a.x + as[0])))
        const dz = Math.max(0, Math.max(a.z - (c.z + cs[2]), c.z - (a.z + as[2])))
        if (Math.max(dx, dz) < gap) {
          group.set(c, id)
          todo.push(c)
        }
      }
    }
  }
  const out: Base[] = []
  for (let id = 0; id < n; id++) {
    const mine = feet.filter((b) => group.get(b) === id)
    out.push({
      x0: Math.min(...mine.map((b) => b.x)),
      x1: Math.max(...mine.map((b) => b.x + sizeOf(b)[0])),
      z0: Math.min(...mine.map((b) => b.z)),
      z1: Math.max(...mine.map((b) => b.z + sizeOf(b)[2])),
      blocks: mine,
    })
  }
  return out.sort((a, b) => b.x1 - b.x0 + (b.z1 - b.z0) * 0.5 - (a.x1 - a.x0 + (a.z1 - a.z0) * 0.5))
}

// How tall the building stands above each of `n` places across its width: the
// line the evening tune is read from.
export function skyline(blocks: readonly Block[], n: number): number[] {
  if (blocks.length === 0) return []
  const x0 = Math.min(...blocks.map((b) => b.x))
  const x1 = Math.max(...blocks.map((b) => b.x + sizeOf(b)[0]))
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + 0.5) / n) * (x1 - x0)
    let top = 0
    for (const b of blocks) if (x >= b.x && x <= b.x + sizeOf(b)[0]) top = Math.max(top, topOf(b))
    out.push(top)
  }
  return out
}

// The basket as it is found: every block resting on the basket floor or on
// another block, set down in this order. Low things are at the front and tall
// ones at the back, so that from where the child sits a part of every block
// can be seen and taken hold of (lz 0 is the back row, 2 the front).
export const START: readonly { kind: Kind; o: number; lx: number; lz: number }[] = [
  { kind: 'plank', o: 0, lx: 0, lz: 2 },
  { kind: 'plank', o: 0, lx: 0, lz: 2 },
  { kind: 'plank', o: 0, lx: 0, lz: 2 },
  { kind: 'cube', o: 0, lx: 3, lz: 2 },
  { kind: 'cube', o: 0, lx: 3, lz: 2 },
  { kind: 'arch', o: 0, lx: 0, lz: 1 },
  { kind: 'column', o: 0, lx: 2, lz: 1 },
  { kind: 'column', o: 0, lx: 3, lz: 1 },
  { kind: 'triL', o: 0, lx: 0, lz: 1 },
  { kind: 'cone', o: 0, lx: 2, lz: 1 },
  { kind: 'arch', o: 0, lx: 0, lz: 0 },
  { kind: 'column', o: 0, lx: 2, lz: 0 },
  { kind: 'log', o: 0, lx: 3, lz: 0 },
  { kind: 'cube', o: 0, lx: 0, lz: 0 },
  { kind: 'cube', o: 0, lx: 1, lz: 0 },
  { kind: 'tri', o: 0, lx: 0, lz: 0 },
  { kind: 'tri', o: 0, lx: 1, lz: 0 },
  { kind: 'cone', o: 0, lx: 2, lz: 0 },
  { kind: 'log', o: 0, lx: 3, lz: 0 },
]

export function startBlocks(rand: () => number): Block[] {
  const blocks: Block[] = []
  START.forEach((s, id) => {
    const b: Block = { id, kind: s.kind, tone: Math.floor(rand() * 5), o: s.o, x: BASKET.x0 + s.lx, y: 0, z: BASKET.z0 + s.lz }
    const size = sizeOf(b)
    b.y = topUnder(blocks, b.x, b.z, size[0], size[2])
    blocks.push(b)
  })
  return blocks
}
