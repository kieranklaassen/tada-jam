// Blob Dash physics, in cells and beats so the whole course speeds up with
// the tempo and a jump always lasts exactly one beat. Fixed step, pure, no
// DOM: the view calls `step` 96 times a beat and turns the events into juice.

import { CELLS_PER_BEAT, SECTION_BEATS } from './levels.ts'
import type { Layout, Rect } from './levels.ts'

export const STEPS_PER_BEAT = 96
export const STEP = 1 / STEPS_PER_BEAT
// A jump is 2.2 cells high and lasts one beat; a pad launch lasts 1.5 beats.
export const GRAV = 17.6
export const JUMP_V = 8.8
export const PAD_V = 13.2
// Fairness: a press this many beats before landing still jumps, and a jump
// this many beats after running off an edge still counts.
export const BUFFER = 0.3
export const COYOTE = 0.14
// How far either side of a beat a held finger may re-jump.
const HOLD_EARLY = 0.07
const HOLD_LATE = 0.12

// Half the blob's width for standing and crashing, and the smaller half-size
// used against spikes (hazards are kinder than they look).
const HW = 0.45
const HAZ = 0.36
const STEP_UP = 0.35
const RING_R = 1.3
const PAD_REACH = 2.4
const STAR_R = 1.0
const GEM_R = 1.15

export interface Body {
  x: number
  y: number
  vy: number
  // -1 falls down, 1 falls up.
  grav: 1 | -1
  grounded: boolean
  coyote: number
}

export interface Input {
  held: boolean
  // Beats since the last press.
  pressAge: number
  // A press that has not launched anything yet.
  fresh: boolean
}

// Per-attempt memory for the section being played.
export interface Attempt {
  ringsUsed: boolean[]
  padsUsed: boolean[]
  portalsPassed: boolean[]
}

export type Ev =
  | { type: 'jump' }
  | { type: 'land'; speed: number }
  | { type: 'pad' }
  | { type: 'ring'; index: number }
  | { type: 'portal'; index: number }
  | { type: 'star'; index: number }
  | { type: 'die'; why: 'spike' | 'crash' | 'fall' }

const FLAT: Rect[] = [{ x0: -1e6, x1: 1e6, y0: -4, y1: 0 }]

export function newBody(x = 0): Body {
  return { x, y: 0.5, vy: 0, grav: -1, grounded: true, coyote: 0 }
}

export function newAttempt(lay: Layout | null): Attempt {
  return { ringsUsed: lay ? lay.rings.map(() => false) : [], padsUsed: lay ? lay.pads.map(() => false) : [], portalsPassed: lay ? lay.portals.map(() => false) : [] }
}

// One fixed step. `lay` null is the lobby: a flat floor and no forward motion.
// `got(i)` says whether star i is already collected. `beat` is the time in
// beats: a finger held down re-jumps only around a beat, so holding bounces in
// time with the music instead of drifting off it. Returns false when dead.
export function step(b: Body, inp: Input, lay: Layout | null, at: Attempt, got: (index: number) => boolean, ev: Ev[], beat: number): boolean {
  const up = -b.grav
  const phase = beat - Math.floor(beat)
  const tapped = inp.fresh && inp.pressAge <= BUFFER
  const wants = tapped || (inp.held && (phase < HOLD_LATE || phase > 1 - HOLD_EARLY))
  if (wants && (b.grounded || b.coyote <= COYOTE)) {
    b.vy = JUMP_V * up
    b.grounded = false
    b.coyote = 99
    inp.fresh = false
    ev.push({ type: 'jump' })
  }

  if (lay) b.x += CELLS_PER_BEAT * STEP
  const prevY = b.y
  b.vy += GRAV * b.grav * STEP
  if (b.vy > 20) b.vy = 20
  if (b.vy < -20) b.vy = -20
  b.y += b.vy * STEP

  let landed = false
  let impact = 0
  const solids = lay ? lay.solids : FLAT
  for (const r of solids) {
    if (b.x + HW <= r.x0 || b.x - HW >= r.x1) continue
    if (b.y + 0.5 <= r.y0 || b.y - 0.5 >= r.y1) continue
    if (b.grav < 0) {
      if (prevY - 0.5 >= r.y1 - STEP_UP) {
        if (b.vy <= 0) {
          impact = Math.max(impact, -b.vy)
          b.y = r.y1 + 0.5
          b.vy = 0
          landed = true
        }
      } else if (prevY + 0.5 <= r.y0 + 0.3 && b.vy > 0) {
        b.y = r.y0 - 0.5
        b.vy = 0
      } else {
        ev.push({ type: 'die', why: 'crash' })
        return false
      }
    } else {
      if (prevY + 0.5 <= r.y0 + STEP_UP) {
        if (b.vy >= 0) {
          impact = Math.max(impact, b.vy)
          b.y = r.y0 - 0.5
          b.vy = 0
          landed = true
        }
      } else if (prevY - 0.5 >= r.y1 - 0.3 && b.vy < 0) {
        b.y = r.y1 + 0.5
        b.vy = 0
      } else {
        ev.push({ type: 'die', why: 'crash' })
        return false
      }
    }
  }
  if (landed) {
    if (!b.grounded) ev.push({ type: 'land', speed: impact })
    b.grounded = true
    b.coyote = 0
  } else if (b.grounded) {
    b.grounded = false
    b.coyote = STEP
  } else {
    b.coyote += STEP
  }

  if (b.y < -2.6 || b.y > 9) {
    ev.push({ type: 'die', why: 'fall' })
    return false
  }
  if (!lay) return true

  const foot = b.y + 0.5 * b.grav
  // A pad is an updraft as tall as a jump: it fires once per pass and also
  // catches a blob that jumped just before it, so a nervous tap is not fatal.
  for (let i = 0; i < lay.pads.length; i++) {
    const p = lay.pads[i]!
    if (at.padsUsed[i] || p.dir !== up || Math.abs(b.x - p.x) > 0.75) continue
    const height = (foot - p.y) * p.dir
    if (height < -0.6 || height > PAD_REACH) continue
    at.padsUsed[i] = true
    b.vy = PAD_V * up
    b.grounded = false
    b.coyote = 99
    ev.push({ type: 'pad' })
  }

  for (let i = 0; i < lay.rings.length; i++) {
    if (at.ringsUsed[i]) continue
    const ring = lay.rings[i]!
    const dx = b.x - ring.x
    const dy = b.y - ring.y
    // A circle, plus a column underneath it: a late tap on the way down past
    // the ring still catches it.
    const inside = dx * dx + dy * dy <= RING_R * RING_R || (dy * up < 0 && dy * up > -1.5 && Math.abs(dx) < 1.1)
    if (!inside) continue
    if (!inp.fresh || !(inp.held || inp.pressAge <= BUFFER)) continue
    at.ringsUsed[i] = true
    b.vy = JUMP_V * up
    b.grounded = false
    b.coyote = 99
    inp.fresh = false
    ev.push({ type: 'ring', index: i })
  }

  for (let i = 0; i < lay.portals.length; i++) {
    if (at.portalsPassed[i]) continue
    const portal = lay.portals[i]!
    if (b.x < portal.x) continue
    at.portalsPassed[i] = true
    if (b.grav === portal.to) continue
    b.grav = portal.to
    b.vy *= 0.4
    b.grounded = false
    b.coyote = 99
    ev.push({ type: 'portal', index: i })
  }

  for (let i = 0; i < lay.stars.length; i++) {
    const star = lay.stars[i]!
    const dx = b.x - star.x
    if (dx > 1.2 || dx < -1.2) continue
    const dy = b.y - star.y
    const r = star.big ? GEM_R : STAR_R
    if (dx * dx + dy * dy > r * r || got(i)) continue
    ev.push({ type: 'star', index: i })
  }

  for (const s of lay.spikes) {
    const dx = b.x - s.x
    if (dx > 0.17 + HAZ || dx < -(0.17 + HAZ)) continue
    const dy = b.y - (s.y + 0.3 * s.dir)
    if (dy > 0.3 + HAZ || dy < -(0.3 + HAZ)) continue
    ev.push({ type: 'die', why: 'spike' })
    return false
  }
  return true
}

export interface Mark {
  x: number
  // The blob's centre and gravity when the press happens.
  y: number
  grav: 1 | -1
  // True when the press fires a ring rather than a ground jump.
  air: boolean
}

export interface RobotRun {
  ok: boolean
  // Local beat reached (16 when cleared).
  reached: number
  marks: Mark[]
  stars: number
}

// Play one section with a press at each of `jumps` (shifted by `offset`
// beats). Used by the verifier, and by the view to place hint markers.
export function robotRun(lay: Layout, jumps: readonly number[] = lay.jumps, offset = 0): RobotRun {
  const b = newBody(0)
  const inp: Input = { held: false, pressAge: 99, fresh: false }
  const at = newAttempt(lay)
  const ev: Ev[] = []
  const stars = new Set<number>()
  const marks: Mark[] = []
  let next = 0
  let holdUntil = -1
  const total = SECTION_BEATS * STEPS_PER_BEAT
  for (let i = 0; i < total; i++) {
    const beat = i * STEP
    while (next < jumps.length && beat >= jumps[next]! + offset - 1e-9) {
      inp.pressAge = 0
      inp.fresh = true
      holdUntil = beat + 0.12
      marks.push({ x: b.x, y: b.y, grav: b.grav, air: !b.grounded })
      next++
    }
    inp.held = beat < holdUntil
    ev.length = 0
    const alive = step(b, inp, lay, at, (index) => stars.has(index), ev, beat)
    for (const e of ev) if (e.type === 'star') stars.add(e.index)
    b.x = (i + 1) * STEP * CELLS_PER_BEAT
    inp.pressAge += STEP
    if (!alive) return { ok: false, reached: beat, marks, stars: stars.size }
  }
  return { ok: b.grav === -1, reached: SECTION_BEATS, marks, stars: stars.size }
}
