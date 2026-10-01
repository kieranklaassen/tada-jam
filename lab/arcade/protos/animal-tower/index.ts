// Animal Tower: a crane lowers one awkward animal at a time over a small
// island. Drag to aim, lift to drop. Real rigid bodies (matter-js) make the
// tower wobbly; whatever falls off splashes into the lake and swims away
// grinning, and the child just keeps stacking toward the stars.

import Matter from 'matter-js'
import { blinkAt, ellipse, hint, label, sprite, volume } from '../../kit/draw.ts'
import { clamp, damp, ease, lerp, pick, shuffle, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { boxOf, build, KINDS } from './animals.ts'
import type { Face, Kind, Mood } from './animals.ts'

const STEP = 1 / 120
const PLAT_X = W / 2
const PLAT_W = 420
const PLAT_TOP = 640
const WATER = 712
// Logical pixels per "metre" on the measuring pole.
const M = 100
const POLE_X = PLAT_X - 300
const PIVOT_Y = 40
const ROPE = 44
const TROLLEY_MIN = 190
const TROLLEY_MAX = W - 190
// Where the top of the tower sits on screen once the camera starts to follow.
const TOP_LINE = 430
const BTN = { x: W - 84, y: 340, r: 52 }

// The best tower of this visit survives a restart.
let sessionBest = 0

interface Animal {
  kind: Kind
  body: Matter.Body
  comX: number
  comY: number
  squash: Spring
  wob: Spring
  seed: number
  face: Face
  landed: boolean
  landedAt: number
  // Seconds it has been still.
  rest: number
  fallen: boolean
  moodUntil: number
  moodNow: Mood
  lastBump: number
}

interface Swimmer {
  kind: Kind
  x: number
  dir: number
  age: number
  angle: number
  seed: number
  face: Face
}

interface Flyer {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  age: number
  face: Face
}

interface Hang {
  kind: Kind
  rot: Spring
  appear: number
  face: Face
}

interface Hit {
  a: Animal | undefined
  b: Animal | undefined
  x: number
  y: number
  speed: number
}

const newFace = (): Face => ({ mood: 'happy', lookX: 0, lookY: 0, blink: 0, t: 0, flap: 0, wob: 0 })

const SKY: readonly (readonly [number, readonly [number, number, number], readonly [number, number, number]])[] = [
  [0, [96, 190, 255], [214, 243, 255]],
  [300, [70, 150, 245], [160, 214, 255]],
  [600, [44, 50, 150], [120, 120, 220]],
  [900, [14, 10, 48], [60, 44, 130]],
  [1400, [4, 3, 16], [20, 14, 60]],
]

function skyAt(alt: number): [string, string] {
  let i = 0
  while (i < SKY.length - 2 && alt > SKY[i + 1]![0]) i++
  const a = SKY[i]!
  const b = SKY[i + 1]!
  const t = clamp((alt - a[0]) / (b[0] - a[0]), 0, 1)
  const mix = (p: readonly [number, number, number], q: readonly [number, number, number]) =>
    `rgb(${Math.round(lerp(p[0], q[0], t))},${Math.round(lerp(p[1], q[1], t))},${Math.round(lerp(p[2], q[2], t))})`
  return [mix(a[1], b[1]), mix(a[2], b[2])]
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter

  const engine = Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 })
  engine.gravity.y = 1.7
  const platform = Bodies.rectangle(PLAT_X, PLAT_TOP + 30, PLAT_W, 60, { isStatic: true, friction: 1, chamfer: { radius: 8 } })
  Composite.add(engine.world, platform)

  const animals: Animal[] = []
  const byId = new Map<number, Animal>()
  const swimmers: Swimmer[] = []
  const flyers: Flyer[] = []
  const hits: Hit[] = []
  let acc = 0

  const onCollide = (ev: Matter.IEventCollision<Matter.Engine>) => {
    for (const pair of ev.pairs) {
      const pa = pair.bodyA.parent
      const pb = pair.bodyB.parent
      const sup = pair.collision.supports[0]
      hits.push({
        a: byId.get(pa.id),
        b: byId.get(pb.id),
        x: sup ? sup.x : (pa.position.x + pb.position.x) / 2,
        y: sup ? sup.y : (pa.position.y + pb.position.y) / 2,
        speed: Math.hypot(pa.velocity.x - pb.velocity.x, pa.velocity.y - pb.velocity.y),
      })
    }
  }
  Events.on(engine, 'collisionStart', onCollide)

  // The queue: the first dozen are scripted so the awkward ones and the
  // surprises arrive on a schedule, then it is a shuffled bag with a surprise
  // every fourth.
  const K = KINDS
  const SCRIPT = [K.bear, K.hippo, K.giraffe, K.croc, K.mouse, K.elephant, K.hedgehog, K.bird, K.penguin, K.jelly, K.giraffe, K.croc, K.whale]
  const COMMON = [K.bear, K.hippo, K.croc, K.giraffe, K.elephant, K.hedgehog, K.penguin]
  const SPECIAL = [K.mouse, K.bird, K.jelly, K.whale]
  let spawned = 0
  let bag: Kind[] = []
  const nextKind = (): Kind => {
    const n = spawned++
    if (n < SCRIPT.length) return SCRIPT[n]!
    if (n % 4 === 0) return pick(SPECIAL, stage.rand())
    if (bag.length === 0) bag = shuffle(COMMON, stage.rand)
    return bag.pop()!
  }
  const queue: Kind[] = [nextKind(), nextKind()]
  const nextPop = spring(1, 240, 11)

  const trolley = { x: PLAT_X, vx: 0, target: PLAT_X, rolled: 0 }
  const sway = spring(0, 38, 3.2)
  let hang: Hang | null = null
  let nextHangAt = 0.15
  let aimId: number | null = null
  let dropPending = -1
  let lastTouchAt = 0
  const btnPop = spring(1, 300, 10)

  let cam = 0
  let height = 0
  let shownHeight = 0
  let counted = 0
  let record = 0
  let bestAtStart = sessionBest
  let beatBest = false
  let lastDing = -1
  let lastCreak = -1
  let lastThud = -1
  let nervousUntil = -1
  let gleeUntil = -1
  let lastWhoops = -10
  const recentFalls: number[] = []
  const island = { squash: spring(1, 260, 12), oofUntil: -1 }

  // Backdrop furniture, in world coordinates above the lake.
  const clouds = Array.from({ length: 9 }, (_, i) => ({
    x: stage.rand() * (W + 300) - 150,
    y: 260 - i * 110 - stage.rand() * 60,
    s: 0.7 + stage.rand() * 0.7,
    v: 6 + stage.rand() * 10,
  }))
  const stars = Array.from({ length: 90 }, () => ({
    x: stage.rand() * W,
    y: -150 - stage.rand() * 2400,
    r: 1.5 + stage.rand() * 2.5,
    p: stage.rand() * TAU,
  }))
  const floaters = [
    { e: '🎈', x: 1010, y: 40, s: 54, sway: 10, drift: 0 },
    { e: '🎈', x: 190, y: -120, s: 70, sway: 14, drift: 0 },
    { e: '🪁', x: 930, y: -200, s: 96, sway: 22, drift: 0 },
    { e: '✈️', x: 200, y: -340, s: 90, sway: 4, drift: 70 },
    { e: '🌙', x: 930, y: -500, s: 130, sway: 3, drift: 0 },
    { e: '🛰️', x: 180, y: -700, s: 84, sway: 8, drift: 0 },
    { e: '🛸', x: 640, y: -900, s: 110, sway: 70, drift: 0 },
    { e: '🚀', x: 960, y: -1150, s: 110, sway: 10, drift: 0 },
    { e: '🪐', x: 200, y: -1400, s: 150, sway: 4, drift: 0 },
    { e: '👽', x: 900, y: -1700, s: 100, sway: 30, drift: 0 },
    { e: '🌟', x: 640, y: -2050, s: 170, sway: 6, drift: 0 },
  ]

  // Where the hanging animal is on screen right now.
  const pose = { x: PLAT_X, y: 0, angle: 0, halfH: 0, halfW: 0, theta: 0 }
  const updatePose = () => {
    if (!hang) return
    const box = boxOf(hang.kind)
    const a = hang.rot.value
    const ca = Math.abs(Math.cos(a))
    const sa = Math.abs(Math.sin(a))
    pose.halfH = (ca * box.h + sa * box.w) / 2
    pose.halfW = (ca * box.w + sa * box.h) / 2
    pose.theta = sway.value + Math.sin(stage.time * 1.7) * 0.04
    const len = ROPE + pose.halfH
    pose.x = trolley.x + Math.sin(pose.theta) * len
    pose.y = PIVOT_Y + Math.cos(pose.theta) * len - (1 - hang.appear) * 320
    pose.angle = a - pose.theta
  }

  const toAnimal = (kind: Kind): Animal => {
    const built = build(kind)
    const a: Animal = {
      kind,
      body: built.body,
      comX: built.comX,
      comY: built.comY,
      squash: spring(1, 260, 9),
      wob: spring(0, 130, 4),
      seed: Math.random() * 10,
      face: newFace(),
      landed: false,
      landedAt: 0,
      rest: 0,
      fallen: false,
      moodUntil: -1,
      moodNow: 'happy',
      lastBump: -1,
    }
    return a
  }

  const wakeAll = () => {
    for (const a of animals) if (a.body.isSleeping) Sleeping.set(a.body, false)
  }

  const removeAnimal = (a: Animal) => {
    Composite.remove(engine.world, a.body)
    byId.delete(a.body.id)
    const at = animals.indexOf(a)
    if (at >= 0) animals.splice(at, 1)
    wakeAll()
  }

  const feel = (a: Animal, mood: Mood, seconds: number) => {
    a.moodNow = mood
    a.moodUntil = stage.time + seconds
  }

  const drop = () => {
    if (!hang) return
    updatePose()
    const a = toAnimal(hang.kind)
    const box = boxOf(hang.kind)
    const ox = a.comX - box.cx
    const oy = a.comY - box.cy
    // Fudge in the child's favour: the swing is for show, the drop is nearly
    // square, so a fast drag does not land an animal on its corner.
    pose.angle = hang.rot.value - pose.theta * 0.2
    const c = Math.cos(pose.angle)
    const s = Math.sin(pose.angle)
    Body.setAngle(a.body, pose.angle)
    Body.setPosition(a.body, { x: pose.x + ox * c - oy * s, y: pose.y + cam + ox * s + oy * c })
    Body.setVelocity(a.body, { x: 0, y: 5 })
    Body.setAngularVelocity(a.body, 0)
    Composite.add(engine.world, a.body)
    animals.push(a)
    byId.set(a.body.id, a)
    feel(a, 'wow', 5)
    // Stretch on the way down; the landing snaps it flat.
    a.squash.target = 1.12
    // The suction cup lets go.
    sfx.pop(-3)
    sfx.whoosh()
    fx.burst(pose.x, pose.y - pose.halfH, { count: 7, color: '#ffffff', speed: 200, life: 0.3, size: 6, angle: -Math.PI / 2, spread: Math.PI })
    sway.kick(sway.value > 0 ? -1.2 : 1.2)
    hang = null
    nextHangAt = stage.time + 0.4
    dropPending = -1
  }

  const bringNext = () => {
    const kind = queue.shift()!
    queue.push(nextKind())
    const h: Hang = { kind, rot: spring(0, 230, 13), appear: 0, face: newFace() }
    hang = h
    stage.tween(0.38, (t) => (h.appear = t), ease.outBack)
    nextPop.value = 0.4
    sfx.tone({ freq: 500, to: 340, dur: 0.12, type: 'triangle', vol: 0.1 })
  }

  const rotate = () => {
    btnPop.value = 0.75
    if (!hang) {
      sfx.tick()
      return
    }
    hang.rot.target += Math.PI / 2
    sfx.boing(Math.round(hang.rot.target / (Math.PI / 2)) % 4)
    sway.kick(1.5)
  }

  const yelp = (kind: Kind) => {
    sfx.tone({ freq: kind.yelp * 0.8, to: kind.yelp * 1.3, dur: 0.09, type: 'triangle', vol: 0.2 })
    sfx.tone({ freq: kind.yelp * 1.3, to: kind.yelp * 0.4, dur: 0.5, type: 'triangle', vol: 0.2, delay: 0.09 })
  }

  const land = (a: Animal, other: Animal | undefined, x: number, y: number) => {
    const heft = a.kind.heft
    a.landed = true
    a.landedAt = stage.time
    a.squash.target = 1
    a.squash.value = 0.7
    a.wob.kick(a.body.velocity.x > 0 ? 5 : -5)
    feel(a, 'wow', 0.35)
    if (other) {
      other.squash.value = Math.min(other.squash.value, 0.86)
      other.wob.kick(3)
      feel(other, 'wow', 0.4)
    } else {
      island.squash.value = 0.93 - heft * 0.02
      if (heft >= 2) island.oofUntil = stage.time + 0.5
    }
    const sy = y - cam
    fx.burst(x, sy, { count: 7 + heft * 5, color: ['#ffffff', '#fff2cf'], speed: 190 + heft * 70, life: 0.45, size: 7 + heft * 3, angle: -Math.PI / 2, spread: Math.PI * 1.1, gravity: 260, drag: 0.92 })
    sfx.thud(0.35 + heft * 0.22)
    a.kind.voice(sfx)
    if (heft === 2) fx.shake(6, 0.2)
    if (heft === 3) {
      fx.shake(18, 0.45)
      fx.hitstop(70)
      const spoutX = a.body.position.x
      const spoutY = a.body.bounds.min.y - cam
      fx.burst(spoutX, spoutY, { count: 40, color: ['#bfe9ff', '#ffffff', '#7fd0ff'], speed: 620, life: 0.9, size: 9, angle: -Math.PI / 2, spread: 0.5, gravity: 900 })
      nervousUntil = stage.time + 0.9
    }
  }

  const splash = (x: number, big: number) => {
    const sy = WATER - cam
    if (sy < H + 60) {
      fx.burst(x, sy, { count: 16 + big * 8, color: ['#bfe9ff', '#ffffff', '#6cc4f5'], speed: 420 + big * 90, life: 0.8, size: 9 + big * 2, angle: -Math.PI / 2, spread: 1.3, gravity: 1100 })
      fx.ring(x, sy, '#ffffff', 90 + big * 30, 0.5)
    } else {
      fx.burst(x, H + 10, { count: 10, color: ['#bfe9ff', '#ffffff'], speed: 700, life: 0.7, size: 9, angle: -Math.PI / 2, spread: 0.8, gravity: 1100 })
    }
    sfx.splat()
    sfx.noise({ dur: 0.35, vol: 0.2, freq: 1800, to: 500, filter: 'lowpass' })
    if (big >= 2) fx.shake(5, 0.2)
  }

  const flyOff = (a: Animal) => {
    const p = a.body.position
    flyers.push({ kind: a.kind, x: p.x, y: p.y, vx: p.x < PLAT_X ? -220 : 220, vy: -120, age: 0, face: { ...newFace(), mood: 'glee', flap: 1 } })
    removeAnimal(a)
    a.kind.voice(sfx)
    sfx.tone({ freq: 2800, to: 3500, dur: 0.08, type: 'sine', vol: 0.12, delay: 0.24 })
    fx.burst(p.x, p.y - cam, { count: 8, color: ['#ff6f61', '#ffd9c9'], speed: 220, life: 0.6, size: 7, gravity: 300, shape: 'square' })
  }

  const milestone = (m: number) => {
    const big = m % 5 === 0
    fx.confetti(W / 2, 170, big ? 140 : 50 + m * 4)
    fx.text(W / 2, 300, `${m} m!`, { color: '#fff3b0', size: big ? 120 : 84, life: 1.3 })
    if (big) {
      sfx.fanfare()
      fx.flash('#ffffff', 0.35, 0.3)
      fx.shake(8, 0.3)
    } else {
      sfx.win()
    }
    gleeUntil = stage.time + 1.3
  }

  const stepWorld = (dt: number) => {
    acc = Math.min(acc + dt, STEP * 5)
    while (acc >= STEP) {
      Engine.update(engine, STEP * 1000)
      acc -= STEP
      // Soft landings: for a moment after touching down an animal sheds its
      // spin and sideways skid, so the thud rocks the tower but only a real
      // imbalance tips it.
      for (const a of animals) {
        if (!a.landed || a.fallen || stage.time - a.landedAt > 0.35) continue
        Body.setAngularVelocity(a.body, a.body.angularVelocity * 0.85)
        Body.setVelocity(a.body, { x: a.body.velocity.x * 0.9, y: a.body.velocity.y })
      }
      settleHits()
    }
  }

  const settleHits = () => {
    for (const hit of hits) {
      for (const [me, other] of [[hit.a, hit.b], [hit.b, hit.a]] as const) {
        if (!me || me.fallen) continue
        if (!me.landed) {
          land(me, other, hit.x, hit.y)
        } else if (hit.speed > 2.4 && stage.time - me.lastBump > 0.25) {
          me.lastBump = stage.time
          me.squash.value = Math.min(me.squash.value, 0.9)
          me.wob.kick(hit.speed)
          if (stage.time - lastThud > 0.09) {
            lastThud = stage.time
            sfx.thud(clamp(hit.speed / 14, 0.15, 0.6))
            fx.burst(hit.x, hit.y - cam, { count: 4, color: '#ffffff', speed: 140, life: 0.3, size: 6 })
          }
        }
      }
    }
    hits.length = 0
  }

  const updateAnimals = (dt: number) => {
    const time = stage.time
    let top = PLAT_TOP
    let settledTop = PLAT_TOP
    let unsettled = false
    let maxSpin = 0
    let lively = false
    const nervous = time < nervousUntil
    const glee = time < gleeUntil
    const lookAtX = hang ? pose.x : trolley.x
    const lookAtY = (hang ? pose.y : 120) + cam

    for (let i = animals.length - 1; i >= 0; i--) {
      const a = animals[i]!
      const b = a.body
      a.squash.update(dt)
      a.wob.update(dt)
      a.wob.value = clamp(a.wob.value, -0.35, 0.35)

      if (!a.fallen && b.position.y > PLAT_TOP + 24) {
        a.fallen = true
        if (a.kind === K.bird) {
          flyOff(a)
          continue
        }
        yelp(a.kind)
        feel(a, 'wow', 9)
        recentFalls.push(time)
        fx.text(clamp(b.position.x, 90, W - 90), clamp(b.position.y - cam - 70, 120, H - 120), pick(['EEK!', 'WHEEE!', 'YIKES!', 'WAAH!', 'OOPS!']), { color: '#ffffff', size: 38, life: 0.8 })
      }
      if (b.position.y > WATER + 4 || b.position.x < -300 || b.position.x > W + 300) {
        splash(clamp(b.position.x, 20, W - 20), a.kind.heft)
        swimmers.push({ kind: a.kind, x: b.position.x, dir: b.position.x < PLAT_X ? -1 : 1, age: 0, angle: b.angle, seed: a.seed, face: { ...newFace(), mood: 'glee' } })
        removeAnimal(a)
        // It bobs back up, fine and rather pleased.
        stage.after(0.45, () => {
          sfx.pop(2 + Math.round(Math.random() * 3))
          if (WATER - cam < H + 40) fx.burst(clamp(b.position.x, 20, W - 20), WATER - cam + 10, { count: 6, color: '#ffffff', speed: 180, life: 0.4, size: 7, angle: -Math.PI / 2, spread: 1.6, gravity: 500 })
        })
        continue
      }
      if (a.kind === K.bird && a.landed && time - a.landedAt > 3.2) {
        flyOff(a)
        continue
      }

      if (a.landed && !a.fallen) {
        const still = b.isSleeping || (b.speed < 0.25 && Math.abs(b.angularVelocity) < 0.004)
        a.rest = still ? a.rest + dt : 0
        top = Math.min(top, b.bounds.min.y)
        if (a.rest > 0.3) settledTop = Math.min(settledTop, b.bounds.min.y)
        else unsettled = true
        if (time - a.landedAt > 0.5) maxSpin = Math.max(maxSpin, Math.abs(b.angularVelocity))
        if (!b.isSleeping && b.speed > 0.8) lively = true
      }

      // Face.
      const f = a.face
      f.t = time + a.seed
      f.wob = a.wob.value
      f.blink = blinkAt(time, a.seed)
      f.flap = a.kind === K.bird && a.landed ? clamp((time - a.landedAt - 2.2) * 2, 0, 1) : a.fallen ? 1 : 0
      if (time < a.moodUntil) f.mood = a.moodNow
      else if (glee) f.mood = 'glee'
      else if (nervous && a.landed) f.mood = 'nervous'
      else f.mood = 'happy'
      let lx = lookAtX - b.position.x
      let ly = lookAtY - b.position.y
      const d = Math.hypot(lx, ly) || 1
      lx /= d
      ly /= d
      if (f.mood === 'nervous') {
        lx = Math.sin(time * 12 + a.seed * 3)
        ly = 0.3
      }
      const c = Math.cos(-b.angle)
      const s = Math.sin(-b.angle)
      f.lookX = lx * c - ly * s
      f.lookY = lx * s + ly * c
    }

    // A moving tower wakes its sleepers, or a block could hang in the air
    // after its support slid away.
    if (lively) wakeAll()
    if (maxSpin > 0.0035) {
      nervousUntil = Math.max(nervousUntil, time + 0.5)
      if (time - lastCreak > 0.32) {
        lastCreak = time
        sfx.tone({ freq: 130 + Math.random() * 70, to: 85, dur: 0.17, type: 'sawtooth', vol: 0.06 })
      }
    }

    // Height and cheers.
    // While anything is still rocking the number holds (it never reads more
    // than what is standing), and it moves once the tower is quiet.
    if (unsettled) height = Math.min(height, Math.max(0, (PLAT_TOP - top) / M))
    else height = Math.max(0, (PLAT_TOP - settledTop) / M)
    shownHeight = damp(shownHeight, height, 7, dt)
    if (height > counted + 0.05) {
      counted = height
      if (time - lastDing > 0.12) {
        lastDing = time
        sfx.ding(Math.min(14, Math.floor(height * 1.5)))
      }
      if (height > record + 0.05) {
        const before = Math.floor(record)
        record = height
        const whole = Math.floor(height)
        if (whole > before) milestone(whole)
        else fx.text(PLAT_X, clamp(settledTop - cam - 50, 120, H - 200), `${height.toFixed(1)} m`, { color: '#ffffff', size: 40, life: 0.8 })
      }
      if (height > sessionBest) {
        if (bestAtStart > 0.5 && !beatBest) {
          beatBest = true
          fx.text(W / 2, 220, '🏆 NEW BEST!', { color: '#ffe14d', size: 72, life: 1.4 })
          fx.confetti(W / 2, 140, 90)
          sfx.fanfare()
        }
        sessionBest = height
      }
    } else if (height < counted - 0.05) {
      counted = height
    }

    while (recentFalls.length && time - recentFalls[0]! > 2) recentFalls.shift()
    if (recentFalls.length >= 3 && time - lastWhoops > 3.5) {
      lastWhoops = time
      fx.text(W / 2, 360, pick(['WHOOPS!', 'TIMBER!', 'SPLOOSH!', 'UH-OH!']), { color: '#ffffff', size: 90, life: 1.1 })
      sfx.slideDown()
      fx.shake(7, 0.3)
    }

    cam = damp(cam, Math.min(0, top - TOP_LINE), 2.6, dt)
  }

  const drawKind = (g: CanvasRenderingContext2D, kind: Kind, x: number, y: number, angle: number, ox: number, oy: number, sx: number, sy: number, f: Face) => {
    g.save()
    g.translate(x, y)
    g.rotate(angle)
    g.scale(sx, sy)
    g.translate(-ox, -oy)
    kind.draw(g, f)
    g.restore()
  }

  const drawBackdrop = (g: CanvasRenderingContext2D) => {
    const time = stage.time
    const alt = -cam
    const [topC, botC] = skyAt(alt)
    const grad = g.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, topC)
    grad.addColorStop(1, botC)
    g.fillStyle = grad
    g.fillRect(-30, -30, W + 60, H + 60)

    g.save()
    g.translate(0, -cam)
    const viewTop = cam
    const viewBot = cam + H

    // Stars fade in with altitude.
    const starA = clamp((alt - 350) / 350, 0, 1)
    if (starA > 0) {
      g.fillStyle = '#ffffff'
      for (const s of stars) {
        if (s.y < viewTop - 10 || s.y > viewBot + 10) continue
        g.globalAlpha = starA * (0.55 + 0.45 * Math.sin(time * 2 + s.p))
        g.beginPath()
        g.arc(s.x, s.y, s.r, 0, TAU)
        g.fill()
      }
      g.globalAlpha = 1
    }

    // Sun.
    if (viewBot > 80) {
      const sx = 905
      const sy = 205
      g.save()
      g.translate(sx, sy)
      g.rotate(time * 0.15)
      g.fillStyle = 'rgba(255,236,150,0.55)'
      for (let i = 0; i < 10; i++) {
        g.rotate(TAU / 10)
        g.beginPath()
        g.moveTo(-10, -58)
        g.lineTo(0, -84)
        g.lineTo(10, -58)
        g.fill()
      }
      g.restore()
      ellipse(g, sx, sy, 50, 50, '#ffe36e')
      ellipse(g, sx - 14, sy - 16, 16, 10, 'rgba(255,255,255,0.5)', -0.5)
    }

    for (const fl of floaters) {
      if (fl.y < viewTop - 120 || fl.y > viewBot + 120) continue
      const x = fl.drift ? ((fl.x + time * fl.drift) % (W + 300)) - 150 : fl.x + Math.sin(time * 0.7 + fl.y) * fl.sway
      sprite(g, fl.e, x, fl.y + Math.sin(time * 1.1 + fl.x) * 8, fl.s, Math.sin(time * 0.9 + fl.y) * 0.08)
    }

    for (const c of clouds) {
      if (c.y < viewTop - 80 || c.y > viewBot + 80) continue
      const x = ((c.x + time * c.v) % (W + 400)) - 200
      g.fillStyle = 'rgba(255,255,255,0.92)'
      g.beginPath()
      g.ellipse(x, c.y, 70 * c.s, 26 * c.s, 0, 0, TAU)
      g.ellipse(x - 34 * c.s, c.y - 16 * c.s, 34 * c.s, 26 * c.s, 0, 0, TAU)
      g.ellipse(x + 22 * c.s, c.y - 24 * c.s, 42 * c.s, 32 * c.s, 0, 0, TAU)
      g.fill()
    }

    if (viewBot > WATER - 260) {
      // Far shore.
      ellipse(g, 150, WATER + 30, 360, 120, '#9bdc9a')
      ellipse(g, 1040, WATER + 40, 400, 150, '#84cf8f')
      sprite(g, '🌴', 96, WATER - 108, 96, -0.06)
      sprite(g, '🌴', 1076, WATER - 128, 120, 0.05)
      sprite(g, '🌳', 984, WATER - 96, 64)
      sprite(g, '🌳', 196, WATER - 86, 56)
      // Lake.
      const lake = g.createLinearGradient(0, WATER - 12, 0, WATER + 140)
      lake.addColorStop(0, '#5cc3f2')
      lake.addColorStop(1, '#2f8fd8')
      g.fillStyle = lake
      g.fillRect(-30, WATER - 12, W + 60, 400)
      g.strokeStyle = 'rgba(255,255,255,0.5)'
      g.lineWidth = 4
      g.lineCap = 'round'
      g.beginPath()
      for (let i = 0; i < 7; i++) {
        const x = ((i * 190 + time * (12 + (i % 3) * 6)) % (W + 120)) - 60
        const y = WATER + 6 + ((i * 37) % 30)
        g.moveTo(x, y)
        g.lineTo(x + 46, y)
      }
      g.stroke()
    }
    g.restore()
  }

  const drawIsland = (g: CanvasRenderingContext2D) => {
    const time = stage.time
    const sq = island.squash.value
    g.save()
    g.translate(PLAT_X, PLAT_TOP)
    // Rock.
    g.beginPath()
    g.moveTo(-PLAT_W / 2 + 6, 8)
    g.lineTo(PLAT_W / 2 - 6, 8)
    g.quadraticCurveTo(PLAT_W / 2 - 20, 90, PLAT_W / 2 - 70, 170)
    g.lineTo(-PLAT_W / 2 + 70, 170)
    g.quadraticCurveTo(-PLAT_W / 2 + 20, 90, -PLAT_W / 2 + 6, 8)
    g.fillStyle = '#c29a6b'
    g.fill()
    g.strokeStyle = '#7d5a36'
    g.lineWidth = 5
    g.stroke()
    ellipse(g, -120, 58, 22, 9, '#ad8456', 0.2)
    ellipse(g, 132, 50, 26, 10, '#ad8456', -0.2)
    // Grass cap, flush with the physics top.
    g.beginPath()
    g.roundRect(-PLAT_W / 2 - 4, -1, PLAT_W + 8, 30, 14)
    g.fillStyle = '#6fd36c'
    g.fill()
    g.strokeStyle = '#2f8f3f'
    g.lineWidth = 5
    g.stroke()
    g.fillStyle = '#6fd36c'
    g.beginPath()
    for (let x = -PLAT_W / 2 + 14; x < PLAT_W / 2 - 20; x += 36) {
      g.moveTo(x, 27)
      g.quadraticCurveTo(x + 9, 46, x + 18, 27)
    }
    g.fill()
    g.strokeStyle = '#2f8f3f'
    g.lineWidth = 4
    g.stroke()
    // The island has a face and feels every landing.
    const oof = time < island.oofUntil
    const strain = animals.length >= 7
    const ey = 58 + (1 - sq) * 60
    const eyeR = 11
    for (const side of [-1, 1]) {
      const ex = side * 26
      g.beginPath()
      g.ellipse(ex, ey, eyeR, oof ? 3 : eyeR * (blinkAt(time, 4) ? 0.1 : 1), 0, 0, TAU)
      g.fillStyle = '#ffffff'
      g.fill()
      g.strokeStyle = '#3a2a1c'
      g.lineWidth = 3
      g.stroke()
      if (!oof && !blinkAt(time, 4)) {
        const lx = clamp((trolley.x - PLAT_X) / 400, -1, 1) * 4
        ellipse(g, ex + lx, ey - 4, 5.5, 5.5, '#2a1c33')
      }
    }
    g.strokeStyle = '#3a2a1c'
    g.lineWidth = 4
    g.lineCap = 'round'
    g.beginPath()
    if (oof) {
      g.ellipse(0, ey + 26, 9, 11, 0, 0, TAU)
      g.fillStyle = '#3a2a1c'
      g.fill()
    } else if (strain) {
      g.moveTo(-14, ey + 26)
      g.quadraticCurveTo(-7, ey + 20, 0, ey + 26)
      g.quadraticCurveTo(7, ey + 32, 14, ey + 26)
      g.stroke()
    } else {
      g.arc(0, ey + 16, 14, 0.15 * Math.PI, 0.85 * Math.PI)
      g.stroke()
    }
    g.restore()
  }

  const drawPole = (g: CanvasRenderingContext2D) => {
    const viewTop = cam
    const viewBot = cam + H
    const topM = Math.ceil((PLAT_TOP - viewTop) / M) + 1
    const botM = Math.max(0, Math.floor((PLAT_TOP - viewBot) / M))
    // Below the platform the pole is plain wood down into the lake.
    g.fillStyle = '#b07a46'
    g.fillRect(POLE_X - 7, PLAT_TOP, 14, WATER - PLAT_TOP + 40)
    for (let m = botM; m < topM; m++) {
      const y = PLAT_TOP - (m + 1) * M
      g.fillStyle = m % 2 === 0 ? '#ff5d5d' : '#ffffff'
      g.fillRect(POLE_X - 7, y, 14, M)
    }
    g.strokeStyle = 'rgba(60,30,30,0.55)'
    g.lineWidth = 3
    g.strokeRect(POLE_X - 7, PLAT_TOP - topM * M, 14, topM * M + WATER - PLAT_TOP + 40)
    for (let m = Math.max(1, botM); m <= topM; m++) {
      const y = PLAT_TOP - m * M
      g.fillStyle = 'rgba(60,30,30,0.7)'
      g.fillRect(POLE_X - 22, y - 2, 15, 4)
      label(g, String(m), POLE_X - 42, y, 26, '#ffffff', 'rgba(40,30,60,0.75)')
    }

    // Best line, then the live height line.
    const dashed = (y: number, color: string, x0: number, x1: number) => {
      g.strokeStyle = color
      g.lineWidth = 4
      g.setLineDash([14, 12])
      g.lineDashOffset = -stage.time * 20
      g.beginPath()
      g.moveTo(x0, y)
      g.lineTo(x1, y)
      g.stroke()
      g.setLineDash([])
    }
    if (sessionBest > 0.3 && sessionBest > shownHeight + 0.08) {
      const y = PLAT_TOP - sessionBest * M
      dashed(y, 'rgba(255,215,64,0.95)', POLE_X + 8, W - 30)
      sprite(g, '🏆', POLE_X + 44, y - 24, 40)
    }
    if (shownHeight > 0.05) {
      const y = PLAT_TOP - shownHeight * M
      dashed(y, 'rgba(255,255,255,0.9)', POLE_X + 8, PLAT_X + PLAT_W / 2 + 40)
      // A tag that rides the pole.
      g.fillStyle = '#ffe14d'
      g.strokeStyle = '#a3720a'
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(POLE_X + 9, y)
      g.lineTo(POLE_X + 26, y - 13)
      g.lineTo(POLE_X + 26, y + 13)
      g.closePath()
      g.fill()
      g.stroke()
    }
  }

  const drawWaterFront = (g: CanvasRenderingContext2D) => {
    if (cam + H < WATER) return
    const time = stage.time
    g.fillStyle = 'rgba(64,160,230,0.78)'
    g.beginPath()
    g.moveTo(-30, WATER + 34)
    for (let x = -30; x <= W + 30; x += 40) g.lineTo(x, WATER + 30 + Math.sin(x * 0.02 + time * 2.2) * 5)
    g.lineTo(W + 30, WATER + 300)
    g.lineTo(-30, WATER + 300)
    g.closePath()
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.7)'
    g.lineWidth = 4
    g.beginPath()
    for (let x = -30; x <= W + 30; x += 40) {
      const y = WATER + 30 + Math.sin(x * 0.02 + time * 2.2) * 5
      if (x === -30) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }

  // The first solid thing under a point, in world y.
  const surfaceUnder = (x: number, halfW: number): number => {
    let y = Math.abs(x - PLAT_X) < PLAT_W / 2 + halfW * 0.6 ? PLAT_TOP : WATER + 20
    for (const a of animals) {
      if (!a.landed || a.fallen) continue
      const b = a.body.bounds
      if (x > b.min.x - halfW * 0.5 && x < b.max.x + halfW * 0.5) y = Math.min(y, b.min.y)
    }
    return y
  }

  const drawCrane = (g: CanvasRenderingContext2D) => {
    const time = stage.time
    // Drop guide.
    if (hang && hang.appear > 0.8) {
      const sy = surfaceUnder(pose.x, pose.halfW) - cam
      const from = pose.y + pose.halfH + 10
      if (sy > from + 20) {
        const strong = aimId !== null
        g.strokeStyle = strong ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)'
        g.lineWidth = 5
        g.lineCap = 'round'
        g.setLineDash([4, 16])
        g.lineDashOffset = -time * 40
        g.beginPath()
        g.moveTo(pose.x, from)
        g.lineTo(pose.x, sy - 8)
        g.stroke()
        g.setLineDash([])
        g.fillStyle = strong ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.22)'
        g.beginPath()
        g.ellipse(pose.x, sy, pose.halfW * 0.9, 9, 0, 0, TAU)
        g.fill()
      }
    }

    // Girder.
    g.fillStyle = '#ffb02e'
    g.fillRect(-30, -30, W + 60, 52)
    g.fillStyle = '#e08a12'
    g.beginPath()
    for (let x = -20; x < W + 40; x += 56) {
      g.moveTo(x, 22)
      g.lineTo(x + 22, -8)
      g.lineTo(x + 36, -8)
      g.lineTo(x + 14, 22)
    }
    g.fill()
    g.fillStyle = '#8a5410'
    g.fillRect(-30, 20, W + 60, 5)

    if (hang) {
      const cupX = pose.x - Math.sin(pose.theta) * pose.halfH
      const cupY = pose.y - Math.cos(pose.theta) * pose.halfH
      g.strokeStyle = '#5b4636'
      g.lineWidth = 6
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(trolley.x, PIVOT_Y - 6)
      g.lineTo(cupX, cupY - 10)
      g.stroke()
      const box = boxOf(hang.kind)
      const f = hang.face
      f.t = time
      f.blink = blinkAt(time, 2)
      f.mood = Math.abs(trolley.vx) > 700 ? 'wow' : time < gleeUntil ? 'glee' : 'happy'
      const c = Math.cos(-pose.angle)
      const s = Math.sin(-pose.angle)
      const lx = clamp(trolley.vx / 600, -0.8, 0.8)
      f.lookX = lx * c - 0.8 * s
      f.lookY = lx * s + 0.8 * c
      f.wob = sway.value * 0.8
      drawKind(g, hang.kind, pose.x, pose.y, pose.angle, box.cx, box.cy, 1, 1, f)
      // Suction cup.
      g.save()
      g.translate(cupX, cupY)
      g.rotate(-pose.theta)
      g.beginPath()
      g.moveTo(-24, 4)
      g.quadraticCurveTo(-20, -18, 0, -18)
      g.quadraticCurveTo(20, -18, 24, 4)
      g.closePath()
      g.fillStyle = '#ff5d5d'
      g.fill()
      g.strokeStyle = '#a82a2a'
      g.lineWidth = 4
      g.stroke()
      g.restore()
    } else {
      g.strokeStyle = '#5b4636'
      g.lineWidth = 6
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(trolley.x, PIVOT_Y - 6)
      g.lineTo(trolley.x + Math.sin(sway.value) * 40, PIVOT_Y + 34)
      g.stroke()
    }
    // Trolley.
    g.beginPath()
    g.roundRect(trolley.x - 40, 10, 80, 30, 10)
    g.fillStyle = '#ff5d5d'
    g.fill()
    g.strokeStyle = '#a82a2a'
    g.lineWidth = 4
    g.stroke()
    for (const side of [-1, 1]) {
      ellipse(g, trolley.x + side * 24, 12, 9, 9, '#4a4a5c')
      ellipse(g, trolley.x + side * 24 + Math.cos(trolley.rolled / 9) * 4, 12 + Math.sin(trolley.rolled / 9) * 4, 2.5, 2.5, '#d8d8e6')
    }
  }

  const drawHud = (g: CanvasRenderingContext2D) => {
    const time = stage.time
    // Next up.
    const next = queue[0]
    if (next) {
      const box = boxOf(next)
      const pop = nextPop.value
      g.beginPath()
      g.arc(86, 118, 54, 0, TAU)
      g.fillStyle = 'rgba(255,255,255,0.8)'
      g.fill()
      g.strokeStyle = 'rgba(40,30,60,0.35)'
      g.lineWidth = 4
      g.stroke()
      const s = (78 / Math.max(box.w, box.h)) * pop
      const f = newFace()
      f.t = time
      f.blink = blinkAt(time, 7)
      drawKind(g, next, 86, 118 + Math.sin(time * 2.4) * 3, 0, box.cx, box.cy, s, s, f)
    }

    // Rotate button.
    const long = hang ? Math.abs(boxOf(hang.kind).w - boxOf(hang.kind).h) > 40 : false
    const bs = btnPop.value * (long ? 1 + Math.sin(time * 4) * 0.035 : 1)
    g.save()
    g.translate(BTN.x, BTN.y)
    g.scale(bs, bs)
    g.beginPath()
    g.arc(0, 5, BTN.r, 0, TAU)
    g.fillStyle = 'rgba(40,30,60,0.25)'
    g.fill()
    g.beginPath()
    g.arc(0, 0, BTN.r, 0, TAU)
    g.fillStyle = '#ffffff'
    g.fill()
    g.strokeStyle = '#ff8a3d'
    g.lineWidth = 7
    g.stroke()
    g.rotate(hang ? hang.rot.value : 0)
    g.strokeStyle = '#ff8a3d'
    g.lineWidth = 9
    g.lineCap = 'round'
    g.beginPath()
    g.arc(0, 0, 26, -Math.PI * 0.9, Math.PI * 0.45)
    g.stroke()
    const ax = Math.cos(Math.PI * 0.45) * 26
    const ay = Math.sin(Math.PI * 0.45) * 26
    g.beginPath()
    g.moveTo(ax + 15, ay - 9)
    g.lineTo(ax - 5, ay + 15)
    g.lineTo(ax - 15, ay - 11)
    g.closePath()
    g.fillStyle = '#ff8a3d'
    g.fill()
    g.restore()

    label(g, `${shownHeight.toFixed(1)} m`, W - 28, 66, 52, '#ffffff', 'rgba(40,30,60,0.85)', 'right')
    if (sessionBest > 0.05) label(g, `🏆 ${sessionBest.toFixed(1)}`, W - 28, 116, 30, '#ffe14d', 'rgba(40,30,60,0.85)', 'right')
  }

  return {
    update(dt) {
      const time = stage.time

      // Trolley follows the finger with a little give.
      const before = trolley.x
      trolley.x = damp(trolley.x, trolley.target, 20, dt)
      trolley.vx = (trolley.x - before) / Math.max(dt, 0.001)
      trolley.rolled += trolley.x - before
      sway.target = clamp(-trolley.vx / 3200, -0.3, 0.3)
      sway.update(dt)
      sway.value = clamp(sway.value, -0.45, 0.45)
      nextPop.update(dt)
      btnPop.update(dt)
      island.squash.update(dt)
      if (hang) hang.rot.update(dt)

      if (!hang && time >= nextHangAt) bringNext()
      updatePose()
      if (dropPending >= 0) {
        if (time - dropPending > 0.7) dropPending = -1
        else if (hang && hang.appear > 0.75 && Math.abs(trolley.x - trolley.target) < 10) drop()
      }

      stepWorld(dt)
      updateAnimals(dt)

      for (let i = swimmers.length - 1; i >= 0; i--) {
        const s = swimmers[i]!
        s.age += dt
        s.angle = damp(s.angle, Math.round(s.angle / TAU) * TAU, 5, dt)
        if (s.age > 0.5) s.x += s.dir * 120 * dt
        s.face.t = time + s.seed
        s.face.lookX = s.dir * 0.6
        s.face.flap = 0
        if (s.x < -260 || s.x > W + 260) swimmers.splice(i, 1)
      }
      for (let i = flyers.length - 1; i >= 0; i--) {
        const f = flyers[i]!
        f.age += dt
        f.vy -= 260 * dt
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.face.t = time
        if (f.age > 4) flyers.splice(i, 1)
      }
    },

    draw(g) {
      const time = stage.time
      drawBackdrop(g)

      g.save()
      g.translate(0, -cam)
      drawPole(g)
      drawIsland(g)

      for (const a of animals) {
        const b = a.body
        const [sx, sy] = volume(a.squash.value)
        drawKind(g, a.kind, b.position.x, b.position.y, b.angle, a.comX, a.comY, sx, sy, a.face)
      }
      for (const f of flyers) {
        const box = boxOf(f.kind)
        drawKind(g, f.kind, f.x, f.y, Math.sin(time * 8) * 0.15, box.cx, box.cy, 1, 1, f.face)
      }
      for (const s of swimmers) {
        const box = boxOf(s.kind)
        // Pops up out of the splash, then bobs along half under.
        const rise = ease.outBack(clamp(s.age / 0.5, 0, 1))
        const y = WATER + 30 + box.h * 0.5 - rise * box.h * 0.66 + Math.sin(time * 4 + s.seed) * 6
        drawKind(g, s.kind, s.x, y, s.angle + Math.sin(time * 3 + s.seed) * 0.08, box.cx, box.cy, s.dir, 1, s.face)
      }
      drawWaterFront(g)
      g.restore()

      drawCrane(g)
      drawHud(g)

      if (time - lastTouchAt > 5 && hang && aimId === null) {
        hint(g, pose.x + Math.sin(time * 1.5) * 120, pose.y + pose.halfH + 70, time, 64)
      }
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      if (Math.hypot(p.x - BTN.x, p.y - BTN.y) < BTN.r + 22) {
        rotate()
        fx.ring(BTN.x, BTN.y, '#ff8a3d', 80, 0.3)
        return
      }
      if (aimId !== null) return
      // A fast second tap must not swallow the drop the first one asked for.
      if (dropPending >= 0 && hang && hang.appear > 0.5) drop()
      aimId = p.id
      dropPending = -1
      trolley.target = clamp(p.x, TROLLEY_MIN, TROLLEY_MAX)
      fx.ring(p.x, p.y, '#ffffff', 46, 0.3)
      sfx.tick()
      sway.kick(p.x > trolley.x ? -0.8 : 0.8)
      // Poke an animal in the tower and it giggles.
      const wy = p.y + cam
      for (let i = animals.length - 1; i >= 0; i--) {
        const a = animals[i]!
        const b = a.body.bounds
        if (p.x > b.min.x && p.x < b.max.x && wy > b.min.y && wy < b.max.y) {
          a.squash.value = 0.82
          a.wob.kick(6)
          feel(a, 'glee', 0.7)
          a.kind.voice(sfx)
          fx.burst(p.x, p.y, { count: 5, color: ['#ff7ac8', '#ffe14d'], speed: 160, life: 0.5, size: 10, shape: 'heart', gravity: -120 })
          break
        }
      }
    },

    move(p: Pointer) {
      if (p.id !== aimId) return
      lastTouchAt = stage.time
      const was = trolley.target
      trolley.target = clamp(p.x, TROLLEY_MIN, TROLLEY_MAX)
      // A soft ratchet as the trolley rolls.
      if (Math.floor(was / 70) !== Math.floor(trolley.target / 70)) sfx.tone({ freq: 900, dur: 0.025, type: 'square', vol: 0.035 })
    },

    up(p: Pointer) {
      if (p.id !== aimId) return
      aimId = null
      lastTouchAt = stage.time
      dropPending = stage.time
    },

    dispose() {
      Events.off(engine, 'collisionStart', onCollide)
      Composite.clear(engine.world, false)
      Engine.clear(engine)
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'animal-tower',
    name: 'Animal Tower',
    emoji: '🦒',
    ages: [4, 9],
    pitch: 'Drop wobbly animals from a crane and stack them as high as they will go before they tumble into the lake.',
    howTo: 'Drag to aim the crane, lift your finger to drop. The round arrow turns the animal.',
    basedOn: 'Animal Tower Battle, Stack',
    whyFun: 'Real physics on funny shapes: every drop lands with a thud and a wobble, topples are a splashy joke, and the pole keeps counting up toward the moon.',
  },
  create,
}
