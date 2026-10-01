// The advent spiral: a darkened room, a spiral of fir boughs on the floor, one
// large candle burning at its centre. The child carries their own candle in
// along the path, lights it from the centre, and on the way out sets it down
// among the boughs, where its light stays. A lyre follows the walk.
//
// The candle only moves while a finger is down, and walks toward it along the
// path; lifting the finger sets it down where it is, and touching again takes
// it up, so nothing is lost by letting go.

import { clamp, damp, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Pointer } from '../../kit/types.ts'
import { DYE, apple, brush, flame, flicker, glow, grain, makeSprite, mulberry, paperStar, person, planks, put, rgba, sprig } from './art.ts'
import type { G, Look, Rng, Sprite } from './art.ts'
import { SEG, candleHeight, drawStanding, readyCandle } from './candle.ts'
import type { CandleShape } from './candle.ts'
import { holderOf } from './apple.ts'
import type { Made, Scene, World } from './shared.ts'

const CX = 620
const CY = 398
const SQ = 0.6
const TURNS = 2
const R0 = 340
const RC = 100
const PHI0 = 2.5
// How far inside the path the boughs lie: half the gap between two windings.
const BOUGH = 85
// How far a candle is nestled from the path toward the boughs.
const NESTLE = 54
// The great candle at the centre: where its flame stands.
const GREAT = { x: CX, y: CY - 104 }
const DOOR = { x: 0, y: 420, w: 96, h: 250 }
// The radius of an apple that holds a candle, before the candle's own scale.
const APPLE = 27

// A slow pentatonic line, in the kit's scale steps, that the walk plays.
const TUNE = [-1, 1, 2, 1, -1, -2, -1, 1, 0, -1, -2, -3, -2, -1, 1, 2, 3, 2, 1, -1, 0, -2, -1, -3, -2, 0, -1]
const NOTE_EVERY = 150

const WATCHERS: { x: number; y: number; h: number; look: Look }[] = [
  { x: 92, y: 204, h: 170, look: { coat: DYE.indigo, hat: DYE.plum, hair: [70, 44, 30], skin: DYE.skin, head: 1 } },
  { x: 150, y: 214, h: 108, look: { coat: DYE.madder, hat: DYE.ochre, hair: [190, 150, 90], skin: DYE.skin, head: 0 } },
  { x: 1108, y: 196, h: 166, look: { coat: DYE.moss, hat: DYE.cream, hair: [60, 40, 30], skin: [206, 150, 112], head: 2 } },
]

interface Path {
  x: number[]
  y: number[]
  // Unit vector toward the boughs on the inner side, already squashed.
  nx: number[]
  ny: number[]
  len: number[]
  total: number
  // Arc length where the spiral proper begins (after the walk from the door).
  start: number
}

function spiralPoint(u: number, inset = 0): [number, number] {
  const ang = PHI0 + u * TURNS * TAU
  const rho = RC + R0 * (1 - u) - inset
  return [CX + Math.cos(ang) * rho, CY + Math.sin(ang) * rho * SQ]
}

function buildPath(): Path {
  const x: number[] = []
  const y: number[] = []
  const nx: number[] = []
  const ny: number[] = []
  const [ex, ey] = spiralPoint(0)
  const doorX = DOOR.x + DOOR.w + 44
  const doorY = DOOR.y + DOOR.h - 26
  for (let i = 0; i < 14; i++) {
    const t = i / 14
    x.push(doorX + (ex - doorX) * t)
    y.push(doorY + (ey - doorY) * t - Math.sin(t * Math.PI) * 10)
    nx.push(0)
    ny.push(0)
  }
  const start = x.length
  const N = 420
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const [px, py] = spiralPoint(u)
    const ang = PHI0 + u * TURNS * TAU
    x.push(px)
    y.push(py)
    nx.push(-Math.cos(ang))
    ny.push(-Math.sin(ang) * SQ)
  }
  const len: number[] = [0]
  for (let i = 1; i < x.length; i++) len.push(len[i - 1]! + Math.hypot(x[i]! - x[i - 1]!, y[i]! - y[i - 1]!))
  return { x, y, nx, ny, len, total: len[len.length - 1]!, start: len[start]! }
}

function paintRoom(g: G, path: Path): void {
  const rng = mulberry(2412)
  // The floor, painted as if lit; the dark is laid over it each frame.
  planks(g, 0, 0, W, H, [156, 108, 70], rng, 9)
  // A round of deep blue cloth under the spiral.
  g.save()
  g.beginPath()
  g.ellipse(CX, CY + 6, R0 + RC + 150, (R0 + RC + 150) * SQ, 0, 0, TAU)
  g.fillStyle = 'rgba(62,70,124,0.78)'
  g.fill()
  g.clip()
  brush(g, 0, 0, W, H, rng, 320, 0.3, 0.8, 90)
  g.restore()
  // The way in: the cloth worn a little paler where feet have gone.
  g.strokeStyle = 'rgba(150,160,214,0.2)'
  g.lineWidth = 50
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  for (let i = 0; i < path.x.length; i += 3) {
    if (i === 0) g.moveTo(path.x[i]!, path.y[i]!)
    else g.lineTo(path.x[i]!, path.y[i]!)
  }
  g.stroke()
  g.strokeStyle = 'rgba(190,196,236,0.07)'
  g.lineWidth = 24
  g.stroke()

  // The door to the hall, standing open, and the light it lets in.
  const spill = g.createRadialGradient(DOOR.x + 40, DOOR.y + DOOR.h, 10, DOOR.x + 40, DOOR.y + DOOR.h, 300)
  spill.addColorStop(0, 'rgba(255,206,130,0.5)')
  spill.addColorStop(1, 'rgba(255,206,130,0)')
  g.fillStyle = spill
  g.fillRect(0, DOOR.y - 100, 380, 460)
  g.fillStyle = '#f2c98a'
  g.beginPath()
  g.moveTo(DOOR.x, DOOR.y + 20)
  g.lineTo(DOOR.x + DOOR.w, DOOR.y)
  g.lineTo(DOOR.x + DOOR.w, DOOR.y + DOOR.h)
  g.lineTo(DOOR.x, DOOR.y + DOOR.h + 34)
  g.closePath()
  g.fill()
  // A glimpse of the hall through it: a stall's awning and a lantern.
  g.save()
  g.clip()
  g.fillStyle = '#e0a970'
  g.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h + 40)
  g.fillStyle = rgba(DYE.madder)
  g.fillRect(DOOR.x, DOOR.y + 70, DOOR.w, 26)
  g.fillStyle = rgba(DYE.cream)
  for (let i = 0; i < 4; i++) g.fillRect(DOOR.x + 8 + i * 26, DOOR.y + 70, 12, 26)
  g.fillStyle = rgba(DYE.wood)
  g.fillRect(DOOR.x, DOOR.y + 170, DOOR.w, 120)
  g.fillStyle = '#fff0c0'
  g.beginPath()
  g.arc(DOOR.x + 34, DOOR.y + 126, 9, 0, TAU)
  g.fill()
  g.restore()
  g.strokeStyle = rgba(DYE.woodDark)
  g.lineWidth = 12
  g.beginPath()
  g.moveTo(DOOR.x + DOOR.w, DOOR.y + DOOR.h)
  g.lineTo(DOOR.x + DOOR.w, DOOR.y)
  g.lineTo(DOOR.x, DOOR.y + 20)
  g.stroke()

  // The boughs: laid thick along the spiral, darker beneath, lighter on top.
  const lay = (tone: number, size: number, every: number, r: Rng) => {
    for (let u = -0.45; u <= 0.8; u += every / ((RC + R0 * (1 - u)) * TURNS * TAU * 0.8)) {
      const [bx, by] = spiralPoint(u, BOUGH)
      const ang = PHI0 + u * TURNS * TAU + Math.PI / 2
      for (const side of [-1, 1]) {
        const a = ang + side * (0.4 + r() * 1.1) + (r() < 0.3 ? Math.PI : 0)
        g.save()
        g.translate(bx + (r() - 0.5) * 14, by + (r() - 0.5) * 10)
        g.scale(1, 0.72)
        sprig(g, 0, 0, size * (0.75 + r() * 0.5), a, r, tone * (0.85 + r() * 0.3), true)
        g.restore()
      }
    }
  }
  lay(0.8, 42, 17, rng)
  lay(1.2, 38, 21, rng)
  lay(1.34, 30, 34, rng)

  // Among the boughs: gold paper stars, crystals, cones and shells.
  for (let i = 0; i < 34; i++) {
    const u = -0.42 + (i / 34) * 1.2 + rng() * 0.01
    const [bx, by] = spiralPoint(u, BOUGH + (rng() - 0.5) * 22)
    const kind = i % 4
    if (kind === 0) {
      paperStar(g, bx, by, 13, [250, 214, 110], [226, 170, 70], rng() * 2)
    } else if (kind === 1) {
      crystal(g, bx, by + 6, 15, rng)
    } else if (kind === 2) {
      g.fillStyle = '#7a5236'
      g.beginPath()
      g.ellipse(bx, by, 9, 12, rng() * 2, 0, TAU)
      g.fill()
      g.strokeStyle = 'rgba(40,20,10,0.5)'
      g.lineWidth = 1.5
      for (let k = -2; k <= 2; k++) {
        g.beginPath()
        g.arc(bx, by + k * 5, 8, Math.PI * 1.1, Math.PI * 1.9)
        g.stroke()
      }
    } else {
      g.fillStyle = '#f1dcc4'
      g.beginPath()
      g.ellipse(bx, by, 10, 7, rng() * 2, 0, TAU)
      g.fill()
      g.strokeStyle = 'rgba(190,140,120,0.7)'
      g.lineWidth = 1.2
      g.beginPath()
      g.arc(bx, by, 5, 0, TAU * 0.8)
      g.stroke()
    }
  }

  // The centre: a round of wood wreathed in moss, where the great candle stands.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU
    g.save()
    g.translate(CX + Math.cos(a) * 54, CY + Math.sin(a) * 54 * SQ + 6)
    g.scale(1, 0.72)
    sprig(g, 0, 0, 36, a + (rng() - 0.5), rng, 1.05, true)
    g.restore()
  }
  g.fillStyle = '#6b4428'
  g.beginPath()
  g.ellipse(CX, CY + 14, 44, 24, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#b98852'
  g.beginPath()
  g.ellipse(CX, CY + 4, 44, 24, 0, 0, TAU)
  g.fill()
  g.strokeStyle = 'rgba(110,66,34,0.5)'
  g.lineWidth = 1.5
  for (const r of [12, 24, 36]) {
    g.beginPath()
    g.ellipse(CX, CY + 4, r, r * 0.55, 0, 0, TAU)
    g.stroke()
  }
  // The great candle itself: a thick pillar of beeswax. Its flame is live.
  const pillar = g.createLinearGradient(CX - 21, 0, CX + 21, 0)
  pillar.addColorStop(0, '#d9a03c')
  pillar.addColorStop(0.3, '#f8d67e')
  pillar.addColorStop(0.65, '#eebb54')
  pillar.addColorStop(1, '#b97c26')
  g.fillStyle = pillar
  g.beginPath()
  g.moveTo(CX - 21, CY + 2)
  g.lineTo(CX - 20, GREAT.y + 16)
  g.quadraticCurveTo(CX, GREAT.y + 6, CX + 20, GREAT.y + 16)
  g.lineTo(CX + 21, CY + 2)
  g.quadraticCurveTo(CX, CY + 12, CX - 21, CY + 2)
  g.fill()
  // Runs of wax down its side, and the pool round the wick.
  g.fillStyle = '#fbe29a'
  g.beginPath()
  g.ellipse(CX, GREAT.y + 13, 19, 6, 0, 0, TAU)
  g.fill()
  for (const [dx, len] of [[-14, 30], [-4, 18], [12, 40]] as const) {
    g.beginPath()
    g.roundRect(CX + dx - 3, GREAT.y + 12, 6, len, 3)
    g.fill()
  }
  g.strokeStyle = '#4a2c18'
  g.lineWidth = 2.4
  g.beginPath()
  g.moveTo(CX, GREAT.y + 12)
  g.lineTo(CX, GREAT.y + 2)
  g.stroke()
  grain(g, 0, 0, W, H, 2600, rng, 0.04, 0.03)
}

// A small clear crystal standing on (x, y).
export function crystal(g: G, x: number, y: number, s: number, rng: Rng): void {
  const tilt = (rng() - 0.5) * 0.5
  g.save()
  g.translate(x, y)
  g.rotate(tilt)
  for (const [dx, h, w] of [[-s * 0.45, s * 0.9, s * 0.3], [s * 0.4, s * 0.75, s * 0.28], [0, s * 1.5, s * 0.42]] as const) {
    g.beginPath()
    g.moveTo(dx - w, 0)
    g.lineTo(dx - w, -h * 0.7)
    g.lineTo(dx, -h)
    g.lineTo(dx + w, -h * 0.7)
    g.lineTo(dx + w, 0)
    g.closePath()
    g.fillStyle = 'rgba(214,226,246,0.92)'
    g.fill()
    g.beginPath()
    g.moveTo(dx, 0)
    g.lineTo(dx, -h)
    g.lineTo(dx + w, -h * 0.7)
    g.lineTo(dx + w, 0)
    g.closePath()
    g.fillStyle = 'rgba(160,176,220,0.85)'
    g.fill()
  }
  g.restore()
}

interface Standing {
  // Arc length along the path, and how far it is nestled toward the boughs.
  s: number
  shape: CandleShape
  seed: number
  mine: boolean
}

export function createSpiral(world: World): Scene {
  const { stage, snd } = world
  const path = buildPath()
  let room: Sprite | null = null
  let dark: HTMLCanvasElement | null = null
  let darkG: G | null = null
  const DARK_K = 0.25

  // Other children's candles, already burning here and there.
  const others: Standing[] = [0.09, 0.24, 0.37, 0.52, 0.66, 0.83].map((u, i) => ({
    s: path.start + (path.total - path.start) * u,
    shape: readyCandle(40 + i, 0.8 + ((i * 37) % 5) * 0.07, 0.6 + ((i * 53) % 5) * 0.09),
    seed: 40 + i,
    mine: false,
  }))

  let own: Made | null = null
  let holder: Made | null = null
  let shape: CandleShape = readyCandle(3, 0.9, 0.9)
  let s = 0
  let lit = 0
  let burning = false
  let held = -1
  let nestle = 0
  let stride = 0
  let noteAt = 0
  let tuneAt = 0
  let lean = 0
  let idle = 0
  let lyreGlow = 0

  const at = (dist: number): { x: number; y: number; nx: number; ny: number } => {
    const d = clamp(dist, 0, path.total)
    let lo = 0
    let hi = path.len.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (path.len[mid]! <= d) lo = mid
      else hi = mid
    }
    const span = path.len[hi]! - path.len[lo]! || 1
    const t = (d - path.len[lo]!) / span
    return {
      x: path.x[lo]! + (path.x[hi]! - path.x[lo]!) * t,
      y: path.y[lo]! + (path.y[hi]! - path.y[lo]!) * t,
      nx: path.nx[lo]! + (path.nx[hi]! - path.nx[lo]!) * t,
      ny: path.ny[lo]! + (path.ny[hi]! - path.ny[lo]!) * t,
    }
  }

  // The place on the path nearest a finger, leaning a little toward where the
  // candle already is so it does not hop between windings.
  const nearest = (x: number, y: number): number => {
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < path.x.length; i += 2) {
      const dx = path.x[i]! - x
      const dy = (path.y[i]! - y) / SQ
      const d = Math.hypot(dx, dy) + Math.abs(path.len[i]! - s) * 0.035
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return path.len[best]!
  }

  const spotOf = (st: { s: number }, off: number): [number, number] => {
    const p = at(st.s)
    return [p.x + p.nx * off, p.y + p.ny * off]
  }

  const kept = (): Standing[] =>
    world.memory.spiral.map((k, i) => ({
      s: path.start + (path.total - path.start) * k.u,
      shape: k.shape ?? readyCandle(90 + i),
      seed: 90 + i,
      mine: true,
    }))

  // The door itself, unless the finger is on the candle that waits beside it.
  const atDoor = (x: number, y: number): boolean => {
    if (x > DOOR.x + DOOR.w + 6 || y < DOOR.y - 20 || y > DOOR.y + DOOR.h + 50) return false
    const p = at(s)
    return Math.hypot(x - p.x, y - (p.y - 40)) > 84
  }

  // A candle standing in an apple: one from the bowl by the door, or the one
  // the child cored themselves.
  const drawInApple = (g: G, c: CandleShape, x: number, y: number, scale: number, time: number, tilt = 0, cored: Made | null = null): void => {
    g.save()
    g.translate(x, y)
    g.rotate(tilt)
    drawStanding(g, c, 0, -APPLE * 1.1 * scale, scale, time, 0)
    if (cored && cored.bare) cored.bare(g, 0, 0, (APPLE * scale) / 72)
    else apple(g, 0, 0, APPLE * scale)
    g.restore()
  }

  // Where a standing candle's flame is, for the light and the flame itself.
  const flameAt = (c: CandleShape, x: number, y: number, scale: number): [number, number] => [x, y - APPLE * 1.1 * scale - (candleHeight(c) - 3) * scale]

  return {
    enter() {
      if (!room) {
        room = makeSprite(W, H, world.bg, (g) => paintRoom(g, path))
        dark = document.createElement('canvas')
        dark.width = Math.ceil(W * DARK_K)
        dark.height = Math.ceil(H * DARK_K)
        darkG = dark.getContext('2d')
      }
      // Their own candle if they dipped one (the fattest), else one waiting.
      own = null
      let most = -1
      for (const m of world.visit.basket) {
        if (m.kind !== 'candle' || !m.candle) continue
        const fat = m.candle.r[SEG]!
        if (fat > most) {
          most = fat
          own = m
        }
      }
      const mine: Made | null = own
      holder = holderOf(world.visit.basket)
      // With no dipped candle, the small one from their own apple holder is
      // carried; with neither, one waits by the door.
      shape = mine && mine.candle ? mine.candle : holder ? readyCandle(3 + world.visit.n, 0.82, 0.42) : readyCandle(3 + world.visit.n, 0.9, 0.9)
      s = 0
      lit = 0
      burning = false
      held = -1
      nestle = 0
      noteAt = 0
      idle = 0
    },
    update(dt) {
      idle += dt
      lyreGlow = Math.max(0, lyreGlow - dt * 0.8)
      const before = s
      if (held !== -1) {
        const p = stage.pointers.get(held)
        if (!p || !p.down) {
          held = -1
        } else {
          const want = nearest(p.x, p.y)
          const gap = want - s
          // Close behind the finger it keeps up; sent far ahead it strolls.
          const pace = Math.abs(gap) < 220 ? 270 : 180
          const v = clamp(gap * 4.5, -pace, pace)
          s = clamp(s + v * dt, 0, path.total)
        }
      }
      const moved = s - before
      stride += Math.abs(moved)
      // The lyre: one note for every few steps of the walk.
      noteAt += Math.abs(moved)
      if (noteAt >= NOTE_EVERY) {
        noteAt = 0
        snd.lyre(TUNE[tuneAt % TUNE.length]!, 0.9)
        tuneAt++
        lyreGlow = 1
      }
      // At the centre the wick takes the flame from the great candle.
      if (!burning && s > path.total - 26) {
        burning = true
        snd.breath()
        stage.after(0.35, () => snd.lyre(-1, 0.8))
        stage.after(0.95, () => snd.lyre(2, 0.7))
      }
      if (burning) lit = Math.min(1, lit + dt / 1.3)
      lean = damp(lean, !burning && s > path.total - 70 ? 1 : 0, 5, dt)
      // Set down, a lit candle nestles in among the boughs.
      const rest = held === -1 && burning && s > path.start + 30 ? 1 : 0
      nestle = damp(nestle, rest, 5, dt)
    },
    draw(g) {
      const t = stage.time
      if (room) put(g, room, 0, 0)

      // Everything that stands, back to front.
      interface Thing {
        y: number
        draw: () => void
        light: [number, number, number]
      }
      const things: Thing[] = []
      const standing = [...others, ...kept()]
      for (const st of standing) {
        const [x, y] = spotOf(st, NESTLE)
        const [fx, fy] = flameAt(st.shape, x, y, 0.44)
        things.push({ y, draw: () => drawInApple(g, st.shape, x, y, 0.44, t), light: [fx, fy, st.mine ? 176 : 150] })
      }
      const [mx, my] = spotOf({ s }, NESTLE * nestle)
      const carried = held !== -1
      const bob = carried ? Math.sin(stride * 0.07) * 2.5 : 0
      const scale = 0.52
      const tilt = lean * 0.3
      const [mfx, mfy] = flameAt(shape, mx, my + bob, scale)
      things.push({
        y: my,
        light: [mfx, mfy, 60 + lit * 150],
        draw: () => {
          drawInApple(g, shape, mx, my + bob, scale, t, tilt, holder)
          if (carried || nestle < 0.5) {
            // Two small hands round the apple.
            g.fillStyle = 'rgba(206,150,112,0.95)'
            g.beginPath()
            g.ellipse(mx - 10, my + bob - 4, 5, 8, 0.7, 0, TAU)
            g.ellipse(mx + 10, my + bob - 4, 5, 8, -0.7, 0, TAU)
            g.fill()
          }
        },
      })
      const cfx = GREAT.x
      const cfy = GREAT.y
      things.push({ y: CY + 6, light: [cfx, cfy, 400], draw: () => {} })
      things.sort((a, b) => a.y - b.y)
      for (const th of things) th.draw()

      // Those who watch from the edge of the room, and the lyre player.
      for (const w of WATCHERS) person(g, w.x, w.y, w.h, w.look, null, null, w.x < CX ? 0.6 : -0.6, Math.sin(t * 0.9 + w.x) * 1)
      person(g, 1084, 742, 176, { coat: DYE.plum, hat: DYE.ochre, hair: [120, 80, 50], skin: DYE.skin, head: 2 }, [-44, -78], [-24, -70 + Math.sin(t * 2) * 2], -0.7, 0)
      // Her lyre: a small wooden bow with strings.
      g.strokeStyle = '#b98852'
      g.lineWidth = 6
      g.beginPath()
      g.moveTo(1026, 690)
      g.quadraticCurveTo(1006, 640, 1034, 612)
      g.quadraticCurveTo(1062, 640, 1052, 690)
      g.closePath()
      g.stroke()
      g.strokeStyle = 'rgba(255,240,200,0.8)'
      g.lineWidth = 1
      for (let i = 0; i < 5; i++) {
        g.beginPath()
        g.moveTo(1022 + i * 6, 632 + Math.abs(i - 2) * 4)
        g.lineTo(1024 + i * 6, 688)
        g.stroke()
      }

      // The dark, lifted in a pool round every flame.
      if (dark && darkG) {
        const d = darkG
        d.setTransform(DARK_K, 0, 0, DARK_K, 0, 0)
        d.globalCompositeOperation = 'source-over'
        d.clearRect(0, 0, W, H)
        d.fillStyle = 'rgba(12,9,30,0.86)'
        d.fillRect(0, 0, W, H)
        d.globalCompositeOperation = 'destination-out'
        const hole = (x: number, y: number, r: number, lift: number) => {
          const grad = d.createRadialGradient(x, y, 0, x, y, r)
          grad.addColorStop(0, `rgba(0,0,0,${lift})`)
          grad.addColorStop(0.3, `rgba(0,0,0,${lift * 0.8})`)
          grad.addColorStop(0.65, `rgba(0,0,0,${lift * 0.32})`)
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          d.fillStyle = grad
          d.fillRect(x - r, y - r, r * 2, r * 2)
        }
        for (let i = 0; i < things.length; i++) {
          const [lx, ly, lr] = things[i]!.light
          hole(lx, ly + 30, lr * (0.94 + flicker(t, i) * 0.06), lr > 300 ? 0.97 : 0.9)
        }
        hole(DOOR.x + 30, DOOR.y + DOOR.h * 0.6, 250, 0.9)
        hole(1050, 690, 130 + lyreGlow * 30, 0.5 + lyreGlow * 0.2)
        hole(110, 150, 160, 0.3)
        hole(1108, 130, 140, 0.3)
        g.imageSmoothingEnabled = true
        g.drawImage(dark, 0, 0, W, H)
      }

      // The flames themselves, bright over the dark.
      g.globalCompositeOperation = 'lighter'
      for (let i = 0; i < things.length; i++) {
        const [lx, ly, lr] = things[i]!.light
        if (lr < 61) continue
        glow(g, world.haloDark, lx, ly - 6, lr * 0.42, 0.55)
      }
      g.globalCompositeOperation = 'source-over'
      for (const st of standing) {
        const [x, y] = spotOf(st, NESTLE)
        const [fx, fy] = flameAt(st.shape, x, y, 0.44)
        flame(g, fx, fy + 2, 15, flicker(t, st.seed))
      }
      flame(g, cfx, cfy + 3, 34, flicker(t, 7))
      if (lit > 0.01) {
        const fx = mx + Math.sin(tilt) * (my - mfy)
        flame(g, fx, mfy + 2 + (1 - Math.cos(tilt)) * 20, 19 * lit, flicker(t, 3))
      }
    },
    down(p: Pointer) {
      idle = 0
      if (atDoor(p.x, p.y)) {
        snd.step()
        if (burning && s > path.start + 30) {
          // The walk is done: the candle stays burning here, and we go home.
          world.memory.spiral.push({ u: (s - path.start) / (path.total - path.start), shape, apple: true })
          world.visit.given = true
          const mine = own
          const cored = holder
          world.visit.basket = world.visit.basket.filter((m) => m !== mine && m !== cored)
          world.go('home')
        } else if (burning) {
          // Carried all the way back to the door alight: it comes home too.
          world.go('home')
        } else {
          // Only looked in: back to the hall, nothing changed.
          world.go('market')
        }
        return
      }
      held = p.id
      if (stage.time > 0.2) snd.lyre(TUNE[tuneAt % TUNE.length]!, 0.5)
      tuneAt++
      lyreGlow = 1
    },
    up(p: Pointer) {
      if (p.id !== held) return
      held = -1
      if (burning) snd.wood(0.4)
    },
  }
}
