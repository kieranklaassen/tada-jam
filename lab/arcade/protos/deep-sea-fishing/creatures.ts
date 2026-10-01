// Everything that lives in the sea, drawn facing right around the origin. The
// game translates, flips and rotates; this file only knows what each creature
// looks like. A `sil` colour draws the same shapes as one flat silhouette, for
// the creatures below the end of the line and the uncaught ones on the board.

import { circle, ellipse, eyes, rrect, star } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'

export type Kind = 'boot' | 'sardine' | 'clown' | 'puffer' | 'turtle' | 'jelly' | 'squid' | 'shark' | 'angler' | 'chest' | 'goldie' | 'kraken'

export interface Species {
  name: string
  value: number
  // Collision radius, logical pixels.
  r: number
  speed: number
  // Hangs from the hook by its mouth (rotated nose-up) rather than dangling.
  faces: boolean
  hazard: boolean
}

// Everything but the kraken is drawn this much bigger than its shapes are
// written, so a sardine is a good thumb wide on an iPad.
export const DRAW_SCALE = 1.3

export const SPECIES: Record<Kind, Species> = {
  boot: { name: 'OLD BOOT', value: 5, r: 34, speed: 10, faces: false, hazard: false },
  sardine: { name: 'SARDINE', value: 10, r: 30, speed: 165, faces: true, hazard: false },
  clown: { name: 'CLOWNFISH', value: 25, r: 38, speed: 70, faces: true, hazard: false },
  puffer: { name: 'PUFFERFISH', value: 60, r: 38, speed: 46, faces: false, hazard: false },
  turtle: { name: 'TURTLE', value: 110, r: 48, speed: 38, faces: true, hazard: false },
  jelly: { name: 'JELLYFISH', value: 0, r: 38, speed: 12, faces: false, hazard: true },
  squid: { name: 'SQUID', value: 225, r: 40, speed: 120, faces: false, hazard: false },
  shark: { name: 'SHARK', value: 450, r: 64, speed: 210, faces: true, hazard: false },
  angler: { name: 'ANGLERFISH', value: 900, r: 48, speed: 24, faces: true, hazard: false },
  chest: { name: 'TREASURE', value: 3000, r: 54, speed: 0, faces: false, hazard: false },
  goldie: { name: 'GOLDEN FISH', value: 150, r: 38, speed: 135, faces: true, hazard: false },
  kraken: { name: 'THE KRAKEN', value: 25000, r: 150, speed: 0, faces: false, hazard: false },
}

// The order of the trophy board.
export const COLLECTION: readonly Kind[] = ['boot', 'sardine', 'clown', 'goldie', 'puffer', 'turtle', 'squid', 'shark', 'angler', 'chest', 'kraken']

export interface Pose {
  // Seconds, already offset per creature.
  t: number
  // One flat colour instead of the real ones.
  sil?: string
  // Where the eye points, in the creature's own frame, -1..1.
  lookX?: number
  lookY?: number
  // 0 calm, 1 startled or hooked.
  wow?: number
  // Pufferfish only, 0..1.
  puff?: number
  // Deep jellyfish glow cyan.
  glow?: boolean
}

function tri(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, fill: string): void {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.lineTo(x3, y3)
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

// A side-on cartoon eye.
function eye(g: CanvasRenderingContext2D, x: number, y: number, r: number, p: Pose): void {
  if (p.sil) return
  const wow = p.wow ?? 0
  const rr = r * (1 + wow * 0.3)
  circle(g, x, y, rr, '#ffffff', 'rgba(30,20,40,0.8)', Math.max(1.5, r * 0.18))
  const px = x + (p.lookX ?? 0.4) * rr * 0.38
  const py = y + (p.lookY ?? 0) * rr * 0.38
  circle(g, px, py, rr * (0.55 - wow * 0.18), '#1e1428')
  circle(g, px - rr * 0.18, py - rr * 0.2, rr * 0.18, '#ffffff')
}

function tail(g: CanvasRenderingContext2D, x: number, wag: number, fn: () => void): void {
  g.save()
  g.translate(x, 0)
  g.rotate(wag)
  fn()
  g.restore()
}

function mouth(g: CanvasRenderingContext2D, x: number, y: number, size: number, p: Pose): void {
  if (p.sil) return
  const wow = p.wow ?? 0
  if (wow > 0.3) {
    ellipse(g, x, y, size * 0.5, size * (0.4 + wow * 0.5), '#5a1e2a')
  } else {
    g.beginPath()
    g.arc(x - size * 0.5, y - size * 0.5, size, 0.1 * Math.PI, 0.55 * Math.PI)
    g.strokeStyle = 'rgba(30,20,40,0.8)'
    g.lineWidth = Math.max(1.5, size * 0.3)
    g.lineCap = 'round'
    g.stroke()
  }
}

function wavy(g: CanvasRenderingContext2D, x: number, y: number, len: number, t: number, amp: number, color: string, width: number): void {
  g.beginPath()
  g.moveTo(x, y)
  const seg = len / 3
  for (let i = 1; i <= 3; i++) {
    const sway = Math.sin(t + i * 1.3) * amp * (i / 3)
    g.quadraticCurveTo(x + sway * 1.6, y + seg * (i - 0.5), x + sway, y + seg * i)
  }
  g.strokeStyle = color
  g.lineWidth = width
  g.lineCap = 'round'
  g.stroke()
}

function plainFish(g: CanvasRenderingContext2D, p: Pose, len: number, high: number, body: string, belly: string, fin: string): void {
  const c = (col: string) => p.sil ?? col
  const wag = Math.sin(p.t * 9) * 0.35
  tail(g, -len + 5, wag, () => tri(g, 2, 0, -len * 0.6, -high * 1.05, -len * 0.6, high * 1.05, c(fin)))
  tri(g, -len * 0.3, -high * 0.8, len * 0.3, -high * 0.85, -len * 0.35, -high * 1.7, c(fin))
  ellipse(g, 0, 0, len, high, c(body))
  if (!p.sil) ellipse(g, len * 0.08, high * 0.36, len * 0.78, high * 0.52, belly)
}

function sardine(g: CanvasRenderingContext2D, p: Pose): void {
  plainFish(g, p, 28, 11, '#4f9fe0', '#e3f4ff', '#2f78c4')
  if (!p.sil) {
    g.strokeStyle = 'rgba(255,255,255,0.55)'
    g.lineWidth = 2.5
    g.beginPath()
    g.moveTo(-18, -2)
    g.lineTo(8, -3)
    g.stroke()
  }
  eye(g, 16, -2, 6, p)
  mouth(g, 25, 4, 3.5, p)
}

function roundFish(g: CanvasRenderingContext2D, p: Pose, body: string, belly: string, fin: string, stripes: boolean): void {
  const c = (col: string) => p.sil ?? col
  const len = 32
  const high = 21
  const wag = Math.sin(p.t * 7) * 0.4
  tail(g, -len + 4, wag, () => ellipse(g, -10, 0, 12, 15, c(fin)))
  ellipse(g, -4, -high + 2, 15, 8, c(fin))
  ellipse(g, -2, high - 3, 9, 6, c(fin))
  ellipse(g, 0, 0, len, high, c(body))
  if (!p.sil) {
    if (stripes) {
      for (const [sx, sw] of [[-17, 5], [3, 6.5]] as const) {
        const h = high * Math.sqrt(1 - (sx / len) ** 2)
        ellipse(g, sx, 0, sw + 1.4, h, '#2b1a12')
        ellipse(g, sx, 0, sw, h - 0.5, '#ffffff')
      }
    } else {
      ellipse(g, 2, 8, 24, 10, belly)
    }
    ellipse(g, 2, 9, 8, 5, fin, 0.5 + Math.sin(p.t * 8) * 0.4)
  }
  eye(g, 19, -5, 7.5, p)
  mouth(g, 29, 5, 4, p)
}

function goldie(g: CanvasRenderingContext2D, p: Pose): void {
  roundFish(g, p, '#ffcf33', '#fff3b0', '#ff9f1c', false)
  if (p.sil) return
  // A tiny crown: this is the one to hope for.
  g.beginPath()
  g.moveTo(2, -19)
  g.lineTo(0, -33)
  g.lineTo(7, -25)
  g.lineTo(12, -35)
  g.lineTo(17, -25)
  g.lineTo(24, -32)
  g.lineTo(22, -18)
  g.closePath()
  g.fillStyle = '#fff1a8'
  g.fill()
  g.strokeStyle = '#d98a00'
  g.lineWidth = 2
  g.stroke()
  for (let i = 0; i < 3; i++) {
    const a = p.t * 2.2 + i * 2.1
    const tw = 0.5 + 0.5 * Math.sin(p.t * 6 + i * 2)
    star(g, Math.cos(a) * 44, Math.sin(a) * 30, 3 + tw * 6, '#ffffff', a)
  }
}

function boot(g: CanvasRenderingContext2D, p: Pose): void {
  const c = (col: string) => p.sil ?? col
  rrect(g, -17, -32, 26, 44, 6, c('#9a6338'))
  ellipse(g, 6, 12, 25, 13, c('#9a6338'))
  rrect(g, -19, 20, 52, 8, 4, c('#4a2f1b'))
  if (p.sil) return
  rrect(g, -19, -36, 30, 9, 4, '#c98a54')
  g.strokeStyle = '#f4e3c1'
  g.lineWidth = 2.5
  g.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    g.beginPath()
    g.moveTo(-2, -18 + i * 9)
    g.lineTo(9, -14 + i * 9)
    g.stroke()
  }
  // The hole in the toe, with something looking out.
  circle(g, 20, 10, 6, '#2b1a12')
  circle(g, 21, 9, 2.2, '#ffffff')
}

function puffer(g: CanvasRenderingContext2D, p: Pose): void {
  const c = (col: string) => p.sil ?? col
  const puff = p.puff ?? 0
  const R = 24 * (1 + puff * 0.45)
  const spike = 4 + puff * 10
  g.fillStyle = c('#e0a921')
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + 0.2
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    g.beginPath()
    g.moveTo(ca * (R + spike), sa * (R + spike))
    g.lineTo(Math.cos(a + 0.16) * (R - 2), Math.sin(a + 0.16) * (R - 2))
    g.lineTo(Math.cos(a - 0.16) * (R - 2), Math.sin(a - 0.16) * (R - 2))
    g.closePath()
    g.fill()
  }
  tail(g, -R + 2, Math.sin(p.t * 10) * 0.5, () => tri(g, 2, 0, -14, -9, -14, 9, c('#e0a921')))
  circle(g, 0, 0, R, c('#ffd84d'))
  if (p.sil) return
  ellipse(g, 1, R * 0.38, R * 0.74, R * 0.5, '#fff6cf')
  ellipse(g, -2, 4, 7, 4, '#e0a921', 0.6 + Math.sin(p.t * 12) * 0.5)
  circle(g, R * 0.2, R * 0.28, R * 0.16, 'rgba(255,120,120,0.55)')
  eye(g, R * 0.42, -R * 0.26, 7 + puff * 2, p)
  circle(g, R * 0.9, R * 0.12, 3.5 + puff * 1.5, '#b8651b')
}

function turtle(g: CanvasRenderingContext2D, p: Pose): void {
  const c = (col: string) => p.sil ?? col
  const flap = Math.sin(p.t * 4) * 0.5
  ellipse(g, 17, 12, 18, 7, c('#7ccf7a'), 0.55 + flap)
  ellipse(g, -22, 11, 11, 5, c('#7ccf7a'), -0.5 - flap * 0.6)
  tri(g, -28, 2, -40, 6, -28, 8, c('#7ccf7a'))
  circle(g, 35, -3, 12, c('#8fdc8a'))
  ellipse(g, 0, 6, 30, 9, c('#ecdca6'))
  g.beginPath()
  g.ellipse(0, 4, 31, 24, 0, Math.PI, TAU)
  g.closePath()
  g.fillStyle = c('#2f9e55')
  g.fill()
  if (p.sil) return
  for (const [sx, sy, sr] of [[-14, -5, 6], [1, -10, 7], [15, -4, 5]] as const) circle(g, sx, sy, sr, '#23804a')
  eye(g, 39, -6, 5, p)
  mouth(g, 44, 2, 3, p)
}

function jelly(g: CanvasRenderingContext2D, p: Pose): void {
  const glow = p.glow === true
  const main = p.sil ?? (glow ? 'rgba(120,240,255,0.92)' : 'rgba(255,130,205,0.9)')
  const pulse = Math.sin(p.t * 3)
  g.save()
  g.scale(1 + pulse * 0.08, 1 - pulse * 0.08)
  for (let i = 0; i < 5; i++) wavy(g, -18 + i * 9, 2, 40 + (i % 2) * 10, p.t * 3 + i, 7, main, 3.5)
  g.beginPath()
  g.arc(0, 0, 27, Math.PI, TAU)
  for (let i = 0; i < 4; i++) {
    const x1 = 27 - i * 13.5
    g.quadraticCurveTo(x1 - 6.75, 11, x1 - 13.5, 0)
  }
  g.closePath()
  g.fillStyle = main
  g.fill()
  if (!p.sil) {
    ellipse(g, -9, -16, 9, 5, 'rgba(255,255,255,0.45)', -0.5)
    circle(g, -8, -7, 3.5, '#3b1a4a')
    circle(g, 8, -7, 3.5, '#3b1a4a')
    g.beginPath()
    g.arc(0, -4, 5, 0.15 * Math.PI, 0.85 * Math.PI)
    g.strokeStyle = '#3b1a4a'
    g.lineWidth = 2
    g.stroke()
    // Little sparks: this one stings.
    if (Math.sin(p.t * 17) > 0.2) {
      g.strokeStyle = '#fff36b'
      g.lineWidth = 3
      g.lineJoin = 'round'
      for (const side of [-1, 1]) {
        const bx = side * (34 + Math.sin(p.t * 5 + side) * 3)
        const by = 10 + Math.cos(p.t * 4 + side) * 8
        g.beginPath()
        g.moveTo(bx, by - 9)
        g.lineTo(bx + 5 * side, by - 2)
        g.lineTo(bx - 2 * side, by + 1)
        g.lineTo(bx + 4 * side, by + 9)
        g.stroke()
      }
    }
  }
  g.restore()
}

function squid(g: CanvasRenderingContext2D, p: Pose): void {
  const c = (col: string) => p.sil ?? col
  for (let i = 0; i < 6; i++) wavy(g, -12 + i * 4.8, 20, 24 + (i % 2) * 8, p.t * 5 + i * 0.9, 6, c('#ff8fa3'), 5)
  tri(g, -14, -34, -34, -22, -15, -10, c('#e84a72'))
  tri(g, 14, -34, 34, -22, 15, -10, c('#e84a72'))
  ellipse(g, 0, -16, 19, 30, c('#ff6b8a'))
  ellipse(g, 0, 14, 17, 12, c('#ff8fa3'))
  if (p.sil) return
  circle(g, -6, -30, 3, '#ffb3c4')
  circle(g, 6, -22, 4, '#ffb3c4')
  circle(g, -4, -12, 2.5, '#ffb3c4')
  eye(g, -8, 12, 6.5, p)
  eye(g, 8, 12, 6.5, p)
}

function shark(g: CanvasRenderingContext2D, p: Pose): void {
  const c = (col: string) => p.sil ?? col
  const len = 60
  const high = 22
  const wag = Math.sin(p.t * 6) * 0.28
  tail(g, -len + 8, wag, () => {
    tri(g, 4, 0, -30, -30, -12, 2, c('#6b84a3'))
    tri(g, 4, 0, -24, 20, -10, -2, c('#6b84a3'))
  })
  tri(g, -12, -17, 16, -20, -8, -46, c('#6b84a3'))
  tri(g, 4, 10, 24, 14, 0, 34, c('#6b84a3'))
  ellipse(g, 0, 0, len, high, c('#8298b3'))
  if (p.sil) return
  ellipse(g, 8, 9, len * 0.8, high * 0.5, '#f1f5fa')
  g.strokeStyle = 'rgba(40,55,80,0.55)'
  g.lineWidth = 2.5
  for (let i = 0; i < 3; i++) {
    g.beginPath()
    g.moveTo(16 + i * 7, -8)
    g.lineTo(14 + i * 7, 4)
    g.stroke()
  }
  // A grin full of teeth.
  g.beginPath()
  g.moveTo(30, 8)
  g.quadraticCurveTo(46, 17, 57, 6)
  g.quadraticCurveTo(46, 11, 30, 8)
  g.fillStyle = '#5a1e2a'
  g.fill()
  g.fillStyle = '#ffffff'
  for (let i = 0; i < 4; i++) {
    const tx = 34 + i * 5.5
    g.beginPath()
    g.moveTo(tx, 9.5 + i * 0.4)
    g.lineTo(tx + 2.6, 15)
    g.lineTo(tx + 5, 10 + i * 0.3)
    g.closePath()
    g.fill()
  }
  eye(g, 40, -7, 5.5, p)
  g.strokeStyle = '#2a3648'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(33, -15)
  g.lineTo(47, -11)
  g.stroke()
}

// The lure's position in the angler's own frame, for the glow pass.
export const ANGLER_LURE = { x: 44, y: -46 }

function angler(g: CanvasRenderingContext2D, p: Pose): void {
  const c = (col: string) => p.sil ?? col
  const wag = Math.sin(p.t * 5) * 0.4
  tail(g, -30, wag, () => tri(g, 2, 0, -20, -14, -20, 14, c('#3a2860')))
  tri(g, -18, -22, -2, -28, -14, -42, c('#3a2860'))
  tri(g, -4, -26, 10, -28, 2, -40, c('#3a2860'))
  ellipse(g, 0, 0, 35, 30, c('#55407f'))
  // The stalk and its little lamp.
  g.beginPath()
  g.moveTo(6, -28)
  g.quadraticCurveTo(14, -62, ANGLER_LURE.x, ANGLER_LURE.y)
  g.strokeStyle = c('#7b62ad')
  g.lineWidth = 4
  g.lineCap = 'round'
  g.stroke()
  circle(g, ANGLER_LURE.x, ANGLER_LURE.y, 8, c('#fff7a8'))
  if (p.sil) return
  ellipse(g, -6, 12, 22, 12, '#6e57a0')
  // Underbite and crooked teeth.
  g.beginPath()
  g.moveTo(6, 4)
  g.lineTo(37, -8)
  g.quadraticCurveTo(42, 8, 34, 22)
  g.closePath()
  g.fillStyle = '#1b1030'
  g.fill()
  g.fillStyle = '#ffffff'
  for (let i = 0; i < 4; i++) {
    const tx = 14 + i * 6
    const ty = 1 - i * 2.6
    g.beginPath()
    g.moveTo(tx, ty)
    g.lineTo(tx + 2.5, ty + 10 + (i % 2) * 3)
    g.lineTo(tx + 5, ty - 2)
    g.closePath()
    g.fill()
    const by = 9.5 + i * 3.2
    g.beginPath()
    g.moveTo(tx - 2, by)
    g.lineTo(tx + 1.5, by - 9 - ((i + 1) % 2) * 3)
    g.lineTo(tx + 4, by + 2)
    g.closePath()
    g.fill()
  }
  eye(g, 12, -13, 6, p)
}

function chest(g: CanvasRenderingContext2D, p: Pose): void {
  const c = (col: string) => p.sil ?? col
  // The lid, propped open.
  g.save()
  g.translate(-34, -8)
  g.rotate(-0.42)
  rrect(g, 0, -26, 68, 28, 12, c('#a8703a'))
  if (!p.sil) {
    rrect(g, 12, -26, 8, 28, 2, '#ffd23f')
    rrect(g, 48, -26, 8, 28, 2, '#ffd23f')
  }
  g.restore()
  if (!p.sil) {
    ellipse(g, 0, -8, 30, 10, '#ffd23f')
    for (const [cx, cy] of [[-16, -12], [-2, -15], [12, -12], [22, -9], [-24, -8]] as const) circle(g, cx, cy, 6, '#ffe680', '#d98a00', 2)
  }
  rrect(g, -34, -8, 68, 36, 7, c('#8a5a2b'))
  if (p.sil) return
  rrect(g, -22, -8, 8, 36, 2, '#ffd23f')
  rrect(g, 14, -8, 8, 36, 2, '#ffd23f')
  circle(g, 0, 8, 7, '#ffd23f', '#d98a00', 2)
  const tw = 0.5 + 0.5 * Math.sin(p.t * 5)
  star(g, -10, -24 - tw * 4, 5 + tw * 6, '#ffffff', p.t)
  star(g, 18, -20, 9 - tw * 5, '#fff7c2', -p.t)
}

// Eye centre in the kraken's own frame, for the glow pass.
export const KRAKEN_EYES = { y: -52, gap: 46 }

function kraken(g: CanvasRenderingContext2D, p: Pose): void {
  const c = (col: string) => p.sil ?? col
  const wow = p.wow ?? 0
  g.lineCap = 'round'
  // Eight arms that never stop moving; they thrash when it is hooked.
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1
    const k = i % 4
    const rootX = side * (30 + k * 30)
    const reach = 120 + k * 46
    const speed = 1.6 + wow * 7
    const sway = Math.sin(p.t * speed + i * 1.7) * (26 + wow * 30)
    const lift = Math.cos(p.t * speed * 0.8 + i) * 20
    g.beginPath()
    g.moveTo(rootX, 30)
    g.bezierCurveTo(rootX + side * 40, 110 + lift, side * reach * 0.8 + sway, 150 - k * 22, side * reach + sway * 1.4, 60 - k * 34 + lift)
    g.strokeStyle = c('#c43d60')
    g.lineWidth = 34 - k * 3
    g.stroke()
    if (!p.sil) {
      g.strokeStyle = '#ff9db5'
      g.lineWidth = 8
      g.setLineDash([2, 22])
      g.stroke()
      g.setLineDash([])
    }
  }
  ellipse(g, 0, -40, 150, 125, c('#e0557a'))
  if (p.sil) return
  ellipse(g, -50, -100, 50, 26, 'rgba(255,255,255,0.18)', -0.4)
  for (const [sx, sy, sr] of [[-96, -30, 14], [-70, 10, 9], [92, -60, 12], [104, -14, 8], [60, -120, 10]] as const) circle(g, sx, sy, sr, '#c43d60')
  eyes(g, 0, KRAKEN_EYES.y, 30 + wow * 5, p.lookX ?? 0, p.lookY ?? -0.4, wow > 0.3 ? 0 : 0.45 + 0.1 * Math.sin(p.t * 1.5), KRAKEN_EYES.gap / 30)
  if (wow > 0.3) ellipse(g, 0, 22, 20, 26, '#5a1e2a')
  else {
    g.beginPath()
    g.arc(0, 30, 22, 1.15 * Math.PI, 1.85 * Math.PI)
    g.strokeStyle = '#5a1e2a'
    g.lineWidth = 7
    g.stroke()
  }
  // The boss wears a crown.
  g.beginPath()
  g.moveTo(-44, -156)
  g.lineTo(-52, -206)
  g.lineTo(-24, -178)
  g.lineTo(0, -216)
  g.lineTo(24, -178)
  g.lineTo(52, -206)
  g.lineTo(44, -156)
  g.closePath()
  g.fillStyle = '#ffd23f'
  g.fill()
  g.strokeStyle = '#d98a00'
  g.lineWidth = 5
  g.lineJoin = 'round'
  g.stroke()
  circle(g, 0, -176, 8, '#ff5d8f')
}

export function drawCreature(g: CanvasRenderingContext2D, kind: Kind, p: Pose): void {
  switch (kind) {
    case 'boot':
      return boot(g, p)
    case 'sardine':
      return sardine(g, p)
    case 'clown':
      return roundFish(g, p, '#ff8a1f', '#ffb15c', '#f0640a', true)
    case 'goldie':
      return goldie(g, p)
    case 'puffer':
      return puffer(g, p)
    case 'turtle':
      return turtle(g, p)
    case 'jelly':
      return jelly(g, p)
    case 'squid':
      return squid(g, p)
    case 'shark':
      return shark(g, p)
    case 'angler':
      return angler(g, p)
    case 'chest':
      return chest(g, p)
    case 'kraken':
      return kraken(g, p)
  }
}
