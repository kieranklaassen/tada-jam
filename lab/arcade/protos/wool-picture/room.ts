// The room, and it is all wool: a wall of carded fleece in lazure colours, a
// felted mat for a table, wet-felted bowls, a dish, and the frame that holds
// the sheet of felt. Painted once inside `create`.

import { H, W } from '../../kit/types.ts'
import { TAU, felted, feltEllipse, gauss, makeCanvas, mix, put, res, rgba, rng, roundRectPath, shade, sprite, strand, strands, tones, wash } from './felt.ts'
import type { G, RGB, Sprite } from './felt.ts'
import { FH, FW } from './wool.ts'
import type { Fleece } from './wool.ts'

export const FRAME = { w: 700, h: 480, b: 30 }
// Centre of the frame lying on the table, and hanging on the wall.
export const TABLE_AT = { x: 590, y: 412 }
export const HUNG_AT = { x: 590, y: 316 }
export const PEG = { x: 590, y: 46 }
// Where the wall meets the table, and how far the table sinks at evening.
export const EDGE_Y = 118
export const SINK = 592
// Small frames on the wall at evening.
export const THUMB = 0.3
export const SLOTS = [
  { x: 122, y: 214 },
  { x: 122, y: 434 },
] as const
export const FRESH = { x: 1058, y: 250 }
export const YARN_UP = 28

// Bowl centres; the index is the dye.
export const BOWLS = [
  { x: 122, y: 214 },
  { x: 122, y: 368 },
  { x: 122, y: 522 },
  { x: 122, y: 676 },
  { x: 1058, y: 214 },
  { x: 1058, y: 368 },
  { x: 1058, y: 522 },
  { x: 1058, y: 676 },
] as const
export const DISH = { x: 590, y: 714, w: 600, h: 98 }

const WALL: RGB = [243, 214, 186]
const MAT: RGB = [190, 150, 110]
const WALNUT: RGB = [122, 84, 58]
const OAT: RGB = [222, 204, 174]

function pegBall(g: G, x: number, y: number, rand: () => number, r = 11): void {
  feltEllipse(g, x, y, r, r, [150, 92, 70], rand, { soft: 2, plump: 0.9, lift: 3, len: [4, 9], density: 16 })
  wash(g, x - r * 0.3, y - r * 0.35, r * 0.5, r * 0.4, [255, 240, 220], 0.4)
}

// A swag of small felt balls on a strand of yarn, the kind a kindergarten
// strings up for a season.
const BEADS: readonly RGB[] = [
  [214, 126, 116],
  [238, 196, 104],
  [140, 166, 104],
  [246, 238, 222],
  [112, 138, 176],
  [168, 140, 180],
]

function garland(g: G, x0: number, y0: number, x1: number, y1: number, sag: number, rand: () => number, first: number): void {
  const at = (t: number): [number, number] => {
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2 + sag * 2
    const a = 1 - t
    return [a * a * x0 + 2 * a * t * mx + t * t * x1, a * a * y0 + 2 * a * t * my + t * t * y1]
  }
  g.save()
  g.lineCap = 'round'
  for (let pass = 0; pass < 2; pass++) {
    g.beginPath()
    for (let i = 0; i <= 30; i++) {
      const [x, y] = at(i / 30)
      if (i === 0) g.moveTo(x, y + (pass === 0 ? 3 : 0))
      else g.lineTo(x, y + (pass === 0 ? 3 : 0))
    }
    g.strokeStyle = pass === 0 ? 'rgba(120,70,60,0.2)' : 'rgb(236,220,190)'
    g.lineWidth = pass === 0 ? 4 : 2.6
    g.stroke()
  }
  g.restore()
  const n = 8
  for (let i = 0; i < n; i++) {
    const [x, y] = at((i + 0.7) / (n + 0.4))
    const r = 8 + rand() * 2.5
    feltEllipse(g, x + gauss(rand) * 2, y + r * 0.7, r, r, BEADS[(i + first) % BEADS.length], rand, { soft: 2, plump: 0.9, lift: 3, len: [3, 8], density: 16, fuzz: 1.2 })
  }
}

export function pegOf(slot: { x: number; y: number }): { x: number; y: number } {
  return { x: slot.x, y: slot.y - (FRAME.h / 2 + YARN_UP) * THUMB }
}

// The wall, full height: most of it is behind the table until evening.
// It is far and soft, so it is kept at one pixel per point on any screen.
export function paintWall(rand: () => number): HTMLCanvasElement {
  const [canvas, g] = makeCanvas(W, H)
  g.lineCap = 'round'
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, rgba(shade(WALL, 0.14)))
  grad.addColorStop(0.5, rgba(WALL))
  grad.addColorStop(1, rgba(mix(WALL, [226, 170, 150], 0.5)))
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  // Lazure: thin veils of rose, gold and cream laid over one another.
  const veils: RGB[] = [
    [236, 178, 160],
    [250, 228, 178],
    [255, 244, 224],
    [232, 190, 150],
    [240, 200, 190],
  ]
  for (let i = 0; i < 60; i++) {
    const c = veils[Math.floor(rand() * veils.length)]
    wash(g, rand() * W, rand() * H, 120 + rand() * 260, 50 + rand() * 110, c, 0.12 + rand() * 0.18, gauss(rand) * 0.4)
  }
  // Long carded strands, laid in slow waves.
  const colors = [...tones(WALL, [[236, 178, 160], [250, 230, 190], [255, 248, 236], [224, 176, 150]], 0.2)]
  for (let i = 0; i < 9000; i++) {
    const x = rand() * W
    const y = rand() * H
    const len = 40 + rand() * 130
    g.strokeStyle = colors[Math.floor(rand() * colors.length)]
    g.globalAlpha = 0.08 + rand() * 0.24
    g.lineWidth = 0.6 + rand() * 1.2
    const flow = Math.sin(x * 0.006 + y * 0.004) * 0.35 + Math.sin(y * 0.013) * 0.2
    strand(g, x, y, flow + gauss(rand) * 0.3, len, gauss(rand) * len * 0.2)
  }
  // A few thick pale locks that were never quite carded in.
  g.strokeStyle = 'rgb(255,246,232)'
  for (let i = 0; i < 260; i++) {
    const x = rand() * W
    const y = rand() * H
    const len = 60 + rand() * 120
    g.globalAlpha = 0.1 + rand() * 0.16
    g.lineWidth = 1.4 + rand() * 1.8
    const flow = Math.sin(x * 0.006 + y * 0.004) * 0.35 + Math.sin(y * 0.013) * 0.2
    strand(g, x, y, flow + gauss(rand) * 0.2, len, gauss(rand) * len * 0.16)
  }
  g.globalAlpha = 1
  // Corners fall away a little.
  const vig = g.createRadialGradient(W / 2, H * 0.42, H * 0.45, W / 2, H * 0.42, H * 1.05)
  vig.addColorStop(0, 'rgba(150,90,80,0)')
  vig.addColorStop(1, 'rgba(150,90,80,0.2)')
  g.fillStyle = vig
  g.fillRect(0, 0, W, H)
  garland(g, -30, 2, 452, 12, 34, rand, 0)
  garland(g, 728, 12, W + 30, 2, 34, rand, 3)
  // Felt-ball pegs: the one for the frame in hand, and the ones along the wall.
  pegBall(g, PEG.x, PEG.y, rand, 12)
  for (const slot of [...SLOTS, FRESH]) {
    const p = pegOf(slot)
    pegBall(g, p.x, p.y, rand, 8)
  }
  return canvas
}

function paintBowl(g: G, x: number, y: number, rand: () => number): void {
  const body: RGB = [206, 190, 166]
  // Its shadow on the mat.
  wash(g, x + 8, y + 34, 108, 44, [70, 44, 30], 0.34)
  feltEllipse(g, x, y + 8, 94, 54, body, rand, { soft: 3.5, plump: 0.85, lift: 0, len: [8, 26], angle: 0, spread: 0.5, density: 11, flecks: [[168, 150, 128], [236, 226, 208]] })
  // The hollow.
  feltEllipse(g, x, y - 6, 80, 38, [112, 94, 82], rand, { soft: 4, plump: 0, lift: 0, len: [6, 18], spread: 0.6, density: 7, fuzz: 0 })
  wash(g, x - 10, y - 20, 70, 20, [52, 38, 36], 0.4)
  // The rolled rim.
  const rim = new Path2D()
  rim.ellipse(x, y - 6, 90, 46, 0, 0, TAU)
  rim.ellipse(x, y - 6, 76, 34, 0, 0, TAU, true)
  felted(g, rim, { x: x - 92, y: y - 54, w: 184, h: 96 }, shade(body, 0.3), rand, { soft: 2.5, plump: 0.6, lift: 2, len: [6, 16], spread: 1.4, density: 12 })
}

// The table mat with the bowls and the dish on it. Drawn EDGE_Y down the field.
export function paintTable(rand: () => number): HTMLCanvasElement {
  const s = res()
  const th = H - EDGE_Y + 16
  const [canvas, g] = makeCanvas(W * s, th * s)
  g.scale(s, s)
  g.lineCap = 'round'
  g.translate(0, -EDGE_Y + 16)
  // From here on, field coordinates. The first 16 pixels above the edge are
  // the mat's soft rolled edge against the wall.
  const top = EDGE_Y
  const grad = g.createLinearGradient(0, top, 0, H)
  grad.addColorStop(0, rgba(shade(MAT, 0.1)))
  grad.addColorStop(1, rgba(shade(MAT, -0.1)))
  g.fillStyle = grad
  g.fillRect(0, top, W, H - top)
  for (let i = 0; i < 40; i++) {
    const c: RGB = rand() < 0.5 ? shade(MAT, 0.2) : mix(MAT, [150, 104, 78], 0.7)
    wash(g, rand() * W, top + rand() * (H - top), 100 + rand() * 240, 30 + rand() * 60, c, 0.12 + rand() * 0.12)
  }
  strands(g, rand, -40, top, W + 80, H - top, {
    count: 9000,
    colors: tones(MAT, [[224, 190, 150], [150, 108, 80], [206, 164, 124]], 0.26),
    len: [40, 150],
    angle: 0,
    spread: 0.16,
    alpha: [0.08, 0.26],
    width: [0.5, 1.3],
  })
  // Thick pale and dark locks lying in the mat.
  for (let i = 0; i < 700; i++) {
    const light = rand() < 0.6
    g.strokeStyle = light ? 'rgb(236,206,166)' : 'rgb(140,98,70)'
    g.globalAlpha = 0.08 + rand() * 0.16
    g.lineWidth = 1.4 + rand() * 2
    const len = 70 + rand() * 150
    strand(g, rand() * W, top + rand() * (H - top), gauss(rand) * 0.12, len, gauss(rand) * len * 0.1)
  }
  g.globalAlpha = 1
  // The rolled back edge, and the shadow it throws up the wall.
  const edge = g.createLinearGradient(0, top - 16, 0, top + 22)
  edge.addColorStop(0, 'rgba(96,60,44,0)')
  edge.addColorStop(0.42, 'rgba(96,60,44,0.3)')
  edge.addColorStop(0.5, rgba(shade(MAT, 0.32), 0.95))
  edge.addColorStop(1, rgba(shade(MAT, 0.32), 0))
  g.fillStyle = edge
  g.fillRect(0, top - 16, W, 38)
  strands(g, rand, -20, top - 3, W + 40, 12, { count: 900, colors: tones(shade(MAT, 0.3), [], 0.2), len: [16, 50], spread: 0.2, alpha: [0.15, 0.4] })

  for (const b of BOWLS) paintBowl(g, b.x, b.y, rand)

  // The dish for the little felt figures.
  const d = DISH
  wash(g, d.x + 8, d.y + 14, d.w * 0.54, d.h * 0.62, [70, 44, 30], 0.3)
  felted(g, roundRectPath(d.x - d.w / 2, d.y - d.h / 2, d.w, d.h, 48), { x: d.x - d.w / 2, y: d.y - d.h / 2, w: d.w, h: d.h }, OAT, rand, { soft: 3.5, plump: 0.7, lift: 0, len: [8, 26], spread: 0.4, density: 9, flecks: [[190, 170, 140]] })
  felted(g, roundRectPath(d.x - d.w / 2 + 13, d.y - d.h / 2 + 11, d.w - 26, d.h - 22, 38), { x: d.x - d.w / 2 + 13, y: d.y - d.h / 2 + 11, w: d.w - 26, h: d.h - 22 }, [182, 158, 128], rand, { soft: 5, plump: 0, lift: 0, len: [8, 22], spread: 0.4, density: 7, fuzz: 0 })
  wash(g, d.x, d.y - d.h / 2 + 22, d.w * 0.44, 12, [80, 56, 44], 0.26)
  return canvas
}

export const HEAP = { w: 230, h: 170, ax: 115, ay: 130 }

// The fleece heaped in a bowl. Anchored where it sits in the hollow.
export function paintHeap(fleece: Fleece, rand: () => number): Sprite {
  return sprite(HEAP.w, HEAP.h, (g) => {
    g.translate(HEAP.ax, HEAP.ay)
    wash(g, 0, -14, 80, 36, shade(fleece.dye.rgb, -0.35), 0.6)
    for (let i = 0; i < 24; i++) {
      const t = i / 23
      const spreadX = 66 * (1 - t * 0.6)
      // The first few lie side by side so the hollow is filled from rim to rim.
      const x = i < 7 ? (i - 3) * 17 + gauss(rand) * 3 : gauss(rand) * spreadX * 0.7
      const y = i < 7 ? -4 - (3 - Math.abs(i - 3)) * 3 : -6 - t * 40 + gauss(rand) * 6
      g.globalAlpha = 0.85
      put(g, fleece.tufts[i % fleece.tufts.length], x, y, gauss(rand) * 0.7, 0.62 + rand() * 0.24)
    }
    // A lock or two hanging over the rim.
    g.globalAlpha = 0.8
    put(g, fleece.tufts[1], -64, -6, 0.9, 0.5)
    put(g, fleece.tufts[2], 60, -2, -0.6, 0.46)
    g.globalAlpha = 1
    wash(g, -16, -56, 40, 18, [255, 250, 236], 0.16)
  })
}

const SKY_TOP: RGB = [160, 200, 228]
const SKY_LOW: RGB = [196, 222, 220]
const LAND_TOP: RGB = [176, 208, 160]
const LAND_LOW: RGB = [132, 174, 106]

export const FRAME_PAD = 44

// The frame with its sheet of felt, sky-blue fading to green. The felt is
// matted and flat; only the laid fleece stands up from it.
export function paintFrame(rand: () => number): Sprite {
  const { w, h, b } = FRAME
  return sprite(w + FRAME_PAD * 2, h + FRAME_PAD * 2, (g) => {
    g.translate(FRAME_PAD, FRAME_PAD)
    // The shadow of the whole thing.
    g.save()
    g.shadowColor = 'rgba(64,40,30,0.42)'
    g.shadowBlur = 20 * res()
    g.shadowOffsetX = 4 * res()
    g.shadowOffsetY = 10 * res()
    g.fillStyle = rgba(WALNUT)
    g.fill(roundRectPath(6, 6, w - 12, h - 12, 14))
    g.restore()

    // The sheet.
    const fx = b - 4
    const fy = b - 4
    const fw = FW + 8
    const fh = FH + 8
    const grad = g.createLinearGradient(0, fy, 0, fy + fh)
    grad.addColorStop(0, rgba(SKY_TOP))
    grad.addColorStop(0.5, rgba(SKY_LOW))
    grad.addColorStop(0.68, rgba(LAND_TOP))
    grad.addColorStop(1, rgba(LAND_LOW))
    g.fillStyle = grad
    g.fillRect(fx, fy, fw, fh)
    for (let i = 0; i < 60; i++) {
      const y = fy + rand() * fh
      const c: RGB = rand() < 0.5 ? [255, 255, 250] : y > fy + fh * 0.6 ? [96, 140, 84] : [120, 160, 196]
      wash(g, fx + rand() * fw, y, 40 + rand() * 110, 16 + rand() * 40, c, 0.05 + rand() * 0.07)
    }
    g.save()
    g.beginPath()
    g.rect(fx, fy, fw, fh)
    g.clip()
    strands(g, rand, fx, fy, fw, fh, {
      count: 15000,
      colors: ['rgb(255,255,250)', 'rgb(255,255,250)', 'rgb(70,100,120)', 'rgb(90,120,90)', 'rgb(232,240,236)'],
      len: [4, 13],
      spread: 3,
      alpha: [0.05, 0.2],
      width: [0.5, 1.1],
      bend: 0.5,
    })
    // The frame's shadow falls on the sheet along the top and left.
    const st = g.createLinearGradient(0, b, 0, b + 22)
    st.addColorStop(0, 'rgba(40,50,70,0.3)')
    st.addColorStop(1, 'rgba(40,50,70,0)')
    g.fillStyle = st
    g.fillRect(fx, b, fw, 22)
    const sl = g.createLinearGradient(b, 0, b + 16, 0)
    sl.addColorStop(0, 'rgba(40,50,70,0.24)')
    sl.addColorStop(1, 'rgba(40,50,70,0)')
    g.fillStyle = sl
    g.fillRect(b, fy, 16, fh)
    g.restore()

    // Four thick rolls of walnut wool, felted where they cross.
    const roll = { soft: 3, plump: 0.75, lift: 0, len: [14, 46] as const, spread: 0.2, density: 12, flecks: [[160, 118, 84], [92, 62, 46]] as RGB[] }
    felted(g, roundRectPath(0, 0, b, h, 13), { x: 0, y: 0, w: b, h }, WALNUT, rand, { ...roll, angle: Math.PI / 2 })
    felted(g, roundRectPath(w - b, 0, b, h, 13), { x: w - b, y: 0, w: b, h }, WALNUT, rand, { ...roll, angle: Math.PI / 2 })
    felted(g, roundRectPath(0, 0, w, b, 13), { x: 0, y: 0, w, h: b }, shade(WALNUT, 0.06), rand, { ...roll, angle: 0 })
    felted(g, roundRectPath(0, h - b, w, b, 13), { x: 0, y: h - b, w, h: b }, shade(WALNUT, -0.05), rand, { ...roll, angle: 0 })
    // A running stitch of undyed yarn all the way round.
    g.strokeStyle = 'rgba(240,226,196,0.85)'
    g.lineWidth = 2.2
    const stitch = (x0: number, y0: number, x1: number, y1: number) => {
      const len = Math.hypot(x1 - x0, y1 - y0)
      const n = Math.round(len / 22)
      for (let i = 0; i < n; i++) {
        const t0 = (i + 0.22) / n
        const t1 = (i + 0.7) / n
        const jx = gauss(rand) * 0.9
        const jy = gauss(rand) * 0.9
        g.beginPath()
        g.moveTo(x0 + (x1 - x0) * t0 + jx, y0 + (y1 - y0) * t0 + jy)
        g.lineTo(x0 + (x1 - x0) * t1 + jx, y0 + (y1 - y0) * t1 + jy)
        g.stroke()
      }
    }
    const m = b / 2
    stitch(m + 8, m, w - m - 8, m)
    stitch(m + 8, h - m, w - m - 8, h - m)
    stitch(m, m + 8, m, h - m - 8)
    stitch(w - m, m + 8, w - m, h - m - 8)
  })
}

// Window light as it lies on things: four soft panes, leaning.
export function paintLight(color: RGB, alpha: number): Sprite {
  const rand = rng(7)
  return sprite(620, 520, (g) => {
    const skew = 0.42
    const pane = (px: number, py: number, pw: number, ph: number) => {
      const p = new Path2D()
      p.moveTo(px + py * skew, py)
      p.lineTo(px + pw + py * skew, py)
      p.lineTo(px + pw + (py + ph) * skew, py + ph)
      p.lineTo(px + (py + ph) * skew, py + ph)
      p.closePath()
      g.save()
      g.shadowColor = rgba(color, alpha)
      g.shadowBlur = 22
      g.shadowOffsetX = 3000
      g.translate(-3000, 0)
      g.fill(p)
      g.restore()
    }
    pane(40, 50, 150, 180)
    pane(206, 50, 150, 180)
    pane(40, 248, 150, 180)
    pane(206, 248, 150, 180)
    g.globalCompositeOperation = 'source-atop'
    strands(g, rand, 0, 0, 620, 520, { count: 500, colors: [rgba(shade(color, 0.6))], len: [30, 90], angle: 1.17, spread: 0.12, alpha: [0.05, 0.16], width: [0.6, 1.4] })
  }, 1)
}

// Leaves outside the window, as soft shadows that stir.
export function paintLeaves(): Sprite {
  const rand = rng(23)
  return sprite(360, 300, (g) => {
    for (let i = 0; i < 16; i++) {
      const x = 50 + rand() * 260
      const y = 40 + rand() * 220
      wash(g, x, y, 26 + rand() * 22, 9 + rand() * 7, [120, 84, 70], 0.2, rand() * TAU)
    }
  }, 1)
}

// A warm round glow, for lit windows, lanterns and the evening halo.
export function paintGlow(color: RGB): Sprite {
  return sprite(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, rgba(color, 0.9))
    grad.addColorStop(0.3, rgba(color, 0.4))
    grad.addColorStop(1, rgba(color, 0))
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
  }, 1)
}

// The loop of yarn the frame hangs by. `taut` 0 lies slack on the table, 1 is
// pulled up to the peg.
export function drawYarn(g: G, taut: number, reach = 0): void {
  const half = FRAME.w * 0.24
  const top = -FRAME.h / 2 + 12
  const apex = -FRAME.h / 2 - (22 + (YARN_UP - 22) * taut) - reach
  const sag = (1 - taut) * 22
  for (let pass = 0; pass < 3; pass++) {
    g.beginPath()
    g.moveTo(-half, top)
    g.quadraticCurveTo(-half * 0.5 - sag, (top + apex) / 2 - sag * 0.7, 0, apex)
    g.quadraticCurveTo(half * 0.5 + sag, (top + apex) / 2 - sag * 0.7, half, top)
    if (pass === 0) {
      g.save()
      g.translate(1.5, 3)
      g.strokeStyle = 'rgba(70,44,34,0.22)'
      g.lineWidth = 8
      g.stroke()
      g.restore()
    } else if (pass === 1) {
      g.strokeStyle = 'rgb(236,220,188)'
      g.lineWidth = 6
      g.stroke()
    } else {
      g.strokeStyle = 'rgba(168,140,104,0.6)'
      g.lineWidth = 5.4
      g.setLineDash([2.4, 5.6])
      g.stroke()
      g.setLineDash([])
    }
  }
}
