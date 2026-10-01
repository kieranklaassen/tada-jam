// The landscape for Choo-Choo Draw: where things are, the static backdrop
// (painted once to an offscreen canvas), and the two things drawn over the
// train: the tunnel mountain and the station buildings.

import { circle, ellipse, line, rrect, sprite } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

const INK = '#3a2630'

// The mountain hides whatever is under its foot: that is the tunnel.
export const MOUND = { x: 640, y: 165, rx: 170, ry: 105 }
export const POND = { x: 300, y: 640, rx: 165, ry: 92 }
// A road running top to bottom; x is its centre line.
export const ROAD = { x0: 900, x1: 972, x: 936 }

export interface Station {
  // Building centre.
  x: number
  y: number
  // Platform centre, where riders hop off and dance.
  px: number
  py: number
  roof: string
  roofDark: string
}

export const STATIONS: readonly Station[] = [
  { x: 150, y: 110, px: 150, py: 196, roof: '#e8453c', roofDark: '#a82a2a' },
  { x: 1078, y: 470, px: 1078, py: 556, roof: '#2f8fe8', roofDark: '#1f62a8' },
]

const BALLOONS = ['#ff5d5d', '#ffe14d', '#4db8ff', '#b07cff', '#5ed36a', '#ff7ac8', '#ffb02e', '#ffffff']

export function paintBackdrop(g: CanvasRenderingContext2D, rand: () => number): void {
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#b4e86e')
  grad.addColorStop(1, '#86d15c')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)

  // Mown patches, so the grass is not one flat colour.
  for (let i = 0; i < 26; i++) {
    const x = rand() * W
    const y = rand() * H
    ellipse(g, x, y, 60 + rand() * 120, 30 + rand() * 50, i % 2 ? 'rgba(255,255,160,0.16)' : 'rgba(40,140,60,0.13)', rand() * 0.6 - 0.3)
  }
  // Tufts.
  g.lineCap = 'round'
  for (let i = 0; i < 150; i++) {
    const x = rand() * W
    const y = rand() * H
    g.strokeStyle = 'rgba(50,140,60,0.5)'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(x - 5, y)
    g.lineTo(x - 7, y - 9)
    g.moveTo(x, y)
    g.lineTo(x, y - 12)
    g.moveTo(x + 5, y)
    g.lineTo(x + 7, y - 9)
    g.stroke()
  }
  // Flowers.
  const petals = ['#ffffff', '#ffd1ec', '#fff3a0', '#ffb3b3', '#d9c8ff']
  for (let i = 0; i < 70; i++) {
    const x = rand() * W
    const y = rand() * H
    const c = petals[Math.floor(rand() * petals.length)]!
    const r = 3.5 + rand() * 2
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU
      circle(g, x + Math.cos(a) * r, y + Math.sin(a) * r, r, c)
    }
    circle(g, x, y, r * 0.8, '#ffb02e')
  }

  // Road.
  g.fillStyle = '#8f8a80'
  g.fillRect(ROAD.x0 - 5, 0, ROAD.x1 - ROAD.x0 + 10, H)
  g.fillStyle = '#6f7480'
  g.fillRect(ROAD.x0, 0, ROAD.x1 - ROAD.x0, H)
  g.fillStyle = 'rgba(255,255,255,0.07)'
  g.fillRect(ROAD.x0, 0, 14, H)
  g.strokeStyle = '#fff6c8'
  g.lineWidth = 5
  g.setLineDash([26, 24])
  g.beginPath()
  g.moveTo(ROAD.x, -10)
  g.lineTo(ROAD.x, H + 10)
  g.stroke()
  g.setLineDash([])

  // Pond.
  ellipse(g, POND.x, POND.y + 6, POND.rx + 16, POND.ry + 14, '#d9c182')
  ellipse(g, POND.x, POND.y, POND.rx + 14, POND.ry + 12, '#f4e2ab')
  ellipse(g, POND.x, POND.y + 3, POND.rx, POND.ry, '#2f97dc')
  ellipse(g, POND.x, POND.y, POND.rx, POND.ry - 3, '#49b6f2')
  ellipse(g, POND.x - 20, POND.y - 12, POND.rx * 0.7, POND.ry * 0.6, '#6fcbff')
  for (const [dx, dy, r] of [
    [-105, 30, 17],
    [-80, 46, 12],
    [95, -40, 16],
    [120, 22, 13],
    [20, 62, 12],
  ] as const) {
    const x = POND.x + dx
    const y = POND.y + dy
    ellipse(g, x, y + 3, r, r * 0.7, '#2c8a3b')
    g.beginPath()
    g.moveTo(x, y)
    g.ellipse(x, y, r, r * 0.7, 0, 0.5, TAU)
    g.closePath()
    g.fillStyle = '#5ed36a'
    g.fill()
    if (r > 14) circle(g, x + 3, y - 3, 4.5, '#ffd1ec')
  }
  for (const [dx, dy] of [
    [-150, -52],
    [-138, -62],
    [148, 48],
  ] as const) {
    const x = POND.x + dx
    const y = POND.y + dy
    line(g, x, y + 16, x + 2, y - 18, '#3f9a4a', 4)
    ellipse(g, x + 2, y - 20, 4.5, 10, '#8d5b3a')
  }

  // Platforms.
  for (const st of STATIONS) {
    rrect(g, st.px - 104, st.py - 22 + 7, 208, 50, 12, '#a48e6c')
    rrect(g, st.px - 104, st.py - 22, 208, 50, 12, '#eadcbf', '#a48e6c', 3)
    g.strokeStyle = '#ffd23f'
    g.lineWidth = 6
    g.setLineDash([18, 10])
    g.beginPath()
    g.moveTo(st.px - 92, st.py + 18)
    g.lineTo(st.px + 92, st.py + 18)
    g.stroke()
    g.setLineDash([])
  }

  // Trees and bushes around the edges, out of the way of most track.
  for (const [x, y, s, c] of [
    [36, 300, 78, '🌳'],
    [1140, 60, 84, '🌳'],
    [1150, 150, 70, '🌲'],
    [310, 40, 76, '🌳'],
    [1000, 40, 70, '🌲'],
    [40, 770, 80, '🌳'],
    [860, 780, 74, '🌳'],
    [1150, 640, 72, '🌲'],
    [500, 796, 60, '🌲'],
  ] as const) {
    ellipse(g, x + 4, y + s * 0.42, s * 0.36, s * 0.12, 'rgba(0,0,0,0.18)')
    sprite(g, c, x, y, s)
  }
  // A cow paddock hint: a few fence posts.
  for (let i = 0; i < 6; i++) {
    const x = 590 + i * 52
    rrect(g, x - 4, 742, 8, 30, 3, '#b07a4a', '#7a4a2a', 2)
  }
  line(g, 590, 752, 850, 752, '#7a4a2a', 6)
  line(g, 590, 752, 850, 752, '#d09a62', 3)
}

export function drawMound(g: CanvasRenderingContext2D, wobble: number, time: number): void {
  const { x, y, rx, ry } = MOUND
  const baseY = y + ry
  g.save()
  g.translate(x, baseY)
  g.scale(1 - wobble * 0.04, 1 + wobble * 0.06)
  g.translate(-x, -baseY)

  // Foot: this is the part that hides the train.
  ellipse(g, x, y + 8, rx, ry, '#3f8a44')
  ellipse(g, x, y, rx, ry - 3, '#5aa84e')
  ellipse(g, x - 8, y - 8, rx * 0.86, ry * 0.8, '#6dbb5a')

  // Peaks rising behind the foot.
  const peak = (px: number, top: number, half: number, body: string, shade: string) => {
    g.beginPath()
    g.moveTo(px - half, y + 26)
    g.quadraticCurveTo(px - half * 0.35, top + 40, px - 12, top + 6)
    g.quadraticCurveTo(px, top - 8, px + 12, top + 6)
    g.quadraticCurveTo(px + half * 0.35, top + 40, px + half, y + 26)
    g.closePath()
    g.fillStyle = body
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 3
    g.lineJoin = 'round'
    g.stroke()
    g.beginPath()
    g.moveTo(px + 12, top + 6)
    g.quadraticCurveTo(px + half * 0.35, top + 40, px + half, y + 26)
    g.lineTo(px + half * 0.3, y + 26)
    g.quadraticCurveTo(px + half * 0.2, top + 60, px + 4, top + 2)
    g.closePath()
    g.fillStyle = shade
    g.fill()
    // Snow cap.
    g.beginPath()
    g.moveTo(px - 12, top + 6)
    g.quadraticCurveTo(px, top - 8, px + 12, top + 6)
    g.lineTo(px + half * 0.22, top + 42)
    g.lineTo(px + half * 0.08, top + 32)
    g.lineTo(px - half * 0.04, top + 46)
    g.lineTo(px - half * 0.14, top + 34)
    g.lineTo(px - half * 0.24, top + 44)
    g.closePath()
    g.fillStyle = '#ffffff'
    g.fill()
  }
  peak(x + 64, y - 110, 92, '#9aa0b4', '#7f859c')
  peak(x - 34, y - 148, 120, '#aab0c2', '#8b91a8')

  // Grass skirt over the bottom of the peaks.
  g.beginPath()
  g.ellipse(x, y + 10, rx - 4, ry - 12, 0, 0, Math.PI)
  g.quadraticCurveTo(x - rx * 0.5, y - 6, x, y + 4)
  g.quadraticCurveTo(x + rx * 0.5, y + 14, x + rx - 4, y + 10)
  g.closePath()
  g.fillStyle = '#6dbb5a'
  g.fill()
  ellipse(g, x - 40, y + 50, 70, 22, 'rgba(255,255,160,0.18)')

  const sway = Math.sin(time * 1.6) * 0.04
  sprite(g, '🌲', x - 118, y + 18, 58, sway)
  sprite(g, '🌲', x + 120, y + 30, 52, -sway)
  sprite(g, '🌲', x + 84, y + 52, 44, sway)
  g.restore()
}

export function drawStation(g: CanvasRenderingContext2D, st: Station, bounce: number, time: number, balloons: number): void {
  const { x, y } = st
  const baseY = y + 56
  g.save()
  g.translate(x, baseY)
  g.scale(1 - bounce * 0.05, 1 + bounce * 0.07)
  g.translate(-x, -baseY)

  ellipse(g, x + 4, y + 56, 80, 12, 'rgba(0,0,0,0.18)')
  rrect(g, x - 64, y - 30, 128, 86, 8, '#fff3d6', INK, 3)
  g.fillStyle = 'rgba(200,160,110,0.35)'
  g.fillRect(x - 62, y + 36, 124, 18)
  // Roof.
  g.beginPath()
  g.moveTo(x - 80, y - 24)
  g.lineTo(x - 54, y - 70)
  g.lineTo(x + 54, y - 70)
  g.lineTo(x + 80, y - 24)
  g.closePath()
  g.fillStyle = st.roof
  g.fill()
  g.strokeStyle = INK
  g.lineWidth = 3
  g.lineJoin = 'round'
  g.stroke()
  g.beginPath()
  g.moveTo(x - 80, y - 24)
  g.lineTo(x - 73, y - 36)
  g.lineTo(x + 73, y - 36)
  g.lineTo(x + 80, y - 24)
  g.closePath()
  g.fillStyle = st.roofDark
  g.fill()
  // Door and windows.
  rrect(g, x - 15, y + 8, 30, 48, 14, '#8d5b3a', INK, 3)
  circle(g, x + 7, y + 34, 3, '#ffd23f')
  for (const side of [-1, 1]) {
    rrect(g, x + side * 40 - 14, y - 10, 28, 28, 5, '#9bdcff', INK, 3)
    line(g, x + side * 40, y - 9, x + side * 40, y + 17, INK, 2.5)
    rrect(g, x + side * 40 - 17, y + 18, 34, 7, 3, '#ff7ac8', INK, 2)
  }
  // Clock.
  circle(g, x, y - 46, 15, '#ffffff', INK, 3)
  line(g, x, y - 46, x, y - 56, INK, 3)
  line(g, x, y - 46, x + Math.cos(time * 0.8) * 8, y - 46 + Math.sin(time * 0.8) * 8, INK, 3)
  // Flag.
  line(g, x + 52, y - 70, x + 52, y - 116, INK, 5)
  const wave = Math.sin(time * 5) * 5
  g.beginPath()
  g.moveTo(x + 52, y - 116)
  g.quadraticCurveTo(x + 68, y - 120 + wave, x + 86, y - 106 + wave * 0.6)
  g.quadraticCurveTo(x + 68, y - 100 - wave * 0.4, x + 52, y - 94)
  g.closePath()
  g.fillStyle = '#ffd23f'
  g.fill()
  g.strokeStyle = INK
  g.lineWidth = 2.5
  g.stroke()
  // Balloons, one for every train-load dropped here.
  for (let i = 0; i < balloons; i++) {
    const half = Math.floor(i / 2)
    const bx = x + (i % 2 ? 1 : -1) * (34 + half * 20) + Math.sin(time * 1.7 + i * 1.3) * 4
    const by = y - 76 - (half % 2) * 16 + Math.sin(time * 2.1 + i) * 4
    g.strokeStyle = 'rgba(60,40,50,0.6)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(x + (i % 2 ? 1 : -1) * (30 + half * 12), y - 30)
    g.quadraticCurveTo(bx + 4, by + 40, bx, by + 17)
    g.stroke()
    ellipse(g, bx, by, 14, 17, BALLOONS[i % BALLOONS.length]!)
    g.strokeStyle = INK
    g.lineWidth = 2
    g.beginPath()
    g.ellipse(bx, by, 14, 17, 0, 0, TAU)
    g.stroke()
    ellipse(g, bx - 5, by - 6, 3.5, 5.5, 'rgba(255,255,255,0.7)', -0.4)
  }

  g.restore()
}

