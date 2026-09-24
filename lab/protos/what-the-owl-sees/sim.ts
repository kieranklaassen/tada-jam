// What the Owl Sees. Three chicks sleep in a nest. The child carries one out
// into a meadow and lets go; an owl on a perch sweeps its gaze across the
// field and either swoops on a chick (and sends it home) or glides past. The
// sight rules are never shown:
//   1. Stillness: a chick that has moved lately is seen by every sweep. A
//      quick GLANCE sees nothing else; a long STARE (the owl's eyes go wide
//      first) also sees chicks that hold still, unless they are hidden by
//   2. Colour: a chick on a patch of ITS OWN colour, or
//   3. Cover: a chick INSIDE a reed clump, or BEHIND one (in its shadow, seen
//      from the perch, not far). A clump hides only the one chick nearest its
//      middle.
// Each owl (there are three kinds, told apart by how they look) is fooled by
// two of those three hiding ways and not the third, so what worked on one owl
// fails on another. The kind is dealt per round; the mapping never changes.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now, or
// performance.now. It reads a seeded rng and counts ticks, nothing else.

import { between, createRng, int } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Point {
  x: number
  y: number
}
// x and y are the top-left corner, like canvas fillRect.
export interface Rect extends Point {
  w: number
  h: number
}
export interface Patch extends Point {
  r: number
  colour: number
}
export interface Layout {
  perchIndex: number
  // Which owl sits on the perch (an index into OWL_KINDS).
  kind: number
  perch: Point
  reeds: Rect[]
  patches: Patch[]
}

// The owls: which of the three hiding ways each one is fooled by. Never shown.
export const OWL_KINDS = [
  { name: 'barn', colour: true, inside: true, behind: false },
  { name: 'tawny', colour: false, inside: true, behind: true },
  { name: 'snowy', colour: true, inside: false, behind: true },
] as const

export const CHICK_R = 36
export const MEADOW_TOP = 165
export const NEST: Rect = { x: 30, y: 700, w: 430, h: 100 }
const NEST_SLOTS: Point[] = [
  { x: 110, y: 752 },
  { x: 245, y: 752 },
  { x: 380, y: 752 },
]
const PERCHES: Point[] = [
  { x: 230, y: 52 },
  { x: 590, y: 52 },
  { x: 950, y: 52 },
]
// How far behind a clump, along the line from the perch, its shadow reaches.
export const SHADOW_LEN = 190
// A finger is not a pixel: the hit-test forgives this much (a 120 px target).
const HIT_SLOP = 24
// A chick that moved within this many ticks (about 1.2 s) still counts as moving.
export const MOVE_MEMORY = 36
const FIRST_REST = 90
const REST = 66
const GLANCE_TICKS = 60
const STARE_TICKS = 150
const SWEEP_RANGE = 1.55
const GLANCE_HALF = 0.14
const STARE_HALF = 0.07
const SWOOP_TICKS = 36
const DAWN_TICKS = 100
const HINT_AFTER_TICKS = 150
const RUSTLE_TICKS = 20
// The browser view never calls observe(), so the queue must not grow forever.
const MAX_EVENTS = 64

type Phase = 'rest' | 'glance' | 'stare' | 'dawn'
type Flash = 'none' | 'safe' | 'caught' | 'joy'
type Scene = 'empty' | 'moving' | 'exposed' | 'camo' | 'shade' | 'mixed'
// Per chick: hidden by its colour patch (camo) or by a reed clump (shade), for THIS owl.
type Cover = Array<{ camo: boolean; shade: boolean }>

interface Chick {
  colour: number
  x: number
  y: number
  // Out of the nest, on the meadow (or in a finger over it).
  inField: boolean
  heldBy: number | null
  sinceMove: number
  // The sweep that last looked at this chick, and the last stare it sat through unseen.
  seenSweep: number
  safeSweep: number
  flash: Flash
  flashT: number
}

// Plain data the view draws from (contract: snapshot).
export interface OwlSnapshot {
  tick: number
  layout: Layout
  nest: Rect
  chicks: Array<{ colour: number; x: number; y: number; inField: boolean; held: boolean; moving: boolean; flash: Flash; flashT: number }>
  owl: {
    phase: Phase
    // What the owl will do at the next sweep (its eyes show it while it rests).
    upcoming: 'glance' | 'stare'
    angle: number
    half: number
    // Null, or which chick it is diving on and how far along.
    swoop: { chick: number; t: number } | null
  }
  verdict: 'clear' | 'caught'
  // Null when the dawn hook is removed.
  dawns: number | null
  dawnT: number
  reedRustle: number[]
  patchRustle: number[]
  hint: { fromX: number; fromY: number; toX: number; toY: number; t: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inside = (rect: Rect, x: number, y: number) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
// One tick of a rustle countdown, in place (the counters never go below 0).
const cool = (ticks: number[]) => {
  for (let i = 0; i < ticks.length; i++) if (ticks[i]! > 0) ticks[i] = ticks[i]! - 1
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = int(rng, 0, i)
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

const overlapsRect = (rect: Rect, x: number, y: number, r: number, pad: number) => {
  const nx = clamp(x, rect.x - pad, rect.x + rect.w + pad)
  const ny = clamp(y, rect.y - pad, rect.y + rect.h + pad)
  return Math.hypot(x - nx, y - ny) < r
}

// Deals a meadow: where the owl sits, three reed clumps, five patches (at
// least one of each chick colour). Bounded retries, then a fixed fallback.
export function makeLayout(rng: Rng, previousPerch: number, previousKind: number): Layout {
  const perchIndex = previousPerch < 0 ? int(rng, 0, 2) : (previousPerch + 1 + int(rng, 0, 1)) % 3
  const kind = previousKind < 0 ? int(rng, 0, 2) : (previousKind + 1 + int(rng, 0, 1)) % 3
  const fallbackReeds: Rect[] = [
    { x: 120, y: 300, w: 150, h: 80 },
    { x: 520, y: 250, w: 150, h: 80 },
    { x: 900, y: 330, w: 150, h: 80 },
  ]
  const reeds: Rect[] = []
  for (let i = 0; i < 3; i++) {
    let placed: Rect | null = null
    for (let attempt = 0; attempt < 40 && placed === null; attempt++) {
      const w = between(rng, 140, 190)
      const h = between(rng, 70, 100)
      const candidate = { x: between(rng, 40, FIELD_W - 40 - w), y: between(rng, 230, 470), w, h }
      const clear = reeds.every(
        (o) => candidate.x > o.x + o.w + 40 || candidate.x + candidate.w < o.x - 40 || candidate.y > o.y + o.h + 40 || candidate.y + candidate.h < o.y - 40,
      )
      if (clear) placed = candidate
    }
    reeds.push(placed ?? fallbackReeds[i]!)
  }
  const colours = [...shuffle(rng, [0, 1, 2]), int(rng, 0, 2), int(rng, 0, 2)]
  const patches: Patch[] = []
  for (const colour of colours) {
    let placed: Patch | null = null
    let last: Patch | null = null
    for (let attempt = 0; attempt < 60 && placed === null; attempt++) {
      const r = between(rng, 62, 80)
      const candidate = { x: between(rng, r + 30, FIELD_W - r - 30), y: between(rng, 250, 610), r, colour }
      last = candidate
      const clear =
        patches.every((o) => Math.hypot(candidate.x - o.x, candidate.y - o.y) > o.r + r + 16) &&
        reeds.every((rd) => !overlapsRect(rd, candidate.x, candidate.y, r, 12))
      if (clear) placed = candidate
    }
    patches.push(placed ?? last!)
  }
  return { perchIndex, kind, perch: { ...PERCHES[perchIndex]! }, reeds, patches }
}

// Is the point on a patch of exactly this chick colour?
export function camoAt(layout: Layout, colour: number, x: number, y: number): boolean {
  return layout.patches.some((p) => p.colour === colour && Math.hypot(x - p.x, y - p.y) <= p.r)
}

// null when the line from the perch to (x, y) does not pass through the clump
// on the way; otherwise how far past the clump's far edge the point lies (0
// when it is inside the clump).
export function shadowDistance(perch: Point, x: number, y: number, rect: Rect): number | null {
  const dx = x - perch.x
  const dy = y - perch.y
  let tmin = 0
  let tmax = Number.POSITIVE_INFINITY
  const slabs: Array<[number, number, number, number]> = [
    [perch.x, dx, rect.x, rect.x + rect.w],
    [perch.y, dy, rect.y, rect.y + rect.h],
  ]
  for (const [origin, d, lo, hi] of slabs) {
    if (Math.abs(d) < 1e-9) {
      if (origin < lo || origin > hi) return null
    } else {
      let a = (lo - origin) / d
      let b = (hi - origin) / d
      if (a > b) [a, b] = [b, a]
      tmin = Math.max(tmin, a)
      tmax = Math.min(tmax, b)
      if (tmin > tmax) return null
    }
  }
  if (tmin > 1) return null
  return tmax >= 1 ? 0 : (1 - tmax) * Math.hypot(dx, dy)
}

// Which clumps cover this point from the perch, and whether it sits inside the
// clump (as opposed to behind it).
export function reedHits(layout: Layout, x: number, y: number): Array<{ reed: number; inside: boolean }> {
  const out: Array<{ reed: number; inside: boolean }> = []
  layout.reeds.forEach((reed, i) => {
    const d = shadowDistance(layout.perch, x, y, reed)
    if (d !== null && d <= SHADOW_LEN) out.push({ reed: i, inside: d === 0 })
  })
  return out
}

// The clumps whose inside or shadow covers this point.
export function reedShades(layout: Layout, x: number, y: number): number[] {
  return reedHits(layout, x, y).map((h) => h.reed)
}

const boxAround = (cx: number, cy: number, half: number): Rect => {
  const x = clamp(cx - half, 0, FIELD_W - 2 * half)
  const y = clamp(cy - half, 0, FIELD_H - 2 * half)
  return { x, y, w: 2 * half, h: 2 * half }
}

export const createSim: CreateSim<OwlSnapshot> = (config): Sim<OwlSnapshot> => {
  const rng = createRng(config.seed)
  // (contract: hooks) `dawn` is honoured only when it is in this list.
  const hooks = new Set(config.hooks)

  let layout = makeLayout(rng, -1, -1)
  let reedRustle = layout.reeds.map(() => 0)
  let patchRustle = layout.patches.map(() => 0)
  const chicks: Chick[] = [0, 1, 2].map((colour) => ({
    colour,
    x: NEST_SLOTS[colour]!.x,
    y: NEST_SLOTS[colour]!.y,
    inField: false,
    heldBy: null,
    sinceMove: 1000,
    seenSweep: -1,
    safeSweep: -1,
    flash: 'none',
    flashT: 0,
  }))
  const grabs = new Map<number, number>()
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0

  let phase: Phase = 'rest'
  let restLeft = FIRST_REST
  let upcoming: 'glance' | 'stare' = 'glance'
  let glancesLeft = int(rng, 1, 3)
  let dir = 1
  let angle = -SWEEP_RANGE
  let sweepId = 0
  let caughtThisSweep = false
  let swoop: { chick: number; t: number } | null = null
  let verdict: 'clear' | 'caught' = 'clear'
  let caught = 0
  let dawns = 0
  let dawnT = 0

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  const inMeadow = (c: Chick) => c.inField && !inside(NEST, c.x, c.y)
  const moving = (c: Chick) => c.heldBy !== null || c.sinceMove < MOVE_MEMORY

  const goHome = (c: Chick) => {
    const slot = NEST_SLOTS[c.colour]!
    c.inField = false
    c.heldBy = null
    c.x = slot.x
    c.y = slot.y
    c.sinceMove = 1000
  }

  // Which chicks are hidden from a stare right now, and by what, for THIS owl.
  // A clump hides only the chick nearest its middle.
  const coverList = (): Cover => {
    const owl = OWL_KINDS[layout.kind]!
    const out = chicks.map((c) => ({ camo: owl.colour && inMeadow(c) && camoAt(layout, c.colour, c.x, c.y), shade: false }))
    layout.reeds.forEach((reed) => {
      let best = -1
      let bestDistance = Number.POSITIVE_INFINITY
      chicks.forEach((c, i) => {
        if (!inMeadow(c) || c.heldBy !== null) return
        const d = shadowDistance(layout.perch, c.x, c.y, reed)
        if (d === null || d > SHADOW_LEN || !(d === 0 ? owl.inside : owl.behind)) return
        const away = Math.hypot(c.x - (reed.x + reed.w / 2), c.y - (reed.y + reed.h / 2))
        if (away < bestDistance) {
          bestDistance = away
          best = i
        }
      })
      if (best >= 0) out[best]!.shade = true
    })
    return out
  }

  const moveChick = (c: Chick, x: number, y: number) => {
    c.x = clamp(x, CHICK_R, FIELD_W - CHICK_R)
    c.y = clamp(y, MEADOW_TOP, FIELD_H - CHICK_R)
    c.sinceMove = 0
  }

  // ---- pointer ------------------------------------------------------------
  const release = (id: number) => {
    const index = grabs.get(id)
    if (index === undefined) return
    grabs.delete(id)
    const c = chicks[index]!
    c.heldBy = null
    c.sinceMove = 0
    if (inside(NEST, c.x, c.y)) {
      goHome(c)
      emit({ kind: 'state', name: 'home' })
    } else {
      c.inField = true
      emit({ kind: 'state', name: 'tuck' })
    }
  }

  const hit = (x: number, y: number): number => {
    let best = -1
    let bestDistance = Number.POSITIVE_INFINITY
    chicks.forEach((c, i) => {
      if (c.heldBy !== null) return
      const d = Math.hypot(x - c.x, y - c.y)
      if (d <= CHICK_R + HIT_SLOP && d < bestDistance) {
        best = i
        bestDistance = d
      }
    })
    return best
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase: kind, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (kind === 'down') {
      if (!finite) return
      release(id)
      const index = hit(x, y)
      if (index >= 0) {
        const c = chicks[index]!
        c.heldBy = id
        c.inField = true
        moveChick(c, x, y)
        grabs.set(id, index)
        emit({ kind: 'state', name: 'lift' })
        return
      }
      // Nothing to carry: the reeds and patches just rustle when touched.
      const reed = layout.reeds.findIndex((r) => inside({ x: r.x - 10, y: r.y - 10, w: r.w + 20, h: r.h + 20 }, x, y))
      if (reed >= 0) {
        reedRustle[reed] = RUSTLE_TICKS
        emit({ kind: 'state', name: 'rustle' })
        return
      }
      const patch = layout.patches.findIndex((p) => Math.hypot(x - p.x, y - p.y) <= p.r)
      if (patch >= 0) {
        patchRustle[patch] = RUSTLE_TICKS
        emit({ kind: 'state', name: 'rustle' })
      }
      return
    }
    const index = grabs.get(id)
    if (index !== undefined && finite) moveChick(chicks[index]!, x, y)
    if (kind === 'up') release(id)
  }

  // ---- the owl ------------------------------------------------------------
  const startSwoop = (index: number) => {
    swoop = { chick: index, t: 0 }
    verdict = 'caught'
    caughtThisSweep = true
    caught++
    const c = chicks[index]!
    c.flash = 'caught'
    c.flashT = SWOOP_TICKS + 20
    emit({ kind: 'state', name: 'caught' })
  }

  const finishSwoop = () => {
    if (!swoop) return
    const c = chicks[swoop.chick]!
    for (const [id, index] of [...grabs]) if (index === swoop.chick) grabs.delete(id)
    goHome(c)
    swoop = null
  }

  const beginDawn = () => {
    phase = 'dawn'
    dawnT = 0
    dawns++
    for (const c of chicks) {
      c.flash = 'joy'
      c.flashT = DAWN_TICKS
    }
    emit({ kind: 'hook', name: 'dawn' })
  }

  const newRound = () => {
    grabs.clear()
    for (const c of chicks) {
      goHome(c)
      c.flash = 'none'
      c.flashT = 0
    }
    layout = makeLayout(rng, layout.perchIndex, layout.kind)
    reedRustle = layout.reeds.map(() => 0)
    patchRustle = layout.patches.map(() => 0)
    phase = 'rest'
    restLeft = FIRST_REST
    upcoming = 'glance'
    glancesLeft = int(rng, 1, 3)
    dir = 1
    angle = -SWEEP_RANGE
    verdict = 'clear'
  }

  const endSweep = () => {
    const endedStare = phase === 'stare'
    if (endedStare && hooks.has('dawn') && !caughtThisSweep && chicks.every((c) => inMeadow(c) && c.heldBy === null && c.safeSweep === sweepId)) {
      beginDawn()
      return
    }
    if (endedStare) {
      glancesLeft = int(rng, 1, 3)
      upcoming = 'glance'
    } else {
      glancesLeft--
      upcoming = glancesLeft <= 0 ? 'stare' : 'glance'
    }
    phase = 'rest'
    restLeft = REST
    dir = -dir
  }

  const sweepStep = () => {
    const stare = phase === 'stare'
    const half = stare ? STARE_HALF : GLANCE_HALF
    angle += (dir * 2 * SWEEP_RANGE) / (stare ? STARE_TICKS : GLANCE_TICKS)
    // Only a stare needs the cover, and only for a still chick in the beam, so
    // it is worked out on first use (nothing in this loop changes what it reads).
    let cover: Cover | undefined
    for (let i = 0; i < chicks.length; i++) {
      const c = chicks[i]!
      if (!inMeadow(c) || c.seenSweep === sweepId) continue
      if (Math.abs(angle - Math.atan2(c.x - layout.perch.x, c.y - layout.perch.y)) > half) continue
      c.seenSweep = sweepId
      // The sight rules, in one line: motion is always seen; stillness is seen
      // only by a stare, and only if nothing hides it.
      let seen = moving(c)
      if (!seen && stare) {
        cover ??= coverList()
        seen = !cover[i]!.camo && !cover[i]!.shade
      }
      if (seen) {
        startSwoop(i)
        return
      }
      c.flash = 'safe'
      c.flashT = 40
      if (stare) c.safeSweep = sweepId
      emit({ kind: 'state', name: 'missed' })
    }
    if (dir > 0 ? angle > SWEEP_RANGE : angle < -SWEEP_RANGE) endSweep()
  }

  // (contract: step) One fixed tick.
  const step = () => {
    tick++
    idleTicks++
    for (const c of chicks) {
      c.sinceMove = c.heldBy !== null ? 0 : Math.min(1000, c.sinceMove + 1)
      if (c.flashT > 0 && --c.flashT === 0) c.flash = 'none'
    }
    cool(reedRustle)
    cool(patchRustle)
    if (swoop) {
      swoop.t++
      if (swoop.t >= SWOOP_TICKS) finishSwoop()
      return
    }
    if (phase === 'rest') {
      if (--restLeft <= 0) {
        phase = upcoming
        sweepId++
        caughtThisSweep = false
        verdict = 'clear'
        angle = dir > 0 ? -SWEEP_RANGE : SWEEP_RANGE
      }
    } else if (phase === 'dawn') {
      dawnT++
      if (dawnT >= DAWN_TICKS) newRound()
    } else {
      sweepStep()
    }
  }

  // (contract: affordances) What a child could be drawn to: the chicks to carry,
  // and the patches and reeds to poke. Reading this changes nothing.
  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    for (const c of chicks) {
      if (c.heldBy !== null) continue
      const box = boxAround(c.x, c.y, CHICK_R + 12)
      list.push({ ...box, kind: 'drag', salience: c.inField ? 0.5 : 0.85 })
    }
    for (const r of layout.reeds) {
      const box = boxAround(r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) / 2)
      list.push({ ...box, kind: 'tap', salience: 0.4 })
    }
    for (const p of layout.patches) list.push({ ...boxAround(p.x, p.y, p.r), kind: 'tap', salience: 0.35 })
    return list
  }

  const scene = (cover: Cover): Scene => {
    const out = chicks.map((_, i) => i).filter((i) => inMeadow(chicks[i]!))
    if (out.length === 0) return 'empty'
    if (out.some((i) => moving(chicks[i]!))) return 'moving'
    if (out.some((i) => !cover[i]!.camo && !cover[i]!.shade)) return 'exposed'
    if (out.every((i) => cover[i]!.camo)) return 'camo'
    if (out.every((i) => !cover[i]!.camo)) return 'shade'
    return 'mixed'
  }

  // (contract: observe) A discrete outcome class (4 phases x 6 scenes x 2
  // verdicts), a few named features, and the events since the last call.
  const observe = (): Observation => {
    const events = pending
    pending = []
    const cover = coverList()
    const safe = chicks.filter((c, i) => inMeadow(c) && c.heldBy === null && (cover[i]!.camo || cover[i]!.shade)).length
    return {
      signature: `${phase}/${scene(cover)}/${verdict}`,
      features: { safe, tucked: chicks.filter(inMeadow).length, caught, dawns },
      events,
    }
  }

  // (contract: hints) Only data for the view; it never changes what the sim
  // does. A ghost chick shows the gesture (not where to go) when nothing is out.
  const hint = (): OwlSnapshot['hint'] => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS || chicks.some((c) => c.inField)) return null
    const from = NEST_SLOTS[0]!
    return { fromX: from.x, fromY: from.y, toX: FIELD_W / 2, toY: 470, t: (tick % 75) / 75 }
  }

  const snapshot = (): OwlSnapshot => ({
    tick,
    layout: { perchIndex: layout.perchIndex, kind: layout.kind, perch: { ...layout.perch }, reeds: layout.reeds.map((r) => ({ ...r })), patches: layout.patches.map((p) => ({ ...p })) },
    nest: { ...NEST },
    chicks: chicks.map((c) => ({ colour: c.colour, x: c.x, y: c.y, inField: c.inField, held: c.heldBy !== null, moving: moving(c), flash: c.flash, flashT: c.flashT })),
    owl: {
      phase,
      upcoming,
      angle,
      half: phase === 'stare' ? STARE_HALF : GLANCE_HALF,
      swoop: swoop ? { chick: swoop.chick, t: swoop.t / SWOOP_TICKS } : null,
    },
    verdict,
    dawns: hooks.has('dawn') ? dawns : null,
    dawnT: phase === 'dawn' ? dawnT / DAWN_TICKS : 0,
    reedRustle: reedRustle.slice(),
    patchRustle: patchRustle.slice(),
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
