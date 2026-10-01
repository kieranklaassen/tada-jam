// Where everything sits, and the parts of the room that never move: wall,
// table, painting board, linen cloth, the enamel tray and the sponge's dish.
// All of it is painted once into offscreen canvases inside `create`.

import { H, W } from '../../kit/types.ts'
import { GH, GW } from './pigment.ts'

export const TABLE_Y = 236
export const CELL = 4
export const PAPER = { x: 278, y: 296, w: GW * CELL, h: GH * CELL }
export const BOARD = { x: 254, y: 274, w: 672, h: 478 }
export const CLOTH = { x: 942, y: 258, w: 232, h: 506 }
export const TRAY = { x: 24, y: 286, w: 218, h: 170 }
export const DISH = { x: 132, y: 600 }
export const LINE_Y = 40
export const SLOTS = [168, 449, 730, 1011] as const
export const THUMB_W = 224
export const THUMB_H = 155
export const BRUSH_HOME = { x: 962, y: 752, angle: 1.28 }

export interface JarSpec {
  x: number
  // Centre of the rim.
  y: number
  rx: number
  ry: number
  h: number
  // 0 red, 1 yellow, 2 blue, -1 the rinsing water.
  pigment: number
}

export const JARS: readonly JarSpec[] = [
  { x: 998, y: 306, rx: 46, ry: 15, h: 78, pigment: 0 },
  { x: 998, y: 446, rx: 46, ry: 15, h: 78, pigment: 1 },
  { x: 998, y: 586, rx: 46, ry: 15, h: 78, pigment: 2 },
  { x: 1114, y: 368, rx: 52, ry: 17, h: 104, pigment: -1 },
]

type G = CanvasRenderingContext2D

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return [c, c.getContext('2d')!]
}

// A closed outline that follows a rectangle the way a hand would cut it.
export function wobblyRect(g: G, x: number, y: number, w: number, h: number, jitter: number, rand: () => number, inset = 10): void {
  const pts: [number, number][] = []
  const side = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0)
    const n = Math.max(2, Math.round(len / 46))
    const nx = -(y1 - y0) / len
    const ny = (x1 - x0) / len
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      const j = (rand() - 0.5) * 2 * jitter
      pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j])
    }
  }
  side(x + inset, y, x + w - inset, y)
  pts.push([x + w - inset * 0.3, y + inset * 0.3])
  side(x + w, y + inset, x + w, y + h - inset)
  pts.push([x + w - inset * 0.3, y + h - inset * 0.3])
  side(x + w - inset, y + h, x + inset, y + h)
  pts.push([x + inset * 0.3, y + h - inset * 0.3])
  side(x, y + h - inset, x, y + inset)
  pts.push([x + inset * 0.3, y + inset * 0.3])
  g.beginPath()
  const last = pts[pts.length - 1]!
  const first = pts[0]!
  g.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2)
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!
    const q = pts[(i + 1) % pts.length]!
    g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
  }
  g.closePath()
}

// Long uneven lines, the way grain runs along a plank.
function grain(g: G, x: number, y: number, w: number, h: number, count: number, color: string, rand: () => number, vertical = false): void {
  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  g.strokeStyle = color
  g.lineCap = 'round'
  const long = vertical ? h : w
  const across = vertical ? w : h
  for (let i = 0; i < count; i++) {
    let a = rand() * across
    const start = -20 + rand() * long * 0.5
    const end = Math.min(long + 20, start + long * (0.35 + rand() * 0.9))
    g.globalAlpha = 0.05 + rand() * 0.11
    g.lineWidth = 0.8 + rand() * 2.2
    g.beginPath()
    for (let s = start; s <= end; s += 34) {
      a += (rand() - 0.5) * 5
      const px = vertical ? x + a : x + s
      const py = vertical ? y + s : y + a
      if (s === start) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.stroke()
  }
  g.restore()
}

function speckle(g: G, w: number, h: number, alpha: number, rand: () => number): void {
  const [tile, t] = makeCanvas(128, 128)
  const data = t.createImageData(128, 128)
  for (let i = 0; i < data.data.length; i += 4) {
    const light = rand() > 0.5
    data.data[i] = light ? 255 : 60
    data.data[i + 1] = light ? 250 : 40
    data.data[i + 2] = light ? 235 : 20
    data.data[i + 3] = rand() * rand() * 255 * alpha
  }
  t.putImageData(data, 0, 0)
  const pattern = g.createPattern(tile, 'repeat')
  if (!pattern) return
  g.fillStyle = pattern
  g.fillRect(0, 0, w, h)
}

function softBlob(g: G, x: number, y: number, rx: number, ry: number, rgb: string, alpha: number): void {
  const grad = g.createRadialGradient(x, y, 0, x, y, 1)
  grad.addColorStop(0, `rgba(${rgb},${alpha})`)
  grad.addColorStop(1, `rgba(${rgb},0)`)
  g.save()
  g.translate(x, y)
  g.scale(rx, ry)
  g.translate(-x, -y)
  g.fillStyle = grad
  g.beginPath()
  g.arc(x, y, 1, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

// `scale` is the device pixel ratio the stage draws at (1 or 2), so the
// cached room is as sharp as the things drawn over it.
export function paintRoom(rand: () => number, scale: number): HTMLCanvasElement {
  const [canvas, g] = makeCanvas(W * scale, H * scale)
  g.scale(scale, scale)
  g.lineCap = 'round'
  g.lineJoin = 'round'

  // The wall: a warm lazure wash, cloudy rather than flat.
  const wall = g.createLinearGradient(0, 0, 0, TABLE_Y)
  wall.addColorStop(0, '#f6e3c8')
  wall.addColorStop(1, '#efd2b0')
  g.fillStyle = wall
  g.fillRect(0, 0, W, TABLE_Y + 4)
  for (let i = 0; i < 46; i++) {
    const tone = i % 3 === 0 ? '252,238,214' : i % 3 === 1 ? '236,186,150' : '244,208,160'
    softBlob(g, rand() * W, rand() * TABLE_Y, 90 + rand() * 170, 50 + rand() * 80, tone, 0.1 + rand() * 0.12)
  }

  // The table: three wide planks seen from the child's seat.
  const wood = g.createLinearGradient(0, TABLE_Y, 0, H)
  wood.addColorStop(0, '#cfa066')
  wood.addColorStop(1, '#bf8b52')
  g.fillStyle = wood
  g.fillRect(0, TABLE_Y, W, H - TABLE_Y)
  const planks = [TABLE_Y, TABLE_Y + 198, TABLE_Y + 396, H]
  for (let i = 0; i < 3; i++) {
    const y0 = planks[i]!
    const y1 = planks[i + 1]!
    g.fillStyle = `rgba(${i === 1 ? '255,226,170' : '120,70,30'},${i === 1 ? 0.06 : 0.035})`
    g.fillRect(0, y0, W, y1 - y0)
    grain(g, 0, y0 + 4, W, y1 - y0 - 8, 46, '#7a4b22', rand)
    for (let k = 0; k < 2; k++) {
      const kx = rand() * W
      const ky = y0 + 30 + rand() * (y1 - y0 - 60)
      if (kx > BOARD.x - 30 && kx < BOARD.x + BOARD.w + 30) continue
      g.strokeStyle = 'rgba(110,66,28,0.22)'
      for (let r = 3; r < 15; r += 4) {
        g.lineWidth = 1.4
        g.beginPath()
        g.ellipse(kx, ky, r * 1.9, r, 0.1, 0, Math.PI * 2)
        g.stroke()
      }
    }
    if (i > 0) {
      g.strokeStyle = 'rgba(92,54,22,0.4)'
      g.lineWidth = 2.5
      g.beginPath()
      g.moveTo(0, y0)
      for (let x = 0; x <= W; x += 60) g.lineTo(x, y0 + (rand() - 0.5) * 1.6)
      g.stroke()
      g.strokeStyle = 'rgba(255,232,190,0.25)'
      g.lineWidth = 1.5
      g.beginPath()
      g.moveTo(0, y0 + 3)
      g.lineTo(W, y0 + 3)
      g.stroke()
    }
  }
  // Where table meets wall: a soft shadow up the wall and a worn bright edge.
  const meet = g.createLinearGradient(0, TABLE_Y - 34, 0, TABLE_Y)
  meet.addColorStop(0, 'rgba(120,70,40,0)')
  meet.addColorStop(1, 'rgba(120,70,40,0.2)')
  g.fillStyle = meet
  g.fillRect(0, TABLE_Y - 34, W, 34)
  g.fillStyle = '#e2b77d'
  g.fillRect(0, TABLE_Y, W, 7)
  g.fillStyle = 'rgba(92,54,22,0.35)'
  g.fillRect(0, TABLE_Y + 7, W, 2)

  // The linen cloth the jars stand on.
  g.fillStyle = 'rgba(70,40,15,0.18)'
  wobblyRect(g, CLOTH.x + 5, CLOTH.y + 7, CLOTH.w, CLOTH.h, 2.5, rand)
  g.fill()
  g.fillStyle = '#ebe2cd'
  wobblyRect(g, CLOTH.x, CLOTH.y, CLOTH.w, CLOTH.h, 2.5, rand)
  g.fill()
  g.save()
  g.clip()
  g.strokeStyle = 'rgba(150,130,95,0.16)'
  g.lineWidth = 1
  for (let x = CLOTH.x; x < CLOTH.x + CLOTH.w; x += 4) {
    g.beginPath()
    g.moveTo(x + rand(), CLOTH.y)
    g.lineTo(x + rand() * 2, CLOTH.y + CLOTH.h)
    g.stroke()
  }
  for (let y = CLOTH.y; y < CLOTH.y + CLOTH.h; y += 4) {
    g.beginPath()
    g.moveTo(CLOTH.x, y + rand())
    g.lineTo(CLOTH.x + CLOTH.w, y + rand() * 2)
    g.stroke()
  }
  // Two woven stripes near each end.
  for (const y of [CLOTH.y + 20, CLOTH.y + 28, CLOTH.y + CLOTH.h - 28, CLOTH.y + CLOTH.h - 20]) {
    g.strokeStyle = 'rgba(176,84,62,0.55)'
    g.lineWidth = 2.6
    g.beginPath()
    g.moveTo(CLOTH.x, y)
    for (let x = CLOTH.x; x <= CLOTH.x + CLOTH.w + 20; x += 30) g.lineTo(x, y + (rand() - 0.5) * 1.5)
    g.stroke()
  }
  softBlob(g, CLOTH.x + CLOTH.w, CLOTH.y + CLOTH.h, 200, 300, '120,90,50', 0.1)
  g.restore()

  // The painting board, a little stained by other days.
  g.fillStyle = 'rgba(60,34,12,0.26)'
  wobblyRect(g, BOARD.x + 6, BOARD.y + 9, BOARD.w, BOARD.h, 1.6, rand, 16)
  g.fill()
  g.fillStyle = '#ead4ab'
  wobblyRect(g, BOARD.x, BOARD.y, BOARD.w, BOARD.h, 1.6, rand, 16)
  g.fill()
  g.save()
  g.clip()
  grain(g, BOARD.x, BOARD.y, BOARD.w, BOARD.h, 70, '#a8804a', rand)
  const stains = ['196,70,70', '226,180,60', '70,110,180', '110,150,90', '200,120,60']
  for (let i = 0; i < 18; i++) {
    const edge = Math.floor(rand() * 4)
    const t = rand()
    const sx = edge === 0 ? BOARD.x + 8 : edge === 1 ? BOARD.x + BOARD.w - 8 : BOARD.x + t * BOARD.w
    const sy = edge === 2 ? BOARD.y + 8 : edge === 3 ? BOARD.y + BOARD.h - 8 : BOARD.y + t * BOARD.h
    softBlob(g, sx, sy, 14 + rand() * 30, 10 + rand() * 22, stains[i % stains.length]!, 0.1 + rand() * 0.12)
  }
  g.restore()
  g.strokeStyle = 'rgba(140,100,55,0.5)'
  g.lineWidth = 2
  wobblyRect(g, BOARD.x + 1, BOARD.y + 1, BOARD.w - 2, BOARD.h - 2, 1.2, rand, 16)
  g.stroke()

  // The enamel tray where fresh sheets soak.
  g.fillStyle = 'rgba(60,34,12,0.24)'
  wobblyRect(g, TRAY.x + 5, TRAY.y + 8, TRAY.w, TRAY.h, 1.5, rand, 22)
  g.fill()
  g.fillStyle = '#f5f1e8'
  wobblyRect(g, TRAY.x, TRAY.y, TRAY.w, TRAY.h, 1.5, rand, 22)
  g.fill()
  g.strokeStyle = '#5f7f9c'
  g.lineWidth = 5
  g.stroke()
  const basin = g.createLinearGradient(0, TRAY.y, 0, TRAY.y + TRAY.h)
  basin.addColorStop(0, '#c9dde0')
  basin.addColorStop(1, '#dbe9e8')
  g.fillStyle = basin
  wobblyRect(g, TRAY.x + 13, TRAY.y + 13, TRAY.w - 26, TRAY.h - 26, 1, rand, 16)
  g.fill()
  g.strokeStyle = 'rgba(90,120,140,0.35)'
  g.lineWidth = 2
  g.stroke()
  // A chip in the enamel, as these always have.
  g.fillStyle = '#4c4a48'
  g.beginPath()
  g.ellipse(TRAY.x + TRAY.w - 30, TRAY.y + 4, 5, 2.4, 0.2, 0, Math.PI * 2)
  g.fill()

  // The sponge's dish.
  g.fillStyle = 'rgba(60,34,12,0.22)'
  g.beginPath()
  g.ellipse(DISH.x + 5, DISH.y + 9, 74, 52, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#f2ece0'
  g.beginPath()
  g.ellipse(DISH.x, DISH.y, 74, 52, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#8fa9b5'
  g.lineWidth = 3
  g.stroke()
  g.fillStyle = '#e4dccb'
  g.beginPath()
  g.ellipse(DISH.x, DISH.y + 3, 54, 36, 0, 0, Math.PI * 2)
  g.fill()

  // Shadows the jars throw on the cloth, away from the window.
  for (const jar of JARS) {
    g.fillStyle = 'rgba(80,60,40,0.16)'
    g.beginPath()
    g.ellipse(jar.x + 16, jar.y + jar.h + 6, jar.rx * 1.05, jar.ry * 1.25, 0, 0, Math.PI * 2)
    g.fill()
  }
  // The little block the brush lies on.
  g.save()
  g.translate(1034, 728)
  g.rotate(-0.29)
  g.fillStyle = 'rgba(80,60,40,0.18)'
  g.fillRect(-6, -13, 20, 34)
  g.fillStyle = '#b9854c'
  g.beginPath()
  g.roundRect(-10, -17, 20, 34, 5)
  g.fill()
  g.fillStyle = 'rgba(255,230,190,0.4)'
  g.fillRect(-7, -14, 5, 28)
  g.restore()

  // Daylight from the upper left, and a little dusk in the far corner.
  softBlob(g, 60, 40, 900, 620, '255,246,220', 0.2)
  softBlob(g, W, H, 620, 460, '90,50,30', 0.13)
  speckle(g, W, H, 0.08, rand)
  return canvas
}

// Laid over the pigment image: the tooth of the paper and a faint damp shine.
export function paintPaperGrain(rand: () => number, scale: number): HTMLCanvasElement {
  const [canvas, g] = makeCanvas(PAPER.w * scale, PAPER.h * scale)
  const data = g.createImageData(canvas.width, canvas.height)
  const d = data.data
  for (let i = 0; i < d.length; i += 4) {
    const light = rand() > 0.5
    d[i] = light ? 255 : 70
    d[i + 1] = light ? 252 : 55
    d[i + 2] = light ? 240 : 40
    d[i + 3] = rand() * rand() * (light ? 44 : 18)
  }
  g.putImageData(data, 0, 0)
  g.scale(scale, scale)
  // Soft fibres.
  g.lineCap = 'round'
  for (let i = 0; i < 260; i++) {
    const x = rand() * PAPER.w
    const y = rand() * PAPER.h
    const a = rand() * Math.PI
    const len = 5 + rand() * 14
    g.strokeStyle = rand() > 0.5 ? 'rgba(255,255,250,0.2)' : 'rgba(120,100,70,0.08)'
    g.lineWidth = 0.8
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (rand() - 0.5) * 4, y + Math.sin(a) * len * 0.5 + (rand() - 0.5) * 4, x + Math.cos(a) * len, y + Math.sin(a) * len)
    g.stroke()
  }
  // The shine of wet paper under a window.
  const shine = g.createLinearGradient(0, 0, PAPER.w * 0.7, PAPER.h)
  shine.addColorStop(0, 'rgba(255,255,255,0.1)')
  shine.addColorStop(0.35, 'rgba(255,255,255,0)')
  shine.addColorStop(0.6, 'rgba(255,255,255,0.06)')
  shine.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = shine
  g.fillRect(0, 0, PAPER.w, PAPER.h)
  // The cut edge catches a little shade.
  g.strokeStyle = 'rgba(120,100,70,0.22)'
  g.lineWidth = 2
  g.strokeRect(1, 1, PAPER.w - 2, PAPER.h - 2)
  g.strokeStyle = 'rgba(255,255,255,0.5)'
  g.lineWidth = 1
  g.strokeRect(2.5, 2.5, PAPER.w - 5, PAPER.h - 5)
  return canvas
}

// A soft-edged patch of window light: four panes, drawn small and scaled up
// so the edges blur without a filter.
export function paintWindowLight(): HTMLCanvasElement {
  const [small, s] = makeCanvas(64, 56)
  s.fillStyle = '#fff3d2'
  s.transform(1, 0, -0.35, 1, 18, 0)
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) s.fillRect(6 + c * 21, 6 + r * 22, 18, 19)
  const [mid, m] = makeCanvas(160, 140)
  m.imageSmoothingQuality = 'high'
  m.drawImage(small, 0, 0, 160, 140)
  const [canvas, g] = makeCanvas(576, 504)
  g.imageSmoothingQuality = 'high'
  g.drawImage(mid, 0, 0, 576, 504)
  return canvas
}

// Leaf shadows from outside the window, for the wall.
export function paintLeafShadow(rand: () => number): HTMLCanvasElement {
  const [small, s] = makeCanvas(60, 30)
  s.fillStyle = '#5a3a24'
  s.strokeStyle = '#5a3a24'
  s.lineWidth = 1
  s.beginPath()
  s.moveTo(2, 4)
  s.quadraticCurveTo(26, 6, 56, 20)
  s.stroke()
  for (let i = 0; i < 13; i++) {
    const t = 0.08 + (i / 13) * 0.9
    const x = 2 + t * 54
    const y = 4 + t * t * 16
    s.beginPath()
    s.ellipse(x + (rand() - 0.5) * 3, y + (i % 2 === 0 ? -4 : 4) + (rand() - 0.5) * 2, 4.4, 1.9, (i % 2 === 0 ? -0.7 : 0.7) + (rand() - 0.5) * 0.4, 0, Math.PI * 2)
    s.fill()
  }
  const [canvas, g] = makeCanvas(420, 210)
  g.imageSmoothingQuality = 'high'
  g.drawImage(small, 0, 0, 420, 210)
  return canvas
}
