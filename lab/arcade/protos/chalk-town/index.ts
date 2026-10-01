// Chalk Town: a patch of pavement, a pail of fat chalks and a shoebox of
// wooden toys. Lines are roads the cars follow, closed shapes are homes the
// peg people live in, blue scribble is water for the dog. Dragging the cloud
// over the sun brings the rain, which washes the town down the cracks to the
// drain; dragging it away dries the pavement clean.
//
// The chalk lives on its own offscreen canvas, and a second canvas holds the
// pavement with the chalk already laid over it, repainted only where the chalk
// changed. A frame is one blit of that plus the few things that move.

import { clamp, damp, ease, lerp, rnd, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { BOX, BUCKET, buildGround, CHALK, CHALK_MID, CRACKS, DRAIN, FIELD, KERB_Y, PAVE_TOP, RAG, SKY_H, SLOT_GAP, SLOT_X, SLOT_Y, WEEDS } from './ground.ts'
import { BLUE, createTown, newRider, STEP } from './roads.ts'
import type { Region, Rider, Stroke } from './roads.ts'
import { buildSky, drawCar, drawChalk, drawDog, drawPerson, drawRag } from './toys.ts'

const SUN = { x: 770, y: 36 }
const RAG_TOOL = 6
const CHALK_ALPHA = 0.94
// Seconds of full rain to wash a line away.
const WASH = 13
const FULL = [94, 86, 98, 80, 90, 74]
const STUB = 46
const SLOT_TILT = [0.06, -0.1, 0.12, -0.05, 0.09, -0.12]

type Mode = 'box' | 'fly' | 'home' | 'park' | 'drive' | 'wait' | 'turn' | 'stand' | 'potter' | 'walk' | 'stroll' | 'sit' | 'trot' | 'paddle'

interface Toy {
  kind: 'car' | 'person' | 'dog'
  variant: number
  x: number
  y: number
  // Heading for a car.
  a: number
  face: number
  slotX: number
  slotY: number
  slotA: number
  inBox: boolean
  held: boolean
  mode: Mode
  rider: Rider
  ox: number
  oy: number
  timer: number
  v: number
  speed: number
  wait: number
  a0: number
  reach: number
  tx: number
  ty: number
  moving: boolean
  hop: number
  hopH: number
  lift: number
  bump: Spring
  homeX: number
  homeY: number
  hasHome: boolean
  away: boolean
  stay: number
  visitAfter: number
  path: { x: number; y: number; zig: boolean }[]
  pathI: number
  goal: 'pond' | 'sit'
  legs: number
  wet: number
  step: number
  splash: number
  fx0: number
  fy0: number
  fx1: number
  fy1: number
  ft: number
  roll: number
  // Which stretch of a zigzag a hopping person is on.
  seg: number
}

type Act =
  | { kind: 'draw'; stroke: Stroke; color: number; lx: number; ly: number; acc: number; sound: number; dust: number; grown: number }
  | { kind: 'rub'; lx: number; ly: number; sound: number; changed: boolean }
  | { kind: 'toy'; toy: Toy; dx: number; dy: number; moved: boolean; fromBox: boolean }
  | { kind: 'cloud'; off: number }
  | { kind: 'tool'; tool: number }

function turnTo(from: number, to: number, rate: number, dt: number): number {
  let d = (to - from) % TAU
  if (d > Math.PI) d -= TAU
  if (d < -Math.PI) d += TAU
  return from + d * (1 - Math.exp(-rate * dt))
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const S = typeof window !== 'undefined' && window.devicePixelRatio >= 1.5 ? 2 : 1
  const ground = buildGround(S)
  const sky = buildSky(S)
  const town = createTown(W, H)

  const chalk = document.createElement('canvas')
  chalk.width = W * S
  chalk.height = H * S
  const cg = chalk.getContext('2d')!
  const scene = document.createElement('canvas')
  scene.width = W * S
  scene.height = H * S
  const sg = scene.getContext('2d')!
  sg.drawImage(ground.canvas, 0, 0)
  const pitPat = cg.createPattern(ground.pit, 'repeat')!
  const heavyPat = cg.createPattern(ground.pitHeavy, 'repeat')!
  // Use both once now, on the empty layer, so the first stroke does not pay
  // for setting them up.
  cg.globalCompositeOperation = 'destination-out'
  for (const pat of [pitPat, heavyPat]) {
    cg.fillStyle = pat
    cg.fillRect(0, 0, 64, 64)
  }
  cg.globalCompositeOperation = 'source-over'

  // A soft, speckled dab for the rag.
  const dab = document.createElement('canvas')
  dab.width = 80 * S
  dab.height = 80 * S
  {
    const dg = dab.getContext('2d')!
    dg.scale(S, S)
    const grad = dg.createRadialGradient(40, 40, 6, 40, 40, 38)
    grad.addColorStop(0, 'rgba(0,0,0,0.95)')
    grad.addColorStop(0.6, 'rgba(0,0,0,0.75)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    dg.fillStyle = grad
    dg.fillRect(0, 0, 80, 80)
    dg.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < 260; i++) {
      dg.fillStyle = `rgba(0,0,0,${0.3 + Math.random() * 0.5})`
      dg.fillRect(Math.random() * 80, Math.random() * 80, 1 + Math.random() * 2.5, 1 + Math.random() * 1.5)
    }
  }

  // ---- The chalk layer -----------------------------------------------------

  // Device-pixel rectangles of the scene that need the chalk laid over again.
  const dirty: number[] = []
  const soil = (x0: number, y0: number, x1: number, y1: number): void => {
    dirty.push(Math.max(0, x0), Math.max(0, y0), Math.min(W * S, x1), Math.min(H * S, y1))
  }
  const soilAt = (x0: number, y0: number, x1: number, y1: number): void => {
    soil(Math.floor(x0 * S), Math.floor(y0 * S), Math.ceil(x1 * S), Math.ceil(y1 * S))
  }
  const repaint = (x0: number, y0: number, x1: number, y1: number): void => {
    const w = x1 - x0
    const h = y1 - y0
    if (w <= 0 || h <= 0) return
    sg.globalAlpha = 1
    sg.drawImage(ground.canvas, x0, y0, w, h, x0, y0, w, h)
    sg.globalAlpha = CHALK_ALPHA
    sg.drawImage(chalk, x0, y0, w, h, x0, y0, w, h)
  }
  const flush = (): void => {
    if (dirty.length === 0) return
    if (dirty.length > 4 * 60) {
      let x0 = Infinity
      let y0 = Infinity
      let x1 = 0
      let y1 = 0
      for (let i = 0; i < dirty.length; i += 4) {
        x0 = Math.min(x0, dirty[i])
        y0 = Math.min(y0, dirty[i + 1])
        x1 = Math.max(x1, dirty[i + 2])
        y1 = Math.max(y1, dirty[i + 3])
      }
      repaint(x0, y0, x1, y1)
    } else {
      for (let i = 0; i < dirty.length; i += 4) repaint(dirty[i], dirty[i + 1], dirty[i + 2], dirty[i + 3])
    }
    dirty.length = 0
  }

  // The part of the pavement that has ever had chalk on it since it was clean.
  const inked = { x0: W, y0: H, x1: 0, y1: 0, any: false }
  const noteInk = (x: number, y: number, pad: number): void => {
    inked.any = true
    if (x - pad < inked.x0) inked.x0 = x - pad
    if (y - pad < inked.y0) inked.y0 = y - pad
    if (x + pad > inked.x1) inked.x1 = x + pad
    if (y + pad > inked.y1) inked.y1 = y + pad
  }

  // One stretch of chalk: a fat stroke, ragged at the edges, with dust beside
  // it, and then knocked out wherever the tar is pitted.
  const mark = (x0: number, y0: number, x1: number, y1: number, color: number, width: number, heavy: boolean): void => {
    cg.setTransform(S, 0, 0, S, 0, 0)
    cg.globalCompositeOperation = 'source-over'
    cg.globalAlpha = 1
    cg.lineCap = 'round'
    cg.strokeStyle = Math.random() < 0.4 ? CHALK_MID[color] : CHALK[color]
    cg.lineWidth = width
    cg.beginPath()
    cg.moveTo(x0, y0)
    cg.lineTo(x1, y1)
    cg.stroke()
    const len = Math.hypot(x1 - x0, y1 - y0) || 1
    const nx = -(y1 - y0) / len
    const ny = (x1 - x0) / len
    cg.strokeStyle = CHALK[color]
    for (const side of [-1, 1]) {
      if (Math.random() < 0.45) continue
      const off = side * (width / 2 - 1.5 + Math.random() * 3)
      cg.lineWidth = 2 + Math.random() * 3.5
      cg.beginPath()
      cg.moveTo(x0 + nx * off, y0 + ny * off)
      cg.lineTo(x1 + nx * off, y1 + ny * off)
      cg.stroke()
    }
    // Dust shaken loose beside the line.
    cg.fillStyle = CHALK[color]
    const specks = 2 + Math.floor(len / 5)
    for (let i = 0; i < specks; i++) {
      const t = Math.random()
      const off = (width / 2 + Math.random() * Math.random() * 16) * (Math.random() < 0.5 ? -1 : 1)
      cg.globalAlpha = 0.25 + Math.random() * 0.5
      const s = 0.8 + Math.random() * 1.3
      cg.fillRect(lerp(x0, x1, t) + nx * off, lerp(y0, y1, t) + ny * off, s, s)
    }
    const pad = width / 2 + 18
    const bx0 = Math.floor((Math.min(x0, x1) - pad) * S)
    const by0 = Math.floor((Math.min(y0, y1) - pad) * S)
    const bx1 = Math.ceil((Math.max(x0, x1) + pad) * S)
    const by1 = Math.ceil((Math.max(y0, y1) + pad) * S)
    cg.setTransform(1, 0, 0, 1, 0, 0)
    cg.globalAlpha = 1
    cg.globalCompositeOperation = 'destination-out'
    cg.fillStyle = heavy ? heavyPat : pitPat
    cg.fillRect(bx0, by0, bx1 - bx0, by1 - by0)
    cg.globalCompositeOperation = 'source-over'
    soil(bx0, by0, bx1, by1)
    noteInk((x0 + x1) / 2, (y0 + y1) / 2, pad + len / 2)
  }

  const rubAt = (x: number, y: number): boolean => {
    cg.setTransform(S, 0, 0, S, 0, 0)
    cg.globalAlpha = 1
    cg.globalCompositeOperation = 'destination-out'
    cg.drawImage(dab, x - 40, y - 40, 80, 80)
    cg.globalCompositeOperation = 'source-over'
    soilAt(x - 41, y - 41, x + 41, y + 41)
    return town.erase(x, y, 25)
  }

  const wipeChalk = (): void => {
    cg.setTransform(1, 0, 0, 1, 0, 0)
    cg.clearRect(0, 0, W * S, H * S)
    sg.globalAlpha = 1
    sg.drawImage(ground.canvas, 0, 0)
    dirty.length = 0
    inked.x0 = W
    inked.y0 = H
    inked.x1 = 0
    inked.y1 = 0
    inked.any = false
  }

  // ---- Things -------------------------------------------------------------

  const length = [...FULL]
  let tool = 0
  let lastTouch = 0
  let lastScrape = -1
  let lastTick = -1
  let placeCount = 0
  let rebuildIn = 0
  let wantRebuild = false
  let lastEnd: { stroke: Stroke; x: number; y: number; at: number } | null = null
  const acts = new Map<number, Act>()
  const toolBump = spring(0, 200, 9)
  const ragScrunch = spring(0, 160, 10)

  const makeToy = (kind: Toy['kind'], variant: number, sx: number, sy: number, sa: number, speed: number): Toy => ({
    kind,
    variant,
    x: sx,
    y: sy,
    a: sa,
    face: sa === 0 ? 1 : -1,
    slotX: sx,
    slotY: sy,
    slotA: sa,
    inBox: true,
    held: false,
    mode: 'box',
    rider: newRider(),
    ox: 0,
    oy: 0,
    timer: 0,
    v: 0,
    speed,
    wait: 0,
    a0: 0,
    reach: 46,
    tx: sx,
    ty: sy,
    moving: false,
    hop: 0,
    hopH: 0,
    lift: 0,
    bump: spring(0, 220, 9),
    homeX: 0,
    homeY: 0,
    hasHome: false,
    away: false,
    stay: 0,
    visitAfter: 10,
    path: [],
    pathI: 0,
    goal: 'sit',
    legs: 0,
    wet: 0,
    step: 0,
    splash: 0,
    fx0: 0,
    fy0: 0,
    fx1: 0,
    fy1: 0,
    ft: 0,
    roll: 0,
    seg: -1,
  })
  const bx = BOX.x + BOX.w / 2
  const toys: Toy[] = [
    makeToy('car', 0, bx, BOX.y + 46, 0, 96),
    makeToy('car', 1, bx, BOX.y + 106, Math.PI, 84),
    makeToy('car', 2, bx, BOX.y + 166, 0, 74),
    makeToy('person', 0, BOX.x + 40, BOX.y + 268, 0, 46),
    makeToy('person', 1, bx, BOX.y + 276, Math.PI, 42),
    makeToy('person', 2, BOX.x + BOX.w - 40, BOX.y + 268, 0, 50),
    makeToy('dog', 0, bx - 6, BOX.y + 352, 0, 86),
  ]

  // ---- Weather --------------------------------------------------------------

  const cloud = { x: 500, target: null as number | null, held: false }
  let weather: 'sun' | 'rain' | 'drying' = 'sun'
  let coverT = 0
  let rain = 0
  let rainT = 0
  let sunAmt = 1
  let wetAll = 0
  let dry = 0
  let lid = 0
  let lidShut = false
  // Seconds left of a peek under the lid.
  let peekT = 0
  let gust = 0
  let erodeAcc = 0
  let dropAcc = 0
  let rippleAcc = 0
  let rainSound = 0
  let emptyFor = 0
  let fades = 0
  let fadeAt = 0
  const spots: { x: number; y: number; r: number }[] = []
  const ripples: { x: number; y: number; t: number }[] = []
  const pondRings: { x: number; y: number; t: number }[] = []
  const runs: { x: number; y: number; px: number; py: number; color: number; life: number; crack: number; w: number; vy: number; ph: number }[] = []
  const gutter: { x: number; color: number; life: number; y: number }[] = []
  const streaks: { x: number; ph: number; len: number }[] = []
  for (let i = 0; i < 44; i++) streaks.push({ x: Math.random() * (W + 200), ph: Math.random(), len: 16 + Math.random() * 22 })

  // The wet pavement as many overlapping patches. Drying shrinks each one, the
  // ones near the edges first, so the dry creeps in towards the middle.
  const puddles: { x: number; y: number; r: number; q: number; rot: number; at: number }[] = []
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 13; gx++) {
      const x = ((gx + 0.5 + rnd(-0.3, 0.3)) * W) / 13
      const y = PAVE_TOP + ((gy + 0.5 + rnd(-0.3, 0.3)) * (H - PAVE_TOP)) / 8
      const mid = 1 - Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - (PAVE_TOP + H) / 2) / ((H - PAVE_TOP) / 2))
      puddles.push({ x, y, r: rnd(96, 132), q: rnd(0.62, 1), rot: rnd(0, 3), at: 0.24 + 0.68 * clamp(mid, 0, 1) ** 0.8 + rnd(-0.07, 0.07) })
    }
  }

  // Shallow pools in the low places: they show a little sky while it rains and
  // are the last thing to dry.
  const pools: number[][] = []
  for (const [px, py, prx, pry] of [[560, 516, 150, 52], [318, 322, 104, 40], [846, 664, 118, 40], [770, 214, 92, 32], [250, 690, 80, 30]]) {
    const outline: number[] = []
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU
      const k = rnd(0.72, 1.12)
      outline.push(px + Math.cos(a) * prx * k, py + Math.sin(a) * pry * k)
    }
    pools.push(outline)
  }

  // The tree's shade: two sheets of leaf shadows that slide over each other.
  const SHADE = { x: 120, y: PAVE_TOP, w: 560, h: 330 }
  const shade: HTMLCanvasElement[] = []
  for (let k = 0; k < 2; k++) {
    const c = document.createElement('canvas')
    c.width = SHADE.w * S
    c.height = SHADE.h * S
    const lg = c.getContext('2d')!
    lg.scale(S, S)
    lg.fillStyle = '#05070c'
    for (let i = 0; i < 120; i++) {
      // Thick near the trunk, thinning out across the pavement.
      const t = Math.random()
      const depth = Math.random() ** 1.7
      const x = 60 + t * 440 + rnd(-30, 30)
      const y = 14 + depth * (270 - Math.abs(t - 0.4) * 240)
      lg.beginPath()
      lg.ellipse(x, y, rnd(9, 22) * (1 - depth * 0.3), rnd(5, 11) * (1 - depth * 0.3), rnd(0, 3), 0, TAU)
      lg.fill()
    }
    shade.push(c)
  }

  // ---- Sound: the scrape of chalk, wood on tar, rain ------------------------

  const scrape = (push: number): void => {
    if (stage.time - lastScrape < 0.045) return
    lastScrape = stage.time
    sfx.noise({ dur: 0.07, vol: 0.03 + 0.035 * push, freq: rnd(1900, 3400), filter: 'bandpass', q: 0.7 })
    if (Math.random() < 0.3) sfx.noise({ dur: 0.05, vol: 0.025, freq: rnd(500, 800), filter: 'lowpass' })
  }
  const tok = (vol = 0.1, pitch = 1): void => {
    sfx.tone({ freq: 330 * pitch * rnd(0.94, 1.06), to: 190 * pitch, dur: 0.07, type: 'sine', vol })
    sfx.noise({ dur: 0.035, vol: vol * 0.5, freq: 900, filter: 'lowpass' })
  }
  const clink = (): void => {
    sfx.tone({ freq: rnd(1900, 2300), to: 1400, dur: 0.045, type: 'triangle', vol: 0.06 })
    sfx.tone({ freq: rnd(1500, 1800), to: 1100, dur: 0.05, type: 'triangle', vol: 0.045, delay: 0.05 })
  }
  const cardboard = (vol = 0.07): void => {
    sfx.noise({ dur: 0.12, vol, freq: 420, to: 260, filter: 'bandpass', q: 0.9 })
    sfx.tone({ freq: 150, to: 90, dur: 0.09, type: 'sine', vol: vol * 0.9 })
  }
  const dust = (x: number, y: number, color: string, count = 3, speed = 46): void => {
    fx.burst(x, y, { count, color, speed, life: 0.55, size: 3, gravity: -8, drag: 0.9 })
  }

  // ---- Toys on the pavement ---------------------------------------------------

  const out = (t: Toy): boolean => !t.inBox && !t.held && t.mode !== 'fly' && t.mode !== 'home'
  const lineClear = (place: Region, x0: number, y0: number, x1: number, y1: number): boolean => {
    const d = Math.hypot(x1 - x0, y1 - y0)
    const n = Math.max(1, Math.ceil(d / 7))
    for (let i = 1; i <= n; i++) {
      if (!town.inPlace(place, lerp(x0, x1, i / n), lerp(y0, y1, i / n))) return false
    }
    return true
  }
  const stepTo = (t: Toy, x: number, y: number, speed: number, dt: number): boolean => {
    const dx = x - t.x
    const dy = y - t.y
    const d = Math.hypot(dx, dy)
    const s = speed * dt
    if (Math.abs(dx) > 1.5) t.face = dx > 0 ? 1 : -1
    if (d <= s) {
      t.x = x
      t.y = y
      return true
    }
    t.x += (dx / d) * s
    t.y += (dy / d) * s
    t.hop += (s / 17) * Math.PI
    return false
  }

  // A person set down: at home if inside a shape, out for a walk if on a
  // line, otherwise just standing where they were put.
  const settle = (t: Toy): void => {
    t.moving = false
    const place = town.placeAt(t.x, t.y)
    if (place) {
      t.homeX = t.x
      t.homeY = t.y
      t.hasHome = true
      t.away = false
      t.mode = 'potter'
      t.timer = rnd(0.6, 1.4)
      t.stay = 0
      t.visitAfter = rnd(7, 12)
      return
    }
    t.hasHome = false
    const p = town.nearest(t.x, t.y, 44)
    if (p && town.mount(t.rider, p, t.face, 0)) {
      t.ox = t.x - t.rider.x
      t.oy = t.y - t.rider.y
      t.mode = 'stroll'
      t.timer = 0
      return
    }
    t.mode = 'stand'
    t.timer = 0.6
  }

  const land = (t: Toy): void => {
    t.inBox = false
    t.x = clamp(t.x, FIELD.x0 + 24, FIELD.x1 - 24)
    t.y = clamp(t.y, FIELD.y0 + (t.kind === 'car' ? 16 : 40), FIELD.y1 - 8)
    t.bump.value = 0.22
    tok(0.1, t.kind === 'car' ? 0.8 : 1.15)
    dust(t.x, t.y, '#b9b2a6', 3, 40)
    if (weather === 'rain' || (weather === 'drying' && dry < 0.5)) {
      // Set down in the rain: it takes itself back under the lid.
      t.mode = 'home'
      return
    }
    if (t.kind === 'car') {
      t.mode = 'park'
      t.timer = 0
      t.reach = 58
      t.v = 0
    } else if (t.kind === 'person') settle(t)
    else {
      t.mode = 'sit'
      t.timer = 0.8
      t.legs = 0
    }
  }

  // Where a toy tapped in the box takes itself: a car to a road, a person to a
  // house, the dog to water, or just out onto the pavement.
  const goodSpot = (t: Toy): [number, number] => {
    if (t.kind === 'car') {
      let best: [number, number] | null = null
      let bestD = -1
      for (let i = 0; i < 14 && town.strokes.length > 0; i++) {
        const s = town.strokes[Math.floor(Math.random() * town.strokes.length)]
        if (s.pts.length < 8) continue
        const p = s.pts[Math.floor(Math.random() * s.pts.length)]
        if (!p.alive) continue
        let d = 400
        for (const o of toys) if (o !== t && o.kind === 'car' && !o.inBox) d = Math.min(d, Math.hypot(o.x - p.x, o.y - p.y))
        if (d > bestD) {
          bestD = d
          best = [p.x, p.y]
        }
      }
      if (best) return best
    } else if (t.kind === 'person') {
      const dryPlaces = town.places.filter((p) => !p.water)
      const list = dryPlaces.length > 0 ? dryPlaces : town.places
      if (list.length > 0) {
        let pick = list[0]
        let fewest = Infinity
        for (const place of list) {
          let n = Math.random() * 0.5
          for (const o of toys) if (o.kind === 'person' && !o.inBox && town.inPlace(place, o.x, o.y)) n++
          if (n < fewest) {
            fewest = n
            pick = place
          }
        }
        const [x, y] = town.cellCentre(pick.cells[Math.floor(Math.random() * pick.cells.length)])
        return [lerp(x, pick.cx, 0.5), lerp(y, pick.cy, 0.5)]
      }
    } else if (town.ponds.length > 0) {
      const pond = town.ponds[Math.floor(Math.random() * town.ponds.length)]
      return [pond.cx, pond.cy]
    }
    for (let i = 0; i < 10; i++) {
      const x = rnd(800, 950)
      const y = rnd(220, 640)
      if (toys.every((o) => o === t || o.inBox || Math.hypot(o.x - x, o.y - y) > 70)) return [x, y]
    }
    return [rnd(800, 950), rnd(220, 640)]
  }

  const flyTo = (t: Toy, x: number, y: number): void => {
    t.mode = 'fly'
    t.inBox = false
    t.fx0 = t.x
    t.fy0 = t.y
    t.fx1 = x
    t.fy1 = y
    t.ft = 0
    sfx.noise({ dur: 0.18, vol: 0.03, freq: 700, to: 1500, filter: 'bandpass', q: 0.8 })
  }

  const updateCar = (t: Toy, dt: number): void => {
    if (t.mode === 'park') {
      t.timer -= dt
      if (t.timer > 0) return
      t.timer = 0.35
      const p = town.nearest(t.x, t.y, t.reach)
      t.reach = 44
      if (p && town.mount(t.rider, p, Math.cos(t.a), Math.sin(t.a))) {
        t.ox = t.x - t.rider.x
        t.oy = t.y - t.rider.y
        t.mode = 'drive'
        t.wait = 0
      }
      return
    }
    if (t.mode === 'drive') {
      const hx = Math.cos(t.a)
      const hy = Math.sin(t.a)
      let blocked = false
      for (const o of toys) {
        if (o === t || o.kind !== 'car' || o.inBox || o.held) continue
        const dx = o.x - t.x
        const dy = o.y - t.y
        const d = Math.hypot(dx, dy)
        if (d < 86 && d > 1 && (dx * hx + dy * hy) / d > 0.6) blocked = true
      }
      const st = t.rider.st
      let roadAhead = 0
      if (st) {
        for (let k = 1; k <= 4; k++) {
          const q = st.pts[t.rider.idx + t.rider.dir * k]
          if (!q || !q.alive) break
          roadAhead++
        }
      }
      if (blocked) {
        t.wait += dt
        t.v = damp(t.v, 0, 12, dt)
        if (t.wait > 0.9) {
          t.mode = 'turn'
          t.timer = 1
          t.a0 = t.a
        }
      } else {
        t.wait = 0
        t.v = damp(t.v, t.speed * (roadAhead >= 4 ? 1 : 0.42 + 0.14 * roadAhead), 4, dt)
      }
      const res = town.ride(t.rider, t.v * dt, Math.random)
      if (res === 'lost') {
        t.mode = 'park'
        t.timer = 0.5
        return
      }
      t.ox = damp(t.ox, 0, 5, dt)
      t.oy = damp(t.oy, 0, 5, dt)
      t.x = t.rider.x + t.ox
      t.y = t.rider.y + t.oy
      t.a = turnTo(t.a, Math.atan2(t.rider.ay, t.rider.ax), 7, dt)
      t.roll += t.v * dt
      if (t.roll > 46) {
        t.roll = 0
        if (stage.time - lastTick > 0.18) {
          lastTick = stage.time
          sfx.noise({ dur: 0.03, vol: 0.022, freq: rnd(700, 1100), filter: 'bandpass', q: 2 })
        }
      }
      if (res === 'end') {
        t.mode = 'wait'
        t.timer = 0.8
        t.v = 0
        t.bump.value = 0.1
      }
      return
    }
    if (t.mode === 'wait') {
      t.timer -= dt
      const res = town.ride(t.rider, 0, Math.random)
      if (res === 'lost') {
        t.mode = 'park'
        t.timer = 0.5
      } else if (res === 'ok' && t.rider.st && t.rider.st.pts[t.rider.idx + t.rider.dir]?.alive) {
        t.mode = 'drive'
      } else if (t.timer <= 0) {
        t.mode = 'turn'
        t.timer = 1
        t.a0 = t.a
        sfx.noise({ dur: 0.25, vol: 0.02, freq: 500, to: 900, filter: 'bandpass', q: 1.5 })
      }
      return
    }
    if (t.mode === 'turn') {
      t.timer -= dt / 1.1
      t.a = t.a0 + Math.PI * ease.inOutCubic(clamp(1 - t.timer, 0, 1))
      if (t.timer <= 0) {
        t.rider.dir = t.rider.dir === 1 ? -1 : 1
        t.rider.cool = 30
        t.wait = 0
        const res = town.ride(t.rider, 0.01, Math.random)
        if (res === 'ok') t.mode = 'drive'
        else {
          t.mode = 'park'
          t.timer = 2
        }
      }
    }
  }

  const updatePerson = (t: Toy, dt: number): void => {
    if (t.mode === 'stand') {
      t.timer -= dt
      if (t.timer <= 0) {
        t.timer = rnd(0.5, 0.9)
        if (town.placeAt(t.x, t.y) || town.nearest(t.x, t.y, 40)) settle(t)
        else if (Math.random() < 0.18) t.face = -t.face
      }
      return
    }
    if (t.mode === 'stroll') {
      if (t.timer > 0) {
        t.timer -= dt
        if (t.timer <= 0) t.rider.dir = t.rider.dir === 1 ? -1 : 1
        return
      }
      // On a zigzag they hop from corner to corner: a crouch at each corner,
      // quick through the air, and a tap of wood on tar when they land.
      const st = t.rider.st
      let arc = -1
      if (st && st.zig && st.corners.length > 1) {
        const pos = t.rider.idx + t.rider.dir * t.rider.t
        let lo = st.corners[0]
        let hi = st.corners[st.corners.length - 1]
        for (const c of st.corners) {
          if (c <= pos) lo = c
          else {
            hi = c
            break
          }
        }
        arc = hi > lo ? Math.sin(clamp((pos - lo) / (hi - lo), 0, 1) * Math.PI) : 0
        if (t.seg !== lo) {
          if (t.seg !== -1) {
            tok(0.05, 1.5)
            dust(t.x, t.y, CHALK[st.color], 3, 36)
            t.bump.value = -0.12
          }
          t.seg = lo
        }
      } else t.seg = -1
      const pace = arc >= 0 ? t.speed * (0.45 + 2.3 * arc) : t.speed
      const res = town.ride(t.rider, pace * dt, Math.random)
      if (res === 'lost') {
        settle(t)
        return
      }
      t.ox = damp(t.ox, 0, 4, dt)
      t.oy = damp(t.oy, 0, 4, dt)
      t.x = t.rider.x + t.ox
      t.y = t.rider.y + t.oy
      if (Math.abs(t.rider.ax) > 0.3) t.face = t.rider.ax > 0 ? 1 : -1
      if (arc >= 0) t.hopH = arc * 26
      else {
        t.hop += ((pace * dt) / 17) * Math.PI
        t.hopH = Math.abs(Math.sin(t.hop)) * 4
      }
      if (res === 'end') t.timer = 1.2
      return
    }
    if (t.mode === 'walk') {
      const at = t.path[t.pathI]
      if (!at) {
        t.mode = 'potter'
        t.timer = 1
        t.stay = 0
        t.visitAfter = rnd(9, 15)
        t.moving = false
        const home = t.hasHome ? town.placeAt(t.homeX, t.homeY) : null
        const here = town.placeAt(t.x, t.y)
        t.away = !!home && !!here && home.id !== here.id
        if (!home && here) {
          t.homeX = t.x
          t.homeY = t.y
          t.hasHome = true
        }
        return
      }
      const before = Math.floor(t.hop / Math.PI)
      if (stepTo(t, at.x, at.y, t.speed, dt)) t.pathI++
      t.hopH = Math.abs(Math.sin(t.hop)) * (at.zig ? 15 : 4)
      if (at.zig && Math.floor(t.hop / Math.PI) !== before) tok(0.035, 1.6)
      return
    }
    // Pottering about at home, or in the place being visited.
    const place = town.placeAt(t.x, t.y)
    if (!place) {
      // The walls moved: go back to where home was if it is still a place.
      const home = t.hasHome ? town.placeAt(t.homeX, t.homeY) : null
      if (home && Math.hypot(t.homeX - t.x, t.homeY - t.y) < 90) {
        stepTo(t, t.homeX, t.homeY, 30, dt)
        t.hopH = Math.abs(Math.sin(t.hop)) * 3
      } else settle(t)
      return
    }
    if (t.moving) {
      if (stepTo(t, t.tx, t.ty, 28, dt)) {
        t.moving = false
        t.timer = rnd(1.2, 3.6)
      }
      t.hopH = Math.abs(Math.sin(t.hop)) * 3
      return
    }
    t.timer -= dt
    t.stay += dt
    if (t.timer > 0) return
    if (t.stay > t.visitAfter) {
      t.stay = 0
      t.visitAfter = rnd(8, 14)
      const home = t.hasHome ? town.placeAt(t.homeX, t.homeY) : null
      const goingHome = t.away && home !== null && home.id !== place.id
      const found = town.route(place, (r) => (goingHome ? r.id === home!.id : r.id !== place.id), Math.random)
      if (found) {
        t.path = []
        for (let i = 0; i < found.path.length; i++) {
          if (i % 2 === 0 || i === found.path.length - 1) t.path.push({ x: found.path[i].x, y: found.path[i].y, zig: found.path[i].st.zig })
        }
        const last = found.path[found.path.length - 1]
        let bestD = Infinity
        let bx2 = found.to.cx
        let by2 = found.to.cy
        for (const cell of found.to.cells) {
          const [cx, cy] = town.cellCentre(cell)
          const d = (cx - last.x) ** 2 + (cy - last.y) ** 2 + Math.random() * 600
          if (d < bestD) {
            bestD = d
            bx2 = cx
            by2 = cy
          }
        }
        t.path.push({ x: bx2, y: by2, zig: false }, { x: lerp(bx2, found.to.cx, 0.35), y: lerp(by2, found.to.cy, 0.35), zig: false })
        t.pathI = 0
        t.mode = 'walk'
        return
      }
    }
    for (let i = 0; i < 8; i++) {
      const [cx, cy] = town.cellCentre(place.cells[Math.floor(Math.random() * place.cells.length)])
      const d = Math.hypot(cx - t.x, cy - t.y)
      if (d < 12 || d > 150 || !lineClear(place, t.x, t.y, cx, cy)) continue
      if (toys.some((o) => o !== t && o.kind !== 'car' && !o.inBox && Math.hypot(o.x - cx, o.y - cy) < 30)) continue
      t.tx = cx
      t.ty = cy
      t.moving = true
      return
    }
    t.timer = 1
  }

  const updateDog = (t: Toy, dt: number): void => {
    if (t.mode === 'sit') {
      t.timer -= dt
      if (t.timer > 0) return
      if (town.ponds.length > 0 && t.legs <= 0) {
        const pond = town.ponds[Math.floor(Math.random() * town.ponds.length)]
        const [x, y] = town.cellCentre(pond.cells[Math.floor(Math.random() * pond.cells.length)])
        t.tx = lerp(x, pond.cx, 0.5)
        t.ty = lerp(y, pond.cy, 0.5) + 6
        t.goal = 'pond'
      } else {
        t.legs--
        const friends = toys.filter((o) => o.kind === 'person' && out(o))
        if (friends.length > 0 && Math.random() < 0.55) {
          const f = friends[Math.floor(Math.random() * friends.length)]
          t.tx = f.x + (Math.random() < 0.5 ? -44 : 44)
          t.ty = f.y + 6
        } else {
          t.tx = t.x + rnd(-220, 220)
          t.ty = t.y + rnd(-160, 160)
        }
        t.goal = 'sit'
      }
      t.tx = clamp(t.tx, FIELD.x0 + 30, FIELD.x1 - 30)
      t.ty = clamp(t.ty, FIELD.y0 + 40, FIELD.y1 - 10)
      t.mode = 'trot'
      return
    }
    if (t.mode === 'trot') {
      t.step += dt * 13
      if (stepTo(t, t.tx, t.ty, t.speed, dt)) {
        if (t.goal === 'pond' && town.pondAt(t.x, t.y - 6)) {
          t.mode = 'paddle'
          t.timer = rnd(10, 15)
          t.moving = false
          t.splash = 0
        } else {
          t.mode = 'sit'
          t.timer = rnd(2.5, 5)
        }
      }
      return
    }
    // Paddling.
    const pond = town.pondAt(t.x, t.y - 6)
    if (!pond) {
      t.mode = 'sit'
      t.timer = 0.6
      return
    }
    t.timer -= dt
    t.splash -= dt
    t.step += dt * 7
    if (t.splash <= 0) {
      t.splash = rnd(0.7, 1.3)
      pondRings.push({ x: t.x + t.face * 10, y: t.y - 4, t: 0 })
      sfx.tone({ freq: rnd(480, 620), to: 900, dur: 0.07, type: 'sine', vol: 0.045 })
      fx.burst(t.x + t.face * 16, t.y - 10, { count: 3, color: ['#cfe4f6', CHALK[BLUE]], speed: 70, life: 0.35, size: 3, gravity: 240, angle: -Math.PI / 2, spread: 1.4 })
    }
    if (t.moving) {
      if (stepTo(t, t.tx, t.ty, 26, dt)) {
        t.moving = false
        t.wait = rnd(0.5, 1.5)
      }
    } else {
      t.wait -= dt
      if (t.wait <= 0) {
        const [x, y] = town.cellCentre(pond.cells[Math.floor(Math.random() * pond.cells.length)])
        t.tx = lerp(x, pond.cx, 0.4)
        t.ty = lerp(y, pond.cy, 0.4) + 6
        t.moving = true
      }
    }
    if (t.timer <= 0) {
      t.legs = 2
      t.mode = 'sit'
      t.timer = 0.2
    }
  }

  const updateToy = (t: Toy, dt: number): void => {
    t.bump.update(dt)
    t.lift = damp(t.lift, t.held ? 1 : 0, 14, dt)
    if (t.kind === 'dog') t.wet = damp(t.wet, t.mode === 'paddle' ? 1 : 0, 6, dt)
    if (t.held) return
    if (t.mode === 'box') {
      t.x = damp(t.x, t.slotX, 12, dt)
      t.y = damp(t.y, t.slotY, 12, dt)
      t.a = turnTo(t.a, t.slotA, 10, dt)
      t.hopH = 0
      return
    }
    if (t.mode === 'fly') {
      t.ft = Math.min(1, t.ft + dt / 0.55)
      const e = ease.inOutQuad(t.ft)
      t.x = lerp(t.fx0, t.fx1, e)
      t.y = lerp(t.fy0, t.fy1, e)
      t.hopH = Math.sin(t.ft * Math.PI) * 70
      if (t.ft >= 1) {
        t.hopH = 0
        land(t)
      }
      return
    }
    if (t.mode === 'home') {
      const speed = t.kind === 'car' ? 210 : t.kind === 'dog' ? 170 : 130
      if (t.kind === 'car') t.a = turnTo(t.a, Math.atan2(t.slotY - t.y, t.slotX - t.x), 8, dt)
      else t.hopH = Math.abs(Math.sin(t.hop)) * 5
      t.step += dt * 14
      if (stepTo(t, t.slotX, t.slotY, speed, dt)) {
        t.inBox = true
        t.mode = 'box'
        t.hopH = 0
        tok(0.05, 0.9)
      }
      return
    }
    if (t.kind === 'car') updateCar(t, dt)
    else if (t.kind === 'person') {
      updatePerson(t, dt)
      if (t.mode === 'stand' || (t.mode === 'potter' && !t.moving) || (t.mode === 'stroll' && t.timer > 0)) t.hopH = damp(t.hopH, 0, 12, dt)
    } else updateDog(t, dt)
  }

  // ---- The rain ---------------------------------------------------------------

  const startRain = (): void => {
    weather = 'rain'
    rainT = 0
    dry = 0
    emptyFor = 0
    fades = 0
    for (const t of toys) if (!t.inBox && !t.held && t.mode !== 'fly') t.mode = 'home'
  }

  const newDay = (): void => {
    weather = 'sun'
    wetAll = 0
    dry = 0
    spots.length = 0
    if (!inked.any) for (let i = 0; i < length.length; i++) length[i] = FULL[i]
  }

  const updateWeather = (dt: number): void => {
    if (!cloud.held && cloud.target !== null) {
      cloud.x = damp(cloud.x, cloud.target, 5, dt)
      if (Math.abs(cloud.x - cloud.target) < 0.5) cloud.target = null
    }
    const gap = Math.abs(cloud.x - SUN.x)
    const covered = gap < 64
    sunAmt = damp(sunAmt, clamp((gap - 40) / 90, 0, 1), 3, dt)
    gust = damp(gust, 0, 1.2, dt)
    coverT = covered ? coverT + dt : 0

    if (weather === 'sun') {
      if (coverT > 0.7) startRain()
    } else if (weather === 'rain') {
      rain = Math.min(1, rain + dt / 5)
      rainT += dt
      if (rainT > 2.2) wetAll = Math.min(1, wetAll + dt / 3.2)
      if (wetAll < 1) {
        // The first fat drops, each one a dark coin on the dry tar.
        dropAcc += dt * lerp(5, 70, rain)
        while (dropAcc >= 1) {
          dropAcc--
          const x = Math.random() * W
          const y = PAVE_TOP + Math.random() * (H - PAVE_TOP)
          if (spots.length < 260) spots.push({ x, y, r: rnd(5, 13) })
          if (spots.length < 40 || Math.random() < 0.12) {
            sfx.tone({ freq: rnd(700, 1400), to: 320, dur: 0.05, type: 'sine', vol: 0.035 })
            fx.burst(x, y, { count: 3, color: '#c7d2da', speed: 60, life: 0.25, size: 2.5, gravity: 200, angle: -Math.PI / 2, spread: 2 })
          }
        }
      }
      if (!covered) {
        weather = 'drying'
        dry = 0
      }
    } else {
      rain = Math.max(0, rain - dt / 1.6)
      if (rain <= 0) dry = Math.min(1, dry + (dt / 9) * (0.35 + 0.65 * sunAmt))
      if (coverT > 0.7) {
        weather = 'rain'
        wetAll = dry > 0.4 ? 0.2 : 1
        rainT = dry > 0.4 ? 0 : 3
        spots.length = 0
        for (const t of toys) if (!t.inBox && !t.held && t.mode !== 'fly') t.mode = 'home'
      } else if (dry >= 1) newDay()
    }

    // The lid goes on once every toy is in, and comes off as the tar dries.
    const allIn = toys.every((t) => t.inBox || t.held)
    const wantShut = (weather === 'rain' || (weather === 'drying' && dry < 0.5)) && allIn
    if (wantShut !== lidShut) {
      lidShut = wantShut
      cardboard(0.06)
    }
    lid = damp(lid, lidShut ? 1 : 0, lidShut ? 7 : 4, dt)
    peekT = Math.max(0, peekT - dt)

    if (rain > 0.02) {
      rainSound -= dt
      if (rainSound <= 0) {
        rainSound = 0.24
        sfx.noise({ dur: 0.55, vol: 0.012 + 0.026 * rain, freq: rnd(3200, 5200), filter: 'highpass', q: 0.5 })
        if (Math.random() < 0.5) sfx.noise({ dur: 0.4, vol: 0.02 * rain, freq: rnd(500, 900), filter: 'bandpass', q: 0.6 })
      }
      rippleAcc += dt * 34 * rain
      while (rippleAcc >= 1) {
        rippleAcc--
        if (ripples.length < 30) ripples.push({ x: Math.random() * W, y: PAVE_TOP + Math.random() * (H - PAVE_TOP), t: 0 })
      }
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].t += dt / 0.55
      if (ripples[i].t >= 1) ripples.splice(i, 1)
    }

    // Washing. Drops bite pieces out of the chalk; some of it runs.
    if (rain > 0.25 && inked.any) {
      const strength = rain * dt
      for (const s of town.strokes) {
        s.ink -= strength / WASH
        if (s.ink <= 0) {
          town.kill(s)
          wantRebuild = true
        }
      }
      const x0 = Math.max(FIELD.x0 - 20, inked.x0)
      const y0 = Math.max(PAVE_TOP, inked.y0)
      const x1 = Math.min(FIELD.x1 + 20, inked.x1)
      const y1 = Math.min(H, inked.y1)
      const area = Math.max(0, x1 - x0) * Math.max(0, y1 - y0)
      erodeAcc += (area / 1900) * strength
      cg.setTransform(S, 0, 0, S, 0, 0)
      cg.globalCompositeOperation = 'destination-out'
      cg.globalAlpha = 1
      cg.fillStyle = 'rgba(0,0,0,0.5)'
      let guard = 0
      while (erodeAcc >= 1 && guard++ < 40) {
        erodeAcc--
        const x = lerp(x0, x1, Math.random())
        const y = lerp(y0, y1, Math.random())
        const rx = rnd(7, 14)
        const ry = rnd(13, 27)
        cg.beginPath()
        cg.ellipse(x, y, rx, ry, rnd(-0.15, 0.15), 0, TAU)
        cg.fill()
        soilAt(x - rx - 3, y - ry - 2, x + rx + 3, y + ry + 2)
        if (runs.length < 44 && Math.random() < 0.6) {
          const p = town.nearest(x, y, 18)
          if (p) runs.push({ x: p.x, y: p.y, px: p.x, py: p.y, color: p.st.color, life: rnd(2.4, 4.6), crack: -1, w: rnd(2.5, 5), vy: rnd(40, 78), ph: rnd(0, 6) })
        }
      }
      cg.globalCompositeOperation = 'source-over'
    }

    // Nothing left that is a line: let the last specks go, and the pavement
    // is clean. This carries on through the drying if the rain stopped first.
    if (weather !== 'sun' && inked.any && town.strokes.every((s) => s.ink <= 0)) {
      emptyFor += dt
      if (emptyFor > 1.6 && stage.time - fadeAt > 0.12) {
        fadeAt = stage.time
        fades++
        cg.setTransform(1, 0, 0, 1, 0, 0)
        cg.globalCompositeOperation = 'destination-out'
        cg.fillStyle = 'rgba(0,0,0,0.3)'
        cg.fillRect(0, 0, W * S, H * S)
        cg.globalCompositeOperation = 'source-over'
        soil(0, PAVE_TOP * S, W * S, H * S)
        if (fades >= 9) {
          wipeChalk()
          town.clear()
          runs.length = 0
          fades = 0
          emptyFor = 0
        }
      }
    } else {
      emptyFor = 0
      fades = 0
    }

    // Colour on the move: straight down the fall of the pavement, or caught by
    // a crack and carried along it, into the gutter and along to the drain.
    for (let i = runs.length - 1; i >= 0; i--) {
      const r = runs[i]
      r.life -= dt
      if (r.crack >= 0) {
        const c = CRACKS.pts[r.crack]
        const dx = c.x - r.x
        const dy = c.y - r.y
        const d = Math.hypot(dx, dy)
        const s = 86 * dt
        if (d <= s) {
          r.x = c.x
          r.y = c.y
          r.crack = c.next
          r.life = Math.max(r.life, 0.8)
          if (c.next === -1) r.life = -1
        } else {
          r.x += (dx / d) * s
          r.y += (dy / d) * s
        }
      } else {
        r.ph += dt * 3
        r.y += r.vy * dt
        r.x += Math.sin(r.ph) * 14 * dt
        if (((i + Math.floor(stage.time * 60)) & 3) === 0) {
          for (let k = 0; k < CRACKS.pts.length; k += 2) {
            const c = CRACKS.pts[k]
            if (Math.abs(c.x - r.x) < 16 && Math.abs(c.y - r.y) < 16 && c.next !== -1) {
              r.crack = k
              break
            }
          }
        }
      }
      const moved = Math.hypot(r.x - r.px, r.y - r.py)
      if (moved >= 4 || r.life <= 0) {
        cg.setTransform(S, 0, 0, S, 0, 0)
        cg.globalAlpha = 0.42 * clamp(r.life + 0.3, 0.2, 1)
        cg.strokeStyle = CHALK[r.color]
        cg.lineWidth = r.crack >= 0 ? 3 : r.w
        cg.lineCap = 'butt'
        cg.beginPath()
        cg.moveTo(r.px, r.py)
        cg.lineTo(r.x, r.y)
        cg.stroke()
        cg.globalAlpha = 1
        soilAt(Math.min(r.px, r.x) - 4, Math.min(r.py, r.y) - 4, Math.max(r.px, r.x) + 4, Math.max(r.py, r.y) + 4)
        noteInk(r.x, r.y, 6)
        r.px = r.x
        r.py = r.y
      }
      if (r.y >= KERB_Y - 2 || r.life <= 0) {
        if (r.y >= KERB_Y - 30 && gutter.length < 26) gutter.push({ x: r.x, color: r.color, life: 0, y: KERB_Y + rnd(31, 43) })
        runs.splice(i, 1)
      }
    }
    for (let i = gutter.length - 1; i >= 0; i--) {
      const b = gutter[i]
      b.life += dt
      b.x += Math.sign(DRAIN.x - b.x) * 120 * dt
      if (Math.abs(b.x - DRAIN.x) < 26) gutter.splice(i, 1)
    }
  }

  // ---- Touch --------------------------------------------------------------------

  const toyAt = (x: number, y: number): Toy | null => {
    let best: Toy | null = null
    let bestD = 38
    for (const t of toys) {
      if (t.inBox || t.held || t.mode === 'fly' || t.mode === 'home') continue
      const cy = t.kind === 'car' ? t.y : t.y - 20
      const d = Math.hypot(t.x - x, cy - y)
      if (d < bestD) {
        bestD = d
        best = t
      }
    }
    return best
  }
  const inBoxRect = (x: number, y: number): boolean => x > BOX.x - 10 && x < BOX.x + BOX.w + 12 && y > BOX.y - 10 && y < BOX.y + BOX.h + 10
  const onField = (x: number, y: number): boolean => x >= FIELD.x0 - 4 && x <= FIELD.x1 + 4 && y >= FIELD.y0 - 8 && y <= FIELD.y1 + 6

  const beginDraw = (p: Pointer, color: number): void => {
    const x = clamp(p.x, FIELD.x0, FIELD.x1)
    const y = clamp(p.y, FIELD.y0, FIELD.y1)
    // A finger that lifted for a moment carries on the same line.
    if (lastEnd && lastEnd.stroke.color === color && stage.time - lastEnd.at < 0.9 && Math.hypot(lastEnd.x - x, lastEnd.y - y) < 70 && lastEnd.stroke.ink > 0.5) {
      const act: Act = { kind: 'draw', stroke: lastEnd.stroke, color, lx: lastEnd.x, ly: lastEnd.y, acc: 0, sound: 0, dust: 0, grown: 0 }
      acts.set(p.id, act)
      extend(act, x, y, 0)
      return
    }
    const stroke = town.begin(color)
    town.add(stroke, x, y)
    mark(x, y, x + 0.5, y + 0.5, color, 18, false)
    acts.set(p.id, { kind: 'draw', stroke, color, lx: x, ly: y, acc: 0, sound: 0, dust: 0, grown: 0 })
    sfx.tone({ freq: 1700, to: 800, dur: 0.03, type: 'triangle', vol: 0.05 })
    scrape(0.6)
    dust(x, y, CHALK[color], 4, 50)
  }

  const extend = (act: Extract<Act, { kind: 'draw' }>, x: number, y: number, speed: number): void => {
    const dx = x - act.lx
    const dy = y - act.ly
    const d = Math.hypot(dx, dy)
    if (d < 1.5) return
    const push = clamp(1 - speed / 2400, 0.2, 1)
    mark(act.lx, act.ly, x, y, act.color, 13 + 6 * push, speed > 1300)
    const ux = dx / d
    const uy = dy / d
    let pos = 0
    while (act.acc + (d - pos) >= STEP) {
      pos += STEP - act.acc
      act.acc = 0
      town.add(act.stroke, act.lx + ux * pos, act.ly + uy * pos)
      act.grown++
    }
    act.acc += d - pos
    act.lx = x
    act.ly = y
    length[act.color] = Math.max(STUB, length[act.color] - d / 120)
    act.sound += d
    if (act.sound > 15) {
      act.sound = 0
      scrape(push)
    }
    act.dust += d
    if (act.dust > 26) {
      act.dust = 0
      dust(x, y, CHALK[act.color], 2, 40)
    }
  }

  const checkPlaces = (): void => {
    town.rebuild()
    wantRebuild = false
    const n = town.places.length + town.ponds.length
    if (n > placeCount) {
      // A shape has closed. No sound for it: only a breath of dust inside.
      const made = town.places[town.places.length - 1] ?? town.ponds[town.ponds.length - 1]
      if (made) dust(made.cx, made.cy, '#e9e4d6', 5, 26)
    }
    placeCount = n
  }

  const selectTool = (next: number): void => {
    tool = next
    toolBump.value = 1
    if (next === RAG_TOOL) {
      ragScrunch.value = 1
      sfx.noise({ dur: 0.12, vol: 0.05, freq: 500, filter: 'lowpass' })
    } else {
      clink()
      dust(SLOT_X + 20, SLOT_Y + next * SLOT_GAP, CHALK[next], 4, 40)
    }
  }

  const slotAt = (y: number): number => {
    if (y > RAG.y - 42) return RAG_TOOL
    return clamp(Math.round((y - SLOT_Y) / SLOT_GAP), 0, 5)
  }

  return {
    update(dt) {
      updateWeather(dt)
      for (const t of toys) updateToy(t, dt)
      toolBump.update(dt)
      ragScrunch.update(dt)
      for (let i = pondRings.length - 1; i >= 0; i--) {
        pondRings[i].t += dt / 0.9
        if (pondRings[i].t >= 1) pondRings.splice(i, 1)
      }
      rebuildIn -= dt
      if (rebuildIn <= 0) {
        rebuildIn = 0.35
        let growing = false
        for (const act of acts.values()) {
          if (act.kind === 'draw' && act.grown > 0) {
            act.grown = 0
            growing = true
          }
        }
        if (growing || wantRebuild) checkPlaces()
      }
    },

    draw(g) {
      flush()
      g.drawImage(scene, 0, 0, W, H)
      const time = stage.time

      // Wet tar: first the separate drops, then all of it, then drying patches.
      if (weather === 'rain' || weather === 'drying') {
        if (weather === 'rain') {
          if (spots.length > 0 && wetAll < 1) {
            g.fillStyle = `rgba(8,11,17,${0.36 * (1 - wetAll)})`
            g.beginPath()
            for (const s of spots) {
              g.moveTo(s.x + s.r, s.y)
              g.arc(s.x, s.y, s.r, 0, TAU)
            }
            g.fill()
          }
          if (wetAll > 0) {
            g.fillStyle = `rgba(8,11,17,${0.38 * wetAll})`
            g.fillRect(0, PAVE_TOP, W, H - PAVE_TOP)
          }
        } else {
          g.save()
          g.beginPath()
          g.rect(0, PAVE_TOP, W, H - PAVE_TOP)
          g.clip()
          // A damp fringe first, then the properly wet middle of each patch.
          for (let pass = 0; pass < 2; pass++) {
            g.fillStyle = pass === 0 ? 'rgba(8,11,17,0.16)' : 'rgba(8,11,17,0.26)'
            g.beginPath()
            for (const p of puddles) {
              let s = clamp((p.at - dry) / 0.2 + (pass === 0 ? 0.16 : 0), 0, 1)
              if (s <= 0) continue
              s = s * s * (3 - 2 * s)
              if (pass === 0) s *= 1.1
              g.moveTo(p.x + p.r * s, p.y)
              g.ellipse(p.x, p.y, p.r * s, p.r * s * p.q, p.rot, 0, TAU)
            }
            g.fill()
          }
          g.restore()
        }
        const pooled = weather === 'rain' ? wetAll : clamp((0.94 - dry) / 0.25, 0, 1)
        if (pooled > 0.02) {
          g.beginPath()
          for (const o of pools) {
            const n = o.length / 2
            for (let i = 0; i <= n; i++) {
              const ax = o[(i % n) * 2]
              const ay = o[(i % n) * 2 + 1]
              const bx3 = o[((i + 1) % n) * 2]
              const by3 = o[((i + 1) % n) * 2 + 1]
              if (i === 0) g.moveTo((ax + bx3) / 2, (ay + by3) / 2)
              else g.quadraticCurveTo(ax, ay, (ax + bx3) / 2, (ay + by3) / 2)
            }
          }
          if (weather === 'drying') {
            // Still wet after the tar around them has dried.
            g.fillStyle = `rgba(8,11,17,${0.26 * pooled})`
            g.fill()
          }
          g.fillStyle = `rgba(150,172,198,${0.11 * pooled})`
          g.fill()
        }
        if (ripples.length > 0) {
          g.lineWidth = 1.5
          g.strokeStyle = 'rgba(205,220,232,0.5)'
          g.beginPath()
          for (const r of ripples) {
            const rad = 3 + r.t * 13
            g.moveTo(r.x + rad, r.y)
            g.ellipse(r.x, r.y, rad, rad * 0.8, 0, 0, TAU)
          }
          g.globalAlpha = 0.55
          g.stroke()
          g.globalAlpha = 1
        }
      }

      // Coloured water in the gutter, on its way to the drain.
      if (rain > 0.05 || gutter.length > 0) {
        g.strokeStyle = `rgba(190,205,218,${0.28 * rain})`
        g.lineWidth = 2
        g.beginPath()
        for (let i = 0; i < 16; i++) {
          const side = i % 2 === 0 ? -1 : 1
          const span = side < 0 ? DRAIN.x - 60 : W - DRAIN.x - 60
          const u = (time * 0.35 + i * 0.137) % 1
          const x = side < 0 ? u * span : W - u * span
          const y = KERB_Y + 30 + ((i * 5) % 16)
          g.moveTo(x, y)
          g.lineTo(x - side * 26, y)
        }
        g.stroke()
        for (const b of gutter) {
          g.globalAlpha = 0.34 * clamp(b.life * 2, 0, 1)
          g.fillStyle = CHALK[b.color]
          g.beginPath()
          g.ellipse(b.x, b.y, 30 + ((b.y * 7) % 22), 3, 0, 0, TAU)
          g.fill()
        }
        g.globalAlpha = 1
      }

      // The tree's shade, shifting.
      if (sunAmt > 0.03) {
        const sway = 3 + gust * 10
        g.globalAlpha = 0.17 * sunAmt
        g.drawImage(shade[0], SHADE.x + Math.sin(time * 0.6) * sway, SHADE.y + Math.cos(time * 0.47) * sway * 0.5, SHADE.w, SHADE.h)
        g.drawImage(shade[1], SHADE.x + Math.sin(time * 0.43 + 2) * sway * 1.4, SHADE.y + Math.cos(time * 0.71 + 1) * sway * 0.6, SHADE.w, SHADE.h)
        g.globalAlpha = 1
      }

      // Weeds in the cracks, stirring.
      g.lineWidth = 2.4
      for (let pass = 0; pass < 2; pass++) {
        g.strokeStyle = pass === 0 ? '#3f5a28' : '#6a8a3c'
        g.beginPath()
        for (let w = 0; w < WEEDS.length; w++) {
          const weed = WEEDS[w]
          if (weed.kind !== 0) continue
          for (let b = pass; b < 7; b += 2) {
            const lean = (b - 3) * 0.3
            const tall = (13 + ((b * 7 + w * 3) % 9)) * weed.size
            const sway = Math.sin(time * 0.9 + w * 1.3 + b) * (2 + gust * 7) + rain * 3
            g.moveTo(weed.x + (b - 3) * 1.5, weed.y)
            g.quadraticCurveTo(weed.x + lean * tall * 0.5, weed.y - tall * 0.6, weed.x + lean * tall + sway, weed.y - tall)
          }
        }
        g.stroke()
      }

      // Ripples where the dog paddles.
      for (const r of pondRings) {
        g.strokeStyle = `rgba(226,240,250,${0.7 * (1 - r.t)})`
        g.lineWidth = 2.5
        g.beginPath()
        g.ellipse(r.x, r.y, 8 + r.t * 26, 4 + r.t * 12, 0, 0, TAU)
        g.stroke()
      }

      // The chalks and the rag.
      const idle = time - lastTouch > 6 && !inked.any && weather === 'sun'
      let drawing: Extract<Act, { kind: 'draw' }> | null = null
      let rubbing: Extract<Act, { kind: 'rub' }> | null = null
      for (const act of acts.values()) {
        if (act.kind === 'draw') drawing = act
        else if (act.kind === 'rub') rubbing = act
      }
      for (let i = 0; i < 6; i++) {
        const mine = tool === i
        if (mine && drawing) continue
        const nudge = mine ? Math.sin(toolBump.value * 9) * 0.12 * toolBump.value + (idle ? Math.sin(time * 5) * 0.07 * Math.max(0, Math.sin(time * 1.2)) : 0) : 0
        drawChalk(g, SLOT_X + (mine ? 26 : 0) - (FULL[i] - length[i]) / 2, SLOT_Y + i * SLOT_GAP - (mine ? 3 : 0), SLOT_TILT[i] + nudge, length[i], i, mine ? 0.85 : 0, sunAmt)
      }
      if (!(tool === RAG_TOOL && rubbing)) drawRag(g, RAG.x + (tool === RAG_TOOL ? 22 : 0), RAG.y, -0.08, tool === RAG_TOOL ? 0.85 : 0, sunAmt, ragScrunch.value)

      // Cars lie flat, so they go under the standing toys.
      const drawToy = (t: Toy): void => {
        const squash = t.bump.value
        if (t.kind === 'car') drawCar(g, t.x, t.y - t.hopH, t.a, t.variant, t.lift, t.inBox ? 0 : sunAmt, squash * 0.5)
        else if (t.kind === 'person') drawPerson(g, t.x, t.y, t.variant, t.hopH + Math.max(0, squash) * 20, t.face, t.lift, t.inBox ? 0 : sunAmt, squash * 0.4 + (t.held ? Math.sin(time * 6) * 0.05 : 0))
        else drawDog(g, t.x, t.y - t.hopH - Math.max(0, squash) * 16, t.face, t.step, time * (t.mode === 'sit' ? 9 : 5), t.lift, t.inBox ? 0 : sunAmt, t.wet, t.mode === 'sit' && !t.inBox ? 1 : 0)
      }
      const standing: Toy[] = []
      for (const t of toys) {
        if (t.held || t.mode === 'fly') continue
        if (t.kind === 'car') drawToy(t)
        else standing.push(t)
      }
      standing.sort((a, b) => a.y - b.y)
      for (const t of standing) drawToy(t)

      // The lid, hinged along the far edge of the box.
      const peek = clamp(Math.min((1.3 - peekT) / 0.16, peekT / 0.35), 0, 1)
      const shut = clamp(lid - peek * peek * (3 - 2 * peek) * 0.38, 0, 1)
      const lh = lerp(13, BOX.h + 16, shut)
      if (shut > 0.02) {
        g.fillStyle = `rgba(0,0,0,${0.3 * shut})`
        g.fillRect(BOX.x - 2, BOX.y - 8 + lh, BOX.w + 14, 9)
      }
      g.drawImage(ground.lid, BOX.x - 8, BOX.y - 10, BOX.w + 16, lh)
      if (shut < 0.98) {
        g.fillStyle = `rgba(0,0,0,${0.35 * (1 - shut)})`
        g.fillRect(BOX.x - 8, BOX.y - 10, BOX.w + 16, lh)
      }
      if (shut > 0.5 && rain > 0.1) {
        // Rain spotting the cardboard.
        g.fillStyle = 'rgba(60,40,22,0.35)'
        g.beginPath()
        for (let i = 0; i < 26; i++) {
          const x = BOX.x + ((i * 53) % (BOX.w - 8)) + 4
          const y = BOX.y + ((i * 97) % (BOX.h - 16)) + 4
          const r = 2 + ((i * 7) % 5) * clamp(rainT / 6 - i * 0.03, 0, 1)
          g.moveTo(x + r, y)
          g.arc(x, y, r, 0, TAU)
        }
        g.fill()
      }

      for (const t of toys) if (t.held || t.mode === 'fly') drawToy(t)

      // What the hand is holding.
      if (drawing) {
        const a = 2.3
        const len = length[drawing.color]
        drawChalk(g, drawing.lx - Math.cos(a) * (len / 2 - 4), drawing.ly - Math.sin(a) * (len / 2 - 4), a, len, drawing.color, 0.5, sunAmt)
      }
      if (rubbing && tool === RAG_TOOL) drawRag(g, rubbing.lx, rubbing.ly, 0.2 + Math.sin(time * 16) * 0.06, 0.25, sunAmt, 0.6)

      // Cloud shade over everything, and the rain itself.
      if (sunAmt < 0.98) {
        g.fillStyle = `rgba(26,34,50,${0.24 * (1 - sunAmt)})`
        g.fillRect(0, 0, W, H)
      }
      if (rain > 0.02) {
        g.strokeStyle = `rgba(214,226,236,${0.22 * rain})`
        g.lineWidth = 1.6
        g.beginPath()
        for (const s of streaks) {
          const y = ((time * 1.5 + s.ph) % 1) * (H + 80) - 40
          const x = s.x - y * 0.16
          g.moveTo(x, y)
          g.lineTo(x - s.len * 0.16, y + s.len)
        }
        g.stroke()
      }

      // The sun and the cloud above the wall.
      if (sunAmt < 0.98) {
        g.fillStyle = `rgba(104,112,124,${0.6 * (1 - sunAmt)})`
        g.fillRect(0, 0, W, SKY_H)
      }
      g.globalAlpha = 0.25 + 0.75 * sunAmt
      g.drawImage(sky.sun, SUN.x - 75, SUN.y - 75, 150, 150)
      g.globalAlpha = 1
      const grow = 0.8 + 0.3 * (1 - sunAmt) + 0.25 * rain + (cloud.held ? 0.05 : 0)
      const cw = sky.cw * grow
      const ch = sky.ch * grow
      const cy = 40 + Math.sin(time * 0.8) * 2.5 + (cloud.held ? -3 : 0)
      const cx = cloud.x + (cloud.held || weather !== 'sun' ? 0 : Math.sin(time * 0.31) * 7)
      const darkness = clamp((1 - sunAmt) * 0.7 + rain * 0.5, 0, 1)
      if (darkness < 1) g.drawImage(sky.fair, cx - cw / 2, cy - ch / 2, cw, ch)
      if (darkness > 0.02) {
        g.globalAlpha = darkness
        g.drawImage(sky.dark, cx - cw / 2, cy - ch / 2, cw, ch)
        g.globalAlpha = 1
      }
    },

    down(p: Pointer) {
      lastTouch = stage.time
      // The sky: the cloud, or a breath of wind.
      if (p.y < PAVE_TOP) {
        if (Math.abs(p.x - cloud.x) < 125 && p.y < 112) {
          cloud.held = true
          cloud.target = null
          acts.set(p.id, { kind: 'cloud', off: cloud.x - p.x })
          sfx.noise({ dur: 0.3, vol: 0.035, freq: 600, to: 1200, filter: 'bandpass', q: 0.6 })
        } else {
          gust = 1
          sfx.noise({ dur: 0.6, vol: 0.03, freq: 500, to: 1100, filter: 'bandpass', q: 0.5 })
          if (p.y > 70) dust(p.x, p.y, '#b9a89a', 4, 40)
        }
        return
      }
      const toy = toyAt(p.x, p.y)
      if (toy) {
        toy.held = true
        acts.set(p.id, { kind: 'toy', toy, dx: toy.x - p.x, dy: toy.y - p.y, moved: false, fromBox: false })
        tok(0.07, 1.3)
        return
      }
      if (inBoxRect(p.x, p.y)) {
        if (lid > 0.3) {
          if (peekT <= 0) peekT = 1.3
          cardboard(0.07)
          return
        }
        let best: Toy | null = null
        let bestD = Infinity
        for (const t of toys) {
          if (!t.inBox || t.held) continue
          const d = Math.hypot(t.x - p.x, (t.kind === 'car' ? t.y : t.y - 22) - p.y)
          if (d < bestD) {
            bestD = d
            best = t
          }
        }
        if (best) {
          best.held = true
          acts.set(p.id, { kind: 'toy', toy: best, dx: best.x - p.x, dy: best.y - p.y, moved: false, fromBox: true })
          tok(0.08, 1.2)
        } else cardboard(0.08)
        return
      }
      if (p.x < FIELD.x0 - 4) {
        if (p.y < BUCKET.y + BUCKET.r + 10) {
          clink()
          sfx.tone({ freq: 240, to: 200, dur: 0.18, type: 'triangle', vol: 0.04 })
          dust(BUCKET.x, BUCKET.y, '#e9e4d6', 5, 60)
          return
        }
        const next = slotAt(p.y)
        selectTool(next)
        acts.set(p.id, { kind: 'tool', tool: next })
        return
      }
      if (onField(p.x, p.y)) {
        if (tool === RAG_TOOL) {
          const changed = rubAt(p.x, p.y)
          acts.set(p.id, { kind: 'rub', lx: p.x, ly: p.y, sound: 0, changed })
          ragScrunch.value = 0.6
          sfx.noise({ dur: 0.1, vol: 0.045, freq: 600, filter: 'lowpass' })
          dust(p.x, p.y, '#d8d3c6', 4, 50)
        } else beginDraw(p, tool)
        return
      }
      // The kerb, the gutter: grit under a fingertip.
      sfx.noise({ dur: 0.05, vol: 0.04, freq: 1200, filter: 'bandpass', q: 1 })
      dust(p.x, p.y, '#b9b2a6', 4, 50)
    },

    move(p: Pointer) {
      const act = acts.get(p.id)
      if (!act) return
      lastTouch = stage.time
      if (act.kind === 'draw') {
        extend(act, clamp(p.x, FIELD.x0, FIELD.x1), clamp(p.y, FIELD.y0, FIELD.y1), Math.hypot(p.vx, p.vy))
      } else if (act.kind === 'rub') {
        const x = clamp(p.x, FIELD.x0 - 10, FIELD.x1 + 10)
        const y = clamp(p.y, FIELD.y0 - 6, FIELD.y1 + 6)
        const d = Math.hypot(x - act.lx, y - act.ly)
        if (d < 6) return
        const n = Math.ceil(d / 12)
        for (let i = 1; i <= n; i++) {
          if (rubAt(lerp(act.lx, x, i / n), lerp(act.ly, y, i / n))) {
            act.changed = true
            wantRebuild = true
          }
        }
        act.lx = x
        act.ly = y
        act.sound += d
        if (act.sound > 26) {
          act.sound = 0
          sfx.noise({ dur: 0.09, vol: 0.04, freq: rnd(450, 700), filter: 'lowpass' })
          dust(x, y, '#d8d3c6', 2, 46)
        }
      } else if (act.kind === 'toy') {
        const t = act.toy
        if (Math.hypot(p.x - p.startX, p.y - p.startY) > 14) act.moved = true
        // Ease the grip so the toy sits just above the finger.
        act.dx = damp(act.dx, 0, 0.2, 1)
        act.dy = damp(act.dy, t.kind === 'car' ? 0 : 16, 0.2, 1)
        t.x = p.x + act.dx
        t.y = clamp(p.y + act.dy, PAVE_TOP + 20, H - 30)
        if (t.kind !== 'car' && Math.abs(p.dx) > 1.5) t.face = p.dx > 0 ? 1 : -1
        if (t.kind === 'car' && act.moved && Math.hypot(p.vx, p.vy) > 120) t.a = turnTo(t.a, Math.atan2(p.vy, p.vx), 0.25, 1)
      } else if (act.kind === 'cloud') {
        cloud.x = clamp(p.x + act.off, 140, W - 110)
      } else if (act.kind === 'tool') {
        // Dragged straight from the tray onto the pavement: start drawing.
        if (p.x > FIELD.x0 + 6 && onField(p.x, p.y)) {
          if (act.tool === RAG_TOOL) acts.set(p.id, { kind: 'rub', lx: p.x, ly: p.y, sound: 0, changed: false })
          else beginDraw(p, act.tool)
        }
      }
    },

    up(p: Pointer) {
      const act = acts.get(p.id)
      acts.delete(p.id)
      if (!act) return
      if (act.kind === 'draw') {
        town.finish(act.stroke, stage.time)
        lastEnd = { stroke: act.stroke, x: act.lx, y: act.ly, at: stage.time }
        checkPlaces()
      } else if (act.kind === 'rub') {
        if (act.changed) checkPlaces()
      } else if (act.kind === 'cloud') {
        cloud.held = false
        const gap = cloud.x - SUN.x
        if (Math.abs(gap) < 100) cloud.target = SUN.x
        else if (Math.abs(gap) < 170) cloud.target = clamp(SUN.x + Math.sign(gap) * 200, 140, W - 110)
      } else if (act.kind === 'toy') {
        const t = act.toy
        t.held = false
        if (!act.moved) {
          if (act.fromBox) {
            // Tapped in the box: it takes itself somewhere sensible.
            const [x, y] = goodSpot(t)
            flyTo(t, x, y)
          } else {
            t.bump.value = 0.5
            tok(0.08, t.kind === 'car' ? 0.8 : 1.15)
            if (t.kind === 'person') t.face = -t.face
            if (t.kind === 'car' && t.mode === 'park') {
              t.timer = 0
              t.reach = 58
            }
          }
          return
        }
        if (inBoxRect(t.x, t.kind === 'car' ? t.y : t.y - 20) && lid < 0.3) {
          t.inBox = true
          t.mode = 'box'
          tok(0.06, 0.9)
          cardboard(0.04)
          return
        }
        land(t)
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'chalk-town',
    name: 'Chalk Town',
    emoji: '🖍️',
    ages: [3, 7],
    pitch: 'Draw a town on the pavement with fat chalks, set wooden cars and little people going in it, then let the rain wash it clean.',
    howTo: 'Draw on the pavement: lines are roads, closed shapes are homes, blue scribble is water. Tap a chalk to change colour; the rag rubs out. Drag (or tap) toys out of the shoebox. Drag the cloud over the sun for rain, and away again to dry.',
    basedOn: 'Pavement chalk and a box of wooden toys: Waldorf free play with simple figures, and the rhythm of weather as beginning and end',
    whyFun: 'Fat chalk scraping over rough tar, and a toy car that drives along whatever line you just drew.',
    set: 'gentle',
  },
  create,
}
