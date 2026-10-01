// Small hand-made drawing helpers: wobbly blobs, paper grain, wood grain. Kept
// in this folder because the kit's shapes are all perfect circles and rects.

import { TAU } from '../../kit/math.ts'

export type G = CanvasRenderingContext2D

// A stable 0..1 from a number, for shapes that must wobble the same way every
// frame.
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A closed, slightly irregular oval path: nothing here is drawn with a compass.
export function blobPath(g: G, cx: number, cy: number, rx: number, ry: number, seed = 1, wobble = 0.07, n = 9): void {
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    const r = 1 + (hash(seed * 13.7 + i * 3.1) - 0.5) * 2 * wobble
    xs.push(cx + Math.cos(a) * rx * r)
    ys.push(cy + Math.sin(a) * ry * r)
  }
  g.beginPath()
  g.moveTo((xs[n - 1]! + xs[0]!) / 2, (ys[n - 1]! + ys[0]!) / 2)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    g.quadraticCurveTo(xs[i]!, ys[i]!, (xs[i]! + xs[j]!) / 2, (ys[i]! + ys[j]!) / 2)
  }
  g.closePath()
}

export function blob(g: G, cx: number, cy: number, rx: number, ry: number, fill: string, seed = 1, wobble = 0.07, n = 9): void {
  blobPath(g, cx, cy, rx, ry, seed, wobble, n)
  g.fillStyle = fill
  g.fill()
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, G] {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const c = canvas.getContext('2d')
  if (!c) throw new Error('no 2d context')
  c.lineCap = 'round'
  c.lineJoin = 'round'
  return [canvas, c]
}

// Paper tooth: many faint dark and light specks.
export function grain(g: G, x: number, y: number, w: number, h: number, rand: () => number, count: number, alpha = 0.05): void {
  for (let i = 0; i < count; i++) {
    const px = x + rand() * w
    const py = y + rand() * h
    const s = 1 + rand() * 2.2
    g.fillStyle = rand() < 0.5 ? `rgba(70,45,20,${alpha * (0.4 + rand())})` : `rgba(255,250,235,${alpha * (0.6 + rand())})`
    g.fillRect(px, py, s, s * (0.6 + rand()))
  }
}

// Long wavering strokes along a board.
export function woodGrain(g: G, x: number, y: number, w: number, h: number, rand: () => number, lines: number, color = 'rgba(90,55,25,0.16)'): void {
  g.strokeStyle = color
  g.lineWidth = 1.4
  for (let i = 0; i < lines; i++) {
    const yy = y + ((i + 0.5 + (rand() - 0.5) * 0.6) / lines) * h
    const amp = 1 + rand() * 2.5
    const ph = rand() * 6
    g.beginPath()
    const x0 = x + rand() * w * 0.2
    const x1 = x + w - rand() * w * 0.2
    for (let px = x0; px <= x1; px += 24) {
      const py = yy + Math.sin(px * 0.021 + ph) * amp
      if (px === x0) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.stroke()
  }
}

// A soft-edged stroke that reads as crayon or a wax block: the same line
// three times, a little offset.
export function crayon(g: G, pts: readonly (readonly [number, number])[], color: string, width: number): void {
  g.strokeStyle = color
  g.lineWidth = width
  g.beginPath()
  pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
  g.stroke()
}

// A small pointed leaf, centred, pointing along +x.
export function leaf(g: G, x: number, y: number, len: number, rot: number, fill: string): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.beginPath()
  g.moveTo(-len / 2, 0)
  g.quadraticCurveTo(0, -len * 0.42, len / 2, 0)
  g.quadraticCurveTo(0, len * 0.42, -len / 2, 0)
  g.fillStyle = fill
  g.fill()
  g.restore()
}

// A four-point glint, the only "look here" this prototype uses.
export function glint(g: G, x: number, y: number, r: number, alpha: number): void {
  if (alpha <= 0.01) return
  g.save()
  g.globalAlpha = alpha
  g.fillStyle = '#fffbe8'
  g.beginPath()
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x, y, x + r, y)
  g.quadraticCurveTo(x, y, x, y + r)
  g.quadraticCurveTo(x, y, x - r, y)
  g.quadraticCurveTo(x, y, x, y - r)
  g.fill()
  g.restore()
}
