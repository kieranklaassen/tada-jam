// Dawdle Parade. Drag a mother duck across a meadow; three ducklings trail her,
// each by its own habit, so the line stretches, snarls, and reforms.
//
//   dawdler   follows the mother's trail but stops at any flower it walks over
//   cutter    follows the mother's trail but jumps one place up the line on
//             any bend, and hops over a dawdler who has just stopped
//   follower  follows only the duckling directly ahead of it (its trail, not the
//             mother's), so it waits when that one waits and copies its shortcuts
//
// The line is a discrete order (front to back). Slot k walks (k + 1) * GAP behind
// the mother, except the follower, who walks GAP behind whoever is ahead. Four
// things reorder it:
//   a bend      the cutter moves up a place and bumps the duckling it barges
//               past, who freezes for a moment (the follower waits behind it)
//   a U-turn    a hairpin flips the whole line: the last becomes first
//   a stop      the dawdler stopping lets a cutter behind it hop in front
//   a rest      after a walk and a pause, the last duckling runs to the front
// Everything else is walking.
//
// Pure and deterministic: no DOM, no Vite globals, no clocks. It reads a seeded
// rng and counts ticks, nothing else.

import { between, createRng, int } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export const KINDS = ['dawdler', 'cutter', 'follower'] as const
export type Kind = (typeof KINDS)[number]
const DAWDLER = 0
const CUTTER = 1
const FOLLOWER = 2
const LETTERS = 'DCF'

// Distances are logical pixels, speeds are pixels per tick (33 ms).
export const GAP = 64
export const STALL_R = 56
export const POND_R = 120
export const SHORE = 205
export const REST_TICKS = 90
export const HOME_TICKS = 100
const MOTHER_R = 44
const MOTHER_V = 8
const DUCK_V = 10
const HURRY_V = 13
const DASH_V = 15
const DASH_TICKS = 16
const TRAIL_STEP = 4
const TRAIL_MAX = 240
const HISTORY = 64
const REARM_R = 130
const STALL_MIN = 90
const STALL_SPAN = 45
const BEND = 0.45
const BEND_CHORD = 60
const BEND_COOLDOWN = 40
const BEND_WATCH = 12
const UTURN = 2.3
const BUMP_TICKS = 26
const TIGHT = 260
const STRUNG = 420
const SNARL = 40
const HINT_AFTER = 150
const MAX_EVENTS = 64

interface Pt {
  x: number
  y: number
}

// Where a body has been, oldest first, sampled every few pixels.
interface Trail {
  x: number[]
  y: number[]
}

interface Duck extends Pt {
  trail: Trail
  dash: number
  peep: number
  bump: number
}

interface Flower extends Pt {
  armed: boolean
}

export interface DawdleSnapshot {
  tick: number
  phase: 'walk' | 'home'
  round: number
  mother: Pt
  goal: Pt
  // Indexed by duckling id: 0 dawdler, 1 cutter, 2 follower.
  ducklings: Array<{ id: number; kind: Kind; x: number; y: number; stalled: boolean; hurrying: boolean; dashing: boolean; peeping: boolean; bumped: boolean }>
  // Duckling ids, front to back.
  line: number[]
  flowers: Array<{ x: number; y: number; armed: boolean }>
  // Null when the pond hook is removed.
  pond: Pt | null
  inPond: number
  // Where the idle hint points, or null. Only ever set when config.hints is on.
  hint: { from: Pt; to: Pt } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const gap = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

function makeTrail(x: number, y: number, dir: number): Trail {
  const t: Trail = { x: [], y: [] }
  for (let i = HISTORY; i >= 0; i--) {
    t.x.push(x + dir * TRAIL_STEP * i)
    t.y.push(y)
  }
  return t
}

function extend(t: Trail, x: number, y: number): void {
  const n = t.x.length
  if (Math.hypot(x - t.x[n - 1]!, y - t.y[n - 1]!) < TRAIL_STEP) return
  t.x.push(x)
  t.y.push(y)
  if (n > TRAIL_MAX) {
    t.x.splice(0, 40)
    t.y.splice(0, 40)
  }
}

// The spot `dist` pixels back along a trail from a body standing at (hx, hy).
function pointBack(t: Trail, hx: number, hy: number, dist: number): Pt {
  let px = hx
  let py = hy
  let left = dist
  for (let i = t.x.length - 1; i >= 0; i--) {
    const dx = t.x[i]! - px
    const dy = t.y[i]! - py
    const seg = Math.hypot(dx, dy)
    if (seg >= left) {
      const f = seg === 0 ? 0 : left / seg
      return { x: px + dx * f, y: py + dy * f }
    }
    left -= seg
    px = t.x[i]!
    py = t.y[i]!
  }
  return { x: px, y: py }
}

function approach(p: Pt, t: Pt, speed: number): void {
  const dx = t.x - p.x
  const dy = t.y - p.y
  const d = Math.hypot(dx, dy)
  if (d < 0.01) return
  const s = Math.min(speed, d)
  p.x += (dx / d) * s
  p.y += (dy / d) * s
}

// A tappable box centred on a thing, kept inside the field.
function box(cx: number, cy: number, half: number): Pick<Affordance, 'x' | 'y' | 'w' | 'h'> {
  return { x: clamp(cx - half, 0, FIELD_W - 2 * half), y: clamp(cy - half, 0, FIELD_H - 2 * half), w: 2 * half, h: 2 * half }
}

export const createSim: CreateSim<DawdleSnapshot> = (config): Sim<DawdleSnapshot> => {
  const rng = createRng(config.seed)
  // Each hook is honoured only when it is in this list.
  const hooks = new Set(config.hooks)
  const pondOn = hooks.has('pond')

  const mother = { x: 0, y: 0, trail: makeTrail(0, 0, -1) }
  const ducks: Duck[] = [0, 1, 2].map(() => ({ x: 0, y: 0, trail: makeTrail(0, 0, -1), dash: 0, peep: 0, bump: 0 }))
  let goal: Pt = { x: 0, y: 0 }
  let line: number[] = [0, 1, 2]
  let flowers: Flower[] = []
  let pond: Pt = { x: 0, y: 0 }
  let phase: 'walk' | 'home' = 'walk'
  let round = 0
  let homeLeft = 0
  let stallLeft = 0
  let hurry = false
  let bendCool = 0
  let bendWatch = 0
  let bendPeak = 0
  let restTicks = 0
  let armedRest = false
  let active: number | null = null
  let pending: SimEvent[] = []
  let tick = 0
  let idle = 0
  let together = 0
  let hops = 0
  let stalls = 0

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  // Lay out a fresh meadow around where the mother stands: the parade forms up
  // behind her on the side away from the pond, in a seeded order.
  const startMeadow = (mx: number, my: number) => {
    const left = mx < FIELD_W / 2
    const dir = left ? -1 : 1
    mother.x = left ? clamp(mx, 260, 380) : clamp(mx, 800, 900)
    mother.y = clamp(my, 230, 590)
    mother.trail = makeTrail(mother.x, mother.y, dir)
    goal = { x: mother.x, y: mother.y }

    const order = [0, 1, 2]
    for (let i = 2; i > 0; i--) {
      const j = int(rng, 0, i)
      const held = order[i]!
      order[i] = order[j]!
      order[j] = held
    }
    line = order
    line.forEach((id, slot) => {
      const d = ducks[id]!
      d.x = mother.x + dir * GAP * (slot + 1)
      d.y = mother.y
      d.trail = makeTrail(d.x, d.y, dir)
      d.dash = 0
      d.peep = 0
      d.bump = 0
    })

    // The pond is always laid out (so a meadow looks the same with or without
    // the hook); only the pond hook uses it.
    pond = { x: left ? between(rng, 830, 1030) : between(rng, 150, 350), y: between(rng, 200, 620) }
    const count = Math.min(4 + round, 7)
    flowers = []
    // One flower sits on the straight way to the pond: the first thing to learn.
    const nx = pond.x - mother.x
    const ny = pond.y - mother.y
    const len = Math.hypot(nx, ny)
    const along = between(rng, 0.4, 0.6)
    const off = between(rng, -30, 30)
    flowers.push({ x: mother.x + nx * along - (ny / len) * off, y: mother.y + ny * along + (nx / len) * off, armed: true })
    const rowClear = (p: Pt) => [0, 60, 120, 180, 240].every((k) => gap(p, { x: mother.x + dir * k, y: mother.y }) >= 110)
    for (let i = 1; i < count; i++) {
      let spot: Pt = { x: 600, y: 400 }
      for (let tries = 0; tries < 30; tries++) {
        spot = { x: between(rng, 130, 1050), y: between(rng, 110, 710) }
        if (rowClear(spot) && gap(spot, pond) >= 170 && flowers.every((f) => gap(spot, f) >= 150)) break
      }
      flowers.push({ x: spot.x, y: spot.y, armed: true })
    }
    stallLeft = 0
    hurry = false
    bendCool = 0
    bendWatch = 0
    restTicks = 0
    armedRest = false
  }
  startMeadow(between(rng, 260, 380), between(rng, 230, 590))

  const spreadPx = () => ducks.reduce((m, d) => Math.max(m, gap(d, mother)), 0)
  const inPond = () => (pondOn ? ducks.filter((d) => gap(d, pond) <= SHORE).length : 0)

  const pointer = (input: PointerInput) => {
    idle = 0
    const { id, phase: gesture, x, y } = input
    if (!Number.isFinite(x) || !Number.isFinite(y) || phase === 'home') return
    const setGoal = () => {
      goal = { x: clamp(x, MOTHER_R, FIELD_W - MOTHER_R), y: clamp(y, MOTHER_R, FIELD_H - MOTHER_R) }
    }
    if (gesture === 'down') {
      active = id
      setGoal()
      emit({ kind: 'state', name: 'walk' })
      const near = ducks.findIndex((d) => gap(d, { x, y }) <= 44)
      if (near >= 0) {
        ducks[near]!.peep = 12
        emit({ kind: 'state', name: 'peep' })
      }
    } else if (id === active) {
      setGoal()
      if (gesture === 'up') active = null
    }
  }

  const bendAngle = (): number => {
    const b = pointBack(mother.trail, mother.x, mother.y, BEND_CHORD)
    const a = pointBack(mother.trail, mother.x, mother.y, BEND_CHORD * 2)
    const v1x = b.x - a.x
    const v1y = b.y - a.y
    const v2x = mother.x - b.x
    const v2y = mother.y - b.y
    const l1 = Math.hypot(v1x, v1y)
    const l2 = Math.hypot(v2x, v2y)
    if (l1 < 30 || l2 < 30) return 0
    return Math.acos(clamp((v1x * v2x + v1y * v2y) / (l1 * l2), -1, 1))
  }

  // The cutter moves up to `toSlot`. Barging past a duckling on a bend bumps it.
  const cutterHop = (toSlot: number, barge: boolean) => {
    const from = line.indexOf(CUTTER)
    if (toSlot < 0 || from <= toSlot) return
    const jumped = ducks[line[toSlot]!]!
    line.splice(from, 1)
    line.splice(toSlot, 0, CUTTER)
    ducks[CUTTER]!.dash = DASH_TICKS
    hops++
    emit({ kind: 'state', name: 'hop' })
    if (barge && !(line[toSlot + 1] === DAWDLER && stallLeft > 0)) {
      jumped.bump = BUMP_TICKS
      emit({ kind: 'state', name: 'bump' })
    }
  }

  // A hairpin turn: the line doubles back, so the last duckling is now first.
  const turnAround = () => {
    line.reverse()
    for (const d of ducks) d.dash = DASH_TICKS
    emit({ kind: 'state', name: 'uturn' })
  }

  const startStall = (flower: Flower) => {
    flower.armed = false
    stallLeft = STALL_MIN + int(rng, 0, STALL_SPAN)
    hurry = false
    stalls++
    emit({ kind: 'state', name: 'dawdle' })
    // A cutter behind the dawdler slips in front of it; the follower cannot.
    cutterHop(line.indexOf(DAWDLER), false)
  }

  const nextMeadow = () => {
    round++
    startMeadow(mother.x, mother.y)
    phase = 'walk'
    emit({ kind: 'state', name: 'meadow' })
  }

  // The spot slot `slot` is walking toward, for duckling `id`.
  const targetFor = (slot: number, id: number): Pt => {
    if (id === FOLLOWER && slot > 0) {
      const ahead = ducks[line[slot - 1]!]!
      return pointBack(ahead.trail, ahead.x, ahead.y, GAP)
    }
    return pointBack(mother.trail, mother.x, mother.y, GAP * (slot + 1))
  }

  const step = () => {
    tick++
    idle++
    for (const d of ducks) if (d.peep > 0) d.peep--
    if (phase === 'home') {
      if (--homeLeft <= 0) nextMeadow()
      return
    }

    // The mother walks toward the finger at a steady pace.
    const gx = goal.x - mother.x
    const gy = goal.y - mother.y
    const gd = Math.hypot(gx, gy)
    let moved = 0
    if (gd > 0.5) {
      moved = Math.min(MOTHER_V, gd)
      mother.x += (gx / gd) * moved
      mother.y += (gy / gd) * moved
      extend(mother.trail, mother.x, mother.y)
      restTicks = 0
      armedRest = true
    } else if (armedRest && stallLeft === 0 && ++restTicks >= REST_TICKS) {
      // A rest: the last duckling runs up to the front.
      const last = line.pop()!
      line.unshift(last)
      ducks[last]!.dash = DASH_TICKS
      armedRest = false
      restTicks = 0
      emit({ kind: 'state', name: 'shuffle' })
    }

    // A bend is judged at its sharpest: a hairpin flips the line, anything
    // gentler lets the cutter barge up a place.
    if (bendWatch > 0) {
      bendPeak = Math.max(bendPeak, bendAngle())
      if (--bendWatch === 0) {
        bendCool = BEND_COOLDOWN
        if (bendPeak >= UTURN) turnAround()
        else cutterHop(line.indexOf(CUTTER) - 1, true)
      }
    } else if (bendCool > 0) bendCool--
    else if (moved > 0) {
      const angle = bendAngle()
      if (angle >= BEND) {
        bendWatch = BEND_WATCH
        bendPeak = angle
      }
    }

    // Front to back, so a follower reads its leader's new spot.
    for (const id of line.slice()) {
      const d = ducks[id]!
      const dashing = d.dash > 0
      if (dashing) d.dash--
      if (d.bump > 0) {
        d.bump--
        continue
      }
      if (id === DAWDLER && stallLeft > 0) {
        if (--stallLeft === 0) {
          hurry = true
          emit({ kind: 'state', name: 'resume' })
        }
        continue
      }
      const target = targetFor(line.indexOf(id), id)
      approach(d, target, dashing ? DASH_V : id === DAWDLER && hurry ? HURRY_V : DUCK_V)
      extend(d.trail, d.x, d.y)
      if (id === DAWDLER) {
        if (hurry && gap(d, target) < 20) hurry = false
        for (const f of flowers) {
          const away = gap(d, f)
          if (away > REARM_R) f.armed = true
          else if (f.armed && away < STALL_R && stallLeft === 0) startStall(f)
        }
      }
    }

    if (moved > 0 && stallLeft === 0 && spreadPx() <= TIGHT) together += moved / 100

    if (pondOn && inPond() === 3) {
      phase = 'home'
      homeLeft = HOME_TICKS
      emit({ kind: 'state', name: 'home' })
      emit({ kind: 'hook', name: 'pond' })
    }
  }

  const affordances = (): Affordance[] => {
    const list: Affordance[] = [{ ...box(mother.x, mother.y, 42), kind: 'drag', salience: 0.9 }]
    if (phase === 'home') return list
    for (const d of ducks) list.push({ ...box(d.x, d.y, 30), kind: 'tap', salience: 0.35 })
    for (const f of flowers) list.push({ ...box(f.x, f.y, 40), kind: 'tap', salience: f.armed ? 0.3 : 0.15 })
    if (pondOn) list.push({ ...box(pond.x, pond.y, POND_R), kind: 'tap', salience: 0.6 })
    return list
  }

  const shape = (): string => {
    const dashing = ducks.some((d) => d.dash > 0)
    let closest = Infinity
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) closest = Math.min(closest, gap(ducks[i]!, ducks[j]!))
    if (dashing || closest < SNARL) return 'snarl'
    const spread = spreadPx()
    return spread > STRUNG ? 'strung' : spread > TIGHT ? 'loose' : 'tight'
  }

  // The signature names where the parade has ended up: who leads, how the line
  // hangs together, and whether the dawdler is stopped. Never a coordinate.
  const observe = (): Observation => {
    const events = pending
    pending = []
    const order = line.map((id) => LETTERS[id]).join('')
    const signature = phase === 'home' ? 'home' : `${order}-${shape()}${stallLeft > 0 ? '-dawdle' : ''}`
    return {
      signature,
      features: {
        together,
        spread: spreadPx() / 100,
        dawdling: stallLeft > 0 ? 1 : 0,
        cutter_place: line.indexOf(CUTTER),
        home: inPond(),
        hops,
        stalls,
      },
      events,
    }
  }

  // An idle demonstration: a ghost of the walk to the pond (or across the meadow).
  const hint = (): DawdleSnapshot['hint'] => {
    if (!config.hints || idle < HINT_AFTER || phase === 'home') return null
    const to = pondOn ? pond : { x: clamp(mother.x + (mother.x < FIELD_W / 2 ? 320 : -320), 100, FIELD_W - 100), y: mother.y }
    return { from: { x: mother.x, y: mother.y }, to: { x: to.x, y: to.y } }
  }

  const snapshot = (): DawdleSnapshot => ({
    tick,
    phase,
    round,
    mother: { x: mother.x, y: mother.y },
    goal: { ...goal },
    ducklings: ducks.map((d, id) => ({
      id,
      kind: KINDS[id]!,
      x: d.x,
      y: d.y,
      stalled: id === DAWDLER && stallLeft > 0,
      hurrying: id === DAWDLER && hurry,
      dashing: d.dash > 0,
      peeping: d.peep > 0,
      bumped: d.bump > 0,
    })),
    line: line.slice(),
    flowers: flowers.map((f) => ({ x: f.x, y: f.y, armed: f.armed })),
    pond: pondOn ? { ...pond } : null,
    inPond: inPond(),
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
