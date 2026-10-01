// The backdrop: sky, sun, island, the cat in its boat, the pelican, and the
// sea itself with its rock walls, kelp, coral, wreck and floor. Everything
// here takes `camY`, the world depth (in pixels, 0 is the waterline) at the
// top edge of the screen.

import { blinkAt, circle, ellipse, face, rrect, squash, star, volume } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { clamp, lerp, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

// Screen y of the waterline while the boat is in view.
export const SURFACE = 400
export const FLOOR = 7800
// The lane the fish and the hook live in.
export const LX0 = 130
export const LX1 = 1050
// Where each depth band starts.
export const BAND_TOP = [0, 1500, 3000, 4800, 6900] as const

type RGB = readonly [number, number, number]
const STOPS: readonly (readonly [number, RGB])[] = [
  [0, [70, 200, 236]],
  [1500, [33, 146, 212]],
  [3000, [22, 92, 166]],
  [4800, [14, 46, 104]],
  [6900, [7, 16, 48]],
  [7800, [3, 6, 22]],
]

export function depthRGB(y: number): RGB {
  if (y <= 0) return STOPS[0]![1]
  for (let i = 1; i < STOPS.length; i++) {
    const [d1, c1] = STOPS[i]!
    if (y <= d1) {
      const [d0, c0] = STOPS[i - 1]!
      const t = (y - d0) / (d1 - d0)
      return [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)]
    }
  }
  return STOPS[STOPS.length - 1]![1]
}

export function rgb(c: RGB, mul = 1, add = 0): string {
  return `rgb(${Math.round(clamp(c[0] * mul + add, 0, 255))},${Math.round(clamp(c[1] * mul + add, 0, 255))},${Math.round(clamp(c[2] * mul + add, 0, 255))})`
}

export function bandOf(y: number): number {
  for (let i = BAND_TOP.length - 1; i >= 0; i--) if (y >= BAND_TOP[i]!) return i
  return 0
}

// How far the water surface is from flat at x.
export function waveY(x: number, t: number): number {
  return Math.sin(x * 0.011 + t * 1.5) * 6 + Math.sin(x * 0.029 - t * 2.2) * 3
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

function cloud(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ellipse(g, x, y + 8 * s, 78 * s, 20 * s, 'rgba(255,255,255,0.95)')
  circle(g, x - 36 * s, y, 26 * s, '#ffffff')
  circle(g, x, y - 16 * s, 36 * s, '#ffffff')
  circle(g, x + 38 * s, y - 2 * s, 28 * s, '#ffffff')
}

function palm(g: CanvasRenderingContext2D, x: number, y: number, lean: number, s: number, t: number): void {
  const topX = x + lean * 46 * s
  const topY = y - 110 * s
  g.beginPath()
  g.moveTo(x, y)
  g.quadraticCurveTo(x + lean * 8 * s, y - 70 * s, topX, topY)
  g.strokeStyle = '#a8744a'
  g.lineWidth = 12 * s
  g.lineCap = 'round'
  g.stroke()
  const sway = Math.sin(t * 1.3 + x) * 0.06
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.62 + sway
    ellipse(g, topX + Math.cos(a) * 30 * s, topY + Math.sin(a) * 22 * s + 8 * s, 38 * s, 11 * s, i % 2 ? '#3fae5a' : '#58c26a', a)
  }
  circle(g, topX - 4 * s, topY + 6 * s, 7 * s, '#7a4a21')
  circle(g, topX + 8 * s, topY + 8 * s, 7 * s, '#7a4a21')
}

export function drawSky(g: CanvasRenderingContext2D, camY: number, t: number): void {
  const sy = -camY
  if (sy < -40) return
  const grad = g.createLinearGradient(0, sy - SURFACE, 0, sy)
  grad.addColorStop(0, '#4fb4ff')
  grad.addColorStop(0.7, '#a9e4ff')
  grad.addColorStop(1, '#e4f9ff')
  g.fillStyle = grad
  g.fillRect(0, 0, W, sy + 30)

  // A sun with a face, slowly turning rays.
  const sunX = 250
  const sunY = sy - 262
  circle(g, sunX, sunY, 86, 'rgba(255,246,190,0.35)')
  g.fillStyle = 'rgba(255,225,77,0.55)'
  for (let i = 0; i < 12; i++) {
    const a = t * 0.15 + (i / 12) * TAU
    g.beginPath()
    g.moveTo(sunX + Math.cos(a - 0.1) * 54, sunY + Math.sin(a - 0.1) * 54)
    g.lineTo(sunX + Math.cos(a) * (84 + Math.sin(t * 2 + i) * 5), sunY + Math.sin(a) * (84 + Math.sin(t * 2 + i) * 5))
    g.lineTo(sunX + Math.cos(a + 0.1) * 54, sunY + Math.sin(a + 0.1) * 54)
    g.closePath()
    g.fill()
  }
  circle(g, sunX, sunY, 52, '#ffe14d')
  circle(g, sunX - 14, sunY - 16, 16, 'rgba(255,255,255,0.35)')
  face(g, sunX, sunY - 6, 7, 'happy', 0.3, 0.4, blinkAt(t, 4))

  for (let i = 0; i < 4; i++) {
    const span = W + 360
    const x = ((i * 410 + 120 + t * (9 + i * 3)) % span) - 180
    cloud(g, x, sy - 318 + ((i * 53) % 110), 0.7 + (i % 3) * 0.22)
  }

  // Two gulls riding the wind.
  g.strokeStyle = '#ffffff'
  g.lineWidth = 4
  g.lineCap = 'round'
  for (let i = 0; i < 2; i++) {
    const gx = ((t * (34 + i * 12) + i * 600) % (W + 200)) - 100
    const gy = sy - 215 + Math.sin(t * 0.8 + i * 2) * 18 - i * 40
    const flap = Math.sin(t * 7 + i) * 7
    g.beginPath()
    g.moveTo(gx - 16, gy - flap)
    g.quadraticCurveTo(gx - 6, gy - 8, gx, gy)
    g.quadraticCurveTo(gx + 6, gy - 8, gx + 16, gy - flap)
    g.stroke()
  }

  // A far island on the horizon.
  const ix = 800
  ellipse(g, ix, sy + 6, 175, 42, '#f6dc9a')
  ellipse(g, ix - 10, sy - 12, 120, 34, '#64c873')
  palm(g, ix - 50, sy - 30, -1, 0.9, t)
  palm(g, ix + 24, sy - 34, 1, 1.1, t)
}

// The lighter swell behind the boat.
export function drawWaterBack(g: CanvasRenderingContext2D, camY: number, t: number): void {
  const sy = -camY
  if (sy < -40) return
  g.beginPath()
  g.moveTo(0, sy + 40)
  for (let x = 0; x <= W + 40; x += 40) g.lineTo(x, sy - 9 + waveY(x + 300, t * 0.8 + 2) * 1.3)
  g.lineTo(W + 40, sy + 40)
  g.closePath()
  g.fillStyle = '#8fe3f7'
  g.fill()
}

const SPECKS = 40

export function drawWater(g: CanvasRenderingContext2D, camY: number, t: number, camSpeed: number): void {
  const sy = -camY
  const top = Math.max(0, camY)
  const grad = g.createLinearGradient(0, Math.max(sy, 0), 0, H)
  grad.addColorStop(0, rgb(depthRGB(top)))
  grad.addColorStop(0.5, rgb(depthRGB((top + camY + H) / 2)))
  grad.addColorStop(1, rgb(depthRGB(camY + H)))
  g.fillStyle = grad
  if (sy < -40) {
    g.fillRect(0, 0, W, H)
  } else {
    g.beginPath()
    g.moveTo(0, H)
    for (let x = 0; x <= W + 40; x += 40) g.lineTo(x, sy + waveY(x, t))
    g.lineTo(W + 40, H)
    g.closePath()
    g.fill()
  }

  // Shafts of sunlight, fading with depth.
  if (camY < 1500) {
    g.fillStyle = `rgba(255,255,255,${0.09 * (1 - Math.max(0, camY) / 1500)})`
    for (let i = 0; i < 5; i++) {
      const x = 60 + i * 255 + Math.sin(t * 0.35 + i * 1.7) * 40
      const w = 46 + (i % 2) * 30
      g.beginPath()
      g.moveTo(x, sy + 4)
      g.lineTo(x + w, sy + 4)
      g.lineTo(x + w * 2.6 + 190, sy + 1250)
      g.lineTo(x + 130, sy + 1250)
      g.closePath()
      g.fill()
    }
  }

  // Drifting specks: they streak when the hook is moving fast, which is what
  // makes the dive feel fast.
  const streak = clamp(Math.abs(camSpeed) * 0.03, 0, 34)
  g.strokeStyle = 'rgba(255,255,255,0.22)'
  g.lineWidth = 3
  g.lineCap = 'round'
  g.beginPath()
  for (let i = 0; i < SPECKS; i++) {
    const x = ((i * 397.3) % W) + Math.sin(t * 0.5 + i) * 8
    const span = H + 80
    const y = ((((i * 211.7 - camY * (0.55 + (i % 5) * 0.09)) % span) + span) % span) - 40
    if (y < sy + 20) continue
    g.moveTo(x, y)
    g.lineTo(x, y + 2 + streak)
  }
  g.stroke()
}

export function drawSurfaceLine(g: CanvasRenderingContext2D, camY: number, t: number): void {
  const sy = -camY
  if (sy < -40) return
  g.beginPath()
  for (let x = 0; x <= W + 40; x += 40) {
    const y = sy + waveY(x, t)
    if (x === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.strokeStyle = 'rgba(255,255,255,0.75)'
  g.lineWidth = 5
  g.stroke()
}

// Rock wall thickness at a depth.
export function wallW(side: number, y: number): number {
  const rough = Math.sin(y * 0.011 + side * 2.1) * 0.6 + Math.sin(y * 0.029 + side * 5.3) * 0.4
  return (62 + 24 * rough) * clamp((y - 50) / 170, 0, 1)
}

export interface Decor {
  type: 'kelp' | 'coral' | 'star' | 'crystal'
  side: number
  y: number
  size: number
  hue: number
  phase: number
}

export function makeDecor(rand: () => number): Decor[] {
  const out: Decor[] = []
  for (let side = 0; side < 2; side++) {
    let y = 250 + rand() * 80
    while (y < FLOOR - 160) {
      const band = bandOf(y)
      const r = rand()
      let type: Decor['type'] | null = null
      if (band === 0) type = r < 0.55 ? 'kelp' : r < 0.8 ? 'coral' : 'star'
      else if (band === 1) type = r < 0.5 ? 'coral' : r < 0.8 ? 'kelp' : 'star'
      else if (band === 2) type = r < 0.35 ? 'coral' : r < 0.6 ? 'kelp' : r < 0.75 ? 'crystal' : null
      else type = r < 0.6 ? 'crystal' : null
      if (type) out.push({ type, side, y, size: 0.8 + rand() * 0.5, hue: Math.floor(rand() * 4), phase: rand() * 10 })
      y += 120 + rand() * 110
    }
  }
  return out
}

const CORAL = ['#ff7aa8', '#ff9f5a', '#c77dff', '#ffd166'] as const
const CRYSTAL = ['#6bf3ff', '#ff7bf0', '#9dff8a', '#6bf3ff'] as const

export function drawWalls(g: CanvasRenderingContext2D, camY: number, t: number, decor: readonly Decor[]): void {
  const y0 = Math.max(40, Math.floor(camY / 40) * 40)
  const y1 = camY + H + 40
  if (y1 < 40) return
  const c0 = depthRGB(y0)
  const c1 = depthRGB(y1)
  for (const [k, mul] of [[1, 0.62], [0.55, 0.42]] as const) {
    const grad = g.createLinearGradient(0, y0 - camY, 0, y1 - camY)
    grad.addColorStop(0, rgb(c0, mul, k === 1 ? 6 : 0))
    grad.addColorStop(1, rgb(c1, mul, k === 1 ? 10 : 0))
    g.fillStyle = grad
    for (let side = 0; side < 2; side++) {
      g.beginPath()
      g.moveTo(side === 0 ? 0 : W, y0 - camY)
      for (let y = y0; y <= y1; y += 40) {
        const w = wallW(side, y) * k
        g.lineTo(side === 0 ? w : W - w, y - camY)
      }
      g.lineTo(side === 0 ? 0 : W, y1 - camY)
      g.closePath()
      g.fill()
    }
  }

  // Lumps of lighter rock, so the walls are stone and not shadow.
  g.fillStyle = 'rgba(255,255,255,0.055)'
  for (let y = Math.max(160, Math.floor(camY / 96) * 96); y < y1; y += 96) {
    for (let side = 0; side < 2; side++) {
      const w = wallW(side, y)
      const k = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(y * 0.37 + side * 3))
      const x = side === 0 ? w * k : W - w * k
      g.beginPath()
      g.ellipse(x, y - camY, 12 + 8 * Math.sin(y * 0.11 + side) ** 2, 8 + 5 * Math.cos(y * 0.07) ** 2, 0.4, 0, TAU)
      g.fill()
    }
  }

  for (const d of decor) {
    const sy = d.y - camY
    if (sy < -200 || sy > H + 60) continue
    const inward = d.side === 0 ? 1 : -1
    const wx = d.side === 0 ? wallW(0, d.y) : W - wallW(1, d.y)
    if (d.type === 'kelp') {
      g.lineCap = 'round'
      for (let s = 0; s < 3; s++) {
        const height = 150 * d.size * (1 - s * 0.22)
        const bx = wx - inward * (6 + s * 10)
        const sway = Math.sin(t * 1.4 + d.phase + s * 0.8) * 16
        g.beginPath()
        g.moveTo(bx, sy)
        g.bezierCurveTo(bx + inward * 34, sy - height * 0.35, bx + inward * 6 - sway, sy - height * 0.7, bx + inward * 30 + sway, sy - height)
        g.strokeStyle = s === 1 ? '#23995a' : '#36b86c'
        g.lineWidth = 11 - s * 2
        g.stroke()
      }
    } else if (d.type === 'coral') {
      const col = CORAL[d.hue]!
      const r = 20 * d.size
      for (const [ox, oy, k] of [[0, 0, 1], [14, -18, 0.8], [8, 20, 0.75], [26, 2, 0.6]] as const) circle(g, wx + inward * (ox - 4), sy + oy, r * k, col)
      circle(g, wx + inward * 2, sy - 6, r * 0.22, 'rgba(255,255,255,0.5)')
      circle(g, wx + inward * 16, sy - 20, r * 0.18, 'rgba(255,255,255,0.5)')
    } else if (d.type === 'star') {
      const x = wx - inward * 12
      star(g, x, sy, 20 * d.size, '#ff8a5c', d.phase + Math.sin(t + d.phase) * 0.15)
      circle(g, x - 4, sy - 2, 2.4, '#5a1e2a')
      circle(g, x + 4, sy - 2, 2.4, '#5a1e2a')
    }
  }
}

// Crystals glow, so they are drawn after the darkness.
export function drawCrystals(g: CanvasRenderingContext2D, camY: number, t: number, decor: readonly Decor[]): void {
  for (const d of decor) {
    if (d.type !== 'crystal') continue
    const sy = d.y - camY
    if (sy < -80 || sy > H + 80) continue
    const inward = d.side === 0 ? 1 : -1
    const wx = d.side === 0 ? wallW(0, d.y) : W - wallW(1, d.y)
    const col = CRYSTAL[d.hue]!
    const tw = 0.75 + 0.25 * Math.sin(t * 2.4 + d.phase)
    g.globalAlpha = tw
    for (const [ox, oy, s] of [[0, 0, 1], [16, 14, 0.6], [10, -20, 0.7]] as const) {
      const x = wx + inward * (ox - 6)
      const y = sy + oy
      const h = 30 * d.size * s
      g.beginPath()
      g.moveTo(x, y - h)
      g.lineTo(x + h * 0.42, y)
      g.lineTo(x, y + h * 0.5)
      g.lineTo(x - h * 0.42, y)
      g.closePath()
      g.fillStyle = col
      g.fill()
    }
    g.globalAlpha = 1
  }
}

// Things far behind the fish: a whale passing through the reef, a wreck in
// the twilight, and the sea floor.
export function drawFar(g: CanvasRenderingContext2D, camY: number, t: number): void {
  const whaleY = 2280 - camY
  if (whaleY > -200 && whaleY < H + 200) {
    const col = rgb(depthRGB(2280), 0.8)
    const x = ((t * 22) % (W + 900)) - 450
    const bob = Math.sin(t * 0.7) * 14
    g.save()
    g.translate(x, whaleY + bob)
    ellipse(g, 0, 0, 250, 78, col)
    ellipse(g, 120, 40, 60, 18, col, 0.5)
    const wag = Math.sin(t * 1.6) * 0.18
    g.rotate(wag * 0.2)
    tri(g, -230, 0, -340, -70 + wag * 80, -300, 0, col)
    tri(g, -230, 0, -340, 60 + wag * 80, -300, -6, col)
    circle(g, 170, -14, 7, 'rgba(255,255,255,0.35)')
    g.restore()
  }

  const wreckY = 4180 - camY
  if (wreckY > -320 && wreckY < H + 320) {
    const col = rgb(depthRGB(4180), 0.62)
    g.save()
    g.translate(650, wreckY)
    g.rotate(-0.16)
    g.beginPath()
    g.moveTo(-250, -40)
    g.lineTo(240, -40)
    g.quadraticCurveTo(250, 40, 170, 90)
    g.lineTo(-170, 90)
    g.quadraticCurveTo(-240, 50, -250, -40)
    g.closePath()
    g.fillStyle = col
    g.fill()
    rrect(g, -30, -250, 16, 215, 4, col)
    rrect(g, -140, -150, 12, 115, 4, col)
    tri(g, -14, -240, 110, -150, -14, -120, rgb(depthRGB(4180), 0.72))
    rrect(g, 60, -80, 110, 44, 6, col)
    for (let i = 0; i < 4; i++) circle(g, -150 + i * 90, 14, 15, rgb(depthRGB(4180), 0.9))
    g.restore()
  }

  const floorY = FLOOR - camY
  if (floorY < H + 80) {
    g.beginPath()
    g.moveTo(0, H + 10)
    for (let x = 0; x <= W; x += 60) g.lineTo(x, floorY - 22 + Math.sin(x * 0.013) * 18 + Math.sin(x * 0.041) * 8)
    g.lineTo(W, H + 10)
    g.closePath()
    g.fillStyle = '#2a2f63'
    g.fill()
    g.beginPath()
    g.moveTo(0, H + 10)
    for (let x = 0; x <= W; x += 60) g.lineTo(x, floorY - 4 + Math.sin(x * 0.013 + 1) * 14)
    g.lineTo(W, H + 10)
    g.closePath()
    g.fillStyle = '#171a3d'
    g.fill()
    // The kraken's hoard.
    for (let i = 0; i < 16; i++) {
      const x = 170 + i * 56 + Math.sin(i * 7.3) * 20
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + i)
      circle(g, x, floorY - 16 + Math.sin(i * 3.1) * 8, 8, '#ffd23f', '#d98a00', 2)
      if (i % 4 === 0) star(g, x + 6, floorY - 30, 3 + tw * 6, '#ffffff', t + i)
    }
  }
}

export interface CatPose {
  t: number
  mood: Mood
  lookX: number
  lookY: number
  // Rod swing in radians: negative is wound back, positive is flung forward.
  bend: number
  // Stretch for squash: 1 is at rest.
  stretch: number
  tilt: number
}

const BOAT_SCALE = 1.12
const ROD_LEN = 176
const ROD_ANGLE = -0.64
const HANDLE = { x: 10, y: -86 }

// Where the tip of the rod is on screen, given the boat's waterline point.
export function rodTip(bx: number, by: number, pose: CatPose): { x: number; y: number } {
  const a = ROD_ANGLE + pose.bend
  const lx = (HANDLE.x + Math.cos(a) * ROD_LEN) * BOAT_SCALE
  const ly = (HANDLE.y + Math.sin(a) * ROD_LEN) * BOAT_SCALE
  const c = Math.cos(pose.tilt)
  const s = Math.sin(pose.tilt)
  return { x: bx + lx * c - ly * s, y: by + lx * s + ly * c }
}

export function drawBoat(g: CanvasRenderingContext2D, bx: number, by: number, pose: CatPose): void {
  const t = pose.t
  g.save()
  g.translate(bx, by)
  g.rotate(pose.tilt)
  g.scale(BOAT_SCALE, BOAT_SCALE)
  g.lineCap = 'round'

  // Tail, swishing behind.
  const swish = Math.sin(t * 2.2) * 14
  g.beginPath()
  g.moveTo(-52, -50)
  g.bezierCurveTo(-84, -46, -96 + swish * 0.4, -78, -84 + swish, -108)
  g.strokeStyle = '#ff9f43'
  g.lineWidth = 13
  g.stroke()
  g.beginPath()
  g.moveTo(-86 + swish * 0.85, -100)
  g.lineTo(-84 + swish, -108)
  g.strokeStyle = '#ffe2b8'
  g.stroke()

  const [sx, sy] = volume(pose.stretch)
  squash(g, -20, -36, sx, sy, () => {
    ellipse(g, -20, -68, 37, 40, '#ff9f43')
    ellipse(g, -16, -58, 22, 26, '#ffe2b8')
    // Ears.
    tri(g, -50, -138, -46, -178, -22, -152, '#ff9f43')
    tri(g, 16, -138, 14, -178, -10, -152, '#ff9f43')
    tri(g, -44, -146, -42, -168, -29, -152, '#ff8fa3')
    tri(g, 11, -146, 10, -168, -3, -152, '#ff8fa3')
    circle(g, -16, -124, 38, '#ff9f43')
    // Stripes on the forehead.
    g.strokeStyle = '#e8842a'
    g.lineWidth = 4
    for (const ox of [-10, 0, 10]) {
      g.beginPath()
      g.moveTo(-16 + ox, -158)
      g.lineTo(-16 + ox * 0.8, -148)
      g.stroke()
    }
    ellipse(g, -12, -108, 20, 13, '#ffe2b8')
    face(g, -12, -128, 9, pose.mood, pose.lookX, pose.lookY, blinkAt(t, 1))
    tri(g, -16, -116, -8, -116, -12, -111, '#ff6b8a')
    g.strokeStyle = 'rgba(255,255,255,0.9)'
    g.lineWidth = 2.5
    for (const side of [-1, 1]) {
      for (const dy of [-4, 4]) {
        g.beginPath()
        g.moveTo(-12 + side * 22, -110)
        g.lineTo(-12 + side * 46, -112 + dy * 1.6)
        g.stroke()
      }
    }
    // A sailor's cap.
    ellipse(g, -16, -156, 30, 9, '#ffffff')
    rrect(g, -38, -176, 44, 20, 9, '#ffffff')
    rrect(g, -38, -162, 44, 6, 3, '#3a7bd5')
    // The arm holding the rod.
    g.beginPath()
    g.moveTo(-6, -78)
    g.lineTo(HANDLE.x, HANDLE.y)
    g.strokeStyle = '#ff9f43'
    g.lineWidth = 14
    g.stroke()
  })

  // Hull.
  g.beginPath()
  g.moveTo(-132, -42)
  g.lineTo(132, -42)
  g.quadraticCurveTo(122, 24, 74, 30)
  g.lineTo(-80, 30)
  g.quadraticCurveTo(-124, 24, -132, -42)
  g.closePath()
  g.fillStyle = '#e5484d'
  g.fill()
  g.beginPath()
  g.moveTo(-124, -12)
  g.lineTo(124, -12)
  g.lineTo(121, 0)
  g.lineTo(-121, 0)
  g.closePath()
  g.fillStyle = '#ffffff'
  g.fill()
  rrect(g, -138, -50, 276, 14, 7, '#ffd9a0')
  // A fish painted on the bow.
  ellipse(g, 78, -26, 12, 7, '#ffffff')
  tri(g, 66, -26, 58, -33, 58, -19, '#ffffff')

  // The rod, bending the way it was last thrown.
  const a = ROD_ANGLE + pose.bend
  const tx = HANDLE.x + Math.cos(a) * ROD_LEN
  const ty = HANDLE.y + Math.sin(a) * ROD_LEN
  const mx = HANDLE.x + Math.cos(ROD_ANGLE + pose.bend * 0.3) * ROD_LEN * 0.55
  const my = HANDLE.y + Math.sin(ROD_ANGLE + pose.bend * 0.3) * ROD_LEN * 0.55
  g.beginPath()
  g.moveTo(HANDLE.x - 12, HANDLE.y + 9)
  g.quadraticCurveTo(mx, my, tx, ty)
  g.strokeStyle = '#7a4a21'
  g.lineWidth = 6
  g.stroke()
  g.beginPath()
  g.moveTo(HANDLE.x - 12, HANDLE.y + 9)
  g.lineTo(HANDLE.x + 16, HANDLE.y - 12)
  g.strokeStyle = '#4a2f1b'
  g.lineWidth = 10
  g.stroke()
  circle(g, HANDLE.x + 18, HANDLE.y - 2, 9, '#dfe7f0', '#8a97a8', 3)
  circle(g, HANDLE.x, HANDLE.y, 10, '#ff9f43')
  circle(g, tx, ty, 4, '#dfe7f0')
  g.restore()
}

// A pelican on a post. `pouch` 0..1 fills its beak; (x, y) is the top of the
// post. `s` scales the bird alone, so the same drawing makes the shop icon.
export function drawPelican(g: CanvasRenderingContext2D, x: number, y: number, t: number, pouch: number, stretch: number, s = 1): void {
  const [sx, sy] = volume(stretch)
  g.save()
  g.translate(x, y)
  g.scale(s * sx, s * sy)
  g.lineCap = 'round'
  g.strokeStyle = '#ff9f1c'
  g.lineWidth = 5
  for (const fx of [-8, 8]) {
    g.beginPath()
    g.moveTo(fx, -12)
    g.lineTo(fx, 0)
    g.lineTo(fx + 8, 0)
    g.stroke()
  }
  ellipse(g, -2, -38, 34, 29, '#ffffff')
  ellipse(g, -12, -36, 22, 17, '#dbe6f2', -0.3 + Math.sin(t * 1.4) * 0.04)
  g.beginPath()
  g.moveTo(14, -52)
  g.lineTo(18, -86)
  g.strokeStyle = '#ffffff'
  g.lineWidth = 17
  g.stroke()
  circle(g, 19, -92, 17, '#ffffff')
  // Beak and its stretchy pouch.
  ellipse(g, 58, -76 + pouch * 7, 27, 7 + pouch * 15, '#ffc15a')
  g.beginPath()
  g.moveTo(30, -98)
  g.lineTo(96, -84)
  g.lineTo(32, -80)
  g.closePath()
  g.fillStyle = '#ff9f1c'
  g.fill()
  circle(g, 23, -96, 6, '#ffffff', 'rgba(30,20,40,0.8)', 1.5)
  circle(g, 25, -96, blinkAt(t, 7) ? 0.8 : 3, '#1e1428')
  g.restore()
}

export function drawPost(g: CanvasRenderingContext2D, x: number, y: number, h: number): void {
  rrect(g, x - 13, y, 26, h, 6, '#9a6338')
  rrect(g, x - 13, y, 9, h, 4, '#b57a48')
  rrect(g, x - 17, y - 4, 34, 12, 5, '#7a4a21')
}
