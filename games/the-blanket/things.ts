import { BASKET, BELL, FISH, HOOK, SEATS, SPOTS, type PlaceId, type Who } from './layout'
import { AQUA, CORAL, CREAM, DEEP, INK, OCHRE, blob, boxOf, dabs, ellipse, poly, rounded, shape, sprite, type Ctx, type Sprite, type Stamps } from './paint'
import { makeRng } from './rng'

// What is handled: the sausage, the blankets, the hiding places, the bell, the
// bowl and the basket. A hiding place has a back and a front, so a sausage or a
// head goes in between.

const BROWN = '#b8622c'

export const T = {
  sausage: sprite('sausage', -62, -30, 124, 60, (c, r) => {
    const path = blob(-50, 4, -46, -16, -20, -20, 0, -14, 22, -20, 48, -16, 52, 4, 40, 20, 0, 22, -38, 20)
    shape(c, r, poly(-48, 0, -62, -8, -60, 8), boxOf(-56, 0, 8, 8), BROWN)
    shape(c, r, poly(48, 0, 62, -8, 60, 8), boxOf(56, 0, 8, 8), BROWN)
    shape(c, r, path, boxOf(0, 2, 52, 22), CORAL, { color: '#9c2f24', side: 'bottom', reach: 0.5 })
    c.save(); c.beginPath(); path(c); c.clip(); dabs(c, r, { x: -40, y: -18, w: 80, h: 14 }, '#ffb08a', 'top', 0.7, 2.4); c.restore()
  }),
  ghostHand: sprite('ghostHand', -30, -12, 66, 92, (c, r) => {
    shape(c, r, blob(-12, 0, -8, -10, 4, -10, 8, 0, 10, 26, 30, 30, 32, 60, 20, 78, -12, 78, -26, 50, -26, 36, -12, 40), boxOf(2, 34, 32, 46), CREAM, { color: OCHRE, side: 'bottom', reach: 0.5 })
  }),
  blanketFolded: sprite('blanketFolded', -58, -16, 116, 32, (c, r) => { shape(c, r, rounded(-54, -14, 108, 28, 13), boxOf(0, 0, 54, 14), AQUA, { color: '#4d8f96', side: 'bottom', reach: 0.6 }); shape(c, r, rounded(-54, -4, 108, 5, 2), boxOf(0, 0, 1, 1), DEEP) }),
  basketFront: sprite('basketFront', -78, -30, 156, 84, (c, r) => {
    shape(c, r, blob(-70, -22, 70, -22, 60, 44, -60, 44), boxOf(0, 12, 72, 36), OCHRE, { color: BROWN, side: 'bottom', reach: 0.7 })
    for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) shape(c, r, rounded(-58 + j * 17 + (i % 2) * 8, -12 + i * 18, 12, 9, 4), boxOf(0, 0, 1, 1), BROWN)
  }),
  basketBack: sprite('basketBack', -74, -34, 148, 40, (c, r) => shape(c, r, ellipse(0, -16, 64, 14), boxOf(0, -16, 64, 14), BROWN)),

  dishBack: sprite('dishBack', -84, -30, 168, 110, (c, r) => {
    // A low stool with a plate.
    shape(c, r, poly(-58, 10, -40, 10, -46, 70, -60, 70), boxOf(-50, 40, 12, 30), BROWN)
    shape(c, r, poly(58, 10, 40, 10, 46, 70, 60, 70), boxOf(50, 40, 12, 30), BROWN)
    shape(c, r, rounded(-76, 6, 152, 22, 11), boxOf(0, 17, 76, 11), OCHRE, { color: BROWN, side: 'bottom', reach: 0.8 })
    shape(c, r, ellipse(0, 0, 70, 20), boxOf(0, 0, 70, 20), CREAM, { color: '#4d8f96', side: 'bottom', reach: 0.4 })
    shape(c, r, ellipse(0, -3, 48, 12), boxOf(0, -3, 48, 12), '#fffaf0', { color: OCHRE, side: 'top', reach: 0.4, thick: 0.6 })
  }),
  dishFront: sprite('dishFront', -2, -2, 4, 4, () => {}),
  potBack: sprite('teaBack', -90, -70, 180, 130, (c, r) => {
    shape(c, r, (x) => { x.moveTo(-40, -22); x.bezierCurveTo(-96, -40, -98, 44, -44, 30); x.lineTo(-46, 16); x.bezierCurveTo(-78, 26, -76, -22, -42, -8); x.closePath() }, boxOf(-70, 0, 26, 40), CREAM)
    shape(c, r, ellipse(0, -30, 46, 14), boxOf(0, -30, 46, 14), INK)
  }),
  potFront: sprite('teaFront', -72, -66, 184, 138, (c, r) => {
    shape(c, r, poly(40, 34, 70, 10, 104, -36, 66, -62, 44, -14), { x: 40, y: -62, w: 64, h: 96 }, CREAM, { color: '#4d8f96', side: 'bottom', reach: 0.6 })
    shape(c, r, blob(-50, -30, 0, -20, 50, -30, 68, 14, 46, 58, -46, 58, -68, 14), boxOf(0, 16, 68, 46), CREAM, { color: '#4d8f96', side: 'left', reach: 0.45 })
    for (const [x, y] of [[-22, 16], [16, 4], [26, 34], [-8, 42]]) { shape(c, r, ellipse(x, y, 9, 8), boxOf(x, y, 9, 8), OCHRE); shape(c, r, ellipse(x, y, 3.4, 3.2), boxOf(x, y, 3, 3), INK) }
  }),
  potLid: sprite('teaLid', -52, -30, 104, 42, (c, r) => { shape(c, r, blob(-46, 8, -38, -8, 0, -14, 38, -8, 46, 8), boxOf(0, 0, 46, 12), CREAM, { color: '#4d8f96', side: 'bottom', reach: 0.6 }); shape(c, r, ellipse(0, -19, 11, 9), boxOf(0, -19, 11, 9), OCHRE) }),
  bootBack: sprite('bootBack', -60, -80, 120, 40, (c, r) => shape(c, r, ellipse(-14, -56, 34, 10), boxOf(-14, -56, 34, 10), INK)),
  bootFront: sprite('bootFront', -60, -66, 140, 130, (c, r) => {
    shape(c, r, blob(-50, -60, -14, -48, 22, -60, 24, -6, 66, 14, 72, 48, 20, 54, -48, 52, -50, 0), { x: -54, y: -64, w: 130, h: 120 }, BROWN, { color: INK, side: 'left', reach: 0.5 })
    shape(c, r, rounded(-54, 44, 130, 14, 6), boxOf(10, 51, 65, 7), INK)
    for (let i = 0; i < 3; i++) shape(c, r, rounded(2 + i * 8, -34 + i * 20, 22, 6, 3), boxOf(0, 0, 1, 1), CREAM)
  }),
  bootWorn: sprite('bootWorn', -44, -50, 100, 96, (c, r) => {
    shape(c, r, blob(-34, -44, 0, -36, 22, -44, 24, -4, 50, 8, 52, 32, -32, 34), boxOf(8, -4, 46, 42), BROWN, { color: INK, side: 'left', reach: 0.5 })
    shape(c, r, rounded(-36, 28, 92, 11, 5), boxOf(10, 33, 46, 6), INK)
  }),
  flowerBack: sprite('flowerBack', -60, -100, 120, 130, (c, r) => shape(c, r, ellipse(0, 6, 48, 13), boxOf(0, 6, 48, 13), '#5b3a24', { color: INK, side: 'top', reach: 0.6 })),
  flower: sprite('flower', -60, -118, 120, 130, (c, r) => {
    shape(c, r, poly(-4, 6, 4, 6, 6, -60, -1, -60), boxOf(0, -30, 6, 34), '#3f8f5b')
    shape(c, r, blob(2, -10, 34, -42, 48, -26, 26, -6), boxOf(26, -24, 24, 20), '#3f8f5b', { color: DEEP, side: 'bottom' })
    for (let i = 0; i < 6; i++) { const a = i * 1.047; shape(c, r, ellipse(2 + Math.cos(a) * 24, -76 + Math.sin(a) * 24, 18, 15, a), boxOf(2 + Math.cos(a) * 24, -76 + Math.sin(a) * 24, 18, 15), CREAM, { color: OCHRE, side: 'bottom', reach: 0.5 }) }
    shape(c, r, ellipse(2, -76, 16, 15), boxOf(2, -76, 16, 15), OCHRE, { color: BROWN, side: 'bottom' })
  }),
  flowerWorn: sprite('flowerWorn', -70, -118, 140, 170, (c, r) => {
    T.flower.paint(c, r)
    shape(c, r, ellipse(0, 20, 44, 14), boxOf(0, 20, 44, 14), '#5b3a24', { color: INK, side: 'bottom', reach: 0.6 })
    for (const [x, y] of [[-30, 44], [26, 48], [2, 40], [-12, 34]]) shape(c, r, ellipse(x, y, 9, 8), boxOf(0, 0, 1, 1), '#5b3a24')
  }),
  flowerFront: sprite('flowerFront', -62, -6, 124, 84, (c, r) => {
    shape(c, r, poly(-50, 10, 50, 10, 36, 68, -36, 68), boxOf(0, 40, 50, 30), OCHRE, { color: BROWN, side: 'left', reach: 0.5 })
    shape(c, r, rounded(-56, 2, 112, 18, 7), boxOf(0, 11, 56, 9), OCHRE, { color: BROWN, side: 'bottom', reach: 0.6 })
  }),
  hornBack: sprite('hornBack', -80, -64, 170, 160, (c, r) => {
    shape(c, r, rounded(-62, 34, 124, 46, 8), boxOf(0, 56, 62, 24), BROWN, { color: INK, side: 'bottom', reach: 0.6 })
    shape(c, r, ellipse(0, 33, 52, 10), boxOf(0, 33, 52, 10), INK)
    shape(c, r, poly(-34, 34, -20, 34, 6, 4, -14, -6), boxOf(-14, 14, 22, 22), OCHRE)
    shape(c, r, ellipse(10, -14, 66, 46, -0.35), boxOf(10, -14, 66, 50), OCHRE, { color: BROWN, side: 'left', reach: 0.5 })
    shape(c, r, ellipse(16, -18, 48, 32, -0.35), boxOf(16, -18, 48, 34), INK, { color: DEEP, side: 'left', reach: 0.5 })
  }),
  hornFront: sprite('hornFront', -70, -20, 160, 70, (c, r) => {
    // The near lip of the horn.
    shape(c, r, (x) => { x.ellipse(10, -14, 66, 46, -0.35, 0.15, Math.PI - 0.1); x.ellipse(16, -18, 48, 32, -0.35, Math.PI - 0.1, 0.15, true); x.closePath() }, boxOf(10, 10, 66, 30), OCHRE, { color: BROWN, side: 'bottom', reach: 0.5 })
  }),

  bellFrame: sprite('bellFrame', -70, -84, 140, 150, (c, r) => {
    shape(c, r, rounded(-58, -76, 116, 12, 6), boxOf(0, -70, 58, 6), BROWN, { color: INK, side: 'bottom' })
    shape(c, r, rounded(-5, -70, 10, 24, 4), boxOf(0, -58, 5, 12), INK)
  }),
  bell: sprite('bell', -54, -10, 108, 100, (c, r) => {
    shape(c, r, ellipse(0, 74, 13, 12), boxOf(0, 74, 13, 12), INK)
    shape(c, r, blob(-14, -6, 14, -6, 32, 30, 50, 70, -50, 70, -32, 30), boxOf(0, 32, 48, 40), OCHRE, { color: BROWN, side: 'left', reach: 0.5 })
    shape(c, r, rounded(-48, 60, 96, 13, 6), boxOf(0, 66, 48, 7), OCHRE, { color: BROWN, side: 'bottom' })
  }),
  bowlBack: sprite('bowlBack', -80, -76, 160, 160, (c, r) => {
    shape(c, r, poly(-30, 66, 30, 66, 46, 84, -46, 84), boxOf(0, 76, 46, 10), BROWN)
    shape(c, r, ellipse(0, 4, 66, 64), boxOf(0, 4, 66, 64), '#a8d6cf', { color: '#4d8f96', side: 'bottom', reach: 0.5 })
    shape(c, r, ellipse(0, -44, 40, 10), boxOf(0, -44, 40, 10), '#d8efe6')
  }),
  bowlFront: sprite('bowlFront', -80, -76, 160, 160, (c, r) => {
    c.globalAlpha = 0.8
    shape(c, r, blob(-50, -20, -42, -34, -36, -10, -44, 20), boxOf(-44, -6, 8, 24), '#ffffff')
    c.globalAlpha = 1
    shape(c, r, (x) => { x.ellipse(0, -54, 44, 10, 0, 0, 7); x.ellipse(0, -54, 37, 6, 0, 7, 0, true) }, boxOf(0, -54, 44, 10), CREAM)
  }),
  fish: sprite('fish', -40, -26, 76, 52, (c, r) => {
    shape(c, r, poly(-16, 0, -38, -20, -32, 0, -38, 20), boxOf(-28, 0, 12, 20), OCHRE, { color: BROWN, side: 'left' })
    shape(c, r, ellipse(4, 0, 26, 20), boxOf(4, 0, 26, 20), OCHRE, { color: BROWN, side: 'bottom' })
    shape(c, r, ellipse(14, -5, 9, 9), boxOf(14, -5, 9, 9), '#fffaf0')
    shape(c, r, ellipse(18, -5, 5, 5.4), boxOf(18, -5, 5, 5), INK)
  }),
  drop: sprite('drop', -14, -16, 28, 32, (c, r) => shape(c, r, blob(0, -14, 10, 4, 0, 14, -10, 4), boxOf(0, 0, 10, 14), '#d8efe6', { color: '#4d8f96', side: 'bottom' })),
  halo: sprite('halo', -92, -92, 184, 184, (c, r) => {
    c.fillStyle = '#fff3c4'
    c.beginPath()
    for (let i = 0; i < 340; i++) { const a = r.next() * Math.PI * 2, d = 62 + (r.next() + r.next() - 1) * 20, k = 1.2 + r.next() * 2.6; const x = Math.cos(a) * d, y = Math.sin(a) * d; c.moveTo(x + k, y); c.arc(x, y, k, 0, 7) }
    c.fill()
  }),
  // Furniture, which stays when its sitter runs.
  cushion: sprite('cushion', -150, -20, 300, 60, (c, r) => shape(c, r, ellipse(0, 8, 142, 24), boxOf(0, 8, 142, 24), OCHRE, { color: BROWN, side: 'bottom', reach: 0.6 })),
  stool: sprite('stool', -90, -16, 180, 130, (c, r) => {
    for (const x of [-58, 0, 58]) shape(c, r, poly(x - 8, 0, x + 8, 0, x * 1.25 + 6, 106, x * 1.25 - 6, 106), boxOf(x, 50, 12, 56), BROWN)
    shape(c, r, rounded(-80, -6, 160, 30, 14), boxOf(0, 9, 80, 15), OCHRE, { color: BROWN, side: 'bottom', reach: 0.7 })
  }),
  armchair: sprite('armchair', -190, -360, 380, 380, (c, r) => {
    const green = '#2c7c78'
    shape(c, r, blob(-150, 0, -176, -210, -120, -350, 120, -350, 176, -210, 150, 0), boxOf(0, -176, 170, 178), green, { color: INK, side: 'left', reach: 0.45 })
    for (const s of [-1, 1]) shape(c, r, rounded(s < 0 ? -182 : 122, -120, 60, 130, 28), boxOf(s * 152, -56, 30, 66), green, { color: INK, side: s < 0 ? 'left' : 'bottom', reach: 0.6 })
    for (const x of [-60, 0, 60]) for (const y of [-280, -220]) shape(c, r, ellipse(x + (y === -220 ? 30 : 0), y, 6, 6), boxOf(0, 0, 1, 1), OCHRE)
  }),
  rocker: sprite('rocker', -140, -330, 280, 350, (c, r) => {
    for (const x of [-84, 74]) shape(c, r, rounded(x, -310, 13, 310, 6), boxOf(x + 6, -155, 7, 155), OCHRE, { color: BROWN, side: 'bottom', reach: 0.6 })
    for (const y of [-296, -240, -184, -128]) shape(c, r, rounded(-84, y, 170, 18, 8), boxOf(0, y + 9, 85, 9), OCHRE, { color: BROWN, side: 'bottom', reach: 0.8 })
    shape(c, r, (x) => { x.moveTo(-124, -12); x.quadraticCurveTo(0, 38, 104, -8); x.lineTo(104, 6); x.quadraticCurveTo(0, 56, -124, 2); x.closePath() }, boxOf(0, 6, 130, 24), OCHRE, { color: BROWN, side: 'bottom' })
    shape(c, r, rounded(-96, -84, 192, 22, 10), boxOf(0, -73, 96, 11), OCHRE, { color: BROWN, side: 'bottom', reach: 0.7 })
    for (const x of [-84, 70]) shape(c, r, rounded(x, -66, 14, 66, 5), boxOf(0, 0, 1, 1), BROWN)
    shape(c, r, rounded(-104, -110, 24, 14, 7), boxOf(0, 0, 1, 1), BROWN)
    shape(c, r, rounded(80, -110, 24, 14, 7), boxOf(0, 0, 1, 1), BROWN)
  }),
  blanketCheck: sprite('blanketCheck', 0, 0, 320, 320, (c, r) => {
    c.fillStyle = AQUA
    c.fillRect(0, 0, 320, 320)
    c.fillStyle = '#4d8f96'
    for (let i = 0; i < 8; i++) { c.globalAlpha = 0.42; c.fillRect(i * 40, 0, 15, 320); c.fillRect(0, i * 40, 320, 15) }
    c.globalAlpha = 1
    dabs(c, r, { x: 0, y: 0, w: 320, h: 320 }, CREAM, 'right', 0.5, 2.4, 0.5)
    dabs(c, makeRng(99), { x: 0, y: 0, w: 320, h: 320 }, '#3b7f88', 'left', 0.34, 2.6, 0.8)
  }),
} satisfies Record<string, Sprite>

export const BACK: Record<PlaceId, Sprite> = { dish: T.dishBack, teapot: T.potBack, boot: T.bootBack, pot: T.flowerBack, gramophone: T.hornBack }
export const FRONT: Record<PlaceId, Sprite> = { dish: T.dishFront, teapot: T.potFront, boot: T.bootFront, pot: T.flowerFront, gramophone: T.hornFront }
/** What comes away on the head of one who looked there for nothing, if anything does. */
export const LOOSE: Partial<Record<PlaceId, Sprite>> = { teapot: T.potLid, boot: T.bootWorn, pot: T.flowerWorn }

/** How a sausage lies in each place: where, at what angle. */
export const LIES: Record<PlaceId, { x: number; y: number; rot: number }> = {
  dish: { x: 0, y: -14, rot: -0.04 },
  teapot: { x: 82, y: -44, rot: -0.92 },
  boot: { x: -14, y: -74, rot: -1.35 },
  pot: { x: -32, y: -22, rot: -1.9 },
  gramophone: { x: 44, y: -40, rot: -0.75 },
}

export function sausage(ctx: Ctx, st: Stamps, x: number, y: number, rot: number, sx = 1, sy = 1): void {
  st.stampAt(ctx, T.sausage, x, y, rot, sx, sy)
}

/** The string from the hatch. `hung` is how much of the lowest, the next one, has come down: 0 to 1. */
export function string(ctx: Ctx, st: Stamps, sway: number, hung: number): void {
  ctx.save()
  ctx.translate(HOOK.x, -20)
  ctx.rotate(sway)
  ctx.strokeStyle = CREAM
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.lineTo(0, hung > 0 ? 190 : 120)
  ctx.stroke()
  const n = 3
  for (let i = 0; i < n; i++) sausage(ctx, st, i % 2 ? 22 : -22, 40 + i * 42, i % 2 ? 1.05 : -1.05, 0.72, 0.56)
  if (hung > 0) sausage(ctx, st, 0, HOOK.y + 14, 1.57 + Math.sin(sway * 5) * 0.2, hung)
  ctx.restore()
}

export type Drape = { x: number; top: number; bottom: number; r: number; w: number; lean: number; air: number; time: number; stir: number; ears?: boolean }

/** A blanket over a lump: a round top, sides that spread, and a hem that ripples. `air` opens it out as it falls. */
export function blanket(ctx: Ctx, st: Stamps, d: Drape): void {
  const { r, w } = d
  const wob = (k: number) => Math.sin(d.time * 2.1 + k) * (2 + d.stir) + d.air * Math.sin(d.time * 20 + k * 2) * 10
  const spread = w * (1 + d.air * 0.5)
  ctx.save()
  ctx.translate(d.x, 0)
  ctx.beginPath()
  const hem = d.bottom - d.air * 60
  ctx.moveTo(-spread, hem + wob(0))
  ctx.bezierCurveTo(-spread * 0.92, hem - (hem - d.top) * 0.5, -r * 1.5 + d.lean, d.top + r * 0.9, -r + d.lean, d.top + r * 0.55)
  if (d.ears) { ctx.lineTo(-r * 0.86 + d.lean, d.top - 16); ctx.lineTo(-r * 0.3 + d.lean, d.top + 12); ctx.lineTo(r * 0.3 + d.lean, d.top + 12); ctx.lineTo(r * 0.86 + d.lean, d.top - 16); ctx.lineTo(r + d.lean, d.top + r * 0.55) } else ctx.bezierCurveTo(-r * 0.8 + d.lean, d.top - r * 0.2, r * 0.8 + d.lean, d.top - r * 0.2, r + d.lean, d.top + r * 0.55)
  ctx.bezierCurveTo(r * 1.5 + d.lean, d.top + r * 0.9, spread * 0.92, hem - (hem - d.top) * 0.5, spread, hem + wob(5))
  const n = 6
  for (let i = n; i > 0; i--) {
    const x1 = -spread + (2 * spread * (i - 1)) / n, xm = -spread + (2 * spread * (i - 0.5)) / n
    ctx.quadraticCurveTo(xm, hem + 20 + wob(i), x1, hem + wob(i + 7) - (i % 2) * 6)
  }
  ctx.closePath()
  ctx.save()
  ctx.clip()
  const h = hem + 40 - d.top + 30
  ctx.translate(-spread - 10, d.top - 24)
  ctx.scale((spread * 2 + 20) / 320, h / 320)
  st.stamp(ctx, T.blanketCheck)
  ctx.restore()
  // Folds, as two flat strokes.
  ctx.strokeStyle = '#4d8f96'
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (const k of [-0.45, 0.4]) { ctx.moveTo(k * r * 1.6 + d.lean, d.top + r * 1.3); ctx.quadraticCurveTo(k * spread * 0.9, (d.top + hem) / 2, k * spread * 1.1, hem - 8) }
  ctx.stroke()
  ctx.restore()
}

export const DRAPES: Record<PlaceId | 'fish', { x: number; y: number; top: number; bottom: number; r: number; w: number }> = {
  dish: { x: SPOTS.dish.at.x, y: SPOTS.dish.at.y, top: -34, bottom: 40, r: 60, w: 88 },
  teapot: { x: SPOTS.teapot.at.x, y: SPOTS.teapot.at.y, top: -66, bottom: 56, r: 48, w: 92 },
  boot: { x: SPOTS.boot.at.x, y: SPOTS.boot.at.y, top: -96, bottom: 54, r: 40, w: 84 },
  pot: { x: SPOTS.pot.at.x, y: SPOTS.pot.at.y, top: -112, bottom: 60, r: 34, w: 70 },
  gramophone: { x: SPOTS.gramophone.at.x, y: SPOTS.gramophone.at.y, top: -70, bottom: 74, r: 60, w: 84 },
  fish: { x: FISH.x, y: FISH.y, top: -72, bottom: 66, r: 52, w: 74 },
}

/** How a blanket lies over a seated sitter, from the ground under it. */
export const OVER: Record<Who, { top: number; bottom: number; r: number; w: number; ears?: boolean }> = {
  dog: { top: SEATS.dog.top.y - SEATS.dog.y - 14, bottom: -46, r: 76, w: 112 },
  cat: { top: SEATS.cat.top.y - SEATS.cat.y - 10, bottom: -26, r: 70, w: 92, ears: true },
  aunt: { top: SEATS.aunt.top.y - SEATS.aunt.y - 12, bottom: -44, r: 84, w: 142 },
  grandpa: { top: SEATS.grandpa.top.y - SEATS.grandpa.y - 14, bottom: -60, r: 68, w: 100 },
}

export function basket(ctx: Ctx, st: Stamps, left: number, hop: number): void {
  ctx.save()
  ctx.translate(BASKET.x, BASKET.y + 10)
  ctx.scale(1 + hop * 0.08, 1 - hop * 0.12)
  st.stamp(ctx, T.basketBack)
  for (let i = 0; i < left; i++) st.stampAt(ctx, T.blanketFolded, (i % 2) * 6 - 3, -18 - i * 19, (i % 2 ? 0.04 : -0.04))
  st.stamp(ctx, T.basketFront)
  ctx.restore()
}

export function bellAt(ctx: Ctx, st: Stamps, swing: number): void {
  st.stampAt(ctx, T.bellFrame, BELL.x, BELL.y + 10)
  st.stampAt(ctx, T.bell, BELL.x, BELL.y - 36, swing)
}
