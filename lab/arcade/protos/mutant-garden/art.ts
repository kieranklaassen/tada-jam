// Art for Mutant Garden: emoji sprites with recoloured "mutation" variants
// (gold, frost, a dark silhouette for locked seeds), the painted backdrop, a
// coin, and the crow. Nothing here runs at import time.

import { TAU, clamp, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

export type Tint = 'plain' | 'gold' | 'frost' | 'dark' | 'melon'

const GLYPH = 200
const CANVAS = 280

export interface Sprites {
  draw(g: CanvasRenderingContext2D, char: string, x: number, y: number, size: number, tint?: Tint, rot?: number): void
}

// Emoji drawn once to an offscreen canvas. The tinted variants are made by
// remapping each pixel's brightness onto a colour ramp, so a golden tomato
// keeps its shading (and it works in every browser, unlike blend modes).
export function createSprites(): Sprites {
  const cache = new Map<string, HTMLCanvasElement>()

  const make = (char: string, tint: Tint): HTMLCanvasElement => {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS
    canvas.height = CANVAS
    const c = canvas.getContext('2d', { willReadFrequently: tint !== 'plain' })
    if (!c) return canvas
    c.font = `${GLYPH}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(char, CANVAS / 2, CANVAS / 2 + GLYPH * 0.06)
    if (tint === 'plain') return canvas
    const image = c.getImageData(0, 0, CANVAS, CANVAS)
    const d = image.data
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue
      const r = d[i]!
      const gg = d[i + 1]!
      const b = d[i + 2]!
      const lum = (0.3 * r + 0.59 * gg + 0.11 * b) / 255
      if (tint === 'gold') {
        const k = clamp((lum - 0.08) / 0.8, 0, 1)
        if (k < 0.5) {
          const t = k / 0.5
          d[i] = lerp(165, 255, t)
          d[i + 1] = lerp(96, 198, t)
          d[i + 2] = lerp(0, 26, t)
        } else {
          const t = (k - 0.5) / 0.5
          d[i] = 255
          d[i + 1] = lerp(198, 240, t)
          d[i + 2] = lerp(26, 140, t)
        }
      } else if (tint === 'frost') {
        d[i] = lerp(r, lerp(90, 235, lum), 0.62)
        d[i + 1] = lerp(gg, lerp(165, 250, lum), 0.62)
        d[i + 2] = lerp(b, lerp(230, 255, lum), 0.62)
      } else if (tint === 'melon') {
        // The moon emoji is all bright yellows, so stretch its narrow range.
        const k = clamp((lum - 0.56) / 0.36, 0, 1)
        d[i] = lerp(18, 176, k)
        d[i + 1] = lerp(112, 250, k)
        d[i + 2] = lerp(72, 138, k)
      } else {
        d[i] = 52
        d[i + 1] = 40
        d[i + 2] = 34
        d[i + 3] = d[i + 3]! * 0.8
      }
    }
    c.putImageData(image, 0, 0)
    return canvas
  }

  return {
    draw(g, char, x, y, size, tint = 'plain', rot = 0) {
      const key = tint + char
      let img = cache.get(key)
      if (!img) {
        img = make(char, tint)
        cache.set(key, img)
      }
      const s = (size / GLYPH) * CANVAS
      if (rot === 0) {
        g.drawImage(img, x - s / 2, y - s / 2, s, s)
        return
      }
      g.save()
      g.translate(x, y)
      g.rotate(rot)
      g.drawImage(img, -s / 2, -s / 2, s, s)
      g.restore()
    },
  }
}

export function coin(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fillStyle = '#ffc928'
  g.fill()
  g.lineWidth = Math.max(2, r * 0.2)
  g.strokeStyle = '#b8770a'
  g.stroke()
  g.beginPath()
  g.arc(x, y, r * 0.58, 0, TAU)
  g.strokeStyle = '#ffe88a'
  g.lineWidth = Math.max(1.5, r * 0.16)
  g.stroke()
  g.beginPath()
  g.arc(x - r * 0.3, y - r * 0.32, r * 0.16, 0, TAU)
  g.fillStyle = 'rgba(255,255,255,0.85)'
  g.fill()
}

function blob(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  g.beginPath()
  g.ellipse(x, y, rx, ry, rot, 0, TAU)
  g.fillStyle = fill
  g.fill()
}

// A fluffy cloud centred on (x, y), about 2 * r wide.
export function cloud(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill
  g.beginPath()
  g.arc(x - r * 0.62, y + r * 0.1, r * 0.42, 0, TAU)
  g.arc(x - r * 0.18, y - r * 0.16, r * 0.54, 0, TAU)
  g.arc(x + r * 0.36, y - r * 0.04, r * 0.46, 0, TAU)
  g.arc(x + r * 0.76, y + r * 0.14, r * 0.34, 0, TAU)
  g.rect(x - r * 0.7, y + r * 0.08, r * 1.5, r * 0.4)
  g.fill()
}

function tree(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  g.fillStyle = '#8a5a33'
  g.fillRect(x - 5 * s, y - 28 * s, 10 * s, 30 * s)
  blob(g, x, y - 44 * s, 26 * s, 26 * s, '#3f9e54')
  blob(g, x - 16 * s, y - 34 * s, 18 * s, 17 * s, '#3f9e54')
  blob(g, x + 17 * s, y - 35 * s, 18 * s, 17 * s, '#3f9e54')
  blob(g, x - 7 * s, y - 52 * s, 13 * s, 11 * s, '#5cbb69')
}

// Everything that never changes: sky, hills, barn, fence, lawn, the raised
// soil bed, and the seed stall along the bottom.
export function paintBackdrop(rand: () => number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')
  if (!g) return canvas

  const sky = g.createLinearGradient(0, 0, 0, 190)
  sky.addColorStop(0, '#4fb4ff')
  sky.addColorStop(1, '#c8eeff')
  g.fillStyle = sky
  g.fillRect(0, 0, W, 200)

  // Far hills.
  blob(g, 240, 200, 430, 92, '#9be27f')
  blob(g, 860, 210, 520, 104, '#87d672')
  blob(g, 560, 215, 300, 70, '#7acb68')
  tree(g, 330, 132, 0.9)
  tree(g, 385, 140, 0.65)
  tree(g, 790, 128, 0.8)

  // A little red barn on the hill.
  const bx = 600
  const by = 150
  g.fillStyle = '#d9483b'
  g.fillRect(bx - 36, by - 40, 72, 44)
  g.beginPath()
  g.moveTo(bx - 44, by - 38)
  g.lineTo(bx - 22, by - 66)
  g.lineTo(bx + 22, by - 66)
  g.lineTo(bx + 44, by - 38)
  g.closePath()
  g.fillStyle = '#a8322a'
  g.fill()
  g.fillStyle = '#fff4e0'
  g.fillRect(bx - 11, by - 24, 22, 28)
  g.fillStyle = '#7a221c'
  g.fillRect(bx - 8, by - 21, 16, 25)
  g.fillStyle = '#fff4e0'
  g.fillRect(bx - 7, by - 56, 14, 11)

  // Lawn.
  const lawn = g.createLinearGradient(0, 160, 0, 620)
  lawn.addColorStop(0, '#86d964')
  lawn.addColorStop(1, '#59b748')
  g.fillStyle = lawn
  g.beginPath()
  g.moveTo(0, 176)
  g.quadraticCurveTo(W / 2, 150, W, 176)
  g.lineTo(W, H)
  g.lineTo(0, H)
  g.closePath()
  g.fill()
  // Mowing stripes.
  g.save()
  g.beginPath()
  g.rect(0, 172, W, 460)
  g.clip()
  g.fillStyle = 'rgba(255,255,255,0.07)'
  for (let x = -200; x < W + 200; x += 150) {
    g.beginPath()
    g.moveTo(x, 640)
    g.lineTo(x + 75, 640)
    g.lineTo(x + 155, 160)
    g.lineTo(x + 100, 160)
    g.closePath()
    g.fill()
  }
  g.restore()

  // Picket fence.
  g.fillStyle = '#e8d9bd'
  g.fillRect(0, 148, W, 7)
  g.fillRect(0, 170, W, 7)
  for (let x = 8; x < W; x += 30) {
    g.beginPath()
    g.moveTo(x, 190)
    g.lineTo(x, 140)
    g.lineTo(x + 9, 130)
    g.lineTo(x + 18, 140)
    g.lineTo(x + 18, 190)
    g.closePath()
    g.fillStyle = '#fffaf0'
    g.fill()
    g.fillStyle = 'rgba(160,130,90,0.25)'
    g.fillRect(x + 13, 140, 5, 50)
  }
  g.fillStyle = 'rgba(40,90,30,0.18)'
  g.fillRect(0, 188, W, 8)

  // Grass tufts and tiny flowers on the open lawn.
  for (let i = 0; i < 90; i++) {
    const x = rand() * W
    const y = 205 + rand() * 390
    if (x > 8 && x < 842 && y > 190) continue
    g.strokeStyle = rand() < 0.5 ? '#4aa53c' : '#9be57a'
    g.lineWidth = 3
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(x - 5, y)
    g.lineTo(x - 8, y - 9)
    g.moveTo(x, y)
    g.lineTo(x, y - 12)
    g.moveTo(x + 5, y)
    g.lineTo(x + 8, y - 9)
    g.stroke()
  }

  // The raised bed: a plank frame around rich soil.
  g.fillStyle = 'rgba(30,70,25,0.25)'
  g.beginPath()
  g.roundRect(14, 196, 830, 410, 30)
  g.fill()
  g.beginPath()
  g.roundRect(12, 186, 830, 410, 30)
  g.fillStyle = '#c08a52'
  g.fill()
  g.lineWidth = 5
  g.strokeStyle = '#8a5a2e'
  g.stroke()
  g.beginPath()
  g.roundRect(28, 202, 798, 378, 20)
  const soil = g.createLinearGradient(0, 202, 0, 580)
  soil.addColorStop(0, '#9a6238')
  soil.addColorStop(1, '#86522c')
  g.fillStyle = soil
  g.fill()
  g.save()
  g.clip()
  g.fillStyle = 'rgba(60,30,10,0.25)'
  g.fillRect(28, 202, 798, 12)
  for (let i = 0; i < 260; i++) {
    const x = 30 + rand() * 794
    const y = 206 + rand() * 370
    g.fillStyle = rand() < 0.5 ? 'rgba(70,38,16,0.35)' : 'rgba(190,140,90,0.3)'
    g.beginPath()
    g.ellipse(x, y, 2 + rand() * 4, 1.5 + rand() * 2, 0, 0, TAU)
    g.fill()
  }
  g.restore()
  // Plank nails.
  g.fillStyle = '#8a5a2e'
  for (const [x, y] of [[24, 200], [830, 200], [24, 582], [830, 582]] as const) {
    g.beginPath()
    g.arc(x, y, 4, 0, TAU)
    g.fill()
  }

  // The seed stall: a wooden counter under a striped awning.
  const wood = g.createLinearGradient(0, 612, 0, H)
  wood.addColorStop(0, '#c98b4c')
  wood.addColorStop(1, '#a36a34')
  g.fillStyle = wood
  g.fillRect(0, 612, W, H - 612)
  g.strokeStyle = 'rgba(90,50,20,0.28)'
  g.lineWidth = 3
  for (const y of [690, 772]) {
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(W, y)
    g.stroke()
  }
  for (let i = 0; i < 16; i++) {
    const x = rand() * W
    const y = 640 + rand() * 170
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + 40 + rand() * 60, y)
    g.stroke()
  }
  g.fillStyle = 'rgba(60,30,10,0.35)'
  g.fillRect(0, 612, W, 22)
  const stripe = W / 20
  for (let i = 0; i < 20; i++) {
    g.fillStyle = i % 2 === 0 ? '#ff5d5d' : '#fff6e6'
    g.beginPath()
    g.rect(i * stripe, 596, stripe, 20)
    g.arc(i * stripe + stripe / 2, 616, stripe / 2, 0, Math.PI)
    g.fill()
  }
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.fillRect(0, 596, W, 4)
  return canvas
}

// A round, grumpy, harmless crow. (x, y) is its feet; `dir` is 1 facing right.
// `flap` is -1..1 for the wing, `tip` tilts the whole bird forward to peck.
export function crowBird(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  flap: number,
  tip: number,
  spin: number,
  flying: boolean,
  dizzy: boolean,
  blink: number,
): void {
  g.save()
  g.translate(x, y - 40)
  g.rotate(spin)
  g.scale(dir, 1)
  g.rotate(tip)
  if (!flying) {
    g.strokeStyle = '#ffa12e'
    g.lineWidth = 5
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(-8, 24)
    g.lineTo(-8, 40)
    g.moveTo(10, 24)
    g.lineTo(10, 40)
    g.stroke()
  }
  // Tail.
  g.beginPath()
  g.moveTo(-30, -4)
  g.lineTo(-66, -22)
  g.lineTo(-62, 8)
  g.closePath()
  g.fillStyle = '#1b1b27'
  g.fill()
  blob(g, 0, 0, 42, 32, '#2a2a3c')
  blob(g, 8, 10, 26, 16, '#3a3a52')
  g.beginPath()
  g.arc(30, -26, 24, 0, TAU)
  g.fillStyle = '#2a2a3c'
  g.fill()
  // Head tuft.
  g.beginPath()
  g.moveTo(22, -46)
  g.lineTo(18, -62)
  g.lineTo(32, -50)
  g.lineTo(36, -64)
  g.lineTo(40, -46)
  g.closePath()
  g.fill()
  // Beak.
  g.beginPath()
  g.moveTo(50, -32)
  g.lineTo(80, -22)
  g.lineTo(50, -14)
  g.closePath()
  g.fillStyle = '#ffb02e'
  g.fill()
  // Eye.
  if (dizzy) {
    g.strokeStyle = '#ffffff'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(28, -40)
    g.lineTo(44, -26)
    g.moveTo(44, -40)
    g.lineTo(28, -26)
    g.stroke()
  } else {
    g.beginPath()
    g.ellipse(36, -32, 10, 10 * Math.max(0.1, 1 - blink), 0, 0, TAU)
    g.fillStyle = '#ffffff'
    g.fill()
    g.beginPath()
    g.arc(39, -31, 4.5, 0, TAU)
    g.fillStyle = '#14141c'
    g.fill()
    // A grumpy brow.
    g.strokeStyle = '#14141c'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(26, -46)
    g.lineTo(46, -40)
    g.stroke()
  }
  // Wing.
  g.save()
  g.translate(-6, -8)
  g.rotate(flying ? -0.4 - flap * 0.9 : 0.25)
  g.beginPath()
  g.ellipse(-16, 0, 32, flying ? 15 : 13, 0, 0, TAU)
  g.fillStyle = '#1b1b27'
  g.fill()
  g.restore()
  g.restore()
}
