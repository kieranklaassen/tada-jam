// Egg Heist: a raccoon sneaks across a farmyard, pinches eggs from under a
// goose's beak and carries them home, where they hatch into pets that earn
// coins. The goose's vision cone is the whole game: stay out of it, hide in a
// bush when it turns, and leg it when it honks.

import { blinkAt, circle, ellipse, eyes, hint, label, rrect, shadow, sprite, star, volume } from '../../kit/draw.ts'
import { TAU, clamp, damp, dist, ease, lerp, pick, rnd, rndInt, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { drawBush, drawCan, drawCoin, drawDog, drawEgg, drawGoose, drawRaccoon, paintBackdrop, paintDen, paintHedges, paintKennel } from './art.ts'
import type { RaccoonLook } from './art.ts'
import { BARN_DOOR, BOUNDS, BUSHES, BUSH_R, DEN, DOG_LEASH, DOG_REST, DOG_SENSE, HOME, KENNEL, NESTS, SAFE, angDiff, inPond, pushOut, route, sight, turnTo } from './world.ts'
import type { Pt } from './world.ts'

const RARITY = [
  { carry: 0.9, value: 5, pay: 1, size: 46, pets: ['🐥', '🐤', '🐣'], cheer: '' },
  { carry: 0.8, value: 12, pay: 2, size: 48, pets: ['🦆', '🦉', '🐢'], cheer: 'SPOTTY!' },
  { carry: 0.68, value: 40, pay: 6, size: 54, pets: ['🦚', '🦢', '🦜'], cheer: 'GOLDEN!' },
  { carry: 0.6, value: 150, pay: 20, size: 70, pets: ['🐲'], cheer: 'DRAGON!!' },
] as const

const SHOE_PRICES = [15, 45, 120]
const CAN_PRICE = 8
const COSTUME_PRICE = 20
const COSTUME_TIME = 7
const BASE_SPEED = 300
const MILESTONES = [3, 6, 10, 15, 21]
// How far past its own body a guard notices the raccoon without looking.
const NEAR = 34
// The tiptoe tune the raccoon's feet play, one note a step.
const SNEAK = [0, 2, 3, 2, 0, 2, 3, 5, 3, 2, 0, -2]

// Where hatched pets sit: rows below the den, then above it.
const SLOTS: Pt[] = []
{
  const xs = [106, 166, 46]
  const below = [582, 640, 698, 756]
  const above = [306, 248, 190]
  for (let r = 0; r < 4; r++) {
    for (const x of xs) SLOTS.push({ x, y: below[r]! })
    if (r < 3) for (const x of xs) SLOTS.push({ x, y: above[r]! })
  }
}

interface Egg {
  rarity: number
  x: number
  y: number
  // Height off the ground.
  z: number
  state: 'nest' | 'carried' | 'fly' | 'hatch'
  nest: number
  grow: number
  wob: Spring
  seed: number
}

interface Nest {
  x: number
  y: number
  tier: number
  egg: Egg | null
  respawnAt: number
}

interface Pet {
  emoji: string
  rarity: number
  x: number
  y: number
  slot: number
  grow: number
  sq: Spring
  seed: number
}

type GuardState = 'patrol' | 'peek' | 'glance' | 'alert' | 'chase' | 'search' | 'decoy' | 'gloat'

interface Guard {
  kind: 'goose' | 'gosling' | 'farmer'
  x: number
  y: number
  r: number
  path: readonly Pt[]
  wp: number
  heading: number
  look: number
  state: GuardState
  t: number
  // 0..1: how sure it is that it saw something.
  susp: number
  blind: number
  len: number
  half: number
  walk: number
  run: number
  seenX: number
  seenY: number
  canX: number
  canY: number
  flip: number
  step: number
  moving: number
  low: number
  beak: number
  honkT: number
  nextGlance: number
  squash: Spring
  pop: number
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  // ------------------------------------------------------------ cached art
  const layer = (w: number, h: number) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return c
  }
  const bg = layer(W, H)
  const props = layer(W, H)
  const vignette = layer(296, 206)
  {
    const c = bg.getContext('2d')
    if (c) paintBackdrop(c, stage.rand)
    const p = props.getContext('2d')
    if (p) {
      paintDen(p)
      paintKennel(p)
      paintHedges(p)
    }
    const v = vignette.getContext('2d')
    if (v) {
      const grad = v.createRadialGradient(148, 103, 95, 148, 103, 185)
      grad.addColorStop(0, 'rgba(255,40,50,0)')
      grad.addColorStop(1, 'rgba(255,40,50,1)')
      v.fillStyle = grad
      v.fillRect(0, 0, 296, 206)
    }
  }

  // ------------------------------------------------------------ state
  let coins = 0
  let income = 0
  let deliveries = 0
  let streak = 0
  let shoes = 0
  let bought = 0
  let touches = 0
  let lastTouchAt = 0
  let activeId: number | null = null
  const uiIds = new Set<number>()
  let payT = 3
  let beatT = 0
  let danger = 0
  let slotAt = 0
  let stepSide = 0
  let stepAt = 0
  let sweatT = 0
  let farmerOut = false
  let goslingOut = false
  let milestoneAt = 0
  const coinPunch = spring(1, 260, 11)
  // The album: how many of each rarity have hatched. Four empty egg shapes
  // beside the coins are the long game.
  const owned = [0, 0, 0, 0]
  const albumPop = owned.map(() => spring(1, 240, 9))
  let fullSet = false

  const rac = {
    x: HOME.x,
    y: HOME.y,
    vx: 0,
    vy: 0,
    tx: HOME.x,
    ty: HOME.y,
    flip: 1,
    phase: 0,
    moving: 0,
    stepAcc: 0,
    carry: null as Egg | null,
    bush: -1,
    costume: 0,
    punt: null as { fromX: number; fromY: number; t: number } | null,
    dizzy: 0,
    glee: 0,
    scare: 0,
    sq: spring(1, 230, 11),
    eggWob: spring(0, 120, 6),
  }

  const nests: Nest[] = NESTS.map((n) => ({ x: n.x, y: n.y, tier: n.tier, egg: null, respawnAt: 0 }))
  const eggs: Egg[] = []
  const pets: Pet[] = []
  const prints: { x: number; y: number; life: number; rot: number }[] = []
  const bushes = BUSHES.map((b) => ({ x: b.x, y: b.y, sq: spring(1, 240, 9), lean: spring(0, 180, 7) }))
  const guards: Guard[] = []
  const can = { state: 'none' as 'none' | 'fly' | 'down', x: 0, y: 0, z: 0, t: 0, rot: 0 }
  const shop = [
    { x: 622, y: 46, sp: spring(1, 300, 11), shake: 0 },
    { x: 728, y: 46, sp: spring(1, 300, 11), shake: 0 },
    { x: 834, y: 46, sp: spring(1, 300, 11), shake: 0 },
  ]
  const dog = {
    x: DOG_REST.x,
    y: DOG_REST.y,
    state: 'sleep' as 'sleep' | 'stir' | 'awake' | 'chase' | 'back',
    t: 0,
    sleepFor: 9,
    flip: -1,
    phase: 0,
    bark: 0,
    barkT: 0,
    strain: 0,
  }

  // ------------------------------------------------------------ helpers
  // Floating words, kept on the field however near the edge they start.
  const say = (x: number, y: number, text: string, color: string, size: number, life = 0.9, outline?: string) => {
    const half = text.length * size * 0.33 + 12
    fx.text(clamp(x, half, W - half), Math.max(y, size), text, outline ? { color, size, life, outline } : { color, size, life })
  }
  const priceOf = (i: number): number | null => (i === 0 ? (SHOE_PRICES[shoes] ?? null) : i === 1 ? CAN_PRICE : COSTUME_PRICE)
  const addCoins = (n: number) => {
    coins += n
    coinPunch.kick(5)
  }
  const atHome = () => dist(rac.x, rac.y, SAFE.x, SAFE.y) < SAFE.r
  const racVisible = () => rac.bush < 0 && rac.costume <= 0 && !rac.punt && !atHome()
  const chased = () => dog.state === 'chase' || guards.some((gd) => gd.state === 'chase' || gd.state === 'alert')

  const spawnEgg = (index: number, first: boolean) => {
    const n = nests[index]!
    let rarity = n.tier
    // Now and then a nest lays something better than usual.
    if (!first && n.tier < 2 && Math.random() < 0.15) rarity++
    const egg: Egg = { rarity, x: n.x, y: n.y, z: 0, state: 'nest', nest: index, grow: first ? 1 : 0, wob: spring(0, 150, 5), seed: rnd(0, 6) }
    eggs.push(egg)
    n.egg = egg
    if (first) return
    stage.tween(0.45, (t) => (egg.grow = t), ease.outBack)
    sfx.pop(2 + rarity * 2)
    fx.burst(n.x, n.y - 20, { count: 8, color: '#fff7c9', speed: 200, life: 0.5, size: 8, shape: 'star', gravity: 0 })
    if (rarity > n.tier) fx.text(n.x, n.y - 70, '✨', { size: 44 })
  }
  nests.forEach((_, i) => spawnEgg(i, true))

  const flyEgg = (egg: Egg, toX: number, toY: number, seconds: number, arc: number, done: () => void) => {
    const fromX = egg.x
    const fromY = egg.y
    const fromZ = egg.z
    egg.state = 'fly'
    stage.tween(
      seconds,
      (t) => {
        egg.x = lerp(fromX, toX, t)
        egg.y = lerp(fromY, toY, t)
        egg.z = lerp(fromZ, 0, t) + Math.sin(t * Math.PI) * arc
        egg.wob.value = t * TAU * 2
      },
      ease.inOutQuad,
      () => {
        egg.wob.value = 0
        done()
      },
    )
  }

  const makeGuard = (kind: Guard['kind'], path: readonly Pt[], x: number, y: number, wp: number): Guard => {
    const stats = kind === 'goose' ? { r: 30, len: 250, half: 0.5, walk: 100, run: 245 } : kind === 'gosling' ? { r: 24, len: 195, half: 0.5, walk: 128, run: 232 } : { r: 30, len: 215, half: 0.72, walk: 64, run: 212 }
    const to = path[wp]!
    const heading = Math.atan2(to.y - y, to.x - x)
    return {
      kind,
      x,
      y,
      path,
      wp,
      heading,
      look: heading,
      state: 'patrol',
      t: 0,
      susp: 0,
      blind: 0,
      seenX: x,
      seenY: y,
      canX: x,
      canY: y,
      flip: Math.cos(heading) >= 0 ? 1 : -1,
      step: 0,
      moving: 0,
      low: 0,
      beak: 0,
      honkT: 0,
      nextGlance: rnd(5, 8),
      squash: spring(1, 220, 10),
      pop: 1,
      ...stats,
    }
  }
  // The big goose walks a loop round the pond, past every near nest.
  guards.push(
    makeGuard(
      'goose',
      [
        { x: 430, y: 245 },
        { x: 800, y: 245 },
        { x: 800, y: 610 },
        { x: 430, y: 610 },
      ],
      800,
      300,
      2,
    ),
  )

  const setState = (gd: Guard, state: GuardState) => {
    gd.state = state
    gd.t = 0
    if (state !== 'alert' && state !== 'chase') gd.susp = 0
    if (state === 'peek') {
      const next = gd.path[gd.wp]!
      gd.heading = Math.atan2(next.y - gd.y, next.x - gd.x)
    }
    if (state === 'patrol') {
      gd.susp = 0
      gd.nextGlance = rnd(3.5, 7)
    }
  }
  const nearestWaypoint = (gd: Guard) => {
    let best = 0
    let bestD = Infinity
    gd.path.forEach((p, i) => {
      const d = dist(gd.x, gd.y, p.x, p.y)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    gd.wp = best
  }

  // ------------------------------------------------------------ sound
  const honk = (gd: Guard, big = false) => {
    gd.beak = 1
    gd.squash.kick(3)
    if (gd.kind === 'farmer') {
      sfx.tone({ freq: 260 * rnd(0.95, 1.05), to: 170, dur: 0.22, type: 'square', vol: 0.13 })
      return
    }
    const base = (gd.kind === 'gosling' ? 640 : 470) * rnd(0.95, 1.06)
    sfx.tone({ freq: base, to: base * 0.7, dur: big ? 0.28 : 0.16, type: 'sawtooth', vol: big ? 0.2 : 0.13 })
    sfx.tone({ freq: base * 0.5, to: base * 0.38, dur: big ? 0.24 : 0.14, type: 'square', vol: 0.07 })
  }
  const hm = (gd: Guard) => {
    const base = gd.kind === 'farmer' ? 200 : gd.kind === 'gosling' ? 560 : 400
    sfx.tone({ freq: base, to: base * 1.35, dur: 0.16, type: 'triangle', vol: 0.1 })
    gd.beak = 0.5
  }
  const woof = (big = false) => {
    sfx.tone({ freq: 210 * rnd(0.93, 1.07), to: 110, dur: 0.13, type: 'square', vol: big ? 0.2 : 0.14 })
    sfx.noise({ dur: 0.09, freq: 700, vol: big ? 0.2 : 0.12, filter: 'lowpass' })
    dog.bark = 1
  }
  const heartbeat = (strength: number) => {
    const vol = 0.14 + strength * 0.2
    sfx.tone({ freq: 125, to: 62, dur: 0.11, type: 'sine', vol })
    sfx.tone({ freq: 110, to: 56, dur: 0.12, type: 'sine', vol: vol * 0.8, delay: 0.15 })
  }
  const rustle = (index: number) => {
    const b = bushes[index]!
    b.sq.value = 0.78
    b.lean.kick(rnd(-3, 3))
    sfx.noise({ dur: 0.15, freq: 2800, to: 1100, vol: 0.13, q: 0.7 })
    fx.burst(b.x, b.y - 24, { count: 7, color: ['#36a24d', '#52bd61', '#2b8a40'], speed: 210, life: 0.6, size: 10, shape: 'square', gravity: 320 })
  }

  // ------------------------------------------------------------ events
  // The farmer comes out of the barn when the raccoon has got too bold.
  const releaseFarmer = () => {
    if (farmerOut) return
    farmerOut = true
    const farmer = makeGuard(
      'farmer',
      [
        { x: 1080, y: 215 },
        { x: 1112, y: 330 },
        { x: 1112, y: 520 },
        { x: 1112, y: 330 },
        { x: 1080, y: 215 },
        { x: 890, y: 200 },
      ],
      BARN_DOOR.x,
      BARN_DOOR.y + 24,
      0,
    )
    farmer.pop = 0
    stage.tween(0.6, (t) => (farmer.pop = t), ease.outBack)
    guards.push(farmer)
    sfx.tone({ freq: 140, to: 230, dur: 0.4, type: 'sawtooth', vol: 0.08 })
    sfx.thud(0.8)
    honk(farmer)
    fx.ring(BARN_DOOR.x, BARN_DOOR.y + 20, '#ffffff', 150, 0.6)
    say(BARN_DOOR.x - 40, BARN_DOOR.y + 80, 'HEY!', '#ffd9a0', 50, 1.2)
    fx.shake(5)
  }

  const grab = (egg: Egg) => {
    rac.carry = egg
    egg.state = 'carried'
    rac.sq.value = 1.3
    rac.glee = 0.45
    rac.eggWob.kick(5)
    const tier = egg.rarity
    sfx.boing(2 + tier)
    sfx.ding(tier * 2)
    if (tier >= 2) {
      sfx.ding(tier * 2 + 2)
      fx.hitstop(50)
      fx.flash(tier === 3 ? '#c08bff' : '#fff2a0', 0.3, 0.2)
    }
    fx.burst(egg.x, egg.y - 30, { count: 10 + tier * 5, color: tier === 3 ? ['#c08bff', '#6efadc'] : ['#fff7c9', '#ffe14d'], speed: 300, life: 0.5, size: 10, shape: 'star', gravity: 0 })
    say(egg.x, egg.y - 90, pick(['YOINK!', 'MINE!', 'GOT IT!', 'SWIPED!']), '#ffffff', 36 + tier * 6)
    fx.ring(SAFE.x, SAFE.y, '#ffe14d', SAFE.r + 30, 0.6)
    // Lifting the dragon egg is what finally brings the farmer out.
    if (tier === 3 && !farmerOut) stage.after(0.5, releaseFarmer)
  }

  const hatch = (egg: Egg, slot: number) => {
    const at = eggs.indexOf(egg)
    if (at >= 0) eggs.splice(at, 1)
    const info = RARITY[egg.rarity]!
    const old = pets.findIndex((p) => p.slot === slot)
    if (old >= 0) pets.splice(old, 1)
    const pet: Pet = { emoji: pick(info.pets), rarity: egg.rarity, x: egg.x, y: egg.y, slot, grow: 0, sq: spring(1, 200, 8), seed: rnd(0, 10) }
    for (const other of pets) other.sq.kick(3.5)
    pets.push(pet)
    stage.tween(0.5, (t) => (pet.grow = t), ease.outBack)
    pet.sq.kick(5)
    income += info.pay
    owned[egg.rarity] = (owned[egg.rarity] ?? 0) + 1
    albumPop[egg.rarity]!.value = 1.7
    if (!fullSet && owned.every((n) => n > 0)) {
      fullSet = true
      stage.after(1.1, () => {
        sfx.fanfare()
        fx.confetti(W * 0.25, H * 0.5, 70)
        fx.confetti(W * 0.75, H * 0.5, 70)
        fx.flash('#fff2a0', 0.35, 0.3)
        say(W / 2, 330, 'FULL SET!', '#fff3b0', 84, 1.8)
      })
    }
    sfx.crunch()
    sfx.pop(3 + egg.rarity * 2)
    fx.burst(egg.x, egg.y - 24, { count: 12, color: ['#fffaf0', '#8fe0ee', '#ffd13b', '#8a4dff'][egg.rarity] ?? '#fff', speed: 330, life: 0.7, size: 11, shape: 'square', gravity: 700 })
    fx.burst(egg.x, egg.y - 30, { count: 5, color: '#ff7aa8', speed: 160, life: 0.8, size: 14, shape: 'heart', gravity: -120 })
    if (info.cheer) say(egg.x + 40, egg.y - 80, info.cheer, egg.rarity === 3 ? '#d9b8ff' : '#fff3b0', 34 + egg.rarity * 6, 1.2)
    if (egg.rarity === 3) {
      fx.flash('#c08bff', 0.5, 0.35)
      fx.shake(14, 0.4)
      fx.confetti(W / 2, H * 0.55, 120)
      fx.hitstop(80)
    }
    const hit = MILESTONES[milestoneAt]
    if (hit !== undefined && pets.length >= hit) {
      milestoneAt++
      stage.after(0.5, () => {
        sfx.fanfare()
        fx.confetti(W * 0.3, H * 0.5, 50)
        fx.confetti(W * 0.7, H * 0.5, 50)
        say(W / 2, 250, `${hit} PETS!`, '#fff3b0', 76, 1.6)
      })
    }
  }

  const deliver = () => {
    const egg = rac.carry
    if (!egg) return
    rac.carry = null
    const info = RARITY[egg.rarity]!
    const nest = nests[egg.nest]!
    nest.egg = null
    nest.respawnAt = stage.time + 4 + egg.rarity * 2.5
    streak++
    deliveries++
    const mult = Math.min(streak, 5)
    const gain = info.value * mult
    addCoins(gain)
    const slot = slotAt++ % SLOTS.length
    const spot = SLOTS[slot]!
    egg.x = rac.x
    egg.y = rac.y
    egg.z = 100
    flyEgg(egg, spot.x, spot.y, 0.5, 130, () => {
      egg.state = 'hatch'
      sfx.thud(0.4)
      for (let k = 0; k < 3; k++) {
        stage.after(0.08 + k * 0.22, () => {
          egg.wob.kick(k % 2 ? -7 : 7)
          sfx.tick()
        })
      }
      stage.after(0.8, () => hatch(egg, slot))
    })
    sfx.coin(Math.min(streak - 1, 8))
    if (egg.rarity >= 2) sfx.fanfare()
    else sfx.win()
    fx.confetti(rac.x, rac.y - 70, 18 + egg.rarity * 24)
    say(rac.x + 30, rac.y - 120, `+${gain}`, '#ffe14d', 52)
    if (mult > 1) say(rac.x + 40, rac.y - 178, `SNEAKY x${mult}!`, '#a8f5a0', 34, 1.2)
    fx.shake(egg.rarity >= 2 ? 8 : 3)
    rac.glee = 1
    rac.sq.value = 1.35
  }

  const caught = (word: string, byX: number) => {
    if (rac.punt) return
    fx.hitstop(90)
    fx.shake(13, 0.35)
    fx.flash('#ffffff', 0.35, 0.12)
    fx.burst(rac.x, rac.y - 40, { count: 16, color: '#ffffff', speed: 420, life: 0.8, size: 13, shape: 'square', gravity: 400 })
    fx.burst(rac.x, rac.y - 50, { count: 8, color: '#ffe14d', speed: 360, life: 0.6, size: 14, shape: 'star', gravity: 200 })
    say(rac.x, rac.y - 120, word, '#ff5d5d', 60, 1)
    sfx.thud(1.3)
    sfx.crunch()
    sfx.tone({ freq: 1300, to: 320, dur: 0.75, type: 'sine', vol: 0.16, delay: 0.08 })
    const egg = rac.carry
    if (egg) {
      rac.carry = null
      const nest = nests[egg.nest]!
      egg.x = rac.x
      egg.y = rac.y
      egg.z = 100
      flyEgg(egg, nest.x, nest.y, 0.7, 170, () => {
        egg.state = 'nest'
        egg.wob.kick(6)
        sfx.thud(0.5)
      })
    }
    streak = 0
    rac.punt = { fromX: rac.x, fromY: rac.y, t: 0 }
    rac.flip = byX > rac.x ? 1 : -1
    rac.costume = 0
    rac.bush = -1
    activeId = null
  }

  // Slipping a chase is its own little win: a taunt from the porch, a sigh
  // from a bush.
  let lastEscapeAt = -10
  const escaped = () => {
    if (stage.time - lastEscapeAt < 2) return
    lastEscapeAt = stage.time
    addCoins(3)
    if (atHome()) {
      say(rac.x + 20, rac.y - 130, pick(['NYAH NYAH!', 'TOO SLOW!', 'HEE HEE!']), '#a8f5a0', 36, 1.1)
      sfx.tone({ freq: 190, to: 120, dur: 0.3, type: 'sawtooth', vol: 0.1 })
      sfx.note(7, 0.1, 'square', 0.08)
      rac.glee = 1
      rac.sq.value = 1.3
    } else {
      say(rac.x, rac.y - 130, 'PHEW!', '#a8f5a0', 34, 1)
      sfx.tone({ freq: 700, to: 380, dur: 0.3, type: 'sine', vol: 0.1 })
    }
    say(rac.x + 70, rac.y - 90, '+3', '#ffe14d', 30)
  }

  const throwCan = () => {
    let near: Guard | null = null
    let best = Infinity
    for (const gd of guards) {
      const d = dist(gd.x, gd.y, rac.x, rac.y)
      if (d < best) {
        best = d
        near = gd
      }
    }
    // Land it beyond whoever is nearest, so they turn their back on the raccoon.
    const from = near ?? { x: rac.x + 200, y: rac.y }
    const dx = from.x - rac.x
    const dy = from.y - rac.y
    const d = Math.hypot(dx, dy) || 1
    const to = { x: clamp(from.x + (dx / d) * 230, 250, 1110), y: clamp(from.y + (dy / d) * 230, 170, 750) }
    if (to.x > 870 && to.y > 530) to.y = 500
    pushOut(to, 22)
    const fromX = rac.x
    const fromY = rac.y
    can.state = 'fly'
    sfx.whoosh()
    rac.sq.value = 1.25
    stage.tween(
      0.6,
      (t) => {
        can.x = lerp(fromX, to.x, t)
        can.y = lerp(fromY, to.y, t)
        can.z = 70 * (1 - t) + Math.sin(t * Math.PI) * 190
        can.rot = t * TAU * 3
      },
      ease.linear,
      () => {
        can.state = 'down'
        can.t = 0
        can.z = 0
        can.rot = 1.2
        sfx.crunch()
        sfx.ding(1)
        sfx.tone({ freq: 1900, to: 900, dur: 0.12, type: 'square', vol: 0.08, delay: 0.12 })
        fx.ring(can.x, can.y, '#ffffff', 150, 0.5)
        fx.ring(can.x, can.y, '#ffe14d', 90, 0.4)
        say(can.x, can.y - 50, 'CLANK!', '#e8edf2', 38)
        fx.shake(3)
        for (const gd of guards) {
          if (gd.state === 'gloat' || dist(gd.x, gd.y, can.x, can.y) > 600) continue
          setState(gd, 'decoy')
          gd.susp = 0
          gd.canX = can.x
          gd.canY = can.y
          hm(gd)
        }
      },
    )
  }

  const press = (i: number) => {
    const b = shop[i]!
    const price = priceOf(i)
    b.sp.value = 0.8
    const busy = (i === 1 && can.state === 'fly') || (i === 2 && rac.costume > 0) || rac.punt !== null
    if (price === null || coins < price || busy) {
      b.shake = 0.3
      sfx.nope()
      return
    }
    coins -= price
    bought++
    coinPunch.kick(-4)
    sfx.coin(3)
    fx.burst(b.x, b.y, { count: 12, color: ['#ffe14d', '#fff7c9'], speed: 300, life: 0.5, size: 9, shape: 'star', gravity: 0 })
    if (i === 0) {
      shoes++
      sfx.slideUp()
      rac.sq.value = 1.4
      rac.glee = 0.8
      fx.burst(rac.x, rac.y, { count: 18, color: ['#e8413c', '#ffffff'], speed: 360, life: 0.6, size: 10, shape: 'spark', gravity: 0 })
      say(rac.x, rac.y - 120, 'ZOOM!', '#ff8f8a', 46)
    } else if (i === 1) {
      throwCan()
    } else {
      rac.costume = COSTUME_TIME
      sfx.slideUp()
      sfx.noise({ dur: 0.2, freq: 2600, to: 900, vol: 0.16, q: 0.7 })
      fx.burst(rac.x, rac.y - 40, { count: 22, color: ['#36a24d', '#52bd61', '#2b8a40'], speed: 320, life: 0.7, size: 12, shape: 'square', gravity: 300 })
      say(rac.x, rac.y - 120, 'POOF!', '#b9f5b0', 42)
    }
  }

  // ------------------------------------------------------------ guards
  const canSee = (gd: Guard): boolean => {
    const dx = rac.x - gd.x
    const dy = rac.y - gd.y
    const d = Math.hypot(dx, dy)
    if (d > gd.len + 6) return false
    // Close enough to feel: bumping into a guard from behind still counts.
    if (d < gd.r + NEAR) return true
    if (Math.abs(angDiff(Math.atan2(dy, dx), gd.look)) > gd.half + 0.05) return false
    return sight(gd.x, gd.y, dx, dy) >= 1
  }

  const moveGuard = (gd: Guard, toX: number, toY: number, speed: number, dt: number) => {
    const [rx, ry] = route(gd.x, gd.y, toX, toY)
    const dx = rx - gd.x
    const dy = ry - gd.y
    const d = Math.hypot(dx, dy)
    if (d > 1) {
      const s = Math.min(d, speed * dt)
      gd.x += (dx / d) * s
      gd.y += (dy / d) * s
      gd.heading = Math.atan2(dy, dx)
      gd.step += speed * dt * 0.075
      gd.moving = 1
      if (Math.abs(dx) > Math.abs(dy) * 0.35) gd.flip = dx > 0 ? 1 : -1
    }
    pushOut(gd, gd.r)
    // Nobody follows the raccoon onto its own porch.
    const hd = dist(gd.x, gd.y, SAFE.x, SAFE.y)
    const keep = SAFE.r + gd.r + 26
    if (hd < keep && hd > 0.01) {
      gd.x = SAFE.x + ((gd.x - SAFE.x) / hd) * keep
      gd.y = SAFE.y + ((gd.y - SAFE.y) / hd) * keep
    }
  }

  const alarm = (gd: Guard) => {
    setState(gd, 'alert')
    gd.susp = 1
    honk(gd, true)
    stage.after(0.17, () => honk(gd, true))
    say(gd.x, gd.y - 150, '!', '#ff3b30', 96, 0.55, '#ffffff')
    fx.ring(gd.x, gd.y - 40, '#ff3b30', 130, 0.4)
    fx.shake(5)
    rac.scare = 0.5
    rac.sq.value = 1.35
  }

  const updateGuard = (gd: Guard, dt: number) => {
    gd.t += dt
    gd.moving = damp(gd.moving, 0, 10, dt)
    gd.beak = damp(gd.beak, 0, 7, dt)
    gd.squash.update(dt)
    const visible = racVisible()
    const toRac = Math.atan2(rac.y - gd.y, rac.x - gd.x)
    const dRac = dist(gd.x, gd.y, rac.x, rac.y)
    let wantLow = 0
    const watch = (quick: number) => {
      if (visible && canSee(gd)) gd.susp += dt / quick
      else gd.susp = Math.max(0, gd.susp - dt / 0.9)
      if (gd.susp >= 1) alarm(gd)
    }
    switch (gd.state) {
      case 'patrol': {
        const wp = gd.path[gd.wp]!
        moveGuard(gd, wp.x, wp.y, gd.walk, dt)
        gd.look = turnTo(gd.look, gd.heading, 6, dt)
        if (dist(gd.x, gd.y, wp.x, wp.y) < 6) {
          gd.wp = (gd.wp + 1) % gd.path.length
          setState(gd, 'peek')
        } else {
          gd.nextGlance -= dt
          if (gd.nextGlance <= 0) {
            // The tell: it stops and dips before whipping its head round.
            setState(gd, 'glance')
            gd.squash.value = 0.8
            hm(gd)
          }
        }
        watch(0.3)
        break
      }
      case 'peek': {
        gd.look = turnTo(gd.look, gd.heading + (gd.t < 0.75 ? -1.15 : 1.15), 9, dt)
        if (gd.t > 1.5) setState(gd, 'patrol')
        watch(0.3)
        break
      }
      case 'glance': {
        const back = gd.t > 0.3 && gd.t < 1.2
        gd.look = turnTo(gd.look, gd.heading + (back ? Math.PI * 0.98 : 0), back ? 17 : 11, dt)
        if (gd.t > 1.55) setState(gd, 'patrol')
        watch(0.3)
        break
      }
      case 'alert': {
        gd.look = turnTo(gd.look, toRac, 20, dt)
        if (Math.abs(Math.cos(toRac)) > 0.3) gd.flip = Math.cos(toRac) > 0 ? 1 : -1
        if (gd.t > 0.45) {
          setState(gd, 'chase')
          gd.blind = 0
          gd.honkT = 0.2
        }
        break
      }
      case 'chase': {
        wantLow = 1
        if (!visible) {
          setState(gd, 'search')
          hm(gd)
          if (!rac.punt) escaped()
          break
        }
        gd.blind = sight(gd.x, gd.y, rac.x - gd.x, rac.y - gd.y) < 1 ? gd.blind + dt : 0
        if (gd.blind < 0.2) {
          gd.seenX = rac.x
          gd.seenY = rac.y
        }
        moveGuard(gd, rac.x, rac.y, gd.run, dt)
        gd.look = turnTo(gd.look, toRac, 14, dt)
        gd.honkT -= dt
        if (gd.honkT <= 0) {
          gd.honkT = 0.5
          honk(gd)
        }
        if (dRac < gd.r + 24) {
          caught(gd.kind === 'farmer' ? 'HEY!!' : 'HONK!', gd.x)
          setState(gd, 'gloat')
        } else if (dRac > 540 || gd.blind > 1.3 || gd.t > 10) {
          setState(gd, 'search')
          hm(gd)
        }
        break
      }
      case 'search': {
        const left = dist(gd.x, gd.y, gd.seenX, gd.seenY)
        if (gd.t < 1.6 && left > 46) {
          moveGuard(gd, gd.seenX, gd.seenY, gd.walk * 1.6, dt)
          gd.look = turnTo(gd.look, gd.heading, 8, dt)
        } else {
          gd.look = turnTo(gd.look, gd.heading + Math.sin(gd.t * 3.4) * 1.7, 9, dt)
        }
        watch(0.22)
        if (gd.state === 'search' && gd.t > 3.6) {
          nearestWaypoint(gd)
          setState(gd, 'patrol')
        }
        break
      }
      case 'decoy': {
        const left = dist(gd.x, gd.y, gd.canX, gd.canY)
        if (left > 52) {
          moveGuard(gd, gd.canX, gd.canY, gd.run * 0.8, dt)
          gd.look = turnTo(gd.look, gd.heading, 10, dt)
        } else {
          // Peck at it, puzzled, back turned on the yard.
          gd.look = turnTo(gd.look, Math.atan2(gd.canY - gd.y, gd.canX - gd.x), 10, dt)
          wantLow = Math.abs(Math.sin(gd.t * 7))
          gd.honkT -= dt
          if (gd.honkT <= 0) {
            gd.honkT = 0.45
            sfx.tone({ freq: 1700 * rnd(0.9, 1.1), dur: 0.04, type: 'square', vol: 0.05 })
            can.rot += rnd(-0.5, 0.5)
          }
        }
        if (gd.t > 5.2) {
          nearestWaypoint(gd)
          setState(gd, 'patrol')
        }
        break
      }
      case 'gloat': {
        gd.look = turnTo(gd.look, Math.PI / 2, 10, dt)
        if (gd.t > 0.15 && gd.honkT <= 0) {
          gd.honkT = 1
          honk(gd, true)
          stage.after(0.22, () => honk(gd))
          stage.after(0.4, () => honk(gd))
        }
        gd.honkT -= dt
        if (gd.t > 1.2) {
          gd.honkT = 0
          nearestWaypoint(gd)
          setState(gd, 'patrol')
        }
        break
      }
    }
    gd.low = damp(gd.low, wantLow, 12, dt)
  }

  const updateDog = (dt: number) => {
    dog.t += dt
    dog.bark = damp(dog.bark, 0, 9, dt)
    const visible = racVisible()
    const dRac = dist(dog.x, dog.y, rac.x, rac.y)
    if (dog.state === 'sleep') {
      if (dog.t > dog.sleepFor) {
        dog.state = 'stir'
        dog.t = 0
        sfx.tone({ freq: 300, to: 520, dur: 0.35, type: 'triangle', vol: 0.08 })
      }
    } else if (dog.state === 'stir') {
      if (dog.t > 1.1) {
        dog.state = 'awake'
        dog.t = 0
        woof()
        fx.ring(DOG_REST.x, DOG_REST.y, '#ff8a5c', DOG_SENSE, 0.5)
      }
    } else if (dog.state === 'awake') {
      if (dRac < 400) dog.flip = rac.x > dog.x ? 1 : -1
      if (visible && dist(rac.x, rac.y, DOG_REST.x, DOG_REST.y) < DOG_SENSE) {
        dog.state = 'chase'
        dog.t = 0
        dog.strain = 0
        dog.barkT = 0
        woof(true)
        say(dog.x, dog.y - 120, '!', '#ff3b30', 90, 0.55, '#ffffff')
        fx.shake(5)
        rac.scare = 0.5
        rac.sq.value = 1.35
      } else if (dog.t > 3.6) {
        dog.state = 'sleep'
        dog.t = 0
        dog.sleepFor = rnd(5.5, 7.5)
        sfx.tone({ freq: 480, to: 240, dur: 0.4, type: 'triangle', vol: 0.07 })
      }
    } else if (dog.state === 'chase') {
      const dx = rac.x - dog.x
      const dy = rac.y - dog.y
      const d = Math.hypot(dx, dy) || 1
      const s = Math.min(d, 325 * dt)
      dog.x += (dx / d) * s
      dog.y += (dy / d) * s
      // The leash.
      const ld = dist(dog.x, dog.y, KENNEL.x, KENNEL.y)
      if (ld > DOG_LEASH) {
        dog.x = KENNEL.x + ((dog.x - KENNEL.x) / ld) * DOG_LEASH
        dog.y = KENNEL.y + ((dog.y - KENNEL.y) / ld) * DOG_LEASH
      }
      pushOut(dog, 24)
      dog.phase += dt * 18
      if (Math.abs(dx) > 8) dog.flip = dx > 0 ? 1 : -1
      dog.barkT -= dt
      if (dog.barkT <= 0) {
        dog.barkT = 0.36
        woof()
      }
      const gone = !visible || dist(rac.x, rac.y, KENNEL.x, KENNEL.y) > DOG_LEASH + 30
      dog.strain = gone ? dog.strain + dt : 0
      if (visible && dRac < 50) {
        caught('WOOF!', dog.x)
        dog.state = 'back'
        dog.t = 0
      } else if (dog.strain > 0.9 || dog.t > 6) {
        dog.state = 'back'
        dog.t = 0
        if (!rac.punt) escaped()
      }
    } else {
      const dx = DOG_REST.x - dog.x
      const dy = DOG_REST.y - dog.y
      const d = Math.hypot(dx, dy)
      if (d < 5) {
        dog.state = 'sleep'
        dog.t = 0
        dog.sleepFor = rnd(5.5, 7.5)
        dog.x = DOG_REST.x
        dog.y = DOG_REST.y
      } else {
        const s = Math.min(d, 150 * dt)
        dog.x += (dx / d) * s
        dog.y += (dy / d) * s
        dog.phase += dt * 10
        if (Math.abs(dx) > 8) dog.flip = dx > 0 ? 1 : -1
      }
    }
  }

  // ------------------------------------------------------------ raccoon
  const speedNow = () => {
    let s = BASE_SPEED * (1 + shoes * 0.2)
    if (rac.carry) s *= RARITY[rac.carry.rarity]!.carry
    if (inPond(rac.x, rac.y)) s *= 0.6
    if (rac.costume > 0) s *= 0.85
    return s
  }

  const setTarget = (x: number, y: number) => {
    // A tap on the den itself means "go home": stand on the doormat, in view.
    if (dist(x, y, DEN.x, DEN.y - 22) < 86) {
      rac.tx = HOME.x
      rac.ty = HOME.y
      return
    }
    rac.tx = clamp(x, BOUNDS.x0, BOUNDS.x1)
    rac.ty = clamp(y, BOUNDS.y0, BOUNDS.y1)
  }

  const land = () => {
    rac.punt = null
    rac.x = HOME.x
    rac.y = HOME.y
    rac.vx = 0
    rac.vy = 0
    rac.tx = HOME.x
    rac.ty = HOME.y
    rac.sq.value = 0.5
    rac.dizzy = 0.9
    sfx.thud(1)
    sfx.boing(-2)
    fx.shake(6)
    fx.burst(HOME.x, HOME.y, { count: 14, color: '#e7cd98', speed: 300, life: 0.5, size: 12, angle: -Math.PI / 2, spread: Math.PI, gravity: 300 })
  }

  const updateRaccoon = (dt: number) => {
    rac.sq.update(dt)
    rac.eggWob.update(dt)
    rac.dizzy = Math.max(0, rac.dizzy - dt)
    rac.glee = Math.max(0, rac.glee - dt)
    rac.scare = Math.max(0, rac.scare - dt)
    if (rac.punt) {
      rac.punt.t = Math.min(1, rac.punt.t + dt / 0.8)
      const t = ease.inOutQuad(rac.punt.t)
      rac.x = lerp(rac.punt.fromX, HOME.x, t)
      rac.y = lerp(rac.punt.fromY, HOME.y, t)
      if (rac.punt.t >= 1) land()
      return
    }
    if (rac.costume > 0) {
      rac.costume -= dt
      if (rac.costume <= 0) {
        fx.burst(rac.x, rac.y - 40, { count: 14, color: ['#36a24d', '#52bd61'], speed: 260, life: 0.6, size: 11, shape: 'square', gravity: 300 })
        sfx.pop(-2)
      }
    }
    if (activeId === null && rac.dizzy < 0.4) {
      // A finger still resting on the yard after a punt takes charge again.
      for (const id of stage.pointers.keys()) {
        if (!uiIds.has(id)) {
          activeId = id
          break
        }
      }
    }
    const held = activeId !== null ? stage.pointers.get(activeId) : undefined
    if (held) setTarget(held.x, held.y)

    const dx = rac.tx - rac.x
    const dy = rac.ty - rac.y
    const d = Math.hypot(dx, dy)
    const want = d > 9 ? speedNow() * clamp(d / 46, 0.3, 1) : 0
    const ux = d > 0 ? dx / d : 0
    const uy = d > 0 ? dy / d : 0
    const beforeVx = rac.vx
    rac.vx = damp(rac.vx, ux * want, 13, dt)
    rac.vy = damp(rac.vy, uy * want, 13, dt)
    // The egg on its head lags behind every start, stop and turn.
    rac.eggWob.kick((beforeVx - rac.vx) * 0.022)
    rac.x += rac.vx * dt
    rac.y += rac.vy * dt
    pushOut(rac, 20)
    const speed = Math.hypot(rac.vx, rac.vy)
    rac.moving = damp(rac.moving, speed > 30 ? 1 : 0, 12, dt)
    if (Math.abs(rac.vx) > 25) rac.flip = rac.vx > 0 ? 1 : -1
    rac.phase += speed * dt * 0.075

    // Footsteps: tiptoe notes, paw prints, splashes in the pond.
    rac.stepAcc += speed * dt
    if (rac.stepAcc > 46) {
      rac.stepAcc = 0
      stepSide = 1 - stepSide
      if (inPond(rac.x, rac.y)) {
        sfx.noise({ dur: 0.1, freq: 1000, to: 300, vol: 0.13, filter: 'lowpass' })
        fx.ring(rac.x, rac.y, '#e6f8ff', 38, 0.5)
        fx.burst(rac.x, rac.y - 6, { count: 4, color: '#d5f3ff', speed: 190, life: 0.4, size: 7, angle: -Math.PI / 2, spread: 1.6, gravity: 700 })
      } else {
        sfx.note((rac.carry ? -10 : -5) + SNEAK[stepAt++ % SNEAK.length]!, 0.06, 'triangle', 0.06)
        if (rac.bush < 0) {
          prints.push({ x: rac.x - uy * (stepSide ? 7 : -7), y: rac.y + ux * (stepSide ? 7 : -7), life: 3.2, rot: Math.atan2(uy, ux) })
          if (prints.length > 40) prints.shift()
        }
        if (stepSide === 0 && speed > 150) fx.burst(rac.x - ux * 14, rac.y - 4, { count: 1, color: 'rgba(255,250,230,0.7)', speed: 50, life: 0.35, size: 11, gravity: -50 })
        if (shoes > 0 && speed > 250) fx.burst(rac.x - ux * 16, rac.y - 8, { count: 2, color: '#ffffff', speed: 60, life: 0.3, size: 9, gravity: -60 })
      }
    }
    // Heavy eggs make it sweat.
    if (rac.carry && rac.carry.rarity >= 2 && speed > 40) {
      sweatT -= dt
      if (sweatT <= 0) {
        sweatT = 0.32
        fx.burst(rac.x - rac.flip * 20, rac.y - 78, { count: 1, color: '#9fdcff', speed: 150, life: 0.45, size: 8, angle: -Math.PI / 2 - rac.flip * 0.7, spread: 0.5, gravity: 600 })
      }
    }

    // Bushes hide it.
    let inBush = -1
    if (rac.costume <= 0) {
      for (let i = 0; i < bushes.length; i++) {
        const b = bushes[i]!
        if (dist(rac.x, rac.y, b.x, b.y) < BUSH_R - 6) inBush = i
      }
    }
    if (inBush !== rac.bush) {
      rustle(inBush >= 0 ? inBush : rac.bush)
      rac.bush = inBush
    }

    // Pinch an egg by running into it.
    if (!rac.carry && rac.dizzy <= 0) {
      for (const n of nests) {
        const egg = n.egg
        if (egg && egg.state === 'nest' && egg.grow > 0.9 && dist(rac.x, rac.y, n.x, n.y + 4) < 50) {
          grab(egg)
          break
        }
      }
    }
    if (rac.carry) {
      rac.carry.x = rac.x
      rac.carry.y = rac.y
      if (dist(rac.x, rac.y, SAFE.x, SAFE.y) < SAFE.r - 14) deliver()
    }
    // Pets hop out of the way.
    for (const pet of pets) {
      if (pet.grow > 0.9 && Math.abs(pet.sq.vel) < 0.2 && dist(rac.x, rac.y, pet.x, pet.y) < 36) {
        pet.sq.kick(4)
        sfx.note(11 + pet.rarity * 2, 0.05, 'sine', 0.07)
      }
    }
  }

  // ------------------------------------------------------------ drawing
  const items: { y: number; draw: () => void }[] = []

  const drawCone = (g: CanvasRenderingContext2D, gd: Guard) => {
    if (gd.state === 'gloat') return
    const busy = gd.state === 'decoy'
    const hot = gd.state === 'chase' || gd.state === 'alert'
    const len = gd.len * gd.pop
    g.beginPath()
    g.moveTo(gd.x, gd.y)
    const rays = 14
    for (let i = 0; i <= rays; i++) {
      const a = gd.look - gd.half + (2 * gd.half * i) / rays
      const dx = Math.cos(a) * len
      const dy = Math.sin(a) * len
      const t = sight(gd.x, gd.y, dx, dy)
      g.lineTo(gd.x + dx * t, gd.y + dy * t)
    }
    g.closePath()
    g.moveTo(gd.x + gd.r + NEAR, gd.y)
    g.arc(gd.x, gd.y, (gd.r + NEAR) * gd.pop, 0, TAU)
    const warm = clamp(gd.susp, 0, 1)
    const rgb = hot ? '255,60,50' : gd.kind === 'farmer' ? `255,${Math.round(190 - warm * 80)},70` : `255,${Math.round(238 - warm * 110)},${Math.round(120 - warm * 60)}`
    const grad = g.createRadialGradient(gd.x, gd.y, 8, gd.x, gd.y, len)
    const a0 = busy ? 0.18 : hot ? 0.62 : 0.55 + warm * 0.15
    grad.addColorStop(0, `rgba(${rgb},${a0})`)
    grad.addColorStop(1, `rgba(${rgb},${busy ? 0.04 : 0.16})`)
    g.fillStyle = grad
    g.fill()
    g.strokeStyle = `rgba(${rgb},${busy ? 0.2 : 0.75})`
    g.lineWidth = 3
    g.stroke()
  }

  const drawGuard = (g: CanvasRenderingContext2D, gd: Guard) => {
    const small = gd.kind === 'gosling'
    shadow(g, gd.x, gd.y + 2, small ? 30 : 40, gd.pop)
    const hot = gd.state === 'chase' || gd.state === 'alert'
    if (gd.kind === 'farmer') {
      const bob = Math.abs(Math.sin(gd.step)) * 7 * gd.moving
      const [sx, sy] = volume(gd.squash.value)
      sprite(g, '🧑‍🌾', gd.x, gd.y - 54 * gd.pop - bob, 112 * gd.pop, Math.sin(gd.step) * 0.07 * gd.moving, sx, sy)
      sprite(g, '🔦', gd.x + Math.cos(gd.look) * 34, gd.y - 38 + Math.sin(gd.look) * 12 - bob, 38 * gd.pop, gd.look + Math.PI / 4)
    } else {
      drawGoose(g, gd.x, gd.y, {
        flip: gd.flip,
        look: gd.look,
        step: gd.step,
        moving: gd.moving,
        low: gd.low,
        beak: gd.beak,
        angry: hot || gd.state === 'search' || gd.susp > 0.3,
        sy: gd.squash.value * (gd.state === 'gloat' ? 1 + Math.sin(gd.t * 22) * 0.08 : 1),
        flap: gd.state === 'chase' || gd.state === 'gloat' ? stage.time * 24 : 0,
        grey: small,
        scale: (small ? 0.78 : 1.12) * gd.pop,
        blink: blinkAt(stage.time, small ? 5 : 2),
      })
    }
    const top = gd.y - (small ? 130 : 168)
    if (hot) label(g, '!', gd.x, top - Math.abs(Math.sin(stage.time * 12)) * 10, 66, '#ff3b30', '#ffffff')
    else if (gd.state === 'search' || gd.state === 'decoy') label(g, '?', gd.x, top - Math.sin(stage.time * 6) * 5, 54, '#ffe14d')
    else if (gd.susp > 0.12) label(g, '?', gd.x, top, 26 + gd.susp * 30, '#ffe14d')
  }

  const drawRac = (g: CanvasRenderingContext2D) => {
    const z = rac.punt ? Math.sin(rac.punt.t * Math.PI) * 250 : 0
    shadow(g, rac.x, rac.y + 2, 32, 1 - z / 420)
    if (rac.costume > 0 && !rac.punt) {
      // A bush with feet. It flickers when the disguise is about to drop.
      if (rac.costume < 1.5 && Math.floor(stage.time * 9) % 2 === 0) g.globalAlpha = 0.55
      const swing = Math.sin(rac.phase) * 8 * rac.moving
      const foot = shoes > 0 ? '#e8413c' : '#33363e'
      ellipse(g, rac.x - 13 + swing, rac.y - 3, 10, 6.5, foot)
      ellipse(g, rac.x + 13 - swing, rac.y - 3, 10, 6.5, foot)
      const hop = Math.abs(Math.sin(rac.phase)) * 5 * rac.moving
      drawBush(g, rac.x, rac.y - 22 - hop, 40, rac.sq.value, Math.sin(rac.phase) * 0.06 * rac.moving)
      ellipse(g, rac.x, rac.y - 52 - hop, 27, 11, 'rgba(15,40,20,0.6)')
      eyes(g, rac.x, rac.y - 52 - hop, 7, clamp(rac.vx / 200, -1, 1), clamp(rac.vy / 200, -1, 1), blinkAt(stage.time, 1), 1.7)
      g.globalAlpha = 1
      if (rac.carry) drawEgg(g, rac.x + 4, rac.y - 96 - hop, RARITY[rac.carry.rarity]!.size * 0.85, rac.carry.rarity, stage.time, rac.eggWob.value * 0.35)
      return
    }
    // Eyes go to whatever is scariest and nearest, else to where it is headed.
    let lookX = clamp((rac.tx - rac.x) / 160, -1, 1)
    let lookY = clamp((rac.ty - rac.y) / 160, -1, 1)
    let nearest = 340
    for (const gd of guards) {
      const d = dist(gd.x, gd.y, rac.x, rac.y)
      if (d < nearest) {
        nearest = d
        lookX = clamp((gd.x - rac.x) / 120, -1, 1)
        lookY = clamp((gd.y - rac.y) / 120, -1, 1)
      }
    }
    const mood: RaccoonLook['mood'] = rac.punt || rac.dizzy > 0 ? 'dizzy' : rac.glee > 0 ? 'glee' : rac.scare > 0 || chased() ? 'wow' : rac.carry && rac.carry.rarity >= 2 ? 'strain' : 'happy'
    const look: RaccoonLook = {
      flip: rac.flip,
      phase: rac.phase,
      moving: rac.moving,
      sy: rac.sq.value * (rac.carry ? 1 - rac.carry.rarity * 0.035 : 1) * (1 + Math.sin(stage.time * 3.2) * 0.025 * (1 - rac.moving)),
      time: stage.time,
      lookX,
      lookY,
      blink: blinkAt(stage.time, 0),
      mood,
      shoes,
      carrying: rac.carry !== null,
    }
    if (rac.punt) {
      g.save()
      g.translate(rac.x, rac.y - z - 44)
      g.rotate(rac.punt.t * TAU * 2.5 * rac.flip)
      drawRaccoon(g, 0, 44, look)
      g.restore()
    } else {
      drawRaccoon(g, rac.x, rac.y, look)
    }
    const egg = rac.carry
    if (egg) {
      const size = RARITY[egg.rarity]!.size
      const bob = Math.abs(Math.sin(rac.phase)) * 6 * rac.moving
      drawEgg(g, rac.x + rac.flip * 6, rac.y - 92 * rac.sq.value - size * 0.44 - bob, size, egg.rarity, stage.time, rac.eggWob.value * 0.35)
    }
    if (rac.dizzy > 0 && !rac.punt) {
      for (let i = 0; i < 3; i++) {
        const a = stage.time * 7 + (i * TAU) / 3
        star(g, rac.x + Math.cos(a) * 34, rac.y - 108 + Math.sin(a) * 9, 9, '#ffe14d', a)
      }
    }
  }

  const drawShop = (g: CanvasRenderingContext2D) => {
    shop.forEach((b, i) => {
      const price = priceOf(i)
      const afford = price !== null && coins >= price
      const s = b.sp.value * (afford ? 1 + Math.sin(stage.time * 5 + i) * 0.045 : 1)
      const x = b.x + (b.shake > 0 ? Math.sin(b.shake * 70) * 6 : 0)
      g.globalAlpha = afford || price === null ? 1 : 0.7
      if (afford) circle(g, x, b.y, 45 * s, `rgba(255,225,80,${0.45 + Math.sin(stage.time * 5 + i) * 0.2})`)
      circle(g, x, b.y, 37 * s, afford ? '#fffbe8' : '#efe6d2', afford ? '#f2a81d' : '#9b8f7a', 5)
      if (i === 0) sprite(g, '👟', x, b.y - 1, 42 * s)
      else if (i === 1) sprite(g, '🥫', x, b.y - 1, 42 * s)
      else {
        drawBush(g, x, b.y + 5, 19 * s, 1, 0)
        eyes(g, x, b.y - 6, 5, Math.sin(stage.time * 1.3), 0, blinkAt(stage.time, 3), 1.6)
      }
      if (i === 2 && rac.costume > 0) {
        g.beginPath()
        g.arc(x, b.y, 41, -Math.PI / 2, -Math.PI / 2 + (rac.costume / COSTUME_TIME) * TAU)
        g.strokeStyle = '#52bd61'
        g.lineWidth = 7
        g.stroke()
      }
      rrect(g, x - 33, b.y + 27, 66, 25, 12, '#3a2d25', '#fff3d0', 2)
      if (price === null) {
        label(g, 'MAX', x, b.y + 40, 17, '#ffe14d', null)
      } else {
        drawCoin(g, x - 17, b.y + 39.5, 8.5)
        label(g, String(price), x + 9, b.y + 40.5, 19, '#ffffff', null)
      }
      if (i === 0) for (let k = 0; k < 3; k++) circle(g, x - 12 + k * 12, b.y - 30, 4, k < shoes ? '#e8413c' : 'rgba(60,40,30,0.35)', '#fff', 1.5)
      g.globalAlpha = 1
    })
  }

  // ------------------------------------------------------------ the game
  return {
    update(dt) {
      if (stage.pointers.size > 0) lastTouchAt = stage.time
      updateRaccoon(dt)
      for (const gd of guards) updateGuard(gd, dt)
      updateDog(dt)

      // Nests lay again.
      nests.forEach((n, i) => {
        if (!n.egg && stage.time >= n.respawnAt) spawnEgg(i, false)
      })
      for (const egg of eggs) egg.wob.update(dt)
      for (const pet of pets) pet.sq.update(dt)
      for (const b of bushes) {
        b.sq.update(dt)
        b.lean.update(dt)
      }
      for (const b of shop) {
        b.sp.update(dt)
        b.sp.target = 1
        b.shake = Math.max(0, b.shake - dt)
      }
      coinPunch.update(dt)
      for (const sp of albumPop) sp.update(dt)
      for (let i = prints.length - 1; i >= 0; i--) {
        prints[i]!.life -= dt
        if (prints[i]!.life <= 0) prints.splice(i, 1)
      }
      if (can.state === 'down') {
        can.t += dt
        if (can.t > 7) can.state = 'none'
      }

      // Payday: every pet chips in.
      payT -= dt
      if (payT <= 0) {
        payT = 3
        if (income > 0) {
          addCoins(income)
          sfx.note(9, 0.2, 'sine', 0.1)
          sfx.note(12, 0.25, 'sine', 0.07)
          say(150, 96, `+${income}`, '#ffe14d', 30, 0.9)
          pets.forEach((pet, i) =>
            stage.after(i * 0.04, () => {
              pet.sq.kick(4.5)
              fx.burst(pet.x, pet.y - 34, { count: 1, color: '#ffd84a', speed: 190, life: 0.5, size: 10, angle: -Math.PI / 2, spread: 0.5, gravity: 500 })
            }),
          )
        }
      }

      // New trouble arrives as the den fills up.
      if (!farmerOut && (deliveries >= 4 || stage.time > 80)) releaseFarmer()
      if (!goslingOut && (deliveries >= 8 || stage.time > 160)) {
        goslingOut = true
        const gosling = makeGuard(
          'gosling',
          [
            { x: 330, y: 440 },
            { x: 560, y: 330 },
            { x: 700, y: 520 },
            { x: 480, y: 640 },
          ],
          610,
          428,
          0,
        )
        gosling.pop = 0
        stage.tween(0.6, (t) => (gosling.pop = t), ease.outBack)
        guards.push(gosling)
        honk(gosling, true)
        fx.ring(610, 428, '#ffffff', 160, 0.6)
        fx.burst(610, 420, { count: 16, color: '#d5f3ff', speed: 340, life: 0.6, size: 10, angle: -Math.PI / 2, spread: 2, gravity: 700 })
        say(610, 360, 'HONK?', '#e6edf5', 44, 1.2)
      }

      // Tension: a heartbeat that quickens as eyes get close.
      let want = 0
      if (!atHome() && !rac.punt) {
        for (const gd of guards) {
          if (gd.state === 'chase' || gd.state === 'alert') want = 1
          else if (gd.state !== 'decoy' && gd.state !== 'gloat') {
            const d = dist(gd.x, gd.y, rac.x, rac.y)
            want = Math.max(want, 0.85 * (1 - clamp((d - gd.len * 0.55) / (gd.len * 0.75), 0, 1)))
          }
        }
        if (dog.state === 'chase') want = 1
        else if (dog.state === 'awake' || dog.state === 'stir') want = Math.max(want, 0.8 * (1 - clamp((dist(rac.x, rac.y, DOG_REST.x, DOG_REST.y) - DOG_SENSE * 0.8) / 120, 0, 1)))
      }
      danger = damp(danger, want, 5, dt)
      beatT -= dt
      if (danger > 0.3 && beatT <= 0) {
        beatT = lerp(0.95, 0.42, danger)
        heartbeat(danger)
      }
    },

    draw(g) {
      const time = stage.time
      g.drawImage(bg, 0, 0)
      if (farmerOut) rrect(g, 1046, 88, 58, 70, 3, '#2a1712')

      // The porch glows while there is something to bring home.
      if (rac.carry) {
        const k = 0.5 + Math.sin(time * 6) * 0.5
        g.beginPath()
        g.ellipse(SAFE.x - 6, SAFE.y + 4, SAFE.r + 6 + k * 8, (SAFE.r + 6 + k * 8) * 0.84, 0, 0, TAU)
        g.strokeStyle = `rgba(255,225,80,${0.55 + k * 0.4})`
        g.lineWidth = 7
        g.stroke()
      }

      // The dog's patch: dashed while it sleeps, red while it is up.
      const up = dog.state === 'awake' || dog.state === 'chase'
      g.beginPath()
      g.arc(DOG_REST.x, DOG_REST.y, DOG_SENSE, 0, TAU)
      if (up) {
        g.fillStyle = `rgba(255,70,50,${0.17 + Math.sin(time * 8) * 0.05})`
        g.fill()
        g.strokeStyle = 'rgba(255,70,50,0.8)'
        g.lineWidth = 4
        g.stroke()
      } else {
        g.setLineDash([14, 14])
        g.lineDashOffset = -time * 12
        g.strokeStyle = dog.state === 'stir' ? `rgba(255,150,60,${0.6 + Math.sin(time * 24) * 0.3})` : 'rgba(255,255,255,0.4)'
        g.lineWidth = 4
        g.stroke()
        g.setLineDash([])
      }

      for (const p of prints) {
        g.globalAlpha = Math.min(1, p.life) * 0.28
        ellipse(g, p.x, p.y, 6, 4.2, '#3a2a1a', p.rot)
      }
      g.globalAlpha = 1

      // Where the raccoon is headed.
      if (!rac.punt && dist(rac.x, rac.y, rac.tx, rac.ty) > 30) {
        const r = 15 + Math.sin(time * 9) * 3
        g.strokeStyle = 'rgba(255,255,255,0.85)'
        g.lineWidth = 5
        g.beginPath()
        g.ellipse(rac.tx, rac.ty, r, r * 0.6, 0, 0, TAU)
        g.stroke()
      }

      for (const gd of guards) drawCone(g, gd)

      // Everything that stands up, back to front.
      items.length = 0
      items.push({ y: DEN.y + 4, draw: () => g.drawImage(props, 8, 330, 182, 170, 8, 330, 182, 170) })
      items.push({ y: KENNEL.y + 42, draw: () => g.drawImage(props, 865, 220, 140, 130, 865, 220, 140, 130) })
      items.push({ y: 606, draw: () => g.drawImage(props, 890, 525, 210, 295, 890, 525, 210, 295) })
      for (const egg of eggs) {
        if (egg.state === 'carried') continue
        items.push({
          y: egg.y + 2,
          draw: () => {
            const size = RARITY[egg.rarity]!.size * egg.grow
            const idle = egg.state === 'nest' ? Math.sin(time * 2.2 + egg.seed) * 0.06 : 0
            if (egg.z > 8) shadow(g, egg.x, egg.y + 6, 22, 1 - egg.z / 400)
            drawEgg(g, egg.x, egg.y - egg.z - size * 0.42, size, egg.rarity, time + egg.seed, egg.wob.value + idle)
          },
        })
      }
      bushes.forEach((b, i) => {
        items.push({
          y: b.y + BUSH_R * 0.5,
          draw: () => {
            drawBush(g, b.x, b.y, BUSH_R, b.sq.value, b.lean.value * 0.12 + (rac.bush === i ? Math.sin(time * 34) * danger * 0.035 : 0))
            if (rac.bush === i) {
              ellipse(g, b.x, b.y - 36, 28, 11, 'rgba(15,40,20,0.6)')
              let lx = 0
              let ly = 0
              let nearest = 500
              for (const gd of guards) {
                const d = dist(gd.x, gd.y, b.x, b.y)
                if (d < nearest) {
                  nearest = d
                  lx = clamp((gd.x - b.x) / 120, -1, 1)
                  ly = clamp((gd.y - b.y) / 120, -1, 1)
                }
              }
              eyes(g, b.x, b.y - 36, 7.5, lx, ly, blinkAt(time, 1), 1.7)
              if (rac.carry) drawEgg(g, b.x + 4, b.y - 74, RARITY[rac.carry.rarity]!.size * 0.8, rac.carry.rarity, time, Math.sin(time * 9) * 0.08)
            }
          },
        })
      })
      if (rac.bush < 0 || rac.punt) items.push({ y: rac.punt ? H : rac.y, draw: () => drawRac(g) })
      for (const gd of guards) items.push({ y: gd.y, draw: () => drawGuard(g, gd) })
      items.push({
        y: dog.y,
        draw: () => {
          // Leash first, so it runs from the kennel door to the collar.
          g.beginPath()
          g.moveTo(KENNEL.x, KENNEL.y + 36)
          g.quadraticCurveTo((KENNEL.x + dog.x) / 2, Math.max(KENNEL.y + 36, dog.y) + 14, dog.x + dog.flip * 8, dog.y - 38)
          g.strokeStyle = 'rgba(70,70,80,0.7)'
          g.lineWidth = 3
          if (dog.state === 'chase' || dog.state === 'back') g.stroke()
          shadow(g, dog.x, dog.y + 2, 42)
          const pose = dog.state === 'sleep' ? 'sleep' : dog.state === 'stir' ? 'stir' : dog.state === 'awake' ? 'sit' : 'run'
          drawDog(g, dog.x, dog.y, { flip: dog.flip, pose, phase: dog.phase, lookX: clamp((rac.x - dog.x) / 150, -1, 1), blink: blinkAt(time, 4), bark: dog.bark, time })
          if (dog.state === 'sleep') {
            for (let k = 0; k < 3; k++) {
              const ph = (time * 0.45 + k / 3) % 1
              g.globalAlpha = Math.sin(ph * Math.PI)
              label(g, 'z', dog.x - 34 - ph * 26, dog.y - 46 - ph * 56, 18 + ph * 20, '#ffffff', 'rgba(40,60,110,0.8)')
            }
            g.globalAlpha = 1
          } else if (dog.state === 'chase') {
            label(g, '!', dog.x, dog.y - 120 - Math.abs(Math.sin(time * 12)) * 10, 62, '#ff3b30', '#ffffff')
          }
        },
      })
      for (const pet of pets) {
        items.push({
          y: pet.y,
          draw: () => {
            const big = 56 + pet.rarity * 8
            const [sx, sy] = volume(pet.sq.value + Math.sin(time * 3 + pet.seed) * 0.04)
            const hop = Math.max(0, pet.sq.value - 1) * 46
            shadow(g, pet.x, pet.y + 4, 22 * pet.grow, 1 - hop / 120)
            if (pet.rarity >= 2) circle(g, pet.x, pet.y - big * 0.4, big * 0.62, pet.rarity === 3 ? `rgba(200,140,255,${0.3 + Math.sin(time * 4) * 0.12})` : 'rgba(255,230,120,0.32)')
            sprite(g, pet.emoji, pet.x, pet.y - big * 0.42 * sy - hop, big * pet.grow, 0, sx, sy)
          },
        })
      }
      if (can.state !== 'none') {
        items.push({
          y: can.y,
          draw: () => {
            shadow(g, can.x, can.y + 4, 16, 1 - can.z / 400)
            g.globalAlpha = can.state === 'down' ? clamp(7 - can.t, 0, 1) : 1
            drawCan(g, can.x, can.y - can.z - 12, can.rot)
            g.globalAlpha = 1
          },
        })
      }
      items.sort((a, b) => a.y - b.y)
      for (const item of items) item.draw()

      // Embers drift up from the dragon egg's hollow.
      const lair = nests[5]!
      if (lair.egg && lair.egg.state === 'nest') {
        for (let k = 0; k < 5; k++) {
          const ph = (time * 0.4 + k * 0.2) % 1
          circle(g, lair.x + Math.sin(k * 9.1 + time * 1.5) * 38, lair.y - 20 - ph * 100, 4 * (1 - ph), `rgba(190,130,255,${1 - ph})`)
        }
      }

      // Bring it home: an arrow bobs over the den while the raccoon carries.
      if (rac.carry) {
        const ay = DEN.y - 128 + Math.sin(time * 7) * 9
        g.beginPath()
        g.moveTo(DEN.x - 24, ay - 30)
        g.lineTo(DEN.x + 24, ay - 30)
        g.lineTo(DEN.x + 24, ay - 6)
        g.lineTo(DEN.x + 44, ay - 6)
        g.lineTo(DEN.x, ay + 32)
        g.lineTo(DEN.x - 44, ay - 6)
        g.lineTo(DEN.x - 24, ay - 6)
        g.closePath()
        g.fillStyle = '#ffe14d'
        g.fill()
        g.strokeStyle = '#7a4a08'
        g.lineWidth = 5
        g.lineJoin = 'round'
        g.stroke()
      }

      if (danger > 0.02) {
        g.globalAlpha = danger * (0.22 + 0.2 * Math.abs(Math.sin(time * (4 + danger * 5))))
        g.drawImage(vignette, 0, 0, W, H)
        g.globalAlpha = 1
      }

      // Coins, then the shop.
      const punch = coinPunch.value
      rrect(g, 22, 22, 150 + String(coins).length * 14, 56, 28, 'rgba(58,45,37,0.82)', '#fff3d0', 3)
      drawCoin(g, 52, 50, 21 * punch)
      label(g, String(coins), 84, 52, 38 * punch, '#ffe14d', null, 'left')
      if (streak >= 2) label(g, `x${Math.min(streak, 5)}`, 196 + String(coins).length * 14, 50, 30, '#a8f5a0')
      rrect(g, 262, 24, 276, 52, 26, 'rgba(58,45,37,0.5)')
      for (let i = 0; i < 4; i++) {
        const ex = 300 + i * 66
        const have = owned[i] ?? 0
        const pop = albumPop[i]!.value
        g.globalAlpha = have > 0 ? 1 : 0.32
        drawEgg(g, ex, 49, (i === 3 ? 40 : 36) * pop, i, time, 0)
        g.globalAlpha = 1
        if (have > 1) label(g, String(have), ex + 17, 62, 19, '#ffffff')
      }
      drawShop(g)

      // What to do next, shown not told.
      const idle = time - lastTouchAt
      if (!rac.punt) {
        const shoePrice = priceOf(0)
        if (idle > (touches === 0 ? 2.2 : 5)) {
          if (rac.carry) hint(g, HOME.x - 30, HOME.y - 10, time, 56)
          else {
            let best: Nest | null = null
            let bestD = Infinity
            for (const n of nests) {
              if (!n.egg || n.egg.state !== 'nest') continue
              const d = dist(rac.x, rac.y, n.x, n.y) + n.tier * 260 + (deliveries === 0 && n.y > H / 2 ? 120 : 0)
              if (d < bestD) {
                bestD = d
                best = n
              }
            }
            if (best) hint(g, best.x, best.y - 14, time, 56)
          }
        } else if (bought === 0 && shoePrice !== null && coins >= shoePrice && !rac.carry && danger < 0.3) {
          hint(g, shop[0]!.x, shop[0]!.y, time, 48)
        }
      }
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      touches++
      for (let i = 0; i < shop.length; i++) {
        if (dist(p.x, p.y, shop[i]!.x, shop[i]!.y + 8) < 54) {
          uiIds.add(p.id)
          press(i)
          return
        }
      }
      fx.ring(p.x, p.y, '#ffffff', 46, 0.3)
      sfx.pop(rndInt(-2, 1))
      if (rac.punt) return
      activeId = p.id
      const wasStill = Math.hypot(rac.vx, rac.vy) < 40
      setTarget(p.x, p.y)
      if (wasStill && dist(rac.x, rac.y, rac.tx, rac.ty) > 30) {
        // Anticipation, then off: a crouch and a puff of dust.
        rac.sq.value = 0.72
        fx.burst(rac.x, rac.y, { count: 6, color: '#efe2c0', speed: 170, life: 0.35, size: 10, angle: Math.atan2(rac.y - p.y, rac.x - p.x), spread: 1.2, gravity: -40 })
        sfx.whoosh()
      }
      // Everything in the yard answers a poke.
      for (const gd of guards) {
        if (dist(p.x, p.y, gd.x, gd.y - 50) < 64 && (gd.state === 'patrol' || gd.state === 'peek' || gd.state === 'glance')) {
          honk(gd)
          gd.squash.value = 0.75
          fx.burst(gd.x, gd.y - 50, { count: 6, color: '#ffffff', speed: 220, life: 0.6, size: 11, shape: 'square', gravity: 300 })
        }
      }
      bushes.forEach((b, i) => {
        if (dist(p.x, p.y, b.x, b.y - 14) < 52) rustle(i)
      })
      for (const pet of pets) {
        if (dist(p.x, p.y, pet.x, pet.y - 24) < 40) {
          pet.sq.kick(6)
          sfx.note(10 + pet.rarity * 2, 0.09, 'sine', 0.14)
          fx.burst(pet.x, pet.y - 50, { count: 3, color: '#ff7aa8', speed: 120, life: 0.7, size: 13, shape: 'heart', gravity: -140 })
        }
      }
      for (const n of nests) {
        if (n.egg && n.egg.state === 'nest' && dist(p.x, p.y, n.x, n.y - 16) < 56) {
          n.egg.wob.kick(6)
          sfx.ding(n.egg.rarity * 2)
          fx.burst(n.x, n.y - 30, { count: 5, color: '#fff7c9', speed: 160, life: 0.45, size: 8, shape: 'star', gravity: 0 })
        }
      }
      if (dist(p.x, p.y, dog.x, dog.y - 20) < 60 && dog.state === 'sleep') {
        sfx.tone({ freq: 150, to: 95, dur: 0.3, type: 'sawtooth', vol: 0.07 })
        say(dog.x - 40, dog.y - 70, 'zzz', '#ffffff', 30)
      }
      if (dist(p.x, p.y, DEN.x, DEN.y - 20) < 70) {
        sfx.thud(0.5)
        fx.burst(DEN.x + 40, DEN.y - 88, { count: 5, color: ['#4fb35a', '#3a9a48'], speed: 160, life: 0.6, size: 10, shape: 'square', gravity: 300 })
      }
    },

    move(p: Pointer) {
      if (p.id === activeId && !rac.punt) setTarget(p.x, p.y)
    },

    up(p: Pointer) {
      uiIds.delete(p.id)
      if (p.id === activeId) activeId = null
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'egg-heist',
    name: 'Egg Heist',
    emoji: '🦆',
    ages: [6, 11],
    pitch: 'Sneak a raccoon past a grumpy goose, pinch eggs and carry them home to hatch into coin-earning pets.',
    howTo: 'Drag or tap: the raccoon runs to your finger. Touch an egg to grab it, carry it to the den. Stay out of the yellow cones; bushes hide you. Spend coins on the buttons up top.',
    basedOn: 'Steal a Brainrot (25.8M concurrent on Roblox), Untitled Goose Game',
    whyFun: 'Transgression without consequences: grab a rare thing, carry it home past a guard, and it earns. Rarity to hope for, numbers going up, and a funny punt home instead of a fail screen.',
  },
  create,
}
