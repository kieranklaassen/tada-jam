// Hop Across: a frog crossing toy roads, rivers and train tracks, one hop per
// tap. Borrowed from Crossy Road and Frogger, with the fail states turned into
// slapstick: a car leaves a pancake that peels itself off, the river has a fish
// that spits the frog back.

import { blinkAt, ellipse, hint, label, rrect, sprite } from '../../kit/draw.ts'
import { clamp, damp, ease, lerp, pick, rnd, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { CAR_LOOKS, GOLD_LOOK, TRAIN_CAR, TRAIN_CARS, drawBug, drawDizzyStars, drawFrog, drawLog, drawPad, drawSignal, drawTrain, drawVehicle } from './art.ts'
import type { FrogMood } from './art.ts'

const ROW = 96
const COL = 100
const COLS = 11
const X0 = (W - (COLS - 1) * COL) / 2
// Screen y of the middle of the lane the camera is centred on.
const FOCUS_Y = 640
// Feet sit a little below the middle of a lane.
const FEET = 24
const HOP_TIME = 0.15
const FROG_SCALE = 1.2
// Lane the frog starts on (raise it to try later lanes).
const START_ROW = 1
const WRAP = W + 600
const TRAIN_LEN = TRAIN_CAR * TRAIN_CARS
const TRAIN_SPEED = 2300

type Dir = 'up' | 'down' | 'left' | 'right'
type LaneKind = 'grass' | 'road' | 'river' | 'rail'
type MoverKind = 'car' | 'truck' | 'log' | 'pad' | 'whale'

interface Mover {
  kind: MoverKind
  x: number
  len: number
  look: number
  gold: boolean
  driver: string
  dip: Spring
  shock: number
  honkedAt: number
  seed: number
}

interface Train {
  state: 'wait' | 'warn' | 'go'
  t: number
  // Nose position while going.
  x: number
  dir: number
  bell: number
}

interface Ufo {
  x: number
  cowX: number
  used: boolean
  // Seconds since it left, once used.
  leaving: number
}

interface Lane {
  row: number
  kind: LaneKind
  dir: number
  speed: number
  movers: Mover[]
  // Per column: an emoji standing in that cell (tree, rock, cheering critter).
  blocks: (string | null)[]
  shakeCol: number
  shakeAt: number
  flag: boolean
  ufo: Ufo | null
  train: Train | null
  seed: number
}

interface Bug {
  row: number
  x: number
  seed: number
}

interface Hop {
  t: number
  fromX: number
  fromRow: number
  toX: number
  toRow: number
  plat: Mover | null
  off: number
  dir: Dir
}

interface Toss {
  t: number
  dur: number
  fromX: number
  fromRow: number
  toX: number
  toRow: number
  height: number
  spins: number
  cheer: string | null
}

interface Press {
  x: number
  y: number
  at: number
  fired: boolean
}

const DRIVERS = ['🐻', '🐱', '🐶', '🐼', '🐷', '🐵', '🦊', '🐰', '🐸', '🐯']
const TREES = ['🌳', '🌳', '🌲', '🌳', '🌲', '🪨', '🍄']
const CRITTERS = ['🐰', '🐻', '🐥', '🦊', '🐼', '🐱']

// The longest run of lanes without a bonk, kept across restarts.
let bestStreak = 0

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const rand = () => stage.rand()
  const colX = (c: number) => X0 + c * COL
  const colOf = (x: number) => clamp(Math.round((x - X0) / COL), 0, COLS - 1)

  // ---------------------------------------------------------------- world

  const lanes: Lane[] = []
  const bugs: Bug[] = []
  const plan: LaneKind[] = []
  let lastRiverDir = 1

  const blank = (row: number, kind: LaneKind): Lane => ({
    row,
    kind,
    dir: 1,
    speed: 0,
    movers: [],
    blocks: new Array<string | null>(COLS).fill(null),
    shakeCol: -1,
    shakeAt: -9,
    flag: false,
    ufo: null,
    train: null,
    seed: rand(),
  })

  const mover = (kind: MoverKind, x: number, len: number): Mover => ({
    kind,
    x,
    len,
    look: Math.floor(rand() * CAR_LOOKS.length),
    gold: false,
    driver: pick(DRIVERS, rand()),
    dip: spring(0, 260, 9),
    shock: 0,
    honkedAt: -9,
    seed: rand(),
  })

  const addBug = (lane: Lane, chance: number) => {
    if (rand() > chance) return
    const free: number[] = []
    for (let c = 1; c < COLS - 1; c++) if (!lane.blocks[c]) free.push(c)
    if (free.length === 0) return
    bugs.push({ row: lane.row, x: colX(pick(free, rand())), seed: rand() })
  }

  const grass = (row: number, opts: { flag?: boolean; ufo?: boolean; clear?: boolean } = {}): Lane => {
    const lane = blank(row, 'grass')
    if (opts.flag) {
      lane.flag = true
      lane.blocks[0] = pick(CRITTERS, rand())
      lane.blocks[COLS - 1] = pick(CRITTERS, rand())
      return lane
    }
    if (opts.ufo) {
      const cow = rand() < 0.5 ? 2 : COLS - 3
      lane.ufo = { x: colX(cow), cowX: colX(cow), used: false, leaving: 0 }
      return lane
    }
    let placed = 0
    for (let c = 0; c < COLS; c++) {
      const edge = c === 0 || c === COLS - 1
      if (opts.clear && c >= 3 && c <= 7) continue
      if (placed >= 4 || rand() > (edge ? 0.5 : 0.13)) continue
      lane.blocks[c] = pick(TREES, rand())
      placed++
    }
    addBug(lane, 0.45)
    return lane
  }

  const road = (row: number, dir: number, speed: number, count: number, gold = false): Lane => {
    const lane = blank(row, 'road')
    lane.dir = dir
    lane.speed = speed
    const goldAt = gold ? Math.floor(rand() * count) : -1
    for (let i = 0; i < count; i++) {
      const truck = i !== goldAt && rand() < 0.28
      const m = mover(truck ? 'truck' : 'car', -300 + ((i + 0.5 + (rand() - 0.5) * 0.35) * WRAP) / count, truck ? 210 : 128)
      m.gold = i === goldAt
      lane.movers.push(m)
    }
    addBug(lane, 0.35)
    return lane
  }

  const river = (row: number, dir: number, speed: number, mode: 'pads' | 'logs', whale = false): Lane => {
    const lane = blank(row, 'river')
    lane.dir = dir
    lane.speed = mode === 'pads' ? 0 : speed
    lastRiverDir = dir
    if (mode === 'pads') {
      // Still pads on the grid, never two gaps side by side.
      let gap = true
      for (let c = 0; c < COLS; c++) {
        if (!gap && rand() < 0.3) {
          gap = true
          continue
        }
        gap = false
        lane.movers.push(mover('pad', colX(c), 92))
      }
      addBug(lane, 0.5)
    } else {
      const count = 4
      const whaleAt = whale ? Math.floor(rand() * count) : -1
      for (let i = 0; i < count; i++) {
        const x = -300 + ((i + 0.5) * WRAP) / count
        lane.movers.push(i === whaleAt ? mover('whale', x, 230) : mover('log', x, 250 + Math.floor(rand() * 3) * 40))
      }
    }
    return lane
  }

  const rail = (row: number): Lane => {
    const lane = blank(row, 'rail')
    lane.train = { state: 'wait', t: 1.2 + rand() * 1.5, x: 0, dir: rand() < 0.5 ? 1 : -1, bell: 0 }
    addBug(lane, 0.3)
    return lane
  }

  // The first thirty lanes are laid out by hand so that the first minute meets
  // every kind of lane and the rare sights; after that it is bands at random.
  const scripted = (row: number): Lane | null => {
    switch (row) {
      case 0:
      case 1:
      case 2:
        return grass(row, { clear: true })
      case 3:
        return road(row, 1, 85, 3)
      case 5:
        return road(row, -1, 100, 3)
      case 6:
        return road(row, 1, 125, 3, true)
      case 8:
        return road(row, 1, 115, 3)
      case 9:
        return road(row, -1, 145, 4)
      case 11:
        return river(row, 1, 0, 'pads')
      case 12:
        return river(row, -1, 60, 'logs')
      case 14:
        return road(row, -1, 135, 3)
      case 15:
        return road(row, 1, 175, 4)
      case 17:
        return rail(row)
      case 19:
        return road(row, 1, 155, 4, true)
      case 21:
        return river(row, 1, 70, 'logs')
      case 22:
        return river(row, -1, 55, 'logs', true)
      case 23:
        return river(row, 1, 0, 'pads')
      case 25:
        return road(row, -1, 145, 4)
      case 26:
        return road(row, 1, 185, 4)
      case 27:
        return rail(row)
      case 28:
        return grass(row, { ufo: true })
      default:
        return null
    }
  }

  const generate = (row: number): Lane => {
    if (row % 10 === 0 && row > 0) return grass(row, { flag: true })
    if (row <= 30) return scripted(row) ?? grass(row)
    if (row % 30 === 28) return grass(row, { ufo: true })
    if (plan.length === 0) {
      const hard = clamp((row - 20) / 110, 0, 1)
      const roll = rand()
      const kind: LaneKind = roll < 0.48 ? 'road' : roll < 0.82 ? 'river' : 'rail'
      const size = kind === 'rail' ? 1 + (rand() < hard ? 1 : 0) : 1 + Math.floor(rand() * (2.2 + hard * 2))
      for (let i = 0; i < size; i++) plan.push(kind)
      plan.push('grass')
      if (rand() < 0.3 - hard * 0.2) plan.push('grass')
    }
    const kind = plan.shift()!
    const hard = clamp((row - 20) / 110, 0, 1)
    if (kind === 'road') return road(row, rand() < 0.5 ? 1 : -1, 100 + rand() * 90 + hard * 150, 3 + (rand() < 0.4 + hard ? 1 : 0), rand() < 0.1)
    if (kind === 'river') {
      const pads = rand() < 0.3
      return river(row, -lastRiverDir, 55 + rand() * 45 + hard * 60, pads ? 'pads' : 'logs', !pads && rand() < 0.14)
    }
    if (kind === 'rail') return rail(row)
    return grass(row)
  }

  // Behind the start: a wall of forest.
  const forest = blank(-1, 'grass')
  for (let c = 0; c < COLS; c++) forest.blocks[c] = c % 3 === 1 ? '🌲' : '🌳'

  const laneAt = (row: number): Lane => {
    if (row < 0) return forest
    while (lanes.length <= row) lanes.push(generate(lanes.length))
    return lanes[row]!
  }

  // ----------------------------------------------------------------- frog

  const frog = {
    x: colX(5),
    row: START_ROW,
    // Where it is drawn: a fractional lane and a height above it.
    rowF: START_ROW,
    z: 0,
    rot: 0,
    state: 'idle' as 'idle' | 'hop' | 'flat' | 'sunk' | 'toss' | 'ufo',
    t: 0,
    plat: null as Mover | null,
    off: 0,
    nudgeX: 0,
    nudgeY: 0,
    lookX: 0,
    lookY: -0.4,
    scaredUntil: 0,
    yumUntil: 0,
    safeUntil: 0,
  }
  const stretch = spring(1, 260, 11)
  let hop: Hop | null = null
  let toss: Toss | null = null
  let queued: Dir | null = null
  let safeRow = START_ROW
  let safeX = frog.x
  let maxRow = START_ROW
  let streak = 0
  let streakPop = 0
  let eaten = 0
  let eatenPop = 0
  let distPop = 0
  let bugStep = 0
  let lastBugAt = -9
  let hopStep = 0
  let lastHopAt = -9
  let lastTouchAt = 0
  let cam = START_ROW + 0.6
  let sunset = 0
  let night = 0
  let tongue: { x: number; y: number; t: number } | null = null
  let fish: { x: number; row: number; t: number } | null = null
  let ride: { t: number; ufo: Ufo; fromX: number; fromRow: number; toX: number; toRow: number; dropped: boolean } | null = null
  let cheerUntil = 0
  let nextCroakAt = 4
  let croakUntil = 0
  const presses = new Map<number, Press>()

  const rowY = (row: number) => FOCUS_Y - (row - cam) * ROW
  const feetY = (row: number) => rowY(row) + FEET
  const frogY = () => feetY(frog.rowF) - frog.z

  // --------------------------------------------------------------- sounds

  const hopSound = () => {
    hopStep = stage.time - lastHopAt < 0.5 ? Math.min(hopStep + 1, 9) : 0
    lastHopAt = stage.time
    const f = sfx.scale(hopStep - 5)
    sfx.tone({ freq: f, to: f * 1.7, dur: 0.09, type: 'sine', vol: 0.2 })
  }

  const landSound = (lane: Lane, plat: Mover | null) => {
    if (lane.kind === 'grass') sfx.noise({ dur: 0.06, freq: 700, vol: 0.14, filter: 'lowpass' })
    else if (lane.kind === 'road') {
      sfx.tone({ freq: 210 * rnd(0.95, 1.05), to: 130, dur: 0.05, type: 'square', vol: 0.07 })
      sfx.noise({ dur: 0.03, freq: 2400, vol: 0.06, filter: 'highpass' })
    } else if (lane.kind === 'rail') {
      sfx.tone({ freq: 1250 * rnd(0.97, 1.03), dur: 0.14, type: 'sine', vol: 0.1 })
      sfx.tone({ freq: 1880, dur: 0.08, type: 'sine', vol: 0.05 })
    } else if (plat && plat.kind === 'log') {
      sfx.tone({ freq: 190 * rnd(0.92, 1.08), to: 110, dur: 0.09, type: 'triangle', vol: 0.3 })
      sfx.noise({ dur: 0.04, freq: 500, vol: 0.1, filter: 'lowpass' })
    } else if (plat) {
      const f = 480 * rnd(0.9, 1.15)
      sfx.tone({ freq: f, to: f * 1.8, dur: 0.08, type: 'sine', vol: 0.22 })
    }
  }

  const honk = (m: Mover, lane: Lane) => {
    m.honkedAt = stage.time
    m.shock = 1
    const f = m.kind === 'truck' ? 220 : 392 + m.seed * 80
    sfx.tone({ freq: f, dur: 0.13, type: 'square', vol: 0.09 })
    sfx.tone({ freq: f * 1.26, dur: 0.13, type: 'square', vol: 0.07 })
    sfx.tone({ freq: f, dur: 0.2, type: 'square', vol: 0.09, delay: 0.17 })
    sfx.tone({ freq: f * 1.26, dur: 0.2, type: 'square', vol: 0.07, delay: 0.17 })
    fx.text(m.x + lane.dir * 40, feetY(lane.row) - 110, pick(['BEEP!', 'HONK!', 'BEEP BEEP!']), { size: 30, color: '#ffffff', life: 0.6, rise: 30 })
  }

  // -------------------------------------------------------------- scoring

  const celebrate = (row: number) => {
    cheerUntil = stage.time + 1.6
    sfx.fanfare()
    fx.confetti(W * 0.25, 120, 50)
    fx.confetti(W * 0.75, 120, 50)
    fx.flash('#ffffff', 0.25, 0.25)
    fx.text(W / 2, 330, `${row}!`, { size: 130, color: '#ffe14d', life: 1.3, rise: 90 })
    frog.rot = -TAU
  }

  const arrive = (row: number) => {
    while (maxRow < row) {
      maxRow++
      streak++
      streakPop = 1
      distPop = 1
      if (streak > bestStreak) bestStreak = streak
      if (maxRow % 10 === 0) celebrate(maxRow)
      else if (streak > 0 && streak % 25 === 0) {
        sfx.win()
        fx.text(frog.x, frogY() - 120, `${streak} IN A ROW!`, { size: 44, color: '#ffb02e' })
      }
    }
  }

  const eatBugs = () => {
    for (let i = bugs.length - 1; i >= 0; i--) {
      const bug = bugs[i]!
      if (Math.abs(bug.row - frog.row) > 1 || Math.abs(bug.x - frog.x) > 160) continue
      bugs.splice(i, 1)
      const by = rowY(bug.row) - 34
      tongue = { x: bug.x, y: by, t: 0 }
      bugStep = stage.time - lastBugAt < 4 ? bugStep + 1 : 0
      lastBugAt = stage.time
      eaten++
      eatenPop = 1
      frog.yumUntil = stage.time + 0.5
      sfx.chomp()
      sfx.coin(Math.min(bugStep, 10))
      fx.burst(bug.x, by, { count: 10, color: ['#ffe44d', '#fff8c0', '#ffffff'], speed: 260, life: 0.5, shape: 'star', size: 10 })
      fx.text(bug.x, by - 40, bugStep > 0 ? `YUM x${bugStep + 1}` : 'YUM!', { size: 34 + Math.min(bugStep, 5) * 4, color: '#fff3b0' })
    }
  }

  // ------------------------------------------------------------- mishaps

  const loseStreak = () => {
    streak = 0
    hopStep = 0
  }

  const backToSafety = (fromX: number, fromRow: number, height: number, dur: number) => {
    frog.state = 'toss'
    toss = { t: 0, dur, fromX, fromRow, toX: safeX, toRow: safeRow, height, spins: 1, cheer: null }
    frog.plat = null
  }

  const flatten = (row: number, big: boolean) => {
    frog.state = 'flat'
    frog.t = 0
    frog.row = row
    frog.rowF = row
    frog.z = 0
    frog.rot = 0
    frog.plat = null
    hop = null
    queued = null
    loseStreak()
    fx.hitstop(big ? 90 : 60)
    fx.shake(big ? 18 : 10, 0.3)
    sfx.splat()
    sfx.thud(big ? 1.6 : 1)
    fx.burst(frog.x, feetY(row) - 20, { count: 14, color: ['#ffe14d', '#ffffff'], shape: 'star', speed: 420, life: 0.6, size: 12 })
    fx.text(frog.x, feetY(row) - 90, big ? 'CHOO-SPLAT!' : pick(['SPLAT!', 'BONK!', 'PANCAKE!']), { size: 46, color: '#ff7ac8' })
  }

  const jackpot = (m: Mover, row: number) => {
    m.gold = false
    m.shock = 1
    eaten += 10
    eatenPop = 1
    hop = null
    queued = null
    frog.row = row
    frog.rowF = row
    frog.plat = null
    frog.state = 'toss'
    toss = { t: 0, dur: 0.75, fromX: frog.x, fromRow: row, toX: frog.x, toRow: row, height: 210, spins: 2, cheer: null }
    for (let i = 0; i < 7; i++) stage.after(i * 0.07, () => sfx.coin(i))
    fx.hitstop(70)
    fx.flash('#ffe14d', 0.35, 0.3)
    fx.confetti(frog.x, feetY(row) - 60, 40)
    fx.burst(frog.x, feetY(row) - 40, { count: 30, color: ['#ffd83d', '#fff8c0', '#ffb02e'], shape: 'star', speed: 620, life: 0.9, size: 16, gravity: 700 })
    fx.text(frog.x, feetY(row) - 130, 'JACKPOT! +10', { size: 56, color: '#ffd83d', life: 1.2 })
  }

  const sink = (x: number, row: number) => {
    frog.state = 'sunk'
    frog.t = 0
    frog.x = clamp(x, 40, W - 40)
    frog.row = row
    frog.rowF = row
    frog.z = 0
    frog.plat = null
    hop = null
    queued = null
    loseStreak()
    fish = { x: frog.x, row, t: 0 }
    const y = rowY(row)
    sfx.noise({ dur: 0.3, freq: 2200, to: 300, vol: 0.3, filter: 'lowpass' })
    sfx.tone({ freq: 300, to: 90, dur: 0.2, type: 'sine', vol: 0.25 })
    fx.burst(frog.x, y, { count: 22, color: ['#ffffff', '#bfeaff', '#7fd0ff'], speed: 520, life: 0.6, size: 11, angle: -Math.PI / 2, spread: 1.5, gravity: 1400 })
    fx.ring(frog.x, y, '#ffffff', 80, 0.45)
    fx.ring(frog.x, y, '#bfeaff', 130, 0.6)
    fx.text(frog.x, y - 70, 'SPLOOSH!', { size: 44, color: '#d8f4ff' })
    fx.shake(5, 0.2)
  }

  // ---------------------------------------------------------------- moves

  const nearestFree = (lane: Lane, x: number): number => {
    const want = colOf(x)
    for (let d = 0; d < COLS; d++) {
      for (const c of [want - d, want + d]) if (c >= 1 && c < COLS - 1 && !lane.blocks[c]) return colX(c)
    }
    return colX(want)
  }

  const nextGrass = (from: number): number => {
    let row = from
    while (laneAt(row).kind !== 'grass' || laneAt(row).ufo) row++
    return row
  }

  const bump = (dir: Dir, lane: Lane | null, col: number) => {
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0
    frog.nudgeX = dx * 22
    frog.nudgeY = dy * 22
    stretch.value = 0.82
    sfx.thud(0.45)
    sfx.tone({ freq: 330, to: 250, dur: 0.08, type: 'triangle', vol: 0.12 })
    if (lane && lane.blocks[col]) {
      lane.shakeCol = col
      lane.shakeAt = stage.time
      const critter = CRITTERS.includes(lane.blocks[col]!)
      if (critter) sfx.boing(4)
      fx.burst(colX(col), rowY(lane.row) - 40, { count: 8, color: critter ? ['#ffffff', '#ffe14d'] : ['#5fbf4a', '#8fdc5a', '#3f9a3a'], speed: 240, life: 0.6, size: 10, gravity: 600, shape: critter ? 'star' : 'circle' })
    } else {
      fx.burst(frog.x + dx * 40, frogY() - 30 + dy * 30, { count: 5, color: '#ffffff', speed: 140, life: 0.3, size: 7 })
    }
  }

  const startHop = (dir: Dir) => {
    const fromRow = frog.row
    const toRow = fromRow + (dir === 'up' ? 1 : dir === 'down' ? -1 : 0)
    const side = dir === 'left' ? -COL : dir === 'right' ? COL : 0
    const wantX = frog.x + side
    frog.lookX = dir === 'left' ? -1 : dir === 'right' ? 1 : 0
    frog.lookY = dir === 'up' ? -0.8 : dir === 'down' ? 0.6 : 0
    const lane = laneAt(toRow)
    if (toRow < Math.max(0, maxRow - 4) || wantX < X0 - 45 || wantX > W - X0 + 45) {
      bump(dir, toRow < 0 ? lane : null, colOf(wantX))
      return
    }
    let toX = wantX
    let plat: Mover | null = null
    let off = 0
    if (lane.kind === 'river') {
      // Forgiving: anything within reach counts, and the frog lands well onto it.
      let best = 1e9
      for (const m of lane.movers) {
        const px = m.x + lane.dir * lane.speed * HOP_TIME
        const d = Math.abs(wantX - px) - m.len / 2
        if (d < (m.kind === 'whale' ? 75 : 46) && d < best) {
          best = d
          plat = m
          const room = Math.max(0, m.len / 2 - 40)
          off = clamp(wantX - px, -room, room)
        }
      }
      if (plat) toX = plat.x + off
    } else {
      const col = colOf(wantX)
      if (lane.blocks[col]) {
        bump(dir, lane, col)
        return
      }
      toX = colX(col)
    }
    hop = { t: 0, fromX: frog.x, fromRow, toX, toRow, plat, off, dir }
    frog.state = 'hop'
    frog.plat = null
    stretch.value = 1.18
    hopSound()
  }

  const launchAhead = (fromRow: number, cheer: string) => {
    const toRow = nextGrass(fromRow + 1)
    const toX = nearestFree(laneAt(toRow), frog.x)
    frog.state = 'toss'
    frog.plat = null
    toss = { t: 0, dur: 0.95, fromX: frog.x, fromRow, toX, toRow, height: 300, spins: 2, cheer }
  }

  const whaleSpout = (m: Mover, row: number) => {
    m.dip.value = 16
    m.shock = 1
    sfx.whoosh()
    sfx.slideUp()
    sfx.tone({ freq: 140, to: 320, dur: 0.5, type: 'triangle', vol: 0.18 })
    fx.burst(frog.x, rowY(row) - 50, { count: 40, color: ['#ffffff', '#bfeaff', '#7fd0ff'], speed: 820, life: 0.9, size: 13, angle: -Math.PI / 2, spread: 0.7, gravity: 1300 })
    fx.text(frog.x, rowY(row) - 140, 'WHEEEE!', { size: 60, color: '#bfeaff', life: 1.1 })
    launchAhead(row, 'SPLASHDOWN!')
  }

  const land = (h: Hop) => {
    frog.row = h.toRow
    frog.rowF = h.toRow
    frog.z = 0
    frog.x = h.plat ? h.plat.x + h.off : h.toX
    frog.state = 'idle'
    const lane = laneAt(h.toRow)
    if (lane.kind === 'river' && !h.plat) {
      sink(frog.x, h.toRow)
      return
    }
    stretch.value = 0.66
    stretch.kick(2)
    frog.plat = h.plat
    frog.off = h.off
    landSound(lane, h.plat)
    const y = feetY(h.toRow)
    if (h.plat) {
      h.plat.dip.value = 9
      fx.ring(frog.x, y - 6, 'rgba(255,255,255,0.8)', 70, 0.4)
    } else if (lane.kind === 'grass') {
      safeRow = h.toRow
      safeX = frog.x
      fx.burst(frog.x, y, { count: 5, color: ['#b8f07a', '#ffffff'], speed: 150, life: 0.3, size: 7, angle: -Math.PI / 2, spread: 2.6 })
    } else {
      fx.burst(frog.x, y, { count: 4, color: '#d9dbe6', speed: 130, life: 0.28, size: 7, angle: -Math.PI / 2, spread: 2.6 })
    }
    arrive(h.toRow)
    eatBugs()
    if (h.plat && h.plat.kind === 'whale') {
      whaleSpout(h.plat, h.toRow)
      return
    }
    if (queued) {
      const next = queued
      queued = null
      startHop(next)
    }
  }

  const act = (dir: Dir) => {
    if (frog.state === 'idle') startHop(dir)
    else if (frog.state === 'hop') queued = dir
    else stretch.kick(1.5)
  }

  // Where a plain tap sends the frog: forward, unless it is beside or behind it.
  const tapDir = (x: number, y: number): Dir => {
    const fy = frogY() - 30
    if (y < fy - 105) return 'up'
    if (Math.abs(x - frog.x) > 72) return x < frog.x ? 'left' : 'right'
    return y > fy + 55 ? 'down' : 'up'
  }

  const swipeDir = (dx: number, dy: number): Dir => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down')

  // -------------------------------------------------------------- updates

  const updateLane = (lane: Lane, dt: number) => {
    const frogHere = (frog.state === 'idle' && frog.row === lane.row) || (frog.state === 'hop' && hop !== null && hop.toRow === lane.row)
    for (const m of lane.movers) {
      m.x += lane.dir * lane.speed * dt
      if (m.x > W + 300) m.x -= WRAP
      else if (m.x < -300) m.x += WRAP
      m.dip.update(dt)
      if (m.shock > 0) m.shock = Math.max(0, m.shock - dt * 1.6)
      if (lane.kind !== 'road') continue
      if (m.gold && m.x > 0 && m.x < W && Math.random() < dt * 9) {
        fx.burst(m.x + rnd(-60, 60), feetY(lane.row) - rnd(20, 80), { count: 1, color: '#fff3a0', shape: 'star', speed: 40, life: 0.5, size: 11, gravity: -60 })
      }
      if (frogHere) {
        const ahead = (frog.x - m.x) * lane.dir
        if (ahead > 0 && ahead < 330) {
          frog.scaredUntil = stage.time + 0.25
          if (stage.time - m.honkedAt > 1.6 && !m.gold) honk(m, lane)
        }
      }
    }
    const train = lane.train
    const audible = lane.row < cam + 7.4
    if (train) {
      train.t -= dt
      if (train.state === 'wait' && train.t <= 0) {
        train.state = 'warn'
        train.t = 1.15
        train.bell = 0
      } else if (train.state === 'warn') {
        train.bell -= dt
        if (train.bell <= 0) {
          train.bell = 0.19
          if (audible) sfx.tone({ freq: Math.round(train.t / 0.19) % 2 ? 990 : 830, dur: 0.16, type: 'sine', vol: 0.13 })
        }
        if (frogHere) frog.scaredUntil = stage.time + 0.25
        if (train.t <= 0) {
          train.state = 'go'
          train.x = train.dir > 0 ? -40 : W + 40
          if (audible) {
            sfx.noise({ dur: 1.1, freq: 260, to: 120, vol: 0.32, filter: 'lowpass' })
            sfx.tone({ freq: 311, dur: 0.5, type: 'sawtooth', vol: 0.09 })
            sfx.tone({ freq: 392, dur: 0.5, type: 'sawtooth', vol: 0.09 })
            fx.shake(5, 0.9)
          }
        }
      } else if (train.state === 'go') {
        train.x += train.dir * TRAIN_SPEED * dt
        const tail = train.x - train.dir * TRAIN_LEN
        if ((train.dir > 0 && tail > W + 60) || (train.dir < 0 && tail < -60)) {
          train.state = 'wait'
          train.t = 3.2 + Math.random() * 3.5
        }
      }
    }
    const ufo = lane.ufo
    if (ufo) {
      if (ufo.used) {
        ufo.leaving += dt
      } else if (!ride) {
        const near = frog.row >= lane.row - 2 && frog.row <= lane.row
        const want = near ? frog.x : ufo.cowX + Math.sin(stage.time * 0.9) * 120
        ufo.x = damp(ufo.x, want, near ? 2.2 : 1.5, dt)
        if (frog.state === 'idle' && frog.row === lane.row && Math.abs(frog.x - ufo.x) < 85) abduct(ufo, lane)
      }
    }
  }

  const abduct = (ufo: Ufo, lane: Lane) => {
    const toRow = nextGrass(lane.row + 8)
    ride = { t: 0, ufo, fromX: frog.x, fromRow: lane.row, toX: nearestFree(laneAt(toRow), frog.x), toRow, dropped: false }
    frog.state = 'ufo'
    frog.plat = null
    queued = null
    sfx.zap()
    sfx.tone({ freq: 220, to: 880, dur: 0.6, type: 'sine', vol: 0.2 })
    sfx.tone({ freq: 330, to: 1320, dur: 0.6, type: 'triangle', vol: 0.1 })
    sfx.tone({ freq: 110, to: 90, dur: 0.5, type: 'sawtooth', vol: 0.1, delay: 0.1 })
    fx.text(ufo.cowX, rowY(lane.row) - 120, 'MOO?', { size: 40, color: '#ffffff' })
    fx.flash('#b6ffb0', 0.25, 0.3)
  }

  const updateRide = (dt: number) => {
    if (!ride) return
    ride.t += dt
    const t = ride.t
    if (t < 0.6) {
      frog.z = ease.inQuad(t / 0.6) * 120
      frog.rot = t * 9
    } else if (t < 1.7) {
      const k = ease.inOutCubic((t - 0.6) / 1.1)
      frog.rowF = lerp(ride.fromRow, ride.toRow, k)
      frog.x = lerp(ride.fromX, ride.toX, k)
      ride.ufo.x = frog.x
      frog.z = 120
      frog.rot = t * 9
      if (Math.random() < dt * 30) fx.burst(frog.x + rnd(-30, 30), frogY(), { count: 1, color: ['#b6ffb0', '#ffffff', '#ffe14d'], shape: 'star', speed: 80, life: 0.5, size: 10 })
    } else if (t < 2.0) {
      if (!ride.dropped) {
        ride.dropped = true
        ride.ufo.used = true
        sfx.slideDown()
      }
      frog.rowF = ride.toRow
      frog.x = ride.toX
      frog.rot = 0
      frog.z = 120 * (1 - ease.inQuad((t - 1.7) / 0.3))
    } else {
      frog.z = 0
      frog.rot = 0
      frog.row = ride.toRow
      frog.rowF = ride.toRow
      frog.state = 'idle'
      safeRow = frog.row
      safeX = frog.x
      frog.safeUntil = stage.time + 0.4
      stretch.value = 0.5
      sfx.thud(1.2)
      sfx.boing(3)
      fx.shake(8, 0.25)
      fx.burst(frog.x, feetY(frog.row), { count: 16, color: ['#b6ffb0', '#ffffff'], speed: 380, life: 0.5, size: 10, angle: -Math.PI / 2, spread: 2.8 })
      fx.text(frog.x, frogY() - 120, 'BEAMED UP!', { size: 52, color: '#b6ffb0', life: 1.1 })
      ride = null
      arrive(frog.row)
      eatBugs()
    }
  }

  const updateFrog = (dt: number) => {
    frog.nudgeX = damp(frog.nudgeX, 0, 16, dt)
    frog.nudgeY = damp(frog.nudgeY, 0, 16, dt)
    if (frog.state === 'idle' && frog.rot !== 0) {
      // The celebration flip unwinds.
      frog.rot = Math.min(0, frog.rot + dt * TAU * 2.2)
    }
    if (frog.state === 'hop' && hop) {
      hop.t = Math.min(1, hop.t + dt / HOP_TIME)
      const toX = hop.plat ? hop.plat.x + hop.off : hop.toX
      const k = ease.outQuad(hop.t)
      frog.x = lerp(hop.fromX, toX, k)
      frog.rowF = lerp(hop.fromRow, hop.toRow, k)
      frog.z = Math.sin(hop.t * Math.PI) * 38
      if (hop.t >= 1) {
        const done = hop
        hop = null
        land(done)
      }
    } else if (frog.state === 'idle' && frog.plat) {
      frog.x = frog.plat.x + frog.off
      if (frog.x < 28 || frog.x > W - 28) sink(frog.x, frog.row)
    } else if (frog.state === 'flat') {
      frog.t += dt
      if (frog.t > 0.42) {
        sfx.boing(2)
        sfx.pop(3)
        fx.burst(frog.x, feetY(frog.row), { count: 8, color: '#ffffff', speed: 260, life: 0.35, size: 9 })
        backToSafety(frog.x, frog.row, 170, 0.45)
      }
    } else if (frog.state === 'sunk') {
      frog.t += dt
      if (frog.t > 0.42) {
        sfx.pop(5)
        sfx.slideUp()
        fx.burst(frog.x, rowY(frog.row) - 40, { count: 10, color: ['#ffffff', '#bfeaff'], speed: 300, life: 0.4, size: 9, angle: -Math.PI / 2, spread: 1.2 })
        fx.text(frog.x, rowY(frog.row) - 110, 'PTOOEY!', { size: 40, color: '#ffffff' })
        backToSafety(frog.x, frog.row, 190, 0.45)
      }
    } else if (frog.state === 'toss' && toss) {
      toss.t = Math.min(1, toss.t + dt / toss.dur)
      frog.x = lerp(toss.fromX, toss.toX, toss.t)
      frog.rowF = lerp(toss.fromRow, toss.toRow, toss.t)
      frog.z = Math.sin(toss.t * Math.PI) * toss.height
      frog.rot = toss.t * TAU * toss.spins
      if (toss.cheer && Math.random() < dt * 40) fx.burst(frog.x, frogY() - 20, { count: 1, color: ['#ffffff', '#bfeaff'], speed: 60, life: 0.5, size: 10 })
      if (toss.t >= 1) {
        const done = toss
        toss = null
        frog.row = done.toRow
        frog.rowF = done.toRow
        frog.z = 0
        frog.rot = 0
        frog.state = 'idle'
        frog.safeUntil = stage.time + (laneAt(frog.row).kind === 'grass' ? 0.3 : 0.9)
        stretch.value = 0.55
        sfx.thud(0.8)
        fx.burst(frog.x, feetY(frog.row), { count: 10, color: '#ffffff', speed: 260, life: 0.4, size: 9, angle: -Math.PI / 2, spread: 2.8 })
        if (laneAt(frog.row).kind === 'grass') {
          safeRow = frog.row
          safeX = frog.x
        }
        if (done.cheer) {
          fx.shake(8, 0.25)
          sfx.boing(4)
          fx.confetti(frog.x, frogY() - 60, 30)
          fx.text(frog.x, frogY() - 130, done.cheer, { size: 50, color: '#ffe14d', life: 1.1 })
        }
        arrive(frog.row)
        eatBugs()
      }
    }
  }

  const checkHits = () => {
    if (stage.time < frog.safeUntil) return
    let row = -99
    if (frog.state === 'idle') row = frog.row
    else if (frog.state === 'hop' && hop) row = hop.t > 0.55 ? hop.toRow : hop.t < 0.3 ? hop.fromRow : -99
    if (row < 0) return
    const lane = laneAt(row)
    if (lane.kind === 'road') {
      for (const m of lane.movers) {
        if (Math.abs(m.x - frog.x) > m.len / 2 + 16) continue
        if (m.gold) {
          jackpot(m, row)
        } else {
          m.shock = 1
          m.dip.value = 10
          if (stage.time - m.honkedAt > 0.5) honk(m, lane)
          flatten(row, false)
        }
        return
      }
    } else if (lane.train && lane.train.state === 'go') {
      const nose = lane.train.x
      const tail = nose - lane.train.dir * TRAIN_LEN
      if (frog.x > Math.min(nose, tail) - 20 && frog.x < Math.max(nose, tail) + 20) flatten(row, true)
    }
  }

  // --------------------------------------------------------------- drawing

  const drawGround = (g: CanvasRenderingContext2D, row: number) => {
    const lane = laneAt(row)
    const y = rowY(row)
    const top = Math.floor(y - ROW / 2)
    const far = laneAt(row + 1).kind
    const near = laneAt(row - 1).kind
    const t = stage.time
    if (lane.kind === 'grass') {
      g.fillStyle = row % 2 === 0 ? '#8fdc5a' : '#9be464'
      g.fillRect(0, top, W, ROW + 1)
      g.fillStyle = row % 2 === 0 ? '#9be464' : '#a6ea70'
      for (let c = (row & 1) === 0 ? 0 : 1; c < COLS; c += 2) g.fillRect(colX(c) - COL / 2, top, COL, ROW + 1)
      if (lane.flag) {
        const s = 24
        for (let i = 0; i < W / s; i++) {
          g.fillStyle = i % 2 === 0 ? '#ffffff' : '#2b2b35'
          g.fillRect(i * s, top + 12, s, s)
          g.fillStyle = i % 2 === 0 ? '#2b2b35' : '#ffffff'
          g.fillRect(i * s, top + 12 + s, s, s)
        }
      } else if (row >= 0) {
        // Tufts and flowers, fixed per lane.
        for (let i = 0; i < 4; i++) {
          const h = (lane.seed * 9973 * (i + 1)) % 1
          const tx = 30 + h * (W - 60)
          const ty = top + 18 + ((h * 7) % 1) * (ROW - 36)
          if (i === 0 && lane.seed > 0.45) sprite(g, lane.seed > 0.75 ? '🌼' : '🌷', tx, ty, 26)
          else {
            g.strokeStyle = '#6fc246'
            g.lineWidth = 4
            g.lineCap = 'round'
            g.beginPath()
            g.moveTo(tx - 7, ty + 6)
            g.lineTo(tx - 10, ty - 6)
            g.moveTo(tx, ty + 6)
            g.lineTo(tx, ty - 9)
            g.moveTo(tx + 7, ty + 6)
            g.lineTo(tx + 10, ty - 6)
            g.stroke()
          }
        }
      }
    } else if (lane.kind === 'road') {
      g.fillStyle = '#565a70'
      g.fillRect(0, top, W, ROW + 1)
      g.fillStyle = '#4a4e62'
      g.fillRect(0, top + ROW - 30, W, 31)
      if (far !== 'road') {
        g.fillStyle = '#e9e4d6'
        g.fillRect(0, top, W, 9)
        g.fillStyle = 'rgba(0,0,0,0.18)'
        g.fillRect(0, top + 9, W, 6)
      }
      if (near !== 'road') {
        g.fillStyle = '#e9e4d6'
        g.fillRect(0, top + ROW - 8, W, 9)
      } else {
        g.fillStyle = '#f4f1e4'
        for (let x = 20; x < W; x += 120) g.fillRect(x, top + ROW - 5, 60, 9)
      }
    } else if (lane.kind === 'river') {
      g.fillStyle = '#3db3f0'
      g.fillRect(0, top, W, ROW + 1)
      g.fillStyle = '#55c2f7'
      g.fillRect(0, top + 30, W, 40)
      g.strokeStyle = 'rgba(255,255,255,0.55)'
      g.lineWidth = 4
      g.lineCap = 'round'
      const flow = lane.speed > 0 ? lane.dir * lane.speed * 0.6 : 14
      for (let i = 0; i < 6; i++) {
        const span = W + 120
        const rx = ((((lane.seed * 700 + i * 213 + t * flow) % span) + span) % span) - 60
        const ry = top + 20 + ((i * 37) % 60)
        const w = 22 + ((i * 13) % 20)
        g.beginPath()
        g.moveTo(rx - w, ry)
        g.quadraticCurveTo(rx, ry - 7 - Math.sin(t * 2 + i) * 3, rx + w, ry)
        g.stroke()
      }
      if (far !== 'river') {
        g.fillStyle = '#8a6238'
        g.fillRect(0, top, W, 12)
        g.fillStyle = 'rgba(255,255,255,0.6)'
        g.fillRect(0, top + 12, W, 4)
      }
      if (near !== 'river') {
        g.fillStyle = 'rgba(255,255,255,0.65)'
        g.fillRect(0, top + ROW - 6 + Math.sin(t * 2.2 + row) * 1.5, W, 8)
      }
    } else {
      g.fillStyle = '#c9b892'
      g.fillRect(0, top, W, ROW + 1)
      g.fillStyle = '#b5a37c'
      g.fillRect(0, top + ROW - 12, W, 13)
      g.fillStyle = '#8b6543'
      for (let x = 14; x < W; x += 58) g.fillRect(x, top + 16, 20, ROW - 32)
      for (const ry of [top + 30, top + ROW - 34]) {
        g.fillStyle = '#7f8797'
        g.fillRect(0, ry, W, 9)
        g.fillStyle = '#d5dbe6'
        g.fillRect(0, ry, W, 3)
      }
    }
  }

  const drawUfo = (g: CanvasRenderingContext2D, x: number, groundY: number, lift: number, beam: boolean) => {
    const t = stage.time
    const uy = groundY - 205 - lift + Math.sin(t * 3) * 6
    if (beam) {
      const pulse = 0.34 + Math.sin(t * 9) * 0.08
      g.fillStyle = `rgba(190,255,170,${pulse})`
      g.beginPath()
      g.moveTo(x - 26, uy + 20)
      g.lineTo(x + 26, uy + 20)
      g.lineTo(x + 84, groundY + 8)
      g.lineTo(x - 84, groundY + 8)
      g.closePath()
      g.fill()
      ellipse(g, x, groundY + 6, 84, 17, `rgba(210,255,190,${pulse + 0.18})`)
    }
    sprite(g, '🛸', x, uy, 210, Math.sin(t * 2.2) * 0.08)
  }

  const drawThings = (g: CanvasRenderingContext2D, row: number) => {
    const lane = laneAt(row)
    const y = rowY(row)
    const feet = y + FEET
    const t = stage.time
    for (let c = 0; c < COLS; c++) {
      const block = lane.blocks[c]
      if (!block) continue
      const x = colX(c)
      const shake = lane.shakeCol === c ? Math.max(0, 1 - (t - lane.shakeAt) / 0.5) : 0
      const wobble = Math.sin((t - lane.shakeAt) * 40) * shake
      if (lane.flag) {
        // Cheering critters hop on the spot, higher when the frog arrives.
        const cheer = t < cheerUntil && Math.abs(row - frog.row) < 2 ? 1 : 0.35
        const jump = Math.abs(Math.sin(t * 7 + c)) * 26 * cheer + shake * 20
        ellipse(g, x, feet + 6, 30 - jump * 0.3, 8, 'rgba(0,0,0,0.2)')
        sprite(g, block, x, feet - 34 - jump, 76, wobble * 0.3)
        sprite(g, '🎉', x + (c === 0 ? 38 : -38), feet - 70 - jump * 0.6, 34)
      } else if (block === '🪨' || block === '🍄') {
        ellipse(g, x, feet + 8, 34, 9, 'rgba(0,0,0,0.2)')
        sprite(g, block, x + wobble * 5, feet - 22, 72)
      } else {
        ellipse(g, x, feet + 12, 40, 11, 'rgba(0,0,0,0.2)')
        sprite(g, block, x, feet - 50, 128, Math.sin(t * 1.3 + c + row) * 0.035 + wobble * 0.14)
      }
    }
    if (lane.flag) {
      label(g, String(row), colX(1) + 20, y + 16, 58, 'rgba(255,255,255,0.92)', 'rgba(60,110,40,0.55)')
      label(g, String(row), colX(COLS - 2) - 20, y + 16, 58, 'rgba(255,255,255,0.92)', 'rgba(60,110,40,0.55)')
      for (const fx0 of [colX(1) - 36, colX(COLS - 2) + 36]) sprite(g, '🚩', fx0, feet - 46, 64, Math.sin(t * 5 + fx0) * 0.08)
    }
    if (lane.train) {
      const flash = lane.train.state === 'wait' ? 0 : Math.floor(t * 5) % 2 === 0 ? 1 : 2
      drawSignal(g, 34, feet - 30, flash)
      drawSignal(g, W - 34, feet - 30, flash)
      if (lane.train.state === 'go') drawTrain(g, lane.train.x, feet + 6, lane.train.dir)
    }
    for (const m of lane.movers) {
      if (m.x < -m.len / 2 - 200 || m.x > W + m.len / 2 + 200) continue
      if (m.kind === 'log') drawLog(g, m.x, feet - 4, m.len, m.dip.value + Math.sin(t * 2 + m.seed * 9) * 2)
      else if (m.kind === 'pad') drawPad(g, m.x, feet, m.dip.value, m.seed, t)
      else if (m.kind === 'whale') {
        const bob = Math.sin(t * 1.6) * 4 + m.dip.value
        ellipse(g, m.x, feet + 8, 120, 16, 'rgba(10,60,120,0.3)')
        sprite(g, '🐳', m.x, feet - 48 + bob, 195, 0, lane.dir > 0 ? -1 : 1, 1 - m.shock * 0.12)
      } else {
        drawVehicle(g, {
          x: m.x,
          y: feet + 8,
          dir: lane.dir,
          len: m.len,
          look: m.gold ? GOLD_LOOK : CAR_LOOKS[m.look]!,
          truck: m.kind === 'truck',
          gold: m.gold,
          driver: m.shock > 0.3 ? '😱' : m.driver,
          shock: m.shock,
          bounce: Math.abs(Math.sin(t * 9 + m.seed * 7)) * 2 + m.dip.value,
          time: t,
          night,
        })
      }
    }
    for (const bug of bugs) {
      if (bug.row !== row) continue
      const bx = bug.x + Math.sin(t * 2.3 + bug.seed * 20) * 14
      const by = y - 34 + Math.sin(t * 4.1 + bug.seed * 9) * 9
      ellipse(g, bug.x, feet + 4, 12, 4, 'rgba(0,0,0,0.15)')
      drawBug(g, bx, by, t, bug.seed)
    }
    if (lane.ufo) {
      const ufo = lane.ufo
      const cowLift = ufo.used ? 0 : 16 + Math.sin(t * 2.4) * 12 * clamp(1 - Math.abs(ufo.x - ufo.cowX) / 120, 0, 1)
      ellipse(g, ufo.cowX, feet + 6, 36 - cowLift * 0.4, 9, 'rgba(0,0,0,0.2)')
      sprite(g, '🐄', ufo.cowX, feet - 36 - cowLift, 104, ufo.used ? 0 : Math.sin(t * 3) * 0.12)
      if (!ufo.used && !(ride && ride.ufo === ufo)) drawUfo(g, ufo.x, feet, 0, true)
    }
    if (fish && fish.row === row) {
      const up = fish.t < 0.25 ? ease.outBack(fish.t / 0.25) : fish.t < 0.8 ? 1 : Math.max(0, 1 - (fish.t - 0.8) / 0.2)
      sprite(g, '🐟', fish.x, y + 20 - up * 56, 116 * Math.min(1, up + 0.2), Math.PI / 2 + Math.sin(fish.t * 20) * 0.1)
      ellipse(g, fish.x, y + 24, 44, 10, 'rgba(255,255,255,0.55)')
    }
  }

  const frogMood = (): FrogMood => {
    if (frog.state === 'flat') return 'dizzy'
    if (frog.state === 'toss' || frog.state === 'ufo') return 'wow'
    if (stage.time < frog.yumUntil) return 'yum'
    if (stage.time < frog.scaredUntil) return 'wow'
    return 'happy'
  }

  const paintFrog = (g: CanvasRenderingContext2D) => {
    if (frog.state === 'sunk') return
    const t = stage.time
    const ground = feetY(frog.rowF) + (frog.plat ? frog.plat.dip.value - 8 : 0)
    const x = frog.x + frog.nudgeX
    const y = ground - frog.z + frog.nudgeY
    if (frog.state === 'flat') {
      const k = Math.min(1, frog.t / 0.06)
      ellipse(g, x, ground + 4, 70, 14, 'rgba(0,0,0,0.18)')
      drawFrog(g, { x, y: ground + 6, sx: lerp(1, 1.85, k) * FROG_SCALE, sy: lerp(1, 0.2, k) * FROG_SCALE, rot: 0, mood: 'dizzy', lookX: 0, lookY: 0, blink: 0, air: 0, throat: 1 })
      drawDizzyStars(g, x, ground, t)
      return
    }
    ellipse(g, x, ground + 3, 40 * clamp(1 - frog.z / 320, 0.35, 1), 10 * clamp(1 - frog.z / 320, 0.35, 1), 'rgba(0,0,0,0.22)')
    const air = frog.state === 'hop' && hop ? Math.sin(hop.t * Math.PI) : frog.state === 'toss' || frog.state === 'ufo' ? 1 : 0
    const breathe = frog.state === 'idle' ? Math.sin(t * 2.6) * 0.03 : 0
    const s = stretch.value + air * 0.12 + breathe
    const sy = clamp(s, 0.45, 1.5) * FROG_SCALE
    const sx = (1 / Math.sqrt(clamp(s, 0.45, 1.5))) * FROG_SCALE
    let lookX = frog.lookX
    let lookY = frog.lookY
    const finger = stage.pointers.values().next().value
    if (finger && frog.state === 'idle') {
      lookX = clamp((finger.x - x) / 250, -1, 1)
      lookY = clamp((finger.y - (y - 50)) / 250, -1, 1)
    }
    if (tongue) {
      const k = tongue.t < 0.4 ? tongue.t / 0.4 : 1 - (tongue.t - 0.4) / 0.6
      const tx = lerp(x, tongue.x, k)
      const ty = lerp(y - 34, tongue.y, k)
      g.strokeStyle = '#ff6b9a'
      g.lineWidth = 9
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(x, y - 34)
      g.lineTo(tx, ty)
      g.stroke()
      ellipse(g, tx, ty, 9, 9, '#ff4f86')
    }
    drawFrog(g, { x, y, sx, sy, rot: frog.rot, mood: tongue ? 'wow' : frogMood(), lookX, lookY, blink: blinkAt(t, 2), air, throat: t < croakUntil ? 1.45 + Math.sin(t * 40) * 0.12 : 1 + Math.sin(t * 2.6) * 0.08 })
  }

  const drawHud = (g: CanvasRenderingContext2D) => {
    rrect(g, 18, 22, 150 + String(maxRow).length * 14, 66, 33, 'rgba(30,20,40,0.38)')
    rrect(g, W - 196, 22, 178, 66, 33, 'rgba(30,20,40,0.38)')
    if (streak >= 5) rrect(g, W / 2 - 84, 22, 168, 62, 31, 'rgba(30,20,40,0.38)')
    const d = 1 + distPop * 0.25
    sprite(g, '🚩', 52, 54, 44 * d)
    label(g, String(maxRow), 84, 56, 50 * d, '#ffffff', 'rgba(30,20,40,0.85)', 'left')
    const e = 1 + eatenPop * 0.3
    drawBug(g, W - 150, 54, stage.time, 0.3, 1.5 * e)
    label(g, String(eaten), W - 112, 56, 50 * e, '#fff3b0', 'rgba(30,20,40,0.85)', 'left')
    if (streak >= 5) {
      const s = 1 + streakPop * 0.3
      sprite(g, '🔥', W / 2 - 44, 52, 46 * s)
      label(g, String(streak), W / 2 - 12, 56, 44 * s, '#ffb02e', 'rgba(30,20,40,0.85)', 'left')
    }
  }

  // Lay out the start so the first frame is full.
  laneAt(START_ROW + 14)

  return {
    update(dt) {
      const t = stage.time
      for (const [id, press] of presses) {
        const finger = stage.pointers.get(id)
        if (press.fired) {
          if (!finger) presses.delete(id)
          continue
        }
        if (t - press.at < 0.11) continue
        const moved = finger ? Math.hypot(finger.x - press.x, finger.y - press.y) : 0
        if (moved < 14) {
          press.fired = true
          act(tapDir(press.x, press.y))
        }
      }

      // Left alone, the frog croaks now and then.
      if (frog.state === 'idle' && t - lastTouchAt > 3 && t > nextCroakAt) {
        nextCroakAt = t + 3.5 + Math.random() * 2
        stretch.value = 1.14
        croakUntil = t + 0.45
        sfx.tone({ freq: 150, to: 210, dur: 0.12, type: 'square', vol: 0.06 })
        sfx.tone({ freq: 160, to: 230, dur: 0.16, type: 'square', vol: 0.06, delay: 0.16 })
      }

      const from = Math.max(0, Math.floor(cam) - 3)
      const to = Math.floor(cam) + 9
      laneAt(to + 12)
      for (let row = from; row <= to; row++) updateLane(laneAt(row), dt)

      stretch.target = 1
      stretch.update(dt)
      updateRide(dt)
      updateFrog(dt)
      if (frog.state === 'idle' || frog.state === 'hop') checkHits()

      if (tongue) {
        tongue.t += dt / 0.2
        if (tongue.t >= 1) tongue = null
      }
      if (fish) {
        fish.t += dt
        if (fish.t > 1) fish = null
      }
      streakPop = damp(streakPop, 0, 8, dt)
      eatenPop = damp(eatenPop, 0, 8, dt)
      distPop = damp(distPop, 0, 8, dt)

      // The camera leads a little so more of what is ahead shows.
      cam = damp(cam, frog.rowF + 0.6, frog.state === 'ufo' ? 9 : 6, dt)
      const zone = Math.floor(maxRow / 20) % 3
      sunset = damp(sunset, zone === 1 ? 1 : 0, 1.2, dt)
      night = damp(night, zone === 2 ? 1 : 0, 1.2, dt)

      // Drop bugs that are far behind.
      if (bugs.length > 60) bugs.splice(0, bugs.length - 60)
    },

    draw(g) {
      const top = Math.floor(cam) + 8
      const bottom = Math.floor(cam) - 3
      for (let row = top; row >= bottom; row--) drawGround(g, row)
      const flying = frog.state === 'toss' || frog.state === 'ufo'
      const frogRow = frog.state === 'hop' && hop ? Math.min(hop.fromRow, hop.toRow) : frog.row
      for (let row = top; row >= bottom; row--) {
        if (frog.state === 'flat' && row === frogRow) paintFrog(g)
        drawThings(g, row)
        if (!flying && frog.state !== 'flat' && row === frogRow) paintFrog(g)
      }
      if (flying) paintFrog(g)
      if (ride) drawUfo(g, frog.x, feetY(frog.rowF), 0, ride.t < 1.7)
      for (let row = top; row >= bottom; row--) {
        const ufo = laneAt(row).ufo
        if (ufo && ufo.used && ufo.leaving < 1) drawUfo(g, ufo.x + ufo.leaving * 900, feetY(ride ? ride.toRow : frog.row), ufo.leaving * 900, false)
      }

      if (sunset > 0.01) {
        g.fillStyle = `rgba(255,120,60,${0.12 * sunset})`
        g.fillRect(0, 0, W, H)
      }
      if (night > 0.01) {
        g.fillStyle = `rgba(24,28,96,${0.36 * night})`
        g.fillRect(0, 0, W, H)
        for (let i = 0; i < 14; i++) {
          const sx = (i * 197 + Math.sin(stage.time * 0.7 + i) * 30 + 60) % W
          const sy = (i * 131 + Math.cos(stage.time * 0.9 + i * 2) * 24 + 90) % (H - 80)
          g.fillStyle = `rgba(255,244,150,${(0.35 + 0.35 * Math.sin(stage.time * 3 + i)) * night})`
          g.beginPath()
          g.arc(sx, sy, 5, 0, TAU)
          g.fill()
        }
      }

      drawHud(g)
      if (stage.time - lastTouchAt > 5 && frog.state === 'idle') hint(g, frog.x, rowY(frog.row + 1) - 22, stage.time, 64)
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      fx.ring(p.x, p.y, '#ffffff', 44, 0.28)
      presses.set(p.id, { x: p.startX, y: p.startY, at: stage.time, fired: false })
      // Same-frame answer: the frog crouches, ready to spring.
      if (frog.state === 'idle') stretch.value = 0.8
    },

    move(p: Pointer) {
      const press = presses.get(p.id)
      if (!press || press.fired) return
      const dx = p.x - press.x
      const dy = p.y - press.y
      if (Math.hypot(dx, dy) < 30) return
      press.fired = true
      act(swipeDir(dx, dy))
    },

    up(p: Pointer) {
      lastTouchAt = stage.time
      const press = presses.get(p.id)
      presses.delete(p.id)
      if (!press || press.fired) return
      const dx = p.x - press.x
      const dy = p.y - press.y
      act(Math.hypot(dx, dy) >= 14 ? swipeDir(dx, dy) : tapDir(press.x, press.y))
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'hop-across',
    name: 'Hop Across',
    emoji: '🐸',
    ages: [5, 9],
    pitch: 'Tap to hop a frog across toy roads, rivers and train tracks, snapping up bugs on the way.',
    howTo: 'Tap to hop forward. Swipe, or tap beside the frog, to hop sideways. Tap behind it to hop back.',
    basedOn: 'Crossy Road (200M downloads), Frogger',
    whyFun: 'One quick, squashy hop per tap with a sound for every surface; slapstick pancakes and a fish that spits you back instead of a game over; a golden car, a whale and a UFO to find.',
  },
  create,
}
