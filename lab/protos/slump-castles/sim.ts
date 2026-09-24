// Slump Castles: a sandpit. The sand is a coarse heightfield. Each column keeps
// its height h and the depth d of the dry skin on top of it; the rest is a damp
// core. Damp cores hold steep walls, dry skin slumps to a gentle slope, and the
// skin thickens as the sand dries (slowly under a thick skin), so a tower a
// child builds damp settles into a ridge or a ring by itself.
//
// Pure and deterministic: seeded rng at construction only, fixed 33 ms ticks,
// state changes only inside step() and pointer(). No hooks: the material is
// the loop.

import { between, createRng, pick } from '../../kit/rng.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const COLS = 35
export const ROWS = 20
export const CELL = 32
const N = COLS * ROWS
// The sandbox, and two tool buttons under it. Rect x and y are top-left.
export const BOX: Rect = { x: 30, y: 30, w: COLS * CELL, h: ROWS * CELL }
export const SHOVEL_BTN: Rect = { x: 60, y: 694, w: 190, h: 104 }
export const BUCKET_BTN: Rect = { x: 280, y: 694, w: 190, h: 104 }
// The flat sand this thick is the level every landform is read against.
export const BASE = 4

// Sand rules, in height bands (one band per unit) and cells.
const DRY_THR = 1 // steepest face dry sand holds, per cell
const DAMP_THR = 4.5 // steepest face damp sand holds
const SOUP_THR = 0.6 // soaked sand holds almost nothing
const RATE = 0.06 // share of the excess that slides each tick
const EPS = 0.02
const E0 = 0.02 // how fast the dry skin thickens
const SHIELD = 0.5 // a thick dry skin slows the drying underneath
const CAP = 60 // most sand a shovel carries
const PICK = 4 // sand a moving shovel gathers per tick
const DIG = 12 // sand a first touch scoops
const DUMP_RATE = 6 // sand a held-still shovel lets fall per tick
const STILL_PX = 6
const STILL_TICKS = 3
const WET_RATE = 0.5
const SOG_GAIN = 0.04
const SOG_DRAIN = 0.002
const SOUP_AT = 0.5
// A soaked patch this many cells wide turns the state to soup.
const SOAKED_CELLS = 3
const MOVING = 0.3
const QUIET_FLOW = 0.001
const HINT_AFTER_TICKS = 150
const MAX_EVENTS = 64
// Landform thresholds, above BASE.
const RAISE = 1.5
const HIGH = 3
const LOWCUT = 1.5
const STAND_MARGIN = 0.6

export type Tool = 'shovel' | 'bucket'
export type Form = 'flat' | 'pit' | 'mound' | 'ridge' | 'saddle' | 'scatter' | 'ring'
export type SandState = 'settled' | 'standing' | 'slumping' | 'soupy'
export type Weather = 'cloudy' | 'mild' | 'sunny'

const WEATHERS: readonly Weather[] = ['cloudy', 'mild', 'sunny']
const DRYING: Record<Weather, number> = { cloudy: 0.6, mild: 1, sunny: 1.5 }

const NB: ReadonlyArray<readonly [number, number, number]> = [
  [-1, 0, 1],
  [1, 0, 1],
  [0, -1, 1],
  [0, 1, 1],
  [-1, -1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [1, 1, Math.SQRT2],
]

export interface Analysis {
  form: Form
  // Tallest sand above the flat, at least 0.
  peak: number
  peakCell: number
  // Cells fenced in by a closed rim.
  enclosed: number
  // Cells holding a face steeper than dry sand could.
  standing: number
  soupy: boolean
  // Share of the sand that is damp.
  damp: number
}

export interface SandSnapshot {
  tick: number
  h: number[]
  d: number[]
  sog: number[]
  tool: Tool
  fingers: Array<{ x: number; y: number; tool: Tool; load: number }>
  form: Form
  state: SandState
  peak: number
  weather: Weather
  hint: { x: number; y: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inside = (r: Rect, x: number, y: number, slop = 0) => x >= r.x - slop && x <= r.x + r.w + slop && y >= r.y - slop && y <= r.y + r.h + slop

interface Comp {
  cells: number[]
  w: number
  h: number
}

// Eight-way connected runs of a mask, keeping those of at least minSize cells.
function components(mask: Uint8Array, minSize: number): Comp[] {
  const seen = new Uint8Array(N)
  const comps: Comp[] = []
  for (let s = 0; s < N; s++) {
    if (!mask[s] || seen[s]) continue
    const stack = [s]
    const cells: number[] = []
    seen[s] = 1
    let c0 = COLS
    let c1 = -1
    let r0 = ROWS
    let r1 = -1
    while (stack.length > 0) {
      const i = stack.pop()!
      const c = i % COLS
      const r = (i - c) / COLS
      cells.push(i)
      c0 = Math.min(c0, c)
      c1 = Math.max(c1, c)
      r0 = Math.min(r0, r)
      r1 = Math.max(r1, r)
      for (const [dc, dr] of NB) {
        const nc = c + dc
        const nr = r + dr
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue
        const j = nr * COLS + nc
        if (mask[j] && !seen[j]) {
          seen[j] = 1
          stack.push(j)
        }
      }
    }
    if (cells.length >= minSize) comps.push({ cells, w: c1 - c0 + 1, h: r1 - r0 + 1 })
  }
  return comps
}

// The parts of the reading that drift while the heights hold still: how much of
// the sand is damp, and whether a patch of it is soaked (three or more cells).
function moisture(h: ArrayLike<number>, d: ArrayLike<number>, sog: ArrayLike<number>): { damp: number; soupy: boolean } {
  let vol = 0
  let damp = 0
  let soaked = 0
  for (let i = 0; i < N; i++) {
    const v = h[i]!
    vol += v
    damp += Math.max(0, v - d[i]!)
    if (sog[i]! > SOUP_AT && v > 1) soaked++
  }
  return { damp: vol > 0 ? damp / vol : 0, soupy: soaked >= SOAKED_CELLS }
}

// Reads the landform and the sand's condition from the raw grids. Pure.
export function analyse(h: ArrayLike<number>, d: ArrayLike<number>, sog: ArrayLike<number>): Analysis {
  let top = -Infinity
  let topCell = 0
  let lowCount = 0
  const raised = new Uint8Array(N)
  const high = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    const v = h[i]!
    if (v > top) {
      top = v
      topCell = i
    }
    if (v >= BASE + RAISE) raised[i] = 1
    if (v >= BASE + HIGH) high[i] = 1
    if (v <= BASE - LOWCUT) lowCount++
  }

  let standing = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = h[r * COLS + c]!
      if (v < 1) continue
      for (const [dc, dr, dist] of NB) {
        const nc = c + dc
        const nr = r + dr
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue
        if (v - h[nr * COLS + nc]! > DRY_THR * dist + STAND_MARGIN) {
          standing++
          break
        }
      }
    }
  }

  // Flood the not-raised sand in from the border; what it cannot reach is
  // fenced in by a rim.
  const outside = new Uint8Array(N)
  const stack: number[] = []
  const seed = (i: number) => {
    if (!raised[i] && !outside[i]) {
      outside[i] = 1
      stack.push(i)
    }
  }
  for (let c = 0; c < COLS; c++) {
    seed(c)
    seed((ROWS - 1) * COLS + c)
  }
  for (let r = 0; r < ROWS; r++) {
    seed(r * COLS)
    seed(r * COLS + COLS - 1)
  }
  while (stack.length > 0) {
    const i = stack.pop()!
    const c = i % COLS
    const r = (i - c) / COLS
    if (c > 0) seed(i - 1)
    if (c < COLS - 1) seed(i + 1)
    if (r > 0) seed(i - COLS)
    if (r < ROWS - 1) seed(i + COLS)
  }
  let enclosed = 0
  for (let i = 0; i < N; i++) if (!raised[i] && !outside[i]) enclosed++

  const big = components(raised, 3)
  let form: Form
  if (enclosed >= 2) form = 'ring'
  else if (big.length >= 2) form = 'scatter'
  else if (big.length === 1) {
    const inBig = new Uint8Array(N)
    for (const i of big[0]!.cells) inBig[i] = 1
    const peaks = components(high, 1).filter((cp) => inBig[cp.cells[0]!])
    const long = Math.max(big[0]!.w, big[0]!.h)
    const short = Math.min(big[0]!.w, big[0]!.h)
    if (peaks.length >= 2) form = 'saddle'
    else if (long >= 6 && long >= 2.2 * short) form = 'ridge'
    else form = 'mound'
  } else form = lowCount >= 3 ? 'pit' : 'flat'

  return { form, peak: Math.max(0, top - BASE), peakCell: topCell, enclosed, standing, ...moisture(h, d, sog) }
}

interface Finger {
  tool: Tool
  x: number
  y: number
  px: number
  py: number
  still: number
  dry: number
  damp: number
  dumped: boolean
}

export const createSim: CreateSim<SandSnapshot> = (config): Sim<SandSnapshot> => {
  const rng = createRng(config.seed)
  // Today's weather sets how fast sand dries. It is the one thing that differs
  // between two sessions the child cannot see coming; the sand shows it.
  const weather = pick(rng, WEATHERS)
  const dryRate = DRYING[weather]

  const h = new Float64Array(N)
  const d = new Float64Array(N)
  const sog = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    h[i] = BASE + between(rng, -0.25, 0.25)
    d[i] = h[i]!
  }
  const dh = new Float64Array(N)
  const dd = new Float64Array(N)
  const fl = new Float64Array(8)

  const fingers = new Map<number, Finger>()
  let tool: Tool = 'shovel'
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0
  let active = false
  let flow = 0
  let slumpMoved = 0
  let quiet = 0
  let analysis = analyse(h, d, sog)
  let lastForm: Form = analysis.form
  // Set whenever a shovel changes the heights by hand.
  let structureStale = false

  const emit = (name: string) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push({ kind: 'state', name })
  }

  // Cells near a point, with a weight that fades to nothing at the radius.
  const gi = new Int32Array(64)
  const gw = new Float64Array(64)
  let gn = 0
  let gsum = 0
  const gather = (x: number, y: number, radius: number) => {
    gn = 0
    gsum = 0
    const c0 = Math.max(0, Math.floor((x - radius - BOX.x) / CELL))
    const c1 = Math.min(COLS - 1, Math.floor((x + radius - BOX.x) / CELL))
    const r0 = Math.max(0, Math.floor((y - radius - BOX.y) / CELL))
    const r1 = Math.min(ROWS - 1, Math.floor((y + radius - BOX.y) / CELL))
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const w = 1 - Math.hypot(BOX.x + (c + 0.5) * CELL - x, BOX.y + (r + 0.5) * CELL - y) / radius
        if (w > 0 && gn < 64) {
          gi[gn] = r * COLS + c
          gw[gn] = w
          gn++
          gsum += w
        }
      }
    }
  }

  const scoopAt = (f: Finger, x: number, y: number, budget: number) => {
    const want = Math.min(budget, CAP - f.dry - f.damp)
    if (want <= 0) return
    gather(x, y, 1.4 * CELL)
    if (gsum <= 0) return
    for (let k = 0; k < gn; k++) {
      const i = gi[k]!
      const take = Math.min(h[i]!, (want * gw[k]!) / gsum)
      const dryPart = Math.min(take, d[i]!)
      d[i] = d[i]! - dryPart
      h[i] = h[i]! - take
      f.dry += dryPart
      f.damp += take - dryPart
    }
    f.dumped = false
    active = true
    structureStale = true
  }

  const dumpAt = (f: Finger, x: number, y: number, amount: number) => {
    const total = f.dry + f.damp
    const a = Math.min(amount, total)
    if (a <= 0) return
    gather(x, y, 1.2 * CELL)
    if (gsum <= 0) return
    const dryShare = f.dry / total
    for (let k = 0; k < gn; k++) {
      const i = gi[k]!
      const add = (a * gw[k]!) / gsum
      h[i] = h[i]! + add
      d[i] = d[i]! + add * dryShare
    }
    f.dry -= a * dryShare
    f.damp -= a * (1 - dryShare)
    if (f.dry + f.damp < 1e-9) {
      f.dry = 0
      f.damp = 0
    }
    if (!f.dumped) {
      f.dumped = true
      emit('dump')
    }
    active = true
    structureStale = true
  }

  const sprinkleAt = (x: number, y: number, amount: number) => {
    gather(x, y, 1.7 * CELL)
    for (let k = 0; k < gn; k++) {
      const i = gi[k]!
      if (h[i]! < 0.05) continue
      const a = amount * gw[k]!
      const wet = Math.min(d[i]!, a)
      d[i] = d[i]! - wet
      if (a > wet) sog[i] = Math.min(1, sog[i]! + (a - wet) * SOG_GAIN)
    }
    active = true
  }

  // Samples along a finger's path since the last tick, about half a cell apart.
  const along = (f: Finger, moved: number, fn: (x: number, y: number, n: number) => void) => {
    const n = Math.max(1, Math.ceil(moved / 16))
    for (let s = 1; s <= n; s++) fn(f.px + ((f.x - f.px) * s) / n, f.py + ((f.y - f.py) * s) / n, n)
  }

  const release = (id: number) => {
    const f = fingers.get(id)
    if (!f) return
    if (f.tool === 'shovel') dumpAt(f, f.x, f.y, f.dry + f.damp)
    fingers.delete(id)
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      if (phase === 'up') release(id)
      return
    }
    if (phase === 'down') {
      release(id)
      const button = inside(SHOVEL_BTN, x, y, 12) ? 'shovel' : inside(BUCKET_BTN, x, y, 12) ? 'bucket' : null
      if (button) {
        if (button !== tool) emit('tool')
        tool = button
        return
      }
      if (!inside(BOX, x, y)) return
      const f: Finger = { tool, x, y, px: x, py: y, still: 0, dry: 0, damp: 0, dumped: false }
      fingers.set(id, f)
      if (tool === 'shovel') {
        scoopAt(f, x, y, DIG)
        emit('dig')
      } else {
        sprinkleAt(x, y, WET_RATE)
        emit('sprinkle')
      }
      return
    }
    const f = fingers.get(id)
    if (!f) return
    f.x = clamp(x, BOX.x, BOX.x + BOX.w - 1e-6)
    f.y = clamp(y, BOX.y, BOX.y + BOX.h - 1e-6)
    if (phase === 'up') release(id)
  }

  const work = (f: Finger) => {
    const moved = Math.hypot(f.x - f.px, f.y - f.py)
    if (f.tool === 'bucket') {
      if (moved > STILL_PX) along(f, moved, (x, y, n) => sprinkleAt(x, y, WET_RATE / n))
      else sprinkleAt(f.x, f.y, WET_RATE)
    } else if (moved > STILL_PX) {
      f.still = 0
      along(f, moved, (x, y, n) => scoopAt(f, x, y, PICK / n))
    } else {
      f.still++
      if (f.still >= STILL_TICKS) dumpAt(f, f.x, f.y, DUMP_RATE)
    }
    f.px = f.x
    f.py = f.y
  }

  // Slides sand down any face steeper than its own column can hold. Every
  // column decides from the same starting grid, then all moves apply together,
  // so nothing favours a direction. Dry skin leaves first.
  const relax = (): number => {
    dh.fill(0)
    dd.fill(0)
    let total = 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c
        const hi = h[i]!
        if (hi < 0.05) continue
        let thr = DRY_THR + (DAMP_THR - DRY_THR) * clamp(1 - d[i]! / hi, 0, 1)
        const soup = clamp((sog[i]! - 0.3) / 0.4, 0, 1)
        if (soup > 0) thr += (SOUP_THR - thr) * soup
        let sum = 0
        for (let k = 0; k < 8; k++) {
          const nc = c + NB[k]![0]
          const nr = r + NB[k]![1]
          fl[k] = 0
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue
          const diff = hi - h[nr * COLS + nc]! - thr * NB[k]![2]
          if (diff > EPS) {
            fl[k] = diff * RATE
            sum += fl[k]!
          }
        }
        if (sum <= 0) continue
        const scale = sum > hi * 0.4 ? (hi * 0.4) / sum : 1
        const out = sum * scale
        const dryOut = Math.min(out, d[i]!)
        const dryShare = dryOut / out
        dh[i] = dh[i]! - out
        dd[i] = dd[i]! - dryOut
        for (let k = 0; k < 8; k++) {
          if (fl[k]! <= 0) continue
          const j = (r + NB[k]![1]) * COLS + c + NB[k]![0]
          const amt = fl[k]! * scale
          dh[j] = dh[j]! + amt
          dd[j] = dd[j]! + amt * dryShare
        }
        total += out
      }
    }
    for (let i = 0; i < N; i++) {
      if (dh[i] === 0) continue
      h[i] = Math.max(0, h[i]! + dh[i]!)
      d[i] = clamp(d[i]! + dd[i]!, 0, h[i]!)
    }
    return total
  }

  const stateOf = (): SandState =>
    analysis.soupy ? 'soupy' : flow > MOVING ? 'slumping' : analysis.standing > 0 ? 'standing' : 'settled'

  const physics = () => {
    flow = relax()
    let anyDamp = false
    let anySog = false
    for (let i = 0; i < N; i++) {
      if (sog[i]! > 0) {
        sog[i] = Math.max(0, sog[i]! - SOG_DRAIN)
        if (sog[i]! > 0) anySog = true
      }
      if (h[i]! - d[i]! > 1e-9) {
        d[i] = Math.min(h[i]!, d[i]! + (E0 * dryRate) / (1 + SHIELD * d[i]!))
        if (h[i]! - d[i]! > 1e-9) anyDamp = true
      }
    }
    // The landform only needs a fresh reading when the heights moved.
    if (structureStale || flow > 1e-4) {
      structureStale = false
      analysis = analyse(h, d, sog)
    } else analysis = { ...analysis, ...moisture(h, d, sog) }
    if (analysis.form !== lastForm) {
      lastForm = analysis.form
      emit(`form-${analysis.form}`)
    }
    // A slump episode: sand moved on its own, then went still.
    if (flow > 0.05) {
      slumpMoved += flow
      quiet = 0
    } else if (++quiet >= 5 && slumpMoved >= 5) {
      emit('slump')
      slumpMoved = 0
    }
    active = fingers.size > 0 || flow > QUIET_FLOW || anyDamp || anySog || slumpMoved >= 5
  }

  const step = () => {
    tick++
    idleTicks++
    for (const f of fingers.values()) work(f)
    if (active) physics()
  }

  const affordances = (): Affordance[] => {
    const gesture = tool === 'shovel' ? 'drag' : 'hold'
    const list: Affordance[] = [
      { ...SHOVEL_BTN, kind: 'tap', salience: tool === 'shovel' ? 0.2 : 0.45 },
      { ...BUCKET_BTN, kind: 'tap', salience: tool === 'bucket' ? 0.2 : 0.45 },
      { ...BOX, kind: gesture, salience: 0.3 },
    ]
    if (analysis.peak >= RAISE) {
      const c = analysis.peakCell % COLS
      const r = (analysis.peakCell - c) / COLS
      list.push({
        x: clamp(BOX.x + (c - 1) * CELL, BOX.x, BOX.x + BOX.w - 3 * CELL),
        y: clamp(BOX.y + (r - 1) * CELL, BOX.y, BOX.y + BOX.h - 3 * CELL),
        w: 3 * CELL,
        h: 3 * CELL,
        kind: gesture,
        salience: 0.75,
      })
    }
    return list
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    return {
      signature: `${analysis.form}-${stateOf()}`,
      features: { peak: analysis.peak, enclosed: analysis.enclosed, damp: analysis.damp, standing: analysis.standing },
      events,
    }
  }

  // Off by default for return and self-aim runs. Only data for the view.
  const hint = (): { x: number; y: number } | null => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS) return null
    if (analysis.peak < RAISE) return { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 }
    const c = analysis.peakCell % COLS
    return { x: BOX.x + (c + 0.5) * CELL, y: BOX.y + ((analysis.peakCell - c) / COLS + 0.5) * CELL }
  }

  const snapshot = (): SandSnapshot => ({
    tick,
    h: Array.from(h),
    d: Array.from(d),
    sog: Array.from(sog),
    tool,
    fingers: [...fingers.values()].map((f) => ({ x: f.x, y: f.y, tool: f.tool, load: f.dry + f.damp })),
    form: analysis.form,
    state: stateOf(),
    peak: analysis.peak,
    weather,
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
