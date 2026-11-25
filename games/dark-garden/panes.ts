import { CENTRE, END, HALF, onSpiral, outward, PLACES, reach, START } from './garden'
import type { Point } from './input'
import { makeRng } from './rng'

// How the window is cut. Between the turns of the path lie bands of panes,
// laid like bricks along the spiral; each belongs to the place whose part of
// the turn it is in, to the gate, or to the middle.

export type Pane = { points: Point[]; owner: number; kind: 'band' | 'path' | 'hedge' | 'middle'; tone: number; mid: Point }
/** Owners that are no place. */
export const GATE_PANE = -1, MIDDLE = -2

function ownerOf(deg: number): number {
  for (const place of PLACES) if (deg <= place.from && deg > place.to) return place.id
  return deg > 0 ? GATE_PANE : MIDDLE
}

export function edge(deg: number, side: number): Point {
  const p = onSpiral(deg), o = outward(deg)
  return { x: p.x + o.x * side, y: p.y + o.y * side }
}

const FAR = [0, 62, 136, 222, 330, 470, 700, 1300] as const

/** A spot in the band outside the path: `v` counts from the hedge outward. */
function inBand(deg: number, v: number): Point {
  const inner = edge(deg, HALF)
  const turn = deg + 360
  if (turn <= START) {
    const outer = edge(turn, -HALF)
    return { x: inner.x + (outer.x - inner.x) * v, y: inner.y + (outer.y - inner.y) * v }
  }
  const o = outward(deg), low = Math.floor(v), d = FAR[low] + ((FAR[low + 1] ?? FAR[low]) - FAR[low]) * (v - low)
  // Further out the panes run straight away from the middle.
  return { x: inner.x + o.x * d, y: inner.y + o.y * d }
}

export function cut(): Pane[] {
  const rng = makeRng(2412), panes: Pane[] = []
  const add = (points: Point[], owner: number, kind: Pane['kind']) => {
    // All one way round, so that clips made of many panes have no holes.
    const area = points.reduce((s, p, i) => { const q = points[(i + 1) % points.length]; return s + p.x * q.y - q.x * p.y }, 0)
    if (area < 0) points.reverse()
    const mid = { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length }
    panes.push({ points, owner, kind, tone: rng.next(), mid })
  }
  // The middle, as petals round the flame.
  for (let i = 0; i < 14; i++) {
    const a = END - (i / 14) * 360, b = END - ((i + 1) / 14) * 360, points: Point[] = [{ ...CENTRE }]
    for (let k = 0; k <= 4; k++) points.push(edge(a + (b - a) * (k / 4) + 360, -HALF + 4))
    add(points, MIDDLE, 'middle')
  }
  const band = (from: number, to: number, v0: number, v1: number, wide: number) => {
    let deg = from
    while (deg > to + 0.5) {
      const here = inBand(deg, (v0 + v1) / 2), next = inBand(deg - 1, (v0 + v1) / 2)
      const per = Math.hypot(here.x - next.x, here.y - next.y) || 1
      let end = deg - Math.min(34, (wide * (0.75 + rng.next() * 0.5)) / per)
      // A pane ends where its place ends, so a place opens along lead.
      for (const place of PLACES) if (place.to < deg - 0.5 && place.to > end - 4) end = place.to
      if (deg > 122.5 && end < 122) end = 122
      if (from > 0 && deg > -204.5 && end < -206) end = -206
      if (end < to + 3) end = to
      const steps = Math.max(1, Math.round((deg - end) / 5)), points: Point[] = []
      for (let i = 0; i <= steps; i++) points.push(inBand(deg + (end - deg) * (i / steps), v0))
      for (let i = steps; i >= 0; i--) points.push(inBand(deg + (end - deg) * (i / steps), v1))
      add(points, from > -200 && (deg + end) / 2 < -205 ? GATE_PANE : ownerOf((deg + end) / 2), 'band')
      deg = end
    }
  }
  for (let v = FAR.length - 2; v >= 0; v--) band(START + 2, START - 360, v, v + 1, [66, 78, 92, 110, 140, 200, 320][v])
  band(START - 360, END, 0, 0.5, 60)
  band(START - 360, END, 0.5, 1, 60)
  // Where the two ends of the outer turn lie over each other, the gate's panes are seen.
  const inside = (p: Point, q: Point[]) => q.reduce((c, a, i) => { const b = q[(i + q.length - 1) % q.length]; return (a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x ? !c : c }, false)
  const gate = panes.filter((one) => one.owner === GATE_PANE)
  for (const one of panes) if (one.owner >= 0 && gate.some((q) => inside(one.mid, q.points))) one.owner = GATE_PANE
  // The hedge: short fir triangles along both sides, then the stones of the path over their feet.
  for (let deg = START; deg > END; ) {
    const size = 11 / Math.max(0.3, reach(deg)), next = deg - size * 0.42
    for (const side of [1, -1]) add([edge(deg, side * HALF), edge((deg + next) / 2, side * (HALF + 12 + rng.next() * 8)), edge(next, side * HALF)], ownerOf(deg), 'hedge')
    deg = next
  }
  for (let deg = START; deg > END; ) {
    const next = Math.max(END, deg - 7 / Math.max(0.28, reach(deg)))
    add([edge(deg, HALF), edge((deg + next) / 2, HALF), edge(next, HALF), edge(next, -HALF), edge((deg + next) / 2, -HALF), edge(deg, -HALF)], ownerOf((deg + next) / 2), 'path')
    deg = next
  }
  return panes
}

export function trace(g: CanvasRenderingContext2D | Path2D, pane: Pane): void {
  pane.points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
  g.closePath()
}
