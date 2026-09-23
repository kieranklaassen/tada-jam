import { STONE_RADIUS } from './layout'

// The number voice (R14, KTD6): a quantity sounds as N pentatonic beats in
// the grouping the arrangement shows. Heaps are found by touching distance,
// and a heap larger than five is chunked five-and-the-rest so it stays
// subitizable. Each beat names the pieces that pulse with it.

export type Placed = { id: number; x: number; y: number; r: number }
export type Beat = { t: number; step: number; ids: number[]; group: number }

export const CLUSTER_GAP = STONE_RADIUS * 0.6
export const CHUNK = 5
export const BEAT_SECONDS = 0.2
export const GROUP_GAP_SECONDS = 0.45

/** Single-linkage heaps: two pieces share a heap when their edges are within `gap`. Ordered left to right. */
export function clusterPieces(pieces: readonly Placed[], gap = CLUSTER_GAP): number[][] {
  const parent = new Map<number, number>(pieces.map((p) => [p.id, p.id]))
  const find = (id: number): number => {
    let root = id
    while (parent.get(root) !== root) root = parent.get(root)!
    parent.set(id, root)
    return root
  }
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const a = pieces[i]
      const b = pieces[j]
      if (Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r <= gap) parent.set(find(a.id), find(b.id))
    }
  }
  const heaps = new Map<number, Placed[]>()
  for (const piece of pieces) {
    const root = find(piece.id)
    heaps.set(root, [...(heaps.get(root) ?? []), piece])
  }
  const centroidX = (heap: Placed[]) => heap.reduce((sum, p) => sum + p.x, 0) / heap.length
  return [...heaps.values()]
    .sort((a, b) => centroidX(a) - centroidX(b))
    .map((heap) => [...heap].sort((a, b) => a.x - b.x || a.y - b.y).map((p) => p.id))
}

export function chunk(ids: readonly number[], size = CHUNK): number[][] {
  const chunks: number[][] = []
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size))
  return chunks
}

/** Heaps → chunks of at most five, in order. */
export function groupsFor(pieces: readonly Placed[]): number[][] {
  return clusterPieces(pieces).flatMap((heap) => chunk(heap))
}

/** Beats rise through the pentatonic scale within a group, with a longer rest between groups. */
export function schedule(groups: readonly (readonly number[])[]): Beat[] {
  const beats: Beat[] = []
  let t = 0
  groups.forEach((group, groupIndex) => {
    if (group.length === 0) return
    if (beats.length > 0) t += GROUP_GAP_SECONDS - BEAT_SECONDS
    group.forEach((id, step) => {
      beats.push({ t, step, ids: [id], group: groupIndex })
      t += BEAT_SECONDS
    })
  })
  return beats
}
