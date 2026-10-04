import { settle, solve, type Answer, type Frame, type Load, type Strain } from './frame'
import { RAIL_BEND, type Part } from './kit'
import { isFooting, type Site } from './sites'

// A run: a load carried over the bridge as built, place by place, on the frame
// model. Pure, no renderer and no DOM. A run is a view of the saved bridge and
// is never saved itself (ART.md, "Every field of the saved state").
//
// The load stands still at each place in turn, half a cell apart: the bounce
// of a moving wheel is left out, as the sheet says.

/** Weights that travel together: each axle's distance behind the front one, in cells (a multiple of a half), and its weight in crates. */
export type Train = readonly { behind: number; weight: number }[]

/**
 * The way the wheels take: from the left lip along firm parts, always onward.
 * A plank is the roadway. The wheels will also set off along a stick, a tube
 * or a thread, since the wrong use of a part works too, and what happens then
 * is in `run`.
 */
export type Road = {
  /** Frame nodes in order of travel, starting at the left lip. Along a plank they lie half a cell apart in x. Empty when nothing leaves the lip. */
  nodes: number[]
  /** For each node but the first, the part it was reached along. */
  parts: number[]
  /** True when the way reaches the right lip. */
  complete: boolean
}

export function roadOf(at: Site, frame: Frame): Road {
  const onward = new Map<number, { to: number; part: number; plank: boolean }[]>()
  const way = (a: number, b: number, part: number, plank: boolean) => {
    // A part that stands upright is no way onward.
    if (frame.nodes[a].x === frame.nodes[b].x) return
    const [from, to] = frame.nodes[a].x < frame.nodes[b].x ? [a, b] : [b, a]
    onward.set(from, [...(onward.get(from) ?? []), { to, part, plank }])
  }
  for (const [plank, line] of frame.along) for (let s = 0; s + 1 < line.length; s++) way(line[s], line[s + 1], plank, true)
  for (const bar of [...frame.bars, ...frame.threads]) way(bar.i, bar.j, bar.part, false)
  const start = frame.at.get(`${at.left[0]},${at.left[1]}`)
  const road: Road = { nodes: [], parts: [], complete: false }
  if (start === undefined || !onward.has(start)) return road
  road.nodes.push(start)
  let here = start
  while (true) {
    const { x, y } = frame.nodes[here]
    if (x === at.right[0] && y === at.right[1]) { road.complete = true; break }
    const ways = onward.get(here)
    if (!ways) break
    // Where several parts leave a pin, the wheels take the one nearest to level, and a plank before anything else as level.
    const steep = (w: { to: number; plank: boolean }) => Math.abs((frame.nodes[w.to].y - y) / (frame.nodes[w.to].x - x)) + (w.plank ? 0 : 1e-6)
    const next = ways.reduce((best, w) => (steep(w) < steep(best) ? w : best))
    road.nodes.push(next.to); road.parts.push(next.part)
    here = next.to
  }
  return road
}

/** Where on the way a wheel at this x stands: on a node, or part of the way along the piece after node `r`. Null off the way. */
function place(frame: Frame, road: Road, x: number): { node: number } | { r: number; part: number; along: number } | null {
  for (let r = 0; r < road.nodes.length; r++) {
    const x0 = frame.nodes[road.nodes[r]].x
    if (x0 === x) return { node: road.nodes[r] }
    if (r + 1 < road.nodes.length) {
      const x1 = frame.nodes[road.nodes[r + 1]].x
      if (x > x0 && x < x1) return { r, part: road.parts[r], along: (x - x0) / (x1 - x0) }
    }
  }
  return null
}

export type Step = {
  /** Where the front axle stands, in cells from the left edge of the sheet. */
  x: number
  /** Each frame node's displacement, [right, up] pairs. */
  moved: Float32Array
  /** For each part, the share of its strength in use, and how it is strained. */
  use: Float32Array
  strain: Strain[]
  /** For each part, the force along it: a pull above zero, a squeeze below. What a pluck is pitched by. */
  force: Float32Array
}

export type Ending =
  | { kind: 'crossed' }
  /** A part passed what it holds, with the load standing at this step: where, and how. */
  | { kind: 'gives'; part: number; spot: readonly [number, number]; strain: Strain }
  /** The load made the shape fold: a stay went slack and nothing else held it. */
  | { kind: 'folds' }
  /** The roadway stops short of the far bank, here. */
  | { kind: 'road-ends'; at: readonly [number, number] }
  /** The wheels went out onto a tube, which is round and rolls them off. */
  | { kind: 'rolls-off'; part: number; at: readonly [number, number] }
  /** The wheels went out onto a thread, which dips into a V under them, down into the water. */
  | { kind: 'dunks'; part: number; at: readonly [number, number] }

/** What the ride was like, for the characters' tastes: all of it read from the model's answer. */
export type Ride = {
  /** The deepest the road went below where it was built, in cells, and where along the sheet. */
  dip: number
  dipAt: number
  /** The sharpest corner the wheels met where one plank hands over to the next or to a bank, as a change of slope. */
  kink: number
  /** The steepest piece of road, as rise over run. */
  slope: number
  /** Parts that pass over the road lower than each height above it, in whole cells from 1 up. `low[2]` holds the parts lower than three cells. */
  low: number[][]
  /** Parts standing in the barge's channel below the deck. */
  blocked: number[]
  /** The gaps between the points where the road is held up, lip to lip. */
  held: number[]
}

export type Run = { frame: Frame; road: Road; steps: Step[]; ending: Ending; ride: Ride }

/** The x of every point where the road is held from below or above: a footing, or a pin shared with a firm part that is not road. */
function supports(frame: Frame, road: Road): number[] {
  const pinned = new Set<number>()
  const way = new Set(road.parts)
  for (const bar of [...frame.bars, ...frame.threads]) if (!way.has(bar.part)) { pinned.add(bar.i); pinned.add(bar.j) }
  for (const [plank, line] of frame.along) if (!way.has(plank)) for (const n of line) pinned.add(n)
  return road.nodes.filter((n) => frame.nodes[n].footing || pinned.has(n)).map((n) => frame.nodes[n].x)
}

const HEIGHTS = 4

/** The parts that hang over the road within a few cells of it, and the parts in the channel. */
function clearances(at: Site, frame: Frame, road: Road, parts: readonly Part[]): Pick<Ride, 'low' | 'blocked'> {
  const way = new Set(road.parts)
  /** The height of the way at this x as built, or undefined where there is none. */
  const roadY = (x: number): number | undefined => {
    for (let r = 0; r + 1 < road.nodes.length; r++) {
      const from = frame.nodes[road.nodes[r]], to = frame.nodes[road.nodes[r + 1]]
      if (x >= from.x && x <= to.x) return from.y + ((to.y - from.y) * (x - from.x)) / (to.x - from.x)
    }
    return undefined
  }
  const low: number[][] = Array.from({ length: HEIGHTS }, () => []), blocked: number[] = []
  parts.forEach((part, index) => {
    if (way.has(index)) return
    const [ax, ay] = part.a, [bx, by] = part.b
    let over = Infinity, inChannel = false
    const from = Math.min(ax, bx), to = Math.max(ax, bx)
    for (let x = from; x <= to; x += 0.5) {
      // An upright part is measured at its lower end and across its whole height.
      const y = ax === bx ? Math.min(ay, by) : ay + ((by - ay) * (x - ax)) / (bx - ax)
      const top = ax === bx ? Math.max(ay, by) : y
      const deck = roadY(x)
      // Over the road strictly between the lips, and strictly above it: a part pinned to the deck clears it at its pin.
      if (deck !== undefined && x > at.left[0] && x < at.right[0] && top > deck + 1e-9) over = Math.min(over, Math.max(y - deck, 0))
      if (at.channel && x >= at.channel[0] && x <= at.channel[1] && y < at.left[1] - 1e-9) inChannel = true
    }
    for (let h = 0; h < HEIGHTS; h++) if (over < h + 1) low[h].push(index)
    if (inChannel) blocked.push(index)
  })
  return { low, blocked }
}

function record(frame: Frame, x: number, answer: Answer): Step {
  const moved = new Float32Array(2 * frame.nodes.length)
  for (let n = 0; n < frame.nodes.length; n++) { const [dx, dy] = answer.moved(n); moved[2 * n] = dx; moved[2 * n + 1] = dy }
  return { x, moved, use: Float32Array.from(answer.parts, (p) => p.use), strain: answer.parts.map((p) => p.strain), force: Float32Array.from(answer.parts, (p) => p.force) }
}

/** How the frame fails under this answer, if it does: it folds, or the part most over its strength gives. */
function failure(answer: Answer): Ending | null {
  if (!answer.held) return { kind: 'folds' }
  let part = -1
  answer.parts.forEach((state, index) => { if (state.use > 1 && (part < 0 || state.use > answer.parts[part].use)) part = index })
  return part < 0 ? null : { kind: 'gives', part, spot: answer.parts[part].spot, strain: answer.parts[part].strain }
}

/**
 * What the wheels put on the frame at this moment, and what goes wrong under
 * them at once if they stand on a part that is no roadway. A wheel between two
 * pins of a stick is shared between the pins by the lever rule, and the stick
 * must carry it there by bending.
 */
function carry(at: Site, frame: Frame, road: Road, parts: readonly Part[], wheels: readonly { x: number; weight: number }[]): { loads: Load[]; wrong: Ending | null } {
  const loads: Load[] = [], onStick = new Map<number, { x: number; from: number; span: number; rise: number; base: number; weight: number }[]>()
  let wrong: Ending | null = null
  for (const wheel of wheels) {
    // A wheel on a bank stands on the ground and loads nothing.
    if (wheel.x <= at.left[0] || wheel.x >= at.right[0]) continue
    const where = place(frame, road, wheel.x)
    if (!where) continue
    if ('node' in where) { loads.push({ node: where.node, weight: wheel.weight }); continue }
    const from = frame.nodes[road.nodes[where.r]], to = frame.nodes[road.nodes[where.r + 1]]
    const spot = [wheel.x, from.y + (to.y - from.y) * where.along] as const
    const kind = parts[where.part].kind
    if (kind === 'tube') wrong ??= { kind: 'rolls-off', part: where.part, at: spot }
    if (kind === 'thread') wrong ??= { kind: 'dunks', part: where.part, at: spot }
    loads.push({ node: road.nodes[where.r], weight: wheel.weight * (1 - where.along) }, { node: road.nodes[where.r + 1], weight: wheel.weight * where.along })
    if (kind === 'stick') onStick.set(where.part, [...(onStick.get(where.part) ?? []), { x: wheel.x, from: wheel.x - from.x, span: to.x - from.x, rise: to.y - from.y, base: from.y, weight: wheel.weight }])
  }
  for (const [part, standing] of onStick) {
    for (const here of standing) {
      // The bending under this wheel from every wheel on the same stick, as for a beam resting on its two pins.
      let bending = 0
      for (const other of standing) bending += (other.weight * Math.min(other.from, here.from) * (here.span - Math.max(other.from, here.from))) / here.span
      if (bending > RAIL_BEND) wrong ??= { kind: 'gives', part, spot: [here.x, here.base + (here.rise * here.from) / here.span], strain: 'bend' }
    }
  }
  return { loads, wrong }
}

/**
 * Carries a train of weights over the bridge and says how it went. `homeward`
 * carries it back from the far bank: the same places, met from the other end,
 * with the wheels ahead of the leading axle's x as far as they were behind it.
 */
export function run(at: Site, parts: readonly Part[], train: Train, homeward = false): Run {
  const frame = settle(parts, isFooting(at))
  const road = roadOf(at, frame)
  const steps: Step[] = []
  const ride: Ride = { dip: 0, dipAt: at.left[0], kink: 0, slope: 0, held: [], ...clearances(at, frame, road, parts) }
  const stops = supports(frame, road)
  for (let s = 0; s + 1 < stops.length; s++) ride.held.push(stops[s + 1] - stops[s])

  // Before any wheel is on it the bridge carries itself, and may already fail to.
  const rest = solve(frame)
  steps.push(record(frame, homeward ? at.right[0] : at.left[0], rest))
  const failsAlone = failure(rest)
  if (failsAlone) return { frame, road, steps, ending: failsAlone, ride }

  const last = road.nodes.length ? frame.nodes[road.nodes[road.nodes.length - 1]] : { x: at.left[0], y: at.left[1] }
  const long = Math.max(...train.map((axle) => axle.behind))
  const height = (n: number, moved: Float32Array) => frame.nodes[n].y + moved[2 * n + 1]
  const slope = (from: number, to: number, moved: Float32Array) => (height(to, moved) - height(from, moved)) / (frame.nodes[to].x - frame.nodes[from].x)
  // A road that does not reach the far lip gives a vehicle on the far bank nothing to drive onto.
  if (homeward && !road.complete) return { frame, road, steps, ending: { kind: 'road-ends', at: at.right }, ride }
  const places: number[] = []
  if (homeward) for (let x = at.right[0] - 0.5; x >= at.left[0] - long; x -= 0.5) places.push(x)
  else for (let x = at.left[0] + 0.5; x <= at.right[0] + long; x += 0.5) places.push(x)
  for (const x of places) {
    if (!road.complete && x > last.x) return { frame, road, steps, ending: { kind: 'road-ends', at: [last.x, last.y] }, ride }
    const { loads, wrong } = carry(at, frame, road, parts, train.map((axle) => ({ x: homeward ? x + axle.behind : x - axle.behind, weight: axle.weight })))
    const answer = solve(frame, loads)
    const step = record(frame, x, answer)
    steps.push(step)
    const fails = wrong ?? failure(answer)
    if (fails) return { frame, road, steps, ending: fails, ride }
    // What the wheels feel at this place: the road as it lies now.
    for (let r = 0; r < road.nodes.length; r++) {
      const n = road.nodes[r], down = -step.moved[2 * n + 1]
      if (down > ride.dip) { ride.dip = down; ride.dipAt = frame.nodes[n].x }
      // A bank is level, so the road's first and last pieces meet it at a corner as sharp as their own slope.
      const slopeIn = r > 0 ? slope(road.nodes[r - 1], n, step.moved) : 0
      const slopeOut = r + 1 < road.nodes.length ? slope(n, road.nodes[r + 1], step.moved) : 0
      ride.slope = Math.max(ride.slope, Math.abs(slopeIn))
      const handsOver = r === 0 || r + 1 === road.nodes.length || road.parts[r] !== road.parts[r - 1]
      if (handsOver) ride.kink = Math.max(ride.kink, Math.abs(slopeOut - slopeIn))
    }
  }
  return { frame, road, steps, ending: { kind: 'crossed' }, ride }
}

/** A weight standing at one place on the road: the test trolley. Null when the way does not pass that x. */
export function park(at: Site, parts: readonly Part[], x: number, weight: number): { frame: Frame; step: Step; ending: Ending | null } | null {
  const frame = settle(parts, isFooting(at)), road = roadOf(at, frame)
  if (!place(frame, road, x)) return null
  const { loads, wrong } = carry(at, frame, road, parts, [{ x, weight }])
  const answer = solve(frame, loads)
  // Standing still, it can stand on a tube: it rolls off only when the tube is turned under it (the game does that).
  return { frame, step: record(frame, x, answer), ending: (wrong && wrong.kind !== 'rolls-off' ? wrong : null) ?? failure(answer) }
}

/** A weight hung from a pin by its hook: the trolley as a pendulum. Its pull drags that one joint straight down. Null when no firm part has a pin there. */
export function hang(at: Site, parts: readonly Part[], pin: readonly [number, number], weight: number): { frame: Frame; step: Step; ending: Ending | null } | null {
  const frame = settle(parts, isFooting(at)), node = frame.at.get(`${pin[0]},${pin[1]}`)
  if (node === undefined) return null
  const answer = solve(frame, [{ node, weight }])
  return { frame, step: record(frame, pin[0], answer), ending: failure(answer) }
}

/**
 * Where the trolley comes to rest when it is set down at x: it trundles down
 * the deck as the deck lies under it, plank by plank, to the lowest point it
 * can reach, and the deck moves with it as it goes. It stops at a bank, at
 * the end of the planks, and where the deck gives. Null when no plank passes x.
 */
export function lowPoint(at: Site, parts: readonly Part[], x: number, weight: number): number | null {
  const frame = settle(parts, isFooting(at)), road = roadOf(at, frame)
  const index = (where: number) => road.nodes.findIndex((n) => frame.nodes[n].x === where)
  let r = index(x)
  if (r < 0) return null
  const onPlank = (from: number) => from >= 0 && from < road.parts.length && parts[road.parts[from]].kind === 'plank'
  for (let moves = 0; moves < road.nodes.length; moves++) {
    const here = frame.nodes[road.nodes[r]].x
    if (here <= at.left[0] || here >= at.right[0]) break
    const answer = solve(frame, [{ node: road.nodes[r], weight }])
    if (failure(answer)) break
    const height = (n: number) => frame.nodes[n].y + answer.moved(n)[1]
    const left = onPlank(r - 1) ? height(road.nodes[r - 1]) : Infinity, right = onPlank(r) ? height(road.nodes[r + 1]) : Infinity
    const lowest = Math.min(left, right)
    if (lowest >= height(road.nodes[r]) - 1e-9) break
    r += right < left ? 1 : -1
  }
  return frame.nodes[road.nodes[r]].x
}
