import { FLOOR, HOOK, SPOTS } from './layout'
import { CREAM, DEEP, INK, OCHRE, TEAL, blob, boxOf, dabs, ellipse, poly, rounded, shape, type Ctx } from './paint'
import { makeRng } from './rng'

// What stands still: painted once for a surface and stamped.

const BROWN = '#b8622c'

/** Paints the parlour over a box wider than the stage, so that a surface of any shape is filled. */
export function paintRoom(ctx: Ctx, x0: number, y0: number, w: number, h: number): void {
  const r = makeRng(5)
  ctx.fillStyle = TEAL
  ctx.fillRect(x0, y0, w, h)
  // Wallpaper: pale stripes and a sprig, printed with the sponge.
  for (let x = Math.floor(x0 / 118) * 118; x < x0 + w; x += 118) {
    dabs(ctx, r, { x, y: y0, w: 52, h: FLOOR - y0 }, '#7dbdb1', 'left', 1, 3, 0.55)
    for (let y = y0 + 40; y < FLOOR - 40; y += 108) {
      const yy = y + (Math.round(x / 118) % 2) * 54
      shape(ctx, r, ellipse(x + 85, yy, 7, 11, 0.6), boxOf(0, 0, 1, 1), '#478f88')
      shape(ctx, r, ellipse(x + 98, yy + 4, 7, 11, -0.6), boxOf(0, 0, 1, 1), '#478f88')
    }
  }
  dabs(ctx, r, { x: x0, y: y0, w, h: 170 }, '#2f7d7c', 'top', 1, 3.4, 0.7)
  // The window, with a hill, a moonless evening and a tree.
  shape(ctx, r, rounded(300, 66, 190, 168, 12), boxOf(395, 150, 95, 84), CREAM, { color: OCHRE, side: 'bottom', reach: 0.3 })
  ctx.save()
  ctx.beginPath(); rounded(314, 80, 162, 140, 6)(ctx); ctx.clip()
  shape(ctx, r, rounded(310, 76, 170, 150, 2), boxOf(395, 150, 85, 75), '#f4cf7d', { color: CREAM, side: 'bottom', reach: 0.7 })
  shape(ctx, r, ellipse(350, 236, 90, 60), boxOf(350, 236, 90, 60), '#3f8f5b', { color: DEEP, side: 'top', reach: 0.4 })
  shape(ctx, r, ellipse(460, 240, 80, 46), boxOf(460, 240, 80, 46), DEEP, { color: '#3f8f5b', side: 'top', reach: 0.5 })
  ctx.restore()
  shape(ctx, r, rounded(391, 70, 8, 160, 2), boxOf(0, 0, 1, 1), CREAM)
  shape(ctx, r, rounded(304, 146, 182, 8, 2), boxOf(0, 0, 1, 1), CREAM)
  for (const s of [-1, 1]) {
    const x = s < 0 ? 270 : 474
    shape(ctx, r, blob(x, 52, x + 46, 52, x + (s < 0 ? 20 : 44), 150, x + 40, 256, x + 2, 256, x + (s < 0 ? -2 : 18), 150), { x: x - 4, y: 52, w: 56, h: 210 }, OCHRE, { color: BROWN, side: s < 0 ? 'left' : 'right', reach: 0.6 })
  }
  shape(ctx, r, rounded(254, 44, 282, 16, 8), boxOf(395, 52, 141, 8), BROWN)
  // Portraits: a sausage dog in a ruff would be a second sausage, so they are hills and a pear.
  for (const [x, y, k] of [[960, 150, 0], [690, 108, 1]] as const) {
    shape(ctx, r, ellipse(x, y, 44, 54), boxOf(x, y, 44, 54), BROWN, { color: INK, side: 'bottom', reach: 0.4 })
    shape(ctx, r, ellipse(x, y, 34, 43), boxOf(x, y, 34, 43), k ? DEEP : CREAM, { color: OCHRE, side: 'bottom', reach: 0.3 })
    if (k) shape(ctx, r, blob(x - 6, y - 26, x + 8, y - 26, x + 22, y + 20, x, y + 32, x - 22, y + 20), boxOf(x, y + 4, 24, 30), OCHRE, { color: '#3f8f5b', side: 'left', reach: 0.6 })
    else { shape(ctx, r, ellipse(x - 2, y + 6, 18, 20), boxOf(x, y + 6, 18, 20), INK); shape(ctx, r, ellipse(x - 2, y - 18, 11, 13), boxOf(x, y - 18, 11, 13), OCHRE) }
  }
  // The hatch the string hangs from.
  shape(ctx, r, rounded(HOOK.x - 66, y0, 132, -y0 + 14, 8), boxOf(HOOK.x, 0, 66, 14), BROWN, { color: INK, side: 'bottom', reach: 0.5 })
  shape(ctx, r, rounded(HOOK.x - 50, y0, 100, -y0 + 4, 4), boxOf(0, 0, 1, 1), INK)
  // Two shelves.
  for (const at of [SPOTS.gramophone.at, SPOTS.pot.at]) {
    const y = at === SPOTS.pot.at ? at.y + 66 : at.y + 78
    shape(ctx, r, rounded(at.x - 88, y, 176, 15, 5), boxOf(at.x, y + 7, 88, 8), BROWN, { color: INK, side: 'bottom', reach: 0.6 })
    for (const s of [-1, 1]) shape(ctx, r, poly(at.x + s * 64, y + 14, at.x + s * 64, y + 46, at.x + s * 40, y + 14), boxOf(0, 0, 1, 1), BROWN)
  }
  // Skirting and the floor.
  ctx.fillStyle = CREAM
  ctx.fillRect(x0, FLOOR - 22, w, 24)
  dabs(ctx, r, { x: x0, y: FLOOR - 22, w, h: 24 }, OCHRE, 'bottom', 0.8, 2.4, 0.8)
  ctx.fillStyle = DEEP
  ctx.fillRect(x0, FLOOR, w, y0 + h - FLOOR)
  for (let y = FLOOR + 34, i = 0; y < y0 + h; y += 46, i++) {
    ctx.fillStyle = '#184a56'
    ctx.fillRect(x0, y, w, 4)
    for (let x = x0 - ((i * 97) % 230); x < x0 + w; x += 230) ctx.fillRect(x, y - 42, 4, 42)
  }
  dabs(ctx, r, { x: x0, y: FLOOR, w, h: 90 }, '#123c49', 'top', 1, 3, 0.8)
  // The rug.
  shape(ctx, r, ellipse(590, 716, 545, 96), boxOf(590, 716, 545, 96), '#274d78', { color: INK, side: 'bottom', reach: 0.5, size: 3 })
  ctx.save()
  ctx.beginPath(); ellipse(590, 716, 545, 96)(ctx); ellipse(590, 716, 515, 82)(ctx); ctx.clip('evenodd')
  shape(ctx, r, ellipse(590, 716, 545, 96), boxOf(590, 716, 545, 96), OCHRE, { color: BROWN, side: 'bottom', reach: 0.6, size: 3 })
  ctx.restore()
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2
    shape(ctx, r, ellipse(590 + Math.cos(a) * 470, 716 + Math.sin(a) * 66, 9, 6), boxOf(0, 0, 1, 1), '#7dbdb1')
  }
}
