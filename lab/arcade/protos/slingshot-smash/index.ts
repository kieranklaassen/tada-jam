// Slingshot Smash: pull a creature back in the slingshot, let go, and knock a
// wobbly tower out from under some very smug jelly monsters. Real rigid bodies
// (matter-js) for the tower; everything else is springs and tweens.

import Matter from 'matter-js'
import { blinkAt, label, sprite, star } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { clamp, damp, dist, ease, lerp, pick, remap, rnd, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { BLOCK_PAD, GROUND, JELLY_COLORS, REST, blockSprite, drawCloud, drawJelly, drawShot, drawSlingBack, drawSlingFront, makeBackdrop, stretchAlong } from './art.ts'
import type { JellyMood } from './art.ts'
import { JR, ammoFor, towerFor } from './towers.ts'
import type { Material, ShotKind } from './towers.ts'

const { Bodies, Body, Composite, Engine, Events } = Matter

const TOWER_X = 842
const MAX_PULL = 172
const MIN_PULL = 30
// Physics runs at 120 Hz; matter's velocities are per 1/60 s.
const SUB = 1 / 120
const VEL_SCALE = 2
// 0.001 * 1.3 px/ms^2.
const GRAVITY_Y = 1.3
const G = GRAVITY_Y * 1000
const MIN_SPEED = 760
const MAX_SPEED = 1230

const SHOT: Record<ShotKind, { r: number; density: number }> = {
  basic: { r: 30, density: 0.0033 },
  split: { r: 27, density: 0.0033 },
  mini: { r: 18, density: 0.005 },
  bomb: { r: 31, density: 0.0028 },
  heavy: { r: 42, density: 0.0066 },
}
const DENSITY: Record<Material, number> = { wood: 0.0007, ice: 0.00055, stone: 0.0022 }

interface Block {
  kind: 'block'
  body: Matter.Body
  w: number
  h: number
  mat: Material
  hp: number
  alive: boolean
  placed: boolean
  shown: boolean
  drop: number
  pulse: Spring
  soundAt: number
  img: HTMLCanvasElement
}

interface Jelly {
  kind: 'jelly'
  body: Matter.Body
  hue: number
  alive: boolean
  placed: boolean
  shown: boolean
  drop: number
  wob: Spring
  homeX: number
  homeY: number
  doomedAt: number
  teaseUntil: number
  seed: number
}

interface Shot {
  kind: 'shot'
  type: ShotKind
  body: Matter.Body
  r: number
  alive: boolean
  bornAt: number
  hitAt: number
  used: boolean
  wob: Spring
}

type Ent = Block | Jelly | Shot | { kind: 'ground' }

interface Hit {
  a: Matter.Body
  b: Matter.Body
  vn: number
  x: number
  y: number
}

interface Pull {
  id: number
  absolute: boolean
  mode: 'undecided' | 'pull' | 'throw'
  dx: number
  dy: number
  step: number
}

interface Chip {
  x: number
  y: number
  rot: number
  w: number
  h: number
  color: string
}

const CLOUDS = [
  { x: 140, y: 120, s: 1.0, v: 9 },
  { x: 760, y: 80, s: 0.8, v: 6 },
  { x: 1030, y: 190, s: 1.15, v: 12 },
]

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const engine = Engine.create({ gravity: { x: 0, y: GRAVITY_Y, scale: 0.001 } })
  engine.positionIterations = 8
  engine.velocityIterations = 6
  const world = engine.world
  const ground = Bodies.rectangle(W / 2, GROUND + 100, W + 3000, 200, { isStatic: true, friction: 0.9, restitution: 0.1 })
  Composite.add(world, ground)
  const ents = new Map<number, Ent>()
  ents.set(ground.id, { kind: 'ground' })
  const backdrop = makeBackdrop()

  let blocks: Block[] = []
  let jellies: Jelly[] = []
  let shots: Shot[] = []
  const hits: Hit[] = []
  const chips: Chip[] = []
  let trail: { x: number; y: number }[] = []
  let trailAcc = 0
  let acc = 0
  let soundBudget = 3
  let lastClonkAt = -1

  let level = 0
  let state: 'building' | 'live' | 'cleared' = 'building'
  let shotsThisTower = 0
  let launches = 0
  let launchSeq = 0
  let scoredThisLaunch = false
  let stars = 0
  let combo = 0
  let lastPoofAt = -10
  let starShow: { count: number; at: number; shots: number } | null = null
  const starPulse = spring(1, 260, 10)
  const levelPulse = spring(1, 260, 10)
  const seen = new Set<ShotKind>(['basic'])
  const taught = new Set<ShotKind>()

  let ammo: ShotKind[] = ammoFor(0, stage.rand)
  let qi = 0
  let loaded: { type: ShotKind; hop: number } | null = { type: ammo[0]!, hop: 1 }
  const loadWob = spring(1, 240, 9)
  const queueShift = spring(0, 200, 16)
  let pull: Pull | null = null
  const pouch = { x: REST.x, y: REST.y, vx: 0, vy: 0 }
  let demo: { dx: number; dy: number } | null = null
  let lastTouchAt = 0
  let nextTauntAt = 7
  const finger = { x: TOWER_X, y: 400, until: 0 }

  // ---------- sound ----------

  const matSound = (b: Block, v: number) => {
    // A collapse is a rattle of clonks, not a wall of noise.
    if (stage.time - b.soundAt < 0.09 || soundBudget <= 0 || stage.time - lastClonkAt < 0.022) return
    b.soundAt = stage.time
    lastClonkAt = stage.time
    soundBudget--
    if (b.mat === 'wood') {
      const f = remap(b.w * b.h, 1500, 8000, 560, 210) * rnd(0.94, 1.06)
      sfx.tone({ freq: f, to: f * 0.72, dur: 0.08, type: 'triangle', vol: 0.06 + v * 0.26 })
      sfx.noise({ dur: 0.03, freq: 2200, filter: 'bandpass', vol: v * 0.14 })
    } else if (b.mat === 'ice') {
      sfx.tone({ freq: rnd(1700, 2500), dur: 0.07, type: 'sine', vol: 0.04 + v * 0.1 })
    } else {
      sfx.thud(0.3 + v * 0.7)
    }
  }

  const squeak = (step: number, vol = 0.12) => {
    const f = 560 + step * 55 + rnd(-12, 12)
    sfx.tone({ freq: f, to: f * 1.18, dur: 0.07, type: 'sine', vol })
  }

  // ---------- bodies ----------

  const removeBody = (body: Matter.Body) => {
    Composite.remove(world, body)
    ents.delete(body.id)
  }

  const addChips = (x: number, colors: readonly string[], n: number) => {
    for (let i = 0; i < n; i++) {
      chips.push({ x: clamp(x + rnd(-70, 70), 20, W - 20), y: GROUND + rnd(8, 44), rot: rnd(0, TAU), w: rnd(8, 18), h: rnd(4, 8), color: pick(colors) })
    }
    while (chips.length > 70) chips.shift()
  }

  const breakBlock = (b: Block, quiet = false) => {
    if (!b.alive) return
    b.alive = false
    if (b.placed) removeBody(b.body)
    const { x, y } = b.body.position
    scoredThisLaunch = true
    if (quiet) {
      fx.burst(x, y, { count: 7, color: ['#ffffff', '#fff1cf'], speed: 200, life: 0.4, size: 12, gravity: -60 })
      return
    }
    if (b.mat === 'ice') {
      fx.burst(x, y, { count: 14, color: ['#e2f6ff', '#9bdcff', '#ffffff'], shape: 'square', speed: 460, life: 0.75, size: 12, gravity: 1000 })
      fx.burst(x, y, { count: 6, color: '#ffffff', shape: 'spark', speed: 520, life: 0.3, size: 10 })
      for (let i = 0; i < 3; i++) sfx.tone({ freq: rnd(2000, 3600), dur: 0.09, type: 'sine', vol: 0.09, delay: i * 0.025 })
      sfx.noise({ dur: 0.16, freq: 5200, filter: 'highpass', vol: 0.16 })
      addChips(x, ['#d8f3ff', '#a8e0ff', '#ffffff'], 4)
    } else {
      fx.burst(x, y, { count: 12, color: ['#e0a661', '#b57a3c', '#8a5426'], shape: 'square', speed: 420, life: 0.75, size: 12, gravity: 1000 })
      sfx.crunch()
      sfx.tone({ freq: 260, to: 120, dur: 0.1, type: 'triangle', vol: 0.2 })
      addChips(x, ['#e0a661', '#b57a3c', '#8a5426'], 4)
    }
  }

  const checkCleared = () => {
    if (state !== 'live') return
    for (const j of jellies) if (j.alive) return
    state = 'cleared'
    const n = Math.max(1, shotsThisTower)
    const count = n <= 1 ? 3 : n <= 3 ? 2 : 1
    stage.after(0.35, () => {
      starShow = { count, at: stage.time, shots: n }
      if (count === 3) sfx.fanfare()
      else sfx.win()
      fx.confetti(TOWER_X - 160, 300, 40)
      fx.confetti(TOWER_X + 120, 260, 40)
      if (n === 1) {
        fx.confetti(W / 2, 200, 70)
        fx.text(W / 2, 330, 'ONE SHOT!', { color: '#fff3b0', size: 64, life: 1.5 })
      }
      for (let i = 0; i < count; i++) {
        stage.after(0.14 + i * 0.17, () => {
          sfx.ding(i * 2)
          stars++
          starPulse.value = 1.5
        })
      }
    })
    stage.after(1.5, sweepAndBuild)
  }

  // Sweep the rubble away, then build the next tower.
  const sweepAndBuild = () => {
    const left = blocks.filter((b) => b.alive)
    left.forEach((b, i) => {
      stage.after(i * 0.05, () => {
        breakBlock(b, true)
        sfx.pop(i % 10)
      })
    })
    stage.after(left.length * 0.05 + 0.3, () => {
      level++
      levelPulse.value = 1.6
      build()
    })
  }

  // Tapping the castle in the corner skips to a fresh tower: a toy for the
  // child, and a fast-forward for the grown-up rating this.
  const skipTower = () => {
    if (state !== 'live') return
    state = 'cleared'
    for (const j of jellies) {
      if (!j.alive) continue
      j.alive = false
      if (j.placed) removeBody(j.body)
      fx.burst(j.body.position.x, j.body.position.y, { count: 8, color: '#ffffff', speed: 220, life: 0.4, size: 12 })
    }
    sfx.slideUp()
    sweepAndBuild()
  }

  const poof = (j: Jelly) => {
    if (!j.alive) return
    j.alive = false
    if (j.placed) removeBody(j.body)
    const { x, y } = j.body.position
    combo = stage.time - lastPoofAt < 1.8 ? combo + 1 : 0
    lastPoofAt = stage.time
    scoredThisLaunch = true
    const c = JELLY_COLORS[j.hue % JELLY_COLORS.length]!
    fx.burst(x, y, { count: 12, shape: 'star', color: ['#ffe14d', '#fff7b0', '#ffffff'], speed: 460, life: 0.85, size: 18, gravity: 520 })
    fx.burst(x, y, { count: 9, color: [c.fill, c.light], speed: 300, life: 0.5, size: 13 })
    fx.ring(x, y, '#ffffff', 100, 0.35)
    sfx.tone({ freq: rnd(760, 900), to: 300, dur: 0.2, type: 'triangle', vol: 0.18 })
    stage.after(0.07, () => sfx.pop(combo * 2))
    sfx.coin(combo)
    if (combo >= 1) {
      fx.text(x, y - 56, combo === 1 ? 'DOUBLE!' : combo === 2 ? 'TRIPLE!' : `x${combo + 1}!`, { color: '#fff3b0', size: 44 + Math.min(combo, 4) * 8 })
      fx.hitstop(60)
      fx.shake(6 + Math.min(combo, 4) * 2)
    } else {
      fx.text(x, y - 50, pick(['POOF!', 'WAH!', 'BONK!']), { color: '#ffffff', size: 36 })
    }
    checkCleared()
  }

  const doom = (j: Jelly) => {
    if (j.doomedAt >= 0) return
    j.doomedAt = stage.time
    sfx.tone({ freq: rnd(820, 980), to: 420, dur: 0.28, type: 'triangle', vol: 0.12 })
  }

  const spawnShot = (type: ShotKind, x: number, y: number, vx: number, vy: number, used: boolean): Shot => {
    const def = SHOT[type]
    // Shots share a negative group: they pass through each other, never the tower.
    const body = Bodies.circle(x, y, def.r, { density: def.density, friction: 0.5, restitution: 0.35, frictionAir: 0, collisionFilter: { group: -1 } })
    Body.setVelocity(body, { x: vx / 60, y: vy / 60 })
    Composite.add(world, body)
    const shot: Shot = { kind: 'shot', type, body, r: def.r, alive: true, bornAt: stage.time, hitAt: -1, used, wob: spring(1, 260, 9) }
    ents.set(body.id, shot)
    shots.push(shot)
    return shot
  }

  const removeShot = (s: Shot) => {
    if (!s.alive) return
    s.alive = false
    removeBody(s.body)
  }

  // ---------- abilities ----------

  const split = (s: Shot) => {
    const { x, y } = s.body.position
    const v = s.body.velocity
    const speed = Math.max(6, Math.hypot(v.x, v.y)) * 60 * 1.05
    const angle = Math.hypot(v.x, v.y) > 1 ? Math.atan2(v.y, v.x) : -0.5
    removeShot(s)
    ;[-0.24, 0, 0.24].forEach((da, i) => {
      const a = angle + da
      const mini = spawnShot('mini', x + Math.cos(a + Math.PI / 2) * da * 60, y + Math.sin(a + Math.PI / 2) * da * 60, Math.cos(a) * speed, Math.sin(a) * speed, true)
      mini.wob.value = 0.5
      sfx.pop(3 + i * 2)
    })
    fx.ring(x, y, '#bfe2ff', 90, 0.3)
    fx.burst(x, y, { count: 12, color: ['#bfe2ff', '#ffffff', '#3f9dff'], shape: 'spark', speed: 420, life: 0.35, size: 12 })
    sfx.whoosh()
  }

  const explode = (s: Shot) => {
    const { x, y } = s.body.position
    removeShot(s)
    const R = 230
    fx.flash('#fff1c0', 0.55, 0.14)
    fx.shake(20, 0.45)
    fx.hitstop(70)
    fx.ring(x, y, '#ffb02e', R, 0.4)
    fx.ring(x, y, '#ffffff', R * 0.6, 0.3)
    fx.burst(x, y, { count: 26, color: ['#ff7a2e', '#ffd84d', '#fff3a6', '#6b6478'], speed: 640, life: 0.7, size: 20, gravity: 300, drag: 0.93 })
    fx.text(x, y - 40, 'BOOM!', { color: '#ffd84d', size: 60 })
    sfx.noise({ dur: 0.55, freq: 1100, to: 70, filter: 'lowpass', vol: 0.65 })
    sfx.tone({ freq: 150, to: 38, dur: 0.45, type: 'sine', vol: 0.55 })
    if (y > GROUND - 120) addChips(x, ['#3d3a35', '#57514a', '#2e2b28'], 7)
    const push = (body: Matter.Body) => {
      const d = dist(x, y, body.position.x, body.position.y)
      if (d > R) return 0
      const f = 1 - d / R
      const nx = d > 1 ? (body.position.x - x) / d : 0
      const ny = d > 1 ? (body.position.y - y) / d : -1
      const dv = 21 * f * clamp(3 / body.mass, 0.35, 1.4)
      Body.setVelocity(body, { x: body.velocity.x + nx * dv, y: body.velocity.y + ny * dv - 3 * f })
      Body.setAngularVelocity(body, body.angularVelocity + rnd(-0.25, 0.25) * f)
      return f
    }
    for (const b of [...blocks]) {
      if (!b.alive || !b.placed) continue
      const f = push(b.body)
      if (f <= 0) continue
      if (b.mat === 'ice' && f > 0.22) breakBlock(b)
      else if (b.mat === 'wood') {
        b.hp -= f * 1.25
        if (b.hp <= 0) breakBlock(b)
      }
    }
    for (const j of [...jellies]) {
      if (!j.alive || !j.placed) continue
      const f = push(j.body)
      if (f > 0.34) poof(j)
      else if (f > 0) doom(j)
    }
    for (const o of shots) if (o.alive) push(o.body)
  }

  const slam = (s: Shot) => {
    s.used = true
    const v = s.body.velocity
    Body.setVelocity(s.body, { x: v.x * 0.22, y: 27 })
    fx.ring(s.body.position.x, s.body.position.y, '#ff9db0', 80, 0.25)
    sfx.slideDown()
    sfx.whoosh()
    s.wob.value = 1.5
  }

  const trigger = (s: Shot) => {
    taught.add(s.type)
    if (s.type === 'split') split(s)
    else if (s.type === 'bomb') explode(s)
    else if (s.type === 'heavy') slam(s)
  }

  const useAbility = (): boolean => {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]!
      if (s.alive && !s.used && s.hitAt < 0 && (s.type === 'split' || s.type === 'bomb' || s.type === 'heavy')) {
        trigger(s)
        return true
      }
    }
    return false
  }

  // ---------- collisions ----------

  const jellyThreshold = () => Math.max(2.6, 5.2 - 0.45 * shotsThisTower)

  const firstHit = (s: Shot, other: Ent, h: Hit) => {
    s.hitAt = stage.time
    s.body.frictionAir = 0.014
    if (s.type === 'bomb' && !s.used) {
      explode(s)
      return
    }
    if (s.type === 'split' && !s.used) {
      split(s)
      return
    }
    if (h.vn > 5) {
      fx.hitstop(clamp(h.vn * 3, 30, 70))
      fx.shake(clamp(h.vn * 0.55, 3, 12) * (s.type === 'heavy' ? 1.5 : 1))
    }
    if (s.type === 'heavy') {
      // The big one lands like a dropped piano: everything nearby hops.
      sfx.thud(1)
      fx.burst(h.x, h.y, { count: 14, color: ['#fff6df', '#e7d9b8'], speed: 420, life: 0.5, size: 16, angle: -Math.PI / 2, spread: Math.PI * 1.1, gravity: 300 })
      fx.ring(h.x, h.y, '#ffffff', 150, 0.3)
      const reach = s.used ? 240 : 150
      for (const b of blocks) {
        if (!b.alive || !b.placed) continue
        const d = dist(h.x, h.y, b.body.position.x, b.body.position.y)
        if (d < reach) Body.setVelocity(b.body, { x: b.body.velocity.x + rnd(-1, 1), y: b.body.velocity.y - 6 * (1 - d / reach) })
      }
      for (const j of jellies) {
        if (!j.alive || !j.placed) continue
        const d = dist(h.x, h.y, j.body.position.x, j.body.position.y)
        if (d < reach) Body.setVelocity(j.body, { x: j.body.velocity.x + rnd(-2, 2), y: j.body.velocity.y - 9 * (1 - d / reach) })
      }
    } else if (other.kind === 'ground') {
      sfx.thud(clamp(h.vn / 14, 0.3, 0.8))
    }
  }

  const touch = (self: Ent, other: Ent, h: Hit) => {
    if (self.kind === 'shot') {
      if (!self.alive) return
      self.wob.kick(-clamp(h.vn, 0, 12) * 0.9)
      if (self.hitAt < 0) firstHit(self, other, h)
    } else if (self.kind === 'jelly') {
      if (!self.alive || !self.placed) return
      if (other.kind === 'shot' || other.kind === 'ground' || self.doomedAt >= 0 || h.vn > jellyThreshold()) {
        poof(self)
      } else if (h.vn > 1.2) {
        self.wob.kick(-h.vn)
        if (soundBudget > 0) {
          soundBudget--
          squeak(8, 0.07)
        }
      }
    } else if (self.kind === 'block') {
      if (!self.alive || !self.placed) return
      if (h.vn > 1.5) self.pulse.kick(-clamp(h.vn, 0, 10) * 0.5)
      if (self.mat === 'ice') {
        if (h.vn > 5.5 || (other.kind === 'shot' && h.vn > 2.5)) breakBlock(self)
      } else if (self.mat === 'wood' && other.kind === 'shot' && other.alive) {
        const m = (self.body.mass * other.body.mass) / (self.body.mass + other.body.mass)
        self.hp -= Math.max(0, h.vn * m - 8) / 52
        if (self.hp <= 0) breakBlock(self)
      }
    }
  }

  const impactFx = (ea: Ent, eb: Ent, h: Hit) => {
    if (h.vn < 1.7) return
    const block = ea.kind === 'block' ? ea : eb.kind === 'block' ? eb : null
    if (block) matSound(block, clamp(h.vn / 13, 0.1, 1))
    if (h.vn > 3.6 && soundBudget > -4) {
      fx.burst(h.x, h.y, { count: Math.min(7, 2 + Math.round(h.vn * 0.3)), color: ['#fff6df', '#efe3c4'], speed: 70 + h.vn * 16, life: 0.4, size: 9, gravity: 120 })
    }
  }

  const onCollide = (ev: Matter.IEventCollision<Matter.Engine>) => {
    for (const pair of ev.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      const n = pair.collision.normal
      const vn = Math.abs((a.velocity.x - b.velocity.x) * n.x + (a.velocity.y - b.velocity.y) * n.y) * VEL_SCALE
      const s = pair.collision.supports[0]
      hits.push({ a, b, vn, x: s ? s.x : (a.position.x + b.position.x) / 2, y: s ? s.y : (a.position.y + b.position.y) / 2 })
    }
  }
  Events.on(engine, 'collisionStart', onCollide)

  const flushHits = () => {
    if (hits.length === 0) return
    const batch = hits.splice(0, hits.length)
    for (const h of batch) {
      const ea = ents.get(h.a.id)
      const eb = ents.get(h.b.id)
      if (!ea || !eb) continue
      impactFx(ea, eb, h)
      touch(ea, eb, h)
      touch(eb, ea, h)
    }
  }

  // ---------- towers ----------

  function build(): void {
    const spec = towerFor(level, stage.rand)
    state = 'building'
    shotsThisTower = 0
    blocks = blocks.filter((b) => b.alive)
    jellies = []
    ammo = ammoFor(level, stage.rand)
    qi = 0
    const first = ammo[0]!
    if (loaded) loaded.type = first
    queueShift.value = 1
    if (!seen.has(first)) {
      seen.add(first)
      stage.after(0.5, () => {
        fx.text(REST.x + 30, REST.y - 120, 'NEW!', { color: '#fff3b0', size: 48, life: 1.4 })
        fx.burst(REST.x, REST.y, { count: 14, shape: 'star', color: ['#ffe14d', '#ffffff'], speed: 300, life: 0.7, size: 14, gravity: 100 })
        sfx.ding(4)
        loadWob.value = 1.5
      })
    }

    const sorted = [...spec.blocks].sort((p, q) => p.y - p.h / 2 - (q.y - q.h / 2))
    sorted.forEach((s, i) => {
      const body = Bodies.rectangle(TOWER_X + s.x, GROUND - s.y, s.w, s.h, { density: DENSITY[s.mat], friction: 0.78, frictionStatic: 1, restitution: 0.06 })
      const block: Block = { kind: 'block', body, w: s.w, h: s.h, mat: s.mat, hp: 1, alive: true, placed: false, shown: false, drop: -520, pulse: spring(1, 300, 12), soundAt: -1, img: blockSprite(s.mat, s.w, s.h) }
      blocks.push(block)
      stage.after(0.1 + i * 0.07, () => {
        block.shown = true
        stage.tween(0.24, (t) => (block.drop = -520 * (1 - t)), ease.inQuad, () => {
          if (!block.alive) return
          block.drop = 0
          block.placed = true
          Composite.add(world, body)
          ents.set(body.id, block)
          block.pulse.value = 0.78
          // The construction jingle: each piece lands one note higher.
          sfx.note(-5 + i, 0.14, 'triangle', 0.16)
          sfx.noise({ dur: 0.03, freq: 900, filter: 'lowpass', vol: 0.1 })
          fx.burst(body.position.x, body.position.y + s.h / 2, { count: 4, color: '#fff6df', speed: 140, life: 0.3, size: 8, angle: -Math.PI / 2, spread: Math.PI, gravity: 100 })
        })
      })
    })
    const base = 0.1 + sorted.length * 0.07 + 0.3
    const hueStart = Math.floor(stage.rand() * 4)
    spec.jellies.forEach((s, k) => {
      const body = Bodies.circle(TOWER_X + s.x, GROUND - s.y, JR, { density: 0.0005, friction: 0.7, frictionStatic: 1, restitution: 0.25, frictionAir: 0.015 })
      const jelly: Jelly = { kind: 'jelly', body, hue: hueStart + k, alive: true, placed: false, shown: false, drop: -520, wob: spring(1, 210, 8), homeX: TOWER_X + s.x, homeY: GROUND - s.y, doomedAt: -1, teaseUntil: 0, seed: k * 2.3 + level }
      jellies.push(jelly)
      stage.after(base + k * 0.13, () => {
        jelly.shown = true
        stage.tween(0.26, (t) => (jelly.drop = -520 * (1 - t)), ease.inQuad, () => {
          if (!jelly.alive) return
          jelly.drop = 0
          jelly.placed = true
          Composite.add(world, body)
          ents.set(body.id, jelly)
          jelly.wob.value = 0.6
          sfx.boing(k * 2)
          if (k === spec.jellies.length - 1) {
            state = 'live'
            checkCleared()
          }
        })
      })
    })
  }

  // ---------- the slingshot ----------

  const aimOf = (dx: number, dy: number) => {
    const len = Math.hypot(dx, dy)
    const power = clamp((len - MIN_PULL) / (MAX_PULL - MIN_PULL), 0, 1)
    const speed = lerp(MIN_SPEED, MAX_SPEED, power)
    const nx = len > 0.01 ? -dx / len : 1
    const ny = len > 0.01 ? -dy / len : 0
    return { len, power, vx: nx * speed, vy: ny * speed }
  }

  const updatePull = (p: Pointer) => {
    if (!pull) return
    let dx = pull.absolute ? p.x - REST.x : p.x - p.startX
    let dy = pull.absolute ? p.y - REST.y : p.y - p.startY
    const raw = Math.hypot(dx, dy)
    // A small child may drag towards the tower instead of away from it. Both
    // work: dragging forwards aims where the finger points.
    if (pull.mode === 'undecided' && raw > 40) pull.mode = dx > Math.abs(dy) * 0.7 ? 'throw' : 'pull'
    if (pull.mode === 'throw') {
      dx = -dx
      dy = -dy
    }
    dx = Math.min(dx, 0)
    let len = Math.hypot(dx, dy)
    if (len > MAX_PULL) {
      dx *= MAX_PULL / len
      dy *= MAX_PULL / len
      len = MAX_PULL
    }
    // Never straight up or straight down: every fling goes towards the tower.
    if (-dx < 0.3 * len) {
      dx = -0.3 * len
      dy = (dy < 0 ? -1 : 1) * 0.954 * len
    }
    if (REST.y + dy > GROUND - 24) dy = GROUND - 24 - REST.y
    pull.dx = dx
    pull.dy = dy
    const power = aimOf(dx, dy).power
    const step = Math.floor(power * 9)
    if (step !== pull.step && len > MIN_PULL) {
      // The creature squeaks higher and louder the further back it goes.
      if (step > pull.step) squeak(step, 0.05 + power * 0.16)
      sfx.noise({ dur: 0.05, freq: 260 + power * 500, filter: 'bandpass', q: 3, vol: 0.06 + power * 0.06 })
      pull.step = step
    }
  }

  const reload = () => {
    if (loaded) return
    qi++
    const next = { type: ammo[qi % ammo.length]!, hop: 0 }
    loaded = next
    queueShift.value = 1
    stage.tween(0.3, (t) => (next.hop = t), ease.linear, () => {
      next.hop = 1
      loadWob.value = 0.7
    })
    sfx.boing(Math.round(rnd(0, 3)))
  }

  const launch = (dx: number, dy: number) => {
    if (!loaded) return
    const aim = aimOf(dx, dy)
    const type = loaded.type
    loaded = null
    launches++
    shotsThisTower++
    const seq = ++launchSeq
    scoredThisLaunch = false
    trail = []
    spawnShot(type, pouch.x, pouch.y, aim.vx, aim.vy, false)
    // The band snaps forward past the fork and twangs.
    pouch.vx = aim.vx * 0.9
    pouch.vy = aim.vy * 0.9
    sfx.whoosh()
    sfx.tone({ freq: 520, to: 1080 + aim.power * 300, dur: 0.24, type: 'triangle', vol: 0.12 + aim.power * 0.08 })
    sfx.tone({ freq: 150, to: 90, dur: 0.12, type: 'sawtooth', vol: 0.08 })
    fx.burst(pouch.x, pouch.y, { count: 8, color: '#ffffff', speed: 260, life: 0.3, size: 9, angle: Math.atan2(-aim.vy, -aim.vx), spread: 1.2 })
    stage.after(0.28, reload)
    // A clean miss gets laughed at, which is the cue to try again.
    stage.after(2.0, () => {
      if (seq !== launchSeq || scoredThisLaunch || state !== 'live') return
      let k = 0
      for (const j of jellies) {
        if (!j.alive || j.doomedAt >= 0) continue
        j.teaseUntil = stage.time + 1.1
        j.wob.kick(3)
        k++
      }
      if (k > 0) {
        sfx.tone({ freq: 520, to: 440, dur: 0.11, type: 'square', vol: 0.05 })
        sfx.tone({ freq: 520, to: 400, dur: 0.14, type: 'square', vol: 0.05, delay: 0.15 })
      }
      // Mercy, played for laughs: after a lot of misses a jelly laughs so
      // hard it falls over, so nobody is ever stuck on a tower.
      if (k > 0 && shotsThisTower >= 6) {
        const victim = jellies.find((j) => j.alive && j.placed && j.doomedAt < 0)
        if (victim) {
          stage.after(0.7, () => {
            if (!victim.alive) return
            fx.text(victim.body.position.x, victim.body.position.y - 70, 'HA HA... OOPS!', { color: '#ffffff', size: 34, life: 1.1 })
            poof(victim)
          })
        }
      }
    })
  }

  const poke = (p: Pointer): boolean => {
    for (const j of jellies) {
      if (!j.alive || !j.placed) continue
      if (dist(p.x, p.y, j.body.position.x, j.body.position.y) < JR + 26) {
        j.teaseUntil = stage.time + 0.9
        j.wob.value = 0.6
        sfx.tone({ freq: 96, to: 70, dur: 0.24, type: 'sawtooth', vol: 0.1 })
        sfx.boing(Math.round(rnd(2, 5)))
        fx.text(j.body.position.x, j.body.position.y - 50, '😝', { size: 40, life: 0.7 })
        return true
      }
    }
    for (const b of blocks) {
      if (!b.alive || !b.placed) continue
      const ox = p.x - b.body.position.x
      const oy = p.y - b.body.position.y
      const c = Math.cos(-b.body.angle)
      const s = Math.sin(-b.body.angle)
      if (Math.abs(ox * c - oy * s) < b.w / 2 + 10 && Math.abs(ox * s + oy * c) < b.h / 2 + 10) {
        b.pulse.value = 0.8
        b.soundAt = -1
        lastClonkAt = -1
        soundBudget = Math.max(soundBudget, 1)
        matSound(b, 0.6)
        fx.burst(p.x, p.y, { count: 4, color: '#fff6df', speed: 120, life: 0.3, size: 8 })
        return true
      }
    }
    return false
  }

  build()

  // ---------- drawing helpers ----------

  const drawBlock = (g: CanvasRenderingContext2D, b: Block) => {
    const { x, y } = b.body.position
    g.save()
    g.translate(x, y + b.drop)
    g.rotate(b.body.angle)
    const p = b.pulse.value
    if (Math.abs(p - 1) > 0.01) g.scale(2 - p, p)
    g.drawImage(b.img, -b.w / 2 - BLOCK_PAD, -b.h / 2 - BLOCK_PAD)
    if (b.mat === 'wood' && b.hp < 0.62) {
      // A cracked plank is one more good hit from splinters.
      g.strokeStyle = '#5a3412'
      g.lineWidth = 3
      g.beginPath()
      const wide = b.w >= b.h
      const span = (wide ? b.h : b.w) / 2 - 3
      const at = (wide ? b.w : b.h) * 0.12
      const pts = [-span, -span * 0.3, span * 0.2, span]
      pts.forEach((o, i) => {
        const along = at + (i % 2 === 0 ? -5 : 6)
        if (wide) {
          if (i === 0) g.moveTo(along, o)
          else g.lineTo(along, o)
        } else if (i === 0) g.moveTo(o, along)
        else g.lineTo(o, along)
      })
      g.stroke()
    }
    g.restore()
  }

  const flying = (): Shot | null => {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]!
      if (s.alive && s.hitAt < 0) return s
    }
    return null
  }

  const drawDots = (g: CanvasRenderingContext2D, dx: number, dy: number, alpha: number) => {
    const aim = aimOf(dx, dy)
    if (aim.len < MIN_PULL) return
    const x0 = REST.x + dx
    const y0 = REST.y + dy
    const phase = (stage.time * 1.6) % 1
    for (let i = 0; i < 12; i++) {
      const t = (i + phase) * 0.062 + 0.05
      const x = x0 + aim.vx * t
      const y = y0 + aim.vy * t + 0.5 * G * t * t
      if (y > GROUND - 6 || x > W - 10) break
      const fade = 1 - (i + phase) / 12.5
      const r = 4 + 6 * fade
      g.globalAlpha = alpha * Math.min(1, fade * 1.6)
      g.beginPath()
      g.arc(x, y, r + 2.5, 0, TAU)
      g.fillStyle = 'rgba(40,50,90,0.55)'
      g.fill()
      g.beginPath()
      g.arc(x, y, r, 0, TAU)
      g.fillStyle = '#ffffff'
      g.fill()
    }
    g.globalAlpha = 1
  }

  return {
    update(dt) {
      const time = stage.time
      soundBudget = 3

      acc += dt
      let steps = 0
      while (acc >= SUB && steps < 5) {
        Engine.update(engine, SUB * 1000)
        acc -= SUB
        steps++
        flushHits()
      }
      if (acc > SUB) acc = 0

      // Shots: trails, automatic powers, tidy-up.
      trailAcc += dt
      const mark = trailAcc > 0.032
      if (mark) trailAcc = 0
      let anyDead = false
      for (const s of [...shots]) {
        if (!s.alive) {
          anyDead = true
          continue
        }
        s.wob.update(dt)
        const { x, y } = s.body.position
        if (s.hitAt < 0) {
          if (mark && trail.length < 170) trail.push({ x, y })
          if (s.type === 'split' && !s.used && time - s.bornAt > 0.12) {
            // Splits by itself just before it arrives, so there is always a payoff.
            let near = false
            for (const b of blocks) if (b.alive && b.placed && dist(x, y, b.body.position.x, b.body.position.y) < 150 + Math.max(b.w, b.h) / 2) near = true
            for (const j of jellies) if (j.alive && j.placed && dist(x, y, j.body.position.x, j.body.position.y) < 170) near = true
            if (near) split(s)
          }
        } else if (time - s.hitAt > 2.3) {
          fx.burst(x, y, { count: 7, color: '#ffffff', speed: 160, life: 0.35, size: 11, gravity: -40 })
          sfx.noise({ dur: 0.07, freq: 900, filter: 'lowpass', vol: 0.06 })
          removeShot(s)
        }
        if (s.alive && (x < -200 || x > W + 220 || y > H + 200)) removeShot(s)
      }
      if (anyDead) shots = shots.filter((s) => s.alive)

      // Jellies: knocked off its perch means done for.
      for (const j of [...jellies]) {
        j.wob.update(dt)
        if (!j.alive || !j.placed) continue
        const pos = j.body.position
        if (pos.x < -80 || pos.x > W + 80 || pos.y > H) {
          poof(j)
          continue
        }
        if (j.doomedAt < 0) {
          if (pos.y > j.homeY + 48 || Math.abs(pos.x - j.homeX) > 70 || j.body.speed > 8.5) doom(j)
        } else if (time - j.doomedAt > 0.9) {
          poof(j)
        }
      }
      for (const b of blocks) {
        b.pulse.update(dt)
        if (!b.alive || !b.placed) continue
        const pos = b.body.position
        if (pos.x < -200 || pos.x > W + 220 || pos.y > H + 100) {
          b.alive = false
          removeBody(b.body)
        }
      }

      // The pouch follows the finger tightly, and twangs home when let go.
      if (pull && !stage.pointers.has(pull.id)) pull = null
      const idle = time - lastTouchAt
      const hintAfter = launches === 0 ? 2.2 : 6
      demo = null
      if (!pull && loaded && loaded.hop >= 1 && idle > hintAfter && state !== 'cleared') {
        const t = (idle - hintAfter) % 2.8
        const k = t < 1 ? ease.inOutQuad(t) : t < 1.8 ? 1 : 0
        if (k > 0) demo = { dx: -128 * k, dy: 62 * k + (t >= 1 ? Math.sin(time * 9) * 3 : 0) }
      }
      const pv = pull ?? demo
      if (pv) {
        pouch.x = damp(pouch.x, REST.x + pv.dx, 40, dt)
        pouch.y = damp(pouch.y, REST.y + pv.dy, 40, dt)
        pouch.vx = 0
        pouch.vy = 0
      } else {
        pouch.vx += ((REST.x - pouch.x) * 900 - pouch.vx * 16) * dt
        pouch.vy += ((REST.y - pouch.y) * 900 - pouch.vy * 16) * dt
        pouch.x += pouch.vx * dt
        pouch.y += pouch.vy * dt
      }
      loadWob.update(dt)
      queueShift.update(dt)
      starPulse.update(dt)
      levelPulse.update(dt)

      // Alive at idle: now and then a jelly pulls a face.
      if (time > nextTauntAt) {
        nextTauntAt = time + rnd(5, 9)
        const alive = jellies.filter((j) => j.alive && j.placed && j.doomedAt < 0)
        if (alive.length > 0 && idle > 3 && state === 'live') {
          const j = pick(alive)
          j.teaseUntil = time + 1
          j.wob.kick(4)
          sfx.tone({ freq: 500, to: 430, dur: 0.1, type: 'square', vol: 0.035 })
        }
      }
    },

    draw(g) {
      const time = stage.time
      g.drawImage(backdrop, 0, 0)
      for (const c of CLOUDS) drawCloud(g, ((c.x + time * c.v + 160) % (W + 320)) - 160, c.y, c.s)

      for (const c of chips) {
        g.save()
        g.translate(c.x, c.y)
        g.rotate(c.rot)
        g.fillStyle = c.color
        g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h)
        g.restore()
      }

      // The path of the last fling stays in the sky: aim a little different next time.
      g.fillStyle = 'rgba(255,255,255,0.75)'
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i]!
        g.beginPath()
        g.arc(p.x, p.y, i % 2 === 0 ? 5 : 3.5, 0, TAU)
        g.fill()
      }

      const fly = flying()
      const lookAt = fly ? fly.body.position : time < finger.until ? finger : null

      for (const b of blocks) if (b.alive && b.shown) drawBlock(g, b)

      for (const j of jellies) {
        if (!j.alive || !j.shown) continue
        const { x, y } = j.body.position
        const doomed = j.doomedAt >= 0
        const mood: JellyMood = doomed ? 'wow' : time < j.teaseUntil ? 'yum' : fly ? 'wow' : 'smug'
        const tx = lookAt ? lookAt.x : REST.x
        const ty = lookAt ? lookAt.y : REST.y
        const d = Math.max(1, dist(x, y, tx, ty))
        const breathe = 1 + Math.sin(time * 2.4 + j.seed) * 0.035
        const sy = j.wob.value * breathe * (doomed ? 1.12 : 1)
        const sx = 1 / Math.sqrt(Math.max(0.3, sy))
        const flail = doomed ? Math.sin(time * 30 + j.seed) * 0.8 : Math.sin(time * 1.7 + j.seed) * 0.5
        drawJelly(g, x, y + j.drop, JR, j.hue, sx, sy, mood, ((tx - x) / d) * 0.9, ((ty - y) / d) * 0.9, blinkAt(time, j.seed), flail)
      }

      for (const s of shots) {
        if (!s.alive) continue
        const { x, y } = s.body.position
        const v = s.body.velocity
        const speed = Math.hypot(v.x, v.y)
        const inFlight = s.hitAt < 0
        const pop = s.wob.value
        const draw = () => {
          drawShot(g, s.type, x, y, s.r * (0.6 + 0.4 * clamp(pop, 0.5, 1.4)), {
            rot: inFlight ? 0 : s.body.angle,
            mood: inFlight ? 'wow' : ('dizzy' as Mood),
            lookX: 0.8,
            lookY: clamp(v.y / 12, -0.8, 0.8),
            blink: 0,
            time,
          })
        }
        if (inFlight && speed > 2) stretchAlong(g, x, y, Math.atan2(v.y, v.x), 1 + clamp(speed / 22, 0, 1) * 0.24, draw)
        else draw()
        if (inFlight && !s.used && s.type !== 'basic' && s.type !== 'mini' && !taught.has(s.type)) {
          // First flights of a new creature: a ring that says "tap now".
          const t = (time * 2.4) % 1
          g.globalAlpha = 1 - t
          g.strokeStyle = '#ffffff'
          g.lineWidth = 6
          g.beginPath()
          g.arc(x, y, s.r + 12 + t * 34, 0, TAU)
          g.stroke()
          g.globalAlpha = 1
          sprite(g, '👆', x + 30, y + 58, 50)
        }
      }

      // The slingshot, the creature in it, and the ones waiting their turn.
      const pv = pull ?? demo
      const aim = pv ? aimOf(pv.dx, pv.dy) : null
      const power = aim ? aim.power : 0
      const tension = clamp(dist(pouch.x, pouch.y, REST.x, REST.y) / MAX_PULL, 0, 1)
      const n = ammo.length
      for (let i = 1; i >= 0; i--) {
        const type = ammo[(qi + 1 + i) % n]!
        const r = SHOT[type].r * 0.86
        const x = 122 - (i + queueShift.value) * 66
        const hop = Math.abs(Math.sin(time * 3.2 + i * 1.4)) * 7
        drawShot(g, type, x, GROUND - r - hop, r, { rot: 0, mood: 'happy', lookX: 0.7, lookY: -0.2, blink: blinkAt(time, i + 5), time })
      }
      drawSlingBack(g, pouch.x, pouch.y, tension)
      if (loaded) {
        const r = SHOT[loaded.type].r
        let x = pouch.x
        let y = pouch.y - 4
        if (loaded.hop < 1) {
          const t = loaded.hop
          x = lerp(122, pouch.x, t)
          y = lerp(GROUND - r, pouch.y - 4, t) - Math.sin(t * Math.PI) * 110
        }
        const tremble = power > 0.6 ? Math.sin(time * 70) * (power - 0.6) * 4 : 0
        const breathe = loadWob.value * (1 + Math.sin(time * 3) * 0.03)
        const look = pv ? 0.9 : time < finger.until ? clamp((finger.x - x) / 300, -1, 1) : 0.7
        const drawIt = () =>
          drawShot(g, loaded!.type, x + tremble, y, r * breathe, {
            rot: loaded!.hop < 1 ? loaded!.hop * TAU : 0,
            mood: pv && power > 0.05 ? 'wow' : 'happy',
            lookX: look,
            lookY: pv ? -0.3 : 0,
            blink: pv ? power * 0.66 : blinkAt(time, 1),
            time,
          })
        if (pv && aim && aim.len > 8) stretchAlong(g, x, y, Math.atan2(pv.dy, pv.dx), 1 + power * 0.22, drawIt)
        else drawIt()
      }
      drawSlingFront(g, pouch.x, pouch.y, tension)
      if (pv) drawDots(g, pv.dx, pv.dy, pull ? 1 : 0.85)
      if (demo && !pull) sprite(g, '👆', pouch.x - 6, pouch.y + 56 + Math.sin(time * 6) * 3, 72)

      // The tally.
      label(g, `🏰 ${level + 1}`, 92, 56, 42 * levelPulse.value)
      label(g, `⭐ ${stars}`, W - 100, 56, 42 * starPulse.value)

      if (starShow) {
        const age = time - starShow.at
        if (age > 2.1) starShow = null
        else {
          g.globalAlpha = age > 1.7 ? clamp(1 - (age - 1.7) / 0.4, 0, 1) : 1
          for (let i = 0; i < 3; i++) {
            const t = clamp((age - 0.14 - i * 0.17) / 0.32, 0, 1)
            const earned = i < starShow.count
            const s = earned ? ease.outBack(t) : 1
            const x = W / 2 + (i - 1) * 124
            const y = 214 - (i === 1 ? 22 : 0)
            if (!earned) star(g, x, y, 40, 'rgba(255,255,255,0.4)', (i - 1) * 0.22)
            if (earned && t > 0) {
              star(g, x, y, 62 * s, '#c47a00', (i - 1) * 0.22)
              star(g, x, y, 50 * s, '#ffd83d', (i - 1) * 0.22)
              star(g, x - 3, y - 4, 26 * s, '#fff1a0', (i - 1) * 0.22)
            }
          }
          g.globalAlpha = 1
        }
      }
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      finger.x = p.x
      finger.y = p.y
      finger.until = stage.time + 1.5
      fx.ring(p.x, p.y, '#ffffff', 46, 0.3)
      if (dist(p.x, p.y, 92, 56) < 64) {
        levelPulse.value = 1.4
        skipTower()
        return
      }
      const used = useAbility()
      const poked = used ? false : poke(p)
      if (!used && !poked) {
        squeak(Math.round(rnd(0, 3)))
        loadWob.value = 0.78
        fx.burst(p.x, p.y, { count: 4, color: '#ffffff', speed: 120, life: 0.3, size: 7 })
      }
      if (!pull) pull = { id: p.id, absolute: dist(p.x, p.y, pouch.x, pouch.y) < 150, mode: 'undecided', dx: 0, dy: 0, step: 0 }
    },

    move(p: Pointer) {
      lastTouchAt = stage.time
      finger.x = p.x
      finger.y = p.y
      finger.until = stage.time + 1.5
      if (pull && pull.id === p.id) updatePull(p)
    },

    up(p: Pointer) {
      lastTouchAt = stage.time
      if (!pull || pull.id !== p.id) return
      updatePull(p)
      const { dx, dy } = pull
      pull = null
      const len = Math.hypot(dx, dy)
      if (len >= MIN_PULL && loaded) launch(dx, dy)
      else if (len > 6) sfx.boing(-2)
    },

    dispose() {
      Events.off(engine, 'collisionStart', onCollide)
      Composite.clear(world, false)
      Engine.clear(engine)
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'slingshot-smash',
    name: 'Slingshot Smash',
    emoji: '🏰',
    ages: [4, 9],
    pitch: 'Pull back the slingshot and fling creatures at a wobbly tower full of smug jelly monsters.',
    howTo: 'Drag back from the slingshot and let go. Tap while a new creature is flying to use its trick. Tap the castle in the corner to skip to a fresh tower.',
    basedOn: 'Angry Birds',
    whyFun: 'Stretch, release, and a tower that really falls down: anticipation, a big physical payoff, and a different collapse every time.',
  },
  create,
}
