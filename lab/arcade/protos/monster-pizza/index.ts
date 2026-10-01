// Monster Pizza: smear sauce on a base, plop toppings from the bowls, shove it
// in the oven, and slide it to a monster who eats it in three bites and tells
// you what it thought. The making is the toy; the monster's face is the payoff.

import { circle, ellipse, hint, label, sprite, volume } from '../../kit/draw.ts'
import { clamp, damp, dist, ease, lerp, pick, rnd, shuffle, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { drawArm, drawMonster, faceY, mouthY, SPECIES } from './monsters.ts'
import type { MonMood, Species } from './monsters.ts'
import { archPath, buildScene, BX, BY, COUNTER, OVEN_X } from './scene.ts'
import { ALL_KINDS, drawTopping, KINDS } from './toppings.ts'
import type { KindKey } from './toppings.ts'

// Pizza radius and the sauced disc inside the crust.
const PR = 126
const SR = 108
const MX = 215
const MBASE = 440
const EAT_X = 428
const EAT_Y = 296
const OVEN_PY = 362
const BOWL_Y = 724
const BOWL_R = 54
const POT_X = 150
const POT_Y = 560
const POT_R = 66
const JAR_X = 1048
const JAR_Y = 556
const BUB_X = 568
const BUB_Y = 138
const BITES = [
  { x: -PR * 1.0, y: -12, r: PR * 0.74 },
  { x: -PR * 0.3, y: 16, r: PR * 0.86 },
  { x: PR * 0.4, y: 0, r: PR * 1.2 },
] as const

type PState = 'board' | 'held' | 'moving' | 'baking' | 'serving' | 'gone'
type Flavour = KindKey | 'raw' | 'burnt'

interface Topping {
  kind: KindKey
  x: number
  y: number
  rot: number
  variant: number
  pop: Spring
}

interface Flyer {
  kind: KindKey | 'sauce'
  variant: number
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
  dur: number
  arc: number
  spin: number
  land: () => void
}

interface Order {
  want: KindKey[]
  no: KindKey | null
}

interface Icon {
  kind: KindKey
  x: number
  y: number
  size: number
  no: boolean
  sq: Spring
}

interface Held {
  id: number
  kind: KindKey | 'sauce' | 'rub' | 'pizza'
  x: number
  y: number
  moved: number
  lastX: number
  lastY: number
  used: number
  variant: number
  gx: number
  gy: number
  at: number
}

interface Coin {
  t: number
  delay: number
  step: number
}

interface Bowl {
  x: number
  tx: number
  sq: Spring
  appear: number
  newUntil: number
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const bg = buildScene()

  const makeLayer = () => {
    const canvas = document.createElement('canvas')
    canvas.width = PR * 4
    canvas.height = PR * 4
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(2, 0, 0, 2, PR * 2, PR * 2)
    return { canvas, ctx }
  }
  const sauce = makeLayer()
  const cheese = makeLayer()
  const clearLayer = (l: { ctx: CanvasRenderingContext2D }) => {
    l.ctx.save()
    l.ctx.setTransform(1, 0, 0, 1, 0, 0)
    l.ctx.clearRect(0, 0, PR * 4, PR * 4)
    l.ctx.restore()
  }

  // Sauce coverage is counted on a coarse grid of cells inside the disc.
  const cells: { x: number; y: number }[] = []
  for (let gy = 0; gy < 11; gy++) {
    for (let gx = 0; gx < 11; gx++) {
      const x = -SR + (gx + 0.5) * ((SR * 2) / 11)
      const y = -SR + (gy + 0.5) * ((SR * 2) / 11)
      if (Math.hypot(x, y) < SR - 6) cells.push({ x, y })
    }
  }
  const painted = new Uint8Array(cells.length)
  let paintedCount = 0

  const pizza = {
    x: BX,
    y: BY,
    scale: 1,
    flat: 1,
    rot: 0,
    state: 'board' as PState,
    sauceDone: false,
    baked: 0,
    bites: 0,
    toppings: [] as Topping[],
    cheese: [] as { x: number; y: number }[],
    wob: spring(1, 240, 9),
    bakeT: 0,
    steamUntil: -1,
    steamAt: 0,
    bubbleAt: 0,
  }

  const unlocked: KindKey[] = ['cheese', 'pepperoni', 'mushroom', 'worm', 'eyeball']
  const bowls = {} as Record<KindKey, Bowl>
  for (const k of ALL_KINDS) bowls[k] = { x: W / 2, tx: W / 2, sq: spring(1, 260, 10), appear: 1, newUntil: -1 }
  const nextLocked = (): KindKey | null => ALL_KINDS.find((k) => !unlocked.includes(k)) ?? null
  const visibleBowls = (): KindKey[] => {
    const next = nextLocked()
    return next ? [...unlocked, next] : [...unlocked]
  }
  const layoutBowls = (snap: boolean) => {
    const list = visibleBowls()
    const gap = Math.min(150, 990 / Math.max(1, list.length - 1))
    list.forEach((k, i) => {
      const b = bowls[k]
      b.tx = W / 2 + (i - (list.length - 1) / 2) * gap
      if (snap) b.x = b.tx
    })
  }
  layoutBowls(true)

  let served = 0
  let bag: number[] = []
  const nextSpecies = (n: number): Species => {
    if (n % 6 === 5) return SPECIES[5]!
    if (bag.length === 0) bag = shuffle([0, 1, 2, 3, 4], stage.rand)
    return SPECIES[bag.pop()!]!
  }
  const makeOrder = (n: number, sp: Species): Order => {
    const silly = unlocked.filter((k) => KINDS[k].silly)
    const fav = unlocked.includes(sp.fav) ? sp.fav : pick(silly, stage.rand())
    if (sp.huge) return { want: [...unlocked], no: null }
    if (n === 0) return { want: ['pepperoni'], no: null }
    if (n === 1) return { want: ['cheese', 'mushroom'], no: null }
    if (n === 2) return { want: ['pepperoni', fav], no: null }
    const plain = shuffle<KindKey>(['cheese', 'pepperoni', 'mushroom'], stage.rand)
    if (n === 3) return { want: [plain[0]!, plain[1]!, fav], no: null }
    if (n % 6 === 4) {
      // The fussy one. Never "no cheese": cheese melts in and cannot be flicked off.
      const solid = shuffle<KindKey>(['pepperoni', 'mushroom'], stage.rand)
      return { want: [stage.rand() < 0.5 ? 'cheese' : solid[1]!, fav], no: solid[0]! }
    }
    const others = silly.filter((k) => k !== fav)
    const want: KindKey[] = [plain[0]!, fav]
    if (stage.rand() < 0.75) want.push(others.length > 0 && stage.rand() < 0.5 ? pick(others, stage.rand()) : plain[1]!)
    return { want, no: null }
  }
  const makeIcons = (order: Order): { icons: Icon[]; rx: number; ry: number } => {
    const kinds: { kind: KindKey; no: boolean }[] = order.want.map((kind) => ({ kind, no: false }))
    if (order.no) kinds.push({ kind: order.no, no: true })
    const m = kinds.length
    const perRow = m <= 4 ? m : 4
    const rows = Math.ceil(m / perRow)
    const size = m <= 3 ? 76 : m === 4 ? 64 : 54
    const gap = size + 16
    const icons = kinds.map((k, i) => {
      const row = Math.floor(i / perRow)
      const inRow = row === rows - 1 ? m - row * perRow : perRow
      const col = i - row * perRow
      return {
        kind: k.kind,
        no: k.no,
        size,
        x: BUB_X + (col - (inRow - 1) / 2) * gap,
        y: BUB_Y + (row - (rows - 1) / 2) * (size + 12),
        sq: spring(1, 240, 8),
      }
    })
    return { icons, rx: (perRow * gap) / 2 + 36, ry: 70 + (rows - 1) * 34 }
  }

  const firstSpecies = nextSpecies(0)
  const firstOrder = makeOrder(0, firstSpecies)
  const mon = {
    sp: firstSpecies,
    order: firstOrder,
    layout: makeIcons(firstOrder),
    rise: 1,
    sq: spring(1, 210, 9),
    lean: spring(0, 140, 7),
    eye: spring(1, 200, 8),
    bub: spring(1, 220, 9),
    mouth: 0,
    mouthT: 0,
    mood: 'happy' as MonMood,
    moodUntil: 0,
    lunge: 0,
    tint: '#7be04a',
    tintAmount: 0,
    arms: 0,
    armsT: 0,
    hold: 0,
    dance: 0,
    wiggle: 0,
    bounce: 0,
    bubble: 1,
    ticked: new Set<KindKey>(),
    noSeen: false,
    noShake: 0,
    reacting: false,
    incoming: 0,
  }

  const oven = { heat: 0.35, flare: spring(0, 120, 8), sparkAt: 0 }
  const potSq = spring(1, 260, 10)
  const jarSq = spring(1, 260, 9)
  const flyers: Flyer[] = []
  const coinsFlying: Coin[] = []
  const marks: { x: number; y: number; r: number; rot: number }[] = []
  let coins = 0
  let held: Held | null = null
  let lastTouchAt = 0
  let lastSquelch = -1
  let lastJiggle = -1
  let lookX = BX
  let lookY = BY

  // ---------------------------------------------------------------- helpers

  const monBase = () => {
    const hop = mon.dance > 0 ? Math.abs(Math.sin(mon.dance * 9)) * 34 : mon.bounce > 0 ? Math.abs(Math.sin(mon.bounce * 11)) * 46 : 0
    return MBASE + (1 - mon.rise) * (mon.sp.h + 80) - hop
  }
  const monX = () => MX + mon.lunge * 72
  const has = (k: KindKey) => (k === 'cheese' ? pizza.cheese.length > 0 : pizza.toppings.some((t) => t.kind === k))
  const present = () => new Set<KindKey>(ALL_KINDS.filter(has))
  const onBoard = () => pizza.state === 'board'
  const monsterHere = () => mon.rise > 0.9 && !mon.reacting
  const onMonster = (x: number, y: number) =>
    mon.rise > 0.8 && Math.abs(x - MX) < mon.sp.w + 50 && y < COUNTER + 14 && y > MBASE - mon.sp.h - 70
  const onOven = (x: number, y: number) => y < COUNTER + 8 && ((x - OVEN_X) / 205) ** 2 + ((y - COUNTER) / 305) ** 2 < 1
  const setMood = (m: MonMood, seconds: number) => {
    if (mon.reacting) return
    mon.mood = m
    mon.moodUntil = stage.time + seconds
  }
  const say = (text: string, color = '#fff3b0', size = 54, x = MX + 40, y = 120) => fx.text(x, y, text, { color, size, life: 1.1, rise: 60 })
  const voice = (steps: readonly number[], gap = 0.09) => {
    steps.forEach((s, i) => {
      const f = sfx.scale(mon.sp.pitch + s) * 0.5
      sfx.tone({ freq: f, to: f * 1.18, dur: 0.11, type: 'square', vol: 0.1, delay: i * gap })
    })
  }
  const plop = () => {
    sfx.tone({ freq: rnd(460, 640), to: 170, dur: 0.13, type: 'sine', vol: 0.3 })
    sfx.pop(Math.floor(rnd(0, 5)))
  }
  const jiggle = (amount: number) => {
    for (const t of pizza.toppings) t.pop.kick(rnd(-amount, amount))
  }
  const flour = (x: number, y: number, count = 8) =>
    fx.burst(x, y, { count, color: ['#ffffff', '#fff1dc'], speed: 170, life: 0.5, size: 10, gravity: 60, drag: 0.92 })

  // ------------------------------------------------------------ the pizza

  const local = (wx: number, wy: number): [number, number] => [(wx - pizza.x) / pizza.scale, (wy - pizza.y) / pizza.scale]

  const completeSauce = () => {
    pizza.sauceDone = true
    const c = sauce.ctx
    c.beginPath()
    c.arc(0, 0, SR, 0, TAU)
    c.fillStyle = '#e8452c'
    c.fill()
    c.strokeStyle = 'rgba(240,106,69,0.55)'
    c.lineWidth = 9
    c.lineCap = 'round'
    c.beginPath()
    for (let i = 0; i <= 60; i++) {
      const a = i * 0.32
      const r = 8 + i * 1.55
      if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else c.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    c.stroke()
    // Blotches and a few herbs, so it reads as sauce and not as paint.
    for (let i = 0; i < 26; i++) {
      const a = rnd(0, TAU)
      const d = Math.sqrt(Math.random()) * (SR - 10)
      c.fillStyle = pick(['rgba(255,150,110,0.35)', 'rgba(170,30,20,0.3)', 'rgba(255,120,80,0.3)'])
      c.beginPath()
      c.ellipse(Math.cos(a) * d, Math.sin(a) * d, rnd(5, 14), rnd(4, 9), rnd(0, 3), 0, TAU)
      c.fill()
    }
    c.fillStyle = 'rgba(60,130,40,0.75)'
    for (let i = 0; i < 16; i++) {
      const a = rnd(0, TAU)
      const d = Math.sqrt(Math.random()) * (SR - 8)
      c.beginPath()
      c.ellipse(Math.cos(a) * d, Math.sin(a) * d, 4, 1.8, rnd(0, 3), 0, TAU)
      c.fill()
    }
    sfx.ding(1)
    fx.ring(pizza.x, pizza.y, '#ff8a6a', PR + 40, 0.5)
    fx.burst(pizza.x, pizza.y, { count: 14, color: ['#ffffff', '#ffe14d'], speed: 380, life: 0.6, size: 12, shape: 'star' })
    pizza.wob.value = 0.86
    setMood('love', 0.9)
  }

  const paint = (lx: number, ly: number, r: number) => {
    const c = sauce.ctx
    c.save()
    c.beginPath()
    c.arc(0, 0, SR, 0, TAU)
    c.clip()
    c.fillStyle = '#e8452c'
    c.beginPath()
    c.arc(lx, ly, r, 0, TAU)
    c.fill()
    for (let i = 0; i < 3; i++) {
      const a = rnd(0, TAU)
      const d = rnd(0, r * 0.8)
      c.fillStyle = pick(['rgba(240,106,69,0.55)', 'rgba(176,38,28,0.5)', 'rgba(255,140,100,0.4)'])
      c.beginPath()
      c.arc(lx + Math.cos(a) * d, ly + Math.sin(a) * d, rnd(3, 9), 0, TAU)
      c.fill()
    }
    c.restore()
    for (let i = 0; i < cells.length; i++) {
      if (painted[i]) continue
      const cell = cells[i]!
      if (Math.hypot(cell.x - lx, cell.y - ly) < r) {
        painted[i] = 1
        paintedCount++
      }
    }
    if (!pizza.sauceDone && paintedCount / cells.length >= 0.68) completeSauce()
  }

  const squelch = () => {
    if (stage.time - lastSquelch < 0.12) return
    lastSquelch = stage.time
    sfx.noise({ dur: 0.1, freq: rnd(500, 1000), to: 260, filter: 'bandpass', q: 3, vol: 0.2 })
  }

  const stampCheese = (lx: number, ly: number) => {
    const c = cheese.ctx
    c.save()
    c.beginPath()
    c.arc(0, 0, PR - 12, 0, TAU)
    c.clip()
    c.lineCap = 'round'
    c.lineWidth = 7
    for (let i = 0; i < 9; i++) {
      const a = rnd(0, TAU)
      const d = rnd(0, 32)
      const x = lx + Math.cos(a) * d
      const y = ly + Math.sin(a) * d
      const dir = rnd(0, TAU)
      c.strokeStyle = 'rgba(190,130,20,0.35)'
      c.lineWidth = 10
      c.beginPath()
      c.moveTo(x - Math.cos(dir) * 11, y - Math.sin(dir) * 11)
      c.lineTo(x + Math.cos(dir) * 11, y + Math.sin(dir) * 11)
      c.stroke()
      c.strokeStyle = pick(['#ffe88a', '#ffd95a', '#fff1b0'])
      c.lineWidth = 7
      c.stroke()
    }
    c.restore()
  }

  const addCheese = (lx: number, ly: number, loud: boolean) => {
    const d = Math.hypot(lx, ly)
    const max = PR - 34
    if (d > max) {
      lx *= max / d
      ly *= max / d
    }
    stampCheese(lx, ly)
    pizza.cheese.push({ x: lx, y: ly })
    sfx.noise({ dur: 0.07, freq: 3200, filter: 'highpass', vol: loud ? 0.16 : 0.1 })
    if (loud) sfx.pop(Math.floor(rnd(2, 6)))
    fx.burst(pizza.x + lx, pizza.y + ly, { count: loud ? 8 : 3, color: KINDS.cheese.colors, speed: 160, life: 0.35, size: 7, shape: 'square' })
    pizza.wob.kick(loud ? -1.2 : -0.4)
    checkTicks()
  }

  const addTopping = (kind: KindKey, lx: number, ly: number, variant: number) => {
    if (kind === 'cheese') {
      for (let i = 0; i < 3; i++) addCheese(lx + rnd(-26, 26), ly + rnd(-26, 26), i === 0)
      return
    }
    const d = Math.hypot(lx, ly)
    const max = PR - 30
    if (d > max) {
      lx *= max / d
      ly *= max / d
    }
    const t: Topping = { kind, x: lx, y: ly, rot: rnd(-0.6, 0.6), variant, pop: spring(1, 250, 8) }
    t.pop.value = 1.7
    pizza.toppings.push(t)
    if (pizza.toppings.length > 60) pizza.toppings.shift()
    if (kind === 'slime') sfx.splat()
    else plop()
    fx.burst(pizza.x + lx, pizza.y + ly, { count: 8, color: KINDS[kind].colors, speed: 220, life: 0.4, size: 8 })
    fx.ring(pizza.x + lx, pizza.y + ly, '#ffffff', 34, 0.25)
    pizza.wob.kick(-1.6)
    jiggle(1.5)
    checkTicks()
  }

  // A spot on the pizza with room around it.
  const freeSpot = (): [number, number] => {
    let best: [number, number] = [0, 0]
    let bestD = -1
    for (let i = 0; i < 8; i++) {
      const a = rnd(0, TAU)
      const r = Math.sqrt(Math.random()) * (PR - 38)
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      let near = 999
      for (const t of pizza.toppings) near = Math.min(near, Math.hypot(t.x - x, t.y - y))
      if (near > bestD) {
        bestD = near
        best = [x, y]
      }
    }
    return best
  }

  function checkTicks(): void {
    mon.order.want.forEach((k) => {
      if (mon.ticked.has(k) || !has(k)) return
      mon.ticked.add(k)
      sfx.ding(mon.ticked.size)
      const icon = mon.layout.icons.find((ic) => ic.kind === k && !ic.no)
      if (icon) {
        icon.sq.value = 1.5
        fx.burst(icon.x, icon.y, { count: 8, color: ['#5ed36a', '#ffffff'], speed: 240, life: 0.45, size: 9, shape: 'star' })
      }
      mon.sq.kick(2.5)
      setMood('love', 0.8)
      if (mon.ticked.size === mon.order.want.length) voice([0, 2, 4])
    })
    const no = mon.order.no
    if (no && !mon.noSeen && has(no)) {
      mon.noSeen = true
      mon.noShake = 0.6
      setMood('wow', 1.4)
      sfx.nope()
      mon.lean.kick(2)
    }
  }

  const resetPizza = () => {
    clearLayer(sauce)
    clearLayer(cheese)
    painted.fill(0)
    paintedCount = 0
    pizza.toppings.length = 0
    pizza.cheese.length = 0
    pizza.sauceDone = false
    pizza.baked = 0
    pizza.bites = 0
    pizza.scale = 1
    pizza.flat = 1
    pizza.rot = 0
    pizza.steamUntil = -1
  }

  const glide = (tx: number, ty: number, ts: number, tf: number, secs: number, fn: (t: number) => number, done: () => void) => {
    const x0 = pizza.x
    const y0 = pizza.y
    const s0 = pizza.scale
    const f0 = pizza.flat
    const r0 = pizza.rot
    pizza.state = 'moving'
    stage.tween(
      secs,
      (t) => {
        pizza.x = lerp(x0, tx, t)
        pizza.y = lerp(y0, ty, t)
        pizza.scale = lerp(s0, ts, t)
        pizza.flat = lerp(f0, tf, t)
        pizza.rot = lerp(r0, 0, Math.min(1, t))
      },
      fn,
      done,
    )
  }

  const landOnBoard = (strength: number) => {
    pizza.state = 'board'
    pizza.x = BX
    pizza.y = BY
    pizza.scale = 1
    pizza.flat = 1
    pizza.wob.value = 1 - 0.22 * strength
    sfx.thud(0.4 + strength * 0.4)
    jiggle(3 * strength)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU
      fx.burst(BX + Math.cos(a) * PR, BY + Math.sin(a) * PR * 0.9, { count: 1, color: '#ffffff', speed: 150 * strength, angle: a, spread: 0.5, life: 0.45, size: 11, gravity: 0, drag: 0.9 })
    }
  }

  const newBase = () => {
    resetPizza()
    pizza.x = BX
    pizza.y = -170
    glide(BX, BY, 1, 1, 0.36, ease.inQuad, () => landOnBoard(1))
  }

  const bakeLook = () => {
    const c = cheese.ctx
    const burnt = pizza.baked === 2
    if (!burnt) {
      // Shreds melt into golden pools with brown bubbles.
      c.save()
      c.beginPath()
      c.arc(0, 0, PR - 12, 0, TAU)
      c.clip()
      for (const p of pizza.cheese) {
        c.fillStyle = 'rgba(255,214,92,0.8)'
        c.beginPath()
        c.arc(p.x, p.y, 36, 0, TAU)
        c.fill()
      }
      for (const p of pizza.cheese) {
        for (let i = 0; i < 2; i++) {
          c.fillStyle = pick(['rgba(232,150,50,0.75)', 'rgba(255,240,180,0.8)'])
          c.beginPath()
          c.arc(p.x + rnd(-24, 24), p.y + rnd(-24, 24), rnd(4, 9), 0, TAU)
          c.fill()
        }
      }
      c.restore()
    }
    for (const l of [sauce, cheese]) {
      l.ctx.save()
      l.ctx.globalCompositeOperation = 'source-atop'
      l.ctx.fillStyle = burnt ? 'rgba(30,15,5,0.62)' : 'rgba(150,50,10,0.16)'
      l.ctx.fillRect(-PR, -PR, PR * 2, PR * 2)
      l.ctx.restore()
    }
  }

  const sendToOven = () => {
    sfx.whoosh()
    oven.flare.value = 0.6
    glide(OVEN_X, OVEN_PY, 0.56, 0.5, 0.34, ease.inOutQuad, () => {
      pizza.state = 'baking'
      pizza.bakeT = 0
      sfx.noise({ dur: 2, freq: 180, to: 520, filter: 'lowpass', vol: 0.4 })
      sfx.tone({ freq: 70, to: 110, dur: 2, type: 'sawtooth', vol: 0.08 })
      for (let i = 0; i < 7; i++) sfx.noise({ dur: 0.04, freq: rnd(1800, 3600), filter: 'highpass', vol: 0.13, delay: 0.2 + i * 0.25 + rnd(0, 0.1) })
      fx.shake(4, 0.3)
    })
  }

  const finishBake = () => {
    pizza.baked = Math.min(2, pizza.baked + 1)
    bakeLook()
    sfx.ding(4)
    sfx.tone({ freq: 1568, dur: 0.7, type: 'sine', vol: 0.25 })
    fx.flash('#ffe9a8', 0.3, 0.25)
    fx.burst(OVEN_X, 340, { count: 16, color: ['#ffd23f', '#ff7a1a', '#ffffff'], speed: 420, life: 0.6, size: 10, shape: 'spark' })
    glide(BX, BY, 1, 1, 0.5, ease.outBack, () => {
      landOnBoard(0.7)
      pizza.steamUntil = stage.time + 6
      if (pizza.baked === 2) {
        say('BURNT!', '#ffb02e', 56, BX, BY - 150)
        sfx.slideDown()
        fx.burst(BX, BY, { count: 18, color: ['#3a3038', '#6a5f66'], speed: 200, life: 1, size: 20, gravity: -80, drag: 0.94 })
      } else {
        fx.burst(BX, BY, { count: 12, color: ['#ffffff', '#ffe14d'], speed: 360, life: 0.6, size: 12, shape: 'star' })
        mon.sq.kick(3)
        voice([2, 4])
      }
    })
  }

  // ---------------------------------------------------------- the monster

  const pay = (n: number) => {
    for (let i = 0; i < n; i++) coinsFlying.push({ t: 0, delay: i * 0.14, step: i })
  }

  const unlock = (k: KindKey) => {
    unlocked.push(k)
    layoutBowls(false)
    const b = bowls[k]
    b.sq.value = 1.6
    b.newUntil = stage.time + 8
    const next = nextLocked()
    if (next) {
      bowls[next].x = W + 100
      bowls[next].appear = 0
      const nb = bowls[next]
      stage.tween(0.4, (t) => (nb.appear = t), ease.outBack)
    }
    sfx.fanfare()
    fx.confetti(b.tx, BOWL_Y - 80, 70)
    fx.text(b.tx, BOWL_Y - 100, 'NEW!', { color: '#ffe14d', size: 60, life: 1.4, rise: 70 })
    fx.shake(6, 0.25)
  }

  const flavourShow = (f: Flavour, liked: boolean) => {
    const top = MBASE - mon.sp.h
    if (f === 'burnt') {
      mon.mood = 'wow'
      mon.tint = '#ff3b1f'
      mon.tintAmount = 1
      mon.wiggle = 0.9
      mon.mouthT = 1
      say('HOT HOT HOT!', '#ff7a1a', 58)
      sfx.tone({ freq: 800, to: 2000, dur: 0.6, type: 'sine', vol: 0.16 })
      sfx.zap()
      fx.shake(7, 0.4)
      for (const side of [-1, 1]) fx.burst(MX + side * mon.sp.w, top + 60, { count: 12, color: ['#ffffff', '#d8d0d8'], speed: 300, angle: side < 0 ? Math.PI : 0, spread: 0.7, life: 0.8, size: 18, gravity: -120, drag: 0.93 })
      fx.burst(MX, mouthY(mon.sp, MBASE), { count: 14, color: ['#ff7a1a', '#ffd23f'], speed: 420, angle: 0, spread: 0.6, life: 0.5, size: 12, shape: 'spark' })
    } else if (f === 'raw') {
      mon.mood = 'dizzy'
      mon.lean.kick(4)
      say('RAW!', '#ffe9c4', 58)
      sfx.nope()
      sfx.boing(-3)
    } else if (f === 'sock') {
      mon.mood = liked ? 'love' : 'yuck'
      say('STINKY!', '#b6f57a', 58)
      sfx.tone({ freq: 300, to: 140, dur: 0.4, type: 'triangle', vol: 0.22 })
      fx.burst(MX, top + 40, { count: 14, color: ['#9be38a', '#c8f5a0', '#7bd060'], speed: 120, angle: -Math.PI / 2, spread: 1.6, life: 1.2, size: 22, gravity: -70, drag: 0.95 })
    } else if (f === 'slime') {
      mon.mood = liked ? 'love' : 'wow'
      mon.tint = '#6fe03a'
      mon.tintAmount = 1
      say('SLIMY!', '#b6f57a', 58)
      sfx.splat()
      fx.burst(MX, mouthY(mon.sp, MBASE), { count: 16, color: KINDS.slime.colors, speed: 300, life: 0.8, size: 14, gravity: 700 })
    } else if (f === 'eyeball') {
      mon.mood = liked ? 'love' : 'wow'
      mon.eye.target = 1.75
      stage.after(0.85, () => (mon.eye.target = 1))
      say('GOOGLY!', '#9fe0ff', 58)
      sfx.boing(4)
      sfx.boing(6)
    } else if (f === 'worm') {
      mon.mood = liked ? 'love' : 'wow'
      mon.wiggle = 0.9
      say('WIGGLY!', '#ffb0c0', 58)
      voice([0, 3, 0, 3, 0, 3], 0.07)
    } else {
      mon.mood = 'love'
      mon.bounce = 0.86
      say('BOINGY!', '#ffd23f', 58)
      for (let i = 0; i < 3; i++) stage.after(i * 0.28, () => sfx.boing(i * 2))
    }
  }

  const leave = () => {
    mon.armsT = 1
    sfx.slideDown()
    stage.tween(0.42, (t) => (mon.rise = 1 - t), ease.inBack, nextCustomer)
  }

  function nextCustomer(): void {
    served++
    mon.sp = nextSpecies(served)
    mon.order = makeOrder(served, mon.sp)
    mon.layout = makeIcons(mon.order)
    mon.ticked.clear()
    mon.noSeen = false
    mon.reacting = false
    mon.mood = 'happy'
    mon.tintAmount = 0
    mon.armsT = 0
    mon.mouthT = 0
    mon.bubble = 0
    mon.hold = 0
    mon.dance = 0
    mon.eye.target = 1
    sfx.slideUp()
    stage.tween(0.5, (t) => (mon.rise = t), ease.outBack)
    stage.after(0.3, () => {
      voice([0, 4])
      sfx.pop(2)
      stage.tween(0.35, (t) => (mon.bubble = t), ease.outBack)
      if (mon.sp.huge) {
        fx.shake(12, 0.45)
        sfx.thud(1)
        say('EVERYTHING!', '#ffe14d', 60, MX + 120, 60)
        fx.confetti(W / 2, 120, 50)
      }
    })
    newBase()
  }

  const react = () => {
    mon.reacting = true
    mon.hold = 0
    const order = mon.order
    const kinds = present()
    const missing = order.want.filter((k) => !kinds.has(k))
    const forbidden = order.no !== null && kinds.has(order.no)
    const extras = [...kinds].filter((k) => !order.want.includes(k))
    const raw = pizza.baked === 0
    const burnt = pizza.baked === 2
    const matched = missing.length === 0 && !forbidden && pizza.baked === 1
    const perfect = matched && extras.length === 0 && pizza.sauceDone
    const silliest = (['sock', 'slime', 'eyeball', 'worm', 'gummy'] as const).find((k) => kinds.has(k))
    const flavour: Flavour | undefined = burnt ? 'burnt' : raw ? 'raw' : silliest
    const big = mon.sp.huge ? 2 : 1

    sfx.slideDown()
    mon.sq.value = 1.2
    let at = 0.3
    if (flavour) {
      const liked = flavour !== 'raw' && flavour !== 'burnt' && (order.want.includes(flavour) || flavour === mon.sp.fav)
      stage.after(at, () => flavourShow(flavour, liked))
      at += 0.95
    }
    stage.after(at, () => {
      mon.mouthT = 0
      if (matched) {
        mon.mood = 'love'
        mon.dance = 1.6
        mon.armsT = 1
        say(perfect ? 'PERFECT!' : 'YUM!', perfect ? '#ffe14d' : '#fff3b0', perfect ? 72 : 62)
        fx.burst(MX, faceY(mon.sp, MBASE), { count: 16, color: ['#ff5d8f', '#ff8fb8'], speed: 380, life: 1, size: 18, shape: 'heart', gravity: -60, drag: 0.95 })
        if (perfect) {
          sfx.fanfare()
          fx.confetti(W / 2, 80, 90)
        } else {
          sfx.win()
        }
        voice([0, 2, 4, 7])
        pay((perfect ? 3 : 2) * big)
        stage.after(1.5, () => {
          mon.armsT = 0
        })
      } else {
        mon.mood = 'yuck'
        mon.armsT = 1
        mon.lean.kick(-3)
        say(forbidden ? 'BLEH!' : 'HMM?', '#d8f5a0', 58)
        sfx.nope()
        stage.after(0.7, () => {
          mon.mood = 'wow'
          mon.mouthT = 1
          mon.sq.value = 1.28
          mon.armsT = 0
          say('BUUURP!', '#9be38a', 76, MX + 150, 210)
          sfx.tone({ freq: 160, to: 55, dur: 0.6, type: 'sawtooth', vol: 0.32 })
          sfx.noise({ dur: 0.55, freq: 320, to: 110, filter: 'lowpass', vol: 0.3 })
          fx.shake(10, 0.45)
          fx.burst(MX + 40, mouthY(mon.sp, MBASE) + 20, { count: 22, color: ['#9be38a', '#c8f5a0', '#e6ffc8'], speed: 420, angle: -0.2, spread: 0.9, life: 1, size: 22, gravity: -40, drag: 0.93 })
        })
        stage.after(1.35, () => {
          mon.mouthT = 0
          mon.mood = 'happy'
          voice([4, 6, 4, 6])
          pay(big)
        })
      }
    })
    stage.after(at + 2.15, leave)
  }

  const bite = (i: number) => {
    stage.tween(0.3, (t) => (mon.lunge = Math.sin(t * Math.PI)))
    stage.after(0.14, () => {
      pizza.bites = i + 1
      sfx.chomp()
      sfx.crunch()
      const crumb = pizza.baked === 2 ? ['#3a2a20', '#6a4a30'] : ['#e8a852', '#e8452c', '#ffe27a']
      fx.burst(pizza.x - 50 + i * 36, pizza.y, { count: 16, color: crumb, speed: 380, life: 0.6, size: 10, gravity: 900, angle: -Math.PI / 2, spread: 2.4 })
      fx.text(pizza.x + 30, pizza.y - 110 - i * 12, i === 2 ? 'GULP!' : 'CHOMP!', { color: '#ffffff', size: 44 + i * 8, life: 0.6, rise: 40 })
      fx.hitstop(45)
      fx.shake(5 + i * 2, 0.15)
      mon.sq.value = 0.84
      mon.mouthT = 0.05
      if (i === 2) {
        pizza.state = 'gone'
        stage.after(0.22, react)
      } else {
        stage.after(0.15, () => {
          if (pizza.state === 'serving') mon.mouthT = 1
        })
      }
    })
  }

  const serve = () => {
    sfx.whoosh()
    mon.mouthT = 1
    mon.reacting = true
    mon.mood = 'wow'
    stage.tween(0.25, (t) => (mon.bubble = 1 - t), ease.inBack)
    glide(EAT_X, EAT_Y, 0.66, 1, 0.36, ease.outCubic, () => {
      pizza.state = 'serving'
      mon.hold = 1
      for (let i = 0; i < 3; i++) stage.after(0.22 + i * 0.42, () => bite(i))
    })
  }

  // ------------------------------------------------------ throwing things

  const launch = (kind: KindKey | 'sauce', variant: number, x0: number, y0: number, x1: number, y1: number, land: () => void) => {
    const d = dist(x0, y0, x1, y1)
    flyers.push({ kind, variant, x0, y0, x1, y1, t: 0, dur: clamp(d / 1100, 0.16, 0.42), arc: clamp(d * 0.3, 20, 150), spin: rnd(-6, 6), land })
  }

  const feed = (kind: KindKey, variant: number, x0: number, y0: number) => {
    mon.incoming++
    launch(kind, variant, x0, y0, MX, mouthY(mon.sp, MBASE) + 20, () => {
      mon.incoming--
      sfx.chomp()
      mon.sq.value = 0.84
      const my = mouthY(mon.sp, MBASE)
      fx.burst(MX, my, { count: 10, color: KINDS[kind].colors, speed: 300, life: 0.45, size: 9 })
      if (kind === mon.sp.fav) {
        setMood('love', 0.9)
        fx.burst(MX, my - 60, { count: 6, color: '#ff5d8f', speed: 260, life: 0.8, size: 16, shape: 'heart', gravity: -60 })
        voice([2, 5])
      } else if (KINDS[kind].silly) {
        setMood('yuck', 0.8)
        fx.text(MX + 60, my - 110, pick(['EW!', 'BLEH!', 'HA HA!']), { color: '#d8f5a0', size: 44 })
        sfx.boing(-2)
      } else {
        setMood('love', 0.5)
        fx.text(MX + 60, my - 110, 'MM!', { color: '#fff3b0', size: 44 })
        voice([3])
      }
    })
  }

  const sauceSplat = (x0: number, y0: number) => {
    const open = cells.filter((_, i) => !painted[i])
    const cell = open.length > 0 ? pick(open) : pick(cells)
    launch('sauce', 0, x0, y0, BX + cell.x, BY + cell.y, () => {
      if (!onBoard()) {
        fx.burst(BX + cell.x, BY + cell.y, { count: 8, color: '#e8452c', speed: 200, life: 0.4, size: 10 })
        sfx.splat()
        return
      }
      paint(cell.x, cell.y, 62)
      sfx.splat()
      pizza.wob.kick(-2)
      fx.burst(pizza.x + cell.x, pizza.y + cell.y, { count: 12, color: ['#e8452c', '#f06a45'], speed: 300, life: 0.45, size: 10, gravity: 500 })
    })
  }

  // Tap a bowl (or let go somewhere silly): the topping finds its own way.
  const toss = (kind: KindKey, variant: number, x0: number, y0: number) => {
    if (onBoard()) {
      const [lx, ly] = freeSpot()
      launch(kind, variant, x0, y0, BX + lx, BY + ly, () => {
        if (onBoard()) addTopping(kind, lx, ly, variant)
        else {
          flour(BX + lx, BY + ly)
          sfx.pop()
        }
      })
    } else if (mon.rise > 0.9) {
      feed(kind, variant, x0, y0)
    } else {
      const x = BX + rnd(-180, 180)
      const y = BY + rnd(-60, 60)
      launch(kind, variant, x0, y0, x, y, () => {
        flour(x, y)
        sfx.pop(Math.floor(rnd(0, 4)))
      })
    }
  }

  // ---------------------------------------------------------------- touch

  const bowlAt = (x: number, y: number): KindKey | null => {
    let best: KindKey | null = null
    let bestD = 76
    for (const k of visibleBowls()) {
      const d = dist(x, y, bowls[k].x, BOWL_Y)
      if (d < bestD) {
        bestD = d
        best = k
      }
    }
    return best
  }

  const pokeWorld = (p: Pointer) => {
    if (onOven(p.x, p.y)) {
      oven.flare.value = 1
      sfx.whoosh()
      sfx.noise({ dur: 0.3, freq: 300, to: 900, filter: 'lowpass', vol: 0.3 })
      fx.burst(OVEN_X, 370, { count: 12, color: ['#ffd23f', '#ff7a1a'], speed: 380, angle: -Math.PI / 2, spread: 1.2, life: 0.6, size: 9, shape: 'spark', gravity: -100 })
      if (onBoard()) sendToOven()
    } else if (onMonster(p.x, p.y)) {
      if (onBoard() && pizza.baked > 0 && monsterHere()) {
        serve()
      } else {
        mon.sq.value = 0.82
        mon.lean.kick(p.x < MX ? 3 : -3)
        mon.eye.value = 1.25
        setMood('wow', 0.5)
        voice([4, 6, 4, 6], 0.07)
        fx.text(MX + rnd(-30, 60), MBASE - mon.sp.h - 20, pick(['HEE HEE!', 'RAWR!', 'TICKLES!']), { color: '#ffffff', size: 40 })
      }
    } else if (dist(p.x, p.y, JAR_X, JAR_Y) < 86) {
      jarSq.value = 0.82
      sfx.coin(Math.floor(rnd(0, 5)))
      fx.burst(JAR_X, JAR_Y - 40, { count: 6, color: ['#ffd23f', '#fff3b0'], speed: 220, life: 0.5, size: 8, shape: 'star' })
    } else if (mon.bubble > 0.5 && ((p.x - BUB_X) / mon.layout.rx) ** 2 + ((p.y - BUB_Y) / mon.layout.ry) ** 2 < 1.2) {
      mon.bub.value = 0.85
      sfx.pop(Math.floor(rnd(3, 7)))
      for (const ic of mon.layout.icons) ic.sq.kick(rnd(2, 5))
    } else if (p.y >= COUNTER) {
      flour(p.x, p.y, 10)
      sfx.thud(0.3)
      sfx.pop(Math.floor(rnd(0, 4)))
      if (p.y < 640) marks.push({ x: p.x, y: p.y, r: rnd(16, 24), rot: rnd(0, 3) })
      if (marks.length > 14) marks.shift()
    } else {
      fx.ring(p.x, p.y, '#ffffff', 46, 0.3)
      fx.burst(p.x, p.y, { count: 5, color: ['#ffe14d', '#ffffff'], speed: 200, life: 0.4, size: 8, shape: 'star' })
      sfx.note(Math.floor(rnd(0, 6)), 0.12, 'triangle', 0.18)
    }
  }

  const down = (p: Pointer) => {
    lastTouchAt = stage.time
    lookX = p.x
    lookY = p.y
    const k = bowlAt(p.x, p.y)
    if (k) {
      const b = bowls[k]
      if (!unlocked.includes(k)) {
        b.sq.value = 0.85
        sfx.nope()
        fx.text(b.x, BOWL_Y - 80, `${KINDS[k].unlock - coins} more!`, { color: '#ffe14d', size: 34 })
        return
      }
      b.sq.value = 0.78
      sfx.pop(unlocked.indexOf(k))
      fx.ring(b.x, BOWL_Y, '#ffffff', 60, 0.25)
      const variant = Math.floor(rnd(0, 4))
      if (held) toss(k, variant, b.x, BOWL_Y - 20)
      else held = { id: p.id, kind: k, x: p.x, y: p.y, moved: 0, lastX: p.x, lastY: p.y, used: 0, variant, gx: 0, gy: 0, at: stage.time }
      return
    }
    if (dist(p.x, p.y, POT_X, POT_Y) < POT_R + 22) {
      potSq.value = 0.8
      squelch()
      sfx.pop(1)
      fx.burst(POT_X, POT_Y, { count: 6, color: ['#e8452c', '#f06a45'], speed: 220, life: 0.4, size: 9, gravity: 500, angle: -Math.PI / 2, spread: 1.4 })
      if (held) sauceSplat(POT_X, POT_Y)
      else held = { id: p.id, kind: 'sauce', x: p.x, y: p.y, moved: 0, lastX: p.x, lastY: p.y, used: 0, variant: 0, gx: 0, gy: 0, at: stage.time }
      return
    }
    if (onBoard() && dist(p.x, p.y, pizza.x, pizza.y) < PR + 12) {
      if (held) {
        pizza.wob.value = 0.85
        jiggle(4)
        sfx.boing(Math.floor(rnd(0, 4)))
        return
      }
      if (!pizza.sauceDone) {
        const [lx, ly] = local(p.x, p.y)
        paint(lx, ly, 46)
        lastSquelch = -1
        squelch()
        sfx.splat()
        fx.burst(p.x, p.y, { count: 8, color: ['#e8452c', '#f06a45'], speed: 240, life: 0.4, size: 9 })
        pizza.wob.kick(-1.5)
        held = { id: p.id, kind: 'rub', x: p.x, y: p.y, moved: 0, lastX: p.x, lastY: p.y, used: 1, variant: 0, gx: 0, gy: 0, at: stage.time }
      } else {
        pizza.state = 'held'
        pizza.wob.value = 1.14
        sfx.pop(3)
        jiggle(2)
        held = { id: p.id, kind: 'pizza', x: p.x, y: p.y, moved: 0, lastX: p.x, lastY: p.y, used: 0, variant: 0, gx: p.x - pizza.x, gy: p.y - pizza.y, at: stage.time }
      }
      return
    }
    pokeWorld(p)
  }

  const move = (p: Pointer) => {
    lookX = p.x
    lookY = p.y
    const h = held
    if (!h || h.id !== p.id) return
    lastTouchAt = stage.time
    h.moved += Math.hypot(p.x - h.x, p.y - h.y)
    h.x = p.x
    h.y = p.y
    if (h.kind === 'sauce' || h.kind === 'rub') {
      const d = dist(p.x, p.y, pizza.x, pizza.y)
      if (onBoard() && d < PR + 30) {
        const steps = Math.max(1, Math.ceil(dist(h.lastX, h.lastY, p.x, p.y) / 14))
        const fromFar = dist(h.lastX, h.lastY, pizza.x, pizza.y) > PR + 30
        for (let i = 1; i <= steps; i++) {
          const t = fromFar ? 1 : i / steps
          const [lx, ly] = local(lerp(h.lastX, p.x, t), lerp(h.lastY, p.y, t))
          paint(lx, ly, 42)
        }
        h.used++
        squelch()
        if (Math.random() < 0.3) fx.burst(p.x, p.y, { count: 1, color: '#e8452c', speed: 160, life: 0.3, size: 7, gravity: 400 })
        pizza.wob.kick(rnd(-0.3, 0.3))
      } else if (h.kind === 'rub' && onBoard() && d > PR + 85) {
        // The finger has left the base: it wants the pizza, not the sauce.
        h.kind = 'pizza'
        h.gx = 0
        h.gy = 0
        pizza.state = 'held'
        sfx.pop(3)
      }
      h.lastX = p.x
      h.lastY = p.y
    } else if (h.kind === 'cheese') {
      if (onBoard() && dist(p.x, p.y - 30, pizza.x, pizza.y) < PR && dist(h.lastX, h.lastY, p.x, p.y) > 24) {
        const [lx, ly] = local(p.x + rnd(-8, 8), p.y - 30 + rnd(-8, 8))
        addCheese(lx, ly, h.used % 4 === 0)
        h.used++
        h.lastX = p.x
        h.lastY = p.y
      }
    }
  }

  const up = (p: Pointer) => {
    const h = held
    if (!h || h.id !== p.id) return
    held = null
    const tap = h.moved < 18 && stage.time - h.at < 0.45
    if (h.kind === 'rub') return
    if (h.kind === 'pizza') {
      const flingRight = p.vx > 900 && pizza.x > BX - 40
      const flingLeft = p.vx < -900 && pizza.x < BX + 40
      const nearOven = dist(pizza.x, pizza.y, OVEN_X, 330) < 235 || (pizza.x > 790 && pizza.y < 450)
      const nearMon = dist(pizza.x, pizza.y, MX, 270) < 260 || (pizza.x < 430 && pizza.y < 450)
      if (!tap && (nearOven || flingRight)) sendToOven()
      else if (!tap && (nearMon || flingLeft) && monsterHere()) serve()
      else {
        if (tap) {
          // A tap on a topping flicks it off, into the monster if there is one.
          const [lx, ly] = local(h.x, h.y)
          let hit = -1
          let best = 46
          pizza.toppings.forEach((t, i) => {
            const d = Math.hypot(t.x - lx, t.y - ly)
            if (d <= best) {
              best = d
              hit = i
            }
          })
          const t = hit >= 0 ? pizza.toppings.splice(hit, 1)[0] : undefined
          if (t) {
            const wx = pizza.x + t.x
            const wy = pizza.y + t.y
            fx.ring(wx, wy, '#ffffff', 40, 0.25)
            sfx.boing(Math.floor(rnd(2, 6)))
            if (mon.rise > 0.9) feed(t.kind, t.variant, wx, wy)
            else launch(t.kind, t.variant, wx, wy, wx + rnd(-200, 200), -80, () => sfx.pop(5))
            for (const k of [...mon.ticked]) if (!has(k)) mon.ticked.delete(k)
            if (mon.order.no && !has(mon.order.no)) mon.noSeen = false
          } else {
            sfx.boing(Math.floor(rnd(0, 4)))
          }
          pizza.wob.value = 0.84
          jiggle(4)
        }
        glide(BX, BY, 1, 1, 0.28, ease.outBack, () => landOnBoard(tap ? 0.2 : 0.6))
      }
      return
    }
    if (h.kind === 'sauce') {
      if (h.used === 0) sauceSplat(tap ? POT_X : h.x, tap ? POT_Y : h.y - 30)
      return
    }
    const kind = h.kind
    const y = h.y - 30
    if (tap) {
      toss(kind, h.variant, bowls[kind].x, BOWL_Y - 20)
    } else if (onMonster(h.x, y) && mon.rise > 0.9) {
      feed(kind, h.variant, h.x, y)
    } else if (kind === 'cheese') {
      if (h.used === 0) toss(kind, h.variant, h.x, y)
    } else if (onBoard() && dist(h.x, y, pizza.x, pizza.y) < PR + 40) {
      const [lx, ly] = local(h.x, y)
      addTopping(kind, lx, ly, h.variant)
    } else if (onBoard()) {
      // Dropped beside the pizza: it hops on at the nearest edge.
      const a = Math.atan2(y - BY, h.x - BX)
      const lx = Math.cos(a) * (PR - 40)
      const ly = Math.sin(a) * (PR - 40)
      launch(kind, h.variant, h.x, y, BX + lx, BY + ly, () => {
        if (onBoard()) addTopping(kind, lx, ly, h.variant)
        else flour(BX + lx, BY + ly)
      })
    } else {
      toss(kind, h.variant, h.x, y)
    }
  }

  // --------------------------------------------------------------- update

  const update = (dt: number) => {
    const time = stage.time
    pizza.wob.update(dt)
    for (const t of pizza.toppings) t.pop.update(dt)
    for (const k of ALL_KINDS) {
      const b = bowls[k]
      b.sq.update(dt)
      b.x = damp(b.x, b.tx, 9, dt)
    }
    mon.sq.update(dt)
    mon.lean.update(dt)
    mon.eye.update(dt)
    mon.bub.update(dt)
    for (const ic of mon.layout.icons) ic.sq.update(dt)
    potSq.update(dt)
    jarSq.update(dt)
    oven.flare.update(dt)
    oven.heat = damp(oven.heat, pizza.state === 'baking' ? 1 : 0.35, 6, dt)

    mon.dance = Math.max(0, mon.dance - dt)
    mon.wiggle = Math.max(0, mon.wiggle - dt)
    mon.bounce = Math.max(0, mon.bounce - dt)
    mon.noShake = Math.max(0, mon.noShake - dt)
    if (!mon.reacting) {
      mon.tintAmount = damp(mon.tintAmount, 0, 2, dt)
      if (time > mon.moodUntil) mon.mood = 'happy'
    }
    // The mouth opens for anything heading its way, and drools at a baked pizza.
    let mouthT = mon.mouthT
    if (mon.incoming > 0) mouthT = 1
    if (!mon.reacting) {
      if (held && held.kind !== 'rub' && held.kind !== 'sauce') {
        const hx = held.kind === 'pizza' ? pizza.x : held.x
        const hy = held.kind === 'pizza' ? pizza.y : held.y
        mouthT = Math.max(mouthT, clamp(1.25 - dist(hx, hy, MX, 280) / 330, 0, 1))
      } else if (onBoard() && pizza.baked > 0) {
        mouthT = Math.max(mouthT, 0.32 + Math.sin(time * 4) * 0.1)
      }
    }
    mon.mouth = damp(mon.mouth, mouthT, 16, dt)
    const waving = !mon.reacting && onBoard() && pizza.baked > 0 ? 0.55 : 0
    mon.arms = damp(mon.arms, Math.max(mon.armsT, waving), 9, dt)

    if (held && held.kind === 'pizza' && pizza.state === 'held') {
      const px = pizza.x
      pizza.x = damp(pizza.x, clamp(held.x - held.gx, 60, W - 60), 24, dt)
      pizza.y = damp(pizza.y, clamp(held.y - held.gy, 120, H - 120), 24, dt)
      const vx = (pizza.x - px) / Math.max(dt, 0.001)
      pizza.rot = damp(pizza.rot, clamp(vx * 0.00035, -0.22, 0.22), 12, dt)
      pizza.scale = damp(pizza.scale, 1.07, 14, dt)
      if (Math.abs(vx) > 500 && time - lastJiggle > 0.14) {
        lastJiggle = time
        jiggle(2.5)
      }
    } else if (pizza.state === 'board') {
      pizza.rot = damp(pizza.rot, 0, 10, dt)
    }

    if (pizza.state === 'baking') {
      pizza.bakeT += dt
      if (time > oven.sparkAt) {
        oven.sparkAt = time + 0.12
        fx.burst(OVEN_X + rnd(-80, 80), 380, { count: 1, color: ['#ffd23f', '#ff7a1a'], speed: 300, angle: -Math.PI / 2, spread: 0.8, life: 0.6, size: 8, shape: 'spark', gravity: -150 })
      }
      if (pizza.bakeT >= 2) finishBake()
    }
    if (pizza.state === 'board' && time < pizza.steamUntil) {
      if (time > pizza.steamAt) {
        pizza.steamAt = time + 0.16
        const dark = pizza.baked === 2
        fx.burst(pizza.x + rnd(-80, 80), pizza.y + rnd(-60, 20), { count: 1, color: dark ? 'rgba(70,60,70,0.5)' : 'rgba(255,255,255,0.55)', speed: 50, angle: -Math.PI / 2, spread: 0.5, life: 1, size: 18, gravity: -90, drag: 0.98 })
      }
      if (pizza.baked === 1 && pizza.cheese.length > 0 && time > pizza.bubbleAt && time < pizza.steamUntil - 2.5) {
        pizza.bubbleAt = time + 0.3
        const c = pick(pizza.cheese)
        fx.ring(pizza.x + c.x + rnd(-14, 14), pizza.y + c.y + rnd(-14, 14), '#fff6c8', 14, 0.25)
        sfx.tone({ freq: rnd(700, 1100), to: 1500, dur: 0.05, vol: 0.06 })
      }
    }

    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i]!
      f.t += dt / f.dur
      if (f.t >= 1) {
        flyers.splice(i, 1)
        f.land()
      }
    }
    for (let i = coinsFlying.length - 1; i >= 0; i--) {
      const c = coinsFlying[i]!
      if (c.delay > 0) {
        c.delay -= dt
        continue
      }
      c.t += dt / 0.55
      if (c.t >= 1) {
        coinsFlying.splice(i, 1)
        coins++
        sfx.coin(c.step)
        jarSq.value = 0.8
        fx.burst(JAR_X, JAR_Y - 50, { count: 6, color: ['#ffd23f', '#fff3b0'], speed: 240, life: 0.4, size: 8, shape: 'star' })
        fx.text(JAR_X, JAR_Y - 100, '+1', { color: '#ffe14d', size: 38, life: 0.6 })
        const next = nextLocked()
        if (next && coins >= KINDS[next].unlock) unlock(next)
      }
    }
  }

  // ----------------------------------------------------------------- draw

  const drawPizza = (g: CanvasRenderingContext2D) => {
    const [wx, wy] = volume(pizza.wob.value)
    const lifted = pizza.state === 'held' || pizza.state === 'moving'
    if (lifted && pizza.flat > 0.9) ellipse(g, pizza.x + 10, pizza.y + 18, PR * pizza.scale, PR * pizza.scale * 0.96, 'rgba(60,30,0,0.2)')
    g.save()
    g.translate(pizza.x, pizza.y)
    g.rotate(pizza.rot)
    g.scale(pizza.scale * wx, pizza.scale * wy * pizza.flat)
    for (let b = 0; b < pizza.bites; b++) {
      const bt = BITES[b]!
      g.beginPath()
      g.rect(-PR * 2, -PR * 2, PR * 4, PR * 4)
      g.moveTo(bt.x + bt.r, bt.y)
      g.arc(bt.x, bt.y, bt.r, 0, TAU)
      g.clip('evenodd')
    }
    const baked = pizza.baked
    circle(g, 0, 0, PR, baked === 0 ? '#fbe2b2' : baked === 1 ? '#eeac52' : '#5a3a22', baked === 0 ? '#dcae6c' : baked === 1 ? '#b26c24' : '#2e1c10', 6)
    g.fillStyle = baked === 2 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.28)'
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + 0.2
      g.beginPath()
      g.ellipse(Math.cos(a) * (PR - 10), Math.sin(a) * (PR - 10), 17, 6, a + Math.PI / 2, 0, TAU)
      g.fill()
    }
    circle(g, 0, 0, SR + 3, baked === 0 ? '#fff1d4' : baked === 1 ? '#f6cf8e' : '#4a2e1a')
    g.drawImage(sauce.canvas, -PR, -PR, PR * 2, PR * 2)
    g.drawImage(cheese.canvas, -PR, -PR, PR * 2, PR * 2)
    for (const t of pizza.toppings) {
      const s = t.pop.value
      const k = KINDS[t.kind]
      let lx = 0
      let ly = 0
      if (t.kind === 'eyeball') {
        const dx = lookX - (pizza.x + t.x * pizza.scale)
        const dy = lookY - (pizza.y + t.y * pizza.scale)
        const d = Math.max(60, Math.hypot(dx, dy))
        lx = dx / d
        ly = dy / d
      }
      const wig = t.kind === 'worm' ? Math.sin(stage.time * 5 + t.x) * 0.25 : 0
      ellipse(g, t.x + 3, t.y + 6, k.size * 0.42 * (2 - s), k.size * 0.36 * s, 'rgba(60,10,0,0.22)')
      drawTopping(g, t.kind, t.x, t.y, k.size, t.rot + wig, 2 - s, s, t.variant, lx, ly)
    }
    if (baked === 2) circle(g, 0, 0, PR, 'rgba(20,10,5,0.42)')
    g.restore()
  }

  const flame = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
    g.beginPath()
    g.moveTo(x - w, y)
    g.quadraticCurveTo(x - w * 1.1, y - h * 0.5, x, y - h)
    g.quadraticCurveTo(x + w * 1.1, y - h * 0.5, x + w, y)
    g.closePath()
    g.fillStyle = color
    g.fill()
  }

  const drawOven = (g: CanvasRenderingContext2D) => {
    const time = stage.time
    const heat = clamp(oven.heat + oven.flare.value * 0.7, 0, 1.6)
    g.save()
    archPath(g)
    g.clip()
    const glow = g.createRadialGradient(OVEN_X, COUNTER, 10, OVEN_X, COUNTER, 190)
    glow.addColorStop(0, `rgba(255,170,50,${clamp(0.45 + heat * 0.5, 0, 1)})`)
    glow.addColorStop(1, 'rgba(255,90,20,0)')
    g.fillStyle = glow
    g.fillRect(OVEN_X - 110, 210, 220, 200)
    g.fillStyle = '#5a3420'
    g.beginPath()
    g.roundRect(OVEN_X - 70, 376, 140, 22, 10)
    g.fill()
    for (let i = 0; i < 6; i++) {
      const x = OVEN_X - 80 + i * 32
      const h = (34 + 60 * heat) * (0.72 + 0.28 * Math.sin(time * (7 + i * 1.3) + i * 2))
      flame(g, x, 398, 22 + heat * 6, h, '#ff7a1a')
      flame(g, x, 398, 12 + heat * 4, h * 0.6, '#ffd23f')
    }
    if (pizza.state === 'baking') {
      drawPizza(g)
      for (const side of [-1, 1]) {
        const h = 50 + Math.sin(time * 11 + side) * 16
        flame(g, OVEN_X + side * 84, 402, 20, h, '#ff7a1a')
        flame(g, OVEN_X + side * 84, 402, 10, h * 0.6, '#ffd23f')
      }
      g.fillStyle = `rgba(255,190,70,${0.22 + Math.sin(time * 12) * 0.1 + pizza.bakeT * 0.06})`
      g.fillRect(OVEN_X - 110, 210, 220, 200)
    }
    g.restore()
    // A rim of light when it is roaring, or when the pizza is ready to go in.
    const ready = onBoard() && pizza.baked === 0 && mon.ticked.size === mon.order.want.length
    const rim = pizza.state === 'baking' ? 0.6 + Math.sin(time * 12) * 0.3 : ready ? 0.35 + Math.sin(time * 5) * 0.3 : oven.flare.value * 0.6
    if (rim > 0.03) {
      archPath(g, 8)
      g.strokeStyle = `rgba(255,200,70,${clamp(rim, 0, 1)})`
      g.lineWidth = 12
      g.stroke()
    }
  }

  const drawMon = (g: CanvasRenderingContext2D) => {
    const sp = mon.sp
    const time = stage.time
    const base = monBase()
    const x = monX()
    const breathe = 1 + Math.sin(time * 2.2) * 0.014
    const [sx, sy] = volume(mon.sq.value * breathe)
    let lean = mon.lean.value * 0.05 + mon.lunge * 0.2
    if (mon.dance > 0) lean += Math.sin(mon.dance * 9) * 0.13
    if (mon.wiggle > 0) lean += Math.sin(time * 34) * 0.09
    const fy = faceY(sp, base)
    const lx = clamp((lookX - x) / 320, -1, 1)
    const ly = clamp((lookY - fy) / 320, -1, 1)
    const blinkPhase = (time + sp.pitch) % 3.4
    g.save()
    g.beginPath()
    g.rect(0, 0, W, COUNTER + 1)
    g.clip()
    drawMonster(g, sp, {
      x,
      base,
      sx,
      sy,
      lean,
      mouth: mon.mouth,
      mood: mon.mood,
      lookX: lx,
      lookY: ly,
      blink: blinkPhase < 0.12 && mon.mood !== 'love' && mon.mood !== 'dizzy' ? 1 : 0,
      tint: mon.tint,
      tintAmount: mon.tintAmount,
      eyeScale: mon.eye.value,
      drool: !mon.reacting && onBoard() && pizza.baked > 0 ? 1 : 0,
      time,
    })
    g.restore()
    if (mon.rise < 0.55) return
    const shoulderY = base - sp.h * 0.4
    for (const side of [-1, 1]) {
      const restX = x + side * (sp.w + 26)
      const restY = COUNTER + 8
      const upX = x + side * (sp.w + 48) + Math.sin(time * 9 + side) * 12
      const upY = base - sp.h * 0.88 + Math.cos(time * 9 + side) * 14
      let hx = lerp(restX, upX, mon.arms)
      let hy = lerp(restY, upY, mon.arms)
      if (side > 0 && mon.hold > 0 && pizza.state === 'serving') {
        hx = pizza.x + 30
        hy = pizza.y + PR * pizza.scale * 0.8
      }
      drawArm(g, sp, x + side * sp.w * 0.8, Math.min(shoulderY, COUNTER - 10), hx, hy, side)
    }
  }

  const drawBubble = (g: CanvasRenderingContext2D) => {
    if (mon.bubble <= 0.02) return
    const { icons, rx, ry } = mon.layout
    const time = stage.time
    const s = mon.bubble * mon.bub.value
    const tailX = MX + mon.sp.w + 20
    const tailY = 230
    g.save()
    g.translate(tailX, tailY)
    g.scale(s, s)
    g.translate(-tailX, -tailY)
    const bob = Math.sin(time * 1.8) * 4
    for (const pass of [0, 1]) {
      g.fillStyle = pass === 0 ? 'rgba(70,40,100,0.2)' : '#ffffff'
      const oy = pass === 0 ? 7 : 0
      g.beginPath()
      g.ellipse(BUB_X, BUB_Y + bob + oy, rx, ry, 0, 0, TAU)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU
        const bx = BUB_X + Math.cos(a) * rx * 0.88
        const by = BUB_Y + bob + oy + Math.sin(a) * ry * 0.82
        g.moveTo(bx + 30, by)
        g.arc(bx, by, 30, 0, TAU)
      }
      const ex = BUB_X - rx * 0.78
      g.moveTo(ex - 6, BUB_Y + ry + 14 + oy)
      g.arc(ex - 22, BUB_Y + ry + 14 + oy + bob * 0.6, 16, 0, TAU)
      g.moveTo(lerp(ex, tailX, 0.7), lerp(BUB_Y + ry + 20, tailY, 0.7) + oy)
      g.arc(lerp(ex, tailX, 0.7) - 9, lerp(BUB_Y + ry + 20, tailY, 0.7) + oy, 9, 0, TAU)
      g.fill()
    }
    for (const ic of icons) {
      const done = !ic.no && mon.ticked.has(ic.kind)
      const shake = ic.no && mon.noShake > 0 ? Math.sin(time * 50) * 6 : 0
      const x = ic.x + shake
      const y = ic.y + bob
      const pulse = !ic.no && !done ? 1 + Math.sin(time * 4 + ic.x) * 0.04 : 1
      drawTopping(g, ic.kind, x, y, ic.size * ic.sq.value * pulse, 0, 1, 1, 0, 0, 0)
      if (ic.no) {
        g.strokeStyle = '#ff3b3b'
        g.lineWidth = 9
        g.lineCap = 'round'
        g.beginPath()
        g.arc(x, y, ic.size * 0.56, 0, TAU)
        g.moveTo(x - ic.size * 0.4, y - ic.size * 0.4)
        g.lineTo(x + ic.size * 0.4, y + ic.size * 0.4)
        g.stroke()
      } else if (done) {
        const cx = x + ic.size * 0.36
        const cy = y + ic.size * 0.34
        circle(g, cx, cy, 17, '#3fc45a', '#ffffff', 4)
        g.strokeStyle = '#ffffff'
        g.lineWidth = 6
        g.lineCap = 'round'
        g.lineJoin = 'round'
        g.beginPath()
        g.moveTo(cx - 8, cy)
        g.lineTo(cx - 2, cy + 7)
        g.lineTo(cx + 9, cy - 7)
        g.stroke()
      }
    }
    g.restore()
  }

  const BOWL_SPOTS = [[-22, -18, -0.4], [20, -22, 0.5], [-26, 14, 0.3], [24, 12, -0.6], [0, -2, 0.1], [-2, 26, 0.8]] as const

  const drawBowl = (g: CanvasRenderingContext2D, k: KindKey) => {
    const b = bowls[k]
    const time = stage.time
    const locked = !unlocked.includes(k)
    const wanted = !locked && onBoard() && mon.order.want.includes(k) && !mon.ticked.has(k) && mon.bubble > 0.9
    const s = b.sq.value * b.appear * (wanted ? 1 + Math.sin(time * 5) * 0.05 : 1)
    if (s <= 0.01) return
    if (wanted || time < b.newUntil) {
      g.globalAlpha = 0.5 + Math.sin(time * 5) * 0.3
      circle(g, b.x, BOWL_Y, BOWL_R + 12, 'rgba(255,255,255,0)', time < b.newUntil ? '#ffe14d' : '#ffffff', 7)
      g.globalAlpha = 1
    }
    g.save()
    g.translate(b.x, BOWL_Y)
    g.scale(s, s)
    ellipse(g, 3, 8, BOWL_R + 2, BOWL_R - 2, 'rgba(40,15,0,0.35)')
    circle(g, 0, 0, BOWL_R, KINDS[k].bowl, 'rgba(0,0,0,0.25)', 4)
    circle(g, 0, 0, BOWL_R - 10, 'rgba(60,30,40,0.35)')
    g.beginPath()
    g.ellipse(-20, -32, 22, 8, -0.5, 0, TAU)
    g.fillStyle = 'rgba(255,255,255,0.45)'
    g.fill()
    if (k === 'cheese') {
      g.lineCap = 'round'
      g.lineWidth = 7
      for (let i = 0; i < 12; i++) {
        const a = i * 2.4
        const r = 8 + ((i * 7) % 26)
        const x = Math.cos(a) * r
        const y = Math.sin(a) * r
        g.strokeStyle = i % 3 === 0 ? '#fff1b0' : i % 3 === 1 ? '#ffd95a' : '#ffe88a'
        g.beginPath()
        g.moveTo(x - Math.cos(a * 1.7) * 11, y - Math.sin(a * 1.7) * 11)
        g.lineTo(x + Math.cos(a * 1.7) * 11, y + Math.sin(a * 1.7) * 11)
        g.stroke()
      }
      drawTopping(g, k, 2, -2, 46)
    } else {
      BOWL_SPOTS.forEach(([x, y, r], i) => {
        const d = Math.max(80, dist(lookX, lookY, b.x, BOWL_Y))
        const wig = k === 'worm' ? Math.sin(time * 4 + i * 2) * 0.3 : 0
        drawTopping(g, k, x, y, k === 'eyeball' ? 34 : 40, r + wig, 1, 1, i, (lookX - b.x) / d, (lookY - BOWL_Y) / d)
      })
    }
    if (locked) {
      circle(g, 0, 0, BOWL_R, 'rgba(50,35,60,0.62)')
      sprite(g, '🔒', 0, -8, 40)
      label(g, `${Math.max(0, KINDS[k].unlock - coins)}`, 8, 30, 26, '#ffe14d')
      circle(g, -16, 30, 9, '#ffd23f', '#c98a00', 3)
    }
    g.restore()
  }

  const drawLadle = (g: CanvasRenderingContext2D, x: number, y: number) => {
    g.lineCap = 'round'
    g.strokeStyle = '#7d8a96'
    g.lineWidth = 14
    g.beginPath()
    g.moveTo(x + 12, y - 12)
    g.lineTo(x + 66, y - 92)
    g.stroke()
    g.strokeStyle = '#dfe6ec'
    g.lineWidth = 8
    g.stroke()
    circle(g, x, y, 26, '#dfe6ec', '#7d8a96', 5)
    circle(g, x, y, 19, '#e8452c')
    ellipse(g, x - 6, y - 7, 7, 4, 'rgba(255,255,255,0.45)', -0.5)
  }

  const drawPot = (g: CanvasRenderingContext2D) => {
    const time = stage.time
    const calling = onBoard() && !pizza.sauceDone
    const s = potSq.value * (calling ? 1 + Math.sin(time * 5) * 0.035 : 1)
    g.save()
    g.translate(POT_X, POT_Y)
    g.scale(s, s)
    ellipse(g, 5, 10, POT_R + 4, POT_R, 'rgba(60,30,0,0.25)')
    for (const side of [-1, 1]) {
      g.beginPath()
      g.roundRect(side * (POT_R + 4) - 14, -14, 28, 28, 10)
      g.fillStyle = '#9aa6b2'
      g.fill()
    }
    circle(g, 0, 0, POT_R, '#dfe6ec', '#7d8a96', 6)
    circle(g, 0, 0, POT_R - 12, '#e8452c', '#a8261c', 4)
    g.strokeStyle = 'rgba(255,140,100,0.7)'
    g.lineWidth = 7
    g.lineCap = 'round'
    for (let i = 0; i < 3; i++) {
      g.beginPath()
      g.arc(0, 0, 14 + i * 14, time * 0.8 + i * 2, time * 0.8 + i * 2 + 1.6)
      g.stroke()
    }
    // A bubble that swells and pops.
    const bub = (time * 0.7) % 1
    circle(g, 18, -14, 4 + bub * 8, `rgba(255,150,120,${0.8 - bub * 0.8})`)
    g.restore()
    if (!held || held.kind !== 'sauce') drawLadle(g, POT_X + 8, POT_Y + 6)
  }

  const drawCoin = (g: CanvasRenderingContext2D, x: number, y: number, r: number, squish = 1) => {
    g.beginPath()
    g.ellipse(x, y, r * squish, r, 0, 0, TAU)
    g.fillStyle = '#ffd23f'
    g.fill()
    g.lineWidth = Math.max(2, r * 0.22)
    g.strokeStyle = '#c98a00'
    g.stroke()
    g.beginPath()
    g.ellipse(x - r * 0.25 * squish, y - r * 0.25, r * 0.28 * squish, r * 0.18, -0.6, 0, TAU)
    g.fillStyle = 'rgba(255,255,255,0.7)'
    g.fill()
  }

  const drawJar = (g: CanvasRenderingContext2D) => {
    const [sx, sy] = volume(jarSq.value)
    g.save()
    g.translate(JAR_X, JAR_Y + 62)
    g.scale(sx, sy)
    g.translate(-JAR_X, -(JAR_Y + 62))
    ellipse(g, JAR_X + 4, JAR_Y + 62, 62, 16, 'rgba(60,30,0,0.25)')
    g.beginPath()
    g.roundRect(JAR_X - 54, JAR_Y - 56, 108, 120, 26)
    g.fillStyle = 'rgba(210,240,255,0.55)'
    g.fill()
    g.save()
    g.clip()
    const shown = Math.min(coins, 18)
    for (let i = 0; i < shown; i++) {
      const col = i % 3
      const row = Math.floor(i / 3)
      drawCoin(g, JAR_X - 30 + col * 30 + (row % 2) * 6 - 3, JAR_Y + 50 - row * 15, 15)
    }
    g.restore()
    g.lineWidth = 6
    g.strokeStyle = 'rgba(255,255,255,0.95)'
    g.stroke()
    g.beginPath()
    g.roundRect(JAR_X - 44, JAR_Y - 72, 88, 22, 8)
    g.fillStyle = '#ff7a5a'
    g.fill()
    g.strokeStyle = '#b8432a'
    g.lineWidth = 4
    g.stroke()
    g.fillStyle = '#5a2a1a'
    g.fillRect(JAR_X - 18, JAR_Y - 66, 36, 6)
    ellipse(g, JAR_X - 34, JAR_Y - 10, 6, 34, 'rgba(255,255,255,0.6)')
    g.restore()
    label(g, `${coins}`, JAR_X, JAR_Y - 104, 40, '#ffe14d')
    drawCoin(g, JAR_X - 44 - (coins > 9 ? 12 : 0), JAR_Y - 104, 15)
  }

  const drawHint = (g: CanvasRenderingContext2D) => {
    const time = stage.time
    if (time - lastTouchAt < 4.5 || held) return
    const u = (time % 2) / 2
    const glideTo = (ax: number, ay: number, bx: number, by: number) => {
      const t = ease.inOutQuad(clamp(u * 1.5, 0, 1))
      hint(g, lerp(ax, bx, t), lerp(ay, by, t), time, 72)
    }
    if (!onBoard()) return
    const missing = mon.order.want.find((k) => !mon.ticked.has(k))
    const bare = pizza.toppings.length === 0 && pizza.cheese.length === 0
    if (!pizza.sauceDone && pizza.baked === 0 && (bare || !missing)) {
      if (u < 0.45) glideTo(POT_X, POT_Y, BX, BY)
      else hint(g, BX + Math.sin(u * 22) * 70, BY + Math.cos(u * 15) * 40, time, 72)
      return
    }
    if (missing && pizza.baked === 0) {
      glideTo(bowls[missing].x, BOWL_Y, BX, BY)
      return
    }
    if (pizza.baked === 0) glideTo(BX, BY, OVEN_X, 340)
    else glideTo(BX, BY, MX + 60, 300)
  }

  const draw = (g: CanvasRenderingContext2D) => {
    const time = stage.time
    g.drawImage(bg, 0, 0, W, H)
    for (const m of marks) ellipse(g, m.x, m.y, m.r * 1.3, m.r, 'rgba(255,255,255,0.3)', m.rot)
    drawOven(g)
    if (pizza.state === 'serving') drawPizza(g)
    drawMon(g)
    drawBubble(g)
    drawPot(g)
    drawJar(g)
    for (const k of visibleBowls()) drawBowl(g, k)
    if (pizza.state === 'board' || pizza.state === 'held' || pizza.state === 'moving') drawPizza(g)

    for (const f of flyers) {
      const t = ease.outQuad(clamp(f.t, 0, 1))
      const x = lerp(f.x0, f.x1, t)
      const y = lerp(f.y0, f.y1, f.t) - Math.sin(f.t * Math.PI) * f.arc
      const stretch = 1 + Math.sin(f.t * Math.PI) * 0.25
      if (f.kind === 'sauce') {
        circle(g, x, y, 22 * stretch, '#e8452c', '#a8261c', 4)
        circle(g, x - 7, y - 8, 6, 'rgba(255,255,255,0.4)')
      } else {
        drawTopping(g, f.kind, x, y, 60, f.t * f.spin, 1 / stretch, stretch, f.variant)
      }
    }
    for (const c of coinsFlying) {
      if (c.delay > 0) continue
      const t = ease.inOutQuad(c.t)
      const x = lerp(MX + 100, JAR_X, t)
      const y = lerp(290, JAR_Y - 60, t) - Math.sin(c.t * Math.PI) * 220
      drawCoin(g, x, y, 22, Math.abs(Math.cos(c.t * 14)) * 0.8 + 0.2)
    }
    if (held) {
      if (held.kind === 'sauce') {
        drawLadle(g, held.x, held.y - 10)
      } else if (held.kind !== 'rub' && held.kind !== 'pizza') {
        const sway = clamp((stage.pointers.get(held.id)?.vx ?? 0) * 0.0006, -0.5, 0.5)
        ellipse(g, held.x, held.y + 12, 26, 9, 'rgba(40,15,0,0.2)')
        drawTopping(g, held.kind, held.x, held.y - 30, 72, sway + Math.sin(time * 9) * 0.06, 1, 1, held.variant, 0, 0)
      }
    }
    drawHint(g)
  }

  return { update, draw, down, move, up }
}

export const proto: Proto = {
  meta: {
    key: 'monster-pizza',
    name: 'Monster Pizza',
    emoji: '🍕',
    ages: [4, 8],
    pitch: 'Smear sauce, plop on toppings (worms and eyeballs welcome), bake it, and feed it to a hungry monster.',
    howTo: 'Rub sauce on the base, tap or drag toppings from the bowls, push the pizza into the oven, then slide it to the monster.',
    basedOn: "Papa's Pizzeria, Toca Kitchen, Bluey's pizza oven",
    whyFun: 'Cook and transform, then feed a character and get a face back; mess and silly toppings are welcome and nothing is ever wrong.',
  },
  create,
}
