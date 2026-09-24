// The example sim: Balloon Basket. Three balloons drift down slowly. Tap one to
// keep it up, drag one into the basket, hold the pump to lift them all.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now,
// or performance.now. It reads a seeded rng and counts ticks, nothing else.
// Every part of the sim contract shows up once, marked (contract) below.

import { between, createRng } from '../rng.ts'
import { FIELD_H, FIELD_W } from '../sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// Field furniture, in logical coordinates. Rect x and y are the top-left
// corner, like canvas fillRect.
export const BASKET: Rect = { x: 780, y: 640, w: 360, h: 140 }
export const PUMP: Rect = { x: 60, y: 640, w: 200, h: 140 }

const COLORS = ['#e4572e', '#3b82c4', '#f2b134', '#3fa66b']
const BALL_R = 56
const STOWED_R = 34
// A child's finger is not a pixel: the hit-test forgives this much. It is the
// sim's own, and personas go through it like everyone else.
const HIT_SLOP = 20
// Less than this between finger down and finger up is a tap, not a drag.
const TAP_MOVE = 24
const GRAVITY = 0.3
const MAX_FALL = 4
const KICK = 12
const PUMP_LIFT = 0.9
const MAX_RISE = 9
const HINT_AFTER_TICKS = 150
// The browser view never calls observe(), so the queue must not grow forever.
const MAX_EVENTS = 64
const UNLOCK_AT = 3

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  color: string
  stowed: boolean
  // The pointer id carrying it, or null.
  heldBy: number | null
}

interface Grab {
  ball: number
  startX: number
  startY: number
  lastX: number
  lastY: number
}

// Plain data the view draws from (contract: snapshot).
export interface ExampleSnapshot {
  tick: number
  balls: Array<{ x: number; y: number; r: number; color: string; held: boolean; stowed: boolean }>
  basket: Rect
  pump: Rect
  pumping: boolean
  // Null when the score hook is removed.
  score: number | null
  // Where the idle hint points, or null. Only ever set when config.hints is on.
  hint: { x: number; y: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inside = (rect: Rect, x: number, y: number) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h

export const createSim: CreateSim<ExampleSnapshot> = (config): Sim<ExampleSnapshot> => {
  const rng = createRng(config.seed)
  // (contract: hooks) Each hook is honoured only when it is in this list, so
  // an empty list means no hook events and no hook behaviour, and each one can
  // be removed alone.
  const hooks = new Set(config.hooks)

  const balls: Ball[] = COLORS.slice(0, 3).map((color, i) => ({
    x: 400 + i * 250 + between(rng, -50, 50),
    y: between(rng, 120, 300),
    vx: between(rng, -1, 1),
    vy: 0,
    r: BALL_R,
    color,
    stowed: false,
    heldBy: null,
  }))
  const grabs = new Map<number, Grab>()
  const pumpers = new Set<number>()
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0
  let score = 0
  let unlocked = false

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  const stowedCount = () => balls.filter((b) => b.stowed).length

  const layoutBasket = () => {
    let slot = 0
    for (const b of balls) {
      if (!b.stowed) continue
      b.x = BASKET.x + 45 + slot * 90
      b.y = BASKET.y + BASKET.h - STOWED_R - 8
      slot++
    }
  }

  const moveBall = (b: Ball, x: number, y: number) => {
    b.x = clamp(x, b.r, FIELD_W - b.r)
    b.y = clamp(y, b.r, FIELD_H - b.r)
    b.vx = 0
    b.vy = 0
  }

  // The sim's own hit-test: the nearest balloon within its radius plus slop.
  const hit = (x: number, y: number): number => {
    let best = -1
    let bestDistance = Infinity
    balls.forEach((b, i) => {
      if (b.heldBy !== null) return
      const d = Math.hypot(x - b.x, y - b.y)
      if (d <= b.r + HIT_SLOP && d < bestDistance) {
        best = i
        bestDistance = d
      }
    })
    return best
  }

  const grab = (id: number, index: number, x: number, y: number) => {
    const b = balls[index]!
    if (b.stowed) {
      b.stowed = false
      b.r = BALL_R
      layoutBasket()
    }
    b.heldBy = id
    b.vx = 0
    b.vy = 0
    grabs.set(id, { ball: index, startX: x, startY: y, lastX: x, lastY: y })
    emit({ kind: 'state', name: 'grab' })
  }

  const stow = (b: Ball) => {
    b.stowed = true
    b.r = STOWED_R
    b.vx = 0
    b.vy = 0
    layoutBasket()
    emit({ kind: 'state', name: 'stow' })
    if (hooks.has('score')) {
      score++
      emit({ kind: 'hook', name: 'score' })
    }
    if (hooks.has('unlock') && !unlocked && stowedCount() >= UNLOCK_AT) {
      unlocked = true
      balls.push({ x: FIELD_W / 2, y: 80, vx: 0, vy: 0, r: BALL_R, color: COLORS[3]!, stowed: false, heldBy: null })
      emit({ kind: 'hook', name: 'unlock' })
    }
  }

  // A finger lifted (or replaced by a second down on the same id).
  const release = (id: number) => {
    pumpers.delete(id)
    const g = grabs.get(id)
    if (!g) return
    grabs.delete(id)
    const b = balls[g.ball]!
    b.heldBy = null
    if (Math.hypot(g.lastX - g.startX, g.lastY - g.startY) < TAP_MOVE) {
      // A tap: keep it up.
      b.vy = -KICK
      b.vx = between(rng, -3, 3)
      emit({ kind: 'state', name: 'kick' })
    } else if (inside(BASKET, b.x, b.y)) {
      stow(b)
    }
    // Otherwise it was dropped where it is, and simply starts to fall.
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (phase === 'down') {
      if (!finite) return
      release(id)
      const index = hit(x, y)
      if (index >= 0) grab(id, index, x, y)
      else if (inside(PUMP, x, y)) {
        pumpers.add(id)
        emit({ kind: 'state', name: 'pump' })
      }
      return
    }
    const g = grabs.get(id)
    if (g && finite) {
      moveBall(balls[g.ball]!, x, y)
      g.lastX = x
      g.lastY = y
    }
    if (phase === 'up') release(id)
  }

  // (contract: step) One fixed tick.
  const step = () => {
    tick++
    idleTicks++
    const pumping = pumpers.size > 0
    for (const b of balls) {
      if (b.heldBy !== null || b.stowed) continue
      b.vy = clamp(b.vy + GRAVITY, -MAX_RISE, MAX_FALL)
      if (pumping) b.vy = Math.max(-MAX_RISE, b.vy - PUMP_LIFT)
      b.vx *= 0.985
      b.x += b.vx
      b.y += b.vy
      if (b.x < b.r) {
        b.x = b.r
        b.vx = -b.vx * 0.5
      } else if (b.x > FIELD_W - b.r) {
        b.x = FIELD_W - b.r
        b.vx = -b.vx * 0.5
      }
      if (b.y < b.r) {
        b.y = b.r
        b.vy = 0
      } else if (b.y > FIELD_H - b.r) {
        b.y = FIELD_H - b.r
        b.vy = Math.abs(b.vy) < 0.8 ? 0 : -b.vy * 0.4
      }
    }
  }

  // (contract: affordances) What a child could be drawn to, as top-left
  // rectangles inside the field. A tap also works on a free balloon; "drag" is
  // the gesture that finishes the job. Reading this changes nothing.
  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    for (const b of balls) {
      if (b.heldBy !== null) continue
      list.push({
        x: b.x - b.r,
        y: b.y - b.r,
        w: b.r * 2,
        h: b.r * 2,
        kind: b.stowed ? 'tap' : 'drag',
        // A low balloon is about to land: it draws the eye.
        salience: b.stowed ? 0.25 : 0.4 + 0.5 * (b.y / FIELD_H),
      })
    }
    list.push({ ...PUMP, kind: 'hold', salience: 0.3 })
    return list
  }

  // (contract: observe) A discrete outcome class, a few named features, and
  // the events since the last call. The signature names a class, never a
  // coordinate or a count: 3 modes x 3 basket states x 2 world sizes = 18.
  const observe = (): Observation => {
    const events = pending
    pending = []
    const mode = grabs.size > 0 ? 'carry' : pumpers.size > 0 ? 'pump' : 'drift'
    const stowed = stowedCount()
    const basket = stowed === 0 ? 'empty' : stowed === balls.length ? 'all' : 'some'
    const free = balls.filter((b) => !b.stowed)
    const height = free.length === 0 ? 0 : free.reduce((sum, b) => sum + (1 - b.y / FIELD_H), 0) / free.length
    return {
      signature: `${mode}/${basket}/${unlocked ? 'four' : 'three'}`,
      features: { stowed, height, held: grabs.size },
      events,
    }
  }

  // (contract: hints) Off by default for return and self-aim runs. The hint is
  // only data for the view; it never changes what the sim does.
  const hint = (): { x: number; y: number } | null => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS) return null
    let lowest: Ball | null = null
    for (const b of balls) {
      if (b.stowed || b.heldBy !== null) continue
      if (lowest === null || b.y > lowest.y) lowest = b
    }
    return lowest ? { x: lowest.x, y: lowest.y } : null
  }

  const snapshot = (): ExampleSnapshot => ({
    tick,
    balls: balls.map((b) => ({ x: b.x, y: b.y, r: b.r, color: b.color, held: b.heldBy !== null, stowed: b.stowed })),
    basket: { ...BASKET },
    pump: { ...PUMP },
    pumping: pumpers.size > 0,
    score: hooks.has('score') ? score : null,
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
