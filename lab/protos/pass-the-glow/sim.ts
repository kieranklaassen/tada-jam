// Pass the Glow. Four creatures share a night field. One of them glows: that is
// the It, and the finger steers it. Touch a runner and the glow (and the finger)
// jumps into that runner's body while the old It scampers off the way it always
// does. Each body handles differently (speed, slip, reach, how loudly it spooks
// the others) and each runner has its own habit when the glow comes near:
//
//   hare      bolts away, doubles back past where it started, then catches its breath
//   tortoise  freezes in its shell (untouchable) if rushed; plods away if crept up on
//   magpie    runs toward whoever tagged it (flees plainly if nobody ever did)
//   mouse     dashes into a burrow, hides, and pops out of the OTHER burrow
//
// Pure and deterministic: a seeded rng and a tick count, nothing else. Touching
// the sim's state happens only in step() and pointer(); affordances(), observe()
// (bar draining the event queue), and snapshot() never change the world.

import { between, createRng, int } from '../../kit/rng.ts'
import type { Rng } from '../../kit/rng.ts'
import { FIELD_H, FIELD_W, TICK_MS } from '../../kit/sim.ts'
import type { Affordance, AffordanceKind, CreateSim, Observation, PointerInput, Sim, SimEvent } from '../../kit/sim.ts'

export type Kind = 'hare' | 'tortoise' | 'magpie' | 'mouse'
export const KINDS: readonly Kind[] = ['hare', 'tortoise', 'magpie', 'mouse']

type Mode =
  | 'it'
  | 'graze'
  | 'bolt'
  | 'double'
  | 'breathe'
  | 'shell'
  | 'plod'
  | 'home'
  | 'perch'
  | 'flee'
  | 'dash'
  | 'hidden'
  | 'pop'

// What each body is like to wear (speed in px per second; r, grab, fear in px).
// `fear` is how far away the other creatures notice this body when it is the
// glow; `grab` is the extra reach past touching. `agility` is how fast the
// velocity follows the finger (low is slippery).
interface Body {
  r: number
  speed: number
  agility: number
  grab: number
  fear: number
  graze: number
}
export const BODY: Record<Kind, Body> = {
  hare: { r: 36, speed: 260, agility: 0.14, grab: 14, fear: 320, graze: 75 },
  tortoise: { r: 42, speed: 85, agility: 0.45, grab: 28, fear: 130, graze: 45 },
  magpie: { r: 32, speed: 195, agility: 0.22, grab: 20, fear: 230, graze: 95 },
  mouse: { r: 28, speed: 160, agility: 0.35, grab: 12, fear: 160, graze: 140 },
}

const DT = TICK_MS / 1000
const MARGIN = 24
const BOLT_TICKS = 20
const DOUBLE_TICKS = 24
const BREATHE_TICKS = 20
const BOLT_SPEED = 440
const DOUBLE_SPEED = 400
const SHELL_TICKS = 48
const PLOD_TICKS = 75
const PLOD_SPEED = 95
// The tortoise only tucks in if the glow is moving faster than this.
const SHELL_IF_FASTER = 100
const HOME_MAX_TICKS = 70
const HOME_SPEED = 270
const HOME_ARRIVE = 200
const PERCH_TICKS = 36
const FLEE_TICKS = 24
const FLEE_SPEED = 285
const DASH_SPEED = 340
const HIDE_TICKS = 54
const POP_TICKS = 14
const FLASH_TICKS = 40
// The freshly lit glow is dazzled for a moment: it cannot tag again at once.
const SETTLE_TICKS = 24
const GOLDEN_TICKS = 150
const HINT_AFTER_TICKS = 150
// The browser view never calls observe(), so the queue must not grow forever.
const MAX_EVENTS = 64

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

interface Critter {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  r: number
  mode: Mode
  timer: number
  // The direction this creature means to go (a bolt, a double-back).
  heading: number
  // Ticks before an ordinary habit can trigger again.
  cool: number
  // Index of the creature that last tagged it, or -1.
  tagger: number
  wander: number
  wanderAngle: number
  wanderScale: number
  burrow: number
  // Pressed against a wall it wanted to go through.
  blocked: boolean
}

// Plain data the view draws from.
export interface PassSnapshot {
  tick: number
  it: number
  critters: Array<{
    kind: Kind
    x: number
    y: number
    r: number
    vx: number
    vy: number
    mode: string
    safe: boolean
    hidden: boolean
    alert: boolean
    tagger: number
  }>
  burrows: Array<{ x: number; y: number }>
  goal: { x: number; y: number } | null
  // The glow's jump, for a fading trail; null once it is old.
  flash: { fromX: number; fromY: number; toX: number; toY: number; age: number } | null
  // Null when the sweep hook is removed.
  been: boolean[] | null
  sweeps: number | null
  golden: boolean
  tags: number
  // Where the idle hint points, or null. Only ever set when config.hints is on.
  hint: { x: number; y: number } | null
}

function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i--) {
    const j = int(rng, 0, i)
    const keep = list[i]!
    list[i] = list[j]!
    list[j] = keep
  }
  return list
}

const SLOTS = [
  { x: 260, y: 210 },
  { x: 920, y: 210 },
  { x: 260, y: 610 },
  { x: 920, y: 610 },
]

export const createSim: CreateSim<PassSnapshot> = (config): Sim<PassSnapshot> => {
  const rng = createRng(config.seed)
  const hooks = new Set(config.hooks)

  const critters: Critter[] = shuffled(rng, KINDS).map((kind, i) => ({
    kind,
    x: SLOTS[i]!.x + between(rng, -90, 90),
    y: SLOTS[i]!.y + between(rng, -90, 90),
    vx: 0,
    vy: 0,
    r: BODY[kind].r,
    mode: 'graze',
    timer: 0,
    heading: between(rng, -Math.PI, Math.PI),
    cool: 0,
    tagger: -1,
    wander: int(rng, 5, 40),
    wanderAngle: between(rng, -Math.PI, Math.PI),
    wanderScale: 1,
    burrow: 0,
    blocked: false,
  }))
  const burrows = [
    { x: between(rng, 120, 300), y: between(rng, 140, 680) },
    { x: between(rng, 880, 1060), y: between(rng, 140, 680) },
  ]

  let it = int(rng, 0, critters.length - 1)
  critters[it]!.mode = 'it'
  let goal: { x: number; y: number } | null = null
  const down = new Set<number>()
  let pending: SimEvent[] = []
  let tick = 0
  let idle = 0
  let passAge = 1e6
  let tags = 0
  let sweeps = 0
  let golden = 0
  let settle = 0
  let flash: { fromX: number; fromY: number; toX: number; toY: number } | null = null
  const tried = new Set<number>([it])
  let been = new Set<number>([it])

  const push = (kind: SimEvent['kind'], name: string) => {
    if (pending.length >= MAX_EVENTS) pending.shift()
    pending.push({ kind, name })
  }
  const emit = (name: string) => push('state', name)
  const emitHook = (name: string) => push('hook', name)

  const fearRadius = () => BODY[critters[it]!.kind].fear * (golden > 0 ? 0.8 : 1)

  // ---- movement ----------------------------------------------------------

  const stand = (c: Critter) => {
    c.vx = 0
    c.vy = 0
    c.blocked = false
  }

  // Walk in a direction. A wall the creature is already against turns the walk
  // into a slower slide along it; a corner stops it dead.
  const walk = (c: Critter, angle: number, speed: number) => {
    let dx = Math.cos(angle)
    let dy = Math.sin(angle)
    const lo = c.r + MARGIN
    const hiX = FIELD_W - lo
    const hiY = FIELD_H - lo
    const blockX = (c.x <= lo + 1 && dx < 0) || (c.x >= hiX - 1 && dx > 0)
    const blockY = (c.y <= lo + 1 && dy < 0) || (c.y >= hiY - 1 && dy > 0)
    let s = speed
    if (blockX && blockY) {
      dx = 0
      dy = 0
    } else if (blockX) {
      dy = dy === 0 ? (c.y < FIELD_H / 2 ? 1 : -1) : Math.sign(dy)
      dx = 0
      s *= 0.6
    } else if (blockY) {
      dx = dx === 0 ? (c.x < FIELD_W / 2 ? 1 : -1) : Math.sign(dx)
      dy = 0
      s *= 0.6
    }
    c.blocked = blockX || blockY
    c.vx = dx * s
    c.vy = dy * s
    c.x = clamp(c.x + c.vx * DT, lo, hiX)
    c.y = clamp(c.y + c.vy * DT, lo, hiY)
  }

  const away = (c: Critter): number => {
    const itc = critters[it]!
    return dist(c, itc) < 1e-6 ? c.heading : Math.atan2(c.y - itc.y, c.x - itc.x)
  }
  const toward = (c: Critter, p: { x: number; y: number }): number => Math.atan2(p.y - c.y, p.x - c.x)

  const wander = (c: Critter) => {
    if (c.wander <= 0) {
      c.wander = c.kind === 'mouse' ? int(rng, 15, 45) : int(rng, 30, 90)
      const nearWall = c.x < 150 || c.x > FIELD_W - 150 || c.y < 150 || c.y > FIELD_H - 150
      c.wanderAngle = nearWall
        ? Math.atan2(FIELD_H / 2 - c.y, FIELD_W / 2 - c.x) + between(rng, -1.2, 1.2)
        : between(rng, -Math.PI, Math.PI)
      c.wanderScale = rng() < 0.3 ? 0 : 1
    }
    c.wander--
    if (c.wanderScale === 0) stand(c)
    else walk(c, c.wanderAngle, BODY[c.kind].graze)
  }

  // The finger steers the glow: it heads for the touch point, as fast as its
  // body allows, more slowly the closer the finger is.
  const moveIt = () => {
    const c = critters[it]!
    const body = BODY[c.kind]
    let wantX = 0
    let wantY = 0
    if (goal) {
      const dx = goal.x - c.x
      const dy = goal.y - c.y
      const d = Math.hypot(dx, dy)
      if (d > 4) {
        const s = Math.min(body.speed * (golden > 0 ? 1.25 : 1), d * 8)
        wantX = (dx / d) * s
        wantY = (dy / d) * s
      }
    }
    c.vx += (wantX - c.vx) * body.agility
    c.vy += (wantY - c.vy) * body.agility
    const lo = c.r + MARGIN
    const nx = c.x + c.vx * DT
    const ny = c.y + c.vy * DT
    c.x = clamp(nx, lo, FIELD_W - lo)
    c.y = clamp(ny, lo, FIELD_H - lo)
    if (c.x !== nx) c.vx = 0
    if (c.y !== ny) c.vy = 0
  }

  // ---- habits ------------------------------------------------------------

  const startBolt = (c: Critter) => {
    c.heading = away(c) + between(rng, -0.5, 0.5)
    c.mode = 'bolt'
    c.timer = BOLT_TICKS
    emit('bolt')
  }
  const startShell = (c: Critter) => {
    c.mode = 'shell'
    c.timer = SHELL_TICKS
    stand(c)
    emit('shell')
  }
  const startPlod = (c: Critter) => {
    c.mode = 'plod'
    c.timer = PLOD_TICKS
    emit('plod')
  }
  const startHome = (c: Critter) => {
    if (c.tagger >= 0) {
      c.mode = 'home'
      c.timer = HOME_MAX_TICKS
      emit('home')
    } else {
      c.mode = 'flee'
      c.timer = FLEE_TICKS
      emit('flee')
    }
  }
  const startDash = (c: Critter) => {
    c.burrow = dist(c, burrows[0]!) <= dist(c, burrows[1]!) ? 0 : 1
    c.mode = 'dash'
    c.timer = 80
    emit('dash')
  }

  // The old It's scamper: its own habit, started at once.
  const scamper = (c: Critter) => {
    c.cool = 0
    c.wander = 0
    if (c.kind === 'hare') startBolt(c)
    else if (c.kind === 'tortoise') startShell(c)
    else if (c.kind === 'magpie') startHome(c)
    else startDash(c)
  }

  const hare = (c: Critter, alert: boolean) => {
    if (c.mode === 'bolt') {
      walk(c, c.heading, BOLT_SPEED)
      if (--c.timer <= 0) {
        c.mode = 'double'
        // Back the way it came, but swinging wide of the chaser to one side.
        c.heading += Math.PI + (rng() < 0.5 ? -1 : 1) * between(rng, 0.25, 0.6)
        c.timer = DOUBLE_TICKS
        emit('double')
      }
    } else if (c.mode === 'double') {
      walk(c, c.heading, DOUBLE_SPEED)
      if (--c.timer <= 0) {
        c.mode = 'breathe'
        c.timer = BREATHE_TICKS
      }
    } else if (c.mode === 'breathe') {
      stand(c)
      if (--c.timer <= 0) c.mode = 'graze'
    } else if (alert && c.cool <= 0) startBolt(c)
    else wander(c)
  }

  const tortoise = (c: Critter, alert: boolean) => {
    if (c.mode === 'shell') {
      stand(c)
      if (--c.timer <= 0) startPlod(c)
    } else if (c.mode === 'plod') {
      walk(c, away(c), PLOD_SPEED)
      if (--c.timer <= 0) {
        c.mode = 'graze'
        c.cool = 20
      }
    } else if (alert && c.cool <= 0) {
      if (Math.hypot(critters[it]!.vx, critters[it]!.vy) > SHELL_IF_FASTER) startShell(c)
      else startPlod(c)
    } else wander(c)
  }

  const magpie = (c: Critter, alert: boolean) => {
    if (c.mode === 'home') {
      const t = critters[c.tagger]!
      walk(c, toward(c, t), HOME_SPEED)
      if (dist(c, t) < HOME_ARRIVE || --c.timer <= 0) {
        c.mode = 'perch'
        c.timer = PERCH_TICKS
        stand(c)
      }
    } else if (c.mode === 'perch') {
      stand(c)
      if (--c.timer <= 0) {
        c.mode = 'graze'
        c.cool = 0
      }
    } else if (c.mode === 'flee') {
      walk(c, away(c), FLEE_SPEED)
      if (--c.timer <= 0) {
        c.mode = 'graze'
        c.cool = 15
      }
    } else if (alert && c.cool <= 0) startHome(c)
    else wander(c)
  }

  const mouse = (c: Critter, alert: boolean) => {
    if (c.mode === 'dash') {
      const b = burrows[c.burrow]!
      walk(c, toward(c, b), DASH_SPEED)
      if (dist(c, b) < 24 || --c.timer <= 0) {
        c.mode = 'hidden'
        c.timer = HIDE_TICKS
        c.x = b.x
        c.y = b.y
        stand(c)
        emit('hide')
      }
    } else if (c.mode === 'hidden') {
      stand(c)
      if (--c.timer <= 0) {
        c.burrow = 1 - c.burrow
        c.x = burrows[c.burrow]!.x
        c.y = burrows[c.burrow]!.y
        c.mode = 'pop'
        c.timer = POP_TICKS
        emit('pop')
      }
    } else if (c.mode === 'pop') {
      stand(c)
      if (--c.timer <= 0) {
        c.mode = 'graze'
        c.cool = 25
      }
    } else if (alert && c.cool <= 0) startDash(c)
    else wander(c)
  }

  const runner = (c: Critter) => {
    const alert = dist(c, critters[it]!) < fearRadius()
    if (c.kind === 'hare') hare(c, alert)
    else if (c.kind === 'tortoise') tortoise(c, alert)
    else if (c.kind === 'magpie') magpie(c, alert)
    else mouse(c, alert)
  }

  // ---- the handoff -------------------------------------------------------

  const pass = (target: number) => {
    const old = it
    const from = critters[old]!
    const to = critters[target]!
    flash = { fromX: from.x, fromY: from.y, toX: to.x, toY: to.y }
    passAge = 0
    settle = SETTLE_TICKS
    to.tagger = old
    to.mode = 'it'
    to.timer = 0
    stand(to)
    it = target
    tags++
    tried.add(target)
    been.add(target)
    if (down.size === 0) goal = null
    scamper(from)
    emit('pass')
    if (hooks.has('sweep') && been.size === KINDS.length) {
      sweeps++
      golden = GOLDEN_TICKS
      been = new Set([target])
      emitHook('sweep')
    }
  }

  // No tag-backs: whoever handed you the glow is off limits while you hold it.
  // A shelled tortoise and a hidden mouse cannot be touched either.
  const tagable = (i: number): boolean => {
    const c = critters[i]!
    return i !== it && i !== critters[it]!.tagger && c.mode !== 'shell' && c.mode !== 'hidden'
  }

  const tagCheck = () => {
    if (settle > 0) return
    const itc = critters[it]!
    const reach = BODY[itc.kind].grab * (golden > 0 ? 1.25 : 1)
    let best = -1
    let bestDistance = Infinity
    critters.forEach((c, i) => {
      if (!tagable(i)) return
      const d = dist(c, itc)
      if (d <= itc.r + c.r + reach && d < bestDistance) {
        best = i
        bestDistance = d
      }
    })
    if (best >= 0) pass(best)
  }

  // ---- the contract ------------------------------------------------------

  const pointer = (input: PointerInput) => {
    const { id, phase, x, y } = input
    const finite = Number.isFinite(x) && Number.isFinite(y)
    if (phase === 'down') {
      if (!finite) return
      down.add(id)
      goal = { x: clamp(x, 0, FIELD_W), y: clamp(y, 0, FIELD_H) }
      idle = 0
    } else if (phase === 'move') {
      if (!finite || !down.has(id)) return
      goal = { x: clamp(x, 0, FIELD_W), y: clamp(y, 0, FIELD_H) }
      idle = 0
    } else if (down.delete(id)) idle = 0
  }

  const step = () => {
    tick++
    idle++
    passAge++
    if (golden > 0) golden--
    if (settle > 0) settle--
    for (const c of critters) {
      if (c.cool > 0) c.cool--
    }
    moveIt()
    critters.forEach((c, i) => {
      if (i !== it) runner(c)
    })
    tagCheck()
  }

  const spooked = (c: Critter, i: number) => i !== it && c.mode !== 'hidden' && dist(c, critters[it]!) < fearRadius()

  const rectAround = (cx: number, cy: number, half: number, kind: AffordanceKind, salience: number): Affordance => ({
    x: clamp(cx - half, 0, FIELD_W - half * 2),
    y: clamp(cy - half, 0, FIELD_H - half * 2),
    w: half * 2,
    h: half * 2,
    kind,
    salience,
  })

  // What a child could be drawn to: the glow itself (drag it), every visible
  // runner (touch it), and the two burrows. Reading this changes nothing.
  const affordances = (): Affordance[] => {
    const list: Affordance[] = []
    critters.forEach((c, i) => {
      if (c.mode === 'hidden') return
      const half = Math.max(c.r + 12, 40)
      if (i === it) list.push(rectAround(c.x, c.y, half, 'drag', 0.5))
      else {
        const catchable = tagable(i)
        list.push(rectAround(c.x, c.y, half, 'tap', catchable ? 0.55 + (spooked(c, i) ? 0.25 : 0) : 0.2))
      }
    })
    for (const b of burrows) list.push(rectAround(b.x, b.y, 44, 'tap', 0.15))
    return list
  }

  // A discrete class of what the world is doing to the child right now.
  // `pinned` is how many spooked runners are pressed against a wall.
  const situation = (pinned: number): string => {
    if (passAge < FLASH_TICKS) return 'pass'
    const others = critters.filter((_, i) => i !== it)
    if (others.some((c) => c.mode === 'shell')) return 'shell'
    if (others.some((c) => c.mode === 'double')) return 'double'
    if (others.some((c) => c.mode === 'home' || c.mode === 'perch')) return 'home'
    if (others.some((c) => c.mode === 'hidden' || c.mode === 'pop')) return 'burrow'
    if (pinned > 0) return 'pinned'
    if (others.some((c) => c.mode === 'bolt')) return 'bolt'
    if (others.some((c) => c.mode === 'plod' || c.mode === 'flee' || c.mode === 'dash')) return 'chase'
    return 'calm'
  }

  const observe = (): Observation => {
    const events = pending
    pending = []
    const itc = critters[it]!
    // One pass over the visible runners: how near the closest is, how many are
    // spooked (as spooked() says), and how many of those are pinned to a wall.
    const fear = fearRadius()
    let nearest = Infinity
    let alert = 0
    let pinned = 0
    for (let i = 0; i < critters.length; i++) {
      const c = critters[i]!
      if (i === it || c.mode === 'hidden') continue
      const d = dist(c, itc)
      nearest = Math.min(nearest, d - c.r - itc.r)
      if (d < fear) {
        alert++
        if (c.blocked) pinned++
      }
    }
    return {
      signature: `${itc.kind}/${situation(pinned)}`,
      features: {
        tags,
        bodies: tried.size,
        near: Number.isFinite(nearest) ? clamp(nearest / 700, 0, 1) : 1,
        alert,
        pinned,
        sweeps,
      },
      events,
    }
  }

  // The nearest runner that can be tagged right now. Data for the view only.
  const hint = (): { x: number; y: number } | null => {
    if (!config.hints || idle < HINT_AFTER_TICKS) return null
    const itc = critters[it]!
    let best: Critter | null = null
    let bestDistance = Infinity
    critters.forEach((c, i) => {
      if (!tagable(i)) return
      const d = dist(c, itc)
      if (d < bestDistance) {
        best = c
        bestDistance = d
      }
    })
    const found = best as Critter | null
    return found ? { x: found.x, y: found.y } : null
  }

  const snapshot = (): PassSnapshot => ({
    tick,
    it,
    critters: critters.map((c, i) => ({
      kind: c.kind,
      x: c.x,
      y: c.y,
      r: c.r,
      vx: c.vx,
      vy: c.vy,
      mode: c.mode,
      safe: i === critters[it]!.tagger,
      hidden: c.mode === 'hidden',
      alert: spooked(c, i),
      tagger: c.tagger,
    })),
    burrows: burrows.map((b) => ({ ...b })),
    goal: goal ? { ...goal } : null,
    flash: flash && passAge < FLASH_TICKS ? { ...flash, age: passAge } : null,
    been: hooks.has('sweep') ? critters.map((_, i) => been.has(i)) : null,
    sweeps: hooks.has('sweep') ? sweeps : null,
    golden: golden > 0,
    tags,
    hint: hint(),
  })

  return { step, pointer, affordances, observe, snapshot }
}
