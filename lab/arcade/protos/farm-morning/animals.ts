// Farm Morning: the animals. Each is drawn from a pose, so the play decides
// how it feels and this file decides how it looks. Faces are simple and calm.

import { TAU, clamp, lerp } from '../../kit/math.ts'
import { css, mix, seeded, shade, smooth } from './art.ts'
import type { Pt, RGB } from './art.ts'

type G = CanvasRenderingContext2D

// ---------------------------------------------------------------------------
// Hens

export interface HenLook {
  body: RGB
  wing: RGB
  tail: RGB
  size: number
  speckled: boolean
}

export const HEN_LOOKS: readonly HenLook[] = [
  { body: [182, 92, 52], wing: [150, 70, 40], tail: [98, 58, 46], size: 1.12, speckled: false },
  { body: [246, 236, 212], wing: [228, 210, 176], tail: [214, 192, 152], size: 1.22, speckled: false },
  { body: [118, 120, 130], wing: [92, 94, 106], tail: [70, 72, 84], size: 0.98, speckled: true },
]

export interface HenPose {
  x: number
  y: number
  dir: number
  look: HenLook
  // Extra scale (smaller up on the ramp).
  scale: number
  // Leg phase and how much the legs are stepping (0 standing, 1 walking).
  walk: number
  stride: number
  // 0..1 through one peck.
  peck: number
  // Pixels off the ground.
  hop: number
  // 1 is normal; above 1 is fluffed up.
  puff: number
  // 0..1 wing lifted.
  flap: number
  // 0..1 settled on the ground.
  sit: number
  // 0..1 head turned back to preen.
  preen: number
  // Small head tilt in radians.
  tilt: number
  blink: number
  alpha: number
}

export function drawHen(g: G, h: HenPose): void {
  const k = h.look
  const s = k.size * h.scale
  g.save()
  g.globalAlpha = h.alpha
  g.translate(h.x, h.y)
  g.fillStyle = 'rgba(52,58,30,0.16)'
  g.beginPath()
  g.ellipse(0, 1, 27 * s * (1 - h.hop / 120), 6 * s, 0, 0, TAU)
  g.fill()
  g.translate(0, -h.hop)
  g.scale(h.dir * s, s)

  // Legs.
  if (h.sit < 0.85) {
    g.strokeStyle = '#d99a3a'
    g.lineWidth = 3.2
    for (const side of [-1, 1]) {
      const ph = h.walk + (side > 0 ? Math.PI : 0)
      const fx = side * 4 + Math.sin(ph) * 9 * h.stride
      const lift = Math.max(0, Math.cos(ph)) * 7 * h.stride
      g.beginPath()
      g.moveTo(side * 4 - 2, -18 + h.sit * 12)
      g.lineTo(fx, -lift - 1)
      g.moveTo(fx - 5, -lift)
      g.lineTo(fx + 9, -lift)
      g.moveTo(fx, -lift - 1)
      g.lineTo(fx + 7, -lift - 4)
      g.stroke()
    }
  }
  g.translate(0, h.sit * 13)

  // The whole bird tips forward to peck.
  const pitch = Math.sin(clamp(h.peck, 0, 1) * Math.PI) * 0.82
  g.translate(2, -20)
  g.rotate(pitch)
  g.translate(-2, 20)
  const pf = h.puff

  // Tail.
  g.fillStyle = css(k.tail)
  g.beginPath()
  g.moveTo(-18, -40)
  g.quadraticCurveTo(-34, -60, -42 - pitch * 4, -70)
  g.quadraticCurveTo(-48, -58, -50, -46)
  g.quadraticCurveTo(-40, -36, -26, -24)
  g.closePath()
  g.fill()

  // Body.
  g.save()
  g.translate(-2, -32)
  g.scale(pf, pf)
  g.translate(2, 32)
  g.fillStyle = css(k.body)
  g.beginPath()
  g.moveTo(25, -40)
  g.bezierCurveTo(24, -12, -20, -6, -30, -28)
  g.bezierCurveTo(-36, -50, -12, -58, 4, -55)
  g.bezierCurveTo(14, -58, 24, -52, 25, -40)
  g.fill()
  // Soft belly shade.
  g.fillStyle = css(shade(k.body, -0.22), 0.4)
  g.beginPath()
  g.ellipse(-2, -18, 20, 7, 0.1, 0, TAU)
  g.fill()
  if (k.speckled) {
    g.fillStyle = 'rgba(248,246,240,0.85)'
    const dots: Pt[] = [[-18, -40], [-8, -46], [4, -42], [14, -34], [-22, -28], [-10, -22], [4, -20], [16, -24], [-2, -50], [10, -48]]
    for (const [dx, dy] of dots) {
      g.beginPath()
      g.arc(dx, dy, 1.9, 0, TAU)
      g.fill()
    }
  }
  // Wing.
  g.save()
  g.translate(4, -36)
  g.rotate(0.22 - h.flap * 1.1)
  g.fillStyle = css(k.wing)
  g.beginPath()
  g.moveTo(8, -4)
  g.bezierCurveTo(2, -14, -22, -12, -26 - h.flap * 6, 2)
  g.bezierCurveTo(-18, 12, 2, 10, 8, -4)
  g.fill()
  g.strokeStyle = css(shade(k.wing, -0.25), 0.55)
  g.lineWidth = 1.3
  g.beginPath()
  g.moveTo(-20, 2)
  g.quadraticCurveTo(-10, 4, -2, 0)
  g.moveTo(-16, 6)
  g.quadraticCurveTo(-8, 7, -1, 3)
  g.stroke()
  g.restore()
  g.restore()

  // Neck and head. Preening turns the head back over the wing.
  const hx = lerp(22, 0, h.preen)
  const hy = lerp(-60, -52, h.preen) - (pf - 1) * 12
  g.strokeStyle = css(k.body)
  g.lineWidth = 17
  g.beginPath()
  g.moveTo(13, -42)
  g.lineTo(hx - 3, hy + 6)
  g.stroke()
  g.save()
  g.translate(hx, hy)
  g.rotate(h.tilt + h.preen * 0.3)
  g.scale(lerp(1, -1, h.preen), 1)
  // Comb.
  g.fillStyle = '#cf4a3c'
  g.beginPath()
  g.arc(-3, -10, 4.2, 0, TAU)
  g.arc(3, -12, 4.6, 0, TAU)
  g.arc(8, -9, 3.6, 0, TAU)
  g.fill()
  // Wattle.
  g.beginPath()
  g.ellipse(9, 9, 3.2, 4.6, 0.2, 0, TAU)
  g.fill()
  // Head.
  g.fillStyle = css(k.body)
  g.beginPath()
  g.arc(0, 0, 11.5, 0, TAU)
  g.fill()
  // Beak.
  g.fillStyle = '#e3a334'
  g.beginPath()
  g.moveTo(9, -3)
  g.lineTo(21, 2)
  g.lineTo(9, 6)
  g.closePath()
  g.fill()
  // Eye.
  if (h.blink > 0.5) {
    g.strokeStyle = '#33241c'
    g.lineWidth = 1.8
    g.beginPath()
    g.moveTo(1, -2)
    g.lineTo(7, -2)
    g.stroke()
  } else {
    g.fillStyle = '#33241c'
    g.beginPath()
    g.arc(4, -2.5, 2.5, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.85)'
    g.beginPath()
    g.arc(4.8, -3.4, 0.9, 0, TAU)
    g.fill()
  }
  g.restore()
  g.restore()
}

// Where the beak reaches at the bottom of a peck, relative to the feet.
export function henReach(look: HenLook): number {
  return 34 * look.size
}

// ---------------------------------------------------------------------------
// Pony (faces left; origin on the ground under the middle of the body)

export const PONY_DUST = { x: -156, y: -266, w: 324, h: 190 }

const PONY_BODY: readonly Pt[] = [
  [-128, -198],
  [-100, -246],
  [-40, -238],
  [30, -234],
  [98, -250],
  [146, -216],
  [152, -160],
  [114, -100],
  [20, -86],
  [-70, -92],
  [-126, -122],
  [-140, -164],
]

export function ponyBodyPath(g: G): void {
  g.beginPath()
  smooth(g, PONY_BODY)
}

const COAT: RGB = [190, 118, 62]
const COAT_DARK: RGB = [146, 86, 44]
const MANE: RGB = [244, 226, 180]

// The dusty coat, painted onto its own layer so brushing can rub it away.
export function paintDust(g: G, seed: number): void {
  const r = seeded(seed)
  g.save()
  g.translate(-PONY_DUST.x, -PONY_DUST.y)
  ponyBodyPath(g)
  g.clip()
  g.fillStyle = 'rgba(216,203,176,0.58)'
  g.fillRect(PONY_DUST.x, PONY_DUST.y, PONY_DUST.w, PONY_DUST.h)
  // Paler drifts of dust and a few duller ones.
  for (let i = 0; i < 20; i++) {
    const x = PONY_DUST.x + r() * PONY_DUST.w
    const y = PONY_DUST.y + r() * PONY_DUST.h
    g.fillStyle = r() > 0.4 ? 'rgba(236,228,206,0.34)' : 'rgba(176,156,128,0.22)'
    g.beginPath()
    g.ellipse(x, y, 18 + r() * 30, 9 + r() * 14, (r() - 0.5) * 0.8, 0, TAU)
    g.fill()
  }
  // Dried mud low on the belly and flank.
  for (let i = 0; i < 5; i++) {
    const x = -104 + r() * 220
    const y = -150 + r() * 44
    g.fillStyle = 'rgba(146,120,92,0.5)'
    g.beginPath()
    g.ellipse(x, y, 12 + r() * 12, 6 + r() * 5, (r() - 0.5) * 0.6, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(176,152,122,0.5)'
    g.beginPath()
    g.ellipse(x - 3, y - 2, 6 + r() * 5, 3 + r() * 2, 0, 0, TAU)
    g.fill()
  }
  // Speckle.
  for (let i = 0; i < 300; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(244,238,220,0.55)' : 'rgba(132,112,90,0.3)'
    g.beginPath()
    g.arc(PONY_DUST.x + r() * PONY_DUST.w, PONY_DUST.y + r() * PONY_DUST.h, 0.8 + r() * 1.6, 0, TAU)
    g.fill()
  }
  // Bits of straw caught in the coat.
  g.lineWidth = 2.2
  for (let i = 0; i < 16; i++) {
    const x = -116 + r() * 240
    const y = -226 + r() * 110
    const a = r() * TAU
    const l = 8 + r() * 10
    g.strokeStyle = r() > 0.5 ? '#ecd486' : '#d2b05c'
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.6)
    g.stroke()
  }
  g.restore()
}

export interface PonyPose {
  x: number
  y: number
  time: number
  // 0 head up, 1 muzzle in the trough.
  headDown: number
  // Body shift in pixels, leaning into the brush.
  leanX: number
  leanY: number
  breath: number
  // 0 open, 1 closed.
  eye: number
  ear: number
  // Radians of tail swing.
  tail: number
  shine: number
  // 0..1 hind hoof resting on its toe.
  cock: number
  // Lip wiggle 0..1.
  lip: number
  dust: HTMLCanvasElement | null
  dustAlpha: number
}

function limb(g: G, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number): void {
  const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2
  const cx = Math.cos(a) / 2
  const cy = Math.sin(a) / 2
  g.beginPath()
  g.moveTo(x1 + cx * w1, y1 + cy * w1)
  g.lineTo(x2 + cx * w2, y2 + cy * w2)
  g.lineTo(x2 - cx * w2, y2 - cy * w2)
  g.lineTo(x1 - cx * w1, y1 - cy * w1)
  g.closePath()
  g.fill()
  g.beginPath()
  g.arc(x1, y1, w1 / 2, 0, TAU)
  g.fill()
  g.beginPath()
  g.arc(x2, y2, w2 / 2, 0, TAU)
  g.fill()
}

function ponyLeg(g: G, tx: number, ty: number, hx: number, hind: boolean, col: RGB, cock: number): void {
  const jx = lerp(tx, hx, 0.55) + (hind ? 13 : -3)
  const jy = ty * 0.5 - 4
  const fx = hx + (hind ? 3 : 0) + cock * 6
  const fy = -19 - cock * 7
  g.fillStyle = css(col)
  limb(g, tx, ty, hind ? 50 : 40, jx, jy, hind ? 27 : 25)
  limb(g, jx, jy, hind ? 25 : 24, fx, fy, 20)
  // Feathered fetlock.
  g.fillStyle = css(mix(col, MANE, 0.6))
  g.beginPath()
  g.moveTo(fx - 12, fy - 2)
  g.quadraticCurveTo(fx - 19, fy + 12, fx - 12, fy + 14)
  g.lineTo(fx + 12, fy + 14)
  g.quadraticCurveTo(fx + 18, fy + 10, fx + 11, fy - 2)
  g.closePath()
  g.fill()
  // Hoof.
  g.save()
  g.translate(fx - cock * 4, 0)
  g.rotate(-cock * 0.28)
  g.fillStyle = '#4e3a2c'
  g.beginPath()
  g.moveTo(-14, 0)
  g.lineTo(13, 0)
  g.quadraticCurveTo(12, -12, 9, -15)
  g.lineTo(-10, -15)
  g.quadraticCurveTo(-14, -10, -14, 0)
  g.fill()
  g.restore()
}

export function drawPony(g: G, p: PonyPose): void {
  g.save()
  g.translate(p.x, p.y)
  g.fillStyle = 'rgba(52,44,24,0.18)'
  g.beginPath()
  g.ellipse(4, 2, 156, 15, 0, 0, TAU)
  g.fill()
  const bx = p.leanX
  const by = p.leanY - p.breath * 1.6

  // Tail, behind everything.
  const tx = 142 + bx
  const ty = -214 + by
  for (let i = 0; i < 5; i++) {
    const sway = p.tail * (1 + i * 0.12)
    g.strokeStyle = css(shade(MANE, i % 2 === 0 ? 0 : -0.14))
    g.lineWidth = 14 - i
    g.beginPath()
    g.moveTo(tx, ty + 4)
    g.bezierCurveTo(tx + 34 + sway * 14, ty + 30, tx + 22 + sway * 46 + i * 3, ty + 96, tx + 12 + sway * 70 + i * 5 - 8, ty + 150 - i * 6)
    g.stroke()
  }

  // Far legs, darker.
  ponyLeg(g, -78 + bx, -120 + by, -76, false, COAT_DARK, 0)
  ponyLeg(g, 98 + bx, -128 + by, 106, true, COAT_DARK, 0)

  // Body.
  g.save()
  g.translate(bx, by)
  const coat = g.createLinearGradient(0, -250, 0, -88)
  coat.addColorStop(0, css(shade(COAT, 0.16)))
  coat.addColorStop(0.5, css(COAT))
  coat.addColorStop(1, css(shade(COAT, -0.26)))
  g.fillStyle = coat
  ponyBodyPath(g)
  g.fill()
  // The shine that brushing brings up.
  if (p.shine > 0.01) {
    const pulse = 0.85 + Math.sin(p.time * 0.8) * 0.15
    g.fillStyle = `rgba(255,236,200,${0.34 * p.shine * pulse})`
    g.beginPath()
    g.ellipse(96, -214, 36, 13, -0.25, 0, TAU)
    g.fill()
    g.beginPath()
    g.ellipse(-14, -218, 64, 11, 0.02, 0, TAU)
    g.fill()
    g.fillStyle = `rgba(255,244,220,${0.3 * p.shine * pulse})`
    g.beginPath()
    g.ellipse(-92, -196, 16, 22, 0.5, 0, TAU)
    g.fill()
    g.beginPath()
    g.ellipse(108, -216, 16, 6, -0.25, 0, TAU)
    g.fill()
  }
  if (p.dust && p.dustAlpha > 0.01) {
    g.globalAlpha = p.dustAlpha
    g.drawImage(p.dust, PONY_DUST.x, PONY_DUST.y, PONY_DUST.w, PONY_DUST.h)
    g.globalAlpha = 1
  }
  g.restore()

  // Near legs.
  ponyLeg(g, -104 + bx, -122 + by, -104, false, COAT, 0)
  ponyLeg(g, 122 + bx, -130 + by, 126, true, COAT, p.cock)

  // Neck and head.
  const e = p.headDown * p.headDown * (3 - 2 * p.headDown)
  const baseX = -98 + bx
  const baseY = -205 + by
  const th = lerp(-2.13, -3.5, e)
  const R = 128
  const dx = Math.cos(th)
  const dy = Math.sin(th)
  const pollX = baseX + R * dx
  const pollY = baseY + R * dy
  // The crest side of the neck (toward the back).
  const nx = -dy
  const ny = dx
  const phi = lerp(2.24, 1.6, e)
  g.fillStyle = css(COAT)
  g.beginPath()
  smooth(g, [
    [-36 + bx, -230 + by],
    [baseX + R * 0.5 * dx + nx * 34, baseY + R * 0.5 * dy + ny * 34],
    [pollX + nx * 20 - dx * 4, pollY + ny * 20 - dy * 4],
    [pollX + dx * 14 - nx * 4, pollY + dy * 14 - ny * 4],
    [pollX - nx * 32 + dx * 10, pollY - ny * 32 + dy * 10],
    [baseX + R * 0.4 * dx - nx * 30, baseY + R * 0.4 * dy - ny * 30],
    [-132 + bx, -178 + by],
    [-108 + bx, -146 + by],
    [-60 + bx, -170 + by],
  ])
  g.fill()

  // Head, in its own frame: x toward the muzzle, y toward the jaw.
  g.save()
  g.translate(pollX, pollY)
  g.rotate(phi)
  g.scale(1, -1)
  // Far ear.
  g.fillStyle = css(COAT_DARK)
  g.beginPath()
  g.moveTo(4, -8)
  g.quadraticCurveTo(-2 + p.ear * 10, -34, -10 + p.ear * 18, -42)
  g.quadraticCurveTo(-14 + p.ear * 8, -22, -8, -6)
  g.fill()
  // Skull and muzzle.
  g.fillStyle = css(COAT)
  g.beginPath()
  smooth(g, [[-12, -2], [6, -19], [50, -17], [90, -12], [106, 2], [100, 20], [78, 27], [50, 32], [22, 42], [-4, 32], [-16, 12]])
  g.fill()
  g.fillStyle = css(shade(COAT, -0.16), 0.5)
  g.beginPath()
  g.ellipse(18, 26, 20, 9, -0.1, 0, TAU)
  g.fill()
  // Blaze.
  g.fillStyle = css(MANE, 0.95)
  g.beginPath()
  smooth(g, [[20, -13], [50, -15], [82, -9], [88, -2], [60, -6], [30, -6]])
  g.fill()
  // Soft muzzle.
  g.fillStyle = css(mix(COAT, [236, 208, 186], 0.75))
  g.beginPath()
  g.ellipse(91, 8, 15, 15 + p.lip * 1.5, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#5a4034'
  g.beginPath()
  g.ellipse(97, 1, 2.6, 3.4, 0.4, 0, TAU)
  g.fill()
  g.strokeStyle = '#5a4034'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(84, 18 + p.lip * 2)
  g.quadraticCurveTo(92, 21 + p.lip * 3, 101, 15 + p.lip)
  g.stroke()
  // Eye: open and soft, or closed in contentment.
  const shut = clamp(p.eye, 0, 1)
  if (shut > 0.75) {
    g.strokeStyle = '#3a2a22'
    g.lineWidth = 2.6
    g.beginPath()
    g.moveTo(23, 3)
    g.quadraticCurveTo(30, 8, 37, 3)
    g.stroke()
  } else {
    g.fillStyle = '#3a2a22'
    g.beginPath()
    g.ellipse(30, 3, 6, 7 * (1 - shut * 0.7), 0, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.85)'
    g.beginPath()
    g.arc(32, 0.5 + shut, 1.9, 0, TAU)
    g.fill()
    // A soft upper lid, close to the eye, so the look stays gentle.
    g.strokeStyle = 'rgba(96,62,40,0.75)'
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(23.5, -1 + shut * 4)
    g.quadraticCurveTo(30, 12 - 17 * (1 - shut * 0.6), 36.5, -1 + shut * 4)
    g.stroke()
  }
  // Near ear.
  g.fillStyle = css(COAT)
  g.beginPath()
  g.moveTo(10, -14)
  g.quadraticCurveTo(8 + p.ear * 12, -40, -2 + p.ear * 20, -50)
  g.quadraticCurveTo(-10 + p.ear * 8, -28, -6, -10)
  g.fill()
  g.fillStyle = css(mix(COAT, [236, 208, 186], 0.6), 0.8)
  g.beginPath()
  g.moveTo(5, -18)
  g.quadraticCurveTo(4 + p.ear * 12, -36, -1 + p.ear * 18, -43)
  g.quadraticCurveTo(-5 + p.ear * 8, -28, -2, -16)
  g.fill()
  // Forelock.
  g.strokeStyle = css(MANE)
  g.lineWidth = 9
  g.beginPath()
  g.moveTo(2, -16)
  g.quadraticCurveTo(14, -24, 26, -14)
  g.moveTo(0, -14)
  g.quadraticCurveTo(10, -16, 16, -6)
  g.stroke()
  g.restore()

  // Mane: a flaxen fringe hanging from the crest, laid in overlapping locks.
  const LOCKS = 11
  const crest: Pt[] = []
  const tips: Pt[] = []
  for (let i = 0; i < LOCKS; i++) {
    const t = 0.06 + (i / (LOCKS - 1)) * 0.9
    const cx = lerp(pollX + nx * 14, -52 + bx, t) + nx * Math.sin(t * Math.PI) * 12
    const cy = lerp(pollY + ny * 14, -242 + by, t) + ny * Math.sin(t * Math.PI) * 12
    const len = 34 + Math.sin(i * 1.7) * 6 + t * 10
    const sway = Math.sin(p.time * 0.9 + i * 0.7) * 2.5
    crest.push([cx, cy])
    tips.push([cx + 2 + sway - dx * 10, cy + len])
  }
  g.fillStyle = css(shade(MANE, -0.16))
  g.beginPath()
  g.moveTo(crest[0][0], crest[0][1])
  for (let i = 1; i < LOCKS; i++) g.lineTo(crest[i][0], crest[i][1])
  for (let i = LOCKS - 1; i >= 0; i--) g.lineTo(tips[i][0], tips[i][1] - 7)
  g.closePath()
  g.fill()
  for (let i = 0; i < LOCKS; i++) {
    g.strokeStyle = css(shade(MANE, i % 2 === 0 ? 0.04 : -0.07))
    g.lineWidth = 13
    g.beginPath()
    g.moveTo(crest[i][0], crest[i][1])
    g.quadraticCurveTo(crest[i][0] + 7 - dx * 5, (crest[i][1] + tips[i][1]) / 2, tips[i][0], tips[i][1])
    g.stroke()
  }
  g.restore()
}

// The muzzle tip in world coordinates, for drips and ripples.
export function ponyMuzzle(p: { x: number; y: number; headDown: number }): Pt {
  const e = p.headDown * p.headDown * (3 - 2 * p.headDown)
  const th = lerp(-2.13, -3.5, e)
  const phi = lerp(2.24, 1.6, e)
  const pollX = -98 + 128 * Math.cos(th)
  const pollY = -205 + 128 * Math.sin(th)
  return [p.x + pollX + 100 * Math.cos(phi), p.y + pollY + 100 * Math.sin(phi)]
}

// ---------------------------------------------------------------------------
// Goat (faces right; origin on the ground under the middle of the body)

export interface GoatPose {
  x: number
  y: number
  time: number
  // 0 head up, 1 reaching into the rack.
  reach: number
  // Jaw phase and how much it is chewing.
  chew: number
  chewing: number
  // Tail flick in radians.
  tail: number
  ear: number
  eye: number
  // 1 is normal; a pat gives a little bounce.
  stretch: number
  // 0..1 a wisp of hay in the mouth.
  wisp: number
}

const GOAT: RGB = [246, 238, 220]
const GOAT_PATCH: RGB = [176, 138, 104]

function goatLeg(g: G, tx: number, ty: number, hx: number, col: RGB): void {
  const jx = lerp(tx, hx, 0.5) + 3
  const jy = ty * 0.48
  g.strokeStyle = css(col)
  g.lineWidth = 13
  g.beginPath()
  g.moveTo(tx, ty)
  g.lineTo(jx, jy)
  g.stroke()
  g.lineWidth = 9
  g.beginPath()
  g.moveTo(jx, jy)
  g.lineTo(hx, -8)
  g.stroke()
  g.fillStyle = '#5a463a'
  g.beginPath()
  g.moveTo(hx - 6, 0)
  g.lineTo(hx + 7, 0)
  g.lineTo(hx + 5, -10)
  g.lineTo(hx - 5, -10)
  g.closePath()
  g.fill()
}

export function drawGoat(g: G, p: GoatPose): void {
  g.save()
  g.translate(p.x, p.y)
  g.fillStyle = 'rgba(52,58,30,0.17)'
  g.beginPath()
  g.ellipse(2, 2, 78, 10, 0, 0, TAU)
  g.fill()
  g.scale(1 / Math.sqrt(p.stretch), p.stretch)
  const by = -Math.sin(p.time * 1.5) * 1.1

  // Little tail, upright.
  g.save()
  g.translate(-60, -116 + by)
  g.rotate(-0.5 + p.tail)
  g.fillStyle = css(GOAT_PATCH)
  g.beginPath()
  g.moveTo(-5, 4)
  g.quadraticCurveTo(-9, -16, -1, -24)
  g.quadraticCurveTo(7, -14, 5, 4)
  g.fill()
  g.restore()

  // Far legs.
  const far = shade(GOAT, -0.2)
  goatLeg(g, 24, -66 + by, 26, far)
  goatLeg(g, -38, -68 + by, -36, far)

  // Body: a round barrel with a shaggy underline.
  g.fillStyle = css(GOAT)
  g.beginPath()
  smooth(g, [[52, -106], [40, -128], [0, -124], [-46, -124], [-68, -104], [-62, -70], [-30, -54], [10, -50], [42, -60], [56, -82]])
  g.fill()
  g.fillStyle = css(shade(GOAT, -0.14), 0.7)
  g.beginPath()
  smooth(g, [[-56, -74], [-28, -60], [12, -56], [42, -66], [30, -54], [0, -48], [-34, -52]])
  g.fill()
  // A warm patch over the back.
  g.fillStyle = css(GOAT_PATCH, 0.9)
  g.beginPath()
  smooth(g, [[-52, -122], [-18, -127], [10, -122], [6, -100], [-20, -92], [-50, -98], [-64, -108]])
  g.fill()

  // Near legs.
  goatLeg(g, 40, -66 + by, 42, GOAT)
  goatLeg(g, -52, -68 + by, -54, GOAT)

  // Neck and head.
  const e = p.reach
  const hx = lerp(70, 96, e)
  const hy = lerp(-158, -128, e) + by
  const ha = lerp(0.26, 0.5, e)
  g.strokeStyle = css(GOAT)
  g.lineWidth = 30
  g.beginPath()
  g.moveTo(40, -104 + by)
  g.lineTo(hx - 6, hy + 8)
  g.stroke()

  g.save()
  g.translate(hx, hy)
  g.rotate(ha)
  // Horns, small and curved back.
  g.strokeStyle = '#a69478'
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(2, -10)
  g.quadraticCurveTo(-6, -30, -22, -30)
  g.stroke()
  g.strokeStyle = '#8c7a62'
  g.beginPath()
  g.moveTo(8, -10)
  g.quadraticCurveTo(2, -32, -14, -36)
  g.stroke()
  // Far ear.
  g.fillStyle = css(shade(GOAT_PATCH, -0.15))
  g.beginPath()
  g.ellipse(-12, -2 + p.ear * 5, 15, 6.5, 0.5 + p.ear, 0, TAU)
  g.fill()
  // Lower jaw, which slides as it chews.
  const cx = Math.cos(p.chew) * 2.2 * p.chewing
  const cy = Math.sin(p.chew) * 1.8 * p.chewing
  g.fillStyle = css(shade(GOAT, -0.08))
  g.beginPath()
  smooth(g, [[8 + cx, 10 + cy], [34 + cx, 12 + cy], [52 + cx, 8 + cy], [50 + cx, 16 + cy], [30 + cx, 20 + cy], [10 + cx, 18 + cy]])
  g.fill()
  // Beard.
  g.strokeStyle = css(shade(GOAT, -0.04))
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(34 + cx, 17 + cy)
  g.quadraticCurveTo(34 + cx, 30, 28 + cx + Math.sin(p.time * 2) * 1.5, 38)
  g.moveTo(40 + cx, 17 + cy)
  g.quadraticCurveTo(42 + cx, 28, 38 + cx + Math.sin(p.time * 2 + 1) * 1.5, 35)
  g.stroke()
  // Skull and snout.
  g.fillStyle = css(GOAT)
  g.beginPath()
  smooth(g, [[-8, 2], [-2, -13], [22, -12], [48, -7], [60, 0], [58, 10], [40, 13], [14, 15], [-4, 13]])
  g.fill()
  // A wisp of hay being chewed.
  if (p.wisp > 0.02) {
    g.strokeStyle = '#dcbc68'
    g.lineWidth = 2.2
    for (let i = 0; i < 4; i++) {
      g.beginPath()
      g.moveTo(52, 9)
      g.quadraticCurveTo(62 + i * 2, 10 + i * 3, 56 + p.wisp * (16 + i * 4) + cx * 2, 14 + i * 5 + cy * 2)
      g.stroke()
    }
  }
  // Nose and mouth.
  g.fillStyle = '#c99a8c'
  g.beginPath()
  g.ellipse(56, 3, 5, 6, 0, 0, TAU)
  g.fill()
  g.strokeStyle = '#6a5044'
  g.lineWidth = 1.8
  g.beginPath()
  g.moveTo(44, 10)
  g.quadraticCurveTo(52, 12, 58, 9)
  g.stroke()
  // Eye: amber, with the level pupil goats have.
  const shut = clamp(p.eye, 0, 1)
  if (shut > 0.75) {
    g.strokeStyle = '#4a382c'
    g.lineWidth = 2.2
    g.beginPath()
    g.moveTo(15, -2)
    g.quadraticCurveTo(21, 2, 27, -2)
    g.stroke()
  } else {
    g.fillStyle = '#d9a44a'
    g.beginPath()
    g.ellipse(21, -2, 5.6, 5.2 * (1 - shut * 0.6), 0, 0, TAU)
    g.fill()
    g.fillStyle = '#3a2a22'
    g.beginPath()
    g.roundRect(17.4, -3.3, 7.2, 2.8, 1.4)
    g.fill()
    g.strokeStyle = '#4a382c'
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(14, -6 + shut * 4)
    g.quadraticCurveTo(21, -10 + shut * 7, 28, -6 + shut * 4)
    g.stroke()
  }
  // Near ear, soft and level.
  g.fillStyle = css(GOAT_PATCH)
  g.beginPath()
  g.ellipse(-8, 4 + p.ear * 6, 17, 7, 0.35 + p.ear, 0, TAU)
  g.fill()
  g.fillStyle = css(shade(GOAT_PATCH, 0.3), 0.7)
  g.beginPath()
  g.ellipse(-8, 5 + p.ear * 6, 10, 3.2, 0.35 + p.ear, 0, TAU)
  g.fill()
  g.restore()
  g.restore()
}
