import { CAST, girthOf, lengthOf, type Who } from './cast'
import type { Tier } from './config'
import { HEADS, MAGPIE_PARTS as MAG, body, drawHead, feet, midAt, shell, type Face } from './folk'
import { Album, LIGHTS, Pen, canvas, oval, path, type Picture } from './foil'
import { handPose, type Guidance, type HandPose } from './guidance'
import type { Point } from './input'
import { DOOR, MAGPIE, MICE, NECK, STRIP, TABLE_Y, TRAY, WINDOW, trayPoint } from './layout'
import { cover, piece, ring } from './pieces'
import type { Play, Scene } from './play'
import { doorFrame, hand, paintRoom, windowFrame } from './room'
import { KINDS, LENGTH, STRIP_LENGTH, endOf, fitOf, hopTo, scootTo, type Kind, type Piece } from './row'
import { fit, type Fit } from './stage'

// Draws the shop as the play has it. Nothing here feeds back into the rules.

const clamp = (x: number): number => Math.max(0, Math.min(1, x))
const ease = (x: number): number => { const k = clamp(x); return k * k * (3 - 2 * k) }
const span = (t: number, a: number, b: number): number => clamp((t - a) / (b - a))
/** A knock that rings out. */
const ring01 = (age: number, rate = 22, fade = 7): number => (age < 0 ? 0 : Math.sin(age * rate) * Math.exp(-age * fade))
const lightAt = (x: number): number => ((Math.floor(x / 24) % LIGHTS) + LIGHTS) % LIGHTS

/** Where a ring sits for a piece, round whoever lies there. */
export function ringSeat(on: readonly Who[], p: Piece): { x: number; y: number; sy: number } {
  const mid = p.x + LENGTH[p.k] / 2, total = lengthOf(on)
  const g = mid < total ? Math.max(girthOf(on, mid), 20) : 0
  if (g === 0) return { x: mid, y: TABLE_Y - 16, sy: 0.36 }
  return { x: mid, y: TABLE_Y - 8 - g, sy: (g * 2 + 24) / 108 }
}

export class ShopView {
  fit: Fit = { scale: 0, x: 0, y: 0 }
  private readonly ctx: CanvasRenderingContext2D
  private pen: Pen
  private album = new Album(1)
  private backdrop: HTMLCanvasElement | null = null
  private w = 0
  private h = 0
  private dpr = 1
  private jumpers = new Map<string, Picture>()
  private pose: HandPose = { travel: 0, press: 0, opacity: 0 }

  constructor(readonly surface: HTMLCanvasElement) {
    this.ctx = surface.getContext('2d')!
    this.pen = new Pen(this.ctx)
  }
  get tally(): number { return this.pen.tally }

  resize(w: number, h: number, dpr: number): void {
    this.w = w; this.h = h; this.dpr = dpr
    this.fit = fit(w, h)
    this.pen = new Pen(this.ctx)
    const density = Math.min(2, Math.max(1, this.fit.scale * dpr))
    if (density !== this.album.density) this.album = new Album(density)
    this.jumpers.clear()
    this.backdrop = null
  }

  /** Everything is baked before it is first needed. */
  warm(play: Play): void {
    this.room()
    const a = this.album
    for (const k of KINDS) for (let l = 0; l < LIGHTS; l++) { piece(a, k, l); ring(a, k, l) }
    for (const who of new Set([...play.save.on, ...play.save.wait])) for (const cold of [true, false]) body(a, who, cold, 0)
  }

  private room(): HTMLCanvasElement {
    if (this.backdrop) return this.backdrop
    const b = canvas(this.w * this.dpr, this.h * this.dpr), c = b.getContext('2d')!, { scale, x, y } = this.fit
    c.setTransform(this.dpr * scale, 0, 0, this.dpr * scale, this.dpr * x, this.dpr * y)
    paintRoom(c, { x: -x / scale, y: -y / scale, w: this.w / scale, h: this.h / scale })
    this.backdrop = b
    return b
  }

  draw(play: Play | null, guidance: Guidance | null, tier: Tier): void {
    const { ctx, pen } = this
    if (this.fit.scale === 0) return
    pen.tally = 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.drawImage(this.room(), 0, 0)
    if (!play) return
    const { scale, x, y } = this.fit
    ctx.setTransform(this.dpr * scale, 0, 0, this.dpr * scale, this.dpr * x, this.dpr * y)
    const s = play.scene, t = play.now
    this.outside(play, tier)
    this.door(play)
    this.mice(play)
    // Whoever lies on the table: in "next, please" the one who leaves, then the one who comes.
    if (s?.is === 'next') {
      const age = t - s.at
      if (age < 2.5) {
        const go = ease(span(age, 0.5, 2.5)), hop = -Math.abs(Math.sin(age * 10)) * 12 * Number(age > 0.5)
        this.party(play, s.who, s.worn, -go * 1500, hop, true)
      } else if (age > 2.7) {
        const come = ease(span(age, 2.7, 4.2))
        this.party(play, play.save.on, null, (1 - come) * 1300, -Math.abs(Math.sin(age * 10)) * 10 * Number(come < 1), false)
      }
    } else this.party(play, play.save.on, play.save.row.length ? play.save.row : null, 0, 0, false)
    this.pieces(play)
    this.covers(play)
    this.magpie(play)
    this.flights(play)
    this.held(play)
    for (const spark of play.sparks) {
      const a = (t - spark.t) / 0.6
      pen.line(path((p) => { for (let i = 0; i < 6; i++) { const q = i * 1.047 + 0.3, r = 12 + a * 30; p.moveTo(spark.at.x + Math.cos(q) * r, spark.at.y + Math.sin(q) * r); p.lineTo(spark.at.x + Math.cos(q) * (r + 10 * (1 - a)), spark.at.y + Math.sin(q) * (r + 10 * (1 - a))) } }), '#fff', 3.4, 1 - a)
    }
    if (play.gusting) this.gust(t - play.gustAt)
    if (guidance && !s) this.guide(play, guidance)
  }

  // --- The wall ----------------------------------------------------------------

  private outside(play: Play, tier: Tier): void {
    const { pen } = this, t = play.now, W = WINDOW
    const s = play.scene?.is === 'next' ? play.scene : null
    const age = s ? t - s.at : 99
    const out = play.save.out
    if (out && age > 2.2) {
      // The one dressed last stands out there in that jumper, or is just walking up.
      const pic = this.mini(out.who, out.worn), k = ease(span(age, 2.2, 4))
      const x = W.x + 20 + (1 - k) * 240, y = W.y + 150 - Math.abs(Math.sin(age * 9)) * 7 * Number(k < 1)
      const full = Math.min(0.42, 250 / (lengthOf(out.who) + 230))
      this.ctx.save()
      this.ctx.beginPath()
      this.ctx.rect(W.x, W.y, W.w, W.h)
      this.ctx.clip()
      pen.at(x + 222 * full, y - (TABLE_Y - 60) * full, () => pen.stamp(pic), 0, full)
      this.ctx.restore()
    }
    pen.fill(path((p) => {
      const blow = play.gusting ? 180 : 22
      for (let i = 0; i < tier.snow; i++) {
        const fx = W.x + 10 + ((((i * 71.3 - t * (blow + (i % 5) * 6)) % (W.w - 20)) + (W.w - 20)) % (W.w - 20)), fy = W.y + 8 + ((i * 47.7 + t * (24 + (i % 4) * 9)) % (W.h - 16)), r = 2.2 + (i % 3)
        p.moveTo(fx, fy - r); p.lineTo(fx + r, fy); p.lineTo(fx, fy + r); p.lineTo(fx - r, fy)
      }
    }), '#fff', 0.9)
    const a = play.acting('window', 0.5)
    pen.at(W.x, W.y, () => { this.ctx.translate(-W.x, -W.y); pen.stamp(windowFrame(this.album)) }, a ? ring01(a.age) * 0.012 : 0)
  }

  /** Somebody dressed, baked small-side-on: the whole figure in one picture. */
  private mini(who: readonly Who[], worn: readonly Piece[]): Picture {
    const key = `mini-${who.join()}-${JSON.stringify(worn)}`
    let pic = this.jumpers.get(key)
    if (pic) return pic
    for (const k of this.jumpers.keys()) if (k.startsWith('mini-')) this.jumpers.delete(k)
    const image = canvas(1200 * 0.5, 320 * 0.5), c = image.getContext('2d')!, pen = new Pen(c)
    c.scale(0.5, 0.5)
    c.translate(240, -150)
    this.bodies(pen, who, 0, worn, 0)
    const j = this.jumper(who, worn)
    pen.stamp(j)
    who.forEach((w, n) => this.headAt(pen, who, w, n, { gaze: [-0.5, 0.2], lid: 0, mouth: 'smile', open: 0, cold: false, pink: true }, 0))
    pic = { image, x: -240, y: 150, w: 1200, h: 320 }
    this.jumpers.set(key, pic)
    return pic
  }

  private door(play: Play): void {
    const { pen, album } = this, t = play.now, s = play.scene
    const age = s?.is === 'next' ? t - s.at : 99
    let who: readonly Who[] = play.save.wait, up = ease(span(t - play.cameAt, 0.1, 0.8))
    if (s?.is === 'next') {
      if (age < 2.6) { who = play.save.on; up = 1 - ease(span(age, 1.8, 2.6)) } else up = ease(span(age, 4.4, 5.2))
    }
    const gone = play.hand?.what === 'guest'
    if (!gone && up > 0) {
      // Whoever has sunk down is behind the half door, never below it.
      this.ctx.save()
      this.ctx.beginPath()
      this.ctx.rect(DOOR.x, DOOR.y - 20, DOOR.w, 440)
      this.ctx.clip()
      who.forEach((w, n) => this.waiting(play, w, n, who.length, up))
      this.ctx.restore()
    }
    pen.at(0, 0, () => pen.stamp(doorFrame(album)))
    // What it loves, held up over the half door and turned to the child.
    if (!gone && up > 0.3) {
      const a = play.acting('wait', 1)
      const k = CAST[who[0]].loves, wave = a ? Math.sin(a.age * 16) * 0.3 * (1 - a.age) : play.ready ? Math.sin(t * 9) * 0.22 : Math.sin(t * 1.7) * 0.05
      pen.at(DOOR.x + DOOR.w - 78, 236 + (1 - up) * 160, () => pen.stamp(piece(album, k, a ? lightAt(a.age * 200) : 0)), wave - 0.1, 0.86)
    }
  }

  private waiting(play: Play, who: Who, n: number, of: number, up: number): void {
    const { pen, album } = this, t = play.now, a = play.acting('wait', 1.1)
    const shiver = Math.sin(t * 46 + n) * (Math.sin(t * 1.9 + n * 2) > 0.3 ? 2 : 0.4)
    const eager = play.ready && !play.scene ? -Math.abs(Math.sin(t * 5 + n)) * 20 : 0
    const hop = eager + (a ? -Math.abs(Math.sin(a.age * 9)) * 18 * (1 - a.age / 1.1) : 0)
    const size = of > 1 ? 0.62 : 0.82
    const x = DOOR.x + (of > 1 ? 128 + n * 116 : 206) + shiver, y = 214 + (1 - up) * 220 + hop
    pen.at(x, y, () => {
      drawHead(pen, album, who, { cold: true, gaze: this.gaze(play, { x, y }), lid: this.blink(t, 7 + n), open: a ? Math.abs(Math.sin(a.age * 10)) : 0, mouth: a && a.kind !== 'press' ? 'open' : 'chatter' }, a ? lightAt(a.age * 180) : 0)
    }, 0, size)
  }

  private blink(t: number, n: number): number { const k = (t * 0.31 + n * 0.37) % 1; return k > 0.965 ? 1 : 0 }
  /** With nothing moving, a customer looks at what it would like: the piece it loves, then its own bare end, then the door. */
  private want(play: Play, from: Point, f: ReturnType<typeof fitOf> | null): [number, number] {
    if (play.hand || play.sparks.length || play.scene || Math.sin(play.now * 0.8) > 0.4) return this.gaze(play, from)
    const to = !f ? trayPoint(KINDS.find((k) => k === CAST[play.save.on[0]].loves && play.save.open[k]) ?? 'sausage') : f.short ? { x: NECK + f.end + 60, y: TABLE_Y } : f.holes.length ? { x: NECK + f.holes[0].from, y: 360 } : { x: DOOR.x + 120, y: 180 }
    const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1
    return [dx / d, dy / d]
  }
  /** Eyes follow what moves: the hand, the finger, or the ones outside. */
  private gaze(play: Play, from: Point): [number, number] {
    const h = play.hand, last = play.sparks[play.sparks.length - 1]
    const to = h ? h.at : last ? last.at : play.scene ? { x: 600, y: 520 } : { x: from.x - 300 + Math.sin(play.now * 0.4) * 300, y: from.y + 120 }
    const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1
    return [dx / d, dy / d]
  }

  // --- Whoever lies on the table ------------------------------------------------

  private bodies(pen: Pen, on: readonly Who[], shift: number, worn: readonly Piece[] | null, t: number, shiver = false): void {
    let from = 0
    for (const who of on) {
      const L = CAST[who].length
      const warm = body(this.album, who, false, 0), cold = body(this.album, who, true, 0)
      const x0 = from + shift
      const here = from
      pen.at(x0, 0, () => {
        pen.stamp(warm)
        // Bare skin is blue, and shakes.
        for (const b of bare(worn, here, L)) pen.slice(cold, this.album.density, b.from === 0 ? -40 : b.from, b.to - (b.from === 0 ? -40 : b.from) + (b.to >= L ? 88 : 0), shiver ? Math.sin(t * 52 + b.from) * 2.2 : 0, shiver ? Math.cos(t * 47) * 1.2 : 0)
      })
      from += L
    }
  }

  /** The worn rings in one picture. */
  private jumper(on: readonly Who[], worn: readonly Piece[]): Picture {
    const key = `${on.join()}-${JSON.stringify(worn)}`
    let pic = this.jumpers.get(key)
    if (pic) return pic
    for (const k of this.jumpers.keys()) if (!k.startsWith('mini-')) this.jumpers.delete(k)
    const D = this.album.density, image = canvas(960 * D, 220 * D), c = image.getContext('2d')!, pen = new Pen(c)
    c.scale(D, D)
    c.translate(20, -255)
    for (const p of worn) this.ringOn(pen, on, p, 0)
    // Two on one spot: a double ring that stands out.
    for (const b of fitOf(worn, lengthOf(on)).bulges) {
      const top = [...worn].reverse().find((p) => p.x < b.to && endOf(p) > b.from)!
      const g = Math.max(20, girthOf(on, (b.from + b.to) / 2)), w = b.to - b.from
      pen.at((b.from + b.to) / 2, TABLE_Y - 14 - g, () => pen.stamp(ring(this.album, top.k, 1)), 0, (w + 18) / LENGTH[top.k], Math.min(1.75, (g * 2 + 74) / 108))
    }
    pic = { image, x: -20, y: 255, w: 960, h: 220 }
    this.jumpers.set(key, pic)
    return pic
  }
  private ringOn(pen: Pen, on: readonly Who[], p: Piece, light: number, swell = 0): void {
    const q = ringSeat(on, p)
    pen.at(q.x, q.y, () => pen.stamp(ring(this.album, p.k, light)), 0, 1 + swell * 0.3, q.sy * (1 + swell))
  }

  private party(play: Play, on: readonly Who[], worn: readonly Piece[] | null, dx: number, dy: number, leaving: boolean): void {
    const { pen, album, ctx } = this, t = play.now
    const shown = worn
    const join = on.length > 1 && !leaving ? 1 - ease(span(t - play.joinedAt, 0, 0.6)) : 0
    const f = shown ? fitOf(shown, lengthOf(on)) : null
    const breath = Math.sin(t * 1.5) * 0.006
    const wr = play.acts.get('wriggle'), wrAge = wr ? t - wr.at : 9
    ctx.save()
    ctx.translate(NECK + dx, dy + (wrAge < 0.5 ? ring01(wrAge, 30, 6) * 7 : 0))
    ctx.translate(0, TABLE_Y); ctx.scale(1, 1 + breath); ctx.translate(0, -TABLE_Y)
    const shaking = (!f || f.short || f.holes.length > 0) && (Math.sin(t * 1.9) > 0.2 || play.gusting || Boolean(play.acting(`on${on.length - 1}`, 1.6)?.kind === 'cold'))
    if (join > 0) {
      this.bodies(pen, on.slice(0, 1), 0, shown, t, shaking)
      this.bodies(pen, on.slice(1), CAST[on[0]].length + join * 1000, null, t, true)
    } else this.bodies(pen, on, 0, leaving || !shown ? shown : shown.filter((p) => t - play.look(p).born > 0.4).map((p) => ({ k: p.k, x: play.look(p).x })), t, shaking)
    if (shown) {
      const gust = play.gusting ? Math.sin(t * 24) * 0.02 : 0
      const r = play.acts.get('ring'), rAge = r ? t - r.at : 9
      ctx.save()
      ctx.translate(0, TABLE_Y); ctx.scale(1, 1 + gust); ctx.translate(0, -TABLE_Y)
      this.wear(play, on, shown, leaving)
      if (rAge < 0.5 && r && shown[Number(r.kind)]) this.ringOn(pen, on, shown[Number(r.kind)], lightAt(rAge * 240), Math.max(0, ring01(rAge, 14, 5)) * 0.28)
      ctx.restore()
    }
    let from = 0
    on.forEach((w) => {
      const p = feet(album, w, !shown)
      if (p) pen.at(from + (from ? join * 1000 : 0), 0, () => pen.stamp(p))
      from += CAST[w].length
    })
    from = 0
    for (const w of on) { if (w === 'snail') pen.at(from, 0, () => pen.stamp(shell(album))); from += CAST[w].length }
    if (f && !leaving) this.draughts(f.holes, f.short ? lengthOf(on) : null, f.end, t)
    // The jumper that has just come off crumples upward.
    const offAge = t - play.offAt
    if (!shown && offAge < 0.7 && play.offRow.length) {
      ctx.save()
      ctx.globalAlpha = 1 - offAge / 0.7
      ctx.translate(0, -offAge * 260)
      pen.stamp(this.jumper(on, play.offRow))
      ctx.restore()
      ctx.globalAlpha = 1
    }
    for (let n = 0; n < on.length; n++) this.customerHead(play, on, n, f, n ? join : 0, leaving)
    ctx.restore()
  }

  private headAt(pen: Pen, on: readonly Who[], who: Who, n: number, face: Face, light: number, dx = 0, dy = 0, turn = 0): void {
    const from = n ? CAST[on[0]].length : 0
    pen.at(from + dx + (n ? 14 : 0), midAt(who, 0) + dy - (n ? 62 : 0), () => drawHead(pen, this.album, who, face, light), turn, n ? 0.86 : 1)
  }

  private customerHead(play: Play, on: readonly Who[], n: number, f: ReturnType<typeof fitOf> | null, join: number, leaving: boolean): void {
    const { pen, album } = this, t = play.now, who = on[n]
    const a = leaving ? null : play.acting(`on${n}`, 1.8)
    const cold = !f || f.short || f.holes.length > 0
    const from = n ? CAST[on[0]].length : 0
    const here = { x: NECK + from - 80, y: midAt(who, 0) - 60 }
    const face: Face = { gaze: this.want(play, here, f), lid: this.blink(t, n + 1), mouth: cold ? 'chatter' : 'smile', open: 0, cold: !f, pink: !!f?.close }
    let dx = 0, dy = Math.sin(t * 1.5 + n) * 2, turn = 0
    if (cold && Math.sin(t * 1.9) > 0.2) { dx += Math.sin(t * 50) * 1.6; face.open = 0.12 + 0.12 * Math.abs(Math.sin(t * 30)) }
    if (f?.bulges.length) face.lid = Math.max(face.lid, 0.25)
    let carry: { k: Kind; x: number; y: number; turn: number; size: number } | null = null
    const [mx, my] = HEADS[who].mouth
    if (a) {
      const g = a.age, give = (k: Kind, x: number, y: number, tn = 0, size = 0.8): void => { carry = { k, x, y, turn: tn, size } }
      const w = Math.sin(g * 18)
      switch (a.kind) {
        case 'touch': dy += ring01(g) * 6; break
        case 'tickle':
          if (who === 'croc') { face.open = Math.abs(Math.sin(g * 12)) * 0.9; turn = w * 0.04 }
          if (who === 'dog') { dx += w * 6; face.mouth = 'open'; face.open = 0.8; face.tongue = 1 }
          if (who === 'snail') { dx += Math.sin(clamp(g / 1) * Math.PI) * 74; face.lid = g < 0.8 ? 1 : 0 }
          if (who === 'seal') { dy -= Math.abs(Math.sin(g * 11)) * 16; face.mouth = 'open'; face.open = Math.abs(w) }
          if (who === 'python') { face.tongue = 0.6 + Math.sin(g * 24) * 0.4; turn = w * 0.12; face.cross = g < 1 }
          break
        case 'lick': give('sausage', -150 + Math.sin(g * 9) * 40, 26, 0.1); face.open = 0.5 + 0.4 * w; face.lid = 0.6; break
        case 'gulp': if (g < 0.35) give('sausage', mx - 40 + g * 130, my, 0, 0.7); else if (g > 1.1) give('sausage', mx - 60, my, 0.4, 0.6 + (g - 1.1)); face.wide = g > 1; face.mouth = 'open'; face.open = g < 0.4 || g > 1.1 ? 1 : 0.2; dx += g > 0.4 && g < 1.1 ? w * 3 : 0; break
        case 'gasp': give('sausage', mx - 46, my + 20, Math.sin(g * 4) * 0.2); face.wide = true; face.mouth = 'open'; face.open = 1; dx += span(g, 0, 0.15) * 22; break
        case 'poke': give('sausage', mx - 80, my + 14 + w * 2); dx -= Math.abs(Math.sin(g * 6)) * 14; face.mouth = 'open'; face.open = 0.3; break
        case 'spit': give('sausage', mx - 24 - span(g, 0.2, 0.7) * 120, my + 6 - Math.sin(span(g, 0.2, 0.7) * 3.1) * 40, g * 5, 0.75); face.mouth = 'open'; face.open = g > 0.15 ? 0.7 : 0.1; turn = -0.08; face.lid = 0.5; break
        case 'chew': give('shoe', mx - 34 + w * 6, my + 6, w * 0.12); turn = w * 0.1; face.lid = 0.3; face.mouth = 'open'; face.open = 0.4; break
        case 'kiss': give('shoe', mx - 46 + Math.sin(clamp(g * 2) * 3.1) * 24, my + 4, 0.1); face.lid = g < 0.9 ? 1 : 0; face.mouth = 'open'; face.open = 0.25; face.pink = true; break
        case 'sneeze': give('shoe', -190 - span(g, 0.5, 0.8) * 130, -42 - span(g, 0.5, 0.8) * 60, span(g, 0.5, 0.8) * 4, 0.75); turn = g < 0.5 ? g * 0.3 : -0.12 * (1 - span(g, 0.5, 1)); face.lid = g > 0.35 && g < 0.9 ? 1 : 0.3; face.open = g > 0.5 ? 1 - span(g, 0.5, 1.2) : 0.3; break
        case 'shut': give('shoe', mx - 60, my + 14); dx += 92 * (span(g, 0.05, 0.2) - span(g, 1, 1.6)); face.lid = 1; break
        case 'search': give('shoe', mx - 40, my + 20, 0.2); turn = -0.25 * Math.sin(clamp(g / 1.5) * Math.PI); face.gaze = [1, 0.8]; face.tongue = 0.5 + w * 0.4; break
        case 'hat': give('duck', -82, -176 - Math.abs(Math.sin(g * 7)) * 8, w * 0.1); face.gaze = [0, -1]; face.mouth = 'smile'; face.pink = true; break
        case 'stiff': give('duck', mx - 10, my - 60, w * 0.05); face.wide = true; face.cross = true; dy -= 6; dx += Math.sin(g * 60) * 1.5; break
        case 'bark': give('duck', mx - 56, my + 8, -w * 0.15); dx -= Math.abs(Math.sin(g * 6)) * 18; face.mouth = 'open'; face.open = Math.abs(Math.sin(g * 6)); break
        case 'balance': give('duck', -110 + Math.sin(g * 5) * 8, -96, Math.sin(g * 5) * 0.3); turn = -Math.sin(g * 5) * 0.06 + 0.1; face.gaze = [0, -1]; face.mouth = 'smile'; break
        case 'cross': give('duck', mx - 16 + w * 4, my - 34, w * 0.1); face.cross = true; turn = Math.sin(g * 4) * 0.06; face.tongue = 0.4; break
        case 'rub': turn = w * 0.06; dx -= 8; face.lid = 0.7; face.mouth = 'smile'; break
        case 'smell': turn = 0.12 * Math.sin(clamp(g / 1.5) * Math.PI); face.lid = 1; face.mouth = 'smile'; face.pink = true; dy += 8; break
        case 'groan': turn = -0.2 * Math.sin(clamp(g / 1.5) * Math.PI); face.gaze = [-1, -0.5]; face.mouth = 'wave'; break
        case 'hum': turn = Math.sin(g * 7) * 0.06; face.lid = 0.5; face.mouth = 'smile'; break
        case 'warm': dy -= Math.sin(clamp(g / 1.2) * Math.PI) * 14; face.lid = g < 1.3 ? 1 : 0; face.mouth = 'smile'; face.pink = true; break
        case 'cold': face.gaze = [1, 0.5]; face.wide = true; dx += Math.sin(g * 60) * 3; break
        default: break
      }
    }
    const gave = a && ['press', 'touch'].includes(a.kind) === false
    this.headAt(pen, on, who, n, face, gave ? lightAt(a!.age * 130) : 0, dx + join * 1000, dy, turn)
    if (carry) {
      const q = carry as { k: Kind; x: number; y: number; turn: number; size: number }
      pen.at(from + q.x + (n ? 14 : 0), midAt(who, 0) + q.y - (n ? 62 : 0), () => pen.stamp(piece(album, q.k, lightAt(a!.age * 130))), q.turn, q.size)
    }
  }

  /** Wind through a hole, and a drip that freezes at a bare tail. */
  private draughts(holes: readonly { from: number; to: number }[], tail: number | null, end: number, t: number): void {
    const { pen } = this
    if (holes.length) pen.line(path((p) => {
      for (const h of holes) for (let i = 0; i < 2; i++) {
        const m = (h.from + h.to) / 2 - 12 + i * 24, k = (t * 0.9 + i * 0.5) % 1, y = 330 - k * 60
        p.moveTo(m, y + 24); p.quadraticCurveTo(m + 20, y + 12, m, y); p.quadraticCurveTo(m - 18, y - 12, m + 2, y - 22)
      }
    }), '#ffffff', 6, 0.9)
    if (tail !== null) {
      const x = (Math.max(0, end) + tail) / 2
      pen.fill(path((p) => { for (let i = -1; i <= 1; i++) { const q = x + i * Math.min(34, (tail - end) / 3.4), h = 16 + (i + 1) * 5; p.moveTo(q - 6, TABLE_Y - 8); p.lineTo(q + 6, TABLE_Y - 8); p.lineTo(q, TABLE_Y - 8 + h); p.closePath() } }), '#e6f5ff', 0.95)
      pen.line(path((p) => { for (let i = 0; i < 3; i++) { const q = x - 26 + i * 26, y = TABLE_Y - 96 + Math.sin(t * 20 + i) * 3; p.moveTo(q - 8, y); p.lineTo(q, y - 8); p.lineTo(q + 8, y); p.lineTo(q + 16, y - 8) } }), '#cfe6ff', 4)
    }
  }

  /** The rings as they lie. One that has just been laid leaps up from its piece, and all of them go where their pieces go. */
  private wear(play: Play, on: readonly Who[], worn: readonly Piece[], leaving: boolean): void {
    const { pen } = this, t = play.now
    const live = !leaving && worn.some((p) => { const l = play.look(p); return Math.abs(l.x - p.x) > 0.5 || t - l.born < 0.6 } )
    if (!live && play.hand?.what !== 'slide') { pen.stamp(this.jumper(on, worn)); return }
    for (const p of worn) {
      const l = play.look(p), up = ease(span(t - l.born, 0.1, 0.45))
      if (t < l.born) continue
      const seat = ringSeat(on, { k: p.k, x: l.x }), y0 = STRIP.mid
      pen.at(seat.x, y0 + (seat.y - y0) * up - Math.sin(up * Math.PI) * 30, () => pen.stamp(ring(this.album, p.k, lightAt(l.x + (1 - up) * 90))), 0, 1 + ring01(t - l.born - 0.45, 24, 8) * 0.06, (0.4 * (1 - up) + seat.sy * up) * (1 + ring01(t - l.born - 0.45, 24, 8) * 0.12))
    }
  }

  // --- The table -----------------------------------------------------------------

  private pieces(play: Play): void {
    const { pen, album } = this, t = play.now, row = play.save.row, h = play.hand
    const flying = new Set(play.flights.filter((f) => f.to.y === STRIP.mid).map((f) => f.to.x))
    row.forEach((p, i) => {
      if (flying.has(NECK + p.x + LENGTH[p.k] / 2)) return
      const l = play.look(p), over = row.slice(0, i).some((q) => p.x < endOf(q) - 0.5 && q.x < endOf(p) - 0.5)
      const jolt = t - l.jolt, hop = t - l.hop, going = Math.abs(l.x - p.x) > 1
      const held = h?.what === 'slide' && h.i === i
      let y = STRIP.mid - (over ? 26 : 0) - (going ? Math.abs(Math.sin(hop * 18)) * (p.k === 'sausage' ? 5 : 15) : 0) - (held ? 4 : 0), turn = over ? (p.k === 'shoe' ? -0.16 : p.k === 'duck' ? 0.07 : 0.1) : 0
      if (play.gusting) turn += p.k === 'duck' ? -0.16 : p.k === 'shoe' ? Math.sin(t * 34) * 0.05 : Math.sin(t * 9) * 0.07
      if (going && p.k === 'duck') turn += Math.sin(hop * 20) * 0.14
      const sq = ring01(jolt, 24, 8) * 0.12
      pen.at(NECK + l.x + LENGTH[p.k] / 2, y, () => pen.stamp(piece(album, p.k, going || held ? lightAt(l.x) : lightAt(p.x))), turn, 1 + sq * 0.2, 1 - sq)
    })
  }

  private covers(play: Play): void {
    const { pen, album } = this, t = play.now
    for (const k of KINDS) {
      const T = TRAY[k], a = play.acting(k, 0.5), tornAge = t - play.torn[k]
      const closed = !play.save.open[k] || play.torn[k] === Infinity
      if (!closed && !(tornAge >= 0 && tornAge < 0.8)) {
        if (a) pen.at(trayPoint(k).x, trayPoint(k).y + 6, () => pen.stamp(piece(album, k, lightAt(a.age * 120))), ring01(a.age) * 0.2, 0.86)
        continue
      }
      const pic = cover(album, T.w, T.h, k), off = closed ? 0 : tornAge / 0.8
      this.ctx.globalAlpha = 1 - off
      const sq = a ? ring01(a.age) * 0.05 : 0
      pen.at(T.x + T.w / 2 + off * 60, T.y + T.h / 2 - off * 190, () => pen.stamp(pic), off * 0.7, (1 + sq) * (1 - off * 0.5), (1 - sq) * (1 - off * 0.5))
      this.ctx.globalAlpha = 1
    }
  }

  private magpie(play: Play): void {
    const { pen, album } = this, t = play.now, s = play.scene
    const base = { x: MAGPIE.x + 150, y: MAGPIE.y + 148 }
    pen.at(base.x, base.y, () => pen.stamp(MAG.pile(album)))
    let x = base.x, y = base.y - 66, hop = 0, flip = 1, snipping = false, wear: Kind | null = null, turn = 0, headTurn = Math.sin(t * 0.9) * 0.06, beak = 0
    const a = play.acting('magpie', 1.5)
    if (s?.is === 'tune') {
      const age = t - s.at, n = s.order.length, end = 0.3 + n * 0.22, row = play.save.row
      const k = Math.max(0, Math.min(n - 1, (age - 0.3) / 0.22)), i = Math.floor(k), p = row[s.order[i]], q = row[s.order[Math.min(n - 1, i + 1)]]
      const there = ease(span(age, 0, 0.28)) * (1 - ease(span(age, end, end + 0.55)))
      if (p && q) {
        x += (NECK + p.x + (q.x - p.x) * ease(k - i) + 90 - x) * there
        y += (STRIP.mid + 34 - y) * there
        hop = Math.abs(Math.sin((age - 0.3) * Math.PI / 0.22)) * 24 * there
      }
    }
    if (a) {
      const g = a.age
      switch (a.kind) {
        case 'press': turn = ring01(g) * 0.05; beak = g < 0.1 ? 1 : 0; break
        case 'snip': snipping = g < 0.5; headTurn = -0.3; hop = Math.abs(Math.sin(clamp(g / 0.5) * Math.PI * 2)) * 16; break
        case 'air': snipping = g < 1; headTurn = -0.3; break
        case 'look': headTurn = 0.35 * Math.sin(clamp(g) * 3.1); beak = g > 0.2 && g < 0.35 ? 1 : 0; break
        case 'ruffle': turn = Math.sin(g * 40) * 0.05; break
        case 'sit': hop = -14 * Math.sin(clamp(g / 1.4) * 3.1); break
        case 'sausage': case 'shoe': wear = a.kind; break
        case 'duck': wear = 'duck'; beak = Math.abs(Math.sin(g * 22)); headTurn = Math.sin(g * 12) * 0.2; break
        default: break
      }
    }
    if (s?.is === 'show') { headTurn = -0.32; beak = 0 }
    const light = hop > 2 || (a && a.age < 1) ? lightAt(t * 150) : 0
    pen.at(x, y - hop, () => {
      pen.stamp(MAG.body(album, light))
      pen.at(-40, -78, () => {
        if (wear === 'duck') pen.at(-104, 6, () => pen.stamp(piece(album, 'duck', 1)), 0, -0.8, 0.8)
        pen.stamp({ ...MAG.beak(album), y: 4 + beak * 10 })
        pen.stamp(MAG.head(album, light))
        pen.fill(oval(-14, -12, 11, 12), '#fff')
        const gz = this.gaze(play, { x: x - 54, y: y - 90 })
        pen.fill(oval(-14 + gz[0] * 4, -12 + gz[1] * 4, 6, 6.6), '#16122a')
        if (wear === 'shoe') pen.at(6, -62, () => pen.stamp(piece(album, 'shoe', 2)), -0.1, 0.8)
      }, headTurn)
      if (wear === 'sausage') pen.at(-28, -40, () => pen.stamp(piece(album, 'sausage', 1)), 0.2, 0.8)
      pen.at(-62, -4, () => pen.stamp(MAG.scissors(album, snipping ? Math.floor(t * 12) % 2 : (Math.sin(t * 0.7) > 0.94 ? 1 : 0))), 0.1 - 0.2 * Number(snipping))
    }, turn, 0.92 * flip, 0.92)
    if (s?.is === 'show') this.show(play, s)
  }

  /** On her own bench, for a mouse, with scraps of foil. */
  private show(play: Play, s: Extract<Scene, { is: 'show' }>): void {
    const { pen, album } = this, age = play.now - s.at, X = MAGPIE.x - 6, Y = MAGPIE.y + 150
    const inn = ease(span(age, 0, 0.35)) * (1 - ease(span(age, 4.2, 4.6)))
    if (inn <= 0.02) return
    const push = (a: number): number => ease(span(age, a, a + 0.7))
    const two = s.idea === 'two', Lm = 168
    pen.at(X + 150, Y, () => {
      pen.fill(path((p) => p.roundRect(-150, -58, 300, 92, 14)), '#e9eef0')
      const scrap = (k: Kind, x: number, w: number, alpha = 1, dy = 0): void => { this.ctx.globalAlpha = alpha; pen.at(x, 10 + dy, () => pen.stamp(ring(album, k, lightAt(x * 2))), 0, (w - 2) / LENGTH[k], 0.26); this.ctx.globalAlpha = 1 }
      if (two) { pen.at(-46, -12, () => pen.stamp(MAG.mouse(album, 0)), 0, 1.4, 0.9); pen.at(46 + (1 - push(0.5)) * 60, -12, () => pen.stamp(MAG.mouse(album, 1)), 0, 1.4, 0.9) } else pen.at(4, -8, () => pen.stamp(MAG.longMouse(album)), 0, 0.96)
      const l = -Lm / 2
      switch (s.idea) {
        case 'touching': case 'two': {
          const w = two ? 46 : 56
          for (let i = 0; i < Lm / w - 0.5; i++) scrap('sausage', l + w * (i + 0.5) + (i ? (1 - push(0.6 + i)) * 26 * i : 0), w)
          break
        }
        case 'long': for (let i = 0; i < 4; i++) scrap('sausage', l + 56 * (i + 0.5) + (i === 3 ? push(1.6) * 60 : 0), 56, i === 3 ? 1 - push(1.8) : 1, i === 3 ? push(1.6) * 26 : 0); break
        case 'duck': case 'shoe': {
          const small = s.idea === 'duck' ? 28 : 42
          for (let i = 0; i < 3; i++) scrap('sausage', l + 28 + i * 56, 56, 1 - push(2))
          for (let i = 0; i < Lm / small; i++) scrap(s.idea, l + small * (i + 0.5), small, push(1 + i * 0.2), (1 - push(1 + i * 0.2)) * 24)
          break
        }
        case 'mix': scrap('sausage', l + 56, 112); scrap('duck', l + 112 + 28 + (1 - push(1.4)) * 40, 56); break
        default: s.idea satisfies never
      }
    }, 0, inn)
  }

  private mice(play: Play): void {
    const { pen, album } = this, t = play.now, f = play.fit, a = play.acting('mice', 1.3), tripped = !!f?.long && play.scene?.is !== 'next'
    const x = tripped ? Math.min(MICE.x + 16, NECK + f!.end + 34) : MICE.x + 16, y = TABLE_Y - 2
    const hop = a ? -Math.abs(Math.sin(a.age * 13)) * 16 * (1 - a.age / 1.3) : 0
    for (const n of [0, 1]) pen.at(x - 6 + n * 30, y + hop * (n ? 0.6 : 1) + (tripped ? 4 : 0), () => pen.stamp(MAG.mouse(album, a ? lightAt(a.age * 150) : n)), tripped ? (n ? 1.4 : -1.2) : Math.sin(t * 2 + n) * 0.03, 0.8)
    pen.at(x + 8 + (a ? Math.sin(a.age * 14) * 7 : 0), y - 44 + (tripped ? 18 : hop * 1.6), () => pen.stamp(MAG.cake(album)), tripped ? 2.7 : a ? Math.sin(a.age * 16) * 0.2 : 0, 0.86)
  }

  // --- In the hand -----------------------------------------------------------------

  private flights(play: Play): void {
    const { pen, album } = this
    for (const f of play.flights) {
      const k = clamp((play.now - f.at) / f.lasts)
      if (play.now < f.at) continue
      pen.at(f.from.x + (f.to.x - f.from.x) * k, f.from.y + (f.to.y - f.from.y) * k - Math.sin(k * Math.PI) * 90, () => pen.stamp(piece(album, f.k, lightAt(k * 160))), k * (f.to.y === STRIP.mid ? 0.4 * Math.sin(k * 6) : 6.28 * 0.5), f.to.y === STRIP.mid ? 1 : 1 - k * 0.2)
    }
  }

  private held(play: Play): void {
    const { pen, album } = this, h = play.hand
    if (!h || h.what === 'slide') return
    if (h.what === 'guest') {
      const w = play.save.wait[0]
      pen.at(h.at.x + 60, h.at.y + 40, () => drawHead(pen, album, w, { gaze: [-0.6, 0.6], lid: 0, mouth: 'open', open: 0.4, cold: true }, lightAt(h.at.x)), Math.sin(play.now * 8) * 0.06, 0.8)
      return
    }
    const x = h.at.x - h.grip + LENGTH[h.k] / 2
    // Where it would come to lie shows as its shadow on the strip.
    if (h.at.y > STRIP.y - 60 && h.at.y < STRIP.y + STRIP.h + 40 && x > NECK - 60) pen.fill(path((p) => p.ellipse(Math.max(NECK + LENGTH[h.k] / 2, Math.min(NECK + STRIP_LENGTH - LENGTH[h.k] / 2, x)), STRIP.mid + 34, LENGTH[h.k] / 2, 12, 0, 0, 7)), '#2a1c38', 0.24)
    pen.at(x, h.at.y - 14, () => pen.stamp(piece(album, h.k, lightAt(h.at.x + h.at.y))), Math.sin(h.at.x * 0.03) * 0.06, 1.08)
  }

  private gust(age: number): void {
    const k = age / 2.4
    this.pen.line(path((p) => { for (let i = 0; i < 7; i++) { const x = 60 + ((age * 900 + i * 190) % 1150), y = 150 + i * 62 + Math.sin(age * 6 + i) * 14; p.moveTo(x, y); p.bezierCurveTo(x + 50, y - 16, x + 80, y + 14, x + 130, y - 4) } }), '#fff', 4, 0.7 * Math.sin(Math.PI * clamp(k)))
  }

  // --- Guidance ----------------------------------------------------------------------

  /** One move the child could make now: never where it would come out right. */
  move(play: Play, index: number): { from: Point; to: Point | null } {
    const row = play.save.row
    if (play.ready) return { from: { x: DOOR.x + 120, y: 170 }, to: null }
    const loose = row.findIndex((_, i) => scootTo(row, i) !== null)
    if (index % 2 && loose >= 0) return { from: { x: NECK + row[loose].x + LENGTH[row[loose].k] / 2, y: STRIP.mid }, to: null }
    const k = KINDS.find((q) => play.save.open[q])!
    return { from: trayPoint(k), to: { x: NECK + hopTo(row, k) + LENGTH[k] / 2 - 30, y: STRIP.mid } }
  }

  private guide(play: Play, g: Guidance): void {
    const { pen, album } = this
    if (g.glow > 0) pen.line(path((p) => {
      const pulse = 3 * Math.sin(play.now * 4)
      const m = this.move(play, 0).from
      p.ellipse(m.x, m.y, 84 + pulse, 62 + pulse, 0, 0, 7)
    }), '#fff6c8', 6, g.glow * 0.7)
    if (g.demo === null) return
    const m = this.move(play, g.demoIndex), q = handPose(g.demo, m.to !== null, this.pose)
    const x = m.to ? m.from.x + (m.to.x - m.from.x) * q.travel : m.from.x, y = m.to ? m.from.y + (m.to.y - m.from.y) * q.travel : m.from.y
    this.ctx.globalAlpha = q.opacity
    if (m.to && q.press > 0.5) { const k = KINDS.find((z) => play.save.open[z])!; pen.at(x, y - 8, () => pen.stamp(piece(album, k, lightAt(x)))); this.ctx.globalAlpha = q.opacity }
    pen.at(x, y, () => pen.stamp(hand(album)), 0, 1.15 - q.press * 0.15)
    this.ctx.globalAlpha = 1
  }
}

/** The bare stretches of one customer `length` long that lies from `from` on. */
export function bare(worn: readonly Piece[] | null, from: number, length: number): { from: number; to: number }[] {
  if (!worn) return [{ from: 0, to: length }]
  const out: { from: number; to: number }[] = []
  let at = 0
  for (const p of [...worn].sort((a, b) => a.x - b.x)) {
    const a = p.x - from, b = endOf(p) - from
    if (a > at + 2) out.push({ from: at, to: Math.min(a, length) })
    at = Math.max(at, b)
    if (at >= length) break
  }
  if (at < length - 2) out.push({ from: Math.max(0, at), to: length })
  return out.filter((s) => s.to > s.from)
}
