import type { Guidance, HandPose } from './guidance'
import { handPose } from './guidance'
import type { Tier } from './config'
import { demoFor } from './demos'
import { Folk } from './folk'
import { CANS, CORD, CURTAIN, DRAWINGS, MIDDLE, MOLE, MOLE_FACE, ON_OSTRICH, OSTRICH, OSTRICH_HEAD, REACH, SACKS, WIPER, placeAt, placeOn, shelfOf, sizeOf, stringAt, type Who } from './layout'
import { BODY_LINE, Magnets, OUTLINE } from './magnets'
import { Album, INK, canvas, mark, trace, type Ctx, type Picture } from './marker'
import { BODIES, PARTS, PLACES, count, type Body, type Monster, type Part, type Place, type Stuck } from './monster'
import { BEAT_S, LEAN_S, MIME_PEEK, MIME_S, RUN_S, TAKE_S, type Play } from './play'
import { Room, TRAY_TOP, paintBoard, paintFrame, paintTray } from './room'
import { fit, type Fit, type Point } from './stage'

// Draws the board as it stands. Every figure and magnet is a picture stamped
// from the album; the ostrich's neck, the string, the cord and the child's
// own marker lines are drawn live. All motion is read from `play.since`, so
// nothing here has a state that a put-away could lose.

const clamp = (t: number, a = 0, b = 1): number => Math.max(a, Math.min(b, t))
const ease = (t: number): number => { const c = clamp(t); return c * c * (3 - 2 * c) }
const mix = (a: number, b: number, t: number): number => a + (b - a) * t
const bump = (t: number): number => (t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI))
/** A ring that dies away: 0 once `t` passes `length`. */
const ring = (t: number, length: number, rate: number): number => (t < 0 || t > length ? 0 : Math.sin(t * rate) * (1 - t / length) ** 2)

type Motion = { dx: number; dy: number; turn: number; sx: number; sy: number }
const still: Motion = { dx: 0, dy: 0, turn: 0, sx: 1, sy: 1 }

export class BoardView {
  fit: Fit = { scale: 0, x: 0, y: 0 }
  /** Draws of the last frame: pictures stamped, and live strokes and fills. */
  readonly tally = { stamps: 0, pen: 0 }
  private readonly ctx: Ctx
  private ratio = 1
  private album = new Album(1)
  private magnets = new Magnets(this.album)
  private room = new Room(this.album)
  private folk = new Folk(this.album)
  private page: HTMLCanvasElement | null = null
  private tray: Picture | null = null
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  private glow = 0
  private now = 0

  constructor(surface: HTMLCanvasElement) {
    this.ctx = surface.getContext('2d')!
  }

  resize(width: number, height: number, ratio: number): void {
    this.fit = fit(width, height)
    this.ratio = ratio
    const k = this.fit.scale * ratio
    this.album = new Album(Math.max(0.4, k))
    this.magnets = new Magnets(this.album)
    this.room = new Room(this.album)
    this.folk = new Folk(this.album)
    const x0 = -this.fit.x / this.fit.scale, y0 = -this.fit.y / this.fit.scale, x1 = x0 + width / this.fit.scale, y1 = y0 + height / this.fit.scale
    this.page = canvas(Math.round(width * ratio), Math.round(height * ratio))
    const ctx = this.page.getContext('2d')!
    this.place(ctx)
    paintBoard(ctx, x0, y0, x1, y1)
    paintFrame(ctx, x0, y0, x1, y1)
    const image = canvas((x1 - x0) * k, (y1 - TRAY_TOP) * k), t = image.getContext('2d')!
    t.setTransform(k, 0, 0, k, -x0 * k, -TRAY_TOP * k)
    paintTray(t, x0, x1, y1)
    this.tray = { image, x: x0, y: TRAY_TOP, w: x1 - x0, h: y1 - TRAY_TOP }
  }

  /** Paints every piece there is, so none is painted in the middle of play. */
  warm(): void {
    for (const part of PARTS) { this.magnets.part(part); this.magnets.outline(part) }
    this.magnets.eyeball(); this.magnets.pupil()
    for (const body of BODIES) this.magnets.body(body)
    const { room, folk } = this
    for (let n = 0; n <= 6; n++) if (n === 0 || n > 2) room.sack(n)
    room.rail(); room.lump(); room.curtain(); room.roll(); room.toe(); room.knob(); room.wiper(); room.can(); room.ghost()
    folk.ostrichBody(); folk.ostrichWing(); folk.ostrichHead(); folk.pupil(); folk.ostrichLids(); folk.moleBody(); folk.moleLids(); folk.moleHand()
  }

  private place(ctx: Ctx): void {
    const k = this.ratio * this.fit.scale
    ctx.setTransform(k, 0, 0, k, this.ratio * this.fit.x, this.ratio * this.fit.y)
  }
  private stamp(p: Picture): void {
    this.tally.stamps++
    this.ctx.drawImage(p.image, p.x, p.y, p.w, p.h)
  }
  private at(p: Picture, x: number, y: number, turn = 0, sx = 1, sy = sx): void {
    const { ctx } = this
    ctx.save()
    ctx.translate(x, y)
    if (turn) ctx.rotate(turn)
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy)
    this.stamp(p)
    ctx.restore()
  }
  private stroke(): void { this.tally.pen++; this.ctx.stroke() }

  draw(play: Play | null, guidance: Guidance | null, tier: Tier): void {
    const { ctx } = this
    this.tally.stamps = this.tally.pen = 0
    if (!this.page || this.fit.scale === 0) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    this.tally.stamps++
    ctx.drawImage(this.page, 0, 0)
    this.place(ctx)
    if (!play) { this.stamp(this.tray!); return }
    this.now = play.now
    this.glow = guidance?.glow ?? 0
    this.drawings(play)
    this.strokes(play, tier)
    this.string(play)
    this.mole(play)
    this.monsters(play)
    this.party(play)
    this.stamp(this.tray!)
    this.mimed(play)
    this.cord(play)
    this.sacks(play)
    this.shelf(play)
    this.moleHands(play)
    for (const f of play.flights) {
      if (f.t < 0) { this.magnet(f.part, f.large, f.from.x, f.from.y, still, 0); continue }
      const t = clamp(f.t / f.dur), e = f.kind === 'slide' ? t * t : ease(t)
      const lift = f.kind === 'home' ? bump(t) * 70 : f.kind === 'patter' ? bump(t) * 40 : 0
      const size = mix(sizeOf(f.large), f.land ? sizeOf(f.large) : 92, e) / 100
      this.scaled(f.part, size, f.from.x + (f.to.x - f.from.x) * e + (f.kind === 'slide' ? Math.sin(f.t * 60) * 1.5 : 0), f.from.y + (f.to.y - f.from.y) * e - lift, f.kind === 'slide' ? Math.sin(f.t * 9) * 0.12 : (1 - t) * Math.sin(f.t * 12) * 0.5, 0)
    }
    if (play.sackCarry) this.at(this.room.sack(play.sackCarry.i === 0 ? 0 : this.lumps(play)), play.sackCarry.at.x, play.sackCarry.at.y, Math.sin(this.now * 13) * 0.07, 1.06)
    for (const c of play.carries) {
      const spot = play.wouldCatch(c.at)
      const pull = spot ? 0.04 * Math.sin(this.now * 18) : 0
      this.scaled(c.part, (sizeOf(c.large) / 100) * (1.12 + pull), c.at.x, c.at.y, clamp(-c.swing, -0.5, 0.5) + Math.sin(this.now * 5) * 0.03, 0)
    }
    this.ghost(play, guidance)
  }

  // --- The board --------------------------------------------------------------

  private drawings(play: Play): void {
    const n = play.world.pairs.length
    for (let i = 0; i < n; i++) {
      const t = play.since(`drawing:${i}`), fresh = i === n - 1 ? clamp(play.since('met') / 1.2) : 1
      const pair = play.world.pairs[i]
      this.ctx.globalAlpha = fresh
      this.at(this.pair(pair), DRAWINGS[i].x, DRAWINGS[i].y, ring(t, 0.7, 26) * 0.14, 1 + ring(t, 0.5, 18) * 0.1)
      this.ctx.globalAlpha = 1
    }
    const wiped = play.since('wiped')
    if (wiped < 0.9) this.at(this.room.wiper(), DRAWINGS[0].x - 70 + wiped * 150, DRAWINGS[0].y + Math.sin(wiped * 20) * 8, -0.2, 0.7)
  }

  /** Two who met, drawn small. Painted when they meet, and while they are still hidden by their own size. */
  private pair(pair: readonly [Monster, Monster]): Picture {
    const key = 'pair:' + pair.map((m) => m.body + PLACES.map((p) => (m.on[p] ? `${m.on[p]!.part}${m.on[p]!.large ? 'l' : 's'}` : '-')).join('')).join('|')
    return this.album.get(key, [-74, -40, 148, 80], (ctx) => {
      const k = 0.155
      pair.forEach((m, i) => {
        ctx.save()
        ctx.translate(i ? 36 : -36, 0)
        const shrink = (line: readonly Point[], s: number, dx = 0, dy = 0) => line.map((p) => ({ x: p.x * s + dx, y: p.y * s + dy }))
        mark(ctx, shrink(BODY_LINE[m.body], k), 'black', 2.6, 0.75)
        for (const place of PLACES) {
          const s = m.on[place]
          if (!s) continue
          const o = placeOn(m.body, place), size = k * (s.large ? 1 : 0.62)
          mark(ctx, shrink(OUTLINE[s.part], size, o.x * k, o.y * k), Magnets.pen(s.part), 2.3, 0.85)
        }
        ctx.restore()
      })
    }, 1.2)
  }

  private strokes(play: Play, tier: Tier): void {
    const { ctx } = this
    const all = play.strokes
    for (let i = Math.max(0, all.length - tier.strokes); i < all.length; i++) {
      const s = all[i]
      if (s.points.length < 1) continue
      const gone = clamp((s.age - 4.5) / 1.5)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = s.age < 6 ? mix(0.9, 0.12, gone) : 0.12 * (1 - clamp((s.age - 6) / 3))
      ctx.strokeStyle = gone > 0.8 ? '#6c7887' : INK[(['blue', 'green', 'red', 'black'] as const)[Math.round(s.points[0].x) % 4]]
      ctx.lineWidth = mix(6, 13, gone)
      trace(ctx, s.points.length === 1 ? [s.points[0], { x: s.points[0].x + 1, y: s.points[0].y }] : s.points)
      this.stroke()
      ctx.globalAlpha = 1
    }
  }

  private string(play: Play): void {
    const { ctx } = this
    const twang = play.since('string'), pulse = play.since('pulse')
    ctx.beginPath()
    const [a, b] = this.cans(play)
    for (let i = 0; i <= 36; i++) {
      const t = i / 36, p = stringAt(t)
      const pulled = { x: p.x + mix(a.x - CANS[0].x, b.x - CANS[1].x, t), y: p.y + mix(a.y - CANS[0].y, b.y - CANS[1].y, t) }
      const at = clamp(pulse / 0.7), hump = pulse < 0.7 ? Math.exp(-(((t - at) * 12) ** 2)) * 34 : 0
      const y = pulled.y + ring(twang, 1.1, 44) * Math.sin(t * Math.PI) * 14 - hump + Math.sin(this.now * 1.1 + t * 5) * 1.5
      if (i) ctx.lineTo(pulled.x, y); else ctx.moveTo(pulled.x, y)
    }
    ctx.lineWidth = 4.6
    ctx.lineJoin = 'round'
    ctx.strokeStyle = INK.green
    ctx.globalAlpha = 0.9
    this.stroke()
    ctx.globalAlpha = 1
  }

  /** Where the two cans are: the ostrich's hangs at her wing, the mole's is at its ear or on the ground. */
  private cans(play: Play): [Point, Point] {
    const sunk = this.sunk(play) * 130
    const dropped = play.meeting && play.meeting.t > RUN_S + LEAN_S + play.meeting.list.length * BEAT_S + 0.5
    const listen = play.since('mole') < 1 ? Math.sin(play.since('mole') * 10) * 5 : 0
    return [{ x: CANS[0].x, y: CANS[0].y + sunk * 1.7 }, dropped ? { x: CANS[1].x - 14, y: 640 } : { x: CANS[1].x - 2, y: CANS[1].y + listen }]
  }

  // --- The ostrich --------------------------------------------------------------------

  /** She ducks behind the ledge while the two look at each other. */
  private sunk(play: Play): number {
    const m = play.meeting
    if (!m) return 0
    const back = RUN_S + LEAN_S + m.list.length * BEAT_S + (m.same ? 0.1 : TAKE_S - 0.45)
    return Math.min(ease(m.t / 0.45), 1 - ease((m.t - back) / 0.35))
  }

  private head(play: Play): { x: number; y: number; turn: number; peek: number } {
    const w = play.world, m = play.mime
    let x = OSTRICH_HEAD.x + Math.sin(this.now * 0.8) * 5 - (w.open ? -8 : 4), y = OSTRICH_HEAD.y + Math.sin(this.now * 1.3) * 4 - this.glow * (w.open ? 0 : Math.sin(this.now * 5) * 5)
    let turn = Math.sin(this.now * 0.9) * 0.04, peek = 0
    if (m) {
      peek = Math.min(ease(m.t / 0.3), 1 - ease((m.t - (MIME_PEEK - 0.16)) / 0.3))
      // Round-eyed and quivering when she comes back, then she bows to what she shows.
      const tell = clamp((m.t - MIME_PEEK - 0.4) / 0.25) * (1 - clamp((m.t - MIME_S + 0.4) / 0.3))
      turn += tell * 0.12 * Math.sin(m.t * 9)
      if (m.fact.kind === 'part') y += tell * (m.fact.large ? -26 : 48)
      else y += tell * (m.fact.body === 'tall' ? -70 : m.fact.body === 'wide' ? 130 : 20)
    }
    const look = play.peeked ? ease(play.lift) : 0
    x = mix(x, 520, look * 0.5); y = mix(y, 160, look * 0.5); turn += look * (-0.15 + Math.sin(this.now * 24) * 0.02)
    x = mix(x, 452, peek); y = mix(y, 250, peek); turn = mix(turn, 0.1, peek)
    if (play.ostrichBend) { const dx = play.ostrichBend.x - x, dy = play.ostrichBend.y - y, d = Math.hypot(dx, dy) || 1, r = Math.min(d, 130); x += (dx / d) * r; y += (dy / d) * r; turn += clamp(dx / 600, -0.3, 0.3) }
    const kick = play.since('kick'), cluck = play.since('ostrich'), worn = play.since('wear:ostrich')
    if (play.meeting?.same && play.since('party') < 2.4) { y += Math.sin(play.since('party') * 10.5) * 26; x += Math.sin(play.since('party') * 5.2) * 12; turn += Math.sin(play.since('party') * 5.2) * 0.3 }
    y -= bump(kick / 0.5) * 24; turn += ring(kick, 0.6, 18) * 0.2
    y += bump(cluck / 0.3) * 12 + bump(worn / 0.35) * 22
    turn += ring(cluck, 0.5, 20) * 0.12 + ring(worn, 0.9, 16) * 0.2
    return { x, y: y + this.sunk(play) * 520, turn, peek }
  }

  /** Her head goes in round the curtain's edge, so it is drawn behind the cloth then, and before it at all other times. */
  private ostrich(play: Play, layer: 'behind' | 'front'): void {
    const w = play.world, m = play.mime
    const sunk = this.sunk(play)
    if (sunk > 0.97) return
    const h = this.head(play), kick = play.since('kick')
    const inside = h.peek > 0.3 && !w.open
    if (layer === 'behind' && !inside) return
    const shape = m && m.fact.kind === 'body' ? bump(clamp((m.t - MIME_PEEK - 0.4) / 1.7)) : 0
    const body = m && m.fact.kind === 'body' ? m.fact.body : null
    const sx = 1 + shape * (body === 'round' ? 0.28 : body === 'wide' ? 0.5 : -0.3) + ring(play.since('ostrich'), 0.5, 22) * 0.05
    const sy = 1 + shape * (body === 'round' ? 0.2 : body === 'wide' ? -0.28 : 0.3) - ring(play.since('ostrich'), 0.5, 22) * 0.05 + Math.sin(this.now * 1.9) * 0.012
    const by = OSTRICH.y + sunk * 220 - bump(kick / 0.45) * 22
    const shiver = play.peeked ? Math.sin(this.now * 46) * 1.6 * play.lift : 0
    const neckFrom = { x: OSTRICH.x - 16, y: by - 62 * sy }
    if (inside ? layer === 'behind' : layer === 'front') this.neck(play, h, neckFrom)
    if (layer === 'behind') return
    this.at(this.folk.ostrichBody(), OSTRICH.x + shiver, by, ring(kick, 0.5, 16) * 0.16, sx, sy)
    // The wing with her can, or pointing at the place she shows.
    const tell = m && m.fact.kind === 'part' ? clamp((m.t - MIME_PEEK - 0.15) / 0.25) * (1 - clamp((m.t - MIME_S + 0.35) / 0.3)) : 0
    const sh = { x: OSTRICH.x + 12, y: by - 22 }
    const to = m && m.fact.kind === 'part' ? ON_OSTRICH[m.fact.place] : { x: 0, y: 0 }
    const aim = Math.atan2(to.y - sh.y, to.x - sh.x)
    const rest = -0.85 + Math.sin(this.now * 1.7) * 0.05 + (kick < 0.5 ? Math.sin(kick * 30) * 0.4 : 0) + (play.since('wear:ostrich') < 1.4 && w.worn.ostrich === 'nose' ? -0.7 + Math.sin(play.since('wear:ostrich') * 9) * 0.2 : 0)
    let turn = aim - rest
    while (turn > Math.PI) turn -= Math.PI * 2
    while (turn < -Math.PI) turn += Math.PI * 2
    this.at(this.room.can(), this.cans(play)[0].x, this.cans(play)[0].y, 0.4 + Math.sin(this.now) * 0.04)
    this.at(this.folk.ostrichWing(), sh.x, sh.y, rest + turn * tell, 1, Math.cos(rest + turn * tell) < 0 ? -1 : 1)
  }

  private neck(play: Play, h: { x: number; y: number; turn: number; peek: number }, neckFrom: Point): void {
    const { ctx } = this, w = play.world, m = play.mime
    const neckTo = { x: h.x + Math.sin(h.turn) * -22 + 4, y: h.y + 26 }
    const bow = { x: mix(548, 600, h.peek) + Math.sin(this.now * 1.2) * 4, y: (neckFrom.y + neckTo.y) / 2 }
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(neckFrom.x, neckFrom.y)
    ctx.bezierCurveTo(bow.x - 8, mix(neckFrom.y, neckTo.y, 0.3), bow.x + h.peek * 20, mix(neckFrom.y, neckTo.y, 0.75) - h.peek * 110, neckTo.x + h.peek * 34, neckTo.y)
    ctx.strokeStyle = INK.black; ctx.lineWidth = 29; this.stroke()
    ctx.strokeStyle = '#f7f9fa'; ctx.lineWidth = 20; this.stroke()
    ctx.setLineDash([3, 13])
    ctx.strokeStyle = 'rgba(34,38,45,.42)'; ctx.lineWidth = 13; this.stroke()
    ctx.setLineDash([])
    // Head, eyes, and what she wears.
    ctx.save()
    ctx.translate(h.x, h.y)
    ctx.rotate(h.turn)
    this.stamp(this.folk.ostrichHead())
    const wide = m && m.t > MIME_PEEK - 0.2 ? 1.25 : 1
    const blink = (this.now % 3.7) < 0.13 && !m
    if (blink) this.stamp(this.folk.ostrichLids())
    else {
      const worn = w.worn.ostrich
      const g = worn === 'mouth' ? { x: 0, y: -1 } : this.gaze(play, h.x, h.y, h.peek)
      const c = Math.cos(-h.turn), s = Math.sin(-h.turn), gx = g.x * c - g.y * s, gy = g.x * s + g.y * c
      const cross = worn === 'mouth' ? 5 : 0
      this.at(this.folk.pupil(), -16 + gx * 7 + cross, -14 + gy * 9, 0, wide)
      this.at(this.folk.pupil(), 16 + gx * 7 - cross, -14 + gy * 9, 0, wide)
    }
    if (w.worn.ostrich) this.magnet(w.worn.ostrich, true, 2, -66, this.act(w.worn.ostrich, Math.min(play.since('worn:ostrich'), play.since('wear:ostrich'))), Math.min(play.since('worn:ostrich'), play.since('wear:ostrich')), 0.86)
    ctx.restore()
  }

  private gaze(play: Play, x: number, y: number, peek: number): Point {
    if (peek > 0.4) return { x: -0.9, y: 0.4 }
    const c = play.carries[0]
    const to = c ? c.at : play.meeting ? MIDDLE.a : play.mime ? { x: 700, y: 700 } : play.world.open ? (Math.sin(this.now * 0.6) > 0 ? MIDDLE.a : MIDDLE.b) : (Math.sin(this.now * 0.5) > 0.5 ? MIDDLE.b : { x: CURTAIN.x1 - 60, y: 330 })
    const dx = to.x - x, dy = to.y - y, d = Math.hypot(dx, dy) || 1
    return { x: dx / d, y: dy / d }
  }

  /** The part she shows, as a marker outline at its place on herself, over everything. */
  private mimed(play: Play): void {
    const m = play.mime
    if (!m || m.fact.kind !== 'part') return
    const t = m.t - MIME_PEEK - 0.1
    if (t < 0) return
    const { ctx } = this, fact = m.fact, o = ON_OSTRICH[fact.place]
    const on = ease(t / 0.3), off = clamp((m.t - MIME_S + 0.35) / 0.3)
    const act = this.act(fact.part, play.since('mimeAct'))
    const k = (sizeOf(fact.large) / 100) * 1.06 * (0.5 + on * 0.5)
    ctx.globalAlpha = on * (1 - off)
    this.at(this.magnets.outline(fact.part), o.x + act.dx + off * 24, o.y + act.dy, act.turn, k * act.sx, k * act.sy)
    ctx.globalAlpha = 1
  }

  // --- The mole --------------------------------------------------------------------------

  private moleY(play: Play): number {
    return MOLE.y + Math.sin(this.now * 1.5) * 2.5 - bump(play.since('mole') / 0.35) * 10 - bump(play.since('wear:mole') / 0.4) * 16 - (play.meeting && play.since('taken') < TAKE_S ? Math.abs(Math.sin(this.now * (play.meeting.same ? 5 : 13))) * (play.meeting.same ? 20 : 9) : 0)
  }
  private mole(play: Play): void {
    const { ctx } = this, w = play.world, y = this.moleY(play)
    const squash = ring(play.since('mole'), 0.5, 22) * 0.05
    const nod = play.since('nod') < 0.8 ? Math.sin(play.since('nod') * 14) * 0.05 : 0
    ctx.save()
    ctx.translate(MOLE.x, y + 130)
    ctx.rotate(nod + Math.sin(this.now * 0.7) * 0.012)
    ctx.scale(1 + squash, 1 - squash)
    ctx.translate(0, -130)
    this.stamp(this.folk.moleBody())
    const worn = w.worn.mole, cant = worn === 'eye'
    if (cant || (this.now + 1.4) % 4.3 < 0.14) this.stamp(this.folk.moleLids())
    else {
      const c = play.carries[0], to = c ? c.at : play.meeting ? MIDDLE.b : Math.sin(this.now * 0.45) > 0 ? { x: 700, y: 720 } : MIDDLE.b
      const dx = to.x - MOLE.x, dy = to.y - y + 88, d = Math.hypot(dx, dy) || 1
      for (const x of [-26, 26]) this.at(this.folk.pupil(), x + (dx / d) * 5, -88 + (dy / d) * 5, 0, 0.8)
    }
    if (worn) {
      const t = Math.min(play.since('worn:mole'), play.since('wear:mole'))
      this.magnet(worn, true, MOLE_FACE.x - MOLE.x, MOLE_FACE.y - MOLE.y, this.act(worn, t), t, 0.8)
    }
    ctx.restore()
    this.at(this.room.can(), this.cans(play)[1].x, this.cans(play)[1].y, play.meeting ? 1.2 : -0.5)
  }

  /** Its hands come last, since they go over its face, over the ledge and out to the shelf. */
  private moleHands(play: Play): void {
    const y = this.moleY(play), hand = this.folk.moleHand()
    const meeting = play.meeting
    const cover = Math.max(ease(play.lift * 1.3), meeting && meeting.t < RUN_S + LEAN_S ? 1 - ease((meeting.t - RUN_S) / 0.4) : 0)
    const apart = meeting && meeting.t > RUN_S * 0.8 ? ease((meeting.t - RUN_S * 0.8) / 0.3) * 18 : 0
    const listen = this.cans(play)[1]
    const pat = play.patting(), reach = play.since('reach')
    const reaching = reach < 1.6 ? bump(reach / 1.6) : 0
    let lx = MOLE.x - 86, ly = y + 82, lt = -0.5, rx = MOLE.x + 82, ry = y + 96, rt = 0.4
    if (play.since('mole') < 1.2 && !meeting) { lx = listen.x - 4; ly = listen.y + 18; lt = 0.3 }
    // The free hand is always half out towards the shelf.
    lx += Math.sin(this.now * 0.9) * 6 - this.glow * 6; ly += Math.sin(this.now * 1.8) * 3
    lx -= reaching * 70; ly += reaching * 34
    if (pat) { const beat = Math.abs(Math.sin(this.now * 9)); rx = mix(rx, pat.x + 6, 0.9); ry = mix(ry, pat.y + 26 - beat * 10, 0.9); rt = -0.2 }
    if (play.moleReach) { const p = play.moleReach; for (const s of [0, 1]) { const ox = s ? rx : lx, oy = s ? ry : ly, dx = p.x - ox, dy = p.y - oy, d = Math.hypot(dx, dy) || 1, r = Math.min(d, 110), tap = Math.sin(this.now * 12 + s * 3) * 6; if (s) { rx += (dx / d) * r; ry += (dy / d) * r + tap } else { lx += (dx / d) * r; ly += (dy / d) * r + tap } } }
    if (play.since('wear:mole') < 1.2 && play.world.worn.mole === 'hand') { rx = MOLE.x + 34; ry = y - 30 + Math.sin(this.now * 20) * 14; rt = -0.4 }
    const taken = meeting && !meeting.same && play.since('taken') < TAKE_S
    if (play.meeting?.same && play.since('party') < 2.4) { const p = play.since('party'); lx = MOLE.x - 92; rx = MOLE.x + 92; ly = y - 60 + Math.sin(p * 10.5) * 30; ry = y - 60 - Math.sin(p * 10.5) * 30; lt = -0.3; rt = 0.3 }
    // It holds its belly and shakes.
    if (taken) { lx = MOLE.x - 40; rx = MOLE.x + 40; ly = ry = y + 70 + Math.sin(this.now * 26) * 5; lt = 0.8; rt = -0.8 }
    lx = mix(lx, MOLE.x - 28 - apart, cover); ly = mix(ly, y - 74, cover); lt = mix(lt, 0.15 - apart * 0.02, cover)
    rx = mix(rx, MOLE.x + 28 + apart, cover); ry = mix(ry, y - 74, cover); rt = mix(rt, -0.15 + apart * 0.02, cover)
    const sway = play.lift > 0.5 ? Math.sin(this.now * 3) * 2 : 0
    this.at(hand, lx + sway, ly, lt)
    this.at(hand, rx + sway, ry, rt, -1, 1)
  }

  // --- The magnets ------------------------------------------------------------------------------

  /** What a part does, for ever, when it is touched: `t` is the seconds since. */
  private act(part: Part, t: number): Motion {
    if (t < 0 || t > 0.75) return still
    const m: Motion = { dx: 0, dy: 0, turn: 0, sx: 1, sy: 1 }
    const down = bump(t / 0.14) * 0.16, u = 1 - clamp(t / 0.75)
    switch (part) {
      case 'eye': m.sx = 1 + bump(t / 0.7) * 0.08; m.sy = m.sx; break
      case 'mouth': { const c = Math.abs(Math.sin(t * 13)); m.sy = 1 - c * 0.42 * u; m.sx = 1 + c * 0.14 * u; break }
      case 'nose': if (t < 0.4) { m.sx = 1 + t * 0.5; m.sy = 1 + t * 0.4; m.turn = -t * 0.5 } else { const k = (t - 0.4) / 0.35; m.sx = 1 - bump(k) * 0.2; m.sy = 1 + bump(k) * 0.34; m.dy = bump(k) * 10; m.turn = ring(t - 0.4, 0.35, 40) * 0.3 } break
      case 'ear': m.turn = Math.sin(t * 26) * 0.42 * u; m.sx = 1 - Math.abs(Math.sin(t * 13)) * 0.3 * u; break
      case 'hand': m.sx = 1 - Math.abs(Math.sin(t * 19)) * 0.5 * u; m.turn = ring(t, 0.7, 19) * 0.1; break
      case 'foot': { const k = Math.abs(Math.sin(t * 12.5)); m.dy = -k * 20 * u; m.sy = 1 - (k < 0.3 ? 0.16 : 0) * u; m.turn = -k * 0.2 * u; break }
      case 'tail': m.turn = Math.sin(t * 15) * 0.5 * u; break
    }
    m.sx *= 1 + down; m.sy *= 1 - down
    return m
  }

  private magnet(part: Part, large: boolean, x: number, y: number, m: Motion, t: number, k = 1): void {
    const size = (sizeOf(large) / 100) * k
    this.drawPart(part, x + m.dx * size, y + m.dy * size, m.turn, size * m.sx, size * m.sy, t)
  }
  private scaled(part: Part, size: number, x: number, y: number, turn: number, t: number): void {
    this.drawPart(part, x, y, turn, size, size, t)
  }
  private drawPart(part: Part, x: number, y: number, turn: number, sx: number, sy: number, t: number): void {
    if (part === 'eye' && t > 0.02 && t < 0.75) {
      this.at(this.magnets.eyeball(), x, y, turn, sx, sy)
      const a = t / 0.7 * Math.PI * 2 - 0.8, r = 17 * bump(clamp(t / 0.75, 0.001, 0.999)) ** 0.4
      this.at(this.magnets.pupil(), x + Math.cos(a) * r * sx, y + Math.sin(a) * r * sy, turn, sx, sy)
    } else this.at(this.magnets.part(part), x, y, turn, sx, sy)
  }

  private shelf(play: Play): void {
    for (const part of PARTS) {
      const p = shelfOf(part), t = play.since(`shelf:${part}`), i = PARTS.indexOf(part)
      const rattle = play.since(`rattle:${part}`), land = play.since(`shelfLand:${part}`)
      let { x, y } = p, k = 0.92
      const m = { ...this.act(part, t) }
      if (play.ready === part) { y -= 40 + Math.sin(this.now * 5) * 7; k = 1.14; m.turn += Math.sin(this.now * 3.2) * 0.07 }
      y -= this.glow * Math.max(0, Math.sin(this.now * 4 - i * 0.7)) * 12
      y -= bump(rattle / 0.5) * 14; m.turn += ring(rattle, 0.7, 34) * 0.14
      if (land < 0.3) { m.sx *= 1 + bump(land / 0.3) * 0.16; m.sy *= 1 - bump(land / 0.3) * 0.16 }
      // One of a kind never runs out: the shelf shows the next while one is in a hand.
      this.magnet(part, true, x, y, m, t, k)
    }
    const wipe = play.since('wiper')
    if (!play.wiping) this.at(this.room.wiper(), WIPER.x - bump(wipe / 0.8) * 34, WIPER.y, ring(wipe, 0.8, 18) * 0.06)
    else this.at(this.room.wiper(), play.wiping.x, play.wiping.y, Math.sin(this.now * 14) * 0.06)
  }

  // --- The monsters ---------------------------------------------------------------------------------

  private monsters(play: Play): void {
    const { ctx } = this, w = play.world, hiding = play.hiding, meeting = play.meeting
    // A finger on the curtain, a pulled cord or a running curtain shows what is behind it.
    const shut = play.aside <= 0.001 && play.lift <= 0.02
    // A new one that is to be seen jumps out of its sack in front of the open curtain.
    const behind = hiding && (hiding.seen ? hiding.t < 0.5 : play.aside > 0.02) ? hiding.a : w.a
    const fresh = hiding?.seen ? clamp((hiding.t - 0.85) / 0.35) : 1
    if (!shut && (fresh > 0 || hiding!.t < 0.5)) {
      const k = hiding?.seen && hiding.t >= 0.5 ? fresh + bump(fresh) * 0.18 : hiding?.seen ? 1 - clamp(hiding.t / 0.5) : 1
      ctx.save()
      ctx.translate(MIDDLE.a.x, MIDDLE.a.y); ctx.scale(k, k); ctx.translate(-MIDDLE.a.x, -MIDDLE.a.y)
      this.monster(play, 'a', meeting ? meeting.a : behind)
      ctx.restore()
    }
    this.ostrich(play, 'behind')
    this.curtain(play)
    this.ostrich(play, 'front')
    this.monster(play, 'b', meeting ? meeting.b : w.b)
    if (meeting) this.compared(play)
    if (hiding && hiding.kind === 'sack') {
      const t = clamp(hiding.t / 0.95)
      const lumps = hiding.sack === 0 ? 0 : count(w.a)
      if (t < 1) {
        const e = ease(t), to = MIDDLE.a
        this.at(this.room.sack(lumps), mix(hiding.from.x, to.x, e), mix(hiding.from.y, to.y + 120, e) - bump(t) * 150, Math.sin(t * 14) * 0.2, 1.05 - t * 0.15)
      } else {
        const out = clamp((hiding.t - 1.05) / 0.75)
        if (out > 0 && out < 1) this.at(this.room.sack(0), mix(MIDDLE.a.x, -90, out), 200 - bump(out) * 130, out * 5, 0.7, 0.5)
      }
    }
    ctx.globalAlpha = 1
  }

  /** How a body stands now: leaning, wobbling, taking a difference in its own way. */
  private stance(play: Play, who: Who, body: Body): Motion {
    const m = { dx: 0, dy: 0, turn: 0, sx: 1, sy: 1 }
    const jelly = play.since(`wobble:${who}`), press = play.since(`press:${who}`), shape = play.since(`shape:${who}`)
    const j = ring(jelly, 0.7, 24) * 0.055 + ring(press, 0.5, 26) * 0.05 + ring(shape, 0.9, 19) * 0.15
    m.sx = 1 + j; m.sy = 1 - j
    m.turn = ring(jelly, 0.8, 15) * 0.025
    const quiet = who === 'a' && play.lift > 0.02
    for (const c of play.contacts.values()) if (c.moved && !c.extra && c.target.kind === 'body' && c.target.who === who) { m.turn += clamp((c.at.x - MIDDLE[who].x) / 900, -0.16, 0.16); m.sx += clamp(Math.abs(c.at.x - MIDDLE[who].x) / 2600, 0, 0.1); m.sy += clamp((MIDDLE[who].y - c.at.y) / 2200, -0.1, 0.1) }
    if (!quiet && !play.meeting) { m.sy *= 1 + Math.sin(this.now * 2 + (who === 'a' ? 1 : 0)) * 0.008; m.sx *= 1 - Math.sin(this.now * 2 + (who === 'a' ? 1 : 0)) * 0.006 }
    const hop = play.since('hopBoth')
    if (hop < 1) m.dy -= Math.abs(Math.sin(hop * Math.PI * 3)) * 22 * (1 - hop)
    const meet = play.meeting
    if (!meet) return m
    const way = who === 'a' ? 1 : -1
    const lean = ease((meet.t - RUN_S) / LEAN_S)
    const room = this.between(meet.a, meet.b)
    m.dx += way * room * 0.7 * lean; m.turn += way * 0.03 * lean
    const t0 = RUN_S + LEAN_S
    const beat = meet.list[Math.floor((meet.t - t0) / BEAT_S)]
    if (meet.t > t0 && beat && beat.likeness !== 'same') {
      const b = bump(((meet.t - t0) % BEAT_S) / BEAT_S)
      m.dx += way * room * 0.3 * b
      m.turn += way * b * (beat.place === 'bottom' ? -0.05 : 0.035)
      // Both start up at what they see.
      m.dy -= bump(((meet.t - t0) % BEAT_S) / 0.3) * 20
    }
    const t = meet.t - t0 - meet.list.length * BEAT_S
    if (t > 0) {
      const u = clamp(t / TAKE_S), fade = 1 - ease((u - 0.86) / 0.14)
      m.dx *= fade; m.turn *= fade
      if (meet.same) {
        // Apart first, so that the ostrich has room to dance between them.
        m.dx *= 1 - ease(t / 0.4)
        m.dy -= Math.abs(Math.sin(t * Math.PI / 0.6)) * 46 * fade
        m.turn += Math.sin(t * Math.PI / 0.6) * 0.1 * fade
      } else switch (body) {
        case 'round': {
          const near = bump(u)
          m.dx += way * room * near; m.turn += way * 0.04 * near + Math.sin(t * 4) * 0.02 * near
          m.sx += Math.sin(t * 8) * 0.04 * fade; m.sy += Math.sin(t * 8 + 1) * 0.05 * fade
          break
        }
        case 'tall': {
          // Up with a gasp, then over like a plank, and up again.
          const gasp = bump(t / 0.5)
          m.sy += gasp * 0.14; m.sx -= gasp * 0.08
          const over = t < 0.5 ? 0 : t < 0.85 ? ((t - 0.5) / 0.35) ** 2 : t < 1.7 ? 1 - ring(t - 0.85, 0.5, 20) * 0.06 : 1 - ease((t - 1.7) / 0.6)
          m.turn += -way * over * 0.55
          break
        }
        case 'wide':
          m.dy += Math.abs(Math.sin(t * 12)) * -9 * fade
          m.sx += Math.sin(t * 24) * 0.07 * fade; m.sy -= Math.sin(t * 24) * 0.07 * fade
          m.turn += Math.sin(t * 6) * 0.08 * fade
          m.dy += bump(u) * 46
          break
      }
    }
    return m
  }

  /** How far each of the two may come towards the other and still not touch. */
  private between(a: Monster, b: Monster): number {
    let right = MIDDLE.a.x + REACH[a.body].w, left = MIDDLE.b.x - REACH[b.body].w
    for (const place of PLACES) {
      const p = a.on[place], q = b.on[place]
      if (p) right = Math.max(right, placeAt('a', a.body, place).x + sizeOf(p.large) / 2)
      if (q) left = Math.min(left, placeAt('b', b.body, place).x - sizeOf(q.large) / 2)
    }
    return clamp((left - right) / 2 - 16, 0, 46)
  }

  private monster(play: Play, who: Who, m: Monster): void {
    const { ctx } = this, s = this.stance(play, who, m.body), c = MIDDLE[who], foot = REACH[m.body].h
    ctx.save()
    // It stands on its foot: everything turns and squashes about that, and a tipped one goes away from the other.
    ctx.translate(c.x + s.dx, c.y + s.dy + foot)
    ctx.rotate(s.turn)
    ctx.scale(s.sx, s.sy)
    ctx.translate(0, -foot)
    this.stamp(this.magnets.body(m.body))
    const lent = this.lent(play, who, m)
    // In view, the twin shows as pen lines where the parts of the other go.
    if (who === 'b' && play.inView && !play.hiding) for (const one of play.missing()) {
      // A part of any kind covers its line, so that a wrong face looks meant.
      if (m.on[one.place]) continue
      const o = placeOn(m.body, one.place), need = play.since(`need:${one.place}`), k = sizeOf(one.large) / 100
      ctx.globalAlpha = 0.5 + bump(need / 0.9) * 0.4
      this.at(this.magnets.outline(one.part), o.x, o.y, ring(need, 0.9, 20) * 0.1, k * (1 + bump(need / 0.6) * 0.14))
      ctx.globalAlpha = 1
    }
    this.openPlaces(play, who, m)
    const beat = this.beat(play)
    for (const place of PLACES) {
      const one = m.on[place]
      if (!one || (lent && lent.from === place)) continue
      if (play.flights.some((f) => f.land && f.land.who === who && f.land.place === place && f.t < f.dur)) continue
      const o = placeOn(m.body, place), t = play.since(`${who}:${place}`)
      const a = { ...this.act(one.part, t) }
      const ringing = ring(play.since(`ring:${who}:${place}`), 0.5, 44)
      a.turn += ringing * 0.1
      const size = play.since(`size:${who}:${place}`)
      const pop = (size < 0.4 ? 1 + ring(size, 0.4, 24) * 0.3 : 1) * (beat && beat.place === place && beat.likeness !== 'same' ? 1 + bump(beat.u) * 0.45 : 1)
      this.magnet(one.part, one.large, o.x, o.y, a, t, pop)
    }
    if (who === 'a' && play.lift > 0.02) {
      // Shy while it is looked at.
      ctx.globalAlpha = play.lift * 0.3
      ctx.fillStyle = '#ff7ea6'
      const r = REACH[m.body]
      ctx.beginPath(); ctx.ellipse(-r.w * 0.62, r.h * 0.3, 24, 13, 0, 0, 7); ctx.ellipse(r.w * 0.62, r.h * 0.3, 24, 13, 0, 0, 7)
      this.tally.pen++; ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  /** The part that flies over to a round one who tries it on. */
  private lent(play: Play, who: Who, m: Monster): { from: Place; stuck: Stuck; to: Place; t: number } | null {
    const meet = play.meeting
    if (!meet || meet.same) return null
    const other = who === 'a' ? meet.b : meet.a
    if (other.body !== 'round') return null
    const t = meet.t - RUN_S - LEAN_S - meet.list.length * BEAT_S - 0.3
    if (t < 0 || t > 1.7) return null
    const one = meet.list.find((c) => c.likeness !== 'same' && m.on[c.place])
    if (!one) return null
    // Two round ones take turns at it by not both lending the same place: the first lends, the second is lent to.
    if (m.body === 'round' && who === 'b') return null
    return { from: one.place, stuck: m.on[one.place]!, to: 'top', t: t / 1.7 }
  }

  private compared(play: Play): void {
    const meet = play.meeting!
    for (const who of ['a', 'b'] as const) {
      const l = this.lent(play, who, who === 'a' ? meet.a : meet.b)
      if (!l) continue
      const mine = who === 'a' ? meet.a : meet.b, other = who === 'a' ? 'b' : 'a'
      const p = placeAt(who, mine.body, l.from), q = { x: MIDDLE[other].x, y: MIDDLE[other].y - 178 }
      const e = Math.min(ease(l.t / 0.28), 1 - ease((l.t - 0.72) / 0.28))
      this.scaled(l.stuck.part, sizeOf(l.stuck.large) / 100, mix(p.x, q.x, e), mix(p.y, q.y, e) - bump(e) * 60, Math.sin(l.t * 24) * 0.14, 0)
    }
  }

  /** The place that is being compared now, and how far that has come. */
  private beat(play: Play): { place: Place; likeness: string; u: number } | null {
    const meet = play.meeting
    const t = meet ? meet.t - RUN_S - LEAN_S : -1
    if (!meet || t < 0) return null
    const one = meet.list[Math.floor(t / BEAT_S)]
    return one ? { place: one.place, likeness: one.likeness, u: (t % BEAT_S) / BEAT_S } : null
  }

  /** With a magnet in a hand or ready, the free places show as dotted rounds. */
  private openPlaces(play: Play, who: Who, m: Monster): void {
    if (who !== 'b' || play.inView || play.meeting || play.hiding || (play.carries.length === 0 && play.ready === null)) return
    const { ctx } = this, free = PLACES.filter((place) => !m.on[place])
    if (free.length === 0) return
    ctx.beginPath()
    for (const place of free) { const o = placeOn(m.body, place); ctx.moveTo(o.x + 42, o.y); ctx.arc(o.x, o.y, 42, 0, Math.PI * 2) }
    ctx.setLineDash([3, 14])
    ctx.lineDashOffset = -this.now * 22
    ctx.lineCap = 'round'
    ctx.lineWidth = 6
    ctx.strokeStyle = '#d9c8ff'
    this.stroke()
    ctx.setLineDash([])
  }

  /** Marker scraps thrown up when two are alike. */
  private party(play: Play): void {
    const t = play.since('party'), { ctx } = this
    if (t > 2.6 || !play.meeting) return
    const inks = ['red', 'blue', 'green', 'black'] as const
    inks.forEach((ink, k) => {
      ctx.beginPath()
      for (let i = k; i < 44; i += 4) {
        const s = Math.sin(i * 12.9898) * 43758.5453, r = s - Math.floor(s)
        const x = 553 + (r - 0.5) * 940 * Math.min(1, t * 1.6) + Math.sin(t * 5 + i) * 10, q = Math.sin(i * 78.233) * 24634.6345, r2 = q - Math.floor(q), y = 440 - (120 + r2 * 330) * (1 - (1 - Math.min(1, t * 1.4)) ** 2) + Math.max(0, t - 0.5) ** 2 * 190, a = t * (4 + r * 5) + i
        if (y > 640) continue
        ctx.moveTo(x - Math.cos(a) * 10, y - Math.sin(a) * 10)
        ctx.quadraticCurveTo(x + Math.sin(a) * 8, y, x + Math.cos(a) * 10, y + Math.sin(a) * 10)
      }
      ctx.strokeStyle = INK[ink]
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.globalAlpha = 1 - clamp((t - 2.1) / 0.5)
      this.stroke()
    })
    ctx.globalAlpha = 1
  }

  // --- The curtain, the cord, the sacks -------------------------------------------------------------------

  private curtain(play: Play): void {
    const { ctx } = this, pic = this.room.curtain()
    const { x0, y0 } = CURTAIN
    const aside = ease(play.aside), lift = ease(play.lift)
    const drop = play.since('drop'), roll = play.since('roll'), flap = play.since('flap'), shiver = play.since('shiver')
    const sway = Math.sin(this.now * 1.4) * 0.006 + ring(drop, 0.9, 13) * 0.03 + ring(flap, 0.6, 30) * 0.05 + ring(shiver, 0.6, 30) * 0.02 + ring(roll, 0.4, 24) * 0.01 + this.glow * Math.sin(this.now * 4) * 0.012 + (play.enough && !play.busy ? Math.sin(this.now * 3.4) * 0.016 : 0)
    const bulge = !play.world.open && aside < 0.02 ? Math.max(0, Math.sin(this.now * 0.62)) * 0.02 + (play.hiding ? Math.abs(Math.sin(this.now * 16)) * 0.04 : 0) : 0
    const w = 1 - aside * 0.86
    const shown = 1 - lift * 0.97
    if (!play.world.open && aside < 0.02 && lift < 0.5) this.at(this.room.toe(), 404 + Math.sin(this.now * 2.1) * 3, 614 + lift * -30, Math.sin(this.now * 5) * 0.06 * Math.max(0, Math.sin(this.now * 0.7)))
    ctx.save()
    ctx.translate(x0, y0)
    ctx.transform(w + bulge, 0, sway, 1 + ring(drop, 0.5, 20) * 0.015, 0, 0)
    ctx.translate(-x0, -y0)
    const sh = pic.h * shown
    this.tally.stamps++
    ctx.drawImage(pic.image, 0, 0, pic.image.width, Math.max(1, Math.round(pic.image.height * shown)), pic.x, pic.y, pic.w, sh)
    if (lift > 0.02) this.at(this.room.roll(), x0, pic.y + sh + 6, ring(roll, 0.4, 26) * 0.01, 1, Math.min(1, 0.35 + lift))
    ctx.restore()
    this.stamp(this.room.rail())
    if (!play.world.open && lift < 0.2 && play.mime) {
      const h = this.head(play)
      if (h.peek > 0.5) this.at(this.room.lump(), h.x - 6 + Math.sin(this.now * 17) * 4, h.y, Math.sin(this.now * 11) * 0.08, 0.5 + h.peek * 0.5)
    }
  }

  private cord(play: Play): void {
    const { ctx } = this
    const t = play.since('cord'), y = CORD.y + play.pull + ring(t, 0.6, 24) * 7 * (play.pull > 0 ? 0.2 : 1) + (play.enough && !play.busy ? Math.abs(Math.sin(this.now * 3.4)) * 20 : 0) - this.glow * Math.sin(this.now * 5) * 5
    const x = CORD.x + Math.sin(this.now * 1.2) * 4 + ring(t, 0.8, 18) * 5
    ctx.beginPath()
    ctx.moveTo(CORD.x, CORD.top)
    ctx.quadraticCurveTo(CORD.x + 3, (CORD.top + y) / 2, x, y - 22)
    ctx.strokeStyle = INK.red
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    this.stroke()
    this.at(this.room.knob(), x, y, Math.sin(this.now * 1.2) * 0.05 + ring(t, 0.8, 18) * 0.1)
  }

  private lumps(play: Play): number {
    return play.world.sacks ? count(play.world.sacks[1]) : 0
  }
  private sacks(play: Play): void {
    const s = play.world.sacks
    if (!s) return
    const m = play.meeting
    const t = m ? m.t - (RUN_S + LEAN_S + m.list.length * BEAT_S + TAKE_S - 0.7) : 9
    if (t < 0) return
    for (const i of [0, 1] as const) {
      if (play.sackCarry?.i === i) continue
      const p = SACKS[i], u = clamp((t - i * 0.12) / 0.55), hop = play.since(`sack:${i}`)
      const x = mix(-110, p.x, ease(u)), y = p.y - Math.abs(Math.sin(u * Math.PI * 2)) * 34 * (1 - u) - bump(hop / 0.4) * 26 - bump(((this.now * 0.55 + i * 0.5) % 1) / 0.28) * (play.busy ? 0 : 24)
      this.at(this.room.sack(i === 0 ? 0 : count(s[1])), x, y, Math.sin(this.now * (2.2 + i * 0.5)) * 0.045 + ring(hop, 0.6, 26) * 0.12, 1 + Math.sin(this.now * 3 + i * 2) * 0.012, 1 - Math.sin(this.now * 3 + i * 2) * 0.016)
    }
  }

  // --- The ghost hand -----------------------------------------------------------------------------------------

  private ghost(play: Play, guidance: Guidance | null): void {
    if (!guidance || guidance.demo === null) return
    const move = demoFor(play, guidance.demoIndex), { ctx } = this
    const pose = handPose(guidance.demo, move.drag, this.pose)
    const held = move.hold ? Math.min(clamp((guidance.demo - 0.2) / 0.1), 1 - clamp((guidance.demo - 0.8) / 0.1)) : pose.press
    const x = mix(move.from.x, move.to.x, pose.travel), y = mix(move.from.y, move.to.y, pose.travel)
    ctx.globalAlpha = pose.opacity * 0.85
    if (move.part && pose.travel > 0 && pose.travel < 1) this.at(this.magnets.part(move.part), x, y - 8, Math.sin(this.now * 6) * 0.06)
    ctx.globalAlpha = pose.opacity
    this.at(this.room.ghost(), x, y + (1 - held) * 18, 0, 1.12 - held * 0.14)
    ctx.globalAlpha = 1
  }
}
