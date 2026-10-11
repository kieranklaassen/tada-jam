import { CELL } from '../ground'
import { GRASS_Y, MOUTH_X } from './layout'
import * as P from './palette'

// The two things on the surface that change: the hill of spoil round the mouth, which is as high as the nest is
// hollow, and the dewdrop bell that calls a raid.

type Pen = CanvasRenderingContext2D

/** Where the dewdrop hangs at rest, and how near a touch must land to ring it: well over the jam's 48 for a target. */
export const BELL = { x: MOUTH_X + 96, y: GRASS_Y - 96, radius: 17, reach: 34 } as const

/** The hill, from 0 (a new nest) to 1 (as hollow as the ground can be). It leaves the mouth open. */
export function paintHill(pen: Pen, grown: number): void {
  const g = Math.max(0, Math.min(1, grown))
  const height = 20 + 44 * g, reach = 62 + 70 * g, lip = CELL + 2
  for (const side of [-1, 1]) {
    pen.fillStyle = side < 0 ? '#9c6a3c' : '#8f5f35'
    pen.beginPath()
    pen.moveTo(MOUTH_X + side * lip, GRASS_Y + 2)
    pen.quadraticCurveTo(MOUTH_X + side * (lip + 2), GRASS_Y - height * 1.05, MOUTH_X + side * (lip + reach * 0.3), GRASS_Y - height)
    pen.quadraticCurveTo(MOUTH_X + side * (lip + reach * 0.75), GRASS_Y - height * 0.8, MOUTH_X + side * (lip + reach), GRASS_Y + 2)
    pen.closePath()
    pen.fill()
  }
  // Crumbs on the slopes: the spoil is carried up a mouthful at a time.
  pen.fillStyle = '#b98650'
  for (let n = 0; n < 10; n++) {
    const side = n % 2 === 0 ? -1 : 1, along = 0.18 + ((n * 37) % 60) / 100
    const cx = MOUTH_X + side * (lip + reach * along), cy = GRASS_Y - height * (1 - along) * 0.82
    pen.beginPath()
    pen.ellipse(cx, cy, 5, 3.4, 0, 0, Math.PI * 2)
    pen.fill()
  }
  pen.fillStyle = '#5a371d'
  for (let n = 0; n < 6; n++) {
    const side = n % 2 === 0 ? 1 : -1, along = 0.3 + ((n * 53) % 50) / 100
    pen.beginPath()
    pen.ellipse(MOUTH_X + side * (lip + reach * along), GRASS_Y - height * (1 - along) * 0.5, 3.5, 2.4, 0, 0, Math.PI * 2)
    pen.fill()
  }
}

/** The bell: a dewdrop on a thread from a bent grass stalk. `sway` swings it, in radians. */
export function paintBell(pen: Pen, sway = 0): void {
  const foot = { x: BELL.x + 46, y: GRASS_Y }, tip = { x: BELL.x, y: BELL.y - 40 }
  pen.strokeStyle = P.GRASS.dark
  pen.lineWidth = 5
  pen.lineCap = 'round'
  pen.beginPath()
  pen.moveTo(foot.x, foot.y)
  pen.bezierCurveTo(foot.x + 6, foot.y - 80, foot.x - 4, tip.y - 34, tip.x, tip.y)
  pen.stroke()
  pen.fillStyle = P.GRASS.light
  pen.beginPath()
  pen.ellipse(foot.x + 13, foot.y - 46, 15, 5, -0.9, 0, Math.PI * 2)
  pen.fill()
  const drop = { x: tip.x + Math.sin(sway) * 40, y: tip.y + Math.cos(sway) * 40 }
  pen.strokeStyle = 'rgba(255,255,255,0.8)'
  pen.lineWidth = 1.2
  pen.beginPath()
  pen.moveTo(tip.x, tip.y)
  pen.lineTo(drop.x, drop.y - BELL.radius)
  pen.stroke()
  pen.fillStyle = '#8fdcf5'
  pen.beginPath()
  pen.moveTo(drop.x, drop.y - BELL.radius - 7)
  pen.bezierCurveTo(drop.x + BELL.radius * 1.3, drop.y - 2, drop.x + BELL.radius, drop.y + BELL.radius, drop.x, drop.y + BELL.radius)
  pen.bezierCurveTo(drop.x - BELL.radius, drop.y + BELL.radius, drop.x - BELL.radius * 1.3, drop.y - 2, drop.x, drop.y - BELL.radius - 7)
  pen.fill()
  pen.fillStyle = 'rgba(255,255,255,0.9)'
  pen.beginPath()
  pen.ellipse(drop.x - 5, drop.y + 1, 3, 5.5, 0.4, 0, Math.PI * 2)
  pen.fill()
}
