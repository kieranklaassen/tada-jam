import { RISE_FULL, kindOf, textureOf, type Bread, type Crumb, type Load } from './stuff'

// The stuff on the peel as a soft outline: a ring of sprung points whose area
// is held, so a push on one side bulges the other. Pure numbers in reference
// units from the lump's centre (x right, y down): no canvas, no clock, no
// chance. Nothing here is saved; the body is rebuilt from `formOf(load)`.

export type Form = {
  kind: 'dust' | 'puddle' | 'batter' | 'dough' | 'seeds'
  texture: 'streaky' | 'shaggy' | 'smooth'
  /** Half-width and half-height of the resting outline. */
  rx: number
  ry: number
  /** 0 smooth outline .. 1 very lumpy. */
  lumps: number
  /** How strongly it springs back, as turns of the spring per second times 2 pi. 0 does not spring: its dents stay, then fade. */
  spring: number
  /** How far a lobe can be pulled past the edge before it rips. */
  reachMost: number
  /** 0 flat .. 1 fully risen: larger, rounder, and it wobbles. */
  rise: number
  /** Whether seeds lie on it and whether the bubbly is in it: for the painter only. */
  seeds: boolean
  bubbly: boolean
  /** What the oven made of it; null for raw stuff. A bread never stretches: its `reachMost` is 0. */
  bread: Bread | null
}

type Feel = { spring: number; damp: number; fill: number; hold: number; carry: number; reach: number; lumps: number; snap: number; give: number }
/**
 * The tuning table. spring: how fast it comes back; damp: 1 creeps back, under
 * 1 wobbles; fill: seconds a dent takes to fill once the finger is off; hold:
 * seconds a dent stays before that; carry: how much of a drag the stuff
 * follows; reach: the longest lobe; snap: how fast a let-go lobe flies home;
 * give: how much of a push it takes at all (1 for anything raw).
 */
export const FEEL: Record<Exclude<Form['kind'], 'dough'> | Form['texture'], Feel> = {
  dust: { spring: 0, damp: 1, fill: 0.7, hold: 2.6, carry: 0.7, reach: 22, lumps: 0.3, snap: 8, give: 1 },
  seeds: { spring: 0, damp: 1, fill: 0.5, hold: 1.2, carry: 0.7, reach: 22, lumps: 0.45, snap: 8, give: 1 },
  puddle: { spring: 7, damp: 1.1, fill: 0.5, hold: 0, carry: 0.35, reach: 30, lumps: 0.55, snap: 9, give: 1 },
  batter: { spring: 5, damp: 1.3, fill: 0.8, hold: 0, carry: 0.6, reach: 30, lumps: 0.14, snap: 7, give: 1 },
  streaky: { spring: 11, damp: 0.9, fill: 0.5, hold: 0, carry: 1, reach: 40, lumps: 0.75, snap: 12, give: 1 },
  shaggy: { spring: 15, damp: 0.6, fill: 0.3, hold: 0, carry: 0.85, reach: 40, lumps: 1, snap: 14, give: 1 },
  smooth: { spring: 26, damp: 0.24, fill: 0.12, hold: 0, carry: 0.7, reach: 230, lumps: 0.08, snap: 18, give: 1 },
}
/** What the oven made of it. An airy loaf squashes and springs back fast, a brick does not give, a crumbly loaf and toasted dust do not spring, a pancake flops. */
export const BAKED: Record<Crumb, Feel> = {
  airy: { spring: 34, damp: 0.42, fill: 0.08, hold: 0, carry: 0.35, reach: 0, lumps: 0.06, snap: 0, give: 1 },
  dense: { spring: 48, damp: 0.9, fill: 0.05, hold: 0, carry: 0.4, reach: 0, lumps: 0, snap: 0, give: 0.05 },
  crumbly: { spring: 0, damp: 1, fill: 0.5, hold: 0.4, carry: 0.6, reach: 0, lumps: 0.8, snap: 0, give: 0.3 },
  pancake: { spring: 9, damp: 0.5, fill: 0.3, hold: 0, carry: 0.6, reach: 0, lumps: 0.12, snap: 0, give: 0.7 },
  dust: { ...FEEL.dust, reach: 0 },
  seeds: { ...FEEL.seeds, reach: 0 },
}
/** Half-width and half-height of each bread when round, flat or a heap; a long loaf is this much wider and lower. */
export const BREAD_SIZE: Record<Crumb, readonly [number, number]> = { airy: [100, 78], dense: [78, 54], crumbly: [88, 58], pancake: [120, 34], dust: [96, 64], seeds: [84, 52] }
const LONG = [1.5, 0.74]
const feelOf = (form: Form): Feel => form.bread ? BAKED[form.bread.crumb] : FEEL[form.kind === 'dough' ? form.texture : form.kind]

/** The form of what lies on the peel, raw or baked; null for nothing. */
export function formOf(load: Load): Form | null {
  if (!load) return null
  if (!load.raw) {
    const crumb = load.crumb, feel = BAKED[crumb], [rx, ry] = BREAD_SIZE[crumb], long = load.shape === 'long'
    const kind = crumb === 'dust' || crumb === 'seeds' ? crumb : crumb === 'pancake' ? 'batter' : 'dough'
    return { kind, texture: crumb === 'crumbly' ? 'shaggy' : 'smooth', rx: rx * (long ? LONG[0] : 1), ry: ry * (long ? LONG[1] : 1), lumps: feel.lumps, spring: feel.spring, reachMost: 0, rise: 0, seeds: load.seeds, bubbly: false, bread: load }
  }
  const kind = kindOf(load)
  if (kind === 'nothing') return null
  const texture = textureOf(load), rise = Math.max(0, Math.min(1, load.rise / RISE_FULL))
  const feel = FEEL[kind === 'dough' ? texture : kind]
  // The stuff is the working object and reads first: one scoop is already a good handful, and three and three fill the blade.
  const more = (amount: number, least: number, most: number) => Math.max(0, Math.min(1, (amount - least) / (most - least)))
  let rx = 84, ry = 52
  if (kind === 'dust') { const t = more(load.flour, 1, 3); rx = 80 + 38 * t; ry = 54 + 24 * t }
  if (kind === 'puddle') { const t = more(load.water, 1, 3); rx = 96 + 44 * t; ry = 44 + 11 * t }
  // Batter froths a little where dough would rise.
  if (kind === 'batter') { const t = more(load.flour + load.water + (load.bubbly ? 1 : 0), 1, 6); rx = (88 + 52 * t) * (1 + 0.06 * rise); ry = (40 + 15 * t) * (1 + 0.12 * rise) }
  // The bubbly alone is a small blob of froth.
  const froth = kind === 'batter' && load.flour + load.water === 0
  if (froth) { rx = 55 * (1 + 0.2 * rise); ry = 38 * (1 + 0.3 * rise) }
  if (kind === 'dough') {
    const t = more(load.flour + load.water, 2, 6)
    // Air makes it larger, and rounder: up to a quarter taller.
    rx = (80 + 38 * t) * (1 + 0.16 * rise); ry = (58 + 26 * t) * (1 + 0.25 * rise)
    if (load.long) { rx *= 1.45; ry *= 0.7 }
  }
  // Risen dough is full of air: it wobbles slower and wider.
  return { kind, texture, rx, ry, lumps: froth ? 0.45 : feel.lumps * (1 - 0.5 * rise), spring: feel.spring * (1 - 0.3 * rise), reachMost: feel.reach, rise, seeds: load.seeds, bubbly: load.bubbly, bread: null }
}

/** The resting outline of a form as `n` x,y pairs: what a body settles to, and what the painter draws where no finger reaches. */
export function restOutline(form: Form | null, into: { [index: number]: number }, n: number): void {
  const crumb = form && form.bread ? form.bread.crumb : null, heap = !!form && form.kind === 'dust', loaf = !!crumb && !!form && form.kind === 'dough'
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a)
    // A few slow waves round the edge make the lumps.
    const lumpy = form ? 1 + form.lumps * (0.085 * Math.sin(3 * a + 0.7) + 0.06 * Math.sin(5 * a + 2.1) + 0.04 * Math.sin(7 * a + 4.4)) + 0.025 * Math.sin(2 * a + 0.9) : 0
    // A brick is boxy. A heap is flat where it lies with a soft peak on top, a loaf stands on a flat base, and everything else only sits a little flatter on its low side.
    const box = crumb === 'dense' ? 0.6 : 1, x = Math.sign(c) * Math.pow(Math.abs(c), box), y = Math.sign(s) * Math.pow(Math.abs(s), box)
    const sit = s > 0 ? (heap ? 0.62 : loaf ? 0.72 : 0.94) : heap ? 1 + 0.16 * s * s * s * s : 1
    into[i * 2] = form ? form.rx * x * lumpy : 0
    into[i * 2 + 1] = form ? form.ry * (y * lumpy * sit + (heap ? 0.2 : loaf ? 0.14 : 0)) : 0
  }
}

const STEP = 1 / 120
/** The fingertip's radius, how far its dent spreads along the edge, how deep a first press goes, the longest stroke one move carries, and how far round a moving finger the stuff goes with it. */
const FINGER = 26, SPREAD = 38, DENT = 16, STROKE = 40, BULK = 68
/** How stiffly stuff that does not spring follows its dents, how much a point pulls its neighbours, how fast a new shape eases in, how much of a lobe's area the lump gives up, and the least of its length a stretch of edge keeps. */
const FOLLOW = 22, RING = 0.6, EASE = 9, PAID = 0.35, SLACK = 0.35
/** Marks the finger left: x, y, life (1 fresh .. 0 gone), joined (1 when it carries on from the mark before). */
const MARKS = 20

export class DoughBody {
  private readonly n: number
  private readonly goal: Float64Array
  private readonly rest: Float64Array
  private readonly dent: Float64Array
  private readonly at: Float64Array
  private readonly vel: Float64Array
  private readonly aim: Float64Array
  private readonly off: Float64Array
  private readonly out: number[]
  private readonly trail: number[] = new Array(MARKS * 4).fill(0)
  private form: Form | null = null
  private feel: Feel = FEEL.smooth
  private begun = false
  private rx = 0
  private ry = 0
  private left = 0
  private quiet = 0
  private kicks = 0
  private calm = true
  private down = false
  private fromInside = false
  private readonly tip = { x: 0, y: 0 }
  // The lobe: which point it grows from, where its tip is and how fast it flies, and how much stuff is out in it.
  private lobe = { held: false, live: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, far: 0, area: 0 }

  constructor(points = 36) {
    const n = this.n = Math.max(12, Math.floor(points))
    this.goal = new Float64Array(n * 2); this.rest = new Float64Array(n * 2); this.dent = new Float64Array(n * 2)
    this.at = new Float64Array(n * 2); this.vel = new Float64Array(n * 2); this.aim = new Float64Array(n * 2); this.off = new Float64Array(n * 2)
    this.out = new Array(n * 2).fill(0)
  }

  /** A new resting shape. The outline eases to it over a few tenths of a second; the first call sets it at once. */
  reshape(form: Form | null): void {
    const { n, goal } = this
    this.form = form
    if (form) this.feel = feelOf(form)
    restOutline(form, goal, n)
    if (!form) { this.down = false; this.lobe.held = this.lobe.live = false }
    this.calm = false
    if (this.begun) return
    this.begun = true
    this.rest.set(goal); this.at.set(goal); this.vel.fill(0); this.dent.fill(0)
    this.rx = form ? form.rx : 0; this.ry = form ? form.ry : 0
    this.compose()
  }

  /** The finger landed: the outline dents toward it (inside) or is pressed in (outside) at once, and the rest bulges. */
  press(x: number, y: number): void {
    if (!this.form || !Number.isFinite(x) || !Number.isFinite(y)) return
    const { n, at } = this
    this.down = true; this.tip.x = x; this.tip.y = y; this.quiet = 0; this.calm = false
    this.fromInside = this.contains(x, y)
    this.lobe.held = false
    if (this.fromInside) {
      for (let i = 0; i < n * 2; i += 2) {
        const dx = x - at[i], dy = y - at[i + 1], far = Math.hypot(dx, dy) || 1
        const pull = Math.min(DENT * Math.exp(-(far * far) / (SPREAD * SPREAD)), far * 0.5) / far
        this.nudge(i, dx * pull, dy * pull)
        // A pat: a touch wider and lower in the same frame.
        at[i] *= 1 + 0.02 * this.feel.give; at[i + 1] *= 1 - 0.025 * this.feel.give
      }
      this.kick(0.3)
    } else this.shove(x, y)
    this.mark(x, y, 0)
    this.hold()
  }

  /** The finger moved while down: the stuff piles ahead of it; dragged out past the edge from inside, a lobe follows. */
  moveTo(x: number, y: number): void {
    if (!this.form || !Number.isFinite(x) || !Number.isFinite(y)) return
    if (!this.down) { this.press(x, y); return }
    const { n, at, vel, tip, lobe } = this, dx = x - tip.x, dy = y - tip.y, inside = this.contains(x, y)
    this.quiet = 0; this.calm = false
    if (lobe.held) {
      // Back inside, the lobe is let go and folds home.
      if (inside) lobe.held = false
    } else if (inside) {
      // One frame of even a frantic finger carries the stuff only so far.
      const far = Math.hypot(dx, dy), carry = this.feel.carry * Math.min(1, STROKE / (far || 1)), w = this.form.spring || FOLLOW
      for (let i = 0; i < n * 2; i += 2) {
        const ax = at[i] - tip.x, ay = at[i + 1] - tip.y, g = Math.exp(-(ax * ax + ay * ay) / (BULK * BULK)) * carry
        this.nudge(i, dx * g, dy * g)
        vel[i] += dx * g * w * 0.15 * this.feel.give; vel[i + 1] += dy * g * w * 0.15 * this.feel.give
      }
      this.fromInside = true
      this.mark(x, y, 1)
    } else if (this.fromInside) {
      // Out past the edge: the nearest point of the ring becomes the root of a lobe. Nothing baked comes with the finger.
      let best = 0, near = Infinity
      for (let i = 0; i < n; i++) { const d = Math.hypot(at[i * 2] - x, at[i * 2 + 1] - y); if (d < near) { near = d; best = i } }
      if (this.form.reachMost > 0) { lobe.held = lobe.live = true; lobe.k = best; lobe.x = at[best * 2]; lobe.y = at[best * 2 + 1]; lobe.vx = lobe.vy = 0 }
    } else this.shove(x, y)
    tip.x = x; tip.y = y
    this.hold()
  }

  /** The finger lifted: the lobe flies home, dents fill, the lump jiggles and settles. */
  lift(): void { this.down = this.lobe.held = this.fromInside = false }

  /** A slap, a drop, or a rip snapping back: squash and jiggle. 1 is a firm slap. */
  kick(amount: number): void {
    if (!this.form || !(amount > 0)) return
    // Wider and lower, at a speed that suits its spring. Each kick turns its ripple a little further round, so no two squashes are the same.
    const { n, at, vel } = this, push = Math.min(2, amount) * 0.1 * (this.form.spring || FOLLOW) * this.feel.give, phase = ++this.kicks * 2.39996
    for (let i = 0; i < n; i++) {
      const ripple = 1 + 0.5 * Math.sin(3 * (i / n) * Math.PI * 2 + phase)
      vel[i * 2] += at[i * 2] * push * ripple; vel[i * 2 + 1] -= at[i * 2 + 1] * push * 1.2 * ripple
    }
    this.calm = false
  }

  /** Advance by seconds, in fixed steps, so a long frame and many short ones agree. */
  step(seconds: number): void {
    if (!(seconds > 0)) return
    this.left = Math.min(this.left + seconds, 2)
    while (this.left >= STEP - 1e-9) { this.left -= STEP; if (!this.calm) this.tick(STEP) }
  }

  /** The outline now: x0,y0,x1,y1,... The same array every call. */
  outline(): readonly number[] { return this.out }
  /** The marks the finger left, oldest first: x, y, life, joined, for `MARKS` places; life 0 is an empty place. The same array every call. */
  marks(): readonly number[] { return this.trail }

  /** Whether a point is on the stuff: the resting shape and a small finger's margin. */
  contains(x: number, y: number): boolean {
    if (!this.form || this.rx < 1 || this.ry < 1) return false
    const u = x / (this.rx + 10), v = y / (this.ry + 10)
    return u * u + v * v <= 1
  }

  /** How far the lobe reaches past the edge it grew from (0 when none). */
  get reach(): number {
    const { lobe, at } = this
    return lobe.live ? Math.hypot(lobe.x - at[lobe.k * 2], lobe.y - at[lobe.k * 2 + 1]) : 0
  }

  get settled(): boolean { return this.calm }
  get finger(): { x: number; y: number } | null { return this.down ? this.tip : null }

  /** A finger from outside pushes the edge ahead of it. */
  private shove(x: number, y: number): void {
    const { n, at } = this
    for (let i = 0; i < n * 2; i += 2) {
      const dx = at[i] - x, dy = at[i + 1] - y, far = Math.hypot(dx, dy)
      if (far >= FINGER || far < 1e-6) continue
      this.nudge(i, (dx * (FINGER - far)) / far, (dy * (FINGER - far)) / far)
    }
  }

  /** Moves one point's dent, and the point with it, as far as a dent may go. */
  private nudge(i: number, dx: number, dy: number): void {
    const { dent, at } = this, form = this.form, deep = form ? 0.5 * Math.min(form.rx, form.ry) + 4 : 0
    const give = this.feel.give, x = dent[i] + dx * give, y = dent[i + 1] + dy * give, d = Math.hypot(x, y), k = d > deep ? deep / d : 1
    at[i] += x * k - dent[i]; at[i + 1] += y * k - dent[i + 1]
    dent[i] = x * k; dent[i + 1] = y * k
  }

  private mark(x: number, y: number, joined: number): void {
    const t = this.trail
    let count = 0
    while (count < MARKS && t[count * 4 + 2] > 0) count++
    // A mark every dozen units of travel is enough to draw a furrow through.
    if (joined && count && Math.hypot(t[count * 4 - 4] - x, t[count * 4 - 3] - y) < 12) return
    if (count === MARKS) { t.copyWithin(0, 4); count-- }
    t[count * 4] = x; t[count * 4 + 1] = y; t[count * 4 + 2] = 1; t[count * 4 + 3] = joined
  }

  /** Keeps every number sane whatever the finger does: dents stay shallow, points stay near, nothing runs away. */
  private bound(): void {
    const { n, at, dent, vel, rest } = this, form = this.form
    const wide = 2.2 * Math.max(this.rx, this.ry, form ? Math.max(form.rx, form.ry) : 0) + 4
    for (let i = 0; i < n * 2; i += 2) {
      const d = Math.hypot(dent[i], dent[i + 1]), r = Math.hypot(at[i], at[i + 1]), v = Math.hypot(vel[i], vel[i + 1])
      if (r > wide) { at[i] *= wide / r; at[i + 1] *= wide / r }
      if (v > 1500) { vel[i] *= 1500 / v; vel[i + 1] *= 1500 / v }
      if (!(d + r + v < Infinity)) { dent[i] = dent[i + 1] = vel[i] = vel[i + 1] = 0; at[i] = rest[i]; at[i + 1] = rest[i + 1] }
    }
  }

  /** After any touch or tick: sane numbers, the resting amount (less what is out in the lobe), and the outline as drawn. */
  private hold(): void {
    this.bound(); unfold(this.at, this.rest, null); swell(this.at, this.off, area(this.rest) - this.lobe.area, 6); this.compose()
  }

  /** The outline as drawn: the ring, with the lobe laid over the seven points round its root. */
  private compose(): void {
    const { n, at, out, lobe } = this, m = n * 2
    for (let i = 0; i < m; i++) out[i] = at[i]
    lobe.area = 0
    if (!lobe.live) return
    const k = lobe.k * 2, bx = at[k], by = at[k + 1], long = Math.hypot(lobe.x - bx, lobe.y - by)
    if (long < 1) return
    const ex = (lobe.x - bx) / long, ey = (lobe.y - by) / long, grown = Math.min(1, long / 24), mix = grown * grown * (3 - 2 * grown)
    const side = -ey * (at[(k + 2) % m] - at[(k + m - 2) % m]) + ex * (at[(k + 3) % m] - at[(k + m - 1) % m]) < 0 ? -1 : 1
    // Shoulders where it leaves the lump, a neck that thins the further it is pulled, and a knob under the finger.
    const neck = Math.max(7, 26 / (1 + long / 70))
    for (let j = -3; j <= 3; j++) {
      const i = (k + j * 2 + m) % m, s = Math.sign(j) * side, step = Math.abs(j)
      const along = step === 0 ? long + 12 : step === 1 ? long - 3 : step === 2 ? long * 0.6 : Math.min(long * 0.15, 22), across = step === 0 ? 0 : step === 1 ? 15 : step === 2 ? neck : 27
      const x = bx + ex * along - ey * across * s, y = by + ey * along + ex * across * s
      out[i] += (x - out[i]) * mix; out[i + 1] += (y - out[i + 1]) * mix
    }
    // The lump pays for its lobe only in part, and never much: it stays a lump.
    lobe.area = Math.max(0, Math.min((area(out) - area(at)) * PAID, area(this.rest) * PAID * 0.2))
  }

  private tick(h: number): void {
    const { n, goal, rest, dent, at, vel, aim, off, lobe, trail, feel } = this, form = this.form, m = n * 2
    const ease = 1 - Math.exp(-h * EASE)
    let moving = 0
    for (let i = 0; i < m; i++) { const gap = goal[i] - rest[i]; rest[i] += gap * ease; moving = Math.max(moving, Math.abs(gap)) }
    this.rx += ((form ? form.rx : 0) - this.rx) * ease; this.ry += ((form ? form.ry : 0) - this.ry) * ease
    // Dents hold under the finger, wait as long as this stuff makes them wait, and then fill.
    if (!this.down) this.quiet += h
    const keep = Math.exp(-h * (this.down ? 1 / (feel.hold + 1.2) : this.quiet > feel.hold ? 1 / feel.fill : 0))
    const fade = h / (feel.hold + feel.fill * 3)
    let marks = 0
    // Marks age, and the live ones close up to the front of the list.
    for (let i = 0; i < MARKS; i++) { const life = trail[i * 4 + 2] - fade; if (life > 0) { trail.copyWithin(marks * 4, i * 4, i * 4 + 4); trail[marks++ * 4 + 2] = life } }
    for (let i = marks; i < MARKS; i++) trail[i * 4 + 2] = 0
    // Where each point wants to be: its resting place and its dent, moved out or in so the whole holds its amount.
    for (let i = 0; i < m; i++) aim[i] = rest[i] + dent[i] * keep
    unfold(aim, rest, null)
    for (let i = 0; i < m; i++) dent[i] = aim[i] - rest[i]
    swell(aim, off, area(rest) - lobe.area, 0.3 * Math.min(this.rx, this.ry))
    for (let i = 0; i < m; i++) off[i] = at[i] - aim[i]
    const w = (form && form.spring) || FOLLOW, z = form && form.spring ? feel.damp * (1 - 0.55 * form.rise) : 1
    let fast = 0, away = 0, dented = 0
    for (let i = 0; i < m; i++) {
      const u = off[i], pull = off[(i + m - 2) % m] + off[(i + 2) % m] - 2 * u
      vel[i] += (w * w * (RING * pull - u) - 2 * z * w * vel[i]) * h
      at[i] += vel[i] * h
      fast = Math.max(fast, Math.abs(vel[i])); away = Math.max(away, Math.abs(u)); dented = Math.max(dented, Math.abs(dent[i]))
    }
    if (lobe.live && form) {
      const bx = at[lobe.k * 2], by = at[lobe.k * 2 + 1]
      if (lobe.held) {
        const dx = this.tip.x - bx, dy = this.tip.y - by, far = Math.hypot(dx, dy) || 1, cap = Math.min(1, form.reachMost / far), follow = 1 - Math.exp(-h * 28)
        lobe.x += (bx + dx * cap - lobe.x) * follow; lobe.y += (by + dy * cap - lobe.y) * follow
        lobe.vx = lobe.vy = 0; lobe.far = Infinity
      } else {
        const s = feel.snap
        lobe.vx += (-s * s * (lobe.x - bx) - 0.4 * s * lobe.vx) * h; lobe.vy += (-s * s * (lobe.y - by) - 0.4 * s * lobe.vy) * h
        lobe.x += lobe.vx * h; lobe.y += lobe.vy * h
        const far = Math.hypot(lobe.x - bx, lobe.y - by)
        if (far < 6 || far > lobe.far) {
          // Home: what speed it had goes into the lump as a plop.
          const speed = Math.hypot(lobe.vx, lobe.vy) || 1, hit = Math.min(500, speed * 0.3) / speed
          for (let j = -3; j <= 3; j++) { const i = ((lobe.k + j + n) % n) * 2, share = 1 - Math.abs(j) / 4; vel[i] += lobe.vx * hit * share; vel[i + 1] += lobe.vy * hit * share }
          lobe.live = false
          this.kick(Math.min(1, speed / 1500))
        }
        lobe.far = far
      }
    }
    unfold(at, rest, vel); this.hold()
    this.calm = !this.down && !lobe.live && marks === 0 && moving < 0.2 && fast < 3 && away < 0.4 && dented < 0.4
  }
}

/** However it is scribbled, the edge never folds back over itself: each stretch keeps some of its resting length and direction. */
function unfold(p: Float64Array, rest: Float64Array, vel: Float64Array | null): void {
  for (let i = 0, m = p.length; i < m; i += 2) {
    const j = (i + 2) % m, ex = rest[j] - rest[i], ey = rest[j + 1] - rest[i + 1]
    const short = (SLACK - ((p[j] - p[i]) * ex + (p[j + 1] - p[i + 1]) * ey) / (ex * ex + ey * ey || 1)) / 2
    if (short <= 0) continue
    p[i] -= ex * short; p[i + 1] -= ey * short; p[j] += ex * short; p[j + 1] += ey * short
    if (vel) { vel[i] *= 0.6; vel[i + 1] *= 0.6; vel[j] *= 0.6; vel[j + 1] *= 0.6 }
  }
}

/** Grows or shrinks a ring along its normals until it encloses `want`, by at most `most` units. `spare` is scratch. */
function swell(p: Float64Array, spare: Float64Array, want: number, most: number): void {
  const m = p.length
  let edge = 0
  spare.set(p)
  for (let i = 0; i < m; i += 2) edge += Math.hypot(p[(i + 2) % m] - p[i], p[(i + 3) % m] - p[i + 1])
  if (edge < 1) return
  const by = Math.max(-most, Math.min(most, (want - area(p)) / edge))
  for (let i = 0; i < m; i += 2) {
    const tx = spare[(i + 2) % m] - spare[(i + m - 2) % m], ty = spare[(i + 3) % m] - spare[(i + m - 1) % m], len = Math.hypot(tx, ty) || 1
    p[i] += (ty / len) * by; p[i + 1] -= (tx / len) * by
  }
}

/** The area inside a closed ring of x,y pairs. */
function area(p: ArrayLike<number>): number {
  let sum = 0
  for (let i = 0, m = p.length; i < m; i += 2) sum += p[i] * p[(i + 3) % m] - p[(i + 2) % m] * p[i + 1]
  return sum / 2
}
