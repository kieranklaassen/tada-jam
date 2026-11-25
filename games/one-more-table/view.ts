import { CAST, DISHES, ownerOf, type DishId, type GuestId } from './cast'
import { FACES, cutCast, shoulders, type Cast } from './figures'
import { INK, TAU, type Make, type Pen, type Sprite } from './folk'
import { handPose, type Guidance, type HandPose } from './guidance'
import { cutTiles } from './house'
import { APRON, FLOOR, SPOTS, TOP } from './layout'
import { ACTS, BREATH, EATS, TAKES, relish, still, type Pose } from './moves'
import { fit } from './stage'
import { ACT_S, EAT_S, type Table } from './table'

// Draws the table, the house and everyone. Every picture was painted once; a
// frame moves them and draws the faces. It changes nothing in the game.

const { sin, cos, abs, min, max, PI, hypot } = Math
const clamp = (t: number) => min(1, max(0, t))

export class View {
  private readonly cast: Cast
  private readonly tiles: Sprite[]
  private readonly pose: Pose = still({} as Pose)
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private g!: Pen
  private table!: Table
  private t = 0
  private look = { x: 0, y: 0 }
  private readonly blink = new Map<GuestId, number>()
  drawn = 0

  constructor(make: Make, fine = 2) {
    const share = fine / 2
    this.cast = cutCast(make, share)
    this.tiles = cutTiles(make, share)
  }

  dispose(): void {
    const all = [...this.tiles, ...Object.values(this.cast.bodies), ...Object.values(this.cast.heads), ...Object.values(this.cast.feet), ...Object.values(this.cast.full), ...Object.values(this.cast.empty), ...Object.values(this.cast.things), ...this.cast.flowers]
    for (const s of all) s.image.width = s.image.height = 0
  }

  bare(g: Pen, width: number, height: number, dpr: number): void {
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.fillStyle = INK.blue
    g.fillRect(0, 0, width * dpr, height * dpr)
  }

  private stamp(s: Sprite, x = 0, y = 0): void {
    this.g.drawImage(s.image, s.x + x, s.y + y, s.w, s.h)
    this.drawn++
  }
  private fill(color: string): void {
    this.g.fillStyle = color
    this.g.fill()
    this.drawn++
  }
  private line(color: string, w: number): void {
    const g = this.g
    g.strokeStyle = color
    g.lineWidth = w
    g.stroke()
    this.drawn++
  }

  draw(g: Pen, table: Table, width: number, height: number, dpr: number, guidance: Guidance | null, step: number): number {
    this.g = g
    this.table = table
    this.t += step
    this.drawn = 0
    const f = fit(width, height), { z, x } = table.cam
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    g.fillStyle = INK.blue
    g.fillRect(0, 0, width * dpr, height * dpr)
    const k = dpr * f.scale * z, ox = dpr * (f.x + x * f.scale), oy = dpr * (f.y + FLOOR * f.scale)
    if (oy < height * dpr) { g.fillStyle = '#4a2a20'; g.fillRect(0, oy + 100 * k, width * dpr, height * dpr) }
    g.setTransform(k, 0, 0, k, ox, oy)
    g.lineCap = g.lineJoin = 'round'
    // Only the tiles that can be seen; the overlap hides the seam between two.
    const left = -ox / k, right = (width * dpr - ox) / k, up = -oy / k, down = (height * dpr - oy) / k
    for (const s of this.tiles) if (s.x < right && s.x + s.w > left && s.y < down && s.y + s.h > up) { g.drawImage(s.image, s.x, s.y, s.w + 0.6, s.h + 0.6); this.drawn++ }
    this.lookAt()
    this.scenery()
    this.people()
    this.lights(guidance?.glow ?? 0)
    this.handles()
    this.marks()
    this.guide(guidance)
    return this.drawn
  }

  // --- The house -------------------------------------------------------------

  private wag(key: keyof typeof SPOTS): number {
    const t = this.table.wag.get(key)
    return t === undefined ? 0 : sin(clamp(t / 1.6) * PI)
  }

  private at(x: number, y: number, turn: number, sx: number, sy: number, draw: () => void): void {
    const g = this.g
    g.save()
    g.translate(x, y)
    g.rotate(turn)
    g.scale(sx, sy)
    draw()
    g.restore()
  }

  private scenery(): void {
    const { things } = this.cast, t = this.t
    const c = this.wag('cuckoo')
    if (c > 0.02) this.at(SPOTS.cuckoo.x + c * 34, SPOTS.cuckoo.y - 2 + sin(t * 18) * 3 * c, -0.1 * c, 0.6 + c * 0.6, 0.6 + c * 0.6, () => this.stamp(things.cuckoo))
    const cat = this.wag('cat')
    this.at(SPOTS.cat.x + 20, -402, sin(t * 1.4) * 0.4 + cat * sin(t * 12) * 0.5, 1, 1, () => this.stamp(things.catTail))
    this.at(SPOTS.cat.x, -404, 0, 1 + cat * 0.1 - sin(t * 1.1) * 0.012, 1 - cat * 0.2 * sin(t * 9) + sin(t * 1.1) * 0.02, () => this.stamp(things.catBody))
    const pot = this.wag('pot')
    for (let i = 0; i < 3; i++) { const u = (t * 0.35 + i / 3) % 1; this.g.globalAlpha = sin(u * PI) * 0.75; this.at(SPOTS.pot.x - 30 + i * 30, -452 - u * 80, sin(u * 6 + i) * 0.4, 0.6 + u, 0.6 + u, () => this.stamp(things.steam)) }
    this.g.globalAlpha = 1
    this.at(SPOTS.pot.x, -396, pot * sin(t * 24) * 0.08, 1, 1, () => this.stamp(things.pot))
    const cu = this.wag('curtain')
    for (const s of [-1, 1]) this.at(SPOTS.curtain.x + 8 + s * 56, -500, s * (0.06 + sin(t * 1.2 + s) * 0.05) - cu * s * 0.6, 1, 1 - cu * 0.1, () => this.stamp(things.curtain))
    const hen = this.wag('hen')
    this.at(SPOTS.hen.x, -1072 - abs(sin(t * 11)) * 26 * hen, sin(t * 0.7) > 0.8 ? 0.35 : 0, 1 + hen * 0.14, 1, () => this.stamp(things.hen))
    const sun = this.wag('sun')
    this.at(SPOTS.sun.x, SPOTS.sun.y, t * 0.06 + sun * 1.6, 1 + sun * 0.14, 1 + sun * 0.14, () => this.stamp(things.sunRays))
    this.at(SPOTS.sun.x, SPOTS.sun.y, sun * sin(t * 8) * 0.2, 1, 1, () => this.stamp(things.sun))
    const tree = this.wag('tree')
    if (tree > 0 || this.table.cam.z < 0.8) for (let i = 0; i < 5; i++) { const u = (t * (0.08 + tree * 0.5) + i * 0.21) % 1; this.at(1540 + i * 74 + sin(u * 8 + i) * 30, -520 + u * 500, u * 9 + i, 1.3, 1.3, () => this.stamp(things.leaf)) }
    const mice = this.wag('mice')
    for (let i = 0; i < 3; i++) this.at(662 + i * 38, 200 - abs(sin(t * 10 + i)) * 16 * mice, sin(t * 2 + i * 2) * 0.08, 0.85, 0.85 + sin(t * 2.4 + i) * 0.03, () => this.stamp(things.mouse))
  }

  /** The glow: rays painted round the one thing that helps now. */
  private lights(glow: number): void {
    const table = this.table
    const knob = table.lit || table.waiter !== null || table.state.fed
    const a = max(glow, table.lit ? 1 : 0, table.introHand() ? 0.8 : 0)
    if (a <= 0.01) return
    const at = knob ? table.knobAt() : table.bellAt(), r = table.radius
    this.g.globalAlpha = a * (0.8 + 0.2 * sin(this.t * 5))
    this.at(at.x, at.y, this.t * 0.4, (r / 58) * (1.02 + 0.06 * sin(this.t * 5)), (r / 58) * (1.02 + 0.06 * sin(this.t * 5)), () => this.stamp(this.cast.glow))
    this.g.globalAlpha = 1
  }

  // --- Everyone --------------------------------------------------------------

  private lookAt(): void {
    const t = this.table
    if (t.finger) { this.look.x = t.finger.x; this.look.y = t.finger.y; return }
    const w = t.waiter
    if (w && t.waiterT > 0) { const d = t.door(); this.look.x = d.x; this.look.y = TOP - CAST[w].tall; return }
    const p = t.state.fed ? t.knobAt() : t.bellAt()
    this.look.x = p.x
    this.look.y = p.y
  }

  private people(): void {
    const t = this.table
    const waiter = t.waiter
    const carried = t.carry && t.carry.kind !== 'dish' ? t.carry.guest : null
    if (waiter && waiter !== carried && t.waiterT > 0) this.waiting(waiter)
    // Stools, also the one that stands in the gap.
    for (const id of t.state.order) { const p = t.place(id); if (p) this.at(p.x, 0, 0, min(1, p.w / 100), 1, () => this.stamp(this.cast.stool)) }
    if (t.gap > 26) this.at(t.seatsLength + t.gap / 2, 0, 0, min(1, t.gap / 90), 1, () => this.stamp(this.cast.stool))
    for (const p of this.rooms()) this.at(p, 0, 0, 1, 1, () => this.stamp(this.cast.stool))
    // One who acts leans over the next, so it is drawn last.
    const order = t.state.order.filter((id) => id !== carried && !t.bodies[id].fly)
    const acting = (id: GuestId) => (t.bodies[id].act > 0 ? 1 : 0)
    for (const pass of [0, 1]) for (const id of order) if (acting(id) === pass) this.guest(id)
    this.board()
    for (const d of DISHES) {
      const at = t.state.dishes[d].at
      if (t.state.order.includes(at) && !(t.carry?.kind === 'dish' && t.carry.dish === d) && t.state.dishes[d].on === 'table') this.dish(d)
    }
    for (const d of DISHES) if (t.state.dishes[d].on === 'head' && t.state.order.includes(t.state.dishes[d].at) && !(t.carry?.kind === 'dish' && t.carry.dish === d)) this.dish(d)
    for (const id of t.state.order) if (id !== carried && t.bodies[id].fly) this.guest(id)
    for (const id of t.leaving) this.guest(id)
  }

  private rooms(): number[] {
    const out: number[] = []
    let x = 0
    const s = this.table.squeeze
    for (const p of this.table.row) { if (p.id === null && p.w > 60) out.push(x + (p.w * s) / 2); x += p.w * s }
    return out
  }

  private waiting(id: GuestId): void {
    const t = this.table, d = t.door(), dish = CAST[id].brings
    const walk = clamp(t.waiterT) < 1 ? abs(sin(t.waiterT * 13)) * 16 : 0
    // On its toes as the gap opens, crouched to jump.
    const up = clamp(t.ext * 1.2)
    const bump = t.bump >= 0 ? (t.bump < 0.22 ? -sin((t.bump / 0.22) * PI * 0.5) * 34 : -34 * (1 - clamp((t.bump - 0.22) / 0.4))) : 0
    this.guest(id, d.x + bump, TOP - walk - up * 20 - (t.bump >= 0 ? abs(sin(t.bump * 8)) * 14 : 0), true)
    const p = t.dishHome(dish)
    if (!(t.carry?.kind === 'dish' && t.carry.dish === dish)) this.dish(dish, p.x + bump - up * 14, p.y - walk - 10 - up * 26, 1.06)
  }

  private posed(id: GuestId, standing: boolean): Pose {
    const t = this.table, b = t.bodies[id], p = still(this.pose), br = BREATH[id]
    const s = sin(this.t * br.pace + id.length)
    p.sy += s * br.deep
    p.sx -= s * br.deep * 0.5
    p.lean += sin(this.t * br.pace * 0.43 + id.length * 2) * br.sway
    p.turn += sin(this.t * br.pace * 0.6 + 1) * br.sway
    const next = (d: 1 | -1) => t.state.order[t.state.order.indexOf(id) + d]
    if (!standing) {
      // All lean after the pull, and bulge when they are shut together.
      if (t.ext > 0) { p.lean += t.ext * 0.1; p.eyes = max(p.eyes, t.ext * 0.5) }
      if (t.ext < -0.25) { const k = clamp(-t.ext); p.eyes = k; p.mouth = -1; p.hs += 0.06 * k; p.hy -= 10 * k; p.brow += 8 * k }
      if (t.state.order.includes(id)) for (const d of [-1, 1] as const) { const o = next(d); if (o && t.eaten(o) === 'cheese' && !t.feast) p.lean -= d * 0.1 }
      if (b.act >= 0) ACTS[id](clamp(b.act / ACT_S), p, b.dir, t.place(id)?.w ?? 100)
      if (b.took >= 0 && b.takes) {
        const side = t.state.order.indexOf(b.takes) < t.state.order.indexOf(id) ? -1 : 1, u = clamp(b.took / ACT_S)
        TAKES[id](u, p, side, 100)
        // The bear lifts and the aunt squeezes whoever they have hold of.
        if (b.takes === 'bear') p.y -= 46 * sin(u * PI)
        if (b.takes === 'moose') { p.y -= 60 * sin(u * PI); p.lean += 0.14 * sin(u * 16) }
        if (b.takes === 'aunt') { p.sx -= 0.22 * sin(u * PI); p.sy += 0.18 * sin(u * PI) }
        if (b.takes === 'uncle' || b.takes === 'goose') p.lean -= side * 0.22 * sin(u * PI)
      }
      const e = t.feast?.eats.find((x) => x.who === id)
      if (t.feast) {
        if (t.feast.t < (e?.at ?? 0)) { p.armR += 0.6 * clamp(t.feast.t * 3); p.eyes = 0.5 }
        if (e && t.feast.t >= e.at && t.feast.t < e.at + EAT_S) {
          const u = clamp((t.feast.t - e.at) / EAT_S)
          if (e.dish) {
            if (e.from !== id) p.lean += (t.state.order.indexOf(e.from) > t.state.order.indexOf(id) ? 1 : -1) * 0.35 * sin(u * PI)
            EATS[e.dish](u, p, 1, 100)
            relish(id, e.dish, u, p)
          } else { p.mouth = -1; p.armR += 0.4 * abs(sin(u * PI * 3)) }
        } else if (e && t.feast.t >= e.at + EAT_S) { p.hy -= 4; p.lean -= 0.06; p.eyes = -0.5 }
      } else if (t.state.fed && t.ext > -0.2) { p.eyes = min(p.eyes, -0.6); p.lean += 0.05; p.turn += 0.1 }
      const eaten = t.eaten(id)
      if (eaten === 'jelly') { p.sx += 0.05 * sin(this.t * 9 + id.length); p.sy -= 0.05 * sin(this.t * 9 + id.length) }
      if (eaten === 'pancakes') p.sy += 0.16
      if (eaten === 'pumpkin') { p.sy -= 0.04 }
      if (b.hiccup >= 0) { p.y -= 22 * sin((b.hiccup / 0.5) * PI); p.mouth = 1; p.eyes = 1 }
    } else {
      // Waiting: it bends to the row and its eyes go from the row to the knob.
      p.lean -= 0.07 + 0.03 * sin(this.t * 2.1)
      p.eyes = 0.3
      p.armL += 0.12
      p.armR += 0.12
      p.y -= max(0, sin(this.t * 3.3)) * 7
      if (t.feast) p.mouth = sin(this.t * 7) > 0 ? 0 : -1
    }
    const f = b.fly
    if (f && f.t > f.delay) { p.armL += 0.9; p.armR += 0.9; p.mouth = 1; p.eyes = 1; p.turn += 0.2 * sin(f.t * 20); p.lean += f.spin * clamp((f.t - f.delay) / f.lasts) * TAU }
    if (t.carry && t.carry.kind !== 'dish' && t.carry.guest === id) { p.lean += 0.14 * sin(this.t * 11); p.armL += 0.6 + 0.3 * sin(this.t * 14); p.armR += 0.6 - 0.3 * sin(this.t * 14); p.eyes = 1; p.mouth = 1 }
    // A blink of its own now and then.
    const at = this.blink.get(id) ?? 2 + (id.length % 5)
    if (this.t > at + 0.14) this.blink.set(id, this.t + 2.4 + ((this.t * 7.3 + id.length * 1.7) % 3))
    else if (this.t > at && p.eyes > -0.5) p.eyes = -1
    return p
  }

  private guest(id: GuestId, x?: number, y?: number, standing = false): void {
    const t = this.table, g = this.g, b = t.bodies[id], face = FACES[id], base = t.base(id), full = CAST[id].width
    const p = this.posed(id, standing), loose = standing || b.fly !== null || (t.carry !== null && t.carry.kind !== 'dish' && t.carry.guest === id)
    const bx = (x ?? base.x) + p.x, by = (y ?? base.y) + p.y
    const narrow = base.w / full
    const sx = narrow * p.sx * (2 - b.sq), sy = (1 + (1 - narrow) * 0.42) * p.sy * b.sq
    const tall = CAST[id].tall, spin = abs(p.lean) > 1.2
    this.at(bx, by, 0, 1, 1, () => {
      g.save()
      // Feet dangle under the table or stand on the floor.
      if (!loose || standing) { this.at(0, -by + (standing ? y! - TOP : 0) * 0.6, 0, min(1, narrow * 1.1), 1, () => this.stamp(this.cast.feet[id])) }
      if (spin) g.translate(0, -tall * 0.5)
      g.rotate(p.lean)
      if (spin) g.translate(0, tall * 0.5)
      g.scale(sx, sy)
      if (loose && !standing) this.at(0, 84 + 84, sin(this.t * 13) * 0.16, 1, 1, () => this.stamp(this.cast.feet[id]))
      const top = shoulders(id), hx = p.hx, hy = -tall + p.hy
      if (id === 'uncle') this.at(full * 0.26, top - 34, 0.1, 1 + p.hs * 0.06, 1, () => this.stamp(this.cast.tuba))
      // The neck goes behind the collar.
      g.beginPath()
      g.moveTo(-face.neckW / 2, top + 24)
      g.quadraticCurveTo(hx * 0.3 - face.neckW / 2, (top + hy) / 2, hx - face.neckW * 0.42, hy + face.r * 0.4)
      g.lineTo(hx + face.neckW * 0.42, hy + face.r * 0.4)
      g.quadraticCurveTo(hx * 0.3 + face.neckW / 2, (top + hy) / 2, face.neckW / 2, top + 24)
      this.fill(face.neck)
      this.stamp(this.cast.bodies[id])
      const eaten = standing ? null : t.eaten(id)
      if (eaten === 'pumpkin') { g.beginPath(); g.ellipse(0, 24, full * 0.3, 52, 0, 0, TAU); this.fill(INK.pumpkin) }
      this.arms(id, p, top, full)
      g.save()
      g.translate(hx, hy)
      g.rotate(p.turn)
      // Heads squash less than bodies do, or a face is lost.
      const hs = p.hs
      g.scale(hs, hs)
      this.head(id, p, eaten, standing, bx)
      g.restore()
      g.restore()
    })
  }

  private arms(id: GuestId, p: Pose, top: number, full: number): void {
    const g = this.g, face = FACES[id]
    for (const s of [-1, 1] as const) {
      const up = s < 0 ? p.armL : p.armR
      const x0 = s * full * 0.27, y0 = top + 34
      const far = p.reach !== 0 && Math.sign(p.reach) === s ? abs(p.reach) : 0
      const x1 = s * (full * 0.3 + far * 56 + up * 6), y1 = -22 + (y0 - 70 + 22) * min(1.1, up) - far * 46
      const mx = (x0 + x1) / 2 + s * (18 - up * 4), my = (y0 + y1) / 2 + 16 * (1 - up)
      const w = id === 'bear' || id === 'moose' || id === 'cow' ? 15 : 11
      g.beginPath()
      g.moveTo(x0, y0)
      g.quadraticCurveTo(mx, my, x1, y1)
      this.line(face.arm, w * 2)
      g.beginPath()
      g.arc(x1, y1 - 2, w * 0.98, 0, TAU)
      this.fill(face.hand)
    }
  }

  private head(id: GuestId, p: Pose, eaten: DishId | null, standing: boolean, bx: number): void {
    const g = this.g, f = FACES[id], t = this.table
    if (id === 'dog') for (const s of [-1, 1]) this.at(s * 34, -26, -s * (0.25 + p.top * 0.5 * s + 0.06 * sin(this.t * 3)), s, 1, () => this.stamp(this.cast.ear))
    if (id === 'granny' && p.top > 0) g.translate(0, -p.top * 4)
    this.at(0, 0, id === 'moose' ? p.top * 0.06 : 0, 1, 1 + (id === 'aunt' || id === 'tall' || id === 'granny' ? p.top * 0.06 : 0), () => this.stamp(this.cast.heads[id]))
    if (eaten === 'rolls') { g.beginPath(); g.arc(-f.r * 0.72, f.r * 0.36, f.r * 0.36, 0, TAU); g.arc(f.r * 0.72, f.r * 0.36, f.r * 0.36, 0, TAU); this.fill(f.beak ? INK.cream : f.hand === INK.skin ? '#f3b493' : f.neck) }
    if (eaten === 'gravy') { g.beginPath(); g.ellipse(0, f.mouthY + 8, f.mouthW * 1.3, f.r * 0.36, 0, 0, TAU); this.fill('#5c3018') }
    if (eaten === 'pie') { g.beginPath(); g.ellipse(0, 4, f.r * 0.98, f.r * 0.96, 0, 0, TAU); this.fill(INK.ochre); g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * 16 - 12, -f.r * 0.6); g.lineTo(i * 16 + 10, f.r * 0.66) } this.line(INK.brown, 6) }
    this.mouth(f, p, eaten, id)
    if (id === 'uncle' && eaten !== 'pie') this.at(0, 22, p.top, 1, 1, () => this.stamp(this.cast.moustache))
    // Eyes on what matters.
    const shut = p.eyes <= -0.8 && eaten !== 'pie'
    const ex = f.eyes, ey = f.eyeY, r = f.eyeR * (1 + max(0, p.eyes) * 0.3)
    if (shut) {
      g.beginPath()
      for (const s of [-1, 1]) { g.moveTo(s * ex - r, ey); g.quadraticCurveTo(s * ex, ey + r * 1.1, s * ex + r, ey) }
      this.line(INK.night, 4.5)
    } else {
      g.beginPath()
      for (const s of [-1, 1]) { g.moveTo(s * ex + r, ey); g.ellipse(s * ex, ey, r, r * 1.12, 0, 0, TAU) }
      this.fill('#fffdf4')
      let lx = this.look.x, ly = this.look.y
      if (standing) { const to = sin(this.t * 1.5) > 0.2 ? t.knobAt() : { x: t.length * 0.5, y: TOP - 100 }; lx = to.x; ly = to.y }
      if (t.bodies[id].act > 0) lx = bx + t.bodies[id].dir * 300
      const dx = lx - bx, dy = ly - (TOP - CAST[id].tall), d = hypot(dx, dy) || 1, m = min(1, d / 160) * r * 0.42
      g.beginPath()
      for (const s of [-1, 1]) { const cross = id === 'cow' && p.eyes > 1 ? -s * 5 : 0; g.moveTo(s * ex + r * 0.58, ey); g.arc(s * ex + (dx / d) * m + cross, ey + (dy / d) * m, r * 0.56, 0, TAU) }
      this.fill(INK.night)
      if (p.eyes < -0.15) {
        g.beginPath()
        for (const s of [-1, 1]) { g.moveTo(s * ex - r * 1.1, ey - r * 0.1); g.ellipse(s * ex, ey - r * 0.1, r * 1.12, r * 1.2, 0, PI, TAU) }
        this.fill(f.hand === INK.skin ? '#e3ab80' : f.neck)
      }
    }
    if (f.brow && eaten !== 'pie') {
      g.beginPath()
      for (const s of [-1, 1]) { const y = ey - r * 1.5 - 3 - p.brow * 0.7; g.moveTo(s * (ex - r), y - (p.brow < 0 ? p.brow * -0.6 : 0)); g.quadraticCurveTo(s * ex, y - 6, s * (ex + r * 1.05), y + 3) }
      this.line(f.brow, 6)
    }
    if (eaten === 'mash') { g.beginPath(); g.arc(0, f.r * 0.12, f.r * 0.27, 0, TAU); g.arc(3, f.r * -0.06, f.r * 0.17, 0, TAU); this.fill('#fff8e2') }
    if (eaten === 'milk') { g.beginPath(); for (const s of [-1, 1]) { g.moveTo(0, f.mouthY - 12); g.quadraticCurveTo(s * 16, f.mouthY - 22, s * 27, f.mouthY - 4); g.quadraticCurveTo(s * 14, f.mouthY - 6, 0, f.mouthY - 6) } this.fill('#ffffff') }
    if (eaten === 'corn') { g.beginPath(); for (let i = 0; i < 8; i++) { const s = i % 2 ? 1 : -1, u = (this.t * 0.6 + i / 8) % 1; const x = s * (f.r + 4 + u * 12), y = -6 - sin(u * PI) * 30 + u * 34; g.moveTo(x + 4, y); g.arc(x, y, 4.5, 0, TAU) } this.fill(INK.gold) }
    if (eaten === 'honey') { g.beginPath(); for (const k of [-1, 0, 1]) { g.moveTo(k * 12, f.mouthY); g.lineTo(k * 12, f.mouthY + 16 + 8 * sin(this.t * 1.3 + k * 2)) } this.line('#f2b631', 8) }
    if (eaten === 'sausages') { g.beginPath(); g.moveTo(f.mouthW * 0.6, f.mouthY); g.quadraticCurveTo(f.mouthW + 14, f.mouthY + 4, f.mouthW + 10 + 4 * sin(this.t * 3), f.mouthY + 26); this.line(INK.brown, 11) }
    if (eaten === 'cheese') { g.beginPath(); for (const s of [-1, 1]) { g.moveTo(s * f.r * 0.5, -f.r * 1.3); g.bezierCurveTo(s * f.r * 0.5 + 12, -f.r * 1.5, s * f.r * 0.5 - 12, -f.r * 1.6, s * f.r * 0.5 + sin(this.t * 3) * 6, -f.r * 1.86) } this.line(INK.gold, 5) }
    if (eaten === 'jelly') { g.beginPath(); g.ellipse(f.mouthW * 0.8, f.mouthY + 8, 9, 7, 0, 0, TAU); this.fill('#dc4a52') }
    if (eaten === 'pancakes') { g.beginPath(); g.moveTo(-f.mouthW * 0.7, f.mouthY); g.lineTo(-f.mouthW * 0.8, f.mouthY + 18); this.line('#7a4a1e', 6) }
  }

  private mouth(f: (typeof FACES)[GuestId], p: Pose, eaten: DishId | null, id: GuestId): void {
    const g = this.g, y = f.mouthY, w = f.mouthW
    if (f.beak) {
      const open = max(0, p.mouth) * 14
      g.beginPath()
      g.moveTo(-w * 0.7, y - 4); g.quadraticCurveTo(0, y - 14 - open * 0.4, w * 0.7, y - 4); g.quadraticCurveTo(0, y + 8 - open * 0.3, -w * 0.7, y - 4)
      this.fill(INK.pumpkin)
      g.beginPath()
      g.moveTo(-w * 0.5, y + 1 + open); g.quadraticCurveTo(0, y - 2 + open * 0.6, w * 0.5, y + 1 + open); g.quadraticCurveTo(0, y + 15 + open, -w * 0.5, y + 1 + open)
      this.fill('#c96c22')
      return
    }
    if (eaten === 'pie' && p.mouth < 0.5) return
    g.beginPath()
    if (p.mouth > 0.15) { g.ellipse(0, y, w * (0.55 + 0.3 * p.mouth), w * (0.15 + 0.62 * min(1.2, p.mouth)), 0, 0, TAU); this.fill('#7a1f2a'); return }
    if (p.mouth <= -1.5) { g.moveTo(-w, y); g.bezierCurveTo(-w * 0.4, y - 12, w * 0.2, y + 14, w, y - 2); this.line('#7a1f2a', 5); return }
    if (p.mouth < -0.3) { g.arc(0, y, 7, 0, TAU); this.fill(id === 'cow' || id === 'moose' ? '#8a3a3a' : INK.scarlet); return }
    g.moveTo(-w, y - 4); g.quadraticCurveTo(0, y + w * 0.75, w, y - 4)
    this.line('#7a1f2a', 5)
  }

  // --- The table --------------------------------------------------------------

  private board(): void {
    const t = this.table, g = this.g, L = t.length, dip = t.dip(L)
    const n = max(4, t.state.order.length * 3), y0 = TOP - 16
    const yAt = (u: number) => dip * u
    // Bellows: pleats, light and dark in turn, that widen as it is pulled.
    for (const part of [0, 1]) {
      g.beginPath()
      for (let i = part; i < n; i += 2) {
        const a = i / n, b = (i + 1) / n, xa = a * L, xb = b * L, m = (xa + xb) / 2
        const deep = 14 * clamp(1 - t.ext * 0.5)
        g.moveTo(xa, TOP + 4 + yAt(a)); g.lineTo(xb, TOP + 4 + yAt(b)); g.lineTo(xb, APRON - 6 + yAt(b)); g.lineTo(m, APRON + deep * 0.5 + yAt((a + b) / 2)); g.lineTo(xa, APRON - 6 + yAt(a))
      }
      this.fill(part ? '#b03426' : '#e8dfc4')
    }
    g.beginPath()
    for (let i = 1; i < n; i += 2) { const u = (i + 0.5) / n, x = u * L; g.moveTo(x, TOP + 24 + yAt(u)); g.quadraticCurveTo(x + 6, TOP + 44 + yAt(u), x, APRON - 22 + yAt(u)); g.quadraticCurveTo(x - 6, TOP + 44 + yAt(u), x, TOP + 24 + yAt(u)) }
    this.fill(INK.gold)
    // The top: one long loaded stroke, dotted.
    g.beginPath()
    g.moveTo(-14, y0 + 2); g.quadraticCurveTo(L / 2, y0 + dip / 2 - 4, L + 14, y0 + dip); g.lineTo(L + 16, TOP + 10 + dip); g.quadraticCurveTo(L / 2, TOP + 13 + dip / 2, -16, TOP + 10)
    g.closePath()
    this.fill(INK.ochre)
    g.beginPath()
    g.moveTo(-10, y0 + 3); g.quadraticCurveTo(L / 2, y0 + dip / 2 - 2, L + 10, y0 + 2 + dip); g.lineTo(L + 10, y0 + 9 + dip); g.quadraticCurveTo(L / 2, y0 + 8 + dip / 2, -10, y0 + 10)
    this.fill(INK.gold)
    g.beginPath()
    for (let i = 0; i <= n; i++) { const u = i / n; g.moveTo(u * L + 4, TOP + 2 + yAt(u)); g.arc(u * L, TOP + 2 + yAt(u), 4, 0, TAU) }
    this.fill(INK.cream)
    // Legs at both ends, each on a wheel.
    for (const [x, d] of [[2, 0], [L - 2, dip]] as const) {
      g.beginPath(); g.moveTo(x - 10, TOP + 8 + d); g.quadraticCurveTo(x - 24, -80, x - 7, -20); g.lineTo(x + 7, -20); g.quadraticCurveTo(x + 24, -80, x + 10, TOP + 8 + d)
      this.fill(INK.blue)
      g.beginPath(); g.arc(x, -13, 14, 0, TAU); this.fill(INK.gold)
      g.beginPath(); const a = L * 0.06; g.moveTo(x - cos(a) * 11, -13 - sin(a) * 11); g.lineTo(x + cos(a) * 11, -13 + sin(a) * 11); this.line(INK.bark, 4)
    }
  }

  private dish(d: DishId, x?: number, y?: number, s = 1): void {
    const t = this.table, at = t.dishPos(d), j = t.jiggle.get(d)
    const owner = t.state.dishes[d].at, seated = t.state.order.includes(owner)
    const narrow = seated && t.state.dishes[d].on === 'table' && x === undefined ? clamp((t.place(owner)?.w ?? 110) / 104 + 0.12) : 1
    const k = j === undefined ? 0 : sin(j * 24) * (1 - j)
    const loose = d === 'jelly' ? 2.4 : d === 'mash' || d === 'pancakes' ? 1.3 : 0.7
    const idle = d === 'jelly' ? sin(this.t * 4.2) * 0.025 : 0
    const worn = t.state.dishes[d].on === 'head' && seated
    const turn = k * 0.07 * loose + t.tilt * 0.12 + idle
    const flip = worn && !t.state.dishes[d].full && x === undefined
    this.at(x ?? at.x, (y ?? at.y) + (flip ? -40 : 0), turn + (worn ? sin(this.t * 2) * 0.05 : 0), s * narrow * (1 + k * 0.05 * loose), s * (flip ? -1 : 1) * (1 - k * 0.09 * loose), () => this.stamp(t.isFull(d) ? this.cast.full[d] : this.cast.empty[d]))
    if (t.isFull(d) && (d === 'pie' || d === 'corn' || d === 'mash')) { const u = (this.t * 0.5 + ownerOf(d).length * 0.2) % 1; this.g.globalAlpha = sin(u * PI) * 0.4; this.at((x ?? at.x) + sin(u * 7) * 6, (y ?? at.y) - 64 - u * 40, 0, 0.5, 0.6, () => this.stamp(this.cast.things.steam)); this.g.globalAlpha = 1 }
  }

  private handles(): void {
    const t = this.table, g = this.g, r = t.radius, k = t.knobAt(), b = t.bellAt(), L = t.length, dip = t.dip(L)
    // The knob, on its short arm from the end of the table.
    g.beginPath(); g.moveTo(L - 4, TOP + 14 + dip); g.quadraticCurveTo(L + r * 0.3, TOP + 10 + dip, k.x, k.y)
    this.line(INK.ochre, 22)
    const press = t.knobPress * 0.1, stretch = clamp(abs(t.ext)) * 0.06
    this.at(k.x, k.y, t.length * 0.006, (r / 56) * (1 + press), (r / 56) * (1 - press + stretch), () => this.stamp(this.cast.knob))
    // The bell hangs from a crook at the other end.
    const hook = b.y - r * 1.02
    g.beginPath(); g.moveTo(2, TOP + 8); g.lineTo(2, hook); g.quadraticCurveTo(2, hook - r * 0.6, b.x * 0.5, hook - r * 0.6); g.quadraticCurveTo(b.x, hook - r * 0.6, b.x, hook)
    this.line(INK.ochre, 13)
    this.at(b.x, hook, t.bell, r / 56, r / 56, () => this.stamp(this.cast.bell))
    const c = t.carry
    if (c) {
      if (c.kind === 'dish') this.dish(c.dish, c.x, c.y + 30, 1.14)
      else { this.guest(c.guest); const dish = CAST[c.guest].brings; if (c.kind === 'waiter') this.dish(dish, c.x - 10, c.y + CAST[c.guest].tall * 0.6, 1) }
    }
  }

  private marks(): void {
    for (const m of this.table.marks) {
      const u = m.t / 2.4, grow = min(1, m.t * 6) * (1 + 0.2 * sin(min(1, m.t * 4) * PI))
      this.g.globalAlpha = 1 - u * u
      this.at(m.x, m.y, m.kind + u * 0.3, (grow * 1) / max(0.7, this.table.cam.z), grow / max(0.7, this.table.cam.z), () => this.stamp(this.cast.flowers[m.kind]))
    }
    this.g.globalAlpha = 1
  }

  private guide(guidance: Guidance | null): void {
    const t = this.table, z = t.cam.z, show = t.introHand()
    const put = (x: number, y: number, press: number, a: number) => {
      this.g.globalAlpha = a
      this.at(x, y, -0.2, (1.16 - press * 0.14) / z, (1.16 - press * 0.14) / z, () => this.stamp(this.cast.hand))
      this.g.globalAlpha = 1
    }
    if (show) {
      const k = t.knobAt()
      if (show.show > 0.01) put(k.x - 6, k.y - (1 - show.press) * 26, show.press, show.show)
      return
    }
    if (!guidance || guidance.demo === null) return
    const m = t.toShow(), w = this.hand
    handPose(guidance.demo, m.kind === 'drag', w)
    const at = { x: (m.x + m.dx * w.travel - t.cam.x) / z, y: (m.y - FLOOR) / z }
    put(at.x - 6, at.y - (1 - w.press) * 24, w.press, w.opacity)
  }
}

