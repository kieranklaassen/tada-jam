// Fruit Slicer: fruit is lobbed up from behind the crates of a fruit stall and
// a swipe cuts it in two. Juice sprays along the cut, a splat stays on the
// painted wall, and every slice pours a stripe of that fruit's colour into the
// smoothie glass in the corner. A full glass gets slurped and sets off the next
// big thing: a giant watermelon to hack open, then a frenzy from both sides.

import { blinkAt, face, label, rrect, sprite, star } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { clamp, damp, dist, ease, remap, rnd, rndInt, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { CACTUS, FRUITS, GOLD, MELON, SOCK, makeArt } from './art.ts'
import type { JuiceLayer, Kind } from './art.ts'

interface Fruit {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  r: number
  g: number
  yuck: boolean
  golden: boolean
  // Shower and frenzy fruit fill the glass more slowly.
  bonus: boolean
  // Cannot be cut before this time (fruit bursting out of the giant melon).
  safeUntil: number
  seed: number
  puffAt: number
}

interface Half {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  // The cut line's angle; the fruit's own rotation inside that frame.
  rot: number
  rot0: number
  spin: number
  side: number
  r: number
  yuck: boolean
}

interface Splat {
  x: number
  y: number
  shape: number
  color: string
  scale: number
  rot: number
  age: number
  life: number
  drips: { dx: number; len: number; w: number }[]
}

interface TrailPoint {
  x: number
  y: number
  t: number
}

interface Trail {
  pts: TrailPoint[]
  live: boolean
}

interface Stroke {
  x: number
  y: number
  combo: number
  lastSliceAt: number
  sliceX: number
  sliceY: number
  melonDist: number
  melonAt: number
  swooshAt: number
  sparkDist: number
  trail: Trail
}

interface Giant {
  x: number
  y: number
  r: number
  hp: number
  maxHp: number
  stretch: Spring
  tilt: Spring
  scars: { a: number; off: number }[]
  bornAt: number
}

const JUG_X = W - 92
const JUG_BASE = H - 78
const TRAIL_LIFE = 0.26
const SPLAT_LIFE = 9
const MILESTONES = [10, 25, 50, 75, 100, 150, 200, 300]
const COMBO_WORDS = ['', '', '', 'NICE!', 'GREAT!', 'WOW!', 'AMAZING!', 'SUPER!', 'MEGA!']

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  const t = l2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t))
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const art = makeArt(() => stage.rand())

  const fruits: Fruit[] = []
  const halves: Half[] = []
  const splats: Splat[] = []
  const trails: Trail[] = []
  const strokes = new Map<number, Stroke>()

  let streak = 0
  let bestCombo = 0
  let sliced = 0
  const streakPop = spring(1, 260, 11)
  const bestPop = spring(1, 260, 11)
  let streakShake = 0

  let lastTouchAt = 0
  let touched = false

  // The smoothie glass.
  const layers: JuiceLayer[] = []
  let jugAmt = 0
  let drain = 1
  let draining = false
  const jugStretch = spring(1, 200, 9)
  const jugTilt = spring(0, 160, 7)
  let jugMood: Mood = 'happy'
  let moodUntil = 0
  let lookX = 0
  let lookY = 0

  // The director.
  let level = 0
  let waveCount = 0
  let nextWaveAt = 0.9
  let lastYuckWave = -9
  let eventPending = false
  let lastEventEnd = 0
  let giant: Giant | null = null
  let frenzy = false
  let frenzyUntil = 0
  let frenzyNextAt = 0
  let frenzySide = 1
  let frenzyGlow = 0

  const cap = () => Math.min(26, 14 + level * 4)
  const gravity = () => 600 + Math.min(level, 5) * 45
  const setMood = (mood: Mood, seconds: number) => {
    jugMood = mood
    moodUntil = stage.time + seconds
  }

  const randomKind = (): Kind => {
    const r = stage.rand()
    if (r < 0.14) return MELON
    return FRUITS[Math.floor(stage.rand() * FRUITS.length)]!
  }

  const makeFruit = (kind: Kind, x: number, y: number, vx: number, vy: number, extra: Partial<Fruit> = {}): Fruit => {
    const yuck = kind === SOCK || kind === CACTUS
    const fruit: Fruit = {
      kind,
      x,
      y,
      vx,
      vy,
      rot: rnd(0, TAU),
      spin: yuck ? rnd(-1.2, 1.2) : rnd(1.5, 4) * (Math.random() < 0.5 ? -1 : 1),
      r: kind.r,
      g: gravity(),
      yuck,
      golden: kind === GOLD,
      bonus: false,
      safeUntil: 0,
      seed: rnd(0, 10),
      puffAt: 0,
      ...extra,
    }
    if (yuck) fruit.rot = rnd(-0.3, 0.3)
    fruits.push(fruit)
    return fruit
  }

  // Lob one fruit from behind the crates so it peaks at apexY and lands `drift`
  // pixels to the side.
  const launch = (kind: Kind, x: number, apexY: number, drift: number, delay = 0) => {
    const go = () => {
      const g = gravity()
      const startY = H + kind.r + 10
      const vy = -Math.sqrt(2 * g * (startY - apexY))
      const flight = (-vy / g) * 2
      const x0 = clamp(x, 90, W - 190)
      const landing = clamp(x0 + drift, 80, W - 80)
      makeFruit(kind, x0, startY, (landing - x0) / flight, vy)
      if (kind === GOLD) {
        sfx.ding(4)
        sfx.ding(7)
      }
    }
    if (delay > 0) stage.after(delay, go)
    else go()
  }

  const spawnWave = () => {
    waveCount++
    let pattern: string
    if (waveCount <= 2) pattern = 'single'
    else if (waveCount <= 4) pattern = 'pair'
    else if (waveCount === 5) pattern = 'fan3'
    else if (waveCount === 6) pattern = 'line3'
    else {
      const pool = ['pair', 'fan3', 'line3', 'stream3', 'fan3']
      if (waveCount > 8 || level > 0) pool.push('fan5', 'line5', 'stream5', 'cross')
      if (level > 1) pool.push('fan5', 'line5', 'cross')
      pattern = pool[Math.floor(stage.rand() * pool.length)]!
    }
    const count = pattern.endsWith('5') ? 5 : pattern.endsWith('3') ? 3 : pattern === 'pair' ? 2 : pattern === 'cross' ? 4 : 1
    const apex = () => 170 + stage.rand() * 170
    const kinds: Kind[] = []
    for (let i = 0; i < count; i++) kinds.push(randomKind())

    // A grumpy cactus or a stinky sock sneaks into some waves; a golden fruit
    // is the rare thing to hope for.
    const yuckDue = waveCount === 8 || (waveCount > 8 && waveCount - lastYuckWave > 2 && stage.rand() < 0.3)
    if (yuckDue) {
      kinds[Math.floor(stage.rand() * kinds.length)] = stage.rand() < 0.5 ? SOCK : CACTUS
      lastYuckWave = waveCount
    } else if (waveCount === 11 || (waveCount > 11 && stage.rand() < 0.08)) {
      kinds[Math.floor(stage.rand() * kinds.length)] = GOLD
    }

    sfx.tone({ freq: 170 * rnd(0.9, 1.1), to: 380, dur: 0.13, type: 'sine', vol: 0.09 })
    if (pattern === 'single') {
      const x = 260 + stage.rand() * 560
      launch(kinds[0]!, x, apex() + 40, (W / 2 - x) * 0.5)
    } else if (pattern === 'pair') {
      const x = 330 + stage.rand() * 200
      launch(kinds[0]!, x, apex(), -80)
      launch(kinds[1]!, x + 300, apex(), 80, 0.12)
    } else if (pattern.startsWith('fan')) {
      const x = 380 + stage.rand() * 330
      const top = apex()
      kinds.forEach((kind, i) => {
        const k = i - (count - 1) / 2
        launch(kind, x + k * 30, top + Math.abs(k) * 28, k * (count === 5 ? 190 : 250), i * 0.04)
      })
    } else if (pattern.startsWith('line')) {
      // A row that peaks together: one swipe takes them all.
      const top = apex() + 30
      const gap = count === 5 ? 175 : 250
      const x = (W - 100) / 2 - ((count - 1) * gap) / 2
      kinds.forEach((kind, i) => launch(kind, x + i * gap, top, 0, 0))
    } else if (pattern.startsWith('stream')) {
      const left = stage.rand() < 0.5
      const x = left ? 200 : W - 300
      const top = apex()
      kinds.forEach((kind, i) => launch(kind, x, top, left ? 520 : -520, i * 0.2))
    } else {
      const top = apex()
      launch(kinds[0]!, 170, top, 620)
      launch(kinds[1]!, W - 270, top, -620)
      launch(kinds[2]!, 230, top + 110, 440, 0.25)
      launch(kinds[3]!, W - 330, top + 110, -440, 0.25)
    }
    const pace = Math.max(1.15, 1.95 - waveCount * 0.035 - level * 0.08)
    nextWaveAt = stage.time + pace + (count >= 5 ? 0.5 : 0)
  }

  const addSplat = (x: number, y: number, color: string, size: number) => {
    if (splats.length >= 28) splats.shift()
    const drips = []
    const n = rndInt(1, 3)
    for (let i = 0; i < n; i++) drips.push({ dx: rnd(-34, 34) * size, len: rnd(30, 110) * size, w: rnd(7, 13) * size })
    splats.push({
      x,
      y: Math.min(y, art.frontTop - 40),
      shape: rndInt(0, art.splatShapes - 1),
      color,
      scale: size * rnd(0.85, 1.15),
      rot: rnd(0, TAU),
      age: 0,
      life: SPLAT_LIFE,
      drips,
    })
  }

  const addJuice = (color: string, amt: number) => {
    if (draining) return
    const room = cap() - jugAmt
    const add = Math.min(room, amt)
    if (add <= 0) return
    jugAmt += add
    const last = layers[layers.length - 1]
    if (last && last.color === color) last.amt += add
    else layers.push({ color, amt: add })
    if (layers.length > 14) {
      const merged = layers.shift()!
      layers[0]!.amt += merged.amt
    }
    jugStretch.kick(1.2)
  }

  const sliceSound = (r: number, step: number) => {
    const base = remap(r, 44, 160, 520, 140) * rnd(0.94, 1.06)
    sfx.noise({ dur: 0.17, freq: 2600, to: 300, vol: 0.26, filter: 'lowpass' })
    sfx.noise({ dur: 0.05, freq: 5200, vol: 0.09, filter: 'highpass' })
    sfx.tone({ freq: base, to: base * 0.4, dur: 0.13, type: 'sine', vol: 0.2 })
    if (step > 0) sfx.note(Math.min(step, 14), 0.18, 'triangle', 0.17)
  }

  const spray = (x: number, y: number, angle: number, kind: Kind, power: number) => {
    const colors = [kind.juice, kind.juice, kind.flesh]
    fx.burst(x, y, { count: Math.round(9 * power), color: colors, speed: 820, angle, spread: 0.6, life: 0.55, size: 13, gravity: 1100, drag: 0.96 })
    fx.burst(x, y, { count: Math.round(5 * power), color: colors, speed: 520, angle: angle + Math.PI, spread: 0.8, life: 0.45, size: 11, gravity: 1100, drag: 0.96 })
    fx.burst(x, y, { count: Math.round(6 * power), color: kind.juice, speed: 300, life: 0.5, size: 9, gravity: 900 })
  }

  const splitInto = (kind: Kind, x: number, y: number, vx: number, vy: number, r: number, rot: number, angle: number, yuck: boolean, push: number) => {
    const nx = -Math.sin(angle)
    const ny = Math.cos(angle)
    for (const side of [-1, 1]) {
      if (halves.length >= 70) halves.shift()
      halves.push({
        kind,
        x: x + nx * side * r * 0.12,
        y: y + ny * side * r * 0.12,
        vx: vx * 0.5 + nx * side * push + Math.cos(angle) * 130,
        vy: Math.min(vy, 0) * 0.35 + ny * side * push + Math.sin(angle) * 130 - 170,
        rot: angle,
        rot0: rot - angle,
        spin: side * rnd(1.5, 4.5) + rnd(-1, 1),
        side,
        r,
        yuck,
      })
    }
  }

  const endCombo = (s: Stroke) => {
    const n = s.combo
    s.combo = 0
    if (n < 3) return
    const word = COMBO_WORDS[Math.min(n, COMBO_WORDS.length - 1)]!
    const x = clamp(s.sliceX, 290, W - 360)
    const y = clamp(s.sliceY - 90, 170, H - 250)
    fx.text(x, y, `${n} COMBO!`, { color: '#fff06a', size: Math.min(110, 52 + n * 9), life: 1.1, rise: 60 })
    fx.text(x, y + 62, word, { color: '#ffffff', size: 40, life: 1.1, rise: 50 })
    fx.burst(x, y, { count: 10 + n * 2, color: ['#fff06a', '#ffffff', '#ffb02e'], shape: 'star', speed: 520, life: 0.8, size: 16 })
    sfx.coin(Math.min(n, 8))
    if (n >= 5) fx.confetti(x, y + 40, 30)
    if (n > bestCombo) {
      bestCombo = n
      bestPop.value = 1.6
    }
  }

  const celebrateStreak = () => {
    if (!MILESTONES.includes(streak)) return
    fx.text(W / 2, 250, `${streak} IN A ROW!`, { color: '#ffffff', size: 84, life: 1.5, rise: 50 })
    fx.confetti(W / 2, 330, 80)
    fx.flash('#fff6c2', 0.3, 0.25)
    sfx.fanfare()
    setMood('wow', 1.2)
    jugStretch.kick(5)
  }

  const showerFrom = (x: number, y: number, count: number, withGold: boolean) => {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + ((i + 0.5) / count - 0.5) * 2.5 + rnd(-0.1, 0.1)
      const v = rnd(300, 520)
      const kind = withGold && i === Math.floor(count / 2) ? GOLD : FRUITS[rndInt(0, FRUITS.length - 1)]!
      makeFruit(kind, x, y, Math.cos(a) * v, Math.sin(a) * v - 80, { bonus: true, safeUntil: stage.time + 0.38, g: 560 })
    }
  }

  // A tap or a resting finger has no swipe to show, so flash a blade mark.
  const slash = (f: Fruit, angle: number) => {
    const reach = f.r + 46
    const t = stage.time
    trails.push({
      pts: [
        { x: f.x - Math.cos(angle) * reach, y: f.y - Math.sin(angle) * reach, t: t - TRAIL_LIFE * 0.35 },
        { x: f.x, y: f.y, t: t - TRAIL_LIFE * 0.1 },
        { x: f.x + Math.cos(angle) * reach, y: f.y + Math.sin(angle) * reach, t },
      ],
      live: false,
    })
  }

  const slice = (f: Fruit, angle: number, s: Stroke | null) => {
    const at = fruits.indexOf(f)
    if (at === -1) return
    fruits.splice(at, 1)
    lastTouchAt = stage.time
    splitInto(f.kind, f.x, f.y, f.vx, f.vy, f.r, f.rot, angle, f.yuck, 190)

    if (f.yuck) {
      // The funny "ew": the streak goes, and nothing worse.
      const sock = f.kind === SOCK
      fx.text(f.x, f.y - 70, sock ? 'EWWW!' : 'OUCH!', { color: '#c8f04a', size: 78, life: 1.1, outline: '#23400c' })
      fx.burst(f.x, f.y, { count: 16, color: ['#9bd13a', '#c8f04a', '#6f9e1e'], shape: 'ring', speed: 260, life: 1.0, size: 22, gravity: -120, drag: 0.94 })
      fx.burst(f.x, f.y, { count: sock ? 6 : 18, color: sock ? '#3d3d3d' : '#e8ffd0', shape: 'spark', speed: 620, life: 0.5, size: 8, gravity: 300 })
      fx.flash('#a4d83a', 0.28, 0.3)
      fx.shake(9, 0.3)
      sfx.nope()
      sfx.tone({ freq: 120, to: 55, dur: 0.38, type: 'sawtooth', vol: 0.16, delay: 0.05 })
      sfx.tone({ freq: 95, to: 140, dur: 0.12, type: 'sawtooth', vol: 0.12, delay: 0.36 })
      addSplat(f.x, f.y, '#8fbf34', 0.9)
      if (streak > 2) {
        fx.text(150, 118, `-${streak}`, { color: '#c8f04a', size: 40, rise: -40, life: 0.9 })
        streakShake = 0.5
      }
      streak = 0
      if (s) s.combo = 0
      setMood('dizzy', 1.4)
      jugTilt.kick(3)
      return
    }

    sliced++
    streak++
    streakPop.value = 1.35
    let step = 0
    if (s) {
      s.combo = stage.time - s.lastSliceAt < 0.5 ? s.combo + 1 : 1
      s.lastSliceAt = stage.time
      s.sliceX = f.x
      s.sliceY = f.y
      step = s.combo - 1
      if (s.combo >= 2) {
        fx.text(f.x, f.y - f.r - 10, `${s.combo}`, { color: '#fff06a', size: Math.min(96, 40 + s.combo * 10), life: 0.6, rise: 50 })
      }
      if (s.combo >= 3) fx.hitstop(s.combo >= 5 ? 50 : 32)
    }
    sliceSound(f.r, step)
    spray(f.x, f.y, angle, f.kind, f.r / 56)
    addSplat(f.x, f.y, f.kind.juice, f.r / 56)
    addJuice(f.kind.juice, f.bonus ? 0.34 : 1)
    if (f.r > 70) fx.shake(4, 0.15)
    if (jugMood !== 'dizzy' && jugMood !== 'wow') setMood('yum', 0.45)

    if (f.golden) {
      fx.text(f.x, f.y - 90, 'GOLD!', { color: '#ffe14d', size: 84, life: 1.2 })
      fx.confetti(f.x, f.y, 50)
      fx.burst(f.x, f.y, { count: 24, color: ['#ffe14d', '#ffffff'], shape: 'star', speed: 700, life: 1, size: 20 })
      fx.flash('#fff2a0', 0.4, 0.25)
      fx.hitstop(70)
      fx.shake(8)
      for (let i = 0; i < 5; i++) sfx.tone({ freq: sfx.scale(4 + i * 2), dur: 0.3, type: 'sine', vol: 0.18, delay: i * 0.06 })
      addJuice('#ffd21f', 3)
      showerFrom(f.x, f.y, 8, false)
      setMood('wow', 1)
    }
    celebrateStreak()
  }

  const startGiant = () => {
    const hp = Math.min(26, 16 + level * 2)
    const g: Giant = { x: (W - 100) / 2, y: H + 240, r: level >= 2 ? 170 : 150, hp, maxHp: hp, stretch: spring(1, 210, 9), tilt: spring(0, 140, 6), scars: [], bornAt: stage.time }
    giant = g
    stage.tween(0.95, (t) => (g.y = H + 240 - t * (H + 240 - 385)), ease.outBack)
    sfx.slideUp()
    sfx.boing(-4)
    stage.after(0.5, () => {
      g.stretch.value = 1.25
      sfx.thud(1.2)
      fx.shake(6)
    })
    setMood('wow', 1.5)
  }

  const burstGiant = (g: Giant, angle: number) => {
    giant = null
    splitInto(MELON, g.x, g.y, 0, -200, g.r, 0, angle, false, 330)
    for (let i = 0; i < 4; i++) addSplat(g.x + rnd(-130, 130), g.y + rnd(-110, 110), i % 2 ? '#ff3b5c' : '#ff6f86', rnd(1.5, 2.3))
    fx.burst(g.x, g.y, { count: 60, color: ['#ff3b5c', '#ff6f86', '#ffd0d8'], speed: 1000, life: 0.9, size: 18, gravity: 1200 })
    fx.burst(g.x, g.y, { count: 22, color: ['#1f8a3b', '#2fa84a'], speed: 800, life: 0.9, size: 20, gravity: 1200, shape: 'square' })
    fx.burst(g.x, g.y, { count: 16, color: '#3a1420', speed: 700, life: 0.9, size: 8, gravity: 900 })
    fx.ring(g.x, g.y, '#ffffff', 420, 0.5)
    fx.confetti(g.x, g.y, 70)
    fx.flash('#ffd0d8', 0.55, 0.25)
    fx.shake(22, 0.5)
    fx.hitstop(120)
    fx.text(g.x, g.y - 60, 'SPLAT!', { color: '#ffffff', size: 120, life: 1.4, rise: 40, outline: '#b3123a' })
    sfx.thud(2)
    sfx.noise({ dur: 0.5, freq: 3000, to: 200, vol: 0.4, filter: 'lowpass' })
    stage.after(0.15, () => sfx.fanfare())
    showerFrom(g.x, g.y, 12 + Math.min(level, 4), level >= 2)
    addJuice('#ff3b5c', 2)
    setMood('wow', 1.6)
    jugStretch.kick(6)
    level++
    eventPending = false
    lastEventEnd = stage.time
    nextWaveAt = stage.time + 2.8
  }

  const hitGiant = (g: Giant, angle: number, x: number, y: number) => {
    lastTouchAt = stage.time
    g.hp--
    const done = g.maxHp - g.hp
    const nx = -Math.sin(angle)
    const ny = Math.cos(angle)
    g.scars.push({ a: angle, off: clamp((x - g.x) * nx + (y - g.y) * ny, -g.r * 0.8, g.r * 0.8) })
    g.stretch.value = 0.84
    g.stretch.kick(-1)
    g.tilt.kick(rnd(-2.5, 2.5))
    if (g.hp <= 0) {
      burstGiant(g, angle)
      return
    }
    fx.burst(x, y, { count: 9, color: ['#ff3b5c', '#ff6f86', '#ffd0d8'], speed: 700, angle, spread: 0.7, life: 0.5, size: 13, gravity: 1100 })
    fx.burst(x, y, { count: 4, color: '#2fa84a', speed: 420, life: 0.5, size: 12, gravity: 1100, shape: 'square' })
    fx.shake(3 + (done / g.maxHp) * 6, 0.14)
    sfx.noise({ dur: 0.12, freq: 2400, to: 400, vol: 0.2, filter: 'lowpass' })
    sfx.tone({ freq: 150 * rnd(0.95, 1.05), to: 70, dur: 0.1, type: 'sine', vol: 0.22 })
    sfx.note(done - 3, 0.14, 'triangle', 0.17)
  }

  const startFrenzy = () => {
    frenzy = true
    frenzyUntil = stage.time + 7 + Math.min(level, 4)
    frenzyNextAt = stage.time + 0.5
    fx.text((W - 100) / 2, 330, 'FRENZY!', { color: '#ffe14d', size: 130, life: 1.5, rise: 40, outline: '#c2410c' })
    fx.flash('#ffe14d', 0.4, 0.3)
    fx.shake(10, 0.4)
    fx.confetti(W / 2, 300, 50)
    sfx.fanfare()
    setMood('wow', 1.5)
  }

  const triggerEvent = () => {
    eventPending = true
    draining = true
    setMood('yum', 1)
    jugStretch.value = 0.72
    jugStretch.kick(4)
    sfx.slideDown()
    for (let i = 0; i < 5; i++) sfx.tone({ freq: 300 + i * 70, to: 500 + i * 70, dur: 0.07, type: 'sine', vol: 0.12, delay: 0.1 + i * 0.09 })
    fx.text(JUG_X - 40, JUG_BASE - 230, 'SLURP!', { color: '#ffffff', size: 52, life: 1 })
    fx.burst(JUG_X, JUG_BASE - 170, { count: 14, color: ['#ffffff', '#ffe14d', '#ff7ac8'], shape: 'star', speed: 420, life: 0.8, size: 15, angle: -Math.PI / 2, spread: 2 })
    stage.tween(
      0.9,
      (t) => (drain = 1 - t),
      ease.inOutQuad,
      () => {
        layers.length = 0
        jugAmt = 0
        drain = 1
        draining = false
      },
    )
    stage.after(0.85, () => {
      if (level % 2 === 0) startGiant()
      else startFrenzy()
    })
  }

  // Two fruit already in the air, so the very first frame is inviting.
  launch(FRUITS[0]!, 430, 250, 60)
  launch(MELON, 700, 300, -50)
  for (const f of fruits) {
    for (let i = 0; i < 38; i++) {
      f.vy += f.g / 60
      f.x += f.vx / 60
      f.y += f.vy / 60
    }
  }

  const sliceable = (f: Fruit) => stage.time >= f.safeUntil

  return {
    update(dt) {
      const time = stage.time
      streakPop.update(dt)
      bestPop.update(dt)
      jugStretch.update(dt)
      jugTilt.update(dt)
      streakShake = Math.max(0, streakShake - dt)
      if (time > moodUntil) jugMood = jugAmt / cap() > 0.85 && !draining ? 'wow' : 'happy'
      frenzyGlow = damp(frenzyGlow, frenzy ? 1 : 0, 5, dt)

      // Fruit.
      for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i]!
        f.vy += f.g * dt
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.rot += f.spin * dt
        if (f.vy > 0 && f.y > H + f.r + 80) {
          fruits.splice(i, 1)
          continue
        }
        if ((f.x < f.r && f.vx < 0) || (f.x > W - f.r && f.vx > 0)) f.vx *= frenzy ? 1 : -0.6
        if ((f.golden || f.yuck) && time > f.puffAt) {
          f.puffAt = time + (f.golden ? 0.07 : 0.22)
          if (f.golden) fx.burst(f.x + rnd(-30, 30), f.y + rnd(-30, 30), { count: 1, color: ['#ffe14d', '#ffffff'], shape: 'star', speed: 60, life: 0.5, size: 14, gravity: 80 })
          else fx.burst(f.x + rnd(-20, 20), f.y - f.r * 0.6, { count: 1, color: '#b6e04a', shape: 'ring', speed: 40, life: 0.8, size: 14, gravity: -140, angle: -Math.PI / 2, spread: 1 })
        }
      }
      // A finger resting where a fruit flies through still cuts it.
      for (const p of stage.pointers.values()) {
        const s = strokes.get(p.id)
        if (!s) continue
        for (let i = fruits.length - 1; i >= 0; i--) {
          const f = fruits[i]
          if (f && sliceable(f) && dist(f.x, f.y, p.x, p.y) < f.r * 0.7) {
            const angle = Math.atan2(f.vy, f.vx) + Math.PI / 2
            slash(f, angle)
            slice(f, angle, s)
          }
        }
      }
      for (let i = halves.length - 1; i >= 0; i--) {
        const h = halves[i]!
        h.vy += 1500 * dt
        h.x += h.vx * dt
        h.y += h.vy * dt
        h.rot += h.spin * dt
        if (h.y > H + h.r + 120) halves.splice(i, 1)
      }
      for (let i = splats.length - 1; i >= 0; i--) {
        const s = splats[i]!
        s.age += dt
        if (s.age > s.life) splats.splice(i, 1)
      }
      for (let i = trails.length - 1; i >= 0; i--) {
        const trail = trails[i]!
        while (trail.pts.length > 0 && time - trail.pts[0]!.t > TRAIL_LIFE) trail.pts.shift()
        if (!trail.live && trail.pts.length === 0) trails.splice(i, 1)
      }
      for (const s of strokes.values()) if (s.combo > 0 && time - s.lastSliceAt > 0.5) endCombo(s)

      // The giant melon bobs and wobbles until it is hacked open.
      const g = giant
      if (g) {
        g.stretch.update(dt)
        g.tilt.update(dt)
      }

      // The glass looks at the finger, or at the highest fruit.
      let tx = JUG_X - 300
      let ty = JUG_BASE - 300
      const finger = stage.pointers.values().next().value
      if (finger) {
        tx = finger.x
        ty = finger.y
      } else if (g) {
        tx = g.x
        ty = g.y
      } else {
        let top = H
        for (const f of fruits) {
          if (f.y < top) {
            top = f.y
            tx = f.x
            ty = f.y
          }
        }
      }
      lookX = damp(lookX, clamp((tx - JUG_X) / 420, -1, 1), 9, dt)
      lookY = damp(lookY, clamp((ty - (JUG_BASE - 90)) / 320, -1, 1), 9, dt)

      // Director.
      if (frenzy) {
        if (time >= frenzyUntil) {
          frenzy = false
          level++
          eventPending = false
          lastEventEnd = time
          nextWaveAt = time + 1.6
          sfx.win()
          fx.text((W - 100) / 2, 330, 'PHEW!', { color: '#ffffff', size: 70 })
        } else if (time >= frenzyNextAt) {
          frenzyNextAt = time + Math.max(0.11, 0.17 - level * 0.01)
          frenzySide = -frenzySide
          const left = frenzySide < 0
          const kind = FRUITS[rndInt(0, FRUITS.length - 1)]!
          makeFruit(kind, left ? -60 : W + 60, rnd(470, 700), (left ? 1 : -1) * rnd(380, 700), -rnd(400, 650), { bonus: true, g: 640 })
          if (Math.random() < 0.3) sfx.tone({ freq: 200 * rnd(0.9, 1.3), to: 420, dur: 0.08, type: 'sine', vol: 0.06 })
        }
      } else if (!g && !eventPending) {
        if (jugAmt >= cap() || time - lastEventEnd > 40) triggerEvent()
        else {
          if (fruits.length === 0 && nextWaveAt - time > 0.35) nextWaveAt = time + 0.35
          if (time >= nextWaveAt) spawnWave()
        }
      }
    },

    draw(g) {
      const time = stage.time
      g.drawImage(art.backdrop, 0, 0)

      // Splats stay on the wall, drip, and fade.
      for (const s of splats) {
        const fade = Math.min(1, (s.life - s.age) / 3)
        const pop = s.age < 0.14 ? ease.outBack(s.age / 0.14) : 1
        g.globalAlpha = 0.88 * fade
        g.strokeStyle = s.color
        const run = ease.outCubic(Math.min(1, s.age / 3.5))
        for (const d of s.drips) {
          g.lineWidth = d.w
          g.beginPath()
          g.moveTo(s.x + d.dx, s.y + 10)
          g.lineTo(s.x + d.dx, s.y + 10 + d.len * run)
          g.stroke()
          g.fillStyle = s.color
          g.beginPath()
          g.arc(s.x + d.dx, s.y + 12 + d.len * run, d.w * 0.78, 0, TAU)
          g.fill()
        }
        const img = art.splat(s.shape, s.color)
        const size = 280 * 0.62 * s.scale * pop
        g.save()
        g.translate(s.x, s.y)
        g.rotate(s.rot)
        g.drawImage(img, -size / 2, -size / 2, size, size)
        g.restore()
      }
      g.globalAlpha = 1
      if (frenzyGlow > 0.01) {
        g.fillStyle = `rgba(255,170,30,${(0.13 + Math.sin(time * 9) * 0.04) * frenzyGlow})`
        g.fillRect(0, 0, W, H)
      }
      g.drawImage(art.awning, 0, 0)

      // Halves tumble away behind the crates.
      for (const h of halves) {
        const R = h.r * 1.3
        g.save()
        g.translate(h.x, h.y)
        g.rotate(h.rot)
        g.save()
        g.beginPath()
        if (h.side > 0) g.rect(-R, 0, R * 2, R)
        else g.rect(-R, -R, R * 2, R)
        g.clip()
        g.rotate(h.rot0)
        art.drawWhole(g, h.kind, h.r)
        g.restore()
        art.drawCutFace(g, h.kind, h.r)
        g.restore()
      }

      for (const f of fruits) {
        g.fillStyle = 'rgba(0,20,30,0.2)'
        g.beginPath()
        g.ellipse(f.x + 16, f.y + 22, f.r * 0.92, f.r * 0.92, 0, 0, TAU)
        g.fill()
        if (f.golden) {
          star(g, f.x, f.y, f.r * 1.75, 'rgba(255,240,150,0.3)', time * 1.6)
          star(g, f.x, f.y, f.r * 1.45, 'rgba(255,255,220,0.35)', -time * 2.2)
        }
        g.save()
        g.translate(f.x, f.y)
        g.rotate(f.rot)
        art.drawWhole(g, f.kind, f.r)
        if (f.yuck) face(g, 0, f.kind === SOCK ? -f.r * 0.1 : -f.r * 0.12, f.r * 0.17, 'grumpy', 0, 0, blinkAt(time, f.seed))
        g.restore()
        if (f.kind === SOCK) {
          // Stink lines.
          g.strokeStyle = 'rgba(190,235,80,0.85)'
          g.lineWidth = 5
          for (let i = -1; i <= 1; i++) {
            g.beginPath()
            for (let k = 0; k <= 6; k++) {
              const yy = f.y - f.r - 8 - k * 7
              const xx = f.x + i * 26 + Math.sin(k * 1.1 + time * 7 + i) * 6
              if (k === 0) g.moveTo(xx, yy)
              else g.lineTo(xx, yy)
            }
            g.stroke()
          }
        }
      }

      const big = giant
      if (big) {
        const bob = Math.sin((time - big.bornAt) * 2.2) * 10
        const danger = 1 - big.hp / big.maxHp
        const jitter = danger > 0.6 ? Math.sin(time * 40) * (danger - 0.6) * 0.08 : 0
        g.fillStyle = 'rgba(0,20,30,0.22)'
        g.beginPath()
        g.ellipse(big.x + 26, big.y + bob + 34, big.r, big.r, 0, 0, TAU)
        g.fill()
        const s = big.stretch.value
        g.save()
        g.translate(big.x, big.y + bob)
        g.rotate(big.tilt.value * 0.12 + jitter)
        g.scale(1 / Math.sqrt(Math.max(0.3, s)), s)
        art.drawWhole(g, MELON, big.r)
        g.beginPath()
        g.arc(0, 0, big.r - 2, 0, TAU)
        g.clip()
        for (const scar of big.scars) {
          const c = Math.cos(scar.a)
          const sn = Math.sin(scar.a)
          const ox = -sn * scar.off
          const oy = c * scar.off
          g.beginPath()
          g.moveTo(ox - c * big.r * 1.2, oy - sn * big.r * 1.2)
          g.lineTo(ox + c * big.r * 1.2, oy + sn * big.r * 1.2)
          g.strokeStyle = '#e4f7cc'
          g.lineWidth = 19
          g.stroke()
          g.strokeStyle = '#ff4560'
          g.lineWidth = 12
          g.stroke()
          g.strokeStyle = '#ff8fa3'
          g.lineWidth = 3
          g.stroke()
        }
        g.restore()
      }

      g.drawImage(art.front, 0, H - art.front.height)
      art.drawJug(g, {
        x: JUG_X,
        baseY: JUG_BASE,
        layers,
        cap: cap(),
        drain,
        stretch: jugStretch.value * (1 + Math.sin(time * 2.4) * 0.015),
        tilt: jugTilt.value * 0.15,
        mood: jugMood,
        lookX,
        lookY,
        blink: blinkAt(time, 2),
        time,
      })

      // Blade trails: a wide glow and a white core that taper as they age.
      for (const trail of trails) {
        const pts = trail.pts
        if (pts.length < 2) continue
        for (let pass = 0; pass < 2; pass++) {
          g.strokeStyle = pass === 0 ? (frenzyGlow > 0.5 ? `hsla(${(time * 500) % 360},100%,65%,0.75)` : 'rgba(120,235,255,0.6)') : '#ffffff'
          for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1]!
            const b = pts[i]!
            const k = 1 - (time - b.t) / TRAIL_LIFE
            if (k <= 0) continue
            g.lineWidth = (pass === 0 ? 30 : 12) * k
            g.beginPath()
            g.moveTo(a.x, a.y)
            g.lineTo(b.x, b.y)
            g.stroke()
          }
        }
      }

      // Streak and best combo, up on the awning.
      const sx = streakShake > 0 ? Math.sin(time * 70) * 8 * streakShake : 0
      rrect(g, 22 + sx, 14, 158, 58, 29, 'rgba(40,16,30,0.72)', 'rgba(255,255,255,0.9)', 3)
      sprite(g, '🔥', 56 + sx, 42, 36 * (streak > 0 ? 1 + Math.sin(time * 8) * 0.06 : 0.85))
      label(g, `${streak}`, 122 + sx, 45, 40 * streakPop.value, streak >= 10 ? '#ffe14d' : '#ffffff')
      if (bestCombo >= 3) {
        rrect(g, 196, 14, 150, 58, 29, 'rgba(40,16,30,0.72)', 'rgba(255,255,255,0.9)', 3)
        sprite(g, '⚡', 228, 43, 34)
        label(g, `x${bestCombo}`, 290, 45, 38 * bestPop.value, '#fff06a')
      }

      // Idle hint: a hand sweeps a blade across the middle, or across the melon.
      if (time - lastTouchAt > (touched ? 5 : 3.2)) {
        const cx = big ? big.x : (W - 100) / 2
        const cy = big ? big.y : 400
        const t = (time % 1.7) / 1.7
        const k = ease.inOutQuad(clamp(t / 0.6, 0, 1))
        const ax = cx - 230
        const ay = cy + 110
        const hx = ax + 460 * k
        const hy = ay - 220 * k
        g.globalAlpha = t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.25) : 1
        g.strokeStyle = 'rgba(120,235,255,0.6)'
        g.lineWidth = 22
        g.beginPath()
        g.moveTo(ax + 460 * k * 0.35, ay - 220 * k * 0.35)
        g.lineTo(hx, hy)
        g.stroke()
        g.strokeStyle = '#ffffff'
        g.lineWidth = 8
        g.stroke()
        sprite(g, '👆', hx + 14, hy + 44, 96)
        g.globalAlpha = 1
      }
    },

    down(p: Pointer) {
      touched = true
      lastTouchAt = stage.time
      const trail: Trail = { pts: [{ x: p.x, y: p.y, t: stage.time }], live: true }
      trails.push(trail)
      const s: Stroke = { x: p.x, y: p.y, combo: 0, lastSliceAt: -9, sliceX: p.x, sliceY: p.y, melonDist: 0, melonAt: -9, swooshAt: -9, sparkDist: 0, trail }
      strokes.set(p.id, s)
      let hit = false
      for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i]
        if (f && sliceable(f) && dist(f.x, f.y, p.x, p.y) < f.r + 30) {
          const angle = rnd(-0.7, 0.7) + (Math.random() < 0.5 ? Math.PI : 0)
          slash(f, angle)
          slice(f, angle, s)
          hit = true
        }
      }
      const big = giant
      if (big && dist(big.x, big.y, p.x, p.y) < big.r + 20) {
        hitGiant(big, rnd(-0.8, 0.8), p.x, p.y)
        hit = true
      }
      if (!hit && Math.abs(p.x - JUG_X) < 80 && p.y > JUG_BASE - 210) {
        jugStretch.value = 0.7
        jugStretch.kick(5)
        jugTilt.kick(rnd(-3, 3))
        setMood('wow', 0.6)
        sfx.boing(rndInt(0, 3))
        fx.burst(JUG_X, JUG_BASE - 160, { count: 8, color: ['#ffffff', '#ff7ac8'], shape: 'heart', speed: 300, life: 0.7, size: 16, angle: -Math.PI / 2, spread: 1.6 })
        hit = true
      }
      if (!hit) {
        fx.ring(p.x, p.y, '#bff4ff', 50, 0.3)
        fx.burst(p.x, p.y, { count: 6, color: ['#ffffff', '#bff4ff'], shape: 'spark', speed: 300, life: 0.3, size: 9, gravity: 0 })
        sfx.tone({ freq: rnd(760, 920), to: 1500, dur: 0.07, type: 'sine', vol: 0.13 })
        sfx.noise({ dur: 0.05, freq: 4200, vol: 0.06, filter: 'highpass' })
      }
    },

    move(p: Pointer) {
      const s = strokes.get(p.id)
      if (!s) return
      const x0 = s.x
      const y0 = s.y
      const len = Math.hypot(p.x - x0, p.y - y0)
      if (len < 1.5) return
      s.x = p.x
      s.y = p.y
      lastTouchAt = stage.time
      s.trail.pts.push({ x: p.x, y: p.y, t: stage.time })
      if (s.trail.pts.length > 40) s.trail.pts.shift()
      const angle = Math.atan2(p.y - y0, p.x - x0)

      for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i]
        if (f && sliceable(f) && segDist(f.x, f.y, x0, y0, p.x, p.y) < f.r + 24) slice(f, angle, s)
      }
      const big = giant
      if (big && segDist(big.x, big.y, x0, y0, p.x, p.y) < big.r + 16) {
        s.melonDist += len
        if (s.melonDist >= 90 && stage.time - s.melonAt > 0.08) {
          s.melonDist = 0
          s.melonAt = stage.time
          hitGiant(big, angle, p.x, p.y)
        }
      }

      const speed = Math.hypot(p.vx, p.vy)
      if (speed > 1100 && stage.time - s.swooshAt > 0.24) {
        s.swooshAt = stage.time
        sfx.noise({ dur: 0.16, freq: 900 * rnd(0.8, 1.3), to: 3600, vol: 0.09, q: 0.9 })
      }
      s.sparkDist += len
      if (s.sparkDist > 70) {
        s.sparkDist = 0
        fx.burst(p.x, p.y, { count: 1, color: ['#ffffff', '#bff4ff'], shape: 'spark', speed: 120, life: 0.3, size: 8, gravity: 0 })
      }
    },

    up(p: Pointer) {
      const s = strokes.get(p.id)
      if (!s) return
      // Let a combo that is still inside its window finish on its own clock.
      if (s.combo >= 3) stage.after(0.18, () => endCombo(s))
      s.trail.live = false
      strokes.delete(p.id)
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'fruit-slicer',
    name: 'Fruit Slicer',
    emoji: '🍉',
    ages: [4, 9],
    pitch: 'Swipe through flying fruit to slice it; fill the smoothie glass to set off a giant watermelon and a fruit frenzy.',
    howTo: 'Swipe across the fruit. Cut several in one swipe for a combo. Leave the sock and the cactus alone.',
    basedOn: 'Fruit Ninja (1B downloads)',
    whyFun: 'Swipe to slice is an evergreen one-finger verb: every cut splits, sprays and splats, combos climb a scale, and marks stay on the wall.',
  },
  create,
}
