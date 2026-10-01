// Mutant Garden: plant, watch it grow in seconds, swipe the harvest into the
// basket, buy a stranger seed. Weather rolls through and mutates the crops
// (golden, giant, frosty), a crow tries its luck and a bee doubles a plant.

import { blinkAt, circle, ellipse, eyes, face, hint, label, rrect, shadow, squash, star, volume } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import type { TextOptions } from '../../kit/fx.ts'
import { TAU, clamp, damp, dist, ease, lerp, pick, rnd, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { cloud, coin, createSprites, crowBird, paintBackdrop } from './art.ts'
import type { Tint } from './art.ts'

interface Crop {
  id: string
  emoji: string
  // 0..5 on the ladder, -1 for a rare seed.
  tier: number
  price: number
  value: number
  // Seconds from seed to ripe.
  grow: number
  // Turn the emoji so it stands up in the soil.
  rot: number
  // Where googly eyes go, in units of the sprite's size (null: it has a face).
  eye: { x: number; y: number; s: number } | null
  colors: readonly string[]
  fire?: boolean
  // The colour it grows in when nothing has mutated it.
  base?: Tint
}

const CROPS: readonly Crop[] = [
  { id: 'carrot', emoji: '🥕', tier: 0, price: 0, value: 2, grow: 3.0, rot: -0.78, eye: { x: 0, y: 0.06, s: 0.085 }, colors: ['#ff8a2b', '#ffb15e', '#5ed36a'] },
  { id: 'tomato', emoji: '🍅', tier: 1, price: 12, value: 6, grow: 3.3, rot: 0, eye: { x: 0, y: 0.06, s: 0.1 }, colors: ['#ff4d4d', '#ff8a7a', '#5ed36a'] },
  { id: 'pumpkin', emoji: '🎃', tier: 2, price: 70, value: 18, grow: 3.6, rot: 0, eye: null, colors: ['#ff9a1f', '#ffc46b', '#5ed36a'] },
  { id: 'lolly', emoji: '🍭', tier: 3, price: 350, value: 55, grow: 4.0, rot: 0.78, eye: { x: 0, y: -0.15, s: 0.08 }, colors: ['#ff7ac8', '#ffe14d', '#4db8ff'] },
  { id: 'dragon', emoji: '🐲', tier: 4, price: 2000, value: 160, grow: 4.4, rot: 0, eye: null, colors: ['#5ed36a', '#ff5d2e', '#ffe14d'], fire: true },
  { id: 'moon', emoji: '🌕', tier: 5, price: 12000, value: 500, grow: 4.8, rot: 0, eye: { x: 0, y: -0.02, s: 0.1 }, colors: ['#9be8a0', '#e0ffd8', '#b07cff'], base: 'melon' },
]

const RARES: readonly { id: string; emoji: string; eye: Crop['eye']; colors: readonly string[] }[] = [
  { id: 'star', emoji: '🌟', eye: { x: 0, y: 0.03, s: 0.08 }, colors: ['#ffe14d', '#fff6c0', '#ffb02e'] },
  { id: 'gem', emoji: '💎', eye: { x: 0, y: -0.02, s: 0.08 }, colors: ['#4db8ff', '#c9f1ff', '#b07cff'] },
  { id: 'unicorn', emoji: '🦄', eye: null, colors: ['#ff7ac8', '#b07cff', '#ffffff'] },
  { id: 'shroom', emoji: '🍄', eye: { x: 0, y: 0.2, s: 0.07 }, colors: ['#ff5d5d', '#ffffff', '#ffd9d9'] },
]

const COLS = 4
const PLOT_X = 132
const PLOT_DX = 195.5
const PLOT_Y = 296
const PLOT_DY = 118
// Plots that start locked, in the order they open, and what each costs.
const LOCK_ORDER = [8, 9, 10, 11]
const PLOT_PRICES = [40, 200, 1000, 5000]

const BX = 1006
const BY = 556
const SHOP_Y = 642
const CARD_W = 140
const CARD_H = 122
const CARD_GAP = 12
const SLOTS = 7
const RARE_SLOT = 6
const cardX = (i: number): number => 64 + i * (CARD_W + CARD_GAP)

const CROP_SIZE = 104
const STAGE_SCALE = [1, 0.46, 0.72, 1]
const WEATHER_SECONDS = 7
const SUNNY_SECONDS = 9
const RESTOCK_SECONDS = 30

type Weather = 'sun' | 'rain' | 'rainbow' | 'storm' | 'frost'
const WEATHER_ORDER: readonly Weather[] = ['rain', 'rainbow', 'storm', 'frost']

interface Mutations {
  gold: boolean
  giant: boolean
  frost: boolean
  bee: boolean
}

interface Plot extends Mutations {
  i: number
  col: number
  row: number
  x: number
  y: number
  open: boolean
  crop: Crop | null
  // 0..1 seed to ripe, and the stage it shows: sprout, small, big, ripe.
  g: number
  stage: number
  scale: Spring
  sq: Spring
  lean: Spring
  soil: Spring
  big: Spring
  sign: Spring
  seed: number
}

interface Flyer extends Mutations {
  crop: Crop
  x0: number
  y0: number
  x: number
  y: number
  t: number
  dur: number
  size: number
  rot: number
  spin: number
  value: number
  step: number
  mult: number
}

interface Decor {
  x: number
  y: number
  emoji: string
  s: number
  tilt: number
}

interface Beam {
  pts: [number, number][]
  life: number
  max: number
  bolt: boolean
}

const mult = (m: Mutations): number => (m.gold ? 10 : 1) * (m.giant ? 5 : 1) * (m.frost ? 3 : 1) * (m.bee ? 2 : 1)
const tintOf = (m: Mutations, crop: Crop): Tint => (m.gold ? 'gold' : m.frost ? 'frost' : (crop.base ?? 'plain'))
const mutName = (m: Mutations): string => [m.gold ? 'GOLDEN' : '', m.giant ? 'GIANT' : '', m.frost ? 'FROSTY' : ''].filter((s) => s !== '').join(' ')

function fmt(n: number): string {
  const v = Math.round(n)
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`
  if (v >= 1e5) return `${Math.round(v / 1000)}k`
  if (v >= 1e4) return `${(v / 1000).toFixed(1)}k`
  return v >= 1000 ? `${Math.floor(v / 1000)},${String(v % 1000).padStart(3, '0')}` : String(v)
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const sprites = createSprites()
  const backdrop = paintBackdrop(stage.rand)

  // ---- state ---------------------------------------------------------------

  const plots: Plot[] = []
  for (let i = 0; i < 12; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    plots.push({
      i,
      col,
      row,
      x: PLOT_X + col * PLOT_DX,
      y: PLOT_Y + row * PLOT_DY,
      open: !LOCK_ORDER.includes(i),
      crop: null,
      g: 0,
      stage: 0,
      scale: spring(0, 170, 9),
      sq: spring(1, 260, 9),
      lean: spring(0, 150, 6),
      soil: spring(1, 300, 12),
      big: spring(1, 130, 11),
      sign: spring(0, 200, 8),
      gold: false,
      giant: false,
      frost: false,
      bee: false,
      seed: stage.rand() * 10,
    })
  }

  let coins = 0
  let shown = 0
  let milestone = 100
  const counterPop = spring(1, 260, 10)
  const owned = [true, false, false, false, false, false]
  let selected = 0
  let plotsBought = 0
  const found = new Set<string>()
  let foundCount = 0

  let rare: { crop: Crop; price: number; left: number; bought: boolean } | null = null
  let rareIndex = Math.floor(stage.rand() * RARES.length)
  let nextRestock = RESTOCK_SECONDS
  let restocks = 0

  const cardPop: Spring[] = []
  const cardShake: Spring[] = []
  const cardLift: number[] = []
  for (let i = 0; i < SLOTS; i++) {
    cardPop.push(spring(0, 240, 9))
    cardShake.push(spring(0, 260, 7))
    cardLift.push(0)
  }
  let couldBuySeed = false
  let couldBuyPlot = false
  let couldBuyRare = false

  const flyers: Flyer[] = []
  const recent: { emoji: string; tint: Tint; rot: number }[] = []
  const basket = spring(1, 240, 9)
  let basketMoodUntil = 0
  let streak = 0
  let landed = 0
  let lastRareAt = -10
  let lastHarvestAt = -10
  let plantStreak = 0
  let lastPlantAt = -10

  let weather: Weather = 'sun'
  let seen: Weather = 'rain'
  let weatherT = 0
  let weatherMix = 0
  let nextWeatherAt = 11
  let weatherCount = 0
  let strikes: number[] = []
  let dripAt = 0
  const beams: Beam[] = []

  const sunSpin = spring(0, 60, 5)
  let sunWowUntil = 0
  const clouds = [
    { x: 330, y: 52, r: 58, v: 9 },
    { x: 720, y: 84, r: 44, v: 13 },
    { x: 1080, y: 40, r: 50, v: 7 },
  ]
  const decor: Decor[] = []

  const crow = {
    state: 'off' as 'off' | 'in' | 'peck' | 'steal' | 'flee',
    x: 0,
    y: 0,
    fromX: 0,
    fromY: 0,
    toX: 0,
    toY: 0,
    t: 0,
    dir: 1,
    pecks: 0,
    spin: 0,
    vx: 0,
    vy: 0,
    target: null as Plot | null,
    loot: null as (Mutations & { crop: Crop }) | null,
  }
  let nextCrowAt = 23

  const bee = { state: 'off' as 'off' | 'in' | 'work' | 'out', x: 0, y: 0, t: 0, fast: false, target: null as Plot | null }
  let nextBeeAt = 38

  const strokes = new Map<number, { plot: number; trail: number }>()
  const look = { x: W / 2, y: H / 2, at: -10 }
  let lastTouchAt = 0

  // ---- helpers -------------------------------------------------------------

  // Floating words, kept wholly on the field however long they are.
  const say = (x: number, y: number, text: string, options: TextOptions = {}): void => {
    const half = Math.min(W / 2, text.length * (options.size ?? 44) * 0.31 + 14)
    fx.text(clamp(x, half, W - half), y, text, options)
  }

  const nextTier = (): number => owned.indexOf(false)
  const bestOwned = (): Crop => CROPS[owned.lastIndexOf(true)]!
  const nextPlot = (): Plot | null => (plotsBought < LOCK_ORDER.length ? plots[LOCK_ORDER[plotsBought]!]! : null)
  const cropSize = (p: Plot): number => CROP_SIZE * Math.max(0.05, p.scale.value) * p.big.value
  const cropTop = (p: Plot): number => p.y + 8 - cropSize(p) * 0.85

  const setStage = (p: Plot, s: number): void => {
    const from = p.stage
    p.stage = s
    p.scale.target = STAGE_SCALE[s]!
    if (from === 0 && s > 0) p.scale.value = 0.2
    p.scale.kick(3)
    p.sq.kick(2.4)
    if (s === 3) {
      p.lean.kick(rnd(-4, 4))
      fx.burst(p.x, p.y - 60, { count: 7, color: ['#fff7b0', '#ffffff'], shape: 'star', speed: 240, life: 0.5, size: 12, gravity: 100 })
      sfx.note(p.col + p.row * 2, 0.16, 'sine', 0.1)
    } else {
      sfx.tone({ freq: 420 + s * 140, to: 620 + s * 160, dur: 0.06, vol: 0.05 })
    }
  }

  const clearPlot = (p: Plot): void => {
    p.crop = null
    p.g = 0
    p.stage = 0
    p.scale.value = 0
    p.scale.target = 0
    p.scale.vel = 0
    p.gold = false
    p.giant = false
    p.frost = false
    p.bee = false
    p.big.target = 1
    p.big.value = 1
    p.big.vel = 0
  }

  const dirt = (x: number, y: number, count: number, speed = 320): void => {
    fx.burst(x, y, { count, color: ['#6b3f20', '#8a5730', '#4f2c14'], speed, angle: -Math.PI / 2, spread: 2.2, life: 0.55, size: 11, gravity: 1100 })
  }

  const plant = (p: Plot): void => {
    let crop = CROPS[selected] ?? CROPS[0]!
    if (selected === RARE_SLOT) {
      if (rare && rare.bought && rare.left > 0) {
        crop = rare.crop
        rare.left--
        if (rare.left === 0) {
          const spent = rare
          selected = bestOwned().tier
          stage.after(0.5, () => {
            if (rare === spent) rare = null
          })
        }
      } else {
        selected = bestOwned().tier
        crop = CROPS[selected]!
      }
    }
    const t = stage.time
    plantStreak = t - lastPlantAt < 0.9 ? plantStreak + 1 : 0
    lastPlantAt = t
    p.crop = crop
    p.g = 0
    p.stage = 0
    p.scale.value = 0
    p.scale.target = 1
    p.scale.vel = 6
    p.soil.value = 0.62
    p.lean.kick(rnd(-3, 3))
    dirt(p.x, p.y, 9)
    // Dig, then pat.
    sfx.thud(0.5)
    sfx.noise({ dur: 0.07, freq: 700, to: 300, vol: 0.16, filter: 'lowpass' })
    sfx.note(Math.min(plantStreak, 11) - 3, 0.12, 'triangle', 0.16)
    stage.after(0.12, () => {
      p.soil.value = 0.8
      sfx.thud(0.3)
    })
  }

  const water = (p: Plot): void => {
    p.g = Math.min(1, p.g + 0.14)
    p.sq.value = 0.82
    p.lean.kick(rnd(-3, 3))
    fx.burst(p.x, p.y - 40, { count: 7, color: ['#7fd4ff', '#c9f1ff', '#4db8ff'], speed: 260, angle: -Math.PI / 2, spread: 2.4, life: 0.45, size: 10, gravity: 900 })
    fx.ring(p.x, p.y - 20, '#c9f1ff', 46, 0.3)
    const f = 760 + p.g * 700
    sfx.tone({ freq: f, to: f * 1.5, dur: 0.07, vol: 0.2 })
    sfx.noise({ dur: 0.05, freq: 2400, vol: 0.06, filter: 'highpass' })
  }

  const fly = (crop: Crop, m: Mutations, x: number, y: number, size: number, value: number, step: number): void => {
    flyers.push({
      crop,
      gold: m.gold,
      giant: m.giant,
      frost: m.frost,
      bee: m.bee,
      x0: x,
      y0: y,
      x,
      y,
      t: 0,
      dur: 0.4 + dist(x, y, BX, BY - 130) / 2600,
      size,
      rot: crop.rot,
      spin: rnd(5, 9) * (Math.random() < 0.5 ? -1 : 1),
      value,
      step,
      mult: mult(m),
    })
  }

  const harvest = (p: Plot, px: number, py: number): void => {
    const crop = p.crop
    if (!crop) return
    const t = stage.time
    streak = t - lastHarvestAt < 1.1 ? streak + 1 : 0
    lastHarvestAt = t
    const combo = streak >= 9 ? 3 : streak >= 4 ? 2 : 1
    if (streak === 4) {
      say(clamp(px, 170, W - 170), Math.max(70, py - 90), 'COMBO x2!', { color: '#7dffb0', size: 46 })
      sfx.slideUp()
    } else if (streak === 9) {
      say(clamp(px, 170, W - 170), Math.max(70, py - 90), 'MEGA x3!', { color: '#ff9df0', size: 58 })
      fx.shake(7)
      sfx.win()
    }
    const size = cropSize(p)
    const cy = p.y + 8 - size * 0.4
    fly(crop, p, p.x, cy, size, crop.value * mult(p) * combo, streak)
    sfx.pop(Math.min(streak, 9))
    dirt(p.x, p.y, 6, 260)
    fx.burst(p.x, cy, { count: p.giant ? 16 : 8, color: crop.colors, speed: 340, life: 0.5, size: 11 })
    if (p.gold) fx.burst(p.x, cy, { count: 12, color: ['#ffe14d', '#fff6c0'], shape: 'star', speed: 420, life: 0.7, size: 15, gravity: 200 })
    if (crop.fire) {
      fx.burst(p.x, cy - 20, { count: 20, color: ['#ff5d2e', '#ffb02e', '#ffe14d'], speed: 620, angle: -Math.PI / 2, spread: 1.0, life: 0.55, size: 18, gravity: -200 })
      sfx.noise({ dur: 0.3, freq: 300, to: 1800, vol: 0.2 })
    }
    if (p.giant) fx.shake(6)
    p.soil.value = 0.7
    clearPlot(p)
  }

  const collect = (f: Flyer): void => {
    if (f.crop.tier < 0) return
    const keys = [f.crop.id]
    if (f.gold) keys.push(`${f.crop.id}:gold`)
    if (f.giant) keys.push(`${f.crop.id}:giant`)
    if (f.frost) keys.push(`${f.crop.id}:frost`)
    let fresh = false
    for (const key of keys) {
      if (found.has(key)) continue
      found.add(key)
      foundCount++
      if (key.includes(':')) fresh = true
    }
    if (fresh) {
      const cx = cardX(f.crop.tier) + CARD_W / 2
      cardPop[f.crop.tier]!.kick(-260)
      say(cx, SHOP_Y - 20, 'NEW!', { color: '#7dffb0', size: 34 })
      fx.burst(cx, SHOP_Y + 20, { count: 10, color: ['#7dffb0', '#ffffff'], shape: 'star', speed: 260, life: 0.6, size: 12 })
      sfx.ding(6)
    }
    if (foundCount === 24 && fresh) {
      fx.confetti(W / 2, 300, 120)
      say(W / 2, 300, 'GARDEN COMPLETE!', { color: '#ffe14d', size: 72, life: 2.4 })
      sfx.fanfare()
    }
  }

  const land = (f: Flyer): void => {
    coins += f.value
    basket.value = f.giant ? 0.55 : 0.74
    basketMoodUntil = stage.time + 0.45
    counterPop.value = 1.22
    sfx.coin(Math.min(f.step, 6))
    const big = f.mult >= 10
    landed++
    say(BX - 24 + ((landed % 3) - 1) * 76 + rnd(-12, 12), BY - 176 - (landed % 4) * 30, `+${fmt(f.value)}`, {
      color: big ? '#ffe14d' : '#fff8d0',
      size: clamp(30 + Math.log10(f.value + 1) * 10, 32, 66),
      life: big ? 1.4 : 0.9,
    })
    fx.burst(BX, BY - 140, { count: clamp(3 + Math.round(Math.log2(f.value + 1)), 4, 18), color: ['#ffc928', '#ffe88a', '#ffb02e'], speed: 560, angle: -Math.PI / 2, spread: 1.3, life: 0.8, size: 14, gravity: 1300 })
    if (f.giant) {
      fx.shake(10)
      sfx.thud(1.4)
      fx.hitstop(50)
    }
    if (big) {
      fx.confetti(BX, BY - 160, 36)
      sfx.win()
    }
    if (f.crop.tier < 0 && stage.time - lastRareAt > 1.2) {
      lastRareAt = stage.time
      say(BX, BY - 310, 'RARE!', { color: '#e4b8ff', size: 44 })
    }
    recent.unshift({ emoji: f.crop.emoji, tint: tintOf(f, f.crop), rot: rnd(-0.4, 0.4) })
    if (recent.length > 3) recent.length = 3
    collect(f)
    if (coins >= milestone) {
      fx.confetti(W / 2, 330, 90)
      say(430, 300, `${fmt(milestone)} COINS!`, { color: '#ffe14d', size: 76, life: 1.8, rise: 60 })
      sfx.fanfare()
      while (coins >= milestone) milestone *= 10
    }
  }

  const announce = (p: Plot, extra = ''): void => {
    const m = mult(p)
    const name = extra !== '' ? extra : mutName(p)
    const stacked = [p.gold, p.giant, p.frost, p.bee].filter(Boolean).length
    say(clamp(p.x, 230, W - 330), Math.max(90, cropTop(p) - 26), `${name}! x${m}`, {
      color: p.gold ? '#ffe14d' : p.frost ? '#c9f1ff' : '#ffb27a',
      size: 36 + stacked * 8,
      life: 1.5,
      rise: 60,
    })
    if (stacked >= 2) {
      fx.shake(6 + stacked * 2)
      sfx.win()
    }
  }

  const mutate = (p: Plot, kind: 'gold' | 'giant' | 'frost'): void => {
    const top = p.y - 60
    p.sq.kick(4)
    p.lean.kick(rnd(-5, 5))
    if (kind === 'gold') {
      p.gold = true
      beams.push({ pts: [[470, 36], [p.x, top]], life: 0.55, max: 0.55, bolt: false })
      fx.burst(p.x, top, { count: 16, color: ['#ffe14d', '#fff6c0', '#ffb02e'], shape: 'star', speed: 380, life: 0.8, size: 16, gravity: 150 })
      fx.ring(p.x, top, '#ffe14d', 110, 0.45)
      for (let i = 0; i < 4; i++) sfx.tone({ freq: sfx.scale(5 + i * 2), dur: 0.22, type: 'triangle', vol: 0.18, delay: i * 0.06 })
    } else if (kind === 'giant') {
      p.giant = true
      p.big.target = 1.7
      p.big.kick(5)
      const pts: [number, number][] = []
      const sx = p.x + rnd(-90, 90)
      for (let i = 0; i <= 6; i++) pts.push([lerp(sx, p.x, i / 6) + (i > 0 && i < 6 ? rnd(-34, 34) : 0), lerp(-10, top, i / 6)])
      beams.push({ pts, life: 0.32, max: 0.32, bolt: true })
      fx.flash('#ffffff', 0.6, 0.2)
      fx.shake(14, 0.4)
      fx.hitstop(60)
      fx.burst(p.x, top, { count: 18, color: ['#fff7a8', '#ffffff', '#ffd21a'], shape: 'spark', speed: 620, life: 0.5, size: 12, gravity: 300 })
      sfx.zap()
      sfx.thud(1.6)
      sfx.noise({ dur: 0.9, freq: 320, to: 60, vol: 0.32, filter: 'lowpass', delay: 0.05 })
      sfx.boing(-4)
    } else {
      p.frost = true
      fx.burst(p.x, top, { count: 14, color: ['#ffffff', '#c9f1ff', '#8fd8ff'], shape: 'star', speed: 300, life: 0.8, size: 14, gravity: 120 })
      fx.ring(p.x, top, '#c9f1ff', 100, 0.45)
      sfx.tone({ freq: 1700, to: 2700, dur: 0.24, vol: 0.12 })
      sfx.ding(8)
    }
    announce(p)
  }

  const startWeather = (w: Weather): void => {
    weather = w
    seen = w
    weatherT = 0
    weatherCount++
    const at = (text: string, color: string): void => say(430, 170, text, { color, size: 70, life: 1.7, rise: 40 })
    if (w === 'rain') {
      strikes = []
      at('🌧️ RAIN!', '#c9f1ff')
      sfx.noise({ dur: 1.4, freq: 900, to: 2600, vol: 0.14, filter: 'bandpass', q: 0.6 })
      sfx.slideDown()
    } else if (w === 'rainbow') {
      strikes = [1.2, 2.7, 4.2, 5.6]
      at('🌈 RAINBOW!', '#ffe14d')
      sunWowUntil = stage.time + WEATHER_SECONDS
      for (let i = 0; i < 7; i++) sfx.tone({ freq: sfx.scale(i), dur: 0.2, type: 'triangle', vol: 0.16, delay: i * 0.07 })
    } else if (w === 'storm') {
      strikes = [1.3, 4.0]
      at('⚡ STORM!', '#fff7a8')
      sfx.noise({ dur: 1.2, freq: 200, to: 70, vol: 0.3, filter: 'lowpass' })
      fx.shake(5, 0.5)
    } else {
      strikes = [1.0, 2.2, 3.4, 4.6]
      at('❄️ FROST!', '#e8f8ff')
      for (let i = 0; i < 5; i++) sfx.tone({ freq: sfx.scale(14 - i * 2), dur: 0.3, vol: 0.1, delay: i * 0.08 })
    }
  }

  const strike = (): void => {
    const kind = weather === 'rainbow' ? 'gold' : weather === 'storm' ? 'giant' : 'frost'
    const free = plots.filter((p) => p.crop !== null && !p[kind])
    if (free.length === 0) {
      // Nothing planted yet: try again in a moment rather than waste the weather.
      if (weatherT < WEATHER_SECONDS - 1) strikes.unshift(weatherT + 0.5)
      return
    }
    mutate(pick(free), kind)
  }

  const buySeed = (i: number): void => {
    const crop = CROPS[i]!
    coins -= crop.price
    owned[i] = true
    selected = i
    couldBuySeed = false
    const cx = cardX(i) + CARD_W / 2
    cardPop[i]!.kick(-520)
    fx.confetti(cx, SHOP_Y + 20, 60)
    say(clamp(cx, 170, W - 170), SHOP_Y - 50, 'NEW SEED!', { color: '#ffe14d', size: 56, life: 1.5 })
    fx.ring(cx, SHOP_Y + 60, '#ffe14d', 150, 0.5)
    fx.shake(6)
    sfx.fanfare()
    counterPop.value = 0.8
    if (i === CROPS.length - 1) {
      stage.after(0.8, () => {
        fx.confetti(W / 2, 300, 120)
        say(W / 2, 320, 'MOON MELON!!', { color: '#fff6d0', size: 80, life: 2 })
      })
    }
  }

  const tapCard = (i: number): void => {
    const cx = cardX(i) + CARD_W / 2
    const no = (): void => {
      cardShake[i]!.kick(rnd(0, 1) < 0.5 ? 5 : -5)
      sfx.nope()
    }
    if (i === RARE_SLOT) {
      if (!rare) {
        cardPop[i]!.kick(-160)
        cardShake[i]!.kick(3)
        sfx.tick()
        sfx.boing(2)
        say(cx, SHOP_Y - 10, '?', { color: '#e4b8ff', size: 40 })
      } else if (!rare.bought) {
        if (coins < rare.price) return no()
        coins -= rare.price
        rare.bought = true
        selected = RARE_SLOT
        couldBuyRare = false
        cardPop[i]!.kick(-520)
        fx.confetti(cx, SHOP_Y + 20, 60)
        say(cx - 60, SHOP_Y - 50, `RARE SEEDS x${rare.left}!`, { color: '#e4b8ff', size: 50, life: 1.5 })
        sfx.fanfare()
      } else {
        selected = RARE_SLOT
        cardPop[i]!.kick(-220)
        sfx.pop(7)
      }
      return
    }
    if (owned[i]) {
      selected = i
      cardPop[i]!.kick(-220)
      sfx.pop(i + 2)
      fx.ring(cx, SHOP_Y + 60, '#ffffff', 70, 0.25)
    } else if (i === nextTier() && coins >= CROPS[i]!.price) {
      buySeed(i)
    } else {
      no()
    }
  }

  const touchPlot = (p: Plot, px: number, py: number, isDown: boolean): void => {
    if (!p.open) {
      if (!isDown) return
      if (p === nextPlot()) {
        const price = PLOT_PRICES[plotsBought]!
        if (coins >= price) {
          coins -= price
          plotsBought++
          p.open = true
          couldBuyPlot = false
          p.soil.value = 0.5
          dirt(p.x, p.y, 22, 520)
          fx.burst(p.x, p.y, { count: 14, color: ['#6cc653', '#9be57a'], speed: 420, life: 0.7, size: 12 })
          fx.ring(p.x, p.y, '#ffe14d', 130, 0.45)
          say(p.x, p.y - 70, 'NEW PLOT!', { color: '#ffe14d', size: 44 })
          fx.shake(6)
          sfx.thud(1.2)
          sfx.win()
        } else {
          p.sign.kick(7)
          sfx.nope()
        }
      } else {
        fx.burst(px, py, { count: 6, color: ['#6cc653', '#9be57a'], speed: 220, life: 0.4, size: 9 })
        sfx.pop(-2)
      }
      return
    }
    if (!p.crop) plant(p)
    else if (p.stage < 3) water(p)
    else harvest(p, px, py)
  }

  // A ripe giant reaches over its neighbours, so check the crops themselves
  // first (front rows on top), then fall back to the generous grid cell.
  const plotAt = (x: number, y: number): Plot | null => {
    for (let i = plots.length - 1; i >= 0; i--) {
      const p = plots[i]!
      if (!p.crop || !p.giant || p.stage < 3) continue
      const size = cropSize(p)
      if (dist(x, y, p.x, p.y + 8 - size * 0.4) < size * 0.5) return p
    }
    if (x < 26 || x > 830 || y < 196 || y > 590) return null
    const col = clamp(Math.round((x - PLOT_X) / PLOT_DX), 0, COLS - 1)
    const row = clamp(Math.round((y - (PLOT_Y - 26)) / PLOT_DY), 0, 2)
    return plots[row * COLS + col]!
  }

  const caw = (): void => {
    sfx.tone({ freq: 760, to: 420, dur: 0.14, type: 'sawtooth', vol: 0.1 })
    sfx.tone({ freq: 700, to: 380, dur: 0.16, type: 'sawtooth', vol: 0.1, delay: 0.17 })
  }

  const shoo = (): void => {
    const loot = crow.loot
    if (loot) {
      fly(loot.crop, loot, crow.x, crow.y, 80, loot.crop.value * mult(loot), 3)
      say(clamp(crow.x, 170, W - 170), crow.y - 110, 'GOT IT BACK!', { color: '#7dffb0', size: 40 })
      crow.loot = null
    } else {
      const tip = bestOwned().value * 2
      coins += tip
      counterPop.value = 1.2
      say(clamp(crow.x, 150, W - 150), crow.y - 110, `SHOO! +${fmt(tip)}`, { color: '#ffe14d', size: 42 })
    }
    crow.state = 'flee'
    crow.vx = (crow.x < W / 2 ? -1 : 1) * rnd(420, 560)
    crow.vy = -rnd(520, 680)
    crow.target = null
    fx.burst(crow.x, crow.y - 40, { count: 16, color: ['#1b1b27', '#3a3a52', '#2a2a3c'], speed: 460, life: 0.9, size: 16, gravity: 500, shape: 'square' })
    fx.shake(5)
    sfx.tone({ freq: 900, to: 300, dur: 0.3, type: 'sawtooth', vol: 0.14 })
    sfx.boing(3)
    nextCrowAt = stage.time + rnd(20, 30)
  }

  const beeJoy = (): void => {
    bee.fast = true
    fx.burst(bee.x, bee.y, { count: 8, color: ['#ff7ac8', '#ff5d8f'], shape: 'heart', speed: 240, life: 0.7, size: 16, gravity: -120 })
    sfx.tone({ freq: 240, to: 330, dur: 0.22, type: 'sawtooth', vol: 0.08 })
    sfx.pop(6)
  }

  const groundTap = (x: number, y: number): void => {
    if (y < 186) {
      if (dist(x, y, 108, 80) < 80) {
        sunSpin.kick(14)
        sunWowUntil = stage.time + 0.8
        fx.burst(108, 80, { count: 12, color: ['#ffe14d', '#fff6c0'], shape: 'spark', speed: 420, life: 0.5, size: 12, gravity: 0 })
        sfx.ding(rnd(0, 5))
      } else {
        fx.burst(x, y, { count: 7, color: '#ffffff', speed: 200, life: 0.5, size: 16, gravity: -60 })
        sfx.tone({ freq: 1900, to: 2600, dur: 0.06, vol: 0.1 })
        sfx.tone({ freq: 2300, to: 1800, dur: 0.08, vol: 0.1, delay: 0.08 })
      }
      fx.ring(x, y, '#ffffff', 50, 0.3)
      return
    }
    // A flower springs up wherever the lawn is poked, and stays.
    const d: Decor = { x, y, emoji: pick(['🌼', '🌷', '🌸', '🌻']), s: 0, tilt: rnd(-0.25, 0.25) }
    decor.push(d)
    if (decor.length > 16) decor.shift()
    stage.tween(0.4, (t) => (d.s = t), ease.outBack)
    fx.burst(x, y, { count: 6, color: ['#9be57a', '#6cc653'], speed: 220, angle: -Math.PI / 2, spread: 2, life: 0.4, size: 9 })
    fx.ring(x, y, '#ffffff', 46, 0.3)
    sfx.pop(Math.round(rnd(0, 6)))
  }

  const act = (p: Pointer, isDown: boolean): void => {
    const s = strokes.get(p.id)
    if (!s) return
    if ((crow.state === 'in' || crow.state === 'peck' || crow.state === 'steal') && dist(p.x, p.y, crow.x, crow.y - 48) < 96) {
      shoo()
      return
    }
    if (isDown && bee.state !== 'off' && dist(p.x, p.y, bee.x, bee.y) < 70) {
      beeJoy()
      return
    }
    if (p.y >= 594) {
      s.plot = -1
      if (!isDown) return
      for (let i = 0; i < SLOTS; i++) {
        const x = cardX(i)
        if (p.x >= x - CARD_GAP / 2 && p.x <= x + CARD_W + CARD_GAP / 2 && p.y <= SHOP_Y + CARD_H + 16) {
          tapCard(i)
          return
        }
      }
      fx.ring(p.x, p.y, '#ffe8c0', 40, 0.25)
      sfx.tone({ freq: 190 + rnd(0, 40), to: 120, dur: 0.07, type: 'triangle', vol: 0.2 })
      return
    }
    const plot = plotAt(p.x, p.y)
    if (plot) {
      if (s.plot === plot.i && !isDown) return
      s.plot = plot.i
      touchPlot(plot, p.x, p.y, isDown)
      return
    }
    s.plot = -1
    if (!isDown) return
    if (dist(p.x, p.y, BX, BY - 70) < 135) {
      basket.value = 0.7
      basket.kick(5)
      basketMoodUntil = stage.time + 0.4
      fx.ring(BX, BY - 80, '#ffffff', 120, 0.3)
      sfx.boing(Math.round(rnd(0, 3)))
      return
    }
    if (p.x > 860 && p.y < 110) {
      counterPop.value = 1.2
      sfx.coin(Math.round(rnd(0, 3)))
      fx.burst(p.x, p.y, { count: 5, color: ['#ffc928', '#ffe88a'], speed: 200, life: 0.4, size: 10 })
      return
    }
    groundTap(p.x, p.y)
  }

  // ---- opening scene -------------------------------------------------------

  const openPlots = plots.filter((p) => p.open)
  const growing = openPlots[5 + Math.floor(stage.rand() * 2)]!
  const empty = [openPlots[7]!, openPlots[2 + Math.floor(stage.rand() * 2)]!]
  for (const p of openPlots) {
    if (empty.includes(p)) continue
    p.crop = CROPS[0]!
    if (p === growing) {
      p.g = 0.35
      p.stage = 1
      p.scale.value = p.scale.target = STAGE_SCALE[1]!
    } else {
      p.g = 1
      p.stage = 3
      p.scale.value = p.scale.target = 1
    }
  }

  // ---- update --------------------------------------------------------------

  const updateWeather = (dt: number): void => {
    weatherMix = damp(weatherMix, weather === 'sun' ? 0 : 1, 3, dt)
    const t = stage.time
    if (weather === 'sun') {
      if (t >= nextWeatherAt) {
        let next = WEATHER_ORDER[weatherCount % WEATHER_ORDER.length]!
        if (weatherCount >= WEATHER_ORDER.length) {
          const others = WEATHER_ORDER.filter((w) => w !== seen)
          next = pick(others)
        }
        startWeather(next)
      }
      return
    }
    weatherT += dt
    while (strikes.length > 0 && weatherT >= strikes[0]!) {
      strikes.shift()
      strike()
    }
    if (weather === 'rain' && t >= dripAt) {
      dripAt = t + 0.22
      const wet = plots.filter((p) => p.crop !== null && p.stage < 3)
      if (wet.length > 0) {
        const p = pick(wet)
        fx.burst(p.x + rnd(-40, 40), p.y - 10, { count: 3, color: ['#c9f1ff', '#7fd4ff'], speed: 160, angle: -Math.PI / 2, spread: 1.6, life: 0.3, size: 7, gravity: 700 })
        sfx.tone({ freq: rnd(1300, 2100), dur: 0.03, vol: 0.035 })
      }
    }
    if (weatherT >= WEATHER_SECONDS) {
      weather = 'sun'
      nextWeatherAt = t + SUNNY_SECONDS
    }
  }

  const updateCrow = (dt: number): void => {
    const t = stage.time
    if (crow.state === 'off') {
      if (t < nextCrowAt) return
      const ripe = plots.filter((p) => p.crop !== null && p.stage === 3)
      const any = ripe.length > 0 ? ripe : plots.filter((p) => p.crop !== null && p.stage > 0)
      if (any.length === 0) {
        nextCrowAt = t + 3
        return
      }
      // It wants the most valuable thing in the garden.
      const target = any.reduce((a, b) => (b.crop!.value * mult(b) > a.crop!.value * mult(a) ? b : a))
      // It lands beside the crop, inside the bed, facing its snack.
      const onRight = target.col < COLS - 1
      crow.target = target
      crow.dir = onRight ? -1 : 1
      crow.fromX = onRight ? W + 90 : -90
      crow.fromY = 60
      crow.toX = target.x - crow.dir * 96
      crow.toY = target.y + 10
      crow.x = crow.fromX
      crow.y = crow.fromY
      crow.t = 0
      crow.pecks = 0
      crow.spin = 0
      crow.loot = null
      crow.state = 'in'
      caw()
      return
    }
    if (crow.state === 'in') {
      crow.t = Math.min(1, crow.t + dt / 1.5)
      const e = ease.outCubic(crow.t)
      crow.x = lerp(crow.fromX, crow.toX, e)
      crow.y = lerp(crow.fromY, crow.toY, e) - Math.sin(crow.t * Math.PI) * 40
      if (crow.t === 1) {
        crow.state = 'peck'
        crow.t = 0
        sfx.thud(0.3)
        fx.burst(crow.x, crow.y, { count: 5, color: '#ffffff', speed: 160, angle: -Math.PI / 2, spread: 2.6, life: 0.3, size: 8 })
      }
    } else if (crow.state === 'peck') {
      const target = crow.target
      crow.t += dt
      if (!target || !target.crop) {
        // Its snack vanished: a confused bird leaves on its own.
        say(crow.x, crow.y - 100, '?', { color: '#ffffff', size: 50 })
        sfx.tone({ freq: 500, to: 700, dur: 0.18, type: 'sawtooth', vol: 0.08 })
        crow.state = 'steal'
        crow.loot = null
        crow.t = 0
        nextCrowAt = t + rnd(20, 30)
        return
      }
      if (crow.t >= (crow.pecks + 1) * 0.75) {
        crow.pecks++
        if (crow.pecks >= 5) {
          crow.loot = { crop: target.crop, gold: target.gold, giant: target.giant, frost: target.frost, bee: target.bee }
          dirt(target.x, target.y, 8)
          clearPlot(target)
          target.soil.value = 0.7
          say(crow.x, crow.y - 100, 'MINE!', { color: '#ffffff', size: 40 })
          caw()
          sfx.slideUp()
          crow.state = 'steal'
          crow.t = 0
          nextCrowAt = t + rnd(20, 30)
        } else {
          target.lean.kick(crow.dir * 5)
          target.sq.value = 0.85
          fx.burst(target.x - crow.dir * 30, target.y - 40, { count: 4, color: target.crop.colors, speed: 200, life: 0.35, size: 8 })
          sfx.tone({ freq: 520, to: 300, dur: 0.05, type: 'square', vol: 0.09 })
        }
      }
    } else if (crow.state === 'steal') {
      crow.t += dt
      crow.x += crow.dir * -1 * (160 + crow.t * 120) * dt
      crow.y -= (70 + crow.t * 110) * dt
      if (crow.x < -120 || crow.x > W + 120 || crow.y < -100) {
        crow.state = 'off'
        crow.loot = null
      }
    } else {
      crow.spin += dt * 14
      crow.vy += 900 * dt
      crow.x += crow.vx * dt
      crow.y += crow.vy * dt
      if (crow.x < -140 || crow.x > W + 140 || crow.y > H + 120 || crow.y < -300) crow.state = 'off'
    }
  }

  const updateBee = (dt: number): void => {
    const t = stage.time
    if (bee.state === 'off') {
      if (t < nextBeeAt) return
      const any = plots.filter((p) => p.crop !== null && !p.bee)
      if (any.length === 0) {
        nextBeeAt = t + 3
        return
      }
      bee.target = pick(any)
      bee.x = -60
      bee.y = 240
      bee.fast = false
      bee.state = 'in'
      sfx.tone({ freq: 210, to: 250, dur: 0.4, type: 'sawtooth', vol: 0.06 })
      return
    }
    const speed = bee.fast ? 640 : 250
    if (bee.state === 'in') {
      const target = bee.target
      if (!target || !target.crop || target.bee) {
        const any = plots.filter((p) => p.crop !== null && !p.bee)
        if (any.length === 0) {
          bee.state = 'out'
          return
        }
        bee.target = pick(any)
        return
      }
      const tx = target.x + 10
      const ty = cropTop(target) - 24
      const d = dist(bee.x, bee.y, tx, ty)
      if (d < 12) {
        bee.state = 'work'
        bee.t = 0
      } else {
        bee.x += ((tx - bee.x) / d) * Math.min(d, speed * dt)
        bee.y += ((ty - bee.y) / d) * Math.min(d, speed * dt)
      }
    } else if (bee.state === 'work') {
      const target = bee.target
      bee.t += dt * (bee.fast ? 2.5 : 1)
      if (target && target.crop) {
        const a = bee.t * 7
        bee.x = damp(bee.x, target.x + Math.cos(a) * 46, 10, dt)
        bee.y = damp(bee.y, cropTop(target) + 10 + Math.sin(a) * 20, 10, dt)
      }
      if (bee.t >= 1.3) {
        if (target && target.crop && !target.bee) {
          target.bee = true
          target.sq.kick(4)
          fx.burst(target.x, cropTop(target) + 20, { count: 10, color: ['#ff7ac8', '#ffe14d'], shape: 'heart', speed: 260, life: 0.8, size: 16, gravity: -100 })
          announce(target, 'BEE BOOST')
          sfx.ding(5)
          sfx.ding(7)
        }
        bee.state = 'out'
        nextBeeAt = t + rnd(24, 34)
      }
    } else {
      bee.x += speed * 1.2 * dt
      bee.y -= speed * 0.5 * dt
      if (bee.x > W + 80 || bee.y < -80) bee.state = 'off'
    }
  }

  const restock = (): void => {
    restocks++
    nextRestock = stage.time + RESTOCK_SECONDS
    for (let i = 0; i < SLOTS; i++) {
      stage.after(i * 0.05, () => {
        cardPop[i]!.kick(-200)
        sfx.tick()
      })
    }
    if (rare && rare.bought && rare.left > 0) return
    if (selected === RARE_SLOT) selected = bestOwned().tier
    if (restocks > 1 && Math.random() > 0.7) {
      rare = null
      return
    }
    const best = bestOwned()
    const kind = RARES[rareIndex++ % RARES.length]!
    rare = {
      crop: { id: kind.id, emoji: kind.emoji, tier: -1, price: 0, value: best.value * 8, grow: 4.2, rot: 0, eye: kind.eye, colors: kind.colors },
      price: best.value * 6,
      left: 3,
      bought: false,
    }
    couldBuyRare = false
    const cx = cardX(RARE_SLOT) + CARD_W / 2
    stage.after(0.35, () => {
      cardPop[RARE_SLOT]!.kick(-460)
      fx.burst(cx, SHOP_Y + 50, { count: 18, color: ['#e4b8ff', '#ffe14d', '#ffffff'], shape: 'star', speed: 380, life: 0.8, size: 14 })
      say(cx - 40, SHOP_Y - 30, 'RARE SEED!', { color: '#e4b8ff', size: 44, life: 1.4 })
      sfx.ding(4)
      sfx.ding(7)
    })
  }

  // Ring a bell the moment something becomes affordable.
  const watchPrices = (): void => {
    const tier = nextTier()
    const seedOk = tier >= 0 && coins >= CROPS[tier]!.price
    if (seedOk && !couldBuySeed) {
      const cx = cardX(tier) + CARD_W / 2
      cardPop[tier]!.kick(-300)
      fx.ring(cx, SHOP_Y + 60, '#ffe14d', 130, 0.5)
      fx.burst(cx, SHOP_Y + 40, { count: 10, color: ['#ffe14d', '#ffffff'], shape: 'star', speed: 300, life: 0.6, size: 13 })
      sfx.ding(3)
      sfx.tone({ freq: sfx.scale(10), dur: 0.3, vol: 0.14, delay: 0.1 })
    }
    couldBuySeed = seedOk
    const np = nextPlot()
    const plotOk = np !== null && coins >= PLOT_PRICES[plotsBought]!
    if (plotOk && !couldBuyPlot && np) {
      np.sign.kick(8)
      fx.ring(np.x, np.y - 30, '#ffe14d', 100, 0.5)
      sfx.ding(1)
    }
    couldBuyPlot = plotOk
    const rareOk = rare !== null && !rare.bought && coins >= rare.price
    if (rareOk && !couldBuyRare) cardPop[RARE_SLOT]!.kick(-260)
    couldBuyRare = rareOk
  }

  // ---- drawing -------------------------------------------------------------

  const drawSky = (g: CanvasRenderingContext2D): void => {
    const t = stage.time
    const gloomy = seen === 'rain' || seen === 'storm' || seen === 'frost' ? weatherMix : 0
    // Sun.
    const sx = 108
    const sy = 80 - gloomy * 190
    if (sy > -80) {
      const rot = t * 0.4 + sunSpin.value
      g.strokeStyle = '#ffe070'
      g.lineWidth = 9
      g.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = rot + (i * TAU) / 10
        const r2 = 66 + Math.sin(t * 3 + i) * 5
        g.moveTo(sx + Math.cos(a) * 52, sy + Math.sin(a) * 52)
        g.lineTo(sx + Math.cos(a) * r2, sy + Math.sin(a) * r2)
      }
      g.stroke()
      circle(g, sx, sy, 44, '#ffd93b', '#ffb300', 5)
      const mood: Mood = t < sunWowUntil ? 'wow' : 'happy'
      face(g, sx, sy - 6, 9, mood, clamp((look.x - sx) / 500, -1, 1), clamp((look.y - sy) / 400, -1, 1), blinkAt(t, 3))
    }
    const grey = seen === 'storm' ? 110 : 170
    const shade = Math.round(lerp(255, grey, gloomy && seen !== 'frost' ? gloomy : 0))
    const fill = `rgb(${shade},${shade},${Math.min(255, shade + 14)})`
    for (const c of clouds) cloud(g, c.x, c.y, c.r, fill)
  }

  const drawRainbow = (g: CanvasRenderingContext2D): void => {
    const draw = clamp(weather === 'rainbow' ? weatherT / 1.1 : 1, 0, 1)
    const colors = ['#ff5d5d', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff']
    g.globalAlpha = 0.85 * weatherMix
    g.lineWidth = 13
    g.lineCap = 'butt'
    for (let i = 0; i < colors.length; i++) {
      g.beginPath()
      g.ellipse(470, 240, 410 - i * 12, 205 - i * 12, 0, Math.PI, Math.PI + Math.PI * ease.outCubic(draw))
      g.strokeStyle = colors[i]!
      g.stroke()
    }
    g.lineCap = 'round'
    g.globalAlpha = 1
  }

  const drawGloom = (g: CanvasRenderingContext2D): void => {
    if (weatherMix < 0.01 || seen === 'rainbow') return
    const tint = seen === 'rain' ? 'rgba(40,70,130,' : seen === 'storm' ? 'rgba(24,20,70,' : 'rgba(190,225,255,'
    const alpha = (seen === 'rain' ? 0.24 : seen === 'storm' ? 0.46 : 0.3) * weatherMix
    g.fillStyle = `${tint}${alpha})`
    g.fillRect(0, 0, W, 596)
    const fill = seen === 'rain' ? '#8ea2c2' : seen === 'storm' ? '#4b4f70' : '#eef6ff'
    const y = -120 + weatherMix * 118
    for (let i = 0; i < 6; i++) cloud(g, 40 + i * 200 + Math.sin(stage.time * 0.6 + i) * 12, y + (i % 2) * 16, 120, fill)
  }

  const drawFalling = (g: CanvasRenderingContext2D): void => {
    if (weatherMix < 0.02) return
    const t = stage.time
    if (seen === 'rain' || seen === 'storm') {
      g.globalAlpha = 0.6 * weatherMix
      g.strokeStyle = '#d6efff'
      g.lineWidth = 3
      g.beginPath()
      for (let i = 0; i < 54; i++) {
        const sp = 860 + (i % 7) * 70
        const y = ((t * sp + i * 173) % 620) - 40
        const x = ((i * 127.3) % (W + 160)) - y * 0.22
        g.moveTo(x, y)
        g.lineTo(x - 6, y + 26)
      }
      g.stroke()
      g.globalAlpha = 1
    } else if (seen === 'frost') {
      g.globalAlpha = 0.9 * weatherMix
      g.fillStyle = '#ffffff'
      g.beginPath()
      for (let i = 0; i < 40; i++) {
        const y = ((t * (70 + (i % 5) * 20) + i * 57) % 610) - 10
        const x = ((i * 89.7) % W) + Math.sin(t * 1.3 + i) * 18
        const r = 3 + (i % 3) * 1.6
        g.moveTo(x + r, y)
        g.arc(x, y, r, 0, TAU)
      }
      g.fill()
      g.globalAlpha = 1
    }
  }

  const priceTag = (g: CanvasRenderingContext2D, x: number, y: number, n: number, size: number, color: string, outline: string | null): void => {
    const text = fmt(n)
    g.font = `900 ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`
    const r = size * 0.46
    const width = r * 2 + 6 + g.measureText(text).width
    const left = x - width / 2
    coin(g, left + r, y, r)
    label(g, text, left + r * 2 + 6, y + 1, size, color, outline, 'left')
  }

  const drawPlot = (g: CanvasRenderingContext2D, p: Plot): void => {
    const t = stage.time
    if (!p.open) {
      // Still lawn: a grassy patch, and a price sign on the next one to open.
      ellipse(g, p.x, p.y, 84, 34, '#6fc955')
      ellipse(g, p.x, p.y - 3, 72, 26, '#82d666')
      g.strokeStyle = '#4aa53c'
      g.lineWidth = 4
      g.beginPath()
      for (let i = -2; i <= 2; i++) {
        const x = p.x + i * 28
        const y = p.y + (i % 2 === 0 ? 4 : -6)
        g.moveTo(x - 6, y)
        g.lineTo(x - 9, y - 12)
        g.moveTo(x, y)
        g.lineTo(x, y - 15)
        g.moveTo(x + 6, y)
        g.lineTo(x + 9, y - 12)
      }
      g.stroke()
      if (p === nextPlot()) {
        const can = coins >= PLOT_PRICES[plotsBought]!
        const bob = can ? Math.abs(Math.sin(t * 5)) * 10 : 0
        g.save()
        g.translate(p.x, p.y + 6)
        g.rotate(p.sign.value * 0.04)
        g.fillStyle = '#8a5a2e'
        g.fillRect(-6, -40 - bob, 12, 44 + bob)
        rrect(g, -62, -96 - bob, 124, 58, 14, can ? '#ffe9a0' : '#f3dcae', can ? '#ffb300' : '#8a5a2e', 5)
        priceTag(g, 0, -67 - bob, PLOT_PRICES[plotsBought]!, 28, can ? '#1f8a3a' : '#6b4320', null)
        g.restore()
      }
      return
    }
    const [mx, my] = volume(p.soil.value)
    // The mound behind the plant.
    ellipse(g, p.x, p.y, 86 * mx, 35 * my, '#5f3719')
    ellipse(g, p.x, p.y - 2, 70 * mx, 24 * my, '#6f4222')
    g.beginPath()
    g.ellipse(p.x, p.y - 1, 80 * mx, 30 * my, 0, 1.12 * Math.PI, 1.88 * Math.PI)
    g.strokeStyle = 'rgba(190,130,80,0.5)'
    g.lineWidth = 4
    g.stroke()
    const crop = p.crop
    const base = p.y + 8
    if (!crop) {
      // A ghost of the chosen seed: "this goes here".
      const c = selected === RARE_SLOT && rare ? rare.crop : (CROPS[selected] ?? CROPS[0]!)
      const gy = p.y - 34 + Math.sin(t * 2.4 + p.seed) * 5
      const pulse = 1 + Math.sin(t * 3 + p.seed) * 0.06
      g.globalAlpha = 0.26
      circle(g, p.x, gy, 34 * pulse, '#ffffff')
      g.globalAlpha = 0.75
      g.setLineDash([9, 9])
      g.lineDashOffset = -t * 14
      circle(g, p.x, gy, 34 * pulse, 'rgba(255,255,255,0)', '#ffffff', 3.5)
      g.setLineDash([])
      g.globalAlpha = 0.8
      sprites.draw(g, c.emoji, p.x, gy, 40, c.base ?? 'plain', c.rot)
      g.globalAlpha = 1
    } else if (p.stage === 0) {
      const s = Math.max(0, p.scale.value)
      squash(g, p.x, base, 1, 1, () => sprites.draw(g, '🌱', p.x, base - 26 * s, 60 * s), p.lean.value * 0.08)
    } else {
      const ripe = p.stage === 3
      const size = cropSize(p)
      let hop = 0
      let st = p.sq.value
      if (ripe) {
        const ph = ((t + p.seed) % 1.5) / 0.42
        if (ph < 1) {
          hop = Math.sin(ph * Math.PI) * 16
          st *= 1 + Math.sin(ph * TAU) * 0.11
        }
      } else {
        st *= 1 + Math.sin(t * 5 + p.seed) * 0.03
      }
      const [sx, sy] = volume(st)
      const cy = base - size * 0.4 - hop
      const tint = tintOf(p, crop)
      squash(
        g,
        p.x,
        base,
        sx,
        sy,
        () => {
          sprites.draw(g, crop.emoji, p.x, cy, size, tint, crop.rot)
          if (ripe && crop.eye) {
            const ex = p.x + crop.eye.x * size
            const ey = cy + crop.eye.y * size
            eyes(g, ex, ey, crop.eye.s * size, clamp((look.x - ex) / 300, -1, 1), clamp((look.y - ey) / 300, -1, 1), blinkAt(t, p.seed))
          }
        },
        p.lean.value * 0.06,
      )
      if (p.gold || p.frost) {
        const c = p.gold ? '#fff7b0' : '#e8f8ff'
        for (let k = 0; k < 3; k++) {
          const a = t * 1.6 + k * 2.1 + p.seed
          const tw = Math.abs(Math.sin(t * 4 + k * 1.7 + p.seed))
          star(g, p.x + Math.cos(a) * size * 0.46, cy + Math.sin(a * 1.3) * size * 0.4, 5 + tw * 9, c, a)
        }
      }
    }
    // The front lip of the mound hides the bottom of the plant.
    g.beginPath()
    g.ellipse(p.x, p.y, 86 * mx, 35 * my, 0, 0.1 * Math.PI, 0.9 * Math.PI)
    g.closePath()
    g.fillStyle = '#5f3719'
    g.fill()
  }

  const drawBadge = (g: CanvasRenderingContext2D, p: Plot): void => {
    if (!p.crop || p.stage === 0) return
    const m = mult(p)
    if (m === 1) return
    const size = cropSize(p)
    const bob = Math.sin(stage.time * 4 + p.seed) * 4
    label(g, `x${m}`, p.x + size * 0.42, p.y + 8 - size * 0.8 + bob, clamp(24 + Math.log10(m) * 8, 26, 44), p.gold ? '#ffe14d' : p.frost ? '#c9f1ff' : '#ffc79a')
  }

  const drawBeams = (g: CanvasRenderingContext2D): void => {
    for (const b of beams) {
      const k = b.life / b.max
      g.globalAlpha = k
      const layers: [string, number][] = b.bolt
        ? [['#fff7a8', 18], ['#ffffff', 7]]
        : [['#ff7ac8', 26], ['#ffe14d', 16], ['#ffffff', 6]]
      for (const [color, width] of layers) {
        g.beginPath()
        g.moveTo(b.pts[0]![0], b.pts[0]![1])
        for (let i = 1; i < b.pts.length; i++) g.lineTo(b.pts[i]![0], b.pts[i]![1])
        g.strokeStyle = color
        g.lineWidth = width * (b.bolt ? 1 : k)
        g.stroke()
      }
    }
    g.globalAlpha = 1
  }

  const drawBasket = (g: CanvasRenderingContext2D): void => {
    const t = stage.time
    const [sx, sy] = volume(basket.value * (1 + Math.sin(t * 2.2) * 0.015))
    shadow(g, BX, BY + 8, 130)
    squash(g, BX, BY, sx, sy, () => {
      // Handle.
      g.strokeStyle = '#a06a30'
      g.lineWidth = 16
      g.beginPath()
      g.ellipse(BX, BY - 126, 92, 78, 0, Math.PI, TAU)
      g.stroke()
      g.strokeStyle = '#c48a48'
      g.lineWidth = 6
      g.beginPath()
      g.ellipse(BX, BY - 128, 92, 78, 0, Math.PI * 1.1, Math.PI * 1.9)
      g.stroke()
      // What it caught last pokes out of the top.
      const spots = [[0, -150], [-54, -140], [54, -140]] as const
      for (let i = Math.min(recent.length, 3) - 1; i >= 0; i--) {
        const r = recent[i]!
        sprites.draw(g, r.emoji, BX + spots[i]![0], BY + spots[i]![1], 72, r.tint, r.rot)
      }
      // Body.
      g.beginPath()
      g.moveTo(BX - 116, BY - 128)
      g.lineTo(BX + 116, BY - 128)
      g.quadraticCurveTo(BX + 108, BY - 20, BX + 78, BY - 4)
      g.quadraticCurveTo(BX, BY + 8, BX - 78, BY - 4)
      g.quadraticCurveTo(BX - 108, BY - 20, BX - 116, BY - 128)
      g.closePath()
      g.fillStyle = '#e0a860'
      g.fill()
      g.save()
      g.clip()
      g.strokeStyle = '#c1873f'
      g.lineWidth = 5
      for (let row = 0; row < 4; row++) {
        const y = BY - 100 + row * 28
        g.beginPath()
        g.moveTo(BX - 130, y)
        g.quadraticCurveTo(BX, y + 12, BX + 130, y)
        g.stroke()
      }
      g.lineWidth = 4
      for (let i = -4; i <= 4; i++) {
        g.beginPath()
        g.moveTo(BX + i * 27, BY - 128)
        g.lineTo(BX + i * 21, BY + 6)
        g.stroke()
      }
      g.fillStyle = 'rgba(120,70,20,0.18)'
      g.fillRect(BX + 40, BY - 130, 100, 140)
      g.restore()
      rrect(g, BX - 126, BY - 144, 252, 32, 16, '#f0c07a', '#a06a30', 5)
      // Face.
      ellipse(g, BX - 52, BY - 50, 14, 9, 'rgba(255,120,120,0.45)')
      ellipse(g, BX + 52, BY - 50, 14, 9, 'rgba(255,120,120,0.45)')
      const mood: Mood = t < basketMoodUntil ? 'yum' : flyers.length > 0 ? 'wow' : 'happy'
      const target = flyers[0]
      const lx = target ? target.x : look.x
      const ly = target ? target.y : look.y
      face(g, BX, BY - 76, 14, mood, clamp((lx - BX) / 320, -1, 1), clamp((ly - (BY - 76)) / 260, -1, 1), blinkAt(t, 1))
    })
  }

  const drawCard = (g: CanvasRenderingContext2D, i: number): void => {
    const t = stage.time
    const cx = cardX(i) + CARD_W / 2
    const sel = selected === i
    let bob = 0
    g.save()
    const paint = (fill: string, stroke: string, width: number): void => {
      rrect(g, -CARD_W / 2 + 3, -CARD_H / 2 + 8, CARD_W, CARD_H, 22, 'rgba(60,30,10,0.3)')
      rrect(g, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 22, fill, stroke, width)
    }
    if (i === RARE_SLOT) {
      const can = rare !== null && !rare.bought && coins >= rare.price
      if (can) bob = -Math.abs(Math.sin(t * 6)) * 8
      g.translate(cx, SHOP_Y + CARD_H / 2 + cardLift[i]! + cardPop[i]!.value + bob)
      g.rotate(cardShake[i]!.value * 0.05)
      if (!rare) {
        // An empty crate with a clock: something arrives when the ring closes.
        paint('#6d5a94', '#463a66', 5)
        label(g, '?', 0, -4, 60, 'rgba(255,255,255,0.85)', null)
        const left = clamp(1 - (nextRestock - t) / RESTOCK_SECONDS, 0, 1)
        g.beginPath()
        g.arc(0, -6, 46, -Math.PI / 2, -Math.PI / 2 + TAU * left)
        g.strokeStyle = '#ffd84d'
        g.lineWidth = 7
        g.stroke()
      } else {
        const hue = (t * 140) % 360
        paint(rare.bought ? '#fbeaff' : can ? '#f6dcff' : '#cdb6e6', sel ? '#ff8a1c' : `hsl(${hue},90%,62%)`, sel ? 8 : 7)
        sprites.draw(g, rare.crop.emoji, 0, -14 + Math.sin(t * 4) * 3, 72)
        if (rare.bought) label(g, `x${rare.left}`, 0, 40, 28, '#7a3fb0', null)
        else priceTag(g, 0, 40, rare.price, 26, can ? '#1f8a3a' : '#5a3a7a', null)
      }
      g.restore()
      return
    }
    const crop = CROPS[i]!
    const own = owned[i]!
    const next = i === nextTier()
    const can = next && coins >= crop.price
    if (can) bob = -Math.abs(Math.sin(t * 6)) * 10
    g.translate(cx, SHOP_Y + CARD_H / 2 + cardLift[i]! + cardPop[i]!.value + bob)
    g.rotate(cardShake[i]!.value * 0.05)
    if (own) {
      paint(sel ? '#fffbe8' : '#fff1cf', sel ? '#ff8a1c' : '#d9a860', sel ? 8 : 5)
      sprites.draw(g, crop.emoji, 0, -14, sel ? 78 + Math.sin(t * 5) * 3 : 70, crop.base ?? 'plain', crop.rot)
      priceTag(g, 0, 41, crop.value, 24, '#7a4a12', null)
      // Collection pips: gold, giant, frosty.
      const pips = [[`${crop.id}:gold`, '#ffc928'], [`${crop.id}:giant`, '#ff7a4d'], [`${crop.id}:frost`, '#6fc8ff']] as const
      pips.forEach(([key, color], k) => circle(g, 48, -40 + k * 17, 6, found.has(key) ? color : 'rgba(120,80,30,0.18)'))
    } else if (next) {
      paint(can ? '#ffe9a0' : '#b39a7d', can ? '#ffb300' : '#7a6450', can ? 7 : 5)
      sprites.draw(g, crop.emoji, 0, -16, 70, can ? (crop.base ?? 'plain') : 'dark', crop.rot)
      priceTag(g, 0, 36, crop.price, 26, can ? '#1f8a3a' : '#ffffff', can ? null : 'rgba(40,25,15,0.7)')
      if (!can) {
        rrect(g, -52, 50, 104, 7, 3.5, 'rgba(40,25,15,0.45)')
        rrect(g, -52, 50, Math.max(7, 104 * clamp(shown / crop.price, 0, 1)), 7, 3.5, '#ffd84d')
      }
    } else {
      paint('#8c7763', '#6a5745', 5)
      g.globalAlpha = 0.55
      sprites.draw(g, crop.emoji, 0, -14, 64, 'dark', crop.rot)
      g.globalAlpha = 1
      sprites.draw(g, '🔒', 0, 38, 28)
    }
    g.restore()
  }

  const drawHud = (g: CanvasRenderingContext2D): void => {
    const s = counterPop.value
    g.save()
    g.translate(1014, 56)
    g.scale(s, s)
    rrect(g, -142, -36, 284, 80, 26, 'rgba(60,30,10,0.3)')
    rrect(g, -142, -42, 284, 80, 26, '#fff1cf', '#8a5a2e', 6)
    coin(g, -98, -2, 25)
    label(g, fmt(shown), -62, 0, 46, '#5a3510', null, 'left')
    g.restore()
    star(g, 968, 121, 13, '#ffe14d')
    label(g, `${foundCount}/24`, 986, 122, 24, '#ffffff', 'rgba(30,20,40,0.75)', 'left')
  }

  const drawHint = (g: CanvasRenderingContext2D): void => {
    const t = stage.time
    if (t - lastTouchAt < 5 || flyers.length > 0) return
    const ripe = plots.find((p) => p.crop !== null && p.stage === 3)
    if (ripe) return hint(g, ripe.x, ripe.y - 50, t)
    const tier = nextTier()
    if (tier >= 0 && coins >= CROPS[tier]!.price) return hint(g, cardX(tier) + CARD_W / 2, SHOP_Y + 50, t)
    const np = nextPlot()
    if (np && coins >= PLOT_PRICES[plotsBought]!) return hint(g, np.x, np.y - 50, t)
    const hole = plots.find((p) => p.open && p.crop === null)
    if (hole) return hint(g, hole.x, hole.y - 30, t)
    const sprout = plots.find((p) => p.crop !== null)
    if (sprout) hint(g, sprout.x, sprout.y - 40, t)
  }

  return {
    update(dt) {
      const t = stage.time
      shown = Math.abs(coins - shown) < 0.6 ? coins : damp(shown, coins, 12, dt)
      counterPop.update(dt)
      basket.update(dt)
      sunSpin.update(dt)
      for (const c of clouds) {
        c.x += c.v * dt
        if (c.x > W + 120) c.x = -120
      }
      updateWeather(dt)

      const rate = weather === 'rain' ? 3 : 1
      for (const p of plots) {
        p.scale.update(dt)
        p.sq.update(dt)
        p.lean.update(dt)
        p.soil.update(dt)
        p.big.update(dt)
        p.sign.update(dt)
        if (p.crop && p.stage < 3) {
          p.g += (dt * rate) / p.crop.grow
          const s = p.g >= 1 ? 3 : p.g >= 0.62 ? 2 : p.g >= 0.28 ? 1 : 0
          if (s !== p.stage) setStage(p, s)
        }
      }

      for (let i = flyers.length - 1; i >= 0; i--) {
        const f = flyers[i]!
        f.t += dt / f.dur
        const k = Math.min(1, f.t)
        f.x = lerp(f.x0, BX, k)
        f.y = lerp(f.y0, BY - 130, k) - Math.sin(k * Math.PI) * Math.min(90 + Math.abs(BX - f.x0) * 0.08, f.y0 - 70)
        f.rot += f.spin * dt
        if (f.t >= 1) {
          flyers.splice(i, 1)
          land(f)
        }
      }

      for (let i = beams.length - 1; i >= 0; i--) {
        beams[i]!.life -= dt
        if (beams[i]!.life <= 0) beams.splice(i, 1)
      }

      updateCrow(dt)
      updateBee(dt)
      if (t >= nextRestock) restock()
      watchPrices()

      for (let i = 0; i < SLOTS; i++) {
        cardPop[i]!.update(dt)
        cardShake[i]!.update(dt)
        cardLift[i] = damp(cardLift[i]!, selected === i ? -14 : 0, 14, dt)
      }
      if (stage.pointers.size === 0 && t - look.at > 1.5) {
        look.x = damp(look.x, W / 2 + Math.sin(t * 0.7) * 500, 2, dt)
        look.y = damp(look.y, 380 + Math.cos(t * 0.9) * 200, 2, dt)
      }
    },

    draw(g) {
      const t = stage.time
      g.drawImage(backdrop, 0, 0)
      drawSky(g)
      if (seen === 'rainbow' && weatherMix > 0.01) drawRainbow(g)
      drawGloom(g)
      for (const d of decor) sprites.draw(g, d.emoji, d.x, d.y - 16 * d.s, 40 * d.s, 'plain', d.tilt + Math.sin(t * 2 + d.x) * 0.06)
      for (const p of plots) drawPlot(g, p)
      for (const p of plots) drawBadge(g, p)
      drawBeams(g)
      drawBasket(g)

      if (crow.state !== 'off') {
        const flying = crow.state !== 'peck'
        const peck = crow.state === 'peck' ? Math.max(0, Math.sin(((crow.t % 0.75) / 0.75) * Math.PI)) ** 6 * 0.7 : 0
        if (crow.loot) sprites.draw(g, crow.loot.crop.emoji, crow.x, crow.y + 22, 78, tintOf(crow.loot, crow.loot.crop), crow.loot.crop.rot)
        if (!flying) shadow(g, crow.x, crow.y + 2, 46)
        squash(g, crow.x, crow.y, 1.25, 1.25, () =>
          crowBird(g, crow.x, crow.y, crow.dir * (crow.state === 'steal' ? -1 : 1), Math.sin(t * 22), peck, crow.state === 'flee' ? crow.spin : 0, flying, crow.state === 'flee', blinkAt(t, 5)),
        )
      }
      if (bee.state !== 'off') {
        const wob = Math.sin(t * 9) * 7
        g.globalAlpha = 0.5
        ellipse(g, bee.x - 4, bee.y - 20 + wob, 16, 9 + Math.sin(t * 60) * 4, '#ffffff')
        g.globalAlpha = 1
        sprites.draw(g, '🐝', bee.x, bee.y + wob, 56, 'plain', Math.sin(t * 5) * 0.2)
      }

      for (const f of flyers) {
        const k = Math.min(1, f.t)
        const stretch = 1 + Math.sin(k * Math.PI) * 0.15
        sprites.draw(g, f.crop.emoji, f.x, f.y, lerp(f.size, 66, k * k) * stretch, tintOf(f, f.crop), f.rot)
      }
      drawFalling(g)

      for (let i = 0; i < SLOTS; i++) if (i !== selected) drawCard(g, i)
      drawCard(g, selected)
      drawHud(g)
      drawHint(g)
    },

    down(p) {
      lastTouchAt = stage.time
      look.x = p.x
      look.y = p.y
      look.at = stage.time
      strokes.set(p.id, { plot: -1, trail: 0 })
      act(p, true)
    },

    move(p) {
      if (!p.down) return
      lastTouchAt = stage.time
      look.x = p.x
      look.y = p.y
      look.at = stage.time
      const s = strokes.get(p.id)
      if (s) {
        s.trail += Math.hypot(p.dx, p.dy)
        if (s.trail > 26 && p.y < 610) {
          s.trail = 0
          fx.burst(p.x, p.y, { count: 1, color: ['#ffffff', '#fff7b0'], shape: 'star', speed: 60, life: 0.35, size: 11, gravity: 0 })
        }
      }
      act(p, false)
    },

    up(p) {
      strokes.delete(p.id)
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'mutant-garden',
    name: 'Mutant Garden',
    emoji: '🌱',
    ages: [6, 11],
    pitch: 'Plant seeds, swipe the harvest into the basket for coins, and buy stranger and stranger seeds while the weather mutates the crops.',
    howTo: 'Swipe across ripe crops to harvest, tap empty soil to plant, tap a seed card to buy or pick it. Poke a growing plant to water it; shoo the crow.',
    basedOn: 'Grow a Garden (22.3M concurrent on Roblox)',
    whyFun: 'Plant, wait seconds, harvest, buy a weirder seed: numbers go up fast, and a rainbow or a lightning bolt can turn one crop golden or giant.',
  },
  create,
}
