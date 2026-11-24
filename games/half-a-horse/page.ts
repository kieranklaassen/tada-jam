import { GROUND, LOFT, PUDDLE, STABLE } from './layout'
import { oval, path, printOf, run, sew, type Ctx } from './stitch'

// The page of the book: everything that stands still, painted once, and
// painted past the stage's edges for a surface of another shape.

export function paintPage(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  ctx.fillStyle = printOf(ctx, 'sky')
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  const hill = (points: [number, number][], name: 'hillA' | 'hillB'): void => {
    const p = path((one) => {
      one.moveTo(x0 - 40, y1)
      one.lineTo(x0 - 40, points[0][1])
      one.lineTo(points[0][0], points[0][1])
      for (let i = 1; i < points.length; i += 2) one.quadraticCurveTo(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])
      one.lineTo(x1 + 40, points[points.length - 1][1])
      one.lineTo(x1 + 40, y1)
      one.closePath()
    })
    sew(ctx, p, name, { pad: 34, stitch: 11, drop: -0 })
    ctx.globalAlpha = 0.5
    for (let dy = 60; dy < 220; dy += 60) run(ctx, path((one) => { one.moveTo(points[0][0], points[0][1] + dy); for (let i = 1; i < points.length; i += 2) one.quadraticCurveTo(points[i][0], points[i][1] + dy, points[i + 1][0], points[i + 1][1] + dy) }), '#f4ffe2', 2.4, [8, 8])
    ctx.globalAlpha = 1
  }
  hill([[-80, 450], [180, 330], [520, 440], [800, 520], [1300, 372]], 'hillA')
  hill([[-80, 520], [300, 470], [600, 520], [860, 420], [1300, 500]], 'hillB')
  // The yard.
  const yard = path((p) => { p.moveTo(x0 - 40, 588); p.quadraticCurveTo(300, 570, 590, 584); p.quadraticCurveTo(900, 598, x1 + 40, 576); p.lineTo(x1 + 40, y1 + 40); p.lineTo(x0 - 40, y1 + 40); p.closePath() })
  sew(ctx, yard, 'yard', { pad: 30, stitch: 11 })
  sew(ctx, oval(PUDDLE.x, PUDDLE.y, PUDDLE.rx, PUDDLE.ry + 6), 'water', { pad: 14, stitch: 7, drop: 0 })
  barn(ctx, x0)
}

function barn(ctx: Ctx, x0: number): void {
  const left = Math.min(x0, 0) - 40
  sew(ctx, path((p) => { p.moveTo(left, 236); p.lineTo(250, 236); p.lineTo(250, GROUND + 6); p.lineTo(left, GROUND + 6); p.closePath() }), 'barn', { pad: 26, stitch: 10 })
  // The roof.
  sew(ctx, path((p) => { p.moveTo(left, 92); p.lineTo(96, 92); p.quadraticCurveTo(170, 110, 278, 214); p.lineTo(262, 246); p.lineTo(left, 246); p.closePath() }), 'grey', { pad: 22, stitch: 9 })
  for (const y of [140, 186]) run(ctx, path((p) => { p.moveTo(left, y); p.lineTo(y === 140 ? 178 : 230, y) }), '#e8d8c8', 2.6)
  // The loft's window, dark inside, with a sill.
  sew(ctx, path((p) => p.roundRect(LOFT.x - 84, LOFT.y - 82, 168, 140, 18)), 'dark', { pad: 14, stitch: 0, drop: 0, edge: 5 })
  sew(ctx, path((p) => p.roundRect(LOFT.x - 100, LOFT.y + 46, 200, 26, 10)), 'wood', { pad: 8, stitch: 6 })
  // The stable: dark, with straw on its floor.
  sew(ctx, path((p) => { p.moveTo(8, GROUND + 4); p.lineTo(8, 420); p.quadraticCurveTo(120, 366, STABLE.right, 420); p.lineTo(STABLE.right, GROUND + 4); p.closePath() }), 'dark', { pad: 30, stitch: 0, drop: 0, edge: 6 })
  for (let i = 0; i < 13; i++) {
    ctx.strokeStyle = i % 2 ? '#e6c869' : '#c9a544'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(16 + i * 17, GROUND - 4 - (i % 3) * 6); ctx.lineTo(34 + i * 16, GROUND - 14 + (i % 4) * 5); ctx.stroke()
  }
  for (const x of [8, STABLE.right]) sew(ctx, path((p) => p.roundRect(x - 9, 404, 20, GROUND - 398, 6)), 'wood', { pad: 7, stitch: 5 })
}

/** The bound hem round the stage, over everything that moves. */
export function paintHem(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  for (const [x, y, w, h] of [[x0, y0, x1 - x0, 13], [x0, y1 - 13, x1 - x0, 13], [x0, y0, 13, y1 - y0], [x1 - 13, y0, 13, y1 - y0]]) sew(ctx, path((p) => p.rect(x, y, w, h)), 'hem', { pad: 6, stitch: 4, drop: 0, edge: 2 })
}
