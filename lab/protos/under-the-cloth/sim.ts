// Under the Cloth. A blank cloth hides magnets (north-up or south-up) and iron
// plates. The child drags a hand magnet over it and taps to flip its pole.
// Beads scattered on the cloth react inside the hand magnet's zone: they CLUMP
// toward a hidden thing that attracts the current pole and RING away from one
// that repels it. Iron attracts under both poles; a magnet flips with the
// pole. The hand magnet itself lurches (pulled or pushed off the finger) and
// SNAPS onto an attractor, which a pole flip either holds (iron) or shoves off
// (magnet). Two close opposite magnets half cancel: half clump, half ring.
// The child marks guesses with tokens and lifts the cloth to check.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now,
// or performance.now. It reads a seeded rng and counts ticks, nothing else.

import { between, chance, createRng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// Field furniture; x and y are the top-left corner like fillRect.
export const CLOTH: Rect = { x: 20, y: 20, w: 940, h: 780 }
export const POLE_BTN: Rect = { x: 990, y: 30, w: 160, h: 160 }
export const TOKEN_SLOTS: readonly Rect[] = [0, 1, 2].map((i) => ({ x: 1000, y: 230 + i * 140, w: 140, h: 120 }))
// Lifts the cloth; once lifted, the same button lays a fresh cloth.
export const LIFT_BTN: Rect = { x: 990, y: 670, w: 160, h: 120 }

// What can hide: a north-up magnet, a south-up magnet, an iron plate.
export type Kind = 0 | 1 | 2
const IRON = 2

const BEADS = 220
const ZONE = 200 // the hand magnet wakes beads this close
const BEAD_PUSH = 4
const BEAD_FRICTION = 0.78
const HAND_REACH = 170 // hidden things tug the hand magnet this close
const HAND_PULL = 5
const SPRING = 0.1
const FREE = 0.25 // a loose hand magnet feels the tug at a quarter strength
const SNAP_R = 28
const BREAK_R = 110 // the finger must pull this far from a snapped thing to tear free
const IRON_K = 0.7
const TEST_R = 150
const READ_R = 190
const MATCH_R = 80
const MAX_MARKS = 8
const MARK_HIT = 44
const TAP_MOVE = 24
const TAP_TICKS = 15
const TWIN_D = 120
const MAX_LEVEL = 2
const HINT_AFTER = 150
const MAX_EVENTS = 64
const HAND_MARGIN = 24
const GX = 10
const GY = 8
const SWEEP_R = 110
const TAU = Math.PI * 2

interface Item {
  x: number
  y: number
  kind: Kind
  range: number
  found: boolean
}
interface Marker {
  x: number
  y: number
  kind: Kind
  verdict: 'ok' | 'wrong' | null
}
interface Carry {
  kind: Kind
  x: number
  y: number
  fromMarker: boolean
}
interface Touch {
  id: number
  startX: number
  startY: number
  downTick: number
  moved: boolean
}

// Plain data the view draws from. `items` always holds the hidden layout so
// tests can aim; the view draws it only once `revealed`.
export interface ClothSnapshot {
  tick: number
  phase: 'dowse' | 'lifted'
  revealed: boolean
  pole: 1 | -1
  hand: { x: number; y: number; snapped: boolean; zone: number }
  finger: { x: number; y: number } | null
  // Flat x, y pairs.
  beads: number[]
  items: Array<{ x: number; y: number; kind: Kind; range: number; found: boolean }>
  twin: boolean
  markers: Array<{ x: number; y: number; kind: Kind; verdict: 'ok' | 'wrong' | null }>
  carrying: Array<{ x: number; y: number; kind: Kind }>
  verdict: string
  cloth: number
  level: number
  correct: number
  // Null when the score hook is removed.
  score: number | null
  hint: { x: number; y: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inRect = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
// +1 when the hidden thing attracts a hand magnet of this pole, -1 when it repels.
const coupling = (kind: Kind, pole: number): number => (kind === IRON ? IRON_K : (kind === 0 ? 1 : -1) === pole ? -1 : 1)
// A rectangle of this size centred on (cx, cy), kept inside the field.
const boxAt = (cx: number, cy: number, w: number, h: number) => ({
  x: clamp(cx - w / 2, 0, FIELD_W - w),
  y: clamp(cy - h / 2, 0, FIELD_H - h),
  w,
  h,
})

export const createSim: CreateSim<ClothSnapshot> = (config): Sim<ClothSnapshot> => {
  const rng = createRng(config.seed)
  const hooks = new Set(config.hooks)

  let items: Item[] = []
  let twin = false
  let mask: number[] = [] // per item: bit 0 probed under north, bit 1 under south
  const bx: number[] = []
  const by: number[] = []
  const bvx: number[] = []
  const bvy: number[] = []
  const box: number[] = [] // where in a clump each bead settles
  const boy: number[] = []
  const bjit: number[] = [] // each bead's own ring radius, so a ring has a thickness
  const bang: number[] = []
  let markers: Marker[] = []
  const carries = new Map<number, Carry>()
  let touch: Touch | null = null
  let finger: { x: number; y: number } | null = null
  let hx = 0
  let hy = 0
  let hvx = 0
  let hvy = 0
  let pole: 1 | -1 = 1
  let snapped = -1
  let ignore = -1
  let phase: 'dowse' | 'lifted' = 'dowse'
  let verdict = 'none'
  let tick = 0
  let idleTicks = 0
  let level = 0
  let cloth = 0
  let correct = 0
  let lifts = 0
  let score = 0
  let flippedHere = false
  let sweptCells: boolean[] = []
  let sweptCount = 0
  let lastSweepX = -1e9
  let lastSweepY = -1e9
  let pending: SimEvent[] = []

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }
  const state = (name: string) => emit({ kind: 'state', name })

  // ---- a fresh cloth ------------------------------------------------------

  const layout = () => {
    // The level hook makes a clean cloth lead to a bigger one with a twin.
    twin = level >= 1 || chance(rng, 0.4)
    const n = 3 + (chance(rng, 0.4) ? 1 : 0) + Math.min(MAX_LEVEL, level)
    const list: Item[] = []
    const spot = (x0: number, x1: number, y0: number, y1: number, gap: number) => {
      let x = 0
      let y = 0
      for (let t = 0; t < 60; t++) {
        x = between(rng, x0, x1)
        y = between(rng, y0, y1)
        if (list.every((o) => Math.hypot(o.x - x, o.y - y) >= gap)) break
      }
      return { x, y }
    }
    if (twin) {
      const c = spot(200, 780, 200, 620, 0)
      const a = between(rng, 0, TAU)
      const first: Kind = chance(rng, 0.5) ? 0 : 1
      const second: Kind = first === 0 ? 1 : 0
      const dx = (Math.cos(a) * TWIN_D) / 2
      const dy = (Math.sin(a) * TWIN_D) / 2
      list.push({ x: c.x + dx, y: c.y + dy, kind: first, range: 150, found: false })
      list.push({ x: c.x - dx, y: c.y - dy, kind: second, range: 150, found: false })
    }
    while (list.length < n) {
      const p = spot(150, 830, 150, 670, 260)
      const r = rng()
      const kind: Kind = r < 0.34 ? 2 : r < 0.67 ? 0 : 1
      list.push({ x: p.x, y: p.y, kind, range: kind === IRON ? 115 : 150, found: false })
    }
    items = list
    mask = list.map(() => 0)
  }

  const scatter = () => {
    for (const a of [bx, by, bvx, bvy, box, boy, bjit, bang]) a.length = 0
    for (let b = 0; b < BEADS; b++) {
      bx.push(between(rng, CLOTH.x + 10, CLOTH.x + CLOTH.w - 10))
      by.push(between(rng, CLOTH.y + 10, CLOTH.y + CLOTH.h - 10))
      bvx.push(0)
      bvy.push(0)
      const a = between(rng, 0, TAU)
      const r = 4 + 24 * Math.sqrt(rng())
      box.push(Math.cos(a) * r)
      boy.push(Math.sin(a) * r)
      bjit.push(between(rng, 0.82, 1))
      bang.push(between(rng, 0, TAU))
    }
  }

  const newCloth = () => {
    cloth++
    layout()
    scatter()
    markers = []
    carries.clear()
    touch = null
    finger = null
    const c = centre(CLOTH)
    hx = c.x
    hy = c.y
    hvx = 0
    hvy = 0
    snapped = -1
    ignore = -1
    phase = 'dowse'
    verdict = 'none'
    flippedHere = false
    sweptCells = new Array<boolean>(GX * GY).fill(false)
    sweptCount = 0
    lastSweepX = -1e9
    lastSweepY = -1e9
    state('new-cloth')
  }
  newCloth()
  pending = []

  // ---- input ------------------------------------------------------------------

  const flip = () => {
    if (phase !== 'dowse') return
    pole = pole === 1 ? -1 : 1
    flippedHere = true
    state('flip')
    if (snapped < 0) return
    const it = items[snapped]!
    if (coupling(it.kind, pole) > 0) {
      state('hold-firm')
      return
    }
    // A magnet at the wrong pole throws the hand magnet off.
    let dx = hx - it.x
    let dy = hy - it.y
    let d = Math.hypot(dx, dy)
    if (d < 0.5) {
      dx = Math.cos(snapped + 1)
      dy = Math.sin(snapped + 1)
      d = 1
    }
    hvx = (dx / d) * 12
    hvy = (dy / d) * 12
    ignore = snapped
    snapped = -1
    state('shove')
  }

  const place = (kind: Kind, x: number, y: number) => {
    if (phase !== 'dowse') return
    markers.push({ x: clamp(x, CLOTH.x, CLOTH.x + CLOTH.w), y: clamp(y, CLOTH.y, CLOTH.y + CLOTH.h), kind, verdict: null })
    if (markers.length > MAX_MARKS) markers.shift()
    state('mark')
  }

  const lift = () => {
    if (phase !== 'dowse') return
    phase = 'lifted'
    carries.clear()
    touch = null
    finger = null
    lifts++
    const taken = new Set<number>()
    let right = 0
    let wrong = 0
    for (const m of markers) {
      let best = -1
      let bestD = MATCH_R
      items.forEach((it, i) => {
        if (taken.has(i) || it.kind !== m.kind) return
        const d = Math.hypot(it.x - m.x, it.y - m.y)
        if (d < bestD) {
          best = i
          bestD = d
        }
      })
      if (best >= 0) {
        taken.add(best)
        items[best]!.found = true
        m.verdict = 'ok'
        right++
      } else {
        m.verdict = 'wrong'
        wrong++
      }
    }
    correct += right
    verdict = markers.length === 0 ? 'none' : right === items.length && wrong === 0 ? 'clean' : right > 0 ? 'partial' : 'wrong'
    state('lift')
    if (hooks.has('score') && right > 0) {
      score += right
      emit({ kind: 'hook', name: 'score' })
    }
    if (hooks.has('level') && verdict === 'clean' && level < MAX_LEVEL) {
      level++
      emit({ kind: 'hook', name: 'level' })
    }
  }

  // A finger left the glass (or a second down on the same id replaced it).
  const release = (id: number, x: number | null, y: number | null) => {
    const c = carries.get(id)
    if (c) {
      carries.delete(id)
      const px = x ?? c.x
      const py = y ?? c.y
      if (inRect(CLOTH, px, py)) place(c.kind, px, py)
      else if (c.fromMarker) state('unmark')
    }
    if (touch && touch.id === id) {
      const t = touch
      touch = null
      finger = null
      const far = x !== null && y !== null && Math.hypot(x - t.startX, y - t.startY) > TAP_MOVE
      if (!t.moved && !far && tick - t.downTick <= TAP_TICKS) flip()
    }
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase: ph, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (ph === 'down') {
      if (!finite) return
      release(id, null, null)
      if (inRect(LIFT_BTN, x, y)) {
        if (phase === 'lifted') newCloth()
        else lift()
        return
      }
      if (phase === 'lifted') return
      if (inRect(POLE_BTN, x, y)) {
        flip()
        return
      }
      const slot = TOKEN_SLOTS.findIndex((r) => inRect(r, x, y))
      if (slot >= 0) {
        carries.set(id, { kind: slot as Kind, x, y, fromMarker: false })
        state('take')
        return
      }
      let pick = -1
      let pickD = MARK_HIT
      markers.forEach((m, i) => {
        const d = Math.hypot(m.x - x, m.y - y)
        if (d <= pickD) {
          pick = i
          pickD = d
        }
      })
      if (pick >= 0) {
        const m = markers.splice(pick, 1)[0]!
        carries.set(id, { kind: m.kind, x, y, fromMarker: true })
        state('take')
        return
      }
      if (inRect(CLOTH, x, y) && touch === null) {
        touch = { id, startX: x, startY: y, downTick: tick, moved: false }
        finger = { x: clamp(x, CLOTH.x + HAND_MARGIN, CLOTH.x + CLOTH.w - HAND_MARGIN), y: clamp(y, CLOTH.y + HAND_MARGIN, CLOTH.y + CLOTH.h - HAND_MARGIN) }
      }
      return
    }
    const c = carries.get(id)
    if (c && finite) {
      c.x = x
      c.y = y
    }
    if (touch && touch.id === id && finite) {
      finger = { x: clamp(x, CLOTH.x + HAND_MARGIN, CLOTH.x + CLOTH.w - HAND_MARGIN), y: clamp(y, CLOTH.y + HAND_MARGIN, CLOTH.y + CLOTH.h - HAND_MARGIN) }
      if (Math.hypot(x - touch.startX, y - touch.startY) > TAP_MOVE) touch.moved = true
    }
    if (ph === 'up') release(id, finite ? x : null, finite ? y : null)
  }

  // ---- the world ------------------------------------------------------------

  const moveHand = () => {
    if (snapped >= 0) {
      const it = items[snapped]!
      if (finger && Math.hypot(finger.x - it.x, finger.y - it.y) > BREAK_R) {
        ignore = snapped
        snapped = -1
        state('tear-free')
      } else {
        hx = it.x
        hy = it.y
      }
    }
    if (snapped < 0) {
      let ax = 0
      let ay = 0
      for (const it of items) {
        let dx = it.x - hx
        let dy = it.y - hy
        let d = Math.hypot(dx, dy)
        if (d >= HAND_REACH) continue
        if (d < 0.5) {
          dx = 0.5
          dy = 0
          d = 0.5
        }
        const a = coupling(it.kind, pole) * HAND_PULL * (1 - d / HAND_REACH)
        ax += (a * dx) / d
        ay += (a * dy) / d
      }
      if (finger) {
        hvx = (hvx + (finger.x - hx) * SPRING + ax) * 0.7
        hvy = (hvy + (finger.y - hy) * SPRING + ay) * 0.7
      } else {
        hvx = (hvx + ax * FREE) * 0.88
        hvy = (hvy + ay * FREE) * 0.88
      }
      hx = clamp(hx + hvx, CLOTH.x + HAND_MARGIN, CLOTH.x + CLOTH.w - HAND_MARGIN)
      hy = clamp(hy + hvy, CLOTH.y + HAND_MARGIN, CLOTH.y + CLOTH.h - HAND_MARGIN)
      for (let i = 0; i < items.length; i++) {
        const it = items[i]!
        const d = Math.hypot(it.x - hx, it.y - hy)
        if (i === ignore) {
          if (d > 60) ignore = -1
        } else if (d < SNAP_R && coupling(it.kind, pole) > 0) {
          snapped = i
          hvx = 0
          hvy = 0
          hx = it.x
          hy = it.y
          state('snap')
          break
        }
      }
    }
    // What the child has probed: things met under each pole, cloth passed over.
    items.forEach((it, i) => {
      if (Math.hypot(it.x - hx, it.y - hy) < TEST_R) mask[i] = mask[i]! | (pole === 1 ? 1 : 2)
    })
    if (Math.hypot(hx - lastSweepX, hy - lastSweepY) >= 1) {
      lastSweepX = hx
      lastSweepY = hy
      for (let cy = 0; cy < GY; cy++) {
        for (let cx = 0; cx < GX; cx++) {
          const i = cy * GX + cx
          if (sweptCells[i]) continue
          const px = CLOTH.x + ((cx + 0.5) * CLOTH.w) / GX
          const py = CLOTH.y + ((cy + 0.5) * CLOTH.h) / GY
          if (Math.hypot(px - hx, py - hy) <= SWEEP_R) {
            sweptCells[i] = true
            sweptCount++
          }
        }
      }
    }
  }

  const moveBeads = () => {
    for (let b = 0; b < BEADS; b++) {
      let vx = bvx[b]!
      let vy = bvy[b]!
      const x = bx[b]!
      const y = by[b]!
      const w = 1 - Math.hypot(x - hx, y - hy) / ZONE
      if (w > 0) {
        for (const it of items) {
          const c = coupling(it.kind, pole)
          let dx = it.x - x
          let dy = it.y - y
          let d = Math.hypot(dx, dy)
          if (c > 0) {
            if (d >= it.range) continue
            // Clump: slide to a private spot around the thing, slowing in.
            const tx = it.x + box[b]! - x
            const ty = it.y + boy[b]! - y
            const td = Math.hypot(tx, ty)
            if (td < 0.5) continue
            const a = c * BEAD_PUSH * w * (1 - d / it.range + 0.1) * Math.min(1, td / 40)
            vx += (a * tx) / td
            vy += (a * ty) / td
          } else {
            const reach = it.range * bjit[b]!
            if (d >= reach) continue
            // Ring: pushed out until the force runs out at the bead's own radius.
            if (d < 1) {
              dx = -Math.cos(bang[b]!)
              dy = -Math.sin(bang[b]!)
              d = 1
            }
            const a = -c * BEAD_PUSH * w * (1 - d / reach)
            vx -= (a * dx) / d
            vy -= (a * dy) / d
          }
        }
      }
      vx *= BEAD_FRICTION
      vy *= BEAD_FRICTION
      if (Math.abs(vx) < 0.02) vx = 0
      if (Math.abs(vy) < 0.02) vy = 0
      bvx[b] = vx
      bvy[b] = vy
      bx[b] = clamp(x + vx, CLOTH.x + 8, CLOTH.x + CLOTH.w - 8)
      by[b] = clamp(y + vy, CLOTH.y + 8, CLOTH.y + CLOTH.h - 8)
    }
  }

  const step = () => {
    tick++
    idleTicks++
    if (phase !== 'dowse') return
    moveHand()
    moveBeads()
  }

  // ---- reading the world --------------------------------------------------------

  const reading = (): string => {
    if (snapped >= 0) return 'snap'
    let pull = false
    let push = false
    for (const it of items) {
      if (Math.hypot(it.x - hx, it.y - hy) >= READ_R) continue
      if (coupling(it.kind, pole) > 0) pull = true
      else push = true
    }
    return pull && push ? 'mixed' : pull ? 'clump' : push ? 'ring' : 'none'
  }

  // Affordances: what a child could be drawn to, as top-left rectangles.
  const affordances = (): Affordance[] => {
    if (phase === 'lifted') return [{ ...LIFT_BTN, kind: 'tap', salience: 0.8 }]
    const list: Affordance[] = [
      { ...boxAt(hx, hy, 120, 120), kind: 'drag', salience: 0.6 },
      { ...CLOTH, kind: 'drag', salience: 0.3 },
      { ...POLE_BTN, kind: 'tap', salience: 0.5 },
      // Peeking with no guess down is a give-up move: it draws the eye least.
      { ...LIFT_BTN, kind: 'tap', salience: markers.length === 0 ? 0.08 : 0.3 + 0.1 * Math.min(4, markers.length) },
    ]
    for (const slot of TOKEN_SLOTS) list.push({ ...slot, kind: 'drag', salience: 0.4 })
    for (const m of markers) list.push({ ...boxAt(m.x, m.y, 72, 72), kind: 'drag', salience: 0.3 })
    return list
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    const layoutClass = twin ? 'twin' : 'plain'
    const signature =
      phase === 'lifted'
        ? `lifted/${verdict}/${layoutClass}`
        : `dowse/${pole === 1 ? 'N' : 'S'}/${reading()}/${layoutClass}/${markers.length > 0 ? 'marked' : 'bare'}`
    const tested = items.length === 0 ? 0 : items.filter((_, i) => mask[i] === 3).length / items.length
    return {
      signature,
      features: { correct, swept: sweptCount / (GX * GY), tested, marks: markers.length, lifts },
      events,
    }
  }

  // Off with hints off. Only data for the view; it never changes the world.
  const hint = (): { x: number; y: number } | null => {
    if (!config.hints || idleTicks < HINT_AFTER) return null
    if (phase === 'lifted') return centre(LIFT_BTN)
    if (markers.length > 0) return centre(LIFT_BTN)
    if (!flippedHere && mask.some((m) => m !== 0)) return centre(POLE_BTN)
    return { x: hx, y: hy }
  }

  const snapshot = (): ClothSnapshot => {
    const beads: number[] = []
    for (let b = 0; b < BEADS; b++) beads.push(bx[b]!, by[b]!)
    return {
      tick,
      phase,
      revealed: phase === 'lifted',
      pole,
      hand: { x: hx, y: hy, snapped: snapped >= 0, zone: ZONE },
      finger: finger ? { ...finger } : null,
      beads,
      items: items.map((it) => ({ ...it })),
      twin,
      markers: markers.map((m) => ({ ...m })),
      carrying: [...carries.values()].map((c) => ({ x: c.x, y: c.y, kind: c.kind })),
      verdict,
      cloth,
      level,
      correct,
      score: hooks.has('score') ? score : null,
      hint: hint(),
    }
  }

  return { step, pointer, affordances, observe, snapshot }
}
