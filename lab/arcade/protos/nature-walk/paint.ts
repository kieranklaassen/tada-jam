// Hand-made paint helpers for Nature Walk: wobbly shapes, soft washes and
// sprites painted once to an offscreen canvas. Nothing here touches the DOM
// until a function is called from inside `create`.

export type G = CanvasRenderingContext2D
export const TAU = Math.PI * 2

// A small seeded generator, so a tree keeps its skeleton from season to season.
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A painting on its own canvas. w and h are logical pixels; (ax, ay) is the
// point inside it that `put` places at the requested position.
export interface Sprite {
  canvas: HTMLCanvasElement
  w: number
  h: number
  ax: number
  ay: number
}

// A browser may only record the strokes and do the real painting when the
// canvas is first used. Using it once here, on a scrap, puts that cost where
// the sprite is made instead of in the first frame that shows it.
let scrap: CanvasRenderingContext2D | null = null

export function makeSprite(w: number, h: number, ax: number, ay: number, res: number, paint: (g: G) => void): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w * res)
  canvas.height = Math.ceil(h * res)
  const g = canvas.getContext('2d')
  if (g) {
    g.scale(res, res)
    g.translate(ax, ay)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    paint(g)
  }
  const sprite = { canvas, w, h, ax, ay }
  settle(sprite)
  return sprite
}

export function settle(s: Sprite): void {
  if (!scrap) {
    const c = document.createElement('canvas')
    c.width = 2
    c.height = 2
    scrap = c.getContext('2d')
  }
  scrap?.drawImage(s.canvas, 0, 0, 2, 2)
}

// Give the memory back when a season is no longer on screen.
export function freeSprite(s: Sprite | undefined): void {
  if (!s) return
  s.canvas.width = 0
  s.canvas.height = 0
}

export function put(g: G, s: Sprite | undefined, x: number, y: number, scale = 1, rot = 0, sx = 1, sy = 1): void {
  if (!s || s.canvas.width === 0) return
  if (rot === 0 && sx === 1 && sy === 1) {
    g.drawImage(s.canvas, x - s.ax * scale, y - s.ay * scale, s.w * scale, s.h * scale)
    return
  }
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  g.scale(scale * sx, scale * sy)
  g.drawImage(s.canvas, -s.ax, -s.ay, s.w, s.h)
  g.restore()
}

const parsed = new Map<string, [number, number, number]>()

function rgb(hex: string): [number, number, number] {
  let v = parsed.get(hex)
  if (!v) {
    const n = parseInt(hex.slice(1), 16)
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    parsed.set(hex, v)
  }
  return v
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  const k = t < 0 ? 0 : t > 1 ? 1 : t
  const n = (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ab + (bb - ab) * k)
  return `#${n.toString(16).padStart(6, '0')}`
}

// A closed curve that is nearly an ellipse and never quite: the edge every
// painted thing here has.
export function blobPath(g: G, cx: number, cy: number, rx: number, ry: number, r: () => number, wob = 0.1, n = 9, rot = 0): void {
  const pts: number[] = []
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    const k = 1 + (r() - 0.5) * 2 * wob
    const px = Math.cos(a) * rx * k
    const py = Math.sin(a) * ry * k
    pts.push(cx + px * c - py * s, cy + px * s + py * c)
  }
  g.beginPath()
  g.moveTo((pts[(n - 1) * 2] + pts[0]) / 2, (pts[(n - 1) * 2 + 1] + pts[1]) / 2)
  for (let i = 0; i < n; i++) {
    const x = pts[i * 2]
    const y = pts[i * 2 + 1]
    const nx = pts[((i + 1) % n) * 2]
    const ny = pts[((i + 1) % n) * 2 + 1]
    g.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2)
  }
  g.closePath()
}

export function fillBlob(g: G, cx: number, cy: number, rx: number, ry: number, color: string, r: () => number, wob = 0.1, n = 9, rot = 0): void {
  blobPath(g, cx, cy, rx, ry, r, wob, n, rot)
  g.fillStyle = color
  g.fill()
}

// A wet-on-wet spot of colour that fades to nothing at its edge.
export function softSpot(g: G, x: number, y: number, radius: number, color: string, alpha: number): void {
  const grad = g.createRadialGradient(x, y, 0, x, y, radius)
  grad.addColorStop(0, rgba(color, alpha))
  grad.addColorStop(0.55, rgba(color, alpha * 0.55))
  grad.addColorStop(1, rgba(color, 0))
  g.fillStyle = grad
  g.fillRect(x - radius, y - radius, radius * 2, radius * 2)
}

// Soft washes cost by the pixel and have no detail to lose, so they are
// painted small and laid on stretched. `paint` works in the same coordinates
// as the picture it is for.
export function washLayer(g: G, x: number, y: number, w: number, h: number, paint: (wg: G) => void, res = 0.4): void {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * res)
  c.height = Math.ceil(h * res)
  const wg = c.getContext('2d')
  if (!wg) return
  wg.scale(res, res)
  wg.translate(-x, -y)
  paint(wg)
  g.drawImage(c, x, y, w, h)
}

// A simple leaf from (0, 0) to (len, 0); `wid` is how far the sides bulge.
export function leafPath(g: G, len: number, wid: number): void {
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(len * 0.4, -wid, len, 0)
  g.quadraticCurveTo(len * 0.4, wid, 0, 0)
  g.closePath()
}

export function fillLeaf(g: G, x: number, y: number, len: number, wid: number, rot: number, color: string): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  leafPath(g, len, wid)
  g.fillStyle = color
  g.fill()
  g.restore()
}

export function dot(g: G, x: number, y: number, r: number, color: string): void {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fillStyle = color
  g.fill()
}

export function oval(g: G, x: number, y: number, rx: number, ry: number, color: string, rot = 0): void {
  g.beginPath()
  g.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU)
  g.fillStyle = color
  g.fill()
}

// An open stroke through points, smoothed. pts is x0, y0, x1, y1, ...
export function strokeLine(g: G, pts: readonly number[], color: string, width: number): void {
  g.beginPath()
  g.moveTo(pts[0], pts[1])
  const n = pts.length / 2
  for (let i = 1; i < n - 1; i++) {
    g.quadraticCurveTo(pts[i * 2], pts[i * 2 + 1], (pts[i * 2] + pts[i * 2 + 2]) / 2, (pts[i * 2 + 1] + pts[i * 2 + 3]) / 2)
  }
  g.lineTo(pts[n * 2 - 2], pts[n * 2 - 1])
  g.strokeStyle = color
  g.lineWidth = width
  g.stroke()
}

// A rectangle whose corners were cut by hand.
export function wobblyRect(g: G, x: number, y: number, w: number, h: number, r: () => number, j = 3): void {
  const q = () => (r() - 0.5) * 2 * j
  g.beginPath()
  g.moveTo(x + q(), y + q())
  g.quadraticCurveTo(x + w / 2, y + q(), x + w + q(), y + q())
  g.quadraticCurveTo(x + w + q(), y + h / 2, x + w + q(), y + h + q())
  g.quadraticCurveTo(x + w / 2, y + h + q(), x + q(), y + h + q())
  g.quadraticCurveTo(x + q(), y + h / 2, x + q(), y + q())
  g.closePath()
}
