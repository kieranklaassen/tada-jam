// The kitchen behind the monster, painted once to an offscreen canvas.

import { circle, ellipse, rrect, sprite } from '../../kit/draw.ts'
import { H, W } from '../../kit/types.ts'

export const FLOOR_Y = 640
export const SHELF_Y = 148

export function makeBackdrop(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')!

  // Wall: warm cream with soft stripes.
  const wall = g.createLinearGradient(0, 0, 0, FLOOR_Y)
  wall.addColorStop(0, '#ffe2b8')
  wall.addColorStop(1, '#ffd0a0')
  g.fillStyle = wall
  g.fillRect(0, 0, W, FLOOR_Y)
  g.fillStyle = 'rgba(255,255,255,0.22)'
  for (let x = 20; x < W; x += 118) g.fillRect(x, 0, 58, FLOOR_Y)
  // Little dots on the stripes.
  g.fillStyle = 'rgba(255,150,90,0.18)'
  for (let x = 108; x < W; x += 118) for (let y = 210; y < FLOOR_Y - 20; y += 74) g.fillRect(x - 5, y - 5, 10, 10)

  // Window on the left.
  rrect(g, 58, 236, 236, 252, 22, '#ffffff')
  const skyGrad = g.createLinearGradient(0, 252, 0, 472)
  skyGrad.addColorStop(0, '#6ecbff')
  skyGrad.addColorStop(1, '#c9f0ff')
  g.save()
  g.beginPath()
  g.roundRect(74, 252, 204, 220, 12)
  g.clip()
  g.fillStyle = skyGrad
  g.fillRect(74, 252, 204, 220)
  circle(g, 232, 298, 30, '#ffe14d')
  ellipse(g, 120, 330, 40, 18, '#ffffff')
  ellipse(g, 150, 318, 30, 18, '#ffffff')
  ellipse(g, 120, 500, 150, 70, '#7fd67a')
  ellipse(g, 250, 510, 120, 70, '#5ec46a')
  g.restore()
  g.fillStyle = '#ffffff'
  g.fillRect(171, 252, 10, 220)
  g.fillRect(74, 356, 204, 10)
  rrect(g, 44, 480, 264, 22, 10, '#ffffff')
  g.fillStyle = 'rgba(120,70,30,0.12)'
  g.fillRect(58, 502, 236, 8)

  // A framed picture and a plant on the right.
  rrect(g, 902, 250, 196, 176, 16, '#c9824a')
  rrect(g, 916, 264, 168, 148, 8, '#fff6e6')
  sprite(g, '🍕', 1000, 338, 110, -0.2)
  g.fillStyle = 'rgba(120,70,30,0.12)'
  g.fillRect(902, 426, 196, 8)

  // Floor: chunky checker tiles that fan out towards the child.
  g.fillStyle = '#7ad0c4'
  g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y)
  const rows = [FLOOR_Y, FLOOR_Y + 38, FLOOR_Y + 92, H + 10]
  const vanishX = W / 2
  const spread = (y: number) => 0.62 + ((y - FLOOR_Y) / (H - FLOOR_Y)) * 0.75
  for (let r = 0; r < rows.length - 1; r++) {
    const y0 = rows[r]!
    const y1 = rows[r + 1]!
    for (let c = -7; c < 7; c++) {
      if ((c + r) % 2 === 0) continue
      g.beginPath()
      g.moveTo(vanishX + c * 150 * spread(y0), y0)
      g.lineTo(vanishX + (c + 1) * 150 * spread(y0), y0)
      g.lineTo(vanishX + (c + 1) * 150 * spread(y1), y1)
      g.lineTo(vanishX + c * 150 * spread(y1), y1)
      g.closePath()
      g.fillStyle = '#e9fbf6'
      g.fill()
    }
  }
  // Skirting board.
  g.fillStyle = '#fff6e6'
  g.fillRect(0, FLOOR_Y - 16, W, 18)
  g.fillStyle = 'rgba(80,50,30,0.16)'
  g.fillRect(0, FLOOR_Y + 2, W, 7)

  sprite(g, '🪴', 1052, 590, 170)

  // Rug under the monster.
  ellipse(g, W / 2, 776, 360, 50, '#ff7a8a')
  ellipse(g, W / 2, 776, 320, 40, '#ffa3ae')
  ellipse(g, W / 2, 776, 270, 30, '#ff7a8a')

  // The food shelf.
  const shade = g.createLinearGradient(0, SHELF_Y + 20, 0, SHELF_Y + 64)
  shade.addColorStop(0, 'rgba(120,70,30,0.22)')
  shade.addColorStop(1, 'rgba(120,70,30,0)')
  g.fillStyle = shade
  g.fillRect(30, SHELF_Y + 20, W - 60, 44)
  for (const bx of [170, W - 170]) {
    g.beginPath()
    g.moveTo(bx - 12, SHELF_Y + 10)
    g.lineTo(bx + 12, SHELF_Y + 10)
    g.lineTo(bx + 12, SHELF_Y + 58)
    g.closePath()
    g.fillStyle = '#8e5528'
    g.fill()
  }
  rrect(g, 22, SHELF_Y, W - 44, 24, 10, '#b9733c')
  rrect(g, 22, SHELF_Y, W - 44, 9, 5, '#d9965a')

  return canvas
}
