import { bakeBird, bakeCloths, bakeCloud, bakeHand, bakePaper, bakePots, bakePrint, bakeTools, dropPath, STICK, type BirdSprites, type PotSprites } from './art'
import { SKY, SOCK, TABLE, TOWEL, WALL, paintRoom } from './backdrop'
import { FUR, bakeCat, drawCat, drawPaws, type CatSprites } from './catArt'
import { INKS, POTS, css, type Ink } from './colours'
import type { Tier } from './config'
import { handPose, type Guidance, type HandPose } from './guidance'
import { Turns, moveFor } from './hint'
import { Raster, changedBox } from './ink'
import { CLOTHS, HELD, PAPER, PAPER_TURN, POOL, POT, PRINT, SILL, TOOL, TOOL_IDS, WINDOW, inRect, lineY, onWater, type Rect, type ToolId } from './layout'
import { unpack } from './marble'
import { combedPaper, stonePaper, type Paper } from './papers'
import { PRINT_CELLS, PRINT_GRID, freePeg } from './save'
import { fit, type Fit } from './stage'
import { Pen, pageSheets, type G, type MakeSheet, type Sheet, type Sprite, type Tally } from './surface'
import { RIPPLE_SECONDS, type PrintPlace, type Ripple, type Toy } from './toy'
import { GRID } from './tray'

// The frame. One stamp of the room, which was painted once, and then what
// moves, nearly all of it stamped from pictures drawn once (art.ts,
// catArt.ts): the cloud and the bird in the window, the cloths and the
// prints on the line, the cat, the colour on the water as one picture that
// is painted again only where the water changed, the sheen on it, the pots'
// liquid and sticks, the tools, and the idle guidance. Everything that moves
// is read from the game, whose clock is the only one: the view keeps no time.
// Every stamp, fill and stroke goes through one pen, which counts them.

const TAU = Math.PI * 2
/** The pixel ratio every sprite is drawn for: the bar's cap, so a change of tier bakes nothing again. */
const SPRITE_DPR = 2
const SHEET = '#fbf8ef'
const SHEET_LINE = '#c9ba98'

type Sprites = {
  cat: CatSprites
  bird: BirdSprites
  cloud: Sprite
  cloths: Sprite[]
  pots: PotSprites
  tools: Record<ToolId, Sprite>
  paper: Sprite
  hand: Sprite
}

export class View {
  /** What the last frame cost: sprites stamped, and pen strokes and fills. */
  readonly drawn: Tally = { stamps: 0, pen: 0 }
  private readonly g: G
  private readonly make: MakeSheet
  private readonly pen: Pen
  private readonly tiles: { wall: Sheet; table: Sheet; sky: Sheet; fur: Sheet; towel: Sheet; sock: Sheet }
  private room: Sheet | null = null
  private sprites: Sprites | null = null
  private baked = 0
  private raster: Raster | null = null
  private ink: Sheet | null = null
  private inkImage: ImageData | null = null
  /** The water as it was last painted, to find what changed. */
  private readonly last = new Uint8Array(GRID.w * GRID.h)
  private inkFresh = false
  private readonly pictures = new Map<string, Sheet>()
  private readonly prints = new Map<string, Sprite>()
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private dpr = 1
  private tier: Tier = { dpr: 2, sheen: 3, fine: 4 }
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }

  constructor(g: G, make: MakeSheet = pageSheets) {
    this.g = g
    this.make = make
    this.pen = new Pen(g, this.drawn)
    this.tiles = {
      wall: this.tile(combedPaper(11, 355, 95, [0, 1, 0, 2, 0, 3], 5, 22, 9), WALL, 3),
      table: this.tile(stonePaper(23, 300, 150, 4, 5.6), TABLE, 3),
      sky: this.tile(stonePaper(5, 52, 36, 3, 7), SKY, 3),
      fur: this.tile(combedPaper(7, 180, 120, [0, 3, 0, 2, 0, 0, 1, 0, 2], 4, 18, 8), FUR, 3),
      towel: this.tile(combedPaper(3, 80, 60, [0, 1, 0, 2, 1], 4, 12, 5), TOWEL, 3),
      sock: this.tile(stonePaper(9, 80, 60, 2, 4.5), SOCK, 3),
    }
  }

  /** A grid of tones as a sheet, with the smooth outline and the veins of marbled paper. */
  private tile(paper: Paper, inks: readonly Ink[], fine: number, clear = false): Sheet {
    const raster = new Raster(paper.w, paper.h, fine)
    raster.paint(paper.cells, inks, null, clear)
    const sheet = this.make(raster.width, raster.height), image = sheet.g.createImageData(raster.width, raster.height)
    image.data.set(raster.rgba)
    sheet.g.putImageData(image, 0, 0)
    return sheet
  }

  /** The surface's size in CSS pixels and its pixel ratio. The room is painted again at that density, and every sprite when the stage's scale has changed. */
  resize(width: number, height: number, dpr: number): void {
    this.by = fit(width, height)
    this.dpr = dpr
    if (this.by.scale <= 0) return
    this.room = this.make(Math.round(width * dpr), Math.round(height * dpr))
    this.toStage(this.room.g)
    paintRoom(this.room.g, { wall: this.tiles.wall.canvas, table: this.tiles.table.canvas, sky: this.tiles.sky.canvas })
    const k = this.by.scale * SPRITE_DPR
    if (k === this.baked) return
    this.baked = k
    const make = this.make
    this.sprites = {
      cat: bakeCat(make, k, this.tiles.fur.canvas),
      bird: bakeBird(make, k),
      cloud: bakeCloud(make, k),
      cloths: bakeCloths(make, k, [this.tiles.towel.canvas, this.tiles.sock.canvas]),
      pots: bakePots(make, k),
      tools: bakeTools(make, k),
      paper: bakePaper(make, k),
      hand: bakeHand(make, k),
    }
    this.prints.clear()
  }

  /** The quality tier: how many bands of sheen lie on the water, and how fine the water's picture is. */
  setTier(tier: Tier): void {
    if (tier.fine !== this.raster?.fine) {
      this.raster = new Raster(GRID.w, GRID.h, tier.fine)
      this.ink = this.make(this.raster.width, this.raster.height)
      this.inkImage = this.ink.g.createImageData(this.raster.width, this.raster.height)
      this.inkFresh = false
    }
    this.tier = tier
  }

  private toStage(g: G): void {
    const k = this.dpr * this.by.scale
    g.setTransform(k, 0, 0, k, this.dpr * this.by.x, this.dpr * this.by.y)
  }

  /** A print's picture, made once from its cells. */
  private picture(cells: string): Sheet {
    let made = this.pictures.get(cells)
    if (!made) {
      made = this.tile({ w: PRINT_GRID.w, h: PRINT_GRID.h, cells: unpack(cells, PRINT_CELLS) ?? new Uint8Array(PRINT_CELLS) }, INKS, 8, true)
      this.pictures.set(cells, made)
    }
    return made
  }

  /** A print on its sheet of paper, made once. */
  private print(cells: string, pegged: boolean): Sprite {
    const key = (pegged ? 'p' : 'h') + cells
    let made = this.prints.get(key)
    if (!made) {
      made = bakePrint(this.make, this.baked, this.picture(cells).canvas, pegged)
      this.prints.set(key, made)
    }
    return made
  }

  /** Forgets the pictures of prints that are gone. */
  private forget(places: readonly PrintPlace[]): void {
    if (this.pictures.size <= 6) return
    const kept = new Set(places.map((place) => place.cells))
    for (const cells of [...this.pictures.keys()]) {
      if (kept.has(cells)) continue
      this.pictures.delete(cells)
      this.prints.delete('p' + cells)
      this.prints.delete('h' + cells)
    }
  }

  /** Draws the frame. With no game yet, the room alone. */
  draw(toy: Toy | null, guidance: Guidance | null): void {
    const g = this.g, pen = this.pen, tally = this.drawn, sprites = this.sprites
    tally.stamps = 0
    tally.pen = 0
    if (this.by.scale <= 0 || !this.room || !sprites) return
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    g.imageSmoothingEnabled = true
    g.drawImage(this.room.canvas, 0, 0)
    tally.stamps += 1
    if (!toy) return
    this.toStage(g)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    const time = toy.time, places = toy.placed()
    this.forget(places)

    // The window: a cloud that drifts behind the bars of the frame, and the bird on the sill.
    g.save()
    g.beginPath()
    g.rect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h)
    g.clip()
    pen.stamp(sprites.cloud, WINDOW.x - 90 + ((time * 7 + 120) % (WINDOW.w + 180)), WINDOW.y + 52)
    g.restore()
    g.beginPath()
    g.rect(WINDOW.x + WINDOW.w / 2 - 4, WINDOW.y, 8, WINDOW.h)
    g.rect(WINDOW.x, WINDOW.y + WINDOW.h * 0.42 - 4, WINDOW.w, 8)
    pen.fill('#f4eddd')
    const bird = toy.bird.pose
    g.save()
    g.translate(bird.x, SILL.y + bird.lift)
    g.scale(bird.facing, 1)
    pen.stamp(sprites.bird.body)
    pen.stamp(sprites.bird.head, 13 + 6 * bird.peck, -33 + 17 * bird.peck)
    g.translate(-4, -22)
    g.rotate(-0.25 - (bird.flap !== 0 ? 0.5 + 0.7 * bird.flap : 0))
    pen.stamp(sprites.bird.wing)
    g.restore()

    // The cloths on the line, each swinging from where it is pegged.
    for (let i = 0; i < CLOTHS.length; i++) {
      g.save()
      g.translate(CLOTHS[i].x, lineY(CLOTHS[i].x))
      g.rotate(toy.sway[i].value)
      pen.stamp(sprites.cloths[i])
      g.restore()
    }

    // The corner of paper under the cat, lifted and pulled a little by a finger on it; then the print the cat is
    // pulling down behind itself, the cat, and the prints on the line.
    // While there is colour on the water the corner asks: it curls up off the pile and breathes.
    // It is touched as it is drawn here: layout.ts turns a touch the same way.
    const ask = toy.curl
    g.save()
    g.translate(PAPER.x + toy.paper.dx + PAPER.w, PAPER.y + toy.paper.dy + PAPER.h / 2 - 7 * toy.paper.lift.value)
    g.rotate(PAPER_TURN * ask)
    pen.stamp(sprites.paper, -PAPER.w, -PAPER.h / 2 - ask)
    g.restore()
    for (const place of places) if (place.behind) this.drawPrint(place)
    drawCat(pen, toy.cat.pose, sprites.cat)
    for (const place of places) if (!place.behind && place.pegged) this.drawPrint(place)

    this.drawWater(toy)
    this.drawSheet(toy)
    for (const place of places) if (!place.behind && !place.pegged) this.drawPrint(place)
    drawPaws(pen, toy.cat.pose, sprites.cat)
    this.drawPots(toy, sprites)
    if (guidance) this.drawGuidance(toy, guidance, sprites)
    g.globalAlpha = 1
  }

  /** A print: it turns about the middle of its top edge, where its peg is. */
  private drawPrint(place: PrintPlace): void {
    const g = this.g
    g.save()
    g.translate(place.x + place.w / 2, place.y)
    g.rotate(place.tilt)
    g.translate(0, place.h / 2)
    g.scale(place.w / PRINT.w, place.h / PRINT.h)
    this.pen.stamp(this.print(place.cells, place.pegged))
    g.restore()
  }

  private drawWater(toy: Toy): void {
    const g = this.g, pen = this.pen, time = toy.time, raster = this.raster, ink = this.ink, image = this.inkImage
    if (!raster || !ink || !image) return
    // The colour on the water is one picture, painted again only where the water changed.
    const cells = toy.water, box = this.inkFresh ? changedBox(this.last, cells, GRID.w, GRID.h) : null
    if (box || !this.inkFresh) {
      const wrote = raster.paint(cells, INKS, box, true), row = raster.width * 4
      image.data.set(raster.rgba.subarray(wrote.y0 * row, wrote.y1 * row), wrote.y0 * row)
      ink.g.putImageData(image, 0, 0, wrote.x0, wrote.y0, wrote.x1 - wrote.x0, wrote.y1 - wrote.y0)
      this.last.set(cells)
      this.inkFresh = true
    }
    pen.image(ink.canvas, POOL.x, POOL.y, POOL.w, POOL.h)
    g.save()
    g.beginPath()
    g.rect(POOL.x, POOL.y, POOL.w, POOL.h)
    g.clip()
    // The sheen: pale bands that slide over the water and jump at a knock on the rim. They are light only, move
    // no paint, and are gone while a finger is down.
    const bands = this.tier.sheen
    if (bands > 0 && toy.calm > 0.01) {
      const span = POOL.w + 440
      g.beginPath()
      for (let b = 0; b < bands; b++) {
        const x = POOL.x - 220 + (((time * (13 + 5 * b) + b * 330 + toy.jolt.value * 34) % span) + span) % span, wide = 44 + 22 * b
        g.moveTo(x, POOL.y)
        g.lineTo(x + wide, POOL.y)
        g.lineTo(x + wide - 190, POOL.y + POOL.h)
        g.lineTo(x - 190, POOL.y + POOL.h)
        g.closePath()
      }
      g.globalAlpha = toy.calm
      pen.fill('rgba(255, 255, 255, 0.15)')
    }
    for (const ripple of toy.ripples) if (onWater(ripple.x, ripple.y)) this.drawRipple(ripple, time)
    // The straw's dimple, for as long as it puffs: two arcs of unlike length that close in as the dent deepens,
    // and tremble with the breath.
    const dimple = toy.dimple
    if (dimple) {
      const r = 34 - 14 * dimple.deep + 2 * Math.sin(time * 31), turn = time * 2.2
      g.beginPath()
      g.ellipse(dimple.x, dimple.y, r, r * 0.74, 0, turn, turn + 2.3)
      g.moveTo(dimple.x + r * 0.5 * Math.cos(turn + 3.4), dimple.y + r * 0.37 * Math.sin(turn + 3.4))
      g.ellipse(dimple.x, dimple.y, r * 0.5, r * 0.37, 0, turn + 3.4, turn + 4.8)
      g.globalAlpha = 0.8
      pen.line('#ffffff', 3.5)
    }
    g.globalAlpha = 1
    g.restore()
    for (const ripple of toy.ripples) if (!onWater(ripple.x, ripple.y)) this.drawRipple(ripple, time)
    g.globalAlpha = 1
  }

  /** Something short-lived. A ripple is never a whole ring: broken arcs, or strokes of no one length. The soap's lens and its bubble are whole pale ovals, filled. */
  private drawRipple(ripple: Ripple, time: number): void {
    const g = this.g, pen = this.pen
    const age = Math.min(1, (time - ripple.born) / RIPPLE_SECONDS[ripple.kind]), out = 1 - (1 - age) * (1 - age)
    const x = ripple.x, y = ripple.y
    g.beginPath()
    if (ripple.kind === 'ring') {
      // Three arcs of unlike length, running out from where the drop landed.
      const r = (16 + 78 * out) * ripple.size, turn = ripple.angle + x * 0.05 + out * 0.5
      for (const [from, long] of [[0, 1.5], [2.1, 1.1], [3.9, 1.7]] as const) {
        g.moveTo(x + r * Math.cos(turn + from), y + r * Math.sin(turn + from))
        g.arc(x, y, r, turn + from, turn + from + long)
      }
      g.globalAlpha = (1 - age) * 0.85
      pen.line('#ffffff', 3.5 * (1 - 0.6 * age))
    } else if (ripple.kind === 'puff') {
      // A knock: a few short strokes flying out from where it landed.
      for (const [angle, long] of [[-2.5, 16], [-1.4, 22], [-0.5, 13], [0.7, 18], [2.3, 12]] as const) {
        const from = 12 + 30 * out, to = from + long * (1 - age)
        g.moveTo(x + from * Math.cos(angle), y + from * Math.sin(angle))
        g.lineTo(x + to * Math.cos(angle), y + to * Math.sin(angle))
      }
      g.globalAlpha = (1 - age) * 0.7
      pen.line('#fffdf4', 3.5)
    } else if (ripple.kind === 'lines') {
      // The comb on plain water: five wakes of no one length, fading.
      const cos = Math.cos(ripple.angle), sin = Math.sin(ripple.angle)
      for (let i = 0; i < 5; i++) {
        const off = (i - 2) * 21, long = [46, 70, 58, 84, 40][i] * (0.4 + 0.6 * out)
        const sx = x - sin * off, sy = y + cos * off
        g.moveTo(sx - cos * long * 0.4, sy - sin * long * 0.4)
        g.quadraticCurveTo(sx - sin * 5, sy + cos * 5, sx + cos * long * 0.6, sy + sin * long * 0.6)
      }
      g.globalAlpha = (1 - age) * 0.8
      pen.line('#ffffff', 3)
    } else if (ripple.kind === 'lens') {
      // The soap: a clear lens that opens.
      g.ellipse(x, y, (20 + 90 * out) * ripple.size, (16 + 74 * out) * ripple.size, 0.3, 0, TAU)
      g.globalAlpha = (1 - age) * 0.45
      pen.fill('#ffffff')
    } else {
      // A bubble: it swells, drifts up a little and is gone.
      const r = (8 + 16 * out) * ripple.size
      g.ellipse(x + 6 * Math.sin(age * 5), y - 22 * out, r, r, 0, 0, TAU)
      g.globalAlpha = age < 0.85 ? 0.6 : 0.6 * (1 - age) / 0.15
      pen.fill('#f4fbfa')
    }
    g.globalAlpha = 1
  }

  /** Scene 1's sheet of paper: floating down onto the water, soaking, peeled up and turned over; and the drips. */
  private drawSheet(toy: Toy): void {
    const g = this.g, pen = this.pen, show = toy.show, sheet = show.sheet
    if (sheet.phase !== 'none') {
      const pool: Rect = { x: POOL.x + 8, y: POOL.y + 8, w: POOL.w - 16, h: POOL.h - 16 }
      const mix = (a: Rect, b: Rect, t: number): Rect => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t })
      let rect = pool, soaked = 0, flat = 1, tilt = 0
      if (sheet.phase === 'down') {
        rect = mix(PAPER, pool, sheet.t)
        tilt = -0.25 * Math.sin(sheet.t * Math.PI)
      } else if (sheet.phase === 'soak') soaked = sheet.t
      else if (sheet.phase === 'peel') {
        rect = mix(pool, { x: HELD.x - 40, y: HELD.y - 10, w: HELD.w + 80, h: HELD.h + 56 }, sheet.t)
        soaked = 1
        tilt = 0.12 * Math.sin(sheet.t * Math.PI)
      } else {
        rect = mix({ x: HELD.x - 40, y: HELD.y - 10, w: HELD.w + 80, h: HELD.h + 56 }, HELD, sheet.t)
        soaked = 1
        flat = Math.max(0.04, Math.abs(Math.cos(sheet.t * Math.PI)))
      }
      const newest = toy.prints[toy.prints.length - 1]
      g.save()
      g.translate(rect.x + rect.w / 2, rect.y + rect.h / 2)
      g.rotate(tilt)
      g.scale(flat, 1)
      g.beginPath()
      g.rect(-rect.w / 2, -rect.h / 2, rect.w, rect.h)
      pen.fill(SHEET)
      pen.line(SHEET_LINE, 2)
      if (soaked > 0 && newest) {
        // Its back while it lies and is peeled, faint; its face once it has turned over.
        g.globalAlpha = sheet.phase === 'turn' && sheet.t > 0.5 ? 1 : 0.5 * soaked
        pen.image(this.picture(newest.cells).canvas, -rect.w / 2 + 5, -rect.h / 2 + 5, rect.w - 10, rect.h - 10)
      }
      g.restore()
      g.globalAlpha = 1
    }
    if (show.drips.length > 0) {
      g.beginPath()
      for (const drip of show.drips) dropPath(g, drip.x, drip.y + (drip.to - drip.y) * drip.t, 5)
      pen.fill('#8fb1c2')
    }
  }

  /** The pots' liquid and sticks, and the tools on their cloth or in the hand. */
  private drawPots(toy: Toy, sprites: Sprites): void {
    const g = this.g, pen = this.pen
    for (let pot = 0; pot < POT.ys.length; pot++) {
      const y = POT.ys[pot], slosh = toy.slosh[pot].value, up = Math.min(1.08, Math.max(0, toy.stick[pot].value))
      g.save()
      g.translate(POT.x + 5 * slosh, y)
      g.scale(1 + 0.05 * slosh, 1 - 0.08 * slosh)
      pen.stamp(sprites.pots.liquid[pot])
      g.restore()
      // A stick that is not in use leans out over the rim, its wet end in the pot. The dipped one stands, its wet
      // end up, with a drop hanging from it.
      g.save()
      if (up < 0.5) {
        g.translate(POT.x + 12, y + 8)
        g.rotate(0.5 - 1.1 * up)
        pen.stamp(sprites.pots.lying[pot])
      } else {
        g.translate(POT.x + 4, y + 10)
        g.rotate(-0.6 - 0.62 * up)
        pen.stamp(sprites.pots.standing[pot])
      }
      g.restore()
      if (up > 0.8) {
        // The drop hangs from the stick's wet tip, point up, straight down whatever the stick's slant.
        const slant = -0.6 - 0.62 * up, r = 6.5 * up
        g.beginPath()
        dropPath(g, POT.x + 4 + STICK.long * Math.cos(slant), y + 10 + STICK.long * Math.sin(slant) + r * 1.6 + 1.2 * Math.sin(toy.time * 2.4), r)
        pen.fill(css(INKS[POTS[pot]].face))
      }
    }
    for (const tool of TOOL_IDS) {
      const place = toy.toolPlace(tool)
      if (!place || (!toy.tools.includes(tool) && toy.show.tool?.id !== tool)) continue
      g.save()
      g.translate(place.x, place.y)
      g.rotate(place.turn)
      pen.stamp(sprites.tools[tool])
      g.restore()
    }
  }

  /** Which of the hand's turns the glow is on (hint.ts). */
  private turns = new Turns()

  /** Put away: the hand's turns begin again, as they do on a load. */
  rest(): void {
    this.turns = new Turns()
  }

  private drawGuidance(toy: Toy, guidance: Guidance, sprites: Sprites): void {
    const g = this.g, pen = this.pen
    const tools = toy.tools, held = toy.held >= 0
    // The one move offered now: the hand shows it, and the glow is on the thing it is made on and on nothing else.
    // Between two showings the glow stays on the thing last shown; a new stillness goes on to the next thing
    // not yet shown since the last print.
    const move = moveFor(this.turns.turn(guidance.demoIndex, guidance.glow > 0.01, toy.inked), { inked: toy.inked, pot: toy.pot, tool: toy.tool, tools, held, free: freePeg(toy.prints) })
    if (guidance.glow > 0.01) {
      // A breathing rim: the colour of a warm shadow under a pale gold, so it reads on white enamel, on dark
      // glaze and on the cloth.
      g.globalAlpha = guidance.glow * (0.62 + 0.3 * Math.sin(toy.time * 3))
      g.beginPath()
      const pot = POT.ys.findIndex((y) => Math.hypot(move.x - POT.x, move.y - y) <= POT.r)
      const tool = tools.find((id) => inRect(move.x, move.y, TOOL[id]))
      if (pot >= 0) g.ellipse(POT.x, POT.ys[pot], POT.r + 5, POT.r + 5, 0, 0, TAU)
      else if (tool) g.rect(TOOL[tool].x + 4, TOOL[tool].y + 4, TOOL[tool].w - 8, TOOL[tool].h - 8)
      else if (inRect(move.x, move.y, PAPER)) g.rect(PAPER.x + 4, PAPER.y + 4, PAPER.w - 4, PAPER.h - 8)
      else if (held && inRect(move.x, move.y, HELD)) g.rect(HELD.x - 4, HELD.y - 4, HELD.w + 8, HELD.h + 8)
      else g.rect(POOL.x - 3, POOL.y - 3, POOL.w + 6, POOL.h + 6)
      pen.line('#a8621c', 11)
      pen.line('#ffd98a', 4.5)
      g.globalAlpha = 1
    }
    if (guidance.demo === null) return
    const pose = handPose(guidance.demo, move.kind === 'pull', this.hand)
    const x = move.kind === 'pull' ? move.x + (move.toX - move.x) * pose.travel : move.x
    const y = move.kind === 'pull' ? move.y + (move.toY - move.y) * pose.travel : move.y
    g.globalAlpha = pose.opacity * 0.92
    pen.stamp(sprites.hand, x, y + 14 * (1 - pose.press))
    g.globalAlpha = 1
  }
}
