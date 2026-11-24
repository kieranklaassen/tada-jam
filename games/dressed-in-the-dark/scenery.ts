import { BED, LAMP, LINE, MOON, WARDROBE, WINDOW, bedX, pegOf, sag } from './layout'
import { C, type Pen } from './lacquer'
import { BEDS } from './night'
import { GARMENTS } from './things'
import { makeRng } from './rng'

/** A quilt's cloth by lamp light. It belongs to the bed. */
export const QUILTS = [C.lapis, C.scarlet, C.emerald, C.violet, C.saffron]

// What never moves, painted once for each size in each of two lights: a box lid of black lacquer by night, with
// the lit window set into it, and a cinnabar one by lamp light.

/** A bough of leaves and berries, the box's own ornament. */
function bough(pen: Pen, x: number, y: number, turn: number, size: number, lit: boolean): void {
  const ctx = pen.ctx
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  ctx.scale(size, size)
  ctx.globalAlpha *= lit ? 0.85 : 0.42
  pen.wire([0, 0, 30, -16, 64, -6, 96, -26], 2.4, C.gold)
  for (let i = 0; i < 5; i++) for (const side of [-1, 1]) {
    const px = 12 + i * 18, py = -6 - Math.sin(i) * 6
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.quadraticCurveTo(px + 4, py + side * 18, px + 18, py + side * 20)
    ctx.quadraticCurveTo(px + 17, py + side * 4, px, py)
    ctx.strokeStyle = C.gold
    ctx.lineWidth = 1.6
    ctx.stroke()
    if (lit && side > 0) { ctx.fillStyle = C.gold; ctx.globalAlpha *= 0.5; ctx.fill(); ctx.globalAlpha /= 0.5 }
  }
  for (const [px, py] of [[100, -30], [94, -40], [106, -38]] as const) {
    ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fillStyle = lit ? C.saffron : C.night; ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.stroke()
  }
  ctx.restore()
}

/** `left`, `top`, `right`, `bottom` are the whole surface in stage units, so that the room runs to its edges. */
export function paintRoom(pen: Pen, lit: boolean, left: number, top: number, right: number, bottom: number): void {
  const ctx = pen.ctx
  pen.dark = 0
  const ground = ctx.createRadialGradient(590, 330, 60, 590, 400, 900)
  if (lit) { ground.addColorStop(0, '#b4281b'); ground.addColorStop(0.5, C.cinnabar); ground.addColorStop(1, '#4e0c0d') }
  else { ground.addColorStop(0, '#25203a'); ground.addColorStop(0.45, '#14111d'); ground.addColorStop(1, '#08070c') }
  ctx.fillStyle = ground
  ctx.fillRect(left, top, right - left, bottom - top)

  // Dust of gold in the lacquer.
  const stream = makeRng(11), rng = () => stream.next()
  ctx.fillStyle = C.gold
  for (let i = 0; i < 240; i++) {
    ctx.globalAlpha = (lit ? 0.5 : 0.28) * rng()
    ctx.fillRect(left + rng() * (right - left), top + rng() * (bottom - top), 1.5, 1.5)
  }
  ctx.globalAlpha = 1
  // Wallpaper of boughs, off the window.
  for (const [x, y, turn, size] of [[176, 372, -0.4, 0.9], [930, 356, 0.1, 0.8], [1030, 60, 2.2, 0.7], [1016, 360, -1.1, 0.8], [36, 388, -0.6, 0.8], [560, 372, -0.1, 0.8], [740, 376, 0.2, 0.75], [370, 372, 0, 0.75]] as const) bough(pen, x, y, turn, size, lit)

  // The floor: boards as gold lines running to the middle, and a rug of scales.
  ctx.save()
  ctx.beginPath(); ctx.rect(left, 640, right - left, bottom - 640); ctx.clip()
  ctx.fillStyle = lit ? '#5c0f10' : '#0a090f'
  ctx.fillRect(left, 640, right - left, bottom - 640)
  ctx.globalAlpha = lit ? 0.4 : 0.22
  for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(590 + i * 64, 640); ctx.lineTo(590 + i * 112, bottom); ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6; ctx.stroke() }
  ctx.restore()
  ctx.beginPath(); ctx.moveTo(left, 640); ctx.lineTo(right, 640); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.globalAlpha = lit ? 1 : 0.6; ctx.stroke(); ctx.globalAlpha = 1

  paintWindow(pen, lit)
  paintWardrobe(pen, lit)
  for (let bed = 0; bed < BEDS; bed++) paintBed(pen, bedX(bed), lit, QUILTS[bed])
  paintLampPost(pen)

  // The lid's own gold border, at the surface's edge.
  ctx.strokeStyle = C.gold
  ctx.globalAlpha = lit ? 0.95 : 0.6
  ctx.lineWidth = 3
  ctx.strokeRect(left + 5, top + 5, right - left - 10, bottom - top - 10)
  ctx.lineWidth = 1.4
  ctx.strokeRect(left + 11, top + 11, right - left - 22, bottom - top - 22)
  ctx.globalAlpha = 1
}

function paintWindow(pen: Pen, lit: boolean): void {
  const ctx = pen.ctx, { x, y, width, height } = WINDOW
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, [70, 70, 10, 10])
  const sky = ctx.createLinearGradient(0, y, 0, y + height)
  if (lit) { sky.addColorStop(0, '#16245c'); sky.addColorStop(1, '#2f58a8') }
  else { sky.addColorStop(0, '#2a4aa0'); sky.addColorStop(0.6, '#5b8fd8'); sky.addColorStop(1, '#a9cdef') }
  ctx.fillStyle = sky
  ctx.fill()
  ctx.clip()
  const glow = ctx.createRadialGradient(MOON.x, MOON.y, 20, MOON.x, MOON.y, 360)
  glow.addColorStop(0, lit ? 'rgba(255,226,150,0.55)' : 'rgba(255,236,180,0.95)')
  glow.addColorStop(1, 'rgba(255,226,150,0)')
  ctx.fillStyle = glow
  ctx.fillRect(x, y, width, height)
  // Clouds in curls, hills, a far tree of gold.
  for (const [cx, cy, s] of [[300, 78, 1], [860, 70, 1.1], [450, 246, 0.8], [770, 238, 0.9]] as const) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.globalAlpha = 0.55
    pen.blob([-60, 10, -56, -10, -30, -12, -18, -32, 14, -26, 22, -12, 50, -14, 60, 8], '#e9f1fb', 1.6)
    pen.wire([-30, -2, -14, -14, 0, -4, -10, 4], 1.6)
    pen.wire([14, -4, 28, -12, 36, -2], 1.6)
    ctx.restore()
  }
  const hill = lit ? ['#1c3a6e', '#173260'] : ['#3d6fb0', '#2d5892']
  pen.blob([x - 60, 340, x - 20, 286, 340, 258, 520, 296, 660, 290, 840, 250, 1060, 292, 1080, 340], hill[0], 1.8)
  pen.blob([x - 60, 350, x, 312, 300, 296, 470, 300, 620, 280, 800, 306, 1060, 296, 1080, 350], hill[1], 1.8)
  for (const [tx, ty] of [[250, 288], [276, 290], [920, 286], [944, 282], [966, 288]] as const) { pen.wire([tx, ty + 8, tx, ty - 8], 2.4); pen.ell(tx, ty - 18, 10, 14, hill[1], 1.6) }
  // Little stars, drawn as gold dots.
  const stream = makeRng(5), rng = () => stream.next()
  for (let i = 0; i < 26; i++) { ctx.fillStyle = C.cream; ctx.globalAlpha = 0.6 + rng() * 0.4; ctx.beginPath(); ctx.arc(x + 30 + rng() * (width - 60), y + 14 + rng() * 170, 1 + rng() * 1.6, 0, 7); ctx.fill() }
  ctx.globalAlpha = 1
  ctx.restore()
  // The frame.
  ctx.beginPath(); ctx.roundRect(x, y, width, height, [70, 70, 10, 10])
  ctx.strokeStyle = C.gold; ctx.lineWidth = 7; ctx.stroke()
  ctx.beginPath(); ctx.roundRect(x - 8, y - 8, width + 16, height + 16, [76, 76, 14, 14])
  ctx.lineWidth = 2; ctx.stroke()
  pen.box(x - 22, y + height, width + 44, 18, 6, lit ? '#3b0a0c' : '#15121c', 2.4)
  // The line.
  ctx.beginPath()
  for (let i = 0; i <= 30; i++) { const lx = LINE.left + (LINE.right - LINE.left) * i / 30, ly = LINE.y + sag(lx); if (i === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly) }
  ctx.strokeStyle = '#3c2a14'; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = C.cream; ctx.lineWidth = 2.6; ctx.stroke()
  for (const garment of GARMENTS) { const px = pegOf(garment).x; pen.box(px - 4, LINE.y + sag(px) - 12, 8, 22, 3, C.cream, 1.4) }
}

function paintWardrobe(pen: Pen, lit: boolean): void {
  const { x, y, width, height } = WARDROBE, wood = lit ? '#26070a' : '#100e16'
  pen.box(x, y, width, height, 10, wood, 3)
  pen.blob([x - 4, y + 4, x + 20, y - 18, x + width / 2, y - 30, x + width - 20, y - 18, x + width + 4, y + 4], wood, 3)
  pen.box(x + 8, y + height - 4, 24, 20, 6, wood, 2.4)
  pen.box(x + width - 32, y + height - 4, 24, 20, 6, wood, 2.4)
  const ctx = pen.ctx
  ctx.globalAlpha = lit ? 1 : 0.6
  bough(pen, x + 50, y - 6, 0.06, 0.5, lit)
  ctx.globalAlpha = 1
}

export function bedPanel(pen: Pen, x: number, lit: boolean): void {
  const half = BED.width / 2, wood = lit ? '#1c0608' : '#0d0b12'
  pen.box(x - half - 4, BED.foot - 36, BED.width + 8, 46, 12, wood, 2.6)
  pen.box(x - half - 4, BED.foot + 4, 20, 22, 5, wood, 2.2)
  pen.box(x + half - 16, BED.foot + 4, 20, 22, 5, wood, 2.2)
  const ctx = pen.ctx
  ctx.save()
  ctx.globalAlpha = lit ? 1 : 0.7
  for (let i = -2; i <= 2; i++) { pen.ell(x + i * 36, BED.foot - 14, 9, 9, lit ? C.cinnabar : C.night, 1.6); pen.ell(x + i * 36, BED.foot - 14, 3, 3, C.gold, 0) }
  ctx.restore()
}

function paintBed(pen: Pen, x: number, lit: boolean, quilt: string): void {
  const half = BED.width / 2, wood = lit ? '#1c0608' : '#0d0b12'
  // The headboard: an onion arch.
  pen.ctx.beginPath()
  pen.ctx.moveTo(x - half, BED.foot - 20)
  pen.ctx.lineTo(x - half, BED.head + 62)
  pen.ctx.quadraticCurveTo(x - half, BED.head + 18, x - 30, BED.head + 10)
  pen.ctx.quadraticCurveTo(x - 8, BED.head + 4, x, BED.head - 14)
  pen.ctx.quadraticCurveTo(x + 8, BED.head + 4, x + 30, BED.head + 10)
  pen.ctx.quadraticCurveTo(x + half, BED.head + 18, x + half, BED.head + 62)
  pen.ctx.lineTo(x + half, BED.foot - 20)
  pen.ctx.closePath()
  pen.paint(wood, 3)
  pen.ell(x, BED.head - 18, 7, 8, lit ? C.saffron : C.night, 2)
  pen.ctx.save()
  pen.ctx.globalAlpha = lit ? 0.9 : 0.4
  for (const side of [-1, 1]) pen.wire([x, BED.head + 34, x + side * 34, BED.head + 30, x + side * 66, BED.head + 44, x + side * 84, BED.head + 84, x + side * 70, BED.head + 78], 1.8)
  pen.ctx.restore()
  pen.box(x - 70, BED.top - 6, 140, 62, 26, lit ? C.white : '#221e2c', 2.4)
  pen.box(x - half + 8, BED.top + 176, BED.width - 16, 96, 16, lit ? quilt : '#17141f', 2.2)
  pen.box(x - half + 8, BED.top + 164, BED.width - 16, 26, 12, lit ? C.ivory : '#221e2c', 2.2)
  pen.ctx.globalAlpha = lit ? 0.7 : 0.3
  for (let row = 0; row < 3; row++) for (let i = -2; i <= 2; i++) { const sx = x + i * 34 + (row % 2) * 17 - 8, sy = BED.top + 192 + row * 24; pen.wire([sx - 17, sy, sx, sy + 34, sx + 17, sy], 1.6) }
  pen.ctx.globalAlpha = 1
}

function paintLampPost(pen: Pen): void {
  pen.wire([LAMP.x, -200, LAMP.x, LAMP.y - 44], 4)
}
