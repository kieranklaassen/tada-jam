import { PICTURED_R, type Pictured } from './card'
import { CHARACTERS, CUSTOMERS, type Customer } from './customers'
import { drawEffect, drawSoot, drawTongue, type Anchors } from './effects'
import type { Glow } from './hint'
import { KINDS, type Kind } from './kinds'
import { BOARD, CARD, COUNTER_Y, OVEN, PIECE_R, PIZZA, TUB, fit, type Fit } from './layout'
import { INK, PAPER, line, plain, sprite, stamp, type Pen, type Sprite } from './marker'
import { customerSprites, drawArms, drawCustomer, type CustomerSprites, type Pose } from './monsterArt'
import { makeRng, seedFrom } from './rng'
import { makeScenery, paintOven, type Scenery } from './scenery'
import { smooth } from './shapes'
import { doorSpot, type Effect } from './staging'
import { flightAt, tubAt, type Table } from './table'

// The one place the kitchen is drawn. Everything that keeps its shape is a
// sprite made once for the surface's size and pixel ratio; a frame stamps
// them, so a frame is one full-surface stamp (the wall), a few dozen small
// ones and a handful of pen lines.

type Standing = { who: Customer; pose: Pose; x: number; y: number; size: number }

/** What a frame shows. The rules and the motion fill this in; the view only draws it. */
export type Show = {
  table: Table
  baked: boolean
  /** Where the pizza is, in stage units, how big, and how much of it is left. */
  pizza: { x: number; y: number; size: number; hidden: boolean; bites: number; puffed: number }
  /** The customer at the counter, or on its way there. */
  customer: Standing | null
  /** The customer who has eaten, on its way out. */
  leaving: Standing | null
  /** The card: its drawn pieces, how many of them are there yet, how far it has opened, and which one is being patted. */
  card: { pictured: Pictured[]; count: number; open: number; patted: number; pat: number; shake: number } | null
  /** The customers at the door, with the roll each holds. `up` is how far a newcomer has come up from behind the counter, 0 to 1. */
  waiting: { who: Customer; big: boolean; pose: Pose; up: number }[]
  /** How far the tubs have slid in, 0 to 1. */
  tubsIn: number
  /** 0 to 1: the idle glow, and the things that have it. */
  glow: number
  glows: Glow[]
  /** Game time in seconds, for the glow's breathing. */
  time: number
  /** The ghost hand of the idle ladder, in stage units, or none. */
  ghost: { x: number; y: number; press: number; opacity: number } | null
  ovenShake: number
  ovenGlow: number
  effect: Effect | null
  /** The tongue on its way to the pizza, 0 to 1. */
  lick: number
  /** The piece that sizzles as its turn of a tasting plays, by id, and how strongly. */
  sizzling: number
  sizzle: number
  soot: number
  /** The board is bare but for crumbs. */
  crumbs: boolean
}

function paintHalo(g: Pen): void {
  const rng = makeRng(seedFrom('halo'))
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.13
    line(g, [Math.cos(a) * 78, Math.sin(a) * 78, Math.cos(a) * 98, Math.sin(a) * 98], rng, 8, '#ff9f1a')
  }
}

function paintGhost(g: Pen): void {
  // A mitten with one finger out: a hand, not an arrow.
  const hand = smooth([-10, -64, 10, -64, 16, -10, 44, -14, 50, 34, 30, 62, -20, 62, -38, 30, -34, -2, -14, -6], 4)
  plain(g, hand, '#ffffff', 6, INK)
}

function paintCrumbs(g: Pen): void {
  const rng = makeRng(seedFrom('crumbs'))
  for (let i = 0; i < 14; i++) {
    const a = rng.range(0, Math.PI * 2), r = rng.range(10, PIZZA.r * 0.8)
    g.fillStyle = i % 3 === 0 ? '#d98b3a' : '#b8742c'
    g.beginPath()
    g.arc(Math.cos(a) * r, Math.sin(a) * r, rng.range(3, 6), 0, Math.PI * 2)
    g.fill()
  }
}

/** Where the bites are taken, as shares of the pizza's radius: each takes about a third. */
const BITES = [{ x: -0.8, y: -0.5, r: 0.86 }, { x: 0.85, y: -0.35, r: 0.9 }, { x: 0, y: 0.5, r: 1.3 }] as const

export class KitchenView {
  private readonly g: CanvasRenderingContext2D
  private scenery: Scenery | null = null
  private bodies = new Map<Customer, CustomerSprites>()
  private halo: Sprite | null = null
  private ghost: Sprite | null = null
  private ovenLit: Sprite | null = null
  private crumbs: Sprite | null = null
  private fitted: Fit = { scale: 1, left: 0, top: 0 }
  private ratio = 1
  /** Stamps and figures drawn in the last frame, for the grown-up handle. */
  draws = 0

  constructor(canvas: HTMLCanvasElement, private readonly kinds: readonly Kind[] = KINDS) {
    this.g = canvas.getContext('2d', { alpha: false })!
  }

  get fit(): Fit {
    return this.fitted
  }

  /** The surface changed size or pixel ratio: every sprite is drawn again for it. The canvas itself is sized by the Mount. */
  resize(width: number, height: number, ratio: number): void {
    this.fitted = fit(width, height)
    this.ratio = ratio
    const density = this.fitted.scale * ratio
    const s = this.fitted
    this.scenery = makeScenery(density, this.kinds, { x: -s.left / s.scale, y: -s.top / s.scale, w: width / s.scale, h: height / s.scale })
    this.bodies.clear()
    for (const who of CUSTOMERS) this.bodies.set(who, customerSprites(who, density))
    this.halo = sprite({ x: -100, y: -100, w: 200, h: 200 }, density, 6, paintHalo)
    this.ghost = sprite({ x: -44, y: -70, w: 100, h: 138 }, density, 8, paintGhost)
    this.ovenLit = sprite({ x: OVEN.x - OVEN.w / 2, y: OVEN.y - OVEN.h * 0.8, w: OVEN.w, h: OVEN.h * 1.3 }, density, 24, (g) => paintOven(g, 1))
    this.crumbs = sprite({ x: -PIZZA.r, y: -PIZZA.r, w: PIZZA.r * 2, h: PIZZA.r * 2 }, density, 4, paintCrumbs)
  }

  /** Bare paper, for the moment before the save has been read. */
  blank(): void {
    this.g.setTransform(1, 0, 0, 1, 0, 0)
    this.g.fillStyle = PAPER
    this.g.fillRect(0, 0, this.g.canvas.width, this.g.canvas.height)
    this.draws = 0
  }

  private piece(kind: Kind, x: number, y: number, turn: number, size: number): void {
    const g = this.g
    g.save()
    g.translate(x, y)
    g.rotate(turn)
    g.scale(size, size)
    stamp(g, this.scenery!.pieces[kind])
    g.restore()
    this.draws += 1
  }

  private halos(show: Show): void {
    const g = this.g
    if (show.glow <= 0.01 || !this.halo) return
    const breath = 1 + 0.05 * Math.sin(show.time * 3.2)
    for (const at of show.glows) {
      g.save()
      g.globalAlpha = show.glow * (0.7 + 0.3 * Math.sin(show.time * 3.2))
      g.translate(at.x, at.y)
      g.scale((at.r / 88) * breath, (at.r / 88) * breath)
      stamp(g, this.halo)
      g.restore()
      this.draws += 1
    }
  }

  private pizza(show: Show): void {
    const g = this.g, scenery = this.scenery!, table = show.table, p = show.pizza
    if (p.hidden) return
    g.save()
    g.translate(p.x, p.y - p.puffed * 18)
    g.rotate(table.jiggle.x * 0.012)
    const size = p.size * (1 + p.puffed * 0.2)
    g.scale(size * (1 + table.jiggle.x * 0.006), size * (1 - table.jiggle.x * 0.006))
    // Each bite takes its share away: what is drawn is the pizza outside every bite so far.
    for (let n = 0; n < BITES.length && n < p.bites; n++) {
      const bite = BITES[n], grown = Math.min(1, p.bites - n)
      g.beginPath()
      g.rect(-PIZZA.r * 2, -PIZZA.r * 2, PIZZA.r * 4, PIZZA.r * 4)
      g.arc(bite.x * PIZZA.r, bite.y * PIZZA.r, bite.r * PIZZA.r * grown, 0, Math.PI * 2)
      g.clip('evenodd')
    }
    stamp(g, show.baked ? scenery.pizzaBaked : scenery.pizza)
    this.draws += 1
    for (const piece of table.pieces) {
      const hot = piece.id === show.sizzling ? show.sizzle : 0
      if (hot > 0.01 && this.halo) {
        g.save()
        g.globalAlpha = hot
        g.translate(piece.x * PIZZA.r, piece.y * PIZZA.r)
        g.scale(0.42, 0.42)
        stamp(g, this.halo)
        g.restore()
      }
      this.piece(piece.kind, piece.x * PIZZA.r, piece.y * PIZZA.r, piece.turn + hot * 0.5 * Math.sin(show.time * 40), 1 + piece.settle.x * 0.05 + hot * 0.3)
    }
    g.restore()
  }

  private anchors(c: Standing, show: Show): Anchors {
    const who = CHARACTERS[c.who], h = who.height * c.pose.sy
    return {
      mouth: { x: c.x, y: c.y - who.mouthAt * h - c.pose.lift + 10 },
      head: { x: c.x, y: c.y - h - c.pose.lift },
      belly: { x: c.x, y: c.y - h * 0.26 - c.pose.lift },
      pizza: { x: show.pizza.x, y: show.pizza.y, r: PIZZA.r * show.pizza.size },
      halfWidth: who.halfWidth,
    }
  }

  draw(show: Show): void {
    const g = this.g, scenery = this.scenery
    if (!scenery) return
    const s = this.fitted, k = s.scale * this.ratio
    this.draws = 0
    g.setTransform(k, 0, 0, k, s.left * this.ratio, s.top * this.ratio)
    stamp(g, scenery.wall)
    this.draws += 1

    // Customers stand behind the counter: whatever of them is below its far edge is not drawn.
    g.save()
    g.beginPath()
    g.rect(-4000, -4000, 8000, 4000 + COUNTER_Y + 14)
    g.clip()
    show.waiting.forEach((w) => {
      const spot = doorSpot(w.big ? 'big' : 'small')
      const x = spot.x, size = spot.size, y = spot.y + (1 - w.up) * 150
      if (w.up <= 0) return
      this.draws += drawCustomer(g, w.who, this.bodies.get(w.who)!, x, y, size, w.pose)
      g.save()
      g.translate(x + 30, y - 54 - w.pose.lift * size)
      g.rotate(-0.5)
      stamp(g, w.big ? scenery.bigRoll : scenery.roll)
      g.restore()
      this.draws += 1
    })
    for (const c of [show.leaving, show.customer]) if (c) this.draws += drawCustomer(g, c.who, this.bodies.get(c.who)!, c.x, c.y, c.size, c.pose)
    const anchors = show.customer ? this.anchors(show.customer, show) : null
    if (anchors) drawSoot(g, anchors, show.soot)
    g.restore()
    stamp(g, scenery.lip)
    this.draws += 1

    g.save()
    g.translate(OVEN.x, OVEN.y + OVEN.h / 2)
    g.rotate(show.ovenShake * 0.02)
    g.translate(-OVEN.x, -OVEN.y - OVEN.h / 2)
    stamp(g, scenery.oven)
    if (show.ovenGlow > 0.01 && this.ovenLit) {
      g.globalAlpha = Math.min(1, show.ovenGlow)
      stamp(g, this.ovenLit)
      g.globalAlpha = 1
    }
    g.restore()
    stamp(g, scenery.board)
    this.draws += 2
    if (show.crumbs && this.crumbs) {
      g.save()
      g.translate(BOARD.x, BOARD.y)
      stamp(g, this.crumbs)
      g.restore()
      this.draws += 1
    }
    this.halos(show)
    this.pizza(show)

    const table = show.table
    table.tubs.forEach((tub, i) => {
      const at = tubAt(table, i)
      g.save()
      g.translate(at.x - (1 - show.tubsIn) * 520, at.y + TUB.r * 0.8)
      g.scale(1 - tub.squash.x * 0.03, 1 + tub.squash.x * 0.045)
      g.translate(0, -TUB.r * 0.8)
      stamp(g, scenery.tubs[tub.kind])
      g.restore()
      this.draws += 1
    })

    const card = show.card
    if (card && card.open > 0.02) {
      g.save()
      // The roll opens from the hand that holds it, at the card's right edge.
      g.translate(CARD.x + CARD.w, CARD.y + CARD.h / 2)
      g.rotate(card.shake * 0.012)
      g.scale(card.open, 1)
      g.translate(-CARD.w, -CARD.h / 2)
      stamp(g, scenery.card)
      this.draws += 1
      card.pictured.forEach((p, i) => {
        if (i >= card.count) return
        const pat = i === card.patted ? card.pat : 0
        this.piece(p.kind, p.x, p.y - pat * 5, pat * 0.3 * Math.sin(show.time * 30), (PICTURED_R / PIECE_R) * (1 + pat * 0.35))
      })
      g.restore()
    }

    // What reaches over the counter is drawn over the table: arms, the tongue, a flame.
    if (show.customer && anchors) {
      const c = show.customer
      this.draws += drawArms(g, c.who, c.x, c.y, c.size, c.pose)
      drawTongue(g, anchors, show.lick)
      if (show.effect) this.draws += drawEffect(g, show.effect, anchors)
    }

    for (const f of table.flights) {
      const at = flightAt(f)
      this.piece(f.kind, at.x, at.y, at.turn, 1.08)
    }
    if (table.hand) this.piece(table.hand.kind, table.hand.x, table.hand.y, table.hand.turn, table.hand.waiting ? 1.1 : 1.24)

    if (show.ghost && this.ghost && show.ghost.opacity > 0.01) {
      g.save()
      g.globalAlpha = show.ghost.opacity * 0.9
      g.translate(show.ghost.x, show.ghost.y + 54 - show.ghost.press * 14)
      const squeeze = 1 - show.ghost.press * 0.08
      g.scale(squeeze, squeeze)
      stamp(g, this.ghost)
      g.restore()
      this.draws += 1
    }
    // Nothing is left on the context for the next frame.
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
  }
}
