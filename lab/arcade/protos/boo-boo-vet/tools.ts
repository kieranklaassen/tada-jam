// The vet's tools. Three are emoji (instantly recognisable), four are drawn so
// they can open, close and carry things.

import { sprite } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'

export type ToolKind = 'tweezers' | 'plaster' | 'ice' | 'sponge' | 'tissue' | 'spoon' | 'blanket'

export const BLANKET = { fill: '#ff8fa3', line: '#c94f6d', stripe: '#ffd1dc' }

function thick(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, fill: string, line: string, width: number): void {
  g.lineCap = 'round'
  for (const pass of [0, 1]) {
    g.beginPath()
    g.moveTo(x1, y1)
    g.lineTo(x2, y2)
    g.lineWidth = pass === 0 ? width + 7 : width
    g.strokeStyle = pass === 0 ? line : fill
    g.stroke()
  }
}

// Centred on (x, y), about `size` pixels across. `grip` closes the tweezers.
export function drawTool(g: CanvasRenderingContext2D, kind: ToolKind, x: number, y: number, size: number, rot = 0, grip = 0): void {
  if (kind === 'plaster') return sprite(g, '🩹', x, y, size, rot)
  if (kind === 'ice') return sprite(g, '🧊', x, y, size, rot)
  if (kind === 'sponge') return sprite(g, '🧽', x, y, size, rot)
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  g.scale(size / 120, size / 120)
  if (kind === 'tweezers') {
    const open = 5 + 24 * (1 - grip)
    for (const side of [-1, 1]) thick(g, side * 9, -46, side * open, 56, '#dfe7f0', '#66758a', 12)
    g.beginPath()
    g.roundRect(-20, -66, 40, 40, 12)
    g.fillStyle = '#35c2b0'
    g.fill()
    g.lineWidth = 5
    g.strokeStyle = '#1d7f74'
    g.stroke()
  } else if (kind === 'tissue') {
    g.lineJoin = 'round'
    g.beginPath()
    g.moveTo(-24, -2)
    g.lineTo(-34, -46)
    g.lineTo(-12, -32)
    g.lineTo(2, -62)
    g.lineTo(16, -34)
    g.lineTo(36, -48)
    g.lineTo(24, -2)
    g.closePath()
    g.fillStyle = '#ffffff'
    g.fill()
    g.lineWidth = 4.5
    g.strokeStyle = '#9fb2c8'
    g.stroke()
    g.beginPath()
    g.roundRect(-54, -8, 108, 62, 14)
    g.fillStyle = '#5db8ff'
    g.fill()
    g.lineWidth = 5
    g.strokeStyle = '#2a7cc4'
    g.stroke()
    g.beginPath()
    g.ellipse(0, -2, 32, 8, 0, 0, TAU)
    g.fillStyle = '#2a7cc4'
    g.fill()
    g.fillStyle = '#ffffff'
    for (const dx of [-30, 0, 30]) {
      g.beginPath()
      g.arc(dx, 30, 7, 0, TAU)
      g.fill()
    }
  } else if (kind === 'spoon') {
    thick(g, 46, 46, -6, -6, '#e3e9f1', '#66758a', 12)
    g.beginPath()
    g.ellipse(-26, -26, 31, 24, Math.PI / 4, 0, TAU)
    g.fillStyle = '#e3e9f1'
    g.fill()
    g.lineWidth = 5
    g.strokeStyle = '#66758a'
    g.stroke()
    g.beginPath()
    g.ellipse(-26, -26, 22, 16, Math.PI / 4, 0, TAU)
    g.fillStyle = '#ff4f9a'
    g.fill()
    g.beginPath()
    g.ellipse(-33, -33, 7, 4, Math.PI / 4, 0, TAU)
    g.fillStyle = 'rgba(255,255,255,0.75)'
    g.fill()
  } else {
    // A folded blanket.
    g.beginPath()
    g.roundRect(-56, -42, 112, 84, 18)
    g.fillStyle = BLANKET.fill
    g.fill()
    g.strokeStyle = BLANKET.stripe
    g.lineWidth = 9
    g.beginPath()
    g.moveTo(-22, -36)
    g.lineTo(-22, 36)
    g.moveTo(22, -36)
    g.lineTo(22, 36)
    g.moveTo(-50, -12)
    g.lineTo(50, -12)
    g.stroke()
    g.beginPath()
    g.roundRect(-56, -42, 112, 84, 18)
    g.lineWidth = 5
    g.strokeStyle = BLANKET.line
    g.stroke()
    g.beginPath()
    g.moveTo(-54, 16)
    g.lineTo(54, 16)
    g.lineWidth = 4
    g.stroke()
  }
  g.restore()
}

// A thorn pointing along `angle`, its base at (x, y).
export function drawThorn(g: CanvasRenderingContext2D, x: number, y: number, angle: number, len = 60): void {
  g.save()
  g.translate(x, y)
  g.rotate(angle)
  g.beginPath()
  g.moveTo(0, -10)
  g.lineTo(len, 0)
  g.lineTo(0, 10)
  g.closePath()
  g.lineJoin = 'round'
  g.fillStyle = '#8a6a3a'
  g.fill()
  g.lineWidth = 5
  g.strokeStyle = '#4a3318'
  g.stroke()
  g.beginPath()
  g.moveTo(6, -3)
  g.lineTo(len * 0.6, -1)
  g.lineWidth = 3
  g.strokeStyle = 'rgba(255,255,255,0.45)'
  g.stroke()
  g.restore()
}
