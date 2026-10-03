import { makeTerrain, seeded, type Terrain } from './terrain'

// The look spike: one still painting of the camp at dusk, in the look
// "Survey map and field kit". Nothing here is playable.
//
// Three kinds of thing are drawn, each by its own rule:
//   the map      a printed sheet seen from straight above: cream paper, brown
//                contours, hill shading, blue water, green woodland, creases.
//                Painted once per size into a cached layer.
//   the figures  tents, campers and animals, as if the map's own symbols had
//                come alive: flat warm inks, one thin dark key line, no shadow.
//   the kit      what a hand can pick up: vermilion and white, black and steel.
//                The map uses no red. Every kit object casts one small hard
//                shadow, down and to the right.
// The pieces a child counts (logs, the oil band, the water band, ash) are flat
// single colours with no face and no texture.
//
// No word, letter or numeral is drawn, and no text call is made.

type Ctx = CanvasRenderingContext2D
export type LookOptions = { night?: boolean }
export type CanvasFactory = () => HTMLCanvasElement

const TAU = Math.PI * 2
const SEED = 1904

// The map's printing inks.
const PAPER = '#f2e9d2'
const PAPER_BACK = '#f8f3e6'
const CONTOUR = '#b98a55'
const CONTOUR_INDEX = '#9c6a36'
const WOOD = '#d5e3ae'
const TREE = '#6f9150'
const WATER_LINE = '#4a94c6'
const WATER_FILL = '#c3e1ee'
const GRID = '#5b6f86'
const NEAT = '#4b3a2b'
const PENCIL = '#6d6862'
const FILM = '#4a5c9c'
// The figures' inks: warm and flat, and none of them red.
const INK = '#3a2c22'
const OCHRE = '#d9a640'
const SAND = '#e8d3a2'
const OLIVE = '#8d9a4c'
const MOSS = '#5f7a40'
const TEAL = '#4f8e88'
const PLUM = '#7d5470'
const SLATE = '#6283a6'
const BARK = '#96693f'
const STONE = '#b8b0a2'
const SOOT = '#5a544e'
const SKIN = ['#ecc9a2', '#c88f60', '#8c5c3c', '#e2b98c', '#a87248'] as const
// The kit.
const RED = '#e2401c'
const WHITE = '#fcf9f1'
const BLACK = '#1c1c1f'
const STEEL = '#c5cdd3'
const STEEL_DARK = '#7d8891'
const SHADOW = 'rgba(46, 34, 22, 0.36)'
// The working pieces: one flat colour each.
const LOG = '#cf9f62'
const LOG_LINE = '#6a4524'
const OIL = '#eca418'
const OIL_LINE = '#8a5a06'
const WATER = '#2c7fd0'
const WATER_DARK = '#17508c'
const ASH = '#9b9b98'

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

// Small path helpers. Each starts a new path; the caller fills or strokes it.
function disc(ctx: Ctx, x: number, y: number, r: number) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU) }
function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, turn = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, turn, 0, TAU) }
function box(ctx: Ctx, x: number, y: number, w: number, h: number, r = 0) { ctx.beginPath(); if (r > 0) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h) }
function poly(ctx: Ctx, points: readonly number[]) {
  ctx.beginPath()
  for (let i = 0; i < points.length; i += 2) { if (i === 0) ctx.moveTo(points[i], points[i + 1]); else ctx.lineTo(points[i], points[i + 1]) }
  ctx.closePath()
}
function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke()
}
/** Fills the current path with a flat ink and gives it its key line. */
function ink(ctx: Ctx, fill: string, width = 1.4, color = INK) {
  ctx.fillStyle = fill; ctx.fill()
  if (width > 0) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke() }
}
/** The hard shadow of a kit object: the same path, offset down and to the right, in one flat tone. */
function cast(ctx: Ctx, trace: () => void, dx = 3, dy = 4) {
  ctx.save(); ctx.translate(dx, dy); trace(); ctx.fillStyle = SHADOW; ctx.fill(); ctx.restore()
}
/** Draws in a frame of design pixels placed at a point of the surface: `u` is the size of one design pixel. */
function at(ctx: Ctx, x: number, y: number, u: number, turn: number, draw: () => void) {
  ctx.save(); ctx.translate(x, y); if (turn) ctx.rotate(turn); ctx.scale(u, u)
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  draw()
  ctx.restore()
}

/** Where everything lies, in proportion to the surface. Designed at 1180 by 820. */
export function layout(w: number, h: number) {
  const u = Math.min(w / 1180, h / 820)
  const rodX = w * 0.16, rodLen = w * 0.69
  // The flap's free edge leans a little; its bottom corner (c) has curled over along the line a to b, so the map
  // shows where the corner lay and the corner's printed side lies turned over on the flap (a, b and c mirrored).
  const top = w * 0.874, bottom = w * 0.892, rise = 74 * u
  const a = { x: bottom - ((bottom - top) * rise) / h, y: h - rise }, b = { x: bottom + 62 * u, y: h }
  const along = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / along, ny = (b.x - a.x) / along
  const off = (bottom - a.x) * nx + (h - a.y) * ny
  return {
    u,
    /** The printed neat line, inset from the edge of the sheet. */
    inset: 15 * u,
    fire: { x: w * 0.34, y: h * 0.325 },
    /** How far the fire's light reaches at its present setting. */
    fireReach: 172 * u,
    /** The lit lantern, standing on its pin, and how far its light reaches. */
    lantern: { x: w * 0.34 + 268 * u, y: h * 0.325 + 22 * u, reach: 122 * u },
    /** The folded-over flap: where its free edge meets the top of the sheet, its outline, and its curled-over corner. */
    flap: { top, shape: [top, 0, w, 0, w, h, b.x, b.y, a.x, a.y], curl: [a.x, a.y, b.x, b.y, bottom - 2 * off * nx, h - 2 * off * ny] },
    compass: { x: w * 0.795, y: h * 0.14, r: 50 * u },
    card: w * 0.058, pile: w * 0.128, rodX, rodLen,
    /** The three rods: logs, oil, water. */
    lanes: [h * 0.662, h * 0.728, h * 0.794],
    ruler: { y: h * 0.892, hour: (rodLen * 0.8) / 8, hours: 8 },
    mule: { x: w * 0.942, y: h * 0.39 },
    sled: { x: w * 0.945, y: h * 0.535 },
  }
}
type Layout = ReturnType<typeof layout>

export class Look {
  /** How many times the cached map has been painted: once per size. */
  mapPaints = 0
  private readonly terrain: Terrain = makeTerrain(SEED)
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
   * Paints the whole frame: the cached map, the figures, the night film when it is night, then the kit.
   * `width` and `height` are the surface in CSS pixels and `dpr` its pixel ratio. Returns how many sprites
   * and figures were drawn.
   */
  paint(ctx: Ctx, width: number, height: number, dpr: number, opts: LookOptions = {}): number {
    if (!(width > 0) || !(height > 0) || !(dpr > 0)) return 0
    const night = opts.night === true
    const pw = Math.round(width * dpr), ph = Math.round(height * dpr)
    const key = `${pw}x${ph}@${dpr}`
    if (!this.map || key !== this.key) {
      this.map = this.map ?? this.makeCanvas()
      this.map.width = pw; this.map.height = ph
      const layer = this.map.getContext('2d')!
      layer.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.paintMap(layer, width, height, dpr)
      this.key = key
      this.filmKey = ''
      this.mapPaints++
    }
    const place = layout(width, height)
    this.draws = 0
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.drawImage(this.map, 0, 0)
    this.draws++
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.paintFigures(ctx, width, height, place, night)
    if (night) {
      if (!this.film || this.filmKey !== key) {
        this.film = this.film ?? this.makeCanvas()
        this.film.width = pw; this.film.height = ph
        const layer = this.film.getContext('2d')!
        layer.setTransform(dpr, 0, 0, dpr, 0, 0)
        this.paintFilm(layer, width, height, place)
        this.filmKey = key
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = 'multiply'
      ctx.drawImage(this.film, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.draws++
      this.paintEyes(ctx, place)
    }
    this.paintFlapFigures(ctx, place)
    this.paintKit(ctx, place, night)
    return this.draws
  }

  // --- The map: painted once per size ---------------------------------------

  private paintMap(ctx: Ctx, w: number, h: number, dpr: number) {
    const place = layout(w, h), u = place.u, terrain = this.terrain, next = seeded(SEED + 1)
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
    const clearing = makeBlob(next, place.fire.x - 14 * u, place.fire.y + 28 * u, 280 * u, 232 * u, 0.07)
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
      line(ctx, x - 7 * u, y, x + 7 * u, y, WATER_LINE, 0.9 * u)
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
        // A broadleaf: an open ring with a short ground tick.
        ctx.beginPath(); ctx.arc(x, y, 4.3 * u, 0.55, TAU * 0.97); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + 2.5 * u, y + 4.6 * u); ctx.lineTo(x + 7.5 * u, y + 4.6 * u); ctx.stroke()
      } else {
        // A conifer: a small solid spire on a ground tick.
        poly(ctx, [x, y - 6.5 * u, x + 3.8 * u, y + 3.5 * u, x - 3.8 * u, y + 3.5 * u]); ctx.fill()
        ctx.beginPath(); ctx.moveTo(x - 1 * u, y + 5 * u); ctx.lineTo(x + 6.5 * u, y + 5 * u); ctx.stroke()
      }
    }
    this.paintSheet(ctx, w, h, place)
  }

  /** What is printed last and what the sheet itself does: the footpath, spot heights, creases, margins, neat line and the folded-over flap. */
  private paintSheet(ctx: Ctx, w: number, h: number, place: Layout) {
    const u = place.u, inset = place.inset, next = seeded(SEED + 2)
    // A footpath in black dashes, in from the left and out over a footbridge on the right.
    const ford = this.terrain.stream[Math.round(this.terrain.stream.length * 0.6)]
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
    // The footbridge: two short rails across the stream, with turned-out ends.
    at(ctx, ford.x * w, ford.y * h, u * 1.3, -0.08, () => {
      box(ctx, -9, -4, 18, 8); ctx.fillStyle = PAPER; ctx.fill()
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(-12, side * 7); ctx.lineTo(-8, side * 4); ctx.lineTo(8, side * 4); ctx.lineTo(12, side * 7)
        ctx.strokeStyle = NEAT; ctx.lineWidth = 1.3; ctx.stroke()
      }
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
      line(ctx, x1 + dx, y1 + dy, x2 + dx, y2 + dy, 'rgba(255, 255, 255, 0.6)', 1.3 * u)
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

  /** The night film: one flat dark blue over the map inside the neat line, with a clean hole for each light and none over the flap. */
  private paintFilm(ctx: Ctx, w: number, h: number, place: Layout) {
    const inset = place.inset
    ctx.clearRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = FILM
    ctx.fillRect(inset, inset, w - inset * 2, h - inset * 2)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = '#000'
    disc(ctx, place.fire.x, place.fire.y, place.fireReach); ctx.fill()
    disc(ctx, place.lantern.x, place.lantern.y, place.lantern.reach); ctx.fill()
    poly(ctx, place.flap.shape); ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  /** Eyes in the dark, just outside the light. Drawn over the film. */
  private paintEyes(ctx: Ctx, place: Layout) {
    const u = place.u, fire = place.fire
    for (const [dx, dy, turn] of [[-196, -40, 0.2], [70, -196, -0.15], [330, -112, 0.1]]) {
      at(ctx, fire.x + dx * u, fire.y + dy * u, u, turn, () => {
        for (const side of [-1, 1]) {
          oval(ctx, side * 5.5, 0, 3.6, 4.4); ctx.fillStyle = '#f6e79a'; ctx.fill()
          oval(ctx, side * 5.5 + 0.8, 0.3, 1.1, 2.6); ctx.fillStyle = '#141a33'; ctx.fill()
        }
      })
      this.draws++
    }
  }

  // --- The figures: the map's symbols come alive ----------------------------

  private paintFigures(ctx: Ctx, w: number, h: number, place: Layout, night: boolean) {
    const u = place.u, fire = place.fire
    // The figures are drawn a little over design size: they are the charm of the scene and must read at arm's length.
    const put = (dx: number, dy: number, turn: number, draw: () => void) => { at(ctx, fire.x + dx * u, fire.y + dy * u, u * 1.1, turn, draw); this.draws++ }
    // Each camper lies beside their own tent, feet towards the fire, the tents at different distances from it.
    for (const camp of CAMP) {
      const x = Math.cos(camp.angle) * camp.away, y = Math.sin(camp.angle) * camp.away, turn = camp.angle + Math.PI + camp.lean
      put(x, y, turn, () => { ctx.translate(0, -camp.side * (camp.who === 'sleeper' ? 32 : 23)); tent(ctx, camp.light, camp.dark) })
      put(x, y, turn, () => { ctx.translate(camp.who === 'sleeper' ? -44 : -26, camp.side * (camp.who === 'sleeper' ? 34 : 33)); ctx.rotate(-Math.PI / 2); CAMPERS[camp.who](ctx) })
    }
    put(0, 0, 0, () => fireRing(ctx, night))
    put(70, -42, 0.5, () => kettle(ctx))
    put(52, 150, -2.5, () => dog(ctx))
    // The frog sits on the rim of the pool.
    const pool = this.terrain.pool
    at(ctx, (pool.x - pool.rx * 0.5) * w, (pool.y - pool.ry * 0.62) * h, u, -0.6, () => frog(ctx))
    this.draws++
  }

  /** The mule and the sled wait on the folded-over edge, outside the map, and so outside the night film. */
  private paintFlapFigures(ctx: Ctx, place: Layout) {
    at(ctx, place.sled.x, place.sled.y, place.u * 1.1, 0, () => sled(ctx)); this.draws++
    at(ctx, place.mule.x, place.mule.y, place.u * 1.14, 0, () => mule(ctx)); this.draws++
  }

  // --- The kit: what lies on the map and can be picked up -------------------

  private paintKit(ctx: Ctx, place: Layout, night: boolean) {
    const u = place.u, fire = place.fire, lamp = place.lantern
    const put = (x: number, y: number, turn: number, draw: () => void) => { at(ctx, x, y, u, turn, draw); this.draws++ }
    put(fire.x, fire.y, 0, () => dial(ctx, 1))
    // The lantern's reach, in pencil, as a hand with a pair of compasses would draw it.
    put(lamp.x, lamp.y, 0, () => {
      ctx.strokeStyle = PENCIL; ctx.globalAlpha = 0.8
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, lamp.reach / u, 0.2, TAU + 0.05); ctx.stroke()
      ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0.8, -0.6, lamp.reach / u + 0.9, 2.6, 5.2); ctx.stroke()
    })
    put(lamp.x + 17 * u, lamp.y + 18 * u, 0, () => pin(ctx))
    put(lamp.x, lamp.y, 0, () => lantern(ctx, night))
    put(fire.x - 30 * u, fire.y - 192 * u, 0, () => pin(ctx))
    put(fire.x - 84 * u, fire.y + 66 * u, -0.25, () => tin(ctx))
    put(place.compass.x, place.compass.y, 0.12, () => compass(ctx))

    // The three rods, each with its amount card, its pile and the row laid in along it.
    const len = place.rodLen / u
    // At dusk the plan lies whole on the rods. In the night what has burned has left the far end of each row and
    // lies as ash under the ruler: here the water has just run out.
    const rods = [
      { kind: 'logs' as const, units: 35, laid: night ? 4 : 14 },
      { kind: 'oil' as const, units: 15, laid: night ? 1.3 : 3 },
      { kind: 'water' as const, units: 10, laid: night ? 0 : 2 },
    ]
    rods.forEach((row, i) => {
      const y = place.lanes[i], unit = len / row.units
      put(place.card, y - 12 * u, [-0.05, 0.04, -0.03][i], () => card(ctx, row.kind))
      put(place.pile, y - 12 * u, 0, () => pile(ctx, row.kind))
      put(place.rodX, y, 0, () => rod(ctx, len, row.units))
      if (row.kind === 'logs') for (let k = 0; k < row.laid; k++) put(place.rodX + k * unit * u, y, 0, () => logPiece(ctx, unit))
      else if (row.laid > 0) put(place.rodX, y, 0, () => band(ctx, unit, row.laid, row.kind === 'oil' ? OIL : WATER, row.kind === 'oil' ? OIL_LINE : WATER_DARK))
    })

    // The night ruler along the bottom, its spare section folded back at the right end, and the cursor on it.
    const hour = place.ruler.hour / u, hours = place.ruler.hours, passed = night ? 3.4 : 0
    put(place.rodX + hours * place.ruler.hour, place.ruler.y, 0, () => spareSection(ctx, hour))
    put(place.rodX, place.ruler.y, 0, () => ruler(ctx, hour, hours))
    put(place.rodX + hours * place.ruler.hour, place.ruler.y, 0, () => endHinge(ctx))
    if (night) put(place.rodX, place.ruler.y, 0, () => ash(ctx, hour, passed))
    put(place.rodX + passed * place.ruler.hour, place.ruler.y, 0, () => cursor(ctx, night))
  }
}

// --- The figures, each drawn in a frame of design pixels ---------------------

type Who = 'reader' | 'sleeper' | 'cook' | 'scout' | 'small'

// Where each tent stands: the direction from the fire, how far away, a little lean so nothing lines up, which side of
// the tent the camper lies on, and the tent's two inks.
const CAMP: readonly { who: Who; angle: number; away: number; lean: number; side: 1 | -1; light: string; dark: string }[] = [
  { who: 'cook', angle: -1.05, away: 140, lean: 0.12, side: 1, light: '#b3c070', dark: OLIVE },
  { who: 'reader', angle: -2.5, away: 160, lean: -0.1, side: -1, light: '#9db6cf', dark: SLATE },
  { who: 'sleeper', angle: 2.97, away: 224, lean: 0.08, side: 1, light: '#a9829c', dark: PLUM },
  { who: 'small', angle: 1.78, away: 158, lean: -0.14, side: -1, light: '#86bab3', dark: TEAL },
  { who: 'scout', angle: 0.5, away: 210, lean: 0.06, side: 1, light: '#e6c067', dark: '#cc9a34' },
]

/** A ridge tent from straight above: two panels either side of the ridge, the door at the end that faces the fire. */
function tent(ctx: Ctx, light: string, dark: string) {
  // Guy lines and pegs.
  for (const [x, y] of [[-36, -26], [36, -26], [-36, 26], [36, 26], [-36, 0], [36, 0]]) {
    const px = x * 1.24, py = y * 1.3
    line(ctx, x, y, px, py, INK, 0.9)
    disc(ctx, px, py, 1.5); ctx.fillStyle = INK; ctx.fill()
  }
  poly(ctx, [-36, -26, 36, -26, 36, 0, -36, 0]); ink(ctx, light)
  poly(ctx, [-36, 0, 36, 0, 36, 26, -36, 26]); ink(ctx, dark)
  // The door: an open flap at the fire end.
  poly(ctx, [36, -11, 20, 0, 36, 11]); ink(ctx, '#4b3b2f', 1.2)
  line(ctx, -36, 0, 20, 0, INK, 1.8)
}

/** A sleeping bag seen from above, in the camper's frame: the head end at the top, the feet below. */
function bag(ctx: Ctx, width: number, length: number, fill: string, stripe: string) {
  box(ctx, -width / 2, 2, width, length, width / 2); ink(ctx, fill)
  // The turned-down top of the bag, and two printed stripes across it.
  ctx.save(); box(ctx, -width / 2, 2, width, length, width / 2); ctx.clip()
  ctx.fillStyle = stripe; ctx.fillRect(-width / 2, length * 0.52, width, 4); ctx.fillRect(-width / 2, length * 0.66, width, 4)
  ctx.restore()
  box(ctx, -width / 2, 2, width, length, width / 2); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke()
}
function eyes(ctx: Ctx, y: number, gap: number, r = 1.2) { for (const side of [-1, 1]) { disc(ctx, side * gap, y, r); ctx.fillStyle = INK; ctx.fill() } }

const CAMPERS: Record<Who, (ctx: Ctx) => void> = {
  // The reader: a head torch, round glasses, and a book held up over the bag.
  reader(ctx) {
    bag(ctx, 26, 60, SLATE, '#e9dfc4')
    for (const side of [-1, 1]) line(ctx, side * 11, 14, side * 9, 27, SKIN[0], 4.5)
    // The open book, pages bare.
    box(ctx, -15, 20, 30, 20, 1.5); ink(ctx, BARK, 1.2)
    box(ctx, -13, 21.5, 26, 17); ink(ctx, '#fbf6e8', 0.9)
    line(ctx, 0, 21.5, 0, 38.5, INK, 1)
    for (const side of [-1, 1]) { disc(ctx, side * 14, 33, 2.8); ink(ctx, SKIN[0], 1) }
    disc(ctx, 0, -3, 11); ink(ctx, SKIN[0])
    ctx.beginPath(); ctx.arc(0, -3, 11, Math.PI + 0.25, TAU - 0.25); ctx.closePath(); ink(ctx, '#5b4030', 1.2)
    line(ctx, -10.4, -6.4, 10.4, -6.4, TEAL, 3)
    disc(ctx, 0, -8.6, 3.4); ink(ctx, '#f8e9a6', 1.1)
    for (const side of [-1, 1]) { disc(ctx, side * 4.3, -0.4, 3.3); ink(ctx, 'rgba(255, 255, 255, 0.7)', 1.2) }
    line(ctx, -1, -0.4, 1, -0.4, INK, 1.2)
    eyes(ctx, 0.4, 4.3, 1)
    line(ctx, -1.6, 5.2, 1.6, 5.2, INK, 1)
  },
  // The sleeper: a bobble hat, and a quilted bag far too big for one person.
  sleeper(ctx) {
    box(ctx, -27, -6, 54, 98, 25); ink(ctx, '#e2b64c')
    ctx.save(); box(ctx, -27, -6, 54, 98, 25); ctx.clip()
    ctx.strokeStyle = '#b98a22'; ctx.lineWidth = 1.3
    for (let y = 24; y < 92; y += 15) { ctx.beginPath(); ctx.moveTo(-27, y); ctx.quadraticCurveTo(0, y + 7, 27, y); ctx.stroke() }
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, 92); ctx.stroke()
    ctx.restore()
    // The collar of the bag, and a small head a long way down inside it.
    oval(ctx, 0, 6, 17, 13); ink(ctx, '#a97c1c', 1.2)
    disc(ctx, 0, 6, 9.5); ink(ctx, SKIN[3])
    ctx.beginPath(); ctx.arc(0, 6, 9.5, Math.PI - 0.15, TAU + 0.15); ctx.closePath(); ink(ctx, PLUM, 1.2)
    line(ctx, -9, 5, 9, 5, '#e9dfc4', 2.4)
    disc(ctx, 0, -5.5, 4.6); ink(ctx, '#f3ead2', 1.2)
    ctx.strokeStyle = INK; ctx.lineWidth = 1.1
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * 3.8, 8.6, 1.9, 0.2, Math.PI - 0.2); ctx.stroke() }
    disc(ctx, 0, 12.6, 1.2); ctx.stroke()
  },
  // The cook: a pan for a hat, its handle out to one side, and a moustache.
  cook(ctx) {
    bag(ctx, 26, 58, MOSS, '#d9cf9a')
    // A wooden spoon, held to the chest like a sceptre.
    line(ctx, 4, 12, 7, 40, '#c79a62', 3)
    oval(ctx, 3.4, 9, 4.2, 5.6, -0.1); ink(ctx, '#c79a62', 1.1)
    for (const [x, y] of [[-4, 24], [6, 27]]) { disc(ctx, x, y, 3.1); ink(ctx, SKIN[1], 1) }
    disc(ctx, 0, -3, 11); ink(ctx, SKIN[1])
    eyes(ctx, 1.6, 4)
    ctx.strokeStyle = '#4b3b2f'; ctx.lineWidth = 2.2
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 5); ctx.quadraticCurveTo(side * 4, 3.4, side * 7.5, 6.8); ctx.stroke() }
    // The pan, upside down: its flat bottom, and the handle with its hanging hole.
    ctx.save(); ctx.rotate(-0.5)
    box(ctx, 8, -11.5, 24, 5.4, 2.4); ink(ctx, SOOT, 1.2)
    disc(ctx, 28.5, -8.8, 1.2); ctx.fillStyle = PAPER; ctx.fill()
    ctx.restore()
    ctx.beginPath(); ctx.arc(0, -4.5, 12, Math.PI - 0.2, TAU + 0.2); ctx.closePath(); ink(ctx, SOOT, 1.3)
    ctx.beginPath(); ctx.arc(0, -4.5, 7.5, Math.PI + 0.1, TAU - 0.1); ctx.strokeStyle = '#8b847b'; ctx.lineWidth = 1.2; ctx.stroke()
  },
  // The scout: a wide brim over the whole face, hands folded, boots out of the end of a short bag.
  scout(ctx) {
    for (const side of [-1, 1]) { box(ctx, side * 6 - 4, 50, 8, 13, 3.5); ink(ctx, '#4b3b2f', 1.2) }
    bag(ctx, 25, 52, BARK, '#d9c08a')
    for (const side of [-1, 1]) { disc(ctx, side * 3, 21, 3.2); ink(ctx, SKIN[2], 1) }
    disc(ctx, 0, -2, 16.5); ink(ctx, SAND)
    disc(ctx, 0, -2, 8.6); ink(ctx, '#d6bf88', 1.2)
    disc(ctx, 0, -2, 10); ctx.strokeStyle = MOSS; ctx.lineWidth = 2.4; ctx.stroke()
    // A feather in the band.
    ctx.beginPath(); ctx.moveTo(8, -6); ctx.quadraticCurveTo(19, -14, 17, -2); ctx.quadraticCurveTo(12, -3, 8, -6); ink(ctx, OCHRE, 1)
  },
  // The small one: a hood with ears, wide awake.
  small(ctx) {
    bag(ctx, 22, 42, '#c9a7c0', TEAL)
    for (const side of [-1, 1]) { disc(ctx, side * 8.6, -11, 4.8); ink(ctx, OCHRE, 1.3); disc(ctx, side * 8.6, -11, 2.1); ctx.fillStyle = '#f0d9a0'; ctx.fill() }
    disc(ctx, 0, -2, 11.5); ink(ctx, OCHRE)
    oval(ctx, 0, 0, 7.6, 7); ink(ctx, SKIN[4], 1.1)
    eyes(ctx, -0.6, 3.3, 1.5)
    line(ctx, -1.3, 3.6, 1.3, 3.6, INK, 1)
  },
}

/** The fire: a ring of stones round two crossed logs, unlit at dusk, and at night one flat flame. */
function fireRing(ctx: Ctx, lit: boolean) {
  disc(ctx, 0, 0, 22); ctx.fillStyle = lit ? '#f7dc8a' : '#d8ccb0'; ctx.fill()
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.2
    oval(ctx, Math.cos(a) * 22, Math.sin(a) * 22, 6.6, 5.2, a + 1.4); ink(ctx, STONE, 1.2)
  }
  for (const turn of [0.55, -0.6]) {
    ctx.save(); ctx.rotate(turn)
    box(ctx, -16, -3.6, 32, 7.2, 2.5); ink(ctx, lit ? '#6b4a2d' : BARK, 1.2)
    ctx.restore()
  }
  if (lit) {
    const flame = (s: number, fill: string) => {
      ctx.beginPath(); ctx.moveTo(0, -17 * s); ctx.bezierCurveTo(11 * s, -5 * s, 12 * s, 9 * s, 0, 10 * s); ctx.bezierCurveTo(-12 * s, 9 * s, -8 * s, -3 * s, -4 * s, -6 * s); ctx.bezierCurveTo(-3 * s, -10 * s, -2 * s, -13 * s, 0, -17 * s)
      ink(ctx, fill, s === 1 ? 1.2 : 0)
    }
    flame(1, '#f2a93b'); ctx.translate(0.5, 2.5); flame(0.55, '#fbe9a4')
  }
}

function kettle(ctx: Ctx) {
  poly(ctx, [9, -4, 20, -1.5, 20, 1.5, 9, 4]); ink(ctx, '#8d8881', 1.2)
  disc(ctx, 0, 0, 11.5); ink(ctx, '#8d8881')
  disc(ctx, 0, 0, 5.6); ink(ctx, '#a9a49c', 1.1)
  disc(ctx, 0, 0, 1.8); ink(ctx, SOOT, 0.9)
  ctx.beginPath(); ctx.moveTo(-3, -11); ctx.quadraticCurveTo(-15, 0, -3, 11); ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke()
}

/** The dog from above, lying with its nose towards the small one. The head is at the top of its frame. */
function dog(ctx: Ctx) {
  ctx.beginPath(); ctx.moveTo(3, 22); ctx.quadraticCurveTo(14, 28, 12, 16); ctx.strokeStyle = INK; ctx.lineWidth = 4.6; ctx.stroke()
  ctx.strokeStyle = '#efe3c6'; ctx.lineWidth = 2.4; ctx.stroke()
  oval(ctx, 0, 10, 8.5, 14); ink(ctx, '#efe3c6')
  ctx.save(); oval(ctx, 0, 10, 8.5, 14); ctx.clip(); disc(ctx, 5, 15, 7); ctx.fillStyle = BARK; ctx.fill(); ctx.restore()
  oval(ctx, 0, 10, 8.5, 14); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke()
  for (const side of [-1, 1]) { oval(ctx, side * 6.4, -5, 3.2, 6, side * 0.5); ink(ctx, BARK, 1.2) }
  oval(ctx, 0, -6, 6.2, 7.4); ink(ctx, '#efe3c6')
  disc(ctx, 0, -12.4, 1.8); ctx.fillStyle = INK; ctx.fill()
  eyes(ctx, -7.4, 2.6, 1)
}

function frog(ctx: Ctx) {
  ctx.strokeStyle = '#4c6a2c'; ctx.lineWidth = 2.2
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 3, 3); ctx.lineTo(side * 8.5, 1); ctx.lineTo(side * 7, 7.5); ctx.stroke() }
  oval(ctx, 0, 0, 5.4, 6.6); ink(ctx, '#8fb04c', 1.1, '#3f5a26')
  for (const side of [-1, 1]) { disc(ctx, side * 3.1, -5, 2.3); ink(ctx, '#8fb04c', 1, '#3f5a26'); disc(ctx, side * 3.1, -5.2, 0.9); ctx.fillStyle = INK; ctx.fill() }
}

// The flap is the back of the sheet, not the map, so what stands on it is drawn as a map's pictorial symbols are:
// from the side, flat, with the key line and no shadow.
const MULE = '#a58e70', MULE_FAR = '#8b765b', MULE_DARK = '#4a3b2f', MULE_PALE = '#eadfc6'

/** The mule, standing, head lowered towards the map on its left. */
function mule(ctx: Ctx) {
  // The far legs, then the tail.
  for (const x of [-17, 25]) { box(ctx, x, 12, 7, 30, 2); ink(ctx, MULE_FAR, 1.2); box(ctx, x - 0.5, 37, 8, 6, 1.5); ink(ctx, MULE_DARK, 1) }
  ctx.beginPath(); ctx.moveTo(35, -6); ctx.quadraticCurveTo(46, 0, 41, 20); ctx.strokeStyle = MULE_DARK; ctx.lineWidth = 3; ctx.stroke()
  oval(ctx, 40.5, 23, 3.4, 6.5, 0.15); ink(ctx, MULE_DARK, 0)
  // The neck and the barrel.
  poly(ctx, [-30, -2, -12, -14, -24, -36, -41, -30]); ink(ctx, MULE)
  oval(ctx, 4, 3, 35, 19); ink(ctx, MULE)
  ctx.save(); oval(ctx, 4, 3, 35, 19); ctx.clip(); oval(ctx, 2, 22, 30, 9); ctx.fillStyle = MULE_PALE; ctx.fill(); ctx.restore()
  poly(ctx, [-29, -3, -13, -13, -22, -30, -36, -24]); ctx.fillStyle = MULE; ctx.fill()
  // The near legs.
  for (const x of [-25, 17]) { box(ctx, x, 12, 7.5, 31, 2); ink(ctx, MULE, 1.2); box(ctx, x - 0.5, 38, 8.5, 6, 1.5); ink(ctx, MULE_DARK, 1) }
  // The pack blanket, with its girth.
  line(ctx, 4, 2, 4, 21, MULE_DARK, 2.4)
  box(ctx, -10, -17, 29, 21, 3); ink(ctx, OLIVE, 1.3)
  ctx.fillStyle = OCHRE; ctx.fillRect(-9.3, -11, 27.6, 3.4); ctx.fillRect(-9.3, -4, 27.6, 3.4)
  box(ctx, -10, -17, 29, 21, 3); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke()
  // The mane, a dark strip up the neck.
  line(ctx, -15, -17, -27, -37, MULE_DARK, 4.2)
  // Two long ears, the far one darker.
  poly(ctx, [-27, -37, -23, -62, -19, -40]); ink(ctx, MULE_FAR, 1.2)
  poly(ctx, [-35, -36, -37, -64, -27, -41]); ink(ctx, MULE, 1.3)
  poly(ctx, [-34, -40, -35.5, -56, -30, -43]); ctx.fillStyle = MULE_DARK; ctx.fill()
  // The long head, the pale muzzle, and one half-closed eye that is looking at the map.
  ctx.save(); ctx.translate(-41, -27); ctx.rotate(-0.72)
  box(ctx, -19, -8.5, 30, 17, 8); ink(ctx, MULE)
  ctx.save(); box(ctx, -19, -8.5, 30, 17, 8); ctx.clip(); ctx.fillStyle = MULE_PALE; ctx.fillRect(-20, -9, 11.5, 18); ctx.restore()
  box(ctx, -19, -8.5, 30, 17, 8); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke()
  disc(ctx, -15, -3, 1.2); ctx.fillStyle = MULE_DARK; ctx.fill()
  line(ctx, -17, 4, -11, 4.6, MULE_DARK, 1.1)
  disc(ctx, 1.5, -3, 2.2); ctx.fillStyle = INK; ctx.fill()
  line(ctx, -1.6, -5.4, 4.6, -4.6, INK, 1.6)
  ctx.restore()
}

/** The small sled, empty, from the side: two runners turned up at the front, a slatted bed, a tow rope. */
function sled(ctx: Ctx) {
  ctx.beginPath(); ctx.moveTo(-34, -3); ctx.bezierCurveTo(-52, -30, -30, -70, -4, -92); ctx.strokeStyle = '#8f8266'; ctx.lineWidth = 1.6; ctx.stroke()
  ctx.beginPath(); ctx.moveTo(34, 12); ctx.lineTo(-24, 12); ctx.quadraticCurveTo(-38, 12, -36, -4)
  ctx.strokeStyle = INK; ctx.lineWidth = 5.6; ctx.stroke(); ctx.strokeStyle = BARK; ctx.lineWidth = 3; ctx.stroke()
  for (const x of [-18, 4, 26]) { box(ctx, x - 2, 0, 4, 11); ink(ctx, BARK, 1.1) }
  box(ctx, -28, -5, 62, 6.5, 1.5); ink(ctx, '#c79a62', 1.3)
  for (const x of [-12, 4, 20]) line(ctx, x, -4.5, x, 1, INK, 0.9)
}

// --- The kit, each piece drawn in a frame of design pixels -------------------

/** The fire's dial: a steel ring round the fire with three notches, and a red knob standing in the notch it is set to. */
function dial(ctx: Ctx, setting: number) {
  const ring = () => { ctx.beginPath(); ctx.arc(0, 0, 51, 0, TAU); ctx.moveTo(40, 0); ctx.arc(0, 0, 40, 0, TAU, true) }
  cast(ctx, ring)
  ring(); ink(ctx, STEEL, 1.4, BLACK)
  ctx.beginPath(); ctx.arc(0, 0, 48.4, Math.PI * 0.95, Math.PI * 1.6); ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'; ctx.lineWidth = 1.6; ctx.stroke()
  const notch = [-1.45, -0.86, -0.27]
  notch.forEach((a, i) => {
    ctx.save(); ctx.rotate(a)
    // Each notch is cut a little wider than the last: the fire's three sizes.
    const half = 2.6 + i * 2
    poly(ctx, [52.5, -half - 1.2, 43, -half, 43, half, 52.5, half + 1.2]); ctx.fillStyle = BLACK; ctx.fill()
    ctx.restore()
  })
  ctx.save(); ctx.rotate(notch[setting]); ctx.translate(46, 0)
  cast(ctx, () => disc(ctx, 0, 0, 10.5), 2.5, 3.5)
  disc(ctx, 0, 0, 10.5); ink(ctx, RED, 1.4, BLACK)
  disc(ctx, 0, 0, 5.6); ctx.strokeStyle = WHITE; ctx.lineWidth = 2.4; ctx.stroke()
  ctx.restore()
}

/** A map pin from above: a red ball head, a white band, and the steel needle that goes into the paper. */
function pin(ctx: Ctx) {
  line(ctx, 3, 4, -9, 18, STEEL_DARK, 2.4)
  cast(ctx, () => disc(ctx, 0, 0, 12), 4, 5)
  disc(ctx, 0, 0, 12); ink(ctx, RED, 1.4, BLACK)
  ctx.beginPath(); ctx.arc(0, 0, 7.4, Math.PI * 0.9, Math.PI * 1.75); ctx.strokeStyle = WHITE; ctx.lineWidth = 2.6; ctx.stroke()
}

/** The lantern from above: a black tank, the glass with its guard wires, a steel cap with vents and a red knob, and the wire handle fallen to one side. */
function lantern(ctx: Ctx, lit: boolean) {
  const handle = () => { ctx.beginPath(); ctx.moveTo(-24, 6); ctx.bezierCurveTo(-40, 34, -2, 52, 22, 14) }
  ctx.save(); ctx.translate(3, 4); handle(); ctx.strokeStyle = SHADOW; ctx.lineWidth = 3; ctx.stroke(); ctx.restore()
  cast(ctx, () => disc(ctx, 0, 0, 27), 4, 5)
  handle(); ctx.strokeStyle = BLACK; ctx.lineWidth = 2.6; ctx.stroke()
  disc(ctx, 0, 0, 27); ink(ctx, BLACK, 0)
  disc(ctx, 0, 0, 23); ink(ctx, lit ? '#ffe08a' : '#dfe8e4', 0)
  if (lit) { disc(ctx, 0, 0, 23); ctx.strokeStyle = '#fff6cf'; ctx.lineWidth = 3; ctx.stroke() }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; line(ctx, Math.cos(a) * 12, Math.sin(a) * 12, Math.cos(a) * 24, Math.sin(a) * 24, BLACK, 1.6) }
  disc(ctx, 0, 0, 14); ink(ctx, STEEL, 1.5, BLACK)
  // Vent slots in the cap.
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 9.6, (i / 3) * TAU + 0.5, (i / 3) * TAU + 1.6); ctx.strokeStyle = BLACK; ctx.lineWidth = 2; ctx.stroke() }
  disc(ctx, 0, 0, 4.6); ink(ctx, RED, 1.2, BLACK)
}

/** The snack tin: red with a white band and a steel lid, and two marshmallows that have got out. */
function tin(ctx: Ctx) {
  cast(ctx, () => box(ctx, -19, -14, 38, 28, 5))
  box(ctx, -19, -14, 38, 28, 5); ink(ctx, RED, 1.4, BLACK)
  ctx.fillStyle = WHITE; ctx.fillRect(-18.3, -4.5, 36.6, 9)
  box(ctx, -14, -9.5, 28, 19, 3); ctx.strokeStyle = STEEL_DARK; ctx.lineWidth = 1.5; ctx.stroke()
  box(ctx, -19, -14, 38, 28, 5); ctx.strokeStyle = BLACK; ctx.lineWidth = 1.4; ctx.stroke()
  for (const [x, y] of [[27, 6], [33, -5]]) {
    cast(ctx, () => box(ctx, x - 4.5, y - 4.5, 9, 9, 3), 1.5, 2)
    box(ctx, x - 4.5, y - 4.5, 9, 9, 3); ink(ctx, WHITE, 1.1, BLACK)
  }
}

/** The compass: steel case, white card with tick marks and no letters, a red and white needle. */
function compass(ctx: Ctx) {
  const loop = () => { ctx.beginPath(); ctx.arc(0, -59, 11, 0, TAU); ctx.moveTo(6, -59); ctx.arc(0, -59, 6, 0, TAU, true) }
  cast(ctx, loop); cast(ctx, () => disc(ctx, 0, 0, 50), 4, 5)
  loop(); ink(ctx, STEEL, 1.3, BLACK)
  box(ctx, -9, -54, 18, 8, 2); ink(ctx, STEEL_DARK, 1.2, BLACK)
  disc(ctx, 0, 0, 50); ink(ctx, STEEL, 1.5, BLACK)
  for (let i = 0; i < 60; i++) { const a = (i / 60) * TAU; line(ctx, Math.cos(a) * 45, Math.sin(a) * 45, Math.cos(a) * 49, Math.sin(a) * 49, STEEL_DARK, 1) }
  disc(ctx, 0, 0, 42); ink(ctx, WHITE, 1.3, BLACK)
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * TAU, long = i % 4 === 0
    line(ctx, Math.cos(a) * (long ? 30 : 34), Math.sin(a) * (long ? 30 : 34), Math.cos(a) * 38.5, Math.sin(a) * 38.5, BLACK, long ? 1.8 : 1)
  }
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate((i * TAU) / 4); poly(ctx, [0, -29, 3.4, -22, -3.4, -22]); ctx.fillStyle = BLACK; ctx.fill(); ctx.restore() }
  ctx.save(); ctx.rotate(-0.42)
  cast(ctx, () => poly(ctx, [0, -27, 6.5, 0, 0, 27, -6.5, 0]), 1.5, 2)
  poly(ctx, [0, -27, 6.5, 0, -6.5, 0]); ink(ctx, RED, 1.1, BLACK)
  poly(ctx, [0, 27, 6.5, 0, -6.5, 0]); ink(ctx, WHITE, 1.1, BLACK)
  ctx.restore()
  disc(ctx, 0, 0, 3.6); ink(ctx, STEEL, 1.1, BLACK)
  disc(ctx, 0, 0, 1.2); ink(ctx, BLACK, 0)
}

type Supply = 'logs' | 'oil' | 'water'

/** A supply's pile, on a dark tray so it reads as one thing to take hold of. The pieces in it are plain. */
function pile(ctx: Ctx, kind: Supply) {
  cast(ctx, () => box(ctx, -31, -25, 62, 50, 8))
  box(ctx, -31, -25, 62, 50, 8); ink(ctx, '#33373d', 1.4, BLACK)
  box(ctx, -27.5, -21.5, 55, 43, 5.5); ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'; ctx.lineWidth = 1.2; ctx.stroke()
  if (kind === 'logs') {
    for (const [x, y, turn] of [[0, -15, 0], [0, -5, 0], [0, 5, 0], [0, 15, 0], [-6, -6, 0.5], [7, 6, -0.38]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(turn)
      box(ctx, -23, -4.6, 46, 9.2, 2); ink(ctx, LOG, 1.1, LOG_LINE)
      ctx.restore()
    }
  } else if (kind === 'oil') {
    for (const x of [-18, 0, 18]) {
      box(ctx, x - 2.6, -21, 5.2, 5, 1); ink(ctx, BARK, 1, BLACK)
      ctx.beginPath(); ctx.moveTo(x - 2.6, -16); ctx.lineTo(x + 2.6, -16); ctx.lineTo(x + 2.6, -9); ctx.quadraticCurveTo(x + 7.6, -6, x + 7.6, 0); ctx.lineTo(x + 7.6, 16)
      ctx.quadraticCurveTo(x + 7.6, 20, x + 3.6, 20); ctx.lineTo(x - 3.6, 20); ctx.quadraticCurveTo(x - 7.6, 20, x - 7.6, 16); ctx.lineTo(x - 7.6, 0); ctx.quadraticCurveTo(x - 7.6, -6, x - 2.6, -9); ctx.closePath()
      ink(ctx, OIL, 1.1, OIL_LINE)
    }
  } else {
    for (const x of [-14, 14]) {
      box(ctx, x - 9.5, -21.5, 7, 5, 1); ink(ctx, BLACK, 0)
      poly(ctx, [x - 11.5, -17, x + 5, -17, x + 11.5, -10.5, x + 11.5, 20, x - 11.5, 20]); ink(ctx, WATER, 1.1, WATER_DARK)
      box(ctx, x - 1, -13, 9, 3.4, 1.5); ink(ctx, WATER_DARK, 0)
    }
  }
}

/** An amount card: a short piece of the night ruler, and under it what its user takes in that span. No numeral. */
function card(ctx: Ctx, kind: Supply) {
  cast(ctx, () => box(ctx, -42, -24, 84, 48, 4))
  box(ctx, -42, -24, 84, 48, 4); ink(ctx, WHITE, 1.2, 'rgba(28, 28, 31, 0.6)')
  const spans = kind === 'oil' ? 2 : 1, span = kind === 'oil' ? 30 : 46, left = (-spans * span) / 2
  for (let i = 0; i < spans; i++) { box(ctx, left + i * span, -18, span, 11); ink(ctx, i % 2 ? WHITE : RED, 1.1, BLACK) }
  for (let i = 0; i <= spans; i++) line(ctx, left + i * span, -18, left + i * span, i === 0 || i === spans ? 19 : -4, i === 0 || i === spans ? 'rgba(28, 28, 31, 0.45)' : BLACK, 1)
  for (let i = 0; i < spans; i++) line(ctx, left + (i + 0.5) * span, -18, left + (i + 0.5) * span, -13.5, BLACK, 1)
  if (kind === 'logs') {
    const each = span / 3
    for (let i = 0; i < 3; i++) { box(ctx, left + i * each + 1, 3, each - 2, 10, 1.5); ink(ctx, LOG, 1.1, LOG_LINE) }
  } else if (kind === 'oil') {
    box(ctx, left + 1, 3, spans * span - 2, 10, 2.5); ink(ctx, OIL, 1.1, OIL_LINE)
  } else {
    const each = span / 5
    for (let i = 0; i < 5; i++) { const x = left + i * each; poly(ctx, [x + 1, 2, x + each - 1, 2, x + each - 2.2, 14, x + 2.2, 14]); ink(ctx, WATER, 1, WATER_DARK) }
  }
}

/** A ranging rod: red and white in bands of five units, a black shoe at the pile end and a steel point at the other. Plain. */
function rod(ctx: Ctx, length: number, units: number) {
  const unit = length / units, t = 6
  cast(ctx, () => { ctx.beginPath(); ctx.rect(-9, -t, length + 9, t * 2); ctx.moveTo(length, -t); ctx.lineTo(length + 17, 0); ctx.lineTo(length, t) }, 2.5, 3.5)
  poly(ctx, [length, -t, length + 17, 0, length, t]); ink(ctx, STEEL_DARK, 1.2, BLACK)
  box(ctx, -9, -t, 9, t * 2); ink(ctx, BLACK, 0)
  for (let b = 0; b * 5 < units; b++) {
    const x = b * 5 * unit, wide = Math.min(5, units - b * 5) * unit
    ctx.fillStyle = b % 2 ? WHITE : RED; ctx.fillRect(x, -t, wide, t * 2)
  }
  for (let k = 1; k < units; k++) line(ctx, k * unit, 0.5, k * unit, t, 'rgba(28, 28, 31, 0.55)', 1)
  line(ctx, 1, -t + 1.8, length - 1, -t + 1.8, 'rgba(255, 255, 255, 0.4)', 1.2)
  box(ctx, 0, -t, length, t * 2); ctx.strokeStyle = BLACK; ctx.lineWidth = 1.2; ctx.stroke()
}

/** One log of a row, lying on its rod: a plain tan piece, one unit long. */
function logPiece(ctx: Ctx, unit: number) {
  cast(ctx, () => box(ctx, 1, -30, unit - 2, 22, 3), 2, 2.5)
  box(ctx, 1, -30, unit - 2, 22, 3); ink(ctx, LOG, 1.2, LOG_LINE)
}

/** A poured supply: one continuous band along the rod, with a mark at each flask or can. */
function band(ctx: Ctx, unit: number, count: number, fill: string, edge: string) {
  cast(ctx, () => box(ctx, 0, -30, unit * count, 22, 3.5), 2, 2.5)
  box(ctx, 0, -30, unit * count, 22, 3.5); ink(ctx, fill, 1.2, edge)
  for (let k = 1; k < count; k++) line(ctx, k * unit, -30, k * unit, -8, edge, 1.8)
}

/** The night ruler: a folding rule, one band to the hour, red and white by turns, with a hinge at every second hour. */
function ruler(ctx: Ctx, hour: number, hours: number) {
  const t = 17, length = hour * hours
  cast(ctx, () => box(ctx, -7, -t - 1, length + 7, t * 2 + 2, 2))
  box(ctx, -7, -t - 2, 7, t * 2 + 4, 2); ink(ctx, STEEL_DARK, 1.2, BLACK)
  rulerBands(ctx, hour, hours, 0)
  for (let k = 2; k < hours; k += 2) hinge(ctx, k * hour)
}
function rulerBands(ctx: Ctx, hour: number, hours: number, from: number) {
  const t = 17
  for (let k = 0; k < hours; k++) { ctx.fillStyle = (k + from) % 2 ? WHITE : RED; ctx.fillRect(k * hour, -t, hour, t * 2) }
  // Part marks along the top edge: the half hour long, the quarters short. Dark on white, pale on red.
  for (let k = 0; k < hours; k++) {
    const tone = (k + from) % 2 ? 'rgba(28, 28, 31, 0.8)' : 'rgba(252, 249, 241, 0.9)'
    line(ctx, (k + 0.5) * hour, -t, (k + 0.5) * hour, -t + 12, tone, 1.4)
    for (const part of [0.25, 0.75]) line(ctx, (k + part) * hour, -t, (k + part) * hour, -t + 7, tone, 1.1)
  }
  for (let k = 1; k < hours; k++) line(ctx, k * hour, -t, k * hour, t, BLACK, 1.3)
  line(ctx, 1, t - 2, hour * hours - 1, t - 2, 'rgba(28, 28, 31, 0.14)', 2)
  box(ctx, 0, -t, hour * hours, t * 2); ctx.strokeStyle = BLACK; ctx.lineWidth = 1.3; ctx.stroke()
}
function hinge(ctx: Ctx, x: number) {
  box(ctx, x - 5.5, -17, 11, 34, 1.5); ink(ctx, STEEL, 1.1, BLACK)
  line(ctx, x, -17, x, 17, BLACK, 1.1)
  for (const y of [-9.5, 9.5]) { disc(ctx, x, y, 2.5); ink(ctx, STEEL_DARK, 0.9, BLACK) }
}

/**
 * The spare section of the rule, two hours long, still folded back under the end of the ruler on its hinge, and
 * swung out just far enough to show. The frame's origin is that hinge; the ruler is drawn over it.
 */
function spareSection(ctx: Ctx, hour: number) {
  // Swung out by the same rise whatever the length of an hour, so it never reaches the rod above.
  ctx.rotate(Math.asin(Math.min(0.3, 15 / hour))); ctx.translate(-hour * 2, 0)
  cast(ctx, () => box(ctx, 0, -17, hour * 2, 34, 2))
  rulerBands(ctx, hour, 2, 1)
}
/** The end hinge: a steel knuckle that both leaves turn on. */
function endHinge(ctx: Ctx) {
  cast(ctx, () => box(ctx, -6, -21, 14, 42, 4), 2.5, 3.5)
  box(ctx, -6, -21, 14, 42, 4); ink(ctx, STEEL, 1.2, BLACK)
  disc(ctx, 1, 0, 4.2); ink(ctx, STEEL_DARK, 1, BLACK)
  line(ctx, -1.6, 0, 3.6, 0, BLACK, 1.2)
}

/** What has burned so far, laid under the hours it burned in: plain grey pieces, three logs to the hour, and the oil and water in bands. */
function ash(ctx: Ctx, hour: number, passed: number) {
  const each = hour / 3
  for (let k = 0; (k + 1) * each <= passed * hour + 0.01; k++) { box(ctx, k * each + 1, 25, each - 2, 10, 1.5); ink(ctx, ASH, 1, '#63635f') }
  box(ctx, 0, 38.5, passed * hour, 8, 2); ink(ctx, ASH, 1, '#63635f')
  for (let k = 2; k < passed; k += 2) line(ctx, k * hour, 38.5, k * hour, 46.5, '#63635f', 1.6)
  // A round of cups at every hour, until the cans were empty part of the way through a round.
  const cup = hour / 5
  for (let k = 0; k < Math.min(12, Math.ceil(passed) * 5); k++) { box(ctx, k * cup + 1.5, 50, cup - 3, 8, 1); ink(ctx, ASH, 1, '#63635f') }
}

/** The cursor: a steel slide over the ruler with a window, an index line, a pointer below, and a crescent cut out of its tab. */
function cursor(ctx: Ctx, night: boolean) {
  const plate = () => {
    ctx.beginPath()
    ctx.moveTo(-24, -24); ctx.lineTo(-17, -24); ctx.lineTo(-17, -45); ctx.quadraticCurveTo(-17, -53, -9, -53); ctx.lineTo(9, -53); ctx.quadraticCurveTo(17, -53, 17, -45); ctx.lineTo(17, -24)
    ctx.lineTo(24, -24); ctx.lineTo(24, 24); ctx.lineTo(8, 24); ctx.lineTo(0, 33); ctx.lineTo(-8, 24); ctx.lineTo(-24, 24); ctx.closePath()
    // The window, wound the other way so it stays open.
    ctx.moveTo(-15, -17); ctx.lineTo(-15, 17); ctx.lineTo(15, 17); ctx.lineTo(15, -17); ctx.closePath()
  }
  cast(ctx, plate, 4, 5)
  plate(); ink(ctx, STEEL, 1.5, BLACK)
  line(ctx, -22, -22, -22, 22, 'rgba(255, 255, 255, 0.7)', 1.4)
  box(ctx, -15, -17, 30, 34); ctx.strokeStyle = BLACK; ctx.lineWidth = 1.2; ctx.stroke()
  line(ctx, 0, -17, 0, 17, BLACK, 2)
  for (const y of [-21, 21]) for (const x of [-19.5, 19.5]) { disc(ctx, x, y, 1.5); ctx.fillStyle = STEEL_DARK; ctx.fill() }
  // The crescent: a moon-shaped hole, through which whatever lies under the tab shows.
  ctx.save()
  disc(ctx, 0, -38.5, 10); ctx.clip()
  ctx.beginPath(); ctx.rect(-14, -53, 28, 28); ctx.arc(5, -41, 8.6, 0, TAU, true)
  ctx.fillStyle = night ? '#35406f' : '#3d3a3a'; ctx.fill()
  ctx.restore()
}
