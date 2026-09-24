// Quarter-Turn Table. A floaty pinball table with a 3 by 3 lattice of arrow
// bumpers. Hold the left or right half of the screen to raise that flipper.
//
// The bumper rule, in full:
//  - A ball that hits a bumper WITH its arrow (from behind or the side) is
//    caught and slung out of the bumper's nose along the arrow.
//  - A ball that hits the bumper's nose (moving against the arrow) bounces
//    off, and the bumper turns a quarter-turn clockwise. The table remembers.
// Slung balls fly straight to the next bumper along the arrow, arriving from
// behind or the side, so a closed loop of arrows (four bumpers round a
// square, six round a 2 by 3, eight round the rim) hands the ball on for ever
// and only a nose hit can break it. Playing is turning arrows with the ball
// until they close a loop, then keeping the ball inside it.
//
// Pure and deterministic: no DOM, no clocks, no Math.random. Randomness comes
// from createRng(config.seed); state changes only inside step() and pointer().

import { between, createRng, int, pick } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimConfig, SimEvent } from '../../kit/sim.ts'

// ---------------------------------------------------------------------------
// Table geometry (logical 1180 by 820 field) and tuning
// ---------------------------------------------------------------------------

export const COLS = [420, 590, 760] as const
export const ROWS = [140, 310, 480] as const
export const BUMPER_R = 38
export const BALL_R = 16
export const WALLS = { left: 30, right: FIELD_W - 30, top: 24 }
export const FLIP_LEN = 190
export const FLIP_R = 14
export const PIVOTS = [
  { x: 380, y: 700 },
  { x: FIELD_W - 380, y: 700 },
] as const
// Angles are measured below the horizontal, so up is negative.
export const REST_ANGLE = (30 * Math.PI) / 180
export const UP_ANGLE = (-28 * Math.PI) / 180
// Gutters from the side walls down to the flipper pivots.
const GUIDES = [
  { x1: WALLS.left, y1: 520, x2: PIVOTS[0].x, y2: PIVOTS[0].y },
  { x1: WALLS.right, y1: 520, x2: PIVOTS[1].x, y2: PIVOTS[1].y },
] as const

const SUB = 8 // substeps per tick
const GRAVITY = 0.1
const MAX_SPEED = 13
const KICK_SPEED = 8.5
const CAP_TICKS = 3
const NOSE_COS = -0.35 // moving this far against the arrow is a nose hit
const NOSE_SPEED = 1.2 // and it turns the bumper only if it lands this hard
const NOSE_E = 0.8
const WALL_E = 0.6
const GUIDE_E = 0.5
const FLIP_E = 0.3
const SWING_UP = 0.3
const SWING_DOWN = 0.15
const SWING_MAX = 10
export const RIDE_AT = 2
export const TRAP_AT = 12
export const SERVE_DELAY = 30
const MAX_BALLS = 3
const HINT_AFTER_TICKS = 150
const MAX_EVENTS = 64

// Arrow index k: 0 east, 1 south, 2 west, 3 north. k + 1 is a clockwise
// quarter-turn on screen.
const DIRS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
] as const

// ---------------------------------------------------------------------------
// The arrow lattice: pure helpers (exported for the tests)
// ---------------------------------------------------------------------------

// For each bumper (index = row * 3 + col), the bumper its arrow points at, or
// -1 when it points off the lattice at a wall.
export function nextOf(arrows: readonly number[]): number[] {
  return arrows.map((k, i) => {
    const dir = DIRS[k & 3]!
    const col = (i % 3) + dir[0]
    const row = Math.floor(i / 3) + dir[1]
    return col < 0 || col > 2 || row < 0 || row > 2 ? -1 : row * 3 + col
  })
}

// Every closed loop of arrows, each as the list of bumpers round it. Two
// bumpers facing each other make a loop of two, which is a clash and not a
// track: the ball would hit the second one's nose.
export function cyclesOf(next: readonly number[]): number[][] {
  const mark = next.map(() => 0) // 0 unseen, 1 on this walk, 2 finished
  const cycles: number[][] = []
  for (let start = 0; start < next.length; start++) {
    if (mark[start] !== 0) continue
    const walk: number[] = []
    let at = start
    while (at >= 0 && mark[at] === 0) {
      mark[at] = 1
      walk.push(at)
      at = next[at]!
    }
    if (at >= 0 && mark[at] === 1) cycles.push(walk.slice(walk.indexOf(at)))
    for (const n of walk) mark[n] = 2
  }
  return cycles
}

// Most bumpers one ball can be handed through by the arrows before it meets a
// wall or comes round again.
function longestWalk(next: readonly number[]): number {
  let best = 0
  for (let start = 0; start < next.length; start++) {
    const seen = new Set<number>()
    for (let at = start; at >= 0 && !seen.has(at); at = next[at]!) seen.add(at)
    best = Math.max(best, seen.size)
  }
  return best
}

// Which kind of table this is: a closed loop of some size, or, with none,
// how far the arrows hand a ball on (scatter, trail, or long).
function tableClass(cycles: readonly number[][], reach: number): string {
  if (cycles.length > 1) return 'multi'
  if (cycles.length === 1) {
    const n = cycles[0]!.length
    return n === 4 ? 'square' : n === 6 ? 'ring6' : n === 8 ? 'ring8' : 'multi'
  }
  return reach <= 2 ? 'scatter' : reach <= 4 ? 'trail' : 'long'
}

// A hidden loop is always lying about, a few turns from closing: pick a 2 by 2
// block and a direction, set its four arrows round it, then knock two or three
// of them out of place. The other five arrows are random. No loop starts
// closed, so the child has to make the first one.
function startingArrows(rng: Rng): number[] {
  const arrows = Array.from({ length: 9 }, () => int(rng, 0, 3))
  const bc = int(rng, 0, 1)
  const br = int(rng, 0, 1)
  const at = (c: number, r: number) => (br + r) * 3 + bc + c
  const clockwise = rng() < 0.5
  const cells = clockwise
    ? [[at(0, 0), 0], [at(1, 0), 1], [at(1, 1), 2], [at(0, 1), 3]]
    : [[at(0, 0), 1], [at(0, 1), 0], [at(1, 1), 3], [at(1, 0), 2]]
  for (const [cell, k] of cells) arrows[cell!] = k!
  const off = new Set<number>()
  const count = int(rng, 2, 3)
  while (off.size < count) off.add(int(rng, 0, 3))
  for (const i of off) {
    const cell = cells[i]![0]!
    arrows[cell] = (arrows[cell]! + int(rng, 1, 3)) & 3
  }
  for (let guard = 0; guard < 30; guard++) {
    const closed = cyclesOf(nextOf(arrows))
    if (closed.length === 0) break
    const loop = closed[0]!
    const cell = pick(rng, loop)
    arrows[cell] = (arrows[cell]! + 1) & 3
  }
  return arrows
}

// ---------------------------------------------------------------------------
// State and snapshot
// ---------------------------------------------------------------------------

interface Bumper {
  x: number
  y: number
  base: number
  turns: number
  // Turns shown so far, easing toward `turns` (view only).
  spin: number
  flash: number
}

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  // The bumper holding it, or -1.
  cap: number
  capT: number
  capK: number
  chain: number
  trapped: boolean
}

interface Flipper {
  side: 0 | 1
  angle: number
  prev: number
  up: boolean
}

export interface BallSeed {
  x: number
  y: number
  vx?: number
  vy?: number
}

// Test seam: fix the arrows and start with exactly these balls (none is
// served at the start; a drained table still serves).
export interface Setup {
  arrows?: readonly number[]
  balls?: readonly BallSeed[]
}

export interface TableSnapshot {
  tick: number
  bumpers: Array<{ x: number; y: number; r: number; k: number; angle: number; flash: number; inLoop: boolean }>
  balls: Array<{ x: number; y: number; vx: number; vy: number; r: number; chain: number; trapped: boolean; held: boolean }>
  flippers: Array<{ px: number; py: number; tx: number; ty: number; up: boolean }>
  guides: Array<{ x1: number; y1: number; x2: number; y2: number }>
  walls: { left: number; right: number; top: number }
  table: string
  ballState: string
  bestChain: number
  // Where the idle hint points, or null. Only ever set when config.hints is on.
  hint: { x: number; y: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

// A cheap squared-distance test that runs before the exact Math.hypot check.
// The margin is far above rounding error, so it only rejects what the exact
// check would reject too; anything near the edge falls through to it.
const beyond = (dx: number, dy: number, reach: number): boolean => dx * dx + dy * dy > reach * reach * 1.000001
// No point of a flipper is farther than this from its pivot, plus the ball.
const FLIP_FAR = FLIP_LEN + FLIP_R + BALL_R

export function buildSim(config: SimConfig, setup: Setup = {}): Sim<TableSnapshot> {
  const rng = createRng(config.seed)
  const arrows = setup.arrows && setup.arrows.length === 9 ? setup.arrows.map((k) => k & 3) : startingArrows(rng)
  const bumpers: Bumper[] = arrows.map((base, i) => ({
    x: COLS[i % 3]!,
    y: ROWS[Math.floor(i / 3)]!,
    base,
    turns: 0,
    spin: 0,
    flash: 0,
  }))
  const flippers: Flipper[] = [0, 1].map((side) => ({ side: side as 0 | 1, angle: REST_ANGLE, prev: REST_ANGLE, up: false }))
  const balls: Ball[] = []
  // Pointer id -> which half of the screen it holds (0 left, 1 right).
  const held = new Map<number, 0 | 1>()
  let pending: SimEvent[] = []
  let tick = 0
  let idle = 0
  let serveIn = -1
  let bestChain = 0
  let turnsTotal = 0
  let drains = 0

  const emit = (name: string) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push({ kind: 'state', name })
  }

  const arrowOf = (b: Bumper) => (b.base + b.turns) & 3
  const newBall = (x: number, y: number, vx = 0, vy = 0): Ball => ({ x, y, vx, vy, cap: -1, capT: 0, capK: 0, chain: 0, trapped: false })

  // The first ball drops in from the top; later ones come down a side lane,
  // clear of the bumpers, so a loop the child built is not knocked apart.
  const serve = (lane: boolean) => {
    if (lane) balls.push(newBall(rng() < 0.5 ? 95 : FIELD_W - 95, 60, 0, 1))
    else balls.push(newBall(between(rng, 430, 750), 60, between(rng, -1, 1), 1))
    emit('serve')
  }
  if (setup.balls) for (const b of setup.balls) balls.push(newBall(b.x, b.y, b.vx ?? 0, b.vy ?? 0))
  else serve(false)

  const resetChain = (ball: Ball) => {
    if (ball.trapped) emit('break')
    ball.trapped = false
    ball.chain = 0
  }

  // Caught by a bumper: hidden in it for a moment, then slung out its nose.
  const capture = (ball: Ball, i: number) => {
    const b = bumpers[i]!
    ball.cap = i
    ball.capT = CAP_TICKS
    ball.capK = arrowOf(b)
    ball.x = b.x
    ball.y = b.y
    ball.vx = 0
    ball.vy = 0
    ball.chain++
    bestChain = Math.max(bestChain, ball.chain)
    b.flash = 6
    emit('kick')
    if (ball.chain === TRAP_AT) {
      ball.trapped = true
      emit('trap')
    }
  }

  const release = (ball: Ball) => {
    const b = bumpers[ball.cap]!
    const dir = DIRS[ball.capK]!
    const out = BUMPER_R + BALL_R + 3
    ball.x = b.x + dir[0] * out
    ball.y = b.y + dir[1] * out
    ball.vx = dir[0] * KICK_SPEED
    ball.vy = dir[1] * KICK_SPEED
    ball.cap = -1
  }

  // A ball against a capsule (a segment with thickness). Pushes it out and
  // bounces it off the surface, which may itself be moving. True on a bounce.
  const touch = (
    ball: Ball,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    rad: number,
    e: number,
    surface?: (qx: number, qy: number, t: number) => [number, number],
  ): boolean => {
    const ex = bx - ax
    const ey = by - ay
    const len2 = ex * ex + ey * ey
    const t = len2 === 0 ? 0 : clamp(((ball.x - ax) * ex + (ball.y - ay) * ey) / len2, 0, 1)
    const qx = ax + ex * t
    const qy = ay + ey * t
    let dx = ball.x - qx
    let dy = ball.y - qy
    const reach = BALL_R + rad
    if (beyond(dx, dy, reach)) return false
    let dist = Math.hypot(dx, dy)
    if (dist >= reach) return false
    if (dist < 1e-6) {
      dx = 0
      dy = -1
      dist = 1
    }
    const nx = dx / dist
    const ny = dy / dist
    ball.x = qx + nx * reach
    ball.y = qy + ny * reach
    const [sx, sy] = surface ? surface(qx, qy, t) : [0, 0]
    const vn = (ball.vx - sx) * nx + (ball.vy - sy) * ny
    if (vn >= 0) return false
    ball.vx -= (1 + e) * vn * nx
    ball.vy -= (1 + e) * vn * ny
    return true
  }

  const hitFlipper = (ball: Ball, f: Flipper, s: number): boolean => {
    const sign = f.side === 0 ? 1 : -1
    const pivot = PIVOTS[f.side]
    // A ball far from the pivot cannot reach the flipper, so skip the trig.
    if (beyond(ball.x - pivot.x, ball.y - pivot.y, FLIP_FAR)) return false
    const now = f.prev + (f.angle - f.prev) * (s / SUB)
    const before = f.prev + (f.angle - f.prev) * ((s - 1) / SUB)
    return touch(
      ball,
      pivot.x,
      pivot.y,
      pivot.x + sign * Math.cos(now) * FLIP_LEN,
      pivot.y + Math.sin(now) * FLIP_LEN,
      FLIP_R,
      FLIP_E,
      (qx, qy, t) => {
        // How far this point of the flipper moved in the last substep, per tick.
        const vx = (qx - (pivot.x + sign * Math.cos(before) * FLIP_LEN * t)) * SUB
        const vy = (qy - (pivot.y + Math.sin(before) * FLIP_LEN * t)) * SUB
        const speed = Math.hypot(vx, vy)
        return speed > SWING_MAX ? [(vx * SWING_MAX) / speed, (vy * SWING_MAX) / speed] : [vx, vy]
      },
    )
  }

  const turn = (b: Bumper) => {
    b.turns++
    b.flash = 8
    turnsTotal++
    emit('turn')
  }

  // The hit-test of a bumper. True if the ball touched it.
  const hitBumper = (ball: Ball, i: number): boolean => {
    const b = bumpers[i]!
    const dx = ball.x - b.x
    const dy = ball.y - b.y
    const reach = BUMPER_R + BALL_R
    if (beyond(dx, dy, reach)) return false
    const dist = Math.hypot(dx, dy)
    if (dist >= reach) return false
    const nx = dist > 1e-6 ? dx / dist : 0
    const ny = dist > 1e-6 ? dy / dist : -1
    const approach = -(ball.vx * nx + ball.vy * ny)
    if (approach <= 0) return false
    const dir = DIRS[arrowOf(b)]!
    const speed = Math.hypot(ball.vx, ball.vy)
    const along = speed > 1e-6 ? (ball.vx * dir[0] + ball.vy * dir[1]) / speed : 0
    if (along >= NOSE_COS) {
      capture(ball, i)
      return true
    }
    ball.x = b.x + nx * reach
    ball.y = b.y + ny * reach
    const vn = ball.vx * nx + ball.vy * ny
    ball.vx -= (1 + NOSE_E) * vn * nx
    ball.vy -= (1 + NOSE_E) * vn * ny
    if (approach >= NOSE_SPEED) turn(b)
    resetChain(ball)
    return true
  }

  const advance = (ball: Ball, s: number) => {
    ball.vy += GRAVITY / SUB
    ball.x += ball.vx / SUB
    ball.y += ball.vy / SUB
    let bounced = false
    if (ball.x < WALLS.left + BALL_R) {
      ball.x = WALLS.left + BALL_R
      if (ball.vx < 0) ball.vx = -ball.vx * WALL_E
      bounced = true
    } else if (ball.x > WALLS.right - BALL_R) {
      ball.x = WALLS.right - BALL_R
      if (ball.vx > 0) ball.vx = -ball.vx * WALL_E
      bounced = true
    }
    if (ball.y < WALLS.top + BALL_R) {
      ball.y = WALLS.top + BALL_R
      if (ball.vy < 0) ball.vy = -ball.vy * WALL_E
      bounced = true
    }
    for (const g of GUIDES) if (touch(ball, g.x1, g.y1, g.x2, g.y2, 6, GUIDE_E)) bounced = true
    for (const f of flippers) if (hitFlipper(ball, f, s)) bounced = true
    if (bounced) resetChain(ball)
    for (let i = 0; i < bumpers.length; i++) if (hitBumper(ball, i)) break
    const speed = Math.hypot(ball.vx, ball.vy)
    if (speed > MAX_SPEED) {
      ball.vx = (ball.vx * MAX_SPEED) / speed
      ball.vy = (ball.vy * MAX_SPEED) / speed
    }
  }

  const raised = (side: 0 | 1) => {
    for (const s of held.values()) if (s === side) return true
    return false
  }

  const pointer = (input: PointerInput) => {
    idle = 0
    const { id, phase, x, y } = input
    if (phase === 'up') {
      held.delete(id)
      return
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    if (phase === 'move' && !held.has(id)) return
    const side: 0 | 1 = x < FIELD_W / 2 ? 0 : 1
    const wasUp = raised(side)
    held.set(id, side)
    if (!wasUp) emit('flip')
  }

  const step = () => {
    tick++
    idle++
    for (const f of flippers) {
      f.up = raised(f.side)
      f.prev = f.angle
      const target = f.up ? UP_ANGLE : REST_ANGLE
      const rate = f.up ? SWING_UP : SWING_DOWN
      f.angle = f.angle > target ? Math.max(target, f.angle - rate) : Math.min(target, f.angle + rate)
    }
    for (const b of bumpers) {
      b.spin += (b.turns - b.spin) * 0.4
      if (Math.abs(b.turns - b.spin) < 0.002) b.spin = b.turns
      if (b.flash > 0) b.flash--
    }
    for (const ball of balls) if (ball.cap >= 0 && --ball.capT <= 0) release(ball)
    for (let s = 1; s <= SUB; s++) for (const ball of balls) if (ball.cap < 0) advance(ball, s)

    for (let i = balls.length - 1; i >= 0; i--) {
      if (balls[i]!.y > FIELD_H + BALL_R + 4) {
        balls.splice(i, 1)
        drains++
        emit('drain')
      }
    }
    // Serve when the table is empty, or when every ball in play is trapped
    // (a trapped ball is done, so another one comes down the side).
    const wantBall = balls.length === 0 || (balls.length < MAX_BALLS && balls.every((b) => b.trapped))
    if (!wantBall) serveIn = -1
    else if (serveIn < 0) serveIn = SERVE_DELAY
    else if (--serveIn <= 0) {
      serve(balls.length > 0)
      serveIn = -1
    }
  }

  const lowest = (): Ball | null => {
    let low: Ball | null = null
    for (const b of balls) if (low === null || b.y > low.y) low = b
    return low
  }

  // The half of the screen and the flipper pad where the lowest ball is.
  const affordances = (): Affordance[] => {
    const low = lowest()
    const side = low === null ? -1 : low.x < FIELD_W / 2 ? 0 : 1
    const near = low !== null && low.y > 520
    const list: Affordance[] = []
    for (const s of [0, 1]) {
      list.push({ x: s === 0 ? 0 : FIELD_W / 2, y: 0, w: FIELD_W / 2, h: FIELD_H, kind: 'hold', salience: s === side ? 0.55 : 0.3 })
    }
    for (const s of [0, 1]) {
      list.push({ x: s === 0 ? 340 : 600, y: 600, w: 240, h: 220, kind: 'hold', salience: s === side && near ? 0.95 : 0.35 })
    }
    return list
  }

  // What the arrows alone make of the table. They change only in turn(), which
  // counts turnsTotal, so the last result is good until that count moves.
  let lattice: { at: number; closed: number[][]; next: number[]; table: string } | null = null
  const latticeNow = () => {
    if (lattice === null || lattice.at !== turnsTotal) {
      const next = nextOf(bumpers.map(arrowOf))
      const closed = cyclesOf(next).filter((c) => c.length >= 4)
      lattice = { at: turnsTotal, closed, next, table: tableClass(closed, longestWalk(next)) }
    }
    return lattice
  }

  const analysis = () => {
    const { closed, next, table } = latticeNow()
    const trapped = balls.filter((b) => b.trapped).length
    const riding = balls.some((b) => b.chain >= RIDE_AT)
    return {
      closed,
      next,
      table,
      ballState: trapped >= 2 ? 'twin' : trapped === 1 ? 'trapped' : riding ? 'riding' : 'free',
    }
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    const { closed, next, table, ballState } = analysis()
    return {
      signature: `${table}/${ballState}`,
      features: {
        bestChain,
        chain: balls.reduce((most, b) => Math.max(most, b.chain), 0),
        links: next.filter((n) => n >= 0).length,
        orbit: closed.reduce((most, c) => Math.max(most, c.length), 0),
        turns: turnsTotal,
        balls: balls.length,
        drains,
      },
      events,
    }
  }

  // Off for return and self-aim runs. Data for the view only.
  const hint = (): { x: number; y: number } | null => {
    const low = lowest()
    if (!config.hints || idle < HINT_AFTER_TICKS || low === null) return null
    const side = low.x < FIELD_W / 2 ? 0 : 1
    const pivot = PIVOTS[side]
    const sign = side === 0 ? 1 : -1
    return { x: pivot.x + (sign * Math.cos(REST_ANGLE) * FLIP_LEN) / 2, y: pivot.y + (Math.sin(REST_ANGLE) * FLIP_LEN) / 2 }
  }

  const snapshot = (): TableSnapshot => {
    const { closed, table, ballState } = analysis()
    const inLoop = new Set(closed.flat())
    return {
      tick,
      bumpers: bumpers.map((b, i) => ({
        x: b.x,
        y: b.y,
        r: BUMPER_R,
        k: arrowOf(b),
        angle: ((b.base + b.spin) * Math.PI) / 2,
        flash: b.flash,
        inLoop: inLoop.has(i),
      })),
      balls: balls.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: BALL_R, chain: b.chain, trapped: b.trapped, held: b.cap >= 0 })),
      flippers: flippers.map((f) => {
        const pivot = PIVOTS[f.side]
        const sign = f.side === 0 ? 1 : -1
        return {
          px: pivot.x,
          py: pivot.y,
          tx: pivot.x + sign * Math.cos(f.angle) * FLIP_LEN,
          ty: pivot.y + Math.sin(f.angle) * FLIP_LEN,
          up: f.up,
        }
      }),
      guides: GUIDES.map((g) => ({ ...g })),
      walls: { ...WALLS },
      table,
      ballState,
      bestChain,
      hint: hint(),
    }
  }

  return { step, pointer, affordances, observe, snapshot }
}

export const createSim: CreateSim<TableSnapshot> = (config) => buildSim(config)
