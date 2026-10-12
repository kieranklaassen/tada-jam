import { MAT, SILL_TOP } from './layout'
import { HUE, blob, creases, ellipse, sheet, type Ctx } from './paper'
import { STAGE } from './stage'

// Everything that stands still, painted once and stamped once a frame: the garden behind the pane, pale and out
// of focus; paper hills and a paper house stuck to the glass; the mat, which is plain cream paper; and the
// wooden sill along the bottom with its two pots. The setting is paler than anything that can be touched.
//
// `view` is what of the stage's plane the surface shows, in stage units: on a surface of another shape than the
// stage the garden and the sill run on past the stage's edges.

export type Extent = { left: number; top: number; right: number; bottom: number }

function glow(ctx: Ctx, x: number, y: number, r: number, rgb: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb},${alpha})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

function garden(ctx: Ctx, view: Extent): void {
  const sky = ctx.createLinearGradient(0, 0, 0, STAGE.height)
  sky.addColorStop(0, '#d8eeff')
  sky.addColorStop(0.38, '#f3fbea')
  sky.addColorStop(1, '#cfe9b8')
  ctx.fillStyle = sky
  ctx.fillRect(view.left, view.top, view.right - view.left, view.bottom - view.top)
  // The sun, out of frame at the top left, and its light on the glass.
  glow(ctx, 210, 30, 520, '255,241,170', 0.85)
  // Trees and a hedge, far off and soft.
  glow(ctx, 40, 250, 260, '110,186,104', 0.4)
  glow(ctx, 1150, 220, 280, '96,176,110', 0.42)
  glow(ctx, 870, 120, 170, '150,206,120', 0.3)
  glow(ctx, 520, 150, 150, '170,214,140', 0.22)
  const hedge = ctx.createLinearGradient(0, 230, 0, 360)
  hedge.addColorStop(0, 'rgba(120,186,110,0)')
  hedge.addColorStop(0.5, 'rgba(120,186,110,0.3)')
  hedge.addColorStop(1, 'rgba(120,186,110,0)')
  ctx.fillStyle = hedge
  ctx.fillRect(view.left, 230, view.right - view.left, 130)
  // Flower beds at the sides, as smudges of colour.
  const beds: [number, number, number, string][] = [[36, 470, 60, '255,150,190'], [70, 700, 70, '255,214,120'], [1150, 470, 64, '255,170,120'], [1120, 700, 80, '255,150,200'], [240, 740, 60, '190,160,255'], [990, 740, 60, '255,220,130']]
  for (const [x, y, r, rgb] of beds) glow(ctx, x, y, r, rgb, 0.4)
}

/** Paper stuck on the pane behind everything: three hills that overlap, and a small house. */
function panePaper(ctx: Ctx, view: Extent, seed: number): void {
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  const w = view.right - view.left
  sheet(ctx, (c) => blob(c, [[view.left - 40, 420], [view.left - 40, 250], [150, 196], [420, 236], [640, 300], [700, 420]]), HUE.yellow, 0.3, creases(seed, 90), 4, 420)
  sheet(ctx, (c) => blob(c, [[300, 430], [420, 280], [640, 214], [900, 244], [1080, 330], [1100, 430]]), HUE.green, 0.26, creases(seed, 91), 4, 420)
  sheet(ctx, (c) => blob(c, [[760, 430], [900, 300], [1100, 226], [view.left + w + 40, 250], [view.left + w + 40, 430]]), HUE.blue, 0.22, creases(seed, 92), 3, 420)
  // A tree at the far left, behind the arches: a trunk and three round crowns.
  sheet(ctx, (c) => c.rect(58, 150, 20, 90), HUE.orange, 0.45)
  sheet(ctx, (c) => ellipse(c, 44, 150, 52, 46), HUE.green, 0.42, creases(seed, 99), 2, 60)
  sheet(ctx, (c) => ellipse(c, 96, 128, 46, 42), HUE.turquoise, 0.36, creases(seed, 100), 2, 60)
  sheet(ctx, (c) => ellipse(c, 74, 96, 40, 36), HUE.yellow, 0.4, creases(seed, 101), 1, 50)
  // The house, between the smallest doll and the silk.
  sheet(ctx, (c) => c.rect(868, 236, 76, 62), HUE.pink, 0.4, creases(seed, 93), 1, 80)
  sheet(ctx, (c) => { c.moveTo(856, 240); c.lineTo(906, 190); c.lineTo(956, 240); c.closePath() }, HUE.red, 0.42, creases(seed, 94), 1, 80)
  sheet(ctx, (c) => c.rect(894, 262, 24, 36), HUE.orange, 0.4)
  ctx.restore()
}

function mat(ctx: Ctx, seed: number): void {
  ctx.save()
  // The mat is plain: cream paper that lets less light through than the rest, with a deeper rim and two folds.
  ctx.beginPath()
  ellipse(ctx, MAT.x, MAT.y + 7, MAT.rx + 5, MAT.ry + 5)
  ctx.fillStyle = 'rgba(120,150,110,0.2)'
  ctx.fill()
  ctx.beginPath()
  ellipse(ctx, MAT.x, MAT.y, MAT.rx, MAT.ry)
  ctx.fillStyle = HUE.cream
  ctx.globalAlpha = 0.94
  ctx.fill()
  ctx.globalAlpha = 0.9
  ctx.lineWidth = 9
  ctx.strokeStyle = '#f4dfa6'
  ctx.beginPath()
  ellipse(ctx, MAT.x, MAT.y, MAT.rx - 5, MAT.ry - 5)
  ctx.stroke()
  ctx.beginPath()
  ellipse(ctx, MAT.x, MAT.y, MAT.rx - 16, MAT.ry - 16)
  ctx.clip()
  const rng = creases(seed, 95)
  for (let i = 0; i < 2; i++) {
    // The two folds lean opposite ways and do not meet on the mat, so they are neither a pair of level strokes nor a cross.
    const y = i === 0 ? MAT.y - 70 + rng.next() * 20 : MAT.y + 55 + rng.next() * 20, tilt = i === 0 ? 14 + rng.next() * 8 : -(30 + rng.next() * 10)
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = '#f1e2b8'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(MAT.x - MAT.rx, y - tilt)
    ctx.lineTo(MAT.x + MAT.rx, y + tilt)
    ctx.stroke()
  }
  ctx.restore()
}

function pot(ctx: Ctx, x: number, seed: number, thing: number, tall: boolean): void {
  const rng = creases(seed, thing)
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  // Leaves, as long folded sheets fanning out of the pot.
  const leaves = tall ? 5 : 4, reach = tall ? 84 : 62
  for (let i = 0; i < leaves; i++) {
    const lean = ((i + 0.5) / leaves - 0.5) * 1.9, tipX = x + Math.sin(lean) * reach, tipY = SILL_TOP - 8 - Math.cos(lean) * reach
    const side = Math.cos(lean) * 13, up = Math.sin(lean) * 13
    sheet(ctx, (c) => { c.moveTo(x, SILL_TOP + 2); c.quadraticCurveTo((x + tipX) / 2 - side, (SILL_TOP + tipY) / 2 - up, tipX, tipY); c.quadraticCurveTo((x + tipX) / 2 + side, (SILL_TOP + tipY) / 2 + up, x, SILL_TOP + 2) }, i % 2 ? HUE.green : HUE.turquoise, 0.6, rng, 1, 70)
  }
  if (tall) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      sheet(ctx, (c) => ellipse(c, x + 6 + Math.cos(a) * 13, SILL_TOP - 92 + Math.sin(a) * 13, 12, 12), HUE.pink, 0.55)
    }
    sheet(ctx, (c) => ellipse(c, x + 6, SILL_TOP - 92, 8, 8), HUE.yellow, 0.8)
  }
  sheet(ctx, (c) => { c.moveTo(x - 34, SILL_TOP - 2); c.lineTo(x + 34, SILL_TOP - 2); c.lineTo(x + 26, SILL_TOP + 52); c.lineTo(x - 26, SILL_TOP + 52); c.closePath() }, HUE.orange, 0.85, rng, 2, 60)
  sheet(ctx, (c) => c.rect(x - 38, SILL_TOP - 8, 76, 14), HUE.red, 0.6)
  ctx.restore()
}

function sill(ctx: Ctx, view: Extent, seed: number): void {
  const w = view.right - view.left
  const wood = ctx.createLinearGradient(0, SILL_TOP, 0, STAGE.height)
  wood.addColorStop(0, '#f1d3a2')
  wood.addColorStop(0.16, '#e2b97f')
  wood.addColorStop(1, '#c99a62')
  // A soft line of shade where the sill meets the pane, then the wood.
  ctx.fillStyle = 'rgba(96,120,90,0.16)'
  ctx.fillRect(view.left, SILL_TOP - 8, w, 8)
  ctx.fillStyle = wood
  ctx.fillRect(view.left, SILL_TOP, w, Math.max(view.bottom, STAGE.height) - SILL_TOP)
  ctx.fillStyle = 'rgba(255,250,235,0.7)'
  ctx.fillRect(view.left, SILL_TOP, w, 3)
  // The grain of the wood: a few long pale lines.
  const rng = creases(seed, 96)
  ctx.strokeStyle = 'rgba(150,104,58,0.22)'
  ctx.lineWidth = 1.5
  // Three, at uneven heights, each bending its own way: not a row of level strokes.
  for (const down of [13, 41, 88]) {
    const y = SILL_TOP + down + rng.next() * 6
    ctx.beginPath()
    ctx.moveTo(view.left, y)
    ctx.bezierCurveTo(view.left + w * 0.3, y + 26 * (rng.next() - 0.5), view.left + w * 0.6, y + 30 * (rng.next() - 0.5), view.right, y + 14 * (rng.next() - 0.5))
    ctx.stroke()
  }
  pot(ctx, 92, seed, 97, false)
  pot(ctx, 912, seed, 98, true)
}

/** Paints the whole setting. The caller has set the transform to stage units. */
export function paintScenery(ctx: Ctx, view: Extent, seed: number): void {
  garden(ctx, view)
  panePaper(ctx, view, seed)
  mat(ctx, seed)
  sill(ctx, view, seed)
}

/** The bare backdrop of the look, for a surface drawn before the save has been read: the garden and nothing on it. */
export function paintBackdrop(ctx: Ctx, view: Extent): void {
  garden(ctx, view)
}
