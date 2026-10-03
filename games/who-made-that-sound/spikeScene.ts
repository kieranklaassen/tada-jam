import { AT_REST, Figures, GROWN, LITTLE, WIDE, type Pose } from './figures'
import { ASKER, BASKET, EDGE_PEEK, FLOOR, GROUND, HILL_SPOTS, SKYLINE, STAGE, STONE, eggSpots, fit, inView, type Rect } from './stage'
import { PAGE, bounds, cutPiece, lathe, oval, paintSheet, seedFor, soften, stream, type Pt, type Sprite } from './tissue'
import { KINDS, type Kind } from './voices'

// The look spike: the game's real scene at the place `three-eggs`, as a still
// that sways a little, in painted-tissue collage. Nothing here can be played.
// It is here to be looked at before any rule is built on it, and the stages
// after it take the page, the pieces and the figures from it.
//
// What it costs to draw: the page, the hill, the ground and the stone are
// painted into one layer when the surface is sized, every other piece is cut
// once into a sprite, and a frame is that layer and a few dozen sprites.

/** The spike paints the same page every time. */
export const SPIKE_SEED = 0x7155e5

/** The hues that are not a creature's. The ground is the one dark piece, so the pale eggs stand out on it and nothing else has to. */
export const PAPER = { hill: '#56a83f', ground: '#4b362d', egg: '#f6e9cd', stone: '#b7b1c4', basket: '#a9c63b', crack: '#2c2432', white: '#fbf6e9' } as const

/** `kinds=1` in the address lays the six kinds out side by side instead of the scene, to judge their outlines together. */
export function wantsKinds(search: string): boolean {
  return new URLSearchParams(search).get('kinds') === '1'
}

/** The six grown kinds in a row across the page, with the same clear page between each two: where each stands and how tall. */
export function kindsRow(shrink = 0.9): { kind: Kind; x: number; size: number }[] {
  const widths = KINDS.map((kind) => GROWN[kind] * WIDE[kind] * shrink)
  const between = (STAGE.width - widths.reduce((sum, width) => sum + width, 0)) / (KINDS.length + 1)
  let left = between
  return KINDS.map((kind, i) => {
    const x = left + widths[i] / 2
    left += widths[i] + between
    return { kind, x, size: GROWN[kind] * shrink }
  })
}

const SHUT_S = 0.16
/**
 * A blink now and then: 0 with the eyes open, up to 1 and back within `SHUT_S`, once every `every` seconds.
 * `into` is how far into its wait a pair of eyes starts, so that no two blink together; while it is under
 * `every - SHUT_S` the eyes are open at 0 seconds, and the first frame is a plain still.
 */
export function blink(seconds: number, every: number, start = 0): number {
  const into = (seconds + start) % every
  return into > every - SHUT_S ? Math.sin(((into - (every - SHUT_S)) / SHUT_S) * Math.PI) : 0
}

/** One plain egg. Every hide is cut from this one outline and this one sheet, so two hides look alike to the last streak. */
const EGG_CUT = soften(lathe([[-148, 0], [-145, 17], [-130, 32], [-102, 45], [-68, 54], [-40, 55], [-17, 47], [-3, 27], [0, 0]]), 2)
/**
 * The crack in an egg that has been heard: teeth right across the shell at this height, and the top lifted on
 * a hinge at the right like a lid, so that the dark inside opens towards the calling stone.
 */
const CRACK = { at: -90, hinge: 56, lift: 19, tip: 0.17, room: 42 } as const
const TEETH = Array.from({ length: 11 }, (_, i) => [-70 + i * 14, CRACK.at + (i % 2 ? -8 : 8)] as const)
/** Where the two eyes are in the dark, from the egg's foot. */
const PEEK: readonly (readonly [number, number])[] = [[-23, -107], [10, -104]]
/** The calling stone, in shares of its rectangle. */
const SLAB_CUT: readonly Pt[] = [[0.1, 0.04], [0.52, 0], [0.9, 0.06], [1, 0.5], [0.94, 0.96], [0.5, 1], [0.05, 0.94], [0, 0.46]]
const BOWL_CUT = soften([[-75, -86, 1], [75, -86, 1], [68, -44], [46, -10], [20, 0], [-20, 0], [-46, -10], [-68, -44]], 2)

type Props = Record<'egg' | 'heard' | 'white' | 'pupil' | 'rim' | 'bowl', Sprite>
type Look = { drama: number; facet: number; wobble: number; torn?: number }
const SCISSORS: Look = { drama: 1, facet: 11, wobble: 1 }

export class SpikeScene {
  private ctx: CanvasRenderingContext2D
  private figures: Figures
  private layer = document.createElement('canvas')
  private props: Props | null = null
  private sheets = new Map<string, HTMLCanvasElement>()
  private sized = ''
  private kinds: boolean
  private k = 1
  private left = 0
  private top = 0
  private view: Rect = { x: 0, y: 0, w: STAGE.width, h: STAGE.height }
  private count = 0

  constructor(private canvas: HTMLCanvasElement, search: string, private seed = SPIKE_SEED) {
    this.ctx = canvas.getContext('2d')!
    this.figures = new Figures(seed)
    this.kinds = wantsKinds(search)
  }

  /**
   * Cuts one named piece from a sheet of its own. A piece bigger than a small sheet gets one as big as itself,
   * a pixel for each design pixel, painted with a broader brush. A sheet is painted once and kept: a surface
   * that changes size cuts its pieces again and paints nothing. Pieces that name the same sheet (`from`) share it.
   */
  private paper(name: string, hex: string, outline: readonly Pt[], look: Look, from = name): Sprite {
    const box = bounds(outline), across = Math.hypot(box.w, box.h), big = across > 280, seed = seedFor(this.seed, name)
    let sheet = this.sheets.get(from)
    if (!sheet) {
      const side = big ? Math.ceil(across) + 8 : 512
      sheet = paintSheet(hex, seedFor(this.seed, from), side, side, { drama: look.drama, broad: big ? 2.4 : 1 })
      this.sheets.set(from, sheet)
    }
    return cutPiece(sheet, outline, seed, { scale: this.k, spread: big ? this.k : (this.k * 300) / 512, facet: look.facet, wobble: look.wobble, torn: look.torn })
  }

  /** Everything that is painted once for a surface of this size: the layer that does not move, and the props. */
  private lay(width: number, height: number, dpr: number) {
    const { scale, x, y } = fit(width, height), rand = stream(seedFor(this.seed, 'page'))
    this.k = scale * dpr; this.left = x * dpr; this.top = y * dpr; this.view = inView(width, height)
    this.figures.fit(this.k, this.left, this.top)
    const { k, view, layer } = this
    layer.width = this.canvas.width; layer.height = this.canvas.height
    const page = layer.getContext('2d')!
    page.fillStyle = PAGE
    page.fillRect(0, 0, layer.width, layer.height)
    // The page is paper, not a screen: a few pale fibres, too faint to be a pattern.
    page.strokeStyle = '#7d705c'
    page.lineWidth = Math.max(1, k * 0.5)
    for (let i = 0; i < (layer.width * layer.height) / 2600; i++) {
      const fx = rand() * layer.width, fy = rand() * layer.height, turn = rand() * Math.PI, long = (2 + rand() * 7) * k
      page.globalAlpha = 0.025 + rand() * 0.05
      page.beginPath()
      page.moveTo(fx, fy)
      page.lineTo(fx + Math.cos(turn) * long, fy + Math.sin(turn) * long)
      page.stroke()
    }
    page.globalAlpha = 1
    page.setTransform(k, 0, 0, k, this.left, this.top)
    const put = (sprite: Sprite) => page.drawImage(sprite.canvas, sprite.x, sprite.y, sprite.w, sprite.h)
    if (!this.kinds) put(this.paper('hill', PAPER.hill, soften(SKYLINE, 2), { drama: 0.85, facet: 5, wobble: 2.4, torn: 5 }))
    // The ground is torn straight across by hand: its long edges wander a little and it runs off the page at both ends.
    const ends = [view.x - 40, view.x + view.w + 40], stops = Math.ceil(view.w / 130)
    const edge = (at: number, back: boolean) => Array.from({ length: stops + 1 }, (_, i) => {
      const along = back ? 1 - i / stops : i / stops
      return [ends[0] + (ends[1] - ends[0]) * along, at + (rand() - 0.5) * 9] as const
    })
    // Plain, as the working surface has to be: the same brush with nearly all of its drama taken out.
    put(this.paper('ground', PAPER.ground, [...edge(GROUND.top, false), ...edge(GROUND.bottom, true)], { drama: 0.3, facet: 5, wobble: 1.8, torn: 4 }))
    if (!this.kinds) {
      // A slab with a flat top and broken corners: a rounder stone under a figure would read as its shadow.
      const slab = SLAB_CUT.map(([sx, sy]) => [STONE.x + sx * STONE.w + (rand() - 0.5) * 8, STONE.y + sy * STONE.h + (rand() - 0.5) * 5] as const)
      put(this.paper('stone', PAPER.stone, soften(slab, 1), { drama: 0.8, facet: 6, wobble: 1.6, torn: 3 }))
    }
    const bowl = this.paper('bowl', PAPER.basket, BOWL_CUT, SCISSORS)
    // The bowl is woven: leaves of a second and a third green laid slantwise over it, and trimmed to its outline.
    const weave = bowl.canvas.getContext('2d')!
    weave.globalCompositeOperation = 'source-atop'
    for (let i = 0; i < 7; i++) {
      const leaf = this.paper(`leaf ${i}`, i % 2 ? '#7fa52e' : '#c3d64f', soften(lathe([[-62, 0, 1], [-30, 10], [0, 12], [30, 10], [62, 0, 1]]), 2), { ...SCISSORS, facet: 9 }, `leaves ${i % 2}`)
      const slant = (i % 2 ? -1 : 1) * (0.5 + rand() * 0.2)
      weave.setTransform(Math.cos(slant) * k, Math.sin(slant) * k, -Math.sin(slant) * k, Math.cos(slant) * k, (-bowl.x - 66 + i * 22) * k, (-bowl.y - 44 + (rand() - 0.5) * 10) * k)
      weave.drawImage(leaf.canvas, leaf.x, leaf.y, leaf.w, leaf.h)
    }
    const egg = this.paper('egg', PAPER.egg, EGG_CUT, { ...SCISSORS, drama: 0.35 })
    this.props = {
      egg, heard: this.cracked(egg),
      white: this.paper('white', PAPER.white, soften(oval(12, 12.5), 2), { drama: 0.4, facet: 5, wobble: 0.8 }),
      pupil: this.paper('pupil', PAPER.crack, soften(oval(6, 6.4), 2), { drama: 0.4, facet: 4, wobble: 0.5 }),
      rim: this.paper('rim', '#6f9327', soften(oval(72, 13, 0, -84), 2), SCISSORS),
      bowl,
    }
  }

  /** A heard egg: the same egg in two pieces, torn along the teeth, with the dark of its inside between them. */
  private cracked(egg: Sprite): Sprite {
    const k = this.k, canvas = document.createElement('canvas')
    canvas.width = egg.canvas.width; canvas.height = egg.canvas.height + Math.round(CRACK.room * k)
    const ctx = canvas.getContext('2d')!
    const half = (top: boolean, lifted: boolean) => {
      ctx.save()
      ctx.setTransform(k, 0, 0, k, -egg.x * k, canvas.height - (egg.y + egg.h) * k)
      if (lifted) { ctx.translate(CRACK.hinge, CRACK.at - CRACK.lift); ctx.rotate(CRACK.tip); ctx.translate(-CRACK.hinge, -CRACK.at) }
      ctx.beginPath()
      // The dark reaches a little under the lower shell, so no pale seam shows along the teeth.
      TEETH.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + (top && !lifted ? 3 : 0)) : ctx.moveTo(x, y)))
      ctx.lineTo(80, top ? -400 : 40)
      ctx.lineTo(-80, top ? -400 : 40)
      ctx.clip()
      ctx.drawImage(egg.canvas, egg.x, egg.y, egg.w, egg.h)
      ctx.restore()
    }
    half(true, false)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = PAPER.crack
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'source-over'
    half(false, false)
    half(true, true)
    return { canvas, x: egg.x, y: egg.y + egg.h - canvas.height / k, w: egg.w, h: canvas.height / k }
  }

  private put(sprite: Sprite, x: number, y: number, squash = 1) {
    this.ctx.setTransform(this.k, 0, 0, this.k * squash, x * this.k + this.left, y * this.k + this.top)
    this.ctx.drawImage(sprite.canvas, sprite.x, sprite.y, sprite.w, sprite.h)
    this.count++
  }

  private figure(kind: Kind, x: number, y: number, size: number, pose: Partial<Pose>) {
    this.count += this.figures.draw(this.ctx, kind, x, y, size, { ...AT_REST, ...pose })
  }

  /**
   * Draws the frame for `seconds` on the attended clock and returns how many
   * sprites that took. `width` and `height` are the surface in CSS pixels;
   * the canvas has been sized by the Mount.
   */
  draw(width: number, height: number, dpr: number, seconds: number): number {
    if (width <= 0 || height <= 0) return 0
    const sized = `${this.canvas.width} ${this.canvas.height} ${width} ${height} ${dpr}`
    if (sized !== this.sized || !this.props) { this.lay(width, height, dpr); this.sized = sized }
    const { ctx, view } = this, props = this.props!, sway = (rate: number, late = 0) => Math.sin(seconds * rate + late)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(this.layer, 0, 0)
    this.count = 1
    if (this.kinds) {
      kindsRow().forEach(({ kind, x, size }, i) => {
        this.figure(kind, x, GROUND.top + 12, size, { blink: blink(seconds, 4 + i * 0.7, i) })
        this.figure(kind, x, FLOOR, size * LITTLE, { wings: 1, reach: i % 3 === 0 ? 0 : 1, turn: i % 2 ? 1 : -1 })
      })
    } else {
      // On the hill: a pip with its little one on its head, and a little dooo by itself.
      const [, family, alone] = HILL_SPOTS, pipX = family.x + family.w / 2, pipY = family.y + family.h, tip = sway(0.8) * 0.02
      this.figure('pip', pipX, pipY, GROWN.pip, { turn: -0.5, lean: tip, blink: blink(seconds, 4.6, 1.2) })
      this.figure('pip', pipX + 3 - tip * 100, pipY - GROWN.pip * 0.9, GROWN.pip * LITTLE, { turn: -0.7, lean: -tip * 2, wings: 0.25 + sway(0.8) * 0.1, blink: blink(seconds, 3.9, 2.5) })
      this.figure('dooo', alone.x + alone.w / 2, alone.y + alone.h, GROWN.dooo * LITTLE, { turn: -0.6, lean: sway(0.6, 2) * 0.025, blink: blink(seconds, 5.3, 3.1) })
      // The one who asks: both wings out to the eggs and empty, one ear turned to them, eyes on them.
      this.figure('hoom', ASKER.x + ASKER.w / 2, ASKER.y + ASKER.h, GROWN.hoom, { wings: 1 + sway(1.1) * 0.035, reach: 1, turn: 1, lean: 0.045 + sway(0.7) * 0.012, blink: blink(seconds, 5, 0.4) })
      // Three hides, all one sprite. The middle one has been heard: a crack, and two eyes in the dark of it.
      eggSpots(3).forEach((egg, i) => {
        const x = egg.x + egg.w / 2
        this.put(i === 1 ? props.heard : props.egg, x, FLOOR)
        if (i !== 1) return
        const open = 1 - blink(seconds, 3.3, 0.9) * 0.9
        for (const [ex, ey] of PEEK) { this.put(props.white, x + ex, FLOOR + ey, open); this.put(props.pupil, x + ex - 3, FLOOR + ey + 1, open) }
      })
      const basket = BASKET.x + BASKET.w / 2, floor = BASKET.y + BASKET.h
      this.put(props.rim, basket, floor)
      this.put(props.egg, basket, floor - 34)
      this.put(props.bowl, basket, floor)
      // The one who waits rocks on its feet at the edge, half in the page, and looks at the row.
      this.figure('wheep', view.x + view.w - EDGE_PEEK, FLOOR, GROWN.wheep, { turn: -1, lean: -0.13 + sway(1.5) * 0.03, blink: blink(seconds, 4.2, 2) })
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    return this.count
  }
}
