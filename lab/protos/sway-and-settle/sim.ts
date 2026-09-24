// Sway and Settle. The child hangs shapes from the slots of a bar, and bars from
// the slots of other bars. Every bar tips toward its heavier side (weight times
// distance from the middle, summed), swings past, and settles. A bar that is
// loaded on both sides and exactly balanced sits level, and then turns slowly on
// its hook. Each session deals a fresh set of pieces, cut from a mobile that
// really balances, so the law (heavy near the middle, light far out, a small
// mobile weighs the sum of what is on it) carries over while the answer does not.
//
// Pure and deterministic: no DOM, no Vite globals, no clocks, no Math.random.
// The generator and nothing else reads the seeded rng; step() and pointer()
// change state and use no randomness at all.

import { createRng, int, pick } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

// ---------------------------------------------------------------------------
// The puzzle: a random mobile that balances, then cut into pieces
// ---------------------------------------------------------------------------

const ROOT_ID = 0
const ROOT_HALF = 4
const SUB_HALF = 2
const ROOT_GAP = 74
const SUB_GAP = 60
const BAR_MASS = 1
const MAX_SHAPE = 5
const MAX_PIECES = 11

export interface PieceSpec {
  id: number
  isBar: boolean
  // Shapes weigh 1 to 5; a bar's own mass is BAR_MASS and is added in the sim.
  mass: number
  form: number
}

export interface Placement {
  piece: number
  parent: number
  slot: number
}

export interface Puzzle {
  // Index equals id. Piece 0 is the root bar, which hangs from the hook.
  pieces: PieceSpec[]
  // One arrangement in which every bar is balanced and every piece is used.
  solution: Placement[]
  // The order the pieces lie in the tray.
  order: number[]
}

interface Built {
  extra: number
  bars: Array<{ parent: number; slot: number }>
  shapes: Array<{ bar: number; slot: number; mass: number }>
}

const slotsOf = (half: number): number[] => {
  const out: number[] = []
  for (let s = -half; s <= half; s++) if (s !== 0) out.push(s)
  return out
}

function sample<T>(rng: Rng, items: readonly T[], k: number): T[] {
  const pool = [...items]
  const out: T[] = []
  for (let i = 0; i < k && pool.length > 0; i++) out.push(pool.splice(Math.min(pool.length - 1, Math.floor(rng() * pool.length)), 1)[0]!)
  return out
}

// A balanced mobile with 0 to 3 small bars hung from the root or from each
// other, built bottom-up so every bar's torque is exactly zero. With no small
// bars the root alone carries four to six shapes: a plain lever puzzle. Too
// small a mobile (fewer than `minPieces` pieces) is thrown back.
function tryBuild(rng: Rng, minPieces: number): Built | null {
  const extra = int(rng, 0, 3)
  const half = [ROOT_HALF, ...Array<number>(extra).fill(SUB_HALF)]
  const taken = half.map(() => new Set<number>())
  const bars: Built['bars'] = [{ parent: -1, slot: 0 }]
  for (let e = 1; e <= extra; e++) {
    const parent = int(rng, 0, e - 1)
    const free = slotsOf(half[parent]!).filter((s) => !taken[parent]!.has(s))
    if (free.length === 0) return null
    const slot = pick(rng, free)
    taken[parent]!.add(slot)
    bars.push({ parent, slot })
  }
  const total: number[] = []
  const shapes: Built['shapes'] = []
  for (let b = extra; b >= 0; b--) {
    const subs = bars.flatMap((bar, e) => (e > 0 && bar.parent === b ? [{ slot: bar.slot, mass: total[e]! }] : []))
    const free = slotsOf(half[b]!).filter((s) => !taken[b]!.has(s))
    if (free.length === 0) return null
    let found: { slots: number[]; masses: number[] } | null = null
    for (let tries = 0; tries < 300 && !found; tries++) {
      const alone = extra === 0
      const k = int(rng, Math.min(subs.length > 0 ? 1 : alone ? 4 : 2, free.length), Math.min(alone ? 6 : 3, free.length))
      const slots = sample(rng, free, k)
      const masses = slots.map(() => int(rng, 1, MAX_SHAPE))
      let torque = 0
      let left = 0
      let right = 0
      for (const sub of subs) {
        torque += sub.slot * sub.mass
        if (sub.slot < 0) left++
        else right++
      }
      slots.forEach((s, i) => {
        torque += s * masses[i]!
        if (s < 0) left++
        else right++
      })
      if (torque === 0 && left > 0 && right > 0) found = { slots, masses }
    }
    if (!found) return null
    found.slots.forEach((slot, i) => shapes.push({ bar: b, slot, mass: found!.masses[i]! }))
    total[b] = BAR_MASS + subs.reduce((sum, s) => sum + s.mass, 0) + found.masses.reduce((sum, m) => sum + m, 0)
  }
  const count = shapes.length + extra
  return count >= minPieces && count <= MAX_PIECES ? { extra, bars, shapes } : null
}

// Never reached in practice; here so a bad run of the rng cannot leave a child
// with no puzzle. Root only: 3 at -1 and 1 at -2 against 1 at +3 and 1 at +2.
const FALLBACK: Built = {
  extra: 0,
  bars: [{ parent: -1, slot: 0 }],
  shapes: [
    { bar: 0, slot: -1, mass: 3 },
    { bar: 0, slot: -2, mass: 1 },
    { bar: 0, slot: 3, mass: 1 },
    { bar: 0, slot: 2, mass: 1 },
  ],
}

// Round 0 deals at least six pieces; each later round asks for one more, up to nine.
export function makePuzzle(seed: number, round = 0): Puzzle {
  const rng = createRng(seed)
  const minPieces = Math.min(9, 6 + round)
  let built: Built | null = null
  for (let attempt = 0; attempt < 200 && !built; attempt++) built = tryBuild(rng, minPieces)
  const { extra, bars, shapes } = built ?? FALLBACK
  const pieces: PieceSpec[] = [{ id: ROOT_ID, isBar: true, mass: 0, form: 0 }]
  const solution: Placement[] = []
  for (let e = 1; e <= extra; e++) {
    pieces.push({ id: e, isBar: true, mass: 0, form: 0 })
    solution.push({ piece: e, parent: bars[e]!.parent, slot: bars[e]!.slot })
  }
  shapes.forEach((shape, i) => {
    const id = extra + 1 + i
    pieces.push({ id, isBar: false, mass: shape.mass, form: int(rng, 0, 2) })
    solution.push({ piece: id, parent: shape.bar, slot: shape.slot })
  })
  const order = pieces.slice(1).map((p) => p.id)
  for (let i = order.length - 1; i > 0; i--) {
    const j = int(rng, 0, i)
    const swap = order[i]!
    order[i] = order[j]!
    order[j] = swap
  }
  return { pieces, solution, order }
}

// ---------------------------------------------------------------------------
// Geometry (logical 1180 x 820 field)
// ---------------------------------------------------------------------------

export const HOOK = { x: 590, y: 34 }
const ROOT_AT = { x: 590, y: 104 }
const ROPE = 64
const SHAPE_ROPE = 34
const STAGGER = 52
export const TRAY_Y = 610
const TRAY_SCALE = 0.6
const SNAP = 84
const HUB_HIT = 36
const SHAPE_SLOP = 16
const NUDGE_REACH = 44
const TAP_MOVE = 20

const MAX_TILT = 0.4
const SPRING = 0.03
const DAMP = 0.085
const TURN_RATE = 0.09
const HINT_AFTER_TICKS = 150
// The whole mobile must turn this long (five seconds) before the next one is dealt.
const NEXT_AFTER_TICKS = 150
const NEXT_HOOK = 'next-mobile'
const MAX_EVENTS = 64

type Status = 'empty' | 'balanced' | 'tipped'
type Mode = 'main' | 'held' | 'tray'

interface Piece {
  id: number
  isBar: boolean
  mass: number
  form: number
  half: number
  gap: number
  home: { x: number; y: number }
  where: 'tray' | 'held' | 'hung'
  parent: number
  slot: number
  heldBy: number
  fromParent: number
  fromSlot: number
  x: number
  y: number
  angle: number
  vel: number
  amp: number
  turn: number
  total: number
  torque: number
  target: number
  status: Status
  turning: boolean
}

interface Placed {
  bars: Array<{ id: number; x: number; y: number; angle: number; scale: number; half: number; gap: number; mode: Mode }>
  shapes: Array<{ id: number; x: number; y: number; r: number; mode: Mode }>
  slots: Array<{ bar: number; slot: number; ax: number; ay: number; occupant: number; mode: Mode }>
  ropes: Array<{ x1: number; y1: number; x2: number; y2: number }>
}

export interface SwaySnapshot {
  tick: number
  bars: Array<{
    id: number
    x: number
    y: number
    angle: number
    scale: number
    half: number
    gap: number
    root: boolean
    held: boolean
    tray: boolean
    status: Status
    turning: boolean
    total: number
    torque: number
  }>
  shapes: Array<{ id: number; x: number; y: number; r: number; mass: number; form: number; held: boolean; tray: boolean }>
  slots: Array<{ bar: number; slot: number; x: number; y: number; free: boolean; held: boolean }>
  ropes: Placed['ropes']
  // The slot a held piece would hang from if let go now.
  target: { x: number; y: number } | null
  state: string
  complete: boolean
  // Which mobile this is (1, 2, ...); null when the next-mobile hook is removed.
  round: number | null
  hint: { from: { x: number; y: number }; to: { x: number; y: number } } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const radiusOf = (mass: number) => 20 + 6 * mass
const stagger = (slot: number) => (Math.abs(slot) % 2 === 0 ? STAGGER : 0)

function depthOf(puzzle: Puzzle, piece: number): number {
  const placement = puzzle.solution.find((p) => p.piece === piece)
  return placement === undefined || placement.parent === ROOT_ID ? 1 : 1 + depthOf(puzzle, placement.parent)
}

export const createSim: CreateSim<SwaySnapshot> = (config): Sim<SwaySnapshot> => {
  // Each hook is honoured only when named here, so an empty list means none.
  const hooks = new Set(config.hooks)
  let round = 0
  let buildOrder: Placement[] = []
  const pieces: Piece[] = []
  let root!: Piece

  // Lay a dealt puzzle out as fresh pieces in the tray, root bar on its hook.
  const deal = (puzzle: Puzzle) => {
    buildOrder = [...puzzle.solution].sort((a, b) => depthOf(puzzle, a.piece) - depthOf(puzzle, b.piece) || a.piece - b.piece)
    pieces.length = 0
    for (const spec of puzzle.pieces) {
      const slotIndex = puzzle.order.indexOf(spec.id)
      pieces.push({
        id: spec.id,
        isBar: spec.isBar,
        mass: spec.mass,
        form: spec.form,
        half: spec.id === ROOT_ID ? ROOT_HALF : SUB_HALF,
        gap: spec.id === ROOT_ID ? ROOT_GAP : SUB_GAP,
        home: slotIndex < 0 ? { x: ROOT_AT.x, y: ROOT_AT.y } : { x: 110 + (slotIndex % 6) * 192, y: 665 + Math.floor(slotIndex / 6) * 100 },
        where: spec.id === ROOT_ID ? 'hung' : 'tray',
        parent: -1,
        slot: 0,
        heldBy: -1,
        fromParent: -1,
        fromSlot: 0,
        x: 0,
        y: 0,
        angle: 0,
        vel: 0,
        amp: 0,
        turn: 0,
        total: 0,
        torque: 0,
        target: 0,
        status: 'empty',
        turning: false,
      })
    }
    root = pieces[ROOT_ID]!
  }
  deal(makePuzzle(config.seed))
  const grabbed = new Map<number, number>()
  const starts = new Map<number, { x: number; y: number }>()
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0
  let wasComplete = false
  let wholeTurnTicks = 0
  let cls = { signature: '1b/bare/some', state: 'bare', balanced: 0, hung: 0, tilt: 0, complete: false }

  const push = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }
  const emit = (name: string) => push({ kind: 'state', name })
  const emitHook = (name: string) => push({ kind: 'hook', name })

  const childrenOf = (barId: number) => pieces.filter((p) => p.where === 'hung' && p.parent === barId)
  const massOf = (p: Piece): number => (p.isBar ? BAR_MASS + childrenOf(p.id).reduce((sum, c) => sum + massOf(c), 0) : p.mass)
  const inMain = (p: Piece): boolean => p.id === ROOT_ID || (p.where === 'hung' && inMain(pieces[p.parent]!))

  // Recompute weights, torques, tilt targets, and the outcome class. Called
  // after every change of who hangs where.
  const refresh = () => {
    for (const p of pieces) {
      if (!p.isBar) continue
      const kids = childrenOf(p.id)
      p.total = massOf(p)
      p.torque = kids.reduce((sum, c) => sum + c.slot * massOf(c), 0)
      p.status = kids.length === 0 ? 'empty' : p.torque === 0 ? 'balanced' : 'tipped'
      p.target = p.torque === 0 ? 0 : Math.sign(p.torque) * Math.min(MAX_TILT, 0.09 + (0.33 * Math.abs(p.torque)) / p.total)
    }
    const main = pieces.filter((p) => p.isBar && inMain(p))
    const hung = pieces.filter((p) => p.id !== ROOT_ID && inMain(p)).length
    const loaded = main.filter((b) => b.status !== 'empty')
    const tipped = loaded.filter((b) => b.status === 'tipped')
    const balanced = loaded.length - tipped.length
    const allUsed = hung === pieces.length - 1
    const counter = main.some((b) => {
      if (b.id === ROOT_ID || b.status === 'empty') return false
      return childrenOf(b.parent).some((c) => !c.isBar && c.mass >= 4 && Math.sign(c.slot) !== Math.sign(b.slot))
    })
    let state: string
    if (hung === 0) state = 'bare'
    else if (tipped.length > 0) {
      state = root.status === 'tipped' && Math.abs(root.target) >= MAX_TILT - 1e-9 ? 'lopsided' : balanced > 0 ? 'partly' : 'tipped'
    } else state = counter ? 'counter' : 'level'
    const complete = allUsed && tipped.length === 0
    cls = {
      signature: `${main.length}b/${state}/${allUsed ? 'all' : 'some'}`,
      state,
      balanced,
      hung,
      tilt: Math.max(0, ...main.map((b) => Math.abs(b.target))),
      complete,
    }
    if (complete && !wasComplete) emit('complete')
    wasComplete = complete
  }

  // Where everything is drawn and touched, computed from the tree each time.
  const place = (bar: Piece, px: number, py: number, mode: Mode, out: Placed) => {
    const gap = bar.gap * (mode === 'tray' ? TRAY_SCALE : 1)
    const scale = 1 - 0.25 * bar.amp * (0.5 - 0.5 * Math.cos(bar.turn))
    const cos = Math.cos(bar.angle) * scale
    const sin = Math.sin(bar.angle)
    out.bars.push({ id: bar.id, x: px, y: py, angle: bar.angle, scale, half: bar.half, gap, mode })
    if (mode === 'tray') return
    for (const slot of slotsOf(bar.half)) {
      const ax = px + slot * gap * cos
      const ay = py + slot * gap * sin
      const child = pieces.find((p) => p.where === 'hung' && p.parent === bar.id && p.slot === slot)
      out.slots.push({ bar: bar.id, slot, ax, ay, occupant: child ? child.id : -1, mode })
      if (!child) continue
      if (child.isBar) {
        out.ropes.push({ x1: ax, y1: ay, x2: ax, y2: ay + ROPE })
        place(child, ax, ay + ROPE, mode, out)
      } else {
        const r = radiusOf(child.mass)
        const cy = ay + SHAPE_ROPE + r + stagger(slot)
        out.ropes.push({ x1: ax, y1: ay, x2: ax, y2: cy })
        out.shapes.push({ id: child.id, x: ax, y: cy, r, mode })
      }
    }
  }

  const layout = (): Placed => {
    const out: Placed = { bars: [], shapes: [], slots: [], ropes: [] }
    place(root, ROOT_AT.x, ROOT_AT.y, 'main', out)
    for (const p of pieces) {
      if (p.id === ROOT_ID) continue
      if (p.where === 'tray') {
        if (p.isBar) place(p, p.home.x, p.home.y, 'tray', out)
        else out.shapes.push({ id: p.id, x: p.home.x, y: p.home.y, r: radiusOf(p.mass), mode: 'tray' })
      } else if (p.where === 'held') {
        if (p.isBar) place(p, p.x, p.y, 'held', out)
        else out.shapes.push({ id: p.id, x: p.x, y: p.y, r: radiusOf(p.mass), mode: 'held' })
      }
    }
    return out
  }

  // The free slot a held piece is nearest to (measured to the hook point and to
  // where the piece would sit), if it is within reach.
  const nearestFree = (p: Piece, lay: Placed): { bar: number; slot: number; ax: number; ay: number } | null => {
    let best: { bar: number; slot: number; ax: number; ay: number } | null = null
    let bestD = SNAP
    for (const s of lay.slots) {
      if (s.mode !== 'main' || s.occupant !== -1) continue
      const hy = s.ay + (p.isBar ? ROPE : SHAPE_ROPE + radiusOf(p.mass) + stagger(s.slot))
      const d = Math.min(Math.hypot(p.x - s.ax, p.y - s.ay), Math.hypot(p.x - s.ax, p.y - hy))
      if (d <= bestD) {
        best = s
        bestD = d
      }
    }
    return best
  }

  const toTray = (p: Piece) => {
    p.where = 'tray'
    p.heldBy = -1
    p.parent = -1
    p.slot = 0
    if (p.isBar) {
      p.angle = 0
      p.vel = 0
      p.amp = 0
      p.turn = 0
      p.turning = false
      for (const kid of childrenOf(p.id)) toTray(kid)
    }
  }

  const hang = (p: Piece, bar: number, slot: number) => {
    p.where = 'hung'
    p.heldBy = -1
    p.parent = bar
    p.slot = slot
    // A little swing as the weight arrives.
    pieces[bar]!.vel += 0.035 * Math.sign(slot) * (1 + massOf(p) / 6)
  }

  const originFree = (p: Piece): boolean => {
    if (p.fromSlot === 0) return false
    const bar = pieces[p.fromParent]
    return bar !== undefined && inMain(bar) && !pieces.some((q) => q.where === 'hung' && q.parent === p.fromParent && q.slot === p.fromSlot)
  }

  const drop = (p: Piece) => {
    const pointerId = p.heldBy
    const start = starts.get(pointerId)
    grabbed.delete(pointerId)
    starts.delete(pointerId)
    p.heldBy = -1
    const near = p.y < TRAY_Y ? nearestFree(p, layout()) : null
    if (near) {
      hang(p, near.bar, near.slot)
      emit(near.bar === p.fromParent && near.slot === p.fromSlot ? 'putback' : 'hang')
    } else if (p.y < TRAY_Y && originFree(p)) {
      hang(p, p.fromParent, p.fromSlot)
      emit('putback')
    } else {
      toTray(p)
      if (p.fromSlot !== 0) emit('stow')
    }
    // A tap on something hung (barely moved) is a poke that sets its bar swinging.
    if (p.where === 'hung' && start && Math.hypot(p.x - start.x, p.y - start.y) < TAP_MOVE && p.fromSlot !== 0) {
      pieces[p.parent]!.vel += 0.12 * Math.sign(p.slot)
      emit('poke')
    }
    p.fromParent = -1
    p.fromSlot = 0
    refresh()
  }

  const pickUp = (pointerId: number, p: Piece, x: number, y: number) => {
    if (p.where === 'hung') {
      p.fromParent = p.parent
      p.fromSlot = p.slot
    } else {
      p.fromParent = -1
      p.fromSlot = 0
    }
    p.where = 'held'
    p.heldBy = pointerId
    p.parent = -1
    p.slot = 0
    p.x = x
    p.y = y
    grabbed.set(pointerId, p.id)
    starts.set(pointerId, { x, y })
    emit('pick')
    refresh()
  }

  const hit = (x: number, y: number): Piece | null => {
    const lay = layout()
    let best: Piece | null = null
    let bestD = Infinity
    for (const s of lay.shapes) {
      if (s.mode === 'held') continue
      const d = Math.hypot(x - s.x, y - s.y)
      if (d <= s.r + SHAPE_SLOP && d < bestD) {
        best = pieces[s.id]!
        bestD = d
      }
    }
    if (best) return best
    for (const b of lay.bars) {
      if (b.mode === 'held' || b.id === ROOT_ID) continue
      const inside = b.mode === 'tray' ? Math.abs(x - b.x) <= b.half * b.gap + 16 && Math.abs(y - b.y) <= 30 : Math.hypot(x - b.x, y - b.y) <= HUB_HIT
      const d = Math.hypot(x - b.x, y - b.y)
      if (inside && d < bestD) {
        best = pieces[b.id]!
        bestD = d
      }
    }
    return best
  }

  // A touch that grabbed nothing sets the nearest bar swinging: a breeze.
  const nudge = (x: number, y: number) => {
    const lay = layout()
    let target = root
    let sideX = ROOT_AT.x
    let bestD = NUDGE_REACH
    let strong = false
    for (const b of lay.bars) {
      if (b.mode !== 'main') continue
      const ends = lay.slots.filter((s) => s.mode === 'main' && s.bar === b.id && Math.abs(s.slot) === b.half)
      const left = ends.find((s) => s.slot < 0)
      const right = ends.find((s) => s.slot > 0)
      if (!left || !right) continue
      const dx = right.ax - left.ax
      const dy = right.ay - left.ay
      const t = clamp(((x - left.ax) * dx + (y - left.ay) * dy) / (dx * dx + dy * dy), 0, 1)
      const d = Math.hypot(x - (left.ax + dx * t), y - (left.ay + dy * t))
      if (d <= bestD) {
        bestD = d
        target = pieces[b.id]!
        sideX = b.x
        strong = true
      }
    }
    target.vel += (strong ? 0.16 : 0.08) * (x >= sideX ? 1 : -1)
    emit('nudge')
  }

  const release = (pointerId: number) => {
    const id = grabbed.get(pointerId)
    if (id !== undefined) drop(pieces[id]!)
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (phase === 'down') {
      if (!finite) return
      release(id)
      const p = hit(x, y)
      if (p) pickUp(id, p, clamp(x, 0, FIELD_W), clamp(y, 0, FIELD_H))
      else nudge(x, y)
      return
    }
    const heldId = grabbed.get(id)
    if (heldId !== undefined && finite) {
      const p = pieces[heldId]!
      p.x = clamp(x, 0, FIELD_W)
      p.y = clamp(y, 0, FIELD_H)
    }
    if (phase === 'up') release(id)
  }

  const step = () => {
    tick++
    idleTicks++
    for (const p of pieces) {
      if (!p.isBar || p.where === 'tray') continue
      p.vel += -SPRING * (p.angle - p.target) - DAMP * p.vel
      p.angle += p.vel
      if (Math.abs(p.angle - p.target) < 0.004 && Math.abs(p.vel) < 0.002) {
        p.angle = p.target
        p.vel = 0
      }
      // Level, at rest, and hanging from the hook: it turns slowly.
      const turning = p.status === 'balanced' && p.angle === 0 && p.vel === 0 && inMain(p)
      if (turning && !p.turning) emit('turning')
      p.turning = turning
      p.amp = turning ? Math.min(1, p.amp + 0.06) : Math.max(0, p.amp - 0.06)
      p.turn = p.amp > 0 ? p.turn + TURN_RATE : 0
    }
    // Hook next-mobile: once the whole mobile has turned for a spell, it is taken
    // down and a fresh, slightly bigger set is dealt.
    if (hooks.has(NEXT_HOOK)) {
      const loaded = pieces.filter((p) => p.isBar && p.status !== 'empty' && inMain(p))
      wholeTurnTicks = cls.complete && loaded.length > 0 && loaded.every((p) => p.turning) ? wholeTurnTicks + 1 : 0
      if (wholeTurnTicks >= NEXT_AFTER_TICKS && grabbed.size === 0) {
        round++
        wholeTurnTicks = 0
        deal(makePuzzle(config.seed + round * 7919, round))
        refresh()
        emitHook(NEXT_HOOK)
      }
    }
  }

  const affordances = (): Affordance[] => {
    const lay = layout()
    const list: Affordance[] = []
    const add = (cx: number, cy: number, w: number, h: number, kind: Affordance['kind'], salience: number) => {
      list.push({ x: clamp(cx - w / 2, 0, FIELD_W - w), y: clamp(cy - h / 2, 0, FIELD_H - h), w, h, kind, salience })
    }
    for (const s of lay.shapes) if (s.mode !== 'held') add(s.x, s.y, s.r * 2, s.r * 2, 'drag', s.mode === 'tray' ? 0.7 : 0.4)
    for (const b of lay.bars) {
      if (b.mode === 'held') continue
      if (b.mode === 'tray') add(b.x, b.y, 2 * b.half * b.gap + 32, 60, 'drag', 0.6)
      else if (b.id !== ROOT_ID) add(b.x, b.y, HUB_HIT * 2, HUB_HIT * 2, 'drag', 0.4)
    }
    for (const s of lay.slots) if (s.mode === 'main' && s.occupant === -1) add(s.ax, s.ay, 64, 64, 'tap', 0.25)
    return list
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    return {
      signature: cls.signature,
      features: {
        balanced: cls.balanced,
        hung: cls.hung,
        tilt: cls.tilt,
        turning: pieces.filter((p) => p.turning).length,
        held: grabbed.size,
        round,
      },
      events,
    }
  }

  // Idle guidance: the next piece of the dealt solution and the slot it goes in.
  const hint = (lay: Placed): SwaySnapshot['hint'] => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS || grabbed.size > 0) return null
    for (const step of buildOrder) {
      const piece = pieces[step.piece]!
      if (piece.where === 'hung' && piece.parent === step.parent && piece.slot === step.slot) continue
      if (!inMain(pieces[step.parent]!)) continue
      const slot = lay.slots.find((s) => s.mode === 'main' && s.bar === step.parent && s.slot === step.slot)
      if (!slot || slot.occupant !== -1) continue
      const from = lay.shapes.find((s) => s.id === piece.id) ?? lay.bars.find((b) => b.id === piece.id)
      if (!from) continue
      return { from: { x: from.x, y: from.y }, to: { x: slot.ax, y: slot.ay } }
    }
    return null
  }

  const snapshot = (): SwaySnapshot => {
    const lay = layout()
    const heldPiece = pieces.find((p) => p.where === 'held')
    const near = heldPiece ? nearestFree(heldPiece, lay) : null
    return {
      tick,
      bars: lay.bars.map((b) => {
        const p = pieces[b.id]!
        return {
          id: b.id,
          x: b.x,
          y: b.y,
          angle: b.angle,
          scale: b.scale,
          half: b.half,
          gap: b.gap,
          root: b.id === ROOT_ID,
          held: b.mode === 'held',
          tray: b.mode === 'tray',
          status: p.status,
          turning: p.turning,
          total: p.total,
          torque: p.torque,
        }
      }),
      shapes: lay.shapes.map((s) => {
        const p = pieces[s.id]!
        return { id: s.id, x: s.x, y: s.y, r: s.r, mass: p.mass, form: p.form, held: s.mode === 'held', tray: s.mode === 'tray' }
      }),
      slots: lay.slots.map((s) => ({ bar: s.bar, slot: s.slot, x: s.ax, y: s.ay, free: s.occupant === -1, held: s.mode === 'held' })),
      ropes: lay.ropes,
      target: near ? { x: near.ax, y: near.ay } : null,
      state: cls.state,
      complete: cls.complete,
      round: hooks.has(NEXT_HOOK) ? round + 1 : null,
      hint: hint(lay),
    }
  }

  refresh()
  return { step, pointer, affordances, observe, snapshot }
}
