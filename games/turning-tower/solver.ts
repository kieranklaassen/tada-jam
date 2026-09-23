import {
  arrangementCount,
  arrangementFromKey,
  arrangementKey,
  computeLayout,
  connected,
  isWalkable,
  overlaps,
  stepArrangement,
  tileCell,
  type Arrangement,
  type Layout,
  type Room,
} from './world'

// The one next act worth showing (KTD4). A breadth-first search over
// (arrangement, the part of the paths the wanderer can walk to) finds the
// fewest turns and slides that bring the door within reach. Guidance names
// the first of them: the handle to try, or the tile to stand on first when a
// platform has to carry the wanderer. It never says how far to turn.

/** Layouts per arrangement, computed on demand and cached; `fillOne` warms the cache a little at a time. */
export class LayoutCache {
  private readonly layouts = new Map<number, Layout>()
  private cursor = 0
  readonly room: Room

  constructor(room: Room) {
    this.room = room
  }

  get(arrangement: Arrangement): Layout {
    const key = arrangementKey(this.room, arrangement)
    let layout = this.layouts.get(key)
    if (!layout) {
      layout = computeLayout(this.room, arrangement)
      this.layouts.set(key, layout)
    }
    return layout
  }

  /** Compute one missing layout; false once every arrangement is cached. */
  fillOne(): boolean {
    const total = arrangementCount(this.room)
    while (this.cursor < total && this.layouts.has(this.cursor)) this.cursor += 1
    if (this.cursor >= total) return false
    this.get(arrangementFromKey(this.room, this.cursor))
    return true
  }

  get complete(): boolean {
    return this.layouts.size >= arrangementCount(this.room)
  }
}

export type Move = { group: number; dir: number; stand: number }

export type Hint = { kind: 'door' } | { kind: 'move'; group: number; dir: number } | { kind: 'walk'; tile: number }

type Node = { arrangement: number[]; rep: number; parent: number; move: Move | null }

/** The bird will not hop with the wanderer on its back; every other platform carries a rider. */
export function canMoveUnder(room: Room, group: number, walker: number): boolean {
  const def = room.def.groups[group]
  return !(def.kind === 'slide' && def.bird && room.cells[tileCell(walker)].group === group)
}

function representative(layout: Layout, tile: number): number {
  const index = layout.byId.get(tile)
  return index === undefined ? -1 : layout.tiles[layout.component[index]].id
}

/** Shortest list of moves that brings the door within reach, or null when there is none. */
export function solve(cache: LayoutCache, arrangement: Arrangement, walker: number): Move[] | null {
  const room = cache.room
  const first = cache.get(arrangement)
  if (!isWalkable(first, walker)) return null
  if (connected(first, walker, room.doorTile)) return []
  const nodes: Node[] = [{ arrangement: [...arrangement], rep: representative(first, walker), parent: -1, move: null }]
  const seen = new Set<number>([arrangementKey(room, arrangement) * 100000 + nodes[0].rep])
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const layout = cache.get(node.arrangement)
    const repIndex = layout.byId.get(node.rep)!
    const component = layout.component[repIndex]
    const members: number[] = []
    if (i === 0) members.push(walker)
    layout.tiles.forEach((tile, index) => {
      if (layout.component[index] === component && !(i === 0 && tile.id === walker)) members.push(tile.id)
    })
    for (let group = 0; group < room.def.groups.length; group++) {
      for (const dir of [1, -1]) {
        const next = stepArrangement(room, node.arrangement, group, dir)
        if (!next) continue
        const nextLayout = cache.get(next)
        if (overlaps(nextLayout)) continue
        const nextKey = arrangementKey(room, next) * 100000
        for (const stand of members) {
          if (!canMoveUnder(room, group, stand)) continue
          if (!isWalkable(nextLayout, stand)) continue
          const rep = representative(nextLayout, stand)
          if (seen.has(nextKey + rep)) continue
          seen.add(nextKey + rep)
          nodes.push({ arrangement: next, rep, parent: i, move: { group, dir, stand } })
          if (connected(nextLayout, stand, room.doorTile)) {
            const moves: Move[] = []
            for (let at = nodes.length - 1; at > 0; at = nodes[at].parent) moves.push(nodes[at].move!)
            return moves.reverse()
          }
        }
      }
    }
  }
  return null
}

/** What guidance should show next, from the current arrangement and where the wanderer stands. */
export function nextHint(cache: LayoutCache, arrangement: Arrangement, walker: number): Hint | null {
  const moves = solve(cache, arrangement, walker)
  if (!moves) return null
  if (moves.length === 0) return { kind: 'door' }
  const move = moves[0]
  if (move.stand === walker) return { kind: 'move', group: move.group, dir: move.dir }
  const next = stepArrangement(cache.room, arrangement, move.group, move.dir)
  const nextLayout = next ? cache.get(next) : null
  if (nextLayout && isWalkable(nextLayout, walker) && representative(nextLayout, walker) === representative(nextLayout, move.stand)) {
    return { kind: 'move', group: move.group, dir: move.dir }
  }
  return { kind: 'walk', tile: move.stand }
}
