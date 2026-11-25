import type { ThingId } from './layout'
import { BAKED, BISCUIT, CHOC, DARK, GOLD, GREEN, ICING, PALE, RED, SHADE, biscuit, blob, dot, ell, line, middle, pipe, poly, rounded, sprite, sweet, type Ctx, type PathOf, type Sprite } from './paint'

// The pictures. A thing is a biscuit about its own middle, outlined in icing
// so that it reads on white snow and on bare biscuit alike.

type P = Parameters<Sprite['paint']>
/** A biscuit with a piped outline just inside its edge. */
const iced = (ctx: Ctx, rng: P[1], path: PathOf, color = BISCUIT): void => {
  biscuit(ctx, rng, path, 70, color)
  ctx.save(); ctx.beginPath(); path(ctx); ctx.clip()
  ctx.restore()
  pipe(ctx, path, 4)
}
const eye = (ctx: Ctx, x: number, y: number, r: number): void => dot(ctx, x, y, r)

export const THING: Record<ThingId, Sprite> = {
  boot: middle('boot', 60, (c, r) => {
    const p: PathOf = (k) => { k.moveTo(-26, -38); k.lineTo(8, -38); k.lineTo(8, 4); k.quadraticCurveTo(42, 6, 42, 26); k.quadraticCurveTo(42, 38, 30, 38); k.lineTo(-24, 38); k.quadraticCurveTo(-32, 0, -26, -38) }
    iced(c, r, p, '#a6572b')
    pipe(c, line(-25, -26, 8, -26), 9, RED)
    pipe(c, line(-22, 28, 38, 28), 5)
    for (const y of [-12, 0]) { pipe(c, line(-6, y, 8, y), 3.5); dot(c, -8, y, 3.5, GOLD) }
  }),
  wheel: middle('wheel', 60, (c, r) => {
    iced(c, r, ell(0, 0, 42), '#a6602f')
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 4; pipe(c, line(Math.cos(a) * -34, Math.sin(a) * -34, Math.cos(a) * 34, Math.sin(a) * 34), 5) }
    pipe(c, ell(0, 0, 32), 4)
    dot(c, 0, 0, 12, RED)
  }),
  cat: middle('cat', 70, (c, r) => {
    pipe(c, (k) => { k.moveTo(34, 30); k.bezierCurveTo(64, 26, 58, -8, 44, -16) }, 17, DARK)
    pipe(c, (k) => { k.moveTo(34, 30); k.bezierCurveTo(64, 26, 58, -8, 44, -16) }, 11, '#8f5229')
    iced(c, r, blob(-28, 42, -38, 18, -22, -2, 10, -4, 38, 10, 42, 36, 20, 46), '#8f5229')
    iced(c, r, (k) => { k.moveTo(-38, -6); k.lineTo(-40, -44); k.lineTo(-20, -30); k.quadraticCurveTo(-4, -34, 10, -30); k.lineTo(30, -44); k.lineTo(28, -6); k.quadraticCurveTo(22, 16, -5, 16); k.quadraticCurveTo(-32, 16, -38, -6) }, '#8f5229')
    eye(c, -19, -11, 10); eye(c, 9, -11, 10)
    dot(c, -5, 0, 4, RED)
    pipe(c, (k) => { k.moveTo(-14, 10); k.quadraticCurveTo(-5, 3, 4, 10) }, 3)
    for (const s of [-1, 1]) pipe(c, line(-5 + s * 16, 3, -5 + s * 40, s * 2 - 1), 2)
    for (const x of [4, 18]) pipe(c, line(x, 14, x + 4, 24), 4)
  }),
  tuba: middle('tuba', 66, (c, r) => {
    iced(c, r, (k) => { k.moveTo(-48, -48); k.quadraticCurveTo(-12, -34, 34, -48); k.quadraticCurveTo(8, -30, 8, -4); k.quadraticCurveTo(38, 2, 36, 26); k.quadraticCurveTo(30, 48, -2, 46); k.quadraticCurveTo(-36, 44, -34, 12); k.quadraticCurveTo(-26, -30, -48, -48) }, '#c98a3f')
    sweet(c, ell(-8, -46, 38, 8, 0.0), '#6b2f17')
    pipe(c, ell(-8, -46, 38, 8), 4)
    pipe(c, ell(2, 22, 15, 11), 5)
    for (const x of [-14, -2, 10]) dot(c, x - 4, -10, 5, GOLD)
    pipe(c, (k) => { k.moveTo(32, 20); k.quadraticCurveTo(54, 8, 48, -14) }, 7, PALE)
    dot(c, 48, -16, 6)
  }),
  rake: middle('rake', 70, (c, r) => {
    iced(c, r, rounded(-6, -24, 12, 80, 6), '#a6602f')
    iced(c, r, rounded(-40, -34, 80, 15, 7), '#b5662d')
    for (const x of [-34, -17, 0, 17, 34]) pipe(c, line(x, -32, x, -56), 7, ICING)
    for (const y of [2, 18, 34]) pipe(c, line(-5, y + 5, 5, y - 5), 4, RED)
  }),
  umbrella: middle('umbrella', 66, (c, r) => {
    pipe(c, (k) => { k.moveTo(0, -10); k.lineTo(0, 38); k.quadraticCurveTo(0, 52, 13, 51); k.quadraticCurveTo(22, 49, 20, 38) }, 8, BAKED)
    iced(c, r, (k) => { k.moveTo(-50, 0); k.quadraticCurveTo(-46, -46, 0, -48); k.quadraticCurveTo(46, -46, 50, 0); k.quadraticCurveTo(34, -12, 18, 0); k.quadraticCurveTo(0, -12, -18, 0); k.quadraticCurveTo(-34, -12, -50, 0) }, '#b0442c')
    pipe(c, (k) => { k.moveTo(-18, -2); k.quadraticCurveTo(-18, -34, 0, -46); k.quadraticCurveTo(18, -34, 18, -2) }, 4)
    dot(c, 0, -52, 5, GOLD)
    for (const x of [-34, 0, 34]) dot(c, x, -18, 4)
  }),
  goose: middle('goose', 72, (c, r) => {
    for (const x of [-2, 18]) pipe(c, line(x, 34, x, 50, x - 12, 50), 6, GOLD)
    iced(c, r, blob(-34, 8, -14, -8, 26, -8, 58, -20, 50, 24, 24, 42, -16, 40, -38, 28), PALE)
    iced(c, r, (k) => { k.moveTo(-36, 14); k.quadraticCurveTo(-32, -20, -40, -34); k.quadraticCurveTo(-42, -56, -24, -58); k.quadraticCurveTo(-6, -56, -10, -36); k.quadraticCurveTo(-12, -14, -8, 6); k.quadraticCurveTo(-20, 22, -36, 14) }, PALE)
    pipe(c, poly(-36, -44, -60, -38, -36, -36), 5, GOLD)
    eye(c, -23, -45, 8)
    pipe(c, (k) => { k.moveTo(2, 8); k.quadraticCurveTo(22, 26, 44, 4); k.moveTo(10, 20); k.quadraticCurveTo(24, 32, 38, 18) }, 4.5)
    pipe(c, line(-30, -10, -10, -8), 6, RED)
  }),
  spring: middle('spring', 60, (c, r) => {
    const zig: PathOf = (k) => { k.moveTo(-26, 34); for (let i = 0; i < 4; i++) { k.bezierCurveTo(48, 34 - i * 17, 48, 22 - i * 17, 0, 24 - i * 17); k.bezierCurveTo(-44, 26 - i * 17, -44, 14 - i * 17, -20, 17 - i * 17) } }
    pipe(c, zig, 13, CHOC); pipe(c, zig, 8, GOLD)
    iced(c, r, rounded(-36, 30, 72, 13, 6)); iced(c, r, rounded(-36, -46, 72, 13, 6))
  }),
}

/** Where the pupils of those with eyes go, about the thing's middle. */
export const EYES: Partial<Record<ThingId, { at: readonly (readonly [number, number])[]; r: number }>> = { cat: { at: [[-19, -11], [9, -11]], r: 5 }, goose: { at: [[-23, -45]], r: 4 } }

export const SNOWBALL = 100
/** The turning part: icing with a swirl. */
export const ball = middle('ball', 104, (c, r) => {
  c.fillStyle = ICING
  c.beginPath(); c.arc(0, 0, 100, 0, 7); c.fill()
  c.save(); c.beginPath(); c.arc(0, 0, 99, 0, 7); c.clip()
  c.strokeStyle = SHADE; c.lineCap = 'round'
  const swirl = (o: number) => { c.beginPath(); for (let a = 0; a < 15; a += 0.2) { const q = 8 + a * 6.1 + o; c.lineTo(Math.cos(a) * q, Math.sin(a) * q) } c.stroke() }
  c.lineWidth = 6; swirl(3)
  c.strokeStyle = '#ffffff'; c.lineWidth = 4; swirl(-2)
  for (let i = 0; i < 9; i++) { const a = r.next() * 7, q = 30 + r.next() * 62; c.fillStyle = i % 2 ? '#d9b98f' : SHADE; c.beginPath(); c.arc(Math.cos(a) * q, Math.sin(a) * q, 2 + r.next() * 2.5, 0, 7); c.fill() }
  c.restore()
})
/** The light on it, which does not turn. */
export const gloss = middle('gloss', 106, (c) => {
  const g = c.createRadialGradient(-34, -42, 16, 0, 0, 102)
  g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(0.78, 'rgba(150,104,66,0.1)'); g.addColorStop(1, 'rgba(120,70,36,0.42)')
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 100, 0, 7); c.fill()
  c.strokeStyle = 'rgba(112,64,30,0.75)'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 100, 0, 7); c.stroke()
})
export const shadow = middle('shadow', 100, (c) => { c.save(); c.scale(1, 0.3); const g = c.createRadialGradient(0, 0, 30, 0, 0, 98); g.addColorStop(0, 'rgba(92,50,24,0.42)'); g.addColorStop(1, 'rgba(92,50,24,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 98, 0, 7); c.fill(); c.restore() })
export const halo = middle('halo', 110, (c) => { const g = c.createRadialGradient(0, 0, 60, 0, 0, 108); g.addColorStop(0, 'rgba(255,176,40,0.95)'); g.addColorStop(0.55, 'rgba(255,166,30,0.6)'); g.addColorStop(1, 'rgba(255,160,20,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 108, 0, 7); c.fill() })
export const heap = sprite('heap', -170, -130, 340, 170, (c) => {
  const p = blob(-158, 14, -150, -22, -104, -44, -70, -84, -20, -92, 26, -108, 66, -78, 106, -52, 150, -24, 158, 14, 60, 30, -60, 30)
  c.fillStyle = ICING; c.beginPath(); p(c); c.fill()
  c.save(); c.beginPath(); p(c); c.clip()
  c.strokeStyle = SHADE; c.lineWidth = 7; c.lineCap = 'round'
  for (const q of [[-100, -20, -60, -50, -20, -40], [10, -60, 50, -50, 74, -24], [-40, 4, 10, -10, 60, 6], [90, -6, 110, -20, 130, -4]]) { c.beginPath(); c.moveTo(q[0], q[1]); c.quadraticCurveTo(q[2], q[3], q[4], q[5]); c.stroke() }
  const g = c.createLinearGradient(0, -20, 0, 34); g.addColorStop(0, 'rgba(120,70,36,0)'); g.addColorStop(1, 'rgba(120,70,36,0.35)'); c.fillStyle = g; c.fillRect(-170, -130, 340, 170)
  c.restore()
  c.strokeStyle = 'rgba(112,64,30,0.45)'; c.lineWidth = 3; c.beginPath(); p(c); c.stroke()
})
export const hat = sprite('hat', -70, -96, 140, 120, (c, r) => {
  iced(c, r, rounded(-38, -82, 76, 80, 9), '#5d3018')
  iced(c, r, rounded(-60, -12, 120, 22, 10), '#5d3018')
  pipe(c, line(-37, -22, 37, -22), 13, RED)
  for (const x of [-24, -8, 8, 24]) dot(c, x, -22, 3.5)
})
export const mitt = middle('mitt', 36, (c, r) => { iced(c, r, (k) => { k.moveTo(-22, 8); k.quadraticCurveTo(-26, -24, 2, -24); k.quadraticCurveTo(26, -24, 24, 4); k.quadraticCurveTo(22, 24, 0, 24); k.quadraticCurveTo(-18, 24, -22, 8) }, RED); iced(c, r, ell(-23, 4, 10, 8, 0.6), RED) })
export const eyeball = middle('eyeball', 26, (c) => { c.fillStyle = ICING; c.strokeStyle = CHOC; c.lineWidth = 3.5; c.beginPath(); c.arc(0, 0, 21, 0, 7); c.fill(); c.stroke() })
export const robinBody = middle('robin', 40, (c, r) => {
  for (const x of [-5, 7]) pipe(c, line(x, 20, x, 33, x - 7, 33), 3.5, GOLD)
  iced(c, r, blob(-28, -4, -14, -26, 12, -24, 24, -4, 40, -8, 26, 20, 0, 26, -22, 18), '#8f5229')
  c.fillStyle = RED; c.beginPath(); c.ellipse(-12, 8, 15, 13, 0, 0, 7); c.fill()
  pipe(c, poly(-26, -10, -38, -5, -26, -2), 3, GOLD)
  dot(c, -14, -10, 7); dot(c, -16, -10, 3.4, CHOC)
  pipe(c, (k) => { k.moveTo(6, 2); k.quadraticCurveTo(14, 14, 24, 2) }, 3.5)
})
export const button = middle('button', 14, (c) => { dot(c, 0, 0, 10, GREEN); dot(c, -3, 0, 1.8, ICING); dot(c, 3, 0, 1.8, ICING) })
export const hand = sprite('hand', -20, -14, 80, 100, (c) => {
  const p: PathOf = (k) => { k.moveTo(-9, 4); k.quadraticCurveTo(-9, -9, 0, -9); k.quadraticCurveTo(9, -9, 9, 4); k.lineTo(9, 28); k.quadraticCurveTo(48, 28, 46, 46); k.quadraticCurveTo(44, 78, 26, 78); k.lineTo(8, 78); k.quadraticCurveTo(-8, 66, -16, 46); k.quadraticCurveTo(-18, 36, -9, 40); k.closePath() }
  c.fillStyle = '#fff'; c.strokeStyle = CHOC; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath(); p(c); c.stroke(); c.fill()
})
export const ALL: readonly Sprite[] = [...Object.values(THING), ball, gloss, shadow, halo, heap, hat, mitt, eyeball, robinBody, button, hand]
