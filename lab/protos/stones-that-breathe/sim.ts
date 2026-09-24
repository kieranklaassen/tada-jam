// Stones That Breathe. A frog on the left bank; a lily on the right. Between
// them a river of stones that rise and sink, each on its own slow period. Tap a
// stone in reach to send the frog leaping to it; taps queue, so a run of taps is
// a run of leaps. A leap onto a sunk stone, or a stone that sinks under the frog,
// is a soft splash back to the bank you left from.
//
// The variation: every session is a new "day". The day draws one hidden beat and
// gives every stone a whole multiple of it as its period (in one of four
// patterns), so what is safe to land on is different each day but always shares
// the beat. A generator only keeps days whose whole path comes up together
// often enough to wait for.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now, or
// performance.now. It reads a seeded rng once (to draw the day) and counts ticks.

import { createRng, int, pick } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface Point {
  x: number
  y: number
}

// ------------------------------------------------------------------ geometry
export const STONE_R = 54
// A child's finger is not a pixel: the sim's own hit-test forgives this much.
const HIT_SLOP = 60
// Ticks one leap takes (about a third of a second).
export const HOP_T = 10
// The farthest one leap can go.
export const REACH = 290
// A leap lands only on a stone at least this high; a frog already sitting on a
// stone is only dunked once the stone falls below SINK_H (a little grace).
export const LAND_H = 0.3
export const SINK_H = 0.08
const LANES_Y = [300, 520] as const
export const SPOTS: readonly [Point, Point] = [
  { x: 170, y: 410 },
  { x: 1010, y: 410 },
]
export const BANKS: readonly [Rect, Rect] = [
  { x: 20, y: 290, w: 210, h: 240 },
  { x: 950, y: 290, w: 210, h: 240 },
]
// Node ids: stones are 0..9 (column * 2 + lane); the banks are 100 and 101.
export const BANK_L = 100
export const BANK_R = 101
export const START_COLS = 4
export const MAX_COLS = 5
const COL_X: Record<number, readonly number[]> = {
  4: [330, 503, 677, 850],
  5: [330, 460, 590, 720, 850],
}
const MAX_QUEUE = 8
export const SPLASH_T = 16
export const NOPE_T = 10
const HINT_AFTER_TICKS = 150
const MAX_EVENTS = 64

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const inside = (rect: Rect, x: number, y: number) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h

export function stonePositions(cols: number): Point[] {
  const xs = COL_X[cols]!
  const list: Point[] = []
  for (let c = 0; c < cols; c++) for (let l = 0; l < 2; l++) list.push({ x: xs[c]!, y: LANES_Y[l]! })
  return list
}

interface Geom {
  pos: Point[]
  adj: number[][]
  fromLeft: number[]
  toRight: number[]
}

function buildGeom(cols: number): Geom {
  const pos = stonePositions(cols)
  const adj = pos.map((p, i) => pos.flatMap((q, j) => (j !== i && dist(p, q) <= REACH ? [j] : [])))
  const ids = pos.map((_, i) => i)
  return {
    pos,
    adj,
    fromLeft: ids.filter((i) => dist(SPOTS[0], pos[i]!) <= REACH),
    toRight: ids.filter((i) => dist(SPOTS[1], pos[i]!) <= REACH),
  }
}

const GEOM: Record<number, Geom> = { 4: buildGeom(4), 5: buildGeom(5) }

// ----------------------------------------------------------------------- day
export type Pattern = 'unison' | 'thirds' | 'march' | 'zipper'
export const PATTERNS: readonly Pattern[] = ['unison', 'thirds', 'march', 'zipper']
// The multiples of the beat a pattern may give its stones.
const KSETS: Record<Pattern, readonly number[]> = {
  unison: [1, 2],
  thirds: [1, 3],
  march: [1, 2, 4],
  zipper: [1, 2],
}
const BEAT_MIN = 110
const BEAT_MAX = 150
const DAY_ATTEMPTS = 24
// A day is kept when the whole path comes up together for at least this share of
// its cycle (a four-column and a five-column river), and never leaves a wait
// longer than MAX_GAP_TICKS (about 16 seconds) between good moments.
const MIN_SHARE = { 4: 0.1, 5: 0.05 } as const
export const MAX_GAP_TICKS = 500

export interface Day {
  pattern: Pattern
  // The hidden beat, in ticks.
  beat: number
  // Per stone: the multiple of the beat that is its period, and its offset.
  ks: number[]
  offs: number[]
  // The world clock at tick 0 (the day begins mid-cycle).
  start: number
  // Ticks after which every stone is back where it started (whole day cycle).
  period: number
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b

function offsetFor(pattern: Pattern, id: number, beat: number): number {
  const col = Math.floor(id / 2)
  const lane = id % 2
  // A wave that rolls across the river, a quarter beat per column.
  if (pattern === 'march') return -col * Math.round(beat / 4)
  // The far lane is half a beat behind the near one.
  if (pattern === 'zipper') return lane === 1 ? -Math.round(beat / 2) : 0
  return 0
}

// 1 at the top of a stone's rise, 0 at the bottom of its sink. Peaks are at the
// clock values where (clock + offset) is a multiple of the stone's period.
export function stoneHeight(day: Day, id: number, clock: number): number {
  const period = day.ks[id]! * day.beat
  const phase = mod(clock + day.offs[id]!, period) / period
  return 0.5 + 0.5 * Math.cos(2 * Math.PI * phase)
}

function mod(a: number, p: number): number {
  return ((a % p) + p) % p
}

// The shortest run from the left bank to the right that lands every leap on a
// stone that is up, when the first leap starts at clock t0 and the taps keep
// pace with the frog. Null when there is none. The fewest leaps come first.
export function findRun(day: Day, cols: number, t0: number): number[] | null {
  const g = GEOM[cols]!
  let layer = new Map<number, number[]>()
  for (const id of g.fromLeft) if (stoneHeight(day, id, t0 + HOP_T) >= LAND_H) layer.set(id, [id])
  for (let j = 0; j <= cols + 1 && layer.size > 0; j++) {
    for (const [id, path] of layer) if (g.toRight.includes(id)) return path
    const T = t0 + (j + 2) * HOP_T
    const next = new Map<number, number[]>()
    for (const [id, path] of layer) {
      for (const v of g.adj[id]!) {
        if (path.includes(v) || next.has(v)) continue
        if (stoneHeight(day, v, T) >= LAND_H) next.set(v, [...path, v])
      }
    }
    layer = next
  }
  return null
}

// Whether a fixed route of stones (then the far bank) is up at every landing
// when the first leap starts at clock t0.
export function routeWorks(day: Day, route: readonly number[], t0: number): boolean {
  return route.every((id, j) => stoneHeight(day, id, t0 + (j + 1) * HOP_T) >= LAND_H)
}

// Every start time within one cycle from which some run works.
export function goodStarts(day: Day, cols: number): number[] {
  const list: number[] = []
  for (let t = 0; t < day.period; t++) if (findRun(day, cols, t) !== null) list.push(t)
  return list
}

// The longest wait, in ticks, from any moment to the next good start.
export function maxGap(good: readonly number[], period: number): number {
  if (good.length === 0) return Number.POSITIVE_INFINITY
  let gap = 0
  for (let i = 0; i < good.length; i++) {
    const next = i + 1 < good.length ? good[i + 1]! : good[0]! + period
    gap = Math.max(gap, next - good[i]!)
  }
  return gap
}

function makeDay(rng: Rng): Day {
  const pattern = pick(rng, PATTERNS)
  let best: Day | null = null
  let bestScore = -1
  for (let attempt = 0; attempt < DAY_ATTEMPTS; attempt++) {
    const beat = int(rng, BEAT_MIN, BEAT_MAX)
    const ks = Array.from({ length: 2 * MAX_COLS }, () => pick(rng, KSETS[pattern]))
    const offs = ks.map((_, id) => offsetFor(pattern, id, beat))
    const period = ks.reduce((acc, k) => lcm(acc, k), 1) * beat
    const day: Day = { pattern, beat, ks, offs, start: 0, period }
    const good4 = goodStarts(day, 4)
    const good5 = goodStarts(day, 5)
    const ok =
      good4.length / period >= MIN_SHARE[4] &&
      good5.length / period >= MIN_SHARE[5] &&
      maxGap(good4, period) <= MAX_GAP_TICKS &&
      maxGap(good5, period) <= MAX_GAP_TICKS
    const score = Math.min(good4.length / period / MIN_SHARE[4], good5.length / period / MIN_SHARE[5])
    if (ok) {
      best = day
      break
    }
    if (score > bestScore) {
      best = day
      bestScore = score
    }
  }
  const day = best!
  day.start = int(rng, 0, day.period - 1)
  return day
}

// The day a seed gives (the first thing the sim draws from its rng).
export function dayForSeed(seed: number): Day {
  return makeDay(createRng(seed))
}

// ------------------------------------------------------------------ the sim
type Last = 'none' | 'dunked' | 'clean' | 'messy'

interface Hop {
  from: number
  to: number
  t: number
}

// Plain data the view draws from (contract: snapshot).
export interface StonesSnapshot {
  tick: number
  // The world clock (the day starts mid-cycle).
  clock: number
  cols: number
  stones: Array<{ id: number; x: number; y: number; h: number; up: boolean; live: boolean; queued: number }>
  frog: { x: number; y: number; lift: number; node: number; hopping: boolean }
  queue: number[]
  // Where the frog's plan goes, from the frog through each queued node.
  path: Point[]
  lilySide: 0 | 1
  banks: [Rect, Rect]
  splash: { x: number; y: number; t: number } | null
  nope: { x: number; y: number; t: number } | null
  crossings: number
  clean: number
  dunks: number
  last: Last
  // Null when the bloom hook is removed.
  blooms: number | null
  // Where the idle hint points, or null. Only set when config.hints is on.
  hint: Point | null
}

export const createSim: CreateSim<StonesSnapshot> = (config): Sim<StonesSnapshot> => {
  const rng = createRng(config.seed)
  // (contract: hooks) Each hook is honoured only when it is in this list.
  const hooks = new Set(config.hooks)
  const day = makeDay(rng)

  let cols = START_COLS
  const stones: Point[] = [...stonePositions(START_COLS).map((p) => ({ ...p })), { x: 850, y: LANES_Y[0] }, { x: 850, y: LANES_Y[1] }]
  let tick = 0
  let idle = 0
  let at = BANK_L
  let hop: Hop | null = null
  const queue: number[] = []
  let attemptSide: 0 | 1 | null = null
  let crossings = 0
  let landings = 0
  let cleans = 0
  let dunks = 0
  let dunksSince = 0
  let blooms = 0
  let last: Last = 'none'
  let splash: { x: number; y: number; t: number } | null = null
  let nope: { x: number; y: number; t: number } | null = null
  let pending: SimEvent[] = []

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  const clock = () => day.start + tick
  const isStone = (n: number) => n < BANK_L
  const nodePos = (n: number): Point => (n === BANK_L ? SPOTS[0] : n === BANK_R ? SPOTS[1] : stones[n]!)
  const height = (id: number) => stoneHeight(day, id, clock())
  const canReach = (a: number, b: number) => a !== b && dist(nodePos(a), nodePos(b)) <= REACH
  // Where the next tapped stone would be leapt to from.
  const cursor = () => (queue.length > 0 ? queue[queue.length - 1]! : hop ? hop.to : at)

  // The sim's own hit-test: the nearest live stone within its radius plus slop,
  // else a bank.
  const hitNode = (x: number, y: number): number | null => {
    let best = -1
    let bestDistance = Infinity
    for (let id = 0; id < cols * 2; id++) {
      const d = Math.hypot(x - stones[id]!.x, y - stones[id]!.y)
      if (d <= STONE_R + HIT_SLOP && d < bestDistance) {
        best = id
        bestDistance = d
      }
    }
    if (best >= 0) return best
    if (inside(BANKS[0], x, y)) return BANK_L
    if (inside(BANKS[1], x, y)) return BANK_R
    return null
  }

  // A soft splash: back to the bank the run started from, plan cleared.
  const dunk = () => {
    const p = nodePos(hop ? hop.to : at)
    splash = { x: p.x, y: p.y, t: SPLASH_T }
    hop = null
    queue.length = 0
    at = attemptSide === 1 ? BANK_R : BANK_L
    attemptSide = null
    dunks++
    dunksSince++
    last = 'dunked'
    emit({ kind: 'state', name: 'dunk' })
  }

  const cross = () => {
    crossings++
    const clean = dunksSince === 0
    last = clean ? 'clean' : 'messy'
    emit({ kind: 'state', name: 'cross' })
    if (clean) {
      cleans++
      if (hooks.has('bloom')) {
        blooms++
        emit({ kind: 'hook', name: 'bloom' })
      }
      if (hooks.has('widen') && cols < MAX_COLS) {
        cols = MAX_COLS
        emit({ kind: 'hook', name: 'widen' })
      }
    }
    dunksSince = 0
  }

  const land = (node: number) => {
    if (isStone(node)) {
      if (height(node) < LAND_H) {
        dunk()
        return
      }
      at = node
      hop = null
      landings++
      emit({ kind: 'state', name: 'land' })
      return
    }
    at = node
    hop = null
    const side = node === BANK_R ? 1 : 0
    if (attemptSide !== null && side !== attemptSide) cross()
    attemptSide = null
  }

  const pointer = (input: PointerInput) => {
    idle = 0
    if (input.phase !== 'down') return
    const { x, y } = input
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    const target = hitNode(x, y)
    if (target === null) return
    const from = cursor()
    if (target === from) return
    if (!canReach(from, target)) {
      // Too far: the frog wobbles. A look, not a change of the world.
      const p = nodePos(target)
      nope = { x: p.x, y: p.y, t: NOPE_T }
      return
    }
    if (queue.length >= MAX_QUEUE) return
    queue.push(target)
    emit({ kind: 'state', name: 'queue' })
  }

  // (contract: step) One fixed tick.
  const step = () => {
    tick++
    idle++
    // Stones slide to their column when the river widens.
    const targets = GEOM[cols]!.pos
    targets.forEach((t, id) => {
      const s = stones[id]!
      s.x = Math.abs(t.x - s.x) < 0.5 ? t.x : s.x + (t.x - s.x) * 0.18
    })
    if (splash && --splash.t <= 0) splash = null
    if (nope && --nope.t <= 0) nope = null

    if (hop) {
      hop.t++
      if (hop.t >= HOP_T) land(hop.to)
    } else if (isStone(at) && height(at) < SINK_H) {
      dunk()
    }
    if (!hop && queue.length > 0) {
      const from = at
      const to = queue.shift()!
      if (!isStone(from)) attemptSide = from === BANK_R ? 1 : 0
      hop = { from, to, t: 0 }
      emit({ kind: 'state', name: 'leap' })
    }
  }

  // (contract: affordances) Every live stone and both banks, as top-left
  // rectangles inside the field. Reading this changes nothing.
  const affordances = (): Affordance[] => {
    const from = cursor()
    const list: Affordance[] = []
    const r = STONE_R + HIT_SLOP
    // The lily pulls the eye: stones toward it draw more than stones back, and a
    // stone that is up right now draws more than one that is sunk.
    const dir = lilySide() === 1 ? 1 : -1
    for (let id = 0; id < cols * 2; id++) {
      const p = stones[id]!
      const near = canReach(from, id)
      const up = height(id) >= LAND_H
      const dx = dir * (p.x - nodePos(from).x)
      const salience = !near ? 0.08 : dx > 10 ? (up ? 0.9 : 0.5) : dx > -10 ? (up ? 0.35 : 0.2) : up ? 0.25 : 0.15
      list.push({ x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r, kind: 'tap', salience })
    }
    ;[BANK_L, BANK_R].forEach((node, side) => {
      list.push({ ...BANKS[side]!, kind: 'tap', salience: canReach(from, node) ? (side === lilySide() ? 1 : 0.2) : 0.08 })
    })
    return list
  }

  // The bank the frog is heading for: across from the one its run began at, or
  // across from the one it stands on.
  const lilySide = (): 0 | 1 => (attemptSide !== null ? ((1 - attemptSide) as 0 | 1) : at === BANK_R ? 0 : 1)

  // Bank, or how far into the river the frog is from the bank its run began at.
  const where = (): 'bank' | 'near' | 'mid' | 'far' => {
    if (hop === null && !isStone(at)) return 'bank'
    const origin = attemptSide === 1 ? SPOTS[1].x : SPOTS[0].x
    const depth = Math.abs(frogPos().x - origin) / (SPOTS[1].x - SPOTS[0].x)
    return depth < 0.34 ? 'near' : depth < 0.67 ? 'mid' : 'far'
  }

  const frogPos = (): { x: number; y: number; lift: number } => {
    if (!hop) {
      const p = nodePos(at)
      return { x: p.x, y: p.y, lift: 0 }
    }
    const a = nodePos(hop.from)
    const b = nodePos(hop.to)
    const f = hop.t / HOP_T
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, lift: Math.sin(Math.PI * f) * 46 }
  }

  const progress = () => {
    const f = frogPos()
    return Math.min(1, Math.max(0, (f.x - SPOTS[0].x) / (SPOTS[1].x - SPOTS[0].x)))
  }

  // (contract: observe) A discrete outcome class: the day's pattern, how far into
  // the river the frog is (bank, near, mid, far), and how the last run ended.
  // Never a coordinate, a count, or a time. 4 x 4 x 4 = 64.
  const observe = (): Observation => {
    const events = pending
    pending = []
    return {
      signature: `${day.pattern}/${where()}/${last}`,
      features: { landings, crossings, clean: cleans, progress: progress() },
      events,
    }
  }

  // (contract: hints) Only data for the view: after a quiet spell, ring the
  // stone in reach that will be highest when a leap would land. It never changes
  // what the sim does.
  const hint = (): Point | null => {
    if (!config.hints || idle < HINT_AFTER_TICKS) return null
    const from = cursor()
    let best: number | null = null
    let bestH = -1
    for (let id = 0; id < cols * 2; id++) {
      if (!canReach(from, id)) continue
      const h = stoneHeight(day, id, clock() + HOP_T)
      if (h > bestH) {
        best = id
        bestH = h
      }
    }
    if (best === null) return null
    const p = stones[best]!
    return { x: p.x, y: p.y }
  }

  const snapshot = (): StonesSnapshot => {
    const f = frogPos()
    const chain = queue.map((n) => nodePos(n))
    const from = hop ? nodePos(hop.to) : null
    return {
      tick,
      clock: clock(),
      cols,
      stones: stones.map((p, id) => {
        const h = stoneHeight(day, id, clock())
        return { id, x: p.x, y: p.y, h, up: h >= LAND_H, live: id < cols * 2, queued: queue.indexOf(id) + 1 }
      }),
      frog: { x: f.x, y: f.y, lift: f.lift, node: hop ? hop.to : at, hopping: hop !== null },
      queue: [...queue],
      path: [{ x: f.x, y: f.y }, ...(from ? [from] : []), ...chain],
      lilySide: lilySide(),
      banks: [{ ...BANKS[0] }, { ...BANKS[1] }],
      splash: splash ? { ...splash } : null,
      nope: nope ? { ...nope } : null,
      crossings,
      clean: cleans,
      dunks,
      last,
      blooms: hooks.has('bloom') ? blooms : null,
      hint: hint(),
    }
  }

  return { step, pointer, affordances, observe, snapshot }
}
