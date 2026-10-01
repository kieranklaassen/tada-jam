// Rocket Penguin: pull back, let go, and a penguin leaves a cannon. Hold to
// burn the rocket, land on seals and trampolines to keep going, face-plant in
// the snow, spend the coins, go further. Borrowed from Learn to Fly, Burrito
// Bison and Kitten Cannon.
//
// World coordinates: x to the right in pixels (10 to a metre), y is altitude
// (up is positive, the snow is 0). The camera follows and zooms out with
// height and speed.

import { blinkAt, circle, ellipse, eyes, hint, label, line, rrect, shadow, sprite, star } from '../../kit/draw.ts'
import { TAU, clamp, damp, ease, lerp, remap, spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { ALT_CLOUDS, ALT_HIGH, ALT_MOON, ALT_SPACE, CHUNK, GROUND, PX, REACH, altFrac, genChunk, hash } from './world.ts'
import type { Item } from './world.ts'

const G = 1100
// Screen y of the snow line while the camera is on the ground.
const BASE = H - 190
// Screen x the camera pins the world to.
const ANCHOR_X = W * 0.3
const CANNON_X = 0
const CANNON_Y = 198
const AIM_CAM_X = 110
const MOON_R = 520
const DRAG = 0.00016
const OUTLINE = 'rgba(30,20,40,0.85)'
const DIST_MARKS = [100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000]

type Phase = 'aim' | 'fly' | 'slide' | 'stuck' | 'rewind'
type PMood = 'happy' | 'wow' | 'dizzy' | 'yum'

interface Part {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  grav: number
  grow: number
}

interface PuffOptions {
  color: string | readonly string[]
  speed?: number
  life?: number
  size?: number
  grav?: number
  grow?: number
  // Direction in world terms: 0 is right, PI/2 is up.
  angle?: number
  spread?: number
  vx?: number
  vy?: number
}

interface PenguinLook {
  stretch: number
  mood: PMood
  lookX: number
  lookY: number
  blink: number
  flame: number
  flap: number
  wag: number
  stream: number
  // The friends by the ramp: another scarf, and no wings or rocket.
  scarf?: string
  plain?: boolean
}

const SHOP = [
  { key: 'cannon', icon: '💥', color: '#ff6b6b', word: 'POWER UP!' },
  { key: 'wings', icon: '🪁', color: '#4dabf7', word: 'WINGS UP!' },
  { key: 'fuel', icon: '🚀', color: '#ffa94d', word: 'FUEL UP!' },
] as const

const BARREL = ['#e03131', '#f76707', '#7048e8', '#f59f00', '#0ca678']
const WING = ['#4dabf7', '#38d9a9', '#ffd43b', '#ff8787', '#da77f2']

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const seed = Math.floor(stage.rand() * 100000)

  const levels = { cannon: 0, wings: 0, fuel: 0 }
  let coins = 0
  let shownCoins = 0
  let best = 0
  let runs = 0
  let bought = false
  const reached = new Set<string>()

  let phase: Phase = 'aim'
  const p = { x: CANNON_X, y: CANNON_Y, vx: 0, vy: 0, rot: 0, spin: 0, tumble: 0 }
  const stretch = spring(1, 240, 11)
  let fuel = 0
  let boostId = -1
  let boosting = false
  let everBoosted = false
  let everFlapped = false
  let emptyAt = 0
  let flap = 0
  // Flaps since the last bounce: each one is weaker than the one before.
  let flaps = 0
  let combo = 0
  let coinStreak = 0
  let lastCoinAt = -10
  let passedBest = false
  let flightAt = 0
  let maxAlt = 0
  let lastTouchAt = 0
  let lookX = 0.4
  let lookY = -0.2

  // Aiming.
  let aimId = -1
  let shopId = -1
  let aimAngle = 0.8
  let aimPower = 0
  let aimStep = 0
  let aimSX = 0
  let aimSY = 0
  let aimCX = 0
  let aimCY = 0
  // The idle hint: a ghost hand that pulls the cannon back, 0..1.
  let ghost = 0
  const recoil = spring(0, 170, 9)
  const cannonPop = spring(1, 260, 10)
  const peek = spring(0, 200, 9)
  const friendHop = [spring(0, 160, 8), spring(0, 160, 8)]

  // Landing, tally, rewind.
  let stuckAt = 0
  let lastM = 0
  let bonus = 0
  let newBest = false
  let rewindT = 0
  let rewindFromX = 0
  let rewindFromZoom = 1
  let shopShownAt = -10
  const btnSpring = [spring(1, 300, 11), spring(1, 300, 11), spring(1, 300, 11)]
  const flying: { icon: string; x0: number; y0: number; t: number; i: number }[] = []

  // Camera.
  let camX = AIM_CAM_X
  let camAlt = 0
  let zoom = 1
  let pyScreen = 330

  // Timers for repeating cues.
  let windAt = 0
  let rumbleAt = 0
  let skidAt = 0
  let trailAt = 0
  let moonHitAt = -10
  let bannerAt = -10
  let lastSayAt = -10
  let saySlot = 0
  let pendingBanner: string | null = null

  const chunks = new Map<number, Item[]>()
  const chunk = (ci: number): Item[] => {
    let items = chunks.get(ci)
    if (!items) {
      items = genChunk(ci, seed)
      chunks.set(ci, items)
    }
    return items
  }

  const parts: Part[] = []
  const streaks = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: Math.random() * H, len: 0.5 + Math.random() }))
  const stars = Array.from({ length: 80 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.4, tw: Math.random() * TAU }))

  const vmax = () => 1150 + levels.cannon * 250
  const maxFuel = () => 1 + levels.fuel * 0.22
  const thrust = () => 1350 + levels.fuel * 30
  const glide = () => 0.08 + 0.62 * (1 - 0.88 ** levels.wings)
  const price = (lvl: number) => Math.round((10 * 1.35 ** lvl) / 5) * 5
  const barrelLen = () => 168 + Math.min(levels.cannon, 12) * 9
  const barrelWid = () => 100 + Math.min(levels.cannon, 12) * 3
  fuel = maxFuel()

  const sxw = (wx: number) => (wx - camX) * zoom + ANCHOR_X
  const syw = (wy: number) => BASE - (wy - camAlt) * zoom
  const zs = () => zoom ** 0.6

  const puff = (x: number, y: number, count: number, o: PuffOptions) => {
    const speed = o.speed ?? 200
    for (let i = 0; i < count; i++) {
      if (parts.length > 320) parts.shift()
      const a = (o.angle ?? 0) + (Math.random() - 0.5) * (o.spread ?? TAU)
      const v = speed * (0.35 + Math.random() * 0.65)
      const life = (o.life ?? 0.6) * (0.6 + Math.random() * 0.4)
      parts.push({
        x,
        y,
        vx: Math.cos(a) * v + (o.vx ?? 0),
        vy: Math.sin(a) * v + (o.vy ?? 0),
        life,
        max: life,
        size: (o.size ?? 10) * (0.6 + Math.random() * 0.8),
        color: typeof o.color === 'string' ? o.color : o.color[Math.floor(Math.random() * o.color.length)]!,
        grav: o.grav ?? 0,
        grow: o.grow ?? 0,
      })
    }
  }

  // Floating words sit in screen space, kept inside the field.
  // Words that arrive together step down the screen instead of piling up.
  const say = (wx: number, wy: number, text: string, size = 46, color = '#ffffff') => {
    saySlot = stage.time - lastSayAt < 0.6 ? (saySlot + 1) % 3 : 0
    lastSayAt = stage.time
    fx.text(clamp(sxw(wx), 140, W - 180), clamp(syw(wy) - 70, 230, H - 220) + saySlot * 52, text, { size, color })
  }

  // One banner at a time: a second one waits its turn.
  const banner = (text: string) => {
    if (stage.time - bannerAt < 1.3) {
      pendingBanner = text
      return
    }
    bannerAt = stage.time
    // Below the middle, clear of the penguin (which rides high) and the distance.
    fx.text(W / 2, 480, text, { size: 84, color: '#ffe066', life: 1.4, rise: 50 })
    fx.confetti(W / 2, 500, 80)
    fx.flash('#ffffff', 0.25, 0.2)
    // The first two distance marks come fast, so they get the short cheer.
    if (text === '100 m!' || text === '250 m!') sfx.win()
    else sfx.fanfare()
  }

  const gainCoins = (n: number) => {
    coins += n
  }

  // ---- launch -------------------------------------------------------------

  const readAim = (ptr: Pointer) => {
    const dx = aimSX - ptr.x
    const dy = ptr.y - aimSY
    const len = Math.hypot(dx, dy)
    aimCX = ptr.x
    aimCY = ptr.y
    aimPower = clamp(len / 290, 0, 1)
    if (len < 10) return
    // Pulling back (down and left) and pointing (up and right) both work.
    let ang = Math.atan2(dy, dx)
    if (ang < -0.6 || ang > 2.2) ang = Math.atan2(-dy, -dx)
    aimAngle = clamp(ang, 0.2, 1.36)
    const step = Math.floor(aimPower * 12)
    if (step !== aimStep) {
      aimStep = step
      sfx.tone({ freq: 170 + step * 42, dur: 0.06, type: 'triangle', vol: 0.13 })
    }
  }

  const fire = () => {
    const pw = lerp(0.42, 1, aimPower)
    const v = vmax() * pw
    const len = barrelLen()
    const ca = Math.cos(aimAngle)
    const sa = Math.sin(aimAngle)
    p.x = CANNON_X + ca * len
    p.y = CANNON_Y + sa * len
    p.vx = ca * v
    p.vy = sa * v
    p.rot = Math.PI / 2 - aimAngle
    p.tumble = 0
    phase = 'fly'
    flightAt = stage.time
    combo = 0
    flaps = 0
    coinStreak = 0
    passedBest = false
    boostId = -1
    boosting = false
    maxAlt = 0
    stretch.value = 1.35
    recoil.value = 1
    peek.value = 0
    peek.vel = 0
    for (const f of friendHop) f.kick(520 + Math.random() * 240)
    puff(p.x, p.y, 16, { color: ['#ffffff', '#dee2e6', '#adb5bd'], speed: 260, life: 0.9, size: 26, grow: 1.4, vx: ca * 160, vy: sa * 160 })
    fx.burst(sxw(p.x), syw(p.y), { count: 14, color: ['#ffe066', '#ff922b'], speed: 620, life: 0.45, size: 12, shape: 'star', angle: -aimAngle, spread: 1.2, gravity: 200 })
    fx.text(sxw(p.x) + 40, syw(p.y) - 60, aimPower > 0.85 ? 'KABOOM!' : 'BOOM!', { size: 50 + aimPower * 26, color: '#ffe066' })
    fx.ring(sxw(p.x), syw(p.y), '#ffe066', 150 + aimPower * 80, 0.35)
    fx.shake(7 + aimPower * 12, 0.35)
    fx.flash('#ffffff', 0.3, 0.12)
    fx.hitstop(60)
    sfx.thud(2)
    sfx.noise({ dur: 0.4, freq: 900, to: 110, vol: 0.4, filter: 'lowpass' })
    sfx.tone({ freq: 170, to: 40, dur: 0.35, type: 'sawtooth', vol: 0.16 })
    sfx.whoosh()
    stage.after(0.08, () => sfx.slideUp())
  }

  // ---- things the penguin touches ------------------------------------------

  const launchUp = (it: Item, vy: number, keep: number, addVx: number, floor: number) => {
    it.hitAt = stage.time
    p.y = Math.max(p.y, 12)
    p.vy = vy
    p.vx = Math.max(p.vx * keep + addVx, floor)
    p.tumble = 0.45
    p.spin = 10 + Math.random() * 6
    stretch.value = 0.62
    stretch.kick(5)
    phase = 'fly'
    combo++
    flaps = 0
    sfx.boing(Math.min(combo - 1, 11))
    if (combo >= 2) {
      gainCoins(Math.min(combo, 5))
      stage.after(0.12, () => say(p.x, p.y + 60, `x${combo}!`, 40 + Math.min(combo, 6) * 6, '#ffe066'))
    }
  }

  const hitGround = (it: Item) => {
    const vyIn = Math.abs(p.vy)
    const big = vyIn > 1500
    switch (it.kind) {
      case 'seal':
        launchUp(it, Math.min(2400, Math.max(vyIn * 0.7, 450) + 150), 0.9, 0, 140)
        sfx.tone({ freq: 520, to: 380, dur: 0.1, type: 'square', vol: 0.12 })
        sfx.tone({ freq: 560, to: 400, dur: 0.12, type: 'square', vol: 0.12, delay: 0.13 })
        say(it.x, 120, 'ARF!', 46, '#ffffff')
        puff(it.x, 60, 8, { color: '#ffffff', speed: 320, life: 0.5, size: 12, grav: 900, angle: Math.PI / 2, spread: 2 })
        fx.shake(big ? 9 : 4)
        break
      case 'tramp':
        launchUp(it, Math.min(2800, Math.max(vyIn * 0.85, 600) + 150), 0.92, 0, 140)
        sfx.tone({ freq: 140, to: 420, dur: 0.25, type: 'sine', vol: 0.25 })
        say(it.x, 120, 'BOING!', 48, '#74c0fc')
        fx.shake(big ? 9 : 4)
        break
      case 'spring':
        launchUp(it, Math.min(3200, Math.max(vyIn * 0.9, 900) + 400), 0.88, 0, 140)
        sfx.slideUp()
        sfx.tone({ freq: 200, to: 900, dur: 0.3, type: 'triangle', vol: 0.2 })
        say(it.x, 140, 'SPROING!', 52, '#ff8787')
        fx.shake(8)
        fx.hitstop(40)
        break
      case 'whale':
        launchUp(it, Math.max(p.vy, 0) * 0.2 + 1150, 0.9, 0, 140)
        sfx.splat()
        sfx.noise({ dur: 0.5, freq: 700, to: 2600, vol: 0.25, q: 0.7 })
        say(it.x, 260, 'SPLOOSH!', 52, '#a5d8ff')
        puff(p.x, p.y, 22, { color: ['#a5d8ff', '#ffffff', '#74c0fc'], speed: 560, life: 0.8, size: 14, grav: 1200, angle: Math.PI / 2, spread: 1.4 })
        fx.shake(7)
        break
      case 'bear':
        launchUp(it, Math.min(2200, Math.max(vyIn * 0.6, 700)), 0.85, 700, 900)
        sfx.thud(1.6)
        sfx.tone({ freq: 130, to: 70, dur: 0.4, type: 'sawtooth', vol: 0.18 })
        sfx.zap()
        say(it.x, 190, 'WHACK!', 60, '#ffe066')
        fx.burst(sxw(it.x), syw(110), { count: 12, color: '#ffe066', speed: 520, life: 0.4, size: 14, shape: 'star' })
        fx.shake(14, 0.3)
        fx.hitstop(80)
        break
      case 'snowman':
        it.taken = true
        it.hitAt = stage.time
        p.vx *= 0.94
        p.vy = Math.max(p.vy, 0) + 220
        if (phase === 'slide') phase = 'fly'
        gainCoins(5)
        sfx.crunch()
        sfx.coin(3)
        say(it.x, 190, 'SMASH! +5', 46, '#ffffff')
        puff(it.x, 80, 18, { color: ['#ffffff', '#e7f5ff'], speed: 520, life: 0.9, size: 22, grav: 1100, angle: 0.6, spread: 1.6, vx: p.vx * 0.3 })
        puff(it.x, 120, 1, { color: '#ff922b', speed: 500, life: 1, size: 12, grav: 1100, angle: 1, spread: 0.4 })
        fx.shake(8)
        fx.hitstop(40)
        break
      default:
        break
    }
  }

  const hitSky = (it: Item) => {
    it.taken = true
    it.hitAt = stage.time
    switch (it.kind) {
      case 'coin':
        coinStreak = stage.time - lastCoinAt < 0.7 ? coinStreak + 1 : 0
        lastCoinAt = stage.time
        gainCoins(1)
        sfx.coin(Math.min(coinStreak, 12))
        puff(it.x, it.y, 5, { color: ['#ffe066', '#fff3bf'], speed: 240, life: 0.4, size: 7 })
        break
      case 'balloon':
        p.vy = Math.max(p.vy + 520, 320)
        gainCoins(3)
        for (let i = 0; i < 3; i++) stage.after(i * 0.06, () => sfx.pop(i * 2))
        puff(it.x, it.y, 16, { color: ['#ff6b6b', '#ffd43b', '#74c0fc', '#69db7c'], speed: 420, life: 0.7, size: 10, grav: 600 })
        say(it.x, it.y, 'POP! +3', 44, '#ffc9c9')
        stretch.kick(3)
        break
      case 'bird':
        p.vy += 260
        gainCoins(2)
        sfx.tone({ freq: 760, to: 420, dur: 0.1, type: 'sawtooth', vol: 0.12 })
        sfx.tone({ freq: 700, to: 380, dur: 0.12, type: 'sawtooth', vol: 0.12, delay: 0.12 })
        puff(it.x, it.y, 12, { color: '#ffffff', speed: 300, life: 1, size: 9, grav: 250 })
        say(it.x, it.y, 'QUACK!', 44, '#ffffff')
        fx.shake(4)
        break
      case 'cloud':
        sfx.noise({ dur: 0.3, freq: 500, to: 1400, vol: 0.14, q: 0.6 })
        puff(it.x, it.y, 14, { color: '#ffffff', speed: 260, life: 0.9, size: 30, grow: 0.8 })
        say(it.x, it.y, 'POOF!', 40, '#ffffff')
        break
      case 'plane':
        p.vx += 520
        gainCoins(5)
        sfx.ding(4)
        sfx.whoosh()
        say(it.x, it.y, 'ZOOM! +5', 48, '#d0ebff')
        fx.shake(6)
        break
      case 'star':
        coinStreak = stage.time - lastCoinAt < 1.5 ? coinStreak + 1 : 0
        lastCoinAt = stage.time
        gainCoins(5)
        sfx.ding(Math.min(coinStreak, 10))
        fx.burst(sxw(it.x), syw(it.y), { count: 10, color: ['#ffe066', '#ffffff'], speed: 380, life: 0.6, size: 10, shape: 'star', gravity: 0 })
        say(it.x, it.y, '+5', 40, '#ffe066')
        break
      case 'sat':
        p.vx += 200
        p.vy += 160
        gainCoins(5)
        sfx.zap()
        sfx.ding(6)
        say(it.x, it.y, 'BONK! +5', 46, '#e5dbff')
        fx.shake(8)
        fx.hitstop(40)
        break
      case 'ufo':
        p.vy += 650
        p.vx += 250
        gainCoins(10)
        for (let i = 0; i < 5; i++) sfx.tone({ freq: 500 + i * 160, to: 900 + i * 160, dur: 0.12, type: 'sine', vol: 0.14, delay: i * 0.07 })
        say(it.x, it.y, 'WHOOO! +10', 50, '#b2f2bb')
        fx.flash('#b2f2bb', 0.3, 0.2)
        fx.shake(8)
        break
      case 'fuel':
        fuel = Math.min(maxFuel(), fuel + 0.7)
        sfx.slideUp()
        sfx.ding(2)
        say(it.x, it.y, 'FUEL!', 46, '#ffd8a8')
        fx.ring(sxw(it.x), syw(it.y), '#ffa94d', 110, 0.4)
        break
      default:
        break
    }
  }

  const collide = (x0: number, y0: number) => {
    const loX = Math.min(x0, p.x)
    const hiX = Math.max(x0, p.x)
    const loY = Math.min(y0, p.y)
    const dx = p.x - x0
    const dy = p.y - y0
    const l2 = dx * dx + dy * dy
    const c0 = Math.floor((loX - 200) / CHUNK)
    const c1 = Math.floor((hiX + 200) / CHUNK)
    for (let ci = c0; ci <= c1; ci++) {
      for (const it of chunk(ci)) {
        const ground = GROUND[it.kind]
        if (ground) {
          if (it.taken || stage.time - it.hitAt < 0.6) continue
          if (hiX < it.x - ground.hw || loX > it.x + ground.hw || loY > ground.h) continue
          const needsFall = it.kind === 'seal' || it.kind === 'tramp' || it.kind === 'spring'
          if (needsFall && p.vy > 40) continue
          hitGround(it)
          continue
        }
        if (it.taken) continue
        const reach = REACH[it.kind] ?? 90
        let t = l2 > 0 ? ((it.x - x0) * dx + (it.y - y0) * dy) / l2 : 0
        t = clamp(t, 0, 1)
        const ex = x0 + dx * t - it.x
        const ey = y0 + dy * t - it.y
        if (ex * ex + ey * ey <= reach * reach) hitSky(it)
      }
    }
  }

  const hitSnow = () => {
    const impact = -p.vy
    p.y = 0
    combo = 0
    const n = Math.round(clamp(impact / 120, 5, 18))
    puff(p.x, 4, n, { color: ['#ffffff', '#e7f5ff'], speed: 200 + impact * 0.25, life: 0.7, size: 16, grav: 1000, angle: Math.PI / 2, spread: 2.2, vx: p.vx * 0.25 })
    if (impact < 380) {
      phase = 'slide'
      p.vy = 0
      sfx.thud(0.5)
      sfx.noise({ dur: 0.2, freq: 1800, vol: 0.12, filter: 'highpass' })
      return
    }
    p.vy = impact * 0.36
    p.vx *= 0.72
    p.tumble = 0.5
    p.spin = 9 + Math.random() * 5
    stretch.value = 0.6
    sfx.thud(clamp(impact / 900, 0.5, 1.7))
    sfx.noise({ dur: 0.18, freq: 1500, vol: 0.14, filter: 'highpass' })
    if (impact > 1400) {
      fx.shake(11)
      fx.hitstop(45)
      say(p.x, 120, 'OOF!', 48, '#ffffff')
    } else {
      fx.shake(4)
    }
  }

  const stick = () => {
    phase = 'stuck'
    stuckAt = stage.time
    p.vx = 0
    p.vy = 0
    p.y = 0
    boosting = false
    lastM = Math.max(0, Math.floor(p.x / PX))
    bonus = Math.round(2.6 * Math.sqrt(lastM)) + 2
    gainCoins(bonus)
    newBest = lastM > best
    if (newBest) best = lastM
    runs++
    puff(p.x, 6, 16, { color: ['#ffffff', '#e7f5ff'], speed: 380, life: 0.9, size: 18, grav: 1000, angle: Math.PI / 2, spread: 2.4 })
    fx.text(sxw(p.x), syw(150), 'PLOP!', { size: 48, color: '#ffffff' })
    fx.shake(7)
    sfx.splat()
    sfx.thud(1)
    sfx.tone({ freq: 420, to: 120, dur: 0.25, type: 'triangle', vol: 0.16, delay: 0.05 })
    for (let i = 0; i < 6; i++) stage.after(0.4 + i * 0.07, () => sfx.coin(i))
    stage.after(0.45, () => {
      if (phase !== 'stuck') return
      if (newBest) {
        fx.confetti(W / 2, 300, 70)
        sfx.fanfare()
      } else {
        sfx.win()
      }
    })
  }

  const startRewind = () => {
    phase = 'rewind'
    rewindT = 0
    rewindFromX = camX
    rewindFromZoom = zoom
    puff(p.x, 40, 10, { color: '#ffffff', speed: 300, life: 0.5, size: 16, grav: 600, angle: Math.PI / 2, spread: 2 })
    sfx.pop(2)
    sfx.whoosh()
    sfx.tone({ freq: 900, to: 260, dur: 0.5, type: 'sine', vol: 0.1 })
  }

  const reload = () => {
    phase = 'aim'
    chunks.clear()
    parts.length = 0
    p.x = CANNON_X
    p.y = CANNON_Y
    p.vx = 0
    p.vy = 0
    fuel = maxFuel()
    aimPower = 0
    aimId = -1
    camX = AIM_CAM_X
    camAlt = 0
    zoom = 1
    pyScreen = 330
    shopShownAt = stage.time
    lastTouchAt = stage.time
    peek.value = -1
    peek.kick(9)
    cannonPop.kick(2.5)
    sfx.boing(2)
  }

  const buy = (i: number) => {
    const item = SHOP[i]!
    const lvl = levels[item.key]
    const cost = price(lvl)
    const b = btn(i)
    if (coins < cost) {
      btnSpring[i]!.kick(-4)
      sfx.nope()
      fx.text(b.x + b.w / 2, b.y + b.h + 50, `${cost - coins} more!`, { size: 34, color: '#ffc9c9', life: 0.8, rise: 20 })
      return
    }
    coins -= cost
    levels[item.key] = lvl + 1
    bought = true
    if (item.key === 'fuel') fuel = maxFuel()
    btnSpring[i]!.kick(7)
    sfx.coin(lvl)
    sfx.ding(Math.min(lvl, 10))
    sfx.pop(4)
    fx.burst(b.x + b.w / 2, b.y + b.h / 2, { count: 16, color: [item.color, '#ffe066', '#ffffff'], speed: 460, life: 0.6, size: 11, shape: 'star' })
    fx.text(b.x + b.w / 2, b.y + b.h + 78, item.word, { size: 44, color: '#ffe066', rise: 24 })
    flying.push({ icon: item.icon, x0: b.x + b.w / 2, y0: b.y + b.h / 2, t: 0, i })
  }

  const btn = (i: number) => ({ x: 372 + i * 212, y: 28, w: 196, h: 132 })
  const shopOpen = () => phase === 'aim' && runs > 0

  // ---- update ---------------------------------------------------------------

  const flyStep = (dt: number) => {
    const x0 = p.x
    const y0 = p.y
    const held = boostId !== -1 && stage.pointers.has(boostId)
    boosting = held && fuel > 0
    if (boosting) {
      everBoosted = true
      const heading = Math.atan2(p.vy, Math.max(p.vx, 1))
      const ta = clamp(heading + 0.44, 0.26, 1.31)
      p.vx += Math.cos(ta) * thrust() * dt
      p.vy += Math.sin(ta) * thrust() * dt
      fuel = Math.max(0, fuel - dt)
      if (phase === 'slide') {
        // Lighting the rocket on the snow skips the penguin back into the air.
        phase = 'fly'
        p.y = 4
        p.vy = 280
      }
      puff(p.x - Math.cos(ta) * 50, p.y - Math.sin(ta) * 50, 2, { color: ['#ffd43b', '#ff922b', '#ff6b6b'], speed: 140, life: 0.35, size: 13, vx: p.vx - Math.cos(ta) * 700, vy: p.vy - Math.sin(ta) * 700 })
      if (Math.random() < 0.5) puff(p.x - Math.cos(ta) * 60, p.y - Math.sin(ta) * 60, 1, { color: ['#dee2e6', '#ffffff'], speed: 60, life: 0.8, size: 16, grow: 1.5, vx: p.vx * 0.4, vy: p.vy * 0.4 })
      if (stage.time >= rumbleAt) {
        rumbleAt = stage.time + 0.1
        sfx.noise({ dur: 0.16, freq: 320, to: 140, vol: 0.2, filter: 'lowpass' })
        sfx.tone({ freq: 95 + Math.random() * 20, dur: 0.12, type: 'sawtooth', vol: 0.05 })
      }
      if (fuel <= 0) {
        emptyAt = stage.time
        sfx.tone({ freq: 500, to: 120, dur: 0.3, type: 'triangle', vol: 0.16 })
        puff(p.x, p.y, 6, { color: '#868e96', speed: 160, life: 0.7, size: 16, grow: 1 })
        say(p.x, p.y, 'PFFT!', 40, '#dee2e6')
      }
    }

    if (phase === 'slide') {
      p.y = 0
      p.vy = 0
      p.vx -= (620 + p.vx * 1.1) * dt
      puff(p.x - 20, 6, 1, { color: '#ffffff', speed: 200, life: 0.45, size: 13, grav: 900, angle: 2.2, spread: 0.9 })
      if (stage.time >= skidAt) {
        skidAt = stage.time + 0.11
        sfx.noise({ dur: 0.12, freq: 2400, vol: clamp(p.vx / 4000, 0.03, 0.12), filter: 'highpass' })
      }
    } else {
      let g = G
      // The air thins out with height: less drag up there, and nothing for wings to bite.
      const thin = clamp(1 - p.y / ALT_SPACE, 0.05, 1)
      if (p.y > ALT_SPACE) g *= remap(p.y, ALT_SPACE, ALT_SPACE + 2000, 1, 0.75)
      if (p.vy < 0) g *= 1 - glide() * clamp(p.vx / 1200, 0, 1) * thin
      p.vy -= g * dt
      const air = thin * DRAG * 0.9 ** Math.min(levels.wings, 12)
      const sp = Math.hypot(p.vx, p.vy)
      p.vx -= p.vx * sp * air * dt
      p.vy -= p.vy * sp * air * dt * 0.5
      p.vy = clamp(p.vy, -3400, 4600)
      p.vx = Math.min(p.vx, 4600)
    }
    p.x += p.vx * dt
    p.y += p.vy * dt
    maxAlt = Math.max(maxAlt, p.y)
    if (chunks.size > 40) {
      const behind = Math.floor(p.x / CHUNK) - 8
      for (const ci of chunks.keys()) if (ci < behind) chunks.delete(ci)
    }

    collide(x0, y0)
    if (phase === 'fly' && p.y <= 0 && p.vy <= 0) hitSnow()
    if (phase === 'slide' && p.vx < 50) {
      stick()
      return
    }

    // The moon is a ceiling with a face.
    if (p.y > ALT_MOON - 40 && stage.time - moonHitAt > 1) {
      moonHitAt = stage.time
      p.vy = -Math.abs(p.vy) * 0.4 - 250
      p.vx += 500
      p.tumble = 0.8
      p.spin = 14
      gainCoins(100)
      fx.shake(16, 0.4)
      fx.hitstop(90)
      sfx.thud(2)
      if (!reached.has('moon')) {
        reached.add('moon')
        banner('THE MOON! +100')
      } else {
        fx.text(W / 2, 480, 'MOON BONK! +100', { size: 60, color: '#ffe066', life: 1.2 })
        sfx.win()
      }
    }

    // Body language.
    const speed = Math.hypot(p.vx, p.vy)
    if (p.tumble > 0) {
      p.tumble -= dt
      p.rot += p.spin * dt
    } else if (phase === 'slide') {
      p.rot = damp(p.rot, Math.PI / 2 + 0.15, 10, dt)
    } else {
      const want = Math.PI / 2 - Math.atan2(p.vy, Math.max(p.vx, 1))
      let d = (want - p.rot) % TAU
      if (d > Math.PI) d -= TAU
      if (d < -Math.PI) d += TAU
      p.rot += d * (1 - Math.exp(-12 * dt))
    }
    stretch.target = phase === 'slide' ? 0.9 : 1 + clamp(speed / 7000, 0, 0.22)

    // A faint trail at speed.
    if (speed > 1300 && stage.time >= trailAt && phase === 'fly') {
      trailAt = stage.time + 0.035
      puff(p.x, p.y, 1, { color: 'rgba(255,255,255,0.8)', speed: 20, life: 0.5, size: 10 })
    }

    // The wind: a whistle that follows speed, a few short overlapping notes a second.
    if (speed > 700 && stage.time >= windAt) {
      windAt = stage.time + 0.2
      const f = clamp(420 + speed * 0.3, 420, 1400)
      const vol = remap(speed, 700, 3200, 0.01, 0.035)
      sfx.tone({ freq: f * 0.96, to: f, dur: 0.26, type: 'sine', vol, attack: 0.05 })
      sfx.noise({ dur: 0.26, freq: 500 + speed * 0.7, vol: vol * 1.6, q: 2.5 })
    }

    // First times.
    const m = p.x / PX
    for (const d of DIST_MARKS) {
      if (m >= d && !reached.has(`d${d}`)) {
        reached.add(`d${d}`)
        banner(`${d} m!`)
      }
    }
    if (p.y > ALT_CLOUDS && !reached.has('clouds')) {
      reached.add('clouds')
      banner('INTO THE CLOUDS!')
    }
    if (p.y > ALT_HIGH && !reached.has('high')) {
      reached.add('high')
      banner('SKY HIGH!')
    }
    if (p.y > ALT_SPACE && !reached.has('space')) {
      reached.add('space')
      banner('SPACE!')
    }
    if (best > 0 && !passedBest && m > best && runs > 0) {
      passedBest = true
      fx.text(W / 2, 210, 'NEW RECORD!', { size: 56, color: '#b2f2bb', life: 1.2 })
      fx.confetti(sxw(best * PX), syw(60), 30)
      sfx.win()
    }
  }

  const updateCamera = (dt: number) => {
    if (phase === 'aim') {
      camX = damp(camX, AIM_CAM_X, 8, dt)
      zoom = damp(zoom, 1, 6, dt)
      camAlt = damp(camAlt, 0, 8, dt)
      pyScreen = 330
      return
    }
    if (phase === 'rewind') return
    const speed = Math.hypot(p.vx, p.vy)
    // Zoom out far enough to keep the snow in view for as long as that is possible.
    // On the way up, fit the top of the arc it is about to fly.
    const apex = p.y + (p.vy > 0 && phase === 'fly' ? (p.vy * p.vy) / (2 * G) : 0)
    const fit = (BASE - 215) / Math.max(apex, 1)
    const zt = clamp(Math.min(1 / (1 + speed / 5200), fit), 0.42, 1)
    zoom = damp(zoom, zt, zt < zoom ? 4.5 : 2, dt)
    camX = damp(camX, p.x + 80, 6, dt)
    const lead = (W * 0.5 - ANCHOR_X) / zoom
    if (p.x - camX > lead) camX = p.x - lead
    // Falling: the penguin rides high on screen so the ground is seen coming.
    let want = phase === 'fly' ? remap(p.vy, -1400, 1200, 185, 320) : 330
    // Near the top of the sky, drop the penguin down the screen so the moon looms above.
    want = lerp(want, 580, clamp((p.y - (ALT_MOON - 3600)) / 2200, 0, 1))
    pyScreen = damp(pyScreen, want, 3, dt)
    const alt = Math.max(0, p.y - (BASE - pyScreen) / zoom)
    camAlt = damp(camAlt, alt, 22, dt)
  }

  // ---- drawing ---------------------------------------------------------------

  const skyColors = (alt: number): [string, string] => {
    const keys: [number, number[], number[]][] = [
      [0, [95, 189, 255], [214, 243, 255]],
      [3000, [46, 134, 230], [155, 216, 255]],
      [7400, [12, 27, 85], [59, 108, 208]],
      [10500, [4, 5, 24], [16, 20, 60]],
    ]
    let i = 0
    while (i < keys.length - 2 && alt > keys[i + 1]![0]) i++
    const a = keys[i]!
    const b = keys[i + 1]!
    const t = clamp((alt - a[0]) / (b[0] - a[0]), 0, 1)
    const mix = (u: number[], v: number[]) => `rgb(${Math.round(lerp(u[0]!, v[0]!, t))},${Math.round(lerp(u[1]!, v[1]!, t))},${Math.round(lerp(u[2]!, v[2]!, t))})`
    return [mix(a[1], b[1]), mix(a[2], b[2])]
  }

  const drawMountains = (g: CanvasRenderingContext2D, f: number, sink: number, height: number, period: number, color: string, salt: number) => {
    const gy = BASE + camAlt * zoom * sink
    const s = lerp(1, zoom, 0.6)
    if (gy - height * 1.5 * s > H) return
    const off = camX * f
    const i0 = Math.floor((off - ANCHOR_X / s) / period) - 1
    const n = Math.ceil(W / s / period) + 3
    for (let i = i0; i < i0 + n; i++) {
      const wx = i * period + hash(i, salt, seed) * period * 0.5
      const h = height * (0.6 + hash(i, salt + 1, seed) * 0.85) * s
      const x = (wx - off) * s + ANCHOR_X
      const hw = h * 0.95
      g.beginPath()
      g.moveTo(x - hw, gy + 2)
      g.lineTo(x - hw * 0.08, gy - h)
      g.quadraticCurveTo(x, gy - h * 1.04, x + hw * 0.08, gy - h)
      g.lineTo(x + hw, gy + 2)
      g.closePath()
      g.fillStyle = color
      g.fill()
      g.beginPath()
      g.moveTo(x - hw * 0.34, gy - h * 0.68)
      g.lineTo(x - hw * 0.08, gy - h)
      g.quadraticCurveTo(x, gy - h * 1.04, x + hw * 0.08, gy - h)
      g.lineTo(x + hw * 0.34, gy - h * 0.68)
      g.lineTo(x + hw * 0.16, gy - h * 0.76)
      g.lineTo(x, gy - h * 0.64)
      g.lineTo(x - hw * 0.16, gy - h * 0.76)
      g.closePath()
      g.fillStyle = '#ffffff'
      g.fill()
    }
  }

  const drawCloudLayer = (g: CanvasRenderingContext2D, f: number, period: number, lo: number, hi: number, alpha: number, salt: number) => {
    if (syw(hi + 300) > H || syw(lo - 300) < 0) return
    const off = camX * f
    const i0 = Math.floor((off - ANCHOR_X / zoom) / period) - 1
    const n = Math.ceil(W / zoom / period) + 3
    g.globalAlpha = alpha
    for (let i = i0; i < i0 + n; i++) {
      const wx = i * period + hash(i, salt, seed) * period * 0.7
      const alt = lerp(lo, hi, hash(i, salt + 1, seed))
      const size = (0.7 + hash(i, salt + 2, seed) * 0.9) * lerp(1, zoom, 0.7)
      const x = (wx - off) * zoom + ANCHOR_X + Math.sin(stage.time * 0.2 + i) * 12
      const y = syw(alt)
      if (y < -120 || y > H + 120) continue
      ellipse(g, x, y, 95 * size, 34 * size, '#ffffff')
      ellipse(g, x - 50 * size, y - 18 * size, 52 * size, 34 * size, '#ffffff')
      ellipse(g, x + 28 * size, y - 30 * size, 60 * size, 42 * size, '#ffffff')
    }
    g.globalAlpha = 1
  }

  const drawBackdrop = (g: CanvasRenderingContext2D) => {
    const mid = camAlt + 300 / zoom
    const [top, bottom] = skyColors(mid)
    const grad = g.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, top)
    grad.addColorStop(1, bottom)
    g.fillStyle = grad
    g.fillRect(-30, -30, W + 60, H + 60)

    const starAlpha = remap(mid, 5200, 8800, 0, 1)
    if (starAlpha > 0.01) {
      g.fillStyle = '#ffffff'
      for (const s of stars) {
        g.globalAlpha = starAlpha * (0.5 + 0.5 * Math.sin(stage.time * 2 + s.tw))
        const x = (((s.x - camX * 0.01) % W) + W) % W
        const y = (((s.y + camAlt * 0.01) % H) + H) % H
        g.fillRect(x, y, s.r, s.r)
      }
      g.globalAlpha = 1
      // A couple of planets drifting by.
      const off = camX * 0.12
      const i0 = Math.floor(off / 1900) - 1
      for (let i = i0; i < i0 + 3; i++) {
        const x = i * 1900 + hash(i, 300, seed) * 900 - off + 200
        const y = syw(lerp(9200, 15000, hash(i, 301, seed)))
        if (x < -150 || x > W + 150 || y < -150 || y > H + 150) continue
        g.globalAlpha = starAlpha
        sprite(g, hash(i, 302, seed) < 0.5 ? '🪐' : '☄️', x, y, 110)
        g.globalAlpha = 1
      }
    }

    // The sun sinks away as the camera climbs.
    const sunY = 205 + camAlt * zoom * 0.35
    if (sunY < H + 120) {
      const pulse = 1 + Math.sin(stage.time * 1.5) * 0.04
      circle(g, 175, sunY, 92 * pulse, 'rgba(255,244,190,0.35)')
      circle(g, 175, sunY, 62, '#fff3bf')
      circle(g, 175, sunY, 50, '#ffe066')
    }

    drawMountains(g, 0.06, 0.35, 250, 330, '#b9dcf5', 100)
    drawCloudLayer(g, 0.25, 900, 360, 900, 0.85, 120)
    drawMountains(g, 0.16, 0.6, 170, 250, '#d3ecfb', 110)

    // The cloud deck: a bright haze to fly up through.
    const y1 = syw(ALT_CLOUDS + 900)
    const y2 = syw(ALT_CLOUDS - 200)
    if (y2 > 0 && y1 < H) {
      const haze = g.createLinearGradient(0, y1, 0, y2)
      haze.addColorStop(0, 'rgba(255,255,255,0)')
      haze.addColorStop(0.6, 'rgba(255,255,255,0.42)')
      haze.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = haze
      g.fillRect(-30, y1, W + 60, y2 - y1)
    }
    drawCloudLayer(g, 0.55, 640, 1250, 3900, 0.8, 130)
  }

  const drawMoon = (g: CanvasRenderingContext2D) => {
    const x = sxw(camX + 110 / zoom)
    const y = syw(ALT_MOON + MOON_R)
    const r = MOON_R * zoom
    if (y - r > H + 50) return
    const hit = stage.time - moonHitAt
    const wob = hit < 1 ? Math.sin(hit * 30) * 8 * (1 - hit) : 0
    circle(g, x + wob, y, r + 26 * zoom, 'rgba(255,250,220,0.22)')
    circle(g, x + wob, y, r, '#fff3c4', '#e6d48a', 6)
    for (let i = 0; i < 7; i++) {
      const a = hash(i, 500, seed) * TAU
      const d = hash(i, 501, seed) * r * 0.75
      circle(g, x + wob + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - r * 0.2, r * (0.05 + hash(i, 502, seed) * 0.08), '#ecdca0')
    }
    // A face on the near side, looking down at the penguin.
    const fy = y + r * 0.62
    const fs = r * 0.08
    if (hit < 1.6) {
      g.strokeStyle = '#1e1428'
      g.lineWidth = fs * 0.3
      for (const side of [-1, 1]) {
        const ex = x + wob + side * fs * 1.6
        g.beginPath()
        g.moveTo(ex - fs * 0.6, fy - fs * 0.6)
        g.lineTo(ex + fs * 0.6, fy + fs * 0.6)
        g.moveTo(ex + fs * 0.6, fy - fs * 0.6)
        g.lineTo(ex - fs * 0.6, fy + fs * 0.6)
        g.stroke()
      }
    } else {
      eyes(g, x + wob, fy, fs, -0.3, 1, blinkAt(stage.time, 3), 1.6)
    }
    ellipse(g, x + wob, fy + fs * 2, fs * 0.7, fs * (hit < 1.6 ? 0.9 : 0.4), '#1e1428')
  }

  const drawGround = (g: CanvasRenderingContext2D) => {
    const gy = syw(0)
    if (gy > H + 260) return
    const z = zoom
    const left = camX - ANCHOR_X / z
    const right = camX + (W - ANCHOR_X) / z

    // Trees stand behind the snow line.
    const t0 = Math.floor((left - 200) / 330)
    const t1 = Math.floor((right + 200) / 330)
    for (let i = t0; i <= t1; i++) {
      if (hash(i, 200, seed) > 0.55) continue
      const wx = i * 330 + hash(i, 201, seed) * 250
      if (wx > -560 && wx < 260) continue
      const size = (110 + hash(i, 202, seed) * 90) * z
      sprite(g, '🌲', sxw(wx), gy - size * 0.42, size)
    }

    // Drifts break up the horizon line.
    const d0 = Math.floor((left - 200) / 170)
    const d1 = Math.floor((right + 200) / 170)
    for (let i = d0; i <= d1; i++) {
      const wx = i * 170 + hash(i, 210, seed) * 120
      const w = (90 + hash(i, 211, seed) * 120) * z
      ellipse(g, sxw(wx), gy + 6 * z, w, (14 + hash(i, 212, seed) * 16) * z, '#ffffff')
    }
    const grad = g.createLinearGradient(0, gy, 0, gy + 260)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(1, '#cfe8fa')
    g.fillStyle = grad
    g.fillRect(-30, gy, W + 60, H - gy + 60)
    // Blue dents in the snow, so the ground visibly rushes past.
    for (let i = d0; i <= d1; i++) {
      const wx = i * 170 + hash(i, 213, seed) * 150
      const depth = 30 + hash(i, 214, seed) * 120
      ellipse(g, sxw(wx), gy + depth * z, (26 + hash(i, 215, seed) * 40) * z, 7 * z, 'rgba(150,200,240,0.55)')
    }

    // A post every 50 metres, and the best-distance flag.
    const m0 = Math.max(1, Math.floor(left / 500))
    const m1 = Math.floor((right + 100) / 500)
    const every = z < 0.55 ? 2 : 1
    for (let i = m0; i <= m1; i++) {
      if (i % every !== 0) continue
      const x = sxw(i * 500)
      const s = Math.max(z, 0.6)
      rrect(g, x - 5 * s, gy - 58 * s, 10 * s, 64 * s, 3, '#a9713b')
      rrect(g, x - 44 * s, gy - 94 * s, 88 * s, 42 * s, 8 * s, '#ffe8a3', '#a9713b', 4 * s)
      label(g, `${i * 50}`, x, gy - 72 * s, 26 * s, '#6b3f12', null)
    }
    if (best > 0) {
      const s = Math.max(z, 0.6)
      // Planted just past the spot, so it never hides the penguin that set it.
      const x = sxw(best * PX) + 70 * s
      if (x > -80 && x < W + 80) {
        const wave = Math.sin(stage.time * 6) * 0.08
        line(g, x, gy + 4, x, gy - 130 * s, '#495057', 7 * s)
        g.beginPath()
        g.moveTo(x, gy - 130 * s)
        g.quadraticCurveTo(x + 40 * s, gy - (128 + wave * 120) * s, x + 78 * s, gy - 108 * s)
        g.quadraticCurveTo(x + 40 * s, gy - (92 + wave * 120) * s, x, gy - 84 * s)
        g.closePath()
        g.fillStyle = '#fa5252'
        g.fill()
        star(g, x + 30 * s, gy - 107 * s, 12 * s, '#ffe066', wave)
        label(g, `${best} m`, x + 10 * s, gy - 156 * s, 26 * s, '#ffffff')
      }
    }
  }

  const drawRamp = (g: CanvasRenderingContext2D) => {
    const gy = syw(0)
    const x = (wx: number) => sxw(wx)
    const y = (wy: number) => syw(wy)
    if (x(260) < -50) return
    g.beginPath()
    g.moveTo(x(-620), gy + 4)
    g.quadraticCurveTo(x(-260), y(40), x(-110), y(150))
    g.lineTo(x(95), y(150))
    g.quadraticCurveTo(x(130), y(60), x(190), gy + 4)
    g.closePath()
    g.fillStyle = '#a5d8ff'
    g.fill()
    g.beginPath()
    g.moveTo(x(-620), gy + 4)
    g.quadraticCurveTo(x(-260), y(40), x(-110), y(150))
    g.lineTo(x(95), y(150))
    g.quadraticCurveTo(x(118), y(126), x(100), y(118))
    g.lineTo(x(-100), y(118))
    g.quadraticCurveTo(x(-250), y(30), x(-560), gy + 4)
    g.closePath()
    g.fillStyle = '#ffffff'
    g.fill()
    // Ice glints.
    line(g, x(20), y(90), x(60), y(40), 'rgba(255,255,255,0.7)', 6 * zoom)
    line(g, x(-40), y(80), x(-20), y(50), 'rgba(255,255,255,0.7)', 5 * zoom)

    // Two friends who watch every launch.
    for (let i = 0; i < 2; i++) {
      const wx = 250 + i * 78
      const hop = Math.max(0, friendHop[i]!.value)
      const bob = Math.sin(stage.time * 3 + i * 2) * 3
      const air = phase === 'fly' || phase === 'slide'
      shadow(g, x(wx), gy + 4, 30 * zoom, 1 - hop / 300)
      drawPenguin(g, x(wx), gy - (31 + hop + bob * 0.5) * zoom, zoom * 0.62, Math.sin(stage.time * 2 + i) * 0.05, {
        stretch: 1 + bob * 0.012 + (hop > 4 ? 0.12 : 0),
        mood: hop > 4 || air ? 'wow' : 'happy',
        lookX: air ? 0.8 : lookX,
        lookY: air ? -0.8 : lookY,
        blink: blinkAt(stage.time, i + 2),
        flame: 0,
        flap: hop > 4 ? Math.sin(stage.time * 30) * 0.5 : Math.sin(stage.time * 3 + i) * 0.06,
        wag: stage.time * 3 + i,
        stream: 0,
        scarf: i === 0 ? '#38d9a9' : '#ffd43b',
        plain: true,
      })
    }
  }

  const drawPenguin = (g: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, o: PenguinLook) => {
    g.save()
    g.translate(x, y)
    g.rotate(rot)
    g.scale(s / Math.sqrt(o.stretch), s * o.stretch)

    // Scarf tail, streaming behind.
    g.beginPath()
    g.moveTo(-22, 2)
    g.quadraticCurveTo(-42 - o.stream * 6, 22, -36 + Math.sin(o.wag) * (5 + o.stream * 7), 44 + o.stream * 30)
    g.strokeStyle = o.scarf ?? '#e03131'
    g.lineWidth = 11
    g.lineCap = 'round'
    g.stroke()

    // Glider wings grow with their level.
    const wl = o.plain ? 0 : Math.min(levels.wings, 10)
    if (wl > 0) {
      const span = 40 + wl * 6
      g.fillStyle = WING[Math.floor((wl - 1) / 2) % WING.length]!
      g.strokeStyle = OUTLINE
      g.lineWidth = 3
      for (const side of [-1, 1]) {
        g.beginPath()
        g.moveTo(side * 14, -16)
        g.lineTo(side * (30 + span), 4 + o.flap * 26)
        g.lineTo(side * (24 + span * 0.55), 30 + o.flap * 18)
        g.lineTo(side * 14, 22)
        g.closePath()
        g.fill()
        g.stroke()
      }
    }

    // Rocket pack and flame.
    const fl = Math.min(levels.fuel, 10)
    const packH = 30 + fl * 2.4
    const packW = 24 + fl * 1.5
    if (o.flame > 0) {
      const y0 = 28 + packH
      const len = (46 + fl * 5) * o.flame * (0.75 + Math.random() * 0.4)
      g.beginPath()
      g.moveTo(-packW / 2, y0)
      g.quadraticCurveTo(0, y0 + len * 2, packW / 2, y0)
      g.fillStyle = '#ff922b'
      g.fill()
      g.beginPath()
      g.moveTo(-packW / 4, y0)
      g.quadraticCurveTo(0, y0 + len * 1.1, packW / 4, y0)
      g.fillStyle = '#fff3bf'
      g.fill()
    }
    if (!o.plain) {
      rrect(g, -packW / 2, 26, packW, packH, 8, '#e03131', OUTLINE, 3)
      rrect(g, -packW / 2 + 3, 22 + packH, packW - 6, 9, 3, '#868e96')
    }

    // Feet.
    ellipse(g, -17, 45, 14, 7, '#ff922b', -0.2)
    ellipse(g, 17, 45, 14, 7, '#ff922b', 0.2)
    // Flippers.
    ellipse(g, -36, 4, 9, 25, '#2b2d42', 0.45 + o.flap)
    ellipse(g, 36, 4, 9, 25, '#2b2d42', -0.45 - o.flap)
    // Body and belly.
    ellipse(g, 0, 0, 37, 47, '#2b2d42')
    ellipse(g, 0, 13, 26, 32, '#ffffff')
    ellipse(g, -13, -28, 9, 5, 'rgba(255,255,255,0.18)', -0.5)
    // Scarf band.
    rrect(g, -33, 0, 66, 13, 6, o.scarf ?? '#fa5252')
    // Cheeks.
    ellipse(g, -24, -11, 6, 4, 'rgba(255,135,135,0.7)')
    ellipse(g, 24, -11, 6, 4, 'rgba(255,135,135,0.7)')
    // Beak: open when amazed.
    const open = o.mood === 'wow' ? 7 : o.mood === 'yum' ? 4 : 0
    g.fillStyle = '#ffa94d'
    g.beginPath()
    g.moveTo(-10, -15)
    g.lineTo(10, -15)
    g.lineTo(0, -5 - open * 0.2)
    g.closePath()
    g.fill()
    if (open > 0) {
      g.fillStyle = '#f76707'
      g.beginPath()
      g.moveTo(-8, -12 + open * 0.4)
      g.lineTo(8, -12 + open * 0.4)
      g.lineTo(0, -4 + open)
      g.closePath()
      g.fill()
    }
    if (o.mood === 'dizzy') {
      g.strokeStyle = '#ffffff'
      g.lineWidth = 4
      for (const side of [-1, 1]) {
        const ex = side * 12
        g.beginPath()
        g.moveTo(ex - 6, -32)
        g.lineTo(ex + 6, -20)
        g.moveTo(ex + 6, -32)
        g.lineTo(ex - 6, -20)
        g.stroke()
      }
    } else {
      eyes(g, 0, -26, o.mood === 'wow' ? 10.5 : 9.5, o.lookX, o.lookY, o.mood === 'yum' ? 0.6 : o.blink, 1.22)
    }
    g.restore()
  }

  const barrelShape = () => {
    const pull = phase !== 'aim' ? 0 : aimId !== -1 ? aimPower : ghost * 0.85
    const rc = Math.max(-0.3, recoil.value)
    return {
      len: barrelLen() * (1 - 0.17 * pull) * (1 - 0.12 * rc),
      wid: barrelWid() * (1 + 0.16 * pull) * (1 + 0.1 * rc),
      pull,
      back: rc * 34,
    }
  }

  const drawCannon = (g: CanvasRenderingContext2D) => {
    const cx = sxw(CANNON_X)
    const cy = syw(CANNON_Y)
    if (cx < -320) return
    const z = zoom * cannonPop.value
    const shape = barrelShape()
    const breathe = phase === 'aim' && aimId === -1 ? Math.sin(stage.time * 2.2) * 0.03 : 0
    const a = aimAngle + breathe
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const lvl = levels.cannon

    // The penguin rides in the muzzle, deeper as the pull grows.
    if (phase === 'aim') {
      const d = shape.len + 8 - shape.pull * 26 - shape.back + peek.value * 30
      const px = cx + ca * d * z
      const py = cy - sa * d * z
      const shiver = shape.pull > 0.8 ? Math.sin(stage.time * 60) * 2 : 0
      drawPenguin(g, px + shiver, py, z, Math.PI / 2 - a, {
        stretch: 1,
        mood: shape.pull > 0.55 ? 'wow' : peek.value > 0.2 ? 'yum' : 'happy',
        lookX,
        lookY,
        blink: blinkAt(stage.time),
        flame: 0,
        flap: Math.sin(stage.time * 3) * 0.08,
        wag: stage.time * 3,
        stream: 0,
      })
    }

    // At full stretch the whole barrel trembles.
    const tremble = shape.pull > 0.8 ? Math.sin(stage.time * 70) * 2.5 * (shape.pull - 0.6) : 0
    g.save()
    g.translate(cx - ca * shape.back * z + tremble, cy + sa * shape.back * z)
    g.scale(z, z)
    g.rotate(-a)
    const color = BARREL[Math.floor(lvl / 3) % BARREL.length]!
    const w = shape.wid
    rrect(g, -62, -w / 2, shape.len + 62, w, w / 2, color, OUTLINE, 5)
    // Square off the muzzle end over the rounded rect.
    rrect(g, shape.len - 70, -w / 2, 70, w, 10, color)
    rrect(g, -62, -w / 2 + 8, shape.len + 40, w * 0.22, w * 0.11, 'rgba(255,255,255,0.28)')
    rrect(g, 28, -w / 2 - 3, 20, w + 6, 6, '#ffd43b', OUTLINE, 4)
    rrect(g, shape.len - 30, -w / 2 - 9, 34, w + 18, 9, '#ffd43b', OUTLINE, 5)
    const stars = Math.min(lvl, 5)
    for (let i = 0; i < stars; i++) star(g, 70 + i * 22, 8, 10, '#fff3bf', i)
    g.restore()

    // Carriage and wheel do not rotate.
    const wob = recoil.value * 6
    circle(g, cx - wob * z, cy + 12 * z, 50 * z, '#8d5a2b', OUTLINE, 5 * z)
    circle(g, cx - wob * z, cy + 12 * z, 34 * z, '#c98c4a')
    for (let i = 0; i < 6; i++) {
      const sp = (i / 6) * TAU + recoil.value * 0.8
      line(g, cx - wob * z, cy + 12 * z, cx - wob * z + Math.cos(sp) * 40 * z, cy + 12 * z + Math.sin(sp) * 40 * z, '#8d5a2b', 6 * z)
    }
    circle(g, cx - wob * z, cy + 12 * z, 11 * z, '#ffd43b', OUTLINE, 3 * z)
  }

  const drawItem = (g: CanvasRenderingContext2D, it: Item) => {
    const x = sxw(it.x)
    const y = syw(it.y)
    if (x < -260 || x > W + 260 || y < -520 || y > H + 300) return
    const t = stage.time - it.hitAt
    const sq = t < 1.2 ? 1 - 0.45 * Math.exp(-t * 6) * Math.cos(t * 22) : 1
    const s = zoom ** 0.8
    const k = zs()
    const bob = Math.sin(stage.time * 3 + it.seed * 9)
    switch (it.kind) {
      case 'seal': {
        shadow(g, x, y + 5 * s, 70 * s)
        sprite(g, '🦭', x, y - (44 * sq + bob * 2) * s, 120 * s, bob * 0.04, 1 / Math.sqrt(sq), sq)
        if (t < 0.8) sprite(g, '❤️', x + 40 * s, y - (110 + t * 90) * s, 34 * s * (1 - t))
        break
      }
      case 'tramp': {
        const dip = (1 - sq) * 70 * s
        line(g, x - 84 * s, y + 2, x - 100 * s, y - 50 * s, '#495057', 9 * s)
        line(g, x + 84 * s, y + 2, x + 100 * s, y - 50 * s, '#495057', 9 * s)
        ellipse(g, x, y - 50 * s, 116 * s, 19 * s, '#228be6')
        ellipse(g, x, y - 50 * s + dip * 0.4, 96 * s, Math.max(3, 12 * s + dip * 0.5), '#1c1c2e')
        ellipse(g, x - 30 * s, y - 54 * s + dip * 0.4, 36 * s, 4 * s, 'rgba(255,255,255,0.25)')
        star(g, x, y - 50 * s + dip * 0.4, 9 * s, '#ffd43b', stage.time)
        break
      }
      case 'spring': {
        const hgt = 74 * s * (t < 1.2 ? 1 + 0.7 * Math.exp(-t * 5) * Math.cos(t * 20) : 1 + bob * 0.03)
        rrect(g, x - 46 * s, y - 8 * s, 92 * s, 14 * s, 5, '#495057')
        g.beginPath()
        g.moveTo(x - 28 * s, y - 8 * s)
        for (let i = 1; i <= 6; i++) g.lineTo(x + (i % 2 === 0 ? -28 : 28) * s, y - 8 * s - (hgt * i) / 6)
        g.strokeStyle = '#adb5bd'
        g.lineWidth = 9 * s
        g.lineJoin = 'round'
        g.stroke()
        rrect(g, x - 54 * s, y - 8 * s - hgt - 20 * s, 108 * s, 24 * s, 10 * s, '#fa5252', OUTLINE, 4 * s)
        star(g, x, y - 8 * s - hgt - 8 * s, 9 * s, '#ffe066')
        break
      }
      case 'whale': {
        const top = (360 + Math.sin(stage.time * 7 + it.seed * 5) * 24 + (t < 0.6 ? 120 : 0)) * zoom
        ellipse(g, x, y + 8 * s, 150 * s, 24 * s, '#339af0')
        g.globalAlpha = 0.55
        rrect(g, x - 40 * s, y - top, 80 * s, top - 40 * s, 36 * s, '#a5d8ff')
        g.globalAlpha = 0.8
        rrect(g, x - 20 * s, y - top + 10 * s, 40 * s, top - 50 * s, 18 * s, '#e7f5ff')
        g.globalAlpha = 1
        for (let i = 0; i < 4; i++) {
          const a = stage.time * 5 + i * 1.6
          circle(g, x + Math.cos(a) * 46 * s, y - top + Math.sin(a * 1.3) * 14 * s, (16 + (i % 2) * 8) * s, '#ffffff')
        }
        sprite(g, '🐳', x, y - (26 + bob * 3) * s, 140 * s)
        ellipse(g, x, y + 14 * s, 120 * s, 14 * s, '#339af0')
        break
      }
      case 'snowman': {
        if (it.taken) {
          ellipse(g, x, y + 2 * s, 56 * s, 18 * s, '#e7f5ff')
          ellipse(g, x + 50 * s, y + 4 * s, 22 * s, 12 * s, '#ffffff')
        } else {
          shadow(g, x, y + 5 * s, 56 * s)
          sprite(g, '⛄', x, y - 62 * s, 140 * s, bob * 0.03)
        }
        break
      }
      case 'bear': {
        shadow(g, x, y + 5 * s, 76 * s)
        const swing = t < 0.5 ? Math.sin(t * 12) * 0.5 : bob * 0.04
        sprite(g, '🐻‍❄️', x, y - 70 * s, 150 * s, swing, 1 / Math.sqrt(sq), sq)
        sprite(g, '🏏', x + 62 * s, y - 84 * s, 84 * s, swing * 2.4 - 0.4)
        break
      }
      case 'coin': {
        if (it.taken) return
        const spin = Math.abs(Math.cos(stage.time * 4 + it.seed * 6))
        const r = 21 * k
        ellipse(g, x, y + bob * 3, r * (0.25 + 0.75 * spin), r, '#f59f00')
        ellipse(g, x, y + bob * 3, r * (0.25 + 0.75 * spin) * 0.74, r * 0.74, '#ffd43b')
        ellipse(g, x - r * 0.2 * spin, y + bob * 3 - r * 0.25, r * 0.16 * spin, r * 0.3, '#fff9db')
        break
      }
      case 'balloon': {
        if (it.taken) return
        const sway = Math.sin(stage.time * 2 + it.seed * 7) * 0.12
        line(g, x, y + 20 * k, x + sway * 60, y + 95 * k, 'rgba(60,60,80,0.5)', 2)
        sprite(g, '🎈', x - 30 * k, y + 8 * k + bob * 4, 80 * k, sway - 0.2)
        sprite(g, '🎈', x + 32 * k, y + 4 * k - bob * 3, 80 * k, sway + 0.2)
        sprite(g, '🎈', x, y - 18 * k + bob * 3, 92 * k, sway)
        break
      }
      case 'bird': {
        if (it.taken) {
          if (t > 1.2) return
          sprite(g, '🦆', x + t * 160 * zoom, y + t * t * 700 * zoom, 84 * k, t * 12)
          return
        }
        sprite(g, '🦆', x + bob * 8, y + Math.sin(stage.time * 9 + it.seed * 4) * 8, 84 * k, 0, 1, 1 + Math.sin(stage.time * 14) * 0.08)
        break
      }
      case 'cloud': {
        const apart = it.taken ? Math.min(90, t * 260) : 0
        g.globalAlpha = it.taken ? clamp(0.95 - t * 0.5, 0.35, 0.95) : 0.95
        const c = zoom ** 0.85
        ellipse(g, x - (60 + apart) * c, y + 12 * c, 96 * c, 50 * c, '#ffffff')
        ellipse(g, x + (62 + apart) * c, y + 14 * c, 100 * c, 48 * c, '#ffffff')
        ellipse(g, x - apart * 0.4 * c, y - (28 + apart * 0.7) * c, 88 * c, 56 * c, '#ffffff')
        ellipse(g, x + apart * 0.3 * c, y + (26 + apart * 0.7) * c, 120 * c, 36 * c, '#f1f8ff')
        g.globalAlpha = 1
        break
      }
      case 'plane': {
        if (it.taken) {
          if (t > 1.5) return
          sprite(g, '✈️', x + t * 900 * zoom, y - t * 300 * zoom, 130 * k, 0.2)
          return
        }
        sprite(g, '✈️', x, y + bob * 5, 130 * k, 0.75)
        break
      }
      case 'star': {
        if (it.taken) return
        const pulse = 1 + Math.sin(stage.time * 5 + it.seed * 8) * 0.12
        circle(g, x, y, 46 * k * pulse, 'rgba(255,240,170,0.16)')
        star(g, x, y, 34 * k * pulse, '#ffe066', Math.sin(stage.time + it.seed * 5) * 0.3)
        star(g, x, y, 18 * k * pulse, '#fff9db', Math.sin(stage.time + it.seed * 5) * 0.3)
        break
      }
      case 'sat': {
        if (it.taken) {
          if (t > 1.5) return
          sprite(g, '🛰️', x + t * 300 * zoom, y - t * 260 * zoom, 110 * k, t * 14)
          return
        }
        sprite(g, '🛰️', x, y + bob * 4, 110 * k, stage.time * 0.4 + it.seed * 6)
        break
      }
      case 'ufo': {
        if (it.taken && t > 1.5) return
        const lift = it.taken ? t * 700 * zoom : 0
        g.beginPath()
        g.moveTo(x - 16 * k, y + 10 * k - lift)
        g.lineTo(x + 16 * k, y + 10 * k - lift)
        g.lineTo(x + 60 * k, y + 130 * k - lift)
        g.lineTo(x - 60 * k, y + 130 * k - lift)
        g.closePath()
        g.fillStyle = `rgba(200,255,210,${0.4 + 0.15 * Math.sin(stage.time * 8)})`
        g.fill()
        sprite(g, '🛸', x + bob * 8, y - lift, 130 * k, bob * 0.08)
        break
      }
      case 'fuel': {
        if (it.taken) return
        const pulse = 1 + Math.sin(stage.time * 6 + it.seed * 8) * 0.1
        circle(g, x, y, 52 * k * pulse, 'rgba(255,169,77,0.28)')
        sprite(g, '⛽', x, y + bob * 4, 78 * k)
        break
      }
    }
  }

  const drawItems = (g: CanvasRenderingContext2D) => {
    const left = camX - ANCHOR_X / zoom - 260
    const right = camX + (W - ANCHOR_X) / zoom + 260
    const c0 = Math.floor(left / CHUNK)
    const c1 = Math.floor(right / CHUNK)
    for (let ci = c0; ci <= c1; ci++) for (const it of chunk(ci)) drawItem(g, it)
  }

  const drawParts = (g: CanvasRenderingContext2D) => {
    const k = zs()
    for (const q of parts) {
      const a = q.life / q.max
      g.globalAlpha = Math.min(1, a * 1.4)
      g.beginPath()
      g.arc(sxw(q.x), syw(q.y), Math.max(0.5, q.size * (1 + q.grow * (1 - a)) * k * 0.5), 0, TAU)
      g.fillStyle = q.color
      g.fill()
    }
    g.globalAlpha = 1
  }

  const drawFlyer = (g: CanvasRenderingContext2D) => {
    const x = sxw(p.x)
    const gy = syw(0)
    const k = zs() * 1.2
    if (phase === 'stuck') {
      // Head in the snow, feet in the air.
      const t = stage.time - stuckAt
      const wig = Math.sin(t * 16) * 0.22 * Math.exp(-t * 1.2) + Math.sin(stage.time * 5) * 0.05
      drawPenguin(g, x, gy - 30 * k, k, Math.PI + wig, { stretch: 1 + Math.sin(t * 16) * 0.06 * Math.exp(-t * 2), mood: 'dizzy', lookX: 0, lookY: 0, blink: 0, flame: 0, flap: 0.5 + Math.sin(t * 20) * 0.3 * Math.exp(-t), wag: t * 8, stream: 0 })
      ellipse(g, x, gy + 26 * k, 84 * k, 34 * k, '#ffffff')
      ellipse(g, x - 58 * k, gy + 10 * k, 30 * k, 14 * k, '#eef8ff')
      ellipse(g, x + 60 * k, gy + 11 * k, 28 * k, 13 * k, '#eef8ff')
      return
    }
    const y = syw(p.y)
    if (p.y < 900) shadow(g, x, gy + 6 * zoom, 46 * k, clamp(1 - p.y / 900, 0.2, 1))
    const speed = Math.hypot(p.vx, p.vy)
    const mood: PMood = p.tumble > 0 || phase === 'slide' ? 'dizzy' : boosting ? 'yum' : speed > 1500 || p.vy < -700 ? 'wow' : 'happy'
    const lift = phase === 'slide' ? 24 : 0
    drawPenguin(g, x, y - lift * k, k, p.rot, {
      stretch: stretch.value,
      mood,
      lookX: 0.2,
      lookY: clamp(-p.vy / 1500, -0.8, 0.8),
      blink: blinkAt(stage.time),
      flame: boosting ? 1 : 0,
      flap: flap * Math.sin(stage.time * 40) * 0.5 + (p.vy < -300 ? 0.25 : 0),
      wag: stage.time * 18,
      stream: clamp(speed / 1500, 0, 1),
    })
    // Fuel, right beside the penguin.
    const bw = 84
    const bx = clamp(x - bw / 2, 20, W - bw - 20)
    const by = clamp(y - 92 * k, 96, H - 120)
    const frac = clamp(fuel / maxFuel(), 0, 1)
    rrect(g, bx, by, bw, 15, 7, 'rgba(30,20,40,0.6)')
    if (frac > 0) rrect(g, bx + 3, by + 3, Math.max(8, (bw - 6) * frac), 9, 4, frac > 0.3 ? '#ffa94d' : '#ff6b6b')
    sprite(g, '🚀', bx - 14, by + 7, 26)
  }

  const drawWind = (g: CanvasRenderingContext2D) => {
    if (phase !== 'fly' && phase !== 'slide') return
    const speed = Math.hypot(p.vx, p.vy)
    // Thin air, thin wind.
    const a = remap(speed, 700, 2800, 0, 0.34) * clamp(1.15 - p.y / ALT_SPACE, 0.3, 1)
    if (a <= 0.01) return
    const ux = p.vx / speed
    const uy = -p.vy / speed
    g.strokeStyle = '#ffffff'
    g.lineCap = 'round'
    g.lineWidth = 2.5
    g.globalAlpha = a
    g.beginPath()
    for (const s of streaks) {
      const len = s.len * clamp(speed * 0.04, 24, 110)
      g.moveTo(s.x, s.y)
      g.lineTo(s.x + ux * len, s.y + uy * len)
    }
    g.stroke()
    g.globalAlpha = 1
  }

  const drawPull = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, power: number, angle: number) => {
    // The stretchy band under the finger.
    const band = power < 0.5 ? '#69db7c' : power < 0.85 ? '#ffd43b' : '#ff6b6b'
    line(g, x0, y0, x1, y1, 'rgba(30,20,40,0.35)', 16 - power * 8)
    line(g, x0, y0, x1, y1, band, 10 - power * 5)
    circle(g, x0, y0, 14, '#ffffff', OUTLINE, 4)
    circle(g, x1, y1, 26 + power * 8, band, OUTLINE, 5)
    if (power < 0.06) return
    // Where it will go: the first second of the arc.
    const v = vmax() * lerp(0.42, 1, power)
    const len = barrelLen()
    const mx = CANNON_X + Math.cos(angle) * len
    const my = CANNON_Y + Math.sin(angle) * len
    const vx = Math.cos(angle) * v
    const vy = Math.sin(angle) * v
    const alpha = g.globalAlpha
    for (let i = 1; i <= 11; i++) {
      const t = i * 0.075 + ((stage.time * 0.35) % 0.075)
      const x = sxw(mx + vx * t)
      const y = syw(my + vy * t - (G * t * t) / 2)
      if (y > syw(0)) break
      g.globalAlpha = alpha * clamp(1.1 - i / 11, 0, 1)
      circle(g, x, y, 12 - i * 0.6, '#ffffff', OUTLINE, 3)
    }
    g.globalAlpha = alpha
  }

  const drawAim = (g: CanvasRenderingContext2D) => {
    if (phase !== 'aim') return
    if (aimId !== -1) {
      drawPull(g, aimSX, aimSY, aimCX, aimCY, aimPower, aimAngle)
    } else if (ghost > 0.01) {
      const x0 = 590
      const y0 = 380
      const x1 = x0 - Math.cos(aimAngle) * 250 * ghost
      const y1 = y0 + Math.sin(aimAngle) * 250 * ghost
      g.globalAlpha = 0.85
      drawPull(g, x0, y0, x1, y1, ghost * 0.85, aimAngle)
      g.globalAlpha = 1
      sprite(g, '👆', x1 + 16, y1 + 44, 86)
    }
  }

  const coinIcon = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    circle(g, x, y, r, '#ffd43b', '#e08e00', Math.max(2, r * 0.2))
    ellipse(g, x - r * 0.25, y - r * 0.3, r * 0.2, r * 0.32, '#fff9db', -0.5)
  }

  const drawShop = (g: CanvasRenderingContext2D) => {
    if (!shopOpen()) return
    for (let i = 0; i < SHOP.length; i++) {
      const item = SHOP[i]!
      const b = btn(i)
      const lvl = levels[item.key]
      const cost = price(lvl)
      const can = coins >= cost
      const appear = ease.outBack(clamp((stage.time - shopShownAt - i * 0.08) / 0.35, 0, 1))
      if (appear <= 0) continue
      const cx = b.x + b.w / 2
      const cy = b.y + b.h / 2 + (can ? Math.sin(stage.time * 5 + i * 1.3) * 4 : 0)
      const sc = appear * btnSpring[i]!.value
      g.save()
      g.translate(cx, cy)
      g.scale(sc, sc)
      g.translate(-cx, -cy)
      if (can) {
        g.globalAlpha = 0.5 + 0.4 * Math.sin(stage.time * 6 + i)
        rrect(g, b.x - 8, cy - b.h / 2 - 8, b.w + 16, b.h + 16, 30, 'rgba(255,224,102,0.9)')
        g.globalAlpha = 1
      }
      rrect(g, b.x, cy - b.h / 2 + 6, b.w, b.h, 24, 'rgba(30,20,40,0.35)')
      rrect(g, b.x, cy - b.h / 2, b.w, b.h, 24, can ? item.color : '#a8b4c4', OUTLINE, 5)
      rrect(g, b.x + 10, cy - b.h / 2 + 8, b.w - 20, 26, 13, 'rgba(255,255,255,0.28)')
      g.globalAlpha = can ? 1 : 0.7
      sprite(g, item.icon, b.x + 58, cy - 16, 70, can ? Math.sin(stage.time * 4 + i) * 0.1 : 0)
      g.globalAlpha = 1
      // Level, as a badge, and an arrow that says "more".
      circle(g, b.x + b.w - 44, cy - 22, 27, '#ffffff', OUTLINE, 4)
      label(g, `${lvl + 1}`, b.x + b.w - 44, cy - 21, 30, '#2b2d42', null)
      g.beginPath()
      g.moveTo(b.x + b.w - 90, cy - 12)
      g.lineTo(b.x + b.w - 78, cy - 30)
      g.lineTo(b.x + b.w - 66, cy - 12)
      g.closePath()
      g.fillStyle = can ? '#ffffff' : 'rgba(255,255,255,0.5)'
      g.fill()
      // Price.
      rrect(g, b.x + 22, cy + 22, b.w - 44, 36, 18, 'rgba(30,20,40,0.55)')
      coinIcon(g, b.x + 50, cy + 40, 12)
      label(g, `${cost}`, b.x + b.w / 2 + 12, cy + 41, 28, can ? '#fff3bf' : '#dee2e6', null)
      g.restore()
    }
    for (const f of flying) {
      const t = ease.inOutQuad(f.t)
      const tx = sxw(CANNON_X) + 60
      const ty = syw(CANNON_Y) - 80
      sprite(g, f.icon, lerp(f.x0, tx, t), lerp(f.y0, ty, t) - Math.sin(t * Math.PI) * 80, 70 * (1 - t * 0.3), t * 6)
    }
  }

  const drawAltimeter = (g: CanvasRenderingContext2D) => {
    const x = W - 46
    const yTop = 190
    const yBot = H - 150
    const yOf = (f: number) => lerp(yBot, yTop, f)
    rrect(g, x - 9, yTop - 28, 18, yBot - yTop + 56, 9, 'rgba(30,20,40,0.28)')
    const fill = altFrac(Math.max(0, phase === 'aim' || phase === 'rewind' ? 0 : p.y))
    if (fill > 0) rrect(g, x - 5, yOf(fill), 10, yBot - yOf(fill) + 24, 5, '#ffe066')
    const marks: [string, string][] = [
      ['clouds', '☁️'],
      ['high', '✈️'],
      ['space', '⭐'],
      ['moon', '🌙'],
    ]
    marks.forEach(([key, icon], i) => {
      const y = yOf((i + 1) / 4)
      const got = reached.has(key)
      circle(g, x, y, 25, got ? '#ffffff' : 'rgba(255,255,255,0.45)', got ? '#ffd43b' : 'rgba(30,20,40,0.4)', 4)
      g.globalAlpha = got ? 1 : 0.55
      sprite(g, icon, x, y, 30)
      g.globalAlpha = 1
    })
    sprite(g, '🐧', x - 1, yOf(fill) - 4, 40)
  }

  const drawHud = (g: CanvasRenderingContext2D) => {
    // Coins, top left.
    rrect(g, 22, 24, 190, 62, 31, 'rgba(30,20,40,0.4)')
    coinIcon(g, 56, 55, 19)
    label(g, `${Math.round(shownCoins)}`, 86, 57, 38, '#fff3bf', OUTLINE, 'left')
    if (best > 0 && phase === 'aim') {
      rrect(g, 22, 96, 190, 44, 22, 'rgba(30,20,40,0.3)')
      sprite(g, '🚩', 50, 118, 28)
      label(g, `${best} m`, 74, 119, 26, '#ffffff', OUTLINE, 'left')
    }
    drawAltimeter(g)

    if (phase === 'fly' || phase === 'slide') {
      const m = Math.max(0, Math.floor(p.x / PX))
      label(g, `${m} m`, W / 2, 62, 64, '#ffffff')
      if (p.y > 250) label(g, `⬆ ${Math.round(p.y / PX)} m`, W / 2, 114, 28, '#d0ebff')
    }

    if (phase === 'stuck') {
      const t = stage.time - stuckAt
      const pop = ease.outBack(clamp(t / 0.35, 0, 1))
      g.save()
      g.translate(W / 2, 210)
      g.scale(pop, pop)
      if (newBest) label(g, 'NEW BEST!', 0, -84, 46, '#b2f2bb')
      label(g, `${lastM} m`, 0, 0, 110, '#ffffff')
      const shown = Math.round(bonus * ease.outCubic(clamp((t - 0.35) / 0.6, 0, 1)))
      if (t > 0.3) {
        coinIcon(g, -62, 92, 22)
        label(g, `+${shown}`, -30, 94, 54, '#ffe066', OUTLINE, 'left')
      }
      g.restore()
    }
  }

  const shopHint = () => {
    if (!shopOpen() || bought || stage.time - shopShownAt < 1.2) return -1
    return SHOP.findIndex((item) => coins >= price(levels[item.key]))
  }

  const drawHints = (g: CanvasRenderingContext2D) => {
    if (phase === 'aim' && aimId === -1) {
      const cheapest = shopHint()
      if (cheapest !== -1) {
        const b = btn(cheapest)
        hint(g, b.x + b.w / 2, b.y + b.h / 2 + 10, stage.time, 66)
      }
    }
    if (phase === 'fly' && !everBoosted && fuel > 0 && stage.time - flightAt > 0.7) {
      hint(g, W * 0.66, H * 0.56, stage.time, 70)
      sprite(g, '🚀', W * 0.66, H * 0.56, 56, 0.2)
    }
    // Out of fuel and never flapped: a quicker, tapping hand.
    if (phase === 'fly' && !everFlapped && fuel <= 0 && stage.time - emptyAt > 0.9 && p.y > 150) {
      hint(g, W * 0.66, H * 0.56, stage.time * 2.4, 56)
    }
  }

  // ---- the game ---------------------------------------------------------------

  const game: Game & { probe(): Record<string, number | string> } = {
    // For tuning from a script: nothing in the game reads it.
    probe: () => ({ phase, m: p.x / PX, alt: p.y, maxAlt, coins, best, runs, fuel, cannon: levels.cannon, wings: levels.wings, rocket: levels.fuel }),
    update(dt) {
      stretch.update(dt)
      recoil.update(dt)
      cannonPop.update(dt)
      peek.update(dt)
      for (const f of friendHop) {
        f.update(dt)
        if (f.value < 0) {
          f.value = 0
          f.vel = 0
        }
      }
      for (const b of btnSpring) b.update(dt)
      flap = Math.max(0, flap - dt * 3)
      // The ghost hand: pull back, hold, let go, wait.
      const idle = stage.time - lastTouchAt
      if (phase === 'aim' && aimId === -1 && shopHint() === -1 && idle > (runs === 0 ? 3 : 5)) {
        const t = (idle % 2.1) / 2.1
        const was = ghost
        ghost = t < 0.5 ? ease.outCubic(t / 0.5) : t < 0.68 ? 1 : 0
        if (was === 1 && ghost === 0) {
          recoil.value = 0.5
          peek.kick(8)
        }
      } else {
        ghost = 0
      }
      shownCoins = Math.abs(coins - shownCoins) < 0.6 ? coins : damp(shownCoins, coins, 9, dt)

      for (let i = flying.length - 1; i >= 0; i--) {
        const f = flying[i]!
        f.t += dt / 0.35
        if (f.t >= 1) {
          flying.splice(i, 1)
          cannonPop.kick(3.5)
          peek.kick(7)
          fx.ring(sxw(CANNON_X) + 60, syw(CANNON_Y) - 80, '#ffe066', 120, 0.35)
          sfx.pop(6)
        }
      }

      if (pendingBanner && stage.time - bannerAt >= 1.3) {
        const text = pendingBanner
        pendingBanner = null
        banner(text)
      }
      if (phase === 'fly' || phase === 'slide') flyStep(dt)
      else if (phase === 'stuck') {
        if (stage.time - stuckAt > 1.9) startRewind()
      } else if (phase === 'rewind') {
        rewindT = Math.min(1, rewindT + dt / 0.7)
        const t = ease.inOutCubic(rewindT)
        camX = lerp(rewindFromX, AIM_CAM_X, t)
        zoom = lerp(rewindFromZoom, 1, t)
        camAlt = damp(camAlt, 0, 12, dt)
        if (rewindT >= 1) reload()
      }
      updateCamera(dt)

      // Particles live in the world.
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i]!
        q.life -= dt
        if (q.life <= 0) {
          parts.splice(i, 1)
          continue
        }
        q.vy -= q.grav * dt
        q.x += q.vx * dt
        q.y += q.vy * dt
        if (q.grav > 0 && q.y < 0) {
          q.y = 0
          q.vy = 0
          q.vx *= 0.8
        }
      }

      // Wind streaks slide against the direction of travel.
      if (phase === 'fly' || phase === 'slide') {
        for (const s of streaks) {
          s.x -= p.vx * zoom * dt * 1.4 * s.len
          s.y += p.vy * zoom * dt * 1.4 * s.len
          if (s.x < -200) s.x += W + 300
          if (s.x > W + 200) s.x -= W + 300
          if (s.y < -100) s.y += H + 200
          if (s.y > H + 100) s.y -= H + 200
        }
      }
    },

    draw(g) {
      drawBackdrop(g)
      if (syw(ALT_MOON) > -60) drawMoon(g)
      drawGround(g)
      drawRamp(g)
      drawCannon(g)
      drawItems(g)
      drawParts(g)
      if (phase === 'fly' || phase === 'slide' || phase === 'stuck') drawFlyer(g)
      drawWind(g)
      drawAim(g)
      drawHud(g)
      drawShop(g)
      drawHints(g)
    },

    down(ptr) {
      lastTouchAt = stage.time
      fx.ring(ptr.x, ptr.y, '#ffffff', 46, 0.3)
      if (phase === 'aim') {
        if (shopOpen()) {
          for (let i = 0; i < SHOP.length; i++) {
            const b = btn(i)
            if (ptr.x >= b.x - 8 && ptr.x <= b.x + b.w + 8 && ptr.y >= b.y - 12 && ptr.y <= b.y + b.h + 16) {
              buy(i)
              shopId = ptr.id
              return
            }
          }
        }
        if (aimId !== -1) return
        aimId = ptr.id
        aimStep = 0
        aimSX = ptr.x
        aimSY = ptr.y
        readAim(ptr)
        peek.kick(5)
        sfx.pop(0)
        return
      }
      if (phase === 'fly' || phase === 'slide') {
        boostId = ptr.id
        if (fuel > 0) {
          sfx.whoosh()
          sfx.tone({ freq: 220, to: 660, dur: 0.18, type: 'sawtooth', vol: 0.1 })
          stretch.kick(3)
          puff(p.x, p.y, 8, { color: ['#ffd43b', '#ff922b', '#ffffff'], speed: 380, life: 0.4, size: 14 })
          rumbleAt = 0
        } else {
          // Out of fuel: flap. Penguins cannot fly, so every flap is a little
          // weaker than the last, until a bounce gives the flippers a rest.
          flap = 1
          const lift = 200 * 0.84 ** flaps
          if (phase === 'fly' && lift > 14) {
            if (p.vy < 700) p.vy += lift
            sfx.noise({ dur: 0.1, freq: 900, to: 2200, vol: 0.14, q: 1.2 })
            sfx.tone({ freq: 560 * 0.95 ** flaps, to: 760 * 0.95 ** flaps, dur: 0.09, type: 'sine', vol: 0.14 })
            puff(p.x, p.y - 20, 3, { color: '#ffffff', speed: 200, life: 0.5, size: 9, grav: 300, angle: -Math.PI / 2, spread: 2 })
            stretch.kick(2.5)
            flaps++
            everFlapped = true
            if (lift <= 17) say(p.x, p.y, 'PHEW!', 40, '#d0ebff')
          } else {
            sfx.noise({ dur: 0.12, freq: 600, vol: 0.18, filter: 'lowpass' })
            sfx.tone({ freq: 300, to: 200, dur: 0.08, type: 'triangle', vol: 0.1 })
            puff(p.x, p.y, 4, { color: '#adb5bd', speed: 140, life: 0.5, size: 14, grow: 1 })
          }
        }
        return
      }
      if (phase === 'stuck') {
        if (stage.time - stuckAt > 0.45) startRewind()
        else sfx.pop(1)
        return
      }
      sfx.pop(3)
    },

    move(ptr) {
      lookX = clamp((ptr.x - sxw(CANNON_X)) / 400, -1, 1)
      lookY = clamp((ptr.y - syw(CANNON_Y)) / 300, -1, 1)
      if (phase !== 'aim') return
      if (aimId === -1 && ptr.id !== shopId) {
        // A finger that was already down when the cannon reloaded (held from
        // the flight, or dragging through the rewind) starts an aim from here.
        // Not the finger that just pressed a shop button, though.
        aimId = ptr.id
        aimStep = 0
        aimSX = ptr.x
        aimSY = ptr.y
      }
      if (ptr.id === aimId) readAim(ptr)
    },

    up(ptr) {
      if (ptr.id === boostId) boostId = -1
      if (ptr.id === shopId) shopId = -1
      if (ptr.id !== aimId) return
      aimId = -1
      if (phase !== 'aim') return
      readAim(ptr)
      if (aimPower >= 0.1) {
        fire()
      } else {
        // A tap: the penguin pops up to see who is there.
        aimPower = 0
        peek.kick(11)
        cannonPop.kick(2)
        for (const f of friendHop) f.kick(300 + Math.random() * 200)
        sfx.boing(Math.floor(Math.random() * 3))
        lastTouchAt = stage.time - 2.5
      }
    },
  }
  return game
}

export const proto: Proto = {
  meta: {
    key: 'rocket-penguin',
    name: 'Rocket Penguin',
    emoji: '🐧',
    ages: [6, 10],
    pitch: 'Fire a penguin out of a cannon, rocket-boost over the snow, bounce off seals, and buy a bigger cannon to go further.',
    howTo: 'Drag back and let go to launch. Hold to fire the rocket; tap to flap when it runs dry. Tap an upgrade between launches.',
    basedOn: 'Learn to Fly, Burrito Bison, Kitten Cannon',
    whyFun: 'Launch and upgrade with numbers that go up: every run buys something, so the next one goes visibly further, up through the clouds and into space.',
  },
  create,
}
