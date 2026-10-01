// Deep Sea Fishing: tap to cast, steer the hook down past the fish (touching
// one ends the dive), then steer INTO them on the way back up. At the surface
// the catch is flung into the air and pays out, smallest first. Coins buy a
// longer line, more hooks and a pelican that fishes on its own.

import { circle, hint, label, rrect, sprite } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { clamp, damp, dist, ease, inRect, lerp, rnd, spring, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { ANGLER_LURE, COLLECTION, DRAW_SCALE, drawCreature, KRAKEN_EYES, SPECIES } from './creatures.ts'
import type { Kind } from './creatures.ts'
import {
  BAND_TOP,
  FLOOR,
  LX0,
  LX1,
  SURFACE,
  bandOf,
  depthRGB,
  drawBoat,
  drawCrystals,
  drawFar,
  drawPelican,
  drawPost,
  drawSky,
  drawSurfaceLine,
  drawWalls,
  drawWater,
  drawWaterBack,
  makeDecor,
  rgb,
  rodTip,
  waveY,
} from './scene.ts'
import type { CatPose } from './scene.ts'

// Starting values, raised only while testing the deep end.
const DEV = { coins: 0, line: 0, hooks: 0, pal: 0, ghost: false }

type Phase = 'idle' | 'cast' | 'sink' | 'turn' | 'reel' | 'payout'

const PX_PER_M = 30
// How deep the hook goes at each line level, in pixels.
const LINE = [1200, 1800, 2400, 3300, 4200, 5400, 6600, 7700] as const
const LINE_PRICE = [30, 150, 500, 1500, 4000, 10000, 22500] as const
const CAP = [4, 5, 6, 8, 10, 12, 15] as const
const CAP_PRICE = [50, 200, 600, 1750, 4500, 11000] as const
// Coins the pelican catches every two seconds.
const PAL = [0, 10, 25, 60, 150, 350, 800] as const
const PAL_PRICE = [100, 400, 1250, 3500, 9000, 22500] as const
const GOLD_VALUE = [150, 600, 2250, 7500, 7500] as const
const BOTTOM_BONUS = [20, 60, 225, 750, 2000] as const
const BAND_NAME = ['', 'CORAL REEF', 'TWILIGHT ZONE', 'MIDNIGHT ZONE', 'THE ABYSS'] as const
const BAND_COLOR = ['#58d0f0', '#2f9fe0', '#1f68b8', '#16387a', '#0a1233'] as const
const BAND_STAR: readonly Kind[] = ['clown', 'puffer', 'shark', 'angler', 'kraken']
// The ring around a trophy says how rare it is.
const RARITY: Record<Kind, string> = {
  boot: '#8fc7ff',
  sardine: '#8fc7ff',
  clown: '#8fc7ff',
  puffer: '#5fd97a',
  turtle: '#5fd97a',
  jelly: '#5fd97a',
  squid: '#b98bff',
  shark: '#b98bff',
  angler: '#ffb02e',
  chest: '#ffb02e',
  goldie: '#ffb02e',
  kraken: '#ff5d8f',
}

// Fish this close to the surface are for show on the way down.
const SHALLOWS = 420

const BOAT_X = 440
const PAL_X = 184
const PAL_Y = -84
const HUD_X = 52
const HUD_Y = 50
const MAP_Y0 = 124
const MAP_Y1 = 772

interface Fish {
  kind: Kind
  x: number
  y: number
  homeY: number
  // Offset from the leader of its school, so a school turns together.
  ox: number
  dir: number
  // Smoothed facing, -1..1, so a turn is a flip and not a snap.
  face: number
  speed: number
  phase: number
  value: number
  r: number
  state: 'swim' | 'hooked' | 'fly' | 'dead'
  scare: number
  // Seconds left of darting away from a splash.
  flee: number
  puff: number
  glow: boolean
  // In the air during the payout.
  vy: number
  vx: number
  rot: number
  spin: number
  launchAt: number
  popAt: number
  launched: boolean
}

interface Bubble {
  x: number
  y: number
  r: number
  vy: number
  life: number
  wob: number
}

interface Coin {
  x: number
  y: number
  vx: number
  vy: number
  t: number
  fromX: number
  fromY: number
  amount: number
}

const BANDS: readonly { y0: number; y1: number; gap: number; table: readonly (readonly [Kind, number])[] }[] = [
  { y0: 600, y1: 1500, gap: 140, table: [['sardine', 0.44], ['clown', 0.44], ['boot', 0.12]] },
  { y0: 1500, y1: 3000, gap: 152, table: [['puffer', 0.38], ['turtle', 0.2], ['jelly', 0.2], ['clown', 0.12], ['sardine', 0.1]] },
  { y0: 3000, y1: 4800, gap: 165, table: [['squid', 0.4], ['shark', 0.2], ['jelly', 0.2], ['puffer', 0.1], ['turtle', 0.1]] },
  { y0: 4800, y1: 6900, gap: 180, table: [['angler', 0.46], ['jelly', 0.22], ['squid', 0.16], ['shark', 0.16]] },
  { y0: 6900, y1: 7330, gap: 180, table: [['angler', 0.7], ['jelly', 0.3]] },
]

function fmt(n: number): string {
  const v = Math.round(n)
  if (v >= 100000) return `${Math.round(v / 1000)}k`
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`
  return v >= 1000 ? `${Math.floor(v / 1000)},${String(v % 1000).padStart(3, '0')}` : String(v)
}

const metres = (px: number): number => Math.round(px / PX_PER_M)

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  let phase: Phase = 'idle'
  let phaseAt = 0
  let coins = DEV.coins
  let lineLv = DEV.line
  let hookLv = DEV.hooks
  let palLv = DEV.pal
  let casts = 0
  let bestHaul = 0
  let record = 0
  let deepestBand = 0
  let lastTouchAt = 0
  let steers = 0
  let steered = 0
  let bought = 0

  const hook = { x: BOAT_X + 170, y: -130, vx: 0 }
  let steerX = hook.x
  let stun = 0
  let sinkV = 0
  let reelV = 0
  let turnT = 0
  let turnY = 0
  let turnDip = 0
  let castT = 0
  let castFromX = 0
  let castFromY = 0
  let castToX = 0
  let lastMark = 0
  let dodges = 0
  let krakenOn = false
  let payT = 0
  let haulShown = 0
  let haulUntil = -1
  let doubles = 0
  let paid = 0
  let haul = 0
  let lastTickAt = -1
  let reelAcc = 0
  let bubbleAcc = 0
  let ambientAcc = 0
  let lapAcc = 0

  let camY = -SURFACE
  let camOff = SURFACE
  let camSpeed = 0

  let catMood: Mood = 'happy'
  let catMoodUntil = 0
  const rod = spring(0, 130, 7)
  const catStretch = spring(1, 220, 9)
  const palStretch = spring(1, 220, 9)
  const hudPunch = spring(1, 320, 13)
  const depthPunch = spring(1, 320, 13)
  const mapPulse = spring(0, 200, 10)
  const btnPop = [spring(1, 280, 10), spring(1, 280, 10), spring(1, 280, 10)]
  const btnShake = [spring(0, 420, 10), spring(0, 420, 10), spring(0, 420, 10)]
  const slotPop = COLLECTION.map(() => spring(1, 280, 9))
  let palIn = palLv > 0 ? 1 : 0
  let palBank = 0
  let palTimer = 0

  const decor = makeDecor(stage.rand)
  const fish: Fish[] = []
  const caught: Fish[] = []
  let flying: Fish[] = []
  const bubbles: Bubble[] = []
  const flyCoins: Coin[] = []
  const seen: Partial<Record<Kind, boolean>> = {}

  const lineMax = (): number => LINE[lineLv]!
  const cap = (): number => CAP[hookLv]!
  const diving = (): boolean => phase === 'cast' || phase === 'sink' || phase === 'turn' || phase === 'reel'

  // --- the sea's population -------------------------------------------------

  const makeFish = (kind: Kind, x: number, y: number, dir: number): Fish => {
    const sp = SPECIES[kind]
    return {
      kind,
      x,
      y,
      homeY: y,
      ox: 0,
      dir,
      face: dir,
      speed: sp.speed * (0.8 + 0.4 * stage.rand()),
      phase: stage.rand() * 10,
      value: kind === 'goldie' ? GOLD_VALUE[bandOf(y)]! : sp.value,
      r: sp.r,
      state: 'swim',
      scare: 0,
      flee: 0,
      puff: 0,
      glow: kind === 'jelly' && y > 4300,
      vy: 0,
      vx: 0,
      rot: 0,
      spin: 0,
      launchAt: 0,
      popAt: 0,
      launched: false,
    }
  }

  const spawn = (kind: Kind, y: number, fromEdge = false): void => {
    const dir = stage.rand() < 0.5 ? -1 : 1
    const x = fromEdge ? (dir > 0 ? -90 : W + 90) : lerp(LX0 + 50, LX1 - 50, stage.rand())
    if (kind === 'sardine') {
      const lead = makeFish(kind, x, y, dir)
      fish.push(lead)
      for (let i = 1; i < 3; i++) {
        const f = makeFish(kind, x - dir * 50 * i, y + (i === 1 ? 20 : -14), dir)
        f.ox = -dir * 50 * i
        f.speed = lead.speed
        fish.push(f)
      }
      return
    }
    fish.push(makeFish(kind, x, y, dir))
  }

  const spawnChest = (side: number, y: number): void => {
    const f = makeFish('chest', side === 0 ? LX0 + 24 : LX1 - 24, y, side === 0 ? 1 : -1)
    fish.push(f)
  }

  const populate = (): void => {
    // A few in plain sight of the boat, so the first screen says "fish here".
    spawn('clown', 165)
    spawn('sardine', 255)
    spawn('clown', 345)
    for (const band of BANDS) {
      let y = band.y0 + band.gap * stage.rand() * 0.5
      while (y < band.y1) {
        let roll = stage.rand()
        let kind: Kind = band.table[0]![0]
        for (const [k, weight] of band.table) {
          if (roll < weight) {
            kind = k
            break
          }
          roll -= weight
        }
        spawn(kind, y)
        y += band.gap * (0.8 + 0.4 * stage.rand())
      }
    }
    spawnChest(1, 3950)
    spawnChest(0, 5350)
    spawnChest(1, 6450)
    fish.push(makeFish('kraken', W / 2, 7600, 1))
  }
  populate()

  // One golden fish is always somewhere within reach after the first cast.
  const ensureGoldie = (): void => {
    if (casts < 1 || fish.some((f) => f.kind === 'goldie' && f.state === 'swim')) return
    spawn('goldie', lerp(Math.min(700, lineMax() - 300), lineMax() - 90, stage.rand()))
  }

  // --- small effects --------------------------------------------------------

  const addBubble = (x: number, y: number, r = rnd(3, 9), vy = rnd(60, 140)): void => {
    if (bubbles.length > 90) bubbles.shift()
    bubbles.push({ x, y, r, vy, life: rnd(0.8, 1.8), wob: rnd(0, TAU) })
  }

  const splash = (x: number, big: number): void => {
    const sy = -camY
    fx.burst(x, sy, { count: Math.round(14 + big * 22), color: ['#ffffff', '#c8f3ff', '#8fe3f7'], speed: 380 + big * 380, angle: -Math.PI / 2, spread: 1.7, gravity: 1500, life: 0.8, size: 10 + big * 5 })
    fx.ring(x, sy, '#ffffff', 60 + big * 80, 0.35)
    for (let i = 0; i < 8 + big * 10; i++) addBubble(x + rnd(-40, 40), rnd(10, 90), rnd(3, 10), rnd(30, 110))
  }

  const spawnCoins = (sx: number, sy: number, amount: number): void => {
    const n = clamp(2 + Math.floor(Math.log2(amount + 1) * 1.3), 2, 16)
    const each = Math.floor(amount / n)
    coins += amount
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU)
      const v = rnd(160, 520)
      flyCoins.push({ x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: -i * 0.025, fromX: sx, fromY: sy, amount: i === n - 1 ? amount - each * (n - 1) : each })
    }
  }

  const setMood = (mood: Mood, seconds: number): void => {
    catMood = mood
    catMoodUntil = stage.time + seconds
  }

  const catPose = (): CatPose => {
    const t = stage.time
    let lookX = clamp((hook.x - BOAT_X) / 300, -1, 1)
    let lookY = clamp((hook.y + 230) / 260, -1, 1)
    if (phase === 'payout') {
      lookX = 0.2
      lookY = -1
    }
    return { t, mood: catMood, lookX, lookY, bend: rod.value, stretch: catStretch.value, tilt: Math.sin(t * 1.1) * 0.035 + clamp(rod.vel * 0.004, -0.06, 0.06) }
  }

  const boatY = (): number => waveY(BOAT_X, stage.time) * 0.8 + 6

  // --- one cast ---------------------------------------------------------------

  const setPhase = (next: Phase): void => {
    phase = next
    phaseAt = stage.time
  }

  const cast = (p: Pointer): void => {
    ensureGoldie()
    setPhase('cast')
    castT = 0
    castFromX = hook.x
    castFromY = hook.y
    castToX = clamp(p.x, LX0 + 40, LX1 - 40)
    steerX = castToX
    stun = 0
    dodges = 0
    lastMark = 0
    krakenOn = false
    rod.value = -0.55
    rod.kick(9)
    catStretch.value = 0.82
    setMood('wow', 0.6)
    sfx.whoosh()
    sfx.slideUp()
  }

  const recordCheck = (): void => {
    if (hook.y > record + 20) {
      const first = record === 0
      record = hook.y
      if (!first) {
        fx.text(clamp(hook.x, 240, W - 240), hook.y - camY - 134, 'NEW RECORD!', { size: 44, color: '#9bffb0', life: 1.2, rise: 40 })
        sfx.win()
      }
    }
  }

  const beginTurn = (why: 'bottom' | 'bonk' | 'zap'): void => {
    setPhase('turn')
    turnT = 0
    turnY = hook.y
    const sy = hook.y - camY
    const tx = clamp(hook.x, 220, W - 220)
    recordCheck()
    depthPunch.kick(5)
    if (why === 'bottom') {
      turnDip = 20
      sfx.ding(2)
      fx.ring(hook.x, sy, '#ffffff', 130, 0.45)
      // Getting all the way down without a bump pays on the spot.
      const bonus = BOTTOM_BONUS[bandOf(hook.y)]!
      fx.text(tx, sy - 70, `${metres(hook.y)} m!  +${bonus}`, { size: 50, color: '#fff3b0' })
      fx.burst(hook.x, sy, { count: 14, color: ['#ffd23f', '#fff1a8'], shape: 'star', speed: 320, life: 0.6, gravity: 0 })
      spawnCoins(hook.x, sy, bonus)
      sfx.coin(2)
      fx.shake(4)
    } else if (why === 'bonk') {
      turnDip = -14
      sfx.boing(-2)
      sfx.thud(0.8)
      fx.shake(7)
      fx.hitstop(50)
      fx.text(tx, sy - 80, 'BONK!', { size: 56, color: '#ffd0e0' })
    } else {
      turnDip = -14
      stun = 0.5
      sfx.zap()
      sfx.thud(0.5)
      fx.flash('#fff36b', 0.3, 0.2)
      fx.shake(9)
      fx.text(tx, sy - 80, 'BZZT!', { size: 56, color: '#fff36b' })
    }
  }

  const hookFish = (f: Fish): void => {
    f.state = 'hooked'
    f.scare = 1
    caught.push(f)
    const n = caught.length
    const sy = f.y - camY
    sfx.pop(n - 1)
    sfx.note(n + 1, 0.16, 'triangle', 0.16)
    fx.burst(f.x, sy, { count: 9, color: ['#ffffff', '#c8f3ff'], speed: 260, life: 0.45, size: 9, gravity: -200, shape: 'ring' })
    fx.ring(f.x, sy, '#ffffff', f.r + 40, 0.3)
    for (let i = 0; i < 6; i++) addBubble(f.x + rnd(-20, 20), f.y + rnd(-20, 20))
    catStretch.kick(1)
    if (f.kind === 'kraken') {
      krakenOn = true
      fx.shake(18, 0.6)
      fx.flash('#ff8fb1', 0.4, 0.3)
      fx.hitstop(120)
      fx.text(W / 2, 260, 'THE KRAKEN!!', { size: 84, color: '#ff8fb1', life: 1.6 })
      sfx.thud(2)
      sfx.fanfare()
      return
    }
    if (f.value >= 200 || f.kind === 'goldie') {
      fx.hitstop(45)
      fx.shake(5)
      if (f.kind === 'goldie') {
        fx.text(clamp(f.x, 200, W - 200), sy - 140, 'GOLDEN!', { size: 50, color: '#ffe14d' })
        sfx.ding(6)
      }
    }
    if (n >= cap()) {
      fx.text(hook.x, hook.y - camY - 110, 'FULL!', { size: 60, color: '#9bffb0' })
      sfx.slideUp()
      sfx.whoosh()
    }
  }

  const zapUp = (f: Fish): void => {
    if (stun > 0) return
    stun = 0.65
    f.scare = 1
    f.flee = 2
    sfx.zap()
    fx.flash('#fff36b', 0.28, 0.2)
    fx.shake(8)
    fx.text(hook.x, hook.y - camY - 80, 'BZZT!', { size: 54, color: '#fff36b' })
    // The last one on wriggles free (treasure does not swim, so it stays).
    let at = caught.length - 1
    while (at >= 0 && caught[at]!.kind === 'chest') at--
    const lost = at >= 0 ? caught.splice(at, 1)[0] : undefined
    if (lost) {
      lost.state = 'swim'
      lost.homeY = lost.y
      lost.scare = 1
      lost.dir = lost.x < W / 2 ? -1 : 1
      lost.speed = SPECIES[lost.kind].speed * 1.6 + 60
    }
  }

  const surface = (): void => {
    setPhase('payout')
    hook.y = 0
    payT = 0
    paid = 0
    haul = 0
    haulShown = 0
    haulUntil = Infinity
    splash(hook.x, krakenOn ? 1.6 : Math.min(1, 0.35 + caught.length * 0.1))
    sfx.splat()
    sfx.thud(1)
    fx.shake(krakenOn ? 16 : 6)
    rod.kick(-5)
    setMood('wow', 9)
    catStretch.value = 1.25
    if (caught.length === 0) {
      // Nobody goes home with nothing: there is always a boot.
      const b = makeFish('boot', hook.x, 0, 1)
      b.state = 'hooked'
      fish.push(b)
      caught.push(b)
    }
    caught.sort((a, b) => a.value - b.value)
    const n = caught.length
    const gap = clamp(1.5 / n, 0.1, 0.22)
    caught.forEach((f, i) => {
      const flight = 0.86
      const mid = clamp(hook.x, 330, 740)
      const tx = clamp(mid + (i - (n - 1) / 2) * Math.min(130, 700 / n) + rnd(-18, 18), 150, 930)
      f.state = 'fly'
      f.launched = false
      f.x = hook.x
      f.y = -4
      f.launchAt = 0.06 + i * gap
      f.vx = (tx - hook.x) / flight
      f.vy = f.kind === 'kraken' ? -700 : -rnd(640, 740)
      f.popAt = f.launchAt + flight + (f.kind === 'kraken' ? 0.1 : 0)
      f.rot = 0
      f.spin = rnd(-5, 5)
    })
    flying = caught.slice()
    caught.length = 0
  }

  const finishPayout = (): void => {
    setPhase('idle')
    haulUntil = stage.time + 1.3
    casts++
    lastTouchAt = stage.time
    const best = haul > bestHaul && casts > 1
    bestHaul = Math.max(bestHaul, haul)
    if (best) {
      fx.text(W / 2, 610, 'BEST CATCH!', { size: 58, color: '#9bffb0', life: 1.3, rise: 20 })
      fx.confetti(W / 2, 380, 70)
      sfx.fanfare()
    } else {
      sfx.win()
    }
    setMood('yum', 1.6)
    catStretch.kick(3)
    palTimer = 1.4
    // Replace what was caught: new fish swim in from the sides.
    for (let i = fish.length - 1; i >= 0; i--) {
      const f = fish[i]!
      if (f.state !== 'dead') continue
      fish.splice(i, 1)
      if (f.kind === 'goldie' || (f.kind === 'boot' && f.homeY < 100)) continue
      if (f.kind === 'chest') spawnChest(f.dir > 0 ? 0 : 1, f.homeY)
      else if (f.kind === 'kraken') fish.push(makeFish('kraken', W / 2, 7600, 1))
      else if (f.kind !== 'sardine' || f.ox === 0) spawn(f.kind, f.homeY, true)
    }
  }

  const pay = (f: Fish, mult: number): void => {
    const v = f.value * mult
    const sx = f.x
    const sy = f.y - camY
    const big = clamp(Math.log2(v + 1) / 14.6, 0.1, 1)
    f.state = 'dead'
    haul += v
    fx.burst(sx, sy, { count: Math.round(10 + big * 30), color: ['#ffd23f', '#fff1a8', '#ffb02e'], speed: 300 + big * 420, life: 0.7, shape: 'star', size: 10 + big * 12, gravity: 700 })
    fx.ring(sx, sy, '#fff1a8', 60 + f.r * 1.2, 0.35)
    fx.text(sx, sy - 24, mult > 1 ? `+${fmt(v)} x2!` : `+${fmt(v)}`, { size: 34 + big * 46, color: mult > 1 ? '#9bffb0' : '#ffe14d' })
    sfx.coin(Math.min(paid, 14))
    if (mult > 1) {
      sfx.pop(paid + 2)
      doubles++
    }
    spawnCoins(sx, sy, v)
    paid++
    if (!seen[f.kind]) {
      seen[f.kind] = true
      const slot = COLLECTION.indexOf(f.kind)
      if (slot >= 0) {
        const at = slotAt(slot)
        slotPop[slot]!.value = 2
        fx.text(at.x, at.y - camY + 50, 'NEW!', { size: 26, color: RARITY[f.kind], rise: -14, life: 1.2 })
        fx.burst(at.x, at.y - camY, { count: 12, color: '#ffffff', shape: 'star', speed: 240, life: 0.6, gravity: 0 })
        sfx.ding(4)
      }
      // Only the rare ones get their name called out; the board has the rest.
      if (f.value >= 450 || f.kind === 'goldie') fx.text(sx, sy + 46, SPECIES[f.kind].name, { size: 32, color: RARITY[f.kind], rise: 30, life: 1.4 })
    }
    if (f.kind === 'kraken') {
      fx.confetti(sx, sy, 140)
      fx.confetti(W / 2, 380, 100)
      fx.shake(22, 0.7)
      fx.flash('#ffffff', 0.6, 0.3)
      fx.hitstop(140)
      sfx.fanfare()
    } else if (flying.every((o) => o.state === 'dead')) {
      // The biggest goes last and lands hardest.
      fx.shake(5 + big * 9)
      if (v >= 100) fx.hitstop(50)
    }
  }

  // Pop whatever is in the air near the finger, for double.
  const popNear = (p: Pointer): boolean => {
    let any = false
    for (const f of flying) {
      if (f.state !== 'fly' || !f.launched) continue
      if (dist(p.x, p.y, f.x, f.y - camY) < f.r + 74) {
        pay(f, 2)
        any = true
      }
    }
    return any
  }

  // --- the shop ---------------------------------------------------------------

  const btnRect = (i: number): { x: number; y: number; w: number; h: number } => ({ x: 958, y: -376 + i * 104, w: 200, h: 92 })
  const btnLevel = (i: number): number => (i === 0 ? lineLv : i === 1 ? hookLv : palLv)
  const btnPrice = (i: number): number | undefined => (i === 0 ? LINE_PRICE[lineLv] : i === 1 ? CAP_PRICE[hookLv] : PAL_PRICE[palLv])
  const btnLabel = (i: number): string => {
    if (i === 0) return `${metres(LINE[lineLv + 1] ?? 0)} m`
    if (i === 1) return `x${CAP[hookLv + 1] ?? 0}`
    return `+${PAL[palLv + 1] ?? 0}`
  }
  const affordable = (): number => {
    for (let i = 0; i < 3; i++) {
      const price = btnPrice(i)
      if (price !== undefined && coins >= price) return i
    }
    return -1
  }

  const buy = (i: number): void => {
    const price = btnPrice(i)
    const r = btnRect(i)
    const cx = r.x + r.w / 2
    const cy = r.y + r.h / 2 - camY
    if (price === undefined) {
      btnPop[i]!.value = 0.9
      sfx.tick()
      return
    }
    if (coins < price) {
      btnShake[i]!.kick(380)
      sfx.nope()
      fx.text(r.x - 86, cy + 10, `${fmt(price - coins)} more`, { size: 28, color: '#ffd0c0', life: 0.8, rise: 20 })
      return
    }
    coins -= price
    bought++
    btnPop[i]!.value = 0.72
    hudPunch.value = 0.8
    sfx.coin(3)
    sfx.ding(btnLevel(i))
    sfx.thud(0.5)
    fx.confetti(cx, cy, 26)
    fx.ring(cx, cy, '#ffe14d', 150, 0.4)
    setMood('yum', 1)
    catStretch.kick(3)
    if (i === 0) {
      lineLv++
      mapPulse.value = 1
      fx.text(cx - 270, cy + 30, `${metres(lineMax())} m LINE!`, { size: 46, color: '#ffffff', life: 1.2, rise: 24 })
    } else if (i === 1) {
      hookLv++
      fx.text(cx - 250, cy + 30, `${cap()} HOOKS!`, { size: 46, color: '#ffffff', life: 1.2, rise: 24 })
    } else {
      palLv++
      palStretch.value = 1.4
      if (palLv === 1) {
        stage.tween(0.7, (t) => (palIn = t), ease.outBack)
        sfx.boing(4)
        fx.text(PAL_X + 90, PAL_Y - camY - 120, 'PELICAN PAL!', { size: 40, color: '#ffffff', life: 1.4, rise: 24 })
      } else {
        fx.text(cx - 250, cy + 30, `+${PAL[palLv]} COINS!`, { size: 46, color: '#ffffff', life: 1.2, rise: 24 })
      }
    }
  }

  // Where a trophy hangs, in world coordinates.
  const slotAt = (i: number): { x: number; y: number } => {
    const x = 278 + i * 58
    const t = (x - 250) / 640
    return { x, y: -388 + 2 * (1 - t) * t * 26 + 32 }
  }

  // --- update -----------------------------------------------------------------

  const steer = (dt: number): void => {
    for (const p of stage.pointers.values()) steerX = p.x
    if (stun > 0) {
      stun -= dt
      hook.vx = damp(hook.vx, 0, 6, dt)
      hook.x += Math.sin(stage.time * 70) * 3
      return
    }
    const tx = clamp(steerX, LX0 + 14, LX1 - 14)
    const want = damp(hook.x, tx, 12, dt)
    const step = clamp(want - hook.x, -2400 * dt, 2400 * dt)
    hook.vx = damp(hook.vx, step / Math.max(dt, 0.001), 14, dt)
    hook.x += step
  }

  const touches = (f: Fish, reach: number): boolean => {
    const fy = f.kind === 'kraken' ? f.y - 40 : f.y
    return dist(hook.x, hook.y, f.x, fy) < reach
  }

  const updateSink = (dt: number): void => {
    sinkV = damp(sinkV, Math.min(880, 540 + hook.y * 0.06), 3, dt)
    const prevY = hook.y
    hook.y += sinkV * dt
    steer(dt)
    bubbleAcc += dt
    if (bubbleAcc > 0.045) {
      bubbleAcc = 0
      addBubble(hook.x + rnd(-10, 10), hook.y - 24, rnd(3, 8), rnd(40, 120))
    }
    const mark = Math.floor(hook.y / 300)
    if (mark > lastMark) {
      lastMark = mark
      const f = 560 * 0.965 ** mark
      sfx.tone({ freq: f, to: f * 0.62, dur: 0.1, type: 'sine', vol: 0.12 })
      depthPunch.kick(2.5)
    }
    const band = bandOf(hook.y)
    if (band > deepestBand) {
      deepestBand = band
      fx.text(W / 2, 172, BAND_NAME[band]!, { size: 54, color: '#d6f6ff', life: 1.5, rise: 8 })
      fx.flash('#ffffff', 0.18, 0.25)
      sfx.ding(-3)
      sfx.ding(1)
    }
    for (const f of fish) {
      if (f.state !== 'swim') continue
      const dy = f.y - hook.y
      if (dy < -260 || dy > 260) continue
      // Forgiving on the way down: only a real bump counts, and the fish in
      // sight of the boat never do.
      if (f.homeY <= SHALLOWS) continue
      const reach = f.kind === 'kraken' ? f.r * 0.85 : f.kind === 'puffer' ? 24 * DRAW_SCALE * (1 + f.puff * 0.45) * 0.8 + 10 : f.r * 0.62 + 12
      if (!DEV.ghost && touches(f, reach)) {
        if (SPECIES[f.kind].hazard) {
          f.scare = 1
          f.flee = 2
          beginTurn('zap')
        } else {
          hookFish(f)
          if (f.kind !== 'kraken') beginTurn('bonk')
          else {
            setPhase('turn')
            turnT = 0
            turnY = hook.y
            turnDip = -10
            recordCheck()
          }
        }
        return
      }
      if (prevY <= f.y && hook.y > f.y && Math.abs(f.x - hook.x) < f.r + 80) {
        // A close shave: a note that climbs with every dodge.
        f.scare = 1
        fx.ring(f.x, f.y - camY, 'rgba(255,255,255,0.7)', f.r + 26, 0.25)
        sfx.note(Math.min(dodges, 12) - 3, 0.09, 'sine', 0.13)
        dodges++
      }
    }
    if (hook.y >= lineMax()) {
      hook.y = lineMax()
      beginTurn('bottom')
    }
  }

  const updateReel = (dt: number): void => {
    const full = caught.length >= cap() || krakenOn
    const want = full ? 1750 : Math.max(370, turnY / 7.5) * (stun > 0 ? 0.35 : 1)
    reelV = damp(reelV, want, full ? 3.5 : 5, dt)
    hook.y -= reelV * dt
    steer(dt)
    bubbleAcc += dt
    if (bubbleAcc > 0.09) {
      bubbleAcc = 0
      addBubble(hook.x + rnd(-14, 14), hook.y + 30, rnd(3, 7), rnd(10, 60))
    }
    reelAcc += dt * clamp(reelV / 370, 0.5, 2.2)
    if (reelAcc > 0.17) {
      // The reel clicking: soft, so it sits under the catches.
      reelAcc = 0
      sfx.tone({ freq: 880 + rnd(-40, 40), dur: 0.025, type: 'triangle', vol: 0.06 })
    }
    if (!full) {
      for (const f of fish) {
        if (f.state !== 'swim') continue
        const dy = f.y - hook.y
        if (dy < -260 || dy > 260) continue
        // Greedy on the way up: anything close is caught.
        if (!touches(f, f.kind === 'kraken' ? f.r : f.r * 0.9 + 42)) continue
        if (SPECIES[f.kind].hazard) {
          if (f.flee <= 0) zapUp(f)
        } else hookFish(f)
        if (caught.length >= cap() || krakenOn) break
      }
    }
    if (hook.y <= 0) surface()
  }

  const updateFish = (dt: number): void => {
    const live = phase === 'sink' || phase === 'reel' || phase === 'turn'
    for (const f of fish) {
      if (f.state !== 'swim') continue
      f.phase += dt
      f.scare = Math.max(0, f.scare - dt * 1.6)
      let v = f.speed
      if (f.flee > 0) {
        f.flee -= dt
        v = v * 2 + 160
      }
      if (f.kind === 'squid') {
        const burst = Math.max(0, Math.sin(f.phase * 2.2))
        v *= 0.12 + 1.6 * burst * burst
        f.y = f.homeY + Math.sin(f.phase * 1.1) * 16
      } else if (f.kind === 'jelly') {
        f.y = f.homeY + Math.sin(f.phase * 0.9) * 55
      } else if (f.kind !== 'chest' && f.kind !== 'kraken') {
        f.y = f.homeY + Math.sin(f.phase * 1.7) * 6
      }
      f.x += f.dir * v * dt
      const lead = f.x - f.ox
      if (lead > LX1 && f.dir > 0) f.dir = -1
      else if (lead < LX0 && f.dir < 0) f.dir = 1
      f.face = damp(f.face, f.dir, 9, dt)
      if (f.kind === 'puffer') f.puff = damp(f.puff, live && dist(hook.x, hook.y, f.x, f.y) < 250 ? 1 : 0, 7, dt)
    }
    // The catch hangs from the hook in a wriggling bunch.
    const n = caught.length
    for (let i = 0; i < n; i++) {
      const f = caught[i]!
      f.phase += dt
      const fan = (i - (n - 1) / 2) * Math.min(0.55, 2.4 / n) - clamp(hook.vx * 0.0006, -0.5, 0.5)
      const a = fan + Math.sin(stage.time * 16 + i * 1.9) * 0.12
      const d = f.kind === 'kraken' ? 215 : 24 + f.r * 0.95 + (i % 2) * 14
      f.x = damp(f.x, hook.x + Math.sin(a) * d, 22, dt)
      f.y = damp(f.y, hook.y + 14 + Math.cos(a) * d, 30, dt)
    }
  }

  const updatePayout = (dt: number): void => {
    payT += dt
    let left = 0
    for (const f of flying) {
      if (f.state !== 'fly') continue
      left++
      if (payT < f.launchAt) continue
      if (!f.launched) {
        f.launched = true
        if (left % 2 === 1) sfx.whoosh()
        fx.burst(f.x, -camY, { count: 6, color: ['#ffffff', '#c8f3ff'], speed: 320, angle: -Math.PI / 2, spread: 1.2, gravity: 1400, life: 0.5, size: 8 })
      }
      f.phase += dt
      f.vy += 1150 * dt
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.rot += f.spin * dt
      if (payT >= f.popAt) pay(f, 1)
    }
    if (left === 0 || flying.every((f) => f.state === 'dead')) finishPayout()
  }

  const updateCoins = (dt: number): void => {
    for (let i = flyCoins.length - 1; i >= 0; i--) {
      const c = flyCoins[i]!
      c.t += dt
      if (c.t < 0) continue
      if (c.t < 0.24) {
        c.vx *= 0.9 ** (dt * 60)
        c.vy = c.vy * 0.9 ** (dt * 60) + 500 * dt
        c.x += c.vx * dt
        c.y += c.vy * dt
        c.fromX = c.x
        c.fromY = c.y
        continue
      }
      const k = (c.t - 0.24) / 0.42
      if (k >= 1) {
        flyCoins.splice(i, 1)
        hudPunch.kick(2.2)
        if (stage.time - lastTickAt > 0.045) {
          lastTickAt = stage.time
          sfx.tick()
        }
        continue
      }
      const e = ease.inCubic(k)
      c.x = lerp(c.fromX, HUD_X, e)
      c.y = lerp(c.fromY, HUD_Y, e) - Math.sin(k * Math.PI) * 40
    }
  }

  const releasePal = (): void => {
    const amount = Math.floor(palBank)
    if (amount < 1) return
    palBank -= amount
    palStretch.value = 0.7
    const sx = PAL_X + 70
    const sy = PAL_Y - 80 - camY
    spawnCoins(sx, sy, amount)
    fx.text(sx + 10, sy - 30, `+${fmt(amount)}`, { size: 30, color: '#ffe14d', life: 0.8 })
    sfx.pop(3)
  }

  // --- drawing ----------------------------------------------------------------

  const glowCache = new Map<string, HTMLCanvasElement>()
  const glow = (g: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha = 1): void => {
    let img = glowCache.get(color)
    if (!img) {
      img = document.createElement('canvas')
      img.width = 128
      img.height = 128
      const c = img.getContext('2d')
      if (c) {
        const grad = c.createRadialGradient(64, 64, 0, 64, 64, 64)
        grad.addColorStop(0, `rgba(${color},0.95)`)
        grad.addColorStop(0.3, `rgba(${color},0.4)`)
        grad.addColorStop(1, `rgba(${color},0)`)
        c.fillStyle = grad
        c.fillRect(0, 0, 128, 128)
      }
      glowCache.set(color, img)
    }
    g.globalAlpha = alpha
    g.drawImage(img, x - size / 2, y - size / 2, size, size)
    g.globalAlpha = 1
  }

  const onScreen = (f: Fish): boolean => {
    const sy = f.y - camY
    const pad = f.r + 130
    return sy > -pad && sy < H + pad
  }

  const drawFish = (g: CanvasRenderingContext2D, f: Fish, sil?: string): void => {
    const t = stage.time + f.phase
    g.save()
    g.translate(f.x, f.y - camY)
    if (f.state === 'swim') {
      const hop = Math.sin(f.scare * Math.PI)
      g.translate(0, -hop * 8)
      const flip = f.face < 0 ? Math.min(f.face, -0.18) : Math.max(f.face, 0.18)
      const s = (1 + hop * 0.12) * (f.kind === 'kraken' ? 1 : DRAW_SCALE)
      g.scale(flip * s, s)
      const near = dist(hook.x, hook.y, f.x, f.y) < 420 && diving()
      drawCreature(g, f.kind, {
        t,
        sil,
        lookX: near ? clamp(((hook.x - f.x) * Math.sign(flip)) / 140, -1, 1) : 0.4,
        lookY: near ? clamp((hook.y - f.y) / 140, -1, 1) : 0,
        wow: f.scare,
        puff: f.puff,
        glow: f.glow,
      })
    } else if (f.state === 'hooked') {
      const wiggle = Math.sin(stage.time * 19 + f.phase * 3) * 0.22
      if (SPECIES[f.kind].faces) g.rotate(Math.atan2(hook.y + 6 - f.y, hook.x - f.x) + wiggle)
      else g.rotate(wiggle * 0.8)
      if (f.kind !== 'kraken') g.scale(DRAW_SCALE, DRAW_SCALE)
      drawCreature(g, f.kind, { t: t * 1.8, wow: 1, lookX: 0.2, lookY: -0.6, puff: 1, glow: f.glow })
    } else {
      g.rotate(f.rot)
      const s = f.kind === 'kraken' ? 1 : DRAW_SCALE * 1.25
      g.scale(s, s)
      drawCreature(g, f.kind, { t: t * 2, wow: 1, lookX: 0, lookY: 0, puff: 1, glow: f.glow })
    }
    g.restore()
  }

  const hookShape = (g: CanvasRenderingContext2D, color: string, width: number): void => {
    g.beginPath()
    g.moveTo(0, -14)
    g.lineTo(0, 9)
    g.arc(-10, 9, 10, 0, Math.PI)
    g.lineTo(-20, 0)
    g.strokeStyle = color
    g.lineWidth = width
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.stroke()
  }

  const drawHook = (g: CanvasRenderingContext2D, x: number, y: number, tilt: number, scale: number, worm: boolean): void => {
    g.save()
    g.translate(x, y)
    g.rotate(tilt)
    g.scale(scale, scale)
    const prongs = hookLv >= 4 ? 3 : hookLv >= 2 ? 2 : 1
    for (let i = prongs - 1; i >= 0; i--) {
      g.save()
      if (i === 1) g.scale(-1, 1)
      if (i === 2) g.scale(0.55, 1.08)
      hookShape(g, '#33415c', 9)
      hookShape(g, i === 0 ? '#eef3f8' : '#c3cedb', 5)
      g.restore()
    }
    circle(g, 0, -17, 5, 'rgba(0,0,0,0)', '#eef3f8', 3)
    if (worm) {
      // The worm, who did not ask for any of this.
      const wig = Math.sin(stage.time * 9) * 3
      g.beginPath()
      g.moveTo(-6, 18)
      g.quadraticCurveTo(-22 + wig, 14, -21, 0)
      g.quadraticCurveTo(-20 - wig, -10, -25 + wig, -16)
      g.strokeStyle = '#ff8fb1'
      g.lineWidth = 9
      g.stroke()
      circle(g, -25 + wig, -17, 7, '#ff8fb1')
      const scared = phase === 'sink' ? 1 : 0
      for (const side of [-1, 1]) {
        circle(g, -25 + wig + side * 3.2, -19, 2.8 + scared * 0.6, '#ffffff')
        circle(g, -25 + wig + side * 3.2, -18.4 + scared, 1.4, '#1e1428')
      }
    }
    g.restore()
  }

  const drawCoin = (g: CanvasRenderingContext2D, x: number, y: number, r: number): void => {
    circle(g, x, y, r, '#ffd23f', '#d98a00', Math.max(2, r * 0.18))
    circle(g, x - r * 0.12, y - r * 0.12, r * 0.55, '#ffe680')
  }

  const drawShop = (g: CanvasRenderingContext2D): void => {
    const t = stage.time
    for (let i = 0; i < 3; i++) {
      const r = btnRect(i)
      const price = btnPrice(i)
      const maxed = price === undefined
      const can = !maxed && coins >= price
      const cx = r.x + r.w / 2 + btnShake[i]!.value
      const cy = r.y - camY + r.h / 2 + (can ? Math.sin(t * 4 + i) * 3 : 0)
      const s = btnPop[i]!.value
      g.save()
      g.translate(cx, cy)
      g.scale(s, s)
      if (can) rrect(g, -r.w / 2 - 7, -r.h / 2 - 7, r.w + 14, r.h + 14, 24, `rgba(255,236,110,${0.6 + 0.35 * Math.sin(t * 6)})`)
      rrect(g, -r.w / 2, -r.h / 2, r.w, r.h, 18, can ? '#ffd58a' : '#e0b074', '#7a4a21', 5)
      rrect(g, -r.w / 2 + 8, -r.h / 2 + 8, r.w - 16, 10, 5, 'rgba(255,255,255,0.35)')
      // What it is.
      const ix = -r.w / 2 + 48
      circle(g, ix, 0, 36, 'rgba(255,255,255,0.45)')
      if (i === 0) {
        g.strokeStyle = '#33415c'
        g.lineWidth = 3
        g.setLineDash([5, 5])
        g.beginPath()
        g.moveTo(ix, -32)
        g.lineTo(ix, -6)
        g.stroke()
        g.setLineDash([])
        g.beginPath()
        g.moveTo(ix - 16, -2)
        g.lineTo(ix + 16, -2)
        g.lineTo(ix, 26)
        g.closePath()
        g.fillStyle = '#2f8fe0'
        g.fill()
        g.strokeStyle = '#1b4f8a'
        g.lineWidth = 3
        g.stroke()
      } else if (i === 1) {
        drawHook(g, ix - 5, -2, -0.2, 1.05, false)
        drawHook(g, ix + 19, 4, 0.2, 0.85, false)
      } else {
        drawPelican(g, ix - 14, 28, t, 0.5, 1, 0.5)
      }
      if (maxed) {
        label(g, 'MAX', 34, 0, 34, '#fff3b0')
      } else {
        label(g, btnLabel(i), 36, -19, 32, '#ffffff', '#5a3516')
        drawCoin(g, 8, 22, 13)
        label(g, fmt(price), 27, 23, 28, can ? '#fff3b0' : '#ffe0cf', '#5a3516', 'left')
        if (!can) rrect(g, -r.w / 2, -r.h / 2, r.w, r.h, 18, 'rgba(70,40,15,0.3)')
      }
      g.restore()
    }
  }

  const drawBoard = (g: CanvasRenderingContext2D): void => {
    g.beginPath()
    g.moveTo(250, -388 - camY)
    g.quadraticCurveTo(570, -336 - camY, 890, -388 - camY)
    g.strokeStyle = '#8a5a2b'
    g.lineWidth = 5
    g.stroke()
    COLLECTION.forEach((kind, i) => {
      const at = slotAt(i)
      const sy = at.y - camY
      const has = seen[kind] === true
      const s = slotPop[i]!.value
      g.save()
      g.translate(at.x, sy)
      g.scale(s, s)
      circle(g, 0, 0, 25, has ? '#fff8e1' : 'rgba(24,70,130,0.4)', has ? RARITY[kind] : 'rgba(255,255,255,0.65)', has ? 5 : 4)
      const k = kind === 'kraken' ? 0.11 : 21 / Math.max(SPECIES[kind].r, 33)
      g.translate(0, kind === 'kraken' ? 4 : kind === 'squid' ? 2 : 0)
      g.scale(k, k)
      drawCreature(g, kind, { t: has ? stage.time : 0, sil: has ? undefined : 'rgba(10,40,90,0.7)', lookX: 0.4, lookY: 0 })
      g.restore()
    })
  }

  const mapY = (d: number): number => MAP_Y0 + (clamp(d, 0, FLOOR) / FLOOR) * (MAP_Y1 - MAP_Y0)

  const drawMap = (g: CanvasRenderingContext2D): void => {
    rrect(g, 18, MAP_Y0 - 12, 90, MAP_Y1 - MAP_Y0 + 24, 20, 'rgba(8,24,60,0.62)')
    for (let b = 0; b < 5; b++) {
      const y0 = mapY(BAND_TOP[b]!)
      const y1 = mapY(b < 4 ? BAND_TOP[b + 1]! : FLOOR)
      g.fillStyle = BAND_COLOR[b]!
      g.fillRect(30, y0, 16, y1 - y0 + 0.5)
      // Who lives here: a shadow until one has been caught.
      const kind = BAND_STAR[b]!
      const has = seen[kind] === true
      const k = kind === 'kraken' ? 0.15 : 21 / SPECIES[kind].r
      g.save()
      g.translate(76, (y0 + y1) / 2 + (kind === 'kraken' ? 4 : 0))
      g.scale(k, k)
      drawCreature(g, kind, { t: has ? stage.time : 0, sil: has ? undefined : 'rgba(190,225,255,0.5)', lookX: 0.4, lookY: 0 })
      g.restore()
    }
    const reach = mapY(lineMax())
    g.fillStyle = 'rgba(4,8,28,0.6)'
    g.fillRect(30, reach, 16, MAP_Y1 - reach)
    g.strokeStyle = '#ffffff'
    g.lineWidth = 3
    g.strokeRect(30, MAP_Y0, 16, MAP_Y1 - MAP_Y0)
    // The end of the line, and the deepest it has been.
    const pulse = mapPulse.value
    rrect(g, 24 - pulse * 6, reach - 3 - pulse * 3, 28 + pulse * 12, 6 + pulse * 6, 3, '#ffffff')
    if (record > 0) {
      const ry = mapY(record)
      g.beginPath()
      g.moveTo(16, ry - 7)
      g.lineTo(28, ry)
      g.lineTo(16, ry + 7)
      g.closePath()
      g.fillStyle = '#ffe14d'
      g.fill()
    }
    if (phase === 'sink' || phase === 'turn' || phase === 'reel') circle(g, 38, mapY(hook.y), 8, '#ffffff', '#ff5d5d', 4)
  }

  const drawHud = (g: CanvasRenderingContext2D): void => {
    rrect(g, 16, 16, 214, 68, 34, 'rgba(8,24,60,0.38)')
    drawCoin(g, HUD_X, HUD_Y, 24 * Math.min(1.3, hudPunch.value))
    let inFlight = 0
    for (const c of flyCoins) inFlight += c.amount
    label(g, fmt(Math.max(0, coins - inFlight)), 88, HUD_Y + 2, 40 * clamp(hudPunch.value, 0.7, 1.35), '#fff3b0', 'rgba(30,20,40,0.85)', 'left')
    drawMap(g)
    if (phase === 'sink' || phase === 'turn' || phase === 'reel') {
      label(g, `${metres(Math.max(0, hook.y))} m`, W / 2, 56, 54 * clamp(depthPunch.value, 0.8, 1.4))
      const n = cap()
      const step = Math.min(30, 300 / n)
      for (let i = 0; i < n; i++) {
        const filled = i < caught.length
        circle(g, W / 2 + (i - (n - 1) / 2) * step, 108, filled ? 11 : 9, filled ? '#ffd23f' : 'rgba(255,255,255,0.22)', '#ffffff', 3)
      }
    }
  }

  const dragHint = (g: CanvasRenderingContext2D, x: number, y: number): void => {
    const t = stage.time
    const cx = clamp(x, 330, W - 330)
    g.globalAlpha = 0.85
    g.strokeStyle = '#ffffff'
    g.lineWidth = 7
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(cx - 170, y)
    g.lineTo(cx + 170, y)
    for (const side of [-1, 1]) {
      g.moveTo(cx + side * 150, y - 20)
      g.lineTo(cx + side * 172, y)
      g.lineTo(cx + side * 150, y + 20)
    }
    g.stroke()
    g.globalAlpha = 1
    sprite(g, '👆', cx + Math.sin(t * 3.2) * 140, y + 44, 70)
  }

  return {
    update(dt) {
      const t = stage.time
      if (t > catMoodUntil && phase === 'idle') catMood = 'happy'

      if (phase === 'idle') {
        const tip = rodTip(BOAT_X, boatY(), catPose())
        hook.x = damp(hook.x, tip.x + Math.sin(t * 1.3) * 7, 9, dt)
        hook.y = damp(hook.y, tip.y + 86, 9, dt)
        hook.vx = 0
        lapAcc += dt
        if (lapAcc > 2.6) {
          lapAcc = 0
          sfx.noise({ dur: 0.7, freq: 420, to: 900, vol: 0.035, filter: 'bandpass', q: 0.6 })
        }
        palTimer += dt
        if (palTimer >= 2) {
          palTimer = 0
          releasePal()
        }
      } else if (phase === 'cast') {
        castT = Math.min(1, castT + dt / 0.4)
        for (const p of stage.pointers.values()) steerX = p.x
        hook.x = lerp(castFromX, castToX, ease.outQuad(castT))
        hook.y = lerp(castFromY, 0, castT * castT) - Math.sin(castT * Math.PI) * 150
        hook.vx = (castToX - castFromX) * 0.6
        if (castT >= 1) {
          setPhase('sink')
          sinkV = 380
          hook.y = 0
          camOff = SURFACE
          splash(hook.x, 0.35)
          // The fish by the boat bolt from the splash, so the dive starts clear.
          for (const f of fish) {
            if (f.state !== 'swim' || f.homeY > SHALLOWS) continue
            f.scare = 1
            f.flee = 0.9
            if (Math.abs(f.x - hook.x) < 380) f.dir = f.x - f.ox < hook.x ? -1 : 1
          }
          sfx.splat()
          fx.shake(3)
        }
      } else if (phase === 'sink') {
        updateSink(dt)
      } else if (phase === 'turn') {
        turnT = Math.min(1, turnT + dt / 0.4)
        hook.y = turnY + Math.sin(turnT * Math.PI) * turnDip
        steer(dt)
        if (turnT >= 1) {
          setPhase('reel')
          reelV = 0
          hook.y = turnY
        }
      } else if (phase === 'reel') {
        updateReel(dt)
      } else {
        updatePayout(dt)
      }

      updateFish(dt)
      updateCoins(dt)
      haulShown = haul - haulShown < 1 ? haul : damp(haulShown, haul, 14, dt)
      palBank += (PAL[palLv]! * dt) / 2

      ambientAcc += dt
      if (ambientAcc > 0.35) {
        ambientAcc = 0
        addBubble(rnd(LX0, LX1), Math.max(60, camY + H + 20), rnd(3, 10), rnd(70, 150))
      }
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]!
        b.life -= dt
        b.y -= b.vy * dt
        b.wob += dt * 5
        if (b.life <= 0 || b.y < 4) bubbles.splice(i, 1)
      }

      rod.target = phase === 'reel' ? 0.3 : 0
      rod.update(dt)
      catStretch.update(dt)
      palStretch.update(dt)
      hudPunch.update(dt)
      depthPunch.update(dt)
      mapPulse.update(dt)
      for (const s of btnPop) s.update(dt)
      for (const s of btnShake) s.update(dt)
      for (const s of slotPop) s.update(dt)

      // Look ahead: below the hook on the way down, above it on the way up.
      const prevCam = camY
      if (phase === 'sink' || phase === 'turn' || phase === 'reel') {
        camOff = damp(camOff, phase === 'sink' ? 250 : krakenOn ? 300 : 545, phase === 'sink' ? 2.4 : 2.8, dt)
        camY = clamp(hook.y - camOff, -SURFACE, FLOOR + 50 - H)
      } else {
        camY = damp(camY, -SURFACE, 12, dt)
        if (camY < -SURFACE + 0.5) camY = -SURFACE
      }
      camSpeed = (camY - prevCam) / Math.max(dt, 0.001)
    },

    draw(g) {
      const t = stage.time
      const pose = catPose()
      const by = boatY() - camY
      const surfaceVisible = camY < 60

      drawSky(g, camY, t)
      if (surfaceVisible) {
        drawWaterBack(g, camY, t)
        drawPost(g, 1058, -400 - camY, 480)
        drawPost(g, PAL_X, PAL_Y - camY, 200)
        if (palIn > 0) {
          const drop = (1 - palIn) * -460
          drawPelican(g, PAL_X - (1 - palIn) * 260, PAL_Y - 4 - camY + drop, t, clamp(palBank / Math.max(1, PAL[palLv]! * 6), 0, 1), palStretch.value * (1 + Math.sin(t * 2.4) * 0.02))
        }
        drawBoat(g, BOAT_X, by, pose)
      }
      drawWater(g, camY, t, camSpeed)
      drawFar(g, camY, t)

      // Depth marks every ten metres, and the end of the line.
      g.lineWidth = 2
      for (let d = Math.max(300, Math.ceil(camY / 300) * 300); d < camY + H && d < FLOOR; d += 300) {
        const sy = d - camY
        g.strokeStyle = 'rgba(255,255,255,0.13)'
        g.beginPath()
        g.moveTo(LX0 - 30, sy)
        g.lineTo(LX1 + 30, sy)
        g.stroke()
        label(g, `${metres(d)} m`, LX1 + 22, sy - 14, 20, 'rgba(255,255,255,0.6)', null, 'right')
      }
      const endY = lineMax() + 46 - camY
      if (endY < H && lineLv < LINE.length - 1) {
        g.fillStyle = 'rgba(4,10,40,0.3)'
        g.fillRect(0, Math.max(0, endY), W, H)
        g.strokeStyle = 'rgba(255,255,255,0.7)'
        g.lineWidth = 4
        g.setLineDash([16, 14])
        g.beginPath()
        g.moveTo(LX0 - 40, endY)
        g.lineTo(LX1 + 40, endY)
        g.stroke()
        g.setLineDash([])
      }
      if (record > 0 && record < lineMax() - 30) {
        const ry = record - camY
        if (ry > 0 && ry < H) {
          g.strokeStyle = 'rgba(255,225,77,0.6)'
          g.lineWidth = 3
          g.setLineDash([6, 12])
          g.beginPath()
          g.moveTo(LX0 - 30, ry)
          g.lineTo(LX1 + 30, ry)
          g.stroke()
          g.setLineDash([])
        }
      }

      // Creatures beyond the end of the line are only shadows: next time.
      const limit = lineMax() + 60
      for (const f of fish) {
        if (f.state !== 'swim' || !onScreen(f)) continue
        drawFish(g, f, f.y > limit && f.kind !== 'kraken' ? rgb(depthRGB(f.y), 0.58) : f.y > limit ? rgb(depthRGB(f.y), 1.9, 12) : undefined)
      }

      drawWalls(g, camY, t, decor)

      // What the fish mean right now: trouble on the way down, coins on the
      // way up. Only the ones in the hook's path say so.
      if (phase === 'sink' || phase === 'reel') {
        const down = phase === 'sink'
        const full = caught.length >= cap() || krakenOn
        for (const f of fish) {
          if (f.state !== 'swim' || f.kind === 'kraken' || f.y > limit) continue
          const ahead = down ? f.y - hook.y : hook.y - f.y
          if (ahead < 40 || ahead > 460) continue
          const sy = f.y - camY - f.r - 22
          const hazard = SPECIES[f.kind].hazard
          if (down || hazard) {
            if (f.homeY <= SHALLOWS || Math.abs(f.x - hook.x) > f.r + 46) continue
            const beat = 1 + Math.sin(t * 16) * 0.12
            circle(g, f.x, sy, 17 * beat, '#ff4d5e', '#ffffff', 4)
            label(g, '!', f.x, sy + 1, 26 * beat, '#ffffff', null)
          } else if (!full && Math.abs(f.x - hook.x) < 230) {
            const text = fmt(f.value)
            const wide = 30 + text.length * 12
            rrect(g, f.x - wide / 2, sy - 13, wide, 26, 13, 'rgba(8,24,60,0.45)')
            drawCoin(g, f.x - wide / 2 + 13, sy, 8)
            label(g, text, f.x - wide / 2 + 25, sy + 1, 19, '#fff3b0', null, 'left')
          }
        }
      }

      // Line, hook and whatever is hanging from it.
      const tip = rodTip(BOAT_X, by, pose)
      const hx = hook.x
      const hy = hook.y - camY
      if (phase !== 'payout') {
        g.beginPath()
        g.moveTo(tip.x, tip.y)
        g.quadraticCurveTo(lerp(tip.x, hx, 0.55) - hook.vx * 0.05, lerp(tip.y, hy, 0.6) + (phase === 'idle' ? 10 : 0), hx, hy - 26)
        g.strokeStyle = 'rgba(255,255,255,0.85)'
        g.lineWidth = 2.5
        g.stroke()
        for (const f of caught) drawFish(g, f)
        if (phase === 'reel' && caught.length < cap() && !krakenOn && stun <= 0) {
          // On the way up the hook is hungry: this is how far it reaches.
          const beat = 0.5 + 0.5 * Math.sin(t * 9)
          g.globalAlpha = 0.35 + beat * 0.25
          circle(g, hx, hy, 58 + beat * 6, 'rgba(255,225,77,0.16)', '#ffe14d', 4)
          g.globalAlpha = 1
        }
        drawHook(g, hx, hy, clamp(-hook.vx * 0.0005, -0.5, 0.5) + (stun > 0 ? Math.sin(t * 60) * 0.3 : 0), 1.5 + hookLv * 0.05, true)
      }

      g.lineWidth = 2
      for (const b of bubbles) {
        const sy = b.y - camY
        if (sy < -20 || sy > H + 20) continue
        const bx = b.x + Math.sin(b.wob) * 4
        g.globalAlpha = clamp(b.life * 2, 0, 0.7)
        circle(g, bx, sy, b.r, 'rgba(255,255,255,0.18)', '#ffffff', 2)
      }
      g.globalAlpha = 1

      // The deep is dark, except around the hook and whatever glows.
      const dark = clamp((camY + H / 2 - 4300) / 1500, 0, 0.8)
      if (dark > 0) {
        const grad = g.createRadialGradient(hx, hy, 110, hx, hy, 520)
        grad.addColorStop(0, 'rgba(2,4,18,0)')
        grad.addColorStop(1, `rgba(2,4,18,${dark})`)
        g.fillStyle = grad
        g.fillRect(0, 0, W, H)
      }
      if (camY + H > 3000) {
        drawCrystals(g, camY, t, decor)
        g.globalCompositeOperation = 'lighter'
        if (dark > 0 && phase !== 'payout') glow(g, hx, hy, 340, '255,240,190', dark * 0.45)
        for (const f of fish) {
          if (f.state === 'dead' || f.state === 'fly' || !onScreen(f)) continue
          const sy = f.y - camY
          if (f.kind === 'angler' && f.state === 'swim') {
            const flip = f.face < 0 ? Math.min(f.face, -0.18) : Math.max(f.face, 0.18)
            glow(g, f.x + ANGLER_LURE.x * flip * DRAW_SCALE, sy + ANGLER_LURE.y * DRAW_SCALE, 130 + Math.sin(t * 4 + f.phase) * 16, '255,244,150')
          } else if (f.kind === 'jelly' && f.glow) {
            glow(g, f.x, sy, 150, '110,240,255', 0.55)
          } else if (f.kind === 'chest') {
            glow(g, f.x, sy - 10, 150, '255,215,80', 0.6)
          } else if (f.kind === 'kraken' && f.state === 'swim') {
            for (const side of [-1, 1]) glow(g, f.x + side * KRAKEN_EYES.gap, sy + KRAKEN_EYES.y, 90, '255,230,120', 0.5)
          } else if (f.kind === 'goldie') {
            glow(g, f.x, sy, 130, '255,215,80', 0.5)
          }
        }
        g.globalCompositeOperation = 'source-over'
      }

      if (surfaceVisible) {
        drawSurfaceLine(g, camY, t)
        drawBoard(g)
        drawShop(g)
      }
      if (phase === 'payout' && payT < 0.75) {
        // The spout that throws the catch into the air.
        const k = payT / 0.75
        const rise = Math.sin(Math.min(1, k * 1.5) * Math.PI * 0.5) * (1 - k * k) * (170 + Math.min(flying.length, 8) * 22)
        const wide = 46 * (1 - k * 0.5)
        const sy = -camY + 6
        for (const [w, col] of [[1, 'rgba(255,255,255,0.9)'], [0.55, 'rgba(170,232,250,0.95)']] as const) {
          g.beginPath()
          g.moveTo(hx - wide * w, sy)
          g.quadraticCurveTo(hx - wide * w * 0.4, sy - rise * 0.7, hx, sy - rise * (w === 1 ? 1 : 0.86))
          g.quadraticCurveTo(hx + wide * w * 0.4, sy - rise * 0.7, hx + wide * w, sy)
          g.closePath()
          g.fillStyle = col
          g.fill()
        }
      }
      let tapHere: Fish | null = null
      for (const f of flying) {
        if (f.state !== 'fly' || !f.launched) continue
        drawFish(g, f)
        tapHere = f
      }
      if (tapHere && doubles < 2) sprite(g, '👆', tapHere.x + 34, tapHere.y - camY + 58 + Math.sin(t * 14) * 6, 58)
      if (t < haulUntil && haulShown > 0) {
        const fade = clamp((haulUntil - t) / 0.3, 0, 1)
        g.globalAlpha = fade
        const size = 58 + Math.min(30, Math.log2(haulShown + 1) * 3)
        const total = fmt(Math.ceil(haulShown))
        drawCoin(g, W / 2 - 74 - total.length * size * 0.16, 508, size * 0.42)
        label(g, `+${total}`, W / 2 + 10, 510, size, '#ffe14d')
        g.globalAlpha = 1
      }

      drawHud(g)
      for (const c of flyCoins) if (c.t >= 0) drawCoin(g, c.x, c.y, 11)

      // Idle hints: what to buy, else where to cast; and how to steer.
      const quiet = t - lastTouchAt
      const i0 = affordable()
      if (phase === 'idle' && quiet > (casts === 0 ? 3 : bought === 0 && i0 >= 0 ? 1.2 : 5)) {
        const i = i0
        if (i >= 0) {
          const r = btnRect(i)
          hint(g, r.x + r.w / 2, r.y - camY + r.h / 2, t, 58)
        } else {
          hint(g, 660, 590, t, 72)
        }
      }
      if ((phase === 'sink' || phase === 'reel') && stage.pointers.size === 0 && steers < 4 && steered < 900 && t - phaseAt > 0.35) dragHint(g, hx, clamp(hy + 170, 300, H - 140))
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      const wy = p.y + camY
      if (phase === 'payout' && popNear(p)) return
      if (phase === 'idle' || phase === 'payout') {
        for (let i = 0; i < 3; i++) {
          const r = btnRect(i)
          if (inRect(p.x, wy, r.x - 10, r.y - 6, r.w + 40, r.h + 12)) {
            buy(i)
            return
          }
        }
      }
      if (phase === 'payout') {
        fx.ring(p.x, p.y, '#ffffff', 46, 0.25)
        sfx.tick()
        return
      }
      if (phase === 'idle') {
        for (let i = 0; i < COLLECTION.length; i++) {
          const at = slotAt(i)
          if (dist(p.x, wy, at.x, at.y) < 30) {
            slotPop[i]!.value = 1.5
            sfx.pop(i)
            const kind = COLLECTION[i]!
            fx.text(at.x, at.y - camY + 64, seen[kind] ? SPECIES[kind].name : '???', { size: 28, rise: -10, life: 0.9 })
            return
          }
        }
        if (palIn > 0.9 && dist(p.x, wy, PAL_X + 20, PAL_Y - 50) < 75) {
          palStretch.value = 0.6
          sfx.boing(5)
          fx.burst(p.x, p.y, { count: 6, color: '#ffffff', shape: 'heart', speed: 200, life: 0.6, gravity: -100 })
          releasePal()
          return
        }
        fx.ring(p.x, p.y, '#ffffff', 56, 0.3)
        cast(p)
        return
      }
      // Diving: the finger is the rudder.
      steerX = p.x
      steers++
      fx.ring(p.x, p.y, 'rgba(255,255,255,0.7)', 44, 0.25)
      sfx.tone({ freq: 380 + rnd(0, 80), to: 620, dur: 0.06, type: 'sine', vol: 0.1 })
      for (let i = 0; i < 4; i++) addBubble(hook.x + rnd(-14, 14), hook.y + rnd(-10, 10))
    },

    move(p: Pointer) {
      if (phase === 'payout') popNear(p)
      else if (diving()) {
        steerX = p.x
        steered += Math.abs(p.dx)
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'deep-sea-fishing',
    name: 'Deep Sea Fishing',
    emoji: '🎣',
    ages: [6, 10],
    pitch: 'Cast a line, dodge the fish on the way down, scoop them up on the way back, and spend the coins on a deeper dive.',
    howTo: 'Tap to cast. Slide to steer: miss the fish going down, grab them coming up. Tap the flying catch for double.',
    basedOn: 'Tiny Fishing, Ridiculous Fishing',
    whyFun: 'A tense dodge down and a greedy grab up, a coin fountain at the top, and a stranger sea every upgrade.',
  },
  create,
}
