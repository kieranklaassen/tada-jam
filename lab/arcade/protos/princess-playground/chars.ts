// The cast, drawn from shapes so they can squash, dangle, sit, fly and pull
// faces: the princess, her cat, and the friends who wander in. Every drawer
// works in local coordinates with the feet (or the bottom, when sitting) at
// the origin and up as negative y; the caller places, rotates and squashes.

import { sprite } from '../../kit/draw.ts'
import { TAU, clamp, lerp } from '../../kit/math.ts'

type Ctx = CanvasRenderingContext2D

export type Kind = 'princess' | 'cat' | 'queen' | 'knight' | 'dragon' | 'frog'
export type Mood = 'grin' | 'joy' | 'wow' | 'tongue' | 'silly' | 'grumpy' | 'dizzy' | 'plain' | 'smug' | 'sleep' | 'yum'

export interface Pose {
  kind: Kind
  t: number
  seed: number
  mood: Mood
  lookX: number
  lookY: number
  blink: number
  // 0..1: held up by a finger (legs kick, the cat goes long).
  dangle: number
  kick: number
  // 0..1: flying, limbs spread.
  air: number
  // 0..1: sitting on the bottom.
  sit: number
  // -1 down, 0 out, 1 up.
  arms: number
  mud: number
  soot: number
  // The princess wears hers; the cat wears it when it has stolen it.
  crown: boolean
  // An ice cream upside down on the head.
  cone: boolean
  // The cat's fur standing on end.
  puff: number
  // A character's own trick, 0..1 (trumpet out, visor shut, throat full).
  trick: number
  // Follow-through for hair, ears, plume and tail, about -1..1.
  sway: number
}

export interface Spec {
  // Where a finger holds it, above the feet.
  grab: number
  // Top of the head, where a rider sits.
  head: number
  // Hit ellipse: centre height and radii.
  cy: number
  rx: number
  ry: number
  weight: number
  // Speed it leaves the seesaw at.
  launch: number
  small: boolean
  pitch: number
  kid: boolean
}

export const SPECS: Record<Kind, Spec> = {
  princess: { grab: 124, head: 172, cy: 92, rx: 62, ry: 104, weight: 2, launch: 1180, small: false, pitch: 1, kid: true },
  queen: { grab: 124, head: 178, cy: 92, rx: 62, ry: 106, weight: 2, launch: 1150, small: false, pitch: 0.86, kid: true },
  knight: { grab: 124, head: 178, cy: 92, rx: 62, ry: 106, weight: 3, launch: 1080, small: false, pitch: 0.72, kid: true },
  cat: { grab: 58, head: 100, cy: 54, rx: 58, ry: 62, weight: 1, launch: 1300, small: true, pitch: 1.5, kid: false },
  dragon: { grab: 92, head: 138, cy: 72, rx: 60, ry: 80, weight: 1.5, launch: 1250, small: true, pitch: 1.3, kid: false },
  frog: { grab: 62, head: 104, cy: 52, rx: 62, ry: 62, weight: 1, launch: 1280, small: true, pitch: 0.6, kid: false },
}

// The cat's head rises as it goes long, so the grab point does too.
export function grabOf(kind: Kind, dangle: number): number {
  return SPECS[kind].grab + (kind === 'cat' ? 62 * dangle : kind === 'frog' ? 10 * dangle : 0)
}

// How far the top of the head drops when a kid sits.
export function headOf(kind: Kind, sit: number, dangle: number): number {
  const s = SPECS[kind]
  return s.head - (s.kid ? 34 * sit : 0) + (kind === 'cat' ? 62 * dangle : 0)
}

export const OUT = '#4b2a4a'
const MUD_A = '#6b4423'
const MUD_B = '#8b5e34'
const GOLD = '#ffd23f'
const GOLD_OUT = '#9a6200'
const MOUTH = '#7a2238'
const TONGUE = '#ff6f91'

function blob(g: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0, lw = 4): void {
  g.beginPath()
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU)
  g.fillStyle = fill
  g.fill()
  if (lw > 0) {
    g.lineWidth = lw
    g.strokeStyle = OUT
    g.stroke()
  }
}

// A thick outlined line: arms, legs, tails.
function limb(g: Ctx, x1: number, y1: number, x2: number, y2: number, w: number, fill: string): void {
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.strokeStyle = OUT
  g.lineWidth = w + 7
  g.stroke()
  g.strokeStyle = fill
  g.lineWidth = w
  g.stroke()
}

function tube(g: Ctx, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, w: number, fill: string): void {
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x0, y0)
  g.bezierCurveTo(x1, y1, x2, y2, x3, y3)
  g.strokeStyle = OUT
  g.lineWidth = w + 7
  g.stroke()
  g.strokeStyle = fill
  g.lineWidth = w
  g.stroke()
}

function poly(g: Ctx, pts: readonly number[], fill: string, lw = 4, stroke = OUT): void {
  g.beginPath()
  g.moveTo(pts[0]!, pts[1]!)
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!)
  g.closePath()
  g.lineJoin = 'round'
  g.fillStyle = fill
  g.fill()
  if (lw > 0) {
    g.lineWidth = lw
    g.strokeStyle = stroke
    g.stroke()
  }
}

export function drawCrown(g: Ctx, x: number, y: number, w: number, h: number, rot: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  const a = w / 2
  poly(g, [-a, 0, -a - 2, -h * 0.82, -a * 0.5, -h * 0.38, 0, -h, a * 0.5, -h * 0.38, a + 2, -h * 0.82, a, 0], GOLD, 3.5, GOLD_OUT)
  g.fillStyle = '#fff3a8'
  g.fillRect(-a + 4, -h * 0.26, w - 8, 3)
  g.lineWidth = 2
  g.strokeStyle = GOLD_OUT
  for (const [bx, by, col] of [[-a - 2, -h * 0.82, '#ff5d8f'], [0, -h, '#4db8ff'], [a + 2, -h * 0.82, '#ff5d8f']] as const) {
    g.beginPath()
    g.arc(bx, by, Math.max(3, w * 0.085), 0, TAU)
    g.fillStyle = col
    g.fill()
    g.stroke()
  }
  g.beginPath()
  g.arc(0, -h * 0.2, Math.max(2.5, w * 0.07), 0, TAU)
  g.fillStyle = '#ff4d6d'
  g.fill()
  g.restore()
}

function eyeAt(g: Ctx, x: number, y: number, r: number, mood: Mood, lx: number, ly: number, blink: number, side: number): void {
  g.lineCap = 'round'
  if (mood === 'joy' || mood === 'yum' || mood === 'sleep' || mood === 'tongue' || mood === 'dizzy') {
    g.strokeStyle = OUT
    g.lineWidth = Math.max(2.5, r * 0.42)
    g.beginPath()
    if (mood === 'joy' || mood === 'yum') g.arc(x, y + r * 0.35, r * 0.85, Math.PI * 1.12, Math.PI * 1.88)
    else if (mood === 'sleep') g.arc(x, y - r * 0.2, r * 0.8, Math.PI * 0.12, Math.PI * 0.88)
    else if (mood === 'tongue') {
      g.moveTo(x + side * r * 0.7, y - r * 0.62)
      g.lineTo(x - side * r * 0.5, y)
      g.lineTo(x + side * r * 0.7, y + r * 0.62)
    } else {
      g.moveTo(x - r * 0.6, y - r * 0.6)
      g.lineTo(x + r * 0.6, y + r * 0.6)
      g.moveTo(x + r * 0.6, y - r * 0.6)
      g.lineTo(x - r * 0.6, y + r * 0.6)
    }
    g.stroke()
    return
  }
  const rr = r * (mood === 'wow' ? 1.22 : 1)
  const open = mood === 'smug' || mood === 'grumpy' ? 0.6 : mood === 'plain' ? 0.74 : Math.max(0.1, 1 - blink)
  g.beginPath()
  g.ellipse(x, y, rr, rr * open, 0, 0, TAU)
  g.fillStyle = '#ffffff'
  g.fill()
  g.lineWidth = Math.max(2, r * 0.2)
  g.strokeStyle = OUT
  g.stroke()
  if (open > 0.3) {
    const cx = mood === 'silly' ? -side * 0.8 : lx
    const cy = mood === 'silly' ? 0.25 : ly
    const pr = rr * (mood === 'wow' ? 0.4 : 0.54)
    const px = x + cx * rr * 0.36
    const py = y + cy * rr * 0.36 * open
    g.beginPath()
    g.ellipse(px, py, pr, Math.min(pr, rr * open * 0.86), 0, 0, TAU)
    g.fillStyle = '#2a1830'
    g.fill()
    g.beginPath()
    g.arc(px - pr * 0.3, py - pr * 0.35, pr * 0.32, 0, TAU)
    g.fillStyle = '#ffffff'
    g.fill()
  }
}

function brows(g: Ctx, x: number, y: number, r: number, gap: number, mood: Mood, color: string): void {
  if (mood === 'joy' || mood === 'tongue' || mood === 'sleep' || mood === 'yum' || mood === 'dizzy') return
  g.strokeStyle = color
  g.lineWidth = Math.max(2.5, r * 0.36)
  g.lineCap = 'round'
  for (const side of [-1, 1]) {
    const bx = x + side * gap
    let y0 = y - r * 1.7
    let slant = 0
    if (mood === 'grin') {
      if (side < 0) {
        y0 -= r * 0.5
        slant = -r * 0.2
      } else slant = -r * 0.12
    } else if (mood === 'grumpy') slant = -side * r * 0.5
    else if (mood === 'wow') y0 -= r * 0.5
    else if (mood === 'smug') {
      y0 += r * 0.1
      slant = side * r * 0.2
    } else if (mood === 'silly') slant = side * r * 0.35
    g.beginPath()
    g.moveTo(bx - r * 0.8, y0 + slant)
    g.lineTo(bx + r * 0.8, y0 - slant)
    g.stroke()
  }
}

function mouth(g: Ctx, x: number, y: number, s: number, mood: Mood, t: number, tooth: boolean): void {
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.strokeStyle = OUT
  g.lineWidth = Math.max(2.5, s * 0.36)
  if (mood === 'grin' || mood === 'joy' || mood === 'tongue' || mood === 'yum') {
    const w = mood === 'joy' ? 1.75 : mood === 'tongue' ? 1.35 : 1.45
    const d = mood === 'joy' ? 1.7 : mood === 'yum' ? 0.8 : 1.05
    g.save()
    g.translate(x, y)
    if (mood === 'grin') g.rotate(-0.14)
    g.beginPath()
    g.moveTo(-s * w, -s * 0.25)
    g.quadraticCurveTo(0, s * 0.25, s * w, -s * 0.25)
    g.bezierCurveTo(s * w * 0.85, s * d * 1.25, -s * w * 0.85, s * d * 1.25, -s * w, -s * 0.25)
    g.closePath()
    g.fillStyle = MOUTH
    g.fill()
    if (mood !== 'tongue') {
      g.beginPath()
      g.ellipse(0, s * d * 0.72, s * w * 0.45, s * d * 0.3, 0, 0, TAU)
      g.fillStyle = TONGUE
      g.fill()
    }
    if (tooth) {
      g.fillStyle = '#ffffff'
      g.fillRect(-s * 0.55, s * 0.02, s * 0.55, s * 0.42)
    }
    g.stroke()
    if (mood === 'tongue' || mood === 'yum') {
      const wag = mood === 'tongue' ? Math.sin(t * 40) * s * 0.3 : Math.sin(t * 9) * s * 0.7
      const len = mood === 'tongue' ? 1.9 : 0.7
      g.beginPath()
      g.ellipse(wag * 0.5, s * (d * 0.55 + len * 0.6), s * (mood === 'tongue' ? 0.9 : 0.62), s * len, wag * 0.02, 0, TAU)
      g.fillStyle = TONGUE
      g.fill()
      g.lineWidth = Math.max(2, s * 0.26)
      g.stroke()
      g.beginPath()
      g.moveTo(wag * 0.3, s * d * 0.6)
      g.lineTo(wag * 0.6, s * (d * 0.55 + len * 1.1))
      g.strokeStyle = '#d94a70'
      g.stroke()
    }
    g.restore()
    return
  }
  g.beginPath()
  if (mood === 'wow') {
    g.ellipse(x, y + s * 0.5, s * 0.62, s * 0.88, 0, 0, TAU)
    g.fillStyle = MOUTH
    g.fill()
    g.stroke()
  } else if (mood === 'silly') {
    g.moveTo(x - s * 1.5, y)
    g.bezierCurveTo(x - s * 0.8, y + s, x - s * 0.2, y - s, x + s * 0.5, y + s * 0.1)
    g.stroke()
    g.beginPath()
    g.ellipse(x + s * 1.0, y + s * 0.6, s * 0.55, s * 0.85, -0.6 + Math.sin(t * 20) * 0.2, 0, TAU)
    g.fillStyle = TONGUE
    g.fill()
    g.lineWidth = Math.max(2, s * 0.26)
    g.stroke()
  } else if (mood === 'grumpy') {
    g.arc(x, y + s * 1.3, s, Math.PI * 1.2, Math.PI * 1.8)
    g.stroke()
  } else if (mood === 'smug') {
    g.moveTo(x - s * 0.9, y + s * 0.1)
    g.quadraticCurveTo(x + s * 0.2, y + s * 0.9, x + s * 1.1, y - s * 0.35)
    g.stroke()
  } else if (mood === 'dizzy') {
    g.moveTo(x - s * 1.1, y + s * 0.3)
    g.quadraticCurveTo(x - s * 0.55, y - s * 0.4, x, y + s * 0.3)
    g.quadraticCurveTo(x + s * 0.55, y + s, x + s * 1.1, y + s * 0.3)
    g.stroke()
  } else if (mood === 'sleep') {
    g.ellipse(x, y + s * 0.4, s * 0.32, s * 0.38, 0, 0, TAU)
    g.fillStyle = MOUTH
    g.fill()
  } else {
    g.moveTo(x - s * 0.7, y + s * 0.3)
    g.lineTo(x + s * 0.7, y + s * 0.3)
    g.stroke()
  }
}

// Brown splats that show up one by one as `mud` climbs. Each is x, y, radius.
function mudOn(g: Ctx, spots: readonly number[], mud: number, dy = 0): void {
  if (mud < 0.04) return
  const n = spots.length / 3
  const show = Math.max(1, Math.ceil(n * Math.min(1, mud)))
  g.globalAlpha = clamp(mud * 1.6, 0, 1)
  for (let i = 0; i < show; i++) {
    const x = spots[i * 3]!
    const y = spots[i * 3 + 1]! + dy
    const r = spots[i * 3 + 2]!
    g.fillStyle = MUD_A
    g.beginPath()
    g.arc(x, y, r, 0, TAU)
    g.arc(x + r * 0.7, y + r * 0.35, r * 0.6, 0, TAU)
    g.arc(x - r * 0.5, y + r * 0.6, r * 0.5, 0, TAU)
    g.fill()
    g.fillStyle = MUD_B
    g.beginPath()
    g.arc(x - r * 0.25, y - r * 0.25, r * 0.38, 0, TAU)
    g.fill()
  }
  g.globalAlpha = 1
}

function coneHat(g: Ctx, y: number): void {
  poly(g, [-15, y - 2, 15, y - 6, 5, y - 50], '#e8a95b', 3.5)
  g.strokeStyle = '#b97a34'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(-7, y - 14)
  g.lineTo(9, y - 20)
  g.moveTo(-2, y - 26)
  g.lineTo(8, y - 34)
  g.stroke()
  blob(g, -15, y + 15, 6, 10, '#ff9ec4', 0, 3)
  blob(g, 14, y + 19, 5, 9, '#ff9ec4', 0, 3)
  blob(g, 0, y + 4, 27, 15, '#ff9ec4', 0, 3.5)
  blob(g, -9, y, 8, 4, '#ffd0e4', -0.3, 0)
}

// ---------------------------------------------------------------- the kids

interface KidLook {
  skin: string
  hair: 'pigtails' | 'puffs' | 'helmet'
  hairCol: string
  outfit: 'dress' | 'gown' | 'armour'
  main: string
  dark: string
  light: string
  tights: string
  bootL: string
  bootR: string
  cape: string
  crown: 'tilt' | 'big' | 'none'
  freckles: boolean
}

const PRINCESS: KidLook = { skin: '#ffdcbc', hair: 'pigtails', hairCol: '#d4622b', outfit: 'dress', main: '#ff78b4', dark: '#e8459a', light: '#ffc4e0', tights: '#ffffff', bootL: '#ffd23f', bootR: '#41c9c0', cape: '', crown: 'tilt', freckles: true }
const QUEEN: KidLook = { skin: '#b9774c', hair: 'puffs', hairCol: '#3a2030', outfit: 'gown', main: '#8f6be0', dark: '#6a45c4', light: '#cdbcff', tights: '#f7f2ff', bootL: '#ff5d8f', bootR: '#ff5d8f', cape: '#e8455a', crown: 'big', freckles: false }
const KNIGHT: KidLook = { skin: '#f6cfa4', hair: 'helmet', hairCol: '#8a5a3c', outfit: 'armour', main: '#bcc7d6', dark: '#8d9bb0', light: '#e9eff6', tights: '#6f7f99', bootL: '#8a5a3c', bootR: '#8a5a3c', cape: '', crown: 'none', freckles: true }

const KID_MUD = [-28, -56, 13, 12, -50, 16, 34, -64, 10, -8, -76, 9, -44, -42, 9, 26, -40, 8]
const KID_FACE_MUD = [-20, 12, 7, 15, -20, 6, 22, 16, 5]

function drawKid(g: Ctx, p: Pose, L: KidLook): void {
  const t = p.t
  const drop = 34 * p.sit
  const waistY = -90 + drop
  const headY = -138 + drop
  const armour = L.outfit === 'armour'

  if (L.cape) {
    const flare = 50 + p.air * 16 + p.dangle * 6
    poly(g, [-22, waistY - 18, 22, waistY - 18, flare + p.sway * 10, -22 + drop * 0.7, -flare + p.sway * 10, -22 + drop * 0.7], L.cape)
  }

  // Legs and boots.
  for (const side of [-1, 1]) {
    const ph = t * 13 + side * 1.6
    const kx = Math.cos(ph) * 6 * p.kick
    const ky = Math.sin(ph) * 10 * p.kick
    const fx = lerp(side * 16, side * 42, p.sit) + side * 16 * p.air + kx
    const fy = lerp(-9, -11, p.sit) + ky + p.dangle * 8
    limb(g, side * 14, -44 + drop, fx, fy - (1 - p.sit) * 4, 11, L.tights)
    const boot = side < 0 ? L.bootL : L.bootR
    if (p.sit > 0.5) {
      blob(g, fx + side * 2, fy, 13, 15, boot)
      blob(g, fx + side * 2, fy + 1, 7, 9, 'rgba(60,30,50,0.28)', 0, 0)
    } else blob(g, fx + side * 4, fy, 17, 11, boot)
  }

  if (armour) {
    g.beginPath()
    g.roundRect(-29, waistY - 22, 58, 62, 10)
    g.fillStyle = L.main
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = OUT
    g.stroke()
    g.fillStyle = L.dark
    g.fillRect(-27, waistY + 22, 54, 8)
    g.fillStyle = L.light
    g.fillRect(-22, waistY - 16, 8, 30)
    // A crayoned heart: the armour is a cardboard box.
    g.fillStyle = '#ff5d6c'
    g.beginPath()
    g.moveTo(4, waistY + 14)
    g.bezierCurveTo(-14, waistY - 2, -2, waistY - 14, 4, waistY - 4)
    g.bezierCurveTo(10, waistY - 14, 22, waistY - 2, 4, waistY + 14)
    g.fill()
    mudOn(g, KID_MUD, p.mud * 0.8, drop + 14)
  } else {
    const gown = L.outfit === 'gown'
    const hemW = (gown ? 58 : 62) * (1 + 0.16 * p.sit + 0.22 * p.air + 0.06 * p.dangle)
    const hemY = (gown ? -20 : -31) + drop * 0.8 - p.air * 9
    const sw = p.sway * 8
    g.beginPath()
    g.moveTo(-19, waistY)
    g.bezierCurveTo(-30, waistY + 16, -hemW + sw, hemY - 30, -hemW + sw, hemY)
    const n = 5
    for (let i = 0; i < n; i++) {
      const x0 = -hemW + (2 * hemW * i) / n + sw
      const x1 = -hemW + (2 * hemW * (i + 1)) / n + sw
      g.quadraticCurveTo((x0 + x1) / 2, hemY + 13, x1, hemY)
    }
    g.bezierCurveTo(hemW + sw, hemY - 30, 30, waistY + 16, 19, waistY)
    g.closePath()
    g.fillStyle = L.main
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = OUT
    g.stroke()
    // A lighter ruffle above the hem and a few spots.
    g.beginPath()
    for (let i = 0; i < n; i++) {
      const x0 = -hemW * 0.9 + (1.8 * hemW * i) / n + sw
      const x1 = -hemW * 0.9 + (1.8 * hemW * (i + 1)) / n + sw
      g.moveTo(x0 + 3, hemY - 13)
      g.quadraticCurveTo((x0 + x1) / 2, hemY - 2, x1 - 3, hemY - 13)
    }
    g.strokeStyle = L.light
    g.lineWidth = 5
    g.stroke()
    g.fillStyle = L.light
    for (const [dx, dy] of [[-24, -38], [4, -30], [28, -42], [-6, -52]] as const) {
      g.beginPath()
      g.arc(dx * (hemW / 62) + sw * 0.6, hemY + dy + 31, 4, 0, TAU)
      g.fill()
    }
    mudOn(g, KID_MUD, p.mud, drop * 0.85)
    // Bodice.
    g.beginPath()
    g.roundRect(-20, waistY - 22, 40, 27, 9)
    g.fillStyle = L.dark
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = OUT
    g.stroke()
    g.fillStyle = L.light
    g.fillRect(-18, waistY - 1, 36, 4)
    if (gown) {
      for (let i = -2; i <= 2; i++) blob(g, i * 11, waistY - 21, 8, 7, '#ffffff', 0, 2.5)
    }
  }

  const armsUp = p.arms > 0.15
  const drawArms = (): void => {
    const a = clamp(p.arms, -1, 1)
    for (const side of [-1, 1]) {
      const flail = Math.sin(t * 11 + side * 1.3) * 0.22 * Math.max(p.kick, p.air * 0.7)
      const th = lerp(1.15, -1.15, (a + 1) / 2) + flail
      const sx = side * 21
      const sy = waistY - 14
      const hx = sx + side * Math.cos(th) * 36
      const hy = sy + Math.sin(th) * 36
      limb(g, sx, sy, hx, hy, 9, armour ? L.dark : L.skin)
      if (armour && side > 0) {
        // The wooden sword.
        limb(g, hx, hy, hx + 8, hy - 46, 6, '#d9a066')
        limb(g, hx - 6, hy - 12, hx + 16, hy - 14, 5, '#a8713c')
      }
      blob(g, hx, hy, 8, 8, L.skin, 0, 3)
      blob(g, sx, sy, 11, 10, armour ? L.main : L.light, 0, 3.5)
    }
  }
  if (!armsUp) drawArms()

  // Head group: it lags the body a little.
  g.save()
  g.translate(0, waistY - 16)
  g.rotate(p.sway * 0.14)
  g.translate(0, -(waistY - 16))
  if (L.hair === 'pigtails') {
    for (const side of [-1, 1]) {
      const bob = Math.sin(t * 3 + side) * 2 - p.kick * Math.sin(t * 13 + side) * 4
      blob(g, side * 49 + p.sway * 12, headY + 8 + bob, 15, 20, L.hairCol, side * 0.35 - p.sway * 0.5)
      blob(g, side * 39, headY - 3, 6, 6, '#41c9c0', 0, 3)
    }
    blob(g, 0, headY - 2, 41, 39, L.hairCol)
  } else if (L.hair === 'puffs') {
    for (const side of [-1, 1]) blob(g, side * 37 + p.sway * 8, headY - 24, 23, 22, L.hairCol)
    blob(g, 0, headY - 2, 41, 39, L.hairCol)
  }
  blob(g, 0, headY, 38, 37, L.skin)
  if (L.hair !== 'helmet') {
    // Fringe.
    g.beginPath()
    g.arc(0, headY, 38.5, Math.PI * 1.06, Math.PI * 1.94)
    g.lineTo(23, headY - 15)
    g.lineTo(12, headY - 24)
    g.lineTo(1, headY - 14)
    g.lineTo(-11, headY - 24)
    g.lineTo(-24, headY - 15)
    g.closePath()
    g.fillStyle = L.hairCol
    g.fill()
    g.lineWidth = 3.5
    g.strokeStyle = OUT
    g.stroke()
  }
  if (p.soot > 0.02) blob(g, 0, headY, 35, 34, `rgba(48,38,48,${(0.82 * clamp(p.soot, 0, 1)).toFixed(2)})`, 0, 0)
  // Cheeks and freckles.
  g.fillStyle = 'rgba(255,110,140,0.4)'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.arc(side * 25, headY + 15, 8, 0, TAU)
    g.fill()
  }
  if (L.freckles) {
    g.fillStyle = 'rgba(170,90,50,0.55)'
    for (const side of [-1, 1]) {
      for (const [dx, dy] of [[21, 9], [27, 12], [23, 15]] as const) g.fillRect(side * dx - 1.2, headY + dy - 1.2, 2.4, 2.4)
    }
  }
  const eyeY = headY + 3
  const er = L.hair === 'helmet' ? 8.5 : 9.5
  brows(g, 0, eyeY, er, 15, p.mood, L.hair === 'helmet' ? OUT : L.hairCol === '#3a2030' ? '#2a1420' : '#8a3d18')
  eyeAt(g, -15, eyeY, er, p.mood, p.lookX, p.lookY, p.blink, -1)
  eyeAt(g, 15, eyeY, er, p.mood, p.lookX, p.lookY, p.blink, 1)
  mouth(g, 0, headY + 19, 7.5, p.mood, t, true)
  mudOn(g, KID_FACE_MUD, p.mud, headY)

  if (L.hair === 'helmet') {
    // A pot helmet with a face window; the visor drops for the bonk.
    g.beginPath()
    g.arc(0, headY - 2, 44, Math.PI, 0)
    g.lineTo(44, headY + 30)
    g.lineTo(-44, headY + 30)
    g.closePath()
    g.roundRect(-29, headY - 11, 58, 42, 10)
    g.fillStyle = L.main
    g.fill('evenodd')
    g.lineWidth = 4
    g.strokeStyle = OUT
    g.stroke()
    g.fillStyle = L.light
    g.fillRect(-36, headY - 30, 9, 16)
    const shut = clamp(p.trick, 0, 1)
    const vy = headY - 34 + shut * 26
    g.beginPath()
    g.roundRect(-34, vy, 68, 24, 8)
    g.fillStyle = L.dark
    g.fill()
    g.stroke()
    g.strokeStyle = OUT
    g.lineWidth = 3
    g.beginPath()
    for (let i = -2; i <= 2; i++) {
      g.moveTo(i * 11, vy + 7)
      g.lineTo(i * 11, vy + 17)
    }
    g.stroke()
    // Plume.
    const pl = p.sway * 16
    tube(g, 0, headY - 46, -6, headY - 74, -30 + pl, headY - 78, -44 + pl * 1.5, headY - 58, 10, '#ff5d6c')
  }
  if (p.crown && L.crown === 'tilt') drawCrown(g, 9, headY - 31, 48, 31, 0.2 + p.sway * 0.2)
  else if (L.crown === 'big') drawCrown(g, 0, headY - 24 + Math.sin(t * 2) * 1.5, 66, 38, -0.06 + p.sway * 0.25)
  if (p.cone) coneHat(g, headY - 36)
  if (L.outfit === 'gown' && p.trick > 0.02) sprite(g, '🎺', 36, headY + 14, 70 * clamp(p.trick * 2, 0, 1), -0.35 + Math.sin(t * 30) * 0.04)
  g.restore()

  if (armsUp) drawArms()
}

// ------------------------------------------------------------------ the cat

const CAT_FUR = '#fff6e6'
const CAT_PATCH = '#ff9d42'
const CAT_MUD = [-12, -30, 12, 14, -44, 10, 4, -10, 9]
const CAT_HEAD_MUD = [18, -14, 9, -24, 12, 7]

function catEye(g: Ctx, x: number, y: number, r: number, mood: Mood, lx: number, ly: number, blink: number): void {
  g.lineCap = 'round'
  if (mood === 'joy' || mood === 'smug' || mood === 'yum' || mood === 'sleep' || mood === 'dizzy' || blink > 0.5) {
    g.strokeStyle = OUT
    g.lineWidth = Math.max(2.5, r * 0.4)
    g.beginPath()
    if (mood === 'dizzy') {
      g.moveTo(x - r * 0.6, y - r * 0.6)
      g.lineTo(x + r * 0.6, y + r * 0.6)
      g.moveTo(x + r * 0.6, y - r * 0.6)
      g.lineTo(x - r * 0.6, y + r * 0.6)
    } else if (mood === 'sleep' || blink > 0.5) g.arc(x, y - r * 0.25, r * 0.85, Math.PI * 0.1, Math.PI * 0.9)
    else g.arc(x, y + r * 0.4, r * 0.9, Math.PI * 1.1, Math.PI * 1.9)
    g.stroke()
    return
  }
  const wide = mood === 'wow'
  const open = mood === 'grumpy' || mood === 'plain' ? 0.6 : 1
  const rr = r * (wide ? 1.2 : 1)
  g.beginPath()
  g.ellipse(x, y, rr, rr * open, 0, 0, TAU)
  g.fillStyle = '#b6ee4f'
  g.fill()
  g.lineWidth = Math.max(2, r * 0.22)
  g.strokeStyle = OUT
  g.stroke()
  const px = x + lx * rr * 0.34
  const py = y + ly * rr * 0.3 * open
  g.beginPath()
  g.ellipse(px, py, rr * (wide ? 0.62 : 0.24), rr * 0.8 * open, 0, 0, TAU)
  g.fillStyle = '#1e1428'
  g.fill()
  g.beginPath()
  g.arc(px - rr * 0.22, py - rr * 0.3 * open, rr * 0.2, 0, TAU)
  g.fillStyle = '#ffffff'
  g.fill()
}

function drawCat(g: Ctx, p: Pose): void {
  const d = p.dangle
  const a = p.air
  const t = p.t
  const headY = -72 - 62 * d
  const top = headY + 20
  const bcy = (top - 2) / 2 + 4
  const bry = (-2 - top) / 2 + 8
  const brx = 35 - 9 * d + p.puff * 5
  const sway = p.sway

  // Tail: curled up when sitting, limp when dangling, a bottle brush in the air.
  const swish = Math.sin(t * 2.4 + p.seed) * 10 + sway * 14
  const mixT = (s: number, dg: number, ar: number): number => lerp(lerp(s, dg, d), ar, a)
  const tw = 10 + p.puff * 9
  const tx3 = mixT(52 + swish * 0.6, 14 + sway * 22, 46)
  const ty3 = mixT(-76, 56, -104)
  tube(g, mixT(24, 8, 18), mixT(-10, -8, -14), mixT(66, 14, 26), mixT(-6, 14, -40), mixT(74, 10 + sway * 14, 38), mixT(-52 + swish, 36, -70), tx3, ty3, tw, CAT_FUR)
  blob(g, tx3, ty3, tw * 0.62, tw * 0.62, CAT_PATCH, 0, 3)

  // Hind legs.
  for (const side of [-1, 1]) {
    const fx = mixT(side * 23, side * 15 + sway * 7, side * 50)
    const fy = mixT(-6, 24 + Math.sin(t * 5 + side) * 3, 8)
    if (d + a > 0.15) limb(g, side * 15, -12, fx, fy, 11, CAT_FUR)
    blob(g, fx, fy, lerp(14, 10, Math.max(d, a)), 9, CAT_FUR)
  }

  // Body, with the fur on end when it is frightened.
  if (p.puff > 0.08) {
    g.beginPath()
    const n = 22
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU
      const k = i % 2 === 0 ? 1 + 0.2 * p.puff : 1
      const x = Math.cos(ang) * brx * k
      const y = bcy + Math.sin(ang) * bry * k
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.closePath()
    g.lineJoin = 'round'
    g.fillStyle = CAT_FUR
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = OUT
    g.stroke()
  } else blob(g, 0, bcy, brx, bry, CAT_FUR)
  blob(g, 14, bcy - 6, 10, 13, CAT_PATCH, 0.3, 0)
  mudOn(g, CAT_MUD, p.mud, -d * 30)

  // Front legs.
  for (const side of [-1, 1]) {
    const sx = mixT(side * 11, side * 14, side * 22)
    const sy = mixT(-38, headY + 36, headY + 34)
    const fx = mixT(side * 11, side * 19 + sway * 5, side * 54)
    const fy = mixT(-6, headY + 76, headY + 16)
    limb(g, sx, sy, fx, fy, 10, CAT_FUR)
    blob(g, fx, fy + 1, 9, 7, CAT_FUR, 0, 3.5)
  }

  // Head.
  g.save()
  g.translate(0, headY + 26)
  g.rotate(sway * 0.16)
  g.translate(0, -(headY + 26))
  const flat = p.mood === 'grumpy' ? 1 : p.puff * 0.6
  for (const side of [-1, 1]) {
    const tipX = side * (36 + 16 * flat) + sway * 6
    const tipY = headY - 58 + 22 * flat
    poly(g, [side * 12, headY - 26, side * 39, headY - 8, tipX, tipY], side < 0 ? CAT_PATCH : CAT_FUR)
    poly(g, [side * 20, headY - 26, side * 33, headY - 18, lerp(side * 26, tipX, 0.72), lerp(headY - 22, tipY, 0.72)], '#ffb3c7', 0)
  }
  blob(g, 0, headY, 42, 34, CAT_FUR)
  poly(g, [-41, headY + 2, -52, headY + 12, -38, headY + 14], CAT_FUR, 3)
  poly(g, [41, headY + 2, 52, headY + 12, 38, headY + 14], CAT_FUR, 3)
  blob(g, -17, headY - 7, 17, 16, CAT_PATCH, 0, 0)
  g.strokeStyle = CAT_PATCH
  g.lineWidth = 4
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(6, headY - 30)
  g.lineTo(6, headY - 22)
  g.moveTo(16, headY - 28)
  g.lineTo(15, headY - 21)
  g.stroke()
  if (p.soot > 0.02) blob(g, 0, headY, 39, 31, `rgba(48,38,48,${(0.8 * clamp(p.soot, 0, 1)).toFixed(2)})`, 0, 0)
  const mood = p.mood
  catEye(g, -16, headY - 3, 10.5, mood, p.lookX, p.lookY, p.blink)
  catEye(g, 16, headY - 3, 10.5, mood, p.lookX, p.lookY, p.blink)
  if (mood === 'grumpy') {
    g.strokeStyle = OUT
    g.lineWidth = 3.5
    g.beginPath()
    g.moveTo(-27, headY - 19)
    g.lineTo(-8, headY - 11)
    g.moveTo(27, headY - 19)
    g.lineTo(8, headY - 11)
    g.stroke()
  }
  // Whiskers.
  g.strokeStyle = 'rgba(75,42,74,0.6)'
  g.lineWidth = 2
  g.beginPath()
  for (const side of [-1, 1]) {
    for (let k = -1; k <= 1; k++) {
      g.moveTo(side * 25, headY + 12 + k * 2)
      g.lineTo(side * 56, headY + 8 + k * 8 + p.puff * k * 4)
    }
  }
  g.stroke()
  // Nose and mouth.
  poly(g, [-5, headY + 7, 5, headY + 7, 0, headY + 13], '#ff7f9f', 2)
  g.strokeStyle = OUT
  g.lineWidth = 2.6
  g.lineCap = 'round'
  if (mood === 'wow') {
    blob(g, 0, headY + 21, 8, 9, MOUTH, 0, 2.6)
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.moveTo(-6, headY + 15)
    g.lineTo(-3, headY + 21)
    g.lineTo(-1, headY + 14)
    g.moveTo(6, headY + 15)
    g.lineTo(3, headY + 21)
    g.lineTo(1, headY + 14)
    g.fill()
  } else if (mood === 'grumpy') {
    g.beginPath()
    g.arc(0, headY + 24, 8, Math.PI * 1.2, Math.PI * 1.8)
    g.stroke()
  } else if (mood === 'plain' || mood === 'sleep') {
    g.beginPath()
    g.moveTo(-6, headY + 18)
    g.lineTo(6, headY + 18)
    g.stroke()
  } else {
    g.beginPath()
    g.arc(-6, headY + 13, 6, Math.PI * 0.1, Math.PI * 0.9)
    g.stroke()
    g.beginPath()
    g.arc(6, headY + 13, 6, Math.PI * 0.1, Math.PI * 0.9)
    g.stroke()
    if (mood === 'joy' || mood === 'yum') {
      const lick = mood === 'yum' ? Math.sin(t * 10) * 3 : 0
      blob(g, lick, headY + 22, 5, 6 + (mood === 'yum' ? 3 : 0), TONGUE, 0, 2.2)
    }
  }
  mudOn(g, CAT_HEAD_MUD, p.mud, headY)
  if (p.crown) drawCrown(g, 2, headY - 27, 36, 24, -0.14 + sway * 0.2)
  if (p.cone) coneHat(g, headY - 36)
  g.restore()
}

// --------------------------------------------------------------- the dragon

const DRAGON_MUD = [-14, -48, 13, 16, -36, 11, 2, -70, 8]
const DRAGON_HEAD_MUD = [-18, -108, 8, 20, -96, 6]

function drawDragon(g: Ctx, p: Pose): void {
  const t = p.t
  const green = '#6ed37a'
  const deep = '#3fae58'
  const sway = p.sway
  // Tail with a spade tip.
  const tx = -70 + sway * 12
  const ty = -58 + Math.sin(t * 2.2 + p.seed) * 6
  tube(g, -22, -18, -58, -6, -80, -34, tx, ty, 13, green)
  poly(g, [tx - 12, ty - 2, tx + 2, ty - 24, tx + 12, ty + 2], '#ff9d42', 3.5)
  // Wings: slow at rest, a blur in the air.
  const rate = 6 + 18 * p.air + 12 * p.dangle
  const flap = Math.sin(t * rate) * (10 + 10 * p.air)
  for (const side of [-1, 1]) {
    poly(g, [side * 26, -80, side * 74, -112 + flap, side * 66, -84 + flap * 0.5, side * 78, -62 + flap * 0.3, side * 50, -60, side * 28, -62], '#ff8fb3')
  }
  // Feet.
  for (const side of [-1, 1]) {
    const ky = Math.sin(t * 13 + side * 1.6) * 8 * p.kick
    const fx = side * (20 + 14 * p.air)
    blob(g, fx, -6 + ky + p.dangle * 8, 18, 10, deep)
    g.fillStyle = '#fff7d6'
    for (let k = -1; k <= 1; k++) {
      g.beginPath()
      g.arc(fx + k * 9 + side * 2, -1 + ky + p.dangle * 8, 3, 0, TAU)
      g.fill()
    }
  }
  blob(g, 0, -46, 40, 44, green)
  blob(g, 0, -40, 26, 30, '#fff1a8', 0, 0)
  g.strokeStyle = '#e8cf6a'
  g.lineWidth = 3
  g.beginPath()
  for (let k = 0; k < 3; k++) {
    g.moveTo(-18 + k * 2, -52 + k * 13)
    g.quadraticCurveTo(0, -46 + k * 13, 18 - k * 2, -52 + k * 13)
  }
  g.stroke()
  mudOn(g, DRAGON_MUD, p.mud)
  // Little arms.
  for (const side of [-1, 1]) {
    const up = clamp(p.arms, -1, 1)
    limb(g, side * 34, -62, side * (46 + up * 4), -46 - up * 26, 9, green)
  }
  // Head.
  g.save()
  g.translate(0, -70)
  g.rotate(sway * 0.14 - p.trick * 0.12)
  g.translate(0, 70)
  const hy = -104
  for (const side of [-1, 1]) {
    poly(g, [side * 12, hy - 30, side * 30, hy - 26, side * 26, hy - 54], '#fff1d0', 3.5)
    poly(g, [side * 36, hy - 14, side * 58, hy - 22 + sway * 4, side * 42, hy + 8], '#ff8fb3', 3.5)
  }
  poly(g, [-9, hy - 34, 0, hy - 54, 9, hy - 34], '#ff9d42', 3.5)
  blob(g, 0, hy, 43, 38, green)
  blob(g, 0, hy + 15, 28, 18, '#93e69c', 0, 0)
  if (p.soot > 0.02) blob(g, 0, hy, 40, 35, `rgba(48,38,48,${(0.8 * clamp(p.soot, 0, 1)).toFixed(2)})`, 0, 0)
  g.fillStyle = deep
  g.beginPath()
  g.arc(-7, hy + 7, 2.6, 0, TAU)
  g.arc(7, hy + 7, 2.6, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(255,110,140,0.4)'
  g.beginPath()
  g.arc(-29, hy + 8, 7, 0, TAU)
  g.arc(29, hy + 8, 7, 0, TAU)
  g.fill()
  const mood: Mood = p.trick > 0.3 ? 'wow' : p.mood
  eyeAt(g, -17, hy - 9, 10.5, mood, p.lookX, p.lookY, p.blink, -1)
  eyeAt(g, 17, hy - 9, 10.5, mood, p.lookX, p.lookY, p.blink, 1)
  mouth(g, 0, hy + 18, 7, mood, t, false)
  if (mood === 'grin' || mood === 'smug' || mood === 'plain') poly(g, [7, hy + 18, 13, hy + 17, 10, hy + 26], '#ffffff', 2)
  mudOn(g, DRAGON_HEAD_MUD, p.mud)
  if (p.cone) coneHat(g, hy - 34)
  g.restore()
}

// ------------------------------------------------------------ the frog prince

const FROG_MUD = [-16, -30, 12, 16, -22, 10]
const FROG_HEAD_MUD = [-4, -56, 8, 24, -52, 6]

function drawFrog(g: Ctx, p: Pose): void {
  const t = p.t
  const green = '#8fd94f'
  const deep = '#5fb233'
  const d = Math.max(p.dangle, p.air)
  // Hind legs: folded at rest, long and dangly in the air.
  for (const side of [-1, 1]) {
    const ky = Math.sin(t * 9 + side * 1.6) * 8 * p.kick
    if (d > 0.15) {
      const fx = side * (22 + 22 * p.air) + p.sway * 8
      const fy = 34 * d + ky - 4
      limb(g, side * 22, -14, fx, fy, 10, deep)
      blob(g, fx + side * 6, fy + 2, 17, 7, deep)
    } else {
      blob(g, side * 40, -18, 20, 15, deep, side * 0.5)
      blob(g, side * 50, -5, 21, 8, deep)
    }
  }
  blob(g, 0, -34, 44, 34, green)
  blob(g, 0, -24, 30, 21, '#eaf7b4', 0, 0)
  mudOn(g, FROG_MUD, p.mud)
  // Throat balloon for the ribbit.
  if (p.trick > 0.03) blob(g, 0, -40, 34 * p.trick, 30 * p.trick, '#fdf6c4', 0, 3.5)
  // Arms.
  for (const side of [-1, 1]) {
    const up = clamp(p.arms, -1, 1)
    const hx = side * (30 + up * 10 + d * 8)
    const hy = -6 - up * 44 + d * 6
    limb(g, side * 26, -36, hx, hy, 8, green)
    blob(g, hx, hy, 9, 6, green, 0, 3.5)
  }
  // Head with eye bumps.
  g.save()
  g.translate(0, -44)
  g.rotate(p.sway * 0.12)
  g.translate(0, 44)
  for (const side of [-1, 1]) blob(g, side * 23, -92, 17, 17, green)
  blob(g, 0, -66, 48, 30, green)
  if (p.soot > 0.02) blob(g, 0, -66, 45, 27, `rgba(48,38,48,${(0.8 * clamp(p.soot, 0, 1)).toFixed(2)})`, 0, 0)
  eyeAt(g, -23, -93, 10.5, p.mood, p.lookX, p.lookY, p.blink, -1)
  eyeAt(g, 23, -93, 10.5, p.mood, p.lookX, p.lookY, p.blink, 1)
  g.fillStyle = 'rgba(255,110,140,0.45)'
  g.beginPath()
  g.arc(-35, -60, 6, 0, TAU)
  g.arc(35, -60, 6, 0, TAU)
  g.fill()
  g.strokeStyle = OUT
  g.lineWidth = 3.2
  g.lineCap = 'round'
  const m = p.mood
  if (m === 'wow' || m === 'joy' || m === 'tongue' || m === 'yum') {
    g.beginPath()
    g.moveTo(-26, -64)
    g.quadraticCurveTo(0, -58, 26, -64)
    g.quadraticCurveTo(0, m === 'wow' ? -38 : -30, -26, -64)
    g.closePath()
    g.fillStyle = MOUTH
    g.fill()
    g.stroke()
    blob(g, 0, -50, 10, 5, TONGUE, 0, 0)
  } else if (m === 'grumpy' || m === 'dizzy') {
    g.beginPath()
    g.moveTo(-26, -56)
    g.quadraticCurveTo(0, -66, 26, -56)
    g.stroke()
  } else {
    g.beginPath()
    g.moveTo(-30, -64)
    g.quadraticCurveTo(0, -46, 30, -64)
    g.stroke()
  }
  g.fillStyle = deep
  g.beginPath()
  g.arc(-5, -74, 2, 0, TAU)
  g.arc(5, -74, 2, 0, TAU)
  g.fill()
  mudOn(g, FROG_HEAD_MUD, p.mud)
  drawCrown(g, 0, -92, 26, 18, -0.12 + p.sway * 0.2)
  if (p.cone) coneHat(g, -108)
  g.restore()
}

export function drawChar(g: Ctx, p: Pose): void {
  if (p.kind === 'princess') drawKid(g, p, PRINCESS)
  else if (p.kind === 'cat') drawCat(g, p)
  else if (p.kind === 'queen') drawKid(g, p, QUEEN)
  else if (p.kind === 'knight') drawKid(g, p, KNIGHT)
  else if (p.kind === 'dragon') drawDragon(g, p)
  else drawFrog(g, p)
}
