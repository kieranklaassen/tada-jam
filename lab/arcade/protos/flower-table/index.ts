// Flower Table: snip flowers in the cutting garden, pour water into a glass
// vase, stand the stems in it one by one, and carry the vase to a place in the
// room behind. Nothing is counted and nothing hurries; when the three vases
// stand in the room, the work is done and the room rests.
//
// One of the gentle set (see ../../GENTLE.md): no words, no numbers, no
// rewards. The flowers follow the season the prototype is opened in.

import { clamp, damp, ease, lerp, remap, rnd, shuffle, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { SEG, buildSpecies, drawFlower, layout, makeLeaves, seasonOf } from './flora.ts'
import type { Leaf, Season, Species } from './flora.ts'
import { TAU, drawSprite, makeRng } from './paint.ts'
import type { G } from './paint.ts'
import {
  BACK_Y,
  BED_FRONT_Y,
  CAT,
  FRONT_Y,
  JUG_HALF,
  NAIL,
  PAIL,
  PLACES,
  POST_L,
  POST_R,
  ROOM_S,
  SPOUT,
  TABLE_BACK,
  TABLE_L,
  VASE_Y,
  WINDOW,
  bitPath,
  buildArt,
  clipJug,
  drawCatTail,
  drawScissors,
  halfWidthAt,
} from './scene.ts'
import type { VaseSpec } from './scene.ts'

// Enough water for all three vases and a little over.
const JUG_CAP = 3.1
// Seconds for a cut plant to grow back.
const REGROW = 28
const MAX_IN_VASE = 8
// Lying flowers rest in this band of the table.
const LIE_TOP = 736
const LIE_BOTTOM = 762

interface Plant {
  sp: Species
  variant: number
  x: number
  y: number
  full: number
  len: number
  bloom: number
  phase: number
  lean: number
  bend: Spring
  leaves: Leaf[]
  wait: number
  wet: number
  pts: Float32Array
  tipA: number
}

interface Stem {
  sp: Species
  variant: number
  len: number
  leaves: Leaf[]
  where: 'held' | 'vase' | 'table' | 'fly' | 'soil'
  // The cut end: field coordinates, or the vase's own while standing in one.
  x: number
  y: number
  ang: Spring
  curve: number
  droop: number
  dir: number
  pts: Float32Array
  tipA: number
  // How far from the cut end the finger holds it.
  grip: number
  // In a vase: the lean it would like, its slot, and how far it has slid in.
  want: number
  tx: number
  ty: number
  fromX: number
  fromY: number
  settle: number
  alpha: number
  fade: number
  // True once the finger has taken it somewhere, so that a flower let go
  // where it was cut is never thrown away.
  carried: boolean
}

interface Vase {
  spec: VaseSpec
  x: number
  y: number
  s: number
  // -1 on the work table, otherwise an index into PLACES.
  place: number
  water: number
  stems: Stem[]
  tilt: Spring
  squash: Spring
  sway: Spring
  busy: boolean
  glow: number
  drain: number
}

interface Bit {
  // 0 leaf, 1 petal, 2 a piece of stalk.
  kind: number
  x: number
  y: number
  rot: number
  spin: number
  color: string
  size: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  t: number
  seed: number
  fall: number
  alpha: number
}

type Hold =
  | { kind: 'stem'; id: number; stem: Stem }
  | { kind: 'vase'; id: number; vase: Vase; ox: number; oy: number }
  | { kind: 'jug'; id: number }
  | { kind: 'brush'; id: number }
  | { kind: 'scissors'; id: number }

// Scratch results of the last polyDist call.
let hitU = 0

// Distance from a field point to a stem whose cut end is at (ox, oy).
function polyDist(pts: Float32Array, ox: number, oy: number, s: number, x: number, y: number): number {
  const lx = (x - ox) / s
  const ly = (y - oy) / s
  let best = Infinity
  for (let i = 0; i < SEG; i++) {
    const ax = pts[i * 2]!
    const ay = pts[i * 2 + 1]!
    const dx = pts[i * 2 + 2]! - ax
    const dy = pts[i * 2 + 3]! - ay
    const l2 = dx * dx + dy * dy || 1
    const t = clamp(((lx - ax) * dx + (ly - ay) * dy) / l2, 0, 1)
    const d = Math.hypot(lx - (ax + dx * t), ly - (ay + dy * t))
    if (d < best) {
      best = d
      hitU = (i + t) / SEG
    }
  }
  return best * s
}

// How far a field point is from the edge of a stem's head (negative inside).
function headDist(pts: Float32Array, tipA: number, sp: Species, ox: number, oy: number, s: number, x: number, y: number): number {
  const cx = ox + (pts[SEG * 2]! + Math.sin(tipA) * sp.headC) * s
  const cy = oy + (pts[SEG * 2 + 1]! - Math.cos(tipA) * sp.headC) * s
  return Math.hypot(x - cx, y - cy) - sp.headR * s
}

function pointAt(pts: Float32Array, u: number, out: { x: number; y: number }): void {
  const f = clamp(u, 0, 1) * SEG
  const i = Math.min(SEG - 1, Math.floor(f))
  const fr = f - i
  out.x = pts[i * 2]! + (pts[i * 2 + 2]! - pts[i * 2]!) * fr
  out.y = pts[i * 2 + 1]! + (pts[i * 2 + 3]! - pts[i * 2 + 1]!) * fr
}

const BUTTERFLY: Record<Season, [string, string] | null> = {
  spring: ['#f6e58a', '#fbf2c0'],
  summer: ['#9fc3ea', '#e9f1fa'],
  autumn: ['#e08f3c', '#f3c070'],
  winter: null,
}

const DRIFT: Record<Season, string[]> = {
  spring: ['#fbe3e6', '#f8cdd6'],
  summer: [],
  autumn: ['#e08e3c', '#cf6a30', '#edb650'],
  winter: ['#ffffff'],
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const res = clamp(globalThis.devicePixelRatio ?? 1, 1, 2)
  // The season is the real one. For a grown-up who wants to see another,
  // `season=spring` (or summer, autumn, winter) in the address overrides it.
  const asked = typeof location === 'undefined' ? null : /[?&]season=(spring|summer|autumn|winter)/.exec(location.href)
  const season = asked ? (asked[1] as Season) : seasonOf(new Date().getMonth())
  const artRng = makeRng(20260930)
  const art = buildArt(season, res, artRng)
  const flora = buildSpecies(season, res, artRng)
  const tmp = { x: 0, y: 0 }

  // ---- Sound: the sound of the thing, kept low. ----
  const snd = {
    shing: () => sfx.tone({ freq: 1700, to: 2500, dur: 0.08, type: 'sine', vol: 0.022 }),
    snip() {
      sfx.noise({ dur: 0.035, vol: 0.1, freq: 5200, filter: 'highpass' })
      sfx.tone({ freq: 2100, to: 1500, dur: 0.05, type: 'triangle', vol: 0.05 })
      sfx.noise({ dur: 0.03, vol: 0.07, freq: 4200, filter: 'highpass', delay: 0.055 })
      sfx.tone({ freq: 1500, to: 1100, dur: 0.04, type: 'triangle', vol: 0.03, delay: 0.055 })
    },
    rustle: (vol = 0.045) => sfx.noise({ dur: 0.16, vol, freq: 2600, to: 1400, filter: 'bandpass', q: 0.7 }),
    tink(step: number, wet: boolean) {
      const f = sfx.scale(step) * 2
      sfx.tone({ freq: f, dur: 0.4, type: 'sine', vol: 0.045 })
      sfx.tone({ freq: f * 2.76, dur: 0.12, type: 'sine', vol: 0.012 })
      if (wet) sfx.tone({ freq: 420, to: 780, dur: 0.07, type: 'sine', vol: 0.06, delay: 0.03 })
    },
    tock(vol = 0.1) {
      sfx.tone({ freq: 170, to: 108, dur: 0.1, type: 'sine', vol })
      sfx.noise({ dur: 0.04, vol: vol * 0.45, freq: 520, filter: 'lowpass' })
    },
    knock: () => sfx.tone({ freq: 240, to: 165, dur: 0.06, type: 'triangle', vol: 0.06 }),
    pour(fill: number) {
      sfx.noise({ dur: 0.14, vol: 0.05, freq: 620 + 1500 * fill, filter: 'bandpass', q: 1.6 })
      if (Math.random() < 0.55) sfx.tone({ freq: 320 + 700 * fill + rnd(-40, 40), to: 520 + 900 * fill, dur: 0.05, type: 'sine', vol: 0.035 })
    },
    glug() {
      sfx.tone({ freq: 200 + rnd(-15, 15), to: 122, dur: 0.11, type: 'sine', vol: 0.11 })
      sfx.noise({ dur: 0.08, vol: 0.03, freq: 520, filter: 'lowpass' })
    },
    plop() {
      sfx.tone({ freq: 380, to: 720, dur: 0.08, type: 'sine', vol: 0.07 })
      sfx.noise({ dur: 0.1, vol: 0.025, freq: 1800, filter: 'bandpass' })
    },
    swish: (vol: number) => sfx.noise({ dur: 0.15, vol: 0.04 * vol, freq: 3200, to: 1900, filter: 'bandpass', q: 0.6 }),
    ring(step: number) {
      sfx.tone({ freq: sfx.scale(step), dur: 1.3, type: 'sine', vol: 0.05, attack: 0.012 })
      sfx.tone({ freq: sfx.scale(step) * 2, dur: 0.6, type: 'sine', vol: 0.012, attack: 0.012 })
    },
    purr() {
      for (let i = 0; i < 16; i++) sfx.noise({ dur: 0.05, vol: 0.06, freq: 210, filter: 'lowpass', q: 2, delay: i * 0.046 + (i > 7 ? 0.14 : 0) })
    },
    tick: () => sfx.tone({ freq: 820, dur: 0.03, type: 'sine', vol: 0.02 }),
  }

  // ---- The garden ----
  const plants: Plant[] = []
  const addPlant = (sp: Species, x: number, y: number) => {
    const full = sp.full * (0.94 + stage.rand() * 0.1)
    plants.push({
      sp,
      variant: stage.rand() < 0.5 ? 0 : 1,
      x,
      y,
      full,
      len: full,
      bloom: 1,
      phase: stage.rand() * TAU,
      lean: (stage.rand() - 0.5) * 0.16,
      bend: spring(0, 46, 4.2),
      leaves: makeLeaves(sp, stage.rand),
      wait: 0,
      wet: 0,
      pts: new Float32Array((SEG + 1) * 2),
      tipA: 0,
    })
  }
  const backRow = shuffle(flora.back, stage.rand)
  const frontRow = shuffle(flora.front, stage.rand)
  backRow.forEach((sp, i) => addPlant(sp, 46 + i * 72 + (stage.rand() - 0.5) * 10, BACK_Y))
  frontRow.forEach((sp, i) => addPlant(sp, 84 + i * 72 + (stage.rand() - 0.5) * 10, FRONT_Y))
  let soilWet = 0
  let soilWetX = 200

  // ---- Things on the table ----
  const makeVase = (kind: number, x: number): Vase => ({
    spec: art.vases[kind]!,
    x,
    y: VASE_Y,
    s: 1,
    place: -1,
    water: 0,
    stems: [],
    tilt: spring(0, 70, 11),
    squash: spring(1, 260, 13),
    sway: spring(0, 42, 5),
    busy: false,
    glow: 0,
    drain: 0,
  })
  const vases: Vase[] = [makeVase(0, 552), makeVase(1, 704), makeVase(2, 856)]
  const loose: Stem[] = []
  const bits: Bit[] = []

  const jugRestY = VASE_Y + 4 - JUG_HALF
  const jug = { x: 980, y: jugRestY, tilt: spring(0, 80, 13), water: JUG_CAP, flow: 0, pourT: 0, dip: false, endY: 0, busy: false, glugT: 0 }
  const brush = { x: 1014, y: 764, rot: spring(0, 120, 12), lastX: 1014, travel: 0, busy: false }
  const restX = NAIL.x - 16
  const restY = NAIL.y + 42
  const restRot = Math.PI - 0.1
  const sc = {
    x: restX,
    y: restY,
    rot: restRot,
    open: spring(0.12, 320, 20),
    swing: spring(0, 26, 1.5),
    mode: 'rest' as 'rest' | 'go' | 'shut' | 'back' | 'held',
    t: 0,
    fromX: 0,
    fromY: 0,
    fromRot: 0,
    toX: 0,
    toY: 0,
    toRot: 0,
    pending: null as (() => void) | null,
    cool: 0,
  }

  // ---- Living things ----
  const cat = { tail: spring(0, 30, 4), nextFlick: 9, stretch: 0 }
  const curtain = spring(0, 18, 2.2)
  const wings = BUTTERFLY[season]
  const fly = { x: 250, y: 300, tx: 250, ty: 300, resting: 0, plant: -1, flap: 0, seed: 0 }
  const drift = DRIFT[season].length > 0 ? [0, 1, 2, 3].map((i) => ({ x: 40 + i * 95, y: i * 170 - 80, seed: i * 2.3, color: DRIFT[season][i % DRIFT[season].length]! })) : []

  let hold: Hold | null = null
  let holdX = 0
  let holdVX = 0
  let lastTouch = 0
  let everCut = false
  let rested = false
  // 0..1: how settled the finished room is. It only warms the light.
  let rest = 0
  let pailRipple = 9
  let nextSway = 5

  // ---- Stems ----
  const newStem = (sp: Species, variant: number, len: number, leaves: Leaf[], x: number, y: number, a: number): Stem => ({
    sp,
    variant,
    len,
    leaves,
    where: 'held',
    x,
    y,
    ang: spring(a, 70, 6),
    curve: 0.05,
    droop: 0,
    dir: Math.random() < 0.5 ? -1 : 1,
    pts: new Float32Array((SEG + 1) * 2),
    tipA: a,
    grip: 0,
    want: 0,
    tx: 0,
    ty: 0,
    fromX: 0,
    fromY: 0,
    settle: 1,
    alpha: 1,
    fade: 0,
    carried: false,
  })

  const addBit = (kind: number, fromX: number, fromY: number, toX: number, toY: number, color: string, size: number) => {
    if (bits.length > 36) return
    bits.push({ kind, x: fromX, y: fromY, rot: rnd(0, TAU), spin: rnd(-3, 3), color, size, fromX, fromY, toX, toY, t: 0, seed: rnd(0, 9), fall: 0, alpha: 1 })
  }

  const dropPetal = (x: number, y: number, color: string) => addBit(1, x, y, clamp(x + rnd(-40, 40), TABLE_L + 20, W - 30), rnd(LIE_TOP - 8, LIE_BOTTOM + 8), color, rnd(5, 7))

  // Lay a stem on the table, centred near x.
  const layDown = (st: Stem, x: number, quiet = false) => {
    const half = st.len / 2
    const dir = Math.random() < 0.5 ? -1 : 1
    const cx = clamp(x, TABLE_L + 62 + half, W - 50 - half)
    const bx = cx - dir * half
    const by = rnd(LIE_TOP, LIE_BOTTOM)
    const fromX = st.x
    const fromY = st.y
    st.where = 'fly'
    st.ang.damping = 15
    st.ang.target = dir * (Math.PI / 2 - rnd(0.03, 0.09))
    st.curve = dir * 0.1
    st.dir = dir
    const arc = fromX < POST_R ? 90 : 26
    stage.tween(
      fromX < POST_R ? 0.55 : 0.32,
      (t) => {
        st.x = lerp(fromX, bx, t)
        st.y = lerp(fromY, by, t) - Math.sin(t * Math.PI) * arc
      },
      ease.inOutQuad,
      () => {
        if (st.where !== 'fly') return
        st.where = 'table'
        if (!quiet) {
          snd.rustle(0.035)
          snd.tock(0.035)
        }
        if (Math.random() < 0.3) dropPetal(st.x + st.pts[SEG * 2]!, st.y - 16, st.sp.petal)
      },
    )
  }

  // Back to the earth: it lies in the bed for a while and is gone.
  const toSoil = (st: Stem, x: number, y: number, arc = 0) => {
    const fromX = st.x
    const fromY = st.y
    st.where = 'soil'
    st.ang.damping = 15
    // Lie towards the middle of the bed, so the head stays in sight.
    st.ang.target = (x < 195 ? 1 : -1) * (Math.PI / 2 - rnd(0, 0.12))
    st.fade = 2.6
    stage.tween(
      arc > 0 ? 0.6 : 0.45,
      (t) => {
        st.x = lerp(fromX, x, t)
        st.y = lerp(fromY, y, arc > 0 ? t : t * t) - Math.sin(t * Math.PI) * arc
      },
      arc > 0 ? ease.inOutQuad : ease.linear,
      () => snd.rustle(0.03),
    )
  }

  // Share the opening of a vase between its stems: each wants its own lean,
  // none may sit on top of another, and the rim holds them all in.
  const arrange = (v: Vase) => {
    const n = v.stems.length
    if (n === 0) return
    const { amax } = v.spec
    const order = [...v.stems].sort((a, b) => a.want - b.want)
    const t = order.map((s) => clamp(s.want, -amax, amax))
    const gap = n > 1 ? Math.min(0.2, (2 * amax) / (n - 1)) : 0
    for (let pass = 0; pass < 8; pass++) {
      for (let i = 0; i < n - 1; i++) {
        const d = t[i + 1]! - t[i]!
        if (d < gap) {
          const push = (gap - d) / 2
          t[i] = t[i]! - push
          t[i + 1] = t[i + 1]! + push
        }
      }
      t[0] = Math.max(t[0]!, -amax)
      t[n - 1] = Math.min(t[n - 1]!, amax)
      for (let i = 1; i < n; i++) t[i] = Math.max(t[i]!, t[i - 1]! + gap * 0.98)
      for (let i = n - 2; i >= 0; i--) t[i] = Math.min(t[i]!, t[i + 1]! - gap * 0.98)
    }
    order.forEach((s, i) => {
      const a = clamp(t[i]!, -amax, amax)
      s.ang.target = a
      s.curve = a * 1.5
      if (Math.abs(a) > 0.04) s.dir = a > 0 ? 1 : -1
      s.tx = (-a / amax) * v.spec.bot * 0.5
      // A stem too short for the vase rides up so its head rests on the rim.
      s.ty = -6 - Math.max(0, v.spec.h + 16 - s.len)
    })
  }

  const landInVase = (st: Stem, v: Vase) => {
    const wet = v.water > 0.08
    snd.tink(v.spec.step, wet)
    v.squash.value = 0.965
    v.sway.kick(st.ang.target > 0 ? 0.5 : -0.5)
    for (const other of v.stems) if (other !== st) other.ang.kick((other.ang.target - st.ang.target > 0 ? 1 : -1) * 0.7)
    if (wet) fx.burst(v.x, v.y - 8 - v.water * (v.spec.h - 18), { count: 3, color: '#cfe8f0', speed: 90, life: 0.4, size: 4, gravity: 420, angle: -Math.PI / 2, spread: 1.4 })
    // The lowest leaf is stripped by the rim and falls beside the vase.
    if (st.leaves.length > 0 && st.sp.leaf.len > 0 && Math.random() < 0.55) {
      const side = Math.random() < 0.5 ? -1 : 1
      addBit(0, v.x + side * v.spec.rim, v.y - v.spec.h, v.x + side * rnd(44, 80), rnd(LIE_TOP - 6, LIE_BOTTOM), st.sp.leaf.color, rnd(7, 10))
      if (st.leaves[0]!.t < 0.3) st.leaves.shift()
    }
  }

  const putInVase = (st: Stem, v: Vase, dropX: number) => {
    const i = loose.indexOf(st)
    if (i >= 0) loose.splice(i, 1)
    st.where = 'vase'
    st.fromX = clamp(st.x - v.x, -v.spec.rim + 8, v.spec.rim - 8)
    st.fromY = Math.min(st.y - v.y, -v.spec.h - 6)
    st.x = st.fromX
    st.y = st.fromY
    st.want = clamp((dropX - v.x) / (v.spec.rim + 36), -1, 1) * v.spec.amax + rnd(-0.05, 0.05)
    st.ang.damping = 6
    st.settle = 0
    v.stems.push(st)
    arrange(v)
    stage.tween(0.24, (t) => (st.settle = t), ease.inQuad, () => {
      if (st.where === 'vase' && v.stems.includes(st)) landInVase(st, v)
    })
  }

  const cutPlant = (p: Plant, h: number): Stem => {
    pointAt(p.pts, h / p.len, tmp)
    const len = p.len - h
    const leaves: Leaf[] = []
    for (const lf of p.leaves) {
      const at = lf.t * p.full
      if (at > h + 8 && at < p.len - 6) leaves.push({ t: (at - h) / len, side: lf.side, size: lf.size })
    }
    const st = newStem(p.sp, p.variant, len, leaves, p.x + tmp.x, p.y + tmp.y, p.tipA * 0.6)
    st.ang.kick(rnd(-1.5, 1.5))
    loose.push(st)
    p.len = h
    p.bloom = 0
    p.wait = 3
    p.bend.kick(rnd(2.5, 4) * (Math.random() < 0.5 ? -1 : 1))
    for (const q of plants) if (q !== p && Math.abs(q.x - p.x) < 90) q.bend.kick(rnd(-1, 1))
    fx.burst(st.x, st.y, { count: 4, color: [p.sp.leaf.color, p.sp.leaf.color2, p.sp.stem], speed: 110, life: 0.7, size: 4, gravity: 320, angle: -Math.PI / 2, spread: 2.4 })
    everCut = true
    return st
  }

  // ---- Scissors ----
  const sendScissors = (x: number, y: number, fn: () => void) => {
    if (sc.mode === 'held') {
      fn()
      return
    }
    if (sc.pending) {
      const before = sc.pending
      sc.pending = null
      before()
    }
    sc.fromX = sc.x
    sc.fromY = sc.y
    sc.fromRot = sc.rot
    sc.toX = x + 26
    sc.toY = y + 5
    sc.toRot = TAU - Math.PI / 2 + 0.18
    sc.mode = 'go'
    sc.t = 0
    sc.open.target = 1
    sc.pending = fn
    snd.shing()
  }

  const shut = () => {
    sc.open.value = 0.02
    sc.open.vel = 0
    sc.cool = 0.45
    snd.snip()
  }

  // ---- Looking for what a finger is on ----
  const nearestPlant = (x: number, y: number, reach: number): Plant | null => {
    let best: Plant | null = null
    let bestD = reach
    let bestU = 0
    for (let i = plants.length - 1; i >= 0; i--) {
      const p = plants[i]!
      if (y > p.y - 10 || y < p.y - p.len - p.sp.headC - p.sp.headR - 24) continue
      let d = polyDist(p.pts, p.x, p.y, 1, x, y)
      if (p.bloom > 0.6) {
        const dHead = headDist(p.pts, p.tipA, p.sp, p.x, p.y, 1, x, y)
        if (dHead < d) {
          d = Math.max(0, dHead)
          hitU = 1
        }
      }
      if (d < bestD) {
        bestD = d
        best = p
        bestU = hitU
      }
    }
    hitU = bestU
    return best
  }

  const pickStem = (x: number, y: number): Stem | null => {
    let best: Stem | null = null
    let bestD = Infinity
    let bestU = 0
    for (const v of vases) {
      if (v.place >= 0 || v.busy) continue
      const rimY = v.y - v.spec.h * v.s
      for (const st of v.stems) {
        const ox = v.x + st.x * v.s
        const oy = v.y + st.y * v.s
        const dHead = headDist(st.pts, st.tipA, st.sp, ox, oy, v.s, x, y)
        if (dHead < 16 && dHead < bestD) {
          best = st
          bestD = dHead
          bestU = 1
        } else if (y < rimY - 4) {
          const d = polyDist(st.pts, ox, oy, v.s, x, y)
          if (d < 15 && d + 12 < bestD) {
            best = st
            bestD = d + 12
            bestU = hitU
          }
        }
      }
    }
    for (const st of loose) {
      if (st.where !== 'table') continue
      const d = polyDist(st.pts, st.x, st.y, 1, x, y)
      const u = hitU
      const dHead = headDist(st.pts, st.tipA, st.sp, st.x, st.y, 1, x, y)
      const near = Math.min(d - 8, dHead)
      if (near < 22 && near < bestD) {
        best = st
        bestD = near
        bestU = dHead < d ? 1 : u
      }
    }
    hitU = bestU
    return best
  }

  const pickVase = (x: number, y: number): Vase | null => {
    for (let i = vases.length - 1; i >= 0; i--) {
      const v = vases[i]!
      if (v.busy) continue
      if (v.place >= 0) {
        if (Math.abs(x - v.x) < 60 && y < v.y + 20 && y > v.y - 190) return v
      } else if (Math.abs(x - v.x) < v.spec.wide + 16 && y < v.y + 14 && y > v.y - v.spec.h - 8) return v
    }
    return null
  }

  // The nearest spot on the table where a vase has room to stand.
  const freeX = (x: number, self: Vase): number => {
    const want = clamp(x, 488, 1020)
    const clear = (at: number) => {
      if (at < 488 || at > 1020) return false
      for (const o of vases) if (o !== self && o.place < 0 && Math.abs(at - o.x) < 100) return false
      return hold?.kind === 'jug' || Math.abs(at - jug.x) > 78
    }
    for (let d = 0; d < 540; d += 6) {
      if (clear(want + d)) return want + d
      if (clear(want - d)) return want - d
    }
    return want
  }

  const allPlaced = () => vases.every((v) => v.place >= 0)

  const landVase = (v: Vase, place: number) => {
    v.busy = false
    v.place = place
    v.squash.value = 0.9
    v.sway.kick(rnd(-1.2, 1.2))
    for (const st of v.stems) st.ang.kick(rnd(-0.8, 0.8))
    // Glass set down on wood: a knock, and the vase rings a little.
    snd.tock(place >= 0 ? 0.07 : 0.1)
    snd.ring(v.spec.step)
    if (place < 0) return
    if (place === 0) curtain.kick(1.2)
    if (allPlaced()) rested = true
  }

  const glide = (v: Vase, x: number, y: number, s: number, place: number) => {
    const fromX = v.x
    const fromY = v.y
    const fromS = v.s
    v.busy = true
    v.tilt.target = 0
    v.sway.target = 0
    stage.tween(
      0.34,
      (t) => {
        v.x = lerp(fromX, x, t)
        v.y = lerp(fromY, y, t)
        v.s = lerp(fromS, s, t)
      },
      ease.inOutQuad,
      () => landVase(v, place),
    )
  }

  const settleVase = (v: Vase) => {
    if (v.x > POST_R + 10 && v.y < TABLE_BACK - 26) {
      let best = -1
      let bestD = Infinity
      PLACES.forEach((p, i) => {
        if (vases.some((o) => o !== v && o.place === i)) return
        const d = Math.hypot(p.x - v.x, (p.y - v.y) * 1.4)
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      if (best >= 0) {
        glide(v, PLACES[best]!.x, PLACES[best]!.y, ROOM_S, best)
        return
      }
    }
    glide(v, freeX(v.x < POST_R + 10 ? 500 : v.x, v), VASE_Y, 1, -1)
  }

  // ---- Releasing ----
  const dropStem = (st: Stem, x: number, y: number) => {
    let best: Vase | null = null
    let bestD = Infinity
    for (const v of vases) {
      if (v.place >= 0 || v.busy || y > v.y + 24) continue
      const d = Math.min(Math.abs(x - v.x), Math.abs(st.x - v.x) + 14)
      if (d < v.spec.rim + 46 && d < bestD) {
        best = v
        bestD = d
      }
    }
    if (best && best.stems.length < MAX_IN_VASE) putInVase(st, best, x)
    else if (x < POST_L && y > 628 && st.carried) toSoil(st, clamp(st.x, 30, 360), rnd(676, 700))
    else layDown(st, x < POST_R ? rnd(520, 700) : x)
  }

  const release = (x: number, y: number) => {
    const h = hold
    hold = null
    if (!h) return
    if (h.kind === 'stem') dropStem(h.stem, x, y)
    else if (h.kind === 'vase') settleVase(h.vase)
    else if (h.kind === 'jug') {
      const fromX = jug.x
      const fromY = jug.y
      const wantX = clamp(jug.dip ? 996 : jug.x, 474, 1000)
      let toX = wantX
      for (let d = 0; d < 560; d += 6) {
        const clear = (at: number) => at >= 474 && at <= 1000 && vases.every((v) => v.place >= 0 || Math.abs(at - v.x) > 80)
        if (clear(wantX + d)) {
          toX = wantX + d
          break
        }
        if (clear(wantX - d)) {
          toX = wantX - d
          break
        }
      }
      const lift = jug.dip ? 70 : 0
      jug.dip = false
      jug.busy = true
      jug.tilt.target = 0
      stage.tween(
        lift ? 0.4 : 0.24,
        (t) => {
          jug.x = lerp(fromX, toX, t)
          jug.y = lerp(fromY, jugRestY, t) - Math.sin(t * Math.PI) * lift
        },
        ease.inOutQuad,
        () => {
          jug.busy = false
          snd.tock(0.08)
        },
      )
    } else if (h.kind === 'brush') {
      const fromX = brush.x
      const fromY = brush.y
      const toX = clamp(brush.x, 476, 1090)
      const toY = clamp(brush.y, LIE_TOP + 8, 768)
      brush.busy = true
      stage.tween(
        0.18,
        (t) => {
          brush.x = lerp(fromX, toX, t)
          brush.y = lerp(fromY, toY, t)
        },
        ease.inQuad,
        () => {
          brush.busy = false
          brush.lastX = brush.x
          if (Math.abs(toY - fromY) > 6) snd.tock(0.04)
        },
      )
    } else {
      sc.fromX = sc.x
      sc.fromY = sc.y
      sc.fromRot = sc.rot
      sc.mode = 'back'
      sc.t = 0
      sc.open.target = 0.12
    }
  }

  // ---- Touching the scene itself ----
  const gardenTouch = (p: Pointer) => {
    const plant = nearestPlant(p.x, p.y, 46)
    if (plant && plant.bloom > 0.6 && plant.len > 80) {
      // A finger on the stem cuts it there. A finger on the flower itself
      // takes it with a middling length of stem.
      const onHead = hitU > 0.94
      const h = onHead ? plant.len * 0.42 : clamp(plant.y - p.y, 30, plant.len - 28)
      const id = p.id
      plant.bend.kick(p.x < plant.x ? 1.2 : -1.2)
      pointAt(plant.pts, h / plant.len, tmp)
      sendScissors(plant.x + tmp.x, plant.y + tmp.y, () => {
        // Another finger may have cut this one while the scissors were on their way.
        if (plant.bloom <= 0.6 || plant.len < h + 26) return
        const st = cutPlant(plant, h)
        const finger = stage.pointers.get(id)
        if (finger && finger.down && !hold) {
          hold = { kind: 'stem', id, stem: st }
          if (onHead) st.grip = Math.max(0, st.len - 30)
          holdX = finger.x
          holdVX = 0
        } else layDown(st, rnd(520, 720), true)
      })
      return
    }
    // Not a stem to cut: the leaves stir away from the finger.
    for (const q of plants) {
      const d = q.x - p.x
      if (Math.abs(d) < 130) q.bend.kick((d >= 0 ? 1 : -1) * (1.6 - Math.abs(d) / 110))
    }
    snd.rustle(0.04)
  }

  const ambientTouch = (p: Pointer) => {
    const { x, y } = p
    if (x < POST_L - 4) {
      gardenTouch(p)
      return
    }
    if (Math.abs(x - PAIL.x) < PAIL.rx + 6 && y > PAIL.rimY - 22 && y < PAIL.y + 6) {
      snd.plop()
      pailRipple = 0
      fx.burst(x, PAIL.rimY + 4, { count: 3, color: '#d8eef4', speed: 80, life: 0.4, size: 4, gravity: 420, angle: -Math.PI / 2, spread: 1.2 })
      return
    }
    if (Math.abs(x - (CAT.x + 6)) < 88 && y > CAT.y - 80 && y < CAT.y + 14) {
      // Stroked, the cat purrs and has a slow stretch. It does not wake.
      snd.purr()
      cat.tail.kick(2.6)
      if (cat.stretch <= 0) cat.stretch = 1
      return
    }
    if (y > TABLE_BACK && x > TABLE_L - 10) {
      snd.knock()
      fx.ring(x, y, 'rgba(255,246,225,0.5)', 20, 0.3)
      return
    }
    if (x > WINDOW.l - 40 && x < WINDOW.r + 40 && y < WINDOW.b + 20) curtain.kick(x < (WINDOW.l + WINDOW.r) / 2 ? 1.6 : -1.6)
    snd.tick()
    fx.burst(x, y, { count: 3, color: 'rgba(255,248,225,0.8)', speed: 26, life: 0.9, size: 3, gravity: -14, drag: 0.94 })
  }

  // ---- Per-frame work for whatever the finger holds ----
  const updateHold = (dt: number) => {
    if (!hold) return
    const p = stage.pointers.get(hold.id)
    if (!p) {
      release(holdX, 600)
      return
    }
    holdVX = damp(holdVX, (p.x - holdX) / Math.max(dt, 0.001), 14, dt)
    holdX = p.x

    if (hold.kind === 'stem') {
      const st = hold.stem
      const low = st.grip / st.len < 0.5
      st.ang.target = clamp(holdVX * 0.0009 * (low ? -1 : 1), -0.6, 0.6)
      if (p.x > POST_R) st.carried = true
      st.droop = damp(st.droop, 0, 6, dt)
      st.curve = damp(st.curve, 0.05 * st.dir, 5, dt)
      pointAt(st.pts, st.grip / st.len, tmp)
      st.x = damp(st.x, p.x - tmp.x, 30, dt)
      st.y = damp(st.y, p.y - tmp.y, 30, dt)
      return
    }

    if (hold.kind === 'vase') {
      const v = hold.vase
      v.x = damp(v.x, p.x + hold.ox, 24, dt)
      v.y = Math.min(damp(v.y, p.y + hold.oy, 24, dt), VASE_Y + 4)
      const overGarden = v.x < POST_L - 6
      v.s = damp(v.s, overGarden ? 1 : remap(v.y, 470, 640, ROOM_S, 1), 14, dt)
      v.tilt.target = overGarden ? -2 : clamp(holdVX * 0.00025, -0.14, 0.14)
      v.sway.target = clamp(-holdVX * 0.0005, -0.3, 0.3)
      if (v.tilt.value < -1.1) {
        // Old water and old flowers go back to the earth.
        const mx = v.x - v.spec.h * 0.46
        const my = v.y - v.spec.h * 0.3
        v.drain += dt
        if (v.water > 0) {
          v.water = Math.max(0, v.water - dt * 1.3)
          soilWet = Math.min(1, soilWet + dt * 1.5)
          soilWetX = clamp(mx, 40, 360)
          for (const q of plants) if (Math.abs(q.x - mx) < 120) q.wet = 14
          if (v.drain > 0.1) {
            v.drain = 0
            snd.pour(0.2)
            fx.burst(mx, my, { count: 3, color: '#cfe8f0', speed: 60, life: 0.6, size: 5, gravity: 700, angle: Math.PI / 2, spread: 0.6 })
          }
        } else if (v.drain > 0.17 && v.stems.length > 0) {
          v.drain = 0
          const st = v.stems.pop()!
          st.x = mx
          st.y = my
          loose.push(st)
          toSoil(st, clamp(mx + rnd(-70, 40), 30, 360), rnd(676, 700))
          arrange(v)
        }
      }
      return
    }

    if (hold.kind === 'jug') {
      const px = p.x
      const py = p.y
      let tx = px
      let ty = py - 6
      let tilt = 0
      let endY = 0
      let target: Vase | null = null
      let garden = 0
      jug.dip = Math.abs(px - PAIL.x) < 58 && py > PAIL.rimY - 74
      if (jug.dip) {
        tx = PAIL.x + 2
        ty = clamp(py - 6, PAIL.rimY - 60, PAIL.rimY + 4)
        tilt = -0.42
        if (jug.y > PAIL.rimY - 34 && jug.water < JUG_CAP) {
          jug.water = Math.min(JUG_CAP, jug.water + dt * 2.3)
          jug.glugT -= dt
          if (jug.glugT <= 0) {
            jug.glugT = 0.19
            snd.glug()
            pailRipple = 0
            fx.burst(PAIL.x + rnd(-24, 24), PAIL.rimY + 2, { count: 1, color: '#e3f2f6', speed: 30, life: 0.5, size: 5, gravity: -40 })
          }
        }
      } else {
        let bestC = 0
        for (const v of vases) {
          if (v.place >= 0 || v.busy || v.water >= 0.999) continue
          if (py > v.y - v.spec.h * 0.35) continue
          const c = clamp(1 - (Math.abs(px - 30 - v.x) - 46) / 54, 0, 1)
          if (c > bestC) {
            bestC = c
            target = v
          }
        }
        if (target) {
          const rimY = target.y - target.spec.h
          tx = lerp(px, target.x + 62, bestC)
          ty = lerp(py - 6, Math.min(py - 6, rimY - 36), bestC)
          tilt = -1.25 * bestC
          endY = target.y - 5 - target.water * (target.spec.h - 18)
        } else if (px - 40 < POST_L - 10) {
          garden = clamp((POST_L - 10 - (px - 40)) / 50, 0, 1)
          tilt = -1.25 * garden
          ty = Math.min(ty, 610)
          endY = 688
        }
      }
      jug.x = damp(jug.x, tx, 20, dt)
      jug.y = damp(jug.y, ty, 20, dt)
      jug.tilt.target = tilt
      const wantFlow = !jug.dip && jug.water > 0 && (target || garden > 0) ? clamp((-jug.tilt.value - 0.6) / 0.55, 0, 1) : 0
      jug.flow = damp(jug.flow, wantFlow, 12, dt)
      jug.endY = endY
      if (jug.flow > 0.04) {
        const amount = Math.min(jug.water, jug.flow * 0.5 * dt)
        jug.water -= amount
        const sx = jug.x + SPOUT.x * Math.cos(jug.tilt.value) - SPOUT.y * Math.sin(jug.tilt.value) - 8
        let fill = 0.3
        if (target) {
          target.water = Math.min(1, target.water + amount / target.spec.vol)
          fill = target.water
          if (target.water >= 1) fx.burst(sx, endY - 4, { count: 4, color: '#d8eef4', speed: 70, life: 0.4, size: 4, gravity: 420, angle: -Math.PI / 2, spread: 1.6 })
        } else {
          soilWet = Math.min(1, soilWet + dt * 0.9)
          soilWetX = clamp(sx, 40, 360)
          for (const q of plants) if (Math.abs(q.x - sx) < 110) q.wet = 14
        }
        jug.pourT -= dt
        if (jug.pourT <= 0) {
          jug.pourT = 0.11
          snd.pour(fill)
          fx.burst(sx + rnd(-4, 4), endY - 2, { count: 1, color: '#d8eef4', speed: 60, life: 0.3, size: 3.5, gravity: 420, angle: -Math.PI / 2, spread: 1.6 })
        }
      }
      return
    }

    if (hold.kind === 'brush') {
      const onTable = p.y > TABLE_BACK + 40 && p.x > TABLE_L
      brush.x = damp(brush.x, p.x, 30, dt)
      brush.y = damp(brush.y, onTable ? clamp(p.y + 6, LIE_TOP + 4, 770) : p.y + 6, 30, dt)
      brush.rot.target = clamp(-holdVX * 0.00035, -0.3, 0.3)
      const moved = brush.x - brush.lastX
      if (onTable && Math.abs(moved) > 0.5) {
        let pushed = false
        const edge = brush.x + (moved > 0 ? 40 : -40)
        const sweep = (x: number, y: number): number => {
          if (Math.abs(y - brush.y + 6) > 44) return x
          if (moved > 0 && x > brush.lastX - 14 && x < edge) return edge + rnd(0, 5)
          if (moved < 0 && x < brush.lastX + 14 && x > edge) return edge - rnd(0, 5)
          return x
        }
        for (const b of bits) {
          if (b.t < 1 || b.fall > 0) continue
          const nx = sweep(b.x, b.y)
          if (nx !== b.x) {
            b.x = nx
            b.rot += moved * 0.04
            pushed = true
            if (b.x < TABLE_L - 6 || b.x > W + 12) b.fall = 0.001
          }
        }
        for (const st of loose) {
          if (st.where !== 'table') continue
          const mid = st.x + st.pts[SEG * 2]! / 2
          const nx = Math.min(sweep(mid, st.y), W - 60 - st.len / 2)
          if (nx !== mid) {
            st.x += nx - mid
            pushed = true
            // Swept off the end of the table, it lands back in the bed.
            if (nx < TABLE_L + 4) toSoil(st, rnd(230, 350), rnd(676, 700), 110)
          }
        }
        brush.travel += Math.abs(moved)
        if (brush.travel > 46) {
          brush.travel = 0
          snd.swish(pushed ? 1 : 0.6)
        }
      }
      brush.lastX = brush.x
      return
    }

    // Scissors in the hand: they cut where the finger is.
    sc.x = damp(sc.x, p.x + 10.5, 30, dt)
    sc.y = damp(sc.y, p.y + 19, 30, dt)
    sc.rot = damp(sc.rot, TAU - 0.5, 16, dt)
    if (sc.cool > 0) return
    if (p.x < POST_L) {
      const plant = nearestPlant(p.x, p.y, 13)
      if (plant && plant.bloom > 0.6 && plant.len > 80) {
        const h = clamp(plant.y - p.y, 30, plant.len - 28)
        if (Math.abs(plant.y - h - p.y) < 20) {
          const st = cutPlant(plant, h)
          shut()
          sc.open.target = 1
          layDown(st, rnd(520, 720), true)
        }
      }
      return
    }
    for (const st of loose) {
      if (st.where !== 'table') continue
      const d = polyDist(st.pts, st.x, st.y, 1, p.x, p.y)
      const u = hitU
      if (d > 12 || u * st.len < 24 || (1 - u) * st.len < 46) continue
      // Trim: the cut end stays on the table as a piece of stalk.
      pointAt(st.pts, u, tmp)
      addBit(2, st.x + tmp.x / 2, st.y + tmp.y / 2, st.x + tmp.x / 2, st.y + tmp.y / 2 + 3, st.sp.stem, (u * st.len) / 2)
      bits[bits.length - 1]!.rot = st.ang.value - Math.PI / 2
      bits[bits.length - 1]!.spin = 0
      bits[bits.length - 1]!.t = 0.8
      st.x += tmp.x
      st.y += tmp.y
      const kept: Leaf[] = []
      for (const lf of st.leaves) if (lf.t > u + 0.03) kept.push({ t: (lf.t - u) / (1 - u), side: lf.side, size: lf.size })
      st.leaves = kept
      st.len *= 1 - u
      shut()
      sc.open.target = 1
      fx.burst(p.x, p.y, { count: 3, color: [st.sp.stem, st.sp.leaf.color], speed: 80, life: 0.5, size: 3.5, gravity: 320, angle: -Math.PI / 2, spread: 2 })
      break
    }
  }

  const updateScissors = (dt: number) => {
    sc.open.update(dt)
    sc.swing.update(dt)
    if (sc.cool > 0) sc.cool -= dt
    if (sc.mode === 'rest') {
      sc.x = restX
      sc.y = restY
      sc.rot = restRot + sc.swing.value * 0.12
      // Until the first cut, the scissors stir on their nail now and then.
      if (!everCut && stage.time - lastTouch > 5 && stage.time > nextSway) {
        nextSway = stage.time + 4.5
        sc.swing.kick(2.4)
      }
    } else if (sc.mode === 'go') {
      sc.t = Math.min(1, sc.t + dt / 0.13)
      const e = ease.outCubic(sc.t)
      sc.x = lerp(sc.fromX, sc.toX, e)
      sc.y = lerp(sc.fromY, sc.toY, e)
      sc.rot = lerp(sc.fromRot, sc.toRot, e)
      if (sc.t >= 1) {
        sc.mode = 'shut'
        sc.t = 0
        shut()
        sc.open.target = 0.02
        const fn = sc.pending
        sc.pending = null
        fn?.()
      }
    } else if (sc.mode === 'shut') {
      sc.t += dt
      if (sc.t > 0.26) {
        sc.mode = 'back'
        sc.t = 0
        sc.fromX = sc.x
        sc.fromY = sc.y
        sc.fromRot = sc.rot
        sc.open.target = 0.12
      }
    } else if (sc.mode === 'back') {
      sc.t = Math.min(1, sc.t + dt / 0.42)
      const e = ease.inOutQuad(sc.t)
      sc.x = lerp(sc.fromX, restX, e)
      sc.y = lerp(sc.fromY, restY, e) - Math.sin(e * Math.PI) * 24
      sc.rot = lerp(sc.fromRot, restRot, e)
      if (sc.t >= 1) {
        sc.mode = 'rest'
        sc.swing.kick(3)
        sfx.tone({ freq: 1250, dur: 0.05, type: 'sine', vol: 0.018 })
      }
    }
  }

  const updateButterfly = (dt: number) => {
    if (!wings) return
    fly.seed += dt
    if (fly.resting > 0) {
      fly.resting -= dt
      fly.flap += dt * 2.2
      const plant = plants[fly.plant]
      if (plant && plant.bloom > 0.95) {
        fly.x = plant.x + plant.pts[SEG * 2]!
        fly.y = plant.y + plant.pts[SEG * 2 + 1]! - plant.sp.headR * 0.5
      } else fly.resting = 0
      if (fly.resting <= 0) {
        const open = plants.map((q, i) => (q.bloom > 0.95 ? i : -1)).filter((i) => i >= 0 && i !== fly.plant)
        fly.plant = open.length > 0 ? open[Math.floor(Math.random() * open.length)]! : -1
        fly.tx = rnd(60, 330)
        fly.ty = rnd(180, 330)
      }
      return
    }
    fly.flap += dt * 13
    const plant = plants[fly.plant]
    if (plant && plant.bloom > 0.95) {
      fly.tx = plant.x + plant.pts[SEG * 2]!
      fly.ty = plant.y + plant.pts[SEG * 2 + 1]! - plant.sp.headR * 0.5
    }
    const dx = fly.tx - fly.x
    const dy = fly.ty - fly.y
    const d = Math.hypot(dx, dy)
    if (d < 5) {
      if (plant && plant.bloom > 0.95) fly.resting = rnd(4, 9)
      else {
        const open = plants.map((q, i) => (q.bloom > 0.95 ? i : -1)).filter((i) => i >= 0)
        fly.plant = open.length > 0 ? open[Math.floor(Math.random() * open.length)]! : -1
        fly.tx = rnd(60, 330)
        fly.ty = rnd(180, 330)
      }
      return
    }
    const speed = 46
    fly.x += (dx / d) * speed * dt + Math.sin(fly.seed * 3.1) * 26 * dt
    fly.y += (dy / d) * speed * dt + Math.cos(fly.seed * 4.3) * 34 * dt
  }

  // ---- Drawing ----
  const drawStemAt = (g: G, st: Stem) => {
    g.translate(st.x, st.y)
    drawFlower(g, st.sp, st.variant, st.pts, st.tipA, st.leaves, 1, 1)
    g.translate(-st.x, -st.y)
  }

  const drawVase = (g: G, v: Vase) => {
    const sp = v.spec
    const lift = clamp((VASE_Y - v.y) / 110, 0, 1)
    if (v.place < 0 && v.x > TABLE_L && lift < 1) {
      g.fillStyle = `rgba(80,50,20,${0.17 * (1 - lift)})`
      g.beginPath()
      g.ellipse(v.x + 5, VASE_Y + 2, sp.bot + 14, 6, 0, 0, TAU)
      g.fill()
    } else if (v.place >= 0) {
      g.fillStyle = 'rgba(80,50,20,0.14)'
      g.beginPath()
      g.ellipse(v.x + 3, v.y + 1, (sp.bot + 10) * v.s, 3.4, 0, 0, TAU)
      g.fill()
    }
    g.save()
    g.translate(v.x, v.y)
    const tilt = v.tilt.value
    if (Math.abs(tilt) > 0.003) {
      g.translate(0, -sp.h * 0.5 * v.s)
      g.rotate(tilt)
      g.translate(0, sp.h * 0.5 * v.s)
    }
    const q = v.squash.value
    g.scale(v.s * (2 - q), v.s * q)
    g.drawImage(sp.back.c, -sp.back.ax, -sp.back.ay, sp.back.w, sp.back.h)
    for (const st of v.stems) drawStemAt(g, st)
    if (v.water > 0.01) {
      const top = -(5 + v.water * (sp.h - 18))
      const sy = sp.water.ay + top
      g.drawImage(sp.water.c, 0, sy * sp.water.res, sp.water.c.width, (sp.water.h - sy) * sp.water.res, -sp.water.ax, top, sp.water.w, sp.water.h - sy)
      g.fillStyle = 'rgba(214,238,244,0.75)'
      g.beginPath()
      g.ellipse(0, top, halfWidthAt(sp.prof, top) - 5, 3.2, 0, 0, TAU)
      g.fill()
    }
    g.drawImage(sp.front.c, -sp.front.ax, -sp.front.ay, sp.front.w, sp.front.h)
    g.restore()
  }

  const drawJug = (g: G) => {
    const tilt = jug.tilt.value
    if (!jug.dip && jug.y > jugRestY - 110 && jug.x > TABLE_L) {
      g.fillStyle = `rgba(80,50,20,${0.16 * clamp(1 - (jugRestY - jug.y) / 110, 0, 1)})`
      g.beginPath()
      g.ellipse(jug.x + 5, VASE_Y + 6, 40, 6, 0, 0, TAU)
      g.fill()
    }
    if (jug.flow > 0.03) {
      const c = Math.cos(tilt)
      const s = Math.sin(tilt)
      const sx = jug.x + SPOUT.x * c - SPOUT.y * s
      const sy = jug.y + SPOUT.x * s + SPOUT.y * c
      const wob = Math.sin(stage.time * 31) * 1.2
      g.strokeStyle = 'rgba(170,212,228,0.9)'
      g.lineWidth = 2.5 + jug.flow * 3.5
      g.beginPath()
      g.moveTo(sx, sy)
      g.quadraticCurveTo(sx - 9, sy + 4, sx - 10 + wob, jug.endY)
      g.stroke()
      g.strokeStyle = 'rgba(255,255,255,0.65)'
      g.lineWidth = 1.3
      g.beginPath()
      g.moveTo(sx - 1, sy + 1)
      g.quadraticCurveTo(sx - 10, sy + 5, sx - 11 + wob, jug.endY)
      g.stroke()
    }
    g.save()
    g.translate(jug.x, jug.y)
    g.rotate(tilt)
    if (jug.water > 0.01) {
      const frac = jug.water / JUG_CAP
      const spoutY = SPOUT.x * Math.sin(tilt) + SPOUT.y * Math.cos(tilt)
      const level = lerp(Math.max(lerp(40, -38, frac), spoutY + 3), spoutY + 3, jug.flow)
      g.save()
      clipJug(g)
      g.rotate(-tilt)
      g.fillStyle = 'rgba(96,170,202,0.6)'
      g.fillRect(-90, level, 180, 180)
      g.fillStyle = 'rgba(224,242,246,0.8)'
      g.fillRect(-90, level, 180, 2.4)
      g.restore()
    }
    g.drawImage(art.jug.c, -art.jug.ax, -art.jug.ay, art.jug.w, art.jug.h)
    g.restore()
  }

  const drawCurtains = (g: G) => {
    const t = stage.time
    const k = curtain.value
    for (const side of [-1, 1]) {
      const outer = side < 0 ? WINDOW.l - 26 : WINDOW.r + 26
      const inner = side < 0 ? WINDOW.l + 34 : WINDOW.r - 34
      const w1 = Math.sin(t * 0.5 + side) * 4 + k * 16 * side
      const w2 = Math.sin(t * 0.43 + 1.7 + side) * 6 + k * 26 * side
      g.fillStyle = 'rgba(250,238,220,0.94)'
      g.beginPath()
      g.moveTo(outer, WINDOW.t - 20)
      g.lineTo(inner - side * 8, WINDOW.t - 20)
      g.bezierCurveTo(inner + w1, WINDOW.t + 60, inner - side * 10 + w2, WINDOW.b - 70, inner - side * 4 + w2 * 1.3, WINDOW.b + 12)
      g.quadraticCurveTo((inner + outer) / 2 + w2 * 0.5, WINDOW.b + 20, outer + w2 * 0.2, WINDOW.b + 10)
      g.closePath()
      g.fill()
      g.strokeStyle = 'rgba(190,150,120,0.22)'
      g.lineWidth = 1.5
      for (const f of [0.3, 0.62]) {
        const x = lerp(outer, inner, f)
        g.beginPath()
        g.moveTo(x, WINDOW.t - 14)
        g.quadraticCurveTo(x + w1 * f, WINDOW.t + 100, x + w2 * f, WINDOW.b + 6)
        g.stroke()
      }
      g.strokeStyle = 'rgba(226,160,150,0.55)'
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(inner - side * 4 + w2 * 1.3, WINDOW.b + 6)
      g.quadraticCurveTo((inner + outer) / 2 + w2 * 0.5, WINDOW.b + 14, outer + w2 * 0.2, WINDOW.b + 4)
      g.stroke()
    }
  }

  const drawButterfly = (g: G) => {
    if (!wings) return
    const open = 0.2 + 0.8 * Math.abs(Math.sin(fly.flap))
    g.save()
    g.translate(fly.x, fly.y)
    g.rotate(Math.sin(fly.seed * 2) * 0.2)
    for (const side of [-1, 1]) {
      g.fillStyle = wings[0]
      g.beginPath()
      g.ellipse(side * 7 * open, -4, 8 * open, 9, side * 0.4, 0, TAU)
      g.fill()
      g.fillStyle = wings[1]
      g.beginPath()
      g.ellipse(side * 5.5 * open, 5, 5.5 * open, 6, side * -0.3, 0, TAU)
      g.fill()
    }
    g.strokeStyle = '#5a4030'
    g.lineWidth = 2.4
    g.beginPath()
    g.moveTo(0, -7)
    g.lineTo(0, 8)
    g.stroke()
    g.restore()
  }

  const game: Game = {
    update(dt) {
      const t = stage.time
      updateHold(dt)
      updateScissors(dt)
      updateButterfly(dt)

      for (const p of plants) {
        if (p.len < p.full) {
          if (p.wait > 0) p.wait -= dt
          else p.len = Math.min(p.full, p.len + ((dt * p.full) / REGROW) * (p.wet > 0 ? 3 : 1))
          const f = clamp((p.len / p.full - 0.7) / 0.3, 0, 1)
          p.bloom = f * f * (3 - 2 * f)
        }
        if (p.wet > 0) p.wet -= dt
        p.bend.update(dt)
        const sway = Math.sin(t * 0.6 + p.phase) * 0.04 + Math.sin(t * 1.7 + p.phase * 2) * 0.012
        p.tipA = layout(p.pts, p.len, p.lean * 0.3 + p.bend.value * 0.12, p.lean + sway + p.bend.value * 0.5, 0, 1)
      }
      soilWet = Math.max(0, soilWet - dt * 0.05)

      for (const v of vases) {
        v.tilt.update(dt)
        v.squash.update(dt)
        v.sway.update(dt)
        if (hold?.kind !== 'vase' || hold.vase !== v) {
          v.tilt.target = 0
          v.sway.target = 0
        }
        v.glow = damp(v.glow, v.place >= 0 ? 1 : 0, 1.4, dt)
        const dry = v.water < 0.08 ? 0.13 : 0
        for (const st of v.stems) {
          st.ang.update(dt)
          if (st.settle < 1) {
            st.x = lerp(st.fromX, st.tx, st.settle)
            st.y = lerp(st.fromY, st.ty, st.settle)
          } else {
            st.x = damp(st.x, st.tx, 9, dt)
            st.y = damp(st.y, st.ty, 9, dt)
          }
          const showing = st.len - (v.spec.h - 10)
          st.droop = damp(st.droop, clamp((showing - v.spec.droopAt) / 70, 0, 1) + dry, 2.6, dt)
          st.tipA = layout(st.pts, st.len, st.ang.value + v.sway.value, st.curve + Math.sin(t * 0.5 + st.len) * 0.012, st.droop, st.dir)
        }
      }

      for (let i = loose.length - 1; i >= 0; i--) {
        const st = loose[i]!
        st.ang.update(dt)
        if (st.where !== 'held') st.droop = damp(st.droop, 0, 6, dt)
        st.tipA = layout(st.pts, st.len, st.ang.value, st.curve, st.droop, st.dir)
        if (st.where === 'soil') {
          st.fade -= dt
          if (st.fade < 0) st.alpha = Math.max(0, st.alpha - dt / 4)
          if (st.alpha <= 0) loose.splice(i, 1)
        }
      }

      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i]!
        if (b.t < 1) {
          b.t = Math.min(1, b.t + dt / 0.9)
          b.x = lerp(b.fromX, b.toX, b.t) + Math.sin(b.t * 8 + b.seed) * 16 * (1 - b.t)
          b.y = lerp(b.fromY, b.toY, b.t * b.t)
          b.rot += b.spin * dt * (1 - b.t)
        } else if (b.fall > 0) {
          b.fall += dt
          b.y += (120 + b.fall * 500) * dt
          b.alpha = Math.max(0, 1 - b.fall / 0.5)
          if (b.alpha <= 0) bits.splice(i, 1)
        }
      }

      if (hold?.kind !== 'jug') {
        jug.tilt.target = 0
        jug.flow = damp(jug.flow, 0, 14, dt)
      }
      jug.tilt.update(dt)
      brush.rot.update(dt)
      if (hold?.kind !== 'brush') brush.rot.target = 0

      cat.tail.update(dt)
      cat.stretch = Math.max(0, cat.stretch - dt / 3.5)
      if (t > cat.nextFlick) {
        cat.nextFlick = t + rnd(9, 17)
        cat.tail.kick(1.6)
      }
      curtain.update(dt)
      pailRipple += dt
      if (rested && !allPlaced()) rested = false
      rest = damp(rest, rested ? 1 : 0, 0.5, dt)
      for (const d of drift) {
        d.y += dt * (season === 'winter' ? 26 : 34)
        d.x += Math.sin(t * 0.8 + d.seed) * 14 * dt
        if (d.y > 660) {
          d.y = -20
          d.x = rnd(20, 370)
        }
      }
    },

    draw(g) {
      const t = stage.time
      g.drawImage(art.bg.c, 0, 0, W, H)

      // Outdoors: whatever the season lets fall.
      for (const d of drift) {
        g.save()
        g.translate(d.x, d.y)
        g.rotate(Math.sin(t * 1.3 + d.seed) * 1.2)
        g.fillStyle = d.color
        bitPath(g, season === 'winter' ? 1 : 0, season === 'winter' ? 4 : 6)
        g.fill()
        g.restore()
      }

      // The room behind. When the work is done the afternoon light settles in.
      if (rest > 0.01) {
        g.fillStyle = `rgba(255,212,140,${(0.1 * rest).toFixed(3)})`
        g.fillRect(POST_R, 18, W - POST_R, TABLE_BACK - 18)
      }
      for (const v of vases) {
        if (v.glow < 0.02) continue
        g.globalAlpha = v.glow * (0.7 + rest * (0.22 + Math.sin(t * 0.6) * 0.06))
        drawSprite(g, art.glow, v.x, v.y - 70, 0, 1.15)
      }
      // While a vase is being carried, the empty mats catch the light.
      if (hold?.kind === 'vase') {
        PLACES.forEach((p, i) => {
          if (vases.some((v) => v.place === i)) return
          g.globalAlpha = 0.85 + Math.sin(t * 2.2 + i) * 0.15
          drawSprite(g, art.glow, p.x, p.y - 2, 0, 0.62, 0.3)
          drawSprite(g, art.glow, p.x, p.y - 2, 0, 0.3, 0.12)
        })
      }
      g.globalAlpha = 1
      drawCurtains(g)
      for (const v of vases) if (v.s < 0.8 && !(hold?.kind === 'vase' && hold.vase === v)) drawVase(g, v)
      const breath = Math.sin(t * 1.5)
      const stretch = Math.sin(Math.min(1, cat.stretch * 1.2) * Math.PI)
      drawSprite(g, art.cat, CAT.x, CAT.y, 0, 0.92 * (1 + stretch * 0.06), 0.92 * (1 + breath * 0.022 - stretch * 0.04))
      drawCatTail(g, CAT.x, CAT.y, 0.92, cat.tail.value * 0.5 + stretch * 0.6)

      // The garden.
      if (soilWet > 0.02) {
        g.fillStyle = `rgba(50,30,18,${0.3 * soilWet})`
        g.beginPath()
        g.ellipse(soilWetX, 690, 70, 16, 0, 0, TAU)
        g.fill()
      }
      for (const st of loose) {
        if (st.where !== 'soil' || st.x > POST_R) continue
        g.globalAlpha = st.alpha
        drawStemAt(g, st)
      }
      g.globalAlpha = 1
      for (const p of plants) {
        g.translate(p.x, p.y)
        drawFlower(g, p.sp, p.variant, p.pts, p.tipA, p.leaves, p.full / p.len, p.bloom)
        g.translate(-p.x, -p.y)
      }
      g.drawImage(art.bedFront.c, 0, BED_FRONT_Y, art.bedFront.w, art.bedFront.h)
      g.drawImage(art.post.c, POST_L, 0, art.post.w, art.post.h)
      if (sc.mode === 'rest') drawScissors(g, sc.x, sc.y, sc.rot, sc.open.value)

      // The work table.
      g.drawImage(art.pailBack.c, PAIL.x - art.pailBack.ax, PAIL.y - art.pailBack.ay, art.pailBack.w, art.pailBack.h)
      if (pailRipple < 1.2) {
        g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - pailRipple / 1.2)})`
        g.lineWidth = 1.6
        g.beginPath()
        g.ellipse(PAIL.x, PAIL.rimY + 5, 10 + pailRipple * 30, 2 + pailRipple * 5.5, 0, 0, TAU)
        g.stroke()
      }
      const glint = 0.25 + 0.2 * Math.sin(t * 0.9)
      g.fillStyle = `rgba(255,255,255,${glint})`
      g.beginPath()
      g.ellipse(PAIL.x + 14 + Math.sin(t * 0.4) * 8, PAIL.rimY + 8, 14, 2, 0, 0, TAU)
      g.fill()
      if (jug.dip) drawJug(g)
      g.drawImage(art.pailFront.c, PAIL.x - art.pailFront.ax, PAIL.y - art.pailFront.ay, art.pailFront.w, art.pailFront.h)

      const heldVase = hold?.kind === 'vase' ? hold.vase : null
      for (const v of vases) if (v.s >= 0.8 && v !== heldVase) drawVase(g, v)
      if (!jug.dip && hold?.kind !== 'jug') drawJug(g)

      for (const b of bits) {
        g.save()
        g.translate(b.x, b.y)
        g.rotate(b.rot)
        g.globalAlpha = b.alpha
        if (b.kind === 2) {
          g.strokeStyle = b.color
          g.lineWidth = 4.5
          g.beginPath()
          g.moveTo(-b.size, 0)
          g.lineTo(b.size, 0)
          g.stroke()
        } else {
          g.fillStyle = b.color
          bitPath(g, b.kind, b.size)
          g.fill()
        }
        g.restore()
      }
      g.globalAlpha = 1
      const heldStem = hold?.kind === 'stem' ? hold.stem : null
      for (const st of loose) {
        if (st === heldStem || (st.where === 'soil' && st.x <= POST_R)) continue
        if (st.where === 'table') {
          const hx = st.x + st.pts[SEG * 2]! + Math.sin(st.tipA) * st.sp.headC
          g.strokeStyle = 'rgba(80,50,20,0.2)'
          g.lineWidth = 6
          g.beginPath()
          g.moveTo(st.x, st.y + 5)
          g.lineTo(st.x + st.pts[SEG * 2]!, st.y + 6)
          g.stroke()
          g.fillStyle = 'rgba(80,50,20,0.16)'
          g.beginPath()
          g.ellipse(hx, st.y + 8, st.sp.headR + 6, 7, 0, 0, TAU)
          g.fill()
        }
        g.globalAlpha = st.alpha
        drawStemAt(g, st)
        g.globalAlpha = 1
      }
      if (hold?.kind !== 'brush') {
        g.fillStyle = 'rgba(80,50,20,0.14)'
        g.beginPath()
        g.ellipse(brush.x + 20, brush.y + 2, 60, 4, 0, 0, TAU)
        g.fill()
        drawSprite(g, art.brush, brush.x, brush.y, brush.rot.value)
      }

      // Whatever is in the hand goes on top.
      if (heldVase) drawVase(g, heldVase)
      if (hold?.kind === 'jug' && !jug.dip) drawJug(g)
      if (hold?.kind === 'brush') drawSprite(g, art.brush, brush.x, brush.y, brush.rot.value)
      if (heldStem) drawStemAt(g, heldStem)
      if (sc.mode !== 'rest') drawScissors(g, sc.x, sc.y, sc.rot, sc.open.value)
      drawButterfly(g)
    },

    down(p) {
      lastTouch = stage.time
      const { x, y } = p
      if (!hold) {
        if (sc.mode === 'rest' && Math.abs(x - NAIL.x) < 38 && y > NAIL.y - 26 && y < NAIL.y + 124) {
          hold = { kind: 'scissors', id: p.id }
          sc.mode = 'held'
          sc.open.target = 1
          sc.cool = 0.1
          holdX = x
          holdVX = 0
          snd.shing()
          return
        }
        const st = pickStem(x, y)
        if (st) {
          const u = hitU
          for (const v of vases) {
            const i = v.stems.indexOf(st)
            if (i < 0) continue
            v.stems.splice(i, 1)
            st.x = v.x + st.x * v.s
            st.y = v.y + st.y * v.s
            loose.push(st)
            arrange(v)
            v.squash.value = 1.03
            for (const other of v.stems) other.ang.kick(rnd(-0.6, 0.6))
            if (v.water > 0.08) {
              snd.plop()
              fx.burst(st.x, v.y - v.spec.h, { count: 3, color: '#d8eef4', speed: 70, life: 0.5, size: 4, gravity: 500, angle: Math.PI / 2, spread: 1 })
            }
            if (Math.random() < 0.35) dropPetal(x, y, st.sp.petal)
          }
          st.where = 'held'
          st.settle = 1
          st.ang.damping = 6
          st.grip = Math.min(u * st.len, Math.max(0, st.len - 42))
          hold = { kind: 'stem', id: p.id, stem: st }
          holdX = x
          holdVX = 0
          snd.rustle(0.035)
          return
        }
        if (!jug.busy && Math.abs(x - jug.x) < 48 && Math.abs(y - jug.y) < 58) {
          hold = { kind: 'jug', id: p.id }
          holdX = x
          holdVX = 0
          jug.pourT = 0
          sfx.tone({ freq: 900, dur: 0.05, type: 'sine', vol: 0.03 })
          return
        }
        if (!brush.busy && Math.abs(x - (brush.x + 22)) < 74 && Math.abs(y - (brush.y - 22)) < 36) {
          hold = { kind: 'brush', id: p.id }
          holdX = x
          holdVX = 0
          brush.lastX = brush.x
          snd.swish(0.5)
          return
        }
        const v = pickVase(x, y)
        if (v) {
          hold = { kind: 'vase', id: p.id, vase: v, ox: v.x - x, oy: v.y - y }
          holdX = x
          holdVX = 0
          v.place = -1
          v.squash.value = 1.04
          v.drain = 0
          snd.tink(v.spec.step, false)
          return
        }
      }
      ambientTouch(p)
    },

    up(p) {
      if (hold && hold.id === p.id) release(p.x, p.y)
    },
  }
  return game
}

export const proto: Proto = {
  meta: {
    key: 'flower-table',
    name: 'Flower Table',
    emoji: '💐',
    ages: [3, 7],
    pitch: 'Snip flowers in the garden, pour water into a glass vase, stand the stems in it one by one, and carry it to the windowsill.',
    howTo: 'Touch a stem where you want it cut and carry the flower to a vase. Drag the jug over a vase to pour. Drag a vase up into the room. To begin again, bring a vase back and tip it out over the garden; dip the jug in the pail.',
    basedOn: 'Montessori flower arranging (practical life) and the Waldorf seasonal table',
    whyFun: 'The snip, the stem sliding into glass and leaning against the others, water rising with its rising sound, and then seeing your own bouquet standing in the room.',
    set: 'gentle',
  },
  create,
}
