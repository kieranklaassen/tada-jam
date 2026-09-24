// Pendulum Pen: two hanging rods, each with a weight that slides to one of five
// notches (higher is faster: notch k swings k times the base rate). Pull a rod
// back and let go, and the pen on the table follows: one rod moves it left and
// right, the other up and down, both fading. The notches make the ratio (so the
// petal count) readable from the weights alone; the moment the second rod goes
// makes the knot thin (a folded arc) or wide.
//
// Pure and deterministic: no DOM, no clocks, no Math.random. The only rng draws
// are the starting notches and the aims, both seeded. Each rod is an exact damped
// oscillator, so any tick length gives the same swing.

import { createRng, deriveSeed, int } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W, TICK_MS } from '../../kit/sim.ts'
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
export type Stage = 'set' | 'pulled' | 'swing' | 'done'
export type Openness = 'thin' | 'wide'

// Field furniture, logical coordinates; rect x and y are the top-left corner.
export const ROD_X = [100, 300] as const
export const PIVOT_Y = 70
export const ROD_LEN = 620
// Horizontal reach of a rod's tip at full pull.
export const SWING = 90
// Distance of each notch from the pivot; index is notch - 1, so notch 5 is the highest.
export const NOTCH_D = [510, 410, 310, 210, 110] as const
export const TABLE: Rect = { x: 450, y: 50, w: 680, h: 580 }
export const TABLE_HX = 320
export const TABLE_HY = 270
export const GUESS_BUTTONS: Rect[] = Array.from({ length: 8 }, (_, i) => ({ x: 460 + i * 84, y: 660, w: 76, h: 72 }))
export const NEW_PAPER: Rect = { x: 460, y: 752, w: 200, h: 58 }
export const AIM_CARD: Rect = { x: 462, y: 58, w: 120, h: 120 }

// Base swing rate per notch (rad/s) and how fast a swing fades (per second).
export const W = 1.8
export const DELTA = 0.24
const DT = TICK_MS / 1000

const WEIGHT_HIT = 48
const TIP_HIT = 54
// A rod let go below this pull does not start a figure; a swing below it does not count as swinging.
const LIVE_MIN = 0.1
const DONE_AMP = 0.03
const REST_AMP = 0.004
// Below this |sin| of the phase gap the knot is a folded arc.
const THIN_BELOW = 0.35
const MIN_INK_POINTS = 40
const MAX_TRACE = 14000
const MAX_EVENTS = 64
const HINT_AFTER_TICKS = 200
const HINT_RELEASE_TICKS = 150

interface Rod {
  u: number
  v: number
  notch: number
  held: number | null
}

type Grab = { kind: 'tip'; rod: number; off: number } | { kind: 'weight'; rod: number }

interface Lock {
  a: number
  b: number
  petals: number
  cls: Openness
  open: number
}

interface Target {
  a: number
  b: number
  ghost: number[]
}

export interface PenSnapshot {
  tick: number
  stage: Stage
  rods: Array<{ u: number; notch: number; held: boolean; pivot: Point; tip: Point; weight: Point }>
  // The pen, in table units (-1 to 1 each way).
  pen: Point
  inking: boolean
  // Flat x, y pairs in table units.
  trace: number[]
  guess: number | null
  guessResult: 'right' | 'wrong' | null
  // Null when the guess hook is removed.
  guessButtons: Rect[] | null
  // Null when the target hook is removed.
  target: { a: number; b: number; ghost: number[]; met: boolean } | null
  aimCard: Rect | null
  lock: { petals: number; cls: Openness } | null
  // What the weights make right now.
  petals: number
  gallery: Array<{ pts: number[]; petals: number; cls: string }>
  newPaper: Rect
  hint: { x: number; y: number; toX: number; kind: 'pull' | 'release'; phase: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
const round4 = (n: number) => Math.round(n * 10000) / 10000

export function gcd(a: number, b: number): number {
  let x = a
  let y = b
  while (y) [x, y] = [y, x % y]
  return x
}

// Petals of the knot two notches make: for the reduced ratio a to b, a + b - 1
// (1 to 1 is one oval, 1 to 2 the two lobes of an eight, 2 to 3 the four-leaf clover).
export function petalsOf(ka: number, kb: number): number {
  const g = gcd(ka, kb)
  return ka / g + kb / g - 1
}

// Every reduced ratio the notches can make, x rod first.
const PAIRS: Array<{ a: number; b: number }> = []
for (let a = 1; a <= 5; a++) for (let b = 1; b <= 5; b++) if (gcd(a, b) === 1) PAIRS.push({ a, b })

// A point d along a rod from its pivot, when the rod's tip is pulled to u.
function pointAlong(rod: number, u: number, d: number): Point {
  const dx = (u * SWING * d) / ROD_LEN
  return { x: ROD_X[rod]! + dx, y: PIVOT_Y + Math.sqrt(Math.max(0, d * d - dx * dx)) }
}
export const tipPoint = (rod: number, u: number): Point => pointAlong(rod, u, ROD_LEN)
export const weightPoint = (rod: number, u: number, notch: number): Point => pointAlong(rod, u, NOTCH_D[notch - 1]!)

const rate = (notch: number) => notch * W

// Exact damped swing: u = e^(-DELTA t) cos(rate t) from rest at a pull, for any dt.
function advance(u: number, v: number, k: number, dt: number): [number, number] {
  const e = Math.exp(-DELTA * dt)
  const c = Math.cos(k * dt)
  const s = Math.sin(k * dt)
  const c2 = (v + DELTA * u) / k
  const nu = e * (u * c + c2 * s)
  return [nu, -DELTA * nu + e * k * (c2 * c - u * s)]
}

const amp = (r: Rod) => Math.hypot(r.u, (r.v + DELTA * r.u) / rate(r.notch))
const phase = (r: Rod) => Math.atan2(-(r.v + DELTA * r.u) / rate(r.notch), r.u)

function makeGhost(a: number, b: number): number[] {
  const out: number[] = []
  const n = 200
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * i) / n
    // Phase gap of a quarter: the widest the knot gets.
    out.push(Math.round(Math.cos(a * t) * 1000) / 1000, Math.round(Math.cos(b * t - Math.PI / (2 * a)) * 1000) / 1000)
  }
  return out
}

function decimate(trace: number[], maxPoints: number): number[] {
  const points = trace.length / 2
  const stride = Math.max(1, Math.ceil(points / maxPoints))
  const out: number[] = []
  for (let i = 0; i < points; i += stride) out.push(trace[2 * i]!, trace[2 * i + 1]!)
  return out
}

const clampRect = (x: number, y: number, w: number, h: number): Rect => {
  const x0 = clamp(x, 0, FIELD_W - 1)
  const y0 = clamp(y, 0, FIELD_H - 1)
  return { x: x0, y: y0, w: Math.min(FIELD_W, x + w) - x0, h: Math.min(FIELD_H, y + h) - y0 }
}

export const createSim: CreateSim<PenSnapshot> = (config): Sim<PenSnapshot> => {
  const rng = createRng(config.seed)
  // Aims come from their own stream so removing the target hook cannot shift the start.
  const aimRng = createRng(deriveSeed(config.seed, 1))
  // (contract: hooks) Each hook is honoured only when named here.
  const hooks = new Set(config.hooks)

  const rods: Rod[] = [
    { u: 0, v: 0, notch: int(rng, 1, 5), held: null },
    { u: 0, v: 0, notch: int(rng, 1, 5), held: null },
  ]
  const grabs = new Map<number, Grab>()
  let trace: number[] = []
  let running = false
  let done = false
  let archived = false
  let lock: Lock | null = null
  let resolved = false
  let guess: number | null = null
  let guessResult: 'right' | 'wrong' | null = null
  let targetMet = false
  let gallery: PenSnapshot['gallery'] = []
  const kinds = new Set<string>()
  let figures = 0
  let hits = 0
  let matches = 0
  let tick = 0
  let idle = 0
  let pending: SimEvent[] = []

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }
  const note = (name: string) => emit({ kind: 'state', name })

  const nextTarget = (current: Target | null): Target => {
    let pair = PAIRS[int(aimRng, 0, PAIRS.length - 1)]!
    while (current && pair.a === current.a && pair.b === current.b) pair = PAIRS[int(aimRng, 0, PAIRS.length - 1)]!
    return { a: pair.a, b: pair.b, ghost: makeGhost(pair.a, pair.b) }
  }
  let target: Target | null = hooks.has('target') ? nextTarget(null) : null

  const petalsNow = () => petalsOf(rods[0]!.notch, rods[1]!.notch)

  const stage = (): Stage => {
    if (done) return 'done'
    if (running) return 'swing'
    return rods.some((r) => r.held !== null && Math.abs(r.u) >= LIVE_MIN) ? 'pulled' : 'set'
  }

  const pushPoint = (x: number, y: number) => {
    const n = trace.length
    if (n >= MAX_TRACE) return
    if (n >= 2 && Math.abs(x - trace[n - 2]!) + Math.abs(y - trace[n - 1]!) < 0.002) return
    trace.push(round4(x), round4(y))
  }

  // The finished drawing goes to the wall of past figures (three kept).
  const archive = () => {
    if (archived) return
    archived = true
    if (trace.length / 2 < MIN_INK_POINTS) return
    figures++
    gallery = [{ pts: decimate(trace, 150), petals: lock?.petals ?? 0, cls: lock?.cls ?? 'line' }, ...gallery].slice(0, 3)
  }

  const clearPaper = () => {
    if (running) archive()
    for (const [id, g] of [...grabs]) if (g.kind === 'tip') grabs.delete(id)
    for (const r of rods) {
      r.u = 0
      r.v = 0
      r.held = null
    }
    trace = []
    running = false
    done = false
    archived = false
    lock = null
    resolved = false
    guess = null
    guessResult = null
    // The aim stays until it has been drawn.
    if (hooks.has('target') && (targetMet || !target)) target = nextTarget(target)
    targetMet = false
    note('paper')
  }

  // Both rods swinging, so the figure is set: work out how open it is from the
  // phase gap b * (phase of x) - a * (phase of y); |sin| of it is the width.
  const tryLock = (released: number) => {
    const other = rods[1 - released]!
    if (other.held !== null || amp(other) <= LIVE_MIN) return
    const ka = rods[0]!.notch
    const kb = rods[1]!.notch
    const g = gcd(ka, kb)
    const a = ka / g
    const b = kb / g
    const open = Math.abs(Math.sin(b * phase(rods[0]!) - a * phase(rods[1]!)))
    lock = { a, b, petals: a + b - 1, cls: open < THIN_BELOW ? 'thin' : 'wide', open }
    kinds.add(`${a}:${b}`)
    note('lock')
    if (resolved) return
    resolved = true
    if (hooks.has('guess') && guess !== null) {
      guessResult = guess === lock.petals ? 'right' : 'wrong'
      note(`guess-${guessResult}`)
      if (guessResult === 'right') {
        hits++
        emit({ kind: 'hook', name: 'guess' })
      }
    }
    if (hooks.has('target') && target) {
      targetMet = target.a === a && target.b === b && lock.cls === 'wide'
      note(targetMet ? 'target-met' : 'target-missed')
      if (targetMet) {
        matches++
        emit({ kind: 'hook', name: 'target' })
      }
    }
  }

  const release = (id: number) => {
    const g = grabs.get(id)
    if (!g) return
    grabs.delete(id)
    if (g.kind === 'weight') return
    const r = rods[g.rod]!
    r.held = null
    r.v = 0
    note('release')
    if (Math.abs(r.u) < LIVE_MIN) return
    if (!running) {
      running = true
      pushPoint(rods[0]!.u, rods[1]!.u)
    }
    tryLock(g.rod)
  }

  const nearestNotch = (y: number) => {
    let best = 1
    for (let k = 1; k <= 5; k++) {
      if (Math.abs(NOTCH_D[k - 1]! - (y - PIVOT_Y)) < Math.abs(NOTCH_D[best - 1]! - (y - PIVOT_Y))) best = k
    }
    return best
  }

  // The sim's own hit-test: the strip, the aim card, the paper button, then the
  // nearest weight or free tip within its forgiving radius.
  const press = (id: number, x: number, y: number) => {
    if (hooks.has('guess') && !resolved) {
      for (let i = 0; i < GUESS_BUTTONS.length; i++) {
        if (!inside(GUESS_BUTTONS[i]!, x, y)) continue
        guess = guess === i + 1 ? null : i + 1
        note('guess-set')
        return
      }
    }
    if (hooks.has('target') && target && !lock && inside(AIM_CARD, x, y)) {
      target = nextTarget(target)
      note('aim')
      return
    }
    if (inside(NEW_PAPER, x, y)) {
      clearPaper()
      return
    }
    let best: { kind: 'tip' | 'weight'; rod: number; score: number } | null = null
    rods.forEach((r, rod) => {
      const w = weightPoint(rod, r.u, r.notch)
      const wScore = Math.hypot(x - w.x, y - w.y) / WEIGHT_HIT
      if (wScore <= 1 && (!best || wScore < best.score)) best = { kind: 'weight', rod, score: wScore }
      if (r.held !== null) return
      const t = tipPoint(rod, r.u)
      const tScore = Math.hypot(x - t.x, y - t.y) / TIP_HIT
      if (tScore <= 1 && (!best || tScore < best.score)) best = { kind: 'tip', rod, score: tScore }
    })
    const hit = best as { kind: 'tip' | 'weight'; rod: number } | null
    if (!hit) return
    if (hit.kind === 'weight') {
      grabs.set(id, { kind: 'weight', rod: hit.rod })
      return
    }
    // A finished figure stays until the next rod is touched, then fresh paper.
    if (done) clearPaper()
    const r = rods[hit.rod]!
    r.held = id
    r.v = 0
    grabs.set(id, { kind: 'tip', rod: hit.rod, off: tipPoint(hit.rod, r.u).x - x })
    note('pull')
  }

  const drag = (g: Grab, x: number, y: number) => {
    const r = rods[g.rod]!
    if (g.kind === 'tip') {
      r.u = clamp((x + g.off - ROD_X[g.rod]!) / SWING, -1, 1)
      r.v = 0
      return
    }
    const k = nearestNotch(y)
    if (k === r.notch) return
    r.notch = k
    note('slide')
  }

  const pointer = (input: PointerInput) => {
    idle = 0
    const { id, phase: p, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (p === 'down') {
      release(id)
      if (finite) press(id, x, y)
      return
    }
    const g = grabs.get(id)
    if (g && finite) drag(g, x, y)
    if (p === 'up') release(id)
  }

  // (contract: step) One fixed tick. The pen is sampled three times inside it.
  const step = () => {
    tick++
    idle++
    if (running) {
      for (const f of [1 / 3, 2 / 3, 1]) {
        const at = rods.map((r) => (r.held !== null || (r.u === 0 && r.v === 0) ? r.u : advance(r.u, r.v, rate(r.notch), DT * f)[0]))
        pushPoint(at[0]!, at[1]!)
      }
    }
    for (const r of rods) {
      if (r.held !== null || (r.u === 0 && r.v === 0)) continue
      const [u, v] = advance(r.u, r.v, rate(r.notch), DT)
      r.u = u
      r.v = v
      if (amp(r) < REST_AMP) {
        r.u = 0
        r.v = 0
      }
    }
    if (running && !done && rods.every((r) => r.held === null && amp(r) < DONE_AMP)) {
      done = true
      archive()
      note('done')
    }
  }

  // (contract: affordances) Tips and weights, the strip, the aim card, the paper
  // button, as top-left rectangles inside the field.
  const affordances = (): Affordance[] => {
    const s = stage()
    const list: Affordance[] = []
    rods.forEach((r, rod) => {
      const tip = tipPoint(rod, r.u)
      const w = weightPoint(rod, r.u, r.notch)
      const tipBox = clampRect(tip.x - TIP_HIT, tip.y - TIP_HIT, TIP_HIT * 2, TIP_HIT * 2)
      list.push({ ...tipBox, kind: r.held !== null ? 'hold' : 'drag', salience: s === 'swing' ? 0.6 : 0.9 })
      const wBox = clampRect(w.x - WEIGHT_HIT, w.y - WEIGHT_HIT, WEIGHT_HIT * 2, WEIGHT_HIT * 2)
      list.push({ ...wBox, kind: 'drag', salience: s === 'set' ? 0.5 : 0.3 })
    })
    if (hooks.has('guess') && !resolved) {
      for (const b of GUESS_BUTTONS) list.push({ ...b, kind: 'tap', salience: s === 'set' || s === 'pulled' ? 0.3 : 0.15 })
    }
    if (hooks.has('target') && target && !lock) list.push({ ...AIM_CARD, kind: 'tap', salience: 0.25 })
    list.push({ ...NEW_PAPER, kind: 'tap', salience: s === 'done' ? 0.8 : s === 'swing' ? 0.3 : 0.1 })
    return list
  }

  // (contract: observe) A discrete outcome class, a few named features, and the
  // events since the last call. The signature is stage plus figure, never a number.
  const observe = (): Observation => {
    const events = pending
    pending = []
    const s = stage()
    const figure =
      s === 'set' || s === 'pulled' ? `p${petalsNow()}` : lock ? `p${petalsNow()}-${lock.cls}` : 'line'
    return {
      signature: `${s}-${figure}`,
      features: {
        kinds: kinds.size,
        figures,
        petals: petalsNow(),
        open: lock?.open ?? 0,
        hits,
        matches,
        amp: Math.max(amp(rods[0]!), amp(rods[1]!)),
      },
      events,
    }
  }

  // (contract: hints) Data for the view only; it never changes what the sim does.
  const hint = (): PenSnapshot['hint'] => {
    if (!config.hints) return null
    const s = stage()
    let rod = -1
    let kind: 'pull' | 'release' = 'pull'
    if (s === 'set' && idle >= HINT_AFTER_TICKS) rod = 0
    else if (s === 'pulled' && idle >= HINT_RELEASE_TICKS) {
      rod = rods.findIndex((r) => r.held !== null && Math.abs(r.u) >= LIVE_MIN)
      kind = 'release'
    } else if (s === 'swing' && !lock && idle >= HINT_AFTER_TICKS) rod = rods.findIndex((r) => r.held === null && amp(r) < DONE_AMP)
    if (rod < 0) return null
    const tip = tipPoint(rod, rods[rod]!.u)
    return { x: tip.x, y: tip.y, toX: tip.x + (kind === 'pull' ? 70 : 0), kind, phase: (tick % 45) / 45 }
  }

  const snapshot = (): PenSnapshot => ({
    tick,
    stage: stage(),
    rods: rods.map((r, rod) => ({
      u: r.u,
      notch: r.notch,
      held: r.held !== null,
      pivot: { x: ROD_X[rod]!, y: PIVOT_Y },
      tip: tipPoint(rod, r.u),
      weight: weightPoint(rod, r.u, r.notch),
    })),
    pen: { x: rods[0]!.u, y: rods[1]!.u },
    inking: running && !done,
    trace: trace.slice(),
    guess: hooks.has('guess') ? guess : null,
    guessResult,
    guessButtons: hooks.has('guess') ? GUESS_BUTTONS.map((b) => ({ ...b })) : null,
    target: target ? { a: target.a, b: target.b, ghost: target.ghost, met: targetMet } : null,
    aimCard: target ? { ...AIM_CARD } : null,
    lock: lock ? { petals: lock.petals, cls: lock.cls } : null,
    petals: petalsNow(),
    gallery: gallery.slice(),
    newPaper: { ...NEW_PAPER },
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
