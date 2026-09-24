// Two-Stone Pond. The pond is a grid wave equation. A tap drops a stone: a
// short ring that spreads, crosses other rings, and adds to them. A hold keeps
// the stone ringing while the finger is down, and it goes on ringing for a few
// seconds after the finger lifts. Two steady stones make a fixed pattern: where
// a crest meets a trough the water is dead still, in lines whose number depends
// on how far apart the stones are, measured in ripple widths. Corks float on
// the pond, slide toward still water, and count as parked once they rest in a
// still spot while the water around them is alive.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now, or
// performance.now. It reads a seeded rng and counts ticks, nothing else. There
// are no hooks: config.hooks is accepted and changes nothing.

import { between, createRng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

// ---------------------------------------------------------------------------
// The water
// ---------------------------------------------------------------------------

export const CELL = 12
export const COLS = 99
export const ROWS = 69
const N = COLS * ROWS

// Ripples travel this far in one tick, in logical pixels. With 12 pixel cells
// that is a Courant number of 0.66, inside the 0.707 limit of the 2D scheme.
const WAVE_PX_PER_TICK = 7.92
const CF2 = (WAVE_PX_PER_TICK / CELL) ** 2
// Ripples lose a little each tick, and much more inside the edge sponge, so
// the pond has no walls to bounce off and the still lines stay legible.
const BASE_DAMP = 0.006
const SPONGE_CELLS = 7
const SPONGE_DAMP = 0.35
// How long the running average of water energy remembers, in ticks.
const ENV_ALPHA = 1 / 24
// How hard a steady stone drives the water, tuned so one stone swings the
// water about 0.3 a hundred pixels away (a full ripple is 1).
const SRC_GAIN = 1.6
// The pond size seeds pick from: ripple widths in logical pixels.
const WAVELENGTHS = [84, 108, 132] as const
// Height is shown to the view in steps of 1/64.
export const HEIGHT_SCALE = 64

// ---------------------------------------------------------------------------
// The stones and corks
// ---------------------------------------------------------------------------

// Held longer than this many ticks (0.3 s) and a touch becomes a steady stone.
const HOLD_TICKS = 9
const ATTACK_TICKS = 5
// After the finger lifts, a steady stone rings on for this long, fading over
// the last stretch, so one finger can lay two stones one after the other.
const LINGER_TICKS = 240
const LINGER_FADE = 60
// A third stone lets the oldest one that no finger holds fade out: it is a
// two-stone pond unless three fingers are down at once.
const MAX_STEADY = 2
const MAX_SOURCES = 12
// A finger this close to where it landed is jitter, not a slide.
const SLIDE_MIN = 6
// A finger this close to a ringing stone picks it up to slide it.
const STONE_GRAB_R = 44

const CORK_COUNT = 3
const CORK_R = 30
const CORK_HIT_SLOP = 26
const CORK_MARGIN = 34
const CORK_COLOURS = ['#c98a4b', '#b5643c', '#d9a86c'] as const
// Corks slide toward water that is calmer than its surroundings. K in pixels
// per tick squared per unit of calm-ratio gradient; corks stop when they drift.
const DRIFT_K = 3
const DRIFT_FRICTION = 0.86
const DRIFT_MAX = 3.5
const DRIFT_PROBE = 9

// Water counts as "alive" around a cork when the local energy average tops
// this, and a spot is "dead still" when its own energy is a small share of
// that average.
const LIVELY = 0.0025
const STILL_SHARE = 0.25
const PARK_TICKS = 30
const UNPARK_TICKS = 10
const PARK_MAX_SPEED = 1.2
const EPS = 1e-6

// A dip along the line between two stones is a still line when it drops below
// this share of the lower crest beside it; samples are this far apart, in pixels.
const DIP_DEPTH = 0.45
const DIP_STEP = 3
// A pattern is read only after the waves have crossed and settled.
const SETTLE_BASE = 30

// Energy is reported scaled so a lively pond is about 0.3 and a still one 0.
const ENERGY_SCALE = 30
const STILL_ENERGY = 0.004

const HINT_AFTER_TICKS = 150
const MAX_EVENTS = 64

interface Source {
  x: number
  y: number
  born: number
  movedAt: number
  // Tick at which the stone stops (Infinity while a finger is holding it).
  emitUntil: number
  fade: number
  heldBy: number | null
  steady: boolean
}

interface Cork {
  x: number
  y: number
  vx: number
  vy: number
  heldBy: number | null
  calm: number
  parked: boolean
}

type Grab = { kind: 'cork'; index: number } | { kind: 'source'; source: Source }

type PairState = 'none' | 'settling' | 'flat' | 'l2' | 'l4' | 'l6'

// Plain data the view draws from (contract: snapshot).
export interface PondSnapshot {
  tick: number
  cols: number
  rows: number
  cell: number
  wavelength: number
  // Water height per cell in steps of 1/64, row by row.
  h: Int8Array
  // 1 where the water is dead still while the water around it is alive.
  calm: Uint8Array
  sources: Array<{ x: number; y: number; strength: number; steady: boolean; held: boolean }>
  corks: Array<{ x: number; y: number; r: number; bob: number; colour: string; held: boolean; parked: boolean }>
  parked: number
  // Still lines between two settled steady stones; null without a settled pair.
  lines: number | null
  // Where the idle hint points, or null. Only ever set when config.hints is on.
  hint: { x: number; y: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

const cellIndex = (x: number, y: number): number => {
  const i = clamp(Math.round(x / CELL - 0.5), 0, COLS - 1)
  const j = clamp(Math.round(y / CELL - 0.5), 0, ROWS - 1)
  return j * COLS + i
}

// Bilinear read of a per-cell field at a logical point.
const sampleField = (f: Float32Array, x: number, y: number): number => {
  const gx = clamp(x / CELL - 0.5, 0, COLS - 1.001)
  const gy = clamp(y / CELL - 0.5, 0, ROWS - 1.001)
  const i = Math.floor(gx)
  const j = Math.floor(gy)
  const fx = gx - i
  const fy = gy - j
  const k = j * COLS + i
  return (f[k]! * (1 - fx) + f[k + 1]! * fx) * (1 - fy) + (f[k + COLS]! * (1 - fx) + f[k + COLS + 1]! * fx) * fy
}

// Mean of a per-cell field over the 5 by 5 cells around a logical point.
const patchMean = (f: Float32Array, x: number, y: number): number => {
  const c = cellIndex(x, y)
  const ci = c % COLS
  const cj = Math.floor(c / COLS)
  let sum = 0
  for (let dj = -2; dj <= 2; dj++) {
    const row = clamp(cj + dj, 0, ROWS - 1) * COLS
    for (let di = -2; di <= 2; di++) sum += f[row + clamp(ci + di, 0, COLS - 1)]!
  }
  return sum / 25
}

export const createSim: CreateSim<PondSnapshot> = (config): Sim<PondSnapshot> => {
  const rng = createRng(config.seed)
  const wavelength = WAVELENGTHS[Math.min(WAVELENGTHS.length - 1, Math.floor(rng() * WAVELENGTHS.length))]!
  const periodTicks = wavelength / WAVE_PX_PER_TICK
  const omega = (2 * Math.PI) / periodTicks
  const burstTicks = Math.round(2 * periodTicks)
  const burstFade = Math.max(3, Math.round(periodTicks / 2))

  let h: Float32Array = new Float32Array(N)
  let hPrev: Float32Array = new Float32Array(N)
  let hNext: Float32Array = new Float32Array(N)
  const env = new Float32Array(N)
  const damp = new Float32Array(N)
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const edge = Math.min(i, j, COLS - 1 - i, ROWS - 1 - j)
      const s = edge < SPONGE_CELLS ? (SPONGE_CELLS - edge) / SPONGE_CELLS : 0
      damp[j * COLS + i] = Math.min(0.6, BASE_DAMP + SPONGE_DAMP * s * s)
    }
  }
  const scratch = new Float32Array(N)
  const meanBuf = new Float32Array(N)

  const corks: Cork[] = []
  for (let i = 0; i < CORK_COUNT; i++) {
    corks.push({
      x: 230 + i * 360 + between(rng, -70, 70),
      y: between(rng, 200, 620),
      vx: 0,
      vy: 0,
      heldBy: null,
      calm: 0,
      parked: false,
    })
  }

  let sources: Source[] = []
  const grabs = new Map<number, Grab>()
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0
  let everRippled = false
  let energy = 0
  let steadyCount = 0
  let pairState: PairState = 'none'
  let lines = 0
  let spacing = 0
  let lastLines = 0
  // Recent raw readings of the still lines while the pair sits settled. The
  // running energy keeps a faint ripple at twice the wave frequency, which
  // switches the outermost, marginal line on and off every half period, so the
  // published count is the peak over more than a full burst of ticks.
  const recent: number[] = []

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  const strength = (s: Source): number => {
    const attack = Math.min(1, (tick - s.born + 1) / ATTACK_TICKS)
    const left = s.emitUntil - tick
    const tail = left >= s.fade ? 1 : Math.max(0, left / s.fade)
    return attack * tail
  }

  const fadeOut = (s: Source, ticks: number) => {
    s.emitUntil = Math.min(s.emitUntil, tick + ticks)
    s.fade = ticks
  }

  // -------------------------------------------------------------------------
  // Touch
  // -------------------------------------------------------------------------

  const hitCork = (x: number, y: number): number => {
    let best = -1
    let bestDistance = Infinity
    corks.forEach((c, i) => {
      if (c.heldBy !== null) return
      const d = Math.hypot(x - c.x, y - c.y)
      if (d <= CORK_R + CORK_HIT_SLOP && d < bestDistance) {
        best = i
        bestDistance = d
      }
    })
    return best
  }

  // A stone still ringing after its finger lifted, close enough to pick up.
  const hitStone = (x: number, y: number): Source | null => {
    let best: Source | null = null
    let bestDistance = Infinity
    for (const s of sources) {
      if (!s.steady || s.heldBy !== null || strength(s) < 0.3) continue
      const d = Math.hypot(x - s.x, y - s.y)
      if (d <= STONE_GRAB_R && d < bestDistance) {
        best = s
        bestDistance = d
      }
    }
    return best
  }

  const startStone = (id: number, x: number, y: number) => {
    if (sources.length >= MAX_SOURCES) {
      const oldest = sources.find((s) => s.heldBy === null && s.emitUntil - tick > 6)
      if (oldest) fadeOut(oldest, 6)
      else if (sources.length >= MAX_SOURCES * 2) sources = sources.filter((s) => s.heldBy !== null).slice(-MAX_SOURCES)
    }
    const source: Source = { x, y, born: tick, movedAt: tick, emitUntil: Infinity, fade: burstFade, heldBy: id, steady: false }
    sources.push(source)
    grabs.set(id, { kind: 'source', source })
    everRippled = true
    emit({ kind: 'state', name: 'ring' })
  }

  const release = (id: number) => {
    const g = grabs.get(id)
    if (!g) return
    grabs.delete(id)
    if (g.kind === 'cork') {
      const c = corks[g.index]!
      c.heldBy = null
      c.vx = 0
      c.vy = 0
      emit({ kind: 'state', name: 'cork-drop' })
      return
    }
    const s = g.source
    s.heldBy = null
    if (s.steady) {
      s.emitUntil = tick + LINGER_TICKS
      s.fade = LINGER_FADE
    } else {
      // A tap: the stone rings out its short burst.
      s.emitUntil = Math.max(s.born + burstTicks, tick + 1)
      s.fade = burstFade
    }
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase } = input
    const finite = Number.isFinite(input.x) && Number.isFinite(input.y)
    if (phase === 'down') {
      release(id)
      if (!finite) return
      const x = clamp(input.x, 0, FIELD_W)
      const y = clamp(input.y, 0, FIELD_H)
      const c = hitCork(x, y)
      if (c >= 0) {
        const cork = corks[c]!
        cork.heldBy = id
        cork.vx = 0
        cork.vy = 0
        cork.x = clamp(x, CORK_MARGIN, FIELD_W - CORK_MARGIN)
        cork.y = clamp(y, CORK_MARGIN, FIELD_H - CORK_MARGIN)
        cork.calm = 0
        cork.parked = false
        grabs.set(id, { kind: 'cork', index: c })
        emit({ kind: 'state', name: 'cork-grab' })
      } else {
        const stone = hitStone(x, y)
        if (stone) {
          // Pick a ringing stone back up: it keeps ringing under the finger.
          stone.heldBy = id
          stone.emitUntil = Infinity
          grabs.set(id, { kind: 'source', source: stone })
          emit({ kind: 'state', name: 'stone-grab' })
        } else startStone(id, x, y)
      }
      return
    }
    const g = grabs.get(id)
    if (g && finite) {
      const x = clamp(input.x, 0, FIELD_W)
      const y = clamp(input.y, 0, FIELD_H)
      if (g.kind === 'cork') {
        const cork = corks[g.index]!
        cork.x = clamp(x, CORK_MARGIN, FIELD_W - CORK_MARGIN)
        cork.y = clamp(y, CORK_MARGIN, FIELD_H - CORK_MARGIN)
      } else if (Math.hypot(x - g.source.x, y - g.source.y) >= SLIDE_MIN) {
        g.source.x = x
        g.source.y = y
        g.source.movedAt = tick
      }
    }
    if (phase === 'up') release(id)
  }

  // -------------------------------------------------------------------------
  // Reading the pond
  // -------------------------------------------------------------------------

  const isSteadyNow = (s: Source) => s.steady && strength(s) >= 0.5

  // How many dead-still lines cross the line between two stones: dips in the
  // running energy along it that fall well below the crests either side. The
  // outermost lines, right beside a stone, are too narrow for the grid to show,
  // so a wide pair reads a little low; the count still rises with the spacing.
  const dipsBetween = (a: Source, b: Source): number => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const n = Math.max(4, Math.ceil(Math.hypot(dx, dy) / DIP_STEP))
    const e: number[] = []
    let top = 0
    for (let k = 0; k <= n; k++) {
      const v = sampleField(env, a.x + (dx * k) / n, a.y + (dy * k) / n)
      e.push(v)
      if (v > top) top = v
    }
    let count = 0
    for (let k = 1; k < n; k++) {
      if (!(e[k]! <= e[k - 1]! && e[k]! < e[k + 1]!)) continue
      let l = k
      while (l > 0 && e[l - 1]! >= e[l]!) l--
      let r = k
      while (r < n && e[r + 1]! >= e[r]!) r++
      const crest = Math.min(e[l]!, e[r]!)
      if (crest > 0.05 * top && e[k]! < DIP_DEPTH * crest) count++
    }
    return count
  }

  const analyse = () => {
    const steady = sources.filter(isSteadyNow)
    steadyCount = steady.length
    pairState = 'none'
    lines = 0
    spacing = 0
    if (steady.length !== 2) recent.length = 0
    if (steady.length === 2) {
      const [a, b] = steady as [Source, Source]
      const d = Math.hypot(b.x - a.x, b.y - a.y)
      spacing = d / wavelength
      const since = Math.min(tick - Math.max(a.born, a.movedAt), tick - Math.max(b.born, b.movedAt))
      if (since < SETTLE_BASE + d / WAVE_PX_PER_TICK) {
        pairState = 'settling'
        recent.length = 0
      } else {
        recent.push(dipsBetween(a, b))
        if (recent.length > burstTicks + 4) recent.shift()
        lines = Math.max(...recent)
        pairState = lines === 0 ? 'flat' : lines <= 2 ? 'l2' : lines <= 4 ? 'l4' : 'l6'
      }
    }
    if (pairState !== 'flat' && pairState !== 'l2' && pairState !== 'l4' && pairState !== 'l6') lines = 0
    if (lines > 0 && lines !== lastLines) emit({ kind: 'state', name: 'lines' })
    lastLines = lines
  }

  const parkedCount = () => corks.filter((c) => c.parked).length

  // -------------------------------------------------------------------------
  // One tick
  // -------------------------------------------------------------------------

  const stepCorks = () => {
    for (const c of corks) {
      if (c.heldBy !== null) continue
      const around = patchMean(env, c.x, c.y)
      const here = sampleField(env, c.x, c.y)
      const alive = around > LIVELY
      // Slide toward calmer water: down the gradient of "my energy over my
      // neighbourhood's", which is flat in a smooth ring and steep at a still line.
      if (alive) {
        const ratioAt = (x: number, y: number) => sampleField(env, x, y) / (patchMean(env, x, y) + EPS)
        const gx = (ratioAt(c.x + DRIFT_PROBE, c.y) - ratioAt(c.x - DRIFT_PROBE, c.y)) / (2 * DRIFT_PROBE)
        const gy = (ratioAt(c.x, c.y + DRIFT_PROBE) - ratioAt(c.x, c.y - DRIFT_PROBE)) / (2 * DRIFT_PROBE)
        const gate = Math.min(1, around / (2 * LIVELY))
        c.vx -= DRIFT_K * gx * gate
        c.vy -= DRIFT_K * gy * gate
      }
      c.vx *= DRIFT_FRICTION
      c.vy *= DRIFT_FRICTION
      const speed = Math.hypot(c.vx, c.vy)
      if (speed > DRIFT_MAX) {
        c.vx = (c.vx / speed) * DRIFT_MAX
        c.vy = (c.vy / speed) * DRIFT_MAX
      }
      c.x = clamp(c.x + c.vx, CORK_MARGIN, FIELD_W - CORK_MARGIN)
      c.y = clamp(c.y + c.vy, CORK_MARGIN, FIELD_H - CORK_MARGIN)

      const still = alive && here < STILL_SHARE * around && Math.hypot(c.vx, c.vy) < PARK_MAX_SPEED
      c.calm = still ? c.calm + 1 : Math.max(0, c.calm - 2)
      if (!c.parked && c.calm >= PARK_TICKS) {
        c.parked = true
        emit({ kind: 'state', name: 'parked' })
      } else if (c.parked && c.calm < UNPARK_TICKS) {
        c.parked = false
      }
    }
  }

  const step = () => {
    tick++
    idleTicks++

    // A held touch becomes a steady stone once it has stayed long enough.
    for (const s of sources) {
      if (s.heldBy !== null && !s.steady && tick - s.born >= HOLD_TICKS) {
        s.steady = true
        emit({ kind: 'state', name: 'hold' })
        const steadyAll = sources.filter((o) => o.steady && o.emitUntil - tick > 12)
        if (steadyAll.length > MAX_STEADY) {
          const oldest = steadyAll.find((o) => o.heldBy === null)
          if (oldest) fadeOut(oldest, 12)
        }
      }
    }

    // The wave equation, one leapfrog step.
    for (let j = 1; j < ROWS - 1; j++) {
      const row = j * COLS
      for (let i = 1; i < COLS - 1; i++) {
        const k = row + i
        const lap = h[k - 1]! + h[k + 1]! + h[k - COLS]! + h[k + COLS]! - 4 * h[k]!
        hNext[k] = h[k]! + (1 - damp[k]!) * (h[k]! - hPrev[k]!) + CF2 * lap
      }
    }
    const swap = hPrev
    hPrev = h
    h = hNext
    hNext = swap

    // Stones drive the water from a small patch, all in step with one clock.
    const drive = Math.sin(omega * tick)
    for (const s of sources) {
      const a = strength(s)
      if (a <= 0) continue
      const gx = s.x / CELL - 0.5
      const gy = s.y / CELL - 0.5
      const ci = clamp(Math.round(gx), 1, COLS - 2)
      const cj = clamp(Math.round(gy), 1, ROWS - 2)
      let total = 0
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const d2 = (ci + di - gx) ** 2 + (cj + dj - gy) ** 2
          scratch[(dj + 1) * 3 + di + 1] = Math.exp(-d2 / 1.4)
          total += scratch[(dj + 1) * 3 + di + 1]!
        }
      }
      const push = (SRC_GAIN * a * drive) / total
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const k = (cj + dj) * COLS + ci + di
          h[k] = h[k]! + push * scratch[(dj + 1) * 3 + di + 1]!
        }
      }
    }

    // Running energy, and the pond's total for the features.
    let sum = 0
    for (let k = 0; k < N; k++) {
      const v = clamp(h[k]!, -2, 2)
      h[k] = v
      env[k] = env[k]! + (v * v - env[k]!) * ENV_ALPHA
      sum += env[k]!
    }
    energy = Math.min(4, (sum / N) * ENERGY_SCALE)

    sources = sources.filter((s) => tick < s.emitUntil)
    stepCorks()
    analyse()
  }

  // -------------------------------------------------------------------------
  // What a child could be drawn to
  // -------------------------------------------------------------------------

  // Corks to carry, stones still ringing to slide, and six patches of water to
  // touch or hold. Nothing here
  // says where a good pair of stones would go.
  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    for (const c of corks) {
      if (c.heldBy !== null) continue
      list.push({
        x: c.x - CORK_R,
        y: c.y - CORK_R,
        w: CORK_R * 2,
        h: CORK_R * 2,
        kind: 'drag',
        salience: c.parked ? 0.25 : 0.55,
      })
    }
    for (const s of sources) {
      if (!s.steady || s.heldBy !== null || strength(s) < 0.3) continue
      const side = STONE_GRAB_R * 2
      list.push({
        x: clamp(s.x - STONE_GRAB_R, 0, FIELD_W - side),
        y: clamp(s.y - STONE_GRAB_R, 0, FIELD_H - side),
        w: side,
        h: side,
        kind: 'drag',
        salience: 0.45,
      })
    }
    const x0 = 90
    const y0 = 90
    const w = (FIELD_W - 2 * x0) / 3
    const hh = (FIELD_H - 2 * y0) / 2
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        list.push({
          x: x0 + col * w,
          y: y0 + row * hh,
          w,
          h: hh,
          kind: (row + col) % 2 === 0 ? 'tap' : 'hold',
          salience: everRippled ? 0.3 : 0.5,
        })
      }
    }
    return list
  }

  // -------------------------------------------------------------------------
  // What the panel reads
  // -------------------------------------------------------------------------

  const observe = (): Observation => {
    const events = pending
    pending = []
    const parked = parkedCount()
    let head: string
    if (steadyCount >= 3) head = 'crowd'
    else if (steadyCount === 2) head = `pair-${pairState}`
    else if (steadyCount === 1) head = 'one'
    else if (sources.length > 0 || energy > STILL_ENERGY) head = 'rings'
    else head = 'still'
    return {
      signature: `${head}/p${parked}`,
      features: { parked, lines, sources: steadyCount, energy, spacing },
      events,
    }
  }

  const hint = (): { x: number; y: number } | null => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS) return null
    if (!everRippled) return { x: FIELD_W / 2, y: FIELD_H / 2 }
    const loose = corks.find((c) => c.heldBy === null && !c.parked)
    return loose ? { x: loose.x, y: loose.y } : null
  }

  const snapshot = (): PondSnapshot => {
    const heights = new Int8Array(N)
    for (let k = 0; k < N; k++) heights[k] = clamp(Math.round(h[k]! * HEIGHT_SCALE), -127, 127)

    // The 5 by 5 average of the energy, by two passes of a 5 cell average.
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        let sum = 0
        for (let d = -2; d <= 2; d++) sum += env[j * COLS + clamp(i + d, 0, COLS - 1)]!
        meanBuf[j * COLS + i] = sum / 5
      }
    }
    const calm = new Uint8Array(N)
    for (let j = 2; j < ROWS - 2; j++) {
      for (let i = 2; i < COLS - 2; i++) {
        let sum = 0
        for (let d = -2; d <= 2; d++) sum += meanBuf[clamp(j + d, 0, ROWS - 1) * COLS + i]!
        const around = sum / 5
        calm[j * COLS + i] = around > LIVELY && env[j * COLS + i]! < STILL_SHARE * around ? 1 : 0
      }
    }

    const settled = pairState === 'flat' || pairState === 'l2' || pairState === 'l4' || pairState === 'l6'
    return {
      tick,
      cols: COLS,
      rows: ROWS,
      cell: CELL,
      wavelength,
      h: heights,
      calm,
      sources: sources.map((s) => ({ x: s.x, y: s.y, strength: strength(s), steady: isSteadyNow(s), held: s.heldBy !== null })),
      corks: corks.map((c) => ({
        x: c.x,
        y: c.y,
        r: CORK_R,
        bob: sampleField(h, c.x, c.y),
        colour: CORK_COLOURS[corks.indexOf(c) % CORK_COLOURS.length]!,
        held: c.heldBy !== null,
        parked: c.parked,
      })),
      parked: parkedCount(),
      lines: settled ? lines : null,
      hint: hint(),
    }
  }

  return { step, pointer, affordances, observe, snapshot }
}
