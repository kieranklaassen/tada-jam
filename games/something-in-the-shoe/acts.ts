import { ANKLE, BOOT, HEAD, PEEP } from './layout'
import { OWNER, type Lift, type OwnerId } from './owners'
import { actOf, inOrder, type ActName, type ThingId } from './things'

// What happens when a foot goes in: a pure picture of one owner and one boot
// for the things found, whoever finds them, and the seconds since the foot
// started down. The same moment is always the same picture, so an act can be
// shown in the one boot or five times over in a row, and tested without a
// canvas. Places are in the owner's own units: the origin is on the floor,
// the owner stands at `ox` and the boot in front of it.

export type Eyes = 'open' | 'wide' | 'shut' | 'happy' | 'cross'
export type Mouth = 'smile' | 'o' | 'grin' | 'wobble' | 'chew' | 'lick' | 'peel' | 'shut'

export type Pose = {
  dx: number; dy: number; rot: number; sx: number; sy: number
  /** Arms from hanging (0) to straight up (1). */
  arms: number
  /** Where the eyes look, each -1..1. */
  lookX: number; lookY: number
  eyes: Eyes; mouth: Mouth; tilt: number
  /** The ankle of the bare foot, and how it is turned. */
  footX: number; footY: number; footRot: number
  /** How far the toes have spread, 0..1. */
  toes: number
  boot: { dx: number; dy: number; rot: number; sx: number; sy: number }
  /** A hole in the toe of the boot with something in it, 0..1: what peeps out is in the items. */
  hole: number
  /** Porridge over the face, 0..1. */
  mask: number
}
/** A thing that can be seen, where it is and how it lies. `fat` is what a frog or a mouse has eaten. */
export type Item = { id: ThingId; x: number; y: number; rot: number; s: number; fat: number; over: boolean }
export type BitKind = 'juice' | 'crumb' | 'porridge' | 'ring' | 'puff' | 'moth' | 'lump'
export type Bit = { kind: BitKind; x: number; y: number; r: number }
export type Frame = { pose: Pose; items: Item[]; bits: Bit[] }

export const PLUNGE = 0.5
/** Everything stops while the eyes grow. */
export const HUSH = 0.6
export const BLISS = 1.4
export const OUT = 0.75

const { sin, cos, PI, max, min, floor, abs } = Math
export const clamp = (t: number): number => min(1, max(0, t))
export const span = (t: number, a: number, b: number): number => clamp((t - a) / (b - a))
export const ease = (t: number): number => t * t * (3 - 2 * t)
/** Overshoots and settles. */
export const spring = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-6 * t) * cos(t * 13))
const mix = (a: number, b: number, t: number): number => a + (b - a) * t

const CORE: Record<ActName, number> = {
  mandarin: 2.6, carrot: 2.5, biscuit: 2.8, frog: 3.4, mouse: 3, porridge: 3, bell: 3, empty: 2.2,
  'frog-mouse': 3.2, 'frog-porridge': 3.2, 'frog-bell': 3.4, 'frog-treat': 2.8,
  'mouse-porridge': 3.2, 'mouse-bell': 3.2, 'mouse-treat': 3, 'porridge-bell': 3.2, 'porridge-treat': 2.8,
  'bell-treat': 3.2, 'treat-treat': 2.8,
}

export function moodOf(found: readonly ThingId[], owner: OwnerId): 'loves' | 'minds' | null {
  return found.includes(OWNER[owner].loves) ? 'loves' : found.includes(OWNER[owner].minds) ? 'minds' : null
}
export function blissOf(found: readonly ThingId[], owner: OwnerId): number {
  return moodOf(found, owner) ? BLISS : 0
}
export function lengthOf(found: readonly ThingId[], owner: OwnerId): number {
  return PLUNGE + HUSH + CORE[actOf(found)] + blissOf(found, owner) + OUT
}
/** When the things have come out and the foot begins to: what is left is the way home. */
export function outAt(found: readonly ThingId[], owner: OwnerId): number {
  return lengthOf(found, owner) - OUT
}

export function rest(): Pose {
  return {
    dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, arms: 0, lookX: 0.5, lookY: 0.3, eyes: 'open', mouth: 'smile', tilt: 0,
    footX: ANKLE.x, footY: ANKLE.y, footRot: 0.16, toes: 0, boot: { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 }, hole: 0, mask: 0,
  }
}

/** Where a point of the owner or its boot is, once the pose has moved it. */
export function posed(p: Pose, ox: number, x: number, y: number): { x: number; y: number } {
  const px = ox + 60, lx = (x - px) * p.sx, ly = y * p.sy, c = cos(p.rot), s = sin(p.rot)
  return { x: px + lx * c - ly * s + p.dx, y: lx * s + ly * c + p.dy }
}

/** What an act draws with: the frame it fills, and the owner's own ways. */
class Scene {
  readonly f: Frame = { pose: rest(), items: [], bits: [] }
  readonly p = this.f.pose
  private readonly lift: Lift = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, arms: 0 }
  constructor(readonly owner: OwnerId, readonly ox: number, readonly far: number, readonly all: ThingId[]) {}

  /** The owner's own leap, `u` of the way through it. */
  leap(u: number, h: number): void {
    if (u <= 0 || u >= 1) return
    const l = this.lift, p = this.p
    OWNER[this.owner].leap(u, h, l)
    p.dx += l.dx; p.dy += l.dy; p.rot += l.rot; p.sx *= l.sx; p.sy *= l.sy; p.arms = max(p.arms, l.arms)
  }
  put(id: ThingId, x: number, y: number, rot = 0, s = 1, fat = 0, over = true): void {
    this.f.items.push({ id, x, y, rot, s, fat, over })
  }
  /** A thing that moves with the owner: on its head, at its mouth, on its boot. */
  on(id: ThingId, x: number, y: number, rot = 0, s = 1, fat = 0, over = true): void {
    const q = posed(this.p, this.ox, x, y)
    this.put(id, q.x, q.y, rot + this.p.rot, s, fat, over)
  }
  bit(kind: BitKind, x: number, y: number, r: number): void {
    if (r > 0.5) this.f.bits.push({ kind, x, y, r })
  }
  /** A place on the arc from one spot to another. */
  arc(a: Pt, b: Pt, u: number, h: number): Pt {
    return { x: mix(a.x, b.x, u), y: mix(a.y, b.y, u) - h * 4 * u * (1 - u) }
  }
  mouth(): Pt { return posed(this.p, this.ox, this.ox, HEAD.mouth) }
  head(): Pt { return posed(this.p, this.ox, this.ox, HEAD.top) }
  rim(): Pt { return posed(this.p, this.ox, BOOT.x, BOOT.rim) }
  toe(): Pt { return posed(this.p, this.ox, BOOT.toeX, BOOT.toeY) }
  /** Looks at a spot. */
  look(q: Pt): void {
    const h = posed(this.p, this.ox, this.ox, HEAD.y)
    const x = q.x - h.x, y = q.y - h.y, d = Math.hypot(x, y) || 1
    this.p.lookX = x / d; this.p.lookY = y / d
  }
  /** Chewing with full cheeks, from `at`. */
  chew(t: number, at: number): void {
    if (t < at) return
    this.p.mouth = 'chew'; this.p.eyes = 'happy'
    this.p.tilt += sin((t - at) * 18) * 0.05
  }
}
type Pt = { x: number; y: number }

/** A round trip over the owner: up the leg, over the head and down the far side, 0..1. */
function overBody(s: Scene, u: number): Pt {
  const ox = s.ox
  const path: Pt[] = [{ x: BOOT.x - 30, y: BOOT.rim }, { x: ox + 120, y: -430 }, { x: ox + 100, y: -520 }, { x: ox, y: HEAD.top - 20 }, { x: ox - 110, y: -480 }, { x: ox - 122, y: -260 }, { x: ox - 100, y: -130 }, { x: ox + 60, y: -170 }]
  const k = clamp(u) * (path.length - 1), i = min(path.length - 2, floor(k)), v = k - i
  return posed(s.p, ox, mix(path[i].x, path[i + 1].x, v), mix(path[i].y, path[i + 1].y, v))
}
const fountain = (s: Scene, kind: BitKind, from: Pt, t: number, n: number, reach: number, high: number, r: number): void => {
  for (let i = 0; i < n; i++) {
    const u = t * 1.5 - i * 0.055
    if (u <= 0 || u >= 1) continue
    const k = ((i * 37) % 11) / 11
    const q = s.arc(from, { x: from.x + (k - 0.5) * reach, y: from.y + 190 }, u, high * (0.7 + 0.5 * k))
    s.bit(kind, q.x, q.y, r * (0.6 + 0.6 * k))
  }
}
const stream = (s: Scene, kind: BitKind, a: Pt, b: Pt, t: number, n: number, gap: number, high: number, r: number): void => {
  for (let i = 0; i < n; i++) {
    const u = t - i * gap
    if (u <= 0 || u >= 1) continue
    const q = s.arc(a, b, u, high)
    s.bit(kind, q.x, q.y, r * (0.75 + 0.4 * sin(i * 2.1)))
  }
}
const rings = (s: Scene, q: Pt, t: number): void => {
  for (let i = 0; i < 3; i++) { const u = t * 1.6 - i * 0.22; if (u > 0 && u < 1) s.bit('ring', q.x, q.y, 34 + u * 110) }
}
/** Swelling in the boot before something comes out. */
const swell = (s: Scene, u: number): void => {
  const w = sin(u * PI * 9) * 0.04 * u
  s.p.boot.sx = 1 + 0.26 * u + w; s.p.boot.sy = 1 - 0.06 * u - w
  s.p.eyes = 'wide'; s.p.mouth = 'wobble'; s.p.lookX = 0.7; s.p.lookY = 0.8
}

type Core = (s: Scene, t: number, a: ThingId, b: ThingId) => void

const CORES: Record<ActName, Core> = {
  mandarin(s, t) {
    s.p.boot.sy = 1 - 0.1 * up(t, 0, 0.35); s.p.boot.sx = 1 + 0.12 * up(t, 0, 0.35)
    s.leap(span(t, 0.1, 1.1), 130)
    const rim = s.rim(), m = s.mouth()
    stream(s, 'juice', rim, m, span(t, 0.15, 1.8) * 2.4, 15, 0.085, 190, 24)
    fountain(s, 'juice', rim, span(t, 0.1, 1.4), 12, 300, 250, 15)
    s.p.lookX = 0.2; s.p.lookY = -0.9
    s.p.mouth = t > 0.45 && t < 1.7 ? 'o' : t >= 1.7 ? 'peel' : 'wobble'
    s.p.eyes = t > 1.7 ? 'happy' : 'wide'
    s.p.tilt = t > 1.7 ? sin(t * 9) * 0.1 : -0.12
    s.p.arms = max(s.p.arms, span(t, 1.7, 1.9))
  },
  carrot(s, t) {
    const out = spring(span(t, 0, 0.4))
    s.p.hole = out
    const toe = s.toe()
    if (t < 0.75) { s.put('carrot', toe.x - 30 + out * 46, toe.y, 1.2, 0.9, 0, false); s.look(toe); s.p.eyes = 'wide'; s.p.mouth = 'o' }
    s.leap(span(t, 0.65, 1.4), 120)
    s.p.boot.rot = -0.5 * up(t, 0.65, 1.1)
    if (t >= 0.75) {
      s.p.hole = 1 - span(t, 0.75, 1)
      const u = span(t, 0.75, 1.5), q = s.arc(toe, s.mouth(), u, 260)
      if (u < 1) { s.put('carrot', q.x, q.y, u * 14); s.look(q); s.p.mouth = 'o'; s.p.eyes = 'wide' } else if (t < 2) s.on('carrot', s.ox + 40, HEAD.mouth + 10, -1.3, 0.8 - span(t, 1.5, 2) * 0.5)
    }
    s.chew(t, 1.55)
    if (t > 1.55) fountain(s, 'crumb', s.mouth(), span(t, 1.55, 2.5), 8, 180, 60, 9)
  },
  biscuit(s, t) {
    const k = min(2, floor(t / 0.42)), u = (t - k * 0.42) / 0.42
    if (t < 1.26) { s.leap(u, 60); s.p.boot.sy = 1 - 0.14 * up(u, 0.6, 1); s.p.eyes = 'cross'; s.p.mouth = 'shut' }
    const rim = s.rim()
    for (let i = 0; i < 7; i++) { const v = span(t, 0.3 + i * 0.12, 1.5 + i * 0.1); if (v > 0 && v < 1) s.bit('puff', rim.x + sin(i * 2.4) * 80 * v, rim.y - 190 * v + 20, 46 * sin(v * PI)) }
    const m = s.mouth()
    for (let i = 0; i < 12; i++) { const v = (t * 0.9 + i * 0.13) % 1; if (t > 1 && t < 2.6) s.bit('crumb', m.x - 120 + i * 24, m.y - 190 + v * 250, 10) }
    if (t > 1.25) { s.p.mouth = 'lick'; s.p.eyes = 'happy'; s.p.tilt = sin(t * 7) * 0.14 }
  },
  frog(s, t) {
    hops(s, t, [-90, -20, 80, 0], 0.62, 150)
    if (t < 2.5) { s.p.eyes = 'wide'; s.p.mouth = 'wobble' }
    ontoHead(s, 'frog', t, 2.5)
    if (t > 2.75) { s.p.eyes = 'cross'; s.p.mouth = 'shut'; s.p.lookY = -1; s.p.lookX = 0; rings(s, s.head(), t - 2.8) }
  },
  mouse(s, t) {
    squirm(s, t)
    if (s.owner === 'elephant') { s.leap(span(t, 0, 0.9), 300); s.leap(span(t, 1.1, 2.1), 320) } else s.leap(span(t, 0.5, 1.2), 70)
    const u = span(t, 0.15, 2.3), q = overBody(s, u)
    if (u < 0.28 && u > 0) s.bit('lump', q.x, q.y, 34)
    s.put('mouse', q.x, q.y - 26, sin(t * 22) * 0.2, 0.8)
    if (u < 0.24) s.f.items.pop()
    s.look(q)
  },
  porridge(s, t) {
    if (t < 0.7) { swell(s, span(t, 0, 0.7)); return }
    s.p.hole = 1 - span(t, 1.9, 2.2)
    s.p.boot.sx = 1.26 - 0.26 * spring(span(t, 0.7, 1.3))
    s.leap(span(t, 0.72, 1.4), 70)
    const a = s.toe(), b = posed(s.p, s.ox, s.ox, HEAD.y)
    stream(s, 'porridge', a, b, span(t, 0.7, 2) * 2.6, 14, 0.09, 260, 32)
    s.p.mask = span(t, 1.15, 1.4) * (1 - span(t, 2.1, 2.7))
    s.p.eyes = s.p.mask > 0.5 ? 'wide' : t > 2 ? 'happy' : 'wide'
    s.p.mouth = t > 1.8 ? 'lick' : 'o'
    s.p.tilt = t > 1.8 ? sin(t * 8) * 0.15 : 0
  },
  bell(s, t) {
    dance(s, t, 0.5)
    const q = posed(s.p, s.ox, BOOT.toeX - 40, BOOT.toeY - 60)
    s.on('bell', BOOT.toeX - 30, BOOT.toeY - 84, sin(t * 15) * 0.5, 0.8)
    rings(s, q, (t % 0.5) * 1.4)
    s.p.mouth = t < 0.5 ? 'o' : 'grin'; s.p.eyes = t < 0.5 ? 'wide' : 'happy'
  },
  empty(s, t) {
    const rim = s.rim()
    for (let i = 0; i < 5; i++) { const v = span(t, 0.05 + i * 0.07, 0.9 + i * 0.07); if (v > 0 && v < 1) s.bit('puff', rim.x + (i - 2) * 40 * v, rim.y - 110 * v, 40 * sin(v * PI)) }
    const m = posed(s.p, s.ox, BOOT.x - 40 + t * 46 + sin(t * 6) * 60, BOOT.rim - 40 - t * 110 + sin(t * 9) * 22)
    if (t > 0.3) { s.bit('moth', m.x, m.y, 22 * span(t, 0.3, 0.5)); s.look(m) }
    s.p.eyes = 'wide'; s.p.mouth = t < 1 ? 'o' : 'smile'
    s.p.arms = 0.5 * up(t, 0.8, 1.8)
    s.leap(span(t, 1.2, 1.7), 40); s.leap(span(t, 1.7, 2.2), 40)
  },
  'frog-mouse'(s, t) {
    squirm(s, t); s.p.eyes = 'cross'
    const head = posed(s.p, s.ox, s.ox, HEAD.y)
    const e = span(t, 0, 0.5), w = t * 6.5
    const out = (k: number): Pt => ({ x: mix(s.rim().x, head.x + cos(w - k) * 165, e), y: mix(s.rim().y, head.y + sin(w - k) * 120, e) - sin(e * PI) * 60 })
    const m = out(0), f = out(1.1)
    s.put('mouse', m.x, m.y, sin(t * 20) * 0.2, 0.8, 0, sin(w) > -0.6)
    s.put('frog', f.x, f.y - abs(sin(t * 12)) * 26, 0, 0.9, 0, sin(w - 1.1) > -0.6)
    s.p.lookX = cos(w); s.p.lookY = sin(w); s.p.tilt = sin(w) * 0.16; s.p.mouth = 'wobble'
    s.leap(span(t, 2.4, 3.1), 90)
  },
  'frog-porridge'(s, t) {
    hops(s, t, [-80, 60, -40, 0], 0.6, 140)
    s.p.eyes = 'wide'; s.p.mouth = 'o'
    for (let k = 0; k < 4; k++) { const v = span(t, 0.6 * (k + 1), 0.6 * (k + 1) + 0.6); if (v > 0 && v < 1) fountain(s, 'porridge', posed(s.p, s.ox, BOOT.x, BOOT.rim), v * 0.7, 9, 420, 170, 22) }
    s.p.mask = span(t, 1.3, 1.5) * 0.6 * (1 - span(t, 2.8, 3.1))
    ontoHead(s, 'frog', t, 2.4)
    if (t > 2.7) { const h = s.head(); s.put('porridge', h.x, h.y - 88, sin(t * 10) * 0.1, 0.62) }
  },
  'frog-bell'(s, t) {
    hops(s, t, [-70, 70, 0], 0.95, 300)
    s.p.eyes = t % 0.95 < 0.5 ? 'wide' : 'happy'; s.p.mouth = 'grin'
    rings(s, s.rim(), (t % 0.95) * 1.1)
    if (t > 2.8) { const v = span(t, 2.8, 3.1), q = s.arc(s.rim(), s.head(), v, 160); s.put('bell', q.x, q.y - 10, sin(t * 16) * 0.4) }
    if (t > 2.6) { const q = s.arc(s.rim(), { x: s.rim().x + 20, y: s.rim().y - 24 }, span(t, 2.6, 2.9), 60); s.put('frog', q.x, q.y, 0, 0.9) }
  },
  'frog-treat'(s, t, _a, b) {
    s.p.boot.sx = 1 + 0.1 * sin(t * 20) * (t < 1 ? 1 : 0)
    s.look(s.rim())
    if (t < 1) { s.p.eyes = 'wide'; s.p.mouth = 'shut'; if (t < 0.5) s.put(b, s.rim().x, s.rim().y - 10 - 70 * up(t, 0, 0.5), t * 6, 0.9); if (t > 0.35) s.bit('crumb', s.rim().x + sin(t * 30) * 60, s.rim().y - 30 - (t * 90) % 60, 9); return }
    const u = spring(span(t, 1, 1.5)), r = s.rim()
    s.put('frog', r.x, r.y - 70 * u, sin(t * 4) * 0.06, 0.8 + 0.2 * u, u)
    if (t > 1.7) { rings(s, { x: r.x, y: r.y - 90 }, t - 1.7); s.p.boot.sy = 1 - 0.06 * up(t, 1.7, 2) }
    s.p.eyes = t > 2 ? 'happy' : 'wide'; s.p.mouth = t > 2 ? 'grin' : 'o'
    s.p.tilt = t > 2 ? sin(t * 16) * 0.1 : 0
    s.leap(span(t, 2, 2.7), 60)
  },
  'mouse-porridge'(s, t) {
    if (t < 1.1) { swell(s, span(t, 0, 1.1) * 0.7); s.p.hole = span(t, 0.7, 1.1); s.bit('crumb', s.toe().x + 20, s.toe().y - 20 + ((t * 80) % 40), 8); return }
    s.p.hole = 1
    const toe = s.toe(), u = spring(span(t, 1.1, 1.7)), roll = span(t, 1.9, 2.7)
    s.put('mouse', toe.x + 10 + u * 46 + roll * 70, toe.y + 10 + roll * 22, roll * 6.28, 0.9, u)
    if (t > 1.9) s.bit('lump', toe.x + 14 + sin(t * 14) * 5, toe.y, 26)
    s.p.toes = span(t, 2, 2.3)
    s.leap(span(t, 1.15, 1.7), 60)
    s.look(toe); s.p.eyes = t > 2 ? 'happy' : 'wide'; s.p.mouth = t > 2 ? 'grin' : 'o'
  },
  'mouse-bell'(s, t) {
    dance(s, t, 0.4); s.p.mouth = 'grin'
    const u = (t * 0.42) % 1, q = overBody(s, min(1, u * 1.05))
    s.put('mouse', q.x, q.y - 26, sin(t * 22) * 0.2, 0.8)
    s.put('bell', q.x, q.y - 78, sin(t * 26) * 0.5, 0.6)
    rings(s, q, (t % 0.4) * 1.5); s.look(q); s.p.eyes = 'wide'
  },
  'mouse-treat'(s, t, _a, b) {
    const u = span(t, 0.1, 1.5) * 0.6, q = overBody(s, u)
    squirm(s, t * 0.6); s.leap(span(t, 1.6, 2.1), 80)
    if (t < 1.7) { s.put('mouse', q.x, q.y - 26, 0, 0.8); s.put(b, q.x, q.y - 82 - abs(sin(t * 18)) * 8, sin(t * 14) * 0.2, 0.7); s.look({ x: q.x, y: q.y - 80 }); s.p.eyes = 'wide'; s.p.mouth = 'o'; s.p.tilt = (q.x - s.mouth().x) * 0.002 } else {
      const v = span(t, 1.7, 2.1), from = overBody(s, 0.6), m = s.mouth()
      s.put('mouse', from.x - v * 30, from.y - 20 + v * 130, 0, 0.8)
      if (v < 1) s.put(b, mix(from.x, m.x, v), mix(from.y - 80, m.y, v), v * 5, 0.7 * (1 - v * 0.4))
      s.p.mouth = 'o'; s.chew(t, 2.1)
    }
  },
  'porridge-bell'(s, t) {
    if (t < 0.6) { swell(s, span(t, 0, 0.6)); return }
    s.p.hole = 1 - span(t, 1.4, 1.7)
    const toe = s.toe(), upw = span(t, 0.6, 1)
    stream(s, 'porridge', toe, { x: toe.x + 110, y: -20 }, span(t, 0.6, 1.4) * 2, 9, 0.08, 120, 24)
    if (upw < 1) s.put('bell', toe.x - upw * 60, toe.y - upw * 900, upw * 8)
    s.p.lookX = 0.1; s.p.lookY = -1; s.p.eyes = 'wide'; s.p.mouth = 'o'; s.p.tilt = -0.1
    const down = span(t, 1.8, 2.1)
    if (down > 0) {
      const h = s.head(), shake = down >= 1 ? sin(t * 44) * 0.16 * (1 - span(t, 2.1, 2.9)) : 0
      s.put('bell', h.x, mix(h.y - 600, h.y + 12, down * down), shake, 1.5)
      if (down >= 1) { rings(s, h, t - 2.1); s.p.tilt = shake; s.p.eyes = 'cross'; s.p.mouth = 'wobble'; s.p.sy = 1 - 0.14 * up(t, 2.1, 2.4); s.p.sx = 1 + 0.1 * up(t, 2.1, 2.4) }
    }
  },
  'porridge-treat'(s, t, _a, b) {
    if (t < 0.6) { swell(s, span(t, 0, 0.6)); return }
    s.p.hole = 1 - span(t, 1.2, 1.5)
    const toe = s.toe(), u = span(t, 0.6, 1.5), q = s.arc(toe, s.mouth(), u, 330)
    s.p.boot.rot = 0.2 * up(t, 0.6, 0.9)
    stream(s, 'porridge', toe, s.mouth(), span(t, 0.65, 1.6) * 1.5, 6, 0.1, 330, 18)
    if (u < 1) { s.put(b, q.x, q.y, u * 12); s.look(q); s.p.mouth = 'o'; s.p.eyes = 'wide' }
    s.leap(span(t, 1.2, 1.8), 90)
    s.chew(t, 1.5)
  },
  'bell-treat'(s, t, _a, b) {
    const step = 0.6, k = min(3, floor(t / step)), u = (t - k * step) / step
    if (t < 2.4) { s.leap(u, 50); const r = s.rim(), q = s.arc(r, r, u, 120 + k * 60); s.put(b, r.x, q.y - 30, t * 8, 0.9); s.look({ x: r.x, y: q.y }); s.p.eyes = 'wide'; s.p.mouth = 'grin'; rings(s, posed(s.p, s.ox, BOOT.toeX - 40, BOOT.toeY), u * 0.7); s.on('bell', BOOT.toeX - 30, BOOT.toeY - 84, sin(t * 15) * 0.5, 0.8) } else {
      const v = span(t, 2.4, 2.8), q = s.arc({ x: s.rim().x, y: s.rim().y - 30 }, s.mouth(), v, 150)
      s.on('bell', BOOT.toeX - 30, BOOT.toeY - 84, sin(t * 15) * 0.3, 0.8)
      if (v < 1) { s.put(b, q.x, q.y, v * 6, 0.9); s.p.mouth = 'o' }
      s.chew(t, 2.8)
    }
  },
  'treat-treat'(s, t, a, b) {
    // The foot comes straight out with one on each side of the big toe.
    const o = ease(span(t, 0, 0.35)), p = s.p
    p.footY = mix(ANKLE.in, ANKLE.y, o); p.footX = mix(ANKLE.inX, ANKLE.x, o); p.footRot = mix(1.35, -0.4, o); p.toes = o
    const tip = { x: ANKLE.x + 96, y: p.footY - 14 }
    const fly = (id: ThingId, at: number, dy: number): void => {
      const v = span(t, at, at + 0.45)
      if (v <= 0) { s.on(id, tip.x + (dy ? 4 : 52), tip.y + dy, 0.2, 0.75); return }
      if (v < 1) { const q = s.arc(posed(p, s.ox, tip.x, tip.y), s.mouth(), v, 170); s.put(id, q.x, q.y, v * 9, 0.75) }
    }
    fly(a, 1, 0); fly(b, 1.7, -62)
    s.look(tip); p.eyes = 'wide'; p.mouth = t > 0.8 && t < 2.15 ? 'o' : 'grin'
    if (t > 0.35 && t < 1) p.dx = sin(t * 40) * 4
    s.chew(t, 2.15)
    if (t > 2.15) p.arms = 1
  },
}
function up(t: number, a: number, b: number): number { return sin(PI * span(t, a, b)) }

/** The boot hops off with its owner: a leap to each spot in turn. */
function hops(s: Scene, t: number, spots: readonly number[], each: number, h: number): void {
  const k = min(spots.length, floor(t / each)), u = (t - k * each) / each
  const from = (k === 0 ? 0 : spots[k - 1]) * s.far, to = (spots[k] ?? spots[spots.length - 1]) * s.far
  s.p.dx += k >= spots.length ? to : mix(from, to, ease(clamp(u)))
  if (k < spots.length) { s.leap(u, h); s.p.boot.sy = 1 - 0.16 * up(u, 0, 0.2) }
}
function ontoHead(s: Scene, id: ThingId, t: number, at: number): void {
  if (t < at) return
  const u = span(t, at, at + 0.35), q = s.arc(s.rim(), { x: s.head().x, y: s.head().y - 24 }, u, 170)
  s.put(id, q.x, q.y, 0, 0.95 + (u >= 1 ? 0.1 * sin(t * 18) * (1 - span(t, at + 0.4, at + 0.9)) : 0))
}
function squirm(s: Scene, t: number): void {
  s.p.dx += sin(t * 17) * 8; s.p.rot += sin(t * 13) * 0.06; s.p.tilt = sin(t * 11) * 0.14
  s.p.eyes = 'happy'; s.p.mouth = 'grin'; s.p.arms = 0.4 + 0.3 * sin(t * 15)
  s.p.boot.rot = sin(t * 19) * 0.04
}
function dance(s: Scene, t: number, beat: number): void {
  const k = floor(t / beat), u = t / beat - k, side = k % 2 ? 1 : -1
  s.leap(u, 46)
  s.p.dx += side * 22 * sin(u * PI) * OWNER[s.owner].tempo; s.p.tilt = side * 0.12 * sin(u * PI)
  s.p.boot.rot = side * 0.14 * sin(u * PI); s.p.arms = max(s.p.arms, 0.5 + 0.4 * side * sin(u * PI))
}

/**
 * The picture `t` seconds after the foot started down. `ox` is where the owner stands, `far` how much of a
 * journey the boot may make (0 in a row).
 */
export function frameOf(found: readonly ThingId[], owner: OwnerId, t: number, ox: number, far = 1): Frame {
  const name = actOf(found), all = inOrder(found), s = new Scene(owner, ox, far, all), p = s.p
  const core = PLUNGE + HUSH, end = outAt(found, owner), bliss = blissOf(found, owner)
  if (t < core) {
    // Up a little, then all the way down, and everything stops.
    const raise = sin(PI * span(t, 0, 0.22)) * 46, down = ease(span(t, 0.2, 0.42))
    p.footY = mix(ANKLE.y - raise, ANKLE.in, down); p.footX = mix(ANKLE.x, ANKLE.inX, down); p.footRot = mix(0.16, 1.35, down); p.toes = 1 - down
    const hit = t > 0.42 ? spring(span(t, 0.42, 0.95)) : 0
    p.boot.sy = t > 0.42 ? 1 - 0.16 * (1 - hit) : 1; p.boot.sx = t > 0.42 ? 1 + 0.12 * (1 - hit) : 1
    p.lookX = 0.8; p.lookY = t < PLUNGE ? 0.3 : 0.7
    p.eyes = t < PLUNGE ? 'happy' : 'wide'; p.mouth = t < PLUNGE ? 'smile' : 'shut'
    if (t > PLUNGE) { const g = span(t, PLUNGE, PLUNGE + 0.3); p.sy = 1 + 0.03 * g; p.lookX = mix(0.8, 0, g); p.lookY = mix(0.7, 0, g) }
    if (t < 0.36) all.forEach((id, i) => s.put(id, PEEP[i].x, PEEP[i].y + down * 60, 0, 0.9, 0, false))
    return s.f
  }
  p.footY = ANKLE.in; p.footX = ANKLE.inX; p.footRot = 1.35
  const last = end - bliss - core
  CORES[name](s, min(t - core, last), all[0], all[1])
  if (bliss > 0 && t > end - bliss) {
    // What it likes best: round and swaying, eyes shut, the free arm conducting.
    const u = t - (end - bliss), g = sin(PI * span(u, 0, bliss))
    s.f.items.length = 0; s.f.bits.length = 0; p.mask = 0; p.hole = 0
    if (moodOf(found, owner) === 'minds') {
      p.eyes = 'cross'; p.mouth = 'wobble'; p.dx += sin(u * 46) * 9 * g; p.tilt = sin(u * 38) * 0.1 * g; p.sx *= 1 - 0.06 * g; p.arms = 0.9 * g; p.boot.rot = sin(u * 41) * 0.09 * g
    } else {
    p.eyes = 'happy'; p.mouth = 'grin'; p.tilt = sin(u * 6) * 0.16 * g; p.rot += sin(u * 6) * 0.07 * g
    p.sx *= 1 + 0.1 * g; p.sy *= 1 + 0.03 * g; p.arms = max(p.arms, 0.6 * g + 0.2 * sin(u * 12) * g)
    }
  }
  if (t > end) {
    // Out, and as it was.
    const u = ease(span(t, end, end + OUT)), r = rest()
    s.f.items.length = 0; s.f.bits.length = 0
    for (const k of ['dx', 'dy', 'rot', 'sx', 'sy', 'arms', 'tilt', 'footX', 'footRot', 'mask', 'hole', 'toes'] as const) p[k] = mix(p[k], r[k], u)
    for (const k of ['dx', 'dy', 'rot', 'sx', 'sy'] as const) p.boot[k] = mix(p.boot[k], r.boot[k], u)
    p.footY = mix(p.footY, r.footY, spring(span(t, end, end + OUT)))
    p.lookX = mix(p.lookX, r.lookX, u); p.lookY = mix(p.lookY, r.lookY, u)
    p.eyes = 'happy'; p.mouth = 'grin'
  }
  // Leaning, it stands on an edge and not through the floor.
  p.dy -= abs(sin(p.rot)) * (p.rot > 0 ? 235 : 185)
  return s.f
}

/** Where each thing found is when it starts for home: where it was last seen, or the top of the boot. */
export function lastSeen(found: readonly ThingId[], owner: OwnerId, ox: number): Map<ThingId, Pt> {
  const end = outAt(found, owner), f = frameOf(found, owner, end - blissOf(found, owner) - 0.001, ox)
  const rim = posed(f.pose, ox, BOOT.x, BOOT.rim)
  return new Map(found.map((id) => { const i = f.items.find((o) => o.id === id); return [id, i ? { x: i.x, y: i.y } : rim] }))
}

export type Cue = { at: number; sound: string }

/** Every sound of an act, timed from the foot starting down. */
export function cuesOf(found: readonly ThingId[], owner: OwnerId): Cue[] {
  const name = actOf(found), c0 = PLUNGE + HUSH, cues: Cue[] = [{ at: 0.4, sound: 'plunge' }, { at: 0.5, sound: `find.${all0(found)}` }]
  // A pair is heard as both.
  if (found.length > 1) cues.push({ at: 0.72, sound: `find.${inOrder(found)[1]}` })
  const add = (at: number, sound: string): void => { cues.push({ at: c0 + at, sound }) }
  const yelp = `yelp.${owner}`, gig = `giggle.${owner}`
  const at = (times: readonly number[], sound: string): void => times.forEach((t) => add(t, sound))
  switch (name) {
    case 'mandarin': add(0.05, 'squirt'); add(0.15, yelp); add(1.7, 'gulp'); add(1.9, gig); break
    case 'carrot': add(0, 'pop'); add(0.65, yelp); add(0.75, 'whirl'); add(1.55, 'crunch'); break
    case 'biscuit': at([0.35, 0.77, 1.2], 'crunch'); add(1.4, 'patter'); add(1.9, gig); break
    case 'frog': at([0, 0.62, 1.24, 1.86], 'boing'); at([0.1, 1.3], yelp); add(2.8, 'croak'); break
    case 'mouse': add(0, 'scurry'); add(0.2, gig); add(1.1, 'squeak'); add(1.4, gig); break
    case 'porridge': add(0, 'gurgle'); add(0.7, 'splurt'); add(1.25, 'splat'); add(1.3, yelp); add(2, 'gulp'); break
    case 'bell': at([0, 0.5, 1, 1.5, 2, 2.5], 'ring'); add(0.1, yelp); add(1.2, gig); break
    case 'empty': add(0, 'puff'); add(0.5, 'flit'); add(1.2, 'step'); add(1.7, 'step'); break
    case 'frog-mouse': add(0, 'squeak'); at([0.5, 1.2, 1.9], 'scurry'); at([0.7, 1.5], 'croak'); add(2.4, yelp); break
    case 'frog-porridge': at([0, 0.6, 1.2, 1.8], 'boing'); at([0.6, 1.2, 1.8], 'splat'); add(0.2, yelp); add(2.7, 'croak'); break
    case 'frog-bell': at([0, 0.95, 1.9], 'boing'); at([0.1, 1.05, 2, 3.1], 'ring'); add(0.2, yelp); break
    case 'frog-treat': add(0.1, 'crunch'); add(1, 'pop'); add(1.7, 'burp'); add(2, gig); break
    case 'mouse-porridge': at([0, 0.5], 'nibble'); add(1.1, 'pop'); add(1.15, yelp); add(2, 'squeak'); add(2.2, gig); break
    case 'mouse-bell': at([0, 0.8, 1.6, 2.4], 'ring'); add(0.1, 'scurry'); add(0.4, gig); add(2, 'squeak'); break
    case 'mouse-treat': add(0, 'scurry'); add(0.3, yelp); add(1.6, 'squeak'); add(2.1, 'crunch'); break
    case 'porridge-bell': add(0, 'gurgle'); add(0.6, 'splurt'); add(0.7, 'whirl'); add(2.1, 'bong'); add(2.3, yelp); break
    case 'porridge-treat': add(0, 'gurgle'); add(0.6, 'splurt'); add(0.8, 'whirl'); add(1.5, 'gulp'); add(1.8, gig); break
    case 'bell-treat': at([0, 0.6, 1.2, 1.8], 'ring'); at([0.05, 0.65, 1.25, 1.85], 'pop'); add(2.8, 'crunch'); break
    case 'treat-treat': add(0, 'pop'); add(1, 'whirl'); add(1.7, 'whirl'); add(2.15, 'crunch'); add(2.3, gig); break
  }
  if (blissOf(found, owner) > 0) cues.push({ at: outAt(found, owner) - BLISS, sound: `${moodOf(found, owner)}.${owner}` })
  cues.push({ at: outAt(found, owner) + 0.1, sound: 'pull' })
  return cues.sort((a, b) => a.at - b.at)
}
function all0(found: readonly ThingId[]): string {
  return found.length === 0 ? 'none' : inOrder(found)[0]
}
