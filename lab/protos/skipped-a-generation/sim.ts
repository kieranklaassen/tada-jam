// Skipped a Generation. A meadow of creatures wanders. Tap two to cross them:
// an egg wobbles, and a hatchling appears in the nest. Tap the hatchling to
// keep it (it joins the meadow and can be crossed again) or ignore it and it
// wanders off. Tap one creature, then the gate, to send it away.
//
// The hidden rules a hatchling follows:
//   hue    the middle of its parents' hues on the colour wheel (opposites tie
//          toward the first parent picked), with a small wobble
//   ears   the longer parent's ears
//   spots  a recessive gene: it shows only when BOTH inherited copies carry
//          spots. A spotted parent crossed with a plain one gives plain
//          hatchlings that still carry spots, and two such carriers can give
//          a spotted grandchild: the spots skip a generation.
//
// Pure and deterministic: seeded rngs and tick counts only.

import { between, createRng, int, pick } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const MEADOW: Rect = { x: 30, y: 90, w: 1120, h: 460 }
export const SLOTS: readonly [Rect, Rect] = [
  { x: 310, y: 620, w: 140, h: 150 },
  { x: 530, y: 620, w: 140, h: 150 },
]
export const GATE: Rect = { x: 30, y: 600, w: 200, h: 190 }
export const WISH_BOX: Rect = { x: 720, y: 620, w: 130, h: 150 }
export const NEST: Rect = { x: 880, y: 590, w: 270, h: 200 }

export const PAIR_TICKS = 30
export const NEST_TICKS = 360
export const MEADOW_MAX = 8
const MIN_MEADOW = 3
const RADIUS = 46
const HIT_SLOP = 22
const WALK = 1.1
const HINT_AFTER_TICKS = 150
const MAX_EVENTS = 64
const WISH_TOLERANCE = 45
const HUE_WOBBLE = 8
const LEAVE_TICKS = 40

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const norm = (h: number) => ((h % 360) + 360) % 360
// Shortest distance between two hues, 0 to 180.
const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
// One key for a crossed pair, whichever creature was picked first.
const pairKey = (p: number, q: number) => (p < q ? `${p}-${q}` : `${q}-${p}`)

// What a child can see of a creature.
export interface Look {
  hue: number
  ears: number
  spotted: boolean
}

interface Creature {
  id: number
  hue: number
  ears: number
  // Two inherited copies of the spot gene: 1 carries spots. Spots show only
  // when both are 1. Hidden from the child.
  alleles: [number, number]
  gen: number
  x: number
  y: number
  tx: number
  ty: number
  retarget: number
  parents: Look[]
  grands: Array<Look | null>
}

interface Leaving extends Look {
  x: number
  y: number
  vx: number
  ttl: number
}

interface Wish {
  hue: number
  ears: number | null
  spots: boolean
}

const isSpotted = (c: { alleles: readonly number[] }) => c.alleles[0] === 1 && c.alleles[1] === 1
const lookOf = (c: Creature): Look => ({ hue: c.hue, ears: c.ears, spotted: isSpotted(c) })
const matches = (c: Creature, wish: Wish) =>
  hueGap(c.hue, wish.hue) <= WISH_TOLERANCE && (wish.ears === null || c.ears === wish.ears) && (!wish.spots || isSpotted(c))

export interface CreatureView extends Look {
  id: number
  x: number
  y: number
  selected: boolean
  gen: number
  parents: Look[]
  grands: Array<Look | null>
  // The hidden genes. Tests read them; the view never draws them.
  alleles: [number, number]
}

export interface FamilySnapshot {
  tick: number
  meadow: CreatureView[]
  // 0 when no egg is wobbling, up to 1 as it hatches.
  pairing: number
  nest: { creature: CreatureView; left: number } | null
  full: boolean
  leaving: Array<Look & { x: number; y: number; ttl: number }>
  // Null when the wish hook is removed.
  wish: Wish | null
  wishes: number | null
  hatched: number
  hint: Array<{ x: number; y: number }> | null
}

interface RosterStats {
  spotted: number
  longEared: number
  gen: number
  bodies: number
  ears: string
  hues: string
  lineage: string
}

export const createSim: CreateSim<FamilySnapshot> = (config): Sim<FamilySnapshot> => {
  const gene = createRng(config.seed)
  const wander = createRng((config.seed ^ 0x3c6ef372) >>> 0)
  const wishRng = createRng((config.seed ^ 0x5bd1e995) >>> 0)
  const hooks = new Set(config.hooks)

  let meadow: Creature[] = []
  // What observe() reads off the roster. A creature's hue, ears, alleles and gen
  // never change, so it is stale only when the meadow gains or loses a member;
  // every such site sets it back to null.
  let rosterStats: RosterStats | null = null
  let sel: number[] = []
  let pairTimer = 0
  let nest: { c: Creature; timer: number } | null = null
  let leaving: Leaving[] = []
  const tried = new Set<string>()
  let pending: SimEvent[] = []
  let tick = 0
  let idleTicks = 0
  let nextId = 1
  let hatched = 0
  let wishesDone = 0
  let wish: Wish | null = null

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  const make = (hue: number, ears: number, alleles: [number, number], gen: number, x: number, y: number, parents: Look[], grands: Array<Look | null>): Creature => ({
    id: nextId++,
    hue: norm(hue),
    ears,
    alleles,
    gen,
    x,
    y,
    tx: x,
    ty: y,
    retarget: int(wander, 30, 120),
    parents,
    grands,
  })

  // Five founders: one spotted, sometimes one hidden carrier, the rest plain.
  {
    const base = between(gene, 0, 360)
    const spottedAt = int(gene, 0, 4)
    const carrierAt = (spottedAt + int(gene, 1, 4)) % 5
    const carrying = gene() < 0.5
    for (let i = 0; i < 5; i++) {
      const alleles: [number, number] = i === spottedAt ? [1, 1] : i === carrierAt && carrying ? [1, 0] : [0, 0]
      const ears = i === 0 ? 1 : i === 1 ? 3 : pick(gene, [1, 2, 3])
      const x = MEADOW.x + 130 + i * 215 + between(gene, -30, 30)
      const y = between(gene, MEADOW.y + 90, MEADOW.y + MEADOW.h - 90)
      meadow.push(make(base + i * 72 + between(gene, -20, 20), ears, alleles, 0, x, y, [], []))
    }
  }

  const find = (id: number) => meadow.find((c) => c.id === id)

  const makeWish = (): Wish => {
    const level = wishesDone
    let next: Wish = { hue: 0, ears: null, spots: false }
    for (let tries = 0; tries < 20; tries++) {
      next = {
        hue: between(wishRng, 0, 360),
        ears: level >= 1 ? int(wishRng, 1, 3) : null,
        spots: level >= 2 && meadow.some(isSpotted),
      }
      if (!meadow.some((c) => matches(c, next))) break
    }
    return next
  }
  if (hooks.has('wish')) wish = makeWish()

  const spawnWild = (gift: boolean) => {
    const fromLeft = gene() < 0.5
    const alleles: [number, number] = gift ? [1, 0] : [gene() < 0.25 ? 1 : 0, gene() < 0.25 ? 1 : 0]
    const ears = gift ? pick(gene, [1, 3]) : pick(gene, [1, 2, 3])
    const x = fromLeft ? MEADOW.x + 40 : MEADOW.x + MEADOW.w - 40
    const y = between(gene, MEADOW.y + 80, MEADOW.y + MEADOW.h - 80)
    meadow.push(make(between(gene, 0, 360), ears, alleles, 0, x, y, [], []))
    rosterStats = null
    emit({ kind: 'state', name: gift ? 'gift' : 'visitor' })
  }

  const sendAway = (look: Look, x: number, y: number) => {
    leaving.push({ ...look, x, y, vx: x < FIELD_W / 2 ? -4 : 4, ttl: LEAVE_TICKS })
    emit({ kind: 'state', name: 'wander-off' })
  }

  const breed = (a: Creature, b: Creature): Creature => {
    const gap = ((b.hue - a.hue + 540) % 360) - 180
    const hue = a.hue + gap / 2 + between(gene, -HUE_WOBBLE, HUE_WOBBLE)
    const ears = Math.max(a.ears, b.ears)
    const fromA = a.alleles[gene() < 0.5 ? 0 : 1]
    const fromB = b.alleles[gene() < 0.5 ? 0 : 1]
    const at = centre(NEST)
    return make(hue, ears, [fromA, fromB], Math.max(a.gen, b.gen) + 1, at.x, at.y, [lookOf(a), lookOf(b)], [
      a.parents[0] ?? null,
      a.parents[1] ?? null,
      b.parents[0] ?? null,
      b.parents[1] ?? null,
    ])
  }

  const hatch = () => {
    const a = find(sel[0]!)
    const b = find(sel[1]!)
    sel = []
    pairTimer = 0
    if (!a || !b) return
    a.retarget = 0
    b.retarget = 0
    if (nest) sendAway(lookOf(nest.c), nest.c.x, nest.c.y)
    const child = breed(a, b)
    nest = { c: child, timer: NEST_TICKS }
    tried.add(pairKey(a.id, b.id))
    hatched++
    emit({ kind: 'state', name: 'hatch' })
    // The moment the game is about: spots from two spotless parents.
    if (isSpotted(child) && !isSpotted(a) && !isSpotted(b)) emit({ kind: 'state', name: 'skip' })
  }

  const fulfil = () => {
    wishesDone++
    emit({ kind: 'hook', name: 'wish' })
    if (meadow.length < MEADOW_MAX) spawnWild(true)
    wish = makeWish()
  }

  const tryKeep = () => {
    if (!nest) return
    if (meadow.length >= MEADOW_MAX) {
      emit({ kind: 'state', name: 'full' })
      return
    }
    const c = nest.c
    nest = null
    c.retarget = 0
    meadow.push(c)
    rosterStats = null
    emit({ kind: 'state', name: 'keep' })
    if (wish && matches(c, wish)) fulfil()
  }

  const release = () => {
    if (sel.length !== 1) return
    const c = find(sel[0]!)
    sel = []
    pairTimer = 0
    if (!c) return
    meadow = meadow.filter((m) => m !== c)
    rosterStats = null
    sendAway(lookOf(c), c.x, c.y)
    emit({ kind: 'state', name: 'release' })
  }

  // The sim's own hit-test: nearest creature within its radius plus slop.
  const hit = (x: number, y: number): Creature | null => {
    let best: Creature | null = null
    let bestDistance = Infinity
    for (const c of meadow) {
      const d = Math.hypot(x - c.x, y - c.y)
      if (d <= RADIUS + HIT_SLOP && d < bestDistance) {
        best = c
        bestDistance = d
      }
    }
    return best
  }

  const toggle = (c: Creature) => {
    const at = sel.indexOf(c.id)
    if (at >= 0) {
      sel.splice(at, 1)
      pairTimer = 0
      c.retarget = 0
      emit({ kind: 'state', name: 'deselect' })
      return
    }
    if (sel.length >= 2) return
    sel.push(c.id)
    emit({ kind: 'state', name: 'select' })
    if (sel.length === 2) {
      pairTimer = PAIR_TICKS
      emit({ kind: 'state', name: 'pair' })
    }
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    if (input.phase !== 'down') return
    const { x, y } = input
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    if (nest && inside(NEST, x, y)) return tryKeep()
    if (inside(GATE, x, y)) return release()
    const c = hit(x, y)
    if (c) toggle(c)
  }

  const step = () => {
    tick++
    idleTicks++
    for (const c of meadow) {
      const at = sel.indexOf(c.id)
      if (at >= 0) {
        const s = centre(SLOTS[at]!)
        c.x += (s.x - c.x) * 0.25
        c.y += (s.y - c.y) * 0.25
        continue
      }
      c.retarget--
      if (c.retarget <= 0) {
        c.tx = between(wander, MEADOW.x + 70, MEADOW.x + MEADOW.w - 70)
        c.ty = between(wander, MEADOW.y + 70, MEADOW.y + MEADOW.h - 70)
        c.retarget = int(wander, 90, 240)
      }
      const dx = c.tx - c.x
      const dy = c.ty - c.y
      const d = Math.hypot(dx, dy)
      if (d > WALK) {
        c.x += (dx / d) * WALK
        c.y += (dy / d) * WALK
      }
    }
    // Gentle separation so two wanderers do not sit on top of each other.
    for (let i = 0; i < meadow.length; i++) {
      for (let j = i + 1; j < meadow.length; j++) {
        const p = meadow[i]!
        const q = meadow[j]!
        if (sel.includes(p.id) || sel.includes(q.id)) continue
        const dx = q.x - p.x
        const dy = q.y - p.y
        const d = Math.hypot(dx, dy)
        const want = RADIUS * 1.9
        if (d < want && d > 0.001) {
          const push = ((want - d) / 2) * 0.2
          p.x -= (dx / d) * push
          p.y -= (dy / d) * push
          q.x += (dx / d) * push
          q.y += (dy / d) * push
        }
      }
    }
    if (sel.length === 2 && pairTimer > 0 && --pairTimer === 0) hatch()
    if (nest && --nest.timer <= 0) {
      sendAway(lookOf(nest.c), nest.c.x, nest.c.y)
      nest = null
    }
    for (const l of leaving) {
      l.x += l.vx
      l.ttl--
    }
    leaving = leaving.filter((l) => l.ttl > 0)
    if (meadow.length < MIN_MEADOW && tick % 45 === 0) spawnWild(false)
  }

  const box = (cx: number, cy: number, half: number): Rect => ({
    x: clamp(cx - half, 0, FIELD_W - 2 * half),
    y: clamp(cy - half, 0, FIELD_H - 2 * half),
    w: 2 * half,
    h: 2 * half,
  })

  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    for (const c of meadow) {
      const chosen = sel.includes(c.id)
      list.push({ ...box(c.x, c.y, RADIUS + 12), kind: 'tap', salience: chosen ? 0.3 : sel.length === 1 ? 0.75 : 0.5 })
    }
    if (nest) list.push({ ...NEST, kind: 'tap', salience: 0.95 })
    if (sel.length === 1) list.push({ ...GATE, kind: 'tap', salience: 0.12 })
    return list
  }

  const rosterOf = (): RosterStats => {
    const spotted = meadow.filter(isSpotted).length
    const longEared = meadow.filter((c) => c.ears === 3).length
    const gen = meadow.reduce((m, c) => Math.max(m, c.gen), 0)
    const families = new Set(meadow.map((c) => Math.floor(c.hue / 60)))
    const bodies = new Set(meadow.map((c) => `${isSpotted(c) ? 's' : 'p'}${c.ears}${Math.floor(c.hue / 60)}`))
    return {
      spotted,
      longEared,
      gen,
      bodies: bodies.size,
      ears: meadow.length > 0 && meadow.every((c) => c.ears === 1) ? 'short-ears' : meadow.length > 0 && longEared === meadow.length ? 'long-ears' : 'mixed-ears',
      hues: families.size <= 2 ? 'few-hues' : families.size <= 4 ? 'some-hues' : 'many-hues',
      lineage: gen === 0 ? 'founders' : gen <= 2 ? 'kin' : 'deep',
    }
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    const { spotted, longEared, gen, bodies, ears, hues, lineage } = (rosterStats ??= rosterOf())
    return {
      signature: `${spotted > 0 ? 'spotted' : 'plain'}/${ears}/${hues}/${lineage}`,
      features: { bodies, spotted, generation: gen, longEared, roster: meadow.length, hatched, wishes: wishesDone },
      events,
    }
  }

  // Off with hints off. Only data for the view; it changes nothing.
  const hint = (): Array<{ x: number; y: number }> | null => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS || sel.length === 2) return null
    if (nest) return [centre(NEST)]
    if (sel.length === 1) {
      const chosen = find(sel[0]!)!
      const fresh = meadow.find((c) => c !== chosen && !tried.has(pairKey(c.id, chosen.id)))
      const other = fresh ?? meadow.find((c) => c !== chosen)
      return other ? [{ x: other.x, y: other.y }] : null
    }
    for (const a of meadow) {
      for (const b of meadow) {
        if (a.id < b.id && !tried.has(pairKey(a.id, b.id))) return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }]
      }
    }
    return null
  }

  const view = (c: Creature): CreatureView => ({
    ...lookOf(c),
    id: c.id,
    x: c.x,
    y: c.y,
    selected: sel.includes(c.id),
    gen: c.gen,
    parents: c.parents,
    grands: c.grands,
    alleles: [c.alleles[0], c.alleles[1]],
  })

  const snapshot = (): FamilySnapshot => ({
    tick,
    meadow: meadow.map(view),
    pairing: pairTimer > 0 ? 1 - pairTimer / PAIR_TICKS : 0,
    nest: nest ? { creature: view(nest.c), left: nest.timer / NEST_TICKS } : null,
    full: meadow.length >= MEADOW_MAX,
    leaving: leaving.map((l) => ({ hue: l.hue, ears: l.ears, spotted: l.spotted, x: l.x, y: l.y, ttl: l.ttl / LEAVE_TICKS })),
    wish: wish ? { ...wish } : null,
    wishes: hooks.has('wish') ? wishesDone : null,
    hatched,
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
