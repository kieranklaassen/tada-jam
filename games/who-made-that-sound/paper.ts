import { Figures } from './figures'
import { GROUND, HILL_BEHIND, SKYLINE, STONE, fit, inView, type Rect, STAGE } from './stage'
import { PAGE, bounds, cutPiece, lathe, oval, paintSheet, seedFor, soften, stream, type Pt, type Sprite } from './tissue'

// The page and the pieces that are not creatures: what is painted once for a
// surface of a given size. The page, the hill and the ground go into one
// layer that never moves; every other piece is cut once into a sprite; and a
// frame is that layer and a few dozen sprites. The toy and the look spike
// both draw from here.

/** The hues that are not a creature's. The ground is the one dark piece, so the pale eggs stand out on it and nothing else has to. */
export const PAPER = { hill: '#56a83f', ground: '#4b362d', egg: '#f6e9cd', stone: '#b7b1c4', basket: '#a9c63b', crack: '#2c2432', white: '#fbf6e9', glow: '#ffe98f', leaves: '#c9a66b', nest: '#b98a4a' } as const

/** One plain egg. Every hide is cut from this one outline and this one sheet, so two hides look alike to the last streak. */
const EGG_CUT = soften(lathe([[-148, 0], [-145, 17], [-130, 32], [-102, 45], [-68, 54], [-40, 55], [-17, 47], [-3, 27], [0, 0]]), 2)
/**
 * The crack in an egg that has been heard: teeth right across the shell at this height, and the top lifted on
 * a hinge at the right like a lid, so that the dark inside opens towards the calling stone.
 */
export const CRACK = { at: -90, hinge: 56, lift: 19, tip: 0.17, room: 42 } as const
const TEETH = Array.from({ length: 11 }, (_, i) => [-70 + i * 14, CRACK.at + (i % 2 ? -8 : 8)] as const)
/** Where the two eyes are in the dark, from the egg's foot. */
export const PEEK: readonly (readonly [number, number])[] = [[-23, -107], [10, -104]]
/**
 * The calling stone, in shares of its rectangle: a lump of rock with a shoulder on the left and a long slope on the
 * right, and no two edges parallel. A slab with a straight top and bottom is a bar when nobody stands on it.
 */
const SLAB_CUT: readonly Pt[] = [[0.04, 0.5], [0.13, 0.12], [0.36, 0], [0.6, 0.1], [0.72, 0.3], [0.93, 0.42], [1, 0.72], [0.86, 0.97], [0.5, 1], [0.16, 0.9], [0, 0.74]]
const BOWL_CUT = soften([[-75, -86, 1], [75, -86, 1], [68, -44], [46, -10], [20, 0], [-20, 0], [-46, -10], [-68, -44]], 2)
/** A heap of dry leaves, as wide as an egg and no wider, so that heaps in a full row stand as far apart as eggs do: the hide that says nothing about who is in it but by sound. */
const PILE_CUT = soften([[-56, 0, 1], [-53, -30], [-38, -62], [-18, -86], [3, -98], [24, -88], [41, -62], [53, -28], [56, 0, 1]], 2)
/** Where the two eyes peek out of a heap that has been heard, from its foot, and the dark gap they peek through. */
export const PILE_PEEK = { x: -3, y: -52 } as const

/** A hand with one finger out, pointing up at what it taps: the ghost hand of the idle ladder. Its fingertip is its 0,0. */
const HAND_CUT = soften([[0, 0], [9, 6], [11, 44], [30, 46], [40, 58], [40, 92], [28, 112], [-12, 112], [-24, 96], [-26, 66], [-12, 52], [-11, 6]], 2)

export type Props = Record<'egg' | 'top' | 'bottom' | 'dark' | 'heard' | 'white' | 'pupil' | 'rim' | 'bowl' | 'nest' | 'nestRim' | 'stone' | 'glow' | 'hand' | 'scrap' | 'fleck' | 'blade' | 'chip' | 'pile' | 'slit' | 'leaf', Sprite>
type Look = { drama: number; facet: number; wobble: number; torn?: number }
const SCISSORS: Look = { drama: 1, facet: 11, wobble: 1 }

/** How a piece is laid down: stretched, turned about its own 0,0, and let show through. */
export type Lay = { sx?: number; sy?: number; turn?: number; alpha?: number }

export class Paper {
  readonly layer = document.createElement('canvas')
  readonly figures: Figures
  props: Props | null = null
  /** Device pixels for each design pixel, and where the design's 0,0 lands on the surface. */
  k = 1
  left = 0
  top = 0
  /** The part of the page the surface shows, in design pixels. */
  view: Rect = { x: 0, y: 0, w: STAGE.width, h: STAGE.height }
  private sheets = new Map<string, HTMLCanvasElement>()
  private sized = ''

  constructor(private canvas: HTMLCanvasElement, private seed: number, private scene: { hill: boolean; stone: boolean }) {
    this.figures = new Figures(seed)
  }

  /**
   * Cuts one named piece from a sheet of its own. A piece bigger than a small sheet gets one as big as itself,
   * a pixel for each design pixel, painted with a broader brush. A sheet is painted once and kept: a surface
   * that changes size cuts its pieces again and paints nothing. Pieces that name the same sheet (`from`) share it.
   */
  private paper(name: string, hex: string, outline: readonly Pt[], look: Look, from = name, alpha?: number): Sprite {
    const box = bounds(outline), across = Math.hypot(box.w, box.h), big = across > 280, seed = seedFor(this.seed, name)
    let sheet = this.sheets.get(from)
    if (!sheet) {
      const side = big ? Math.ceil(across) + 8 : 512
      sheet = paintSheet(hex, seedFor(this.seed, from), side, side, { drama: look.drama, broad: big ? 2.4 : 1 })
      this.sheets.set(from, sheet)
    }
    return cutPiece(sheet, outline, seed, { scale: this.k, spread: big ? this.k : (this.k * 300) / 512, facet: look.facet, wobble: look.wobble, torn: look.torn, alpha })
  }

  /** Makes everything ready for a surface of this size and pixel ratio. Returns whether anything had to be painted or cut again. */
  fit(width: number, height: number, dpr: number): boolean {
    const sized = `${this.canvas.width} ${this.canvas.height} ${width} ${height} ${dpr}`
    if (sized === this.sized && this.props) return false
    this.sized = sized
    this.lay(width, height, dpr)
    return true
  }

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
    if (this.scene.hill) {
      // Scenery, and plainly that: a second, paler sheet torn to the same dome lies behind the hill and shows
      // along its left and its top, and a row of low grassy mounds, each one torn piece, stands at its foot.
      put(this.paper('hill behind', '#a9d98a', soften(SKYLINE.map(([hx, hy]) => [hx + HILL_BEHIND.dx, hy + HILL_BEHIND.dy] as const), 2), { drama: 0.5, facet: 5, wobble: 2.4, torn: 5 }))
      put(this.paper('hill', PAPER.hill, soften(SKYLINE, 2), { drama: 0.85, facet: 5, wobble: 2.4, torn: 5 }))
      const foot = GROUND.top + 14
      for (let i = 0; i < 8; i++) {
        const at = 130 + i * 132 + (rand() - 0.5) * 36, wide = 56 + rand() * 36, tall = 40 + rand() * 24
        put(this.paper(`mound ${i}`, i % 2 ? '#3f9335' : '#7cc653', soften([[at - wide, foot, 1], [at - wide * 0.8, foot - tall * 0.55], [at - wide * 0.3, foot - tall], [at + wide * 0.35, foot - tall * 0.9], [at + wide * 0.85, foot - tall * 0.5], [at + wide, foot, 1]], 2), { drama: 0.6, facet: 5, wobble: 1.8, torn: 3 }))
      }
    }
    // The ground is torn straight across by hand: its long edges wander a little and it runs off the page at both ends.
    const ends = [view.x - 40, view.x + view.w + 40], stops = Math.ceil(view.w / 130)
    const edge = (at: number, back: boolean) => Array.from({ length: stops + 1 }, (_, i) => {
      const along = back ? 1 - i / stops : i / stops
      return [ends[0] + (ends[1] - ends[0]) * along, at + (rand() - 0.5) * 9] as const
    })
    // Plain, as the working surface has to be: the same brush with nearly all of its drama taken out.
    put(this.paper('ground', PAPER.ground, [...edge(GROUND.top, false), ...edge(GROUND.bottom, true)], { drama: 0.3, facet: 5, wobble: 1.8, torn: 4 }))
    // A lump of rock, wide enough to stand on: a round stone under a figure would read as its shadow. A scene
    // that always has it paints it into the layer; the game lays it down as a piece once someone has come to ask.
    const slab = SLAB_CUT.map(([sx, sy]) => [STONE.x + sx * STONE.w + (rand() - 0.5) * 8, STONE.y + sy * STONE.h + (rand() - 0.5) * 5] as const)
    const stone = this.paper('stone', PAPER.stone, soften(slab, 1), { drama: 0.8, facet: 6, wobble: 1.6, torn: 3 })
    if (this.scene.stone) put(stone)
    const bowl = this.paper('bowl', PAPER.basket, BOWL_CUT, SCISSORS)
    // The bowl is made of leaves of a second and a third green, laid over it all slanting the same way like
    // shingles and trimmed to its outline. No two of them cross: two bars that cross are a sign.
    const weave = bowl.canvas.getContext('2d')!
    weave.globalCompositeOperation = 'source-atop'
    for (let i = 0; i < 7; i++) {
      const leaf = this.paper(`leaf ${i}`, i % 2 ? '#7fa52e' : '#c3d64f', soften(lathe([[-62, 0, 1], [-30, 10], [0, 12], [30, 10], [62, 0, 1]]), 2), { ...SCISSORS, facet: 9 }, `leaves ${i % 2}`)
      const slant = 0.5 + rand() * 0.2
      weave.setTransform(Math.cos(slant) * k, Math.sin(slant) * k, -Math.sin(slant) * k, Math.cos(slant) * k, (-bowl.x - 66 + i * 22) * k, (-bowl.y - 44 + (rand() - 0.5) * 10) * k)
      weave.drawImage(leaf.canvas, leaf.x, leaf.y, leaf.w, leaf.h)
    }
    // A heap of dry leaves: one plain mound with leaves of two more tans laid over it and trimmed to its outline.
    // They all lie the same way, each along the next, so that no two of them cross as two bars would.
    const dry = (i: number) => this.paper(`dry ${i}`, i % 2 ? '#a9864e' : '#dcc291', soften(lathe([[-30, 0, 1], [-14, 8], [0, 9], [14, 8], [30, 0, 1]]), 2), { ...SCISSORS, facet: 7, drama: 0.5 }, `dry ${i % 2}`)
    const pile = this.paper('pile', PAPER.leaves, PILE_CUT, { ...SCISSORS, drama: 0.4 })
    const heap = pile.canvas.getContext('2d')!
    heap.globalCompositeOperation = 'source-atop'
    for (let i = 0; i < 12; i++) {
      const leaf = dry(i), slant = 0.12 + (rand() - 0.5) * 0.06
      heap.setTransform(Math.cos(slant) * k, Math.sin(slant) * k, -Math.sin(slant) * k, Math.cos(slant) * k, (-pile.x - 44 + (i % 6) * 17.5 + (rand() - 0.5) * 8) * k, (-pile.y - 16 - Math.floor(i / 6) * 34 - rand() * 22) * k)
      heap.drawImage(leaf.canvas, leaf.x, leaf.y, leaf.w, leaf.h)
    }
    // The nest a clutch comes in: the same shape as the basket, in twig brown with darker and paler twigs across
    // it, so that nobody takes the one for the other when they stand side by side.
    const nest = this.paper('nest', PAPER.nest, BOWL_CUT, SCISSORS)
    const twigs = nest.canvas.getContext('2d')!
    twigs.globalCompositeOperation = 'source-atop'
    for (let i = 0; i < 14; i++) {
      const twig = this.paper(`twig ${i}`, i % 2 ? '#7d5a2c' : '#dab677', soften(lathe([[-58, 0, 1], [0, 3.2], [58, 0, 1]]), 1), { ...SCISSORS, facet: 9, drama: 0.5 }, `twigs ${i % 2}`)
      // All but parallel, and slanting the other way from the basket's leaves: twigs that lie along each other never cross as two bars do.
      const slant = -0.3 + (rand() - 0.5) * 0.06
      twigs.setTransform(Math.cos(slant) * k, Math.sin(slant) * k, -Math.sin(slant) * k, Math.cos(slant) * k, (-nest.x + (rand() - 0.5) * 60) * k, (-nest.y - 78 + i * 6 + (rand() - 0.5) * 4) * k)
      twigs.drawImage(twig.canvas, twig.x, twig.y, twig.w, twig.h)
    }
    const egg = this.paper('egg', PAPER.egg, EGG_CUT, { ...SCISSORS, drama: 0.35 })
    const top = this.half(egg, true), bottom = this.half(egg, false)
    this.props = {
      egg, top, bottom, dark: this.inked(top), heard: this.cracked(egg, top, bottom),
      white: this.paper('white', PAPER.white, soften(oval(12, 12.5), 2), { drama: 0.4, facet: 5, wobble: 0.8 }),
      pupil: this.paper('pupil', PAPER.crack, soften(oval(6, 6.4), 2), { drama: 0.4, facet: 4, wobble: 0.5 }),
      rim: this.paper('rim', '#6f9327', soften(oval(72, 13, 0, -84), 2), SCISSORS),
      bowl,
      nest, nestRim: this.paper('nestRim', '#7d5a2c', soften(oval(72, 13, 0, -84), 2), SCISSORS),
      stone,
      // What can be touched next rests on a pale torn piece that shows through: no light, only paper.
      glow: this.paper('glow', PAPER.glow, soften(oval(82, 104, 0, -74), 2), { drama: 0.45, facet: 7, wobble: 2, torn: 4 }),
      hand: this.paper('hand', PAPER.white, HAND_CUT, { drama: 0.5, facet: 8, wobble: 0.9 }, 'hand', 0.94),
      pile,
      slit: this.paper('slit', PAPER.crack, soften(oval(33, 15), 2), { drama: 0.4, facet: 6, wobble: 1 }),
      leaf: dry(0),
      scrap: this.paper('scrap', PAPER.egg, soften([[-9, -6, 1], [8, -8, 1], [11, 5, 1], [-6, 9, 1]], 1), { drama: 0.35, facet: 5, wobble: 1.4 }, 'egg'),
      // What hops up under a finger that lands on nothing to tap: a scrap of brown paper that shows on the white
      // page and on the dark ground, a bright green leaf on the hill, a pale chip on the stone. Each is a small
      // broad piece: three thin blades side by side would be three strokes, and strokes can be read as a sign.
      fleck: this.paper('fleck', '#d1a955', soften([[-10, -7, 1], [9, -9, 1], [12, 6, 1], [-7, 10, 1]], 1), { drama: 0.4, facet: 5, wobble: 1.4 }),
      blade: this.paper('blade', '#d3ee6b', soften([[-10, -5, 1], [4, -9], [12, -1, 1], [5, 8], [-8, 6]], 2), { drama: 0.4, facet: 5, wobble: 1 }),
      chip: this.paper('chip', '#eeebf6', soften([[-7, -5, 1], [6, -7, 1], [9, 3, 1], [0, 8, 1], [-8, 4, 1]], 1), { drama: 0.3, facet: 4, wobble: 1 }),
    }
  }

  /** One half of the egg, torn along the teeth, on a canvas the size of the whole egg so that the two halves lie where they were. */
  private half(egg: Sprite, top: boolean): Sprite {
    const k = this.k, canvas = document.createElement('canvas')
    canvas.width = egg.canvas.width; canvas.height = egg.canvas.height
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(k, 0, 0, k, -egg.x * k, -egg.y * k)
    ctx.beginPath()
    TEETH.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.lineTo(80, top ? -400 : 40)
    ctx.lineTo(-80, top ? -400 : 40)
    ctx.clip()
    ctx.drawImage(egg.canvas, egg.x, egg.y, egg.w, egg.h)
    return { canvas, x: egg.x, y: egg.y, w: egg.w, h: egg.h }
  }

  /** The dark of the inside: the top half's own shape, a little lower so that no pale seam shows along the teeth. */
  private inked(top: Sprite): Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = top.canvas.width; canvas.height = top.canvas.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(top.canvas, 0, Math.round(3 * this.k))
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = PAPER.crack
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    return { canvas, x: top.x, y: top.y, w: top.w, h: top.h }
  }

  /** A heard egg as one still piece, for a scene that does not move its lid: the dark, the lower shell, and the top lifted on its hinge. */
  private cracked(egg: Sprite, top: Sprite, bottom: Sprite): Sprite {
    const k = this.k, canvas = document.createElement('canvas'), room = Math.round(CRACK.room * k)
    canvas.width = egg.canvas.width; canvas.height = egg.canvas.height + room
    const ctx = canvas.getContext('2d')!
    const base = (lifted: boolean) => {
      ctx.setTransform(k, 0, 0, k, -egg.x * k, room - egg.y * k)
      if (lifted) { ctx.translate(CRACK.hinge, CRACK.at - CRACK.lift); ctx.rotate(CRACK.tip); ctx.translate(-CRACK.hinge, -CRACK.at) }
    }
    base(false)
    ctx.drawImage(this.inked(top).canvas, egg.x, egg.y, egg.w, egg.h)
    ctx.drawImage(bottom.canvas, egg.x, egg.y, egg.w, egg.h)
    base(true)
    ctx.drawImage(top.canvas, egg.x, egg.y, egg.w, egg.h)
    return { canvas, x: egg.x, y: egg.y - room / k, w: egg.w, h: canvas.height / k }
  }

  /** Sets the surface up so that what is drawn next has its 0,0 at `x`, `y` of the design, stretched and turned about that point. Changes the context's transform and alpha. */
  at(ctx: CanvasRenderingContext2D, x: number, y: number, lay: Lay = {}) {
    const { sx = 1, sy = 1, turn = 0, alpha = 1 } = lay, cos = Math.cos(turn) * this.k, sin = Math.sin(turn) * this.k
    ctx.globalAlpha = alpha
    ctx.setTransform(cos * sx, sin * sx, -sin * sy, cos * sy, x * this.k + this.left, y * this.k + this.top)
  }

  /** Lays a piece on the surface with its own 0,0 at `x`, `y` of the design. */
  put(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, lay: Lay = {}) {
    this.at(ctx, x, y, lay)
    ctx.drawImage(sprite.canvas, sprite.x, sprite.y, sprite.w, sprite.h)
  }
}
