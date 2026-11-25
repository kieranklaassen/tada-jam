import { moveOf, ownOf, type Move, still } from './acts'
import type { Note } from './audio'
import * as F from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import { along, hintFor } from './guide'
import { CELL, CELLS, HALF, HOME, HOUSE, PLACES, ROBIN, SNOW, THINGS, TREE, type Point, type ThingId } from './layout'
import { BAKED, BISCUIT, CHOC, ICING, Stamps, type Ctx } from './paint'
import { paintScene } from './scenery'
import { ROBIN_STEPS, phrasesOf } from './voices'
import { FLOP, HOP, LEAP, SHIVER, complete, fallAt, isFull, seat, spun, type Act, type Ball, type World } from './world'

// Draws the world, and keeps what is only to be seen: springs, crumbs, tracks
// fading under fresh snow. Nothing here is saved and nothing decides anything.

/** The most pictures one frame may stamp. */
export const STAMP_LIMIT = 150
/** A stuck thing is pressed in, so it is drawn a little smaller than on the snow. */
const STUCK = 0.74
const LONG = 99
const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v))
const smooth = (v: number): number => { const u = clamp(v); return u * u * (3 - 2 * u) }
/** A push that rings down. */
export const ring = (t: number, rate = 20, fall = 5): number => (t > 2 ? 0 : Math.exp(-t * fall) * Math.sin(t * rate))

type Made = { canvas: CanvasImageSource; ctx: Ctx }
type Crumb = { x: number; y: number; vx: number; vy: number; t: number; r: number; floor: number }
/** Where each part of him was drawn, for tests and for his arms. */
export type Drawn = { mids: Point[]; rs: number[] }

export class View {
  readonly stamps = new Stamps()
  private scene: { canvas: CanvasImageSource; x: number; y: number; w: number; h: number } | null = null
  private tracks: Made | null = null
  private seenBare = new Uint8Array(CELLS)
  private trackAlpha = 1
  private fading = false
  private time = 0
  private readonly pushed = new Map<string, number>()
  private crumbs: Crumb[] = []
  private landed = LONG
  private woke = LONG
  private jolt = LONG
  private rolled = 0
  private speed = 0
  private robinAt = -1
  private phraseT = -1
  private look: Point = { x: 400, y: 600 }
  private squash = LONG
  private arm: Point[] = [{ x: 0, y: 0 }, { x: 0, y: 0 }]
  private armSet = false
  private ease = 1
  private heapSize = 1
  private touched: Point = { x: 400, y: 200 }
  private readonly handAt: HandPose = { travel: 0, press: 0, opacity: 0 }
  drawn: Drawn = { mids: [], rs: [] }
  sounds: Note[][] = []

  sized(make: (w: number, h: number) => Made, scale: number, x: number, y: number, w: number, h: number): void {
    this.stamps.at(scale)
    const made = make(Math.max(1, Math.ceil(w * scale)), Math.max(1, Math.ceil(h * scale)))
    made.ctx.scale(scale, scale)
    made.ctx.translate(-x, -y)
    paintScene(made.ctx, x, y, w, h)
    for (const s of F.ALL) this.stamps.warm(s)
    this.scene = { canvas: made.canvas, x, y, w, h }
    const k = Math.min(1.5, scale)
    this.tracks = make(Math.ceil(SNOW.cols * CELL * k), Math.ceil(SNOW.rows * CELL * k))
    this.tracks.ctx.scale(k, k)
    this.tracks.ctx.translate(-SNOW.x, -SNOW.y)
    this.seenBare.fill(0)
  }

  notice(a: Act, finger: Point | null = null): void {
    if (finger) this.touched = finger
    switch (a.type) {
      case 'press': this.pushed.set(a.on, 0); if (a.on !== 'sky') this.squash = 0; if (a.on === 'man') this.jolt = 0; if (a.on === 'tree') this.snowfall(TREE.x, 330, 7); if (a.on === 'sky') this.snowfall(this.touched.x, this.touched.y, 4); break
      case 'stick': this.pushed.set(a.id, 0); this.squash = 0; break
      case 'land': this.landed = 0; this.fading = true; this.burst(HOME.x, seatY(a.place), 14); this.snowfall(TREE.x, 330, 5); break
      case 'wake': this.woke = 0; break
      case 'walk': this.phraseT = 0; break
      case 'jolt': this.jolt = 0; break
      case 'leap': this.jolt = 0; break
      case 'flop': this.fading = true; this.landed = 0; this.phraseT = -1; break
      case 'drop': this.pushed.set('tree', 0); this.snowfall(TREE.x, 340, 5); break
      default: break
    }
  }
  private burst(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.28; this.crumb(x + Math.cos(a) * 60, y + Math.sin(a) * 18, Math.cos(a) * 190, -90 - (i % 4) * 50, 4 + (i % 3) * 2, y + 90) }
  }
  private snowfall(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) this.crumb(x + (i - n / 2) * 18, y + (i % 3) * 16, (i % 2 ? 1 : -1) * 20, 30, 4 + (i % 3) * 2, y + 230)
  }
  private crumb(x: number, y: number, vx: number, vy: number, r: number, floor: number): void {
    if (this.crumbs.length >= 34) this.crumbs.shift()
    this.crumbs.push({ x, y, vx, vy, t: 0, r, floor })
  }

  /** Plays the seconds of a frame for everything that is only seen. */
  advance(world: World, finger: Point | null, robin: number, dt: number): void {
    if (finger) this.touched = finger
    this.time += dt
    this.ease = 1 - Math.exp(-dt * 17)
    for (const [k, v] of this.pushed) this.pushed.set(k, v + dt)
    this.landed += dt; this.woke += dt; this.jolt += dt; this.squash += dt
    if (this.fading) { this.trackAlpha -= dt / 0.7; if (this.trackAlpha <= 0) this.clearTracks() }
    this.crumbs = this.crumbs.filter((c) => { c.t += dt; c.vy += 620 * dt; c.x += c.vx * dt; c.y += c.vy * dt; return c.t < 1.6 && c.y < c.floor })
    const b = world.ball
    const want = finger && (complete(world) || !b) ? finger : b ? { x: b.x, y: b.y - b.r } : { x: 420, y: 560 }
    const k = 1 - Math.exp(-dt * 8)
    this.look = { x: this.look.x + (want.x - this.look.x) * k, y: this.look.y + (want.y - this.look.y) * k }
    if (b) {
      const v = Math.hypot(b.vx, b.vy)
      this.speed += (v - this.speed) * k
      this.rolled += v * dt
      if (this.rolled > 34) {
        this.rolled = 0
        const s = Math.sign(b.vx) || 1
        for (let i = 0; i < 2; i++) this.crumb(b.x - s * b.r * (0.4 + i * 0.3), b.y - 4, -s * (60 + i * 70), -120 - i * 60, 3.5 + b.r / 40 + i, b.y + 6)
      }
    } else this.speed = 0
    // Each thing plays its phrase while he walks.
    const w = world.walk
    if (w && w.shiver < 0) {
      const before = this.phraseT
      this.phraseT = before + dt
      let spoken = 0
      world.stack.forEach((s, i) => phrasesOf(PLACES[i], s.things).forEach((p, j) => {
        const off = 0.5 + i * 0.13 + j * 0.07
        const a = Math.floor((before - off) / p.every), z = Math.floor((this.phraseT - off) / p.every)
        if (z > a && z >= 0 && spoken++ < 4) this.sounds.push(p.notes(1 + ((z % 3) - 1) * 0.06).map((x) => ({ ...x, peak: x.peak * 0.8 })))
      }))
    }
    if (robin >= 0) for (const [at, key] of ROBIN_BEATS) if (this.robinAt < at && robin >= at) this.sounds.push(ROBIN_STEPS[key])
    this.robinAt = robin
  }

  private clearTracks(): void {
    this.fading = false
    this.trackAlpha = 1
    const t = this.tracks
    if (t) t.ctx.clearRect(SNOW.x, SNOW.y, SNOW.cols * CELL, SNOW.rows * CELL)
    this.seenBare.fill(0)
  }
  private bite(x: number, y: number, rx: number, ry: number): void {
    const c = this.tracks!.ctx
    c.globalCompositeOperation = 'source-over'
    c.fillStyle = '#a9672f'
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill()
    c.fillStyle = 'rgba(86,42,16,0.28)'
    c.beginPath()
    for (let i = 0; i < 3; i++) { const px = x + Math.sin(x * 3 + i * 2.1) * rx * 0.7, py = y + Math.cos(y * 5 + i * 2.6) * ry * 0.7; c.moveTo(px + 2, py); c.ellipse(px, py, 2, 1.4, 0, 0, 7) }
    c.fill()
    // The lip of the icing that is left.
    c.globalCompositeOperation = 'destination-over'
    c.fillStyle = '#d7bb98'
    c.beginPath(); c.ellipse(x, y - 2, rx + 5, ry + 4, 0, 0, 7); c.fill()
    c.globalCompositeOperation = 'source-over'
  }
  private keepTracks(world: World): void {
    if (!this.tracks) return
    let any = false
    for (let i = 0; i < CELLS; i++) {
      if (!world.bare[i] || this.seenBare[i]) continue
      if (this.fading) this.clearTracks()
      this.seenBare[i] = 1
      any = true
      this.bite(SNOW.x + ((i % SNOW.cols) + 0.5) * CELL, SNOW.y + (Math.floor(i / SNOW.cols) + 0.5) * CELL + Math.sin(i * 7.3) * 3, 13 + Math.sin(i * 5.1) * 3, 11 + Math.cos(i * 3.7) * 2)
    }
    const b = world.ball
    if (any && b && b.fall <= 0) this.bite(b.x, b.y, Math.max(16, b.r * 0.5), Math.max(12, b.r * 0.3))
  }

  draw(c: Ctx, world: World, robin: number, guidance: Guidance | null): void {
    this.stamps.stamped = 0
    if (!this.scene) return
    this.keepTracks(world)
    c.drawImage(this.scene.canvas, this.scene.x, this.scene.y, this.scene.w, this.scene.h)
    if (this.tracks) { c.globalAlpha = clamp(this.trackAlpha); c.drawImage(this.tracks.canvas, SNOW.x, SNOW.y, SNOW.cols * CELL, SNOW.rows * CELL); c.globalAlpha = 1 }
    this.idle(c)
    this.drawRobin(c, robin)
    const hint = guidance && guidance.glow > 0.01 ? hintFor(world) : null
    const glow = hint ? guidance!.glow * (0.6 + 0.4 * Math.sin(this.time * 5)) : 0
    // What is farther stands behind.
    const list: { y: number; go: () => void }[] = []
    const manY = world.walk ? HOME.y - 1 : HOME.y
    list.push({ y: manY, go: () => this.man(c, world, hint?.glow === 'man' ? glow : 0) })
    for (const id of THINGS) { const p = world.loose[id]; if (p) list.push({ y: p.y, go: () => this.loose(c, world, id, p) }) }
    const b = world.ball
    if (b) list.push({ y: b.y, go: () => this.rolling(c, world, hint?.glow === 'ball' ? glow : 0) })
    list.sort((p, q) => p.y - q.y)
    for (const e of list) e.go()
    if (world.hop) this.hopping(c, world)
    this.leaper(c, world)
    c.fillStyle = ICING
    for (const p of this.crumbs) { c.globalAlpha = clamp(3.2 - p.t * 2); c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill() }
    c.globalAlpha = 1
    if (hint && guidance?.demo != null) {
      const path = hint.path, pose = this.handAt
      handPose(guidance.demo, path.length > 1, pose, 1)
      const at = path.length > 1 ? along(path, pose.travel) : path[0]
      c.globalAlpha = pose.opacity
      this.stamps.stamp(c, F.hand, at.x, at.y + 8 - pose.press * 4, -0.25, 1.15 - pose.press * 0.15)
      c.globalAlpha = 1
    }
  }

  /** The air: dots of icing drifting, windows breathing, smoke. */
  private idle(c: Ctx): void {
    c.fillStyle = ICING
    for (let i = 0; i < 22; i++) {
      const u = (this.time * (0.02 + ((i * 0.382) % 1) * 0.02) + i * 0.618) % 1
      c.globalAlpha = 0.75 * Math.sin(u * Math.PI)
      c.beginPath(); c.arc(((i * 0.7549) % 1) * 1180 + Math.sin(this.time * 0.7 + i) * 18, -10 + u * 520, 3 + (i % 3) * 1.6, 0, 7); c.fill()
    }
    const lit = 0.16 + 0.12 * Math.sin(this.time * 1.7) + 0.7 * Math.exp(-(this.pushed.get('house') ?? LONG) * 1.8)
    c.fillStyle = '#fff3b0'
    c.globalAlpha = clamp(lit, 0, 0.9)
    for (const s of [-56, 56]) c.fillRect(HOUSE.x + s - 20, HOUSE.y - 16, 40, 38)
    c.fillStyle = ICING
    for (let i = 0; i < 3; i++) { const u = (this.time * 0.22 + i / 3) % 1; c.globalAlpha = (1 - u) * 0.75; c.beginPath(); c.arc(HOUSE.x + 62 + Math.sin(u * 5 + i) * 8, HOUSE.y - 178 - u * 70, 7 + u * 12, 0, 7); c.fill() }
    c.globalAlpha = 1
  }

  private ballAt(c: Ctx, b: Ball, x: number, y: number, sx: number, sy: number, rot: number): void {
    const k = b.r / F.SNOWBALL
    c.save(); c.translate(x, y); c.scale(sx, sy)
    this.stamps.stamp(c, F.ball, 0, 0, b.spin + rot, k)
    this.stamps.stamp(c, F.gloss, 0, 0, 0, k)
    c.restore()
  }
  private stuck(c: Ctx, b: Ball, x: number, y: number, sx: number, sy: number, rot: number, own?: (id: ThingId) => { turn: number; grow: number } | null): void {
    for (const s of b.things) {
      const p = spun(b, s), cs = Math.cos(rot), sn = Math.sin(rot)
      const o = own?.(s.id), jig = ring(this.pushed.get(s.id) ?? LONG)
      if (own && !o) continue
      const px = x + (p.x * cs - p.y * sn) * sx, py = y + (p.x * sn + p.y * cs) * sy
      this.stamps.stamp(c, F.THING[s.id], px, py, p.rot + rot + (o?.turn ?? 0) + jig * 0.3, (o?.grow ?? 1) * STUCK)
      this.pupils(c, s.id, px, py, p.rot + rot + (o?.turn ?? 0) + jig * 0.3)
    }
  }
  private pupils(c: Ctx, id: ThingId, x: number, y: number, rot: number): void {
    const e = F.EYES[id]
    if (!e) return
    const cs = Math.cos(rot), sn = Math.sin(rot)
    c.fillStyle = CHOC
    for (const [ex, ey] of e.at) {
      const px = x + ex * cs - ey * sn, py = y + ex * sn + ey * cs, a = Math.atan2(this.look.y - py, this.look.x - px)
      c.beginPath(); c.arc(px + Math.cos(a) * 4, py + Math.sin(a) * 4, e.r, 0, 7); c.fill()
    }
  }

  private loose(c: Ctx, world: World, id: ThingId, p: Point): void {
    const h = world.heap, jig = ring(this.pushed.get(id) ?? LONG)
    let x = p.x, y = p.y - HALF[id], rot = jig * 0.25, lift = 0
    if (h && h.t > 0 && h.from[id]) {
      const u = clamp((h.t - 0.1 - THINGS.indexOf(id) * 0.03) / 0.75), f = h.from[id]
      x = f.x + (p.x - f.x) * u
      y = f.y + (y - f.y) * u
      lift = Math.sin(u * Math.PI) * 150
      rot += (1 - u) * (u > 0 ? 7 : 0)
    }
    this.stamps.stamp(c, F.shadow, p.x, p.y - 2, 0, 0.5)
    // Each idles in its own way.
    const t = this.time
    if (id === 'cat') rot += Math.sin(t * 1.3) * 0.03
    if (id === 'goose') rot += Math.sin(t * 2.2) * 0.06 - 0.04
    const breathe = id === 'cat' || id === 'goose' ? 1 + Math.sin(t * 2.6 + p.x) * 0.02 : 1
    this.stamps.stamp(c, F.THING[id], x, y - lift - Math.abs(jig) * 34, rot, 1 + jig * 0.06, breathe - jig * 0.1)
    this.pupils(c, id, x, y - lift - Math.abs(jig) * 34, rot)
  }

  private rolling(c: Ctx, world: World, glow: number): void {
    const b = world.ball!, at = fallAt(b)
    const wob = ring(this.squash, 24, 5) * 0.2, fast = clamp(this.speed / 600) * 0.05
    const full = isFull(world, b) ? Math.sin(this.time * 9) * 0.02 : 0
    const x = at.x, y = at.y - b.r * (1 - wob * 0.6)
    this.stamps.stamp(c, F.shadow, b.x, b.y - 2, 0, b.r / 80)
    if (glow > 0) { c.globalAlpha = clamp(glow); this.stamps.stamp(c, F.halo, x, y, 0, (b.r / 100) * 1.35); c.globalAlpha = 1 }
    const sx = 1 + wob + fast + full, sy = 1 - wob - fast - full
    this.ballAt(c, b, x, y, sx, sy, 0)
    this.stuck(c, b, x, y, sx, sy, 0)
  }

  private hopping(c: Ctx, world: World): void {
    const h = world.hop!, u = clamp(h.t / HOP), to = seat(world, h.ball.r)
    const dip = smooth(u / 0.2) * (1 - smooth((u - 0.2) / 0.12))
    const v = smooth((u - 0.2) / 0.8)
    const x = h.from.x + (to.x - h.from.x) * v
    const y = h.from.y + (to.y - h.from.y) * v - Math.sin(v * Math.PI) * 130 + dip * h.ball.r * 0.2
    const sx = 1 + dip * 0.2 - Math.sin(v * Math.PI) * 0.08, sy = 1 - dip * 0.22 + Math.sin(v * Math.PI) * 0.1
    this.ballAt(c, h.ball, x, y, sx, sy, 0)
    this.stuck(c, h.ball, x, y, sx, sy, 0)
  }

  /** The one that shakes free, on its way down to the snow. */
  private leaper(c: Ctx, world: World): void {
    const w = world.walk
    if (!w?.loose || w.shiver < SHIVER * 0.7) return
    const i = world.stack.findIndex((b) => b.things.some((s) => s.id === w.loose))
    if (i < 0) return
    const b = world.stack[i], s = b.things.find((q) => q.id === w.loose)!, p = spun(b, s), m = this.drawn.mids[i] ?? { x: w.x, y: 400 }
    const u = clamp((w.shiver - SHIVER * 0.7) / (SHIVER * 0.3))
    const x = m.x + p.x + LEAP.x * u, y = m.y + p.y + LEAP.y * Math.sin((u * Math.PI) / 2)
    this.stamps.stamp(c, F.THING[w.loose], x, y, p.rot - u * 4, 1.1)
    this.pupils(c, w.loose, x, y, p.rot - u * 4)
  }

  private man(c: Ctx, world: World, glow: number): void {
    const w = world.walk, n = world.stack.length
    const x0 = w ? w.x : HOME.x
    if (n === 0) { this.heaped(c, world); return }
    const moves: Move[] = [], t = w ? w.t : this.time
    const going = w ? (w.shiver < 0 ? smooth((w.t - 0.3) / 0.4) : 0) : 0
    world.stack.forEach((b, i) => {
      const m = w ? moveOf(PLACES[i], b.things, t) : still()
      for (const k of Object.keys(m) as (keyof Move)[]) m[k] *= going
      // Breathing, and waiting to be off.
      const br = Math.sin(this.time * 1.9 - i * 0.6) * 0.012
      m.sx += br; m.sy -= br
      if (complete(world) && !w) m.rot += Math.sin(this.time * 2.4 + i) * 0.015
      moves.push(m)
    })
    const lift = moves.reduce((s, m) => s + m.lift, 0)
    const shiver = w && w.shiver >= 0 ? Math.sin(w.shiver * 70) * 7 * smooth(w.shiver * 3) : 0
    const sink = w && w.shiver > SHIVER * 0.78 ? smooth((w.shiver - SHIVER * 0.78) / (SHIVER * 0.22)) : 0
    const land = ring(this.landed, 22, 5) * 0.12, jolt = ring(this.jolt, 26, 6) * 0.1
    const tilt = moves.reduce((s, m) => s + m.tilt, 0) + (w ? w.face * 0.04 * going : 0)
    const lean = w && w.t < 0.5 && w.shiver < 0 ? Math.sin((w.t / 0.5) * Math.PI) * 0.06 : 0
    this.stamps.stamp(c, F.shadow, x0, HOME.y - 2, 0, (world.stack[0].r / 70) * (1 - clamp(lift / 400)))
    c.save()
    c.translate(x0 + shiver, HOME.y - lift)
    c.rotate(tilt + lean)
    const mids: Point[] = [], rs: number[] = []
    let top = 0, sway = 0
    if (glow > 0) { c.globalAlpha = clamp(glow) * 0.6; this.stamps.stamp(c, F.halo, 0, -230, 0, 1.75, 2.7); c.globalAlpha = 1 }
    world.stack.forEach((b, i) => {
      const m = moves[i], below = world.stack[i - 1]
      const sx = 1 + m.sx + land + jolt + sink * 0.5, sy = (1 + m.sy - land - jolt) * (1 - sink * 0.6)
      const inn = i === 0 ? b.r * 0.1 : Math.min(b.r, below.r) * 0.26
      const cy = top + inn - b.r * sy + m.y
      sway += m.x
      mids.push({ x: sway, y: cy }); rs.push(b.r)
      top = cy - m.y - b.r * sy
      this.ballAt(c, b, sway, cy, sx, sy, m.rot)
    })
    world.stack.forEach((b, i) => {
      const m = moves[i]
      this.stuck(c, b, mids[i].x, mids[i].y, 1 + m.sx + sink * 0.5, (1 + m.sy) * (1 - sink * 0.6), m.rot, (id) => {
        if (w && id === w.loose && w.shiver >= SHIVER * 0.7) return null
        const o = w ? ownOf(id, PLACES[i], t) : { turn: 0, grow: 1 }
        return { turn: o.turn * going, grow: 1 + (o.grow - 1) * going }
      })
    })
    this.drawn = { mids: mids.map((m) => ({ x: x0 + m.x * Math.cos(tilt) - m.y * Math.sin(tilt), y: HOME.y - lift + m.x * Math.sin(tilt) + m.y * Math.cos(tilt) })), rs }
    // The face, on the head or loose on the top edge of what there is.
    const ti = n - 1, r = rs[ti], mt = moves[ti]
    const pop = n === 3 ? smooth((this.woke - 0.3) / 0.35) : 0
    const er = clamp(r * 0.17, 9, 17)
    const spot: Point = { x: mids[ti].x, y: mids[ti].y - r * (1 - pop * 1.16 * 0.98) - (1 - pop) * er * 0.5 }
    if (n === 3) { spot.y = mids[ti].y - r * (1.02 - pop * 1.2 * 0.72) }
    const gap = n === 3 ? Math.max(er * 1.25, r * 0.28) : 22
    // What he calls the top of his eyes when there is no head squashes a little at each pat.
    if (n < 3) spot.x += 14
    this.eyes(c, spot, gap, (n === 3 ? er : 16) * (1 + ring(this.woke - 0.3 < 0 ? LONG : this.woke - 0.3, 18, 4) * 0.3), x0, HOME.y - lift, sink)
    if (pop > 0.2 && n === 3) {
      // Piped in icing first, so that the grin reads on whatever is stuck there.
      c.lineCap = 'round'
      for (const [w, col] of [[12, ICING], [5.5, CHOC]] as const) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(mids[2].x, mids[2].y + r * 0.22, r * 0.4 * pop, 0.2, Math.PI - 0.2); c.stroke() }
    }
    // Arms and hat.
    const si = Math.min(1, n - 1)
    const sh = rs[si], my = mids[si]
    const pat = Math.abs(Math.sin(this.time * 3.1)), topY = mids[ti].y - r
    let left: Point, right: Point, hatAt: Point & { rot: number }
    if (n < 3) {
      left = { x: mids[ti].x - Math.max(60, r * 0.72), y: topY + 8 - pat * 34 }
      right = { x: mids[ti].x + r * 0.7, y: topY - 120 + Math.sin(this.time * 2) * 8 }
      hatAt = { x: right.x - 26, y: right.y + 6, rot: -0.18 + Math.sin(this.time * 2) * 0.06 }
    } else {
      const u = smooth((this.woke - 0.4) / 0.4), wave = Math.sin(this.time * (w ? 8 : 4))
      left = { x: my.x - sh - 66, y: my.y - 40 - u * 50 + wave * 18 }
      right = { x: my.x + sh + 66, y: my.y - 40 - u * 50 - wave * 18 }
      const from = { x: mids[1].x + rs[1] * 0.7, y: mids[1].y - rs[1] - 120 }
      hatAt = { x: from.x + (mids[2].x - from.x) * u, y: from.y + (mids[2].y - r * 0.86 - from.y) * u - Math.sin(u * Math.PI) * 60, rot: -0.18 + 0.28 * u + mt.rot * 0.5 }
    }
    if (world.hop && n < 3) { left = { x: my.x - sh - 70, y: my.y - 60 }; right = { x: my.x + sh + 90, y: my.y - 130 }; hatAt = { x: right.x, y: right.y + 6, rot: 0.2 } }
    if (sink > 0) { left.y += sink * 120; right.y += sink * 120; hatAt.y += sink * 60 }
    const ease = this.armSet ? this.ease : 1
    this.arm[0] = { x: this.arm[0].x + (left.x - this.arm[0].x) * ease, y: this.arm[0].y + (left.y - this.arm[0].y) * ease }
    this.arm[1] = { x: this.arm[1].x + (right.x - this.arm[1].x) * ease, y: this.arm[1].y + (right.y - this.arm[1].y) * ease }
    this.armSet = true
    this.stamps.stamp(c, F.hat, hatAt.x, hatAt.y, hatAt.rot, n === 3 ? clamp(r / 72, 0.5, 1.1) : 0.95)
    this.limb(c, { x: my.x - sh * 0.8, y: my.y - sh * 0.1 }, this.arm[0], -1)
    this.limb(c, { x: my.x + sh * 0.8, y: my.y - sh * 0.1 }, this.arm[1], 1)
    c.restore()
  }

  private eyes(c: Ctx, at: Point, gap: number, r: number, ox: number, oy: number, sink: number): void {
    const blink = (this.time % 3.7) < 0.12 || sink > 0.6 ? 0.12 : 1
    for (const s of [-1, 1]) {
      const x = at.x + s * gap, y = at.y
      this.stamps.stamp(c, F.eyeball, x, y, 0, r / 21, (r / 21) * blink)
      if (blink < 1) continue
      const a = Math.atan2(this.look.y - (oy + y), this.look.x - (ox + x))
      c.fillStyle = CHOC
      c.beginPath(); c.arc(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * 0.48, 0, 7); c.fill()
      c.fillStyle = '#fff'
      c.beginPath(); c.arc(x + Math.cos(a) * r * 0.42 - r * 0.15, y + Math.sin(a) * r * 0.42 - r * 0.18, r * 0.14, 0, 7); c.fill()
    }
  }

  /** A long biscuit arm with a mitten. */
  private limb(c: Ctx, from: Point, to: Point, side: number): void {
    const bend = { x: (from.x + to.x) / 2 + side * 44, y: (from.y + to.y) / 2 + 26 }
    c.lineCap = 'round'
    for (const [w, color] of [[22, BAKED], [16, BISCUIT], [3.5, ICING]] as const) {
      c.strokeStyle = color; c.lineWidth = w
      c.beginPath(); c.moveTo(from.x, from.y); c.quadraticCurveTo(bend.x, bend.y, to.x, to.y); c.stroke()
    }
    this.stamps.stamp(c, F.mitt, to.x, to.y, Math.atan2(to.y - bend.y, to.x - bend.x) + Math.PI / 2, side * 1.1, 1.1)
  }

  private heaped(c: Ctx, world: World): void {
    const h = world.heap, x = h && h.t > 0 ? h.x : HOME.x
    const crawl = h && h.t > FLOP && Math.abs(h.x - HOME.x) > 1
    const wob = ring(this.landed, 14, 3) * 0.16 + (crawl ? Math.sin(this.time * 14) * 0.06 : Math.sin(this.time * 1.9) * 0.012)
    const want = h && h.t > 0 && h.t < FLOP ? clamp(h.mass / 150, 0.7, 1.1) : 1
    this.heapSize += (want - this.heapSize) * this.ease * 0.4
    const size = this.heapSize
    this.stamps.stamp(c, F.shadow, x, HOME.y - 2, 0, 1.6 * size)
    const pat = Math.abs(Math.sin(this.time * 3.1)), up = world.hop ? 1 : 0
    const l = { x: x - 88, y: HOME.y - 96 - pat * 34 }, r = { x: x + 78, y: HOME.y - 220 + Math.sin(this.time * 2) * 8 }
    if (up) { l.x -= 110; l.y += 30; r.x += 90 }
    if (crawl) { l.x = x - 120 + Math.sin(this.time * 14) * 40; l.y = HOME.y - 20; r.x = x + 120 - Math.sin(this.time * 14) * 40; r.y = HOME.y - 90 }
    this.stamps.stamp(c, F.hat, r.x - 24, r.y + 6, -0.18 + Math.sin(this.time * 2) * 0.06, 0.95)
    this.stamps.stamp(c, F.heap, x, HOME.y, 0, size * (1 + wob), size * (1 - wob))
    this.eyes(c, { x: x + 4, y: HOME.y - 106 * size }, 22, 16, 0, 0, 0)
    this.limb(c, { x: x - 96, y: HOME.y - 34 }, l, -1)
    this.limb(c, { x: x + 100, y: HOME.y - 34 }, r, 1)
    this.arm = [{ x: -90, y: -160 }, { x: 90, y: -260 }]
    this.drawn = { mids: [], rs: [] }
  }

  /** The robin's round, all of it small: roll, stick, hop, wake, walk, flop. */
  private drawRobin(c: Ctx, t: number): void {
    const g = ROBIN.y, mx0 = ROBIN.x + 92
    const on = t >= 0
    let mx = mx0, ballX = ROBIN.left + 34, ballY = g, r = 9, head = false, flat = 0, spin = 0, stuck = false, rx = ROBIN.left
    if (on) {
      const roll = smooth(t / 1.7)
      ballX += roll * 92; r = 9 + roll * 13; spin = roll * 7; stuck = t > 0.75
      rx = ballX - 34 - r
      if (t > 1.7) { const u = clamp((t - 1.7) / 0.6), tx = mx0, ty = g - 74; ballX = ballX + (tx - ballX) * u; ballY = g + (ty - g) * u - Math.sin(u * Math.PI) * 34; head = u >= 1 }
      if (t > 2.6) { const u = clamp((t - 2.6) / 1.5); mx = mx0 - 70 * Math.sin(u * Math.PI); }
      if (t > 4.2) flat = smooth((t - 4.2) / 0.3) * (1 - smooth((t - 5) / 0.4))
    }
    const bob = on ? -Math.abs(Math.sin(t * 9)) * (t < 1.7 ? 8 : 3) : -Math.abs(ring(this.pushed.get('robin') ?? LONG)) * 16
    const walk = on && t > 2.6 && t < 4.1 ? Math.sin(t * 12) * 0.16 : 0
    // The tiny one, with no head, patting its neck as the big one does.
    c.save(); c.translate(ROBIN.x, g); c.scale(1.3, 1.3); c.translate(-ROBIN.x, -g)
    c.save(); c.translate(mx, g - Math.abs(walk) * 40); c.rotate(walk); c.scale(1 + flat * 0.7, 1 - flat * 0.75)
    this.stamps.stamp(c, F.ball, 0, -24, 0, 0.26); this.stamps.stamp(c, F.gloss, 0, -24, 0, 0.26)
    this.stamps.stamp(c, F.ball, 0, -56, 0, 0.19); this.stamps.stamp(c, F.gloss, 0, -56, 0, 0.19)
    if (head) { this.stamps.stamp(c, F.ball, 0, -86, spin, 0.2); this.stamps.stamp(c, F.gloss, 0, -86, 0, 0.2); this.stamps.stamp(c, F.button, -8, -102, 0, 0.9) }
    const ey = head ? -90 : -78
    for (const s of [-1, 1]) { this.stamps.stamp(c, F.eyeball, s * 6, ey, 0, 0.24); c.fillStyle = CHOC; c.beginPath(); c.arc(s * 6 - 2, ey, 2.6, 0, 7); c.fill() }
    if (head) { c.strokeStyle = CHOC; c.lineWidth = 2; c.beginPath(); c.arc(0, -83, 7, 0.3, 2.8); c.stroke() }
    const pat = head ? -70 + Math.sin(this.time * 8) * 6 : -84 - Math.abs(Math.sin(this.time * 3.1)) * 9
    for (const s of [-1, 1]) {
      const hx = head ? s * 34 : s * 14
      c.lineCap = 'round'
      for (const [w, col] of [[6.5, BAKED], [4, BISCUIT]] as const) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(s * 15, -56); c.quadraticCurveTo(s * 34, -64, hx, pat); c.stroke() }
      this.stamps.stamp(c, F.mitt, hx, pat, 0, s * 0.28, 0.28)
    }
    c.restore()
    if (!head) {
      this.stamps.stamp(c, F.ball, ballX, ballY - r, spin, r / 100); this.stamps.stamp(c, F.gloss, ballX, ballY - r, 0, r / 100)
      if (stuck) this.stamps.stamp(c, F.button, ballX + Math.sin(spin) * r * 0.8, ballY - r - Math.cos(spin) * r * 0.8, spin, 0.9)
      else this.stamps.stamp(c, F.button, ROBIN.left + 84, g - 8, 0, 0.9)
    }
    const turn = on ? -1 : this.look.x > rx ? -1 : 1
    this.stamps.stamp(c, F.robinBody, on && t > 1.9 ? ROBIN.left + 62 : rx, g - 30 + bob, Math.sin(this.time * 2) * 0.04, turn * 0.92, 0.92)
    c.restore()
  }
}
const seatY = (place: string): number => (place === 'base' ? 560 : place === 'belly' ? 400 : 270)
const ROBIN_BEATS: readonly (readonly [number, keyof typeof ROBIN_STEPS])[] = [[0.1, 'roll'], [0.45, 'roll'], [0.75, 'stick'], [1.1, 'roll'], [1.7, 'hop'], [2.3, 'land'], [2.8, 'step'], [3.1, 'step'], [3.4, 'step'], [3.7, 'step'], [4.2, 'flop']]
