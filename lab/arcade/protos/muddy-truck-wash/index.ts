// Muddy Truck Wash: a big friendly vehicle drives in caked in mud, the child
// rubs it clean with a sponge, a hose or a polish cloth, it beams, honks and
// drives off, and a dirtier one rolls in. Mud lives on an offscreen canvas and
// is erased with `destination-out`; a coarse grid mirrors it so the game knows
// how clean the vehicle is without reading pixels back.

import { blinkAt, ellipse, face, hint, sprite } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { clamp, dist, ease, lerp, pick, rnd, spring, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { drawWheel, OUT, VEHICLES, VH, VW } from './vehicles.ts'
import type { VehicleDef } from './vehicles.ts'

type C = CanvasRenderingContext2D
type Tool = 'sponge' | 'hose' | 'cloth'
type Phase = 'in' | 'wash' | 'rinse' | 'shine' | 'out'

// Where the vehicle's local box sits on the field.
const VX = 300
const GROUND = 676
const VY = GROUND - 450
// Mud canvas resolution and the size of one progress cell (local pixels).
const MS = 1.5
const CELL = 20
const GW = Math.ceil(VW / CELL)
const GH = Math.ceil(VH / CELL)

const MUDS = ['#704626', '#8b5c33', '#54331a'] as const
const WATER = ['#9fe3ff', '#d6f4ff', '#6fcbff'] as const
const SPLAT_PAINTS = ['#ff5fb7', '#35d0ff', '#a6f03c', '#ff9d2e'] as const

const TOOLS: readonly { tool: Tool; x: number; y: number; rim: string }[] = [
  { tool: 'sponge', x: 90, y: 236, rim: '#ffd84d' },
  { tool: 'hose', x: 90, y: 400, rim: '#4db8ff' },
  { tool: 'cloth', x: 90, y: 564, rim: '#ff8fc0' },
]

interface Stroke {
  x: number
  y: number
  travel: number
  timer: number
  sound: number
}

interface Foam {
  lx: number
  ly: number
  r: number
  born: number
}

interface Sticker {
  kind: 'leaf' | 'bird'
  emoji: string
  lx: number
  ly: number
  rot: number
  size: number
}

interface Flyer {
  emoji: string
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  size: number
  gravity: number
  life: number
}

interface Glob {
  x0: number
  y0: number
  lx: number
  ly: number
  t: number
  dur: number
  r: number
}

interface Twinkle {
  lx: number
  ly: number
  phase: number
  size: number
}

interface Puddle {
  x: number
  y: number
  rx: number
  ripple: number
  bubble: number
}

interface MudShape {
  x: number
  y: number
  r: number
  drip: number
}

function canvasOf(w: number, h: number): [HTMLCanvasElement, C] {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w)
  canvas.height = Math.ceil(h)
  return [canvas, canvas.getContext('2d')!]
}

function rr(g: C, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, width = 6): void {
  g.beginPath()
  g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
  g.fillStyle = fill
  g.fill()
  if (stroke) {
    g.strokeStyle = stroke
    g.lineWidth = width
    g.stroke()
  }
}

// A four-point sparkle.
function sparkle(g: C, x: number, y: number, r: number, fill: string): void {
  if (r <= 0.5) return
  g.beginPath()
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x, y, x + r, y)
  g.quadraticCurveTo(x, y, x, y + r)
  g.quadraticCurveTo(x, y, x - r, y)
  g.quadraticCurveTo(x, y, x, y - r)
  g.fillStyle = fill
  g.fill()
}

// The hose nozzle, pointing along +x from (x, y).
function nozzle(g: C, x: number, y: number, rot: number, s: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(s, s)
  rr(g, -46, 4, 26, 50, 9, '#3b3550', OUT, 5)
  rr(g, -58, -18, 96, 36, 14, '#ff5d5d', OUT, 5)
  rr(g, -48, -12, 60, 9, 4, 'rgba(255,255,255,0.4)')
  rr(g, 34, -24, 24, 48, 9, '#ffd84d', OUT, 5)
  g.restore()
}

// The polish cloth: a soft folded square.
function cloth(g: C, x: number, y: number, rot: number, s: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(s, s)
  g.beginPath()
  g.moveTo(-44, -36)
  g.quadraticCurveTo(0, -50, 44, -38)
  g.quadraticCurveTo(54, 0, 46, 40)
  g.quadraticCurveTo(0, 50, -46, 38)
  g.quadraticCurveTo(-54, 0, -44, -36)
  g.closePath()
  g.fillStyle = '#ff9ccb'
  g.fill()
  g.strokeStyle = OUT
  g.lineWidth = 5
  g.lineJoin = 'round'
  g.stroke()
  g.strokeStyle = 'rgba(255,255,255,0.75)'
  g.lineWidth = 5
  g.setLineDash([9, 9])
  g.beginPath()
  g.roundRect(-32, -25, 64, 52, 12)
  g.stroke()
  g.setLineDash([])
  g.beginPath()
  g.moveTo(46, 40)
  g.lineTo(14, 34)
  g.lineTo(40, 8)
  g.closePath()
  g.fillStyle = '#ffc4e0'
  g.fill()
  g.strokeStyle = OUT
  g.lineWidth = 4
  g.stroke()
  g.restore()
}

function paintBackdrop(g: C): void {
  const grad = g.createLinearGradient(0, 0, 0, 600)
  grad.addColorStop(0, '#7fd0ff')
  grad.addColorStop(1, '#e4f7ff')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  // Sun and clouds.
  g.fillStyle = 'rgba(255,240,150,0.45)'
  g.beginPath()
  g.arc(1010, 230, 84, 0, TAU)
  g.fill()
  g.fillStyle = '#ffe873'
  g.beginPath()
  g.arc(1010, 230, 58, 0, TAU)
  g.fill()
  for (const [cx, cy, s] of [[330, 210, 1], [700, 180, 0.8], [880, 300, 0.7]] as const) {
    g.fillStyle = 'rgba(255,255,255,0.92)'
    for (const [ox, oy, r] of [[-60, 10, 40], [-15, -14, 54], [40, 0, 46], [84, 14, 32]] as const) {
      g.beginPath()
      g.arc(cx + ox * s, cy + oy * s, r * s, 0, TAU)
      g.fill()
    }
  }
  // Hills and hedge.
  ellipse(g, 330, 650, 560, 250, '#a5e083')
  ellipse(g, 930, 680, 640, 270, '#84d36f')
  g.fillStyle = '#5fbf62'
  for (let x = 170; x < W + 60; x += 74) {
    g.beginPath()
    g.arc(x, 602 + ((x * 7) % 13), 52, 0, TAU)
    g.fill()
  }
  // Wash bay floor.
  const floor = g.createLinearGradient(0, 590, 0, H)
  floor.addColorStop(0, '#d8e1ea')
  floor.addColorStop(1, '#b3c0cf')
  g.fillStyle = floor
  g.fillRect(0, 596, W, H - 596)
  g.fillStyle = '#8fa0b3'
  g.fillRect(0, 592, W, 8)
  g.strokeStyle = 'rgba(80,100,125,0.22)'
  g.lineWidth = 3
  for (const y of [640, 704, 778]) {
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(W, y)
    g.stroke()
  }
  for (let x = -400; x <= W + 400; x += 150) {
    g.beginPath()
    g.moveTo(590 + (x - 590) * 0.62, 598)
    g.lineTo(x, H)
    g.stroke()
  }
  // The wet pad and drain under the vehicle.
  ellipse(g, VX + 380, GROUND + 14, 440, 46, 'rgba(120,150,185,0.35)')
  rr(g, VX + 330, GROUND + 22, 100, 16, 6, '#6c7c90')
  g.strokeStyle = '#47566a'
  g.lineWidth = 3
  for (let i = 1; i < 6; i++) {
    g.beginPath()
    g.moveTo(VX + 330 + i * 16.6, GROUND + 24)
    g.lineTo(VX + 330 + i * 16.6, GROUND + 36)
    g.stroke()
  }
  // The arch: two striped posts, a beam, a scalloped awning and sprinklers.
  for (const px of [196, 1112]) {
    rr(g, px, 100, 40, 520, 12, '#ffffff', OUT, 5)
    g.save()
    g.beginPath()
    g.roundRect(px, 100, 40, 520, 12)
    g.clip()
    g.fillStyle = '#4db8ff'
    for (let y = 80; y < 640; y += 70) {
      g.beginPath()
      g.moveTo(px, y + 40)
      g.lineTo(px + 40, y)
      g.lineTo(px + 40, y + 34)
      g.lineTo(px, y + 74)
      g.closePath()
      g.fill()
    }
    g.restore()
    rr(g, px - 10, 606, 60, 26, 8, '#6c7c90', OUT, 5)
  }
  for (let i = 0, x = 204; x < 1140; x += 52, i++) {
    g.beginPath()
    g.arc(x + 26, 112, 27, 0, Math.PI)
    g.fillStyle = i % 2 === 0 ? '#ffffff' : '#ff8fb5'
    g.fill()
    g.strokeStyle = OUT
    g.lineWidth = 4
    g.stroke()
  }
  rr(g, 176, 50, 1000, 66, 22, '#3f8cff', OUT, 6)
  rr(g, 190, 60, 972, 12, 6, 'rgba(255,255,255,0.35)')
  for (let x = 330; x <= 990; x += 132) {
    rr(g, x - 9, 116, 18, 22, 5, '#b9bccb', OUT, 4)
    rr(g, x - 15, 134, 30, 12, 5, '#8c8aa0', OUT, 4)
  }
  // The sign: a badge of bubbles.
  g.beginPath()
  g.arc(676, 72, 60, 0, TAU)
  g.fillStyle = '#ffffff'
  g.fill()
  g.strokeStyle = OUT
  g.lineWidth = 6
  g.stroke()
  for (const [bx, by, br] of [[-22, 8, 22], [14, -14, 18], [22, 20, 14], [-10, -26, 10]] as const) {
    g.beginPath()
    g.arc(676 + bx, 72 + by, br, 0, TAU)
    g.fillStyle = '#bfeaff'
    g.fill()
    g.strokeStyle = '#4db8ff'
    g.lineWidth = 4
    g.stroke()
    g.beginPath()
    g.arc(676 + bx - br * 0.3, 72 + by - br * 0.3, br * 0.22, 0, TAU)
    g.fillStyle = '#ffffff'
    g.fill()
  }
  // The tool shelf.
  rr(g, 22, 150, 136, 500, 40, 'rgba(255,255,255,0.78)', 'rgba(42,33,64,0.55)', 5)
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  const [bg, bgc] = canvasOf(W, H)
  paintBackdrop(bgc)
  const [body, bodyC] = canvasOf(VW * 2, VH * 2)
  const [mask, maskC] = canvasOf(VW * MS, VH * MS)
  const [mud, mudC] = canvasOf(VW * MS, VH * MS)
  const [scratch, scratchC] = canvasOf(VW * MS, VH * MS)
  const [brush, brushC] = canvasOf(128, 128)
  const small = document.createElement('canvas')
  small.width = GW
  small.height = GH
  const smallC = small.getContext('2d', { willReadFrequently: true })!
  {
    const grad = brushC.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(0,0,0,1)')
    grad.addColorStop(0.62, 'rgba(0,0,0,0.95)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    brushC.fillStyle = grad
    brushC.fillRect(0, 0, 128, 128)
  }

  const grid = new Float32Array(GW * GH)
  const solid = new Uint8Array(GW * GH)
  let solidCells: number[] = []
  let mudSum = 0
  let mudBase = 1

  let def: VehicleDef = VEHICLES[0]!
  let count = 0
  let phase: Phase = 'in'
  let phaseT = 0
  let driveX = -1000
  let mudFade = 1
  let decile = 0
  let tool: Tool = 'sponge'
  let lastTouchAt = -2
  let sprayedUntil = -1
  let wowUntil = -1
  let giggleUntil = -1
  let lastGiggleAt = -5
  let lastSplatAt = -5
  let hintAt = { x: VX + 380, y: VY + 250, at: -10 }
  let glint = -1
  let rinseTick = 0
  let exhaustTick = 0
  let dripTick = 0

  const susp = spring(0, 210, 9)
  const tilt = spring(0, 160, 8)
  const toolPop = { sponge: spring(1, 260, 12), hose: spring(1, 260, 12), cloth: spring(1, 260, 12) }
  const strokes = new Map<number, Stroke>()
  let foam: Foam[] = []
  let stickers: Sticker[] = []
  const flyers: Flyer[] = []
  const globs: Glob[] = []
  let twinkles: Twinkle[] = []
  let stains: { x: number; y: number; r: number }[] = []
  let stainFade = 1
  const washed: HTMLCanvasElement[] = []
  const puddles: Puddle[] = [
    { x: 420, y: 738, rx: 104, ripple: 0, bubble: 1.5 },
    { x: 910, y: 742, rx: 116, ripple: 0, bubble: 3 },
  ]

  const bodyY = () => susp.value + (phase === 'out' ? 0 : Math.sin(stage.time * 2.3) * 2.2)
  const toLocal = (x: number, y: number): [number, number] => [x - VX - driveX, y - VY - bodyY()]
  const cellAt = (lx: number, ly: number) => {
    const gx = Math.floor(lx / CELL)
    const gy = Math.floor(ly / CELL)
    return gx < 0 || gy < 0 || gx >= GW || gy >= GH ? -1 : gy * GW + gx
  }
  const solidAt = (lx: number, ly: number) => {
    const i = cellAt(lx, ly)
    return i >= 0 && solid[i] === 1
  }
  const randomSolid = (): [number, number] => {
    const i = solidCells.length > 0 ? solidCells[Math.floor(Math.random() * solidCells.length)]! : 0
    return [((i % GW) + 0.5) * CELL, (Math.floor(i / GW) + 0.5) * CELL]
  }
  const dirt = () => clamp(mudSum / mudBase, 0, 1)

  const readAlpha = (source: HTMLCanvasElement, into: (i: number, a: number) => void) => {
    smallC.clearRect(0, 0, GW, GH)
    smallC.drawImage(source, 0, 0, source.width, source.height, 0, 0, VW / CELL, VH / CELL)
    const data = smallC.getImageData(0, 0, GW, GH).data
    for (let i = 0; i < GW * GH; i++) into(i, data[i * 4 + 3]! / 255)
  }

  const paintMudShapes = (c: C, shapes: readonly MudShape[]) => {
    c.lineCap = 'round'
    for (const pass of [0, 1]) {
      const grow = pass === 0 ? 5 : 0
      c.fillStyle = c.strokeStyle = pass === 0 ? '#3e2612' : '#704626'
      for (const s of shapes) {
        c.beginPath()
        c.arc(s.x, s.y, s.r + grow, 0, TAU)
        c.fill()
        if (s.drip > 0) {
          c.lineWidth = s.r * 0.5 + grow * 2
          c.beginPath()
          c.moveTo(s.x, s.y)
          c.lineTo(s.x, s.y + s.r + s.drip)
          c.stroke()
        }
      }
    }
    for (const s of shapes) {
      c.fillStyle = 'rgba(150,102,58,0.85)'
      c.beginPath()
      c.ellipse(s.x - s.r * 0.22, s.y - s.r * 0.28, s.r * 0.5, s.r * 0.36, -0.5, 0, TAU)
      c.fill()
      c.fillStyle = 'rgba(62,38,18,0.7)'
      c.beginPath()
      c.arc(s.x + s.r * 0.35, s.y + s.r * 0.3, Math.max(2, s.r * 0.11), 0, TAU)
      c.fill()
    }
  }

  const paintSplat = (c: C, x: number, y: number, r: number, color: string) => {
    c.fillStyle = color
    c.beginPath()
    c.arc(x, y, r, 0, TAU)
    c.fill()
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + stage.rand()
      const d = r * lerp(1.0, 1.7, stage.rand())
      c.beginPath()
      c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * lerp(0.16, 0.34, stage.rand()), 0, TAU)
      c.fill()
      c.lineWidth = r * 0.2
      c.strokeStyle = color
      c.beginPath()
      c.moveTo(x, y)
      c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
      c.stroke()
    }
    c.fillStyle = 'rgba(255,255,255,0.4)'
    c.beginPath()
    c.ellipse(x - r * 0.3, y - r * 0.3, r * 0.34, r * 0.22, -0.6, 0, TAU)
    c.fill()
  }

  const loadVehicle = (n: number) => {
    count = n
    def = VEHICLES[n % VEHICLES.length]!
    const paint = def.colors[Math.floor(n / VEHICLES.length) % def.colors.length]!
    bodyC.setTransform(2, 0, 0, 2, 0, 0)
    bodyC.clearRect(0, 0, VW, VH)
    def.body(bodyC, paint)

    maskC.setTransform(1, 0, 0, 1, 0, 0)
    maskC.clearRect(0, 0, mask.width, mask.height)
    maskC.drawImage(body, 0, 0, mask.width, mask.height)
    maskC.setTransform(MS, 0, 0, MS, 0, 0)
    maskC.fillStyle = '#000'
    for (const w of def.wheels) {
      maskC.beginPath()
      maskC.arc(w.x, w.y, w.r + 2, 0, TAU)
      maskC.fill()
    }
    solidCells = []
    readAlpha(mask, (i, a) => {
      solid[i] = a > 0.55 ? 1 : 0
      if (solid[i]) solidCells.push(i)
    })

    // Mud: clumps of blobs with drips, thicker and in new places every time.
    const shapes: MudShape[] = []
    const clumps = Math.min(9 + n, 13)
    const centres: [number, number][] = def.wheels.slice(0, 2).map((w) => [w.x, w.y - w.r * 0.2])
    while (centres.length < clumps) {
      const i = solidCells[Math.floor(stage.rand() * solidCells.length)] ?? 0
      centres.push([((i % GW) + 0.5) * CELL, (Math.floor(i / GW) + 0.5) * CELL])
    }
    for (const [cx, cy] of centres) {
      const blobs = 7 + Math.floor(stage.rand() * 5)
      for (let i = 0; i < blobs; i++) {
        shapes.push({
          x: cx + lerp(-72, 72, stage.rand()),
          y: cy + lerp(-52, 52, stage.rand()),
          r: lerp(20, 46, stage.rand()),
          drip: stage.rand() < 0.22 ? lerp(20, 70, stage.rand()) : 0,
        })
      }
    }
    for (let i = 0; i < 46; i++) shapes.push({ x: stage.rand() * VW, y: stage.rand() * VH, r: lerp(4, 11, stage.rand()), drip: 0 })
    mudC.setTransform(1, 0, 0, 1, 0, 0)
    mudC.globalCompositeOperation = 'source-over'
    mudC.globalAlpha = 1
    mudC.clearRect(0, 0, mud.width, mud.height)
    mudC.setTransform(MS, 0, 0, MS, 0, 0)
    paintMudShapes(mudC, shapes)
    if (n >= 2) {
      const splats = 2 + (n % 3)
      for (let i = 0; i < splats; i++) {
        const [sx, sy] = randomSolid()
        paintSplat(mudC, sx, sy, lerp(26, 40, stage.rand()), pick(SPLAT_PAINTS, stage.rand()))
      }
    }
    if (n >= 3) {
      for (let i = 0; i < 3; i++) {
        const [sx, sy] = randomSolid()
        paintSplat(mudC, sx, Math.min(sy, 230), lerp(16, 24, stage.rand()), '#f7f7ee')
      }
    }
    mudC.setTransform(1, 0, 0, 1, 0, 0)
    mudC.globalCompositeOperation = 'destination-in'
    mudC.drawImage(mask, 0, 0)
    mudC.globalCompositeOperation = 'source-over'
    mudSum = 0
    readAlpha(mud, (i, a) => {
      grid[i] = solid[i] ? a : 0
      mudSum += grid[i]!
    })
    mudBase = Math.max(1, mudSum)

    stickers = []
    if (n >= 1) {
      const leaves = Math.min(3 + n, 7)
      for (let i = 0; i < leaves; i++) {
        const [lx, ly] = randomSolid()
        stickers.push({ kind: 'leaf', emoji: pick(['🍂', '🍁', '🍃']), lx, ly, rot: rnd(-1, 1), size: rnd(56, 72) })
      }
    }
    if (n >= 1 && n % 2 === 1) stickers.push({ kind: 'bird', emoji: '🐥', lx: def.perch.x, ly: def.perch.y, rot: 0, size: 72 })
    if (n >= 4) stickers.push({ kind: 'bird', emoji: '🐤', lx: def.perch.x + 70, ly: def.perch.y + 6, rot: 0, size: 60 })

    foam = []
    twinkles = []
    globs.length = 0
    mudFade = 1
    decile = 0
    glint = -1
    phase = 'in'
    phaseT = 0
    driveX = -1000
    // Engine chugging in.
    for (let i = 0; i < 9; i++) sfx.tone({ freq: 62 + (i % 2) * 9, to: 50, dur: 0.13, type: 'sawtooth', vol: 0.09, delay: i * 0.15 })
  }

  const honk = (delay = 0) => {
    sfx.tone({ freq: def.honk, dur: 0.2, type: 'square', vol: 0.09, delay })
    sfx.tone({ freq: def.honk * 1.26, dur: 0.2, type: 'square', vol: 0.07, delay })
  }

  const giggle = () => {
    if (stage.time - lastGiggleAt < 0.9) return
    lastGiggleAt = stage.time
    giggleUntil = stage.time + 0.6
    const base = def.honk * 2.2
    for (let i = 0; i < 4; i++) sfx.tone({ freq: base * (1 + i * 0.12), to: base * (1.25 + i * 0.12), dur: 0.08, type: 'sine', vol: 0.13, delay: i * 0.085 })
    susp.kick(-160)
  }

  // Wipe mud under a soft brush. Returns how much came off (in cells).
  const erase = (lx: number, ly: number, radius: number, strength: number): number => {
    mudC.globalCompositeOperation = 'destination-out'
    mudC.globalAlpha = strength
    mudC.drawImage(brush, (lx - radius) * MS, (ly - radius) * MS, radius * 2 * MS, radius * 2 * MS)
    mudC.globalAlpha = 1
    mudC.globalCompositeOperation = 'source-over'
    let removed = 0
    const x0 = Math.max(0, Math.floor((lx - radius) / CELL))
    const x1 = Math.min(GW - 1, Math.floor((lx + radius) / CELL))
    const y0 = Math.max(0, Math.floor((ly - radius) / CELL))
    const y1 = Math.min(GH - 1, Math.floor((ly + radius) / CELL))
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const i = gy * GW + gx
        const v = grid[i]!
        if (v <= 0) continue
        const dx = (gx + 0.5) * CELL - lx
        const dy = (gy + 0.5) * CELL - ly
        const d2 = (dx * dx + dy * dy) / (radius * radius)
        if (d2 >= 1) continue
        let next = v * (1 - Math.min(1, strength * 1.25 * (1 - d2)))
        if (next < 0.04) next = 0
        removed += v - next
        grid[i] = next
      }
    }
    mudSum -= removed
    return removed
  }

  // A glob from a puddle lands: paint it on, clipped to the vehicle.
  const stampMud = (lx: number, ly: number, r: number) => {
    const shapes: MudShape[] = []
    for (let i = 0; i < 5; i++) shapes.push({ x: lx + rnd(-r * 0.6, r * 0.6), y: ly + rnd(-r * 0.5, r * 0.5), r: rnd(r * 0.45, r * 0.8), drip: Math.random() < 0.3 ? rnd(15, 45) : 0 })
    scratchC.setTransform(1, 0, 0, 1, 0, 0)
    scratchC.globalCompositeOperation = 'source-over'
    scratchC.clearRect(0, 0, scratch.width, scratch.height)
    scratchC.setTransform(MS, 0, 0, MS, 0, 0)
    paintMudShapes(scratchC, shapes)
    scratchC.setTransform(1, 0, 0, 1, 0, 0)
    scratchC.globalCompositeOperation = 'destination-in'
    scratchC.drawImage(mask, 0, 0)
    scratchC.globalCompositeOperation = 'source-over'
    mudC.drawImage(scratch, 0, 0)
    const reach = r * 1.3
    for (let gy = Math.max(0, Math.floor((ly - reach) / CELL)); gy <= Math.min(GH - 1, Math.floor((ly + reach) / CELL)); gy++) {
      for (let gx = Math.max(0, Math.floor((lx - reach) / CELL)); gx <= Math.min(GW - 1, Math.floor((lx + reach) / CELL)); gx++) {
        const i = gy * GW + gx
        if (!solid[i]) continue
        const d = dist((gx + 0.5) * CELL, (gy + 0.5) * CELL, lx, ly) / reach
        if (d >= 1) continue
        const want = Math.min(1, 1.3 * (1 - d))
        if (want > grid[i]!) {
          mudSum += want - grid[i]!
          grid[i] = want
        }
      }
    }
    mudBase = Math.max(mudBase, mudSum)
    decile = Math.min(decile, Math.floor((1 - dirt()) * 10))
  }

  const addFoam = (lx: number, ly: number) => {
    if (!solidAt(lx, ly)) return
    foam.push({ lx, ly, r: rnd(10, 24), born: stage.time })
    if (foam.length > 130) foam.shift()
  }

  const launch = (s: Sticker, x: number, y: number) => {
    if (s.kind === 'bird') {
      flyers.push({ emoji: s.emoji, x, y, vx: rnd(120, 260) * (Math.random() < 0.5 ? -1 : 1), vy: -520, rot: 0, spin: 0, size: s.size, gravity: -260, life: 2.2 })
      sfx.tone({ freq: 2300, to: 3100, dur: 0.08, vol: 0.12 })
      sfx.tone({ freq: 2700, to: 3400, dur: 0.08, vol: 0.12, delay: 0.11 })
      sfx.tone({ freq: 2300, to: 3100, dur: 0.08, vol: 0.1, delay: 0.22 })
      fx.burst(x, y, { count: 6, color: '#ffffff', speed: 200, life: 0.5, size: 8 })
    } else {
      flyers.push({ emoji: s.emoji, x, y, vx: rnd(-320, 320), vy: rnd(-520, -300), rot: s.rot, spin: rnd(-7, 7), size: s.size, gravity: 900, life: 1.6 })
      sfx.pop(Math.round(rnd(0, 4)))
    }
  }

  const knockStickers = (lx: number, ly: number, reach: number) => {
    for (let i = stickers.length - 1; i >= 0; i--) {
      const s = stickers[i]!
      if (dist(s.lx, s.ly, lx, ly) > reach) continue
      stickers.splice(i, 1)
      launch(s, s.lx + VX + driveX, s.ly + VY + bodyY())
    }
  }

  const addStain = (x: number) => {
    stains.push({ x: x + rnd(-70, 70), y: rnd(GROUND + 8, GROUND + 52), r: rnd(8, 22) })
    if (stains.length > 60) stains.shift()
    stainFade = 1
  }

  // One dab of the current tool at a field point. `hold` scales a stationary
  // hose so it blasts over time rather than per frame.
  const dab = (x: number, y: number, hold: number): number => {
    const [lx, ly] = toLocal(x, y)
    const washing = phase === 'wash'
    const onBody = (washing || phase === 'shine') && solidAt(lx, ly)
    let removed = 0
    if (tool === 'sponge') {
      if (washing) removed = erase(lx, ly, 66, 0.5)
      if (onBody && Math.random() < 0.42) addFoam(lx + rnd(-46, 46), ly + rnd(-46, 46))
    } else if (tool === 'hose') {
      if (washing) removed = erase(lx, ly, 62, hold)
      if (foam.length > 0) {
        for (let i = foam.length - 1; i >= 0; i--) {
          const f = foam[i]!
          if (dist(f.lx, f.ly, lx, ly) < 72) {
            foam.splice(i, 1)
            if (Math.random() < 0.4) fx.burst(x, y, { count: 1, color: '#ffffff', speed: 260, life: 0.5, size: f.r * 0.7, shape: 'ring', gravity: 300 })
          }
        }
      }
      if (onBody && dist(lx, ly, def.face.x, def.face.y + 16) < 100) {
        sprayedUntil = stage.time + 0.35
        giggle()
      }
    } else {
      if (washing) removed = erase(lx, ly, 58, 0.45)
      const i = cellAt(lx, ly)
      if (onBody && i >= 0 && grid[i]! < 0.25 && Math.random() < 0.3) {
        twinkles.push({ lx: lx + rnd(-30, 30), ly: ly + rnd(-30, 30), phase: rnd(0, TAU), size: rnd(12, 22) })
        if (twinkles.length > 46) twinkles.shift()
      }
    }
    if (washing || phase === 'shine') knockStickers(lx, ly, 74)
    return removed
  }

  const useTool = (s: Stroke, x: number, y: number, dt: number, first: boolean) => {
    const d = dist(s.x, s.y, x, y)
    const [lx, ly] = toLocal(x, y)
    const onBody = (phase === 'wash' || phase === 'shine') && solidAt(lx, ly)
    let removed = 0
    if (tool === 'hose') {
      const n = Math.max(1, Math.ceil(d / 18))
      const hold = n > 1 ? 0.7 : Math.min(0.8, 10 * dt)
      for (let i = 1; i <= n; i++) removed += dab(lerp(s.x, x, i / n), lerp(s.y, y, i / n), hold)
      s.timer -= dt
      if (s.timer <= 0) {
        s.timer = 0.05
        // Spray where the jet lands.
        fx.burst(x, y, { count: 5, color: WATER, speed: 560, life: 0.5, size: 10, gravity: 1300, drag: 0.96 })
      }
      s.sound -= dt
      if (s.sound <= 0) {
        s.sound = 0.11
        sfx.noise({ dur: 0.14, vol: 0.07, freq: rnd(2200, 3200), filter: 'highpass' })
      }
      if (removed > 0.15) {
        fx.burst(x, y, { count: Math.min(5, 1 + Math.floor(removed * 1.5)), color: MUDS, speed: 640, life: 0.6, size: 13, gravity: 1500 })
        if (Math.random() < 0.5) addStain(x)
        if (stage.time - lastSplatAt > 0.3) {
          lastSplatAt = stage.time
          sfx.splat()
        }
      }
    } else if (d > 0.5 || first) {
      const n = Math.max(1, Math.ceil(d / 16))
      for (let i = 1; i <= n; i++) removed += dab(lerp(s.x, x, i / n), lerp(s.y, y, i / n), 1)
      s.travel += d
      const every = first ? 0 : 64
      if (s.travel >= every && (first || stage.time - s.sound > 0.075)) {
        s.travel = 0
        s.sound = stage.time
        if (tool === 'sponge') {
          // A scrubby rub, and a squeak when it is rubbing clean paint.
          sfx.noise({ dur: 0.1, vol: removed > 0.2 ? 0.13 : 0.06, freq: rnd(1400, 2000), to: 800, filter: 'bandpass', q: 1.2 })
          if (removed <= 0.2 && onBody) sfx.tone({ freq: rnd(900, 1250), to: rnd(1400, 1700), dur: 0.07, vol: 0.06 })
          fx.burst(x, y, { count: onBody ? 2 : 3, color: ['#ffffff', '#e6f7ff'], speed: 130, life: 0.8, size: rnd(9, 17), shape: 'ring', gravity: -160, drag: 0.95 })
        } else {
          sfx.tone({ freq: rnd(1500, 1800), to: rnd(2100, 2500), dur: 0.06, vol: 0.055 })
          fx.burst(x, y, { count: 2, color: ['#fff6b0', '#ffffff'], speed: 170, life: 0.5, size: 12, shape: 'star', gravity: 0, drag: 0.92 })
        }
        if (removed > 0.2) {
          fx.burst(x, y, { count: Math.min(6, 2 + Math.floor(removed)), color: MUDS, speed: 300, life: 0.6, size: 11, gravity: 1300 })
          addStain(x)
        }
      }
    }
    s.x = x
    s.y = y
    // A rising note every tenth of the mud: the feel of getting there.
    if (phase === 'wash') {
      const clean = 1 - dirt()
      while (decile < 9 && clean >= (decile + 1) * 0.1) {
        decile++
        sfx.note(decile - 2, 0.2, 'triangle', 0.16)
        fx.burst(x, y, { count: 5, color: ['#fff6b0', '#ffffff'], speed: 320, life: 0.5, size: 12, shape: 'star', gravity: 0, drag: 0.92 })
      }
    }
  }

  const splashPuddle = (pd: Puddle) => {
    pd.ripple = 1
    sfx.splat()
    sfx.boing(-3)
    fx.burst(pd.x, pd.y - 8, { count: 18, color: MUDS, speed: 560, angle: -Math.PI / 2, spread: 1.7, gravity: 1500, life: 0.75, size: 13 })
    fx.ring(pd.x, pd.y, '#8b5c33', 110, 0.35)
    if (phase !== 'wash') return
    for (let i = 0; i < 4; i++) {
      const [lx, ly] = randomSolid()
      globs.push({ x0: pd.x + rnd(-40, 40), y0: pd.y - 10, lx, ly, t: -i * 0.12, dur: rnd(0.42, 0.58), r: rnd(30, 46) })
    }
    wowUntil = stage.time + 0.9
    lastTouchAt = stage.time
  }

  const startRinse = () => {
    phase = 'rinse'
    phaseT = 0
    rinseTick = 0
    sfx.noise({ dur: 1.3, vol: 0.13, freq: 2600, to: 4200, filter: 'highpass' })
    sfx.slideUp()
    for (const s of stickers.splice(0)) launch(s, s.lx + VX, s.ly + VY)
  }

  const startShine = () => {
    phase = 'shine'
    phaseT = 0
    foam = []
    glint = 0
    // Remember this one on the beam.
    const [thumb, tc] = canvasOf(152, 94)
    tc.scale(0.2, 0.2)
    tc.drawImage(body, 0, 0, VW, VH)
    for (const w of def.wheels) drawWheel(tc, w, 0)
    washed.push(thumb)
    if (washed.length > 8) washed.shift()
    for (let i = 0; i < 7; i++) {
      const [lx, ly] = randomSolid()
      twinkles.push({ lx, ly, phase: rnd(0, TAU), size: rnd(24, 40) })
    }
    fx.flash('#ffffff', 0.3, 0.25)
    fx.confetti(W / 2 + 60, 220, 90)
    if (count % 5 === 4) sfx.fanfare()
    else sfx.win()
    honk(0.45)
    honk(0.75)
    susp.kick(-520)
    stage.after(0.45, () => susp.kick(-420))
    stage.after(0.85, () => susp.kick(-320))
    for (let i = 0; i < 3; i++) {
      stage.after(0.15 + i * 0.22, () => {
        const [lx, ly] = randomSolid()
        fx.burst(lx + VX, ly + VY, { count: 9, color: ['#fff6b0', '#ffffff', '#bfeaff'], speed: 360, life: 0.7, size: 16, shape: 'star', gravity: 0, drag: 0.93 })
        sfx.ding(4 + i * 2)
      })
    }
  }

  loadVehicle(0)

  return {
    update(dt) {
      const t = stage.time
      phaseT += dt
      susp.update(dt)
      tilt.update(dt)
      toolPop.sponge.update(dt)
      toolPop.hose.update(dt)
      toolPop.cloth.update(dt)

      if (phase === 'in') {
        const k = clamp(phaseT / 1.5, 0, 1)
        driveX = lerp(-1000, 0, ease.outCubic(k))
        dripTick -= dt
        if (dripTick <= 0 && k < 0.85) {
          dripTick = 0.07
          fx.burst(VX + driveX + rnd(120, 600), GROUND - 20, { count: 2, color: MUDS, speed: 260, angle: Math.PI, spread: 1.4, gravity: 1200, life: 0.5, size: 10 })
        }
        if (k >= 1) {
          phase = 'wash'
          phaseT = 0
          driveX = 0
          susp.kick(260)
          tilt.kick(0.5)
          sfx.thud(0.7)
          fx.shake(5, 0.2)
          fx.burst(VX + 380, GROUND, { count: 12, color: MUDS, speed: 420, angle: -Math.PI / 2, spread: 2.4, gravity: 1300, life: 0.6, size: 11 })
          honk(0.12)
        }
      } else if (phase === 'wash') {
        if (phaseT > 0.4 && mudSum < mudBase * 0.06 && globs.length === 0) startRinse()
        // Old foam fizzes away so the clean paint shows.
        for (let i = foam.length - 1; i >= 0; i--) {
          const f = foam[i]!
          if (t - f.born < 4.5) continue
          f.r -= 10 * dt
          if (f.r <= 1) foam.splice(i, 1)
        }
        // A drip now and then while it is filthy.
        dripTick -= dt
        if (dripTick <= 0 && dirt() > 0.3) {
          dripTick = rnd(0.5, 1.1)
          const [lx, ly] = randomSolid()
          const i = cellAt(lx, ly)
          if (i >= 0 && grid[i]! > 0.5) fx.burst(lx + VX, ly + VY, { count: 1, color: MUDS, speed: 40, angle: Math.PI / 2, spread: 0.3, gravity: 1100, life: 0.7, size: 9 })
        }
      } else if (phase === 'rinse') {
        mudFade = clamp(1 - phaseT / 0.6, 0, 1)
        stainFade = clamp(1 - phaseT / 1.0, 0, 1)
        rinseTick -= dt
        if (rinseTick <= 0 && phaseT < 1.05) {
          rinseTick = 0.05
          for (let x = 330; x <= 990; x += 132) {
            fx.burst(x + rnd(-8, 8), 150, { count: 3, color: WATER, speed: 900, angle: Math.PI / 2, spread: 0.5, gravity: 900, life: 0.6, size: 9 })
          }
        }
        for (const f of foam) {
          f.ly += (260 + f.r * 12) * dt
          f.r = Math.max(0, f.r - 14 * dt)
        }
        if (phaseT > 0.15 && phaseT < 0.9) susp.kick(rnd(-40, 40))
        sprayedUntil = Math.max(sprayedUntil, t + 0.05)
        if (phaseT >= 1.3) {
          stains = []
          startShine()
        }
      } else if (phase === 'shine') {
        if (glint >= 0) {
          glint += dt / 0.8
          if (glint > 1) glint = -1
        }
        if (phaseT >= 2.6) {
          phase = 'out'
          phaseT = 0
          exhaustTick = 0
          honk()
          sfx.whoosh()
          tilt.kick(-0.6)
          for (let i = 0; i < 8; i++) sfx.tone({ freq: 70 + i * 9, to: 60 + i * 9, dur: 0.12, type: 'sawtooth', vol: 0.08, delay: 0.2 + i * 0.1 })
        }
      } else {
        // Pull back, then go.
        const back = clamp(phaseT / 0.3, 0, 1)
        const go = clamp((phaseT - 0.3) / 1.0, 0, 1)
        driveX = -46 * ease.outQuad(back) + 1150 * ease.inQuad(go)
        exhaustTick -= dt
        if (exhaustTick <= 0 && go > 0) {
          exhaustTick = 0.05
          fx.burst(VX + driveX + 90, GROUND - 40, { count: 2, color: ['#ffffff', '#e0e6ee'], speed: 180, angle: Math.PI, spread: 0.9, gravity: -200, life: 0.7, size: 18, drag: 0.95 })
        }
        if (go >= 1) loadVehicle(count + 1)
      }

      // Every finger works the current tool.
      for (const [id, s] of strokes) {
        const p = stage.pointers.get(id)
        if (!p || !p.down) {
          strokes.delete(id)
          continue
        }
        useTool(s, p.x, p.y, dt, false)
      }

      for (let i = globs.length - 1; i >= 0; i--) {
        const gl = globs[i]!
        gl.t += dt / gl.dur
        if (gl.t < 1) continue
        globs.splice(i, 1)
        if (phase !== 'wash') continue
        stampMud(gl.lx, gl.ly, gl.r)
        fx.burst(gl.lx + VX, gl.ly + VY, { count: 7, color: MUDS, speed: 300, life: 0.5, size: 10, gravity: 1200 })
        sfx.splat()
        susp.kick(110)
        tilt.kick(rnd(-0.3, 0.3))
      }

      for (let i = flyers.length - 1; i >= 0; i--) {
        const f = flyers[i]!
        f.life -= dt
        f.vy += f.gravity * dt
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.rot += f.spin * dt
        if (f.life <= 0 || f.y > H + 100 || f.y < -120) flyers.splice(i, 1)
      }

      for (const pd of puddles) {
        pd.ripple = Math.max(0, pd.ripple - dt * 1.6)
        pd.bubble -= dt
        if (pd.bubble <= 0) pd.bubble = rnd(2.2, 4)
      }
    },

    draw(g) {
      const t = stage.time
      g.drawImage(bg, 0, 0)

      // Floor marks and puddles.
      if (stains.length > 0 && stainFade > 0) {
        g.globalAlpha = 0.55 * stainFade
        g.fillStyle = '#704626'
        g.beginPath()
        for (const s of stains) {
          g.moveTo(s.x + s.r, s.y)
          g.ellipse(s.x, s.y, s.r, s.r * 0.4, 0, 0, TAU)
        }
        g.fill()
        g.globalAlpha = 1
      }
      for (const pd of puddles) {
        const wob = 1 + Math.sin(t * 2 + pd.x) * 0.03 + pd.ripple * 0.12
        ellipse(g, pd.x, pd.y + 4, pd.rx * wob + 6, 32 * wob + 4, '#54331a')
        ellipse(g, pd.x, pd.y, pd.rx * wob, 29 * wob, '#7a4e2a')
        ellipse(g, pd.x - pd.rx * 0.3, pd.y - 8, pd.rx * 0.36, 7, 'rgba(255,255,255,0.28)', -0.05)
        g.strokeStyle = 'rgba(255,255,255,0.3)'
        g.lineWidth = 3
        const ring = (t * 0.5 + pd.x * 0.01) % 1
        g.globalAlpha = 1 - ring
        g.beginPath()
        g.ellipse(pd.x + 20, pd.y + 2, pd.rx * 0.6 * ring, 17 * ring, 0, 0, TAU)
        g.stroke()
        g.globalAlpha = 1
        // A slow bubble that swells and pops.
        const b = clamp(1 - pd.bubble / 1.2, 0, 1)
        if (b > 0 && b < 1) {
          g.beginPath()
          g.arc(pd.x + 36, pd.y - 6 - b * 6, 5 + b * 12, 0, TAU)
          g.fillStyle = '#8b5c33'
          g.fill()
          g.strokeStyle = '#54331a'
          g.lineWidth = 3
          g.stroke()
        }
      }

      // The vehicle.
      const by = bodyY()
      const pivotX = VX + driveX + 380
      const roll = driveX / 60
      const sy = clamp(1 - susp.value * 0.0012, 0.9, 1.1)
      const onScreen = driveX > -1090 && driveX < 900
      if (onScreen) {
        // A sunburst behind a freshly clean vehicle.
        if (phase === 'shine' || (phase === 'out' && phaseT < 0.3)) {
          const grow = phase === 'shine' ? ease.outBack(clamp(phaseT / 0.45, 0, 1)) : 1 - phaseT / 0.3
          g.save()
          g.translate(pivotX, GROUND - 210)
          g.rotate(t * 0.5)
          g.fillStyle = 'rgba(255,246,176,0.5)'
          g.beginPath()
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU
            g.moveTo(0, 0)
            g.lineTo(Math.cos(a - 0.11) * 470 * grow, Math.sin(a - 0.11) * 470 * grow)
            g.lineTo(Math.cos(a + 0.11) * 470 * grow, Math.sin(a + 0.11) * 470 * grow)
          }
          g.fill()
          g.restore()
        }
        ellipse(g, pivotX, GROUND + 6, 330, 26, 'rgba(30,40,70,0.2)')
        g.save()
        g.translate(pivotX, GROUND)
        g.rotate(tilt.value * 0.05)
        g.scale(1 / Math.sqrt(sy), sy)
        g.translate(-380, -450)
        g.drawImage(body, 0, by, VW, VH)
        for (const w of def.wheels) drawWheel(g, w, roll * (60 / w.r))
        if (mudFade > 0) {
          g.globalAlpha = mudFade
          g.drawImage(mud, 0, by, VW, VH)
          g.globalAlpha = 1
        }
        // Glint sweep across the clean paint.
        if (glint >= 0) {
          scratchC.setTransform(1, 0, 0, 1, 0, 0)
          scratchC.globalCompositeOperation = 'source-over'
          scratchC.clearRect(0, 0, scratch.width, scratch.height)
          const gx = lerp(-260, scratch.width + 60, glint)
          scratchC.fillStyle = 'rgba(255,255,255,0.8)'
          scratchC.beginPath()
          scratchC.moveTo(gx, scratch.height)
          scratchC.lineTo(gx + 200, 0)
          scratchC.lineTo(gx + 300, 0)
          scratchC.lineTo(gx + 100, scratch.height)
          scratchC.closePath()
          scratchC.fill()
          scratchC.fillRect(gx + 140, 0, 0, 0)
          scratchC.globalCompositeOperation = 'destination-in'
          scratchC.drawImage(mask, 0, 0)
          scratchC.globalCompositeOperation = 'source-over'
          g.drawImage(scratch, 0, by, VW, VH)
        }
        for (const s of stickers) {
          const hop = s.kind === 'bird' ? Math.abs(Math.sin(t * 3 + s.lx)) * 6 : 0
          sprite(g, s.emoji, s.lx, s.ly + by - hop, s.size, s.kind === 'leaf' ? s.rot + Math.sin(t * 2 + s.lx) * 0.08 : 0)
        }
        // Foam: two batched fills.
        if (foam.length > 0) {
          for (const pass of [0, 1]) {
            g.fillStyle = pass === 0 ? 'rgba(120,175,225,0.55)' : 'rgba(255,255,255,0.95)'
            g.beginPath()
            for (const f of foam) {
              const r = f.r * ease.outBack(clamp((t - f.born) / 0.25, 0, 1)) * (1 + Math.sin(t * 3 + f.lx) * 0.05)
              if (r <= 0.5) continue
              const ox = pass === 0 ? 2 : 0
              const oy = pass === 0 ? 3 : 0
              g.moveTo(f.lx + ox + r, f.ly + by + oy)
              g.arc(f.lx + ox, f.ly + by + oy, r, 0, TAU)
            }
            g.fill()
          }
        }
        // The face, always on top so the eyes peek through the mud.
        const near = [...stage.pointers.values()].find((p) => p.down)
        const fxp = def.face.x + VX + driveX
        const fyp = def.face.y + VY + by
        let lookX = Math.sin(t * 0.7) * 0.5
        let lookY = Math.sin(t * 0.9) * 0.25
        if (near) {
          lookX = clamp((near.x - fxp) / 220, -1, 1)
          lookY = clamp((near.y - fyp) / 220, -1, 1)
        } else if (phase === 'in') lookX = 1
        const d = dirt()
        let mood: Mood = phase === 'wash' ? (d > 0.72 ? 'sad' : d > 0.4 ? 'plain' : 'happy') : phase === 'in' ? 'sad' : 'happy'
        let blink = blinkAt(t, count)
        if (t < wowUntil) mood = 'wow'
        else if (t < giggleUntil) mood = 'yum'
        if (t < sprayedUntil) {
          blink = 1
          mood = 'happy'
        }
        // A soft patch behind the face so it reads on any paint or mud.
        ellipse(g, def.face.x, def.face.y + by + 18, def.face.size * 2.9, def.face.size * 2.3, 'rgba(255,255,255,0.22)')
        face(g, def.face.x, def.face.y + by, def.face.size, mood, lookX, lookY, blink)
        if (mood === 'happy' && phase !== 'wash') {
          ellipse(g, def.face.x - def.face.size * 2.3, def.face.y + by + def.face.size * 1.3, def.face.size * 0.5, def.face.size * 0.32, 'rgba(255,120,150,0.55)')
          ellipse(g, def.face.x + def.face.size * 2.3, def.face.y + by + def.face.size * 1.3, def.face.size * 0.5, def.face.size * 0.32, 'rgba(255,120,150,0.55)')
        }
        for (const tw of twinkles) {
          const s = Math.max(0, Math.sin(t * 4 + tw.phase))
          sparkle(g, tw.lx, tw.ly + by, tw.size * s, '#ffffff')
          sparkle(g, tw.lx, tw.ly + by, tw.size * s * 0.5, '#fff6b0')
        }
        g.restore()

        // Flies circle a filthy vehicle and leave as it gets clean.
        if (phase === 'wash' && d > 0.45) {
          for (let i = 0; i < 3; i++) {
            const a = t * (2.1 + i * 0.5) + i * 2.1
            const x = VX + 380 + Math.cos(a) * (230 + i * 40) + Math.sin(t * 9 + i) * 8
            const y = VY + 120 + Math.sin(a * 1.7) * 70 + i * 26
            g.fillStyle = 'rgba(255,255,255,0.8)'
            g.beginPath()
            g.ellipse(x - 5, y - 6 - Math.sin(t * 40 + i) * 2, 7, 4, -0.5, 0, TAU)
            g.ellipse(x + 5, y - 6 + Math.sin(t * 40 + i) * 2, 7, 4, 0.5, 0, TAU)
            g.fill()
            g.fillStyle = '#2a2140'
            g.beginPath()
            g.arc(x, y, 5.5, 0, TAU)
            g.fill()
          }
        }
      }

      // Mud flying from a puddle.
      for (const gl of globs) {
        if (gl.t < 0) continue
        const k = clamp(gl.t, 0, 1)
        const x = lerp(gl.x0, gl.lx + VX, k)
        const y = lerp(gl.y0, gl.ly + VY, k) - Math.sin(k * Math.PI) * 240
        g.beginPath()
        g.ellipse(x, y, gl.r * 0.5, gl.r * 0.62, 0, 0, TAU)
        g.fillStyle = '#704626'
        g.fill()
        g.strokeStyle = '#3e2612'
        g.lineWidth = 5
        g.stroke()
        ellipse(g, x - gl.r * 0.14, y - gl.r * 0.2, gl.r * 0.16, gl.r * 0.11, 'rgba(255,255,255,0.35)', -0.5)
      }
      for (const f of flyers) {
        const flap = f.gravity < 0 ? 1 + Math.sin(t * 30) * 0.12 : 1
        sprite(g, f.emoji, f.x, f.y, f.size, f.rot, f.vx < 0 && f.gravity < 0 ? -1 : 1, flap)
      }

      // The washed row on the beam.
      washed.forEach((thumb, i) => {
        const right = i < 4
        const x = right ? 770 + i * 96 : 222 + (i - 4) * 96
        const fresh = i === washed.length - 1 && phase === 'shine' ? ease.outBack(clamp(phaseT / 0.5, 0, 1)) : 1
        g.save()
        g.translate(x + 45, 84)
        g.scale(0.62 * fresh, 0.62 * fresh)
        g.drawImage(thumb, -76, -52)
        g.restore()
        sparkle(g, x + 80, 68, 9 * fresh * (0.7 + Math.sin(t * 5 + i) * 0.3), '#ffffff')
      })

      // Tools on the shelf.
      const held = new Set<Tool>()
      if (strokes.size > 0) held.add(tool)
      for (const b of TOOLS) {
        const on = b.tool === tool
        const beat = (t + b.y * 0.004) % 3.6
        const hop = !on && beat < 0.5 ? Math.sin((beat / 0.5) * Math.PI) : 0
        const s = toolPop[b.tool].value * (on ? 1.14 : 0.96 + hop * 0.09)
        g.save()
        g.translate(b.x, b.y - hop * 10)
        g.rotate(hop * Math.sin(t * 30) * 0.06)
        g.scale(s, s)
        if (on) {
          g.beginPath()
          g.arc(0, 0, 70 + Math.sin(t * 5) * 3, 0, TAU)
          g.fillStyle = 'rgba(255,225,77,0.55)'
          g.fill()
        }
        g.beginPath()
        g.arc(0, 0, 58, 0, TAU)
        g.fillStyle = on ? '#ffffff' : '#f1f4fa'
        g.fill()
        g.strokeStyle = b.rim
        g.lineWidth = 9
        g.stroke()
        g.strokeStyle = OUT
        g.lineWidth = 3
        g.beginPath()
        g.arc(0, 0, 63, 0, TAU)
        g.stroke()
        const away = held.has(b.tool) ? 0.35 : 1
        g.globalAlpha = away
        const wig = on ? Math.sin(t * 4) * 0.12 : 0
        if (b.tool === 'sponge') sprite(g, '🧽', 0, 0, 74, wig)
        else if (b.tool === 'hose') {
          nozzle(g, -6, -8, 0.5 + wig, 0.7)
          sprite(g, '💧', 30, 28, 30)
        } else {
          cloth(g, -2, 2, -0.2 + wig, 0.78)
          sparkle(g, 28, -26, 15, '#ffd84d')
        }
        g.globalAlpha = 1
        g.restore()
      }

      // The tool in the hand.
      for (const [id, s] of strokes) {
        const p = stage.pointers.get(id)
        if (!p) continue
        if (tool === 'sponge') {
          sprite(g, '🧽', p.x, p.y - 8, 128, Math.sin(t * 22) * 0.1 + clamp(p.vx / 2500, -0.4, 0.4))
        } else if (tool === 'cloth') {
          cloth(g, p.x, p.y - 6, Math.sin(t * 24) * 0.12 + clamp(p.vx / 2500, -0.4, 0.4), 1.2)
        } else {
          const nx = clamp(p.x - 118, 40, W - 40)
          const ny = clamp(p.y - 132, 40, H - 40)
          const a = Math.atan2(p.y - ny, p.x - nx)
          const hb = TOOLS[1]!
          // The hose runs back to its hook.
          g.lineCap = 'round'
          for (const pass of [0, 1]) {
            g.beginPath()
            g.moveTo(hb.x + 30, hb.y + 20)
            g.quadraticCurveTo((hb.x + nx) / 2, Math.max(hb.y, ny) + 170, nx - Math.cos(a) * 50, ny - Math.sin(a) * 50)
            g.strokeStyle = pass === 0 ? OUT : '#43b86a'
            g.lineWidth = pass === 0 ? 18 : 11
            g.stroke()
          }
          const tx = nx + Math.cos(a) * 46
          const ty = ny + Math.sin(a) * 46
          const wobx = Math.sin(t * 50 + s.x) * 3
          g.strokeStyle = 'rgba(111,203,255,0.9)'
          g.lineWidth = 28
          g.beginPath()
          g.moveTo(tx, ty)
          g.lineTo(p.x + wobx, p.y)
          g.stroke()
          g.strokeStyle = '#ffffff'
          g.lineWidth = 12
          g.setLineDash([22, 12])
          g.lineDashOffset = -t * 700
          g.beginPath()
          g.moveTo(tx, ty)
          g.lineTo(p.x + wobx, p.y)
          g.stroke()
          g.setLineDash([])
          g.beginPath()
          g.arc(p.x, p.y, 34 + Math.sin(t * 40) * 7, 0, TAU)
          g.fillStyle = 'rgba(190,235,255,0.55)'
          g.fill()
          g.beginPath()
          g.arc(p.x, p.y, 19 + Math.sin(t * 47) * 5, 0, TAU)
          g.fillStyle = 'rgba(255,255,255,0.85)'
          g.fill()
          nozzle(g, nx, ny, a, 1)
        }
      }

      // Idle hint: rub the dirtiest patch.
      if (phase === 'wash' && t - lastTouchAt > 5 && strokes.size === 0) {
        if (t - hintAt.at > 2.4) {
          let best = -1
          let bestV = 0
          for (const i of solidCells) {
            const gx = i % GW
            if (gx < 2 || gx > GW - 3) continue
            const v = grid[i]! + grid[i - 1]! + grid[i + 1]! + (grid[i - GW] ?? 0) + (grid[i + GW] ?? 0) + Math.random() * 0.5
            if (v > bestV) {
              bestV = v
              best = i
            }
          }
          if (best >= 0) hintAt = { x: ((best % GW) + 0.5) * CELL + VX, y: (Math.floor(best / GW) + 0.5) * CELL + VY, at: t }
        }
        hint(g, hintAt.x + Math.sin(t * 3.2) * 70, hintAt.y, t, 64)
      }
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      for (const b of TOOLS) {
        if (dist(p.x, p.y, b.x, b.y) > 84) continue
        tool = b.tool
        toolPop[b.tool].value = 0.78
        toolPop[b.tool].kick(5)
        sfx.pop(b.tool === 'sponge' ? 0 : b.tool === 'hose' ? 2 : 4)
        fx.ring(b.x, b.y, b.rim, 96, 0.35)
        fx.burst(b.x, b.y, { count: 8, color: [b.rim, '#ffffff'], speed: 280, life: 0.5, size: 10 })
        return
      }
      for (const pd of puddles) {
        const dx = (p.x - pd.x) / (pd.rx + 30)
        const dy = (p.y - pd.y) / 62
        if (dx * dx + dy * dy > 1) continue
        splashPuddle(pd)
        return
      }
      const s: Stroke = { x: p.x, y: p.y, travel: 0, timer: 0, sound: 0 }
      strokes.set(p.id, s)
      fx.ring(p.x, p.y, '#ffffff', 56, 0.3)
      const [lx, ly] = toLocal(p.x, p.y)
      if ((phase === 'wash' || phase === 'shine') && solidAt(lx, ly)) {
        // A poke rocks it on its springs; a poke on the nose gets a giggle.
        susp.kick(150)
        tilt.kick((lx - 380) / 600)
        if (dist(lx, ly, def.face.x, def.face.y + 16) < 105) giggle()
        else if (phase === 'shine') honk()
        else sfx.pop(Math.round(rnd(-2, 2)))
      } else if (tool !== 'hose') sfx.pop(Math.round(rnd(-2, 2)))
      useTool(s, p.x, p.y, 1 / 60, true)
    },

    up(p: Pointer) {
      strokes.delete(p.id)
      lastTouchAt = stage.time
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'muddy-truck-wash',
    name: 'Muddy Truck Wash',
    emoji: '🚜',
    ages: [2, 5],
    pitch: 'Rub the mud off a big friendly digger until it shines, honks and drives away, then wash the next one.',
    howTo: 'Rub the vehicle to scrub it. Tap a tool on the left to swap sponge, hose or polish cloth. Tap a puddle to splash mud on.',
    basedOn: 'PowerWash Simulator, toddler car-wash apps',
    whyFun: 'Rub to reveal: mud wipes off in soft swaths under the finger, the vehicle reacts, and mess is allowed.',
  },
  create,
}
