// Farm Morning: the morning round of a small farmyard. Open the henhouse,
// scatter grain, gather the eggs, pump and carry water for the pony, brush
// its dusty coat, fork hay to the goat. Any order, no hurry. When every
// animal is cared for the day stands in full light and stays. Sliding the
// henhouse door shut again sends the hens to roost, night passes, and a new
// morning waits behind the same door.

import { TAU, clamp, damp, dist, ease, inRect, lerp, remap, rnd, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { HEN_LOOKS, PONY_DUST, drawGoat, drawHen, drawPony, henReach, paintDust, ponyBodyPath, ponyMuzzle } from './animals.ts'
import type { HenLook } from './animals.ts'
import {
  C,
  DOOR,
  HAY,
  L,
  PILE,
  RACK,
  bucketLip,
  css,
  drawBrush,
  drawBucket,
  drawCloud,
  drawEgg,
  drawFork,
  drawGlint,
  drawScoop,
  drawSky,
  drawStar,
  drawSun,
  makeLayer,
  paintBackdrop,
  paintDoor,
  paintDot,
  paintHay,
  paintPaper,
  paintPile,
  paintRackFront,
  seeded,
  shade,
  yardTop,
} from './art.ts'
import type { RGB } from './art.ts'
import { makeSounds } from './sound.ts'

type Phase = 'day' | 'dusk' | 'night' | 'dawn'
type GrabKind = 'door' | 'lid' | 'egg' | 'scoop' | 'pump' | 'bucket' | 'brush' | 'fork'
type Invite = GrabKind | 'none'

interface Grab {
  kind: GrabKind
  index: number
  // Distance the finger has travelled, to tell a tap from a drag.
  moved: number
  at: number
  off: number
}

type HenState = 'inside' | 'exit' | 'idle' | 'walk' | 'peck' | 'preen' | 'bath' | 'enter'

interface Grain {
  x: number
  y: number
  fallY: number
  vy: number
  landed: boolean
  taken: boolean
  rot: number
}

interface Hen {
  kind: number
  look: HenLook
  x: number
  y: number
  dir: number
  state: HenState
  t: number
  dur: number
  tx: number
  ty: number
  // 0 at the pop-hole, 1 at the foot of the ramp.
  k: number
  wait: number
  walk: number
  stride: number
  peck: number
  pecked: boolean
  scratch: number
  target: Grain | null
  homing: boolean
  eaten: number
  hop: Spring
  puff: Spring
  flap: number
  sit: number
  preen: number
  tilt: number
  tiltTo: number
  speed: number
  peckDur: number
  seed: number
}

interface Egg {
  x: number
  y: number
  slot: number
  tint: RGB
  state: 'nest' | 'held' | 'glide' | 'basket'
  wobble: Spring
}

// A hand tool that lives somewhere, follows the finger, and drifts home.
interface Tool {
  x: number
  y: number
  tx: number
  ty: number
  homeX: number
  homeY: number
  state: 'home' | 'held' | 'loose' | 'back'
  letGo: number
  rot: number
}

interface Puddle {
  x: number
  y: number
  r: number
  a: number
}

const PUMP_UP = -0.5
const PUMP_DOWN = 0.45
const PUMP_REST = -0.36
const EGG_TINTS: readonly RGB[] = [[244, 230, 206], [208, 164, 124], [206, 224, 216]]
const FORK_REST = Math.PI + 0.25
const FORK_CARRY = TAU - 0.28
const DUST_CELL = 18
const PILE_FULL = 4
// Seconds of stillness before the yard offers anything.
const IDLE = 9

function create(stage: Stage): Game {
  const { fx } = stage
  const snd = makeSounds(stage.sfx, () => stage.time)
  const res = clamp(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 1, 2)

  // ---- painted layers ----------------------------------------------------
  const backdrop = makeLayer(W, H, res, paintBackdrop)
  const paper = makeLayer(W, H, res, paintPaper)
  const doorSprite = makeLayer(DOOR.w, DOOR.h, res, paintDoor)
  const haySprite = makeLayer(HAY.w, HAY.h, res, paintHay)
  const pileSprite = makeLayer(PILE.w, PILE.h, res, paintPile)
  const rackSprite = makeLayer(RACK.w, RACK.h, res, paintRackFront)
  const dot = makeLayer(64, 64, 1, (g) => paintDot(g, 64))
  let dustSeed = 3
  const dust = makeLayer(PONY_DUST.w, PONY_DUST.h, res, (g) => paintDust(g, dustSeed))
  const dustCtx = dust.getContext('2d')

  // Which cells of the dust layer lie on the pony, for knowing when it is clean.
  const cols = Math.ceil(PONY_DUST.w / DUST_CELL)
  const rows = Math.ceil(PONY_DUST.h / DUST_CELL)
  const onBody: boolean[] = []
  const rubbed: boolean[] = []
  let bodyCells = 0
  let rubbedCells = 0
  {
    const probe = document.createElement('canvas').getContext('2d')
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        let inside = false
        const lx = PONY_DUST.x + (i + 0.5) * DUST_CELL
        const ly = PONY_DUST.y + (j + 0.5) * DUST_CELL
        if (probe) {
          ponyBodyPath(probe)
          inside = probe.isPointInPath(lx, ly)
        }
        // The shoulder under the neck and mane cannot be seen, so it does not count.
        if (lx < -56 && ly < -150) inside = false
        onBody.push(inside)
        rubbed.push(false)
        if (inside) bodyCells++
      }
    }
  }

  // ---- the world ---------------------------------------------------------
  let phase: Phase = 'day'
  let phaseT = 0
  let nightK = 0
  let light = 0
  let resetDone = false
  let lullabyDue = false
  let lastTouch = 0
  let doneAt = -1
  let ambient = 4

  const grabs = new Map<number, Grab>()

  const door = { open: 0, target: 0, start: 0, wasOpen: false, shut: true, rattle: spring(0, 320, 10), nextRattle: 3.5 }
  const lid = { open: 0, target: 0, start: 0, bounce: spring(0, 260, 12) }
  const eggs: Egg[] = L.nest.eggs.map((x, i) => ({ x, y: L.nest.eggY, slot: i, tint: EGG_TINTS[i], state: 'nest', wobble: spring(0, 200, 8) }))
  const grains: Grain[] = []
  const bin = { grain: 110 }
  const hens: Hen[] = HEN_LOOKS.map((look, i) => ({
    kind: i,
    look,
    x: L.hen.x,
    y: L.hen.floor,
    dir: 1,
    state: 'inside',
    t: 0,
    dur: 1,
    tx: 0,
    ty: 0,
    k: 0,
    wait: 0.25 + i * 1.05,
    walk: i * 2,
    stride: 0,
    peck: 0,
    pecked: false,
    scratch: 0,
    target: null,
    homing: false,
    eaten: 0,
    hop: spring(0, 170, 13),
    puff: spring(1, 160, 9),
    flap: 0,
    sit: 0,
    preen: 0,
    tilt: 0,
    tiltTo: 0,
    speed: [72, 46, 88][i],
    peckDur: [0.36, 0.62, 0.32][i],
    seed: i * 2.3 + 0.7,
  }))
  let totalEaten = 0

  const tool = (x: number, y: number, rot: number): Tool => ({ x, y, tx: x, ty: y, homeX: x, homeY: y, state: 'home', letGo: 0, rot })
  const scoop = { ...tool(L.bin.x + 16, L.bin.top - 20, -0.95), grain: 0, carry: 0 }
  const brush = { ...tool(L.hook.x, L.hook.y, 0), sway: spring(0, 60, 4), stroke: 0 }
  const fork = { ...tool(L.pile.x + 34, L.pile.y - 120, FORK_REST), lift: 0, load: false, wisp: 0 }
  const pile = { count: PILE_FULL, pop: spring(1, 200, 12) }
  const rack = { count: 0, pop: spring(1, 220, 11) }

  const pump = { angle: PUMP_REST, prime: 0, flow: 0, auto: 0, drip: 0, dir: 0 }
  const bucket = {
    x: L.bucketHome.x,
    y: L.bucketHome.y,
    tx: L.bucketHome.x,
    ty: L.bucketHome.y,
    fill: 0,
    state: 'pump' as 'pump' | 'held' | 'down',
    held: 0,
    tilt: 0,
    swing: spring(0, 70, 5),
    squash: spring(0, 240, 14),
    pouring: 0,
  }
  const trough = { level: 0, ripple: 0 }
  const puddles: Puddle[] = []

  const pony = {
    headDown: 0,
    drunk: 0,
    watered: false,
    brushed: false,
    dustAlpha: 1,
    shine: 0,
    content: 0,
    brushAt: -10,
    brushX: L.pony.x,
    brushY: L.pony.y - 170,
    leanX: spring(0, 90, 11),
    leanY: spring(0, 90, 11),
    ear: spring(0, 120, 7),
    tail: spring(0, 30, 3.2),
    gulp: 0,
    wet: 0,
    drip: 0,
    sniff: 0,
    nextSniff: 5,
    nod: spring(0, 120, 9),
  }
  const goat = {
    reach: 0,
    chew: 0,
    chewing: 0,
    cycle: 0,
    fed: false,
    tail: spring(0, 160, 6),
    ear: spring(0, 140, 8),
    stretch: spring(1, 220, 10),
    sniff: 0,
    nextSniff: 7,
    wisp: 0,
  }

  const sunPulse = spring(0, 60, 6)
  const clouds = [
    { x: 380, y: 96, size: 1.1, v: 3.2 },
    { x: 720, y: 150, size: 0.8, v: 2.2 },
    { x: 560, y: 52, size: 0.6, v: 4 },
  ]
  const starRand = seeded(99)
  const stars = Array.from({ length: 38 }, () => ({ x: 286 + starRand() * 510, y: 14 + starRand() * 226, r: 2.4 + starRand() * 3.6, ph: starRand() * TAU }))
  const flies = Array.from({ length: 9 }, (_, i) => ({ x: 220 + starRand() * 760, y: 470 + starRand() * 260, ph: i * 1.9 }))
  const leaves = [
    { x: 36, y: 96, rx: 30, ry: 18, ph: 0 },
    { x: 96, y: 60, rx: 34, ry: 16, ph: 1.4 },
    { x: 20, y: 168, rx: 26, ry: 15, ph: 2.6 },
    { x: 120, y: 118, rx: 24, ry: 14, ph: 3.5 },
    { x: -4, y: 60, rx: 26, ry: 16, ph: 4.4 },
  ]
  const bird = { x: 1300, y: -40, k: 0, here: false, hop: spring(0, 200, 10) }
  const butterflies = [
    { cx: 420, cy: 620, ph: 0.3 },
    { cx: 650, cy: 590, ph: 2.1 },
  ]

  // ---- helpers -----------------------------------------------------------
  const playable = (): boolean => phase === 'day' || phase === 'dawn' || (phase === 'night' && resetDone)
  const eggsIn = (): number => eggs.reduce((n, e) => n + (e.state === 'basket' ? 1 : 0), 0)
  const hensFed = (): boolean => totalEaten >= 15
  const cares = (): number => (hensFed() ? 1 : 0) + (eggsIn() === 3 ? 1 : 0) + (pony.watered ? 1 : 0) + (pony.brushed ? 1 : 0) + (goat.fed ? 1 : 0)
  const skyS = (): number => light * (1 - nightK) - nightK
  const handleEnd = (): [number, number] => [L.pump.pivotX - Math.cos(pump.angle) * L.pump.handle, L.pump.pivotY + Math.sin(pump.angle) * L.pump.handle]
  const forkTip = (reach = 95): [number, number] => [fork.x + Math.sin(fork.rot) * reach, fork.y - Math.cos(fork.rot) * reach]
  const scoopTip = (): [number, number] => [scoop.x - 40 * Math.cos(scoop.rot) - 6 * Math.sin(scoop.rot), scoop.y - 40 * Math.sin(scoop.rot) + 6 * Math.cos(scoop.rot)]
  const held = (kind: GrabKind): boolean => {
    for (const grab of grabs.values()) if (grab.kind === kind) return true
    return false
  }
  const dustPuff = (x: number, y: number, count = 4): void => {
    fx.burst(x, y, { count, color: ['#e6d6b4', '#d2be98', '#f2e8d0'], speed: 46, life: 0.7, size: 7, gravity: -26, angle: -Math.PI / 2, spread: Math.PI * 1.2, drag: 0.94 })
  }
  const drops = (x: number, y: number, count = 3, speed = 110): void => {
    fx.burst(x, y, { count, color: ['#cfe8ee', '#9ccadb', '#ffffff'], speed, life: 0.45, size: 5, gravity: 700, angle: -Math.PI / 2, spread: Math.PI * 0.9 })
  }
  const wetGround = (x: number, y: number, amount: number): void => {
    const near = puddles.find((p) => dist(p.x, p.y, x, y) < 40)
    if (near) {
      near.r = Math.min(64, near.r + amount * 30)
      near.a = Math.min(1, near.a + amount * 2)
    } else if (puddles.length < 6) {
      puddles.push({ x, y, r: 16 + amount * 30, a: Math.min(1, 0.4 + amount * 2) })
    }
  }

  // ---- hens --------------------------------------------------------------
  const goWalk = (h: Hen, x: number, y: number): void => {
    h.tx = clamp(x, L.yard.l, L.yard.r)
    h.ty = clamp(y, yardTop(h.tx), L.yard.b)
    h.state = 'walk'
    h.t = 0
  }
  const goIdle = (h: Hen, min: number, max: number): void => {
    h.state = 'idle'
    h.t = 0
    h.dur = rnd(min, max)
    h.tiltTo = rnd(-0.35, 0.35)
  }
  const goHome = (h: Hen): void => {
    h.target = null
    h.homing = true
    h.tx = L.hen.x + rnd(-6, 6)
    h.ty = L.hen.rampBottom + 10
    h.state = 'walk'
    h.t = 0
  }
  const nearestGrain = (h: Hen): Grain | null => {
    let best: Grain | null = null
    let bestD = 1e9
    for (const grain of grains) {
      if (!grain.landed || grain.taken) continue
      let d = dist(h.x, h.y, grain.x, grain.y)
      // Rather a grain of her own than one under another hen's beak.
      for (const other of hens) if (other !== h && other.state !== 'inside' && dist(other.x, other.y, grain.x, grain.y) < 70) d += 160
      if (d < bestD) {
        bestD = d
        best = grain
      }
    }
    return best
  }
  const seek = (h: Hen, grain: Grain): void => {
    grain.taken = true
    h.target = grain
    const side = h.x <= grain.x ? 1 : -1
    const reach = henReach(h.look)
    let sx = grain.x - side * reach
    if (sx < L.yard.l - 20 || sx > L.yard.r + 30) sx = grain.x + side * reach
    h.tx = sx
    h.ty = grain.y
    h.state = 'walk'
    h.t = 0
  }
  const chooseNext = (h: Hen): void => {
    if (phase === 'dusk') {
      goHome(h)
      return
    }
    const grain = nearestGrain(h)
    if (grain) {
      seek(h, grain)
      return
    }
    const content = h.eaten >= 5 || doneAt >= 0
    const roll = Math.random()
    if (content && roll < 0.3) {
      h.state = 'preen'
      h.t = 0
      h.dur = rnd(2.2, 3.6)
    } else if (content && roll < 0.55) {
      h.state = 'bath'
      h.t = 0
      h.dur = rnd(6, 10)
    } else if (roll < 0.8) {
      goWalk(h, h.x + rnd(-170, 170), h.y + rnd(-70, 70))
    } else {
      goIdle(h, 0.8, 2.2)
    }
  }
  const updateHen = (h: Hen, dt: number): void => {
    h.hop.update(dt)
    h.puff.update(dt)
    h.flap = Math.max(0, h.flap - dt * 2.2)
    h.t += dt
    let stride = 0
    let sit = 0
    let preen = 0
    if (h.state === 'inside') {
      if ((phase === 'day' || phase === 'dawn') && door.open > 0.6) {
        h.wait -= dt
        if (h.wait <= 0) {
          h.state = 'exit'
          h.k = 0
          h.t = 0
          h.homing = false
          snd.cluck(1 + h.kind * 0.12, 0.9)
        }
      }
    } else if (h.state === 'exit') {
      h.k = Math.min(1, h.k + dt / 1.5)
      h.walk += dt * 13
      stride = 1
      h.dir = 1
      h.x = L.hen.x + Math.sin(h.k * 8 + h.seed) * 4
      h.y = lerp(L.hen.floor - 2, L.hen.rampBottom + 8, h.k)
      if (phase === 'dusk') h.state = 'enter'
      else if (h.k >= 1) {
        h.hop.kick(70)
        h.flap = 0.6
        goWalk(h, rnd(240, 430), rnd(552, 660))
      }
    } else if (h.state === 'enter') {
      h.k = Math.max(0, h.k - dt / 1.4)
      h.walk += dt * 13
      stride = 1
      h.x = L.hen.x + Math.sin(h.k * 8 + h.seed) * 4
      h.y = lerp(L.hen.floor - 2, L.hen.rampBottom + 8, h.k)
      if (h.k <= 0) {
        h.state = 'inside'
        h.wait = 0.25 + h.kind * 1.05
        snd.cluck(0.86 + h.kind * 0.1, 0.6)
      }
    } else if (h.state === 'idle') {
      h.tilt = damp(h.tilt, h.tiltTo, 6, dt)
      if (h.t > h.dur) chooseNext(h)
    } else if (h.state === 'walk') {
      if (phase === 'dusk' && !h.homing) goHome(h)
      const d = dist(h.x, h.y, h.tx, h.ty)
      // The speckled hen goes in quick stop-start runs.
      const moving = !(h.kind === 2 && h.t % 0.8 > 0.54)
      if (d < 3) {
        h.tilt = 0
        if (h.homing) {
          h.state = 'enter'
          h.k = 1
          h.dir = -1
        } else if (h.target && grains.includes(h.target)) {
          h.dir = h.target.x >= h.x ? 1 : -1
          h.state = 'peck'
          h.peck = 0
          h.pecked = false
          h.scratch = h.kind === 2 ? 0.45 : 0
          h.t = 0
        } else {
          h.target = null
          goIdle(h, 0.4, 1.4)
        }
      } else if (moving) {
        const step = Math.min(d, h.speed * dt)
        h.x += ((h.tx - h.x) / d) * step
        h.y += ((h.ty - h.y) / d) * step
        if (Math.abs(h.tx - h.x) > 3) h.dir = h.tx > h.x ? 1 : -1
        h.walk += dt * (7 + h.speed * 0.09)
        stride = 1
      }
    } else if (h.state === 'peck') {
      if (h.scratch > 0) {
        // Scratch the ground first, the way hens do.
        h.scratch -= dt
        h.walk += dt * 20
        stride = 0.9
        if (h.scratch <= 0) dustPuff(h.x - h.dir * 14, h.y - 2, 2)
      } else {
        h.peck += dt / h.peckDur
        if (h.peck >= 0.5 && !h.pecked) {
          h.pecked = true
          const at = h.target ? grains.indexOf(h.target) : -1
          if (at >= 0) {
            grains.splice(at, 1)
            h.eaten++
            totalEaten++
            snd.peck()
            if (h.eaten % 4 === 0) {
              // A fluff and a soft purr: a hen that is glad of her breakfast.
              h.puff.value = 1.14
              snd.purr(1 + h.kind * 0.1)
            }
          }
          h.target = null
        }
        if (h.peck >= 1) {
          h.peck = 0
          if (h.kind === 1) goIdle(h, 0.7, 1.4)
          else if (h.kind === 0) goIdle(h, 0.12, 0.4)
          else goIdle(h, 0.25, 0.6)
        }
      }
    } else if (h.state === 'preen') {
      preen = 1
      if (h.t > h.dur || phase === 'dusk') {
        h.puff.value = 1.1
        goIdle(h, 0.4, 1)
      }
    } else if (h.state === 'bath') {
      sit = 1
      if (h.sit > 0.8 && Math.random() < dt * 0.45) {
        h.puff.value = 1.12
        dustPuff(h.x - h.dir * 8, h.y - 6, 3)
      }
      if (h.t > h.dur || phase === 'dusk' || nearestGrain(h)) goIdle(h, 0.3, 0.8)
    }
    if (h.state === 'idle' || h.state === 'preen' || (h.state === 'walk' && !h.homing)) {
      // Hens give each other a little room.
      for (const other of hens) {
        if (other === h || other.state === 'inside' || other.state === 'exit' || other.state === 'enter') continue
        const dx = h.x - other.x
        const dy = (h.y - other.y) * 2
        const d = Math.hypot(dx, dy)
        if (d < 78) {
          const push = ((78 - d) / 78) * 110 * dt
          const ax = d > 0.5 ? dx / d : h.kind > other.kind ? 1 : -1
          h.x = clamp(h.x + ax * push, L.yard.l, L.yard.r)
          h.y = clamp(h.y + (d > 0.5 ? dy / d : 0) * push * 0.4, yardTop(h.x), L.yard.b)
          if (h.state === 'idle') {
            h.walk += dt * 10
            stride = Math.max(stride, 0.7)
          }
        }
      }
    }
    h.stride = damp(h.stride, stride, 12, dt)
    h.sit = damp(h.sit, sit, 4, dt)
    h.preen = damp(h.preen, preen, 6, dt)
  }

  // ---- water -------------------------------------------------------------
  const pumpWater = (d: number): void => {
    pump.prime += d
    if (pump.prime < 1.05) {
      // The first stroke only brings the water up: a gurgle and a few drips.
      snd.gurgle()
      pump.drip = Math.min(1, pump.drip + d * 0.8)
      return
    }
    pump.flow = Math.min(1, pump.flow + d * 3.2)
    const add = d * 0.3
    if (bucket.state === 'pump') {
      bucket.fill += add
      bucket.squash.kick(-0.25)
      if (bucket.fill > 1) {
        // Too full: it runs over the rim and onto the ground. No trouble.
        const over = bucket.fill - 1
        bucket.fill = 1
        wetGround(bucket.x + 30, bucket.y + 6, over)
        if (Math.random() < 0.5) drops(bucket.x + rnd(-36, 36), bucket.y - 76, 2, 70)
        snd.splash()
      } else {
        snd.gush(bucket.fill)
        if (Math.random() < 0.4) drops(L.pump.spoutX, bucket.y - 72, 1, 80)
      }
    } else {
      wetGround(L.pump.spoutX + 2, L.pump.base + 6, add)
      snd.splash()
      if (Math.random() < 0.5) drops(L.pump.spoutX, L.pump.base, 2, 90)
    }
  }

  const updateWater = (dt: number): void => {
    // Pump handle: follows the finger; a tap gives one stroke on its own.
    if (pump.auto > 0) {
      const before = pump.angle
      pump.auto = Math.max(0, pump.auto - dt)
      pump.angle = lerp(PUMP_REST, 0.34, Math.sin((1 - pump.auto / 0.6) * Math.PI))
      if (pump.angle > before) pumpWater(pump.angle - before)
    } else if (!held('pump')) {
      pump.angle = damp(pump.angle, PUMP_REST, 4, dt)
    }
    pump.flow = Math.max(0, pump.flow - dt * 2.4)
    if (pump.drip > 0) {
      pump.drip = Math.max(0, pump.drip - dt * 1.2)
      if (Math.random() < dt * 9) drops(L.pump.spoutX, L.pump.spoutY + 4, 1, 20)
    }

    // Bucket.
    bucket.swing.update(dt)
    bucket.squash.update(dt)
    bucket.held = damp(bucket.held, bucket.state === 'held' ? 1 : 0, 12, dt)
    let tiltTo = 0
    if (bucket.state === 'held') {
      const T = L.trough
      // Carried toward the trough it stops at the near end, above the rim,
      // and the further it is brought over, the further it tips: the hand pours.
      const stop = T.l + 4
      const high = bucket.ty < T.bottom + 50
      let tx = bucket.tx
      let ty = bucket.ty
      if (high && tx > T.l - 70 && tx < T.r + 70) {
        tx = Math.min(tx, stop)
        ty = Math.min(ty, T.back - 6)
      }
      bucket.x = damp(bucket.x, tx, 26, dt)
      bucket.y = damp(bucket.y, ty, 26, dt)
      if (high && bucket.y < T.front) tiltTo = remap(bucket.x, T.l - 62, T.l, 0, 1.45)
    } else {
      bucket.x = damp(bucket.x, bucket.tx, 10, dt)
      bucket.y = damp(bucket.y, bucket.ty, 10, dt)
    }
    bucket.tilt = damp(bucket.tilt, tiltTo, 7, dt)
    bucket.pouring = 0
    if (bucket.state === 'held' && bucket.fill > 0) {
      const brim = lerp(1.3, 0.3, bucket.fill)
      const rate = Math.max(0, bucket.tilt - brim) * 0.62
      if (rate > 0.004) {
        const out = Math.min(bucket.fill, rate * dt)
        bucket.fill -= out
        bucket.pouring = clamp(rate * 2.4, 0.25, 1)
        const room = 1 - trough.level
        trough.level += Math.min(room, out)
        if (out > room) wetGround(L.trough.r - 20, L.trough.bottom + 10, out - room)
        trough.ripple = 1
        snd.pour(trough.level)
        const lip = bucketLip(bucket.x, bucket.y, bucket.tilt)
        if (Math.random() < dt * 14) drops(lip[0] + 9, L.trough.front - 6, 1, 90)
        if (bucket.fill <= 0.001) bucket.fill = 0
      }
    }
    trough.ripple = Math.max(0, trough.ripple - dt * 0.8)
    for (let i = puddles.length - 1; i >= 0; i--) {
      puddles[i].a -= dt * 0.07
      if (puddles[i].a <= 0) puddles.splice(i, 1)
    }
  }

  // ---- pony --------------------------------------------------------------
  const rub = (wx: number, wy: number): boolean => {
    const lx = wx - L.pony.x - pony.leanX.value
    const ly = wy - L.pony.y - pony.leanY.value
    const px = lx - PONY_DUST.x
    const py = ly - PONY_DUST.y
    if (px < -20 || py < -20 || px > PONY_DUST.w + 20 || py > PONY_DUST.h + 20) return false
    const ci = Math.floor(px / DUST_CELL)
    const cj = Math.floor(py / DUST_CELL)
    let touching = false
    let fresh = false
    for (let j = cj - 2; j <= cj + 2; j++) {
      for (let i = ci - 2; i <= ci + 2; i++) {
        if (i < 0 || j < 0 || i >= cols || j >= rows) continue
        const at = j * cols + i
        if (!onBody[at]) continue
        const cx = (i + 0.5) * DUST_CELL
        const cy = (j + 0.5) * DUST_CELL
        const d = dist(px, py, cx, cy)
        if (d < 26) touching = true
        if (d < 34 && !rubbed[at]) {
          rubbed[at] = true
          rubbedCells++
          fresh = true
        }
      }
    }
    if (touching && dustCtx && !pony.brushed) {
      dustCtx.globalCompositeOperation = 'destination-out'
      dustCtx.drawImage(dot, px - 38, py - 38, 76, 76)
      dustCtx.globalCompositeOperation = 'source-over'
    }
    if (!touching) return false
    pony.brushAt = stage.time
    pony.brushX = wx
    pony.brushY = wy
    if (fresh && !pony.brushed) dustPuff(wx, wy - 6, 2)
    snd.brush(!fresh)
    return true
  }

  const updatePony = (dt: number): void => {
    const open = playable()
    const thirsty = !pony.watered
    let downTo = 0
    if (open && thirsty && trough.level > 0.03) downTo = 1
    else if (open && thirsty && pony.sniff > 0) downTo = 0.6
    if (thirsty && trough.level <= 0.03 && open) {
      // Now and then it noses the empty trough. Waiting, not asking.
      pony.sniff -= dt
      if (pony.sniff < -pony.nextSniff) {
        pony.sniff = 1.5
        pony.nextSniff = rnd(6, 10)
      }
    } else pony.sniff = 0
    pony.headDown = damp(pony.headDown, downTo, downTo > pony.headDown ? 2.6 : 1.7, dt)
    if (downTo === 1 && pony.headDown > 0.93) {
      const sip = Math.min(trough.level, 0.072 * dt)
      trough.level -= sip
      pony.drunk += sip
      pony.gulp -= dt
      if (pony.gulp <= 0) {
        pony.gulp = 0.64
        snd.gulp()
        trough.ripple = Math.max(trough.ripple, 0.7)
        pony.ear.kick(-1.2)
      }
      if (pony.drunk >= 0.45) {
        pony.watered = true
        pony.wet = 3
        pony.tail.kick(2.2)
        stage.after(1.3, () => snd.sigh())
      }
    }
    if (pony.wet > 0) {
      pony.wet -= dt
      pony.drip -= dt
      if (pony.drip <= 0 && pony.headDown < 0.85) {
        pony.drip = 0.3
        const m = ponyMuzzle({ x: L.pony.x, y: L.pony.y, headDown: pony.headDown })
        fx.burst(m[0], m[1] + 4, { count: 1, color: '#bfe0ea', speed: 16, life: 0.7, size: 6, gravity: 620, angle: Math.PI / 2, spread: 0.5 })
      }
    }
    const brushing = stage.time - pony.brushAt < 0.55
    pony.content = damp(pony.content, brushing ? 1 : 0, brushing ? 5 : 1.6, dt)
    pony.leanX.target = brushing ? clamp((pony.brushX - L.pony.x) / 120, -1, 1) * 5 : 0
    pony.leanY.target = brushing ? 3 : 0
    pony.leanX.update(dt)
    pony.leanY.update(dt)
    pony.ear.update(dt)
    pony.tail.update(dt)
    pony.nod.update(dt)
    if (!pony.brushed && bodyCells > 0 && rubbedCells / bodyCells >= 0.82) {
      // Clean. The last of the dust lifts and the coat shines.
      pony.brushed = true
      stage.tween(1.4, (t) => (pony.dustAlpha = 1 - t), ease.outQuad)
      stage.tween(2.4, (t) => (pony.shine = t), ease.inOutQuad)
      pony.tail.kick(3)
      dustPuff(L.pony.x - 20, L.pony.y - 210, 5)
      dustPuff(L.pony.x + 70, L.pony.y - 200, 5)
      stage.after(0.8, () => snd.sigh())
    }
  }

  // ---- goat --------------------------------------------------------------
  const updateGoat = (dt: number): void => {
    const eating = rack.count > 0 && phase !== 'night'
    let reachTo = 0
    let chewTo = 0
    if (eating) {
      goat.cycle += dt
      const c = goat.cycle % 3.6
      if (c < 0.9) {
        reachTo = 1
        goat.wisp = damp(goat.wisp, 1, 6, dt)
      } else {
        reachTo = 0.45
        chewTo = 1
        goat.wisp = Math.max(0, goat.wisp - dt * 0.4)
      }
      if (c < dt * 1.5 && goat.cycle > 1) goat.tail.kick(5)
    } else {
      goat.wisp = Math.max(0, goat.wisp - dt)
      if (playable()) {
        goat.sniff -= dt
        if (goat.sniff < -goat.nextSniff) {
          goat.sniff = 1.4
          goat.nextSniff = rnd(7, 11)
          goat.ear.kick(2)
        }
        if (goat.sniff > 0) reachTo = 0.8
      }
    }
    goat.reach = damp(goat.reach, reachTo, 3.5, dt)
    goat.chewing = damp(goat.chewing, chewTo, 5, dt)
    goat.chew += dt * 7.5
    goat.tail.update(dt)
    goat.ear.update(dt)
    goat.stretch.update(dt)
    goat.fed = rack.count >= 3
  }

  // ---- tools -------------------------------------------------------------
  const updateTool = (t: Tool, dt: number, isHeld: boolean): void => {
    if (t.state === 'held' && !isHeld) {
      t.state = 'loose'
      t.letGo = stage.time
    }
    if (t.state === 'held') {
      t.x = damp(t.x, t.tx, 30, dt)
      t.y = damp(t.y, t.ty, 30, dt)
    } else if (t.state === 'loose') {
      // It waits a moment where it was left, in case the finger comes back.
      if (stage.time - t.letGo > 1.1) t.state = 'back'
    } else if (t.state === 'back') {
      t.x = damp(t.x, t.homeX, 5.5, dt)
      t.y = damp(t.y, t.homeY, 5.5, dt)
      if (dist(t.x, t.y, t.homeX, t.homeY) < 2.5) {
        t.x = t.homeX
        t.y = t.homeY
        t.state = 'home'
      }
    }
  }

  const dropGrain = (): void => {
    const tip = scoopTip()
    if (tip[0] < L.yard.l - 40 || tip[0] > L.yard.r + 50) return
    if (dist(tip[0], tip[1], L.bin.x, L.bin.top) < 86) return
    const x = clamp(tip[0] + rnd(-24, 24), L.yard.l, L.yard.r)
    const y = clamp(tip[1] + 34 + rnd(0, 44), yardTop(x), L.yard.b)
    grains.push({ x, y, fallY: tip[1] + rnd(-4, 4), vy: rnd(-40, 60), landed: false, taken: false, rot: rnd(0, 3) })
    scoop.grain--
  }

  const updateTools = (dt: number): void => {
    // Scoop.
    const scoopHeld = held('scoop')
    updateTool(scoop, dt, scoopHeld)
    const pouring = scoop.state === 'held' && scoop.grain > 0 && scoop.carry > 2
    scoop.rot = damp(scoop.rot, scoop.state === 'home' ? -0.95 : pouring ? -0.5 : -0.12, 9, dt)
    if (scoop.state === 'home' && scoop.grain > 0) {
      bin.grain += scoop.grain
      scoop.grain = 0
    }
    // Brush.
    updateTool(brush, dt, held('brush'))
    brush.sway.update(dt)
    brush.stroke = Math.max(0, brush.stroke - dt * 3)
    // Fork.
    updateTool(fork, dt, held('fork'))
    const up = fork.state === 'held' || fork.state === 'loose'
    fork.lift = damp(fork.lift, up ? 1 : 0, up ? 9 : 5, dt)
    fork.rot = lerp(FORK_REST, FORK_CARRY, ease.inOutQuad(clamp(fork.lift, 0, 1)))
    if (fork.state === 'home' && fork.load) {
      fork.load = false
      pile.count = Math.min(PILE_FULL, pile.count + 1)
      pile.pop.value = 0.94
      snd.straw()
    }
    pile.pop.update(dt)
    rack.pop.update(dt)

    // Grain in the air.
    for (const grain of grains) {
      if (grain.landed) continue
      grain.vy += 1500 * dt
      grain.fallY += grain.vy * dt
      if (grain.fallY >= grain.y) {
        grain.fallY = grain.y
        grain.landed = true
        snd.grain()
      }
    }
    // Eggs.
    for (const egg of eggs) egg.wobble.update(dt)
    // Door and lid.
    door.rattle.update(dt)
    lid.bounce.update(dt)
    if (!held('door')) {
      const before = door.open
      door.open = damp(door.open, door.target, 9, dt)
      if (Math.abs(door.open - door.target) < 0.004) door.open = door.target
      if (door.target === 0 && before > 0.02 && door.open <= 0.02 && !door.shut) {
        door.shut = true
        snd.knock(0.9)
        door.rattle.kick(60)
      }
    }
    if (door.open > 0.1) door.shut = false
    if (!held('lid')) {
      const before = lid.open
      lid.open = damp(lid.open, lid.target, 10, dt)
      if (Math.abs(lid.open - lid.target) < 0.004) lid.open = lid.target
      if (lid.target === 0 && before > 0.03 && lid.open <= 0.03) snd.knock(0.6)
    }
  }

  // ---- the turning of the day -------------------------------------------
  const startDusk = (): void => {
    if (phase !== 'day' && phase !== 'dawn') return
    phase = 'dusk'
    phaseT = 0
    lullabyDue = true
    resetDone = false
    grabs.clear()
    door.target = 0.44
    for (const h of hens) {
      if (h.state === 'exit') h.state = 'enter'
      else if (h.state !== 'inside' && h.state !== 'enter') stage.after(0.3 + h.kind * 0.7, () => phase === 'dusk' && goHome(h))
    }
    for (const egg of eggs) {
      if (egg.state !== 'held') continue
      egg.state = 'nest'
      egg.x = L.nest.eggs[eggs.indexOf(egg)]
      egg.y = L.nest.eggY
    }
    if (bucket.state === 'held') setDown()
  }

  const resetWorld = (): void => {
    door.wasOpen = false
    lid.target = 0
    lid.open = 0
    eggs.forEach((egg, i) => {
      egg.state = 'nest'
      egg.slot = i
      egg.x = L.nest.eggs[i]
      egg.y = L.nest.eggY
      egg.tint = EGG_TINTS[(i + dustSeed) % 3]
    })
    grains.length = 0
    bin.grain = 110
    totalEaten = 0
    for (const h of hens) {
      h.eaten = 0
      h.state = 'inside'
      h.wait = 0.25 + h.kind * 1.05
      h.target = null
      h.homing = false
      h.sit = 0
    }
    for (const t of [scoop, brush, fork]) {
      t.state = 'home'
      t.x = t.homeX
      t.y = t.homeY
    }
    scoop.grain = 0
    fork.load = false
    fork.lift = 0
    pile.count = PILE_FULL
    rack.count = 0
    pump.prime = 0
    pump.flow = 0
    bucket.state = 'pump'
    bucket.x = bucket.tx = L.bucketHome.x
    bucket.y = bucket.ty = L.bucketHome.y
    bucket.fill = 0
    trough.level = 0
    puddles.length = 0
    pony.drunk = 0
    pony.watered = false
    pony.brushed = false
    pony.shine = 0
    pony.dustAlpha = 1
    pony.wet = 0
    goat.fed = false
    goat.cycle = 0
    goat.wisp = 0
    rubbed.fill(false)
    rubbedCells = 0
    dustSeed++
    if (dustCtx) {
      dustCtx.setTransform(res, 0, 0, res, 0, 0)
      dustCtx.globalCompositeOperation = 'source-over'
      dustCtx.clearRect(0, 0, PONY_DUST.w, PONY_DUST.h)
      paintDust(dustCtx, dustSeed)
    }
    light = 0
    doneAt = -1
    bird.here = false
    bird.k = 0
  }

  const updatePhase = (dt: number): void => {
    if (phase === 'dusk') {
      phaseT += dt
      nightK = Math.min(1, nightK + dt / 5.5)
      if (lullabyDue && phaseT > 1.6) {
        lullabyDue = false
        snd.lullaby()
      }
      const allIn = hens.every((h) => h.state === 'inside')
      if (allIn && phaseT > 2) door.target = 0
      if (nightK >= 1 && allIn && door.open <= 0.001) {
        phase = 'night'
        phaseT = 0
      }
    } else if (phase === 'night') {
      phaseT += dt
      if (!resetDone && phaseT > 0.7) {
        resetWorld()
        resetDone = true
      }
      if (phaseT > 6) {
        phase = 'dawn'
        phaseT = 0
      }
    } else if (phase === 'dawn') {
      nightK = Math.max(0, nightK - dt / 5)
      if (nightK <= 0) {
        phase = 'day'
        snd.bird()
      }
    } else {
      light = damp(light, cares() / 5, 0.6, dt)
      if (cares() === 5 && doneAt < 0) doneAt = stage.time
    }
  }

  // ---- what the scene offers when left alone -----------------------------
  const invited = (): Invite => {
    const idle = stage.time - lastTouch
    if (idle < IDLE || phase === 'dusk' || (phase === 'night' && !resetDone)) return 'none'
    const list: Invite[] = []
    if (!door.wasOpen) list.push('door')
    else {
      if (!hensFed() && bin.grain + scoop.grain > 0) list.push('scoop')
      if (eggsIn() < 3) list.push(lid.open > 0.5 ? 'egg' : 'lid')
      if (!pony.watered && trough.level < 0.1) list.push(bucket.fill > 0.5 ? 'bucket' : 'pump')
      if (!pony.brushed) list.push('brush')
      if (!goat.fed) list.push('fork')
      if (list.length === 0 && idle > 18) list.push('door')
    }
    if (list.length === 0) return 'none'
    return list[Math.floor((idle - IDLE) / 5) % list.length]
  }
  const invitePulse = (): number => {
    const idle = stage.time - lastTouch
    if (idle < IDLE) return 0
    const f = ((idle - IDLE) % 5) / 5
    return f < 0.6 ? Math.sin((f / 0.6) * Math.PI) ** 2 : 0
  }

  const setDown = (): void => {
    const T = L.trough
    bucket.state = 'down'
    // Let go by the pump or over the trough, it goes back under the spout.
    const byTrough = bucket.y < T.bottom + 56 && bucket.x > T.l - 80 && bucket.x < T.r + 60
    if (byTrough || dist(bucket.x, bucket.y, L.bucketHome.x, L.bucketHome.y) < 96) {
      bucket.state = 'pump'
      bucket.tx = L.bucketHome.x
      bucket.ty = L.bucketHome.y
    } else {
      bucket.tx = clamp(bucket.x, 440, 880)
      bucket.ty = clamp(bucket.y, bucket.tx > T.l - 50 ? 580 : 552, 612)
    }
    stage.after(0.22, () => {
      if (bucket.state !== 'held') {
        snd.knock(0.5)
        bucket.squash.kick(0.5)
      }
    })
  }

  // ---- touch -------------------------------------------------------------
  const pickGrab = (p: Pointer): { kind: GrabKind; index: number } | null => {
    let best: { kind: GrabKind; index: number } | null = null
    let bestScore = 1.0001
    const offer = (kind: GrabKind, index: number, score: number): void => {
      if (held(kind) && kind !== 'egg') return
      if (score < bestScore) {
        bestScore = score
        best = { kind, index }
      }
    }
    const N = L.nest
    if (lid.open > 0.6) {
      eggs.forEach((egg, i) => {
        if (egg.state === 'nest') offer('egg', i, dist(p.x, p.y, egg.x, egg.y - 4) / 46)
      })
      if (inRect(p.x, p.y, N.l - 4, N.back - 78, N.r - N.l + 8, 62)) offer('lid', 0, 0.5)
    } else if (inRect(p.x, p.y, N.l - 8, N.back - 12, N.r - N.l + 16, N.bottom - N.back + 18)) offer('lid', 0, 0.4)
    const D = L.hen
    if (inRect(p.x, p.y, D.holeL - 16, D.holeTop - D.doorTravel - 10, D.holeR - D.holeL + 32, D.floor - D.holeTop + D.doorTravel + 16)) offer('door', 0, 0.4)
    const end = handleEnd()
    offer('pump', 0, dist(p.x, p.y, end[0], end[1]) / 74)
    offer('pump', 0, 0.3 + dist(p.x, p.y, (end[0] + L.pump.pivotX) / 2, (end[1] + L.pump.pivotY) / 2) / 46)
    if (bucket.state !== 'held') offer('bucket', 0, dist(p.x, p.y, bucket.x, bucket.y - 44) / 66)
    if (brush.state === 'home') offer('brush', 0, dist(p.x, p.y, brush.x, brush.y) / 62)
    else offer('brush', 0, dist(p.x, p.y, brush.x, brush.y) / 70)
    if (scoop.state === 'home') {
      if (inRect(p.x, p.y, L.bin.x - 74, L.bin.top - 74, 160, L.bin.bottom - L.bin.top + 84)) offer('scoop', 0, 0.4)
    } else offer('scoop', 0, dist(p.x, p.y, scoop.x, scoop.y) / 70)
    if (fork.state === 'home') {
      if (inRect(p.x, p.y, L.pile.x - 112, L.pile.y - 200, 224, 206)) offer('fork', 0, 0.4)
    } else offer('fork', 0, dist(p.x, p.y, fork.x, fork.y) / 74)
    return best
  }

  const beginGrab = (kind: GrabKind, index: number, p: Pointer): void => {
    const grab: Grab = { kind, index, moved: 0, at: stage.time, off: 0 }
    grabs.set(p.id, grab)
    if (kind === 'door') {
      door.start = door.open
      door.rattle.kick(-30)
      snd.slide()
    } else if (kind === 'lid') {
      lid.start = lid.open
      lid.bounce.kick(-40)
    } else if (kind === 'egg') {
      const egg = eggs[index]
      egg.state = 'held'
      egg.wobble.kick(4)
      snd.eggLift()
    } else if (kind === 'scoop') {
      if (scoop.state === 'home') {
        const take = Math.min(22, bin.grain)
        bin.grain -= take
        scoop.grain = take
        if (take > 0) {
          snd.scoop()
          fx.burst(L.bin.x, L.bin.top - 4, { count: 5, color: ['#eab848', '#f4d47c', '#cf9a34'], speed: 90, life: 0.5, size: 5, gravity: 600, angle: -Math.PI / 2, spread: 1.6 })
        } else snd.knock(0.5)
      }
      scoop.state = 'held'
      scoop.tx = p.x - 8
      scoop.ty = p.y - 44
      scoop.carry = 0
    } else if (kind === 'pump') {
      grab.off = p.y - handleEnd()[1]
      pump.auto = 0
      snd.creak(false)
    } else if (kind === 'bucket') {
      bucket.state = 'held'
      bucket.tx = p.x
      bucket.ty = p.y + 112
      bucket.swing.kick(0.6)
      snd.knock(0.4)
      if (bucket.fill > 0.1) snd.plip()
    } else if (kind === 'brush') {
      brush.state = 'held'
      brush.tx = p.x
      brush.ty = p.y - 18
      snd.knock(0.35)
    } else if (kind === 'fork') {
      if (fork.state === 'home' && pile.count > 0) {
        pile.count--
        pile.pop.value = 0.92
        fork.load = true
        snd.hay()
        fx.burst(L.pile.x, L.pile.y - 70, { count: 6, color: ['#ecd486', '#c9a24c', '#f3e2a6'], speed: 110, life: 0.7, size: 6, gravity: 380, shape: 'spark', angle: -Math.PI / 2, spread: 2 })
      } else snd.straw()
      fork.state = 'held'
      fork.tx = p.x + 8
      fork.ty = p.y + 18
    }
  }

  const petHen = (h: Hen): void => {
    h.hop.kick(h.state === 'bath' ? 20 : 95)
    h.flap = 1
    h.puff.value = 1.12
    snd.cluck(1 + h.kind * 0.12)
    fx.burst(h.x, h.y - 30, { count: 2, color: css(shade(h.look.body, 0.3)), speed: 50, life: 0.8, size: 6, gravity: 90, shape: 'square', spread: TAU })
  }

  const tapWorld = (p: Pointer): void => {
    for (const h of hens) {
      if (h.state === 'inside' || h.state === 'exit' || h.state === 'enter') continue
      if (dist(p.x, p.y, h.x, h.y - 30) < 50) {
        petHen(h)
        return
      }
    }
    if (bird.here && dist(p.x, p.y, bird.x, bird.y - 8) < 46) {
      bird.hop.kick(60)
      snd.bird()
      return
    }
    const P = L.pony
    const muzzle = ponyMuzzle({ x: P.x, y: P.y, headDown: pony.headDown })
    if (inRect(p.x, p.y, P.x - 150, P.y - 262, 310, 250) || dist(p.x, p.y, muzzle[0] + 40, muzzle[1] - 40) < 80) {
      pony.ear.kick(3)
      pony.nod.kick(5)
      pony.tail.kick(1.6)
      snd.nicker()
      // The brush stirs on its peg: a dusty pony wants it.
      if (!pony.brushed && brush.state === 'home') brush.sway.kick(2.2)
      return
    }
    const Gt = L.goat
    if (inRect(p.x, p.y, Gt.x - 78, Gt.y - 180, 190, 184)) {
      goat.stretch.value = 0.9
      goat.tail.kick(7)
      goat.ear.kick(3)
      snd.bleat()
      return
    }
    if (dist(p.x, p.y, L.basket.x, L.basket.y + 14) < 66) {
      for (const egg of eggs) if (egg.state === 'basket') egg.wobble.kick(rnd(-5, 5))
      snd.straw()
      return
    }
    const T = L.trough
    if (inRect(p.x, p.y, T.l - 6, T.back - 14, T.r - T.l + 12, T.bottom - T.back + 22)) {
      if (trough.level > 0.03) {
        trough.ripple = 1
        snd.plip()
        drops(p.x, T.front - 6, 2, 80)
      } else snd.knock(0.7)
      return
    }
    const s = skyS()
    const sunY = lerp(L.sun.low, L.sun.high, clamp(light, 0, 1))
    if (s > -0.3 && dist(p.x, p.y, L.sun.x, sunY) < 74 && p.y < 330) {
      sunPulse.kick(3)
      snd.sky(-5)
      return
    }
    if (inRect(p.x, p.y, 40, 150, 230, 256)) {
      snd.knock()
      door.rattle.kick(40)
      if (hens.some((h) => h.state === 'inside')) snd.cluck(0.8, 0.5)
      return
    }
    if (inRect(p.x, p.y, 806, 60, 380, 414)) {
      snd.knock()
      brush.sway.kick(1.5)
      return
    }
    if (p.x < 216 && p.y < 250) {
      snd.rustle()
      fx.burst(p.x, p.y, { count: 2, color: ['#8cae66', '#d8b85e', '#a9c274'], speed: 36, life: 2.2, size: 11, gravity: 46, shape: 'square', drag: 0.97 })
      return
    }
    if (p.y < 392) {
      // The sky answers with one quiet note, lower to the left, higher to the right.
      snd.sky(Math.round(remap(p.x, 0, W, -5, 4)))
      fx.burst(p.x, p.y, { count: 3, color: '#fff6dc', speed: 22, life: 1.3, size: 5, gravity: -12, drag: 0.96 })
      return
    }
    // The ground: a pat, a little dust, and a hen who wonders what it was.
    snd.pat()
    dustPuff(p.x, p.y, 4)
    if (p.x > L.yard.l - 40 && p.x < L.yard.r + 40 && p.y > L.yard.t - 30) {
      let who: Hen | null = null
      let whoD = 280
      for (const h of hens) {
        if ((h.state !== 'idle' && h.state !== 'walk') || h.target || h.homing) continue
        const d = dist(h.x, h.y, p.x, p.y)
        if (d < whoD) {
          whoD = d
          who = h
        }
      }
      if (who) goWalk(who, p.x + (who.x < p.x ? -38 : 38), p.y)
    }
  }

  const nightTouch = (p: Pointer): void => {
    snd.sky(p.y < 392 ? Math.round(remap(p.x, 0, W, -8, -3)) : -9)
    fx.burst(p.x, p.y, { count: 3, color: ['#ffeeb0', '#fff8dc'], speed: 18, life: 1.4, size: 5, gravity: -10, drag: 0.95 })
  }

  return {
    update(dt) {
      updatePhase(dt)
      for (const h of hens) updateHen(h, dt)
      updateWater(dt)
      updatePony(dt)
      updateGoat(dt)
      updateTools(dt)
      sunPulse.update(dt)
      for (const cloud of clouds) {
        cloud.x += cloud.v * dt
        if (cloud.x > W + 120) cloud.x = -120
      }
      // Idle life, slow: the closed henhouse stirs; a hen murmurs now and then.
      if (!door.wasOpen && phase !== 'dusk' && phase !== 'night') {
        door.nextRattle -= dt
        if (door.nextRattle <= 0) {
          door.nextRattle = rnd(4.5, 7.5)
          door.rattle.kick(34)
          snd.cluck(0.82, 0.45)
        }
      }
      ambient -= dt
      if (ambient <= 0) {
        ambient = rnd(6, 11)
        const out = hens.filter((h) => h.state === 'idle' || h.state === 'bath' || h.state === 'preen')
        if (out.length > 0 && phase === 'day') snd.cluck(0.9 + Math.random() * 0.3, 0.4)
      }
      // The small bird that comes when the yard is at peace.
      if (doneAt >= 0 && phase === 'day' && stage.time - doneAt > 2.5 && !bird.here) {
        bird.k = Math.min(1, bird.k + dt / 3)
        const e = ease.outCubic(bird.k)
        bird.x = lerp(1240, 617, e)
        bird.y = lerp(40, 314, e) - Math.sin(e * Math.PI) * 70 + Math.sin(bird.k * 30) * 5 * (1 - e)
        if (bird.k >= 1) {
          bird.here = true
          bird.hop.kick(40)
          snd.bird()
        }
      }
      bird.hop.update(dt)
    },

    draw(g) {
      const t = stage.time
      const s = skyS()
      const inv = invited()
      const pulse = invitePulse()
      const glow = (kind: Invite): number => (inv === kind ? pulse : 0)

      // Sky, sun, clouds.
      drawSky(g, s)
      const sunH = s >= 0 ? lerp(L.sun.low, L.sun.high, s) : L.sun.low - s * 150
      if (sunH < 420) drawSun(g, L.sun.x, sunH, s, Math.max(0, sunPulse.value) + 0.2 * (0.5 + 0.5 * Math.sin(t * 0.55)))
      for (const cloud of clouds) drawCloud(g, cloud.x, cloud.y, cloud.size, s)

      g.drawImage(backdrop, 0, 0, W, H)

      // Leaves stirring.
      for (const leaf of leaves) {
        const sway = Math.sin(t * 0.7 + leaf.ph)
        g.fillStyle = 'rgba(158,190,110,0.5)'
        g.beginPath()
        g.ellipse(leaf.x + sway * 3.5, leaf.y + Math.cos(t * 0.5 + leaf.ph) * 1.5, leaf.rx, leaf.ry, sway * 0.08, 0, TAU)
        g.fill()
      }

      // Wet ground.
      for (const puddle of puddles) {
        g.fillStyle = `rgba(96,124,104,${0.3 * puddle.a})`
        g.beginPath()
        g.ellipse(puddle.x, puddle.y, puddle.r, puddle.r * 0.24, 0, 0, TAU)
        g.fill()
        g.fillStyle = `rgba(206,232,236,${0.4 * puddle.a})`
        g.beginPath()
        g.ellipse(puddle.x - puddle.r * 0.2, puddle.y - 1, puddle.r * 0.5, puddle.r * 0.09, 0, 0, TAU)
        g.fill()
      }

      // Grain on the ground: one path, two tones.
      if (grains.length > 0) {
        g.fillStyle = '#b98a2e'
        g.beginPath()
        for (const grain of grains) {
          if (!grain.landed) continue
          g.moveTo(grain.x + 5.5, grain.y + 1.2)
          g.ellipse(grain.x, grain.y + 1.2, 5.5, 3.6, grain.rot, 0, TAU)
        }
        g.fill()
        g.fillStyle = '#f0c456'
        g.beginPath()
        for (const grain of grains) {
          if (!grain.landed) continue
          g.moveTo(grain.x + 4.6, grain.y)
          g.ellipse(grain.x, grain.y, 4.6, 2.9, grain.rot, 0, TAU)
        }
        g.fill()
      }

      // ---- henhouse: a hen peeping under a half-lifted door, the door ----
      const D = L.hen
      const doorY = D.holeTop - 6 - door.open * D.doorTravel + door.rattle.value * 0.05
      const insideHen = hens.find((h) => h.state === 'inside')
      if (insideHen && door.open > 0.06 && phase !== 'night') {
        g.save()
        g.beginPath()
        g.rect(D.holeL, doorY + DOOR.h - 2, D.holeR - D.holeL, D.floor - (doorY + DOOR.h) + 2)
        g.clip()
        drawHen(g, {
          x: D.x - 6,
          y: D.floor + 10,
          dir: 1,
          look: insideHen.look,
          scale: 0.86,
          walk: 0,
          stride: 0,
          peck: clamp(0.34 - door.open * 0.5, 0, 0.3),
          hop: 0,
          puff: 1,
          flap: 0,
          sit: 0,
          preen: 0,
          tilt: Math.sin(t * 2.2) * 0.2,
          blink: t % 3.3 < 0.12 ? 1 : 0,
          alpha: 1,
        })
        g.restore()
      }
      // Lamplight warm in the vent at night.
      if (s < -0.2) {
        g.fillStyle = `rgba(255,206,120,${clamp(-s - 0.2, 0, 0.75)})`
        g.beginPath()
        g.arc(L.vent.x, L.vent.y, 10, 0, TAU)
        g.fill()
      }
      const doorInvite = glow('door')
      g.save()
      g.translate(D.x, doorY + DOOR.h / 2)
      g.rotate(Math.sin(t * 9) * 0.02 * doorInvite + door.rattle.value * 0.0012)
      g.drawImage(doorSprite, -DOOR.w / 2, -DOOR.h / 2, DOOR.w, DOOR.h)
      g.restore()
      drawGlint(g, D.x, doorY + DOOR.h - 14, 60, doorInvite)

      // ---- nest box: eggs, the front board again, then the lid -----------
      const N = L.nest
      for (const egg of eggs) if (egg.state === 'nest') drawEgg(g, egg.x, egg.y, egg.tint, egg.wobble.value * 0.06 + (egg.slot - 1) * 0.12)
      if (lid.open > 0.5) for (const egg of eggs) if (egg.state === 'nest') drawGlint(g, egg.x, egg.y - 8, 34, glow('egg'))
      g.drawImage(backdrop, (N.l - 6) * res, N.front * res, (N.r - N.l + 12) * res, 58 * res, N.l - 6, N.front, N.r - N.l + 12, 58)
      {
        const e = ease.inOutQuad(clamp(lid.open, 0, 1))
        const fy = lerp(N.front + 4, N.back - 74, e) + lid.bounce.value * 0.05
        const flat = fy > N.back
        const lidInvite = glow('lid')
        const lift = Math.sin(t * 8) * 2.5 * lidInvite
        g.fillStyle = css(flat ? C.sage : shade(C.woodLight, 0.05))
        g.beginPath()
        g.moveTo(N.l - 3, N.back - 3)
        g.lineTo(N.r + 3, N.back - 3)
        g.lineTo(N.r + (flat ? 7 : 3), fy - lift)
        g.lineTo(N.l - (flat ? 7 : 3), fy - lift)
        g.closePath()
        g.fill()
        // Board lines.
        g.strokeStyle = css(shade(flat ? C.sage : C.woodLight, -0.25), 0.45)
        g.lineWidth = 1.4
        for (const k of [0.33, 0.66]) {
          g.beginPath()
          g.moveTo(lerp(N.l, N.r, k), N.back - 2)
          g.lineTo(lerp(N.l - (flat ? 6 : 2), N.r + (flat ? 6 : 2), k), fy - lift)
          g.stroke()
        }
        // The lid's thick front edge and its little knob.
        g.strokeStyle = css(shade(C.sage, flat ? -0.2 : 0))
        g.lineWidth = 7
        g.beginPath()
        g.moveTo(N.l - (flat ? 7 : 3), fy - lift)
        g.lineTo(N.r + (flat ? 7 : 3), fy - lift)
        g.stroke()
        g.fillStyle = css(shade(C.woodLight, 0.12))
        g.beginPath()
        g.arc((N.l + N.r) / 2, fy - lift + (flat ? 1 : -1), 7, 0, TAU)
        g.fill()
        drawGlint(g, (N.l + N.r) / 2, fy - 8, 58, lidInvite)
      }

      // ---- basket: eggs laid in it, then the wicker front again ----------
      const K = L.basket
      for (const egg of eggs) {
        if (egg.state !== 'basket') continue
        drawEgg(g, egg.x, egg.y, egg.tint, (egg.slot - 1) * 0.3 + egg.wobble.value * 0.07)
      }
      g.drawImage(backdrop, (K.x - 56) * res, (K.y + 5) * res, 112 * res, 56 * res, K.x - 56, K.y + 5, 112, 56)

      // ---- trough water ---------------------------------------------------
      const T = L.trough
      if (trough.level > 0.005) {
        const k = clamp(trough.level, 0, 1)
        const top = lerp(T.front - 2, T.back + 1, Math.sqrt(k))
        g.fillStyle = css(C.water, 0.5 + k * 0.42)
        g.beginPath()
        g.moveTo(lerp(T.l + 3, T.l + 8, (T.front - top) / 18), top)
        g.lineTo(lerp(T.r - 3, T.r - 8, (T.front - top) / 18), top)
        g.lineTo(T.r - 3, T.front + 1)
        g.lineTo(T.l + 3, T.front + 1)
        g.closePath()
        g.fill()
        g.strokeStyle = css(C.waterLight, 0.6)
        g.lineWidth = 2
        const mid = (top + T.front) / 2
        for (let i = 0; i < 3; i++) {
          const rx = T.l + 30 + i * 52 + Math.sin(t * 0.9 + i * 2) * (6 + trough.ripple * 10)
          const w = 14 + trough.ripple * 8 + i * 3
          g.beginPath()
          g.moveTo(rx - w, mid + Math.sin(t * 1.3 + i) * 1.5)
          g.quadraticCurveTo(rx, mid - 2 - trough.ripple * 2, rx + w, mid + Math.sin(t * 1.3 + i) * 1.5)
          g.stroke()
        }
      }

      // ---- pump handle ----------------------------------------------------
      const U = L.pump
      const end = handleEnd()
      const pumpInvite = glow('pump')
      const wig = Math.sin(t * 7) * 0.035 * pumpInvite
      const ex = U.pivotX - Math.cos(pump.angle + wig) * U.handle
      const ey = U.pivotY + Math.sin(pump.angle + wig) * U.handle
      g.strokeStyle = css(shade(C.iron, -0.25))
      g.lineWidth = 10
      g.beginPath()
      g.moveTo(U.pivotX + Math.cos(pump.angle) * 16, U.pivotY - Math.sin(pump.angle) * 16)
      g.lineTo(ex, ey)
      g.stroke()
      g.strokeStyle = css(shade(C.iron, 0.2), 0.7)
      g.lineWidth = 2.5
      g.beginPath()
      g.moveTo(U.pivotX, U.pivotY - 3)
      g.lineTo(ex, ey - 3)
      g.stroke()
      // The wooden grip.
      const gx = Math.cos(pump.angle + wig)
      const gy = Math.sin(pump.angle + wig)
      g.strokeStyle = css(C.woodDark)
      g.lineWidth = 19
      g.beginPath()
      g.moveTo(ex + gx * 34, ey - gy * 34)
      g.lineTo(ex - gx * 4, ey + gy * 4)
      g.stroke()
      g.strokeStyle = css(shade(C.woodLight, 0.06))
      g.lineWidth = 14
      g.beginPath()
      g.moveTo(ex + gx * 33, ey - gy * 33 - 1)
      g.lineTo(ex - gx * 3, ey + gy * 3 - 1)
      g.stroke()
      g.fillStyle = css(shade(C.iron, -0.35))
      g.beginPath()
      g.arc(U.pivotX, U.pivotY, 6, 0, TAU)
      g.fill()
      drawGlint(g, end[0] + 10, end[1], 56, pumpInvite)

      // ---- the brush on its peg ------------------------------------------
      if (brush.state === 'home') {
        const sway = brush.sway.value * 0.12 + Math.sin(t * 0.8) * 0.02
        g.strokeStyle = '#8f5a3c'
        g.lineWidth = 3
        g.beginPath()
        g.moveTo(L.hook.x, 188)
        g.lineTo(brush.x + sway * 30, brush.y - 14)
        g.stroke()
        drawGlint(g, brush.x, brush.y, 60, glow('brush'))
        drawBrush(g, brush.x + sway * 34, brush.y + Math.sin(t * 6) * 2 * glow('brush'), sway)
      }

      // ---- pony ------------------------------------------------------------
      const atPeace = doneAt >= 0 ? clamp((t - doneAt) / 3, 0, 1) : 0
      const sleepy = clamp(nightK * 1.4, 0, 1)
      const blink = (t + 1.3) % 4.1 < 0.13 ? 1 : 0
      drawPony(g, {
        x: L.pony.x,
        y: L.pony.y,
        time: t,
        headDown: clamp(pony.headDown + pony.nod.value * 0.04 + sleepy * 0.2, 0, 1),
        leanX: pony.leanX.value,
        leanY: pony.leanY.value,
        breath: 0.5 + 0.5 * Math.sin(t * 1.25),
        eye: Math.max(blink, pony.content * 0.9, atPeace * 0.45, sleepy),
        ear: pony.ear.value * 0.08 + Math.sin(t * 0.6) * 0.04 - pony.content * 0.25,
        tail: Math.sin(t * 0.75) * 0.13 + pony.tail.value * 0.16,
        shine: pony.shine,
        cock: Math.max(atPeace, sleepy),
        lip: pony.content * (0.5 + 0.5 * Math.sin(t * 9)),
        dust,
        dustAlpha: pony.dustAlpha,
      })
      if (pony.headDown > 0.93 && trough.level > 0.03 && !pony.watered) {
        // Rings where the muzzle meets the water.
        const m = ponyMuzzle({ x: L.pony.x, y: L.pony.y, headDown: pony.headDown })
        const ring = (t * 1.6) % 1
        g.strokeStyle = css(C.waterLight, 0.7 * (1 - ring))
        g.lineWidth = 2
        g.beginPath()
        g.ellipse(m[0] - 2, T.front - 5, 10 + ring * 22, 2 + ring * 3.5, 0, 0, TAU)
        g.stroke()
      }

      // ---- feed bin --------------------------------------------------------
      const B = L.bin
      const level = clamp(bin.grain / 110, 0, 1)
      if (bin.grain > 0) {
        const gyy = B.top + 4 + (1 - level) * 9
        g.fillStyle = css(shade(C.grain, -0.16))
        g.beginPath()
        g.ellipse(B.x, gyy, 54 - (1 - level) * 6, 13 - (1 - level) * 3, 0, 0, TAU)
        g.fill()
        g.fillStyle = css(C.grain)
        g.beginPath()
        g.ellipse(B.x - 2, gyy - 2 - level * 5, 46 * (0.5 + level * 0.5), 9 + level * 5, 0, 0, TAU)
        g.fill()
        g.fillStyle = css(shade(C.grain, 0.3), 0.8)
        g.beginPath()
        g.ellipse(B.x - 12, gyy - 5 - level * 7, 20 * (0.5 + level * 0.5), 4 + level * 2, -0.1, 0, TAU)
        g.fill()
        g.fillStyle = css(shade(C.grain, -0.35), 0.55)
        for (let i = 0; i < 12; i++) {
          g.beginPath()
          g.ellipse(B.x - 38 + ((i * 29) % 76), gyy - 3 - ((i * 7) % 9) * level, 2.2, 1.4, i, 0, TAU)
          g.fill()
        }
      }
      if (scoop.state === 'home') {
        const scoopInvite = glow('scoop')
        drawGlint(g, scoop.x + 20, scoop.y - 26, 58, scoopInvite)
        drawScoop(g, scoop.x, scoop.y + Math.sin(t * 6) * 2 * scoopInvite, scoop.rot + Math.sin(t * 7) * 0.05 * scoopInvite, 0)
        if (bin.grain > 0) {
          // Grain heaped over the buried bowl.
          g.fillStyle = css(C.grain)
          g.beginPath()
          g.ellipse(scoop.x - 18, scoop.y + 26, 26, 9, 0.1, 0, TAU)
          g.fill()
        }
      }

      // ---- hay rack, goat, pile, fork -------------------------------------
      const R = L.rack
      if (rack.count > 0) {
        const pop = rack.pop.value
        const lay: [number, number, number][] = [
          [R.x, R.vee + 2, 0.56],
          [R.x + 4, R.top + 44, 0.84],
          [R.x - 8, R.top + 18, 1],
          [R.x + 10, R.top - 2, 0.86],
        ]
        for (let i = 0; i < Math.min(rack.count, 4); i++) {
          const [hx, hy, hs] = lay[i]
          const sc = hs * (i === rack.count - 1 ? pop : 1)
          g.drawImage(haySprite, hx - (HAY.w * sc) / 2, hy - HAY.h * sc * 0.72, HAY.w * sc, HAY.h * sc)
        }
      }
      g.drawImage(rackSprite, R.x - RACK.w / 2, R.top - 10, RACK.w, RACK.h)
      drawGoat(g, {
        x: L.goat.x,
        y: L.goat.y,
        time: t,
        reach: goat.reach,
        chew: goat.chew,
        chewing: goat.chewing,
        tail: goat.tail.value * 0.09 + Math.sin(t * 1.1) * 0.05,
        ear: goat.ear.value * 0.06,
        eye: Math.max((t + 2.2) % 3.7 < 0.13 ? 1 : 0, goat.fed ? 0.5 * goat.chewing : 0, sleepy),
        stretch: goat.stretch.value,
        wisp: goat.wisp,
      })
      {
        const k = pile.count / PILE_FULL
        const sc = lerp(0.36, 1, k) * pile.pop.value
        g.drawImage(pileSprite, L.pile.x - (PILE.w * sc) / 2, L.pile.y - PILE.h * sc + 12 * sc, PILE.w * sc, PILE.h * sc)
      }
      if (fork.state === 'home') {
        const forkInvite = glow('fork')
        drawGlint(g, fork.x + 12, fork.y - 44, 60, forkInvite)
        drawFork(g, fork.x, fork.y, fork.rot + Math.sin(t * 7) * 0.04 * forkInvite)
        // Hay over the buried tines.
        const sc = 0.5
        g.drawImage(haySprite, L.pile.x + 8 - (HAY.w * sc) / 2, L.pile.y - 30 - HAY.h * sc * 0.5, HAY.w * sc, HAY.h * sc)
      }

      // ---- hens and the bucket, nearest last ------------------------------
      const order: { y: number; hen: Hen | null }[] = []
      for (const h of hens) if (h.state !== 'inside') order.push({ y: h.y, hen: h })
      if (bucket.state !== 'held') order.push({ y: bucket.y, hen: null })
      order.sort((a, b) => a.y - b.y)
      for (const item of order) {
        const h = item.hen
        if (!h) {
          const bucketInvite = glow('bucket')
          drawGlint(g, bucket.x, bucket.y - 50, 66, bucketInvite)
          const sq = 1 + bucket.squash.value * 0.05
          g.save()
          g.translate(bucket.x, bucket.y)
          g.scale(1 / sq, sq)
          drawBucket(g, 0, 0, bucket.tilt + Math.sin(t * 7) * 0.03 * bucketInvite, bucket.fill, bucket.held, bucket.swing.value)
          g.restore()
          continue
        }
        const onRamp = h.state === 'exit' || h.state === 'enter'
        drawHen(g, {
          x: h.x,
          y: h.y,
          dir: h.dir,
          look: h.look,
          scale: onRamp ? lerp(0.84, 1, h.k) : 1,
          walk: h.walk,
          stride: h.stride,
          peck: h.state === 'peck' && h.scratch <= 0 ? h.peck : onRamp && door.open < 0.7 ? clamp(0.28 - h.k * 0.6, 0, 0.28) : 0,
          hop: Math.max(0, h.hop.value),
          puff: h.puff.value + sleepy * 0.04,
          flap: h.flap,
          sit: h.sit,
          preen: h.preen,
          tilt: h.state === 'idle' ? h.tilt : 0,
          blink: (t + h.seed * 1.7) % (3.3 + h.kind * 0.6) < 0.12 ? 1 : 0,
          alpha: onRamp ? clamp(h.k * 6, 0, 1) : 1,
        })
      }

      // Water from the spout.
      if (pump.flow > 0.03) {
        const bottom = bucket.state === 'pump' ? bucket.y - 74 + (1 - bucket.fill) * 6 : U.base + 4
        const w = 4 + pump.flow * 7
        g.fillStyle = css(C.water, 0.85)
        g.beginPath()
        g.moveTo(U.spoutX - w / 2 - 1, U.spoutY)
        g.quadraticCurveTo(U.spoutX - w / 2 + 2, (U.spoutY + bottom) / 2, U.spoutX - w * 0.32 + Math.sin(t * 30) * 1.2, bottom)
        g.lineTo(U.spoutX + w * 0.32 + Math.sin(t * 34) * 1.2, bottom)
        g.quadraticCurveTo(U.spoutX + w / 2 + 2, (U.spoutY + bottom) / 2, U.spoutX + w / 2 - 1, U.spoutY)
        g.closePath()
        g.fill()
        g.strokeStyle = css(C.waterLight, 0.8)
        g.lineWidth = 1.6
        g.beginPath()
        g.moveTo(U.spoutX - 1, U.spoutY + 2)
        g.lineTo(U.spoutX - 1 + Math.sin(t * 22) * 1, bottom - 2)
        g.stroke()
      }

      // ---- the bird and the butterflies of a finished morning -------------
      if (doneAt >= 0 && bird.k > 0) {
        const by = bird.y - Math.max(0, bird.hop.value)
        const flying = !bird.here
        g.save()
        g.translate(bird.x, by)
        g.fillStyle = '#8a6a50'
        if (flying) {
          const flap = Math.sin(t * 24)
          g.beginPath()
          g.ellipse(2, -10 - flap * 7, 12, 5, -0.5 * flap, 0, TAU)
          g.fill()
        }
        g.beginPath()
        g.ellipse(0, -9, 12, 9.5, -0.15, 0, TAU)
        g.fill()
        g.beginPath()
        g.moveTo(8, -8)
        g.lineTo(24, -4)
        g.lineTo(9, -3)
        g.fill()
        g.fillStyle = '#f0d8b4'
        g.beginPath()
        g.ellipse(-4, -6, 7, 6, 0, 0, TAU)
        g.fill()
        g.fillStyle = '#8a6a50'
        g.beginPath()
        g.arc(-9, -16, 7, 0, TAU)
        g.fill()
        g.fillStyle = '#e3a334'
        g.beginPath()
        g.moveTo(-15, -17)
        g.lineTo(-22, -15)
        g.lineTo(-15, -13)
        g.fill()
        g.fillStyle = '#33241c'
        g.beginPath()
        g.arc(-11, -17, 1.6, 0, TAU)
        g.fill()
        g.restore()
      }
      if (atPeace > 0 && s > 0.5) {
        for (const b of butterflies) {
          const bx = b.cx + Math.sin(t * 0.33 + b.ph) * 90 + Math.sin(t * 1.3 + b.ph) * 14
          const byy = b.cy + Math.cos(t * 0.41 + b.ph * 2) * 34 + Math.sin(t * 2.1 + b.ph) * 8
          const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 8 + b.ph))
          const lean = Math.cos(t * 0.33 + b.ph) * 0.35
          g.save()
          g.translate(bx, byy)
          g.rotate(lean)
          g.globalAlpha = atPeace
          g.fillStyle = b.ph > 1 ? '#fff6d0' : '#fffdf4'
          g.beginPath()
          g.ellipse(-7 * flap, -4, 8 * flap + 1, 9, -0.5, 0, TAU)
          g.ellipse(7 * flap, -4, 8 * flap + 1, 9, 0.5, 0, TAU)
          g.ellipse(-5 * flap, 5, 5 * flap + 1, 6, 0.4, 0, TAU)
          g.ellipse(5 * flap, 5, 5 * flap + 1, 6, -0.4, 0, TAU)
          g.fill()
          g.strokeStyle = '#6a5444'
          g.lineWidth = 2.2
          g.beginPath()
          g.moveTo(0, -7)
          g.lineTo(0, 7)
          g.stroke()
          g.restore()
        }
      }

      // ---- things in the hand ---------------------------------------------
      for (const egg of eggs) {
        if (egg.state === 'held' || egg.state === 'glide') {
          g.fillStyle = 'rgba(52,58,30,0.12)'
          g.beginPath()
          g.ellipse(egg.x, egg.y + 30, 15, 4, 0, 0, TAU)
          g.fill()
          drawEgg(g, egg.x, egg.y, egg.tint, egg.wobble.value * 0.08, 1.12)
        }
      }
      if (bucket.state === 'held') {
        const total = bucket.tilt + clamp(bucket.swing.value, -1, 1) * 0.16 * (1 - clamp(bucket.tilt, 0, 1))
        if (bucket.pouring > 0) {
          const lip = bucketLip(bucket.x, bucket.y, total)
          const land = T.front - 4 - clamp(trough.level, 0, 1) * 8
          const lx = clamp(lip[0] + 9, T.l + 12, T.r - 14)
          const w = 5 + bucket.pouring * 9
          g.fillStyle = css(C.water, 0.85)
          g.beginPath()
          g.moveTo(lip[0] - 3, lip[1] - w * 0.3)
          g.quadraticCurveTo(lx + w * 0.4, lip[1] - 4, lx + w * 0.4, land)
          g.lineTo(lx - w * 0.4, land)
          g.quadraticCurveTo(lx - w * 0.6, lip[1] + w, lip[0] - 5, lip[1] + w * 0.5)
          g.closePath()
          g.fill()
          g.strokeStyle = css(C.waterLight, 0.85)
          g.lineWidth = 1.8
          g.beginPath()
          g.moveTo(lip[0], lip[1])
          g.quadraticCurveTo(lx, lip[1] - 2, lx + Math.sin(t * 26) * 1.5, land)
          g.stroke()
        }
        drawBucket(g, bucket.x, bucket.y, total, bucket.fill, bucket.held * (1 - clamp(bucket.tilt / 1.2, 0, 1)), bucket.swing.value)
      }
      if (brush.state !== 'home') drawBrush(g, brush.x, brush.y, clamp(brush.stroke, -1, 1) * 0.18)
      if (scoop.state !== 'home') drawScoop(g, scoop.x, scoop.y, scoop.rot, scoop.grain / 22)
      if (fork.state !== 'home') {
        drawFork(g, fork.x, fork.y, fork.rot)
      }
      if (fork.load) {
        const tip = forkTip(96)
        const sc = 0.62
        g.drawImage(haySprite, tip[0] - (HAY.w * sc) / 2, tip[1] - HAY.h * sc * 0.62, HAY.w * sc, HAY.h * sc)
      }
      // Grain falling.
      g.fillStyle = '#f0c456'
      for (const grain of grains) {
        if (grain.landed) continue
        g.beginPath()
        g.ellipse(grain.x, grain.fallY, 4.4, 2.9, grain.rot + grain.fallY * 0.05, 0, TAU)
        g.fill()
      }

      // ---- the light of the hour over everything --------------------------
      const dim = s >= 0 ? lerp(0.11, 0, s) : lerp(0.11, 0.6, -s)
      if (dim > 0.004) {
        const tone: RGB = s >= 0 ? [150, 96, 120] : [lerp(150, C.night[0], -s), lerp(96, C.night[1], -s), lerp(120, C.night[2], -s)]
        g.fillStyle = css(tone, dim)
        g.fillRect(0, 0, W, H)
      }
      g.drawImage(paper, 0, 0, W, H)
      if (s < -0.25) {
        const a = clamp((-s - 0.25) * 1.6, 0, 1)
        for (const star of stars) drawStar(g, star.x, star.y, star.r, a * (0.55 + 0.45 * Math.sin(t * 1.1 + star.ph)))
        // Moon.
        const mx = 452
        const my = lerp(190, 104, a)
        const halo = g.createRadialGradient(mx, my, 20, mx, my, 110)
        halo.addColorStop(0, `rgba(255,246,214,${0.3 * a})`)
        halo.addColorStop(1, 'rgba(255,246,214,0)')
        g.fillStyle = halo
        g.beginPath()
        g.arc(mx, my, 110, 0, TAU)
        g.fill()
        g.fillStyle = `rgba(255,248,224,${a})`
        g.beginPath()
        g.arc(mx, my, 34, 0, TAU)
        g.fill()
        g.fillStyle = `rgba(226,214,190,${0.5 * a})`
        g.beginPath()
        g.arc(mx + 9, my - 6, 8, 0, TAU)
        g.arc(mx - 10, my + 9, 5, 0, TAU)
        g.fill()
        // Fireflies over the yard.
        for (const fly of flies) {
          const fxx = fly.x + Math.sin(t * 0.4 + fly.ph) * 40
          const fyy = fly.y + Math.cos(t * 0.31 + fly.ph * 1.7) * 26
          const on = Math.max(0, Math.sin(t * 1.3 + fly.ph * 2.2))
          g.fillStyle = `rgba(255,236,150,${0.22 * a * on})`
          g.beginPath()
          g.arc(fxx, fyy, 11, 0, TAU)
          g.fill()
          g.fillStyle = `rgba(255,248,200,${0.9 * a * on})`
          g.beginPath()
          g.arc(fxx, fyy, 2.6, 0, TAU)
          g.fill()
        }
      }
    },

    down(p: Pointer) {
      lastTouch = stage.time
      if (phase === 'dusk' || (phase === 'night' && !resetDone)) {
        nightTouch(p)
        return
      }
      const hit = pickGrab(p)
      if (phase === 'night') {
        // Only the door wakes the morning; everything else sleeps.
        if (hit && hit.kind === 'door') {
          phase = 'dawn'
          beginGrab('door', 0, p)
        } else nightTouch(p)
        return
      }
      if (hit) beginGrab(hit.kind, hit.index, p)
      else tapWorld(p)
    },

    move(p: Pointer) {
      const grab = grabs.get(p.id)
      if (!grab) return
      lastTouch = stage.time
      const step = Math.hypot(p.dx, p.dy)
      grab.moved += step
      if (grab.kind === 'door') {
        const before = door.open
        door.open = clamp(door.start + (p.startY - p.y) / L.hen.doorTravel, 0, 1)
        if (Math.abs(door.open - before) > 0.01) snd.slide()
      } else if (grab.kind === 'lid') {
        lid.open = clamp(lid.start + (p.startY - p.y) / 80, 0, 1)
      } else if (grab.kind === 'egg') {
        const egg = eggs[grab.index]
        egg.x = lerp(egg.x, p.x, 0.6)
        egg.y = lerp(egg.y, p.y - 30, 0.6)
        egg.wobble.kick(clamp(p.dx * 0.25, -3, 3))
      } else if (grab.kind === 'scoop') {
        scoop.tx = p.x - 8
        scoop.ty = p.y - 44
        scoop.carry += step
        if (scoop.grain <= 0 && bin.grain > 0 && dist(scoop.tx, scoop.ty, L.bin.x, L.bin.top - 10) < 74) {
          // Back in the bin: a fresh scoopful.
          const take = Math.min(22, bin.grain)
          bin.grain -= take
          scoop.grain = take
          scoop.carry = 0
          snd.scoop()
        }
        while (scoop.carry >= 13) {
          scoop.carry -= 13
          if (scoop.grain > 0) dropGrain()
        }
      } else if (grab.kind === 'pump') {
        const before = pump.angle
        const want = Math.asin(clamp((p.y - grab.off - L.pump.pivotY) / L.pump.handle, -1, 1))
        pump.angle = clamp(want, PUMP_UP, PUMP_DOWN)
        const d = pump.angle - before
        if (d > 0.002) pumpWater(d)
        // One small creak each time the handle changes direction.
        const dir = d > 0.004 ? 1 : d < -0.004 ? -1 : 0
        if (dir !== 0 && dir !== pump.dir) {
          pump.dir = dir
          snd.creak(dir < 0)
        }
      } else if (grab.kind === 'bucket') {
        bucket.tx = p.x
        bucket.ty = p.y + 112
        bucket.swing.kick(clamp(-p.dx * 0.05, -1.4, 1.4))
        if (bucket.fill > 0.9 && Math.abs(p.dx) > 26 && Math.random() < 0.3) {
          // Carried too fast when brim-full, a little slops out.
          bucket.fill -= 0.02
          drops(bucket.x, bucket.y - 78, 2, 90)
          snd.plip()
        }
      } else if (grab.kind === 'brush') {
        const fromX = brush.tx
        const fromY = brush.ty
        brush.tx = p.x
        brush.ty = p.y - 18
        brush.stroke = clamp(brush.stroke + p.dx * 0.04, -1, 1)
        const n = Math.max(1, Math.ceil(step / 12))
        for (let i = 1; i <= n; i++) rub(lerp(fromX, brush.tx, i / n), lerp(fromY, brush.ty, i / n) + 14)
      } else if (grab.kind === 'fork') {
        fork.tx = p.x + 8
        fork.ty = p.y + 18
        const tip = forkTip(96)
        if (fork.load) {
          fork.wisp += step
          if (fork.wisp > 70) {
            fork.wisp = 0
            fx.burst(tip[0], tip[1], { count: 1, color: ['#ecd486', '#c9a24c'], speed: 30, life: 1, size: 7, gravity: 260, shape: 'spark', angle: Math.PI / 2, spread: 1.4 })
          }
          const R = L.rack
          if (rack.count < 4 && fork.lift > 0.9 && tip[0] > R.x - 86 && tip[0] < R.x + 92 && tip[1] > R.top - 80 && tip[1] < R.vee + 30) {
            // Into the rack it goes.
            fork.load = false
            rack.count++
            rack.pop.value = 0.7
            goat.tail.kick(9)
            goat.ear.kick(2)
            snd.hay()
            fx.burst(R.x, R.top - 6, { count: 5, color: ['#ecd486', '#c9a24c', '#f3e2a6'], speed: 80, life: 0.8, size: 6, gravity: 300, shape: 'spark', angle: -Math.PI / 2, spread: 2.4 })
            if (rack.count === 3) stage.after(0.5, () => snd.bleat())
          }
        } else if (pile.count > 0 && fork.lift > 0.9 && Math.abs(tip[0] - L.pile.x) < 96 && tip[1] > L.pile.y - 120 * lerp(0.4, 1, pile.count / PILE_FULL)) {
          pile.count--
          pile.pop.value = 0.92
          fork.load = true
          snd.hay()
        }
      }
    },

    up(p: Pointer) {
      const grab = grabs.get(p.id)
      if (!grab) return
      grabs.delete(p.id)
      const tap = grab.moved < 9 && stage.time - grab.at < 0.45
      if (grab.kind === 'door') {
        if (tap) {
          if (door.open < 0.5) door.target = 1
          else {
            // A tap on the open door only rattles it; closing takes a pull.
            door.target = 1
            door.rattle.kick(50)
            snd.knock(0.5)
          }
        } else door.target = door.open > 0.5 ? 1 : 0
        if (door.target === 1) {
          if (!door.wasOpen) snd.knock(0.6)
          door.wasOpen = true
        } else if (door.wasOpen) startDusk()
      } else if (grab.kind === 'lid') {
        if (tap) lid.target = lid.open < 0.5 ? 1 : 0
        else lid.target = lid.open > 0.5 ? 1 : 0
        if (lid.target === 1 && lid.start < 0.5) {
          snd.creak(true)
          snd.straw(0.6)
        }
      } else if (grab.kind === 'egg') {
        const egg = eggs[grab.index]
        const K = L.basket
        const near = dist(egg.x, egg.y, K.x, K.y - 6) < 112 || (Math.abs(egg.x - K.x) < 80 && egg.y > K.y - 60)
        egg.state = 'glide'
        const fromX = egg.x
        const fromY = egg.y
        if (near) {
          const slot = eggsIn()
          const [sx, sy] = K.slots[Math.min(slot, K.slots.length - 1)]
          egg.slot = slot
          stage.tween(
            0.28,
            (k) => {
              egg.x = lerp(fromX, sx, k)
              egg.y = lerp(fromY, sy, k) - Math.sin(k * Math.PI) * 14
            },
            ease.inOutQuad,
            () => {
              egg.state = 'basket'
              egg.wobble.kick(5)
              for (const other of eggs) if (other !== egg && other.state === 'basket') other.wobble.kick(rnd(-3, 3))
              snd.eggNest()
            },
          )
          egg.state = 'glide'
        } else {
          const hx = L.nest.eggs[grab.index]
          stage.tween(
            0.4,
            (k) => {
              egg.x = lerp(fromX, hx, k)
              egg.y = lerp(fromY, L.nest.eggY, k) - Math.sin(k * Math.PI) * 18
            },
            ease.inOutQuad,
            () => {
              if (egg.state === 'glide') egg.state = 'nest'
              egg.wobble.kick(3)
              snd.straw(0.5)
            },
          )
        }
      } else if (grab.kind === 'pump') {
        if (tap) pump.auto = 0.6
      } else if (grab.kind === 'bucket') {
        if (bucket.state === 'held') setDown()
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'farm-morning',
    name: 'Farm Morning',
    emoji: '🐓',
    ages: [3, 7],
    set: 'gentle',
    pitch: 'Do the morning round of a small farmyard: let the hens out, scatter grain, gather eggs, pump water for the pony, brush its coat, fork hay to the goat.',
    howTo: 'Slide the henhouse door up. Drag the scoop, the pump handle, the bucket, the brush and the hay fork. Slide the door down again for night and a new morning.',
    basedOn: 'Montessori care of animals and practical life (pouring, carrying, brushing); the Waldorf rhythm of the day',
    whyFun: 'Grain patters from the scoop and the hens come running; the pump gurgles, then gushes; a long brush stroke leaves a clean, shining stripe on a dusty pony.',
  },
  create,
}
