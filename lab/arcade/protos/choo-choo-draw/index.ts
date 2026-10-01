// Choo-Choo Draw: drag anywhere and track is laid under the finger; a little
// steam train with a face follows every wiggle, picks up waiting animals and
// drops them at a station. The pen that lays the track chases the finger on a
// short string with a minimum turning circle, so a wobbly toddler line (or a
// single tap far away) still becomes smooth track.

import { blinkAt, circle, ellipse, eyes, face, label, rrect, shadow, sprite } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { clamp, damp, dist, ease, lerp, rnd, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { MOUND, POND, ROAD, STATIONS, paintBackdrop, drawMound, drawStation } from './scene.ts'
import type { Station } from './scene.ts'

// Track is a run of points exactly STEP apart, so distance along it is an index.
const STEP = 6
// The pen trails the finger by this much and cannot turn tighter than RMIN.
// RMIN below LAG means the pen can always get within LAG of a still finger.
const LAG = 40
const RMIN = 38
const PEN_SPEED = 3200
const MAX_AHEAD = 6000
// Everything on rails is drawn this much bigger than its design size.
const K = 1.18
const STOP = 58
const LOCO = 96 * K
const CAR = 66 * K
const LINK = 10 * K
const MAX_CARS = 6
const INK = '#3a2630'

const F_WATER = 1
const F_HILL = 2
const F_ROAD = 4

const CAR_COLORS: readonly [string, string, string][] = [
  ['#ffb02e', '#b26a08', '#d98c12'],
  ['#4db8ff', '#1f6fae', '#2f95dd'],
  ['#b07cff', '#6a3fb5', '#9160e6'],
  ['#ff7ac8', '#b53f86', '#e65aae'],
  ['#5ed36a', '#2c8a3b', '#43b652'],
  ['#ff8a4d', '#b5501f', '#e66c30'],
]
const ANIMALS = ['🐷', '🐸', '🐰', '🐻', '🐼', '🦊', '🐱', '🐶', '🐵', '🐯', '🐨', '🐔', '🐧', '🦁']
const SPOTS: readonly [number, number][] = [
  [800, 385],
  [300, 270],
  [110, 430],
  [560, 570],
  [400, 120],
  [830, 300],
  [1075, 250],
  [1075, 720],
  [600, 330],
  [500, 500],
  [760, 500],
]
const RAINBOW = ['#ff5d5d', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff', '#ff7ac8']

interface Pt {
  x: number
  y: number
  nx: number
  ny: number
  flag: number
  born: number
}

interface Marker {
  kind: 'portal' | 'xing'
  x: number
  y: number
  nx: number
  ny: number
  idx: number
  grow: number
}

interface Pose {
  x: number
  y: number
  ang: number
  flag: number
}

type AnimalState = 'wait' | 'hopOn' | 'ride' | 'hopOff' | 'dance'

interface Animal {
  emoji: string
  state: AnimalState
  x: number
  y: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  t: number
  seat: number
  spot: number
  grow: number
  phase: number
  // When a rider starts its hop off, and when a dancer leaves.
  at: number
  jump: Spring
  station: number
}

interface Cow {
  x: number
  y: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  t: number
  mooAt: number
  homeX: number
  homeY: number
  hopAt: number
  flip: number
  jump: Spring
  phase: number
}

interface RoadCar {
  y: number
  color: string
  side: string
  speed: number
  blocked: boolean
  jump: Spring
}

interface Puff {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  r: number
  color: string
}

// Floating emoji and words. The kit's fx.text re-rasterises its text at a new
// font size every frame, which costs several milliseconds a frame for emoji
// and a long one-off font lookup the first time; these are cached images.
interface Floater {
  x: number
  y: number
  emoji: string
  img: HTMLCanvasElement | null
  life: number
  max: number
  size: number
  rise: number
}

const WORD_PX = 64

interface Fish {
  x: number
  y: number
  dir: number
  t: number
}

function zone(x: number, y: number): number {
  let f = 0
  if (((x - POND.x) / POND.rx) ** 2 + ((y - POND.y) / POND.ry) ** 2 < 1) f |= F_WATER
  if (((x - MOUND.x) / (MOUND.rx - 16)) ** 2 + ((y - MOUND.y) / (MOUND.ry - 14)) ** 2 < 1) f |= F_HILL
  if (x > ROAD.x0 && x < ROAD.x1) f |= F_ROAD
  return f
}

function wrap(a: number): number {
  while (a > Math.PI) a -= TAU
  while (a < -Math.PI) a += TAU
  return a
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  const backdrop = document.createElement('canvas')
  backdrop.width = W
  backdrop.height = H
  const bg = backdrop.getContext('2d')
  if (bg) paintBackdrop(bg, () => stage.rand())

  const floaters: Floater[] = []
  const wordImage = (text: string, color: string): HTMLCanvasElement => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(text.length * WORD_PX * 0.8 + 40)
    canvas.height = Math.ceil(WORD_PX * 1.5)
    const c = canvas.getContext('2d')
    if (c) label(c, text, canvas.width / 2, canvas.height / 2, WORD_PX, color)
    return canvas
  }
  const mooImage = wordImage('MOO!', '#ffffff')
  const beepImage = wordImage('BEEP!', '#fff3b0')
  const float = (x: number, y: number, what: string | HTMLCanvasElement, size: number, life = 0.9, rise = 80) => {
    const img = typeof what === 'string' ? null : what
    floaters.push({ x, y, emoji: typeof what === 'string' ? what : '', img, life, max: life, size, rise })
    if (floaters.length > 40) floaters.shift()
  }
  // Emoji not on screen at the start are drawn off-field one a frame, so the
  // first time each is needed it is already cached.
  const warm = [...ANIMALS, '🦄', '🐟', '🦇', '❤️', '🌈', '🎵', '🎶']

  // ---- track -------------------------------------------------------------
  const pts: Pt[] = []
  let base = 0
  const markers: Marker[] = []
  const pen = { x: 170, y: 430, ang: 0 }
  // Where the finger has been and the pen has not yet: the pen follows these
  // in order, so a fast scribble keeps its shape.
  const trail: { x: number; y: number }[] = []
  let drawId: number | null = null
  let pendingId: number | null = null
  let lastClackAt = -1
  let clackFlip = false

  const endS = () => (base + pts.length - 1) * STEP

  const pushPoint = () => {
    const flag = zone(pen.x, pen.y)
    const prev = pts[pts.length - 1]
    const nx = -Math.sin(pen.ang)
    const ny = Math.cos(pen.ang)
    pts.push({ x: pen.x, y: pen.y, nx, ny, flag, born: stage.time })
    if (!prev) return
    const changed = prev.flag ^ flag
    const idx = base + pts.length - 1
    if (changed & F_HILL) {
      const marker: Marker = { kind: 'portal', x: (prev.x + pen.x) / 2, y: (prev.y + pen.y) / 2, nx, ny, idx, grow: 0 }
      markers.push(marker)
      stage.tween(0.3, (t) => (marker.grow = t), ease.outBack)
      sfx.thud(0.5)
    }
    if (changed & flag & F_ROAD) {
      const marker: Marker = { kind: 'xing', x: pen.x, y: pen.y, nx, ny, idx, grow: 0 }
      const old = markers.findIndex((m) => m.kind === 'xing')
      if (old >= 0 && markers.filter((m) => m.kind === 'xing').length >= 3) markers.splice(old, 1)
      markers.push(marker)
      stage.tween(0.3, (t) => (marker.grow = t), ease.outBack)
      sfx.pop(2)
    }
  }

  for (let x = 170; x <= 542; x += STEP) {
    pen.x = x
    pushPoint()
  }
  for (const p of pts) p.born = -1

  const posAt = (s: number): { x: number; y: number; flag: number } => {
    const f = clamp(s / STEP - base, 0, pts.length - 1)
    const i = Math.floor(f)
    const a = pts[i]!
    const b = pts[Math.min(i + 1, pts.length - 1)]!
    const t = f - i
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), flag: a.flag }
  }

  // ---- train -------------------------------------------------------------
  let trainS = endS() - STOP
  let speed = 0
  let moving = false
  let boostUntil = 0
  let puffDist = 0
  let chuffFlip = false
  let idlePuffAt = 0
  let idleToots = 0
  let nextIdleTootAt = 6
  let prevFlag = 0
  let mood: Mood = 'happy'
  let moodUntil = 0
  let lastBellAt = -10
  let rainbow = false
  const locoSpring = spring(0, 240, 9)
  const carSprings: Spring[] = []
  const carGrow: number[] = []
  const seats: (Animal | null)[] = []
  const poses: Pose[] = []
  let chuff = 0
  const moundSpring = spring(0, 160, 8)

  const addCarriage = (quiet = false) => {
    if (seats.length >= MAX_CARS) return
    const i = seats.length
    seats.push(null)
    carSprings.push(spring(0, 240, 9))
    carGrow.push(quiet ? 1 : 0)
    if (quiet) return
    stage.tween(0.45, (t) => (carGrow[i] = t), ease.outBack)
    sfx.pop(i)
    sfx.boing(i)
    const pose = poses[i + 1] ?? poses[poses.length - 1]
    if (pose) {
      fx.burst(pose.x, pose.y, { count: 16, color: RAINBOW, shape: 'star', speed: 320, life: 0.7, size: 12 })
      fx.ring(pose.x, pose.y, '#ffffff', 80, 0.4)
    }
  }
  addCarriage(true)
  addCarriage(true)

  const centreOf = (i: number) => (i === 0 ? trainS - LOCO / 2 : trainS - (LOCO + LINK + CAR / 2 + (i - 1) * (CAR + LINK)))

  const computePoses = () => {
    const n = seats.length + 1
    for (let i = 0; i < n; i++) {
      const c = centreOf(i)
      const hw = (i === 0 ? 30 : 20) * K
      const a = posAt(c + hw)
      const b = posAt(c - hw)
      const pose = poses[i] ?? (poses[i] = { x: 0, y: 0, ang: 0, flag: 0 })
      pose.x = (a.x + b.x) / 2
      pose.y = (a.y + b.y) / 2
      if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 0.5) pose.ang = Math.atan2(a.y - b.y, a.x - b.x)
      pose.flag = posAt(c).flag
    }
    poses.length = n
  }
  computePoses()

  const setMood = (m: Mood, seconds: number) => {
    mood = m
    moodUntil = stage.time + seconds
  }

  // ---- sound -------------------------------------------------------------
  const toot = (delay: number, dur: number, vol: number) => {
    const bend = 1 + rnd(-0.02, 0.02)
    for (const f of [698, 880, 1046]) {
      sfx.tone({ freq: f * bend * 0.97, to: f * bend, dur, type: 'triangle', vol, delay, attack: 0.03 })
    }
    sfx.tone({ freq: 349 * bend, dur, type: 'square', vol: vol * 0.18, delay, attack: 0.03 })
    sfx.noise({ dur: dur * 0.8, freq: 3500, vol: vol * 0.25, filter: 'highpass', delay })
  }

  const clack = (fast: number) => {
    if (stage.time - lastClackAt < 0.045) return
    lastClackAt = stage.time
    clackFlip = !clackFlip
    const f = (clackFlip ? 900 : 680) * (1 + fast * 0.5) * (1 + rnd(-0.04, 0.04))
    sfx.tone({ freq: f, to: f * 0.6, dur: 0.04, type: 'triangle', vol: 0.13 })
    sfx.noise({ dur: 0.025, freq: 2600, vol: 0.06, filter: 'highpass' })
  }

  const moo = (cow: Cow) => {
    cow.mooAt = stage.time
    cow.jump.kick(5)
    const f = rnd(130, 165)
    sfx.tone({ freq: f, to: f * 1.35, dur: 0.18, type: 'sawtooth', vol: 0.13, attack: 0.04 })
    sfx.tone({ freq: f * 1.35, to: f * 0.85, dur: 0.55, type: 'sawtooth', vol: 0.15, delay: 0.16, attack: 0.03 })
    sfx.tone({ freq: f * 2.7, to: f * 1.7, dur: 0.5, type: 'triangle', vol: 0.06, delay: 0.16, attack: 0.03 })
    float(cow.x, cow.y - 50, mooImage, 34, 0.9)
  }

  const quack = (x: number, y: number) => {
    sfx.tone({ freq: 620, to: 420, dur: 0.09, type: 'square', vol: 0.1 })
    sfx.tone({ freq: 600, to: 380, dur: 0.11, type: 'square', vol: 0.1, delay: 0.12 })
    fx.burst(x, y + 10, { count: 6, color: '#dff4ff', speed: 160, life: 0.4, size: 7, angle: -Math.PI / 2, spread: Math.PI })
  }

  const beep = (car: RoadCar) => {
    car.jump.kick(4)
    sfx.tone({ freq: 440, dur: 0.12, type: 'square', vol: 0.09 })
    sfx.tone({ freq: 554, dur: 0.12, type: 'square', vol: 0.09 })
    sfx.tone({ freq: 440, dur: 0.16, type: 'square', vol: 0.09, delay: 0.16 })
    sfx.tone({ freq: 554, dur: 0.16, type: 'square', vol: 0.09, delay: 0.16 })
    float(ROAD.x + 58, car.y - 30, beepImage, 28, 0.7)
  }

  const bell = () => {
    if (stage.time - lastBellAt < 2.5) return
    lastBellAt = stage.time
    for (let i = 0; i < 6; i++) sfx.tone({ freq: i % 2 ? 1180 : 1480, dur: 0.16, type: 'sine', vol: 0.14, delay: i * 0.15 })
  }

  const steam = (x: number, y: number, count: number, up = 1) => {
    for (let i = 0; i < count; i++) {
      puffs.push({
        x: x + rnd(-6, 6),
        y: y + rnd(-6, 6),
        vx: rnd(-40, 40),
        vy: rnd(-120, -50) * up,
        age: 0,
        life: rnd(0.7, 1.2),
        r: rnd(9, 14),
        color: rainbow ? RAINBOW[Math.floor(rnd(0, RAINBOW.length))]! : '#ffffff',
      })
    }
    if (puffs.length > 70) puffs.splice(0, puffs.length - 70)
  }

  const whistle = (from: number) => {
    toot(0, 0.22, 0.17)
    toot(0.24, 0.5, 0.17)
    locoSpring.kick(3.5)
    boostUntil = stage.time + 1.8
    setMood('wow', 0.9)
    const loco = poses[0]!
    steam(loco.x - Math.cos(loco.ang) * 14, loco.y - Math.sin(loco.ang) * 14 - 10, 7, 1.6)
    fx.shake(3, 0.15)
    // The toot ripples down the train: every carriage and rider jumps in turn.
    for (let i = 0; i < seats.length; i++) {
      stage.after(Math.abs(i + 1 - from) * 0.07 + 0.04, () => {
        carSprings[i]?.kick(4)
        const rider = seats[i]
        if (rider && rider.state === 'ride') {
          rider.jump.kick(7)
          sfx.note(i + 2, 0.12, 'sine', 0.12)
        }
      })
    }
  }

  // ---- world -------------------------------------------------------------
  const animals: Animal[] = []
  const cows: Cow[] = []
  const cars: RoadCar[] = []
  const puffs: Puff[] = []
  const fishes: Fish[] = []
  const ducks = [
    { a: 0.4, speed: 0.22, scared: 0, r: 0.56 },
    { a: 3.3, speed: -0.17, scared: 0, r: 0.36 },
  ]
  const stationSprings = STATIONS.map(() => spring(0, 200, 8))
  const stationBalloons = STATIONS.map(() => 0)
  const stationAt = STATIONS.map(() => -10)
  // Buildings go see-through while the train is behind them.
  const stationAlpha = STATIONS.map(() => 1)
  let deliveries = 0
  let boarded = 0
  let lastTouchAt = -10
  let touched = false
  let emojiBag: string[] = []

  for (const [x, y] of [
    [640, 640],
    [748, 702],
    [815, 612],
  ] as const) {
    cows.push({ x, y, fromX: x, fromY: y, toX: x, toY: y, t: 1, mooAt: -10, homeX: x, homeY: y, hopAt: -10, flip: x > 700 ? -1 : 1, jump: spring(0, 220, 9), phase: rnd(0, 6) })
  }
  cars.push({ y: 120, color: '#ffd23f', side: '#b58a12', speed: 78, blocked: false, jump: spring(0, 220, 9) })
  cars.push({ y: 620, color: '#ff6b6b', side: '#a83434', speed: 78, blocked: false, jump: spring(0, 220, 9) })

  const duckPos = (d: { a: number; r: number }) => ({ x: POND.x + Math.cos(d.a) * POND.rx * d.r, y: POND.y + Math.sin(d.a) * POND.ry * d.r })

  const nextEmoji = (): string => {
    if (emojiBag.length === 0) {
      emojiBag = [...ANIMALS]
      for (let i = emojiBag.length - 1; i > 0; i--) {
        const j = Math.floor(stage.rand() * (i + 1))
        const tmp = emojiBag[i]!
        emojiBag[i] = emojiBag[j]!
        emojiBag[j] = tmp
      }
    }
    return emojiBag.pop()!
  }

  const spawnAnimal = (spotIndex?: number) => {
    const loco = poses[0]!
    let spot = spotIndex ?? -1
    if (spot < 0) {
      let best = -1
      for (let i = 0; i < SPOTS.length; i++) {
        if (animals.some((a) => a.spot === i && a.state === 'wait')) continue
        const [sx, sy] = SPOTS[i]!
        const d = dist(sx, sy, loco.x, loco.y)
        if (d < 230) continue
        // Prefer spots at a middling distance, with some shuffle.
        const score = -Math.abs(d - 420) + stage.rand() * 260
        if (score > best || spot < 0) {
          best = score
          spot = i
        }
      }
    }
    if (spot < 0) return
    const [x, y] = SPOTS[spot]!
    const unicorn = deliveries >= 2 && !animals.some((a) => a.emoji === '🦄') && stage.rand() < 0.4
    const animal: Animal = {
      emoji: unicorn ? '🦄' : nextEmoji(),
      state: 'wait',
      x,
      y,
      fromX: x,
      fromY: y,
      toX: x,
      toY: y,
      t: 0,
      seat: -1,
      spot,
      grow: 0,
      phase: rnd(0, 6),
      at: 0,
      jump: spring(0, 200, 8),
      station: 0,
    }
    animals.push(animal)
    stage.tween(0.45, (t) => (animal.grow = t), ease.outBack)
    if (stage.time > 0.5) {
      sfx.pop(unicorn ? 6 : 1)
      fx.ring(x, y, unicorn ? '#ffe14d' : '#ffffff', 70, 0.4)
      if (unicorn) fx.burst(x, y, { count: 18, color: RAINBOW, shape: 'star', speed: 260, life: 0.8, size: 12 })
    }
  }
  spawnAnimal(0)
  spawnAnimal(1)

  const ensureWaiting = () => {
    const want = clamp(2 + Math.floor(deliveries / 2), 2, 4)
    const waiting = animals.filter((a) => a.state === 'wait').length
    for (let i = waiting; i < want; i++) spawnAnimal()
  }

  const seatPos = (i: number): { x: number; y: number } => {
    const pose = poses[i + 1] ?? poses[poses.length - 1]!
    return { x: pose.x, y: pose.y - 14 }
  }

  const board = (animal: Animal, seat: number) => {
    seats[seat] = animal
    animal.state = 'hopOn'
    animal.seat = seat
    animal.spot = -1
    animal.fromX = animal.x
    animal.fromY = animal.y
    animal.t = 0
    boarded++
    sfx.boing(Math.min(boarded % 8, 7))
    sfx.coin(seat)
    float(animal.x, animal.y - 70, animal.emoji === '🦄' ? '🌈' : '❤️', 44, 0.8)
    locoSpring.kick(1.5)
    stage.after(1.6, ensureWaiting)
  }

  const deliver = (si: number) => {
    const st = STATIONS[si]!
    let k = 0
    let hadUnicorn = false
    for (const rider of seats) {
      if (!rider || rider.state !== 'ride' || rider.at > 0) continue
      rider.at = stage.time + k * 0.17
      rider.station = si
      rider.toX = st.px - 70 + ((k + stationBalloons[si]!) % 5) * 35
      rider.toY = st.py - 16
      if (rider.emoji === '🦄') hadUnicorn = true
      k++
    }
    if (k === 0) return
    stationAt[si] = stage.time
    deliveries++
    stationSprings[si]!.kick(4)
    fx.confetti(st.px, st.py - 80, hadUnicorn ? 90 : 50)
    if (hadUnicorn) fx.flash('#fff3b0', 0.35, 0.3)
    const grows = seats.length < MAX_CARS
    if (grows || hadUnicorn) sfx.fanfare()
    else sfx.win()
    toot(0.1, 0.3, 0.1)
    stage.after(0.5, () => (stationBalloons[si] = Math.min(8, stationBalloons[si]! + 1)))
    if (grows) stage.after(1.0, () => addCarriage())
    stage.after(1.4, ensureWaiting)
  }

  const addTrail = (x: number, y: number) => {
    const tx = clamp(x, 30, W - 30)
    const ty = clamp(y, 30, H - 44)
    const last = trail[trail.length - 1]
    if (last && dist(last.x, last.y, tx, ty) < 10) return
    trail.push({ x: tx, y: ty })
    if (trail.length > 400) trail.shift()
  }

  const startDraw = (p: Pointer) => {
    // One finger draws at a time; a second one only pokes.
    if (drawId !== null && drawId !== p.id && stage.pointers.get(drawId)?.down) return
    drawId = p.id
    pendingId = null
    addTrail(p.x, p.y)
  }

  // ---- update ------------------------------------------------------------
  const lay = (dt: number) => {
    if (drawId !== null) {
      const p = stage.pointers.get(drawId)
      if (p && p.down) addTrail(p.x, p.y)
      else drawId = null
    }
    let budget = PEN_SPEED * dt
    let laid = 0
    while (budget > 0) {
      const target = trail[0]
      if (!target) break
      const dx = target.x - pen.x
      const dy = target.y - pen.y
      const d = Math.hypot(dx, dy)
      if (d <= LAG) {
        // Reached this bit of the finger's path; the newest point is the
        // finger itself and is kept while it is still down.
        if (trail.length > 1 || drawId === null) {
          trail.shift()
          continue
        }
        break
      }
      if (endS() - trainS > MAX_AHEAD) break
      const diff = wrap(Math.atan2(dy, dx) - pen.ang)
      const k = Math.abs(diff) > Math.PI / 2 ? Math.sign(diff) / RMIN : clamp((2 * Math.sin(diff)) / d, -1 / RMIN, 1 / RMIN)
      pen.ang = wrap(pen.ang + k * STEP)
      pen.x += Math.cos(pen.ang) * STEP
      pen.y += Math.sin(pen.ang) * STEP
      pushPoint()
      budget -= STEP
      laid++
    }
    if (laid > 0) {
      clack(clamp(laid / 8, 0, 1))
      if (Math.random() < 0.5) {
        fx.burst(pen.x, pen.y, { count: 2, color: ['#fff7d6', '#e9d3a3'], speed: 120, life: 0.35, size: 7, gravity: 0 })
      }
    }
  }

  const runTrain = (dt: number) => {
    const ahead = endS() - STOP - trainS
    const boost = stage.time < boostUntil ? 1.7 : 1
    let want = 0
    if (ahead > 0.5) want = Math.min(clamp(170 + (ahead - 300) * 0.075, 170, 440) * boost, 50 + ahead * 3.2)
    speed = damp(speed, want, want > speed ? 3.2 : 9, dt)
    if (ahead <= 0.5) speed = 0
    const wasMoving = moving
    moving = speed > 12
    if (moving && !wasMoving) {
      // Setting off: a crouch, two quick chuffs and a cloud.
      locoSpring.kick(-2.5)
      const loco = poses[0]!
      steam(loco.x + Math.cos(loco.ang) * 22, loco.y + Math.sin(loco.ang) * 22 - 10, 4)
      sfx.noise({ dur: 0.16, freq: 900, to: 400, vol: 0.12 })
      idleToots = 0
    }
    if (!moving && wasMoving) {
      locoSpring.kick(3)
      for (let i = 0; i < carSprings.length; i++) stage.after(i * 0.05, () => carSprings[i]?.kick(2.5))
      sfx.noise({ dur: 0.35, freq: 4000, to: 1800, vol: 0.07, filter: 'highpass' })
      toot(0.12, 0.25, 0.09)
      nextIdleTootAt = stage.time + 6
    }
    trainS = Math.max(trainS, Math.min(endS() - STOP, trainS + speed * dt))
    computePoses()
    const loco = poses[0]!
    const inHill = (loco.flag & F_HILL) !== 0
    const onBridge = (loco.flag & F_WATER) !== 0

    // Chuffing and smoke are paced by distance, so a fast train chuffs faster.
    puffDist += speed * dt
    if (puffDist > 52) {
      puffDist = 0
      chuffFlip = !chuffFlip
      chuff = 1
      const fxp = inHill ? { x: MOUND.x - 34, y: MOUND.y - 118 } : { x: loco.x + Math.cos(loco.ang) * 22, y: loco.y + Math.sin(loco.ang) * 22 - 12 }
      steam(fxp.x, fxp.y, 1)
      if (inHill) moundSpring.kick(0.35)
      if (onBridge) {
        sfx.tone({ freq: chuffFlip ? 120 : 95, to: 60, dur: 0.09, type: 'sine', vol: 0.2 })
        fx.ring(loco.x, loco.y, '#dff4ff', 46, 0.5)
      } else {
        sfx.noise({ dur: 0.09, freq: inHill ? 320 : chuffFlip ? 1000 : 760, to: inHill ? 200 : 480, vol: chuffFlip ? 0.085 : 0.06, filter: inHill ? 'lowpass' : 'bandpass', q: 1.4 })
      }
      if (rainbow) fx.burst(fxp.x, fxp.y, { count: 2, color: RAINBOW, shape: 'star', speed: 120, life: 0.7, size: 10, gravity: -60 })
    }
    chuff = damp(chuff, 0, 9, dt)

    if (!moving) {
      if (stage.time > idlePuffAt) {
        idlePuffAt = stage.time + 0.9
        if (!inHill) steam(loco.x + Math.cos(loco.ang) * 22, loco.y + Math.sin(loco.ang) * 22 - 12, 1, 0.6)
      }
      if (touched && idleToots < 2 && stage.time > nextIdleTootAt) {
        idleToots++
        nextIdleTootAt = stage.time + 7
        toot(0, 0.16, 0.07)
        toot(0.2, 0.3, 0.07)
        locoSpring.kick(2)
        steam(loco.x - Math.cos(loco.ang) * 14, loco.y - Math.sin(loco.ang) * 14 - 10, 3, 1.3)
      }
    }

    // Things the engine drives into.
    const flag = loco.flag
    const entered = flag & ~prevFlag
    const left = prevFlag & ~flag
    prevFlag = flag
    if (entered & F_HILL) {
      toot(0, 0.2, 0.15)
      toot(0.22, 0.4, 0.15)
      for (let i = 0; i < 4; i++) toot(0.62 + i * 0.3, 0.3, 0.07 / (i + 1))
      moundSpring.kick(1.2)
      sfx.whoosh()
      for (let i = 0; i < 3; i++) {
        float(loco.x + rnd(-30, 30), loco.y - 30, '🦇', 34, 1.2 + i * 0.2, 170 + i * 40)
      }
    }
    if (left & F_HILL) {
      sfx.pop(3)
      sfx.whoosh()
      setMood('wow', 0.9)
      steam(loco.x, loco.y - 10, 8, 1.2)
      fx.ring(loco.x, loco.y, '#ffffff', 90, 0.4)
      moundSpring.kick(-0.8)
    }
    if (entered & F_WATER) {
      sfx.splat()
      for (let i = 0; i < 2; i++) {
        const dir = i === 0 ? 1 : -1
        fishes.push({ x: loco.x + dir * rnd(50, 90), y: loco.y + rnd(10, 40), dir, t: -i * 0.18 })
      }
      for (const d of ducks) {
        d.scared = 1.6
        const p = duckPos(d)
        stage.after(rnd(0.1, 0.4), () => quack(p.x, p.y))
      }
    }
    if (entered & F_ROAD) bell()
  }

  const runAnimals = (dt: number) => {
    const loco = poses[0]!
    const free = seats.findIndex((s) => s === null)
    rainbow = false
    for (let i = animals.length - 1; i >= 0; i--) {
      const a = animals[i]!
      a.phase += dt
      a.jump.update(dt)
      if (a.state === 'wait') {
        if (free >= 0 && a.grow > 0.9) {
          let near = false
          for (const pose of poses) {
            if (dist(pose.x, pose.y, a.x, a.y) < 135 && !(pose.flag & F_HILL)) {
              near = true
              break
            }
          }
          if (near && seats[free] === null) {
            board(a, free)
            continue
          }
        }
      } else if (a.state === 'hopOn') {
        a.t = Math.min(1, a.t + dt / 0.5)
        const to = seatPos(a.seat)
        const k = ease.inOutQuad(a.t)
        a.x = lerp(a.fromX, to.x, k)
        a.y = lerp(a.fromY, to.y, k) - Math.sin(a.t * Math.PI) * 120
        if (a.t === 1) {
          a.state = 'ride'
          a.at = 0
          a.jump.kick(-5)
          carSprings[a.seat]?.kick(5)
          sfx.thud(0.45)
          fx.burst(to.x, to.y, { count: 8, color: ['#ff7ac8', '#ff5d5d'], shape: 'heart', speed: 220, life: 0.7, size: 12, gravity: -80 })
        }
      } else if (a.state === 'ride') {
        const to = seatPos(a.seat)
        a.x = to.x
        a.y = to.y
        if (a.emoji === '🦄') rainbow = true
        if (a.at > 0 && stage.time >= a.at) {
          a.state = 'hopOff'
          a.fromX = a.x
          a.fromY = a.y
          a.t = 0
          carSprings[a.seat]?.kick(-4)
          seats[a.seat] = null
          sfx.boing(a.seat + 2)
        }
      } else if (a.state === 'hopOff') {
        a.t = Math.min(1, a.t + dt / 0.55)
        const k = ease.inOutQuad(a.t)
        a.x = lerp(a.fromX, a.toX, k)
        a.y = lerp(a.fromY, a.toY, k) - Math.sin(a.t * Math.PI) * 130
        if (a.t === 1) {
          a.state = 'dance'
          a.at = stage.time + 4.5
          a.jump.kick(-5)
          sfx.ding(a.seat)
          fx.burst(a.x, a.y + 20, { count: 8, color: RAINBOW, shape: 'star', speed: 240, life: 0.6, size: 11 })
        }
      } else if (a.state === 'dance') {
        if (Math.random() < dt * 0.9) float(a.x + rnd(-14, 14), a.y - 40, Math.random() < 0.5 ? '🎵' : '🎶', 26, 0.8, 60)
        if (stage.time >= a.at) {
          animals.splice(i, 1)
          sfx.pop(4)
          fx.burst(a.x, a.y, { count: 12, color: RAINBOW, shape: 'star', speed: 260, life: 0.6, size: 11 })
        }
      }
    }

    // Stations take every rider the moment the engine rolls by.
    if (seats.some((s) => s !== null && s.state === 'ride' && s.at === 0)) {
      for (let si = 0; si < STATIONS.length; si++) {
        const st = STATIONS[si]!
        if (stage.time - stationAt[si]! < 1.5) continue
        if (dist(loco.x, loco.y, st.px, st.py) < 170) {
          deliver(si)
          break
        }
      }
    }
  }

  const runWorld = (dt: number) => {
    const loco = poses[0]!
    for (const cow of cows) {
      cow.phase += dt
      cow.jump.update(dt)
      if (cow.t < 1) {
        cow.t = Math.min(1, cow.t + dt / 0.45)
        const k = ease.outQuad(cow.t)
        cow.x = lerp(cow.fromX, cow.toX, k)
        cow.y = lerp(cow.fromY, cow.toY, k)
        if (cow.t === 1) {
          sfx.thud(0.5)
          cow.jump.kick(-4)
        }
        continue
      }
      const d = dist(cow.x, cow.y, loco.x, loco.y)
      if (moving && d < 150 && stage.time - cow.mooAt > 3.5) moo(cow)
      let push: Pose | null = null
      for (const pose of poses) {
        if (dist(cow.x, cow.y, pose.x, pose.y) < 82) {
          push = pose
          break
        }
      }
      if (!push && stage.time - cow.hopAt > 7 && dist(cow.x, cow.y, cow.homeX, cow.homeY) > 20 && !poses.some((q) => dist(q.x, q.y, cow.homeX, cow.homeY) < 220)) {
        // Wander home once the train is well away.
        cow.fromX = cow.x
        cow.fromY = cow.y
        cow.toX = cow.homeX
        cow.toY = cow.homeY
        cow.t = 0
        cow.hopAt = stage.time
        cow.flip = cow.toX > cow.x ? -1 : 1
        sfx.boing(-3)
      }
      if (push && moving) {
        // Hop out of the way, to whichever side of the track the cow is on.
        const nx = -Math.sin(push.ang)
        const ny = Math.cos(push.ang)
        const side = (cow.x - push.x) * nx + (cow.y - push.y) * ny >= 0 ? 1 : -1
        cow.fromX = cow.x
        cow.fromY = cow.y
        let reach = 130
        for (let tries = 0; tries < 3; tries++) {
          cow.toX = clamp(cow.x + nx * side * reach + Math.cos(push.ang) * 30, 50, W - 50)
          cow.toY = clamp(cow.y + ny * side * reach + Math.sin(push.ang) * 30, 60, H - 80)
          if (!cows.some((o) => o !== cow && dist(o.toX, o.toY, cow.toX, cow.toY) < 80)) break
          reach += 70
        }
        cow.t = 0
        cow.hopAt = stage.time
        cow.flip = cow.toX > cow.x ? -1 : 1
        if (stage.time - cow.mooAt > 0.8) moo(cow)
      }
    }

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i]!
      car.jump.update(dt)
      let blocked = false
      let flee = false
      for (const pose of poses) {
        const off = Math.abs(pose.x - ROAD.x)
        if (off > 150) continue
        const ahead = pose.y - car.y
        if (ahead > 56 && ahead < 175) blocked = true
        else if (ahead >= -75 && ahead <= 56 && off < 100) flee = true
      }
      // Caught on the crossing: scoot clear instead of stopping under the train.
      if (flee) blocked = false
      const other = cars[(i + 1) % cars.length]!
      const gap = (other.y - car.y + H + 200) % (H + 200)
      if (other !== car && gap > 0 && gap < 110 && !flee) blocked = true
      if ((blocked || flee) && !car.blocked && car.y > 0 && car.y < H) beep(car)
      car.blocked = blocked || flee
      car.speed = damp(car.speed, flee ? 330 : blocked ? 0 : 78, blocked || flee ? 12 : 3, dt)
      car.y += car.speed * dt
      if (car.y > H + 100) car.y = -100
    }

    for (const d of ducks) {
      d.scared = Math.max(0, d.scared - dt)
      d.a += d.speed * dt * (d.scared > 0 ? 5 : 1)
    }
    for (let i = fishes.length - 1; i >= 0; i--) {
      const f = fishes[i]!
      const before = f.t
      f.t += dt / 0.9
      if (before < 0 && f.t >= 0) fx.burst(f.x, f.y, { count: 8, color: '#dff4ff', speed: 220, life: 0.45, size: 8, angle: -Math.PI / 2, spread: 1.6, gravity: 500 })
      if (f.t >= 1) {
        fx.ring(f.x + f.dir * 70, f.y, '#dff4ff', 40, 0.45)
        fx.burst(f.x + f.dir * 70, f.y, { count: 6, color: '#dff4ff', speed: 180, life: 0.4, size: 7, angle: -Math.PI / 2, spread: 1.6, gravity: 500 })
        sfx.noise({ dur: 0.12, freq: 1600, to: 500, vol: 0.12, filter: 'lowpass' })
        fishes.splice(i, 1)
      }
    }
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]!
      p.age += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx = damp(p.vx, 14, 2, dt)
      p.vy = damp(p.vy, -26, 2.5, dt)
      if (p.age >= p.life) puffs.splice(i, 1)
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i]!
      f.life -= dt
      if (f.life <= 0) floaters.splice(i, 1)
    }
    locoSpring.update(dt)
    moundSpring.update(dt)
    for (const s of carSprings) s.update(dt)
    for (const s of stationSprings) s.update(dt)
    for (let si = 0; si < STATIONS.length; si++) {
      const st = STATIONS[si]!
      const behind = poses.some((q) => Math.abs(q.x - st.x) < 110 && q.y > st.y - 110 && q.y < st.y + 80)
      stationAlpha[si] = damp(stationAlpha[si]!, behind ? 0.35 : 1, 10, dt)
    }
    if (stage.time > moodUntil) mood = 'happy'

    // Old track goes once the last carriage has passed.
    const tail = trainS - (LOCO + seats.length * (CAR + LINK)) - 30
    const drop = Math.floor((tail - 360) / STEP) - base
    if (drop > 48) {
      pts.splice(0, drop)
      base += drop
    }
    for (let i = markers.length - 1; i >= 0; i--) {
      if (markers[i]!.idx * STEP < tail - 40) markers.splice(i, 1)
    }
  }

  // ---- drawing -----------------------------------------------------------
  const trackRange = (g: CanvasRenderingContext2D, a: number, b: number) => {
    if (b - a < 1) return
    g.lineJoin = 'round'
    // Bridge deck wherever the track is over water.
    g.lineCap = 'butt'
    g.beginPath()
    let open = false
    let any = false
    for (let i = a; i <= b; i++) {
      const p = pts[i]!
      if (p.flag & F_WATER) {
        if (open) g.lineTo(p.x, p.y)
        else g.moveTo(p.x, p.y)
        open = true
        any = true
      } else open = false
    }
    if (any) {
      g.strokeStyle = '#6b4226'
      g.lineWidth = 76
      g.stroke()
      g.strokeStyle = '#c99256'
      g.lineWidth = 68
      g.stroke()
    }
    // Gravel bed everywhere else.
    g.lineCap = 'round'
    g.beginPath()
    open = false
    for (let i = a; i <= b; i++) {
      const p = pts[i]!
      if (!(p.flag & F_WATER)) {
        if (open) g.lineTo(p.x, p.y)
        else g.moveTo(p.x, p.y)
        open = true
      } else open = false
    }
    g.strokeStyle = '#bfa273'
    g.lineWidth = 56
    g.stroke()
    g.strokeStyle = '#e6d2a4'
    g.lineWidth = 48
    g.stroke()
    // Sleepers; fresh ones slam in with an overshoot.
    g.beginPath()
    const first = a + ((3 - ((base + a) % 3)) % 3)
    for (let i = first; i <= b; i += 3) {
      const p = pts[i]!
      const age = stage.time - p.born
      const len = 24.5 * (age < 0.2 ? ease.outBack(Math.max(0, age) / 0.2) : 1)
      g.moveTo(p.x - p.nx * len, p.y - p.ny * len)
      g.lineTo(p.x + p.nx * len, p.y + p.ny * len)
    }
    g.strokeStyle = '#8d5b3a'
    g.lineWidth = 9.5
    g.stroke()
    // Rails.
    for (const side of [-14, 14]) {
      g.beginPath()
      for (let i = a; i <= b; i++) {
        const p = pts[i]!
        if (i === a) g.moveTo(p.x + p.nx * side, p.y + p.ny * side)
        else g.lineTo(p.x + p.nx * side, p.y + p.ny * side)
      }
      g.strokeStyle = '#4a5361'
      g.lineWidth = 7.5
      g.stroke()
      g.strokeStyle = '#e4ebf2'
      g.lineWidth = 2.6
      g.stroke()
    }
    if (any) {
      for (const side of [-36, 36]) {
        g.beginPath()
        open = false
        for (let i = a; i <= b; i++) {
          const p = pts[i]!
          if (p.flag & F_WATER) {
            if (open) g.lineTo(p.x + p.nx * side, p.y + p.ny * side)
            else g.moveTo(p.x + p.nx * side, p.y + p.ny * side)
            open = true
          } else open = false
        }
        g.strokeStyle = '#7a4a2a'
        g.lineWidth = 8
        g.stroke()
        g.strokeStyle = '#e0ab6c'
        g.lineWidth = 3
        g.stroke()
      }
    }
  }

  const drawTrack = (g: CanvasRenderingContext2D) => {
    const tail = trainS - (LOCO + seats.length * (CAR + LINK)) - 30
    const solid = clamp(Math.floor(tail / STEP) - base, 0, pts.length - 1)
    // The stretch behind the train fades out in a few steps.
    const CHUNK = 5
    for (let c = 4; c >= 1; c--) {
      const b = solid - (c - 1) * CHUNK
      const a = b - CHUNK
      if (a < 0) continue
      g.globalAlpha = 1 - c * 0.2
      trackRange(g, a, b)
    }
    g.globalAlpha = 1
    trackRange(g, solid, pts.length - 1)
  }

  const body = (g: CanvasRenderingContext2D, x: number, y: number, ang: number, scale: number, fn: () => void) => {
    g.save()
    g.translate(x, y)
    g.rotate(ang)
    g.scale(scale * K, scale * K)
    fn()
    g.restore()
  }

  const drawCarriage = (g: CanvasRenderingContext2D, i: number) => {
    const pose = poses[i + 1]
    if (!pose) return
    const grow = carGrow[i] ?? 1
    if (grow <= 0.01) return
    const sp = carSprings[i]?.value ?? 0
    const scale = grow * (1 + sp * 0.05)
    const wob = Math.sin(stage.time * 11 + i * 1.7) * 0.035 * clamp(speed / 200, 0, 1)
    const [top, side, inner] = CAR_COLORS[i % CAR_COLORS.length]!
    body(g, pose.x + 5, pose.y + 15, pose.ang, scale, () => rrect(g, -33, -23, 66, 46, 10, 'rgba(20,40,20,0.22)'))
    body(g, pose.x, pose.y + 8, pose.ang + wob, scale, () => rrect(g, -33, -23, 66, 46, 10, side, INK, 3))
    body(g, pose.x, pose.y, pose.ang + wob, scale, () => {
      rrect(g, -33, -23, 66, 46, 10, top, INK, 3)
      rrect(g, -25, -15, 50, 30, 7, inner)
      rrect(g, -27, -19, 54, 5, 2.5, 'rgba(255,255,255,0.45)')
    })
  }

  const drawRider = (g: CanvasRenderingContext2D, i: number) => {
    const rider = seats[i]
    const pose = poses[i + 1]
    if (!rider || rider.state !== 'ride' || !pose) return
    const bounce = Math.abs(Math.sin(stage.time * 9 + i * 1.3)) * 5 * clamp(speed / 200, 0, 1)
    const j = rider.jump.value
    const next = poses[i] ?? pose
    const lean = clamp(wrap(next.ang - pose.ang) * 0.9, -0.4, 0.4)
    sprite(g, rider.emoji, pose.x, pose.y - 16 - bounce - Math.max(0, j) * 3.5, 62, lean + Math.sin(stage.time * 3 + i) * 0.06, 1 - j * 0.02, 1 + j * 0.02)
  }

  const drawLoco = (g: CanvasRenderingContext2D) => {
    const pose = poses[0]!
    const sp = locoSpring.value
    const breathe = moving ? 0 : Math.sin(stage.time * 2.4) * 0.012
    const scale = 1 + sp * 0.05 + breathe + chuff * 0.025
    const c = Math.cos(pose.ang)
    const s = Math.sin(pose.ang)
    body(g, pose.x + 6, pose.y + 17, pose.ang, scale, () => rrect(g, -48, -25, 100, 50, 13, 'rgba(20,40,20,0.24)'))
    body(g, pose.x, pose.y + 9, pose.ang, scale, () => rrect(g, -48, -25, 100, 50, 13, '#7d1f24', INK, 3))
    body(g, pose.x, pose.y, pose.ang, scale, () => {
      rrect(g, -48, -25, 94, 50, 13, '#d8403a', INK, 3)
      rrect(g, 41, -23, 11, 46, 5, '#ffd23f', INK, 3)
      rrect(g, -12, -19, 58, 38, 19, '#2f8fe8', INK, 3)
      rrect(g, -4, -13, 42, 7, 3.5, 'rgba(255,255,255,0.4)')
      g.fillStyle = '#ffd23f'
      g.fillRect(-10, -18, 4, 36)
      g.fillRect(6, -18, 4, 36)
      g.fillRect(31, -18, 4, 36)
      circle(g, 0, 0, 7, '#ffd23f', INK, 2.5)
      const fr = 11.5 * (1 + chuff * 0.25)
      circle(g, 19, 0, fr, '#2b2b33', INK, 3)
      circle(g, 19, 0, fr * 0.55, '#5b5b68')
      rrect(g, -48, -25, 38, 50, 10, '#e8453c', INK, 3)
      rrect(g, -43, -19, 28, 38, 7, '#ff8a7a')
      rrect(g, -40, -16, 7, 32, 3, 'rgba(255,255,255,0.4)')
    })
    // The face is a disc on the front that always faces the child.
    const fxp = pose.x + c * 57 * K * scale
    const fyp = pose.y + s * 57 * K * scale - 6
    const r = 32 * (1 + sp * 0.06)
    circle(g, fxp, fyp + 4, r, '#9a8f86')
    circle(g, fxp, fyp, r, '#fff1d6', INK, 3)
    ellipse(g, fxp - 19, fyp + 7, 7, 5, 'rgba(255,120,140,0.55)')
    ellipse(g, fxp + 19, fyp + 7, 7, 5, 'rgba(255,120,140,0.55)')
    let lx = c
    let ly = s
    if (!moving) {
      let tx = fxp
      let ty = fyp
      const p = stage.pointers.values().next().value
      if (p) {
        tx = p.x
        ty = p.y
      } else {
        const want = hintTarget()
        if (want) {
          tx = want.x
          ty = want.y
        }
      }
      const d = Math.max(1, dist(fxp, fyp, tx, ty))
      lx = clamp((tx - fxp) / d, -1, 1)
      ly = clamp((ty - fyp) / d, -1, 1)
    }
    face(g, fxp, fyp - 7, 8.2, mood, lx, ly, blinkAt(stage.time, 2))
  }

  const drawMarker = (g: CanvasRenderingContext2D, m: Marker) => {
    if (m.kind === 'portal') {
      const r = 31 * m.grow
      circle(g, m.x, m.y + 3, r + 7, '#6d6875')
      circle(g, m.x, m.y, r + 7, '#b9b4c4', INK, 3)
      circle(g, m.x, m.y, r, '#241a2e')
      g.strokeStyle = '#8d889a'
      g.lineWidth = 3
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.3
        g.beginPath()
        g.moveTo(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r)
        g.lineTo(m.x + Math.cos(a) * (r + 7), m.y + Math.sin(a) * (r + 7))
        g.stroke()
      }
      return
    }
    // A crossbuck with two lamps that blink while the train is near.
    const near = Math.abs(m.idx * STEP - (trainS - 80)) < 330 && (moving || Math.abs(m.idx * STEP - trainS) < 200)
    const blink = near && Math.floor(stage.time * 4) % 2 === 0
    // Stand the post on the far side of the track so it never pokes into the train.
    for (const side of [m.ny > 0 ? -1 : 1]) {
      const x = m.x + m.nx * side * 58
      const y = m.y + m.ny * side * 58
      const k = m.grow
      shadow(g, x, y + 4, 14, k)
      g.strokeStyle = INK
      g.lineWidth = 8
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x, y - 46 * k)
      g.stroke()
      g.strokeStyle = '#f4f4f4'
      g.lineWidth = 4
      g.stroke()
      const cy = y - 50 * k
      for (const d of [-1, 1]) {
        g.beginPath()
        g.moveTo(x - 15 * k, cy - 11 * k * d)
        g.lineTo(x + 15 * k, cy + 11 * k * d)
        g.strokeStyle = INK
        g.lineWidth = 10
        g.stroke()
        g.strokeStyle = '#ffffff'
        g.lineWidth = 6
        g.stroke()
      }
      const on = blink
      circle(g, x - 9 * k, cy + 19 * k, 6.5 * k, near && on ? '#ff3b3b' : '#7a2a2a', INK, 2)
      circle(g, x + 9 * k, cy + 19 * k, 6.5 * k, near && !on ? '#ff3b3b' : '#7a2a2a', INK, 2)
      if (near) circle(g, x + (on ? -9 : 9) * k, cy + 19 * k, 12 * k, 'rgba(255,80,80,0.3)')
    }
  }

  const drawRoadCar = (g: CanvasRenderingContext2D, car: RoadCar) => {
    const x = ROAD.x
    const j = car.jump.value
    const y = car.y - Math.max(0, j) * 4
    const sx = 1 + j * 0.03
    rrect(g, x - 20 + 4, car.y - 34 + 12, 44, 72, 13, 'rgba(0,0,0,0.22)')
    for (const wy of [-20, 18]) {
      rrect(g, x - 27, y + wy - 8, 9, 18, 4, '#2b2b33')
      rrect(g, x + 18, y + wy - 8, 9, 18, 4, '#2b2b33')
    }
    rrect(g, x - 22 * sx, y - 36 + 7, 44 * sx, 72, 13, car.side, INK, 3)
    rrect(g, x - 22 * sx, y - 36, 44 * sx, 72, 13, car.color, INK, 3)
    rrect(g, x - 16, y - 24, 32, 26, 7, 'rgba(255,255,255,0.35)')
    rrect(g, x - 16, y + 4, 32, 18, 6, '#bfe9ff', INK, 2.5)
    eyes(g, x, y + 13, 6, 0, car.blocked ? -0.6 : 0.7, blinkAt(stage.time, car.y > 400 ? 5 : 9), 1.2)
    circle(g, x - 14, y + 31, 4, car.blocked && Math.floor(stage.time * 5) % 2 ? '#fff' : '#fff3b0')
    circle(g, x + 14, y + 31, 4, car.blocked && Math.floor(stage.time * 5) % 2 ? '#fff' : '#fff3b0')
  }

  const drawAnimal = (g: CanvasRenderingContext2D, a: Animal) => {
    const loco = poses[0]!
    if (a.state === 'wait') {
      const near = dist(a.x, a.y, loco.x, loco.y) < 300 && moving
      const hop = near ? Math.abs(Math.sin(a.phase * 9)) * 22 : Math.max(0, Math.sin(a.phase * 2.6)) ** 6 * 16
      const j = a.jump.value
      const k = a.grow
      ellipse(g, a.x, a.y + 30, 50 * k, 18 * k, '#caa86a')
      ellipse(g, a.x, a.y + 27, 50 * k, 18 * k, '#f6dc9a')
      ellipse(g, a.x, a.y + 27, 38 * k, 12 * k, '#ffeebc')
      sprite(g, '🧳', a.x + 40, a.y + 18, 34 * k, Math.sin(a.phase * 2) * 0.05)
      shadow(g, a.x, a.y + 28, 26, k * (1 - hop / 60))
      const wave = Math.sin(a.phase * (near ? 12 : 4)) * (near ? 0.2 : 0.1)
      sprite(g, a.emoji, a.x, a.y - 8 - hop - Math.max(0, j) * 5, 70 * k, wave, 1 - j * 0.03, 1 + j * 0.03)
      if (a.emoji === '🦄' && Math.random() < 0.08) fx.burst(a.x + rnd(-30, 30), a.y + rnd(-40, 10), { count: 1, color: RAINBOW, shape: 'star', speed: 40, life: 0.6, size: 9, gravity: -40 })
      return
    }
    if (a.state === 'hopOn' || a.state === 'hopOff') {
      const stretch = 1 + Math.sin(a.t * Math.PI) * 0.18
      sprite(g, a.emoji, a.x, a.y, 62, Math.sin(a.t * TAU) * 0.35, 1 / stretch, stretch)
      return
    }
    if (a.state === 'dance') {
      const beat = a.phase * 8
      const up = Math.abs(Math.sin(beat)) * 20
      shadow(g, a.x, a.y + 26, 22, 1 - up / 50)
      const leaving = clamp((a.at - stage.time) / 0.25, 0, 1)
      sprite(g, a.emoji, a.x, a.y - up, 58 * leaving, Math.sin(beat) * 0.3, Math.sin(beat * 0.5) > 0 ? 1 : -1, 1 + Math.sin(beat * 2) * 0.06)
    }
  }

  const hintTarget = (): { x: number; y: number } | null => {
    const loco = poses[0]!
    const free = seats.some((s) => s === null)
    const riders = seats.some((s) => s !== null)
    let best: { x: number; y: number } | null = null
    let bestD = Infinity
    if (free) {
      for (const a of animals) {
        if (a.state !== 'wait') continue
        // Nearest, leaning toward whoever is in front of the engine.
        const raw = dist(a.x, a.y, loco.x, loco.y)
        const d = raw - 170 * Math.cos(Math.atan2(a.y - loco.y, a.x - loco.x) - loco.ang)
        if (d < bestD) {
          bestD = d
          best = { x: a.x, y: a.y + 10 }
        }
      }
    }
    if (!best && riders) {
      for (const st of STATIONS) {
        const d = dist(st.px, st.py, loco.x, loco.y)
        if (d < bestD) {
          bestD = d
          best = { x: st.px, y: st.py + 20 }
        }
      }
    }
    return best
  }

  const drawHint = (g: CanvasRenderingContext2D) => {
    const idle = stage.time - lastTouchAt
    if (moving || trail.length > 0 || (touched ? idle < 5 : stage.time < 0.4)) return
    const want = hintTarget()
    if (!want) return
    const t = (stage.time % 2.2) / 2.2
    const k = ease.inOutQuad(clamp((t - 0.12) / 0.62, 0, 1))
    const hx = lerp(pen.x, want.x, k)
    const hy = lerp(pen.y, want.y, k)
    const alpha = t > 0.85 ? 1 - (t - 0.85) / 0.15 : Math.min(1, t / 0.1)
    g.globalAlpha = alpha * 0.9
    g.setLineDash([16, 16])
    g.lineDashOffset = -stage.time * 40
    g.strokeStyle = '#ffffff'
    g.lineWidth = 9
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(pen.x, pen.y)
    g.lineTo(hx, hy)
    g.stroke()
    g.setLineDash([])
    g.globalAlpha = alpha
    const press = t < 0.12 ? 1.15 : 1
    sprite(g, '👆', hx + 16, hy + 34, 84 * press)
    g.globalAlpha = 1
  }

  const drawWater = (g: CanvasRenderingContext2D) => {
    g.strokeStyle = 'rgba(255,255,255,0.55)'
    g.lineWidth = 4
    g.lineCap = 'round'
    for (let i = 0; i < 6; i++) {
      const a = i * 1.9 + 0.5
      const x = POND.x + Math.cos(a) * POND.rx * 0.6 + Math.sin(stage.time * 0.7 + i) * 14
      const y = POND.y + Math.sin(a * 1.7) * POND.ry * 0.55
      const w = 14 + Math.sin(stage.time * 1.3 + i * 2) * 5
      g.beginPath()
      g.moveTo(x - w, y)
      g.quadraticCurveTo(x, y - 5, x + w, y)
      g.stroke()
    }
    for (const d of ducks) {
      const p = duckPos(d)
      const bob = Math.sin(stage.time * 3 + d.a) * 2
      const dir = -Math.sin(d.a) * d.speed > 0 ? -1 : 1
      ellipse(g, p.x, p.y + 16, 22, 7, 'rgba(255,255,255,0.35)')
      sprite(g, '🦆', p.x, p.y + bob, 44, 0, dir, 1)
    }
  }

  return {
    update(dt) {
      lay(dt)
      runTrain(dt)
      runAnimals(dt)
      runWorld(dt)
    },

    draw(g) {
      g.drawImage(backdrop, 0, 0)
      drawWater(g)
      for (let si = 0; si < STATIONS.length; si++) {
        // A soft pulse on the platform when there is someone to drop off.
        if (!seats.some((s) => s !== null && s.state === 'ride' && s.at === 0)) break
        const st = STATIONS[si]!
        const t = (stage.time * 0.8 + si * 0.5) % 1
        g.globalAlpha = (1 - t) * 0.8
        g.strokeStyle = '#fff3b0'
        g.lineWidth = 8
        g.beginPath()
        g.ellipse(st.px, st.py, 100 + t * 50, 34 + t * 26, 0, 0, TAU)
        g.stroke()
        g.globalAlpha = 1
      }

      drawTrack(g)

      // The growing end of the track glows a little, so it reads as "from here".
      if (!moving || trail.length > 0) {
        const pulse = 0.5 + Math.sin(stage.time * 5) * 0.5
        circle(g, pen.x, pen.y, 13 + pulse * 5, 'rgba(255,255,255,0.35)')
        circle(g, pen.x, pen.y, 8, '#ffe14d', '#ffffff', 3)
      }

      for (const cow of cows) {
        const graze = cow.t < 1 ? 0 : Math.sin(cow.phase * 1.4) * 0.07
        const up = cow.t < 1 ? Math.sin(cow.t * Math.PI) * 70 : Math.max(0, cow.jump.value) * 6
        shadow(g, cow.x, cow.y + 30, 38, 1 - up / 160)
        const j = cow.jump.value
        sprite(g, '🐄', cow.x, cow.y - up, 84, graze + (cow.t < 1 ? Math.sin(cow.t * TAU) * 0.3 * cow.flip : 0), cow.flip * (1 - j * 0.03), 1 + j * 0.03)
      }
      for (const car of cars) drawRoadCar(g, car)
      for (const m of markers) if (m.kind === 'xing') drawMarker(g, m)

      // Train, back to front so the engine sits on top at tight bends.
      for (let i = seats.length; i >= 1; i--) {
        const a = poses[i]
        const b = poses[i - 1]
        if (!a || !b || (carGrow[i - 1] ?? 1) < 0.5) continue
        const lenA = CAR / 2 - 2
        const lenB = i === 1 ? LOCO / 2 - 2 : CAR / 2 - 2
        g.strokeStyle = INK
        g.lineWidth = 8
        g.lineCap = 'round'
        g.beginPath()
        g.moveTo(a.x + Math.cos(a.ang) * lenA, a.y + Math.sin(a.ang) * lenA + 4)
        g.lineTo(b.x - Math.cos(b.ang) * lenB, b.y - Math.sin(b.ang) * lenB + 4)
        g.stroke()
      }
      for (let i = seats.length - 1; i >= 0; i--) {
        drawCarriage(g, i)
        drawRider(g, i)
      }
      drawLoco(g)

      drawMound(g, moundSpring.value, stage.time)
      for (const m of markers) if (m.kind === 'portal') drawMarker(g, m)
      for (let si = 0; si < STATIONS.length; si++) {
        g.globalAlpha = stationAlpha[si]!
        drawStation(g, STATIONS[si] as Station, stationSprings[si]!.value, stage.time, stationBalloons[si]!)
        g.globalAlpha = 1
      }

      for (const a of animals) if (a.state === 'wait' || a.state === 'dance') drawAnimal(g, a)
      for (const f of fishes) {
        if (f.t < 0) continue
        const x = f.x + f.dir * f.t * 70
        const y = f.y - Math.sin(f.t * Math.PI) * 110
        sprite(g, '🐟', x, y, 46, (f.t - 0.5) * 2.4 * -f.dir + (f.dir > 0 ? Math.PI : 0), 1, f.dir > 0 ? -1 : 1)
      }
      for (const p of puffs) {
        const t = p.age / p.life
        const pr = p.r * (0.5 + ease.outCubic(t) * 1.5)
        g.globalAlpha = (1 - t) * 0.3
        circle(g, p.x + 2, p.y + 4, pr, '#6f8aa0')
        g.globalAlpha = (1 - t) * 0.9
        circle(g, p.x, p.y, pr, p.color)
      }
      g.globalAlpha = 1
      for (const a of animals) if (a.state === 'hopOn' || a.state === 'hopOff') drawAnimal(g, a)

      drawHint(g)

      // Same motion as the kit's floating text: pop in, drift up, fade.
      for (const f of floaters) {
        const t = 1 - f.life / f.max
        const pop = t < 0.18 ? ease.outBack(t / 0.18) : 1
        if (pop <= 0.02) continue
        g.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1
        const y = f.y - f.rise * (1 - (1 - t) ** 2)
        if (f.img) {
          const k = (f.size * pop) / WORD_PX
          g.drawImage(f.img, f.x - (f.img.width * k) / 2, y - (f.img.height * k) / 2, f.img.width * k, f.img.height * k)
        } else {
          sprite(g, f.emoji, f.x, y, f.size * pop)
        }
      }
      g.globalAlpha = 1
      const next = warm.pop()
      if (next) sprite(g, next, -400, -400, 8)
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      touched = true
      fx.ring(p.x, p.y, '#ffffff', 44, 0.3)

      // Poke something: it answers, and a drag that starts on it still draws.
      for (let i = 0; i < poses.length; i++) {
        const pose = poses[i]!
        if (pose.flag & F_HILL) continue
        const nose = i === 0 && dist(p.x, p.y, pose.x + Math.cos(pose.ang) * 66, pose.y + Math.sin(pose.ang) * 66) < 52
        if (nose || dist(p.x, p.y, pose.x, pose.y) < (i === 0 ? 74 : 56)) {
          whistle(i)
          pendingId = p.id
          return
        }
      }
      for (const a of animals) {
        if ((a.state === 'wait' || a.state === 'dance') && dist(p.x, p.y, a.x, a.y) < 62) {
          a.jump.kick(8)
          sfx.boing(Math.floor(rnd(2, 6)))
          fx.burst(a.x, a.y - 30, { count: 5, color: ['#ff7ac8', '#ff5d5d'], shape: 'heart', speed: 180, life: 0.6, size: 11, gravity: -80 })
          if (a.state === 'wait') startDraw(p)
          else pendingId = p.id
          return
        }
      }
      for (const cow of cows) {
        if (dist(p.x, p.y, cow.x, cow.y) < 56) {
          moo(cow)
          pendingId = p.id
          return
        }
      }
      for (const car of cars) {
        if (Math.abs(p.x - ROAD.x) < 42 && Math.abs(p.y - car.y) < 52) {
          beep(car)
          pendingId = p.id
          return
        }
      }
      for (const d of ducks) {
        const dp = duckPos(d)
        if (dist(p.x, p.y, dp.x, dp.y) < 48) {
          quack(dp.x, dp.y)
          d.scared = 1.4
          pendingId = p.id
          return
        }
      }
      for (let si = 0; si < STATIONS.length; si++) {
        const st = STATIONS[si]!
        if (Math.abs(p.x - st.x) < 66 && Math.abs(p.y - st.y) < 62) {
          stationSprings[si]!.kick(4)
          sfx.ding(si * 2)
          sfx.ding(si * 2 + 2)
          fx.burst(st.x, st.y - 60, { count: 8, color: RAINBOW, shape: 'star', speed: 220, life: 0.6, size: 10 })
          pendingId = p.id
          return
        }
      }
      const z = zone(p.x, p.y)
      if (z & F_WATER) {
        sfx.splat()
        fx.ring(p.x, p.y, '#dff4ff', 70, 0.5)
        fx.burst(p.x, p.y, { count: 10, color: '#dff4ff', speed: 260, life: 0.5, size: 8, angle: -Math.PI / 2, spread: 1.8, gravity: 600 })
        if (fishes.length < 3) fishes.push({ x: p.x - 35, y: p.y, dir: 1, t: 0 })
      }
      if (z & F_HILL) {
        moundSpring.kick(1)
        sfx.thud(0.5)
      }
      startDraw(p)
      if (dist(p.x, p.y, pen.x, pen.y) <= LAG) sfx.pop(1)
    },

    move(p: Pointer) {
      if (p.id === pendingId && dist(p.x, p.y, p.startX, p.startY) > 22) startDraw(p)
      if (p.id === drawId) {
        lastTouchAt = stage.time
        addTrail(p.x, p.y)
      }
    },

    up(p: Pointer) {
      if (p.id === pendingId) pendingId = null
      if (p.id === drawId) {
        addTrail(p.x, p.y)
        drawId = null
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'choo-choo-draw',
    name: 'Choo-Choo Draw',
    emoji: '🚂',
    ages: [3, 6],
    pitch: 'Draw track with a finger and a little steam train follows every wiggle, picking up animals and dropping them at the station.',
    howTo: 'Drag anywhere to lay track. Pass animals to pick them up, pass a station to drop them off. Tap the train to toot.',
    basedOn: 'BRIO World Railway, Thomas track builders',
    whyFun: 'The line turns solid under the finger with a clack, and the train and its swinging carriages are the payoff; tunnel, bridge, cows and a level crossing are there to find.',
  },
  create,
}
