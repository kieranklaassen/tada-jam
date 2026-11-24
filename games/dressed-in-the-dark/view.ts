import { BUILD, drawFigure } from './figures'
import { drawPiece } from './garments'
import { handPose, type Guidance, type HandPose } from './guidance'
import { moveFor } from './guide'
import { C, Pen } from './lacquer'
import { BED, KNOB, LAMP, LANE, MOON, WARDROBE, bedX, pegOf } from './layout'
import { NATURE, poseOf } from './motion'
import { BEDS } from './night'
import { QUILTS, bedPanel, paintRoom } from './scenery'
import { Sprites, steps } from './sprites'
import { DREAM, PRINT, type Person, type Show } from './show'
import { fit, type Fit } from './stage'
import { GARMENTS, LOVES, SLEEPERS, type Garment } from './things'

// Draws the show. The two rooms are painted once for each size; everything that moves is live.

const clamp = (u: number) => Math.max(0, Math.min(1, u))
/** Where the room's own light ends and the dark begins, under the window. */
const EDGE = { from: 306, to: 384 }

export class RoomView {
  scales = true
  /** Fills, strokes and stamps of the last frame. */
  drawn = 0
  private readonly ctx: CanvasRenderingContext2D
  private readonly pen: Pen
  private readonly sprites: Sprites
  private readonly rooms: [HTMLCanvasElement | null, HTMLCanvasElement | null] = [null, null]
  private by: Fit = { scale: 1, x: 0, y: 0 }
  private ratio = 1
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.pen = new Pen(this.ctx)
    this.sprites = new Sprites(this.ctx, this.pen)
  }

  resize(width: number, height: number, ratio: number): void {
    this.ratio = ratio
    this.by = fit(width, height)
    this.sprites.clear(Math.max(0.01, ratio * this.by.scale))
    for (const lit of [false, true]) {
      const canvas = this.rooms[lit ? 1 : 0] ?? document.createElement('canvas')
      canvas.width = this.canvas.width; canvas.height = this.canvas.height
      const ctx = canvas.getContext('2d')!
      const { scale, x, y } = this.by
      ctx.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * x, ratio * y)
      if (scale > 0) paintRoom(new Pen(ctx), lit, -x / scale, -y / scale, (width - x) / scale, (height - y) / scale)
      this.rooms[lit ? 1 : 0] = canvas
    }
  }

  draw(show: Show | null, guidance: Guidance | null): void {
    const { ctx, pen } = this, { scale, x, y } = this.by
    const light = show ? show.light : 1
    pen.count = 0
    this.sprites.stamps = 0
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    let stamps = 1
    ctx.drawImage(this.rooms[light > 0.5 ? 1 : 0]!, 0, 0)
    const other = light > 0.5 ? 1 - light : light
    if (other > 0.01) {
      ctx.globalAlpha = light > 0.5 ? other : light
      ctx.drawImage(this.rooms[light > 0.5 ? 0 : 1]!, 0, 0)
      ctx.globalAlpha = 1
      stamps += 1
    }
    ctx.setTransform(this.ratio * scale, 0, 0, this.ratio * scale, this.ratio * x, this.ratio * y)
    ctx.lineJoin = 'round'
    if (show) {
      const glow = guidance?.glow ?? 0
      this.moon(show)
      this.wardrobe(show, light, glow)
      this.line(show, light, glow)
      this.lamp(show, light, glow)
      for (const ring of show.rings) {
        const u = (show.t - ring.born) / 0.7
        if (u >= 1) continue
        ctx.globalAlpha = 1 - u
        ctx.beginPath(); ctx.ellipse(ring.x, ring.y, 8 + u * 40, (8 + u * 40) * 0.6, 0, 0, 7); pen.edge(3)
        ctx.globalAlpha = 1
      }
      const people = SLEEPERS.map((sleeper) => show.people[sleeper])
      for (let bed = 0; bed < BEDS; bed++) this.bed(show, bed, people.find((person) => person.bed === bed) ?? null, light)
      const lit = light > 0.5
      this.sprites.stamp(`panels ${lit}`, { left: 30, top: BED.foot - 40, width: 1120, height: 70 }, 0, (to) => { for (let bed = 0; bed < BEDS; bed++) bedPanel(to, bedX(bed), lit) })
      for (let bed = 0; bed < BEDS; bed++) this.overQuilt(show, bed, people.find((person) => person.bed === bed) ?? null, light)
      this.prints(show, light)
      for (const person of [...people].sort((a, b) => a.depth - b.depth)) if (person.bed === null && light > 0.02) this.onFloor(show, person, light)
      for (const person of people) this.dream(show, person, light)
      this.inAir(show, light)
      if (guidance && guidance.demo !== null) this.ghost(show, guidance.demo, guidance.demoIndex, light)
    }
    this.drawn = pen.count + stamps + this.sprites.stamps
  }

  private moon(show: Show): void {
    const { pen } = this, u = clamp((show.t - show.moonAt) / 1.2), wink = u < 1
    const bob = wink ? Math.sin(u * Math.PI * 4) * (1 - u) * 6 : 0
    pen.dark = 0
    const x = MOON.x, y = MOON.y + bob
    const swell = 1 + Math.sin(show.t * 0.8) * 0.02
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.scale(swell, swell)
    this.sprites.stamp('moon', { left: -46, top: -46, width: 92, height: 92 }, 0, (to) => { to.ell(0, 0, MOON.r, MOON.r, '#ffe9ad', 3); for (const side of [-1, 1]) to.ell(side * 25, 8, 6, 4, '#f4b56a', 0) })
    this.ctx.restore()
    const at = show.finger, lx = at ? Math.max(-1, Math.min(1, (at.x - x) / 300)) : 0, ly = at ? Math.max(-1, Math.min(1, (at.y - y) / 300)) : 0.4
    for (const side of [-1, 1]) {
      const ex = x + side * 14 + lx * 5, ey = y - 6 + ly * 4
      if (wink && side > 0 && u < 0.6) pen.wire([ex - 6, ey, ex, ey + 4, ex + 6, ey], 2.6, C.brown)
      else pen.ell(ex, ey, 3.6, show.t % 4.3 < 0.12 ? 0.6 : 4.6, C.brown, 0)
    }
    pen.wire([x - 11 + lx * 4, y + 12 + ly * 2, x + lx * 4, y + 20 + ly * 2, x + 11 + lx * 4, y + 12 + ly * 2], 2.6, C.brown)
  }

  private wardrobe(show: Show, light: number, glow: number): void {
    const creak = clamp((show.t - show.wardrobeAt) / 0.8), open = show.door + (creak < 1 ? Math.sin(creak * Math.PI * 4) * (1 - creak) * 0.05 : 0)
    const asking = show.night.open ? 0 : steps(glow, 0.25), tug = show.night.open ? 0 : steps(Math.sin(show.t * 2.4) * 4 * (1 + glow), 2), swing = steps(Math.max(0, open), 0.02), lit = light > 0.5
    this.sprites.stamp(`wardrobe ${lit} ${swing} ${asking} ${tug}`, { left: 0, top: 30, width: 172, height: 330 }, 0, (to) => this.doors(to, lit, swing, asking, tug))
  }

  private doors(pen: Pen, lit: boolean, open: number, glow: number, tug: number): void {
    const ctx = pen.ctx, { x, y, width, height } = WARDROBE
    const wood = lit ? '#3a0b0d' : '#17141f'
    pen.box(x + 12, y + 14, width - 24, height - 30, 6, '#050408', 2)
    if (open > 0.1) {
      // A rail with four empty hangers.
      pen.wire([x + 22, y + 50, x + width - 22, y + 50], 2.6)
      for (let i = 0; i < 4; i++) { const hx = x + 46 + i * 20, s = i % 2; pen.wire([hx, y + 50, hx + s, y + 62, hx + s, y + 70], 1.8); pen.poly([hx + s, y + 70, hx - 16 + s, y + 92, hx + 16 + s, y + 92], '#050408', 1.6) }
    }
    const ajar = 0.11
    for (const side of [-1, 1]) {
      const swing = side > 0 ? Math.max(ajar, open * 0.62) : open * 0.62, w = (width / 2 - 14) * (1 - swing), hinge = side < 0 ? x + 12 : x + width - 12
      ctx.beginPath()
      ctx.moveTo(hinge, y + 14); ctx.lineTo(hinge - side * w, y + 14 + swing * 26)
      ctx.lineTo(hinge - side * w, y + height - 16 + swing * 18); ctx.lineTo(hinge, y + height - 16); ctx.closePath()
      pen.paint(wood, 2.4 + glow * 3)
      const mx = hinge - side * w / 2
      pen.ell(mx, y + 110, w * 0.3, 54, wood, 1.8)
      pen.wire([mx, y + 148, mx - w * 0.16, y + 112, mx, y + 78, mx + w * 0.16, y + 112, mx, y + 148], 1.6)
      pen.ell(mx, y + 240, w * 0.3, 40, wood, 1.8)
      pen.ell(hinge - side * (w - 8), y + 176, 5, 7, C.gold, 1.4)
    }
    if (open < 0.5) {
      // The nightgown's sleeve, caught in the door, and asking.
      pen.blob([x + width / 2 - 1, y + 118, x + width / 2 + 10, y + 122, x + width / 2 + 30 + tug, y + 192, x + width / 2 - 4 + tug, y + 204, x + width / 2 - 4, y + 150], C.ivory, 2)
      pen.ell(x + width / 2 + 12 + tug, y + 200, 19, 8, C.rose, 1.8)
    }
  }

  private line(show: Show, light: number, glow: number): void {
    const { pen, ctx } = this
    for (const garment of GARMENTS) {
      const piece = show.pieces[garment], peg = pegOf(garment)
      if (piece.at !== 'peg' && piece.at !== 'lifted') continue
      const u = clamp((show.t - piece.touchedAt) / 0.7), home = clamp((show.t - piece.since) / 0.5)
      const sway = Math.sin(show.t * 1.3 + peg.x) * 0.03 + (u < 1 ? Math.sin(u * Math.PI * 6) * 0.22 * (1 - u) : 0) + piece.vx * 0.0006
      ctx.save()
      ctx.translate(piece.x, piece.y)
      ctx.rotate(Math.max(-0.7, Math.min(0.7, sway)))
      const lifted = piece.at === 'lifted', breathe = 1 + (lifted ? 0.1 : 0) + glow * 0.04 * Math.sin(show.t * 5) + (u < 1 ? Math.sin(u * Math.PI) * 0.1 : 0) + (home < 1 ? Math.sin(home * Math.PI * 2) * 0.05 : 0)
      ctx.scale(breathe, breathe)
      if (lifted) { ctx.globalAlpha = 0.5 + Math.sin(show.t * 5) * 0.15; pen.ell(0, 0, 54, 58, '#fff3c4', 0); ctx.globalAlpha = 1 }
      this.piece(garment, light > 0.5 ? 0 : clamp((piece.y - EDGE.from) / (EDGE.to - EDGE.from)), true)
      ctx.restore()
    }
    pen.dark = 0
  }

  private lamp(show: Show, light: number, glow: number): void {
    const { pen, ctx } = this
    pen.dark = 0
    ctx.save()
    ctx.translate(LAMP.x, -20)
    ctx.rotate(show.swing * 0.12)
    ctx.translate(0, LAMP.y + 20)
    if (light > 0.02) {
      ctx.save()
      ctx.globalAlpha = light * 0.5
      this.sprites.stamp('halo', { left: -200, top: -170, width: 400, height: 400 }, 0, (to) => {
        const halo = to.ctx.createRadialGradient(0, 30, 10, 0, 30, 200)
        halo.addColorStop(0, '#ffe7a3'); halo.addColorStop(1, 'rgba(255,200,90,0)')
        to.ctx.fillStyle = halo
        to.ctx.fillRect(-200, -170, 400, 400)
      })
      ctx.restore()
    }
    const lit = light > 0.5
    this.sprites.stamp(`lamp ${lit}`, { left: -72, top: -120, width: 144, height: 180 }, 0, (to) => {
    to.wire([0, -116, 0, -44], 4)
    to.ell(0, 36, 17, 19, lit ? '#fff6d2' : '#24202e', 2.4)
    to.blob([-12, -46, -30, -30, -66, 34, -54, 40, 54, 40, 66, 34, 30, -30, 12, -46], lit ? C.saffron : '#1b1724', 3)
    for (const side of [-1, 0, 1]) to.wire([side * 6, -40, side * 20, -10, side * 34, 34], 1.8)
    for (let i = -3; i <= 3; i++) to.ell(i * 16, 42, 5, 5, lit ? C.scarlet : '#1b1724', 1.6)
    })
    ctx.restore()
    // The cord and its handle: gold in any light, and it asks when the room wants it.
    const want = show.allDressed && !show.lit && !show.scene ? 1 : 0
    const sway = Math.sin(show.t * 2.6) * (3 + want * 14 + glow * 5) + show.swing * 10, down = show.knob * 34, kx = KNOB.x + sway, ky = KNOB.y + down
    pen.wire([LAMP.x + show.swing * 10, LAMP.y + 34, LAMP.x + sway * 0.3, (LAMP.y + ky) / 2 + 20, kx, ky - 24], 3.4)
    ctx.globalAlpha = 0.25 + 0.35 * Math.max(glow, want * (0.5 + 0.5 * Math.sin(show.t * 4)))
    pen.ell(kx, ky + 4, 46, 50, '#ffdf8a', 0)
    ctx.globalAlpha = 1
    ctx.save()
    ctx.translate(kx, ky)
    this.sprites.stamp('handle', { left: -30, top: -34, width: 60, height: 84 }, 0, (to) => {
      to.ell(0, -22, 9, 8, C.gold, 2)
      to.blob([-12, -18, -24, 10, -18, 34, 18, 34, 24, 10, 12, -18], C.gold, 2.4)
      for (const i of [-1, 0, 1]) to.wire([i * 5, -10, i * 11, 10, i * 9, 28], 1.8, C.brown)
      for (let i = -2; i <= 2; i++) to.wire([i * 7, 30, i * 8, 46], 2.4, C.gold)
    })
    ctx.restore()
  }

  // ---- beds ----------------------------------------------------------------

  private bed(show: Show, bed: number, person: Person | null, light: number): void {
    const { ctx } = this
    if (person && person.up > 0.01) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(-400, -200, 2000, 200 + BED.foot - 34)
      ctx.clip()
      ctx.translate(person.x, BED.foot - 40 + (1 - person.up) * (1 - person.up) * 380)
      this.figure(show, person)
      ctx.restore()
    }
    const down = person ? person.up : 0
    this.quilt(show, bed, person, light, down)
  }

  private figure(show: Show, person: Person): void {
    const { sleeper } = person
    this.pen.dark = 0
    const pose = poseOf(sleeper, person.act, show.t - person.actAt, show.t, show.watch(person))
    if (person.act === person.rest && person.part) {
      if (person.part === 'knight') pose.armR = 0.82
      else if (person.part === 'lady') { pose.armR = 0.62 + Math.sin(show.t * 8) * 0.06; pose.tall -= 0.05 }
      else { pose.legL = 0.8; pose.armL = pose.armR = 0.55 }
    }
    const pop = person.show ? clamp((show.t - person.show.at - 0.35) / 1.3) : 0
    drawFigure(this.sprites, sleeper, pose, show.seenOn(sleeper), person.show && pop > 0 && pop < 1 ? { garment: person.show.garment, pop } : null)
  }

  private onFloor(show: Show, person: Person, light: number): void {
    const { ctx } = this
    ctx.save()
    ctx.globalAlpha = clamp(light * 3)
    ctx.translate(person.x, BED.foot - 40 + person.floor * (LANE - BED.foot + 40 + person.depth))
    this.figure(show, person)
    ctx.restore()
  }

  /** How a quilt stands now: its height, its lean to the cord, its shift and its hem. */
  private shape(show: Show, bed: number, person: Person | null, folded: number) {
    let h = 40, lean = 0, shift = 0, hem = 0, wide = 0
    if (person) {
      const { sleeper } = person, nature = NATURE[sleeper]
      const u = clamp((show.t - person.twitchAt) / 0.7), twitch = u < 1 ? nature.twitch(u) : { x: 0, up: 0, lean: 0 }
      const worn = show.seenOn(sleeper).length
      h = 216 + show.breath(sleeper) * nature.rise + twitch.up + worn * 5 + person.bulge * 26 * Math.abs(Math.cos(person.bulge * 9))
      lean = twitch.lean * 90 + person.lean * (14 + Math.sin(show.t * 3 + bed) * 4)
      shift = twitch.x
      hem = person.hem
      wide = person.bulge * 10
      if (show.cold === sleeper) shift += Math.sin(show.t * 46) * 2.6 * (0.5 + 0.5 * Math.sin(show.t * 2.2))
    }
    return { h: h * (1 - folded), lean, shift, hem, wide }
  }

  /** The quilt, equal on every bed. Nothing of what lies under it can be seen. */
  private quilt(show: Show, bed: number, person: Person | null, light: number, folded: number): void {
    // Thrown back over the panel: feet stay in view.
    if (folded > 0.98) return
    const { ctx } = this, { h, lean, shift, hem, wide } = this.shape(show, bed, person, folded), lit = light > 0.5, scales = this.scales
    const fold = steps(hem, 0.125)
    ctx.save()
    ctx.translate(bedX(bed) + shift, BED.foot - 30)
    // One picture stretched and leant to how it stands now.
    ctx.transform(1 + wide / 102, 0, -lean / 240, h / 240, 0, 0)
    this.sprites.stamp(`quilt ${lit ? bed : 'dark'} ${fold} ${scales}`, { left: -108, top: -262, width: 216, height: 276 }, lit ? 0 : 1, (to) => drawQuilt(to, lit ? QUILTS[bed] : '#1b1826', lit, fold, scales))
    ctx.restore()
  }

  /** What is seen in front of the bed: a bare foot, and a snore. */
  private overQuilt(show: Show, bed: number, person: Person | null, light: number): void {
    if (!person || person.up > 0.1 || light > 0.3) return
    const { h, lean, shift } = this.shape(show, bed, person, person.up), x = bedX(bed) + shift
    if (show.night.worn[person.sleeper].length === 0) this.bareFoot(show, person, x + 54, BED.foot - 66)
    this.puff(show, person, x + lean, BED.foot - 30 - h, light)
  }

  /** A sock-less foot out in the cold, the same on everyone. */
  private bareFoot(show: Show, person: Person, x: number, y: number): void {
    const { pen, ctx } = this, cold = show.cold === person.sleeper
    const curl = cold ? Math.sin(show.t * 9) * 0.5 : Math.sin(show.t * 0.9 + x) * 0.2
    const u = clamp((show.t - person.twitchAt) / 0.5)
    ctx.save()
    ctx.translate(x + (cold ? Math.sin(show.t * 40) * 1.6 : 0), y)
    ctx.rotate(0.14 + (u < 1 ? Math.sin(u * Math.PI * 3) * 0.2 : 0))
    const toes = steps(curl, 0.25)
    this.sprites.stamp(`bare ${cold} ${toes}`, { left: -36, top: -44, width: 72, height: 80 }, cold ? 0.3 : 0.65, (to) => {
      // The sole of it, seen from the end of the bed.
      to.blob([-17, 24, -22, -2, -20, -24, 20, -24, 22, -2, 17, 24, 0, 30], C.blush, cold ? 3 : 2.4)
      to.ell(0, 12, 9, 7, C.rose, 0)
      to.ell(0, -12, 13, 7, C.rose, 0)
      for (let i = -2; i <= 2; i++) to.ell(i * 10 + toes * 3, -30 + Math.abs(i + 0.5) * 2.6, i === -2 ? 7.4 : 5.6, 7, C.blush, 2)
    })
    ctx.restore()
    if (cold) {
      const s = show.t * 2 % 1
      ctx.globalAlpha = 1 - s
      for (const i of [0, 1]) pen.wire([x - 52 - s * 8, y - 24 + i * 22, x - 46 - s * 8, y - 30 + i * 22, x - 38 - s * 8, y - 20 + i * 22, x - 30 - s * 8, y - 26 + i * 22], 2.6, C.sky)
      ctx.globalAlpha = 1
    }
  }

  /** A snore to be seen: rings of gold from the top of the quilt. */
  private puff(show: Show, person: Person, x: number, y: number, light: number): void {
    const u = (show.t - person.puffAt) / 1.4
    if (u < 0 || u >= 1 || light > 0.3) return
    const { ctx, pen } = this
    for (let i = 0; i < 2; i++) {
      const v = clamp(u * 1.4 - i * 0.16)
      if (v <= 0 || v >= 1) continue
      ctx.globalAlpha = (1 - v) * 0.9
      ctx.beginPath(); ctx.arc(x + 16 + i * 9 + v * 10, y - 8 - v * 40 - i * 8, 4 + i * 3 + v * 3, 0, 7)
      pen.edge(2.4, C.gold)
    }
    ctx.globalAlpha = 1
  }

  /** What it dreams of: the one thing it loves. */
  private dream(show: Show, person: Person, light: number): void {
    const u = (show.t - person.dreamAt) / DREAM
    if (u < 0 || u >= 1 || person.bed === null) return
    const { ctx } = this, k = Math.min(1, u * 6) * Math.min(1, (1 - u) * 5)
    const x = person.x, y = light > 0.5 ? 322 - BUILD[person.sleeper].hatY * 0.1 : 440 - u * 12
    ctx.save()
    ctx.globalAlpha = clamp(k)
    ctx.translate(x, y)
    ctx.scale(0.6 + k * 0.4, 0.6 + k * 0.4)
    const loved = LOVES[person.sleeper], lit = light > 0.5
    this.sprites.stamp(`dream ${loved} ${lit}`, { left: -76, top: -76, width: 154, height: 178 }, 0, (to) => {
      to.ell(-16, 74, 7, 6, C.ivory, 2)
      to.ell(-4, 92, 4, 4, C.ivory, 2)
      to.blob([-62, 20, -66, -34, -30, -64, 10, -62, 56, -50, 70, -6, 58, 44, 10, 64, -36, 58], lit ? C.ivory : '#3a4a86', 2.6)
      to.ctx.scale(0.78, 0.78)
      drawPiece(to, loved, 0, 0)
    })
    ctx.restore()
  }

  private prints(show: Show, light: number): void {
    const { ctx } = this
    for (const print of show.prints) {
      const age = (show.t - print.born) / PRINT
      if (age >= 1) continue
      ctx.save()
      ctx.globalAlpha = Math.min(1, (1 - age) * 1.6) * (1 - light * 0.6)
      ctx.translate(print.x, print.y)
      ctx.scale(print.way, 1)
      this.sprites.stamp(`print ${print.roll ? 'roll' : print.sleeper}`, { left: -34, top: -18, width: 62, height: 36 }, 0, (to) => {
      if (print.roll) {
        for (const i of [-5, 5]) to.wire([-30 , i, 18 , i], 3, C.cream)
      } else {
                if (print.sleeper === 'goat') { to.ell(0, -4, 8, 4, C.cream, 0); to.ell(0, 4, 8, 4, C.cream, 0) }
        else if (print.sleeper === 'hippo') { to.ell(0, 0, 17, 12, C.cream, 0); for (const i of [-1, 0, 1]) to.ell(18, i * 9, 6, 5, C.cream, 0) }
        else if (print.sleeper === 'hen') for (const i of [-0.6, 0, 0.6]) to.wire([-6, 0, 14 * Math.cos(i), 14 * Math.sin(i)], 3, C.cream)
        else if (print.sleeper === 'croc') { to.ell(0, 0, 13, 8, C.cream, 0); for (const i of [-1, 0, 1]) to.wire([12, i * 6, 22, i * 9], 3, C.cream) }
        else { to.ell(2, -5, 10, 4.5, C.cream, 0, -0.2); to.ell(2, 5, 10, 4.5, C.cream, 0, 0.2) }
      }
      })
      ctx.restore()
    }
  }

  /** What is carried, or on its way: in its own colours by the window, and a gold outline over the dark. */
  private inAir(show: Show, light: number): void {
    const { ctx, pen } = this
    for (const garment of GARMENTS) {
      const piece = show.pieces[garment]
      if (piece.at !== 'hand' && piece.at !== 'going') continue
      ctx.save()
      ctx.translate(piece.x, piece.y)
      ctx.rotate(Math.max(-0.6, Math.min(0.6, piece.vx * 0.0007)))
      const k = piece.at === 'hand' ? 1.16 : 1 - clamp((show.t - piece.since - 0.2) / 0.2) * 0.4
      ctx.scale(k, k)
      if (piece.at === 'hand') {
        ctx.globalAlpha = 0.16
        pen.ell(0, 0, 62, 66, '#ffdf8a', 0)
        ctx.globalAlpha = 1
      }
      this.piece(garment, (1 - light) * clamp((piece.y - EDGE.from) / (EDGE.to - EDGE.from)) * 0.75, false)
      ctx.restore()
    }
    pen.dark = 0
  }

  private ghost(show: Show, progress: number, index: number, light: number): void {
    const { ctx, pen } = this, move = moveFor(show, index)
    handPose(progress, move.to !== null, this.hand)
    const { travel, press, opacity } = this.hand
    const x = move.to ? move.from.x + (move.to.x - move.from.x) * travel : move.from.x
    const y = (move.to ? move.from.y + (move.to.y - move.from.y) * travel : move.from.y)
    pen.dark = 0
    ctx.save()
    ctx.globalAlpha = opacity * 0.9
    if (move.carries && press > 0.2) {
      ctx.save()
      ctx.translate(x, y)
      ctx.globalAlpha = opacity * 0.7
      this.piece(move.carries, (1 - light) * clamp((y - EDGE.from) / (EDGE.to - EDGE.from)) * 0.8, false)
      ctx.restore()
    }
    ctx.translate(x + 8, y + 10 - press * 4 + (move.to === null && move.from.y === KNOB.y ? press * 26 : 0))
    ctx.rotate(-0.18)
    const s = 1.15 - press * 0.12
    ctx.scale(s, s)
    this.sprites.stamp('ghost', { left: -36, top: -20, width: 100, height: 112 }, 0, (to) => {
      for (let i = 3; i >= 1; i--) to.box(-10 + i * 15, 14 + i * 3, 16, 46, 8, C.white, 2.6)
      to.box(-14, 34, 64, 54, 22, C.white, 2.6)
      to.box(-12, -14, 18, 74, 9, C.white, 2.6)
      to.ctx.beginPath(); to.ctx.ellipse(-20, 52, 10, 22, -0.5, 0, 7); to.paint(C.white, 2.6)
    })
    ctx.restore()
  }

  /** A garment by itself, in its own colours or sunk into the dark. */
  private piece(garment: Garment, dark: number, hooked: boolean): void {
    const sunk = steps(dark, 0.25)
    this.sprites.stamp(`piece ${garment} ${sunk} ${hooked}`, { left: -56, top: -68, width: 124, height: 140 }, sunk, (to) => drawPiece(to, garment, 0, 0, hooked))
  }
}

/** The quilt's picture, 240 high over its own foot. */
function drawQuilt(pen: Pen, colour: string, lit: boolean, hem: number, scales: boolean): void {
  const ctx = pen.ctx, half = BED.width / 2, h = 240
  ctx.beginPath()
  ctx.moveTo(-half, 0)
  ctx.bezierCurveTo(-half - 2, -h * 0.7, -half * 0.74, -h, 0, -h)
  ctx.bezierCurveTo(half * 0.74, -h, half + 2, -h * 0.7, half, 0)
  ctx.quadraticCurveTo(half * 0.4, 8, 0, 4 - hem * 74)
  ctx.quadraticCurveTo(-half * 0.4, 8, -half, 0)
  pen.paint(colour, 3)
  if (scales) {
    ctx.save()
    ctx.clip()
    ctx.beginPath()
    // Fish scales in gold.
    for (let row = 0; row < 7; row++) {
      const ry = -h + 22 + (h - 16) * row / 7
      for (let i = -4; i <= 4; i++) {
        const cx = i * 32 + (row % 2) * 16
        ctx.moveTo(cx - 16, ry); ctx.quadraticCurveTo(cx - 14, ry + 22, cx, ry + 25); ctx.quadraticCurveTo(cx + 14, ry + 22, cx + 16, ry)
      }
    }
    ctx.globalAlpha = lit ? 0.75 : 0.45
    pen.edge(1.6)
    ctx.restore()
  }
  // The turned-down top.
  ctx.beginPath()
  ctx.moveTo(-half * 0.68, -h * 0.86)
  ctx.quadraticCurveTo(0, -h - 14, half * 0.68, -h * 0.86)
  ctx.quadraticCurveTo(0, -h * 0.8, -half * 0.68, -h * 0.86)
  pen.paint(lit ? C.ivory : '#2a2534', 2.4)
}
