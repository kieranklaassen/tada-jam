// Brick Buster: a paddle with a face, a ball with a trail, and pictures made of
// bricks that flinch, shatter and drop power-ups. Breakout as a juice showcase.
//
// Everything is in the field's 1180 by 820 logical pixels. Bricks are drawn
// from cached sprites and their faces are batched into a few paths, so a
// hundred bricks and twenty-seven balls stay cheap.

import { blinkAt, face, hint, label, sprite } from '../../kit/draw.ts'
import { TAU, clamp, damp, ease, rnd, rndInt, spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { LEVELS, PALETTE } from './levels.ts'
import type { Level, PowerKind } from './levels.ts'

// Brick cell and drawn size.
const CW = 62
const CH = 42
const BW = 58
const BH = 38
const GRID_TOP = 84
// Inner walls the ball bounces off.
const LEFT = 16
const RIGHT = W - 16
const TOP = 16
const PADDLE_Y = 692
const PH = 38
const PADDLE_TOP = PADDLE_Y - PH / 2
const PADDLE_W = 190
const GOO_Y = H - 54
const BALL_R = 14
const FIRE_R = 30
const MAX_BALLS = 27
// A combo lives this long between bricks: long enough for one ball to go down
// to the paddle and back, so steady play keeps the scale climbing.
const COMBO_S = 3.2
const BGP = 40
const IMG_PAD = 4
const IMG_S = 2

type Kind = 'norm' | 'tough' | 'bomb' | 'gold'

interface Brick {
  c: number
  r: number
  x: number
  y: number
  kind: Kind
  hp: number
  color: string
  img: HTMLCanvasElement | null
  // 0..1 pop-in, starting at stage.time `delay`.
  appear: number
  delay: number
  // Rotation wobble and scale pop, each a little spring.
  wob: number
  wobV: number
  pop: number
  popV: number
  // How scared (0..1) and where it is looking.
  fear: number
  lx: number
  ly: number
  seed: number
  alive: boolean
  // This frame's draw transform, shared by the body and the batched face.
  px: number
  py: number
  ps: number
  pc: number
  pn: number
}

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  stuck: boolean
  // Seconds since the last bounce (drives the squash) and since it last hit a brick.
  since: number
  idle: number
  born: number
  trail: number[]
}

interface Shard {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  w: number
  h: number
  color: string
  life: number
}

interface LooseEye {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

interface Capsule {
  x: number
  y: number
  vy: number
  kind: PowerKind
  t: number
}

interface Coin {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
}

interface Bolt {
  x: number
  y: number
}

interface Pending {
  brick: Brick
  at: number
  fromX: number
  fromY: number
}

const POWER: Record<PowerKind, { color: string; word: string }> = {
  multi: { color: '#3d8bff', word: 'MULTIBALL!' },
  fire: { color: '#ff7a2e', word: 'FIREBALL!' },
  wide: { color: '#22c98a', word: 'WIIIDE!' },
  laser: { color: '#c04dff', word: 'LASER!' },
  goo: { color: '#2aa845', word: 'GOO!' },
}
const ALL_POWERS: readonly PowerKind[] = ['multi', 'fire', 'wide', 'laser', 'goo']

const MILESTONES: Record<number, string> = {
  5: 'NICE!',
  10: 'WOW!',
  20: 'MEGA!',
  35: 'BONKERS!',
  50: 'UNSTOPPABLE!',
  75: 'BRICK-TASTIC!',
  100: 'LEGEND!',
}

// Mix a #rrggbb colour toward white (amt > 0) or black (amt < 0).
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const to = amt > 0 ? 255 : 0
  const k = Math.abs(amt)
  const ch = (v: number) => Math.round(v + (to - v) * k)
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  const canvasOf = (w: number, h: number): HTMLCanvasElement => {
    const c = document.createElement('canvas')
    c.width = Math.ceil(w)
    c.height = Math.ceil(h)
    return c
  }

  // ---- cached art -------------------------------------------------------

  const bg = canvasOf(W + BGP * 2, H + BGP * 2)
  const glow = canvasOf(256, 256)

  const paintBg = (def: Level): void => {
    const q = bg.getContext('2d')
    if (!q) return
    q.setTransform(1, 0, 0, 1, 0, 0)
    const grad = q.createLinearGradient(0, 0, 0, bg.height)
    grad.addColorStop(0, def.bg[0])
    grad.addColorStop(0.55, def.bg[1])
    grad.addColorStop(1, def.bg[2])
    q.fillStyle = grad
    q.fillRect(0, 0, bg.width, bg.height)
    q.translate(BGP, BGP)
    // Nebula clouds.
    for (let i = 0; i < 5; i++) {
      const x = stage.rand() * W
      const y = stage.rand() * H * 0.8
      const r = 180 + stage.rand() * 220
      const neb = q.createRadialGradient(x, y, 0, x, y, r)
      neb.addColorStop(0, rgba(def.glow, 0.16))
      neb.addColorStop(1, rgba(def.glow, 0))
      q.fillStyle = neb
      q.fillRect(x - r, y - r, r * 2, r * 2)
    }
    // Stars.
    for (let i = 0; i < 150; i++) {
      q.globalAlpha = 0.25 + stage.rand() * 0.7
      q.fillStyle = stage.rand() < 0.2 ? def.glow : '#ffffff'
      q.beginPath()
      q.arc(stage.rand() * W, stage.rand() * H, 0.8 + stage.rand() * 1.8, 0, TAU)
      q.fill()
    }
    q.globalAlpha = 1
    // A big planet peeking over the bottom-right corner, and a small ringed one.
    const px = W - 130
    const py = H + 70
    const planet = q.createRadialGradient(px - 80, py - 110, 20, px, py, 250)
    planet.addColorStop(0, shade(def.bg[2], 0.45))
    planet.addColorStop(1, shade(def.bg[2], -0.2))
    q.fillStyle = planet
    q.beginPath()
    q.arc(px, py, 240, 0, TAU)
    q.fill()
    q.fillStyle = 'rgba(0,0,0,0.12)'
    for (const [cx, cy, cr] of [
      [-90, -150, 34],
      [40, -185, 20],
      [-170, -70, 22],
      [70, -100, 28],
    ] as const) {
      q.beginPath()
      q.ellipse(px + cx, py + cy, cr, cr * 0.7, -0.4, 0, TAU)
      q.fill()
    }
    q.save()
    q.translate(86, 600)
    q.rotate(-0.35)
    q.strokeStyle = rgba(def.glow, 0.55)
    q.lineWidth = 5
    q.beginPath()
    q.ellipse(0, 0, 58, 14, 0, 0, TAU)
    q.stroke()
    q.fillStyle = shade(def.bg[1], 0.4)
    q.beginPath()
    q.arc(0, 0, 30, 0, TAU)
    q.fill()
    q.beginPath()
    q.ellipse(0, 0, 58, 14, 0, 0, Math.PI)
    q.stroke()
    q.restore()
    // Neon tube walls.
    q.shadowColor = def.glow
    q.shadowBlur = 22
    q.strokeStyle = shade(def.glow, 0.45)
    q.lineWidth = 8
    q.lineCap = 'round'
    q.lineJoin = 'round'
    q.beginPath()
    q.moveTo(LEFT - 7, H + BGP)
    q.lineTo(LEFT - 7, TOP + 20)
    q.quadraticCurveTo(LEFT - 7, TOP - 7, LEFT + 20, TOP - 7)
    q.lineTo(RIGHT - 20, TOP - 7)
    q.quadraticCurveTo(RIGHT + 7, TOP - 7, RIGHT + 7, TOP + 20)
    q.lineTo(RIGHT + 7, H + BGP)
    q.stroke()
    q.shadowBlur = 0

    const gq = glow.getContext('2d')
    if (gq) {
      gq.clearRect(0, 0, 256, 256)
      const gg = gq.createRadialGradient(128, 128, 0, 128, 128, 128)
      gg.addColorStop(0, rgba(def.glow, 0.9))
      gg.addColorStop(0.5, rgba(def.glow, 0.3))
      gg.addColorStop(1, rgba(def.glow, 0))
      gq.fillStyle = gg
      gq.fillRect(0, 0, 256, 256)
    }
  }

  const IMG_W = BW + IMG_PAD * 2
  const IMG_H = BH + IMG_PAD * 2
  const brickImgs = new Map<string, HTMLCanvasElement>()
  const brickImg = (color: string, tough: boolean): HTMLCanvasElement => {
    const id = color + (tough ? 't' : '')
    let c = brickImgs.get(id)
    if (c) return c
    c = canvasOf(IMG_W * IMG_S, IMG_H * IMG_S)
    const q = c.getContext('2d')
    if (q) {
      q.scale(IMG_S, IMG_S)
      q.translate(IMG_PAD, IMG_PAD)
      q.fillStyle = shade(color, -0.5)
      q.beginPath()
      q.roundRect(0, 0, BW, BH, 11)
      q.fill()
      q.fillStyle = shade(color, -0.22)
      q.beginPath()
      q.roundRect(2, 2, BW - 4, BH - 4, 9)
      q.fill()
      q.fillStyle = color
      q.beginPath()
      q.roundRect(2, 2, BW - 4, BH - 9, 9)
      q.fill()
      q.fillStyle = shade(color, 0.45)
      q.beginPath()
      q.roundRect(7, 5, BW - 14, 6, 3)
      q.fill()
      if (tough) {
        // A steel frame with rivets and cross brows: this one takes two hits.
        q.strokeStyle = '#dfe7f7'
        q.lineWidth = 4
        q.beginPath()
        q.roundRect(3, 3, BW - 6, BH - 6, 8)
        q.stroke()
        q.strokeStyle = '#8b96b3'
        q.lineWidth = 1.5
        q.beginPath()
        q.roundRect(5.5, 5.5, BW - 11, BH - 11, 6)
        q.stroke()
        q.fillStyle = '#ffffff'
        for (const [rx, ry] of [
          [6, 6],
          [BW - 6, 6],
          [6, BH - 6],
          [BW - 6, BH - 6],
        ] as const) {
          q.beginPath()
          q.arc(rx, ry, 2.4, 0, TAU)
          q.fill()
        }
        q.strokeStyle = '#1e1428'
        q.lineWidth = 3
        q.lineCap = 'round'
        q.beginPath()
        q.moveTo(BW / 2 - 17, 5)
        q.lineTo(BW / 2 - 5, 9)
        q.moveTo(BW / 2 + 17, 5)
        q.lineTo(BW / 2 + 5, 9)
        q.stroke()
      }
    }
    brickImgs.set(id, c)
    return c
  }

  // Balls are drawn from two sprites (normal and fire) designed at radius 20.
  const ballImg = (core: readonly [string, string, string], halo: string): HTMLCanvasElement => {
    const c = canvasOf(120, 120)
    const q = c.getContext('2d')
    if (q) {
      const h = q.createRadialGradient(60, 60, 12, 60, 60, 58)
      h.addColorStop(0, rgba(halo, 0.55))
      h.addColorStop(1, rgba(halo, 0))
      q.fillStyle = h
      q.fillRect(0, 0, 120, 120)
      const b = q.createRadialGradient(53, 52, 2, 60, 60, 20)
      b.addColorStop(0, core[0])
      b.addColorStop(0.6, core[1])
      b.addColorStop(1, core[2])
      q.fillStyle = b
      q.beginPath()
      q.arc(60, 60, 20, 0, TAU)
      q.fill()
      q.strokeStyle = 'rgba(30,20,40,0.55)'
      q.lineWidth = 2
      q.stroke()
    }
    return c
  }
  const ballSprite = ballImg(['#ffffff', '#fff6c2', '#ffc93d'], '#fff1a8')
  const fireSprite = ballImg(['#fff7b0', '#ffb02e', '#ff4b2b'], '#ff7a2e')

  const capsuleImgs = new Map<PowerKind, HTMLCanvasElement>()
  for (const kind of ALL_POWERS) {
    const c = canvasOf(192, 192)
    const q = c.getContext('2d')
    if (q) {
      q.scale(2, 2)
      const color = POWER[kind].color
      const b = q.createRadialGradient(38, 34, 4, 48, 48, 36)
      b.addColorStop(0, shade(color, 0.55))
      b.addColorStop(1, color)
      q.fillStyle = b
      q.beginPath()
      q.arc(48, 48, 34, 0, TAU)
      q.fill()
      q.strokeStyle = '#ffffff'
      q.lineWidth = 5
      q.stroke()
      q.lineCap = 'round'
      q.lineJoin = 'round'
      if (kind === 'multi') {
        for (const [bx, by] of [
          [48, 35],
          [35, 57],
          [61, 57],
        ] as const) {
          q.beginPath()
          q.arc(bx, by, 10.5, 0, TAU)
          q.fillStyle = '#fff3a0'
          q.fill()
          q.strokeStyle = 'rgba(30,20,40,0.7)'
          q.lineWidth = 2.5
          q.stroke()
        }
      } else if (kind === 'fire') {
        sprite(q, '🔥', 48, 47, 40)
      } else if (kind === 'laser') {
        sprite(q, '⚡', 48, 48, 40)
      } else if (kind === 'wide') {
        q.strokeStyle = '#ffffff'
        q.lineWidth = 7
        q.beginPath()
        q.moveTo(26, 48)
        q.lineTo(70, 48)
        q.moveTo(36, 37)
        q.lineTo(25, 48)
        q.lineTo(36, 59)
        q.moveTo(60, 37)
        q.lineTo(71, 48)
        q.lineTo(60, 59)
        q.stroke()
      } else {
        q.fillStyle = '#9dff7a'
        q.beginPath()
        q.moveTo(24, 58)
        q.bezierCurveTo(22, 30, 74, 30, 72, 58)
        q.bezierCurveTo(70, 70, 62, 60, 58, 66)
        q.bezierCurveTo(54, 72, 50, 60, 44, 64)
        q.bezierCurveTo(36, 72, 28, 66, 24, 58)
        q.fill()
        q.fillStyle = '#1e1428'
        q.beginPath()
        q.arc(40, 48, 4, 0, TAU)
        q.arc(56, 48, 4, 0, TAU)
        q.fill()
      }
      // Gloss.
      q.fillStyle = 'rgba(255,255,255,0.45)'
      q.beginPath()
      q.ellipse(36, 28, 12, 6, -0.6, 0, TAU)
      q.fill()
    }
    capsuleImgs.set(kind, c)
  }

  const twinkles: { x: number; y: number; ph: number; size: number }[] = []
  for (let i = 0; i < 16; i++) twinkles.push({ x: 30 + stage.rand() * (W - 60), y: 30 + stage.rand() * (H - 140), ph: stage.rand() * TAU, size: 5 + stage.rand() * 7 })

  // ---- state ------------------------------------------------------------

  let levelIndex = 0
  let def: Level = LEVELS[0]!
  let cols = 0
  let rowsN = 0
  let gx0 = 0
  let bricks: Brick[] = []
  const grid = new Map<number, Brick>()
  const cell = (c: number, r: number): number => r * 64 + c
  let remaining = 0
  let dirty = false
  let state: 'build' | 'play' | 'clear' = 'build'
  let stateAt = 0
  let buildDoneAt = 0
  let launchAt = 0
  let speed = 540

  const balls: Ball[] = []
  const shards: Shard[] = []
  const looseEyes: LooseEye[] = []
  const capsules: Capsule[] = []
  const bolts: Bolt[] = []
  const coins: Coin[] = []
  let coinStreak = 0
  let coinAt = -10
  let sparkleAt = 0
  let pending: Pending[] = []

  const paddle = {
    x: W / 2,
    tx: W / 2,
    vx: 0,
    tilt: 0,
    w: spring(PADDLE_W, 170, 11),
    sq: spring(1, 300, 11),
    dip: spring(0, 260, 13),
    sadT: 0,
    happyT: 0,
    recoil: 0,
  }

  let score = 0
  const scorePop = spring(1, 220, 12)
  let combo = 0
  let comboAt = -10
  const comboPop = spring(1, 240, 12)
  let pulse = 0
  let losses = 0

  let fireT = 0
  let wideT = 0
  let laserT = 0
  let laserNext = 0
  let laserSide = 1
  let gooT = 0
  let gooSaves = 0
  let gooLevel = 0
  let gooHitX = W / 2
  const gooWob = spring(0, 180, 8)
  let fireEmit = 0

  let dropQueue: PowerKind[] = []
  let sinceDrop = 0
  let nextDrop = 3
  let lastKind: PowerKind | null = null
  let lastDropAt = -10
  let gooDropped = false

  let everTouched = false
  let lastTouchAt = 0
  let activeId = -1
  let ai = true
  let skipDone = -1

  let lastNoteAt = -1
  let lastTickAt = -1
  let lastBoingAt = -1
  let lastCrunchAt = -1
  let hopAt = 0.6
  const wallFlash = [0, 0, 0]

  // ---- level ------------------------------------------------------------

  const spawnBall = (): Ball => {
    const b: Ball = { x: paddle.x, y: PADDLE_TOP - BALL_R, vx: 0, vy: 0, r: BALL_R, stuck: true, since: 1, idle: 0, born: 0, trail: [] }
    balls.push(b)
    return b
  }

  const buildLevel = (n: number): void => {
    levelIndex = n
    def = LEVELS[n % LEVELS.length]!
    const loop = Math.floor(n / LEVELS.length)
    rowsN = def.rows.length
    cols = 0
    for (const row of def.rows) cols = Math.max(cols, row.length)
    gx0 = (W - cols * CW) / 2
    bricks = []
    grid.clear()
    remaining = 0
    pending = []
    const t0 = stage.time
    const maxD = cols + rowsN - 2
    for (let r = 0; r < rowsN; r++) {
      const row = def.rows[r]!
      for (let c = 0; c < row.length; c++) {
        const ch = row[c]!
        if (ch === '.') continue
        const upper = ch.toUpperCase()
        let kind: Kind = ch === '*' ? 'bomb' : ch !== upper ? 'tough' : 'norm'
        if (kind === 'norm' && loop > 0 && stage.rand() < 0.2 * loop) kind = 'tough'
        const color = kind === 'bomb' ? '#3a3350' : (PALETTE[upper] ?? '#ffffff')
        // Bottom-left first, rising to the top-right, like a hand dealing them out.
        const d = c + (rowsN - 1 - r)
        const brick: Brick = {
          c,
          r,
          x: gx0 + c * CW + CW / 2,
          y: GRID_TOP + r * CH + CH / 2,
          kind,
          hp: kind === 'tough' ? 2 : 1,
          color,
          img: kind === 'bomb' ? null : brickImg(color, kind === 'tough'),
          appear: 0,
          delay: t0 + 0.12 + d * 0.042 + stage.rand() * 0.03,
          wob: 0,
          wobV: 0,
          pop: 0,
          popV: 0,
          fear: 0,
          lx: 0,
          ly: 0.6,
          seed: bricks.length * 1.7 + stage.rand() * 3,
          alive: true,
          px: 0,
          py: 0,
          ps: 0,
          pc: 1,
          pn: 0,
        }
        bricks.push(brick)
        grid.set(cell(c, r), brick)
        remaining++
      }
    }
    // One brick in every picture wears a crown: smash it for a shower of stars.
    const plain = bricks.filter((k) => k.kind === 'norm')
    const king = plain[Math.floor(stage.rand() * plain.length)]
    if (king) {
      king.kind = 'gold'
      king.color = '#ffb400'
      king.img = brickImg(king.color, false)
    }
    gooDropped = false
    // The rising arpeggio: one note per diagonal as the bricks land.
    for (let d = 0; d <= maxD; d++) {
      const step = -5 + Math.round((d * 14) / maxD)
      stage.after(0.12 + d * 0.042, () => sfx.note(step, 0.16, 'triangle', 0.13))
    }
    state = 'build'
    stateAt = t0
    buildDoneAt = t0 + 0.12 + maxD * 0.042 + 0.38
    dropQueue = [...def.drops]
    sinceDrop = 0
    // The very first brick of the game drops the multiball: the fun starts early.
    nextDrop = n === 0 ? 1 : 3
    speed = Math.min(720, 540 + 22 * n)
    paintBg(def)
    if (balls.length === 0) spawnBall()
    launchAt = buildDoneAt + (everTouched ? 0.15 : 0.45)
  }

  const launch = (b: Ball): void => {
    if (!b.stuck) return
    // Serve into the picture, wherever the paddle happens to be.
    let cx = 0
    let cy = 0
    for (const k of bricks) {
      cx += k.x
      cy += k.y
    }
    const n = bricks.length
    const aim = n > 0 ? Math.atan2(cx / n - b.x, b.y - cy / n) : 0
    const a = clamp(aim + rnd(-0.3, 0.3), -1, 1)
    b.stuck = false
    b.vx = Math.sin(a) * speed
    b.vy = -Math.cos(a) * speed
    b.since = 0
    paddle.sq.value = 1.28
    sfx.boing(2)
    fx.burst(b.x, b.y + b.r, { count: 10, color: ['#ffffff', '#9af7ff'], speed: 300, angle: -Math.PI / 2, spread: Math.PI, life: 0.4, size: 7 })
    for (const k of bricks) k.wobV += rnd(-2.5, 2.5)
  }

  const clearLevel = (): void => {
    if (state === 'clear') return
    state = 'clear'
    stateAt = stage.time
    score += 500
    scorePop.value = 1.6
    for (const b of balls) fx.burst(b.x, b.y, { count: 14, color: ['#fff3a0', '#ffffff', def.glow], speed: 480, life: 0.7, size: 12, shape: 'star' })
    balls.length = 0
    for (const k of bricks) {
      if (!k.alive) continue
      k.alive = false
      for (let i = 0; i < 3; i++) {
        if (shards.length >= 200) shards.shift()
        shards.push({ x: k.x, y: k.y, vx: (k.x - W / 2) * 1.2 + rnd(-260, 260), vy: rnd(-620, -120), rot: rnd(0, TAU), spin: rnd(-12, 12), w: rnd(12, 24), h: rnd(9, 16), color: i === 0 ? shade(k.color, 0.4) : k.color, life: rnd(0.9, 1.4) })
      }
    }
    bricks = []
    grid.clear()
    remaining = 0
    for (const c of capsules) fx.burst(c.x, c.y, { count: 8, color: POWER[c.kind].color, speed: 300, life: 0.5, shape: 'ring' })
    capsules.length = 0
    bolts.length = 0
    fireT = 0
    laserT = 0
    pending = []
    paddle.happyT = 1.3
    paddle.sq.value = 1.35
    pulse = 1
    fx.confetti(W * 0.5, 430, 80)
    fx.confetti(W * 0.2, 520, 50)
    fx.confetti(W * 0.8, 520, 50)
    stage.after(0.22, () => {
      fx.confetti(W * 0.35, 380, 45)
      fx.confetti(W * 0.65, 380, 45)
      sfx.crunch()
    })
    fx.ring(W / 2, 300, '#ffffff', 420, 0.6)
    fx.ring(W / 2, 300, def.glow, 300, 0.45)
    fx.flash('#ffffff', 0.45, 0.22)
    fx.shake(16, 0.45)
    fx.hitstop(110)
    fx.text(W / 2, 470, def.cheer, { size: 74, life: 1.4, color: '#fff3b0', rise: 50 })
    sfx.fanfare()
    sfx.thud(1.6)
  }

  // ---- hits -------------------------------------------------------------

  const startGoo = (): void => {
    gooT = 12
    gooSaves = 5
  }

  const maybeDrop = (k: Brick): void => {
    sinceDrop++
    if (state !== 'play' || remaining < 3 || capsules.length >= 2 || sinceDrop < nextDrop || stage.time - lastDropAt < 3) return
    lastDropAt = stage.time
    sinceDrop = 0
    nextDrop = balls.length <= 1 ? rndInt(4, 6) : rndInt(6, 10)
    let kind = dropQueue.shift()
    if (!kind && balls.length <= 1 && lastKind !== 'multi') kind = 'multi'
    if (!kind) {
      const pool = ALL_POWERS.filter((p) => p !== lastKind && !(p === 'multi' && balls.length >= 12) && !(p === 'wide' && wideT > 4) && !(p === 'goo' && (gooT > 0 || gooDropped)))
      kind = pool[Math.floor(Math.random() * pool.length)] ?? 'fire'
    }
    lastKind = kind
    if (kind === 'goo') gooDropped = true
    capsules.push({ x: k.x, y: k.y, vy: -260, kind, t: 0 })
    sfx.tone({ freq: 1320, dur: 0.09, type: 'sine', vol: 0.14 })
    sfx.tone({ freq: 1760, dur: 0.14, type: 'sine', vol: 0.14, delay: 0.07 })
  }

  const explode = (k: Brick): void => {
    const t = stage.time
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const n = grid.get(cell(k.c + dc, k.r + dr))
        if (n) pending.push({ brick: n, at: t + 0.05 + 0.035 * (Math.abs(dr) + Math.abs(dc)), fromX: k.x, fromY: k.y })
      }
    }
    fx.ring(k.x, k.y, '#ffd166', 190, 0.45)
    fx.ring(k.x, k.y, '#ffffff', 120, 0.3)
    fx.burst(k.x, k.y, { count: 26, color: ['#ffd166', '#ff7a2e', '#ffffff'], speed: 640, life: 0.6, size: 13 })
    fx.burst(k.x, k.y, { count: 9, color: ['#6a6385', '#9891b3'], speed: 190, life: 0.85, size: 26, gravity: -140, drag: 0.94 })
    fx.flash('#fff2b0', 0.3, 0.14)
    fx.shake(15, 0.35)
    fx.hitstop(55)
    fx.text(k.x, k.y - 24, 'BOOM!', { size: 60, color: '#ffd166' })
    sfx.thud(2)
    sfx.crunch()
    sfx.noise({ dur: 0.45, freq: 900, to: 80, vol: 0.34, filter: 'lowpass' })
  }

  const jackpot = (k: Brick): void => {
    score += 1000
    scorePop.value = 1.7
    pulse = 1
    fx.text(k.x, k.y - 20, 'JACKPOT!', { size: 60, color: '#ffe14d', life: 1.1 })
    fx.ring(k.x, k.y, '#ffe14d', 220, 0.5)
    fx.burst(k.x, k.y, { count: 28, color: ['#ffe14d', '#ffffff', '#ffb400'], speed: 560, life: 0.8, size: 14, shape: 'star' })
    fx.flash('#ffe14d', 0.25, 0.15)
    fx.hitstop(60)
    sfx.win()
    sfx.ding(4)
    for (let i = 0; i < 10; i++) coins.push({ x: k.x, y: k.y, vx: rnd(-300, 300), vy: rnd(-560, -220), rot: rnd(0, TAU) })
  }

  const smash = (k: Brick, ivx: number, ivy: number): void => {
    if (!k.alive) return
    k.alive = false
    grid.delete(cell(k.c, k.r))
    remaining--
    dirty = true
    const t = stage.time
    combo = t - comboAt < COMBO_S ? combo + 1 : 1
    comboAt = t
    comboPop.value = 1.45
    score += 10 * Math.min(combo, 20)
    scorePop.value = 1.3
    pulse = Math.min(1, pulse + 0.3)

    // Pieces fly the way the ball was going; the eyes pop off on their own.
    const il = Math.hypot(ivx, ivy) || 1
    const ux = ivx / il
    const uy = ivy / il
    const tones = [k.color, shade(k.color, 0.4), shade(k.color, -0.25)]
    for (let i = 0; i < 5; i++) {
      if (shards.length >= 200) shards.shift()
      shards.push({
        x: k.x + rnd(-20, 20),
        y: k.y + rnd(-12, 12),
        vx: ux * 230 + rnd(-300, 300),
        vy: uy * 230 + rnd(-380, 120),
        rot: rnd(0, TAU),
        spin: rnd(-12, 12),
        w: rnd(12, 24),
        h: rnd(9, 16),
        color: tones[i % 3]!,
        life: rnd(0.9, 1.4),
      })
    }
    for (const side of [-1, 1]) {
      if (looseEyes.length >= 48) looseEyes.shift()
      looseEyes.push({ x: k.x + side * 9, y: k.y - 4, vx: ux * 120 + side * rnd(60, 220), vy: uy * 100 - rnd(220, 480), life: 1.6 })
    }
    fx.burst(k.x, k.y, { count: 5, color: [tones[1]!, '#ffffff'], speed: 360, life: 0.4, size: 6, shape: 'spark', gravity: 300 })

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const n = grid.get(cell(k.c + dc, k.r + dr))
        if (!n) continue
        n.wobV += dc * 7 + rnd(-3, 3)
        n.popV += 1.6
      }
    }

    // Every brick is the next note of the scale; past the top it trills.
    if (t - lastNoteAt > 0.06) {
      lastNoteAt = t
      const step = combo <= 15 ? combo - 6 : 5 + (combo % 5)
      sfx.pop(step)
      sfx.note(step, 0.2, 'triangle', 0.15)
    }
    fx.shake(Math.min(2 + combo * 0.25, 5), 0.14)

    const word = MILESTONES[combo]
    if (word) {
      fx.text(W / 2, 520, word, { size: Math.min(50 + combo * 0.5, 80), color: '#fff3a0', life: 0.75, rise: 40 })
      fx.ring(W / 2, 520, '#fff3a0', 170, 0.45)
      fx.hitstop(45)
      fx.shake(9, 0.25)
      sfx.win()
      if (combo >= 20) fx.confetti(W / 2, 520, 30)
    }

    if (k.kind === 'bomb') explode(k)
    if (k.kind === 'gold') jackpot(k)
    maybeDrop(k)
  }

  const crack = (k: Brick): void => {
    k.popV += 5
    k.wobV += rnd(-12, 12)
    pulse = Math.min(1, pulse + 0.15)
    fx.burst(k.x, k.y, { count: 6, color: ['#ffffff', '#dfe7f7'], speed: 300, life: 0.3, size: 6, shape: 'spark' })
    const t = stage.time
    if (t - lastCrunchAt > 0.06) {
      lastCrunchAt = t
      sfx.crunch()
      sfx.tone({ freq: 220, to: 160, dur: 0.1, type: 'square', vol: 0.1 })
    }
  }

  const damage = (k: Brick, amount: number, ivx: number, ivy: number): void => {
    k.hp -= amount
    if (k.hp > 0) crack(k)
    else smash(k, ivx, ivy)
  }

  const grant = (kind: PowerKind, x: number, y: number): void => {
    const info = POWER[kind]
    score += 50
    scorePop.value = 1.3
    paddle.sq.value = 1.3
    paddle.happyT = 0.7
    fx.ring(x, y, '#ffffff', 130, 0.4)
    fx.burst(x, y, { count: 16, color: [info.color, '#ffffff'], speed: 420, life: 0.6, size: 12, shape: 'star' })
    fx.text(clamp(x, 180, W - 180), PADDLE_TOP - 50, info.word, { size: 50, color: '#ffffff', outline: shade(info.color, -0.5) })
    sfx.coin(2)
    if (kind === 'multi') {
      for (const b of balls) launch(b)
      const src = [...balls]
      for (const b of src) {
        for (const da of [-0.5, 0.5]) {
          if (balls.length >= MAX_BALLS) break
          const cs = Math.cos(da)
          const sn = Math.sin(da)
          balls.push({ x: b.x, y: b.y, vx: b.vx * cs - b.vy * sn, vy: b.vx * sn + b.vy * cs, r: b.r, stuck: false, since: 0, idle: 0, born: 0.4, trail: [] })
        }
        fx.ring(b.x, b.y, '#9ad0ff', 70, 0.3)
      }
      for (let i = 0; i < 3; i++) sfx.tone({ freq: sfx.scale(2 + i * 2), dur: 0.12, type: 'triangle', vol: 0.18, delay: 0.05 + i * 0.06 })
    } else if (kind === 'fire') {
      fireT = 7
      sfx.whoosh()
      sfx.tone({ freq: 110, to: 330, dur: 0.35, type: 'sawtooth', vol: 0.14 })
    } else if (kind === 'wide') {
      wideT = 13
      paddle.w.target = 330
      sfx.slideUp()
    } else if (kind === 'laser') {
      laserT = 6
      laserNext = 0
      sfx.zap()
    } else {
      startGoo()
      sfx.splat()
    }
  }

  // ---- balls ------------------------------------------------------------

  const wallTick = (i: number): void => {
    wallFlash[i] = 1
    const t = stage.time
    if (t - lastTickAt > 0.06) {
      lastTickAt = t
      sfx.tick()
    }
  }

  const bouncePaddle = (b: Ball, half: number): void => {
    const off = clamp((b.x - paddle.x) / half, -1, 1)
    let a = off * 1.05 + clamp(paddle.vx / 4000, -0.2, 0.2)
    if (Math.abs(a) < 0.08) a = a < 0 ? -0.08 : 0.08
    a = clamp(a, -1.2, 1.2)
    const sp = Math.hypot(b.vx, b.vy)
    b.vx = Math.sin(a) * sp
    b.vy = -Math.cos(a) * sp
    b.y = PADDLE_TOP - b.r - 0.5
    b.since = 0
    losses = 0
    paddle.sq.value = 0.68
    paddle.dip.kick(240)
    paddle.happyT = Math.max(paddle.happyT, 0.25)
    fx.burst(b.x, PADDLE_TOP, { count: 7, color: ['#ffffff', '#9af7ff'], speed: 280, angle: -Math.PI / 2, spread: Math.PI * 0.9, life: 0.35, size: 6, shape: 'spark' })
    const t = stage.time
    if (t - lastBoingAt > 0.05) {
      lastBoingAt = t
      sfx.boing(Math.round(off * 2))
    }
  }

  // Turn a ball a little toward the nearest brick, so the last few never drag.
  const steer = (b: Ball, rate: number, dt: number): void => {
    let best: Brick | null = null
    let bd = Infinity
    for (const k of bricks) {
      if (!k.alive) continue
      const d = (k.x - b.x) ** 2 + (k.y - b.y) ** 2
      if (d < bd) {
        bd = d
        best = k
      }
    }
    if (!best) return
    const cur = Math.atan2(b.vy, b.vx)
    let diff = Math.atan2(best.y - b.y, best.x - b.x) - cur
    while (diff > Math.PI) diff -= TAU
    while (diff < -Math.PI) diff += TAU
    const a = cur + clamp(diff, -rate * dt, rate * dt)
    const sp = Math.hypot(b.vx, b.vy)
    b.vx = Math.cos(a) * sp
    b.vy = Math.sin(a) * sp
  }

  // Returns false when the ball has fallen out of the bottom.
  const moveBall = (b: Ball, dt: number): boolean => {
    const half = paddle.w.value / 2
    const fire = fireT > 0
    const sp0 = Math.hypot(b.vx, b.vy)
    const steps = Math.max(1, Math.ceil((sp0 * dt) / 7))
    const h = dt / steps
    for (let s = 0; s < steps; s++) {
      b.x += b.vx * h
      b.y += b.vy * h
      if (b.x - b.r < LEFT) {
        b.x = LEFT + b.r
        b.vx = Math.abs(b.vx)
        b.since = 0
        wallTick(0)
      } else if (b.x + b.r > RIGHT) {
        b.x = RIGHT - b.r
        b.vx = -Math.abs(b.vx)
        b.since = 0
        wallTick(2)
      }
      if (b.y - b.r < TOP) {
        b.y = TOP + b.r
        b.vy = Math.abs(b.vy)
        b.since = 0
        wallTick(1)
      }
      if (b.vy > 0) {
        // A generous catch: wider than the drawing and still good a little late.
        if (b.y + b.r >= PADDLE_TOP && b.y - b.r < PADDLE_Y + PH / 2 && Math.abs(b.x - paddle.x) < half + 14 + b.r * 0.6) {
          bouncePaddle(b, half)
          continue
        }
        if (gooLevel > 0.5 && gooSaves > 0 && b.y + b.r > GOO_Y) {
          b.y = GOO_Y - b.r
          b.vy = -Math.abs(b.vy)
          b.since = 0
          gooSaves--
          gooHitX = b.x
          gooWob.value = 1
          gooWob.kick(-4)
          fx.burst(b.x, GOO_Y, { count: 12, color: ['#8aff6b', '#c8ffb0', '#35c94a'], speed: 380, angle: -Math.PI / 2, spread: Math.PI * 0.8, life: 0.6, size: 12 })
          sfx.splat()
          sfx.boing(-2)
          if (gooSaves === 0) gooT = Math.min(gooT, 0.4)
          continue
        }
        if (b.y - b.r > H + 24) return false
      }

      const c0 = Math.max(0, Math.floor((b.x - b.r - gx0) / CW))
      const c1 = Math.min(cols - 1, Math.floor((b.x + b.r - gx0) / CW))
      const r0 = Math.max(0, Math.floor((b.y - b.r - GRID_TOP) / CH))
      const r1 = Math.min(rowsN - 1, Math.floor((b.y + b.r - GRID_TOP) / CH))
      if (c1 < c0 || r1 < r0) continue
      let best: Brick | null = null
      let bestD = Infinity
      let bnx = 0
      let bny = 0
      for (let rr = r0; rr <= r1; rr++) {
        for (let cc = c0; cc <= c1; cc++) {
          const k = grid.get(cell(cc, rr))
          if (!k || k.appear < 0.6) continue
          const nx = clamp(b.x, k.x - BW / 2, k.x + BW / 2)
          const ny = clamp(b.y, k.y - BH / 2, k.y + BH / 2)
          const dx = b.x - nx
          const dy = b.y - ny
          const d2 = dx * dx + dy * dy
          if (d2 > b.r * b.r) continue
          if (fire) {
            // The fireball ploughs straight through everything it touches.
            b.idle = 0
            damage(k, 99, b.vx, b.vy)
            continue
          }
          if (d2 < bestD) {
            best = k
            bestD = d2
            bnx = nx
            bny = ny
          }
        }
      }
      if (best) {
        let dx = b.x - bnx
        let dy = b.y - bny
        if (dx === 0 && dy === 0) {
          dx = (b.x - best.x) / BW
          dy = (b.y - best.y) / BH
        }
        const ivx = b.vx
        const ivy = b.vy
        if (Math.abs(dx) > Math.abs(dy)) {
          const sg = dx < 0 ? -1 : 1
          b.vx = sg * Math.abs(b.vx)
          b.x = best.x + sg * (BW / 2 + b.r + 0.5)
        } else {
          const sg = dy < 0 ? -1 : 1
          b.vy = sg * Math.abs(b.vy)
          b.y = best.y + sg * (BH / 2 + b.r + 0.5)
        }
        b.since = 0
        b.idle = 0
        damage(best, 1, ivx, ivy)
      }
    }

    // Hold the speed, and never let a ball go flat and bounce sideways forever.
    const want = damp(Math.hypot(b.vx, b.vy) || 1, speed * (fire ? 1.12 : 1), 6, dt)
    const minVy = want * 0.3
    let vy = b.vy
    if (Math.abs(vy) < minVy) vy = vy < 0 ? -minVy : minVy
    const cur = Math.hypot(b.vx, vy) || 1
    vy = clamp((vy / cur) * want, -want, want)
    if (Math.abs(vy) < minVy) vy = vy < 0 ? -minVy : minVy
    b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(Math.max(0, want * want - vy * vy))
    b.vy = vy

    if (b.vy < 0 || b.y < 470) {
      if (remaining <= 2) steer(b, 2.6, dt)
      else if (remaining <= 5) steer(b, 1.5, dt)
      else if (b.idle > 3) steer(b, 1.1, dt)
    }
    return true
  }

  // Where the demo paddle wants to be: under the next ball to come down.
  const aiTarget = (): number => {
    let soonest = Infinity
    let target = NaN
    for (const b of balls) {
      if (b.stuck || b.vy <= 0) continue
      const tt = (PADDLE_TOP - b.y) / b.vy
      if (tt < 0 || tt >= soonest) continue
      soonest = tt
      const lo = LEFT + b.r
      const span = RIGHT - b.r - lo
      let u = (b.x + b.vx * tt - lo) % (2 * span)
      if (u < 0) u += 2 * span
      target = lo + (u > span ? 2 * span - u : u)
    }
    if (Number.isNaN(target) || soonest > 0.9) {
      let lowest: Capsule | null = null
      for (const c of capsules) if (!lowest || c.y > lowest.y) lowest = c
      if (lowest) return lowest.x
    }
    if (Number.isNaN(target)) return balls[0] ? balls[0].x : W / 2
    return target + Math.sin(stage.time * 0.8) * 60
  }

  buildLevel(0)

  // ---- drawing helpers --------------------------------------------------

  const drawBomb = (g: CanvasRenderingContext2D, k: Brick, t: number): void => {
    g.save()
    g.translate(k.px, k.py)
    g.transform(k.pc, k.pn, -k.pn, k.pc, 0, 0)
    const s = k.ps * (1 + Math.sin(t * 6 + k.seed) * 0.05)
    g.scale(s, s)
    g.strokeStyle = '#d9b37a'
    g.lineWidth = 3.5
    g.beginPath()
    g.moveTo(8, -13)
    g.quadraticCurveTo(12, -23, 20, -19)
    g.stroke()
    g.fillStyle = '#2a2438'
    g.strokeStyle = '#ff5d5d'
    g.lineWidth = 2.5
    g.beginPath()
    g.arc(0, 2, 17.5, 0, TAU)
    g.fill()
    g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.22)'
    g.beginPath()
    g.ellipse(-7, -7, 6, 3.5, -0.6, 0, TAU)
    g.fill()
    const f = 4.5 + Math.sin(t * 31 + k.seed) * 2
    g.fillStyle = '#ff9a3c'
    g.beginPath()
    g.arc(20, -19, f + 2, 0, TAU)
    g.fill()
    g.fillStyle = '#fff3a0'
    g.beginPath()
    g.arc(20, -19, f * 0.6, 0, TAU)
    g.fill()
    g.strokeStyle = '#ffffff'
    g.lineWidth = 2.4
    g.beginPath()
    g.moveTo(-13, -6)
    g.lineTo(-4, -2.5)
    g.moveTo(13, -6)
    g.lineTo(4, -2.5)
    g.stroke()
    g.restore()
  }

  const drawBricks = (g: CanvasRenderingContext2D, t: number): void => {
    // Bodies.
    for (const k of bricks) {
      if (k.appear <= 0) {
        k.ps = 0
        continue
      }
      const ap = k.appear < 1 ? ease.outBack(k.appear) : 1
      const s = ap * (1 + k.pop) * (1 - k.fear * 0.1) * (1 + Math.sin(t * 2.2 + k.seed) * 0.012)
      const rot = k.wob * 0.13 + Math.sin(t * 38 + k.seed * 7) * k.fear * 0.045
      k.px = k.x - k.lx * k.fear * 6
      k.py = k.y - k.ly * k.fear * 6 - (1 - k.appear) * 34
      k.ps = s
      k.pc = Math.cos(rot)
      k.pn = Math.sin(rot)
      if (k.kind === 'bomb') {
        drawBomb(g, k, t)
        continue
      }
      if (!k.img) continue
      g.save()
      g.translate(k.px, k.py)
      g.transform(k.pc * s, k.pn * s, -k.pn * s, k.pc * s, 0, 0)
      g.drawImage(k.img, -IMG_W / 2, -IMG_H / 2, IMG_W, IMG_H)
      if (k.kind === 'gold') {
        g.strokeStyle = `rgba(255,255,255,${0.55 + Math.sin(t * 6) * 0.35})`
        g.lineWidth = 3.5
        g.beginPath()
        g.roundRect(-BW / 2 - 2, -BH / 2 - 2, BW + 4, BH + 4, 12)
        g.stroke()
        sprite(g, '👑', 0, -BH / 2 - 4, 32, Math.sin(t * 3 + k.seed) * 0.12)
      }
      if (k.kind === 'tough' && k.hp === 1) {
        g.strokeStyle = 'rgba(30,20,40,0.8)'
        g.lineWidth = 2.2
        g.beginPath()
        g.moveTo(-24, -14)
        g.lineTo(-14, -4)
        g.lineTo(-20, 4)
        g.lineTo(-10, 15)
        g.moveTo(22, -15)
        g.lineTo(15, -2)
        g.lineTo(23, 6)
        g.stroke()
      }
      g.restore()
    }
    // Faces, batched: eye rims, whites, then pupils and gasps, then smiles.
    const ex = 9.5
    for (let pass = 0; pass < 3; pass++) {
      g.beginPath()
      for (const k of bricks) {
        if (k.ps <= 0.3) continue
        const bomb = k.kind === 'bomb'
        const s = k.ps
        const eyeX = bomb ? 7 : ex
        const eyeY = bomb ? 4 : -3.5
        const blink = blinkAt(t, k.seed) === 1 && k.fear < 0.2
        const er = (bomb ? 5 : 6.6) * s * (1 + k.fear * 0.22)
        for (const side of [-1, 1]) {
          const lxp = side * eyeX
          const wx = k.px + (lxp * k.pc - eyeY * k.pn) * s
          const wy = k.py + (lxp * k.pn + eyeY * k.pc) * s
          if (pass === 0) {
            if (bomb) continue
            g.moveTo(wx + er + 1.6, wy)
            g.ellipse(wx, wy, er + 1.6, blink ? 2.6 : er + 1.6, 0, 0, TAU)
          } else if (pass === 1) {
            g.moveTo(wx + er, wy)
            g.ellipse(wx, wy, er, blink ? 1 : er, 0, 0, TAU)
          } else if (!blink) {
            const pr = er * (k.fear > 0.3 ? 0.36 : 0.52)
            const pxw = wx + k.lx * er * 0.4
            const pyw = wy + k.ly * er * 0.4
            g.moveTo(pxw + pr, pyw)
            g.arc(pxw, pyw, pr, 0, TAU)
          }
        }
        if (pass === 2 && !bomb && k.fear > 0.35) {
          const mx = k.px + -10.5 * k.pn * s
          const my = k.py + 10.5 * k.pc * s
          g.moveTo(mx + 3.6 * s, my)
          g.ellipse(mx, my, 3.2 * s, 4 * s, 0, 0, TAU)
        }
      }
      g.fillStyle = pass === 1 ? '#ffffff' : '#1e1428'
      g.fill()
    }
    g.beginPath()
    for (const k of bricks) {
      if (k.ps <= 0.3 || k.kind === 'bomb' || k.fear > 0.35) continue
      const s = k.ps
      const mx = k.px + -6 * k.pn * s
      const my = k.py + 6 * k.pc * s
      const r = 5.5 * s
      const a0 = 0.2 * Math.PI
      g.moveTo(mx + Math.cos(a0) * r, my + Math.sin(a0) * r)
      g.arc(mx, my, r, a0, 0.8 * Math.PI)
    }
    g.strokeStyle = '#1e1428'
    g.lineWidth = 2.4
    g.lineCap = 'round'
    g.stroke()
  }

  const drawPaddle = (g: CanvasRenderingContext2D, t: number): void => {
    const pw = paddle.w.value
    const stretch = paddle.sq.value
    const zip = Math.min(Math.abs(paddle.vx) / 5000, 0.16)
    const sx = (1 / Math.sqrt(Math.max(0.3, stretch))) * (1 + zip)
    const sy = Math.max(0.3, stretch) * (1 - zip * 0.5)
    const bob = Math.sin(t * 2.4) * 2
    const base = PADDLE_Y + PH / 2 + paddle.dip.value + bob
    const sad = paddle.sadT > 0
    const dance = paddle.happyT > 0.3 ? Math.sin(t * 22) * 0.04 : 0

    // A soft light under the paddle, like a hover pad.
    g.globalAlpha = 0.35
    g.drawImage(glow, paddle.x - pw * 0.7, base - 22, pw * 1.4, 60)
    g.globalAlpha = 1

    // Speed streaks when it zips.
    if (Math.abs(paddle.vx) > 500) {
      const dir = paddle.vx > 0 ? -1 : 1
      const len = Math.min(Math.abs(paddle.vx) * 0.05, 120)
      g.fillStyle = '#9af7ff'
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = 0.28 - i * 0.07
        g.beginPath()
        g.roundRect(paddle.x + dir * (pw / 2 - 10) + (dir < 0 ? -len * (0.5 + i * 0.25) : 0), base - PH + 6 + i * 10, len * (0.5 + i * 0.25), 6, 3)
        g.fill()
      }
      g.globalAlpha = 1
    }

    g.save()
    g.translate(paddle.x, base)
    g.rotate(paddle.tilt + dance + (sad ? Math.sin(t * 30) * 0.03 : 0))
    g.scale(sx, sy)
    const x0 = -pw / 2
    if (laserT > 0 && (laserT > 1.2 || Math.floor(t * 12) % 2 === 0)) {
      for (const side of [-1, 1]) {
        const cx = side * (pw / 2 - 22)
        const kick = side === -laserSide ? paddle.recoil * 7 : 0
        g.fillStyle = '#7a2ad1'
        g.beginPath()
        g.roundRect(cx - 9, -PH - 16 + kick, 18, 24, 5)
        g.fill()
        g.fillStyle = '#ff7af0'
        g.beginPath()
        g.roundRect(cx - 5, -PH - 20 + kick, 10, 9, 3)
        g.fill()
      }
    }
    g.fillStyle = '#0b5d78'
    g.beginPath()
    g.roundRect(x0 - 3, -PH - 3, pw + 6, PH + 6, PH / 2 + 3)
    g.fill()
    g.fillStyle = sad ? '#5aa9c9' : '#2fd3e6'
    g.beginPath()
    g.roundRect(x0, -PH, pw, PH, PH / 2)
    g.fill()
    // Pink bumpers.
    g.save()
    g.beginPath()
    g.roundRect(x0, -PH, pw, PH, PH / 2)
    g.clip()
    g.fillStyle = '#ff6fb1'
    g.fillRect(x0, -PH, 30, PH)
    g.fillRect(pw / 2 - 30, -PH, 30, PH)
    g.fillStyle = 'rgba(0,0,0,0.16)'
    g.fillRect(x0, -9, pw, 9)
    g.restore()
    g.fillStyle = 'rgba(255,255,255,0.55)'
    g.beginPath()
    g.roundRect(x0 + 18, -PH + 5, pw - 36, 6, 3)
    g.fill()
    // The face looks at the nearest ball.
    let lookX = 0
    let lookY = -0.6
    let near = Infinity
    for (const b of balls) {
      const d = Math.hypot(b.x - paddle.x, b.y - PADDLE_Y)
      if (d < near) {
        near = d
        lookX = clamp((b.x - paddle.x) / 260, -1, 1)
        lookY = clamp((b.y - PADDLE_Y) / 300, -1, 0.3)
      }
    }
    const mood = sad ? 'sad' : paddle.happyT > 0 ? 'yum' : near < 190 ? 'wow' : 'happy'
    g.fillStyle = 'rgba(255,111,177,0.55)'
    g.beginPath()
    g.ellipse(-27, -PH / 2 + 5, 6, 4, 0, 0, TAU)
    g.ellipse(27, -PH / 2 + 5, 6, 4, 0, 0, TAU)
    g.fill()
    face(g, 0, -PH / 2 - 5, 7, mood, lookX, lookY, blinkAt(t, 5))
    g.restore()
  }

  const drawGoo = (g: CanvasRenderingContext2D, t: number): void => {
    if (gooLevel < 0.02) return
    const base = GOO_Y + (1 - gooLevel) * 100
    const blinkOut = gooT < 1.5 && gooT > 0 && Math.floor(t * 10) % 2 === 0
    g.globalAlpha = blinkOut ? 0.55 : 0.95
    const surf = (x: number): number => base + Math.sin(x * 0.021 + t * 3) * 5 + Math.sin(x * 0.053 - t * 2.1) * 3 + gooWob.value * 26 * Math.exp(-(((x - gooHitX) / 150) ** 2))
    g.beginPath()
    g.moveTo(-BGP, H + BGP)
    for (let x = -BGP; x <= W + BGP; x += 36) g.lineTo(x, surf(x))
    g.lineTo(W + BGP, H + BGP)
    g.closePath()
    g.fillStyle = '#4fd64a'
    g.fill()
    g.strokeStyle = '#c4ffa6'
    g.lineWidth = 5
    g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.35)'
    for (let i = 0; i < 9; i++) {
      const x = ((i * 137 + t * 22) % (W + 60)) - 30
      g.beginPath()
      g.arc(x, base + 22 + Math.sin(t * 2 + i) * 6 + (i % 3) * 8, 4 + (i % 4) * 2, 0, TAU)
      g.fill()
    }
    g.globalAlpha = 1
    // The goo has eyes, of course.
    for (const gxp of [W * 0.22, W * 0.78]) {
      const y = surf(gxp) + 20
      for (const side of [-1, 1]) {
        g.fillStyle = '#ffffff'
        g.beginPath()
        g.arc(gxp + side * 13, y, 9, 0, TAU)
        g.fill()
        g.fillStyle = '#1e1428'
        g.beginPath()
        g.arc(gxp + side * 13 + Math.sin(t * 1.3) * 3, y - 2, 4.5, 0, TAU)
        g.fill()
      }
    }
  }

  const heat = (): string => (combo >= 20 ? '#ff7ac8' : combo >= 10 ? '#ffb347' : combo >= 5 ? '#fff3a0' : '#bff4ff')

  // ---- the game ---------------------------------------------------------

  return {
    update(dt) {
      const t = stage.time

      // Grown-up shortcut: hold the picture strip (top right) to skip a picture.
      for (const p of stage.pointers.values()) {
        if (p.downAt !== skipDone && p.x > W - 350 && p.y < 76 && p.startX > W - 350 && p.startY < 76 && t - p.downAt > 0.8) {
          skipDone = p.downAt
          if (state === 'play') clearLevel()
        }
      }

      // Who is driving: the finger, or (before the first touch and after five
      // idle seconds) a lazy demo paddle with the hint hand on it.
      const touching = stage.pointers.size > 0
      if (touching) lastTouchAt = t
      ai = !touching && (!everTouched || t - lastTouchAt > 5)
      const half = paddle.w.value / 2
      const lo = LEFT + half - 6
      const hi = RIGHT - half + 6
      const prevX = paddle.x
      if (ai) paddle.x = damp(paddle.x, clamp(aiTarget(), lo, hi), 9, dt)
      else paddle.x = damp(paddle.x, clamp(paddle.tx, lo, hi), 32, dt)
      paddle.vx = (paddle.x - prevX) / Math.max(dt, 0.001)
      paddle.tilt = damp(paddle.tilt, clamp(paddle.vx / 3200, -0.09, 0.09), 12, dt)
      paddle.w.update(dt)
      paddle.sq.update(dt)
      paddle.dip.update(dt)
      paddle.sadT = Math.max(0, paddle.sadT - dt)
      paddle.happyT = Math.max(0, paddle.happyT - dt)
      paddle.recoil = Math.max(0, paddle.recoil - dt * 8)
      scorePop.update(dt)
      comboPop.update(dt)
      pulse = Math.max(0, pulse - dt * 2.2)
      for (let i = 0; i < 3; i++) wallFlash[i] = Math.max(0, wallFlash[i]! - dt * 5)
      if (t - comboAt > COMBO_S) combo = 0

      if (state === 'build' && t >= buildDoneAt) state = 'play'
      if (state === 'clear' && t - stateAt > 1.05) buildLevel(levelIndex + 1)

      // Power-up clocks.
      if (fireT > 0) {
        fireT = Math.max(0, fireT - dt)
        fireEmit += dt
        if (fireEmit > 0.045) {
          fireEmit = 0
          for (let i = 0; i < Math.min(balls.length, 6); i++) {
            const b = balls[i]!
            fx.burst(b.x, b.y, { count: 1, color: ['#ffd166', '#ff7a2e', '#ff4d4d'], speed: 90, life: 0.45, size: 16, gravity: -220 })
          }
        }
      }
      if (wideT > 0) {
        wideT = Math.max(0, wideT - dt)
        if (wideT === 0) {
          paddle.w.target = PADDLE_W
          sfx.slideDown()
        }
      }
      if (gooT > 0) gooT = Math.max(0, gooT - dt)
      gooLevel = damp(gooLevel, gooT > 0 ? 1 : 0, 7, dt)
      gooWob.update(dt)
      if (laserT > 0) {
        laserT = Math.max(0, laserT - dt)
        laserNext -= dt
        if (laserNext <= 0 && state === 'play') {
          laserNext = 0.17
          laserSide = -laserSide
          paddle.recoil = 1
          const bx = paddle.x + laserSide * (paddle.w.value / 2 - 22)
          bolts.push({ x: bx, y: PADDLE_TOP - 22 })
          fx.burst(bx, PADDLE_TOP - 24, { count: 3, color: '#ff9af5', speed: 200, angle: -Math.PI / 2, spread: 1.2, life: 0.2, size: 6, shape: 'spark' })
          sfx.tone({ freq: 1900, to: 500, dur: 0.07, type: 'square', vol: 0.06 })
        }
      }

      // Balls.
      if (state === 'play' && t >= launchAt) for (const b of balls) launch(b)
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i]!
        b.born = Math.min(1, b.born + dt / 0.3)
        b.r = damp(b.r, fireT > 0 ? FIRE_R : BALL_R, 10, dt)
        b.since += dt
        if (b.stuck) {
          b.x = paddle.x
          b.y = PADDLE_TOP + paddle.dip.value - b.r
          b.trail.length = 0
          continue
        }
        b.idle += dt
        b.trail.unshift(b.x, b.y)
        if (b.trail.length > 18) b.trail.length = 18
        if (!moveBall(b, dt)) {
          balls.splice(i, 1)
          fx.burst(clamp(b.x, 30, W - 30), H - 6, { count: 10, color: ['#bff4ff', '#ffffff'], speed: 380, angle: -Math.PI / 2, spread: 1.4, life: 0.5, size: 9 })
          sfx.tone({ freq: 520, to: 140, dur: 0.22, type: 'sine', vol: 0.14 })
        }
      }
      if (balls.length === 0 && state === 'play') {
        // The last one got away: a half-second sulk, then a fresh ball. After
        // two in a row the goo turns up unasked to help.
        paddle.sadT = 0.55
        combo = 0
        losses++
        sfx.slideDown()
        if (losses >= 2 && gooT <= 0) stage.after(0.3, startGoo)
        stage.after(0.3, () => sfx.pop(2))
        spawnBall()
        launchAt = t + 0.75
      }

      // Falling power-ups drift toward the paddle a little.
      for (let i = capsules.length - 1; i >= 0; i--) {
        const c = capsules[i]!
        c.t += dt
        c.vy = Math.min(235, c.vy + 760 * dt)
        c.y += c.vy * dt
        // Bubbles lean toward the paddle all the way down, harder when close.
        c.x = damp(c.x, paddle.x, Math.abs(c.x - paddle.x) < half + 220 ? 2.6 : 1.1, dt)
        if (c.y + 28 > PADDLE_TOP && c.y - 28 < PADDLE_Y + PH / 2 && Math.abs(c.x - paddle.x) < half + 38) {
          capsules.splice(i, 1)
          grant(c.kind, c.x, c.y)
        } else if (c.y > H + 50) {
          capsules.splice(i, 1)
        }
      }

      // Jackpot stars bounce down; each one caught is the next note up.
      if (t - coinAt > 1.5) coinStreak = 0
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i]!
        c.vy = Math.min(430, c.vy + 900 * dt)
        c.x += c.vx * dt
        c.y += c.vy * dt
        c.rot += dt * 5
        if (c.x < LEFT + 18) {
          c.x = LEFT + 18
          c.vx = Math.abs(c.vx)
        } else if (c.x > RIGHT - 18) {
          c.x = RIGHT - 18
          c.vx = -Math.abs(c.vx)
        }
        if (c.vy > 0 && c.y + 20 > PADDLE_TOP && c.y - 20 < PADDLE_Y + PH / 2 && Math.abs(c.x - paddle.x) < half + 30) {
          coins.splice(i, 1)
          score += 100
          scorePop.value = 1.3
          coinAt = t
          sfx.coin(coinStreak++)
          paddle.sq.value = Math.min(paddle.sq.value, 0.85)
          paddle.happyT = Math.max(paddle.happyT, 0.4)
          fx.text(c.x, PADDLE_TOP - 28 - (coinStreak % 3) * 26, '+100', { size: 26, color: '#ffe14d', life: 0.5, rise: 40 })
          fx.burst(c.x, PADDLE_TOP, { count: 5, color: ['#ffe14d', '#ffffff'], speed: 260, life: 0.4, size: 9, shape: 'star' })
        } else if (c.y > H + 40) {
          coins.splice(i, 1)
        }
      }

      // Laser bolts.
      for (let i = bolts.length - 1; i >= 0; i--) {
        const o = bolts[i]!
        o.y -= 1300 * dt
        const k = grid.get(cell(Math.floor((o.x - gx0) / CW), Math.floor((o.y - GRID_TOP) / CH)))
        if (k && k.appear > 0.6 && o.x >= gx0) {
          bolts.splice(i, 1)
          fx.burst(o.x, o.y, { count: 5, color: ['#ff9af5', '#ffffff'], speed: 260, life: 0.25, size: 6, shape: 'spark' })
          damage(k, 1, 0, -1)
        } else if (o.y < TOP) {
          bolts.splice(i, 1)
          wallFlash[1] = 1
        }
      }

      // Bomb chains.
      if (pending.length > 0) {
        const due = pending.filter((p) => p.at <= t)
        if (due.length > 0) {
          pending = pending.filter((p) => p.at > t)
          for (const p of due) smash(p.brick, p.brick.x - p.fromX, p.brick.y - p.fromY)
        }
      }

      // Bricks: pop in, wobble, and watch the nearest ball.
      const watch = Math.min(balls.length, 10)
      for (const k of bricks) {
        if (k.appear < 1) {
          if (t < k.delay) continue
          if (k.appear === 0) k.wobV = rnd(-9, 9)
          k.appear = Math.min(1, k.appear + dt / 0.34)
        }
        k.wobV += (-210 * k.wob - 8 * k.wobV) * dt
        k.wob += k.wobV * dt
        k.popV += (-260 * k.pop - 14 * k.popV) * dt
        k.pop += k.popV * dt
        let ndx = 0
        let ndy = 1
        let nd = Infinity
        for (let i = 0; i < watch; i++) {
          const b = balls[i]!
          const dx = b.x - k.x
          const dy = b.y - k.y
          const d = dx * dx + dy * dy
          if (d < nd) {
            nd = d
            ndx = dx
            ndy = dy
          }
        }
        if (nd < Infinity) {
          const d = Math.sqrt(nd) || 1
          const reach = 150 + (fireT > 0 ? 60 : 0)
          k.fear = damp(k.fear, d < reach ? 1 - d / reach : 0, 14, dt)
          k.lx = damp(k.lx, ndx / d, 10, dt)
          k.ly = damp(k.ly, ndy / d, 10, dt)
        } else {
          k.fear = damp(k.fear, 0, 8, dt)
        }
      }
      if (dirty) {
        bricks = bricks.filter((k) => k.alive)
        dirty = false
      }
      if (t > sparkleAt) {
        sparkleAt = t + 0.3
        for (const k of bricks) {
          if (k.kind === 'gold' && k.appear === 1) fx.burst(k.x + rnd(-26, 26), k.y + rnd(-22, 10), { count: 1, color: ['#fff3a0', '#ffffff'], speed: 40, life: 0.5, size: 11, shape: 'star', gravity: -60 })
        }
      }
      // Now and then one brick does a little hop, so the wall is never still.
      if (t > hopAt && bricks.length > 0) {
        hopAt = t + rnd(0.35, 0.9)
        const k = bricks[Math.floor(Math.random() * bricks.length)]!
        if (k.appear === 1) {
          k.popV += 2.4
          k.wobV += rnd(-5, 5)
        }
      }

      // Debris.
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i]!
        s.life -= dt
        if (s.life <= 0 || s.y > H + 40) {
          shards.splice(i, 1)
          continue
        }
        s.vy += 1500 * dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.rot += s.spin * dt
      }
      for (let i = looseEyes.length - 1; i >= 0; i--) {
        const e = looseEyes[i]!
        e.life -= dt
        if (e.life <= 0 || e.y > H + 30) {
          looseEyes.splice(i, 1)
          continue
        }
        e.vy += 1300 * dt
        e.x += e.vx * dt
        e.y += e.vy * dt
      }

      if (state === 'play' && remaining === 0 && pending.length === 0) clearLevel()
    },

    draw(g) {
      const t = stage.time
      g.drawImage(bg, -BGP, -BGP)

      // The backdrop breathes on its own and jumps with every brick.
      const beat = 0.12 + Math.sin(t * 3.1) * 0.05 + pulse * 0.6
      g.globalAlpha = Math.min(0.85, beat)
      g.drawImage(glow, W / 2 - 620 - pulse * 60, GRID_TOP + (rowsN * CH) / 2 - 330 - pulse * 40, 1240 + pulse * 120, 660 + pulse * 80)
      g.globalAlpha = 1
      for (const s of twinkles) {
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + s.ph))
        const r = s.size * (0.6 + 0.4 * a) * (1 + pulse * 0.5)
        g.globalAlpha = a * 0.8
        g.fillStyle = '#ffffff'
        g.beginPath()
        g.moveTo(s.x, s.y - r)
        g.quadraticCurveTo(s.x, s.y, s.x + r, s.y)
        g.quadraticCurveTo(s.x, s.y, s.x, s.y + r)
        g.quadraticCurveTo(s.x, s.y, s.x - r, s.y)
        g.quadraticCurveTo(s.x, s.y, s.x, s.y - r)
        g.fill()
      }
      g.globalAlpha = 1
      // Walls light up where the ball hits them.
      g.lineWidth = 10
      g.strokeStyle = '#ffffff'
      if (wallFlash[0]! > 0) {
        g.globalAlpha = wallFlash[0]!
        g.beginPath()
        g.moveTo(LEFT - 7, TOP + 20)
        g.lineTo(LEFT - 7, H + BGP)
        g.stroke()
      }
      if (wallFlash[2]! > 0) {
        g.globalAlpha = wallFlash[2]!
        g.beginPath()
        g.moveTo(RIGHT + 7, TOP + 20)
        g.lineTo(RIGHT + 7, H + BGP)
        g.stroke()
      }
      if (wallFlash[1]! > 0) {
        g.globalAlpha = wallFlash[1]!
        g.beginPath()
        g.moveTo(LEFT + 20, TOP - 7)
        g.lineTo(RIGHT - 20, TOP - 7)
        g.stroke()
      }
      g.globalAlpha = 1

      drawGoo(g, t)
      drawBricks(g, t)

      // Broken pieces and the eyes that popped off.
      for (const s of shards) {
        g.globalAlpha = Math.min(1, s.life * 3)
        g.save()
        g.translate(s.x, s.y)
        g.rotate(s.rot)
        g.fillStyle = s.color
        g.beginPath()
        g.roundRect(-s.w / 2, -s.h / 2, s.w, s.h, 3)
        g.fill()
        g.restore()
      }
      for (const e of looseEyes) {
        g.globalAlpha = Math.min(1, e.life * 3)
        g.fillStyle = '#ffffff'
        g.strokeStyle = '#1e1428'
        g.lineWidth = 1.5
        g.beginPath()
        g.arc(e.x, e.y, 6.5, 0, TAU)
        g.fill()
        g.stroke()
        g.fillStyle = '#1e1428'
        g.beginPath()
        g.arc(e.x + Math.sin(e.life * 20) * 2.5, e.y + Math.cos(e.life * 20) * 2.5, 3, 0, TAU)
        g.fill()
      }
      g.globalAlpha = 1

      // Laser bolts.
      for (const o of bolts) {
        g.fillStyle = '#ff5cf0'
        g.beginPath()
        g.roundRect(o.x - 5, o.y - 16, 10, 32, 5)
        g.fill()
        g.fillStyle = '#ffffff'
        g.beginPath()
        g.roundRect(o.x - 2, o.y - 12, 4, 24, 2)
        g.fill()
      }

      for (const c of coins) sprite(g, '⭐', c.x, c.y, 40, Math.sin(c.rot) * 0.4, Math.cos(c.rot * 1.3) * 0.5 + 0.6, 1)

      // Power-up bubbles, wobbling down.
      for (const c of capsules) {
        const img = capsuleImgs.get(c.kind)
        if (!img) continue
        const grow = ease.outBack(clamp(c.t / 0.3, 0, 1))
        const size = 96 * grow * (1 + Math.sin(c.t * 7) * 0.05)
        g.globalAlpha = 0.5
        g.drawImage(glow, c.x - size * 0.8, c.y - size * 0.8, size * 1.6, size * 1.6)
        g.globalAlpha = 1
        g.save()
        g.translate(c.x, c.y)
        g.rotate(Math.sin(c.t * 4) * 0.22)
        g.drawImage(img, -size / 2, -size / 2, size, size)
        g.restore()
      }

      // Balls: a fading trail, then the ball stretched along its path.
      const fire = fireT > 0
      const trailColor = fire ? '#ff8a3c' : heat()
      g.fillStyle = trailColor
      for (const b of balls) {
        const n = b.trail.length / 2
        for (let i = n - 1; i >= 1; i--) {
          const k = 1 - i / n
          g.globalAlpha = k * 0.42
          g.beginPath()
          g.arc(b.trail[i * 2]!, b.trail[i * 2 + 1]!, b.r * (0.35 + 0.6 * k), 0, TAU)
          g.fill()
        }
      }
      g.globalAlpha = 1
      const img = fire ? fireSprite : ballSprite
      for (const b of balls) {
        const born = b.born < 1 ? ease.outBack(b.born) : 1
        const size = (b.r / 20) * 120 * born
        if (size <= 0) continue
        g.save()
        g.translate(b.x, b.y)
        if (!b.stuck) {
          // Flat against what it just hit, then long and thin as it flies off.
          const st = b.since < 0.09 ? 0.74 + (b.since / 0.09) * 0.5 : 1.24 - Math.min(1, (b.since - 0.09) / 0.25) * 0.1
          g.rotate(Math.atan2(b.vy, b.vx))
          g.scale(st, 1 / st)
        } else {
          g.scale(1 + Math.sin(t * 9) * 0.05, 1 - Math.sin(t * 9) * 0.05)
        }
        g.drawImage(img, -size / 2, -size / 2, size, size)
        g.restore()
        if (b.r > 20) {
          // The fireball is having a great time.
          const er = b.r * 0.2
          face(g, b.x, b.y - b.r * 0.12, er, 'happy', clamp(b.vx / 500, -1, 1), clamp(b.vy / 500, -1, 1), 0)
          g.strokeStyle = '#1e1428'
          g.lineWidth = Math.max(2, er * 0.4)
          g.beginPath()
          g.moveTo(b.x - er * 2.3, b.y - b.r * 0.12 - er * 1.9)
          g.lineTo(b.x - er * 0.6, b.y - b.r * 0.12 - er * 1.2)
          g.moveTo(b.x + er * 2.3, b.y - b.r * 0.12 - er * 1.9)
          g.lineTo(b.x + er * 0.6, b.y - b.r * 0.12 - er * 1.2)
          g.stroke()
        }
      }

      drawPaddle(g, t)

      // The cleared picture pops up as one big emoji.
      if (state === 'clear') {
        const k = clamp((t - stateAt) / 0.45, 0, 1)
        const out = clamp((t - stateAt - 0.75) / 0.3, 0, 1)
        g.globalAlpha = 1 - out
        sprite(g, def.icon, W / 2, 270 - out * 60, 250 * ease.outBack(k) * (1 + out * 0.4), Math.sin(t * 9) * 0.12)
        g.globalAlpha = 1
      }

      // Score, combo and the strip of pictures (mysteries until reached).
      const sp = scorePop.value
      sprite(g, '⭐', 46, 47, 36 * sp)
      label(g, String(score), 72, 49, 34 * sp, '#ffffff', 'rgba(30,20,40,0.85)', 'left')
      if (combo >= 2) {
        const fade = clamp((COMBO_S - (t - comboAt)) / 0.6, 0, 1)
        g.globalAlpha = fade
        label(g, `x${combo}`, W / 2, 48, Math.min(30 + combo * 0.9, 54) * comboPop.value, heat())
        g.globalAlpha = 1
      }
      const n = LEVELS.length
      const cur = levelIndex % n
      for (let i = 0; i < n; i++) {
        const x = W - 40 - (n - 1 - i) * 42
        if (i < cur || levelIndex >= n) {
          sprite(g, LEVELS[i]!.icon, x, 47, i === cur ? 40 + Math.sin(t * 5) * 4 : 30)
        } else if (i === cur) {
          sprite(g, LEVELS[i]!.icon, x, 47, 40 + Math.sin(t * 5) * 4)
        } else {
          g.globalAlpha = 0.55
          label(g, '?', x, 49, 28, '#ffffff', 'rgba(30,20,40,0.6)')
          g.globalAlpha = 1
        }
      }

      if (ai && t > 2) hint(g, paddle.x, PADDLE_Y + 6, t, 50)
    },

    down(p: Pointer) {
      const t = stage.time
      everTouched = true
      lastTouchAt = t
      activeId = p.id
      paddle.tx = p.x
      fx.ring(p.x, p.y, '#ffffff', 46, 0.3)
      sfx.tick()
      // The paddle zips over with a little stretch.
      if (Math.abs(p.x - paddle.x) > 220) {
        sfx.whoosh()
        paddle.sq.value = 0.8
      } else {
        paddle.sq.value = Math.min(paddle.sq.value, 0.88)
      }
      paddle.dip.kick(-160)
      // Poke a brick and it squeaks.
      const k = grid.get(cell(Math.floor((p.x - gx0) / CW), Math.floor((p.y - GRID_TOP) / CH)))
      if (k && p.x >= gx0 && k.appear === 1) {
        k.popV += 5
        k.wobV += rnd(-14, 14)
        k.fear = 1
        const f = 700 + Math.random() * 500
        sfx.tone({ freq: f, to: f * 1.5, dur: 0.09, type: 'sine', vol: 0.18 })
        fx.burst(k.x, k.y, { count: 5, color: [shade(k.color, 0.4), '#ffffff'], speed: 200, life: 0.35, size: 7, shape: 'star' })
      }
      if (state === 'play') for (const b of balls) launch(b)
    },

    move(p: Pointer) {
      if (!p.down) return
      if (p.id !== activeId && stage.pointers.has(activeId)) return
      activeId = p.id
      paddle.tx = p.x
      lastTouchAt = stage.time
    },

    up(p: Pointer) {
      lastTouchAt = stage.time
      if (p.id === activeId) activeId = -1
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'brick-buster',
    name: 'Brick Buster',
    emoji: '🧱',
    ages: [5, 10],
    pitch: 'Slide the paddle to bounce the ball into pictures made of bricks, and catch the power-ups that rain down.',
    howTo: 'Drag anywhere to slide the paddle. Catch the bubbles. Hold the picture strip (top right) to skip a picture.',
    basedOn: 'Breakout and Arkanoid, as juiced in "Juice it or lose it"',
    whyFun: 'Every brick is the next note of a scale, power-ups drop often (three balls, then nine; a fireball; lasers; bombs), and there is no way to lose.',
  },
  create,
}
