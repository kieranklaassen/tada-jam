// Campfire Nights: a camper who runs to the finger, chops pines by day, feeds
// a fire whose circle of light is the whole game, and bonks glowing-eyed
// shadow critters with pine cones by night. Dawn always comes; nothing ends.

import { blinkAt, circle, ellipse, hint, label, rrect, shadow, sprite, squash } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { TAU, clamp, damp, dist, ease, lerp, pick, rnd, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import {
  FRONT_H,
  LOOK_CAMPER,
  LOOK_FRIEND,
  PINE_FAR,
  PINE_MID,
  PINE_NEAR,
  drawBush,
  drawCamper,
  drawCone,
  drawCritterBody,
  drawCritterEyes,
  drawDizzy,
  drawFence,
  drawFire,
  drawLog,
  drawOwl,
  drawPine,
  drawStump,
  drawTent,
  drawTorch,
  drawTrap,
  makeCanvas,
  paintFront,
  paintGround,
  pineSprite,
} from './art.ts'

const FIRE_X = W / 2
const FIRE_Y = 440
const FUEL_MAX = 10
const CARRY_MAX = 9
const lightR = (fuel: number) => 105 + 23 * fuel
// Where things get built, as compass bearings round the fire.
const SLOT_DEG = [205, 335, 90, 270, 150, 25, 240, 300]

type SpotKind = 'torch' | 'trap' | 'owl' | 'fence' | 'tent'
const SPOT_NAME: Record<SpotKind, string> = { torch: 'TORCH!', trap: 'SNAP TRAP!', owl: 'GUARD OWL!', fence: 'FENCE!', tent: 'TENT!' }
// What each morning adds: [slot, kind, cost in logs].
const MORNINGS: readonly (readonly (readonly [number, SpotKind, number])[])[] = [
  [
    [0, 'torch', 2],
    [1, 'trap', 2],
  ],
  [[2, 'owl', 3]],
  [[3, 'torch', 3]],
  [
    [4, 'tent', 4],
    [5, 'fence', 3],
  ],
  [[6, 'trap', 3]],
  [[7, 'owl', 4]],
]

interface Tree {
  x: number
  y: number
  s: number
  hp: number
  state: 'up' | 'falling' | 'stump' | 'growing'
  dir: number
  fall: number
  grow: number
  shake: Spring
  phase: number
}

interface Log {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  rot: number
  spin: number
  state: 'ground' | 'toCamper' | 'toPal'
  age: number
}

interface Arc {
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
  dur: number
  h: number
  done: () => void
}

interface Spot {
  kind: SpotKind
  x: number
  y: number
  angle: number
  cost: number
  paid: number
  incoming: number
  built: boolean
  pop: number
  up: number
  light: number
  armed: boolean
  rearm: number
  snap: number
  cool: number
  hoot: number
  wobble: Spring
}

type CState = 'lurk' | 'chase' | 'windup' | 'dash' | 'runaway' | 'raid' | 'bonked' | 'flee' | 'flung'
interface Critter {
  x: number
  y: number
  a: number
  off: number
  slide: number
  state: CState
  t: number
  size: number
  scale: number
  hp: number
  kind: 'shade' | 'big' | 'gold'
  courage: number
  loot: 'none' | 'log' | 'ember'
  seed: number
  born: number
  rot: number
  spin: number
  z: number
  vz: number
  kx: number
  ky: number
  via: Spot | null
  flash: number
}

interface Cone {
  x0: number
  y0: number
  x: number
  y: number
  target: Critter
  t: number
  dur: number
}

interface Bush {
  x: number
  y: number
  berries: number
  wobble: Spring
}

interface Walker {
  x: number
  y: number
  vx: number
  vy: number
  carried: number
  swing: number
  hit: boolean
  swingCool: number
  stretch: Spring
  run: number
  moving: number
  facing: number
  lean: number
  throwT: number
}

type PalState = 'lost' | 'idle' | 'toTree' | 'chop' | 'collect' | 'toFire' | 'guard'
interface Pal extends Walker {
  state: PalState
  tree: Tree | null
  t: number
  cool: number
  pop: number
}

const TARGETABLE: readonly CState[] = ['lurk', 'chase', 'windup', 'dash', 'runaway', 'raid']

function angDiff(to: number, from: number): number {
  let d = (to - from) % TAU
  if (d > Math.PI) d -= TAU
  if (d < -Math.PI) d += TAU
  return d
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const pineNear = pineSprite(PINE_NEAR)
  const pineMid = pineSprite(PINE_MID)
  const pineFar = pineSprite(PINE_FAR)
  const ground = paintGround(stage.rand, FIRE_X, FIRE_Y, pineMid, pineFar)
  const front = paintFront(stage.rand, pineMid, pineFar)
  const [darkCanvas, dg] = makeCanvas(W / 2, H / 2)

  // ------------------------------------------------------------ the world

  let fuel = 3.2
  let inFlight = 0
  const glow = spring(lightR(fuel), 70, 9)
  const flame = spring(1, 170, 9)
  let fireMood: Mood = 'happy'
  let fireMoodUntil = 0
  let feedStep = 0
  let lastFeed = -10
  let feedCool = 0
  let payCool = 0

  let phase: 'day' | 'night' = 'day'
  let phaseT = 0
  let day = 1
  let nights = 0
  let dark = 0
  let dawnGlow = 0
  let duskCalled = false
  let stars = 0
  let felled = 0
  const starPop = spring(1, 260, 12)
  const nightPop = spring(1, 260, 12)
  const woodPop = spring(1, 260, 12)
  const dialPop = spring(1, 200, 10)

  let lastTouch = 0
  let touched = false
  let dragId = -1
  let relight: { t: number; stage: number; next: number } | null = null

  const slots = SLOT_DEG.map((deg) => {
    const a = (deg / 180) * Math.PI
    return { x: FIRE_X + Math.cos(a) * 235, y: FIRE_Y + Math.sin(a) * 235 * 0.8, a }
  })

  const trees: Tree[] = []
  for (let tries = 0; trees.length < 13 && tries < 900; tries++) {
    const a = stage.rand() * TAU
    const r = lerp(300, 510, stage.rand())
    const x = FIRE_X + Math.cos(a) * r
    const y = FIRE_Y + Math.sin(a) * r * 0.74
    if (x < 100 || x > W - 100 || y < 215 || y > H - 105) continue
    if (trees.some((t) => dist(t.x, t.y, x, y) < 104)) continue
    if (slots.some((s) => dist(s.x, s.y, x, y) < 96)) continue
    trees.push({ x, y, s: lerp(0.74, 0.92, stage.rand()), hp: 3, state: 'up', dir: 1, fall: 0, grow: 1, shake: spring(0, 260, 9), phase: stage.rand() * TAU })
  }

  // The emptiest of a few candidate places, for bushes, the lost friend, the axe.
  const taken: { x: number; y: number }[] = []
  const freePlace = (candidates: readonly (readonly [number, number])[]): { x: number; y: number } => {
    let best = { x: candidates[0]![0], y: candidates[0]![1] }
    let bestRoom = -1
    for (const [x, y] of candidates) {
      let room = 999
      for (const t of trees) room = Math.min(room, dist(t.x, t.y, x, y))
      for (const s of slots) room = Math.min(room, dist(s.x, s.y, x, y))
      for (const s of taken) room = Math.min(room, dist(s.x, s.y, x, y))
      if (room > bestRoom) {
        bestRoom = room
        best = { x, y }
      }
    }
    taken.push(best)
    return best
  }
  const ringPlaces = (radius: number, n: number, turn: number): [number, number][] => {
    const out: [number, number][] = []
    for (let i = 0; i < n; i++) {
      const a = turn + (i / n) * TAU
      const x = FIRE_X + Math.cos(a) * radius
      const y = FIRE_Y + Math.sin(a) * radius * 0.72
      if (x > 110 && x < W - 110 && y > 230 && y < H - 120) out.push([x, y])
    }
    return out
  }

  const bushes: Bush[] = []
  for (let i = 0; i < 3; i++) {
    const p = freePlace(ringPlaces(330 + i * 40, 14, i * 1.3))
    bushes.push({ x: p.x, y: p.y, berries: 3, wobble: spring(1, 220, 8) })
  }

  const spots: Spot[] = []
  const logs: Log[] = []
  const arcs: Arc[] = []
  const critters: Critter[] = []
  const cones: Cone[] = []
  const fireflies = Array.from({ length: 16 }, () => ({ x: rnd(60, W - 60), y: rnd(170, H - 110), ph: rnd(0, TAU) }))

  const newWalker = (x: number, y: number): Walker => ({
    x,
    y,
    vx: 0,
    vy: 0,
    carried: 0,
    swing: -1,
    hit: false,
    swingCool: 0,
    stretch: spring(1, 240, 11),
    run: 0,
    moving: 0,
    facing: 1,
    lean: 0,
    throwT: -1,
  })

  const camper = {
    ...newWalker(FIRE_X - 110, FIRE_Y + 62),
    tx: FIRE_X - 110,
    ty: FIRE_Y + 62,
    chop: null as Tree | null,
    hop: 0,
    hopV: 0,
    mood: 'happy' as Mood,
    moodUntil: 0,
    spookUntil: 0,
    boostUntil: 0,
    axe: 1,
    stepIn: 0,
    wasFast: false,
    shiver: 0,
  }
  let pal: Pal | null = null
  let axeItem: { x: number; y: number; pop: number } | null = null

  let pickStep = 0
  let lastPick = -10
  let combo = 0
  let lastBonk = -10
  let spawnIn = 0
  let boldIn = 0
  let goldDone = false
  let bigDone = false
  let crackleIn = 0.3
  let cricketIn = 1
  let berryStep = 0
  // Until the first pine cone flies, the first eyes of the night get pointed at.
  let thrown = false

  const mood = (m: Mood, seconds: number) => {
    camper.mood = m
    camper.moodUntil = stage.time + seconds
  }
  const fireFace = (m: Mood, seconds: number) => {
    fireMood = m
    fireMoodUntil = stage.time + seconds
  }
  const fireR = () => (relight ? 55 : lightR(fuel))
  const lightAt = (x: number, y: number): number => {
    let l = 1 - dist(x, y, FIRE_X, FIRE_Y) / fireR()
    for (const s of spots) if (s.built && s.light > 0) l = Math.max(l, 1 - dist(x, y, s.x, s.y) / s.light)
    return l
  }

  // ------------------------------------------------------------ building

  const addSpot = (slot: number, kind: SpotKind, cost: number, delay: number) => {
    const at = slots[slot]!
    const s: Spot = { kind, x: at.x, y: at.y, angle: at.a, cost, paid: 0, incoming: 0, built: false, pop: 0, up: 0, light: 0, armed: true, rearm: 0, snap: 0, cool: 1, hoot: 0, wobble: spring(0, 200, 8) }
    spots.push(s)
    stage.after(delay, () => {
      stage.tween(0.45, (t) => (s.pop = t), ease.outBack)
      if (stage.time > 1) {
        sfx.ding(spots.length)
        fx.ring(s.x, s.y, '#fff6c9', 110, 0.6)
      }
    })
  }

  const buildSpot = (s: Spot) => {
    s.built = true
    s.light = s.kind === 'torch' ? 165 : s.kind === 'tent' ? 140 : 0
    stage.tween(0.5, (t) => (s.up = t), ease.outBack)
    sfx.win()
    sfx.ding(2)
    fx.confetti(s.x, s.y - 30, 30)
    fx.ring(s.x, s.y, '#fff3b0', s.light > 0 ? s.light : 120, 0.55)
    fx.text(s.x, s.y - 120, SPOT_NAME[s.kind], { size: 42, color: '#fff3b0' })
    fx.shake(5)
    mood('yum', 0.9)
    camper.stretch.kick(4)
  }

  const introduce = (d: number) => {
    const list = MORNINGS[d - 1]
    if (list) list.forEach(([slot, kind, cost], i) => addSpot(slot, kind, cost, d === 1 ? 0.05 + i * 0.15 : 1.2 + i * 0.5))
    if (d === 2 && !pal) {
      const p = freePlace([
        [150, 330],
        [W - 150, 330],
        [150, 590],
        [W - 150, 590],
        [330, 240],
        [W - 330, 240],
      ])
      const made: Pal = { ...newWalker(p.x, p.y), state: 'lost', tree: null, t: 0, cool: 1, pop: 0 }
      pal = made
      stage.after(1.6, () => {
        stage.tween(0.5, (t) => (made.pop = t), ease.outBack)
        fx.ring(made.x, made.y - 40, '#9fe0ff', 140, 0.7)
        sfx.note(4, 0.18, 'sine', 0.2)
        sfx.tone({ freq: sfx.scale(2), dur: 0.3, type: 'sine', vol: 0.2, delay: 0.18 })
      })
    }
    if (d === 3 && camper.axe === 1 && !axeItem) {
      const p = freePlace(ringPlaces(360, 12, 0.4))
      const item = { x: p.x, y: p.y, pop: 0 }
      axeItem = item
      stage.after(1.8, () => {
        stage.tween(0.5, (t) => (item.pop = t), ease.outBack)
        fx.ring(item.x, item.y - 20, '#ffe14d', 140, 0.7)
        sfx.ding(4)
      })
    }
  }
  introduce(1)

  // ------------------------------------------------------------ wood and fire

  const addFuel = (n: number) => {
    fuel = Math.min(FUEL_MAX, fuel + n)
    flame.value = 1.4
    glow.kick(70)
    if (stage.time - lastFeed > 2) feedStep = 0
    lastFeed = stage.time
    sfx.whoosh()
    sfx.note(Math.min(feedStep++, 12) - 2, 0.3, 'triangle', 0.2)
    fx.burst(FIRE_X, FIRE_Y - 40, { count: 12, color: ['#ffe45c', '#ff9d1f', '#ffffff'], speed: 380, life: 0.7, size: 7, gravity: -160, angle: -Math.PI / 2, spread: 1.7, shape: 'spark' })
    fx.ring(FIRE_X, FIRE_Y, '#ffe9a8', lightR(fuel), 0.5)
    fireFace('yum', 0.6)
    if (phase === 'night') {
      const R = lightR(fuel) + 10
      for (const c of critters) if ((c.state === 'lurk' || c.state === 'windup') && dist(c.x, c.y, FIRE_X, FIRE_Y) < R) scare(c)
    }
  }

  const feedFrom = (who: Walker) => {
    who.carried--
    inFlight++
    arcs.push({
      x0: who.x,
      y0: who.y - 70,
      x1: FIRE_X,
      y1: FIRE_Y - 30,
      t: 0,
      dur: 0.32,
      h: 80,
      done: () => {
        inFlight--
        addFuel(1)
      },
    })
    who.stretch.kick(2)
  }

  // `toward` is which way they hop once they pop out (0 scatters them).
  const dropLogs = (x: number, y: number, n: number, dir: number, spread: number, toward = 0) => {
    for (let i = 0; i < n; i++)
      logs.push({ x: x + dir * i * spread, y, z: 12, vx: toward * rnd(60, 150) + rnd(-70, 70), vy: rnd(-70, 90), vz: rnd(380, 580), rot: rnd(-0.5, 0.5), spin: rnd(-8, 8), state: 'ground', age: 0 })
  }

  const chopHit = (t: Tree, power: number, fromX: number, loud: boolean) => {
    if (t.state !== 'up') return
    t.hp -= power
    const side = fromX < t.x ? 1 : -1
    t.shake.kick(side * 3.4)
    fx.burst(t.x - side * 16 * t.s, t.y - 24, { count: loud ? 9 : 4, color: ['#e6bb84', '#c98e55', '#fff0c2'], speed: 320, life: 0.45, size: 8, shape: 'square', angle: side > 0 ? Math.PI * 1.15 : -Math.PI * 0.15, spread: 1.5 })
    fx.burst(t.x, t.y - 120 * t.s, { count: 3, color: '#46ba6a', speed: 130, life: 0.7, size: 9, gravity: 320 })
    if (loud) {
      sfx.thud(0.8)
      sfx.tone({ freq: sfx.scale(-7 + (3 - Math.max(0, t.hp)) * 2), dur: 0.1, type: 'square', vol: 0.12 })
      fx.shake(3, 0.12)
    } else {
      sfx.tone({ freq: 200, to: 120, dur: 0.06, type: 'square', vol: 0.04 })
    }
    if (t.hp <= 0) {
      t.state = 'falling'
      t.dir = side
      t.fall = 0
      sfx.tone({ freq: 400, to: 120, dur: 0.5, type: 'sawtooth', vol: loud ? 0.07 : 0.03 })
    }
  }

  const landTree = (t: Tree) => {
    t.state = 'stump'
    const cx = t.x + t.dir * 120 * t.s
    fx.burst(cx, t.y - 10, { count: 18, color: ['#2c8a4c', '#46ba6a', '#36a15a'], speed: 380, life: 0.75, size: 12, gravity: 520, angle: -Math.PI / 2, spread: Math.PI * 1.2 })
    fx.burst(t.x + t.dir * 60 * t.s, t.y - 6, { count: 8, color: 'rgba(255,255,255,0.75)', speed: 220, life: 0.4, size: 13, gravity: 0 })
    sfx.thud(1.5)
    sfx.crunch()
    fx.shake(9, 0.3)
    dropLogs(t.x + t.dir * 20 * t.s, t.y - 4, camper.axe > 1 ? 4 : 3, t.dir, 24 * t.s, -t.dir)
    felled++
    if (felled === 1) fx.text(t.x, t.y - 130, 'TIMBER!', { size: 48, color: '#fff3b0' })
  }

  // ------------------------------------------------------------ critters

  const spawnCritter = (kind: Critter['kind']) => {
    let best = 0
    let bestLight = 9
    const R = fireR()
    for (let k = 0; k < 5; k++) {
      const a = (stage.rand() < 0.5 ? 0 : Math.PI) + lerp(-1.1, 1.1, stage.rand())
      const lx = clamp(FIRE_X + Math.cos(a) * (R + 60), 30, W - 30)
      const ly = clamp(FIRE_Y + Math.sin(a) * (R + 60), 150, H - 90)
      const l = lightAt(lx, ly) + stage.rand() * 0.05
      if (l < bestLight) {
        bestLight = l
        best = a
      }
    }
    const far = R + 240
    const scale = kind === 'big' ? 1.6 : kind === 'gold' ? 0.9 : lerp(0.92, 1.12, stage.rand())
    critters.push({
      x: clamp(FIRE_X + Math.cos(best) * far, -10, W + 10),
      y: clamp(FIRE_Y + Math.sin(best) * far, 160, H - 95),
      a: best,
      off: lerp(18, 72, stage.rand()),
      slide: stage.rand() < 0.5 ? -1 : 1,
      state: 'lurk',
      t: 0,
      size: 1,
      scale,
      hp: kind === 'big' ? 3 : 1,
      kind,
      courage: 1,
      loot: 'none',
      seed: rnd(0, 50),
      born: 0,
      rot: 0,
      spin: 0,
      z: 0,
      vz: 0,
      kx: 0,
      ky: 0,
      via: null,
      flash: 0,
    })
    sfx.tone({ freq: kind === 'big' ? 150 : 240, to: kind === 'big' ? 190 : 300, dur: 0.25, type: 'sine', vol: 0.06 })
  }

  function scare(c: Critter): void {
    if (c.state === 'flee') return
    c.state = 'flee'
    c.t = 0
    c.via = null
    sfx.tone({ freq: 900, to: 1600, dur: 0.12, type: 'sine', vol: 0.1 })
    fx.burst(c.x, c.y - 30, { count: 4, color: '#cdbdf5', speed: 150, life: 0.4, size: 7 })
    fx.text(c.x, c.y - 70, pick(['EEK!', 'YIPE!', 'EEP!']), { size: 26, color: '#d9ccff', life: 0.6 })
  }

  const dropLoot = (c: Critter) => {
    if (c.loot === 'ember') {
      inFlight++
      arcs.push({
        x0: c.x,
        y0: c.y - 40,
        x1: FIRE_X,
        y1: FIRE_Y - 30,
        t: 0,
        dur: 0.45,
        h: 130,
        done: () => {
          inFlight--
          addFuel(1)
        },
      })
      fx.text(c.x, c.y - 120, 'GOT IT BACK!', { size: 30, color: '#9dffb0' })
    } else if (c.loot === 'log') {
      dropLogs(c.x, c.y, 1, 0, 0)
    }
    c.loot = 'none'
  }

  const bonk = (c: Critter, fromX: number, fromY: number, word?: string) => {
    c.hp--
    const dx = c.x - fromX
    const dy = c.y - fromY
    const d = Math.max(1, Math.hypot(dx, dy))
    combo = stage.time - lastBonk < 2.2 ? combo + 1 : 0
    lastBonk = stage.time
    fx.burst(c.x, c.y - 30 * c.scale, { count: 10, color: ['#ffe14d', '#ffffff', '#ffb02e'], speed: 380, life: 0.5, size: 11, shape: 'star' })
    sfx.thud(0.8)
    sfx.pop(combo)
    c.flash = 1
    if (c.hp > 0) {
      c.kx = (dx / d) * 460
      c.ky = (dy / d) * 460
      dropLoot(c)
      c.state = 'lurk'
      c.t = 0
      c.size = 1
      c.via = null
      fx.text(c.x, c.y - 100, 'BONK!', { size: 34 })
      fx.shake(5)
      return
    }
    dropLoot(c)
    c.state = 'bonked'
    c.t = 0
    c.kx = (dx / d) * 540
    c.ky = (dy / d) * 540
    c.vz = 480
    c.spin = Math.random() < 0.5 ? 15 : -15
    const gain = c.kind === 'gold' ? 5 : c.kind === 'big' ? 3 : 1
    stars += gain
    starPop.kick(4)
    sfx.coin(combo)
    fx.text(c.x, c.y - 96, word ?? (combo > 0 ? `BONK x${combo + 1}!` : pick(['BONK!', 'BOP!', 'POW!'])), { size: 36 + Math.min(combo, 5) * 5, color: '#fff3b0' })
    fx.shake(5 + Math.min(combo, 4) * 1.5)
    if (combo >= 2 || c.kind !== 'shade') fx.hitstop(50)
    if (c.kind === 'gold') {
      sfx.fanfare()
      fx.confetti(c.x, c.y - 40, 50)
      fx.text(c.x, c.y - 150, 'GOLDEN! +5', { size: 50, color: '#ffe14d', life: 1.3 })
      dropLogs(c.x, c.y, 3, 0, 0)
    }
  }

  const spook = (c: Critter) => {
    camper.spookUntil = stage.time + 1.5
    camper.hopV = 430
    mood('wow', 1)
    const dx = FIRE_X - camper.x
    const dy = FIRE_Y - camper.y
    const d = Math.max(1, Math.hypot(dx, dy))
    camper.vx = (dx / d) * 640
    camper.vy = (dy / d) * 640
    camper.tx = camper.x + (dx / d) * 150
    camper.ty = camper.y + (dy / d) * 150
    camper.chop = null
    sfx.tone({ freq: 520, to: 1150, dur: 0.16, type: 'triangle', vol: 0.2 })
    fx.text(camper.x, camper.y - 130, 'EEK!', { size: 40, color: '#ffb4a8' })
    fx.shake(6)
    c.state = 'runaway'
    c.t = 0
    if (camper.carried > 0) {
      camper.carried--
      c.loot = 'log'
      woodPop.kick(-3)
    }
    for (let i = 0; i < 3; i++) sfx.tone({ freq: 700 - i * 110, dur: 0.07, type: 'square', vol: 0.06, delay: 0.1 + i * 0.08 })
  }

  const throwCone = (x0: number, y0: number, target: Critter, who: Walker | null) => {
    const d = dist(x0, y0, target.x, target.y)
    cones.push({ x0, y0, x: x0, y: y0, target, t: 0, dur: clamp(d / 1500, 0.15, 0.32) })
    if (who === camper) thrown = true
    if (who) {
      who.throwT = 0
      who.facing = target.x > who.x ? 1 : -1
      who.stretch.kick(2.5)
    }
    sfx.noise({ dur: 0.12, freq: 900, to: 2800, vol: who === camper ? 0.14 : 0.07 })
  }

  // Helpers (the owl, the friend) leave the golden one for the player.
  const nearestCritter = (x: number, y: number, reach: number, helper = false): Critter | null => {
    let best: Critter | null = null
    let bestD = reach
    for (const c of critters) {
      if (!TARGETABLE.includes(c.state) || (helper && (c.kind === 'gold' || c.born < 1))) continue
      const d = dist(x, y, c.x, c.y - 28 * c.scale) - (c.kind === 'big' ? 20 : 0)
      if (d < bestD) {
        bestD = d
        best = c
      }
    }
    return best
  }

  // ------------------------------------------------------------ night and day

  const startNight = () => {
    phase = 'night'
    phaseT = 0
    spawnIn = 1.2
    boldIn = 5.5
    goldDone = false
    bigDone = false
    dialPop.kick(5)
    sfx.slideDown()
    fx.text(W / 2, 230, `NIGHT ${nights + 1}`, { size: 70, color: '#c9d4ff', life: 1.8, rise: 40 })
  }

  const startDay = () => {
    phase = 'day'
    phaseT = 0
    nights++
    day++
    duskCalled = false
    dawnGlow = 1
    nightPop.kick(6)
    dialPop.kick(5)
    sfx.fanfare()
    fx.flash('#fff3c4', 0.45, 0.5)
    fx.confetti(W * 0.25, 160, 45)
    fx.confetti(W * 0.75, 160, 45)
    fx.text(W / 2, 250, nights === 1 ? 'YOU MADE IT!' : `${nights} NIGHTS!`, { size: 72, color: '#fff3b0', life: 2, rise: 50 })
    mood('yum', 1.5)
    camper.hopV = 380
    critters.forEach((c, i) => {
      if (c.state !== 'bonked' && c.state !== 'flung')
        stage.after(i * 0.07, () => {
          if (critters.includes(c)) scare(c)
        })
    })
    trees.forEach((t, i) => {
      if (t.state !== 'stump') return
      t.state = 'growing'
      t.grow = -i * 0.12
      t.hp = 3
    })
    for (const b of bushes) {
      b.berries = 3
      b.wobble.kick(3)
    }
    introduce(day)
  }

  const startRelight = () => {
    relight = { t: 0, stage: 0, next: 0 }
    sfx.slideDown()
    sfx.noise({ dur: 0.5, freq: 3000, to: 300, vol: 0.2, filter: 'lowpass' })
    fx.burst(FIRE_X, FIRE_Y - 30, { count: 16, color: ['#c8ccd4', '#8d95a3'], speed: 200, life: 1, size: 16, gravity: -120, angle: -Math.PI / 2, spread: 1.4 })
    fx.text(FIRE_X, FIRE_Y - 110, 'PFFFT!', { size: 44, color: '#c8ccd4' })
    stage.after(0.55, () => fx.text(camper.x, camper.y - 140, 'BRRR!', { size: 34, color: '#9fe0ff', life: 1 }))
    for (const c of critters) if (TARGETABLE.includes(c.state) && c.state !== 'runaway') c.state = 'raid'
    camper.chop = null
    camper.tx = FIRE_X - 80
    camper.ty = FIRE_Y + 40
    mood('sad', 2)
    dragId = -1
  }

  const whoomp = () => {
    relight = null
    fuel = 3.6
    flame.value = 1.7
    glow.kick(120)
    fx.flash('#ffb347', 0.35, 0.3)
    fx.ring(FIRE_X, FIRE_Y, '#ffd27a', lightR(fuel), 0.6)
    fx.burst(FIRE_X, FIRE_Y - 30, { count: 26, color: ['#ffe45c', '#ff9d1f', '#ffffff'], speed: 520, life: 0.8, size: 8, gravity: -100, shape: 'spark' })
    fx.shake(8)
    sfx.whoosh()
    sfx.win()
    fireFace('wow', 1)
    mood('happy', 0.1)
    if (camper.carried > 0) {
      const lost = Math.min(2, camper.carried)
      camper.carried -= lost
      fx.text(camper.x, camper.y - 120, `-${lost} 🪵`, { size: 30, color: '#ffb4a8' })
    }
    const R = lightR(fuel) + 30
    for (const c of critters) if (TARGETABLE.includes(c.state) && dist(c.x, c.y, FIRE_X, FIRE_Y) < R) scare(c)
  }

  // ------------------------------------------------------------ walking

  const walk = (o: Walker, tx: number, ty: number, speed: number, dt: number): number => {
    const dx = tx - o.x
    const dy = ty - o.y
    const d = Math.hypot(dx, dy)
    const want = d > 8 ? Math.min(speed, d * 9) : 0
    o.vx = damp(o.vx, d > 0 ? (dx / d) * want : 0, 14, dt)
    o.vy = damp(o.vy, d > 0 ? (dy / d) * want : 0, 14, dt)
    o.x += o.vx * dt
    o.y += o.vy * dt
    // Round the fire, never through it.
    const fd = dist(o.x, o.y, FIRE_X, FIRE_Y - 4)
    if (fd < 62) {
      o.x = FIRE_X + ((o.x - FIRE_X) / Math.max(1, fd)) * 62
      o.y = FIRE_Y - 4 + ((o.y - FIRE_Y + 4) / Math.max(1, fd)) * 62
    }
    for (const t of trees) {
      if (t.state === 'falling') continue
      const r = t.state === 'stump' ? 22 : 30
      const td = dist(o.x, o.y, t.x, t.y - 4)
      if (td < r && td > 0.01) {
        o.x = t.x + ((o.x - t.x) / td) * r
        o.y = t.y - 4 + ((o.y - t.y + 4) / td) * r
      }
    }
    o.x = clamp(o.x, 45, W - 45)
    o.y = clamp(o.y, 165, H - 88)
    const v = Math.hypot(o.vx, o.vy)
    o.moving = clamp(v / 180, 0, 1)
    o.run += dt * (6 + v * 0.045)
    o.lean = damp(o.lean, clamp(o.vx / 380, -1, 1) * 0.17, 10, dt)
    if (Math.abs(o.vx) > 40) o.facing = o.vx > 0 ? 1 : -1
    o.stretch.update(dt)
    if (o.throwT >= 0) {
      o.throwT += dt / 0.25
      if (o.throwT >= 1) o.throwT = -1
    }
    return d
  }

  // One swing: true on the frame the axe lands.
  const swingStep = (o: Walker, dt: number, seconds: number): boolean => {
    if (o.swing < 0) return false
    o.swing += dt / seconds
    let landed = false
    if (!o.hit && o.swing >= 0.45) {
      o.hit = true
      landed = true
    }
    if (o.swing >= 1) o.swing = -1
    return landed
  }
  const startSwing = (o: Walker) => {
    o.swing = 0
    o.hit = false
  }
  const chopSide = (o: Walker, t: Tree) => (o.x < t.x ? -1 : 1)

  const updateCamper = (dt: number) => {
    const c = camper
    const r = relight
    if (stage.time > c.moodUntil && !r) c.mood = 'happy'
    c.shiver = damp(c.shiver, r ? 1 : 0, 6, dt)
    let tx = c.tx
    let ty = c.ty
    if (c.chop && c.chop.state !== 'up') {
      // Job done: stay put so the logs can hop over.
      c.chop = null
      c.tx = c.x
      c.ty = c.y
    }
    if (c.chop) {
      tx = c.chop.x + chopSide(c, c.chop) * 54
      ty = c.chop.y + 5
    }
    const boosted = stage.time < c.boostUntil
    const speed = r ? 600 : boosted ? 560 : 370
    const d = walk(c, tx, ty, speed, dt)

    const v = Math.hypot(c.vx, c.vy)
    if (v > 220) c.wasFast = true
    else if (c.wasFast && v < 60) {
      c.wasFast = false
      c.stretch.value = 0.86
      fx.burst(c.x, c.y, { count: 4, color: 'rgba(255,255,255,0.6)', speed: 120, life: 0.3, size: 9, gravity: 0 })
    }
    if (c.moving > 0.5) {
      c.stepIn -= dt
      if (c.stepIn <= 0) {
        c.stepIn = boosted ? 0.13 : 0.19
        sfx.noise({ dur: 0.04, freq: 300, vol: 0.05, filter: 'lowpass' })
        if (boosted) fx.burst(c.x, c.y - 8, { count: 2, color: ['#ff8fa3', '#ffffff'], speed: 90, life: 0.4, size: 8, gravity: 0, shape: 'star' })
      }
    }
    if (c.hop > 0 || c.hopV > 0) {
      c.hopV -= 1700 * dt
      c.hop = Math.max(0, c.hop + c.hopV * dt)
      if (c.hop === 0) {
        c.stretch.value = 0.8
        c.hopV = 0
        sfx.thud(0.4)
      }
    }

    if (c.chop && d < 18 && !r) {
      c.facing = -chopSide(c, c.chop)
      c.swingCool -= dt
      if (c.swing < 0 && c.swingCool <= 0) startSwing(c)
    }
    if (swingStep(c, dt, 0.24)) {
      c.swingCool = 0.1
      if (c.chop && dist(c.x, c.y, c.chop.x, c.chop.y) < 90) {
        chopHit(c.chop, c.axe > 1 ? 3 : 1, c.x, true)
        c.stretch.kick(-2)
      }
    }
    if (r) return

    feedCool -= dt
    payCool -= dt
    // Wood is only handed over where the camper was sent, so walking past the
    // fire on the way to a build spot does not burn the lot.
    const headedFor = (x: number, y: number, reach: number) => !c.chop && dist(c.tx, c.ty, x, y) < reach
    if (c.carried > 0 && feedCool <= 0 && dist(c.x, c.y, FIRE_X, FIRE_Y) < 130 && headedFor(FIRE_X, FIRE_Y, 160) && fuel + inFlight < FUEL_MAX - 0.3) {
      feedFrom(c)
      feedCool = 0.17
      woodPop.kick(-2)
    }
    if (c.carried > 0 && payCool <= 0) {
      for (const s of spots) {
        if (s.built || s.pop < 0.9 || s.paid + s.incoming >= s.cost || dist(c.x, c.y, s.x, s.y) > 66 || !headedFor(s.x, s.y, 90)) continue
        c.carried--
        s.incoming++
        payCool = 0.16
        woodPop.kick(-2)
        arcs.push({
          x0: c.x,
          y0: c.y - 70,
          x1: s.x,
          y1: s.y - 10,
          t: 0,
          dur: 0.28,
          h: 70,
          done: () => {
            s.incoming--
            s.paid++
            sfx.pop(s.paid + 1)
            fx.burst(s.x, s.y - 8, { count: 6, color: ['#e6bb84', '#fff0c2'], speed: 200, life: 0.35, size: 7 })
            if (s.paid >= s.cost) buildSpot(s)
          },
        })
        break
      }
    }
    for (const b of bushes) {
      b.wobble.update(dt)
      if (b.berries > 0 && dist(c.x, c.y, b.x, b.y - 8) < 52) {
        if (stage.time - lastPick > 0.11) {
          lastPick = stage.time
          b.berries--
          b.wobble.kick(-3)
          sfx.pop(2 + berryStep++)
          fx.burst(b.x, b.y - 24, { count: 6, color: ['#ff4d6d', '#ff8fa3', '#7bd88f'], speed: 240, life: 0.5, size: 8 })
          if (b.berries === 0) {
            berryStep = 0
            c.boostUntil = stage.time + 7
            mood('yum', 1)
            sfx.slideUp()
            fx.text(c.x, c.y - 130, 'ZOOM!', { size: 40, color: '#ff8fa3' })
            c.hopV = 300
          }
        }
      }
    }
    const item = axeItem
    if (item && item.pop >= 1 && dist(c.x, c.y, item.x, item.y) < 56) {
      axeItem = null
      c.axe = 2
      sfx.fanfare()
      fx.confetti(item.x, item.y - 30, 50)
      fx.text(item.x, item.y - 110, 'SUPER AXE!', { size: 50, color: '#ffe14d', life: 1.4 })
      fx.shake(6)
      mood('wow', 1.2)
      c.hopV = 400
    }
  }

  const updatePal = (p: Pal, dt: number) => {
    p.t += dt
    if (p.state === 'lost') {
      p.stretch.update(dt)
      if (p.pop >= 1 && dist(camper.x, camper.y, p.x, p.y) < 84) {
        p.state = 'idle'
        p.t = 0
        p.stretch.kick(5)
        sfx.win()
        fx.burst(p.x, p.y - 70, { count: 14, color: ['#ff7ac8', '#ff5d5d'], speed: 260, life: 0.9, size: 14, shape: 'heart', gravity: -80 })
        fx.confetti(p.x, p.y - 40, 30)
        fx.text(p.x, p.y - 130, 'A FRIEND!', { size: 46, color: '#9fe0ff', life: 1.3 })
        mood('yum', 1.2)
      }
      return
    }
    const homeX = FIRE_X + 92
    const homeY = FIRE_Y + 50
    const room = fuel + inFlight < FUEL_MAX - 0.6
    const lit = (t: Tree) => phase === 'day' || lightAt(t.x, t.y) > 0.1
    const tryFeed = () => {
      p.cool -= dt
      if (p.carried > 0 && room && p.cool <= 0 && dist(p.x, p.y, FIRE_X, FIRE_Y) < 135) {
        feedFrom(p)
        p.cool = 0.28
      }
    }
    if (p.tree && (p.state === 'toTree' || p.state === 'chop') && p.tree.state === 'up' && !lit(p.tree)) p.state = 'idle'
    // The swing always finishes, even if the tree is already on its way down.
    if (swingStep(p, dt, 0.3)) {
      p.swingCool = 0.34
      if (p.state === 'chop' && p.tree) chopHit(p.tree, 1, p.x, false)
    }
    switch (p.state) {
      case 'idle': {
        let best: Tree | null = null
        let bestD = 1e9
        for (const t of trees) {
          if (t.state !== 'up' || t === camper.chop || !lit(t)) continue
          const d = dist(p.x, p.y, t.x, t.y)
          if (d < bestD) {
            bestD = d
            best = t
          }
        }
        p.tree = best
        p.state = best && p.carried < 3 ? 'toTree' : p.carried > 0 ? 'toFire' : 'guard'
        p.t = 0
        walk(p, p.x, p.y, 0, dt)
        break
      }
      case 'toTree': {
        const t = p.tree
        if (!t || t.state !== 'up') {
          p.state = t ? 'collect' : 'idle'
          p.t = 0
          break
        }
        if (walk(p, t.x + chopSide(p, t) * 54, t.y + 5, 250, dt) < 18) {
          p.state = 'chop'
          p.swingCool = 0.2
        }
        break
      }
      case 'chop': {
        const t = p.tree
        if (!t || t.state !== 'up') {
          p.state = 'collect'
          p.t = 0
          break
        }
        walk(p, p.x, p.y, 0, dt)
        p.facing = -chopSide(p, t)
        p.swingCool -= dt
        if (p.swing < 0 && p.swingCool <= 0) startSwing(p)
        break
      }
      case 'collect': {
        let best: Log | null = null
        let bestD = 260
        for (const l of logs) {
          if (l.state !== 'ground') continue
          const d = dist(p.x, p.y, l.x, l.y)
          if (d < bestD) {
            bestD = d
            best = l
          }
        }
        if (best && p.carried < 4) walk(p, best.x, best.y, 250, dt)
        else {
          walk(p, p.x, p.y, 0, dt)
          if (p.t > 1) {
            p.state = p.carried > 0 ? 'toFire' : 'idle'
            p.t = 0
          }
        }
        break
      }
      case 'toFire': {
        const d = walk(p, homeX, homeY, 250, dt)
        tryFeed()
        if (p.carried === 0) p.state = 'idle'
        else if (d < 20 && !room) p.state = 'guard'
        break
      }
      case 'guard': {
        walk(p, homeX, homeY, 250, dt)
        tryFeed()
        if (phase === 'night' && p.cool <= 0) {
          const target = nearestCritter(p.x, p.y, 380, true)
          if (target) {
            throwCone(p.x, p.y - 50, target, p)
            p.cool = 3.4
          }
        }
        if (p.t > 1.5 && p.carried < 3) p.state = 'idle'
        break
      }
    }
  }

  // ------------------------------------------------------------ update

  const updateCritters = (dt: number) => {
    const camperDark = lightAt(camper.x, camper.y) < 0.02
    const nightNo = nights + 1
    for (let i = critters.length - 1; i >= 0; i--) {
      const c = critters[i]!
      c.t += dt
      c.born = Math.min(1, c.born + dt * 3)
      c.flash = Math.max(0, c.flash - dt * 5)
      c.x += c.kx * dt
      c.y += c.ky * dt
      c.kx = damp(c.kx, 0, 7, dt)
      c.ky = damp(c.ky, 0, 7, dt)
      const df = Math.max(1, dist(c.x, c.y, FIRE_X, FIRE_Y))
      const ox = (c.x - FIRE_X) / df
      const oy = (c.y - FIRE_Y) / df
      const quick = c.kind === 'gold' ? 1.5 : c.kind === 'big' ? 0.75 : 1
      let gone = false
      const seek = (tx: number, ty: number, speed: number) => {
        const d = dist(c.x, c.y, tx, ty)
        if (d < 3) return
        const sp = Math.min(speed, d * 4)
        c.x += ((tx - c.x) / d) * sp * dt
        c.y += ((ty - c.y) / d) * sp * dt
      }
      switch (c.state) {
        case 'lurk': {
          const R = fireR()
          let lx = FIRE_X + Math.cos(c.a) * (R + c.off)
          let ly = FIRE_Y + Math.sin(c.a) * (R + c.off)
          const offField = ly < 165 || ly > H - 95
          lx = clamp(lx, 28, W - 28)
          ly = clamp(ly, 165, H - 95)
          if (offField) c.a += clamp(angDiff(Math.cos(c.a) >= 0 ? 0 : Math.PI, c.a), -1, 1) * dt * 1.5
          else if (lightAt(lx, ly) > 0.02) c.a += c.slide * dt * 0.9
          // Spread out along the edge of the light rather than piling up.
          for (const o of critters) {
            if (o === c || o.state !== 'lurk' || dist(o.x, o.y, c.x, c.y) > 78) continue
            c.a += (angDiff(c.a, o.a) >= 0 ? 1 : -1) * dt * 0.5
          }
          seek(lx + Math.sin(stage.time * 1.7 + c.seed) * 10, ly + Math.cos(stage.time * 1.3 + c.seed) * 8, 85 * quick)
          if (c.born >= 1 && lightAt(c.x, c.y) > 0.13) scare(c)
          else if (!relight && camperDark && stage.time > camper.spookUntil && dist(c.x, c.y, camper.x, camper.y) < 270) {
            c.state = 'chase'
            c.t = 0
            sfx.tone({ freq: 130, to: 190, dur: 0.2, type: 'sawtooth', vol: 0.05 })
          }
          break
        }
        case 'chase': {
          if (!camperDark || relight || stage.time < camper.spookUntil) {
            c.state = 'lurk'
            c.a = Math.atan2(c.y - FIRE_Y, c.x - FIRE_X)
            break
          }
          seek(camper.x, camper.y, (135 + nightNo * 8) * quick)
          if (dist(c.x, c.y, camper.x, camper.y) < 42) spook(c)
          else if (lightAt(c.x, c.y) > 0.13) scare(c)
          break
        }
        case 'windup': {
          if (c.t > 0.95) {
            c.state = 'dash'
            c.t = 0
            c.courage = 0.72 + 0.05 * Math.min(nights, 6) + (c.kind === 'big' ? 0.5 : 0)
            c.via = null
            let bestTurn = 9
            for (const s of spots) {
              if (!s.built || (s.kind !== 'trap' && s.kind !== 'fence') || (s.kind === 'trap' && !s.armed)) continue
              const turn = Math.abs(angDiff(s.angle, Math.atan2((c.y - FIRE_Y) / 0.8, c.x - FIRE_X)))
              if (turn < (s.kind === 'trap' ? 1 : 0.6) && turn < bestTurn && dist(s.x, s.y, FIRE_X, FIRE_Y) < df) {
                bestTurn = turn
                c.via = s
              }
            }
            sfx.whoosh()
          }
          break
        }
        case 'dash': {
          const via = c.via
          seek(via ? via.x : FIRE_X, via ? via.y : FIRE_Y, 300 * quick)
          if (via && dist(c.x, c.y, via.x, via.y) < 20) c.via = null
          if (lightAt(c.x, c.y) > 0) {
            c.courage -= dt
            c.size = clamp(0.35 + 0.65 * (c.courage / 0.72), 0.35, 1)
            if (c.courage <= 0) scare(c)
          }
          if (c.state === 'dash' && df < 58) {
            fuel = Math.max(0.5, fuel - (c.kind === 'big' ? 2 : 1))
            c.loot = 'ember'
            c.state = 'runaway'
            c.t = 0
            c.size = Math.max(c.size, 0.75)
            flame.value = 0.65
            fireFace('wow', 0.9)
            fx.text(FIRE_X, FIRE_Y - 130, 'HEY!', { size: 40, color: '#ffb4a8' })
            fx.burst(FIRE_X, FIRE_Y - 30, { count: 8, color: ['#ffe45c', '#ff9d1f'], speed: 260, life: 0.5, size: 7, shape: 'spark' })
            sfx.nope()
            for (let k = 0; k < 3; k++) sfx.tone({ freq: 760 - k * 120, dur: 0.07, type: 'square', vol: 0.06, delay: 0.05 + k * 0.08 })
          }
          break
        }
        case 'raid': {
          seek(FIRE_X, FIRE_Y, 340)
          if (df < 74) {
            c.state = 'runaway'
            c.t = 0
            c.loot = 'log'
          }
          break
        }
        case 'runaway': {
          c.x += ox * 235 * quick * dt
          c.y += oy * 235 * quick * dt
          if (c.x < -50 || c.x > W + 50 || c.y < 110 || c.y > H + 40 || c.t > 5) gone = true
          break
        }
        case 'flee': {
          c.x += ox * 300 * dt
          c.y += oy * 300 * dt
          c.size -= dt * 1.7
          if (c.size <= 0.12) gone = true
          break
        }
        case 'bonked': {
          c.rot += c.spin * dt
          c.vz -= 1500 * dt
          c.z = Math.max(0, c.z + c.vz * dt)
          if (c.t > 0.5) {
            gone = true
            fx.burst(c.x, c.y - 24 - c.z, { count: 12, color: ['#6b52a8', '#cdbdf5', '#3a2a66'], speed: 240, life: 0.5, size: 16, gravity: -60 })
            sfx.pop(-3)
          }
          break
        }
        case 'flung': {
          c.rot += c.spin * dt
          c.z += c.vz * dt
          c.vz -= 500 * dt
          c.x += ox * 260 * dt
          c.y += oy * 260 * dt
          if (c.t > 0.9) gone = true
          break
        }
      }
      if (!gone && (c.state === 'lurk' || c.state === 'chase' || c.state === 'dash' || c.state === 'runaway' || c.state === 'raid')) {
        for (const s of spots) {
          if (!s.built) continue
          if (s.kind === 'trap' && s.armed && dist(c.x, c.y, s.x, s.y) < 46) {
            s.armed = false
            s.rearm = 2.6
            s.snap = 1
            dropLoot(c)
            c.state = 'flung'
            c.t = 0
            c.vz = 900
            c.spin = 18
            stars++
            starPop.kick(4)
            sfx.zap()
            sfx.boing(2)
            fx.shake(7)
            fx.burst(s.x, s.y - 10, { count: 12, color: ['#ffffff', '#ffe14d'], speed: 380, life: 0.5, size: 10, shape: 'star' })
            fx.text(s.x, s.y - 90, 'SNAP!', { size: 44, color: '#ffffff' })
            break
          }
          if (s.kind === 'fence' && c.state !== 'lurk' && dist(c.x, c.y, s.x, s.y) < 52) {
            s.wobble.kick(7)
            sfx.boing(-2)
            bonk(c, FIRE_X, FIRE_Y, 'BOING!')
            break
          }
        }
      }
      if (gone) critters.splice(i, 1)
    }

    if (phase !== 'night' || relight) return
    spawnIn -= dt
    const alive = critters.length
    if (spawnIn <= 0 && alive < Math.min(14, 3 + nightNo * 2)) {
      let kind: Critter['kind'] = 'shade'
      if (nightNo >= 2 && !goldDone && phaseT > 7 && (nightNo === 2 || stage.rand() < 0.2)) {
        kind = 'gold'
        goldDone = true
      } else if (nightNo >= 3 && !bigDone && phaseT > 5) {
        kind = 'big'
        bigDone = true
      }
      spawnCritter(kind)
      spawnIn = Math.max(0.8, 2.3 - 0.3 * (nightNo - 1)) * lerp(0.7, 1.2, stage.rand())
    }
    boldIn -= dt
    if (boldIn <= 0) {
      const lurkers = critters.filter((c) => c.state === 'lurk' && c.born >= 1 && c.t > 1)
      if (lurkers.length > 0) {
        const c = pick(lurkers, stage.rand())
        c.state = 'windup'
        c.t = 0
        sfx.tone({ freq: 110, to: 170, dur: 0.6, type: 'sawtooth', vol: 0.07 })
        boldIn = Math.max(2, 4.6 - 0.45 * (nightNo - 1)) * lerp(0.8, 1.2, stage.rand())
      } else boldIn = 0.5
    }
  }

  const update = (dt: number) => {
    const time = stage.time
    phaseT += dt
    const dayLen = day === 1 ? 24 : 22
    const nightLen = nights === 0 ? 22 : 25
    if (phase === 'day') {
      if (!duskCalled && phaseT >= dayLen - 5) {
        duskCalled = true
        dialPop.kick(4)
        sfx.tone({ freq: 430, to: 400, dur: 0.22, type: 'sine', vol: 0.16 })
        sfx.tone({ freq: 400, to: 340, dur: 0.4, type: 'sine', vol: 0.16, delay: 0.3 })
      }
      if (phaseT >= dayLen) startNight()
    } else if (phaseT >= nightLen && !relight) startDay()
    const dusk = phase === 'day' ? clamp((phaseT - (dayLen - 5)) / 5, 0, 1) : 0
    dark = damp(dark, phase === 'night' ? 1 : dusk * 0.32, phase === 'night' ? 1.4 : 2.4, dt)
    dawnGlow = Math.max(0, dawnGlow - dt / 2.5)

    // The fire burns down: slowly by day, in earnest at night.
    if (!relight) {
      if (phase === 'night') fuel -= (0.26 + 0.025 * Math.min(nights, 6)) * dt
      else if (fuel > 2.6) fuel -= 0.05 * dt
      if (phase === 'night' && fuel <= 0.5) startRelight()
    }
    glow.target = fireR()
    glow.update(dt)
    flame.update(dt)
    starPop.update(dt)
    nightPop.update(dt)
    woodPop.update(dt)
    dialPop.update(dt)

    const r = relight
    if (r) {
      r.t += dt
      const near = dist(camper.x, camper.y, camper.tx, camper.ty) < 34
      if (r.stage === 0 && (near || r.t > 1.7)) {
        r.stage = 1
        r.next = r.t + 0.1
      }
      if (r.stage >= 1 && r.t >= r.next) {
        if (r.stage <= 3) {
          r.stage++
          r.next = r.t + 0.2
          camper.throwT = 0
          camper.facing = 1
          sfx.tick()
          sfx.tone({ freq: 2400, to: 900, dur: 0.05, type: 'square', vol: 0.06 })
          fx.burst(FIRE_X - 20, FIRE_Y - 20, { count: 7, color: ['#ffe45c', '#ffffff'], speed: 260, life: 0.3, size: 6, shape: 'spark' })
        } else whoomp()
      }
    }

    updateCamper(dt)
    if (pal) updatePal(pal, dt)

    for (const t of trees) {
      t.shake.update(dt)
      if (t.state === 'falling') {
        t.fall += dt / 0.5
        if (t.fall >= 1) landTree(t)
      } else if (t.state === 'growing') {
        t.grow += dt / 0.55
        if (t.grow >= 1) {
          t.grow = 1
          t.state = 'up'
        }
      }
    }

    let toCamper = 0
    for (const l of logs) if (l.state === 'toCamper') toCamper++
    for (let i = logs.length - 1; i >= 0; i--) {
      const l = logs[i]!
      l.age += dt
      if (l.state === 'ground') {
        if (l.z > 0 || l.vz > 0) {
          l.x += l.vx * dt
          l.y += l.vy * dt
          l.z += l.vz * dt
          l.vz -= 1700 * dt
          l.rot += l.spin * dt
          if (l.z <= 0) {
            l.z = 0
            if (l.vz < -200) {
              l.vz = -l.vz * 0.4
              l.vx *= 0.5
              l.vy *= 0.5
              l.spin *= 0.4
              sfx.tone({ freq: 170, to: 110, dur: 0.05, type: 'triangle', vol: 0.08 })
            } else {
              l.vz = 0
              l.spin = 0
            }
          }
        }
        l.x = clamp(l.x, 50, W - 50)
        l.y = clamp(l.y, 170, H - 90)
        if (l.age > 0.3 && !relight) {
          if (camper.carried + toCamper < CARRY_MAX && dist(l.x, l.y, camper.x, camper.y) < 140) {
            l.state = 'toCamper'
            l.age = 0
            toCamper++
          } else if (pal && pal.state === 'collect' && pal.carried < 4 && dist(l.x, l.y, pal.x, pal.y) < 70) {
            l.state = 'toPal'
            l.age = 0
          }
        }
      } else {
        const who: Walker | null = l.state === 'toCamper' ? camper : pal
        if (!who) {
          l.state = 'ground'
          continue
        }
        const d = dist(l.x, l.y, who.x, who.y)
        const step = (420 + l.age * 1600) * dt
        l.z = damp(l.z, 55, 10, dt)
        l.rot += 12 * dt
        if (d < 22 || d < step) {
          logs.splice(i, 1)
          who.carried++
          who.stretch.kick(2.5)
          if (who === camper) {
            if (time - lastPick > 1.2) pickStep = 0
            lastPick = time
            sfx.pop(pickStep++)
            woodPop.kick(4)
            fx.burst(who.x, who.y - 74, { count: 4, color: '#ffe9b0', speed: 130, life: 0.3, size: 6 })
          } else sfx.tone({ freq: 500, to: 800, dur: 0.05, type: 'sine', vol: 0.05 })
          continue
        }
        l.x += ((who.x - l.x) / d) * step
        l.y += ((who.y - l.y) / d) * step
      }
    }

    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i]!
      a.t += dt / a.dur
      if (a.t >= 1) {
        arcs.splice(i, 1)
        a.done()
      }
    }

    for (const s of spots) {
      s.wobble.update(dt)
      s.hoot = damp(s.hoot, 0, 6, dt)
      if (!s.built) continue
      if (s.kind === 'trap') {
        if (!s.armed) {
          s.rearm -= dt
          if (s.rearm <= 0) {
            s.armed = true
            sfx.tick()
          }
        } else s.snap = damp(s.snap, 0, 5, dt)
      } else if (s.kind === 'owl' && phase === 'night' && !relight) {
        s.cool -= dt
        if (s.cool <= 0) {
          const target = nearestCritter(s.x, s.y - 40, 340, true)
          if (target) {
            throwCone(s.x, s.y - 100, target, null)
            s.hoot = 1
            s.cool = 3.2
            sfx.tone({ freq: 430, to: 390, dur: 0.16, type: 'sine', vol: 0.12 })
            sfx.tone({ freq: 400, to: 350, dur: 0.22, type: 'sine', vol: 0.12, delay: 0.18 })
          } else s.cool = 0.4
        }
      }
    }

    updateCritters(dt)

    for (let i = cones.length - 1; i >= 0; i--) {
      const c = cones[i]!
      c.t += dt / c.dur
      const tx = c.target.x
      const ty = c.target.y - 28 * c.target.scale - c.target.z
      const p = Math.min(1, c.t)
      c.x = lerp(c.x0, tx, p)
      c.y = lerp(c.y0, ty, p) - Math.sin(p * Math.PI) * 46
      if (c.t >= 1) {
        cones.splice(i, 1)
        if (critters.includes(c.target) && TARGETABLE.includes(c.target.state)) bonk(c.target, c.x0, c.y0)
        else fx.burst(tx, ty, { count: 5, color: '#c98e55', speed: 160, life: 0.3, size: 7 })
      }
    }

    for (const f of fireflies) {
      f.x += Math.sin(time * 0.6 + f.ph) * 14 * dt
      f.y += Math.cos(time * 0.45 + f.ph * 1.7) * 11 * dt
    }

    // Ambience, none of it per frame: crackle always, crickets by night.
    crackleIn -= dt
    if (crackleIn <= 0 && !relight) {
      crackleIn = rnd(0.15, 0.6)
      sfx.noise({ dur: 0.03, freq: rnd(1800, 4200), vol: 0.03 + 0.003 * fuel, filter: 'highpass' })
      if (Math.random() < 0.5) fx.burst(FIRE_X + rnd(-14, 14), FIRE_Y - 50, { count: 1, color: '#ffd27a', speed: 120, life: 0.9, size: 5, gravity: -140, angle: -Math.PI / 2, spread: 0.9 })
    }
    if (phase === 'night') {
      cricketIn -= dt
      if (cricketIn <= 0) {
        cricketIn = rnd(1.4, 3.2)
        for (let k = 0; k < 3; k++) sfx.tone({ freq: 4300, dur: 0.04, type: 'sine', vol: 0.02, delay: k * 0.07 })
      }
    }
  }

  // ------------------------------------------------------------ draw

  const items: { y: number; draw: () => void }[] = []

  const drawTree = (g: CanvasRenderingContext2D, t: Tree) => {
    if (t.state === 'stump') {
      drawStump(g, t.x, t.y, t.s)
      return
    }
    if (t.state === 'growing') {
      drawStump(g, t.x, t.y, t.s)
      if (t.grow > 0) drawPine(g, pineNear, t.x, t.y, t.s * ease.outBack(t.grow))
      return
    }
    if (t.state === 'falling') {
      drawStump(g, t.x, t.y, t.s)
      g.globalAlpha = t.fall > 0.85 ? (1 - t.fall) / 0.15 : 1
      drawPine(g, pineNear, t.x, t.y - 8, t.s, t.dir * ease.inQuad(t.fall) * 1.5)
      g.globalAlpha = 1
      return
    }
    ellipse(g, t.x, t.y + 2, 50 * t.s, 15 * t.s, 'rgba(0,0,0,0.2)')
    // Whoever walks behind a pine shows through it.
    const hides = (o: { x: number; y: number }) => o.y < t.y && o.y > t.y - 175 * t.s && Math.abs(o.x - t.x) < 60 * t.s
    const friendBehind = pal !== null && pal.pop > 0 && hides(pal)
    if (hides(camper) || friendBehind) g.globalAlpha = 0.45
    const sway = Math.sin(stage.time * 1.3 + t.phase) * 0.022 + t.shake.value * 0.035
    const press = 1 - Math.min(0.12, Math.abs(t.shake.value) * 0.03)
    drawPine(g, pineNear, t.x, t.y, t.s, sway, 1, press)
    g.globalAlpha = 1
    if (t.hp < 3) {
      // The notch gets deeper with each chop.
      const cut = (3 - t.hp) * 5 * t.s
      ellipse(g, t.x, t.y - 12 * t.s, 4 + cut, 3 + cut * 0.4, '#f2d3a0')
    }
  }

  const drawSpotThing = (g: CanvasRenderingContext2D, s: Spot, ghost: boolean) => {
    const time = stage.time
    if (s.kind === 'torch') drawTorch(g, s.x, s.y, time, true)
    else if (s.kind === 'trap') drawTrap(g, s.x, s.y, s.snap, ghost || s.armed)
    else if (s.kind === 'owl') drawOwl(g, s.x, s.y, time, s.hoot)
    else if (s.kind === 'tent') drawTent(g, s.x, s.y, time)
    else {
      const tx = -Math.sin(s.angle)
      const ty = Math.cos(s.angle) * 0.8
      const n = Math.hypot(tx, ty)
      drawFence(g, s.x, s.y, tx / n, ty / n, s.wobble.value)
    }
  }

  const critterR = (c: Critter) => 30 * c.scale * Math.max(0.1, c.size) * ease.outBack(c.born)

  const poseOf = (o: Walker, m: Mood, lookX: number, lookY: number, seed: number, extra: { hop: number; shiver: number; golden: boolean }) => ({
    x: o.x,
    y: o.y,
    hop: extra.hop,
    stretch: o.stretch.value,
    lean: o.lean,
    facing: o.facing,
    run: o.run,
    moving: o.moving,
    mood: m,
    lookX,
    lookY,
    blink: blinkAt(stage.time, seed),
    logs: o.carried,
    swing: o.swing,
    throwing: o.throwT,
    shiver: extra.shiver,
    golden: extra.golden,
    time: stage.time,
  })

  const hole = (x: number, y: number, r: number, strength: number) => {
    if (r <= 2 || strength <= 0) return
    const grad = dg.createRadialGradient(x / 2, y / 2, 0, x / 2, y / 2, r / 2)
    grad.addColorStop(0, `rgba(0,0,0,${strength})`)
    grad.addColorStop(0.62, `rgba(0,0,0,${0.93 * strength})`)
    grad.addColorStop(0.88, `rgba(0,0,0,${0.42 * strength})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    dg.fillStyle = grad
    dg.beginPath()
    dg.arc(x / 2, y / 2, r / 2, 0, TAU)
    dg.fill()
  }

  const hintTarget = (): { x: number; y: number; r: number } | null => {
    if (relight) return null
    const lostPal = pal && pal.state === 'lost' && pal.pop >= 1 ? pal : null
    if (phase === 'night') {
      let best: Critter | null = null
      let bestD = 1e9
      for (const c of critters) {
        if (!TARGETABLE.includes(c.state) || c.born < 1) continue
        const d = dist(c.x, c.y, FIRE_X, FIRE_Y) - (c.state === 'dash' || c.state === 'windup' ? 500 : 0)
        if (d < bestD) {
          bestD = d
          best = c
        }
      }
      if (best) return { x: best.x, y: best.y - 28, r: 50 }
    }
    if (camper.carried > 0 && fuel < FUEL_MAX - 3) return { x: FIRE_X, y: FIRE_Y - 40, r: 70 }
    for (const s of spots) if (!s.built && s.pop >= 1 && camper.carried >= s.cost - s.paid) return { x: s.x, y: s.y - 10, r: 56 }
    if (lostPal) return { x: lostPal.x, y: lostPal.y - 50, r: 60 }
    if (axeItem) return { x: axeItem.x, y: axeItem.y - 20, r: 56 }
    let best: Tree | null = null
    let bestD = 1e9
    for (const t of trees) {
      if (t.state !== 'up') continue
      const d = dist(t.x, t.y, camper.x, camper.y) + (phase === 'night' && lightAt(t.x, t.y) < 0 ? 600 : 0)
      if (d < bestD) {
        bestD = d
        best = t
      }
    }
    return best ? { x: best.x, y: best.y - 80 * best.s, r: 64 } : null
  }

  const draw = (g: CanvasRenderingContext2D) => {
    const time = stage.time
    g.drawImage(ground, 0, 0)
    const breath = 1 + 0.025 * Math.sin(time * 2.1) + 0.012 * Math.sin(time * 9.7)
    const Rv = Math.max(30, glow.value * breath)

    // The circle of light on the grass: the thing to watch all game.
    const warm = g.createRadialGradient(FIRE_X, FIRE_Y, 0, FIRE_X, FIRE_Y, Rv)
    warm.addColorStop(0, 'rgba(255,224,130,0.42)')
    warm.addColorStop(0.7, 'rgba(255,206,110,0.2)')
    warm.addColorStop(1, 'rgba(255,196,96,0)')
    g.fillStyle = warm
    g.beginPath()
    g.arc(FIRE_X, FIRE_Y, Rv, 0, TAU)
    g.fill()
    g.strokeStyle = `rgba(255,240,180,${0.5 - dark * 0.2})`
    g.lineWidth = 4
    g.beginPath()
    g.arc(FIRE_X, FIRE_Y, Rv * 0.97, 0, TAU)
    g.stroke()

    // Build spots: a dashed ring on the ground and what it costs.
    for (const s of spots) {
      if (s.built || s.pop <= 0) continue
      const can = camper.carried > 0
      const pulse = 0.55 + 0.25 * Math.sin(time * (can ? 7 : 3))
      g.save()
      g.translate(s.x, s.y)
      g.scale(s.pop, s.pop)
      ellipse(g, 0, 0, 50, 28, `rgba(255,246,190,${0.16 + (can ? 0.12 : 0)})`)
      g.setLineDash([12, 10])
      g.lineDashOffset = -time * 22
      g.strokeStyle = `rgba(255,250,215,${pulse + 0.2})`
      g.lineWidth = 5
      g.beginPath()
      g.ellipse(0, 0, 50, 28, 0, 0, TAU)
      g.stroke()
      g.setLineDash([])
      for (let i = 0; i < s.cost; i++) {
        g.globalAlpha = i < s.paid ? 1 : 0.42
        drawLog(g, (i - (s.cost - 1) / 2) * 30, 46 - Math.abs(s.wobble.value) * 9, s.wobble.value * 0.25 * (i % 2 ? 1 : -1), 0.7)
      }
      g.globalAlpha = 1
      g.restore()
    }

    items.length = 0
    for (const t of trees) items.push({ y: t.y, draw: () => drawTree(g, t) })
    for (const b of bushes) items.push({ y: b.y, draw: () => drawBush(g, b.x, b.y, b.berries, b.wobble.value) })
    for (const s of spots) {
      if (s.pop <= 0) continue
      const flat = s.kind === 'trap'
      if (s.built) items.push({ y: flat ? s.y - 40 : s.y, draw: () => squash(g, s.x, s.y, s.up, s.up, () => drawSpotThing(g, s, false)) })
      else
        items.push({
          y: flat ? s.y - 40 : s.y,
          draw: () => {
            g.globalAlpha = 0.62
            const bob = flat ? 0 : Math.sin(time * 3 + s.x) * 4
            squash(g, s.x, s.y - bob, s.pop, s.pop, () => drawSpotThing(g, s, true))
            g.globalAlpha = 1
          },
        })
    }
    for (const l of logs)
      items.push({
        y: l.y,
        draw: () => {
          if (l.state === 'ground') shadow(g, l.x, l.y + 4, 20, 1 - Math.min(0.6, l.z / 200))
          drawLog(g, l.x, l.y - 6 - l.z, l.rot)
        },
      })
    const item = axeItem
    if (item && item.pop > 0)
      items.push({
        y: item.y,
        draw: () => {
          shadow(g, item.x, item.y + 4, 26, item.pop)
          const spin = time * 1.5
          for (let i = 0; i < 6; i++) {
            const a = spin + (i / 6) * TAU
            circle(g, item.x + Math.cos(a) * 40, item.y - 30 + Math.sin(a) * 26, 4 + Math.sin(time * 5 + i) * 2, '#fff3a0')
          }
          sprite(g, '🪓', item.x, item.y - 30 + Math.sin(time * 3) * 6, 78 * item.pop, Math.sin(time * 2) * 0.2)
        },
      })

    // Who the camper looks at: the finger, else where they are going.
    let lookTx = camper.chop ? camper.chop.x : camper.tx
    let lookTy = camper.chop ? camper.chop.y - 60 : camper.ty
    for (const p of stage.pointers.values()) {
      lookTx = p.x
      lookTy = p.y
    }
    const lookX = clamp((lookTx - camper.x) / 160, -1, 1)
    const lookY = clamp((lookTy - (camper.y - 60)) / 160, -1, 1)
    items.push({
      y: camper.y,
      draw: () => drawCamper(g, LOOK_CAMPER, poseOf(camper, camper.mood, lookX, lookY, 0, { hop: camper.hop, shiver: camper.shiver, golden: camper.axe > 1 })),
    })
    const friend = pal
    if (friend && friend.pop > 0) {
      const lost = friend.state === 'lost'
      items.push({
        y: friend.y,
        draw: () => {
          squash(g, friend.x, friend.y, friend.pop, friend.pop, () =>
            drawCamper(
              g,
              LOOK_FRIEND,
              poseOf(friend, lost ? 'sad' : 'happy', clamp((camper.x - friend.x) / 200, -1, 1), 0, 2, { hop: 0, shiver: lost ? 1 : 0, golden: false }),
            ),
          )
          if (lost) {
            const by = friend.y - 128 + Math.sin(time * 5) * 5
            circle(g, friend.x, by, 22, '#ffffff', '#3a2a66', 3)
            label(g, '!', friend.x, by + 1, 30, '#ff5d5d', null)
          }
        },
      })
    }
    for (const c of critters)
      items.push({
        y: c.y,
        draw: () => {
          const r = critterR(c)
          if (r < 2) return
          const shakeX = c.state === 'windup' ? Math.sin(time * 60) * 3 : 0
          const gold = c.kind === 'gold'
          shadow(g, c.x, c.y + 2, r * 1.1, 1 - Math.min(0.7, c.z / 300), 0.25)
          squash(
            g,
            c.x + shakeX,
            c.y - r - c.z,
            1,
            1,
            () => drawCritterBody(g, c.x + shakeX, c.y - c.z, r, time, c.seed, c.flash > 0 ? '#ffffff' : gold ? '#ffcf3a' : '#35265f', gold ? '#a86a00' : '#1d1438'),
            c.rot,
          )
        },
      })
    const level = fuel / FUEL_MAX
    items.push({
      y: FIRE_Y + 12,
      draw: () =>
        drawFire(g, FIRE_X, FIRE_Y, {
          level,
          kick: flame.value,
          time,
          mood: time < fireMoodUntil ? fireMood : fuel < 2.2 ? 'sad' : 'happy',
          lookX: clamp((camper.x - FIRE_X) / 200, -1, 1),
          lookY: clamp((camper.y - FIRE_Y) / 200, -1, 1),
          out: !!relight,
        }),
    })
    items.sort((a, b) => a.y - b.y)
    for (const it of items) it.draw()

    // A bouncing arrow over the fire while there is wood to give it.
    if (camper.carried > 0 && fuel < FUEL_MAX - 1.5 && !relight && dist(camper.x, camper.y, FIRE_X, FIRE_Y) > 135) {
      const ay = FIRE_Y - 150 - level * 80 + Math.sin(time * 6) * 8
      drawLog(g, FIRE_X, ay - 26, 0, 0.9)
      g.beginPath()
      g.moveTo(FIRE_X - 16, ay - 8)
      g.lineTo(FIRE_X + 16, ay - 8)
      g.lineTo(FIRE_X, ay + 12)
      g.closePath()
      g.fillStyle = '#fff3b0'
      g.fill()
      g.strokeStyle = 'rgba(30,20,40,0.85)'
      g.lineWidth = 4
      g.stroke()
    }

    g.drawImage(front, 0, H - FRONT_H)

    // Sunset, then the dark with holes cut where there is light.
    const dayLen = day === 1 ? 24 : 22
    const dusk = phase === 'day' ? clamp((phaseT - (dayLen - 5)) / 5, 0, 1) : clamp(1 - phaseT / 3, 0, 1)
    if (dusk > 0.01) {
      g.fillStyle = `rgba(255,110,50,${0.2 * dusk})`
      g.fillRect(0, 0, W, H)
    }
    if (dawnGlow > 0.01) {
      g.fillStyle = `rgba(255,226,140,${0.28 * dawnGlow})`
      g.fillRect(0, 0, W, H)
    }
    if (dark > 0.01) {
      dg.globalCompositeOperation = 'source-over'
      dg.clearRect(0, 0, W / 2, H / 2)
      dg.fillStyle = `rgba(8,10,34,${0.9 * dark})`
      dg.fillRect(0, 0, W / 2, H / 2)
      dg.globalCompositeOperation = 'destination-out'
      hole(FIRE_X, FIRE_Y - 8, Rv, 1)
      for (const s of spots) if (s.built && s.light > 0) hole(s.x, s.y - 30, s.light * s.up * (1 + 0.03 * Math.sin(time * 5 + s.x)), 1)
      hole(camper.x, camper.y - 40, 100, 0.72)
      if (friend && friend.pop > 0) hole(friend.x, friend.y - 40, 80, 0.6)
      g.drawImage(darkCanvas, 0, 0, W, H)
      const tint = g.createRadialGradient(FIRE_X, FIRE_Y, 0, FIRE_X, FIRE_Y, Rv)
      tint.addColorStop(0, `rgba(255,140,40,${0.26 * dark})`)
      tint.addColorStop(0.75, `rgba(255,140,40,${0.14 * dark})`)
      tint.addColorStop(1, 'rgba(255,150,50,0)')
      g.fillStyle = tint
      g.beginPath()
      g.arc(FIRE_X, FIRE_Y, Rv, 0, TAU)
      g.fill()

      for (const f of fireflies) {
        const a = dark * (0.5 + 0.5 * Math.sin(time * 2 + f.ph))
        if (a < 0.05) continue
        g.globalAlpha = a * 0.25
        circle(g, f.x, f.y, 9, '#eaff8a')
        g.globalAlpha = a
        circle(g, f.x, f.y, 3, '#f6ffc0')
      }
      g.globalAlpha = 1
    }

    // Eyes glow through the dark; so does whatever a thief is carrying.
    for (const c of critters) {
      const r = critterR(c)
      if (r < 3) continue
      const cx = c.x + (c.state === 'windup' ? Math.sin(time * 60) * 3 : 0)
      const cy = c.y - r * 0.95 - c.z
      if (c.state === 'bonked' || c.state === 'flung') {
        // Knocked silly: drawn over the dark so the tumble is seen.
        squash(g, cx, cy, 1, 1, () => drawCritterBody(g, cx, c.y - c.z, r, time, c.seed, c.flash > 0 ? '#ffffff' : c.kind === 'gold' ? '#ffcf3a' : '#7a5fc4', '#2a1d52'), c.rot)
        drawDizzy(g, cx, cy, r)
      } else {
        if (c.kind === 'gold') {
          // The golden one shines through the dark: a rare thing to spot.
          g.globalAlpha = 0.22 + 0.08 * Math.sin(time * 6)
          circle(g, cx, cy, r * 2.1, '#ffe98a')
          g.globalAlpha = 1
          drawCritterBody(g, cx, c.y - c.z, r, time, c.seed, c.flash > 0 ? '#ffffff' : '#ffcf3a', '#a86a00')
        }
        const angry = c.state === 'windup' || c.state === 'dash' || c.state === 'chase' || c.state === 'raid'
        const color = angry ? '#ff5a3c' : c.kind === 'gold' ? '#ffffff' : '#ffe14d'
        const scared = c.state === 'flee'
        const tx = c.state === 'chase' ? camper.x : FIRE_X
        const ty = c.state === 'chase' ? camper.y : FIRE_Y
        const d = Math.max(1, dist(c.x, c.y, tx, ty))
        const away = scared || c.state === 'runaway' ? -1 : 1
        drawCritterEyes(g, cx, cy, r, color, ((tx - c.x) / d) * away, ((ty - c.y) / d) * away, scared ? 0 : blinkAt(time, c.seed), angry, dark)
      }
      if (c.loot !== 'none') {
        const ly = c.y - r * 2 - 14 - c.z + Math.sin(time * 14) * 3
        drawLog(g, c.x, ly, 0.2, 0.95)
        if (c.loot === 'ember') {
          circle(g, c.x + 10, ly - 10, 8 + Math.sin(time * 20) * 2, '#ff9d1f')
          circle(g, c.x + 10, ly - 9, 4, '#ffe45c')
        }
      }
      if (c.kind === 'gold' && Math.random() < 0.3) fx.burst(c.x + rnd(-20, 20), c.y - rnd(10, 50), { count: 1, color: '#fff3a0', speed: 40, life: 0.5, size: 8, shape: 'star', gravity: -40 })
    }
    if (dark > 0.3) {
      for (const s of spots) {
        if (!s.built || s.kind !== 'owl') continue
        g.globalAlpha = 0.35 * dark
        circle(g, s.x - 10, s.y - 104 - s.hoot * 8, 8, '#ffe14d')
        circle(g, s.x + 10, s.y - 104 - s.hoot * 8, 8, '#ffe14d')
        g.globalAlpha = 1
      }
    }

    for (const a of arcs) {
      const p = clamp(a.t, 0, 1)
      drawLog(g, lerp(a.x0, a.x1, p), lerp(a.y0, a.y1, p) - Math.sin(p * Math.PI) * a.h, p * 7, 1 - p * 0.25)
    }
    for (const c of cones) drawCone(g, c.x, c.y, c.t * 14, 1.15)

    // The sky dial: the sun walks to the moon, then the moon walks to the sun.
    const dialS = dialPop.value
    g.save()
    g.translate(FIRE_X, 48)
    g.scale(dialS, dialS)
    rrect(g, -140, -25, 280, 50, 25, phase === 'day' ? 'rgba(40,90,140,0.62)' : 'rgba(16,18,46,0.75)', 'rgba(255,255,255,0.5)', 3)
    const nightLen = nights === 0 ? 22 : 25
    const p = clamp(phaseT / (phase === 'day' ? dayLen : nightLen), 0, 1)
    g.strokeStyle = 'rgba(255,255,255,0.25)'
    g.lineWidth = 7
    g.beginPath()
    g.moveTo(-100, 0)
    g.lineTo(100, 0)
    g.stroke()
    g.strokeStyle = phase === 'day' ? '#ffd23e' : '#9db4ff'
    g.beginPath()
    g.moveTo(-100, 0)
    g.lineTo(lerp(-100, 100, p), 0)
    g.stroke()
    g.globalAlpha = 0.55
    sprite(g, phase === 'day' ? '🌙' : '☀️', 112, 0, 26)
    g.globalAlpha = 1
    sprite(g, phase === 'day' ? '☀️' : '🌙', lerp(-100, 100, p), -2 + Math.sin(time * 3) * 2, 40)
    g.restore()

    const pop = (s: Spring, x: number, y: number, text: string, size: number, color = '#ffffff') => {
      g.save()
      g.translate(x, y)
      g.scale(s.value, s.value)
      label(g, text, 0, 0, size, color)
      g.restore()
    }
    pop(nightPop, 86, 48, `🌙 ${nights}`, 38)
    pop(starPop, 210, 48, `⭐ ${stars}`, 38, '#fff3b0')
    pop(woodPop, W - 100, 48, `🪵 ${camper.carried}`, 38, camper.carried >= CARRY_MAX ? '#ffb4a8' : '#ffffff')

    const teach = !thrown && phase === 'night' && critters.some((c) => c.born >= 1 && TARGETABLE.includes(c.state))
    if (teach || time - lastTouch > (touched ? 5 : 2.5)) {
      const h = hintTarget()
      if (h) hint(g, h.x, h.y, time, h.r)
    }
  }

  // ------------------------------------------------------------ touch

  const treeAt = (x: number, y: number): Tree | null => {
    let best: Tree | null = null
    let bestD = 1e9
    for (const t of trees) {
      if (t.state !== 'up') continue
      const cy = t.y - 78 * t.s
      const nx = (x - t.x) / (62 * t.s + 14)
      const ny = (y - cy) / (100 * t.s + 12)
      const d = nx * nx + ny * ny
      if (d < 1 && d < bestD) {
        bestD = d
        best = t
      }
    }
    return best
  }

  const down = (p: Pointer) => {
    lastTouch = stage.time
    touched = true
    if (relight) {
      fx.ring(p.x, p.y, '#9fe0ff', 46, 0.3)
      sfx.tick()
      return
    }
    const c = nearestCritter(p.x, p.y, 88)
    if (c) {
      fx.ring(p.x, p.y, '#ffe14d', 44, 0.25)
      throwCone(camper.x + camper.facing * 20, camper.y - 56, c, camper)
      return
    }
    if (dist(p.x, p.y, camper.x, camper.y - 45) < 46 && camper.hop === 0) {
      camper.hopV = 460
      camper.stretch.value = 0.75
      mood('yum', 0.7)
      sfx.boing(Math.round(rnd(0, 3)))
      fx.text(camper.x, camper.y - 130, pick(['HEY!', 'HEHE!', 'WHEE!']), { size: 32, color: '#fff3b0', life: 0.6 })
      fx.burst(camper.x, camper.y, { count: 6, color: '#ffffff', speed: 200, life: 0.3, size: 8, gravity: 0 })
      return
    }
    for (const s of spots) {
      if (s.built && s.kind === 'owl' && dist(p.x, p.y, s.x, s.y - 70) < 50) {
        s.hoot = 1
        sfx.tone({ freq: 430, to: 390, dur: 0.16, type: 'sine', vol: 0.18 })
        sfx.tone({ freq: 400, to: 350, dur: 0.22, type: 'sine', vol: 0.18, delay: 0.18 })
        fx.text(s.x, s.y - 140, 'HOO!', { size: 30, life: 0.6 })
        return
      }
    }
    // Things to walk to come before the trees they stand among.
    const goTo = (x: number, y: number) => {
      camper.chop = null
      camper.tx = x
      camper.ty = y
      if (dist(x, y, camper.x, camper.y) > 120) camper.stretch.value = 1.14
      fx.ring(p.x, p.y, '#fff6c9', 60, 0.3)
      sfx.pop(Math.round(rnd(-3, -1)))
    }
    const lost = pal && pal.state === 'lost' && pal.pop >= 1 ? pal : null
    if (lost && dist(p.x, p.y, lost.x, lost.y - 55) < 80) {
      goTo(lost.x + (camper.x < lost.x ? -50 : 50), lost.y + 6)
      return
    }
    if (axeItem && dist(p.x, p.y, axeItem.x, axeItem.y - 25) < 70) {
      goTo(axeItem.x, axeItem.y + 4)
      return
    }
    for (const s of spots) {
      if (!s.built && s.pop >= 0.9 && dist(p.x, p.y, s.x, s.y - 20) < 64) {
        goTo(s.x, s.y + 10)
        s.wobble.kick(5)
        if (camper.carried === 0) {
          // Nothing to build with yet: the price tag shakes and asks for wood.
          sfx.nope()
          fx.text(s.x, s.y - 100, '🪵?', { size: 40, life: 0.8, rise: 30 })
        }
        return
      }
    }
    for (const b of bushes) {
      if (dist(p.x, p.y, b.x, b.y - 22) < 50) {
        goTo(b.x, b.y + 8)
        b.wobble.kick(3)
        sfx.noise({ dur: 0.1, freq: 2600, vol: 0.09, filter: 'highpass' })
        return
      }
    }
    const t = treeAt(p.x, p.y)
    if (t) {
      const same = camper.chop === t
      camper.chop = t
      t.shake.kick(p.x < t.x ? 2.2 : -2.2)
      fx.ring(t.x, t.y - 70 * t.s, '#d8f5c0', 70, 0.3)
      fx.burst(t.x, t.y - 100 * t.s, { count: 4, color: ['#46ba6a', '#2c8a4c'], speed: 160, life: 0.6, size: 9, gravity: 300 })
      sfx.noise({ dur: 0.1, freq: 2600, vol: 0.09, filter: 'highpass' })
      // Already there: every extra tap is an extra chop.
      if (same && dist(camper.x, camper.y, t.x, t.y) < 80 && (camper.swing < 0 || camper.swing > 0.5)) {
        camper.swing = 0
        camper.hit = false
      } else if (!same) camper.stretch.value = 1.14
      return
    }
    camper.chop = null
    dragId = p.id
    if (dist(p.x, p.y, FIRE_X, FIRE_Y - 30) < 78) {
      // Poke the fire: sparks, and the camper comes to warm their hands.
      flame.value = 1.25
      fireFace('wow', 0.5)
      fx.burst(FIRE_X, FIRE_Y - 40, { count: 10, color: ['#ffe45c', '#ff9d1f'], speed: 320, life: 0.6, size: 7, gravity: -150, angle: -Math.PI / 2, spread: 1.8, shape: 'spark' })
      sfx.noise({ dur: 0.12, freq: 2200, to: 5000, vol: 0.12, filter: 'highpass' })
      sfx.note(-3, 0.15, 'triangle', 0.12)
      const side = camper.x < FIRE_X ? -1 : 1
      camper.tx = FIRE_X + side * 84
      camper.ty = FIRE_Y + 36
      dragId = -1
      return
    }
    if (dist(p.x, p.y, camper.x, camper.y) > 120) camper.stretch.value = 1.14
    camper.tx = p.x
    camper.ty = p.y + 20
    fx.ring(p.x, p.y, '#ffffff', 46, 0.3)
    fx.burst(p.x, p.y, { count: 5, color: '#e6ffd0', speed: 150, life: 0.35, size: 6, gravity: 0 })
    sfx.pop(Math.round(rnd(-5, -3)))
  }

  return {
    update,
    draw,
    down,
    move(p: Pointer) {
      if (p.id !== dragId || relight) return
      lastTouch = stage.time
      camper.tx = p.x
      camper.ty = p.y + 20
    },
    up(p: Pointer) {
      if (p.id === dragId) dragId = -1
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'campfire-nights',
    name: 'Campfire Nights',
    emoji: '🔥',
    ages: [7, 11],
    pitch: 'Chop wood by day, feed the fire, build defences, and bonk the glowing-eyed critters that creep in at night.',
    howTo: 'Tap a tree to chop it. Walk the wood to the fire or a glowing build spot. At night, tap the eyes to throw pine cones.',
    basedOn: '99 Nights in the Forest, Minecraft’s first night',
    whyFun: 'Gather, build, survive the night: the circle of light swells with every log, and each morning brings a new thing to build or find.',
  },
  create,
}
