// Wired Seasons. A sapling: tap a limb to snip it, drag a limb to wire it, tap
// the season button to let a year pass. Three rules answer the child:
//   1. A snipped tip sprouts two buds below the cut (a fork) next season.
//      A cut close to the joint takes the whole limb off clean, no buds.
//   2. A wired limb grows on along the heading it was bent to. An unwired
//      limb curls toward the light (up) a little more every season.
//   3. A limb whose whole subtree stands in another lineage's shade for two
//      seasons drops away. Shaded limbs turn brown after the first.
// Growth is shared, so a tree with many tips grows each one less.
//
// Pure and deterministic: no DOM, no Vite globals, no Math.random, Date.now, or
// performance.now. The seeded rng draws only at setup and in passSeason, in a
// fixed order, so a seed and an input log replay exactly. step() moves only the
// drawing clocks (growth easing, falling limbs).

import { between, createRng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Affordance, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface Blob {
  x: number
  y: number
  rx: number
  ry: number
}

export const ROOT_X = 590
export const GROUND_Y = 716
export const BUTTON: Rect = { x: 940, y: 736, w: 220, h: 68 }

const MARGIN = 26
const HIT_R = 38
const TIP_PAD = 16
const DRAG_MIN = 28
const CLEAN_T = 0.3
const STUB_MIN = 28
const ROOT_MIN = 100
const EXT = 100
const FORK = 0.5
const TROPISM = 0.3
const FORK_TROPISM = 0.12
const LAT_P = 0.3
const MAX_LIMBS = 140
const SHADE_DX = 60
const SHADE_REACH = 320
const SHADE_GAP = 10
const DIM_LIMIT = 2
const GROW_TICKS = 18
export const FALL_TICKS = 36
const HINT_AFTER_TICKS = 150
const MAX_EVENTS = 64
const COVER = 85
const PIC_MARGIN = 55
// A season leaves the tree matching the picture when it covers this share of
// the silhouette and at most this share of its limb ends stray outside it.
const MATCH_COVER = 0.62
const MATCH_SPILL = 0.2

interface Limb {
  id: number
  parent: number
  kids: number[]
  // Bend relative to the parent's heading; the trunk's is relative to straight up.
  rel: number
  len: number
  wired: boolean
  cut: boolean
  lat: boolean
  age: number
  // Seasons spent with the whole subtree in shade.
  dim: number
  // Growth progress, 0 to 1, purely for drawing.
  g: number
  // Layout, recomputed by relayout().
  abs: number
  sx: number
  sy: number
  ex: number
  ey: number
  shaded: boolean
  dark: boolean
  mass: number
}

export interface SnapLimb {
  id: number
  parent: number
  x1: number
  y1: number
  x2: number
  y2: number
  w: number
  heading: number
  wired: boolean
  cut: boolean
  shaded: boolean
  dim: number
  tip: boolean
}

export interface WiredSnapshot {
  tick: number
  year: number
  lost: number
  limbs: SnapLimb[]
  fallen: Array<{ x1: number; y1: number; x2: number; y2: number; age: number }>
  button: Rect
  // Null when the picture hook is removed.
  picture: { name: string; blobs: Blob[]; matches: number } | null
  // Where the idle hint points, or null. Only ever set when config.hints is on.
  hint: { x: number; y: number } | null
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
const norm = (a: number) => {
  let r = a % (2 * Math.PI)
  if (r > Math.PI) r -= 2 * Math.PI
  else if (r <= -Math.PI) r += 2 * Math.PI
  return r
}
// A heading pulled part of the way toward straight up.
const toward = (a: number, k: number) => a + k * norm(-Math.PI / 2 - a)

const PICTURES: Array<{ name: string; blobs: Blob[] }> = [
  { name: 'umbrella', blobs: [{ x: ROOT_X, y: 410, rx: 330, ry: 85 }] },
  { name: 'column', blobs: [{ x: ROOT_X, y: 390, rx: 70, ry: 270 }] },
  {
    name: 'vase',
    blobs: [
      { x: 430, y: 340, rx: 120, ry: 150 },
      { x: 750, y: 340, rx: 120, ry: 150 },
    ],
  },
  { name: 'windswept', blobs: [{ x: 800, y: 470, rx: 300, ry: 110 }] },
]

const inBlobs = (blobs: Blob[], x: number, y: number, extra: number) =>
  blobs.some((b) => ((x - b.x) / (b.rx + extra)) ** 2 + ((y - b.y) / (b.ry + extra)) ** 2 <= 1)

interface Picture {
  name: string
  blobs: Blob[]
  samples: Array<[number, number]>
}

function makePicture(def: { name: string; blobs: Blob[] }, mirrored: boolean): Picture {
  const blobs = def.blobs.map((b) => ({ ...b, x: mirrored ? FIELD_W - b.x : b.x }))
  const samples: Array<[number, number]> = []
  for (let x = 40; x < FIELD_W; x += 46) for (let y = 40; y < GROUND_Y; y += 46) if (inBlobs(blobs, x, y, 0)) samples.push([x, y])
  return { name: mirrored ? `${def.name}-left` : def.name === 'windswept' ? 'windswept-right' : def.name, blobs, samples }
}

export const createSim: CreateSim<WiredSnapshot> = (config): Sim<WiredSnapshot> => {
  const rng = createRng(config.seed)
  // (contract: hooks) `picture` is honoured only when it is in this list.
  const hooks = new Set(config.hooks)

  // The picture hook has its own generator so that removing it leaves the
  // tree's own growth, and so the ablation, exactly as it was.
  const pictures: Picture[] = []
  if (hooks.has('picture')) {
    const prng = createRng((config.seed ^ 0x9e3779b9) >>> 0)
    const order = PICTURES.map((def) => ({ def, key: prng() }))
    order.sort((a, b) => a.key - b.key)
    for (const { def } of order) pictures.push(makePicture(def, def.name === 'windswept' && prng() < 0.5))
  }
  // Each match moves the child on to the next picture, so this counts both.
  let matches = 0
  const currentPicture = (): Picture | null => (pictures.length > 0 ? pictures[matches % pictures.length]! : null)

  const limbs = new Map<number, Limb>()
  const fallen: WiredSnapshot['fallen'] = []
  const grabs = new Map<number, { limb: number; x: number; y: number; wiring: boolean }>()
  let pending: SimEvent[] = []
  let nextId = 0
  let tick = 0
  let idleTicks = 0
  let year = 0
  let lost = 0

  const emit = (event: SimEvent) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push(event)
  }

  const addLimb = (parent: number, rel: number, len: number, wired: boolean, g = 1): Limb => {
    const limb: Limb = {
      id: nextId++, parent, kids: [], rel, len, wired, cut: false, lat: false, age: 1, dim: 0, g,
      abs: 0, sx: 0, sy: 0, ex: 0, ey: 0, shaded: false, dark: false, mass: 1,
    }
    limbs.set(limb.id, limb)
    if (parent >= 0) limbs.get(parent)!.kids.push(limb.id)
    return limb
  }

  const isAncestor = (a: Limb, b: Limb): boolean => {
    for (let p = b.parent; p >= 0; p = limbs.get(p)!.parent) if (p === a.id) return true
    return false
  }

  // What the layout pass measured; observe() and the picture check read it.
  const stats = { height: 0, width: 0, lean: 0, lit: 1, coverage: 0, outside: 0 }

  // Positions, shade, and measurements from the current bends and lengths.
  // Parents come before children in the map, so one pass in order lays it out.
  const relayout = () => {
    const all = [...limbs.values()]
    for (const L of all) {
      const p = L.parent >= 0 ? limbs.get(L.parent)! : null
      L.abs = (p ? p.abs : -Math.PI / 2) + L.rel
      L.sx = p ? p.ex : ROOT_X
      L.sy = p ? p.ey : GROUND_Y
      L.ex = clamp(L.sx + Math.cos(L.abs) * L.len, MARGIN, FIELD_W - MARGIN)
      L.ey = clamp(L.sy + Math.sin(L.abs) * L.len, MARGIN, GROUND_Y - 4)
    }
    // Light is a simple overlap test: a limb end is shaded when another
    // lineage's limb end sits above it, close enough sideways.
    for (const A of all) {
      A.shaded = false
      if (A.parent < 0) continue
      for (const B of all) {
        if (B === A || B.ey >= A.ey - SHADE_GAP || A.ey - B.ey > SHADE_REACH || Math.abs(B.ex - A.ex) >= SHADE_DX) continue
        if (isAncestor(A, B) || isAncestor(B, A)) continue
        A.shaded = true
        break
      }
    }
    for (let i = all.length - 1; i >= 0; i--) {
      const L = all[i]!
      L.dark = L.shaded && L.kids.every((k) => limbs.get(k)!.dark)
      L.mass = L.kids.length === 0 ? 1 : L.kids.reduce((sum, k) => sum + limbs.get(k)!.mass, 0)
    }

    const tips = all.filter((L) => L.kids.length === 0)
    let minY = GROUND_Y
    let minX = ROOT_X
    let maxX = ROOT_X
    for (const L of all) {
      minY = Math.min(minY, L.ey)
      minX = Math.min(minX, L.ex)
      maxX = Math.max(maxX, L.ex)
    }
    stats.height = GROUND_Y - minY
    stats.width = maxX - minX
    stats.lean = tips.reduce((sum, t) => sum + t.ex, 0) / tips.length - ROOT_X
    stats.lit = tips.filter((t) => !t.shaded).length / tips.length

    const pic = currentPicture()
    if (pic) {
      let covered = 0
      for (const [px, py] of pic.samples) {
        if (all.some((L) => Math.hypot(L.ex - px, L.ey - py) <= COVER || Math.hypot((L.sx + L.ex) / 2 - px, (L.sy + L.ey) / 2 - py) <= COVER)) covered++
      }
      stats.coverage = covered / pic.samples.length
      // Every limb end but the trunk's counts: the tree has to stay inside the picture.
      const ends = all.filter((L) => L.parent >= 0)
      // A bare trunk (every limb cut clean off) has nothing straying.
      stats.outside = ends.length === 0 ? 0 : ends.filter((L) => !inBlobs(pic.blobs, L.ex, L.ey, PIC_MARGIN)).length / ends.length
    } else {
      stats.coverage = 0
      stats.outside = 0
    }
  }

  // Removes a limb and everything grown on it. Returns how many limbs went.
  const remove = (limb: Limb): number => {
    let count = 0
    const stack = [limb.id]
    while (stack.length > 0) {
      const m = limbs.get(stack.pop()!)
      if (!m) continue
      stack.push(...m.kids)
      if (fallen.length < 60) fallen.push({ x1: m.sx, y1: m.sy, x2: m.ex, y2: m.ey, age: 0 })
      limbs.delete(m.id)
      count++
    }
    const parent = limb.parent >= 0 ? limbs.get(limb.parent) : undefined
    if (parent) parent.kids = parent.kids.filter((k) => k !== limb.id)
    return count
  }

  // ---- setup: a trunk, a leader, and a side shoot --------------------------
  const root = addLimb(-1, between(rng, -0.06, 0.06), 120, false)
  root.lat = true
  addLimb(root.id, between(rng, -0.08, 0.08), 90, false)
  const sideSign = rng() < 0.5 ? -1 : 1
  addLimb(root.id, sideSign * between(rng, 0.8, 1.1), 70, false)
  relayout()

  // ---- the child's hands ----------------------------------------------------
  // The sim's own hit-test: the nearest limb within reach. A tip also answers
  // a little beyond its end, and on a tie the younger limb wins.
  const hit = (x: number, y: number): number => {
    let best = -1
    let bestD = Infinity
    for (const L of limbs.values()) {
      const dx = L.ex - L.sx
      const dy = L.ey - L.sy
      const len2 = dx * dx + dy * dy
      const t = len2 > 0 ? clamp(((x - L.sx) * dx + (y - L.sy) * dy) / len2, 0, 1) : 0
      let d = Math.hypot(x - (L.sx + dx * t), y - (L.sy + dy * t))
      if (L.kids.length === 0) d = Math.min(d, Math.max(0, Math.hypot(x - L.ex, y - L.ey) - TIP_PAD))
      if (d <= HIT_R && d <= bestD) {
        best = L.id
        bestD = d
      }
    }
    return best
  }

  const snip = (L: Limb, x: number, y: number) => {
    const dx = L.ex - L.sx
    const dy = L.ey - L.sy
    const len2 = dx * dx + dy * dy
    const t = len2 > 0 ? clamp(((x - L.sx) * dx + (y - L.sy) * dy) / len2, 0, 1) : 1
    if (L.parent >= 0 && t < CLEAN_T) {
      remove(L)
      relayout()
      emit({ kind: 'state', name: 'clean-cut' })
      return
    }
    for (const k of [...L.kids]) remove(limbs.get(k)!)
    L.len = Math.min(L.len, Math.max(L.parent < 0 ? ROOT_MIN : STUB_MIN, L.len * t))
    L.cut = true
    relayout()
    emit({ kind: 'state', name: 'snip' })
  }

  // Bend the limb so it points from its own base toward the finger.
  const aim = (L: Limb, x: number, y: number) => {
    if (Math.hypot(x - L.sx, y - L.sy) < 20) return
    const parentAbs = L.parent >= 0 ? limbs.get(L.parent)!.abs : -Math.PI / 2
    L.rel = norm(Math.atan2(y - L.sy, x - L.sx) - parentAbs)
    L.wired = true
    relayout()
  }

  // ---- the season -----------------------------------------------------------
  const growKid = (P: Limb, offset: number, len: number) => {
    let rel = offset
    if (!P.wired) {
      const desired = P.abs + offset + between(rng, -0.12, 0.12)
      rel = norm(toward(desired, offset === 0 ? TROPISM : FORK_TROPISM) - P.abs)
    }
    addLimb(P.id, rel, len, P.wired, 0).age = 0
  }

  const passSeason = () => {
    year++
    const list = [...limbs.values()]
    const tipCount = list.filter((L) => L.kids.length === 0).length
    const ext = EXT * clamp(1.5 - 0.1 * tipCount, 0.4, 1)
    let forked = false
    for (const L of list) {
      L.age++
      const room = limbs.size < MAX_LIMBS
      if (L.kids.length === 0) {
        if (L.cut) {
          L.cut = false
          if (room) {
            growKid(L, -FORK, ext * 0.8)
            growKid(L, FORK, ext * 0.8)
            forked = true
          }
        } else if (room) growKid(L, 0, ext)
        else L.len = Math.min(L.len + ext * 0.5, 260)
      } else if (room && !L.wired && !L.lat && L.kids.length === 1 && L.age >= 2 && rng() < LAT_P) {
        // A side shoot off the joint, on the outward side unless the dice flip it.
        const outward = (s: number) => Math.abs(L.ex + Math.cos(L.abs + s * 0.8) * 60 - ROOT_X)
        const side = (outward(1) >= outward(-1) ? 1 : -1) * (rng() < 0.25 ? -1 : 1)
        const desired = L.abs + side * between(rng, 0.6, 1)
        addLimb(L.id, norm(toward(desired, TROPISM) - L.abs), ext * 0.65, false, 0).age = 0
        L.lat = true
      }
    }
    relayout()
    emit({ kind: 'state', name: 'season' })
    if (forked) emit({ kind: 'state', name: 'fork' })

    for (const L of limbs.values()) L.dim = L.dark ? L.dim + 1 : 0
    const dropped: Limb[] = []
    const visit = (L: Limb) => {
      if (L.parent >= 0 && L.dark && L.dim >= DIM_LIMIT) dropped.push(L)
      else for (const k of L.kids) visit(limbs.get(k)!)
    }
    visit(root)
    for (const L of dropped) lost += remove(L)
    if (dropped.length > 0) {
      relayout()
      emit({ kind: 'state', name: 'drop' })
    }

    if (pictures.length > 0 && year >= 3 && limbs.size >= 6 && stats.coverage >= MATCH_COVER && stats.outside <= MATCH_SPILL) {
      matches++
      emit({ kind: 'hook', name: 'picture' })
      relayout()
    }
  }

  // ---- pointer ----------------------------------------------------------------
  const release = (id: number, x: number | null, y: number | null) => {
    const g = grabs.get(id)
    if (!g) return
    grabs.delete(id)
    const L = limbs.get(g.limb)
    if (!L) return
    if (g.wiring) {
      if (x !== null && y !== null) aim(L, x, y)
      emit({ kind: 'state', name: 'wire' })
    } else if (x !== null) snip(L, g.x, g.y)
  }

  const pointer = (input: PointerInput) => {
    idleTicks = 0
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (phase === 'down') {
      if (!finite) return
      // A second down on the same finger lets go of the first without a cut.
      grabs.delete(id)
      if (inside(BUTTON, x, y)) return passSeason()
      const limb = hit(x, y)
      if (limb >= 0) grabs.set(id, { limb, x, y, wiring: false })
      return
    }
    const g = grabs.get(id)
    if (!g) return
    if (phase === 'move' && finite) {
      if (!g.wiring && Math.hypot(x - g.x, y - g.y) >= DRAG_MIN) g.wiring = true
      const L = limbs.get(g.limb)
      if (g.wiring && L) aim(L, x, y)
    } else if (phase === 'up') release(id, finite ? x : null, finite ? y : null)
  }

  // One fixed tick: only the drawing clocks move, never the tree's structure.
  const step = () => {
    tick++
    idleTicks++
    for (const L of limbs.values()) if (L.g < 1) L.g = Math.min(1, L.g + 1 / GROW_TICKS)
    for (const f of fallen) f.age++
    while (fallen.length > 0 && fallen[0]!.age >= FALL_TICKS) fallen.shift()
  }

  // ---- reads --------------------------------------------------------------------
  const box = (cx: number, cy: number, size: number): Rect => ({
    x: clamp(cx - size / 2, 0, FIELD_W - size),
    y: clamp(cy - size / 2, 0, FIELD_H - size),
    w: size,
    h: size,
  })

  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    for (const L of limbs.values()) {
      if (L.kids.length === 0) list.push({ ...box(L.ex, L.ey, 100), kind: 'tap', salience: L.dim > 0 ? 0.9 : L.shaded ? 0.7 : 0.5 })
      if (L.parent >= 0 && L.len >= 40) {
        list.push({ ...box((L.sx + L.ex) / 2, (L.sy + L.ey) / 2, 90), kind: 'drag', salience: L.dim > 0 ? 0.6 : 0.3 })
      }
    }
    list.push({ ...BUTTON, kind: 'tap', salience: 0.6 })
    return list
  }

  const signature = (): string => {
    if (year === 0) return 'sapling'
    const h = stats.height < 260 ? 'low' : stats.height < 460 ? 'mid' : 'tall'
    const w = stats.width < 280 ? 'narrow' : stats.width < 560 ? 'medium' : 'wide'
    const l = stats.lean < -70 ? 'left' : stats.lean > 70 ? 'right' : 'centre'
    return `${h}-${w}-${l}${matches > 0 ? '+matched' : ''}`
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    return {
      signature: signature(),
      features: {
        spread: stats.width / (FIELD_W - 2 * MARGIN),
        height: stats.height / (GROUND_Y - MARGIN),
        limbs: limbs.size,
        lost,
        lit: stats.lit,
        season: year,
        fit: stats.coverage * (1 - stats.outside),
      },
      events,
    }
  }

  // Off by default for return and self-aim runs. Data for the view only.
  const hint = (): { x: number; y: number } | null => {
    if (!config.hints || idleTicks < HINT_AFTER_TICKS) return null
    for (const L of limbs.values()) if (L.dim > 0 && L.kids.length === 0) return { x: L.ex, y: L.ey }
    return { x: BUTTON.x + BUTTON.w / 2, y: BUTTON.y + BUTTON.h / 2 }
  }

  const snapshot = (): WiredSnapshot => {
    const pic = currentPicture()
    return {
      tick,
      year,
      lost,
      limbs: [...limbs.values()].map((L) => ({
        id: L.id,
        parent: L.parent,
        x1: L.sx,
        y1: L.sy,
        x2: L.sx + (L.ex - L.sx) * L.g,
        y2: L.sy + (L.ey - L.sy) * L.g,
        w: 4 + 2.6 * Math.sqrt(L.mass),
        heading: L.abs,
        wired: L.wired,
        cut: L.cut,
        shaded: L.shaded,
        dim: L.dim,
        tip: L.kids.length === 0,
      })),
      fallen: fallen.map((f) => ({ ...f })),
      button: { ...BUTTON },
      picture: pic ? { name: pic.name, blobs: pic.blobs.map((b) => ({ ...b })), matches } : null,
      hint: hint(),
    }
  }

  return { step, pointer, affordances, observe, snapshot }
}
