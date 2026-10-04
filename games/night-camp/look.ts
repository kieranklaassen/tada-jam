import { FIGURE_SCALE, MAP_SEED, TERRAIN, boardFor, type Board, type Point } from './board'
import type { GameFrame } from './frame'
import { PAPER, SHADOW, TAU, WATER_LINE, at, box, camper, clamp01, disc, dog, eyePair, fireRing, frog, ink, kettle, line, mix, moth, mule, owl, poly, raccoonFigure, smooth, tent, tentInks, type Ctx } from './lookFigures'
import { paintKit, paintTop } from './lookKit'
import { paintShows } from './lookShows'
import { seeded } from './terrain'
import { SITES } from './world'

// The view of the game's map, figures and night, in the look "Survey map and
// field kit", painted every frame from the board of a site and one GameFrame.
// It holds no state beyond its cached layers, so a frame painted twice is the
// same picture, and it draws each thing where the board (board.ts) says it
// lies and nowhere else.
//
// A frame is laid down in this order:
//   the map       a printed sheet seen from straight above, painted once per
//                 size into a cached layer. It never moves.
//   the camp      the site's own tents and campers, the fire, the kettle, the
//                 dog and the frog: the map's symbols come alive (lookFigures.ts).
//   the night     one flat blue film over the map inside the neat line,
//                 multiplied, with a clean round hole at each light; cached, and
//                 rebuilt only when a hole moves. Then what lives in the dark:
//                 eyes, raccoons, moths, the owl.
//   the fold      the folded-over edge with the mule on it, and its corner
//                 as far as it is pulled.
//   the kit       everything a hand can pick up or set (lookKit.ts), then the
//                 shows of the wrong uses (lookShows.ts), then what lies over
//                 everything (lookKit.ts).
//   the turn      while the camp is packed, the back of the sheet sweeping
//                 across the whole surface, over everything else.
//
// No word, letter or numeral is drawn here, and no text call is made.

export type LookOptions = {
  /** The night film at full strength whatever the frame says: for looking at the night by itself. */
  night?: boolean
}
export type CanvasFactory = () => HTMLCanvasElement

// The map's printing inks.
const PAPER_BACK = '#f8f3e6'
const CONTOUR = '#b98a55'
const CONTOUR_INDEX = '#9c6a36'
const WOOD = '#d5e3ae'
const TREE = '#6f9150'
const WATER_FILL = '#c3e1ee'
const GRID = '#5b6f86'
const NEAT = '#4b3a2b'
const FILM = '#4a5c9c'

// A wobbly closed shape for woodland and clearings: a circle whose radius swells and shrinks a little as it goes round.
type Blob = { x: number; y: number; rx: number; ry: number; amp: number[]; phase: number[] }

function makeBlob(next: () => number, x: number, y: number, rx: number, ry: number, wobble = 0.1): Blob {
  const amp: number[] = [], phase: number[] = []
  for (let k = 0; k < 5; k++) { amp.push((wobble * (0.5 + next())) / (k + 1.2)); phase.push(next() * TAU) }
  return { x, y, rx, ry, amp, phase }
}
function blobRadius(blob: Blob, angle: number): number {
  let r = 1
  for (let k = 0; k < blob.amp.length; k++) r += blob.amp[k] * Math.sin((k + 2) * angle + blob.phase[k])
  return r
}
function inBlob(blob: Blob, x: number, y: number): boolean {
  const dx = (x - blob.x) / blob.rx, dy = (y - blob.y) / blob.ry
  return Math.hypot(dx, dy) < blobRadius(blob, Math.atan2(dy, dx))
}
function traceBlob(ctx: Ctx, blob: Blob, sx: number, sy: number) {
  for (let i = 0; i <= 96; i++) {
    const angle = (i / 96) * TAU, r = blobRadius(blob, angle)
    const x = (blob.x + Math.cos(angle) * r * blob.rx) * sx, y = (blob.y + Math.sin(angle) * r * blob.ry) * sy
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

export class Look {
  /** How many times the cached map has been painted: once per size. */
  mapPaints = 0
  /** How many times the cached night film has been painted: once each time a hole of light moves. */
  filmPaints = 0
  private map: HTMLCanvasElement | null = null
  private film: HTMLCanvasElement | null = null
  private key = ''
  private filmKey = ''
  private draws = 0
  private readonly makeCanvas: CanvasFactory

  constructor(makeCanvas?: CanvasFactory) {
    // The offscreen layers are made on first paint, never at load, so this module imports where there is no document.
    this.makeCanvas = makeCanvas ?? (() => document.createElement('canvas'))
  }

  /**
   * Paints one frame. `width` and `height` are the surface in CSS pixels and `dpr` its pixel ratio. With no board
   * or no frame only the bare map is painted. Returns how many sprites and figures were drawn, the kit's and the
   * shows' among them.
   */
  paint(ctx: Ctx, width: number, height: number, dpr: number, board: Board | null, frame: GameFrame | null, opts: LookOptions = {}): number {
    if (!(width > 0) || !(height > 0) || !(dpr > 0)) return 0
    const pw = Math.round(width * dpr), ph = Math.round(height * dpr)
    const key = `${width}x${height}@${dpr}`
    if (!this.map || key !== this.key) {
      this.map = this.map ?? this.makeCanvas()
      this.map.width = pw; this.map.height = ph
      const layer = this.map.getContext('2d')!
      layer.setTransform(dpr, 0, 0, dpr, 0, 0)
      // The sheet is the same at every site: the fire, the neat line and the folded edge lie where any board of this size puts them.
      this.paintMap(layer, boardFor(width, height, SITES.meadow[0]), dpr)
      this.key = key
      this.filmKey = ''
      this.mapPaints++
    }
    const home = () => { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1 }
    this.draws = 0
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.drawImage(this.map, 0, 0)
    this.draws++
    home()
    if (!board || !frame) return this.draws

    const packing = clamp01(frame.fold.packing)
    this.paintStream(ctx, board, frame.stream)
    this.paintCamp(ctx, board, frame, packing)
    const strength = Math.max(clamp01(frame.night.film), opts.night === true ? 1 : 0)
    if (strength > 0) {
      // Where the light is: a round hole in the film at the fire and at each lantern that burns.
      const holes: number[] = []
      if (frame.blaze.lit) holes.push(Math.round(board.fire.x), Math.round(board.fire.y), Math.round(frame.blaze.reach))
      for (const lamp of frame.lanterns) if (lamp.lit) holes.push(Math.round(lamp.x), Math.round(lamp.y), Math.round(lamp.reach))
      const filmKey = `${key}|${holes.join(',')}`
      if (!this.film || this.filmKey !== filmKey) {
        this.film = this.film ?? this.makeCanvas()
        if (this.film.width !== pw || this.film.height !== ph) { this.film.width = pw; this.film.height = ph }
        const layer = this.film.getContext('2d')!
        layer.setTransform(dpr, 0, 0, dpr, 0, 0)
        this.paintFilm(layer, board, holes)
        this.filmKey = filmKey
        this.filmPaints++
      }
      // The one other full-surface composite of a frame. Its strength is how far the night has come down.
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = strength
      ctx.drawImage(this.film, 0, 0)
      home()
      this.draws++
    }
    this.paintNight(ctx, board, frame, strength)
    this.paintFold(ctx, board, frame, packing)
    // Packing up, the kit slides to the folded edge and goes under the sheet as it turns.
    ctx.translate(kitSlide(board, packing), 0)
    this.draws += paintKit(ctx, board, frame, { night: strength >= 0.5 })
    home()
    this.draws += paintShows(ctx, board, frame)
    home()
    this.draws += paintTop(ctx, board, frame)
    home()
    if (packing > 0 && packing < 1) this.paintTurn(ctx, board, frame, packing)
    return this.draws
  }

  // --- The map: painted once per size ---------------------------------------

  private paintMap(ctx: Ctx, place: Board, dpr: number) {
    const w = place.w, h = place.h, u = place.u, terrain = TERRAIN, next = seeded(MAP_SEED + 1)
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h)
    // Paper fibres: short pale and dark flecks, far too faint to read as marks.
    for (let i = 0; i < 1500; i++) {
      const x = next() * w, y = next() * h, len = (2 + next() * 6) * u, turn = next() * TAU
      line(ctx, x, y, x + Math.cos(turn) * len, y + Math.sin(turn) * len, next() < 0.5 ? 'rgba(120, 96, 60, 0.06)' : 'rgba(255, 255, 255, 0.4)', 0.7 * u)
    }

    // Hill shading: one soft layer read from the height function, light from the top left.
    const gw = 160, gh = Math.max(2, Math.round((gw * h) / w))
    const small = this.makeCanvas()
    small.width = gw; small.height = gh
    const sctx = small.getContext('2d')!
    const image = sctx.createImageData(gw, gh)
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const s = terrain.shade((i + 0.5) / gw, (j + 0.5) / gh), o = (j * gw + i) * 4
      const lit = s > 0, amount = Math.min(1, Math.abs(s) * 1.5)
      image.data[o] = lit ? 255 : 118; image.data[o + 1] = lit ? 252 : 98; image.data[o + 2] = lit ? 240 : 78
      image.data[o + 3] = amount * (lit ? 34 : 74)
    }
    sctx.putImageData(image, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(small, 0, 0, gw, gh, 0, 0, w, h)

    // Woodland: a flat green tint, printed over the shading, with the camp's clearing left bare.
    const woods = [
      makeBlob(next, 0.13, 0.2, 0.25, 0.33), makeBlob(next, 0.38, 0.05, 0.2, 0.13), makeBlob(next, 0.08, 0.5, 0.12, 0.1),
      makeBlob(next, 0.57, 0.5, 0.1, 0.085), makeBlob(next, 0.8, 0.37, 0.085, 0.1), makeBlob(next, 0.535, 0.13, 0.065, 0.1),
    ]
    // The clearing is wide enough for the camp of any site: three rings of tents round the fire.
    const clearing = makeBlob(next, place.fire.x - 4 * u, place.fire.y + 8 * u, 316 * u, 220 * u, 0.06)
    const tint = this.makeCanvas()
    tint.width = Math.round(w * dpr); tint.height = Math.round(h * dpr)
    const tctx = tint.getContext('2d')!
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    tctx.fillStyle = WOOD
    for (const wood of woods) { tctx.beginPath(); traceBlob(tctx, wood, w, h); tctx.fill() }
    tctx.globalCompositeOperation = 'destination-out'
    tctx.beginPath(); traceBlob(tctx, clearing, 1, 1); tctx.fill()
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(tint, 0, 0, tint.width, tint.height, 0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'

    // The survey grid, very faint.
    const cell = h / 7
    ctx.globalAlpha = 0.13
    for (let x = (w % cell) / 2; x < w; x += cell) line(ctx, x, 0, x, h, GRID, 0.8 * u)
    for (let y = cell; y < h; y += cell) line(ctx, 0, y, w, y, GRID, 0.8 * u)
    ctx.globalAlpha = 1

    // Contours, traced once from the height function. Every fifth is the heavier index contour.
    const cw = 230, ch = Math.max(2, Math.round((cw * h) / w)), step = 0.052
    const { min, max } = terrain.range(cw, ch)
    const levels: number[] = []
    for (let n = Math.ceil(min / step); n * step < max; n++) levels.push(n * step)
    const first = Math.ceil(min / step)
    const segments = terrain.contourSegments(levels, cw, ch)
    for (const heavy of [false, true]) {
      ctx.beginPath()
      for (const s of segments) {
        if (((first + s.level) % 5 === 0) !== heavy) continue
        ctx.moveTo(s.x1 * w, s.y1 * h); ctx.lineTo(s.x2 * w, s.y2 * h)
      }
      ctx.strokeStyle = heavy ? CONTOUR_INDEX : CONTOUR
      ctx.lineWidth = (heavy ? 1.7 : 0.85) * u
      ctx.stroke()
    }

    // The stream: one blue line that widens as it runs, opening to a double line, and its pale pool.
    const stream = terrain.stream, last = stream.length - 1
    for (const inner of [false, true]) {
      for (let i = 0; i < last; i++) {
        const width = (1.8 + (3.6 * i) / last) * u
        if (inner && width < 3.6 * u) continue
        line(ctx, stream[i].x * w, stream[i].y * h, stream[i + 1].x * w, stream[i + 1].y * h, inner ? WATER_FILL : WATER_LINE, inner ? width - 2.2 * u : width)
      }
    }
    const pool = makeBlob(next, terrain.pool.x * w, terrain.pool.y * h, terrain.pool.rx * w, terrain.pool.ry * h, 0.12)
    ctx.beginPath(); traceBlob(ctx, pool, 1, 1); ink(ctx, WATER_FILL, 1.5 * u, WATER_LINE)
    for (let i = 0; i < 4; i++) {
      const x = pool.x + (next() - 0.5) * pool.rx, y = pool.y + (i - 1.5) * pool.ry * 0.36
      // Each ripple is one shallow curve, no two alike: short straight strokes one above another would be signs.
      const half = (5 + 3 * next()) * u
      ctx.beginPath(); ctx.moveTo(x - half, y); ctx.quadraticCurveTo(x, y + 3.4 * u, x + half, y); ctx.strokeStyle = WATER_LINE; ctx.lineWidth = 0.9 * u; ctx.stroke()
    }
    // Marsh tufts on the low side of the pool.
    for (let i = 0; i < 7; i++) {
      const x = pool.x + (next() - 0.75) * pool.rx * 3, y = pool.y + pool.ry * (1.25 + next() * 0.7)
      line(ctx, x - 5 * u, y, x + 5 * u, y, WATER_LINE, 0.9 * u)
      for (const lean of [-0.5, 0, 0.5]) line(ctx, x + lean * 4 * u, y - 1.5 * u, x + lean * 9 * u, y - 6 * u, WATER_LINE, 0.9 * u)
    }

    // Printed tree symbols, on a loose grid inside the woodland only.
    const gap = 27 * u
    const nearStream = (x: number, y: number) => stream.some((p) => Math.hypot(p.x * w - x, p.y * h - y) < 15 * u)
    const wider = { ...clearing, rx: clearing.rx * 1.05, ry: clearing.ry * 1.05 }
    ctx.strokeStyle = TREE; ctx.fillStyle = TREE; ctx.lineWidth = 1.15 * u
    for (let gy = 0; gy * gap < h; gy++) for (let gx = 0; gx * gap < w; gx++) {
      const x = (gx + 0.2 + next() * 0.6) * gap, y = (gy + 0.2 + next() * 0.6) * gap, kind = next()
      const inside = (dx: number, dy: number) => woods.some((wood) => inBlob(wood, (x + dx) / w, (y + dy) / h))
      if (!inside(0, 0) || !inside(8 * u, 0) || !inside(-8 * u, 0) || !inside(0, 8 * u) || !inside(0, -8 * u)) continue
      if (inBlob(wider, x, y) || nearStream(x, y) || inBlob({ ...pool, rx: pool.rx * 1.3, ry: pool.ry * 1.3 }, x, y)) continue
      if (kind < 0.68) {
        // A broadleaf: a small solid crown of three lobes on a ground tick. Never an open ring with a tail:
        // that reads as a letter, and the kid side shows none.
        for (const [lx, ly, r] of [[-2.4, 0.6, 2.9], [2.4, 0.6, 2.9], [0, -2.2, 3.2]]) { ctx.beginPath(); ctx.arc(x + lx * u, y + ly * u, r * u, 0, TAU); ctx.fill() }
        ctx.beginPath(); ctx.moveTo(x - 1 * u, y + 5 * u); ctx.lineTo(x + 6.5 * u, y + 5 * u); ctx.stroke()
      } else {
        // A conifer: a small solid spire on a ground tick.
        poly(ctx, [x, y - 6.5 * u, x + 3.8 * u, y + 3.5 * u, x - 3.8 * u, y + 3.5 * u]); ctx.fill()
        ctx.beginPath(); ctx.moveTo(x - 1 * u, y + 5 * u); ctx.lineTo(x + 6.5 * u, y + 5 * u); ctx.stroke()
      }
    }
    this.paintSheet(ctx, w, h, place)
  }

  /** What is printed last and what the sheet itself does: the footpath, spot heights, creases, margins, neat line and the folded-over flap. */
  private paintSheet(ctx: Ctx, w: number, h: number, place: Board) {
    const u = place.u, inset = place.inset, next = seeded(MAP_SEED + 2)
    // A footpath in black dashes, in from the left and out over a footbridge on the right.
    const ford = TERRAIN.stream[Math.round(TERRAIN.stream.length * 0.6)]
    const paths = [
      [-0.01, 0.502, 0.04, 0.487, 0.08, 0.47, 0.118, 0.452],
      [0.585, 0.44, 0.63, ford.y + 0.012, ford.x - 0.03, ford.y + 0.004, ford.x, ford.y, ford.x + 0.03, ford.y - 0.004, 0.83, ford.y - 0.02, 0.9, ford.y - 0.03],
    ]
    ctx.strokeStyle = NEAT; ctx.lineWidth = 1.3 * u; ctx.globalAlpha = 0.75
    ctx.setLineDash([7 * u, 4.5 * u])
    for (const path of paths) {
      ctx.beginPath(); ctx.moveTo(path[0] * w, path[1] * h)
      for (let i = 2; i < path.length - 2; i += 2) ctx.quadraticCurveTo(path[i] * w, path[i + 1] * h, ((path[i] + path[i + 2]) / 2) * w, ((path[i + 1] + path[i + 3]) / 2) * h)
      ctx.lineTo(path[path.length - 2] * w, path[path.length - 1] * h)
      ctx.stroke()
    }
    ctx.setLineDash([])
    // The footbridge: one plank deck across the stream, in the path's own line. Two rails side by side would be an equals sign.
    at(ctx, ford.x * w, ford.y * h, u * 1.3, -0.08, () => {
      box(ctx, -11, -4.5, 22, 9, 1.5); ink(ctx, PAPER, 1.3, NEAT)
    })
    // Spot heights: a survey triangle on the big hill, a dot on the knoll.
    at(ctx, 0.074 * w, 0.075 * h, u, 0, () => { poly(ctx, [0, -6, 5.5, 4, -5.5, 4]); ctx.strokeStyle = NEAT; ctx.lineWidth = 1.2; ctx.stroke(); disc(ctx, 0, 0.6, 1.2); ctx.fillStyle = NEAT; ctx.fill() })
    disc(ctx, 0.558 * w, 0.2 * h, 1.8 * u); ctx.fillStyle = NEAT; ctx.fill()
    ctx.globalAlpha = 1

    // The margin outside the neat line is bare paper, with a tick wherever a grid line meets it.
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, w, inset); ctx.fillRect(0, h - inset, w, inset); ctx.fillRect(0, 0, inset, h); ctx.fillRect(w - inset, 0, inset, h)
    const cell = h / 7
    for (let x = (w % cell) / 2; x < w; x += cell) { line(ctx, x, inset - 6 * u, x, inset, NEAT, 1 * u); line(ctx, x, h - inset, x, h - inset + 6 * u, NEAT, 1 * u) }
    for (let y = cell; y < h; y += cell) { line(ctx, inset - 6 * u, y, inset, y, NEAT, 1 * u); line(ctx, w - inset, y, w - inset + 6 * u, y, NEAT, 1 * u) }
    ctx.strokeStyle = NEAT
    ctx.lineWidth = 1.4 * u; ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2)
    ctx.lineWidth = 0.6 * u; ctx.strokeRect(inset + 3.5 * u, inset + 3.5 * u, w - inset * 2 - 7 * u, h - inset * 2 - 7 * u)

    // Fold creases: the sheet was folded into four panels by two. Each crease is a dark hairline with a pale one beside it,
    // and every other panel lies a touch darker, as a sheet does that will not go quite flat again.
    ctx.fillStyle = 'rgba(110, 88, 56, 0.045)'
    for (let col = 0; col < 4; col++) for (let row = 0; row < 2; row++) if ((col + row) % 2 === 1) ctx.fillRect((col * w) / 4, (row * h) / 2, w / 4, h / 2)
    const crease = (x1: number, y1: number, x2: number, y2: number, dx: number, dy: number) => {
      line(ctx, x1, y1, x2, y2, 'rgba(96, 74, 46, 0.22)', 1.1 * u)
      line(ctx, x1 + dx, y1 + dy, x2 + dx, y2 + dy, 'rgba(255, 255, 255, 0.5)', 1.2 * u)
    }
    for (let col = 1; col < 4; col++) crease((col * w) / 4, 0, (col * w) / 4, h, 1.3 * u, 0)
    crease(0, h / 2, w, h / 2, 0, 1.3 * u)
    // Where two creases cross the print has worn through to the paper.
    for (let col = 1; col < 4; col++) { poly(ctx, [(col * w) / 4, h / 2 - 5 * u, (col * w) / 4 + 4 * u, h / 2, (col * w) / 4, h / 2 + 5 * u, (col * w) / 4 - 4 * u, h / 2]); ctx.fillStyle = 'rgba(255, 252, 244, 0.8)'; ctx.fill() }

    // The folded-over edge: the back of the sheet, plain, lying on the map. Its free edge is on the left and its crease on the right.
    const flap = place.flap, ax = flap.shape[8], ay = flap.shape[9]
    poly(ctx, flap.shape); ctx.fillStyle = PAPER_BACK; ctx.fill()
    ctx.save()
    poly(ctx, flap.shape); ctx.clip()
    for (let i = 0; i < 160; i++) {
      const x = flap.top + next() * (w - flap.top), y = next() * h, len = (2 + next() * 6) * u, turn = next() * TAU
      line(ctx, x, y, x + Math.cos(turn) * len, y + Math.sin(turn) * len, 'rgba(120, 96, 60, 0.07)', 0.7 * u)
    }
    // The crease shadow: the paper turns under along the right edge, in two flat steps.
    ctx.fillStyle = 'rgba(96, 74, 46, 0.1)'; ctx.fillRect(w - 20 * u, 0, 20 * u, h)
    ctx.fillStyle = 'rgba(96, 74, 46, 0.14)'; ctx.fillRect(w - 8 * u, 0, 8 * u, h)
    crease(flap.top, h / 2, w, h / 2, 0, 1.3 * u)
    // The curled-over corner casts its own hard shadow on the flap.
    ctx.translate(4 * u, 5 * u); poly(ctx, flap.curl); ctx.fillStyle = SHADOW; ctx.fill()
    ctx.restore()
    // The free edge lifts a little off the map: one narrow flat shadow beside it.
    poly(ctx, [flap.top - 4.5 * u, 0, flap.top, 0, ax, ay, ax - 4.5 * u, ay]); ctx.fillStyle = 'rgba(46, 34, 22, 0.2)'; ctx.fill()
    line(ctx, flap.top, 0, ax, ay, 'rgba(58, 44, 30, 0.7)', 1.3 * u)
    // The corner itself, printed side up: paper, a scrap of woodland and a few contours.
    poly(ctx, flap.curl); ctx.fillStyle = PAPER; ctx.fill()
    ctx.save(); poly(ctx, flap.curl); ctx.clip()
    const [, , bx, by, tx, ty] = flap.curl
    disc(ctx, tx + 6 * u, ty - 4 * u, 30 * u); ctx.fillStyle = WOOD; ctx.fill()
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(bx + 10 * u, by + 6 * u, (20 + i * 11) * u, 0, TAU); ctx.strokeStyle = i === 2 ? CONTOUR_INDEX : CONTOUR; ctx.lineWidth = (i === 2 ? 1.7 : 0.9) * u; ctx.stroke() }
    ctx.restore()
    poly(ctx, flap.curl); ctx.strokeStyle = 'rgba(58, 44, 30, 0.75)'; ctx.lineWidth = 1.3 * u; ctx.lineJoin = 'round'; ctx.stroke()
  }

  /** The night film: one flat dark blue over the map inside the neat line, with a clean round hole for each light and none over the folded edge. */
  private paintFilm(ctx: Ctx, board: Board, holes: readonly number[]) {
    const inset = board.inset
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, board.w, board.h)
    ctx.fillStyle = FILM
    ctx.fillRect(inset, inset, board.w - inset * 2, board.h - inset * 2)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
    for (let i = 0; i < holes.length; i += 3) if (holes[i + 2] > 0) { disc(ctx, holes[i], holes[i + 1], holes[i + 2]); ctx.fill() }
    poly(ctx, board.flap.shape); ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  /** Two or three small pale glints running down the stream, over the printed line. The map under them never moves. */
  private paintStream(ctx: Ctx, board: Board, turn: number) {
    const stream = TERRAIN.stream, last = stream.length - 1, u = board.u
    ctx.lineCap = 'round'
    for (let i = 0; i < 3; i++) {
      const p = (((turn + i / 3) % 1) + 1) % 1, f = p * last, k = Math.min(last - 1, Math.floor(f)), t = f - k
      const a = stream[k], b = stream[k + 1]
      const x = mix(a.x, b.x, t) * board.w, y = mix(a.y, b.y, t) * board.h
      // The stream runs on under the folded edge, and a glint does not show through paper.
      if (x > board.flap.top - 6 * u) continue
      const dx = (b.x - a.x) * board.w, dy = (b.y - a.y) * board.h, d = Math.hypot(dx, dy) || 1, len = (2.5 + 3 * p) * u
      ctx.globalAlpha = 0.95 * Math.sin(Math.PI * p)
      line(ctx, x - (dx / d) * len, y - (dy / d) * len, x + (dx / d) * len, y + (dy / d) * len, '#f7fcff', (1.1 + 1.8 * p) * u)
    }
    ctx.globalAlpha = 1
    this.draws++
  }

  /** The site's own camp: its tents, the fire with the kettle on its stones, each camper where the frame puts it, the dog and the frog. */
  private paintCamp(ctx: Ctx, board: Board, frame: GameFrame, packing: number) {
    const u = board.u, size = u * FIGURE_SCALE
    const put = (p: Point, scale: number, turn: number, draw: () => void) => { at(ctx, p.x, p.y, scale, turn, draw); this.draws++ }
    // A camp being packed folds its tents flat before the sheet is turned, and the next one's open as it comes into view.
    const folded = packing < 0.5 ? smooth(0, 0.3, packing) : 1 - smooth(0.7, 1, packing)
    for (const one of board.campers) { const inks = tentInks(one.who); put(one.tentMiddle, size, one.tent.turn, () => tent(ctx, inks[0], inks[1], frame.tents[one.who], folded)) }
    put(board.fire, size, 0, () => fireRing(ctx, frame.fire, frame.blaze, frame.stream))
    if (board.kettle) put(board.kettle, size * 0.9, 0.5, () => kettle(ctx, frame.kettle, frame.kettleDry))
    // An oil flask on the fire is a fireball, and it blows every hat back for as long as it lasts.
    const fireball = frame.effects.find((effect) => effect.kind === 'fireball-ring-blows-the-hats-back'), gust = fireball ? smooth(0.1, 0.22, fireball.t) * (1 - smooth(0.62, 0.95, fireball.t)) : 0
    const painted = (who: (typeof board.campers)[number]['who']) => {
      const place = frame.places[who]
      const wet = place.act === 'walks-into-the-stream' && inWater(board, place.x, place.y)
      put(place, size, place.turn, () => camper(ctx, who, frame.campers[who], place, { wet, panGone: who === 'cook' && frame.raccoons.some((raccoon) => raccoon.has === 'pan'), gust }))
    }
    // Whoever sleeps on the dog lies over it; everyone else lies under it, and the one hiding under it most of all.
    for (const one of board.campers) if (frame.places[one.who].act !== 'sleeps-on-the-dog') painted(one.who)
    // A poked dog spins once round on the spot.
    put(frame.dog, size, frame.dog.turn + smooth(0, 1, frame.dog.poke) * TAU, () => dog(ctx, frame.dog))
    for (const one of board.campers) if (frame.places[one.who].act === 'sleeps-on-the-dog') painted(one.who)
    this.paintFrog(ctx, board, frame.frog)
  }

  /** The frog sits on the rim of the pool; a hop is an arc into the water, a ring of ripple, and an arc back. */
  private paintFrog(ctx: Ctx, board: Board, state: GameFrame['frog']) {
    const u = board.u, rim = board.frog, pool = board.pool, hop = state.hop
    const away = Math.atan2(pool.x - rim.x, -(pool.y - rim.y))
    let x = rim.x, y = rim.y, turn = -0.6, lift = 0, shown = true
    if (hop > 0 && hop < 1) {
      if (hop < 0.3) { const s = hop / 0.3; x = mix(rim.x, pool.x, s); y = mix(rim.y, pool.y, s); lift = Math.sin(Math.PI * s); turn = mix(-0.6, away, smooth(0, 0.3, s)) }
      else if (hop > 0.7) { const s = (hop - 0.7) / 0.3; x = mix(pool.x, rim.x, s); y = mix(pool.y, rim.y, s); lift = Math.sin(Math.PI * s); turn = mix(away + Math.PI, -0.6 + TAU, smooth(0.5, 1, s)) }
      else shown = false
      // The ring it leaves on the water: two thin circles that widen and fade.
      const ring = clamp01((hop - 0.26) / 0.5)
      if (ring > 0 && ring < 1) {
        ctx.globalAlpha = 1 - ring
        for (const lag of [0, 0.35]) if (ring > lag) { disc(ctx, pool.x, pool.y, (3 + 17 * (ring - lag)) * u); ctx.strokeStyle = WATER_LINE; ctx.lineWidth = 1.3 * u; ctx.stroke() }
        ctx.globalAlpha = 1
      }
    }
    if (shown) at(ctx, x, y, u * (1 + 0.5 * lift), turn, () => frog(ctx, state.throat, lift))
    this.draws++
  }

  /** What lives in the dark, over the film: eyes, raccoons, the moths round each lit lantern, and the owl in the top left woodland. */
  private paintNight(ctx: Ctx, board: Board, frame: GameFrame, strength: number) {
    const u = board.u, size = u * FIGURE_SCALE, clock = frame.stream
    for (let i = 0; i < frame.eyes.length && i < 12; i++) {
      // Each pair blinks in its own time, on the one clock a frame carries.
      const blink = (((clock * 5 + i * 0.37) % 1) + 1) % 1 < 0.05 ? 1 : 0
      at(ctx, frame.eyes[i].x, frame.eyes[i].y, u, ((i * 2.4) % 1) * 0.5 - 0.25, () => eyePair(ctx, blink))
      this.draws++
    }
    for (const one of frame.raccoons) {
      // A hop is a small leap towards the eye.
      const up = one.hop > 0 && one.hop < 1 ? Math.sin(Math.PI * one.hop) : 0
      at(ctx, one.x, one.y - 5 * up * u, size * (1 + 0.24 * up), one.turn, () => raccoonFigure(ctx, one.walk, one.has))
      this.draws++
    }
    frame.lanterns.forEach((lamp, i) => {
      const count = Math.min(10, Math.max(0, Math.round(frame.moths[i] ?? 0)))
      if (count === 0) return
      for (let k = 0; k < count; k++) {
        // Each moth goes round the lamp at its own speed and distance, a whole number of turns to a turn of the clock, so nothing jumps when the clock comes round.
        const way = k % 2 ? 1 : -1, angle = way * clock * TAU * (1 + (k % 3)) + k * 2.4, far = (30 + 7 * (k % 4) + 5 * Math.sin(clock * TAU * 3 + k * 1.3)) * u
        at(ctx, lamp.x + Math.cos(angle) * far, lamp.y + Math.sin(angle) * far, u * 1.4, angle + (way > 0 ? Math.PI : 0), () => moth(ctx, Math.sin(clock * TAU * 40 + k * 2)))
      }
      this.draws++
    })
    if (strength > 0 || frame.night.hoot > 0) {
      ctx.globalAlpha = Math.max(strength, clamp01(frame.night.hoot))
      at(ctx, board.w * 0.06, board.h * 0.215, u * 1.75, 0, () => owl(ctx, frame.night.hoot))
      ctx.globalAlpha = 1
      this.draws++
    }
  }

  /** The folded-over edge: its curled corner as far as it is pulled toward the map, and the mule waiting on it with whatever has been strapped on. */
  private paintFold(ctx: Ctx, board: Board, frame: GameFrame, packing: number) {
    const u = board.u, pull = clamp01(frame.fold.pull)
    if (pull > 0) {
      // The same fold as the printed one, further over: the corner (c) turned about the line a to b, which climbs the free edge as it is pulled.
      const shape = board.flap.shape, top = board.flap.top, h = board.h, bottom = top + ((shape[8] - top) * h) / shape[9]
      const rise = h - shape[9] + pull * 150 * u, out = Math.min(shape[6] - bottom + pull * 110 * u, board.w - bottom - 8 * u)
      const a = { x: bottom - ((bottom - top) * rise) / h, y: h - rise }, b = { x: bottom + out, y: h }
      const along = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / along, ny = (b.x - a.x) / along, off = (bottom - a.x) * nx + (h - a.y) * ny
      const turnedOver = [a.x, a.y, b.x, b.y, bottom - 2 * off * nx, h - 2 * off * ny]
      // Where the corner lay, the map shows, in the shade of the paper held over it.
      poly(ctx, [a.x, a.y, b.x, b.y, bottom, h]); ctx.fillStyle = '#e3d9bf'; ctx.fill()
      ctx.save(); poly(ctx, [a.x, a.y, b.x, b.y, bottom, h]); ctx.clip()
      for (let i = 0; i < 5; i++) { disc(ctx, bottom - 30 * u, h + 20 * u, (40 + i * 26) * u); ctx.strokeStyle = CONTOUR; ctx.lineWidth = 0.9 * u; ctx.stroke() }
      ctx.restore()
      ctx.save(); ctx.translate((4 + 5 * pull) * u, (5 + 7 * pull) * u); poly(ctx, turnedOver); ctx.fillStyle = SHADOW; ctx.fill(); ctx.restore()
      poly(ctx, turnedOver); ctx.fillStyle = PAPER; ctx.fill()
      ctx.save(); poly(ctx, turnedOver); ctx.clip()
      disc(ctx, turnedOver[4] + 6 * u, turnedOver[5] - 4 * u, (30 + 40 * pull) * u); ctx.fillStyle = WOOD; ctx.fill()
      for (let i = 0; i < 9; i++) { disc(ctx, b.x + 10 * u, b.y + 6 * u, (20 + i * 11) * u); ctx.strokeStyle = i % 5 === 2 ? CONTOUR_INDEX : CONTOUR; ctx.lineWidth = (i % 5 === 2 ? 1.7 : 0.9) * u; ctx.stroke() }
      ctx.restore()
      poly(ctx, turnedOver); ctx.strokeStyle = 'rgba(58, 44, 30, 0.75)'; ctx.lineWidth = 1.3 * u; ctx.lineJoin = 'round'; ctx.stroke()
      this.draws++
    }
    // While the sheet is first turned the mule rides across on it, and is drawn with it.
    if (packing > 0 && packing < 0.5) return
    at(ctx, board.mule.x, board.mule.y, u * 1.24, 0, () => mule(ctx, frame.mule, frame.tower, frame.towerOf))
    this.draws++
  }

  /**
   * The sheet turned to the next site, over everything: the back of the sheet sweeps across the surface from the
   * folded edge like a turned page until, half way, it covers it all; then its far edge follows it off to the
   * left, and the next site lies open behind it.
   */
  private paintTurn(ctx: Ctx, board: Board, frame: GameFrame, packing: number) {
    const u = board.u, w = board.w, h = board.h, lean = 18 * u, off = -60 * u
    const first = packing < 0.5, left = first ? mix(board.flap.top, off, smooth(0, 0.5, packing)) : off, right = first ? w + 60 * u : mix(w + 20 * u, off, smooth(0.5, 1, packing))
    poly(ctx, [left, 0, right, 0, right + lean, h, left + lean, h]); ctx.fillStyle = PAPER_BACK; ctx.fill()
    // The sheet's own creases go with it, a panel apart.
    for (let x = left + w / 4; x < right; x += w / 4) {
      line(ctx, x, 0, x + lean, h, 'rgba(96, 74, 46, 0.2)', 1.1 * u)
      line(ctx, x + 1.3 * u, 0, x + lean + 1.3 * u, h, 'rgba(255, 255, 255, 0.55)', 1.2 * u)
    }
    if (first) {
      // Its leading edge lifts off the map as the folded edge does, and the mule rides it across.
      poly(ctx, [left - 5 * u, 0, left, 0, left + lean, h, left + lean - 5 * u, h]); ctx.fillStyle = 'rgba(46, 34, 22, 0.22)'; ctx.fill()
      line(ctx, left, 0, left + lean, h, 'rgba(58, 44, 30, 0.7)', 1.3 * u)
      at(ctx, board.mule.x - (board.flap.top - left), board.mule.y, u * 1.24, 0, () => mule(ctx, frame.mule, frame.tower, frame.towerOf))
      this.draws++
    } else {
      // Its trailing edge throws its hard shadow on the site it uncovers.
      poly(ctx, [right, 0, right + 7 * u, 0, right + lean + 7 * u, h, right + lean, h]); ctx.fillStyle = SHADOW; ctx.fill()
      line(ctx, right, 0, right + lean, h, 'rgba(58, 44, 30, 0.7)', 1.3 * u)
    }
    this.draws++
  }
}

/**
 * How far the whole kit has slid toward the folded edge while the site is packed up, in surface pixels: off in the
 * first moments, past the edge before the turning sheet has covered the map, and nothing once the next site lies there.
 */
export function kitSlide(board: Board, packing: number): number {
  if (!(packing > 0) || packing >= 0.5) return 0
  const s = smooth(0.02, 0.42, packing)
  return s * s * (board.flap.top - board.card + 90 * board.u)
}

/** Whether a point of the surface lies in the stream or in the pool. */
function inWater(board: Board, x: number, y: number): boolean {
  const pool = TERRAIN.pool, px = (x / board.w - pool.x) / pool.rx, py = (y / board.h - pool.y) / pool.ry
  if (px * px + py * py < 1.25) return true
  const near = 10 * board.u
  for (const p of TERRAIN.stream) if (Math.abs(p.x * board.w - x) < near && Math.abs(p.y * board.h - y) < near) return true
  return false
}
