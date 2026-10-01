// Balloon Pop Parade: balloons drift up over a meadow, a touch or a swipe pops
// them, and most of them drop something that lands on the grass and stays.
// Specials arrive as play goes on: a giant that bursts into little ones, a
// water balloon that drenches a buddy, a wiggly one that zooms about
// deflating, and a golden one that pops the whole sky in a chain.

import { blinkAt, circle, ellipse, face, hint, shadow, sprite, squash, star, volume } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { TAU, clamp, damp, dist, ease, lerp, pick, rnd, rndInt, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'

const HORIZON = 628
const LAND_TOP = 670
const LAND_BOTTOM = 738

// light, base, dark
const COLORS: readonly (readonly [string, string, string])[] = [
  ['#ffb0a8', '#ff4f4f', '#c21f2c'],
  ['#ffd39a', '#ff9524', '#d66800'],
  ['#fff6a8', '#ffd92e', '#dda200'],
  ['#b8f5ae', '#4fd060', '#1d9638'],
  ['#b4e4ff', '#3aa8ff', '#1563c4'],
  ['#e2c8ff', '#a566ff', '#652bcc'],
  ['#ffcdec', '#ff6fc2', '#cc3790'],
]
const GOLD = 7
const WATER = 8
const CLEAR = 9
const PAINTS = ['#ff3d6e', '#ff9a1f', '#ffe030', '#35d07f', '#2f9bff', '#a45cff', '#ff6fd0']
const RAINBOW = ['#ff5d5d', '#ffa63d', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff']
const TOYS = ['🧸', '⚽', '🚗', '🎁', '🏀', '🚂', '🦖', '🍭', '🤖', '🦄', '🥁', '🚀']
const CRITTERS = ['🐥', '🐸', '🐰', '🐱', '🐶', '🐧', '🐵', '🐷']

type Kind = 'plain' | 'mini' | 'toy' | 'chute' | 'paint' | 'stars' | 'giant' | 'water' | 'gold'

interface Balloon {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  r: number
  rise: number
  color: number
  paint: string
  item: string
  seed: number
  grow: number
  tilt: number
  wob: Spring
  hits: number
  lastHitAt: number
  dead: boolean
}

interface Thing {
  emoji: string
  x: number
  y: number
  vx: number
  vy: number
  groundY: number
  size: number
  rot: number
  vr: number
  sq: Spring
  state: 'fall' | 'chute' | 'rest' | 'lift'
  bounces: number
  // Seconds of waving left after a parachute landing.
  wave: number
  chuteOpen: number
  chuteColor: number
  critter: boolean
  // Stars twinkle out; everything else stays (-1).
  life: number
  limp: string
  nextHop: number
  seed: number
  dead: boolean
}

interface Drop {
  water: boolean
  x: number
  y: number
  vx: number
  vy: number
  color: string
  groundY: number
  buddy: Buddy | null
  seed: number
  dead: boolean
}

interface Buddy {
  x: number
  y: number
  targetX: number
  homeX: number
  color: string
  belly: string
  sq: Spring
  oy: number
  ovy: number
  mood: Mood
  moodUntil: number
  wet: number
  shakeAt: number
  nextWander: number
  seed: number
  step: number
}

interface Worm {
  x: number
  y: number
  ang: number
  len: number
  color: number
  zoom: boolean
  t: number
  trail: number[]
  nextPuff: number
  nextSound: number
  dead: boolean
}

function bodyPath(g: CanvasRenderingContext2D): void {
  g.beginPath()
  g.moveTo(0, 100)
  g.bezierCurveTo(-50, 92, -92, 42, -92, -12)
  g.bezierCurveTo(-92, -66, -52, -104, 0, -104)
  g.bezierCurveTo(52, -104, 92, -66, 92, -12)
  g.bezierCurveTo(92, 42, 50, 92, 0, 100)
  g.closePath()
}

const SPRITE_SCALE = 2
const SPRITE_W = 240
const SPRITE_H = 240

function makeBalloonSprite(light: string, base: string, dark: string, alpha: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = SPRITE_W * SPRITE_SCALE
  c.height = SPRITE_H * SPRITE_SCALE
  const g = c.getContext('2d')!
  g.scale(SPRITE_SCALE, SPRITE_SCALE)
  g.translate(120, 110)
  g.globalAlpha = alpha
  g.fillStyle = dark
  g.beginPath()
  g.moveTo(0, 92)
  g.lineTo(-13, 118)
  g.quadraticCurveTo(0, 112, 13, 118)
  g.closePath()
  g.fill()
  bodyPath(g)
  const grad = g.createRadialGradient(-34, -46, 6, -6, -6, 128)
  grad.addColorStop(0, light)
  grad.addColorStop(0.42, base)
  grad.addColorStop(1, dark)
  g.fillStyle = grad
  g.fill()
  // Bounce light low on the far side, and the glossy highlight.
  g.globalAlpha = alpha * 0.22
  g.beginPath()
  g.ellipse(36, 44, 40, 22, -0.7, 0, TAU)
  g.fillStyle = '#ffffff'
  g.fill()
  g.globalAlpha = Math.min(1, alpha + 0.2) * 0.7
  g.beginPath()
  g.ellipse(-42, -52, 13, 27, 0.55, 0, TAU)
  g.fill()
  g.beginPath()
  g.ellipse(-58, -12, 6, 9, 0.2, 0, TAU)
  g.fill()
  return c
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  const t = len > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / len, 0, 1) : 0
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t))
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  // ---- cached art -------------------------------------------------------
  const sprites: HTMLCanvasElement[] = COLORS.map(([l, b, d]) => makeBalloonSprite(l, b, d, 1))
  sprites[GOLD] = makeBalloonSprite('#fffbd0', '#ffc928', '#c07f00', 1)
  sprites[WATER] = makeBalloonSprite('#ffffff', '#8fdcff', '#3a9be8', 0.62)
  sprites[CLEAR] = makeBalloonSprite('#ffffff', '#eefaff', '#9fd8f2', 0.62)

  const layer = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    return [c, c.getContext('2d')!]
  }
  const [groundLayer, gg] = layer()
  const [paintLayer, pg] = layer()

  const makeSky = (top: string, mid: string, low: string, stars: boolean): HTMLCanvasElement => {
    const [skyLayer, sg] = layer()
    const grad = sg.createLinearGradient(0, 0, 0, HORIZON + 20)
    grad.addColorStop(0, top)
    grad.addColorStop(0.6, mid)
    grad.addColorStop(1, low)
    sg.fillStyle = grad
    sg.fillRect(0, 0, W, H)
    if (stars) {
      for (let i = 0; i < 90; i++) {
        const x = stage.rand() * W
        const y = stage.rand() * (HORIZON - 40)
        const r = 1.5 + stage.rand() * 3
        if (i % 9 === 0) star(sg, x, y, r * 3.2, '#fff6b0', stage.rand())
        else circle(sg, x, y, r, 'rgba(255,255,255,0.85)')
      }
    }
    // Bunting along the top: it is a parade.
    const sag = (x: number, y0: number, depth: number, from: number, to: number) => y0 + depth * Math.sin(((x - from) / (to - from)) * Math.PI)
    const spans: [number, number, number, number][] = [
      [-20, 430, 8, 64],
      [400, 830, 4, 58],
      [800, 1200, 8, 64],
    ]
    let flag = 0
    for (const [from, to, y0, depth] of spans) {
      sg.strokeStyle = 'rgba(255,255,255,0.9)'
      sg.lineWidth = 3
      sg.beginPath()
      for (let x = from; x <= to; x += 10) {
        const y = sag(x, y0, depth, from, to)
        if (x === from) sg.moveTo(x, y)
        else sg.lineTo(x, y)
      }
      sg.stroke()
      for (let x = from + 26; x < to - 20; x += 46) {
        const y = sag(x, y0, depth, from, to)
        const y2 = sag(x + 34, y0, depth, from, to)
        sg.fillStyle = RAINBOW[flag++ % RAINBOW.length]!
        sg.beginPath()
        sg.moveTo(x, y)
        sg.lineTo(x + 34, y2)
        sg.lineTo(x + 17, (y + y2) / 2 + 40)
        sg.closePath()
        sg.fill()
      }
    }
    return skyLayer
  }
  // Each parade moves the day on: noon, sunset, night, and round again.
  const skies = [makeSky('#39a9ee', '#8fd8ff', '#e9faff', false), makeSky('#5f57c9', '#ff9d7a', '#ffe6a6', false), makeSky('#141a55', '#34348c', '#8a70c4', true)]
  {
    ellipse(gg, 210, HORIZON + 95, 420, 150, '#a8e58f')
    ellipse(gg, 960, HORIZON + 110, 480, 170, '#9adf86')
    ellipse(gg, 590, HORIZON + 150, 560, 170, '#86d673')
    const grad = gg.createLinearGradient(0, HORIZON + 20, 0, H)
    grad.addColorStop(0, '#79d166')
    grad.addColorStop(1, '#46a845')
    gg.fillStyle = grad
    gg.beginPath()
    gg.moveTo(0, HORIZON + 34)
    gg.quadraticCurveTo(W * 0.3, HORIZON + 4, W * 0.55, HORIZON + 26)
    gg.quadraticCurveTo(W * 0.8, HORIZON + 46, W, HORIZON + 18)
    gg.lineTo(W, H)
    gg.lineTo(0, H)
    gg.closePath()
    gg.fill()
    // Trees on the far hills.
    for (const [tx, ty, ts] of [
      [70, HORIZON + 10, 1.15],
      [1115, HORIZON + 4, 1.25],
      [330, HORIZON - 14, 0.7],
      [835, HORIZON - 6, 0.75],
    ] as const) {
      gg.fillStyle = '#8a5a3a'
      gg.fillRect(tx - 7 * ts, ty - 50 * ts, 14 * ts, 62 * ts)
      circle(gg, tx, ty - 84 * ts, 46 * ts, '#3fa850')
      circle(gg, tx - 30 * ts, ty - 60 * ts, 30 * ts, '#3fa850')
      circle(gg, tx + 30 * ts, ty - 60 * ts, 30 * ts, '#3fa850')
      circle(gg, tx - 12 * ts, ty - 96 * ts, 22 * ts, '#5cc366')
    }
    // Tufts and flowers.
    for (let i = 0; i < 70; i++) {
      const x = stage.rand() * W
      const y = lerp(HORIZON + 50, H - 8, stage.rand())
      gg.strokeStyle = 'rgba(40,130,50,0.45)'
      gg.lineWidth = 3
      gg.lineCap = 'round'
      gg.beginPath()
      gg.moveTo(x - 6, y)
      gg.lineTo(x - 9, y - 12)
      gg.moveTo(x, y)
      gg.lineTo(x, y - 16)
      gg.moveTo(x + 6, y)
      gg.lineTo(x + 9, y - 12)
      gg.stroke()
    }
    for (let i = 0; i < 34; i++) {
      const x = stage.rand() * W
      const y = lerp(HORIZON + 46, H - 12, stage.rand())
      const s = lerp(0.6, 1.2, (y - HORIZON) / (H - HORIZON))
      const petal = pick(['#ffffff', '#ffe36e', '#ffb3de', '#ffffff'], stage.rand())
      for (let k = 0; k < 5; k++) circle(gg, x + Math.cos((k / 5) * TAU) * 7 * s, y + Math.sin((k / 5) * TAU) * 5 * s, 5 * s, petal)
      circle(gg, x, y, 4 * s, '#ff9f1c')
    }
  }
  const shade = (color: string): HTMLCanvasElement => {
    const [c, cg] = layer()
    cg.drawImage(groundLayer, 0, 0)
    cg.globalCompositeOperation = 'source-atop'
    cg.fillStyle = color
    cg.fillRect(0, 0, W, H)
    return c
  }
  const grounds = [groundLayer, shade('rgba(255,130,60,0.24)'), shade('rgba(22,26,110,0.46)')]

  // ---- state ------------------------------------------------------------
  const balloons: Balloon[] = []
  const things: Thing[] = []
  const drops: Drop[] = []
  const worms: Worm[] = []
  const clouds = [0, 1, 2].map((i) => ({ x: 120 + i * 420 + stage.rand() * 80, y: 120 + stage.rand() * 120, s: 0.8 + stage.rand() * 0.5 }))
  const sun = { x: 1064, y: 150, spin: 0, spinVel: 0, sq: spring(1, 200, 9), mood: 'happy' as Mood, moodUntil: 0 }
  const mkBuddy = (x: number, color: string, seed: number): Buddy => ({
    x,
    y: 752,
    targetX: x,
    homeX: x,
    color,
    belly: 'rgba(255,255,255,0.4)',
    sq: spring(1, 210, 9),
    oy: 0,
    ovy: 0,
    mood: 'happy',
    moodUntil: 0,
    wet: 0,
    shakeAt: -1,
    nextWander: 2 + seed,
    seed,
    step: 0,
  })
  const buddies: Buddy[] = [mkBuddy(330, '#ffa53d', 1), mkBuddy(850, '#b48cff', 4)]

  let pops = 0
  let streak = 0
  let lastPopAt = -10
  let lastTouchAt = 0
  let lookX = W / 2
  let lookY = H / 2
  let lookAt = -10
  let spawnIn = 0
  let lastSpawnX = W / 2
  let specialIndex = 0
  let nextSpecialAt = 6
  let bands = 0
  let bandsShown = 0
  let bandPops = 0
  let parades = 0
  let phase = 0
  let prevPhase = 0
  let phaseBlend = 1
  let shimmer = 0
  let trailDist = 0

  // ---- helpers ----------------------------------------------------------
  const setMood = (b: { mood: Mood; moodUntil: number }, mood: Mood, seconds: number) => {
    b.mood = mood
    b.moodUntil = stage.time + seconds
  }

  const spawnBalloon = (kind: Kind, opts: { x?: number; y?: number; rush?: boolean; r?: number } = {}): Balloon => {
    let r = rnd(54, 82)
    let rise = rnd(40, 68)
    if (kind === 'giant') {
      r = 128
      rise = 36
    } else if (kind === 'water') {
      r = 84
      rise = 40
    } else if (kind === 'gold') {
      r = 74
      rise = 58
    } else if (kind === 'mini') {
      r = rnd(44, 52)
      rise = rnd(55, 80)
    } else if (kind !== 'plain') {
      r = rnd(66, 86)
    }
    if (opts.r) r = opts.r
    let x = opts.x
    if (x === undefined) {
      // Not right where the last one came up.
      for (let tries = 0; tries < 6; tries++) {
        x = rnd(r * 0.8 + 10, W - r * 0.8 - 10)
        if (Math.abs(x - lastSpawnX) > 190) break
      }
      lastSpawnX = x!
    }
    const b: Balloon = {
      kind,
      x: x!,
      y: opts.y ?? H + r + 30 + (opts.rush && !opts.x ? 0 : opts.rush ? rnd(0, 160) : 0),
      vx: 0,
      vy: opts.rush ? -rnd(650, 1900) : 0,
      r,
      rise,
      color: kind === 'gold' ? GOLD : kind === 'water' ? WATER : kind === 'paint' ? CLEAR : rndInt(0, COLORS.length - 1),
      paint: pick(PAINTS),
      item: kind === 'toy' ? pick(TOYS) : kind === 'chute' ? pick(CRITTERS) : kind === 'stars' ? '⭐' : kind === 'water' ? '💧' : '',
      seed: rnd(0, 100),
      grow: 1,
      tilt: 0,
      wob: spring(1, 170, 7),
      hits: 0,
      lastHitAt: -10,
      dead: false,
    }
    balloons.push(b)
    return b
  }

  const randomKind = (): Kind => {
    const roll = Math.random()
    if (roll < 0.3) return 'plain'
    if (roll < 0.55) return 'toy'
    if (roll < 0.73) return 'chute'
    if (roll < 0.88) return 'paint'
    return 'stars'
  }

  const dust = (x: number, y: number, n = 8) =>
    fx.burst(x, y, { count: n, color: ['#ffffff', '#e8ffd8'], speed: 220, angle: -Math.PI / 2, spread: Math.PI * 0.9, life: 0.4, size: 9, gravity: 300 })

  const hopBuddy = (b: Buddy, power = 420) => {
    if (b.oy > 2) return
    b.ovy = power
    b.oy = 0.1
    b.sq.value = 0.8
    b.sq.kick(5)
  }

  // Everything near a landing jumps: the ground notices new arrivals.
  const arrive = (x: number, from: Thing | null) => {
    let n = 0
    for (const t of things) {
      if (t === from || t.state !== 'rest' || t.life >= 0) continue
      const d = Math.abs(t.x - x)
      if (d > 190 || t.y < t.groundY - 2) continue
      t.vy = -rnd(240, 430) * (1 - d / 300)
      t.y = t.groundY - 1
      t.vr = t.critter ? 0 : rnd(-2, 2)
      n++
    }
    for (const b of buddies) {
      if (Math.abs(b.x - x) < 240) {
        hopBuddy(b, 330)
        if (b.wet <= 0) setMood(b, 'wow', 0.7)
      }
    }
    if (n > 0) sfx.boing(rndInt(2, 5))
  }

  const addThing = (emoji: string, x: number, y: number, init: Partial<Thing> = {}): Thing => {
    const critter = init.critter ?? false
    const t: Thing = {
      emoji,
      x,
      y,
      vx: rnd(-70, 70),
      vy: -rnd(180, 320),
      groundY: rnd(LAND_TOP, LAND_BOTTOM),
      size: critter ? 68 : rnd(58, 74),
      rot: 0,
      vr: rnd(-5, 5),
      sq: spring(1, 230, 9),
      state: 'fall',
      bounces: 0,
      wave: 0,
      chuteOpen: 0,
      chuteColor: rndInt(0, COLORS.length - 1),
      critter,
      life: -1,
      limp: '',
      nextHop: stage.time + rnd(3, 8),
      seed: rnd(0, 100),
      dead: false,
      ...init,
    }
    things.push(t)
    // The meadow holds about two dozen; the oldest is carried off by a balloon.
    const resting = things.filter((o) => o.state === 'rest' && o.life < 0)
    if (resting.length > 18) {
      const old = resting[0]!
      old.state = 'lift'
      old.vy = 0
      sfx.slideUp()
    }
    return t
  }

  const splat = (x: number, y: number, color: string, scale = 1) => {
    const blob = (bx: number, by: number, rx: number) => {
      pg.beginPath()
      pg.ellipse(bx, by, rx, rx * 0.42, 0, 0, TAU)
      pg.fill()
    }
    pg.fillStyle = color
    const R = rnd(58, 84) * scale
    blob(x, y, R)
    for (let i = 0; i < 9; i++) {
      const a = rnd(0, TAU)
      const d = R * rnd(0.7, 1.7)
      blob(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.42, R * rnd(0.12, 0.36))
    }
    pg.fillStyle = 'rgba(255,255,255,0.3)'
    blob(x - R * 0.3, y - R * 0.12, R * 0.34)
  }

  const nearestBuddy = (x: number): Buddy => {
    const [a, b] = [buddies[0]!, buddies[1]!]
    return Math.abs(a.x - x) <= Math.abs(b.x - x) ? a : b
  }

  const drench = (b: Buddy, x: number) => {
    sfx.splat()
    sfx.noise({ dur: 0.5, freq: 2600, to: 500, vol: 0.22, filter: 'lowpass' })
    fx.burst(x, b.y - 110, { count: 34, color: ['#7fd0ff', '#c8efff', '#4aa8f0'], speed: 620, angle: -Math.PI / 2, spread: Math.PI * 1.1, life: 0.8, size: 13, gravity: 1500 })
    fx.ring(x, b.y - 60, '#c8efff', 170, 0.4)
    fx.shake(7)
    fx.text(b.x, b.y - 190, '💦', { size: 64, life: 0.9 })
    pg.fillStyle = 'rgba(150,215,255,0.5)'
    pg.beginPath()
    pg.ellipse(b.x, b.y + 4, 120, 34, 0, 0, TAU)
    pg.fill()
    b.sq.value = 0.5
    b.sq.kick(-2)
    b.wet = 3
    b.shakeAt = stage.time + 1.1
    setMood(b, 'dizzy', 1.1)
    arrive(b.x, null)
  }

  const popSound = (step: number) => {
    sfx.pop(step)
    // The rubbery snap under the pitched pop.
    sfx.noise({ dur: 0.05, freq: 1800, vol: 0.2, filter: 'bandpass', q: 0.7 })
  }

  const release = (b: Balloon) => {
    const { x, y } = b
    if (b.kind === 'toy') {
      addThing(b.item, x, y)
    } else if (b.kind === 'chute') {
      addThing(b.item, x, y, { critter: true, state: 'chute', vy: 0, vx: 0, rot: 0, vr: 0, groundY: Math.max(rnd(LAND_TOP, LAND_BOTTOM), y + 40), chuteColor: b.color })
      stage.after(0.12, () => sfx.whoosh())
    } else if (b.kind === 'paint') {
      drops.push({ water: false, x, y, vx: rnd(-40, 40), vy: -160, color: b.paint, groundY: Math.max(rnd(LAND_TOP - 20, LAND_BOTTOM + 10), y + 30), buddy: null, seed: rnd(0, 9), dead: false })
      fx.burst(x, y, { count: 14, color: b.paint, speed: 420, life: 0.6, size: 12, gravity: 1100 })
    } else if (b.kind === 'stars') {
      fx.burst(x, y, { count: 26, color: ['#ffe14d', '#fff6b0', '#ffb02e'], speed: 520, life: 1.1, size: 15, gravity: 800, shape: 'star' })
      for (let i = 0; i < 5; i++) {
        addThing('⭐', x + rnd(-30, 30), y + rnd(-30, 30), { size: rnd(34, 48), vx: rnd(-260, 260), vy: -rnd(200, 520), life: rnd(5, 8) })
        stage.after(0.05 + i * 0.07, () => sfx.ding(i + rndInt(0, 1)))
      }
    } else if (b.kind === 'water') {
      const buddy = nearestBuddy(x)
      drops.push({ water: true, x, y, vx: 0, vy: -120, color: '#6cc8ff', groundY: buddy.y - 96, buddy, seed: rnd(0, 9), dead: false })
      fx.burst(x, y, { count: 22, color: ['#7fd0ff', '#c8efff'], speed: 460, life: 0.6, size: 11, gravity: 1200 })
      sfx.splat()
    }
  }

  const rush = (n: number) => {
    for (let i = 0; i < n; i++) spawnBalloon(randomKind(), { rush: true, x: ((i + 0.5) / n) * (W - 160) + 80 + rnd(-30, 30) })
  }

  const parade = () => {
    parades++
    shimmer = 1
    sfx.fanfare()
    fx.flash('#fff6c0', 0.35, 0.4)
    for (const cx of [200, 590, 980]) fx.confetti(cx, 140, 60)
    fx.text(W / 2, 330, '🎉', { size: 150, life: 1.6, rise: 80 })
    sun.spinVel = 16
    setMood(sun, 'yum', 3)
    for (const b of buddies) {
      hopBuddy(b, 620)
      if (b.wet <= 0) setMood(b, 'yum', 2.5)
    }
    for (const t of things) {
      if (t.state === 'rest' && t.life < 0) {
        t.vy = -rnd(300, 620)
        t.y = t.groundY - 1
      }
    }
    rush(16)
    // A parade always has the big one in it.
    if (!balloons.some((b) => b.kind === 'gold')) stage.after(1.2, () => spawnBalloon('gold', { rush: true }))
    // The day moves on, and the rainbow is there to be built again.
    stage.after(0.9, () => {
      prevPhase = phase
      phase = (phase + 1) % skies.length
      phaseBlend = 0
      sun.sq.value = 0.6
      sfx.slideUp()
    })
    stage.after(3.5, () => {
      bands = 0
      bandPops = 0
    })
  }

  const countPop = () => {
    pops++
    if (bands >= RAINBOW.length) return
    bandPops++
    if (bandPops < 6) return
    bandPops = 0
    {
      bands++
      sfx.ding(bands)
      const radius = 470 - (bands - 1) * 24
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI
        fx.burst(W / 2 + Math.cos(a) * radius, HORIZON + 60 + Math.sin(a) * radius, { count: 3, color: RAINBOW[bands - 1]!, speed: 140, life: 0.7, size: 12, shape: 'star' })
      }
      if (bands === RAINBOW.length) stage.after(0.5, parade)
    }
  }

  const pop = (b: Balloon, chainStep = -1): void => {
    if (b.dead) return
    b.dead = true
    const { x, y, r } = b
    const step = chainStep >= 0 ? chainStep : streak
    if (chainStep < 0) {
      streak = stage.time - lastPopAt < 1.6 ? streak + 1 : 0
      lastPopAt = stage.time
    }
    popSound(step < 10 ? step : 5 + (step % 5))
    const c = b.color < COLORS.length ? COLORS[b.color]! : b.kind === 'gold' ? (['#fffbd0', '#ffc928', '#c07f00'] as const) : (['#ffffff', '#bfeaff', '#8fdcff'] as const)
    fx.burst(x, y, { count: Math.round(8 + r / 8), color: [c[0], c[1], c[2]], speed: 380 + r * 3, life: 0.55, size: 7 + r / 9, gravity: 900, shape: 'square', drag: 0.94 })
    fx.burst(x, y, { count: 8, color: '#ffffff', speed: 520 + r * 2, life: 0.22, size: 10, shape: 'spark' })
    fx.ring(x, y, '#ffffff', r * 1.5, 0.25)
    if (b.kind === 'plain' || b.kind === 'mini') fx.confetti(x, y, 9)
    // Neighbours feel it.
    for (const o of balloons) {
      if (o.dead || o === b) continue
      const d = dist(x, y, o.x, o.y)
      const reach = r + o.r + 150
      if (d > reach || d < 1) continue
      const push = (1 - d / reach) * 260
      o.vx += ((o.x - x) / d) * push
      o.vy += ((o.y - y) / d) * push
      o.wob.kick((Math.random() < 0.5 ? -1 : 1) * 2.4)
    }
    countPop()

    if (b.kind === 'giant') {
      fx.hitstop(80)
      fx.shake(16, 0.4)
      fx.flash('#ffffff', 0.3, 0.15)
      fx.confetti(x, y, 50)
      fx.ring(x, y, c[1], 330, 0.5)
      sfx.thud(1.6)
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + rnd(-0.2, 0.2)
        const m = spawnBalloon('mini', { x: x + Math.cos(a) * 40, y: y + Math.sin(a) * 40 })
        const sp = rnd(520, 760)
        m.vx = Math.cos(a) * sp
        m.vy = Math.sin(a) * sp
        m.grow = 0.3
        stage.tween(0.35, (t) => (m.grow = lerp(0.3, 1, t)), ease.outBack)
      }
      for (const bd of buddies) if (bd.wet <= 0) setMood(bd, 'wow', 1.2)
    } else if (b.kind === 'gold') {
      fx.hitstop(90)
      fx.flash('#ffe98a', 0.45, 0.3)
      fx.shake(10, 0.3)
      fx.ring(x, y, '#ffe14d', 700, 0.7)
      fx.burst(x, y, { count: 40, color: ['#ffe14d', '#fff6b0', '#ffffff'], speed: 800, life: 0.9, size: 16, shape: 'star', gravity: 300 })
      sfx.coin(2)
      setMood(sun, 'wow', 2.5)
      sun.spinVel = 10
      const order = balloons.filter((o) => !o.dead).sort((p, q) => dist(x, y, p.x, p.y) - dist(x, y, q.x, q.y))
      order.forEach((o, i) => stage.after(0.14 + i * 0.075, () => pop(o, i)))
      const wormsNow = worms.filter((w) => !w.zoom)
      wormsNow.forEach((w, i) => stage.after(0.3 + i * 0.2, () => startZoom(w)))
      const end = 0.3 + order.length * 0.075
      stage.after(end, () => {
        sfx.fanfare()
        fx.confetti(W / 2, 200, 70)
        rush(9)
      })
    } else {
      release(b)
    }
  }

  // A tap or a swipe reaching a balloon. The giant takes three.
  const hit = (b: Balloon): void => {
    if (b.dead) return
    if (b.kind !== 'giant') {
      pop(b)
      return
    }
    if (stage.time - b.lastHitAt < 0.28) return
    b.lastHitAt = stage.time
    b.hits++
    if (b.hits >= 3) {
      pop(b)
      return
    }
    // Anticipation: it swells, creaks and looks worried.
    const from = b.r
    stage.tween(0.35, (t) => (b.r = lerp(from, from + 20, t)), ease.outBack)
    b.wob.value = 0.72
    b.wob.kick(4)
    sfx.boing(b.hits * 2)
    sfx.tone({ freq: 500 + b.hits * 180, to: 900 + b.hits * 260, dur: 0.18, type: 'sawtooth', vol: 0.06 })
    fx.ring(b.x, b.y, '#ffffff', b.r * 1.3, 0.3)
    fx.burst(b.x, b.y, { count: 10, color: '#ffffff', speed: 420, life: 0.3, size: 9, shape: 'spark' })
    fx.shake(4)
  }

  const startZoom = (w: Worm) => {
    if (w.zoom || w.dead) return
    w.zoom = true
    w.t = 0
    w.ang = rnd(-Math.PI * 0.8, -Math.PI * 0.2)
    w.trail.length = 0
    sfx.tone({ freq: 300, to: 900, dur: 0.18, type: 'square', vol: 0.12 })
    sfx.whoosh()
    fx.ring(w.x, w.y, '#ffffff', 90, 0.3)
    fx.shake(5)
    countPop()
  }

  // ---- opening sky: already full, already moving -------------------------
  {
    const kinds: Kind[] = ['plain', 'toy', 'plain', 'chute', 'paint', 'plain', 'stars', 'toy', 'plain', 'chute', 'plain', 'toy']
    kinds.forEach((kind, i) => {
      const col = i % 6
      const row = Math.floor(i / 6)
      const b = spawnBalloon(kind, {
        x: 110 + col * 190 + (row ? 95 : 0) + (stage.rand() - 0.5) * 50,
        y: 190 + row * 250 + (stage.rand() - 0.5) * 120 + (col % 2) * 60,
      })
      b.color = b.kind === 'paint' ? CLEAR : (i * 3 + row) % COLORS.length
      b.grow = 0
      stage.after(i * 0.035, () => stage.tween(0.4, (t) => (b.grow = t), ease.outBack))
    })
  }

  // ---- update -----------------------------------------------------------
  const updateBalloons = (dt: number) => {
    const finger = stage.time - lookAt < 2.5
    for (const b of balloons) {
      if (b.dead) continue
      b.wob.update(dt)
      b.vx = damp(b.vx, 0, 2.6, dt)
      b.vy = damp(b.vy, 0, 2.6, dt)
      const sway = Math.sin(stage.time * 0.9 + b.seed) * 16
      b.x += (b.vx + sway) * dt
      b.y += (b.vy - b.rise) * dt
      const edge = b.r * 0.7
      if (b.x < edge) b.vx += (edge - b.x) * 12 * dt
      if (b.x > W - edge) b.vx -= (b.x - (W - edge)) * 12 * dt
      // Lean into the drift, and a little toward the finger.
      let lean = clamp((b.vx + sway) / 300, -0.35, 0.35)
      if (finger) lean += clamp((lookX - b.x) / 1600, -0.12, 0.12)
      b.tilt = damp(b.tilt, lean, 5, dt)
      if (b.y < -b.r - 140) b.dead = true
    }
    // Soft bumps.
    for (let i = 0; i < balloons.length; i++) {
      const a = balloons[i]!
      if (a.dead) continue
      for (let j = i + 1; j < balloons.length; j++) {
        const b = balloons[j]!
        if (b.dead) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const min = (a.r + b.r) * 0.9
        const d2 = dx * dx + dy * dy
        if (d2 >= min * min || d2 < 0.01) continue
        const d = Math.sqrt(d2)
        const over = (min - d) / min
        const f = over * 900 * dt
        const ma = b.r / (a.r + b.r)
        a.vx -= (dx / d) * f * ma * 2
        a.vy -= (dy / d) * f * ma * 2
        b.vx += (dx / d) * f * (1 - ma) * 2
        b.vy += (dy / d) * f * (1 - ma) * 2
        if (over > 0.12) {
          a.wob.kick(-over * 40 * dt)
          b.wob.kick(over * 40 * dt)
        }
      }
    }
  }

  const landThing = (t: Thing) => {
    t.y = t.groundY
    const speed = Math.abs(t.vy)
    if (t.state === 'chute') {
      t.state = 'rest'
      t.wave = 1.5
      t.rot = 0
      t.vy = 0
      t.sq.value = 0.7
      dust(t.x, t.y, 6)
      sfx.note(6, 0.09, 'sine', 0.2)
      stage.after(0.1, () => sfx.note(9, 0.12, 'sine', 0.2))
      fx.burst(t.x, t.y - 80, { count: 4, color: '#ff7ac8', speed: 160, life: 0.8, size: 14, shape: 'heart', angle: -Math.PI / 2, spread: 1.2, gravity: -60 })
      arrive(t.x, t)
      return
    }
    if (t.state === 'fall') {
      if (speed > 220 && t.bounces < 3) {
        t.bounces++
        t.vy = -speed * 0.48
        t.vx *= 0.7
        t.vr *= 0.6
        t.sq.value = 0.62
        if (t.life < 0) {
          sfx.thud(clamp(speed / 900, 0.3, 1))
          dust(t.x, t.y, 6)
          if (t.bounces === 1) arrive(t.x, t)
        } else if (t.bounces === 1) sfx.tick()
      } else {
        t.state = 'rest'
        t.vy = 0
        t.vx = 0
        t.vr = 0
        t.rot = t.limp ? 0 : Math.round(t.rot / TAU) * TAU + rnd(-0.12, 0.12)
        t.sq.value = 0.85
      }
      return
    }
    // A resting thing coming down from a hop.
    if (speed > 120) {
      t.sq.value = 0.75
      t.rot = t.critter || t.limp ? 0 : rnd(-0.12, 0.12)
    }
    t.vy = 0
    t.vr = 0
  }

  const updateThings = (dt: number) => {
    for (const t of things) {
      t.sq.update(dt)
      if (t.life >= 0 && t.state === 'rest') {
        t.life -= dt
        if (t.life <= 0) t.dead = true
      }
      if (t.state === 'chute') {
        t.chuteOpen = Math.min(1, t.chuteOpen + dt * 3.5)
        t.vy = damp(t.vy, 105, 4, dt)
        t.y += t.vy * dt
        t.x = clamp(t.x + Math.cos(stage.time * 2 + t.seed) * 46 * dt, 50, W - 50)
        t.rot = Math.sin(stage.time * 2 + t.seed) * 0.16
        if (t.y >= t.groundY) landThing(t)
      } else if (t.state === 'fall') {
        t.vy += 1700 * dt
        t.y += t.vy * dt
        t.x += t.vx * dt
        t.rot += t.vr * dt
        if (t.x < 40 || t.x > W - 40) {
          t.vx = -t.vx
          t.x = clamp(t.x, 40, W - 40)
        }
        if (t.y >= t.groundY && t.vy > 0) landThing(t)
      } else if (t.state === 'rest') {
        t.chuteOpen = Math.max(0, t.chuteOpen - dt * 2.5)
        if (t.wave > 0) {
          t.wave -= dt
          t.rot = Math.sin(stage.time * 15) * 0.22 * Math.min(1, t.wave * 2)
        }
        if (t.y < t.groundY || t.vy < 0) {
          t.vy += 1700 * dt
          t.y += t.vy * dt
          t.rot += t.vr * dt
          if (t.y >= t.groundY) {
            t.y = t.groundY
            landThing(t)
          }
        } else if (t.critter && stage.time > t.nextHop) {
          // Critters fidget on their own.
          t.nextHop = stage.time + rnd(3, 9)
          t.vy = -rnd(160, 260)
          t.y = t.groundY - 1
        }
      } else {
        t.vy = damp(t.vy, -170, 2, dt)
        t.y += t.vy * dt
        t.x += Math.sin(stage.time * 1.7 + t.seed) * 22 * dt
        t.rot = Math.sin(stage.time * 2 + t.seed) * 0.2
        if (t.y < -200) t.dead = true
      }
    }
  }

  const updateDrops = (dt: number) => {
    for (const d of drops) {
      d.vy += 1500 * dt
      d.y += d.vy * dt
      if (d.buddy) d.x = damp(d.x, d.buddy.x, 7, dt)
      else d.x += d.vx * dt
      if (d.y < d.groundY) continue
      d.dead = true
      if (d.water && d.buddy) {
        drench(d.buddy, d.x)
        continue
      }
      splat(d.x, d.groundY, d.color)
      sfx.splat()
      fx.burst(d.x, d.groundY, { count: 20, color: d.color, speed: 430, angle: -Math.PI / 2, spread: Math.PI * 0.95, life: 0.6, size: 12, gravity: 1400 })
      fx.shake(3)
      arrive(d.x, null)
      // A buddy standing there comes out that colour.
      for (const b of buddies) {
        if (Math.abs(b.x - d.x) < 95 && Math.abs(b.y - d.groundY) < 70) {
          b.color = d.color
          b.sq.value = 0.6
          setMood(b, 'wow', 1)
          fx.burst(b.x, b.y - 60, { count: 12, color: d.color, speed: 380, life: 0.5, size: 12, gravity: 900 })
        }
      }
    }
  }

  const updateBuddies = (dt: number) => {
    const water = balloons.find((b) => b.kind === 'water' && !b.dead)
    const chaser = water ? nearestBuddy(water.x) : null
    for (const b of buddies) {
      b.sq.update(dt)
      if (b.oy > 0 || b.ovy > 0) {
        b.ovy -= 1700 * dt
        b.oy += b.ovy * dt
        if (b.oy <= 0) {
          b.oy = 0
          b.ovy = 0
          b.sq.value = 0.72
          dust(b.x, b.y, 5)
        }
      }
      if (stage.time > b.moodUntil && b.wet <= 0) b.mood = 'happy'
      if (b.wet > 0) {
        b.wet -= dt
        if (b.shakeAt > 0 && stage.time >= b.shakeAt) {
          // The shake-off.
          b.shakeAt = -1
          setMood(b, 'grumpy', 0.7)
          for (let i = 0; i < 6; i++) {
            stage.after(i * 0.09, () => {
              sfx.noise({ dur: 0.06, freq: 2400, vol: 0.13, filter: 'highpass' })
              fx.burst(b.x, b.y - 70, { count: 7, color: ['#7fd0ff', '#c8efff'], speed: 520, life: 0.45, size: 9, gravity: 1000 })
            })
          }
          stage.after(0.7, () => {
            b.wet = 0
            setMood(b, 'yum', 1.4)
            hopBuddy(b, 480)
            ;[7, 9, 7, 10].forEach((n, i) => stage.after(i * 0.09, () => sfx.note(n, 0.08, 'sine', 0.2)))
          })
        }
        continue
      }
      if (chaser === b && water) {
        // It cannot resist standing under the water balloon.
        b.targetX = clamp(water.x, 70, W - 70)
      } else if (stage.time > b.nextWander) {
        b.nextWander = stage.time + rnd(3, 6)
        b.targetX = clamp(b.homeX + rnd(-230, 230), 80, W - 80)
      }
      const dx = b.targetX - b.x
      if (Math.abs(dx) > 4) {
        const v = clamp(dx * 3, -210, 210)
        b.x += v * dt
        b.step += Math.abs(v) * dt * 0.06
      }
    }
    // They do not stand inside each other.
    const [a, c] = [buddies[0]!, buddies[1]!]
    if (Math.abs(a.x - c.x) < 130) {
      const mid = (a.x + c.x) / 2
      const dir = a.x <= c.x ? -1 : 1
      a.x = mid + dir * 65
      c.x = mid - dir * 65
    }
  }

  const updateWorms = (dt: number) => {
    for (const w of worms) {
      if (!w.zoom) {
        w.y -= (58 + Math.max(0, w.y - 430) * 1.6) * dt
        w.x += Math.sin(stage.time * 1.1 + w.len) * 20 * dt
        if (w.y < -w.len - 60) w.dead = true
        continue
      }
      w.t += dt
      const life = 2.7
      const k = w.t / life
      const speed = lerp(1150, 560, k)
      w.ang += (Math.sin(w.t * 9) * 4.4 + Math.sin(w.t * 3.1) * 2.2) * dt
      w.x += Math.cos(w.ang) * speed * dt
      w.y += Math.sin(w.ang) * speed * dt
      if (w.x < 50 || w.x > W - 50) {
        w.ang = Math.PI - w.ang
        w.x = clamp(w.x, 50, W - 50)
        sfx.tick()
      }
      if (w.y < 50 || w.y > HORIZON) {
        w.ang = -w.ang
        w.y = clamp(w.y, 50, HORIZON)
        sfx.tick()
      }
      w.trail.unshift(w.x, w.y)
      if (w.trail.length > 36) w.trail.length = 36
      w.len = lerp(230, 50, k)
      if (w.t > w.nextPuff) {
        w.nextPuff = w.t + 0.04
        fx.burst(w.x - Math.cos(w.ang) * 30, w.y - Math.sin(w.ang) * 30, { count: 1, color: '#ffffff', speed: 60, life: 0.5, size: 16 })
      }
      if (w.t > w.nextSound) {
        // The raspberry.
        w.nextSound = w.t + 0.075
        const f = lerp(210, 120, k) * rnd(0.85, 1.2)
        sfx.tone({ freq: f, to: f * 0.6, dur: 0.07, type: 'sawtooth', vol: 0.11 })
      }
      for (const b of balloons) {
        if (!b.dead && b.grow > 0.8 && dist(w.x, w.y, b.x, b.y) < b.r + 26) {
          if (b.kind === 'giant') hit(b)
          else pop(b)
        }
      }
      if (w.t >= life) {
        w.dead = true
        sfx.slideDown()
        fx.burst(w.x, w.y, { count: 12, color: '#ffffff', speed: 260, life: 0.5, size: 12 })
        addThing('', w.x, w.y, { limp: COLORS[w.color]![1], size: 50, vy: -260, vx: Math.cos(w.ang) * 120 })
      }
    }
  }

  const spawnSpecial = () => {
    const order = ['giant', 'water', 'worm', 'gold'] as const
    let kind: (typeof order)[number]
    if (specialIndex < order.length) kind = order[specialIndex]!
    else kind = pick(['giant', 'water', 'worm', 'gold', 'giant', 'water', 'worm'] as const)
    specialIndex++
    if (kind === 'worm') {
      if (worms.length >= 2) return
      sfx.whoosh()
      worms.push({ x: rnd(220, W - 220), y: H + 40, ang: 0, len: 230, color: rndInt(0, COLORS.length - 1), zoom: false, t: 0, trail: [], nextPuff: 0, nextSound: 0, dead: false })
      return
    }
    if (balloons.some((b) => b.kind === kind && !b.dead)) return
    const b = spawnBalloon(kind, { rush: true })
    b.vy = kind === 'giant' ? -1150 : -900
    sfx.whoosh()
    if (kind === 'gold') sfx.ding(8)
    if (kind === 'giant') b.x = clamp(b.x, 220, W - 220)
  }

  const prune = <T extends { dead: boolean }>(list: T[]) => {
    for (let i = list.length - 1; i >= 0; i--) if (list[i]!.dead) list.splice(i, 1)
  }

  // ---- drawing ----------------------------------------------------------
  const drawBalloon = (g: CanvasRenderingContext2D, b: Balloon) => {
    const time = stage.time
    const s = (b.r / 100) * b.grow
    if (s < 0.02) return
    let stretch = b.wob.value
    if (b.kind === 'water') stretch *= 1 + Math.sin(time * 5 + b.seed) * 0.07
    const [sx, sy] = volume(stretch)
    g.save()
    g.translate(b.x, b.y)
    g.rotate(b.tilt)
    g.scale(s * sx, s * sy)
    // String.
    const sw = Math.sin(time * 2.4 + b.seed) * 16 - b.tilt * 80
    g.strokeStyle = 'rgba(255,255,255,0.85)'
    g.lineWidth = 3 / s
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(0, 116)
    g.bezierCurveTo(sw, 150, -sw, 185, sw * 0.7, 222)
    g.stroke()

    const img = sprites[b.color]!
    const carrying = b.kind === 'toy' || b.kind === 'chute' || b.kind === 'stars'
    if (carrying) {
      g.globalAlpha = 0.5
      g.drawImage(img, -120, -110, SPRITE_W, SPRITE_H)
      g.globalAlpha = 1
      sprite(g, b.item, Math.sin(time * 2 + b.seed) * 5, 4 + Math.cos(time * 2.6 + b.seed) * 4, 112, Math.sin(time * 1.7 + b.seed) * 0.18)
      g.globalAlpha = 0.3
      g.drawImage(img, -120, -110, SPRITE_W, SPRITE_H)
      g.globalAlpha = 1
    } else if (b.kind === 'paint' || b.kind === 'water') {
      // Liquid sloshing inside.
      g.save()
      bodyPath(g)
      g.clip()
      const level = b.kind === 'water' ? -30 : -12
      const slosh = Math.sin(time * 3 + b.seed) * 9 + b.tilt * 120
      g.fillStyle = b.kind === 'water' ? 'rgba(70,165,255,0.75)' : b.paint
      g.beginPath()
      g.moveTo(-100, level - slosh)
      g.quadraticCurveTo(-30, level - slosh * 0.3 - 8, 0, level)
      g.quadraticCurveTo(40, level + 8 + slosh * 0.3, 100, level + slosh)
      g.lineTo(100, 110)
      g.lineTo(-100, 110)
      g.closePath()
      g.fill()
      g.restore()
      g.drawImage(img, -120, -110, SPRITE_W, SPRITE_H)
      if (b.kind === 'water') sprite(g, '💧', 0, 26, 70)
      else {
        circle(g, -30, 40, 9, 'rgba(255,255,255,0.5)')
        circle(g, 22, 58, 6, 'rgba(255,255,255,0.5)')
      }
    } else {
      g.drawImage(img, -120, -110, SPRITE_W, SPRITE_H)
      if (b.kind === 'gold') {
        star(g, 0, 46, 26, '#fff8c4', Math.sin(time * 2) * 0.3)
        for (let i = 0; i < 4; i++) {
          const a = time * 2.2 + (i / 4) * TAU
          star(g, Math.cos(a) * 118, Math.sin(a) * 70 - 5, 13 + Math.sin(time * 8 + i) * 4, '#fffbe0', a)
        }
      }
      // A face that watches the finger.
      const near = stage.time - lookAt < 2.5
      const dx = near ? lookX - b.x : Math.sin(time * 0.7 + b.seed) * 200
      const dy = near ? lookY - b.y : Math.cos(time * 0.5 + b.seed) * 120
      const d = Math.hypot(dx, dy) || 1
      const lx = (dx / d) * Math.min(1, d / 160)
      const ly = (dy / d) * Math.min(1, d / 160)
      let mood: Mood = 'happy'
      if (b.kind === 'giant') mood = b.hits === 0 ? 'happy' : b.hits === 1 ? 'wow' : 'dizzy'
      else if (near && stage.pointers.size > 0 && d < 190) mood = 'wow'
      face(g, lx * 8, -12 + ly * 6, b.kind === 'giant' ? 12 : 14, mood, lx, ly, blinkAt(time, b.seed))
    }
    g.restore()
  }

  const drawThing = (g: CanvasRenderingContext2D, t: Thing) => {
    const height = Math.max(0, t.groundY - t.y)
    let alpha = 1
    if (t.life >= 0 && t.state === 'rest') alpha = clamp(t.life / 0.6, 0, 1)
    if (t.state !== 'lift') shadow(g, t.x, t.groundY + 3, t.size * 0.42, clamp(1 - height / 500, 0.3, 1), 0.2 * alpha)
    if (t.chuteOpen > 0.02) {
      const o = ease.outBack(t.chuteOpen)
      const top = t.y - t.size - 96 * o
      const c = COLORS[t.chuteColor]!
      g.save()
      g.translate(t.x, t.y - t.size * 0.5)
      g.rotate(t.rot * 0.6)
      g.translate(-t.x, -(t.y - t.size * 0.5))
      g.strokeStyle = 'rgba(255,255,255,0.9)'
      g.lineWidth = 2.5
      g.beginPath()
      for (const k of [-1, -0.35, 0.35, 1]) {
        g.moveTo(t.x + k * 66 * o, top + 46 * o)
        g.lineTo(t.x + k * 12, t.y - t.size * 0.72)
      }
      g.stroke()
      g.beginPath()
      g.ellipse(t.x, top + 46 * o, 70 * o, 58 * o, 0, Math.PI, TAU)
      g.closePath()
      g.fillStyle = c[1]
      g.fill()
      g.beginPath()
      g.ellipse(t.x, top + 46 * o, 26 * o, 58 * o, 0, Math.PI, TAU)
      g.closePath()
      g.fillStyle = c[0]
      g.fill()
      for (const k of [-0.66, 0, 0.66]) ellipse(g, t.x + k * 70 * o, top + 46 * o, 23.5 * o, 9 * o, c[2])
      g.restore()
    }
    if (t.state === 'lift') {
      const img = sprites[t.chuteColor]!
      g.strokeStyle = 'rgba(255,255,255,0.85)'
      g.lineWidth = 2.5
      g.beginPath()
      g.moveTo(t.x, t.y - t.size * 0.8)
      g.lineTo(t.x, t.y - t.size - 40)
      g.stroke()
      g.drawImage(img, t.x - 54, t.y - t.size - 140, 108, 108)
    }
    const twinkle = t.life >= 0 ? 1 + Math.sin(stage.time * 9 + t.seed) * 0.12 : 1
    const [sx, sy] = volume(t.sq.value)
    g.globalAlpha = alpha
    if (t.limp) {
      g.strokeStyle = t.limp
      g.lineWidth = 13
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.beginPath()
      g.moveTo(t.x - 34, t.y - 8)
      g.quadraticCurveTo(t.x - 18, t.y - 26, t.x - 4, t.y - 9)
      g.quadraticCurveTo(t.x + 12, t.y + 4, t.x + 30, t.y - 12)
      g.stroke()
    } else {
      // Tumbling things spin about their middle; standing things squash from the feet.
      const spin = t.state === 'fall' || (!t.critter && height > 1)
      if (spin) sprite(g, t.emoji, t.x, t.y - t.size * 0.46, t.size * twinkle, t.rot, sx, sy)
      else squash(g, t.x, t.y, sx, sy, () => sprite(g, t.emoji, t.x, t.y - t.size * 0.46, t.size * twinkle), t.rot)
    }
    g.globalAlpha = 1
  }

  const drawBuddy = (g: CanvasRenderingContext2D, b: Buddy) => {
    const time = stage.time
    const y = b.y - b.oy
    shadow(g, b.x, b.y + 4, 70, clamp(1 - b.oy / 300, 0.4, 1))
    const walking = Math.abs(b.targetX - b.x) > 6 && b.wet <= 0
    const shaking = b.wet > 0 && b.shakeAt < 0
    const rot = shaking ? Math.sin(time * 55) * 0.16 : walking ? Math.sin(b.step * 2) * 0.09 : 0
    const breathe = 1 + Math.sin(time * 2.2 + b.seed) * 0.025
    const [sx, sy] = volume(b.sq.value * breathe)
    // Where to look: the finger, the water balloon overhead, or around.
    let lx = Math.sin(time * 0.6 + b.seed) * 0.6
    let ly = -0.2
    const water = balloons.find((o) => o.kind === 'water')
    if (water && Math.abs(water.x - b.x) < 260) {
      lx = clamp((water.x - b.x) / 120, -1, 1)
      ly = -1
    } else if (time - lookAt < 2.5) {
      lx = clamp((lookX - b.x) / 300, -1, 1)
      ly = clamp((lookY - (y - 70)) / 300, -1, 1)
    }
    squash(
      g,
      b.x,
      y,
      sx,
      sy,
      () => {
        const foot = walking ? Math.sin(b.step * 2) * 7 : 0
        ellipse(g, b.x - 26, y - 5 - Math.max(0, foot), 22, 12, 'rgba(0,0,0,0.25)')
        ellipse(g, b.x + 26, y - 5 - Math.max(0, -foot), 22, 12, 'rgba(0,0,0,0.25)')
        ellipse(g, b.x - 26, y - 7 - Math.max(0, foot), 21, 11, b.color)
        ellipse(g, b.x + 26, y - 7 - Math.max(0, -foot), 21, 11, b.color)
        circle(g, b.x - 44, y - 116, 19, b.color)
        circle(g, b.x + 44, y - 116, 19, b.color)
        circle(g, b.x - 44, y - 116, 9, 'rgba(255,255,255,0.45)')
        circle(g, b.x + 44, y - 116, 9, 'rgba(255,255,255,0.45)')
        // Arms go up while it hops.
        const up = b.oy > 4 || b.mood === 'yum' ? -34 : 0
        ellipse(g, b.x - 64, y - 58 + up, 14, 22, b.color, 0.5 + up / 60)
        ellipse(g, b.x + 64, y - 58 + up, 14, 22, b.color, -0.5 - up / 60)
        ellipse(g, b.x, y - 64, 66, 62, b.color)
        ellipse(g, b.x, y - 44, 42, 36, b.belly)
        ellipse(g, b.x - 26, y - 102, 20, 11, 'rgba(255,255,255,0.3)', -0.5)
        if (b.wet > 0) {
          ellipse(g, b.x, y - 64, 66, 62, 'rgba(70,160,255,0.3)')
          for (let i = 0; i < 5; i++) {
            const px = b.x - 50 + i * 25
            const py = y - 60 + ((time * 120 + i * 37) % 60)
            ellipse(g, px, py, 5, 8, 'rgba(150,215,255,0.9)')
          }
        }
        face(g, b.x + lx * 5, y - 76 + ly * 4, 13, b.mood, lx, ly, blinkAt(time, b.seed))
      },
      rot,
    )
  }

  const wormPoint = (w: Worm, i: number, n: number): [number, number] => [w.x + Math.sin(stage.time * 3.2 + i * 0.75) * 15 * (i / n + 0.25), w.y + (i / n) * w.len]

  const drawWorm = (g: CanvasRenderingContext2D, w: Worm) => {
    const c = COLORS[w.color]!
    const path = () => {
      g.beginPath()
      if (!w.zoom) {
        const n = 10
        for (let i = 0; i <= n; i++) {
          const [x, y] = wormPoint(w, i, n)
          if (i === 0) g.moveTo(x, y)
          else g.lineTo(x, y)
        }
      } else {
        g.moveTo(w.x, w.y)
        let left = w.len
        let px = w.x
        let py = w.y
        for (let i = 2; i < w.trail.length && left > 0; i += 2) {
          const x = w.trail[i]!
          const y = w.trail[i + 1]!
          left -= Math.hypot(x - px, y - py)
          g.lineTo(x, y)
          px = x
          py = y
        }
      }
    }
    const width = w.zoom ? lerp(50, 30, w.t / 2.7) + Math.sin(w.t * 40) * 4 : 52
    g.lineCap = 'round'
    g.lineJoin = 'round'
    path()
    g.strokeStyle = c[2]
    g.lineWidth = width + 6
    g.stroke()
    g.strokeStyle = c[1]
    g.lineWidth = width
    g.stroke()
    g.strokeStyle = c[0]
    g.lineWidth = width * 0.28
    g.globalAlpha = 0.7
    g.save()
    g.translate(-width * 0.2, -width * 0.12)
    g.stroke()
    g.restore()
    g.globalAlpha = 1
    const [hx, hy] = w.zoom ? [w.x, w.y] : wormPoint(w, 0, 10)
    const near = stage.time - lookAt < 2.5
    const lx = near ? clamp((lookX - hx) / 300, -1, 1) : 0
    const ly = near ? clamp((lookY - hy) / 300, -1, 1) : -0.3
    face(g, hx, hy + (w.zoom ? 0 : 8), 9, w.zoom ? 'dizzy' : 'happy', lx, ly, blinkAt(stage.time, w.len))
  }

  const drawSun = (g: CanvasRenderingContext2D, night: number) => {
    const time = stage.time
    const [sx, sy] = volume(sun.sq.value)
    g.save()
    g.translate(sun.x, sun.y)
    g.scale(sx, sy)
    const moon = night > 0.5
    g.save()
    g.rotate(sun.spin + time * 0.25)
    g.fillStyle = moon ? 'rgba(255,250,215,0.5)' : '#ffd23a'
    for (let i = 0; i < 12; i++) {
      g.rotate(TAU / 12)
      const len = (moon ? 70 : 88) + Math.sin(time * 3 + i * 1.7) * 7
      g.beginPath()
      g.moveTo(-13, 56)
      g.lineTo(0, len)
      g.lineTo(13, 56)
      g.closePath()
      g.fill()
    }
    g.restore()
    circle(g, 0, 0, 62, moon ? '#fff8d2' : '#ffe14d', moon ? '#e2d8a2' : '#ffc21f', 5)
    if (moon) {
      circle(g, 30, -30, 11, 'rgba(200,190,140,0.4)')
      circle(g, -38, -22, 7, 'rgba(200,190,140,0.4)')
      circle(g, 14, 40, 8, 'rgba(200,190,140,0.4)')
    }
    circle(g, -30, 18, 10, 'rgba(255,120,120,0.45)')
    circle(g, 30, 18, 10, 'rgba(255,120,120,0.45)')
    const lx = clamp((lookX - sun.x) / 500, -1, 1)
    const ly = clamp((lookY - sun.y) / 400, -1, 1)
    face(g, 0, -6, 11, sun.mood, lx, ly, blinkAt(time, 7))
    g.restore()
  }

  const drawCloud = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.ellipse(x, y, 90 * s, 34 * s, 0, 0, TAU)
    g.ellipse(x - 40 * s, y - 22 * s, 44 * s, 34 * s, 0, 0, TAU)
    g.ellipse(x + 26 * s, y - 32 * s, 54 * s, 42 * s, 0, 0, TAU)
    g.fill()
  }

  const drawDrop = (g: CanvasRenderingContext2D, d: Drop) => {
    const stretch = clamp(1 + Math.abs(d.vy) / 1400, 1, 1.7)
    const r = d.water ? 46 : 30
    const wob = Math.sin(stage.time * 22 + d.seed) * 0.08
    for (let i = 3; i >= 1; i--) circle(g, d.x + Math.sin(d.seed + i * 2) * 14, d.y - i * r * 0.85 * stretch, r * (0.42 - i * 0.08), d.color)
    ellipse(g, d.x, d.y, r * (1 - wob) / Math.sqrt(stretch), r * (1 + wob) * stretch, d.color)
    ellipse(g, d.x - r * 0.3, d.y - r * 0.3, r * 0.2, r * 0.32, 'rgba(255,255,255,0.6)', 0.4)
  }

  const order: { y: number; thing?: Thing; buddy?: Buddy }[] = []

  // ---- input ------------------------------------------------------------
  const touchGround = (p: Pointer): boolean => {
    for (const b of buddies) {
      if (dist(p.x, p.y, b.x, b.y - 64 - b.oy) < 92) {
        hopBuddy(b, 560)
        if (b.wet <= 0) setMood(b, 'yum', 1)
        sfx.boing(rndInt(4, 7))
        stage.after(0.1, () => sfx.note(rndInt(8, 10), 0.1, 'sine', 0.18))
        fx.burst(b.x, b.y - 130, { count: 5, color: '#ff7ac8', speed: 220, life: 0.8, size: 15, shape: 'heart', angle: -Math.PI / 2, spread: 1.4, gravity: -80 })
        return true
      }
    }
    let best: Thing | null = null
    let bestD = 70
    for (const t of things) {
      if (t.state !== 'rest') continue
      const d = dist(p.x, p.y, t.x, t.y - t.size * 0.45)
      if (d < bestD) {
        bestD = d
        best = t
      }
    }
    if (!best) return false
    best.vy = -rnd(480, 640)
    best.y = Math.min(best.y, best.groundY - 1)
    best.vr = best.critter ? 0 : rnd(-7, 7)
    best.sq.value = 1.3
    if (best.critter) best.wave = 1
    sfx.boing(rndInt(3, 8))
    fx.burst(best.x, best.y - 30, { count: 6, color: ['#ffffff', '#ffe14d'], speed: 260, life: 0.4, size: 10, shape: 'star' })
    return true
  }

  const down = (p: Pointer) => {
    lastTouchAt = stage.time
    lookX = p.x
    lookY = p.y
    lookAt = stage.time
    trailDist = 0
    // The balloon under the finger, with a generous margin.
    let best: Balloon | null = null
    let bestD = 34
    for (const b of balloons) {
      if (b.dead || b.grow < 0.5) continue
      const d = dist(p.x, p.y, b.x, b.y) - b.r
      if (d < bestD) {
        bestD = d
        best = b
      }
    }
    if (best) {
      hit(best)
      return
    }
    for (const w of worms) {
      if (!w.zoom && segDist(p.x, p.y, w.x, w.y, w.x, w.y + w.len) < 70) {
        startZoom(w)
        return
      }
    }
    if (dist(p.x, p.y, sun.x, sun.y) < 100) {
      sun.spinVel += 14
      sun.sq.value = 0.75
      setMood(sun, 'yum', 1.2)
      sfx.ding(rndInt(0, 4))
      fx.burst(sun.x, sun.y, { count: 14, color: ['#ffe14d', '#fff6b0'], speed: 420, life: 0.6, size: 14, shape: 'star' })
      return
    }
    if (touchGround(p)) return
    // Empty sky or grass: a puff of wind that shoves the balloons about.
    fx.ring(p.x, p.y, '#ffffff', 90, 0.35)
    fx.burst(p.x, p.y, { count: 9, color: ['#ffffff', '#fff6b0'], speed: 300, life: 0.45, size: 10, shape: 'star' })
    sfx.whoosh()
    sfx.note(rndInt(0, 4), 0.12, 'sine', 0.13)
    for (const b of balloons) {
      const d = dist(p.x, p.y, b.x, b.y)
      if (d > 330 || d < 1) continue
      const push = (1 - d / 330) * 420
      b.vx += ((b.x - p.x) / d) * push
      b.vy += ((b.y - p.y) / d) * push
      b.wob.kick(3)
    }
  }

  const move = (p: Pointer) => {
    if (!p.down) return
    lastTouchAt = stage.time
    lookX = p.x
    lookY = p.y
    lookAt = stage.time
    const ax = p.x - p.dx
    const ay = p.y - p.dy
    for (const b of balloons) {
      if (b.dead || b.grow < 0.5) continue
      if (segDist(b.x, b.y, ax, ay, p.x, p.y) < b.r + 16) hit(b)
    }
    for (const w of worms) if (!w.zoom && segDist(p.x, p.y, w.x, w.y, w.x, w.y + w.len) < 50) startZoom(w)
    trailDist += Math.hypot(p.dx, p.dy)
    if (trailDist > 34) {
      trailDist = 0
      fx.burst(p.x, p.y, { count: 1, color: ['#ffffff', '#fff6b0', '#ffd0f0'], speed: 70, life: 0.45, size: 12, shape: 'star' })
    }
  }

  return {
    update(dt) {
      const time = stage.time
      // Keep the sky generous.
      spawnIn -= dt
      const regular = balloons.reduce((n, b) => n + (b.kind === 'giant' || b.kind === 'gold' || b.kind === 'water' ? 0 : 1), 0)
      const want = 12 + Math.min(5, Math.floor(time / 25))
      const inView = balloons.reduce((n, b) => n + (b.y < HORIZON + 40 ? 1 : 0), 0)
      if (spawnIn <= 0 && regular < want + 6) {
        // A thin sky refills fast: the new ones shoot up into the gap.
        const thin = inView < 9
        spawnBalloon(randomKind(), { rush: thin })
        spawnIn = thin ? rnd(0.12, 0.22) : regular < want ? rnd(0.3, 0.55) : rnd(1, 1.6)
      }
      if (time >= nextSpecialAt) {
        spawnSpecial()
        const gap = specialIndex <= 4 ? 7 : Math.max(4, 7 - time / 60)
        nextSpecialAt = time + gap + rnd(0, 1.5)
      }

      updateBalloons(dt)
      updateThings(dt)
      updateDrops(dt)
      updateBuddies(dt)
      updateWorms(dt)
      prune(balloons)
      prune(things)
      prune(drops)
      prune(worms)

      for (const c of clouds) {
        c.x += 9 * c.s * dt
        if (c.x > W + 160) c.x = -160
      }
      sun.sq.update(dt)
      sun.spin += sun.spinVel * dt
      sun.spinVel = damp(sun.spinVel, 0, 2.2, dt)
      if (time > sun.moodUntil) sun.mood = 'happy'
      bandsShown = damp(bandsShown, bands, 5, dt)
      shimmer = Math.max(0, shimmer - dt * 0.35)
      phaseBlend = Math.min(1, phaseBlend + dt / 2.2)
    },

    draw(g) {
      const time = stage.time
      const fading = phaseBlend < 1
      const night = phase === 2 ? phaseBlend : prevPhase === 2 ? 1 - phaseBlend : 0
      g.drawImage(skies[fading ? prevPhase : phase]!, 0, 0)
      if (fading) {
        g.globalAlpha = phaseBlend
        g.drawImage(skies[phase]!, 0, 0)
      }
      g.globalAlpha = 0.95 - night * 0.45
      for (const c of clouds) drawCloud(g, c.x, c.y + Math.sin(time * 0.5 + c.s * 9) * 5, c.s)
      g.globalAlpha = 1
      drawSun(g, night)
      // The rainbow grows a band at a time as balloons pop.
      if (bandsShown > 0.02) {
        g.lineCap = 'butt'
        for (let i = 0; i < RAINBOW.length; i++) {
          const a = clamp(bandsShown - i, 0, 1)
          if (a <= 0) break
          g.globalAlpha = (0.85 + shimmer * 0.15 * Math.sin(time * 12 + i)) * Math.min(1, a * 1.5)
          g.strokeStyle = RAINBOW[i]!
          g.lineWidth = 24 + shimmer * 6
          g.beginPath()
          g.arc(W / 2, HORIZON + 60, 470 - i * 24, Math.PI, Math.PI + Math.PI * ease.outCubic(a))
          g.stroke()
        }
        g.globalAlpha = 1
      }
      g.drawImage(grounds[fading ? prevPhase : phase]!, 0, 0)
      if (fading) {
        g.globalAlpha = phaseBlend
        g.drawImage(grounds[phase]!, 0, 0)
        g.globalAlpha = 1
      }
      g.drawImage(paintLayer, 0, 0)

      // Resting things and buddies, back to front.
      order.length = 0
      for (const t of things) if (t.state === 'rest') order.push({ y: t.groundY, thing: t })
      for (const b of buddies) order.push({ y: b.y, buddy: b })
      order.sort((a, b) => a.y - b.y)
      for (const o of order) {
        if (o.thing) drawThing(g, o.thing)
        else if (o.buddy) drawBuddy(g, o.buddy)
      }

      for (const b of balloons) if (b.kind === 'giant') drawBalloon(g, b)
      for (const b of balloons) if (b.kind !== 'giant') drawBalloon(g, b)
      for (const w of worms) drawWorm(g, w)
      for (const t of things) if (t.state !== 'rest') drawThing(g, t)
      for (const d of drops) drawDrop(g, d)

      if (time - lastTouchAt > 5) {
        let target: Balloon | null = null
        for (const b of balloons) {
          if (b.y < 180 || b.y > 560 || b.x < 150 || b.x > W - 150) continue
          if (!target || b.r > target.r) target = b
        }
        if (target) hint(g, target.x, target.y, time, 70)
      }
    },

    down,
    move,
  }
}

export const proto: Proto = {
  meta: {
    key: 'balloon-pop-parade',
    name: 'Balloon Pop Parade',
    emoji: '🎈',
    ages: [2, 5],
    pitch: 'Pop the balloons drifting up over the meadow and see what falls out of each one.',
    howTo: 'Tap or swipe across balloons. Big ones take three taps. Look for the gold one.',
    basedOn: 'balloon-pop and pop-it apps, Bluey keepy-uppy',
    whyFun: 'Every touch pops something with a climbing pitch; toys, parachuting critters and paint land and stay; specials and a rainbow parade keep arriving.',
  },
  create,
}
