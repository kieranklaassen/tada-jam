import { Wardrobe, EYES, JAWS, NECK, RUMP, TRUNK } from './animals'
import { NODES } from './cloth'
import type { Look, Watcher } from './crowd'
import { BEAR, GOOSE, animalOf, partOf, type Pose, type Who } from './ends'
import { Folk } from './folk'
import { handPose, type Guidance, type HandPose } from './guidance'
import { BODY, FARMER, GROUND, HANG, LINE, LOFT, PEGS, PIG, POST, PUDDLE, TREE, pegAt } from './layout'
import { paintHem, paintPage } from './page'
import { demosFor } from './demos'
import { SIT_DROP, type Play } from './play'
import { BITS, LINE_POST } from './scenery'
import { fit, type Fit } from './stage'
import { Album, CLOTHS, canvas, printOf, type Ctx, type ClothName, type Picture } from './stitch'
import type { Tier } from './config'

// Draws the yard as it stands. Everything sewn is a picture stamped from the
// album; only the stretching cloth, the trunk and the line are drawn live.

const clamp = (t: number): number => Math.max(0, Math.min(1, t))
const ease = (t: number): number => { const c = clamp(t); return c * c * (3 - 2 * c) }

export class YardView {
  fit: Fit = { scale: 0, x: 0, y: 0 }
  /** Draws of the last frame: pictures stamped, and live strokes and fills. */
  readonly tally = { stamps: 0, pen: 0 }
  private readonly ctx: Ctx
  private ratio = 1
  private album = new Album(1)
  private wardrobe = new Wardrobe(this.album)
  private folk = new Folk(this.album)
  private page: HTMLCanvasElement | null = null
  private readonly look: Look = { doubt: 0, like: 0, lift: 0, tilt: 0, squash: 0, part: 0, mouth: 0, blink: 0 }
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  private readonly prints = new Map<ClothName, CanvasPattern | string>()
  private now = 0

  constructor(surface: HTMLCanvasElement) {
    this.ctx = surface.getContext('2d')!
  }

  resize(width: number, height: number, ratio: number): void {
    this.fit = fit(width, height)
    this.ratio = ratio
    this.album = new Album(Math.max(0.5, this.fit.scale * ratio))
    this.wardrobe = new Wardrobe(this.album)
    this.folk = new Folk(this.album)
    this.prints.clear()
    const x0 = -this.fit.x / this.fit.scale, y0 = -this.fit.y / this.fit.scale, x1 = x0 + width / this.fit.scale, y1 = y0 + height / this.fit.scale
    const paint = (draw: (ctx: Ctx) => void): HTMLCanvasElement => {
      const made = canvas(Math.round(width * ratio), Math.round(height * ratio))
      const ctx = made.getContext('2d')!
      this.place(ctx)
      draw(ctx)
      return made
    }
    this.page = paint((ctx) => { paintPage(ctx, x0, y0, x1, y1); this.still(ctx); paintHem(ctx, x0, y0, x1, y1) })
  }

  /** Sews every piece there is, so none is sewn in the middle of play. */
  warm(): void {
    for (let end = 0; end < 8; end++) {
      this.wardrobe.barrel(end); this.wardrobe.hung(end)
      for (const who of [GOOSE, BEAR] as const) this.wardrobe.leg(end, who)
      if (partOf(end) === 'head') { this.wardrobe.head(end); if (JAWS[end]) this.wardrobe.jaw(end) } else this.wardrobe.tail(end)
    }
    this.wardrobe.ear(); this.wardrobe.pupil()
    for (const who of [GOOSE, BEAR] as const) { this.wardrobe.bare(who); this.wardrobe.peep(who, false); this.wardrobe.peep(who, true) }
    this.folk.all()
    for (const name of ['horse', 'hen', 'elephant', 'croc', 'egg'] as const) this.print(name)
  }

  private still(ctx: Ctx): void {
    for (const [picture, x, y] of [[this.folk.fence(), 0, 0], [this.folk.farmpost(), LINE_POST.farm, GROUND], ...BITS.map((bit) => [this.folk.bit(bit.key), bit.x, bit.y] as const), [this.folk.post(), POST.x, POST.y], [this.folk.pigMud(), PIG.x, PIG.y + 14]] as const) ctx.drawImage(picture.image, x + picture.x, y + picture.y, picture.w, picture.h)
  }

  private place(ctx: Ctx): void {
    const k = this.ratio * this.fit.scale
    ctx.setTransform(k, 0, 0, k, this.ratio * this.fit.x, this.ratio * this.fit.y)
  }

  private stamp(picture: Picture): void {
    this.tally.stamps++
    this.ctx.drawImage(picture.image, picture.x, picture.y, picture.w, picture.h)
  }
  private at(picture: Picture, x: number, y: number, turn = 0, sx = 1, sy = sx): void {
    const { ctx } = this
    ctx.save()
    ctx.translate(x, y)
    if (turn) ctx.rotate(turn)
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy)
    this.stamp(picture)
    ctx.restore()
  }
  private print(name: ClothName): CanvasPattern | string {
    let made = this.prints.get(name)
    if (!made) { made = printOf(this.ctx, name); this.prints.set(name, made) }
    return made
  }
  private fill(): void { this.tally.pen++; this.ctx.fill() }
  private stroke(): void { this.tally.pen++; this.ctx.stroke() }

  draw(play: Play | null, guidance: Guidance | null, tier: Tier): void {
    const { ctx } = this
    this.tally.stamps = this.tally.pen = 0
    if (!this.page || this.fit.scale === 0) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    this.tally.stamps++
    ctx.drawImage(this.page, 0, 0)
    if (!play) return
    this.place(ctx)
    this.now = play.now
    const glow = guidance?.glow ?? 0
    for (const bit of BITS) { const t = play.bits.get(bit.key) ?? 0; if (t > 0) this.at(this.folk.bit(bit.key), bit.x, bit.y, Math.sin(t * 22) * t * 0.14, 1.05 + Math.sin(t * Math.PI) * 0.12) }
    this.cow(play)
    this.line(play, glow)
    // What stands still is in the page, and is stamped only while it rattles.
    if (play.rattle.fence > 0) this.at(this.folk.fence(), 0, Math.sin(this.now * 40) * play.rattle.fence * 3)
    this.at(this.folk.tree(), TREE.x, TREE.y + 100, Math.sin(this.now * 22) * play.shake * 0.06 + Math.sin(this.now * 0.9) * 0.008)
    this.hen(play)
    if (play.rattle.farmpost > 0) this.at(this.folk.farmpost(), LINE_POST.farm, GROUND, Math.sin(this.now * 30) * play.rattle.farmpost * 0.06)
    this.farmer(play)
    this.ground(play, glow)
    this.beast(play, tier, glow)
    this.door(play)
    for (const flight of play.flights) this.flight(play, flight)
    for (const one of play.carried) {
      this.at(this.wardrobe.hung(one.end), one.at.x, one.at.y, Math.max(-0.5, Math.min(0.5, one.vx * 0.012)), 1.35)
    }
    this.pig(play)
    this.puffs(play)
    this.ghost(play, guidance)
  }

  // --- The line --------------------------------------------------------------------

  private line(play: Play, glow: number): void {
    const { ctx } = this
    ctx.beginPath()
    ctx.moveTo(LINE.left - 14, LINE.y - 8)
    for (let peg = 0; peg < PEGS; peg++) { const at = pegAt(peg); ctx.lineTo(at.x, at.y + Math.sin(play.swing + peg) * play.swing * 6) }
    ctx.lineTo(LINE.right + 14, LINE.y - 8)
    ctx.strokeStyle = '#8a6b52'
    ctx.lineWidth = 8
    ctx.lineJoin = 'round'
    this.stroke()
    ctx.strokeStyle = '#fff6e4'
    ctx.lineWidth = 4.5
    ctx.setLineDash([9, 5])
    this.stroke()
    ctx.setLineDash([])
    for (let peg = 0; peg < PEGS; peg++) {
      const at = pegAt(peg), end = play.pegs[peg]
      const y = at.y + Math.sin(play.swing + peg) * play.swing * 6
      const away = end === null || play.carried.some((one) => one.peg === peg) || play.flights.some((one) => one.peg === peg)
      if (!away) {
        const wind = Math.sin(this.now * 1.3 + peg * 1.7) * 0.035 + play.swing * 0.5 + Math.sin(this.now * 26) * play.flutter[peg] * 0.22 + Math.sin(this.now * 5 + peg) * glow * 0.06
        ctx.save()
        ctx.translate(at.x, y)
        ctx.rotate(wind)
        this.at(this.wardrobe.hung(end), 0, HANG, 0, 1 + play.flutter[peg] * 0.08)
        ctx.restore()
      }
    }
    // The eight poppers, in one pass.
    ctx.beginPath()
    for (let peg = 0; peg < PEGS; peg++) { const at = pegAt(peg), y = at.y + Math.sin(play.swing + peg) * play.swing * 6; ctx.moveTo(at.x + 9, y); ctx.arc(at.x, y, 9, 0, Math.PI * 2) }
    ctx.fillStyle = '#d7dde0'
    this.fill()
    ctx.strokeStyle = '#6f7b82'
    ctx.lineWidth = 3
    this.stroke()
  }

  private flight(play: Play, flight: Play['flights'][number]): void {
    if (flight.wait > 0 && !flight.shown) return
    const t = ease(flight.t)
    const half = flight.who === null ? null : play.halves[flight.who]
    const hook = flight.peg >= 0 ? pegAt(flight.peg) : null
    const to = half ? { x: half.x, y: GROUND - half.y + BODY.y } : { x: hook!.x, y: hook!.y + HANG }
    const x = flight.from.x + (to.x - flight.from.x) * t, y = flight.from.y + (to.y - flight.from.y) * t - Math.sin(t * Math.PI) * 46
    const big = half ? 1 + t * 1.4 : 2.2 - t * 1.2
    this.at(this.wardrobe.hung(flight.end), x, y, Math.sin(flight.t * 14) * 0.22 * (1 - t), big * (1 + Math.sin(flight.t * 30) * 0.05), big)
  }

  // --- Those who watch ------------------------------------------------------------------

  private pupils(play: Play, x: number, y: number, left: { x: number; y: number }, right: { x: number; y: number }, reach: number, size: number, shut: boolean): void {
    if (shut) return
    const [a, b] = play.halves[0].x <= play.halves[1].x ? [0, 1] : [1, 0]
    // Small eyes are drawn both at once.
    const small = size < 0.7
    if (small) this.ctx.beginPath()
    ;[left, right].forEach((eye, i) => {
      const half = play.halves[i === 0 ? a : b]
      const dx = half.x - x, dy = GROUND - half.y - 200 - y, d = Math.hypot(dx, dy) || 1
      const pull = Math.min(1, d / 160)
      const ex = eye.x + (dx / d) * reach * pull, ey = eye.y + (dy / d) * reach * pull
      if (small) { this.ctx.moveTo(ex + size * 10, ey); this.ctx.arc(ex, ey, size * 10, 0, Math.PI * 2) } else this.at(this.wardrobe.pupil(), ex, ey, 0, size)
    })
    if (small) { this.ctx.fillStyle = '#2a1d19'; this.fill() }
  }

  private watch(play: Play, who: Watcher): Look {
    return play.crowd.look(who, this.look)
  }

  private lids(x: number[], y: number, w: number, colour: string): void {
    const { ctx } = this
    ctx.beginPath()
    for (const one of x) { ctx.moveTo(one - w, y); ctx.quadraticCurveTo(one, y + w * 0.7, one + w, y) }
    ctx.strokeStyle = colour
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    this.stroke()
  }

  private cow(play: Play): void {
    const { ctx } = this
    const look = this.watch(play, 'cow')
    const react = play.crowd.states.cow.react
    const gone = ease(play.night - 4) * (play.ended ? 1 : 0) * (react === 'poke' ? 1 - Math.sin(play.crowd.states.cow.t * Math.PI) : 1)
    ctx.save()
    ctx.beginPath()
    ctx.rect(LOFT.x - 112, LOFT.y - 112, 250, 172)
    ctx.clip()
    ctx.translate(LOFT.x + (play.ended ? 0 : Math.max(-10, Math.min(16, (play.halves[0].x - 500) * 0.03))), LOFT.y + 14 - look.lift + gone * 150)
    ctx.rotate(look.tilt)
    ctx.scale(1 + look.squash * 0.5, 1 - look.squash)
    const fold = react === 'blown' || react === 'shake' ? 0.9 : 0
    const flap = Math.sin(this.now * 1.7) > 0.96 ? Math.sin(this.now * 30) * 0.3 : 0
    this.at(this.folk.cowEar(), -50, -30, -0.15 - fold + flap)
    this.at(this.folk.cowEar(), 50, -30, 0.15 + fold, -1, 1)
    const jaw = look.part * 12
    if (look.like > 0.15 || react === 'poke') this.at(this.folk.tongue(), 12, 38 + Math.sin(this.now * 5) * 4, -0.2, 1, Math.max(look.like, react === 'poke' ? 1 : 0))
    this.at(this.folk.cowJaw(), jaw, 36 + look.mouth * 18)
    this.stamp(this.folk.cowHead())
    this.at(this.folk.cowMuzzle(), jaw * 0.3, 26)
    this.pupils(play, LOFT.x, LOFT.y, { x: -24, y: -26 }, { x: 26, y: -26 }, 8, 0.82, look.blink === 1)
    if (look.blink) this.lids([-24, 26], -27, 14, '#4d3d38')
    ctx.restore()
  }

  private hen(play: Play): void {
    const { ctx } = this
    const look = this.watch(play, 'hen')
    const shy = play.halves.some((half) => half.change >= 0) || play.crowd.states.hen.react === 'shake'
    if (play.rattle.henpost > 0) this.at(this.folk.post(), POST.x, POST.y, Math.sin(this.now * 34) * play.rattle.henpost * 0.03)
    const mid = (play.halves[0].x + play.halves[1].x) / 2
    const pace = play.crowd.busy('hen') ? 0 : Math.sin(this.now * 0.9) * 10
    ctx.save()
    ctx.translate(POST.x + pace, POST.y - 2 - look.lift)
    ctx.rotate(look.tilt)
    const face = (mid < POST.x ? 1 : -1) * (shy ? -1 : 1)
    ctx.scale(face * (1 + look.squash * 0.5), 1 - look.squash)
    this.stamp(this.folk.henBody())
    const neck = 14 + Math.max(0, look.part) * 74
    // The neck, as long as her doubt.
    ctx.beginPath()
    ctx.moveTo(-24, -54)
    ctx.lineTo(-26 + Math.sin(this.now * 4) * look.part * 4, -58 - neck)
    ctx.strokeStyle = '#b8a37c'
    ctx.lineWidth = 30
    ctx.lineCap = 'round'
    this.stroke()
    ctx.strokeStyle = this.print('egg')
    ctx.lineWidth = 25
    this.stroke()
    ctx.translate(-26 + Math.sin(this.now * 4) * look.part * 4, -62 - neck)
    this.stamp(this.folk.henFace())
    if (face > 0) this.pupils(play, POST.x, POST.y - 100, { x: -8, y: -14 }, { x: 12, y: -14 }, 4, 0.46, look.blink === 1)
    else { this.at(this.wardrobe.pupil(), -11, -13, 0, 0.46); this.at(this.wardrobe.pupil(), 9, -13, 0, 0.46) }
    ctx.restore()
  }

  private farmer(play: Play): void {
    const { ctx } = this
    const look = this.watch(play, 'farmer')
    const react = play.crowd.states.farmer.react, meet = play.meeting
    ctx.save()
    ctx.translate(FARMER.x, GROUND - look.lift)
    this.stamp(this.folk.farmerLegs())
    ctx.translate(0, -120)
    ctx.rotate(look.tilt)
    ctx.scale(1 - look.squash * 0.5, 1 + look.squash * -0.6)
    ctx.translate(0, 120)
    const pop = meet?.end === 1 ? Math.floor((meet.t - 0.1) / 0.32) + 1 : 0
    this.stamp(meet?.end === 1 ? this.folk.farmerBare() : this.folk.farmerBody())
    if (meet?.end === 1) for (let i = 0; i < 3; i++) if (i >= pop) this.at(this.folk.farmerButton(), 0, -256 + i * 34)
      else { const t = Math.max(0, meet!.t - 0.1 - i * 0.32), back = meet!.seconds - meet!.t < 0.25; if (!back) this.at(this.folk.farmerButton(), -t * 170, -256 + i * 34 - t * 190 + t * t * 260, t * 9) }
    const raise = react === 'wave' || react === 'catch' ? 0.9 + Math.sin(this.now * 12) * (react === 'wave' ? 0.4 : 0) : react === 'throw' ? Math.sin(Math.min(1, play.crowd.states.farmer.t * 2) * Math.PI) * 1.2 : meet?.end === 7 ? Math.sin(meet.t * 18) * 0.4 : Math.sin(this.now * 1.6) * 0.04
    // The far arm, then the head, then the arm with the carrot.
    this.at(this.folk.farmerArm(), 62, -258, -1.25 + (react === 'wave' ? raise : 0), -0.86, 0.86)
    ctx.save()
    ctx.translate(-2, -282)
    ctx.rotate(Math.sin(this.now * 0.7) * 0.02 + (react === 'mumble' ? 0.14 : 0))
    this.stamp(this.folk.farmerHead())
    this.pupils(play, FARMER.x, 320, { x: -24, y: -82 }, { x: 22, y: -82 }, 8, 0.84, look.blink === 1 || meet?.end === 4)
    if (look.blink || meet?.end === 4) this.lids([-24, 22], -84, 14, '#6b3d28')
    if (look.mouth > 0.15) this.at(this.folk.farmerMouth(), 0, -18, 0, 0.7 + look.mouth * 0.4, look.mouth)
    this.at(this.folk.farmerMoustache(), -2, -36 + look.doubt * 7, 0, 1 - look.doubt * 0.25, 1 + look.doubt * 0.8)
    this.at(this.folk.farmerNose(), -6, -56)
    const lent = meet?.end === 2 && meet.t > 0.15 && meet.t < 1.7
    if (!lent) this.at(this.folk.farmerHat(), 0, -118 - look.part, Math.sin(this.now * 13) * Math.min(1, look.part / 40) * 0.14 - 0.04)
    ctx.restore()
    ctx.save()
    ctx.translate(-66, -252)
    ctx.rotate(-raise + (meet?.end === 0 ? Math.sin(meet.t * 14) * 0.1 : 0) - 0.12)
    if (meet?.end === 5) { this.at(this.folk.cup(), -100, -20); if (meet.t > 0.5) this.at(this.folk.food('egg'), -100, -38, 0, 0.8) } else if (play.carrotIn <= 0 || (meet?.end === 3 && meet.t < 0.5) || (meet?.end === 0 && meet.t < 0.7)) this.at(this.folk.food('carrot'), -116, -14, 1.35, 1.25)
    if (meet?.end === 3 && meet.t > 0.5) this.at(this.folk.leaves(), -112, -10)
    this.stamp(this.folk.farmerArm())
    ctx.restore()
    ctx.restore()
    if (lent) {
      const half = play.halves[meet!.who], out = play.out(meet!.who)
      this.at(this.folk.farmerHat(), half.x + out * 94, GROUND - half.y - 346, 0.08, 1.1)
    }
  }

  private pig(play: Play): void {
    const { ctx } = this
    const look = this.watch(play, 'pig')
    const lean = Math.max(-16, Math.min(16, ((play.halves[0].x + play.halves[1].x) / 2 - PIG.x) * 0.05))
    ctx.save()
    ctx.translate(PIG.x + lean * 0.5, PIG.y - look.lift)
    ctx.rotate(look.tilt * 0.4)
    ctx.scale(1 + look.squash * 0.6, 1 - look.squash)
    this.at(this.folk.pigBody(), 30, 4)
    ctx.translate(-56 + lean * 0.6, -10 - look.part * 6)
    ctx.rotate(look.tilt * 0.5 - look.part * 0.08)
    this.stamp(this.folk.pigHead())
    if (look.mouth > 0.1) this.at(this.folk.farmerMouth(), 0, 30, 0, 1.15, look.mouth * 1.1)
    this.at(this.folk.pigSnout(), 0, 10)
    const shut = look.blink === 1 || look.part > 0.7
    this.pupils(play, PIG.x, PIG.y, { x: -20, y: -24 }, { x: 20, y: -24 }, 6, 0.66, shut)
    if (shut) this.lids([-20, 20], -24, 11, '#8c3a4e')
    ctx.restore()
  }

  // --- The ground ----------------------------------------------------------------------

  private ground(play: Play, glow: number): void {
    const { ctx } = this
    if (play.ring > 0) this.at(this.folk.ring(), PUDDLE.x, PUDDLE.y, 0, (1.2 - play.ring) * 0.95, (1.2 - play.ring) * 0.24)
    for (const ripple of play.ripples) this.at(this.folk.ring(), ripple.x, ripple.y, 0, 0.08 + ripple.t * 0.7, (0.08 + ripple.t * 0.7) * 0.6)
    // One pen stroke for all the shadows.
    ctx.beginPath()
    if (!play.ended) for (const half of play.halves) {
      const s = 1 - Math.min(0.6, half.y / 520)
      ctx.moveTo(half.x + 96 * s, GROUND + 6)
      ctx.ellipse(half.x, GROUND + 6, 96 * s, 13 * s, 0, 0, Math.PI * 2)
    }
    for (const food of play.food) if (food.wait <= 0) { ctx.moveTo(food.x + 18, GROUND + 3); ctx.ellipse(food.x, GROUND + 3, 18, 5, 0, 0, Math.PI * 2) }
    ctx.fillStyle = 'rgba(70,42,22,.22)'
    this.fill()
    for (const food of play.food) if (food.wait <= 0) this.at(this.folk.food(food.kind), food.x, GROUND - 20 - food.y - play.hop * 0.4, food.turn, food.held ? 1.3 : 1.12 + glow * 0.1 * Math.sin(this.now * 5))
    for (const food of play.pocketed) this.at(this.folk.food(food.kind), food.x, GROUND - 20 - food.y, food.turn, 1.12)
  }

  private door(play: Play): void {
    if (play.door <= 0.02) return
    const t = play.door < 0.5 ? 2 * play.door * play.door : 1 - (1 - play.door) ** 2 * 2
    this.at(this.folk.door(), 14, GROUND, 0, Math.max(0.05, t) * 1.06, 1)
  }

  // --- The animal -------------------------------------------------------------------------

  private beast(play: Play, tier: Tier, glow: number): void {
    const sunk = play.ended ? ease((play.night - 0.9) / 1.1) : 0
    // The one that is higher up, or the goose, is in front.
    if (play.ended) {
      // It lies down behind the wall: the head that stands out of the door is drawn in.
      this.ctx.save()
      this.ctx.beginPath()
      const edge = 480 - ease((play.night - 0.7) / 1.5) * 254
      this.ctx.rect(12, 0, edge - 12, 720)
      this.ctx.clip()
    }
    const first: Who = play.halves[BEAR].y > play.halves[GOOSE].y + 100 ? GOOSE : BEAR
    this.legs(play, BEAR, sunk)
    this.legs(play, GOOSE, sunk)
    this.ribbon(play, tier, sunk)
    this.half(play, first, sunk, glow)
    this.half(play, first === BEAR ? GOOSE : BEAR, sunk, glow)
    if (play.ended) this.ctx.restore()
    if (play.knot > 0.04 && sunk < 0.5) {
      const x = play.cloth.x[7], y = play.cloth.y[7]
      this.at(this.folk.bow(), x, y, Math.sin(this.now * 3) * 0.04, Math.max(0, play.knot), Math.max(0, play.knot))
    }
  }

  private frame(play: Play, who: Who, sunk: number, draw: () => void): void {
    const { ctx } = this
    const half = play.halves[who], pose: Pose = play.poses[who], out = play.out(who)
    const breath = Math.sin(this.now * (who === GOOSE ? 2.6 : 1.4) + who) * 0.012
    ctx.save()
    ctx.translate(half.x, GROUND - half.y - pose.lift - (half.y < 1 ? play.hop * 0.35 : 0) + half.sat * SIT_DROP)
    // In front of the puddle it strikes the pose that goes with what it wears.
    const vain = half.preen * Math.sin(this.now * (1.4 + half.wear * 0.37)) * (half.wear % 2 ? 0.05 : 0.075)
    ctx.rotate(half.tilt - out * pose.tilt + vain)
    const s = half.squash * 0.8 + pose.squash + breath + half.sat * 0.1 + half.doze * 0.1 + sunk * 0.5
    ctx.scale(out * (1 + s * 0.5), 1 - s)
    draw()
    ctx.restore()
  }

  private legs(play: Play, who: Who, sunk: number): void {
    const half = play.halves[who]
    if (half.change >= 0 || sunk > 0.6) return
    this.frame(play, who, sunk, () => {
      if (half.sat <= 0.5) for (const side of [0, 1]) this.leg(play, who, side)
    })
  }

  private leg(play: Play, who: Who, side: number): void {
    const half = play.halves[who], pose = play.poses[who], out = play.out(who)
    const step = half.walked * 0.034 * out + side * Math.PI
    const air = clamp(half.y / 60)
    const moving = clamp(Math.abs(half.vx) / 90) * (1 - air)
    let turn = -Math.sin(step) * 0.5 * moving, lift = Math.max(0, Math.cos(step)) * 16 * moving
    // In the air the goose kicks and the bear's legs go stiff.
    turn += air * (who === GOOSE ? Math.sin(this.now * 15 + side * 2.4) * 0.55 : (side ? 0.34 : -0.3))
    turn += (-1.3 - side * 0.16 - turn) * half.sat
    lift += (8 - lift) * half.sat
    if (side === 1) turn -= pose.kick * (partOf(half.wear) === 'bottom' ? 1 : 0.8)
    else if (animalOf(half.wear) === 'horse') turn -= pose.kick * 0.8
    if (half.strain > 0.1) turn += Math.sin(this.now * 13 + side * 3) * 0.3 * half.strain
    // Its toes point at what it wants.
    const want = who === GOOSE ? PUDDLE.x : play.foodX ?? half.x + out * 10
    const toe = (want - half.x) * out >= 0 ? 1 : -1
    this.at(this.wardrobe.leg(half.wear, who), (side ? 38 : -34), -128 - lift, turn, toe, 1)
  }

  /** The cloth between, in the two prints, with the zip where they meet. */
  private ribbon(play: Play, tier: Tier, sunk: number): void {
    const { ctx } = this, { cloth } = play
    const top: number[] = [], low: number[] = []
    const ux = cloth.x[NODES - 1] - cloth.x[0], uy = cloth.y[NODES - 1] - cloth.y[0], ul = Math.hypot(ux, uy) || 1
    const down = (y: number): number => GROUND - (GROUND - y) * (1 - sunk * 0.62)
    for (let i = 0; i < NODES; i++) {
      const a = Math.max(0, i - 1), b = Math.min(NODES - 1, i + 1)
      let dx = cloth.x[b] - cloth.x[a], dy = cloth.y[b] - cloth.y[a]
      const l = Math.hypot(dx, dy) || 1
      // Half as it runs and half as the whole of it runs, so a deep sag never folds over itself.
      dx = dx / l + (ux / ul) * 1.1; dy = dy / l + (uy / ul) * 1.1
      const m = Math.hypot(dx, dy) || 1
      dx /= m; dy /= m
      const t = i / (NODES - 1)
      let thick = cloth.thickness(t) * 0.5 * (1 - sunk * 0.4)
      // Where the one is over the other, the cloth comes out of the top and not out at the sides.
      thick *= 1 - 0.55 * (1 - Math.abs(ux / ul)) * Math.abs(2 * t - 1)
      // Drawn together where it is tied.
      if (play.knot > 0) thick *= 1 - 0.72 * Math.min(1, play.knot) * Math.exp(-((i - 7) ** 2) / 5)
      // The back of the animal is the side that is up while the goose leads, and turns under as they cross.
      const nx = dy, ny = -dx
      top.push(cloth.x[i] - nx * thick, down(cloth.y[i] - ny * thick))
      low.push(cloth.x[i] + nx * thick, down(cloth.y[i] + ny * thick))
    }
    const strip = (from: number, to: number): void => {
      ctx.beginPath()
      ctx.moveTo(top[from * 2], top[from * 2 + 1])
      for (let i = from + 1; i <= to; i++) ctx.lineTo(top[i * 2], top[i * 2 + 1])
      ctx.lineTo(low[to * 2], low[to * 2 + 1])
      for (let i = to - 1; i >= from; i--) ctx.lineTo(low[i * 2], low[i * 2 + 1])
      ctx.closePath()
    }
    const names = play.halves.map((half) => animalOf(half.wear) as ClothName)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'butt'
    for (const [from, to, who] of [[0, 7, 0], [7, NODES - 1, 1]]) {
      strip(from, to)
      ctx.fillStyle = this.print(names[who])
      this.fill()
      ctx.strokeStyle = CLOTHS[names[who]].edge
      ctx.lineWidth = 2.8
      this.stroke()
    }
    // Its underside is in shade, and its back catches the light.
    ctx.beginPath()
    for (let i = 0; i < NODES; i++) {
      const x = low[i * 2], y = low[i * 2 + 1]
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    for (let i = NODES - 1; i >= 0; i--) ctx.lineTo(low[i * 2] + (top[i * 2] - low[i * 2]) * 0.24, low[i * 2 + 1] + (top[i * 2 + 1] - low[i * 2 + 1]) * 0.24)
    ctx.fillStyle = 'rgba(60,30,20,.17)'
    this.fill()
    if (tier.sheen) {
      ctx.beginPath()
      for (let i = 0; i < NODES; i++) { const x = top[i * 2] + (low[i * 2] - top[i * 2]) * 0.16, y = top[i * 2 + 1] + (low[i * 2 + 1] - top[i * 2 + 1]) * 0.16; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y) }
      ctx.strokeStyle = 'rgba(255,255,255,.22)'
      ctx.lineWidth = Math.max(5, cloth.thickness(0.5) * 0.12)
      this.stroke()
    }
    if (tier.stitches) {
      // Puckers: many when it is bunched, few and long when it is pulled.
      const slack = clamp(1 - cloth.stretch * 1.6)
      ctx.beginPath()
      for (let i = 1; i < NODES - 1; i++) {
        if (i === 7) continue
        const x = top[i * 2], y = top[i * 2 + 1], u = low[i * 2], v = low[i * 2 + 1], s = i % 2 ? 0.1 : 0.2
        ctx.moveTo(x + (u - x) * s, y + (v - y) * s)
        ctx.quadraticCurveTo((x + u) / 2 + (i % 2 ? 8 : -8) * (0.3 + slack), (y + v) / 2, x + (u - x) * (0.94 - s), y + (v - y) * (0.94 - s))
      }
      ctx.strokeStyle = 'rgba(70,35,20,.26)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      this.stroke()
      ctx.setLineDash([])
    }
    // The zip: a metal tape across, its teeth, and its pull.
    const x = top[14], y = top[15], u = low[14], v = low[15]
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(u, v)
    ctx.strokeStyle = '#5c646a'
    ctx.lineWidth = 15
    this.stroke()
    ctx.strokeStyle = '#e8eef0'
    ctx.lineWidth = 9
    ctx.setLineDash([4.5, 4])
    this.stroke()
    ctx.setLineDash([])
    this.at(this.folk.pull(), x + (u - x) * 0.2, y + (v - y) * 0.2, Math.sin(this.now * 6) * Math.min(0.5, Math.abs(play.halves[0].vx) * 0.001))
  }

  private half(play: Play, who: Who, sunk: number, glow: number): void {
    const { ctx } = this
    const half = play.halves[who], pose = play.poses[who], out = play.out(who), end = half.wear
    if (half.change >= 0 && half.change < 0.62) {
      this.frame(play, who, 0, () => {
        ctx.translate(0, -Math.abs(Math.sin(half.change * 9)) * 12)
        ctx.rotate(Math.sin(half.change * 22) * 0.06)
        this.stamp(this.wardrobe.bare(who))
      })
      return
    }
    this.frame(play, who, sunk, () => {
      const perk = glow * Math.sin(this.now * 4.4 + who * 2) * 0.03
      ctx.save()
      ctx.translate(0, BODY.y)
      ctx.rotate(perk)
      if (partOf(end) === 'bottom') {
        const tail = pose.tail * 0.6 + Math.sin(this.now * (animalOf(end) === 'hen' ? 5 : 1.8) + 1) * 0.1 + pose.head * 0.4
        this.at(this.wardrobe.tail(end), RUMP.x, RUMP.y, tail, half.eat >= 0 ? 1.04 : 1)
      } else if (end === 2) this.neck(play, who)
      this.stamp(this.wardrobe.barrel(end))
      if (partOf(end) === 'head' && end !== 2) this.neck(play, who)
      if (end === 2) this.ear(play, who)
      // Sat down, the feet stick out in front.
      if (half.sat > 0.5) { ctx.save(); ctx.translate(0, -BODY.y + 26); for (const side of [0, 1]) this.leg(play, who, side); ctx.restore() }
      const shut = (play.ended && play.night > 1.2) || half.doze > 0.6 || (Math.sin(this.now * 1.1 + who * 2) > 0.985)
      ctx.save()
      ctx.translate(who === GOOSE ? -8 : -14, 10)
      // The face inside never turns over with the costume.
      if (out < 0) ctx.scale(-1, 1)
      this.stamp(this.wardrobe.peep(who, shut))
      ctx.restore()
      ctx.restore()
      if (who === BEAR && half.eat >= 0 && play.eating) {
        const t = half.eat, up = t < 0.35 ? ease(t / 0.35) : 1, munch = t > 0.35 ? Math.sin(t * 40) * 5 : 0
        const px = -14 + (play.eating.x - half.x) * out * (1 - up), py = -24 - up * 138 + munch
        if (t < 0.85) this.at(this.folk.food(play.eating.kind), px, py - 14, 0, 1 - Math.max(0, t - 0.35) * 1.5)
        this.at(this.folk.paw(), px, py + 6)
      }
    })
  }

  private headTurn(play: Play, who: Who): number {
    const half = play.halves[who], pose = play.poses[who]
    const preen = half.preen * (half.wear === 3 ? Math.sin(this.now * 2.2) * 0.2 : half.wear === 1 ? Math.sin(this.now * 5) * 0.16 + 0.12 : half.wear === 2 ? -0.1 + Math.sin(this.now * 1.4) * 0.12 : Math.sin(this.now * 1.8) * 0.22 - 0.06)
    return -pose.head + Math.sin(this.now * 1.2 + who) * 0.03 + preen + half.tilt * play.out(who) * 0.6 + (play.ended ? 0.35 * ease(play.night - 1) : 0)
  }

  private neck(play: Play, who: Who): void {
    const { ctx } = this
    const half = play.halves[who], pose = play.poses[who], end = half.wear
    const turn = this.headTurn(play, who)
    ctx.save()
    ctx.translate(NECK.x, NECK.y)
    ctx.rotate(turn)
    const jaw = JAWS[end]
    const meet = play.meeting
    const chew = meet && meet.who === who && (end === 0 || end === 3) ? Math.abs(Math.sin(meet.t * 11)) * 0.24 : 0
    if (jaw) this.at(this.wardrobe.jaw(end), jaw.x, jaw.y, 0.06 + pose.jaw * 0.42 + chew + Math.max(0, Math.sin(this.now * 0.8)) * 0.02)
    this.stamp(this.wardrobe.head(end))
    if (end === 2) this.trunk(play, who)
    const eye = EYES[end]
    const other = play.halves[1 - who]
    const dx = (other.x - half.x) * play.out(who), look = Math.max(-1, Math.min(1, dx / 200))
    this.at(this.wardrobe.pupil(), eye.x + (look < 0 ? -3 : 4), eye.y + (half.held !== null ? -3 : 1), 0, eye.r / 12, play.ended && play.night > 1.2 ? 0.2 : 1)
    ctx.restore()
  }

  private ear(play: Play, who: Who): void {
    const pose = play.poses[who]
    const { ctx } = this
    ctx.save()
    ctx.translate(NECK.x, NECK.y)
    ctx.rotate(this.headTurn(play, who))
    this.at(this.wardrobe.ear(), 22, -46, Math.sin(this.now * 1.6) * 0.06 - pose.trunk * 0.4, 1 + pose.trunk * 0.12, 1)
    ctx.restore()
  }

  private trunk(play: Play, who: Who): void {
    const { ctx } = this
    const half = play.halves[who], up = play.poses[who].trunk
    const sway = Math.sin(this.now * 1.5) * 8 - half.vx * 0.03 * play.out(who)
    ctx.beginPath()
    ctx.moveTo(TRUNK.x - 14, TRUNK.y - 8)
    const ex = 138 + up * 26 - sway * 0.4, ey = 60 - up * 190
    ctx.bezierCurveTo(TRUNK.x + 48 + up * 20, TRUNK.y - 10 - up * 20, 126 + up * 50 - sway, 20 - up * 60, ex, ey)
    ctx.lineCap = 'round'
    ctx.strokeStyle = CLOTHS.elephant.edge
    ctx.lineWidth = 41
    this.stroke()
    ctx.strokeStyle = this.print('elephant')
    ctx.lineWidth = 36
    this.stroke()
    ctx.strokeStyle = CLOTHS.elephant.thread
    ctx.lineWidth = 24
    ctx.lineCap = 'butt'
    ctx.setLineDash([2.4, 14])
    this.stroke()
    ctx.setLineDash([])
  }

  // --- Small things and the ghost hand -------------------------------------------------------

  private puffs(play: Play): void {
    const { ctx } = this
    for (const kind of KINDS) {
      let any = false
      ctx.beginPath()
      for (const puff of play.puffs) {
        if (puff.kind !== kind) continue
        any = true
        const r = puff.size * (kind === 'dust' || kind === 'air' ? 0.6 + puff.t : 1 - puff.t * 0.8)
        ctx.moveTo(puff.x + r, puff.y)
        if (kind === 'leaf' || kind === 'feather') ctx.ellipse(puff.x, puff.y, r, r * 0.45, puff.turn, 0, Math.PI * 2)
        else ctx.arc(puff.x, puff.y, Math.max(0.5, r), 0, Math.PI * 2)
      }
      if (!any) continue
      ctx.fillStyle = PUFF[kind]
      this.fill()
    }
    // Asleep behind the door: two bubbles of breath, one thin and one fat.
    if (play.ended && play.night > 3) {
      ctx.beginPath()
      const a = (this.now * 0.5) % 1, b = (this.now * 0.36) % 1
      ctx.arc(176, 440 - a * 40, 5 + a * 9, 0, 7)
      ctx.moveTo(90 + 24, 450 - b * 30)
      ctx.arc(90, 450 - b * 30, 8 + b * 16, 0, 7)
      ctx.fillStyle = 'rgba(255,255,255,.55)'
      this.fill()
    }
  }

  private ghost(play: Play, guidance: Guidance | null): void {
    if (!guidance || guidance.demo === null) return
    const { ctx } = this
    for (const move of demosFor(play, guidance.demoIndex)) {
      const pose = handPose(guidance.demo, move.drag, this.pose)
      ctx.globalAlpha = pose.opacity * 0.92
      const x = move.from.x + (move.to.x - move.from.x) * pose.travel, y = move.from.y + (move.to.y - move.from.y) * pose.travel
      if (pose.press > 0.1) this.at(this.folk.ring(), x, y, 0, 0.36 * pose.press)
      this.at(this.folk.hand(), x, y + (1 - pose.press) * 22, move.lean, 1.1 - pose.press * 0.1)
    }
    ctx.globalAlpha = 1
  }
}

const PUFF: Record<Play['puffs'][number]['kind'], string> = { dust: 'rgba(255,244,220,.75)', drop: '#b5e2f2', crumb: '#f1c98a', leaf: '#5f9c40', feather: '#fffaf0', air: 'rgba(255,255,255,.6)' }
const KINDS = Object.keys(PUFF) as (keyof typeof PUFF)[]
