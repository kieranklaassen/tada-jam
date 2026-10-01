// Everything Fruit Slicer draws that is worth caching: the painted plank wall,
// the awning, the crates along the bottom, the procedural watermelon and golden
// fruit, tinted juice splats, and the smoothie glass that watches the fruit.
// All canvases are made inside `makeArt`, which `create` calls.

import { ellipse, face, sprite, squash, volume } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

export interface Kind {
  id: string
  // An emoji, or null when `drawn` names a procedural sprite.
  ch: string | null
  drawn?: 'melon' | 'gold'
  r: number
  juice: string
  flesh: string
  rim: string
  // Width of the cut face as a share of the radius; 0 draws no cut face.
  fw: number
}

export const FRUITS: readonly Kind[] = [
  { id: 'orange', ch: '🍊', r: 54, juice: '#ff9a1f', flesh: '#ffc163', rim: '#ff8a00', fw: 0.9 },
  { id: 'apple', ch: '🍎', r: 54, juice: '#f23d55', flesh: '#fff3cf', rim: '#e0243f', fw: 0.88 },
  { id: 'lemon', ch: '🍋', r: 52, juice: '#ffe23d', flesh: '#fff7a8', rim: '#f5c400', fw: 0.84 },
  { id: 'peach', ch: '🍑', r: 54, juice: '#ff8a5c', flesh: '#ffd08a', rim: '#ff6f61', fw: 0.88 },
  { id: 'pear', ch: '🍐', r: 54, juice: '#c4e04a', flesh: '#f8fad2', rim: '#a9c92e', fw: 0.7 },
  { id: 'mango', ch: '🥭', r: 54, juice: '#ffb300', flesh: '#ffd04d', rim: '#f08a1c', fw: 0.84 },
  { id: 'strawberry', ch: '🍓', r: 48, juice: '#ff2f55', flesh: '#ff9bb0', rim: '#e01b41', fw: 0.72 },
  { id: 'grapes', ch: '🍇', r: 52, juice: '#9a4be0', flesh: '#d3b0f5', rim: '#7a2fc2', fw: 0.66 },
  { id: 'pineapple', ch: '🍍', r: 62, juice: '#ffd21f', flesh: '#ffee8a', rim: '#d99a1c', fw: 0.58 },
  { id: 'blueberry', ch: '🫐', r: 48, juice: '#5468f0', flesh: '#aab4ff', rim: '#3a49c4', fw: 0.8 },
]
export const MELON: Kind = { id: 'melon', ch: null, drawn: 'melon', r: 76, juice: '#ff3b5c', flesh: '#ff4560', rim: '#1f8a3b', fw: 0.98 }
export const GOLD: Kind = { id: 'gold', ch: null, drawn: 'gold', r: 58, juice: '#ffd21f', flesh: '#fff6b0', rim: '#f0a800', fw: 0.94 }
export const SOCK: Kind = { id: 'sock', ch: '🧦', r: 58, juice: '#9bd13a', flesh: '#9bd13a', rim: '#9bd13a', fw: 0 }
export const CACTUS: Kind = { id: 'cactus', ch: '🌵', r: 62, juice: '#5fbf4a', flesh: '#c6efa0', rim: '#2f8f3a', fw: 0.5 }

export interface JuiceLayer {
  color: string
  amt: number
}

export interface JugState {
  x: number
  baseY: number
  layers: readonly JuiceLayer[]
  // Slices that fill the glass, and how much of the fill is showing (drains to 0).
  cap: number
  drain: number
  stretch: number
  tilt: number
  mood: Mood
  lookX: number
  lookY: number
  blink: number
  time: number
}

export interface Art {
  backdrop: HTMLCanvasElement
  awning: HTMLCanvasElement
  front: HTMLCanvasElement
  readonly frontTop: number
  drawWhole(g: CanvasRenderingContext2D, kind: Kind, r: number): void
  drawCutFace(g: CanvasRenderingContext2D, kind: Kind, r: number): void
  splat(shape: number, color: string): HTMLCanvasElement
  readonly splatShapes: number
  drawJug(g: CanvasRenderingContext2D, jug: JugState): void
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w)
  canvas.height = Math.ceil(h)
  const g = canvas.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.lineCap = 'round'
  g.lineJoin = 'round'
  return [canvas, g]
}

const FRONT_H = 136
const MELON_PX = 340
const GOLD_PX = 200
const SPLAT_PX = 280

function paintBackdrop(rand: () => number): HTMLCanvasElement {
  const [canvas, g] = makeCanvas(W, H)
  const plank = 118
  for (let i = 0; i * plank < W; i++) {
    const x = i * plank
    const shade = rand()
    g.fillStyle = `hsl(${184 + shade * 8}, ${50 + shade * 8}%, ${41 + shade * 7}%)`
    g.fillRect(x, 0, plank, H)
    // Grain: long, slightly wandering strokes, some light and some dark.
    for (let k = 0; k < 9; k++) {
      const gx = x + 8 + rand() * (plank - 16)
      g.strokeStyle = rand() < 0.5 ? 'rgba(255,255,255,0.055)' : 'rgba(0,30,40,0.09)'
      g.lineWidth = 1.5 + rand() * 3
      g.beginPath()
      const y0 = rand() * H * 0.6
      g.moveTo(gx, y0)
      g.bezierCurveTo(gx + (rand() - 0.5) * 22, y0 + 120, gx + (rand() - 0.5) * 22, y0 + 240, gx + (rand() - 0.5) * 10, y0 + 260 + rand() * 300)
      g.stroke()
    }
    // A board joint and a knot here and there.
    if (rand() < 0.7) {
      const jy = 140 + rand() * (H - 320)
      g.fillStyle = 'rgba(0,25,35,0.3)'
      g.fillRect(x, jy, plank, 4)
      g.fillStyle = 'rgba(255,255,255,0.08)'
      g.fillRect(x, jy + 4, plank, 2)
    }
    if (rand() < 0.5) {
      const kx = x + 24 + rand() * (plank - 48)
      const ky = 120 + rand() * (H - 300)
      g.strokeStyle = 'rgba(0,30,40,0.16)'
      g.lineWidth = 3
      for (let r = 5; r < 18; r += 6) {
        g.beginPath()
        g.ellipse(kx, ky, r, r * 1.5, 0, 0, TAU)
        g.stroke()
      }
    }
    g.fillStyle = 'rgba(0,25,35,0.34)'
    g.fillRect(x - 2, 0, 4, H)
    g.fillStyle = 'rgba(255,255,255,0.09)'
    g.fillRect(x + 2, 0, 2, H)
  }
  // A pool of light in the middle, and darker corners so the fruit pops.
  const light = g.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.42, 640)
  light.addColorStop(0, 'rgba(255,255,230,0.2)')
  light.addColorStop(1, 'rgba(255,255,230,0)')
  g.fillStyle = light
  g.fillRect(0, 0, W, H)
  const dark = g.createRadialGradient(W / 2, H * 0.45, 380, W / 2, H * 0.45, 860)
  dark.addColorStop(0, 'rgba(0,20,30,0)')
  dark.addColorStop(1, 'rgba(0,20,30,0.36)')
  g.fillStyle = dark
  g.fillRect(0, 0, W, H)
  const under = g.createLinearGradient(0, 60, 0, 170)
  under.addColorStop(0, 'rgba(0,20,30,0.4)')
  under.addColorStop(1, 'rgba(0,20,30,0)')
  g.fillStyle = under
  g.fillRect(0, 0, W, 170)
  return canvas
}

function paintAwning(): HTMLCanvasElement {
  const [canvas, g] = makeCanvas(W, 120)
  const stripe = W / 20
  const edge = 58
  const scallops = (dy: number) => {
    g.beginPath()
    g.rect(0, 0, W, edge + dy)
    for (let i = 0; i < 20; i++) {
      g.moveTo(i * stripe + stripe, edge + dy)
      g.arc(i * stripe + stripe / 2, edge + dy, stripe / 2, 0, Math.PI)
    }
  }
  scallops(10)
  g.fillStyle = 'rgba(0,20,30,0.3)'
  g.fill()
  for (let i = 0; i < 20; i++) {
    g.fillStyle = i % 2 === 0 ? '#ff5a5f' : '#fff4e6'
    g.beginPath()
    g.rect(i * stripe, 0, stripe + 0.5, edge)
    g.arc(i * stripe + stripe / 2, edge, stripe / 2, 0, Math.PI)
    g.fill()
  }
  const shade = g.createLinearGradient(0, 0, 0, 90)
  shade.addColorStop(0, 'rgba(60,0,20,0.28)')
  shade.addColorStop(0.5, 'rgba(60,0,20,0)')
  shade.addColorStop(1, 'rgba(60,0,20,0.14)')
  scallops(0)
  g.fillStyle = shade
  g.fill()
  return canvas
}

function paintFront(rand: () => number): HTMLCanvasElement {
  const [canvas, g] = makeCanvas(W, FRONT_H)
  const top = 56
  // Heaps of fruit peeking over the crates.
  const heap = ['🍊', '🍎', '🍋', '🍐', '🍑', '🍏', '🍊', '🍎', '🥭', '🍋']
  for (let x = 30; x < W - 190; x += 46) {
    const ch = heap[Math.floor(rand() * heap.length)]!
    sprite(g, ch, x + rand() * 10, top - 6 + rand() * 14 + (Math.floor(x / 46) % 2) * 8, 58, (rand() - 0.5) * 0.8)
  }
  const crate = W / 5
  for (let i = 0; i < 5; i++) {
    const x = i * crate
    g.fillStyle = '#c58a4c'
    g.fillRect(x, top, crate, FRONT_H - top)
    for (let k = 0; k < 3; k++) {
      const y = top + 6 + k * 26
      g.fillStyle = k % 2 === 0 ? '#dba463' : '#d0975a'
      g.fillRect(x + 8, y, crate - 16, 21)
      g.fillStyle = 'rgba(255,255,255,0.16)'
      g.fillRect(x + 8, y, crate - 16, 3)
      g.fillStyle = 'rgba(90,50,10,0.18)'
      g.fillRect(x + 8, y + 18, crate - 16, 3)
    }
    g.fillStyle = '#a86f38'
    g.fillRect(x, top, 12, FRONT_H - top)
    g.fillRect(x + crate - 12, top, 12, FRONT_H - top)
    g.fillStyle = 'rgba(60,30,0,0.35)'
    for (const nx of [6, crate - 6]) for (const ny of [top + 16, top + 68]) g.fillRect(x + nx - 2, ny - 2, 4, 4)
  }
  g.fillStyle = '#8f5a2a'
  g.fillRect(0, top - 4, W, 8)
  g.fillStyle = 'rgba(255,255,255,0.2)'
  g.fillRect(0, top - 4, W, 2)
  return canvas
}

function paintMelon(): HTMLCanvasElement {
  const [canvas, g] = makeCanvas(MELON_PX, MELON_PX)
  const c = MELON_PX / 2
  const r = 150
  g.save()
  g.beginPath()
  g.arc(c, c, r, 0, TAU)
  g.clip()
  const body = g.createRadialGradient(c - 50, c - 60, 20, c, c, r * 1.1)
  body.addColorStop(0, '#5fd36a')
  body.addColorStop(0.6, '#2fa84a')
  body.addColorStop(1, '#176b30')
  g.fillStyle = body
  g.fillRect(0, 0, MELON_PX, MELON_PX)
  // Stripes as wobbly longitude lines, so it reads as a ball.
  g.strokeStyle = '#14602b'
  for (let i = -3; i <= 3; i++) {
    const rx = Math.abs(i) * 44 + 1
    g.lineWidth = 17 - Math.abs(i) * 3
    g.beginPath()
    const side = i < 0 ? -1 : 1
    for (let k = 0; k <= 24; k++) {
      const a = -Math.PI / 2 + (k / 24) * Math.PI
      const wob = Math.sin(k * 1.9 + i) * 5
      const x = c + side * Math.cos(a) * rx + wob
      const y = c + Math.sin(a) * r
      if (k === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }
  const rimShade = g.createRadialGradient(c, c, r * 0.7, c, c, r)
  rimShade.addColorStop(0, 'rgba(0,40,10,0)')
  rimShade.addColorStop(1, 'rgba(0,40,10,0.4)')
  g.fillStyle = rimShade
  g.fillRect(0, 0, MELON_PX, MELON_PX)
  g.restore()
  ellipse(g, c - 58, c - 78, 44, 22, 'rgba(255,255,255,0.38)', -0.6)
  ellipse(g, c - 96, c - 30, 10, 18, 'rgba(255,255,255,0.25)', 0.3)
  g.strokeStyle = '#0f4f22'
  g.lineWidth = 5
  g.beginPath()
  g.arc(c, c, r, 0, TAU)
  g.stroke()
  return canvas
}

function paintGold(): HTMLCanvasElement {
  const [canvas, g] = makeCanvas(GOLD_PX, GOLD_PX)
  const c = GOLD_PX / 2
  const r = 74
  g.strokeStyle = '#8a5a12'
  g.lineWidth = 8
  g.beginPath()
  g.moveTo(c, c - r + 8)
  g.quadraticCurveTo(c + 4, c - r - 14, c + 14, c - r - 20)
  g.stroke()
  ellipse(g, c + 30, c - r - 8, 22, 10, '#7bd88f', -0.5)
  const body = g.createRadialGradient(c - 24, c - 28, 8, c, c, r)
  body.addColorStop(0, '#fffbd0')
  body.addColorStop(0.45, '#ffd21f')
  body.addColorStop(1, '#e08a00')
  g.fillStyle = body
  g.beginPath()
  g.arc(c - 18, c + 4, r - 16, 0, TAU)
  g.arc(c + 18, c + 4, r - 16, 0, TAU)
  g.fill()
  g.strokeStyle = '#b86a00'
  g.lineWidth = 4
  g.beginPath()
  g.arc(c - 18, c + 4, r - 16, Math.PI * 0.35, Math.PI * 1.62)
  g.stroke()
  g.beginPath()
  g.arc(c + 18, c + 4, r - 16, -Math.PI * 0.62, Math.PI * 0.65)
  g.stroke()
  ellipse(g, c - 34, c - 26, 20, 11, 'rgba(255,255,255,0.75)', -0.6)
  g.fillStyle = 'rgba(255,255,255,0.9)'
  for (const [sx, sy, s] of [
    [c + 34, c - 18, 13],
    [c - 8, c + 34, 8],
  ] as const) {
    g.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8
      const rr = i % 2 === 0 ? s : s * 0.3
      g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr)
    }
    g.closePath()
    g.fill()
  }
  return canvas
}

type Blob = readonly [number, number, number]

function makeSplatShapes(rand: () => number): Blob[][] {
  const shapes: Blob[][] = []
  for (let s = 0; s < 5; s++) {
    const blobs: Blob[] = [[0, 0, 40 + rand() * 8]]
    const lobes = 8 + Math.floor(rand() * 3)
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * TAU + rand() * 0.5
      const d = 22 + rand() * 24
      blobs.push([Math.cos(a) * d, Math.sin(a) * d, 22 + rand() * 16])
    }
    const arms = 6 + Math.floor(rand() * 4)
    for (let i = 0; i < arms; i++) {
      const a = rand() * TAU
      const d = 78 + rand() * 46
      const r = 6 + rand() * 9
      blobs.push([Math.cos(a) * d, Math.sin(a) * d, r])
      // A neck back towards the middle, so the droplet looks flung.
      if (rand() < 0.7) {
        for (let k = 1; k <= 3; k++) {
          const dd = d - k * (d - 50) * 0.3
          blobs.push([Math.cos(a) * dd, Math.sin(a) * dd, r * (0.6 + k * 0.12)])
        }
      }
    }
    shapes.push(blobs)
  }
  return shapes
}

export function makeArt(rand: () => number): Art {
  const backdrop = paintBackdrop(rand)
  const awning = paintAwning()
  const front = paintFront(rand)
  const melon = paintMelon()
  const gold = paintGold()
  const shapes = makeSplatShapes(rand)
  const splats = new Map<string, HTMLCanvasElement>()

  const drawWhole = (g: CanvasRenderingContext2D, kind: Kind, r: number): void => {
    if (kind.drawn === 'melon') {
      const s = (r / 150) * MELON_PX
      g.drawImage(melon, -s / 2, -s / 2, s, s)
    } else if (kind.drawn === 'gold') {
      const s = (r / 74) * GOLD_PX
      g.drawImage(gold, -s / 2, -s / 2, s, s)
    } else if (kind.ch) {
      sprite(g, kind.ch, 0, 0, r * 2.1)
    }
  }

  const drawCutFace = (g: CanvasRenderingContext2D, kind: Kind, r: number): void => {
    if (kind.fw <= 0) return
    const rx = r * kind.fw
    const ry = r * (kind.drawn === 'melon' ? 0.34 : 0.3)
    ellipse(g, 0, 0, rx, ry, kind.rim)
    if (kind.drawn === 'melon') {
      ellipse(g, 0, 0, rx * 0.93, ry * 0.88, '#e4f7cc')
      ellipse(g, 0, 0, rx * 0.84, ry * 0.76, '#ff4560')
      ellipse(g, -rx * 0.2, -ry * 0.18, rx * 0.4, ry * 0.3, 'rgba(255,255,255,0.18)')
      for (const [sx, sy] of [
        [-0.5, 0.1],
        [-0.22, -0.3],
        [0.08, 0.28],
        [0.34, -0.18],
        [0.58, 0.16],
        [-0.12, 0.05],
      ] as const) {
        ellipse(g, sx * rx, sy * ry, Math.max(1.5, r * 0.035), Math.max(1, r * 0.022), '#3a1420', 0.5)
      }
    } else {
      ellipse(g, 0, 0, rx * 0.86, ry * 0.78, kind.flesh)
      ellipse(g, -rx * 0.22, -ry * 0.2, rx * 0.36, ry * 0.3, 'rgba(255,255,255,0.4)')
      ellipse(g, 0, 0, rx * 0.1, ry * 0.12, kind.rim)
    }
  }

  const splat = (shape: number, color: string): HTMLCanvasElement => {
    const key = `${shape}|${color}`
    let canvas = splats.get(key)
    if (canvas) return canvas
    const made = makeCanvas(SPLAT_PX, SPLAT_PX)
    canvas = made[0]
    const g = made[1]
    const c = SPLAT_PX / 2
    const blobs = shapes[shape % shapes.length]!
    g.fillStyle = color
    g.beginPath()
    for (const [x, y, r] of blobs) {
      g.moveTo(c + x + r, c + y)
      g.arc(c + x, c + y, r, 0, TAU)
    }
    g.fill()
    // A wet shine and a darker pool, inside the blob only.
    g.globalCompositeOperation = 'source-atop'
    ellipse(g, c + 6, c + 14, 46, 38, 'rgba(0,0,0,0.1)')
    ellipse(g, c - 16, c - 20, 24, 13, 'rgba(255,255,255,0.4)', -0.5)
    ellipse(g, c + 24, c - 28, 7, 5, 'rgba(255,255,255,0.35)')
    splats.set(key, canvas)
    return canvas
  }

  const glassPath = (g: CanvasRenderingContext2D, x: number, top: number, base: number): void => {
    g.beginPath()
    g.moveTo(x - 58, top)
    g.lineTo(x + 58, top)
    g.lineTo(x + 46, base - 16)
    g.quadraticCurveTo(x + 44, base, x + 28, base)
    g.lineTo(x - 28, base)
    g.quadraticCurveTo(x - 44, base, x - 46, base - 16)
    g.closePath()
  }

  const drawJug = (g: CanvasRenderingContext2D, jug: JugState): void => {
    const { x, baseY } = jug
    const tall = 156
    const top = baseY - tall
    ellipse(g, x, baseY + 2, 62, 12, 'rgba(0,0,0,0.25)')
    const [sx, sy] = volume(jug.stretch)
    squash(
      g,
      x,
      baseY,
      sx,
      sy,
      () => {
        // The straw sits behind the glass front.
        g.strokeStyle = '#ff7ac8'
        g.lineWidth = 12
        g.beginPath()
        g.moveTo(x + 6, baseY - 22)
        g.lineTo(x + 34, top - 40)
        g.lineTo(x + 62, top - 48)
        g.stroke()
        g.strokeStyle = '#ffffff'
        g.lineWidth = 12
        g.setLineDash([7, 17])
        g.lineCap = 'butt'
        g.beginPath()
        g.moveTo(x + 6, baseY - 22)
        g.lineTo(x + 34, top - 40)
        g.stroke()
        g.setLineDash([])
        g.lineCap = 'round'

        glassPath(g, x, top, baseY)
        g.fillStyle = 'rgba(235,250,255,0.42)'
        g.fill()
        g.save()
        glassPath(g, x, top, baseY)
        g.clip()
        const inner = tall - 14
        let y = baseY
        let total = 0
        for (const layer of jug.layers) total += layer.amt
        const scale = (inner / Math.max(1, jug.cap)) * jug.drain
        for (const layer of jug.layers) {
          const h = layer.amt * scale
          g.fillStyle = layer.color
          g.fillRect(x - 64, y - h - 0.5, 128, h + 1)
          y -= h
        }
        if (total > 0 && jug.drain > 0.02) {
          // A sloshing surface and a few bubbles.
          const slosh = Math.sin(jug.time * 3.1) * 3
          ellipse(g, x, y + 1, 64, 5 + Math.abs(slosh) * 0.4, 'rgba(255,255,255,0.45)', slosh * 0.01)
          g.fillStyle = 'rgba(255,255,255,0.4)'
          for (let i = 0; i < 4; i++) {
            const span = baseY - y
            if (span < 16) break
            const by = baseY - ((jug.time * (26 + i * 9) + i * 37) % span)
            g.beginPath()
            g.arc(x - 30 + i * 19 + Math.sin(jug.time * 2 + i) * 4, by, 3 + (i % 2) * 2, 0, TAU)
            g.fill()
          }
        }
        g.restore()
        glassPath(g, x, top, baseY)
        g.strokeStyle = 'rgba(255,255,255,0.92)'
        g.lineWidth = 6
        g.stroke()
        g.strokeStyle = 'rgba(255,255,255,0.55)'
        g.lineWidth = 7
        g.beginPath()
        g.moveTo(x - 42, top + 18)
        g.lineTo(x - 34, baseY - 40)
        g.stroke()
        face(g, x + 2, top + 66, 13, jug.mood, jug.lookX, jug.lookY, jug.blink)
        if (jug.mood === 'happy' || jug.mood === 'yum') {
          ellipse(g, x - 34, top + 88, 9, 6, 'rgba(255,120,150,0.55)')
          ellipse(g, x + 38, top + 88, 9, 6, 'rgba(255,120,150,0.55)')
        }
      },
      jug.tilt,
    )
  }

  return {
    backdrop,
    awning,
    front,
    frontTop: H - FRONT_H + 56,
    drawWhole,
    drawCutFace,
    splat,
    splatShapes: shapes.length,
    drawJug,
  }
}
