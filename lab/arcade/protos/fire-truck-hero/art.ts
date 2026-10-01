// Drawing for Fire Truck Hero: the street backdrop, houses with window eyes,
// cartoon flames with faces, and the truck. No state lives here.

import { circle, ellipse, eyes, face, line, rrect, sprite } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

export const BASE = 520 // where houses meet the grass
export const ROAD_TOP = 605
export const TRUCK_Y = 790 // bottom of the wheels
export const ROOF_H = 95
export const EAVE = 16

export interface HouseDef {
  x: number
  w: number
  h: number
  wall: string
  trim: string
  roof: string
  roofDark: string
  door: string
}

export const HOUSES: readonly HouseDef[] = [
  { x: 165, w: 210, h: 165, wall: '#ffe3a8', trim: '#f2b55a', roof: '#e8574a', roofDark: '#c8433a', door: '#b5533c' },
  { x: 520, w: 190, h: 200, wall: '#c4e6fb', trim: '#7fb8e6', roof: '#8d6bd1', roofDark: '#7555b8', door: '#5a4aa8' },
  { x: 985, w: 220, h: 155, wall: '#ffc6d6', trim: '#f08aa9', roof: '#35b3a2', roofDark: '#27978a', door: '#2a8a7d' },
]

export function roofY(h: HouseDef, dx: number): number {
  return BASE - h.h - ROOF_H * (1 - Math.abs(dx) / (h.w / 2 + EAVE))
}

export function makeBackdrop(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')
  if (!g) return canvas
  const sky = g.createLinearGradient(0, 0, 0, BASE)
  sky.addColorStop(0, '#58b9ff')
  sky.addColorStop(1, '#d4f1ff')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  // Far hills with tiny trees.
  ellipse(g, 220, 560, 420, 190, '#a5e59a')
  ellipse(g, 820, 580, 520, 230, '#93dc8a')
  ellipse(g, 1150, 560, 300, 170, '#a5e59a')
  for (const [tx, ty, s] of [[640, 380, 1], [705, 372, 1.25], [760, 386, 0.9], [60, 400, 1], [1120, 408, 1.1]] as const) {
    g.fillStyle = '#7a5a3a'
    g.fillRect(tx - 3 * s, ty, 6 * s, 26 * s)
    circle(g, tx, ty - 6 * s, 18 * s, '#5fbf68')
    circle(g, tx - 10 * s, ty + 4 * s, 13 * s, '#55b35f')
    circle(g, tx + 11 * s, ty + 3 * s, 13 * s, '#6bc973')
  }
  // Lawn.
  g.fillStyle = '#7ad66f'
  g.fillRect(0, BASE - 26, W, 80)
  g.fillStyle = '#69c760'
  g.fillRect(0, BASE + 22, W, 30)
  for (let i = 0; i < 46; i++) {
    const x = (i * 97 + 31) % W
    const y = BASE - 12 + ((i * 53) % 46)
    line(g, x, y, x - 4, y - 9, '#5bb955', 3)
    line(g, x + 5, y, x + 8, y - 8, '#5bb955', 3)
  }
  // Pavement.
  g.fillStyle = '#e6dccb'
  g.fillRect(0, BASE + 45, W, ROAD_TOP - BASE - 45)
  g.strokeStyle = '#cfc4b0'
  g.lineWidth = 3
  for (let x = 40; x < W; x += 118) {
    g.beginPath()
    g.moveTo(x, BASE + 45)
    g.lineTo(x - 14, ROAD_TOP)
    g.stroke()
  }
  g.fillStyle = '#b9ae9b'
  g.fillRect(0, ROAD_TOP - 4, W, 10)
  // Road.
  const road = g.createLinearGradient(0, ROAD_TOP, 0, H)
  road.addColorStop(0, '#6a7282')
  road.addColorStop(1, '#565d6c')
  g.fillStyle = road
  g.fillRect(0, ROAD_TOP + 6, W, H - ROAD_TOP)
  g.fillStyle = '#f5f0dc'
  for (let x = 30; x < W; x += 150) rrect(g, x, 684, 84, 12, 6, '#f5f0dc')
  // Barbecue.
  line(g, 652, 512, 660, 540, '#4a4a55', 6)
  line(g, 692, 512, 684, 540, '#4a4a55', 6)
  line(g, 672, 512, 672, 542, '#4a4a55', 6)
  g.beginPath()
  g.arc(672, 484, 36, 0, Math.PI)
  g.closePath()
  g.fillStyle = '#d9483b'
  g.fill()
  rrect(g, 630, 476, 84, 11, 5, '#4a4a55')
  // Picnic table.
  rrect(g, 742, 492, 100, 12, 5, '#c98d4f')
  line(g, 756, 504, 748, 540, '#a8703a', 8)
  line(g, 828, 504, 836, 540, '#a8703a', 8)
  rrect(g, 730, 520, 124, 9, 4, '#b57c42')
  return canvas
}

function flamePath(g: CanvasRenderingContext2D, r: number, sway: number, h: number): void {
  g.beginPath()
  g.moveTo(-r, 0)
  g.bezierCurveTo(-r, -r * 0.95, -r * 0.3 + sway * 0.5, -h * 0.6, sway, -h)
  g.bezierCurveTo(r * 0.3 + sway * 0.5, -h * 0.6, r, -r * 0.95, r, 0)
  g.arc(0, 0, r, 0, Math.PI)
  g.closePath()
}

// A round flame with a face. (x, y) is what it stands on; r is the bulb radius.
// `wet` 0..1 pales it while water is landing on it.
export function flame(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  time: number,
  seed: number,
  mood: Mood,
  lookX: number,
  lookY: number,
  wet: number,
  sx = 1,
  sy = 1,
  legs = 0,
): void {
  if (r < 1) return
  const flick = Math.sin(time * 9 + seed) * 0.5 + Math.sin(time * 14.3 + seed * 2.1) * 0.5
  const h = r * (2.15 + flick * 0.22)
  const sway = r * 0.3 * Math.sin(time * 5.5 + seed * 1.7)
  g.save()
  g.translate(x, y)
  if (legs > 0) {
    // Little running legs for the hopping fire.
    g.strokeStyle = '#7a2c0a'
    g.lineWidth = Math.max(3, r * 0.16)
    g.lineCap = 'round'
    for (const side of [-1, 1]) {
      const kick = Math.sin(time * 12 + side) * r * 0.12 * legs
      g.beginPath()
      g.moveTo(side * r * 0.35, -r * 0.5)
      g.lineTo(side * r * 0.45 + kick, 0)
      g.lineTo(side * r * 0.75 + kick, 0)
      g.stroke()
    }
    g.translate(0, -r * 0.35)
  }
  g.scale(sx, sy)
  g.translate(0, -r * 0.85)
  g.globalAlpha = 0.28
  circle(g, 0, -r * 0.3, r * 1.7, '#fff3b8')
  g.globalAlpha = 1
  // Side tongues.
  for (const side of [-1, 1]) {
    g.save()
    g.rotate(side * (0.5 + flick * 0.08))
    g.scale(0.62, 0.62)
    flamePath(g, r, -sway * side, h * (0.95 + side * flick * 0.1))
    g.fillStyle = wet > 0.3 ? '#ff9b5c' : '#ff5a1f'
    g.fill()
    g.restore()
  }
  flamePath(g, r, sway, h)
  g.fillStyle = wet > 0.3 ? '#ffa860' : '#ff8420'
  g.fill()
  g.lineWidth = Math.max(2, r * 0.09)
  g.strokeStyle = '#e04a12'
  g.stroke()
  g.save()
  g.translate(0, r * 0.12)
  g.scale(0.72, 0.7)
  flamePath(g, r, sway * 0.8, h * 0.92)
  g.fillStyle = '#ffc93c'
  g.fill()
  g.restore()
  g.save()
  g.translate(0, r * 0.3)
  g.scale(0.42, 0.4)
  flamePath(g, r, sway * 0.5, h * 0.8)
  g.fillStyle = '#fff2ad'
  g.fill()
  g.restore()
  face(g, 0, -r * 0.18, Math.max(3, r * 0.21), mood, lookX, lookY, 0)
  g.restore()
}

export interface HouseLook {
  alarm: boolean
  // 0..1, fades after a fire on it goes out.
  relief: number
  lookX: number
  lookY: number
  blink: number
  // Vertical scale from a spring (1 at rest).
  sy: number
}

export function drawHouse(g: CanvasRenderingContext2D, h: HouseDef, s: HouseLook): void {
  g.save()
  g.translate(h.x, BASE)
  g.scale(1 / Math.sqrt(Math.max(0.3, s.sy)), s.sy)
  const left = -h.w / 2
  // Chimney behind the roof.
  rrect(g, h.w * 0.22, -h.h - 92, 34, 80, 5, '#b86a4c')
  rrect(g, h.w * 0.22 - 5, -h.h - 98, 44, 14, 5, '#9b5238')
  // Wall.
  rrect(g, left, -h.h, h.w, h.h + 4, 10, h.wall, h.trim, 5)
  g.fillStyle = h.trim
  g.fillRect(left + 3, -14, h.w - 6, 14)
  // Roof.
  g.beginPath()
  g.moveTo(left - EAVE, -h.h + 4)
  g.lineTo(0, -h.h - ROOF_H)
  g.lineTo(-left + EAVE, -h.h + 4)
  g.closePath()
  g.fillStyle = h.roof
  g.lineJoin = 'round'
  g.lineWidth = 12
  g.strokeStyle = h.roof
  g.stroke()
  g.fill()
  g.strokeStyle = h.roofDark
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(left - EAVE + 14, -h.h - 2)
  g.lineTo(-left + EAVE - 14, -h.h - 2)
  g.stroke()
  // Attic window.
  circle(g, 0, -h.h - 36, 25, '#35405a', '#ffffff', 6)
  // Window eyes.
  const ey = -h.h * 0.62
  const ex = h.w * 0.23
  for (const side of [-1, 1]) {
    const cx = side * ex
    rrect(g, cx - 27, ey - 27, 54, 54, 12, '#ffffff', h.trim, 6)
    if (s.relief > 0.25 && !s.alarm) {
      g.strokeStyle = '#2c2440'
      g.lineWidth = 6
      g.lineCap = 'round'
      g.beginPath()
      g.arc(cx, ey + 8, 14, Math.PI * 1.15, Math.PI * 1.85)
      g.stroke()
    } else if (s.blink > 0.5) {
      line(g, cx - 14, ey + 2, cx + 14, ey + 2, '#2c2440', 6)
    } else {
      const pr = s.alarm ? 9 : 12
      const px = cx + s.lookX * 10
      const py = ey + s.lookY * 10
      circle(g, px, py, pr, '#2c2440')
      circle(g, px - pr * 0.3, py - pr * 0.35, pr * 0.33, '#ffffff')
    }
    // Window sill and brow.
    rrect(g, cx - 32, ey + 27, 64, 9, 4, h.trim)
    if (s.alarm) {
      g.strokeStyle = '#2c2440'
      g.lineWidth = 6
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(cx - side * 22, ey - 47)
      g.lineTo(cx + side * 20, ey - 36)
      g.stroke()
    }
  }
  // Door mouth.
  const dh = Math.min(74, h.h * 0.36)
  if (s.alarm) {
    const wob = 1 + Math.sin(s.lookX * 7) * 0.02
    rrect(g, -27, -dh * wob - 6, 54, dh * wob + 6, 26, '#3a2230', h.trim, 5)
    ellipse(g, 0, -10, 17, 9, '#ff7d8f')
  } else {
    rrect(g, -27, -dh, 54, dh, 22, h.door, h.trim, 5)
    circle(g, 14, -dh * 0.45, 5, '#ffe28a')
    if (s.relief > 0.05) {
      g.globalAlpha = Math.min(1, s.relief * 1.5) * 0.7
      ellipse(g, -ex, ey + 50, 17, 10, '#ff8fa3')
      ellipse(g, ex, ey + 50, 17, 10, '#ff8fa3')
      g.globalAlpha = 1
    }
  }
  g.restore()
}

export function drawTree(g: CanvasRenderingContext2D, x: number, rustle: number, time: number): void {
  const sw = Math.sin(time * 1.3) * 0.015 + rustle * 0.06
  g.save()
  g.translate(x, BASE + 4)
  rrect(g, -14, -120, 28, 124, 8, '#8a5a36')
  g.rotate(sw)
  circle(g, -38, -150, 46, '#3fae57')
  circle(g, 40, -146, 44, '#49b961')
  circle(g, 0, -196, 56, '#55c56c')
  circle(g, -6, -140, 50, '#4bbd63')
  circle(g, -22, -208, 16, 'rgba(255,255,255,0.18)')
  sprite(g, '🍎', -34, -158, 24)
  sprite(g, '🍎', 30, -176, 24)
  sprite(g, '🍎', 6, -128, 24)
  g.restore()
}

export function drawSun(g: CanvasRenderingContext2D, x: number, y: number, time: number, scale: number, mood: Mood): void {
  g.save()
  g.translate(x, y)
  g.scale(scale, scale)
  g.fillStyle = '#ffd23f'
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + time * 0.3
    const len = 78 + Math.sin(time * 3 + i) * 5
    g.beginPath()
    g.moveTo(Math.cos(a - 0.13) * 54, Math.sin(a - 0.13) * 54)
    g.lineTo(Math.cos(a) * len, Math.sin(a) * len)
    g.lineTo(Math.cos(a + 0.13) * 54, Math.sin(a + 0.13) * 54)
    g.fill()
  }
  circle(g, 0, 0, 52, '#ffdf5e', '#f7b733', 5)
  ellipse(g, -30, 14, 10, 6, 'rgba(255,120,120,0.5)')
  ellipse(g, 30, 14, 10, 6, 'rgba(255,120,120,0.5)')
  face(g, 0, -8, 10, mood, -0.6, 0.6, 0)
  g.restore()
}

const RAINBOW = ['#ff5d5d', '#ff9f43', '#ffe14d', '#5ed36a', '#4db8ff', '#6f7bff', '#b07cff']

// An arc across the whole sky, drawn in from the left as `grow` goes 0..1.
export function drawRainbow(g: CanvasRenderingContext2D, alpha: number, grow: number): void {
  if (alpha <= 0.01) return
  g.save()
  g.globalAlpha = alpha * 0.85
  g.lineWidth = 15
  g.lineCap = 'butt'
  for (let i = 0; i < RAINBOW.length; i++) {
    g.strokeStyle = RAINBOW[i]!
    g.beginPath()
    g.arc(W / 2, BASE + 40, 540 - i * 14, Math.PI, Math.PI + Math.PI * grow)
    g.stroke()
  }
  g.restore()
}

export function drawCloud(g: CanvasRenderingContext2D, x: number, y: number, scale: number, grey: number, mood: Mood, time: number, seed: number): void {
  const c = Math.round(255 - grey * 95)
  const fill = `rgb(${c},${Math.round(c + grey * 12)},${Math.round(c + grey * 30)})`
  g.save()
  g.translate(x, y + Math.sin(time * 0.9 + seed) * 5)
  g.scale(scale, scale)
  ellipse(g, 0, 22, 92, 26, fill)
  circle(g, -50, 6, 36, fill)
  circle(g, 46, 8, 34, fill)
  circle(g, -6, -18, 48, fill)
  circle(g, -22, -34, 14, 'rgba(255,255,255,0.5)')
  face(g, -4, 0, 8, mood, 0, 0.5, time % (4 + seed) < 0.12 ? 1 : 0)
  g.restore()
}

export interface TruckLook {
  x: number
  lean: number
  bob: number
  wheel: number
  // Barrel angle in radians.
  aim: number
  lookX: number
  lookY: number
  blink: number
  spraying: boolean
  // 0..1 flashing strength for the roof light.
  light: number
  time: number
  passengers: readonly string[]
  mouth: 'smile' | 'open' | 'wow'
}

export function drawTruck(g: CanvasRenderingContext2D, t: TruckLook): void {
  const ay = TRUCK_Y - 32
  g.save()
  g.translate(t.x, ay + t.bob)
  g.rotate(t.lean)
  // Rescued passengers ride on the back.
  for (let i = 0; i < t.passengers.length; i++) {
    sprite(g, t.passengers[i]!, -128 + i * 38, -132 + Math.sin(t.time * 4 + i * 1.7) * 4, 46)
  }
  // Ladder resting on top.
  g.strokeStyle = '#d7dde3'
  g.lineWidth = 5
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(-150, -114)
  g.lineTo(-8, -114)
  g.moveTo(-150, -104)
  g.lineTo(-8, -104)
  for (let x = -140; x < -10; x += 18) {
    g.moveTo(x, -114)
    g.lineTo(x, -104)
  }
  g.stroke()
  // Turret and barrel.
  g.save()
  g.translate(22, -108)
  g.rotate(t.aim)
  rrect(g, 0, -11, 58, 22, 8, '#4a5261')
  rrect(g, 46, -14, 22, 28, 7, '#ffd23f', '#e0a800', 3)
  g.restore()
  circle(g, 22, -106, 21, '#6d7686', '#4a5261', 4)
  // Body.
  rrect(g, -156, -104, 226, 98, 18, '#ea3b35', '#b8211f', 5)
  rrect(g, 56, -138, 106, 132, 26, '#ea3b35', '#b8211f', 5)
  g.fillStyle = '#ea3b35'
  g.fillRect(50, -98, 22, 86)
  rrect(g, -153, -40, 312, 12, 5, '#ffffff')
  // Side lockers and hose reel.
  rrect(g, -140, -90, 50, 42, 8, '#f4605a', '#b8211f', 3)
  rrect(g, -20, -90, 56, 42, 8, '#f4605a', '#b8211f', 3)
  circle(g, -52, -68, 24, '#ffd23f', '#e0a800', 4)
  g.save()
  g.translate(-52, -68)
  g.rotate(t.spraying ? t.time * 9 : 0)
  circle(g, 0, 0, 13, '#f2a900')
  line(g, -13, 0, 13, 0, '#e0a800', 4)
  line(g, 0, -13, 0, 13, '#e0a800', 4)
  g.restore()
  // Roof light.
  const on = t.light > 0 && Math.sin(t.time * 22) > 0
  if (t.light > 0) {
    g.globalAlpha = 0.35 * t.light
    circle(g, 108, -150, 38, on ? '#6cc5ff' : '#ff7a7a')
    g.globalAlpha = 1
  }
  rrect(g, 90, -158, 36, 22, 9, t.light > 0 ? (on ? '#4db8ff' : '#ff5d5d') : '#7fc8f5', '#2c6fa8', 3)
  // Windscreen face.
  rrect(g, 70, -126, 82, 58, 16, '#e3f6ff', '#b8211f', 4)
  eyes(g, 111, -97, 15, t.lookX, t.lookY, t.blink, 1.2)
  g.strokeStyle = '#2c2440'
  g.fillStyle = '#2c2440'
  g.lineWidth = 5
  g.lineCap = 'round'
  g.beginPath()
  if (t.mouth === 'smile') {
    g.arc(112, -62, 17, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
  } else if (t.mouth === 'open') {
    g.arc(112, -58, 16, 0, Math.PI)
    g.closePath()
    g.fill()
    ellipse(g, 112, -47, 8, 4, '#ff7d8f')
  } else {
    g.ellipse(112, -52, 9, 11, 0, 0, TAU)
    g.fill()
  }
  ellipse(g, 84, -58, 9, 5, 'rgba(255,255,255,0.35)')
  ellipse(g, 140, -58, 9, 5, 'rgba(255,255,255,0.35)')
  // Bumper and headlight.
  rrect(g, 150, -26, 22, 18, 7, '#d7dde3', '#9aa5b1', 3)
  circle(g, 159, -50, 9, '#fff3b0', '#e0a800', 3)
  // Wheels.
  for (const wx of [-98, 100]) {
    circle(g, wx, 0, 32, '#2b2b33')
    circle(g, wx, 0, 15, '#d7dde3')
    g.save()
    g.translate(wx, 0)
    g.rotate(t.wheel)
    for (let i = 0; i < 3; i++) {
      g.rotate(TAU / 3)
      line(g, 0, 0, 13, 0, '#8d97a5', 4)
    }
    g.restore()
    circle(g, wx, 0, 5, '#4a5261')
  }
  g.restore()
}
