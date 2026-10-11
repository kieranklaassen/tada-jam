import { COLS, CLOTH_COL, HOME_COL, ROWS, copyLane, isHard, isSeat, logOn, moverOn, onBoard, partAt, plateAt, stepLane, type BoardEvent, type Hop, type Lane } from './board'

// A solver for the tests: the rabbit alone, looking and hopping, with no mishap and without ringing a bell.
// With no bell rung the lanes move the same whatever she does, so they are stepped once into a timeline and the
// search is over where she is and when. Its rules are a short copy of the board's for one pawn; the test replays
// every way it finds through the board's own `step`, so a difference between the two fails there.

export type Timeline = { lanes: Lane[][]; swept: Set<number>[] }

const key = (c: number, r: number) => c * ROWS + r

/** The lanes of a board stepped `steps` times with nobody on them. */
export function timeline(lanes: readonly Lane[], steps: number): Timeline {
  const out: Timeline = { lanes: [lanes.map(copyLane)], swept: [] }
  const events: BoardEvent[] = []
  for (let t = 0; t < steps; t++) {
    const next = out.lanes[t].map(copyLane)
    const swept = new Set<number>()
    next.forEach((lane, c) => {
      for (const one of stepLane(lane, c, 0, events).swept) if (one.r < ROWS) swept.add(key(c, one.r))
    })
    events.length = 0
    out.lanes.push(next)
    out.swept.push(swept)
  }
  return out
}

const HOPS: readonly Hop[] = [{ dc: 1, dr: 0 }, { dc: 0, dr: 0 }, { dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }]

/** Where one hop at time `t` leaves her, or null if it ends in a mishap, rings a bell, or carries her off the board. */
function after(line: Timeline, t: number, c: number, r: number, hop: Hop): { c: number; r: number } | null {
  const now = line.lanes[t], then = line.lanes[t + 1]
  let c2 = c + hop.dc, r2 = r + hop.dr
  const stays = (hop.dc === 0 && hop.dr === 0) || !onBoard(c2, r2) || isSeat(c2, r2)
  if (stays) { c2 = c; r2 = r }
  const lane = now[c2]
  let ride = moverOn(lane, r2)
  if (!stays) {
    if (lane.kind === 'river' && !ride) return null
    if (!ride && plateAt(now, c2, r2) >= 0) return null
    if (ride && lane.movers[ride.index].kind === 'lorry' && ride.part === 0 && partAt(lane.movers[ride.index], 1) < ROWS) {
      r2 = partAt(lane.movers[ride.index], 1)
      ride = { index: ride.index, part: 1 }
    }
  }
  if (ride) {
    const kind = lane.movers[ride.index].kind, moved = then[c2].movers[ride.index]
    if (kind === 'lorry' || kind === 'log') {
      const to = partAt(moved, ride.part)
      return to < ROWS ? { c: c2, r: to } : null
    }
    if (kind === 'turtle') return logOn(then[c2], r2) || moved.count !== 2 ? { c: c2, r: r2 } : null
  }
  if (isHard(lane.kind) && line.swept[t].has(key(c2, r2))) return null
  return { c: c2, r: r2 }
}

/** The shortest run of hops from one of the home bank's rows at time `t0` to the cloth, within `horizon` steps, or null. */
export function solve(line: Timeline, rows: readonly number[], t0: number, horizon: number): { row: number; hops: Hop[] } | null {
  return solveFrom(line, rows.map((r) => ({ c: HOME_COL, r })), t0, horizon)
}

/** The same from any squares of the board: after a slide she starts on the first lane, on whatever her hop left her on. */
export function solveFrom(line: Timeline, starts: readonly { c: number; r: number }[], t0: number, horizon: number): { row: number; hops: Hop[] } | null {
  type Node = { c: number; r: number; back: Node | null; hop: Hop | null }
  let layer: Node[] = starts.map((at) => ({ c: at.c, r: at.r, back: null, hop: null }))
  for (let t = t0; t < t0 + horizon && layer.length > 0; t++) {
    const seen = new Uint8Array(COLS * ROWS)
    const next: Node[] = []
    for (const node of layer) {
      for (const hop of HOPS) {
        const to = after(line, t, node.c, node.r, hop)
        if (!to || seen[key(to.c, to.r)]) continue
        seen[key(to.c, to.r)] = 1
        const made: Node = { c: to.c, r: to.r, back: node, hop }
        if (to.c === CLOTH_COL) {
          const hops: Hop[] = []
          let at: Node = made
          while (at.back && at.hop) { hops.unshift(at.hop); at = at.back }
          return { row: at.r, hops }
        }
        next.push(made)
      }
    }
    layer = next
  }
  return null
}

/** For every step of a timeline, the squares from which she can still reach the cloth with no mishap before the timeline ends: `out[t][c * ROWS + r]` is 1 for such a square at step `t`. One pass from the end, so every start and every phase is answered at once. */
export function ways(line: Timeline): Uint8Array[] {
  const steps = line.swept.length
  const out: Uint8Array[] = Array.from({ length: steps + 1 }, () => new Uint8Array(COLS * ROWS))
  for (let t = steps - 1; t >= 0; t--) {
    for (let c = 0; c < CLOTH_COL; c++) {
      for (let r = 0; r < ROWS; r++) {
        for (const hop of HOPS) {
          const to = after(line, t, c, r, hop)
          if (to && (to.c === CLOTH_COL || out[t + 1][key(to.c, to.r)])) { out[t][key(c, r)] = 1; break }
        }
      }
    }
  }
  return out
}

/** The hops from (c, r) at step `t` that keep a way to the cloth open, to the right before waiting. */
export function openHops(line: Timeline, open: readonly Uint8Array[], c: number, r: number, t: number): Hop[] {
  if (t >= line.swept.length) return []
  return HOPS.filter((one) => { const to = after(line, t, c, r, one); return to !== null && (to.c === CLOTH_COL || open[t + 1][key(to.c, to.r)] === 1) })
}

/** One way to the cloth from (c, r) at step `t0` that `ways` says is there: at each step the first hop that keeps a way open, to the right before waiting. */
export function wayFrom(line: Timeline, open: readonly Uint8Array[], c: number, r: number, t0: number): Hop[] | null {
  if (!open[t0][key(c, r)]) return null
  const hops: Hop[] = []
  for (let t = t0; t < line.swept.length; t++) {
    const hop = HOPS.find((one) => { const to = after(line, t, c, r, one); return to !== null && (to.c === CLOTH_COL || open[t + 1][key(to.c, to.r)] === 1) })
    if (!hop) return null
    const to = after(line, t, c, r, hop)!
    hops.push(hop)
    if (to.c === CLOTH_COL) return hops
    c = to.c; r = to.r
  }
  return null
}

/** The ten lanes of a board with these seven as its crossing: a bank, the lanes, a cloth, and a strip of grass beyond. */
export function boardLanes(lanes: readonly Lane[]): Lane[] {
  return [{ kind: 'bank', movers: [] }, ...lanes.map(copyLane), { kind: 'cloth', movers: [] }, { kind: 'grass', movers: [] }]
}

/** The steps over which the lanes are tried: every loop of eight, every turtle's count of three, and a lorry's first catching up of a car all come round inside it. */
export const PHASES = 24
export const HORIZON = 40

/** What is wrong with a layout for the rabbit, or null: from every free square of the home bank, at every phase of the lanes, there is a way to the cloth with no mishap. */
export function unsolved(lanes: readonly Lane[]): string | null {
  const line = timeline(boardLanes(lanes), PHASES + HORIZON)
  for (let t0 = 0; t0 < PHASES; t0++) {
    for (let row = 1; row < ROWS; row++) if (!solve(line, [row], t0, HORIZON)) return `no way across from row ${row} at step ${t0}`
  }
  return null
}
