// The tower as an integer voxel lattice (KTD1, KTD2). Solid cells are unit
// cubes; a cell may mark some faces as paths. A path face is walkable when it
// points up in the current arrangement and the cell above it is empty.
// Groups (turning segments and sliding platforms) move whole cells by exact
// quarter turns or whole steps, so every settled arrangement stays on the
// lattice.
//
// The camera is a true-isometric orthographic camera looking along -(1,1,1).
// Points that differ by k(1,1,1) land on the same screen spot, so a top at
// cell (x, y, z) sits on screen where the ground cell (x - y, z - y) would.
// Two tops whose keys differ by one step touch on screen. Same-height
// neighbours are real joins; different heights join by perspective when the
// nearer top is higher and both sides of the seam are visible.

export type Vec3 = readonly [number, number, number]
export type Axis = 'x' | 'y' | 'z'

/** Face indices: +x, -x, +y, -y, +z, -z. */
export const FACE_NORMALS: readonly Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]
export const UP = 2

export type Tone = 'stone' | 'rose' | 'lilac' | 'trim' | 'rail' | 'handle'

export type CellDef = {
  at: Vec3
  /** Local face indices that are paths (default: none). */
  paths?: readonly number[]
  tone?: Tone
}

export type TurnDef = {
  kind: 'turn'
  axis: Axis
  /** Rotation centre in world units at quarter 0; a cell centre or corner in the rotation plane. */
  pivot: Vec3
  cells: readonly CellDef[]
  /** Starting quarter, 0..3. */
  start: number
  /** Where the bright handle sits at quarter 0 (world units). */
  handle: Vec3
  /** Quarters it may reach, without wrapping (a drawbridge only lowers one way). Omitted: turns freely. */
  limit?: readonly [number, number]
}

export type SlideDef = {
  kind: 'slide'
  axis: Axis
  min: number
  max: number
  start: number
  cells: readonly CellDef[]
  /** Where the grip sits at offset 0 (world units). */
  grip: Vec3
  /** The companion bird is this platform: it hops between stops instead of sliding. */
  bird?: boolean
}

export type GroupDef = TurnDef | SlideDef

export type Arrangement = readonly number[]

export function stateRange(group: GroupDef): { min: number; max: number; wraps: boolean } {
  if (group.kind === 'slide') return { min: group.min, max: group.max, wraps: false }
  if (group.limit) return { min: group.limit[0], max: group.limit[1], wraps: false }
  return { min: 0, max: 3, wraps: true }
}

export function stateCount(group: GroupDef): number {
  const range = stateRange(group)
  return range.max - range.min + 1
}

const COS = [1, 0, -1, 0]
const SIN = [0, 1, 0, -1]

/** Rotate a vector by `quarters` quarter turns about an axis (three.js makeRotationX/Y/Z convention). */
export function rotateQuarter(axis: Axis, quarters: number, v: Vec3): Vec3 {
  const r = ((quarters % 4) + 4) % 4
  const c = COS[r]
  const s = SIN[r]
  switch (axis) {
    case 'x':
      return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]
    case 'y':
      return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]
    case 'z':
      return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]
    default: {
      const unreachable: never = axis
      return unreachable
    }
  }
}

export function axisVector(axis: Axis): Vec3 {
  return axis === 'x' ? [1, 0, 0] : axis === 'y' ? [0, 1, 0] : [0, 0, 1]
}

/** A turn pivot keeps cells on the lattice only if it sits on cell centres or cell corners in the rotation plane. */
export function pivotIsValid(group: TurnDef): boolean {
  const plane = group.axis === 'x' ? [1, 2] : group.axis === 'y' ? [0, 2] : [0, 1]
  const frac = plane.map((i) => Math.abs(group.pivot[i] - Math.floor(group.pivot[i])))
  const centre = frac.every((f) => Math.abs(f - 0.5) < 1e-9)
  const corner = frac.every((f) => f < 1e-9)
  return centre || corner
}

/** Where a group moves a point that sits at `p` in its own quarter-0 / offset-0 frame. */
export function transformPoint(group: GroupDef | null, state: number, p: Vec3): Vec3 {
  if (!group) return p
  if (group.kind === 'slide') {
    const a = axisVector(group.axis)
    return [p[0] + a[0] * state, p[1] + a[1] * state, p[2] + a[2] * state]
  }
  const d = rotateQuarter(group.axis, state, [p[0] - group.pivot[0], p[1] - group.pivot[1], p[2] - group.pivot[2]])
  return [group.pivot[0] + d[0], group.pivot[1] + d[1], group.pivot[2] + d[2]]
}

export function transformNormal(group: GroupDef | null, state: number, n: Vec3): Vec3 {
  if (!group || group.kind === 'slide') return n
  return rotateQuarter(group.axis, state, n)
}

export type RoomDef = {
  key: string
  cells: readonly CellDef[]
  groups: readonly GroupDef[]
  /** The static cell whose top the wanderer starts on. */
  start: Vec3
  /** The static cell whose top sits under the glowing arch. */
  door: Vec3
}

/** A room resolved into flat cell and tile tables with stable ids. */
export type Room = {
  def: RoomDef
  /** Every cell: static cells first, then each group's cells in order. */
  cells: readonly { def: CellDef; group: number }[]
  startTile: number
  doorTile: number
  startArrangement: Arrangement
  radix: readonly number[]
}

export function tileId(cell: number, face: number): number {
  return cell * 6 + face
}

export function tileCell(tile: number): number {
  return Math.floor(tile / 6)
}

export function tileFace(tile: number): number {
  return tile % 6
}

function same(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function resolveRoom(def: RoomDef): Room {
  const cells: { def: CellDef; group: number }[] = def.cells.map((cell) => ({ def: cell, group: -1 }))
  def.groups.forEach((group, index) => {
    for (const cell of group.cells) cells.push({ def: cell, group: index })
  })
  const find = (at: Vec3) => {
    const index = cells.findIndex((cell) => cell.group === -1 && same(cell.def.at, at))
    if (index < 0) throw new Error(`room ${def.key}: no static cell at ${at.join(',')}`)
    return tileId(index, UP)
  }
  const radix = def.groups.map(stateCount)
  return {
    def,
    cells,
    startTile: find(def.start),
    doorTile: find(def.door),
    startArrangement: def.groups.map((group) => group.start),
    radix,
  }
}

export function arrangementKey(room: Room, arrangement: Arrangement): number {
  let key = 0
  let scale = 1
  room.def.groups.forEach((group, index) => {
    const range = stateRange(group)
    const offset = range.wraps ? ((arrangement[index] % 4) + 4) % 4 : arrangement[index] - range.min
    key += offset * scale
    scale *= room.radix[index]
  })
  return key
}

export function arrangementCount(room: Room): number {
  return room.radix.reduce((a, b) => a * b, 1)
}

export function arrangementFromKey(room: Room, key: number): number[] {
  const arrangement: number[] = []
  let rest = key
  room.def.groups.forEach((group, index) => {
    const offset = rest % room.radix[index]
    rest = Math.floor(rest / room.radix[index])
    arrangement.push(offset + stateRange(group).min)
  })
  return arrangement
}

/** Step one group by `dir`; turns wrap, slides stop at their ends. Returns null when nothing would move. */
export function stepArrangement(room: Room, arrangement: Arrangement, group: number, dir: number): number[] | null {
  const range = stateRange(room.def.groups[group])
  const next = [...arrangement]
  if (range.wraps) next[group] = (((arrangement[group] + dir) % 4) + 4) % 4
  else {
    const value = arrangement[group] + dir
    if (value < range.min || value > range.max) return null
    next[group] = value
  }
  return next
}

export const PACK_OFFSET = 128

export function pack(x: number, y: number, z: number): number {
  return (x + PACK_OFFSET) * 65536 + (y + PACK_OFFSET) * 256 + (z + PACK_OFFSET)
}

export type Tile = {
  id: number
  cell: number
  group: number
  /** Cell coordinates of the solid cell the path sits on. */
  x: number
  y: number
  z: number
  /** Height of the walkable top (y + 1). */
  top: number
  /** Screen key: tops with keys one step apart touch on screen. */
  kx: number
  kz: number
}

export type Edge = { to: number; perspective: boolean }

export type Layout = {
  arrangement: number[]
  /** World cell coordinates of every cell in this arrangement, by cell index. */
  positions: Vec3[]
  solid: Set<number>
  tiles: Tile[]
  byId: Map<number, number>
  edges: Edge[][]
  component: Int32Array
  bounds: { max: Vec3 }
}

export function cellPosition(room: Room, cell: number, arrangement: Arrangement): Vec3 {
  const { def, group } = room.cells[cell]
  if (group < 0) return def.at
  const g = room.def.groups[group]
  const centre = transformPoint(g, arrangement[group], [def.at[0] + 0.5, def.at[1] + 0.5, def.at[2] + 0.5])
  return [Math.round(centre[0] - 0.5), Math.round(centre[1] - 0.5), Math.round(centre[2] - 0.5)]
}

/** Is the point on a walkable top visible from the camera (nothing solid along +(1,1,1))? */
export function visibleFrom(solid: Set<number>, max: Vec3, px: number, py: number, pz: number): boolean {
  let x = Math.floor(px)
  let y = Math.floor(py + 1e-6)
  let z = Math.floor(pz)
  let tx = x + 1 - px
  let ty = y + 1 - py
  let tz = z + 1 - pz
  for (let i = 0; i < 256; i++) {
    if (tx <= ty && tx <= tz) {
      x += 1
      tx += 1
    } else if (ty <= tz) {
      y += 1
      ty += 1
    } else {
      z += 1
      tz += 1
    }
    if (x > max[0] && y > max[1] && z > max[2]) return true
    if (solid.has(pack(x, y, z))) return false
  }
  return true
}

const SEAM_INSET = 0.12
const ALONG = 0.517

/** Screen-adjacent tops a (far) and b (near, key one step toward +x or +z): do they join? */
function joins(layout: Pick<Layout, 'solid' | 'bounds'>, far: Tile, near: Tile, alongX: boolean): Edge['perspective'] | null {
  if (near.top === far.top) return false
  if (near.top < far.top) return null
  const { solid, bounds } = layout
  const farSample = alongX
    ? visibleFrom(solid, bounds.max, far.x + 1 - SEAM_INSET, far.top, far.z + ALONG)
    : visibleFrom(solid, bounds.max, far.x + ALONG, far.top, far.z + 1 - SEAM_INSET)
  if (!farSample) return null
  const nearSample = alongX
    ? visibleFrom(solid, bounds.max, near.x + SEAM_INSET, near.top, near.z + ALONG)
    : visibleFrom(solid, bounds.max, near.x + ALONG, near.top, near.z + SEAM_INSET)
  return nearSample ? true : null
}

function keyOf(kx: number, kz: number): number {
  return (kx + 512) * 2048 + (kz + 512)
}

export function computeLayout(room: Room, arrangement: Arrangement): Layout {
  const positions = room.cells.map((_, index) => cellPosition(room, index, arrangement))
  const solid = new Set<number>()
  let mx = -Infinity
  let my = -Infinity
  let mz = -Infinity
  for (const p of positions) {
    solid.add(pack(p[0], p[1], p[2]))
    mx = Math.max(mx, p[0])
    my = Math.max(my, p[1])
    mz = Math.max(mz, p[2])
  }
  const tiles: Tile[] = []
  room.cells.forEach(({ def, group }, index) => {
    if (!def.paths) return
    const p = positions[index]
    if (solid.has(pack(p[0], p[1] + 1, p[2]))) return
    const g = group < 0 ? null : room.def.groups[group]
    const state = group < 0 ? 0 : arrangement[group]
    for (const face of def.paths) {
      const n = transformNormal(g, state, FACE_NORMALS[face])
      if (n[1] !== 1) continue
      const top = p[1] + 1
      tiles.push({ id: tileId(index, face), cell: index, group, x: p[0], y: p[1], z: p[2], top, kx: p[0] - p[1], kz: p[2] - p[1] })
    }
  })
  const byId = new Map<number, number>()
  tiles.forEach((tile, index) => byId.set(tile.id, index))
  const byKey = new Map<number, number[]>()
  tiles.forEach((tile, index) => {
    const key = keyOf(tile.kx, tile.kz)
    const list = byKey.get(key)
    if (list) list.push(index)
    else byKey.set(key, [index])
  })
  const bounds = { max: [mx, my, mz] as Vec3 }
  const edges: Edge[][] = tiles.map(() => [])
  tiles.forEach((far, a) => {
    for (const alongX of [true, false]) {
      const near = byKey.get(keyOf(far.kx + (alongX ? 1 : 0), far.kz + (alongX ? 0 : 1)))
      if (!near) continue
      for (const b of near) {
        const perspective = joins({ solid, bounds }, far, tiles[b], alongX)
        if (perspective === null) continue
        edges[a].push({ to: b, perspective })
        edges[b].push({ to: a, perspective })
      }
    }
  })
  const component = new Int32Array(tiles.length).fill(-1)
  tiles.forEach((_, start) => {
    if (component[start] >= 0) return
    const queue = [start]
    component[start] = start
    for (let i = 0; i < queue.length; i++) {
      for (const edge of edges[queue[i]]) {
        if (component[edge.to] < 0) {
          component[edge.to] = start
          queue.push(edge.to)
        }
      }
    }
  })
  return { arrangement: [...arrangement], positions, solid, tiles, byId, edges, component, bounds }
}

export function isWalkable(layout: Layout, tile: number): boolean {
  return layout.byId.has(tile)
}

export function connected(layout: Layout, a: number, b: number): boolean {
  const ia = layout.byId.get(a)
  const ib = layout.byId.get(b)
  return ia !== undefined && ib !== undefined && layout.component[ia] === layout.component[ib]
}

/** Shortest path of tile ids from `from` to `to` (inclusive), or null. */
export function findPath(layout: Layout, from: number, to: number): number[] | null {
  const start = layout.byId.get(from)
  const goal = layout.byId.get(to)
  if (start === undefined || goal === undefined) return null
  if (start === goal) return [from]
  const previous = new Int32Array(layout.tiles.length).fill(-1)
  previous[start] = start
  const queue = [start]
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i]
    if (at === goal) break
    for (const edge of layout.edges[at]) {
      if (previous[edge.to] >= 0) continue
      previous[edge.to] = at
      queue.push(edge.to)
    }
  }
  if (previous[goal] < 0) return null
  const path: number[] = []
  for (let at = goal; at !== start; at = previous[at]) path.push(layout.tiles[at].id)
  path.push(from)
  return path.reverse()
}

export function isPerspectiveStep(layout: Layout, from: number, to: number): boolean {
  const a = layout.byId.get(from)
  const b = layout.byId.get(to)
  if (a === undefined || b === undefined) return false
  return layout.edges[a].some((edge) => edge.to === b && edge.perspective)
}

/** Top centre of a tile in world units. */
export function tileTop(tile: Tile): Vec3 {
  return [tile.x + 0.5, tile.top, tile.z + 0.5]
}

/** Screen-plane coordinates of a world point for the isometric camera (right, up), in world units. */
export function isoScreen(p: Vec3): [number, number] {
  return [(p[0] - p[2]) * Math.SQRT1_2, (2 * p[1] - p[0] - p[2]) / Math.sqrt(6)]
}

/** The reachable tile closest on screen to a target point (the wanderer gets as near as it can). */
export function nearestReachable(layout: Layout, from: number, target: Vec3): number | null {
  const start = layout.byId.get(from)
  if (start === undefined) return null
  const [tx, ty] = isoScreen(target)
  let best: number | null = null
  let bestDistance = Infinity
  const comp = layout.component[start]
  layout.tiles.forEach((tile, index) => {
    if (layout.component[index] !== comp) return
    const [sx, sy] = isoScreen(tileTop(tile))
    const distance = Math.hypot(sx - tx, sy - ty)
    if (distance < bestDistance - 1e-9) {
      best = tile.id
      bestDistance = distance
    }
  })
  return best
}

/** Two cells may not share a lattice position in any arrangement. */
export function overlaps(layout: Layout): boolean {
  return layout.solid.size !== layout.positions.length
}
