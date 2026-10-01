// Feed the Monster: drag (or just tap) silly food into a big jelly monster.
// Every food gets its own reaction, the belly grows, and a full belly ends in
// a giant burp or a rocket toot. No wrong food, no fail, no score.

import { blinkAt, circle, ellipse, eyes, rrect, shadow, sprite, star, volume } from '../../kit/draw.ts'
import { TAU, clamp, damp, dist, ease, lerp, remap, rnd, rndInt, spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { SHELF_Y, makeBackdrop } from './backdrop.ts'

type Kind = 'yum' | 'hot' | 'cold' | 'yuck' | 'burp' | 'toot' | 'sour' | 'sugar' | 'melon' | 'balloon' | 'rainbow' | 'ghost'
type Eye = 'normal' | 'wide' | 'happy' | 'squeeze' | 'dizzy' | 'shifty'
type Mouth = 'auto' | 'grimace' | 'pucker' | 'wavy' | 'bleh'
type Rgb = [number, number, number]

interface FoodDef {
  char: string
  kind: Kind
  crumbs: readonly string[]
  rare?: boolean
  size?: number
}

const f = (char: string, kind: Kind, crumbs: readonly string[], rare = false, size = 92): FoodDef => ({ char, kind, crumbs, rare, size })

const SLOT_FOODS: readonly (readonly FoodDef[])[] = [
  [f('🍰', 'yum', ['#fff3d6', '#ff8fb8', '#ffd1e8']), f('🍩', 'yum', ['#ff9ecb', '#f2c48a', '#ffffff']), f('🧁', 'yum', ['#ffd1e8', '#c9a0ff', '#fff3d6'])],
  [f('🌶️', 'hot', ['#ff3b1f', '#ff8c1a', '#3aa845'])],
  [f('🍦', 'cold', ['#ffffff', '#fff3d6', '#e0b26e']), f('🍧', 'cold', ['#ff8fa3', '#9ad8ff', '#ffffff'])],
  [f('🧦', 'yuck', ['#d9d9d9', '#9bc25a', '#6f8f3a']), f('🐟', 'yuck', ['#7fb6d9', '#9bc25a', '#d9eef7']), f('🥾', 'yuck', ['#9a6a3c', '#9bc25a', '#5c3d20'])],
  [f('🥤', 'burp', ['#ff5d5d', '#ffffff', '#ffd9d9'])],
  [f('🫘', 'toot', ['#a1452f', '#c96a4a', '#7a2f1f'])],
  [f('🍋', 'sour', ['#ffe14d', '#fff7a8', '#ffd000'])],
  [f('🍭', 'sugar', ['#ff7ac8', '#4db8ff', '#ffe14d']), f('🍬', 'sugar', ['#ff5d5d', '#ffffff', '#5ed36a'])],
]

const RARES: readonly FoodDef[] = [
  f('🍉', 'melon', ['#ff4d6d', '#2e9e4f', '#1e1428'], true, 124),
  f('🎈', 'balloon', ['#ff5d5d', '#ff9a9a', '#ffffff'], true, 112),
  f('🌈', 'rainbow', ['#ff5d5d', '#ffe14d', '#4db8ff'], true, 116),
  f('👻', 'ghost', ['#ffffff', '#e6ecff', '#c9d4ff'], true, 108),
]

const PALETTES: readonly Rgb[] = [
  [156, 108, 246],
  [48, 190, 172],
  [255, 148, 64],
  [244, 104, 168],
  [98, 192, 98],
]
const RAINBOW = ['#ff5d5d', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff']

const BX = W / 2
const BY = 772
// Body centre height above the feet; also the pivot for spins.
const C = 225
const FULL = 7
const GRAV = 5200
const REST_Y = 728

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const css = (c: Rgb, a = 1): string => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
const hsl = (h: number, s: number, l: number): Rgb => {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const ch = (n: number) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))
  return [ch(0), ch(8), ch(4)]
}
const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [40, 20, 50]

interface Food {
  def: FoodDef
  state: 'shelf' | 'held' | 'loose' | 'tongue'
  slot: number
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  grow: number
  born: number
  age: number
  rest: number
  rejected: boolean
  tapped: boolean
  pid: number
  heldAt: number
  phase: number
  size: number
}

interface Slot {
  x: number
  y: number
  food: Food | null
  cycle: number
  hop: ReturnType<typeof spring>
}

interface Reaction {
  kind: Kind
  t: number
  dur: number
  def: FoodDef
  n: number
}

interface Mega {
  t: number
  kind: 'burp' | 'rocket'
  landedAt: number
}

interface Tongue {
  phase: 'out' | 'back'
  t: number
  dur: number
  tx: number
  ty: number
  food: Food | null
  target: Food | null
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const backdrop = makeBackdrop()

  const slots: Slot[] = SLOT_FOODS.map((_, i) => ({ x: 105 + i * 138.5, y: 100, food: null, cycle: 0, hop: spring(0, 200, 9) }))
  const foods: Food[] = []
  const modes = new Map<number, { kind: 'hold'; food: Food } | { kind: 'tickle'; acc: number } | { kind: 'air'; acc: number }>()

  // The monster's springs: everything that makes it jelly.
  const M = {
    squash: spring(1, 170, 8),
    lean: spring(0, 110, 7),
    belly: spring(0, 130, 7),
    big: spring(1, 150, 9),
    arm: spring(0, 160, 12),
    wob: spring(0, 140, 5),
  }
  let jy = 0
  let jvy = 0
  let open = 0.3
  let mouthX = 0
  let mouthY = 0
  let lookX = 0
  let lookY = -0.6
  let bodyCol: Rgb = [...PALETTES[0]!]
  let tintCol: Rgb = [255, 255, 255]
  let tintA = 0
  let cheeks = 0
  // What is actually drawn this frame (smoothed), so toWorld matches the picture.
  const cur = { ox: 0, oy: 0, rot: 0, big: 1, sx: 1, sy: 1, shear: 0, shiver: 0, alpha: 1, dark: 0, pinch: 0 }
  const pose = {
    tint: null as Rgb | null,
    tintAmt: 0,
    eye: 'normal' as Eye,
    mouth: 'auto' as Mouth,
    open: -1,
    cheeks: 0,
    shiver: 0,
    ox: 0,
    oy: 0,
    rot: 0,
    alpha: 1,
    big: 1,
    arms: 0,
    hue: -1,
    dark: 0,
    pinch: 0,
    snap: false,
  }

  let react: Reaction | null = null
  let mega: Mega | null = null
  let megaCount = 0
  let tongue: Tongue | null = null
  let chewT = -1
  let chewDef: FoodDef | null = null
  let gulpT = -1
  let bellyCount = 0
  let eaten = 0
  let rareDue = 0
  let rareIndex = 0
  let lastTouchAt = -2.5
  let lastEatAt = -10
  let lastTickleAt = -10
  let tickleStreak = 0
  let happyUntil = 0
  let idleLook = 0
  let rainbowT = -1
  let wasNear = false
  const stuckSeeds: { x: number; y: number; rot: number }[] = []
  const flyingSeeds: { x0: number; y0: number; x1: number; y1: number; t: number; i: number }[] = []
  const timers = new Map<string, number>()

  const every = (key: string, interval: number, dt: number, fn: () => void) => {
    let acc = (timers.get(key) ?? 0) + dt
    let guard = 0
    while (acc >= interval && guard++ < 6) {
      acc -= interval
      fn()
    }
    timers.set(key, acc)
  }

  const toWorld = (lx: number, ly: number): [number, number] => {
    const b = ly * cur.sy * cur.big
    const a = lx * cur.sx * cur.big + cur.shear * b
    const py = b + C
    const cos = Math.cos(cur.rot)
    const sin = Math.sin(cur.rot)
    return [BX + cur.ox + cur.shiver + a * cos - py * sin, BY - jy + cur.oy - C + a * sin + py * cos]
  }
  const mouthWorld = (): [number, number] => toWorld(mouthX, -272 + mouthY + 36 * clamp(open, 0, 1))
  const bodyRx = () => 200 + 52 * clamp(M.belly.value, -0.2, 1.6)
  const busy = () => mega !== null || (react !== null && react.kind === 'balloon')

  // ---- sound helpers -------------------------------------------------------

  const burpSound = (dur: number, vol: number, base = 112) => {
    sfx.tone({ freq: base, to: base * 0.58, dur, type: 'sawtooth', vol: 0.24 * vol, attack: 0.02 })
    sfx.tone({ freq: base * 1.5, to: base * 0.8, dur: dur * 0.85, type: 'square', vol: 0.08 * vol, delay: 0.02 })
    sfx.noise({ dur, vol: 0.16 * vol, freq: 520, to: 180, filter: 'lowpass' })
  }
  const tootSound = (dur: number, vol: number) => {
    sfx.tone({ freq: 84, to: 156, dur: dur * 0.4, type: 'sawtooth', vol: 0.24 * vol })
    sfx.tone({ freq: 156, to: 62, dur: dur * 0.6, type: 'sawtooth', vol: 0.24 * vol, delay: dur * 0.38 })
    sfx.noise({ dur, vol: 0.12 * vol, freq: 320, to: 140, filter: 'bandpass', q: 3 })
  }
  const arpeggio = (from: number, count: number, gap: number, type: 'sine' | 'triangle' | 'square' = 'triangle', vol = 0.14) => {
    for (let i = 0; i < count; i++) sfx.tone({ freq: sfx.scale(from + i), dur: 0.16, type, vol, delay: i * gap })
  }
  const giggle = (step: number) => {
    for (let i = 0; i < 3; i++) sfx.tone({ freq: sfx.scale(7 + step - i), dur: 0.07, type: 'triangle', vol: 0.12, delay: 0.04 + i * 0.075 })
  }

  // ---- shelf ---------------------------------------------------------------

  const spawn = (index: number, def: FoodDef, quiet = false) => {
    const slot = slots[index]!
    const food: Food = {
      def,
      state: 'shelf',
      slot: index,
      x: slot.x,
      y: slot.y,
      vx: 0,
      vy: 0,
      rot: 0,
      grow: quiet ? 1 : 0,
      born: quiet ? -9 : stage.time,
      age: 0,
      rest: 0,
      rejected: false,
      tapped: false,
      pid: -1,
      heldAt: 0,
      phase: rnd(0, TAU),
      size: def.size ?? 92,
    }
    slot.food = food
    foods.push(food)
    if (quiet) return
    if (def.rare) {
      sfx.ding(4)
      stage.after(0.12, () => sfx.ding(7))
      stage.after(0.24, () => sfx.ding(9))
      fx.ring(slot.x, slot.y, '#ffe14d', 110, 0.5)
      fx.burst(slot.x, slot.y, { count: 18, color: ['#ffe14d', '#ffffff', '#ffb02e'], shape: 'star', speed: 420, life: 0.8, size: 16 })
      slot.hop.kick(-500)
    } else {
      sfx.pop(rndInt(0, 4))
      fx.burst(slot.x, slot.y, { count: 6, color: '#ffffff', speed: 200, life: 0.35, size: 8 })
    }
  }

  const regrow = (index: number) => {
    const slot = slots[index]!
    if (slot.food) return
    if (rareDue > 0) {
      rareDue--
      spawn(index, RARES[rareIndex % RARES.length]!)
      rareIndex++
      return
    }
    const list = SLOT_FOODS[index]!
    slot.cycle++
    spawn(index, list[slot.cycle % list.length]!)
  }

  SLOT_FOODS.forEach((list, i) => spawn(i, list[0]!, true))

  const removeFood = (food: Food) => {
    const at = foods.indexOf(food)
    if (at >= 0) foods.splice(at, 1)
    for (const [id, mode] of modes) if (mode.kind === 'hold' && mode.food === food) modes.delete(id)
  }

  // ---- eating --------------------------------------------------------------

  const settle = () => {
    // A food still being chewed when the next arrives just drops to the belly.
    if (chewDef && chewDef.kind !== 'yuck') {
      bellyCount++
      M.belly.target = bellyCount / FULL
    }
    chewDef = null
  }

  const eat = (food: Food) => {
    removeFood(food)
    if (food.slot >= 0) {
      const index = food.slot
      slots[index]!.food = slots[index]!.food === food ? null : slots[index]!.food
      stage.after(0.75, () => regrow(index))
    }
    settle()
    const [mx, my] = mouthWorld()
    chewT = 0
    chewDef = food.def
    gulpT = -1
    open = 0
    eaten++
    lastEatAt = stage.time
    if (eaten >= 4 && (eaten - 4) % 5 === 0) rareDue++
    M.squash.value = 0.86
    M.squash.kick(2)
    M.wob.kick(3)
    sfx.chomp()
    fx.hitstop(35)
    fx.burst(mx, my, { count: food.def.rare ? 22 : 14, color: food.def.crumbs, speed: 420, life: 0.6, size: 11, gravity: 1400 })
  }

  const startReaction = (def: FoodDef) => {
    const durs: Record<Kind, number> = { yum: 1.3, hot: 2.5, cold: 2.0, yuck: 1.6, burp: 1.6, toot: 1.7, sour: 1.5, sugar: 2.0, melon: 2.4, balloon: 3.4, rainbow: 2.8, ghost: 2.6 }
    react = { kind: def.kind, t: 0, dur: durs[def.kind], def, n: 0 }
    timers.clear()
  }

  const spit = (def: FoodDef) => {
    const [mx, my] = mouthWorld()
    const side = Math.random() < 0.5 ? -1 : 1
    const food: Food = {
      def,
      state: 'loose',
      slot: -1,
      x: mx,
      y: my,
      vx: side * rnd(1000, 1500),
      vy: -rnd(350, 700),
      rot: 0,
      grow: 1,
      born: -9,
      age: 0,
      rest: 0,
      rejected: true,
      tapped: false,
      pid: -1,
      heldAt: 0,
      phase: 0,
      size: def.size ?? 92,
    }
    foods.push(food)
    sfx.splat()
    sfx.whoosh()
    sfx.tone({ freq: 700, to: 180, dur: 0.18, type: 'square', vol: 0.12 })
    fx.burst(mx, my, { count: 16, color: ['#9bc25a', '#c9e27a', '#6f8f3a'], speed: 700, angle: side > 0 ? 0 : Math.PI, spread: 1.0, life: 0.6, size: 12, gravity: 1200 })
    fx.text(mx, my - 150, 'YUCK!', { color: '#c9f27a', size: 64 })
    fx.shake(7, 0.25)
    M.lean.kick(-side * 2.2)
    M.squash.kick(-4)
  }

  const land = (speed: number) => {
    if (speed < 250) return
    M.squash.value = clamp(1 - speed / 3400, 0.55, 0.95)
    M.wob.kick(speed / 250)
    sfx.thud(clamp(speed / 1500, 0.3, 1))
    fx.burst(BX + cur.ox, BY, { count: clamp(Math.round(speed / 120), 6, 26), color: '#ffffff', speed: 200 + speed * 0.25, angle: -Math.PI / 2, spread: Math.PI * 0.9, life: 0.5, size: 12 })
    if (speed > 1500) {
      fx.shake(16, 0.4)
      fx.ring(BX, BY, '#ffffff', 300, 0.45)
      for (const slot of slots) slot.hop.kick(-rnd(350, 650))
      if (mega && mega.landedAt < 0) {
        mega.landedAt = mega.t
        sfx.fanfare()
        fx.confetti(BX, 260, 70)
      }
    }
  }

  const startMega = () => {
    mega = { t: 0, kind: megaCount % 2 === 0 ? 'burp' : 'rocket', landedAt: -1 }
    react = null
    timers.clear()
  }

  // ---- touch ---------------------------------------------------------------

  const insideMonster = (x: number, y: number) => {
    const cx = BX + cur.ox
    const cy = BY - jy + cur.oy - C * cur.big
    const rx = bodyRx() * cur.big * 1.04
    const ry = 232 * cur.big * 1.04
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
  }

  const tickle = (x: number, y: number) => {
    tickleStreak = stage.time - lastTickleAt < 0.9 ? tickleStreak + 1 : 0
    lastTickleAt = stage.time
    happyUntil = stage.time + 0.55
    const side = x < BX + cur.ox ? -1 : 1
    M.lean.kick(side * 1.6)
    M.squash.kick(rnd(2.5, 4) * (tickleStreak % 2 === 0 ? 1 : -1))
    M.wob.kick(4)
    M.arm.kick(5)
    sfx.boing(Math.min(tickleStreak, 9))
    giggle(Math.min(tickleStreak, 6))
    fx.burst(x, y, { count: 7, color: ['#ffe14d', '#ffffff', '#ff9ecb'], shape: 'star', speed: 320, life: 0.5, size: 13 })
    fx.ring(x, y, '#ffffff', 60, 0.3)
    const bellyY = BY - jy - 110
    if (bellyCount >= 3 && Math.abs(y - bellyY) < 95 && Math.abs(x - BX) < 140) {
      // Squeezing a full belly lets a little one out.
      const [mx, my] = mouthWorld()
      burpSound(0.16, 0.7, 170)
      open = 0.9
      fx.burst(mx, my, { count: 8, color: ['#d8ff9a', '#ffffff'], shape: 'ring', speed: 300, angle: -Math.PI / 2, spread: 1.4, life: 0.7, size: 12, gravity: -200 })
    }
    if (tickleStreak > 0 && tickleStreak % 6 === 5) {
      fx.text(BX, 240, 'HA HA HA!', { color: '#fff3b0', size: 60 })
      jvy = 800
      jy = Math.max(jy, 0.01)
      fx.confetti(BX, 300, 24)
    }
  }

  const lick = (x: number, y: number) => {
    fx.ring(x, y, '#ffffff', 56, 0.3)
    if (tongue || busy()) {
      sfx.pop(rndInt(0, 5))
      fx.burst(x, y, { count: 5, color: '#ffffff', speed: 220, life: 0.35, size: 8 })
      return
    }
    const [mx, my] = mouthWorld()
    tongue = { phase: 'out', t: 0, dur: 0.07 + dist(mx, my, x, y) / 7000, tx: x, ty: y, food: null, target: null }
    sfx.tone({ freq: 320, to: 980, dur: 0.1, type: 'triangle', vol: 0.16 })
  }

  const release = (food: Food, p: Pointer | undefined) => {
    const quick = stage.time - food.heldAt < 0.24 && (!p || dist(p.x, p.y, p.startX, p.startY) < 28)
    const [mx, my] = mouthWorld()
    food.pid = -1
    if (p) {
      food.x = p.x
      food.y = p.y - 30
    }
    if (!busy() && dist(food.x, food.y, mx, my) < 190) {
      eat(food)
      return
    }
    food.state = 'loose'
    food.age = 0
    food.rest = 0
    food.tapped = quick
    food.vx = quick ? 0 : clamp(p?.vx ?? 0, -1900, 1900)
    food.vy = quick ? -320 : clamp(p?.vy ?? 0, -1900, 1900)
    if (!quick && Math.hypot(food.vx, food.vy) > 500) sfx.whoosh()
  }

  // ---- reactions -----------------------------------------------------------

  const runReaction = (r: Reaction, dt: number) => {
    const prev = r.t
    r.t += dt
    const t = r.t
    const at = (when: number) => prev <= when && t > when
    const [mx, my] = mouthWorld()
    const [hx, hy] = toWorld(0, -440)

    switch (r.kind) {
      case 'yum': {
        pose.eye = 'happy'
        pose.arms = 1
        pose.rot = Math.sin(t * 15) * 0.075 * (1 - t / r.dur)
        if (at(0)) {
          fx.burst(hx, hy + 40, { count: 14, color: ['#ff5d8f', '#ff9ecb', '#ff3b6b'], shape: 'heart', speed: 520, angle: -Math.PI / 2, spread: 2.4, life: 1.2, size: 46, gravity: -120, drag: 0.95 })
          fx.text(hx, Math.max(236, hy - 60), 'YUM!', { color: '#ffd1e8', size: 70 })
          arpeggio(2, 4, 0.08)
          jvy = 620
          jy = 0.01
        }
        if (at(0.45)) fx.burst(hx, hy + 40, { count: 8, color: ['#ff5d8f', '#ff9ecb'], shape: 'heart', speed: 380, angle: -Math.PI / 2, spread: 2.8, life: 1.1, size: 38, gravity: -120, drag: 0.95 })
        break
      }
      case 'hot': {
        pose.tint = [246, 58, 44]
        if (t < 0.55) {
          pose.tintAmt = t / 0.55
          pose.eye = 'wide'
          pose.cheeks = 0.8
          pose.shiver = 2 + t * 8
          pose.mouth = 'wavy'
          if (at(0)) {
            sfx.tone({ freq: 380, to: 1500, dur: 0.55, type: 'sine', vol: 0.14 })
            fx.burst(hx, hy + 60, { count: 8, color: '#8fd8ff', speed: 300, angle: -Math.PI / 2, spread: 2.4, life: 0.6, size: 11, gravity: 900 })
          }
        } else if (t < 1.8) {
          pose.tintAmt = 1
          pose.eye = 'squeeze'
          pose.open = 1.25
          pose.arms = 0.5 + 0.5 * Math.sin(t * 34)
          pose.shiver = 4
          if (at(0.55)) {
            fx.flash('#ff7a1a', 0.28, 0.25)
            fx.shake(9, 1.1)
            fx.text(hx, Math.max(236, hy - 70), 'HOT HOT HOT!', { color: '#ffb02e', size: 62 })
            sfx.noise({ dur: 1.25, vol: 0.32, freq: 500, to: 1300, filter: 'lowpass' })
            sfx.tone({ freq: 1700, to: 2300, dur: 1.1, type: 'sine', vol: 0.06 })
          }
          const sweep = -Math.PI / 2 + Math.sin(t * 5.5) * 1.15
          every('fire', 0.022, dt, () =>
            fx.burst(mx, my, { count: 3, color: ['#ffe14d', '#ff8c1a', '#ff3b1f', '#ffb02e'], speed: 1000, angle: sweep, spread: 0.45, life: 0.6, size: 64, gravity: -500, drag: 0.95 }),
          )
          every('steam', 0.07, dt, () => {
            for (const side of [-1, 1]) {
              const [ex, ey] = toWorld(side * 150, -400)
              fx.burst(ex, ey, { count: 1, color: '#ffffff', speed: 420, angle: -Math.PI / 2 + side * 0.9, spread: 0.4, life: 0.7, size: 40, gravity: -300, drag: 0.94 })
            }
          })
        } else {
          pose.tintAmt = 1 - (t - 1.8) / 0.7
          pose.eye = 'dizzy'
          pose.mouth = 'bleh'
          pose.open = 0.5
          if (at(1.8)) {
            sfx.slideDown()
            fx.burst(mx, my, { count: 10, color: ['#8a8a8a', '#c4c4c4'], speed: 220, angle: -Math.PI / 2, spread: 1.2, life: 1.0, size: 46, gravity: -160, drag: 0.93 })
          }
        }
        break
      }
      case 'cold': {
        pose.tint = [150, 210, 255]
        pose.tintAmt = t < 1.5 ? Math.min(1, t / 0.25) : 1 - (t - 1.5) / 0.5
        pose.mouth = t < 1.5 ? 'grimace' : 'auto'
        pose.eye = t < 1.5 ? 'squeeze' : 'wide'
        pose.shiver = t < 1.5 ? rnd(-7, 7) : 0
        pose.snap = true
        pose.pinch = t < 1.5 ? 0.5 : 0
        if (at(0)) {
          fx.text(hx, Math.max(236, hy - 60), 'BRRRR!', { color: '#c9efff', size: 68 })
          sfx.ding(8)
          sfx.ding(11)
          fx.burst(hx, hy + 120, { count: 18, color: ['#ffffff', '#c9efff', '#8fd8ff'], shape: 'star', speed: 460, life: 0.9, size: 28 })
          fx.flash('#c9efff', 0.25, 0.2)
        }
        if (t < 1.4) {
          every('chatter', 0.075, dt, () => sfx.tick())
          every('snow', 0.06, dt, () => fx.burst(hx + rnd(-230, 230), hy + rnd(-20, 120), { count: 1, color: ['#ffffff', '#c9efff'], shape: 'star', speed: 60, life: 1.0, size: 24, gravity: 380 }))
        }
        if (at(1.5)) {
          M.squash.kick(6)
          M.wob.kick(8)
          sfx.pop(5)
          fx.burst(hx, hy + 200, { count: 20, color: ['#ffffff', '#c9efff'], speed: 520, life: 0.6, size: 10 })
        }
        break
      }
      case 'yuck': {
        pose.tint = [150, 196, 74]
        if (t < 0.6) {
          pose.tintAmt = Math.min(1, t / 0.3)
          pose.cheeks = 0.6 + t * 1.2
          pose.eye = 'wide'
          pose.mouth = 'wavy'
          pose.shiver = rnd(-3, 3)
          pose.snap = true
          if (at(0)) sfx.tone({ freq: 190, to: 105, dur: 0.5, type: 'square', vol: 0.12 })
        } else {
          pose.tintAmt = clamp(1 - (t - 0.8) / 0.8, 0, 1)
          pose.eye = 'squeeze'
          pose.mouth = 'bleh'
          pose.open = 0.6
          if (at(0.6)) spit(r.def)
        }
        break
      }
      case 'burp': {
        if (t < 0.75) {
          pose.cheeks = ease.outCubic(t / 0.75) * 1.4
          pose.eye = 'wide'
          pose.big = 1 + 0.07 * (t / 0.75)
          pose.mouth = 'wavy'
          if (at(0)) sfx.noise({ dur: 0.75, vol: 0.14, freq: 3200, to: 5200, filter: 'highpass' })
          every('fizz', 0.05, dt, () => fx.burst(BX + rnd(-150, 150), BY - jy - rnd(60, 260), { count: 1, color: ['#ffffff', '#ffd9d9'], shape: 'ring', speed: 60, angle: -Math.PI / 2, spread: 0.5, life: 0.5, size: 18, gravity: -400 }))
        } else if (t < 1.25) {
          pose.open = 1.15
          pose.eye = 'squeeze'
          if (at(0.75)) {
            burpSound(0.5, 1)
            fx.text(mx, my - 210, 'BURP!', { color: '#fff3b0', size: 76 })
            fx.shake(8, 0.3)
            M.squash.kick(-5)
            M.wob.kick(7)
            fx.burst(mx, my, { count: 22, color: ['#ffffff', '#ffd9d9', '#ff9a9a'], shape: 'ring', speed: 560, angle: -Math.PI / 2, spread: 1.9, life: 1.2, size: 34, gravity: -260, drag: 0.95 })
          }
        } else {
          pose.eye = 'happy'
          if (at(1.25)) giggle(2)
        }
        break
      }
      case 'toot': {
        if (t < 0.65) {
          pose.eye = 'shifty'
          pose.shiver = Math.sin(t * 60) * 2.5
          pose.snap = true
          pose.mouth = 'wavy'
          if (at(0)) sfx.tone({ freq: 62, to: 98, dur: 0.6, type: 'sawtooth', vol: 0.2 })
        } else {
          pose.eye = t < 1.0 ? 'wide' : 'happy'
          pose.cheeks = 0.3
          if (at(0.65)) {
            const side = r.n++ % 2 === 0 ? -1 : 1
            tootSound(0.5, 1)
            jvy = 1050
            jy = 0.01
            M.squash.kick(6)
            const cx = BX - side * 150
            fx.burst(cx, BY - 50, { count: 26, color: ['#c9e27a', '#e6f2a0', '#a9c94a'], speed: 520, angle: side > 0 ? Math.PI * 1.1 : -Math.PI * 0.1, spread: 1.1, life: 1.2, size: 72, gravity: -120, drag: 0.9 })
            fx.text(cx - side * 120, BY - 170, 'TOOT!', { color: '#e6f2a0', size: 70 })
            fx.shake(6, 0.25)
          }
          if (at(1.05)) giggle(4)
        }
        break
      }
      case 'sour': {
        if (t < 0.95) {
          pose.eye = 'squeeze'
          pose.mouth = 'pucker'
          pose.pinch = 1
          pose.shiver = rnd(-4, 4)
          pose.snap = true
          pose.tint = [255, 224, 60]
          pose.tintAmt = 0.92
          if (at(0)) {
            sfx.tone({ freq: 480, to: 2000, dur: 0.32, type: 'sine', vol: 0.16 })
            fx.text(hx, Math.max(236, hy - 60), 'SOUR!', { color: '#fff36b', size: 70 })
            fx.burst(hx, hy + 130, { count: 18, color: ['#ffe14d', '#fff7a8'], shape: 'spark', speed: 620, life: 0.5, size: 34 })
          }
        } else {
          pose.eye = 'dizzy'
          if (at(0.95)) {
            M.lean.kick(3)
            M.squash.kick(6)
            M.wob.kick(8)
            sfx.boing(3)
          }
        }
        break
      }
      case 'sugar': {
        if (t < 1.65) {
          pose.eye = 'dizzy'
          pose.arms = 1
          pose.ox = Math.sin(t * 8) * 150
          pose.rot = Math.sin(t * 19) * 0.09
          if (at(0)) {
            arpeggio(0, 9, 0.06, 'square', 0.07)
            fx.text(hx, Math.max(236, hy - 60), 'WHEEE!', { color: '#ffd1f0', size: 70 })
          }
          if (jy === 0) {
            jvy = 1150
            jy = 0.01
            sfx.boing(2 + r.n++)
          }
          every('stars', 0.05, dt, () => fx.burst(BX + cur.ox + rnd(-180, 180), BY - jy - rnd(80, 420), { count: 1, color: RAINBOW, shape: 'star', speed: 200, life: 0.6, size: 30 }))
        } else {
          pose.eye = 'happy'
        }
        break
      }
      case 'melon': {
        const total = 16
        if (t < 0.45) {
          pose.cheeks = 1.5
          pose.eye = 'wide'
          pose.big = 1.08
          pose.mouth = 'wavy'
          if (at(0)) sfx.tone({ freq: 160, to: 260, dur: 0.4, type: 'triangle', vol: 0.18 })
        } else if (r.n < total) {
          pose.cheeks = 1.5 * (1 - r.n / total)
          pose.mouth = 'pucker'
          pose.eye = 'squeeze'
          every('seed', 0.085, dt, () => {
            if (r.n >= total) return
            const i = r.n++
            const side = i % 2 === 0 ? -1 : 1
            flyingSeeds.push({ x0: mx, y0: my, x1: BX + side * rnd(300, 560), y1: rnd(200, 600), t: 0, i })
            sfx.tone({ freq: 900, to: 380, dur: 0.045, type: 'square', vol: 0.1 })
            M.lean.kick(-side * 0.9)
            M.squash.kick(1.6)
          })
        } else {
          pose.eye = 'happy'
          if (r.n === total) {
            r.n++
            fx.text(hx, Math.max(236, hy - 60), 'PTOO!', { color: '#ffb3c1', size: 70 })
            stage.after(0.2, () => sfx.win())
          }
        }
        break
      }
      case 'balloon': {
        if (t < 1.0) {
          pose.big = 1 + 0.36 * ease.outCubic(t)
          pose.oy = -120 * ease.inOutQuad(t)
          pose.cheeks = 1.3
          pose.eye = 'wide'
          pose.mouth = 'pucker'
          pose.rot = Math.sin(t * 5) * 0.06
          if (at(0)) sfx.tone({ freq: 240, to: 950, dur: 1.0, type: 'sine', vol: 0.15, attack: 0.05 })
        } else if (t < 2.4) {
          const u = (t - 1) / 1.4
          pose.big = lerp(1.36, 0.8, u)
          pose.ox = Math.sin(u * TAU * 1.6) * 400
          pose.oy = -200 - Math.sin(u * TAU * 2.3 + 0.2) * 150
          pose.rot = u * TAU * 3
          pose.snap = true
          pose.eye = 'squeeze'
          pose.mouth = 'pucker'
          if (at(1.0)) {
            sfx.noise({ dur: 1.4, vol: 0.3, freq: 1600, to: 300, filter: 'bandpass', q: 2 })
            sfx.tone({ freq: 430, to: 110, dur: 1.4, type: 'sawtooth', vol: 0.12 })
            fx.text(BX, 260, 'PFFFFFT!', { color: '#ffffff', size: 76 })
          }
          every('puff', 0.028, dt, () => {
            const [px, py] = toWorld(0, -20)
            fx.burst(px, py, { count: 1, color: ['#ffffff', '#ffe0e0'], speed: 120, life: 0.5, size: 40 })
          })
        } else {
          pose.eye = 'dizzy'
          if (at(2.4)) {
            // Drop out of the air wherever it ended up.
            cur.rot = 0
            jy = Math.max(0.01, -cur.oy)
            cur.oy = 0
            jvy = 0
          }
        }
        break
      }
      case 'rainbow': {
        pose.hue = (t * 520) % 360
        pose.eye = 'happy'
        pose.arms = 1
        pose.rot = Math.sin(t * 10) * 0.06
        if (at(0)) {
          rainbowT = 0
          arpeggio(0, 10, 0.09, 'sine', 0.16)
          fx.text(hx, Math.max(236, hy - 60), 'WOW!', { color: '#ffffff', size: 80 })
          fx.flash('#ffffff', 0.3, 0.25)
        }
        if (at(0.9)) {
          fx.confetti(BX, 240, 50)
          jvy = 900
          jy = 0.01
        }
        every('stars', 0.045, dt, () => fx.burst(BX + rnd(-260, 260), BY - jy - rnd(40, 470), { count: 1, color: RAINBOW, shape: 'star', speed: 240, life: 0.7, size: 32 }))
        break
      }
      case 'ghost': {
        pose.dark = t < 2.2 ? Math.min(0.5, t * 2) : 0
        pose.alpha = t < 2.2 ? 0.6 : 1
        pose.tint = [236, 242, 255]
        pose.tintAmt = t < 2.2 ? 1 : 0
        pose.oy = t < 2.2 ? -70 - Math.sin(t * 4) * 22 : 0
        pose.ox = t < 2.2 ? Math.sin(t * 2.6) * 70 : 0
        pose.eye = 'wide'
        pose.arms = 1
        pose.open = t > 1.2 && t < 1.8 ? 1.2 : 0.4
        if (at(0)) {
          sfx.tone({ freq: 400, to: 660, dur: 0.6, type: 'sine', vol: 0.15, attack: 0.08 })
          sfx.tone({ freq: 660, to: 340, dur: 0.7, type: 'sine', vol: 0.15, delay: 0.55, attack: 0.05 })
        }
        if (at(1.2)) {
          M.big.kick(5)
          fx.text(hx, Math.max(236, hy - 40), 'BOO!', { color: '#ffffff', size: 96 })
          sfx.thud(1)
          sfx.tone({ freq: 220, to: 90, dur: 0.4, type: 'square', vol: 0.14 })
          fx.shake(9, 0.3)
          fx.flash('#ffffff', 0.25, 0.15)
          for (const slot of slots) slot.hop.kick(-rnd(400, 700))
        }
        if (at(2.2)) {
          sfx.pop(4)
          giggle(3)
          fx.burst(BX + cur.ox, BY - 300, { count: 22, color: ['#ffffff', '#e6ecff'], speed: 520, life: 0.6, size: 16 })
        }
        break
      }
    }
    if (r.t >= r.dur) react = null
  }

  const runMega = (m: Mega, dt: number) => {
    const prev = m.t
    m.t += dt
    const t = m.t
    const at = (when: number) => prev <= when && t > when
    const [mx, my] = mouthWorld()
    if (t < 0.95) {
      const u = t / 0.95
      pose.shiver = rnd(-1, 1) * (2 + 7 * u)
      pose.snap = true
      pose.eye = m.kind === 'burp' ? 'wide' : 'shifty'
      pose.cheeks = m.kind === 'burp' ? u * 1.5 : 0.3
      pose.big = 1 + 0.12 * u
      pose.mouth = 'wavy'
      pose.arms = u
      for (let i = 0; i < 3; i++) if (at(i * 0.3)) sfx.tone({ freq: 58 + i * 16, to: 92 + i * 22, dur: 0.28, type: 'sawtooth', vol: 0.2 })
      if (at(0)) fx.text(BX, 240, 'UH OH...', { color: '#ffffff', size: 54, life: 0.9 })
      return
    }
    if (at(0.95)) {
      bellyCount = 0
      M.belly.target = 0
      M.belly.kick(-3)
      M.wob.kick(14)
      for (const slot of slots) slot.hop.kick(-rnd(400, 750))
      if (m.kind === 'burp') {
        fx.hitstop(80)
        fx.shake(22, 0.8)
        fx.flash('#e6ff8a', 0.35, 0.3)
        fx.confetti(BX, 240, 70)
        fx.confetti(210, 220, 40)
        fx.confetti(W - 210, 220, 40)
        fx.text(BX, 270, 'BUUUURP!', { color: '#eaff8a', size: 120, life: 1.4 })
        burpSound(1.1, 1.4, 104)
        stage.after(0.75, () => sfx.fanfare())
        M.squash.kick(-9)
        for (let i = 0; i < 3; i++) stage.after(i * 0.12, () => fx.ring(mx, my, '#d8ff7a', 380 + i * 120, 0.6))
      } else {
        fx.hitstop(60)
        fx.shake(18, 0.5)
        fx.text(BX, 360, 'PFFFRRRT!', { color: '#eaff8a', size: 110, life: 1.4 })
        tootSound(1.0, 1.5)
        sfx.whoosh()
        jvy = 2750
        jy = 0.01
        M.squash.value = 1.35
        fx.burst(BX, BY - 30, { count: 46, color: ['#c9e27a', '#e6f2a0', '#a9c94a', '#ffffff'], speed: 760, angle: -Math.PI / 2, spread: Math.PI * 1.1, life: 1.4, size: 84, gravity: -60, drag: 0.9 })
        fx.confetti(BX, 300, 50)
      }
    }
    if (m.kind === 'burp') {
      if (t < 1.75) {
        pose.open = 1.4
        pose.eye = 'squeeze'
        pose.arms = 1
        every('gas', 0.03, dt, () => fx.burst(mx, my, { count: 3, color: ['#d8ff7a', '#eaffb0', '#b6e04a'], speed: 900, life: 0.9, size: 64, drag: 0.92, gravity: -100 }))
      } else {
        pose.eye = 'happy'
      }
      if (t >= 2.4) endMega()
    } else {
      pose.eye = jy > 0 ? 'wide' : 'happy'
      pose.open = jy > 0 ? 0.9 : -1
      pose.arms = 1
      if (jy > 0) every('trail', 0.03, dt, () => fx.burst(BX + rnd(-60, 60), BY - jy + 10, { count: 1, color: ['#c9e27a', '#e6f2a0'], speed: 160, angle: Math.PI / 2, spread: 0.8, life: 0.7, size: 56 }))
      if (m.landedAt >= 0 && t > m.landedAt + 0.7) endMega()
      if (t > 4) endMega()
    }
  }

  const endMega = () => {
    mega = null
    megaCount++
    // A new coat after every big one: something to come back for.
    const [cx, cy] = toWorld(0, -C)
    fx.ring(cx, cy, '#ffffff', 340, 0.5)
    fx.burst(cx, cy, { count: 26, color: ['#ffffff', '#ffe14d'], shape: 'star', speed: 560, life: 0.7, size: 18 })
    sfx.slideUp()
    M.big.kick(3)
  }

  // ---- update --------------------------------------------------------------

  const update = (dt: number) => {
    const time = stage.time
    const [mx, my] = mouthWorld()

    // Held food follows its finger and gets snatched when it comes close.
    let nearest = 9999
    let focusX = 0
    let focusY = 0
    let focus = false
    for (let i = foods.length - 1; i >= 0; i--) {
      const food = foods[i]!
      if (food.grow < 1 || time - food.born < 0.5) food.grow = ease.outBack(clamp((time - food.born) / 0.42, 0, 1))
      if (food.state === 'held') {
        const p = stage.pointers.get(food.pid)
        if (!p || !p.down) {
          release(food, p)
          continue
        }
        const px = food.x
        food.x = damp(food.x, p.x, 32, dt)
        food.y = damp(food.y, p.y - 30, 32, dt)
        food.rot = damp(food.rot, clamp((food.x - px) / dt / 2200, -0.5, 0.5), 12, dt)
        const d = dist(food.x, food.y, mx, my)
        if (d < nearest) {
          nearest = d
          focusX = food.x
          focusY = food.y
          focus = true
        }
        if (!busy() && d < 92) eat(food)
      } else if (food.state === 'loose') {
        food.age += dt
        food.vy += 2400 * dt
        food.x += food.vx * dt
        food.y += food.vy * dt
        food.rot += (food.vx / 60) * dt
        if (food.x < 50 || food.x > W - 50) {
          food.x = clamp(food.x, 50, W - 50)
          if (Math.abs(food.vx) > 200) {
            sfx.thud(0.4)
            fx.burst(food.x, food.y, { count: 5, color: '#ffffff', speed: 200, life: 0.3, size: 8 })
          }
          food.vx *= -0.65
        }
        if (food.y < 40 && food.vy < 0) food.vy *= -0.5
        if (food.y > REST_Y) {
          food.y = REST_Y
          if (food.vy > 260) {
            sfx.thud(clamp(food.vy / 1600, 0.25, 0.7))
            fx.burst(food.x, REST_Y + 30, { count: 5, color: '#ffffff', speed: 160, angle: -Math.PI / 2, spread: 2.4, life: 0.3, size: 8 })
            food.vy *= -0.5
          } else {
            food.vy = 0
          }
          food.vx *= 0.8
        }
        if (Math.abs(food.vx) + Math.abs(food.vy) < 60 && food.y >= REST_Y - 1) food.rest += dt
        const d = dist(food.x, food.y, mx, my)
        if (!food.rejected) {
          if (d < nearest) {
            nearest = d
            focusX = food.x
            focusY = food.y
            focus = true
          }
          // Catch a thrown one right out of the air.
          if (!busy() && d < 100 && food.age > 0.04) {
            eat(food)
            continue
          }
          if (!tongue && !busy() && (food.tapped || food.age > 0.4)) {
            tongue = { phase: 'out', t: 0, dur: 0.07 + d / 7000, tx: food.x, ty: food.y, food: null, target: food }
            sfx.tone({ freq: 320, to: 980, dur: 0.1, type: 'triangle', vol: 0.16 })
          }
        } else if (food.rest > 3.2) {
          fx.burst(food.x, food.y, { count: 12, color: ['#ffffff', '#c9e27a'], speed: 300, life: 0.45, size: 12 })
          sfx.pop(1)
          foods.splice(i, 1)
        }
      }
    }

    // The tongue.
    if (tongue) {
      const tg = tongue
      tg.t += dt
      if (tg.phase === 'out') {
        if (tg.target) {
          if (tg.target.state !== 'loose') {
            tg.target = null
          } else {
            tg.tx = tg.target.x
            tg.ty = tg.target.y
          }
        }
        if (tg.t >= tg.dur) {
          tg.phase = 'back'
          tg.t = 0
          tg.dur = tg.dur * 1.5 + 0.06
          let got: Food | null = tg.target
          if (!got) {
            let best = 80
            for (const food of foods) {
              if (food.state !== 'loose' && food.state !== 'shelf') continue
              const d = dist(food.x, food.y, tg.tx, tg.ty)
              if (d < best) {
                best = d
                got = food
              }
            }
          }
          if (got) {
            if (got.state === 'shelf') slots[got.slot]!.food = null
            got.state = 'tongue'
            got.rejected = false
            tg.food = got
            sfx.pop(4)
            fx.burst(tg.tx, tg.ty, { count: 8, color: '#ffffff', speed: 260, life: 0.35, size: 9 })
          } else {
            sfx.splat()
            fx.burst(tg.tx, tg.ty, { count: 9, color: ['#bfeaff', '#ffffff', '#ff9ecb'], speed: 320, life: 0.45, size: 10, gravity: 700 })
            happyUntil = time + 0.4
          }
        }
      } else if (tg.t >= tg.dur) {
        tongue = null
        if (tg.food) eat(tg.food)
        else {
          open = 0
          sfx.tick()
        }
      }
      if (tg.food && tongue) {
        const k = 1 - ease.inQuad(clamp(tg.t / tg.dur, 0, 1))
        tg.food.x = lerp(mx, tg.tx, k)
        tg.food.y = lerp(my, tg.ty, k)
      }
    }

    // Chew, chew, gulp, then the reaction.
    if (chewT >= 0) {
      const prev = chewT
      chewT += dt
      const at = (when: number) => prev <= when && chewT > when
      if (at(0.15) || at(0.3)) {
        sfx.crunch()
        M.squash.kick(at(0.15) ? 2.2 : -2.2)
        fx.burst(mx, my, { count: 4, color: chewDef?.crumbs ?? '#ffffff', speed: 240, life: 0.4, size: 8, gravity: 1200 })
      }
      if (at(0.44)) {
        gulpT = 0
        sfx.tone({ freq: 420, to: 130, dur: 0.24, type: 'sine', vol: 0.3 })
        M.squash.kick(4.5)
      }
      if (chewT >= 0.72) {
        chewT = -1
        const def = chewDef
        chewDef = null
        if (def) {
          if (def.kind !== 'yuck') {
            bellyCount++
            M.belly.target = bellyCount / FULL
            M.belly.kick(2.2)
            M.wob.kick(5)
          }
          if (!mega) startReaction(def)
        }
      }
    }
    if (gulpT >= 0) {
      gulpT += dt / 0.28
      if (gulpT >= 1) gulpT = -1
    }

    // Reset the pose, then let the reaction (or the big one) write into it.
    pose.tint = null
    pose.tintAmt = 0
    pose.eye = time < happyUntil ? 'happy' : 'normal'
    pose.mouth = 'auto'
    pose.open = -1
    pose.cheeks = 0
    pose.shiver = 0
    pose.ox = 0
    pose.oy = 0
    pose.rot = 0
    pose.alpha = 1
    pose.big = 1
    pose.arms = 0
    pose.hue = -1
    pose.dark = 0
    pose.pinch = 0
    pose.snap = false
    if (mega) runMega(mega, dt)
    else if (react) runReaction(react, dt)
    if (!mega && !react && chewT < 0 && !tongue && bellyCount >= FULL) startMega()
    if (!mega && bellyCount >= FULL + 4 && react && react.kind !== 'balloon') startMega()

    // Jumping.
    if (jy > 0) {
      jvy -= GRAV * dt
      jy += jvy * dt
      if (jy <= 0) {
        const speed = -jvy
        jy = 0
        jvy = 0
        land(speed)
      }
    }

    // What the monster is looking at, and how wide the mouth wants to be.
    const hungry = time - lastEatAt > 3.5 && time - lastTouchAt > 2.5
    let wantOpen = 0.04
    if (focus) wantOpen = remap(nearest, 430, 150, 0.2, 1.1)
    else if (hungry) wantOpen = 0.5 + 0.4 * Math.sin(time * 2.4)
    if (tongue) wantOpen = 1
    if (chewT >= 0) wantOpen = chewT < 0.44 ? 0.55 * Math.abs(Math.sin((chewT / 0.15) * Math.PI)) : 0
    if (time < happyUntil && !focus && !tongue) wantOpen = 0.55
    if (pose.open >= 0) wantOpen = pose.open
    open = damp(open, wantOpen, wantOpen < open ? 30 : 16, dt)

    // Anticipation: an "aaah" and a bit of drool as the food comes close.
    if (focus && nearest < 330 && !busy()) {
      if (!wasNear) {
        wasNear = true
        sfx.tone({ freq: 260, to: 520, dur: 0.22, type: 'triangle', vol: 0.13, attack: 0.03 })
        M.squash.kick(3)
      }
      every('drool', 0.2, dt, () => fx.burst(mx + rnd(-70, 70), my + 30, { count: 1, color: ['#bfeaff', '#ffffff'], speed: 60, angle: Math.PI / 2, spread: 0.4, life: 0.5, size: 14, gravity: 1500 }))
    } else if (!focus || nearest > 420) {
      wasNear = false
    }

    let lookTx = 0
    let lookTy = 0
    const [ex, ey] = toWorld(0, -362)
    if (focus) {
      lookTx = focusX
      lookTy = focusY
    } else if (tongue) {
      lookTx = tongue.tx
      lookTy = tongue.ty
    } else {
      let found = false
      for (const p of stage.pointers.values()) {
        if (!p.down) continue
        lookTx = p.x
        lookTy = p.y
        found = true
        break
      }
      if (!found) {
        if (time > idleLook + 1.3) idleLook = time
        const slot = slots[Math.floor(idleLook * 7.3) % slots.length]!
        lookTx = hungry ? slot.x : BX + Math.sin(time * 0.7) * 300
        lookTy = hungry ? slot.y : 300
      }
    }
    lookX = damp(lookX, clamp((lookTx - ex) / 240, -1, 1), 12, dt)
    lookY = damp(lookY, clamp((lookTy - ey) / 240, -1, 1), 12, dt)
    const reachX = focus ? clamp((focusX - BX) / 7, -34, 34) : 0
    const reachY = focus ? clamp((focusY - my) / 9, -26, 20) : 0
    mouthX = damp(mouthX, reachX, 12, dt)
    mouthY = damp(mouthY, reachY, 12, dt)
    M.lean.target = focus ? clamp((focusX - BX) / 2600, -0.16, 0.16) : 0
    M.arm.target = Math.max(pose.arms, focus ? remap(nearest, 500, 200, 0, 1) : hungry ? 0.35 + 0.3 * Math.sin(time * 2.4) : 0)
    M.big.target = pose.big
    M.squash.target = 1 + Math.sin(time * 2.2) * 0.018

    for (const s of [M.squash, M.lean, M.belly, M.big, M.arm, M.wob]) s.update(dt)
    for (const slot of slots) slot.hop.update(dt)

    // Smooth what is drawn.
    const rate = pose.snap ? 60 : 16
    cur.ox = damp(cur.ox, pose.ox, rate, dt)
    cur.oy = damp(cur.oy, pose.oy, rate, dt)
    cur.rot = pose.snap ? pose.rot : damp(cur.rot, pose.rot, 16, dt)
    cur.shiver = pose.shiver
    cur.alpha = damp(cur.alpha, pose.alpha, 10, dt)
    cur.dark = damp(cur.dark, pose.dark, 8, dt)
    cur.pinch = damp(cur.pinch, pose.pinch, 14, dt)
    cur.big = M.big.value
    const air = jy > 0 ? clamp(Math.abs(jvy) / 9000, 0, 0.22) : 0
    const [vx, vy] = volume(clamp(M.squash.value + air, 0.5, 1.6))
    cur.sx = vx * (1 - 0.16 * cur.pinch)
    cur.sy = vy * (1 + 0.07 * cur.pinch)
    cur.shear = -M.lean.value
    cheeks = damp(cheeks, Math.max(pose.cheeks, chewT >= 0 && chewT < 0.44 ? 0.45 : 0), 14, dt)

    const base = PALETTES[megaCount % PALETTES.length]!
    bodyCol = [damp(bodyCol[0], base[0], 5, dt), damp(bodyCol[1], base[1], 5, dt), damp(bodyCol[2], base[2], 5, dt)]
    if (pose.tint) tintCol = [damp(tintCol[0], pose.tint[0], 20, dt), damp(tintCol[1], pose.tint[1], 20, dt), damp(tintCol[2], pose.tint[2], 20, dt)]
    tintA = damp(tintA, pose.tint ? pose.tintAmt : 0, 12, dt)

    // Melon seeds in flight.
    for (let i = flyingSeeds.length - 1; i >= 0; i--) {
      const seed = flyingSeeds[i]!
      seed.t += dt / 0.17
      if (seed.t < 1) continue
      flyingSeeds.splice(i, 1)
      stuckSeeds.push({ x: seed.x1, y: seed.y1, rot: rnd(0, TAU) })
      if (stuckSeeds.length > 64) stuckSeeds.shift()
      sfx.tone({ freq: sfx.scale(seed.i), dur: 0.09, type: 'triangle', vol: 0.13 })
      fx.burst(seed.x1, seed.y1, { count: 4, color: ['#ff4d6d', '#ffb3c1'], speed: 200, life: 0.3, size: 8 })
    }
    if (rainbowT >= 0) {
      rainbowT += dt
      if (rainbowT > 3.6) rainbowT = -1
    }

  }

  // ---- draw ----------------------------------------------------------------

  const drawFood = (g: CanvasRenderingContext2D, food: Food, time: number) => {
    if (food.state === 'shelf') {
      const slot = slots[food.slot]!
      const y = slot.y + slot.hop.value + Math.sin(time * 2 + food.phase) * 3 - (food.size - 92) * 0.35
      if (food.def.rare) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 5)
        circle(g, food.x, y, food.size * (0.62 + pulse * 0.06) * food.grow, 'rgba(255,225,77,0.45)')
        circle(g, food.x, y, food.size * 0.5 * food.grow, 'rgba(255,255,255,0.5)')
        for (let i = 0; i < 3; i++) {
          const a = time * 2.4 + (i * TAU) / 3
          star(g, food.x + Math.cos(a) * food.size * 0.68, y + Math.sin(a) * food.size * 0.5, 9 + pulse * 4, '#ffffff', a)
        }
      }
      shadow(g, food.x, SHELF_Y + 3, 34, food.grow, 0.2)
      sprite(g, food.def.char, food.x, y, food.size * food.grow, Math.sin(time * 1.4 + food.phase) * 0.06)
    } else if (food.state === 'held') {
      sprite(g, food.def.char, food.x, food.y, food.size * 1.28, food.rot)
    } else if (food.state === 'loose') {
      shadow(g, food.x, REST_Y + 40, 36, clamp(1 - (REST_Y - food.y) / 500, 0.3, 1), 0.18)
      sprite(g, food.def.char, food.x, food.y, food.size, food.rot)
    } else {
      sprite(g, food.def.char, food.x, food.y, food.size * 0.95, food.rot)
    }
  }

  const drawEyes = (g: CanvasRenderingContext2D, time: number, dark: string) => {
    const ey = -362
    const gap = 66
    const r = 42
    const mood = pose.eye
    if (mood === 'happy' || mood === 'squeeze') {
      g.strokeStyle = dark
      g.lineWidth = 11
      g.lineCap = 'round'
      g.lineJoin = 'round'
      for (const side of [-1, 1]) {
        const x = side * gap
        g.beginPath()
        if (mood === 'happy') {
          g.arc(x, ey + 14, 30, Math.PI * 1.12, Math.PI * 1.88)
        } else {
          g.moveTo(x - side * 26, ey - 22)
          g.lineTo(x + side * 20, ey)
          g.lineTo(x - side * 26, ey + 22)
        }
        g.stroke()
      }
      return
    }
    if (mood === 'wide') {
      for (const side of [-1, 1]) {
        circle(g, side * (gap + 4), ey, r + 8, '#ffffff', dark, 6)
        circle(g, side * (gap + 4) + lookX * 12, ey + lookY * 12, 11, '#1e1428')
      }
      return
    }
    if (mood === 'dizzy') {
      eyes(g, 0, ey, r, Math.cos(time * 13), Math.sin(time * 13), 0, gap / r)
      return
    }
    if (mood === 'shifty') {
      eyes(g, 0, ey, r, Math.sin(time * 9) > 0 ? 1 : -1, 0.2, 0.35, gap / r)
      return
    }
    eyes(g, 0, ey, r, lookX, lookY, blinkAt(time, 2), gap / r)
  }

  const drawMouth = (g: CanvasRenderingContext2D, time: number, dark: string) => {
    const x = mouthX
    const y = -272 + mouthY
    const mood = pose.mouth
    g.lineJoin = 'round'
    g.lineCap = 'round'
    if (mood === 'grimace') {
      const chatter = Math.sin(time * 80) * 4
      rrect(g, x - 92, y - 14, 184, 64, 22, '#ffffff', dark, 7)
      g.strokeStyle = dark
      g.lineWidth = 5
      g.beginPath()
      g.moveTo(x - 88, y + 18 + chatter)
      g.lineTo(x + 88, y + 18 + chatter)
      for (let i = -2; i <= 2; i++) {
        g.moveTo(x + i * 34, y - 12)
        g.lineTo(x + i * 34, y + 48)
      }
      g.stroke()
      return
    }
    if (mood === 'pucker') {
      const r = 20 + Math.sin(time * 40) * 3
      circle(g, x, y + 24, r + 9, '#ff8fb0', dark, 6)
      circle(g, x, y + 24, r - 4, '#4a0f2e')
      return
    }
    if (mood === 'wavy') {
      g.strokeStyle = dark
      g.lineWidth = 9
      g.beginPath()
      g.moveTo(x - 84, y + 18)
      for (let i = 1; i <= 6; i++) g.lineTo(x - 84 + i * 28, y + 18 + (i % 2 === 0 ? 10 : -10) * Math.sin(time * 16 + i))
      g.stroke()
      return
    }
    const o = clamp(open, 0, 1.5)
    const w = 110
    const cy = -12
    const topC = 22 - o * 40
    const botC = 46 + o * 205
    const path = () => {
      g.beginPath()
      g.moveTo(x - w, y + cy)
      g.quadraticCurveTo(x, y + topC, x + w, y + cy)
      g.quadraticCurveTo(x, y + botC, x - w, y + cy)
      g.closePath()
    }
    path()
    g.fillStyle = '#4a0f2e'
    g.fill()
    g.save()
    g.clip()
    const topY = y + 0.5 * cy + 0.5 * topC
    const botY = y + 0.5 * cy + 0.5 * botC
    if (!tongue) ellipse(g, x, botY + 8, 66, 12 + 30 * Math.min(1, o), '#ff6f9c')
    rrect(g, x - 52, topY - 16, 46, 22 + 22 * Math.min(1, o + 0.2), 10, '#ffffff')
    rrect(g, x + 6, topY - 16, 46, 22 + 22 * Math.min(1, o + 0.2), 10, '#ffffff')
    if (o > 0.3) {
      g.fillStyle = '#ffffff'
      for (const side of [-1, 1]) {
        g.beginPath()
        g.moveTo(x + side * 66, botY + 10)
        g.lineTo(x + side * 52, botY - 22 * Math.min(1, o))
        g.lineTo(x + side * 38, botY + 10)
        g.fill()
      }
    }
    g.restore()
    path()
    g.strokeStyle = dark
    g.lineWidth = 7
    g.stroke()
    if (mood === 'bleh') {
      rrect(g, x - 34, botY - 22, 68, 78, 30, '#ff6f9c', dark, 6)
      g.strokeStyle = 'rgba(180,40,90,0.6)'
      g.lineWidth = 4
      g.beginPath()
      g.moveTo(x, botY - 6)
      g.lineTo(x, botY + 34)
      g.stroke()
    }
  }

  const drawMonster = (g: CanvasRenderingContext2D, time: number) => {
    let col: Rgb = pose.hue >= 0 ? hsl(pose.hue, 0.85, 0.62) : bodyCol
    col = mix(col, tintCol, clamp(tintA, 0, 1))
    const fill = css(col)
    const darkRgb = mix(col, BLACK, 0.55)
    const dark = css(darkRgb)
    const shade = css(mix(col, BLACK, 0.22))
    const light = css(mix(col, WHITE, 0.62))
    const b = clamp(M.belly.value, -0.2, 1.6)
    const rx = bodyRx()
    const ry = 225 + 8 * b
    const armUp = clamp(M.arm.value, -0.3, 1.3)
    const wob = clamp(M.wob.value, -1.5, 1.5) * 0.016

    // Shadow on the rug, outside the transform.
    shadow(g, BX + cur.ox, BY + 6, rx * 1.05 * cur.big, clamp(1 - (jy - cur.oy) / 900, 0.25, 1), 0.2)

    g.save()
    g.translate(BX + cur.ox + cur.shiver, BY - jy + cur.oy)
    g.translate(0, -C)
    g.rotate(cur.rot)
    g.translate(0, C)
    g.transform(1, 0, cur.shear, 1, 0, 0)
    g.scale(cur.sx * cur.big, cur.sy * cur.big)
    g.globalAlpha = clamp(cur.alpha, 0.2, 1)
    g.lineJoin = 'round'
    g.lineCap = 'round'

    // Feet.
    for (const side of [-1, 1]) {
      ellipse(g, side * 96, -14, 78, 32, dark)
      ellipse(g, side * 96, -18, 70, 26, shade)
    }
    // Arms reach up when food is close.
    for (const side of [-1, 1]) {
      const sxp = side * (rx - 24)
      const hxp = side * (rx + 56 + armUp * 10)
      const hyp = -190 - armUp * 130 + Math.sin(time * 3 + side) * 6
      for (const [width, color] of [
        [58, dark],
        [44, fill],
      ] as const) {
        g.beginPath()
        g.moveTo(sxp, -235)
        g.quadraticCurveTo(side * (rx + 66), -215, hxp, hyp)
        g.strokeStyle = color
        g.lineWidth = width
        g.stroke()
      }
    }
    // Horns.
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * 92, -416)
      g.quadraticCurveTo(side * 112, -478, side * 150, -492)
      g.quadraticCurveTo(side * 166, -440, side * 146, -388)
      g.closePath()
      g.fillStyle = '#fff1c9'
      g.fill()
      g.strokeStyle = dark
      g.lineWidth = 6
      g.stroke()
    }
    // The jelly body: a lumpy blob with a fur-bump edge.
    const body = () => {
      g.beginPath()
      const n = 84
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU
        const k = 1 + 0.014 * Math.sin(a * 14 + 1) + wob * Math.sin(a * 3 + time * 11)
        const sinA = Math.sin(a)
        const px = Math.cos(a) * rx * k
        const py = -C + sinA * ry * k * (sinA > 0 ? 0.97 : 1)
        if (i === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.closePath()
    }
    body()
    g.fillStyle = fill
    g.fill()
    g.save()
    g.clip()
    ellipse(g, 0, -C + ry * 0.92, rx * 1.2, ry * 0.5, css(mix(col, BLACK, 0.2), 0.55))
    for (const [sxp, syp, r] of [
      [-128, -390, 22],
      [-162, -330, 13],
      [150, -205, 20],
      [168, -262, 11],
      [-170, -150, 15],
    ] as const)
      circle(g, sxp * (rx / 200), syp, r, shade)
    // Belly patch grows with every bite.
    ellipse(g, 0, -98 - 14 * b, 116 + 66 * b, 86 + 42 * b, light)
    if (b > 0.35) {
      g.strokeStyle = css(mix(col, WHITE, 0.3))
      g.lineWidth = 6
      g.beginPath()
      g.arc(0, -70 - 8 * b, 10, 0.1 * Math.PI, 0.9 * Math.PI)
      g.stroke()
    }
    if (gulpT >= 0) {
      const gy = lerp(-250, -110, ease.inOutQuad(gulpT))
      ellipse(g, 0, gy, 62 - 10 * gulpT, 46, css(mix(col, WHITE, 0.4)))
      ellipse(g, -14, gy - 14, 24, 12, 'rgba(255,255,255,0.45)', -0.4)
    }
    ellipse(g, -rx * 0.42, -C - ry * 0.6, rx * 0.34, ry * 0.16, 'rgba(255,255,255,0.28)', -0.55)
    g.restore()
    body()
    g.strokeStyle = dark
    g.lineWidth = 7
    g.stroke()

    // Cheeks: a blush at rest, balloons when holding something in.
    for (const side of [-1, 1]) {
      const cr = 26 + cheeks * 36
      const cxp = side * (146 + cheeks * 8)
      if (cheeks > 0.12) circle(g, cxp, -262, cr, fill, dark, 6)
      circle(g, cxp, -262, Math.min(cr - 4, 26 + cheeks * 20), cheeks > 0.12 ? css(mix(col, [255, 120, 165], 0.85)) : 'rgba(255,120,165,0.55)')
    }

    drawEyes(g, time, dark)
    drawMouth(g, time, dark)
    g.restore()
  }

  const draw = (g: CanvasRenderingContext2D) => {
    const time = stage.time
    g.drawImage(backdrop, 0, 0)

    if (rainbowT >= 0) {
      const sweep = ease.outCubic(clamp(rainbowT / 0.8, 0, 1))
      g.globalAlpha = rainbowT < 2.8 ? 1 : clamp(1 - (rainbowT - 2.8) / 0.8, 0, 1)
      g.lineWidth = 24
      g.lineCap = 'butt'
      RAINBOW.forEach((color, i) => {
        g.beginPath()
        g.arc(BX, 700, 500 - i * 23, Math.PI, Math.PI + Math.PI * sweep)
        g.strokeStyle = color
        g.stroke()
      })
      g.globalAlpha = 1
    }

    for (const seed of stuckSeeds) {
      ellipse(g, seed.x + 2, seed.y + 3, 7, 11, 'rgba(0,0,0,0.15)', seed.rot)
      ellipse(g, seed.x, seed.y, 7, 11, '#2b1a1a', seed.rot)
    }

    for (const food of foods) if (food.state === 'shelf') drawFood(g, food, time)

    if (cur.dark > 0.01) {
      g.fillStyle = `rgba(20,14,50,${cur.dark})`
      g.fillRect(0, 0, W, H)
    }

    for (const food of foods) if (food.state === 'loose' && food.rejected) drawFood(g, food, time)
    drawMonster(g, time)
    for (const food of foods) if (food.state === 'loose' && !food.rejected) drawFood(g, food, time)

    for (const seed of flyingSeeds) {
      const t = clamp(seed.t, 0, 1)
      ellipse(g, lerp(seed.x0, seed.x1, t), lerp(seed.y0, seed.y1, t) - Math.sin(t * Math.PI) * 40, 8, 12, '#2b1a1a', t * 9)
    }

    if (tongue) {
      const [mx, my] = mouthWorld()
      const tg = tongue
      const k = tg.phase === 'out' ? ease.outCubic(clamp(tg.t / tg.dur, 0, 1)) : 1 - ease.inQuad(clamp(tg.t / tg.dur, 0, 1))
      const tx = lerp(mx, tg.tx, k)
      const ty = lerp(my, tg.ty, k)
      const midX = (mx + tx) / 2
      const midY = (my + ty) / 2 + 50 * k * (1 - k) * 4 + 26 * Math.sin(time * 30) * (1 - k)
      g.lineCap = 'round'
      for (const [width, color] of [
        [40, '#c2386c'],
        [30, '#ff6f9c'],
      ] as const) {
        g.beginPath()
        g.moveTo(mx, my)
        g.quadraticCurveTo(midX, midY, tx, ty)
        g.strokeStyle = color
        g.lineWidth = width
        g.stroke()
      }
      circle(g, tx, ty, 25, '#ff6f9c', '#c2386c', 5)
      if (tg.food) drawFood(g, tg.food, time)
    }

    for (const food of foods) if (food.state === 'held') drawFood(g, food, time)

    // Idle hint: a ghost hand carries a food to the mouth.
    if (time - lastTouchAt > 5 && !react && !mega && !tongue) {
      const slot = slots.find((s) => s.food && s.food.state === 'shelf' && s.food.grow >= 1)
      if (slot && slot.food) {
        const [mx, my] = mouthWorld()
        const u = ((time - lastTouchAt - 5) % 2.1) / 2.1
        const k = ease.inOutCubic(clamp((u - 0.15) / 0.6, 0, 1))
        const x = lerp(slot.x, mx, k)
        const y = lerp(slot.y, my, k) - Math.sin(k * Math.PI) * 40
        g.globalAlpha = u < 0.1 ? u / 0.1 : u > 0.85 ? (1 - u) / 0.15 : 1
        if (k > 0.02) {
          g.globalAlpha *= 0.75
          sprite(g, slot.food.def.char, x, y - 30, slot.food.size * 1.1)
          g.globalAlpha /= 0.75
        } else {
          g.strokeStyle = '#ffffff'
          g.lineWidth = 7
          g.beginPath()
          g.arc(x, y, 58 + Math.sin(time * 8) * 6, 0, TAU)
          g.stroke()
        }
        sprite(g, '👆', x + 26, y + 46 + (k <= 0.02 ? Math.sin(time * 8) * 8 : 0), 84)
        g.globalAlpha = 1
      }
    }
  }

  // ---- input ---------------------------------------------------------------

  const down = (p: Pointer) => {
    lastTouchAt = stage.time
    let best: Food | null = null
    let bestD = 1e9
    for (const food of foods) {
      if (food.state !== 'shelf' && food.state !== 'loose') continue
      if (food.state === 'shelf' && food.grow < 0.5) continue
      const d = dist(p.x, p.y, food.x, food.y)
      const reach = food.state === 'shelf' ? 96 : 84
      if (d < reach && d < bestD) {
        best = food
        bestD = d
      }
    }
    if (best) {
      if (best.state === 'shelf') slots[best.slot]!.food = null
      best.state = 'held'
      best.pid = p.id
      best.heldAt = stage.time
      best.rejected = false
      best.tapped = false
      modes.set(p.id, { kind: 'hold', food: best })
      sfx.pop(rndInt(2, 6))
      fx.ring(best.x, best.y, '#ffffff', 80, 0.3)
      fx.burst(best.x, best.y, { count: 8, color: ['#ffffff', '#ffe14d'], shape: 'star', speed: 280, life: 0.4, size: 12 })
      M.squash.kick(2)
      M.arm.kick(4)
      return
    }
    if (insideMonster(p.x, p.y)) {
      modes.set(p.id, { kind: 'tickle', acc: 0 })
      tickle(p.x, p.y)
      return
    }
    modes.set(p.id, { kind: 'air', acc: 0 })
    lick(p.x, p.y)
  }

  const move = (p: Pointer) => {
    const mode = modes.get(p.id)
    if (!mode || mode.kind === 'hold') return
    lastTouchAt = stage.time
    mode.acc += Math.hypot(p.dx, p.dy)
    if (mode.kind === 'tickle') {
      if (mode.acc > 60 && insideMonster(p.x, p.y)) {
        mode.acc = 0
        tickle(p.x, p.y)
      }
    } else if (mode.acc > 70) {
      mode.acc = 0
      if (insideMonster(p.x, p.y)) {
        tickle(p.x, p.y)
      } else {
        sfx.tick()
        fx.burst(p.x, p.y, { count: 2, color: ['#ffffff', '#ffe14d'], shape: 'star', speed: 120, life: 0.4, size: 12 })
      }
    }
  }

  const up = (p: Pointer) => {
    const mode = modes.get(p.id)
    modes.delete(p.id)
    if (mode && mode.kind === 'hold' && mode.food.state === 'held') release(mode.food, p)
  }

  return { update, draw, down, move, up }
}

export const proto: Proto = {
  meta: {
    key: 'feed-the-monster',
    name: 'Feed the Monster',
    emoji: '👾',
    ages: [2, 5],
    pitch: 'Drag silly food into a big jelly monster and see what each one does to it.',
    howTo: 'Drag (or just tap) a food from the shelf into the mouth. Tickle the monster. Fill the belly.',
    basedOn: 'Toca Kitchen, My Talking Tom',
    whyFun: 'Feed a character and get a face back: every food has its own slapstick reaction, the belly grows to a giant burp, and rare foods turn up later.',
  },
  create,
}
