import { HUES } from './figures'
import { BASE, BELL, CELL, COLX, HORIZON, MOLE, MOLE_R, SILL_Y, WALL } from './layout'
import { blob, box, fillOutline, lay, limb, oval, poly, rowsAcross, shade, sprite, stone, type Ctx, type Lay, type Outline, type Sprite } from './mosaic'
import { makeRng, type Rng } from './rng'
import { SNACKS, THINGS, type Snack, type Thing } from './things'

// The square, laid once for a size of the surface, and the things in it that
// move. The wall the graph stands on is the plainest part of the picture.

const pick = (rng: Rng, c: readonly string[]) => c[Math.floor(rng.next() * c.length)]

export function paintSquare(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const rng = makeRng(4711)
  const x1 = x + w, y1 = y + h
  ctx.fillStyle = '#d8cdb5'
  ctx.fillRect(x, y, w, h)
  // Sky, in rows that bend round a low sun at the left.
  const sun = { x: 250, y: 96 }
  rowsAcross(ctx, rng, x, y, x1, HORIZON, 15, (px, row) => Math.sin(px / 170 + row * 0.3) * 9, (px, py, r) => {
    const d = Math.hypot(px - sun.x, py - sun.y)
    if (d < 90 + r.next() * 110) return pick(r, ['#f3dfa4', '#f0e3bd', '#ecd9a0'])
    return py < 170 ? pick(r, ['#a9c6cf', '#b4cdd3', '#9fbfcb']) : py < 330 ? pick(r, ['#bfd4d4', '#c8d9d6', '#b7cfd2']) : pick(r, ['#d8ddcb', '#dfe0cc', '#d2dacb'])
  })
  lay(ctx, rng, oval(sun.x, sun.y, 44, 44), { size: 11, colors: ['#f4cf6b', '#f1c552', '#f7dc8c'], edge: '#dd9f3c', glass: 8 })
  for (const [cx, cy, k] of [[400, 50, 0.8], [1120, 120, 1], [-60, 190, 1]]) lay(ctx, rng, blob(cx - 60 * k, cy + 14, cx - 40 * k, cy - 12, cx - 6, cy - 22 * k, cx + 34 * k, cy - 10, cx + 64 * k, cy + 14), { size: 10, colors: ['#f4efe0', '#eae6da', '#f8f4e8'], vary: 0.02 })
  // Hills and roofs.
  const hill = (pts: number[], c: string[]) => lay(ctx, rng, poly(...pts), { size: 14, colors: c, vary: 0.03 })
  hill([x - 20, 420, 60, 370, 220, 400, 360, 360, 360, 580, x - 20, 580], ['#8fa583', '#9aad8a', '#86997c'])
  hill([820, 400, 1010, 440, 1120, 390, x1 + 20, 360, x1 + 20, 580, 820, 580], ['#8fa583', '#9aad8a', '#86997c'])
  const house = (hx: number, hy: number, hw: number, hh: number, wall: string[], roof: string[]) => {
    lay(ctx, rng, box(hx, hy, hw, hh), { size: 11, colors: wall, edge: shade(wall[0], -0.08) })
    lay(ctx, rng, poly(hx - 10, hy, hx + hw / 2, hy - 40, hx + hw + 10, hy), { size: 9, colors: roof, edge: shade(roof[0], -0.12) })
    for (let i = 0; i < 2; i++) lay(ctx, rng, box(hx + hw * (0.22 + i * 0.38), hy + 22, 18, 26), { size: 6, colors: ['#5e6f7c', '#6b7d88'] })
  }
  house(1010, 386, 92, 190, ['#e4cfa8', '#dcc59a'], ['#b8593c', '#c26746'])
  house(1112, 420, 120, 170, ['#d9b9a0', '#d3ae94'], ['#8f4a45', '#9b5650'])
  for (const [tx, ty] of [[1240, 560], [-40, 540]]) lay(ctx, rng, blob(tx - 26, ty, tx - 30, ty - 110, tx, ty - 230, tx + 30, ty - 110, tx + 26, ty), { size: 9, colors: ['#4c6650', '#577257', '#445c48'], edge: '#30443a' })
  // The floor, in rows that fan out from the wall.
  const fan = (px: number) => ((px - 590) / 590) ** 2 * 26
  rowsAcross(ctx, rng, x, HORIZON, x1, y1, 16, fan, (px, py, r) => {
    const deep = py - fan(px)
    if (deep > 782) return pick(r, ['#b5694a', '#bd7453', '#ab5f42'])
    if (deep > 766) return pick(r, ['#6f828a', '#7a8c93', '#647880'])
    if (deep > 718 && deep < 728) return pick(r, ['#c98f68', '#c28760'])
    return pick(r, ['#dcc8a0', '#d6c095', '#e1cfab', '#d9c49c'])
  })
  // The shop at the left, with the sill for what it sells.
  lay(ctx, rng, box(-60, SILL_Y - 110, 384, 292), { size: 14, colors: ['#e3cfae', '#dcc6a2', '#e8d6b8'], edge: '#a98a63' })
  lay(ctx, rng, box(-30, SILL_Y - 74, 342, 74), { size: 12, colors: ['#5b4a52', '#65535a', '#524249'] })
  for (let i = 0; i < 7; i++) lay(ctx, rng, blob(-62 + i * 56, SILL_Y - 128, -6 + i * 56, SILL_Y - 128, -4 + i * 56, SILL_Y - 84, -34 + i * 56, SILL_Y - 66, -64 + i * 56, SILL_Y - 84), { size: 9, colors: i % 2 ? ['#f1e7d1', '#e9dcc2'] : ['#a9484a', '#b35253', '#9c3f42'], edge: i % 2 ? '#c9b793' : '#7b2f35' })
  lay(ctx, rng, box(-60, SILL_Y, 386, 20), { size: 9, colors: ['#a77c4c', '#9c7143', '#b08757'], edge: '#694723' })
  lay(ctx, rng, limb(9, 6, 306, 548, 296, 480, 310, 400, 292, 330, 304, 292), { size: 5, colors: ['#7d6a45', '#8a764f'] })
  for (const [lx, ly, a] of [[290, 500, 0.6], [314, 462, -0.5], [290, 424, 0.5], [318, 380, -0.6], [280, 346, 0.4], [312, 312, -0.4], [276, 300, 0.9]]) lay(ctx, rng, oval(lx, ly, 16, 9, a), { size: 5, colors: ['#6f8f5b', '#7c9c67', '#648450'], edge: '#47633a' })
  for (const [lx, ly] of [[272, 388], [306, 350], [300, 440]]) lay(ctx, rng, oval(lx, ly, 10, 10), { size: 5, colors: ['#c9696b', '#d57d7a'], edge: '#8d3f45' })
  // The bell tower: an arch for the bell, a round window for the mole.
  lay(ctx, rng, box(854, 62, 160, 520), { size: 14, colors: ['#e9dcc2', '#e2d3b5', '#ede2cb'], edge: '#a08b68' })
  lay(ctx, rng, poly(836, 70, 934, -8, 1032, 70), { size: 11, colors: ['#b8593c', '#c26746', '#ad5136'], edge: '#74331f' })
  lay(ctx, rng, [...oval(BELL.x, BELL.y - 10, 68, 66).filter((p) => p.y < BELL.y), { x: BELL.x - 68, y: BELL.y + 72 }, { x: BELL.x + 68, y: BELL.y + 72 }].sort((a, b) => Math.atan2(a.y - BELL.y, a.x - BELL.x) - Math.atan2(b.y - BELL.y, b.x - BELL.x)), { size: 10, colors: ['#5d7480', '#68808b', '#536a77'], edge: '#34464f' })
  lay(ctx, rng, oval(MOLE.x, MOLE.y, MOLE_R + 6, MOLE_R + 6), { size: 9, colors: ['#4a3b3b', '#54443f', '#413433'], edge: '#a97b48' })
  // The wall of the graph: large pale quiet stones, one thin frame, nothing else.
  ctx.fillStyle = '#cfc2a6'
  ctx.fillRect(WALL.x, WALL.y, WALL.w, WALL.h)
  rowsAcross(ctx, rng, WALL.x + 12, WALL.y + 14, WALL.x + WALL.w - 12, BASE - 4, 26, () => 0, (_x, _y, r) => pick(r, ['#ece4d1', '#eae1cd', '#eee7d6']), 0.008)
  lay(ctx, rng, box(WALL.x - 12, WALL.y - 14, WALL.w + 24, 26), { size: 11, colors: ['#9a7f5e', '#a58a68', '#8f7553'], edge: '#5d4930' })
  for (const px of [WALL.x - 4, WALL.x + WALL.w - 16]) lay(ctx, rng, box(px, WALL.y + 10, 20, BASE - WALL.y), { size: 9, colors: ['#a58a68', '#9a7f5e'], edge: '#6f593b' })
  // One base line for all three.
  lay(ctx, rng, box(WALL.x - 14, BASE, WALL.w + 28, 16), { size: 12, colors: ['#6b5a45', '#75634c'], edge: '#463a2b' })
  for (const cx of COLX) fillOutline(ctx, box(cx - CELL / 2, BASE, CELL, 5), '#d9c38c')
}

// --- the five things --------------------------------------------------------

const tub = (ctx: Ctx, rng: Rng, o: Outline) => lay(ctx, rng, o, { size: 8, colors: ['#c58a52', '#b97d46', '#d09a64'], edge: '#7a4a22', glass: 6 })
const foamy: Lay = { size: 7, colors: ['#f4fbfb', '#e2f2f4', '#d3e9ef'], edge: '#a6ccd8', glass: 8, vary: 0.02 }
const balloon = (ctx: Ctx, rng: Rng, x: number, y: number, r: number, color: string) => lay(ctx, rng, blob(x, y - r, x + r * 0.86, y - r * 0.3, x + r * 0.4, y + r * 0.8, x, y + r, x - r * 0.4, y + r * 0.8, x - r * 0.86, y - r * 0.3), { size: Math.max(4, r * 0.28), colors: [color, shade(color, 0.05), shade(color, -0.04)], edge: shade(color, -0.2), light: shade(color, 0.16), glass: 8 })
const BALLOONS = ['#c8473c', '#3f86b8', '#e2b13c']

const THING_ART: Record<Thing, (ctx: Ctx, rng: Rng) => void> = {
  bath(ctx, rng) {
    tub(ctx, rng, blob(-38, -2, 38, -2, 32, 26, 20, 34, -20, 34, -32, 26))
    for (const [x, y, r] of [[-24, -8, 12], [0, -13, 15], [24, -8, 12]]) lay(ctx, rng, oval(x, y, r, r), { ...foamy, size: 5 })
    for (const x of [-18, 18]) lay(ctx, rng, box(x - 5, 32, 10, 9), { size: 4, colors: ['#7a4a22'] })
    lay(ctx, rng, oval(16, -34, 7, 7), { ...foamy, size: 4 })
    lay(ctx, rng, oval(-6, -36, 5, 5), { ...foamy, size: 3 })
  },
  mud(ctx, rng) {
    const mud: Lay = { size: 6, colors: ['#6b4426', '#7a4f2c', '#5f3b20'], edge: '#45290f', glass: 4 }
    lay(ctx, rng, blob(-42, 18, -30, 4, -4, 8, 18, 0, 42, 14, 36, 32, 6, 30, -20, 36), mud)
    lay(ctx, rng, blob(-14, 8, -22, -24, -6, -10, 2, -38, 8, -10, 22, -20, 16, 8), mud)
    for (const [x, y, r] of [[-30, -20, 6], [30, -24, 7], [16, -38, 4.5], [-12, -38, 4]]) lay(ctx, rng, oval(x, y, r, r), { ...mud, size: 4 })
  },
  dance(ctx, rng) {
    lay(ctx, rng, blob(-34, -8, 34, -8, 30, 32, 0, 38, -30, 32), { size: 7, colors: ['#c8473c', '#d15448', '#bd3f35'], edge: '#7f2620' })
    for (let i = -2; i < 3; i++) lay(ctx, rng, limb(6, 6, i * 14 - 6, 0, i * 14 + 6, 30), { size: 4, colors: ['#f1d27a'] })
    lay(ctx, rng, oval(0, -8, 35, 12), { size: 6, colors: ['#f4ead4', '#ecdfc2'], edge: '#a98a63' })
    for (const k of [-1, 1]) { lay(ctx, rng, limb(6, 6, k * 10, -14, k * 34, -40), { size: 4.5, colors: ['#a77c4c', '#9c7143'] }); lay(ctx, rng, oval(k * 9, -14, 6, 6), { size: 4, colors: ['#f1e7d1'], edge: '#694723' }) }
  },
  fly(ctx, rng) {
    ctx.strokeStyle = '#5b4a3a'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (const x of [-22, 22, 0]) { ctx.moveTo(x, -2); ctx.quadraticCurveTo(x * 0.6, 24, 0, 42) }
    ctx.stroke()
    balloon(ctx, rng, -23, -10, 20, BALLOONS[0])
    balloon(ctx, rng, 23, -10, 20, BALLOONS[1])
    balloon(ctx, rng, 0, -20, 22, BALLOONS[2])
  },
  sleep(ctx, rng) {
    lay(ctx, rng, blob(-40, 8, -34, 0, 0, 4, 34, 0, 40, 8, 38, 26, 40, 36, 0, 32, -40, 36, -38, 26), { size: 7, colors: ['#f2ecdf', '#e9e1d0', '#f7f2e8'], edge: '#a89bb8' })
    lay(ctx, rng, blob(4, -42, -18, -30, -22, -8, -4, 6, 16, 2, 22, -6, 2, -8, -8, -22), { size: 6, colors: ['#f4d67c', '#efcb62'], edge: '#b98c2c', glass: 8 })
    for (const [x, y] of [[26, -30], [34, -12], [-32, -32]]) lay(ctx, rng, poly(x, y - 7, x + 5, y, x, y + 7, x - 5, y), { size: 3.4, colors: ['#f7ecc0'] })
  },
}
const each = <T>(make: (t: Thing) => T): Record<Thing, T> => Object.fromEntries(THINGS.map((t) => [t, make(t)])) as Record<Thing, T>
const GROUNDS: Record<Thing, string[]> = { bath: ['#cfe3ea', '#c3dbe4'], mud: ['#ead9b4', '#e4d1a8'], dance: ['#f0dccb', '#ead2be'], fly: ['#cfe0e2', '#dbe7e4'], sleep: ['#574a86', '#60528f', '#4d417a'] }
const frame = (ctx: Ctx, rng: Rng, color: string, ground: string[]) => {
  lay(ctx, rng, box(-54, -54, 108, 108), { size: 9, colors: [color, shade(color, 0.04), shade(color, -0.04)], edge: shade(color, -0.1) })
  lay(ctx, rng, box(-44, -44, 88, 88), { size: 8, colors: ground, vary: 0.02 })
}
/** A picture of a thing, 108 square, framed in its column's colour. */
export const PLAQUES = each((t) => sprite(`plaque-${t}`, -56, -56, 112, 112, (ctx, rng) => { frame(ctx, rng, HUES[t], GROUNDS[t]); THING_ART[t](ctx, rng) }))
/** The third picture with its back turned. */
export const SHUT = sprite('plaque-shut', -56, -56, 112, 112, (ctx, rng) => {
  lay(ctx, rng, box(-54, -54, 108, 108), { size: 9, colors: ['#b7a888', '#ae9f7e', '#c0b293'], edge: '#7d6f52' })
  lay(ctx, rng, box(-34, -34, 68, 68), { size: 9, colors: ['#c9bb9c', '#c2b392'], edge: '#988a6b' })
})

// --- things that move -------------------------------------------------------

export const BELL_SPRITE = sprite('bell', -62, -66, 124, 136, (ctx, rng) => {
  lay(ctx, rng, box(-7, -64, 14, 14), { size: 6, colors: ['#6f5a36'] })
  lay(ctx, rng, oval(0, 54, 13, 13), { size: 6, colors: ['#7a5a2a', '#6d4f22'], edge: '#4a3412' })
  lay(ctx, rng, blob(-14, -54, 14, -54, 34, -26, 40, 18, 56, 44, 54, 52, -54, 52, -56, 44, -40, 18, -34, -26), { size: 9, colors: ['#d8a63c', '#cf9a30', '#e2b650'], edge: '#7e5512', light: '#f2d488', glass: 9 })
  lay(ctx, rng, box(-46, 22, 92, 9), { size: 7, colors: ['#8d6318', '#9b7022'] })
})
export const BELL_BEAM = { x: BELL.x, y: BELL.y - 60 }
const THOUGHT: Lay = { size: 8, colors: ['#fdfaf1', '#f8f3e6', '#fffdf6'], edge: '#8fa9b5', grout: '#e6e2d6', vary: 0.012 }
/** What the mole is thinking of: the same shape of thought as everybody's, only larger. */
export const BOARD_SPRITE = sprite('board', -72, -82, 144, 146, (ctx, rng) => {
  lay(ctx, rng, oval(0, -67, 6, 5), { ...THOUGHT, size: 4 })
  lay(ctx, rng, blob(-62, 0, -56, -44, -20, -58, 20, -58, 56, -44, 62, 0, 56, 44, 20, 58, -20, 58, -56, 44), THOUGHT)
})
/** The picture of the thing alone, for the mole's board. */
export const WISH_ART = each((t) => sprite(`wish-${t}`, -46, -46, 92, 92, (ctx, rng) => {
  lay(ctx, rng, box(-44, -44, 88, 88), { size: 8, colors: [HUES[t], shade(HUES[t], 0.04)], edge: shade(HUES[t], -0.1) })
  lay(ctx, rng, box(-36, -36, 72, 72), { size: 8, colors: GROUNDS[t], vary: 0.02 })
  ctx.scale(0.8, 0.8)
  THING_ART[t](ctx, rng)
}))
/** What somebody would like, in a thought. */
export const WANT = each((t) => sprite(`want-${t}`, -36, -36, 72, 84, (ctx, rng) => {
  lay(ctx, rng, oval(0, 40, 5, 4.5), { ...THOUGHT, size: 3 })
  lay(ctx, rng, blob(-32, 0, -28, -24, 0, -32, 28, -24, 32, 0, 28, 24, 0, 32, -28, 24), { ...THOUGHT, size: 6 })
  ctx.save()
  ctx.scale(0.54, 0.54)
  lay(ctx, rng, oval(0, 0, 46, 44), { size: 10, colors: GROUNDS[t], vary: 0.02 })
  THING_ART[t](ctx, rng)
  ctx.restore()
}))
export const BASKET_BACK = sprite('basket-back', -66, -84, 132, 44, (ctx, rng) => { lay(ctx, rng, oval(0, -66, 60, 15), { size: 7, colors: ['#6b4c26', '#5e421f'], edge: '#8d6634' }) })
export const BASKET_FRONT = sprite('basket-front', -66, -78, 132, 84, (ctx, rng) => {
  lay(ctx, rng, blob(-60, -66, -30, -56, 0, -53, 30, -56, 60, -66, 50, -16, 40, 0, -40, 0, -50, -16), { size: 10, colors: ['#c2924e', '#b68440', '#cc9f5e'], edge: '#7c5523' })
  for (let i = 0; i < 4; i++) for (let k = -4 + (i % 2) * 0.5; k < 4.5; k++) stone(ctx, rng, k * 12, -46 + i * 12, (i % 2 ? 1 : -1) * 0.5, 11, 5, '#96692d')
})
export const BASKET_LID = sprite('basket-lid', -66, -26, 132, 30, (ctx, rng) => {
  lay(ctx, rng, blob(-60, 0, -40, -12, 0, -18, 40, -12, 60, 0, 0, 6), { size: 8, colors: ['#c2924e', '#b68440', '#cc9f5e'], edge: '#7c5523' })
  lay(ctx, rng, oval(0, -18, 8, 6), { size: 5, colors: ['#7c5523'] })
})
export const SNACK_ART: Record<Snack, Sprite> = {
  carrot: sprite('carrot', -42, -42, 84, 84, (ctx, rng) => {
    for (const a of [-0.5, 0, 0.5]) lay(ctx, rng, limb(10, 8, 12, -16, 22 + a * 20, -36 + Math.abs(a) * 8), { size: 5, colors: ['#5f8a45', '#6d9850'], edge: '#3c5f2a' })
    lay(ctx, rng, blob(22, -20, 24, -8, -10, 26, -32, 34, -26, 12, 6, -22), { size: 7, colors: ['#e08436', '#d9782a', '#e89448'], edge: '#95470f', light: '#f2b277' })
  }),
  cheese: sprite('cheese', -44, -36, 88, 72, (ctx, rng) => {
    lay(ctx, rng, poly(-38, 14, 36, -22, 38, 26, -38, 28), { size: 8, colors: ['#eec34c', '#e8b93c', '#f2cd66'], edge: '#a97a12' })
    lay(ctx, rng, poly(-38, 13, 6, -28, 36, -22), { size: 6, colors: ['#f5d980', '#f1d06c'], edge: '#b88a22' })
    for (const [x, y, r] of [[-12, 18, 6], [14, 6, 8], [26, 18, 5]]) lay(ctx, rng, oval(x, y, r, r), { size: 4, colors: ['#b98d24'] })
  }),
  bun: sprite('bun', -44, -36, 88, 72, (ctx, rng) => {
    lay(ctx, rng, blob(-38, 18, -34, -8, -14, -26, 14, -26, 34, -8, 38, 18, 24, 28, -24, 28), { size: 8, colors: ['#c8864a', '#bd7a3d', '#d2955c'], edge: '#74431a', light: '#e4b481' })
    for (const x of [-14, 0, 14]) lay(ctx, rng, limb(6, 4, x - 4, -20, x + 4, -2), { size: 4, colors: ['#f2dfb8'] })
  }),
}
/** One small tub for everybody, whatever they are. */
export const TUB = sprite('tub', -84, -78, 168, 96, (ctx, rng) => {
  tub(ctx, rng, blob(-74, -54, 74, -54, 64, -8, 46, 6, -46, 6, -64, -8))
  for (const k of [-1, 1]) lay(ctx, rng, oval(k * 44, 8, 11, 8), { size: 5, colors: ['#7a4a22'] })
  for (let i = -3; i <= 3; i++) lay(ctx, rng, oval(i * 23, -54 - (i % 2 ? 0 : 6), 17, 16), foamy)
})
export const BIG_BUBBLE = sprite('big-bubble', -160, -160, 320, 320, (ctx, rng) => {
  for (let i = 0; i < 90; i++) { const a = (i / 90) * Math.PI * 2; stone(ctx, rng, Math.cos(a) * 152, Math.sin(a) * 152, a + Math.PI / 2, 10, 8, pick(rng, ['#dff0f4', '#bfe0ea', '#f4fbfb'])) }
  for (let i = 0; i < 9; i++) { const a = 3.6 + i * 0.08; stone(ctx, rng, Math.cos(a) * 132, Math.sin(a) * 132, a + Math.PI / 2, 10, 7, '#ffffff') }
})
export const PUDDLE = sprite('puddle', -130, -24, 260, 60, (ctx, rng) => lay(ctx, rng, blob(-120, 4, -80, -14, -20, -8, 40, -18, 110, -6, 122, 12, 70, 24, 0, 20, -70, 28), { size: 9, colors: ['#6b4426', '#7a4f2c', '#5f3b20'], edge: '#45290f', glass: 4 }))
export const DRUM = sprite('drum', -70, -90, 140, 100, (ctx, rng) => { ctx.translate(0, -36); ctx.scale(1.7, 1.2); lay(ctx, rng, blob(-34, -8, 34, -8, 30, 32, 0, 38, -30, 32), { size: 6, colors: ['#c8473c', '#d15448', '#bd3f35'], edge: '#7f2620' }); for (let i = -2; i < 3; i++) lay(ctx, rng, limb(5, 5, i * 14 - 6, 2, i * 14 + 6, 30), { size: 3.4, colors: ['#f1d27a'] }); lay(ctx, rng, oval(0, -8, 35, 14), { size: 6, colors: ['#f4ead4', '#ecdfc2'], edge: '#a98a63' }) })
const string = (ctx: Ctx, x: number, y: number) => {
  ctx.strokeStyle = '#5b4a3a'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x * 0.4 + 6, y + 50, 0, 140)
  ctx.stroke()
}
/** A balloon on its string, and the three that the elephant needs. */
export const BALLOON = BALLOONS.map((color, i) => sprite(`balloon-${i}`, -44, -50, 88, 192, (ctx, rng) => { string(ctx, 0, 42); balloon(ctx, rng, 0, 0, 46, color) }))
export const TRIO = sprite('balloon-trio', -124, -60, 248, 204, (ctx, rng) => {
  for (const x of [-76, 0, 76]) string(ctx, x, 30)
  balloon(ctx, rng, -76, 8, 46, BALLOONS[0])
  balloon(ctx, rng, 76, 8, 46, BALLOONS[1])
  balloon(ctx, rng, 0, -8, 46, BALLOONS[2])
})
export const PILLOW = sprite('pillow', -60, -34, 120, 52, (ctx, rng) => lay(ctx, rng, blob(-54, -16, -44, -26, 0, -20, 44, -26, 54, -16, 50, 0, 54, 12, 0, 8, -54, 12, -50, 0), { size: 8, colors: ['#e7e0f0', '#ddd4ea', '#f0ebf6'], edge: '#8d7cae' }))
export const MOON = sprite('moon', -60, -60, 120, 120, (ctx, rng) => lay(ctx, rng, blob(10, -50, -28, -38, -46, 0, -28, 38, 14, 50, 40, 30, 4, 22, -12, 0, 2, -24), { size: 9, colors: ['#f4e3a6', '#efd98c', '#f8ecc0'], edge: '#b99a44', glass: 9 }))
export const DOT: Record<'mud' | 'foam' | 'fizz' | 'drip' | 'leaf' | 'bubble', Sprite> = {
  mud: sprite('dot-mud', -20, -20, 40, 40, (ctx, rng) => lay(ctx, rng, blob(-15, 2, -6, -14, 8, -12, 16, 4, 4, 15, -8, 13), { size: 6, colors: ['#6b4426', '#7a4f2c'], edge: '#45290f' })),
  foam: sprite('dot-foam', -20, -20, 40, 40, (ctx, rng) => lay(ctx, rng, oval(0, 0, 16, 16), foamy)),
  fizz: sprite('dot-fizz', -20, -20, 40, 40, (ctx, rng) => lay(ctx, rng, oval(0, 0, 15, 15), { size: 5, colors: ['#b08a5e', '#c19c70'], edge: '#7d5c38', glass: 14 })),
  drip: sprite('dot-drip', -14, -20, 28, 40, (ctx, rng) => lay(ctx, rng, blob(0, -17, 9, 4, 0, 14, -9, 4), { size: 5, colors: ['#6b4426', '#7a4f2c'], edge: '#45290f' })),
  leaf: sprite('dot-leaf', -14, -14, 28, 28, (ctx, rng) => { stone(ctx, rng, -4, 0, 0.4, 11, 11, '#d15448'); stone(ctx, rng, 7, 2, -0.3, 9, 9, '#f1d27a') }),
  bubble: sprite('dot-bubble', -46, -46, 92, 92, (ctx, rng) => {
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; stone(ctx, rng, Math.cos(a) * 40, Math.sin(a) * 40, a + Math.PI / 2, 10, 7, pick(rng, ['#dff0f4', '#bfe0ea', '#f4fbfb'])) }
    stone(ctx, rng, -16, -18, -0.8, 16, 7, '#ffffff')
  }),
}

export const FIRST_PROPS: Sprite[] = [...Object.values(PLAQUES), SHUT, BELL_SPRITE, BOARD_SPRITE, ...Object.values(WISH_ART), BASKET_BACK, BASKET_FRONT, BASKET_LID, ...SNACKS.map((s) => SNACK_ART[s])]
export const LATER_PROPS: Sprite[] = [BIG_BUBBLE, TUB, PUDDLE, DRUM, ...BALLOON, TRIO, PILLOW, MOON, ...Object.values(DOT)]
export const GHOST = sprite('ghost', -30, -8, 78, 96, (ctx, rng) => {
  lay(ctx, rng, blob(-6, 0, 8, -2, 14, 26, 34, 28, 44, 42, 40, 70, 24, 84, 2, 80, -14, 58, -26, 46, -20, 38, -2, 48), { size: 7, colors: ['#fbf4e4', '#f5ebd6', '#fffaf0'], edge: '#7a6a5a', vary: 0.02 })
})
FIRST_PROPS.push(GHOST)
export const GLOW = sprite('glow', -84, -84, 168, 168, (ctx, rng) => {
  for (const [n, r] of [[26, 66], [30, 77]]) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; stone(ctx, rng, Math.cos(a) * r, Math.sin(a) * r, a, 9, 6, pick(rng, ['#fff1b8', '#ffe08a', '#fff8dc'])) }
})
FIRST_PROPS.push(GLOW, ...Object.values(WANT))
