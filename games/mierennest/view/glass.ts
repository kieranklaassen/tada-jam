import { STAGE } from '../stage'
import { FRAME } from './layout'
import * as P from './palette'

// The pane in front of the farm: a slanting sheen, a few scratches, a thumb smudge and the shadow the frame
// throws on it. Painted once into a cached overlay; laying it over the frame's inside is the one full composite.

export function paintGlass(pen: CanvasRenderingContext2D): void {
  const x = FRAME, y = FRAME, w = STAGE.width - 2 * FRAME, h = STAGE.height - 2 * FRAME
  pen.save()
  pen.beginPath()
  pen.rect(x, y, w, h)
  pen.clip()
  // Two bands of light across the pane, leaning the same way.
  const band = (left: number, width: number, style: string) => {
    pen.fillStyle = style
    pen.beginPath()
    pen.moveTo(x + left, y)
    pen.lineTo(x + left + width, y)
    pen.lineTo(x + left + width - h * 0.42, y + h)
    pen.lineTo(x + left - h * 0.42, y + h)
    pen.closePath()
    pen.fill()
  }
  band(300, 120, P.GLASS.sheen)
  band(448, 26, P.GLASS.sheen)
  band(1130, 190, P.GLASS.sheen)
  // The frame's shadow, falling from the top and the left.
  const top = pen.createLinearGradient(0, y, 0, y + 26)
  top.addColorStop(0, 'rgba(40,20,5,0.32)')
  top.addColorStop(1, 'rgba(40,20,5,0)')
  pen.fillStyle = top
  pen.fillRect(x, y, w, 26)
  const side = pen.createLinearGradient(x, 0, x + 18, 0)
  side.addColorStop(0, 'rgba(40,20,5,0.26)')
  side.addColorStop(1, 'rgba(40,20,5,0)')
  pen.fillStyle = side
  pen.fillRect(x, y, 18, h)
  // A thumb smudge, low on the right where a hand holds the farm.
  for (const [sx, sy, rx, ry, turn] of [[1010, 640, 46, 62, -0.5], [1004, 632, 30, 44, -0.5]] as const) {
    pen.fillStyle = P.GLASS.smudge
    pen.beginPath()
    pen.ellipse(sx, sy, rx, ry, turn, 0, Math.PI * 2)
    pen.fill()
  }
  // Scratches: short, fine, mostly along one slant.
  pen.strokeStyle = P.GLASS.scratch
  pen.lineCap = 'round'
  for (const [sx, sy, dx, dy, width] of [[212, 318, 64, -22, 1], [236, 330, 30, -9, 0.8], [742, 520, 90, -34, 1], [770, 536, 22, -8, 0.7], [520, 700, 46, 10, 0.8], [96, 560, 18, -40, 0.8], [900, 250, 54, -16, 0.8]] as const) {
    pen.lineWidth = width
    pen.beginPath()
    pen.moveTo(sx, sy)
    pen.lineTo(sx + dx, sy + dy)
    pen.stroke()
  }
  // A bright edge where the pane meets the frame at the top left.
  pen.fillStyle = P.GLASS.sheenEdge
  pen.fillRect(x, y, w, 1.5)
  pen.fillRect(x, y, 1.5, h)
  pen.restore()
}
