import { INK, TAU, bird, border, comma, cut, dab, dots, flower, spray, stroke, tulip, type Make, type Pen, type Sprite } from './folk'
import { makeRng } from './rng'

// The house, cut open and painted on board: a red dining room, a green
// kitchen, a window, and the blue garden. World units; painted once.

export const WALLS = { left: -215, door: 640, window: 1070, floor: 0, ceiling: -600 } as const
const { sin, cos, PI } = Math

function flat(g: Pen, x: number, y: number, w: number, h: number, color: string, seed: number): void {
  g.fillStyle = color
  g.fillRect(x, y, w, h)
  // The boards under the paint, and the brush that laid the ground.
  const rng = makeRng(seed)
  g.save()
  g.beginPath(); g.rect(x, y, w, h); g.clip()
  for (let i = 0; i < w / 9; i++) {
    g.globalAlpha = 0.05
    const px = x + rng.next() * w, py = y + rng.next() * h
    stroke(g, px, py, px + 40, py + 4, px + 90 + rng.next() * 120, py, 10 + rng.next() * 14, 2, rng.next() < 0.5 ? '#ffffff' : '#000000')
  }
  g.globalAlpha = 0.16
  g.fillStyle = '#000000'
  for (let yy = Math.ceil(y / 150) * 150; yy < y + h; yy += 150) g.fillRect(x, yy, w, 2)
  g.restore()
}

function floorBoards(g: Pen, x0: number, x1: number): void {
  g.fillStyle = INK.bark
  g.fillRect(x0, 0, x1 - x0, 110)
  for (let x = x0; x < x1; x += 118) stroke(g, x + 4, 13, x + 60, 11, x + 114, 14, 20, 16, INK.brown, INK.ochre)
  for (let x = x0 - 60; x < x1 - 60; x += 118) stroke(g, Math.max(x0, x + 4), 38, x + 60, 36, x + 114, 39, 20, 16, INK.brown, INK.ochre)
  for (let x = x0 + 40; x < x1; x += 84) flower(g, x, 84, 15, x % 168 < 84 ? INK.scarlet : INK.sky, INK.cream, INK.ochre, 5)
  border(g, x0, 60, x1, 60, 15, INK.cream, INK.ochre, INK.scarlet)
}

function post(g: Pen, x: number, y0: number, y1: number): void {
  for (let y = y0; y < y1; y += 74) stroke(g, x, y + 6, x + 2, y + 34, x, Math.min(y1, y + 78), 26, 22, INK.ochre, INK.gold)
  for (let y = y0 + 40; y < y1 - 10; y += 74) { comma(g, x, y, 20, 8, PI * 0.25, INK.scarlet); comma(g, x, y, 20, 8, PI * 0.75, INK.scarlet) }
}

function dining(g: Pen): void {
  const { left, door } = WALLS
  flat(g, left, -600, door - left, 600, INK.red, 3)
  // The dado: a row of hearts of commas.
  g.fillStyle = INK.deepred
  g.fillRect(left, -150, door - left, 150)
  border(g, left, -148, door, -148, 26, INK.cream, INK.ochre, INK.scarlet)
  for (let x = left + 60; x < door; x += 112) tulip(g, x, -20, 1.15, INK.ochre, INK.gold, INK.leaf)
  border(g, left, -566, door, -566, 34, INK.ochre, INK.cream, INK.sky)
  // Two birds over a vase, and sprays to fill the wall.
  flower(g, 238, -470, 58, INK.cream, INK.sky, INK.ochre, 8)
  bird(g, 148, -408, 0.9, 1, INK.sky, INK.cream, INK.blue)
  bird(g, 330, -408, 0.9, -1, INK.sky, INK.cream, INK.blue)
  spray(g, 238, -400, 0.9, 0.25, INK.leaf, INK.ochre, INK.gold)
  spray(g, 238, -400, 0.9, PI - 0.1, INK.leaf, INK.ochre, INK.gold)
  for (const x of [-150, -60]) { flower(g, x, -430 + (x === -150 ? -50 : 0), 40, INK.ochre, INK.gold, INK.scarlet, 7); spray(g, x, -380 + (x === -150 ? -50 : 0), 0.5, PI * 0.5, INK.leaf, INK.cream, INK.sky) }
  // The cuckoo's house.
  g.save(); g.translate(0, 44)
  stroke(g, 8, -500, 40, -580, 72, -572, 22, 20, INK.brown, INK.ochre)
  stroke(g, 132, -500, 100, -580, 68, -572, 22, 20, INK.brown, INK.ochre)
  for (let i = 0; i < 5; i++) stroke(g, 26 + i * 22, -538 - (i === 2 ? 8 : 0), 26 + i * 22, -500, 27 + i * 22, -462, 24, 20, INK.bark, INK.brown)
  dab(g, 70, -506, 24, 26, INK.night)
  for (const x of [46, 94]) { stroke(g, x, -460, x + 2, -430, x, -400, 3, 3, INK.gold); dab(g, x, -392, 8, 14, INK.ochre, INK.gold) }
  g.restore()
  // The door the next one comes through: dark garden, a lantern, and its frame.
  g.fillStyle = INK.night
  g.beginPath(); g.moveTo(366, 0); g.lineTo(366, -400); g.quadraticCurveTo(366, -540, 482, -540); g.quadraticCurveTo(598, -540, 598, -400); g.lineTo(598, 0); g.fill()
  dab(g, 482, -300, 98, 200, '#3a2a3d')
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) stroke(g, 482 + s * 122, -i * 72 - 4, 482 + s * 124, -i * 72 - 40, 482 + s * 121, -i * 72 - 78, 24, 22, INK.ochre, INK.gold)
  for (let i = 0; i < 7; i++) { const a = PI + (i + 0.5) / 7 * PI; stroke(g, 482 + cos(a - 0.24) * 122, -430 + sin(a - 0.24) * 120, 482 + cos(a) * 126, -430 + sin(a) * 124, 482 + cos(a + 0.24) * 122, -430 + sin(a + 0.24) * 120, 24, 20, INK.ochre, INK.gold) }
  flower(g, 482, -566, 26, INK.scarlet, INK.rose, INK.gold, 6)
}

function kitchen(g: Pen): void {
  const a = WALLS.door, b = WALLS.window
  flat(g, a, -600, b - a, 600, INK.green, 5)
  border(g, a, -566, b, -566, 34, INK.cream, INK.mint, INK.ochre)
  g.fillStyle = '#173a2e'
  g.fillRect(a, -150, b - a, 150)
  for (let x = a + 30; x < b; x += 60) for (let y = -120; y < 0; y += 60) flower(g, x, y, 17, (x + y) % 120 ? INK.mint : INK.sky, INK.cream, INK.ochre, 4, 0.78)
  // A shelf, jugs and the cat's place.
  g.save(); g.translate(-162, 0)
  stroke(g, 826, -400, 900, -404, 1004, -400, 18, 15, INK.ochre, INK.gold)
  for (const [x, c, l] of [[846, INK.sky, INK.cream], [984, INK.scarlet, INK.rose]] as const) { stroke(g, x, -460, x + 3, -438, x, -412, 34, 40, c, l); stroke(g, x + 18, -452, x + 34, -440, x + 18, -426, 7, 5, c); dots(g, x - 10, -430, x + 10, -430, 3, 3, INK.cream) }
  for (let i = 0; i < 4; i++) { const x = 850 + i * 46; stroke(g, x, -330, x, -316, x, -306, 4, 4, INK.ochre); dab(g, x, -286, 15, 19, [INK.ochre, INK.cream, INK.rose, INK.ochre][i], INK.gold) }
  g.restore(); g.save(); g.translate(-190, 0)
  // The stove with its tiles, and the pipe.
  for (let i = 0; i < 5; i++) stroke(g, 1056 + i * 40, -376, 1057 + i * 40, -200, 1056 + i * 40, 0, 46, 46, '#2f5590', INK.sky)
  for (let k = 0; k < 3; k++) for (let i = 0; i < 3; i++) flower(g, 1076 + i * 60, -320 + k * 62, 22, INK.cream, INK.gold, INK.scarlet, 6)
  stroke(g, 1024, -14, 1130, -10, 1250, -14, 30, 28, INK.ochre, INK.gold)
  stroke(g, 1030, -380, 1130, -388, 1244, -380, 26, 24, INK.ochre, INK.gold)
  for (let i = 0; i < 3; i++) stroke(g, 1216, -400 - i * 66, 1218, -430 - i * 66, 1216, -470 - i * 66, 38, 36, INK.bark, INK.brown)
  g.restore()
}

function tree(g: Pen, x: number, y: number, s: number): void {
  g.save(); g.translate(x, y); g.scale(s, s)
  stroke(g, 0, 0, -18, -180, 10, -330, 76, 30, INK.bark, INK.brown)
  stroke(g, 0, -200, 60, -270, 120, -340, 30, 8, INK.bark, INK.brown)
  stroke(g, 0, -240, -60, -300, -110, -360, 28, 8, INK.bark, INK.brown)
  const rng = makeRng(17)
  for (let i = 0; i < 84; i++) {
    const a = rng.next() * TAU, r = Math.sqrt(rng.next()) * 190
    comma(g, cos(a) * r * 1.15, -470 + sin(a) * r * 0.85, 62, 30, a + 0.4, [INK.leaf, '#4f7d46', INK.mint, '#3f6a40'][i % 4], i % 2 ? INK.mint : undefined, 0.3)
  }
  for (let i = 0; i < 11; i++) { const a = i * 2.4, r = 50 + (i % 4) * 38; dab(g, cos(a) * r, -470 + sin(a) * r * 0.8, 19, 18, INK.scarlet, INK.rose) }
  g.restore()
}

function outside(g: Pen): void {
  const { left, window: w } = WALLS
  flat(g, -900, -1700, 4400, 1700, INK.blue, 7)
  // Commas of cloud and scattered stars of four dabs.
  for (const [x, y, s] of [[1750, -1120, 1.3], [1010, -1190, 1.1], [1480, -1230, 1], [-120, -1010, 1], [1520, -700, 0.8], [2240, -960, 1], [2650, -1200, 1.5], [-600, -900, 1], [1240, -1290, 0.9], [2560, -640, 0.8], [-220, -1250, 1.1]] as const) for (let i = 0; i < 5; i++) comma(g, x + i * 34 * s, y - sin(i * 0.8) * 22 * s, 70 * s, 34 * s, 0.15 - i * 0.05, i % 2 ? INK.cream : INK.sky, INK.cream, 0.28)
  const rng = makeRng(9)
  for (let i = 0; i < 60; i++) { const x = -800 + rng.next() * 4200, y = -1650 + rng.next() * 1250; dab(g, x, y, 4 + rng.next() * 3, 4 + rng.next() * 3, i % 3 ? INK.sky : INK.gold) }
  for (const [x, y, w] of [[1130, -1010, 1], [1200, -1060, 1], [120, -1180, -1]] as const) bird(g, x, y, 0.7, w as 1 | -1, INK.cream, INK.sky, INK.scarlet)
  // Hills.
  for (const [x, y, rx, ry, c] of [[1900, 40, 620, 250, '#2d5f63'], [2700, 60, 620, 330, '#28565c'], [-760, 40, 420, 260, '#2d5f63']] as const) { dab(g, x, y, rx, ry, c, '#3c7476'); for (let i = 0; i < 9; i++) comma(g, x - rx * 0.7 + i * rx * 0.17, y - ry * 0.45 + (i % 3) * 26, 44, 14, -0.9, INK.teal, undefined, 0.2) }
  // A fence of strokes, and flowers in front of it.
  for (let x = w + 70; x < 3300; x += 78) stroke(g, x, -150, x + 2, -70, x, 0, 26, 24, INK.cream, INK.sky)
  for (const y of [-112, -48]) for (let x = w + 40; x < 3300; x += 240) stroke(g, x, y, x + 120, y - 3, x + 236, y, 15, 12, INK.cream, INK.sky)
  for (let x = left - 60; x > -900; x -= 78) stroke(g, x, -150, x + 2, -70, x, 0, 26, 24, INK.cream, INK.sky)
  tree(g, 1690, 0, 1.25)
  tree(g, 2400, 0, 1.0)
  tree(g, -640, 0, 0.9)
  for (let x = w + 60; x < 3300; x += 96) { const i = Math.round(x / 96) % 4; if (i === 3) flower(g, x, -46, 24, INK.cream, INK.gold, INK.scarlet, 7); else tulip(g, x, 6, 0.9 + (i % 2) * 0.35, [INK.scarlet, INK.ochre, INK.rose][i], [INK.rose, INK.gold, INK.cream][i], INK.leaf) }
}

function roof(g: Pen): void {
  const { left, window: w } = WALLS
  const l = left - 70, r = w + 110, mid = (l + r) / 2, top = -1080
  // The chimney.
  for (let i = 0; i < 3; i++) stroke(g, 770 + i * 36, -1130, 771 + i * 36, -1000, 770 + i * 36, -860, 40, 40, INK.scarlet, INK.rose)
  stroke(g, 748, -1136, 806, -1142, 868, -1136, 28, 24, INK.cream, INK.gold)
  // Attic board with hearts and birds, then shingles laid in rows.
  g.fillStyle = INK.night
  g.beginPath(); g.moveTo(l, -600); g.lineTo(mid, top); g.lineTo(r, -600); g.fill()
  for (let row = 0; row < 13; row++) {
    const y = -628 - row * 36, t = (y + 600) / (top + 600), x0 = l + (mid - l) * t, x1 = r + (mid - r) * t
    for (let x = x0 + 24 + (row % 2) * 22; x < x1 - 10; x += 46) stroke(g, x, y + 30, x + 1, y + 8, x, y - 16, 44, 26, row % 3 === 0 ? INK.scarlet : row % 3 === 1 ? '#b5402f' : INK.pumpkin, row % 2 ? INK.rose : INK.ochre)
  }
  for (const s of [-1, 1]) { const ex = s < 0 ? l : r; for (let i = 0; i < 9; i++) { const a = i / 9, b = (i + 1.05) / 9; stroke(g, ex + (mid - ex) * a, -604 + (top + 600) * a, ex + (mid - ex) * (a + b) / 2, -608 + (top + 600) * (a + b) / 2, ex + (mid - ex) * b, -604 + (top + 600) * b, 34, 30, INK.cream, INK.gold) } }
  // A round attic window.
  dab(g, mid, -790, 104, 104, INK.ochre, INK.gold)
  dab(g, mid, -790, 84, 84, INK.green)
  flower(g, mid, -790, 58, INK.cream, INK.rose, INK.ochre, 8)
  for (let x = l + 20; x < r; x += 90) stroke(g, x, -598, x + 44, -602, x + 92, -598, 26, 24, INK.ochre, INK.gold)
}

function walls(g: Pen): void {
  const { left, door, window: w } = WALLS
  post(g, left, -590, 0)
  // The way through to the kitchen, open under its beam.
  post(g, door, -590, -488)
  stroke(g, door, -486, door + 2, -478, door, -466, 44, 40, INK.scarlet, INK.rose)
  // The window: sill, open shutters above, and the wall under the sill.
  post(g, w, -590, -500)
  stroke(g, w - 60, -496, w + 6, -502, w + 74, -496, 28, 24, INK.cream, INK.gold)
  stroke(g, w, -62, w + 1, -30, w, 4, 30, 30, INK.ochre, INK.gold)
  stroke(g, w - 46, -64, w + 4, -68, w + 56, -64, 22, 18, INK.cream, INK.gold)
}

function below(g: Pen): void {
  g.fillStyle = INK.leaf
  g.fillRect(-900, 0, 4400, 60)
  for (let x = -900; x < 3400; x += 22) if (x < WALLS.left - 30 || x > WALLS.window + 30) comma(g, x, 20, 30, 12, -PI / 2 + ((x / 22) % 3 - 1) * 0.3, (x / 22) % 2 ? INK.mint : '#4f7d46', undefined, 0.15)
  g.fillStyle = '#4a2a20'
  g.fillRect(-900, 44, 4400, 1400)
  const rng = makeRng(21)
  for (let i = 0; i < 200; i++) { const x = -880 + rng.next() * 4300, y = 70 + rng.next() * 560; if (Math.abs(x - 700) < 130 && y < 270) continue; dab(g, x, y, 5 + rng.next() * 9, 4 + rng.next() * 6, i % 3 ? '#6a4030' : '#8a5a3c') }
  // Bulbs and roots, and the mice's own dining room.
  for (let x = 1180; x < 3300; x += 190) { dab(g, x, 100, 22, 26, INK.cream, INK.rose); for (let k = -1; k < 2; k++) comma(g, x + k * 8, 122, 34, 5, PI / 2 + k * 0.4, INK.mint) }
  dab(g, 700, 180, 118, 64, INK.night)
  dab(g, 700, 184, 104, 52, INK.red, '#b5503f')
  stroke(g, 646, 212, 700, 208, 754, 212, 14, 12, INK.ochre, INK.gold)
  dab(g, 700, 198, 14, 9, INK.cream, INK.gold)
}

export function paintWorld(g: Pen): void {
  outside(g)
  roof(g)
  dining(g)
  kitchen(g)
  walls(g)
  below(g)
  floorBoards(g, WALLS.left - 14, WALLS.window + 14)
}

/** The world in pictures, finer where the camera comes nearer. */
export const TILES = [
  { x: -900, y: -660, w: 620, h: 760, fine: 1.1 },
  { x: -280, y: -660, w: 930, h: 760, fine: 2 },
  { x: 650, y: -660, w: 440, h: 760, fine: 1.7 },
  { x: 1090, y: -660, w: 2210, h: 760, fine: 1.15 },
  { x: -900, y: -1640, w: 4200, h: 980, fine: 0.8 },
  { x: -900, y: 100, w: 4200, h: 340, fine: 1 },
] as const

export function cutTiles(make: Make, share: number): Sprite[] {
  return TILES.map((t) => cut(make, t.x, t.y, t.w, t.h, t.fine * share, paintWorld))
}
