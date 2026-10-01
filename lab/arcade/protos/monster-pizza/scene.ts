// The pizzeria that never changes: wall, bunting, the brick oven's shell, the
// counter, the toppings rail and the pizza board, painted once at 2x.

import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

export const COUNTER = 400
export const BX = 590
export const BY = 530
export const OVEN_X = 965

// The oven's mouth: used for the static shell and to clip the fire.
export function archPath(g: CanvasRenderingContext2D, grow = 0): void {
  const half = 100 + grow
  g.beginPath()
  g.moveTo(OVEN_X - half, COUNTER)
  g.lineTo(OVEN_X - half, 320)
  g.arc(OVEN_X, 320, half, Math.PI, 0)
  g.lineTo(OVEN_X + half, COUNTER)
  g.closePath()
}

export function buildScene(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W * 2
  canvas.height = H * 2
  const g = canvas.getContext('2d')
  if (!g) return canvas
  g.scale(2, 2)
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }

  // Wall: warm plaster with soft tiles.
  const wall = g.createLinearGradient(0, 0, 0, COUNTER)
  wall.addColorStop(0, '#ffe9bd')
  wall.addColorStop(1, '#ffc98c')
  g.fillStyle = wall
  g.fillRect(0, 0, W, COUNTER)
  g.strokeStyle = 'rgba(255,255,255,0.45)'
  g.lineWidth = 3
  for (let row = 0; row < 8; row++) {
    const y = row * 50
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(W, y)
    g.stroke()
    for (let x = row % 2 === 0 ? 0 : 50; x < W; x += 100) {
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x, y + 50)
      g.stroke()
    }
  }
  // Red and white checks along the bottom of the wall.
  for (let i = 0; i * 25 < W; i++) {
    for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 === 0 ? '#ff6b5a' : '#fff6e6'
      g.fillRect(i * 25, 350 + j * 25, 25, 25)
    }
  }
  // Bunting.
  const flags = ['#ff5d5d', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff', '#ff7ac8']
  g.strokeStyle = '#8a5a3a'
  g.lineWidth = 3
  g.beginPath()
  for (let x = 0; x <= W; x += 10) {
    const y = 8 + Math.sin((x / W) * Math.PI * 3) ** 2 * 26
    if (x === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.stroke()
  for (let i = 0; i < 20; i++) {
    const x = 30 + i * 59
    const y = 8 + Math.sin((x / W) * Math.PI * 3) ** 2 * 26
    g.beginPath()
    g.moveTo(x - 17, y)
    g.lineTo(x + 17, y)
    g.lineTo(x, y + 34)
    g.closePath()
    g.fillStyle = flags[i % flags.length]!
    g.fill()
  }

  // Oven: chimney, brick dome, stone arch, dark mouth.
  g.fillStyle = '#b9583c'
  g.strokeStyle = '#7a3220'
  g.lineWidth = 6
  g.beginPath()
  g.rect(OVEN_X - 44, -10, 88, 140)
  g.fill()
  g.stroke()
  g.beginPath()
  g.ellipse(OVEN_X, COUNTER, 200, 300, 0, Math.PI, 0)
  g.closePath()
  g.fillStyle = '#d66d4c'
  g.fill()
  g.save()
  g.clip()
  for (let row = 0; row < 10; row++) {
    const y = 100 + row * 32
    for (let col = -1; col < 7; col++) {
      const x = OVEN_X - 210 + col * 72 + (row % 2) * 36
      const tone = rand()
      g.fillStyle = tone < 0.3 ? '#c45c3e' : tone < 0.6 ? '#de7a58' : '#d66d4c'
      g.fillRect(x + 2, y + 2, 68, 28)
    }
  }
  g.strokeStyle = 'rgba(255,225,195,0.6)'
  g.lineWidth = 4
  for (let row = 0; row <= 10; row++) {
    const y = 100 + row * 32
    g.beginPath()
    g.moveTo(OVEN_X - 210, y)
    g.lineTo(OVEN_X + 210, y)
    g.stroke()
    for (let col = -1; col < 7; col++) {
      const x = OVEN_X - 210 + col * 72 + (row % 2) * 36
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x, y + 32)
      g.stroke()
    }
  }
  // Round the dome with a soft highlight and shade.
  const shade = g.createLinearGradient(OVEN_X - 200, 0, OVEN_X + 200, 0)
  shade.addColorStop(0, 'rgba(255,255,255,0.18)')
  shade.addColorStop(0.5, 'rgba(255,255,255,0)')
  shade.addColorStop(1, 'rgba(80,20,0,0.25)')
  g.fillStyle = shade
  g.fillRect(OVEN_X - 210, 90, 420, 320)
  g.restore()
  g.beginPath()
  g.ellipse(OVEN_X, COUNTER, 200, 300, 0, Math.PI, 0)
  g.strokeStyle = '#7a3220'
  g.lineWidth = 7
  g.stroke()
  archPath(g, 16)
  g.fillStyle = '#f3dcc0'
  g.fill()
  g.strokeStyle = '#a8865a'
  g.lineWidth = 5
  g.stroke()
  g.strokeStyle = 'rgba(168,134,90,0.7)'
  g.lineWidth = 3
  for (let i = 1; i < 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI
    g.beginPath()
    g.moveTo(OVEN_X + Math.cos(a) * 100, 320 + Math.sin(a) * 100)
    g.lineTo(OVEN_X + Math.cos(a) * 116, 320 + Math.sin(a) * 116)
    g.stroke()
  }
  archPath(g)
  g.fillStyle = '#2a1210'
  g.fill()

  // Counter.
  const wood = g.createLinearGradient(0, COUNTER, 0, H)
  wood.addColorStop(0, '#f3c486')
  wood.addColorStop(1, '#dba061')
  g.fillStyle = wood
  g.fillRect(0, COUNTER, W, H - COUNTER)
  g.fillStyle = '#ffe0ae'
  g.fillRect(0, COUNTER, W, 12)
  g.fillStyle = 'rgba(120,70,20,0.25)'
  g.fillRect(0, COUNTER + 12, W, 4)
  g.strokeStyle = 'rgba(120,70,20,0.14)'
  g.lineWidth = 3
  for (let x = 118; x < W; x += 236) {
    g.beginPath()
    g.moveTo(x, COUNTER + 16)
    g.lineTo(x, H)
    g.stroke()
  }
  g.strokeStyle = 'rgba(120,70,20,0.08)'
  for (let i = 0; i < 26; i++) {
    const x = rand() * W
    const y = COUNTER + 30 + rand() * 230
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + 40, y + (rand() - 0.5) * 14, x + 90 + rand() * 60, y)
    g.stroke()
  }
  // Flour dust around the board.
  for (let i = 0; i < 46; i++) {
    const a = rand() * TAU
    const d = 120 + rand() * 120
    g.beginPath()
    g.ellipse(BX + Math.cos(a) * d * 1.3, BY + Math.sin(a) * d * 0.6, 4 + rand() * 16, 3 + rand() * 8, rand() * 3, 0, TAU)
    g.fillStyle = `rgba(255,255,255,${0.12 + rand() * 0.25})`
    g.fill()
  }

  // Toppings rail.
  g.beginPath()
  g.roundRect(22, 662, W - 44, 126, 44)
  g.fillStyle = '#9a623c'
  g.fill()
  g.strokeStyle = '#6e4122'
  g.lineWidth = 6
  g.stroke()
  g.beginPath()
  g.roundRect(36, 674, W - 72, 102, 36)
  g.fillStyle = '#7d4b2a'
  g.fill()

  // The board the pizza sits on.
  g.beginPath()
  g.ellipse(BX + 6, BY + 12, 142, 136, 0, 0, TAU)
  g.fillStyle = 'rgba(80,40,0,0.22)'
  g.fill()
  g.fillStyle = '#cf9358'
  g.strokeStyle = '#9a6430'
  g.lineWidth = 5
  g.beginPath()
  g.roundRect(BX + 110, BY - 22, 126, 44, 22)
  g.fill()
  g.stroke()
  g.beginPath()
  g.arc(BX, BY, 136, 0, TAU)
  g.fill()
  g.stroke()
  g.beginPath()
  g.arc(BX + 212, BY, 8, 0, TAU)
  g.fillStyle = '#9a6430'
  g.fill()
  g.strokeStyle = 'rgba(122,74,30,0.35)'
  g.lineWidth = 3
  for (const r of [60, 96, 122]) {
    g.beginPath()
    g.arc(BX, BY, r, 0.3, 2.4)
    g.stroke()
  }
  return canvas
}
