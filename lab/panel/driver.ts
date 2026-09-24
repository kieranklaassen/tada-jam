// The persona driver: turns a persona, a seeded stream, and what the sim
// declares it offers into screen-space pointer input, one tick at a time. The
// panel and the shell's watch mode use this same driver, so what Kieran
// watches is what the panel measured.
//
// The driver never shortcuts the sim: everything it does is a `PointerInput`
// that the caller passes to `sim.pointer()`. `affordances()` only steers where
// it aims; the sim's own hit-test decides what was touched.

import type { Rng } from '../kit/rng.ts'
import { chance, between, int } from '../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../kit/sim.ts'
import type { Affordance, AffordanceKind, PointerInput } from '../kit/sim.ts'
import { consideredCount, gestureProfile } from './personas.ts'
import type { KeyStat, Persona } from './types.ts'
import {
  AIM_EXPLORE,
  DRAG_DISTANCE_MAX,
  DRAG_DISTANCE_MIN,
  DRAG_MOVES_MAX,
  DRAG_MOVES_MIN,
  DRAG_TO_OTHER,
  FIELD_MARGIN,
  FOLLOW_KIND,
  HOLD_MAX_TICKS,
  HOLD_MIN_TICKS,
  KEY_CELL,
  MASTERY_PULL,
  NOVELTY_PULL,
} from './thresholds.ts'

export interface Point {
  x: number
  y: number
}

// An affordance's (x, y) is its TOP-LEFT corner, like canvas fillRect. This is
// the one place the panel depends on that convention.
export function affordanceCenter(a: Affordance): Point {
  return { x: a.x + a.w / 2, y: a.y + a.h / 2 }
}

export function insideAffordance(a: Affordance, p: Point): boolean {
  return p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h
}

export function clampToField(p: Point): Point {
  return {
    x: Math.min(FIELD_W, Math.max(0, p.x)),
    y: Math.min(FIELD_H, Math.max(0, p.y)),
  }
}

// Standard normal from exactly two stream values (Box-Muller).
export function gaussian(rng: Rng): number {
  const u = Math.max(rng(), 1e-12)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function jittered(rng: Rng, p: Point, sigma: number): Point {
  const dx = gaussian(rng) * sigma
  const dy = gaussian(rng) * sigma
  return clampToField({ x: p.x + dx, y: p.y + dy })
}

// ------------------------------------------------------------------ scripts
// A script is what the pointer does over consecutive ticks: index i holds the
// inputs delivered at tick offset i (empty while a finger rests). It always
// ends with an 'up'.
export type Script = PointerInput[][]

export function tapScript(id: number, p: Point): Script {
  return [[{ id, phase: 'down', x: p.x, y: p.y }], [{ id, phase: 'up', x: p.x, y: p.y }]]
}

// `ticks` is the whole length, at least 2: down, then rest, then up.
export function holdScript(id: number, p: Point, ticks: number): Script {
  const length = Math.max(2, ticks)
  const script: Script = [[{ id, phase: 'down', x: p.x, y: p.y }]]
  for (let i = 1; i < length - 1; i++) script.push([])
  script.push([{ id, phase: 'up', x: p.x, y: p.y }])
  return script
}

// Down at `from`, `moves` steps along the line to `to`, up at `to`.
export function dragScript(id: number, from: Point, to: Point, moves: number): Script {
  const n = Math.max(1, moves)
  const script: Script = [[{ id, phase: 'down', x: from.x, y: from.y }]]
  for (let i = 1; i <= n; i++) {
    const f = i / (n + 1)
    script.push([{ id, phase: 'move', x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f }])
  }
  script.push([{ id, phase: 'up', x: to.x, y: to.y }])
  return script
}

// ------------------------------------------------------------------- driver
export interface GestureInfo {
  kind: AffordanceKind
  // The memory key of the affordance aimed at; null for a free touch.
  key: string | null
  aimed: boolean
  // The salience of the affordance aimed at; null for a free touch.
  salience: number | null
  // For an aimed touch: the down point landed inside a declared affordance.
  hit: boolean
  startTick: number
  endTick: number
}

export interface DriverStep {
  inputs: PointerInput[]
  started: GestureInfo | null
  ended: GestureInfo | null
}

export interface Aim {
  feature: string
  dir: 'up' | 'down'
}

export interface DriverOptions {
  persona: Persona
  rng: Rng
  // Ignore affordances(): spread touches over the whole field.
  cueBlind: boolean
  // What the persona remembers about each affordance key.
  keyStats: ReadonlyMap<string, KeyStat>
}

export interface Driver {
  // Inputs for this tick, to be passed to sim.pointer() before sim.step().
  // getAffordances is called only when a new touch is decided, and never when
  // cue-blind.
  act(tick: number, getAffordances: () => Affordance[]): DriverStep
  setAim(aim: Aim | null): void
  // What one touch on an affordance did toward the current aim.
  report(key: string, reward: number): void
  readonly busy: boolean
}

export function affordanceKey(a: Affordance): string {
  const c = affordanceCenter(a)
  return `${a.kind}:${Math.floor(c.x / KEY_CELL)}:${Math.floor(c.y / KEY_CELL)}`
}

const EMPTY_STEP_INPUTS: PointerInput[] = []

export function createDriver(options: DriverOptions): Driver {
  const { persona, rng, cueBlind, keyStats } = options
  const profile = gestureProfile(persona)
  const focus = consideredCount(persona)
  let nextId = 1
  let thinkLeft = int(rng, profile.thinkMin, profile.thinkMax)
  let queue: Script = []
  let current: GestureInfo | null = null
  let aim: Aim | null = null
  let aimStats = new Map<string, { n: number; sum: number }>()

  function pickKind(): AffordanceKind {
    const { tap, hold, drag } = profile.mix
    const r = rng() * (tap + hold + drag)
    if (r < tap) return 'tap'
    if (r < tap + hold) return 'hold'
    return 'drag'
  }

  function weightedIndex(weights: number[]): number {
    let total = 0
    for (const w of weights) total += w
    let r = rng() * total
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]!
      if (r < 0) return i
    }
    return weights.length - 1
  }

  function choose(affs: Affordance[]): Affordance {
    const ranked = affs
      .map((a, i) => ({ a, i }))
      .sort((p, q) => q.a.salience - p.a.salience || p.i - q.i)
      .slice(0, Math.max(1, Math.min(affs.length, focus)))
      .map((r) => r.a)
    if (aim && aimStats.size > 0 && !chance(rng, AIM_EXPLORE)) {
      let best: Affordance | null = null
      let bestMean = Number.NEGATIVE_INFINITY
      for (const a of ranked) {
        const stat = aimStats.get(affordanceKey(a))
        if (!stat) continue
        const mean = stat.sum / stat.n
        if (mean > bestMean) {
          bestMean = mean
          best = a
        }
      }
      if (best && bestMean > 0) return best
    }
    const weights = ranked.map((a) => {
      const stat = keyStats.get(affordanceKey(a))
      const tries = stat ? stat.tries : 0
      const changes = stat ? stat.changes : 0
      const noveltyBonus = persona.draw.novelty * (NOVELTY_PULL / (1 + tries))
      const masteryBonus = persona.draw.mastery * MASTERY_PULL * (changes / (tries + 1))
      return Math.max(a.salience, 0.02) * (1 + noveltyBonus + masteryBonus)
    })
    return ranked[weightedIndex(weights)]!
  }

  function randomOffset(from: Point): Point {
    const angle = between(rng, 0, Math.PI * 2)
    const distance = between(rng, DRAG_DISTANCE_MIN, DRAG_DISTANCE_MAX)
    return clampToField({ x: from.x + Math.cos(angle) * distance, y: from.y + Math.sin(angle) * distance })
  }

  function start(tick: number, getAffordances: () => Affordance[]): DriverStep {
    const id = nextId++
    const affs = cueBlind ? [] : getAffordances()
    const free = cueBlind || affs.length === 0 || chance(rng, profile.freeShare)
    let kind: AffordanceKind
    let down: Point
    let chosen: Affordance | null = null
    let hit = false
    if (free) {
      kind = pickKind()
      const spot = {
        x: between(rng, FIELD_MARGIN, FIELD_W - FIELD_MARGIN),
        y: between(rng, FIELD_MARGIN, FIELD_H - FIELD_MARGIN),
      }
      down = jittered(rng, spot, persona.touchJitter)
    } else {
      chosen = choose(affs)
      kind = chance(rng, FOLLOW_KIND) ? chosen.kind : pickKind()
      down = jittered(rng, affordanceCenter(chosen), persona.touchJitter)
      hit = affs.some((a) => insideAffordance(a, down))
    }
    let script: Script
    if (kind === 'tap') {
      script = tapScript(id, down)
    } else if (kind === 'hold') {
      script = holdScript(id, down, int(rng, HOLD_MIN_TICKS, HOLD_MAX_TICKS))
    } else {
      let target: Point
      const others = chosen ? affs.filter((a) => a !== chosen) : []
      if (others.length > 0 && chance(rng, DRAG_TO_OTHER)) {
        const other = others[weightedIndex(others.map((a) => Math.max(a.salience, 0.02)))]!
        target = jittered(rng, affordanceCenter(other), persona.touchJitter)
      } else {
        target = randomOffset(down)
      }
      script = dragScript(id, down, target, int(rng, DRAG_MOVES_MIN, DRAG_MOVES_MAX))
    }
    queue = script
    current = {
      kind,
      key: chosen ? affordanceKey(chosen) : null,
      salience: chosen ? chosen.salience : null,
      aimed: chosen !== null,
      hit,
      startTick: tick,
      endTick: tick + script.length - 1,
    }
    const started = current
    const inputs = queue.shift() ?? EMPTY_STEP_INPUTS
    return { inputs, started, ended: null }
  }

  return {
    act(tick, getAffordances) {
      if (queue.length > 0) {
        const inputs = queue.shift() ?? EMPTY_STEP_INPUTS
        if (queue.length === 0 && current) {
          const ended = current
          current = null
          thinkLeft = int(rng, profile.thinkMin, profile.thinkMax)
          return { inputs, started: null, ended }
        }
        return { inputs, started: null, ended: null }
      }
      if (thinkLeft > 0) {
        thinkLeft--
        return { inputs: EMPTY_STEP_INPUTS, started: null, ended: null }
      }
      return start(tick, getAffordances)
    },
    setAim(next) {
      aim = next
      aimStats = new Map()
    },
    report(key, reward) {
      const stat = aimStats.get(key)
      if (stat) {
        stat.n += 1
        stat.sum += reward
      } else {
        aimStats.set(key, { n: 1, sum: reward })
      }
    },
    get busy() {
      return queue.length > 0
    },
  }
}
