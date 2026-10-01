// Teddy, his pyjamas and his three small friends, all drawn by hand in soft
// two-tone shapes with no outlines. Teddy's local origin is the point he sits
// on; up is negative y.

import { TAU } from '../../kit/math.ts'
import { blobPath, limb, mix, rgb } from './paint.ts'
import type { RGB } from './paint.ts'

export const HEAD = 0
export const EAR_L = 1
export const EAR_R = 2
export const BODY = 3
export const ARM_L = 4
export const ARM_R = 5
export const LEG_L = 6
export const LEG_R = 7

export interface Zone {
  x: number
  y: number
  r: number
}

// Where a hand can wash, dry or pick him up.
export const ZONES: readonly Zone[] = [
  { x: 0, y: -285, r: 100 },
  { x: -74, y: -362, r: 46 },
  { x: 74, y: -362, r: 46 },
  { x: 0, y: -135, r: 108 },
  { x: -116, y: -150, r: 52 },
  { x: 116, y: -150, r: 52 },
  { x: -72, y: -32, r: 54 },
  { x: 72, y: -32, r: 54 },
]

export interface Spot {
  zone: number
  x: number
  y: number
  r: number
  amount: number
  seed: number
}

export interface Foam {
  x: number
  y: number
  r: number
  // 0..1, grows in.
  pop: number
}

export interface Pyjama {
  style: number
  // 0 limp, 1 the paw is through.
  sleeve: [number, number]
  // 0 open, 1 pushed through its hole.
  button: [number, number, number]
}

export interface TeddyLook {
  x: number
  y: number
  rot: number
  sx: number
  sy: number
  lying: boolean
  // 0 open, 1 shut.
  eye: number
  lookX: number
  lookY: number
  smile: number
  // 0..1, arms lift a little when he is carried.
  armLift: number
  wet: number[]
  fluff: number[]
  spots: Spot[]
  foam: Foam[]
  // The leaf stuck behind his ear, 1 there, 0 gone.
  leaf: number
  pj: Pyjama | null
}

const DULL: RGB = [186, 130, 80]
const FLUFFY: RGB = [226, 172, 106]
const WET: RGB = [124, 82, 50]
const SHADE: RGB = [96, 58, 34]
const CREAM: RGB = [242, 220, 180]
const INK = '#3b2a20'

export interface PyjamaStyle {
  base: RGB
  trim: RGB
  pattern: 'stripe' | 'dot' | 'check'
}

// Plant-dye colours: madder rose, indigo, weld-and-indigo green.
export const PYJAMAS: readonly PyjamaStyle[] = [
  { base: [214, 132, 118], trim: [247, 226, 200], pattern: 'dot' },
  { base: [112, 134, 176], trim: [232, 232, 226], pattern: 'stripe' },
  { base: [150, 170, 118], trim: [244, 232, 190], pattern: 'check' },
]

export const BUTTON_Y = [-188, -142, -96] as const
const SPECKS = [
  [-0.3, 0.1, 0.22],
  [0.95, -0.75, 0.15],
  [0.5, 1.0, 0.12],
  [-1.05, 0.5, 0.1],
] as const
const SHOULDER_X = 80
const SHOULDER_Y = -206
const ARM_LEN = 112

function fur(t: TeddyLook, zone: number): RGB {
  const dry = mix(DULL, FLUFFY, t.fluff[zone] ?? 0)
  return mix(dry, WET, (t.wet[zone] ?? 0) * 0.78)
}

function armEnd(side: number, lift: number): [number, number] {
  const a = 0.38 + lift * 0.55
  return [side * (SHOULDER_X + Math.sin(a) * ARM_LEN), SHOULDER_Y + Math.cos(a) * ARM_LEN]
}

// Where the hand works on each sleeve, in Teddy's local space.
export function sleevePoint(side: number): [number, number] {
  const [x, y] = armEnd(side, 0)
  return [x * 0.92, y - 30]
}

// Round bumps along an outline: wool that has been rubbed dry stands up.
function fuzz(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, amount: number, count: number, seed: number): void {
  if (amount < 0.04) return
  g.beginPath()
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + seed
    const r = (7 + 4 * Math.sin(i * 2.7 + seed * 9)) * amount
    const x = cx + Math.cos(a) * rx
    const y = cy + Math.sin(a) * ry
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, TAU)
  }
  g.fill()
}

function twoTone(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, c: RGB, rot = 0): void {
  g.fillStyle = rgb(mix(c, SHADE, 0.3))
  g.beginPath()
  g.ellipse(cx, cy, rx, ry, rot, 0, TAU)
  g.fill()
  g.fillStyle = rgb(c)
  g.beginPath()
  g.ellipse(cx - rx * 0.045, cy - ry * 0.055, rx * 0.93, ry * 0.92, rot, 0, TAU)
  g.fill()
}

function drawButton(g: CanvasRenderingContext2D, x: number, y: number, r: number, tilt: number): void {
  g.save()
  g.translate(x, y)
  g.scale(1 - tilt * 0.55, 1)
  g.fillStyle = '#8f6a3f'
  g.beginPath()
  g.arc(0, 2, r, 0, TAU)
  g.fill()
  g.fillStyle = '#d1a56c'
  g.beginPath()
  g.arc(0, 0, r, 0, TAU)
  g.fill()
  g.strokeStyle = 'rgba(120,80,40,0.55)'
  g.lineWidth = 2
  g.beginPath()
  g.arc(0, 0, r * 0.66, 0, TAU)
  g.stroke()
  g.fillStyle = '#6d4a2a'
  g.beginPath()
  g.arc(-r * 0.24, 0, r * 0.13, 0, TAU)
  g.arc(r * 0.24, 0, r * 0.13, 0, TAU)
  g.fill()
  g.restore()
}

function pattern(g: CanvasRenderingContext2D, style: PyjamaStyle, x: number, y: number, w: number, h: number): void {
  g.strokeStyle = rgb(style.trim, 0.55)
  g.fillStyle = rgb(style.trim, 0.7)
  if (style.pattern === 'stripe') {
    g.lineWidth = 5
    g.beginPath()
    for (let px = x + 10; px < x + w; px += 24) {
      g.moveTo(px, y)
      g.lineTo(px + 3, y + h)
    }
    g.stroke()
  } else if (style.pattern === 'dot') {
    g.beginPath()
    let row = 0
    for (let py = y + 14; py < y + h; py += 26) {
      for (let px = x + 12 + (row % 2) * 14; px < x + w; px += 28) {
        g.moveTo(px + 5, py)
        g.arc(px, py, 5, 0, TAU)
      }
      row++
    }
    g.fill()
  } else {
    g.lineWidth = 3
    g.beginPath()
    for (let px = x + 14; px < x + w; px += 30) {
      g.moveTo(px, y)
      g.lineTo(px, y + h)
    }
    for (let py = y + 14; py < y + h; py += 30) {
      g.moveTo(x, py)
      g.lineTo(x + w, py)
    }
    g.stroke()
  }
}

function drawSleeve(g: CanvasRenderingContext2D, t: TeddyLook, pj: Pyjama, side: number): void {
  const style = PYJAMAS[pj.style]!
  const s = pj.sleeve[side < 0 ? 0 : 1]
  const sx = side * SHOULDER_X
  const [ax, ay] = armEnd(side, t.armLift)
  const through = Math.min(1, s / 0.9)
  // Limp it hangs thin and empty beside him; filled it follows the arm.
  const lx = sx + side * 58
  const ly = SHOULDER_Y + 132
  const ex = lx + (sx + (ax - sx) * 0.8 - lx) * through
  const ey = ly + (SHOULDER_Y + (ay - SHOULDER_Y) * 0.8 - ly) * through
  const width = 34 + 38 * through
  if (s >= 0.9) {
    // The paw has come out of the cuff.
    const pop = Math.min(1, (s - 0.9) / 0.1)
    const c = fur(t, side < 0 ? ARM_L : ARM_R)
    const px = ex + (ax - ex) * pop
    const py = ey + (ay - ey) * pop
    limb(g, ex, ey, px, py, 58, rgb(mix(c, SHADE, 0.3)))
    limb(g, ex - 2, ey - 3, px - 2, py - 3, 52, rgb(c))
    g.fillStyle = rgb(mix(CREAM, WET, (t.wet[side < 0 ? ARM_L : ARM_R] ?? 0) * 0.5))
    g.beginPath()
    g.ellipse(px + side * 4, py + 6, 15, 12, 0, 0, TAU)
    g.fill()
  }
  limb(g, sx, SHOULDER_Y + 4, ex, ey, width, rgb(mix(style.base, SHADE, 0.22)))
  limb(g, sx - 2, SHOULDER_Y + 2, ex - 2, ey - 3, width - 7, rgb(style.base))
  // Cuff.
  const dx = ex - sx
  const dy = ey - SHOULDER_Y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const half = width * 0.46
  limb(g, ex + nx * half, ey + ny * half, ex - nx * half, ey - ny * half, 9, rgb(style.trim))
}

function drawJacket(g: CanvasRenderingContext2D, t: TeddyLook, pj: Pyjama): void {
  const style = PYJAMAS[pj.style]!
  g.save()
  g.beginPath()
  g.rect(-150, -226, 300, 204)
  g.clip()
  g.fillStyle = rgb(mix(style.base, SHADE, 0.22))
  g.beginPath()
  g.ellipse(0, -124, 117, 126, 0, 0, TAU)
  g.fill()
  g.fillStyle = rgb(style.base)
  g.beginPath()
  g.ellipse(-4, -129, 110, 119, 0, 0, TAU)
  g.fill()
  g.save()
  g.clip()
  pattern(g, style, -120, -226, 240, 204)
  g.restore()
  // The opening down the front: fur shows where a button is still undone.
  const w0 = 18 * (1 - pj.button[0])
  const w1 = 18 * (1 - pj.button[1])
  const w2 = 18 * (1 - pj.button[2])
  if (w0 + w1 + w2 > 0.5) {
    g.fillStyle = rgb(mix(fur(t, BODY), CREAM, 0.35))
    g.beginPath()
    g.moveTo(-w0 - 6, -226)
    g.quadraticCurveTo(-w0, BUTTON_Y[0], -w1, BUTTON_Y[1])
    g.quadraticCurveTo(-w2, BUTTON_Y[2], -w2 - 3, -22)
    g.lineTo(w2 + 3, -22)
    g.quadraticCurveTo(w2, BUTTON_Y[2], w1, BUTTON_Y[1])
    g.quadraticCurveTo(w0, BUTTON_Y[0], w0 + 6, -226)
    g.closePath()
    g.fill()
  }
  // The placket seam.
  g.strokeStyle = rgb(mix(style.base, SHADE, 0.35), 0.7)
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(w0 + 6, -226)
  g.quadraticCurveTo(w0, BUTTON_Y[0], w1, BUTTON_Y[1])
  g.quadraticCurveTo(w2, BUTTON_Y[2], w2 + 3, -22)
  g.stroke()
  // Hem.
  g.strokeStyle = rgb(style.trim)
  g.lineWidth = 7
  g.beginPath()
  g.moveTo(-66, -27)
  g.quadraticCurveTo(0, -22, 66, -27)
  g.stroke()
  g.restore()
  // Buttonholes on one side, buttons on the other.
  for (let i = 0; i < 3; i++) {
    const b = pj.button[i]!
    const y = BUTTON_Y[i]!
    if (b < 0.98) {
      g.strokeStyle = rgb(mix(style.base, SHADE, 0.6), 1 - b)
      g.lineWidth = 4
      g.beginPath()
      g.moveTo(-34, y)
      g.lineTo(-20, y)
      g.stroke()
    }
    const bx = 34 * (1 - b) - 2 * b
    drawButton(g, bx, y, 17, Math.sin(b * Math.PI))
  }
  // Collar.
  g.fillStyle = rgb(style.trim)
  for (const side of [-1, 1]) {
    g.beginPath()
    g.moveTo(side * 6, -214)
    g.quadraticCurveTo(side * 30, -226, side * 58, -206)
    g.quadraticCurveTo(side * 40, -186, side * 14, -190)
    g.closePath()
    g.fill()
  }
}

export function drawTeddy(g: CanvasRenderingContext2D, t: TeddyLook): void {
  g.save()
  g.translate(t.x, t.y)
  if (t.rot) g.rotate(t.rot)
  g.scale(t.sx, t.sy)

  const head = fur(t, HEAD)
  const body = fur(t, BODY)

  // Ears, behind the head.
  for (const side of [-1, 1]) {
    const zone = side < 0 ? EAR_L : EAR_R
    const c = fur(t, zone)
    g.fillStyle = rgb(c)
    fuzz(g, side * 74, -362, 34, 34, t.fluff[zone] ?? 0, 9, side)
    twoTone(g, side * 74, -362, 37, 37, c)
    g.fillStyle = rgb(mix(mix(CREAM, [226, 160, 130], 0.45), WET, (t.wet[zone] ?? 0) * 0.4))
    g.beginPath()
    g.ellipse(side * 72, -358, 19, 20, 0, 0, TAU)
    g.fill()
  }

  // Legs stretched out when he lies down.
  if (t.lying) {
    for (const side of [-1, 1]) {
      const zone = side < 0 ? LEG_L : LEG_R
      const c = fur(t, zone)
      limb(g, side * 54, -44, side * 70, 26, 78, rgb(mix(c, SHADE, 0.3)))
      limb(g, side * 52, -46, side * 68, 23, 70, rgb(c))
      g.fillStyle = rgb(mix(CREAM, WET, (t.wet[zone] ?? 0) * 0.5))
      g.beginPath()
      g.ellipse(side * 71, 36, 25, 21, side * 0.2, 0, TAU)
      g.fill()
    }
  }

  // Arms, or sleeves when he is dressed.
  for (const side of [-1, 1]) {
    if (t.pj) {
      drawSleeve(g, t, t.pj, side)
      continue
    }
    const zone = side < 0 ? ARM_L : ARM_R
    const c = fur(t, zone)
    const [ax, ay] = armEnd(side, t.armLift)
    const f = t.fluff[zone] ?? 0
    if (f > 0.04) {
      g.fillStyle = rgb(c)
      g.beginPath()
      for (let i = 0; i < 5; i++) {
        const k = 0.25 + i * 0.19
        const x = side * SHOULDER_X + (ax - side * SHOULDER_X) * k + side * 30
        const y = SHOULDER_Y + (ay - SHOULDER_Y) * k + 8
        g.moveTo(x + 9 * f, y)
        g.arc(x, y, (8 + (i % 2) * 3) * f, 0, TAU)
      }
      g.moveTo(ax + 10, ay + 30)
      g.arc(ax, ay + 30, 10 * f, 0, TAU)
      g.fill()
    }
    limb(g, side * SHOULDER_X, SHOULDER_Y + 4, ax, ay, 66, rgb(mix(c, SHADE, 0.3)))
    limb(g, side * SHOULDER_X - 3, SHOULDER_Y, ax - 3, ay - 4, 58, rgb(c))
    g.fillStyle = rgb(mix(CREAM, WET, (t.wet[zone] ?? 0) * 0.5))
    g.beginPath()
    g.ellipse(ax + side * 4, ay + 6, 16, 13, 0, 0, TAU)
    g.fill()
  }

  // Body.
  g.fillStyle = rgb(body)
  fuzz(g, 0, -125, 104, 114, t.fluff[BODY] ?? 0, 22, 0.4)
  twoTone(g, 0, -125, 110, 120, body)
  g.fillStyle = rgb(mix(body, CREAM, 0.42))
  g.beginPath()
  g.ellipse(-2, -112, 66, 76, 0, 0, TAU)
  g.fill()

  if (t.pj) drawJacket(g, t, t.pj)

  // Feet towards us when he sits.
  if (!t.lying) {
    for (const side of [-1, 1]) {
      const zone = side < 0 ? LEG_L : LEG_R
      const c = fur(t, zone)
      g.fillStyle = rgb(c)
      fuzz(g, side * 74, -32, 47, 41, t.fluff[zone] ?? 0, 11, side * 2)
      twoTone(g, side * 74, -32, 50, 44, c)
      g.fillStyle = rgb(mix(CREAM, WET, (t.wet[zone] ?? 0) * 0.5))
      g.beginPath()
      g.ellipse(side * 74, -28, 27, 24, 0, 0, TAU)
      g.fill()
      g.beginPath()
      for (let i = -1; i <= 1; i++) {
        g.moveTo(side * 74 + i * 19 + 7, -62 + Math.abs(i) * 5)
        g.arc(side * 74 + i * 19, -62 + Math.abs(i) * 5, 7, 0, TAU)
      }
      g.fill()
    }
  }

  // Head.
  g.fillStyle = rgb(head)
  fuzz(g, 0, -285, 96, 88, t.fluff[HEAD] ?? 0, 20, 0.2)
  twoTone(g, 0, -285, 101, 93, head)
  const wetHead = t.wet[HEAD] ?? 0
  // Muzzle.
  g.fillStyle = rgb(mix(CREAM, WET, wetHead * 0.35))
  g.beginPath()
  g.ellipse(0, -256, 47, 37, 0, 0, TAU)
  g.fill()
  // Cheeks.
  g.fillStyle = 'rgba(224,118,96,0.26)'
  g.beginPath()
  g.ellipse(-62, -262, 17, 12, 0, 0, TAU)
  g.ellipse(62, -262, 17, 12, 0, 0, TAU)
  g.fill()
  // Nose.
  g.fillStyle = '#5b3d2c'
  g.beginPath()
  g.ellipse(0, -274, 15, 11, 0, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.beginPath()
  g.ellipse(-4, -278, 5, 3, -0.3, 0, TAU)
  g.fill()
  // Mouth: small, and a little more of a smile when he is content.
  const s = t.smile
  g.strokeStyle = INK
  g.lineWidth = 3
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(0, -263)
  g.lineTo(0, -252)
  g.moveTo(-15, -251 - s * 4)
  g.quadraticCurveTo(-8, -243 + s * 3, 0, -251)
  g.quadraticCurveTo(8, -243 + s * 3, 15, -251 - s * 4)
  g.stroke()
  // Eyes. The upper lid comes down level, like a blind, and only bows into
  // a sleeping curve at the very end, so heavy eyes look sleepy, never cross.
  const shut = t.eye
  const bow = Math.min(1, Math.max(0, (shut - 0.55) / 0.3))
  for (const side of [-1, 1]) {
    const ex = side * 37
    const ey = -300
    const lid = ey - 12.5 + 20 * shut
    if (shut < 0.84) {
      g.save()
      g.beginPath()
      g.ellipse(ex, ey, 10.5, 12.5, 0, 0, TAU)
      g.clip()
      g.fillStyle = INK
      g.beginPath()
      g.ellipse(ex + t.lookX * 3, ey + t.lookY * 2.5, 9.5, 11.5, 0, 0, TAU)
      g.fill()
      if (shut < 0.45) {
        g.fillStyle = 'rgba(255,255,255,0.85)'
        g.beginPath()
        g.arc(ex + t.lookX * 3 - 3, ey + t.lookY * 2.5 - 4, 3, 0, TAU)
        g.fill()
      }
      if (shut > 0.02) {
        g.fillStyle = rgb(head)
        g.beginPath()
        g.moveTo(ex - 16, ey - 18)
        g.lineTo(ex + 16, ey - 18)
        g.lineTo(ex + 16, lid - 3 * bow)
        g.quadraticCurveTo(ex, lid + 6 * bow, ex - 16, lid - 3 * bow)
        g.closePath()
        g.fill()
      }
      g.restore()
    }
    if (shut > 0.12) {
      const asleep = shut >= 0.84
      g.strokeStyle = asleep ? INK : rgb(mix(head, SHADE, 0.55))
      g.lineWidth = asleep ? 3.4 : 2.4
      const half = asleep ? 12 : 10
      g.beginPath()
      g.moveTo(ex - half, lid - 3 * bow)
      g.quadraticCurveTo(ex, lid + 6 * bow, ex + half, lid - 3 * bow)
      g.stroke()
    }
  }

  // A sheen on wet fur.
  if (wetHead > 0.3) {
    g.strokeStyle = `rgba(220,240,250,${0.3 * wetHead})`
    g.lineWidth = 5
    g.beginPath()
    g.arc(0, -285, 82, -2.5, -1.9)
    g.stroke()
  }
  if ((t.wet[BODY] ?? 0) > 0.3 && !t.pj) {
    g.strokeStyle = `rgba(220,240,250,${0.25 * (t.wet[BODY] ?? 0)})`
    g.lineWidth = 5
    g.beginPath()
    g.arc(0, -125, 92, -2.7, -2.2)
    g.stroke()
  }

  // The day's mud.
  for (const spot of t.spots) {
    if (spot.amount < 0.03) continue
    if (t.pj && spot.zone >= BODY && spot.zone <= ARM_R) continue
    g.fillStyle = `rgba(98,66,40,${(0.78 * spot.amount).toFixed(3)})`
    blobPath(g, spot.x, spot.y, spot.r, spot.r * 0.82, 0.16, spot.seed, 9)
    g.fill()
    g.fillStyle = `rgba(70,46,28,${(0.5 * spot.amount).toFixed(3)})`
    g.beginPath()
    for (const [dx, dy, k] of SPECKS) {
      const sx = spot.x + spot.r * dx
      const sy = spot.y + spot.r * dy
      g.moveTo(sx + spot.r * k, sy)
      g.arc(sx, sy, spot.r * k, 0, TAU)
    }
    g.fill()
  }
  if (t.leaf > 0.03) {
    g.save()
    g.globalAlpha = t.leaf
    g.translate(44, -372)
    g.rotate(0.6)
    g.fillStyle = '#8fa85a'
    g.beginPath()
    g.moveTo(-20, 0)
    g.quadraticCurveTo(0, -15, 22, 0)
    g.quadraticCurveTo(0, 13, -20, 0)
    g.fill()
    g.strokeStyle = '#6d8443'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(-24, 1)
    g.lineTo(18, 0)
    g.stroke()
    g.restore()
  }

  // Lather.
  if (t.foam.length > 0) {
    g.fillStyle = 'rgba(176,200,214,0.5)'
    g.beginPath()
    for (const f of t.foam) {
      const r = f.r * f.pop
      g.moveTo(f.x + r + 1.5, f.y + 2.5)
      g.arc(f.x + 1.5, f.y + 2.5, r, 0, TAU)
    }
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.95)'
    g.beginPath()
    for (const f of t.foam) {
      const r = f.r * f.pop
      g.moveTo(f.x + r, f.y)
      g.arc(f.x, f.y, r, 0, TAU)
    }
    g.fill()
  }
  g.restore()
}

// A folded or held pyjama top. `open` 0 is folded in the drawer, 1 is held up.
export function drawPyjamaItem(g: CanvasRenderingContext2D, styleIndex: number, x: number, y: number, open: number, rot = 0): void {
  const style = PYJAMAS[styleIndex]!
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  if (open < 0.5) {
    // Folded square.
    g.fillStyle = rgb(mix(style.base, SHADE, 0.25))
    g.beginPath()
    g.roundRect(-35, -22, 72, 50, 9)
    g.fill()
    g.fillStyle = rgb(style.base)
    g.beginPath()
    g.roundRect(-36, -26, 72, 48, 9)
    g.fill()
    g.save()
    g.clip()
    pattern(g, style, -36, -26, 72, 48)
    g.restore()
    g.fillStyle = rgb(style.trim)
    g.beginPath()
    g.moveTo(-4, -26)
    g.quadraticCurveTo(-18, -22, -22, -10)
    g.quadraticCurveTo(-8, -12, 0, -18)
    g.quadraticCurveTo(8, -12, 22, -10)
    g.quadraticCurveTo(18, -22, 4, -26)
    g.closePath()
    g.fill()
    drawButton(g, 0, 2, 6, 0)
  } else {
    // Held up by the shoulders, sleeves hanging.
    for (const side of [-1, 1]) {
      limb(g, side * 44, -34, side * 66, 30, 34, rgb(mix(style.base, SHADE, 0.2)))
      limb(g, side * 43, -36, side * 65, 27, 28, rgb(style.base))
    }
    g.fillStyle = rgb(mix(style.base, SHADE, 0.2))
    g.beginPath()
    g.roundRect(-52, -52, 106, 118, 22)
    g.fill()
    g.fillStyle = rgb(style.base)
    g.beginPath()
    g.roundRect(-54, -56, 106, 116, 22)
    g.fill()
    g.save()
    g.clip()
    pattern(g, style, -54, -56, 106, 116)
    g.restore()
    g.fillStyle = rgb(style.trim)
    g.beginPath()
    g.moveTo(-4, -56)
    g.quadraticCurveTo(-24, -52, -28, -34)
    g.quadraticCurveTo(-10, -38, 0, -46)
    g.quadraticCurveTo(10, -38, 28, -34)
    g.quadraticCurveTo(24, -52, 4, -56)
    g.closePath()
    g.fill()
    for (let i = 0; i < 3; i++) drawButton(g, 0, -22 + i * 30, 8, 0)
  }
  g.restore()
}

export type FriendKind = 'bunny' | 'lamb' | 'mouse'

// A small wool friend, about 100 high, origin at its seat.
export function drawFriend(g: CanvasRenderingContext2D, kind: FriendKind, x: number, y: number, rot: number, squash: number): void {
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  g.scale(1 / Math.sqrt(squash), squash)
  const ink = '#4a382c'
  if (kind === 'bunny') {
    const c: RGB = [240, 230, 212]
    for (const side of [-1, 1]) {
      g.fillStyle = rgb(mix(c, SHADE, 0.2))
      g.beginPath()
      g.ellipse(side * 11, -100, 8.5, 25, side * 0.16, 0, TAU)
      g.fill()
      g.fillStyle = rgb(c)
      g.beginPath()
      g.ellipse(side * 10, -101, 7, 23, side * 0.16, 0, TAU)
      g.fill()
      g.fillStyle = 'rgba(226,150,140,0.55)'
      g.beginPath()
      g.ellipse(side * 10, -98, 3, 15, side * 0.16, 0, TAU)
      g.fill()
    }
    twoTone(g, 0, -28, 27, 30, c)
    for (const side of [-1, 1]) {
      limb(g, side * 20, -40, side * 28, -22, 13, rgb(c))
      g.fillStyle = rgb(c)
      g.beginPath()
      g.ellipse(side * 15, -4, 13, 9, 0, 0, TAU)
      g.fill()
    }
    twoTone(g, 0, -66, 23, 21, c)
    g.fillStyle = 'rgba(226,130,120,0.75)'
    g.beginPath()
    g.ellipse(0, -62, 3.5, 2.6, 0, 0, TAU)
    g.fill()
    // A ribbon with a little bell.
    g.strokeStyle = '#c9756a'
    g.lineWidth = 4
    g.beginPath()
    g.arc(0, -52, 16, 0.35, Math.PI - 0.35)
    g.stroke()
    g.fillStyle = '#d9b25a'
    g.beginPath()
    g.arc(0, -36, 5, 0, TAU)
    g.fill()
  } else if (kind === 'lamb') {
    const wool: RGB = [246, 240, 226]
    const dark: RGB = [112, 92, 80]
    for (const side of [-1, 1]) {
      limb(g, side * 14, -12, side * 16, -2, 12, rgb(dark))
      limb(g, side * 24, -40, side * 32, -30, 11, rgb(dark))
    }
    g.fillStyle = rgb(mix(wool, SHADE, 0.16))
    g.beginPath()
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU
      g.moveTo(Math.cos(a) * 21 + 15, -30 + Math.sin(a) * 22 + 2)
      g.arc(Math.cos(a) * 21 + 1, -30 + Math.sin(a) * 22 + 2, 13, 0, TAU)
    }
    g.fill()
    g.fillStyle = rgb(wool)
    g.beginPath()
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU
      g.moveTo(Math.cos(a) * 20 + 12, -32 + Math.sin(a) * 21)
      g.arc(Math.cos(a) * 20, -32 + Math.sin(a) * 21, 12, 0, TAU)
    }
    g.moveTo(22, -32)
    g.arc(0, -32, 22, 0, TAU)
    g.fill()
    for (const side of [-1, 1]) {
      g.fillStyle = rgb(dark)
      g.beginPath()
      g.ellipse(side * 22, -70, 11, 6, side * 0.5, 0, TAU)
      g.fill()
    }
    twoTone(g, 0, -68, 18, 20, dark)
    g.fillStyle = rgb(wool)
    g.beginPath()
    for (let i = -1; i <= 1; i++) {
      g.moveTo(i * 10 + 9, -86)
      g.arc(i * 10, -86, 9, 0, TAU)
    }
    g.fill()
  } else {
    const c: RGB = [176, 152, 132]
    // Tail.
    g.strokeStyle = rgb(mix(c, SHADE, 0.2))
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(18, -8)
    g.quadraticCurveTo(46, -4, 40, -30)
    g.stroke()
    for (const side of [-1, 1]) {
      twoTone(g, side * 21, -84, 16, 16, c)
      g.fillStyle = 'rgba(232,170,160,0.8)'
      g.beginPath()
      g.arc(side * 21, -83, 9.5, 0, TAU)
      g.fill()
    }
    twoTone(g, 0, -26, 24, 28, c)
    g.fillStyle = rgb(mix(c, CREAM, 0.6))
    g.beginPath()
    g.ellipse(0, -22, 14, 18, 0, 0, TAU)
    g.fill()
    for (const side of [-1, 1]) {
      limb(g, side * 18, -38, side * 25, -24, 11, rgb(c))
      g.fillStyle = rgb(mix(c, CREAM, 0.5))
      g.beginPath()
      g.ellipse(side * 13, -3, 11, 7, 0, 0, TAU)
      g.fill()
    }
    twoTone(g, 0, -62, 21, 19, c)
    g.fillStyle = 'rgba(226,130,120,0.8)'
    g.beginPath()
    g.ellipse(0, -55, 3.5, 2.8, 0, 0, TAU)
    g.fill()
  }
  // Two calm eyes.
  const ey = kind === 'lamb' ? -70 : kind === 'bunny' ? -70 : -66
  g.fillStyle = kind === 'lamb' ? '#f4ead8' : ink
  g.beginPath()
  g.arc(-8, ey, 2.8, 0, TAU)
  g.arc(8, ey, 2.8, 0, TAU)
  g.fill()
  g.restore()
}
