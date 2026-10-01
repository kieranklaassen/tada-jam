// The cardboard look: kraft paper with fibres in it, corrugated edges showing
// their flutes, torn masking tape, brass paper fasteners, fat marker lines.
// Everything big is painted once into an offscreen layer; the game then only
// stacks layers. Nothing here touches the DOM until it is called from create.

import { rng, tracePoly } from './geom.ts'
import type { Pt } from './geom.ts'

export const W = 1180
export const H = 820
// Where boxes stand, and where loose things lie in front of them.
export const FLOOR = 694
export const FRONT = 750
export const WALL_END = 594

export type RGB = readonly [number, number, number]

export const BASE = {
  cat: [58, 53, 60],
  catDark: [38, 34, 42],
  cream: [241, 229, 205],
  pink: [226, 142, 134],
  eye: [160, 200, 96],
  ted: [238, 224, 197],
  tedDark: [208, 186, 150],
  tedInk: [106, 72, 50],
  scarf: [198, 70, 58],
  mustard: [224, 170, 62],
  mustardD: [188, 132, 40],
  dotRed: [202, 86, 68],
  teal: [70, 134, 138],
  tealD: [48, 100, 108],
  blanket: [182, 70, 60],
  blanketD: [146, 50, 46],
  stitch: [246, 234, 208],
  kraft: [203, 162, 110],
  kraftB: [186, 140, 88],
  kraftL: [219, 190, 143],
  chip: [187, 173, 149],
  coat: [232, 223, 202],
  kraftD: [150, 110, 68],
  raw: [230, 204, 162],
  ink: [66, 44, 30],
  tape: [238, 225, 184],
  tapeD: [200, 182, 132],
  steel: [208, 214, 217],
  steelD: [148, 156, 164],
  handle: [230, 92, 52],
  handleD: [184, 62, 36],
  brad: [226, 182, 78],
  bradD: [146, 106, 38],
  mk0: [46, 42, 46],
  mk1: [216, 66, 52],
  mk2: [42, 112, 184],
  white: [247, 243, 233],
  wire: [52, 78, 58],
  tin: [170, 184, 190],
  tinD: [118, 134, 144],
} as const satisfies Record<string, RGB>

export type PalName = keyof typeof BASE
export type Pal = Record<PalName, string>

export const TONES: readonly PalName[] = ['kraft', 'kraftB', 'kraftL', 'chip', 'coat']
export const MARKERS: readonly PalName[] = ['mk0', 'mk1', 'mk2']
export const BULBS = ['#ffd27a', '#ff8262', '#74d6c8', '#fff0bd', '#ffb14f'] as const

// Lights off is an 80% veil of night blue over everything outside the fort.
const NAVY: RGB = [20, 22, 48]
export const VEIL = 0.8
export const STEPS = 12

const css = (r: number, g: number, b: number): string => `rgb(${Math.round(Math.min(255, Math.max(0, r)))},${Math.round(Math.min(255, Math.max(0, g)))},${Math.round(Math.min(255, Math.max(0, b)))})`

export function mixRgb(a: RGB, b: RGB, t: number): string {
  return css(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)
}

function table(fn: (c: RGB) => string): Pal {
  const out = {} as Pal
  for (const key of Object.keys(BASE) as PalName[]) out[key] = fn(BASE[key])
  return out
}

// One palette per step of darkness: `out` for things in the room, `ins` for
// things inside a box (in shade by day, lit warm by the fort's light at night).
export function makePalettes(): { out: Pal[]; ins: Pal[] } {
  const out: Pal[] = []
  const ins: Pal[] = []
  for (let k = 0; k <= STEPS; k++) {
    const d = k / STEPS
    out.push(table((c) => mixRgb(c, NAVY, VEIL * d)))
    ins.push(
      table((c) => {
        const day: RGB = [c[0] * 0.86, c[1] * 0.83, c[2] * 0.8]
        const lit: RGB = [Math.min(255, c[0] * 1.02 + 16), c[1] * 0.84 + 6, c[2] * 0.56]
        return mixRgb(day, lit, d)
      }),
    )
  }
  return { out, ins }
}

export interface Layer {
  c: HTMLCanvasElement
  g: CanvasRenderingContext2D
  w: number
  h: number
}

export function makeLayer(w: number, h: number, s: number): Layer {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w * s))
  c.height = Math.max(1, Math.ceil(h * s))
  const g = c.getContext('2d')
  if (!g) throw new Error('2D canvas is not available')
  g.scale(s, s)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  return { c, g, w: c.width / s, h: c.height / s }
}

export function wipe(layer: Layer): void {
  const g = layer.g
  g.save()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, layer.c.width, layer.c.height)
  g.restore()
}

export function blit(g: CanvasRenderingContext2D, layer: Layer, x: number, y: number): void {
  g.drawImage(layer.c, x, y, layer.w, layer.h)
}

// ---- small pieces of the look ------------------------------------------------

// Paper fibres and specks on a clear ground, to lay over any colour.
function kraftTile(rand: () => number): HTMLCanvasElement {
  const size = 256
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  if (!g) return c
  const wrap = (fn: (ox: number, oy: number) => void) => {
    fn(0, 0)
    fn(-size, 0)
    fn(0, -size)
    fn(-size, -size)
  }
  for (let i = 0; i < 26; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = 14 + rand() * 30
    g.fillStyle = rand() < 0.5 ? 'rgba(70,40,14,0.016)' : 'rgba(255,238,200,0.02)'
    wrap((ox, oy) => {
      g.beginPath()
      g.ellipse(x + ox + r, y + oy + r, r * 1.5, r * 0.7, rand() * 0.4, 0, Math.PI * 2)
      g.fill()
    })
  }
  for (let i = 0; i < 1100; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = 0.4 + rand() * 0.8
    g.fillStyle = rand() < 0.62 ? `rgba(60,34,12,${0.07 + rand() * 0.16})` : `rgba(255,244,214,${0.1 + rand() * 0.2})`
    g.fillRect(x, y, r * 2, r * 1.4)
  }
  g.lineCap = 'round'
  for (let i = 0; i < 230; i++) {
    const x = rand() * size
    const y = rand() * size
    const len = 4 + rand() * 13
    const a = (rand() - 0.5) * 0.9 + (rand() < 0.2 ? 1.2 : 0)
    g.strokeStyle = rand() < 0.55 ? `rgba(64,36,12,${0.08 + rand() * 0.13})` : `rgba(255,246,220,${0.12 + rand() * 0.18})`
    g.lineWidth = 0.5 + rand() * 0.7
    const bend = (rand() - 0.5) * 4
    wrap((ox, oy) => {
      g.beginPath()
      g.moveTo(x + ox, y + oy)
      g.quadraticCurveTo(x + ox + (Math.cos(a) * len) / 2 + bend, y + oy + (Math.sin(a) * len) / 2 - bend, x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len)
      g.stroke()
    })
  }
  return c
}

// The cut edge of corrugated board: two liners and the wave between them.
export function flute(g: CanvasRenderingContext2D, x: number, y: number, len: number, t: number, vertical: boolean, paper: string, dark: string): void {
  g.save()
  if (vertical) {
    g.translate(x + t, y)
    g.rotate(Math.PI / 2)
  } else g.translate(x, y)
  g.fillStyle = paper
  g.fillRect(0, 0, len, t)
  const period = Math.max(7, t * 1.05)
  const amp = t / 2 - 1.7
  g.beginPath()
  g.moveTo(0, t)
  for (let i = 0; i <= len; i += 1.5) g.lineTo(i, t / 2 - Math.cos((i / period) * Math.PI * 2) * amp)
  g.lineTo(len, t)
  g.closePath()
  g.globalAlpha = 0.34
  g.fillStyle = dark
  g.fill()
  g.globalAlpha = 0.9
  g.beginPath()
  for (let i = 0; i <= len; i += 1.5) {
    const yy = t / 2 - Math.cos((i / period) * Math.PI * 2) * amp
    if (i === 0) g.moveTo(i, yy)
    else g.lineTo(i, yy)
  }
  g.strokeStyle = dark
  g.lineWidth = 1.25
  g.stroke()
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(0, 0.8)
  g.lineTo(len, 0.8)
  g.moveTo(0, t - 0.8)
  g.lineTo(len, t - 0.8)
  g.stroke()
  g.restore()
}

// A strip of masking tape between two points, torn at both ends.
export function tapeStrip(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, fill: string, edge: string, seed: number): void {
  const len = Math.hypot(x2 - x1, y2 - y1)
  if (len < 2) return
  const r = rng(seed)
  g.save()
  g.translate(x1, y1)
  g.rotate(Math.atan2(y2 - y1, x2 - x1))
  const hw = width / 2
  g.beginPath()
  const teeth = 5
  for (let k = 0; k <= teeth; k++) {
    const x = (k % 2 ? 3.6 : 0) + r() * 1.6 - 5
    const y = -hw + (k / teeth) * width
    if (k === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  for (let k = teeth; k >= 0; k--) g.lineTo(len + 5 - (k % 2 ? 3.6 : 0) - r() * 1.6, -hw + (k / teeth) * width)
  g.closePath()
  g.fillStyle = fill
  g.globalAlpha = 0.93
  g.fill()
  g.globalAlpha = 0.35
  g.strokeStyle = edge
  g.lineWidth = 1.2
  g.stroke()
  // The crepe of masking tape: fine cross lines.
  g.globalAlpha = 0.16
  g.beginPath()
  for (let x = 3; x < len - 2; x += 4.5) {
    g.moveTo(x, -hw + 1.5)
    g.lineTo(x + 0.6, hw - 1.5)
  }
  g.stroke()
  g.globalAlpha = 1
  g.restore()
}

export function brad(g: CanvasRenderingContext2D, x: number, y: number, pal: Pal, r = 3.4): void {
  g.fillStyle = pal.bradD
  g.beginPath()
  g.arc(x + 0.6, y + 0.9, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = pal.brad
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = pal.bradD
  g.lineWidth = 0.9
  g.beginPath()
  g.moveTo(x - r * 0.55, y)
  g.lineTo(x + r * 0.55, y)
  g.stroke()
}

// A marker line that is not quite straight.
function scrawl(g: CanvasRenderingContext2D, pts: readonly number[], color: string, width: number, r: () => number, wob = 1.6): void {
  g.strokeStyle = color
  g.lineWidth = width
  g.beginPath()
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i] + (r() - 0.5) * wob * 2
    const y = pts[i + 1] + (r() - 0.5) * wob * 2
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.stroke()
}

function facePath(g: CanvasRenderingContext2D, w: number, h: number, seed: number): void {
  const r = rng(seed)
  const j = (a: number) => (r() - 0.5) * 2 * a
  const tl: Pt = [j(1.8), j(1.8)]
  const tr: Pt = [w + j(1.8), j(1.8)]
  const br: Pt = [w + j(1), h]
  const bl: Pt = [j(1), h]
  g.beginPath()
  g.moveTo(tl[0], tl[1])
  g.quadraticCurveTo(w / 2 + j(10), j(2.2), tr[0], tr[1])
  g.quadraticCurveTo(w + j(2.2), h / 2 + j(10), br[0], br[1])
  g.lineTo(bl[0], bl[1])
  g.quadraticCurveTo(j(2.2), h / 2 + j(10), tl[0], tl[1])
  g.closePath()
}

// ---- stamps on the boxes ------------------------------------------------------

function stampArrows(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  g.lineWidth = 3.2 * s
  for (const dx of [-11, 11]) {
    g.beginPath()
    g.moveTo(x + dx * s, y + 13 * s)
    g.lineTo(x + dx * s, y - 12 * s)
    g.moveTo(x + (dx - 7) * s, y - 4 * s)
    g.lineTo(x + dx * s, y - 13 * s)
    g.lineTo(x + (dx + 7) * s, y - 4 * s)
    g.stroke()
  }
  g.beginPath()
  g.moveTo(x - 21 * s, y + 19 * s)
  g.lineTo(x + 21 * s, y + 19 * s)
  g.stroke()
}

function stampGlass(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  g.lineWidth = 3 * s
  g.beginPath()
  g.moveTo(x - 10 * s, y - 16 * s)
  g.lineTo(x + 10 * s, y - 16 * s)
  g.quadraticCurveTo(x + 9 * s, y + 1 * s, x, y + 2 * s)
  g.quadraticCurveTo(x - 9 * s, y + 1 * s, x - 10 * s, y - 16 * s)
  g.moveTo(x, y + 2 * s)
  g.lineTo(x, y + 15 * s)
  g.moveTo(x - 8 * s, y + 16 * s)
  g.lineTo(x + 8 * s, y + 16 * s)
  g.moveTo(x + 2 * s, y - 14 * s)
  g.lineTo(x - 2 * s, y - 8 * s)
  g.lineTo(x + 3 * s, y - 5 * s)
  g.stroke()
}

function stampUmbrella(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  g.lineWidth = 3 * s
  g.beginPath()
  g.arc(x, y - 2 * s, 15 * s, Math.PI, 0)
  g.closePath()
  g.moveTo(x, y - 2 * s)
  g.lineTo(x, y + 13 * s)
  g.quadraticCurveTo(x, y + 18 * s, x - 5 * s, y + 17 * s)
  g.stroke()
  for (const dx of [-12, -3, 8]) {
    g.beginPath()
    g.moveTo(x + dx * s, y - 26 * s)
    g.lineTo(x + (dx - 2) * s, y - 21 * s)
    g.stroke()
  }
}

// ---- tools -------------------------------------------------------------------

// Child's scissors, pivot at the origin, blades toward +x. `open` 0..1.
export function drawScissors(g: CanvasRenderingContext2D, pal: Pal, open: number): void {
  const a = 0.08 + open * 0.34
  for (const side of [1, -1]) {
    g.save()
    g.rotate(side * a)
    // Blade.
    g.beginPath()
    g.moveTo(-6, -side * 1)
    g.lineTo(46, side * 1.5)
    g.lineTo(40, side * 7)
    g.lineTo(-6, side * 8)
    g.closePath()
    g.fillStyle = side > 0 ? pal.steel : pal.steelD
    g.fill()
    g.strokeStyle = pal.steelD
    g.lineWidth = 1
    g.stroke()
    // Handle loop on the far side of the pivot.
    g.beginPath()
    g.ellipse(-34, side * 13, 21, 13.5, side * 0.32, 0, Math.PI * 2)
    g.ellipse(-34, side * 13, 11.5, 6.2, side * 0.32, 0, Math.PI * 2)
    g.fillStyle = side > 0 ? pal.handle : pal.handleD
    g.fill('evenodd')
    g.beginPath()
    g.moveTo(-4, side * 1)
    g.lineTo(-18, side * 5)
    g.lineTo(-16, side * 12)
    g.lineTo(-2, side * 8)
    g.closePath()
    g.fill()
    g.restore()
  }
  brad(g, 0, 0, pal, 4)
}

// A roll of masking tape seen flat on, with its torn tab. `left` 0..1.
export function drawTapeRoll(g: CanvasRenderingContext2D, pal: Pal, left: number): void {
  const outer = 19 + left * 19
  g.fillStyle = pal.tapeD
  g.beginPath()
  g.arc(1.5, 2.5, outer, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = pal.tape
  g.beginPath()
  g.arc(0, 0, outer, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = pal.tapeD
  g.lineWidth = 1
  for (let r = 21; r < outer - 2; r += 4) {
    g.beginPath()
    g.arc(0, 0, r, 0.4 + r, 4.6 + r)
    g.stroke()
  }
  // The cardboard core, flutes showing.
  g.fillStyle = pal.kraftB
  g.beginPath()
  g.arc(0, 0, 18, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = pal.kraftD
  g.beginPath()
  g.arc(0, 0, 12.5, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = pal.kraftD
  g.lineWidth = 1.1
  g.setLineDash([2.2, 2.6])
  g.beginPath()
  g.arc(0, 0, 15.3, 0, Math.PI * 2)
  g.stroke()
  g.setLineDash([])
  if (left > 0.02) {
    // The loose end, torn.
    g.fillStyle = pal.tape
    g.beginPath()
    g.moveTo(outer * 0.72, -outer * 0.7)
    g.lineTo(outer + 15, -outer * 0.92)
    g.lineTo(outer + 11, -outer * 0.72)
    g.lineTo(outer + 16, -outer * 0.56)
    g.lineTo(outer + 12, -outer * 0.42)
    g.lineTo(outer * 0.9, -outer * 0.38)
    g.closePath()
    g.fill()
    g.strokeStyle = pal.tapeD
    g.setLineDash([])
    g.stroke()
  }
}

// A fat marker, nib at the origin, body running up from it. Capped, it
// stands in the tin with its coloured end showing.
export function drawMarker(g: CanvasRenderingContext2D, pal: Pal, color: PalName, capped: boolean): void {
  const c = pal[color]
  // Body.
  g.fillStyle = pal.white
  g.beginPath()
  g.roundRect(-13, -92, 26, 78, 7)
  g.fill()
  g.fillStyle = c
  g.beginPath()
  g.roundRect(-13, -92, 26, 26, [7, 7, 0, 0])
  g.fill()
  g.fillRect(-13, -40, 26, 9)
  g.strokeStyle = pal.ink
  g.globalAlpha = 0.35
  g.lineWidth = 1.2
  g.beginPath()
  g.roundRect(-13, -92, 26, 78, 7)
  g.stroke()
  g.globalAlpha = 1
  if (capped) {
    g.fillStyle = c
    g.beginPath()
    g.roundRect(-14.5, -26, 29, 30, [3, 3, 8, 8])
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.22)'
    g.fillRect(-10, -22, 4, 21)
  } else {
    // Collar and felt nib.
    g.fillStyle = pal.steelD
    g.fillRect(-9, -16, 18, 7)
    g.fillStyle = c
    g.beginPath()
    g.moveTo(-6.5, -10)
    g.lineTo(6.5, -10)
    g.lineTo(4, 0)
    g.lineTo(-3, 1)
    g.closePath()
    g.fill()
  }
}

// The tin the markers stand in (a washed bean tin with its ridges).
export function drawPot(g: CanvasRenderingContext2D, pal: Pal): void {
  g.fillStyle = pal.tinD
  g.beginPath()
  g.roundRect(-62, -52, 124, 54, [3, 3, 9, 9])
  g.fill()
  g.fillStyle = pal.tin
  g.beginPath()
  g.roundRect(-62, -54, 124, 52, [3, 3, 9, 9])
  g.fill()
  g.strokeStyle = pal.tinD
  g.lineWidth = 1.6
  for (const y of [-42, -32, -22, -12]) {
    g.beginPath()
    g.moveTo(-60, y)
    g.lineTo(60, y)
    g.stroke()
  }
  g.fillStyle = 'rgba(255,255,255,0.3)'
  g.fillRect(-50, -52, 9, 48)
  g.fillStyle = pal.tinD
  g.fillRect(-64, -57, 128, 5)
}

// ---- the big layers ----------------------------------------------------------

export interface FaceLook {
  w: number
  h: number
  tone: number
  seed: number
  holes: readonly { poly: Pt[]; glow: HTMLCanvasElement; b: { minX: number; minY: number } }[]
  day: Layer
  night: Layer
  ink: Layer
}

export const FACE_PAD = 12
export const GLOW_PAD = 28

export interface Art {
  s: number
  bgDay: Layer
  bgNight: Layer
  curtain: Layer
  bulbGlow: HTMLCanvasElement[]
  warmGlow: HTMLCanvasElement
  // The day side at once; the night side (with its glow) can follow a frame later.
  renderDay(box: FaceLook): void
  renderNight(box: FaceLook): void
  // A soft warm copy of an outline, for the light that leaves it.
  glowOf(poly: readonly Pt[], pad: number, color?: string): HTMLCanvasElement
  // Marker ink onto a box, in the box's own coordinates.
  inkLine(box: FaceLook, x1: number, y1: number, x2: number, y2: number, color: string, width: number): void
  dispose(): void
}

export const WINDOW = { x: 236, y: 64, w: 238, h: 226 }
export const SHELF = { x: 18, y: 196, w: 154, h: FLOOR - 196 }
export const SWITCH = { x: 1034, y: 236 }
export const NAIL = { x: 1108, y: 372 }
export const LAMP = { x: 906, y: 96 }

export function createArt(s: number, seed: number): Art {
  const rand = rng(seed * 31 + 7)
  const tile = kraftTile(rand)
  const made: HTMLCanvasElement[] = [tile]

  const layer = (w: number, h: number, scale = s): Layer => {
    const l = makeLayer(w, h, scale)
    made.push(l.c)
    return l
  }

  const paper = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number) => {
    const pattern = g.createPattern(tile, 'repeat')
    if (!pattern) return
    g.save()
    g.globalAlpha = alpha
    g.fillStyle = pattern
    g.fillRect(x, y, w, h)
    g.restore()
  }

  // ---- the room --------------------------------------------------------------

  const paintRoom = (g: CanvasRenderingContext2D) => {
    const r = rng(seed * 13 + 3)
    // Wall: poster paint brushed over a sheet of card.
    g.fillStyle = '#a8bcbc'
    g.fillRect(0, 0, W, WALL_END + 10)
    for (let i = 0; i < 90; i++) {
      const y = r() * WALL_END
      const x = r() * W - 200
      const len = 220 + r() * 620
      g.strokeStyle = r() < 0.5 ? `rgba(196,212,210,${0.12 + r() * 0.22})` : `rgba(132,156,160,${0.1 + r() * 0.18})`
      g.lineWidth = 5 + r() * 20
      g.lineCap = 'butt'
      g.beginPath()
      g.moveTo(x, y)
      g.quadraticCurveTo(x + len / 2, y + (r() - 0.5) * 14, x + len, y + (r() - 0.5) * 8)
      g.stroke()
    }
    g.lineCap = 'round'
    // Where the brush ran dry the card shows through.
    for (let i = 0; i < 16; i++) {
      const x = r() * W
      const y = r() < 0.5 ? r() * 46 : WALL_END - r() * 40
      g.strokeStyle = `rgba(200,164,116,${0.2 + r() * 0.25})`
      g.lineWidth = 2 + r() * 5
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + 40 + r() * 120, y + (r() - 0.5) * 5)
      g.stroke()
    }
    paper(g, 0, 0, W, WALL_END + 10, 0.5)
    // The diorama's own top edge.
    flute(g, 0, 0, W, 11, false, '#d7b888', '#7c5a36')
    g.fillStyle = 'rgba(40,30,20,0.16)'
    g.fillRect(0, 11, W, 5)

    paintWindow(g, r)
    paintPicture(g, r)

    // Marker "wiring" from the switch up and along to the lamp.
    g.setLineDash([11, 8])
    scrawl(g, [SWITCH.x, SWITCH.y - 62, SWITCH.x + 2, 150, SWITCH.x - 1, 80, SWITCH.x, 34, 980, 31, LAMP.x + 4, 32], 'rgba(70,60,62,0.55)', 2.6, r, 1.2)
    g.setLineDash([])

    // Switch plate: white card held by two paper fasteners.
    g.fillStyle = 'rgba(30,24,20,0.2)'
    g.beginPath()
    g.roundRect(SWITCH.x - 43, SWITCH.y - 58, 92, 124, 12)
    g.fill()
    g.fillStyle = '#f2ecde'
    g.beginPath()
    g.roundRect(SWITCH.x - 46, SWITCH.y - 62, 92, 124, 12)
    g.fill()
    paper(g, SWITCH.x - 46, SWITCH.y - 62, 92, 124, 0.35)
    g.strokeStyle = 'rgba(90,70,56,0.5)'
    g.lineWidth = 1.6
    g.beginPath()
    g.roundRect(SWITCH.x - 46, SWITCH.y - 62, 92, 124, 12)
    g.stroke()
    g.fillStyle = 'rgba(70,52,40,0.2)'
    g.beginPath()
    g.roundRect(SWITCH.x - 22, SWITCH.y - 36, 44, 72, 8)
    g.fill()

    // The nail the fairy lights hang on.
    g.fillStyle = 'rgba(30,24,20,0.25)'
    g.beginPath()
    g.ellipse(NAIL.x + 3, NAIL.y + 6, 6, 3, 0.6, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#8d9499'
    g.beginPath()
    g.arc(NAIL.x, NAIL.y, 5, 0, Math.PI * 2)
    g.fill()

    // Skirting: a strip of corrugated card on edge.
    g.fillStyle = 'rgba(40,28,18,0.22)'
    g.fillRect(0, WALL_END + 22, W, 8)
    flute(g, 0, WALL_END, W, 24, false, '#dcc093', '#8a6840')

    // Floor: grey board with plank lines ruled in marker.
    const top = WALL_END + 24
    const fg = g.createLinearGradient(0, top, 0, H)
    fg.addColorStop(0, '#94775a')
    fg.addColorStop(1, '#7c6048')
    g.fillStyle = fg
    g.fillRect(0, top, W, H - top)
    paper(g, 0, top, W, H - top, 0.75)
    const planks = [top + 30, top + 72, top + 126, top + 190]
    for (const y of planks) scrawl(g, [0, y, 300, y + 1, 620, y - 1, 900, y + 1, W, y], 'rgba(64,44,30,0.4)', 2.2, r, 1)
    for (let row = 0; row < 5; row++) {
      const y0 = row === 0 ? top : planks[row - 1]
      const y1 = row === 4 ? H : planks[row]
      for (let x = 60 + ((row * 173) % 240); x < W; x += 300 + r() * 80) scrawl(g, [x, y0, x + (r() - 0.5) * 3, y1], 'rgba(64,44,30,0.33)', 2, r, 0.6)
    }

    paintRug(g, r)
    paintShelf(g, r)

    // The inside corners of the big box the room is made in.
    const side = g.createLinearGradient(0, 0, 26, 0)
    side.addColorStop(0, 'rgba(46,30,18,0.4)')
    side.addColorStop(1, 'rgba(46,30,18,0)')
    g.fillStyle = side
    g.fillRect(0, 0, 26, H)
    g.save()
    g.translate(W, 0)
    g.scale(-1, 1)
    g.fillStyle = side
    g.fillRect(0, 0, 26, H)
    g.restore()
  }

  const paintWindow = (g: CanvasRenderingContext2D, r: () => number) => {
    const { x, y, w, h } = WINDOW
    // The rainy afternoon outside: torn grey paper.
    const sky = g.createLinearGradient(0, y, 0, y + h)
    sky.addColorStop(0, '#aebcc6')
    sky.addColorStop(1, '#d3dbdc')
    g.fillStyle = sky
    g.fillRect(x, y, w, h)
    g.save()
    g.beginPath()
    g.rect(x, y, w, h)
    g.clip()
    const cloud = (cx: number, cy: number, rx: number, ry: number, fill: string) => {
      // Torn paper: the same ragged shape twice, the under one a shade darker.
      for (const [dy, col] of [
        [5, 'rgba(120,134,146,0.5)'],
        [0, fill],
      ] as const) {
        g.fillStyle = col
        g.beginPath()
        const rr = rng(Math.round(cx * 7 + cy))
        for (let i = 0; i <= 16; i++) {
          const a = (i / 16) * Math.PI * 2
          const q = 0.8 + rr() * 0.32
          const px = cx + Math.cos(a) * rx * q
          const py = cy + Math.sin(a) * ry * q + dy
          if (i === 0) g.moveTo(px, py)
          else g.lineTo(px, py)
        }
        g.closePath()
        g.fill()
      }
    }
    cloud(x + 64, y + 50, 84, 28, '#eef0ec')
    cloud(x + 196, y + 84, 72, 24, '#e6eae8')
    cloud(x + 130, y + 16, 66, 18, '#f3f4f0')
    // Roofs and a tree across the road, cut from blue-grey paper.
    g.fillStyle = '#8697a4'
    g.beginPath()
    g.moveTo(x - 4, y + h)
    g.lineTo(x - 4, y + 168)
    g.lineTo(x + 44, y + 128)
    g.lineTo(x + 92, y + 166)
    g.lineTo(x + 92, y + 150)
    g.lineTo(x + 108, y + 150)
    g.lineTo(x + 108, y + 178)
    g.lineTo(x + 150, y + 146)
    g.lineTo(x + 196, y + 180)
    g.lineTo(x + w + 4, y + 176)
    g.lineTo(x + w + 4, y + h)
    g.closePath()
    g.fill()
    g.fillStyle = '#f0d98a'
    g.fillRect(x + 32, y + 176, 16, 18)
    g.fillRect(x + 140, y + 186, 16, 16)
    g.fillStyle = '#6f8a7c'
    g.beginPath()
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const q = 0.8 + r() * 0.35
      const px = x + 206 + Math.cos(a) * 36 * q
      const py = y + 168 + Math.sin(a) * 44 * q
      if (i === 0) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.closePath()
    g.fill()
    paper(g, x, y, w, h, 0.4)
    // Acetate sheen.
    g.fillStyle = 'rgba(255,255,255,0.16)'
    g.beginPath()
    g.moveTo(x + 20, y + h)
    g.lineTo(x + 96, y)
    g.lineTo(x + 126, y)
    g.lineTo(x + 50, y + h)
    g.closePath()
    g.fill()
    g.restore()
    // Inner shadow of the hole in the wall.
    g.fillStyle = 'rgba(30,34,44,0.22)'
    g.fillRect(x, y, w, 9)
    g.fillRect(x, y, 8, h)
    // Frame: strips of corrugated card.
    const t = 15
    flute(g, x - t, y - t, w + t * 2, t, false, '#e3c99e', '#8a6840')
    flute(g, x - t, y + h, w + t * 2, t, false, '#e3c99e', '#8a6840')
    flute(g, x - t, y, h, t, true, '#dcc093', '#8a6840')
    flute(g, x + w, y, h, t, true, '#dcc093', '#8a6840')
    flute(g, x + w / 2 - 5, y, h, 10, true, '#e3c99e', '#8a6840')
    flute(g, x, y + h * 0.46, w, 10, false, '#e3c99e', '#8a6840')
    // Sill.
    g.fillStyle = 'rgba(30,24,20,0.22)'
    g.fillRect(x - 24, y + h + t + 12, w + 54, 7)
    g.fillStyle = '#d2b07c'
    g.fillRect(x - 28, y + h + t - 2, w + 56, 16)
    paper(g, x - 28, y + h + t - 2, w + 56, 16, 0.6)
    g.strokeStyle = 'rgba(90,62,36,0.55)'
    g.lineWidth = 1.5
    g.strokeRect(x - 28, y + h + t - 2, w + 56, 16)
    // Held to the wall with tape at the corners.
    tapeStrip(g, x - 34, y + 4, x + 6, y - 30, 22, '#efe2ba', '#b8a070', 11)
    tapeStrip(g, x + w - 8, y - 30, x + w + 32, y + 6, 22, '#efe2ba', '#b8a070', 12)
  }

  // A child's drawing, taped up.
  const paintPicture = (g: CanvasRenderingContext2D, r: () => number) => {
    g.save()
    g.translate(650, 118)
    g.rotate(-0.05)
    g.fillStyle = 'rgba(30,24,20,0.2)'
    g.fillRect(-56, -40, 118, 88)
    g.fillStyle = '#f6f1e4'
    g.fillRect(-60, -44, 118, 88)
    paper(g, -60, -44, 118, 88, 0.3)
    scrawl(g, [-36, 30, -36, -2, -14, -22, 8, -2, 8, 30, -36, 30], '#c8483a', 4, r, 1.4)
    scrawl(g, [-20, 30, -20, 12, -8, 12, -8, 30], '#2f6fb4', 3.4, r, 1)
    g.strokeStyle = '#e0a020'
    g.lineWidth = 4
    g.beginPath()
    g.arc(34, -20, 9, 0, Math.PI * 2)
    g.stroke()
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      scrawl(g, [34 + Math.cos(a) * 14, -20 + Math.sin(a) * 14, 34 + Math.cos(a) * 20, -20 + Math.sin(a) * 20], '#e0a020', 3, r, 0.6)
    }
    scrawl(g, [-52, 34, -30, 36, 0, 33, 30, 36, 52, 34], '#3d8c50', 4, r, 1.6)
    tapeStrip(g, -70, -40, -40, -50, 18, '#efe2ba', '#b8a070', 21)
    tapeStrip(g, 40, -50, 68, -38, 18, '#efe2ba', '#b8a070', 22)
    g.restore()
  }

  // A rug cut from teal corrugated craft card, ribs up.
  const paintRug = (g: CanvasRenderingContext2D, r: () => number) => {
    const x = 204
    const y = 668
    const w = 780
    const h = 124
    g.fillStyle = 'rgba(30,20,12,0.25)'
    g.beginPath()
    g.roundRect(x + 3, y + 6, w, h, 22)
    g.fill()
    // Fringe: snipped paper at both ends.
    g.strokeStyle = '#ead9b4'
    g.lineWidth = 3.2
    for (let yy = y + 14; yy < y + h - 10; yy += 7.5) {
      g.beginPath()
      g.moveTo(x + 4, yy)
      g.lineTo(x - 12 - r() * 6, yy + (r() - 0.5) * 5)
      g.moveTo(x + w - 4, yy)
      g.lineTo(x + w + 12 + r() * 6, yy + (r() - 0.5) * 5)
      g.stroke()
    }
    g.save()
    g.beginPath()
    g.roundRect(x, y, w, h, 22)
    g.clip()
    g.fillStyle = '#3f7d82'
    g.fillRect(x, y, w, h)
    for (let xx = x + 3; xx < x + w; xx += 8.5) {
      g.fillStyle = 'rgba(20,56,62,0.3)'
      g.fillRect(xx, y, 3.2, h)
      g.fillStyle = 'rgba(190,232,226,0.13)'
      g.fillRect(xx + 4.4, y, 1.8, h)
    }
    paper(g, x, y, w, h, 0.45)
    g.restore()
    g.setLineDash([13, 9])
    g.strokeStyle = 'rgba(240,226,190,0.8)'
    g.lineWidth = 3.4
    g.beginPath()
    g.roundRect(x + 18, y + 14, w - 36, h - 28, 12)
    g.stroke()
    g.setLineDash([])
  }

  // The tool shelf: a box on its end with two card shelves pushed in.
  const paintShelf = (g: CanvasRenderingContext2D, r: () => number) => {
    const { x, y, w, h } = SHELF
    g.fillStyle = 'rgba(30,22,14,0.25)'
    g.fillRect(x + 8, y + 10, w + 2, h - 6)
    g.fillStyle = '#6c4c30'
    g.fillRect(x, y, w, h)
    const inner = g.createLinearGradient(x, 0, x + w, 0)
    inner.addColorStop(0, 'rgba(30,18,8,0.45)')
    inner.addColorStop(0.3, 'rgba(30,18,8,0.05)')
    inner.addColorStop(1, 'rgba(30,18,8,0.3)')
    g.fillStyle = inner
    g.fillRect(x, y, w, h)
    paper(g, x, y, w, h, 0.7)
    const t = 11
    const cell = (h - t) / 3
    // Each tool's outline ruled in chalk, so it has a place to go back to.
    g.strokeStyle = 'rgba(246,236,214,0.42)'
    g.lineWidth = 2.6
    g.setLineDash([7, 7])
    const cx = x + w / 2
    g.beginPath()
    g.ellipse(cx - 22, y + cell * 0.5 - 4, 24, 15, 0.5, 0, Math.PI * 2)
    g.ellipse(cx - 22, y + cell * 0.5 + 30, 24, 15, -0.5, 0, Math.PI * 2)
    g.moveTo(cx - 2, y + cell * 0.5 + 14)
    g.lineTo(cx + 50, y + cell * 0.5 + 2)
    g.moveTo(cx - 2, y + cell * 0.5 + 12)
    g.lineTo(cx + 50, y + cell * 0.5 + 24)
    g.stroke()
    g.beginPath()
    g.arc(cx, y + cell * 1.5 + 8, 40, 0, Math.PI * 2)
    g.stroke()
    g.setLineDash([])
    for (let i = 0; i <= 3; i++) {
      const yy = y + i * cell
      g.fillStyle = 'rgba(20,12,6,0.3)'
      g.fillRect(x + t, yy + t, w - t * 2, 10)
      flute(g, x, yy, w, t, false, '#dcc093', '#80603a')
    }
    flute(g, x, y, h, t, true, '#d4b584', '#80603a')
    flute(g, x + w - t, y, h, t, true, '#d4b584', '#80603a')
    // A strip of tape mending one corner.
    tapeStrip(g, x - 8, y + 30, x + 26, y - 6, 20, '#efe2ba', '#b8a070', 31 + Math.floor(r() * 9))
  }

  const bgBase = layer(W, H)
  paintRoom(bgBase.g)

  const bgDay = layer(W, H)
  {
    const g = bgDay.g
    blit(g, bgBase, 0, 0)
    // The lamp is on: a warm pool on the wall.
    const pool = g.createRadialGradient(LAMP.x, LAMP.y + 60, 20, LAMP.x, LAMP.y + 90, 420)
    pool.addColorStop(0, 'rgba(255,232,160,0.42)')
    pool.addColorStop(0.5, 'rgba(255,226,150,0.14)')
    pool.addColorStop(1, 'rgba(255,226,150,0)')
    g.fillStyle = pool
    g.fillRect(0, 0, W, H)
    paintLamp(g, true)
    const vg = g.createRadialGradient(W / 2, H / 2 - 40, 380, W / 2, H / 2, 800)
    vg.addColorStop(0, 'rgba(40,26,14,0)')
    vg.addColorStop(1, 'rgba(40,26,14,0.3)')
    g.fillStyle = vg
    g.fillRect(0, 0, W, H)
  }

  const bgNight = layer(W, H)
  {
    const g = bgNight.g
    blit(g, bgBase, 0, 0)
    paintLamp(g, false)
    g.fillStyle = `rgba(${NAVY[0]},${NAVY[1]},${NAVY[2]},${VEIL})`
    g.fillRect(0, 0, W, H)
    // The window keeps the last grey light of the afternoon.
    const { x, y, w, h } = WINDOW
    g.fillStyle = 'rgba(132,160,214,0.3)'
    g.fillRect(x, y, w / 2 - 5, h * 0.46)
    g.fillRect(x + w / 2 + 5, y, w / 2 - 5, h * 0.46)
    g.fillRect(x, y + h * 0.46 + 10, w / 2 - 5, h * 0.54 - 10)
    g.fillRect(x + w / 2 + 5, y + h * 0.46 + 10, w / 2 - 5, h * 0.54 - 10)
    // And lays it on the floor.
    g.fillStyle = 'rgba(132,160,214,0.07)'
    g.beginPath()
    g.moveTo(250, 632)
    g.lineTo(470, 632)
    g.lineTo(560, H)
    g.lineTo(230, H)
    g.closePath()
    g.fill()
    const vg = g.createRadialGradient(W / 2, H / 2 - 40, 380, W / 2, H / 2, 800)
    vg.addColorStop(0, 'rgba(6,6,20,0)')
    vg.addColorStop(1, 'rgba(6,6,20,0.45)')
    g.fillStyle = vg
    g.fillRect(0, 0, W, H)
  }

  bgBase.c.width = 1
  bgBase.c.height = 1

  function paintLamp(g: CanvasRenderingContext2D, on: boolean): void {
    const { x, y } = LAMP
    g.strokeStyle = '#5b4a40'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(x, 10)
    g.lineTo(x + 1, y - 36)
    g.stroke()
    // Bulb: a disc of yellow paper.
    g.fillStyle = on ? '#fff0b0' : '#cfc9b4'
    g.beginPath()
    g.arc(x, y + 22, 17, 0, Math.PI * 2)
    g.fill()
    if (on) {
      const glow = g.createRadialGradient(x, y + 24, 4, x, y + 24, 70)
      glow.addColorStop(0, 'rgba(255,244,190,0.75)')
      glow.addColorStop(1, 'rgba(255,244,190,0)')
      g.fillStyle = glow
      g.fillRect(x - 80, y - 50, 160, 160)
    }
    // Shade: a cone of mustard corrugated card.
    g.fillStyle = 'rgba(30,22,14,0.2)'
    g.beginPath()
    g.moveTo(x - 20, y - 34)
    g.lineTo(x + 26, y - 34)
    g.lineTo(x + 70, y + 28)
    g.lineTo(x - 60, y + 28)
    g.closePath()
    g.fill()
    g.save()
    g.beginPath()
    g.moveTo(x - 23, y - 38)
    g.lineTo(x + 23, y - 38)
    g.lineTo(x + 66, y + 22)
    g.lineTo(x - 66, y + 22)
    g.closePath()
    g.fillStyle = '#e0aa3e'
    g.fill()
    g.clip()
    g.strokeStyle = 'rgba(140,90,20,0.4)'
    g.lineWidth = 2
    for (let i = -8; i <= 8; i++) {
      g.beginPath()
      g.moveTo(x + i * 2.9, y - 38)
      g.lineTo(x + i * 8.2, y + 22)
      g.stroke()
    }
    paper(g, x - 70, y - 40, 140, 64, 0.5)
    g.restore()
    flute(g, x - 68, y + 18, 136, 8, false, '#ecc878', '#96661e')
  }

  // ---- the curtain that ends the day -------------------------------------------

  const curtain = layer(W, H + 40)
  {
    const g = curtain.g
    const r = rng(seed * 5 + 99)
    g.fillStyle = '#cba473'
    g.fillRect(0, 0, W, H + 40)
    // The curl the roll leaves in the paper.
    for (let y = 30; y < H; y += 92) {
      const band = g.createLinearGradient(0, y, 0, y + 92)
      band.addColorStop(0, 'rgba(255,236,196,0.1)')
      band.addColorStop(0.5, 'rgba(90,56,24,0.07)')
      band.addColorStop(1, 'rgba(255,236,196,0.1)')
      g.fillStyle = band
      g.fillRect(0, y, W, 92)
    }
    paper(g, 0, 0, W, H + 40, 0.8)
    const edge = g.createLinearGradient(0, 0, 60, 0)
    edge.addColorStop(0, 'rgba(70,44,20,0.3)')
    edge.addColorStop(1, 'rgba(70,44,20,0)')
    g.fillStyle = edge
    g.fillRect(0, 0, 60, H + 40)
    g.save()
    g.translate(W, 0)
    g.scale(-1, 1)
    g.fillStyle = edge
    g.fillRect(0, 0, 60, H + 40)
    g.restore()
    // A fort, a cat and a moon, drawn in fat marker by a small hand.
    const ink = '#3a2c28'
    scrawl(g, [330, 600, 330, 380, 610, 372, 614, 600, 330, 600], ink, 9, r, 3)
    scrawl(g, [614, 600, 618, 452, 830, 448, 834, 600, 614, 600], ink, 9, r, 3)
    scrawl(g, [396, 372, 400, 232, 560, 228, 562, 372], ink, 9, r, 3)
    scrawl(g, [428, 600, 428, 496, 470, 462, 512, 496, 512, 600], '#c8483a', 9, r, 3)
    scrawl(g, [690, 500, 760, 498, 762, 556, 692, 558, 690, 500], '#2f6fb4', 8, r, 2.4)
    scrawl(g, [440, 270, 520, 268, 522, 330, 442, 332, 440, 270], '#2f6fb4', 8, r, 2.4)
    // Cat in the window.
    scrawl(g, [458, 330, 456, 300, 466, 286, 472, 300, 490, 300, 496, 286, 506, 300, 504, 330], ink, 6, r, 1.4)
    g.fillStyle = ink
    g.beginPath()
    g.arc(471, 312, 3.4, 0, Math.PI * 2)
    g.arc(491, 312, 3.4, 0, Math.PI * 2)
    g.fill()
    // Moon and stars.
    g.strokeStyle = '#d9a21e'
    g.lineWidth = 9
    g.beginPath()
    g.arc(860, 230, 46, 0.5, 4.4)
    g.stroke()
    g.beginPath()
    g.arc(884, 216, 40, 1.2, 3.6)
    g.stroke()
    for (const [sx, sy] of [
      [250, 250],
      [700, 180],
      [200, 430],
      [960, 400],
      [620, 110],
    ]) {
      scrawl(g, [sx - 16, sy, sx + 16, sy], '#d9a21e', 6, r, 1.5)
      scrawl(g, [sx, sy - 16, sx, sy + 16], '#d9a21e', 6, r, 1.5)
      scrawl(g, [sx - 10, sy - 10, sx + 10, sy + 10], '#d9a21e', 5, r, 1.5)
    }
    scrawl(g, [150, 610, 330, 604, 600, 612, 840, 604, 1040, 610], '#3d8c50', 9, r, 3)
    // The card tube it rolls on.
    const tube = g.createLinearGradient(0, H + 4, 0, H + 40)
    tube.addColorStop(0, '#e0c090')
    tube.addColorStop(0.4, '#c39a62')
    tube.addColorStop(1, '#7c5a36')
    g.fillStyle = tube
    g.fillRect(0, H + 6, W, 34)
    g.strokeStyle = 'rgba(90,60,30,0.4)'
    g.lineWidth = 2
    for (let x = -20; x < W; x += 46) {
      g.beginPath()
      g.moveTo(x, H + 40)
      g.lineTo(x + 30, H + 6)
      g.stroke()
    }
    g.fillStyle = 'rgba(40,26,12,0.3)'
    g.fillRect(0, H, W, 7)
  }

  // ---- glow sprites ------------------------------------------------------------

  const radial = (size: number, stops: readonly (readonly [number, string])[]): HTMLCanvasElement => {
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    made.push(c)
    const g = c.getContext('2d')
    if (g) {
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      for (const [at, col] of stops) grad.addColorStop(at, col)
      g.fillStyle = grad
      g.fillRect(0, 0, size, size)
    }
    return c
  }
  const hexA = (hex: string, a: number): string => {
    const n = Number.parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
  }
  const bulbGlow = BULBS.map((col) =>
    radial(64, [
      [0, hexA(col, 0.9)],
      [0.25, hexA(col, 0.4)],
      [1, hexA(col, 0)],
    ]),
  )
  const warmGlow = radial(128, [
    [0, 'rgba(255,214,130,0.8)'],
    [0.4, 'rgba(255,190,100,0.3)'],
    [1, 'rgba(255,180,90,0)'],
  ])

  const glowOf = (poly: readonly Pt[], pad: number, color = 'rgba(255,208,128,1)'): HTMLCanvasElement => {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of poly) {
      minX = Math.min(minX, p[0])
      minY = Math.min(minY, p[1])
      maxX = Math.max(maxX, p[0])
      maxY = Math.max(maxY, p[1])
    }
    const c = document.createElement('canvas')
    c.width = Math.ceil(maxX - minX + pad * 2)
    c.height = Math.ceil(maxY - minY + pad * 2)
    const g = c.getContext('2d')
    if (g) {
      // Only the blurred shadow lands on the canvas; the shape itself is drawn
      // far off to the side. (Canvas filters are not everywhere; shadows are.)
      const far = 4000
      g.shadowColor = color
      g.shadowBlur = pad * 0.7
      g.shadowOffsetX = far
      g.fillStyle = '#000'
      g.translate(pad - minX - far, pad - minY)
      tracePoly(g, poly)
      g.fill()
      g.fill()
    }
    return c
  }

  // ---- box faces ---------------------------------------------------------------

  const toneHex = ['#cba26e', '#ba8c58', '#dbbe8f', '#bbad95', '#e8dfca']
  const scratch = { layer: null as Layer | null }

  const decorate = (g: CanvasRenderingContext2D, box: FaceLook, night: boolean) => {
    const { w, h, tone, seed: bs } = box
    const r = rng(bs * 17 + 5)
    const inkCol = night ? 'rgba(10,6,4,0.55)' : tone === 4 ? 'rgba(180,70,52,0.62)' : 'rgba(78,50,32,0.52)'
    // Packing tape over the top and bottom seams.
    const tx = w * (0.42 + r() * 0.16)
    const tapeCol = night ? 'rgba(12,7,4,0.4)' : 'rgba(150,98,48,0.62)'
    for (const up of [true, false]) {
      const len = Math.min(h * 0.3, 38 + r() * 22)
      g.fillStyle = tapeCol
      g.beginPath()
      const y0 = up ? 0 : h
      const y1 = up ? len : h - len
      g.moveTo(tx - 20, y0)
      g.lineTo(tx + 20, y0)
      for (let k = 0; k <= 6; k++) g.lineTo(tx + 20 - (k / 6) * 40, y1 + (k % 2 ? (up ? 4 : -4) : 0))
      g.closePath()
      g.fill()
      if (!night) {
        g.fillStyle = 'rgba(255,236,196,0.2)'
        g.fillRect(tx - 14, Math.min(y0, y1) + 2, 5, len - 6)
      }
    }
    // The seam itself.
    g.strokeStyle = night ? 'rgba(10,6,4,0.3)' : 'rgba(80,52,30,0.28)'
    g.lineWidth = 1.4
    g.beginPath()
    g.moveTo(tx, 9)
    g.lineTo(tx + 0.5, h)
    g.stroke()
    // One or two shipping stamps, faded.
    g.strokeStyle = inkCol
    g.lineCap = 'butt'
    const big = Math.min(1.5, Math.min(w, h) / 120)
    const left = tx > w / 2
    const sx = left ? w * 0.22 : w * 0.78
    const sy = h * 0.58
    const which = Math.floor(r() * 3)
    g.save()
    g.translate(sx, sy)
    g.rotate((r() - 0.5) * 0.12)
    if (which === 0) stampArrows(g, 0, 0, big)
    else if (which === 1) stampGlass(g, 0, 0, big)
    else stampUmbrella(g, 0, 0, big)
    g.restore()
    if (w > 190) {
      g.save()
      g.translate(left ? w * 0.78 : w * 0.2, h * 0.36)
      g.rotate((r() - 0.5) * 0.1)
      const s2 = big * 0.74
      if (which === 0) stampUmbrella(g, 0, 0, s2)
      else stampArrows(g, 0, 0, s2)
      g.restore()
    }
    g.lineCap = 'round'
    // A blank address label on the bigger ones, one corner lifting.
    if (w > 160 && h > 140 && !night) {
      g.save()
      g.translate(left ? w * 0.72 : w * 0.3, h * 0.72)
      g.rotate((r() - 0.5) * 0.16)
      g.fillStyle = 'rgba(40,26,14,0.18)'
      g.fillRect(-33, -19, 70, 44)
      g.fillStyle = '#f4efe2'
      g.fillRect(-35, -22, 70, 44)
      g.fillStyle = 'rgba(120,120,124,0.5)'
      g.fillRect(-27, -12, 40, 3.4)
      g.fillRect(-27, -3, 52, 3.4)
      g.fillRect(-27, 6, 30, 3.4)
      g.fillStyle = 'rgba(200,72,58,0.75)'
      g.fillRect(14, 4, 14, 12)
      g.restore()
    }
    // Shoe-box lid on the white one.
    if (tone === 4) {
      g.strokeStyle = night ? 'rgba(10,6,4,0.4)' : 'rgba(120,96,70,0.5)'
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(0, h * 0.3)
      g.lineTo(w, h * 0.3 + 1)
      g.stroke()
      if (!night) {
        g.fillStyle = 'rgba(60,40,24,0.08)'
        g.fillRect(0, h * 0.3, w, 7)
      }
    }
    // A crease or two from being carried.
    for (let i = 0; i < 2; i++) {
      const y = h * (0.2 + r() * 0.6)
      const x0 = r() * w * 0.5
      const len = 30 + r() * 70
      g.strokeStyle = night ? 'rgba(10,6,4,0.2)' : 'rgba(70,44,22,0.2)'
      g.lineWidth = 1.3
      g.beginPath()
      g.moveTo(x0, y)
      g.lineTo(x0 + len, y + (r() - 0.5) * 16)
      g.stroke()
      if (!night) {
        g.strokeStyle = 'rgba(255,240,206,0.25)'
        g.beginPath()
        g.moveTo(x0, y + 1.6)
        g.lineTo(x0 + len, y + (r() - 0.5) * 16 + 1.6)
        g.stroke()
      }
    }
  }

  const renderOne = (box: FaceLook, night: boolean) => {
    const target = night ? box.night : box.day
    const g = target.g
    const { w, h, seed: bs } = box
    const lit = box.holes.length > 0
    wipe(target)
    g.save()
    g.translate(FACE_PAD, FACE_PAD)
    facePath(g, w, h, bs)
    if (night && lit) {
      // Thin board with a light behind it: an ember brown, the flutes glowing.
      g.fillStyle = '#4a2a14'
      g.fill()
      g.save()
      g.clip()
      for (let x = 2; x < w; x += 6.5) {
        g.fillStyle = 'rgba(255,160,70,0.1)'
        g.fillRect(x, 0, 2.6, h)
      }
      const warm = g.createLinearGradient(0, 0, 0, h)
      warm.addColorStop(0, 'rgba(20,8,2,0.35)')
      warm.addColorStop(0.5, 'rgba(255,150,60,0.06)')
      warm.addColorStop(1, 'rgba(20,8,2,0.25)')
      g.fillStyle = warm
      g.fillRect(0, 0, w, h)
      decorate(g, box, true)
      g.fillStyle = 'rgba(16,8,4,0.6)'
      g.fillRect(0, 0, w, 9)
      // Light leaving each opening warms the board around it.
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = 0.6
      for (const hole of box.holes) g.drawImage(hole.glow, hole.b.minX - GLOW_PAD, hole.b.minY - GLOW_PAD)
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
      g.restore()
      // Marker drawings stand out as silhouettes against the glow.
      const sc = scratch.layer && scratch.layer.w >= box.ink.w && scratch.layer.h >= box.ink.h ? scratch.layer : (scratch.layer = layer(Math.max(340, box.ink.w), Math.max(300, box.ink.h)))
      wipe(sc)
      blit(sc.g, box.ink, 0, 0)
      sc.g.globalCompositeOperation = 'source-in'
      sc.g.fillStyle = '#120905'
      sc.g.fillRect(0, 0, sc.w, sc.h)
      sc.g.globalCompositeOperation = 'source-over'
      g.drawImage(sc.c, 0, 0, sc.c.width, sc.c.height, -FACE_PAD, -FACE_PAD, sc.w, sc.h)
    } else {
      g.fillStyle = toneHex[box.tone]
      g.fill()
      g.save()
      g.clip()
      // The corrugation telegraphing through the liner.
      g.fillStyle = 'rgba(80,50,24,0.05)'
      for (let x = 2; x < w; x += 6.5) g.fillRect(x, 0, 2.2, h)
      paper(g, 0, 0, w, h, 0.85)
      const shade = g.createLinearGradient(0, 0, 0, h)
      shade.addColorStop(0, 'rgba(255,242,214,0.14)')
      shade.addColorStop(1, 'rgba(70,40,16,0.14)')
      g.fillStyle = shade
      g.fillRect(0, 0, w, h)
      decorate(g, box, false)
      // The cut top edge, flutes showing.
      flute(g, -2, 0, w + 4, 9, false, '#e6cda2', '#7c5a36')
      g.restore()
      facePath(g, w, h, bs)
      g.strokeStyle = 'rgba(84,54,30,0.6)'
      g.lineWidth = 1.7
      g.stroke()
      g.drawImage(box.ink.c, -FACE_PAD, -FACE_PAD, box.ink.w, box.ink.h)
      if (night) {
        // No light inside: just a box in a dark room.
        g.globalCompositeOperation = 'source-atop'
        g.fillStyle = 'rgba(24,18,30,0.86)'
        g.fillRect(-FACE_PAD, -FACE_PAD, w + FACE_PAD * 2, h + FACE_PAD * 2)
        g.globalCompositeOperation = 'source-over'
      }
    }
    // Openings: a raw cut rim with its flutes, then the hole itself.
    for (const hole of box.holes) {
      tracePoly(g, hole.poly)
      g.strokeStyle = night ? (lit ? '#ffc874' : '#3a3550') : '#ecd6ae'
      g.lineWidth = 10
      g.stroke()
      g.strokeStyle = night ? 'rgba(120,60,20,0.8)' : 'rgba(110,76,44,0.85)'
      g.lineWidth = 7.5
      g.setLineDash([2.2, 3.4])
      g.stroke()
      g.setLineDash([])
      g.strokeStyle = night ? 'rgba(20,10,4,0.5)' : 'rgba(70,44,24,0.55)'
      g.lineWidth = 1.2
      g.stroke()
    }
    g.globalCompositeOperation = 'destination-out'
    g.fillStyle = '#000'
    for (const hole of box.holes) {
      tracePoly(g, hole.poly)
      g.fill()
    }
    g.globalCompositeOperation = 'source-over'
    g.restore()
  }

  return {
    s,
    bgDay,
    bgNight,
    curtain,
    bulbGlow,
    warmGlow,
    glowOf,
    renderDay(box) {
      renderOne(box, false)
    },
    renderNight(box) {
      renderOne(box, true)
    },
    inkLine(box, x1, y1, x2, y2, color, width) {
      const lit = box.holes.length > 0
      const targets: [Layer, string, boolean][] = [
        [box.ink, color, false],
        [box.day, color, true],
        [box.night, lit ? '#120905' : mixHex(color), true],
      ]
      for (const [target, col, punch] of targets) {
        const g = target.g
        g.save()
        g.translate(FACE_PAD, FACE_PAD)
        g.beginPath()
        g.rect(1, 1, box.w - 2, box.h - 2)
        g.clip()
        g.strokeStyle = col
        g.lineWidth = width
        g.globalAlpha = 0.92
        g.beginPath()
        g.moveTo(x1, y1)
        g.lineTo(x2, y2)
        g.stroke()
        if (punch && box.holes.length > 0) {
          g.globalAlpha = 1
          g.globalCompositeOperation = 'destination-out'
          for (const hole of box.holes) {
            tracePoly(g, hole.poly)
            g.fill()
          }
        }
        g.restore()
      }
    },
    dispose() {
      // Let the browser have the memory back at once.
      for (const c of made) {
        c.width = 1
        c.height = 1
      }
      made.length = 0
    },
  }

  function mixHex(color: string): string {
    const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(color)
    if (!m) return '#1a1c30'
    return mixRgb([Number(m[1]), Number(m[2]), Number(m[3])], [24, 18, 30], 0.86)
  }
}
