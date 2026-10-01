// Whack-a-Mole: a garden with nine holes and a big squeaky toy hammer.
// Tap a mole and the hammer swings down on it: pancake, stars, dizzy sink.
// New visitors arrive as the bonks add up: a hard-hat mole (two bonks), a
// golden mole (coin shower), a carrot thief that tunnels between holes, a
// bunny that boxes the hammer away, a dance party every twenty bonks and a
// giant boss that bursts into a frenzy of little moles.

import { blinkAt, circle, ellipse, eyes, hint, label, line, rrect, sprite, star } from '../../kit/draw.ts'
import { TAU, clamp, damp, dist, ease, lerp, pick, rnd, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'

type Kind = 'mole' | 'hardhat' | 'gold' | 'carrot' | 'bunny' | 'boss' | 'mini'
type State = 'peek' | 'rise' | 'up' | 'taunt' | 'duck' | 'hit' | 'box'
type Mood = 'happy' | 'taunt' | 'dizzy' | 'wow' | 'grumpy' | 'joy'
type Phase = 'play' | 'dance' | 'bossIntro' | 'boss' | 'frenzy'

interface Mole {
  kind: Kind
  state: State
  t: number
  // 0 is underground, 1 is fully out.
  up: number
  stay: number
  hp: number
  // Vertical scale: 1 is normal, 0.28 is a pancake.
  sq: Spring
  lean: Spring
  scale: number
  seed: number
  hat: boolean
  dancer: boolean
  hops: number
  wow: number
  sinceHit: number
}

interface Hole {
  x: number
  y: number
  s: number
  row: number
  mole: Mole | null
  // Seconds of worm left.
  worm: number
  // 1 normally, grows for the boss.
  size: number
  reserved: boolean
  jolt: Spring
}

interface Hammer {
  x: number
  y: number
  dir: number
  t: number
  landed: boolean
  impact: () => void
  // Where the head it landed on is now, so the hammer rides the squash.
  track: (() => number) | null
  fly: { vx: number; vy: number; spin: number; rot: number; ox: number; oy: number } | null
}

interface Flower {
  x: number
  y: number
  char: string
  grow: number
  seed: number
}

interface Debris {
  char: string
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  ground: number
  size: number
  rest: number
}

interface Coin {
  x: number
  y: number
  t: number
  i: number
}

interface Flyer {
  x: number
  y: number
  to: number
  t: number
  dur: number
}

interface Tunnel {
  from: number
  to: number
  t: number
  mole: Mole
  puff: number
}

interface Cloud {
  x: number
  y: number
  s: number
  v: number
  sq: Spring
}

interface Palette {
  body: string
  dark: string
  belly: string
  snout: string
}

const PALETTE: Record<Kind, Palette> = {
  mole: { body: '#9a6240', dark: '#5e3820', belly: '#d9aa7f', snout: '#f0cba6' },
  mini: { body: '#b0754c', dark: '#6b4226', belly: '#e6bd95', snout: '#f6d8b8' },
  hardhat: { body: '#8a5a3c', dark: '#54331d', belly: '#d2a27a', snout: '#efc8a2' },
  gold: { body: '#ffc928', dark: '#b97a00', belly: '#fff0a0', snout: '#fff6c8' },
  carrot: { body: '#7d6a96', dark: '#463a5c', belly: '#c4b5d8', snout: '#e6dcf2' },
  bunny: { body: '#fffaf4', dark: '#c9b5a8', belly: '#ffffff', snout: '#ffffff' },
  boss: { body: '#6e4128', dark: '#3a1f10', belly: '#b98760', snout: '#e2b78e' },
}

const ROW_Y = [332, 506, 692]
const ROW_S = [0.86, 1, 1.14]
const HUD_X = 96
const HUD_Y = 62
const SWING = 0.05
const HAMMER = 1.35
const BONK_WORDS = ['BONK!', 'BOINK!', 'BOP!', 'DOINK!', 'BAM!']
const FLOWERS = ['🌼', '🌸', '🌷', '🌻', '🌺']

function bodyPath(g: CanvasRenderingContext2D, r: number, top: number): void {
  g.beginPath()
  g.moveTo(-r, 90)
  g.lineTo(-r, top + r)
  g.arc(0, top + r, r, Math.PI, 0)
  g.lineTo(r, 90)
  g.closePath()
}

function crossEyes(g: CanvasRenderingContext2D, y: number, size: number, gap: number): void {
  g.strokeStyle = '#1e1428'
  g.lineWidth = size * 0.4
  g.lineCap = 'round'
  for (const side of [-1, 1]) {
    const ex = side * gap
    g.beginPath()
    g.moveTo(ex - size * 0.7, y - size * 0.7)
    g.lineTo(ex + size * 0.7, y + size * 0.7)
    g.moveTo(ex + size * 0.7, y - size * 0.7)
    g.lineTo(ex - size * 0.7, y + size * 0.7)
    g.stroke()
  }
}

function joyEyes(g: CanvasRenderingContext2D, y: number, size: number, gap: number): void {
  g.strokeStyle = '#1e1428'
  g.lineWidth = size * 0.42
  g.lineCap = 'round'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.arc(side * gap, y + size * 0.3, size * 0.8, 1.15 * Math.PI, 1.85 * Math.PI)
    g.stroke()
  }
}

function hardHat(g: CanvasRenderingContext2D, top: number): void {
  g.beginPath()
  g.arc(0, top + 44, 66, Math.PI, 0)
  g.closePath()
  g.fillStyle = '#ffd21f'
  g.fill()
  g.lineWidth = 5
  g.strokeStyle = '#b98500'
  g.stroke()
  rrect(g, -84, top + 36, 168, 18, 9, '#ffd21f', '#b98500', 5)
  rrect(g, -9, top - 24, 18, 60, 8, '#ffe469')
  ellipse(g, -34, top + 8, 14, 8, 'rgba(255,255,255,0.55)', -0.6)
}

// A mole in its own coordinates: the hole's rim is y = 0, the top of the head
// is y = -150. The caller has already set the clip, the squash and the rise.
function drawMole(g: CanvasRenderingContext2D, m: Mole, mood: Mood, time: number, lookX: number, lookY: number): void {
  const p = PALETTE[m.kind]
  const R = 70
  const top = -150

  // Ears behind the head.
  for (const side of [-1, 1]) {
    circle(g, side * 52, top + 22, 17, p.body, p.dark, 5)
    circle(g, side * 52, top + 22, 8, '#ff9db0')
  }
  // Arms up for the carrot thief.
  if (m.kind === 'carrot') {
    const wob = Math.sin(time * 9 + m.seed) * 0.12
    line(g, -48, -96, -24, -178, p.dark, 24)
    line(g, 48, -96, 24, -178, p.dark, 24)
    line(g, -48, -96, -24, -178, p.body, 16)
    line(g, 48, -96, 24, -178, p.body, 16)
    sprite(g, '🥕', 0, -200, 84, wob - 0.7)
  }

  bodyPath(g, R, top)
  g.fillStyle = p.body
  g.fill()
  g.lineWidth = 6
  g.strokeStyle = p.dark
  g.stroke()
  if (m.kind === 'boss' && m.hp < 10) {
    bodyPath(g, R, top)
    g.fillStyle = `rgba(255,50,40,${(10 - m.hp) * 0.05})`
    g.fill()
  }
  // Belly and a soft highlight so it reads as round, not flat.
  ellipse(g, 0, -8, 44, 50, p.belly)
  ellipse(g, -30, top + 30, 22, 13, 'rgba(255,255,255,0.28)', -0.6)

  // Thief mask.
  if (m.kind === 'carrot') rrect(g, -58, -122, 116, 36, 18, '#2a2138')

  // Cheeks.
  circle(g, -46, -76, 11, 'rgba(255,120,140,0.45)')
  circle(g, 46, -76, 11, 'rgba(255,120,140,0.45)')

  // Eyes.
  const eyeY = -104
  if (mood === 'dizzy') crossEyes(g, eyeY, 12, 25)
  else if (mood === 'joy') joyEyes(g, eyeY, 13, 25)
  else {
    const size = mood === 'wow' ? 17 : 14
    const blink = mood === 'taunt' ? 0.6 : m.state === 'up' && m.t > 1 ? blinkAt(time, m.seed) : 0
    eyes(g, 0, eyeY, size, lookX, lookY, blink, 25 / size)
  }
  if (mood === 'grumpy' || mood === 'taunt') {
    g.strokeStyle = p.dark
    g.lineWidth = 7
    g.lineCap = 'round'
    const tilt = mood === 'grumpy' ? 9 : -6
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * 42, -128 - tilt)
      g.lineTo(side * 12, -128 + tilt)
      g.stroke()
    }
  }

  // Snout, nose, whiskers.
  ellipse(g, 0, -68, 34, 25, p.snout)
  g.strokeStyle = p.dark
  g.lineWidth = 2.5
  g.lineCap = 'round'
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      g.beginPath()
      g.moveTo(side * 30, -70 + i * 4)
      g.lineTo(side * 62, -72 + i * 11)
      g.stroke()
    }
  }
  ellipse(g, 0, -84, 15, 11, '#ff6f91')
  ellipse(g, -4, -87, 5, 3, 'rgba(255,255,255,0.7)')

  // Mouth.
  g.strokeStyle = '#1e1428'
  g.fillStyle = '#1e1428'
  g.lineWidth = 4
  if (mood === 'happy' || mood === 'joy') {
    g.beginPath()
    g.arc(0, -74, 17, 0.12 * Math.PI, 0.88 * Math.PI)
    g.stroke()
    rrect(g, -10, -59, 9, 12, 3, '#ffffff', '#1e1428', 2)
    rrect(g, 1, -59, 9, 12, 3, '#ffffff', '#1e1428', 2)
  } else if (mood === 'taunt') {
    ellipse(g, 0, -60, 15, 9, '#3a1420')
    g.save()
    g.translate(0, -60)
    g.rotate(Math.sin(time * 34) * 0.35)
    rrect(g, -9, -2, 18, 34, 9, '#ff7a9a', '#c94a6a', 2.5)
    line(g, 0, 4, 0, 22, '#c94a6a', 2)
    g.restore()
  } else if (mood === 'dizzy') {
    g.beginPath()
    g.moveTo(-16, -58)
    g.quadraticCurveTo(-8, -66, 0, -58)
    g.quadraticCurveTo(8, -50, 16, -58)
    g.stroke()
    rrect(g, 4, -58, 13, 18, 6, '#ff7a9a', '#c94a6a', 2)
  } else if (mood === 'wow') {
    ellipse(g, 0, -56, 10, 12, '#3a1420')
  } else {
    g.beginPath()
    g.arc(0, -44, 15, 1.2 * Math.PI, 1.8 * Math.PI)
    g.stroke()
    rrect(g, -9, -58, 8, 9, 2, '#ffffff', '#1e1428', 2)
    rrect(g, 1, -58, 8, 9, 2, '#ffffff', '#1e1428', 2)
  }

  // Hats.
  if (m.kind === 'hardhat' && m.hat) hardHat(g, top)
  if (m.kind === 'boss') sprite(g, '👑', 0, top - 18, 92, Math.sin(time * 3) * 0.06)
  if (m.dancer) {
    g.beginPath()
    g.moveTo(-32, top + 12)
    g.lineTo(6, top - 66)
    g.lineTo(38, top + 6)
    g.closePath()
    g.fillStyle = ['#ff5d8f', '#4db8ff', '#b07cff', '#5ed36a'][Math.floor(m.seed) % 4]!
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = 'rgba(30,20,40,0.5)'
    g.stroke()
    circle(g, 6, top - 68, 11, '#ffe14d', 'rgba(30,20,40,0.5)', 3)
  }
  if (m.kind === 'gold') {
    for (let i = 0; i < 4; i++) {
      const a = time * 2 + i * 1.7 + m.seed
      const tw = Math.abs(Math.sin(time * 5 + i * 2.1))
      star(g, Math.cos(a) * 92, -80 + Math.sin(a * 1.3) * 66, 5 + tw * 11, '#fffbe0', time * 2 + i)
    }
  }
}

function drawBunny(g: CanvasRenderingContext2D, m: Mole, mood: Mood, time: number, lookX: number, lookY: number): void {
  const p = PALETTE.bunny
  const top = -140
  const flop = m.lean.value * 2.4
  for (const side of [-1, 1]) {
    g.save()
    g.translate(side * 28, top + 18)
    g.rotate(side * 0.16 + flop + Math.sin(time * 3 + side) * 0.05 + (mood === 'grumpy' ? side * 0.5 : 0))
    ellipse(g, 0, -62, 19, 66, p.dark)
    ellipse(g, 0, -62, 15, 62, p.body)
    ellipse(g, 0, -58, 7, 46, '#ffb3c6')
    g.restore()
  }
  bodyPath(g, 66, top)
  g.fillStyle = p.body
  g.fill()
  g.lineWidth = 6
  g.strokeStyle = p.dark
  g.stroke()
  ellipse(g, -28, top + 28, 20, 12, 'rgba(255,255,255,0.9)', -0.6)
  circle(g, -44, -66, 13, 'rgba(255,130,160,0.55)')
  circle(g, 44, -66, 13, 'rgba(255,130,160,0.55)')
  eyes(g, 0, -96, 14, lookX, lookY, m.state === 'up' && m.t > 1 ? blinkAt(time, m.seed) : 0, 1.7)
  g.strokeStyle = '#1e1428'
  g.lineCap = 'round'
  if (mood === 'grumpy') {
    g.lineWidth = 7
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * 44, -128)
      g.lineTo(side * 12, -114)
      g.stroke()
    }
  }
  // Nose and mouth.
  g.beginPath()
  g.moveTo(-9, -76)
  g.lineTo(9, -76)
  g.lineTo(0, -66)
  g.closePath()
  g.fillStyle = '#ff6f91'
  g.fill()
  g.lineWidth = 3.5
  g.beginPath()
  if (mood === 'grumpy') {
    g.arc(0, -46, 13, 1.2 * Math.PI, 1.8 * Math.PI)
  } else {
    g.arc(-8, -64, 8, 0.1 * Math.PI, 0.9 * Math.PI)
    g.moveTo(16, -62)
    g.arc(8, -64, 8, 0.1 * Math.PI, 0.9 * Math.PI)
  }
  g.stroke()
  if (mood !== 'grumpy') {
    rrect(g, -8, -57, 7, 11, 2, '#ffffff', '#1e1428', 2)
    rrect(g, 1, -57, 7, 11, 2, '#ffffff', '#1e1428', 2)
  }
}

function drawHammerShape(g: CanvasRenderingContext2D, squashY: number): void {
  // Drawn relative to the pivot (the hand). The head sits up and to the left.
  const hx = -160
  const hy = -50
  line(g, 14, 4, hx, hy, '#b86a00', 28)
  line(g, 14, 4, hx, hy, '#ffc93c', 20)
  line(g, 14, 4, -30, -10, '#ff7a3c', 24)
  g.save()
  g.translate(hx, hy)
  g.rotate(0.3)
  // Squash the squeaky head against whatever it hit (its bottom face).
  g.translate(0, 44)
  g.scale(1 + (1 - squashY) * 0.6, squashY)
  g.translate(0, -44)
  rrect(g, -52, -44, 104, 88, 28, '#ff4757', '#a81c2c', 6)
  rrect(g, -58, -50, 116, 20, 10, '#ffd43b', '#b98500', 4)
  rrect(g, -58, 30, 116, 20, 10, '#ffd43b', '#b98500', 4)
  ellipse(g, -26, -8, 9, 22, 'rgba(255,255,255,0.4)')
  star(g, 10, 0, 20, '#ffe98a', 0.2)
  g.restore()
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  const holes: Hole[] = []
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3)
    const col = i % 3
    holes.push({
      x: W / 2 + (col - 1) * 322 * ROW_S[row]!,
      y: ROW_Y[row]!,
      s: ROW_S[row]!,
      row,
      mole: null,
      worm: 0,
      size: 1,
      reserved: false,
      jolt: spring(0, 300, 12),
    })
  }

  const hammers: Hammer[] = []
  const flowers: Flower[] = []
  const debris: Debris[] = []
  const coins: Coin[] = []
  const flyers: Flyer[] = []
  const tunnels: Tunnel[] = []
  const clouds: Cloud[] = [
    { x: 210, y: 70, s: 1, v: 9, sq: spring(1, 160, 8) },
    { x: 610, y: 48, s: 0.75, v: 14, sq: spring(1, 160, 8) },
    { x: 900, y: 96, s: 0.6, v: 6, sq: spring(1, 160, 8) },
  ]
  const sun = { x: 1082, y: 90, dizzy: 0, sq: spring(1, 200, 9), spin: 0 }
  const hud = spring(1, 260, 10)

  let phase: Phase = 'play'
  let score = 0
  let bonks = 0
  let streak = 0
  // 0 is gentle, 1 is quick. Rises with bonks, drops when moles get away.
  let heat = 0
  let spawned = 0
  let spawnCd = 0.05
  let lastHole = -1
  let level = 0
  const forced: Kind[] = []
  let nextDanceAt = 20
  let nextBossAt = 28
  let bosses = 0
  let danceT = 0
  let rumbleT = 0
  let rumbleStep = 0
  let frenzyT = 0
  let lastTouchAt = 0
  let lookX = W / 2
  let lookY = H / 2
  let lookAt = -10
  let sparkleAt = 0

  // The garden never changes, so paint it once.
  const back = document.createElement('canvas')
  back.width = W
  back.height = H
  const bg = back.getContext('2d')
  if (bg) paintGarden(bg, stage)

  const raspberry = (low = false) => {
    const f = low ? 62 : rnd(96, 128)
    for (let i = 0; i < 7; i++) sfx.tone({ freq: f * (i % 2 ? 1.18 : 1), to: f * 0.82, dur: 0.045, type: 'sawtooth', vol: low ? 0.16 : 0.1, delay: i * 0.04 })
    sfx.noise({ dur: 0.3, vol: 0.05, freq: 500, filter: 'lowpass' })
  }
  const bonkSound = (pitch = 1) => {
    const v = pitch * rnd(0.86, 1.18)
    sfx.thud(0.8)
    sfx.tone({ freq: 520 * v, to: 170 * v, dur: 0.15, type: 'square', vol: 0.16 })
    sfx.tone({ freq: 950 * v, to: 1500 * v, dur: 0.07, type: 'sine', vol: 0.1, delay: 0.05 })
  }

  const makeMole = (kind: Kind): Mole => ({
    kind,
    state: 'peek',
    t: 0,
    up: 0,
    stay: 3,
    hp: kind === 'boss' ? 10 : kind === 'hardhat' ? 2 : 1,
    sq: spring(1, 230, 9),
    lean: spring(0, 150, 7),
    scale: kind === 'boss' ? 1.7 : kind === 'mini' ? 0.78 : 1,
    seed: rnd(0, 40),
    hat: kind === 'hardhat',
    dancer: false,
    hops: kind === 'carrot' ? 2 : 0,
    wow: 0,
    sinceHit: 9,
  })

  const stayFor = (kind: Kind): number => {
    if (spawned < 3) return 7
    const base = lerp(3.1, 1.55, heat) + rnd(0, 0.4)
    if (kind === 'carrot') return Math.max(1.5, base * 0.62)
    if (kind === 'bunny') return 2.2
    if (kind === 'gold') return Math.max(1.9, base * 0.8)
    if (kind === 'hardhat') return base + 0.8
    return base
  }

  const freeHoles = (): number[] => {
    const out: number[] = []
    for (let i = 0; i < 9; i++) {
      const h = holes[i]!
      if (!h.mole && !h.reserved && h.worm <= 0) out.push(i)
    }
    return out
  }

  const spawn = (kind: Kind, at: number, quick = false): Mole => {
    const h = holes[at]!
    const m = makeMole(kind)
    m.stay = stayFor(kind)
    if (quick) {
      m.state = 'rise'
      popOut(h)
    }
    h.mole = m
    h.worm = 0
    spawned++
    return m
  }

  const popOut = (h: Hole) => {
    sfx.tone({ freq: rnd(280, 340), to: rnd(620, 760), dur: 0.11, type: 'sine', vol: 0.16 })
    fx.burst(h.x, h.y, { count: 7, color: ['#8b5a2b', '#a9713d', '#6b3f1d'], speed: 260, angle: -Math.PI / 2, spread: 1.6, life: 0.45, size: 9, gravity: 900 })
    h.jolt.kick(-90)
  }

  const headY = (h: Hole, m: Mole): number => h.y - 150 * h.s * m.scale * m.up * m.sq.value

  const pickKind = (): Kind => {
    const next = forced.shift()
    if (next) return next
    const r = Math.random()
    if (level >= 4 && r < 0.11) return 'bunny'
    if (level >= 3 && r < 0.22) return 'carrot'
    if (level >= 2 && r < 0.29) return 'gold'
    if (level >= 1 && r < 0.48) return 'hardhat'
    return 'mole'
  }

  const addScore = (n: number) => {
    score += n
    hud.value = 1.35
  }

  const stars = (x: number, y: number, count = 9) => {
    fx.burst(x, y, { count, color: ['#ffe14d', '#fff7b8', '#ffb02e'], speed: 520, life: 0.55, size: 15, shape: 'star', gravity: 700, angle: -Math.PI / 2, spread: Math.PI * 1.3 })
  }

  const counted = () => {
    bonks++
    streak++
    heat = Math.min(1, heat + 0.035)
    if (streak > 0 && streak % 10 === 0) {
      fx.text(W / 2, 190, `${streak} IN A ROW!`, { color: '#ffffff', size: 58, life: 1.1 })
      sfx.win()
    }
  }

  const flatten = (m: Mole) => {
    m.state = 'hit'
    m.t = 0
    m.sq.value = 0.28
    m.sq.vel = 0
    m.sq.target = 0.74
    m.lean.kick(rnd(-3, 3))
  }

  // What happens when the hammer lands on a mole.
  const bonk = (at: number, m: Mole, hm: Hammer) => {
    const h = holes[at]!
    const hx = h.x
    const hy = headY(h, m)
    h.jolt.kick(140)

    if (m.state === 'hit') {
      // Already dizzy: squish it again for fun, no points.
      m.sq.value = 0.4
      m.t = Math.min(m.t, 0.35)
      bonkSound(1.35)
      stars(hx, hy, 5)
      fx.shake(3)
      return
    }

    if (m.kind === 'bunny') {
      m.state = 'box'
      m.t = 0
      m.sq.value = 0.8
      m.lean.kick(hm.dir * 4)
      hm.fly = { vx: hm.dir * rnd(700, 1000), vy: -1300, spin: hm.dir * 17, rot: 0, ox: 0, oy: 0 }
      sfx.boing(2)
      sfx.nope()
      sfx.tone({ freq: 760, to: 1100, dur: 0.12, type: 'triangle', vol: 0.16, delay: 0.05 })
      fx.text(hx, hy - 70, 'HEY!', { color: '#ff8fb0', size: 50 })
      fx.burst(hx + hm.dir * 50, hy - 20, { count: 8, color: '#ffffff', speed: 380, life: 0.35, size: 12, shape: 'spark' })
      fx.shake(5)
      streak = 0
      return
    }

    if (m.kind === 'boss') {
      m.hp--
      m.sinceHit = 0
      m.sq.value = 0.55
      m.lean.kick(hm.dir * -2.5)
      stars(hx, hy, 6)
      if (m.hp > 0) {
        bonkSound(0.7 + (10 - m.hp) * 0.06)
        sfx.note(10 - m.hp, 0.14, 'triangle', 0.2)
        fx.shake(6 + (10 - m.hp) * 0.6)
        fx.hitstop(30)
        fx.text(hx + rnd(-170, 170), hy + rnd(-40, 60), pick(BONK_WORDS), { color: '#fff3b0', size: 40 + (10 - m.hp) * 3 })
        return
      }
      // Kaboom: the boss bursts into a frenzy of little moles.
      h.mole = null
      bosses++
      bonks++
      addScore(10)
      const by = h.y - 140
      fx.hitstop(90)
      fx.shake(22, 0.5)
      fx.flash('#ffffff', 0.7, 0.3)
      fx.confetti(hx, by, 90)
      fx.burst(hx, by, { count: 40, color: ['#6e4128', '#9a6240', '#ffe14d', '#ffffff'], speed: 900, life: 0.8, size: 18, gravity: 900 })
      fx.ring(hx, by, '#ffffff', 420, 0.5)
      fx.text(hx, by - 60, 'KABOOM!', { color: '#ffe14d', size: 96, life: 1.3 })
      sfx.noise({ dur: 0.55, vol: 0.35, freq: 1200, to: 80, filter: 'lowpass' })
      sfx.thud(1)
      sfx.fanfare()
      debris.push({ char: '👑', x: hx, y: by - 100, vx: rnd(-160, 160), vy: -900, rot: 0, spin: rnd(-6, 6), ground: h.y + 96, size: 70, rest: 0 })
      let k = 0
      for (let i = 0; i < 9; i++) {
        if (i === at) continue
        const to = holes[i]!
        if (to.mole) to.mole = null
        to.reserved = true
        flyers.push({ x: hx, y: by, to: i, t: -k * 0.045, dur: rnd(0.55, 0.85) })
        k++
      }
      phase = 'frenzy'
      frenzyT = 8
      return
    }

    if (m.kind === 'hardhat' && m.hat) {
      // First bonk knocks the hat off; the mole stays, stunned.
      m.hat = false
      m.hp = 1
      m.sq.value = 0.6
      m.wow = 0.7
      m.state = 'up'
      m.t = Math.min(m.t, m.stay - 1.9)
      debris.push({ char: 'hat', x: hx, y: hy - 10, vx: rnd(-260, 260), vy: -820, rot: 0, spin: rnd(-9, 9), ground: clamp(h.y + rnd(50, 90), 250, H - 70), size: h.s, rest: 0 })
      sfx.thud(0.7)
      sfx.tone({ freq: 1250, to: 880, dur: 0.22, type: 'square', vol: 0.11 })
      sfx.ding(3)
      fx.burst(hx, hy, { count: 10, color: ['#ffd21f', '#ffffff'], speed: 460, life: 0.4, size: 11, shape: 'spark' })
      fx.text(hx, hy - 50, 'CLANG!', { color: '#ffd21f', size: 44 })
      fx.shake(5)
      fx.hitstop(40)
      return
    }

    // A proper bonk.
    flatten(m)
    counted()
    bonkSound()
    sfx.note(Math.min(streak - 1, 14), 0.12, 'triangle', 0.14)
    stars(hx, hy)
    fx.ring(hx, hy, '#ffffff', 110, 0.25)
    fx.shake(m.kind === 'mini' ? 4 : 6)
    fx.hitstop(m.kind === 'mini' ? 35 : 55)
    fx.text(hx + rnd(-20, 20), hy - 54, pick(BONK_WORDS), { color: '#fff3b0', size: 38 + Math.min(streak, 8) * 2.5 })

    if (m.kind === 'gold') {
      for (let i = 0; i < 10; i++) coins.push({ x: hx + rnd(-40, 40), y: hy + rnd(-30, 20), t: -i * 0.06, i })
      fx.burst(hx, hy, { count: 26, color: ['#ffd21f', '#fff2a8', '#ffb400'], speed: 700, life: 0.9, size: 13, gravity: 1300, angle: -Math.PI / 2, spread: 1.5 })
      fx.flash('#ffe14d', 0.28, 0.2)
      fx.text(hx, hy - 110, 'JACKPOT!', { color: '#ffe14d', size: 62, life: 1.1 })
      sfx.win()
    } else if (m.kind === 'carrot') {
      m.kind = 'mole'
      addScore(3)
      debris.push({ char: '🥕', x: hx, y: hy - 40, vx: rnd(-200, 200), vy: -950, rot: 0, spin: rnd(-10, 10), ground: clamp(h.y + rnd(60, 100), 250, H - 70), size: 70, rest: 0 })
      fx.text(hx, hy - 110, 'GOT IT!', { color: '#ffa94d', size: 46 })
      sfx.coin(4)
    } else {
      addScore(1)
    }
  }

  const thumpHole = (at: number) => {
    const h = holes[at]!
    h.jolt.kick(160)
    sfx.thud(0.55)
    fx.burst(h.x, h.y - 4, { count: 8, color: ['#8b5a2b', '#a9713d'], speed: 280, angle: -Math.PI / 2, spread: 2, life: 0.4, size: 9, gravity: 900 })
    const m = h.mole
    if (m) {
      // Someone was about to come out: startle it up right now.
      if (m.state === 'peek') m.t = 1
      return
    }
    if (h.reserved) return
    h.worm = 1.5
    sfx.tone({ freq: 640, to: 1180, dur: 0.12, type: 'sine', vol: 0.15, delay: 0.12 })
  }

  const thumpLawn = (x: number, y: number) => {
    sfx.thud(0.45)
    sfx.noise({ dur: 0.12, vol: 0.08, freq: 2400, filter: 'highpass' })
    fx.burst(x, y, { count: 10, color: ['#3f9e36', '#7ed957', '#b6f08a'], speed: 360, angle: -Math.PI / 2, spread: 1.8, life: 0.5, size: 8, gravity: 1100, shape: 'spark' })
    fx.shake(2)
    const flower: Flower = { x, y: y + 6, char: pick(FLOWERS), grow: 0, seed: rnd(0, 9) }
    flowers.push(flower)
    if (flowers.length > 28) flowers.shift()
    flowers.sort((a, b) => a.y - b.y)
    stage.tween(0.4, (t) => (flower.grow = t), ease.outBack)
    sfx.pop(Math.floor(rnd(0, 6)))
    // Everyone who is up flinches.
    for (const h of holes) if (h.mole && h.mole.state !== 'hit') h.mole.sq.kick(-1.6)
  }

  const thumpSky = (x: number, y: number) => {
    if (dist(x, y, sun.x, sun.y) < 95) {
      sun.dizzy = 1.6
      sun.sq.value = 0.6
      bonkSound(1.5)
      sfx.ding(5)
      stars(sun.x, sun.y, 10)
      fx.shake(4)
      return
    }
    for (const c of clouds) {
      if (Math.abs(x - c.x) < 110 * c.s + 30 && Math.abs(y - c.y) < 50 * c.s + 30) {
        c.sq.value = 0.55
        sfx.splat()
        fx.burst(c.x, c.y + 20, { count: 14, color: ['#4db8ff', '#a8e0ff'], speed: 200, angle: Math.PI / 2, spread: 1.2, life: 0.8, size: 8, gravity: 1200 })
        return
      }
    }
    sfx.ding(Math.floor(rnd(0, 8)))
    fx.burst(x, y, { count: 8, color: ['#ffffff', '#fff7b8'], speed: 260, life: 0.5, size: 12, shape: 'star' })
  }

  const startDance = () => {
    phase = 'dance'
    danceT = 3.6
    let k = 0
    for (let i = 0; i < 9; i++) {
      const h = holes[i]!
      if (h.reserved) continue
      let m = h.mole
      if (m && (m.state === 'hit' || m.state === 'duck' || m.state === 'box' || m.kind === 'bunny')) continue
      if (!m) {
        m = spawn('mole', i)
        m.t = -k * 0.05
        k++
      }
      m.dancer = true
      m.stay = 99
      if (m.state === 'taunt') m.state = 'up'
    }
    fx.confetti(W / 2, 120, 70)
    fx.confetti(200, 160, 30)
    fx.confetti(W - 200, 160, 30)
    fx.text(W / 2, 170, 'MOLE PARTY!', { color: '#ffffff', size: 72, life: 1.6 })
    sfx.win()
    const tune = [0, 2, 4, 2, 5, 4, 2, 4, 7, 5, 4, 2, 0, 4, 7]
    tune.forEach((step, i) => {
      stage.after(0.35 + i * 0.2, () => {
        if (phase !== 'dance') return
        sfx.note(step, 0.16, 'square', 0.09)
        if (i % 2 === 0) sfx.tone({ freq: i % 4 === 0 ? 131 : 196, dur: 0.14, type: 'triangle', vol: 0.2 })
      })
    })
  }

  const endDance = () => {
    phase = 'play'
    nextDanceAt = bonks + 20
    for (const h of holes) {
      const m = h.mole
      if (m && m.dancer && (m.state === 'up' || m.state === 'rise' || m.state === 'peek')) {
        m.state = 'duck'
        m.t = -rnd(0, 0.25)
        m.hops = 0
      }
    }
    spawnCd = 0.35
  }

  const startBoss = () => {
    phase = 'bossIntro'
    rumbleT = 1.2
    rumbleStep = 0
    for (const h of holes) {
      const m = h.mole
      if (m && m.state !== 'hit' && m.state !== 'duck') {
        m.state = 'duck'
        m.t = 0
        m.hops = 0
      }
    }
  }

  const director = (dt: number) => {
    const lv = Math.max(
      bonks >= 16 ? 4 : bonks >= 12 ? 3 : bonks >= 8 ? 2 : bonks >= 4 ? 1 : 0,
      stage.time > 46 ? 4 : stage.time > 35 ? 3 : stage.time > 25 ? 2 : stage.time > 14 ? 1 : 0,
    )
    while (level < lv) {
      level++
      forced.push((['hardhat', 'gold', 'carrot', 'bunny'] as const)[level - 1]!)
    }

    if (phase === 'play') {
      if (bonks >= nextBossAt || (bosses === 0 && stage.time > 85)) {
        nextBossAt = bonks + 9999
        startBoss()
        return
      }
      if (bonks >= nextDanceAt) {
        startDance()
        return
      }
      spawnCd -= dt
      let active = 0
      for (const h of holes) if (h.mole && h.mole.state !== 'hit' && h.mole.state !== 'duck') active++
      active += tunnels.length
      let want = 1 + (bonks >= 5 ? 1 : 0) + (bonks >= 14 ? 1 : 0) + (bonks >= 40 && heat > 0.6 ? 1 : 0)
      if (heat < 0.12 && bonks >= 5) want = Math.min(want, 2)
      if (active < want && spawnCd <= 0) {
        const free = freeHoles().filter((i) => i !== lastHole)
        if (free.length > 0) {
          const at = pick(free)
          lastHole = at
          spawn(pickKind(), at)
          spawnCd = rnd(0.3, 0.7) * lerp(1.25, 0.6, heat)
        }
      }
    } else if (phase === 'dance') {
      danceT -= dt
      // If every dancer has been bonked, do not leave the garden empty.
      let dancing = 0
      for (const h of holes) if (h.mole && h.mole.state !== 'hit') dancing++
      if (danceT <= 0 || (dancing === 0 && danceT < 3)) endDance()
    } else if (phase === 'bossIntro') {
      let busy = tunnels.length > 0
      for (const h of holes) if (h.mole) busy = true
      if (busy) return
      const mid = holes[4]!
      rumbleT -= dt
      const step = Math.floor((1.2 - rumbleT) / 0.3)
      if (step > rumbleStep) {
        rumbleStep = step
        sfx.thud(1)
        sfx.tone({ freq: 70, to: 45, dur: 0.25, type: 'sawtooth', vol: 0.16 })
        fx.shake(5 + step * 2)
        mid.jolt.kick(-200)
        fx.burst(mid.x, mid.y, { count: 12, color: ['#8b5a2b', '#a9713d', '#6b3f1d'], speed: 420, angle: -Math.PI / 2, spread: 2, life: 0.6, size: 12, gravity: 1000 })
      }
      if (rumbleT <= 0) {
        const m = spawn('boss', 4, true)
        m.stay = 9999
        phase = 'boss'
        raspberry(true)
        sfx.slideUp()
        fx.shake(10)
      }
    } else if (phase === 'frenzy') {
      frenzyT -= dt
      let left = flyers.length
      for (const h of holes) if (h.mole) left++
      if (frenzyT <= 0 || left === 0) {
        phase = 'play'
        nextBossAt = bonks + 30
        nextDanceAt = Math.max(nextDanceAt, bonks + 5)
        spawnCd = 0.4
      }
    }
  }

  const updateMole = (at: number, h: Hole, m: Mole, dt: number) => {
    m.t += dt
    m.sq.update(dt)
    m.lean.update(dt)
    m.wow = Math.max(0, m.wow - dt)
    m.sinceHit += dt
    if (m.kind === 'gold' && m.up > 0.6 && stage.time > sparkleAt) {
      sparkleAt = stage.time + 0.18
      fx.burst(h.x + rnd(-60, 60), h.y - rnd(30, 150) * h.s, { count: 1, color: '#fff7b8', speed: 60, life: 0.5, size: 12, shape: 'star' })
    }
    if (m.state === 'peek') {
      if (m.t > 0.32) {
        m.state = 'rise'
        m.t = 0
        popOut(h)
      }
    } else if (m.state === 'rise') {
      const dur = m.kind === 'boss' ? 0.5 : 0.26
      m.up = ease.outBack(Math.min(1, m.t / dur))
      if (m.t >= dur) {
        m.state = 'up'
        m.t = 0
        m.up = 1
        m.sq.kick(1.2)
      }
    } else if (m.state === 'up') {
      if (m.kind === 'boss') {
        // The boss never leaves: it jeers until it is beaten.
        if (m.sinceHit > 2.2 && m.t > 2.2) {
          m.t = 0
          raspberry(true)
          m.wow = 0
          m.lean.kick(2)
        }
      } else if (m.dancer) {
        // Waits for the party to end.
      } else if (m.kind === 'bunny') {
        if (m.t > m.stay) {
          m.state = 'duck'
          m.t = 0
          addScore(2)
          fx.burst(h.x, h.y - 150 * h.s, { count: 6, color: ['#ff7ac8', '#ff5d8f'], speed: 220, life: 0.8, size: 16, shape: 'heart', angle: -Math.PI / 2, spread: 1.4, gravity: -200 })
          sfx.ding(4)
          sfx.ding(6)
        }
      } else if (m.t > m.stay - 0.75) {
        m.state = 'taunt'
        m.t = 0
        m.lean.kick(rnd(-2, 2))
        raspberry()
      }
    } else if (m.state === 'taunt') {
      if (m.t > 0.75) {
        m.state = 'duck'
        m.t = 0
        if (m.hops <= 0) {
          streak = 0
          heat = Math.max(0, heat - 0.2)
        }
        sfx.tone({ freq: 520, to: 240, dur: 0.12, type: 'sine', vol: 0.1 })
      }
    } else if (m.state === 'duck') {
      if (m.t >= 0) m.up = Math.min(m.up, 1 - ease.inQuad(Math.min(1, m.t / 0.2)))
      if (m.t >= 0.2) {
        h.mole = null
        if (m.kind === 'carrot' && m.hops > 0 && phase === 'play') {
          const free = freeHoles().filter((i) => i !== at)
          if (free.length > 0) {
            const to = pick(free)
            holes[to]!.reserved = true
            m.hops--
            tunnels.push({ from: at, to, t: 0, mole: m, puff: 0 })
            sfx.noise({ dur: 0.45, vol: 0.1, freq: 300, to: 700, filter: 'bandpass', q: 2 })
          }
        }
      }
    } else if (m.state === 'hit') {
      if (m.t > 0.85) {
        if (m.t - dt <= 0.85) sfx.tone({ freq: 480, to: 160, dur: 0.22, type: 'triangle', vol: 0.09 })
        m.up = Math.min(m.up, 1 - ease.inBack(Math.min(1, (m.t - 0.85) / 0.3)))
        if (m.t >= 1.15) h.mole = null
      } else {
        // Caught while ducking: it pops back up, dizzy.
        m.up = damp(m.up, 1, 22, dt)
      }
    } else if (m.state === 'box') {
      if (m.t > 1.1) {
        m.state = 'duck'
        m.t = 0
      }
    }
  }

  const moodOf = (m: Mole): Mood => {
    if (m.state === 'hit') return 'dizzy'
    if (m.state === 'box') return 'grumpy'
    if (m.kind === 'boss') {
      if (m.sinceHit < 0.35 || m.hp <= 3) return 'wow'
      if (m.t < 0.8 && m.sinceHit > 2) return 'taunt'
      return 'grumpy'
    }
    if (m.wow > 0) return 'wow'
    if (m.state === 'taunt') return 'taunt'
    if (m.dancer) return 'joy'
    return 'happy'
  }

  const drawHole = (g: CanvasRenderingContext2D, h: Hole) => {
    const time = stage.time
    const hs = h.s * h.size
    const jy = h.jolt.value * 0.08
    g.save()
    g.translate(h.x, h.y + jy)
    g.scale(hs, hs)
    // The mound and the dark mouth.
    ellipse(g, 0, 12, 136, 54, 'rgba(40,70,20,0.35)')
    ellipse(g, 0, 6, 130, 50, '#6b3f1d')
    ellipse(g, 0, 3, 126, 46, '#a06a3a')
    ellipse(g, 0, 0, 100, 36, '#2a1710')
    ellipse(g, 0, 8, 82, 24, '#170b06')
    g.restore()

    const m = h.mole
    if (m && m.state === 'peek' && m.t > 0) {
      eyes(g, h.x, h.y + 6 * hs, 9 * hs, Math.sin(time * 7 + m.seed), -0.4, 0, 1.5)
    }

    if (h.worm > 0 && !m) {
      const a = clamp(Math.min(1.5 - h.worm, h.worm) / 0.22, 0, 1)
      const out = ease.outBack(a) * 78
      g.save()
      g.translate(h.x, h.y + jy)
      g.scale(hs, hs)
      g.beginPath()
      g.rect(-200, -300, 400, 300)
      g.ellipse(0, 0, 100, 36, 0, 0, Math.PI)
      g.clip()
      g.rotate(Math.sin(time * 9) * 0.16)
      g.translate(0, 84 - out)
      rrect(g, -19, -84, 38, 170, 19, '#ff8fb0', '#c9587a', 4)
      for (let i = 0; i < 3; i++) line(g, -13, -40 + i * 20, 13, -40 + i * 20, '#e06b90', 3)
      eyes(g, 0, -62, 8, 0, -0.5, blinkAt(time, 3), 1.2)
      ellipse(g, 0, -46, 4, 5, '#7a2a44')
      g.restore()
    }

    if (m && m.up > 0.001) {
      const S = h.s * m.scale
      const rx = (100 * h.size) / m.scale
      const ry = (36 * h.size) / m.scale
      const sy = m.sq.value
      const sx = Math.min(1.75, 1 / Math.sqrt(Math.max(0.25, sy)))
      let lean = m.lean.value * 0.06
      let bob = Math.sin(time * 4.2 + m.seed) * 3
      if (m.state === 'taunt') lean += Math.sin(m.t * 24) * 0.1
      if (m.state === 'hit') lean += Math.sin(m.t * 9) * 0.09
      if (m.dancer && m.state === 'up') {
        lean += Math.sin(time * 9.5) * 0.2
        bob += Math.abs(Math.sin(time * 9.5)) * -14
      }
      if (m.kind === 'boss' && m.state === 'up') lean += Math.sin(time * 5) * 0.03
      const lx = clamp((lookX - h.x) / 300, -1, 1) * (time - lookAt < 1.5 ? 1 : 0.2)
      const ly = clamp((lookY - (h.y - 100 * S)) / 300, -1, 1) * (time - lookAt < 1.5 ? 1 : 0.2)
      g.save()
      g.translate(h.x, h.y + jy)
      g.scale(S, S)
      g.beginPath()
      g.moveTo(-500, -900)
      g.lineTo(500, -900)
      g.lineTo(500, 0)
      g.lineTo(rx, 0)
      g.ellipse(0, 0, rx, ry, 0, 0, Math.PI)
      g.lineTo(-500, 0)
      g.closePath()
      g.clip()
      g.scale(sx, sy)
      g.rotate(lean)
      g.translate(0, (1 - m.up) * 190 + (m.up > 0.9 ? bob : 0))
      if (m.kind === 'bunny') drawBunny(g, m, moodOf(m), time, lx, ly)
      else drawMole(g, m, moodOf(m), time, lx, ly)
      g.restore()
    }

    // The front lip of the mound hides whatever is still underground.
    g.save()
    g.translate(h.x, h.y + jy)
    g.scale(hs, hs)
    g.beginPath()
    g.ellipse(0, 3, 126, 46, 0, 0, Math.PI)
    g.ellipse(0, 0, 100, 36, 0, Math.PI, 0, true)
    g.closePath()
    g.fillStyle = '#a06a3a'
    g.fill()
    g.beginPath()
    g.ellipse(0, 0, 100, 36, 0, 0.06 * Math.PI, 0.94 * Math.PI)
    g.strokeStyle = '#6b3f1d'
    g.lineWidth = 4
    g.stroke()
    circle(g, -70, 32, 6, '#bd8650')
    circle(g, -20, 42, 5, '#8a5528')
    circle(g, 44, 39, 7, '#bd8650')
    circle(g, 88, 25, 5, '#8a5528')
    g.restore()

    if (m && m.up > 0.7) {
      const S = h.s * m.scale
      const p = PALETTE[m.kind]
      // Paws on the rim.
      if (m.state !== 'hit' && m.kind !== 'carrot') {
        const grip = m.state === 'box' ? 0 : 1
        if (grip) {
          for (const side of [-1, 1]) {
            g.save()
            g.translate(h.x + side * 66 * S, h.y + jy + 8 * S)
            g.scale(S, S)
            ellipse(g, 0, 0, 20, 14, p.dark)
            ellipse(g, 0, -1, 16, 11, m.kind === 'bunny' ? '#ffffff' : '#ffb3c0')
            g.restore()
          }
        }
      }
      if (m.state === 'box') {
        const punch = ease.outBack(clamp(m.t / 0.12, 0, 1)) - clamp((m.t - 0.2) / 0.3, 0, 1) * 0.5
        const wave = m.t > 0.4 ? Math.sin(m.t * 20) * 14 : 0
        sprite(g, '🥊', h.x - 70 * S + wave, h.y - (60 + punch * 120) * S, 84 * S, -0.3)
        sprite(g, '🥊', h.x + 70 * S - wave, h.y - (60 + punch * 80) * S, 84 * S, 0.3, -1, 1)
      }
      if (m.state === 'hit' && m.t < 0.95) {
        const cy = h.y + jy - 150 * S * m.up * m.sq.value - 14 * S
        for (let i = 0; i < 3; i++) {
          const a = time * 7 + (i * TAU) / 3
          star(g, h.x + Math.cos(a) * 62 * S, cy + Math.sin(a) * 15 * S, (13 + Math.sin(a) * 3) * S, '#ffe14d', a)
        }
      }
      if (m.kind === 'boss' && m.state !== 'hit') {
        // Ten pips: a wordless health bar over the boss.
        const py = h.y - 150 * S - 92
        rrect(g, h.x - 162, py - 20, 324, 40, 20, 'rgba(255,255,255,0.8)', 'rgba(30,20,40,0.25)', 3)
        for (let i = 0; i < 10; i++) {
          const on = i < m.hp
          circle(g, h.x + (i - 4.5) * 30, py, on ? 11 : 7, on ? '#ff4757' : 'rgba(255,255,255,0.45)', 'rgba(30,20,40,0.6)', 3)
        }
      }
    }
  }

  const drawHammer = (g: CanvasRenderingContext2D, hm: Hammer) => {
    let back: number
    let alpha = 1
    let squashY = 1
    if (hm.fly) {
      back = hm.fly.rot
      alpha = clamp(1.4 - hm.t, 0, 1)
    } else if (hm.t < SWING) {
      const k = hm.t / SWING
      back = lerp(1.15, 0, k * k)
    } else {
      const k = hm.t - SWING
      back = 0.5 * ease.inOutQuad(clamp((k - 0.07) / 0.22, 0, 1))
      squashY = lerp(0.6, 1, ease.outBack(clamp(k / 0.2, 0, 1)))
      alpha = clamp(1 - (k - 0.3) / 0.14, 0, 1)
    }
    const px = hm.x + hm.dir * 172 * HAMMER + (hm.fly ? hm.fly.ox : 0)
    const py = hm.y + 8 * HAMMER + (hm.fly ? hm.fly.oy : 0)
    g.save()
    g.globalAlpha = alpha
    g.translate(px, py)
    g.scale(hm.dir * HAMMER, HAMMER)
    if (!hm.fly && hm.t < SWING + 0.09) {
      // A smear behind the head so the swing reads even at three frames.
      g.beginPath()
      const base = Math.atan2(-50, -160)
      g.arc(0, 0, 168, base + back, base + 1.15)
      g.strokeStyle = `rgba(255,255,255,${0.35 * clamp(1 - (hm.t - SWING) / 0.09, 0, 1)})`
      g.lineWidth = 80
      g.lineCap = 'butt'
      g.stroke()
    }
    g.rotate(back)
    drawHammerShape(g, squashY)
    g.restore()
  }

  const drawSun = (g: CanvasRenderingContext2D) => {
    const time = stage.time
    const s = sun.sq.value
    g.save()
    g.translate(sun.x, sun.y)
    g.rotate(sun.spin + time * 0.15)
    g.fillStyle = '#ffd43b'
    for (let i = 0; i < 12; i++) {
      g.rotate(TAU / 12)
      g.beginPath()
      g.moveTo(-11, -56)
      g.lineTo(0, -80 - Math.sin(time * 3 + i) * 6)
      g.lineTo(11, -56)
      g.closePath()
      g.fill()
    }
    g.restore()
    g.save()
    g.translate(sun.x, sun.y)
    g.scale(2 - s, s)
    circle(g, 0, 0, 54, '#ffe14d', '#f5a700', 5)
    circle(g, -30, 14, 9, 'rgba(255,120,80,0.45)')
    circle(g, 30, 14, 9, 'rgba(255,120,80,0.45)')
    if (sun.dizzy > 0) {
      crossEyes(g, -8, 9, 19)
      ellipse(g, 0, 22, 8, 10, '#7a3b00')
    } else {
      eyes(g, 0, -8, 10, clamp((lookX - sun.x) / 500, -1, 1), clamp((lookY - sun.y) / 400, -1, 1), blinkAt(time, 5), 1.9)
      g.beginPath()
      g.arc(0, 8, 20, 0.15 * Math.PI, 0.85 * Math.PI)
      g.strokeStyle = '#7a3b00'
      g.lineWidth = 4
      g.lineCap = 'round'
      g.stroke()
    }
    g.restore()
  }

  // First visitor straight away, so the garden is already busy on frame one.
  spawn('mole', 4, true)
  lastHole = 4

  return {
    update(dt) {
      const time = stage.time
      hud.update(dt)
      sun.sq.update(dt)
      if (sun.dizzy > 0) {
        sun.dizzy -= dt
        sun.spin += dt * 9
      }
      for (const c of clouds) {
        c.x += c.v * dt
        if (c.x > W + 160) c.x = -160
        c.sq.update(dt)
      }

      for (let i = 0; i < 9; i++) {
        const h = holes[i]!
        h.jolt.update(dt)
        if (h.worm > 0) h.worm -= dt
        const want = (phase === 'boss' || phase === 'bossIntro') && i === 4 ? 1.55 : 1
        h.size = damp(h.size, want, 7, dt)
        if (h.mole) updateMole(i, h, h.mole, dt)
      }

      director(dt)

      for (let i = hammers.length - 1; i >= 0; i--) {
        const hm = hammers[i]!
        hm.t += dt
        if (!hm.landed && hm.t >= SWING) {
          hm.landed = true
          hm.t = SWING
          hm.impact()
        }
        if (hm.landed && hm.track && !hm.fly) hm.y = hm.track()
        if (hm.fly) {
          hm.fly.vy += 2600 * dt
          hm.fly.ox += hm.fly.vx * dt
          hm.fly.oy += hm.fly.vy * dt
          hm.fly.rot += hm.fly.spin * dt
          if (hm.t > 1.4) hammers.splice(i, 1)
        } else if (hm.t > SWING + 0.44) hammers.splice(i, 1)
      }

      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i]!
        if (d.rest > 0) {
          d.rest += dt
          if (d.rest > 14) debris.splice(i, 1)
          continue
        }
        d.vy += 2200 * dt
        d.x = clamp(d.x + d.vx * dt, 40, W - 40)
        d.y += d.vy * dt
        d.rot += d.spin * dt
        if (d.vy > 0 && d.y >= d.ground) {
          d.y = d.ground
          if (d.vy > 500) {
            d.vy *= -0.4
            d.vx *= 0.5
            d.spin *= 0.5
            sfx.thud(0.3)
            fx.burst(d.x, d.y + 10, { count: 5, color: '#b6f08a', speed: 180, angle: -Math.PI / 2, spread: 2, life: 0.3, size: 7 })
          } else {
            d.rest = 0.01
            d.rot = Math.round(d.rot / 0.6) * 0.6
          }
        }
      }

      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i]!
        c.t += dt / 0.55
        if (c.t >= 1) {
          coins.splice(i, 1)
          addScore(1)
          sfx.coin(c.i)
          fx.burst(HUD_X - 40, HUD_Y, { count: 3, color: '#ffe14d', speed: 160, life: 0.3, size: 8, shape: 'spark' })
        }
      }

      for (let i = flyers.length - 1; i >= 0; i--) {
        const f = flyers[i]!
        f.t += dt / f.dur
        if (f.t >= 1) {
          flyers.splice(i, 1)
          const h = holes[f.to]!
          h.reserved = false
          h.jolt.kick(200)
          sfx.thud(0.4)
          const m = spawn('mini', f.to, true)
          m.stay = rnd(4.2, 5.6)
          m.t = -rnd(0.15, 0.5)
        }
      }

      for (let i = tunnels.length - 1; i >= 0; i--) {
        const tn = tunnels[i]!
        tn.t += dt / 0.5
        const a = holes[tn.from]!
        const b = holes[tn.to]!
        tn.puff -= dt
        if (tn.puff <= 0) {
          tn.puff = 0.06
          const k = ease.inOutQuad(clamp(tn.t, 0, 1))
          fx.burst(lerp(a.x, b.x, k), lerp(a.y, b.y, k), { count: 2, color: ['#8b5a2b', '#a9713d'], speed: 160, angle: -Math.PI / 2, spread: 1.6, life: 0.35, size: 9, gravity: 700 })
        }
        if (tn.t >= 1) {
          tunnels.splice(i, 1)
          b.reserved = false
          const m = tn.mole
          m.state = 'rise'
          m.t = 0
          m.up = 0
          m.stay = stayFor('carrot')
          b.mole = m
          b.worm = 0
          popOut(b)
        }
      }
      void time
    },

    draw(g) {
      const time = stage.time
      g.drawImage(back, 0, 0)
      for (const c of clouds) {
        g.save()
        g.translate(c.x, c.y + Math.sin(time * 0.8 + c.x * 0.01) * 4)
        g.scale(c.s * (2 - c.sq.value), c.s * c.sq.value)
        ellipse(g, 0, 10, 100, 30, '#ffffff')
        ellipse(g, -46, -6, 44, 34, '#ffffff')
        ellipse(g, 8, -22, 52, 42, '#ffffff')
        ellipse(g, 56, -2, 38, 28, '#ffffff')
        g.restore()
      }

      drawSun(g)

      // Tunnelling thief: a bump of earth racing between holes.
      for (const tn of tunnels) {
        const a = holes[tn.from]!
        const b = holes[tn.to]!
        const k = ease.inOutQuad(clamp(tn.t, 0, 1))
        const x = lerp(a.x, b.x, k)
        const y = lerp(a.y, b.y, k)
        ellipse(g, x, y + 6, 58, 24, '#6b3f1d')
        ellipse(g, x, y, 52, 24 + Math.sin(time * 40) * 4, '#a06a3a')
        sprite(g, '🥕', x, y - 26, 44, Math.sin(time * 30) * 0.3)
      }

      // Back to front, so a near mole overlaps the hole behind it.
      let f = 0
      for (let row = 0; row < 3; row++) {
        const limit = ROW_Y[row]! + 30
        while (f < flowers.length && flowers[f]!.y <= limit) drawFlower(g, flowers[f++]!, time)
        for (let col = 0; col < 3; col++) {
          // The boss hole is drawn last in its row so it sits over its neighbours.
          const i = row * 3 + (col === 1 ? 2 : col === 2 ? 1 : 0)
          drawHole(g, holes[i]!)
        }
      }
      while (f < flowers.length) drawFlower(g, flowers[f++]!, time)

      for (const d of debris) {
        g.globalAlpha = d.rest > 12 ? clamp((14 - d.rest) / 2, 0, 1) : 1
        if (d.char === 'hat') {
          g.save()
          g.translate(d.x, d.y)
          g.rotate(d.rot)
          g.scale(d.size, d.size)
          hardHat(g, -30)
          g.restore()
        } else sprite(g, d.char, d.x, d.y, d.size, d.rot)
      }
      g.globalAlpha = 1

      for (const fl of flyers) {
        if (fl.t < 0) continue
        const to = holes[fl.to]!
        const x = lerp(fl.x, to.x, fl.t)
        const y = lerp(fl.y, to.y, fl.t) - Math.sin(fl.t * Math.PI) * 260
        g.save()
        g.translate(x, y)
        g.rotate(fl.t * 9 * (to.x < fl.x ? -1 : 1))
        circle(g, 0, 0, 34, PALETTE.mini.body, PALETTE.mini.dark, 5)
        ellipse(g, 0, 10, 16, 12, PALETTE.mini.snout)
        ellipse(g, 0, 4, 8, 6, '#ff6f91')
        eyes(g, 0, -8, 8, 0, 0, 0, 1.4)
        g.restore()
      }

      for (const hm of hammers) drawHammer(g, hm)

      for (const c of coins) {
        if (c.t < 0) continue
        const k = ease.inOutCubic(c.t)
        const x = lerp(c.x, HUD_X - 40, k)
        const y = lerp(c.y, HUD_Y, k) - Math.sin(c.t * Math.PI) * 140
        g.save()
        g.translate(x, y)
        g.scale(0.25 + 0.75 * Math.abs(Math.cos(time * 12 + c.i)), 1)
        circle(g, 0, 0, 22, '#ffd21f', '#b97a00', 5)
        star(g, 0, 0, 11, '#fff2a8')
        g.restore()
      }

      // The count.
      g.save()
      g.translate(HUD_X, HUD_Y)
      g.scale(hud.value, hud.value)
      rrect(g, -78, -36, 176, 72, 36, 'rgba(255,255,255,0.85)', 'rgba(30,20,40,0.25)', 4)
      sprite(g, '⭐', -40, 0, 50)
      label(g, String(score), 34, 2, 44, '#ff7a1a', 'rgba(255,255,255,0.9)')
      g.restore()

      // Idle hint: point at someone to bonk.
      if (time - lastTouchAt > 5) {
        for (const h of holes) {
          const m = h.mole
          if (m && m.kind !== 'bunny' && (m.state === 'up' || m.state === 'taunt')) {
            hint(g, h.x, h.y - 80 * h.s * m.scale, time, 70)
            break
          }
        }
      }
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      lookX = p.x
      lookY = p.y
      lookAt = stage.time
      fx.ring(p.x, p.y, '#ffffff', 70, 0.22)
      sfx.noise({ dur: 0.06, vol: 0.05, freq: 1800, filter: 'highpass' })

      // Nearest bonkable head, with a hit area bigger than the drawing.
      let best = -1
      let bestD = 1
      let dizzy = -1
      let dizzyD = 1
      for (let i = 0; i < 9; i++) {
        const h = holes[i]!
        const m = h.mole
        if (!m || m.up < 0.2) continue
        const S = h.s * m.scale
        const d = dist(p.x, p.y, h.x, h.y - 78 * S * m.up) / (112 * S)
        if (m.state === 'hit' || m.state === 'box') {
          if (d < dizzyD) {
            dizzyD = d
            dizzy = i
          }
        } else if (d < bestD) {
          bestD = d
          best = i
        }
      }
      if (best < 0) best = dizzy

      const dir = p.x > W - 300 ? -1 : 1
      const hm: Hammer = { x: p.x, y: p.y, dir, t: 0, landed: false, impact: () => {}, track: null, fly: null }
      if (best >= 0) {
        const h = holes[best]!
        const m = h.mole!
        hm.x = h.x
        hm.y = headY(h, m) + 6
        hm.track = () => (h.mole === m ? headY(h, m) + 6 : hm.y)
        hm.impact = () => {
          // Still bonk it if it began to duck in the last few frames.
          if (h.mole === m) bonk(best, m, hm)
          else {
            sfx.thud(0.5)
            thumpHole(best)
          }
        }
      } else {
        let hole = -1
        for (let i = 0; i < 9; i++) {
          const h = holes[i]!
          if (Math.abs(p.x - h.x) < 140 * h.s && p.y > h.y - 110 * h.s && p.y < h.y + 72 * h.s) hole = i
        }
        if (hole >= 0) {
          hm.x = holes[hole]!.x
          hm.y = holes[hole]!.y - 6
          hm.impact = () => thumpHole(hole)
        } else if (p.y > 218) {
          hm.impact = () => thumpLawn(p.x, p.y)
        } else {
          hm.impact = () => thumpSky(p.x, p.y)
        }
      }
      // Only the newest hammer lingers; older ones clear out of the way.
      for (const old of hammers) if (old.landed && !old.fly) old.t = Math.max(old.t, SWING + 0.3)
      hammers.push(hm)
      if (hammers.length > 8) hammers.shift()
    },
  }
}

function drawFlower(g: CanvasRenderingContext2D, f: Flower, time: number): void {
  if (f.grow <= 0) return
  sprite(g, f.char, f.x, f.y - 22 * f.grow, 52 * f.grow, Math.sin(time * 2 + f.seed) * 0.12)
}

// Sky, hills, a fence, a shed and a striped lawn, painted once.
function paintGarden(g: CanvasRenderingContext2D, stage: Stage): void {
  const horizon = 214
  const skyFill = g.createLinearGradient(0, 0, 0, horizon)
  skyFill.addColorStop(0, '#58bdff')
  skyFill.addColorStop(1, '#d4f3ff')
  g.fillStyle = skyFill
  g.fillRect(0, 0, W, horizon + 10)

  ellipse(g, 220, horizon + 30, 360, 120, '#9fe0a0')
  ellipse(g, 820, horizon + 40, 460, 150, '#8fd694')
  ellipse(g, 1120, horizon + 20, 240, 100, '#a6e4a0')

  // Trees.
  const trees: [number, number][] = [
    [70, 1.1],
    [330, 0.8],
    [760, 0.9],
    [930, 1.15],
  ]
  for (const [x, s] of trees) {
    rrect(g, x - 9 * s, horizon - 90 * s, 18 * s, 100 * s, 6, '#8b5a2b')
    circle(g, x, horizon - 110 * s, 52 * s, '#3fa34d', '#2c7a3a', 4)
    circle(g, x - 34 * s, horizon - 86 * s, 34 * s, '#4cb85a')
    circle(g, x + 32 * s, horizon - 90 * s, 36 * s, '#4cb85a')
    circle(g, x - 14 * s, horizon - 128 * s, 16 * s, 'rgba(255,255,255,0.18)')
  }

  // Garden shed.
  rrect(g, 470, horizon - 100, 150, 108, 6, '#e8604c', '#a63a2c', 4)
  g.beginPath()
  g.moveTo(452, horizon - 96)
  g.lineTo(545, horizon - 164)
  g.lineTo(638, horizon - 96)
  g.closePath()
  g.fillStyle = '#7a4a3a'
  g.fill()
  g.strokeStyle = '#4e2e24'
  g.lineWidth = 4
  g.stroke()
  rrect(g, 522, horizon - 62, 46, 70, 6, '#ffd98a', '#a63a2c', 4)
  circle(g, 558, horizon - 26, 4, '#a63a2c')

  // Picket fence.
  rrect(g, -10, horizon - 44, W + 20, 12, 4, '#f1e4cf', '#c9b394', 3)
  rrect(g, -10, horizon - 16, W + 20, 12, 4, '#f1e4cf', '#c9b394', 3)
  for (let x = 8; x < W; x += 42) {
    g.beginPath()
    g.moveTo(x, horizon + 6)
    g.lineTo(x, horizon - 52)
    g.lineTo(x + 14, horizon - 68)
    g.lineTo(x + 28, horizon - 52)
    g.lineTo(x + 28, horizon + 6)
    g.closePath()
    g.fillStyle = '#fff8ea'
    g.fill()
    g.strokeStyle = '#c9b394'
    g.lineWidth = 3
    g.stroke()
  }

  // Lawn with mowed stripes fanning out from the horizon.
  const lawn = g.createLinearGradient(0, horizon, 0, H)
  lawn.addColorStop(0, '#8be05e')
  lawn.addColorStop(1, '#4db342')
  g.fillStyle = lawn
  g.fillRect(0, horizon, W, H - horizon)
  g.fillStyle = 'rgba(255,255,255,0.09)'
  for (let i = -6; i < 7; i += 2) {
    g.beginPath()
    g.moveTo(W / 2 + i * 70, horizon)
    g.lineTo(W / 2 + (i + 1) * 70, horizon)
    g.lineTo(W / 2 + (i + 1) * 190, H)
    g.lineTo(W / 2 + i * 190, H)
    g.closePath()
    g.fill()
  }
  g.fillStyle = 'rgba(30,90,20,0.18)'
  g.fillRect(0, horizon, W, 10)

  // Grass tufts and a few things at the edges.
  for (let i = 0; i < 90; i++) {
    const x = stage.rand() * W
    const y = lerp(horizon + 20, H - 10, stage.rand())
    const s = lerp(0.6, 1.3, (y - horizon) / (H - horizon))
    g.strokeStyle = stage.rand() < 0.5 ? 'rgba(40,120,30,0.5)' : 'rgba(190,255,140,0.55)'
    g.lineWidth = 3 * s
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(x - 6 * s, y)
    g.lineTo(x - 9 * s, y - 12 * s)
    g.moveTo(x, y)
    g.lineTo(x, y - 16 * s)
    g.moveTo(x + 6 * s, y)
    g.lineTo(x + 10 * s, y - 11 * s)
    g.stroke()
  }
  const props: [string, number, number, number][] = [
    ['🌷', 40, 300, 48],
    ['🌻', 1140, 330, 60],
    ['🍄', 1130, 560, 46],
    ['🌼', 52, 520, 44],
    ['🪨', 1128, 770, 50],
    ['🌷', 60, 760, 56],
    ['🥬', 408, 262, 40],
    ['🥬', 772, 262, 40],
  ]
  for (const [char, x, y, size] of props) sprite(g, char, x, y, size)
}

export const proto: Proto = {
  meta: {
    key: 'whack-a-mole',
    name: 'Whack-a-Mole',
    emoji: '🔨',
    ages: [3, 7],
    pitch: 'Cheeky moles pop out of nine garden holes; tap one and a big squeaky hammer bonks it flat.',
    howTo: 'Tap a mole to bonk it. Hard hats need two, gold pays out, the bunny boxes back, and the boss takes ten.',
    basedOn: 'the arcade Whac-A-Mole cabinet and every toddler tap game',
    whyFun: 'A hammer, a pancake and stars on every tap; no dead touches; a new visitor every few bonks and a boss that bursts into a frenzy.',
  },
  create,
}
