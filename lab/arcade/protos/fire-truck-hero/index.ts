// Fire Truck Hero: hold anywhere and the truck's hose arcs a thick jet of
// water to the finger. Fires hiss out, and everything else on the street
// answers the water too.

import { blinkAt, circle, ellipse, hint, line, shadow, sprite } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { clamp, damp, dist, ease, lerp, pick, rnd, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { BASE, HOUSES, ROAD_TOP, ROOF_H, TRUCK_Y, drawCloud, drawHouse, drawRainbow, drawSun, drawTree, drawTruck, flame, makeBackdrop, roofY } from './art.ts'

const G = 2600
const UP = -Math.PI / 2
const WATER = ['#bfe9ff', '#ffffff', '#6cc5ff', '#8fd3ff']
const TREE_X = 345
const SUN = { x: 1092, y: 92 }

interface Drop {
  x0: number
  y0: number
  vx: number
  vy: number
  t: number
  T: number
  x: number
  y: number
  seq: number
  loose: boolean
  falling: boolean
  ground: number
}

interface Spot {
  x: number
  y: number
  house: number
  base: number
  busy: boolean
  roof: boolean
}

type FireKind = 'normal' | 'chain' | 'hopper'

interface Fire {
  x: number
  y: number
  base: number
  size: number
  hp: number
  pop: number
  seed: number
  spot: number
  house: number
  kind: FireKind
  tough: number
  wetAt: number
  squish: Spring
  // Hopper only.
  perch: number
  hopT: number
  hop: number
  fromX: number
  fromY: number
  toX: number
  toY: number
}

interface Flower {
  x: number
  water: number
  stage: number
  char: string
  pop: Spring
  butterfly: boolean
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const backdrop = makeBackdrop()

  // ---------- the street ----------
  const spots: Spot[] = []
  HOUSES.forEach((h, i) => {
    const dx = -h.w * 0.37
    spots.push({ x: h.x + dx, y: roofY(h, dx) + 8, house: i, base: 34, busy: false, roof: true })
    spots.push({ x: h.x + h.w * 0.22 + 17, y: BASE - h.h - 96, house: i, base: 32, busy: false, roof: true })
  })
  spots.push({ x: TREE_X, y: 290, house: -1, base: 34, busy: false, roof: false })
  const BBQ_SPOT = spots.length
  spots.push({ x: 672, y: 480, house: -1, base: 32, busy: false, roof: false })
  spots.push({ x: 790, y: 447, house: -1, base: 21, busy: false, roof: false })
  const perches = HOUSES.map((h) => ({ x: h.x, y: BASE - h.h - ROOF_H - 2 }))

  const houses = HOUSES.map(() => ({ relief: 0, bounce: spring(1, 240, 9), sparkleAt: -9 }))
  const fires: Fire[] = []
  const drops: Drop[] = []
  const puddles: { x: number; y: number; r: number; life: number }[] = []
  const flowers: Flower[] = [72, 252, 418, 608, 735, 846, 1088, 1146].map((x) => ({ x, water: 0, stage: 0, char: '🌱', pop: spring(1, 260, 9), butterfly: false }))
  const butterflies: { hx: number; hy: number; ph: number; grow: number }[] = []
  const apples: { x: number; y: number; vy: number; vx: number; rest: boolean; rot: number }[] = []
  const rain: { x: number; y: number; ground: number }[] = []
  const clouds = [
    { x: 250, y: 96, v: 9, scale: 1, wet: 0, rainT: 0, puff: spring(1, 200, 9), seed: 1 },
    { x: 770, y: 70, v: 6, scale: 0.82, wet: 0, rainT: 0, puff: spring(1, 200, 9), seed: 2.4 },
  ]
  const fireballs: { x0: number; y0: number; x: number; y: number; t: number; spot: number }[] = []

  const truck = { x: W / 2, lean: spring(0, 170, 9), bob: spring(0, 260, 10), wheel: 0, aim: -1.0, light: 0, happy: 0 }
  const passengers: string[] = []
  const tree = { rustle: spring(0, 160, 6), water: 0, dropped: 0 }
  const sun = { scale: spring(1, 200, 8), bow: 0, grow: 0, until: -9 }
  const dog = { x: 900, y: 560, wet: 0, wetAt: -9, shake: 0, hop: spring(0, 300, 12), soggy: false }
  const cat = { perch: 0, x: perches[0]!.x, y: perches[0]!.y, state: 'sit' as 'sit' | 'jump' | 'huff', t: 0, fromX: 0, fromY: 0, flip: 1, squash: spring(1, 260, 10) }
  const person = { x: 330, dir: 1, open: 0, until: -9, hop: spring(0, 300, 12) }
  const rescue = { state: 'none' as 'none' | 'waiting' | 'ladder' | 'slide' | 'retract', house: 0, char: '🙋', t: 0, pop: 0, nextAt: 9, count: 0 }
  const dragon = { on: false, x: W + 200, y: 80, tx: 820, ty: 130, state: 'hover' as 'hover' | 'windup' | 'leave', t: 0, hp: 1, wetAt: -9, nextSneeze: 0, moveAt: 0, scale: spring(1, 200, 9), rot: 0 }

  let aimId = -1
  let aimX = W / 2
  let aimY = 300
  let sprayUntil = -1
  let spraying = false
  let emitAcc = 0
  let seq = 0
  let lastTouchAt = 0
  let outs = 0
  let streak = 0
  let lastOutAt = -9
  let stars = 0
  let starPop = 1
  let nextSpawn = 2.5
  let nextEventAt = 3
  let eventIdx = 0
  let flowerStep = 0
  const last = new Map<string, number>()

  // True at most once per `gap` seconds per key: keeps sounds off the frame rate.
  const every = (key: string, gap: number): boolean => {
    const t = stage.time
    if (t - (last.get(key) ?? -99) < gap) return false
    last.set(key, t)
    return true
  }

  const nozzle = (): [number, number] => [truck.x + 22 + Math.cos(truck.aim) * 66, TRUCK_Y - 140 + Math.sin(truck.aim) * 66]
  const fireR = (f: Fire): number => f.base * f.size * (0.5 + 0.5 * f.hp) * f.pop
  const steam = (x: number, y: number, count: number, size = 16): void =>
    fx.burst(x, y, { count, color: ['rgba(255,255,255,0.85)', 'rgba(230,244,255,0.8)'], speed: 150, angle: UP, spread: 1.6, gravity: -260, life: 0.8, size, drag: 0.94 })

  // ---------- fires ----------
  const spawnFire = (spotIndex: number, kind: FireKind = 'normal', quiet = false): Fire | null => {
    const spot = spots[spotIndex]
    if (!spot) return null
    spot.busy = true
    const f: Fire = {
      x: spot.x,
      y: spot.y,
      base: kind === 'chain' ? Math.min(27, spot.base) : spot.base,
      size: 1,
      hp: 1,
      pop: 0,
      seed: rnd(0, 20),
      spot: spotIndex,
      house: spot.house,
      kind,
      tough: kind === 'chain' ? 24 : spot.base < 25 ? 40 : 78,
      wetAt: -9,
      squish: spring(1, 240, 8),
      perch: 0,
      hopT: 0,
      hop: 1,
      fromX: 0,
      fromY: 0,
      toX: 0,
      toY: 0,
    }
    fires.push(f)
    stage.tween(0.45, (t) => (f.pop = t), ease.outBack)
    if (spot.house >= 0) houses[spot.house]!.bounce.kick(1.6)
    if (!quiet) {
      sfx.tone({ freq: 160, to: 420, dur: 0.18, type: 'triangle', vol: 0.12 })
      sfx.noise({ dur: 0.2, freq: 500, to: 1800, vol: 0.08 })
      fx.burst(f.x, f.y - 20, { count: 8, color: ['#ffc93c', '#ff8420'], speed: 220, life: 0.4, size: 7, shape: 'spark' })
    }
    return f
  }

  const freeSpots = (roofOnly = false): number[] => {
    const out: number[] = []
    spots.forEach((s, i) => {
      if (!s.busy && (!roofOnly || s.roof)) out.push(i)
    })
    return out
  }

  const spawnHopper = (): void => {
    const perch = cat.perch === 1 ? 2 : 1
    const p = perches[perch]!
    const f: Fire = {
      x: p.x, y: p.y, base: 36, size: 1, hp: 1, pop: 0, seed: rnd(0, 20), spot: -1, house: -1, kind: 'hopper', tough: 130, wetAt: -9,
      squish: spring(1, 240, 8), perch, hopT: 1.6, hop: 1, fromX: p.x, fromY: p.y, toX: p.x, toY: p.y,
    }
    fires.push(f)
    stage.tween(0.5, (t) => (f.pop = t), ease.outBack)
    sfx.boing(3)
    sfx.tone({ freq: 900, to: 1300, dur: 0.1, type: 'square', vol: 0.07, delay: 0.15 })
    sfx.tone({ freq: 900, to: 1300, dur: 0.1, type: 'square', vol: 0.07, delay: 0.3 })
    fx.ring(p.x, p.y - 40, '#ffc93c', 110, 0.5)
    fx.burst(p.x, p.y - 30, { count: 16, color: ['#ffc93c', '#ff8420', '#fff2ad'], speed: 320, life: 0.5, size: 8, shape: 'spark' })
  }

  const spawnChain = (): void => {
    const free = freeSpots(true).sort((a, b) => spots[a]!.x - spots[b]!.x)
    free.forEach((index, i) => {
      spots[index]!.busy = true
      stage.after(i * 0.16, () => {
        spawnFire(index, 'chain', true)
        sfx.pop(i)
        const s = spots[index]!
        fx.burst(s.x, s.y - 20, { count: 8, color: ['#ffc93c', '#ff8420'], speed: 240, life: 0.4, size: 7, shape: 'spark' })
      })
    })
  }

  const dragonArrive = (): void => {
    dragon.on = true
    dragon.x = W + 170
    dragon.y = 40
    dragon.tx = 830
    dragon.ty = 135
    dragon.hp = 1
    dragon.rot = 0
    dragon.state = 'hover'
    dragon.nextSneeze = stage.time + 2.2
    dragon.moveAt = stage.time + 4
    sfx.whoosh()
    sfx.tone({ freq: 190, to: 330, dur: 0.25, type: 'sawtooth', vol: 0.1 })
    sfx.tone({ freq: 330, to: 230, dur: 0.3, type: 'sawtooth', vol: 0.1, delay: 0.25 })
  }

  const runEvent = (): void => {
    for (let tries = 0; tries < 3; tries++) {
      const kind = eventIdx++ % 3
      if (kind === 0 && freeSpots(true).length >= 3) return spawnChain()
      if (kind === 1 && !fires.some((f) => f.kind === 'hopper')) return spawnHopper()
      if (kind === 2 && !dragon.on) return dragonArrive()
    }
  }

  const addStar = (): void => {
    stars++
    starPop = 0
    stage.tween(0.5, (t) => (starPop = t), ease.outBack)
    fx.confetti(W / 2, 170, 70)
    fx.text(W / 2, 250, '⭐', { size: 120, life: 1.1 })
    sfx.fanfare()
    truck.bob.kick(-260)
    truck.happy = stage.time + 1.5
    truck.light = 1
  }

  const douse = (f: Fire): void => {
    const at = fires.indexOf(f)
    if (at >= 0) fires.splice(at, 1)
    const t = stage.time
    streak = t - lastOutAt < 2.2 ? Math.min(streak + 1, 9) : 0
    lastOutAt = t
    outs++
    const cy = f.y - f.base
    steam(f.x, cy, 14, 22)
    fx.burst(f.x, cy, { count: 10, color: ['#ffffff', '#ffe14d', '#bfe9ff'], speed: 360, life: 0.6, size: 12, shape: 'star' })
    fx.ring(f.x, cy, '#ffffff', 90 + streak * 8, 0.35)
    sfx.pop(streak)
    sfx.noise({ dur: 0.4, freq: 6500, to: 1500, vol: 0.13, filter: 'highpass' })
    sfx.ding(streak)
    truck.happy = Math.max(truck.happy, t + 0.7)
    if (f.spot >= 0) {
      const spot = spots[f.spot]!
      stage.after(1.6, () => (spot.busy = false))
    }
    if (f.kind === 'hopper') {
      fx.confetti(f.x, cy, 40)
      fx.shake(7)
      sfx.win()
    }
    if (f.house >= 0 && !fires.some((o) => o.house === f.house)) {
      // The house sighs with relief.
      const h = houses[f.house]!
      const def = HOUSES[f.house]!
      h.relief = 1
      h.bounce.kick(-2.4)
      sfx.tone({ freq: 560, to: 330, dur: 0.45, type: 'sine', vol: 0.11, delay: 0.18 })
      stage.after(0.2, () => steam(def.x, BASE - 50, 5, 13))
      fx.burst(def.x, BASE - def.h * 0.6, { count: 5, color: '#ff8fa3', speed: 160, life: 0.9, size: 13, shape: 'heart', gravity: -120 })
    }
    if (outs % 5 === 0) stage.after(0.25, addStar)
    if (outs >= nextEventAt) {
      nextEventAt = outs + (eventIdx % 3 === 0 ? 9 : 5)
      stage.after(0.9, runEvent)
    }
    nextSpawn = Math.min(nextSpawn, t + rnd(0.7, 1.6))
  }

  // ---------- rescue ----------
  const windowOf = (i: number): [number, number] => [HOUSES[i]!.x, BASE - HOUSES[i]!.h - 36]
  const ladderBase = (): [number, number] => [truck.x - 70, TRUCK_Y - 146 + truck.bob.value]

  const startRescue = (): void => {
    if (rescue.state !== 'waiting') return
    rescue.state = 'ladder'
    rescue.t = 0
    sfx.slideUp()
    truck.light = 1
    const [wx, wy] = windowOf(rescue.house)
    fx.ring(wx, wy, '#ffe14d', 120, 0.4)
  }

  const finishRescue = (): void => {
    const [bx, by] = ladderBase()
    passengers.push(rescue.char)
    if (passengers.length > 4) passengers.shift()
    rescue.state = 'retract'
    rescue.t = 0
    rescue.count++
    rescue.nextAt = stage.time + rnd(14, 20)
    truck.bob.kick(220)
    truck.happy = stage.time + 1.6
    sfx.boing(2)
    sfx.win()
    fx.confetti(bx, by - 40, 50)
    fx.burst(bx, by - 30, { count: 9, color: ['#ff5d8f', '#ff8fa3'], speed: 260, life: 1, size: 16, shape: 'heart', gravity: -160 })
    fx.text(bx, by - 90, 'HOORAY!', { size: 54, color: '#fff3b0' })
    houses[rescue.house]!.relief = 1
    houses[rescue.house]!.bounce.kick(-2)
  }

  const houseAt = (x: number, y: number): number => {
    for (let i = 0; i < HOUSES.length; i++) {
      const h = HOUSES[i]!
      const onWall = Math.abs(x - h.x) < h.w / 2 && y > BASE - h.h && y < BASE
      const onRoof = y <= BASE - h.h && y > roofY(h, x - h.x) - 8 && Math.abs(x - h.x) < h.w / 2 + 16
      if (onWall || onRoof) return i
    }
    return -1
  }

  // ---------- water lands ----------
  const wetAt = (x: number, y: number, k: number): boolean => {
    const t = stage.time
    if (rescue.state === 'waiting') {
      const [wx, wy] = windowOf(rescue.house)
      if (dist(x, y, wx, wy) < 80) {
        startRescue()
        return true
      }
    }
    let hit = false
    for (let i = fires.length - 1; i >= 0; i--) {
      const f = fires[i]!
      const r = fireR(f)
      if (dist(x, y, f.x, f.y - r) > r * 1.3 + 44) continue
      hit = true
      f.hp -= k / (f.tough * (0.6 + 0.4 * f.size))
      f.wetAt = t
      if (f.kind === 'hopper') f.hopT -= 0.012 * k
      if (Math.random() < 0.3) steam(f.x + rnd(-r, r) * 0.6, f.y - r * 1.4, 1, 15)
      if (every('sizzle', 0.11)) sfx.noise({ dur: 0.12, freq: rnd(5200, 7500), vol: 0.1, filter: 'highpass' })
      if (f.hp <= 0) douse(f)
    }
    if (hit) return true
    if (dragon.on && dragon.state !== 'leave' && dist(x, y, dragon.x, dragon.y) < 95) {
      dragon.hp -= k / 120
      dragon.wetAt = t
      if (dragon.state === 'windup') dragon.state = 'hover'
      dragon.nextSneeze = Math.max(dragon.nextSneeze, t + 1.2)
      if (every('dragonwet', 0.3)) {
        dragon.scale.kick(-2)
        sfx.tone({ freq: rnd(500, 700), to: 300, dur: 0.12, type: 'sawtooth', vol: 0.07 })
        steam(dragon.x - 50, dragon.y - 10, 2, 14)
      }
      if (dragon.hp <= 0) {
        dragon.state = 'leave'
        dragon.t = 0
        steam(dragon.x, dragon.y, 22, 26)
        fx.confetti(dragon.x, dragon.y, 60)
        fx.burst(dragon.x, dragon.y, { count: 10, color: ['#ff5d8f', '#ff8fa3'], speed: 300, life: 1, size: 16, shape: 'heart', gravity: -120 })
        fx.shake(8)
        sfx.slideUp()
        stage.after(0.3, addStar)
      }
      return true
    }
    if (cat.state !== 'jump' && dist(x, y, cat.x, cat.y - 26) < 58) {
      if (cat.state === 'sit' || cat.t > 0.4) {
        let next = cat.perch
        while (next === cat.perch) next = Math.floor(Math.random() * perches.length)
        cat.fromX = cat.x
        cat.fromY = cat.y
        cat.flip = perches[next]!.x > cat.x ? -1 : 1
        cat.perch = next
        cat.state = 'jump'
        cat.t = 0
        cat.squash.value = 1.5
        sfx.tone({ freq: 650, to: 1150, dur: 0.14, type: 'sawtooth', vol: 0.12 })
        sfx.tone({ freq: 1150, to: 480, dur: 0.32, type: 'sawtooth', vol: 0.12, delay: 0.14 })
        fx.burst(cat.x, cat.y - 26, { count: 12, color: WATER, speed: 380, life: 0.5, size: 8, gravity: 900 })
        fx.text(cat.x, cat.y - 80, '💢', { size: 50 })
      }
      return true
    }
    if (dist(x, y, dog.x, dog.y) < 62) {
      if (dog.shake <= 0) {
        if (dog.wet === 0) {
          sfx.tone({ freq: 700, to: 950, dur: 0.09, type: 'square', vol: 0.1 })
          dog.hop.kick(-320)
        }
        dog.wet = Math.min(1, dog.wet + k / 30)
        dog.wetAt = t
      }
      return true
    }
    if (dist(x, y, person.x, 548) < 72) {
      if (person.open < 0.5 && person.until < t) {
        person.hop.kick(-380)
        sfx.pop(4)
        sfx.whoosh()
        fx.text(person.x, 470, '❗', { size: 46, life: 0.6 })
      } else if (every('brolly', 0.13)) {
        sfx.tick()
        fx.burst(x, 505, { count: 3, color: WATER, speed: 300, angle: UP, spread: 2.4, life: 0.35, size: 7, gravity: 1200 })
      }
      person.until = t + 2.6
      return true
    }
    if (dist(x, y, SUN.x, SUN.y) < 80) {
      sun.scale.kick(0.06 * k)
      if (t > sun.until - 2) {
        if (sun.bow < 0.05) {
          sun.grow = 0
          for (let i = 0; i < 7; i++) sfx.tone({ freq: sfx.scale(i), dur: 0.25, type: 'triangle', vol: 0.13, delay: i * 0.09 })
          fx.burst(SUN.x, SUN.y, { count: 18, color: ['#ffe14d', '#ffffff'], speed: 380, life: 0.8, size: 12, shape: 'star' })
        }
        sun.until = t + 8
      }
      return true
    }
    for (const c of clouds) {
      if (Math.abs(x - c.x) < 95 * c.scale && Math.abs(y - c.y) < 55 * c.scale) {
        if (c.rainT <= 0) {
          c.wet += k / 45
          c.puff.kick(0.5)
          if (every('cloud', 0.18)) sfx.tone({ freq: 300 + c.wet * 300, to: 360 + c.wet * 300, dur: 0.08, type: 'sine', vol: 0.1 })
          if (c.wet >= 1) {
            c.wet = 0
            c.rainT = 5
            c.puff.kick(3)
            sfx.thud(1.2)
            sfx.noise({ dur: 0.6, freq: 200, to: 80, vol: 0.2, filter: 'lowpass' })
            fx.shake(4)
          }
        }
        return true
      }
    }
    if (dist(x, y, TREE_X, 350) < 78) {
      tree.rustle.kick(rnd(-3, 3))
      tree.water += k
      if (every('leaves', 0.16)) sfx.noise({ dur: 0.1, freq: rnd(2500, 3800), vol: 0.06, q: 2 })
      if (Math.random() < 0.1) fx.burst(x, y, { count: 1, color: ['#55c56c', '#3fae57'], speed: 160, life: 0.8, size: 9, gravity: 500, shape: 'square' })
      if (tree.water > 38 && apples.length < 6) {
        tree.water = 0
        apples.push({ x: TREE_X + rnd(-50, 50), y: 360, vy: -150, vx: rnd(-90, 90), rest: false, rot: 0 })
        sfx.pop(2)
      }
      return true
    }
    const i = houseAt(x, y)
    if (i >= 0) {
      const st = houses[i]!
      if (t - st.sparkleAt > 0.32) {
        st.sparkleAt = t
        fx.burst(x, y, { count: 3, color: ['#ffffff', '#fff3b0'], speed: 140, life: 0.6, size: 12, shape: 'star', gravity: -40 })
        sfx.tone({ freq: rnd(1700, 2300), to: 2600, dur: 0.07, type: 'sine', vol: 0.06 })
        if (!fires.some((f) => f.house === i)) st.relief = Math.max(st.relief, 0.6)
        st.bounce.kick(0.5)
      }
      return true
    }
    if (y > BASE - 40) {
      for (const f of flowers) {
        if (Math.abs(x - f.x) > 50 || y > ROAD_TOP - 5) continue
        f.water += k / 26
        f.pop.kick(0.8)
        const want = f.water >= 3.4 ? 3 : f.water >= 2 ? 2 : f.water >= 0.8 ? 1 : 0
        if (want > f.stage) {
          f.stage = want
          f.pop.value = 0.3
          if (want === 1) f.char = pick(['🌷', '🌼', '🌸', '🌹'])
          if (want === 2) f.char = '🌻'
          sfx.pop(flowerStep)
          sfx.note(flowerStep++ % 10, 0.3)
          fx.burst(f.x, BASE + 10, { count: 9, color: ['#ff7ac8', '#ffe14d', '#7bd88f', '#ffffff'], speed: 260, life: 0.6, size: 9, shape: want === 3 ? 'heart' : 'star' })
          if (want === 3 && !f.butterfly && butterflies.length < 6) {
            f.butterfly = true
            const b = { hx: f.x, hy: BASE - 40, ph: rnd(0, 6), grow: 0 }
            butterflies.push(b)
            stage.tween(0.6, (v) => (b.grow = v), ease.outBack)
            sfx.ding(4)
          }
        }
      }
      if (y > BASE + 20) {
        const near = puddles.find((p) => dist(p.x, p.y, x, y) < 60)
        if (near) {
          near.r = Math.min(54, near.r + 0.5 * k)
          near.life = 7
        } else if (puddles.length < 12) {
          puddles.push({ x, y: clamp(y, BASE + 60, H - 30), r: 12, life: 7 })
        }
      }
      return true
    }
    return false
  }

  const splash = (x: number, y: number): void => {
    fx.burst(x, y, { count: 3, color: WATER, speed: 380, angle: UP, spread: 2.8, life: 0.42, size: 11, gravity: 1500 })
  }

  const emit = (n: number, dt: number): void => {
    const [nx, ny] = nozzle()
    for (let i = 0; i < n; i++) {
      const loose = seq % 4 === 3
      const j = loose ? 30 : 2.5
      const dx = aimX + rnd(-j, j) - nx
      const dy = aimY + rnd(-j, j) - ny
      const T = clamp(Math.max(0.34 + Math.abs(dx) / 2600, Math.sqrt((2 * Math.max(0, -dy)) / G) * 1.13), 0.3, 1.15)
      const vx = dx / T
      const vy = dy / T - 0.5 * G * T
      drops.push({ x0: nx, y0: ny, vx, vy, t: (i / n) * dt, T, x: nx, y: ny, seq: seq++, loose, falling: false, ground: rnd(BASE + 45, ROAD_TOP + 40) })
      if (i === 0) truck.aim = lerp(truck.aim, Math.atan2(vy, vx), 0.35)
    }
  }

  // Two fires are already burning, so the scene reads before the first touch.
  spawnFire(2, 'normal', true)
  spawnFire(BBQ_SPOT, 'normal', true)
  for (const f of fires) f.pop = 1

  const biggestFire = (): Fire | null => {
    let best: Fire | null = null
    for (const f of fires) if (!best || fireR(f) > fireR(best)) best = f
    return best
  }

  // ---------- update ----------
  const update = (dt: number): void => {
    const t = stage.time
    spraying = aimId !== -1 || t < sprayUntil

    // Truck: trundles toward the aim, leans back from the recoil.
    const wantX = spraying ? clamp(lerp(W / 2, aimX, 0.55) - 22, 190, W - 200) : truck.x
    const before = truck.x
    truck.x = damp(truck.x, wantX, 2.2, dt)
    truck.wheel += (truck.x - before) / 32
    const [nx0] = nozzle()
    truck.lean.target = spraying ? -0.032 * clamp((aimX - nx0) / 300, -1, 1) - 0.01 : 0
    truck.lean.update(dt)
    truck.bob.update(dt)
    truck.light = spraying || rescue.state === 'ladder' || rescue.state === 'slide' ? 1 : Math.max(0, truck.light - dt * 0.9)

    if (spraying) {
      emitAcc += dt * 120
      const n = Math.floor(emitAcc)
      emitAcc -= n
      if (n > 0) emit(n, dt)
      if (every('hiss', 0.1)) sfx.noise({ dur: 0.2, freq: rnd(1500, 2300), vol: 0.06, q: 0.6 })
    } else {
      truck.aim = damp(truck.aim, -1.0, 3, dt)
    }

    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i]!
      d.t += dt
      d.x = d.x0 + d.vx * d.t
      d.y = d.y0 + d.vy * d.t + 0.5 * G * d.t * d.t
      let landed = false
      if (!d.falling && d.t >= d.T) {
        if (wetAt(d.x, d.y, 1)) landed = true
        else d.falling = true
      } else if (d.falling && (d.y >= d.ground || (d.vy + G * d.t > 0 && d.y < BASE - 30 && houseAt(d.x, d.y) >= 0))) {
        wetAt(d.x, d.y, 1)
        landed = true
      }
      if (landed || d.x < -80 || d.x > W + 80 || d.y > H + 40) {
        if (landed && (d.seq & 1) === 0) splash(d.x, d.y)
        drops.splice(i, 1)
      }
    }

    // Fires: idle growth, the hopper's hops, new arrivals.
    for (const f of fires) {
      f.squish.update(dt)
      if (t - f.wetAt > 1.5 && f.kind !== 'chain') f.size = Math.min(1.35, f.size + dt * 0.016)
      if (t - f.wetAt > 0.6 && f.hp < 1) f.hp = Math.min(1, f.hp + dt * 0.08)
      if (f.kind !== 'hopper') continue
      if (f.hop < 1) {
        f.hop = Math.min(1, f.hop + dt / 0.5)
        f.x = lerp(f.fromX, f.toX, f.hop)
        f.y = lerp(f.fromY, f.toY, f.hop) - Math.sin(f.hop * Math.PI) * 130
        if (f.hop === 1) {
          f.squish.value = 0.6
          sfx.thud(0.4)
          fx.burst(f.x, f.y, { count: 6, color: ['#ffc93c', '#ff8420'], speed: 200, life: 0.35, size: 6, shape: 'spark' })
        }
      } else {
        f.hopT -= dt
        if (f.hopT <= 0) {
          let next = f.perch
          while (next === f.perch) next = Math.floor(Math.random() * perches.length)
          f.perch = next
          f.fromX = f.x
          f.fromY = f.y
          f.toX = perches[next]!.x + (cat.perch === next ? 46 : 0)
          f.toY = perches[next]!.y + (cat.perch === next ? 34 : 0)
          f.hop = 0
          f.hopT = 2.1
          f.squish.value = 1.35
          sfx.boing(Math.round(rnd(0, 4)))
        }
      }
    }
    const cap = outs < 3 ? 2 : 3
    const normal = fires.reduce((n, f) => n + (f.kind === 'normal' ? 1 : 0), 0)
    if (fires.length === 0) nextSpawn = Math.min(nextSpawn, t + 0.6)
    if (t >= nextSpawn && normal < cap) {
      const free = freeSpots()
      if (free.length) spawnFire(pick(free, stage.rand()))
      nextSpawn = t + rnd(1.8, 3.2)
    }

    // Fireballs from the dragon.
    for (let i = fireballs.length - 1; i >= 0; i--) {
      const b = fireballs[i]!
      b.t = Math.min(1, b.t + dt / 0.7)
      const s = spots[b.spot]!
      b.x = lerp(b.x0, s.x, b.t)
      b.y = lerp(b.y0, s.y - 20, b.t) - Math.sin(b.t * Math.PI) * 90
      if (Math.random() < 0.5) fx.burst(b.x, b.y, { count: 1, color: ['#ffc93c', '#ff8420'], speed: 60, life: 0.3, size: 7 })
      if (b.t === 1) {
        fireballs.splice(i, 1)
        spawnFire(b.spot)
      }
    }

    // Dragon.
    if (dragon.on) {
      dragon.scale.update(dt)
      dragon.t += dt
      if (dragon.state === 'leave') {
        dragon.rot += dt * 9
        dragon.x += dt * 260
        dragon.y -= dt * (120 + dragon.t * 300)
        if (dragon.y < -160) dragon.on = false
      } else {
        dragon.x = damp(dragon.x, dragon.tx, 1.7, dt)
        dragon.y = damp(dragon.y, dragon.ty, 1.7, dt)
        const dizzy = t - dragon.wetAt < 0.5
        dragon.rot = damp(dragon.rot, dizzy ? Math.sin(t * 30) * 0.2 : dragon.state === 'windup' ? 0.3 : 0, 10, dt)
        if (t > dragon.moveAt && dragon.state === 'hover') {
          dragon.moveAt = t + rnd(3.5, 5)
          dragon.tx = rnd(230, 930)
          dragon.ty = rnd(115, 165)
        }
        if (dragon.state === 'hover' && t >= dragon.nextSneeze && fires.length + fireballs.length < 5 && freeSpots().length > 0) {
          dragon.state = 'windup'
          dragon.t = 0
          sfx.tone({ freq: 380, to: 500, dur: 0.2, type: 'triangle', vol: 0.14 })
          sfx.tone({ freq: 440, to: 620, dur: 0.25, type: 'triangle', vol: 0.14, delay: 0.38 })
        }
        if (dragon.state === 'windup') {
          dragon.scale.target = 1.28
          if (dragon.t > 0.85) {
            dragon.state = 'hover'
            dragon.scale.target = 1
            dragon.scale.value = 0.7
            dragon.nextSneeze = t + rnd(3.2, 4.2)
            const free = freeSpots()
            const mx = dragon.x - 58
            const my = dragon.y - 6
            sfx.noise({ dur: 0.3, freq: 3000, to: 600, vol: 0.22 })
            sfx.zap()
            fx.burst(mx, my, { count: 14, color: ['#ffc93c', '#ff8420', '#fff2ad'], speed: 380, angle: Math.PI * 0.85, spread: 1.2, life: 0.5, size: 8, shape: 'spark' })
            if (free.length) {
              const index = pick(free)
              spots[index]!.busy = true
              fireballs.push({ x0: mx, y0: my, x: mx, y: my, t: 0, spot: index })
            }
          }
        } else {
          dragon.scale.target = 1
        }
      }
    }

    // Houses, clouds, sun.
    for (const h of houses) {
      h.relief = Math.max(0, h.relief - dt * 0.45)
      h.bounce.update(dt)
    }
    for (const c of clouds) {
      c.x += c.v * dt
      if (c.x > W + 140) c.x = -140
      c.puff.update(dt)
      if (c.rainT > 0) {
        c.rainT -= dt
        if (Math.random() < dt * 34) rain.push({ x: c.x + rnd(-80, 80) * c.scale, y: c.y + 30, ground: rnd(BASE - 5, BASE + 70) })
        if (every('rain' + c.seed, 0.16)) sfx.noise({ dur: 0.1, freq: rnd(3000, 5000), vol: 0.04, filter: 'highpass' })
      } else {
        c.wet = Math.max(0, c.wet - dt * 0.05)
      }
    }
    for (let i = rain.length - 1; i >= 0; i--) {
      const r = rain[i]!
      r.y += dt * 780
      let done = false
      for (const f of fires) {
        const fr = fireR(f)
        if (Math.abs(r.x - f.x) < fr + 22 && r.y > f.y - fr * 2.2 && r.y < f.y) {
          wetAt(f.x, f.y - fr, 3)
          done = true
          break
        }
      }
      if (!done && r.y >= r.ground) {
        wetAt(r.x, r.y, 2)
        fx.burst(r.x, r.y, { count: 1, color: WATER, speed: 160, angle: UP, spread: 2, life: 0.25, size: 6, gravity: 900 })
        done = true
      }
      if (done) rain.splice(i, 1)
    }
    sun.scale.update(dt)
    sun.bow = damp(sun.bow, t < sun.until ? 1 : 0, t < sun.until ? 4 : 1.2, dt)
    sun.grow = Math.min(1, sun.grow + dt * 1.3)

    // Tree and apples.
    tree.rustle.update(dt)
    for (const a of apples) {
      if (a.rest) continue
      a.vy += 1800 * dt
      a.y += a.vy * dt
      a.x += a.vx * dt
      a.rot += a.vx * dt * 0.03
      if (a.y > BASE + 22) {
        a.y = BASE + 22
        if (a.vy > 220) {
          a.vy *= -0.45
          sfx.thud(0.35)
        } else {
          a.rest = true
        }
      }
    }

    // Dog: soaks, then shakes itself dry.
    dog.hop.update(dt)
    if (dog.shake > 0) {
      dog.shake -= dt
      if (every('dogshake', 0.07)) {
        fx.burst(dog.x, dog.y, { count: 5, color: WATER, speed: 520, life: 0.45, size: 8, gravity: 900 })
        sfx.noise({ dur: 0.05, freq: rnd(1800, 3200), vol: 0.1, q: 2 })
      }
      if (dog.shake <= 0) {
        dog.wet = 0
        dog.hop.kick(-360)
        sfx.tone({ freq: 340, to: 190, dur: 0.11, type: 'square', vol: 0.16 })
        sfx.tone({ freq: 380, to: 200, dur: 0.12, type: 'square', vol: 0.16, delay: 0.2 })
        fx.burst(dog.x, dog.y - 40, { count: 3, color: '#ff8fa3', speed: 160, life: 0.9, size: 15, shape: 'heart', gravity: -140 })
      }
    } else if (dog.wet > 0.25 && (dog.wet >= 1 || t - dog.wetAt > 0.3)) {
      dog.shake = 0.9
    }

    // Cat: leaps to another roof, then sulks with its back turned.
    cat.squash.update(dt)
    cat.t += dt
    if (cat.state === 'jump') {
      const p = perches[cat.perch]!
      const k = Math.min(1, cat.t / 0.6)
      cat.x = lerp(cat.fromX, p.x, k)
      cat.y = lerp(cat.fromY, p.y, k) - Math.sin(k * Math.PI) * 150
      if (k === 1) {
        cat.state = 'huff'
        cat.t = 0
        cat.squash.value = 0.65
        sfx.thud(0.3)
      }
    } else if (cat.state === 'huff' && cat.t > 2.5) {
      cat.state = 'sit'
    }

    // The walker and their umbrella.
    person.hop.update(dt)
    const brolly = t < person.until
    person.open = damp(person.open, brolly ? 1 : 0, brolly ? 16 : 6, dt)
    if (!brolly) {
      person.x += person.dir * 36 * dt
      if (person.x > W - 70) person.dir = -1
      if (person.x < 70) person.dir = 1
    }

    for (const f of flowers) f.pop.update(dt)
    for (let i = puddles.length - 1; i >= 0; i--) {
      const p = puddles[i]!
      p.life -= dt
      if (p.life <= 0) puddles.splice(i, 1)
    }

    // Rescue.
    rescue.t += dt
    if (rescue.state === 'none' && t >= rescue.nextAt) {
      rescue.state = 'waiting'
      rescue.house = Math.floor(stage.rand() * HOUSES.length)
      rescue.char = pick(['🙋', '👵', '🧸', '👴', '🙋‍♂️', '🐻'], stage.rand())
      rescue.pop = 0
      stage.tween(0.4, (v) => (rescue.pop = v), ease.outBack)
      sfx.pop(5)
    }
    if (rescue.state === 'waiting' && every('yoohoo', 2.6)) {
      sfx.note(4, 0.16, 'sine', 0.12)
      sfx.tone({ freq: sfx.scale(6), dur: 0.22, type: 'sine', vol: 0.12, delay: 0.16 })
    }
    if (rescue.state === 'ladder') {
      if (every('ratchet', 0.07)) sfx.tick()
      if (rescue.t >= 0.6) {
        rescue.state = 'slide'
        rescue.t = 0
        sfx.slideDown()
      }
    } else if (rescue.state === 'slide' && rescue.t >= 0.75) {
      finishRescue()
    } else if (rescue.state === 'retract' && rescue.t >= 0.4) {
      rescue.state = 'none'
    }
  }

  // ---------- draw ----------
  const drawLadder = (g: CanvasRenderingContext2D, reach: number): void => {
    const [bx, by] = ladderBase()
    const [wx, wy] = windowOf(rescue.house)
    const ex = lerp(bx, wx, reach)
    const ey = lerp(by, wy + 18, reach)
    const len = dist(bx, by, ex, ey)
    if (len < 4) return
    const ux = (ex - bx) / len
    const uy = (ey - by) / len
    const px = -uy * 11
    const py = ux * 11
    line(g, bx + px, by + py, ex + px, ey + py, '#eef2f5', 7)
    line(g, bx - px, by - py, ex - px, ey - py, '#eef2f5', 7)
    for (let d = 14; d < len; d += 24) {
      line(g, bx + ux * d + px, by + uy * d + py, bx + ux * d - px, by + uy * d - py, '#c3ccd5', 5)
    }
  }

  const drawJet = (g: CanvasRenderingContext2D): void => {
    if (drops.length === 0) return
    const [nx, ny] = nozzle()
    g.lineCap = 'round'
    g.lineJoin = 'round'
    const passes: [number, string, number][] = [[30, '#2b84d9', 0], [21, '#62bdff', 0], [9, '#e2f6ff', -4]]
    for (const [width, color, off] of passes) {
      g.beginPath()
      let px = 0
      let py = 0
      let pseq = -99
      let lastRope: Drop | null = null
      for (const d of drops) {
        if (d.loose) continue
        if (d.seq - pseq <= 3 && Math.abs(d.x - px) + Math.abs(d.y - py) < 170) g.lineTo(d.x, d.y + off)
        else g.moveTo(d.x, d.y + off)
        px = d.x
        py = d.y
        pseq = d.seq
        lastRope = d
      }
      if (spraying && lastRope && seq - lastRope.seq <= 4) g.lineTo(nx, ny + off)
      g.strokeStyle = color
      g.lineWidth = width
      g.stroke()
    }
    for (const d of drops) {
      if (!d.loose) continue
      circle(g, d.x, d.y, 8, '#62bdff', '#2b84d9', 3)
      circle(g, d.x - 2, d.y - 3, 3, '#ffffff')
    }
  }

  const draw = (g: CanvasRenderingContext2D): void => {
    const t = stage.time
    g.drawImage(backdrop, 0, 0)

    drawRainbow(g, sun.bow, ease.outCubic(sun.grow))
    drawSun(g, SUN.x, SUN.y, t, sun.scale.value, sun.bow > 0.3 ? 'yum' : 'happy')
    for (const c of clouds) {
      const raining = c.rainT > 0
      drawCloud(g, c.x, c.y, c.scale * (1 + c.wet * 0.25) * c.puff.value, raining ? 0.8 : c.wet * 0.6, raining ? 'wow' : c.wet > 0.05 ? 'wow' : 'happy', t, c.seed)
    }
    g.strokeStyle = 'rgba(120,190,255,0.9)'
    g.lineWidth = 5
    g.lineCap = 'round'
    g.beginPath()
    for (const r of rain) {
      g.moveTo(r.x, r.y)
      g.lineTo(r.x, r.y - 18)
    }
    g.stroke()

    drawTree(g, TREE_X, tree.rustle.value, t)

    // Houses look at their fire, or at the water, or at the truck.
    HOUSES.forEach((h, i) => {
      const st = houses[i]!
      const mine = fires.find((f) => f.house === i)
      const lx = mine ? mine.x : spraying ? aimX : truck.x
      const ly = mine ? mine.y - 30 : spraying ? aimY : TRUCK_Y - 100
      const ex = lx - h.x
      const ey = ly - (BASE - h.h * 0.62)
      const el = Math.hypot(ex, ey) || 1
      const jitter = mine ? Math.sin(t * 22 + i) * 0.12 : 0
      drawHouse(g, h, { alarm: !!mine, relief: st.relief, lookX: ex / el + jitter, lookY: ey / el, blink: blinkAt(t, i * 2 + 1), sy: st.bounce.value })
    })
    if (rescue.state === 'waiting' || rescue.state === 'ladder') {
      const [wx, wy] = windowOf(rescue.house)
      const pulse = (t * 1.4) % 1
      g.globalAlpha = 1 - pulse
      circle(g, wx, wy, 30 + pulse * 40, 'rgba(255,255,255,0)', '#ffe14d', 7)
      g.globalAlpha = 1
      sprite(g, rescue.char, wx, wy - 4 + Math.sin(t * 9) * 5, 58 * rescue.pop, Math.sin(t * 7) * 0.22)
      sprite(g, '👋', wx + 40, wy - 30 + Math.sin(t * 9) * 4, 36 * rescue.pop, Math.sin(t * 12) * 0.5)
    }

    sprite(g, '🎂', 790, 466, 58)
    for (const a of apples) sprite(g, '🍎', a.x, a.y - 12, 28, a.rot)

    for (const p of puddles) {
      g.globalAlpha = Math.min(1, p.life / 2) * 0.6
      ellipse(g, p.x, p.y, p.r * 1.5, p.r * 0.42, '#8fd3ff')
      ellipse(g, p.x - p.r * 0.4, p.y - p.r * 0.1, p.r * 0.5, p.r * 0.1, '#e2f6ff')
      g.globalAlpha = 1
    }

    for (const f of flowers) {
      const size = [40, 62, 88, 96][f.stage]!
      const s = Math.max(0.2, f.pop.value)
      sprite(g, f.char, f.x + Math.sin(t * 1.6 + f.x) * 2, BASE + 44 - (size * s) / 2, size, Math.sin(t * 1.6 + f.x) * 0.06, 1 / Math.sqrt(s), s)
    }

    // Dog.
    {
      const rot = dog.shake > 0 ? Math.sin(t * 48) * 0.3 : 0
      const droop = dog.wet > 0.2 && dog.shake <= 0 ? 0.9 : 1
      shadow(g, dog.x, dog.y + 34, 34)
      sprite(g, '🐕', dog.x, dog.y + dog.hop.value * 0.12 + Math.sin(t * 5) * 1.5, 72, rot, 1 / droop, droop)
      if (dog.wet > 0.2 && dog.shake <= 0) {
        for (let i = 0; i < 3; i++) circle(g, dog.x - 20 + i * 20, dog.y + 10 + ((t * 60 + i * 17) % 30), 4, '#8fd3ff')
      }
    }
    // Walker.
    {
      const py = 562 + person.hop.value * 0.1
      const step = t < person.until ? 0 : Math.abs(Math.sin(t * 6)) * 4
      shadow(g, person.x, 602, 26)
      sprite(g, '🚶', person.x, py - step, 84, 0, person.dir, 1)
      if (person.open > 0.03) sprite(g, '☂️', person.x + 4, py - 58 - step, 88 * person.open, Math.sin(t * 3) * 0.05)
    }

    // Cat.
    {
      const s = cat.squash.value
      const turn = cat.state === 'huff' ? -cat.flip : cat.flip
      const rot = cat.state === 'jump' ? cat.t * 4 * -cat.flip : Math.sin(t * 2.2) * 0.04
      sprite(g, '🐈', cat.x, cat.y - 24, 64, rot, turn / Math.sqrt(s), s)
      if (cat.state === 'huff' && cat.t < 1.6) sprite(g, '💢', cat.x + 26, cat.y - 62, 26 + Math.sin(t * 10) * 3)
    }

    // Fires.
    for (const f of fires) {
      const r = fireR(f)
      const wet = t - f.wetAt < 0.25 ? 1 : 0
      const mood: Mood = wet ? 'wow' : f.kind === 'hopper' ? 'yum' : f.size > 1.2 ? 'yum' : 'happy'
      const lx = clamp(((spraying ? aimX : truck.x) - f.x) / 300, -1, 1)
      const ly = spraying ? clamp((aimY - f.y) / 300, -1, 1) : 0.7
      const q = f.squish.value
      const shiver = wet ? Math.sin(t * 60 + f.seed) * 3 : 0
      flame(g, f.x + shiver, f.y, r, t, f.seed, mood, lx, ly, wet, 1 / Math.sqrt(q), q, f.kind === 'hopper' ? 1 : 0)
    }
    for (const b of fireballs) {
      circle(g, b.x, b.y, 17, '#ff8420')
      circle(g, b.x, b.y, 10, '#ffc93c')
      circle(g, b.x, b.y, 5, '#fff2ad')
    }

    if (dragon.on) {
      const flap = 1 + Math.sin(t * 9) * 0.06
      const s = dragon.scale.value
      const dy = dragon.y + Math.sin(t * 3.1) * 10
      sprite(g, '🐉', dragon.x, dy, 165, dragon.rot, s, s * flap)
      if (dragon.state === 'windup') {
        const k = clamp(dragon.t / 0.85, 0, 1)
        circle(g, dragon.x - 60, dy - 8, 6 + k * 12, 'rgba(255,200,60,0.85)')
      }
    }

    for (const b of butterflies) {
      const bx = b.hx + Math.sin(t * 0.9 + b.ph) * 70
      const by = b.hy - 50 + Math.sin(t * 1.7 + b.ph * 2) * 34
      sprite(g, '🦋', bx, by, 40 * b.grow, Math.sin(t * 2 + b.ph) * 0.3, 0.35 + Math.abs(Math.sin(t * 13 + b.ph)) * 0.65, 1)
    }

    // Ladder, the rescued one sliding down, then the truck.
    if (rescue.state === 'ladder') drawLadder(g, ease.outCubic(clamp(rescue.t / 0.6, 0, 1)))
    else if (rescue.state === 'slide') drawLadder(g, 1)
    else if (rescue.state === 'retract') drawLadder(g, 1 - ease.inCubic(clamp(rescue.t / 0.4, 0, 1)))
    if (rescue.state === 'slide') {
      const [bx, by] = ladderBase()
      const [wx, wy] = windowOf(rescue.house)
      const k = ease.inQuad(clamp(rescue.t / 0.75, 0, 1))
      sprite(g, rescue.char, lerp(wx, bx, k), lerp(wy, by - 24, k) - 10, 58, Math.sin(t * 20) * 0.25)
    }

    ellipse(g, truck.x, TRUCK_Y + 2, 178, 15, 'rgba(0,0,0,0.25)')
    const look = biggestFire()
    const [wx, wy] = rescue.state === 'waiting' ? windowOf(rescue.house) : [truck.x + 200, 300]
    const tx = spraying ? aimX : look ? look.x : wx
    const ty = spraying ? aimY : look ? look.y : wy
    const ldx = tx - (truck.x + 110)
    const ldy = ty - (TRUCK_Y - 130)
    const ll = Math.hypot(ldx, ldy) || 1
    drawTruck(g, {
      x: truck.x + (spraying ? Math.sin(t * 70) * 1.2 : 0),
      lean: truck.lean.value,
      bob: truck.bob.value * 0.1 + Math.sin(t * 7) * 1.2,
      wheel: truck.wheel,
      aim: truck.aim,
      lookX: ldx / ll,
      lookY: ldy / ll,
      blink: blinkAt(t, 5),
      spraying,
      light: truck.light,
      time: t,
      passengers,
      mouth: t < truck.happy ? 'open' : spraying ? 'wow' : 'smile',
    })
    drawJet(g)

    for (let i = 0; i < Math.min(stars, 10); i++) {
      const s = i === Math.min(stars, 10) - 1 ? starPop : 1
      sprite(g, '⭐', 46 + i * 48, 46 + Math.sin(t * 2 + i) * 3, 46 * s)
    }

    if (t - lastTouchAt > 5 && !spraying) {
      if (rescue.state === 'waiting' && Math.floor(t / 4) % 2 === 0) {
        const [hx, hy] = windowOf(rescue.house)
        hint(g, hx, hy, t, 64)
      } else if (look) {
        hint(g, look.x, look.y - fireR(look), t, 70)
      }
    }
  }

  const onTruck = (p: Pointer): boolean => Math.abs(p.x - truck.x) < 165 && p.y > TRUCK_Y - 150

  return {
    update,
    draw,
    down(p: Pointer) {
      const t = stage.time
      lastTouchAt = t
      if (onTruck(p)) {
        // Poke the truck: siren, lights and a hop.
        truck.bob.kick(-380)
        truck.light = 1.6
        truck.happy = t + 1
        for (let i = 0; i < 4; i++) sfx.tone({ freq: i % 2 ? 587 : 784, dur: 0.17, type: 'square', vol: 0.09, delay: i * 0.17 })
        fx.ring(truck.x + 108, TRUCK_Y - 185, '#4db8ff', 90, 0.4)
        fx.burst(truck.x + 108, TRUCK_Y - 185, { count: 8, color: ['#4db8ff', '#ff5d5d'], speed: 260, life: 0.5, size: 9, shape: 'star' })
        return
      }
      fx.ring(p.x, p.y, '#dff4ff', 56, 0.3)
      if (rescue.state === 'waiting') {
        const [wx, wy] = windowOf(rescue.house)
        if (dist(p.x, p.y, wx, wy) < 115) startRescue()
      }
      aimId = p.id
      aimX = p.x
      aimY = p.y
      sprayUntil = t + 0.32
      sfx.whoosh()
      sfx.pop(Math.round(rnd(-2, 1)))
      truck.lean.kick(p.x > truck.x ? -0.6 : 0.6)
      truck.bob.kick(90)
      if (!spraying) {
        spraying = true
        emit(5, 0.04)
      }
    },
    move(p: Pointer) {
      if (p.id !== aimId) return
      lastTouchAt = stage.time
      aimX = p.x
      aimY = p.y
    },
    up(p: Pointer) {
      if (p.id !== aimId) return
      aimId = -1
      sprayUntil = Math.max(sprayUntil, stage.time + 0.05)
      for (const other of stage.pointers.values()) {
        if (other.id !== p.id && other.down && !onTruck(other)) {
          aimId = other.id
          aimX = other.x
          aimY = other.y
        }
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'fire-truck-hero',
    name: 'Fire Truck Hero',
    emoji: '🚒',
    ages: [3, 6],
    pitch: 'Hold anywhere and the fire truck sprays a big arc of water there; put out silly fires and soak the whole street.',
    howTo: 'Touch and hold to spray; drag to sweep. Spray the waver in the window for a ladder rescue. Try the dog, cat, sun, clouds and flowers.',
    basedOn: 'PAW Patrol Rescue World, DUPLO rescue, PowerWash',
    whyFun: 'The water jet is the toy: a thick arc with splashes and hiss that answers every touch, and everything it lands on reacts.',
  },
  create,
}
