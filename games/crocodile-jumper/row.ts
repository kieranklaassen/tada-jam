// The row on the strip and what it measures. Pure: pieces are a kind and a
// start, in stage units from the pincushion. Later in the list lies on top.

export type Kind = 'sausage' | 'shoe' | 'duck'
export const KINDS: readonly Kind[] = ['sausage', 'shoe', 'duck']
export const LENGTH: Record<Kind, number> = { sausage: 144, shoe: 108, duck: 72 }

/** The strip's length, and the most pieces that lie on it. */
export const STRIP_LENGTH = 900
export const MOST = 14
/** A piece let go this near an edge closes up to it. */
export const SNAP = 20
/** Holes and bulges up to this much are no fault, and neither is an end this near the tail. */
export const ROOM = 12

export type Piece = { k: Kind; x: number }
export const endOf = (p: Piece): number => p.x + LENGTH[p.k]
export const rowEnd = (row: readonly Piece[]): number => row.reduce((end, p) => Math.max(end, endOf(p)), 0)
export const clampX = (k: Kind, x: number): number => Math.round(Math.max(0, Math.min(STRIP_LENGTH - LENGTH[k], x)))
const meets = (a: Piece, b: Piece): boolean => a.x < endOf(b) - 0.5 && b.x < endOf(a) - 0.5

/** Slides piece `i` towards `want`, shoving what stands in its way. Returns how many pieces it set moving. */
export function slide(row: Piece[], i: number, want: number): number {
  const start = row.map((p) => p.x), p = row[i], right = want > p.x
  // What it already lies across is left where it is.
  const others = row.filter((q) => q !== p && !meets(p, q) && (right ? q.x >= endOf(p) - 0.5 : endOf(q) <= p.x + 0.5))
  others.sort((a, b) => (right ? a.x - b.x : endOf(b) - endOf(a)))
  let target = clampX(p.k, want)
  for (let go = 0; go < 2; go++) {
    row.forEach((q, n) => { q.x = start[n] })
    p.x = target
    let edge = right ? endOf(p) : p.x
    for (const q of others) {
      if (right ? q.x >= edge : endOf(q) <= edge) continue
      q.x = right ? edge : edge - LENGTH[q.k]
      edge = right ? endOf(q) : q.x
    }
    const over = right ? edge - STRIP_LENGTH : -edge
    if (over <= 0) break
    target += right ? -over : over
    // A jam: nothing can move that way.
    if (right ? target < start[i] : target > start[i]) { row.forEach((q, n) => { q.x = start[n] }); return 0 }
  }
  return row.filter((q, n) => q !== p && q.x !== start[n]).length
}

/** Where a piece let go at `x` comes to lie: closed up to an edge that is nearly touching. */
export function settle(row: readonly Piece[], k: Kind, x: number, but: Piece | null = null): { x: number; kissed: boolean } {
  const at = clampX(k, x), len = LENGTH[k]
  let best = at, gap = SNAP + 1
  for (const edge of [0, ...row.flatMap((q) => (q === but ? [] : [endOf(q), q.x - len]))]) {
    const d = Math.abs(edge - at)
    if (d < gap && edge >= 0 && edge <= STRIP_LENGTH - len) { gap = d; best = edge }
  }
  return { x: best, kissed: gap <= SNAP }
}

/** A tapped piece: off whatever it lies across towards the tail, or else up to the next thing towards the pincushion. Null: it has nowhere to go. */
export function scootTo(row: readonly Piece[], i: number): number | null {
  const p = row[i], len = LENGTH[p.k]
  if (row.some((q) => q !== p && meets(p, q))) {
    let x = p.x
    for (let n = 0; n <= row.length; n++) {
      const under = row.filter((q) => q !== p && meets({ k: p.k, x }, q))
      if (under.length === 0) return x
      x = Math.max(...under.map(endOf))
      if (x + len > STRIP_LENGTH) return null
    }
    return null
  }
  const x = row.reduce((far, q) => (q !== p && endOf(q) <= p.x + 0.5 ? Math.max(far, endOf(q)) : far), 0)
  return x < p.x - 0.5 ? x : null
}

/** Where a piece from a tapped tray hops to: past the end, not quite touching. */
export const HOP_GAP = 34
export function hopTo(row: readonly Piece[], k: Kind): number {
  return clampX(k, (row.length ? rowEnd(row) : 0) + HOP_GAP)
}

export type Span = { from: number; to: number }
export type Fit = { holes: Span[]; bulges: Span[]; end: number; short: boolean; long: boolean; faults: number; close: boolean }

/** What a row makes of a customer `length` long. */
export function fitOf(row: readonly Piece[], length: number): Fit {
  const end = rowEnd(row)
  const marks = row.flatMap((p) => [{ at: p.x, by: 1 }, { at: endOf(p), by: -1 }]).sort((a, b) => a.at - b.at)
  const holes: Span[] = [], bulges: Span[] = []
  let depth = 0, from = 0
  const note = (to: number): void => {
    if (to - from > ROOM && from < length) {
      if (depth === 0) holes.push({ from, to: Math.min(to, length) })
      else if (depth > 1) {
        const last = bulges[bulges.length - 1]
        if (last && last.to >= from) last.to = to
        else bulges.push({ from, to })
      }
    }
  }
  for (const m of marks) {
    if (m.at > from) { note(m.at); from = m.at }
    depth += m.by
  }
  const short = end < length - ROOM, long = end > length + ROOM
  const faults = holes.length + bulges.length + Number(short) + Number(long)
  return { holes: holes.filter((h) => h.to - h.from > ROOM), bulges, end, short, long, faults, close: faults === 0 }
}

/** The kind that most of a row's length is made of; null for an empty row. */
export function mostOf(row: readonly Piece[]): Kind | null {
  const sum = (k: Kind): number => row.reduce((n, p) => n + (p.k === k ? LENGTH[k] : 0), 0)
  return row.length === 0 ? null : KINDS.reduce((best, k) => (sum(k) > sum(best) ? k : best))
}
