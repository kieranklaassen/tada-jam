import { PLANK_BEND, SPEC, key, length, squeezeLimit, type Part, type Point } from './kit'

// The model of the world: the bridge as an engineer's plane frame at rest.
// Pure numbers, no renderer and no DOM.
//
// What it holds true (ART.md, "Where the model is true"):
// - Every joint is a pin: it passes a push or a pull and no turning force.
// - A stick or a tube stretches and shortens in proportion to the force along
//   it. A thread does the same under pull and goes slack under push.
// - A plank is one stiff piece: besides stretching it bends, in proportion to
//   the turning force in it, and it is continuous over every point along it.
// - A footing does not move.
// - A part gives when its pull, its squeeze (crushing, or bowing sideways when
//   it is long and thin) or its bending passes what kit.ts says it holds.
// - A build whose shape its parts do not hold is found, and the parts that can
//   swing or fold are left out of what carries the load.
// Displacements are small against the lengths (first-order theory), loads
// stand still, and a part's own weight is shared between the points along it.

/** A point of the model: a grid point, or a point along a plank between two grid points. */
export type Node = { x: number; y: number; footing: boolean }

type Bar = { part: number; i: number; j: number; long: number; cos: number; sin: number }
/** One piece of a plank between two neighbouring points along it; `ri` and `rj` are the plank's own turning at each. */
type Segment = Bar & { ri: number; rj: number; stiffness: number }

export type Frame = {
  parts: readonly Part[]
  /** False for a part that can swing or fold: it carries nothing and hangs. */
  firm: boolean[]
  nodes: Node[]
  /** For each firm plank, the nodes along it in order from `a` to `b`, half a cell apart in x (in y when it stands upright). */
  along: Map<number, number[]>
  /** Node index by grid point key, for the firm parts. */
  at: Map<string, number>
  bars: Bar[]
  threads: Bar[]
  segments: Segment[]
  /** Own weight on each node, in crates, pulling down. */
  weight: Float64Array
  /** Index of each degree of freedom among the free ones, or -1 when a footing holds it. */
  free: Int32Array
  freeCount: number
  /** Largest stiffness on the diagonal: the scale everything small is measured against. */
  scale: number
  factors: Map<string, Float64Array>
}

/** A weight standing on a node, in crates. */
export type Load = { node: number; weight: number }

/** A displacement larger than this many cells is not bending or stretching: the shape is not held. */
const LOOSE = 5
/** The tiny stiffness added to every degree of freedom so a shape that is not held gives a huge, finite answer. */
const SOFT = 1e-11
/** The size of the sideways nudge that finds a shape balanced on a point, against a crate. */
const NUDGE = 1e-4

function build(parts: readonly Part[], firm: boolean[], isFooting: (p: Point) => boolean): Frame {
  const nodes: Node[] = [], at = new Map<string, number>(), along = new Map<number, number[]>()
  const gridNode = (p: Point): number => {
    const k = key(p)
    let index = at.get(k)
    if (index === undefined) { index = nodes.length; nodes.push({ x: p[0], y: p[1], footing: isFooting(p) }); at.set(k, index) }
    return index
  }
  const bars: Bar[] = [], threads: Bar[] = [], segments: Segment[] = []
  let turning = 0
  const span = (part: number, i: number, j: number): Bar => {
    const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y, long = Math.hypot(dx, dy)
    return { part, i, j, long, cos: dx / long, sin: dy / long }
  }
  parts.forEach((part, index) => {
    if (!firm[index]) return
    if (part.kind !== 'plank') {
      (part.kind === 'thread' ? threads : bars).push(span(index, gridNode(part.a), gridNode(part.b)))
      return
    }
    const dx = part.b[0] - part.a[0], dy = part.b[1] - part.a[1]
    const pieces = 2 * (dx !== 0 ? Math.abs(dx) : Math.abs(dy))
    const line: number[] = []
    for (let s = 0; s <= pieces; s++) {
      const x = part.a[0] + (dx * s) / pieces, y = part.a[1] + (dy * s) / pieces
      if (Number.isInteger(x) && Number.isInteger(y)) line.push(gridNode([x, y]))
      // A point between grid points belongs to this plank alone: nothing else can be pinned there.
      else { line.push(nodes.length); nodes.push({ x, y, footing: false }) }
    }
    along.set(index, line)
    const stiffness = (part.turned ? PLANK_BEND.edge : PLANK_BEND.flat).stiffness
    for (let s = 0; s < pieces; s++) segments.push({ ...span(index, line[s], line[s + 1]), ri: turning + s, rj: turning + s + 1, stiffness })
    turning += pieces + 1
  })

  const weight = new Float64Array(nodes.length)
  for (const bar of [...bars, ...threads, ...segments]) {
    const half = (SPEC[parts[bar.part].kind].weight * bar.long) / 2
    weight[bar.i] += half; weight[bar.j] += half
  }
  // A part that hangs loose from a firm point still weighs on it, at the end or ends that are still pinned.
  parts.forEach((part, index) => {
    if (firm[index]) return
    const held = (['a', 'b'] as const).filter((end) => part.loose !== end).map((end) => at.get(key(part[end])))
    const ends = held.filter((n): n is number => n !== undefined)
    for (const n of ends) weight[n] += (SPEC[part.kind].weight * length(part)) / ends.length
  })

  const free = new Int32Array(2 * nodes.length + turning)
  let freeCount = 0
  for (let d = 0; d < free.length; d++) free[d] = d < 2 * nodes.length && nodes[d >> 1].footing ? -1 : freeCount++
  let scale = 1
  for (const bar of [...bars, ...threads]) scale = Math.max(scale, SPEC[parts[bar.part].kind].stretch / bar.long)
  for (const s of segments) scale = Math.max(scale, SPEC.plank.stretch / s.long, (12 * s.stiffness) / s.long ** 3)
  return { parts, firm, nodes, along, at, bars, threads, segments, weight, free, freeCount, scale, factors: new Map() }
}

/** Adds `value` at two degrees of freedom of the stiffness matrix, skipping any a footing holds. */
function put(k: Float64Array, n: number, free: Int32Array, a: number, b: number, value: number) {
  const i = free[a], j = free[b]
  if (i >= 0 && j >= 0) k[i * n + j] += value
}

function assemble(frame: Frame, active: readonly boolean[]): Float64Array {
  const n = frame.freeCount, k = new Float64Array(n * n), { free, parts, nodes } = frame
  const axial = (bar: Bar, ea: number) => {
    const c = bar.cos, s = bar.sin, e = ea / bar.long
    const d = [2 * bar.i, 2 * bar.i + 1, 2 * bar.j, 2 * bar.j + 1], v = [-c, -s, c, s]
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) put(k, n, free, d[a], d[b], e * v[a] * v[b])
  }
  for (const bar of frame.bars) axial(bar, SPEC[parts[bar.part].kind].stretch)
  frame.threads.forEach((bar, t) => { if (active[t]) axial(bar, SPEC.thread.stretch) })
  const base = 2 * nodes.length
  for (const seg of frame.segments) {
    axial(seg, SPEC.plank.stretch)
    // Bending, in the plank's own cross direction w = (-sin, cos): the beam element of first-order theory.
    const L = seg.long, ei = seg.stiffness, c = seg.cos, s = seg.sin
    const d = [2 * seg.i, 2 * seg.i + 1, base + seg.ri, 2 * seg.j, 2 * seg.j + 1, base + seg.rj]
    // Each row of `shape` turns the six freedoms into one of the beam's four: cross shift and turning at each end.
    const shape = [[-s, c, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, -s, c, 0], [0, 0, 0, 0, 0, 1]]
    const kb = [
      [12 / L ** 3, 6 / L ** 2, -12 / L ** 3, 6 / L ** 2],
      [6 / L ** 2, 4 / L, -6 / L ** 2, 2 / L],
      [-12 / L ** 3, -6 / L ** 2, 12 / L ** 3, -6 / L ** 2],
      [6 / L ** 2, 2 / L, -6 / L ** 2, 4 / L],
    ]
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
      let sum = 0
      for (let p = 0; p < 4; p++) for (let q = 0; q < 4; q++) sum += shape[p][a] * kb[p][q] * shape[q][b]
      if (sum !== 0) put(k, n, free, d[a], d[b], ei * sum)
    }
  }
  for (let i = 0; i < n; i++) k[i * n + i] += SOFT * frame.scale
  return k
}

/** Cholesky factor of a symmetric positive matrix, in place in its lower triangle. */
function factor(k: Float64Array, n: number, floor: number): Float64Array {
  for (let j = 0; j < n; j++) {
    let d = k[j * n + j]
    for (let p = 0; p < j; p++) d -= k[j * n + p] ** 2
    d = Math.sqrt(Math.max(d, floor))
    k[j * n + j] = d
    for (let i = j + 1; i < n; i++) {
      let v = k[i * n + j]
      for (let p = 0; p < j; p++) v -= k[i * n + p] * k[j * n + p]
      k[i * n + j] = v / d
    }
  }
  return k
}

function backSolve(l: Float64Array, n: number, f: Float64Array): Float64Array {
  const u = Float64Array.from(f)
  for (let i = 0; i < n; i++) {
    let v = u[i]
    for (let p = 0; p < i; p++) v -= l[i * n + p] * u[p]
    u[i] = v / l[i * n + i]
  }
  for (let i = n - 1; i >= 0; i--) {
    let v = u[i]
    for (let p = i + 1; p < n; p++) v -= l[p * n + i] * u[p]
    u[i] = v / l[i * n + i]
  }
  return u
}

/** The displacement of every degree of freedom under forces on the free ones, with the threads that pull and none that push. */
function displace(frame: Frame, force: Float64Array): { u: Float64Array; active: boolean[] } {
  const n = frame.freeCount, total = frame.free.length
  let active = frame.threads.map(() => true)
  let u = new Float64Array(total)
  for (let round = 0; round < 12; round++) {
    const id = active.map((a) => (a ? '1' : '0')).join('')
    let l = frame.factors.get(id)
    if (!l) { l = factor(assemble(frame, active), n, SOFT * frame.scale); frame.factors.set(id, l) }
    const reduced = backSolve(l, n, force)
    u = new Float64Array(total)
    for (let d = 0; d < total; d++) if (frame.free[d] >= 0) u[d] = reduced[frame.free[d]]
    const next = frame.threads.map((bar, t) => {
      const grown = (u[2 * bar.j] - u[2 * bar.i]) * bar.cos + (u[2 * bar.j + 1] - u[2 * bar.i + 1]) * bar.sin
      return active[t] ? grown > -1e-9 : grown > 1e-9
    })
    if (next.every((a, t) => a === active[t])) break
    active = next
  }
  return { u, active }
}

/** The forces on the free degrees of freedom: own weight, the loads, and an optional sideways nudge. */
function forces(frame: Frame, loads: readonly Load[], nudge: number): Float64Array {
  const f = new Float64Array(frame.freeCount)
  const down = Float64Array.from(frame.weight)
  for (const load of loads) down[load.node] += load.weight
  for (let i = 0; i < frame.nodes.length; i++) {
    const fx = frame.free[2 * i], fy = frame.free[2 * i + 1]
    if (fy >= 0) f[fy] = -down[i]
    if (nudge !== 0) {
      // A fixed scatter of small pushes, the same every time, so that a shape balanced on a point is found.
      const wobble = (seed: number) => { const v = Math.sin(seed * 12.9898) * 43758.5453; return 2 * (v - Math.floor(v)) - 1 }
      if (fx >= 0) f[fx] += nudge * wobble(2 * i + 1)
      if (fy >= 0) f[fy] += nudge * wobble(2 * i + 2)
    }
  }
  return f
}

/**
 * The frame the load is carried by. Parts that can swing or fold are found by
 * nudging the build both ways under its own weight, and are left out, round
 * after round, until what remains holds its shape.
 */
export function settle(parts: readonly Part[], isFooting: (p: Point) => boolean): Frame {
  // A part with an end off its pin is left out from the start: it hangs from its other end.
  const firm = parts.map((part) => !part.loose)
  for (let round = 0; round <= parts.length; round++) {
    const frame = build(parts, firm, isFooting)
    const loose = new Set<number>()
    for (const sign of [1, -1]) {
      const { u } = displace(frame, forces(frame, [], sign * NUDGE))
      for (let i = 0; i < frame.nodes.length; i++) if (Math.abs(u[2 * i]) > LOOSE || Math.abs(u[2 * i + 1]) > LOOSE) loose.add(i)
    }
    if (loose.size === 0) return frame
    let dropped = false
    const drop = (bar: Bar) => { if ((loose.has(bar.i) || loose.has(bar.j)) && firm[bar.part]) { firm[bar.part] = false; dropped = true } }
    frame.bars.forEach(drop); frame.threads.forEach(drop); frame.segments.forEach(drop)
    if (!dropped) return frame
  }
  return build(parts, firm, isFooting)
}

/** How a part is carrying its load, or failing to. */
export type Strain = 'pull' | 'squeeze' | 'bow' | 'bend' | 'slack' | 'loose' | 'rest'

export type PartState = {
  /** Force along the part: pull positive, squeeze negative. For a plank, the largest along it. */
  force: number
  /** The largest bending in a plank; zero for the other kinds. */
  bending: number
  /** Share of what the part holds that is in use: at 1 it gives. */
  use: number
  strain: Strain
  /** Where it is working hardest, and where it gives if it gives. */
  spot: readonly [number, number]
}

export type Answer = {
  /** Displacement of each node, in cells: [right, up]. */
  moved: (node: number) => readonly [number, number]
  parts: PartState[]
  /** False when the load makes the frame fold: a stay went slack, and the shape is no longer held. */
  held: boolean
}

/** The frame at rest under its own weight and these loads. */
export function solve(frame: Frame, loads: readonly Load[] = []): Answer {
  const { u, active } = displace(frame, forces(frame, loads, loads.length ? NUDGE : 0))
  const { parts, nodes } = frame
  let held = true
  for (let i = 0; i < nodes.length; i++) if (Math.abs(u[2 * i]) > LOOSE || Math.abs(u[2 * i + 1]) > LOOSE) held = false
  const mid = (part: Part): readonly [number, number] => [(part.a[0] + part.b[0]) / 2, (part.a[1] + part.b[1]) / 2]
  const states: PartState[] = parts.map((part, index) => ({ force: 0, bending: 0, use: 0, strain: frame.firm[index] ? 'rest' : 'loose', spot: mid(part) }))
  const grown = (bar: Bar) => (u[2 * bar.j] - u[2 * bar.i]) * bar.cos + (u[2 * bar.j + 1] - u[2 * bar.i + 1]) * bar.sin
  const along = (bar: Bar, kind: Part['kind']) => (SPEC[kind].stretch / bar.long) * grown(bar)
  const axialUse = (kind: Part['kind'], force: number, long: number) => (force >= 0 ? force / SPEC[kind].pull : -force / squeezeLimit(kind, long))

  for (const bar of frame.bars) {
    const part = parts[bar.part], force = along(bar, part.kind), state = states[bar.part]
    state.force = force
    state.use = axialUse(part.kind, force, bar.long)
    const bows = force < 0 && squeezeLimit(part.kind, bar.long) < SPEC[part.kind].squeeze
    state.strain = force > 1e-9 ? 'pull' : force < -1e-9 ? (bows ? 'bow' : 'squeeze') : 'rest'
    // A tube that is pulled apart lets go at a pin; everything else gives in the middle.
    if (part.kind === 'tube' && force > 0) state.spot = part.a
  }
  frame.threads.forEach((bar, t) => {
    const state = states[bar.part]
    const force = active[t] ? along(bar, 'thread') : 0
    // A thread nothing pulls on hangs in its loose curve, whether or not its ends have moved apart.
    if (force < 1e-6) { state.strain = 'slack'; return }
    state.force = force
    state.use = state.force / SPEC.thread.pull
    state.strain = 'pull'
  })
  const base = 2 * nodes.length
  for (const seg of frame.segments) {
    const part = parts[seg.part], state = states[seg.part], L = seg.long, ei = seg.stiffness
    const force = along(seg, 'plank')
    const wi = -u[2 * seg.i] * seg.sin + u[2 * seg.i + 1] * seg.cos, wj = -u[2 * seg.j] * seg.sin + u[2 * seg.j + 1] * seg.cos
    const ti = u[base + seg.ri], tj = u[base + seg.rj]
    // The bending at each end of the piece, from the beam element's end moments.
    const mi = ei * ((6 / L ** 2) * (wi - wj) + (4 / L) * ti + (2 / L) * tj)
    const mj = -ei * ((6 / L ** 2) * (wi - wj) + (2 / L) * ti + (4 / L) * tj)
    const strength = (part.turned ? PLANK_BEND.edge : PLANK_BEND.flat).strength
    const whole = length(part)
    for (const [bending, node] of [[Math.abs(mi), seg.i], [Math.abs(mj), seg.j]] as const) {
      const use = bending / strength + axialUse('plank', force, whole)
      if (use > state.use) {
        state.use = use; state.force = force; state.bending = bending
        state.spot = [nodes[node].x, nodes[node].y]
        state.strain = bending / strength >= Math.abs(axialUse('plank', force, whole)) ? 'bend' : force > 0 ? 'pull' : 'bow'
      }
    }
  }
  return { moved: (node) => [u[2 * node], u[2 * node + 1]], parts: states, held }
}
