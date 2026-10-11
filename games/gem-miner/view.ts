import { INVITE_TAPS, through, type Cast, type Lodger } from './cast'
import type { Effects } from './effects'
import { BLOCK_PAD, LIGHT, VARIANTS, WATER, WATER_DEEP, makeFigures, type Figures } from './figures'
import { ACTS, CARRY_UP, DRIP_S, RISE, type Game } from './game'
import { handPose, type Guidance, type HandPose } from './guidance'
import { BEASTS, BLOCKS, CAGE, CAGE_FLOOR, CELL, COLS, HILL, MAMMOTH, ROWS, TOOLS, cellOf, centre, colOf, corner, indexOf, isGrass, rowOf } from './layout'
import { CHARCOAL, CLAY, FLAME, RED, RED_DEEP, RED_PALE, YELLOW, YELLOW_DEEP, Pigments, stamp, stampTurned, type MakeCanvas, type Paint, type Sprite } from './pigment'
import { molePose, passed, strikeOf, swayOf } from './poses'
import { dwellerSpot } from './shapes'
import { fit, type Fit } from './stage'
import { CRANK, HERD, LIFT_ROPE, NECK, paintAbove, paintRock, paintShade, type Bounds } from './wall'

// The view: one canvas. What stands still is painted once into `ground` (the
// wall, the paintings, the hill as dug with its light, its wet and its
// standing water, the shading) and stamped whole, which is the frame's one
// full-surface draw. A block that changes is painted again into `ground`
// alone. Everything that moves is stamped or stroked over it.
//
// `stamps` and `pen` count what a frame cost: every stamp of a picture, and
// every live stroke or fill. Their sum is the count the grown-up overlay
// shows as calls.

export type Show = { game: Game; cast: Cast; effects: Effects; guidance: Guidance | null; step: number }

const CHIP_TINTS = [RED, RED_DEEP, RED_PALE, YELLOW, YELLOW_DEEP, '#e6b558', '#fff1c2', WATER]
/** Where the mammoth stands: the grass under the middle of it, and how large it is drawn. It faces the lift. */
export const MAMMOTH_AT = { x: MAMMOTH.x + 152, y: HILL.y + 1, scale: 0.9 } as const
/** How far above the grass line the rolled hide stands: over a tool that lies on the grass. */
const ROLL_ABOVE = 56
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t))
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
/** The middle of the short rope the cage hangs by, between the wheel and the cage: where the mammoth's trunk taps and the idle glow sits. */
export const ROPE_AT = { x: LIFT_ROPE.x, y: (LIFT_ROPE.y + CAGE_FLOOR - 112) / 2 } as const
/** The lit side of the rolled hide: pale red ochre laid thinly over the deep red. */
const ROLL_LIT = '#a9502c'
const ease = (t: number): number => t * t * (3 - 2 * t)
const CHIP: readonly (readonly [number, number])[] = [[-1, -0.5], [0.7, -0.8], [1, 0.5], [-0.4, 0.8]]
const SPARK: readonly (readonly [number, number])[] = [[-1.6, -0.3], [1.6, -0.3], [1.6, 0.3], [-1.6, 0.3]]
const DROP: readonly (readonly [number, number])[] = [[0, -1.2], [0.7, -0.3], [0.9, 0.4], [0.5, 0.9], [-0.5, 0.9], [-0.9, 0.4], [-0.7, -0.3]]
/** More changed blocks than this in one frame and the whole hillside is painted again in one go. */
const WHOLE = 24
const variantOf = (index: number): number => ((index * 7 + Math.floor(index / COLS) * 3) >>> 0) % VARIANTS

export class HillView {
  private readonly g: Paint
  private ratio = 1
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private base: HTMLCanvasElement | null = null
  private shade: HTMLCanvasElement | null = null
  private ground: HTMLCanvasElement | null = null
  /** The wall with its shading and no hill on it, for where a rolled-up hillside leaves the rock bare. Made at the first roll. */
  private bare: HTMLCanvasElement | null = null
  private figures: Figures | null = null
  /** The pictures made for each density, so going back to a tier costs nothing. */
  private readonly made = new Map<number, Figures>()
  /** What `ground` holds of each block, or nothing yet. */
  private readonly painted = new Array<string>(BLOCKS).fill('')
  /** How many times the whole hillside has been painted again, for the tests of what a frame costs. */
  repaints = 0
  private time = 0
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** What the last frame drew: pictures stamped, and live strokes and fills. */
  stamps = 0
  pen = 0

  constructor(canvas: HTMLCanvasElement, private readonly make: MakeCanvas) {
    this.g = canvas.getContext('2d')!
  }

  /** Stamps and strokes together: the frame's draw calls. */
  get draws(): number {
    return this.stamps + this.pen
  }

  /** The pictures in use, for the tests that name what a frame stamped. */
  get pictures(): Figures | null {
    return this.figures
  }

  /** The surface's size in CSS pixels and the pixel ratio it is drawn at. The canvas itself is sized by the Mount. */
  resize(width: number, height: number, ratio: number): void {
    this.ratio = ratio
    this.by = fit(width, height)
    if (!this.by.scale) return
    const k = this.k
    let figures = this.made.get(k)
    if (!figures) {
      if (this.made.size >= 4) this.made.clear()
      figures = makeFigures(new Pigments(k, this.make))
      this.made.set(k, figures)
    }
    this.figures = figures
    const w = Math.round(width * ratio), h = Math.round(height * ratio)
    const bounds: Bounds = { x: -this.by.x / this.by.scale, y: -this.by.y / this.by.scale, w: width / this.by.scale, h: height / this.by.scale }
    this.base = this.make(w, h)
    const b = this.base.getContext('2d')!
    this.place(b)
    paintRock(b, bounds)
    paintAbove(b, new Pigments(k, this.make), bounds)
    this.shade = this.make(w, h)
    const s = this.shade.getContext('2d')!
    this.place(s)
    paintShade(s, bounds)
    this.ground = this.make(w, h)
    this.bare = null
    this.painted.fill('')
  }

  /** Pixels of the canvas to one stage unit. */
  private get k(): number {
    return this.by.scale * this.ratio
  }

  /** Sets a context to draw in stage units. */
  private place(g: Paint): void {
    g.setTransform(this.k, 0, 0, this.k, this.by.x * this.ratio, this.by.y * this.ratio)
  }

  // --- The picture that stands still ------------------------------------------------------------------------------

  /** Brings `ground` up to the hill as it stands: all of it the first time, and after that only the blocks that changed. */
  private sync(game: Game): void {
    const ground = this.ground!, g = ground.getContext('2d')!
    const world = game.world
    // A boulder on its way is drawn by the frame, so the place it will rest in stays dug until it lands.
    const moving = new Set<number>()
    for (const motion of game.motions) if (motion.what === 'boulder') moving.add(motion.to)
    const key = (index: number): string => `${moving.has(index) ? 'open' : world.kinds[index]}${world.hits[index]}${world.lode[index] ?? ''}${world.wet[index] ? 'w' : ''}${world.water[index] ? 'f' : ''}${game.masks[index]}`
    const changed: number[] = []
    for (let index = 0; index < BLOCKS; index++) if (this.painted[index] !== key(index)) changed.push(index)
    // A whole hillside at once (the first frame, a resize, the fresh hill of a ride) is painted in one go; a few
    // blocks are painted each in its own place.
    if (changed.length > WHOLE) {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.drawImage(this.base!, 0, 0)
      this.place(g)
      this.blocks(g, game, moving, 0, 0, COLS - 1, ROWS - 1)
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.drawImage(this.shade!, 0, 0)
      for (let index = 0; index < BLOCKS; index++) this.painted[index] = key(index)
      this.repaints += 1
      return
    }
    for (const index of changed) {
      this.painted[index] = key(index)
      const { c, r } = cellOf(index)
      // The block and the rubbed edges of its neighbours that reach into it.
      const pad = BLOCK_PAD + 2
      const x = Math.floor((HILL.x + c * CELL - pad) * this.k + this.by.x * this.ratio), y = Math.floor((HILL.y + r * CELL - pad) * this.k + this.by.y * this.ratio)
      const size = Math.ceil((CELL + pad * 2) * this.k) + 1
      g.save()
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.beginPath()
      g.rect(x, y, size, size)
      g.clip()
      g.drawImage(this.base!, x, y, size, size, x, y, size, size)
      this.place(g)
      this.blocks(g, game, moving, c - 1, r - 1, c + 1, r + 1)
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.drawImage(this.shade!, x, y, size, size, x, y, size, size)
      g.restore()
    }
  }

  /** Paints the blocks of a part of the hill: dug space first with its water, its wet and its light, then rock over its edges. */
  private blocks(g: Paint, game: Game, moving: Set<number>, c0: number, r0: number, c1: number, r1: number): void {
    const world = game.world, figures = this.figures!
    for (const dug of [true, false]) {
      for (let r = Math.max(0, r0); r <= Math.min(ROWS - 1, r1); r++) {
        for (let c = Math.max(0, c0); c <= Math.min(COLS - 1, c1); c++) {
          const index = indexOf(c, r), kind = moving.has(index) ? 'open' : world.kinds[index]
          if ((kind === 'open') !== dug) continue
          const x = HILL.x + c * CELL, y = HILL.y + r * CELL
          stamp(g, figures.block(kind, variantOf(index), world.hits[index]), x, y)
          if (kind === 'open') this.dug(g, game, index, x, y)
          else if (world.lode[index]) {
            // A gem in its block: most of it shows, and the ground closes over its lower corners.
            const colour = world.lode[index]!
            stampTurned(g, figures.gem[colour], x + CELL / 2, y + CELL / 2 + 2, 0.2 + (index % 5) * 0.2, 1.15, 1.15)
            g.fillStyle = kind === 'earth' ? RED : YELLOW
            g.beginPath()
            g.ellipse(x + CELL / 2 - 9, y + CELL / 2 + 13, 8, 4.4, 0.5, 0, Math.PI * 2)
            g.ellipse(x + CELL / 2 + 10, y + CELL / 2 + 12, 6, 3.6, -0.6, 0, Math.PI * 2)
            g.fill()
          }
        }
      }
    }
  }

  /** What a dug block holds beyond its dark: standing water, the shine of wet, and the light that reaches it. */
  private dug(g: Paint, game: Game, index: number, x: number, y: number): void {
    const world = game.world
    if (world.water[index]) {
      g.fillStyle = WATER_DEEP
      g.globalAlpha = 0.82
      g.fillRect(x - 1, y + 34, CELL + 2, CELL - 34)
      g.globalAlpha = 1
      g.strokeStyle = WATER
      g.lineWidth = 2.6
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(x, y + 35)
      g.quadraticCurveTo(x + CELL * 0.25, y + 32, x + CELL * 0.5, y + 35)
      g.quadraticCurveTo(x + CELL * 0.75, y + 38, x + CELL, y + 35)
      g.stroke()
    } else if (world.wet[index]) {
      // Wet and staying wet: a shine along the floor and three runs down the back wall.
      g.strokeStyle = WATER
      g.lineCap = 'round'
      g.globalAlpha = 0.7
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(x + 8, y + CELL - 6)
      g.quadraticCurveTo(x + CELL * 0.5, y + CELL - 10, x + CELL - 8, y + CELL - 5)
      g.stroke()
      g.globalAlpha = 0.5
      g.lineWidth = 2
      g.beginPath()
      // Three runs of unequal length, all leaning the way the wall leans.
      const a = (index % 3) * 5, b = (index % 4) * 4
      g.moveTo(x + 24 + a, y + 9)
      g.lineTo(x + 15 + a, y + 30 + b)
      g.moveTo(x + 50 + b, y + 15)
      g.lineTo(x + 36 + b, y + 50)
      g.moveTo(x + 74 - a, y + 11)
      g.lineTo(x + 69 - a, y + 23)
      g.stroke()
      g.globalAlpha = 1
    }
    const light = LIGHT[game.masks[index]]
    if (light) {
      g.save()
      g.globalCompositeOperation = 'lighter'
      const pool = g.createRadialGradient(x + CELL / 2, y + CELL / 2, 8, x + CELL / 2, y + CELL / 2, CELL * 0.8)
      pool.addColorStop(0, `rgba(${light}, 0.6)`)
      pool.addColorStop(1, `rgba(${light}, 0.36)`)
      g.fillStyle = pool
      g.fillRect(x, y, CELL, CELL)
      g.restore()
    }
  }

  // --- The frame ----------------------------------------------------------------------------------------------------

  /** Draws the frame. With no game yet, the wall and its paintings alone. */
  draw(show: Show | null): void {
    const g = this.g
    this.stamps = 0
    this.pen = 0
    if (!this.by.scale || !this.base) return
    g.setTransform(1, 0, 0, 1, 0, 0)
    if (!show) {
      g.drawImage(this.base, 0, 0)
      g.drawImage(this.shade!, 0, 0)
      this.stamps = 2
      return
    }
    this.time += show.step
    this.sync(show.game)
    g.drawImage(this.ground!, 0, 0)
    this.stamps += 1
    this.place(g)
    this.drawShudders(show)
    this.drawHalves(show)
    this.drawBoulders(show)
    this.drawFlashes(show)
    this.drawGems(show, false)
    this.drawTools(show)
    this.drawDrips(show)
    this.drawWorms(show)
    for (const lodger of show.cast.lodgers) this.drawLodger(lodger)
    this.drawWater(show)
    this.drawRoll(show)
    this.drawLift(show, false)
    this.drawMole(show)
    this.drawGems(show, true)
    this.drawLift(show, true)
    this.drawFlying(show)
    this.drawMammoth(show)
    this.drawHerd(show)
    this.drawPrints(show)
    this.drawHand(show)
    this.drawGuidance(show)
  }

  private put(sprite: Sprite, x: number, y: number, turn = 0, sx = 1, sy = 1): void {
    if (turn === 0 && sx === 1 && sy === 1) stamp(this.g, sprite, x, y)
    else stampTurned(this.g, sprite, x, y, turn, sx, sy)
    this.stamps += 1
  }

  private fill(): void {
    this.g.fill()
    this.pen += 1
  }

  private stroke(): void {
    this.g.stroke()
    this.pen += 1
  }

  /** A knocked or struck block jumps in its place for a moment. */
  private drawShudders(show: Show): void {
    const g = this.g, world = show.game.world
    for (const shudder of show.effects.shudders) {
      const kind = world.kinds[shudder.index]
      if (kind === 'open') continue
      const { c, r } = cellOf(shudder.index)
      const t = shudder.life / shudder.length
      const jump = Math.sin(t * Math.PI * 5) * 2.2 * t * shudder.strength
      const sprite = this.figures!.block(kind, variantOf(shudder.index), world.hits[shudder.index])
      g.save()
      g.translate(HILL.x + (c + 0.5) * CELL + jump, HILL.y + (r + 0.5) * CELL - Math.abs(jump) * 0.6)
      g.scale(1.05 + 0.03 * t, 1.05 - 0.02 * t)
      g.drawImage(sprite.image, -CELL / 2 - sprite.ax, -CELL / 2 - sprite.ay, sprite.w, sprite.h)
      g.restore()
      this.stamps += 1
    }
  }

  /** A block of sandstone the wedge has split: the two halves slide apart and sink to the floor of the block they stood in. */
  private drawHalves(show: Show): void {
    const g = this.g
    for (const split of show.effects.halves) {
      if (show.game.world.kinds[split.index] !== 'open') continue
      const k = 1 - split.life / split.length
      const sprite = this.figures!.block('sandstone', variantOf(split.index), 0)
      const top = corner(split.index)
      // They part first and sink after; each stays inside the block, so neither half reaches the mole beside it.
      const apart = Math.min(1, k / 0.35) * 7, sunk = clamp01((k - 0.25) / 0.75)
      const sw = sprite.image.width / 2, sh = sprite.image.height
      g.save()
      g.beginPath()
      g.rect(top.x, top.y, CELL, CELL)
      g.clip()
      for (const side of [-1, 1]) {
        g.save()
        g.translate(top.x + CELL / 2 + side * apart, top.y + CELL)
        g.rotate(side * sunk * 0.16)
        g.scale(1, 1 - sunk * sunk * 0.86)
        g.drawImage(sprite.image, side < 0 ? 0 : sw, 0, sw, sh, -CELL / 2 - sprite.ax + (side < 0 ? 0 : sprite.w / 2), -CELL - sprite.ay, sprite.w / 2, sprite.h)
        g.restore()
        this.stamps += 1
      }
      g.restore()
    }
  }

  /** A loose boulder on its way: hauled a block along, or falling. */
  private drawBoulders(show: Show): void {
    for (const motion of show.game.motions) {
      if (motion.what !== 'boulder') continue
      const at = show.game.boulderPlace(motion)
      this.put(this.figures!.block('boulder', variantOf(motion.to), 0), at.x, at.y)
    }
  }

  /** A gem's colour thrown over the blocks round it. */
  /**
   * A gem's flash is one soft round bloom of its colour, never squares: knocked in the rock it swells over its
   * block and fades; struck free, the bloom goes twice round the block, over the walls one after the other.
   */
  private drawFlashes(show: Show): void {
    const g = this.g
    for (const flash of show.effects.flashes) {
      const t = flash.life / flash.length
      const { c, r } = cellOf(flash.index)
      const x = HILL.x + (c + 0.5) * CELL, y = HILL.y + (r + 0.5) * CELL
      const round = (1 - t) * Math.PI * 4 - 0.6
      const out = flash.swirl ? CELL * 0.46 : 0
      const size = flash.swirl ? 1.5 : 1.3 + (1 - t) * 0.9
      g.save()
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = Math.min(1, (flash.swirl ? 1.1 : 1.3) * t)
      this.put(this.figures!.bloom[flash.colour], x + Math.cos(round) * out, y + Math.sin(round) * out * 0.9, 0, size, size * (flash.swirl ? 1 : 0.92))
      g.restore()
    }
  }

  /** Every gem that is out of its block: set in a wall, on the floor, on the rope, or on its way. */
  private drawGems(show: Show, atHisFeet: boolean): void {
    const g = this.g, game = show.game, world = game.world, figures = this.figures!
    for (const gem of world.gems) {
      if (gem.rest === 'bucket' || game.hand?.gem === gem) continue
      // A gem that lies on the floor of the block the mole stands in lies in front of his feet: it is drawn after him, and a finger finds it before him.
      if ((gem.rest === 'floor' && gem.at === world.mole.at) !== atHisFeet) continue
      const place = game.gemPlace(gem)
      let x = place.x, y = place.y
      const turn = place.turn
      if (gem.rest === 'hung' && !game.motions.some((motion) => motion.gem === gem)) {
        // A lamp on the rope: it swings from the roof when the mole has ducked under it.
        const top = corner(gem.at)
        const swing = show.cast.lamp.x * 0.5
        x = top.x + CELL / 2 + Math.sin(swing) * 24
        y = top.y + 2 + Math.cos(swing) * 24
        g.strokeStyle = YELLOW_DEEP
        g.lineWidth = 3
        g.lineCap = 'round'
        g.beginPath()
        g.moveTo(top.x + CELL / 2, top.y + 1)
        g.lineTo(x, y - 10)
        this.stroke()
      } else if (gem.rest === 'hung') this.slackRope(gem.at)
      g.save()
      g.globalCompositeOperation = 'lighter'
      const breathe = 1 + Math.sin(this.time * 2.2 + gem.at) * 0.06
      this.put(figures.shine[gem.colour], x, y, 0, breathe, breathe)
      g.restore()
      this.put(figures.gem[gem.colour], x, y, turn)
    }
  }

  /** The tools that lie where they were put down, and what the bucket holds. */
  private drawTools(show: Show): void {
    const game = show.game, world = game.world, figures = this.figures!
    for (const tool of TOOLS) {
      // What he took into the cage stays in his paw until he steps out of it.
      if (world.mole.tool === tool || game.carried?.tool === tool) continue
      // The rope that holds a lamp up is drawn with the lamp.
      if (tool === 'rope' && world.gems.some((gem) => gem.rest === 'hung')) continue
      const spot = game.toolPlace(tool)
      // A tool on the grass is rolled up with the hillside it lies on, and lies on the fresh one once that is unrolled under it.
      const roll = game.staging.roll
      if (roll && isGrass(world.tools[tool]) && (roll.phase === 'away' ? spot.x > this.rollEdge(roll) : spot.x < this.rollEdge(roll))) continue
      const x = spot.x
      let y = spot.y
      const hop = show.effects.hops.find((other) => other.tool === tool)
      if (hop) y -= Math.sin((1 - hop.life / hop.length) * Math.PI) * 9
      if (tool === 'wedge') this.put(figures.tool.wedge, x, y - 38, Math.PI / 2)
      else if (tool === 'bucket') { this.put(figures.tool.bucket, x, y - 44); this.drawLoad(show, x, y - 44, 0) }
      else this.put(figures.tool.rope, x, y)
    }
  }

  /** What the bucket holds, drawn at its mouth. `x`, `y` is the top of its handle. */
  private drawLoad(show: Show, x: number, y: number, turn: number): void {
    const g = this.g, load = show.game.carried?.load ?? show.game.world.mole.load
    if (load === 'nothing') return
    const mx = x - Math.sin(turn) * 14, my = y + Math.cos(turn) * 14
    if (load === 'earth' || load === 'sand' || load === 'water') {
      g.fillStyle = load === 'earth' ? RED : load === 'sand' ? YELLOW : WATER
      g.beginPath()
      g.ellipse(mx, my - (load === 'water' ? 0 : 3), 15, load === 'water' ? 3.4 : 6.5, turn, 0, Math.PI * 2)
      this.fill()
      return
    }
    // A gem makes the bucket a lantern: its light goes only upward.
    g.save()
    g.globalCompositeOperation = 'lighter'
    this.put(this.figures!.shine[load], mx, my - 16, 0, 0.8, 1.2)
    g.restore()
    this.put(this.figures!.gem[load], mx, my - 3, 0.3, 0.8, 0.8)
  }

  /** The drop each spout lets go: it swells at the hole and falls or runs down, and lands as its plink sounds. */
  private drawDrips(show: Show): void {
    const g = this.g, world = show.game.world
    for (const [index, since] of show.game.drips) {
      const k = since / DRIP_S
      if (k < 0.55) continue
      const top = corner(index)
      const fall = clamp01((k - 0.88) / 0.12)
      // Over a dug block the drop falls to its floor; over rock it runs down the wet under the hole and is gone into it.
      const dug = index + COLS < BLOCKS && world.kinds[index + COLS] === 'open'
      const x = top.x + CELL / 2, y = dug ? top.y + CELL - 4 + fall * fall * (CELL - 6) : top.y + CELL - 15 + fall * 11
      const size = (2 + clamp01((k - 0.55) / 0.33) * 2.4) * (dug ? 1 : 1 - fall * 0.5)
      g.fillStyle = WATER
      g.beginPath()
      g.moveTo(x, y - size * 1.6)
      g.quadraticCurveTo(x + size, y, x, y + size)
      g.quadraticCurveTo(x - size, y, x, y - size * 1.6)
      this.fill()
    }
  }

  /** A worm looks out of its block of earth, and is gone when anything comes near. */
  private drawWorms(show: Show): void {
    for (const worm of show.cast.worms) {
      const out = clamp01(worm.out.x)
      if (out <= 0.02) continue
      const mid = centre(colOf(worm.at), rowOf(worm.at))
      const side = worm.phase < 0.5 ? 1 : -1
      const wave = Math.sin(this.time * (1.6 + worm.phase) + worm.phase * 9)
      this.put(this.figures!.worm, mid.x + side * 6, mid.y + 12 - worm.phase * 20, (side > 0 ? 0 : Math.PI) + wave * 0.5 - 0.5 * side, out, 0.8 + out * 0.2)
    }
  }

  /**
   * One dweller. Each kind is drawn its own way: how it breathes, what it does now and then, how it flinches at a
   * noise and what a finger makes it do. `shown` scales it about the roof or the floor it holds to, so one that
   * draws back out of the mole's way goes into the rock it came from.
   */
  private drawLodger(lodger: Lodger): void {
    if (lodger.shown <= 0.02) return
    const g = this.g, pics = this.figures!.dweller[lodger.kind]
    const spot = dwellerSpot(lodger.kind, lodger.at)
    const t = this.time + lodger.phase * 10
    const start = through(lodger.start), idle = through(lodger.idleBeat)
    const flinch = clamp01(lodger.flinch.x)
    const going = lodger.leaving ? 1 - lodger.here : 0
    const move = lodger.turn % 3
    g.save()
    g.translate(spot.x + lodger.off.x, spot.y + lodger.off.y)
    g.scale(lodger.shown, lodger.shown)
    if (lodger.blown > 0) g.rotate(Math.sin(lodger.blown * 20) * 0.6)
    switch (lodger.kind) {
      case 'bat': {
        if (start !== null || going > 0) {
          // Off the roof: it drops, flaps where it is, and goes back up; leaving, it flaps away to the nearest dark.
          const p = start ?? going
          const beat = Math.floor(t * 13) % 2 === 0
          this.put(pics[beat ? 3 : 4], Math.sin(p * Math.PI * 4) * 6, Math.sin(p * Math.PI) * 12 + (beat ? -3 : 3), Math.sin(p * Math.PI * 4) * 0.12)
          break
        }
        const stretching = idle !== null && move === 1 && idle > 0.15 && idle < 0.8
        const sway = Math.sin(t * 1.3) * 0.07 + (idle !== null && move === 2 ? Math.sin(idle * 60) * 0.05 * (1 - idle) : 0)
        const peeking = flinch > 0.4 || (idle !== null && move === 0)
        this.put(pics[stretching ? 2 : peeking ? 1 : 0], 0, 0, sway, 1 - 0.2 * flinch, 1 + 0.05 * flinch)
        break
      }
      case 'newt': {
        // Slow and loose: it sways as it stands, lifts its head now and then, and darts when touched.
        const dart = start !== null ? Math.sin(start * Math.PI * 2) * 12 : 0
        const head = idle !== null ? -Math.sin(idle * Math.PI) * 0.22 : 0
        this.put(pics[0], dart - going * 14, 0, Math.sin(t * 1.2) * 0.05 + head + (start !== null ? Math.sin(start * 50) * 0.08 : 0), 1, 1 - 0.3 * flinch)
        break
      }
      case 'lizard': {
        // Still as a stone in its light; it does push-ups, and scuttles and comes back.
        const up = idle !== null ? -Math.abs(Math.sin(idle * Math.PI * 3)) * 5 : 0
        const run = start !== null ? Math.sin(start * Math.PI * 4) * 11 * (1 - start) : 0
        this.put(pics[0], run + going * 16, up, start !== null ? Math.sin(start * 70) * 0.06 : 0, going > 0 ? -1 : 1, 1 - 0.35 * flinch)
        break
      }
      case 'mushroom': {
        // It breathes, nods its caps, and at a touch sinks flat and springs up again.
        const sink = start !== null ? Math.sin(Math.min(1, start * 1.6) * Math.PI) * 0.55 : 0
        const spring = start !== null && start > 0.62 ? Math.sin((start - 0.62) * 22) * 0.12 * (1 - start) : 0
        this.put(pics[0], 0, 0, idle !== null ? Math.sin(idle * Math.PI * 4) * 0.1 * (1 - idle) : 0, 1 + sink * 0.3 + 0.1 * flinch, 1 + Math.sin(t * 1.5) * 0.03 - sink + spring - 0.15 * flinch)
        break
      }
      case 'beetle': {
        // It trundles to and fro, lifts its wing cases, and a touch tips it on its back, legs going.
        const walk = Math.sin(t * 0.5) * 6
        const way = Math.cos(t * 0.5) >= 0 ? 1 : -1
        if (start !== null) {
          const over = Math.sin(Math.min(1, start * 1.4) * Math.PI)
          g.translate(walk, -12)
          this.put(pics[Math.floor(t * 9) % 2], 0, 12, over * Math.PI * way, 1, 1)
          break
        }
        this.put(pics[idle !== null && idle > 0.2 && idle < 0.8 ? 1 : 0], walk + going * 14 * way, 0, 0, way, 1 - 0.3 * flinch)
        break
      }
      case 'fern': {
        // The fronds sway; the frog beside them swells its throat, and a touch makes it jump.
        const jump = start !== null ? Math.sin(start * Math.PI) : 0
        this.put(pics[0], -6, 0, Math.sin(t * 0.9) * 0.04 + (start !== null ? Math.sin(start * 40) * 0.05 * (1 - start) : 0))
        const swell = idle !== null ? 1 + Math.sin(idle * Math.PI * 3) * 0.12 : 1
        this.put(pics[1], 19 - jump * 10, -jump * 24, -jump * 0.5, swell, (1 - 0.4 * flinch) * (2 - swell))
        break
      }
      case 'glowworm': {
        // Threads that swing a little; their lights run down them now and then, flare at a touch and go out at a noise.
        const swing = Math.sin(t * 0.8) * 0.05 + (start !== null ? Math.sin(start * 40) * 0.12 * (1 - start) : 0)
        this.put(pics[0], 0, 0, swing)
        g.save()
        g.rotate(swing)
        g.globalCompositeOperation = 'lighter'
        const threads = [[-12, 34], [1, 52], [13, 24]] as const
        threads.forEach(([x, long], i) => {
          const run = idle !== null ? (idle * 1.4 + i * 0.2) % 1 : 1
          const bright = (0.55 + Math.sin(t * 2 + i * 2.1) * 0.25 + (start !== null ? 0.4 * (1 - start) : 0)) * (1 - flinch)
          g.fillStyle = `rgba(170, 215, 255, ${clamp01(bright)})`
          g.beginPath()
          g.arc(x, 6 + (long - 6) * run, 3.6, 0, Math.PI * 2)
          this.fill()
        })
        g.restore()
        break
      }
      case 'snail': {
        // It creeps so slowly it hardly moves, rocks its shell, and pulls right in at a touch.
        const creep = Math.sin(t * 0.15) * 4
        const inside = start !== null ? Math.sin(Math.min(1, start * 1.3) * Math.PI) : 0.6 * flinch
        this.put(pics[1], creep + 2 - inside * 4, 0, 0, 1 - inside * 0.8, 1)
        this.put(pics[0], creep, 0, Math.sin(t * 0.7) * 0.04 + (idle !== null ? Math.sin(idle * Math.PI * 2) * 0.12 : 0) - inside * 0.1)
        break
      }
      case 'moth': {
        // Round and round where the two lights meet; it settles now and then, and scatters at a touch.
        const wide = start !== null ? 1 + Math.sin(start * Math.PI) * 0.7 : 1
        const still = idle !== null && idle > 0.2 && idle < 0.8
        const speed = start !== null ? 3 : 1
        const x = Math.cos(t * 2.3 * speed) * 9 * wide, y = Math.sin(t * 3.1 * speed) * 6 * wide
        this.put(pics[still ? 1 : Math.floor(t * 12) % 2], still ? 0 : x, still ? 6 : y, still ? 0 : Math.cos(t * 2.3 * speed) * 0.3, 1 - 0.2 * flinch, 1)
        break
      }
      case 'dragonfly': {
        // It hangs in the air, then is somewhere else: straight lines and sudden stops. A touch sends it round a triangle.
        const hop = (n: number): { x: number; y: number } => ({ x: Math.sin(n * 12.9898 + lodger.phase * 40) * 11, y: Math.sin(n * 78.233 + lodger.phase * 17) * 6 })
        const pace = start !== null ? 5 : 1.2
        const at = Math.floor(t * pace), part = clamp01(((t * pace) % 1) * 5)
        const a = hop(at), b = hop(at + 1)
        const hang = idle !== null
        const x = hang ? a.x : lerp(a.x, b.x, part), y = hang ? a.y : lerp(a.y, b.y, part)
        this.put(pics[Math.floor(t * 20) % 2], x, y + Math.sin(t * 9) * 0.8, Math.PI / 2 + (b.x >= a.x ? 0 : Math.PI), 1, 1 - 0.3 * flinch)
        break
      }
      case 'spider': {
        // It sits in its web, lets itself down on a thread and climbs back, and a touch drops it to the end of the thread.
        this.put(pics[0], 0, 0)
        const down = start !== null ? Math.abs(Math.sin(start * Math.PI * 1.5)) * 22 * (1 - start * 0.4) : idle !== null ? Math.sin(idle * Math.PI) * 13 : 0
        const hx = -2, hy = 18
        if (down > 1) {
          g.strokeStyle = 'rgba(241, 232, 211, 0.8)'
          g.lineWidth = 1
          g.beginPath()
          g.moveTo(hx, hy)
          g.lineTo(hx, hy + down)
          this.stroke()
        }
        this.put(pics[1], hx, hy + down, Math.sin(t * 2) * 0.06, 1 - 0.25 * flinch, 1 - 0.25 * flinch)
        break
      }
      case 'flower': {
        // It nods on its stem, opens wider now and then, and shivers at a touch.
        const sway = Math.sin(t * 0.7) * 0.05 + (start !== null ? Math.sin(start * 50) * 0.14 * (1 - start) : 0)
        this.put(pics[0], 0, 0, sway)
        const open = 1 + (idle !== null ? Math.sin(idle * Math.PI) * 0.2 : 0) + (start !== null ? Math.sin(start * Math.PI) * 0.15 : 0) - 0.2 * flinch
        this.put(pics[1], 1 + Math.sin(sway) * 44, -44 * Math.cos(sway) - 2, sway * 2 + t * 0.1, open, open)
        break
      }
    }
    g.restore()
  }

  /** Water on its way down the dug space, and the pool that rocks where it comes to rest. */
  private drawWater(show: Show): void {
    const g = this.g, staging = show.game.staging
    if (staging.stream) {
      const { x, y } = staging.stream
      g.fillStyle = WATER
      g.beginPath()
      g.ellipse(x, y, 17, 13, 0, 0, Math.PI * 2)
      this.fill()
      g.fillStyle = CLAY
      g.beginPath()
      g.ellipse(x - 5, y - 4, 4, 2.6, -0.5, 0, Math.PI * 2)
      this.fill()
    }
    if (staging.lap) {
      // Twice to and fro, and each time the surface is at its far tilt the lap is heard.
      const top = corner(staging.lap.index)
      const k = clamp01(staging.lap.k)
      const tilt = Math.cos(k * Math.PI * 2) * 7 * (1 - k * 0.6)
      g.strokeStyle = CLAY
      g.lineWidth = 3
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(top.x + 2, top.y + 35 - tilt)
      g.quadraticCurveTo(top.x + CELL / 2, top.y + 35, top.x + CELL - 2, top.y + 35 + tilt)
      this.stroke()
    }
  }

  /** Where the roll of the hide stands now: it goes from the right edge of the hill to the left, rolling up and unrolling alike. */
  private rollEdge(roll: { k: number }): number {
    return lerp(HILL.x + COLS * CELL + 4, HILL.x - 4, ease(clamp01(roll.k)))
  }

  /** The hillside rolled away like a hide, and the fresh one unrolled: the bare rock of the wall where no hide lies, and the roll itself. */
  private drawRoll(show: Show): void {
    const roll = show.game.staging.roll
    if (!roll) return
    const g = this.g
    const left = HILL.x - 4, right = HILL.x + COLS * CELL + 4, top = HILL.y - 4, tall = ROWS * CELL + 8
    const at = this.rollEdge(roll)
    // Where no hide lies the wall shows: the rock as it is painted under every hill, shaded as the wall is.
    const from = roll.phase === 'away' ? at : left, to = roll.phase === 'away' ? right : at
    const px = Math.floor(from * this.k + this.by.x * this.ratio), py = Math.floor(top * this.k + this.by.y * this.ratio)
    const pw = Math.ceil((to - from) * this.k), ph = Math.ceil(tall * this.k)
    if (pw >= 1) {
      // The wall under its shading is put together once, at the first roll after the surface was sized.
      if (!this.bare) {
        this.bare = this.make(this.base!.width, this.base!.height)
        const b = this.bare.getContext('2d')!
        b.drawImage(this.base!, 0, 0)
        b.drawImage(this.shade!, 0, 0)
      }
      g.save()
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.drawImage(this.bare, px, py, pw, ph, px, py, pw, ph)
      g.restore()
      this.stamps += 1
    }
    // The roll: thicker the more of the hide is wound on it. It stands a little above the grass, and takes what lies there.
    const thick = roll.phase === 'away' ? 14 + roll.k * 26 : 40 - roll.k * 26
    const head = HILL.y - ROLL_ABOVE
    // One fill: deep red, with a pale band down its near side where the light catches the round of it.
    const round = g.createLinearGradient(at - thick / 2, 0, at + thick / 2, 0)
    round.addColorStop(0, RED_DEEP)
    round.addColorStop(0.1, ROLL_LIT)
    round.addColorStop(0.3, ROLL_LIT)
    round.addColorStop(0.42, RED_DEEP)
    round.addColorStop(1, RED_DEEP)
    g.fillStyle = round
    g.fillRect(at - thick / 2, head, thick, tall + ROLL_ABOVE)
    this.pen += 1
    // Its end, seen from above: pale where the hide is cut.
    g.fillStyle = RED_PALE
    g.beginPath()
    g.ellipse(at, head, thick / 2, thick / 5, 0, 0, Math.PI * 2)
    this.fill()
  }

  /** The lift's cage on its rope: its back behind the mole, and its posts, its door and the crank in front of him. */
  private drawLift(show: Show, front: boolean): void {
    const g = this.g, lift = this.figures!.lift, staging = show.game.staging
    const bounce = show.cast.cage.x * 4
    const x = LIFT_ROPE.x + bounce * 0.3, y = CAGE_FLOOR - staging.rise * RISE + bounce
    if (!front) {
      g.strokeStyle = CHARCOAL
      g.lineWidth = 2.6
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(LIFT_ROPE.x, LIFT_ROPE.y)
      g.lineTo(x, y - 112)
      this.stroke()
      this.put(lift.back, x, y, show.cast.cage.x * 0.04)
      return
    }
    this.put(lift.front, x, y, show.cast.cage.x * 0.04)
    if (staging.door) this.put(lift.door, x, y, show.cast.cage.x * 0.04)
    this.put(lift.crank, CRANK.x, CRANK.y, staging.wind * Math.PI * 2)
  }

  private drawMole(show: Show): void {
    const g = this.g, figures = this.figures!, parts = figures.mole
    const game = show.game, mole = game.mole, world = game.world, face = show.cast.mole
    const pose = molePose(game, face)
    // On the ride what he took into the cage is in his paw all the way, on the fresh hillside too.
    if (game.carried) pose.held = game.carried.tool
    const at = game.moleAt()
    // Looking back over his shoulder he stands turned round, toward the child, for as long as the look lasts.
    const facing = mole.face * (mole.back > 0 ? -1 : 1)
    // The candle's pool of light, under him.
    g.save()
    g.globalCompositeOperation = 'lighter'
    const flicker = 1 + Math.sin(this.time * 13) * 0.02 + Math.sin(this.time * 7.3) * 0.02
    this.put(figures.glow, at.x, at.y - 44, 0, flicker, flicker)
    g.restore()

    const squash = Math.max(-0.16, Math.min(0.2, face.squash.x * 0.11))
    const breath = mole.mode === 'rest' ? Math.sin(face.time * 2.4) * 0.012 : 0
    const aim = pose.down > 0 ? 1.3 : pose.down < 0 ? -1.3 : 0.12
    const sooty = world.mole.sooty

    g.save()
    g.translate(at.x + pose.shake, at.y + pose.bob - pose.lift)
    g.scale(facing, 1)
    if (pose.roll) { g.translate(0, -30); g.rotate(pose.roll); g.translate(0, 30) }
    g.rotate(pose.lean)
    g.scale(pose.wide * (1 + squash + breath), pose.tall * (1 - squash - breath) * (1 - pose.sit * 0.16))

    // The far paw. It carries the pick when the near paw has a tool; it wipes his brow; spread on the roof it is flung out.
    const far = pose.spread ? { x: -30, y: -52, turn: 3.6 } : { x: lerp(-14, 20, pose.wipe), y: lerp(-26, -52, pose.wipe) - pose.strike * 3, turn: 2.6 + pose.wipe * 1.2 }
    // With a tool in his near paw the pick rides on his far shoulder, behind him, its head up.
    if (pose.held !== 'pick') this.put(parts.pick, -10, -24, -2 + pose.stride * 0.012)
    this.put(parts.paw, far.x + Math.sin(this.time * 55) * 2 * pose.sting, far.y, far.turn)
    // The feet: stepping, stuck out in front when he sits, apart on the roof.
    const out = pose.sit * 14 + pose.spread * 8
    this.put(parts.foot, -12 - pose.stride - pose.spread * 8 + pose.sit * 6, -3, pose.sit * -0.4)
    this.put(parts.foot, 11 + pose.stride + out, -3, pose.sit * -0.4)
    this.put(sooty ? parts.sooty : parts.body, 0, 0)
    // His ear: up, or flat along his head when he is cross.
    this.put(parts.ear, -11, -55, -0.5 - pose.ears * 1.3)
    // The nose twitches when earth crumbles: he likes that.
    if (pose.nose > 0) {
      g.fillStyle = RED
      g.beginPath()
      g.arc(42 + Math.sin(this.time * 48) * 1.6 * pose.nose, -42 + Math.cos(this.time * 41) * 1.2 * pose.nose, 5, 0, Math.PI * 2)
      this.fill()
    }

    // The eyes: two dots that follow the finger, with brows that go up at a fright and down when he is cross.
    if (pose.hatDown < 0.5) {
      const dx = (mole.look.x - at.x) * facing, dy = mole.look.y - (at.y - 44)
      const length = Math.hypot(dx, dy) || 1
      const lx = (dx / length) * 1.7, ly = (dy / length) * 1.5
      const blink = through(face.blink) !== null || pose.eyes === 'shut'
      const wide = 2.6 + face.start * 1.7 + (pose.eyes === 'wide' ? 1.4 : 0)
      const ink = sooty ? CLAY : CHARCOAL
      g.fillStyle = ink
      g.strokeStyle = ink
      g.lineCap = 'round'
      for (const [ex, ey] of [[12, -49], [23, -47]] as const) {
        if (blink) {
          g.lineWidth = 1.8
          g.beginPath()
          g.moveTo(ex - 3, ey)
          g.lineTo(ex + 3, ey)
          this.stroke()
        } else {
          g.beginPath()
          g.arc(ex + lx, ey + ly, wide, 0, Math.PI * 2)
          this.fill()
        }
      }
      const lift = 3 * face.start + (pose.eyes === 'wide' ? 2.4 : 0)
      const frown = (pose.eyes === 'cross' ? 3 : 0) + 1.6 * pose.strike
      g.lineWidth = 1.9
      g.beginPath()
      g.moveTo(8, -55 - lift)
      g.lineTo(15, -55.5 - lift + frown)
      g.moveTo(20, -54 - lift + frown)
      g.lineTo(28, -52 - lift)
      this.stroke()
    }
    const hx = 1 + pose.hatDown * 6, hy = -56 + pose.hatDown * 10 - pose.tip * 7
    this.put(parts.hat, hx, hy, -0.1 + pose.hatDown * 0.32 - pose.tip * 0.3)
    // The flame on the candle: alive all the time. On the roof after a blast it is out, and the hat smokes.
    if (pose.smoke || mole.hang) {
      g.strokeStyle = 'rgba(210, 200, 185, 0.7)'
      g.lineWidth = 2.4
      g.lineCap = 'round'
      const drift = Math.sin(this.time * 3) * 4
      g.beginPath()
      g.moveTo(hx + 9, hy - 23)
      g.quadraticCurveTo(hx + 9 + drift, hy - 31, hx + 9 - drift, hy - 38)
      this.stroke()
    } else {
      const fx = hx + 9 - pose.tip * 6, fy = hy - 23
      const tall = 4.6 + Math.sin(this.time * 17) * 0.6 + Math.sin(this.time * 9.1) * 0.5
      const blown = (mole.mode === 'walk' ? -3.2 : 0) + Math.sin(this.time * 5.3) * 0.7 - pose.strike * 2.4
      g.fillStyle = FLAME
      g.beginPath()
      g.moveTo(fx - 3, fy)
      g.quadraticCurveTo(fx - 3.2 + blown * 0.4, fy - tall * 0.6, fx + blown, fy - tall * 1.5)
      g.quadraticCurveTo(fx + 3.2 + blown * 0.4, fy - tall * 0.6, fx + 3, fy)
      this.fill()
    }

    // The near paw and what it holds: the arm reaches into the blow.
    const reach = pose.reach * 9
    const px = pose.spread ? 30 : 15 + Math.cos(aim) * reach, py = pose.spread ? -54 : -25 + Math.sin(aim) * reach
    const act = mole.mode === 'act' ? mole.act : null
    if (pose.held === 'pick') {
      // A mallet blow: the wedge stands in the face of the rock, and the pick comes down on its butt.
      if (act === 'mallet') this.put(figures.tool.wedge, 15 + Math.cos(aim) * 22, -25 + Math.sin(aim) * 22, aim)
      this.put(parts.pick, px, py, pose.spread ? -0.6 : pose.arm)
    } else if (pose.held === 'wedge') {
      this.put(figures.tool.wedge, px + Math.cos(aim) * pose.reach * 12, py + Math.sin(aim) * pose.reach * 12, pose.reach > 0 ? aim : pose.arm + 1.2)
    } else if (pose.held === 'bucket') {
      const floating = act === 'float' || (act === 'catchGas' && passed('catchGas', mole.t) >= 1)
      const tipped = (act === 'tip' || act === 'tipFeet') && passed(act, mole.t) >= 1 ? clamp01((mole.t - ACTS[act].cues[0]) / 0.12) * (1 - clamp01((mole.t - ACTS[act].cues[0] - 0.3) / 0.2)) : 0
      if (floating) {
        // Full of gas it stands on its head above him, and he hangs from its handle.
        this.put(figures.tool.bucket, px, py - 26, Math.PI + Math.sin(this.time * 4) * 0.1)
      } else {
        const turn = tipped * 1.9 + (act === 'gong' ? -strikeOf('gong', mole.t) * 0.6 : 0)
        const bx = px + Math.cos(aim) * pose.reach * 10, by = py - 8 + Math.sin(aim) * pose.reach * 10
        this.put(figures.tool.bucket, bx, by, turn)
        if (tipped < 0.5) this.drawLoad(show, bx, by, turn)
      }
    } else {
      this.put(figures.tool.rope, px + 5, py + 23, 0, 0.8, 0.8)
      this.drawRope(show, px, py, aim)
    }
    this.put(parts.paw, px + Math.sin(this.time * 61) * 2 * pose.sting, py, pose.spread ? -0.4 : pose.held === 'pick' ? pose.arm : aim)
    g.restore()
  }

  /** The rope at work, from his paw to the block: thrown in, sawn, taut, tied to a boulder, bobbing on water, standing up in gas, up to the roof. */
  private drawRope(show: Show, px: number, py: number, aim: number): void {
    const g = this.g, mole = show.game.mole
    const act = mole.mode === 'act' ? mole.act : null
    if (!act || !act.startsWith('rope') && act !== 'haul' && act !== 'hang') {
      // Between heaves the rope stays tied: it hangs slack from his paw to the boulder for as long as it is tied to it.
      const tied = show.game.world.tied
      if (tied === null || isGrass(show.game.world.mole.at)) return
      const at = show.game.moleAt(), to = centre(colOf(tied), rowOf(tied))
      // The mole is drawn in his own frame, facing right: the boulder's near face, in that frame.
      const bx = (to.x - at.x) * mole.face, by = to.y - at.y
      const far = Math.hypot(bx - px, by - py) || 1
      const ex = bx - ((bx - px) / far) * (CELL / 2 - 8), ey = by - ((by - py) / far) * (CELL / 2 - 8)
      g.strokeStyle = YELLOW_DEEP
      g.lineWidth = 3.4
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(px, py)
      g.quadraticCurveTo((px + ex) / 2, Math.max(py, ey) + 12, ex, ey)
      this.stroke()
      return
    }
    const t = mole.t, done = passed(act, t)
    const dx = Math.cos(aim), dy = Math.sin(aim)
    let far = 0, sag = 0, wave = 0
    if (act === 'ropeEarth') { far = done === 0 ? clamp01(t / ACTS.ropeEarth.cues[0]) * 62 : done === 1 ? 62 - clamp01((t - 0.3) / 0.65) * 44 : 18; sag = 4 }
    else if (act === 'ropeSaw') { far = 44; sag = -6; wave = Math.sin(t * 18) * 8 }
    else if (act === 'ropeTwang') { far = done >= 2 ? 30 : 52; sag = done === 1 ? Math.sin(t * 60) * 5 * (1 - clamp01((t - 0.4) / 0.25)) : done >= 2 ? 14 : 6 }
    else if (act === 'haul') { far = 50; sag = done >= 2 ? 0 : 8 }
    else if (act === 'ropeBob') { far = done >= 3 ? 16 : 54; sag = 10 - strikeOf('ropeBob', t) * 10 }
    else if (act === 'ropeSlap') { far = 30 + strikeOf('ropeSlap', t) * 24; sag = -8 }
    else if (act === 'ropeCharm') { far = 50; wave = swayOf(t) * 10 }
    else if (act === 'hang') { far = strikeOf('hang', t) * 40 }
    const ex = px + dx * far - dy * wave, ey = py + dy * far + dx * wave - (act === 'hang' ? far : 0) * (dy === 0 ? 0.9 : 0)
    g.strokeStyle = YELLOW_DEEP
    g.lineWidth = 3.4
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(px, py)
    g.quadraticCurveTo((px + ex) / 2, (py + ey) / 2 + sag, ex, ey)
    this.stroke()
    // What it comes back holding out of earth: one worm, which lets go.
    if (act === 'ropeEarth' && done === 1) this.put(this.figures!.worm, ex, ey, Math.PI / 2 + Math.sin(t * 30) * 0.5, 0.8, 0.8)
  }

  /** Chips, sparks, drops, dust, wisps of gas and beads of water, over the mole. */
  private drawFlying(show: Show): void {
    const g = this.g
    // The chips, one fill for each pigment in the air: a chip fades by shrinking, so many cost what one costs.
    const chips = show.effects.chips
    for (let tint = 0; tint < CHIP_TINTS.length; tint++) {
      let any = false
      for (const chip of chips) {
        if (chip.tint !== tint) continue
        if (!any) { g.beginPath(); any = true }
        const s = chip.size * Math.min(1, chip.life * 5)
        const cos = Math.cos(chip.turn), sin = Math.sin(chip.turn)
        // A spark is a streak, a drop of water is round, and a chip of rock has four uneven corners.
        const shape: readonly (readonly [number, number])[] = tint === 6 ? SPARK : tint === 7 ? DROP : CHIP
        shape.forEach(([x, y], i) => {
          const px = chip.x + (x * cos - y * sin) * s, py = chip.y + (x * sin + y * cos) * s
          if (i === 0) g.moveTo(px, py)
          else g.lineTo(px, py)
        })
        g.closePath()
      }
      if (!any) continue
      g.fillStyle = CHIP_TINTS[tint]
      this.fill()
    }
    for (const puff of show.effects.puffs) {
      const t = 1 - puff.life / puff.length
      g.globalAlpha = (1 - t) * 0.8
      const size = (0.45 + t * 1.1) * puff.grow
      this.put(this.figures!.puff, puff.x, puff.y - t * 12, 0, size, size)
    }
    for (const wisp of show.effects.wisps) {
      const t = 1 - wisp.life / wisp.length
      g.globalAlpha = (1 - t) * 0.9
      this.put(this.figures!.wisp, wisp.x + wisp.lean * t * 14, wisp.y - t * 34, wisp.lean * 0.3 + Math.sin(t * 6) * 0.2, 0.7 + t * 0.6, 0.5 + t * 0.7)
    }
    g.globalAlpha = 1
    for (const bead of show.effects.beads) {
      const t = 1 - bead.life / bead.length
      g.fillStyle = WATER
      g.globalAlpha = 1 - t * t
      g.beginPath()
      g.ellipse(bead.x, bead.y + t * t * 34, 4, 5.4, 0, 0, Math.PI * 2)
      this.fill()
    }
    g.globalAlpha = 1
  }

  private drawMammoth(show: Show): void {
    const g = this.g, parts = this.figures!.mammoth
    const m = show.cast.mammoth, game = show.game, mole = game.mole
    // It is painted facing left and turned here to face the lift, so everything below is in its own frame: x grows toward its tail.
    const O = MAMMOTH_AT
    const own = (x: number, y: number): { x: number; y: number } => ({ x: -(x - O.x) / O.scale, y: (y - O.y) / O.scale })
    g.save()
    g.translate(O.x, O.y)
    g.scale(-O.scale, O.scale)
    const breath = Math.sin(m.time * 1.1)
    const idle = through(m.idleBeat) ?? 0
    const winding = game.staging.wind * Math.PI * 2
    const shift = (m.idle === 'shift' ? Math.sin(idle * Math.PI * 2) * 0.012 : 0) + Math.sin(winding) * 0.008
    // The tail, behind everything: a swish every so often.
    const swish = Math.sin(m.time * 0.9) * 0.12 + (m.idle === 'tail' ? Math.sin(idle * Math.PI * 6) * 0.7 * (1 - idle) : 0)
    g.strokeStyle = CHARCOAL
    g.lineCap = 'round'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(118, -100)
    g.quadraticCurveTo(136 + swish * 16, -86, 134 + swish * 34, -56)
    this.stroke()
    this.put(parts.body, 0, 0, shift, 1, 1 + breath * 0.007 + m.fur * 0.03)
    // Its fur on end after a blast.
    if (m.fur > 0.02) { g.globalAlpha = clamp01(m.fur * 1.6); this.put(parts.bristle, 0, 0, shift, 1.02, 1.04); g.globalAlpha = 1 }
    // The near legs: each lifts off the ground over a blow under it.
    const hind = Math.max(0, m.hind.x), fore = Math.max(0, m.fore.x)
    this.put(parts.leg, 64, -58 - hind * 12, -hind * 0.16)
    this.put(parts.leg, -60, -58 - fore * 12, fore * 0.16)

    // The head turns about the neck: down to look between its legs, and it shakes when the tusks rattle.
    const neck = { x: -86, y: -86 + breath * 1.2 }
    const turn = -m.dip.x * 0.3 + shift * 2 + Math.sin(m.time * 62) * 0.03 * m.rattle
    const cos = Math.cos(turn), sin = Math.sin(turn)
    const onHead = (x: number, y: number): { x: number; y: number } => ({ x: neck.x + x * cos - y * sin, y: neck.y + x * sin + y * cos })
    // The trunk: a row of rings from the face to its tip. The tip rests on the crank and goes round with it; a
    // finger lifts it; the smell of gas ties it in a knot; water at its feet brings it down to drink and up to blow.
    const root = onHead(-40, 10)
    const knob = own(CRANK.x - 10 * Math.cos(winding), CRANK.y - 10 * Math.sin(winding))
    const lifted = clamp01(m.trunk.x)
    const curl = m.idle === 'curl' ? Math.sin(idle * Math.PI) : 0
    let tip = { x: lerp(knob.x + 9, root.x - 34, lifted) + curl * 9, y: lerp(knob.y - 3, root.y - 96, lifted) - curl * 14 }
    let bend = { x: lerp((root.x + tip.x) / 2 - 6, root.x - 62, lifted), y: lerp(Math.max(root.y, tip.y) + 34, root.y - 22, lifted) }
    let drinking = 0, blowing = 0
    if (mole.mode === 'act' && mole.act === 'tipFeet') {
      const [tipped, slurp, spray] = ACTS.tipFeet.cues
      const ground = own(MAMMOTH.x + MAMMOTH.w - 12, HILL.y - 6)
      const down = ease(clamp01((mole.t - tipped) / (slurp - tipped))) * (1 - ease(clamp01((mole.t - (spray - 0.25)) / 0.25)))
      blowing = mole.t >= spray ? 1 - clamp01((mole.t - spray - 0.5) / 0.4) : 0
      drinking = mole.t >= slurp && mole.t < spray ? 1 : 0
      const aimed = { x: root.x - 52, y: root.y - 6 }
      tip = { x: lerp(lerp(tip.x, ground.x, down), aimed.x, blowing), y: lerp(lerp(tip.y, ground.y, down), aimed.y, blowing) }
      bend = { x: lerp(bend.x, root.x - 30, Math.max(down, blowing)), y: lerp(bend.y, root.y + 30 - blowing * 40, Math.max(down, blowing)) }
    }
    // Its invitation: with the mole waiting in the cage, the trunk leaves the crank, reaches over to the cage's rope and taps it twice.
    const invite = show.cast.invite
    let showing = 0
    if (invite !== null) {
      showing = ease(clamp01((invite - 0.1) / 0.25)) * (1 - ease(clamp01((invite - 0.74) / 0.2)))
      const tap = Math.max(...INVITE_TAPS.map((at) => (invite >= at - 0.07 && invite < at + 0.05 ? Math.sin(((invite - at + 0.07) / 0.12) * Math.PI) : 0)))
      // It comes at the rope from its own side, a little off it, and each tap closes the gap.
      const rope = own(ROPE_AT.x - 8 - (1 - tap) * 11, ROPE_AT.y)
      tip = { x: lerp(tip.x, rope.x, showing), y: lerp(tip.y, rope.y, showing) }
      // Reaching, the trunk is nearly straight: it is only just long enough.
      bend = { x: lerp(bend.x, (root.x + rope.x) / 2, showing), y: lerp(bend.y, (root.y + rope.y) / 2 + 12, showing) }
    }
    const RINGS = 7
    const knotted = m.knot > 0
    for (let i = RINGS - 1; i >= 0; i--) {
      // Stretched out to the rope, the small rings at the tip close up and the big ones at the face take the length.
      const even = i / (RINGS - 1)
      const t = lerp(even, 1 - (1 - even) * (1 - even), 0.35 * showing), u = 1 - t
      let x = u * u * root.x + 2 * u * t * bend.x + t * t * tip.x, y = u * u * root.y + 2 * u * t * bend.y + t * t * tip.y
      if (knotted) {
        // Tied shut: the rings go once round on themselves under its face.
        const a = t * Math.PI * 2.4 + 0.6
        x = root.x - 10 - Math.sin(a) * 15 * (0.5 + t * 0.5)
        y = root.y + 20 - Math.cos(a) * 15 * (0.5 + t * 0.5)
      }
      // A swallow goes up the trunk while it drinks.
      const gulp = drinking ? 1 + Math.max(0, Math.sin((mole.t * 5 - t * 3) * Math.PI)) * 0.2 : 1
      const size = lerp(1.06, 0.6, t) * gulp
      this.put(parts.trunk, x, y, t * 2, size, size)
    }
    if (blowing > 0) {
      // Blown back over the mole: a fan of drops from the tip of the trunk toward him.
      g.fillStyle = WATER
      const to = own(game.moleAt().x, game.moleAt().y - 50)
      for (let i = 0; i < 4; i++) {
        const far = ((mole.t * 3 + i * 0.25) % 1)
        g.globalAlpha = blowing * (1 - far * 0.5)
        g.beginPath()
        g.arc(lerp(tip.x, to.x, far), lerp(tip.y, to.y, far) - Math.sin(far * Math.PI) * 30 + (i - 1.5) * 5, 4 - far * 1.5, 0, Math.PI * 2)
        this.fill()
      }
      g.globalAlpha = 1
    }
    this.put(parts.head, neck.x, neck.y, turn)
    // The ear: flapped out, at rest, or clamped down flat.
    const ear = onHead(16, -44)
    const flap = m.ear.x
    this.put(parts.ear, ear.x, ear.y, turn - Math.max(0, flap) * 0.75 + Math.min(0, flap) * -0.3, 1 + Math.max(0, flap) * 0.12, 1 + Math.min(0, flap) * 0.12)
    // The eye is on the cage, and goes up and down with it. A blink is a line, and so is an eye shut against gas.
    const eye = onHead(-26, -40)
    // While it shows the rope it looks at the rope.
    const watched = own(LIFT_ROPE.x, lerp(CAGE_FLOOR - 44 - game.staging.rise * RISE, ROPE_AT.y, showing))
    const gx = watched.x - eye.x, gy = watched.y - eye.y, length = Math.hypot(gx, gy) || 1
    if (through(m.blink) !== null || knotted) {
      g.strokeStyle = CHARCOAL
      g.lineWidth = 2.6
      g.beginPath()
      g.moveTo(eye.x - 7, eye.y)
      g.lineTo(eye.x + 7, eye.y + 1)
      this.stroke()
    } else {
      const wide = 7.5 + m.rattle * 2 + lifted * 1.5 + m.fur * 3
      g.fillStyle = CLAY
      g.beginPath()
      g.arc(eye.x, eye.y, wide, 0, Math.PI * 2)
      this.fill()
      g.fillStyle = CHARCOAL
      g.beginPath()
      g.arc(eye.x + (gx / length) * (wide - 4), eye.y + (gy / length) * (wide - 4), 3.6, 0, Math.PI * 2)
      this.fill()
      g.strokeStyle = CHARCOAL
      g.lineWidth = 2.6
      g.beginPath()
      g.arc(eye.x, eye.y, wide, Math.PI * 1.1, Math.PI * 1.95)
      this.stroke()
    }
    g.restore()
  }

  /** The heads of the painted herd: the one the mole passes under turns down to look at him. */
  private drawHerd(show: Show): void {
    BEASTS.forEach((place, i) => {
      const turned = clamp01(show.cast.beasts[i].x)
      this.put(this.figures!.beast[i], place.x + NECK.x * HERD.scale, HERD.y + NECK.y * HERD.scale, -turned * 0.75 + Math.sin(this.time * 0.6 + i * 2) * 0.03, HERD.scale, HERD.scale)
    })
  }

  /** Hand shapes sprayed where a finger touched the bare wall. They fade. */
  private drawPrints(show: Show): void {
    const g = this.g
    for (const print of show.effects.prints) {
      const t = 1 - print.life / print.length
      g.globalAlpha = Math.min(1, t * 9) * (1 - t * t)
      this.put(this.figures!.print, print.x, print.y, print.turn)
    }
    g.globalAlpha = 1
  }

  /** The gem the finger carries: it lifts under the finger and goes where it goes. */
  /** The rope of a lamp that is off it, in the finger or flying back to it: slack at its hook in the roof of the block. */
  private slackRope(at: number): void {
    const g = this.g, top = corner(at)
    g.strokeStyle = YELLOW_DEEP
    g.lineWidth = 3
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(top.x + CELL / 2, top.y + 1)
    g.quadraticCurveTo(top.x + CELL / 2 - 7, top.y + 14, top.x + CELL / 2 + 3, top.y + 24)
    this.stroke()
  }

  private drawHand(show: Show): void {
    const hand = show.game.hand
    if (!hand) return
    const g = this.g, figures = this.figures!
    // A lamp taken off its rope: the rope stays at its hook in the roof, slack, until the gem is let go.
    if (hand.gem.rest === 'hung') this.slackRope(hand.gem.at)
    g.save()
    g.globalCompositeOperation = 'lighter'
    this.put(figures.shine[hand.gem.colour], hand.x, hand.y - CARRY_UP, 0, 1.2, 1.2)
    g.restore()
    this.put(figures.gem[hand.gem.colour], hand.x, hand.y - CARRY_UP, Math.sin(this.time * 6) * 0.15, 1.25, 1.25)
  }

  /** What an idle child is shown: a glow on a block that can be dug, and then a hand that presses it and holds. */
  private drawGuidance(show: Show): void {
    const guidance = show.guidance
    if (!guidance || (guidance.glow <= 0 && guidance.demo === null)) return
    const g = this.g
    const game = show.game
    if (game.world.mole.at === CAGE && game.mole.mode === 'rest') {
      // He waits in the cage: what glows is the cage's rope, and the one who shows the move is the mammoth, with its trunk.
      if (guidance.glow > 0) {
        g.globalAlpha = guidance.glow * (0.7 + 0.3 * Math.sin(this.time * 3.2))
        this.put(this.figures!.halo, ROPE_AT.x, ROPE_AT.y, 0, 0.6, 0.6)
        g.globalAlpha = 1
      }
      return
    }
    const index = game.suggestion()
    if (index === null) return
    const { c, r } = cellOf(index)
    const mid = centre(c, r)
    if (guidance.glow > 0) {
      g.globalAlpha = guidance.glow * (0.7 + 0.3 * Math.sin(this.time * 3.2))
      this.put(this.figures!.halo, mid.x, mid.y)
    }
    if (guidance.demo !== null) {
      const pose = handPose(guidance.demo, true, this.pose)
      // The hand comes down on the block and stays down, and draws on a little way into the rock, away from the mole.
      const from = show.game.world.mole.at
      const dc = Math.sign(c - colOf(from)), dr = isGrass(from) ? 1 : Math.sign(r - rowOf(from))
      const on = c + dc >= 0 && c + dc < COLS && r + dr >= 0 && r + dr < ROWS ? centre(c + dc, r + dr) : mid
      const x = lerp(mid.x, on.x, pose.travel * 0.7), y = lerp(mid.y, on.y, pose.travel * 0.7) - (1 - pose.press) * 16
      g.globalAlpha = pose.opacity * 0.95
      const squeeze = 1 - pose.press * 0.08
      this.put(this.figures!.hand, x, y, -0.25, squeeze, squeeze)
    }
    g.globalAlpha = 1
  }
}
