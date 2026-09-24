// Sideways Rain Day. Rain falls slanted, and gusts sway it in beats. The child
// holds a leaf over damp creatures; a creature the drops miss relaxes, and one
// the drops hit does not. The day (slant, gust rhythm, rain, visitors) comes
// from the seed. The fall is real geometry: every drop keeps the slope it was
// born with, so a gust shows in the sky about a second before it reaches the
// leaf, and the leaf's shadow lands on the creatures shifted downwind by
// slope times the gap. Holding the leaf straight overhead therefore misses on
// a slanted day; the windward side, and a beat ahead of each gust, works.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now,
// or performance.now. It reads a seeded rng and counts ticks, nothing else.

import { between, createRng, int, pick } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import { FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

// ---------------------------------------------------------------- geometry
export const GROUND_Y = 752
export const LEAF_HW = 125
export const LEAF_MIN_Y = 120
export const LEAF_MAX_Y = 560
export const LEAF_MIN_X = 30
export const LEAF_MAX_X = FIELD_W - 30
const LEAF_START = { x: FIELD_W / 2, y: 440 }
const LEAF_SPEED = 26
// A finger is not a pixel: a touch this close to the leaf grabs it.
const GRAB_SLOP_X = 60
const GRAB_SLOP_Y = 70

// ------------------------------------------------------------------- rain
export const DROP_VY = 16
const SPAWN_Y = -12
const DROP_X_MIN = -60
const DROP_X_MAX = FIELD_W + 60
const GUST_DUR = 30
// How far one full gust pushes a leaf nobody holds, per tick at its peak.
const BLOW = 2.5

// ------------------------------------------------------------- creatures
const COST = 0.045
const RELAX = 0.014
// A creature relaxes only after this many ticks without a drop on it.
const DRY_DELAY = 6
const START_COMFORT = 0.25
const CALM_ON = 0.92
const CALM_OFF = 0.6
// A relaxed creature takes a hit far less to heart, so a tour of the yard
// is possible: settle one, move on, come back before the rain wears it down.
const CALM_COST = 0.08
const DAMP_UNDER = 0.3

const SUN_TICKS = 180
const SUN_RATE = 0.25
const HINT_AFTER = 90
const MAX_EVENTS = 64
const MAX_SPLASHES = 24
const SPLASH_TICKS = 8

export const SLANT_CLASSES = ['hard-left', 'left', 'straight', 'right', 'hard-right'] as const
export type SlantClass = (typeof SLANT_CLASSES)[number]
const SLANT_RANGE: Record<SlantClass, readonly [number, number]> = {
  'hard-left': [-1.3, -1.0],
  left: [-0.75, -0.5],
  straight: [-0.1, 0.1],
  right: [0.5, 0.75],
  'hard-right': [1.0, 1.3],
}
const RAIN_CLASSES = ['drizzle', 'shower', 'downpour'] as const
export type RainClass = (typeof RAIN_CLASSES)[number]
// Drops born per tick.
const RAIN_RATE: Record<RainClass, number> = { drizzle: 4, shower: 7, downpour: 11 }
// Ticks between gusts: about 5, 3.3, and 2.2 seconds.
const GUST_PERIODS = [150, 100, 66] as const
// How much a gust adds to the slope.
const GUST_AMPS = [0.35, 0.8] as const

interface Kind {
  id: string
  color: string
  r: number
  // Multipliers on how much a hit costs and how fast it relaxes.
  cost: number
  relax: number
}
const KINDS: readonly Kind[] = [
  { id: 'mouse', color: '#9a8f86', r: 44, cost: 1.3, relax: 1.3 },
  { id: 'frog', color: '#5aa469', r: 52, cost: 1.0, relax: 1.0 },
  { id: 'kitten', color: '#e0a458', r: 50, cost: 1.5, relax: 1.2 },
  { id: 'hedgehog', color: '#8a6a4f', r: 58, cost: 0.7, relax: 0.8 },
  { id: 'snail', color: '#b98fb0', r: 60, cost: 0.9, relax: 0.6 },
  { id: 'duck', color: '#f2d04a', r: 62, cost: 0.45, relax: 0.7 },
]

export interface Day {
  slantClass: SlantClass
  // The steady slope: sideways drift per unit of fall (0 is straight down).
  s0: number
  rain: RainClass
  rate: number
  period: number
  amp: number
  // Which way gusts push the slope.
  dir: 1 | -1
  // The tick of the first gust.
  gustStart: number
}

export interface CreatureView {
  kind: string
  color: string
  x: number
  y: number
  r: number
  comfort: number
  relaxed: boolean
  hits: number
}

// Plain data the view draws from (contract: snapshot).
export interface RainSnapshot {
  tick: number
  day: Day
  // The slope of the drops being born right now, and how far into a gust the
  // sky is (0 to 1).
  lean: number
  gust: number
  // 0 to 1: the sun is out and the rain is thin. Always 0 without the hook.
  sun: number
  leaf: { x: number; y: number; hw: number; held: boolean }
  target: { x: number; y: number }
  creatures: CreatureView[]
  // Visible drops: x, y, and sideways speed per tick.
  drops: Array<[number, number, number]>
  splashes: Array<{ x: number; y: number; age: number }>
  // Null when the rainbow hook is removed.
  rainbows: number | null
  // A quiet child gets a ghost leaf over the dampest creature. Hints only.
  hint: { creature: number; x: number; y: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

// ------------------------------------------------------------ pure helpers
// 0 to 1: a smooth bump for `GUST_DUR` ticks at the start of each period.
export function gustAt(day: Day, tick: number): number {
  if (tick < day.gustStart) return 0
  const phase = (tick - day.gustStart) % day.period
  if (phase >= GUST_DUR) return 0
  const s = Math.sin((Math.PI * phase) / GUST_DUR)
  return s * s
}

// The slope of drops born at `tick`.
export function slantAt(day: Day, tick: number): number {
  return day.s0 + day.dir * day.amp * gustAt(day, tick)
}

// Where a leaf at height `leafY` must be centred so drops of slope `slope`
// that pass it miss nothing of the creature's circle. Its shadow is centred
// on the creature's centre line shifted upwind by slope times the gap.
export function idealX(slope: number, c: { x: number; y: number }, leafY: number): number {
  return c.x - slope * (c.y - leafY)
}

// Ticks a drop takes from its birth to cross a leaf at `leafY`.
function fallTicks(leafY: number): number {
  return Math.ceil((leafY + 12) / DROP_VY)
}

// Where the leaf must be during `tick` to shelter creature `c` from the drops
// crossing it then: they were born fallTicks earlier, so they carry that
// tick's slope. This is "a beat ahead" of the gust the child can see.
export function shelterX(day: Day, c: { x: number; y: number }, leafY: number, tick: number): number {
  return idealX(slantAt(day, tick - fallTicks(leafY) + 1), c, leafY)
}

function segmentHitsCircle(x0: number, y0: number, x1: number, y1: number, cx: number, cy: number, r: number): boolean {
  const dx = x1 - x0
  const dy = y1 - y0
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : clamp(((cx - x0) * dx + (cy - y0) * dy) / len2, 0, 1)
  const ex = x0 + dx * t - cx
  const ey = y0 + dy * t - cy
  return ex * ex + ey * ey <= r * r
}

function makeDay(rng: Rng): Day {
  const slantClass = pick(rng, SLANT_CLASSES)
  const [lo, hi] = SLANT_RANGE[slantClass]
  const s0 = between(rng, lo, hi)
  const rain = pick(rng, RAIN_CLASSES)
  const period = pick(rng, GUST_PERIODS)
  const amp = pick(rng, GUST_AMPS)
  const coin = rng() < 0.5 ? -1 : 1
  const dir: 1 | -1 = s0 >= 0.3 ? 1 : s0 <= -0.3 ? -1 : coin
  return { slantClass, s0, rain, rate: RAIN_RATE[rain], period, amp, dir, gustStart: int(rng, 30, period) }
}

interface Creature extends CreatureView {
  cost: number
  relax: number
  // Ticks since a drop last hit it.
  since: number
}

function makeCreatures(rng: Rng): Creature[] {
  const count = int(rng, 3, 4)
  const pool = [...KINDS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = int(rng, 0, i)
    const tmp = pool[i]!
    pool[i] = pool[j]!
    pool[j] = tmp
  }
  const gaps: number[] = []
  for (let i = 1; i < count; i++) gaps.push(between(rng, 130, 300))
  const span = gaps.reduce((a, b) => a + b, 0)
  let x = between(rng, 100, FIELD_W - 100 - span)
  return pool.slice(0, count).map((kind, i) => {
    if (i > 0) x += gaps[i - 1]!
    return {
      kind: kind.id,
      color: kind.color,
      x,
      y: GROUND_Y - kind.r,
      r: kind.r,
      comfort: START_COMFORT,
      relaxed: false,
      hits: 0,
      cost: kind.cost,
      relax: kind.relax,
      since: 0,
    }
  })
}

interface Drop {
  x: number
  y: number
  vx: number
}

export const createSim: CreateSim<RainSnapshot> = (config): Sim<RainSnapshot> => {
  const rng = createRng(config.seed)
  // (contract: hooks) `rainbow` is honoured only when it is in this list.
  const hooks = new Set(config.hooks)

  const day = makeDay(rng)
  const creatures = makeCreatures(rng)
  // Creatures never move. A falling drop whose lower end is still above the
  // highest creature top cannot touch any of them, so it skips the circle tests.
  const creatureTop = Math.min(...creatures.map((c) => c.y - c.r))
  const leaf = { x: LEAF_START.x, y: LEAF_START.y }
  const target = { x: LEAF_START.x, y: LEAF_START.y }
  // The one finger driving the leaf, and how it is holding it.
  let holder: number | null = null
  let grip = { ox: 0, oy: 0, pull: true }
  let drops: Drop[] = []
  let splashes: Array<{ x: number; y: number; age: number }> = []
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0
  let carry = 0
  let sunLeft = 0
  let wasAll = false
  let rainbows = 0

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  // Birth this tick's drops at height `y`. Their landing spots are spread
  // evenly across the ground whatever the slope.
  const birth = (slope: number, y: number, rate: number) => {
    carry += rate
    const n = Math.floor(carry)
    carry -= n
    for (let i = 0; i < n; i++) {
      drops.push({ x: between(rng, DROP_X_MIN, DROP_X_MAX) - slope * (GROUND_Y - y), y, vx: slope * DROP_VY })
    }
  }
  // A sky that is already raining at tick 0.
  for (let age = Math.ceil((GROUND_Y - SPAWN_Y) / DROP_VY); age >= 1; age--) {
    const y = SPAWN_Y + DROP_VY * age
    if (y < GROUND_Y - 20) birth(day.s0, y, day.rate)
  }

  const splash = (x: number, y: number) => {
    if (splashes.length >= MAX_SPLASHES) splashes.shift()
    splashes.push({ x, y, age: 0 })
  }

  // ------------------------------------------------------------ the leaf
  const onLeaf = (x: number, y: number) => Math.abs(x - leaf.x) <= LEAF_HW + GRAB_SLOP_X && Math.abs(y - leaf.y) <= GRAB_SLOP_Y

  const aim = (x: number, y: number) => {
    target.x = clamp(x + grip.ox, LEAF_MIN_X, LEAF_MAX_X)
    // A touch on the ground band only slides the leaf sideways.
    if (!(grip.pull && y > LEAF_MAX_Y)) target.y = clamp(y + grip.oy, LEAF_MIN_Y, LEAF_MAX_Y)
  }

  const pointer = (input: PointerInput) => {
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    // Any touch at all quiets the hint.
    idleTicks = 0
    if (phase === 'down') {
      if (!finite) return
      // The newest finger wins, so a finger that never lifted cannot lock it.
      holder = id
      const on = onLeaf(x, y)
      grip = on ? { ox: leaf.x - x, oy: leaf.y - y, pull: false } : { ox: 0, oy: 0, pull: true }
      aim(x, y)
      emit({ kind: 'state', name: on ? 'grab' : 'send' })
      return
    }
    if (holder !== id) return
    if (finite) aim(x, y)
    if (phase === 'up') holder = null
  }

  const moveLeaf = () => {
    // A leaf nobody holds is blown downwind when a gust reaches it.
    if (holder === null) {
      const g = gustAt(day, tick - fallTicks(leaf.y))
      if (g > 0) target.x = clamp(target.x + day.dir * day.amp * g * BLOW, LEAF_MIN_X, LEAF_MAX_X)
    }
    const dx = target.x - leaf.x
    const dy = target.y - leaf.y
    const d = Math.hypot(dx, dy)
    if (d <= LEAF_SPEED) {
      leaf.x = target.x
      leaf.y = target.y
    } else {
      leaf.x += (dx / d) * LEAF_SPEED
      leaf.y += (dy / d) * LEAF_SPEED
    }
  }

  // ---------------------------------------------------------------- step
  // (contract: step) One fixed tick.
  const step = () => {
    tick++
    idleTicks++
    moveLeaf()
    birth(slantAt(day, tick), SPAWN_Y, day.rate * (sunLeft > 0 ? SUN_RATE : 1))

    const hits = creatures.map(() => 0)
    const alive: Drop[] = []
    for (const d of drops) {
      const x1 = d.x + d.vx
      const y1 = d.y + DROP_VY
      // The leaf is above every creature, so it catches a drop first.
      if (d.y < leaf.y && y1 >= leaf.y) {
        const at = d.x + d.vx * ((leaf.y - d.y) / DROP_VY)
        if (Math.abs(at - leaf.x) <= LEAF_HW) {
          splash(at, leaf.y)
          continue
        }
      }
      let struck = -1
      for (let i = 0; y1 >= creatureTop && i < creatures.length; i++) {
        const c = creatures[i]!
        if (segmentHitsCircle(d.x, d.y, x1, y1, c.x, c.y, c.r)) {
          struck = i
          break
        }
      }
      if (struck >= 0) {
        hits[struck]!++
        continue
      }
      if (y1 >= GROUND_Y) continue
      if ((d.vx >= 0 && x1 > DROP_X_MAX + 40) || (d.vx < 0 && x1 < DROP_X_MIN - 40)) continue
      d.x = x1
      d.y = y1
      alive.push(d)
    }
    drops = alive

    creatures.forEach((c, i) => {
      const h = hits[i]!
      c.hits += h
      c.since = h > 0 ? 0 : c.since + 1
      if (h > 0) c.comfort = Math.max(0, c.comfort - h * COST * c.cost * (c.relaxed ? CALM_COST : 1))
      else if (c.since >= DRY_DELAY) c.comfort = Math.min(1, c.comfort + RELAX * c.relax)
      if (!c.relaxed && c.comfort >= CALM_ON) {
        c.relaxed = true
        emit({ kind: 'state', name: 'relax' })
      } else if (c.relaxed && c.comfort < CALM_OFF) {
        c.relaxed = false
        emit({ kind: 'state', name: 'unsettle' })
      }
    })

    // The rainbow hook: everyone relaxed at once, and the sun peeks out.
    if (hooks.has('rainbow')) {
      const all = creatures.every((c) => c.relaxed)
      if (all && !wasAll && sunLeft === 0) {
        sunLeft = SUN_TICKS
        rainbows++
        emit({ kind: 'hook', name: 'rainbow' })
      }
      wasAll = all
      if (sunLeft > 0) sunLeft--
    }

    for (const s of splashes) s.age++
    splashes = splashes.filter((s) => s.age <= SPLASH_TICKS)
  }

  // ---------------------------------------------------------- affordances
  // (contract: affordances) The leaf to drag, and each creature to tap (which
  // sends the leaf over it). Top-left rectangles inside the field.
  const affordances = (): Affordance[] => {
    const x0 = Math.max(0, leaf.x - LEAF_HW)
    const x1 = Math.min(FIELD_W, leaf.x + LEAF_HW)
    const list: Affordance[] = [
      { x: x0, y: leaf.y - 32, w: x1 - x0, h: 64, kind: 'drag', salience: 0.9 },
    ]
    for (const c of creatures) {
      const half = Math.max(c.r, 32) + 8
      list.push({
        x: c.x - half,
        y: c.y - half,
        w: half * 2,
        h: half * 2,
        kind: 'tap',
        // A damp creature draws the eye; a relaxed one does not.
        salience: c.relaxed ? 0.2 : 0.35 + 0.5 * (1 - c.comfort),
      })
    }
    return list
  }

  // ------------------------------------------------------------- observe
  // Where the leaf sits, judged against the nearest creature on the day's
  // steady slant: sheltering it, straight over it, near it, or away.
  const posture = (): string => {
    let best = creatures[0]!
    let bestError = Infinity
    for (const c of creatures) {
      const e = Math.abs(leaf.x - idealX(day.s0, c, leaf.y))
      if (e < bestError) {
        best = c
        bestError = e
      }
    }
    const slack = Math.max(8, LEAF_HW - best.r * Math.sqrt(1 + day.s0 * day.s0))
    if (bestError <= slack) return 'sheltered'
    if (Math.abs(leaf.x - best.x) <= 0.3 * LEAF_HW) return 'overhead'
    return bestError <= 2 * LEAF_HW ? 'near' : 'away'
  }

  // (contract: observe) A discrete outcome class: the day's slant, where the
  // leaf sits, and how many creatures are relaxed. 5 x 4 x 3 = 60.
  const observe = (): Observation => {
    const events = pending
    pending = []
    const relaxed = creatures.filter((c) => c.relaxed).length
    const mood = relaxed === 0 ? 'none' : relaxed === creatures.length ? 'all' : 'some'
    const comfort = creatures.reduce((sum, c) => sum + c.comfort, 0) / creatures.length
    return {
      signature: `${day.slantClass}/${posture()}/${mood}`,
      features: {
        comfort,
        relaxed,
        damp: creatures.filter((c) => c.comfort < DAMP_UNDER).length,
        rainbows,
      },
      events,
    }
  }

  // (contract: hints) Off for return and self-aim runs. Only data for the
  // view: it never changes what the sim does.
  const hint = (): RainSnapshot['hint'] => {
    if (!config.hints || idleTicks < HINT_AFTER) return null
    let worst = -1
    creatures.forEach((c, i) => {
      if (c.comfort < 0.7 && (worst < 0 || c.comfort < creatures[worst]!.comfort)) worst = i
    })
    return worst < 0 ? null : { creature: worst, x: creatures[worst]!.x, y: leaf.y }
  }

  const snapshot = (): RainSnapshot => ({
    tick,
    day: { ...day },
    lean: slantAt(day, tick + 1),
    gust: gustAt(day, tick + 1),
    sun: hooks.has('rainbow') ? sunLeft / SUN_TICKS : 0,
    leaf: { x: leaf.x, y: leaf.y, hw: LEAF_HW, held: holder !== null },
    target: { x: target.x, y: target.y },
    creatures: creatures.map((c) => ({
      kind: c.kind,
      color: c.color,
      x: c.x,
      y: c.y,
      r: c.r,
      comfort: c.comfort,
      relaxed: c.relaxed,
      hits: c.hits,
    })),
    drops: drops.filter((d) => d.x > DROP_X_MIN && d.x < DROP_X_MAX).map((d): [number, number, number] => [d.x, d.y, d.vx]),
    splashes: splashes.map((s) => ({ ...s })),
    rainbows: hooks.has('rainbow') ? rainbows : null,
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
