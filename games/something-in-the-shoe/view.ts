import { spring, type Frame } from './acts'
import { Brush, COLOR as C, INK, oval, smooth } from './brush'
import { drawBits, drawBoot, drawBootBack, drawFoot, drawItem, drawLeg, drawOwner, drawPeek, drawSleeper, drawSleepingFoot, drawThing } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import { moveToShow } from './guide'
import type { Group, House } from './house'
import { BED, FLOOR, PEEK, PEEP, pillow } from './layout'
import { OWNERS } from './owners'
import { PAD, drawBasket, drawBasketBack, drawCat, drawSky, paintRoom } from './scenery'
import { STAGE, fit } from './stage'
import { THINGS } from './things'

const HAND = smooth(120, [-8, -60, 8, -60, 14, -6, 34, -8, 46, 8, 44, 48, 26, 78, -20, 78, -40, 40, -52, 14, -42, 4, -22, 22, -16, -6], true, 0.5)
const BLANKET = smooth(121, [0, 0, 160, 14, 320, 0, 480, 14, 640, 0, 848, 8, 852, 70, 846, 132, 420, 136, 0, 132, -4, 66], true, 1.2, 4)
const PILLOW = oval(122, 88, 58), BOARD = smooth(123, [-14, 190, -14, 60, -14, -40, 50, -66, 200, -70, 420, -72, 650, -70, 800, -66, 862, -40, 862, 60, 862, 190, 420, 196], true, 1, 4)

/** Draws the room. It keeps nothing of the game: what it makes once is the room's two paintings. */
export class View {
  private readonly room: HTMLCanvasElement[] = []
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private readonly b: Brush
  private readonly scale: number

  constructor(make: (w: number, h: number) => HTMLCanvasElement, dpr: number) {
    this.scale = dpr > 1 ? 1.5 : 1
    for (const night of [false, true]) {
      const c = make(Math.round((STAGE.width + PAD * 2) * this.scale), Math.round((STAGE.height + PAD * 2) * this.scale)), pen = c.getContext('2d')!
      pen.setTransform(this.scale, 0, 0, this.scale, PAD * this.scale, PAD * this.scale)
      paintRoom(pen, night)
      this.room.push(c)
    }
    this.b = new Brush(null as unknown as CanvasRenderingContext2D)
  }

  dispose(): void { for (const c of this.room) c.width = c.height = 0 }

  private set(pen: CanvasRenderingContext2D, width: number, height: number, dpr: number): void {
    const f = fit(width, height), k = dpr * f.scale
    pen.setTransform(k, 0, 0, k, dpr * f.x, dpr * f.y)
    pen.lineJoin = pen.lineCap = 'round'
    this.b.pen = pen; this.b.laid = 0; this.b.line = 9
  }
  private stamp(pen: CanvasRenderingContext2D, i: number): void {
    pen.drawImage(this.room[i], -PAD, -PAD, STAGE.width + PAD * 2, STAGE.height + PAD * 2)
    this.b.laid++
  }
  /** The room's two colours over everything that can be seen, whatever the surface's shape. */
  private ground(pen: CanvasRenderingContext2D, dark: number): void {
    for (const [a, wall, floor] of [[1, C.blue, C.green], [dark, C.night, '#0f5a3c']] as const) {
      if (a <= 0) continue
      pen.globalAlpha = a
      pen.fillStyle = wall; pen.fillRect(-2400, -2400, 6000, 2400 + FLOOR - 74)
      pen.fillStyle = floor; pen.fillRect(-2400, FLOOR - 74, 6000, 3000)
    }
    pen.globalAlpha = 1
    this.b.laid += 2
  }
  bare(pen: CanvasRenderingContext2D, width: number, height: number, dpr: number): void {
    this.set(pen, width, height, dpr)
    this.ground(pen, 0)
    this.stamp(pen, 0)
  }

  draw(pen: CanvasRenderingContext2D, h: House, width: number, height: number, dpr: number, guidance: Guidance | null): number {
    this.set(pen, width, height, dpr)
    const b = this.b, t = h.time, dark = h.dark
    this.ground(pen, dark)
    if (dark < 1) this.stamp(pen, 0)
    if (dark > 0) { pen.globalAlpha = dark; this.stamp(pen, 1); pen.globalAlpha = 1 }
    drawSky(b, dark, h.sunPoke, t)
    const groups = h.groups(), move = guidance && guidance.glow > 0 ? moveToShow(h, guidance) : null
    const busy = h.busy, first = groups[0].frame.pose
    if (h.bed < 0.4) drawCat(b, busy ? -0.9 : h.finger ? Math.sign(h.finger.x - 800) * 0.8 : Math.sin(t * 0.5) * 0.6, busy ? 0.5 : 0.8, h.catPoke, t, busy && first.eyes === 'wide')
    if (h.bed > 0) this.bed(h, t)
    if (h.peeking) drawPeek(b, h.peeking, h.peekX - (1 - spring(h.peekIn)) * 230 + Math.abs(Math.sin(h.peekPoke * 7)) * h.peekPoke * 34, PEEK.y, t)
    const bx = h.basketX
    pen.translate(0, h.basketY)
    drawBasketBack(b, bx)
    pen.translate(0, -h.basketY)
    // The glow: a fat yellow ring round what can be touched next.
    const glow = guidance ? guidance.glow : 0
    for (const id of THINGS) {
      const thing = h.things[id]
      if (thing.where !== 'home') continue
      const at = h.homeOf(id), q = thing.squash, wob = q > 0 ? Math.sin(q * 15) * q * 0.22 : 0
      const lively = h.phase === 'day' && id === 'frog' ? Math.max(0, Math.sin(t * 1.1)) ** 12 * 10 : 0
      const bob = glow > 0 && move?.thing ? Math.sin(t * 5 + at.x) * 5 * glow : 0
      const jump = thing.queued ? Math.abs(Math.sin(t * 9)) * 20 : 0
      if (glow > 0 && move?.thing && bx === 0) { pen.globalAlpha = glow; b.dot(at.x, at.y + bob, 58 + Math.sin(t * 4) * 3, 54 + Math.sin(t * 4) * 3, C.yellow); pen.globalAlpha = 1 }
      drawThing(b, id, at.x, at.y - lively + bob - jump, 0, 1 + wob, 1 - wob)
    }
    pen.translate(0, h.basketY)
    drawBasket(b, bx)
    pen.translate(0, -h.basketY)
    // What is not a thing glows by itself when it is next.
    if (glow > 0 && move && !move.thing) { pen.globalAlpha = glow * 0.9; b.ring(move.from.x, move.from.y, 84 + Math.sin(t * 4) * 5, 0, 6.283, 13, C.yellow); pen.globalAlpha = 1 }
    for (const g of groups) this.group(g, h)
    for (const id of THINGS) {
      const thing = h.things[id]
      if (thing.where === 'air' || thing.where === 'hand') drawThing(b, id, thing.x, thing.y, thing.rot, thing.where === 'hand' ? 1.15 : 1, thing.where === 'hand' ? 1.15 : 1)
    }
    for (const q of h.puffs) b.ring(q.x, q.y, 16 + q.t * 70, 0, 6.283, 9 * (1 - q.t * 2), C.white)
    if (move && guidance && guidance.demo !== null) this.ghost(move, guidance.demo)
    return b.laid
  }

  private group(g: Group, h: House): void {
    const b = this.b, { pen } = b, { pose: p, items, bits } = g.frame as Frame, { x, y, s, ox } = g.place
    pen.save(); pen.translate(x, y); pen.scale(s, s)
    b.line = s < 1 ? 11 : 9
    if (g.here) {
      // The shadow on the floor says how high it has leapt.
      const k = Math.max(0.35, 1 + p.dy / 700)
      b.dot(ox + 70 + p.dx, 8, 210 * k, 20 * k, 'rgba(0,0,0,0.28)')
    } else b.dot(BOOT_X + 40, 6, 150, 16, 'rgba(0,0,0,0.28)')
    pen.save()
    if (g.here) { pen.translate(ox + 60 + p.dx, p.dy); pen.rotate(p.rot); pen.scale(p.sx, p.sy); pen.translate(-ox - 60, 0) }
    const inBoot = (): void => g.found.forEach((id, i) => { const q = PEEP[i]; drawThing(b, id, q.x, q.y + (p.boot.sy - 1) * -280, (i ? 1 : -1) * 0.18 + Math.sin(h.time * 3 + i) * 0.04, 0.95, 0.95) })
    if (g.here) {
      drawOwner(b, g.owner, p, ox); drawBootBack(b, p); inBoot(); for (const i of items) if (!i.over) this.still(g, i)
      drawLeg(b, g.owner, p, ox); drawFoot(b, g.owner, p.footX, p.footY, p.footRot, p.toes)
    } else { drawBootBack(b, p); inBoot() }
    drawBoot(b, g.owner, p, p.toes > 0)
    pen.restore()
    drawBits(b, bits, g.owner)
    for (const i of items) if (i.over) drawItem(b, i)
    pen.restore()
    b.line = 9
  }
  /** A thing behind the boot's front is drawn inside the pose already, so it is laid where it is seen. */
  private still(g: Group, i: Frame['items'][number]): void {
    const { pen } = this.b, p = g.frame.pose, ox = g.place.ox + 60
    pen.save()
    pen.translate(ox, 0); pen.scale(1 / p.sx, 1 / p.sy); pen.rotate(-p.rot); pen.translate(-ox - p.dx, -p.dy)
    drawItem(this.b, i)
    pen.restore()
  }

  private bed(h: House, t: number): void {
    const b = this.b, { pen } = b, k = h.bed
    pen.save(); pen.translate(0, (1 - k) * 520)
    b.lay(BOARD, C.brown, { x: BED.left, y: BED.top })
    OWNERS.forEach((owner, i) => {
      const at = pillow(i)
      b.lay(PILLOW, C.white, { x: at.x, y: at.y - 4, sx: 0.96 })
      drawSleeper(b, owner, at.x, at.y, t, h.stir?.owner === owner)
    })
    const breath = Math.sin(t * 1.6) * 5
    b.lay(BLANKET, C.yellow, { x: BED.left, y: BED.top + 112 + breath, sy: 1 - breath / 130 })
    OWNERS.forEach((owner, i) => { b.lay(FOOT_HOLE, INK, { x: pillow(i).x, y: BED.top + 152, line: 0 }); drawSleepingFoot(b, owner, pillow(i).x + 2, BED.top + 152, t) })
    pen.restore()
  }

  private ghost(move: { from: { x: number; y: number }; to: { x: number; y: number }; drag: boolean; thing: (typeof THINGS)[number] | null }, demo: number): void {
    const b = this.b, { pen } = b, o = handPose(demo, move.drag, this.hand)
    if (o.opacity <= 0.01) return
    const u = o.travel, x = move.from.x + (move.to.x - move.from.x) * u, y = move.from.y + (move.to.y - move.from.y) * u - Math.sin(u * Math.PI) * 110
    pen.globalAlpha = o.opacity
    if (move.thing && u > 0.01) { pen.globalAlpha = o.opacity * 0.6; drawThing(b, move.thing, x, y, 0, 1, 1); pen.globalAlpha = o.opacity }
    if (o.press > 0.2 && !move.drag) b.ring(x, y, 34 + o.press * 26, 0, 6.283, 8, C.yellow)
    b.lay(HAND, C.white, { x: x + 6, y: y + 60 - o.press * 8, rot: -0.35, sx: 1.05, sy: 1.05 - o.press * 0.06, line: 8 })
    pen.globalAlpha = 1
  }
}
const BOOT_X = 105
const FOOT_HOLE = oval(124, 46, 18)
