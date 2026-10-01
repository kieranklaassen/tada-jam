// Peg Blaster: a wizard cannon fires a crystal ball into a field of glowing
// pegs. Every peg it touches lights, plays the next note up, and pops when the
// ball is gone. Clear the orange ones for a slow-motion rainbow finish.
// Borrowed from Peggle and pachinko.

import { blinkAt, circle, ellipse, eyes, face, hint, label, rrect, squash, star } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { TAU, clamp, damp, ease, rnd, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { LAYOUTS } from './layouts.ts'
import type { Orbit } from './layouts.ts'

const CX = W / 2
const CY = 96
const BALL_R = 13
const PEG_R = 20
const BUMP_R = 34
const G = 950
const V0 = 820
const XL = 28 + BALL_R
const XR = W - 28 - BALL_R
const TOP = 8 + BALL_R
const BUCKET_Y = 724
const BUCKET_HALF = 74
const RIM_R = 10
const MAX_FLY = 3
const STEP = 1 / 240

type Kind = 'blue' | 'orange' | 'green' | 'purple' | 'bumper'

interface Peg {
  kind: Kind
  x: number
  y: number
  r: number
  orbit: Orbit | null
  lit: boolean
  litAt: number
  by: number
  hits: number
  gone: boolean
  grow: number
  delay: number
  pop: number
  seed: number
  bounce: Spring
}

interface Ball {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  age: number
  still: number
  lit: number
  dead: boolean
  wallAt: number
  trail: number[]
}

interface Ghost {
  x0: number
  y0: number
  t: number
  wait: number
}

interface Preview {
  pts: Float32Array
  n: number
  bounceAt: number
  target: Peg | null
}

const COLORS: Record<Kind, { base: string; light: string; dark: string; spark: readonly string[] }> = {
  blue: { base: '#2f8dff', light: '#9bd4ff', dark: '#1546b8', spark: ['#9bd4ff', '#ffffff', '#5fb0ff'] },
  orange: { base: '#ff8a1f', light: '#ffd27a', dark: '#c94a00', spark: ['#ffd27a', '#ff8a1f', '#fff3b0'] },
  green: { base: '#35d46a', light: '#b6ffc4', dark: '#0f8a3c', spark: ['#b6ffc4', '#35d46a', '#ffffff'] },
  purple: { base: '#ff4fc8', light: '#ffc1ee', dark: '#b3158a', spark: ['#ffc1ee', '#ff4fc8', '#fff36b'] },
  bumper: { base: '#ff4f6d', light: '#ffc0cb', dark: '#a8142e', spark: ['#ffffff', '#ffc0cb', '#ff4f6d'] },
}
const RAINBOW = ['#ff4d4d', '#ff9a2e', '#ffe14d', '#4fd66a', '#4db8ff', '#a66bff']
const POINTS: Record<Kind, number> = { blue: 10, orange: 100, green: 10, purple: 500, bumper: 20 }

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  // ---- cached art -------------------------------------------------------
  const make = (w: number, h: number, fn: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
    const cv = document.createElement('canvas')
    cv.width = Math.ceil(w * 2)
    cv.height = Math.ceil(h * 2)
    const c = cv.getContext('2d')
    if (c) {
      c.scale(2, 2)
      c.lineCap = 'round'
      c.lineJoin = 'round'
      fn(c)
    }
    return cv
  }

  const ORB = PEG_R * 2 + 36
  const makeOrb = (kind: Kind, lit: boolean): HTMLCanvasElement =>
    make(ORB, ORB, (c) => {
      const col = COLORS[kind]
      const m = ORB / 2
      if (lit) {
        const glow = c.createRadialGradient(m, m, PEG_R * 0.6, m, m, PEG_R + 17)
        glow.addColorStop(0, col.light)
        glow.addColorStop(1, 'rgba(255,255,255,0)')
        c.globalAlpha = 0.85
        c.fillStyle = glow
        c.beginPath()
        c.arc(m, m, PEG_R + 17, 0, TAU)
        c.fill()
        c.globalAlpha = 1
      } else {
        c.fillStyle = 'rgba(8,4,30,0.35)'
        c.beginPath()
        c.arc(m + 2, m + 4, PEG_R + 1, 0, TAU)
        c.fill()
      }
      const body = c.createRadialGradient(m - 6, m - 8, 2, m, m, PEG_R)
      if (lit) {
        body.addColorStop(0, '#ffffff')
        body.addColorStop(0.55, col.light)
        body.addColorStop(1, col.base)
      } else {
        body.addColorStop(0, col.light)
        body.addColorStop(0.45, col.base)
        body.addColorStop(1, col.dark)
      }
      c.fillStyle = body
      c.beginPath()
      c.arc(m, m, PEG_R, 0, TAU)
      c.fill()
      c.lineWidth = 3
      c.strokeStyle = lit ? '#ffffff' : 'rgba(12,6,40,0.75)'
      c.stroke()
      c.fillStyle = 'rgba(255,255,255,0.75)'
      c.beginPath()
      c.ellipse(m - 7, m - 9, 6, 3.6, -0.6, 0, TAU)
      c.fill()
      if (kind === 'purple') star(c, m, m + 1, 12, lit ? '#ff4fc8' : '#fff36b')
      if (kind === 'green') {
        circle(c, m - 6, m + 3, 4.6, '#ffffff', 'rgba(12,60,30,0.7)', 2)
        circle(c, m + 6, m + 3, 4.6, '#ffffff', 'rgba(12,60,30,0.7)', 2)
      }
    })
  const orbs: Record<'blue' | 'orange' | 'green' | 'purple', [HTMLCanvasElement, HTMLCanvasElement]> = {
    blue: [makeOrb('blue', false), makeOrb('blue', true)],
    orange: [makeOrb('orange', false), makeOrb('orange', true)],
    green: [makeOrb('green', false), makeOrb('green', true)],
    purple: [makeOrb('purple', false), makeOrb('purple', true)],
  }

  const BALL_PX = BALL_R * 2 + 8
  const ballArt = make(BALL_PX, BALL_PX, (c) => {
    const m = BALL_PX / 2
    const grad = c.createRadialGradient(m - 4, m - 5, 1, m, m, BALL_R)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.5, '#d8f6ff')
    grad.addColorStop(1, '#6fc3ff')
    c.fillStyle = grad
    c.beginPath()
    c.arc(m, m, BALL_R, 0, TAU)
    c.fill()
    c.lineWidth = 2.5
    c.strokeStyle = '#173a8a'
    c.stroke()
    c.fillStyle = '#ffffff'
    c.beginPath()
    c.ellipse(m - 4, m - 5, 4, 2.6, -0.6, 0, TAU)
    c.fill()
  })

  const backdrop = make(W, H, (c) => {
    const grad = c.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#120a3a')
    grad.addColorStop(0.55, '#2b1672')
    grad.addColorStop(1, '#6a2c91')
    c.fillStyle = grad
    c.fillRect(0, 0, W, H)
    // Soft nebula clouds for depth.
    const clouds: Array<[number, number, number, string]> = [
      [230, 330, 300, 'rgba(255,90,200,0.16)'],
      [940, 470, 340, 'rgba(70,190,255,0.14)'],
      [620, 210, 260, 'rgba(150,110,255,0.16)'],
    ]
    for (const [x, y, r, color] of clouds) {
      const cg = c.createRadialGradient(x, y, 0, x, y, r)
      cg.addColorStop(0, color)
      cg.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = cg
      c.fillRect(x - r, y - r, r * 2, r * 2)
    }
    // A big pale moon low on the left.
    c.globalAlpha = 0.16
    circle(c, 205, 560, 120, '#fff6d8')
    c.globalAlpha = 0.1
    circle(c, 170, 530, 22, '#6a2c91')
    circle(c, 240, 600, 30, '#6a2c91')
    circle(c, 255, 515, 14, '#6a2c91')
    c.globalAlpha = 1
    let s = 12345
    const r01 = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
    for (let i = 0; i < 170; i++) {
      c.globalAlpha = 0.25 + r01() * 0.6
      circle(c, r01() * W, r01() * 690, 0.8 + r01() * 1.8, '#ffffff')
    }
    c.globalAlpha = 1
    // Far hills and a little castle.
    c.fillStyle = '#3a1a66'
    c.beginPath()
    c.moveTo(0, H)
    c.lineTo(0, 742)
    c.quadraticCurveTo(190, 682, 400, 748)
    c.quadraticCurveTo(620, 800, 830, 742)
    c.quadraticCurveTo(1020, 692, W, 750)
    c.lineTo(W, H)
    c.fill()
    const castle = (x: number, y: number, k: number) => {
      c.fillStyle = '#2a1150'
      c.fillRect(x - 46 * k, y - 50 * k, 92 * k, 60 * k)
      for (const tx of [-46, 0, 46]) {
        const th = tx === 0 ? 96 : 72
        c.fillRect(x + (tx - 13) * k, y - th * k, 26 * k, th * k)
        c.beginPath()
        c.moveTo(x + (tx - 18) * k, y - th * k)
        c.lineTo(x + tx * k, y - (th + 34) * k)
        c.lineTo(x + (tx + 18) * k, y - th * k)
        c.fill()
      }
      c.fillStyle = '#ffd96b'
      for (const [wx, wy] of [[-46, -52], [0, -74], [46, -52], [-20, -22], [20, -22]] as const) {
        c.fillRect(x + (wx - 4) * k, y + wy * k, 8 * k, 12 * k)
      }
    }
    castle(150, 736, 0.9)
    // Near ground the cauldron rides along.
    c.fillStyle = '#25103f'
    c.beginPath()
    c.moveTo(0, H)
    c.lineTo(0, 792)
    c.quadraticCurveTo(W / 2, 770, W, 792)
    c.lineTo(W, H)
    c.fill()
    // Pine trees on the right.
    c.fillStyle = '#2a1150'
    for (const [tx, ty, k] of [[1040, 752, 1], [1092, 762, 0.75], [985, 760, 0.6]] as const) {
      for (let i = 0; i < 3; i++) {
        c.beginPath()
        c.moveTo(tx - (30 - i * 6) * k, ty - i * 24 * k)
        c.lineTo(tx, ty - (50 + i * 24) * k)
        c.lineTo(tx + (30 - i * 6) * k, ty - i * 24 * k)
        c.fill()
      }
    }
    // Stone pillars: the side walls.
    for (const side of [0, 1]) {
      const x = side === 0 ? 0 : W - 28
      const pg = c.createLinearGradient(x, 0, x + 28, 0)
      pg.addColorStop(0, side === 0 ? '#1d0f45' : '#5a3da0')
      pg.addColorStop(1, side === 0 ? '#5a3da0' : '#1d0f45')
      c.fillStyle = pg
      c.fillRect(x, 0, 28, H)
      c.strokeStyle = 'rgba(15,6,40,0.55)'
      c.lineWidth = 3
      for (let y = 40; y < H; y += 82) {
        c.beginPath()
        c.moveTo(x, y)
        c.lineTo(x + 28, y)
        c.stroke()
      }
      c.strokeStyle = 'rgba(200,170,255,0.55)'
      c.beginPath()
      c.moveTo(side === 0 ? 27 : W - 27, 0)
      c.lineTo(side === 0 ? 27 : W - 27, H)
      c.stroke()
    }
  })

  const twinkles: Array<{ x: number; y: number; s: number; p: number }> = []
  for (let i = 0; i < 22; i++) twinkles.push({ x: rnd(50, W - 50), y: rnd(130, 690), s: rnd(5, 11), p: rnd(0, TAU) })

  // ---- state ------------------------------------------------------------
  const pegs: Peg[] = []
  const balls: Ball[] = []
  const ghosts: Ghost[] = []
  const popQueue: Array<{ peg: Peg; at: number; i: number }> = []
  let level = 0
  let mode: 'play' | 'win' = 'play'
  let ballsLeft = 10
  let score = 0
  let shown = 0
  let remaining = 0
  let totalOrange = 0
  let mult = 1
  let chain = 0
  let nextId = 1
  let acc = 0
  let refilling = false

  let aiming: number | null = null
  let aimTarget = Math.PI / 2
  let aimA = Math.PI / 2
  let tickA = aimA
  let lastTouchAt = -10
  let touched = false
  let reloadAt = 0
  let hinted: Peg | null = null
  let hintedAt = -10

  let slow = 1
  let zoom = 1
  let camX = CX
  let camY = H / 2
  let focusX = CX
  let focusY = H / 2
  let fever = false
  let feverHeld = 0
  let drum = 0
  let winAt = 0
  let rainbow = 0
  let rainbowAlpha = 0

  let bucketPhase = stage.rand() * TAU
  let bucketX = CX
  const bucketSq = spring(1, 260, 9)
  let bucketMood: Mood = 'happy'
  let bucketMoodUntil = 0

  const recoil = spring(0, 200, 13)
  const cannonSq = spring(1, 240, 10)
  const hatWob = spring(0, 120, 6)
  const rackShift = spring(0, 170, 16)
  const scorePop = spring(1, 300, 12)
  const multPop = spring(1, 260, 9)
  let cannonShut = 0

  const preview: Preview = { pts: new Float32Array(800), n: 0, bounceAt: -1, target: null }

  // World to screen, for fx while the camera is zoomed.
  const sx = (x: number) => (x - camX) * zoom + W / 2
  const sy = (y: number) => (y - camY) * zoom + H / 2

  const noteStep = () => {
    const n = chain - 1
    return n <= 15 ? n - 5 : 10 + ((n - 16) % 3) - 1
  }

  const addScore = (kind: Kind, x: number, y: number, show: boolean) => {
    const pts = POINTS[kind] * mult
    score += pts
    scorePop.value = 1.18
    if (show) fx.text(sx(x), sy(y) - 30, `+${pts}`, { color: kind === 'purple' ? '#ffc1ee' : '#ffd27a', size: kind === 'purple' ? 46 : 26 + Math.min(mult, 5) * 3, life: 0.8, rise: 50 })
  }

  // ---- level ------------------------------------------------------------
  const build = () => {
    pegs.length = 0
    popQueue.length = 0
    const spots = LAYOUTS[level % LAYOUTS.length]!()
    for (const s of spots) {
      pegs.push({
        kind: s.bumper ? 'bumper' : 'blue',
        x: s.x,
        y: s.y,
        r: s.bumper ? BUMP_R : PEG_R,
        orbit: s.orbit ? { ...s.orbit } : null,
        lit: false,
        litAt: -10,
        by: 0,
        hits: 0,
        gone: false,
        grow: 0,
        delay: 0.05 + (s.x / W) * 0.55 + Math.random() * 0.08,
        pop: 0,
        seed: Math.random() * 10,
        bounce: spring(1, 300, 9),
      })
    }
    // Deal colours: oranges spread across the board, then the specials.
    const plain = pegs.filter((p) => p.kind === 'blue')
    for (let i = plain.length - 1; i > 0; i--) {
      const j = Math.floor(stage.rand() * (i + 1))
      const tmp = plain[i]!
      plain[i] = plain[j]!
      plain[j] = tmp
    }
    // Two oranges a straight shot can reach go first, so the very first aimed
    // tap scores and the idle hint has a clear line to point along.
    const easy = plain.filter((p) => {
      runPreview(aimAt(p.x, p.y))
      return preview.target === p
    })
    for (const p of easy.slice(0, 2)) {
      plain.splice(plain.indexOf(p), 1)
      plain.unshift(p)
    }
    totalOrange = Math.min(Math.floor(plain.length * 0.3), level === 0 ? 8 : Math.min(15, 10 + level))
    const oranges: Peg[] = []
    for (const p of plain) {
      if (oranges.length >= totalOrange) break
      // Not too clumped: keep oranges a little apart when there is room.
      if (oranges.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < 120)) continue
      oranges.push(p)
    }
    for (const p of plain) {
      if (oranges.length >= totalOrange) break
      if (!oranges.includes(p)) oranges.push(p)
    }
    for (const p of oranges) p.kind = 'orange'
    const rest = plain.filter((p) => p.kind === 'blue')
    if (rest[0]) rest[0].kind = 'green'
    if (rest[1]) rest[1].kind = 'green'
    if (rest[2]) rest[2].kind = 'purple'
    remaining = totalOrange
    mult = 1
    chain = 0
  }

  const lastOrange = (): Peg | null => {
    for (const p of pegs) if (p.kind === 'orange' && !p.lit && !p.gone) return p
    return null
  }

  const popPeg = (p: Peg, i: number) => {
    if (p.gone) return
    p.gone = true
    const col = COLORS[p.kind]
    fx.burst(sx(p.x), sy(p.y), { count: p.kind === 'bumper' ? 16 : 7, color: col.spark, speed: 240, life: 0.45, size: 8, shape: i % 2 === 0 ? 'circle' : 'star', gravity: 300 })
    sfx.pop(clamp(i, 0, 12))
  }

  const queuePops = (list: Peg[], gap: number, from = 0) => {
    list.forEach((peg, i) => popQueue.push({ peg, at: stage.time + from + i * gap, i }))
  }

  const rackX = (i: number) => 504 - i * 33

  const sendBall = (x: number, y: number, wait: number) => {
    ghosts.push({ x0: x, y0: y, t: 0, wait })
  }

  const setBucketMood = (mood: Mood, seconds: number) => {
    bucketMood = mood
    bucketMoodUntil = stage.time + seconds
  }

  const refill = () => {
    refilling = false
    if (ballsLeft > 0 || mode !== 'play') return
    bucketSq.value = 0.72
    setBucketMood('wow', 1)
    sfx.slideUp()
    sfx.boing(0)
    fx.burst(bucketX, BUCKET_Y, { count: 18, color: ['#7dff9c', '#d6ffdf', '#ffffff'], speed: 420, angle: -Math.PI / 2, spread: 1.2, life: 0.7, size: 10, gravity: 500 })
    for (let i = 0; i < 6; i++) sendBall(bucketX, BUCKET_Y - 10, i * 0.07)
    // Some spent blue pegs grow back so there is always something to hit.
    const spent = pegs.filter((p) => p.gone && p.kind === 'blue')
    for (let i = 0; i < Math.min(8, spent.length); i++) {
      const p = spent[Math.floor(stage.rand() * spent.length)]!
      if (!p.gone) continue
      p.gone = false
      p.lit = false
      p.hits = 0
      p.grow = 0
      p.delay = 0.2 + i * 0.05
    }
  }

  // One ball's run is over: praise a long chain, and a very long one earns a ball.
  const praise = (b: Ball) => {
    if (mode !== 'play') return
    const x = clamp(b.x, 220, W - 220)
    if (b.lit >= 14) {
      fx.text(x, 560, 'AMAZING!', { color: '#ff9af0', size: 84, life: 1.3 })
      fx.text(x, 630, 'FREE BALL!', { color: '#b6ffc4', size: 40, life: 1.2 })
      fx.confetti(x, 520, 50)
      sfx.fanfare()
      sendBall(x, 600, 0.2)
    } else if (b.lit >= 10) {
      fx.text(x, 580, 'SUPER!', { color: '#9bf6ff', size: 72, life: 1.1 })
      fx.confetti(x, 540, 26)
      sfx.win()
    } else if (b.lit >= 6) {
      fx.text(x, 600, 'NICE!', { color: '#fff36b', size: 54, life: 0.9 })
      sfx.coin(2)
    }
  }

  const endRally = () => {
    chain = 0
    if (mode === 'play' && ballsLeft <= 0 && ghosts.length === 0 && !refilling) {
      refilling = true
      stage.after(0.35, refill)
    }
  }

  const nextLevel = () => {
    level++
    mode = 'play'
    balls.length = 0
    fever = false
    build()
    ballsLeft = Math.max(10, Math.min(12, ballsLeft + 2))
    sfx.whoosh()
    for (let i = 0; i < 6; i++) stage.after(0.08 + i * 0.09, () => sfx.note(i - 3, 0.18, 'sine', 0.14))
    stage.tween(0.8, (t) => (rainbowAlpha = 1 - t), ease.inQuad)
  }

  const win = (p: Peg) => {
    mode = 'win'
    winAt = stage.time
    fever = false
    focusX = p.x
    focusY = p.y
    fx.hitstop(110)
    fx.flash('#ffffff', 0.8, 0.35)
    fx.shake(18, 0.5)
    sfx.fanfare()
    sfx.thud(1)
    fx.burst(sx(p.x), sy(p.y), { count: 46, color: RAINBOW, speed: 760, life: 1.1, size: 13, shape: 'star', gravity: 380 })
    fx.confetti(CX, 260, 90)
    fx.text(CX, 300, 'HOORAY!', { color: '#fff36b', size: 110, life: 2.2, rise: 40 })
    setBucketMood('yum', 3)
    rainbow = 0
    rainbowAlpha = 1
    stage.tween(1.5, (t) => (rainbow = t), ease.outCubic)
    for (let i = 0; i < 12; i++) {
      stage.after(0.45 + i * 0.2, () => {
        const x = rnd(140, W - 140)
        const y = rnd(150, 520)
        fx.burst(x, y, { count: 26, color: [RAINBOW[i % 6]!, '#ffffff'], speed: 460, life: 0.9, size: 10, shape: i % 2 === 0 ? 'star' : 'spark', gravity: 260, drag: 0.95 })
        fx.ring(x, y, RAINBOW[i % 6]!, 90, 0.5)
        sfx.pop(i % 9)
        if (i % 3 === 0) sfx.ding(i % 7)
      })
    }
    stage.after(0.9, () => {
      const left = pegs.filter((q) => !q.gone).sort((a, b) => a.x - b.x)
      for (const q of left) if (q.kind !== 'bumper' && !q.lit) score += 50
      scorePop.value = 1.3
      queuePops(left, Math.min(0.035, 1.2 / Math.max(1, left.length)))
    })
    stage.after(3.1, nextLevel)
  }

  const setMult = () => {
    const f = remaining / Math.max(1, totalOrange)
    const m = f <= 0.15 ? 10 : f <= 0.35 ? 5 : f <= 0.55 ? 3 : f <= 0.75 ? 2 : 1
    if (m > mult && remaining > 0) {
      mult = m
      multPop.value = 1.9
      fx.text(W - 210, 112, `x${m}!`, { color: '#ffe14d', size: 52, life: 1 })
      sfx.coin(m)
    }
  }

  const hitPeg = (p: Peg, b: Ball, nx: number, ny: number, impact: number) => {
    const now = stage.time
    if (p.kind === 'bumper') {
      const out = b.vx * nx + b.vy * ny
      if (out < 640) {
        b.vx += nx * (640 - out)
        b.vy += ny * (640 - out)
      }
      if (now - p.litAt > 0.08) {
        p.litAt = now
        p.by = b.id
        p.bounce.value = 1.35
        p.pop = 1
        chain++
        addScore('bumper', p.x, p.y, false)
        sfx.boing(clamp(noteStep(), -5, 6))
        fx.ring(sx(p.x), sy(p.y), '#ffc0cb', 70, 0.3)
        fx.burst(sx(p.x + nx * p.r), sy(p.y + ny * p.r), { count: 8, color: COLORS.bumper.spark, speed: 320, life: 0.35, size: 8, shape: 'star' })
        fx.shake(3, 0.12)
      }
      return
    }
    if (p.lit) {
      p.hits++
      if (impact > 90) {
        p.pop = 0.6
        sfx.tone({ freq: sfx.scale(clamp(noteStep(), -5, 10)), dur: 0.05, type: 'sine', vol: 0.06 })
      }
      if (p.hits >= 3) popPeg(p, 0)
      return
    }
    p.lit = true
    p.litAt = now
    p.by = b.id
    p.pop = 1
    b.lit++
    chain++
    const st = noteStep()
    sfx.note(st, 0.28, 'triangle', 0.2)
    const col = COLORS[p.kind]
    fx.burst(sx(p.x + nx * p.r), sy(p.y + ny * p.r), { count: 6, color: col.spark, speed: 260, life: 0.4, size: 7, shape: 'spark', angle: Math.atan2(ny, nx), spread: 2 })
    if (p.kind === 'orange') {
      remaining--
      addScore('orange', p.x, p.y, true)
      sfx.ding(clamp(st, -5, 6))
      fx.ring(sx(p.x), sy(p.y), '#ffd27a', 60, 0.35)
      if (remaining === 0) win(p)
      else setMult()
    } else if (p.kind === 'green') {
      addScore('green', p.x, p.y, false)
      sfx.zap()
      sfx.pop(4)
      fx.text(sx(p.x), sy(p.y) - 40, 'SPLIT!', { color: '#b6ffc4', size: 38, life: 0.8 })
      fx.ring(sx(p.x), sy(p.y), '#b6ffc4', 80, 0.35)
      const sp = Math.max(460, Math.hypot(b.vx, b.vy))
      const a = Math.atan2(b.vy, b.vx)
      b.vx = Math.cos(a - 0.5) * sp
      b.vy = Math.sin(a - 0.5) * sp
      balls.push({ id: nextId++, x: b.x, y: b.y, vx: Math.cos(a + 0.5) * sp, vy: Math.sin(a + 0.5) * sp, age: 0, still: 0, lit: 0, dead: false, wallAt: 0, trail: [] })
    } else if (p.kind === 'purple') {
      addScore('purple', p.x, p.y, true)
      sfx.win()
      fx.text(sx(p.x), sy(p.y) - 70, 'BONUS!', { color: '#ffc1ee', size: 50, life: 1 })
      fx.burst(sx(p.x), sy(p.y), { count: 30, color: ['#fff36b', '#ffc1ee', '#ffffff'], speed: 560, life: 0.9, size: 12, shape: 'star', gravity: 500 })
      fx.shake(6, 0.2)
    } else {
      addScore('blue', p.x, p.y, false)
    }
  }

  const retire = (b: Ball, caught = false) => {
    b.dead = true
    if (!caught) praise(b)
    const mine = pegs.filter((p) => p.by === b.id && p.lit && !p.gone && p.kind !== 'bumper').sort((a, c) => a.litAt - c.litAt)
    queuePops(mine, 0.05, 0.05)
  }

  const stepBall = (b: Ball, h: number) => {
    b.vy += G * h
    const sp = Math.hypot(b.vx, b.vy)
    if (sp > 1400) {
      b.vx *= 1400 / sp
      b.vy *= 1400 / sp
    }
    b.x += b.vx * h
    b.y += b.vy * h
    b.age += h
    if (b.x < XL || b.x > XR) {
      const left = b.x < XL
      b.x = left ? XL : XR
      if (left ? b.vx < 0 : b.vx > 0) {
        b.vx = -b.vx * 0.82
        if (stage.time - b.wallAt > 0.12 && Math.abs(b.vx) > 90) {
          b.wallAt = stage.time
          sfx.tone({ freq: 190, to: 140, dur: 0.06, type: 'sine', vol: 0.12 })
          fx.burst(sx(left ? 28 : W - 28), sy(b.y), { count: 4, color: '#c9b5ff', speed: 160, life: 0.3, size: 6, angle: left ? 0 : Math.PI, spread: 1.6 })
        }
      }
    }
    if (b.y < TOP && b.vy < 0) {
      b.y = TOP
      b.vy = -b.vy * 0.6
    }
    for (const p of pegs) {
      if (p.gone || p.grow < 0.6) continue
      const rr = p.r + BALL_R
      const dx = b.x - p.x
      const dy = b.y - p.y
      if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue
      const d2 = dx * dx + dy * dy
      if (d2 >= rr * rr) continue
      const d = Math.sqrt(d2) || 0.01
      const nx = dx / d
      const ny = dy / d
      b.x = p.x + nx * rr
      b.y = p.y + ny * rr
      const vn = b.vx * nx + b.vy * ny
      if (vn < 0) {
        const e = 0.8
        b.vx -= (1 + e) * vn * nx
        b.vy -= (1 + e) * vn * ny
        // A whisker of spin so nothing bounces on the spot for ever.
        const j = rnd(-0.035, 0.035)
        const c = Math.cos(j)
        const s = Math.sin(j)
        const vx = b.vx * c - b.vy * s
        b.vy = b.vx * s + b.vy * c
        b.vx = vx
      }
      hitPeg(p, b, nx, ny, -vn)
    }
    // The cauldron's rims bounce; its mouth swallows.
    for (const side of [-1, 1]) {
      const rx = bucketX + side * BUCKET_HALF
      const ry = BUCKET_Y + 4
      const rr = RIM_R + BALL_R
      const dx = b.x - rx
      const dy = b.y - ry
      const d2 = dx * dx + dy * dy
      if (d2 >= rr * rr) continue
      const d = Math.sqrt(d2) || 0.01
      const nx = dx / d
      const ny = dy / d
      b.x = rx + nx * rr
      b.y = ry + ny * rr
      const vn = b.vx * nx + b.vy * ny
      if (vn < 0) {
        b.vx -= 1.55 * vn * nx
        b.vy -= 1.55 * vn * ny
        if (-vn > 120) {
          sfx.tone({ freq: 520, to: 380, dur: 0.07, type: 'triangle', vol: 0.14 })
          bucketSq.value = 0.9
        }
      }
    }
    if (b.vy > 0 && b.y > BUCKET_Y + 14 && b.y < BUCKET_Y + 50 && Math.abs(b.x - bucketX) < BUCKET_HALF - 10) {
      retire(b, true)
      bucketSq.value = 0.72
      setBucketMood('yum', 1.4)
      sfx.win()
      sfx.splat()
      fx.burst(sx(b.x), sy(BUCKET_Y), { count: 20, color: ['#7dff9c', '#d6ffdf', '#ffffff'], speed: 460, angle: -Math.PI / 2, spread: 1.4, life: 0.7, size: 10, gravity: 700 })
      fx.confetti(sx(bucketX), sy(BUCKET_Y - 40), 30)
      fx.text(sx(bucketX), sy(BUCKET_Y - 70), 'FREE BALL!', { color: '#b6ffc4', size: 46, life: 1.1 })
      sendBall(bucketX, BUCKET_Y - 10, 0.15)
      return
    }
    if (b.y > H + 30) {
      retire(b)
      sfx.tone({ freq: 360, to: 110, dur: 0.22, type: 'sine', vol: 0.16 })
      fx.burst(sx(clamp(b.x, 40, W - 40)), sy(H - 6), { count: 9, color: ['#c9b5ff', '#ffffff'], speed: 300, angle: -Math.PI / 2, spread: 1.3, life: 0.5, size: 8, gravity: 600 })
      if (mode === 'play' && Math.abs(b.x - bucketX) < 150) setBucketMood('wow', 0.7)
      return
    }
    // Unstick: a ball that has come to rest pops what it is resting on.
    if (sp < 45) b.still += h
    else b.still = Math.max(0, b.still - h * 0.5)
    if (b.still > 0.45 || b.age > 14) {
      b.still = 0
      for (const p of pegs) {
        if (p.gone || p.kind === 'bumper' || !p.lit) continue
        if (b.age > 14 || Math.hypot(p.x - b.x, p.y - b.y) < p.r + BALL_R + 6) popPeg(p, 0)
      }
      b.vx += rnd(-120, 120)
      if (b.age > 14) b.age = 8
    }
  }

  // ---- aiming -----------------------------------------------------------
  const aimAt = (x: number, y: number): number => {
    const dx = x - CX
    const dy = y - CY
    const ax = Math.abs(dx)
    let th: number
    if (ax < 2) th = Math.PI / 2
    else {
      const k = (G * ax * ax) / (2 * V0 * V0)
      const disc = ax * ax - 4 * k * (k - dy)
      th = disc >= 0 ? Math.atan((-ax + Math.sqrt(disc)) / (2 * k)) : Math.atan2(dy, ax)
    }
    th = clamp(th, -0.28, Math.PI / 2)
    return dx >= 0 ? th : Math.PI - th
  }

  const runPreview = (a: number) => {
    let x = CX
    let y = CY
    let vx = Math.cos(a) * V0
    let vy = Math.sin(a) * V0
    const h = 1 / 120
    preview.n = 0
    preview.bounceAt = -1
    preview.target = null
    let after = 0
    for (let i = 0; i < 380; i++) {
      vy += G * h
      x += vx * h
      y += vy * h
      let bounced = false
      if (x < XL || x > XR) {
        x = x < XL ? XL : XR
        vx = -vx * 0.82
        bounced = true
      }
      if (y < TOP && vy < 0) {
        y = TOP
        vy = -vy * 0.6
        bounced = true
      }
      for (const p of pegs) {
        if (p.gone) continue
        const rr = p.r + BALL_R
        const dx = x - p.x
        const dy = y - p.y
        const d2 = dx * dx + dy * dy
        if (d2 >= rr * rr) continue
        const d = Math.sqrt(d2) || 0.01
        const nx = dx / d
        const ny = dy / d
        x = p.x + nx * rr
        y = p.y + ny * rr
        const vn = vx * nx + vy * ny
        if (vn < 0) {
          vx -= 1.8 * vn * nx
          vy -= 1.8 * vn * ny
          if (p.kind === 'bumper') {
            const out = vx * nx + vy * ny
            if (out < 640) {
              vx += nx * (640 - out)
              vy += ny * (640 - out)
            }
          }
        }
        if (preview.bounceAt < 0) preview.target = p
        bounced = true
      }
      if (preview.n < 400) {
        preview.pts[preview.n * 2] = x
        preview.pts[preview.n * 2 + 1] = y
        preview.n++
      }
      if (bounced && preview.bounceAt < 0) preview.bounceAt = preview.n
      if (preview.bounceAt >= 0 && ++after > 26) break
      if (y > H - 20) break
    }
  }

  const fire = () => {
    const now = stage.time
    if (mode !== 'play' || ballsLeft <= 0 || balls.length >= MAX_FLY || now < reloadAt) {
      // Not ready: a dry click and a shake of the hat, never silence.
      sfx.tick()
      sfx.tone({ freq: 240, to: 200, dur: 0.06, type: 'triangle', vol: 0.1 })
      hatWob.kick(9)
      fx.burst(CX + Math.cos(aimA) * 84, CY + Math.sin(aimA) * 84, { count: 4, color: '#d9d0ff', speed: 120, life: 0.35, size: 8 })
      return
    }
    ballsLeft--
    rackShift.value = -33
    reloadAt = now + 0.28
    aimA = aimTarget
    const a = aimTarget
    balls.push({ id: nextId++, x: CX, y: CY, vx: Math.cos(a) * V0, vy: Math.sin(a) * V0, age: 0, still: 0, lit: 0, dead: false, wallAt: 0, trail: [] })
    recoil.value = 1
    cannonSq.value = 0.8
    hatWob.kick(-14 * Math.cos(a) - 5)
    cannonShut = 0.18
    sfx.thud(0.55)
    sfx.tone({ freq: 260, to: 880, dur: 0.12, type: 'triangle', vol: 0.2 })
    sfx.noise({ dur: 0.12, freq: 900, to: 3000, vol: 0.12 })
    const mx = CX + Math.cos(a) * 88
    const my = CY + Math.sin(a) * 88
    fx.burst(mx, my, { count: 12, color: ['#ffffff', '#ffe9a8', '#d9d0ff'], speed: 330, angle: a, spread: 1.1, life: 0.45, size: 11, drag: 0.92 })
    fx.ring(mx, my, '#ffe9a8', 46, 0.22)
    fx.shake(3, 0.1)
  }

  build()

  // ---- drawing ----------------------------------------------------------
  const drawPeg = (g: CanvasRenderingContext2D, p: Peg, t: number, lookX: number, lookY: number, hasLook: boolean) => {
    if (p.gone || p.grow <= 0) return
    const appear = ease.outBack(p.grow)
    if (p.kind === 'bumper') {
      const k = appear * p.bounce.value * (1 + Math.sin(t * 3 + p.seed) * 0.03)
      const r = BUMP_R * k
      circle(g, p.x + 3, p.y + 5, r, 'rgba(8,4,30,0.35)')
      circle(g, p.x, p.y, r, '#ff4f6d', '#ffffff', 5)
      circle(g, p.x, p.y, r * 0.72, '#ff7d93')
      g.fillStyle = 'rgba(255,255,255,0.6)'
      g.beginPath()
      g.ellipse(p.x - r * 0.4, p.y - r * 0.5, r * 0.25, r * 0.14, -0.6, 0, TAU)
      g.fill()
      const dx = hasLook ? clamp((lookX - p.x) / 200, -1, 1) : Math.sin(t * 0.7 + p.seed)
      const dy = hasLook ? clamp((lookY - p.y) / 200, -1, 1) : 0
      face(g, p.x, p.y - r * 0.12, r * 0.24, stage.time - p.litAt < 0.35 ? 'wow' : 'happy', dx, dy, blinkAt(t, p.seed))
      return
    }
    const target = p.kind === 'orange' && !p.lit
    const idle = target ? 1 + Math.sin(t * 3.2 + p.seed) * 0.05 : 1 + Math.sin(t * 2 + p.x * 0.012) * 0.025
    const k = appear * idle * (1 + p.pop * 0.4)
    const img = orbs[p.kind][p.lit ? 1 : 0]
    const size = ORB * k
    g.drawImage(img, p.x - size / 2, p.y - size / 2, size, size)
    if (p.kind === 'orange' && p.grow > 0.9) {
      const dx = hasLook ? clamp((lookX - p.x) / 160, -1, 1) : Math.sin(t * 0.8 + p.seed)
      const dy = hasLook ? clamp((lookY - p.y) / 160, -1, 1) : Math.cos(t * 0.6 + p.seed) * 0.4
      eyes(g, p.x, p.y + 1, (p.lit ? 6.6 : 5.6) * k, dx, dy, p.lit ? 0 : blinkAt(t, p.seed), 1.12)
    }
  }

  const drawBall = (g: CanvasRenderingContext2D, b: Ball, hot: boolean) => {
    const n = b.trail.length / 2
    for (let i = 0; i < n; i++) {
      const f = (i + 1) / (n + 1)
      g.globalAlpha = f * 0.45
      g.fillStyle = hot ? RAINBOW[(i + Math.floor(stage.time * 20)) % 6]! : '#bfe9ff'
      g.beginPath()
      g.arc(b.trail[i * 2]!, b.trail[i * 2 + 1]!, BALL_R * (0.35 + f * 0.6), 0, TAU)
      g.fill()
    }
    g.globalAlpha = 1
    const sp = Math.hypot(b.vx, b.vy)
    const st = 1 + Math.min(0.28, sp / 4200)
    g.save()
    g.translate(b.x, b.y)
    g.rotate(Math.atan2(b.vy, b.vx))
    g.scale(st, 1 / st)
    g.drawImage(ballArt, -BALL_PX / 2, -BALL_PX / 2, BALL_PX, BALL_PX)
    g.restore()
  }

  const drawBucketBack = (g: CanvasRenderingContext2D, t: number) => {
    const x = bucketX
    ellipse(g, x, BUCKET_Y + 6, BUCKET_HALF + 6, 17, '#160b2e')
    ellipse(g, x, BUCKET_Y + 10, BUCKET_HALF - 8, 11, '#58e07c')
    ellipse(g, x - 14, BUCKET_Y + 8, 26, 5, '#a9ffbd')
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.9 + i * 0.37) % 1
      g.globalAlpha = 1 - ph
      circle(g, x + (i - 1) * 30 + Math.sin(t * 2 + i) * 6, BUCKET_Y + 4 - ph * 34, 4 + i * 2, 'rgba(169,255,189,0.85)', '#ffffff', 2)
    }
    g.globalAlpha = 1
  }

  const drawBucketFront = (g: CanvasRenderingContext2D, t: number, lookX: number, lookY: number, hasLook: boolean) => {
    const x = bucketX
    const [kx, ky] = [1 / Math.sqrt(bucketSq.value), bucketSq.value]
    squash(g, x, H, kx, ky, () => {
      g.fillStyle = '#3a2470'
      g.strokeStyle = '#140830'
      g.lineWidth = 5
      g.beginPath()
      g.moveTo(x - BUCKET_HALF - 8, BUCKET_Y + 6)
      g.bezierCurveTo(x - BUCKET_HALF - 30, BUCKET_Y + 60, x - BUCKET_HALF + 6, H + 6, x, H + 6)
      g.bezierCurveTo(x + BUCKET_HALF - 6, H + 6, x + BUCKET_HALF + 30, BUCKET_Y + 60, x + BUCKET_HALF + 8, BUCKET_Y + 6)
      g.ellipse(x, BUCKET_Y + 6, BUCKET_HALF + 8, 18, 0, 0, Math.PI)
      g.closePath()
      g.fill()
      g.stroke()
      // Lip.
      g.strokeStyle = '#8f6be0'
      g.lineWidth = 9
      g.beginPath()
      g.ellipse(x, BUCKET_Y + 6, BUCKET_HALF + 8, 18, 0, 0.04, Math.PI - 0.04)
      g.stroke()
      circle(g, x - BUCKET_HALF - 4, BUCKET_Y + 4, RIM_R, '#b79bff', '#140830', 3)
      circle(g, x + BUCKET_HALF + 4, BUCKET_Y + 4, RIM_R, '#b79bff', '#140830', 3)
      g.fillStyle = 'rgba(255,255,255,0.14)'
      g.beginPath()
      g.ellipse(x - 46, BUCKET_Y + 48, 12, 22, 0.3, 0, TAU)
      g.fill()
      const mood: Mood = stage.time < bucketMoodUntil ? bucketMood : 'happy'
      const dx = hasLook ? clamp((lookX - x) / 260, -1, 1) : Math.cos(bucketPhase)
      const dy = hasLook ? clamp((lookY - BUCKET_Y) / 300, -1, 0.3) : -0.3
      face(g, x, BUCKET_Y + 44, 9, mood, dx, dy, blinkAt(t, 3))
    })
  }

  const drawCannon = (g: CanvasRenderingContext2D, t: number) => {
    const bob = Math.sin(t * 2.2) * 2
    const y = CY + bob
    g.save()
    g.translate(CX, y)
    g.rotate(aimA)
    const len = 88 - recoil.value * 26
    rrect(g, 0, -23, len, 46, 12, '#f2b632', '#6b3d00', 4)
    rrect(g, 34, -23, 12, 46, 3, '#d9621e')
    rrect(g, len - 18, -29, 24, 58, 10, '#ffd75e', '#6b3d00', 4)
    g.fillStyle = 'rgba(255,255,255,0.45)'
    g.fillRect(10, -17, len - 34, 6)
    g.restore()
    const [kx, ky] = [1 / Math.sqrt(cannonSq.value), cannonSq.value]
    squash(g, CX, y, kx, ky, () => {
      circle(g, CX, y, 50, '#7b4dff', '#22105e', 5)
      g.fillStyle = 'rgba(255,255,255,0.28)'
      g.beginPath()
      g.ellipse(CX - 20, y - 24, 16, 9, -0.6, 0, TAU)
      g.fill()
      const lx = Math.cos(aimA)
      const ly = Math.sin(aimA)
      const shut = cannonShut > 0 ? 0.9 : blinkAt(t, 1)
      circle(g, CX - 30 + lx * 5, y + 6 + ly * 3, 7, 'rgba(255,120,170,0.55)')
      circle(g, CX + 30 + lx * 5, y + 6 + ly * 3, 7, 'rgba(255,120,170,0.55)')
      eyes(g, CX + lx * 7, y - 8 + ly * 5, 12, lx, ly, shut)
      // Wizard hat.
      g.save()
      g.translate(CX, y - 40)
      g.rotate(hatWob.value * 0.02 + Math.sin(t * 1.3) * 0.03)
      ellipse(g, 0, 0, 54, 11, '#2c1678')
      g.fillStyle = '#3d22a3'
      g.strokeStyle = '#1b0c52'
      g.lineWidth = 4
      g.beginPath()
      g.moveTo(-32, -2)
      g.quadraticCurveTo(-6, -30, 16 + hatWob.value * 0.6, -54)
      g.quadraticCurveTo(22, -24, 32, -2)
      g.closePath()
      g.fill()
      g.stroke()
      rrect(g, -32, -8, 64, 9, 4, '#ffd75e')
      star(g, 4, -24, 8, '#fff36b', t)
      g.restore()
    })
  }

  const drawPreview = (g: CanvasRenderingContext2D, alpha: number, t: number) => {
    runPreview(aimA)
    const march = Math.floor(t * 24) % 6
    const end = preview.n
    for (let i = 8; i < end; i++) {
      if ((i + 6 - march) % 6 !== 0) continue
      const past = preview.bounceAt >= 0 && i >= preview.bounceAt
      const fade = past ? 1 - (i - preview.bounceAt) / 28 : 1
      g.globalAlpha = alpha * Math.max(0, fade)
      circle(g, preview.pts[i * 2]!, preview.pts[i * 2 + 1]!, past ? 4.5 : 6.5, '#fff8c4', 'rgba(30,12,80,0.85)', 2.5)
    }
    const p = preview.target
    if (p && alpha > 0.9) {
      g.globalAlpha = 0.9
      g.strokeStyle = '#ffffff'
      g.lineWidth = 4
      g.beginPath()
      g.arc(p.x, p.y, p.r + 8 + Math.sin(t * 10) * 2, 0, TAU)
      g.stroke()
    }
    g.globalAlpha = 1
  }

  const drawHud = (g: CanvasRenderingContext2D, t: number) => {
    // Ball rack: a glass tube feeding the cannon.
    rrect(g, 84, 22, 446, 40, 20, 'rgba(255,255,255,0.1)', 'rgba(220,200,255,0.55)', 3)
    const showN = Math.min(ballsLeft, 13)
    for (let i = 0; i < showN; i++) {
      const x = rackX(i) + rackShift.value
      const y = 42 + Math.sin(t * 3 + i * 0.7) * 1.5
      g.drawImage(ballArt, x - BALL_PX / 2, y - BALL_PX / 2, BALL_PX, BALL_PX)
    }
    if (ballsLeft > 13) label(g, `+${ballsLeft - 13}`, 62, 42, 24, '#d8f6ff')
    for (const gh of ghosts) {
      if (gh.wait > 0) continue
      const k = ease.inOutQuad(gh.t)
      const tx = rackX(Math.min(ballsLeft, 12))
      const x = gh.x0 + (tx - gh.x0) * k
      const y = gh.y0 + (42 - gh.y0) * k - Math.sin(k * Math.PI) * 120
      const s = BALL_PX * (1 + Math.sin(k * Math.PI) * 0.5)
      g.drawImage(ballArt, x - s / 2, y - s / 2, s, s)
    }
    const s = scorePop.value
    label(g, String(Math.round(shown)), 92, 104, 40 * s, '#ffe27a', 'rgba(20,8,50,0.9)', 'left')
    // One dot per orange peg; they go dark as the pegs are hit.
    for (let i = 0; i < totalOrange; i++) {
      const x = W - 78 - i * 29
      const on = i < remaining
      if (on) circle(g, x, 42, 11 + Math.sin(t * 3 + i) * 0.8, '#ff8a1f', '#fff3b0', 3)
      else circle(g, x, 42, 8, 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.35)', 2)
    }
    if (mult > 1) {
      const k = multPop.value
      g.save()
      g.translate(W - 110, 106)
      g.rotate(-0.12 + Math.sin(t * 4) * 0.04)
      star(g, 0, 0, 44 * k, '#ff4fc8', t * 0.5)
      label(g, `x${mult}`, 0, 2, 30 * k, '#ffffff')
      g.restore()
    }
  }

  return {
    update(dtReal) {
      const now = stage.time
      const t = now

      // Pegs: grow in, orbit, settle.
      for (const p of pegs) {
        if (p.delay > 0) p.delay -= dtReal
        else if (p.grow < 1) {
          const was = p.grow
          p.grow = Math.min(1, p.grow + dtReal / 0.35)
          if (was === 0 && Math.random() < 0.25) sfx.tone({ freq: 500 + p.x * 0.9, dur: 0.05, type: 'sine', vol: 0.05 })
        }
        p.pop = damp(p.pop, 0, 9, dtReal)
        if (p.kind === 'bumper') p.bounce.update(dtReal)
      }

      // Slow motion when a ball closes in on the last orange peg.
      let wantSlow = 1
      let wantZoom = 1
      let near = false
      if (mode === 'play' && remaining === 1) {
        const last = lastOrange()
        if (last) {
          for (const b of balls) {
            const dx = last.x - b.x
            const dy = last.y - b.y
            const d = Math.hypot(dx, dy)
            const sp = Math.hypot(b.vx, b.vy) || 1
            // Heading for it, and on a line that passes close.
            const miss = Math.abs(dx * b.vy - dy * b.vx) / sp
            if (d < 190 && dx * b.vx + dy * b.vy > 0 && miss < 48) {
              near = true
              focusX = last.x
              focusY = last.y
            }
          }
        }
      }
      if (near) feverHeld = 0.22
      else feverHeld -= dtReal
      const inFever = mode === 'play' && feverHeld > 0 && remaining === 1
      if (inFever && !fever) {
        fever = true
        sfx.tone({ freq: 180, to: 520, dur: 0.5, type: 'sawtooth', vol: 0.07 })
      } else if (!inFever && fever) {
        fever = false
        if (mode === 'play') {
          fx.text(sx(focusX), sy(focusY) - 60, 'SO CLOSE!', { color: '#ffd27a', size: 40, life: 0.9 })
          sfx.slideDown()
        }
      }
      if (fever) {
        wantSlow = 0.2
        wantZoom = 1.5
        drum += dtReal
        if (drum > 0.065) {
          drum = 0
          sfx.noise({ dur: 0.035, freq: 1700, vol: 0.13, filter: 'bandpass', q: 1.5 })
        }
      } else if (mode === 'win' && now - winAt < 0.45) {
        wantSlow = 0.25
        wantZoom = 1.5
      }
      slow = damp(slow, wantSlow, wantSlow < slow ? 22 : 6, dtReal)
      zoom = damp(zoom, wantZoom, wantZoom > zoom ? 9 : 4, dtReal)
      const halfW = W / 2 / zoom
      const halfH = H / 2 / zoom
      const tx = clamp(focusX, halfW, W - halfW)
      const ty = clamp(focusY, halfH, H - halfH)
      const pull = zoom > 1.01 ? 10 : 100
      camX = damp(camX, zoom > 1.01 ? tx : W / 2, pull, dtReal)
      camY = damp(camY, zoom > 1.01 ? ty : H / 2, pull, dtReal)
      if (zoom <= 1.003 && wantZoom === 1) {
        zoom = 1
        camX = W / 2
        camY = H / 2
      }

      const dt = dtReal * slow
      for (const p of pegs) {
        if (!p.orbit) continue
        p.orbit.a += p.orbit.speed * dt
        p.x = p.orbit.cx + Math.cos(p.orbit.a) * p.orbit.r
        p.y = p.orbit.cy + Math.sin(p.orbit.a) * p.orbit.r
      }
      bucketPhase += dt * 0.8
      bucketX = CX + Math.sin(bucketPhase) * 410
      bucketSq.update(dtReal)

      // Balls.
      acc = Math.min(acc + dt, 0.05)
      while (acc >= STEP) {
        acc -= STEP
        for (let i = 0; i < balls.length; i++) {
          const b = balls[i]!
          if (!b.dead) stepBall(b, STEP)
        }
      }
      let removed = false
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i]!
        if (b.dead) {
          balls.splice(i, 1)
          removed = true
          continue
        }
        b.trail.push(b.x, b.y)
        if (b.trail.length > 22) b.trail.splice(0, 2)
      }
      if (removed && balls.length === 0) endRally()

      // Pegs popping in turn.
      for (let i = popQueue.length - 1; i >= 0; i--) {
        const q = popQueue[i]!
        if (q.at > now) continue
        popQueue.splice(i, 1)
        popPeg(q.peg, q.i)
      }

      // Balls flying back to the rack.
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const gh = ghosts[i]!
        if (gh.wait > 0) {
          gh.wait -= dtReal
          continue
        }
        gh.t += dtReal / 0.5
        if (gh.t >= 1) {
          ghosts.splice(i, 1)
          ballsLeft++
          rackShift.value = 10
          sfx.pop(3 + (ballsLeft % 5))
          fx.ring(rackX(Math.min(ballsLeft - 1, 12)), 42, '#d8f6ff', 34, 0.25)
        }
      }

      // Cannon follows the finger, or sways toward a target when idle.
      const idle = aiming === null && t - lastTouchAt > 2.5 && mode === 'play'
      if (idle) {
        const target = hintPeg()
        const base = target ? aimAt(target.x, target.y) : Math.PI / 2
        aimTarget = base + Math.sin(t * 1.1) * (touched && t - lastTouchAt < 5 ? 0.2 : 0.012)
      }
      aimA = damp(aimA, aimTarget, aiming !== null ? 30 : 6, dtReal)
      recoil.update(dtReal)
      cannonSq.update(dtReal)
      hatWob.update(dtReal)
      rackShift.update(dtReal)
      scorePop.update(dtReal)
      multPop.update(dtReal)
      if (cannonShut > 0) cannonShut -= dtReal
      shown = damp(shown, score, 9, dtReal)
      if (score - shown < 1) shown = score
    },

    draw(g) {
      const t = stage.time
      g.save()
      if (zoom !== 1) {
        g.translate(W / 2, H / 2)
        g.scale(zoom, zoom)
        g.translate(-camX, -camY)
      }
      g.drawImage(backdrop, 0, 0, W, H)
      for (const s of twinkles) {
        const a = 0.5 + 0.5 * Math.sin(t * 2.2 + s.p)
        g.globalAlpha = a * 0.9
        star(g, s.x, s.y, s.s * (0.6 + a * 0.5), '#fff8d0', s.p)
      }
      g.globalAlpha = 1

      if (rainbowAlpha > 0 && rainbow > 0) {
        g.globalAlpha = rainbowAlpha * 0.9
        g.lineCap = 'butt'
        g.lineWidth = 24
        for (let i = 0; i < 6; i++) {
          g.strokeStyle = RAINBOW[i]!
          g.beginPath()
          g.arc(CX, 800, 570 - i * 23, Math.PI, Math.PI + Math.PI * rainbow)
          g.stroke()
        }
        g.lineCap = 'round'
        g.globalAlpha = 1
      }

      // What everyone looks at: the nearest ball, else the finger.
      let lookX = 0
      let lookY = 0
      let hasLook = false
      const lead = balls[0]
      if (lead) {
        lookX = lead.x
        lookY = lead.y
        hasLook = true
      } else if (aiming !== null) {
        const p = stage.pointers.get(aiming)
        if (p) {
          lookX = p.x
          lookY = p.y
          hasLook = true
        }
      }

      drawBucketBack(g, t)
      for (const p of pegs) drawPeg(g, p, t, lookX, lookY, hasLook)

      if (mode === 'play' && remaining === 1) {
        const last = lastOrange()
        if (last) {
          g.strokeStyle = '#fff3b0'
          g.lineWidth = 5
          g.globalAlpha = 0.6 + Math.sin(t * 8) * 0.3
          g.beginPath()
          g.arc(last.x, last.y, PEG_R + 12 + Math.sin(t * 8) * 4, 0, TAU)
          g.stroke()
          g.globalAlpha = 1
        }
      }

      if (mode === 'play') {
        if (aiming !== null) drawPreview(g, 1, t)
        else if (t - lastTouchAt > 2.5) drawPreview(g, 0.8, t)
      }

      const hot = mode === 'win' || remaining <= 1
      for (const b of balls) drawBall(g, b, hot)
      drawBucketFront(g, t, lookX, lookY, hasLook)
      drawCannon(g, t)

      if (mode === 'play' && t - lastTouchAt > 5) {
        const target = hintPeg()
        if (target) hint(g, target.x, target.y, t, 46)
      }
      g.restore()
      drawHud(g, t)
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      touched = true
      aiming = p.id
      aimTarget = aimAt(p.x, p.y)
      tickA = aimTarget
      fx.ring(p.x, p.y, '#ffffff', 46, 0.28)
      sfx.tick()
      cannonSq.value = 0.92
      hatWob.kick(4)
      if (mode === 'win') {
        fx.burst(p.x, p.y, { count: 18, color: RAINBOW, speed: 420, life: 0.7, size: 10, shape: 'star', gravity: 300 })
        sfx.pop(Math.floor(rnd(0, 8)))
      } else {
        fx.burst(p.x, p.y, { count: 5, color: ['#ffffff', '#d9d0ff'], speed: 140, life: 0.3, size: 6, shape: 'spark' })
      }
    },
    move(p: Pointer) {
      if (p.id !== aiming) return
      lastTouchAt = stage.time
      aimTarget = aimAt(p.x, p.y)
      if (Math.abs(aimTarget - tickA) > 0.09) {
        tickA = aimTarget
        sfx.tone({ freq: 900 + Math.cos(aimTarget) * 300, dur: 0.025, type: 'square', vol: 0.04 })
      }
    },
    up(p: Pointer) {
      if (p.id !== aiming) return
      lastTouchAt = stage.time
      aimTarget = aimAt(p.x, p.y)
      aiming = null
      if (mode === 'play') fire()
    },
  }

  // The orange peg the idle cannon points at: the highest one a straight shot
  // reaches first, so the dotted line leads the eye all the way to it.
  function hintPeg(): Peg | null {
    if (hinted && !hinted.lit && !hinted.gone && stage.time - hintedAt < 0.7) return hinted
    hintedAt = stage.time
    const open = pegs.filter((p) => p.kind === 'orange' && !p.lit && !p.gone).sort((a, b) => a.y - b.y)
    hinted = open[0] ?? null
    for (const p of open) {
      runPreview(aimAt(p.x, p.y))
      if (preview.target === p) {
        hinted = p
        break
      }
    }
    return hinted
  }
}

export const proto: Proto = {
  meta: {
    key: 'peg-blaster',
    name: 'Peg Blaster',
    emoji: '🔮',
    ages: [5, 10],
    pitch: 'Aim the wizard cannon and fire a crystal ball that bounces through glowing pegs, playing a rising tune as it goes.',
    howTo: 'Drag anywhere to aim, lift to fire. Hit every orange peg. Land in the cauldron for a free ball.',
    basedOn: 'Peggle, pachinko',
    whyFun: 'One aimed shot sets off a long bounce chain with a climbing scale; the last orange peg goes slow-motion into a rainbow finish.',
  },
  create,
}
