// The paper, the scribbled sky and hills, and each level's ground, painted
// once into offscreen canvases.

import { H, W } from '../../kit/types.ts'
import { canvasOf, hatch, speckle, wobble } from './crayon.ts'
import type { Ctx, Pt } from './crayon.ts'
import { PIT_FLOOR } from './levels.ts'
import type { Col, LevelDef, Theme } from './levels.ts'

const TAU = Math.PI * 2
const r = (a: number, b: number) => a + Math.random() * (b - a)
const BALLS = ['#ff5d5d', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff', '#ff7ac8']

export function paintBackground(theme: Theme): HTMLCanvasElement {
  const [canvas, c] = canvasOf(W, H)
  c.fillStyle = theme.paper
  c.fillRect(0, 0, W, H)
  // Paper fibres.
  c.strokeStyle = 'rgba(120,90,40,0.07)'
  c.lineWidth = 1
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * W
    const y = Math.random() * H
    c.beginPath()
    c.moveTo(x, y)
    c.lineTo(x + r(-7, 7), y + r(-7, 7))
    c.stroke()
  }
  // The strip of scribbled sky every child draws along the top.
  const [skyCanvas, s] = canvasOf(W, 260)
  hatch(s, -40, -20, W + 80, 120, theme.sky, 0.75, 7, 10, 0.9)
  hatch(s, -40, 50, W + 80, 110, theme.sky, 0.4, 11, 9, 0.9)
  hatch(s, -40, 130, W + 80, 90, theme.sky, 0.16, 19, 8, 0.9)
  speckle(s, 0, 0, W, 260, 9000, 0.5)
  c.drawImage(skyCanvas, 0, 0)

  // Two rows of far hills.
  const hills = (baseY: number, amp: number, fill: string, shade: string, phase: number) => {
    const pts: Pt[] = [{ x: -20, y: H + 20 }]
    for (let x = -20; x <= W + 20; x += 40) {
      pts.push({ x, y: baseY - Math.sin(x / 190 + phase) * amp - Math.sin(x / 83 + phase * 2) * amp * 0.35 })
    }
    pts.push({ x: W + 20, y: H + 20 })
    const [layer, l] = canvasOf(W, H)
    wobble(l, pts, 2, true)
    l.fillStyle = fill
    l.fill()
    l.save()
    l.clip()
    hatch(l, -20, baseY - amp * 1.5, W + 40, H - baseY + amp * 1.5, shade, 0.5, 13, 7, 0.5)
    l.restore()
    wobble(l, pts.slice(1, -1), 2)
    l.strokeStyle = shade
    l.lineWidth = 4
    l.lineJoin = 'round'
    l.stroke()
    speckle(l, 0, baseY - amp * 1.5, W, H, 7000, 0.45)
    c.drawImage(layer, 0, 0)
  }
  hills(430, 46, theme.hill, theme.hill2, 0.6)
  hills(520, 30, theme.hill2, theme.hill, 2.4)

  // A couple of crayon birds.
  c.strokeStyle = 'rgba(70,70,90,0.55)'
  c.lineWidth = 4
  c.lineCap = 'round'
  for (const [bx, by, bs] of [
    [330, 210, 1],
    [400, 250, 0.7],
    [760, 190, 0.85],
  ] as const) {
    c.beginPath()
    c.moveTo(bx - 20 * bs, by - 6 * bs)
    c.quadraticCurveTo(bx - 8 * bs, by - 16 * bs, bx, by)
    c.quadraticCurveTo(bx + 8 * bs, by - 16 * bs, bx + 20 * bs, by - 6 * bs)
    c.stroke()
  }
  return canvas
}

export function paintCloud(w: number, h: number): HTMLCanvasElement {
  const [canvas, c] = canvasOf(w + 16, h + 16)
  c.translate(8, 8)
  const lumps: [number, number, number][] = [
    [0.22, 0.66, 0.2],
    [0.42, 0.44, 0.28],
    [0.66, 0.52, 0.24],
    [0.82, 0.7, 0.16],
    [0.5, 0.72, 0.26],
  ]
  c.beginPath()
  for (const [x, y, rad] of lumps) {
    c.moveTo(x * w + rad * w, y * h)
    c.arc(x * w, y * h, rad * w, 0, TAU)
  }
  c.fillStyle = '#ffffff'
  c.fill()
  c.save()
  c.clip()
  hatch(c, 0, 0, w, h, '#cfe4f7', 0.7, 10, 6, 0.6)
  c.restore()
  c.strokeStyle = 'rgba(90,120,170,0.75)'
  c.lineWidth = 3.5
  c.beginPath()
  for (const [x, y, rad] of lumps.slice(0, 4)) {
    c.moveTo(x * w + rad * w * Math.cos(Math.PI * 1.05), y * h + rad * w * Math.sin(Math.PI * 1.05))
    c.arc(x * w, y * h, rad * w, Math.PI * 1.05, Math.PI * 1.95)
  }
  c.stroke()
  speckle(c, 0, 0, w, h, w * 3, 0.4)
  return canvas
}

// Contiguous columns make one piece of ground.
function runs(cols: readonly Col[]): Col[][] {
  const out: Col[][] = []
  for (const col of cols) {
    const last = out[out.length - 1]
    if (last && Math.abs(last[last.length - 1]!.x1 - col.x0) < 1) last.push(col)
    else out.push([col])
  }
  return out
}

function flower(c: Ctx, x: number, y: number, color: string, stem: string): void {
  const h = r(20, 34)
  c.strokeStyle = stem
  c.lineWidth = 3.5
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(x, y)
  c.quadraticCurveTo(x + r(-6, 6), y - h * 0.5, x + r(-3, 3), y - h)
  c.stroke()
  c.fillStyle = color
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + r(-0.2, 0.2)
    c.beginPath()
    c.arc(x + Math.cos(a) * 6, y - h + Math.sin(a) * 6, 4.6, 0, TAU)
    c.fill()
  }
  c.fillStyle = '#ffd23f'
  c.beginPath()
  c.arc(x, y - h, 3.6, 0, TAU)
  c.fill()
}

export function paintTerrain(def: LevelDef, theme: Theme): HTMLCanvasElement {
  const [canvas, c] = canvasOf(W, H)
  const pieces = runs(def.cols)

  // Pits first: a shaded hole with a heap of play balls at the bottom.
  for (let i = 0; i < pieces.length - 1; i++) {
    const left = pieces[i]!
    const right = pieces[i + 1]!
    const a = left[left.length - 1]!.x1
    const b = right[0]!.x0
    const top = Math.min(left[left.length - 1]!.top, right[0]!.top)
    const grad = c.createLinearGradient(0, top, 0, H)
    grad.addColorStop(0, 'rgba(70,50,110,0.05)')
    grad.addColorStop(1, 'rgba(70,50,110,0.42)')
    c.fillStyle = grad
    c.fillRect(a, top, b - a, H - top)
    const balls: [number, number, number][] = []
    const count = Math.round(((b - a) / 30) * 5.5)
    for (let n = 0; n < count; n++) balls.push([r(a + 8, b - 8), r(PIT_FLOOR - 34, H + 10), r(15, 21)])
    balls.sort((p, q) => p[1] - q[1])
    for (const [x, y, rad] of balls) {
      const color = BALLS[Math.floor(Math.random() * BALLS.length)]!
      c.beginPath()
      c.arc(x, y, rad, 0, TAU)
      c.fillStyle = color
      c.fill()
      c.strokeStyle = 'rgba(40,20,60,0.55)'
      c.lineWidth = 3
      c.stroke()
      c.beginPath()
      c.arc(x - rad * 0.3, y - rad * 0.35, rad * 0.28, 0, TAU)
      c.fillStyle = 'rgba(255,255,255,0.6)'
      c.fill()
    }
  }

  for (const piece of pieces) {
    const x0 = piece[0]!.x0
    const x1 = piece[piece.length - 1]!.x1
    const outline: Pt[] = []
    for (const col of piece) {
      outline.push({ x: col.x0, y: col.top }, { x: col.x1, y: col.top })
    }
    const poly: Pt[] = [{ x: x0, y: H + 20 }, ...outline, { x: x1, y: H + 20 }]
    const minTop = Math.min(...piece.map((col) => col.top))
    // Dirt.
    wobble(c, poly, 1.8, true)
    c.fillStyle = theme.dirt
    c.fill()
    c.save()
    c.clip()
    hatch(c, x0 - 10, minTop, x1 - x0 + 20, H - minTop + 10, theme.dirtDark, 0.42, 12, 7, 0.55)
    c.fillStyle = theme.dirtDark
    for (let n = 0; n < (x1 - x0) / 26; n++) {
      c.globalAlpha = r(0.3, 0.6)
      c.beginPath()
      c.ellipse(r(x0, x1), r(minTop + 50, H), r(5, 12), r(4, 8), r(0, 3), 0, TAU)
      c.fill()
    }
    c.globalAlpha = 1
    c.restore()
    // The grassy (or sandy, or snowy) top of every flat.
    for (const col of piece) {
      const band: Pt[] = [
        { x: col.x0, y: col.top },
        { x: col.x1, y: col.top },
        { x: col.x1, y: col.top + 22 },
      ]
      for (let x = col.x1 - 22; x > col.x0 + 6; x -= 22) band.push({ x, y: col.top + (band.length % 2 ? 30 : 17) })
      band.push({ x: col.x0, y: col.top + 22 })
      wobble(c, band, 1.5, true)
      c.fillStyle = theme.top
      c.fill()
      c.save()
      c.clip()
      hatch(c, col.x0, col.top - 2, col.x1 - col.x0, 36, theme.topDark, 0.45, 8, 4, 0.35)
      c.restore()
    }
    // A dark crayon line round the whole piece.
    wobble(c, x0 <= 0 && x1 >= W ? outline : x0 <= 0 ? [...outline, { x: x1, y: H + 20 }] : x1 >= W ? [{ x: x0, y: H + 20 }, ...outline] : poly, 1.6)
    c.strokeStyle = 'rgba(60,40,30,0.85)'
    c.lineWidth = 5
    c.lineJoin = 'round'
    c.lineCap = 'round'
    c.stroke()
    // Flowers, away from the edges and the things that stand on the ground.
    for (const col of piece) {
      const room = col.x1 - col.x0 - 80
      for (let n = 0; n < room / 120; n++) {
        const x = r(col.x0 + 40, col.x1 - 40)
        if (Math.abs(x - def.flagX) < 50 || Math.abs(x - def.flagX - 84) < 60) continue
        if (def.button && (Math.abs(x - def.button.x) < 70 || Math.abs(x - def.button.gateX) < 50)) continue
        flower(c, x, col.top + 3, theme.bloom[Math.floor(Math.random() * theme.bloom.length)]!, theme.topDark)
      }
    }
  }
  speckle(c, 0, 380, W, H - 380, 12000, 0.42)
  return canvas
}
