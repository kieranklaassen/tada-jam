import { makeRng, type Rng } from './rng'

// Soft pastel on night-blue paper. Nothing here has an outline: a form is a cloud of colour rubbed into dark
// paper, firm in the middle and smudged at its edge, with the paper's tooth showing through. What can be touched
// gets one crisp bright edge on the side the lamp is on, because soft edges alone are weak shapes. Everything is
// painted once into a sprite and stamped; nothing here runs in a frame.

export type RGB = readonly [number, number, number]
export type G = CanvasRenderingContext2D

/** A painted piece: its canvas, and where its top left lies from the point it is placed by, in stage units. */
export type Sprite = { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number }

export const PAPER: RGB = [20, 27, 60]
export const NIGHT: RGB = [16, 22, 64]

export const rgba = (c: RGB, a = 1): string => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const lighten = (c: RGB, t: number): RGB => mix(c, [255, 250, 240], t)
export const darken = (c: RGB, t: number): RGB => mix(c, [30, 26, 70], t)

/**
 * A sprite of `w` by `h` stage units at `res` pixels a unit. `paint` draws in stage units round the origin, which
 * lies `ax`, `ay` from the sprite's top left.
 */
export function sprite(w: number, h: number, ax: number, ay: number, res: number, paint: (g: G) => void): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(w * res))
  canvas.height = Math.max(1, Math.ceil(h * res))
  const g = canvas.getContext('2d')!
  g.setTransform(res, 0, 0, res, ax * res, ay * res)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  paint(g)
  return { canvas, x: -ax, y: -ay, w, h }
}

/** How many pixels a stage unit is in the sprite being painted, for the few things canvas measures in pixels. */
const resOf = (g: G): number => g.getTransform().a

/** A cloud of colour: an ellipse that is full up to `core` of its radius and fades to nothing at its rim. */
export function cloud(g: G, x: number, y: number, rx: number, ry: number, c: RGB, alpha = 1, core = 0.5, rot = 0): void {
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  g.scale(rx, ry)
  const fill = g.createRadialGradient(0, 0, 0, 0, 0, 1)
  fill.addColorStop(0, rgba(c, alpha))
  fill.addColorStop(Math.min(0.98, core), rgba(c, alpha))
  fill.addColorStop(1, rgba(c, 0))
  g.fillStyle = fill
  g.fillRect(-1, -1, 2, 2)
  g.restore()
}

/** Any filled path with a rubbed edge: the fill's own colour bleeds `blur` stage units past it. */
export function soft(g: G, c: RGB, alpha: number, blur: number, path: (g: G) => void): void {
  g.save()
  g.shadowColor = rgba(c, alpha)
  g.shadowBlur = blur * resOf(g)
  g.fillStyle = rgba(c, alpha)
  g.beginPath()
  path(g)
  g.fill()
  g.restore()
}

export function roundRect(g: G, x: number, y: number, w: number, h: number, r: number): void {
  const q = Math.min(r, w / 2, h / 2)
  g.moveTo(x + q, y)
  g.arcTo(x + w, y, x + w, y + h, q)
  g.arcTo(x + w, y + h, x, y + h, q)
  g.arcTo(x, y + h, x, y, q)
  g.arcTo(x, y, x + w, y, q)
  g.closePath()
}

/** A slab with a rubbed edge. */
export function slab(g: G, x: number, y: number, w: number, h: number, r: number, c: RGB, alpha = 1, blur = 5): void {
  soft(g, c, alpha, blur, (p) => roundRect(p, x, y, w, h, r))
}

/**
 * Rubbing marks over what is already painted, and only there: short strokes of a second colour laid all one way,
 * as a stick of pastel dragged on its side leaves them.
 */
export function rub(g: G, rng: Rng, x: number, y: number, rx: number, ry: number, c: RGB, count: number, alpha: number, size = 0.3): void {
  g.save()
  g.globalCompositeOperation = 'source-atop'
  for (let n = 0; n < count; n++) {
    const a = rng.next() * Math.PI * 2, d = Math.sqrt(rng.next())
    const len = Math.min(rx, ry) * size * (0.6 + rng.next())
    cloud(g, x + Math.cos(a) * d * rx, y + Math.sin(a) * d * ry, len * 1.9, len * 0.5, c, alpha * (0.4 + rng.next() * 0.6), 0.2, -0.6)
  }
  g.restore()
}

/**
 * One pastel form: an ellipse of colour, lit from the upper right where the lamp is, shaded at the lower left,
 * and rubbed. `firm` is how much of it is solid before the edge smudges away.
 */
export function form(g: G, rng: Rng, x: number, y: number, rx: number, ry: number, c: RGB, rot = 0, firm = 0.8): void {
  cloud(g, x, y, rx, ry, c, 1, firm, rot)
  g.save()
  g.globalCompositeOperation = 'source-atop'
  cloud(g, x + rx * 0.3, y - ry * 0.34, rx * 0.8, ry * 0.75, lighten(c, 0.42), 0.6, 0.1, rot)
  cloud(g, x - rx * 0.42, y + ry * 0.48, rx * 0.85, ry * 0.7, darken(c, 0.5), 0.5, 0.1, rot)
  g.restore()
  rub(g, rng, x, y, rx, ry, lighten(c, 0.5), 7, 0.22)
  rub(g, rng, x, y, rx, ry, darken(c, 0.4), 5, 0.18)
}

/** The one crisp bright edge of a thing that can be touched: a thin arc along its upper right. */
export function rim(g: G, x: number, y: number, rx: number, ry: number, c: RGB, rot = 0, from = -1.75, to = 0.2, width = 3.2): void {
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  g.beginPath()
  // Inside the rubbed fade, on the firm colour, so the edge sits on the form and not beside it.
  g.ellipse(0, 0, Math.max(1, rx * 0.9 - width), Math.max(1, ry * 0.9 - width), 0, from, to)
  g.strokeStyle = rgba(lighten(c, 0.8), 0.92)
  g.lineWidth = width
  g.stroke()
  g.restore()
}

/** A crisp bright stroke along any path, for the touchable things that are not ellipses. */
export function edge(g: G, c: RGB, width: number, path: (g: G) => void): void {
  g.save()
  g.beginPath()
  path(g)
  g.strokeStyle = rgba(lighten(c, 0.8), 0.92)
  g.lineWidth = width
  g.stroke()
  g.restore()
}

/**
 * The paper's tooth: a tile of specks in the paper's own colour. Laid over a painting it lets the dark paper
 * show through the pastel, most where the pastel is thin.
 */
export function toothTile(res: number, seed: number): HTMLCanvasElement {
  const size = 160
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')!
  const image = g.createImageData(size, size)
  const rng = makeRng(seed)
  // Coarser specks at a higher pixel ratio, so the tooth is the same size on the glass.
  const grain = Math.max(1, Math.round(res))
  for (let y = 0; y < size; y += grain) {
    for (let x = 0; x < size; x += grain) {
      const speck = rng.next() ** 3 * 255
      for (let dy = 0; dy < grain && y + dy < size; dy++) {
        for (let dx = 0; dx < grain && x + dx < size; dx++) {
          const at = ((y + dy) * size + x + dx) * 4
          image.data[at] = PAPER[0]; image.data[at + 1] = PAPER[1]; image.data[at + 2] = PAPER[2]; image.data[at + 3] = speck
        }
      }
    }
  }
  g.putImageData(image, 0, 0)
  return canvas
}

/** Lays the tooth over a sprite: over everything (`atop` false, for the backdrop) or only where it is painted. */
export function tooth(s: Sprite, tile: HTMLCanvasElement, strength: number, atop = true): void {
  const g = s.canvas.getContext('2d')!
  g.save()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = atop ? 'source-atop' : 'source-over'
  g.globalAlpha = strength
  g.fillStyle = g.createPattern(tile, 'repeat')!
  g.fillRect(0, 0, s.canvas.width, s.canvas.height)
  g.restore()
}

/** The same sprite as it looks with the lamp down: its colours sunk toward night blue, its shape unchanged. */
export function dimmed(s: Sprite, amount = 0.56): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = s.canvas.width
  canvas.height = s.canvas.height
  const g = canvas.getContext('2d')!
  g.drawImage(s.canvas, 0, 0)
  g.globalCompositeOperation = 'source-atop'
  g.fillStyle = rgba(NIGHT, amount)
  g.fillRect(0, 0, canvas.width, canvas.height)
  return { ...s, canvas }
}

export { makeRng, type Rng }
