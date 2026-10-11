import * as art from './art'
import {
  CELL, CLAY, CLAY_SLICK, CLAY_WET, COLS, EARTH, EARTH_WET, HOT, HOT_WET, MOSS, MOSS_FULL, MOSS_GROWN, OPEN, PANE, ROCK, ROCK_WET, ROOT, ROWS, SEED, SPROUT, STEAM, TIN,
  TIP_LEFT, TIP_RIGHT, WATER, colourOf, isLoose, isMoss, isSand, isWet, stageOf, type Layout
} from './cells'
import { BACKDROP, type Tier } from './config'
import { BADGER_IN, CRUMB_KINDS, CURL, DROP, DUCK_TALL, MUD, PUFF, PULL_MOST, RAIN, SPARK, SPORE, TUFT, type Game, type Mark, type Side } from './game'
import { CLOUD_BOTTOM, type Ground } from './ground'
import { handPose, type Guidance, type HandPose } from './guidance'
import { SHIRT, WORM_SEGMENTS, badgerPose, duckPose, gazeAt, molePose, wormPose, type Gaze, type Now } from './residents'
import { STAGE, fit, type Fit } from './stage'
import { ANSWERS } from './timeline'

// The hill as it is drawn. Every still thing and every body part is a sprite
// painted once when the surface is sized; a frame is the sand's picture, the
// sprites stamped where the poses put them, and a few pen fills for eyes,
// water, grains in the air and the marks a touch leaves. `draws` is what a
// frame cost: stamps plus pen strokes and fills.

art.named(art)

type Sprite = { canvas: HTMLCanvasElement; art: art.Art }
type C = CanvasRenderingContext2D
type Picture = { canvas: HTMLCanvasElement; c: C; pixels: ImageData }
const TAU = Math.PI * 2
const INK = '#241e38'
/** Water that is seen against the sky: rain, and what runs out of a wrung piece. */
const RAIN_BLUE = 'rgba(56,140,226,0.92)'
const css = (rgb: readonly [number, number, number]): string => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
const smooth = (t: number): number => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x) }
/** The colour of each kind of crumb in the air (game.ts): the five sands, a drop, mud, a curl of clay, a tuft of moss, a spore, soil, a spark and a puff of steam. */
const CRUMB_FILLS = [...art.DYES.map(css), css(art.WATER_TOP), art.MUD_BROWN, '#9aa2ae', '#56aa3c', '#d8f0a0', '#5a3a28', '#ffd24a', 'rgba(240,248,252,0.8)', RAIN_BLUE]
const CRUMB_SIZE = [4, 4, 4, 4, 4, 5, 9, 7, 8, 3, 5, 5, 12, 4]
const WATER_FRONT = 'rgba(38,150,236,0.62)'
/** How far the oak's lip lies over the glass on every side, in stage units: the game is drawn inside it. */
const LIP = 3
/** A heap of the cloud gathers the steam over this many columns, and the heaps stand on this line, in stage units from the top of the glass. */
const LOBE_COLS = 5, CLOUD_BASE = 66
/** The row the pinwheel's post begins in, under its hub. */
const POST_TOP = 13
const POST_WOOD: readonly [number, number, number] = [122, 74, 30]
/** The boot steam shrinks, the one the worm knocks on the rock and the one it tips sand out of. */
const SHRUNK_BOOT = 3
/** How many times the worm's body is stamped from tail to head. */
const WORM_STAMPS = 6
const KNOCK_BOOT = 0
const TIP_BOOT = 1

/** A whole number from two, mixed well enough for grains. */
function mix(a: number, b: number): number {
  let h = (Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 7, 0x85ebca6b)) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d) >>> 0
  return (h ^ (h >>> 12)) >>> 0
}

/** How a cell looks at its edge: sand by its colour and whether it is wet, open space, and each dry ground; anything else has a hard edge. Below 100 it is loose stuff that scatters. */
const look = (code: number): number => (code === OPEN || code === STEAM ? 99 : isSand(code) ? colourOf(code) | (isWet(code) ? 8 : 0) : code === CLAY || code === ROCK || code === MOSS || code === HOT || code === EARTH ? 100 + code : -1)

export type MakeCanvas = (width: number, height: number) => HTMLCanvasElement
const makeCanvas: MakeCanvas = (width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export class HillView {
  /** Stamps and pen strokes of the last frame, and how much of the pane its large pictures covered, as a share of it. */
  draws = 0
  covered = 0
  private readonly surface: C
  private readonly make: MakeCanvas
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private ratio = 1
  private width = 0
  private height = 0
  private grain: 1 | 2 | 3 = 3
  private sprites = new Map<art.Art, Sprite>()
  private readonly frame = { top: art.frameStrip(STAGE.width, PANE.y + LIP, 'bottom'), bottom: art.frameStrip(STAGE.width, STAGE.height - PANE.y - PANE.height + LIP, 'top'), left: art.frameStrip(PANE.x + LIP, PANE.height, 'right'), right: art.frameStrip(STAGE.width - PANE.x - PANE.width + LIP, PANE.height, 'left') }
  private pictures = new Map<Ground, Picture>()
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  private rgb: [number, number, number] = [0, 0, 0]
  /** The band of the hill that shows, in the hill's own stage units: a thing wholly outside it is not drawn. */
  private bandTop = 0
  private bandBottom: number = STAGE.height
  private whites: number[] = []
  private pupils: number[] = []
  /** The oak frame has to be drawn again: after a resize, and after something was drawn over it. Otherwise it stays on the surface as it is. */
  private stale = true
  /** The column of the pinwheel's post on the hill whose picture is being painted. */
  private pin = -1
  /** The steam of the hill being drawn: each puff that is on its way up, and each cell of the cloud, as x, y pairs. */
  private readonly rising: number[] = []
  /** The cloud over each stretch of sky: how many cells of steam hang there, and the sum of where they are. */
  private readonly lobes = new Float32Array(2 * (Math.ceil(COLS / LOBE_COLS) + 1))
  /** The heap that stands over the first column: the heaps go with the wind as the steam does, so each keeps its steam. */
  private lobe0 = 0
  private clouded = false

  constructor(canvas: HTMLCanvasElement, make: MakeCanvas = makeCanvas) {
    this.surface = canvas.getContext('2d')!
    this.make = make
    this.frame.top.name = 'frameTop'; this.frame.bottom.name = 'frameBottom'; this.frame.left.name = 'frameLeft'; this.frame.right.name = 'frameRight'
  }

  /** The surface's size in CSS pixels and its pixel ratio. Every sprite is made again at that density. */
  resize(width: number, height: number, ratio: number): void {
    this.width = width
    this.height = height
    this.ratio = ratio
    this.by = fit(width, height)
    this.sprites = new Map()
    this.stale = true
  }

  /** What a quality tier sets in the picture: how many grains across a cell of sand shows. */
  setTier(tier: Tier): void {
    if (tier.grain === this.grain) return
    this.grain = tier.grain
    this.pictures = new Map()
  }

  private sprite(of: art.Art): Sprite {
    let made = this.sprites.get(of)
    if (made) return made
    const k = Math.max(0.25, this.by.scale * this.ratio)
    const canvas = this.make(Math.ceil(of.w * k), Math.ceil(of.h * k))
    ;(canvas as unknown as { label?: string }).label = of.name
    const c = canvas.getContext('2d')!
    c.scale(k, k)
    of.paint(c)
    if (!of.smooth) grains(c, of.w, of.h)
    made = { canvas, art: of }
    this.sprites.set(of, made)
    return made
  }

  private stamp(of: art.Art, x: number, y: number, turn = 0, sx = 1, sy = 1, alpha = 1): void {
    const c = this.surface, { canvas } = this.sprite(of)
    this.draws++
    if (turn === 0 && sx === 1 && sy === 1 && alpha === 1) {
      c.drawImage(canvas, x - of.ax, y - of.ay, of.w, of.h)
      return
    }
    c.save()
    c.translate(x, y)
    if (turn) c.rotate(turn)
    if (sx !== 1 || sy !== 1) c.scale(sx, sy)
    c.globalAlpha = alpha
    c.drawImage(canvas, -of.ax, -of.ay, of.w, of.h)
    c.restore()
  }

  private fill(style: string | CanvasGradient): void {
    this.surface.fillStyle = style
    this.surface.fill()
    this.draws++
  }

  private stroke(style: string, width: number): void {
    const c = this.surface
    c.strokeStyle = style; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'
    c.stroke()
    this.draws++
  }

  /**
   * Notes an eye to draw with the others of its owner: a pupil that goes where the gaze goes. The white is part of
   * the head's own picture; `white` asks for one to be drawn, for an eye that moves on the face or has gone wide.
   */
  private eye(x: number, y: number, r: number, gaze: Gaze, white = false): void {
    if (white) this.whites.push(x, y, r)
    this.pupils.push(x + gaze.x * r * 0.45, y + gaze.y * r * 0.45, r * 0.5)
  }

  /** Draws the eyes noted since the last call: all the whites as one fill and all the pupils as another. */
  private eyes(white = '#ffffff'): void {
    const c = this.surface
    for (const [list, style] of [[this.whites, white], [this.pupils, INK]] as const) {
      if (list.length === 0) continue
      c.beginPath()
      for (let i = 0; i < list.length; i += 3) { c.moveTo(list[i] + list[i + 2], list[i + 1]); c.arc(list[i], list[i + 1], list[i + 2], 0, TAU) }
      this.fill(style)
    }
    this.whites.length = 0
    this.pupils.length = 0
  }

  /** Whether something between two heights of the hill shows at all. */
  private shows(top: number, bottom: number): boolean {
    return bottom > this.bandTop && top < this.bandBottom
  }

  /** Draws the frame: the game as it stands, or the empty case when the slot has not been read yet. */
  draw(game: Game | null, guidance: Guidance | null): void {
    const c = this.surface, { scale, x, y } = this.by
    this.draws = 0
    this.covered = 0
    if (scale <= 0) return
    c.setTransform(1, 0, 0, 1, 0, 0)
    // The oak frame never changes, and the game is drawn inside its lip, so the frame stays on the surface from one frame to
    // the next. It is drawn again after a resize, and while something lies on it and the frame after: a knock's dust, the idle glow, the ghost hand.
    const over = game !== null && ((guidance !== null && (guidance.glow > 0.01 || guidance.demo !== null)) || game.marks.some((mark) => mark.kind === 'wood'))
    const oak = this.stale || over
    this.stale = over
    // A surface of another shape than the stage shows the case's own wood at two sides.
    if (oak && (x > 0.5 || y > 0.5)) { c.fillStyle = BACKDROP; c.fillRect(0, 0, this.width * this.ratio, this.height * this.ratio); this.draws++ }
    const k = scale * this.ratio
    c.setTransform(k, 0, 0, k, x * this.ratio, y * this.ratio)
    c.save()
    c.beginPath(); c.rect(PANE.x + LIP, PANE.y + LIP, PANE.width - 2 * LIP, PANE.height - 2 * LIP); c.clip()
    if (!game) {
      c.fillStyle = css(art.HOLLOW); c.fillRect(PANE.x, PANE.y, PANE.width, PANE.height); this.draws++
    } else {
      for (const ground of this.pictures.keys()) if (ground !== game.on.ground && ground !== game.leaving?.ground) this.pictures.delete(ground)
      // The plug's scene: the old hill slides up out of the frame and the new one rises under it.
      const slide = game.leaving ? smooth(game.part('plug', 'slide')) : 0
      if (game.leaving) {
        this.side(game, game.leaving, -slide * PANE.height)
        if (slide > 0) this.side(game, game.on, (1 - slide) * PANE.height)
      } else this.side(game, game.on, 0)
      this.air(game)
    }
    this.stamp(art.glare, PANE.x + 70, PANE.y + 10)
    c.restore()
    if (oak) {
      this.stamp(this.frame.top, 0, 0)
      this.stamp(this.frame.bottom, 0, PANE.y + PANE.height - LIP)
      this.stamp(this.frame.left, 0, PANE.y)
      this.stamp(this.frame.right, PANE.x + PANE.width - LIP, PANE.y)
    }
    // A knock on the oak is drawn on the oak.
    if (game) for (const mark of game.marks) if (mark.kind === 'wood' && mark.age >= 0) this.mark(mark, game.time)
    if (game && guidance) this.guide(game, guidance)
  }

  /** One hill, moved down by `dy` stage units: only the band of it that is inside the pane is drawn. */
  private side(game: Game, side: Side, dy: number): void {
    const c = this.surface
    this.bandTop = Math.max(PANE.y, PANE.y - dy)
    this.bandBottom = Math.min(PANE.y + PANE.height, PANE.y + PANE.height - dy)
    if (this.bandBottom <= this.bandTop) return
    const now = game.now(side)
    c.save()
    c.translate(0, dy)
    c.beginPath(); c.rect(PANE.x, this.bandTop, PANE.width, this.bandBottom - this.bandTop); c.clip()
    this.hill(side.ground, side.hill.pin)
    this.steam(side.ground, now.time)
    this.sky(side, now)
    this.cloud(side.ground)
    this.badger(game, side, now)
    this.mole(game, side, now)
    this.worm(game, side, now)
    this.duck(game, side, now)
    this.waterFront(side.ground)
    this.pond(side, now)
    this.puffs()
    c.restore()
  }

  // --- The sand's picture ---------------------------------------------------

  private hill(ground: Ground, pin: number): void {
    const g = this.grain
    this.pin = pin
    let picture = this.pictures.get(ground)
    if (!picture) {
      const canvas = this.make(COLS * g, ROWS * g), pc = canvas.getContext('2d')!
      ;(canvas as unknown as { label?: string }).label = 'sand'
      picture = { canvas, c: pc, pixels: pc.createImageData(COLS * g, ROWS * g) }
      this.pictures.set(ground, picture)
      ground.touchAll()
    }
    if (ground.changedTo > ground.changedFrom) {
      const from = Math.max(0, ground.changedFrom - 1), to = Math.min(ROWS, ground.changedTo + 1), changed = ground.changed
      for (let row = from; row < to; row++) {
        for (let col = 0; col < COLS; col++) {
          const index = row * COLS + col
          // A cell is painted again when it or a cell beside it changed: its edge shows what lies next to it.
          if (changed[index] || (row > 0 && changed[index - COLS]) || (row < ROWS - 1 && changed[index + COLS]) || (col > 0 && changed[index - 1]) || (col < COLS - 1 && changed[index + 1])) this.cell(ground, picture.pixels.data, col, row)
        }
      }
      picture.c.putImageData(picture.pixels, 0, 0, 0, from * g, COLS * g, (to - from) * g)
      ground.seen()
    }
    // Only the rows that show are drawn, so two hills on their way past each other are one pane's worth between them.
    const c = this.surface
    const row0 = Math.max(0, Math.floor((this.bandTop - PANE.y) / CELL)), row1 = Math.min(ROWS, Math.ceil((this.bandBottom - PANE.y) / CELL))
    c.imageSmoothingEnabled = true
    c.drawImage(picture.canvas, 0, row0 * g, COLS * g, (row1 - row0) * g, PANE.x, PANE.y + row0 * CELL, PANE.width, (row1 - row0) * CELL)
    this.draws++
    this.covered += (row1 - row0) / ROWS
  }

  /** The colour of one grain of a cell, into `this.rgb`. `noise` is 0 to 1; `top` says the grain is in the cell's top row. */
  private tint(layout: Layout, code: number, col: number, row: number, noise: number, top: boolean, above: number): void {
    const rgb = this.rgb
    const set = (base: readonly [number, number, number], lift: number): void => { rgb[0] = base[0] * lift; rgb[1] = base[1] * lift; rgb[2] = base[2] * lift }
    if (code >= 32) {
      // Packed sand is close-grained; loose sand shows every grain, paler and darker by turns.
      let lift = isLoose(code) ? 0.74 + 0.4 * noise : 0.9 + 0.16 * noise
      if (noise > 0.93) lift += 0.14
      set(art.DYES[colourOf(code)], lift)
      if (isWet(code)) { rgb[0] *= 0.56; rgb[1] *= 0.6; rgb[2] *= 0.74 }
      return
    }
    switch (code) {
      case OPEN: case STEAM: {
        // Steam is not in the sand's picture: it is drawn over it as puffs and as a cloud.
        const sky = row < layout.surface[col]
        // The pinwheel's post stands in the sky board, painted in the same grains as everything else.
        if (sky && col === this.pin && row >= POST_TOP) set(POST_WOOD, 0.88 + 0.24 * noise)
        else if (sky) set(art.SKY, 1 - 0.05 * noise - 0.1 * (row / layout.surface[col]))
        else if (isMoss(above) && above !== MOSS_GROWN && top && noise > 0.35) set(MOSS_DARK, 1)
        else set(art.HOLLOW, 1 + 0.25 * noise)
        return
      }
      case WATER: {
        const surface = top && above !== WATER && above < CLAY
        set(surface ? art.WATER_TOP : art.WATER_BLUE, surface ? 1 : 0.9 + 0.16 * noise)
        return
      }
      case TIN: set(row <= layout.bath.row0 ? art.TIN_RIM : art.TIN_WHITE, 0.96 + 0.04 * noise); return
      // Clay is smooth and cool; wet, it shines along its top; polished, it gleams.
      case CLAY: set(CLAY_GREY, (top && above < CLAY ? 1.14 : (row + ((col / 7) | 0)) % 3 === 0 ? 0.9 : 0.98) + 0.05 * noise); return
      case CLAY_WET: set(top ? CLAY_SHINE : CLAY_GREY, top ? 1 : 0.9 + 0.05 * noise); return
      case CLAY_SLICK: set(noise > 0.45 ? CLAY_SHINE : CLAY_GREY, 1); return
      // Rock is dark and flecked; wet, it glistens.
      case ROCK: set(ROCK_SLATE, noise > 0.9 ? 1.5 : (top && !(above === ROCK || above === ROCK_WET) ? 1.5 : 0.92) + 0.14 * noise); return
      case ROCK_WET: if (noise > 0.93) set([230, 240, 255], 1); else set(ROCK_SLATE, 0.72 + 0.12 * noise); return
      case MOSS: set(MOSS_GREEN, noise > 0.7 ? 0.74 : 0.95 + 0.1 * noise); return
      case MOSS_FULL: set(MOSS_BRIGHT, 0.9 + 0.14 * noise); return
      case MOSS_GROWN: set(MOSS_PUFF, noise > 0.8 ? 1.12 : 0.94 + 0.08 * noise); return
      // A hot stone glows in its cracks; steaming, it glows all over.
      case HOT: if (noise > 0.72) set([255, 150, 40], 1); else set(HOT_RED, 0.9 + 0.2 * noise); return
      case HOT_WET: if (noise > 0.5) set([255, 176, 60], 1); else set([226, 70, 30], 0.9 + 0.2 * noise); return
      case EARTH: set(EARTH_BROWN, noise > 0.86 ? 1.45 : 0.85 + 0.3 * noise); return
      case EARTH_WET: set(EARTH_BROWN, 0.55 + 0.18 * noise); return
      case SEED: set(SEED_PALE, 0.94 + 0.08 * noise); return
      case SPROUT: set(ROOT_PALE, 0.8 + 0.1 * noise); return
      case ROOT: set(ROOT_PALE, 0.92 + 0.1 * noise); return
      case TIP_LEFT: case TIP_RIGHT: set([244, 255, 214], 1); return
    }
    set(art.HOLLOW, 1)
  }

  private cell(ground: Ground, data: Uint8ClampedArray, col: number, row: number): void {
    const g = this.grain, cells = ground.cells, layout = ground.layout, rgb = this.rgb
    const index = row * COLS + col, code = cells[index]
    const up = row > 0 ? cells[index - COLS] : -1, down = row < ROWS - 1 ? cells[index + COLS] : -1, left = col > 0 ? cells[index - 1] : -1, right = col < COLS - 1 ? cells[index + 1] : -1
    const own = look(code), soft = own >= 0 && g > 1
    for (let sy = 0; sy < g; sy++) {
      for (let sx = 0; sx < g; sx++) {
        const h = mix(col * g + sx, row * g + sy), noise = (h & 255) / 255
        let use = code, ucol = col, urow = row
        // A seed is drawn a little fatter than its cell, so it can be seen and tapped.
        if (code !== SEED && ((sx === 0 && left === SEED) || (sx === g - 1 && right === SEED) || (sy === 0 && up === SEED)) && g > 1) use = SEED
        else if (soft) {
          // Sand has no straight edge: at a corner the grain takes after what lies beyond it, and along an edge one grain in four does.
          const nx = sx === 0 ? left : sx === g - 1 ? right : -1, ny = sy === 0 ? up : sy === g - 1 ? down : -1
          const lx = nx < 0 ? -1 : look(nx), ly = ny < 0 ? -1 : look(ny)
          if (lx >= 0 && lx === ly && lx !== own) { use = nx; ucol = col + (sx === 0 ? -1 : 1) }
          else if (own < 100 && lx >= 0 && lx < 100 && lx !== own && ((h >> 8) & 3) === 0) { use = nx; ucol = col + (sx === 0 ? -1 : 1) }
          else if (own < 100 && ly >= 0 && ly < 100 && ly !== own && ((h >> 10) & 3) === 0) { use = ny; urow = row + (sy === 0 ? -1 : 1) }
        }
        this.tint(layout, use, ucol, urow, noise, sy === 0, urow > 0 ? cells[(urow - 1) * COLS + ucol] : OPEN)
        const at = ((row * g + sy) * COLS * g + col * g + sx) * 4
        data[at] = rgb[0] > 255 ? 255 : rgb[0]; data[at + 1] = rgb[1] > 255 ? 255 : rgb[1]; data[at + 2] = rgb[2] > 255 ? 255 : rgb[2]; data[at + 3] = 255
      }
    }
  }

  /** Water that stands in a room or in the bath, drawn again in front of whoever stands in it, up to its surface. One fill for all of it. */
  private waterFront(ground: Ground): void {
    const c = this.surface, cells = ground.cells, { moleRoom, wormRoom, bath } = ground.layout
    if (ground.water === 0) return
    let any = false
    c.beginPath()
    for (const box of [moleRoom, wormRoom, bath]) {
      for (let col = box.col0; col <= box.col1; col++) {
        let bottom = -1
        for (let row = box.row1; row >= box.row0; row--) {
          const wet = cells[row * COLS + col] === WATER
          if (wet && bottom < 0) bottom = row
          if (!wet && bottom >= 0) { c.rect(PANE.x + col * CELL, PANE.y + (row + 1) * CELL, CELL, (bottom - row) * CELL); any = true; bottom = -1 }
        }
        if (bottom >= 0) { c.rect(PANE.x + col * CELL, PANE.y + box.row0 * CELL, CELL, (bottom - box.row0 + 1) * CELL); any = true }
      }
    }
    if (any) this.fill(WATER_FRONT)
  }

  // --- Steam ----------------------------------------------------------------

  /**
   * Finds the hill's steam: the puffs on their way up, no two of a size and each larger the higher it has come, and how much
   * of the cloud hangs over each stretch of the sky.
   */
  private steam(ground: Ground, time: number): void {
    const rising = this.rising, lobes = this.lobes
    rising.length = 0
    lobes.fill(0)
    this.clouded = false
    if (ground.has(STEAM) === 0) return
    const cells = ground.cells, { surface, wind } = ground.layout, gone = wind * ground.drifted
    this.lobe0 = Math.floor(-gone / LOBE_COLS)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const index = row * COLS + col
        if (cells[index] !== STEAM) continue
        const x = PANE.x + (col + 0.5) * CELL
        // Steam that waits in the sky under the cloud is part of it.
        if (row <= CLOUD_BOTTOM + 4 && row < surface[col]) {
          const lobe = 2 * (Math.floor((col - gone) / LOBE_COLS) - this.lobe0)
          lobes[lobe]++; lobes[lobe + 1] += x
          this.clouded = true
        } else {
          // A puff keeps its size and its place for three rows of its rise, so the steam rolls and does not flicker.
          const seed = col * 31 + Math.floor(row / 3) * 17, one = (seed * 0.6180339887) % 1, other = (seed * 0.3247179572) % 1
          rising.push(x + 10 * (one - 0.5) + 2 * Math.sin(time * 5 + index), PANE.y + (row + 0.5) * CELL, (4.5 + 7 * (1 - row / ROWS)) * (0.6 + 0.8 * other))
        }
      }
    }
  }

  /**
   * The cloud the steam gathers into: round heaps side by side, each as large as the steam over that stretch of sky, pale on
   * top and shaded underneath, clear of the top of the glass and behind whoever stands under it. It darkens as the wind
   * brings it to the washing, before it rains.
   */
  private cloud(ground: Ground): void {
    if (!this.clouded) return
    const c = this.surface, lobes = this.lobes, { wind, rain } = ground.layout
    let lead = wind > 0 ? -Infinity : Infinity
    c.beginPath()
    for (let i = 0; i < lobes.length; i += 2) {
      if (lobes[i] === 0) continue
      // No two heaps alike: each has its own share of the size its steam gives it, and stands a little higher or lower.
      const id = this.lobe0 + i / 2, one = (((id * 0.6180339887) % 1) + 1) % 1, other = (((id * 0.3247179572) % 1) + 1) % 1
      // A heap is wider than it is high and stands a little off its place, so a thin tail is a strand of unequal lumps at uneven steps, never a row of discs.
      const x = lobes[i + 1] / lobes[i] + 20 * ((((id * 0.7548776662) % 1) + 1) % 1 - 0.5), r = Math.min(31, (9 + 5 * Math.sqrt(lobes[i])) * (0.55 + 0.9 * one)), y = PANE.y + CLOUD_BASE - 8 + 14 * other - 0.5 * r
      c.moveTo(x + 1.35 * r, y); c.ellipse(x, y, 1.35 * r, r, 0, 0, TAU)
      lead = wind > 0 ? Math.max(lead, x) : Math.min(lead, x)
    }
    const far = wind > 0 ? PANE.x + rain.col0 * CELL - lead : lead - (PANE.x + (rain.col1 + 1) * CELL)
    const dark = Math.min(1, Math.max(0, 1 - far / 150))
    const shade = c.createLinearGradient(0, PANE.y + CLOUD_BASE - 50, 0, PANE.y + CLOUD_BASE + 20)
    shade.addColorStop(0, `rgb(${255 - 60 * dark},${255 - 54 * dark},${255 - 40 * dark})`)
    shade.addColorStop(0.6, `rgb(${244 - 84 * dark},${248 - 80 * dark},${250 - 60 * dark})`)
    shade.addColorStop(1, `rgb(${170 - 78 * dark},${190 - 82 * dark},${212 - 70 * dark})`)
    this.fill(shade)
  }

  /** The steam on its way up, in front of everything in the hill: soft puffs, one fill for all of them. */
  private puffs(): void {
    const rising = this.rising
    if (rising.length === 0) return
    const c = this.surface
    c.beginPath()
    for (let i = 0; i < rising.length; i += 3) { c.moveTo(rising[i] + rising[i + 2], rising[i + 1]); c.arc(rising[i], rising[i + 1], rising[i + 2], 0, TAU) }
    this.fill('rgba(244,250,252,0.62)')
  }

  // --- The sky --------------------------------------------------------------

  private sky(side: Side, now: Now): void {
    const { layout } = side.ground, { wind } = layout, t = now.time, span = PANE.width + 220
    if (!this.shows(PANE.y, PANE.y + (layout.pond.brim + 2) * CELL)) return
    // The painted clouds go the way the hill's wind blows, as a cloud of steam does, and the pinwheel turns with it.
    const drift = (far: number): number => PANE.x - 110 + (wind > 0 ? far % span : span - (far % span))
    this.stamp(art.cloud, drift(t * 7 + 180), PANE.y + 70)
    this.stamp(art.cloud, drift(t * 4.4 + 760), PANE.y + 96, 0, 0.72, 0.72)
    // The pinwheel turns on its post, which is part of the sand's picture.
    const hubX = PANE.x + (side.hill.pin + 0.5) * CELL, hubY = PANE.y + 76
    this.stamp(art.pinwheel, hubX, hubY, wind * (t * 1.9 + 0.5 * Math.sin(t * 0.7)))
    // The spring: a bamboo pipe at the pond's edge, on the side the wind comes from, its mouth over the pond.
    const mouth = side.ground.springCells()[0]
    this.stamp(art.spout, PANE.x + ((mouth % COLS) + 0.5) * CELL, PANE.y + layout.pond.brim * CELL - 5, 0, wind, 1)
  }

  // --- The badger -----------------------------------------------------------

  private badger(game: Game, side: Side, now: Now): void {
    const c = this.surface, at = side.places.badger, { drying, spots, wind } = side.ground.layout
    if (!this.shows(at.y - 170, at.y + 8)) return
    const left = PANE.x + drying.col0 * CELL, right = PANE.x + (drying.col1 + 1) * CELL, rope = at.y - art.dryingLine.h
    // She stands at the end of her line the wind comes from. Where that is the right-hand end, the whole drying ground is drawn the other way round, and she with it.
    const flip = wind < 0, mirrored = (x: number): number => (flip ? left + right - x : x)
    const pose = badgerPose(now)
    c.save()
    if (flip) { c.translate(left + right, 0); c.scale(-1, 1) }
    // Her place, and where she is now: trotted along the line to stand beside each piece in the order they sagged, home again, and a step toward the sock once the umbrella is up.
    const home = left + BADGER_IN
    let x = home
    for (let k = 0; k < pose.along.length; k++) { const piece = side.sagOrder[k]; x += (left + art.PEGS[piece].x - art.garments[piece].w / 2 - 50 - x) * pose.along[k] }
    x += (home - x) * pose.back + 10 * pose.umbrella
    const y = at.y - pose.hop
    this.stamp(art.dryingLine, left, at.y)
    // The washing. A piece that is wrung is twisted thin, and its water runs out of it to the ground; a wet piece drips.
    let wet = false
    for (let i = 0; i < art.garments.length; i++) {
      // She has taken the shirt off the line to press it in the steam.
      if (i === SHIRT && pose.press > 0.05) continue
      const turn = side.sagOrder.indexOf(i), sag = pose.sag[turn], wrung = pose.wring[turn]
      if (sag > 0.5) wet = true
      this.stamp((sag > 0.5 ? art.garmentsWet : art.garments)[i], left + art.PEGS[i].x, rope + art.PEGS[i].y, pose.swing[i] + 0.35 * wrung * Math.sin(now.time * 18), 1 - 0.55 * wrung, 1 + 0.16 * sag)
    }
    // Rain on its way down is drawn here, with the water that leaves the washing: one fill for all of it.
    const raining = side === game.on && game.crumbs.some((crumb) => crumb.kind === RAIN)
    if (wet || raining) {
      c.beginPath()
      // Each streak leans with the wind and is of its own length.
      if (raining) for (const crumb of game.crumbs) if (crumb.kind === RAIN) {
        const rx = mirrored(crumb.x), long = 9 + 10 * ((crumb.x * 0.618) % 1)
        c.moveTo(rx - 5, crumb.y - long); c.lineTo(rx - 1.5, crumb.y - long); c.lineTo(rx + 2.5, crumb.y); c.lineTo(rx - 1, crumb.y); c.closePath()
      }
      for (let i = 0; i < art.garments.length; i++) {
        const turn = side.sagOrder.indexOf(i), wrung = pose.wring[turn]
        if (pose.sag[turn] <= 0.5) continue
        const px = left + art.PEGS[i].x, foot = rope + art.PEGS[i].y + art.garments[i].h * 1.16
        if (wrung > 0.1) {
          // What she wrings out of it: one stream down to the ground, thick at the piece and thin at its end, that wavers as it falls.
          const way = (far: number, half: number): [number, number] => [px + half * (1 - 0.6 * far) * wrung + 1.5 * Math.sin(far * 8 - now.time * 16), foot - 6 + (at.y - 2 - foot + 6) * far]
          c.moveTo(...way(0, -4))
          for (let n = 1; n <= 5; n++) c.lineTo(...way(n / 5, -4))
          for (let n = 5; n >= 0; n--) c.lineTo(...way(n / 5, 4))
          c.closePath()
        } else {
          // A drop falling from each wet piece, each at its own moment, of its own size and from its own height.
          const fall = (now.time * (0.7 + 0.13 * i) + i * 0.37) % 1, dx = px + (i % 2 ? 5 : -4), dy = foot - 5 * ((i * 3) % 4) + fall * (20 + 6 * i), size = 2 + 0.7 * ((i * 5) % 4)
          c.moveTo(dx + size, dy); c.arc(dx, dy, size, 0, TAU)
        }
      }
      this.fill(RAIN_BLUE)
    }
    // She stands in front of her line, beside the piece she has in her paws and never over it. The tail first, behind her.
    c.save(); c.translate(x - 34, y - 30); c.rotate(-0.7 + pose.tail)
    c.beginPath(); c.ellipse(-10, 0, 17, 8, 0, 0, TAU); this.fill('#3d3f47')
    c.restore()
    this.stamp(art.badgerBody, x, y)
    // Her arm: up to the line as she pegs, wrings and flaps, straight out with the shirt in the steam, and level with the umbrella's handle once it is open.
    const armTurn = pose.press > 0 ? 1.5 : pose.umbrella > 0.02 ? 2.7 - 1.29 * pose.umbrella + 0.15 * pose.snap : 2.7 - 2.1 * pose.reach + 0.4 * pose.snap
    const shoulderX = x + 24, shoulderY = y - 66 + pose.hitch
    const pawX = shoulderX + 51 * Math.sin(armTurn), pawY = shoulderY - 51 * Math.cos(armTurn)
    // The umbrella: upright on its long handle, its canopy over the smallest sock and over nothing else, herself included.
    if (pose.umbrella > 0.02) this.stamp(art.umbrella, pawX, pawY, 0.26, 0.6 * (0.3 + 0.7 * pose.umbrella), 0.6)
    this.stamp(art.badgerArm, shoulderX, shoulderY, armTurn)
    if (now.since.badgerSnap < ANSWERS.badgerSnap.lasts) {
      // The peg in her paw: two stout halves side by side that spring a little apart at their tips and snap shut.
      c.beginPath()
      for (const half of [-1, 1]) {
        const lean = armTurn + half * 0.2 * pose.snap, dx = Math.sin(lean), dy = -Math.cos(lean), ox = -half * 3.4 * Math.cos(armTurn), oy = -half * 3.4 * Math.sin(armTurn)
        c.moveTo(pawX + ox - 3 * dy, pawY + oy + 3 * dx); c.lineTo(pawX + ox + 22 * dx - 3 * dy, pawY + oy + 22 * dy + 3 * dx); c.lineTo(pawX + ox + 22 * dx + 3 * dy, pawY + oy + 22 * dy - 3 * dx); c.lineTo(pawX + ox + 3 * dy, pawY + oy - 3 * dx); c.closePath()
      }
      this.fill('#c98a3c')
    }
    if (pose.press > 0.05) this.stamp(art.garments[SHIRT], x + 76, y - 96 + 6 * Math.sin(now.time * 9), 0.2, 1, pose.press)
    if (pose.toss > 0 && spots.hot) {
      // The wet sock on its way to the hot stone.
      const fromX = x + 40, fromY = y - 96, toX = mirrored(PANE.x + (spots.hot.col + 0.5) * CELL), toY = PANE.y + spots.hot.row * CELL
      this.stamp(art.sock, fromX + (toX - fromX) * pose.toss, fromY + (toY - fromY) * pose.toss - 70 * Math.sin(pose.toss * Math.PI), pose.toss * 5)
    }
    const headX = x + 6, headY = y - 78 + pose.hitch + 9 * pose.flinch
    const duck = side.places.duck, finger = game.finger
    const gaze = pose.look > 0.3 ? gazeAt(headX, headY, { x: mirrored(duck.x), y: duck.y }, { x: 0, y: 1 }) : pose.lookUp > 0.3 ? { x: 0.3, y: -0.9 } : gazeAt(headX + 14, headY - 30, finger && { x: mirrored(finger.x), y: finger.y }, { x: 0.7, y: -0.5 })
    c.save()
    c.translate(headX, headY)
    c.rotate(-0.16 * pose.reach - 0.4 * pose.lookUp + 0.3 * pose.look + 0.2 * pose.flinch)
    this.draws++
    c.drawImage(this.sprite(art.badgerHead).canvas, -art.badgerHead.ax, -art.badgerHead.ay, art.badgerHead.w, art.badgerHead.h)
    this.eye(13, -33, 4.6, gaze)
    this.eyes()
    c.restore()
    c.restore()
  }

  // --- The mole -------------------------------------------------------------

  private mole(game: Game, side: Side, now: Now): void {
    const c = this.surface, at = side.places.mole, room = side.ground.layout.moleRoom
    const left = PANE.x + room.col0 * CELL, floor = at.y
    if (!this.shows(floor - 200, floor + 8)) return
    const pose = molePose(now, side.ground.flooded(room))
    const water = floor - side.ground.level(room) * CELL
    const bob = 2 * Math.sin(now.time * 2.3)
    // The cup on its table and the shade on its lamp are part of the room's picture until they are in use.
    const cup = pose.tip > 0, adrift = pose.shade > 0
    this.stamp(cup ? (adrift ? art.moleDen : art.moleDenShade) : adrift ? art.moleDenCup : art.moleDenBoth, left, floor)
    if (cup) this.stamp(art.teacup, left + 21, floor - 40, -1.7 * pose.tip)
    // The lampshade: on its lamp, or the other way up on the water as a boat that drifts across the room.
    const sail = Math.min(1, pose.shade * 3), drift = Math.max(0, pose.shade - 0.33) / 0.67
    if (adrift) this.stamp(art.lampShade, left + 198 - 150 * drift, floor - 90 + (Math.min(floor - 34, water - 26) - (floor - 90)) * sail + bob * sail, Math.PI * sail)
    // He and his chair are one group: it rides up on the water, drifts a little and turns half round.
    const turned = pose.turn >= 0 ? Math.max(0.14, pose.turn) : Math.min(-0.14, pose.turn)
    c.save()
    c.translate(at.x + side.drift * pose.float, floor - side.rise * pose.float - pose.hop + bob * pose.float)
    c.scale(turned, 1)
    this.stamp(art.armchair, -3, 0)
    this.stamp(art.moleBody, -4, -44, 0, 1 - 0.012 * pose.breath, 1 + 0.028 * pose.breath)
    const headX = -2 + pose.nose, headY = -104 - 1.4 * pose.breath
    const duck = side.places.duck
    // His eyes stay on his book. They leave it for the duck afloat, and for what he has just poured: the tea on the clay, the water on the seed.
    const { spots } = side.ground.layout, poured = game.running('showEarth') ? spots.earth : spots.clay
    const gaze = pose.look > 0.3 ? gazeAt(at.x, floor - 130, duck, { x: 0, y: 1 }) : pose.peer > 0.2 && poured ? gazeAt(at.x + headX, floor + headY - 30, stageOf(poured.col, poured.row), { x: 0.35, y: 0.8 }) : { x: 0.35, y: 0.8 }
    c.save()
    c.translate(headX, headY)
    c.rotate(0.16 - 0.24 * Math.max(pose.peer, pose.look))
    // The whites of his eyes are part of his head behind the glasses. When he looks up they rise over the rims, and are drawn there.
    const lift = 5 * Math.max(pose.peer, pose.look), risen = lift > 0.05, head = risen ? art.moleHeadBare : art.moleHead
    this.draws++
    c.drawImage(this.sprite(head).canvas, -head.ax, -head.ay, head.w, head.h)
    this.eye(0, -34 - lift, 4.2, gaze, risen)
    this.eye(25, -31 - lift, 4.2, gaze, risen)
    this.eyes()
    if (pose.fog > 0.02) {
      // Steam on his glasses: both lenses go white.
      c.beginPath(); c.arc(0, -34, 10, 0, TAU); c.moveTo(35, -31); c.arc(25, -31, 10, 0, TAU)
      this.fill(`rgba(244,250,252,${0.92 * pose.fog})`)
    }
    if (pose.ears > 0.02) {
      this.stamp(art.molePaw, -24 + 6 * (1 - pose.ears), -48)
      this.stamp(art.molePaw, 22 - 6 * (1 - pose.ears), -58)
    }
    c.restore()
    // The book: in front of his face when he hides, in his lap while his paws are at his ears, in the air when a stone lands.
    const bookX = 30, bookY = -52 - 46 * pose.hide + 14 * pose.ears - pose.jump
    this.stamp(art.moleBook, bookX, bookY, -0.12 + 0.1 * pose.hide + 0.012 * pose.jump)
    if (pose.page > 0) {
      // The page going over: a leaf that swings from the right-hand side to the left.
      const tip = 30 - 60 * pose.page, rise = 16 * Math.sin(pose.page * Math.PI)
      c.beginPath(); c.moveTo(bookX, bookY - 48); c.lineTo(bookX + tip, bookY - 50 - rise); c.lineTo(bookX + tip, bookY - 14 - rise); c.lineTo(bookX, bookY - 10); c.closePath()
      this.fill('#fff7e4')
    }
    this.stamp(art.moleFeet, 26, -4 - 30 * pose.feet, -0.25 * pose.feet)
    // One slipper in his paw: wrung over the floor, or rubbed on his glasses.
    if (pose.wring > 0.02) this.stamp(art.slipper, 62, -58, 0.5 * Math.sin(now.time * 14), 1 - 0.4 * pose.wring, 1)
    else if (pose.wipe > 0.02) this.stamp(art.slipper, 12 + 5 * Math.sin(now.time * 20), -134 + 40 * (1 - pose.wipe), 0.3)
    c.restore()
    // The slippers: under his feet, or afloat and away at the wall. While one is in his paw the other waits on the floor.
    const away = pose.slippers, held = pose.wring > 0.02 || pose.wipe > 0.02
    const slipX = at.x + 26 + (left + 150 - at.x - 26) * away, slipY = floor - 2 + (Math.min(floor - 2, water + 8) - (floor - 2)) * away + bob * away
    this.stamp(held ? art.slipper : art.slippers, slipX, slipY - (held ? 12 : 0), 0.08 * away * Math.sin(now.time * 1.7))
    if (pose.wring > 0.02) {
      // What he wrings out of it: a few drops on their way to the floor.
      c.beginPath()
      for (let i = 0; i < 3; i++) {
        const fall = (now.time * (1.9 + 0.3 * i) + i * 0.41) % 1, x = at.x + 60 + i * 5 - (i === 1 ? 7 : 0), dy = floor - 50 + fall * 44
        c.moveTo(x + 2.5, dy); c.arc(x, dy, 2.5, 0, TAU)
      }
      this.fill('rgba(150,220,255,0.9)')
    }
    const seed = side.ground.layout.spots.earth
    if (pose.can > 0.02 && seed) {
      // The watering can, and its water on the way to the seed in the doorway.
      const canX = at.x + 62, canY = floor - 84, toX = PANE.x + (seed.col + 0.5) * CELL, toY = PANE.y + seed.row * CELL
      this.stamp(art.wateringCan, canX, canY, 0.8 * pose.can)
      // One thin stream, thick at the rose and thin at the seed, that wavers as it falls.
      const fromX = canX + 44, fromY = canY + 18
      const fall = (far: number, half: number): [number, number] => [fromX + (toX - fromX) * far, fromY + (toY - fromY) * far * far + half * (1 - 0.7 * far) + 1.2 * Math.sin(far * 9 - now.time * 14)]
      c.beginPath()
      c.moveTo(...fall(0, -3))
      for (let i = 1; i <= 6; i++) c.lineTo(...fall(i / 6, -3))
      for (let i = 6; i >= 0; i--) c.lineTo(...fall(i / 6, 3))
      c.closePath()
      this.fill('rgba(150,220,255,0.9)')
    }
  }

  // --- The worm -------------------------------------------------------------

  private worm(game: Game, side: Side, now: Now): void {
    const c = this.surface, at = side.places.worm, room = side.ground.layout.wormRoom
    const left = PANE.x + room.col0 * CELL, top = PANE.y + room.row0 * CELL, floor = at.y
    if (!this.shows(top, floor + 8)) return
    const pose = wormPose(now, side.ground.flooded(room), side.shrunken)
    const t = now.time, hop = 0.5 * pose.hop
    this.stamp(art.wormShelf, left, top + 22)
    // Worn, the boots walk: every other one is up while the rest are down, and the row shuffles along a little.
    const on = smooth(pose.worn / 3), along = on * (-3 + 3 * Math.sin(t * 1.3))
    // A boot that steam has shrunk will not go on: it stays standing on the floor, small, while the others are pulled on and walk.
    const off = (i: number): boolean => i === SHRUNK_BOOT && pose.shrunk > 0.5
    const up = (i: number): number => {
      if (off(i)) return 0
      const pull = Math.min(1, Math.max(0, pose.worn - (i >> 1)))
      return 14 * Math.sin(pull * Math.PI) + (pose.worn >= 3 ? (i % 2 ? Math.max(0, 5 - pose.squelch) : pose.squelch) : 0)
    }
    const small = (i: number): number => (i === SHRUNK_BOOT ? 1 - 0.45 * pose.shrunk : 1)
    // How high each boot's top is now.
    const rest = (i: number): number => art.BOOTS[i].tall * small(i) + up(i)
    // The worm: upright in its own boot with its cloth, or wearing the boots: its body goes down into the top of each boot
    // and comes up again between two of them, and its head stands up out of the last one.
    const home = art.BOOTS[art.HOME_BOOT], sunk = 1 - pose.down, last = art.BOOTS.length - 1
    let headX = 0, headY = 0
    const spine: number[] = []
    // The points its body runs through, at closer steps than its segments.
    for (let n = 0; n <= WORM_STAMPS; n++) {
      const i = (n * WORM_SEGMENTS) / WORM_STAMPS, whole = Math.min(WORM_SEGMENTS - 1, Math.floor(i)), part = Math.min(1, i - whole), head = n === WORM_STAMPS
      const lean = pose.lean[whole] + (pose.lean[Math.min(WORM_SEGMENTS - 1, whole + 1)] - pose.lean[whole]) * part
      const standX = left + home.x + lean + (head ? 9 * pose.polish - 14 * pose.sock - 10 * pose.knock : 0), standY = floor - 20 - (30 + 13 * i) * sunk - (head ? 3 + 5 * pose.shrug : 0)
      // Worn: a hump between each two boots, then the neck out of the last boot, and the head on it.
      const a = art.BOOTS[Math.min(n, last)], b = art.BOOTS[Math.min(n + 1, last)]
      const lieX = n < last ? left + (a.x + b.x) / 2 + along + 0.3 * lean : left + a.x + along + (head ? 8 : 3) + 0.3 * lean
      const lieY = n < last ? floor - Math.max(rest(n), rest(n + 1)) - 5 : floor - rest(last) - (head ? 40 : 14)
      const x = standX + (lieX - standX) * on, y = standY + (lieY - standY) * on - hop
      spine.push(x, y)
      if (head) { headX = x; headY = y }
    }
    // Its body is one soft line of its own colour with a paler line along its back, not a row of beads. Standing, it runs up
    // through the spine; worn, it goes down into each boot the worm wears and up over the gap to the next. A boot that will
    // not go on is passed over.
    const dip = (i: number): [number, number] => {
      const k = 2 * Math.min(i, last - 1), inX = left + art.BOOTS[i].x + along, inY = floor - rest(i) + (off(i) ? -24 : 12) - hop
      return [spine[k] + (inX - spine[k]) * on, spine[k + 1] + (inY - spine[k + 1]) * on]
    }
    const body = (dx: number, dy: number): void => {
      c.beginPath()
      let from = dip(0)
      c.moveTo(from[0] + dx, from[1] + dy)
      for (let i = 0; i < last; i++) {
        const to = dip(i + 1)
        c.quadraticCurveTo(2 * spine[2 * i] - (from[0] + to[0]) / 2 + dx, 2 * spine[2 * i + 1] - (from[1] + to[1]) / 2 + dy, to[0] + dx, to[1] + dy)
        from = to
      }
      c.lineTo(spine[2 * last] + dx, spine[2 * last + 1] + dy)
    }
    body(0, 0)
    this.stroke(art.WORM, 30)
    body(-3, -5)
    this.stroke(art.WORM_LIGHT, 7)
    const peek = art.BOOTS[art.PEEK_BOOT]
    if (pose.peek > 0.02) { headX = left + peek.x + along; headY = floor - peek.tall - 16 * pose.peek + 6 }
    if (pose.down < 0.6 || pose.peek > 0.02) {
      const duck = side.places.duck
      const gaze = pose.look > 0.3 ? gazeAt(headX, headY, duck, { x: 0, y: 1 }) : pose.shrug > 0.3 ? { x: -0.6, y: -0.5 } : gazeAt(headX, headY, game.finger, { x: 0.5, y: 0.5 })
      c.save()
      c.translate(headX, headY)
      c.rotate(0.12 * pose.polish - 0.3 * pose.look - 0.25 * pose.shrug)
      this.draws++
      c.drawImage(this.sprite(art.wormHead).canvas, -art.wormHead.ax, -art.wormHead.ay, art.wormHead.w, art.wormHead.h)
      const wide = 4.4 + 2.2 * pose.wide
      this.eye(-7, -6, wide, gaze, pose.wide > 0.02)
      this.eye(8, -7, wide, gaze, pose.wide > 0.02)
      this.eyes()
      c.restore()
    }
    // The sock it wrings over the moss in the roof.
    if (pose.sock > 0.02) this.stamp(art.sock, left + 62, top + 20, 0.3 * Math.sin(t * 16), 1 - 0.4 * pose.sock, pose.sock)
    // The boots stand in front of the worm. A row nothing is happening to is one picture.
    if (pose.worn === 0 && pose.knock === 0 && pose.tipped === 0 && pose.shrunk === 0) this.stamp(art.wormBoots, left, floor)
    else {
      for (let i = 0; i < art.BOOTS.length; i++) {
        const boot = art.BOOTS[i], size = small(i)
        const knocked = i === KNOCK_BOOT ? pose.knock : 0, tipped = i === TIP_BOOT ? pose.tipped : 0
        this.stamp(art.boots[i], left + boot.x + (off(i) ? 0 : along) - 9 * knocked, floor - up(i) - 5 * knocked - 26 * tipped, -0.12 * knocked - 2.1 * tipped, size, size)
      }
      if (pose.tipped > 0.3) {
        // What it tips out: a few grains on their way to the floor.
        const boot = art.BOOTS[TIP_BOOT]
        c.beginPath()
        for (let i = 0; i < 4; i++) { const fall = (t * (2.1 + 0.4 * i) + i * 0.29) % 1; c.rect(left + boot.x - 30 - 4 * i + (i === 2 ? 5 : 0), floor - 40 + fall * 36, 4, 4) }
        this.fill(css(art.DYES[1]))
      }
    }
    // The water each boot holds, brimming at its top, in the order the water reached them.
    let brimming = false
    c.beginPath()
    for (let k = 0; k < pose.filled.length; k++) {
      const full = pose.filled[k], i = side.bootOrder[k], boot = art.BOOTS[i]
      // A boot the worm has pulled on has the worm in its top, not a brim of water.
      if (full < 0.05 || (i === TIP_BOOT && pose.tipped > 0.05) || (!off(i) && pose.worn - (i >> 1) > 0.5)) continue
      const x = left + boot.x + (off(i) ? 0 : along), y = floor - up(i) - (boot.tall + 1) * small(i)
      c.moveTo(x + 11 * full, y); c.ellipse(x, y, 11 * full, 4 * full, 0, 0, TAU)
      brimming = true
    }
    if (brimming) this.fill(css(art.WATER_TOP))
  }

  // --- The duck, the plug and its chain ---------------------------------------

  private duck(game: Game, side: Side, now: Now): void {
    const c = this.surface, at = side.places.duck, chain = side.places.chain
    if (!this.shows(chain.top - PULL_MOST, at.y + 4)) return
    const pose = duckPose(now, side.afloat, side.boiled)
    // The plug on its chain: the knob, the cord and the plug in the bath's floor are one thing, and come up together when it is pulled.
    this.stamp(art.chain, chain.x, chain.y - side.pull)
    // The whirl over the plughole while the bath runs out.
    const whirl = game.part('plug', 'whirl')
    if (side === game.leaving && whirl > 0 && whirl < 1) {
      c.beginPath(); c.ellipse(chain.x, chain.y - 10, 20 * (1 - whirl) + 4, 6 * (1 - whirl) + 2, now.time * 9, 0, TAU)
      this.fill('rgba(214,240,255,0.8)')
    }
    const spin = side === game.leaving ? game.part('plug', 'spinDown') : 0
    // It rides on what it sits or floats on, hops and bobs, and stops short of the chamber's roof.
    const { bath, chamber, seat } = side.ground.layout
    const headroom = Math.max(0, (bath.row1 + 1 - chamber.row0) * CELL - DUCK_TALL * (1 + Math.max(0, pose.squash)))
    const y = at.y - Math.min(headroom, side.lift + pose.hop - pose.bob) + pose.sunk
    // It sits at one end of the bath and faces the other: toward the chain, which hangs on the pond's side.
    const inward = seat.col0 === bath.col0 ? 1 : -1
    const face = inward * (pose.facing >= 0 ? Math.max(0.16, pose.facing) : Math.min(-0.16, pose.facing))
    const body = side.muddy ? art.duckBodyMud : art.duckBody, head = side.muddy ? art.duckHeadMud : art.duckHead
    c.save()
    c.translate(at.x, y)
    // On its way down the plughole's whirl it spins round its own middle.
    if (spin > 0) { c.translate(0, -44); c.rotate(spin * TAU * 2); c.translate(0, 44) }
    c.scale(face * (1 - 0.6 * pose.squash), 1 + pose.squash)
    this.stamp(art.brush, -26, -60, -0.2 + 0.4 * pose.brush)
    this.stamp(body, 0, 0, 0.22 * pose.wag - 0.3 * pose.tail)
    c.save()
    c.translate(22, -58)
    c.rotate(pose.tilt + 0.3 * pose.shake)
    this.draws++
    c.drawImage(this.sprite(head).canvas, -head.ax, -head.ay, head.w, head.h)
    if (pose.blink < 0.5) {
      const gaze = gazeAt(at.x + 22 * face, y - 84, game.finger, { x: 0.6, y: -0.3 })
      this.eye(12, -34, 5.2, { x: gaze.x * Math.sign(face), y: gaze.y })
      this.eyes()
    } else {
      // A blink: the lid comes down over the eye, in the duck's own yellow or its mud.
      c.beginPath(); c.arc(12, -34, 5.8, 0, TAU)
      this.fill(side.muddy ? '#96693f' : '#ffd23c')
    }
    if (pose.jet > 0.02) {
      // The jet from its beak: a fountain of water, thick at the beak and thin at its end, that falls short of the chain.
      c.beginPath()
      for (let i = 0; i < 7; i++) {
        const far = (i + ((now.time * 6) % 1)) / 7 * pose.jet, x = 56 + 44 * far, jy = -24 - 120 * far + 110 * far * far, r = 6 - 4 * far
        c.moveTo(x + r, jy); c.arc(x, jy, r, 0, TAU)
      }
      this.fill('rgba(150,220,255,0.92)')
    }
    c.restore()
    c.restore()
  }

  // --- The spring -----------------------------------------------------------

  /** The pond's glints, and the spring: a running ribbon from the pipe's mouth down to the pond for as long as it runs, and a drop that hangs and trembles at the mouth when the hill holds plenty. */
  private pond(side: Side, now: Now): void {
    const ground = side.ground, { pond } = ground.layout
    if (!this.shows(PANE.y + pond.brim * CELL - 12, PANE.y + (pond.brim + pond.depth) * CELL)) return
    const c = this.surface, mouth = ground.springCells()[0], col = mouth % COLS, t = now.time
    const x = PANE.x + (col + 0.5) * CELL, top = PANE.y + pond.brim * CELL - 5
    // Glints on the water that stands at the brim: a few pale dashes that slide and come and go, no two alike.
    let any = false
    c.beginPath()
    for (let i = 0; i < 3; i++) {
      // Each keeps to its own third of the pond, so no two ever lie one over the other.
      const gx = pond.col + Math.round((i - 1) * 0.6 * pond.half + 3 * Math.sin(t * (0.11 + 0.05 * i) + i * 2.4)), wide = 7 + 5 * Math.sin(t * (1.3 + 0.4 * i) + i)
      if (ground.cells[pond.brim * COLS + gx] !== WATER || wide < 4) continue
      c.rect(PANE.x + gx * CELL - wide, PANE.y + pond.brim * CELL + 3 + 5 * i, 2 * wide, 2.5)
      any = true
    }
    if (any) this.fill('rgba(236,250,255,0.75)')
    if (!ground.springing) {
      c.beginPath(); c.ellipse(x - 2 * ground.layout.wind, top + 3 + 1.2 * Math.sin(t * 9), 3 + 0.8 * Math.sin(t * 2.3), 4 + 1.2 * Math.sin(t * 2.3), 0, 0, TAU)
      this.fill(css(art.WATER_TOP))
      return
    }
    let row = pond.brim
    while (row < pond.brim + pond.depth && ground.cells[row * COLS + col] === OPEN) row++
    const foot = PANE.y + row * CELL + 2
    c.beginPath()
    c.moveTo(x - 4, top)
    for (let y = top; y <= foot; y += 6) c.lineTo(x + 4 + 1.6 * Math.sin(y * 0.4 - t * 14), y)
    c.lineTo(x + 4, foot)
    for (let y = foot; y >= top; y -= 6) c.lineTo(x - 4 + 1.6 * Math.sin(y * 0.4 - t * 14 + 1.3), y)
    c.closePath()
    this.fill(css(art.WATER_TOP))
    // Where it lands: foam that never holds still.
    c.beginPath(); c.ellipse(x + 2, foot, 9 + 2 * Math.sin(t * 17), 3.5 + Math.sin(t * 23), 0, 0, TAU)
    this.fill('rgba(240,250,255,0.9)')
  }

  // --- What is in the air, and the marks a touch leaves ---------------------

  private air(game: Game): void {
    const c = this.surface
    for (const ripple of game.ripples) {
      // A fingertip on glass or water: a soft disc that widens and fades.
      const age = ripple.age / 0.45
      c.beginPath(); c.arc(ripple.x, ripple.y, 10 + 26 * age, 0, TAU)
      this.fill(ripple.wet ? `rgba(190,232,255,${0.5 * (1 - age)})` : `rgba(255,255,255,${0.34 * (1 - age)})`)
    }
    for (const mark of game.marks) if (mark.age >= 0 && mark.kind !== 'wood') this.mark(mark, game.time)
    // Everything loose in the air, one fill for each kind that is flying.
    const crumbs = game.crumbs
    for (let kind = 0; kind < CRUMB_KINDS; kind++) {
      // Rain is drawn with the washing it falls on.
      if (kind === RAIN) continue
      let any = false
      for (const crumb of crumbs) {
        if (crumb.kind !== kind) continue
        if (!any) { c.beginPath(); any = true }
        const size = CRUMB_SIZE[kind]
        if (kind === CURL) { c.moveTo(crumb.x + size, crumb.y); c.ellipse(crumb.x, crumb.y, size, size * 0.4, crumb.x * 0.1, 0, TAU) }
        else if (kind === DROP || kind === MUD || kind === SPORE || kind === PUFF || kind === SPARK) { c.moveTo(crumb.x + size / 2, crumb.y); c.arc(crumb.x, crumb.y, size / 2, 0, TAU) }
        else if (kind === TUFT) { c.moveTo(crumb.x - size / 2, crumb.y + size / 2); c.lineTo(crumb.x, crumb.y - size / 2); c.lineTo(crumb.x + size / 2, crumb.y + size / 2); c.closePath() }
        else c.rect(crumb.x - size / 2, crumb.y - size / 2, size, size)
      }
      if (any) this.fill(CRUMB_FILLS[kind])
    }
  }

  /** One mark, as its own kind draws it. Every one is a filled shape or a single line: nothing that reads as a sign. */
  private mark(mark: Mark, time: number): void {
    const c = this.surface, { x, y } = mark, p = mark.age / mark.life, fade = 1 - p
    // A disc that begins its own piece of the path, so that two in one fill are never joined by a sliver.
    const disc = (dx: number, dy: number, r: number): void => { c.moveTo(dx + r, dy); c.arc(dx, dy, r, 0, TAU) }
    c.beginPath()
    switch (mark.kind) {
      // A pale line along the way the finger went, which stays a while.
      case 'scratch': c.moveTo(x - 13 * Math.cos(mark.turn), y - 13 * Math.sin(mark.turn)); c.lineTo(x + 13 * Math.cos(mark.turn), y + 13 * Math.sin(mark.turn)); this.stroke(`rgba(226,226,240,${0.9 * fade})`, 2.5); return
      // The stone glows where it was touched.
      case 'light': c.arc(x, y, 12 + 10 * p, 0, TAU); this.fill(`rgba(255,196,70,${0.8 * fade})`); return
      // A wet gleam under the finger.
      case 'shine': c.ellipse(x, y, 16, 5, -0.5, 0, TAU); this.fill(`rgba(255,255,255,${0.75 * fade})`); return
      // A knock: a puff of pale dust that jumps off the rock.
      case 'knock': c.arc(x, y, 5 + 12 * p, 0, TAU); this.fill(`rgba(240,236,250,${0.8 * fade})`); return
      // Moss springs up under the finger and settles.
      case 'boing': { const high = 12 * Math.sin(p * Math.PI * 3) * fade; c.ellipse(x, y, 15, Math.max(2, 7 + high), 0, Math.PI, TAU); this.fill('rgba(136,218,116,0.95)'); return }
      // The whistle of the kettle: three puffs of steam going up, each of its own size.
      case 'ring': disc(x - 5, y - 22 * p, 6); disc(x + 7, y - 9 - 30 * p, 4); disc(x + 1, y - 20 - 34 * p, 8); this.fill(`rgba(244,250,252,${0.8 * fade})`); return
      // The pool on the clay wobbles as more arrives.
      case 'wobble': c.ellipse(x, y - 2, 13 + 5 * Math.sin(p * 20), 4 - 1.5 * Math.sin(p * 20), 0, 0, TAU); this.fill(`rgba(190,232,255,${0.8 * fade})`); return
      // Drops jump off the rock.
      case 'patter': disc(x - 6, y - 4 - 12 * Math.sin(p * Math.PI), 2.5); disc(x + 5, y - 3 - 17 * Math.sin(p * Math.PI), 2); this.fill('rgba(190,232,255,0.9)'); return
      // Bubbles rise in a pool that boils.
      case 'bubbles': disc(x - 6, y - 16 * p, 3); disc(x + 4, y - 4 - 22 * p, 5); disc(x + 11, y + 2 - 12 * p, 2); this.fill(`rgba(236,248,255,${0.85 * fade})`); return
      // A root plucked: it shivers.
      case 'twang': { const wide = 5 * fade * Math.sin(time * 70); c.moveTo(x - 16, y); c.quadraticCurveTo(x - 6, y + wide, x, y); c.quadraticCurveTo(x + 6, y - wide, x + 16, y); this.stroke('rgba(232,246,190,0.95)', 3); return }
      // A seed shaken in its husk.
      case 'rattle': c.ellipse(x + 4 * Math.sin(time * 60) * fade, y, 6, 4.5, 0, 0, TAU); this.fill('rgb(250,240,170)'); return
      // The clay shelf sags over the hollow.
      case 'groan': c.ellipse(x, y, 22, 3 + 5 * Math.sin(p * Math.PI), 0, 0, Math.PI); this.fill(`rgba(120,130,146,${0.9 * fade})`); return
      // Dust jumps out to both sides where a stone lands.
      case 'dust': disc(x - 12 - 22 * p, y - 5 * p, 8 * fade + 2); disc(x + 13 + 24 * p, y - 7 * p, 7 * fade + 2); disc(x + 2, y - 10 * p, 5 * fade + 1); this.fill(`rgba(226,206,170,${0.8 * fade})`); return
      // A root snaps: its two ends fly apart.
      case 'snap': c.rect(x - 6 - 14 * p, y - 2 - 6 * p, 7, 3.5); c.rect(x + 2 + 12 * p, y - 1 + 5 * p, 6, 3.5); this.fill(`rgba(232,246,190,${fade})`); return
      // The bath's tin rings.
      case 'tin': {
        // A sliver of light, pointed at both ends, with its shadow along one side, that runs down the tin from where it was touched.
        const gy = y - 8 + 26 * p
        const sliver = (cx: number, half: number, long: number): void => { c.moveTo(cx, gy - long); c.quadraticCurveTo(cx + half, gy, cx, gy + long); c.quadraticCurveTo(cx - half, gy, cx, gy - long) }
        sliver(x + 1, 8, 14); this.fill(`rgba(30,52,110,${0.85 * fade})`)
        c.beginPath(); sliver(x - 1, 4.5, 10); this.fill(`rgba(255,255,255,${fade})`)
        return
      }
      // A knock on the oak frame: a few chips of dark wood, no two alike, jump off it and fall.
      case 'wood': disc(x - 11 - 6 * p, y - 5 + 34 * p * p, 3.2); disc(x - 2, y + 3 + 46 * p * p, 5); disc(x + 7 + 4 * p, y - 9 + 28 * p * p, 2.4); disc(x + 14 + 9 * p, y + 1 + 40 * p * p, 4); this.fill(`rgba(96,56,24,${0.95 * fade})`); return
      // A thumbprint in the clay.
      case 'dent': c.ellipse(x, y, 11, 6, 0, 0, TAU); this.fill(`rgba(60,66,84,${0.5 * fade})`); return
    }
  }

  // --- The idle ladder ------------------------------------------------------

  /** What an idle child is shown: a glow on one place that can be rubbed or pulled, and then a ghost hand that makes the move, ending on the glow. */
  private guide(game: Game, guidance: Guidance): void {
    if (guidance.glow <= 0.01 && guidance.demo === null) return
    const hint = game.hint()
    if (!hint) return
    const c = this.surface
    if (guidance.glow > 0.01) {
      const beat = 0.75 + 0.25 * Math.sin(game.time * 3.3)
      c.beginPath(); c.arc(hint.ring.x, hint.ring.y, 34, 0, TAU); this.fill(`rgba(255,244,170,${0.3 * guidance.glow * beat})`)
      c.beginPath(); c.arc(hint.ring.x, hint.ring.y, 18, 0, TAU); this.fill(`rgba(255,250,214,${0.5 * guidance.glow * beat})`)
    }
    if (guidance.demo === null) return
    const pose = handPose(guidance.demo, true, this.pose)
    const x = hint.from.x + (hint.to.x - hint.from.x) * pose.travel, y = hint.from.y + (hint.to.y - hint.from.y) * pose.travel
    this.stamp(art.hand, x, y + 12 * (1 - pose.press), 0, 1 - 0.06 * pose.press, 1 - 0.06 * pose.press, pose.opacity)
  }
}

const CLAY_GREY: readonly [number, number, number] = [150, 160, 174]
const CLAY_SHINE: readonly [number, number, number] = [214, 224, 236]
const ROCK_SLATE: readonly [number, number, number] = [74, 68, 90]
const MOSS_GREEN: readonly [number, number, number] = [86, 170, 60]
const MOSS_DARK: readonly [number, number, number] = [58, 128, 44]
const MOSS_BRIGHT: readonly [number, number, number] = [70, 190, 96]
const MOSS_PUFF: readonly [number, number, number] = [136, 218, 116]
const HOT_RED: readonly [number, number, number] = [150, 44, 34]
const EARTH_BROWN: readonly [number, number, number] = [98, 64, 44]
const SEED_PALE: readonly [number, number, number] = [244, 232, 150]
const ROOT_PALE: readonly [number, number, number] = [208, 232, 160]

/** Sprinkles a painted sprite with paler and darker grains, only where it is already painted. */
function grains(c: C, w: number, h: number): void {
  c.globalCompositeOperation = 'source-atop'
  const count = Math.round((w * h) / 9)
  for (let pass = 0; pass < 2; pass++) {
    c.fillStyle = pass === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(30,10,40,0.16)'
    c.beginPath()
    for (let i = 0; i < count; i++) {
      const h1 = mix(i, pass * 977 + w), h2 = mix(i + 31, pass * 131 + h)
      c.rect((h1 % 10000) / 10000 * w, (h2 % 10000) / 10000 * h, 1.7, 1.7)
    }
    c.fill()
  }
  c.globalCompositeOperation = 'source-over'
}

