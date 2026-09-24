// Scrapyard Toolbox sim. Three of five scrap tools are dealt for the day (ramp
// plank, spring pad, fan, sponge, bumper). The child drags them into the yard,
// turns them, and taps the chute to let a ball roll toward a sleepy cat on a
// far shelf. Waking the cat opens the next day: a new deal, a new cat spot.
//
// Solvability by construction: a day is built BACKWARDS. A random rig is grown
// along the ball's own path (each tool is dropped where the ball will be), the
// cat's shelf is put where the ball ends up, and the day is kept only if that
// rig reaches the cat, the bare yard does not, each tool is needed, and a small
// nudge of the rig still works. So no deal is a dead end, and none is solved by
// its obvious use alone.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now, or
// performance.now. Randomness comes from createRng(seed) and is used only to
// build a day; play itself needs none. State changes only in step() and
// pointer().

import { between, createRng, deriveSeed, int, pick } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

// ---------------------------------------------------------------------------
// Tools and physics constants
// ---------------------------------------------------------------------------

export type ToolKind = 'ramp' | 'spring' | 'fan' | 'sponge' | 'bumper'
export const KINDS: readonly ToolKind[] = ['ramp', 'spring', 'fan', 'sponge', 'bumper']
const LETTER: Record<ToolKind, string> = { ramp: 'R', spring: 'S', fan: 'F', sponge: 'P', bumper: 'B' }

export interface Placement {
  kind: ToolKind
  x: number
  y: number
  // Radians from +x toward +y (screen), a whole number of 15 degree steps.
  angle: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const BALL_R = 18
const G = 0.4
const SUB = 3
const DT = 1 / SUB
const MAX_SPEED = 16
const REST_SPEED = 0.9
export const FLOOR_TOP = 680
const TRAY_RETURN = 690
const SOFT = 7.5
const STILL_SPEED = 0.35
const STILL_TICKS = 40
export const RUN_TICKS = 480
const STUCK_EVERY = 90
const STUCK_AFTER = 180
const STUCK_DIST = 60
const ANGLE_STEP = Math.PI / 12
const TAU = Math.PI * 2

// Geometry and behaviour of each tool. `half` is the half-length of the
// planks; the fan and the bumper are round.
export const SPEC = {
  ramp: { half: 110, r: 8, e: 0.25, mu: 0.03, kick: 0 },
  spring: { half: 62, r: 10, e: 0, mu: 0.02, kick: 13 },
  // Grabby: soaks up bounce and speed. A ball holds still on it only when it
  // is nearly flat (under about 22 degrees); steeper, it slides down slowly.
  sponge: { half: 66, r: 19, e: 0, mu: 0.4, kick: 0 },
  bumper: { r: 44, e: 0.9, minOut: 8.5 },
  // A stream of air: strongest at the fan, thinning to a quarter at the tip.
  fan: { body: 32, reach: 300, half: 80, accel: 1.0, thin: 0.75, drag: 0.02 },
}
const HALF: Record<ToolKind, number> = { ramp: 110, spring: 62, sponge: 66, fan: 36, bumper: 0 }
const KNOB_GAP = 40

export const snapAngle = (a: number): number => (((Math.round(a / ANGLE_STEP) * ANGLE_STEP) % TAU) + TAU) % TAU
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

interface Cap {
  kind: 'cap'
  ax: number
  ay: number
  bx: number
  by: number
  r: number
  e: number
  mu: number
  kick: number
  tag: string
}
interface Circ {
  kind: 'circ'
  x: number
  y: number
  r: number
  e: number
  minOut: number
  tag: string
}
type Collider = Cap | Circ
interface Fan {
  x: number
  y: number
  dx: number
  dy: number
}
interface Ball {
  x: number
  y: number
  vx: number
  vy: number
}
interface Hit {
  kinds: Set<string>
  tool: boolean
}

export interface Cat {
  // Centre of the tray, and the height of its floor line.
  x: number
  y: number
  // Which side the lip is on: 1 right, -1 left.
  lip: 1 | -1
}
export interface Shape {
  chute: { y0: number; v0: number; drop: number }
  pillar: { x: number; top: number }
  cat: Cat | null
}

const cap = (ax: number, ay: number, bx: number, by: number, r: number, e: number, mu: number, tag = 'fixed'): Cap => ({
  kind: 'cap',
  ax,
  ay,
  bx,
  by,
  r,
  e,
  mu,
  kick: 0,
  tag,
})

const TRAY_HALF = 90
const LIP = 44

export function staticColliders(shape: Shape): Collider[] {
  const { chute, pillar, cat } = shape
  const list: Collider[] = [
    cap(-60, 700, FIELD_W + 60, 700, 20, 0.35, 0.12),
    cap(-20, -3000, -20, 700, 20, 0.5, 0.02),
    cap(FIELD_W + 20, -3000, FIELD_W + 20, 700, 20, 0.5, 0.02),
    cap(30, chute.y0 + 40, 170, chute.y0 + 40 + chute.drop, 8, 0.2, 0.02),
    cap(pillar.x, pillar.top + 20, pillar.x, 700, 20, 0.4, 0.05),
  ]
  if (cat) {
    // A shallow tray with a lip on the far side only, so the ball can roll or
    // drop in from the open side and stays put against the lip.
    const lipX = cat.x + cat.lip * TRAY_HALF
    list.push(cap(cat.x - TRAY_HALF, cat.y, cat.x + TRAY_HALF, cat.y, 8, 0.35, 0.3), cap(lipX, cat.y - LIP, lipX, cat.y, 8, 0.35, 0.1))
  }
  return list
}

function addTool(p: Placement, cs: Collider[], fans: Fan[]): void {
  const dx = Math.cos(p.angle)
  const dy = Math.sin(p.angle)
  if (p.kind === 'bumper') {
    cs.push({ kind: 'circ', x: p.x, y: p.y, r: SPEC.bumper.r, e: SPEC.bumper.e, minOut: SPEC.bumper.minOut, tag: 'bumper' })
  } else if (p.kind === 'fan') {
    fans.push({ x: p.x, y: p.y, dx, dy })
  } else {
    const s = SPEC[p.kind]
    cs.push({
      kind: 'cap',
      ax: p.x - dx * s.half,
      ay: p.y - dy * s.half,
      bx: p.x + dx * s.half,
      by: p.y + dy * s.half,
      r: s.r,
      e: s.e,
      mu: s.mu,
      kick: s.kick,
      tag: p.kind,
    })
  }
}

const startBall = (shape: Shape): Ball => ({ x: 60, y: shape.chute.y0 + 12, vx: shape.chute.v0, vy: 0 })

function collide(b: Ball, c: Collider, hit: Hit | null): void {
  let nx: number
  let ny: number
  if (c.kind === 'cap') {
    const abx = c.bx - c.ax
    const aby = c.by - c.ay
    const len2 = abx * abx + aby * aby
    const t = len2 > 0 ? clamp(((b.x - c.ax) * abx + (b.y - c.ay) * aby) / len2, 0, 1) : 0
    const qx = c.ax + abx * t
    const qy = c.ay + aby * t
    const dx = b.x - qx
    const dy = b.y - qy
    const d = Math.hypot(dx, dy)
    const reach = c.r + BALL_R
    if (d >= reach) return
    if (d > 1e-6) {
      nx = dx / d
      ny = dy / d
    } else {
      const l = Math.sqrt(len2) || 1
      nx = aby / l
      ny = -abx / l
      if (ny > 0 || (ny === 0 && nx < 0)) {
        nx = -nx
        ny = -ny
      }
    }
    b.x = qx + nx * reach
    b.y = qy + ny * reach
  } else {
    const dx = b.x - c.x
    const dy = b.y - c.y
    const d = Math.hypot(dx, dy)
    const reach = c.r + BALL_R
    if (d >= reach) return
    nx = d > 1e-6 ? dx / d : 0
    ny = d > 1e-6 ? dy / d : -1
    b.x = c.x + nx * reach
    b.y = c.y + ny * reach
  }
  const vn = b.vx * nx + b.vy * ny
  if (vn >= 0) return
  const approach = -vn
  const bounce = approach < REST_SPEED ? 0 : c.e
  b.vx -= (1 + bounce) * vn * nx
  b.vy -= (1 + bounce) * vn * ny
  if (c.kind === 'cap') {
    if (c.kick > 0 && approach > 0.5) {
      const cur = b.vx * nx + b.vy * ny
      b.vx += (c.kick - cur) * nx
      b.vy += (c.kick - cur) * ny
    }
    if (c.mu > 0) {
      const tx = -ny
      const ty = nx
      const vt = b.vx * tx + b.vy * ty
      const dv = c.mu * approach * (1 + bounce)
      const next = vt > 0 ? Math.max(0, vt - dv) : Math.min(0, vt + dv)
      b.vx += (next - vt) * tx
      b.vy += (next - vt) * ty
    }
  } else {
    const cur = b.vx * nx + b.vy * ny
    if (cur < c.minOut) {
      b.vx += (c.minOut - cur) * nx
      b.vy += (c.minOut - cur) * ny
    }
  }
  if (hit && c.tag !== 'fixed') {
    hit.kinds.add(c.tag)
    hit.tool = true
  }
}

// One 33 ms tick: three substeps of gravity, air, motion, and contact.
function advance(b: Ball, cs: readonly Collider[], fans: readonly Fan[], hit: Hit | null): void {
  const { reach, half, accel, thin, drag } = SPEC.fan
  for (let s = 0; s < SUB; s++) {
    b.vy += G * DT
    for (const f of fans) {
      const rx = b.x - f.x
      const ry = b.y - f.y
      const along = rx * f.dx + ry * f.dy
      const across = -rx * f.dy + ry * f.dx
      if (along < 0 || along > reach || Math.abs(across) > half) continue
      const a = accel * (1 - (thin * along) / reach) * DT
      b.vx += f.dx * a
      b.vy += f.dy * a
      b.vx *= 1 - drag * DT
      b.vy *= 1 - drag * DT
      if (hit) {
        hit.kinds.add('fan')
        hit.tool = true
      }
    }
    const speed = Math.hypot(b.vx, b.vy)
    if (speed > MAX_SPEED) {
      b.vx *= MAX_SPEED / speed
      b.vy *= MAX_SPEED / speed
    }
    b.x += b.vx * DT
    b.y += b.vy * DT
    for (const c of cs) collide(b, c, hit)
  }
}

const inZone = (b: Ball, cat: Cat): boolean =>
  Math.abs(b.x - cat.x) <= TRAY_HALF - 8 && b.y >= cat.y - 90 && b.y <= cat.y - 20

const catSpot = (cat: Cat) => ({ x: cat.x, y: cat.y - 40 })

export interface PathPoint {
  x: number
  y: number
  vx: number
  vy: number
}
export interface RunResult {
  reached: boolean
  reachTick: number
  ticks: number
  // The ball ended still (or timed out) somewhere short of the cat.
  still: boolean
  touched: string[]
  lastToolTick: number
  minDist: number
  path: PathPoint[]
}

const inKindOrder = (list: readonly Placement[]) => [...list].sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind))

// Roll a ball through a rig from the chute and report what happened. The live
// sim steps the same physics, so a rig that works here works when played.
export function runBall(
  shape: Shape,
  placements: readonly Placement[],
  options: { maxTicks?: number; record?: boolean } = {},
): RunResult {
  const { maxTicks = RUN_TICKS, record = false } = options
  const cs = staticColliders(shape)
  const fans: Fan[] = []
  for (const p of inKindOrder(placements)) addTool(p, cs, fans)
  const b = startBall(shape)
  const hit: Hit = { kinds: new Set(), tool: false }
  const path: PathPoint[] = record ? [{ x: b.x, y: b.y, vx: b.vx, vy: b.vy }] : []
  const target = shape.cat ? catSpot(shape.cat) : null
  let lastToolTick = 0
  let minDist = Infinity
  let still = 0
  let anchor = { x: b.x, y: b.y }
  let tick = 0
  let reached = false
  while (tick < maxTicks) {
    tick++
    hit.tool = false
    advance(b, cs, fans, hit)
    if (hit.tool) lastToolTick = tick
    if (record) path.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy })
    if (shape.cat && target) {
      minDist = Math.min(minDist, Math.hypot(b.x - target.x, b.y - target.y))
      if (inZone(b, shape.cat) && Math.hypot(b.vx, b.vy) <= SOFT) {
        reached = true
        break
      }
    }
    still = Math.hypot(b.vx, b.vy) < STILL_SPEED ? still + 1 : 0
    if (still >= STILL_TICKS) break
    if (tick % STUCK_EVERY === 0) {
      // Bouncing or hovering in place counts as stuck, same as lying still.
      if (tick >= STUCK_AFTER && Math.hypot(b.x - anchor.x, b.y - anchor.y) < STUCK_DIST) break
      anchor = { x: b.x, y: b.y }
    }
  }
  const kinds = KINDS.filter((k) => hit.kinds.has(k))
  return { reached, reachTick: reached ? tick : -1, ticks: tick, still: !reached && tick < maxTicks, touched: kinds, lastToolTick, minDist, path }
}

// ---------------------------------------------------------------------------
// Building a day backwards from a rig that works
// ---------------------------------------------------------------------------

export type Verified = 'full' | 'robust' | 'core' | 'none'

export interface World {
  seed: number
  // The three dealt kinds, in KINDS order.
  deal: ToolKind[]
  shape: Shape
  // A known solution: one placement per dealt kind.
  reference: Placement[]
  verified: Verified
  attempts: number
}

export interface Candidate {
  deal: ToolKind[]
  shape: Shape
  reference: Placement[]
}

const shuffle = <T>(rng: Rng, items: readonly T[]): T[] => {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = int(rng, 0, i)
    const t = a[i]!
    a[i] = a[j]!
    a[j] = t
  }
  return a
}

const RAMP_DEG = [-45, -30, -15, 15, 30, 45]
const SPRING_DEG = [-60, -45, -30, -15, 0, 15, 30, 45, 60]
const SPONGE_DEG = [-60, -45, -30, 30, 45, 60]

// Drop a tool where the ball will be, `i` ticks into its path.
function placeOnPath(kind: ToolKind, path: readonly PathPoint[], i: number, rng: Rng): Placement {
  const p = path[i]!
  if (kind === 'fan') {
    const a = int(rng, 0, 7) * (Math.PI / 4)
    const off = between(rng, -40, 40)
    const dx = Math.cos(a)
    const dy = Math.sin(a)
    return { kind, x: p.x - dx * 130 - dy * off, y: p.y - dy * 130 + dx * off, angle: snapAngle(a) }
  }
  if (kind === 'bumper') {
    // A little way ahead on the path, off to one side, so the ball clips it.
    const q = path[Math.min(i + 8, path.length - 1)]!
    const sp = Math.hypot(q.vx, q.vy)
    const ux = sp > 0.5 ? q.vx / sp : 0
    const uy = sp > 0.5 ? q.vy / sp : 1
    const off = between(rng, -38, 38)
    return { kind, x: q.x - uy * off, y: q.y + ux * off, angle: 0 }
  }
  const table = kind === 'ramp' ? RAMP_DEG : kind === 'spring' ? SPRING_DEG : SPONGE_DEG
  const th = (pick(rng, table) * Math.PI) / 180
  const gap = SPEC[kind].r + BALL_R + 2
  return { kind, x: p.x - Math.sin(th) * gap, y: p.y + Math.cos(th) * gap, angle: snapAngle(th) }
}

const inYard = (p: Placement) => p.x >= 40 && p.x <= FIELD_W - 40 && p.y >= 40 && p.y <= 650

const toolRoom = (p: PathPoint) => p.x >= 200 && p.x <= 1060 && p.y >= 90 && p.y <= 560
const catRoom = (p: PathPoint) => p.x >= 520 && p.x <= 1080 && p.y >= 150 && p.y <= 520

// Path ticks, at or after `from`, where the ball is somewhere a tool or the
// cat's shelf could go.
function room(path: readonly PathPoint[], from: number, ok: (p: PathPoint) => boolean): number[] {
  const list: number[] = []
  for (let i = Math.max(20, from); i < path.length - 6; i++) if (ok(path[i]!)) list.push(i)
  return list
}

const TRIES = 8

// The go tap: a box round the chute mouth. A tap anywhere in it lets the ball
// go. It wins over every tool body, so the answer can never hide under it.
export const chuteRect = (y0: number): Rect => ({ x: 10, y: y0 - 10, w: 170, h: 110 })

// How far a finger has to be from a tool's body to grab it.
const GRAB_REACH = 28
// A day keeps its known answer off the go tap: the tool's body stays at least
// this far from the box. Release wins over tool bodies anyway; this keeps the
// answer's middle, where a finger grabs it, out of the box. (A margin of the
// grab reach plus 40 was tried and cut the days that need every tool from
// about half to under a third.)
const CHUTE_CLEAR = 12
// A tool dropped with its middle in the go tap is moved this far past its edge.
const CHUTE_PUSH = 40

// How far a tool at `p` is from the go tap (0 when they touch), by the same
// distToTool math the hit-test uses, sampled every 4 px over the box.
export function chuteDistance(p: Placement, y0: number): number {
  const box = chuteRect(y0)
  // A tool reaches at most about 120 from its middle, the box about 101 from its own.
  const far = Math.hypot(p.x - (box.x + box.w / 2), p.y - (box.y + box.h / 2)) - 230
  if (far > 100) return far
  const nx = Math.ceil(box.w / 4)
  const ny = Math.ceil(box.h / 4)
  let best = Infinity
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= ny; j++) {
      best = Math.min(best, distToTool(p, box.x + (box.w * i) / nx, box.y + (box.h * j) / ny))
      if (best === 0) return 0
    }
  }
  return best
}

// One try at a day: a chute, a pillar, three dealt tools grown along the ball's
// own path (each kept only if the ball touches it and leaves room for the next
// step), then a shelf for the cat where the ball ends up. Null when it stalls.
export function attempt(rng: Rng): Candidate | null {
  const chute = { y0: between(rng, 110, 300), v0: between(rng, 3, 6.5), drop: between(rng, 6, 26) }
  const pillar = { x: between(rng, 430, 800), top: between(rng, 360, 520) }
  const bare: Shape = { chute, pillar, cat: null }
  const deal = shuffle(rng, KINDS)
    .slice(0, 3)
    .sort((a, b) => KINDS.indexOf(a) - KINDS.indexOf(b))
  const order = shuffle(rng, deal)
  const reference: Placement[] = []
  let run = runBall(bare, [], { record: true })
  let after = 0
  for (let k = 0; k < order.length; k++) {
    const kind = order[k]!
    const lastOne = k === order.length - 1
    const options = room(run.path, after + 4, toolRoom)
    if (options.length === 0) return null
    let next: RunResult | null = null
    let placed: Placement | null = null
    for (let tries = 0; tries < TRIES && next === null; tries++) {
      const p = placeOnPath(kind, run.path, options[int(rng, 0, options.length - 1)]!, rng)
      if (!inYard(p) || chuteDistance(p, chute.y0) < CHUTE_CLEAR || reference.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < 100)) continue
      const r = runBall(bare, [...reference, p], { record: true })
      if (!r.touched.includes(kind)) continue
      if (room(r.path, r.lastToolTick + 4, lastOne ? catRoom : toolRoom).length < (lastOne ? 4 : 8)) continue
      next = r
      placed = p
    }
    if (next === null || placed === null) return null
    reference.push(placed)
    run = next
    after = next.lastToolTick
  }
  // The cat's shelf goes where the ball would land after the last tool.
  const options = room(run.path, after + 8, catRoom)
  for (let tries = 0; tries < TRIES && options.length > 0; tries++) {
    const p = run.path[options[int(rng, 0, options.length - 1)]!]!
    const base = p.y + BALL_R + 8 + between(rng, 40, 90)
    const fall = base - 26 - p.y
    const t = (-p.vy + Math.sqrt(p.vy * p.vy + 2 * G * fall)) / G
    const cat: Cat = { x: p.x + p.vx * t * 0.95 + between(rng, -10, 10), y: base, lip: p.vx >= 0 ? 1 : -1 }
    if (cat.x < 560 || cat.x > FIELD_W - 110 || cat.y > 640) continue
    if (Math.abs(cat.x - pillar.x) < 120 && cat.y >= pillar.top - 20) continue
    if (reference.some((o) => Math.hypot(o.x - cat.x, o.y - (cat.y - 30)) < 110)) continue
    return { deal, shape: { chute, pillar, cat }, reference }
  }
  return null
}

export const NUDGES: ReadonlyArray<readonly [number, number]> = [
  [10, -7],
  [-9, 8],
]

const SINGLE_SAMPLES = 30
const SLOWEST_SOLUTION = 360

// Does any one dealt tool, dropped where the bare ball flies, solve the day?
// Sampled, not exhaustive: a day with an easy one-tool answer is not "full".
function oneToolSolves(c: Candidate, rng: Rng): boolean {
  const path = runBall({ ...c.shape, cat: null }, [], { record: true }).path
  const options = room(path, 20, toolRoom)
  if (options.length === 0) return false
  for (const kind of c.deal) {
    for (let n = 0; n < SINGLE_SAMPLES; n++) {
      const p = placeOnPath(kind, path, options[int(rng, 0, options.length - 1)]!, rng)
      if (inYard(p) && runBall(c.shape, [p]).reached) return true
    }
  }
  return false
}

// full: the known rig reaches the cat within about 12 seconds, the bare yard
// does not, every tool is needed, a small nudge of the rig still works, and no
// sampled single tool solves it. robust: reaches and survives the nudge only.
// core: reaches and the bare yard does not.
export function grade(c: Candidate, rng: Rng): Verified | null {
  const known = runBall(c.shape, c.reference)
  if (!known.reached || known.reachTick > SLOWEST_SOLUTION) return null
  if (runBall(c.shape, []).reached) return null
  const robust = NUDGES.every(([dx, dy]) => runBall(c.shape, c.reference.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }))).reached)
  if (!robust) return 'core'
  const needed = c.reference.every((_, j) => !runBall(c.shape, c.reference.filter((__, i) => i !== j)).reached)
  return needed && !oneToolSolves(c, rng) ? 'full' : 'robust'
}

const RANK: Record<Verified, number> = { none: 0, core: 1, robust: 2, full: 3 }
const MAX_ATTEMPTS = 300

function generate(seed: number): World {
  const rng = createRng(seed)
  let best: World | null = null
  let last: Candidate | null = null
  for (let n = 1; n <= MAX_ATTEMPTS; n++) {
    const c = attempt(rng)
    if (!c) continue
    last = c
    const g = grade(c, rng)
    if (!g) continue
    const world: World = { seed, deal: c.deal, shape: c.shape, reference: c.reference, verified: g, attempts: n }
    if (g === 'full') return world
    if (best === null || RANK[g] > RANK[best.verified]) best = world
    // Hold out for a better day for a while, then settle.
    if (n >= 90 && RANK[best.verified] >= RANK.robust) return best
    if (n >= 150) return best
  }
  if (best) return best
  // Never reached in practice; a plain day so the sim still runs.
  const deal: ToolKind[] = ['ramp', 'spring', 'fan']
  const shape: Shape = last?.shape ?? { chute: { y0: 200, v0: 5, drop: 12 }, pillar: { x: 600, top: 450 }, cat: { x: 900, y: 400, lip: 1 } }
  return { seed, deal, shape, reference: last?.reference ?? [], verified: 'none', attempts: MAX_ATTEMPTS }
}

const worlds = new Map<number, World>()

// The day for a seed. A pure function of the seed; the cache only saves time
// when a fresh sim is built for a seed already seen.
export function worldFor(seed: number): World {
  const key = seed >>> 0
  const cached = worlds.get(key)
  if (cached) return cached
  const world = generate(key)
  if (worlds.size >= 256) worlds.delete(worlds.keys().next().value as number)
  worlds.set(key, world)
  return world
}

// ---------------------------------------------------------------------------
// The live sim
// ---------------------------------------------------------------------------

const SLOT_X = [250, 590, 930]
const SLOT_Y = 762
const SLOT_HALF = { w: 75, h: 55 }
const DEFAULT_SPOT = [
  { x: 300, y: 430 },
  { x: 600, y: 430 },
  { x: 900, y: 430 },
]
const TAP_MOVE = 18
const MISS_TICKS = 30
const HINT_AFTER = 240
const NEAR_DIST = 200
const MAX_EVENTS = 64
const DAY_BOX: Rect = { x: 990, y: 20, w: 170, h: 90 }

interface Tool {
  kind: ToolKind
  x: number
  y: number
  angle: number
  placed: boolean
  held: boolean
  slot: number
}

interface Grab {
  mode: 'move' | 'rotate' | 'chute' | 'day'
  tool: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  offX: number
  offY: number
  origX: number
  origY: number
  fromTray: boolean
}

type Phase = 'rigging' | 'rolling' | 'reached' | 'missed'

export interface ScrapSnapshot {
  tick: number
  phase: Phase
  day: number
  woken: number
  attempts: number
  deal: string
  ball: { x: number; y: number; r: number }
  trail: Array<{ x: number; y: number }>
  tools: Array<{
    kind: ToolKind
    x: number
    y: number
    angle: number
    placed: boolean
    held: boolean
    knob: { x: number; y: number } | null
  }>
  statics: Array<{ ax: number; ay: number; bx: number; by: number; r: number; role: 'chute' | 'pillar' | 'tray' }>
  cat: { x: number; y: number; awake: boolean; near: boolean }
  chuteBox: Rect
  dayBox: Rect | null
  hint: Placement | null
  closeness: number
}

const knobPos = (t: Tool) => {
  if (t.kind === 'bumper') return null
  let d = HALF[t.kind] + KNOB_GAP
  const at = (r: number) => ({ x: t.x + Math.cos(t.angle) * r, y: t.y + Math.sin(t.angle) * r })
  let k = at(d)
  while (d > 56 && (k.x < 24 || k.x > FIELD_W - 24 || k.y < 24 || k.y > TRAY_RETURN - 24)) {
    d -= 8
    k = at(d)
  }
  return k
}

const distToTool = (t: Placement, x: number, y: number): number => {
  if (t.kind === 'bumper') return Math.max(0, Math.hypot(x - t.x, y - t.y) - SPEC.bumper.r)
  if (t.kind === 'fan') return Math.max(0, Math.hypot(x - t.x, y - t.y) - SPEC.fan.body)
  const s = SPEC[t.kind]
  const dx = Math.cos(t.angle) * s.half
  const dy = Math.sin(t.angle) * s.half
  const abx = 2 * dx
  const aby = 2 * dy
  const u = clamp(((x - (t.x - dx)) * abx + (y - (t.y - dy)) * aby) / (abx * abx + aby * aby), 0, 1)
  return Math.max(0, Math.hypot(x - (t.x - dx + abx * u), y - (t.y - dy + aby * u)) - s.r)
}

export const createSim: CreateSim<ScrapSnapshot> = (config): Sim<ScrapSnapshot> => {
  const worldSeed = (day: number) => (day === 0 ? config.seed >>> 0 : deriveSeed(config.seed, day))
  let day = 0
  let world = worldFor(worldSeed(day))
  let statics = staticColliders(world.shape)

  const tools: Tool[] = []
  const stowedSpot = (i: number) => ({ x: SLOT_X[i]!, y: SLOT_Y })
  const dealTools = () => {
    tools.length = 0
    world.deal.forEach((kind, slot) => tools.push({ kind, ...stowedSpot(slot), angle: 0, placed: false, held: false, slot }))
  }
  dealTools()

  const grabs = new Map<number, Grab>()
  let pending: SimEvent[] = []
  let tick = 0
  let idle = 0
  let phase: Phase = 'rigging'
  let ball: Ball = startBall(world.shape)
  let attempts = 0
  let woken = 0
  let wokenToday = false
  let bestClose = 0
  let minDist = Infinity
  let still = 0
  let anchorX = 0
  let anchorY = 0
  let missTimer = 0
  let runTicks = 0
  let nearFired = false
  let touched = new Set<string>()
  let trail: Array<{ x: number; y: number }> = []

  const emit = (name: string) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push({ kind: 'state', name })
  }

  const dealCode = () => world.deal.map((k) => LETTER[k]).join('')
  const route = () => {
    const kinds = KINDS.filter((k) => touched.has(k))
    return kinds.length === 0 ? 'none' : kinds.join('+')
  }
  const distance0 = () => {
    const cat = world.shape.cat!
    const spot = catSpot(cat)
    const start = startBall(world.shape)
    return Math.max(1, Math.hypot(spot.x - start.x, spot.y - start.y))
  }

  const park = () => {
    ball = startBall(world.shape)
    ball.vx = 0
    ball.vy = 0
    phase = 'rigging'
  }

  const releaseBall = () => {
    ball = startBall(world.shape)
    phase = 'rolling'
    attempts++
    minDist = Infinity
    still = 0
    anchorX = ball.x
    anchorY = ball.y
    runTicks = 0
    nearFired = false
    touched = new Set()
    trail = []
    emit('release')
  }

  const nextDay = () => {
    day++
    world = worldFor(worldSeed(day))
    statics = staticColliders(world.shape)
    grabs.clear()
    dealTools()
    attempts = 0
    bestClose = 0
    wokenToday = false
    touched = new Set()
    trail = []
    park()
    emit('new-day')
  }

  const stow = (t: Tool) => {
    Object.assign(t, stowedSpot(t.slot), { angle: 0, placed: false })
  }

  const placedTools = () => tools.filter((t) => t.placed && !t.held)

  const chuteBox = (): Rect => chuteRect(world.shape.chute.y0)
  const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h

  // The sim's own hit-test. The go tap first (nothing in the yard may steal it),
  // then knobs (nearest), tools in the yard (nearest), tools in the tray, then
  // the day button. All forgiving for a young finger.
  const hitTest = (x: number, y: number): Omit<Grab, 'startX' | 'startY' | 'lastX' | 'lastY'> | null => {
    const base = { tool: -1, offX: 0, offY: 0, origX: 0, origY: 0, fromTray: false }
    if (inside(chuteBox(), x, y)) return { ...base, mode: 'chute' }
    // Two knobs can sit close together: the one nearest the finger turns.
    let knob = -1
    let knobD = Infinity
    tools.forEach((t, i) => {
      const k = t.placed && !t.held ? knobPos(t) : null
      const d = k ? Math.hypot(x - k.x, y - k.y) : Infinity
      if (d <= 36 && d < knobD) {
        knob = i
        knobD = d
      }
    })
    if (knob >= 0) return { ...base, mode: 'rotate', tool: knob }
    let best = -1
    let bestD = Infinity
    tools.forEach((t, i) => {
      if (!t.placed || t.held) return
      const d = distToTool(t, x, y)
      if (d <= GRAB_REACH && d < bestD) {
        best = i
        bestD = d
      }
    })
    if (best < 0) {
      best = tools.findIndex((t) => !t.placed && !t.held && Math.abs(x - t.x) <= SLOT_HALF.w && Math.abs(y - t.y) <= SLOT_HALF.h)
    }
    if (best >= 0) {
      const t = tools[best]!
      return { mode: 'move', tool: best, offX: t.x - x, offY: t.y - y, origX: t.x, origY: t.y, fromTray: !t.placed }
    }
    if (phase === 'reached' && inside(DAY_BOX, x, y)) return { ...base, mode: 'day' }
    return null
  }

  const finishGrab = (id: number) => {
    const g = grabs.get(id)
    if (!g) return
    grabs.delete(id)
    const moved = Math.hypot(g.lastX - g.startX, g.lastY - g.startY) >= TAP_MOVE
    if (g.mode === 'chute') {
      if (!moved) releaseBall()
    } else if (g.mode === 'day') {
      if (!moved) nextDay()
    } else if (g.mode === 'rotate') {
      emit('turn')
    } else {
      const t = tools[g.tool]!
      t.held = false
      if (!moved) {
        t.x = g.origX
        t.y = g.origY
        if (g.fromTray) {
          t.placed = true
          t.x = DEFAULT_SPOT[t.slot]!.x
          t.y = DEFAULT_SPOT[t.slot]!.y
          emit('place')
        } else if (t.kind !== 'bumper') {
          t.angle = snapAngle(t.angle + Math.PI / 6)
          emit('turn')
        }
      } else if (t.y >= TRAY_RETURN) {
        stow(t)
        emit('stow')
      } else {
        t.placed = true
        t.x = clamp(t.x, 30, FIELD_W - 30)
        t.y = clamp(t.y, 30, 660)
        // The go tap wins over tool bodies, so a tool's middle never rests in
        // it: it is set just past the edge, where it can still be picked up.
        const go = chuteBox()
        if (inside(go, t.x, t.y)) t.x = go.x + go.w + CHUTE_PUSH
        emit('place')
      }
    }
  }

  const pointer = (input: PointerInput) => {
    idle = 0
    const { id, phase: p, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (p === 'down') {
      if (!finite) return
      finishGrab(id)
      const h = hitTest(x, y)
      if (!h) return
      grabs.set(id, { ...h, startX: x, startY: y, lastX: x, lastY: y })
      if (h.mode === 'move') {
        tools[h.tool]!.held = true
        emit('pick')
      }
      return
    }
    const g = grabs.get(id)
    if (g && finite) {
      g.lastX = x
      g.lastY = y
      const t = g.tool >= 0 ? tools[g.tool]! : null
      if (g.mode === 'move' && t) {
        t.x = clamp(x + g.offX, 0, FIELD_W)
        t.y = clamp(y + g.offY, 0, FIELD_H)
      } else if (g.mode === 'rotate' && t && Math.hypot(x - t.x, y - t.y) >= 12) {
        t.angle = snapAngle(Math.atan2(y - t.y, x - t.x))
      }
    }
    if (p === 'up') finishGrab(id)
  }

  const step = () => {
    tick++
    idle++
    if (phase === 'rolling') {
      const cs = [...statics]
      const fans: Fan[] = []
      for (const t of placedTools()) addTool({ kind: t.kind, x: t.x, y: t.y, angle: t.angle }, cs, fans)
      const hit: Hit = { kinds: touched, tool: false }
      advance(ball, cs, fans, hit)
      runTicks++
      if (runTicks % 2 === 0) trail.push({ x: ball.x, y: ball.y })
      const cat = world.shape.cat!
      const spot = catSpot(cat)
      const d = Math.hypot(ball.x - spot.x, ball.y - spot.y)
      minDist = Math.min(minDist, d)
      bestClose = Math.max(bestClose, 1 - Math.min(1, minDist / distance0()))
      if (!nearFired && d < NEAR_DIST) {
        nearFired = true
        emit('near')
      }
      if (inZone(ball, cat) && Math.hypot(ball.vx, ball.vy) <= SOFT) {
        phase = 'reached'
        bestClose = 1
        if (!wokenToday) {
          wokenToday = true
          woken++
        }
        emit('cat-wakes')
        return
      }
      still = Math.hypot(ball.vx, ball.vy) < STILL_SPEED ? still + 1 : 0
      let stuck = false
      if (runTicks % STUCK_EVERY === 0) {
        stuck = runTicks >= STUCK_AFTER && Math.hypot(ball.x - anchorX, ball.y - anchorY) < STUCK_DIST
        anchorX = ball.x
        anchorY = ball.y
      }
      if (still >= STILL_TICKS || stuck || runTicks >= RUN_TICKS) {
        phase = 'missed'
        missTimer = MISS_TICKS
        emit('miss')
      }
    } else if (phase === 'missed') {
      if (--missTimer <= 0) park()
    }
  }

  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    const fit = (cx: number, cy: number, w: number, h: number) => ({
      x: clamp(cx - w / 2, 0, FIELD_W - w),
      y: clamp(cy - h / 2, 0, FIELD_H - h),
      w,
      h,
    })
    const count = tools.filter((t) => t.placed).length
    for (const t of tools) {
      if (t.held) continue
      if (!t.placed) {
        list.push({ ...fit(t.x, t.y, 150, 110), kind: 'drag', salience: count < 3 ? 0.75 : 0.3 })
        continue
      }
      list.push({ ...fit(t.x, t.y, 76, 76), kind: 'drag', salience: 0.5 })
      const k = knobPos(t)
      if (k) list.push({ ...fit(k.x, k.y, 64, 64), kind: 'drag', salience: 0.3 })
    }
    list.push({ ...chuteBox(), kind: 'tap', salience: phase === 'rolling' ? 0.3 : count >= 1 ? 0.8 : 0.45 })
    if (phase === 'reached') list.push({ ...DAY_BOX, kind: 'tap', salience: 0.95 })
    return list
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    const signature =
      phase === 'rigging' ? `rig-${dealCode()}` : phase === 'rolling' ? 'rolling' : `${phase === 'reached' ? 'reached' : 'missed'}-${route()}`
    return {
      signature,
      features: {
        closeness: bestClose,
        placed: tools.filter((t) => t.placed).length,
        attempts,
        woken,
        touched: KINDS.filter((k) => touched.has(k)).length,
      },
      events,
    }
  }

  // Data for the view only: a ghost of the first tool that is not yet where the
  // day's known solution has it. It never changes what the sim does.
  const hint = (): Placement | null => {
    if (!config.hints || idle < HINT_AFTER || (phase !== 'rigging' && phase !== 'missed')) return null
    for (const ref of world.reference) {
      const t = tools.find((o) => o.kind === ref.kind)
      if (!t || !t.placed || Math.hypot(t.x - ref.x, t.y - ref.y) > 70) return { ...ref }
    }
    return null
  }

  const snapshot = (): ScrapSnapshot => {
    const cat = world.shape.cat!
    return {
      tick,
      phase,
      day,
      woken,
      attempts,
      deal: dealCode(),
      ball: { x: ball.x, y: ball.y, r: BALL_R },
      trail: trail.slice(),
      tools: tools.map((t) => ({
        kind: t.kind,
        x: t.x,
        y: t.y,
        angle: t.angle,
        placed: t.placed,
        held: t.held,
        knob: t.placed && !t.held ? knobPos(t) : null,
      })),
      // Skip the floor and the two side walls; the view draws those itself.
      statics: statics.slice(3).map((c, i) => {
        const s = c as Cap
        return { ax: s.ax, ay: s.ay, bx: s.bx, by: s.by, r: s.r, role: i === 0 ? ('chute' as const) : i === 1 ? ('pillar' as const) : ('tray' as const) }
      }),
      cat: { x: cat.x, y: cat.y, awake: phase === 'reached', near: phase === 'rolling' && nearFired },
      chuteBox: chuteBox(),
      dayBox: phase === 'reached' ? { ...DAY_BOX } : null,
      hint: hint(),
      closeness: bestClose,
    }
  }

  return { step, pointer, affordances, observe, snapshot }
}
