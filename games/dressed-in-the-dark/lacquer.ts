// The look in one pen: flat fills in egg-tempera colours, every edge closed by a fine gold line. By night the
// same shape is nearly the black of the ground and the gold line carries it alone.

export const C = {
  gold: '#e9c063', goldDeep: '#a77b2c', black: '#0c0a10', night: '#12101a', cinnabar: '#8f1c15', ember: '#5d100d',
  ivory: '#f4e8cf', lapis: '#4a7fd6', sky: '#8fb6ea', emerald: '#2f9f68', leaf: '#9fd7a0', rose: '#f29db0', blush: '#f7c6cc', saffron: '#f2ae2e',
  scarlet: '#dd3b2c', turquoise: '#38b6b0', violet: '#8d63c6', silver: '#c9d2dc', steel: '#8894a6', white: '#fdfaf2', ink: '#1a1320', brown: '#6b3f25', cream: '#f9dfa5',
} as const

const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16)
const mixed = new Map<string, string>()
/** `a` on the way to `b`. */
export function mix(a: string, b: string, t: number): string {
  const key = `${a}${b}${Math.round(t * 20)}`
  let out = mixed.get(key)
  if (!out) {
    const u = Math.round(t * 20) / 20
    const part = (at: number) => Math.round(channel(a, at) + (channel(b, at) - channel(a, at)) * u)
    out = `rgb(${part(1)},${part(3)},${part(5)})`
    mixed.set(key, out)
  }
  return out
}

export class Pen {
  ctx: CanvasRenderingContext2D
  /** 0 by lamp or window light, 1 in the dark. */
  dark = 0
  /** Fills and strokes since it was last set to 0. */
  count = 0

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  tone(colour: string): string {
    return this.dark > 0 ? mix(colour, C.night, this.dark * 0.9) : colour
  }

  get line(): string {
    return this.dark > 0 ? mix(C.gold, C.goldDeep, this.dark * 0.45) : C.gold
  }

  /** Fills the path that is open and closes it with the gold line. */
  paint(colour: string, width = 2.2): void {
    const ctx = this.ctx
    ctx.fillStyle = this.tone(colour)
    ctx.fill()
    this.count += 1
    if (width > 0) this.edge(width)
  }

  edge(width = 2.2, colour?: string): void {
    const ctx = this.ctx
    ctx.strokeStyle = colour ?? this.line
    ctx.lineWidth = width
    ctx.stroke()
    this.count += 1
  }

  ell(x: number, y: number, rx: number, ry: number, colour: string, width = 2.2, turn = 0): void {
    this.ctx.beginPath()
    this.ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), turn, 0, Math.PI * 2)
    this.paint(colour, width)
  }

  box(x: number, y: number, w: number, h: number, r: number, colour: string, width = 2.2): void {
    this.ctx.beginPath()
    this.ctx.roundRect(x, y, w, h, r)
    this.paint(colour, width)
  }

  /** A closed shape through points, straight from one to the next. */
  poly(points: readonly number[], colour: string, width = 2.2): void {
    const ctx = this.ctx
    ctx.beginPath()
    for (let i = 0; i < points.length; i += 2) if (i === 0) ctx.moveTo(points[0], points[1]); else ctx.lineTo(points[i], points[i + 1])
    ctx.closePath()
    this.paint(colour, width)
  }

  /** A closed shape that bends through points: each is the pull of a curve between the middles of its sides. */
  blob(points: readonly number[], colour: string, width = 2.2): void {
    const ctx = this.ctx, n = points.length / 2
    const px = (i: number) => points[((i + n) % n) * 2], py = (i: number) => points[((i + n) % n) * 2 + 1]
    ctx.beginPath()
    ctx.moveTo((px(n - 1) + px(0)) / 2, (py(n - 1) + py(0)) / 2)
    for (let i = 0; i < n; i++) ctx.quadraticCurveTo(px(i), py(i), (px(i) + px(i + 1)) / 2, (py(i) + py(i + 1)) / 2)
    ctx.closePath()
    this.paint(colour, width)
  }

  /** A limb: a thick line with a gold edge. */
  limb(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, width: number, colour: string): void {
    const ctx = this.ctx
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(cx, cy, x1, y1)
    this.edge(width + 4, this.line)
    this.edge(width, this.tone(colour))
  }

  /** The limbs of the open path, all in one: the gold first and the skin over it. */
  limbs(width: number, colour: string): void {
    this.ctx.lineCap = 'round'
    this.edge(width + 4, this.line)
    this.edge(width, this.tone(colour))
  }

  /** An open gold line through points, bent as `blob` is. */
  wire(points: readonly number[], width = 2, colour?: string): void {
    const ctx = this.ctx, n = points.length / 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(points[0], points[1])
    for (let i = 1; i < n - 1; i++) {
      const last = i === n - 2
      ctx.quadraticCurveTo(points[i * 2], points[i * 2 + 1], last ? points[i * 2 + 2] : (points[i * 2] + points[i * 2 + 2]) / 2, last ? points[i * 2 + 3] : (points[i * 2 + 1] + points[i * 2 + 3]) / 2)
    }
    if (n === 2) ctx.lineTo(points[2], points[3])
    this.edge(width, colour)
  }
}
