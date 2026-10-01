// Everything Gem Miner pre-renders once (block tiles, find icons, the soft light
// used to cut holes in the dark) and the characters it draws live. Call
// `createArt` inside `create`: it needs the DOM.

import { face } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'
import { FINDS, LAYERS, TILE } from './world.ts'
import type { Find, Layer } from './world.ts'

const OUT = '#2a1a2e'

export const PICK_COLORS = ['#a9afbc', '#ff9a4a', '#ffd23a', '#5fe3ff', '#ff4d8d'] as const

// The darkness is composed at a quarter of the field's size and stretched.
export const DARK_W = 295
export const DARK_H = 205

export interface Art {
  // [layer][variant]
  tiles: HTMLCanvasElement[][]
  back: HTMLCanvasElement[]
  grass: HTMLCanvasElement
  lava: HTMLCanvasElement
  tnt: HTMLCanvasElement
  plate: HTMLCanvasElement
  bedrock: HTMLCanvasElement
  icons: Record<Find, HTMLCanvasElement>
  shades: Record<Find, HTMLCanvasElement>
  light: HTMLCanvasElement
  dark: HTMLCanvasElement
  darkCtx: CanvasRenderingContext2D
}

// Pre-rendered art is drawn at twice its logical size so it stays crisp on a
// high-density iPad screen; callers always draw it back at the logical size.
const SS = 2

function canvas(w: number, h: number, scale = SS): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement('canvas')
  el.width = Math.ceil(w * scale)
  el.height = Math.ceil(h * scale)
  const c = el.getContext('2d')
  if (!c) throw new Error('no 2d context')
  c.scale(scale, scale)
  c.lineJoin = 'round'
  c.lineCap = 'round'
  return [el, c]
}

// A tiny repeatable generator so the textures are the same every load.
function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

type Pt = readonly [number, number]

function poly(c: CanvasRenderingContext2D, pts: readonly Pt[], fill: string, stroke: string | null = OUT, width = 6): void {
  c.beginPath()
  pts.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)))
  c.closePath()
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = width
    c.stroke()
  }
  c.fillStyle = fill
  c.fill()
}

function glint(c: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#ffffff'): void {
  c.fillStyle = color
  c.beginPath()
  c.moveTo(x, y - r)
  c.quadraticCurveTo(x, y, x + r, y)
  c.quadraticCurveTo(x, y, x, y + r)
  c.quadraticCurveTo(x, y, x - r, y)
  c.quadraticCurveTo(x, y, x, y - r)
  c.fill()
}

function blockTile(layer: Layer, index: number, variant: number): HTMLCanvasElement {
  const [el, c] = canvas(TILE, TILE)
  const r = lcg(index * 97 + variant * 13 + 5)
  c.fillStyle = layer.dark
  c.beginPath()
  c.roundRect(1, 1, TILE - 2, TILE - 2, 14)
  c.fill()
  c.fillStyle = layer.base
  c.beginPath()
  c.roundRect(3, 3, TILE - 6, TILE - 13, 12)
  c.fill()
  c.save()
  c.beginPath()
  c.roundRect(3, 3, TILE - 6, TILE - 13, 12)
  c.clip()
  // Speckle, then what makes each layer its own rock.
  for (let i = 0; i < 9; i++) {
    c.globalAlpha = 0.22 + r() * 0.2
    c.fillStyle = r() < 0.5 ? layer.dark : layer.light
    c.beginPath()
    c.ellipse(8 + r() * 68, 12 + r() * 58, 3 + r() * 7, 2 + r() * 5, r() * 3, 0, TAU)
    c.fill()
  }
  c.globalAlpha = 1
  if (index === 0) {
    for (let i = 0; i < 3; i++) {
      c.fillStyle = '#e6b98c'
      c.beginPath()
      c.ellipse(14 + r() * 56, 22 + r() * 44, 5 + r() * 3, 4 + r() * 2, r() * 3, 0, TAU)
      c.fill()
    }
  } else if (index === 1) {
    // Cobbles: a few paler lumps with a shadow under each.
    for (let i = 0; i < 4; i++) {
      const x = 16 + (i % 2) * 34 + r() * 14
      const y = 24 + Math.floor(i / 2) * 26 + r() * 8
      const rx = 9 + r() * 7
      const ry = 6 + r() * 4
      c.fillStyle = layer.dark
      c.globalAlpha = 0.55
      c.beginPath()
      c.ellipse(x + 1, y + 3, rx, ry, 0, 0, TAU)
      c.fill()
      c.fillStyle = layer.light
      c.globalAlpha = 0.8
      c.beginPath()
      c.ellipse(x, y, rx, ry, 0, 0, TAU)
      c.fill()
    }
    c.globalAlpha = 1
  } else if (index === 2) {
    c.strokeStyle = layer.dark
    c.lineWidth = 3
    c.globalAlpha = 0.7
    for (let i = 0; i < 3; i++) {
      const y = 22 + i * 17 + r() * 6
      c.beginPath()
      c.moveTo(4, y)
      c.bezierCurveTo(28, y - 6 + r() * 12, 56, y - 6 + r() * 12, 80, y + r() * 4)
      c.stroke()
    }
    c.globalAlpha = 1
  } else if (index === 3) {
    c.lineWidth = 4
    for (let i = 0; i < 2; i++) {
      c.strokeStyle = i === 0 ? '#ff7a2e' : '#ffc14d'
      c.globalAlpha = 0.85
      let x = r() * 84
      let y = 8
      c.beginPath()
      c.moveTo(x, y)
      for (let k = 0; k < 4; k++) {
        x += -18 + r() * 36
        y += 14 + r() * 10
        c.lineTo(x, y)
      }
      c.stroke()
    }
    c.globalAlpha = 1
  } else {
    for (let i = 0; i < 6; i++) glint(c, 10 + r() * 64, 14 + r() * 54, 3 + r() * 5, r() < 0.5 ? '#9ef0ff' : '#ffd6ff')
  }
  // Bevel: light along the top, a soft shade low down.
  c.globalAlpha = 0.5
  c.fillStyle = layer.light
  c.beginPath()
  c.roundRect(7, 6, TILE - 14, 9, 5)
  c.fill()
  c.globalAlpha = 0.18
  c.fillStyle = '#000000'
  c.fillRect(0, TILE - 26, TILE, 20)
  c.restore()
  c.globalAlpha = 1
  return el
}

function backTile(layer: Layer, index: number): HTMLCanvasElement {
  const [el, c] = canvas(TILE, TILE)
  const r = lcg(index * 31 + 9)
  c.fillStyle = layer.back
  c.fillRect(0, 0, TILE, TILE)
  for (let i = 0; i < 7; i++) {
    c.globalAlpha = 0.16
    c.fillStyle = r() < 0.6 ? layer.dark : '#000000'
    c.beginPath()
    c.ellipse(r() * TILE, r() * TILE, 6 + r() * 12, 4 + r() * 8, r() * 3, 0, TAU)
    c.fill()
  }
  c.globalAlpha = 1
  return el
}

function grassCap(): HTMLCanvasElement {
  const [el, c] = canvas(TILE, 40)
  const r = lcg(77)
  c.fillStyle = '#3f9a3b'
  c.beginPath()
  c.roundRect(0, 12, TILE, 24, [12, 12, 10, 10])
  c.fill()
  c.fillStyle = '#62c94f'
  c.beginPath()
  c.roundRect(0, 10, TILE, 17, [12, 12, 8, 8])
  c.fill()
  c.fillStyle = '#62c94f'
  for (let i = 0; i < 7; i++) {
    const x = 5 + i * 12 + r() * 4
    c.beginPath()
    c.moveTo(x - 5, 14)
    c.quadraticCurveTo(x - 2 + r() * 4, 2 + r() * 6, x + r() * 6 - 3, 1 + r() * 5)
    c.quadraticCurveTo(x + 2, 6, x + 5, 14)
    c.fill()
  }
  c.fillStyle = '#8fe070'
  c.beginPath()
  c.roundRect(6, 13, TILE - 12, 5, 3)
  c.fill()
  return el
}

function lavaTile(): HTMLCanvasElement {
  const [el, c] = canvas(TILE, TILE)
  const r = lcg(404)
  c.fillStyle = '#8a1f0a'
  c.beginPath()
  c.roundRect(1, 1, TILE - 2, TILE - 2, 14)
  c.fill()
  c.fillStyle = '#ff5a14'
  c.beginPath()
  c.roundRect(4, 4, TILE - 8, TILE - 8, 12)
  c.fill()
  for (let i = 0; i < 7; i++) {
    c.fillStyle = i % 2 === 0 ? '#ffb02e' : '#ffe14d'
    c.beginPath()
    c.ellipse(14 + r() * 56, 14 + r() * 56, 6 + r() * 10, 4 + r() * 7, r() * 3, 0, TAU)
    c.fill()
  }
  for (let i = 0; i < 4; i++) {
    c.fillStyle = '#6b1608'
    c.beginPath()
    c.ellipse(12 + r() * 60, 12 + r() * 60, 4 + r() * 6, 3 + r() * 3, r() * 3, 0, TAU)
    c.fill()
  }
  return el
}

function tntTile(): HTMLCanvasElement {
  const [el, c] = canvas(TILE, TILE)
  c.fillStyle = '#7a1420'
  c.beginPath()
  c.roundRect(2, 2, TILE - 4, TILE - 4, 12)
  c.fill()
  c.fillStyle = '#e8343f'
  c.beginPath()
  c.roundRect(5, 5, TILE - 10, TILE - 14, 10)
  c.fill()
  c.fillStyle = '#ff6b6b'
  c.beginPath()
  c.roundRect(9, 8, TILE - 18, 8, 4)
  c.fill()
  c.fillStyle = '#fff3d6'
  c.fillRect(5, 28, TILE - 10, 28)
  c.fillStyle = '#2a1a2e'
  c.font = '900 26px system-ui, -apple-system, sans-serif'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText('TNT', TILE / 2, 43)
  c.strokeStyle = '#7a1420'
  c.lineWidth = 3
  for (const x of [22, 42, 62]) {
    c.beginPath()
    c.moveTo(x, 6)
    c.lineTo(x, 27)
    c.moveTo(x, 57)
    c.lineTo(x, 75)
    c.stroke()
  }
  return el
}

function plateTile(): HTMLCanvasElement {
  const [el, c] = canvas(TILE, TILE)
  c.fillStyle = '#3a4150'
  c.beginPath()
  c.roundRect(1, 1, TILE - 2, TILE - 2, 10)
  c.fill()
  c.fillStyle = '#7c8799'
  c.beginPath()
  c.roundRect(4, 4, TILE - 8, TILE - 12, 8)
  c.fill()
  c.save()
  c.beginPath()
  c.roundRect(4, 4, TILE - 8, 20, 8)
  c.clip()
  for (let i = -2; i < 8; i++) {
    c.fillStyle = i % 2 === 0 ? '#ffcc29' : '#2a2a33'
    c.beginPath()
    c.moveTo(i * 16, 4)
    c.lineTo(i * 16 + 16, 4)
    c.lineTo(i * 16 + 4, 24)
    c.lineTo(i * 16 - 12, 24)
    c.fill()
  }
  c.restore()
  c.fillStyle = '#c9d2e0'
  for (const [x, y] of [[14, 36], [70, 36], [14, 64], [70, 64]] as const) {
    c.beginPath()
    c.arc(x, y, 4, 0, TAU)
    c.fill()
  }
  return el
}

function bedrockTile(): HTMLCanvasElement {
  const [el, c] = canvas(TILE, TILE)
  const r = lcg(13)
  c.fillStyle = '#17131f'
  c.fillRect(0, 0, TILE, TILE)
  for (let i = 0; i < 10; i++) {
    c.fillStyle = r() < 0.5 ? '#2b2438' : '#0c0a12'
    c.beginPath()
    c.ellipse(r() * TILE, r() * TILE, 8 + r() * 12, 6 + r() * 8, r() * 3, 0, TAU)
    c.fill()
  }
  return el
}

function nugget(c: CanvasRenderingContext2D, base: string, facet: string, shade: string): void {
  poly(c, [[-30, -6], [-16, -30], [12, -33], [33, -12], [31, 16], [12, 32], [-16, 31], [-34, 14]], base)
  poly(c, [[-16, -30], [12, -33], [6, -8], [-18, -4]], facet, null)
  poly(c, [[6, -8], [33, -12], [31, 16], [10, 12]], shade, null)
  poly(c, [[-18, -4], [6, -8], [10, 12], [-10, 16]], base, null)
  glint(c, -8, -18, 9)
}

function drawIcon(c: CanvasRenderingContext2D, kind: Find): void {
  if (kind === 'coal') {
    nugget(c, '#3a3a48', '#6a6a82', '#22222c')
  } else if (kind === 'copper') {
    nugget(c, '#e57f35', '#ffbd85', '#b4551c')
  } else if (kind === 'gold') {
    nugget(c, '#ffc629', '#fff3a6', '#e09a12')
    glint(c, 18, 6, 7)
  } else if (kind === 'emerald') {
    poly(c, [[-20, -33], [20, -33], [33, -19], [33, 19], [20, 33], [-20, 33], [-33, 19], [-33, -19]], '#19b862')
    poly(c, [[-14, -21], [14, -21], [21, -13], [21, 13], [14, 21], [-14, 21], [-21, 13], [-21, -13]], '#5cf0a2', null)
    poly(c, [[-14, -21], [14, -21], [21, -13], [-21, -13]], '#b4ffd6', null)
    glint(c, -12, -6, 8)
  } else if (kind === 'diamond') {
    poly(c, [[-35, -10], [-19, -31], [19, -31], [35, -10], [0, 35]], '#2fc8ff')
    poly(c, [[-35, -10], [-19, -31], [19, -31], [35, -10]], '#a6f0ff', null)
    poly(c, [[-13, -10], [13, -10], [0, 35]], '#7fe4ff', null)
    poly(c, [[-13, -10], [-6, -31], [6, -31], [13, -10]], '#e2fbff', null)
    glint(c, -18, -18, 8)
  } else if (kind === 'ruby') {
    poly(c, [[0, -35], [31, -17], [31, 17], [0, 35], [-31, 17], [-31, -17]], '#e8244c')
    poly(c, [[0, -21], [18, -10], [18, 10], [0, 21], [-18, 10], [-18, -10]], '#ff6f8b', null)
    poly(c, [[0, -21], [18, -10], [0, 0], [-18, -10]], '#ffb3c1', null)
    glint(c, -14, -14, 8)
  } else if (kind === 'amethyst') {
    poly(c, [[-31, 32], [-34, 4], [-23, -12], [-12, 4], [-10, 32]], '#8a45dc')
    poly(c, [[10, 32], [12, 0], [24, -16], [34, 0], [31, 32]], '#8a45dc')
    poly(c, [[-13, 32], [-15, -16], [0, -38], [15, -16], [13, 32]], '#a763f7')
    poly(c, [[-15, -16], [0, -38], [0, 32], [-13, 32]], '#cfa2ff', null)
    glint(c, 6, -12, 8)
  } else if (kind === 'star') {
    const pts: Pt[] = []
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const rr = i % 2 === 0 ? 37 : 17
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr])
    }
    poly(c, pts, '#ffe14d')
    poly(c, pts.map(([x, y]) => [x * 0.55, y * 0.55] as const), '#fffad0', null)
    glint(c, -12, -12, 8)
  } else if (kind === 'fossil') {
    c.beginPath()
    c.arc(0, 0, 32, 0, TAU)
    c.strokeStyle = OUT
    c.lineWidth = 6
    c.stroke()
    c.fillStyle = '#eee2c4'
    c.fill()
    c.strokeStyle = '#a38e62'
    c.lineWidth = 5
    c.beginPath()
    for (let i = 0; i <= 60; i++) {
      const a = i * 0.22
      const rr = 3 + i * 0.42
      const x = Math.cos(a) * rr
      const y = Math.sin(a) * rr
      if (i === 0) c.moveTo(x, y)
      else c.lineTo(x, y)
    }
    c.stroke()
    c.lineWidth = 3
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7
      c.beginPath()
      c.moveTo(Math.cos(a) * 20, Math.sin(a) * 20)
      c.lineTo(Math.cos(a) * 29, Math.sin(a) * 29)
      c.stroke()
    }
  } else if (kind === 'chest') {
    c.strokeStyle = OUT
    c.lineWidth = 6
    c.beginPath()
    c.roundRect(-33, -8, 66, 40, 6)
    c.stroke()
    c.fillStyle = '#9a5a28'
    c.fill()
    c.beginPath()
    c.roundRect(-35, -32, 70, 28, [16, 16, 4, 4])
    c.stroke()
    c.fillStyle = '#c47d3c'
    c.fill()
    c.fillStyle = '#ffc629'
    c.fillRect(-22, -30, 9, 60)
    c.fillRect(13, -30, 9, 60)
    c.fillRect(-33, -8, 66, 6)
    c.beginPath()
    c.arc(0, 4, 9, 0, TAU)
    c.fillStyle = '#ffe14d'
    c.fill()
    c.lineWidth = 3
    c.stroke()
    c.fillStyle = OUT
    c.fillRect(-2, 1, 4, 8)
  } else if (kind === 'geode') {
    poly(c, [[-28, -22], [-6, -34], [22, -28], [35, -4], [28, 24], [4, 35], [-24, 28], [-36, 4]], '#858796')
    poly(c, [[-16, -12], [-2, -22], [14, -16], [22, 0], [16, 16], [0, 22], [-14, 14], [-22, 0]], '#5a1fb0', null)
    poly(c, [[-8, 8], [-12, -6], [-4, -14], [2, -2]], '#c58bff', null)
    poly(c, [[2, 12], [4, -6], [12, -10], [16, 4]], '#e6c9ff', null)
    glint(c, 0, -2, 10)
  } else {
    c.beginPath()
    c.ellipse(0, 4, 32, 27, 0, 0, TAU)
    c.strokeStyle = OUT
    c.lineWidth = 6
    c.stroke()
    c.fillStyle = '#8a5a3c'
    c.fill()
    c.beginPath()
    c.ellipse(0, 12, 12, 9, 0, 0, TAU)
    c.fillStyle = '#ff9db0'
    c.fill()
    c.strokeStyle = OUT
    c.lineWidth = 4
    for (const s of [-1, 1]) {
      c.beginPath()
      c.arc(s * 14, -6, 6, 0.1 * Math.PI, 0.9 * Math.PI)
      c.stroke()
    }
  }
}

export function createArt(): Art {
  const tiles = LAYERS.map((layer, i) => [0, 1, 2].map((v) => blockTile(layer, i, v)))
  const back = LAYERS.map((layer, i) => backTile(layer, i))
  const icons = {} as Record<Find, HTMLCanvasElement>
  const shades = {} as Record<Find, HTMLCanvasElement>
  for (const kind of FINDS) {
    const [el, c] = canvas(96, 96)
    c.translate(48, 48)
    drawIcon(c, kind)
    icons[kind] = el
    const [shade, sc] = canvas(96, 96)
    sc.drawImage(el, 0, 0, 96, 96)
    sc.globalCompositeOperation = 'source-in'
    sc.fillStyle = '#7d7396'
    sc.fillRect(0, 0, 96, 96)
    shades[kind] = shade
  }
  const [light, lc] = canvas(128, 128, 1)
  const grad = lc.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.95)')
  grad.addColorStop(0.75, 'rgba(255,255,255,0.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  lc.fillStyle = grad
  lc.fillRect(0, 0, 128, 128)
  const [dark, darkCtx] = canvas(DARK_W, DARK_H, 1)
  return { tiles, back, grass: grassCap(), lava: lavaTile(), tnt: tntTile(), plate: plateTile(), bedrock: bedrockTile(), icons, shades, light, dark, darkCtx }
}

export function icon(g: CanvasRenderingContext2D, art: Art, kind: Find, x: number, y: number, size: number, rot = 0): void {
  const img = art.icons[kind]
  if (rot === 0) {
    g.drawImage(img, x - size / 2, y - size / 2, size, size)
    return
  }
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.drawImage(img, -size / 2, -size / 2, size, size)
  g.restore()
}

// The pickaxe on its own, pointing along +x from the hand: used by the miner
// and by the shop sign.
export function pickaxe(g: CanvasRenderingContext2D, tier: number, length = 36): void {
  g.lineCap = 'round'
  g.strokeStyle = OUT
  g.lineWidth = 10
  g.beginPath()
  g.moveTo(-4, 0)
  g.lineTo(length, 0)
  g.stroke()
  g.strokeStyle = '#a86a36'
  g.lineWidth = 5.5
  g.stroke()
  const k = length / 36
  g.beginPath()
  g.moveTo(length - 9 * k, -23 * k)
  g.quadraticCurveTo(length + 12 * k, 0, length - 9 * k, 23 * k)
  g.strokeStyle = OUT
  g.lineWidth = 13 * k
  g.stroke()
  g.strokeStyle = PICK_COLORS[Math.min(tier, PICK_COLORS.length - 1)]!
  g.lineWidth = 7.5 * k
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.6)'
  g.lineWidth = 2.5 * k
  g.beginPath()
  g.moveTo(length - 6 * k, -16 * k)
  g.quadraticCurveTo(length + 5 * k, -6 * k, length + 3 * k, 2 * k)
  g.stroke()
}

export interface MinerPose {
  x: number
  // Feet.
  y: number
  facing: number
  sx: number
  sy: number
  // Leg cycle phase; legs rest at 0.
  walk: number
  // 0 forward, PI/2 down, -PI/2 up, before the facing flip.
  aim: number
  // Added to aim: 0 is the strike, about -1.3 is the pick at rest.
  pick: number
  lunge: number
  mood: Mood
  lookX: number
  lookY: number
  blink: number
  soot: number
  tier: number
  bag: number
  time: number
}

export function drawMiner(g: CanvasRenderingContext2D, p: MinerPose): void {
  g.save()
  g.translate(p.x, p.y)
  g.scale(p.facing * p.sx, p.sy)
  const lx = Math.cos(p.aim) * p.lunge
  const ly = Math.sin(p.aim) * p.lunge * 0.6
  // Boots.
  const stepA = Math.max(0, Math.sin(p.walk)) * 7
  const stepB = Math.max(0, Math.sin(p.walk + Math.PI)) * 7
  g.fillStyle = OUT
  g.beginPath()
  g.ellipse(-10, -6 - stepA, 11, 7.5, 0, 0, TAU)
  g.ellipse(11, -6 - stepB, 11, 7.5, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#6b3f22'
  g.beginPath()
  g.ellipse(-9, -7 - stepA, 8.5, 5, 0, 0, TAU)
  g.ellipse(12, -7 - stepB, 8.5, 5, 0, 0, TAU)
  g.fill()
  g.translate(lx, ly)
  // Backpack: fatter as it fills.
  const fat = 10 + p.bag * 9
  g.beginPath()
  g.roundRect(-20 - fat, -42, fat + 8, 27, 8)
  g.fillStyle = '#b86a2e'
  g.strokeStyle = OUT
  g.lineWidth = 4
  g.stroke()
  g.fill()
  // Body: blue overalls over a red shirt.
  g.beginPath()
  g.roundRect(-17, -44, 34, 34, 11)
  g.stroke()
  g.fillStyle = '#e8503a'
  g.fill()
  g.beginPath()
  g.roundRect(-17, -32, 34, 22, [4, 4, 11, 11])
  g.fillStyle = '#3d7fe0'
  g.fill()
  g.fillRect(-11, -40, 6, 10)
  g.fillRect(5, -40, 6, 10)
  g.fillStyle = '#ffd23a'
  g.beginPath()
  g.arc(-8, -30, 2.5, 0, TAU)
  g.arc(8, -30, 2.5, 0, TAU)
  g.fill()
  // Head.
  g.beginPath()
  g.arc(0, -58, 22, 0, TAU)
  g.strokeStyle = OUT
  g.lineWidth = 4
  g.stroke()
  g.fillStyle = '#ffd9b0'
  g.fill()
  if (p.soot > 0.02) {
    g.globalAlpha = Math.min(0.85, p.soot)
    g.fillStyle = '#2b2026'
    g.beginPath()
    g.arc(0, -56, 20, 0, TAU)
    g.fill()
    g.globalAlpha = 1
  }
  // The face is drawn unflipped so the look direction stays true.
  g.save()
  g.scale(p.facing, 1)
  face(g, p.facing * 4, -59, 6, p.mood, p.lookX, p.lookY, p.blink)
  g.restore()
  // Helmet and lamp.
  g.beginPath()
  g.arc(0, -64, 23, Math.PI, 0)
  g.closePath()
  g.strokeStyle = OUT
  g.lineWidth = 4
  g.stroke()
  g.fillStyle = '#ffcc29'
  g.fill()
  g.beginPath()
  g.roundRect(-27, -68, 56, 8, 4)
  g.stroke()
  g.fill()
  g.fillStyle = '#fff1a8'
  g.beginPath()
  g.ellipse(-8, -79, 8, 3.5, -0.4, 0, TAU)
  g.fill()
  g.beginPath()
  g.arc(15, -76, 7.5, 0, TAU)
  g.strokeStyle = OUT
  g.lineWidth = 3
  g.stroke()
  g.fillStyle = '#fffbe0'
  g.fill()
  g.globalAlpha = 0.35 + Math.sin(p.time * 9) * 0.06
  g.fillStyle = '#fff7b0'
  g.beginPath()
  g.arc(15, -76, 15, 0, TAU)
  g.fill()
  g.globalAlpha = 1
  // Arm and pickaxe.
  g.save()
  g.translate(7, -36)
  g.rotate(p.aim + p.pick)
  pickaxe(g, p.tier)
  g.beginPath()
  g.arc(7, 0, 6.5, 0, TAU)
  g.strokeStyle = OUT
  g.lineWidth = 3
  g.stroke()
  g.fillStyle = '#ffd9b0'
  g.fill()
  g.restore()
  g.restore()
}

// A round mole, centred. Asleep it breathes; awake it stares.
export function drawMole(g: CanvasRenderingContext2D, x: number, y: number, awake: boolean, time: number, scale = 1, glasses = false, mood: Mood = 'wow', lookX = 0): void {
  g.save()
  g.translate(x, y)
  const breathe = awake ? 1 : 1 + Math.sin(time * 2.2) * 0.04
  g.scale(scale * (2 - breathe), scale * breathe)
  g.beginPath()
  g.ellipse(0, 6, 31, 26, 0, 0, TAU)
  g.strokeStyle = OUT
  g.lineWidth = 4
  g.stroke()
  g.fillStyle = '#8a5a3c'
  g.fill()
  g.fillStyle = '#a97552'
  g.beginPath()
  g.ellipse(0, 14, 19, 13, 0, 0, TAU)
  g.fill()
  // Paws.
  g.fillStyle = '#ffb3c1'
  const flail = awake && mood === 'wow' ? Math.sin(time * 30) * 5 : 0
  g.beginPath()
  g.ellipse(-25, 22 + flail, 8, 5.5, 0.4, 0, TAU)
  g.ellipse(25, 22 - flail, 8, 5.5, -0.4, 0, TAU)
  g.fill()
  if (awake) {
    face(g, 0, -4, 6, mood, lookX, 0, 0)
  } else {
    g.strokeStyle = OUT
    g.lineWidth = 3.5
    for (const s of [-1, 1]) {
      g.beginPath()
      g.arc(s * 10, -5, 5.5, 0.15 * Math.PI, 0.85 * Math.PI)
      g.stroke()
    }
  }
  // Nose over the mouth.
  g.beginPath()
  g.ellipse(0, 5, 8, 6, 0, 0, TAU)
  g.fillStyle = '#ff8fa3'
  g.fill()
  g.strokeStyle = OUT
  g.lineWidth = 2.5
  g.stroke()
  if (glasses) {
    g.strokeStyle = OUT
    g.lineWidth = 3
    g.beginPath()
    g.arc(-7.5, -4, 8.5, 0, TAU)
    g.moveTo(16, -4)
    g.arc(7.5, -4, 8.5, 0, TAU)
    g.stroke()
  }
  g.restore()
}

// Three cumulative stages of cracks in tile-local coordinates.
const CRACKS: readonly (readonly Pt[])[][] = [
  [[[42, 40], [30, 26], [34, 12]], [[42, 40], [58, 50], [62, 66]]],
  [[[42, 40], [24, 48], [10, 42]], [[30, 26], [16, 22]], [[58, 50], [74, 44]]],
  [[[42, 40], [46, 22], [60, 10]], [[24, 48], [22, 66], [30, 78]], [[62, 66], [50, 78]], [[46, 22], [36, 6]]],
]

export function cracks(g: CanvasRenderingContext2D, x: number, y: number, stage: number): void {
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (let pass = 0; pass < 2; pass++) {
    g.strokeStyle = pass === 0 ? 'rgba(20,10,20,0.75)' : 'rgba(255,255,255,0.35)'
    g.lineWidth = pass === 0 ? 5 : 1.5
    g.beginPath()
    for (let s = 0; s < stage && s < CRACKS.length; s++) {
      for (const seg of CRACKS[s]!) {
        seg.forEach(([px, py], i) => (i === 0 ? g.moveTo(x + px + pass, y + py + pass) : g.lineTo(x + px + pass, y + py + pass)))
      }
    }
    g.stroke()
  }
}

export function twinkle(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  glint(g, x, y, r, color)
}

export type TextDraw = (g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color?: string, align?: 'center' | 'left', outline?: boolean) => void

// Outlined text drawn once to a canvas and reused: stroking glyphs every frame
// is the most expensive thing a HUD can do.
export function createText(): TextDraw {
  const cache = new Map<string, HTMLCanvasElement>()
  const [, probe] = canvas(4, 4, 1)
  return (g, text, x, y, size, color = '#ffffff', align = 'center', outline = true) => {
    const key = `${size}|${color}|${outline ? 1 : 0}|${text}`
    let el = cache.get(key)
    if (!el) {
      if (cache.size > 240) cache.clear()
      const font = `900 ${size * 2}px system-ui, -apple-system, 'Segoe UI', sans-serif`
      probe.font = font
      const w = Math.ceil(probe.measureText(text).width + size * 1.2)
      const h = Math.ceil(size * 3.2)
      const [made, c] = canvas(w, h, 1)
      c.font = font
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      if (outline) {
        c.lineWidth = Math.max(8, size * 0.36)
        c.strokeStyle = 'rgba(30,20,40,0.85)'
        c.strokeText(text, w / 2, h / 2)
      }
      c.fillStyle = color
      c.fillText(text, w / 2, h / 2)
      el = made
      cache.set(key, el)
    }
    const w = el.width / 2
    const h = el.height / 2
    g.drawImage(el, align === 'center' ? x - w / 2 : x - size * 0.3, y - h / 2, w, h)
  }
}
