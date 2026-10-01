// Gem Miner: hold a finger and the little miner digs toward it through chunky
// blocks; gems burst out into the bag; the lift (one tap, always there) rides
// to the surface where the haul sells in a coin cascade and the shop signs
// offer a better pickaxe, a bigger bag, dynamite and a brighter lamp.

import { blinkAt, circle, ellipse, hint, line, rrect, sprite, volume } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { TAU, clamp, damp, dist, ease, inRect, lerp, rnd, rndInt, spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { DARK_H, DARK_W, PICK_COLORS, cracks, createArt, createText, drawMiner, drawMole, icon, pickaxe, twinkle } from './art.ts'
import { COLS, FINDS, GLOW, LAYERS, LIFT_COL, OX, RARITY, ROWS, START_COL, TILE, VALUE, cellX, colAt, createWorld, rowAt } from './world.ts'
import type { Find, Item } from './world.ts'

// Sky above the grass, and where the miner's feet sit on screen underground.
const SKY = 330
const FEET_AT = 400

const PICK_POWER = [1, 2, 4, 8, 16]
const PICK_PRICE = [25, 100, 300, 800]
const BAG_CAP = [10, 15, 22, 30]
const BAG_PRICE = [20, 70, 180]
const LAMP_RADIUS = [215, 295, 385, 500]
const LAMP_PRICE = [30, 110, 280]
const TNT_PRICE = 15

const COIN_HUD = { x: 44, y: 46 }
const BAG_HUD = { x: 250, y: 46 }
const LIFT_BTN = { x: 1105, y: 78, r: 58 }
const TNT_BTN = { x: 975, y: 78, r: 50 }
const CARD_X = [322, 500, 678, 856]
const CARD_W = 160
const CARD_H = 146
const CARD_Y = -238
// Where sold gems land: the shop counter (world coordinates).
const SHOP = { x: 1082, y: -46 }
const OUT = '#2a1a2e'
const FLOWERS: readonly (readonly [number, number, string])[] = [[3, -14, '🌼'], [4, 18, '🌷'], [8, -6, '🌻'], [10, 12, '🌼'], [0, -8, '🌷']]

const NAMES: Partial<Record<Item, string>> = { diamond: 'DIAMOND!', ruby: 'RUBY!', star: 'STAR GEM!', fossil: 'FOSSIL!' }
const LAYER_SHOUT = ['', 'STONE!', 'BLUE SLATE!', 'MAGMA ZONE!', 'STAR ROCK!']

type MinerState = 'idle' | 'walk' | 'fall' | 'lift' | 'busy'
type Dir = 'l' | 'r' | 'd' | 'u'

interface Loose {
  kind: Item
  x: number
  y: number
  vy: number
  vx: number
  age: number
  seed: number
}

interface Flyer {
  kind: Find | 'coin'
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
  dur: number
  arc: number
  size: number
  done: () => void
}

interface Fuse {
  col: number
  row: number
  left: number
  x: number
  y: number
  stick: boolean
}

interface Runner {
  x: number
  y: number
  col: number
  row: number
  dir: number
  left: number
  t: number
  moving: boolean
  startled: boolean
}

const vary = (amount = 0.05): number => 1 + (Math.random() * 2 - 1) * amount

// How dark the world is at a given depth, before the lamp.
const darkAt = (worldY: number): number => clamp((worldY / TILE - 5) / 17, 0, 1) * 0.88

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const art = createArt()
  const text = createText()
  const world = createWorld(() => stage.rand())

  const miner = {
    col: START_COL,
    row: -1,
    x: cellX(START_COL),
    y: 0,
    state: 'idle' as MinerState,
    fromX: 0,
    toX: 0,
    moveT: 0,
    vy: 0,
    fallFrom: 0,
    facing: 1,
    aim: Math.PI / 2,
    walk: 0,
    soot: 0,
    hopY: 0,
    hopV: 0,
    mood: 'happy' as Mood,
    moodUntil: 0,
  }
  const stretch = spring(1, 260, 11)
  const pick = spring(-1.3, 320, 15)
  const lunge = spring(0, 320, 17)
  const bagBump = spring(1, 300, 10)
  const coinBump = spring(1, 300, 10)
  const liftBump = spring(1, 260, 9)
  const tntBump = spring(1, 260, 9)
  const depthBump = spring(1, 300, 10)
  const cardBump = CARD_X.map(() => spring(1, 260, 9))
  const cardTilt = CARD_X.map(() => spring(0, 200, 6))

  let camY = -SKY
  let coins = 0
  let shownCoins = 0
  const bag: Item[] = []
  let flyingToBag = 0
  let pickTier = 0
  let bagTier = 0
  let lampTier = 0
  let dynamite = 2
  const found = new Map<Find, number>()
  let deepest = -1
  let deepestLayer = 0
  let lastTouchAt = -2.5
  let digPointer: number | null = null
  let aimX = miner.x
  let aimY = 0
  let queued = false
  let tapReady = 0
  let holdReady = 0
  let goCol: number | null = null
  let lastDir: Dir = 'd'
  let saved: { col: number; row: number } | null = null
  let lift: { t: number; dur: number; fromX: number; fromY: number; toX: number; toY: number; up: boolean } | null = null
  let cage = 0
  let streak = 0
  let lastFindAt = -10
  let fullSaidAt = -10
  // When the bag last became full, so the lift can ask for a tap soon after.
  let fullAt = Infinity
  let weakSaidAt = -10
  let bumpAt = -10
  let upTries = 0
  let hasSold = false
  let keeperMood: Mood = 'happy'
  let keeperUntil = 0
  let blastGlow = 0
  let blastX = 0
  let blastY = 0
  let shine = 0
  // The white star where the pick lands, for a few frames.
  let impactT = 0
  let impactX = 0
  let impactY = 0
  const loose: Loose[] = []
  const flyers: Flyer[] = []
  const fuses: Fuse[] = []
  const runners: Runner[] = []
  // Filled while drawing tiles, used by the darkness pass: x, y, radius.
  const lights: number[] = []
  // x, y, phase, colour index into `glintColors`.
  const glints: number[] = []
  const glintColors: string[] = []
  const zzz: number[] = []

  const cap = (): number => BAG_CAP[bagTier]!
  const power = (): number => PICK_POWER[pickTier]!
  const setMood = (mood: Mood, seconds: number): void => {
    miner.mood = mood
    miner.moodUntil = stage.time + seconds
  }
  const slotPos = (kind: Find): { x: number; y: number } => ({ x: W / 2 + (FINDS.indexOf(kind) - (FINDS.length - 1) / 2) * 46, y: 790 })

  const discover = (kind: Find): void => {
    if (found.has(kind)) return
    found.set(kind, stage.time + 0.35)
    stage.after(0.35, () => {
      const s = slotPos(kind)
      sfx.win()
      fx.text(s.x, s.y - 44, 'NEW!', { color: '#fff36b', size: 34, rise: 40 })
      fx.burst(s.x, s.y, { count: 12, color: ['#fff36b', '#ffffff'], shape: 'star', speed: 260, life: 0.6, gravity: 100 })
    })
  }

  const spawnLoose = (kind: Item, x: number, y: number, vx = 0): void => {
    loose.push({ kind, x, y, vy: -300, vx, age: 0, seed: Math.random() * 10 })
  }

  // A find just burst out of a block at world (x, y): the little jackpot.
  const celebrate = (kind: Item, x: number, y: number): void => {
    const sy = y - camY
    streak = stage.time - lastFindAt < 2.5 ? streak + 1 : 0
    lastFindAt = stage.time
    const rare = RARITY[kind]
    const glow = GLOW[kind]
    fx.burst(x, sy, { count: 8 + rare * 9, color: [glow, '#ffffff'], shape: 'star', speed: 260 + rare * 130, life: 0.6 + rare * 0.15, size: 11 + rare * 3, gravity: 200 })
    fx.ring(x, sy, glow, 64 + rare * 40, 0.35)
    sfx.ding(Math.min(streak, 4) + rare)
    if (rare >= 1) {
      fx.shake(3 + rare * 3)
      setMood('yum', 0.8)
    }
    if (rare >= 2) {
      fx.hitstop(70)
      fx.flash(glow, 0.3, 0.25)
      fx.text(x, sy - 54, NAMES[kind] ?? 'WOW!', { color: glow, size: 48 })
      sfx.win()
      setMood('wow', 1)
    }
    discover(kind)
  }

  const openChest = (x: number, y: number, layer: number): void => {
    const gain = 25 + layer * 30 + rndInt(0, 3) * 5
    const sy = y - camY
    discover('chest')
    fx.hitstop(60)
    fx.flash('#ffe14d', 0.3, 0.25)
    fx.shake(8)
    sfx.fanfare()
    setMood('wow', 1.2)
    fx.text(x, sy - 56, `+${gain}`, { color: '#ffe14d', size: 58 })
    fx.burst(x, sy, { count: 26, color: ['#ffe14d', '#ffc629', '#fff6b0'], speed: 560, life: 0.9, size: 15, gravity: 1000, angle: -Math.PI / 2, spread: Math.PI * 0.9 })
    const n = 8
    for (let i = 0; i < n; i++) {
      stage.after(0.12 + i * 0.07, () => {
        flyers.push({
          kind: 'coin',
          x0: x + rnd(-24, 24),
          y0: y - camY + rnd(-20, 10),
          x1: COIN_HUD.x,
          y1: COIN_HUD.y,
          t: 0,
          dur: 0.45,
          arc: 80,
          size: 30,
          done: () => {
            coins += i === n - 1 ? gain - Math.floor(gain / n) * (n - 1) : Math.floor(gain / n)
            coinBump.value = 1.3
            sfx.coin(i)
          },
        })
      })
    }
  }

  const openGeode = (x: number, y: number): void => {
    const sy = y - camY
    discover('geode')
    discover('amethyst')
    discover('diamond')
    spawnLoose('amethyst', x - 22, y, -90)
    spawnLoose('diamond', x, y - 10, 0)
    spawnLoose('amethyst', x + 22, y, 90)
    fx.hitstop(80)
    fx.flash('#c58bff', 0.35, 0.3)
    fx.shake(9)
    fx.text(x, sy - 56, 'GEODE!', { color: '#e6c9ff', size: 54 })
    fx.burst(x, sy, { count: 28, color: ['#c58bff', '#e6c9ff', '#ffffff'], shape: 'star', speed: 520, life: 0.9, size: 15, gravity: 200 })
    sfx.fanfare()
    setMood('wow', 1.2)
  }

  const breakCell = (col: number, row: number, quiet = false): void => {
    const cell = world.at(col, row)
    if (!cell || cell.kind === 'empty') return
    const kind = cell.kind
    const ore = cell.ore
    const layer = LAYERS[cell.layer]!
    const x = cellX(col)
    const y = row * TILE + TILE / 2
    const sy = y - camY
    cell.kind = 'empty'
    cell.ore = null
    cell.shake = 0
    cell.hp = 0
    fx.burst(x, sy, { count: quiet ? 7 : 14, color: kind === 'crystal' ? ['#a763f7', '#cfa2ff', '#ffffff'] : layer.chip, shape: 'square', speed: 440, life: 0.75, size: 14, gravity: 1500 })
    fx.burst(x, sy, { count: 4, color: '#eadfce', speed: 110, life: 0.45, size: 26, gravity: -60, drag: 0.92 })
    if (!quiet) {
      sfx.crunch()
      sfx.thud(0.45 + cell.layer * 0.12)
      if (cell.layer > 0) fx.shake(cell.layer * 1.5)
    }
    if (kind === 'chest') openChest(x, y, cell.layer)
    else if (kind === 'geode') openGeode(x, y)
    else if (kind === 'crystal') {
      spawnLoose('amethyst', x, y)
      celebrate('amethyst', x, y)
    } else if (ore) {
      spawnLoose(ore, x, y)
      celebrate(ore, x, y)
    }
  }

  const sayFull = (): void => {
    fullSaidAt = stage.time
    fx.text(BAG_HUD.x + 110, BAG_HUD.y + 64, 'FULL!', { color: '#ffb36b', size: 40, rise: 20 })
    sfx.tone({ freq: sfx.scale(4), dur: 0.12, type: 'triangle', vol: 0.2 })
    sfx.tone({ freq: sfx.scale(2), dur: 0.2, type: 'triangle', vol: 0.2, delay: 0.12 })
    liftBump.value = 1.45
    bagBump.value = 1.3
  }

  const singe = (): void => {
    miner.soot = 1
    setMood('dizzy', 1.1)
    miner.hopV = 460
    stretch.value = 1.35
    const sy = miner.y - camY - 50
    sfx.noise({ dur: 0.4, freq: 5000, to: 900, filter: 'highpass', vol: 0.25 })
    sfx.slideDown()
    fx.burst(miner.x, sy, { count: 10, color: ['#5a525e', '#7d7582', '#3a343e'], speed: 140, life: 1, size: 26, gravity: -160, drag: 0.94 })
    fx.burst(miner.x, sy + 30, { count: 12, color: ['#ffb02e', '#ffe14d'], shape: 'spark', speed: 420, life: 0.4, size: 9, gravity: 300 })
    fx.text(miner.x, sy - 50, 'HOT!', { color: '#ff8a3c', size: 46 })
    fx.shake(6)
  }

  const lightFuse = (col: number, row: number, seconds = 0.75): void => {
    if (fuses.some((f) => f.col === col && f.row === row && !f.stick)) return
    fuses.push({ col, row, left: seconds, x: cellX(col), y: row * TILE + 6, stick: false })
    sfx.noise({ dur: seconds, freq: 3000, to: 8000, filter: 'highpass', vol: 0.16 })
  }

  const wakeMole = (col: number, row: number, fromCol: number): void => {
    const cell = world.at(col, row)
    if (!cell) return
    cell.kind = 'empty'
    cell.cave = true
    const x = cellX(col)
    const y = row * TILE + TILE / 2
    const dir = fromCol < col ? 1 : fromCol > col ? -1 : Math.random() < 0.5 ? 1 : -1
    runners.push({ x, y, col, row, dir, left: 6, t: 0, moving: false, startled: true })
    // He was asleep on a gem.
    spawnLoose(row < 14 ? 'gold' : row < 27 ? 'emerald' : 'diamond', x, y)
    discover('mole')
    sfx.boing(4)
    sfx.tone({ freq: 900, to: 1700, dur: 0.16, type: 'triangle', vol: 0.2 })
    fx.text(x, y - camY - 56, '!?', { size: 54, color: '#ffffff' })
    setMood('wow', 0.8)
  }

  const blast = (col: number, row: number): void => {
    const x = cellX(col)
    const y = row * TILE + TILE / 2
    const sy = y - camY
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const cell = world.at(col + dc, row + dr)
        if (!cell || cell.kind === 'empty' || cell.kind === 'plate' || cell.kind === 'bedrock') continue
        if (cell.kind === 'mole') wakeMole(col + dc, row + dr, col)
        else if (cell.kind === 'tnt' && (dc !== 0 || dr !== 0)) lightFuse(col + dc, row + dr, 0.2)
        else breakCell(col + dc, row + dr, true)
      }
    }
    fx.flash('#fff3c0', 0.6, 0.25)
    fx.shake(22, 0.5)
    fx.hitstop(90)
    fx.burst(x, sy, { count: 36, color: ['#ffb02e', '#ff5d5d', '#ffe14d'], speed: 850, life: 0.6, size: 17, gravity: 600 })
    fx.burst(x, sy, { count: 16, color: ['#6b6470', '#8d8692', '#4a444f'], speed: 280, life: 1.1, size: 44, gravity: -120, drag: 0.94 })
    fx.ring(x, sy, '#ffe14d', 240, 0.45)
    fx.ring(x, sy, '#ffffff', 150, 0.3)
    fx.text(x, sy - 40, 'BOOM!', { color: '#ffe14d', size: 66 })
    sfx.thud(2)
    sfx.noise({ dur: 0.7, freq: 1200, to: 60, filter: 'lowpass', vol: 0.55 })
    sfx.tone({ freq: 110, to: 28, dur: 0.6, type: 'sine', vol: 0.5 })
    if (dist(miner.x, miner.y - 40, x, y) < TILE * 2.3) {
      miner.soot = 1
      setMood('dizzy', 1)
      stretch.value = 0.6
      miner.hopV = 380
    }
    blastGlow = 1
    blastX = x
    blastY = y
  }

  // One hit lands a rising "tink"; dirt is a soft thump instead.
  const tink = (layer: number, progress: number): void => {
    if (layer === 0) {
      sfx.noise({ dur: 0.07, freq: 520, vol: 0.3, filter: 'lowpass' })
      sfx.tone({ freq: (170 + progress * 80) * vary(), to: 90, dur: 0.08, type: 'triangle', vol: 0.2 })
      return
    }
    const f = sfx.scale(layer * 2 - 2 + Math.round(progress * 6)) * vary(0.015)
    sfx.tone({ freq: f, dur: 0.07, type: 'square', vol: 0.08 })
    sfx.tone({ freq: f * 2.01, dur: 0.14, type: 'sine', vol: 0.09 })
    sfx.noise({ dur: 0.03, freq: 5000, vol: 0.12, filter: 'highpass' })
  }

  const startWalk = (col: number): void => {
    miner.state = 'walk'
    miner.fromX = miner.x
    miner.toX = cellX(col)
    miner.moveT = 0
    miner.facing = col > miner.col ? 1 : -1
    sfx.tone({ freq: 210 * vary(0.15), to: 150, dur: 0.05, type: 'triangle', vol: 0.09 })
  }

  const startFall = (): void => {
    miner.state = 'fall'
    miner.vy = 0
    miner.fallFrom = miner.y
  }

  const noteDepth = (): void => {
    if (miner.row <= deepest) return
    deepest = miner.row
    depthBump.value = 1.35
    const layer = world.at(miner.col, miner.row)?.layer ?? 0
    if (layer > deepestLayer) {
      deepestLayer = layer
      fx.text(W / 2, 300, LAYER_SHOUT[layer] ?? 'DEEPER!', { color: LAYERS[layer]!.light, size: 70, life: 1.4 })
      fx.confetti(W / 2, 320, 50)
      fx.flash(LAYERS[layer]!.light, 0.25, 0.3)
      sfx.fanfare()
    } else if ((miner.row + 1) % 10 === 0) {
      fx.text(W / 2, 300, `${miner.row + 1} m!`, { color: '#ffffff', size: 60 })
      sfx.win()
    }
  }

  const hit = (col: number, row: number, aim: number): void => {
    miner.aim = aim
    pick.value = 0.35
    pick.vel = 0
    lunge.value = 10
    lunge.vel = 0
    stretch.kick(-1.6)
    tapReady = stage.time + 0.06
    holdReady = stage.time + 0.19
    const cell = world.at(col, row)
    if (!cell) return
    const x = cellX(col)
    const y = row * TILE + TILE / 2
    const mx = miner.x
    const my = miner.y - TILE / 2
    const cx = lerp(mx, x, 0.55)
    const cy = lerp(my, y, 0.55) - camY
    const away = Math.atan2(my - y, mx - x)
    impactT = 0.1
    impactX = cx
    impactY = cy + camY
    if (cell.kind === 'plate' || cell.kind === 'bedrock') {
      sfx.tone({ freq: 1300 * vary(), dur: 0.09, type: 'square', vol: 0.08 })
      sfx.tick()
      fx.burst(cx, cy, { count: 8, color: ['#fff6c9', '#ffffff'], shape: 'spark', angle: away, spread: 2.2, speed: 420, life: 0.25, size: 8, gravity: 0 })
      pick.value = -0.6
      return
    }
    if (cell.kind === 'lava') {
      singe()
      return
    }
    if (cell.kind === 'tnt') {
      if (fuses.some((f) => f.col === col && f.row === row && !f.stick)) {
        sfx.tick()
        return
      }
      cell.shake = 0.75
      lightFuse(col, row)
      setMood('wow', 0.9)
      fx.text(x, y - camY - 60, '!', { size: 60, color: '#ff5d5d' })
      return
    }
    if (cell.kind === 'mole') {
      wakeMole(col, row, miner.col)
      return
    }
    cell.hp -= power()
    cell.shake = 0.2
    const layer = LAYERS[cell.layer]!
    fx.burst(cx, cy, { count: 5, color: cell.kind === 'crystal' ? ['#a763f7', '#cfa2ff'] : layer.chip, shape: 'square', angle: away, spread: 1.7, speed: 400, life: 0.5, size: 11, gravity: 1300 })
    if (cell.layer > 0) fx.burst(cx, cy, { count: 3, color: '#fff6c9', shape: 'spark', angle: away, spread: 2.2, speed: 340, life: 0.2, size: 7, gravity: 0 })
    if (cell.hp <= 0) {
      breakCell(col, row)
      // Step into the hole when it was beside him; gravity handles below.
      if (aim === 0 && miner.state === 'idle') startWalk(col)
      return
    }
    tink(cell.layer, clamp(1 - cell.hp / cell.maxHp, 0, 1))
    if (cell.maxHp / power() >= 5 && stage.time - weakSaidAt > 2.5) {
      // Too hard for this pickaxe: point at the shop's answer.
      weakSaidAt = stage.time
      fx.text(x, y - camY - 50, '⛏️⬆', { size: 38, rise: 50 })
    }
  }

  const cheer = (): void => {
    miner.hopV = 430
    sfx.boing(rndInt(0, 3))
    setMood('yum', 0.6)
    fx.burst(miner.x, miner.y - camY - 60, { count: 6, color: ['#fff36b', '#ffffff'], shape: 'star', speed: 220, life: 0.5, gravity: 200 })
  }

  const tryAct = (tap: boolean): void => {
    const dx = aimX - miner.x
    const dy = aimY + camY - (miner.y - TILE / 2)
    if (Math.abs(dx) < TILE * 0.5 && Math.abs(dy) < TILE * 0.5) {
      if (tap) cheer()
      return
    }
    let dir: Dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : dy > 0 ? 'd' : 'u'
    if (dir === 'u' && !world.solid(miner.col, miner.row - 1)) {
      if (Math.abs(dx) > TILE * 0.5) dir = dx > 0 ? 'r' : 'l'
      else {
        if (tap) {
          // Nothing to dig up there and no climbing: a hopeful jump, and a nudge toward the lift.
          cheer()
          upTries++
          if (upTries >= 2 && miner.row >= 0) liftBump.value = 1.45
        }
        return
      }
    }
    lastDir = dir
    if (dir === 'd') hit(miner.col, miner.row + 1, Math.PI / 2)
    else if (dir === 'u') hit(miner.col, miner.row - 1, -Math.PI / 2)
    else {
      const s = dir === 'r' ? 1 : -1
      miner.facing = s
      const next = miner.col + s
      if (next < 0 || next >= COLS) {
        if (tap || stage.time - bumpAt > 0.45) {
          bumpAt = stage.time
          sfx.thud(0.4)
          stretch.value = 1.25
          lunge.value = 8
          miner.aim = 0
          fx.burst(miner.x + s * 36, miner.y - camY - 40, { count: 5, color: '#eadfce', speed: 160, life: 0.35, size: 14, gravity: 0 })
        }
        return
      }
      if (world.solid(next, miner.row)) hit(next, miner.row, 0)
      else {
        startWalk(next)
        if (tap) goCol = clamp(colAt(aimX), 0, COLS - 1)
      }
    }
  }

  const sell = (): void => {
    const n = bag.length
    if (n === 0) {
      miner.state = 'idle'
      return
    }
    miner.state = 'busy'
    const step = Math.min(0.12, 1.4 / n)
    let total = 0
    for (let i = 0; i < n; i++) {
      stage.after(0.3 + i * step, () => {
        const kind = bag.shift()
        if (!kind) return
        fullAt = Infinity
        bagBump.value = 0.8
        flyers.push({
          kind,
          x0: BAG_HUD.x,
          y0: BAG_HUD.y,
          x1: SHOP.x,
          y1: SHOP.y - camY,
          t: 0,
          dur: 0.4,
          arc: 26,
          size: 48,
          done: () => {
            const value = VALUE[kind]
            coins += value
            total += value
            coinBump.value = 1.25
            keeperMood = 'yum'
            keeperUntil = stage.time + 0.8
            sfx.coin(i % 7)
            const sy = SHOP.y - camY
            fx.text(SHOP.x + rnd(-50, 50), sy - 40, `+${value}`, { color: '#ffe14d', size: 30 + Math.min(value, 40) * 0.5, rise: 110 })
            fx.burst(SHOP.x, sy, { count: 5, color: ['#ffe14d', '#ffc629'], speed: 300, life: 0.6, size: 12, gravity: 900, angle: -Math.PI / 2, spread: 2 })
          },
        })
      })
    }
    stage.after(0.3 + n * step + 0.6, () => {
      hasSold = true
      miner.state = 'idle'
      fx.text(W / 2, 300, `+${total}`, { color: '#ffe14d', size: 84, life: 1.3 })
      if (total >= 25) {
        fx.confetti(W / 2, 330, 60)
        sfx.fanfare()
      } else sfx.win()
      miner.hopV = 430
      setMood('yum', 1.2)
      CARD_X.forEach((_, i) => {
        const price = priceOf(i)
        if (price !== null && coins >= price) stage.after(0.15 + i * 0.08, () => (cardBump[i]!.value = 1.3))
      })
    })
  }

  const priceOf = (i: number): number | null => {
    if (i === 0) return PICK_PRICE[pickTier] ?? null
    if (i === 1) return BAG_PRICE[bagTier] ?? null
    if (i === 2) return TNT_PRICE
    return LAMP_PRICE[lampTier] ?? null
  }

  const buy = (i: number): void => {
    const price = priceOf(i)
    const x = CARD_X[i]!
    const y = CARD_Y + CARD_H / 2 - camY
    if (price === null) {
      sfx.tick()
      fx.burst(x, y, { count: 6, color: '#fff36b', shape: 'star', speed: 200, life: 0.4 })
      return
    }
    if (coins < price) {
      sfx.nope()
      cardTilt[i]!.kick(5)
      coinBump.value = 1.35
      return
    }
    coins -= price
    cardBump[i]!.value = 1.4
    fx.confetti(x, y, 40)
    miner.hopV = 460
    setMood('yum', 1.2)
    if (i === 0) {
      pickTier++
      shine = 1
      sfx.fanfare()
      fx.text(x, y + 150, 'POWER UP!', { color: PICK_COLORS[pickTier] ?? '#ffffff', size: 54, rise: 40 })
      fx.ring(miner.x, miner.y - camY - 40, PICK_COLORS[pickTier] ?? '#ffffff', 130, 0.5)
    } else if (i === 1) {
      bagTier++
      bagBump.value = 1.6
      sfx.win()
      fx.text(x, y + 150, 'BIG BAG!', { color: '#ffd9a0', size: 50, rise: 40 })
    } else if (i === 2) {
      dynamite += 3
      tntBump.value = 1.5
      sfx.win()
      fx.text(x, y + 150, '+3', { color: '#ff8a8a', size: 56, rise: 40 })
    } else {
      lampTier++
      sfx.win()
      fx.flash('#fff7b0', 0.35, 0.3)
      fx.text(x, y + 150, 'BRIGHTER!', { color: '#fff7b0', size: 50, rise: 40 })
    }
  }

  const rideUp = (): void => {
    if (miner.state === 'walk') {
      miner.x = miner.toX
      miner.col = colAt(miner.x)
    }
    saved = { col: miner.col, row: miner.row }
    lift = { t: 0, dur: clamp(0.6 + miner.row * 0.035, 0.75, 1.5), fromX: miner.x, fromY: miner.y, toX: cellX(LIFT_COL), toY: 0, up: true }
    miner.state = 'lift'
    goCol = null
    queued = false
    upTries = 0
    sfx.tick()
    sfx.slideUp()
    sfx.whoosh()
    setMood('wow', lift.dur)
  }

  const rideDown = (): void => {
    if (!saved) return
    if (miner.state === 'walk') miner.x = miner.toX
    lift = { t: 0, dur: clamp(0.6 + saved.row * 0.035, 0.75, 1.5), fromX: miner.x, fromY: 0, toX: cellX(saved.col), toY: (saved.row + 1) * TILE, up: false }
    miner.state = 'lift'
    goCol = null
    queued = false
    sfx.tick()
    sfx.slideDown()
    sfx.whoosh()
    setMood('wow', lift.dur)
  }

  const pressLift = (): void => {
    liftBump.value = 0.8
    if (miner.state === 'lift' || miner.state === 'busy' || miner.state === 'fall') {
      sfx.tick()
      return
    }
    if (miner.row >= 0) rideUp()
    else if (saved) rideDown()
    else {
      // Nowhere to ride to yet: he points at the ground instead.
      sfx.nope()
      cheer()
      lastTouchAt = stage.time - 5
    }
  }

  const useDynamite = (): void => {
    if (miner.state !== 'idle' && miner.state !== 'walk') {
      sfx.tick()
      tntBump.value = 0.85
      return
    }
    if (dynamite <= 0) {
      sfx.nope()
      tntBump.value = 0.75
      fx.text(TNT_BTN.x, TNT_BTN.y + 84, '🛒', { size: 44, rise: 20 })
      return
    }
    dynamite--
    tntBump.value = 1.4
    const col = clamp(colAt(miner.x), 0, COLS - 1)
    fuses.push({ col, row: miner.row + 1, left: 0.8, x: miner.x + miner.facing * 22, y: miner.y - 16, stick: true })
    sfx.pop(2)
    sfx.noise({ dur: 0.8, freq: 3000, to: 8000, filter: 'highpass', vol: 0.16 })
    setMood('wow', 0.9)
  }

  const land = (): void => {
    const rows = (miner.y - miner.fallFrom) / TILE
    stretch.value = clamp(1 - miner.vy / 2400, 0.5, 0.85)
    sfx.thud(clamp(0.4 + rows * 0.25, 0.4, 1.6))
    fx.burst(miner.x, miner.y - camY, { count: 6 + Math.min(8, Math.round(rows * 2)), color: '#eadfce', speed: 200 + rows * 30, angle: -Math.PI / 2, spread: Math.PI, life: 0.4, size: 12, gravity: 300 })
    if (rows >= 3) {
      fx.shake(4 + Math.min(rows, 6))
      setMood('dizzy', 0.5)
    }
    miner.state = 'idle'
    const under = world.at(miner.col, miner.row + 1)
    if (under?.kind === 'lava') {
      // He cannot stand in lava: one singe, and it cools to rock under him.
      singe()
      under.kind = 'block'
      under.ore = null
      under.hp = under.maxHp
    }
    noteDepth()
  }

  const updateMiner = (dt: number): void => {
    if (miner.state === 'walk') {
      miner.moveT += dt / 0.12
      miner.walk += dt * 26
      miner.x = lerp(miner.fromX, miner.toX, Math.min(1, miner.moveT))
      if (miner.moveT >= 1) {
        miner.x = miner.toX
        miner.col = colAt(miner.x)
        miner.state = 'idle'
      }
    } else {
      miner.walk = damp(miner.walk % TAU, 0, 14, dt)
    }
    if (miner.state === 'fall') {
      miner.vy = Math.min(1700, miner.vy + 3400 * dt)
      let floor = rowAt(miner.y - 0.01) + 1
      while (!world.solid(miner.col, floor)) floor++
      const next = miner.y + miner.vy * dt
      if (next >= floor * TILE) {
        miner.y = floor * TILE
        miner.row = floor - 1
        land()
      } else miner.y = next
    }
    if (miner.state === 'lift' && lift) {
      lift.t += dt
      const m = clamp((lift.t - 0.16) / (lift.dur - 0.16), 0, 1)
      miner.y = lerp(lift.fromY, lift.toY, ease.inOutCubic(m))
      miner.x = lerp(lift.fromX, lift.toX, ease.inOutQuad(m))
      if (m >= 1) {
        const up = lift.up
        lift = null
        miner.col = clamp(colAt(miner.x), 0, COLS - 1)
        miner.row = rowAt(miner.y) - 1
        miner.state = 'idle'
        stretch.value = 0.6
        sfx.thud(0.9)
        fx.shake(5)
        fx.burst(miner.x, miner.y - camY, { count: 12, color: '#eadfce', speed: 260, angle: -Math.PI / 2, spread: Math.PI, life: 0.45, size: 14, gravity: 300 })
        if (up) sell()
      }
    }
    if (miner.state === 'idle') {
      if (!world.solid(miner.col, miner.row + 1)) startFall()
      else if (queued && stage.time >= tapReady) {
        queued = false
        tryAct(true)
      } else if (digPointer !== null && stage.time >= holdReady) tryAct(false)
      else if (goCol !== null && digPointer === null) {
        const s = Math.sign(goCol - miner.col)
        if (s === 0 || world.solid(miner.col + s, miner.row)) goCol = null
        else startWalk(miner.col + s)
      }
    }
    // The little hop used for cheers, singes and blasts.
    if (miner.hopY > 0 || miner.hopV > 0) {
      miner.hopY += miner.hopV * dt
      miner.hopV -= 2600 * dt
      if (miner.hopY <= 0) {
        miner.hopY = 0
        miner.hopV = 0
        stretch.value = 0.8
      }
    }
    if (stage.time > miner.moodUntil) miner.mood = 'happy'
    miner.soot = Math.max(0, miner.soot - dt / 3.5)
    stretch.update(dt)
    pick.update(dt)
    lunge.update(dt)
  }

  const updateLoose = (dt: number): void => {
    for (let i = loose.length - 1; i >= 0; i--) {
      const it = loose[i]!
      it.age += dt
      const nx = it.x + it.vx * dt
      if (!world.solid(colAt(nx), rowAt(it.y))) it.x = nx
      it.vx *= 0.9 ** (dt * 60)
      const col = clamp(colAt(it.x), 0, COLS - 1)
      let r = rowAt(it.y)
      while (!world.solid(col, r + 1)) r++
      const rest = (r + 1) * TILE - 26
      it.vy += 1900 * dt
      it.y += it.vy * dt
      if (it.y >= rest) {
        it.y = rest
        it.vy = it.vy > 320 ? -it.vy * 0.35 : 0
      }
      if (it.age < 0.24 || miner.state === 'lift') continue
      const d = dist(it.x, it.y, miner.x, miner.y - 40)
      if (d > TILE * 2.6) continue
      if (bag.length + flyingToBag < cap()) {
        const kind = it.kind
        flyingToBag++
        loose.splice(i, 1)
        flyers.push({
          kind,
          x0: it.x,
          y0: it.y - camY,
          x1: BAG_HUD.x,
          y1: BAG_HUD.y,
          t: 0,
          dur: 0.42,
          arc: 90,
          size: 50,
          done: () => {
            flyingToBag--
            bag.push(kind)
            bagBump.value = 1.35
            sfx.pop(Math.min(bag.length, 12))
            if (bag.length >= cap()) {
              fullAt = stage.time
              sayFull()
            }
          },
        })
      } else if (stage.time - fullSaidAt > 1.8 && d < TILE * 1.7) sayFull()
    }
  }

  const updateRunners = (dt: number): void => {
    for (let i = runners.length - 1; i >= 0; i--) {
      const r = runners[i]!
      r.t += dt
      if (r.startled) {
        if (r.t > 0.5) {
          r.startled = false
          r.t = 0
        }
        continue
      }
      if (r.moving) {
        r.x = cellX(r.col) + r.dir * TILE * Math.min(1, r.t / 0.11)
        if (r.t >= 0.11) {
          r.col += r.dir
          r.left--
          r.moving = false
          r.x = cellX(r.col)
        }
        continue
      }
      const next = world.at(r.col + r.dir, r.row)
      const blocked = !next || r.left <= 0 || next.kind === 'lava' || next.kind === 'plate' || next.kind === 'bedrock' || next.kind === 'tnt' || next.kind === 'mole'
      if (blocked) {
        // Far enough: back to sleep, right here.
        const here = world.at(r.col, r.row)
        if (here) {
          here.kind = 'mole'
          here.ore = null
          here.hp = here.maxHp
          here.cave = true
        }
        fx.burst(r.x, r.y - camY, { count: 6, color: '#eadfce', speed: 140, life: 0.4, size: 16, gravity: 0 })
        sfx.tone({ freq: 500, to: 260, dur: 0.3, type: 'sine', vol: 0.12 })
        runners.splice(i, 1)
        continue
      }
      if (next.kind !== 'empty') {
        breakCell(r.col + r.dir, r.row, true)
        sfx.noise({ dur: 0.05, freq: 1800 * vary(0.3), vol: 0.16, q: 2 })
      }
      r.moving = true
      r.t = 0
    }
  }

  // ---- drawing ----

  const drawSurface = (g: CanvasRenderingContext2D, cam: number): void => {
    const gy = -cam
    if (gy < -20) return
    const t = stage.time
    const sky = g.createLinearGradient(0, gy - SKY, 0, gy)
    sky.addColorStop(0, '#4fb0f2')
    sky.addColorStop(1, '#c8efff')
    g.fillStyle = sky
    g.fillRect(0, 0, W, gy + 12)
    // Sun with slow rays.
    const sx = 760
    const sy = gy - 262
    g.save()
    g.translate(sx, sy)
    g.rotate(t * 0.15)
    g.fillStyle = 'rgba(255,240,150,0.45)'
    for (let i = 0; i < 10; i++) {
      g.rotate(TAU / 10)
      g.beginPath()
      g.moveTo(-9, 46)
      g.lineTo(0, 86)
      g.lineTo(9, 46)
      g.fill()
    }
    g.restore()
    circle(g, sx, sy, 42, '#ffe14d', '#ffc629', 5)
    // Clouds.
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 470 + t * (9 + i * 4)) % (W + 300)) - 150
      const cy = gy - 300 + i * 46
      g.fillStyle = 'rgba(255,255,255,0.9)'
      g.beginPath()
      g.ellipse(cx, cy, 58, 22, 0, 0, TAU)
      g.ellipse(cx - 34, cy + 8, 36, 17, 0, 0, TAU)
      g.ellipse(cx + 38, cy + 7, 40, 18, 0, 0, TAU)
      g.ellipse(cx + 6, cy - 14, 34, 19, 0, 0, TAU)
      g.fill()
    }
    ellipse(g, 300, gy + 40, 380, 120, '#9bdc86')
    ellipse(g, 860, gy + 60, 480, 150, '#86d072')
    // Flowers, for as long as the turf under them has not been dug away.
    for (const [col, off, char] of FLOWERS) {
      if (world.solid(col, 0)) sprite(g, char, cellX(col) + off, gy - 15, 36, Math.sin(t * 1.7 + col) * 0.12)
    }

    // The lift's headframe over the landing pad.
    const lx = cellX(LIFT_COL)
    line(g, lx - 50, gy, lx - 16, gy - 196, OUT, 17)
    line(g, lx + 50, gy, lx + 16, gy - 196, OUT, 17)
    line(g, lx - 50, gy, lx - 16, gy - 196, '#a86a36', 11)
    line(g, lx + 50, gy, lx + 16, gy - 196, '#a86a36', 11)
    line(g, lx - 40, gy - 60, lx + 28, gy - 130, '#8a5433', 7)
    line(g, lx + 40, gy - 60, lx - 28, gy - 130, '#8a5433', 7)
    rrect(g, lx - 34, gy - 206, 68, 16, 6, '#c47d3c', OUT, 4)
    g.save()
    g.translate(lx, gy - 214)
    circle(g, 0, 0, 24, '#7c8799', OUT, 4)
    g.rotate(lift ? t * 14 : t * 0.6)
    g.strokeStyle = OUT
    g.lineWidth = 4
    for (let i = 0; i < 3; i++) {
      g.rotate(TAU / 6)
      g.beginPath()
      g.moveTo(-22, 0)
      g.lineTo(22, 0)
      g.stroke()
    }
    g.restore()
    circle(g, lx, gy - 214, 6, '#ffcc29', OUT, 3)
    if (!lift) {
      const sway = Math.sin(t * 1.4) * 4
      line(g, lx, gy - 190, lx + sway, gy - 120, '#3a3340', 4)
      g.strokeStyle = '#3a3340'
      g.lineWidth = 5
      g.beginPath()
      g.arc(lx + sway, gy - 110, 10, -0.5 * Math.PI, Math.PI)
      g.stroke()
    }

    // The shop hut and its keeper.
    const hx = 990
    rrect(g, hx + 8, gy - 132, 170, 132, 8, '#d9a066', OUT, 5)
    rrect(g, hx + 30, gy - 112, 126, 76, 8, '#4a2c1c', OUT, 4)
    const look = clamp((miner.x - SHOP.x) / 500, -1, 1)
    const kMood = stage.time < keeperUntil ? keeperMood : 'happy'
    drawMole(g, SHOP.x + 10, gy - 72 + Math.sin(t * 2.4) * 2, true, t, 0.95, true, kMood, look)
    rrect(g, hx + 18, gy - 44, 150, 18, 6, '#c47d3c', OUT, 4)
    icon(g, art, 'gold', hx + 50, gy - 58, 30)
    // Awning.
    g.save()
    g.beginPath()
    g.roundRect(hx - 6, gy - 176, 198, 46, [14, 14, 18, 18])
    g.clip()
    for (let i = 0; i < 7; i++) {
      g.fillStyle = i % 2 === 0 ? '#ff5d5d' : '#fff6ea'
      g.fillRect(hx - 6 + i * 29, gy - 176, 29, 46)
    }
    g.restore()
    g.strokeStyle = OUT
    g.lineWidth = 5
    g.beginPath()
    g.roundRect(hx - 6, gy - 176, 198, 46, [14, 14, 18, 18])
    g.stroke()
    // Flag.
    line(g, hx + 150, gy - 176, hx + 150, gy - 218, OUT, 5)
    g.fillStyle = '#ffcc29'
    g.beginPath()
    g.moveTo(hx + 152, gy - 218)
    g.quadraticCurveTo(hx + 170, gy - 222 + Math.sin(t * 5) * 4, hx + 186, gy - 210 + Math.sin(t * 5 + 1) * 4)
    g.quadraticCurveTo(hx + 170, gy - 204 + Math.sin(t * 5) * 4, hx + 152, gy - 200)
    g.fill()

    // Shop signs on a rope between the headframe and the hut.
    const ropeY = gy + CARD_Y - 16
    g.strokeStyle = '#8a5433'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(lx + 16, gy - 200)
    g.quadraticCurveTo(300, ropeY + 6, 420, ropeY)
    g.lineTo(900, ropeY)
    g.quadraticCurveTo(960, ropeY + 4, hx, gy - 170)
    g.stroke()
    for (let i = 0; i < CARD_X.length; i++) drawCard(g, i, gy)
  }

  const drawCard = (g: CanvasRenderingContext2D, i: number, gy: number): void => {
    const price = priceOf(i)
    const can = price !== null && coins >= price
    const t = stage.time
    const bump = cardBump[i]!.value * (can ? 1 + Math.sin(t * 5 + i) * 0.025 : 1)
    g.save()
    g.translate(CARD_X[i]!, gy + CARD_Y - 16)
    g.rotate(Math.sin(t * 1.3 + i * 1.7) * 0.025 + cardTilt[i]!.value * 0.06)
    line(g, -50, 0, -50, 18, '#8a5433', 4)
    line(g, 50, 0, 50, 18, '#8a5433', 4)
    g.translate(0, 16 + CARD_H / 2)
    g.scale(bump, bump)
    g.translate(0, -CARD_H / 2)
    if (can) {
      g.globalAlpha = 0.55 + Math.sin(t * 5 + i) * 0.25
      rrect(g, -CARD_W / 2 - 8, -8, CARD_W + 16, CARD_H + 16, 24, '#fff36b')
      g.globalAlpha = 1
    }
    rrect(g, -CARD_W / 2, 0, CARD_W, CARD_H, 18, can ? '#fff4d6' : '#e4d6bd', OUT, 5)
    if (i === 0) {
      g.save()
      g.translate(-16, 76)
      g.rotate(-0.95)
      pickaxe(g, price === null ? pickTier : pickTier + 1, 56)
      g.restore()
    } else if (i === 1) {
      sprite(g, '🎒', -8, 52, 70)
      if (price !== null) text(g, `+${BAG_CAP[bagTier + 1]! - cap()}`, 46, 30, 28)
    } else if (i === 2) {
      sprite(g, '🧨', -8, 52, 66)
      text(g, '×3', 46, 30, 28)
    } else {
      circle(g, 8, 44, 34 + lampTier * 3, 'rgba(255,240,140,0.55)')
      sprite(g, '🔦', -4, 54, 64)
    }
    if (price === null) {
      text(g, 'MAX', 0, 118, 28, '#fff36b')
    } else {
      rrect(g, -60, 100, 120, 36, 18, can ? '#3fbf55' : '#9c9488', OUT, 4)
      circle(g, -36, 118, 12, '#ffc629', OUT, 3)
      text(g, String(price), 14, 119, 26)
    }
    if (!can) {
      g.globalAlpha = 0.18
      rrect(g, -CARD_W / 2, 0, CARD_W, CARD_H, 18, '#3a2a4a')
      g.globalAlpha = 1
    }
    g.restore()
  }

  const drawTiles = (g: CanvasRenderingContext2D, cam: number): void => {
    const t = stage.time
    lights.length = 0
    glints.length = 0
    zzz.length = 0
    const r0 = Math.max(0, Math.floor(cam / TILE))
    const r1 = Math.min(ROWS - 1, Math.floor((cam + H) / TILE))
    for (let r = r0; r <= r1; r++) {
      const y = r * TILE - cam
      for (let c = 0; c < COLS; c++) {
        const cell = world.cells[r * COLS + c]!
        const x = OX + c * TILE
        if (cell.kind === 'empty' || cell.kind === 'crystal' || cell.kind === 'mole') {
          g.drawImage(art.back[cell.layer]!, x, y, TILE + 0.6, TILE + 0.6)
          if (r > 0 && world.solid(c, r - 1)) {
            g.fillStyle = 'rgba(0,0,0,0.3)'
            g.fillRect(x, y, TILE, 12)
          }
          if (cell.kind === 'crystal') {
            const pulse = Math.sin(t * 2.4 + c * 1.9) * 3
            icon(g, art, 'amethyst', x + TILE / 2 + Math.sin(t * 90 + c) * cell.shake * 20, y + 44 - pulse / 2, 84 + pulse)
            lights.push(x + TILE / 2, y + TILE / 2, 150)
            glints.push(x + 30, y + 20, c * 12.9 + r * 78.2, glintColors.indexOf(GLOW.amethyst))
          } else if (cell.kind === 'mole') {
            drawMole(g, x + TILE / 2, y + 46, false, t + c)
            zzz.push(x + TILE / 2, y + 20)
          } else if (cell.cave && r > 0) {
            lights.push(x + TILE / 2, y + TILE / 2, 90)
          }
          continue
        }
        const ox = cell.shake > 0 ? Math.sin(t * 90 + c * 3) * cell.shake * 22 : 0
        if (cell.kind === 'lava') {
          g.drawImage(art.lava, x, y, TILE, TILE)
          g.globalAlpha = 0.25 + Math.sin(t * 3 + c * 2.1 + r) * 0.2
          g.fillStyle = '#fff2a0'
          g.beginPath()
          g.ellipse(x + 42 + Math.sin(t * 1.3 + c) * 16, y + 40 + Math.cos(t * 1.7 + r) * 12, 18, 12, 0, 0, TAU)
          g.fill()
          g.globalAlpha = 1
          lights.push(x + TILE / 2, y + TILE / 2, 125 + Math.sin(t * 5 + c) * 10)
          continue
        }
        if (cell.kind === 'plate') {
          g.drawImage(art.plate, x, y, TILE, TILE)
          continue
        }
        if (cell.kind === 'bedrock') {
          g.drawImage(art.bedrock, x, y, TILE + 0.6, TILE + 0.6)
          continue
        }
        if (cell.kind === 'tnt') {
          g.drawImage(art.tnt, x + ox, y, TILE, TILE)
          if (cell.shake > 0 && Math.sin(t * 40) > 0) {
            g.globalAlpha = 0.6
            rrect(g, x + 4, y + 4, TILE - 8, TILE - 8, 10, '#ffffff')
            g.globalAlpha = 1
          }
          continue
        }
        g.drawImage(art.tiles[cell.layer]![cell.variant]!, x + ox, y, TILE, TILE)
        if (r === 0) g.drawImage(art.grass, x + ox, y - 11, TILE, 40)
        const what: Find | null = cell.kind === 'chest' ? 'chest' : cell.kind === 'geode' ? 'geode' : cell.ore
        if (what) {
          const rare = what === 'chest' || what === 'geode' ? 2 : RARITY[what]
          const size = 58 + rare * 3 + (rare > 0 ? Math.sin(t * 3 + c * 1.7 + r) * 2.5 : 0)
          icon(g, art, what, x + TILE / 2 + ox, y + TILE / 2 + 1, size)
          const phase = c * 12.9 + r * 78.2
          const color = what === 'chest' ? '#fff2a0' : what === 'geode' ? '#e6c9ff' : GLOW[what]
          let ci = glintColors.indexOf(color)
          if (ci < 0) ci = glintColors.push(color) - 1
          if (rare > 0 || what === 'copper') glints.push(x + 26 + ((c * 7 + r * 3) % 5) * 8, y + 24 + ((c * 3 + r * 5) % 4) * 9, phase, ci)
          if (what === 'geode') lights.push(x + TILE / 2, y + TILE / 2, 100)
        }
        if (cell.hp < cell.maxHp && cell.hp > 0) cracks(g, x + ox, y, Math.ceil((1 - cell.hp / cell.maxHp) * 3))
      }
    }
  }

  const drawDarkness = (g: CanvasRenderingContext2D, cam: number): void => {
    if (darkAt(cam + H) < 0.01) return
    const d = art.darkCtx
    const k = DARK_W / W
    d.globalCompositeOperation = 'source-over'
    d.globalAlpha = 1
    d.clearRect(0, 0, DARK_W, DARK_H)
    const grad = d.createLinearGradient(0, 0, 0, DARK_H)
    for (let i = 0; i <= 4; i++) grad.addColorStop(i / 4, `rgba(7,4,20,${darkAt(cam + (H * i) / 4).toFixed(2)})`)
    d.fillStyle = grad
    d.fillRect(0, 0, DARK_W, DARK_H)
    d.globalCompositeOperation = 'destination-out'
    const hole = (x: number, y: number, r: number, alpha = 1): void => {
      d.globalAlpha = alpha
      d.drawImage(art.light, (x - r) * k, (y - r) * k, r * 2 * k, r * 2 * k)
    }
    const flicker = 1 + Math.sin(stage.time * 11) * 0.012
    hole(miner.x, miner.y - cam - 48 - miner.hopY, LAMP_RADIUS[lampTier]! * flicker)
    for (let i = 0; i < lights.length; i += 3) hole(lights[i]!, lights[i + 1]!, lights[i + 2]!, 0.8)
    for (const it of loose) hole(it.x, it.y - cam, 70, 0.7)
    for (const f of fuses) hole(f.x, f.y - cam, 130)
    for (const r of runners) hole(r.x, r.y - cam, 110, 0.8)
    if (blastGlow > 0.01) hole(blastX, blastY - cam, 620, Math.min(1, blastGlow))
    d.globalAlpha = 1
    g.drawImage(art.dark, 0, 0, W, H)
  }

  const drawHud = (g: CanvasRenderingContext2D): void => {
    const t = stage.time
    // Coins.
    g.save()
    g.translate(COIN_HUD.x, COIN_HUD.y)
    g.scale(coinBump.value, coinBump.value)
    circle(g, 0, 0, 23, '#ffc629', OUT, 4)
    circle(g, 0, 0, 14, '#ffe88a')
    g.restore()
    text(g, String(Math.round(shownCoins)), 78, 48, 42, '#fff6c9', 'left')

    // Bag and what is in it.
    const n = cap()
    const full = bag.length >= n
    const perRow = n <= 13 ? n : Math.ceil(n / 2)
    const rows = n <= 13 ? 1 : 2
    const px0 = BAG_HUD.x + 48
    rrect(g, px0 - 16, rows === 1 ? 26 : 16, perRow * 26 + 28, rows === 1 ? 40 : 62, 20, 'rgba(20,12,30,0.5)', full ? `rgba(255,150,90,${0.6 + Math.sin(t * 8) * 0.4})` : 'rgba(255,255,255,0.25)', full ? 5 : 3)
    for (let i = 0; i < n; i++) {
      const px = px0 + (i % perRow) * 26 + 10
      const py = rows === 1 ? 46 : 33 + Math.floor(i / perRow) * 27
      const item = bag[i]
      if (item) icon(g, art, item, px, py, 28)
      else circle(g, px, py, 7, 'rgba(255,255,255,0.18)')
    }
    const wob = full ? Math.sin(t * 14) * 0.12 : 0
    sprite(g, '🎒', BAG_HUD.x, BAG_HUD.y, 62 * bagBump.value, wob)

    // Depth.
    if (miner.row >= 0 || miner.state === 'lift') {
      const depth = Math.max(0, Math.round(miner.y / TILE))
      g.save()
      g.translate(800, 48)
      g.scale(depthBump.value, depthBump.value)
      text(g, `▼ ${depth} m`, 0, 0, 38)
      g.restore()
    } else if (deepest >= 0) {
      text(g, `🏆 ${deepest + 1} m`, 800, 48, 34)
    }

    // Dynamite button.
    g.save()
    g.translate(TNT_BTN.x, TNT_BTN.y)
    g.scale(tntBump.value, tntBump.value)
    if (dynamite <= 0) g.globalAlpha = 0.55
    circle(g, 0, 0, TNT_BTN.r, '#4a2f45', OUT, 5)
    circle(g, 0, -3, TNT_BTN.r - 8, '#6b4463')
    sprite(g, '🧨', -2, 0, 60, Math.sin(t * 2) * 0.08)
    g.globalAlpha = 1
    circle(g, 34, 32, 18, dynamite > 0 ? '#ff5d5d' : '#8d8692', OUT, 4)
    text(g, String(dynamite), 34, 33, 24, '#ffffff', 'center', false)
    g.restore()

    // Lift button: up underground, down on the surface.
    const under = miner.row >= 0
    const usable = under || saved !== null
    g.save()
    g.translate(LIFT_BTN.x, LIFT_BTN.y)
    const urge = full && under ? 1 + Math.sin(t * 8) * 0.07 : 1
    g.scale(liftBump.value * urge, liftBump.value * urge)
    if (!usable) g.globalAlpha = 0.6
    if (full && under) {
      g.globalAlpha = 0.5 + Math.sin(t * 8) * 0.3
      circle(g, 0, 0, LIFT_BTN.r + 10, '#fff36b')
      g.globalAlpha = 1
    }
    circle(g, 0, 0, LIFT_BTN.r, '#e89a1c', OUT, 5)
    circle(g, 0, -4, LIFT_BTN.r - 7, '#ffcc29')
    // A cage on a cable with a big arrow.
    const flip = under || miner.state === 'lift' ? 1 : -1
    line(g, -24, -30 * flip, -24, 34 * flip, 'rgba(90,50,10,0.55)', 5)
    rrect(g, -38, (flip > 0 ? 6 : -34), 28, 28, 6, '#fff4d6', OUT, 4)
    line(g, -24, flip > 0 ? 8 : -32, -24, flip > 0 ? 32 : -8, OUT, 3)
    g.scale(1, flip)
    const bob = Math.sin(t * 5) * 3
    g.beginPath()
    g.moveTo(16, -34 - bob)
    g.lineTo(44, -2 - bob)
    g.lineTo(27, -2 - bob)
    g.lineTo(27, 30 - bob)
    g.lineTo(5, 30 - bob)
    g.lineTo(5, -2 - bob)
    g.lineTo(-12, -2 - bob)
    g.closePath()
    g.strokeStyle = OUT
    g.lineWidth = 5
    g.lineJoin = 'round'
    g.stroke()
    g.fillStyle = '#ffffff'
    g.fill()
    g.restore()

    // The collection: every kind of find, dark until it has been dug up.
    const s0 = slotPos(FINDS[0]!)
    rrect(g, s0.x - 32, 766, FINDS.length * 46 + 18, 48, 24, 'rgba(20,12,30,0.55)')
    for (const kind of FINDS) {
      const s = slotPos(kind)
      const at = found.get(kind)
      if (at === undefined || t < at) {
        g.globalAlpha = 0.55
        g.drawImage(art.shades[kind], s.x - 16, s.y - 16, 32, 32)
        g.globalAlpha = 1
      } else {
        const since = t - at
        const size = 38 * (since < 0.5 ? 0.4 + 0.6 * ease.outBack(since / 0.5) + Math.sin(since * TAU) * 0.3 : 1)
        icon(g, art, kind, s.x, s.y, size)
      }
    }

    // Things in flight: gems to the bag, the haul to the shop, coins home.
    for (const f of flyers) {
      const e = ease.inOutQuad(f.t)
      const x = lerp(f.x0, f.x1, e)
      const y = lerp(f.y0, f.y1, e) - Math.sin(f.t * Math.PI) * f.arc
      const size = f.size * (1 - 0.3 * f.t)
      if (f.kind === 'coin') {
        circle(g, x, y, size / 2, '#ffc629', OUT, 3)
        circle(g, x, y, size / 4, '#ffe88a')
      } else icon(g, art, f.kind, x, y, size, f.t * 5)
    }
  }

  const drawHint = (g: CanvasRenderingContext2D, cam: number): void => {
    const t = stage.time
    // A full bag asks for the lift straight away, even mid-dig.
    if (miner.row >= 0 && miner.state !== 'lift' && bag.length >= cap() && t - fullAt > 1.2) {
      hint(g, LIFT_BTN.x, LIFT_BTN.y, t, 64)
      return
    }
    if (t - lastTouchAt < 5 || miner.state !== 'idle' || stage.pointers.size > 0) return
    if (miner.row === -1) {
      const can = CARD_X.findIndex((_, i) => {
        const price = priceOf(i)
        return price !== null && coins >= price
      })
      if (hasSold && can >= 0) {
        hint(g, CARD_X[can]!, CARD_Y + CARD_H / 2 - cam, t, 64)
        return
      }
      if (saved) {
        hint(g, LIFT_BTN.x, LIFT_BTN.y, t, 64)
        return
      }
    }
    let col = miner.col
    let row = miner.row + 1
    if (lastDir === 'l' || lastDir === 'r') {
      const next = miner.col + (lastDir === 'r' ? 1 : -1)
      if (next >= 0 && next < COLS && miner.row >= 0) {
        col = next
        row = miner.row
      }
    }
    if (world.at(col, row)?.kind === 'plate') col += 1
    hint(g, cellX(col), row * TILE + TILE / 2 - cam, t, 52)
  }

  return {
    update(dt) {
      updateMiner(dt)
      updateLoose(dt)
      updateRunners(dt)

      for (let i = fuses.length - 1; i >= 0; i--) {
        const f = fuses[i]!
        const before = Math.floor(f.left * 24)
        f.left -= dt
        if (Math.floor(f.left * 24) !== before) {
          fx.burst(f.x + (f.stick ? 10 : 0), f.y - camY - (f.stick ? 26 : 0), { count: 2, color: ['#ffe14d', '#ffffff', '#ff8a3c'], shape: 'spark', speed: 260, life: 0.22, size: 8, gravity: 300 })
        }
        if (f.left <= 0) {
          fuses.splice(i, 1)
          blast(f.col, f.row)
        }
      }

      for (let i = flyers.length - 1; i >= 0; i--) {
        const f = flyers[i]!
        f.t += dt / f.dur
        if (f.t >= 1) {
          flyers.splice(i, 1)
          f.done()
        }
      }

      // Wobbles on hit blocks decay (only rows near the screen can be shaking).
      const r0 = Math.max(0, Math.floor(camY / TILE) - 1)
      const r1 = Math.min(ROWS - 1, Math.floor((camY + H) / TILE) + 1)
      for (let i = r0 * COLS; i < (r1 + 1) * COLS; i++) {
        const cell = world.cells[i]!
        if (cell.shake > 0) cell.shake = Math.max(0, cell.shake - dt)
      }

      const target = clamp(miner.y - FEET_AT, -SKY, ROWS * TILE - H)
      camY = damp(camY, target, miner.state === 'lift' ? 18 : miner.state === 'fall' ? 11 : 6.5, dt)
      cage = damp(cage, lift ? 1 : 0, lift ? 22 : 9, dt)
      shownCoins = Math.abs(coins - shownCoins) < 0.6 ? coins : damp(shownCoins, coins, 10, dt)
      blastGlow = Math.max(0, blastGlow - dt * 2.4)
      shine = Math.max(0, shine - dt * 0.7)
      impactT = Math.max(0, impactT - dt)
      bagBump.update(dt)
      coinBump.update(dt)
      liftBump.update(dt)
      tntBump.update(dt)
      depthBump.update(dt)
      for (const s of cardBump) s.update(dt)
      for (const s of cardTilt) s.update(dt)
    },

    draw(g) {
      const t = stage.time
      const cam = Math.round(camY)
      g.fillStyle = '#140d12'
      g.fillRect(0, 0, W, H)
      drawSurface(g, cam)
      // Under the grass line the gaps between blocks are dark earth, not hillside.
      if (cam < 0) {
        g.fillStyle = '#140d12'
        g.fillRect(0, -cam + 8, W, H + cam)
      }
      drawTiles(g, cam)

      // Loose finds waiting to be picked up.
      for (const it of loose) {
        const pop = it.age < 0.25 ? ease.outBack(it.age / 0.25) : 1
        const bob = it.vy === 0 ? Math.sin(t * 4 + it.seed) * 4 : 0
        icon(g, art, it.kind, it.x, it.y - cam + bob, 50 * pop, Math.sin(t * 2 + it.seed) * 0.15)
      }

      // Dynamite sticks (crates flash in the tile pass).
      for (const f of fuses) {
        if (!f.stick) continue
        const pulse = 1 + Math.sin(t * 40) * 0.12
        sprite(g, '🧨', f.x, f.y - cam, 56 * pulse, 0.4)
      }

      for (const r of runners) {
        const jump = r.startled ? Math.abs(Math.sin(r.t * 12)) * 16 * (1 - r.t / 0.5) : Math.abs(Math.sin(r.t * 28)) * 5
        drawMole(g, r.x, r.y + 4 - cam - jump, true, t, 1, false, 'wow', r.dir)
      }

      // The miner, and the lift cage when it has him.
      const my = miner.y - cam
      const walkHop = miner.state === 'walk' ? Math.sin(Math.min(1, miner.moveT) * Math.PI) * 7 : 0
      const air = miner.state === 'fall' ? 1 + Math.min(0.28, miner.vy / 5000) : 1
      const breathe = miner.state === 'idle' ? 1 + Math.sin(t * 3) * 0.018 : 1
      const [sx, sy] = volume(stretch.value * air * breathe)
      const pointing = stage.pointers.size > 0 && digPointer !== null
      const lookX = pointing ? clamp((aimX - miner.x) / 160, -1, 1) : lastDir === 'l' ? -0.7 : lastDir === 'r' ? 0.7 : Math.sin(t * 0.8) * 0.5
      const lookY = pointing ? clamp((aimY - (my - 50)) / 160, -1, 1) : lastDir === 'd' ? 0.7 : 0
      if (cage > 0.03 && lift) line(g, miner.x, my - 96, miner.x, -30, '#3a3340', 5)
      drawMiner(g, {
        x: miner.x,
        y: my - miner.hopY - walkHop,
        facing: miner.facing,
        sx,
        sy,
        walk: miner.walk,
        aim: miner.aim,
        pick: pick.value,
        lunge: lunge.value,
        mood: miner.state === 'fall' ? 'wow' : miner.mood,
        lookX,
        lookY,
        blink: blinkAt(t, 2),
        soot: miner.soot,
        tier: pickTier,
        bag: clamp(bag.length / cap(), 0, 1),
        time: t,
      })
      if (impactT > 0) {
        const k = impactT / 0.1
        g.globalAlpha = Math.min(1, k * 1.6)
        twinkle(g, impactX, impactY - cam, 16 + (1 - k) * 30, '#ffffff')
        g.globalAlpha = 1
      }
      if (shine > 0.02) {
        g.globalAlpha = shine
        twinkle(g, miner.x + miner.facing * 30, my - 80, 16 + Math.sin(t * 12) * 6, '#ffffff')
        g.globalAlpha = 1
      }
      if (cage > 0.03) {
        g.globalAlpha = Math.min(1, cage)
        const w = 44 * (1.4 - 0.4 * Math.min(1, cage))
        g.strokeStyle = OUT
        g.lineWidth = 9
        g.beginPath()
        g.roundRect(miner.x - w, my - 98, w * 2, 104, 12)
        g.stroke()
        g.strokeStyle = '#ffb02e'
        g.lineWidth = 5
        g.stroke()
        for (const bx of [-0.5, 0, 0.5]) line(g, miner.x + bx * w, my - 96, miner.x + bx * w, my + 4, '#ffb02e', 4)
        rrect(g, miner.x - w - 4, my - 104, w * 2 + 8, 14, 6, '#ffcc29', OUT, 4)
        rrect(g, miner.x - w - 4, my - 4, w * 2 + 8, 12, 6, '#ffcc29', OUT, 4)
        g.globalAlpha = 1
      }

      drawDarkness(g, cam)

      // Glints through the dark: something is down there.
      for (let i = 0; i < glints.length; i += 4) {
        const k = Math.sin(t * 1.9 + glints[i + 2]!)
        if (k < 0.55) continue
        const a = (k - 0.55) / 0.45
        g.globalAlpha = a
        twinkle(g, glints[i]!, glints[i + 1]!, 5 + a * 9, glintColors[glints[i + 3]!] ?? '#ffffff')
      }
      g.globalAlpha = 1
      g.lineWidth = 3.5
      g.strokeStyle = '#ffffff'
      for (let i = 0; i < zzz.length; i += 2) {
        for (let k = 0; k < 3; k++) {
          const p = (t * 0.45 + k / 3) % 1
          const zx = zzz[i]! + 16 + p * 26 + Math.sin(p * 6) * 5
          const zy = zzz[i + 1]! - p * 44
          const zs = 5 + p * 6
          g.globalAlpha = (1 - p) * 0.9
          g.beginPath()
          g.moveTo(zx - zs, zy - zs)
          g.lineTo(zx + zs, zy - zs)
          g.lineTo(zx - zs, zy + zs)
          g.lineTo(zx + zs, zy + zs)
          g.stroke()
        }
      }
      g.globalAlpha = 1

      // Speed lines while the lift moves.
      if (lift && lift.t > 0.16) {
        g.strokeStyle = 'rgba(255,255,255,0.22)'
        g.lineWidth = 5
        const dir = lift.up ? 1 : -1
        g.beginPath()
        for (let i = 0; i < 12; i++) {
          const x = (i * 97 + 40) % W
          const y = (((i * 173 + t * 2600 * dir) % (H + 200)) + H + 200) % (H + 200) - 100
          g.moveTo(x, y)
          g.lineTo(x, y + 110)
        }
        g.stroke()
      }

      drawHud(g)
      drawHint(g, cam)
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      if (dist(p.x, p.y, LIFT_BTN.x, LIFT_BTN.y) < LIFT_BTN.r + 14) {
        pressLift()
        return
      }
      if (dist(p.x, p.y, TNT_BTN.x, TNT_BTN.y) < TNT_BTN.r + 12) {
        useDynamite()
        return
      }
      if (miner.row === -1 && miner.state !== 'lift') {
        for (let i = 0; i < CARD_X.length; i++) {
          if (inRect(p.x, p.y + camY, CARD_X[i]! - CARD_W / 2 - 6, CARD_Y - 6, CARD_W + 12, CARD_H + 12)) {
            buy(i)
            return
          }
        }
      }
      fx.ring(p.x, p.y, 'rgba(255,255,255,0.75)', 36, 0.25)
      if (miner.state === 'lift' || miner.state === 'busy') {
        sfx.tick()
        if (miner.state === 'busy' && miner.hopY === 0) cheer()
        return
      }
      digPointer = p.id
      aimX = p.x
      aimY = p.y
      goCol = null
      queued = true
      if (miner.state === 'idle' && stage.time >= tapReady && world.solid(miner.col, miner.row + 1)) {
        queued = false
        tryAct(true)
      }
    },

    move(p: Pointer) {
      if (p.id !== digPointer) return
      aimX = p.x
      aimY = p.y
      lastTouchAt = stage.time
    },

    up(p: Pointer) {
      lastTouchAt = stage.time
      if (p.id === digPointer) digPointer = null
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'gem-miner',
    name: 'Gem Miner',
    emoji: '⛏️',
    ages: [6, 10],
    pitch: 'Dig down through chunky blocks for gems, ride the lift up to sell them, and buy a better pickaxe to go deeper.',
    howTo: 'Hold or tap beside the miner to dig that way. Tap the yellow lift to sell, the signs to upgrade, the red button for dynamite.',
    basedOn: 'Minecraft mining, Motherload, Dig Dug, clicker games',
    whyFun: 'Every hit cracks and chips with a rising tink, gems burst out as little jackpots, and each pickaxe makes yesterday’s rock crumble in one hit.',
  },
  create,
}
