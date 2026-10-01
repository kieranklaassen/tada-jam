// The child and the clothes: how each thing looks on its peg and on the body.
// All shapes are hand-placed paths in a small wool-and-wood palette.

import { TAU, clamp, lerp } from '../../kit/math.ts'
import { blob, glint, hash } from './paint.ts'
import type { G } from './paint.ts'

export const C = {
  skin: '#f1cba6',
  skinDark: '#dcab85',
  cheek: '#e59a86',
  hair: '#7b5336',
  shirt: '#f4ecdb',
  shirtShade: '#dccfb6',
  trousers: '#8196a6',
  trousersDark: '#687e8f',
  sock: '#f2e7d2',
  sockStripe: '#c0705a',
  rain: '#e2b33f',
  rainDark: '#bf8f2b',
  rainLight: '#f1d078',
  wool: '#b3534b',
  woolDark: '#8d3e39',
  woolLight: '#c76f67',
  knit: '#6d909c',
  knitDark: '#53737f',
  cream: '#f5ecd9',
  wellie: '#63804f',
  wellieDark: '#496339',
  wellieLight: '#8aa573',
  leather: '#8c5c3c',
  leatherDark: '#6a4229',
  sandal: '#b98350',
  sandalDark: '#8f6136',
  straw: '#e8d190',
  strawDark: '#c9ad63',
  brass: '#b9933f',
  wood: '#d9b381',
  woodDark: '#a67c4d',
  ink: '#4a3728',
} as const

export type CoatKey = 'raincoat' | 'woolcoat'
export type HatKey = 'woolhat' | 'sunhat'
export type FeetKey = 'wellies' | 'snowboots' | 'sandals'
export type ItemKey = CoatKey | HatKey | FeetKey | 'scarf' | 'mittens'

export interface Outfit {
  coat: CoatKey | null
  // 0 open at the hem, 1 zipped to the chin.
  zip: number
  // 0 undone, 1 through its hole.
  buttons: [number, number, number]
  hat: HatKey | null
  scarf: boolean
  wound: number
  // The loose scarf end while a finger holds it, in the child's own coordinates.
  tail: { x: number; y: number } | null
  mittens: boolean
  feet: FeetKey | null
  // Per foot: 0 is half on and slouched, 1 is pulled up.
  on: [number, number]
  // Per foot: how far a finger is stretching the boot top right now.
  pull: [number, number]
}

export interface Pose {
  // 1 at rest; below is squashed, above is stretched.
  squash: number
  lean: number
  armL: number
  armR: number
  lookX: number
  lookY: number
  blink: number
  smile: number
  hot: number
  cold: number
  sockWet: number
  wet: number
  // 0..1 strength of the glint on the fastening that is still undone.
  glint: number
  t: number
}

// Where things are on the child, feet at the origin, up is negative.
export const ZIP_BOTTOM = -140
export const ZIP_TOP = -312
export const BUTTON_Y: readonly [number, number, number] = [-288, -232, -176]
export const BUTTON_X = -18
export const HEAD_Y = -400
export const NECK_Y = -336
export const FOOT_X = 33
export const TAIL_REST = { x: 46, y: -246 }

export function handAt(side: number, lift: number): [number, number] {
  return [side * (96 + lift * 46), -180 - lift * 100]
}

function rr(g: G, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  g.beginPath()
  g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
  g.fillStyle = fill
  g.fill()
}

function seg(g: G, x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.strokeStyle = color
  g.lineWidth = width
  g.stroke()
}

function button(g: G, x: number, y: number, r: number): void {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fillStyle = C.wood
  g.fill()
  g.strokeStyle = C.woodDark
  g.lineWidth = 2.5
  g.stroke()
  g.fillStyle = C.ink
  g.beginPath()
  g.arc(x - r * 0.3, y, r * 0.14, 0, TAU)
  g.arc(x + r * 0.3, y, r * 0.14, 0, TAU)
  g.fill()
  seg(g, x - r * 0.3, y, x + r * 0.3, y, 'rgba(245,236,217,0.9)', 1.6)
}

function zipTeeth(g: G, x: number, y0: number, y1: number): void {
  if (y0 - y1 < 2) return
  seg(g, x, y0, x, y1, C.brass, 6)
  g.strokeStyle = 'rgba(90,70,30,0.55)'
  g.lineWidth = 1.6
  g.beginPath()
  for (let y = y0 - 4; y > y1; y -= 8) {
    g.moveTo(x - 4, y)
    g.lineTo(x + 4, y)
  }
  g.stroke()
}

function zipPull(g: G, x: number, y: number, swing: number): void {
  rr(g, x - 8, y - 7, 16, 14, 4, C.brass)
  g.save()
  g.translate(x, y + 4)
  g.rotate(swing)
  seg(g, 0, 0, 0, 14, '#8d6f2c', 3)
  g.beginPath()
  g.arc(0, 24, 11, 0, TAU)
  g.fillStyle = C.wood
  g.fill()
  g.strokeStyle = C.woodDark
  g.lineWidth = 3
  g.stroke()
  g.beginPath()
  g.arc(0, 24, 3.4, 0, TAU)
  g.fillStyle = C.woodDark
  g.fill()
  g.restore()
}

// One boot or sandal, sole on y = 0, centred on x = 0, toe pointing to `side`.
export function drawBoot(g: G, kind: FeetKey, side: number, on: number, pull: number): void {
  const slack = 1 - on
  g.save()
  if (kind === 'sandals') {
    blob(g, side * 7, -5, 35, 10, C.sandalDark, 4, 0.04)
    blob(g, side * 7, -8, 33, 8, C.sandal, 5, 0.04)
    // Toe strap.
    g.beginPath()
    g.moveTo(side * 7 - 24, -10)
    g.quadraticCurveTo(side * 7, -34, side * 7 + 24, -10)
    g.strokeStyle = C.sandal
    g.lineWidth = 10
    g.stroke()
    // Ankle strap: hangs open until it is pressed shut.
    g.beginPath()
    g.moveTo(-side * 20, -24)
    if (on > 0.5) g.quadraticCurveTo(0, -44, side * 22, -26)
    else g.quadraticCurveTo(-side * 34, -40, -side * 44, -14 + pull * 4)
    g.strokeStyle = C.sandalDark
    g.lineWidth = 8
    g.stroke()
    rr(g, side * 22 - 6, -33, 12, 12, 3, C.brass)
    g.restore()
    return
  }
  const wellie = kind === 'wellies'
  const full = wellie ? 88 : 72
  const h = full * (0.62 + 0.38 * on) + pull * 30 * slack + pull * 8
  const w = wellie ? 48 : 54
  const base = wellie ? C.wellie : C.leather
  const dark = wellie ? C.wellieDark : C.leatherDark
  // Foot.
  blob(g, side * 8, -15, 35, 17, base, 7, 0.04)
  g.beginPath()
  g.ellipse(side * 8, -3, 36, 7, 0, 0, Math.PI)
  g.fillStyle = dark
  g.fill()
  // Shaft, flopping outwards when it is only half on.
  g.translate(0, -18)
  g.rotate(side * 0.42 * slack * Math.max(0, 1 - pull))
  g.translate(0, 18)
  g.beginPath()
  g.moveTo(-w / 2, -18)
  g.quadraticCurveTo(-w / 2 - 4 * slack, -h / 2, -w / 2 + 2, -h)
  g.lineTo(w / 2 - 2, -h)
  g.quadraticCurveTo(w / 2 + 4 * slack, -h / 2, w / 2, -18)
  g.closePath()
  g.fillStyle = base
  g.fill()
  if (wellie) {
    rr(g, -w / 2 - 1, -h - 5, w + 2, 11, 5, dark)
    seg(g, -w / 2 + 11, -h + 14, -w / 2 + 11, -34, 'rgba(190,215,165,0.5)', 5)
    for (let i = 0; i < Math.round(3 * slack); i++) seg(g, -w / 2 + 6, -30 - i * 10, w / 2 - 6, -27 - i * 10, 'rgba(50,70,40,0.35)', 2)
  } else {
    blob(g, 0, -h, w / 2 + 6, 11, C.cream, 11, 0.16, 11)
    g.strokeStyle = C.cream
    g.lineWidth = 2.5
    g.beginPath()
    for (let i = 0; i < 2; i++) {
      const y = -h + 22 + i * 14
      if (y > -24) break
      g.moveTo(-8, y)
      g.lineTo(8, y + 9)
      g.moveTo(8, y)
      g.lineTo(-8, y + 9)
    }
    g.stroke()
  }
  g.restore()
}

function wornSleeves(g: G, hands: [number, number][], color: string, cuff: string, width: number): void {
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1
    const [hx, hy] = hands[i]!
    const sx = side * 62
    const sy = -306
    const cx = lerp(sx, hx, 0.8)
    const cy = lerp(sy, hy, 0.8)
    seg(g, sx, sy, cx, cy, color, width)
    seg(g, lerp(sx, hx, 0.74), lerp(sy, hy, 0.74), cx, cy, cuff, width)
  }
}

function wornRaincoat(g: G, o: Outfit, p: Pose, hands: [number, number][]): void {
  wornSleeves(g, hands, C.rain, C.rainDark, 44)
  g.beginPath()
  g.moveTo(-66, -326)
  g.quadraticCurveTo(0, -344, 66, -326)
  g.lineTo(85, -134)
  g.quadraticCurveTo(0, -120, -85, -134)
  g.closePath()
  g.fillStyle = C.rain
  g.fill()
  // A darker side and a soft sheen: oilcloth.
  g.beginPath()
  g.moveTo(66, -326)
  g.lineTo(85, -134)
  g.quadraticCurveTo(60, -128, 52, -130)
  g.quadraticCurveTo(62, -230, 48, -330)
  g.closePath()
  g.fillStyle = 'rgba(150,100,20,0.2)'
  g.fill()
  seg(g, -52, -300, -62, -170, 'rgba(255,240,190,0.4)', 7)
  rr(g, -62, -212, 38, 9, 4, C.rainDark)
  rr(g, 24, -212, 38, 9, 4, C.rainDark)

  const yPull = lerp(ZIP_BOTTOM, ZIP_TOP, o.zip)
  const topW = (yPull - ZIP_TOP) * 0.25
  if (topW > 1) {
    const mid = (yPull + ZIP_TOP) / 2
    g.beginPath()
    g.moveTo(0, yPull)
    g.quadraticCurveTo(-topW * 0.35, mid, -topW, ZIP_TOP - 16)
    g.lineTo(topW, ZIP_TOP - 16)
    g.quadraticCurveTo(topW * 0.35, mid, 0, yPull)
    g.closePath()
    g.fillStyle = C.shirt
    g.fill()
    g.strokeStyle = C.brass
    g.lineWidth = 3.5
    g.stroke()
    // The turned-back facings.
    g.strokeStyle = C.rainDark
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(-topW - 3, ZIP_TOP - 16)
    g.quadraticCurveTo(-topW * 0.35 - 4, mid, -2, yPull)
    g.moveTo(topW + 3, ZIP_TOP - 16)
    g.quadraticCurveTo(topW * 0.35 + 4, mid, 2, yPull)
    g.stroke()
  }
  zipTeeth(g, 0, -128, yPull)
  zipPull(g, 0, yPull, Math.sin(p.t * 1.7) * 0.08)
  if (o.zip < 0.97) glint(g, 9, yPull + 20, 15, p.glint * (0.55 + 0.45 * Math.sin(p.t * 3)))
}

function gapAt(o: Outfit, i: number): number {
  return (1 - o.buttons[i]!) * 14
}

function wornWoolcoat(g: G, o: Outfit, p: Pose, hands: [number, number][]): void {
  wornSleeves(g, hands, C.wool, C.woolDark, 46)
  g.beginPath()
  g.moveTo(-68, -326)
  g.quadraticCurveTo(0, -344, 68, -326)
  g.lineTo(89, -120)
  g.quadraticCurveTo(0, -104, -89, -120)
  g.closePath()
  g.fillStyle = C.wool
  g.fill()
  g.beginPath()
  g.moveTo(68, -326)
  g.lineTo(89, -120)
  g.quadraticCurveTo(66, -112, 56, -114)
  g.quadraticCurveTo(64, -230, 50, -330)
  g.closePath()
  g.fillStyle = 'rgba(90,25,25,0.2)'
  g.fill()
  // Felted nap: a few short flecks.
  g.strokeStyle = 'rgba(255,225,215,0.22)'
  g.lineWidth = 2
  g.beginPath()
  for (let i = 0; i < 16; i++) {
    const x = -70 + hash(i * 3.3) * 140
    const y = -310 + hash(i * 7.9) * 180
    g.moveTo(x, y)
    g.lineTo(x + 5, y + 3)
  }
  g.stroke()
  rr(g, -66, -206, 36, 40, 8, 'rgba(120,45,42,0.55)')
  rr(g, 30, -206, 36, 40, 8, 'rgba(120,45,42,0.55)')

  const g0 = gapAt(o, 0)
  const g1 = gapAt(o, 1)
  const g2 = gapAt(o, 2)
  const ys = [-334, BUTTON_Y[0], BUTTON_Y[1], BUTTON_Y[2], -112]
  const gs = [g0 * 1.5 + 5, g0, g1, g2, g2 * 1.2]
  // The shirt showing between the two fronts.
  g.beginPath()
  g.moveTo(-gs[0]!, ys[0]!)
  for (let i = 1; i < 5; i++) g.lineTo(-gs[i]! + 3, ys[i]!)
  for (let i = 4; i >= 0; i--) g.lineTo(gs[i]! + 3, ys[i]!)
  g.closePath()
  g.fillStyle = C.shirt
  g.fill()
  // The overlapping edge.
  g.beginPath()
  g.moveTo(gs[0]! + 3, ys[0]!)
  for (let i = 1; i < 5; i++) g.lineTo(gs[i]! + 3, ys[i]!)
  g.strokeStyle = C.woolDark
  g.lineWidth = 3.5
  g.stroke()
  // Collar.
  for (const side of [-1, 1]) {
    g.beginPath()
    g.moveTo(side * (gs[0]! + 2), -338)
    g.lineTo(side * 54, -328)
    g.lineTo(side * (g0 + 14), -296)
    g.closePath()
    g.fillStyle = C.woolDark
    g.fill()
  }
  for (let i = 0; i < 3; i++) {
    const b = o.buttons[i]!
    const gi = gapAt(o, i)
    const y = BUTTON_Y[i]!
    // The hole, on the other front.
    if (b < 0.95) {
      g.beginPath()
      g.ellipse(17 + gi, y, 8, 3, 0, 0, TAU)
      g.fillStyle = 'rgba(70,20,20,0.75)'
      g.fill()
    }
    const e = b * b * (3 - 2 * b)
    const x = lerp(BUTTON_X - gi * 0.4, 15, e)
    const r = 15 * (1 - Math.sin(b * Math.PI) * 0.3)
    button(g, x, y, r)
    if (b < 0.05) glint(g, x + 9, y - 9, 12, p.glint * (0.55 + 0.45 * Math.sin(p.t * 3 + i * 1.3)))
  }
}

function wornScarf(g: G, o: Outfit): void {
  const end = o.tail ?? TAIL_REST
  // The left tail always hangs: short, and clear of the buttons.
  g.lineCap = 'butt'
  g.beginPath()
  g.moveTo(-30, -330)
  g.quadraticCurveTo(-46, -296, -46, -252)
  g.strokeStyle = C.knit
  g.lineWidth = 28
  g.stroke()
  seg(g, -46, -274, -46, -262, C.cream, 28)
  if (o.wound < 0.5) {
    const mx = (30 + end.x) / 2 + (end.x - 30) * 0.3
    const my = (-330 + end.y) / 2
    g.beginPath()
    g.moveTo(30, -330)
    g.quadraticCurveTo(mx, my, end.x, end.y)
    g.strokeStyle = C.knit
    g.lineWidth = 28
    g.stroke()
    const dx = end.x - mx
    const dy = end.y - my
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    seg(g, end.x - ux * 22, end.y - uy * 22, end.x - ux * 10, end.y - uy * 10, C.cream, 28)
    g.lineCap = 'round'
    g.strokeStyle = C.knitDark
    g.lineWidth = 3
    g.beginPath()
    for (let i = -2; i <= 2; i++) {
      const ox = -uy * i * 5.5
      const oy = ux * i * 5.5
      g.moveTo(end.x + ox, end.y + oy)
      g.lineTo(end.x + ox + ux * 11, end.y + oy + uy * 11)
    }
    g.stroke()
  }
  g.lineCap = 'round'
  g.strokeStyle = C.knitDark
  g.lineWidth = 3
  g.beginPath()
  for (let i = -2; i <= 2; i++) {
    g.moveTo(-46 + i * 5.5, -252)
    g.lineTo(-46 + i * 5.5, -240)
  }
  g.stroke()
}

function wornScarfBand(g: G, o: Outfit): void {
  if (o.wound >= 0.5) {
    rr(g, -52, -350, 104, 34, 15, C.knitDark)
    rr(g, -48, -358, 96, 30, 14, C.knit)
    blob(g, -34, -326, 17, 15, C.knit, 3, 0.12)
  } else {
    rr(g, -46, -354, 92, 32, 14, C.knit)
  }
  g.strokeStyle = 'rgba(245,236,217,0.55)'
  g.lineWidth = 3
  g.beginPath()
  const top = o.wound >= 0.5 ? -354 : -350
  for (let x = -36; x <= 36; x += 12) {
    g.moveTo(x - 3, top + 4)
    g.lineTo(x + 3, top + 22)
  }
  g.stroke()
}

function wornHat(g: G, hat: HatKey): void {
  if (hat === 'woolhat') {
    g.beginPath()
    g.moveTo(-69, -424)
    g.bezierCurveTo(-72, -506, 72, -506, 69, -424)
    g.closePath()
    g.fillStyle = C.knit
    g.fill()
    g.strokeStyle = 'rgba(60,90,100,0.4)'
    g.lineWidth = 3
    g.beginPath()
    for (let i = -3; i <= 3; i++) {
      g.moveTo(i * 17, -436)
      g.quadraticCurveTo(i * 15, -468, i * 7, -484)
    }
    g.stroke()
    rr(g, -74, -444, 148, 32, 14, C.cream)
    g.strokeStyle = 'rgba(109,144,156,0.4)'
    g.lineWidth = 3
    g.beginPath()
    for (let x = -62; x <= 62; x += 12.4) {
      g.moveTo(x, -438)
      g.lineTo(x, -418)
    }
    g.stroke()
    blob(g, 0, -492, 20, 19, C.cream, 6, 0.16, 11)
    return
  }
  blob(g, 0, -442, 112, 25, C.straw, 9, 0.03, 12)
  g.beginPath()
  g.ellipse(0, -436, 100, 17, 0, 0.1, Math.PI - 0.1)
  g.strokeStyle = 'rgba(160,125,50,0.35)'
  g.lineWidth = 3
  g.stroke()
  g.beginPath()
  g.moveTo(-58, -448)
  g.bezierCurveTo(-60, -516, 60, -516, 58, -448)
  g.closePath()
  g.fillStyle = C.straw
  g.fill()
  g.strokeStyle = 'rgba(160,125,50,0.3)'
  g.lineWidth = 2
  g.beginPath()
  for (let i = 1; i <= 3; i++) {
    g.moveTo(-58 + i * 5, -452 - i * 12)
    g.quadraticCurveTo(0, -462 - i * 14, 58 - i * 5, -452 - i * 12)
  }
  g.stroke()
  g.beginPath()
  g.moveTo(-59, -462)
  g.quadraticCurveTo(0, -452, 59, -462)
  g.lineTo(58, -448)
  g.quadraticCurveTo(0, -438, -58, -448)
  g.closePath()
  g.fillStyle = C.wool
  g.fill()
}

function mitten(g: G, hx: number, hy: number, side: number): void {
  blob(g, hx, hy + 5, 24, 28, C.knit, 2, 0.05)
  g.beginPath()
  g.ellipse(hx - side * 21, hy - 2, 9, 13, side * 0.5, 0, TAU)
  g.fillStyle = C.knit
  g.fill()
  rr(g, hx - 21, hy - 27, 42, 15, 6, C.cream)
}

// The child, feet on (x, y). Everything it wears comes from `o`.
export function drawChild(g: G, x: number, y: number, s: number, o: Outfit, p: Pose): void {
  const sq = clamp(p.squash, 0.6, 1.4)
  g.save()
  g.translate(x + (p.cold > 0.05 ? Math.sin(p.t * 40) * 1.8 * p.cold : 0), y)
  g.rotate(p.lean)
  g.scale(s / Math.sqrt(sq), s * sq)

  // Legs.
  rr(g, -50, -166, 100, 44, 16, C.trousers)
  for (const side of [-1, 1]) rr(g, side * 31 - 20, -156, 40, 132, 15, C.trousers)
  seg(g, 0, -128, 0, -44, C.trousersDark, 3)
  // Socks.
  // Sandals go on bare feet.
  const bare = o.feet === 'sandals'
  for (const side of [-1, 1]) {
    rr(g, side * 31 - 17, -44, 34, 34, 9, bare ? C.skin : C.sock)
    blob(g, side * 37, -14, 29, 16, bare ? C.skin : C.sock, 3, 0.04)
    if (!bare) {
      seg(g, side * 31 - 13, -36, side * 31 + 13, -36, C.sockStripe, 4)
      seg(g, side * 31 - 13, -27, side * 31 + 13, -27, C.sockStripe, 4)
    }
    if (p.sockWet > 0.02 && !bare) {
      g.globalAlpha = Math.min(0.5, p.sockWet * 0.5)
      rr(g, side * 31 - 17, -40, 34, 30, 9, '#5d6f7a')
      blob(g, side * 37, -14, 29, 16, '#5d6f7a', 3, 0.04)
      g.globalAlpha = 1
    }
  }
  if (o.feet) {
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1
      g.save()
      g.translate(side * FOOT_X, 0)
      drawBoot(g, o.feet, side, o.on[i]!, o.pull[i]!)
      g.restore()
    }
  }

  // Shirt.
  g.beginPath()
  g.moveTo(-60, -324)
  g.quadraticCurveTo(0, -340, 60, -324)
  g.lineTo(72, -152)
  g.quadraticCurveTo(0, -138, -72, -152)
  g.closePath()
  g.fillStyle = C.shirt
  g.fill()
  seg(g, -40, -190, 40, -190, 'rgba(193,112,90,0.35)', 4)
  seg(g, -42, -176, 42, -176, 'rgba(109,144,156,0.35)', 4)

  const hands: [number, number][] = [handAt(-1, p.armL), handAt(1, p.armR)]
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1
    const [hx, hy] = hands[i]!
    seg(g, side * 62, -306, lerp(side * 62, hx, 0.86), lerp(-306, hy, 0.86), C.shirt, 34)
    g.beginPath()
    g.arc(hx, hy, 19, 0, TAU)
    g.fillStyle = C.skin
    g.fill()
  }
  // The shirt's shaded side, so the body is not a flat cut-out.
  g.beginPath()
  g.moveTo(60, -324)
  g.lineTo(72, -152)
  g.quadraticCurveTo(50, -146, 44, -148)
  g.quadraticCurveTo(54, -240, 44, -326)
  g.closePath()
  g.fillStyle = 'rgba(160,130,90,0.16)'
  g.fill()

  if (o.coat === 'raincoat') wornRaincoat(g, o, p, hands)
  else if (o.coat === 'woolcoat') wornWoolcoat(g, o, p, hands)
  if (o.mittens) {
    mitten(g, hands[0]![0], hands[0]![1], -1)
    mitten(g, hands[1]![0], hands[1]![1], 1)
  }

  // Neck, then anything that sits behind the chin.
  rr(g, -17, -352, 34, 30, 8, C.skinDark)
  if (o.coat === 'raincoat') blob(g, 0, -332, 60, 17, C.rainDark, 5, 0.05)
  if (o.scarf) wornScarf(g, o)

  // Head.
  g.beginPath()
  g.arc(0, HEAD_Y - 5, 71, 0, TAU)
  g.fillStyle = C.hair
  g.fill()
  g.beginPath()
  g.arc(0, HEAD_Y + 3, 65, 0, TAU)
  g.fillStyle = C.skin
  g.fill()
  // Ears.
  for (const side of [-1, 1]) {
    g.beginPath()
    g.ellipse(side * 65, HEAD_Y + 6, 9, 13, 0, 0, TAU)
    g.fillStyle = C.skin
    g.fill()
  }
  // Fringe.
  g.beginPath()
  g.moveTo(-68, HEAD_Y - 8)
  g.arc(0, HEAD_Y - 3, 68, Math.PI + 0.08, TAU - 0.08)
  g.quadraticCurveTo(50, HEAD_Y - 30, 24, HEAD_Y - 34)
  g.quadraticCurveTo(6, HEAD_Y - 50, -12, HEAD_Y - 36)
  g.quadraticCurveTo(-42, HEAD_Y - 28, -68, HEAD_Y - 8)
  g.closePath()
  g.fillStyle = C.hair
  g.fill()

  // Cheeks: rosy, redder when hot, grey-blue when cold.
  for (const side of [-1, 1]) {
    g.beginPath()
    g.arc(side * 40, HEAD_Y + 26, 13 + p.hot * 3, 0, TAU)
    g.fillStyle = p.cold > 0.3 ? `rgba(150,170,200,${0.3 + p.cold * 0.3})` : `rgba(229,140,120,${0.3 + p.hot * 0.5})`
    g.fill()
  }
  // Eyes.
  const ex = p.lookX * 4.5
  const ey = p.lookY * 3.5
  for (const side of [-1, 1]) {
    if (p.blink > 0.5) {
      seg(g, side * 23 - 7 + ex, HEAD_Y + 6 + ey, side * 23 + 7 + ex, HEAD_Y + 6 + ey, C.ink, 3.5)
    } else {
      g.beginPath()
      g.ellipse(side * 23 + ex, HEAD_Y + 5 + ey, 5.6, 7.4, 0, 0, TAU)
      g.fillStyle = C.ink
      g.fill()
    }
  }
  // Mouth: calm by default.
  g.beginPath()
  if (p.cold > 0.3) {
    g.moveTo(-9, HEAD_Y + 33)
    g.quadraticCurveTo(-4, HEAD_Y + 30, 0, HEAD_Y + 33)
    g.quadraticCurveTo(4, HEAD_Y + 36, 9, HEAD_Y + 33)
  } else {
    g.moveTo(-9 - p.smile * 3, HEAD_Y + 31)
    g.quadraticCurveTo(0, HEAD_Y + 34 + p.smile * 9, 9 + p.smile * 3, HEAD_Y + 31)
  }
  g.strokeStyle = '#9a4f43'
  g.lineWidth = 3.4
  g.stroke()

  if (p.hot > 0.05) {
    g.fillStyle = `rgba(140,190,215,${Math.min(1, p.hot)})`
    for (const side of [-1, 1]) {
      const slide = (p.t * 14 + side * 5) % 22
      g.beginPath()
      g.ellipse(side * 58, HEAD_Y - 14 + slide, 4.5, 7, 0, 0, TAU)
      g.fill()
    }
  }
  if (p.wet > 0.05) {
    g.fillStyle = `rgba(120,165,195,${Math.min(0.9, p.wet)})`
    for (let i = 0; i < 7; i++) {
      const dx = -56 + hash(i * 5.1) * 112
      const top = i < 3 ? HEAD_Y - 62 : -310
      const run = (p.t * (16 + i * 3) + i * 31) % (i < 3 ? 40 : 120)
      g.beginPath()
      g.ellipse(dx, top + run, 4, 6.5, 0, 0, TAU)
      g.fill()
    }
  }

  if (o.scarf) wornScarfBand(g, o)
  if (o.hat) wornHat(g, o.hat)
  g.restore()
}

// A thing as it hangs on its peg or stands on the shelf or bench. Hung things
// have the peg at the origin; standing things have their base there.
export function drawItem(g: G, key: ItemKey, t: number): void {
  if (key === 'raincoat' || key === 'woolcoat') {
    const rain = key === 'raincoat'
    const base = rain ? C.rain : C.wool
    const dark = rain ? C.rainDark : C.woolDark
    seg(g, 0, 2, 0, 16, dark, 5)
    // Sleeves hang down the sides.
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * 40, 36)
      g.quadraticCurveTo(side * 66, 90, side * 60, 168)
      g.strokeStyle = base
      g.lineWidth = 30
      g.stroke()
      seg(g, side * 61, 158, side * 60, 170, dark, 30)
    }
    g.beginPath()
    g.moveTo(-44, 30)
    g.quadraticCurveTo(0, 12, 44, 30)
    g.lineTo(rain ? 56 : 60, rain ? 208 : 218)
    g.quadraticCurveTo(0, rain ? 218 : 230, rain ? -56 : -60, rain ? 208 : 218)
    g.closePath()
    g.fillStyle = base
    g.fill()
    g.beginPath()
    g.moveTo(44, 30)
    g.lineTo(rain ? 56 : 60, rain ? 208 : 218)
    g.quadraticCurveTo(40, 216, 34, 214)
    g.quadraticCurveTo(42, 120, 30, 26)
    g.closePath()
    g.fillStyle = rain ? 'rgba(150,100,20,0.2)' : 'rgba(90,25,25,0.2)'
    g.fill()
    if (rain) {
      // The hood, folded forward over the peg.
      blob(g, 0, 30, 40, 24, C.rainDark, 3, 0.05)
      blob(g, 0, 26, 30, 15, C.rain, 4, 0.05)
      seg(g, -34, 60, -42, 170, 'rgba(255,240,190,0.4)', 6)
      rr(g, -44, 128, 30, 8, 4, C.rainDark)
      rr(g, 14, 128, 30, 8, 4, C.rainDark)
      zipTeeth(g, 0, 208, 196)
      // Hanging open: the two fronts fall a little apart.
      g.beginPath()
      g.moveTo(0, 196)
      g.quadraticCurveTo(-5, 120, -9, 44)
      g.lineTo(9, 44)
      g.quadraticCurveTo(5, 120, 0, 196)
      g.fillStyle = 'rgba(120,80,15,0.45)'
      g.fill()
      zipPull(g, 0, 190, Math.sin(t * 1.3) * 0.1)
    } else {
      for (const side of [-1, 1]) {
        g.beginPath()
        g.moveTo(side * 4, 22)
        g.lineTo(side * 40, 32)
        g.lineTo(side * 12, 66)
        g.closePath()
        g.fillStyle = C.woolDark
        g.fill()
      }
      g.beginPath()
      g.moveTo(3, 40)
      g.quadraticCurveTo(7, 130, 4, 222)
      g.strokeStyle = C.woolDark
      g.lineWidth = 3.5
      g.stroke()
      rr(g, -48, 138, 30, 34, 7, 'rgba(120,45,42,0.55)')
      rr(g, 22, 138, 30, 34, 7, 'rgba(120,45,42,0.55)')
      for (let i = 0; i < 3; i++) button(g, -13, 84 + i * 44, 12)
    }
    return
  }
  if (key === 'scarf') {
    g.lineCap = 'butt'
    g.beginPath()
    g.moveTo(-14, 6)
    g.quadraticCurveTo(-20, 90, -16, 182)
    g.strokeStyle = C.knit
    g.lineWidth = 28
    g.stroke()
    g.beginPath()
    g.moveTo(14, 6)
    g.quadraticCurveTo(22, 80, 17, 150)
    g.strokeStyle = C.knitDark
    g.stroke()
    seg(g, -16.5, 152, -16, 166, C.cream, 28)
    seg(g, 18, 122, 17.5, 136, C.cream, 28)
    g.lineCap = 'round'
    blob(g, 0, 6, 29, 13, C.knit, 2, 0.06)
    g.strokeStyle = C.knitDark
    g.lineWidth = 3
    g.beginPath()
    for (let i = -2; i <= 2; i++) {
      g.moveTo(-16 + i * 5.5, 182)
      g.lineTo(-16 + i * 5.5, 194)
      g.moveTo(17 + i * 5.5, 150)
      g.lineTo(17 + i * 5.5, 162)
    }
    g.stroke()
    return
  }
  if (key === 'mittens') {
    g.strokeStyle = C.cream
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(-24, 74)
    g.quadraticCurveTo(-8, 20, 0, 2)
    g.quadraticCurveTo(10, 30, 22, 96)
    g.stroke()
    for (const [mx, my, side] of [
      [-24, 100, -1],
      [22, 122, 1],
    ] as const) {
      rr(g, mx - 20, my - 30, 40, 15, 6, C.cream)
      blob(g, mx, my + 6, 23, 29, C.knit, 2, 0.05)
      g.beginPath()
      g.ellipse(mx + side * 21, my + 2, 9, 13, -side * 0.5, 0, TAU)
      g.fillStyle = C.knit
      g.fill()
    }
    return
  }
  if (key === 'woolhat' || key === 'sunhat') {
    g.save()
    g.translate(0, key === 'woolhat' ? 412 : 418)
    wornHat(g, key)
    g.restore()
    return
  }
  for (const side of [-1, 1]) {
    g.save()
    g.translate(side * 27, 0)
    drawBoot(g, key, side, 1, 0)
    g.restore()
  }
}

// Bounds of an item around its anchor, for picking it up.
export const ITEM_BOX: Record<ItemKey, readonly [number, number, number, number]> = {
  raincoat: [-64, 0, 64, 218],
  woolcoat: [-66, 0, 66, 228],
  scarf: [-40, 0, 40, 196],
  mittens: [-50, 0, 50, 160],
  woolhat: [-74, -100, 74, 0],
  sunhat: [-108, -96, 108, 0],
  wellies: [-66, -96, 66, 0],
  snowboots: [-66, -88, 66, 0],
  sandals: [-66, -60, 66, 0],
}
