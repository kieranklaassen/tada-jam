import { poseOf, neutral, type Pose } from './acting'
import { VISITORS, type VisitorId } from './cast'
import { BACKDROP } from './config'
import { paintFigures, stamp, type Figure, type Figures } from './figures'
import { drawStretch, paintFlora, type Flora } from './flora'
import { arrange, gateHold, type Actor, type Bit, type Garden, type Piece } from './garden'
import { handPose, type Guidance, type HandPose } from './guidance'
import { CAT, HIVE, SILL, STREET_SCALE, TABLE, VASE, WALL, type Vase } from './layout'
import { sheet, type G } from './paint'
import { BED, PLANTS, SOIL_Y, type Kind } from './plants'
import { ARMS, drawVisitor, restLook, type Look } from './rig'
import type { InVase } from './save'
import { paintScenery } from './scenery'
import { STAGE, fit, type Fit } from './stage'

// The view: one canvas, drawn in stage units. The still garden is painted once
// for each size of the surface and stamped with one call; every plant and
// every creature is a sprite painted at the same time, so a frame is a few
// dozen stamps and a handful of small paths (eyes, a tail, the bees).
// It reads the garden and changes nothing in it.

const TAU = Math.PI * 2
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** The layer what lies on the path is painted into: the band of the path, up to the top of a thistle stuck upright in it, and a flower's width past each end. */
const LYING = { left: -60, top: 400, width: STAGE.width + 120, height: STAGE.height - 400 + 40 }

/** The bead of sap on a fresh cut, by plant: its colour, the plants that have it, and its size. */
const BEADS: readonly (readonly [string, readonly Kind[], number])[] = [
  ['#fffdf2', ['poppy', 'dandelion'], 3.6],
  ['rgba(190,226,244,0.9)', ['onion'], 2.6],
  ['rgba(176,206,92,0.95)', ['sunflower', 'ivy'], 3],
  ['rgba(214,222,190,0.8)', ['thistle'], 1.3],
]

/** How many bees live in the bee-keeper's hat before any moves in from a bouquet. */
const LIVE_IN_HAT = 2

/** How far open the flower of a stalk that is growing back is, by how far through its growing it is: shut, then past its size with the pop, then its size. */
export function opening(u: number): number {
  const k = clamp((u - 0.55) / 0.45, 0, 1)
  return k < 0.5 ? 1.3 * (k / 0.5) : lerp(1.3, 1, (k - 0.5) / 0.5)
}

/** The most pixels to the stage unit a sprite is painted at: beyond this a large surface stretches them. */
const MAX_DENSITY = 2.5
/** A portrait of a visitor out in the street: how much room it has about the middle of its head, in the figure's own units. */
const PORTRAIT = { left: 230, top: 210, width: 460, height: 660 }
/** A bouquet out in the street, painted once each time it changes: its foot is at the anchor. */
const BUNCH = { ax: 210, ay: 430, w: 420, h: 450 }

export class View {
  private readonly g: G
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private dpr = 1
  private density = 0
  private scenery: HTMLCanvasElement | null = null
  private flora: Flora | null = null
  private figures: Figures | null = null
  private halo: Figure | null = null
  /** The visitors as they stand out in the street, painted once; and their bouquets, painted again when one changes. */
  private portraits: Partial<Record<VisitorId, HTMLCanvasElement>> = {}
  private bunches: Partial<Record<VisitorId, { version: number; figure: Figure | null }>> = {}
  /** The garden the bouquets and the path layer were painted for. */
  private painted: Garden | null = null
  /** What lies still on the path, painted once: see `path`. */
  private lying: { canvas: HTMLCanvasElement; g: G; key: string } | null = null
  private readonly looks: Record<VisitorId, Look> = { goat: restLook('goat'), beekeeper: restLook('beekeeper'), bride: restLook('bride'), aunt: restLook('aunt') }
  private readonly still: Pose = neutral()
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  private calls = 0
  /** How many motes drift in the light: the quality tier sets it. */
  motes = 16

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')! as G
  }

  /** How the stage sits in the surface: touches come back through this. */
  get fit(): Fit {
    return this.by
  }

  /** The surface has a new size or pixel ratio, in CSS pixels: the garden and every sprite are painted again for it. */
  resize(width: number, height: number, dpr: number): void {
    this.by = fit(width, height)
    this.dpr = dpr
    const scale = this.by.scale
    if (scale <= 0) return
    const { canvas: scenery, g } = sheet(this.canvas.width, this.canvas.height, 1)
    g.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * this.by.x, dpr * this.by.y)
    paintScenery(g, { left: -this.by.x / scale, top: -this.by.y / scale, right: (width - this.by.x) / scale, bottom: (height - this.by.y) / scale })
    this.scenery = scenery
    const density = Math.round(clamp(dpr * scale, 0.5, MAX_DENSITY) * 100) / 100
    if (density === this.density) return
    this.density = density
    this.flora = paintFlora(density)
    this.figures = paintFigures(density)
    this.portraits = {}
    this.bunches = {}
    this.lying = null
    const { canvas, g: light } = sheet(140, 140, density)
    const glow = light.createRadialGradient(70, 70, 4, 70, 70, 70)
    glow.addColorStop(0, 'rgba(255,232,160,0.6)')
    glow.addColorStop(0.5, 'rgba(255,214,120,0.24)')
    glow.addColorStop(1, 'rgba(255,214,120,0)')
    light.fillStyle = glow
    light.fillRect(0, 0, 140, 140)
    this.halo = { canvas, ax: 70, ay: 70, w: 140, h: 140 }
  }

  /** Draws the frame and returns how many stamps and paths it took. With no garden yet it draws the still garden alone. */
  draw(garden: Garden | null, guidance: Guidance | null): number {
    const g = this.g, { scale, x, y } = this.by
    this.calls = 0
    if (scale <= 0) return 0
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    if (this.scenery) { g.drawImage(this.scenery, 0, 0); this.calls++ } else { g.fillStyle = BACKDROP; g.fillRect(0, 0, this.canvas.width, this.canvas.height) }
    const figures = this.figures
    if (!garden || !figures || !this.flora) return this.calls
    // What was painted once for another garden is not this one's.
    if (garden !== this.painted) { this.painted = garden; this.bunches = {}; this.lying = null }
    g.setTransform(this.dpr * scale, 0, 0, this.dpr * scale, this.dpr * x, this.dpr * y)

    this.street(garden, figures)
    this.dust(garden.time)
    this.cat(garden, figures)
    if (garden.robin.state === 'perch') this.robin(garden, figures)
    // The visitor at the table stands behind it; the one who waits stands in the gateway, clear of both.
    const atTable = VISITORS.map((who) => garden.actors[who]).find((actor) => actor.where === 'table')
    const atGate = VISITORS.map((who) => garden.actors[who]).find((actor) => actor.where === 'gate')
    // The gateway is the farther of the two, so the one in it is painted first; the two stand beside each other.
    // One that leaves goes out through the gate behind the one who waits there, so it and all it carries are
    // painted before the one in the gateway.
    const leaves = atTable?.act?.name === 'leave'
    const gate = (): void => { if (atGate) { this.visitor(garden, atGate, figures); this.waiting(garden, atGate, figures) } }
    const table = (): void => {
      if (!atTable) return
      this.visitor(garden, atTable, figures)
      // On its way out the goat has its one piece behind its horn and the bride her bouquet on her head.
      if (garden.wears(atTable.who)) { g.globalAlpha = atTable.alpha; this.worn(garden, atTable, figures); g.globalAlpha = 1 }
    }
    const carried = (): void => {
      if (garden.pot.on) this.pot(garden, figures)
      if (atTable) this.arms(atTable, this.handsAtTable(garden, atTable, figures), figures)
    }
    if (leaves) { table(); carried(); gate() } else { gate(); table() }
    this.put(figures.table, 0, 0)
    if (garden.puddle) this.puddle(garden.puddle)
    if (!leaves) carried()

    if (guidance && guidance.glow > 0.01) this.glow(garden, guidance.glow)
    this.bed(garden)
    this.path(garden)
    for (const piece of garden.leaving) this.piece(piece)
    if (garden.taken) this.piece(garden.taken)
    if (garden.robin.state !== 'perch') this.robin(garden, figures)
    if (garden.pot.on) for (const piece of garden.inPot) if (arriving(piece)) this.piece(piece)
    if (garden.hand) this.piece(garden.hand)
    this.cuts(garden)
    this.bees(garden, figures)
    this.bits(garden.bits)
    this.blades(garden.scissors.x, garden.scissors.y, Math.max(garden.scissors.open, garden.scissors.snap), garden.scissors.seen * (garden.hand ? clamp(garden.scissors.snap * 2.5, 0, 1) : 1), figures)
    if (guidance && guidance.demo !== null) this.ghost(garden, guidance, figures)
    g.globalAlpha = 1
    return this.calls
  }

  private put(figure: Figure, x: number, y: number): void {
    const g = this.g
    g.drawImage(figure.canvas, x - figure.ax, y - figure.ay, figure.w, figure.h)
    this.calls++
  }

  // --- The street over the wall ----------------------------------------------------

  /** A visitor as it stands out in the street: the same figure the garden sees, painted once, at rest. */
  private portrait(who: VisitorId, figures: Figures): HTMLCanvasElement {
    let canvas = this.portraits[who]
    if (!canvas) {
      const made = sheet(PORTRAIT.width, PORTRAIT.height, this.density * 0.5)
      made.g.translate(PORTRAIT.left, PORTRAIT.top)
      drawVisitor(made.g, figures, this.flora!, this.density, restLook(who))
      // Its arms hang at its sides.
      const arms = ARMS[who]
      for (const side of [-1, 1]) {
        made.g.lineCap = 'round'
        made.g.lineWidth = arms.width
        made.g.strokeStyle = arms.sleeve
        made.g.beginPath(); made.g.moveTo(side * arms.out, arms.down); made.g.lineTo(side * (arms.out + 10), arms.down + 110); made.g.stroke()
        made.g.fillStyle = arms.hand
        made.g.beginPath(); made.g.arc(side * (arms.out + 10), arms.down + 118, arms.handR, 0, TAU); made.g.fill()
      }
      canvas = this.portraits[who] = made.canvas
    }
    return canvas
  }

  /** The bouquet a visitor has out in the street, painted once each time what is shown there changes. */
  private bunch(garden: Garden, who: VisitorId): Figure | null {
    const cached = this.bunches[who]
    if (cached && cached.version === garden.streetVersion) return cached.figure
    const bouquet = garden.streetSeen.find((each) => each.who === who)
    let figure: Figure | null = null
    if (bouquet) {
      const { canvas, g } = sheet(BUNCH.w, BUNCH.h, this.density * 0.6)
      g.translate(BUNCH.ax, BUNCH.ay)
      const flora = this.flora!
      const straight = (piece: InVase, most: number): void => {
        const spot = BED[piece.stem], sprite = piece.spent ? flora[spot.kind].spent : flora[spot.kind].whole
        const to = piece.head ? sprite.full : (piece.base + piece.len) / spot.scale
        g.scale(spot.scale, spot.scale)
        drawStretch(g, sprite, this.density, Math.max(piece.base / spot.scale, to - most / spot.scale), to)
      }
      const pieces = bouquet.pieces
      if (who === 'goat') {
        // The one piece it kept, behind its horn.
        g.rotate(0.95)
        straight(pieces[0], 240)
      } else if (who === 'bride') {
        // Tipped onto her head and worn as a crown: the flowers in an arc.
        pieces.forEach((piece, index) => {
          const a = pieces.length === 1 ? 0 : lerp(-1.25, 1.25, index / (pieces.length - 1))
          g.save(); g.translate(Math.sin(a) * 34, 8 - Math.cos(a) * 12); g.rotate(a * 0.9); straight(piece, 70); g.restore()
        })
      } else {
        // Stood on the hive, or on the table at the aunt's window: as it stood in the vase.
        const looks = arrange(pieces.map((piece) => ({ at: piece.at, len: piece.len, kind: BED[piece.stem].kind, head: piece.head, scale: BED[piece.stem].scale })), VASE.jar)
        pieces.forEach((piece, index) => {
          g.save(); g.translate(piece.at * 1.6, 0); g.rotate(looks[index].lean * (who === 'aunt' ? 0.5 : 1.5)); straight(piece, 300); g.restore()
        })
      }
      figure = { canvas, ax: BUNCH.ax, ay: BUNCH.ay, w: BUNCH.w, h: BUNCH.h }
    }
    this.bunches[who] = { version: garden.streetVersion, figure }
    return figure
  }

  private putBunch(figure: Figure, x: number, y: number, k: number): void {
    const g = this.g
    g.drawImage(figure.canvas, x - figure.ax * k, y - figure.ay * k, figure.w * k, figure.h * k)
    this.calls++
  }

  /** Where the bouquet a visitor wears is: behind the goat's horn, on the bride's head. */
  private worn(garden: Garden, actor: Actor, figures: Figures): void {
    if (actor.who !== 'goat' && actor.who !== 'bride') return
    const figure = this.bunch(garden, actor.who)
    if (!figure) return
    const s = actor.scale, hy = actor.feetY - figures.floors[actor.who] * s
    if (actor.who === 'goat') this.putBunch(figure, actor.x + 44 * s, hy - 70 * s, s)
    else this.putBunch(figure, actor.x, hy - 40 * s, s)
  }

  private street(garden: Garden, figures: Figures): void {
    const g = this.g
    g.save()
    g.beginPath()
    g.rect(WALL.left, -4000, WALL.right - WALL.left, 4000 + WALL.top)
    g.clip()
    // The bee-keeper's bouquet stands on the hive and the aunt's on the table at her window, whoever is at home.
    const onHive = this.bunch(garden, 'beekeeper'), onSill = this.bunch(garden, 'aunt')
    if (onHive) this.putBunch(onHive, HIVE.x, HIVE.top + 6, STREET_SCALE)
    // The aunt squares hers to the edge of the table with two small pushes.
    if (onSill) this.putBunch(onSill, SILL.x + (garden.squaring > 0.6 ? 7 : garden.squaring > 0.34 ? 3 : 0), SILL.top, STREET_SCALE)
    for (const who of VISITORS) {
      const actor = garden.actors[who]
      if (actor.where !== 'street') continue
      const s = actor.scale, hy = actor.feetY - figures.floors[who] * s
      g.drawImage(this.portrait(who, figures), actor.x - PORTRAIT.left * s, hy - PORTRAIT.top * s, PORTRAIT.width * s, PORTRAIT.height * s)
      this.calls++
      this.worn(garden, actor, figures)
    }
    g.restore()
  }

  // --- The visitors -----------------------------------------------------------------

  /** A visitor in the garden, played by its own rig: at the table, on its way, or waiting in the gateway. */
  private visitor(garden: Garden, actor: Actor, figures: Figures): void {
    const g = this.g, who = actor.who, s = actor.scale
    const pose = actor.act ? poseOf(who, actor.act) : this.still
    const hx = actor.x, hy = actor.feetY - figures.floors[who] * s
    const look = this.looks[who]
    look.pose = pose
    look.act = actor.act
    look.time = garden.time
    look.gazeX = pose.lookX ?? clamp((actor.lookX - hx) / (240 * s), -1, 1)
    look.gazeY = pose.lookY ?? clamp((actor.lookY - hy) / (220 * s), -1, 1)
    look.blink = actor.blink > 0
    // It leans in to what has just arrived in its vase, and holds its muzzle out to it between its looks.
    look.lean = actor.act ? 0 : Math.max(clamp(actor.lean / 0.25, 0, 1) * clamp((1.1 - actor.lean) / 0.2, 0, 1), actor.offer * 0.45)
    look.yellow = actor.yellow
    look.loose = actor.loose
    if (who === 'goat') {
      const goat = garden.goat
      look.chew = goat.chew; look.perk = goat.perk; look.lick = goat.lick
      look.flick = goat.flick > 0 ? (goat.flick / 0.3) * (goat.flickEar ? 1 : -1) : 0
    }
    const turn = Math.abs(pose.turn) < 0.08 ? 0.08 * (pose.turn < 0 ? -1 : 1) : pose.turn
    g.save()
    g.globalAlpha = actor.alpha
    g.translate(actor.x + pose.dx * s, actor.feetY + pose.dy * s)
    g.scale(s * turn, s)
    g.translate(0, -figures.floors[who])
    this.calls += drawVisitor(g, figures, this.flora!, this.density, look)
    g.restore()
    g.globalAlpha = 1
  }

  /** The one who waits: its empty vase held up on its head in plain view, in both hands, and the bouquet it still wears. */
  private waiting(garden: Garden, actor: Actor, figures: Figures): void {
    const g = this.g, who = actor.who, s = actor.scale
    const vase = VASE[garden.next.vase]
    const pose = actor.act ? poseOf(who, actor.act) : this.still
    const hold = gateHold(who)
    const y = hold.y + pose.dy * s * 2.2
    g.globalAlpha = actor.alpha
    this.worn(garden, actor, figures)
    g.save()
    g.translate(actor.x + pose.dx * s, y)
    g.rotate(pose.tilt)
    g.scale(s, s)
    g.translate(-vase.x, -TABLE.top)
    this.put(figures.pots[vase.id], 0, 0)
    g.restore()
    const reach = (vase.halfMouth + 12) * s
    this.arms(actor, [actor.x - reach, y - vase.tall * 0.42 * s, actor.x + reach, y - vase.tall * 0.42 * s], figures)
    g.globalAlpha = 1
  }

  /** Where the hands of the visitor at the table are: on the vase a scene has it holding, held out to the vase, or on the table. */
  private handsAtTable(garden: Garden, actor: Actor, figures: Figures): [number, number, number, number] {
    const who = actor.who, s = actor.scale, vase = garden.vaseDef
    const pose = actor.act ? poseOf(who, actor.act) : this.still
    const hy = actor.feetY - figures.floors[who] * s
    if (garden.holds(who)) {
      const high = TABLE.top - vase.tall * 0.42
      const a = garden.potPoint(vase.x - vase.halfMouth - 8, high), b = garden.potPoint(vase.x + vase.halfMouth + 8, high)
      const name = actor.act?.name
      // The aunt straightens a piece, or measures the stalks, with one fingertip; the bee-keeper holds a glass to her eye.
      if (who === 'aunt' && (name === 'cannot' || name === 'stalks')) {
        // Her fingertip is on the piece she puts right, where it bends or at its top.
        const mended = garden.mend?.piece
        const [, , tx, ty] = mended ? garden.spine(mended) : [0, 0, vase.x + 6, vase.mouthY - 70]
        const to = garden.potPoint(tx + 8, ty)
        b.x = lerp(b.x, to.x, pose.reach); b.y = lerp(b.y, to.y, pose.reach)
      }
      if (who === 'beekeeper' && name === 'stalks') { b.x = actor.x - 46; b.y = hy + 6 }
      return [a.x, a.y, b.x, b.y]
    }
    const x = actor.x + pose.dx * s
    if (actor.act?.name === 'stepBack') {
      // Its hands are up beside it while it looks, and go to the vase to stand it up again.
      const high = TABLE.top - vase.tall * 0.5, to = pose.reach
      const a = garden.potPoint(vase.x - vase.halfMouth - 6, high), b = garden.potPoint(vase.x + vase.halfMouth + 6, high)
      return [lerp(x - 80 * s, a.x, to), lerp(hy + 30 * s, a.y, to), lerp(x + 80 * s, b.x, to), lerp(hy + 30 * s, b.y, to)]
    }
    if (s < 0.98) return [x - (ARMS[who].out + 10) * s, hy + (ARMS[who].down + 110) * s, x + (ARMS[who].out + 10) * s, hy + (ARMS[who].down + 110) * s]
    const out = Math.max(actor.offer, pose.reach)
    const restY = TABLE.top - 8 + pose.dy * 0.4
    // With its vase empty it has both hands on its own side of it, one at the rim and one at the foot, and holds it out: the vase stays in plain view.
    const holds = actor.present
    const near = garden.potPoint(vase.x + vase.halfMouth + 6, TABLE.top - vase.tall * 0.78), far = garden.potPoint(vase.x + vase.halfMouth + 12, TABLE.top - vase.tall * 0.16)
    return [
      lerp(lerp(x - 40, vase.x + vase.halfMouth + 36, out), near.x, holds), lerp(lerp(restY, vase.mouthY + vase.tall * 0.5, out), near.y, holds),
      lerp(x + 62, far.x, holds), lerp(restY, far.y, holds),
    ]
  }

  /** Two arms from the shoulders to where the hands are, each visitor's own: hooves, mitts, bare hands, thin dark sleeves. */
  private arms(actor: Actor, hands: readonly [number, number, number, number], figures: Figures): void {
    const g = this.g, who = actor.who, s = actor.scale, arms = ARMS[who]
    const pose = actor.act ? poseOf(who, actor.act) : this.still
    const sy = actor.feetY + pose.dy * s - (figures.floors[who] - arms.down) * s
    const sx = actor.x + pose.dx * s
    g.globalAlpha = actor.alpha
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.lineWidth = arms.width * s
    g.strokeStyle = arms.sleeve
    g.beginPath()
    for (const side of [-1, 1]) {
      const fromX = sx + side * arms.out * s * Math.abs(pose.turn)
      const toX = hands[side < 0 ? 0 : 2], toY = hands[side < 0 ? 1 : 3]
      g.moveTo(fromX, sy)
      // The elbow hangs out and down.
      g.quadraticCurveTo((fromX + toX) / 2 + side * 16 * s, Math.max(sy, toY) + 14 * s, toX, toY)
    }
    g.stroke()
    g.fillStyle = arms.hand
    g.beginPath()
    for (const at of [0, 2]) { g.moveTo(hands[at] + arms.handR * s, hands[at + 1]); g.arc(hands[at], hands[at + 1], arms.handR * s, 0, TAU) }
    g.fill()
    this.calls += 2
    if (who === 'beekeeper' && actor.act?.name === 'stalks') {
      // Her glass: a thick lens in a brass rim on a turned wooden handle that she grips, so it is a thing and no ring.
      const hx = hands[2], hy = hands[3], lx = hx - 30, ly = hy - 34
      g.lineWidth = 9
      g.strokeStyle = '#6b4526'
      g.beginPath(); g.moveTo(lx + 13, ly + 15); g.lineTo(hx + 8, hy + 10); g.stroke()
      g.lineWidth = 13
      g.strokeStyle = '#8a5c30'
      g.beginPath(); g.moveTo(hx - 2, hy - 1); g.lineTo(hx + 8, hy + 10); g.stroke()
      // The lens is solid glass: a pale disc with the darker far edge of its thickness and a streak of the window on it.
      g.fillStyle = '#c9a23c'
      g.beginPath(); g.arc(lx, ly, 23, 0, TAU); g.fill()
      g.fillStyle = '#9fc4cf'
      g.beginPath(); g.arc(lx, ly, 18, 0, TAU); g.fill()
      g.fillStyle = '#d9eef2'
      g.beginPath(); g.ellipse(lx - 3, ly - 3, 13, 12, 0, 0, TAU); g.fill()
      g.lineWidth = 4
      g.strokeStyle = 'rgba(255,255,255,0.9)'
      g.beginPath(); g.moveTo(lx - 11, ly - 2); g.lineTo(lx - 3, ly - 11); g.stroke()
      this.calls += 6
    }
    g.globalAlpha = 1
  }

  // --- The vase ---------------------------------------------------------------------

  /** The vase on the table as it now is: carried, lifted, rocking, going over. What stands in it moves with it. */
  private pot(garden: Garden, figures: Figures): void {
    const g = this.g, pot = garden.pot, vase = garden.vaseDef, at = garden.potAt
    const rock = pot.rock > 0 ? Math.sin(pot.rock * 21) * 0.055 * Math.min(1, pot.rock / 0.5) : 0
    g.save()
    g.translate(vase.x + at.dx, TABLE.top + at.dy)
    g.rotate(at.tilt + rock)
    g.scale(at.scale, at.scale)
    g.translate(-vase.x, -TABLE.top)
    // The dark inside of the mouth.
    g.fillStyle = '#190e07'
    g.beginPath(); g.ellipse(vase.x, vase.mouthY + 3, vase.halfMouth - 1, Math.min(9, vase.halfMouth * 0.3), 0, 0, TAU); g.fill()
    this.calls++
    // What stands in the vase shows above its mouth and nowhere else; a piece still on its way over is in front.
    g.save()
    g.beginPath()
    g.rect(-2000, -2000, 6000, 2000 + vase.mouthY)
    g.rect(vase.x - vase.halfMouth + 2, vase.mouthY - 1, vase.halfMouth * 2 - 4, 10)
    g.clip()
    let stalks = false
    for (const piece of garden.inPot) if (!arriving(piece)) { this.piece(piece); stalks ||= !piece.head }
    if (stalks) {
      // The pale cut on top of each bare stalk.
      g.beginPath()
      for (const piece of garden.inPot) {
        if (piece.head || arriving(piece)) continue
        const [, , tx, ty] = garden.spine(piece)
        g.moveTo(tx + 5, ty); g.ellipse(tx, ty, 5 * piece.scale + 1, 2.6, piece.prot, 0, TAU)
      }
      g.fillStyle = '#dbe8ae'; g.fill()
      this.calls++
    }
    g.restore()
    this.put(figures.pots[vase.id], 0, 0)
    this.tendrils(garden, vase)
    g.restore()
  }

  /** The water a vase spilled: it runs over the table and soaks away. */
  private puddle(puddle: { x: number; side: number; u: number }): void {
    const g = this.g
    const grow = clamp(puddle.u / 0.25, 0, 1), fade = 1 - clamp((puddle.u - 0.45) / 0.55, 0, 1)
    const x = clamp(puddle.x, TABLE.left + 40, TABLE.right - 40)
    g.fillStyle = `rgba(170,214,236,${(0.7 * fade).toFixed(3)})`
    g.beginPath()
    // It spreads round on the table where the vase fell, drips off it (the drops are loose bits), and a second
    // pool spreads on the ground to that side and soaks away. No streak joins the two.
    g.ellipse(x, TABLE.top + 5, 26 + 40 * grow, 5 + 6 * grow, 0, 0, TAU)
    const soaks = clamp((puddle.u - 0.14) / 0.3, 0, 1)
    if (soaks > 0) {
      const gx = x + puddle.side * 96, gy = TABLE.bottom + 4
      g.moveTo(gx + 22 + 34 * soaks, gy)
      g.ellipse(gx, gy, 22 + 34 * soaks, 4 + 4 * soaks, 0, 0, TAU)
    }
    g.fill()
    this.calls++
  }

  // --- The plants ---------------------------------------------------------------

  /**
   * What lies on the path. The pieces at rest are painted once into one layer, which is painted again only when
   * one of them changes, so a full path costs one stamp a frame; a piece that is falling or landing is drawn live.
   */
  private path(garden: Garden): void {
    let key = String(this.density), still = 0
    for (const piece of garden.path) {
      if (piece.move) continue
      still++
      key += `|${piece.id},${piece.px},${piece.py},${piece.prot},${piece.base},${piece.len},${piece.shownSpent ? 1 : 0},${piece.bend},${piece.bendAt}`
    }
    if (still) {
      let layer = this.lying
      if (!layer) layer = this.lying = { ...sheet(LYING.width, LYING.height, this.density), key: '' }
      if (layer.key !== key) {
        layer.key = key
        layer.g.clearRect(0, 0, LYING.width, LYING.height)
        layer.g.save()
        layer.g.translate(-LYING.left, -LYING.top)
        for (const piece of garden.path) if (!piece.move) this.piece(piece, layer.g)
        layer.g.restore()
      }
      this.g.drawImage(layer.canvas, LYING.left, LYING.top, LYING.width, LYING.height)
      this.calls++
    }
    for (const piece of garden.path) if (piece.move && piece.move !== 'wait') this.piece(piece)
  }

  /** One piece of a stem, on the surface or, for the layer of the path, on `g`, where it is not counted as drawn this frame. */
  private piece(piece: Piece, onto?: G): void {
    const g = onto ?? this.g, flora = this.flora!
    const sprite = piece.shownSpent ? flora[piece.kind].spent : flora[piece.kind].whole
    const s = piece.scale
    const from = piece.base / s
    const to = piece.head ? sprite.full : (piece.base + piece.len) / s
    const bendAt = Math.min(piece.bendAt, piece.len) / s
    g.save()
    g.translate(piece.px, piece.py)
    g.rotate(piece.prot)
    g.scale(s * Math.max(0.04, piece.wide), s * piece.stretch)
    if (piece.bend && from + bendAt < to - 2) {
      // A tipped head bows over in a curve: the stalk turns twice over a short stretch, not at one kink.
      const turns = 2, arc = Math.min(22, (to - from - bendAt) / (turns + 1))
      drawStretch(g, sprite, this.density, from, from + bendAt)
      g.translate(0, -bendAt)
      for (let i = 0; i < turns; i++) {
        g.rotate(piece.bend / turns)
        const start = from + bendAt + i * arc
        drawStretch(g, sprite, this.density, start, i === turns - 1 ? to : start + arc + 1)
        g.translate(0, -arc)
      }
      if (!onto) this.calls += turns + 1
    } else {
      drawStretch(g, sprite, this.density, from, to)
      if (!onto) this.calls++
    }
    g.restore()
  }

  /** The twelve stems of the bed. A stalk that waits its turn to be seen growing is drawn as the stalk it was. */
  private bed(garden: Garden): void {
    const g = this.g, flora = this.flora!
    for (const stem of garden.stems) {
      const sprite = flora[stem.kind].whole
      g.save()
      g.translate(stem.x, SOIL_Y)
      g.rotate(stem.sway)
      if (stem.grow < 1 && !stem.hold) {
        // Shooting back up: the whole plant, pulled out of the earth past its height and settling.
        const u = stem.grow
        const over = 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2
        const share = lerp(stem.grewFrom / stem.full, 1, over)
        g.scale(stem.scale * (1.12 - 0.12 * share), stem.scale * share)
        // The stalk shoots up shut, and its flower opens with the pop: from nothing, past its size, and back.
        const stalk = sprite.full - PLANTS[stem.kind].head, open = opening(u)
        drawStretch(g, sprite, this.density, 0, stalk)
        if (open > 0.02) {
          g.translate(0, -stalk)
          g.scale(open, open / share)
          drawStretch(g, sprite, this.density, stalk, sprite.full)
          this.calls++
        }
      } else {
        const height = stem.hold ? stem.grewFrom : stem.height
        g.scale(stem.scale, stem.scale)
        drawStretch(g, sprite, this.density, 0, height >= stem.full ? sprite.full : height / stem.scale)
      }
      this.calls++
      g.restore()
    }
  }

  /**
   * Every cut, in one pass: the pale face of the cut on each stalk of the bed and on both ends of each piece that
   * lies or is carried, with a darker rim so that it reads as the end of a round stalk; and the beads of sap.
   */
  private cuts(garden: Garden): void {
    const g = this.g
    let any = false
    // A dandelion's stalk is hollow: its cut is a little open tube, so its face gets a dark middle.
    const tubes: number[] = []
    g.beginPath()
    const face = (x: number, y: number, rot: number, r: number, kind: Kind): void => {
      g.moveTo(x + Math.cos(rot) * r, y + Math.sin(rot) * r); g.ellipse(x, y, r, r * 0.5, rot, 0, TAU); any = true
      if (kind === 'dandelion') tubes.push(x, y, rot, r)
    }
    for (const stem of garden.stems) {
      const height = stem.hold ? stem.grewFrom : stem.height
      if (height >= stem.full || (stem.grow < 1 && !stem.hold)) continue
      face(stem.x + Math.sin(stem.sway) * height, SOIL_Y - Math.cos(stem.sway) * height, stem.sway, 5, stem.kind)
    }
    const loose = garden.hand ? [...garden.path, ...garden.leaving, garden.hand] : [...garden.path, ...garden.leaving]
    for (const piece of loose) {
      if (piece.move === 'wait') continue
      face(piece.px, piece.py, piece.prot, 4.4 * piece.scale + 0.6, piece.kind)
      if (piece.head || piece.bend) continue
      const [, , tx, ty] = garden.spine(piece)
      face(tx, ty, piece.prot, 4.4 * piece.scale + 0.6, piece.kind)
    }
    if (any) {
      g.fillStyle = '#dbe8ae'; g.fill()
      g.lineWidth = 1.3; g.strokeStyle = 'rgba(70,96,40,0.75)'; g.stroke()
      this.calls += 2
    }
    if (tubes.length) {
      g.beginPath()
      for (let i = 0; i < tubes.length; i += 4) { const r = tubes[i + 3] * 0.58; g.moveTo(tubes[i] + Math.cos(tubes[i + 2]) * r, tubes[i + 1] + Math.sin(tubes[i + 2]) * r); g.ellipse(tubes[i], tubes[i + 1], r, r * 0.5, tubes[i + 2], 0, TAU) }
      g.fillStyle = '#31401c'; g.fill()
      this.calls++
    }
    // The bead that stands on a fresh cut is the plant's own: white milk on a poppy and a dandelion, clear water on an
    // onion, thick green sap on a sunflower and an ivy, and next to nothing on a dry thistle.
    for (const [color, kinds, big] of BEADS) {
      let beads = 0
      g.beginPath()
      for (const stem of garden.stems) {
        if (stem.sap <= 0 || stem.height >= stem.full || !kinds.includes(stem.kind)) continue
        const size = big * clamp(stem.sap / 0.4, 0, 1)
        const x = stem.x + Math.sin(stem.sway) * stem.height + 3, y = SOIL_Y - Math.cos(stem.sway) * stem.height + (1.5 - stem.sap) * (stem.kind === 'onion' ? 16 : 7)
        g.moveTo(x + size, y)
        g.arc(x, y, size, 0, TAU)
        beads++
      }
      if (beads) { g.fillStyle = color; g.fill(); this.calls++ }
    }
  }

  /** An ivy in the vase sends a tendril out over the rim and down the outside. */
  private tendrils(garden: Garden, vase: Vase): void {
    const g = this.g
    const creeping = garden.inPot.filter((piece) => piece.kind === 'ivy' && piece.creep > 0.02 && piece.move !== 'toVase')
    if (!creeping.length) return
    const reach = Math.min(62, vase.tall * 0.7)
    g.beginPath()
    for (const piece of creeping) {
      const x0 = vase.x + (piece.at / 10) * vase.halfMouth * 0.6, y0 = vase.mouthY + 6
      const side = piece.at >= 0 ? 1 : -1
      g.moveTo(x0, y0)
      for (let i = 1; i <= 8; i++) {
        const u = (i / 8) * piece.creep
        g.lineTo(x0 + side * Math.sin(u * 5) * 7, y0 + (i / 8) * reach * piece.creep)
      }
    }
    g.lineCap = 'round'
    g.lineJoin = 'round'
    // A dark line under a lighter one, so the tendril has the ridge of a brush stroke like the stems.
    g.lineWidth = 4.6; g.strokeStyle = '#27501f'; g.stroke()
    g.lineWidth = 2.6; g.strokeStyle = '#5fa648'; g.stroke()
    g.beginPath()
    for (const piece of creeping) {
      const x0 = vase.x + (piece.at / 10) * vase.halfMouth * 0.6, y0 = vase.mouthY + 6
      const side = piece.at >= 0 ? 1 : -1
      for (let i = 1; i <= 3; i++) {
        const u = (i / 3.4) * piece.creep
        const x = x0 + side * Math.sin(u * 5) * 7 + (i % 2 ? 6 : -6), y = y0 + (i / 3.4) * reach * piece.creep
        g.moveTo(x + 6, y)
        g.ellipse(x, y, 6, 4, i % 2 ? 0.5 : -0.5, 0, TAU)
      }
    }
    g.fillStyle = '#6fae4c'
    g.fill()
    this.calls += 3
  }

  /** Where the middle of a piece's flower is, as it is drawn. */
  private flowerOf(piece: Piece): { x: number; y: number } {
    const d = Math.max(0, piece.len - PLANTS[piece.kind].head * piece.scale * 0.5)
    const lower = piece.bend ? Math.min(piece.bendAt, piece.len) : piece.len
    if (d <= lower) return { x: piece.px + Math.sin(piece.prot) * d * piece.stretch, y: piece.py - Math.cos(piece.prot) * d * piece.stretch }
    const turn = piece.prot + piece.bend
    return { x: piece.px + Math.sin(piece.prot) * lower + Math.sin(turn) * (d - lower), y: piece.py - Math.cos(piece.prot) * lower - Math.cos(turn) * (d - lower) }
  }

  /** The bees: one rides each sunflower, onion flower and thistle; the bee-keeper's live in her hat; and hers circle the bouquet on the hive. */
  private bees(garden: Garden, figures: Figures): void {
    const g = this.g
    const at: number[] = []
    const add = (x: number, y: number, lift: number, span: number, id: number): void => {
      const u = clamp(lift / span, 0, 1), up = Math.sin(u * Math.PI)
      at.push(x + 9 + Math.sin(u * 17 + id) * 20 * up, y - 8 - up * 44 + Math.cos(u * 23 + id) * 7 * up, up)
    }
    for (const stem of garden.stems) {
      if (!PLANTS[stem.kind].bee || stem.height < stem.full || stem.grow < 1) continue
      const high = stem.full - PLANTS[stem.kind].head * stem.scale * 0.5
      add(stem.x + Math.sin(stem.sway) * high, SOIL_Y - Math.cos(stem.sway) * high, stem.lift, 1, stem.index)
    }
    const riding = (piece: Piece, inPot: boolean): void => {
      // Not seen: a piece that is on the visitor for a moment. In a vase that is going over the bee still rides.
      if (!piece.head || piece.noBee || !PLANTS[piece.kind].bee || (piece.move === 'wait' && !inPot)) return
      const flower = this.flowerOf(piece)
      const where = inPot ? garden.potPoint(flower.x, flower.y) : flower
      add(where.x, where.y, piece.lift, 0.8, piece.id)
    }
    if (garden.pot.on) for (const piece of garden.inPot) riding(piece, true)
    for (const piece of garden.path) riding(piece, false)
    if (garden.hand) riding(garden.hand, false)
    // The bees in her hat fly round it, and hang low when a bouquet brought them no company.
    const keeper = garden.actors.beekeeper
    // Two live in her hat and fly round it wherever she stands in the garden; those that move in from a bouquet join them.
    const hatBees = LIVE_IN_HAT + keeper.hatBees
    if (keeper.where === 'table' || keeper.where === 'gate') {
      const s = keeper.scale, hy = keeper.feetY - figures.floors.beekeeper * s
      for (let i = 0; i < hatBees; i++) {
        const a = garden.time * (keeper.sag > 0 ? 0.7 : 2.4) + (i * TAU) / hatBees
        at.push(keeper.x + Math.cos(a) * 84 * s, hy - (keeper.sag > 0 ? 20 : 86) * s + Math.sin(a * 1.3) * 16 * s, keeper.sag > 0 ? 0 : 1)
      }
    }
    if (garden.streetSeen.some((bouquet) => bouquet.who === 'beekeeper')) {
      for (let i = 0; i < 3; i++) { const a = garden.time * 1.7 + i * 2.1; at.push(HIVE.x + Math.cos(a) * 44, HIVE.top - 36 + Math.sin(a * 1.4) * 22, 1) }
    }
    if (!at.length) return
    const wing = Math.sin(garden.time * 70)
    g.beginPath()
    for (let i = 0; i < at.length; i += 3) {
      // Wings only blur while it flies; at rest they lie folded along its back.
      const flying = at[i + 2] > 0.02
      for (const side of [-1, 1]) {
        g.moveTo(at[i] + 5, at[i + 1] - 4)
        g.ellipse(at[i] - 1, at[i + 1] - 4.5, 5, flying ? 2.6 : 1.6, side * (flying ? 0.6 + wing * 0.4 : 0.12), 0, TAU)
      }
    }
    g.fillStyle = 'rgba(236,244,250,0.72)'
    g.fill()
    g.beginPath()
    for (let i = 0; i < at.length; i += 3) { g.moveTo(at[i] + 6.5, at[i + 1]); g.ellipse(at[i], at[i + 1], 6.5, 4.4, 0, 0, TAU) }
    g.fillStyle = '#f0b21c'
    g.fill()
    g.beginPath()
    for (let i = 0; i < at.length; i += 3) {
      g.rect(at[i] - 2.6, at[i + 1] - 4, 2, 8)
      g.rect(at[i] + 1.2, at[i + 1] - 3.6, 2, 7.2)
      g.moveTo(at[i] + 8.4, at[i + 1]); g.arc(at[i] + 6.2, at[i + 1], 2.3, 0, TAU)
    }
    g.fillStyle = '#2a1a0e'
    g.fill()
    this.calls += 3
  }

  // --- Loose things -----------------------------------------------------------

  private bits(bits: readonly Bit[]): void {
    if (!bits.length) return
    const g = this.g
    const colors: Record<Bit['kind'], string> = { seed: '#3d2713', petal: '#e03c1f', fluff: 'rgba(255,253,242,0.9)', haze: 'rgba(172,226,104,0.34)', drop: 'rgba(214,236,250,0.85)' }
    for (const kind of ['haze', 'seed', 'petal', 'fluff', 'drop'] as const) {
      let any = false
      g.beginPath()
      for (const bit of bits) {
        if (bit.kind !== kind) continue
        const fade = clamp((bit.life - bit.age) / 0.3, 0, 1)
        const size = bit.size * fade * (kind === 'haze' ? 1 + bit.age * 1.2 : 1)
        if (size <= 0.2) continue
        const wide = kind === 'petal' || kind === 'seed' ? size * 0.5 : kind === 'fluff' ? size * 0.34 : size * 0.5
        const high = kind === 'petal' ? size * 0.32 : kind === 'seed' ? size * 0.3 : kind === 'drop' ? size * 0.7 : wide
        const turn = kind === 'petal' ? bit.spin : 0
        g.moveTo(bit.x + Math.cos(turn) * wide, bit.y + Math.sin(turn) * wide)
        g.ellipse(bit.x, bit.y, wide, high, turn, 0, TAU)
        any = true
      }
      if (!any) continue
      g.fillStyle = colors[kind]
      g.fill()
      this.calls++
    }
  }

  /** Dust in the light from the window. */
  private dust(time: number): void {
    if (this.motes <= 0) return
    const g = this.g
    g.beginPath()
    for (let i = 0; i < this.motes; i++) {
      const fall = (i * 61 + time * (5 + (i % 4))) % 470
      const x = 290 + ((i * 97) % 400) + fall * 0.35 + Math.sin(time * 0.3 + i * 1.7) * 26
      const y = 130 + fall
      const r = 1.1 + (i % 3) * 0.6
      g.moveTo(x + r, y)
      g.arc(x, y, r, 0, TAU)
    }
    g.fillStyle = 'rgba(255,232,188,0.32)'
    g.fill()
    this.calls++
  }

  /** The first step of the idle ladder: a warm light on what a finger could touch now. */
  private glow(garden: Garden, strength: number): void {
    const g = this.g, halo = this.halo
    if (!halo) return
    g.globalAlpha = strength * (0.62 + 0.2 * Math.sin(garden.time * 2.6))
    for (const lit of garden.glows()) {
      g.drawImage(halo.canvas, lit.x - 70 * lit.size, lit.y - 70 * lit.size, 140 * lit.size, 140 * lit.size)
      this.calls++
    }
    g.globalAlpha = 1
  }

  // --- The scissors and the ghost hand ---------------------------------------------

  /** The scissors, their crossing just short of the points, at the finger: handles up and away from the hand that hides the glass below it. */
  private blades(x: number, y: number, open: number, alpha: number, figures: Figures): void {
    if (alpha <= 0.01) return
    const g = this.g
    const turn = 2.46, reach = 56
    g.globalAlpha = alpha
    for (const side of [-1, 1]) {
      g.save()
      g.translate(x - Math.sin(turn) * reach, y + Math.cos(turn) * reach)
      g.rotate(turn)
      g.scale(side, 1)
      g.rotate(-open * 0.42)
      stamp(g, figures.blade)
      g.restore()
    }
    this.calls += 2
    g.globalAlpha = 1
  }

  /** The second step of the idle ladder: a hand shows one move, across a stem with the blades or from the path to the vase. */
  private ghost(garden: Garden, guidance: Guidance, figures: Figures): void {
    const hint = garden.hint(guidance.demoIndex)
    if (!hint || guidance.demo === null) return
    const g = this.g
    const drag = hint.fromX !== hint.toX || hint.fromY !== hint.toY
    const pose = handPose(guidance.demo, drag, this.pose)
    const x = lerp(hint.fromX, hint.toX, pose.travel), y = lerp(hint.fromY, hint.toY, pose.travel)
    if (hint.cut && pose.press > 0.05) this.blades(x, y, pose.travel < 0.5 ? 1 : 0, pose.opacity * 0.7 * clamp(pose.press * 3, 0, 1), figures)
    g.save()
    g.globalAlpha = pose.opacity * 0.92
    g.translate(x + 2, y + 4 + (1 - pose.press) * 12)
    g.scale(1 - pose.press * 0.07, 1 - pose.press * 0.07)
    stamp(g, figures.hand)
    g.restore()
    g.globalAlpha = 1
    this.calls++
  }

  // --- The creatures ---------------------------------------------------------------

  private cat(garden: Garden, figures: Figures): void {
    const g = this.g, cat = garden.cat
    const poke = cat.poke > 0 ? Math.sin((cat.poke / 0.7) * Math.PI) : 0
    // The tail hangs off the sill and sways; it lashes when the cat is touched.
    const swing = Math.sin(cat.tail) * (cat.twitch > 0 || cat.poke > 0 ? 16 : 7)
    const tx = CAT.x + 88, ty = CAT.y + 2
    g.lineCap = 'round'
    for (const [width, color, off] of [[13, '#6f3a12', 1.5], [10, '#c7742b', 0]] as const) {
      g.strokeStyle = color
      g.lineWidth = width
      g.beginPath()
      g.moveTo(tx - 8 + off, ty - 6 + off)
      g.bezierCurveTo(tx + 18 + off, ty + 6 + off, tx + 14 + swing * 0.5 + off, ty + 44 + off, tx + 6 + swing + off, ty + 72 + off)
      g.stroke()
    }
    // It breathes in its sleep, and flattens when poked.
    g.save()
    g.translate(CAT.x, CAT.y + 22)
    g.scale(1 + poke * 0.04, 1 + Math.sin(cat.breath) * 0.022 - poke * 0.1)
    g.translate(-CAT.x, -(CAT.y + 22))
    this.put(figures.cat, 0, 0)
    const ex = CAT.x - 57, ey = CAT.y - 15
    if (cat.eye > 0) {
      const wide = clamp(cat.eye / 0.15, 0, 1)
      g.fillStyle = '#c9d64a'
      g.beginPath(); g.ellipse(ex, ey, 6, 4.6 * wide, 0, 0, TAU); g.fill()
      g.fillStyle = '#17100a'
      g.beginPath(); g.ellipse(ex, ey, 1.6, 4 * wide, 0, 0, TAU); g.fill()
      this.calls++
    } else {
      g.strokeStyle = '#4a250c'
      g.lineWidth = 1.8
      g.beginPath(); g.moveTo(ex - 6, ey); g.quadraticCurveTo(ex, ey + 4, ex + 6, ey); g.stroke()
    }
    g.restore()
    this.calls += 3
  }

  private robin(garden: Garden, figures: Figures): void {
    const g = this.g, robin = garden.robin
    const flying = robin.state !== 'perch'
    const hop = robin.hop > 0 ? Math.sin(clamp(robin.hop / 0.3, 0, 1) * Math.PI) * 9 : 0
    g.save()
    g.translate(robin.x, robin.y + 22 - hop)
    g.scale(robin.turn * 1.25, 1.25)
    if (flying) g.rotate(-0.25)
    stamp(g, figures.robin)
    g.translate(-3, -19)
    g.rotate(flying ? Math.sin(robin.flap) * 1.1 - 0.5 : hop > 0 ? -0.5 : 0.18)
    stamp(g, figures.robinWing)
    g.restore()
    this.calls += 2
  }
}

/** A piece on its way into the vase is drawn in front of it until it is over the mouth. */
function arriving(piece: Piece): boolean {
  return piece.move === 'toVase' && piece.t / piece.dur < 0.62
}
