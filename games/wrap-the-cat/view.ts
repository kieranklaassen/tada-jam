import type { Note } from './audio'
import { BOWS, BARE, HUBS, KIN, ROLL, SCRAPS, T, WRAPS, tail } from './things'
import { PAPER, SKIN, Stamps, darker, surface, type Ctx } from './crepe'
import { handPose, type Guidance, type HandPose } from './guidance'
import { bareRun, hintFor, type Hint } from './guide'
import type { Point } from './input'
import { DOOR, FULL, MOUSE, ROLLS, SPECS, WALL_FOOT, WEDGES, isAir, type FixedId, type Id, type Paper, type Spec } from './layout'
import { MOUSE_BEATS, WALK, drawOrder, isParcel, isPartial, specOf, tiedTo, topOf, type Event, type Kin, type Scrap, type World } from './model'
import { poseOf, ringing, still, type Pose, type Since } from './motion'
import type { Play, Poke } from './play'
import { WINDOW, paintRoom } from './room'
import { SHIVER } from './voices'

// Draws the room from the rules, and keeps what is only to be seen: springs,
// paper in the air, where eyes have got to. Nothing here is saved and nothing
// here decides anything.

/** The most pictures one frame may stamp. */
export const STAMP_LIMIT = 150
const LONG = 99

type Seen = Since & { grow: Float32Array; pose: Pose; spin: number; spun: number }
const seen = (): Seen => ({ lay: LONG, bow: LONG, tear: LONG, burst: LONG, poke: LONG, grow: new Float32Array(WEDGES), pose: still(), spin: 0, spun: 0 })
type Flight = { scrap: Scrap | null; paper: Paper; from: Point; to: Point; t: number; seconds: number; high: number; turn: number; eaten: boolean }

const ease = (t: number) => t * t * (3 - 2 * t)
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))

export class View {
  readonly stamps = new Stamps()
  private room: { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number } | null = null
  private time = 0
  private readonly of: Record<Id, Seen> = { bike: seen(), cat: seen(), grandpa: seen(), giraffe: seen(), tuba: seen(), tree: seen(), air0: seen(), air1: seen() }
  private flights: Flight[] = []
  private puffs: { at: Point; t: number }[] = []
  private moths: { at: Point; t: number }[] = []
  private look: Point = { x: SPECS.bike.mid.x, y: SPECS.bike.mid.y }
  private gaze: Point = { ...this.look }
  private rolls = [LONG, LONG, LONG]
  private noses = LONG
  private doorPoke = LONG
  private visitT = 0
  private chew = LONG
  private shivered = 0
  private still = 0
  sounds: Note[][] = []
  /** A half wrapped thing's paper, cut to what is laid. */
  private readonly cuts: Partial<Record<Id, { canvas: HTMLCanvasElement; ctx: Ctx; key: string; scale: number }>> = {}
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private queue = Object.values(WRAPS).flat().flatMap((x) => [x.out, x.under])

  sized(make: (w: number, h: number) => { canvas: HTMLCanvasElement; ctx: Ctx }, scale: number, x: number, y: number, w: number, h: number): void {
    this.stamps.at(scale)
    if (this.room) this.room.canvas.width = this.room.canvas.height = 0
    const made = make(Math.max(1, Math.ceil(w * scale)), Math.max(1, Math.ceil(h * scale)))
    made.ctx.scale(scale, scale)
    made.ctx.translate(-x, -y)
    paintRoom(made.ctx, x, y, w, h)
    for (const s of [...Object.values(BARE), ...Object.values(T), ...Object.values(BOWS), ...Object.values(ROLL), ...Object.values(SCRAPS), ...Object.values(KIN).flatMap((k) => [k.head, k.body])]) this.stamps.warm(s)
    for (const w0 of WRAPS.bike) { this.stamps.warm(w0.out); this.stamps.warm(w0.under) }
    this.queue = Object.values(WRAPS).flat().flatMap((q) => [q.out, q.under])
    this.room = { canvas: made.canvas, x, y, w, h }
  }

  dispose(): void {
    this.stamps.clear()
    for (const cut of Object.values(this.cuts)) cut.canvas.width = cut.canvas.height = 0
    if (this.room) this.room.canvas.width = this.room.canvas.height = 0
    this.room = null
  }

  poke(p: Poke): void {
    this.look = p.at
    this.still = 0
    this.shivered = 3
    if (p.touched.kind === 'thing') this.of[p.touched.id].poke = 0
    else if (p.touched.kind === 'door') this.doorPoke = 0
    else if (p.touched.kind === 'room') this.puff(p.at)
  }
  private puff(at: Point): void { this.puffs.push({ at: { ...at }, t: 0 }); if (this.puffs.length > 3) this.puffs.shift() }

  notice(e: Event, w: World): void {
    switch (e.type) {
      case 'lay': this.of[e.id].lay = 0; break
      case 'bow': this.of[e.id].bow = 0; break
      case 'tie': this.of[e.a].tear = 0; this.of[e.b].tear = -0.15; break
      case 'tear': {
        this.of[e.id].tear = 0
        const other = tiedTo(w, e.id)
        if (other) this.of[other].tear = -0.3
        this.fling(e.at, e.paper, 2)
        break
      }
      case 'burst': {
        const v = this.of[e.id]
        v.burst = 0; v.bow = LONG; v.tear = LONG; v.lay = LONG
        v.grow.fill(1)
        v.spin = 26
        const from = e.at
        e.scraps.forEach((scrap, i) => this.flights.push({ scrap, paper: scrap.paper, from: { ...from }, to: scrap, t: -i * 0.03, seconds: 0.85 + i * 0.1, high: 190 + i * 40, turn: 7, eaten: false }))
        this.fling(from, e.paper, 6)
        break
      }
      case 'moth': this.moths.push({ at: e.at, t: 0 }); this.puff(e.at); break
      case 'paper': this.rolls[e.paper] = 0; break
      case 'bump': this.of.bike.lay = 0; this.of.cat.lay = 0; break
      case 'sit': this.of.cat.lay = 0; break
      case 'eat': this.flights.push({ scrap: null, paper: e.scrap.paper, from: { x: e.scrap.x, y: e.scrap.y }, to: { x: 856, y: 104 }, t: 0, seconds: 0.55, high: 60, turn: 5, eaten: true }); break
      case 'noses': this.noses = 0; break
      case 'visit': this.visitT = 0; break
      case 'stir': case 'tug': case 'out': case 'squeak': break
      default: e satisfies never
    }
  }

  /** Bits of paper that are only seen. */
  private fling(from: Point, paper: Paper, n: number): void {
    for (let i = 0; i < n && this.flights.length < 40; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2 + this.time
      this.flights.push({ scrap: null, paper, from: { ...from }, to: { x: from.x + Math.cos(a) * 260, y: 900 }, t: 0, seconds: 0.9 + (i % 3) * 0.12, high: 130 + (i % 4) * 50, turn: 9, eaten: false })
    }
  }

  advance(w: World, play: Play, dt: number): void {
    this.time += dt
    for (const id of Object.keys(this.of) as Id[]) {
      const v = this.of[id], top = topOf(w, id)
      v.lay += dt; v.bow += dt; v.tear += dt; v.burst += dt; v.poke += dt
      v.spun += v.spin * dt
      v.spin *= Math.exp(-dt * 1.6)
      for (let i = 0; i < WEDGES; i++) {
        const want = top && top.cover & (1 << i) ? 1 : 0
        v.grow[i] = want ? Math.min(1, v.grow[i] + dt * 7) : 0
      }
    }
    this.rolls = this.rolls.map((x) => x + dt)
    this.noses += dt; this.doorPoke += dt; this.chew += dt; this.visitT += dt
    for (const f of this.flights) { f.t += dt; if (f.eaten && f.t >= f.seconds) this.chew = 0 }
    this.flights = this.flights.filter((f) => f.t < f.seconds)
    for (const p of this.puffs) p.t += dt
    this.puffs = this.puffs.filter((p) => p.t < 0.5)
    for (const m of this.moths) m.t += dt
    this.moths = this.moths.filter((m) => m.t < 3)
    if (play.hand) this.look = play.hand
    const k = Math.min(1, dt * 7)
    this.gaze.x += (this.look.x - this.gaze.x) * k
    this.gaze.y += (this.look.y - this.gaze.y) * k
    // The half wrapped bicycle shivers a few times while nobody has touched anything.
    this.still += dt
    if (this.shivered < 3 && w.mouse === null && this.still > 2.5 && isPartial(w, 'bike')) { this.still = 0; this.shivered++; this.of.bike.lay = 0; this.sounds.push(SHIVER) }
    // Papers not yet asked for are painted a few at a time, so that no touch waits for one.
    const next = this.queue.find((s) => !this.stamps.has(s))
    if (next && !play.touch.active) this.stamps.warm(next)
  }

  draw(c: Ctx, w: World, play: Play | null, guidance: Guidance | null): void {
    const st = this.stamps
    st.stamped = 0
    if (this.room) { c.drawImage(this.room.canvas, this.room.x, this.room.y, this.room.w, this.room.h); st.stamped++ }
    this.snow(c)
    this.doorway(c, w)
    this.strip(c, w)
    const inAir = new Set(this.flights.map((f) => f.scrap))
    for (const s of w.scraps) if (!inAir.has(s)) st.stampAt(c, SCRAPS[s.paper], s.x, s.y, s.turn, 1.05)
    const hint = guidance && (guidance.glow > 0 || guidance.demo !== null) ? hintFor(w) : null
    if (hint && guidance) this.glow(c, w, hint, guidance.glow)
    // Everything that stands, back to front, with the family among it.
    const items: { y: number; draw: () => void }[] = drawOrder(w).map((id) => ({ y: specOf(w, id)!.y, draw: () => this.thing(c, w, id) }))
    for (const m of w.visit?.members ?? []) if (m.phase !== 'wait' && m.phase !== 'gone') items.push({ y: m.at.y + 1, draw: () => this.kin(c, m.who, m.at, m.phase, m.t, m.target ? Math.sign((specOf(w, m.target)?.x ?? m.at.x) - m.at.x) || 1 : 1) })
    items.push({ y: 699, draw: () => this.mouse(c, w) })
    ROLLS.forEach((r, i) => items.push({ y: r.y + 44, draw: () => this.roll(c, w, r, i as Paper) }))
    items.sort((a, b) => a.y - b.y)
    for (const i of items) i.draw()
    for (const [a, b] of w.ties) this.sash(c, w, a, b)
    this.held(c, w, play)
    for (const f of this.flights) {
      if (f.t < 0) continue
      const k = f.t / f.seconds, x = f.from.x + (f.to.x - f.from.x) * k, y = f.from.y + (f.to.y - f.from.y) * k - Math.sin(k * Math.PI) * f.high
      st.stampAt(c, SCRAPS[f.paper], x, y, (f.scrap?.turn ?? 0) + (1 - k) * f.turn, f.eaten ? 1.05 - k * 0.6 : 1.05)
    }
    for (const m of this.moths) st.stampAt(c, T.moth, m.at.x + Math.sin(m.t * 5) * 34, m.at.y - m.t * 110, Math.sin(m.t * 4) * 0.3, 0.35 + Math.abs(Math.sin(m.t * 22)) * 0.65, 1)
    for (const p of this.puffs) { c.globalAlpha = 1 - p.t * 2; st.stampAt(c, T.puff, p.at.x, p.at.y, 0, 0.5 + p.t * 2.2) }
    c.globalAlpha = 1
    if (hint && guidance) this.guide(c, w, hint, guidance)
  }

  private snow(c: Ctx): void {
    const f = WINDOW
    c.save()
    c.beginPath(); c.rect(f.x + 7, f.y + 7, f.w - 14, f.h - 14); c.clip()
    c.fillStyle = '#f6f8fa'
    c.beginPath()
    for (let i = 0; i < 14; i++) {
      const y = ((i * 53 + this.time * (22 + (i % 4) * 7)) % (f.h + 20)) - 10, x = ((i * 37) % f.w) + Math.sin(this.time + i) * 7
      c.moveTo(f.x + x + 3, f.y + y)
      c.arc(f.x + x, f.y + y, 2.4 + (i % 3) * 0.8, 0, 7)
    }
    c.fill()
    c.restore()
  }

  // --- Things ------------------------------------------------------------------

  private thing(c: Ctx, w: World, id: Id): void {
    const s = specOf(w, id)!, v = this.of[id], st = this.stamps
    const p = poseOf(id, v, this.time, v.pose)
    if (id === 'cat' && w.walk !== null && w.walk > WALK.start) { const k = w.walk * 11; p.rot += Math.sin(k) * 0.13; p.dy -= Math.abs(Math.sin(k)) * 10 }
    else if (id === 'cat' && w.catX !== SPECS.cat.x) { const k = this.time * 14; p.rot += Math.sin(k) * 0.1; p.dy -= Math.abs(Math.sin(k)) * 8 }
    c.save()
    c.translate(s.x + p.dx, s.y + p.dy)
    c.rotate(p.rot)
    c.transform(p.sx, 0, -p.skew, p.sy, 0, 0)
    if (isAir(id)) {
      const k = s.rx / 54
      // On the wall it hangs from a wire.
      if (s.y < WALL_FOOT) this.mark(c, '#4b6b3c', 6, () => { c.moveTo(0, -s.ry * 1.7); c.quadraticCurveTo(16, -s.ry * 2.2, 0, -s.ry * 2.5); c.quadraticCurveTo(-12, -s.ry * 2.6, -10, -s.ry * 2.35) })
      c.scale(k, k)
      c.translate(0, -10)
      this.papers(c, w, id, { ...s, mid: { x: s.x, y: s.y - 60 }, rx: 54, ry: 50 })
      if (isParcel(w, id)) { this.corner(c, w, id, 22, -70); this.bow(c, w, id, 0, -100, 0.8) }
      c.restore()
      return
    }
    const layers = w.layers[id], covered = layers.some((l, i) => l.paper !== 2 && l.cover === FULL && (i < layers.length - 1 || (!l.torn && v.grow.every((g) => g >= 1))))
    this.before(c, id)
    if (!covered) { st.stamp(c, BARE[id]); this.middle(c, id) }
    this.papers(c, w, id, s)
    this.after(c, id, w)
    if (isParcel(w, id)) { this.corner(c, w, id, s.bow.x - s.x + 34, s.bow.y - s.y + 34); this.bow(c, w, id, s.bow.x - s.x, s.bow.y - s.y, id === 'cat' ? 0.8 : 1) }
    c.restore()
  }

  /** Each paper over the last, the outermost through the wedges it has. */
  private papers(c: Ctx, w: World, id: Id, s: Spec): void {
    const layers = w.layers[id], v = this.of[id], st = this.stamps
    const set = WRAPS[isAir(id) ? 'air' : id]
    let from = 0
    layers.forEach((l, i) => { if (l.paper !== 2 && l.cover === FULL && i > from && (i < layers.length - 1 || v.lay > 0.4)) from = i })
    const mx = s.mid.x - s.x, my = s.mid.y - s.y
    for (let i = from; i < layers.length; i++) {
      const l = layers[i], top = i === layers.length - 1
      c.save()
      const fat = 1 + i * 0.045
      c.translate(mx, my); c.scale(fat, fat); c.translate(-mx, -my)
      if (!top || (l.cover === FULL && v.grow.every((g) => g >= 1))) st.stamp(c, set[l.paper].out)
      else {
        // Cutting to the wedges is dear, so what is cut is kept until it changes.
        const { out, under } = set[l.paper], key = `${out.name} ${l.cover} ${v.grow.join()}`, b = out.box
        let cut = this.cuts[id]
        if (!cut || cut.scale !== st.scale) {
          if (cut) cut.canvas.width = cut.canvas.height = 0
          cut = this.cuts[id] = { ...surface.make(Math.ceil(b.w * st.scale), Math.ceil(b.h * st.scale)), key: '', scale: st.scale }
        }
        if (cut.key !== key) {
          cut.key = key
          const q = cut.ctx
          q.setTransform(st.scale, 0, 0, st.scale, 0, 0)
          q.clearRect(0, 0, b.w, b.h)
          q.translate(-b.x, -b.y)
          q.save()
          this.wedges(q, s, l.cover, v.grow, mx, my, 0)
          st.stamp(q, out)
          q.restore()
          // The pale edge curls back where the paper ends.
          q.save()
          if (this.wedges(q, s, l.cover, v.grow, mx, my, 0.16)) st.stamp(q, under)
          q.restore()
        }
        c.drawImage(cut.canvas, b.x, b.y, b.w, b.h)
        st.stamped++
      }
      c.restore()
    }
  }

  /** Clips to the laid wedges, or with `lip` to a narrow band along the edges of them. */
  private wedges(c: Ctx, s: Spec, cover: number, grow: Float32Array, mx: number, my: number, lip: number): boolean {
    const step = (Math.PI * 2) / WEDGES
    const edge = (a: number, r: number, frill: number): readonly [number, number] => {
      const q = a + (r - 0.6) * 0.55 + frill * Math.sin(r * 22) * 0.035
      return [mx + Math.cos(q) * r * s.rx, my + Math.sin(q) * r * s.ry]
    }
    const RS = [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1, 1.15, 1.3, 1.5, 1.8]
    const band = (a: number, b: number) => {
      RS.forEach((r, i) => { const p = edge(a, r, 1); if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]) })
      const n = Math.max(1, Math.round((b - a) / 0.3))
      for (let i = 1; i < n; i++) { const p = edge(a + ((b - a) * i) / n, 1.8, 0); c.lineTo(p[0], p[1]) }
      for (let i = RS.length - 1; i >= 0; i--) { const p = edge(b, RS[i], 1); c.lineTo(p[0], p[1]) }
      c.closePath()
    }
    c.beginPath()
    let any = false
    const has = (i: number) => (cover & (1 << ((i + WEDGES) % WEDGES))) !== 0
    for (let i = 0; i < WEDGES; i++) {
      if (!has(i) || (has(i - 1) && cover !== FULL)) continue
      let n = 1
      while (cover !== FULL && n < WEDGES && has(i + n)) n++
      if (cover === FULL) n = 1
      // Each end is as far as its wedge has spread.
      const a = i * step + (n === 1 ? 0 : (1 - grow[i]) * step), b = (i + n - 1 + (n === 1 ? grow[i] : grow[(i + n - 1) % WEDGES])) * step
      if (cover === FULL) { band(a, a + step * grow[i] + 0.02); continue }
      if (lip === 0) band(a, b)
      else { any = true; band(a, a + lip); band(b - lip, b) }
    }
    c.clip()
    return any
  }

  private bow(c: Ctx, w: World, id: Id, x: number, y: number, size: number): void {
    const v = this.of[id], t = v.bow
    const k = t < 0.1 ? 0 : t < 1.5 ? 1 - Math.exp(-(t - 0.1) * 8) * Math.cos((t - 0.1) * 24) : 1
    const n = w.layers[id].length - 1
    this.stamps.stampAt(c, BOWS[topOf(w, id)!.paper], x, y - n * 9, Math.sin(this.time * 1.7 + x) * 0.04 + ringing(v.poke, 20, 5) * 0.3, k * size)
  }

  /** A corner that did not stick, beside the bow: it lifts and falls, and wants pulling. */
  private corner(c: Ctx, w: World, id: Id, x: number, y: number): void {
    const p = PAPER[topOf(w, id)!.paper], v = this.of[id]
    if (v.bow < 0.8) return
    const lift = 0.5 + 0.5 * Math.sin(this.time * 2.3 + x) + ringing(v.poke, 18, 5) * 0.6, tip = 30 + lift * 14
    c.fillStyle = 'rgba(60,20,20,0.25)'
    c.beginPath(); c.moveTo(x - 20, y + 6); c.quadraticCurveTo(x + tip * 0.5, y + 12, x + 34, y + 30); c.lineTo(x + 10, y + 34); c.closePath(); c.fill()
    c.fillStyle = p.under
    c.strokeStyle = p.deep
    c.lineWidth = 2
    c.lineJoin = 'round'
    c.beginPath(); c.moveTo(x - 20, y + 4); c.quadraticCurveTo(x, y - 18 - lift * 6, x + tip, y - 4 - lift * 12); c.quadraticCurveTo(x + 22, y + 10, x + 10, y + 34); c.closePath(); c.fill(); c.stroke()
  }

  private spot(c: Ctx, x: number, y: number, r: number, color: string): void {
    c.fillStyle = color
    c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, 7); c.fill()
  }
  /** An eye that looks at what the child does. `at` is where it is in the room. */
  private eye(c: Ctx, x: number, y: number, r: number, at: Point, white: string, shut = 0): void {
    const dx = this.gaze.x - at.x, dy = this.gaze.y - at.y, d = Math.hypot(dx, dy) || 1, far = Math.min(1, d / 120) * r * 0.42
    c.save()
    c.translate(x, y)
    c.scale(1, Math.max(0.08, 1 - shut))
    this.spot(c, 0, 0, r, white)
    this.spot(c, (dx / d) * far, (dy / d) * far, r * 0.56, '#241c28')
    this.spot(c, (dx / d) * far - r * 0.18, (dy / d) * far - r * 0.2, r * 0.17, '#ffffff')
    c.restore()
  }
  private blink(seed: number): number {
    const t = (this.time + seed) % 4.3
    return t < 0.16 ? Math.sin((t / 0.16) * Math.PI) : 0
  }
  private mark(c: Ctx, color: string, width: number, draw: () => void): void {
    c.strokeStyle = color
    c.lineWidth = width
    c.lineCap = 'round'
    c.beginPath()
    draw()
    c.stroke()
  }

  /** Under the thing and its paper. */
  private before(c: Ctx, id: FixedId): void {
    const st = this.stamps
    if (id === 'bike') for (const h of HUBS) st.stampAt(c, T.wheel, h[0], h[1], this.of.bike.spun)
    if (id === 'cat') {
      const v = this.of.cat, whip = Math.sin(this.time * (v.lay < 0.8 ? 16 : 1.8)) * (v.lay < 0.8 ? 26 : 10), puffed = v.burst < 1 ? 20 : 0
      tail(c, [[54, -10], [86, -18], [104 + whip * 0.3, -46], [100 + whip, -84 - puffed], [112 + whip * 1.3, -104 - puffed]])
    }
    if (id === 'tree') { const b = this.of.tree.burst; st.stampAt(c, T.star, 0, -424, Math.sin(this.time * 1.2) * 0.06 + ringing(b, 12, 2), 1) }
  }
  /** On the bare thing, where paper covers it. */
  private middle(c: Ctx, id: FixedId): void {
    if (id === 'bike') this.stamps.stampAt(c, T.saddle, -52, -180)
  }

  /** What is always out: heads, paws, slippers, a star, a bell. */
  private after(c: Ctx, id: FixedId, w: World): void {
    const st = this.stamps, v = this.of[id], s = specOf(w, id)!, dressed = w.layers[id].length > 0
    switch (id) {
      case 'bike': st.stampAt(c, T.bell, 100, -240, ringing(v.burst, 40, 3) * 0.5 + ringing(v.lay, 30, 6) * 0.25); break
      case 'cat': {
        for (const x of [-22, 24]) st.stampAt(c, T.paw, x, -4 - (w.walk !== null && w.walk > WALK.start ? Math.max(0, Math.sin(w.walk * 11 + x)) * 10 : 0))
        const flat = clamp(1 - v.lay / 1.2), nod = ringing(v.poke, 18, 6) * 6
        const hx = clamp((this.gaze.x - s.x) / 300, -1, 1) * 8, hy = -146 + flat * 8 + nod
        st.stampAt(c, T.catHead, hx, hy, Math.sin(this.time * 1.3) * 0.02, 1 + (v.burst < 0.9 ? 0.12 : 0), 1 - flat * 0.08)
        const shut = Math.max(this.blink(0.7), dressed && v.lay > 0.6 ? 0.42 : 0)
        const at = { x: s.x, y: s.y - 150 }
        for (const x of [-25, 25]) this.eye(c, hx + x, hy - 6, v.burst < 1 ? 19 : 16, at, '#e8dc7a', v.burst < 1 ? 0 : shut)
        // Put out: the brows come down over the eyes.
        if (dressed) for (const q of [-1, 1]) this.mark(c, '#2c2833', 5, () => { c.moveTo(hx + q * 10, hy - 15); c.lineTo(hx + q * 40, hy - 25) })
        this.mark(c, '#2c2833', 3, () => { const m = dressed ? -5 : 5; c.moveTo(hx - 15, hy + 24); c.quadraticCurveTo(hx - 7, hy + 24 + m, hx, hy + 18); c.quadraticCurveTo(hx + 7, hy + 24 + m, hx + 15, hy + 24) })
        this.mark(c, 'rgba(255,250,240,0.8)', 2, () => { for (const q of [-1, 1]) for (const d of [-5, 5]) { c.moveTo(hx + q * 24, hy + 18 + d * 0.4); c.lineTo(hx + q * 62, hy + 16 + d * 1.6) } })
        break
      }
      case 'grandpa': {
        for (const x of [-38, 38]) st.stampAt(c, T.slipper, x, -2, x < 0 ? -0.12 : 0.12)
        const breath = Math.sin(this.time * 1.35), big = v.bow < 1.5 ? clamp((v.bow - 0.3) / 1.2) : 0, sneeze = v.burst < 1 ? (v.burst < 0.5 ? -14 * (v.burst / 0.5) : 22 * Math.exp(-(v.burst - 0.5) * 6)) : 0
        const hy = -256 + breath * 4 - big * 14 + sneeze, tilt = 0.14 + breath * 0.025
        c.save()
        c.translate(4, hy)
        c.rotate(tilt)
        st.stamp(c, T.grandpaHead)
        for (const x of [-20, 20]) this.mark(c, '#5b4038', 4, () => { c.moveTo(x - 11, -6); c.quadraticCurveTo(x, 4, x + 11, -6) })
        for (const x of [-22, 22]) this.mark(c, '#f4f0ea', 8, () => { c.moveTo(x - 13, -22 - breath * 2); c.lineTo(x + 13, -22 - breath * 2) })
        const open = clamp(0.35 + breath * 0.35 + big * 0.5 + (v.burst > 0.45 && v.burst < 0.8 ? 0.6 : 0))
        c.fillStyle = '#6b2f30'
        c.beginPath(); c.ellipse(2, 40, 13, 5 + open * 12, 0, 0, 7); c.fill()
        st.stampAt(c, T.moustache, 0, 24 - open * 5, 0, 1 + big * 0.2, 1 - open * 0.45)
        st.stampAt(c, T.nose, 0, 12)
        // The snore, a bubble at his nose.
        const b = Math.max(0, breath) * 11 + big * 30
        if (b > 2) { c.fillStyle = 'rgba(235,246,255,0.6)'; c.beginPath(); c.arc(20 + b * 0.7, 22, b, 0, 7); c.fill() }
        c.restore()
        break
      }
      case 'giraffe': {
        const hy = -470 + ringing(v.burst, 18, 3) * 14, face = this.gaze.x < s.x - 40 ? -1 : 1
        c.save()
        c.translate(100, hy)
        c.scale(face, 1)
        c.rotate(clamp((this.gaze.y - 100) / 900, 0, 0.5) + Math.sin(this.time * 0.9) * 0.02)
        st.stamp(c, T.giraffeHead)
        for (const x of [6, 32]) this.eye(c, x, -22, 13, { x: s.x + 100, y: s.y - 490 }, '#ffffff', this.blink(2.1))
        const chew = this.chew < 1.6 || v.burst < 1.8 ? Math.sin(this.time * 15) * 8 : Math.sin(this.time * 2) * 2
        this.mark(c, '#5a3a2a', 3.4, () => { c.moveTo(42, 32); c.quadraticCurveTo(58 + chew, 42 + Math.abs(chew) * 0.5, 78, 26) })
        c.restore()
        break
      }
      case 'tuba': case 'tree': break
      default: id satisfies never
    }
  }

  // --- Paper in hand -------------------------------------------------------------

  private ribbon(c: Ctx, a: Point, b: Point, paper: Paper, width: number, sag: number): void {
    const p = PAPER[paper], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + sag
    for (const [tone, k] of [[p.deep, 1], [p.main, 0.86], [p.light, 0.2]] as const) {
      c.strokeStyle = tone
      c.globalAlpha = paper === 2 && k < 1 ? 0.75 : 1
      c.lineWidth = width * k
      c.lineCap = 'butt'
      c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(mx, my, b.x, b.y); c.stroke()
    }
    c.globalAlpha = 1
  }
  private small(c: Ctx, at: Point, paper: Paper, turn: number, k = 1): void {
    this.stamps.stampAt(c, ROLL[paper], at.x, at.y, turn, 0.5 * k)
  }

  /** Where the paper of a half wrapped thing comes off it. */
  private loose(w: World, id: Id, at: Point | null): Point {
    const s = specOf(w, id)!, top = topOf(w, id)
    if (at) {
      const dx = (at.x - s.mid.x) / s.rx, dy = (at.y - s.mid.y) / s.ry, d = Math.hypot(dx, dy) || 1, k = Math.min(0.75, d)
      return { x: s.mid.x + (dx / d) * k * s.rx, y: s.mid.y + (dy / d) * k * s.ry }
    }
    const run = bareRun(top?.cover ?? 0), a = (run.from / WEDGES) * Math.PI * 2
    return { x: s.mid.x + Math.cos(a) * s.rx * 0.8, y: s.mid.y + Math.sin(a) * s.ry * 0.8 }
  }

  private held(c: Ctx, w: World, play: Play | null): void {
    const hand = play?.hand ?? null, s = play?.stroke ?? null
    if (hand && s) {
      const id = s.focus
      const paper = id && isPartial(w, id) ? topOf(w, id)!.paper : w.paper
      if (id && specOf(w, id) && isPartial(w, id)) this.ribbon(c, this.loose(w, id, hand), hand, paper, 30, 14)
      else if (s.path.length > 2) for (let i = Math.max(1, s.path.length - 26); i < s.path.length; i++) this.ribbon(c, s.path[i - 1], s.path[i], paper, 12 + (i - s.path.length + 26) * 0.5, 0)
      this.small(c, hand, paper, (s.path.length % 60) * 0.2)
      return
    }
    // The roll hangs from what is half wrapped.
    for (const id of Object.keys(this.of) as Id[]) {
      if (!isPartial(w, id) || !specOf(w, id)) continue
      const a = this.loose(w, id, null), b = { x: a.x + 34, y: Math.min(760, a.y + 62 + Math.sin(this.time * 1.9) * 4) }
      this.ribbon(c, a, b, topOf(w, id)!.paper, 30, 4)
      this.small(c, { x: b.x + Math.sin(this.time * 1.9) * 4, y: b.y + 16 }, topOf(w, id)!.paper, Math.sin(this.time * 1.9) * 0.12, 1.15)
    }
  }

  /** The end of the bicycle's paper, that the cat sits on. */
  private strip(c: Ctx, w: World): void {
    if (!isPartial(w, 'bike') || w.layers.cat.length) return
    this.ribbon(c, { x: 600, y: 742 }, { x: 900, y: 748 }, topOf(w, 'bike')!.paper, 44, 14)
  }

  private roll(c: Ctx, w: World, at: Point, paper: Paper): void {
    const t = this.rolls[paper], up = w.paper === paper ? 12 : 0, hop = t < 0.5 ? Math.sin((t / 0.5) * Math.PI) * 30 : 0
    this.stamps.stampAt(c, ROLL[paper], at.x, at.y - up - hop, ringing(t, 22, 5) * 0.16, 0.92 + (w.paper === paper ? 0.1 : 0))
  }

  private sash(c: Ctx, w: World, a: Id, b: Id): void {
    const p = specOf(w, a)!, q = specOf(w, b)!
    const pull = ringing(Math.max(0, Math.min(this.of[a].tear, this.of[b].tear)), 26, 4) * 16 + Math.sin(this.time * 3) * 1.5
    this.ribbon(c, p.bow, q.bow, topOf(w, a)?.paper ?? 0, 24, 46 + pull)
    this.stamps.stampAt(c, BOWS[topOf(w, a)?.paper ?? 0], (p.bow.x + q.bow.x) / 2, (p.bow.y + q.bow.y) / 2 + 22 + pull / 2, 0, 0.9)
  }

  // --- Mouse and family ------------------------------------------------------------

  private mouse(c: Ctx, w: World): void {
    const st = this.stamps, t = w.mouse, B = MOUSE_BEATS
    const cheese = { x: MOUSE.x - 6, y: MOUSE.y - 4 }
    let x = MOUSE.x - 88, y = MOUSE.y + 12 + Math.abs(Math.sin(this.time * 2)) * -2, face = 1, laid = 0
    const draw = () => { c.save(); c.translate(x, y); c.scale(face, 1); st.stamp(c, T.mouse); c.restore() }
    if (t !== null && t >= B.run && t < B.bow) {
      const k = (t - B.run) / (B.bow - B.run), a = Math.PI + ease(k) * Math.PI * 4
      x = MOUSE.x + Math.cos(a) * 88; y = MOUSE.y + 8 + Math.sin(a) * 40 - Math.abs(Math.sin(t * 24)) * 6
      face = Math.sin(a) > 0 ? -1 : 1
      laid = ease(k)
    } else if (t !== null && t >= B.bow && t < B.rip) laid = 1
    else if (t !== null && t >= B.rip && t < B.bite) { x = MOUSE.x - 70 - Math.sin(((t - B.rip) / (B.bite - B.rip)) * Math.PI) * 30; y -= Math.sin(((t - B.rip) / (B.bite - B.rip)) * Math.PI) * 40; laid = 0 }
    else if (t !== null && t >= B.bite) { x = MOUSE.x - 64; y -= Math.abs(Math.sin(t * 16)) * 5 }
    st.stampAt(c, t !== null && t >= B.bite ? T.bitten : T.cheese, cheese.x, cheese.y, 0, 1.1)
    if (laid > 0) {
      c.save()
      c.beginPath()
      c.moveTo(cheese.x, cheese.y)
      c.arc(cheese.x, cheese.y, 90, Math.PI, Math.PI + laid * Math.PI * 2)
      c.closePath(); c.clip()
      st.stampAt(c, WRAPS.air[0].out, cheese.x, cheese.y + 56, 0, 0.98)
      c.restore()
      if (t !== null && t < B.bow) this.ribbon(c, { x: cheese.x, y: cheese.y }, { x, y }, 0, 18, 6)
    }
    if (t !== null && t >= B.bow && t < B.rip) { const q = t - B.bow; st.stampAt(c, BOWS[0], cheese.x, cheese.y - 46, 0, 0.7 * (1 - Math.exp(-q * 8) * Math.cos(q * 24))) }
    if (t !== null && t >= B.rip && t < B.bite + 0.3) for (let i = 0; i < 5; i++) { const q = (t - B.rip) / 0.9, a = -0.5 - i * 0.5; st.stampAt(c, SCRAPS[0], cheese.x + Math.cos(a) * q * 130, cheese.y + Math.sin(a) * q * 150 + q * q * 160, q * 6 + i, 0.6) }
    // In front all the way round, so that no paper is ever over it.
    draw()
  }

  private face(c: Ctx, who: Kin, x: number, y: number, at: Point, k: number, agape: number): void {
    const st = this.stamps
    c.save()
    c.translate(x, y)
    c.scale(k, k)
    st.stamp(c, KIN[who].head)
    const [ex, ey, r] = who === 'aunt' ? [17, -6, 12] : who === 'boy' ? [14, -2, 11] : [15, -10, 9]
    for (const q of [-1, 1]) this.eye(c, q * ex, ey, r, at, '#ffffff', this.blink(who === 'aunt' ? 1 : who === 'boy' ? 3 : 2))
    if (who !== 'dog') {
      st.stampAt(c, T.nose, 0, 12, 0, 0.45)
      c.fillStyle = '#7b2f3a'
      c.beginPath(); c.ellipse(0, 28, 9 + agape * 3, 3 + agape * 9, 0, 0, 7); c.fill()
    } else {
      c.fillStyle = '#d97b86'
      c.beginPath(); c.ellipse(4, 30 + Math.sin(this.time * 9) * 2, 7, 10, 0, 0, 7); c.fill()
    }
    c.restore()
  }

  private doorway(c: Ctx, w: World): void {
    if (w.visit) return
    c.save()
    c.beginPath(); c.rect(DOOR.x + 8, DOOR.y, 200, DOOR.h); c.clip()
    const rise = this.noses < 2 ? Math.sin(clamp(this.noses / 2) * Math.PI) * 34 : 0, jolt = ringing(this.doorPoke, 22, 5) * 12
    const heads: readonly (readonly [Kin, number, number])[] = [['aunt', 1126, 268], ['boy', 1114, 372], ['dog', 1124, 462]]
    heads.forEach(([who, x, y], i) => {
      const bob = Math.sin(this.time * (1.4 + i * 0.5) + i) * 4
      this.face(c, who, x - rise * 0.5 + jolt, y + bob, { x, y }, 1, this.noses < 2 ? 1 : 0.15)
    })
    c.restore()
  }

  private kin(c: Ctx, who: Kin, at: Point, phase: string, t: number, side: number): void {
    const st = this.stamps, run = phase === 'run' || phase === 'home', rip = phase === 'rip'
    const rate = who === 'aunt' ? 13 : who === 'boy' ? 19 : 25
    const hop = run ? Math.abs(Math.sin(this.visitT * rate)) * (who === 'dog' ? 26 : 14) : 0
    const lean = run ? Math.sin(this.visitT * rate) * 0.1 : rip ? Math.sin(t * 34) * 0.1 : 0
    const top = who === 'aunt' ? -214 : who === 'boy' ? -124 : -94
    c.save()
    c.translate(at.x, at.y - hop)
    c.rotate(lean)
    st.stamp(c, KIN[who].body)
    if (who !== 'dog') {
      const y = who === 'aunt' ? -160 : -84, reach = who === 'aunt' ? 74 : 48
      for (const q of [-1, 1]) {
        const a = rip ? t * 30 + q * 1.5 : phase === 'look' ? -1.2 : this.visitT * 12 * q
        const hx = rip ? side * reach * 0.8 + Math.cos(a) * 26 : q * (phase === 'look' ? reach * 0.9 : reach * 0.7), hy = rip ? y + 10 + Math.sin(a) * 34 : y + (phase === 'look' ? -20 : 30 + Math.sin(a) * 20)
        this.mark(c, who === 'aunt' ? '#8d4f86' : '#5f8a6a', who === 'aunt' ? 20 : 15, () => { c.moveTo(q * 26, y); c.quadraticCurveTo(q * 40, y + 24, hx, hy) })
        this.spot(c, hx, hy, who === 'aunt' ? 13 : 10, who === 'aunt' ? SKIN : '#d9a37c')
      }
    }
    this.face(c, who, who === 'dog' ? (rip ? side * 30 : 0) : 0, top, at, 1, phase === 'look' ? 1 : rip ? 0.7 : 0.3)
    // They go home with paper on their heads.
    if (phase === 'home') st.stampAt(c, SCRAPS[who === 'aunt' ? 0 : who === 'boy' ? 1 : 2], 0, top - 46, 0.2, 1.2)
    c.restore()
    if (rip) for (let i = 0; i < 3; i++) { const q = (t * 2.6 + i / 3) % 1; st.stampAt(c, SCRAPS[i as Paper], at.x + side * 70 + Math.cos(i * 2.1 + t) * q * 120, at.y - 90 - Math.sin(q * Math.PI) * 120, q * 8, 0.6) }
  }

  // --- Guidance ------------------------------------------------------------------

  private glow(c: Ctx, w: World, hint: Hint, k: number): void {
    const s = hint.kind === 'door' ? null : specOf(w, hint.id)
    const at = s ? s.mid : { x: DOOR.x + 60, y: DOOR.y + DOOR.h / 2 }, rx = s ? s.rx : 90, ry = s ? s.ry : 190
    const beat = 0.5 + 0.5 * Math.sin(this.time * 2.6)
    for (const [g, a] of [[1.28, 0.22], [1.16, 0.3], [1.06, 0.4]] as const) {
      c.globalAlpha = k * a * (0.7 + 0.3 * beat)
      c.fillStyle = '#fff3c4'
      c.beginPath(); c.ellipse(at.x, at.y, rx * g + beat * 6, ry * g + beat * 6, 0, 0, 7); c.fill()
    }
    c.globalAlpha = 1
  }

  private guide(c: Ctx, w: World, hint: Hint, g: Guidance): void {
    if (g.demo === null) return
    const h = handPose(g.demo, hint.kind !== 'door', this.hand)
    let x: number, y: number
    if (hint.kind === 'door') { x = DOOR.x + 60; y = DOOR.y + 190 }
    else {
      const s = specOf(w, hint.id)!
      if (hint.kind === 'circle') {
        const at = (k: number) => { const a = ((hint.from + WEDGES * k) / WEDGES) * Math.PI * 2; return { x: s.mid.x + Math.cos(a) * s.rx * 1.06, y: s.mid.y + Math.sin(a) * s.ry * 1.06 } }
        const p = at(h.travel)
        x = p.x; y = p.y
        // A trace of the paper it would lay.
        c.globalAlpha = h.opacity * 0.75
        const paper = PAPER[isPartial(w, hint.id) ? topOf(w, hint.id)!.paper : w.paper]
        c.strokeStyle = paper.light
        c.lineWidth = 22
        c.lineCap = 'round'
        c.beginPath()
        for (let i = 0; i <= 40; i++) { const q = at((h.travel * i) / 40); if (i === 0) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y) }
        c.stroke()
        c.strokeStyle = darker(paper.main, 0.1)
        c.lineWidth = 3
        c.stroke()
      } else { x = s.mid.x - s.rx * 0.6 + s.rx * 1.2 * h.travel; y = s.mid.y - 20 + Math.sin(h.travel * 6) * 12 }
    }
    c.globalAlpha = h.opacity * 0.96
    this.stamps.stampAt(c, T.ghostHand, x, y + 2, -0.16, 1.5 - h.press * 0.2)
    c.globalAlpha = 1
  }
}
