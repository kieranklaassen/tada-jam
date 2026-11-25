import { CELL, HOUSE, ROBIN, SNOW, TREE } from './layout'
import { BAKED, BISCUIT, DARK, GOLD, GREEN, ICING, RED, SHADE, biscuit, blob, crumbs, dot, ell, line, pipe, poly, rounded, sweet, type Ctx, type PathOf } from './paint'
import { makeRng } from './rng'

// What stands still, painted once: a slab of dark gingerbread for the sky,
// biscuit trees and a house, the robin's ledge, the icing snow, and at the
// very front the edge of the slab on its baking paper.

export function paintScene(c: Ctx, x: number, y: number, w: number, h: number): void {
  const rng = makeRng(5)
  const g = c.createLinearGradient(0, y, 0, 580)
  g.addColorStop(0, '#5f311a'); g.addColorStop(1, '#8f5128')
  c.fillStyle = g
  c.fillRect(x, y, w, h)
  crumbs(c, rng, x, y, w, 620 - y, 240)
  // Bubbles of the bake.
  for (let i = 0; i < 40; i++) { const px = x + rng.next() * w, py = y + rng.next() * (560 - y), r = 4 + rng.next() * 9; c.strokeStyle = 'rgba(50,22,8,0.28)'; c.lineWidth = 2; c.beginPath(); c.ellipse(px, py, r, r * 0.7, 0, 0.4, 3.6); c.stroke() }
  // A moon of pale biscuit.
  c.save(); c.translate(1080, 130); biscuit(c, rng, ell(0, 0, 66), 70, '#e7bd7c', '#b47a3c'); pipe(c, ell(0, 0, 52), 4); for (const [a, b, r] of [[-20, -14, 11], [18, 10, 15], [-6, 28, 7]]) pipe(c, ell(a, b, r), 4); c.restore()
  // A garland of sweets.
  for (const [a, b, d] of [[x - 20, 300, 120], [300, 640, 96], [640, x + w + 20, 110]]) {
    const at = (u: number) => ({ x: a + (b - a) * u, y: 14 + Math.sin(u * Math.PI) * d * 0.9 })
    pipe(c, (k) => { k.moveTo(a, 14); for (let u = 0; u <= 1.001; u += 0.05) { const p = at(u); k.lineTo(p.x, p.y) } }, 5)
    for (let i = 1; i < 10; i++) { const p = at(i / 10); if (i % 3 === 0) { c.save(); c.translate(p.x, p.y + 24); biscuit(c, rng, ell(0, 0, 22), 24, '#c98a4a'); pipe(c, ell(0, 0, 14), 3.5); dot(c, 0, 0, 5, RED); c.restore() } else dot(c, p.x, p.y + 8, 8, [RED, GOLD, GREEN][i % 3]) }
  }
  // Hills, far then near.
  const hill = (points: number[], color: string) => { const p: PathOf = (k) => { k.moveTo(x - 10, 620); k.lineTo(x - 10, points[1]); for (let i = 0; i < points.length - 2; i += 2) k.quadraticCurveTo(points[i], points[i + 1], (points[i] + points[i + 2]) / 2, (points[i + 1] + points[i + 3]) / 2); k.lineTo(x + w + 10, points.at(-1)!); k.lineTo(x + w + 10, 620); k.closePath() }; c.fillStyle = color; c.beginPath(); p(c); c.fill(); c.save(); c.beginPath(); p(c); c.clip(); crumbs(c, rng, x, 300, w, 320, 200); c.restore(); pipe(c, p, 8) }
  hill([x, 440, 200, 350, 470, 440, 760, 320, 1000, 420, x + w, 350], '#a5602e')
  for (const [tx, ty, s] of [[430, 420, 0.5], [500, 410, 0.42], [700, 388, 0.5], [770, 372, 0.6], [985, 408, 0.5], [1050, 400, 0.66], [1140, 392, 0.5]]) tree(c, tx, ty, s, rng.next())
  hill([x, 470, 240, 450, 420, 500, 640, 470, 900, 505, x + w, 470], '#b9753a')
  house(c)
  tree(c, TREE.x, TREE.y + 14, 1.75, 0.5)
  tree(c, 1130, 572, 1.25, 0.2)
  tree(c, 1010, 548, 0.8, 0.7)
  // The ledge on which the robin plays.
  const ledge = blob(ROBIN.left - 36, ROBIN.y + 36, ROBIN.left - 20, ROBIN.y - 6, ROBIN.x + 30, ROBIN.y - 2, ROBIN.right + 8, ROBIN.y - 6, ROBIN.right + 36, ROBIN.y + 40, ROBIN.x, ROBIN.y + 58)
  c.fillStyle = ICING; c.beginPath(); ledge(c); c.fill(); c.strokeStyle = SHADE; c.lineWidth = 5; c.beginPath(); ledge(c); c.stroke()
  // The snow: icing poured over the slab.
  const top: PathOf = (k) => { k.moveTo(x - 10, 900); k.lineTo(x - 10, 566); for (let i = x - 10; i < x + w + 40; i += 60) k.quadraticCurveTo(i + 30, 540 + ((i / 60) & 1) * 12, i + 60, 560); k.lineTo(x + w + 40, 900); k.closePath() }
  c.save(); c.translate(0, -5); c.fillStyle = 'rgba(70,34,14,0.3)'; c.beginPath(); top(c); c.fill(); c.restore()
  const s = c.createLinearGradient(0, 550, 0, 800)
  s.addColorStop(0, '#ead8c0'); s.addColorStop(0.3, '#f6ead6'); s.addColorStop(1, '#efdfc8')
  c.fillStyle = s; c.beginPath(); top(c); c.fill()
  c.strokeStyle = 'rgba(214,190,160,0.5)'; c.lineWidth = 4; c.lineCap = 'round'
  for (let i = 0; i < 46; i++) { const px = x + rng.next() * w, py = 590 + rng.next() * 180, q = 14 + rng.next() * 26; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + q, py - 7, px + q * 2, py); c.stroke() }
  // The front: icing drips over the slab's baked edge, on baking paper.
  const bottom = SNOW.y + SNOW.rows * CELL + 4
  c.fillStyle = '#e9dcc3'; c.fillRect(x, bottom + 16, w, y + h - bottom)
  c.strokeStyle = 'rgba(160,130,90,0.3)'; c.lineWidth = 2
  for (let i = 0; i < 14; i++) { const px = x + rng.next() * w; c.beginPath(); c.moveTo(px, bottom + 30); c.lineTo(px + 40 + rng.next() * 60, y + h); c.stroke() }
  c.fillStyle = BAKED; c.fillRect(x, bottom, w, 26); c.fillStyle = DARK; c.fillRect(x, bottom + 21, w, 7)
  crumbs(c, rng, x, bottom, w, 26, 60)
  const drip: PathOf = (k) => { k.moveTo(x - 10, bottom - 12); for (let i = x - 10; i < x + w + 20; i += 44) { const d = 6 + ((i * 7919) % 17 + 17) % 17; k.quadraticCurveTo(i + 4, bottom + d, i + 18, bottom + d); k.quadraticCurveTo(i + 38, bottom + d, i + 44, bottom - 3) } k.lineTo(x + w + 30, bottom - 14); k.closePath() }
  c.fillStyle = '#efdfc8'; c.beginPath(); drip(c); c.fill()
}

export function tree(c: Ctx, x: number, y: number, s: number, v: number): void {
  const rng = makeRng(Math.floor(v * 9999))
  c.save(); c.translate(x, y); c.scale(s, s)
  biscuit(c, rng, rounded(-12, -24, 24, 30, 4), 40, DARK)
  const p: PathOf = (k) => { k.moveTo(0, -190); k.quadraticCurveTo(22, -150, 44, -128); k.lineTo(26, -126); k.quadraticCurveTo(46, -92, 66, -74); k.lineTo(40, -72); k.quadraticCurveTo(56, -36, 80, -18); k.lineTo(-80, -18); k.quadraticCurveTo(-56, -36, -40, -72); k.lineTo(-66, -74); k.quadraticCurveTo(-46, -92, -26, -126); k.lineTo(-44, -128); k.quadraticCurveTo(-22, -150, 0, -190) }
  c.translate(0, 0); biscuit(c, rng, p, 200, '#935226')
  for (const [w, yy] of [[34, -130], [52, -78], [66, -26]]) pipe(c, (k) => { k.moveTo(-w, yy); for (let i = 0; i < 4; i++) k.quadraticCurveTo(-w + (i + 0.5) * w * 0.5, yy + 17, -w + (i + 1) * w * 0.5, yy) }, 7)
  for (const [a, b, col] of [[0, -150, RED], [-14, -100, GOLD], [16, -96, RED], [-30, -48, RED], [4, -54, GOLD], [34, -48, GREEN]] as const) dot(c, a, b, 5, col)
  c.restore()
}

function house(c: Ctx): void {
  const rng = makeRng(77)
  c.save(); c.translate(HOUSE.x, HOUSE.y + 92)
  biscuit(c, rng, rounded(-92, -150, 184, 152, 4), 160, BISCUIT)
  biscuit(c, rng, rounded(46, -262, 32, 70, 3), 270, DARK)
  pipe(c, line(42, -262, 82, -262), 11)
  biscuit(c, rng, poly(-122, -138, 0, -258, 122, -138), 270, '#935226')
  pipe(c, line(-122, -138, 0, -258, 122, -138), 13)
  for (let row = 0; row < 3; row++) pipe(c, (k) => { const w = 34 + row * 30, yy = -206 + row * 30; k.moveTo(-w, yy); for (let i = 0; i < 2 + row * 2; i++) { const n = (w * 2) / (2 + row * 2); k.quadraticCurveTo(-w + (i + 0.5) * n, yy + 16, -w + (i + 1) * n, yy) } }, 5)
  for (const wx of [-56, 56]) { sweet(c, rounded(wx - 24, -112, 48, 46, 8), GOLD); pipe(c, rounded(wx - 24, -112, 48, 46, 8), 6); pipe(c, line(wx, -110, wx, -68), 4) }
  biscuit(c, rng, rounded(-22, -72, 44, 76, 18), 100, RED, '#7f1c18')
  pipe(c, rounded(-22, -72, 44, 76, 18), 5); dot(c, 11, -32, 5, GOLD)
  for (let i = 0; i < 9; i++) dot(c, -84 + i * 21, -140, 6, [ICING, RED][i % 2])
  pipe(c, line(-92, 2, -30, 2), 10); pipe(c, line(30, 2, 92, 2), 10)
  c.restore()
}
