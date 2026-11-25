import { BED } from './bed'
import { BOTTLE, HALF, QUILT, SHELF } from './layout'
import { DUMMY, GEAR, MASK } from './sheep'
import { C, OWN, box, disc, mix, moulded, sprite, type Ctx } from './paint'

// The hard toys around the bed, and the quilt, which is flat felt.

const bottlePath = (ctx: Ctx) => {
  const w = BOTTLE.w / 2, h = BOTTLE.h
  ctx.beginPath()
  ctx.moveTo(-w, -6)
  ctx.quadraticCurveTo(-w, 0, -w + 8, 0)
  ctx.lineTo(w - 8, 0)
  ctx.quadraticCurveTo(w, 0, w, -6)
  ctx.lineTo(w, -h * 0.58)
  ctx.quadraticCurveTo(w, -h * 0.74, 13, -h * 0.8)
  ctx.lineTo(13, -h * 0.94)
  ctx.lineTo(-13, -h * 0.94)
  ctx.lineTo(-13, -h * 0.8)
  ctx.quadraticCurveTo(-w, -h * 0.74, -w, -h * 0.58)
  ctx.closePath()
}
const BOTTLE_BACK = sprite('bottleBack', -34, -108, 68, 112, (ctx) => {
  bottlePath(ctx)
  ctx.fillStyle = '#b9d3da'
  ctx.fill()
})
const BOTTLE_FRONT = sprite('bottleFront', -34, -112, 68, 116, (ctx) => {
  ctx.save()
  bottlePath(ctx)
  ctx.clip()
  const g = ctx.createLinearGradient(-27, 0, 27, 0)
  g.addColorStop(0, 'rgba(60,90,110,0.35)')
  g.addColorStop(0.2, 'rgba(255,255,255,0.1)')
  g.addColorStop(0.75, 'rgba(255,255,255,0)')
  g.addColorStop(1, 'rgba(60,70,90,0.4)')
  ctx.fillStyle = g
  ctx.fillRect(-30, -110, 60, 112)
  ctx.globalAlpha = 0.85
  box(ctx, -19, -56, 6, 40, 3)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()
  bottlePath(ctx)
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(60,80,100,0.55)'
  ctx.stroke()
})
const TEAT = sprite('teat', -22, -24, 44, 34, (ctx) => {
  moulded(ctx, () => box(ctx, -18, -12, 36, 18, 6), C.red, { x: -18, y: -12, w: 36, h: 18 }, 0.6)
})
/** A bottle that is somebody's wears what they wear, over a face-high band of their colour. */
function wear(ctx: Ctx, st: { stampAt(ctx: Ctx, s: ReturnType<typeof sprite>, x: number, y: number, rot?: number, sx?: number, sy?: number): void }, owner: number): void {
  const top = -BOTTLE.h * 0.94
  if (owner === 2) { st.stampAt(ctx, DUMMY, 0, top - 2, 0, 0.8); return }
  st.stampAt(ctx, owner === 3 ? MASK : GEAR[owner], 0, top + (owner === 3 ? 30 : 4), 0, owner === 3 ? 0.56 : 0.62)
}
const BAND = OWN.map((c) => sprite(`band${c}`, -32, -50, 64, 34, (ctx) => {
  ctx.save(); bottlePath(ctx); ctx.clip()
  ctx.fillStyle = c; ctx.fillRect(-30, -44, 60, 24)
  ctx.fillStyle = mix(c, '#ffffff', 0.55)
  for (const x of [-18, 0, 18]) { ctx.beginPath(); ctx.arc(x, -32, 5, 0, 7); ctx.fill() }
  ctx.restore()
}))

/** A bottle standing at its foot: how full, and in whose colour. Coloured ones wear a spotted band as well. */
export function bottle(ctx: Ctx, st: { stampAt(ctx: Ctx, s: ReturnType<typeof sprite>, x: number, y: number, rot?: number, sx?: number, sy?: number): void; stamp(ctx: Ctx, s: ReturnType<typeof sprite>): void }, x: number, y: number, full: number, owner: number | null, rot: number, bubbling: number, time: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  st.stamp(ctx, BOTTLE_BACK)
  if (full > 0.02) {
    ctx.save()
    bottlePath(ctx)
    ctx.clip()
    ctx.fillStyle = C.milk
    const top = -4 - (BOTTLE.h * 0.78) * full
    ctx.beginPath()
    ctx.moveTo(-32, 4)
    for (let i = -32; i <= 32; i += 8) ctx.lineTo(i, top + Math.sin(i * 0.2 + time * 7) * (1 + bubbling * 2) - rot * i)
    ctx.lineTo(32, 4)
    ctx.fill()
    if (bubbling > 0) for (let i = 0; i < 4; i++) {
      const k = (time * 0.9 + i * 0.27) % 1
      ctx.strokeStyle = 'rgba(120,150,170,0.7)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(-14 + i * 9 + Math.sin(k * 9 + i) * 3, -8 + (top + 4) * k, 3 + i % 2 * 2, 0, 7)
      ctx.stroke()
    }
    ctx.restore()
  }
  st.stamp(ctx, BOTTLE_FRONT)
  if (owner !== null) st.stamp(ctx, BAND[owner])
  if (owner === null) st.stampAt(ctx, TEAT, 0, -BOTTLE.h * 0.94)
  else wear(ctx, st, owner)
  ctx.restore()
}

/** The headboard: a hard shelf over each half and a post between, with the mouse's hole at the end. */
export const HEADBOARD = sprite('headboard', 180, 30, 1000, 196, (ctx) => {
  for (const side of ['left', 'right'] as const) {
    const h = HALF[side], x = h.left + (side === 'left' ? -14 : 24), w = h.right - h.left - 10
    ctx.fillStyle = 'rgba(40,24,14,0.3)'
    box(ctx, x + 8, SHELF.top + 12, w, SHELF.bottom - SHELF.top, 26); ctx.fill()
    moulded(ctx, () => box(ctx, x, SHELF.top, w, SHELF.bottom - SHELF.top - 4, 30), '#e9b765', { x, y: SHELF.top, w: w * 1.4, h: 150 }, 0)
    moulded(ctx, () => box(ctx, x + 16, SHELF.top + 14, w - 32, 104, 22), '#57a6a1', { x, y: SHELF.top, w: w * 1.6, h: 300 }, 0)
    ctx.fillStyle = 'rgba(20,50,60,0.3)'
    box(ctx, x + 16, SHELF.top + 14, w - 32, 18, 12); ctx.fill()
    moulded(ctx, () => box(ctx, x - 6, SHELF.y - 2, w + 12, 24, 10), C.wood, { x, y: SHELF.y - 2, w, h: 24 }, 0)
    ctx.fillStyle = 'rgba(255,246,221,0.7)'
    ctx.fillRect(x + 6, SHELF.y, w - 12, 3)
  }
  moulded(ctx, () => box(ctx, BED.crest - 16, SHELF.top - 8, 32, 156, 14), C.red, { x: BED.crest - 16, y: SHELF.top, w: 32, h: 150 }, 0.3)
  moulded(ctx, () => { ctx.beginPath(); ctx.arc(BED.crest, SHELF.top - 2, 22, 0, 7) }, C.red, { x: BED.crest - 22, y: SHELF.top - 24, w: 44, h: 44 }, 0.6)
})
export const HOLE = sprite('hole', -44, -70, 92, 118, (ctx) => {
  ctx.fillStyle = 'rgba(40,24,14,0.3)'; box(ctx, -34, -54, 82, 100, 20); ctx.fill()
  moulded(ctx, () => box(ctx, -40, -62, 82, 104, 22), C.wood, { x: -40, y: -62, w: 82, h: 104 }, 0)
  ctx.beginPath(); ctx.moveTo(-26, 34); ctx.lineTo(-26, -14); ctx.arc(0, -14, 26, Math.PI, 0); ctx.lineTo(26, 34); ctx.closePath()
  ctx.fillStyle = '#3a231b'; ctx.fill()
})
export const MOUSE_HEAD = sprite('mouse', -40, -44, 80, 84, (ctx) => {
  const grey = '#a9a3b5'
  for (const s of [-1, 1]) {
    moulded(ctx, () => { ctx.beginPath(); ctx.arc(s * 19, -20, 16, 0, 7) }, grey, { x: s * 19 - 16, y: -36, w: 32, h: 32 }, 0.3)
    disc(ctx, s * 19, -19, 9, 9, C.tongue)
  }
  moulded(ctx, () => { ctx.beginPath(); ctx.moveTo(-24, -6); ctx.bezierCurveTo(-22, -30, 22, -30, 24, -6); ctx.bezierCurveTo(22, 14, 8, 26, 0, 28); ctx.bezierCurveTo(-8, 26, -22, 14, -24, -6) }, grey, { x: -24, y: -26, w: 48, h: 54 }, 0.3)
  disc(ctx, 0, 24, 7, 6, C.pink)
})
export const TONGUE = sprite('tongue', -10, -4, 20, 30, (ctx) => moulded(ctx, () => box(ctx, -8, -2, 16, 24, 8), C.tongue, { x: -8, y: 0, w: 16, h: 24 }, 0.4))

const tan = '#c9823f'
export const DOG_BODY = sprite('dogBody', -110, -70, 220, 300, (ctx) => {
  ctx.fillStyle = 'rgba(40,24,14,0.35)'; ctx.beginPath(); ctx.ellipse(10, 176, 96, 24, 0, 0, 7); ctx.fill()
  moulded(ctx, () => { ctx.beginPath(); ctx.moveTo(-46, -30); ctx.bezierCurveTo(-84, 40, -92, 120, -78, 170); ctx.lineTo(78, 170); ctx.bezierCurveTo(92, 120, 84, 40, 46, -30); ctx.closePath() }, tan, { x: -90, y: -30, w: 180, h: 200 }, 0.25)
  moulded(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 76, 36, 66, 0, 0, 7) }, '#f0cf9a', { x: -36, y: 10, w: 72, h: 132 }, 0.2)
  for (const s of [-1, 1]) {
    moulded(ctx, () => box(ctx, s * 44 - 22, 60, 44, 112, 22), mix(tan, '#ffffff', 0.08), { x: s * 44 - 22, y: 60, w: 44, h: 112 }, 0.25)
    moulded(ctx, () => { ctx.beginPath(); ctx.ellipse(s * 48, 170, 32, 18, 0, 0, 7) }, '#f0cf9a', { x: s * 48 - 32, y: 152, w: 64, h: 36 }, 0.4)
  }
  // The joint pins of a wooden toy.
  for (const s of [-1, 1]) disc(ctx, s * 52, 84, 6, 6, mix(tan, '#2b1d1a', 0.4))
  moulded(ctx, () => box(ctx, -50, -36, 100, 24, 12), C.red, { x: -50, y: -36, w: 100, h: 24 }, 0.4)
})
export const DOG_HEAD = sprite('dogHead', -90, -90, 180, 170, (ctx) => {
  moulded(ctx, () => { ctx.beginPath(); ctx.moveTo(-58, -30); ctx.bezierCurveTo(-54, -82, 54, -82, 58, -30); ctx.bezierCurveTo(70, 20, 50, 66, 0, 68); ctx.bezierCurveTo(-50, 66, -70, 20, -58, -30) }, tan, { x: -64, y: -72, w: 128, h: 140 }, 0.35)
  moulded(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 34, 44, 34, 0, 0, 7) }, '#f0cf9a', { x: -44, y: 0, w: 88, h: 68 }, 0.35)
  moulded(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 12, 20, 14, 0, 0, 7) }, C.ink, { x: -20, y: -2, w: 40, h: 28 }, 0.7)
  ctx.strokeStyle = C.faceDark; ctx.lineWidth = 4; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(0, 40); ctx.moveTo(-18, 46); ctx.quadraticCurveTo(-6, 52, 0, 40); ctx.quadraticCurveTo(6, 52, 18, 46); ctx.stroke()
})
export const DOG_EAR = sprite('dogEar', -30, -14, 60, 112, (ctx) => moulded(ctx, () => { ctx.beginPath(); ctx.moveTo(-16, -6); ctx.bezierCurveTo(-34, 40, -26, 92, 0, 92); ctx.bezierCurveTo(26, 92, 28, 40, 16, -6); ctx.closePath() }, '#8a5327', { x: -28, y: -6, w: 56, h: 98 }, 0.35))
export const DOG_LYING = sprite('dogLying', -150, -100, 300, 210, (ctx) => {
  ctx.fillStyle = 'rgba(40,24,14,0.35)'; ctx.beginPath(); ctx.ellipse(8, 66, 140, 34, 0, 0, 7); ctx.fill()
  moulded(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 10, 138, 80, 0, 0, 7) }, tan, { x: -138, y: -70, w: 276, h: 160 }, 0.3)
  moulded(ctx, () => { ctx.beginPath(); ctx.ellipse(118, 44, 26, 20, 0.5, 0, 7) }, '#f0cf9a', { x: 92, y: 24, w: 52, h: 40 }, 0.3)
})
export const CRATE_BOX = sprite('crate', -98, -92, 200, 180, (ctx) => {
  ctx.fillStyle = 'rgba(40,24,14,0.35)'; box(ctx, -84, -10, 180, 88, 12); ctx.fill()
  moulded(ctx, () => box(ctx, -90, -20, 180, 92, 12), C.wood, { x: -90, y: -20, w: 180, h: 92 }, 0)
  ctx.fillStyle = 'rgba(80,46,20,0.5)'; ctx.fillRect(-86, 22, 172, 5)
  for (const s of [-1, 1]) for (const y of [0, 48]) disc(ctx, s * 76, y, 5, 5, C.woodDark)
  ctx.fillStyle = 'rgba(80,46,20,0.75)'; box(ctx, -30, -6, 60, 18, 9); ctx.fill()
})

/** The quilt's cloth over one half, hem at the top. Drawn cut off where it has been pulled to. */
export const CLOTH = sprite('cloth', -30, -10, 500, 600, (ctx, rng) => {
  const w = HALF.left.right - HALF.left.left + 34
  ctx.fillStyle = 'rgba(40,28,30,0.3)'; box(ctx, -14, 4, w, 586, 12); ctx.fill()
  ctx.fillStyle = C.quilt; box(ctx, -20, 0, w, 584, 14); ctx.fill()
  const cell = w / 4
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
    const x = -20 + i * cell, y = 64 + j * 104
    if ((i + j) % 2 === 0) { ctx.fillStyle = mix(C.quilt, C.quiltDark, 0.7); box(ctx, x + 4, y + 4, cell - 8, 96, 10); ctx.fill() }
    ctx.strokeStyle = C.quiltLight; ctx.lineWidth = 2.5; ctx.setLineDash([7, 7])
    box(ctx, x + 9, y + 9, cell - 18, 86, 8); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle = (i + j) % 2 ? C.star : C.flower
    ctx.beginPath()
    for (let k = 0; k <= 20; k++) { const a = (k / 20) * Math.PI * 2, r = 17 + 6 * Math.cos(a * 5 + i); ctx.lineTo(x + cell / 2 + Math.cos(a) * r, y + 52 + Math.sin(a) * r) }
    ctx.fill()
  }
  for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,255,255,${0.03 + rng.next() * 0.05})`; ctx.fillRect(-20 + rng.next() * w, rng.next() * 580, 3, 1.4) }
})
export const HEM = sprite('hem', -34, -16, 508, 84, (ctx) => {
  const w = HALF.left.right - HALF.left.left + 42
  ctx.fillStyle = 'rgba(40,28,30,0.28)'; box(ctx, -20, 8, w, QUILT.hemH, 22); ctx.fill()
  moulded(ctx, () => box(ctx, -26, -6, w, QUILT.hemH, 24), C.white, { x: -26, y: -6, w, h: QUILT.hemH * 2 }, 0)
  for (let i = 0; i < 9; i++) disc(ctx, i * 54, QUILT.hemH / 2 - 6, 8, 8, i % 2 ? C.flower : C.quiltLight)
})
export const ROLL = sprite('roll', -30, -14, 510, 104, (ctx) => {
  const w = HALF.left.right - HALF.left.left + 8
  ctx.fillStyle = 'rgba(40,28,30,0.35)'; box(ctx, 2, 10, w, QUILT.rollH, 34); ctx.fill()
  const g = ctx.createLinearGradient(0, 0, 0, QUILT.rollH)
  g.addColorStop(0, C.quiltLight); g.addColorStop(0.5, C.quilt); g.addColorStop(1, C.quiltDark)
  ctx.fillStyle = g; box(ctx, -4, 0, w, QUILT.rollH, 34); ctx.fill()
  ctx.strokeStyle = C.quiltLight; ctx.lineWidth = 2.5; ctx.setLineDash([7, 7])
  for (const x of [112, 226, 340]) { ctx.beginPath(); ctx.moveTo(x, 6); ctx.quadraticCurveTo(x + 10, 36, x, 68); ctx.stroke() }
  ctx.setLineDash([])
  moulded(ctx, () => { ctx.beginPath(); ctx.ellipse(w - 28, QUILT.rollH / 2, 22, 30, 0, 0, 7) }, C.white, { x: w - 50, y: 6, w: 44, h: 60 }, 0)
  ctx.strokeStyle = C.quilt; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(w - 28, QUILT.rollH / 2, 12, 17, 0, 0, 5); ctx.stroke()
})
export const BULGE = sprite('bulge', -110, -110, 220, 220, (ctx) => {
  const g = ctx.createRadialGradient(-28, -32, 6, 0, 0, 100)
  g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.45, 'rgba(255,255,255,0.1)'); g.addColorStop(0.8, 'rgba(25,25,70,0.4)'); g.addColorStop(1, 'rgba(25,25,70,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 100, 0, 7); ctx.fill()
})
/** Pile that lies the other way: the same dye, darker. */
export const NAP = sprite('nap', -46, -34, 92, 68, (ctx, rng) => {
  for (let i = 0; i < 90; i++) {
    const a = rng.next() * 7, r = Math.sqrt(rng.next())
    ctx.globalAlpha = 0.2 * (1 - r * 0.8)
    disc(ctx, Math.cos(a) * r * 40, Math.sin(a) * r * 28, 5, 2.6, '#2b1d1a', 0.9)
  }
})
export const FEATHER = sprite('feather', -10, -20, 20, 40, (ctx) => {
  moulded(ctx, () => { ctx.beginPath(); ctx.moveTo(0, 18); ctx.bezierCurveTo(-12, 4, -8, -14, 0, -18); ctx.bezierCurveTo(8, -14, 10, 4, 0, 18) }, C.white, { x: -8, y: -18, w: 16, h: 36 }, 0)
  ctx.strokeStyle = '#c9c2b0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 19); ctx.lineTo(0, -14); ctx.stroke()
})
export const PILLOW = sprite('pillow', -54, -40, 108, 80, (ctx) => {
  moulded(ctx, () => { ctx.beginPath(); ctx.moveTo(-48, -32); ctx.quadraticCurveTo(0, -24, 48, -32); ctx.quadraticCurveTo(40, 0, 48, 32); ctx.quadraticCurveTo(0, 24, -48, 32); ctx.quadraticCurveTo(-40, 0, -48, -32) }, C.white, { x: -48, y: -32, w: 96, h: 64 }, 0.3)
  ctx.fillStyle = C.pink; for (const x of [-24, 0, 24]) { ctx.beginPath(); ctx.arc(x, 0, 6, 0, 7); ctx.fill() }
})
export const BUBBLE = sprite('bubble', -26, -26, 52, 52, (ctx) => {
  ctx.globalAlpha = 0.5; disc(ctx, 0, 0, 22, 22, '#bfe6f2'); ctx.globalAlpha = 1
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.stroke()
  disc(ctx, -8, -9, 6, 4, '#ffffff', -0.7)
})
export const PUFF = sprite('puff', -24, -24, 48, 48, (ctx, rng) => {
  for (let i = 0; i < 16; i++) { const a = rng.next() * 7, r = rng.next() * 18; ctx.globalAlpha = 0.8; disc(ctx, Math.cos(a) * r, Math.sin(a) * r, 4, 1.8, i % 2 ? C.star : C.white, a) }
})
export const DROP = sprite('drop', -10, -14, 20, 28, (ctx) => {
  ctx.beginPath(); ctx.moveTo(0, -12); ctx.bezierCurveTo(10, 2, 8, 11, 0, 11); ctx.bezierCurveTo(-8, 11, -10, 2, 0, -12); ctx.fillStyle = C.milk; ctx.fill(); ctx.strokeStyle = '#c9bfa8'; ctx.lineWidth = 1.5; ctx.stroke()
})
export const HALO = sprite('halo', -70, -70, 140, 140, (ctx) => {
  const g = ctx.createRadialGradient(0, 0, 40, 0, 0, 68)
  g.addColorStop(0, 'rgba(255,250,220,0)'); g.addColorStop(0.6, 'rgba(255,250,220,0.95)'); g.addColorStop(1, 'rgba(255,250,220,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 68, 0, 7); ctx.fill()
})
export const GHOST = sprite('ghost', -40, -14, 80, 104, (ctx) => {
  const p = () => {
    ctx.beginPath()
    ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-9, -9, 0, -9); ctx.quadraticCurveTo(9, -9, 9, 0); ctx.lineTo(9, 32)
    ctx.quadraticCurveTo(17, 27, 20, 36); ctx.quadraticCurveTo(29, 33, 31, 44); ctx.quadraticCurveTo(38, 46, 35, 62)
    ctx.quadraticCurveTo(32, 84, 14, 86); ctx.lineTo(-6, 86); ctx.quadraticCurveTo(-16, 80, -24, 62); ctx.quadraticCurveTo(-38, 44, -28, 41); ctx.quadraticCurveTo(-20, 40, -9, 54); ctx.closePath()
  }
  p(); ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke()
})
export const PROP_SPRITES = [BOTTLE_BACK, BOTTLE_FRONT, TEAT, ...BAND, HEADBOARD, HOLE, MOUSE_HEAD, TONGUE, DOG_BODY, DOG_HEAD, DOG_EAR, DOG_LYING, CRATE_BOX, CLOTH, HEM, ROLL, BULGE, NAP, FEATHER, PILLOW, BUBBLE, PUFF, DROP, HALO, GHOST]
