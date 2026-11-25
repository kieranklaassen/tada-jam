import { CELL, CELLS, DROP_FROM, FIELD, FULL, HALF, HOME, PLACES, REACH, SINK, SNOW, SPOTS, START, START_R, THINGS, WALK_TO, type PlaceId, type Point, type ThingId } from './layout'
import { makeRng } from './rng'

// The rules. A ball is a disc: a thing it touches keeps the place on the disc
// where it was touched, and turns with it. Nothing here draws or makes a sound.
// It is stepped at a fixed rate and draws only from its own random stream.

export const STEP = 1 / 60
/** A thing in a ball: where on the disc, in the disc's own frame, and how it is turned there. */
export type Stuck = { id: ThingId; x: number; y: number; rot: number }
export type Ball = { r: number; spin: number; things: Stuck[] }
export type Rolling = Ball & Point & { vx: number; vy: number; taken: number; /** Seconds still falling from the tree. */ fall: number }
export type Hop = { ball: Ball; from: Point; t: number }
export type Walk = { t: number; x: number; face: number; /** Seconds since the shiver began, or -1 while he walks. */ shiver: number; loose: ThingId | null }
export type Heap = { t: number; x: number; from: Record<string, Point>; /** How big he was, so that the heap is as much snow. */ mass: number }
export type Act =
  | { type: 'press'; on: 'snow' | 'man' | 'robin' | 'house' | 'tree' | 'sky' | ThingId }
  | { type: 'stick'; id: ThingId } | { type: 'crunch'; amount: number } | { type: 'full' } | { type: 'jolt' }
  | { type: 'hop' } | { type: 'land'; place: PlaceId } | { type: 'drop' } | { type: 'wake' }
  | { type: 'walk' } | { type: 'turn' } | { type: 'shiver' } | { type: 'leap'; id: ThingId | null } | { type: 'flop' } | { type: 'home'; id: ThingId }

export type World = {
  time: number
  stack: Ball[]
  ball: Rolling | null
  loose: Partial<Record<ThingId, Point>>
  bare: Uint8Array
  target: Point | null
  /** The ball was sent to him. */
  forMan: boolean
  /** A finger is on the snow. */
  held: boolean
  hop: Hop | null
  walk: Walk | null
  heap: Heap | null
  /** Seconds until the next ball falls, or -1. */
  next: number
  /** The child has let go of the snow, so a full ball may hop. */
  freed: boolean
  /** Seconds he has been whole. */
  awake: number
  /** Seconds a full ball has been let go. */
  letGo: number
  seed: number
  shown: boolean
  events: Act[]
}

export const HOP = 0.75
/** How long a full ball waits after the finger lets go, so that a child who taps can go on. */
export const LET_GO = 1.8
/** How long he is looked at, whole, before a touch can set him off. */
export const LOOK = 1.3
export const OUT = 6.2
/** Until then a touch jolts him and he walks on. */
export const THIRD_STEP = 2.2
export const SHIVER = 1.1
export const FLOP = 1.6
/** How far the one that shakes free has got when he flops. */
export const LEAP: Point = { x: -120, y: -105 }
const FALL = 0.8
/** How much one cell adds to the square of the radius. */
const PER_CELL = 38

export const plain = (r: number): Ball => ({ r, spin: 0, things: [] })
const fresh = (): Rolling => ({ r: START_R, spin: 0, things: [], ...START, vx: 0, vy: 0, taken: 0, fall: 0 })

/** A shuffled deal of the spots. Writes the stream back. */
function deal(world: World): Point[] {
  const rng = makeRng(world.seed), spots = [...SPOTS]
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1))
    ;[spots[i], spots[j]] = [spots[j], spots[i]]
  }
  world.seed = rng.state
  return spots
}

export function freshWorld(): World {
  const loose: World['loose'] = {}
  // The first visit's deal is drawn up by hand: the cat and the goose are in sight, and nothing lies before the ball.
  const order: (ThingId | null)[] = ['rake', 'cat', 'umbrella', 'goose', 'spring', 'tuba', null, 'wheel']
  order.forEach((id, i) => { if (id) loose[id] = { ...SPOTS[i] } })
  const ball = fresh()
  ball.r = 44
  ball.things = [{ id: 'boot', x: 10, y: -30, rot: 0.35 }]
  return { time: 0, stack: [plain(FULL.base - 4), plain(FULL.belly - 4)], ball, loose, bare: new Uint8Array(CELLS), target: null, forMan: false, held: false, hop: null, walk: null, heap: null, next: -1, letGo: 0, awake: 0, freed: false, seed: 7, shown: false, events: [] }
}

export const complete = (world: World): boolean => world.stack.length === 3
export const ready = (world: World): boolean => complete(world) && !world.walk && !world.hop
/** Nothing is under way but what a finger does. */
export const quiet = (world: World): boolean => !world.hop && !world.walk && !world.heap?.t && world.next < 0 && (!world.ball || (world.ball.fall <= 0 && Math.hypot(world.ball.vx, world.ball.vy) < 4))
export const nextPlace = (world: World): PlaceId => PLACES[Math.min(2, world.stack.length)]
export const fullOf = (world: World): number => FULL[nextPlace(world)]
export const isFull = (world: World, ball: Ball): boolean => ball.r >= fullOf(world) - 0.01

/** The middle of each ball of a stack that stands on (x, y). */
export function centres(stack: readonly Ball[], x: number, y: number): Point[] {
  const at: Point[] = []
  let top = y
  stack.forEach((b, i) => {
    const below = stack[i - 1]
    const sink = i === 0 ? b.r * 0.1 : Math.min(b.r, below.r) * SINK
    const cy = top + sink - b.r
    at.push({ x, y: cy })
    top = cy - b.r
  })
  return at
}
/** Where the next ball's middle will be. */
export function seat(world: World, r: number): Point {
  return centres([...world.stack, plain(r)], HOME.x, HOME.y).at(-1)!
}
/** A stuck thing's place round the middle of its ball. */
export function spun(ball: Ball, s: Stuck): Point & { rot: number } {
  const c = Math.cos(ball.spin), n = Math.sin(ball.spin)
  return { x: s.x * c - s.y * n, y: s.x * n + s.y * c, rot: s.rot + ball.spin }
}

/** Sticks a thing where the ball touches it. */
export function stick(ball: Ball & Point, id: ThingId, at: Point): void {
  const cx = ball.x, cy = ball.y - ball.r
  let a = Math.atan2(at.y - HALF[id] - cy, at.x - cx)
  const out = ball.r * 0.96
  // Two things never lie on each other: the later one slides round to the nearest free place.
  const local = (angle: number): Point => ({ x: Math.cos(angle - ball.spin) * out, y: Math.sin(angle - ball.spin) * out })
  const free = (angle: number): boolean => { const p = local(angle); return ball.things.every((s) => Math.hypot(s.x - p.x, s.y - p.y) > 52) }
  for (let i = 1; i < 16 && !free(a); i++) {
    const turn = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.4
    if (free(a + turn)) { a += turn; break }
  }
  ball.things.push({ id, ...local(a), rot: -ball.spin })
}

export function press(world: World, at: Point): void {
  world.held = true
  world.freed = false
  aim(world, at)
}
export function aim(world: World, at: Point): void {
  world.letGo = 0
  if (!world.ball) return
  world.forMan = onMan(world, at)
  world.target = world.forMan ? { ...HOME, y: FIELD.y0 } : clampField(at)
}
export function release(world: World): void { world.held = false; world.freed = true }
export const clampField = (p: Point): Point => ({ x: Math.min(FIELD.x1, Math.max(FIELD.x0, p.x)), y: Math.min(FIELD.y1, Math.max(FIELD.y0, p.y)) })

/** Where he pats, and he himself: the child means him when the ball is sent here. */
export function onMan(world: World, p: Point): boolean {
  if (world.walk) return Math.abs(p.x - world.walk.x) < 130 && p.y > 60 && p.y < 660
  const top = world.stack.length ? seat(world, 70).y - 90 : HOME.y - 170
  return Math.abs(p.x - HOME.x) < 125 && p.y > top && p.y < HOME.y + 34
}
/** Who shakes free: the cat first, then the goose, then whatever came last. */
export function loosest(stack: readonly Ball[]): ThingId | null {
  const all = stack.flatMap((b) => b.things.map((s) => s.id))
  return all.includes('cat') ? 'cat' : all.includes('goose') ? 'goose' : all.at(-1) ?? null
}

export function startWalk(world: World): void {
  if (!ready(world)) return
  if (world.awake < LOOK) { world.events.push({ type: 'jolt' }); return }
  world.walk = { t: 0, x: HOME.x, face: -1, shiver: -1, loose: loosest(world.stack) }
  world.target = null
  world.held = false
  world.events.push({ type: 'walk' })
}
/** A touch during the walk brings the shiver now. */
export function hurry(world: World): void {
  const w = world.walk
  if (w && w.shiver < 0 && w.t < THIRD_STEP) { world.events.push({ type: 'jolt' }); return }
  if (w && w.shiver < 0) { w.shiver = 0; world.events.push({ type: 'shiver' }) }
}

/** Where he is after `t` seconds of walking: out, round, and home. */
export function walkX(t: number): { x: number; face: number } {
  const u = (t - 0.5) / (OUT - 0.5)
  if (u <= 0) return { x: HOME.x, face: -1 }
  const ease = (v: number) => v * v * (3 - 2 * v)
  if (u < 0.46) return { x: HOME.x + (WALK_TO - HOME.x) * ease(u / 0.46), face: -1 }
  if (u < 0.54) return { x: WALK_TO, face: -1 + (2 * (u - 0.46)) / 0.08 }
  return { x: WALK_TO + (HOME.x - WALK_TO) * ease(Math.min(1, (u - 0.54) / 0.46)), face: 1 }
}

/** Puts every thing on the snow for the next round: what a walk ends in. */
function toRound(world: World): void {
  const free = deal(world)
  const back = [...THINGS].filter((id) => !world.loose[id])
  const taken = (p: Point) => Object.values(world.loose).some((q) => q && Math.hypot(p.x - q.x, p.y - q.y) < 30)
  const spots = free.filter((p) => !taken(p))
  back.forEach((id, i) => { world.loose[id] = { ...spots[i] } })
  world.stack = []
}

function land(world: World, ball: Ball): void {
  const place = nextPlace(world)
  world.stack.push(ball)
  world.hop = null
  world.heap = null
  world.bare.fill(0)
  world.events.push({ type: 'land', place })
  if (complete(world)) world.events.push({ type: 'wake' })
  else world.next = 0.5
}

/** What is saved: the same world with whatever is under way brought to its end. */
export function settled(world: World): World {
  const w: World = { ...world, stack: world.stack.slice(), loose: structuredClone(world.loose), bare: world.bare.slice(), events: [], target: null, forMan: false, held: false, hop: null, walk: null, next: -1, letGo: 0, freed: false, heap: null }
  if (world.hop) { w.stack.push(world.hop.ball); w.bare.fill(0); w.ball = null }
  if (world.walk) { toRound(w); w.bare.fill(0) }
  w.ball = w.ball ? { ...w.ball, vx: 0, vy: 0, fall: 0 } : complete(w) ? null : fresh()
  return w
}

export function step(world: World, dt = STEP): void {
  world.time += dt
  world.awake = complete(world) ? world.awake + dt : 0
  if (world.next >= 0) {
    world.next -= dt
    if (world.next < 0 && !world.ball && !complete(world)) {
      world.ball = { ...fresh(), fall: FALL }
      world.events.push({ type: 'drop' })
    }
  }
  if (world.heap && world.heap.t > 0) heapStep(world, world.heap, dt)
  if (world.hop) {
    world.hop.t += dt
    if (world.hop.t >= HOP) land(world, world.hop.ball)
  }
  if (world.walk) walkStep(world, world.walk, dt)
  if (world.ball) roll(world, world.ball, dt)
}

function walkStep(world: World, w: Walk, dt: number): void {
  if (w.shiver < 0) {
    w.t += dt
    const before = w.face
    const at = walkX(w.t)
    w.x = at.x
    w.face = at.face
    if (before < 0 && w.face >= 0) world.events.push({ type: 'turn' })
    if (w.t >= OUT) hurry(world)
    return
  }
  const before = w.shiver
  w.shiver += dt
  if (before < SHIVER * 0.7 && w.shiver >= SHIVER * 0.7) world.events.push({ type: 'leap', id: w.loose })
  if (w.shiver < SHIVER) return
  // The flop: everything goes back to the snow from where it is.
  const from: Record<string, Point> = {}
  const mids = centres(world.stack, w.x, HOME.y)
  world.stack.forEach((b, i) => b.things.forEach((s) => { const p = spun(b, s); const out = s.id === w.loose ? LEAP : { x: 0, y: 0 }; from[s.id] = { x: mids[i].x + p.x + out.x, y: mids[i].y + p.y + out.y } }))
  const mass = Math.sqrt(world.stack.reduce((n, b) => n + b.r * b.r, 0))
  toRound(world)
  world.walk = null
  world.bare.fill(0)
  world.heap = { t: 0.0001, x: w.x, from, mass }
  world.events.push({ type: 'flop' })
}

function heapStep(world: World, h: Heap, dt: number): void {
  const before = h.t
  h.t += dt
  for (const id of THINGS) if (h.from[id] && before < 1.1 && h.t >= 1.1) world.events.push({ type: 'home', id })
  // It crawls home on its arms.
  if (h.t > FLOP) h.x += Math.sign(HOME.x - h.x) * Math.min(Math.abs(HOME.x - h.x), 300 * dt)
  if (h.t > FLOP && Math.abs(HOME.x - h.x) < 0.5) {
    h.t = 0
    h.x = HOME.x
    world.next = 0.2
  }
}

/** The share of a stack's foot that a ball meets. */
function nearMan(world: World, b: Rolling): boolean {
  const foot = world.stack[0]?.r ?? 100
  return Math.hypot(b.x - HOME.x, (b.y - HOME.y) * 1.2) < b.r * 0.7 + foot * 0.72 - 0.5
}

function roll(world: World, b: Rolling, dt: number): void {
  if (b.fall > 0) { b.fall = Math.max(0, b.fall - dt); return }
  if (world.hop || world.walk) return
  const t = world.target
  let wantX = 0, wantY = 0
  if (t) {
    const dx = t.x - b.x, dy = t.y - b.y, d = Math.hypot(dx, dy)
    const top = 620 - b.r * 1.6
    const v = Math.min(top, d * 6)
    if (d > 1) { wantX = (dx / d) * v; wantY = (dy / d) * v }
    if (d < 8 && Math.hypot(b.vx, b.vy) < 24 && !world.held) world.target = null
  }
  const k = 1 - Math.exp(-dt * 9)
  b.vx += (wantX - b.vx) * k
  b.vy += (wantY - b.vy) * k
  const x0 = b.x, y0 = b.y
  const to = clampField({ x: b.x + b.vx * dt, y: b.y + b.vy * dt })
  b.x = to.x
  b.y = to.y
  const moved = Math.hypot(b.x - x0, b.y - y0)
  if (moved > 0.001) {
    // Seen from the front: going sideways turns it truly, going to or from the child turns it a little the same way.
    const dir = Math.abs(b.vx) > 8 ? Math.sign(b.vx) : 1
    b.spin += ((b.x - x0) + dir * Math.abs(b.y - y0) * 0.6) / b.r
    take(world, b, moved)
    touch(world, b)
  }
  if (nearMan(world, b)) {
    if (world.forMan) return startHop(world, b)
    // Led past him it rolls round him, on the child's side, or stops where there is no room.
    const away = (b.r * 0.7 + (world.stack[0]?.r ?? 100) * 0.72) / (Math.hypot(b.x - HOME.x, (b.y - HOME.y) * 1.2) || 1)
    const out = clampField({ x: HOME.x + (b.x - HOME.x) * away, y: HOME.y + Math.max(4, b.y - HOME.y) * away })
    b.x = out.x
    b.y = out.y
    if (nearMan(world, b)) { b.x = x0; b.y = y0 }
    // A place in front of him that it cannot get into is not worth grinding for.
    if (Math.hypot(b.x - x0, b.y - y0) < 0.5 && !world.held) { world.target = null; b.vx = b.vy = 0 }
  }
  if (isFull(world, b) && world.freed) {
    world.letGo += dt
    if (world.letGo > LET_GO) startHop(world, b)
  } else world.letGo = 0
}

function startHop(world: World, b: Rolling): void {
  world.hop = { ball: { r: b.r, spin: b.spin, things: b.things }, from: { x: b.x, y: b.y - b.r }, t: 0 }
  world.ball = null
  world.target = null
  world.held = false
  world.letGo = 0
  world.freed = false
  world.events.push({ type: 'hop' })
}

/** Takes the snow under the ball. A full ball still clears its track. */
function take(world: World, b: Rolling, moved: number): void {
  const rx = Math.max(16, b.r * 0.5), ry = Math.max(12, b.r * 0.3)
  let got = 0
  const c0 = Math.max(0, Math.floor((b.x - rx - SNOW.x) / CELL)), c1 = Math.min(SNOW.cols - 1, Math.floor((b.x + rx - SNOW.x) / CELL))
  const r0 = Math.max(0, Math.floor((b.y - ry - SNOW.y) / CELL)), r1 = Math.min(SNOW.rows - 1, Math.floor((b.y + ry - SNOW.y) / CELL))
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const i = r * SNOW.cols + c
    const x = SNOW.x + (c + 0.5) * CELL, y = SNOW.y + (r + 0.5) * CELL
    if (world.bare[i] || ((x - b.x) / rx) ** 2 + ((y - b.y) / ry) ** 2 > 1) continue
    world.bare[i] = 1
    got++
  }
  const full = fullOf(world)
  if (got) {
    b.taken += got
    const was = b.r
    b.r = Math.max(was, Math.min(full, Math.sqrt(b.r * b.r + got * PER_CELL)))
    if (b.r >= full && was < full) world.events.push({ type: 'full' })
  }
  world.events.push({ type: 'crunch', amount: moved })
}

function touch(world: World, b: Rolling): void {
  for (const id of THINGS) {
    const p = world.loose[id]
    if (!p) continue
    if (Math.hypot(p.x - b.x, (p.y - b.y) * 1.1) > b.r * 0.75 + REACH) continue
    delete world.loose[id]
    stick(b, id, p)
    world.events.push({ type: 'stick', id })
  }
}

/** Where a falling ball is drawn: from the tree to its start, bouncing once. */
export function fallAt(b: Rolling): Point {
  const u = 1 - b.fall / FALL
  if (u >= 1) return { x: b.x, y: b.y }
  const v = Math.min(1, u / 0.7)
  const lift = u > 0.7 ? Math.sin(((u - 0.7) / 0.3) * Math.PI) * 26 : 0
  return { x: DROP_FROM.x + (b.x - DROP_FROM.x) * u, y: DROP_FROM.y + (b.y - DROP_FROM.y) * v * v - lift }
}
