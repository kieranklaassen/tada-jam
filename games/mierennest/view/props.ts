import { CELL, MOUTH } from '../ground'
import { GRASS_Y, MOUTH_X } from './layout'
import * as P from './palette'

// The two things on the surface that change: the hill of spoil round the mouth, which is as high as the nest is
// hollow, and the dewdrop bell that calls a raid.

type Pen = CanvasRenderingContext2D

/** Where the dewdrop hangs at rest, and how near a touch must land to ring it: well over the jam's 48 for a target. */
export const BELL = { x: MOUTH_X + 100, y: GRASS_Y - 100, radius: 17, reach: 34 } as const

/** Half the width of the mouth, and a little: where the hill's two humps begin, so the mouth stays open. */
export const LIP = (MOUTH.length * CELL) / 2 + 2

/**
 * How far the hill has grown, from 0 to under 1, for how hollow the nest is (the share of its cells that are
 * open): fast at first and then ever more slowly, up to a height it never passes.
 */
export const hillGrown = (hollow: number): number => 1 - Math.exp(-4 * Math.max(0, hollow))

/**
 * The size of the hill's two humps for a growth from 0 to 1. The spoil is tipped to the right, away from the log:
 * at its largest the left hump still stops short of the party at the log, and the right one stands clear of the
 * bell and of its stalk.
 */
export function hillShape(grown: number): { left: { reach: number; height: number }; right: { reach: number; height: number } } {
  const g = Math.max(0, Math.min(1, grown))
  return { left: { reach: 30 + 8 * g, height: 16 + 14 * g }, right: { reach: 50 + 42 * g, height: 20 + 36 * g } }
}

/** The hill for a growth from 0 to 1. It leaves the mouth open. */
export function paintHill(pen: Pen, grown: number): void {
  const shape = hillShape(grown)
  for (const side of [-1, 1]) {
    const { reach, height } = side < 0 ? shape.left : shape.right
    pen.fillStyle = side < 0 ? '#9c6a3c' : '#8f5f35'
    pen.beginPath()
    pen.moveTo(MOUTH_X + side * LIP, GRASS_Y + 2)
    pen.quadraticCurveTo(MOUTH_X + side * (LIP + 2), GRASS_Y - height * 1.05, MOUTH_X + side * (LIP + reach * 0.3), GRASS_Y - height)
    pen.quadraticCurveTo(MOUTH_X + side * (LIP + reach * 0.75), GRASS_Y - height * 0.8, MOUTH_X + side * (LIP + reach), GRASS_Y + 2)
    pen.closePath()
    pen.fill()
    // Crumbs on the slope: the spoil is carried up a mouthful at a time.
    for (let n = 0; n < (side < 0 ? 3 : 6); n++) {
      const along = 0.2 + ((n * 37 + (side < 0 ? 11 : 0)) % 55) / 100
      pen.fillStyle = n % 2 === 0 ? '#b98650' : '#5a371d'
      pen.beginPath()
      pen.ellipse(MOUTH_X + side * (LIP + reach * along), GRASS_Y - height * (1 - along) * (n % 2 === 0 ? 0.8 : 0.5), 4.5 - (n % 2), 3.2 - (n % 2) * 0.8, 0, 0, Math.PI * 2)
      pen.fill()
    }
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
