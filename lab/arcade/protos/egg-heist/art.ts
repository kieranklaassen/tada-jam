// Everything Egg Heist draws that is not an emoji: the yard, the props, the
// eggs, and the three characters who have to squash, scurry and glare.

import { circle, ellipse, eyes, line, rrect } from '../../kit/draw.ts'
import { TAU, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { BARN, DEN, HEDGES, KENNEL, NESTS, POND, SAFE } from './world.ts'

type G = CanvasRenderingContext2D

const INK = '#2b2230'

function poly(g: G, pts: readonly number[], fill: string, stroke?: string, width = 3): void {
  g.beginPath()
  for (let i = 0; i < pts.length; i += 2) {
    if (i === 0) g.moveTo(pts[i]!, pts[i + 1]!)
    else g.lineTo(pts[i]!, pts[i + 1]!)
  }
  g.closePath()
  g.fillStyle = fill
  g.fill()
  if (stroke) {
    g.strokeStyle = stroke
    g.lineWidth = width
    g.lineJoin = 'round'
    g.stroke()
  }
}

// ---------------------------------------------------------------- backdrop

export function paintBackdrop(c: G, rand: () => number): void {
  const grad = c.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#a6df7a')
  grad.addColorStop(1, '#7bc75d')
  c.fillStyle = grad
  c.fillRect(0, 0, W, H)
  // Mown stripes and soft patches so the grass is not one flat colour.
  for (let i = 0; i < 12; i += 2) {
    c.fillStyle = 'rgba(255,255,255,0.07)'
    c.fillRect(i * 100, 96, 100, H)
  }
  for (let i = 0; i < 46; i++) {
    ellipse(c, rand() * W, 130 + rand() * (H - 130), 40 + rand() * 90, 16 + rand() * 34, i % 2 ? 'rgba(255,255,200,0.08)' : 'rgba(20,110,40,0.07)', rand() * 0.6 - 0.3)
  }

  // A dirt track from the den, under the pond, up to the barn door.
  const track = () => {
    c.beginPath()
    c.moveTo(150, 472)
    c.bezierCurveTo(380, 610, 660, 570, 800, 505)
    c.bezierCurveTo(900, 458, 985, 330, 1072, 170)
  }
  c.lineCap = 'round'
  c.strokeStyle = '#c9a96e'
  c.lineWidth = 64
  track()
  c.stroke()
  c.strokeStyle = '#e2c68e'
  c.lineWidth = 52
  track()
  c.stroke()
  // The den's porch: the safe patch.
  ellipse(c, SAFE.x - 6, SAFE.y + 6, SAFE.r + 12, SAFE.r * 0.9, '#c9a96e')
  ellipse(c, SAFE.x - 6, SAFE.y + 4, SAFE.r + 4, SAFE.r * 0.83, '#e7cd98')
  for (let i = 0; i < 14; i++) {
    const a = rand() * TAU
    const r = 0.3 + rand() * 0.6
    circle(c, SAFE.x - 6 + Math.cos(a) * SAFE.r * r, SAFE.y + 4 + Math.sin(a) * SAFE.r * 0.8 * r, 2 + rand() * 3, 'rgba(120,90,50,0.25)')
  }

  // Tufts and flowers.
  c.lineCap = 'round'
  for (let i = 0; i < 90; i++) {
    const x = 20 + rand() * (W - 40)
    const y = 140 + rand() * (H - 160)
    c.strokeStyle = i % 3 === 0 ? '#93d66c' : '#58a947'
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(x - 5, y)
    c.lineTo(x - 8, y - 9)
    c.moveTo(x, y)
    c.lineTo(x, y - 12)
    c.moveTo(x + 5, y)
    c.lineTo(x + 8, y - 9)
    c.stroke()
  }
  const petals = ['#ffffff', '#ffe36e', '#ff9ec4', '#ffffff', '#c9b6ff']
  for (let i = 0; i < 46; i++) {
    const x = 20 + rand() * (W - 40)
    const y = 140 + rand() * (H - 160)
    const col = petals[i % petals.length]!
    for (let k = 0; k < 5; k++) circle(c, x + Math.cos((k / 5) * TAU) * 4.5, y + Math.sin((k / 5) * TAU) * 4.5, 3.4, col)
    circle(c, x, y, 2.8, '#f6a623')
  }

  // The pond.
  ellipse(c, POND.x, POND.y + 5, POND.rx + 11, POND.ry + 10, '#57a548')
  ellipse(c, POND.x, POND.y, POND.rx, POND.ry, '#56b9e3')
  ellipse(c, POND.x - 10, POND.y - 7, POND.rx * 0.8, POND.ry * 0.66, '#84d5f5')
  ellipse(c, POND.x - 34, POND.y - 22, 30, 8, 'rgba(255,255,255,0.45)', -0.2)
  for (const [px, py, r] of [
    [52, 22, 15],
    [-58, 26, 12],
    [20, -34, 10],
  ] as const) {
    ellipse(c, POND.x + px, POND.y + py, r, r * 0.62, '#3f9d4b')
    ellipse(c, POND.x + px - 2, POND.y + py - 2, r * 0.72, r * 0.4, '#58bb62')
    circle(c, POND.x + px + 3, POND.y + py - 4, 4, '#ff9ec4')
  }
  for (const rx of [-96, -88, 92]) {
    line(c, POND.x + rx, POND.y + 24, POND.x + rx - 3, POND.y - 14, '#3f8f3a', 4)
    ellipse(c, POND.x + rx - 3, POND.y - 18, 4, 9, '#7a5230')
  }

  // Beyond the fence: a wheat field, then the fence itself.
  c.fillStyle = '#efdc8c'
  c.fillRect(0, 0, W, 98)
  c.fillStyle = '#e3cc74'
  for (let i = 0; i < 8; i++) c.fillRect(0, 8 + i * 12, W, 4)
  c.strokeStyle = '#d2b659'
  c.lineWidth = 3
  for (let i = 0; i < 120; i++) {
    const x = rand() * W
    const y = 10 + rand() * 80
    c.beginPath()
    c.moveTo(x, y)
    c.lineTo(x + 3, y - 10)
    c.stroke()
  }
  ellipse(c, 0, 99, W * 2, 5, 'rgba(60,120,50,0.35)')
  rrect(c, -10, 84, BARN.x + 10, 9, 4, '#dca76b', '#8f5f34', 2.5)
  rrect(c, -10, 102, BARN.x + 10, 9, 4, '#dca76b', '#8f5f34', 2.5)
  for (let x = 24; x < BARN.x - 10; x += 59) rrect(c, x - 7, 72, 14, 50, 5, '#c98f56', '#8f5f34', 2.5)

  // The barn the farmer lives in.
  ellipse(c, BARN.x + BARN.w / 2, BARN.h + 2, BARN.w * 0.56, 12, 'rgba(0,0,0,0.18)')
  rrect(c, BARN.x + 6, 30, BARN.w - 12, BARN.h - 30, 6, '#d64a3d', '#8a2a25', 4)
  for (let x = BARN.x + 26; x < BARN.x + BARN.w - 10; x += 22) line(c, x, 44, x, BARN.h - 4, 'rgba(90,20,20,0.22)', 2)
  poly(c, [BARN.x - 8, 50, BARN.x + 34, 4, BARN.x + BARN.w - 34, 4, BARN.x + BARN.w + 8, 50], '#7d3b37', '#55221f', 4)
  line(c, BARN.x - 4, 50, BARN.x + BARN.w + 4, 50, '#fff3df', 6)
  circle(c, BARN.x + BARN.w / 2, 28, 11, '#3a1d1a', '#fff3df', 4)
  rrect(c, 1042, 84, 66, 74, 4, '#b8392f', '#fff3df', 5)
  line(c, 1046, 88, 1104, 154, '#fff3df', 4)
  line(c, 1104, 88, 1046, 154, '#fff3df', 4)
  // Hay beside the door.
  rrect(c, 992, 118, 40, 38, 8, '#ecc95a', '#b88f2a', 3)
  line(c, 1000, 130, 1024, 130, '#b88f2a', 2)
  line(c, 1000, 144, 1024, 144, '#b88f2a', 2)

  for (const n of NESTS) paintNest(c, n.x, n.y, n.tier, rand)
}

function paintNest(c: G, x: number, y: number, tier: number, rand: () => number): void {
  if (tier === 3) {
    // A scorched hollow ringed with stones for the dragon egg.
    ellipse(c, x, y + 10, 84, 44, 'rgba(60,40,70,0.35)')
    ellipse(c, x, y + 10, 58, 28, '#4a3b57')
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * TAU
      ellipse(c, x + Math.cos(a) * 60, y + 10 + Math.sin(a) * 30, 14 + rand() * 5, 10 + rand() * 4, i % 2 ? '#8a7f96' : '#6f6480')
    }
    ellipse(c, x, y + 8, 44, 20, '#35283f')
    return
  }
  ellipse(c, x, y + 16, 56, 22, 'rgba(0,0,0,0.16)')
  ellipse(c, x, y + 9, 52, 25, tier === 2 ? '#c99a2e' : '#c49a3c')
  ellipse(c, x, y + 6, 48, 22, tier === 2 ? '#f0c64e' : '#e2bb58')
  ellipse(c, x, y + 5, 33, 13, '#a87c2a')
  c.lineCap = 'round'
  for (let i = 0; i < 26; i++) {
    const a = rand() * TAU
    const r = 0.78 + rand() * 0.3
    const sx = x + Math.cos(a) * 42 * r
    const sy = y + 6 + Math.sin(a) * 18 * r
    line(c, sx, sy, sx + (rand() - 0.5) * 22, sy + (rand() - 0.5) * 8, i % 2 ? '#f7dc84' : '#b8882c', 2.5)
  }
}

// ---------------------------------------------------------------- props
// These go on their own layer so the characters can walk behind them.

export function paintDen(c: G): void {
  const x = DEN.x
  const y = DEN.y
  ellipse(c, x, y + 34, 86, 17, 'rgba(0,0,0,0.2)')
  ellipse(c, x - 58, y + 28, 24, 12, '#8a5c34')
  ellipse(c, x + 60, y + 28, 24, 12, '#8a5c34')
  rrect(c, x - 62, y - 76, 124, 112, 30, '#a5713f', '#6a4424', 4)
  line(c, x - 40, y - 46, x - 42, y + 8, '#875a30', 4)
  line(c, x + 42, y - 50, x + 44, y - 4, '#875a30', 4)
  line(c, x - 22, y - 58, x - 22, y - 34, '#875a30', 4)
  // The sawn top with its rings.
  ellipse(c, x, y - 72, 66, 25, '#6a4424')
  ellipse(c, x, y - 74, 60, 21, '#dcb176')
  c.strokeStyle = '#b98a4e'
  c.lineWidth = 3
  for (const k of [0.72, 0.42]) {
    c.beginPath()
    c.ellipse(x, y - 74, 60 * k, 21 * k, 0, 0, TAU)
    c.stroke()
  }
  // The door.
  c.beginPath()
  c.moveTo(x - 26, y + 36)
  c.lineTo(x - 26, y - 4)
  c.arc(x + 6, y - 4, 32, Math.PI, 0)
  c.lineTo(x + 38, y + 36)
  c.closePath()
  c.fillStyle = '#23140d'
  c.fill()
  c.strokeStyle = '#6a4424'
  c.lineWidth = 5
  c.stroke()
  rrect(c, x - 30, y + 30, 74, 12, 5, '#d8473d', '#9c2c25', 2.5)
  // A sprig of leaves and a mushroom so it reads as a home.
  ellipse(c, x + 40, y - 88, 17, 9, '#4fb35a', -0.5)
  ellipse(c, x + 58, y - 80, 15, 8, '#3a9a48', 0.3)
  rrect(c, x - 78, y + 12, 9, 18, 4, '#f5ead2')
  ellipse(c, x - 73, y + 12, 16, 10, '#e8503f')
  circle(c, x - 78, y + 9, 3, '#fff')
  circle(c, x - 68, y + 12, 2.4, '#fff')
}

export function paintKennel(c: G): void {
  const x = KENNEL.x
  const y = KENNEL.y
  ellipse(c, x, y + 40, 60, 14, 'rgba(0,0,0,0.18)')
  rrect(c, x - 44, y - 24, 88, 66, 8, '#4f92da', '#2a5c99', 4)
  c.beginPath()
  c.moveTo(x - 23, y + 42)
  c.lineTo(x - 23, y + 10)
  c.arc(x, y + 10, 23, Math.PI, 0)
  c.lineTo(x + 23, y + 42)
  c.closePath()
  c.fillStyle = '#16233a'
  c.fill()
  poly(c, [x - 60, y - 16, x, y - 66, x + 60, y - 16], '#ee5d4d', '#a8352b', 4)
  // A bone over the door.
  line(c, x - 9, y - 27, x + 9, y - 27, '#fff6e0', 6)
  for (const s of [-1, 1]) {
    circle(c, x + s * 11, y - 30, 4, '#fff6e0')
    circle(c, x + s * 11, y - 24, 4, '#fff6e0')
  }
}

export function paintHedges(c: G): void {
  for (const r of HEDGES) rrect(c, r.x - 5, r.y - 2, r.w + 10, r.h + 8, 22, '#266b33')
  for (const r of HEDGES) rrect(c, r.x - 5, r.y - 24, r.w + 10, r.h + 6, 22, '#3c9a49')
  let k = 0
  for (const r of HEDGES) {
    const across = r.w > r.h
    const n = Math.floor((across ? r.w : r.h) / 24)
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = across ? r.x + t * r.w : r.x + r.w / 2 + (i % 2 ? 9 : -9)
      const y = (across ? r.y + r.h / 2 + (i % 2 ? 7 : -7) : r.y + t * (r.h - 30)) - 22
      circle(c, x, y, 15, i % 2 ? '#55b85f' : '#47a853')
      circle(c, x - 4, y - 5, 6, 'rgba(190,255,170,0.35)')
      if (k++ % 3 === 0) circle(c, x + 6, y + 4, 3.5, '#ffd0e6')
    }
  }
}

// ---------------------------------------------------------------- things

export function drawBush(g: G, x: number, y: number, r: number, sy: number, lean: number): void {
  g.save()
  g.translate(x, y + r * 0.45)
  g.rotate(lean)
  g.scale(2 - sy, sy)
  ellipse(g, 0, 0, r * 1.05, r * 0.3, 'rgba(0,0,0,0.2)')
  circle(g, -r * 0.55, -r * 0.42, r * 0.6, '#2b8a40')
  circle(g, r * 0.55, -r * 0.42, r * 0.6, '#2b8a40')
  circle(g, 0, -r * 0.8, r * 0.8, '#36a24d')
  circle(g, -r * 0.34, -r * 1.06, r * 0.42, '#52bd61')
  circle(g, r * 0.4, -r * 0.92, r * 0.3, '#52bd61')
  circle(g, -r * 0.46, -r * 1.16, r * 0.16, 'rgba(210,255,190,0.45)')
  circle(g, r * 0.62, -r * 0.34, 4.5, '#ff5d6c')
  circle(g, -r * 0.7, -r * 0.5, 4, '#ff5d6c')
  circle(g, r * 0.1, -r * 0.42, 4, '#ff5d6c')
  g.restore()
}

function eggPath(g: G, w: number, h: number): void {
  g.beginPath()
  g.moveTo(-w, h * 0.15)
  g.bezierCurveTo(-w, -h * 0.75, -w * 0.45, -h, 0, -h)
  g.bezierCurveTo(w * 0.45, -h, w, -h * 0.75, w, h * 0.15)
  g.bezierCurveTo(w, h * 0.8, w * 0.55, h, 0, h)
  g.bezierCurveTo(-w * 0.55, h, -w, h * 0.8, -w, h * 0.15)
  g.closePath()
}

const EGG_FILL = ['#fffaf0', '#8fe0ee', '#ffd13b', '#8a4dff']
const EGG_SHADE = ['#e6d8bf', '#55b9cc', '#ea9a10', '#4a1fb0']

// (x, y) is the egg's centre; it rocks about its base.
export function drawEgg(g: G, x: number, y: number, size: number, rarity: number, time: number, rot = 0): void {
  const h = size / 2
  const w = size * 0.39
  if (rarity === 3) {
    const pulse = 0.75 + Math.sin(time * 4) * 0.25
    const halo = g.createRadialGradient(x, y, size * 0.2, x, y, size * 1.25)
    halo.addColorStop(0, `rgba(200,140,255,${0.7 * pulse})`)
    halo.addColorStop(1, 'rgba(200,140,255,0)')
    g.fillStyle = halo
    g.fillRect(x - size * 1.3, y - size * 1.3, size * 2.6, size * 2.6)
  } else if (rarity === 2) {
    ellipse(g, x, y, size * 0.72, size * 0.8, `rgba(255,240,150,${0.28 + Math.sin(time * 5) * 0.1})`)
  }
  g.save()
  g.translate(x, y + h)
  if (rot) g.rotate(rot)
  g.translate(0, -h)
  eggPath(g, w, h)
  g.fillStyle = EGG_SHADE[rarity] ?? '#ddd'
  g.fill()
  g.save()
  g.clip()
  g.save()
  g.translate(-w * 0.28, -h * 0.22)
  g.scale(0.97, 0.97)
  eggPath(g, w, h)
  g.fillStyle = EGG_FILL[rarity] ?? '#fff'
  g.fill()
  g.restore()
  if (rarity === 1) {
    for (const [sx, sy, sr] of [
      [-0.4, -0.35, 0.2],
      [0.3, -0.55, 0.14],
      [0.1, 0.1, 0.24],
      [-0.55, 0.4, 0.16],
      [0.55, 0.5, 0.18],
      [-0.1, 0.7, 0.13],
    ] as const) {
      ellipse(g, sx * w, sy * h, sr * size * 0.5, sr * size * 0.42, '#7a5230', sx)
    }
  } else if (rarity === 3) {
    g.strokeStyle = 'rgba(225,200,255,0.75)'
    g.lineWidth = 2.5
    for (let row = -2; row <= 2; row++) {
      for (let col = -2; col <= 2; col++) {
        g.beginPath()
        g.arc(col * w * 0.62 + (row % 2 ? w * 0.31 : 0), row * h * 0.38, w * 0.33, 0.1 * Math.PI, 0.9 * Math.PI)
        g.stroke()
      }
    }
    circle(g, -w * 0.1, h * 0.25, w * 0.2, `rgba(110,255,220,${0.6 + Math.sin(time * 6) * 0.3})`)
    circle(g, w * 0.4, -h * 0.3, w * 0.13, `rgba(110,255,220,${0.6 + Math.cos(time * 5) * 0.3})`)
  }
  ellipse(g, -w * 0.4, -h * 0.45, w * 0.22, h * 0.3, 'rgba(255,255,255,0.75)', 0.5)
  g.restore()
  eggPath(g, w, h)
  g.strokeStyle = rarity === 3 ? '#2c0f70' : rarity === 2 ? '#9a6208' : '#5c4a36'
  g.lineWidth = 3
  g.stroke()
  g.restore()
  if (rarity >= 2) {
    // Twinkles.
    for (let i = 0; i < 3; i++) {
      const ph = time * 2.2 + i * 2.1
      const a = Math.max(0, Math.sin(ph))
      if (a < 0.05) continue
      const tx = x + Math.cos(i * 2.4 + 0.6) * size * 0.62
      const ty = y + Math.sin(i * 2.4 + 0.6) * size * 0.62
      g.fillStyle = rarity === 3 ? `rgba(230,200,255,${a})` : `rgba(255,255,255,${a})`
      g.beginPath()
      const r = 9 * a
      g.moveTo(tx, ty - r)
      g.quadraticCurveTo(tx, ty, tx + r, ty)
      g.quadraticCurveTo(tx, ty, tx, ty + r)
      g.quadraticCurveTo(tx, ty, tx - r, ty)
      g.quadraticCurveTo(tx, ty, tx, ty - r)
      g.fill()
    }
  }
}

export function drawCoin(g: G, x: number, y: number, r: number): void {
  circle(g, x, y, r, '#f2a81d', '#9a6208', Math.max(2, r * 0.14))
  circle(g, x, y, r * 0.72, '#ffd84a')
  ellipse(g, x - r * 0.25, y - r * 0.3, r * 0.22, r * 0.34, 'rgba(255,255,255,0.8)', 0.6)
}

export function drawCan(g: G, x: number, y: number, rot: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  rrect(g, -11, -15, 22, 30, 4, '#c9d1d9', '#5d6873', 3)
  rrect(g, -11, -7, 22, 14, 0, '#e8503f')
  ellipse(g, 0, -15, 11, 4, '#eef2f5')
  g.restore()
}

// ---------------------------------------------------------------- raccoon

export interface RaccoonLook {
  flip: number
  // Run cycle phase and how much of it shows (0 standing, 1 running).
  phase: number
  moving: number
  // Stretch: 1 round, below flat, above tall.
  sy: number
  lookX: number
  lookY: number
  blink: number
  mood: 'happy' | 'wow' | 'dizzy' | 'strain' | 'glee'
  shoes: number
  carrying: boolean
  time: number
}

export function drawRaccoon(g: G, x: number, y: number, o: RaccoonLook): void {
  const f = o.flip
  const s = Math.max(0.3, o.sy)
  g.save()
  g.translate(x, y)
  g.scale(1.22 / Math.sqrt(s), 1.22 * s)
  const bob = Math.abs(Math.sin(o.phase)) * 4 * o.moving
  // The ringed tail streams out behind.
  for (let i = 5; i >= 1; i--) {
    const tx = -f * (13 + i * 8.5)
    const ty = -20 - i * 5.5 + Math.sin(o.phase * 0.9 + o.time * 2.6 + i * 0.8) * 4 * (0.4 + o.moving) - bob
    circle(g, tx, ty, 12 - i * 0.8, i % 2 === 1 ? '#a7adb7' : '#33363e')
  }
  circle(g, -f * (13 + 5 * 8.5), -20 - 27.5 + Math.sin(o.phase * 0.9 + o.time * 2.6 + 4) * 4 * (0.4 + o.moving) - bob, 5, '#33363e')
  // Feet.
  const swing = Math.sin(o.phase) * 8 * o.moving
  for (const [fx, sw] of [
    [-11, swing],
    [11, -swing],
  ] as const) {
    if (o.shoes > 0) {
      ellipse(g, fx + sw + f * 2, -4, 10.5, 6.5, '#e8413c')
      ellipse(g, fx + sw + f * 2, -1.5, 10.5, 2.4, '#ffffff')
    } else {
      ellipse(g, fx + sw, -4, 8, 5.5, '#33363e')
    }
  }
  // Body and belly.
  ellipse(g, 0, -22 - bob, 22, 19, '#959ca7')
  ellipse(g, f * 4, -18 - bob, 13, 12, '#d8dce2')
  const hx = f * 5
  const hy = -50 - bob * 1.3
  // Arms reach up to the egg.
  if (o.carrying) {
    for (const side of [-1, 1]) {
      line(g, hx + side * 22, hy + 8, hx + side * 15, hy - 27, '#7b818b', 8)
      circle(g, hx + side * 15, hy - 28, 5.5, '#33363e')
    }
  }
  // Ears, head, mask.
  for (const side of [-1, 1]) {
    circle(g, hx + side * 20, hy - 17, 10, '#7b818b')
    circle(g, hx + side * 20, hy - 16, 5.5, '#33363e')
  }
  ellipse(g, hx, hy, 29, 23.5, '#a7adb7')
  for (const side of [-1, 1]) {
    // Pale cheek fluff, a white brow, then the bandit mask.
    poly(g, [hx + side * 24, hy + 2, hx + side * 36, hy + 9, hx + side * 22, hy + 16], '#e6e9ee')
    ellipse(g, hx + side * 13, hy - 9, 12, 7.5, '#eef0f4', side * 0.3)
    ellipse(g, hx + side * 12.5, hy - 1, 14, 9.5, '#2c2f36', -side * 0.22)
  }
  ellipse(g, hx + f * 2, hy + 11, 13, 9, '#f7f7f7')
  ellipse(g, hx + f * 3, hy + 6.5, 4.8, 3.6, '#1c1c22')
  // Mouth.
  g.strokeStyle = '#1c1c22'
  g.fillStyle = '#1c1c22'
  g.lineWidth = 2.2
  g.lineCap = 'round'
  g.beginPath()
  const mx = hx + f * 3
  const my = hy + 13
  if (o.mood === 'wow') {
    g.ellipse(mx, my + 1.5, 3.8, 5, 0, 0, TAU)
    g.fill()
  } else if (o.mood === 'dizzy') {
    g.moveTo(mx - 6, my)
    g.quadraticCurveTo(mx - 3, my - 4, mx, my)
    g.quadraticCurveTo(mx + 3, my + 4, mx + 6, my)
    g.stroke()
  } else if (o.mood === 'strain') {
    g.moveTo(mx - 5, my + 1)
    g.lineTo(mx + 5, my + 1)
    g.stroke()
  } else if (o.mood === 'glee') {
    g.arc(mx, my - 2, 6.5, 0.05 * Math.PI, 0.95 * Math.PI)
    g.closePath()
    g.fill()
  } else {
    g.arc(mx, my - 3, 5.5, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
  }
  if (o.mood === 'dizzy') {
    g.strokeStyle = '#ffffff'
    g.lineWidth = 3
    for (const side of [-1, 1]) {
      const ex = hx + side * 12.5
      g.beginPath()
      g.moveTo(ex - 5, hy - 6)
      g.lineTo(ex + 5, hy + 4)
      g.moveTo(ex + 5, hy - 6)
      g.lineTo(ex - 5, hy + 4)
      g.stroke()
    }
  } else {
    eyes(g, hx, hy - 1.5, 6.4, o.lookX, o.lookY, o.mood === 'glee' ? 0.55 : o.blink, 1.95)
  }
  g.restore()
}

// ---------------------------------------------------------------- goose

export interface GooseLook {
  flip: number
  // Where the head (and the vision cone) points, radians on the ground.
  look: number
  step: number
  moving: number
  // 0 neck tall, 1 neck low and thrust out (the charge).
  low: number
  // 0 shut, 1 honking.
  beak: number
  angry: boolean
  sy: number
  // Wings: 0 folded, otherwise a flap phase.
  flap: number
  grey: boolean
  scale: number
  blink: number
}

export function drawGoose(g: G, x: number, y: number, o: GooseLook): void {
  const f = o.flip
  const white = o.grey ? '#d9dde4' : '#ffffff'
  const edge = o.grey ? '#8d96a6' : '#a9b3c4'
  const wing = o.grey ? '#b7bec9' : '#e3e8f0'
  const s = Math.max(0.3, o.sy)
  g.save()
  g.translate(x, y)
  g.scale(o.scale / Math.sqrt(s), o.scale * s)
  const sw = Math.sin(o.step) * 9 * o.moving
  for (const [ox, d] of [
    [-10, sw],
    [10, -sw],
  ] as const) {
    line(g, ox, -18, ox + d, -3, '#f08a24', 5.5)
    ellipse(g, ox + d + f * 5, -2, 9, 4.5, '#f08a24')
  }
  g.rotate(Math.sin(o.step) * 0.07 * o.moving)
  poly(g, [-f * 30, -38, -f * 56, -58, -f * 26, -56], white, edge, 3)
  ellipse(g, 0, -37, 41, 29, edge)
  ellipse(g, 0, -37, 38, 26, white)
  if (o.flap) {
    for (const side of [-1, 1]) {
      const a = side * (0.5 + Math.sin(o.flap) * 0.7)
      g.save()
      g.translate(side * 16, -48)
      g.rotate(a)
      ellipse(g, side * 22, -6, 27, 12, edge)
      ellipse(g, side * 22, -6, 24.5, 9.5, wing)
      g.restore()
    }
  } else {
    ellipse(g, -f * 7, -37, 24, 14, wing, f * 0.18)
    line(g, -f * 22, -33, -f * 2, -28, edge, 2.5)
  }
  // Neck and head.
  const lx = Math.cos(o.look)
  const ly = Math.sin(o.look)
  const bx = f * 22
  const by = -52
  const hx = lerp(lx * 30, lx * 58, o.low)
  const hy = lerp(-98, -60, o.low) + ly * lerp(12, 24, o.low)
  const neck = (width: number, colour: string) => {
    g.beginPath()
    g.moveTo(bx, by)
    g.quadraticCurveTo(bx + (hx - bx) * 0.15, (by + hy) / 2 - 6, hx, hy)
    g.strokeStyle = colour
    g.lineWidth = width
    g.lineCap = 'round'
    g.stroke()
  }
  neck(20, edge)
  neck(15, white)
  // The beak points where the head looks (the ground is foreshortened).
  const bl = Math.hypot(lx, ly * 0.55) || 1
  const ux = lx / bl
  const uy = (ly * 0.55) / bl
  const open = o.beak * 0.42
  const tip = (turn: number, length: number): [number, number] => {
    const c = Math.cos(turn)
    const sn = Math.sin(turn)
    return [hx + (ux * c - uy * sn) * length, hy + (ux * sn + uy * c) * length]
  }
  const baseX = hx + ux * 9
  const baseY = hy + uy * 9
  const [t1x, t1y] = tip(-open, 34)
  const [t2x, t2y] = tip(open, 30)
  if (open > 0.05) poly(g, [baseX, baseY, t1x, t1y, t2x, t2y], '#a3222a')
  poly(g, [baseX - uy * 9, baseY + ux * 9, baseX + uy * 1, baseY - ux * 1, t2x, t2y], '#e0761a', '#a85410', 2)
  poly(g, [baseX + uy * 9, baseY - ux * 9, baseX - uy * 1, baseY + ux * 1, t1x, t1y], '#f59a2e', '#a85410', 2)
  circle(g, hx, hy, 16, white, edge, 2.5)
  const ex = hx + ux * 5
  const ey = hy - 4 + uy * 3
  if (o.blink > 0.5) {
    line(g, ex - 4, ey, ex + 4, ey, INK, 2.5)
  } else {
    circle(g, ex, ey, o.angry ? 4.6 : 4, INK)
    circle(g, ex - 1.2, ey - 1.4, 1.4, '#fff')
  }
  if (o.angry) line(g, ex - ux * 9 - 1, ey - 11, ex + ux * 8, ey - 5, INK, 3.5)
  g.restore()
}

// ---------------------------------------------------------------- dog

export interface DogLook {
  flip: number
  pose: 'sleep' | 'stir' | 'sit' | 'run'
  phase: number
  lookX: number
  blink: number
  // 0 shut, 1 barking.
  bark: number
  time: number
}

export function drawDog(g: G, x: number, y: number, o: DogLook): void {
  const f = o.flip
  const fur = '#d39552'
  const dark = '#8f5a2b'
  g.save()
  g.translate(x, y)
  g.scale(1.15, 1.15)
  if (o.pose === 'sleep' || o.pose === 'stir') {
    const breathe = 1 + Math.sin(o.time * 2.2) * 0.05
    const lift = o.pose === 'stir' ? -6 - Math.sin(o.time * 18) * 1.5 : 0
    ellipse(g, -f * 34, -14, 14, 6, dark, f * 0.6)
    ellipse(g, 0, -15, 38, 19 * breathe, fur)
    ellipse(g, -f * 8, -22, 16, 9, dark, 0.2)
    ellipse(g, f * 16, -5, 12, 6, '#e9bd82')
    circle(g, f * 30, -17 + lift, 20, fur)
    ellipse(g, f * 44, -11 + lift, 11, 9, '#f0d2a4')
    circle(g, f * 52, -14 + lift, 4.6, INK)
    ellipse(g, f * 20, -13 + lift, 8.5, 15, dark, f * (o.pose === 'stir' ? 0.9 + Math.sin(o.time * 20) * 0.3 : 0.4))
    g.strokeStyle = INK
    g.lineWidth = 2.6
    g.lineCap = 'round'
    g.beginPath()
    if (o.pose === 'stir') {
      g.arc(f * 34, -20 + lift, 4.5, 0, TAU)
      g.fillStyle = '#fff'
      g.fill()
      g.stroke()
      circle(g, f * 35, -19 + lift, 2, INK)
    } else {
      g.arc(f * 34, -22, 5, 0.15 * Math.PI, 0.85 * Math.PI)
      g.stroke()
    }
    g.restore()
    return
  }
  const run = o.pose === 'run' ? 1 : 0
  const bounce = Math.abs(Math.sin(o.phase)) * 7 * run
  const sw = Math.sin(o.phase) * 12 * run
  // Tail wags.
  line(g, -f * 22, -30 - bounce, -f * 38, -50 - bounce + Math.sin(o.time * 16) * 6, dark, 7)
  for (const [ox, d] of [
    [-16, sw],
    [-4, -sw],
    [8, sw],
    [18, -sw],
  ] as const) {
    line(g, ox, -16 - bounce, ox + d, -3, fur, 9)
  }
  ellipse(g, 0, -27 - bounce, 30, 21, fur)
  ellipse(g, -f * 8, -34 - bounce, 13, 9, dark, 0.2)
  const hx = f * 20
  const hy = -58 - bounce
  // Ears fly when it runs.
  for (const side of [-1, 1]) ellipse(g, hx + side * 18, hy + 2 - run * 6, 8.5, 16, dark, side * (0.35 + run * (0.5 + Math.sin(o.phase * 2) * 0.3)))
  circle(g, hx, hy, 22, fur)
  ellipse(g, hx + f * 12, hy + 9, 14, 10.5, '#f0d2a4')
  circle(g, hx + f * 20, hy + 4, 5, INK)
  if (o.bark > 0.1) {
    ellipse(g, hx + f * 12, hy + 15, 8, 3 + o.bark * 6, '#7a1f2a')
    ellipse(g, hx + f * 13, hy + 18, 4.5, o.bark * 4, '#ff7d90')
  } else {
    line(g, hx + f * 6, hy + 14, hx + f * 18, hy + 14, INK, 2.4)
  }
  eyes(g, hx + f * 3, hy - 5, 6, o.lookX, 0, o.blink, 1.5)
  if (run) {
    g.lineCap = 'round'
    for (const side of [-1, 1]) line(g, hx + f * 3 + side * 15, hy - 15, hx + f * 3 + side * 3, hy - 10, INK, 3)
  }
  // Collar.
  line(g, hx - f * 14, hy + 19, hx + f * 2, hy + 23, '#e8413c', 6)
  g.restore()
}
