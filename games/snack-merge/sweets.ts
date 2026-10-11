import type { Mood } from './jar'
import { BREAD, CHEESE, CHILLI, EGG, ICE, JELLY, LAYERS, POWERS, thingsOf, type Kind } from './kinds'

// The look of a snack: a jelly sweet in the shape of its food (ART.md, "The
// look"). A saturated see-through body with a light core and a dark rim, one
// soft highlight, a coat of sugar grains, and a face of two eyes and a mouth.
// A snack of two or three things is put together from its things by rule, so
// each of the forty-one has its own picture and none is drawn by hand.
// Everything here paints once into a sprite, centred on the origin, in stage
// units; the view stamps the sprite.

type C = CanvasRenderingContext2D
type Hue = { core: string; body: string; rim: string }

const TAU = Math.PI * 2

export const HUES: readonly Hue[] = [
  /* bread  */ { core: '#ffe2a8', body: '#f0a23a', rim: '#a4530e' },
  /* cheese */ { core: '#fff7ac', body: '#ffd21f', rim: '#c48400' },
  /* egg    */ { core: '#ffffff', body: '#fff4e2', rim: '#d2b592' },
  /* chilli */ { core: '#ffa58c', body: '#f2362e', rim: '#8a0c12' },
  /* jelly  */ { core: '#ecffb8', body: '#7ed321', rim: '#2d7a0b' },
  /* ice    */ { core: '#ffffff', body: '#a8e2ff', rim: '#4797cf' },
]
const TOAST: Hue = { core: '#f3c078', body: '#d98a2b', rim: '#8a4409' }
const YOLK: Hue = { core: '#ffd66b', body: '#ff8a1f', rim: '#c44a00' }
const HOT_YOLK: Hue = { core: '#ffb36b', body: '#ff3b1f', rim: '#9a0c06' }
const PALE_YOLK: Hue = { core: '#fff6c9', body: '#ffd27a', rim: '#d69a3a' }
const WOOD: Hue = { core: '#fff0cf', body: '#efd5a2', rim: '#b98f58' }
const INK = '#3b2314'

/** How far a sweet's picture reaches from its middle, as a multiple of its radius: a stalk, a flame and a stick stand out past the body. */
export const REACH = 1.45

type Path = (c: C, r: number) => void

const slice: Path = (c, r) => {
  c.moveTo(-0.54 * r, 0.84 * r)
  c.lineTo(0.54 * r, 0.84 * r)
  c.arcTo(0.78 * r, 0.84 * r, 0.78 * r, 0.6 * r, 0.24 * r)
  c.lineTo(0.78 * r, -0.12 * r)
  c.bezierCurveTo(1.04 * r, -0.22 * r, 1.0 * r, -0.92 * r, 0, -0.92 * r)
  c.bezierCurveTo(-1.0 * r, -0.92 * r, -1.04 * r, -0.22 * r, -0.78 * r, -0.12 * r)
  c.lineTo(-0.78 * r, 0.6 * r)
  c.arcTo(-0.78 * r, 0.84 * r, -0.54 * r, 0.84 * r, 0.24 * r)
  c.closePath()
}

function rounded(c: C, points: readonly (readonly [number, number])[], radius: number): void {
  const n = points.length
  const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const
  const start = mid(points[n - 1], points[0])
  c.moveTo(start[0], start[1])
  for (let i = 0; i < n; i++) {
    const next = points[(i + 1) % n]
    c.arcTo(points[i][0], points[i][1], next[0], next[1], radius)
  }
  c.closePath()
}

const wedge: Path = (c, r) => rounded(c, [[-0.86 * r, -0.74 * r], [0.96 * r, 0.06 * r], [0.96 * r, 0.84 * r], [-0.86 * r, 0.84 * r]], 0.2 * r)

/** A frilly round: the white of an egg. */
function frill(c: C, rx: number, ry: number, ox: number, oy: number, lobes: number): void {
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * TAU
    const wave = 1 + 0.07 * Math.sin(a * lobes + 1.3)
    const x = ox + Math.cos(a) * rx * wave, y = oy + Math.sin(a) * ry * wave
    if (i === 0) c.moveTo(x, y)
    else c.lineTo(x, y)
  }
  c.closePath()
}
const white: Path = (c, r) => frill(c, 0.92 * r, 0.9 * r, 0, 0, 7)

const pepper: Path = (c, r) => {
  c.moveTo(-0.3 * r, -0.66 * r)
  c.bezierCurveTo(0.3 * r, -0.98 * r, 1.0 * r, -0.5 * r, 0.88 * r, 0.12 * r)
  c.bezierCurveTo(0.78 * r, 0.72 * r, 0.1 * r, 0.98 * r, -0.66 * r, 0.9 * r)
  c.bezierCurveTo(-0.3 * r, 0.66 * r, -0.8 * r, 0.24 * r, -0.78 * r, -0.2 * r)
  c.bezierCurveTo(-0.76 * r, -0.46 * r, -0.6 * r, -0.6 * r, -0.3 * r, -0.66 * r)
  c.closePath()
}

const dome: Path = (c, r) => {
  c.moveTo(-0.92 * r, 0.7 * r)
  // The fluted foot of a moulded jelly.
  for (let i = 0; i < 5; i++) {
    const x0 = (-0.92 + i * 0.368) * r
    c.quadraticCurveTo(x0 + 0.184 * r, 0.96 * r, x0 + 0.368 * r, 0.7 * r)
  }
  c.bezierCurveTo(0.98 * r, -0.2 * r, 0.62 * r, -0.92 * r, 0, -0.92 * r)
  c.bezierCurveTo(-0.62 * r, -0.92 * r, -0.98 * r, -0.2 * r, -0.92 * r, 0.7 * r)
  c.closePath()
}

const cube: Path = (c, r) => rounded(c, [[-0.82 * r, -0.82 * r], [0.82 * r, -0.82 * r], [0.82 * r, 0.82 * r], [-0.82 * r, 0.82 * r]], 0.3 * r)

const lens: Path = (c, r) => {
  c.moveTo(-0.95 * r, 0.22 * r)
  c.bezierCurveTo(-0.95 * r, -0.84 * r, 0.95 * r, -0.84 * r, 0.95 * r, 0.22 * r)
  c.bezierCurveTo(0.74 * r, 0.8 * r, -0.74 * r, 0.8 * r, -0.95 * r, 0.22 * r)
  c.closePath()
}

const drip = (x: number, y: number, long: number): Path => (c, r) => {
  c.moveTo((x - 0.1) * r, y * r)
  c.bezierCurveTo((x - 0.1) * r, (y + long * 0.6) * r, (x - 0.13) * r, (y + long) * r, x * r, (y + long) * r)
  c.bezierCurveTo((x + 0.13) * r, (y + long) * r, (x + 0.1) * r, (y + long * 0.6) * r, (x + 0.1) * r, y * r)
  c.closePath()
}

type Placed = { dx?: number; dy?: number; s?: number; alpha?: number }

/** One piece of jelly: a light core, the hue, a dark rim. */
function gel(c: C, r: number, path: Path, hue: Hue, at: Placed = {}): void {
  c.save()
  c.translate((at.dx ?? 0) * r, (at.dy ?? 0) * r)
  if (at.s) c.scale(at.s, at.s)
  c.beginPath()
  path(c, r)
  const fill = c.createRadialGradient(-0.28 * r, -0.36 * r, 0.05 * r, 0, 0, 1.22 * r)
  fill.addColorStop(0, hue.core)
  fill.addColorStop(0.52, hue.body)
  fill.addColorStop(1, hue.rim)
  c.globalAlpha = at.alpha ?? 1
  c.fillStyle = fill
  c.fill()
  c.clip()
  c.globalAlpha = 0.5 * (at.alpha ?? 1)
  c.lineWidth = 0.15 * r
  c.strokeStyle = hue.rim
  c.stroke()
  c.restore()
}

function holes(c: C, r: number, spots: readonly (readonly [number, number, number])[], through = false): void {
  for (const [x, y, size] of spots) {
    if (through) {
      // Cut right through the sweet: whatever lies behind it shows in the hole.
      c.save()
      c.globalCompositeOperation = 'destination-out'
      c.fillStyle = '#000000'
      c.beginPath()
      c.ellipse(x * r, y * r, size * 1.25 * r, size * r, 0, 0, TAU)
      c.fill()
      c.restore()
      c.strokeStyle = 'rgba(160, 100, 0, 0.55)'
      c.lineWidth = 0.035 * r
      c.beginPath()
      c.ellipse(x * r, y * r, size * 1.25 * r, size * r, 0, 0, TAU)
      c.stroke()
      continue
    }
    c.fillStyle = 'rgba(160, 100, 0, 0.5)'
    c.beginPath()
    c.ellipse(x * r, y * r, size * r, size * 0.8 * r, 0, 0, TAU)
    c.fill()
    c.fillStyle = 'rgba(255, 250, 200, 0.7)'
    c.beginPath()
    c.ellipse(x * r, (y + size * 0.45) * r, size * 0.7 * r, size * 0.22 * r, 0, 0, TAU)
    c.fill()
  }
}

function stalk(c: C, r: number, x: number, y: number): void {
  c.strokeStyle = '#3f8f22'
  c.lineCap = 'round'
  c.lineWidth = 0.17 * r
  c.beginPath()
  c.moveTo(x * r, y * r)
  c.quadraticCurveTo((x - 0.02) * r, (y - 0.24) * r, (x - 0.2) * r, (y - 0.34) * r)
  c.stroke()
  c.fillStyle = '#58b02e'
  c.beginPath()
  c.ellipse(x * r, (y + 0.03) * r, 0.2 * r, 0.09 * r, -0.2, 0, TAU)
  c.fill()
}

function flame(c: C, r: number, x: number, y: number, size: number): void {
  const tongue = (scale: number, colour: string) => {
    const h = size * scale * r
    c.fillStyle = colour
    c.beginPath()
    c.moveTo(x * r, y * r - h)
    c.bezierCurveTo(x * r + h * 0.75, y * r - h * 0.25, x * r + h * 0.5, y * r + h * 0.35, x * r, y * r + h * 0.3)
    c.bezierCurveTo(x * r - h * 0.55, y * r + h * 0.35, x * r - h * 0.5, y * r - h * 0.2, x * r - h * 0.1, y * r - h * 0.45)
    c.bezierCurveTo(x * r - h * 0.05, y * r - h * 0.7, x * r - h * 0.1, y * r - h * 0.85, x * r, y * r - h)
    c.fill()
  }
  tongue(1, '#ff7a1a')
  tongue(0.58, '#ffe35a')
}

/** A cap of snow with three icicles, over the top of a body. */
function snow(c: C, r: number): void {
  const fill = c.createLinearGradient(0, -r, 0, -0.1 * r)
  fill.addColorStop(0, '#ffffff')
  fill.addColorStop(1, '#cfeeff')
  c.fillStyle = fill
  c.beginPath()
  c.arc(0, 0, 1.0 * r, Math.PI * 1.14, Math.PI * 1.86)
  const tips: readonly (readonly [number, number])[] = [[0.56, -0.12], [0.02, -0.22], [-0.52, -0.06]]
  let x = 0.9
  for (const [tx, ty] of tips) {
    c.quadraticCurveTo((x + tx + 0.1) / 2 * r, -0.58 * r, (tx + 0.1) * r, -0.46 * r)
    c.lineTo(tx * r, ty * r)
    c.lineTo((tx - 0.1) * r, -0.46 * r)
    x = tx - 0.1
  }
  c.quadraticCurveTo(-0.8 * r, -0.56 * r, -0.9 * r, -0.43 * r)
  c.closePath()
  c.fill()
}

/** Where a snack's face sits, as multiples of its radius. */
function faceAt(k: Kind): { x: number; y: number; s: number } {
  const layers = k & LAYERS, powers = k & POWERS
  if (layers === CHEESE) return { x: -0.08, y: 0.34, s: 0.92 }
  if (layers === EGG && !(powers & JELLY)) return { x: 0, y: 0.36, s: 0.95 }
  if (layers & EGG) return { x: 0, y: 0.34, s: 0.95 }
  if (layers) return { x: 0, y: 0.2, s: 1 }
  if (powers === CHILLI) return { x: 0.08, y: 0.1, s: 0.95 }
  if (powers & JELLY && powers & ICE) return { x: 0, y: -0.08, s: 0.85 }
  return { x: 0, y: 0.14, s: 1 }
}

/** Where the yolk of a snack with egg in it sits, as multiples of its radius, and how big it is; null without egg. */
export function yolkAt(k: Kind): { x: number; y: number; size: number } | null {
  if (!(k & EGG)) return null
  const layers = k & LAYERS
  if (layers === EGG) return k & JELLY ? { x: 0, y: -0.32, size: 0.3 } : { x: 0, y: -0.3, size: 0.34 }
  if (layers === (CHEESE | EGG)) return { x: -0.34, y: -0.22, size: 0.26 }
  return { x: 0, y: -0.46, size: 0.28 }
}

/** The yolk, a glossy bead painted as its own sprite, so that it can slide and bob on the snack. */
export function paintYolk(c: C, k: Kind, r: number): void {
  const at = yolkAt(k)
  if (!at) return
  const hue = k & CHILLI ? HOT_YOLK : k & ICE ? PALE_YOLK : YOLK
  const size = at.size * r
  const bead: Path = (ctx) => ctx.ellipse(0, 0, size, size * 0.9, 0, 0, TAU)
  gel(c, size, bead, hue)
  c.fillStyle = 'rgba(255, 255, 255, 0.85)'
  c.beginPath()
  c.ellipse(-size * 0.3, -size * 0.38, size * 0.26, size * 0.14, -0.5, 0, TAU)
  c.fill()
}

/** The body of a snack, by the things it holds. */
function body(c: C, k: Kind, r: number): void {
  const layers = k & LAYERS, powers = k & POWERS
  const clear = k & JELLY ? 0.8 : 1
  const toastie = () => {
    gel(c, r, slice, TOAST, { dx: 0.1, dy: -0.1, s: 0.9, alpha: clear })
    gel(c, r, slice, HUES[1], { dx: 0.02, dy: -0.02, s: 0.95, alpha: clear })
    gel(c, r, drip(0.72, 0.5, 0.36), HUES[1], { alpha: clear })
    gel(c, r, slice, HUES[0], { dx: -0.07, dy: 0.07, s: 0.9, alpha: clear })
  }
  const eggOnTop = () => gel(c, r, (ctx) => frill(ctx, 0.62 * r, 0.36 * r, 0, -0.44 * r, 6), HUES[2], { alpha: clear })
  switch (layers) {
    case BREAD:
      gel(c, r, slice, HUES[0], { alpha: clear })
      break
    case CHEESE:
      if (powers & CHILLI) {
        // Melting: it sags and drips.
        gel(c, r, drip(-0.36, 0.7, 0.3), HUES[1], { alpha: clear })
        gel(c, r, drip(0.42, 0.72, 0.2), HUES[1], { alpha: clear })
      }
      gel(c, r, wedge, HUES[1], { alpha: clear })
      holes(c, r, [[-0.5, 0.02, 0.15], [0.42, 0.52, 0.13], [0.5, 0.1, 0.09], [-0.56, 0.56, 0.1]], (powers & JELLY) !== 0)
      break
    case EGG:
      if (powers & JELLY) gel(c, r, dome, { core: '#ffffff', body: '#eafcd6', rim: '#8fbf6a' }, { alpha: 0.72 })
      else gel(c, r, white, HUES[2], { alpha: clear })
      break
    case BREAD | CHEESE:
      toastie()
      break
    case BREAD | EGG:
      gel(c, r, slice, HUES[0], { alpha: clear })
      eggOnTop()
      break
    case CHEESE | EGG:
      // An omelette: a folded half-moon with a white frill under it.
      gel(c, r, lens, HUES[2], { dy: 0.12, s: 1.02, alpha: clear })
      gel(c, r, lens, HUES[1], { alpha: clear })
      holes(c, r, [[0.42, -0.3, 0.12], [0.56, 0.1, 0.08], [-0.6, 0.12, 0.09]])
      break
    case LAYERS:
      toastie()
      eggOnTop()
      break
    default:
      // No layer: one, two or all three of the powers by themselves.
      if (powers === CHILLI) {
        gel(c, r, pepper, HUES[3])
        stalk(c, r, -0.3, -0.66)
      } else if (powers === JELLY) gel(c, r, dome, HUES[4], { alpha: 0.86 })
      else if (powers === ICE) gel(c, r, cube, HUES[5], { alpha: 0.9 })
      else if (powers === (CHILLI | ICE)) {
        // The chilli, frozen inside the cube.
        gel(c, r, pepper, HUES[3], { s: 0.6, dy: 0.05 })
        stalk(c, r * 0.6, -0.3, -0.58)
        gel(c, r, cube, HUES[5], { alpha: 0.6 })
      } else {
        const hot = (powers & CHILLI) !== 0, lolly = (powers & ICE) !== 0
        if (lolly) gel(c, r, (ctx) => rounded(ctx, [[-0.11 * r, 0.2 * r], [0.11 * r, 0.2 * r], [0.11 * r, 1.08 * r], [-0.11 * r, 1.08 * r]], 0.1 * r), WOOD)
        gel(c, r, dome, hot ? HUES[3] : HUES[4], lolly ? { s: 0.84, dy: -0.22, alpha: 0.86 } : { alpha: 0.86 })
        if (hot) stalk(c, r, 0.02, lolly ? -0.98 : -0.9)
      }
  }
}

/**
 * Paints one snack of radius `r` at the origin, with the face of `mood`. `grain` gives the next number of a
 * fixed stream from 0 to 1, for where the sugar lies. The yolk of a snack with egg in it is painted apart.
 */
export function paintSweet(c: C, k: Kind, r: number, mood: Mood, grain: () => number): void {
  const layers = k & LAYERS, powers = k & POWERS
  const glossy = (k & JELLY) !== 0
  body(c, k, r)

  // The powers, laid over a body that has a layer in it.
  c.save()
  c.globalCompositeOperation = 'source-atop'
  if (powers & CHILLI && layers) {
    const scorch = c.createRadialGradient(0, 0, 0.5 * r, 0, 0, 1.08 * r)
    scorch.addColorStop(0, 'rgba(230, 40, 10, 0)')
    scorch.addColorStop(1, 'rgba(214, 30, 8, 0.72)')
    c.fillStyle = scorch
    c.fillRect(-REACH * r, -REACH * r, 2 * REACH * r, 2 * REACH * r)
    c.fillStyle = 'rgba(70, 20, 5, 0.6)'
    for (let i = 0; i < 9; i++) {
      const a = grain() * TAU, d = (0.78 + grain() * 0.16) * r
      c.beginPath()
      c.arc(Math.cos(a) * d, Math.sin(a) * d, (0.03 + grain() * 0.04) * r, 0, TAU)
      c.fill()
    }
  }
  if (glossy && (layers || powers !== JELLY)) {
    c.fillStyle = 'rgba(126, 211, 33, 0.26)'
    c.fillRect(-REACH * r, -REACH * r, 2 * REACH * r, 2 * REACH * r)
  }
  if (powers & ICE) {
    const frost = c.createRadialGradient(0, 0, 0.55 * r, 0, 0, 1.06 * r)
    frost.addColorStop(0, 'rgba(170, 225, 255, 0)')
    frost.addColorStop(1, 'rgba(150, 215, 255, 0.78)')
    c.fillStyle = frost
    c.fillRect(-REACH * r, -REACH * r, 2 * REACH * r, 2 * REACH * r)
  }
  // The sugar coat, thickest at the rim. Jelly has none.
  if (!glossy) {
    const grains = Math.round(r * r * 0.085)
    for (let i = 0; i < grains; i++) {
      const a = grain() * TAU, t = grain(), d = r * (1.02 - 0.82 * t * t)
      c.fillStyle = `rgba(255, 255, 255, ${0.35 + grain() * 0.5})`
      const size = 0.5 + grain() * 0.9
      c.fillRect(Math.cos(a) * d - size / 2, Math.sin(a) * d - size / 2, size, size)
    }
  }
  // One highlight from the lamp: soft on sugar, hard on jelly.
  c.fillStyle = glossy ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)'
  c.beginPath()
  c.ellipse(-0.36 * r, -0.5 * r, (glossy ? 0.26 : 0.3) * r, (glossy ? 0.08 : 0.15) * r, -0.6, 0, TAU)
  c.fill()
  if (glossy) {
    c.beginPath()
    c.arc(-0.6 * r, -0.2 * r, 0.05 * r, 0, TAU)
    c.fill()
  }
  if (powers === ICE || powers === (CHILLI | ICE)) {
    // The cube's own inner edges.
    c.strokeStyle = 'rgba(255, 255, 255, 0.75)'
    c.lineWidth = 0.05 * r
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(-0.58 * r, 0.3 * r)
    c.lineTo(-0.58 * r, -0.5 * r)
    c.quadraticCurveTo(-0.58 * r, -0.6 * r, -0.44 * r, -0.6 * r)
    c.stroke()
  }
  c.restore()

  if (powers & ICE && (layers || powers & JELLY)) snow(c, layers ? r : r * 0.86)
  if (powers & CHILLI && (layers || powers & JELLY)) flame(c, r, layers ? 0.5 : 0.34, layers ? -0.86 : -1.02, 0.36)
  if (powers === (CHILLI | ICE)) {
    // Steam from the top of the cube.
    c.strokeStyle = 'rgba(255, 255, 255, 0.75)'
    c.lineWidth = 0.07 * r
    c.lineCap = 'round'
    for (const x of [-0.25, 0.2]) {
      c.beginPath()
      c.moveTo(x * r, -0.9 * r)
      c.bezierCurveTo((x + 0.16) * r, -1.02 * r, (x - 0.16) * r, -1.16 * r, x * r, -1.3 * r)
      c.stroke()
    }
  }

  face(c, k, r, mood)

  // The coloured glow a see-through sweet throws on what it stands on.
  c.save()
  c.globalCompositeOperation = 'destination-over'
  c.globalAlpha = 0.3
  c.fillStyle = HUES[thingsOf(k)[0]].body
  c.beginPath()
  c.ellipse(0, 0.9 * r, 0.8 * r, 0.14 * r, 0, 0, TAU)
  c.fill()
  c.restore()
}

/** Two eyes and a mouth, and nothing else. */
function face(c: C, k: Kind, r: number, mood: Mood): void {
  const at = faceAt(k)
  const u = r * at.s
  c.save()
  c.translate(at.x * r, at.y * r)
  c.fillStyle = INK
  c.strokeStyle = INK
  c.lineCap = 'round'
  c.lineWidth = 0.055 * u
  const gap = 0.27 * u
  const shut = mood === 'shut' || mood === 'yawn'
  for (const side of [-1, 1]) {
    if (shut) {
      c.beginPath()
      c.arc(side * gap, -0.03 * u, 0.1 * u, Math.PI * 1.15, Math.PI * 1.85)
      c.stroke()
      continue
    }
    const size = (mood === 'squeezed' ? 0.14 : mood === 'glee' ? 0.12 : 0.105) * u
    if (mood === 'squeezed') {
      c.fillStyle = '#ffffff'
      c.beginPath()
      c.arc(side * gap, 0, size, 0, TAU)
      c.fill()
      c.fillStyle = INK
      c.beginPath()
      c.arc(side * gap, 0, size * 0.5, 0, TAU)
      c.fill()
      continue
    }
    c.beginPath()
    c.arc(side * gap, 0, size, 0, TAU)
    c.fill()
    c.fillStyle = '#ffffff'
    c.beginPath()
    c.arc(side * gap - size * 0.3, -size * 0.35, size * 0.34, 0, TAU)
    c.fill()
    c.fillStyle = INK
  }
  const my = 0.24 * u
  if (mood === 'glee') {
    c.beginPath()
    c.arc(0, my - 0.03 * u, 0.15 * u, 0, Math.PI)
    c.closePath()
    c.fill()
    c.fillStyle = '#ff7f8e'
    c.beginPath()
    c.ellipse(0, my + 0.07 * u, 0.08 * u, 0.045 * u, 0, 0, TAU)
    c.fill()
  } else if (mood === 'yawn') {
    c.beginPath()
    c.ellipse(0, my + 0.03 * u, 0.11 * u, 0.15 * u, 0, 0, TAU)
    c.fill()
  } else if (mood === 'squeezed') {
    c.beginPath()
    c.moveTo(-0.13 * u, my)
    c.quadraticCurveTo(-0.065 * u, my - 0.07 * u, 0, my)
    c.quadraticCurveTo(0.065 * u, my + 0.07 * u, 0.13 * u, my)
    c.stroke()
  } else {
    c.beginPath()
    c.arc(0, my - 0.1 * u, 0.14 * u, Math.PI * 0.2, Math.PI * 0.8)
    c.stroke()
  }
  c.restore()
}
