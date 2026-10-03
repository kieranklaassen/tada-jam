import { PICTURED_R, type Pictured } from './card'
import { CUSTOMERS, type Customer } from './customers'
import { KINDS, type Kind } from './kinds'
import { CARD, COUNTER_Y, CUSTOMER, DOOR, PIECE_R, PIZZA, TUB, fit, onPizza, type Fit } from './layout'
import { INK, line, plain, sprite, stamp, type Pen, type Sprite } from './marker'
import { customerSprites, drawCustomer, type CustomerSprites, type Pose } from './monsterArt'
import { makeRng, seedFrom } from './rng'
import { makeScenery, type Scenery } from './scenery'
import { smooth } from './shapes'
import { flightAt, tubAt, type Table } from './table'

// The one place the kitchen is drawn. Everything that keeps its shape is a
// sprite made once for the surface's size and pixel ratio; a frame stamps
// them, so a frame is a few dozen stamps and a handful of pen lines.

/** What a frame shows. The rules and the motion fill this in; the view only draws it. */
export type Show = {
  table: Table
  baked: boolean
  /** The customer at the counter, or none. */
  customer: { who: Customer; pose: Pose } | null
  /** The pictured set on the card, or none while no order is up. */
  card: Pictured[] | null
  /** The customers at the door, with the roll each holds. */
  waiting: { who: Customer; big: boolean; pose: Pose }[]
  /** 0 to 1: the idle glow on what can be touched. */
  glow: number
  /** Game time in seconds, for the glow's breathing. */
  time: number
  /** The ghost hand of the idle ladder, in stage units, or none. */
  ghost: { x: number; y: number; press: number; opacity: number } | null
}

function paintHalo(g: Pen): void {
  const rng = makeRng(seedFrom('halo'))
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13
    line(g, [Math.cos(a) * 92, Math.sin(a) * 92, Math.cos(a) * 118, Math.sin(a) * 118], rng, 9, '#ff9f1a')
  }
}

function paintGhost(g: Pen): void {
  // A mitten with one finger out, pointing up and a little left: a hand, not an arrow.
  const hand = smooth([-10, -64, 10, -64, 16, -10, 44, -14, 50, 34, 30, 62, -20, 62, -38, 30, -34, -2, -14, -6], 4)
  plain(g, hand, '#ffffff', 6, INK)
}

export class KitchenView {
  private readonly g: CanvasRenderingContext2D
  private scenery: Scenery | null = null
  private bodies = new Map<Customer, CustomerSprites>()
  private halo: Sprite | null = null
  private ghost: Sprite | null = null
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
    this.halo = sprite({ x: -124, y: -124, w: 248, h: 248 }, density, 6, paintHalo)
    this.ghost = sprite({ x: -44, y: -70, w: 100, h: 138 }, density, 8, paintGhost)
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

  draw(show: Show): void {
    const g = this.g, scenery = this.scenery
    if (!scenery) return
    const s = this.fitted, k = s.scale * this.ratio
    this.draws = 0
    g.setTransform(k, 0, 0, k, s.left * this.ratio, s.top * this.ratio)
    stamp(g, scenery.wall)
    this.draws += 1

    // The door: the next customers, each with its order rolled up.
    show.waiting.forEach((w, i) => {
      const x = DOOR.x + (i === 0 ? -50 : 50), y = COUNTER_Y + 22
      this.draws += drawCustomer(g, w.who, this.bodies.get(w.who)!, x, y, 0.44, w.pose)
      g.save()
      g.translate(x + 30, y - 54)
      g.rotate(-0.5)
      stamp(g, w.big ? scenery.bigRoll : scenery.roll)
      g.restore()
      this.draws += 1
    })
    if (show.customer) this.draws += drawCustomer(g, show.customer.who, this.bodies.get(show.customer.who)!, CUSTOMER.x, CUSTOMER.y, 1, show.customer.pose)
    stamp(g, scenery.lip)
    stamp(g, scenery.oven)
    stamp(g, scenery.board)
    this.draws += 3

    // The pizza and the pieces on it wobble together.
    const table = show.table
    g.save()
    g.translate(PIZZA.x, PIZZA.y)
    g.rotate(table.jiggle.x * 0.012)
    g.scale(1 + table.jiggle.x * 0.006, 1 - table.jiggle.x * 0.006)
    stamp(g, show.baked ? scenery.pizzaBaked : scenery.pizza)
    g.translate(-PIZZA.x, -PIZZA.y)
    this.draws += 1
    for (const p of table.pieces) {
      const at = onPizza(p.x, p.y)
      this.piece(p.kind, at.x, at.y, p.turn, 1 + p.settle.x * 0.05)
    }
    g.restore()

    table.tubs.forEach((tub, i) => {
      const at = tubAt(table, i)
      if (show.glow > 0.01 && this.halo) {
        g.save()
        g.globalAlpha = show.glow * (0.7 + 0.3 * Math.sin(show.time * 3.2))
        g.translate(at.x, at.y + TUB.r * 0.2)
        const breath = 1 + 0.05 * Math.sin(show.time * 3.2)
        g.scale(breath, breath)
        stamp(g, this.halo)
        g.restore()
        this.draws += 1
      }
      g.save()
      g.translate(at.x, at.y + TUB.r * 0.8)
      g.scale(1 - tub.squash.x * 0.03, 1 + tub.squash.x * 0.045)
      g.translate(0, -TUB.r * 0.8)
      stamp(g, scenery.tubs[tub.kind])
      g.restore()
      this.draws += 1
    })

    if (show.card) {
      g.save()
      g.translate(CARD.x, CARD.y)
      stamp(g, scenery.card)
      this.draws += 1
      for (const p of show.card) this.piece(p.kind, p.x, p.y, 0, PICTURED_R / PIECE_R)
      g.restore()
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
