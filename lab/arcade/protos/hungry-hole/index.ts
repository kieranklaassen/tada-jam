// Hungry Hole: drag a hole around a picnic park. Anything that fits tips in
// with a bloop and the hole grows; each size-up zooms the view out a step, and
// eating the big top at the end makes the hole swallow the whole park and burp
// it back out as a fountain.

import { blinkAt, ellipse, eyes, hint, label, rrect, sprite } from '../../kit/draw.ts'
import { clamp, damp, ease, lerp, rnd, spring, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { buildPark, GEM, K, NEXT, PLAZA, POND, R, ROAD, SAND, START, TOP, WH, WW, Z } from './world.ts'
import type { Cue, Item, Park } from './world.ts'

interface Palette {
  grass: string
  dark: string
  light: string
  hedge: string
  path: string
  edge: string
  water: string
  shore: string
  tuft: string
  flowers: [string, string, string]
}

const PALETTES: Palette[] = [
  { grass: '#7ecf62', dark: '#6cc153', light: '#95de77', hedge: '#4b9a43', path: '#f2dfae', edge: '#d8c086', water: '#58c4f0', shore: '#e9dba5', tuft: '#57ad49', flowers: ['#ffffff', '#ffe14d', '#ff9ecb'] },
  { grass: '#dcbf58', dark: '#cbab44', light: '#ebd57b', hedge: '#a8842e', path: '#f6e7c4', edge: '#d8be8b', water: '#5ab6dc', shore: '#efe0b4', tuft: '#b58f31', flowers: ['#ff8a3d', '#e0532f', '#fff1c9'] },
  { grass: '#eaf3fb', dark: '#d7e5f2', light: '#ffffff', hedge: '#b5cade', path: '#c8d5e3', edge: '#aebfd1', water: '#a9def5', shore: '#ffffff', tuft: '#c0d2e5', flowers: ['#ffffff', '#cfe6ff', '#ffd7ea'] },
]

interface Flyer {
  e: string
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  size: number
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  let round = 0
  let park: Park = buildPark(stage.rand, round)
  let pal = PALETTES[0]!
  let level = 0
  let xp = 0
  let eaten = 0
  let alive = park.items.length
  let mode: 'play' | 'gulp' | 'burp' = 'play'
  let modeT = 0
  let burped = false
  let swallowed: string[] = []
  const flyers: Flyer[] = []
  let flyQueue: string[] = []
  let flyEvery = 0.03
  let flyT = 0
  let flyStep = 0
  let flyTotal = 0
  let gems = 0

  const hole = { x: START.x, y: START.y, tx: START.x, ty: START.y, vx: 0, vy: 0 }
  const rad = spring(R[0], 150, 11)
  const gulp = spring(1, 320, 10)
  const zoom = spring(Z[0] * 0.72, 40, 10.5)
  zoom.target = Z[0]
  const cam = { x: START.x, y: START.y }
  const meter = spring(1, 260, 9)


  let active: Pointer | null = null
  let homing = 0
  let lastTouchAt = 0
  let touched = false
  let streak = 0
  let lastEatAt = -10
  let lastBloopAt = -10
  let lastTeeterAt = -10
  let lastTickAt = -10
  let lastCueAt = -10
  let yumT = 0
  let wowT = 0
  let lookX = 0
  let lookY = 0
  let target: Item | null = null
  let targetT = 0
  let lostT = 0

  // ---- cached art -------------------------------------------------------
  const mottle = document.createElement('canvas')
  mottle.width = Math.round(WW / 4)
  mottle.height = Math.round(WH / 4)
  const paintMottle = () => {
    const c = mottle.getContext('2d')
    if (!c) return
    c.clearRect(0, 0, mottle.width, mottle.height)
    // Mowing stripes, then soft light and dark patches.
    c.save()
    c.rotate(-0.32)
    c.fillStyle = pal.light
    c.globalAlpha = 0.28
    for (let x = -400; x < mottle.width + 400; x += 76) c.fillRect(x, -200, 38, mottle.height + 700)
    c.restore()
    for (let i = 0; i < 150; i++) {
      c.globalAlpha = 0.16
      c.fillStyle = i % 2 ? pal.dark : pal.light
      c.beginPath()
      c.ellipse(Math.random() * mottle.width, Math.random() * mottle.height, rnd(14, 46), rnd(8, 22), rnd(-0.4, 0.4), 0, TAU)
      c.fill()
    }
    c.globalAlpha = 1
  }
  paintMottle()

  const blanket = document.createElement('canvas')
  blanket.width = 180
  blanket.height = 120
  {
    const c = blanket.getContext('2d')
    if (c) {
      c.fillStyle = '#fff7ef'
      c.fillRect(0, 0, 180, 120)
      c.fillStyle = 'rgba(232,64,74,0.55)'
      for (let x = 0; x < 180; x += 30) c.fillRect(x, 0, 15, 120)
      for (let y = 0; y < 120; y += 30) c.fillRect(0, y, 180, 15)
      c.strokeStyle = '#e8404a'
      c.lineWidth = 6
      c.strokeRect(3, 3, 174, 114)
    }
  }
  const BLANKETS = [
    { x: START.x, y: START.y + 6, rot: -0.06, w: 470, h: 250, tint: 0 },
    { x: 760, y: 1120, rot: 0.2, w: 380, h: 210, tint: 1 },
    { x: 1990, y: 760, rot: -0.22, w: 400, h: 220, tint: 0 },
    { x: 1830, y: 1490, rot: 0.1, w: 360, h: 200, tint: 1 },
  ]

  // ---- helpers ----------------------------------------------------------
  const sx = (x: number) => (x - cam.x) * zoom.value + W / 2
  const sy = (y: number) => (y - cam.y) * zoom.value + H / 2
  const holeR = () => Math.max(8, rad.value)

  const clampCam = () => {
    const hw = W / 2 / zoom.value
    const hh = H / 2 / zoom.value
    cam.x = hw * 2 >= WW ? WW / 2 : clamp(cam.x, hw, WW - hw)
    cam.y = hh * 2 >= WH ? WH / 2 : clamp(cam.y, hh, WH - hh)
  }
  clampCam()

  const bloop = (tier: number) => {
    const f = 880 * 0.62 ** tier
    sfx.tone({ freq: f * 1.9, to: f, dur: 0.13, type: 'sine', vol: 0.3 })
    sfx.tone({ freq: f * 1.1, to: f * 2.3, dur: 0.08, type: 'sine', vol: 0.14, delay: 0.1 })
  }

  const cue = (c: Cue) => {
    switch (c) {
      case 'yelp':
        sfx.tone({ freq: 520, to: 900, dur: 0.11, type: 'triangle', vol: 0.26 })
        sfx.tone({ freq: 620, to: 1040, dur: 0.11, type: 'triangle', vol: 0.26, delay: 0.14 })
        break
      case 'squeak':
        sfx.tone({ freq: 1500, to: 2300, dur: 0.08, type: 'sine', vol: 0.2 })
        sfx.tone({ freq: 1700, to: 2500, dur: 0.07, type: 'sine', vol: 0.18, delay: 0.1 })
        break
      case 'quack':
        sfx.tone({ freq: 430, to: 340, dur: 0.1, type: 'sawtooth', vol: 0.13 })
        sfx.tone({ freq: 430, to: 320, dur: 0.12, type: 'sawtooth', vol: 0.13, delay: 0.14 })
        break
      case 'honk':
        sfx.tone({ freq: 392, dur: 0.11, type: 'square', vol: 0.11 })
        sfx.tone({ freq: 392, dur: 0.16, type: 'square', vol: 0.11, delay: 0.15 })
        break
      case 'siren':
        for (let i = 0; i < 4; i++) sfx.tone({ freq: i % 2 ? 660 : 880, dur: 0.12, type: 'triangle', vol: 0.18, delay: i * 0.12 })
        break
      case 'strum':
        for (let i = 0; i < 5; i++) sfx.tone({ freq: sfx.scale(i * 2 - 5), dur: 0.35, type: 'triangle', vol: 0.16, delay: i * 0.035 })
        break
      case 'bell':
        sfx.ding(5)
        sfx.tone({ freq: sfx.scale(5), dur: 0.2, type: 'sine', vol: 0.18, delay: 0.13 })
        break
      case 'leaf':
        sfx.noise({ dur: 0.35, vol: 0.22, freq: 5000, to: 1500, filter: 'highpass' })
        break
      case 'splash':
        sfx.splat()
        break
      case 'moo':
        sfx.tone({ freq: 170, to: 130, dur: 0.5, type: 'sawtooth', vol: 0.14, attack: 0.08 })
        break
      case 'meow':
        sfx.tone({ freq: 700, to: 1050, dur: 0.12, type: 'triangle', vol: 0.2 })
        sfx.tone({ freq: 1050, to: 620, dur: 0.22, type: 'triangle', vol: 0.2, delay: 0.12 })
        break
      case 'ribbit':
        sfx.tone({ freq: 180, to: 260, dur: 0.07, type: 'square', vol: 0.1 })
        sfx.tone({ freq: 200, to: 300, dur: 0.09, type: 'square', vol: 0.1, delay: 0.1 })
        break
      case 'boing':
        sfx.boing(2)
        break
      case 'jingle':
        for (let i = 0; i < 4; i++) sfx.tone({ freq: sfx.scale([4, 2, 4, 7][i]!), dur: 0.14, type: 'triangle', vol: 0.18, delay: i * 0.09 })
        break
    }
  }

  const startFall = (it: Item) => {
    it.state = 'fall'
    it.t = 0
    it.fromX = it.x
    it.fromY = it.y
    it.dur = mode === 'gulp' ? 0.5 : 0.36 + it.size * 0.0009
    const now = stage.time
    if (mode === 'play') {
      if (it.k.cue && now - lastCueAt > 0.12) {
        lastCueAt = now
        cue(it.k.cue)
      } else if (now - lastTickAt > 0.05) {
        lastTickAt = now
        sfx.tone({ freq: 1250 + Math.random() * 300, to: 900, dur: 0.04, type: 'sine', vol: 0.07 })
      }
      if (it.k.cry) fx.text(sx(it.x), sy(it.y - it.size * 0.9), it.k.cry, { color: '#ffffff', size: 34 + it.tier * 3, life: 0.9 })
      if (it.k.cue === 'leaf') fx.burst(sx(it.x), sy(it.y - it.size * 0.6), { count: 16, color: ['#3f9b45', '#6cc76a', '#2f7d3a'], speed: 300, life: 0.8, size: 10, gravity: 500 })
      if (it.k.cue === 'splash') fx.burst(sx(it.x), sy(it.y - it.size * 0.5), { count: 18, color: ['#58c4f0', '#d4f3ff'], speed: 360, life: 0.7, size: 9, gravity: 900 })
    }
  }

  const celebrate = () => {
    const x = sx(hole.x)
    const y = sy(hole.y)
    sfx.win()
    sfx.slideUp()
    fx.text(x, y - 110, level === TOP ? 'HUGE!' : 'BIGGER!', { color: '#fff3b0', size: 64, life: 1.2, rise: 90 })
    fx.confetti(x, y - 40, 36)
    fx.ring(x, y, '#fff3b0', 220, 0.6)
    fx.ring(x, y, '#ffffff', 340, 0.8)
    fx.shake(7)
    fx.flash('#ffffff', 0.22, 0.25)
    zoom.target = Z[level]!
    // A little zoom in first, so the zoom out has a wind-up.
    zoom.kick(0.9 * zoom.value)
    rad.kick(R[level]! * 5)
    meter.value = 1.5
    // Everything that just became food hops: "eat me next".
    for (const it of park.items) {
      if (it.state !== 'idle' || it.tier !== level) continue
      it.hop = 1
      it.hopDelay = 0.35 + Math.hypot(it.x - hole.x, it.y - hole.y) / 1600
    }
  }

  const startGulp = () => {
    mode = 'gulp'
    modeT = 0
    fx.hitstop(90)
    fx.shake(20, 0.6)
    fx.flash('#ffffff', 0.35, 0.3)
    fx.text(W / 2, H / 2 - 120, 'GULP!', { color: '#fff3b0', size: 96, life: 1.3, rise: 60 })
    sfx.crunch()
    sfx.thud(1)
    sfx.slideDown()
    for (const it of park.items) {
      if (it.state !== 'idle') continue
      it.delay = 0.3 + Math.hypot(it.x - hole.x, it.y - hole.y) / 1700
    }
  }

  const eat = (it: Item) => {
    it.state = 'gone'
    alive--
    eaten++
    swallowed.push(it.k.e)
    const now = stage.time
    const x = sx(hole.x)
    const y = sy(hole.y)
    const peer = it.tier === level
    gulp.value = peer ? 1.22 : 1.1
    yumT = 0.28
    if (now - lastBloopAt > 0.045) {
      lastBloopAt = now
      bloop(it.tier)
      if (mode === 'play') {
        streak = now - lastEatAt < 1.4 ? streak + 1 : 0
        if (streak > 0) sfx.note(Math.min(streak, 14), 0.09, 'triangle', 0.1)
      }
    }
    lastEatAt = now
    fx.burst(x, y - 6, { count: 5 + it.tier * 2, color: ['#c9955c', '#fff3b0', '#ffffff'], speed: 240 + it.tier * 50, angle: -Math.PI / 2, spread: 1.5, life: 0.5, size: 7 + it.tier, gravity: 900 })
    if (mode === 'play') {
      if (streak > 0 && streak % 5 === 0) fx.text(x, y - 90, `YUM x${streak}!`, { color: '#ffffff', size: 40 })
      if (peer && it.tier >= 2) {
        fx.shake(2 + it.tier * 1.6)
        sfx.thud(0.35 + it.tier * 0.13)
        fx.ring(x, y, '#ffffff', 80 + it.tier * 30, 0.35)
      }
      if (peer && it.tier >= 3) fx.hitstop(35)
      if (it.k.e === GEM) {
        gems++
        xp += 3
        fx.text(x, y - 120, `${GEM} SHINY!`, { color: '#bff4ff', size: 56, life: 1.3, rise: 90 })
        fx.burst(x, y - 20, { count: 26, color: ['#bff4ff', '#ffffff', '#7ad7ff'], speed: 520, life: 0.9, size: 12, shape: 'star' })
        fx.ring(x, y, '#bff4ff', 200, 0.5)
        for (let i = 0; i < 5; i++) sfx.tone({ freq: sfx.scale(6 + i * 2), dur: 0.16, type: 'sine', vol: 0.2, delay: i * 0.07 })
      }
      if (it.k.e === '🎪') {
        startGulp()
        return
      }
      xp += peer ? 1 : 0.34
      meter.kick(3)
      if (level < TOP && xp >= park.need[level]!) {
        xp = Math.max(0, xp - park.need[level]!) * 0.5
        level++
        streak = 0
        celebrate()
      }
    }
  }

  const newRound = () => {
    round++
    pal = PALETTES[round % PALETTES.length]!
    paintMottle()
    park = buildPark(stage.rand, round)
    alive = park.items.length
    level = 0
    xp = 0
    mode = 'play'
    modeT = 0
    burped = false
    swallowed = []
    target = null
    hole.tx = START.x
    hole.ty = START.y
    homing = 1
    zoom.target = Z[0]
    rad.target = R[0]
    sfx.whoosh()
  }

  // ---- items ------------------------------------------------------------
  const updateItem = (it: Item, dt: number, r: number) => {
    if (it.pop < 1) {
      if (it.delay > 0 && mode === 'play') {
        it.delay -= dt
        return
      }
      it.pop = Math.min(1, it.pop + dt / 0.45)
    }
    if (it.state === 'fall') {
      it.t += dt / it.dur
      const a = ease.outQuad(clamp(it.t / 0.5, 0, 1))
      it.x = lerp(it.fromX, hole.x, a)
      it.y = lerp(it.fromY, hole.y, a)
      if (it.t >= 1) eat(it)
      return
    }
    if (it.hop > 0) {
      if (it.hopDelay > 0) it.hopDelay -= dt
      else it.hop = Math.max(0, it.hop - dt / 0.45)
    }
    it.wob = Math.max(0, it.wob - dt * 2.4)
    it.lean = damp(it.lean, 0, 6, dt)

    const dx = hole.x - it.x
    const dy = (hole.y - it.y) / K
    const d = Math.hypot(dx, dy) || 1
    const edible = it.tier <= level

    if (mode === 'gulp') {
      it.delay -= dt
      // The big gulp drags everything toward the hole before it drops.
      it.x += (dx / d) * 260 * dt
      it.y += ((dy * K) / d) * 260 * dt
      it.wob = 1
      if (it.delay <= 0) startFall(it)
      return
    }
    if (mode !== 'play') return

    // Things with legs (and balls).
    const move = it.k.move
    if (move === 'swim') {
      it.phase += dt * 0.35
      const nx = POND.x + Math.cos(it.phase) * POND.rx * 0.56
      const ny = POND.y + Math.sin(it.phase) * POND.ry * 0.5
      it.flip = nx > it.x ? -1 : 1
      it.x = nx
      it.y = ny
    } else if (move === 'wander') {
      it.timer -= dt
      if (it.timer <= 0) {
        it.timer = rnd(0.8, 2.6)
        if (Math.random() < 0.4) {
          it.vx = 0
          it.vy = 0
        } else {
          const a = Math.atan2(it.homeY - it.y, it.homeX - it.x) + rnd(-1.3, 1.3)
          const v = it.size * rnd(0.35, 0.7)
          it.vx = Math.cos(a) * v
          it.vy = Math.sin(a) * v * K
        }
      }
      it.x += it.vx * dt
      it.y += it.vy * dt
      if (it.vx !== 0) {
        it.flip = it.vx > 0 ? -1 : 1
        if (it.hop <= 0 && it.tier > 0) it.hop = 0.6
      }
    } else if (move === 'flee') {
      const scared = edible && d < r + 250
      if (scared) {
        if (!it.alarmed) {
          it.alarmed = true
          fx.text(sx(it.x), sy(it.y - it.size), '❗', { size: 40, life: 0.6 })
          if (stage.time - lastCueAt > 0.2 && it.k.cue) {
            lastCueAt = stage.time
            cue(it.k.cue)
          }
        }
        const v = 150 + it.tier * 45
        it.vx = (-dx / d) * v
        it.vy = ((-dy * K) / d) * v
        if (it.hop <= 0) it.hop = 0.75
      } else {
        if (d > r + 480) it.alarmed = false
        it.vx = damp(it.vx, 0, 5, dt)
        it.vy = damp(it.vy, 0, 5, dt)
        it.timer -= dt
        if (it.timer <= 0) {
          it.timer = rnd(1.2, 3.5)
          it.hop = 1
          it.flip = -it.flip
        }
      }
      it.x += it.vx * dt
      it.y += it.vy * dt
      if (Math.abs(it.vx) > 20) it.flip = it.vx > 0 ? -1 : 1
    } else if (move === 'roll') {
      if (edible && d < r + it.s + 120) {
        it.vx -= (dx / d) * 1500 * dt
        it.vy -= ((dy * K) / d) * 1500 * dt
      }
      const v = Math.hypot(it.vx, it.vy)
      const max = 300 + it.tier * 40
      if (v > max) {
        it.vx *= max / v
        it.vy *= max / v
      }
      it.vx = damp(it.vx, 0, 1.3, dt)
      it.vy = damp(it.vy, 0, 1.3, dt)
      it.x += it.vx * dt
      it.y += it.vy * dt
      it.roll += (it.vx * dt) / (it.size * 0.4)
    }
    if (move && move !== 'swim') {
      const m = it.size * 0.5
      const nx = clamp(it.x, m, WW - m)
      const ny = clamp(it.y, it.size, ROAD.top - 20)
      if (nx !== it.x) it.vx = -it.vx * 0.6
      if (ny !== it.y) it.vy = -it.vy * 0.6
      it.x = nx
      it.y = ny
    }

    if (it.pop < 0.6) return
    if (edible) {
      if (d < r - it.s * 0.3 + 10) startFall(it)
      else if (d < r + it.s * 1.15) {
        // On the rim: it tips toward the hole and slides in.
        const pull = (move === 'roll' || move === 'flee' ? 40 : 150) * dt
        it.x += (dx / d) * pull
        it.y += ((dy * K) / d) * pull
        it.lean = damp(it.lean, clamp(dx / (r + it.s), -1, 1) * 0.4, 14, dt)
        it.wob = Math.max(it.wob, 0.5)
      }
    } else if (d < r + it.s * 0.75) {
      // Too big: it rocks on the rim, which says "come back bigger".
      if (it.wob < 0.35 && stage.time - lastTeeterAt > 0.3) {
        lastTeeterAt = stage.time
        sfx.tone({ freq: 210 * 0.8 ** it.tier, to: 300 * 0.8 ** it.tier, dur: 0.14, type: 'triangle', vol: 0.2 })
        sfx.tone({ freq: 300 * 0.8 ** it.tier, to: 200 * 0.8 ** it.tier, dur: 0.16, type: 'triangle', vol: 0.16, delay: 0.13 })
        fx.burst(sx(it.x), sy(it.y - it.size * 0.85), { count: 4, color: '#d4f3ff', speed: 190, angle: -Math.PI / 2, spread: 1.6, life: 0.45, size: 8, gravity: 700 })
        wowT = 0.6
      }
      it.wob = 1
      it.lean = damp(it.lean, clamp(dx / (r + it.s), -1, 1) * 0.16, 10, dt)
    }
  }

  const drawItem = (g: CanvasRenderingContext2D, it: Item, r: number, time: number) => {
    const size = it.size
    const edible = it.tier <= level
    let scale = it.pop < 1 ? Math.max(0, ease.outBack(it.pop)) : 1
    if (scale <= 0) return
    let rot = it.lean + Math.sin(time * 17 + it.phase) * it.wob * 0.11
    let sink = 0
    let squashY = 1
    let alpha = 1
    let hopY = 0
    let drop = 0
    if (it.state === 'fall') {
      const a = clamp(it.t / 0.5, 0, 1)
      drop = clamp((it.t - 0.4) / 0.6, 0, 1)
      // The final gulp swallows dozens at once: no clip there, so they shrink
      // away inside the rim instead of sinking behind it.
      sink = drop * drop * (mode === 'play' ? r * K + size * 0.8 : r * K * 0.4)
      scale *= 1 - (mode === 'play' ? 0.5 : 0.9) * drop
      rot += it.spin * (a * 0.4 + drop * drop * 1.7)
      if (drop > 0.75) alpha = 1 - (drop - 0.75) / 0.25
    } else {
      if (it.hop > 0 && it.hopDelay <= 0) {
        const h = Math.sin((1 - it.hop) * Math.PI)
        hopY = h * size * (it.k.move ? 0.16 : 0.3)
        squashY = 1 + h * 0.12
      } else if (edible && mode === 'play') {
        // Food wiggles; things that are still too big stand still.
        squashY = 1 + Math.sin(time * 4.2 + it.phase) * 0.045
      }
      // A big thing standing on or in front of the hole goes see-through.
      const ry = r * K
      if (!edible && it.y > hole.y - ry && hole.y + ry > it.y - size * 0.85 && Math.abs(hole.x - it.x) < size * 0.42 + r * 0.7) alpha = 0.5
    }
    if (it.state !== 'fall' || drop < 0.5) {
      const shade = it.state === 'fall' ? 1 - drop * 2 : 1
      g.fillStyle = `rgba(20,40,20,${0.2 * shade * alpha})`
      g.beginPath()
      g.ellipse(it.x, it.y + size * 0.03, size * 0.36 * scale * (1 - hopY / size), size * 0.13 * scale, 0, 0, TAU)
      g.fill()
    }
    g.save()
    if (drop > 0 && mode === 'play') {
      const rx = r * gulp.value
      const ry = (r * K) / gulp.value
      g.beginPath()
      g.rect(hole.x - 4000, hole.y - 8000, 8000, 8000)
      g.ellipse(hole.x, hole.y, rx, ry, 0, 0, TAU)
      g.clip()
    }
    if (alpha < 1) g.globalAlpha = alpha
    g.translate(it.x, it.y - hopY + sink)
    if (rot) g.rotate(rot)
    g.scale((scale * it.flip) / Math.sqrt(squashY), scale * squashY)
    if (it.roll) sprite(g, it.k.e, 0, -size * 0.42, size, it.roll * it.flip)
    else sprite(g, it.k.e, 0, -size * 0.42, size)
    g.restore()
  }

  // ---- ground -----------------------------------------------------------
  const drawGround = (g: CanvasRenderingContext2D, l: number, t: number, r: number, b: number, time: number) => {
    g.fillStyle = pal.hedge
    g.fillRect(l - 20, t - 20, r - l + 40, b - t + 40)
    g.fillStyle = pal.grass
    g.fillRect(0, 0, WW, WH)
    g.drawImage(mottle, 0, 0, WW, WH)

    // Paths and the big-top plaza.
    g.lineCap = 'round'
    for (let pass = 0; pass < 2; pass++) {
      g.strokeStyle = pass ? pal.path : pal.edge
      g.lineWidth = pass ? 84 : 104
      g.beginPath()
      g.moveTo(-60, 1260)
      g.quadraticCurveTo(620, 1010, PLAZA.x - 400, PLAZA.y + 90)
      g.moveTo(PLAZA.x + 400, PLAZA.y + 60)
      g.quadraticCurveTo(2300, 820, WW + 60, 560)
      g.moveTo(PLAZA.x + 230, PLAZA.y + 150)
      g.quadraticCurveTo(PLAZA.x + 460, 1330, PLAZA.x + 170, ROAD.top + 10)
      g.stroke()
      ellipse(g, PLAZA.x, PLAZA.y, PLAZA.rx + (pass ? 0 : 12), PLAZA.ry + (pass ? 0 : 9), pass ? pal.path : pal.edge)
    }
    ellipse(g, PLAZA.x, PLAZA.y, PLAZA.rx * 0.7, PLAZA.ry * 0.7, 'rgba(255,120,120,0.16)')

    // Sandpit.
    ellipse(g, SAND.x, SAND.y, SAND.rx + 14, SAND.ry + 10, '#c9a566')
    ellipse(g, SAND.x, SAND.y, SAND.rx, SAND.ry, '#f4dc9a')
    ellipse(g, SAND.x - 70, SAND.y - 40, SAND.rx * 0.5, SAND.ry * 0.4, 'rgba(255,255,255,0.22)')

    // Pond with slow ripples.
    ellipse(g, POND.x, POND.y, POND.rx + 22, POND.ry + 16, pal.shore)
    ellipse(g, POND.x, POND.y, POND.rx, POND.ry, pal.water)
    ellipse(g, POND.x - 60, POND.y - 40, POND.rx * 0.62, POND.ry * 0.5, 'rgba(255,255,255,0.18)')
    g.strokeStyle = 'rgba(255,255,255,0.55)'
    g.lineWidth = 4
    for (let i = 0; i < 3; i++) {
      const p = (time * 0.25 + i / 3) % 1
      g.globalAlpha = 1 - p
      g.beginPath()
      g.ellipse(POND.x + (i - 1) * 120, POND.y + (i % 2) * 50 - 20, 20 + p * 70, (20 + p * 70) * 0.5, 0, 0, TAU)
      g.stroke()
    }
    g.globalAlpha = 1
    ellipse(g, POND.x + 170, POND.y + 70, 34, 20, '#4fae58')
    ellipse(g, POND.x - 200, POND.y + 40, 28, 16, '#4fae58')

    // Road.
    g.fillStyle = '#c9ccd2'
    g.fillRect(0, ROAD.top - 12, WW, ROAD.bottom - ROAD.top + 24)
    g.fillStyle = '#6e727c'
    g.fillRect(0, ROAD.top, WW, ROAD.bottom - ROAD.top)
    g.fillStyle = '#ffffff'
    const mid = (ROAD.top + ROAD.bottom) / 2
    for (let x = 40 + Math.max(0, Math.floor((l - 40) / 170)) * 170; x < Math.min(WW, r); x += 170) g.fillRect(x, mid - 6, 90, 12)
    // Zebra crossing where the path meets the road.
    for (let y = ROAD.top + 14; y < ROAD.bottom - 20; y += 40) g.fillRect(PLAZA.x + 110, y, 130, 22)

    // Picnic blankets.
    for (const bl of BLANKETS) {
      if (bl.x + bl.w < l || bl.x - bl.w > r || bl.y + bl.h < t || bl.y - bl.h > b) continue
      g.save()
      g.translate(bl.x, bl.y)
      g.rotate(bl.rot)
      g.fillStyle = 'rgba(20,40,20,0.16)'
      g.fillRect(-bl.w / 2 + 8, -bl.h / 2 + 12, bl.w, bl.h)
      g.drawImage(blanket, -bl.w / 2, -bl.h / 2, bl.w, bl.h)
      if (bl.tint) {
        g.fillStyle = 'rgba(60,130,255,0.32)'
        g.fillRect(-bl.w / 2, -bl.h / 2, bl.w, bl.h)
      }
      g.restore()
    }

    // Grass tufts and flowers, only the ones in view.
    g.strokeStyle = pal.tuft
    g.lineWidth = 4
    g.beginPath()
    for (const tf of park.tufts) {
      if (tf.x < l || tf.x > r || tf.y < t || tf.y > b) continue
      g.moveTo(tf.x - 8, tf.y)
      g.lineTo(tf.x - 12, tf.y - 12)
      g.moveTo(tf.x, tf.y)
      g.lineTo(tf.x, tf.y - 17)
      g.moveTo(tf.x + 8, tf.y)
      g.lineTo(tf.x + 12, tf.y - 12)
    }
    g.stroke()
    for (let c = 0; c < 3; c++) {
      g.fillStyle = pal.flowers[c]!
      g.beginPath()
      for (const f of park.flowers) {
        if (f.c !== c || f.x < l || f.x > r || f.y < t || f.y > b) continue
        g.moveTo(f.x + 7, f.y)
        g.arc(f.x, f.y, 7, 0, TAU)
      }
      g.fill()
    }
    g.fillStyle = '#ffb02e'
    g.beginPath()
    for (const f of park.flowers) {
      if (f.x < l || f.x > r || f.y < t || f.y > b) continue
      g.moveTo(f.x + 3, f.y)
      g.arc(f.x, f.y, 3, 0, TAU)
    }
    g.fill()
  }

  const drawHole = (g: CanvasRenderingContext2D, r: number, time: number) => {
    const breathe = 1 + Math.sin(time * 2.6) * 0.025
    const rx = r * gulp.value * breathe
    const ry = ((r * K) / gulp.value) * breathe
    const x = hole.x
    const y = hole.y
    ellipse(g, x, y + ry * 0.1, rx * 1.16 + 4, ry * 1.2 + 4, 'rgba(40,30,10,0.22)')
    ellipse(g, x, y, rx * 1.1 + 3, ry * 1.12 + 3, '#8a5d36')
    ellipse(g, x, y - ry * 0.05, rx * 1.04 + 1, ry * 1.04 + 1, '#b9854f')
    ellipse(g, x, y, rx, ry, '#5a3570')
    ellipse(g, x, y + ry * 0.2, rx * 0.93, ry * 0.78, '#24122f')
    ellipse(g, x, y + ry * 0.34, rx * 0.78, ry * 0.58, '#0a0510')
    // Two eyes on the far rim, peeking out like a frog's.
    const wide = (wowT > 0 ? 1.25 : 1) + Math.max(0, yumT) * 0.9
    const er = r * 0.2 * wide
    const ey = y - ry - er * 0.45
    ellipse(g, x - er * 1.2, ey + er * 0.35, er * 1.3, er * 1.2, '#8a5d36')
    ellipse(g, x + er * 1.2, ey + er * 0.35, er * 1.3, er * 1.2, '#8a5d36')
    eyes(g, x, ey, er, lookX, lookY, blinkAt(time), 1.2)
  }

  const order: Item[] = []

  return {
    update(dt) {
      const now = stage.time
      const z = Math.max(0.3, zoom.update(dt))
      zoom.value = z
      gulp.update(dt)
      meter.update(dt)
      yumT -= dt
      wowT -= dt
      homing -= dt

      // The hole chases the finger with a little lag.
      if (active && !active.down) active = null
      if (active && homing <= 0) {
        hole.tx = clamp((active.x - W / 2) / z + cam.x, 0, WW)
        hole.ty = clamp((active.y - H / 2) / z + cam.y, 0, WH)
      }
      const k = 1 - Math.exp(-11 * dt)
      let mx = (hole.tx - hole.x) * k
      let my = (hole.ty - hole.y) * k
      const m = Math.hypot(mx, my)
      const maxStep = (1700 / z) * dt
      if (m > maxStep) {
        mx *= maxStep / m
        my *= maxStep / m
      }
      hole.x += mx
      hole.y += my
      hole.vx = mx / dt
      hole.vy = my / dt

      // Size: grows a little with every bite, and jumps on a level-up.
      if (mode === 'burp') {
        // Swollen and rumbling, then it shrinks as everything flies back out.
        if (!burped) rad.target = R[TOP] * 1.12
        else rad.target = lerp(R[0] * 3, R[TOP] * 0.9, flyTotal > 0 ? flyQueue.length / flyTotal : 0)
      } else if (level < TOP) rad.target = R[level]! + 0.35 * (R[level + 1]! - R[level]!) * Math.min(1, xp / park.need[level]!)
      else rad.target = R[TOP]
      rad.update(dt)
      const r = holeR()
      hole.x = clamp(hole.x, r * 0.6, WW - r * 0.6)
      hole.y = clamp(hole.y, r * 0.5, WH - r * 0.4)

      cam.x = damp(cam.x, hole.x, 2.2, dt)
      cam.y = damp(cam.y, hole.y, 2.2, dt)
      clampCam()

      for (const it of park.items) if (it.state !== 'gone') updateItem(it, dt, r)

      // Eyes: follow the motion, else watch the nearest snack.
      let wantX = 0
      let wantY = 0
      const speed = Math.hypot(hole.vx, hole.vy)
      if (speed > 40) {
        wantX = hole.vx / speed
        wantY = hole.vy / speed
      } else if (target && target.state === 'idle') {
        const d = Math.hypot(target.x - hole.x, target.y - hole.y) || 1
        wantX = (target.x - hole.x) / d
        wantY = (target.y - hole.y) / d
      }
      if (wowT > 0) wantY = -0.6
      lookX = damp(lookX, wantX, 10, dt)
      lookY = damp(lookY, wantY, 10, dt)

      // Nearest thing the hole can eat, for the hint and the edge arrow.
      targetT -= dt
      if (targetT <= 0) {
        targetT = 0.25
        target = null
        let best = Infinity
        for (const it of park.items) {
          if (it.state !== 'idle' || it.tier > level || it.pop < 1) continue
          // Prefer the newest size: it is what grows the hole fastest.
          const d = Math.hypot(it.x - hole.x, (it.y - hole.y) / K) * (it.tier === level ? 1 : 2.2)
          if (d < best) {
            best = d
            target = it
          }
        }
      }
      if (target && mode === 'play') {
        const tx = sx(target.x)
        const ty = sy(target.y)
        lostT = tx < 30 || tx > W - 30 || ty < 90 || ty > H - 60 ? lostT + dt : 0
      } else lostT = 0

      // The ending: swallow the park, rumble, burp it all back out.
      if (mode === 'gulp') {
        modeT += dt
        if (alive <= 0) {
          mode = 'burp'
          modeT = 0
          burped = false
          sfx.tone({ freq: 70, to: 110, dur: 0.8, type: 'sawtooth', vol: 0.16, attack: 0.2 })
        }
      } else if (mode === 'burp') {
        modeT += dt
        if (!burped) {
          fx.shake(4, 0.12)
          gulp.value = 1 + Math.sin(now * 40) * 0.06
          if (modeT > 0.8) {
            burped = true
            flyQueue = swallowed.slice(-90)
            flyTotal = flyQueue.length
            flyEvery = 1.7 / Math.max(1, flyQueue.length)
            flyT = 0
            flyStep = 0
            gulp.value = 1.5
            sfx.tone({ freq: 160, to: 60, dur: 0.5, type: 'sawtooth', vol: 0.22 })
            sfx.fanfare()
            fx.flash('#fff3b0', 0.35, 0.3)
            fx.shake(16, 0.5)
            fx.text(W / 2, H / 2 - 150, 'BURP!', { color: '#fff3b0', size: 110, life: 1.6, rise: 70 })
            fx.confetti(W * 0.3, H * 0.3, 50)
            fx.confetti(W * 0.7, H * 0.3, 50)
          }
        } else {
          flyT += dt
          while (flyQueue.length > 0 && flyT >= flyEvery) {
            flyT -= flyEvery
            const e = flyQueue.pop()!
            flyers.push({ e, x: sx(hole.x) + rnd(-20, 20), y: sy(hole.y), vx: rnd(-520, 520), vy: rnd(-1500, -900), rot: rnd(0, TAU), spin: rnd(-8, 8), size: rnd(56, 130) })
            if (flyStep % 3 === 0) sfx.pop(Math.min(16, Math.floor(flyStep / 3)))
            flyStep++
            gulp.value = 1.15
          }
          if (modeT > 0.8 + 2.6) {
            fx.confetti(W / 2, H * 0.25, 60)
            newRound()
          }
        }
      }

      for (let i = flyers.length - 1; i >= 0; i--) {
        const f = flyers[i]!
        f.vy += 1700 * dt
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.rot += f.spin * dt
        if (f.y > H + 160) flyers.splice(i, 1)
      }
    },

    draw(g) {
      const time = stage.time
      const z = zoom.value
      const r = holeR()
      const l = cam.x - W / 2 / z
      const t = cam.y - H / 2 / z
      const rt = cam.x + W / 2 / z
      const b = cam.y + H / 2 / z

      g.save()
      g.translate(W / 2, H / 2)
      g.scale(z, z)
      g.translate(-cam.x, -cam.y)

      drawGround(g, l, t, rt, b, time)

      order.length = 0
      for (const it of park.items) {
        if (it.state === 'gone') continue
        const half = it.size * 0.6
        if (it.x + half < l || it.x - half > rt || it.y + it.size * 0.2 < t || it.y - it.size * 1.1 > b + (it.state === 'fall' ? 400 : 0)) continue
        order.push(it)
      }
      order.sort((p, q) => p.y - q.y)
      // Things behind the far rim go under the hole's eyes; the rest go over.
      const rim = hole.y - r * K
      let holeDrawn = false
      for (const it of order) {
        if (!holeDrawn && (it.y > rim || it.state === 'fall')) {
          drawHole(g, r, time)
          holeDrawn = true
        }
        drawItem(g, it, r, time)
      }
      if (!holeDrawn) drawHole(g, r, time)
      g.restore()

      // Burped-up things, in screen space.
      for (const f of flyers) sprite(g, f.e, f.x, f.y, f.size, f.rot)

      // Size meter: fill it to grow, and see what will fit next.
      const bw = 300
      const bx = W / 2 - bw / 2 - 30
      const by = 28
      const frac = level < TOP ? clamp(xp / park.need[level]!, 0, 1) : 1
      rrect(g, bx - 56, by - 12, bw + 150, 58, 29, 'rgba(30,20,50,0.4)')
      ellipse(g, bx - 22, by + 19, 22, 14, '#8a5d36')
      ellipse(g, bx - 22, by + 20, 17, 10, '#140a1c')
      rrect(g, bx + 10, by + 4, bw, 30, 15, 'rgba(255,255,255,0.28)')
      if (frac > 0.02) rrect(g, bx + 10, by + 4, Math.max(30, bw * frac), 30, 15, level < TOP ? '#ffd23f' : '#ff7ac8')
      const nextE = NEXT[Math.min(TOP, level + 1)]!
      const pulse = meter.value * (level === TOP ? 1 + Math.sin(time * 6) * 0.08 : 1)
      sprite(g, nextE, bx + bw + 52, by + 17, 62 * pulse, Math.sin(time * 3) * 0.12)
      label(g, `${eaten}`, 78, 50, 40, '#ffffff', 'rgba(30,20,40,0.85)', 'left')
      if (gems > 0) label(g, `${GEM} ${gems}`, 24, 104, 34, '#bff4ff', 'rgba(30,20,40,0.85)', 'left')
      ellipse(g, 44, 50, 24, 15, '#8a5d36')
      ellipse(g, 44, 51, 19, 11, '#140a1c')

      // Point the way when no food is in view, or when the child is idle.
      if (mode === 'play' && target) {
        const tx = sx(target.x)
        const ty = sy(target.y - target.size * 0.4)
        if (lostT > 1) {
          const ax = clamp(tx, 70, W - 70)
          const ay = clamp(ty, 130, H - 110)
          const a = Math.atan2(ty - ay, tx - ax)
          const bob = Math.sin(time * 7) * 8
          const px = ax + Math.cos(a) * bob
          const py = ay + Math.sin(a) * bob
          g.fillStyle = 'rgba(255,255,255,0.92)'
          g.beginPath()
          g.arc(px, py, 44, 0, TAU)
          g.fill()
          g.beginPath()
          g.moveTo(px + Math.cos(a) * 66, py + Math.sin(a) * 66)
          g.lineTo(px + Math.cos(a + 0.5) * 42, py + Math.sin(a + 0.5) * 42)
          g.lineTo(px + Math.cos(a - 0.5) * 42, py + Math.sin(a - 0.5) * 42)
          g.fill()
          sprite(g, target.k.e, px, py, 50)
        } else if (time - lastTouchAt > (touched ? 5 : 2.5) && !active) {
          hint(g, tx, ty, time, 60)
        }
      }
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      touched = true
      active = p
      fx.ring(p.x, p.y, '#ffffff', 46, 0.3)
      sfx.tone({ freq: 480 + Math.random() * 160, to: 760, dur: 0.06, type: 'sine', vol: 0.12 })
      // The hole perks up: a quick squash and a look.
      gulp.value = 0.9
    },
    move(p: Pointer) {
      if (!p.down) return
      lastTouchAt = stage.time
      if (!active) active = p
    },
    up(p: Pointer) {
      lastTouchAt = stage.time
      if (active && active.id === p.id) {
        active = null
        for (const other of stage.pointers.values()) if (other.down && other.id !== p.id) active = other
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'hungry-hole',
    name: 'Hungry Hole',
    emoji: '🕳️',
    ages: [4, 9],
    pitch: 'Drag a hungry hole around the park: whatever fits falls in, and the hole grows until it can swallow the big top.',
    howTo: 'Drag the hole under things smaller than it. Fill the bar to size up; eat the circus tent to finish.',
    basedOn: 'Hole.io (420M downloads), Donut County, Katamari Damacy',
    whyFun: 'The fall-in is a payoff every second, the thing that was too big a moment ago fits now, and the view zooms out so the world keeps getting bigger.',
  },
  create,
}
