// Draw a Bridge: a little car wants to reach its friend at the flag. Whatever
// the child draws turns into a heavy crayon object (a matter-js compound body)
// that falls, lands with a thud and carries the car. Any solution counts.

import Matter from 'matter-js'
import { blinkAt, face, label, sprite, star, volume } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { clamp, damp, dist, ease, lerp, pick, rnd, spring, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { canvasOf, inkSprite, simplify } from './crayon.ts'
import type { Ctx, Pt } from './crayon.ts'
import { LEVELS, makeLevel, PIT_FLOOR, surfaceAt, THEMES } from './levels.ts'
import type { LevelDef } from './levels.ts'
import { paintBackground, paintCloud, paintTerrain } from './scenery.ts'

const CRAYONS: readonly [string, string][] = [
  ['#e8443a', '#8f1f18'],
  ['#2f7de1', '#15407f'],
  ['#8b4fd6', '#4a2380'],
  ['#f08a1c', '#8f4c08'],
  ['#17a673', '#0b5c3e'],
  ['#e84a9a', '#8a1f56'],
]
const FRIENDS: readonly [string, string][] = [
  ['#4db8ff', '#1f5f8f'],
  ['#ffb02e', '#94600c'],
  ['#b07cff', '#57348f'],
  ['#5ed36a', '#2a7a33'],
  ['#ff7ac8', '#8f2f68'],
]
const BALLS = ['#ff5d5d', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff', '#ff7ac8']
const DUST = ['#ffffff', '#efe3c4', '#d9c9a3']

const THICK = 18
const WHEEL_R = 22
const AXLE_X = 32
const AXLE_Y = 24
// Chassis centre sits this far above whatever the wheels rest on.
const RIDE = AXLE_Y + WHEEL_R
// Pixels per 1/60 s.
const SPEED = 3.8
const FALL_Y = 688
const MAX_STROKES = 9
const MAX_PEBBLES = 14
const MAX_INK = 1500
const ERASER = { x: 78, y: 76 }
const SUN = { x: 1076, y: 108 }

interface Ink {
  body: Matter.Body
  canvas: HTMLCanvasElement
  ox: number
  oy: number
  color: string
  born: number
  landed: boolean
  lastThud: number
  pebble: boolean
  len: number
}

interface Stroke {
  pts: Pt[]
  len: number
  color: number
  done: boolean
  scratch: number
}

interface WheelPose {
  x: number
  y: number
  a: number
}

interface Pose {
  x: number
  y: number
  angle: number
  wheels: WheelPose[]
}

interface StarItem {
  x: number
  y: number
  got: boolean
  seed: number
}

type CarState = 'wait' | 'drive' | 'hop' | 'win' | 'exit'

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a))
}

function drawWheel(g: Ctx, x: number, y: number, radius: number, a: number): void {
  g.beginPath()
  g.arc(x, y, radius, 0, TAU)
  g.fillStyle = '#3a3340'
  g.fill()
  g.lineWidth = 4
  g.strokeStyle = '#1e1428'
  g.stroke()
  g.beginPath()
  g.arc(x, y, radius * 0.5, 0, TAU)
  g.fillStyle = '#f4efe6'
  g.fill()
  g.fillStyle = '#8b8496'
  for (let i = 0; i < 3; i++) {
    const s = a + (i / 3) * TAU
    g.beginPath()
    g.arc(x + Math.cos(s) * radius * 0.27, y + Math.sin(s) * radius * 0.27, radius * 0.11, 0, TAU)
    g.fill()
  }
}

interface CarLook {
  color: string
  dark: string
  mood: Mood
  lookX: number
  lookY: number
  blink: number
  squash: number
  scale: number
  flip: number
  antenna: number
}

function drawCar(g: Ctx, pose: Pose, look: CarLook): void {
  g.save()
  g.translate(pose.x, pose.y)
  g.rotate(pose.angle)
  g.scale(look.flip * look.scale, look.scale)
  const [sx, sy] = volume(look.squash)
  g.translate(0, RIDE)
  g.scale(sx, sy)
  g.translate(0, -RIDE)
  // Antenna with a ball that lags behind.
  g.strokeStyle = '#1e1428'
  g.lineWidth = 3.5
  g.lineCap = 'round'
  const ax = -30 + Math.sin(look.antenna) * 30
  const ay = -36 - Math.cos(look.antenna) * 30
  g.beginPath()
  g.moveTo(-30, -36)
  g.quadraticCurveTo(-30, -52, ax, ay)
  g.stroke()
  g.beginPath()
  g.arc(ax, ay, 6.5, 0, TAU)
  g.fillStyle = '#ffe14d'
  g.fill()
  g.stroke()
  // Body: a bubble car.
  g.beginPath()
  g.moveTo(-52, 20)
  g.lineTo(-52, 0)
  g.bezierCurveTo(-52, -24, -40, -41, -8, -43)
  g.bezierCurveTo(20, -45, 34, -28, 40, -13)
  g.bezierCurveTo(52, -11, 57, -3, 57, 8)
  g.lineTo(57, 20)
  g.closePath()
  g.fillStyle = look.color
  g.fill()
  g.lineWidth = 4.5
  g.lineJoin = 'round'
  g.strokeStyle = look.dark
  g.stroke()
  // Shine, headlight, bumper line.
  g.beginPath()
  g.ellipse(-24, -28, 17, 7, -0.35, 0, TAU)
  g.fillStyle = 'rgba(255,255,255,0.38)'
  g.fill()
  g.beginPath()
  g.arc(51, 4, 5.5, 0, TAU)
  g.fillStyle = '#fff3a8'
  g.fill()
  g.lineWidth = 2.5
  g.stroke()
  // Cheek.
  g.beginPath()
  g.ellipse(36, -1, 6, 4, 0, 0, TAU)
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.fill()
  face(g, 8, -16, 11, look.mood, look.lookX * look.flip, look.lookY, look.blink)
  if (pose.wheels.length === 0) {
    drawWheel(g, -AXLE_X, AXLE_Y, WHEEL_R, 0)
    drawWheel(g, AXLE_X, AXLE_Y, WHEEL_R, 0)
  }
  g.restore()
  for (const w of pose.wheels) drawWheel(g, w.x, w.y, WHEEL_R, w.a)
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const { Engine, Bodies, Body, Composite, Constraint, Events, Query } = Matter

  const engine = Engine.create({ positionIterations: 8, velocityIterations: 6, constraintIterations: 4 })
  engine.gravity.y = 1.5
  const world = engine.world

  // ---- the car ---------------------------------------------------------
  const group = Body.nextGroup(true)
  const chassis = Bodies.rectangle(0, 0, 92, 40, { label: 'car', collisionFilter: { group }, density: 0.0009, friction: 0.3, chamfer: { radius: 10 } })
  const wheels = [-1, 1].map((s) =>
    Bodies.circle(s * AXLE_X, AXLE_Y, WHEEL_R, { label: 'wheel', collisionFilter: { group }, density: 0.003, friction: 1, frictionStatic: 4, restitution: 0.02 }),
  )
  const axles = wheels.map((w, i) => Constraint.create({ bodyA: chassis, pointA: { x: (i ? 1 : -1) * AXLE_X, y: AXLE_Y }, bodyB: w, stiffness: 1, length: 0 }))
  Composite.add(world, [chassis, ...wheels, ...axles])
  const carBodies = [chassis, ...wheels]
  const carMass = chassis.mass + wheels[0]!.mass + wheels[1]!.mass
  const isCar = (b: Matter.Body) => b === chassis || b === wheels[0] || b === wheels[1]

  const placeCar = (x: number, y: number, angle: number) => {
    Body.setPosition(chassis, { x, y })
    Body.setAngle(chassis, angle)
    Body.setVelocity(chassis, { x: 0, y: 0 })
    Body.setAngularVelocity(chassis, 0)
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    wheels.forEach((w, i) => {
      const ox = (i ? 1 : -1) * AXLE_X
      Body.setPosition(w, { x: x + ox * c - AXLE_Y * s, y: y + ox * s + AXLE_Y * c })
      Body.setVelocity(w, { x: 0, y: 0 })
      Body.setAngularVelocity(w, 0)
    })
  }
  const setCarSolid = (solid: boolean) => {
    for (const b of carBodies) b.collisionFilter.mask = solid ? 0xffffffff : 0
  }

  // ---- game state ------------------------------------------------------
  let levelIndex = 0
  let def: LevelDef = makeLevel(0, stage.rand)
  let statics: Matter.Body[] = []
  let terrain: HTMLCanvasElement | null = null
  let levelStars: StarItem[] = []
  let boulder: Matter.Body | null = null
  let gate: Matter.Body | null = null
  let gateOpen = 0
  let gateUpY = 0
  let buttonPress = 0
  let buttonDown = false
  let startY = 0
  let flagY = 0
  let levelAt = 0

  const inks: Ink[] = []
  const inkOf = new Map<number, Ink>()
  const strokes = new Map<number, Stroke>()
  let nextColor = 0

  let state: CarState = 'wait'
  let pending = false
  let goAt = 0
  let bestX = 0
  let bestAt = 0
  let flipFor = 0
  let airTime = 0
  let maxAir = 0
  let wheeed = false
  let wheelContactAt = 0
  let lastPuttAt = 0
  let lastPlankAt = 0
  let plankStep = 0
  let lastCarThudAt = -1
  let dizzyUntil = 0
  let grumpyUntil = 0
  let winAt = 0
  let attempts = 0
  let fails = 0
  let helped = false
  let sunTaps = 0
  let sunTapAt = -9
  let levelStrokes = 0
  let levelPebbles = 0
  let totalStrokes = 0
  let wins = 0
  let stars = 0
  let lastTouchAt = 0
  let eraserWiggle = 0
  let sunSpin = 0
  let sunAngle = 0
  let friendHop = 0
  let wheelSpin = 0
  const hop = { x0: 0, y0: 0, a0: 0, t: 0 }
  const exit = { t: 1, fromX: 0, fromY: 0 }
  const squash = spring(1, 260, 11)
  const antenna = spring(0, 120, 6)
  const friendSquash = spring(1, 240, 9)
  const eraserPop = spring(1, 260, 10)

  // ---- scenery ---------------------------------------------------------
  const backgrounds = THEMES.map((theme) => paintBackground(theme))
  const themeOf = (index: number) => Math.floor(index / 4) % THEMES.length
  let bgNow = backgrounds[0]!
  let bgOld = bgNow
  const [snapshot, snapCtx] = canvasOf(W, H)
  const clouds = [
    { canvas: paintCloud(210, 110), x: 150, y: 150, v: 9 },
    { canvas: paintCloud(150, 84), x: 560, y: 120, v: 14 },
    { canvas: paintCloud(180, 96), x: 860, y: 230, v: 6 },
  ]

  // ---- ink -------------------------------------------------------------
  const inkBodies = () => inks.map((k) => k.body)

  const registerInk = (ink: Ink) => {
    inks.push(ink)
    inkOf.set(ink.body.id, ink)
    Composite.add(world, ink.body)
    const over = ink.pebble ? MAX_PEBBLES : MAX_STROKES
    const same = inks.filter((k) => k.pebble === ink.pebble)
    if (same.length > over) poofInk(same[0]!, false)
  }

  function poofInk(ink: Ink, loud: boolean): void {
    const at = inks.indexOf(ink)
    if (at === -1) return
    inks.splice(at, 1)
    inkOf.delete(ink.body.id)
    Composite.remove(world, ink.body)
    const parts = ink.body.parts.length > 1 ? ink.body.parts.slice(1) : ink.body.parts
    const every = Math.max(1, Math.floor(parts.length / 7))
    for (let i = 0; i < parts.length; i += every) {
      const p = parts[i]!.position
      fx.burst(p.x, p.y, { count: loud ? 6 : 3, color: [ink.color, '#ffffff'], speed: 260, life: 0.5, size: 8, gravity: 500 })
    }
    if (loud) sfx.pop(Math.round(rnd(0, 5)))
  }

  const clipPoint = (p: Pt): Pt => {
    const pad = THICK / 2 + 1
    for (let pass = 0; pass < 2; pass++) {
      for (const c of def.cols) {
        if (p.x > c.x0 - pad && p.x < c.x1 + pad && p.y > c.top - pad) {
          const dTop = p.y - (c.top - pad)
          const dL = c.x0 > 0 ? p.x - (c.x0 - pad) : Infinity
          const dR = c.x1 < W ? c.x1 + pad - p.x : Infinity
          if (dTop <= dL && dTop <= dR) p.y = c.top - pad
          else if (dL < dR) p.x = c.x0 - pad
          else p.x = c.x1 + pad
        }
      }
    }
    return p
  }

  const addPebble = (x: number, y: number, colorIndex: number) => {
    const [color, dark] = CRAYONS[colorIndex % CRAYONS.length]!
    const p = clipPoint({ x, y })
    const body = Bodies.circle(p.x, p.y, 19, { label: 'ink', friction: 1, frictionStatic: 2, restitution: 0.4, density: 0.002 })
    const scribble: Pt[] = []
    for (let i = 0; i < 16; i++) scribble.push({ x: Math.cos(i * 1.9) * (2 + i * 0.55), y: Math.sin(i * 1.9) * (2 + i * 0.55) })
    const s = inkSprite(scribble, color, dark, 18)
    registerInk({ body, canvas: s.canvas, ox: s.ox, oy: s.oy, color, born: stage.time, landed: false, lastThud: -1, pebble: true, len: 30 })
    Body.setVelocity(body, { x: rnd(-0.6, 0.6), y: -3 })
    levelPebbles++
    sfx.pop(Math.round(rnd(2, 7)))
  }

  const addInk = (pts: Pt[], pair: readonly [string, string], step: number) => {
    const [color, dark] = pair
    const parts: Matter.Body[] = []
    let len = 0
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!
      const b = pts[i + 1]!
      const l = dist(a.x, a.y, b.x, b.y)
      len += l
      parts.push(Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, l + 2, THICK, { angle: Math.atan2(b.y - a.y, b.x - a.x), density: 0.0022 }))
    }
    const first = pts[0]!
    const last = pts[pts.length - 1]!
    parts.push(Bodies.circle(first.x, first.y, THICK / 2, { density: 0.0022 }), Bodies.circle(last.x, last.y, THICK / 2, { density: 0.0022 }))
    const body = Body.create({ parts, label: 'ink', friction: 1, frictionStatic: 4, restitution: 0.04 })
    const local = pts.map((p) => ({ x: p.x - body.position.x, y: p.y - body.position.y }))
    const s = inkSprite(local, color, dark, THICK + 2)
    registerInk({ body, canvas: s.canvas, ox: s.ox, oy: s.oy, color, born: stage.time, landed: false, lastThud: -1, pebble: false, len })
    // It turns real: sparkles along the line.
    const every = Math.max(1, Math.floor(pts.length / 6))
    for (let i = 0; i < pts.length; i += every) {
      fx.burst(pts[i]!.x, pts[i]!.y, { count: 3, color: [color, '#ffffff'], speed: 170, life: 0.45, size: 9, shape: 'star' })
    }
    sfx.tone({ freq: 300, to: 620, dur: 0.12, type: 'triangle', vol: 0.18 })
    sfx.pop(step % 5)
  }

  // Turn a finger path into a solid object. False when it was only a dot.
  const solidify = (path: readonly Pt[], pair: readonly [string, string], step: number): boolean => {
    const raw: Pt[] = []
    for (const p of path) {
      const q = clipPoint({ x: p.x, y: p.y })
      const prev = raw[raw.length - 1]
      if (!prev || dist(prev.x, prev.y, q.x, q.y) >= 2) raw.push(q)
    }
    let tolerance = 2.5
    let pts = simplify(raw, tolerance)
    while (pts.length > 38) {
      tolerance *= 1.6
      pts = simplify(raw, tolerance)
    }
    const clean: Pt[] = []
    for (const p of pts) {
      const prev = clean[clean.length - 1]
      if (!prev || dist(prev.x, prev.y, p.x, p.y) >= 4) clean.push(p)
    }
    if (clean.length < 2) return false
    addInk(clean, pair, step)
    return true
  }

  const finishStroke = (s: Stroke) => {
    s.done = true
    if (!solidify(s.pts, CRAYONS[s.color % CRAYONS.length]!, s.color)) {
      addPebble(s.pts[0]!.x, s.pts[0]!.y, s.color)
      return
    }
    totalStrokes++
    levelStrokes++
    pending = true
    goAt = stage.time + 0.75
  }

  const eraseAll = () => {
    eraserWiggle = 0.5
    eraserPop.value = 0.7
    if (inks.length === 0) {
      sfx.boing(3)
      fx.burst(ERASER.x, ERASER.y, { count: 8, color: ['#ff9fc0', '#ffffff'], speed: 240, life: 0.4, size: 8 })
      return
    }
    sfx.whoosh()
    const all = [...inks]
    all.forEach((ink, i) => {
      stage.after(i * 0.035, () => {
        poofInk(ink, false)
        sfx.pop(i)
      })
    })
  }

  // ---- levels ----------------------------------------------------------
  const buildLevel = (index: number) => {
    for (const b of statics) Composite.remove(world, b)
    for (const ink of inks) Composite.remove(world, ink.body)
    inks.length = 0
    inkOf.clear()
    if (boulder) Composite.remove(world, boulder)
    boulder = null
    gate = null

    levelIndex = index
    def = makeLevel(index, stage.rand)
    statics = []
    const solid = { isStatic: true, friction: 1, frictionStatic: 4 }
    for (const c of def.cols) {
      const h = H + 300 - c.top
      statics.push(Bodies.rectangle((c.x0 + c.x1) / 2, c.top + h / 2, c.x1 - c.x0, h, { ...solid, label: 'ground' }))
    }
    // The face of every step is slippery, or the grippy wheels climb walls.
    for (let i = 0; i < def.cols.length - 1; i++) {
      const a = def.cols[i]!
      const b = def.cols[i + 1]!
      if (Math.abs(a.x1 - b.x0) > 1 || a.top === b.top) continue
      const high = Math.min(a.top, b.top)
      const low = Math.max(a.top, b.top)
      const side = a.top > b.top ? -1 : 1
      statics.push(Bodies.rectangle(a.x1 + side, (high + 2 + low) / 2, 6, low - high - 2, { isStatic: true, friction: 0, label: 'ground' }))
    }
    statics.push(Bodies.rectangle(W / 2, PIT_FLOOR + 150, W * 2, 300, { ...solid, label: 'floor' }))
    statics.push(Bodies.rectangle(-40, H / 2, 80, H * 4, { ...solid, label: 'wall' }))
    if (def.button) {
      const top = surfaceAt(def, def.button.gateX)
      gateUpY = top - 95
      gate = Bodies.rectangle(def.button.gateX, gateUpY, 40, 190, { isStatic: true, friction: 0, label: 'gate' })
      statics.push(gate)
      gateOpen = 0
      buttonPress = 0
      buttonDown = false
    }
    Composite.add(world, statics)
    if (def.boulder) {
      const top = surfaceAt(def, def.boulder.x)
      boulder = Bodies.circle(def.boulder.x, top - def.boulder.r, def.boulder.r, { label: 'boulder', density: 0.004, friction: 0.9, frictionStatic: 2, restitution: 0.05 })
      Composite.add(world, boulder)
    }
    terrain = paintTerrain(def, THEMES[themeOf(index)]!)
    levelStars = def.stars.map(([x, y], i) => ({ x, y, got: false, seed: i * 2.1 }))
    startY = surfaceAt(def, def.startX) - RIDE
    flagY = surfaceAt(def, def.flagX)
    placeCar(def.startX, startY, 0)
    setCarSolid(true)
    levelAt = stage.time
    levelStrokes = 0
    levelPebbles = 0
    attempts = 0
    fails = 0
    helped = false
    maxAir = 0
    pending = false
  }
  buildLevel(0)

  // ---- car behaviour ---------------------------------------------------
  const honk = (high = false) => {
    const f = high ? 620 : 440
    sfx.tone({ freq: f, dur: 0.09, type: 'square', vol: 0.11 })
    sfx.tone({ freq: f, dur: 0.13, type: 'square', vol: 0.11, delay: 0.13 })
  }

  const go = () => {
    state = 'drive'
    pending = false
    bestX = chassis.position.x
    bestAt = stage.time
    flipFor = 0
    airTime = 0
    wheeed = false
    plankStep = 0
    attempts++
    honk()
    squash.value = 0.85
    fx.burst(chassis.position.x - 56, chassis.position.y + 14, { count: 5, color: '#d8d2c8', speed: 140, angle: Math.PI, spread: 0.9, life: 0.5, size: 12, gravity: -90 })
  }

  const startHop = () => {
    state = 'hop'
    hop.x0 = chassis.position.x
    hop.y0 = chassis.position.y
    hop.a0 = wrap(chassis.angle)
    hop.t = 0
    pending = false
    setCarSolid(false)
    sfx.slideUp()
  }

  const splash = () => {
    const x = chassis.position.x
    fx.burst(x, PIT_FLOOR - 24, { count: 28, color: BALLS, speed: 680, angle: -Math.PI / 2, spread: 1.5, life: 1.1, size: 17, gravity: 1500 })
    fx.text(x, chassis.position.y - 130, pick(['WHEEE!', 'SPLOOSH!', 'BOING!', 'WAHOO!']), { size: 58, color: '#ffe14d' })
    sfx.splat()
    sfx.boing(2)
    fx.shake(7)
    fx.hitstop(50)
    fails++
    startHop()
  }

  // After a few tumbles the sun lends a hand: it rubs everything out and
  // draws the hint line for real, in gold. Nobody stays stuck on a level.
  const sunHelps = () => {
    if (state !== 'wait' || helped) return
    helped = true
    for (const ink of [...inks]) poofInk(ink, false)
    sunSpin = 10
    sfx.ding(3)
    sfx.ding(5)
    fx.burst(SUN.x, SUN.y, { count: 16, color: '#ffe14d', speed: 360, life: 0.7, size: 13, shape: 'star' })
    solidify(
      def.hint.map(([x, y]) => ({ x, y })),
      ['#ffc21a', '#8f5d00'],
      4,
    )
    pending = true
    goAt = stage.time + 1
  }

  const stuck = () => {
    grumpyUntil = stage.time + 1.4
    sfx.nope()
    fx.text(chassis.position.x, chassis.position.y - 90, '?!', { size: 50, color: '#ffffff' })
    fails++
    startHop()
  }

  const win = () => {
    state = 'win'
    winAt = stage.time
    wins++
    const x = chassis.position.x
    const y = chassis.position.y
    Body.setVelocity(chassis, { x: 0.4, y: -8 })
    for (const w of wheels) Body.setVelocity(w, { x: 0.4, y: -8 })
    friendHop = 1
    friendSquash.value = 0.7
    fx.confetti(def.flagX, flagY - 150, 70)
    fx.confetti(x, y - 40, 40)
    fx.shake(6)
    fx.hitstop(60)
    sfx.fanfare()
    honk(true)
    let cheer = pick(['NICE!', 'BEEP BEEP!', 'ZOOM!', 'YAY!'])
    if (maxAir > 0.55) cheer = 'BIG AIR!'
    else if (levelStrokes >= 4) cheer = 'SCRIBBLE POWER!'
    else if (levelPebbles >= 5) cheer = 'PEBBLE PARTY!'
    else if (attempts === 1 && levelIndex > 0) cheer = 'FIRST TRY!'
    fx.text(W / 2, 300, cheer, { size: 84, color: '#ffe14d', life: 1.2, rise: 60 })
    if (wins % LEVELS === 0) stage.after(0.3, () => fx.confetti(W / 2, 200, 120))
  }

  const drawWorld = (g: Ctx, time: number) => {
    // The gate stands behind the ground so it can sink into it.
    if (gate && def.button) {
      const gx = gate.position.x
      const gy = gate.position.y
      g.save()
      g.beginPath()
      g.roundRect(gx - 20, gy - 95, 40, 190, 10)
      g.fillStyle = '#ffffff'
      g.fill()
      g.clip()
      g.fillStyle = '#ff5d5d'
      for (let i = -2; i < 8; i++) {
        g.beginPath()
        g.moveTo(gx - 24, gy - 95 + i * 44)
        g.lineTo(gx + 24, gy - 95 + i * 44 - 26)
        g.lineTo(gx + 24, gy - 95 + i * 44 - 4)
        g.lineTo(gx - 24, gy - 95 + i * 44 + 22)
        g.closePath()
        g.fill()
      }
      g.restore()
      g.beginPath()
      g.roundRect(gx - 20, gy - 95, 40, 190, 10)
      g.lineWidth = 5
      g.strokeStyle = '#5a1f1f'
      g.stroke()
    }
    if (terrain) g.drawImage(terrain, 0, 0)

    if (def.button) {
      const bx = def.button.x
      const by = surfaceAt(def, bx)
      g.beginPath()
      g.ellipse(bx, by - 6, 48, (1 - buttonPress * 0.7) * 34, 0, Math.PI, TAU)
      g.fillStyle = '#ff4d5e'
      g.fill()
      g.lineWidth = 4.5
      g.strokeStyle = '#7a1420'
      g.stroke()
      g.beginPath()
      g.roundRect(bx - 62, by - 9, 124, 14, 7)
      g.fillStyle = '#7d7f92'
      g.fill()
      g.strokeStyle = '#3a3b4a'
      g.stroke()
      if (!buttonDown) {
        // A bouncing crayon arrow: something has to sit here.
        const ay = by - 120 + Math.abs(Math.sin(time * 4)) * 22
        g.lineCap = 'round'
        g.lineJoin = 'round'
        for (const [color, width] of [['#7a1420', 15], ['#ff4d5e', 9]] as const) {
          g.strokeStyle = color
          g.lineWidth = width
          g.beginPath()
          g.moveTo(bx, ay - 46)
          g.lineTo(bx, ay)
          g.moveTo(bx - 20, ay - 20)
          g.lineTo(bx, ay)
          g.lineTo(bx + 20, ay - 20)
          g.stroke()
        }
      }
    }

    // Flag and the friend waiting beside it.
    const fxp = def.flagX
    g.strokeStyle = '#4a3a2a'
    g.lineWidth = 7
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(fxp, flagY)
    g.lineTo(fxp, flagY - 156)
    g.stroke()
    const wave = state === 'win' ? 12 : 5
    for (let cx = 0; cx < 4; cx++) {
      for (let cy = 0; cy < 3; cy++) {
        const x0 = fxp + 3 + cx * 19
        const y0 = flagY - 154 + cy * 17 + Math.sin(time * 6 - cx * 0.9) * wave * (cx / 3)
        const y1 = flagY - 154 + cy * 17 + Math.sin(time * 6 - (cx + 1) * 0.9) * wave * ((cx + 1) / 3)
        g.beginPath()
        g.moveTo(x0, y0)
        g.lineTo(x0 + 19, y1)
        g.lineTo(x0 + 19, y1 + 17)
        g.lineTo(x0, y0 + 17)
        g.closePath()
        g.fillStyle = (cx + cy) % 2 === 0 ? '#2a2333' : '#ffffff'
        g.fill()
      }
    }
    g.beginPath()
    g.arc(fxp, flagY - 160, 8, 0, TAU)
    g.fillStyle = '#ffd23f'
    g.fill()
    g.lineWidth = 3
    g.strokeStyle = '#4a3a2a'
    g.stroke()

    const [fc, fd] = FRIENDS[levelIndex % FRIENDS.length]!
    const fy = flagY - RIDE * 0.8 - Math.abs(Math.sin(friendHop * Math.PI * 3)) * friendHop * 60 - Math.abs(Math.sin(time * 2.4)) * 3
    const look = clamp((chassis.position.x - (fxp + 84)) / 500, -1, 1)
    drawCar(
      g,
      { x: fxp + 88, y: fy, angle: 0, wheels: [] },
      { color: fc, dark: fd, mood: 'happy', lookX: look, lookY: 0, blink: blinkAt(time, 3), squash: friendSquash.value, scale: 0.8, flip: -1, antenna: Math.sin(time * 2.4) * 0.15 },
    )

    for (const s of levelStars) {
      if (s.got) continue
      const y = s.y + Math.sin(time * 2.6 + s.seed) * 7
      g.globalAlpha = 0.25
      star(g, s.x, y, 40 + Math.sin(time * 5 + s.seed) * 4, '#ffe14d', time * 0.6)
      g.globalAlpha = 1
      star(g, s.x, y, 29, '#8a5a00', Math.sin(time * 2 + s.seed) * 0.2)
      star(g, s.x, y, 24, '#ffd23f', Math.sin(time * 2 + s.seed) * 0.2)
    }

    if (boulder) {
      const b = boulder
      const rad = def.boulder?.r ?? 50
      g.save()
      g.translate(b.position.x, b.position.y)
      g.rotate(b.angle)
      g.beginPath()
      g.arc(0, 0, rad, 0, TAU)
      g.fillStyle = '#a9a7b8'
      g.fill()
      g.lineWidth = 5
      g.strokeStyle = '#4d4a5e'
      g.stroke()
      g.beginPath()
      g.ellipse(-rad * 0.35, -rad * 0.45, rad * 0.3, rad * 0.16, -0.5, 0, TAU)
      g.fillStyle = 'rgba(255,255,255,0.35)'
      g.fill()
      g.strokeStyle = 'rgba(77,74,94,0.6)'
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(rad * 0.3, rad * 0.5)
      g.lineTo(rad * 0.5, rad * 0.3)
      g.lineTo(rad * 0.62, rad * 0.42)
      g.stroke()
      const awake = Math.hypot(b.velocity.x, b.velocity.y) > 0.4 || Math.abs(b.angularVelocity) > 0.01
      face(g, 0, -4, rad * 0.2, awake ? 'wow' : 'sleepy', 0, 0, 0)
      g.restore()
      if (!awake) {
        const z = (time * 0.6) % 1
        g.globalAlpha = 1 - z
        label(g, 'z', b.position.x + rad * 0.7 + z * 20, b.position.y - rad - z * 50, 26 + z * 14, '#ffffff')
        g.globalAlpha = 1
      }
    }

    for (const ink of inks) {
      const age = time - ink.born
      const pop = age < 0.25 ? 1 + 0.14 * Math.sin((age / 0.25) * Math.PI) : 1
      // A heavy landing squashes the whole drawing for a moment.
      const hit = time - ink.lastThud
      const thud = hit >= 0 && hit < 0.18 ? Math.sin((hit / 0.18) * Math.PI) * 0.07 : 0
      g.save()
      g.translate(ink.body.position.x, ink.body.position.y)
      if (thud > 0) g.scale(1 + thud, 1 - thud)
      g.rotate(ink.body.angle)
      if (pop !== 1) g.scale(pop, pop)
      g.drawImage(ink.canvas, ink.ox, ink.oy)
      g.restore()
    }
  }

  const startExit = () => {
    snapCtx.clearRect(0, 0, W, H)
    drawWorld(snapCtx, stage.time)
    exit.t = 0
    exit.fromX = chassis.position.x
    exit.fromY = chassis.position.y
    bgOld = bgNow
    buildLevel(levelIndex + 1)
    bgNow = backgrounds[themeOf(levelIndex)]!
    state = 'exit'
    sfx.whoosh()
  }

  // ---- collisions: thuds, dust, planks, bonks --------------------------
  const onCollide = (event: Matter.IEventCollision<Matter.Engine>) => {
    const now = stage.time
    for (const pair of event.pairs) {
      const a = pair.bodyA.parent
      const b = pair.bodyB.parent
      const carA = isCar(a)
      const carB = isCar(b)
      if (a === wheels[0] || a === wheels[1] || b === wheels[0] || b === wheels[1]) wheelContactAt = now
      const va = Body.getVelocity(a)
      const vb = Body.getVelocity(b)
      const rel = Math.hypot(va.x - vb.x, va.y - vb.y)
      const sup = pair.collision.supports[0]
      const ia = inkOf.get(a.id)
      const ib = inkOf.get(b.id)
      const ink = ia ?? ib
      const car = carA || carB
      const cx = sup?.x ?? (ink ? ink.body.position.x : a.position.x)
      const cy = sup?.y ?? (ink ? ink.body.position.y : a.position.y)

      if (ink && car) {
        const fresh = now - ink.born < 2.5 && !ink.landed
        if (fresh && rel > 3.5 && state === 'wait' && now > dizzyUntil) {
          dizzyUntil = now + 1
          squash.value = 0.7
          sfx.boing(-2)
          fx.text(chassis.position.x, chassis.position.y - 90, 'BONK!', { size: 44, color: '#ffffff' })
          fx.burst(cx, cy, { count: 8, color: '#ffe14d', speed: 300, life: 0.5, size: 12, shape: 'star' })
        } else if (state === 'drive' && now - lastPlankAt > 0.09) {
          lastPlankAt = now
          sfx.note(plankStep % 10, 0.16, 'triangle', 0.14)
          plankStep++
        }
        continue
      }
      if (ink) {
        if (rel > 1.4 && now - ink.lastThud > 0.2) {
          ink.lastThud = now
          const weight = ink.pebble ? 0.25 : 0.5 + ink.len / 500
          const strength = clamp((rel / 14) * weight, 0.12, 1)
          if (ink.pebble) sfx.tick()
          else sfx.thud(strength)
          fx.burst(cx, cy, { count: ink.pebble ? 3 : 5 + Math.round(strength * 8), color: DUST, speed: 120 + strength * 260, angle: -Math.PI / 2, spread: Math.PI, life: 0.5, size: 8 + strength * 6, gravity: 200 })
          if (!ink.landed && !ink.pebble) {
            fx.shake(clamp(2 + ink.len / 140, 2, 8) * clamp(rel / 8, 0.4, 1))
            fx.burst(cx, cy, { count: 6, color: ink.color, speed: 220, angle: -Math.PI / 2, spread: 2, life: 0.5, size: 6, gravity: 700 })
          }
          ink.landed = true
        }
        continue
      }
      if (car && rel > 4.5 && now - lastCarThudAt > 0.3 && (state === 'drive' || state === 'wait' || state === 'win')) {
        lastCarThudAt = now
        squash.value = 0.72
        sfx.thud(clamp(rel / 14, 0.3, 0.9))
        fx.burst(chassis.position.x, chassis.position.y + RIDE, { count: 8, color: DUST, speed: 220, angle: -Math.PI / 2, spread: Math.PI, life: 0.45, size: 10 })
        continue
      }
      if ((a === boulder || b === boulder) && rel > 2) {
        sfx.thud(0.8)
        fx.shake(5)
      }
    }
  }
  const onActive = (event: Matter.IEventCollision<Matter.Engine>) => {
    for (const pair of event.pairs) {
      const a = pair.bodyA.parent
      const b = pair.bodyB.parent
      if (a === wheels[0] || a === wheels[1] || b === wheels[0] || b === wheels[1]) {
        wheelContactAt = stage.time
        return
      }
    }
  }
  Events.on(engine, 'collisionStart', onCollide)
  Events.on(engine, 'collisionActive', onActive)

  const carPose = (): Pose => {
    if (state === 'exit') {
      const e = ease.inOutCubic(exit.t)
      const x = lerp(exit.fromX, def.startX, e)
      const y = lerp(exit.fromY, startY, e) - Math.abs(Math.sin(exit.t * Math.PI * 3)) * 10
      return {
        x,
        y,
        angle: -Math.sin(exit.t * Math.PI) * 0.08,
        wheels: [
          { x: x - AXLE_X, y: y + AXLE_Y, a: wheelSpin },
          { x: x + AXLE_X, y: y + AXLE_Y, a: wheelSpin },
        ],
      }
    }
    return {
      x: chassis.position.x,
      y: chassis.position.y,
      angle: chassis.angle,
      wheels: wheels.map((w) => ({ x: w.position.x, y: w.position.y, a: w.angle })),
    }
  }

  const tap = (x: number, y: number, colorIndex: number) => {
    if (dist(x, y, SUN.x, SUN.y) < 80) {
      sunSpin = 14
      sunTaps = stage.time - sunTapAt < 0.7 ? sunTaps + 1 : 1
      sunTapAt = stage.time
      if (sunTaps >= 3 && (state === 'wait' || state === 'drive')) {
        // Three quick taps on the sun skip the level (for grown-ups and the very stuck).
        sunTaps = 0
        state = 'win'
        winAt = stage.time - 0.8
        return
      }
      for (let i = 0; i < 4; i++) sfx.tone({ freq: sfx.scale(4 + i * 2), dur: 0.14, vol: 0.14, delay: i * 0.06 })
      fx.burst(SUN.x, SUN.y, { count: 12, color: '#ffe14d', speed: 320, life: 0.6, size: 12, shape: 'star' })
      return
    }
    if (dist(x, y, chassis.position.x, chassis.position.y) < 72 && (state === 'wait' || state === 'drive')) {
      squash.value = 0.7
      if (state === 'wait') {
        Body.setVelocity(chassis, { x: 0, y: -4 })
        go()
      } else {
        honk()
      }
      return
    }
    if (dist(x, y, def.flagX + 88, flagY - 40) < 66) {
      friendHop = 1
      friendSquash.value = 0.7
      honk(true)
      fx.burst(def.flagX + 88, flagY - 80, { count: 6, color: '#ff7ac8', speed: 200, life: 0.6, size: 12, shape: 'heart', gravity: -120 })
      return
    }
    // A tap on a drawing rubs it out.
    const bodies = inkBodies()
    for (const [ox, oy] of [[0, 0], [0, 10], [0, -10], [10, 0], [-10, 0], [0, 20], [0, -20]] as const) {
      const hit = Query.point(bodies, { x: x + ox, y: y + oy })[0]
      const ink = hit ? inkOf.get(hit.parent.id) ?? inkOf.get(hit.id) : undefined
      if (ink) {
        poofInk(ink, true)
        return
      }
    }
    addPebble(x, y, colorIndex)
  }

  const motor = () => {
    const driving = state === 'drive'
    const target = driving ? SPEED / WHEEL_R : 0
    // Nose in the air against a wall: let go, or the car ladders up any step.
    const tilt = wrap(chassis.angle)
    const rearing = driving && (tilt < -0.8 || tilt > 1.3)
    if (!rearing) {
      for (const w of wheels) {
        const now = Body.getAngularVelocity(w)
        Body.setAngularVelocity(w, now + (target - now) * (driving ? 0.22 : 0.5))
      }
    }
    if (stage.time - wheelContactAt > 0.05) {
      // In the air a cartoon car levels itself, so a drop ends on its wheels.
      const lean = wrap(chassis.angle)
      Body.setAngularVelocity(chassis, Body.getAngularVelocity(chassis) * 0.9 - lean * 0.014)
    }
    if (driving && !rearing && stage.time - wheelContactAt < 0.1) {
      const v = Body.getVelocity(chassis)
      if (v.x < SPEED * 0.8) {
        const f = carMass * 0.001 * engine.gravity.y * 0.45
        Body.applyForce(chassis, chassis.position, { x: Math.cos(chassis.angle) * f, y: Math.sin(chassis.angle) * f })
      }
    }
  }

  const limit = (body: Matter.Body, max: number) => {
    const v = Body.getVelocity(body)
    const s = Math.hypot(v.x, v.y)
    if (s > max) Body.setVelocity(body, { x: (v.x / s) * max, y: (v.y / s) * max })
    const w = Body.getAngularVelocity(body)
    if (Math.abs(w) > 0.6) Body.setAngularVelocity(body, Math.sign(w) * 0.6)
  }

  return {
    update(dt) {
      const time = stage.time
      const steps = clamp(Math.round(dt * 120), 1, 4)
      for (let i = 0; i < steps; i++) {
        if (state !== 'hop' && state !== 'exit') motor()
        Engine.update(engine, (dt * 1000) / steps)
        for (const ink of inks) limit(ink.body, 34)
        limit(chassis, 30)
      }

      // ---- car states
      const cx = chassis.position.x
      const cy = chassis.position.y
      if (state === 'wait') {
        if (pending && strokes.size === 0 && time >= goAt) go()
      } else if (state === 'drive') {
        if (cx > bestX + 3) {
          bestX = cx
          bestAt = time
        }
        flipFor = Math.abs(wrap(chassis.angle)) > 1.8 ? flipFor + dt : 0
        if (time - wheelContactAt > 0.12) {
          airTime += dt
          maxAir = Math.max(maxAir, airTime)
          if (!wheeed && airTime > 0.2 && Body.getVelocity(chassis).y > 3) {
            wheeed = true
            sfx.slideDown()
          }
        } else {
          airTime = 0
        }
        if (time - lastPuttAt > 0.2) {
          lastPuttAt = time
          sfx.tone({ freq: rnd(190, 215), to: 140, dur: 0.06, type: 'square', vol: 0.03 })
          const back = wrap(chassis.angle)
          fx.burst(cx - Math.cos(back) * 56, cy - Math.sin(back) * 56 + 14, { count: 1, color: '#d8d2c8', speed: 70, angle: Math.PI, spread: 0.8, life: 0.55, size: 11, gravity: -110 })
        }
        if (time - bestAt > 2.6 || flipFor > 0.9) stuck()
      } else if (state === 'hop') {
        hop.t = Math.min(1, hop.t + dt / 0.8)
        const e = ease.inOutQuad(hop.t)
        const restY = startY
        placeCar(lerp(hop.x0, def.startX, e), lerp(hop.y0, restY, e) - Math.sin(hop.t * Math.PI) * 230, lerp(hop.a0, -TAU, e))
        if (hop.t === 1) {
          placeCar(def.startX, restY, 0)
          setCarSolid(true)
          state = 'wait'
          squash.value = 0.65
          lastCarThudAt = time
          sfx.thud(0.5)
          fx.burst(def.startX, restY + RIDE, { count: 10, color: DUST, speed: 240, angle: -Math.PI / 2, spread: Math.PI, life: 0.45, size: 10 })
          if (fails >= 4 && !helped) stage.after(0.5, sunHelps)
        }
      } else if (state === 'win') {
        if (time - winAt > 1.05) startExit()
      } else {
        exit.t = Math.min(1, exit.t + dt / 0.75)
        wheelSpin += dt * 16
        placeCar(def.startX, startY, 0)
        if (exit.t === 1) {
          state = 'wait'
          squash.value = 0.8
          levelAt = time
        }
      }
      if (state === 'wait' || state === 'drive') {
        if (chassis.position.y > FALL_Y) splash()
        else if (chassis.position.x >= def.flagX - 8 && chassis.position.y < flagY + 10) win()
      }

      // ---- stars
      if (state === 'drive' || state === 'win') {
        for (const s of levelStars) {
          if (s.got || dist(s.x, s.y, chassis.position.x, chassis.position.y - 8) > 58) continue
          s.got = true
          stars++
          sfx.coin(stars % 6)
          fx.burst(s.x, s.y, { count: 14, color: ['#ffe14d', '#ffffff'], speed: 380, life: 0.7, size: 13, shape: 'star' })
          fx.text(s.x, s.y - 50, '⭐', { size: 48 })
          fx.ring(s.x, s.y, '#ffe14d', 90, 0.35)
        }
      }

      // ---- button and gate
      if (gate && def.button) {
        const bx = def.button.x
        const by = surfaceAt(def, bx)
        const movers = [...carBodies, ...inkBodies()]
        const pressed = Query.ray(movers, { x: bx - 34, y: by - 10 }, { x: bx + 34, y: by - 10 }, 8).length > 0
        if (pressed !== buttonDown) {
          buttonDown = pressed
          if (pressed) {
            sfx.ding(2)
            sfx.slideDown()
            fx.ring(bx, by - 10, '#ff4d5e', 80, 0.3)
          } else {
            sfx.tick()
          }
        }
        buttonPress = damp(buttonPress, pressed ? 1 : 0, 18, dt)
        gateOpen = damp(gateOpen, pressed ? 1 : 0, 7, dt)
        Body.setPosition(gate, { x: def.button.gateX, y: gateUpY + gateOpen * 200 })
      }

      // ---- housekeeping
      for (let i = inks.length - 1; i >= 0; i--) {
        const p = inks[i]!.body.position
        if (p.y > H + 300 || p.x < -400 || p.x > W + 400) {
          const ink = inks[i]!
          inks.splice(i, 1)
          inkOf.delete(ink.body.id)
          Composite.remove(world, ink.body)
        }
      }
      squash.update(dt)
      friendSquash.update(dt)
      eraserPop.update(dt)
      antenna.target = state === 'exit' ? -0.5 : clamp(-Body.getVelocity(chassis).x * 0.16, -0.7, 0.7)
      antenna.update(dt)
      friendHop = Math.max(0, friendHop - dt * 1.3)
      eraserWiggle = Math.max(0, eraserWiggle - dt)
      sunSpin = damp(sunSpin, 0, 2.5, dt)
      sunAngle += dt * (0.25 + sunSpin)
      for (const c of clouds) {
        c.x += c.v * dt
        if (c.x > W + 40) c.x = -260
      }
    },

    draw(g) {
      const time = stage.time
      const exiting = state === 'exit'
      const e = exiting ? ease.inOutCubic(exit.t) : 1
      if (exiting && bgOld !== bgNow) {
        g.drawImage(bgOld, 0, 0)
        g.globalAlpha = e
        g.drawImage(bgNow, 0, 0)
        g.globalAlpha = 1
      } else {
        g.drawImage(bgNow, 0, 0)
      }

      for (const c of clouds) g.drawImage(c.canvas, c.x, c.y + Math.sin(time * 0.5 + c.v) * 5)

      // The sun watches whatever is going on.
      let eyeX = chassis.position.x
      let eyeY = chassis.position.y
      for (const p of stage.pointers.values()) {
        eyeX = p.x
        eyeY = p.y
      }
      g.save()
      g.translate(SUN.x, SUN.y)
      g.strokeStyle = '#f5a623'
      g.lineWidth = 8
      g.lineCap = 'round'
      for (let i = 0; i < 12; i++) {
        const a = sunAngle + (i / 12) * TAU
        const r0 = 66 + (i % 2) * 6
        const r1 = 88 + (i % 2) * 14 + Math.sin(time * 3 + i) * 3
        g.beginPath()
        g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0)
        g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1)
        g.stroke()
      }
      g.beginPath()
      g.arc(0, 0, 56, 0, TAU)
      g.fillStyle = '#ffd23f'
      g.fill()
      g.lineWidth = 5
      g.stroke()
      const sd = Math.hypot(eyeX - SUN.x, eyeY - SUN.y) || 1
      face(g, 0, -8, 13, sunSpin > 1 ? 'yum' : 'happy', (eyeX - SUN.x) / sd, (eyeY - SUN.y) / sd, blinkAt(time, 5))
      g.restore()

      if (exiting) {
        g.drawImage(snapshot, -e * W, 0)
        g.save()
        g.translate((1 - e) * W, 0)
        drawWorld(g, time)
        g.restore()
      } else {
        drawWorld(g, time)
      }

      // ---- the car
      const pose = carPose()
      let mood: Mood = 'happy'
      if (time < dizzyUntil) mood = 'dizzy'
      else if (state === 'win' || exiting) mood = 'happy'
      else if (state === 'hop') mood = time < grumpyUntil ? 'grumpy' : 'wow'
      else if (state === 'drive' && airTime > 0.15) mood = 'wow'
      else if (time < grumpyUntil) mood = 'grumpy'
      else if (state === 'wait' && !pending && time - lastTouchAt > 14) mood = 'sleepy'
      const lookAt = stage.pointers.size > 0 && state === 'wait' ? { x: eyeX, y: eyeY } : { x: def.flagX, y: flagY - 60 }
      const ld = Math.hypot(lookAt.x - pose.x, lookAt.y - pose.y) || 1
      const idle = state === 'wait' ? Math.sin(time * 9) * 0.012 + Math.sin(time * 2.2) * 0.02 : 0
      const rev = state === 'wait' && pending ? Math.sin(time * 40) * 0.03 : 0
      drawCar(g, pose, {
        color: '#ff5a4d',
        dark: '#8a1d16',
        mood,
        lookX: clamp(((lookAt.x - pose.x) / ld) * 1.2, -1, 1),
        lookY: clamp(((lookAt.y - pose.y) / ld) * 1.2, -1, 1),
        blink: blinkAt(time, 1),
        squash: squash.value + idle + rev,
        scale: 1,
        flip: 1,
        antenna: antenna.value,
      })

      // ---- strokes being drawn
      g.lineCap = 'round'
      g.lineJoin = 'round'
      for (const s of strokes.values()) {
        if (s.done) continue
        const [color, dark] = CRAYONS[s.color % CRAYONS.length]!
        for (let pass = 0; pass < 2; pass++) {
          g.beginPath()
          const first = s.pts[0]!
          g.moveTo(first.x, first.y)
          if (s.pts.length === 1) g.lineTo(first.x + 0.1, first.y)
          for (let i = 1; i < s.pts.length; i++) g.lineTo(s.pts[i]!.x, s.pts[i]!.y)
          g.strokeStyle = pass === 0 ? dark : color
          g.lineWidth = pass === 0 ? THICK + 6 : THICK + 2
          g.stroke()
        }
        // Running out of crayon: the tip flashes.
        const tip = s.pts[s.pts.length - 1]!
        g.beginPath()
        g.arc(tip.x, tip.y, 13 + Math.sin(time * 20) * 2, 0, TAU)
        g.fillStyle = s.len > MAX_INK * 0.8 ? '#ffffff' : color
        g.fill()
        g.lineWidth = 3
        g.strokeStyle = '#ffffff'
        g.stroke()
      }

      // ---- eraser
      g.save()
      g.translate(ERASER.x, ERASER.y)
      const hasInk = inks.length > 0
      g.rotate(-0.28 + Math.sin(eraserWiggle * 40) * eraserWiggle * 0.6 + (hasInk ? Math.sin(time * 3) * 0.05 : 0))
      const ep = eraserPop.value
      g.scale(2 - ep, ep)
      g.globalAlpha = hasInk ? 1 : 0.55
      g.beginPath()
      g.roundRect(-46, -28, 92, 56, 14)
      g.fillStyle = '#ff9fc0'
      g.fill()
      g.lineWidth = 5
      g.strokeStyle = '#8a2f56'
      g.stroke()
      g.beginPath()
      g.roundRect(-46, -28, 34, 56, [14, 0, 0, 14])
      g.fillStyle = '#5aa9ff'
      g.fill()
      g.stroke()
      face(g, 14, -6, 8, hasInk ? 'happy' : 'sleepy', 0, 0, blinkAt(time, 7))
      g.restore()

      // ---- counters
      label(g, `🏁 ${wins}`, W / 2 - 80, 50, 40)
      label(g, `⭐ ${stars}`, W / 2 + 80, 50, 40)

      // ---- idle hint: a pencil sketching the ghost of a line
      const quiet = state === 'wait' && !pending && strokes.size === 0
      const wantHint = totalStrokes === 0 ? time > 1.2 : time - lastTouchAt > 6 && time - levelAt > 5
      if (quiet && wantHint && def.hint.length > 1) {
        const pts = def.hint
        let total = 0
        for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1])
        const phase = (time % 2.4) / 1.7
        const reach = clamp(ease.inOutQuad(clamp(phase, 0, 1)), 0, 1) * total
        let px = pts[0]![0]
        let py = pts[0]![1]
        g.setLineDash([16, 14])
        g.lineWidth = 9
        g.strokeStyle = 'rgba(40,30,60,0.22)'
        g.beginPath()
        g.moveTo(px, py)
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]![0], pts[i]![1])
        g.stroke()
        g.strokeStyle = 'rgba(232,68,58,0.85)'
        g.beginPath()
        g.moveTo(px, py)
        let left = reach
        for (let i = 1; i < pts.length && left > 0; i++) {
          const a = pts[i - 1]!
          const b = pts[i]!
          const l = dist(a[0], a[1], b[0], b[1])
          const t = Math.min(1, left / l)
          px = lerp(a[0], b[0], t)
          py = lerp(a[1], b[1], t)
          g.lineTo(px, py)
          left -= l
        }
        g.stroke()
        g.setLineDash([])
        sprite(g, '✏️', px + 30, py - 30 + Math.sin(time * 14) * 2, 70)
      }
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      if (dist(p.x, p.y, ERASER.x, ERASER.y) < 64) {
        eraseAll()
        fx.ring(ERASER.x, ERASER.y, '#ff9fc0', 70, 0.3)
        return
      }
      const color = nextColor++
      strokes.set(p.id, { pts: [{ x: p.x, y: p.y }], len: 0, color, done: false, scratch: 0 })
      const c = CRAYONS[color % CRAYONS.length]![0]
      fx.ring(p.x, p.y, c, 44, 0.28)
      fx.burst(p.x, p.y, { count: 5, color: [c, '#ffffff'], speed: 160, life: 0.35, size: 7 })
      sfx.tone({ freq: sfx.scale(color % 5), dur: 0.07, type: 'triangle', vol: 0.12 })
    },

    move(p: Pointer) {
      const s = strokes.get(p.id)
      if (!s || s.done) return
      lastTouchAt = stage.time
      const last = s.pts[s.pts.length - 1]!
      const d = dist(last.x, last.y, p.x, p.y)
      if (d < 5) return
      s.pts.push({ x: p.x, y: p.y })
      s.len += d
      s.scratch += d
      if (s.scratch > 42) {
        s.scratch = 0
        // Crayon scratch, pitched by height so a line sings a little.
        sfx.noise({ dur: 0.05, vol: 0.07, freq: lerp(3200, 1200, clamp(p.y / H, 0, 1)), filter: 'bandpass', q: 3 })
        fx.burst(p.x, p.y, { count: 1, color: CRAYONS[s.color % CRAYONS.length]![0], speed: 90, life: 0.4, size: 5, gravity: 500 })
      }
      if (s.len > MAX_INK) finishStroke(s)
    },

    up(p: Pointer) {
      const s = strokes.get(p.id)
      strokes.delete(p.id)
      if (!s || s.done) return
      if (s.len < 22) tap(s.pts[0]!.x, s.pts[0]!.y, s.color)
      else finishStroke(s)
    },

    dispose() {
      Events.off(engine, 'collisionStart', onCollide)
      Events.off(engine, 'collisionActive', onActive)
      Composite.clear(world, false)
      Engine.clear(engine)
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'draw-a-bridge',
    name: 'Draw a Bridge',
    emoji: '✏️',
    ages: [5, 10],
    pitch: 'Draw a line and it turns into a real, heavy crayon bridge the little car drives over to reach its friend.',
    howTo: 'Draw across the gap and let go: the car sets off by itself. Tap a drawing to rub it out, tap the eraser to clear, tap anywhere for pebbles. Three quick taps on the sun skip a level.',
    basedOn: 'Crayon Physics, Brain Dots, Draw Bridge games',
    whyFun: 'Your own scribble becomes a solid thing with weight: it thuds down, holds the car (or does not, with a wheee into the ball pit), and any silly solution counts.',
  },
  create,
}
