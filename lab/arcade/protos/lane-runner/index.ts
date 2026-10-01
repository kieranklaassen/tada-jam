// Lane Runner: a fox runs by itself down three lanes drawn in fake
// perspective. Swipe (or tap a side) to change lane, swipe up to jump, swipe
// down to roll. Borrowed from Subway Surfers and Temple Run. A crash is a
// tumble and a one-second rewind, never a game over.

import { blinkAt, circle, ellipse, label, rrect, shadow, sprite } from '../../kit/draw.ts'
import { clamp, damp, ease, lerp, pick, rnd, rndInt, spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { drawArch, drawBarrier, drawBeam, drawBox, drawCoin, drawFox, drawPickup, drawWarning } from './art.ts'
import type { FoxMood, FoxPose } from './art.ts'
import { FAR, HY, JET_H, TRAIN_V, ZNEAR, bigSprite, scaleAt, sx, sy, thing, view, warmBig } from './cam.ts'
import type { Cam, Power, Thing } from './cam.ts'
import { createGen } from './gen.ts'
import { createAtlas, createFloaters } from './text.ts'
import { ZONES, createBackdrops, drawGround } from './zones.ts'

const WARM_SPEED = 820
const BASE_SPEED = 1080
const MAX_SPEED = 2150
const ACCEL = 10
const JUMP_V = 1320
const GRAVITY = 3600
const ROLL_T = 0.72
const UNITS_PER_M = 60
// Seconds of running between one zone's arch appearing and the next.
const ZONE_EVERY = 25
const REWIND = 1500

type Dir = 'left' | 'right' | 'up' | 'down'

// How many seconds ahead the hint for each move appears. A jump or a roll made
// the moment its hint shows must still clear the obstacle, so those are short.
const HINT_AT: Record<Dir, number> = { left: 1.05, right: 1.05, up: 0.82, down: 0.64 }

interface Gesture {
  ax: number
  ay: number
  fired: number
  lastDir: Dir | null
  tapDone: boolean
  downAt: number
}

const POWER_LOOK: Record<Power, { char: string; color: string; word: string; seconds: number }> = {
  magnet: { char: '🧲', color: '#ff6b6b', word: 'MAGNET!', seconds: 7 },
  jet: { char: '🚀', color: '#ffb02e', word: 'JETPACK!', seconds: 5.5 },
  star: { char: '⭐', color: '#ffe14d', word: 'SUPER FOX!', seconds: 7 },
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const cam: Cam = { x: 0 }
  view.lift = 0
  const backdrops = createBackdrops()
  // Words and numbers come from cached sprites: stroking text every frame was
  // most of the frame cost.
  const words = createFloaters()
  const coinText = createAtlas(50)
  const runText = createAtlas(46)
  const bestText = createAtlas(26, '#fff3b0')
  const x2Text = createAtlas(40, '#ffe14d')
  // Rasterise every emoji now, not in the frame where a new zone first shows.
  warmBig(ZONES.flatMap((z) => z.props.map((look) => look.c)))
  const warm = document.createElement('canvas').getContext('2d')
  if (warm) {
    const small = ['👆', '⏪', '💎', '🏆', ...ZONES.flatMap((z) => [z.critter, z.emoji, z.cart[3]]), ...Object.values(POWER_LOOK).map((look) => look.char)]
    for (const char of small) sprite(warm, char, 0, 0, 1)
  }
  let things: Thing[] = []
  const gen = createGen(stage.rand, 700)

  let dist = 0
  let speed = WARM_SPEED
  let started = false
  let runTime = 0
  let state: 'run' | 'crash' | 'rewind' = 'run'
  let stateT = 0
  let rewindFrom = 0
  let rewindTo = 0
  let timeScale = 1
  let slowT = 0
  let lastTouchAt = 0
  let auto = false
  let autoAt = 0
  let crashes = 0

  // The fox.
  const p = {
    lane: 0,
    prevLane: 0,
    x: 0,
    h: 0,
    vy: 0,
    roll: 0,
    rollSpin: 0,
    run: 0,
    laneAt: -9,
    jumpAt: -9,
    rollAt: -9,
    invuln: 0,
    wantRoll: false,
    wantJump: 0,
    face: 0,
    faceUntil: -1,
    mood: 'happy' as FoxMood,
    tumble: 0,
    dizzy: 0,
    spin: 0,
    crashVy: 0,
    dustAt: 0,
  }
  const lean = spring(0, 300, 17)
  const squash = spring(1, 240, 11)
  const tail = spring(0, 90, 7)
  const coinPop = spring(1, 300, 12)

  // Power-ups, seconds left.
  let magnetT = 0
  let jetT = 0
  let starT = 0
  let jetLanding = false
  let rumbleAt = 0
  let sparkleAt = 0
  let sparkleStep = 0
  // When (in run time) the generator should next drop a pickup, and which.
  let nextPowerAt = 24
  let powerTurn = 1
  const POWER_ORDER: Power[] = ['magnet', 'jet', 'star']

  // Zones.
  let zone = 0
  let nextZone = 1
  let arch: Thing | null = null
  let nextArchAt = ZONE_EVERY - 4
  let nextPropD = -300

  // Hooks.
  let coins = 0
  let coinStreak = 0
  let lastCoinAt = -10
  let nearStreak = 0
  let lastNearAt = -10
  let runStart = 0
  let best = 0
  let bestShown = false
  const learned = { cart: false, barrier: false, beam: false }

  const gestures = new Map<number, Gesture>()
  const streaks = Array.from({ length: 16 }, () => ({ a: rnd(0, Math.PI * 2), u: Math.random(), w: rnd(0.6, 1.4) }))

  const flying = () => jetT > 0
  const boost = () => (jetT > 0 ? 1.45 : 1) * (starT > 0 ? 1.18 : 1)
  const foxX = () => sx(cam, p.x, 1)
  const groundY = () => sy(0, 1)
  const foxY = () => sy(p.h, 1)
  const zoneAt = (d: number) => (arch && d > arch.d ? nextZone : zone)

  const glance = (mood: FoxMood, seconds: number) => {
    p.mood = mood
    p.faceUntil = stage.time + seconds
  }

  const spawnProps = () => {
    while (nextPropD < dist + FAR + 700) {
      for (const side of [-1, 1]) {
        const z = zoneAt(nextPropD)
        const look = pick(ZONES[z].props, stage.rand())
        things.push(
          thing('prop', nextPropD + stage.rand() * 120, side * (2.45 + stage.rand() * 1.5), {
            zone: z,
            char: look.c,
            size: look.size * (0.9 + stage.rand() * 0.25),
            h: look.float ? 190 + stage.rand() * 190 : 0,
            seed: stage.rand(),
          }),
        )
      }
      nextPropD += 330 + stage.rand() * 170
    }
  }

  const fill = () => {
    const due = started && gen.teaching === false && runTime >= nextPowerAt ? POWER_ORDER[powerTurn % POWER_ORDER.length] : null
    const placed = gen.fill(things, { dist, speed, tier: Math.floor(runTime / 18), zoneAt, power: due })
    if (placed) {
      powerTurn++
      nextPowerAt = runTime + (powerTurn === 2 ? 19 : rnd(14, 17))
    }
    spawnProps()
  }
  fill()

  // Sounds built from the kit's two generators.
  const coinSound = () => {
    const f = sfx.scale(coinStreak % 10)
    sfx.tone({ freq: f, dur: 0.06, type: 'square', vol: 0.075 })
    sfx.tone({ freq: f * 1.5, dur: 0.16, type: 'square', vol: 0.075, delay: 0.05 })
  }
  const horn = () => {
    for (const delay of [0, 0.32]) {
      sfx.tone({ freq: 349, dur: 0.26, type: 'square', vol: 0.1, delay })
      sfx.tone({ freq: 440, dur: 0.26, type: 'square', vol: 0.1, delay })
    }
  }
  const swish = (dir: number) => {
    sfx.noise({ dur: 0.13, freq: 900, to: 2800, vol: 0.14, q: 0.9 })
    sfx.tone({ freq: 560 + dir * 90, to: 760 + dir * 120, dur: 0.07, type: 'triangle', vol: 0.12 })
  }

  const dust = (count: number, spread = Math.PI) => {
    fx.burst(foxX(), groundY(), { count, color: ['#ffffff', '#f1ead8'], speed: 240, angle: -Math.PI / 2, spread, life: 0.35, size: 10, gravity: 300 })
  }

  const addCoins = (n: number) => {
    const before = coins
    coins += starT > 0 ? n * 2 : n
    coinPop.value = 1.35
    if (Math.floor(coins / 100) > Math.floor(before / 100)) {
      const mark = Math.floor(coins / 100) * 100
      words.say(170, 250, `${mark}!`, { color: '#ffe14d', size: 64, life: 1.2 })
      fx.confetti(170, 220, 40)
      sfx.win()
    }
  }

  const grant = (power: Power, x: number, y: number) => {
    const look = POWER_LOOK[power]
    fx.ring(x, y, look.color, 220, 0.5)
    fx.burst(x, y, { count: 26, color: [look.color, '#ffffff'], speed: 620, life: 0.8, size: 12, shape: 'star' })
    words.say(W / 2, 330, `${look.char} ${look.word}`, { color: '#ffffff', size: 78, life: 1.4, rise: 60 })
    fx.flash(look.color, 0.35, 0.25)
    glance('grin', 0.7)
    if (power === 'magnet') {
      magnetT = look.seconds
      sfx.slideUp()
      sfx.win()
    } else if (power === 'star') {
      starT = look.seconds
      sfx.fanfare()
      fx.shake(8)
    } else {
      jetT = look.seconds
      jetLanding = true
      p.roll = 0
      p.vy = 0
      squash.value = 1.4
      fx.shake(14, 0.5)
      sfx.noise({ dur: 0.9, freq: 300, to: 2400, vol: 0.3, filter: 'lowpass' })
      sfx.tone({ freq: 160, to: 900, dur: 0.7, type: 'sawtooth', vol: 0.12 })
      sfx.win()
      // A river of coins up where the jetpack flies.
      const total = speed * 1.45 * look.seconds - 1700
      let lane = p.lane
      let from = lane
      const n = Math.floor(total / 150)
      for (let i = 0; i < n; i++) {
        const k = i % 9
        if (k === 0 && i > 0) {
          from = lane
          const options = [-1, 0, 1].filter((l) => l !== lane && Math.abs(l - lane) === 1)
          lane = pick(options)
        }
        const x = k < 3 ? lerp(from, lane, (k + 1) / 3) : lane
        things.push(thing('coin', dist + 1200 + i * 150, x, { h: JET_H + 70, zone }))
        if (k >= 3 && i % 2 === 0) things.push(thing('coin', dist + 1200 + i * 150, x, { h: JET_H + 150, zone }))
      }
    }
  }

  const knock = (t: Thing, word: string) => {
    const s = scaleAt(t.d - dist)
    const x = sx(cam, t.x, s)
    const y = sy(90, s)
    t.solid = false
    t.fly = 0
    const away = t.x - p.x
    t.fvx = (Math.abs(away) < 0.1 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(away)) * rnd(1.8, 3.2)
    t.fvh = rnd(1000, 1500)
    fx.burst(x, y, { count: 22, color: ['#ffffff', '#ffe14d', '#ff9f43'], speed: 700, life: 0.6, size: 12, shape: 'spark', gravity: 200 })
    fx.ring(x, y, '#ffffff', 170, 0.35)
    if (word) words.say(x, y - 90, word, { color: '#fff3b0', size: 60 })
    sfx.crunch()
    sfx.thud(1.2)
  }

  const crash = (t: Thing) => {
    state = 'crash'
    stateT = 0
    crashes++
    t.hits++
    // A train keeps coming, so give the second try some room.
    if (t.kind === 'train') t.d += 1000
    const run = dist - runStart
    if (run > best) best = run
    bestShown = false
    nearStreak = 0
    coinStreak = 0
    slowT = 0
    timeScale = 1
    p.vy = 0
    p.roll = 0
    p.crashVy = 1050
    p.mood = 'dizzy'
    p.wantJump = 0
    p.wantRoll = false
    const x = foxX()
    const y = foxY() - 100
    fx.hitstop(70)
    fx.shake(16, 0.35)
    fx.flash('#ffffff', 0.45, 0.14)
    fx.burst(x, y, { count: 18, color: ['#ffe14d', '#ffffff'], speed: 620, life: 0.8, size: 15, shape: 'star' })
    fx.burst(x, y, { count: 12, color: '#ffffff', speed: 380, life: 0.5, size: 14 })
    words.say(x, y - 110, pick(['BONK!', 'OOPS!', 'WHOOPS!', 'OOF!']), { color: '#ffffff', size: 70, life: 0.8 })
    sfx.thud(1.7)
    sfx.crunch()
    sfx.tone({ freq: 700, to: 140, dur: 0.45, type: 'triangle', vol: 0.2, delay: 0.08 })
    // Cuckoo-clock dizziness.
    for (let i = 0; i < 4; i++) sfx.tone({ freq: i % 2 === 0 ? 990 : 830, dur: 0.07, type: 'sine', vol: 0.12, delay: 0.3 + i * 0.08 })
  }

  const nearMiss = (word?: string) => {
    nearStreak = stage.time - lastNearAt < 7 ? nearStreak + 1 : 0
    lastNearAt = stage.time
    slowT = 0.3
    addCoins(3)
    const x = foxX()
    const y = foxY() - 210
    words.say(x, y, word ?? pick(['WHOA!', 'CLOSE!', 'PHEW!', 'NINJA!']), { color: '#7df9ff', size: 62 + Math.min(nearStreak, 4) * 6, life: 0.9 })
    words.say(x + 110, y + 40, '+3', { color: '#ffe14d', size: 40 })
    fx.ring(x, y + 110, '#7df9ff', 190, 0.4)
    fx.flash('#bff8ff', 0.22, 0.14)
    sfx.tone({ freq: 1200, to: 300, dur: 0.3, type: 'sine', vol: 0.16 })
    sfx.ding(Math.min(nearStreak, 6))
    glance('wow', 0.45)
  }

  const land = () => {
    p.h = 0
    const hard = p.vy < -1500
    p.vy = 0
    squash.value = hard ? 0.6 : 0.74
    dust(hard ? 14 : 8)
    sfx.thud(hard ? 0.8 : 0.45)
    if (jetLanding && jetT <= 0) {
      // Superhero landing: a shockwave clears the road ahead.
      jetLanding = false
      fx.shake(12, 0.3)
      fx.ring(foxX(), groundY(), '#ffffff', 420, 0.5)
      fx.ring(foxX(), groundY(), '#ffe14d', 300, 0.4)
      sfx.thud(1.6)
      p.invuln = 1
      let n = 0
      for (const t of things) {
        const z = t.d - dist
        if (t.solid && z > -200 && z < speed * 1.9) {
          stage.after(0.05 + n * 0.07, () => knock(t, ''))
          t.solid = false
          n++
        }
      }
    }
    if (p.wantRoll) {
      p.wantRoll = false
      startRoll()
    } else if (p.wantJump > 0) {
      p.wantJump = 0
      jump()
    }
  }

  function jump(): void {
    if (flying()) {
      p.spin = 1
      sfx.whoosh()
      return
    }
    if (p.h > 4) {
      p.wantJump = 0.2
      return
    }
    p.roll = 0
    p.vy = JUMP_V
    p.h = 1
    p.jumpAt = stage.time
    squash.value = 1.32
    tail.kick(2)
    dust(7, Math.PI * 0.8)
    sfx.boing(2 + rndInt(0, 2))
  }

  function startRoll(): void {
    if (flying()) {
      p.spin = 1
      sfx.whoosh()
      return
    }
    if (p.h > 4) {
      // Dive: drop fast, roll on landing.
      p.vy = Math.min(p.vy, -1700)
      p.wantRoll = true
      sfx.noise({ dur: 0.15, freq: 2000, to: 500, vol: 0.12 })
      return
    }
    p.roll = ROLL_T
    p.rollAt = stage.time
    dust(6)
    sfx.noise({ dur: 0.4, freq: 1500, to: 260, vol: 0.2, filter: 'lowpass' })
    sfx.tone({ freq: 330, to: 150, dur: 0.22, type: 'triangle', vol: 0.14 })
  }

  // Would the fox hit this if it were in its lane right now?
  const blocks = (t: Thing): boolean => {
    if (!t.solid || t.fly >= 0) return false
    const z0 = t.d - dist
    const z1 = z0 + Math.max(50, t.len)
    if (z0 > 70 || z1 < -50) return false
    if (t.kind === 'barrier') return p.h < 42
    if (t.kind === 'beam') return p.roll <= 0
    return true
  }

  const changeLane = (dir: number) => {
    const target = p.lane + dir
    const wall = Math.abs(target) > 1
    const side = !wall && !flying() && starT <= 0 && things.some((t) => Math.abs(t.x - target) < 0.4 && blocks(t))
    if (wall || side) {
      // A bump, not a crash: lean into it and bounce back.
      lean.value = dir * 0.9
      lean.vel = -dir * 6
      tail.kick(-dir * 4)
      fx.burst(foxX() + dir * 70, foxY() - 90, { count: 6, color: ['#ffe14d', '#ffffff'], speed: 260, life: 0.4, size: 12, shape: 'star' })
      fx.shake(4, 0.15)
      sfx.thud(0.5)
      sfx.boing(-2)
      return
    }
    p.prevLane = p.lane
    p.lane = target
    p.laneAt = stage.time
    lean.value = dir * 0.55
    lean.vel = dir * 7
    tail.kick(-dir * 7)
    swish(dir)
    // Streaks left behind in the lane it came from.
    fx.burst(foxX() - dir * 40, foxY() - 110, { count: 5, color: '#ffffff', speed: 520, angle: dir > 0 ? Math.PI : 0, spread: 0.5, life: 0.22, size: 9, shape: 'spark', gravity: 0, drag: 0.9 })
    if (p.h < 4 && !flying()) {
      fx.burst(foxX() - dir * 30, groundY(), { count: 5, color: ['#ffffff', '#f1ead8'], speed: 320, angle: dir > 0 ? Math.PI * 1.1 : -Math.PI * 0.1, spread: 0.7, life: 0.3, size: 10, gravity: 200 })
    }
  }

  const act = (dir: Dir, x: number, y: number) => {
    if (state !== 'run') {
      fx.burst(x, y, { count: 5, color: '#ffe14d', speed: 200, life: 0.4, size: 12, shape: 'star' })
      sfx.tick()
      return
    }
    if (dir === 'left') changeLane(-1)
    else if (dir === 'right') changeLane(1)
    else if (dir === 'up') jump()
    else startRoll()
  }

  const tap = (x: number, y: number) => {
    const fxX = foxX()
    const onFox = Math.abs(x - fxX) < 72 && y > foxY() - 270 && y < groundY() + 70
    if (onFox) act('up', x, y)
    else act(x < fxX ? 'left' : 'right', x, y)
  }

  const begin = () => {
    if (started) return
    started = true
    speed = BASE_SPEED
    runStart = dist
    gen.begin(things, dist)
    words.say(W / 2, 300, 'GO!', { color: '#ffe14d', size: 110, life: 0.8 })
    sfx.noise({ dur: 0.3, freq: 600, to: 3000, vol: 0.16 })
  }

  // What the fox has to do about the next thing in its lane, if anything.
  const threat = (): { t: Thing; z: number; dir: Dir } | null => {
    let bestT: Thing | null = null
    let bestZ = Infinity
    for (const t of things) {
      if (!t.solid || t.fly >= 0 || Math.abs(t.x - p.lane) > 0.4) continue
      const z = t.d - dist
      if (z < 20 || z >= bestZ) continue
      bestT = t
      bestZ = z
    }
    if (!bestT) return null
    const hit: Thing = bestT
    if (hit.kind === 'barrier') return { t: hit, z: bestZ, dir: 'up' }
    if (hit.kind === 'beam') return { t: hit, z: bestZ, dir: 'down' }
    const busy = (lane: number) =>
      Math.abs(lane) > 1 || things.some((t) => t.solid && (t.kind === 'cart' || t.kind === 'train') && Math.abs(t.x - lane) < 0.4 && Math.abs(t.d - hit.d) < 900)
    // Head for the nearest lane that is open, even if it is two away.
    let dir: Dir = p.lane > 0 ? 'left' : 'right'
    for (const step of [-1, 1, -2, 2]) {
      const lane = p.lane + (p.lane > 0 ? step : -step)
      if (!busy(lane)) {
        dir = lane < p.lane ? 'left' : 'right'
        break
      }
    }
    return { t: hit, z: bestZ, dir }
  }

  // A stand-in player for the screenshot tool (hold the top-right corner).
  const autopilot = () => {
    if (state !== 'run' || flying()) {
      if (flying() && stage.time - autoAt > 0.25) {
        const c = things.find((t) => t.kind === 'coin' && t.h > JET_H && t.d - dist > 250 && t.d - dist < 700)
        if (c && Math.abs(c.x - p.lane) > 0.6) {
          changeLane(Math.sign(c.x - p.lane))
          autoAt = stage.time
        }
      }
      return
    }
    const v = speed * boost()
    const eta = (t: Thing) => (t.d - dist) / (v + (t.kind === 'train' ? TRAIN_V : 0))
    const lanes: ({ kind: string; eta: number } | null)[] = [null, null, null]
    for (const t of things) {
      if (!t.solid || t.fly >= 0) continue
      if (t.d - dist + Math.max(50, t.len) < -40) continue
      const e = eta(t)
      if (e > 1.1) continue
      const i = Math.round(t.x) + 1
      const cur = lanes[i]
      if (!cur || e < cur.eta) lanes[i] = { kind: t.kind, eta: e }
    }
    const score = (lane: number) => {
      if (Math.abs(lane) > 1) return -1
      const l = lanes[lane + 1]
      if (!l) return 3
      return l.kind === 'barrier' || l.kind === 'beam' ? 2 : l.eta > 0.85 ? 1 : 0
    }
    const here = lanes[p.lane + 1]
    if (starT > 0) return
    if (here) {
      if (here.kind === 'barrier') {
        if (here.eta < 0.3 && p.h < 4) jump()
      } else if (here.kind === 'beam') {
        if (here.eta < 0.27 && p.roll < 0.15) startRoll()
      } else if (here.eta < 0.8 && stage.time - autoAt > 0.16) {
        const l = score(p.lane - 1)
        const r = score(p.lane + 1)
        if (Math.max(l, r) >= 1) {
          changeLane(l >= r ? -1 : 1)
          autoAt = stage.time
        }
      }
      return
    }
    if (stage.time - autoAt < 0.3) return
    const want = things.find((t) => (t.kind === 'pickup' || (t.kind === 'coin' && t.h < 120)) && t.d - dist > 250 && t.d - dist < 1300)
    if (want && Math.abs(want.x - p.lane) > 0.6) {
      const dir = Math.sign(want.x - p.lane)
      if (score(p.lane + dir) === 3) {
        changeLane(dir)
        autoAt = stage.time
      }
    }
  }

  const enterZone = () => {
    zone = nextZone
    nextZone = (zone + 1) % ZONES.length
    arch = null
    nextArchAt = runTime + ZONE_EVERY - 4
    const Z = ZONES[zone]
    fx.flash('#ffffff', 0.55, 0.35)
    fx.confetti(W / 2 - 250, 330, 50)
    fx.confetti(W / 2 + 250, 330, 50)
    words.say(W / 2, 250, `${Z.emoji} ${Z.name}!`, { color: '#ffffff', size: 92, life: 1.7, rise: 40 })
    fx.shake(6, 0.3)
    sfx.fanfare()
    glance('grin', 0.8)
  }

  const updateThings = (gdt: number) => {
    const v = speed * boost()
    const px = p.x
    const centre = p.h + 70
    const reach = flying() ? 0.72 : 0.56
    for (const t of things) {
      const z = t.d - dist
      if (t.fly >= 0) {
        t.fly += gdt
        t.x += t.fvx * gdt
        t.h += t.fvh * gdt
        t.fvh -= 2800 * gdt
        if (t.fly > 0.9) t.gone = true
        continue
      }
      if (z < ZNEAR - t.len - 60) {
        t.gone = true
        continue
      }
      if (t.kind === 'prop') continue
      if (t.kind === 'coin') {
        if (magnetT > 0 && z < 1500 && z > -80) t.pull = true
        if (t.pull) {
          t.x = damp(t.x, px, 12, gdt)
          t.h = damp(t.h, centre, 12, gdt)
          t.d -= 700 * gdt
        }
        if (state === 'run' && z < 80 && z > -100 && Math.abs(t.x - px) < reach && Math.abs(t.h - centre) < 128) {
          t.gone = true
          coinStreak = stage.time - lastCoinAt < 0.55 ? coinStreak + 1 : 0
          lastCoinAt = stage.time
          if (t.char) {
            // A gem: rare, and worth a fistful.
            addCoins(20)
            words.say(foxX(), foxY() - 240, `${t.char} +20`, { color: '#7df9ff', size: 60, life: 1 })
            fx.burst(foxX(), foxY() - 150, { count: 22, color: ['#7df9ff', '#ffffff', '#b07cff'], speed: 560, life: 0.8, size: 13, shape: 'star' })
            fx.ring(foxX(), foxY() - 120, '#7df9ff', 200, 0.45)
            for (let i = 0; i < 5; i++) sfx.tone({ freq: sfx.scale(4 + i * 2), dur: 0.14, type: 'triangle', vol: 0.14, delay: i * 0.05 })
            glance('grin', 0.5)
            continue
          }
          addCoins(1)
          coinSound()
          fx.burst(foxX(), foxY() - 235, { count: 3, color: ['#ffe14d', '#fff7c2'], speed: 340, angle: -Math.PI / 2, spread: 2.2, life: 0.35, size: 11, shape: 'star', gravity: 300 })
        }
        continue
      }
      if (t.kind === 'pickup') {
        // A gift should be hard to miss: it slides toward the fox's lane.
        if (z < 2600) t.x = damp(t.x, p.lane, 2.2, gdt)
        if (state === 'run' && t.power && z < 110 && z > -120 && Math.abs(t.x - px) < 0.62 && (p.h < 200 || flying())) {
          t.gone = true
          grant(t.power, foxX(), foxY() - 90)
        }
        continue
      }
      if (t.kind === 'critter') {
        if (state === 'run' && z < 230 && Math.abs(t.x - px) < 0.6 && p.h < 140) {
          t.fly = 0
          t.fvx = (t.x - px >= 0 ? 1 : -1) * rnd(1.4, 2.6)
          t.fvh = rnd(900, 1300)
          const s = scaleAt(z)
          fx.burst(sx(cam, t.x, s), sy(40, s), { count: 10, color: ['#ffffff', '#dfe7f2'], speed: 320, life: 0.6, size: 9, gravity: 250 })
          sfx.pop(rndInt(3, 7))
          sfx.tone({ freq: 1500, to: 2300, dur: 0.09, type: 'sine', vol: 0.1, delay: 0.04 })
        }
        continue
      }
      if (t.kind === 'arch') {
        if (arch === t && z < 40) enterZone()
        continue
      }
      // Obstacles.
      if (t.kind === 'train') {
        if (state === 'run') t.d -= TRAIN_V * gdt
        if (!t.warned && z < (v + TRAIN_V) * 2.1) {
          t.warned = true
          horn()
        }
      }
      if (state !== 'run' || !t.solid) continue
      const z1 = z + Math.max(50, t.len)
      const inLane = Math.abs(t.x - px) < 0.5
      if (inLane && !flying() && z < 45 && z1 > -45) {
        const clear = t.kind === 'barrier' ? p.h > 42 : t.kind === 'beam' ? p.roll > 0 : false
        if (!clear) {
          if (starT > 0) {
            knock(t, pick(['SMASH!', 'POW!', 'BOOM!']))
            addCoins(3)
            fx.shake(9, 0.2)
            fx.hitstop(40)
          } else if (p.invuln <= 0) {
            if (t.hits >= 1) {
              knock(t, 'BONK!')
              fx.shake(8, 0.2)
              p.invuln = 0.4
            } else {
              crash(t)
              return
            }
          }
        }
      }
      if (!t.passed && z < 0) {
        t.passed = true
        if (p.invuln > 0 || flying() || starT > 0) continue
        if (inLane && t.kind === 'barrier') {
          learned.barrier = true
          if (stage.time - p.jumpAt < 0.2) nearMiss('JUST IN TIME!')
          else {
            addCoins(2)
            words.say(foxX(), foxY() - 210, 'HOP! +2', { color: '#ffffff', size: 38, life: 0.6 })
          }
        } else if (inLane && t.kind === 'beam') {
          learned.beam = true
          if (stage.time - p.rollAt < 0.18) nearMiss('JUST IN TIME!')
          else {
            addCoins(2)
            words.say(foxX(), groundY() - 170, 'ZOOM! +2', { color: '#ffffff', size: 38, life: 0.6 })
          }
        } else if (!inLane) {
          if (t.kind === 'cart' && p.laneAt > 0) learned.cart = true
          if (p.prevLane === Math.round(t.x) && stage.time - p.laneAt < 0.32) nearMiss()
        }
      }
    }
  }

  return {
    update(dt) {
      words.update(dt)
      // Slow motion: a blink after a near miss, and a longer one the first
      // time each kind of obstacle arrives, so there is time to read the hint.
      const th = state === 'run' && !flying() && starT <= 0 ? threat() : null
      let target = 1
      if (slowT > 0) {
        slowT -= dt
        target = 0.32
      } else if (th && started && !auto) {
        const kind = th.t.kind === 'train' ? 'cart' : (th.t.kind as 'cart' | 'barrier' | 'beam')
        const handled = (kind === 'barrier' && p.h > 4) || (kind === 'beam' && p.roll > 0)
        if (!learned[kind] && !handled && th.z < speed * HINT_AT[th.dir] * 0.94) target = 0.3
      }
      timeScale = damp(timeScale, target, target < timeScale ? 16 : 7, dt)
      const gdt = dt * timeScale
      const v = speed * boost()

      if (state === 'run') {
        if (started) {
          runTime += gdt
          speed = Math.min(MAX_SPEED, speed + ACCEL * gdt)
        }
        dist += v * gdt
        const before = Math.floor(p.run / Math.PI)
        p.run += v * gdt * 0.0115
        if (Math.floor(p.run / Math.PI) !== before && p.h < 4 && p.roll <= 0 && !flying() && started) {
          sfx.noise({ dur: 0.035, freq: before % 2 === 0 ? 420 : 520, vol: 0.05, filter: 'lowpass' })
        }
        if (!bestShown && best > 300 * UNITS_PER_M && dist - runStart > best) {
          bestShown = true
          words.say(W - 190, 170, 'NEW BEST!', { color: '#ffe14d', size: 50, life: 1.3 })
          fx.confetti(W - 190, 140, 36)
          sfx.win()
        }
      } else if (state === 'crash') {
        stateT += dt
        // Knocked back a little, up into a backward tumble, down on its bottom.
        dist -= 520 * dt * Math.max(0, 1 - stateT / 0.3)
        if (p.crashVy !== 0 || p.h > 0) {
          p.crashVy -= 4200 * dt
          p.h += p.crashVy * dt
          p.tumble -= dt * 15
          if (p.h <= 0) {
            p.h = 0
            p.crashVy = 0
            p.tumble = 0
            p.dizzy = 1
            p.faceUntil = stage.time + 5
            squash.value = 0.6
            dust(10)
            sfx.thud(0.9)
            fx.shake(6, 0.15)
          }
        }
        if (stateT > 0.78) {
          state = 'rewind'
          stateT = 0
          rewindFrom = dist
          rewindTo = dist - REWIND
          for (let i = 0; i < 7; i++) sfx.tone({ freq: 300 + i * 90, dur: 0.05, type: 'square', vol: 0.06, delay: i * 0.05 })
          sfx.noise({ dur: 0.4, freq: 3000, to: 600, vol: 0.12 })
        }
      } else {
        stateT += dt
        const u = clamp(stateT / 0.42, 0, 1)
        dist = lerp(rewindFrom, rewindTo, ease.inOutCubic(u))
        p.run -= dt * 22
        p.dizzy = 0
        p.faceUntil = -1
        if (u >= 1) {
          state = 'run'
          speed = BASE_SPEED
          runStart = dist
          p.invuln = 0.7
          p.mood = 'happy'
          squash.value = 1.2
          sfx.whoosh()
        }
      }

      // The fox's own motion.
      p.x = damp(p.x, p.lane, 26, dt)
      cam.x = damp(cam.x, p.x * 0.42, 9, dt)
      view.lift = damp(view.lift, flying() ? 240 : state === 'run' ? p.h * 0.12 : 0, 3.2, dt)
      lean.target = clamp((p.lane - p.x) * 1.5, -1, 1)
      lean.update(dt)
      squash.update(dt)
      tail.update(dt)
      coinPop.update(dt)
      if (state === 'run') {
        if (flying()) {
          p.h = damp(p.h, JET_H, 5, gdt)
          p.vy = 0
        } else if (p.h > 0 || p.vy > 0) {
          const hang = Math.abs(p.vy) < 330 && !p.wantRoll ? 0.5 : 1
          p.vy -= GRAVITY * hang * gdt
          p.h += p.vy * gdt
          if (p.h <= 0) land()
        }
        if (p.roll > 0) {
          p.roll -= gdt
          p.rollSpin += gdt * 17
          if (p.roll <= 0) squash.value = 1.22
        }
        if (p.spin > 0) {
          p.spin = Math.max(0, p.spin - dt * 2.4)
          p.tumble = p.spin > 0 ? ease.inOutQuad(1 - p.spin) * Math.PI * 2 : 0
        }
        if (p.wantJump > 0) p.wantJump -= dt
        if (p.invuln > 0) p.invuln -= dt
        if (p.h < 4 && !flying() && stage.time - p.dustAt > (p.roll > 0 ? 0.05 : 0.13)) {
          p.dustAt = stage.time
          fx.burst(foxX() + rnd(-18, 18), groundY() + 4, { count: 1, color: '#ffffff', speed: 130, angle: Math.PI / 2, spread: 1.2, life: 0.3, size: 10, gravity: 0 })
        }
      }
      // Head: look back at the child now and then before the first touch.
      if (!started && stage.time % 3.2 > 2.3) glance('happy', 0.1)
      p.face = damp(p.face, stage.time < p.faceUntil ? 1 : 0, 22, dt)

      // Power-up clocks.
      if (state === 'run') {
        if (magnetT > 0) magnetT -= gdt
        if (starT > 0) {
          starT -= gdt
          if (stage.time - sparkleAt > 0.14) {
            sparkleAt = stage.time
            sparkleStep++
            sfx.note([0, 2, 4, 7, 9, 7, 4, 2][sparkleStep % 8], 0.1, 'square', 0.045)
            fx.burst(foxX() + rnd(-40, 40), foxY() - rnd(20, 180), { count: 2, color: ['#ff5d6c', '#ffd93d', '#4cd97b', '#38bdf8', '#f472d0'], speed: 200, angle: Math.PI / 2, spread: 1, life: 0.5, size: 14, shape: 'star', gravity: 300 })
          }
          if (starT <= 0) sfx.slideDown()
        }
        if (jetT > 0) {
          jetT -= gdt
          if (stage.time - rumbleAt > 0.3) {
            rumbleAt = stage.time
            sfx.noise({ dur: 0.36, freq: 260, to: 180, vol: 0.13, filter: 'lowpass' })
          }
          fx.burst(foxX() + rnd(-16, 16), foxY() - 30, { count: 1, color: ['#ffb02e', '#ffe14d', '#ffffff'], speed: 420, angle: Math.PI / 2, spread: 0.5, life: 0.4, size: 13, gravity: 0 })
          if (jetT <= 0) {
            // Safe all the way down: the landing clears the road.
            sfx.slideDown()
            p.vy = 0
            p.invuln = 1.4
          }
        }
      }

      // The world.
      if (started && !arch && runTime >= nextArchAt) {
        arch = thing('arch', dist + FAR, 0, { zone: nextZone })
        things.push(arch)
      }
      fill()
      updateThings(gdt)
      if (things.some((t) => t.gone)) things = things.filter((t) => !t.gone)
      things.sort((a, b) => b.d - a.d)

      // A long hold on the distance readout hands the fox to the stand-in
      // player (for the screenshot tool).
      for (const [id, gs] of gestures) {
        const ptr = stage.pointers.get(id)
        if (!ptr) {
          gestures.delete(id)
          continue
        }
        if (gs.fired === 0 && gs.downAt > 0 && stage.time - gs.downAt > 1.2 && ptr.startX > W - 220 && ptr.startY < 130) {
          gs.downAt = -1
          gs.tapDone = true
          auto = !auto
          words.say(W - 160, 190, auto ? 'AUTO ON' : 'AUTO OFF', { size: 34 })
        }
      }
      if (auto) autopilot()
    },

    draw(g) {
      const time = stage.time
      backdrops.draw(g, zone, cam, time)
      const near = ZONES[zone]
      const far = ZONES[nextZone]
      drawGround(g, cam, dist, near, far, arch ? arch.d - dist : Infinity)

      // A train's lane glows and carries a warning until it is close.
      for (const t of things) {
        if (t.kind !== 'train' || !t.solid) continue
        const z = t.d - dist
        if (z < 700) continue
        const flash = 0.16 + Math.sin(time * 14) * 0.1
        const sa = scaleAt(0)
        const sb = scaleAt(Math.min(z, FAR + 3000))
        g.fillStyle = `rgba(255,60,60,${flash})`
        g.beginPath()
        g.moveTo(sx(cam, t.x - 0.5, sa), sy(0, sa))
        g.lineTo(sx(cam, t.x + 0.5, sa), sy(0, sa))
        g.lineTo(sx(cam, t.x + 0.5, sb), sy(0, sb))
        g.lineTo(sx(cam, t.x - 0.5, sb), sy(0, sb))
        g.closePath()
        g.fill()
      }

      // Speed lines out of the vanishing point.
      const rush = state !== 'run' ? 0 : flying() ? 1 : clamp((speed * boost() - 1500) / 900, 0, 1)
      if (rush > 0.02) {
        g.strokeStyle = '#ffffff'
        for (const st of streaks) {
          st.u += 0.035 * st.w
          if (st.u > 1) {
            st.u = 0
            st.a = rnd(0, Math.PI * 2)
          }
          const cx = Math.cos(st.a)
          const cy = Math.sin(st.a) * 0.75
          const r1 = 260 + st.u * 620
          const r2 = r1 + 60 + st.u * 220
          g.globalAlpha = 0.5 * rush * (1 - st.u)
          g.lineWidth = 2 + st.u * 6
          g.beginPath()
          g.moveTo(W / 2 + cx * r1, HY + 60 + cy * r1)
          g.lineTo(W / 2 + cx * r2, HY + 60 + cy * r2)
          g.stroke()
        }
        g.globalAlpha = 1
      }

      const pose: FoxPose = {
        time,
        run: p.run,
        lean: lean.value,
        stretch: squash.value * (p.h > 4 && state === 'run' && !flying() ? 1 + clamp(Math.abs(p.vy) / 1300, 0, 1) * 0.16 : 1),
        air: p.h > 8 ? 1 : 0,
        roll: p.roll > 0 ? 1 : 0,
        rollSpin: p.rollSpin,
        face: p.face,
        mood: p.mood,
        tail: tail.value,
        jet: flying() ? 1 : 0,
        star: starT > 1.2 || (starT > 0 && Math.floor(time * 10) % 2 === 0) ? 1 : 0,
        magnet: magnetT > 0,
        tumble: p.tumble,
        dizzy: p.dizzy,
        blink: blinkAt(time),
        ghost: p.invuln > 0 && state === 'run',
        sit: state === 'crash' && p.dizzy > 0,
      }
      let foxDrawn = false
      const paintFox = () => {
        foxDrawn = true
        shadow(g, foxX(), groundY() + 6, 62, clamp(1 - p.h / 520, 0.35, 1), 0.26)
        drawFox(g, foxX(), foxY(), state === 'crash' ? 1 + Math.min(stateT, 0.3) * 0.5 : 1, pose)
      }

      for (const t of things) {
        const z = t.d - dist
        if (!foxDrawn && z <= 0) paintFox()
        if (z > FAR + 5600) continue
        const zc = Math.max(z, ZNEAR)
        const s = scaleAt(zc)
        const X = sx(cam, t.x, s)
        const fade = t.kind === 'train' ? 1 : clamp((FAR + (t.kind === 'prop' ? 700 : 0) - z) / 900, 0, 1)
        if (fade <= 0) continue
        const flyFade = t.fly >= 0 ? clamp(1 - t.fly / 0.9, 0, 1) : 1
        g.globalAlpha = fade * flyFade
        if (t.kind === 'prop') {
          if (z >= ZNEAR) {
            const bob = t.h > 0 ? Math.sin(time * 1.6 + t.seed * 20) * 22 : 0
            bigSprite(g, t.char, X, sy(t.h + bob, s) + 8 * s, t.size * s)
          }
        } else if (t.kind === 'coin') {
          if (z >= ZNEAR) {
            if (z < 3600 && t.h < 200) ellipse(g, X, sy(0, s), 20 * s, 6 * s, 'rgba(0,0,0,0.16)')
            if (t.char) {
              const glow = 1 + Math.sin(time * 9) * 0.1
              circle(g, X, sy(t.h, s), 46 * s * glow, 'rgba(180,240,255,0.35)')
              sprite(g, t.char, X, sy(t.h, s), 74 * s, Math.sin(time * 4) * 0.2)
            } else drawCoin(g, X, sy(t.h, s), s, time * 5 + t.d * 0.004, true)
          }
        } else if (t.kind === 'barrier' || t.kind === 'beam') {
          if (z >= ZNEAR) {
            g.save()
            g.translate(X, sy(t.h, s))
            g.scale(s, s)
            if (t.fly >= 0) {
              g.translate(0, -90)
              g.rotate(t.fly * 9 * Math.sign(t.fvx))
              g.translate(0, 90)
            }
            if (t.kind === 'barrier') drawBarrier(g, ZONES[t.zone], time + t.seed * 5)
            else drawBeam(g, ZONES[t.zone], time + t.seed * 5)
            g.restore()
          }
        } else if (t.kind === 'cart' || t.kind === 'train') {
          // The last sliver of a box passing right over the fox is just noise.
          const over = z + t.len < 60 && Math.abs(t.x - p.x) < 0.7
          if (!over) drawBox(g, cam, t.kind, ZONES[t.zone], t.x, t.h, z, t.len, time, t.seed, clamp(p.x - t.x, -1, 1))
        } else if (t.kind === 'pickup' && t.power) {
          if (z >= ZNEAR) {
            const look = POWER_LOOK[t.power]
            ellipse(g, X, sy(0, s), 46 * s, 12 * s, 'rgba(0,0,0,0.18)')
            g.save()
            g.translate(X, sy(t.h + Math.sin(time * 4) * 12, s))
            g.scale(s, s)
            drawPickup(g, look.char, time, look.color)
            g.restore()
          }
        } else if (t.kind === 'critter') {
          if (z >= ZNEAR) {
            const hop = t.fly >= 0 ? 0 : Math.abs(Math.sin(time * 6 + t.seed * 9)) * 16
            if (t.fly < 0) ellipse(g, X, sy(0, s), 26 * s, 7 * s, 'rgba(0,0,0,0.18)')
            sprite(g, ZONES[t.zone].critter, X, sy(t.h + 34 + hop, s), 76 * s, t.fly >= 0 ? t.fly * 10 * Math.sign(t.fvx) : 0)
          }
        } else if (t.kind === 'arch') {
          if (z >= ZNEAR) {
            g.save()
            g.translate(X, sy(0, s))
            g.scale(s, s)
            drawArch(g, ZONES[t.zone].emoji, time)
            g.restore()
          }
        }
        g.globalAlpha = 1
      }
      if (!foxDrawn) paintFox()

      // Warning signs sit over the lane, in front of everything.
      for (const t of things) {
        if (t.kind !== 'train' || !t.solid) continue
        const z = t.d - dist
        if (z < 1700) continue
        const s = scaleAt(3000)
        g.save()
        g.translate(sx(cam, t.x, s), sy(330, s))
        g.scale(0.62, 0.62)
        drawWarning(g, time)
        g.restore()
      }

      if (state === 'rewind') {
        g.fillStyle = 'rgba(40,60,160,0.22)'
        g.fillRect(0, 0, W, H)
        g.fillStyle = 'rgba(255,255,255,0.22)'
        for (let i = 0; i < 7; i++) g.fillRect(0, (i * 131 + time * 900) % H, W, 5)
        sprite(g, '⏪', W / 2, 180, 110)
      }

      // The numbers.
      rrect(g, 18, 20, 120 + String(coins).length * 30, 74, 37, 'rgba(30,20,40,0.35)')
      drawCoin(g, 58, 56, 1.2, time * 3, true)
      coinText.draw(g, String(coins), 104, 58, 'left', coinPop.value)
      if (started) {
        const run = Math.max(0, Math.floor((dist - runStart) / UNITS_PER_M))
        rrect(g, W - 98 - String(run).length * 28, 20, 80 + String(run).length * 28, 74, 37, 'rgba(30,20,40,0.35)')
        runText.draw(g, `${run} m`, W - 36, 56, 'right')
        const top = Math.floor(Math.max(best, dist - runStart) / UNITS_PER_M)
        if (best > 0) {
          const text = `${top} m`
          bestText.draw(g, text, W - 36, 104, 'right')
          sprite(g, '🏆', W - 36 - bestText.width(text) - 20, 104, 26)
        }
      }
      let row = 0
      const timers: [Power, number][] = [
        ['magnet', magnetT],
        ['jet', jetT],
        ['star', starT],
      ]
      for (const [power, left] of timers) {
        if (left <= 0) continue
        const look = POWER_LOOK[power]
        const y = 128 + row * 58
        if (left > 1.3 || Math.floor(time * 8) % 2 === 0) sprite(g, look.char, 58, y, 46)
        rrect(g, 92, y - 9, 130, 18, 9, 'rgba(30,20,40,0.55)')
        rrect(g, 95, y - 6, Math.max(12, 124 * clamp(left / look.seconds, 0, 1)), 12, 6, look.color)
        row++
      }
      if (starT > 0) x2Text.draw(g, 'x2', 185 + String(coins).length * 30, 58)
      if (auto) label(g, `auto  crashes ${crashes}`, W / 2, 28, 22)

      // Hints: a hand that makes the gesture. Shown for the first of each
      // obstacle, and whenever the child has not touched for a while.
      if (state === 'run' && !flying() && !auto) {
        const th = starT > 0 ? null : threat()
        const idle = time - lastTouchAt > (started ? 5 : 2.4)
        let dir: Dir | null = null
        if (th && th.z < speed * HINT_AT[th.dir]) {
          const kind = th.t.kind === 'train' ? 'cart' : (th.t.kind as 'cart' | 'barrier' | 'beam')
          const handled = (kind === 'barrier' && p.h > 4) || (kind === 'beam' && p.roll > 0)
          if ((!learned[kind] || idle) && !handled) dir = th.dir
        } else if (idle) {
          dir = Math.floor(time / 1.1) % 2 === 0 ? 'left' : 'right'
        }
        if (dir) swipeHint(g, foxX(), dir, time)
      }
      words.draw(g)
    },

    down(ptr: Pointer) {
      lastTouchAt = stage.time
      fx.ring(ptr.x, ptr.y, '#ffffff', 46, 0.25)
      sfx.tone({ freq: 320, to: 460, dur: 0.04, type: 'sine', vol: 0.07 })
      squash.kick(1.2)
      gestures.set(ptr.id, { ax: ptr.x, ay: ptr.y, fired: 0, lastDir: null, tapDone: false, downAt: stage.time })
      begin()
    },

    move(ptr: Pointer) {
      const gs = gestures.get(ptr.id)
      if (!gs) return
      lastTouchAt = stage.time
      const dx = ptr.x - gs.ax
      const dy = ptr.y - gs.ay
      const far = Math.max(Math.abs(dx), Math.abs(dy))
      if (far < (gs.fired === 0 && !gs.tapDone ? 24 : 60)) return
      const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down'
      // One long swipe is one move; keep going a long way for a second.
      if (dir === gs.lastDir && far < 130) return
      gs.ax = ptr.x
      gs.ay = ptr.y
      gs.fired++
      gs.lastDir = dir
      act(dir, ptr.x, ptr.y)
    },

    up(ptr: Pointer) {
      const gs = gestures.get(ptr.id)
      gestures.delete(ptr.id)
      if (gs && gs.fired === 0 && !gs.tapDone) tap(ptr.startX, ptr.startY)
    },
  }
}

// A hand that swipes the way the fox needs to go, with an arrow under it.
function swipeHint(g: CanvasRenderingContext2D, x: number, dir: Dir, time: number): void {
  const t = (time % 0.95) / 0.95
  const u = ease.outCubic(Math.min(1, t * 1.5))
  const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0
  const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0
  // The arrow starts at the fox and goes the way it should go.
  const reach = 190
  const x0 = dir === 'down' ? x + 140 : x + dx * 80
  const y0 = dir === 'up' ? 430 : dir === 'down' ? 470 : 600
  const x1 = x0 + dx * reach * u
  const y1 = y0 + dy * reach * u
  g.globalAlpha = t > 0.75 ? (1 - t) / 0.25 : 1
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (const [color, width] of [
    ['rgba(30,20,40,0.55)', 26],
    ['#ffffff', 16],
  ] as const) {
    g.strokeStyle = color
    g.lineWidth = width
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.stroke()
    // Arrow head.
    g.beginPath()
    g.moveTo(x1 - dx * 26 - dy * 26, y1 - dy * 26 - dx * 26)
    g.lineTo(x1 + dx * 10, y1 + dy * 10)
    g.lineTo(x1 - dx * 26 + dy * 26, y1 - dy * 26 + dx * 26)
    g.stroke()
  }
  sprite(g, '👆', x1 + 22, y1 + 62, 96)
  g.globalAlpha = 1
}

export const proto: Proto = {
  meta: {
    key: 'lane-runner',
    name: 'Lane Runner',
    emoji: '🏃',
    ages: [6, 11],
    pitch: 'A fox dashes down three lanes; swipe to dodge, jump and roll, and grab the jetpack.',
    howTo: 'Swipe left or right to change lane (or tap a side), swipe up to jump, swipe down to roll.',
    basedOn: 'Subway Surfers, Temple Run',
    whyFun: 'Snappy lane changes, floaty jumps, near-miss slow-mo, and a new zone or power-up every half minute; a crash is a funny tumble and a rewind.',
  },
  create,
}
