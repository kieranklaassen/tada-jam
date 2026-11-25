// The brush. A folk-painted board knows one mark, the loaded stroke: it lands
// round and heavy, is drawn along and lifts to a point, and the second colour
// in the brush shows along one edge. Everything in the house is made of it.
// No outline anywhere. These paint once, into pictures; a frame stamps them.

export type Pen = CanvasRenderingContext2D
export type Make = (w: number, h: number) => HTMLCanvasElement

export const INK = {
  red: '#962d24', green: '#1f4d3c', blue: '#22406b', night: '#2c1a16', cream: '#f7eed8', ochre: '#e2a63c', gold: '#f3cf73', scarlet: '#d4452f',
  rose: '#ec9a8e', sky: '#9cc3d6', leaf: '#6f9c52', mint: '#b9d3a2', brown: '#a9703f', bark: '#6b4028', skin: '#efc29a', blush: '#e2806a', deepred: '#6f1d19', teal: '#5aa39a', pumpkin: '#e8832e',
} as const

const { sin, cos, PI, min, max, sqrt, hypot } = Math
export const TAU = PI * 2

/** The outline of a stroke along a bend, from width `a` where it lands to `b` where it lifts. */
function blade(g: Pen, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, a: number, b: number, left = 1, right = 1): void {
  const L: [number, number][] = [], R: [number, number][] = []
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, k = 1 - t
    const x = k * k * x0 + 2 * k * t * cx + t * t * x1, y = k * k * y0 + 2 * k * t * cy + t * t * y1
    let dx = 2 * k * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * k * (cy - y0) + 2 * t * (y1 - cy)
    const d = hypot(dx, dy) || 1
    dx /= d; dy /= d
    const land = min(1, t * 4.5), w = (a + (b - a) * t) * sqrt(max(0, 1 - (1 - land) ** 2)) * (t > 0.92 ? sqrt(max(0, (1 - t) / 0.08)) * (b > 0.5 ? 1 : 0.8) : 1) * 0.5
    L.push([x - dy * w * left, y + dx * w * left])
    R.push([x + dy * w * right, y - dx * w * right])
  }
  g.beginPath()
  g.moveTo(L[0][0], L[0][1])
  for (const p of L) g.lineTo(p[0], p[1])
  for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1])
  g.closePath()
}

/** One loaded stroke: `a` wide where it lands, `b` where it lifts. */
export function stroke(g: Pen, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, a: number, b: number, color: string, load?: string): void {
  g.fillStyle = color
  blade(g, x0, y0, cx, cy, x1, y1, a, b)
  g.fill()
  if (!load) return
  g.save()
  g.globalAlpha *= 0.62
  g.fillStyle = load
  // The second colour lies along one edge, thin, and is gone before the end.
  const tx = x0 + (x1 - x0) * 0.82, ty = y0 + (y1 - y0) * 0.82
  blade(g, x0, y0, cx * 0.96 + tx * 0.04, cy * 0.96 + ty * 0.04, tx, ty, a * 0.94, b * 0.5, -0.12, 0.92)
  g.fill()
  g.restore()
}

/** A comma: a short stroke that curls. Angle is where it points. */
export function comma(g: Pen, x: number, y: number, len: number, w: number, angle: number, color: string, load?: string, curl = 0.35): void {
  const c = cos(angle), s = sin(angle)
  stroke(g, x, y, x + c * len * 0.5 - s * len * curl, y + s * len * 0.5 + c * len * curl, x + c * len, y + s * len, w, 0, color, load)
}

/** The brush pressed down and lifted: a round dab with its second colour on the upper left. */
export function dab(g: Pen, x: number, y: number, rx: number, ry: number, color: string, load?: string, turn = 0): void {
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  g.fillStyle = color
  g.beginPath()
  g.ellipse(0, 0, rx, ry, 0, 0, TAU)
  g.fill()
  if (load) {
    g.globalAlpha *= 0.6
    g.fillStyle = load
    g.beginPath()
    g.ellipse(0, 0, rx * 0.94, ry * 0.94, 0, PI * 0.72, PI * 1.72)
    g.quadraticCurveTo(-rx * 0.16, -ry * 0.18, rx * 0.94 * cos(PI * 0.72), ry * 0.94 * sin(PI * 0.72))
    g.fill()
  }
  g.restore()
}

export function dots(g: Pen, x0: number, y0: number, x1: number, y1: number, count: number, r: number, color: string): void {
  g.fillStyle = color
  g.beginPath()
  for (let i = 0; i < count; i++) { const t = count > 1 ? i / (count - 1) : 0, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU) }
  g.fill()
}

export function flower(g: Pen, x: number, y: number, r: number, color: string, load: string, heart: string, petals = 6, turn = 0): void {
  for (let i = 0; i < petals; i++) {
    const a = turn + (i / petals) * TAU
    stroke(g, x + cos(a) * r, y + sin(a) * r, x + cos(a + 0.25) * r * 0.6, y + sin(a + 0.25) * r * 0.6, x + cos(a) * r * 0.12, y + sin(a) * r * 0.12, (r * 4.4) / petals, 0, color, load)
  }
  dab(g, x, y, r * 0.24, r * 0.24, heart, INK.gold)
}

/** A tulip on its stem, with two comma leaves. `turn` 0 points up. */
export function tulip(g: Pen, x: number, y: number, s: number, color: string, load: string, leaf: string, turn = 0): void {
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  g.scale(s, s)
  stroke(g, 0, 0, 3, -20, 0, -46, 5, 3, leaf)
  comma(g, 2, -6, 34, 11, -0.75, leaf, INK.mint, -0.3)
  comma(g, -2, -6, 34, 11, PI + 0.75, leaf, INK.mint, 0.3)
  stroke(g, -14, -74, -20, -54, 0, -44, 15, 0, color, load)
  stroke(g, 14, -74, 20, -54, 0, -44, 15, 0, color, load)
  stroke(g, 0, -80, 1, -60, 0, -44, 16, 0, load, color)
  g.restore()
}

export function bird(g: Pen, x: number, y: number, s: number, way: 1 | -1, color: string, load: string, wing: string): void {
  g.save()
  g.translate(x, y)
  g.scale(s * way, s)
  stroke(g, 28, -14, 6, 34, -46, 8, 44, 4, color, load)
  dab(g, 30, -22, 17, 16, color, load)
  for (let i = 0; i < 4; i++) comma(g, -34, 4 + i * 3, 46, 10, PI - 0.5 + i * 0.28, i % 2 ? wing : color, load, 0.25)
  for (let i = 0; i < 3; i++) stroke(g, 16 - i * 4, -2 + i * 8, -4, 12 + i * 7, -32 + i * 4, -6 + i * 10, 13, 0, wing, INK.cream)
  stroke(g, 44, -24, 52, -22, 62, -19, 9, 0, INK.ochre, INK.gold)
  dab(g, 35, -26, 4, 4, INK.night)
  g.restore()
}

/** A border of commas leaning in pairs from dots, along a line. */
export function border(g: Pen, x0: number, y0: number, x1: number, y1: number, size: number, a: string, b: string, dot: string): void {
  const len = hypot(x1 - x0, y1 - y0), n = max(1, Math.round(len / (size * 1.7))), ang = Math.atan2(y1 - y0, x1 - x0)
  g.save()
  g.translate(x0, y0)
  g.rotate(ang)
  const step = len / n
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * step
    comma(g, x, size * 0.28, size * 0.8, size * 0.36, -PI * 0.28, a, undefined, 0.3)
    comma(g, x, size * 0.28, size * 0.8, size * 0.36, -PI * 0.72, b, undefined, -0.3)
    dab(g, x, size * 0.32, size * 0.15, size * 0.15, dot)
  }
  g.restore()
}

/** A leafy spray from a point, with buds. */
export function spray(g: Pen, x: number, y: number, s: number, turn: number, leaf: string, bud: string, load: string): void {
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  g.scale(s, s)
  stroke(g, 0, 0, 40, -22, 96, -10, 7, 2, leaf)
  for (let i = 0; i < 4; i++) { const px = 16 + i * 20, py = -8 - sin(i) * 5; comma(g, px, py, 24, 9, -1.1, leaf, INK.mint, -0.3); comma(g, px, py + 2, 22, 8, 1.0, leaf, INK.mint, 0.3) }
  dab(g, 104, -10, 10, 9, bud, load)
  dab(g, 84, -30, 7, 7, bud, load)
  dab(g, 88, 12, 7, 7, bud, load)
  g.restore()
}

export type Sprite = { image: HTMLCanvasElement; x: number; y: number; w: number; h: number }

/** A picture painted once: the box is in world units, `fine` is pixels to a unit. */
export function cut(make: Make, x: number, y: number, w: number, h: number, fine: number, paint: (g: Pen) => void): Sprite {
  const image = make(Math.ceil(w * fine), Math.ceil(h * fine))
  const g = image.getContext('2d')!
  g.scale(fine, fine)
  g.translate(-x, -y)
  g.lineCap = g.lineJoin = 'round'
  paint(g)
  return { image, x, y, w, h }
}
