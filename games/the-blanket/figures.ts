import { SEATS, type Who } from './layout'
import type { Pose } from './motion'
import { CORAL, CREAM, DEEP, INK, OCHRE, SKIN, AQUA, blob, boxOf, ellipse, poly, rounded, shape, sprite, type Ctx, type Sprite, type Stamps } from './paint'

// The four of them, each from a few painted shapes, with the ground under
// them at 0,0 and y up the figure below zero. Eyes, mouths and whatever swings
// are drawn as they are; the rest is stamped.

/** The middle of each head, from the ground under the figure. */
export const HEAD: Record<Who, { x: number; y: number }> = {
  dog: { x: SEATS.dog.head.x - SEATS.dog.x, y: SEATS.dog.head.y - SEATS.dog.y },
  cat: { x: 0, y: SEATS.cat.head.y - SEATS.cat.y },
  aunt: { x: 0, y: SEATS.aunt.head.y - SEATS.aunt.y },
  grandpa: { x: 0, y: SEATS.grandpa.head.y - SEATS.grandpa.y },
}

const S: Record<string, Sprite> = {
  dogBody: sprite('dogBody', -120, -170, 240, 180, (c, r) => {
    shape(c, r, blob(-104, -6, -112, -70, -70, -138, 0, -168, 62, -140, 96, -60, 92, -4, 0, 8), { x: -120, y: -170, w: 240, h: 180 }, CREAM, { color: OCHRE, side: 'left', reach: 0.5 })
    shape(c, r, blob(-96, -40, -100, -96, -50, -124, -22, -80, -40, -30), { x: -100, y: -124, w: 80, h: 94 }, OCHRE, { color: INK, side: 'bottom', reach: 0.4, thick: 0.4 })
    // A fold between the front legs.
    shape(c, r, blob(20, -100, 34, -60, 30, -8, 24, -8, 20, -60), { x: 18, y: -100, w: 16, h: 92 }, '#e9d3a0')
  }),
  dogPaw: sprite('dogPaw', -24, -60, 60, 66, (c, r) => shape(c, r, blob(-18, -58, 16, -58, 20, -20, 36, -8, 32, 4, -20, 4, -22, -20), { x: -24, y: -60, w: 60, h: 66 }, '#fff8e6', { color: OCHRE, side: 'left', reach: 0.8, thick: 1.2 })),
  dogHead: sprite('dogHead', -74, -66, 148, 136, (c, r) => {
    shape(c, r, blob(-60, -10, -54, -52, 0, -66, 54, -52, 62, -10, 50, 40, 0, 62, -50, 40), boxOf(0, 0, 70, 66), CREAM, { color: OCHRE, side: 'left', reach: 0.35 })
    shape(c, r, blob(8, -64, 56, -54, 66, -14, 40, 4, 14, -10), { x: 8, y: -64, w: 58, h: 70 }, OCHRE, { color: INK, side: 'right', reach: 0.3, thick: 0.4 })
  }),
  dogEar: sprite('dogEar', -26, -10, 54, 112, (c, r) => shape(c, r, blob(-10, -8, 14, -6, 26, 50, 18, 98, -14, 98, -24, 50), { x: -26, y: -10, w: 54, h: 112 }, INK, { color: DEEP, side: 'bottom', reach: 0.6 })),
  dogSnout: sprite('dogSnout', -46, -34, 92, 72, (c, r) => shape(c, r, ellipse(0, 2, 44, 32), boxOf(0, 2, 44, 32), '#fff8e6', { color: OCHRE, side: 'bottom', reach: 0.5 })),
  dogNose: sprite('dogNose', -22, -16, 44, 32, (c, r) => { shape(c, r, ellipse(0, 0, 20, 14), boxOf(0, 0, 20, 14), INK); shape(c, r, ellipse(-6, -5, 6, 3), boxOf(-6, -5, 6, 3), CREAM) }),

  catBody: sprite('catBody', -76, -200, 152, 208, (c, r) => {
    shape(c, r, blob(-60, 4, -72, -60, -44, -130, -30, -196, 30, -196, 44, -130, 72, -60, 60, 4), boxOf(0, -96, 76, 104), INK, { color: '#4d8f96', side: 'left', reach: 0.42 })
    shape(c, r, blob(-26, -10, -30, -70, 0, -140, 30, -70, 26, -10, 0, 0), boxOf(0, -70, 30, 70), CREAM, { color: OCHRE, side: 'bottom', reach: 0.5 })
  }),
  catPaw: sprite('catPaw', -20, -34, 44, 40, (c, r) => shape(c, r, blob(-16, -30, 14, -30, 22, -8, 18, 4, -16, 4), boxOf(2, -14, 22, 20), INK, { color: '#4d8f96', side: 'bottom', reach: 0.5 })),
  catHead: sprite('catHead', -76, -96, 152, 156, (c, r) => {
    shape(c, r, poly(-58, -20, -56, -92, -12, -50), { x: -60, y: -92, w: 50, h: 74 }, INK)
    shape(c, r, poly(58, -20, 56, -92, 12, -50), { x: 10, y: -92, w: 50, h: 74 }, INK)
    shape(c, r, poly(-48, -38, -50, -74, -24, -52), { x: -52, y: -76, w: 30, h: 40 }, SKIN, { color: CORAL, side: 'bottom', reach: 0.5 })
    shape(c, r, poly(48, -38, 50, -74, 24, -52), { x: 22, y: -76, w: 30, h: 40 }, SKIN, { color: CORAL, side: 'bottom', reach: 0.5 })
    shape(c, r, blob(-66, -8, -50, -50, 0, -56, 50, -50, 66, -8, 52, 38, 0, 54, -52, 38), boxOf(0, 0, 68, 56), INK, { color: '#4d8f96', side: 'left', reach: 0.3 })
    shape(c, r, blob(-24, 18, 0, 8, 24, 18, 20, 44, 0, 50, -20, 44), boxOf(0, 30, 24, 22), CREAM, { color: OCHRE, side: 'bottom', reach: 0.4 })
    shape(c, r, poly(-8, 14, 8, 14, 0, 24), boxOf(0, 18, 8, 6), SKIN)
  }),

  auntBody: sprite('auntBody', -140, -190, 280, 196, (c, r) => {
    shape(c, r, blob(-122, 0, -134, -60, -96, -130, -70, -186, 70, -186, 96, -130, 134, -60, 122, 0), boxOf(0, -92, 138, 98), OCHRE, { color: '#b8622c', side: 'left', reach: 0.4 })
    c.save(); c.beginPath(); blob(-122, 0, -134, -60, -96, -130, -70, -186, 70, -186, 96, -130, 134, -60, 122, 0)(c); c.clip()
    for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) shape(c, r, ellipse(-126 + x * 37 + (y % 2) * 18, -14 - y * 32, 7, 6.4, 0.4), boxOf(0, 0, 1, 1), INK)
    c.restore()
    // The lace collar.
    for (let i = -4; i <= 4; i++) shape(c, r, ellipse(i * 17, -172 + Math.abs(i) * -2 + 16, 13, 15), boxOf(i * 17, -156, 13, 15), CREAM, { color: OCHRE, side: 'bottom', reach: 0.4 })
  }),
  auntArm: sprite('auntArm', -26, -16, 52, 112, (c, r) => {
    shape(c, r, blob(-20, -12, 18, -12, 24, 40, 16, 84, -14, 84, -24, 40), boxOf(0, 36, 26, 52), OCHRE, { color: '#b8622c', side: 'left', reach: 0.6 })
    shape(c, r, ellipse(0, 84, 16, 14), boxOf(0, 84, 16, 14), SKIN)
  }),
  auntShoe: sprite('auntShoe', -26, -18, 60, 24, (c, r) => shape(c, r, blob(-20, -14, 8, -16, 32, -2, 28, 4, -22, 4), boxOf(4, -6, 30, 12), INK, { color: DEEP, side: 'bottom' })),
  auntHead: sprite('auntHead', -84, -96, 168, 170, (c, r) => {
    // Hair, then the face, then a small flat hat a thing can lie on.
    shape(c, r, blob(-78, 10, -76, -40, -40, -70, 40, -70, 76, -40, 78, 10, 50, 40, -50, 40), boxOf(0, -16, 80, 58), INK, { color: DEEP, side: 'left', reach: 0.4 })
    shape(c, r, blob(-58, 4, -52, -44, 0, -54, 52, -44, 58, 4, 40, 54, 0, 66, -40, 54), boxOf(0, 4, 60, 62), SKIN, { color: CORAL, side: 'left', reach: 0.22, thick: 0.6 })
    shape(c, r, ellipse(-34, 26, 15, 11), boxOf(-34, 26, 15, 11), '#eb9b74')
    shape(c, r, ellipse(34, 26, 15, 11), boxOf(34, 26, 15, 11), '#eb9b74')
    shape(c, r, blob(-56, -54, -44, -76, 44, -76, 56, -54, 0, -48), boxOf(0, -64, 58, 18), CREAM, { color: OCHRE, side: 'bottom', reach: 0.7 })
    shape(c, r, ellipse(44, -76, 13, 12), boxOf(44, -76, 13, 12), OCHRE, { color: INK, side: 'bottom', reach: 0.4 })
  }),
  fan: sprite('fan', -62, -74, 124, 84, (c, r) => {
    shape(c, r, (x) => { x.moveTo(0, 6); x.arc(0, 4, 62, Math.PI * 1.12, Math.PI * 1.88); x.closePath() }, { x: -62, y: -70, w: 124, h: 76 }, CREAM, { color: '#4d8f96', side: 'top', reach: 0.4 })
    for (let i = 0; i < 6; i++) { const a = Math.PI * (1.16 + i * 0.136); shape(c, r, poly(0, 5, Math.cos(a) * 60 - 2, Math.sin(a) * 60, Math.cos(a) * 60 + 2, Math.sin(a) * 60), boxOf(0, 0, 1, 1), DEEP) }
  }),

  gramBody: sprite('gramBody', -100, -206, 200, 212, (c, r) => {
    shape(c, r, blob(-74, 0, -80, -80, -58, -160, -30, -204, 30, -204, 58, -160, 80, -80, 74, 0), boxOf(0, -100, 82, 106), INK, { color: '#4d8f96', side: 'left', reach: 0.4 })
    shape(c, r, blob(-26, -30, -32, -110, -16, -190, 16, -190, 32, -110, 26, -30, 0, -14), boxOf(0, -104, 32, 92), OCHRE, { color: '#b8622c', side: 'bottom', reach: 0.4 })
    for (let i = 0; i < 4; i++) shape(c, r, ellipse(0, -62 - i * 32, 5, 5), boxOf(0, 0, 5, 5), CREAM)
  }),
  gramLeg: sprite('gramLeg', -18, -52, 54, 58, (c, r) => {
    shape(c, r, rounded(-14, -50, 26, 46, 10), boxOf(0, -28, 14, 26), INK)
    shape(c, r, blob(-18, -12, 8, -14, 34, -2, 30, 4, -18, 4), boxOf(6, -4, 28, 10), OCHRE, { color: INK, side: 'bottom', reach: 0.4 })
  }),
  gramArm: sprite('gramArm', -20, -14, 40, 108, (c, r) => {
    shape(c, r, blob(-16, -10, 14, -10, 18, 40, 12, 82, -10, 82, -18, 40), boxOf(0, 36, 20, 50), INK, { color: '#4d8f96', side: 'left', reach: 0.5 })
    shape(c, r, ellipse(0, 84, 14, 13), boxOf(0, 84, 14, 13), SKIN)
  }),
  gramHead: sprite('gramHead', -74, -78, 148, 152, (c, r) => {
    shape(c, r, blob(-70, -8, -66, -40, -40, -34, -44, 14, -66, 18), boxOf(-56, -10, 18, 30), CREAM, { color: '#4d8f96', side: 'bottom', reach: 0.5 })
    shape(c, r, blob(70, -8, 66, -40, 40, -34, 44, 14, 66, 18), boxOf(56, -10, 18, 30), CREAM, { color: '#4d8f96', side: 'bottom', reach: 0.5 })
    shape(c, r, blob(-50, 0, -46, -50, 0, -72, 46, -50, 50, 0, 42, 46, 0, 64, -42, 46), boxOf(0, -4, 52, 70), SKIN, { color: CORAL, side: 'left', reach: 0.24, thick: 0.6 })
    shape(c, r, ellipse(0, 10, 17, 22), boxOf(0, 10, 17, 22), '#eea27c', { color: CORAL, side: 'bottom', reach: 0.5, thick: 0.7 })
  }),
  moustache: sprite('moustache', -8, -24, 78, 56, (c, r) => shape(c, r, blob(0, -14, 30, -20, 56, -2, 70, 22, 44, 16, 16, 20, 0, 10), { x: -6, y: -22, w: 76, h: 46 }, CREAM, { color: '#4d8f96', side: 'bottom', reach: 0.45 })),
  pipe: sprite('pipe', -10, -34, 74, 50, (c, r) => {
    shape(c, r, rounded(0, -2, 46, 8, 4), boxOf(22, 2, 24, 5), INK)
    shape(c, r, blob(38, -26, 62, -26, 60, 10, 42, 10), boxOf(50, -8, 12, 18), CREAM, { color: OCHRE, side: 'bottom', reach: 0.5 })
  }),
  puff: sprite('puff', -20, -20, 40, 40, (c, r) => shape(c, r, ellipse(0, 0, 17, 15), boxOf(0, 0, 17, 15), CREAM, { color: AQUA, side: 'bottom' })),
}
export const FIGURE_SPRITES = S

const EYES: Record<Who, { x: number; y: number; gap: number; r: number; pupil: number; white: string; shut: string }> = {
  dog: { x: 0, y: -16, gap: 24, r: 21, pupil: 11, white: '#fffaf0', shut: '#efdcae' },
  cat: { x: 0, y: -12, gap: 28, r: 22, pupil: 9, white: '#f6cf5a', shut: '#2c3c5d' },
  aunt: { x: 0, y: -10, gap: 26, r: 21, pupil: 10, white: '#fffaf0', shut: '#e3a077' },
  grandpa: { x: 0, y: -24, gap: 24, r: 20, pupil: 9, white: '#fffaf0', shut: '#e3a077' },
}

export type Gaze = { x: number; y: number }

function eyes(ctx: Ctx, who: Who, p: Pose, gaze: Gaze, dizzy: number): void {
  const e = EYES[who]
  for (const side of [-1, 1]) {
    const x = e.x + side * e.gap, y = e.y
    ctx.save()
    ctx.translate(x, y)
    if (p.lid > 0.8) {
      ctx.strokeStyle = who === 'cat' ? '#f6cf5a' : INK
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath()
      // Squeezed shut: a bent line, never a level bar.
      ctx.moveTo(-13, side < 0 ? -5 : 3); ctx.quadraticCurveTo(0, 9, 13, side < 0 ? 3 : -5)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.ellipse(0, 0, e.r, e.r * (1.06 - p.lid * 0.5), 0, 0, 7)
      ctx.fillStyle = e.white
      ctx.fill()
      ctx.save()
      ctx.clip()
      const reach = e.r - e.pupil + 2
      const d = dizzy > 0 ? { x: Math.cos(dizzy * 22 + side) * 0.8, y: Math.sin(dizzy * 22 + side) * 0.8 } : gaze
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.ellipse(d.x * reach, d.y * reach, e.pupil * (who === 'cat' ? 0.72 : 1), e.pupil * (who === 'cat' ? 1.5 : 1.1), 0, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(d.x * reach - 3, d.y * reach - 4, 3, 0, 7)
      ctx.fill()
      if (p.lid > 0) { ctx.fillStyle = e.shut; ctx.fillRect(-e.r, -e.r * 1.2, e.r * 2, e.r * 2 * p.lid) }
      ctx.restore()
    }
    // Brows.
    if (p.brow !== 0 || who === 'grandpa') {
      ctx.strokeStyle = who === 'grandpa' ? CREAM : who === 'cat' ? '#f6cf5a' : INK
      ctx.lineWidth = who === 'grandpa' ? 9 : 5.5
      ctx.lineCap = 'round'
      const up = -e.r - 8 - Math.max(0, p.brow) * 8
      ctx.beginPath()
      ctx.moveTo(-13, up + side * p.brow * -7 * (p.brow < 0 ? -1 : 1) * 0.9)
      ctx.lineTo(13, up + side * p.brow * 7 * (p.brow < 0 ? -1 : 1) * 0.9)
      ctx.stroke()
    }
    if (who === 'aunt' && p.lid <= 0.8) {
      ctx.strokeStyle = INK
      ctx.lineWidth = 3.4
      ctx.beginPath()
      for (const k of [0, 1, 2]) { const a = -Math.PI / 2 + side * (0.35 + k * 0.34); ctx.moveTo(Math.cos(a) * e.r, Math.sin(a) * e.r); ctx.lineTo(Math.cos(a) * (e.r + 9), Math.sin(a) * (e.r + 9)) }
      ctx.stroke()
    }
    ctx.restore()
  }
}

const MOUTHS: Record<Who, { x: number; y: number; w: number }> = { dog: { x: 0, y: 42, w: 22 }, cat: { x: 0, y: 32, w: 13 }, aunt: { x: 0, y: 40, w: 15 }, grandpa: { x: 0, y: 48, w: 15 } }

function mouth(ctx: Ctx, who: Who, p: Pose, time: number): void {
  const m = MOUTHS[who], w = m.w
  ctx.save()
  ctx.translate(m.x, m.y)
  ctx.lineCap = 'round'
  ctx.lineWidth = 4.5
  ctx.strokeStyle = INK
  ctx.fillStyle = INK
  ctx.beginPath()
  switch (p.mouth) {
    case 'open':
      ctx.ellipse(0, 4, w, w * 0.85, 0, 0, 7); ctx.fill()
      ctx.beginPath(); ctx.ellipse(0, 4 + w * 0.42, w * 0.6, w * 0.4, 0, 0, 7); ctx.fillStyle = '#d98468'; ctx.fill()
      break
    case 'o': ctx.ellipse(0, 3, w * 0.5, w * 0.68, 0, 0, 7); ctx.fill(); break
    case 'chew': { const k = Math.abs(Math.sin(time * 9)); ctx.ellipse(0, 2, w * 0.7, 3 + k * 8, 0, 0, 7); ctx.fill(); break }
    case 'grump': ctx.moveTo(-w * 0.8, 7); ctx.quadraticCurveTo(0, -9, w * 0.8, 7); ctx.stroke(); break
    case 'smile': ctx.moveTo(-w * 0.8, -3); ctx.quadraticCurveTo(0, 11, w * 0.8, -3); ctx.stroke(); break
    case 'flat': ctx.moveTo(-w * 0.6, 3); ctx.quadraticCurveTo(0, -2, w * 0.6, 4); ctx.stroke(); break
    default: ctx.moveTo(-w * 0.6, 0); ctx.quadraticCurveTo(0, 5, w * 0.6, 0); ctx.stroke()
  }
  ctx.restore()
}

function frizz(ctx: Ctx, who: Who, k: number): void {
  if (k <= 0) return
  ctx.strokeStyle = who === 'dog' ? OCHRE : who === 'grandpa' ? CREAM : INK
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = -4; i <= 4; i++) {
    const a = -Math.PI / 2 + i * 0.27, r0 = SEATS[who].r * 0.85, r1 = r0 + 30 * k
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0)
    ctx.lineTo(Math.cos(a + 0.08 * (i % 2)) * r1, Math.sin(a) * r1)
  }
  ctx.stroke()
}

/** A limb as one thick line from a to b through a bend. */
function limb(ctx: Ctx, color: string, width: number, ...p: number[]): void {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(p[0], p[1])
  if (p.length === 6) ctx.quadraticCurveTo(p[2], p[3], p[4], p[5])
  else ctx.bezierCurveTo(p[2], p[3], p[4], p[5], p[6], p[7])
  ctx.stroke()
}

/** What a sitter has got stuck on its head from where it looked. */
export type Stuck = Sprite | null

export type Extras = {
  /** Under a blanket: the head and the hands are not drawn. */
  covered: boolean
  dizzy: number
  stuck: Stuck
  /** What the pointing limb points along, as an angle. */
  point: number | null
  time: number
  /** A sausage being eaten, 1 whole to 0 gone, or null. */
  bite: number | null
  /** The sausage as its eater holds it. */
  sausage: (ctx: Ctx, x: number, y: number, rot: number, left: number) => void
}

export function figure(ctx: Ctx, st: Stamps, who: Who, p: Pose, gaze: Gaze, x: Extras): void {
  DRAW[who](ctx, st, p, gaze, x)
}

function head(ctx: Ctx, st: Stamps, who: Who, p: Pose, gaze: Gaze, x: Extras, face: () => void): void {
  if (x.covered) return
  const h = HEAD[who]
  ctx.save()
  ctx.translate(h.x + p.headX + gaze.x * 9, h.y + p.headY + gaze.y * 6)
  ctx.rotate(p.headRot + gaze.x * 0.08)
  face()
  if (x.stuck) st.stampAt(ctx, x.stuck, 0, -28, Math.sin(x.time * 9) * 0.06)
  ctx.restore()
}

const stride = (p: Pose, k: number) => Math.sin(p.legs + k * Math.PI) * p.legging

type Draw = (ctx: Ctx, st: Stamps, p: Pose, gaze: Gaze, x: Extras) => void
const DRAW: Record<Who, Draw> = {
  dog(ctx, st, p, gaze, x) {
    const wag = Math.sin(x.time * (x.covered ? 16 : 7)) * (x.covered ? 0.7 : 0.4)
    limb(ctx, INK, 15, -94, -22, -130, -30 + wag * 30, -124 + wag * 26, -86)
    st.stampAt(ctx, S.dogBody, 0, 0)
    for (const [k, px] of [[0, -62], [1, -14], [0.5, 34], [1.5, 70]] as const) st.stampAt(ctx, S.dogPaw, px + stride(p, k) * 24, -Math.max(0, stride(p, k + 0.5)) * 16)
    head(ctx, st, 'dog', p, gaze, x, () => {
      frizz(ctx, 'dog', p.frizz)
      const lift = p.legging * 0.7 + Math.max(0, p.frizz) * 1.5
      st.stamp(ctx, S.dogHead)
      eyes(ctx, 'dog', p, gaze, x.dizzy)
      // It points with its nose.
      st.stampAt(ctx, S.dogSnout, gaze.x * 16, 30 + gaze.y * 8)
      ctx.save(); ctx.translate(gaze.x * 16, gaze.y * 8); mouth(ctx, 'dog', p, x.time); ctx.restore()
      st.stampAt(ctx, S.dogNose, gaze.x * 25, 16 + gaze.y * 12)
      const cover = p.flap >= 1 ? 0.9 : 0
      st.stampAt(ctx, S.dogEar, -56, -38, 0.28 + lift - cover * 0.8 + p.flap * 0.1)
      st.stampAt(ctx, S.dogEar, 56, -38, -0.28 - lift + cover * 0.8 - p.flap * 0.1, -1, 1)
      if (x.bite !== null) x.sausage(ctx, 0, 48, 0.1, x.bite)
    })
  },
  cat(ctx, st, p, gaze, x) {
    // The tail points: its tip leans towards what the cat believes.
    const a = x.point ?? -1.4 + Math.sin(x.time * 0.9) * 0.5
    const tx = -92, ty = -66
    limb(ctx, INK, 17, -46, -14, -116, -2, -100, -36, tx, ty)
    limb(ctx, INK, 15, tx, ty, tx + 4 + Math.cos(a) * 20, ty - 6 + Math.sin(a) * 20, tx + Math.cos(a) * 46, ty + Math.sin(a) * 46)
    limb(ctx, CREAM, 14, tx + Math.cos(a) * 42, ty + Math.sin(a) * 42, tx + Math.cos(a) * 44, ty + Math.sin(a) * 44, tx + Math.cos(a) * 47, ty + Math.sin(a) * 47)
    st.stamp(ctx, S.catBody)
    for (const [k, px] of [[0, -34], [1, 28]] as const) st.stampAt(ctx, S.catPaw, px + stride(p, k) * 18, 2 - Math.max(0, stride(p, k + 0.5)) * 22)
    head(ctx, st, 'cat', p, gaze, x, () => {
      frizz(ctx, 'cat', p.frizz)
      st.stamp(ctx, S.catHead)
      eyes(ctx, 'cat', p, gaze, x.dizzy)
      mouth(ctx, 'cat', p, x.time)
      ctx.strokeStyle = CREAM
      ctx.lineWidth = 2.6
      ctx.beginPath()
      for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { ctx.moveTo(s * 26, 24 + k * 5); ctx.lineTo(s * 84, 20 + k * 13) }
      ctx.stroke()
      if (x.bite !== null) x.sausage(ctx, 0, 34, 1.4, x.bite)
    })
  },
  aunt(ctx, st, p, gaze, x) {
    for (const [k, px] of [[0, -44], [1, 30]] as const) st.stampAt(ctx, S.auntShoe, px + stride(p, k) * 22 + (x.covered ? Math.sin(x.time * 6 + k * 2) * 5 : 0), 10 - Math.max(0, stride(p, k + 0.5)) * 24 - (x.covered ? Math.max(0, Math.sin(x.time * 6 + k * 3)) * 12 : 0))
    st.stamp(ctx, S.auntBody)
    if (x.covered) return
    st.stampAt(ctx, S.auntArm, 92, -142, -0.5 + p.legging * 0.5)
    head(ctx, st, 'aunt', p, gaze, x, () => {
      frizz(ctx, 'aunt', p.frizz)
      st.stamp(ctx, S.auntHead)
      eyes(ctx, 'aunt', p, gaze, x.dizzy)
      mouth(ctx, 'aunt', p, x.time)
      if (x.bite !== null) x.sausage(ctx, 6, 46, -0.15, x.bite)
    })
    // The fan points, and fans.
    const up = p.flap < -0.6
    const a = x.point !== null ? x.point + Math.PI / 2 : p.flap * 0.8
    if (up) { st.stampAt(ctx, S.auntArm, -92, -142, -2.4); st.stampAt(ctx, S.fan, 34, HEAD.aunt.y + 56, 0, 1) } else {
      st.stampAt(ctx, S.auntArm, -92, -142, 0.72)
      st.stampAt(ctx, S.fan, -148, -86, Math.max(-2.2, Math.min(2.2, a)), 1, 1 - Math.abs(p.flap) * 0.35)
    }
  },
  grandpa(ctx, st, p, gaze, x) {
    for (const [k, px] of [[0, -38], [1, 22]] as const) st.stampAt(ctx, S.gramLeg, px + stride(p, k) * 26, -Math.max(0, stride(p, k + 0.5)) * 40)
    st.stampAt(ctx, S.gramBody, 0, -20)
    if (!x.covered) st.stampAt(ctx, S.gramArm, 58, -176, -0.4 + p.legging * stride(p, 0) * 0.5 + (p.flap < -0.8 ? 2.2 : 0))
    head(ctx, st, 'grandpa', p, gaze, x, () => {
      frizz(ctx, 'grandpa', p.frizz)
      st.stamp(ctx, S.gramHead)
      eyes(ctx, 'grandpa', p, gaze, x.dizzy)
      mouth(ctx, 'grandpa', p, x.time)
      // The moustache says what he thinks of it: up, drooping, or blown straight out.
      const worn = x.bite !== null && x.bite > 0.55
      const droop = p.mouth === 'grump' ? (p.flap > 0.8 ? -0.5 : 0.62) : p.mouth === 'smile' ? -0.3 : 0.06
      const k = droop + Math.sin(x.time * 2) * 0.04 + p.flap * 0.06
      st.stampAt(ctx, S.moustache, 2, 34, k)
      st.stampAt(ctx, S.moustache, -2, 34, -k, -1, 1)
      if (x.bite !== null) x.sausage(ctx, 0, worn ? 30 : 48, 0, x.bite)
    })
    // The pipe points.
    if (x.covered) return
    const a = x.point ?? 0.4 + p.flap * 0.5
    st.stampAt(ctx, S.gramArm, -58, -176, 0.5 - p.legging * 0.4)
    ctx.save()
    ctx.translate(-98, -102)
    ctx.rotate(a)
    if (Math.cos(a) < 0) ctx.scale(1, -1)
    st.stamp(ctx, S.pipe)
    ctx.restore()
  },
}
