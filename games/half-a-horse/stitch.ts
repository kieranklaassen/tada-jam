// How cloth is drawn: prints, padding and blanket stitches. A piece is painted
// once into a picture of its own and stamped from then on, so a frame pays for
// stamps and not for stitches.

export type Ctx = CanvasRenderingContext2D
type Make = (width: number, height: number) => HTMLCanvasElement
const browser: Make = (width, height) => Object.assign(document.createElement('canvas'), { width, height })
let make: Make = browser
/** A test hands in canvases of its own, and null takes them back. */
export function useCanvases(other: Make | null): void {
  make = other ?? browser
}
export function canvas(width: number, height: number): HTMLCanvasElement {
  return make(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)))
}

export type PrintKind = 'plain' | 'gingham' | 'dots' | 'stripes' | 'scales' | 'flowers' | 'cord' | 'pins'
export type Cloth = { base: string; mark: string; print: PrintKind; edge: string; thread: string }

export const CLOTHS = {
  horse: { base: '#e3ab34', mark: '#c98a1f', print: 'gingham', edge: '#8a5a15', thread: '#fff1c9' },
  hen: { base: '#e9745c', mark: '#ffd9c7', print: 'dots', edge: '#9c3a2c', thread: '#ffe9dc' },
  elephant: { base: '#9478c4', mark: '#7a5db0', print: 'stripes', edge: '#50397e', thread: '#eadfff' },
  croc: { base: '#35a674', mark: '#1f8559', print: 'scales', edge: '#125a3b', thread: '#d8ffe9' },
  goose: { base: '#fbf7ee', mark: '#e9e2d2', print: 'plain', edge: '#a79c86', thread: '#c9bda4' },
  orange: { base: '#f29a2e', mark: '#df8418', print: 'plain', edge: '#a35a0c', thread: '#ffe2b0' },
  bear: { base: '#8b5a3a', mark: '#7a4c2f', print: 'plain', edge: '#4e2f1b', thread: '#d9b08a' },
  pants: { base: '#fffaf0', mark: '#df4f63', print: 'dots', edge: '#a8828a', thread: '#df4f63' },
  straw: { base: '#ecc766', mark: '#d8ab45', print: 'cord', edge: '#94701f', thread: '#fff0bd' },
  skin: { base: '#f3bd9c', mark: '#e8a885', print: 'plain', edge: '#a8684a', thread: '#ffe3d0' },
  shirt: { base: '#f4efe4', mark: '#d8524f', print: 'gingham', edge: '#98433f', thread: '#fff' },
  denim: { base: '#4f76a8', mark: '#41669a', print: 'cord', edge: '#2a456d', thread: '#f0c468' },
  leather: { base: '#7b4a33', mark: '#6a3d29', print: 'plain', edge: '#432517', thread: '#d8a574' },
  cow: { base: '#fffaf0', mark: '#f2e8d8', print: 'plain', edge: '#8c7c6c', thread: '#c6b7a2' },
  patch: { base: '#5b4a44', mark: '#4d3d38', print: 'cord', edge: '#352824', thread: '#a08d84' },
  pink: { base: '#f5a9b4', mark: '#f9c4cb', print: 'gingham', edge: '#b45d6d', thread: '#fff0f2' },
  rose: { base: '#e98a9c', mark: '#f3a9b6', print: 'plain', edge: '#a14c60', thread: '#ffe4e9' },
  grey: { base: '#7c6b62', mark: '#8f7d73', print: 'dots', edge: '#4c3f38', thread: '#e8d8c8' },
  red: { base: '#d6453f', mark: '#e2665f', print: 'plain', edge: '#8d2420', thread: '#ffd5d0' },
  leaf: { base: '#6fae4e', mark: '#8ac267', print: 'flowers', edge: '#3f7228', thread: '#e6ffd2' },
  carrot: { base: '#f0812e', mark: '#e06c1a', print: 'plain', edge: '#a4480c', thread: '#ffdab8' },
  barn: { base: '#cf5f52', mark: '#b84d43', print: 'gingham', edge: '#7d2c26', thread: '#ffe2d8' },
  wood: { base: '#d9b384', mark: '#c59c6a', print: 'stripes', edge: '#8a6439', thread: '#fff1d8' },
  sky: { base: '#bcd9e6', mark: '#f7fcff', print: 'pins', edge: '#7fa6b8', thread: '#fff' },
  hillA: { base: '#a9c385', mark: '#97b373', print: 'gingham', edge: '#6d8a4c', thread: '#f2ffdf' },
  hillB: { base: '#83a86a', mark: '#739859', print: 'gingham', edge: '#567a3e', thread: '#e8ffd2' },
  yard: { base: '#dcbd8f', mark: '#cfae7d', print: 'cord', edge: '#a07e4c', thread: '#fff3da' },
  mud: { base: '#8f6645', mark: '#82593a', print: 'flowers', edge: '#5f3f26', thread: '#d8b490' },
  water: { base: '#8ec6dd', mark: '#b5dfee', print: 'stripes', edge: '#4d8ea8', thread: '#fff' },
  dark: { base: '#4a322b', mark: '#523a32', print: 'gingham', edge: '#2f1e19', thread: '#8c6a5c' },
  hem: { base: '#e7d3ae', mark: '#d9776a', print: 'stripes', edge: '#a88b5d', thread: '#fff' },
  egg: { base: '#fff8e8', mark: '#f3e4c4', print: 'plain', edge: '#b8a37c', thread: '#e0cfa8' },
  bale: { base: '#e6c869', mark: '#d4b04b', print: 'stripes', edge: '#9a7b22', thread: '#fff4c2' },
} satisfies Record<string, Cloth>
export type ClothName = keyof typeof CLOTHS

const prints = new Map<string, HTMLCanvasElement>()
function tile(cloth: Cloth): HTMLCanvasElement {
  const key = cloth.base + cloth.mark + cloth.print
  let made = prints.get(key)
  if (made) return made
  const size = 64
  made = canvas(size, size)
  const c = made.getContext('2d')!
  c.fillStyle = cloth.base
  c.fillRect(0, 0, size, size)
  c.fillStyle = cloth.mark
  switch (cloth.print) {
    case 'gingham':
      c.globalAlpha = 0.5
      for (const at of [0, 32]) { c.fillRect(at, 0, 16, size); c.fillRect(0, at, size, 16) }
      break
    case 'dots':
      for (const [x, y] of [[16, 16], [48, 48]]) { c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill() }
      break
    case 'pins':
      for (const [x, y] of [[16, 16], [48, 48]]) { c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill() }
      break
    case 'stripes':
      for (let x = 0; x < size; x += 16) c.fillRect(x, 0, 6, size)
      break
    case 'cord':
      c.globalAlpha = 0.55
      for (let x = 0; x < size; x += 8) c.fillRect(x, 0, 3.4, size)
      break
    case 'scales':
      c.strokeStyle = cloth.mark
      c.lineWidth = 3.2
      for (let row = -1; row < 5; row++) for (let i = -1; i < 4; i++) { c.beginPath(); c.arc(i * 21.33 + (row % 2 ? 10.66 : 0), row * 16, 10, 0.1, Math.PI - 0.1); c.stroke() }
      break
    case 'flowers':
      for (const [x, y] of [[15, 14], [46, 42]]) { for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x + Math.cos(i * 1.257) * 5, y + Math.sin(i * 1.257) * 5, 3.4, 0, 7); c.fill() } }
      break
    case 'plain':
      break
  }
  // The weave.
  c.globalAlpha = 0.035
  c.fillStyle = '#000'
  for (let i = 0; i < size; i += 4) { c.fillRect(i, 0, 1, size); c.fillRect(0, i, size, 1) }
  c.globalAlpha = 1
  prints.set(key, made)
  return made
}

/** The cloth as a fill. Each context keeps its own patterns. */
export function printOf(ctx: Ctx, name: ClothName): CanvasPattern | string {
  return ctx.createPattern(tile(CLOTHS[name]), 'repeat') ?? CLOTHS[name].base
}

export type Sewn = { pad?: number; stitch?: number; drop?: number; edge?: number }

/** One padded piece of cloth, sewn on with a blanket stitch. */
export function sew(ctx: Ctx, path: Path2D, name: ClothName, how: Sewn = {}): void {
  const cloth = CLOTHS[name], { pad = 20, stitch = 8, drop = 5, edge = 2.6 } = how
  if (drop > 0) {
    ctx.save()
    ctx.translate(drop * 0.5, drop)
    ctx.globalAlpha = 0.16
    ctx.fillStyle = '#3a241a'
    ctx.fill(path)
    ctx.restore()
  }
  ctx.fillStyle = printOf(ctx, name)
  ctx.fill(path)
  ctx.save()
  ctx.clip(path)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'butt'
  ctx.strokeStyle = cloth.edge
  for (const [width, alpha] of [[2.4, 0.09], [1.7, 0.09], [1, 0.1], [0.5, 0.12]]) { ctx.globalAlpha = alpha; ctx.lineWidth = pad * width; ctx.stroke(path) }
  // The light from the upper left lies along the seam's far side as a soft rim.
  ctx.save()
  ctx.translate(pad * 0.35, pad * 0.45)
  ctx.strokeStyle = '#fff'
  ctx.globalAlpha = 0.13
  ctx.lineWidth = pad * 0.5
  ctx.stroke(path)
  ctx.restore()
  if (stitch > 0) {
    ctx.globalAlpha = 0.95
    ctx.strokeStyle = cloth.thread
    ctx.lineWidth = stitch * 2
    ctx.setLineDash([2, Math.max(6, stitch * 1.15)])
    ctx.stroke(path)
    ctx.setLineDash([])
  }
  ctx.restore()
  if (edge > 0) {
    ctx.strokeStyle = cloth.edge
    ctx.lineWidth = edge
    ctx.lineJoin = 'round'
    ctx.stroke(path)
  }
}

/** Running stitches along a path. */
export function run(ctx: Ctx, path: Path2D, colour: string, width = 2.4, dash: [number, number] = [8, 6]): void {
  ctx.strokeStyle = colour
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.setLineDash(dash)
  ctx.stroke(path)
  ctx.setLineDash([])
}

export function path(build: (p: Path2D) => void): Path2D {
  const p = new Path2D()
  build(p)
  return p
}
export const oval = (x: number, y: number, rx: number, ry: number, turn = 0): Path2D => path((p) => p.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2))
/** A closed soft shape through points. */
export function blob(points: readonly (readonly [number, number])[], tight = 1): Path2D {
  return path((p) => {
    const n = points.length
    for (let i = 0; i < n; i++) {
      const a = points[(i + n - 1) % n], b = points[i], c = points[(i + 1) % n], d = points[(i + 2) % n]
      if (i === 0) p.moveTo(b[0], b[1])
      const k = tight / 6
      p.bezierCurveTo(b[0] + (c[0] - a[0]) * k, b[1] + (c[1] - a[1]) * k, c[0] - (d[0] - b[0]) * k, c[1] - (d[1] - b[1]) * k, c[0], c[1])
    }
    p.closePath()
  })
}

/** A four-hole button. */
export function button(ctx: Ctx, x: number, y: number, r: number, colour: string, rim: string): void {
  ctx.fillStyle = 'rgba(50,30,20,.25)'
  ctx.beginPath(); ctx.arc(x + r * 0.1, y + r * 0.16, r, 0, 7); ctx.fill()
  ctx.fillStyle = colour
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill()
  ctx.strokeStyle = rim
  ctx.lineWidth = r * 0.16
  ctx.stroke()
  ctx.globalAlpha = 0.5
  ctx.beginPath(); ctx.arc(x, y, r * 0.66, 0, 7); ctx.stroke()
  ctx.globalAlpha = 1
  ctx.fillStyle = rim
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(x + dx * r * 0.24, y + dy * r * 0.24, r * 0.11, 0, 7); ctx.fill() }
  ctx.fillStyle = 'rgba(255,255,255,.55)'
  ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 0.42, r * 0.16, 0, 7); ctx.fill()
}

export type Picture = { image: HTMLCanvasElement; x: number; y: number; w: number; h: number }

/** Pictures by name, painted at the surface's density the first time each is asked for. */
export class Album {
  private readonly made = new Map<string, Picture>()
  constructor(readonly density: number) {}
  get(key: string, box: readonly [number, number, number, number], paint: (ctx: Ctx) => void): Picture {
    let picture = this.made.get(key)
    if (!picture) {
      const [x, y, w, h] = box
      const image = canvas(w * this.density, h * this.density)
      const ctx = image.getContext('2d')!
      ctx.scale(this.density, this.density)
      ctx.translate(-x, -y)
      paint(ctx)
      picture = { image, x, y, w, h }
      this.made.set(key, picture)
    }
    return picture
  }
}
