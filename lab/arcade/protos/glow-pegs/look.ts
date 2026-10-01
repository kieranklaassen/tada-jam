// Glow Pegs: geometry and every cached sprite. The look is "mega arcade":
// neon on black, bloom, chrome, a scan-line raster. Everything here is drawn
// once into offscreen canvases inside `create`; the frame loop only blits.

import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'

export const COLORS = ['#ff2d95', '#ff5a1f', '#ffe81a', '#7dff2a', '#19f0ff', '#2f7bff', '#b44bff', '#d3dbff'] as const
export const AMBER = '#ffb52e'

// The peg board: staggered rows like the real toy. An odd number of rows, so
// a row and its mirror image have the same stagger.
export const S = 48
export const RH = 42
export const ROWS = 13
export const BX = 180
export const BY = 68
export const BW = 820
export const BH = 548
export const X0 = 206
export const Y0 = 90
export const PEG_R = 16

// Mirror buttons (left panel) and the show lever (right panel).
export const BTN_X = 88
export const BTN_Y = [202, 342, 482] as const
export const BTN_R = 46
export const LEVER_X = 1092
export const LEVER_OFF_Y = 200
export const LEVER_ON_Y = 484
export const LEVER_PIVOT_Y = 342
export const KNOB_R = 44

// The tray of pegs under the board, with its pull handle at the right end.
export const TRAY_X = 160
export const TRAY_Y = 662
export const TRAY_H = 106
export const WELL = 99
export const TRAY_BODY = WELL * COLORS.length
export const HANDLE_W = 88
export const TRAY_W = TRAY_BODY + HANDLE_W
export const TRAY_PULL = 104
export const PILE = 22

export interface Hole {
  x: number
  y: number
  row: number
  col: number
  // Column in half-cell units, so the show's sweep meets every hole in order.
  k: number
}

export function colsIn(row: number): number {
  return row % 2 === 0 ? 17 : 16
}

export function makeHoles(): { holes: Hole[]; rowStart: number[] } {
  const holes: Hole[] = []
  const rowStart: number[] = []
  for (let row = 0; row < ROWS; row++) {
    rowStart.push(holes.length)
    const odd = row % 2
    for (let col = 0; col < colsIn(row); col++) {
      holes.push({ x: X0 + col * S + (odd ? S / 2 : 0), y: Y0 + row * RH, row, col, k: col * 2 + odd })
    }
  }
  return { holes, rowStart }
}

export interface Bulb {
  x: number
  y: number
}

// Marquee bulbs on the chrome frame around the board, clockwise from top left.
export function makeBulbs(): Bulb[] {
  const x1 = BX - 15
  const x2 = BX + BW + 15
  const y1 = BY - 15
  const y2 = BY + BH + 15
  const out: Bulb[] = []
  const across = 20
  const down = 12
  for (let i = 0; i < across; i++) out.push({ x: x1 + ((x2 - x1) * i) / (across - 1), y: y1 })
  for (let i = 1; i <= down; i++) out.push({ x: x2, y: y1 + ((y2 - y1) * i) / (down + 1) })
  for (let i = 0; i < across; i++) out.push({ x: x2 - ((x2 - x1) * i) / (across - 1), y: y2 })
  for (let i = 1; i <= down; i++) out.push({ x: x1, y: y2 - ((y2 - y1) * i) / (down + 1) })
  return out
}

export type Mk = (w: number, h: number) => HTMLCanvasElement
type G = CanvasRenderingContext2D

function ctx2d(c: HTMLCanvasElement): G {
  const g = c.getContext('2d')
  if (!g) throw new Error('glow-pegs: no 2d context')
  return g
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

function mix(a: string, b: string, t: number): string {
  const p = rgb(a)
  const q = rgb(b)
  return `rgb(${Math.round(p[0] + (q[0] - p[0]) * t)},${Math.round(p[1] + (q[1] - p[1]) * t)},${Math.round(p[2] + (q[2] - p[2]) * t)})`
}

// Eighties chrome: sky above a hard dark horizon, hot violet ground below.
function chromeStops(gr: CanvasGradient): CanvasGradient {
  gr.addColorStop(0, '#cfe0ff')
  gr.addColorStop(0.1, '#ffffff')
  gr.addColorStop(0.28, '#86a8ff')
  gr.addColorStop(0.46, '#2b3fa6')
  gr.addColorStop(0.5, '#05031a')
  gr.addColorStop(0.57, '#2c1166')
  gr.addColorStop(0.78, '#a144e6')
  gr.addColorStop(0.92, '#ff9ae6')
  gr.addColorStop(1, '#ffe6fb')
  return gr
}

function poly(g: G, pts: readonly (readonly [number, number])[]): void {
  g.beginPath()
  pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
  g.closePath()
  g.fill()
}

// A mitred chrome picture frame: each bar carries the whole chrome gradient
// across its own thickness, so all four sides read as polished tube.
function chromeFrame(g: G, x: number, y: number, w: number, h: number, t: number, r: number): void {
  g.save()
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.roundRect(x + t, y + t, w - t * 2, h - t * 2, Math.max(2, r - t))
  g.clip('evenodd')
  g.fillStyle = chromeStops(g.createLinearGradient(0, y, 0, y + t))
  poly(g, [[x, y], [x + w, y], [x + w - t, y + t], [x + t, y + t]])
  g.fillStyle = chromeStops(g.createLinearGradient(0, y + h - t, 0, y + h))
  poly(g, [[x + t, y + h - t], [x + w - t, y + h - t], [x + w, y + h], [x, y + h]])
  g.fillStyle = chromeStops(g.createLinearGradient(x, 0, x + t, 0))
  poly(g, [[x, y], [x + t, y + t], [x + t, y + h - t], [x, y + h]])
  g.fillStyle = chromeStops(g.createLinearGradient(x + w, 0, x + w - t, 0))
  poly(g, [[x + w, y], [x + w, y + h], [x + w - t, y + h - t], [x + w - t, y + t]])
  g.restore()
  g.lineWidth = 1.5
  g.strokeStyle = 'rgba(0,0,0,0.75)'
  g.beginPath()
  g.roundRect(x + t, y + t, w - t * 2, h - t * 2, Math.max(2, r - t))
  g.stroke()
}

// A neon tube, baked once (shadowBlur is fine here, never in the frame loop).
function tube(g: G, scale: number, color: string, width: number, path: () => void): void {
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.shadowColor = color
  g.shadowBlur = 26 * scale
  g.strokeStyle = color
  g.lineWidth = width + 2
  path()
  g.stroke()
  g.shadowBlur = 10 * scale
  g.stroke()
  g.shadowBlur = 0
  g.strokeStyle = 'rgba(255,255,255,0.92)'
  g.lineWidth = width * 0.42
  g.stroke()
  g.restore()
}

function disc(g: G, x: number, y: number, r: number, fill: string | CanvasGradient): void {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fillStyle = fill
  g.fill()
}

function pegSprite(mk: Mk, color: string, scale: number): HTMLCanvasElement {
  const size = (PEG_R + 4) * 2
  const c = mk(size * scale, size * scale)
  const g = ctx2d(c)
  g.scale(scale, scale)
  const m = size / 2
  const body = g.createRadialGradient(m - PEG_R * 0.18, m - PEG_R * 0.22, PEG_R * 0.05, m, m, PEG_R)
  body.addColorStop(0, '#ffffff')
  body.addColorStop(0.3, mix(color, '#ffffff', 0.7))
  body.addColorStop(0.62, color)
  body.addColorStop(1, mix(color, '#000000', 0.22))
  disc(g, m, m, PEG_R, body)
  // The faceted crown of a light peg.
  g.strokeStyle = 'rgba(255,255,255,0.4)'
  g.lineWidth = 1.2
  g.beginPath()
  g.arc(m, m, PEG_R * 0.6, 0, TAU)
  g.stroke()
  g.strokeStyle = rgba(color, 0.9)
  g.lineWidth = 1.5
  g.beginPath()
  g.arc(m, m, PEG_R - 0.5, 0, TAU)
  g.stroke()
  g.fillStyle = 'rgba(255,255,255,0.92)'
  g.beginPath()
  g.ellipse(m - PEG_R * 0.36, m - PEG_R * 0.42, PEG_R * 0.24, PEG_R * 0.13, -0.6, 0, TAU)
  g.fill()
  return c
}

// Soft bloom, small on purpose: it is always drawn stretched and additive.
function bloomSprite(mk: Mk, color: string): HTMLCanvasElement {
  const c = mk(32, 32)
  const g = ctx2d(c)
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  gr.addColorStop(0, rgba(color, 0.95))
  gr.addColorStop(0.22, rgba(color, 0.55))
  gr.addColorStop(0.5, rgba(color, 0.2))
  gr.addColorStop(0.8, rgba(color, 0.05))
  gr.addColorStop(1, rgba(color, 0))
  g.fillStyle = gr
  g.fillRect(0, 0, 32, 32)
  return c
}

// A peg's own glow for the quarter-size glow layer: a hot centre that hugs
// the peg and a wide soft skirt, in one sprite so each peg costs one blit.
function haloSprite(mk: Mk, color: string): HTMLCanvasElement {
  const c = mk(48, 48)
  const g = ctx2d(c)
  const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24)
  gr.addColorStop(0, rgba(color, 1))
  gr.addColorStop(0.1, rgba(color, 0.92))
  gr.addColorStop(0.2, rgba(color, 0.62))
  gr.addColorStop(0.45, rgba(color, 0.3))
  gr.addColorStop(0.75, rgba(color, 0.09))
  gr.addColorStop(1, rgba(color, 0))
  g.fillStyle = gr
  g.fillRect(0, 0, 48, 48)
  return c
}

function buttonSprite(mk: Mk, scale: number, kind: number, lit: boolean): HTMLCanvasElement {
  const size = (BTN_R + 4) * 2
  const c = mk(size * scale, size * scale)
  const g = ctx2d(c)
  g.scale(scale, scale)
  const m = size / 2
  const cap = g.createRadialGradient(m - 12, m - 16, 2, m, m, BTN_R)
  if (lit) {
    cap.addColorStop(0, '#ffffff')
    cap.addColorStop(0.35, '#b8fbff')
    cap.addColorStop(0.75, '#19f0ff')
    cap.addColorStop(1, '#0a8fb0')
  } else {
    cap.addColorStop(0, '#2c6f80')
    cap.addColorStop(0.5, '#0f3a4a')
    cap.addColorStop(1, '#061820')
  }
  disc(g, m, m, BTN_R - 6, cap)
  g.strokeStyle = lit ? 'rgba(255,255,255,0.8)' : 'rgba(25,240,255,0.45)'
  g.lineWidth = 2
  g.beginPath()
  g.arc(m, m, BTN_R - 7, 0, TAU)
  g.stroke()
  // The pictogram: pegs and the mirror lines between them.
  const ink = lit ? '#06202c' : '#19f0ff'
  const dot = (x: number, y: number) => disc(g, m + x, m + y, 6.5, ink)
  g.strokeStyle = ink
  g.lineWidth = 3
  g.lineCap = 'round'
  if (kind === 0) {
    dot(0, 0)
  } else if (kind === 1) {
    g.beginPath()
    g.moveTo(m, m - 22)
    g.lineTo(m, m + 22)
    g.stroke()
    dot(-15, 0)
    dot(15, 0)
  } else {
    g.beginPath()
    g.moveTo(m, m - 26)
    g.lineTo(m, m + 26)
    g.moveTo(m - 26, m)
    g.lineTo(m + 26, m)
    g.stroke()
    dot(-14, -14)
    dot(14, -14)
    dot(-14, 14)
    dot(14, 14)
  }
  // Gloss.
  g.fillStyle = lit ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.16)'
  g.beginPath()
  g.ellipse(m - 12, m - 22, 17, 7, -0.45, 0, TAU)
  g.fill()
  return c
}

function knobSprite(mk: Mk, scale: number): HTMLCanvasElement {
  const size = (KNOB_R + 4) * 2
  const c = mk(size * scale, size * scale)
  const g = ctx2d(c)
  g.scale(scale, scale)
  const m = size / 2
  const ball = g.createRadialGradient(m - 14, m - 16, 3, m, m, KNOB_R)
  ball.addColorStop(0, '#ffffff')
  ball.addColorStop(0.18, '#ffc0e2')
  ball.addColorStop(0.55, '#ff2d95')
  ball.addColorStop(0.9, '#8a0a4c')
  ball.addColorStop(1, '#4a0228')
  disc(g, m, m, KNOB_R, ball)
  // A chrome-style reflection band low on the ball.
  g.save()
  g.beginPath()
  g.arc(m, m, KNOB_R, 0, TAU)
  g.clip()
  g.fillStyle = 'rgba(255,170,230,0.28)'
  g.beginPath()
  g.ellipse(m + 6, m + KNOB_R * 0.78, KNOB_R * 0.9, KNOB_R * 0.3, 0, 0, TAU)
  g.fill()
  g.restore()
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.beginPath()
  g.ellipse(m - 15, m - 19, 13, 7, -0.6, 0, TAU)
  g.fill()
  return c
}

function drawCabinet(g: G, scale: number, holes: readonly Hole[], bulbs: readonly Bulb[]): void {
  g.fillStyle = '#000000'
  g.fillRect(0, 0, W, H)
  const body = g.createLinearGradient(0, 0, 0, H)
  body.addColorStop(0, '#17102c')
  body.addColorStop(0.5, '#0b0716')
  body.addColorStop(1, '#06030c')
  g.fillStyle = body
  g.beginPath()
  g.roundRect(6, 6, W - 12, H - 12, 30)
  g.fill()

  chromeFrame(g, 0, 0, W, H, 24, 34)

  // A cyan tube runs in the gap just inside the bezel.
  tube(g, scale, '#19f0ff', 3.2, () => {
    g.beginPath()
    g.roundRect(31, 31, W - 62, H - 62, 12)
  })

  // Side panels of black glass.
  for (const px of [36, 1040]) {
    const glass = g.createLinearGradient(px, 0, px + 104, 0)
    glass.addColorStop(0, '#0a0718')
    glass.addColorStop(0.5, '#150d2c')
    glass.addColorStop(1, '#070411')
    g.fillStyle = glass
    g.beginPath()
    g.roundRect(px, 40, 104, 604, 14)
    g.fill()
    g.strokeStyle = 'rgba(160,180,255,0.35)'
    g.lineWidth = 1.5
    g.stroke()
  }

  // Left panel: neon decor and chrome collars for the three mirror buttons.
  tube(g, scale, '#ff2d95', 3.4, () => {
    g.beginPath()
    g.moveTo(BTN_X, 68)
    g.lineTo(BTN_X + 30, 122)
    g.lineTo(BTN_X - 30, 122)
    g.closePath()
  })
  tube(g, scale, '#ffe81a', 3.4, () => {
    g.beginPath()
    g.moveTo(BTN_X - 34, 606)
    g.lineTo(BTN_X - 17, 572)
    g.lineTo(BTN_X, 606)
    g.lineTo(BTN_X + 17, 572)
    g.lineTo(BTN_X + 34, 606)
  })
  for (const by of BTN_Y) {
    disc(g, BTN_X, by, BTN_R + 3, chromeStops(g.createLinearGradient(0, by - BTN_R - 3, 0, by + BTN_R + 3)))
    disc(g, BTN_X, by, BTN_R - 4, '#030208')
  }

  // Right panel: a star tube, the lever's slot and its pivot plate.
  tube(g, scale, '#ffe81a', 3.2, () => {
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const r = i % 2 === 0 ? 34 : 15
      const x = LEVER_X + Math.cos(a) * r
      const y = 96 + Math.sin(a) * r
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.closePath()
  })
  g.fillStyle = chromeStops(g.createLinearGradient(LEVER_X - 17, 0, LEVER_X + 17, 0))
  g.beginPath()
  g.roundRect(LEVER_X - 17, LEVER_OFF_Y - 17, 34, LEVER_ON_Y - LEVER_OFF_Y + 34, 17)
  g.fill()
  g.fillStyle = '#020105'
  g.beginPath()
  g.roundRect(LEVER_X - 11, LEVER_OFF_Y - 11, 22, LEVER_ON_Y - LEVER_OFF_Y + 22, 11)
  g.fill()
  disc(g, LEVER_X, LEVER_PIVOT_Y, 26, chromeStops(g.createLinearGradient(0, LEVER_PIVOT_Y - 26, 0, LEVER_PIVOT_Y + 26)))
  disc(g, LEVER_X, LEVER_PIVOT_Y, 17, '#05030b')
  // Five little sockets under the lever: the show lights.
  for (let i = 0; i < 5; i++) {
    disc(g, LEVER_X + (i - 2) * 19, 596, 7.5, '#02010a')
    disc(g, LEVER_X + (i - 2) * 19, 596, 5.5, mix(COLORS[[0, 2, 3, 4, 6][i]!]!, '#000000', 0.78))
  }

  // The marquee frame and the board.
  chromeFrame(g, BX - 30, BY - 30, BW + 60, BH + 60, 30, 22)
  const board = g.createRadialGradient(BX + BW / 2, BY + BH / 2, 60, BX + BW / 2, BY + BH / 2, BW * 0.62)
  board.addColorStop(0, '#150b2c')
  board.addColorStop(0.6, '#0b0618')
  board.addColorStop(1, '#040209')
  g.fillStyle = board
  g.beginPath()
  g.roundRect(BX - 1, BY - 1, BW + 2, BH + 2, 3)
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,0.9)'
  g.lineWidth = 3
  g.stroke()
  for (const h of holes) {
    disc(g, h.x, h.y, 7.5, '#000000')
    g.strokeStyle = 'rgba(170,150,255,0.5)'
    g.lineWidth = 1.4
    g.beginPath()
    g.arc(h.x, h.y, 7.5, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
    g.strokeStyle = 'rgba(110,90,200,0.3)'
    g.lineWidth = 1
    g.beginPath()
    g.arc(h.x, h.y, 10.5, 0, TAU)
    g.stroke()
  }
  for (const b of bulbs) {
    disc(g, b.x, b.y, 10, '#06040c')
    const glass = g.createRadialGradient(b.x - 2, b.y - 3, 0.5, b.x, b.y, 7.5)
    glass.addColorStop(0, '#8a6a2c')
    glass.addColorStop(1, '#2a1a08')
    disc(g, b.x, b.y, 7.5, glass)
  }

  // The tray's slot, with etched chevrons where the handle travels.
  g.fillStyle = '#020106'
  g.beginPath()
  g.roundRect(TRAY_X - 6, TRAY_Y - 4, 1150 - TRAY_X + 6, TRAY_H + 8, 12)
  g.fill()
  g.strokeStyle = 'rgba(170,190,255,0.4)'
  g.lineWidth = 1.5
  g.stroke()
  g.strokeStyle = 'rgba(190,150,255,0.5)'
  g.lineWidth = 4
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (let i = 0; i < 3; i++) {
    const cx = 1070 + i * 26
    g.beginPath()
    g.moveTo(cx - 7, TRAY_Y + TRAY_H / 2 - 16)
    g.lineTo(cx + 7, TRAY_Y + TRAY_H / 2)
    g.lineTo(cx - 7, TRAY_Y + TRAY_H / 2 + 16)
    g.stroke()
  }

  // Speaker grille, bottom left.
  g.fillStyle = '#05030b'
  g.beginPath()
  g.roundRect(36, TRAY_Y - 4, 104, TRAY_H + 8, 12)
  g.fill()
  g.strokeStyle = 'rgba(170,190,255,0.4)'
  g.lineWidth = 1.5
  g.stroke()
  for (let i = 0; i < 6; i++) {
    const y = TRAY_Y + 12 + i * 16
    g.fillStyle = chromeStops(g.createLinearGradient(0, y, 0, y + 7))
    g.beginPath()
    g.roundRect(48, y, 80, 7, 3.5)
    g.fill()
  }
}

function drawTray(g: G): void {
  g.fillStyle = chromeStops(g.createLinearGradient(0, 0, 0, TRAY_H))
  g.beginPath()
  g.roundRect(0, 0, TRAY_BODY, TRAY_H, 12)
  g.fill()
  g.fillStyle = '#0a0714'
  g.beginPath()
  g.roundRect(4, 4, TRAY_BODY - 8, TRAY_H - 8, 9)
  g.fill()
  COLORS.forEach((color, i) => {
    const x = i * WELL + 6
    const well = g.createLinearGradient(0, 8, 0, TRAY_H - 8)
    well.addColorStop(0, '#020105')
    well.addColorStop(1, mix(color, '#000000', 0.82))
    g.fillStyle = well
    g.beginPath()
    g.roundRect(x, 8, WELL - 12, TRAY_H - 16, 10)
    g.fill()
    g.strokeStyle = rgba(color, 0.55)
    g.lineWidth = 1.5
    g.stroke()
  })
  // The pull handle: a chunky chrome grip with ridges.
  const hx = TRAY_BODY
  g.fillStyle = chromeStops(g.createLinearGradient(0, 6, 0, TRAY_H - 6))
  g.beginPath()
  g.roundRect(hx - 6, 6, HANDLE_W, TRAY_H - 12, 20)
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,0.6)'
  g.lineWidth = 1.5
  g.stroke()
  for (let i = 0; i < 4; i++) {
    const x = hx + 14 + i * 15
    g.fillStyle = 'rgba(10,6,30,0.75)'
    g.beginPath()
    g.roundRect(x, 24, 6, TRAY_H - 48, 3)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.75)'
    g.beginPath()
    g.roundRect(x + 6, 24, 2.5, TRAY_H - 48, 1.2)
    g.fill()
  }
}

// What lies over the board's glass: the raster, a glare, darker corners.
function drawOverlay(g: G): void {
  g.save()
  g.beginPath()
  g.roundRect(0, 0, BW, BH, 3)
  g.clip()
  for (let y = 0; y < BH; y += 4) {
    g.fillStyle = 'rgba(120,140,255,0.035)'
    g.fillRect(0, y, BW, 2)
    g.fillStyle = 'rgba(0,0,0,0.17)'
    g.fillRect(0, y + 2, BW, 2)
  }
  const glare = g.createLinearGradient(0, 0, BW * 0.5, BH * 0.3)
  glare.addColorStop(0, 'rgba(255,255,255,0.075)')
  glare.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = glare
  poly(g, [[40, 0], [330, 0], [110, BH], [-180, BH]])
  poly(g, [[380, 0], [430, 0], [210, BH], [160, BH]])
  const corner = g.createRadialGradient(BW / 2, BH / 2, BH * 0.6, BW / 2, BH / 2, BW * 0.7)
  corner.addColorStop(0, 'rgba(0,0,0,0)')
  corner.addColorStop(1, 'rgba(0,0,0,0.3)')
  g.fillStyle = corner
  g.fillRect(0, 0, BW, BH)
  g.restore()
}

export interface Look {
  cabinet: HTMLCanvasElement
  tray: HTMLCanvasElement
  overlay: HTMLCanvasElement
  pegs: HTMLCanvasElement[]
  // One per peg colour, then amber, then white.
  blooms: HTMLCanvasElement[]
  halos: HTMLCanvasElement[]
  bulbLit: HTMLCanvasElement
  buttons: [HTMLCanvasElement, HTMLCanvasElement][]
  knob: HTMLCanvasElement
  beam: HTMLCanvasElement
  shimmer: HTMLCanvasElement
  flare: HTMLCanvasElement
  glint: HTMLCanvasElement
  all: HTMLCanvasElement[]
}

export const BLOOM_AMBER = COLORS.length
export const BLOOM_WHITE = COLORS.length + 1

export function buildLook(mk: Mk, holes: readonly Hole[], bulbs: readonly Bulb[]): Look {
  const SS = 2
  const cabinet = mk(W * SS, H * SS)
  {
    const g = ctx2d(cabinet)
    g.scale(SS, SS)
    drawCabinet(g, SS, holes, bulbs)
  }
  const tray = mk(TRAY_W * SS, TRAY_H * SS)
  {
    const g = ctx2d(tray)
    g.scale(SS, SS)
    drawTray(g)
  }
  const overlay = mk(BW, BH)
  drawOverlay(ctx2d(overlay))

  const pegs = COLORS.map((color) => pegSprite(mk, color, SS))
  // White pegs bloom icy blue, or they burn out to a blank disc.
  const blooms = [...COLORS.slice(0, 7), '#b9c8ff', AMBER, '#ffffff'].map((color) => bloomSprite(mk, color))

  const halos = [...COLORS.slice(0, 7), '#b9c8ff'].map((color) => haloSprite(mk, color))

  const bulbLit = mk(20 * SS, 20 * SS)
  {
    const g = ctx2d(bulbLit)
    g.scale(SS, SS)
    const gr = g.createRadialGradient(9, 8, 0.5, 10, 10, 8)
    gr.addColorStop(0, '#ffffff')
    gr.addColorStop(0.5, '#fff0b8')
    gr.addColorStop(1, '#ffb52e')
    disc(g, 10, 10, 7.5, gr)
  }

  const buttons = [0, 1, 2].map((kind): [HTMLCanvasElement, HTMLCanvasElement] => [buttonSprite(mk, SS, kind, false), buttonSprite(mk, SS, kind, true)])
  const knob = knobSprite(mk, SS)

  const beam = mk(64, 1)
  {
    const g = ctx2d(beam)
    const gr = g.createLinearGradient(0, 0, 64, 0)
    gr.addColorStop(0, 'rgba(160,230,255,0)')
    gr.addColorStop(0.5, 'rgba(190,240,255,0.3)')
    gr.addColorStop(1, 'rgba(160,230,255,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, 64, 1)
  }
  const shimmer = mk(1, 64)
  {
    const g = ctx2d(shimmer)
    const gr = g.createLinearGradient(0, 0, 0, 64)
    gr.addColorStop(0, 'rgba(170,200,255,0)')
    gr.addColorStop(0.5, 'rgba(170,200,255,0.09)')
    gr.addColorStop(1, 'rgba(170,200,255,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, 1, 64)
  }

  // The streak of light that now and then crosses the chrome.
  const glint = mk(64, 1)
  {
    const g = ctx2d(glint)
    const gr = g.createLinearGradient(0, 0, 64, 0)
    gr.addColorStop(0, 'rgba(255,255,255,0)')
    gr.addColorStop(0.42, 'rgba(255,255,255,0.25)')
    gr.addColorStop(0.5, 'rgba(255,255,255,0.95)')
    gr.addColorStop(0.58, 'rgba(255,255,255,0.25)')
    gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, 64, 1)
  }

  // A four-point lens flare for the instant a peg lights.
  const flare = mk(64, 64)
  {
    const g = ctx2d(flare)
    for (const [sx, sy] of [[1, 0.07], [0.07, 1]] as const) {
      g.save()
      g.translate(32, 32)
      g.scale(sx, sy)
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 32)
      gr.addColorStop(0, 'rgba(255,255,255,0.95)')
      gr.addColorStop(0.4, 'rgba(255,255,255,0.35)')
      gr.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = gr
      g.beginPath()
      g.arc(0, 0, 32, 0, TAU)
      g.fill()
      g.restore()
    }
  }

  const all = [cabinet, tray, overlay, ...pegs, ...blooms, ...halos, bulbLit, ...buttons.flat(), knob, beam, shimmer, flare, glint]
  return { cabinet, tray, overlay, pegs, blooms, halos, bulbLit, buttons, knob, beam, shimmer, flare, glint, all }
}
