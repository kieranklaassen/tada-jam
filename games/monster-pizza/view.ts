import { PICTURED_R, type Pictured } from './card'
import { CHARACTERS, CUSTOMERS, type Customer } from './customers'
import { drawEffect, drawSoot, drawTongue, drawWorn, type Anchors } from './effects'
import { CLOUD_LASTS, PUFF_LASTS, bird, clouds, flames, puff, smoke, type Drift } from './ambient'
import type { Glow } from './hint'
import { KINDS, type Kind } from './kinds'
import { BITES, BOARD, CARD, COUNTER_Y, DOOR_SIZE, OVEN, PIECE_R, PIZZA, ROLL, TUB, fit, type Fit } from './layout'
import { INK, PAPER, line, plain, solid, sprite, stamp, type Pen, type Sprite } from './marker'
import { REST, bakingMove, landing, pizzaJiggle, tubSquash } from './pieceMotion'
import { customerSprites, drawArms, drawCustomer, eyes, onLimpHead, type CustomerSprites, type Pose } from './monsterArt'
import { handOnStage } from './pose'
import { makeRng, seedFrom } from './rng'
import { doorway, makeScenery, ovenMouth, paintOven, type Scenery } from './scenery'
import { bounds, ellipse, smooth } from './shapes'
import { doorSpot, type Effect } from './staging'
import { STREET, type StreetThing } from './street'
import { AT_REST, flightAt, tubAt, type Table } from './table'

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
  card: { pictured: Pictured[]; count: number; open: number; patted: readonly number[]; pat: number; shake: number } | null
  /** The customers at the door, with the roll each holds. `up` is how far a newcomer has come up from behind the counter, 0 to 1. */
  /** The two at the door. `big` is the spot; `fat` is whether the roll held there is the longer, fatter one; `wave` is how far it is being waved. */
  waiting: { who: Customer; big: boolean; fat: boolean; wave: number; pose: Pose; up: number }[]
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
  /** The roll on its way from the door in its holder's hand, and how much of it is left as the card opens out of it. */
  roll: { x: number; y: number; fat: boolean; left: number; turn: number } | null
  sizzling: readonly number[]
  /** The pieces that bob just now are being paired with their pictures, not sizzling: no ring of dashes round them. */
  pairing: boolean
  /** The thing in the street that is answering a touch, where it was touched, and how far through its answer it is, 0 to 1. */
  street: { what: StreetThing; x: number; y: number; index: number; t: number } | null
  /** How far the board has been nudged from its place, in stage units. The pizza on it goes with it. */
  boardX: number
  /** The oven's door: 0 open to 1 shut. */
  door: number
  sizzle: number
  soot: number
  /** How far the pieces are through their baking move as the pizza slides out, 0 to 1; 0 when none plays. */
  baking: number
  /** A sock fed by hand is on the customer's head. */
  wearing: boolean
  /** Puffs of flour where pieces have just landed: where, in stage units, and how many seconds ago. */
  /** Puffs in the air: flour where a piece landed, or a cloud out of the oven's mouth. */
  puffs: { x: number; y: number; age: number; cloud?: boolean }[]
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

/** How the `i`th picture on a card is turned, in radians: a little, and differently from the one before it. */
export function pictureTurn(i: number): number {
  return [0.14, -0.18, 0.05, 0.2, -0.1][i % 5]
}

/** The dot of light on an olive fresh out of the oven, about (0, 0). */
const GLINT = ellipse(0, 0, 5, 4, 8)


export class KitchenView {
  private readonly g: CanvasRenderingContext2D
  private scenery: Scenery | null = null
  private bodies = new Map<Customer, CustomerSprites>()
  /** The same bodies drawn small, for the two at the door: a big sprite stamped small costs as much as a big one. */
  private doorBodies = new Map<Customer, CustomerSprites>()
  private halo: Sprite | null = null
  private ghost: Sprite | null = null
  private ovenLit: Sprite | null = null
  private crumbs: Sprite | null = null
  private fitted: Fit = { scale: 1, left: 0, top: 0 }
  private ratio = 1
  private readonly doorRing = doorway()
  private readonly mouthRing = ovenMouth()
  private readonly mouthBox = bounds(this.mouthRing)
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
    this.doorBodies.clear()
    for (const who of CUSTOMERS) {
      this.bodies.set(who, customerSprites(who, density))
      this.doorBodies.set(who, customerSprites(who, density * DOOR_SIZE))
    }
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

  private piece(kind: Kind, x: number, y: number, turn: number, size: number, baked = false, settle = 0, baking = 0, age = AT_REST): void {
    const g = this.g
    // Each kind lands in its own way and does its own move once as it comes out of the oven. At rest all lie still.
    const land = landing(kind, settle, age)
    const bake = baking > 0 && baking < 1 ? bakingMove(kind, baking) : REST
    g.save()
    g.translate(x + land.roll, y - land.hop - bake.hop)
    g.rotate(turn + land.turn + bake.turn)
    g.scale(size * (1 + land.wide + bake.wide), size * (1 + land.tall + bake.tall))
    // Out of the oven a worm curls up and a cheese goes soft for a moment: its own shape fades into the soft one and back.
    const soft = bake.soft > 0.02 ? this.scenery!.piecesSoft[kind] : undefined
    if (soft) {
      const before = g.globalAlpha
      g.globalAlpha = before * (1 - bake.soft)
      stamp(g, this.scenery!.piecesBaked[kind])
      g.globalAlpha = before * bake.soft
      stamp(g, soft)
      g.globalAlpha = before
      this.draws += 1
    } else stamp(g, baked ? this.scenery!.piecesBaked[kind] : this.scenery!.pieces[kind])
    g.restore()
    this.draws += 1
    // Out of the oven an olive glistens for a moment, and a sock steams.
    if (bake.shine > 0.02) {
      g.save()
      g.globalAlpha = Math.min(1, bake.shine)
      solid(g, GLINT.map((v, i) => v * size + (i % 2 === 0 ? x - PIECE_R * 0.34 : y - bake.hop - PIECE_R * 0.38)), '#ffffff')
      g.restore()
    }
    if (bake.steam > 0.02) {
      this.drift(this.scenery!.smoke, { x, y: y - PIECE_R * 1.2 - baking * 34, size: 0.7 + baking * 0.6, alpha: Math.min(1, bake.steam), turn: 0 })
    }
  }

  private trace(ring: number[]): void {
    const g = this.g
    g.beginPath()
    g.moveTo(ring[0], ring[1])
    for (let i = 2; i < ring.length; i += 2) g.lineTo(ring[i], ring[i + 1])
    g.closePath()
  }

  /** Stamps one drifting thing: a cloud, a flame, a curl of smoke. */
  private drift(s: Sprite, at: Drift): void {
    if (at.alpha <= 0.01) return
    const g = this.g
    g.save()
    g.globalAlpha = Math.min(1, at.alpha)
    g.translate(at.x, at.y)
    g.rotate(at.turn)
    g.scale(at.size, at.size)
    stamp(g, s)
    g.restore()
    this.draws += 1
  }

  private halos(show: Show): void {
    const g = this.g
    const halo = this.halo
    if (show.glow <= 0.01 || !halo) return
    const breath = 1 + 0.05 * Math.sin(show.time * 3.2)
    show.glows.forEach((at, i) => {
      g.save()
      g.globalAlpha = show.glow * (0.7 + 0.3 * Math.sin(show.time * 3.2))
      g.translate(at.x, at.y)
      // Rings that stand side by side or one over the other are turned half a dash apart, so no dash of one lies along a dash of the other.
      if ((i % 2) + (Math.floor(i / 2) % 2) === 1) g.rotate(Math.PI / 10)
      g.scale((at.r / 88) * breath, (at.r / 88) * breath)
      stamp(g, halo)
      g.restore()
      this.draws += 1
    })
  }

  private pizza(show: Show): void {
    const g = this.g, scenery = this.scenery!, table = show.table, p = show.pizza
    if (p.hidden) return
    g.save()
    g.translate(p.x, p.y - p.puffed * 18)
    const jiggle = pizzaJiggle(table.jiggle.x)
    g.rotate(jiggle.turn)
    const size = p.size * (1 + p.puffed * 0.2)
    g.scale(size * (1 + jiggle.wide), size * (1 - jiggle.wide))
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
      const hot = show.sizzling.includes(piece.id) ? show.sizzle : 0
      if (hot > 0.01 && this.halo && !show.pairing) {
        g.save()
        g.globalAlpha = hot
        g.translate(piece.x * PIZZA.r, piece.y * PIZZA.r)
        g.scale(0.42, 0.42)
        stamp(g, this.halo)
        g.restore()
      }
      this.piece(piece.kind, piece.x * PIZZA.r, piece.y * PIZZA.r, piece.turn + hot * 0.5 * Math.sin(show.time * 40), 1 + hot * 0.3, show.baked, piece.settle.x, show.baking, piece.age)
    }
    g.restore()
  }

  private anchors(c: Standing, show: Show): Anchors {
    const who = CHARACTERS[c.who], h = who.height * c.pose.sy
    const eye = eyes(c.who)[0]
    const hand = (at: { x: number; y: number } | null) => {
      if (!at) return null
      const on = handOnStage(c.pose, at)
      return { x: c.x + on.x * c.size, y: c.y + on.y * c.size }
    }
    const limpMouth = onLimpHead(c.who, c.pose, 0, -who.mouthAt * who.height)
    // The lowest point of any eye: soot stays below it.
    const eyesLow = eyes(c.who).reduce((low, e) => Math.max(low, c.y + (e.y + e.r) * c.pose.sy - c.pose.lift), -Infinity)
    return {
      hands: { free: hand(c.pose.handL), card: hand(c.pose.handR) },
      eyesLow,
      height: h,
      eye: { x: c.x + eye.x * c.pose.sx, y: c.y + eye.y * c.pose.sy - c.pose.lift, r: eye.r },
      body: who.body,
      counter: COUNTER_Y,
      // A head that hangs over takes its mouth with it: the tongue, and the dough stuck to it, come from where the mouth is drawn.
      mouth: { x: c.x + limpMouth.x * c.pose.sx, y: c.y + limpMouth.y * c.pose.sy - c.pose.lift + 10 },
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
    // Outside the door: clouds drifting over the street, and now and then a bird.
    g.save()
    this.trace(this.doorRing)
    g.clip()
    const street = show.street, bounce = street ? Math.sin(street.t * Math.PI) : 0
    // The sun beams when it is touched: its rays stand out further for a moment, drawn over the painted ones.
    if (street?.what === 'sun') {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.2, near = 46, far = 62 + 22 * bounce + (k % 2) * 8, wide = 0.13
        solid(g, [STREET.sun.x + Math.cos(a - wide) * near, STREET.sun.y + Math.sin(a - wide) * near, STREET.sun.x + Math.cos(a) * far, STREET.sun.y + Math.sin(a) * far, STREET.sun.x + Math.cos(a + wide) * near, STREET.sun.y + Math.sin(a + wide) * near], '#ffc21f')
      }
    }
    // The house lights its window when it is knocked at.
    if (street?.what === 'house') {
      const w = STREET.house.window
      g.globalAlpha = Math.min(1, bounce * 1.6)
      solid(g, [w.x + 3, w.y + 3, w.x + w.w - 3, w.y + 3, w.x + w.w - 3, w.y + w.h - 3, w.x + 3, w.y + w.h - 3], '#ffe14d')
      g.globalAlpha = 1
    }
    // The tree drops three leaves from where it was touched.
    if (street?.what === 'tree') {
      for (let k = 0; k < 3; k++) {
        const fall = street.t * (70 + k * 22), sway = Math.sin(street.t * 9 + k * 2) * 10
        g.globalAlpha = 1 - street.t * street.t
        solid(g, ellipse(street.x - 16 + k * 16 + sway, street.y + fall, 8, 5, 8), '#4fa85a')
      }
      g.globalAlpha = 1
    }
    clouds(show.time).forEach((c, i) => {
      // A touched cloud puffs up and lets three drops fall.
      const puffed = street?.what === 'cloud' && street.index === i ? bounce : 0
      this.drift(scenery.cloud, { ...c, size: c.size * (1 + 0.22 * puffed) })
      if (puffed > 0 && street) {
        for (let k = 0; k < 3; k++) {
          g.globalAlpha = 1 - street.t
          solid(g, smooth([c.x - 18 + k * 18, c.y + 14 + street.t * (50 + k * 12), c.x - 14 + k * 18, c.y + 26 + street.t * (50 + k * 12), c.x - 18 + k * 18, c.y + 32 + street.t * (50 + k * 12), c.x - 22 + k * 18, c.y + 26 + street.t * (50 + k * 12)], 3), '#5aa7d6')
        }
        g.globalAlpha = 1
      }
    })
    const flying = bird(show.time)
    if (flying) {
      g.save()
      // A touched bird hops in the air.
      g.translate(flying.x, flying.y - (street?.what === 'bird' ? 24 * bounce : 0))
      // Its wing beat squashes it a little and never flat: flattened, a small dark bird is a dash.
      g.scale(1, 0.85 + 0.15 * flying.flap)
      stamp(g, scenery.bird)
      g.restore()
      this.draws += 1
    }
    g.restore()

    // Customers stand behind the counter: whatever of them is below its far edge is not drawn.
    g.save()
    g.beginPath()
    g.rect(-4000, -4000, 8000, 4000 + COUNTER_Y + 14)
    g.clip()
    show.waiting.forEach((w) => {
      const spot = doorSpot(w.big ? 'big' : 'small')
      const x = spot.x, size = spot.size, y = spot.y + (1 - w.up) * 150
      if (w.up <= 0) return
      this.draws += drawCustomer(g, w.who, this.doorBodies.get(w.who)!, x, y, size, w.pose)
      // The small roll is held at one side in one hand; the big one low across the front, in both arms. The arms are drawn after the roll, so the hands that hold it show on it.
      g.save()
      if (w.fat) {
        g.translate(x + ROLL.big.x, y + ROLL.big.y - w.pose.lift * size - Math.abs(w.wave) * 10)
        g.rotate(-0.06 + w.wave * 0.5)
      } else {
        g.translate(x + ROLL.small.x, y + ROLL.small.y - w.pose.lift * size - Math.abs(w.wave) * 10)
        g.rotate(-0.5 + w.wave * 0.7)
      }
      stamp(g, w.fat ? scenery.bigRoll : scenery.roll)
      g.restore()
      this.draws += 1 + drawArms(g, w.who, x, y, size, w.pose)
    })
    for (const c of [show.leaving, show.customer]) if (c) this.draws += drawCustomer(g, c.who, this.bodies.get(c.who)!, c.x, c.y, c.size, c.pose)
    // The one who has eaten keeps its arms behind the counter, patting its belly and then walking out.
    if (show.leaving) this.draws += drawArms(g, show.leaving.who, show.leaving.x, show.leaving.y, show.leaving.size, show.leaving.pose)
    const anchors = show.customer ? this.anchors(show.customer, show) : null
    if (anchors) drawSoot(g, anchors, show.soot)
    if (anchors && show.wearing) drawWorn(g, anchors)
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
    // The fire is alive: three tongues inside the mouth, each to its own beat, taller while it bakes.
    g.save()
    this.trace(this.mouthRing)
    g.clip()
    for (const f of flames(show.time, show.ovenGlow)) {
      this.drift(scenery.flame, f)
      this.drift(scenery.flameCore, { ...f, size: f.size * 0.9 })
    }
    // The door: an iron plate that comes up over the mouth and shuts it. The window that glows is in the dome above it.
    if (show.door > 0.01) {
      const box = this.mouthBox
      g.translate(0, (1 - show.door) * box.h)
      plain(g, [box.x - 4, box.y - 4, box.x + box.w + 4, box.y - 4, box.x + box.w + 4, box.y + box.h + 4, box.x - 4, box.y + box.h + 4], '#7d5a4f', 6)
      // Its handle: one filled knob.
      solid(g, ellipse(box.x + box.w / 2, box.y + box.h * 0.55, 12, 10, 12), '#3b2b2b')
    }
    g.restore()
    g.restore()
    for (const s of smoke(show.time)) this.drift(scenery.smoke, s)
    // The board moves when a customer nudges it, with the pizza on it.
    stamp(g, scenery.board, show.boardX, 0)
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
      const squash = tubSquash(tub.squash.x)
      g.scale(1 + squash.wide, 1 + squash.tall)
      g.translate(0, -TUB.r * 0.8)
      stamp(g, scenery.tubs[tub.kind])
      g.restore()
      this.draws += 1
    })

    // The roll the customer brought: drawn under the card, which opens out of it and takes its place.
    if (show.roll && show.roll.left > 0.02) {
      g.save()
      g.globalAlpha = Math.min(1, show.roll.left)
      g.translate(show.roll.x, show.roll.y)
      g.rotate(show.roll.turn)
      stamp(g, show.roll.fat ? scenery.bigRoll : scenery.roll)
      g.restore()
      this.draws += 1
    }
    const card = show.card
    if (card && card.open > 0.02) {
      g.save()
      // The roll opens from the hand that holds it, at the card's near edge.
      g.translate(CARD.x, CARD.y + CARD.h / 2)
      g.rotate(card.shake * 0.012)
      g.scale(card.open, 1)
      g.translate(0, -CARD.h / 2)
      stamp(g, scenery.card)
      this.draws += 1
      g.restore()
    }

    // What reaches over the counter is drawn over the table: arms, the tongue, a flame.
    if (show.customer && anchors) {
      const c = show.customer
      this.draws += drawArms(g, c.who, c.x, c.y, c.size, c.pose)
    }
    // The pictures go on the card after the arms: a hand that holds the card or pats a picture is never over one,
    // so every drawn piece can be seen and counted at every moment.
    if (card && card.open > 0.02) {
      g.save()
      g.translate(CARD.x, CARD.y + CARD.h / 2)
      g.rotate(card.shake * 0.012)
      g.scale(card.open, 1)
      g.translate(0, -CARD.h / 2)
      card.pictured.forEach((p, i) => {
        if (i >= card.count) return
        const pat = card.patted.includes(i) ? card.pat : 0
        // Each picture is turned a little, and no two neighbours the same way, as things drawn by hand are: a row of one kind is then never a row of one sign.
        this.piece(p.kind, p.x, p.y - pat * 5, pictureTurn(i) + pat * 0.3 * Math.sin(show.time * 30), (PICTURED_R / PIECE_R) * (1 + pat * 0.35))
      })
      g.restore()
    }
    if (show.customer && anchors) {
      drawTongue(g, anchors, show.lick)
      if (show.effect) this.draws += drawEffect(g, show.effect, anchors)
    }

    for (const f of table.flights) {
      const at = flightAt(f)
      // A piece lifted off a baked pizza is toasted in the air too; one on its way from a tub is not yet.
      this.piece(f.kind, at.x, at.y, at.turn, 1.08, f.lifted && show.baked)
    }
    if (table.hand) this.piece(table.hand.kind, table.hand.x, table.hand.y, table.hand.turn, table.hand.waiting ? 1.1 : 1.24, table.hand.from !== null && show.baked)

    // What a landing leaves behind for a moment: a puff of flour off the board.
    for (const p of show.puffs) {
      const look = puff(p.age, p.cloud ? CLOUD_LASTS : PUFF_LASTS)
      // The oven's is a drawn cloud that rises as it goes; flour only dusts the board.
      if (p.cloud) this.drift(scenery.cloud, { x: p.x - look.size * 26, y: p.y - look.size * 50, size: look.size * 1.25, alpha: Math.min(1, look.alpha * 2), turn: 0 })
      else this.drift(scenery.flour, { x: p.x, y: p.y, size: look.size, alpha: look.alpha, turn: 0 })
    }

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
