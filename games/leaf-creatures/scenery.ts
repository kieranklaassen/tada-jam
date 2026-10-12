import { paintAirLeaf, paintFrond } from './castArt'
import { CAST, EARTH, FERN, HEAP_Y, STUMP, inEllipse } from './clearing'
import { INK, blobPath, ellipsePath, type Ink, type Wax } from './crayon'
import { STAGE } from './stage'

// The clearing, drawn once in wax crayon and stamped as one picture: sky,
// far trees, grass, the dark bare earth and the strip of soil the heaps lie
// on, the stump, the two near trunks, the fern and the tree tops, with leaf
// litter, tufts and mushrooms between. It is drawn as far past the stage as
// the surface shows (`spill`), so a surface of another shape is wood from
// edge to edge: more tree tops above a tall one, more grass, litter and
// mushrooms below it, more trunks beside a wide one.
// Everything here stands still and nothing in it answers as a thing of its
// own: it is lower in contrast than whatever can be touched.

const soft = (angle: number, gap = 5, width = 5.6, alpha = 0.9) => ({ angle, gap, width, alpha })

function lump(wax: Wax, x: number, y: number, r: number, squat = 1): Path2D {
  const points: number[] = []
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, rr = r * (0.86 + 0.2 * Math.abs(wax.jitter()))
    points.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr * squat)
  }
  return blobPath(points)
}

/** How low the tree tops hang at `x`: low at both sides, where the wind children sit, and high in the middle. */
export function canopyBottom(x: number): number {
  const big = Math.max(0, 1 - Math.abs(x - CAST.big.x) / 300), small = Math.max(0, 1 - Math.abs(x - CAST.small.x) / 270)
  const edge = Math.max(0, 1 - x / 160, 1 - (STAGE.width - x) / 160)
  return 92 + 128 * Math.max(big, small, edge * 0.9)
}

const CANOPY: readonly Ink[] = [INK.orange, INK.yellow, INK.red, INK.gold, INK.olive, INK.orange, INK.yellow]

export function paintScenery(wax: Wax, spill: { x: number; y: number }): void {
  const ctx = wax.ctx, left = -spill.x, right = STAGE.width + spill.x, top = -spill.y, bottom = STAGE.height + spill.y
  const rect = (x0: number, y0: number, x1: number, y1: number): Path2D => { const p = new Path2D(); p.rect(x0, y0, x1 - x0, y1 - y0); return p }
  const cut = (shape: Path2D): void => { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fill(shape); ctx.restore() }

  // Sky, in loose strokes that leave the paper between them.
  wax.scribble(rect(left, top, right, 300), { x: STAGE.width / 2, y: 120, r: 800 }, INK.sky, soft(0.03, 11, 8, 0.75))
  // Far trees: pale trunks and a haze of leaves.
  for (let i = 0; i < Math.ceil((right - left) / 132); i++) {
    const x = left + 40 + i * 132 + wax.jitter() * 30, w = 9 + Math.abs(wax.jitter()) * 8
    wax.fill(rect(x - w, 30, x + w, 276), { x, y: 150, r: 130 }, INK.farBark, soft(1.5, 5, 5, 0.7), undefined, 3)
  }
  for (let i = 0; i <= Math.ceil((right - left) / 100); i++) {
    const x = left + i * 100 + wax.jitter() * 30, y = 196 + wax.jitter() * 26, r = 44 + Math.abs(wax.jitter()) * 22
    wax.fill(lump(wax, x, y, r, 0.7), { x, y, r: r + 6 }, i % 3 === 0 ? INK.orange : i % 3 === 1 ? INK.yellow : INK.moss, soft(0.4 + i, 7, 6, 0.42), undefined, 6)
  }

  // Grass from the far edge of the clearing to the near one.
  const horizon: number[] = [left, bottom, left, 262]
  for (let x = left; x <= right; x += 70) horizon.push(x, 258 + wax.jitter() * 9)
  horizon.push(right, 262, right, bottom)
  const grass = new Path2D()
  for (let i = 0; i < horizon.length; i += 2) { if (i === 0) grass.moveTo(horizon[i], horizon[i + 1]); else grass.lineTo(horizon[i], horizon[i + 1]) }
  grass.closePath()
  cut(grass)
  wax.fill(grass, { x: STAGE.width / 2, y: 560, r: 860 }, INK.grass, soft(1.25, 6, 7, 0.92), { ink: INK.grassDark, stroke: soft(-0.5, 17, 7, 0.4) }, 0)
  wax.fray(grass, 6)

  // The bare earth: the one plain surface, dark and cool so the parts stand off it. And the strip of soil the heaps lie on.
  const earth = ellipsePath(EARTH.x, EARTH.y, EARTH.rx + 10, EARTH.ry + 8)
  const strip = blobPath([24, HEAP_Y - 74, 300, HEAP_Y - 84, 880, HEAP_Y - 84, 1156, HEAP_Y - 74, 1172, HEAP_Y + 20, 1150, HEAP_Y + 78, 590, HEAP_Y + 86, 30, HEAP_Y + 78, 8, HEAP_Y + 20])
  for (const [shape, box] of [[earth, { x: EARTH.x, y: EARTH.y, r: EARTH.rx + 16 }], [strip, { x: 590, y: HEAP_Y, r: 600 }]] as const) {
    cut(shape)
    wax.fill(shape, box, INK.soil, soft(0.16, 5, 6.6, 0.96), { ink: INK.soilDark, stroke: soft(-0.9, 15, 6, 0.36) }, 8)
  }

  // Leaf litter and tufts on the grass, never on the soil.
  const onSoil = (x: number, y: number): boolean => inEllipse(x, y, EARTH, 34) || (y > HEAP_Y - 100 && y < HEAP_Y + 100)
  const deep = bottom - 300, more = ((right - left) * deep) / (1440 * 580)
  for (let i = 0; i < Math.round(70 * more); i++) {
    const x = left + ((i * 197.3) % (right - left)), y = 290 + ((i * 131.7) % deep)
    if (onSoil(x, y)) continue
    ctx.save(); ctx.translate(x, y); ctx.rotate(i * 2.4); ctx.scale(1.25, 1.25); ctx.globalAlpha = 0.62
    paintAirLeaf(wax, i)
    ctx.restore()
  }
  for (let i = 0; i < Math.round(60 * more); i++) {
    const x = left + ((i * 263.1) % (right - left)), y = 280 + ((i * 97.9) % (deep + 10))
    if (onSoil(x, y)) continue
    for (const lean of [-7, 0, 8]) wax.press([x, y, x + lean * 0.5, y - 9, x + lean, y - 17 - Math.abs(wax.jitter()) * 5], INK.grassDark, 2.4, 0.6)
  }
  for (const [x, y, size] of [[246, 574, 1], [282, 590, 0.7], [1010, 300, 0.8], [914, 590, 0.9], [330, 292, 0.6]] as const) mushroom(wax, x, y, size)
  // Below a tall surface's stage: the wood floor goes on, with big mushrooms and ferns in it.
  for (let y = 900, i = 0; y < bottom - 40; y += 118, i++) {
    mushroom(wax, 150 + ((i * 397) % 880), y + 30, 1.5 + (i % 3) * 0.4)
    mushroom(wax, 210 + ((i * 397) % 880), y + 52, 0.9)
    ctx.save(); ctx.translate(left + 90 + ((i * 611) % (right - left - 180)), y + 110); ctx.rotate(((i % 5) - 2) * 0.3)
    paintFrond(wax, 150 + (i % 3) * 30)
    ctx.restore()
  }

  // The stump the toad sits on.
  const side = blobPath([STUMP.x - 96, 474, STUMP.x + 94, 474, STUMP.x + 100, 560, STUMP.x + 120, 588, STUMP.x, 598, STUMP.x - 124, 586, STUMP.x - 100, 560])
  cut(side)
  wax.fill(side, { x: STUMP.x, y: 534, r: 130 }, INK.bark, soft(1.5, 5, 6, 0.95), { ink: INK.barkDark, stroke: soft(1.42, 13, 4, 0.55) }, 4)
  const face = ellipsePath(STUMP.x, 474, 92, 30)
  cut(face)
  wax.fill(face, { x: STUMP.x, y: 474, r: 94 }, INK.tan, soft(0.1, 4, 5, 0.95), undefined, 3)
  // The grain of the cut wood, in broken arcs: no closed ring anywhere.
  for (const [r, from] of [[0.3, 0.4], [0.55, 2.6], [0.8, 4.4], [0.8, 1.2]] as const) {
    const arc: number[] = []
    for (let i = 0; i <= 7; i++) { const a = from + (i / 7) * 2.2; arc.push(STUMP.x + Math.cos(a) * 92 * r, 474 + Math.sin(a) * 30 * r) }
    wax.press(arc, INK.bark, 2, 0.6)
  }

  // The two near trunks, one at each side, from above the frame down to their roots.
  for (const [x0, x1, lean] of [[left, 54, 14], [1128, right, -14]] as const) {
    const trunk = blobPath([x0, top, x1, top, x1 - lean, 300, x1 + lean * 0.4, 560, x1 + lean * 2.4, 640, (x0 + x1) / 2, 650, x0 - 20, 640, x0, 300])
    cut(trunk)
    wax.fill(trunk, { x: (x0 + x1) / 2, y: 300, r: 380 }, INK.bark, soft(1.53, 6, 7, 0.96), { ink: INK.barkDark, stroke: soft(1.62, 19, 6, 0.5) }, 5)
    for (let y = 40; y < 600; y += 74) wax.press([x0 + 30 + wax.jitter() * 20, y, x0 + 36 + wax.jitter() * 20, y + 40], INK.barkDark, 3.4, 0.6)
  }

  // The fern: its back fronds. The two front ones sway, and the view lays them on.
  for (const [turn, tall] of [[-1.0, 200], [-0.52, 250], [-0.06, 270], [0.4, 244], [0.86, 190]] as const) {
    ctx.save(); ctx.translate(FERN.x, FERN.y + 96); ctx.rotate(turn)
    paintFrond(wax, tall)
    ctx.restore()
  }

  // The tree tops, hanging low at both sides.
  for (const row of [0, 1]) {
    for (let x = left - 20; x <= right + 20; x += 58) {
      const r = 50 + Math.abs(wax.jitter()) * 26, y = canopyBottom(x) - r * (row === 0 ? 1.5 : 0.62) + wax.jitter() * 12
      const ink = CANOPY[Math.floor(Math.abs(wax.jitter()) * CANOPY.length) % CANOPY.length]
      const shape = lump(wax, x, y, r)
      if (row === 1) cut(shape)
      wax.fill(shape, { x, y, r: r + 8 }, ink, soft(wax.jitter() * 1.5, 5.4, 6.6, row === 0 ? 0.8 : 0.95), { ink: row === 0 ? INK.barkDark : INK.red, stroke: soft(wax.jitter() * 1.5, 15, 6, row === 0 ? 0.3 : 0.32) }, 7)
    }
  }
  // Above the tree tops, to the top of the sheet.
  for (let y = -6, row = 0; y > top - 70; y -= 86, row++) {
    for (let x = left - (row % 2) * 45; x <= right + 45; x += 90) {
      const shape = lump(wax, x, y, 74)
      wax.fill(shape, { x, y, r: 80 }, CANOPY[Math.abs(Math.round(x / 45) + row * 3) % CANOPY.length], soft(x + row, 5.4, 6.6, 0.95), row % 2 === 1 ? { ink: INK.red, stroke: soft(x, 15, 6, 0.3) } : undefined, 6)
    }
  }

  // The near edge: blades of grass across the bottom, where wrists rest and nothing is to be touched.
  for (const foot of bottom > STAGE.height + 90 ? [STAGE.height + 44, bottom] : [bottom]) {
    for (let x = left; x <= right; x += 13) {
      const tall = 26 + Math.abs(wax.jitter()) * 34, tip = foot - 24 - tall
      wax.press([x, foot, x + wax.jitter() * 6, tip + tall * 0.6, x + wax.jitter() * 14, tip], Math.round(x / 13) % 3 === 0 ? INK.grass : INK.grassDark, 3.4, 0.8)
    }
  }
}

function mushroom(wax: Wax, x: number, y: number, size: number): void {
  const ctx = wax.ctx
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size)
  const stem = blobPath([-7, -4, 7, -4, 9, 22, -9, 22])
  wax.fill(stem, { x: 0, y: 10, r: 18 }, INK.cream, soft(1.5, 3, 4, 0.95), undefined, 2)
  const cap = blobPath([-27, 0, -20, -20, 0, -27, 20, -20, 27, 0, 0, 5])
  wax.fill(cap, { x: 0, y: -10, r: 30 }, INK.mushroom, soft(0.3, 3.4, 4.4, 0.95), undefined, 3)
  // Spots of bare paper.
  ctx.globalCompositeOperation = 'destination-out'
  for (const [sx, sy, r] of [[-11, -10, 4], [6, -16, 4.6], [13, -4, 3.4]] as const) ctx.fill(ellipsePath(sx, sy, r, r))
  ctx.restore()
}
