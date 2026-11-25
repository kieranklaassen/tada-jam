import type { Pose } from './acts'
import { R } from './bed'
import { C, disc, mix, moulded, sprite, type Ctx, type Stamps } from './paint'

// A sheep is a hard ball with things stuck on it. Where each thing is comes
// from how the ball is turned, so a rolling one shows its face, its back and
// its face again.

type V3 = [number, number, number]
/** A turn, as a quaternion: w, x, y, z. x is right, y down, z towards the eye. */
export type Turn = [number, number, number, number]
export const FACING: Turn = [1, 0, 0, 0]

export const about = (x: number, y: number, z: number, a: number): Turn => {
  const s = Math.sin(a / 2)
  return [Math.cos(a / 2), x * s, y * s, z * s]
}
export function times(a: Turn, b: Turn): Turn {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ]
}
/** Rolled so far over the ground. */
export function rolled(q: Turn, dx: number, dy: number): Turn {
  const d = Math.hypot(dx, dy)
  if (d < 1e-6) return q
  // Moving right brings the near face to the right: about the axis across the way it goes.
  return unit(times(about(-dy / d, dx / d, 0, d / R), q))
}
export function unit(q: Turn): Turn {
  const n = Math.hypot(...q) || 1
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n]
}
/** Turned a share of the way back to face up. */
export function righted(q: Turn, k: number): Turn {
  const s = q[0] < 0 ? -1 : 1
  return unit([q[0] * s * (1 - k) + k, q[1] * s * (1 - k), q[2] * s * (1 - k), q[3] * s * (1 - k)])
}
export function turned(q: Turn, v: V3): V3 {
  const [w, x, y, z] = q
  const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0])
  return [v[0] + w * tx + y * tz - z * ty, v[1] + w * ty + z * tx - x * tz, v[2] + w * tz + x * ty - y * tx]
}
const at = (x: number, y: number): V3 => [x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))]

const SHADOW = sprite('shadow', -90, -50, 180, 100, (ctx) => {
  const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 44)
  g.addColorStop(0, 'rgba(50,30,20,0.55)')
  g.addColorStop(0.6, 'rgba(50,30,20,0.3)')
  g.addColorStop(1, 'rgba(50,30,20,0)')
  ctx.save()
  ctx.scale(2, 1)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, 44, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
})
const BALL = sprite('ball', -R - 4, -R - 4, R * 2 + 8, R * 2 + 8, (ctx) => {
  const g = ctx.createRadialGradient(-22, -28, 6, 0, 0, R)
  g.addColorStop(0, '#fffdf6')
  g.addColorStop(0.5, C.cream)
  g.addColorStop(0.82, C.creamShade)
  g.addColorStop(1, '#a98a63')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.fill()
})
/** The light never turns with the ball. */
const GLOSS = sprite('gloss', -R, -R, R * 2, R * 2, (ctx) => {
  ctx.globalAlpha = 0.75
  disc(ctx, -30, -40, 13, 6.5, '#ffffff', -0.7)
  ctx.globalAlpha = 0.5
  disc(ctx, -45, -24, 4, 3, '#ffffff', -0.9)
  ctx.globalAlpha = 0.28
  ctx.lineWidth = 4
  ctx.strokeStyle = '#ffe9c4'
  ctx.beginPath()
  ctx.arc(0, 0, R - 5, 0.35, 1.35)
  ctx.stroke()
})
const FACE = sprite('face', -50, -44, 100, 94, (ctx) => {
  const path = () => {
    ctx.beginPath()
    ctx.moveTo(0, -36)
    ctx.bezierCurveTo(34, -40, 48, -12, 38, 14)
    ctx.bezierCurveTo(32, 40, 16, 44, 0, 44)
    ctx.bezierCurveTo(-16, 44, -32, 40, -38, 14)
    ctx.bezierCurveTo(-48, -12, -34, -40, 0, -36)
    ctx.closePath()
  }
  moulded(ctx, path, C.face, { x: -44, y: -38, w: 88, h: 84 }, 0.18)
  disc(ctx, 0, 24, 27, 19, C.muzzle)
  disc(ctx, -9, 15, 3.4, 4.4, C.faceDark)
  disc(ctx, 9, 15, 3.4, 4.4, C.faceDark)
})

/** The thing each one wears, about the middle of where it sits; up is away from the face. */
export const GEAR = [
  sprite('cap', -54, -62, 124, 96, (ctx) => {
    const p = () => {
      ctx.beginPath()
      ctx.moveTo(-40, 14)
      ctx.bezierCurveTo(-38, -34, -10, -58, 24, -46)
      ctx.bezierCurveTo(44, -38, 54, -22, 54, -2)
      ctx.bezierCurveTo(46, -16, 36, -18, 38, 14)
      ctx.closePath()
    }
    moulded(ctx, p, C.blue, { x: -40, y: -58, w: 94, h: 76 }, 0.4)
    ctx.save(); p(); ctx.clip(); ctx.strokeStyle = mix(C.blue, '#ffffff', 0.5); ctx.lineWidth = 7
    for (let i = -1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-50, -10 - i * 22); ctx.bezierCurveTo(-10, -26 - i * 22, 20, -16 - i * 22, 60, 10 - i * 22); ctx.stroke() }
    ctx.restore()
    moulded(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 16, 46, 12, 0, 0, 7) }, C.white, { x: -46, y: 4, w: 92, h: 24 }, 0.4)
    moulded(ctx, () => { ctx.beginPath(); ctx.arc(54, 6, 13, 0, 7) }, C.white, { x: 41, y: -7, w: 26, h: 26 }, 0.5)
  }),
  sprite('curlers', -60, -44, 120, 76, (ctx) => {
    for (const [x, y, a] of [[-37, 4, -0.5], [37, 4, 0.5], [0, -12, 0]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a)
      moulded(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, 21, 15, 0, 0, 7) }, C.pink, { x: -21, y: -15, w: 42, h: 30 }, 0.6)
      ctx.strokeStyle = mix(C.pink, '#7a1f44', 0.5); ctx.lineWidth = 2.6
      for (const k of [-9, 0, 9]) { ctx.beginPath(); ctx.ellipse(k, 0, 3, 13, 0, 0, 7); ctx.stroke() }
      disc(ctx, 0, 0, 3.5, 3.5, C.white)
      ctx.restore()
    }
  }),
  sprite('tuft', -34, -40, 68, 60, (ctx) => {
    for (const [x, y, r] of [[-12, 4, 13], [12, 4, 13], [0, -10, 15]]) moulded(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7) }, C.yellow, { x: x - r, y: y - r, w: r * 2, h: r * 2 }, 0.5)
  }),
  sprite('maskUp', -56, -34, 112, 62, (ctx) => mask(ctx)),
  sprite('bobble', -54, -72, 108, 104, (ctx) => {
    const p = () => { ctx.beginPath(); ctx.moveTo(-44, 16); ctx.bezierCurveTo(-46, -36, -20, -48, 0, -48); ctx.bezierCurveTo(20, -48, 46, -36, 44, 16); ctx.closePath() }
    moulded(ctx, p, C.orange, { x: -44, y: -48, w: 88, h: 64 }, 0.4)
    ctx.save(); p(); ctx.clip(); ctx.strokeStyle = mix(C.orange, '#8a2d10', 0.45); ctx.lineWidth = 3
    for (const k of [-30, -15, 0, 15, 30]) { ctx.beginPath(); ctx.moveTo(k * 0.5, -50); ctx.quadraticCurveTo(k * 1.2, -20, k * 1.35, 20); ctx.stroke() }
    ctx.restore()
    moulded(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 15, 47, 13, 0, 0, 7) }, mix(C.orange, '#fff6dd', 0.45), { x: -47, y: 2, w: 94, h: 26 }, 0.4)
    moulded(ctx, () => { ctx.beginPath(); ctx.arc(0, -52, 17, 0, 7) }, mix(C.orange, '#fff6dd', 0.45), { x: -17, y: -69, w: 34, h: 34 }, 0.6)
  }),
] as const
function mask(ctx: Ctx): void {
  const p = () => { ctx.beginPath(); ctx.moveTo(-50, -12); ctx.bezierCurveTo(-30, -30, 30, -30, 50, -12); ctx.bezierCurveTo(54, 14, 26, 28, 7, 12); ctx.quadraticCurveTo(0, 6, -7, 12); ctx.bezierCurveTo(-26, 28, -54, 14, -50, -12); ctx.closePath() }
  moulded(ctx, p, C.green, { x: -52, y: -28, w: 104, h: 54 }, 0.4)
  ctx.strokeStyle = mix(C.green, '#ffffff', 0.75); ctx.lineWidth = 3.4; ctx.lineCap = 'round'
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.arc(s * 25, -6, 13, 0.3, Math.PI - 0.3); ctx.stroke()
    for (const k of [0.6, 1.57, 2.5]) { ctx.beginPath(); ctx.moveTo(s * 25 + Math.cos(k) * 13, -6 + Math.sin(k) * 13); ctx.lineTo(s * 25 + Math.cos(k) * 20, -6 + Math.sin(k) * 20); ctx.stroke() }
  }
}
export const MASK = sprite('mask', -56, -34, 112, 66, mask)
export const DUMMY = sprite('dummy', -32, -28, 64, 60, (ctx) => {
  moulded(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, 25, 17, 0, 0, 7) }, C.yellow, { x: -25, y: -17, w: 50, h: 34 }, 0.6)
  ctx.lineWidth = 5; ctx.strokeStyle = mix(C.yellow, '#8a5a00', 0.35)
  ctx.beginPath(); ctx.arc(0, 11, 13, -0.1, Math.PI + 0.1); ctx.stroke()
  moulded(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7) }, C.white, { x: -8, y: -8, w: 16, h: 16 }, 0.6)
})
export const SHEEP_SPRITES = [SHADOW, BALL, GLOSS, FACE, ...GEAR, MASK, DUMMY]

const CURLS: V3[] = [at(-0.72, 0.1), at(0.72, 0.12), at(-0.5, 0.74), at(0.5, 0.74), at(0, 0.9), [-0.5, -0.6, -0.62], [0.5, -0.6, -0.62], [0, 0, -1], [-0.7, 0.3, -0.64], [0.7, 0.3, -0.64], [0, 0.7, -0.7]]
const FEET: V3[] = [[-0.86, 0.46, 0.2], [0.86, 0.46, 0.2], [-0.48, 0.86, 0.16], [0.48, 0.86, 0.16]]
const EARS: V3[] = [[-0.84, -0.36, 0.42], [0.84, -0.36, 0.42]]
const GEAR_AT: V3[] = [[0, -0.84, 0.54], [0, -0.78, 0.62], [0, -0.82, 0.57], [0, -0.56, 0.83], [0, -0.84, 0.54]]

export type Look = {
  /** Where the eyes look, each way from -1 to 1. */
  gaze: { x: number; y: number }
  blink: boolean
  /** Asleep: lids down, and the mask down for the one who has it. */
  asleep: boolean
  thirsty: boolean
  drinking: number
  /** The dummy or the mask is away, in an act. */
  bare: boolean
  squash: number
  /** Has drunk: the mouth is content and the brows are down. */
  fed: boolean
  time: number
}

/** A flat thing stuck on the ball: the drawing plane tilts with the ball there. */
function stuck(ctx: Ctx, q: Turn, n: V3, out: number, draw: () => void): void {
  const p = turned(q, n)
  // The thing's own right and down, along the ball.
  let ux: V3 = [n[2], 0, -n[0]]
  const l = Math.hypot(...ux) || 1
  ux = [ux[0] / l, ux[1] / l, ux[2] / l]
  const dn: V3 = [n[1] * ux[2] - n[2] * ux[1], n[2] * ux[0] - n[0] * ux[2], n[0] * ux[1] - n[1] * ux[0]]
  const a = turned(q, ux), b = turned(q, dn)
  ctx.save()
  ctx.transform(a[0], a[1], b[0], b[1], p[0] * R * out, p[1] * R * out)
  draw()
  ctx.restore()
}

export function shadow(ctx: Ctx, st: Stamps, x: number, y: number, lift: number): void {
  const k = 1 - Math.min(0.45, lift / 500)
  ctx.globalAlpha = 1 - Math.min(0.5, lift / 400)
  st.stampAt(ctx, SHADOW, x + 8 + lift * 0.12, y + 46 + lift * 0.2, 0, k)
  ctx.globalAlpha = 1
}

export function sheep(ctx: Ctx, st: Stamps, who: number, x: number, y: number, turn: Turn, p: Pose, l: Look): void {
  const q = times(times(about(1, 0, 0, p.tipX), about(0, 1, 0, p.tipY)), times(about(0, 0, 1, p.spin), turn))
  const wide = p.wide * (1 + l.squash * 0.16), tall = (1 / p.wide) * (1 - l.squash * 0.2)
  const big = 1 + p.lift / 900
  ctx.save()
  ctx.translate(x, y - p.lift)
  ctx.scale(big * wide, big * tall)
  knobs(ctx, q, p.feet, -1)
  const gearZ = turned(q, GEAR_AT[who])[2]
  const masked = who === 3 && (l.asleep || p.eyes === 'shut') && !l.bare
  const gear = () => {
    if (who === 3) { if (!l.bare && !masked) stuck(ctx, q, GEAR_AT[3], 1.0, () => { ctx.scale(0.86, 0.86); ctx.translate(0, -14); st.stamp(ctx, GEAR[3]) }) }
    else stuck(ctx, q, GEAR_AT[who], 1.02, () => { if (gearZ > 0.1 && gearZ < 0.75) ctx.scale(1, 0.75 / Math.max(0.5, gearZ)); st.stamp(ctx, GEAR[who]) })
  }
  if (gearZ < 0) gear()
  st.stamp(ctx, BALL)
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.clip()
  curls(ctx, q)
  const f: V3 = [0, 0.02, 1]
  if (turned(q, f)[2] > -0.05) stuck(ctx, q, f, 0.98, () => faceOn(ctx, st, who, p, l, masked))
  ctx.restore()
  knobs(ctx, q, p.feet, 1)
  st.stamp(ctx, GLOSS)
  if (gearZ >= 0) gear()
  if (masked && turned(q, f)[2] > 0.1) stuck(ctx, q, [0, -0.16, 0.98], 1.0, () => { ctx.scale(0.9, 0.9); st.stamp(ctx, MASK) })
  if (turned(q, f)[2] > 0.2) stuck(ctx, q, [0, 0.36, 0.93], 1.0, () => front(ctx, st, who, p, l))
  ctx.restore()
}

function curls(ctx: Ctx, q: Turn): void {
  ctx.strokeStyle = C.creamShade
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  for (const n of CURLS) {
    if (turned(q, n)[2] < 0.05) continue
    stuck(ctx, q, n, 0.97, () => {
      ctx.beginPath()
      ctx.arc(0, 0, 11, 0.4, 5.2)
      ctx.moveTo(4.5, 0)
      ctx.arc(0, 0, 4.5, 0, 3.6)
      ctx.stroke()
    })
  }
}

/** Feet and ears: pegs that stand out of the ball, on the near side or the far one. */
function knobs(ctx: Ctx, q: Turn, feet: number, near: 1 | -1): void {
  for (const n of FEET) {
    const p = turned(q, n)
    if (Math.sign(p[2] - 0.25) !== near) continue
    const k = 1.0 + feet * 0.16
    disc(ctx, p[0] * R * k, p[1] * R * k, 15, 15, C.faceDark)
    disc(ctx, p[0] * R * (k + 0.02) - 2, p[1] * R * (k + 0.02) - 3, 11.5, 11, C.face)
  }
  for (const n of EARS) {
    const p = turned(q, n)
    if (Math.sign(p[2] + 0.1) !== near) continue
    const a = Math.atan2(p[1], p[0])
    disc(ctx, p[0] * R * 1.14, p[1] * R * 1.14 + 5, 21, 11, C.faceDark, a + (p[0] > 0 ? 0.25 : -0.25))
    disc(ctx, p[0] * R * 1.14 - 1, p[1] * R * 1.14 + 3, 17, 7.5, mix(C.muzzle, C.tongue, 0.3), a + (p[0] > 0 ? 0.25 : -0.25))
  }
}

function faceOn(ctx: Ctx, st: Stamps, who: number, p: Pose, l: Look, masked: boolean): void {
  st.stamp(ctx, FACE)
  if (!masked) eyes(ctx, who, p, l)
}

/** Each has a pair of its own: how big, how far apart. */
const EYES = [[14, 15, 17], [12, 12, 15], [17, 17, 19], [13, 14, 17], [17, 13, 18]] as const
function eyes(ctx: Ctx, who: number, p: Pose, l: Look): void {
  const [rl, rr, dx] = EYES[who]
  const kind = l.asleep ? 'shut' : p.eyes
  for (const s of [-1, 1]) {
    const r = (s < 0 ? rl : rr) * (kind === 'wide' ? 1.22 : 1), x = s * dx, y = -10
    if (kind === 'shut' || kind === 'squint' || (l.blink && kind === 'open')) {
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 4.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      if (kind === 'squint') ctx.arc(x, y + 5, r * 0.75, Math.PI + 0.35, -0.35)
      else ctx.arc(x, y - 3, r * 0.75, 0.35, Math.PI - 0.35)
      ctx.stroke()
      continue
    }
    disc(ctx, x, y, r, r * 1.05, C.white)
    if (kind === 'dizzy') {
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 2.6
      ctx.beginPath()
      for (let k = 0; k < 14; k++) ctx.lineTo(x + Math.cos(k * 0.9 + l.time * 9 * s) * k * r * 0.066, y + Math.sin(k * 0.9 + l.time * 9 * s) * k * r * 0.066)
      ctx.stroke()
      continue
    }
    const pr = r * (kind === 'wide' ? 0.36 : 0.52)
    disc(ctx, x + l.gaze.x * (r - pr - 1), y + l.gaze.y * (r - pr - 1), pr, pr, C.ink)
    disc(ctx, x + l.gaze.x * (r - pr - 1) - pr * 0.35, y + l.gaze.y * (r - pr - 1) - pr * 0.4, pr * 0.32, pr * 0.32, C.white)
    // Tup's lids are always half down; Curl's brows are always cross.
    if (who === 0 && kind === 'open') { ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, r + 1, r * 1.1, 0, Math.PI, 0); ctx.fillStyle = C.faceDark; ctx.fill(); ctx.restore() }
    if (who === 1 && !l.fed) { ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - s * 10, y - r - 1); ctx.lineTo(x + s * 11, y - r - 7); ctx.stroke() }
  }
}

/** The mouth, and what is in it. */
function front(ctx: Ctx, st: Stamps, who: number, p: Pose, l: Look): void {
  const open = Math.max(p.mouth, l.thirsty ? 0.75 + 0.15 * Math.sin(l.time * 5) : 0)
  const sucking = l.drinking > 0
  if (who === 2 && !l.bare && !sucking && !l.thirsty && open < 0.3) {
    const suck = 1 + 0.05 * Math.sin(l.time * 5)
    st.stampAt(ctx, DUMMY, 0, 2, 0, 0.82 * suck)
    return
  }
  if (sucking) {
    disc(ctx, 0, 4, 6.5, 6.5 + Math.sin(l.time * 14) * 1.2, C.ink)
    return
  }
  if (open > 0.05) {
    const w = 10 + open * 7, h = 4 + open * 14
    disc(ctx, 0, 4 + open * 3, w, h, C.ink)
    if (open > 0.3) disc(ctx, 0, 5 + open * 9, w * 0.62, h * 0.4, C.tongue)
    if (who === 4 || who === 0) { ctx.fillStyle = C.white; ctx.fillRect(-6, 4 + open * 3 - h, 5.5, 6); if (who === 4) ctx.fillRect(1, 4 + open * 3 - h, 5.5, 6) }
    return
  }
  ctx.strokeStyle = C.faceDark
  ctx.lineWidth = 3.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (l.fed) ctx.arc(0, -6, 17, 0.35, Math.PI - 0.35)
  else if (who === 1) { ctx.moveTo(-9, 6); ctx.lineTo(9, 6) }
  else if (who === 4) ctx.arc(0, -4, 14, 0.4, Math.PI - 0.4)
  else ctx.arc(0, -2, 10, 0.6, Math.PI - 0.6)
  ctx.stroke()
}
