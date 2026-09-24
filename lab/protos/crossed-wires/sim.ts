// Crossed Wires. Beetles trundle over three pressure plates. The child drags
// wires from plates and gates to lamps and a drawbridge, and taps the six gate
// sockets to seat a gate (not, both, either, a short or a long delay). Signals
// are on or off; every gate takes a few ticks to answer, so a not-gate wired
// back on itself flickers, a not through a delay blinks steadily, and an
// either fed back on itself remembers. A traveler waits at the moat and crosses
// only if the wiring holds the bridge down long enough.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now,
// or performance.now. It reads a seeded rng and counts ticks, nothing else.

import { between, createRng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface Pt {
  x: number
  y: number
}

export type GateType = '' | 'not' | 'both' | 'either' | 'delay-s' | 'delay-l'
export const GATE_CYCLE: readonly GateType[] = ['', 'not', 'both', 'either', 'delay-s', 'delay-l']
// Ticks a gate takes to answer. A loop's half period is the sum along the loop.
const GATE_TICKS: Record<GateType, number> = { '': 1, not: 2, both: 2, either: 2, 'delay-s': 12, 'delay-l': 45 }
const inputCount = (t: GateType): number => (t === '' ? 0 : t === 'both' || t === 'either' ? 2 : 1)

// Field furniture, in logical coordinates. Rect x and y are the top-left corner.
export const LANE_Y = [100, 260, 420] as const
export const PLATE_CX = 215
const PLATE_HALF = 45
const BEETLE_MIN = 70
const BEETLE_MAX = 360
const PLATE_OUT_X = 445
export const SOCKETS: readonly Rect[] = [0, 1, 2, 3, 4, 5].map((i) => ({ x: i < 3 ? 540 : 730, y: LANE_Y[i % 3]! - 60, w: 130, h: 120 }))
export const LAMPS: readonly Rect[] = LANE_Y.map((y) => ({ x: 1000, y: y - 60, w: 140, h: 120 }))
export const BRIDGE_BOX: Rect = { x: 1000, y: 580, w: 140, h: 120 }
// The moat: a deck hinged at the left bank, banks either side.
export const HINGE_X = 300
export const FAR_X = 640
export const DECK_Y = 660
const LEFT_STAND = 170
const RIGHT_STAND = 770
// Slow enough that no beetle's own pulse (at most about 100 ticks) holds the
// bridge down for a whole crossing (about 130 ticks): a plate wired straight
// to the bridge makes a traveler slip. A held beetle, a latch, or a long loop
// gets them over.
const TRAVEL = 4
const BRIDGE_RATE = 1 / 12

// Node ids: plates 0-2, gates 3-8, lamps 9-11, bridge 12.
const GATE0 = 3
const SINK0 = 9
const BRIDGE = 12
const NODES = 13
const isGate = (id: number) => id >= GATE0 && id < SINK0

const PORT_HIT = 44
const DROP_SNAP = 90
const OCCUPIED_PENALTY = 25
const BEETLE_HIT = 50
const TAP_MOVE = 24
const PORT_PAD = 34
const HINT_AFTER_TICKS = 120
const MAX_EVENTS = 64
const RUN_KEEP = 6
const SLOW_RUN = 120

type Cls = 'dark' | 'lit' | 'slow' | 'buzz' | 'blink' | 'beat'
const CLS_ORDER: readonly Cls[] = ['dark', 'lit', 'slow', 'buzz', 'blink', 'beat']

interface Run {
  on: boolean
  len: number
}
interface SinkRuns {
  on: boolean
  since: number
  runs: Run[]
  cls: Cls
  // What the newest runs say, worked out when a run is pushed (see reshape).
  longest: number
  shape: Cls
}
interface Beetle {
  x: number
  dir: number
  speed: number
  rest: boolean
  held: boolean
}
type Drag =
  | { kind: 'wire'; from: number; picked: boolean; sx: number; sy: number; x: number; y: number }
  | { kind: 'beetle'; lane: number; sx: number; sy: number; x: number; y: number }
  | { kind: 'socket'; socket: number; sx: number; sy: number; x: number; y: number }

export type Hint = { kind: 'wire'; x1: number; y1: number; x2: number; y2: number } | { kind: 'tap'; x: number; y: number }

// Plain data the view draws from (contract: snapshot).
export interface CrossedWiresSnapshot {
  tick: number
  lanes: Array<{ x: number; y: number; rest: boolean; held: boolean; pressed: boolean; out: Pt }>
  sockets: Array<{ rect: Rect; type: GateType; on: boolean; ins: Pt[]; out: Pt | null }>
  sinks: Array<{ rect: Rect; port: Pt; bridge: boolean; lit: boolean; cls: Cls }>
  wires: Array<{ x1: number; y1: number; x2: number; y2: number; on: boolean }>
  dragging: Array<{ x1: number; y1: number; x2: number; y2: number }>
  bridge: number
  traveler: { x: number; y: number; dir: number; phase: string }
  crossings: number
  // Null when the stamps hook is removed.
  stamps: string[] | null
  hint: Hint | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inRect = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
const clampPt = (x: number, y: number): Pt => ({ x: clamp(x, 0, FIELD_W), y: clamp(y, 0, FIELD_H) })

export const createSim: CreateSim<CrossedWiresSnapshot> = (config): Sim<CrossedWiresSnapshot> => {
  const rng = createRng(config.seed)
  // (contract: hooks) `stamps` is honoured only when it is in this list.
  const hooks = new Set(config.hooks)

  const beetles: Beetle[] = LANE_Y.map(() => ({
    x: between(rng, 90, 340),
    dir: rng() < 0.5 ? -1 : 1,
    // Slow on purpose: a beetle's own rhythm is a long pulse, so a quick
    // flicker or blink is always something the child built.
    speed: between(rng, 0.9, 1.6),
    rest: false,
    held: false,
  }))
  const types: GateType[] = SOCKETS.map(() => '')
  const lines: boolean[][] = SOCKETS.map(() => [false])
  const heads: number[] = SOCKETS.map(() => 0)
  const ins: Array<[number | null, number | null]> = Array.from({ length: NODES }, () => [null, null])
  const out: boolean[] = Array.from({ length: NODES }, () => false)
  const sinkRuns: SinkRuns[] = [0, 1, 2, 3].map(() => ({ on: false, since: 0, runs: [], cls: 'dark' as Cls, longest: 0, shape: 'dark' as Cls }))
  const drags = new Map<number, Drag>()
  const stamps: string[] = []
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0
  let bridge = 0
  let crossings = 0
  let traveler = { x: LEFT_STAND, dir: 1, phase: 'wait', timer: 0 }
  let loopCache: number | null = null

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }
  const earn = (name: string) => {
    if (!hooks.has('stamps') || stamps.includes(name)) return
    stamps.push(name)
    emit({ kind: 'hook', name: 'stamps' })
  }

  // ---- ports ---------------------------------------------------------------

  const gateType = (id: number): GateType => types[id - GATE0]!
  const alive = (id: number) => id < GATE0 || (isGate(id) && gateType(id) !== '')

  const outPort = (id: number): Pt | null => {
    if (id < GATE0) return { x: PLATE_OUT_X, y: LANE_Y[id]! }
    if (!isGate(id) || gateType(id) === '') return null
    const r = SOCKETS[id - GATE0]!
    return { x: r.x + r.w, y: r.y + r.h / 2 }
  }
  const inPort = (id: number, slot: number): Pt | null => {
    if (isGate(id)) {
      const n = inputCount(gateType(id))
      if (slot >= n) return null
      const r = SOCKETS[id - GATE0]!
      const cy = r.y + r.h / 2
      return { x: r.x, y: n === 2 ? cy + (slot === 0 ? -24 : 24) : cy }
    }
    if (id >= SINK0 && slot === 0) {
      const r = id === BRIDGE ? BRIDGE_BOX : LAMPS[id - SINK0]!
      return { x: r.x, y: r.y + r.h / 2 }
    }
    return null
  }
  const bodyOf = (id: number): Rect | null => {
    if (isGate(id)) return gateType(id) === '' ? null : SOCKETS[id - GATE0]!
    if (id >= SINK0) return id === BRIDGE ? BRIDGE_BOX : LAMPS[id - SINK0]!
    return null
  }

  // ---- wiring --------------------------------------------------------------

  const removeFrom = (src: number) => {
    for (let id = GATE0; id < NODES; id++) for (const slot of [0, 1] as const) if (ins[id]![slot] === src) ins[id]![slot] = null
  }

  const setType = (id: number, type: GateType) => {
    const i = id - GATE0
    types[i] = type
    lines[i] = Array.from({ length: GATE_TICKS[type] }, () => false)
    heads[i] = 0
    out[id] = false
    const n = inputCount(type)
    if (n < 2) ins[id]![1] = null
    if (n < 1) {
      ins[id]![0] = null
      removeFrom(id)
    }
    loopCache = null
  }

  const cycleGate = (id: number) => {
    setType(id, GATE_CYCLE[(GATE_CYCLE.indexOf(gateType(id)) + 1) % GATE_CYCLE.length]!)
    emit({ kind: 'state', name: 'gate' })
  }

  // The sim's own hit-tests. Every start point goes through here; affordances()
  // only steers the personas' aim.
  const pickPort = (x: number, y: number): { id: number; slot: number; isOut: boolean } | null => {
    let best: { id: number; slot: number; isOut: boolean } | null = null
    let bestD = PORT_HIT
    for (let id = 0; id < NODES; id++) {
      const o = outPort(id)
      if (o) {
        const d = Math.hypot(x - o.x, y - o.y)
        if (d < bestD) {
          best = { id, slot: 0, isOut: true }
          bestD = d
        }
      }
      for (const slot of [0, 1]) {
        const p = inPort(id, slot)
        if (!p || ins[id]![slot] === null) continue
        const d = Math.hypot(x - p.x, y - p.y)
        if (d < bestD) {
          best = { id, slot, isOut: false }
          bestD = d
        }
      }
    }
    return best
  }

  // Where a released wire lands: the nearest input port within reach, with a
  // small preference for a free one, or the first free input of a gate or sink
  // body it was dropped on.
  const dropTarget = (x: number, y: number): { id: number; slot: number } | null => {
    let best: { id: number; slot: number } | null = null
    let bestScore = Infinity
    for (let id = GATE0; id < NODES; id++) {
      for (const slot of [0, 1]) {
        const p = inPort(id, slot)
        if (!p) continue
        const d = Math.hypot(x - p.x, y - p.y)
        const score = d + (ins[id]![slot] === null ? 0 : OCCUPIED_PENALTY)
        if (d < DROP_SNAP && score < bestScore) {
          best = { id, slot }
          bestScore = score
        }
      }
    }
    if (best) return best
    for (let id = GATE0; id < NODES; id++) {
      const body = bodyOf(id)
      if (!body || !inRect(body, x, y)) continue
      const slot = inPort(id, 1) && ins[id]![0] !== null && ins[id]![1] === null ? 1 : 0
      return { id, slot }
    }
    return null
  }

  const beetleAt = (x: number, y: number): number => {
    let best = -1
    let bestD = BEETLE_HIT
    beetles.forEach((b, i) => {
      if (b.held) return
      const d = Math.hypot(x - b.x, y - LANE_Y[i]!)
      if (d <= bestD) {
        best = i
        bestD = d
      }
    })
    return best
  }

  // ---- pointer -------------------------------------------------------------

  const release = (id: number) => {
    const d = drags.get(id)
    if (!d) return
    drags.delete(id)
    const moved = Math.hypot(d.x - d.sx, d.y - d.sy)
    if (d.kind === 'beetle') {
      const b = beetles[d.lane]!
      b.held = false
      // A tap stops or starts a beetle; a drag leaves it resting where it was put.
      b.rest = moved < TAP_MOVE ? !b.rest : true
      emit({ kind: 'state', name: b.rest ? 'beetle-rest' : 'beetle-go' })
    } else if (d.kind === 'socket') {
      if (moved < TAP_MOVE) cycleGate(GATE0 + d.socket)
    } else if (moved < TAP_MOVE) {
      // A tap on a picked-up wire unplugs it; a tap on a gate's output seats the next gate.
      if (d.picked) emit({ kind: 'state', name: 'unplug' })
      else if (isGate(d.from)) cycleGate(d.from)
    } else {
      const target = dropTarget(d.x, d.y)
      if (target && alive(d.from)) {
        ins[target.id]![target.slot] = d.from
        loopCache = null
        emit({ kind: 'state', name: 'plug' })
      } else if (d.picked) emit({ kind: 'state', name: 'unplug' })
    }
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    if (phase === 'down') {
      release(id)
      const port = pickPort(x, y)
      if (port && port.isOut) {
        drags.set(id, { kind: 'wire', from: port.id, picked: false, sx: x, sy: y, x, y })
      } else if (port) {
        // Pick up the plugged wire: it follows the finger until it is dropped.
        const from = ins[port.id]![port.slot]!
        ins[port.id]![port.slot] = null
        loopCache = null
        drags.set(id, { kind: 'wire', from, picked: true, sx: x, sy: y, x, y })
      } else {
        const lane = beetleAt(x, y)
        const socket = SOCKETS.findIndex((r) => inRect(r, x, y))
        if (lane >= 0) {
          beetles[lane]!.held = true
          drags.set(id, { kind: 'beetle', lane, sx: x, sy: y, x, y })
        } else if (socket >= 0) drags.set(id, { kind: 'socket', socket, sx: x, sy: y, x, y })
      }
      return
    }
    const d = drags.get(id)
    if (d) {
      d.x = x
      d.y = y
      if (d.kind === 'beetle') beetles[d.lane]!.x = clamp(x, BEETLE_MIN, BEETLE_MAX)
    }
    if (phase === 'up') release(id)
  }

  // ---- behaviour classes ---------------------------------------------------

  // How often the run lengths jump between one on-run (or off-run) and the
  // next. One jump is a lead-in or a change of regime; a beat keeps jumping.
  const jumps = (runs: Run[]): number => {
    let n = 0
    for (const on of [true, false]) {
      const lens = runs.filter((r) => r.on === on).map((r) => r.len)
      for (let i = 1; i < lens.length; i++) if (Math.abs(lens[i]! - lens[i - 1]!) > 3) n++
    }
    return n
  }

  // What a sink's last few runs say it is doing: a discrete class. The newest
  // three runs say how fast it goes; the whole window says whether it is even.
  // The runs change only when one is pushed, so this is worked out then.
  const reshape = (s: SinkRuns) => {
    let longest = 0
    for (let i = Math.max(0, s.runs.length - 3); i < s.runs.length; i++) longest = Math.max(longest, s.runs[i]!.len)
    s.longest = longest
    // Four runs are needed before it counts as a rhythm: with three, the run
    // before the rhythm started can still be one of the newest.
    if (longest > SLOW_RUN || s.runs.length < 4) s.shape = 'slow'
    else if (longest <= 4) s.shape = 'buzz'
    else s.shape = jumps(s.runs) >= 2 ? 'beat' : 'blink'
  }

  // What a sink has been doing lately: its shape while the runs are recent,
  // steady once nothing has changed for a while.
  const classify = (s: SinkRuns): Cls => {
    const steady: Cls = s.on ? 'lit' : 'dark'
    if (s.runs.length < 2) return steady
    return tick - s.since > 2 * s.longest + 10 ? steady : s.shape
  }

  const loopGates = (): number => {
    if (loopCache !== null) return loopCache
    let count = 0
    for (let g = GATE0; g < SINK0; g++) {
      if (gateType(g) === '') continue
      const seen = new Set<number>()
      const stack: number[] = [...ins[g]!.filter((n): n is number => n !== null)]
      let found = false
      while (stack.length > 0 && !found) {
        const n = stack.pop()!
        if (n === g) found = true
        else if (!seen.has(n)) {
          seen.add(n)
          for (const s of ins[n]!) if (s !== null) stack.push(s)
        }
      }
      if (found) count++
    }
    loopCache = count
    return count
  }

  // ---- step ----------------------------------------------------------------

  const step = () => {
    tick++
    idleTicks++

    beetles.forEach((b, i) => {
      if (!b.rest && !b.held) {
        b.x += b.dir * b.speed
        if (b.x >= BEETLE_MAX) {
          b.x = BEETLE_MAX
          b.dir = -1
        } else if (b.x <= BEETLE_MIN) {
          b.x = BEETLE_MIN
          b.dir = 1
        }
      }
      out[i] = Math.abs(b.x - PLATE_CX) <= PLATE_HALF
    })

    // Every gate reads last tick's signals, so a loop is a real loop in time.
    const level = (src: number | null) => src !== null && out[src]!
    const next: boolean[] = []
    for (let g = GATE0; g < SINK0; g++) {
      const type = gateType(g)
      if (type === '') continue
      const a = level(ins[g]![0])
      const b = level(ins[g]![1])
      const value = type === 'not' ? !a : type === 'both' ? a && b : type === 'either' ? a || b : a
      const i = g - GATE0
      const line = lines[i]!
      next[g] = line[heads[i]!]!
      line[heads[i]!] = value
      heads[i] = (heads[i]! + 1) % line.length
    }
    for (let g = GATE0; g < SINK0; g++) if (gateType(g) !== '') out[g] = next[g]!

    sinkRuns.forEach((s, k) => {
      const id = SINK0 + k
      const lit = level(ins[id]![0])
      out[id] = lit
      if (lit !== s.on) {
        s.runs.push({ on: s.on, len: tick - s.since })
        if (s.runs.length > RUN_KEEP) s.runs.shift()
        s.on = lit
        s.since = tick
        reshape(s)
      }
      const cls = classify(s)
      if (cls !== s.cls) {
        s.cls = cls
        if (cls === 'buzz' || cls === 'blink' || cls === 'beat') {
          emit({ kind: 'state', name: cls })
          earn(cls)
        }
      }
    })

    bridge += clamp((out[BRIDGE] ? 1 : 0) - bridge, -BRIDGE_RATE, BRIDGE_RATE)

    const t = traveler
    if (t.phase === 'wait') {
      if (t.timer > 0) t.timer--
      else if (bridge >= 0.95) t.phase = 'walk'
    } else if (t.phase === 'walk') {
      t.x += t.dir * TRAVEL
      if (t.x > HINGE_X && t.x < FAR_X && bridge < 0.6) {
        // The bridge rose under the traveler: back to the bank it started from.
        t.x = t.dir > 0 ? LEFT_STAND : RIGHT_STAND
        t.phase = 'wait'
        t.timer = 45
        emit({ kind: 'state', name: 'slip' })
      } else if ((t.dir > 0 && t.x >= RIGHT_STAND) || (t.dir < 0 && t.x <= LEFT_STAND)) {
        t.x = t.dir > 0 ? RIGHT_STAND : LEFT_STAND
        t.phase = 'arrived'
        t.timer = 60
        crossings++
        emit({ kind: 'state', name: 'cross' })
        earn('cross')
      }
    } else if (--t.timer <= 0) {
      // A new traveler turns up on this bank, bound for the other one.
      t.dir = -t.dir
      t.phase = 'wait'
    }
  }

  // ---- reads ---------------------------------------------------------------

  const wireCount = () => {
    let n = 0
    for (let id = GATE0; id < NODES; id++) for (const s of ins[id]!) if (s !== null) n++
    return n
  }
  const gateCount = () => {
    let n = 0
    for (const t of types) if (t !== '') n++
    return n
  }
  const hasConsumer = (src: number) => ins.some((slots) => slots.includes(src))

  // (contract: affordances) Top-left rectangles inside the field. Plates and
  // gate outputs start wires; plugged inputs pick wires up; sockets and beetles
  // take taps. Reading this changes nothing.
  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    const around = (p: Pt, half: number, kind: Affordance['kind'], salience: number) =>
      list.push({ x: clamp(p.x - half, 0, FIELD_W - 2 * half), y: clamp(p.y - half, 0, FIELD_H - 2 * half), w: 2 * half, h: 2 * half, kind, salience })
    for (let id = 0; id < SINK0; id++) {
      const o = outPort(id)
      if (o) around(o, PORT_PAD, 'drag', id < GATE0 ? (hasConsumer(id) ? 0.4 : 0.75) : hasConsumer(id) ? 0.3 : 0.55)
    }
    for (let id = GATE0; id < NODES; id++) {
      for (const slot of [0, 1]) {
        const p = inPort(id, slot)
        if (p && ins[id]![slot] !== null) around(p, PORT_PAD, 'drag', 0.15)
      }
    }
    SOCKETS.forEach((r, i) => list.push({ ...r, kind: 'tap', salience: types[i] === '' ? 0.4 : 0.3 }))
    beetles.forEach((b, i) => around({ x: b.x, y: LANE_Y[i]! }, 40, 'tap', 0.3))
    return list
  }

  // (contract: observe) The signature is the set of behaviour classes present
  // across the four sinks, never a coordinate or a count.
  const observe = (): Observation => {
    const events = pending
    pending = []
    // How many different gates are seated.
    let kinds = 0
    for (const t of GATE_CYCLE) if (t !== '' && types.includes(t)) kinds++
    let lit = 0
    let blinking = 0
    for (const s of sinkRuns) {
      if (s.on) lit++
      if (s.cls === 'buzz' || s.cls === 'blink' || s.cls === 'beat') blinking++
    }
    // An unlit sink is the resting state, so `dark` names the world only when
    // nothing else is going on.
    const active = CLS_ORDER.filter((c) => c !== 'dark' && sinkRuns.some((s) => s.cls === c))
    return {
      signature: active.length > 0 ? active.join('+') : 'dark',
      features: { wires: wireCount(), gates: gateCount(), kinds, lit, loops: loopGates(), blinking, crossings },
      events,
    }
  }

  // (contract: hints) Idle demonstration only, and only with hints on.
  const hint = (): Hint | null => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS) return null
    if (wireCount() === 0) {
      const a = outPort(0)!
      const b = inPort(SINK0, 0)!
      return { kind: 'wire', x1: a.x, y1: a.y, x2: b.x, y2: b.y }
    }
    if (gateCount() === 0) {
      const r = SOCKETS[0]!
      return { kind: 'tap', x: r.x + r.w / 2, y: r.y + r.h / 2 }
    }
    if (loopGates() === 0) {
      const g = types.findIndex((t) => t !== '')
      const a = outPort(GATE0 + g)
      const b = inPort(GATE0 + g, 0)
      if (a && b) return { kind: 'wire', x1: a.x, y1: a.y, x2: b.x, y2: b.y }
    }
    return null
  }

  const snapshot = (): CrossedWiresSnapshot => {
    const wires: CrossedWiresSnapshot['wires'] = []
    for (let id = GATE0; id < NODES; id++) {
      ins[id]!.forEach((src, slot) => {
        const a = src === null ? null : outPort(src)
        const b = inPort(id, slot)
        if (a && b) wires.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, on: out[src!]! })
      })
    }
    const dragging: CrossedWiresSnapshot['dragging'] = []
    for (const d of drags.values()) {
      if (d.kind !== 'wire') continue
      const a = outPort(d.from)
      const end = clampPt(d.x, d.y)
      if (a) dragging.push({ x1: a.x, y1: a.y, x2: end.x, y2: end.y })
    }
    return {
      tick,
      lanes: beetles.map((b, i) => ({ x: b.x, y: LANE_Y[i]!, rest: b.rest, held: b.held, pressed: out[i]!, out: outPort(i)! })),
      sockets: SOCKETS.map((rect, i) => ({
        rect: { ...rect },
        type: types[i]!,
        on: out[GATE0 + i]!,
        ins: [0, 1].map((slot) => inPort(GATE0 + i, slot)).filter((p): p is Pt => p !== null),
        out: outPort(GATE0 + i),
      })),
      sinks: sinkRuns.map((s, k) => {
        const id = SINK0 + k
        return { rect: { ...bodyOf(id)! }, port: inPort(id, 0)!, bridge: id === BRIDGE, lit: s.on, cls: s.cls }
      }),
      wires,
      dragging,
      bridge,
      traveler: { x: traveler.x, y: DECK_Y - 26, dir: traveler.dir, phase: traveler.phase },
      crossings,
      stamps: hooks.has('stamps') ? [...stamps] : null,
      hint: hint(),
    }
  }

  return { step, pointer, affordances, observe, snapshot }
}
