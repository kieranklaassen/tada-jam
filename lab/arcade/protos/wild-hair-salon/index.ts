// Wild Hair Salon: one big animal in the chair, hair made of springy strands,
// and a row of tools. Pick a tool, rub the hair. Nothing is a wrong haircut:
// the animal giggles, sneezes, stares at its bald head, and hair grows back.

import { blinkAt, circle, hint, rrect, shadow, sprite, star, volume } from '../../kit/draw.ts'
import { TAU, clamp, damp, dist, ease, lerp, pick, rnd, rndInt, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { INK, RX, RY, SPECS, buildStrands, drawHead } from './animals.ts'
import type { Expr, FaceState, Spec } from './animals.ts'
import { HAIR_STEP, cutStrand, drawClip, drawStrand, kickStrand, paintStrand, placeStrand, stepStrand, touchAt } from './hair.ts'
import type { Blower, HairStyle, HeadPose, Snip, Strand } from './hair.ts'

const CX = 590
const CY = 400
const FLOOR_Y = 640
const MX = 262
const MY = 40
const MW = 656
const MH = 584
const CAM_X = 1100
const CAM_Y = 692
const PLANT_X = 80
const PLANT_Y = 696

type ToolId = 'scissors' | 'shaver' | 'tonic' | 'dryer' | 'pink' | 'purple' | 'green' | 'rainbow'

const SPRAY: Record<string, string> = { pink: '#ff4fa3', purple: '#9b5cff', green: '#2fd47a' }
const RAINBOW = ['#ff4d4d', '#ff9f1c', '#ffe14d', '#5ed36a', '#2fb8ff', '#9b5cff', '#ff6ec7']
const WILD = ['#ff4fa3', '#2fd47a', '#9b5cff', '#2fb8ff']

interface ToolBtn {
  id: ToolId
  x: number
  y: number
  pop: Spring
  // 0 hidden, 1 shown (the rainbow can arrives later).
  show: number
}

interface Clip {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  len: number
  w: number
  color: string
  landY: number
  style: HairStyle
}

interface Find {
  ch: string
  lx: number
  ly: number
  front: boolean
  cover: { s: Strand; reach: number }[]
  out: boolean
  x: number
  y: number
  rot: number
  sq: Spring
  landed: boolean
}

interface Photo {
  img: HTMLCanvasElement
  x: number
  y: number
  scale: number
  rot: number
  wig: Spring
}

interface Work {
  x: number
  y: number
  tickle: number
}

function drawTool(g: CanvasRenderingContext2D, id: ToolId, x: number, y: number, scale: number, rot: number, time: number, active: boolean): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(scale, scale)
  g.lineJoin = 'round'
  if (id === 'scissors') {
    sprite(g, '✂️', 0, 0, 84, active ? Math.sin(time * 30) * 0.08 : 0)
  } else if (id === 'shaver') {
    const j = active ? Math.sin(time * 90) * 2 : 0
    rrect(g, -22 + j, -14, 44, 62, 16, '#2f8fb5', INK, 4)
    rrect(g, -28 + j, -46, 56, 36, 9, '#e3ebf0', INK, 4)
    g.strokeStyle = INK
    g.lineWidth = 3
    g.beginPath()
    for (let i = -2; i <= 2; i++) {
      g.moveTo(i * 10 + j, -46)
      g.lineTo(i * 10 + j, -32)
    }
    g.stroke()
    circle(g, j, 8, 7, active ? '#9dff8a' : '#ffe14d', INK, 3)
    rrect(g, -9 + j, 22, 18, 18, 5, 'rgba(255,255,255,0.35)')
  } else if (id === 'tonic') {
    rrect(g, -12, -36, 24, 26, 6, '#7be08a', INK, 4)
    rrect(g, -16, -48, 32, 16, 5, '#c98a4b', INK, 4)
    rrect(g, -30, -16, 60, 62, 18, '#4cc95e', INK, 4)
    rrect(g, -22, -8, 9, 40, 4, 'rgba(255,255,255,0.4)')
    circle(g, 4, 16, 19, '#ffffff', INK, 3)
    sprite(g, '🌱', 4, 15, 26)
  } else if (id === 'dryer') {
    rrect(g, -4, 6, 24, 46, 9, '#c651a0', INK, 4)
    rrect(g, -62, -32, 50, 40, 8, '#ff7ac8', INK, 4)
    rrect(g, -72, -37, 14, 50, 5, '#5a3a66', INK, 4)
    circle(g, 8, -12, 32, '#ff7ac8', INK, 4)
    circle(g, 12, -12, 15, '#ffd1ec', INK, 3)
    circle(g, 12, -12, 5, '#c651a0')
  } else {
    // A spray can.
    rrect(g, -9, -48, 18, 16, 5, '#ffffff', INK, 4)
    rrect(g, -19, -36, 38, 18, 7, '#e3ebf0', INK, 4)
    if (id === 'rainbow') {
      rrect(g, -24, -22, 48, 68, 11, '#ffffff', INK, 4)
      g.save()
      g.beginPath()
      g.roundRect(-22, -20, 44, 64, 9)
      g.clip()
      for (let i = 0; i < RAINBOW.length; i++) {
        g.fillStyle = RAINBOW[i]!
        g.fillRect(-24, -20 + i * 9.4, 48, 10)
      }
      g.restore()
    } else {
      rrect(g, -24, -22, 48, 68, 11, SPRAY[id] ?? '#ff4fa3', INK, 4)
    }
    rrect(g, -17, -12, 9, 46, 4, 'rgba(255,255,255,0.45)')
    circle(g, -13, -41, 3.5, INK)
  }
  g.restore()
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  // ---- Static layers -------------------------------------------------------
  const bulbs: [number, number][] = []
  for (let i = 0; i < 10; i++) bulbs.push([MX + 46 + (i * (MW - 92)) / 9, MY - 9])
  for (let i = 0; i < 8; i++) {
    bulbs.push([MX - 9, MY + 60 + i * 64])
    bulbs.push([MX + MW + 9, MY + 60 + i * 64])
  }

  const backdrop = document.createElement('canvas')
  backdrop.width = W * 2
  backdrop.height = H * 2
  {
    const b = backdrop.getContext('2d')!
    b.scale(2, 2)
    const wall = b.createLinearGradient(0, 0, 0, FLOOR_Y)
    wall.addColorStop(0, '#8265d9')
    wall.addColorStop(1, '#b08df2')
    b.fillStyle = wall
    b.fillRect(0, 0, W, FLOOR_Y)
    b.fillStyle = 'rgba(255,255,255,0.07)'
    for (let x = 10; x < W; x += 84) b.fillRect(x, 0, 42, FLOOR_Y)
    // Floor: a checkerboard pulled toward a vanishing point.
    const rows = [FLOOR_Y, 668, 704, 752, 830]
    const vx = CX
    const vy = 360
    for (let r = 0; r < rows.length - 1; r++) {
      const y0 = rows[r]!
      const y1 = rows[r + 1]!
      for (let c = -8; c < 9; c++) {
        const at = (col: number, y: number): number => vx + (col * 118 - 59) * ((y - vy) / (830 - vy))
        b.beginPath()
        b.moveTo(at(c, y0), y0)
        b.lineTo(at(c + 1, y0), y0)
        b.lineTo(at(c + 1, y1), y1)
        b.lineTo(at(c, y1), y1)
        b.closePath()
        b.fillStyle = (r + c) % 2 === 0 ? '#fff1e3' : '#ffb7cd'
        b.fill()
      }
    }
    b.fillStyle = '#6548b8'
    b.fillRect(0, FLOOR_Y - 12, W, 14)
    // The mirror.
    rrect(b, MX - 20, MY - 20, MW + 40, MH + 40, 70, '#ffc83d', '#b8791a', 6)
    const glass = b.createLinearGradient(0, MY, 0, MY + MH)
    glass.addColorStop(0, '#dff6fb')
    glass.addColorStop(1, '#a6dcee')
    rrect(b, MX, MY, MW, MH, 52, '#dff6fb', '#b8791a', 5)
    b.save()
    b.beginPath()
    b.roundRect(MX + 3, MY + 3, MW - 6, MH - 6, 50)
    b.clip()
    b.fillStyle = glass
    b.fillRect(MX, MY, MW, MH)
    b.fillStyle = 'rgba(255,255,255,0.32)'
    for (const [sx, sw] of [
      [MX + 60, 46],
      [MX + 130, 18],
      [MX + MW - 150, 30],
    ] as const) {
      b.beginPath()
      b.moveTo(sx + 170, MY)
      b.lineTo(sx + 170 + sw, MY)
      b.lineTo(sx + sw - 170, MY + MH)
      b.lineTo(sx - 170, MY + MH)
      b.closePath()
      b.fill()
    }
    b.restore()
    for (const [x, y] of bulbs) circle(b, x, y, 10, '#ffe9a6', '#b8791a', 3)
    // Tool shelves.
    for (const x of [14, W - 146]) {
      rrect(b, x + 4, 40, 132, 556, 36, 'rgba(60,30,110,0.25)')
      rrect(b, x, 32, 132, 556, 36, '#f6f0ff', '#6548b8', 5)
    }
    // Strings for the photo wall.
    b.strokeStyle = 'rgba(255,255,255,0.5)'
    b.lineWidth = 3
    for (const x of [203, 977]) {
      b.beginPath()
      b.moveTo(x, 40)
      b.lineTo(x, 600)
      b.stroke()
    }
  }

  const FLOOR_TOP = 600
  const floor = document.createElement('canvas')
  floor.width = W * 2
  floor.height = (H - FLOOR_TOP) * 2
  const fctx = floor.getContext('2d')!
  fctx.scale(2, 2)

  // ---- State ---------------------------------------------------------------
  const tools: ToolBtn[] = []
  const leftIds: ToolId[] = ['scissors', 'shaver', 'tonic', 'dryer']
  const rightIds: ToolId[] = ['pink', 'purple', 'green', 'rainbow']
  const slotY = [106, 242, 378, 514]
  leftIds.forEach((id, i) => tools.push({ id, x: 80, y: slotY[i]!, pop: spring(1, 260, 11), show: 1 }))
  rightIds.forEach((id, i) => tools.push({ id, x: W - 80, y: slotY[i]!, pop: spring(1, 260, 11), show: id === 'rainbow' ? 0 : 1 }))
  let tool: ToolId = 'scissors'

  let animalIndex = 0
  let spec: Spec = SPECS[0]!
  let strands: Strand[] = []
  let finds: Find[] = []
  const clips: Clip[] = []
  const photos: (Photo | undefined)[] = []
  let photoCount = 0
  let flying: Photo | null = null
  const working = new Map<number, Work>()
  const plucked = new Map<Strand, number>()

  const pose: HeadPose = { x: CX, y: CY, cos: 1, sin: 0, sx: 1, sy: 1 }
  let headRot = 0
  let slideX = 0
  const tilt = spring(0, 110, 8)
  const sq = spring(1, 210, 10)
  const nod = spring(0, 150, 10)
  const earL = spring(0, 200, 9)
  const earR = spring(0, 200, 9)
  const nose = spring(0, 300, 10)
  const camSq = spring(1, 220, 9)
  const plant = spring(0, 120, 6)
  const snipKick = spring(0, 300, 12)

  let expr: Expr = 'idle'
  let exprUntil = 0
  let lookX = 0
  let lookY = 0
  let blushAmt = 0
  let sneeze = 0
  let sneezeCool = 0
  let lastGiggle = -10
  let lastTouchAt = -2
  let lastWorkAt = -10
  let work = 0
  let workSinceAdmire = 0
  let busy = false
  let wasBald = false
  let wasLong = false
  let wasPainted = false
  let foundCount = 0
  let snipStep = 0
  let lastSnipAt = -10
  let nextFidget = 4
  let nextCheck = 0
  let bulbsUntil = 0
  let sweatUntil = 0
  let hairAcc = 0
  let rainbowIn = false
  const lastAt: Record<string, number> = {}
  const every = (key: string, seconds: number): boolean => {
    if (stage.time - (lastAt[key] ?? -10) < seconds) return false
    lastAt[key] = stage.time
    return true
  }

  const setExpr = (e: Expr, seconds: number): void => {
    expr = e
    exprUntil = stage.time + seconds
  }

  const toWorld = (lx: number, ly: number): [number, number] => [
    pose.x + lx * pose.sx * pose.cos - ly * pose.sy * pose.sin,
    pose.y + lx * pose.sx * pose.sin + ly * pose.sy * pose.cos,
  ]

  const updatePose = (): void => {
    const t = stage.time
    headRot = tilt.value + Math.sin(t * 0.8) * 0.025 + lookX * 0.035 - sneeze * 0.12
    pose.x = CX + slideX
    pose.y = CY + nod.value + Math.sin(t * 1.3) * 3 - sneeze * 12
    pose.cos = Math.cos(headRot)
    pose.sin = Math.sin(headRot)
    const [sx, sy] = volume(sq.value + Math.sin(t * 2.1) * 0.012)
    pose.sx = sx
    pose.sy = sy
  }

  const seatAnimal = (): void => {
    spec = SPECS[animalIndex % SPECS.length]!
    const lap = Math.floor(animalIndex / SPECS.length)
    const dye = lap > 0 ? WILD[(animalIndex + lap) % WILD.length]! : null
    strands = buildStrands(spec, stage.rand, dye)
    updatePose()
    for (const s of strands) placeStrand(s, pose)
    plucked.clear()
    finds = spec.stowaways.map((st) => {
      const cover: { s: Strand; reach: number }[] = []
      let best: Strand | null = null
      let bestD = 1e9
      for (const s of strands) {
        const u = clamp((st.lx - s.lx) * s.dx + (st.ly - s.ly) * s.dy, 0, s.base)
        const d = Math.hypot(st.lx - (s.lx + s.dx * u), st.ly - (s.ly + s.dy * u))
        if (d < bestD) {
          bestD = d
          best = s
        }
        if (d < s.width * 0.6 + 20 && u > 8) cover.push({ s, reach: u })
      }
      if (cover.length === 0 && best) cover.push({ s: best, reach: best.base * 0.5 })
      return { ch: st.ch, lx: st.lx, ly: st.ly, front: st.front, cover, out: false, x: 0, y: 0, rot: 0, sq: spring(1, 240, 9), landed: false }
    })
    wasBald = false
    wasLong = false
    wasPainted = false
    work = 0
    workSinceAdmire = 0
    sneeze = 0
  }
  seatAnimal()

  // ---- Sounds that are built here -----------------------------------------
  const snipSound = (): void => {
    sfx.noise({ dur: 0.04, freq: 6500, vol: 0.2, filter: 'highpass' })
    sfx.tone({ freq: rnd(2300, 2900), to: 1700, dur: 0.035, type: 'square', vol: 0.05 })
  }
  const voice = (mult: number, dur: number, delay: number, vol = 0.16): void => {
    const f = spec.voice * mult
    sfx.tone({ freq: f, to: f * 0.82, dur, type: 'triangle', vol, delay })
  }
  const airSound = (x: number, y: number): void => {
    if (tool === 'scissors') {
      snipSound()
      snipKick.kick(9)
      fx.burst(x, y, { count: 5, color: '#ffffff', speed: 180, life: 0.3, size: 6, shape: 'spark' })
    } else if (tool === 'shaver') {
      sfx.tone({ freq: 96, dur: 0.16, type: 'sawtooth', vol: 0.13 })
      fx.burst(x, y, { count: 4, color: '#dfe9ee', speed: 140, life: 0.3, size: 5 })
    } else if (tool === 'tonic') {
      sfx.tone({ freq: 380, to: 760, dur: 0.1, type: 'sine', vol: 0.2 })
      fx.burst(x, y, { count: 6, color: ['#8dff9a', '#d6ffd9'], speed: 160, life: 0.6, size: 11, gravity: -260, shape: 'ring' })
    } else if (tool === 'dryer') {
      sfx.whoosh()
    } else {
      sfx.noise({ dur: 0.14, freq: 4800, vol: 0.14, filter: 'highpass' })
      fx.burst(x, y, { count: 9, color: sprayColor(x, y), speed: 200, life: 0.45, size: 9, drag: 0.9 })
    }
  }

  const sprayColor = (x: number, y: number): string => {
    if (tool === 'rainbow') return RAINBOW[Math.abs(Math.floor((x * 0.6 + y) / 34)) % RAINBOW.length]!
    return SPRAY[tool] ?? '#ff4fa3'
  }

  // ---- Reactions -----------------------------------------------------------
  const giggle = (x: number, y: number): void => {
    if (stage.time - lastGiggle < 0.45 || expr === 'choo') return
    lastGiggle = stage.time
    setExpr('giggle', 0.7)
    tilt.kick((x < pose.x ? -1 : 1) * rnd(1.4, 2.4))
    sq.kick(rnd(1.5, 2.5))
    blushAmt = 1
    const up = rndInt(0, 2) * 0.12
    for (let i = 0; i < 4; i++) voice((i % 2 === 0 ? 1.5 : 1.85) + up, 0.09, i * 0.085)
    fx.burst(x, y, { count: 5, color: ['#ff7ac8', '#ffe14d'], speed: 220, life: 0.6, size: 12, shape: 'heart', gravity: -120 })
    if (Math.random() < 0.3) fx.text(pose.x + rnd(-80, 80), pose.y - RY - 40, pick(['hee hee!', 'ha ha!', 'tee hee!']), { color: '#fff3b0', size: 38 })
  }

  const boop = (): void => {
    nose.value = 1
    nod.kick(160)
    sq.kick(-2)
    setExpr('wow', 0.45)
    sfx.tone({ freq: 250, to: 190, dur: 0.16, type: 'square', vol: 0.13 })
    sfx.boing(2)
    const [nx, ny] = toWorld(0, 30)
    fx.ring(nx, ny, '#ffffff', 70, 0.3)
    fx.burst(nx, ny, { count: 8, color: '#ffe14d', speed: 260, life: 0.4, size: 10, shape: 'star' })
  }

  const releaseFind = (f: Find, quiet = false): void => {
    const [wx, wy] = toWorld(f.lx, f.ly)
    f.out = true
    f.x = wx
    f.y = wy
    // Each one gets its own spot on the floor, left or right of the cape.
    const left = wx < pose.x - 1
    const taken = finds.filter((o) => o !== f && o.out && o.x < CX === left).length
    const toX = left ? 232 + taken * 66 : 948 - taken * 66
    const toY = 716 + (taken % 2) * 30
    foundCount++
    sfx.pop(foundCount)
    sfx.coin(Math.min(foundCount, 8))
    fx.burst(wx, wy, { count: 14, color: ['#ffe14d', '#ffffff', '#ff7ac8'], speed: 360, life: 0.7, size: 12, shape: 'star' })
    if (!quiet) {
      fx.text(wx, wy - 60, pick(['PEEKABOO!', 'HELLO!', 'FOUND ME!']), { color: '#fff3b0', size: 42 })
      setExpr('wow', 0.8)
    }
    stage.tween(
      0.75,
      (t) => {
        f.x = lerp(wx, toX, t)
        f.y = lerp(wy, toY, t) - Math.sin(t * Math.PI) * 190
        f.rot = (toX < wx ? -1 : 1) * t * TAU
      },
      ease.inOutQuad,
      () => {
        f.rot = 0
        f.landed = true
        f.sq.value = 0.6
        sfx.thud(0.5)
        fx.burst(toX, toY + 22, { count: 8, color: '#ffffff', speed: 200, angle: -Math.PI / 2, spread: Math.PI, life: 0.35, size: 8 })
      },
    )
  }

  const achoo = (): void => {
    sneeze = 0
    sneezeCool = 2.4
    setExpr('choo', 0.55)
    nod.kick(520)
    sq.value = 0.72
    const [nx, ny] = toWorld(0, 40)
    for (const s of strands) kickStrand(s, nx, ny + 40, rnd(16, 30))
    fx.shake(16, 0.35)
    fx.hitstop(70)
    fx.text(pose.x, pose.y - RY - 90, 'ACHOO!', { color: '#ffffff', size: 84, life: 1.1 })
    fx.burst(nx, ny + 30, { count: 26, color: ['#ffffff', '#cdf3ff'], speed: 760, angle: Math.PI / 2, spread: 1.7, life: 0.6, size: 11, gravity: 700 })
    sfx.noise({ dur: 0.4, freq: 2600, to: 300, vol: 0.45, filter: 'lowpass' })
    sfx.tone({ freq: spec.voice * 2.4, to: spec.voice * 0.6, dur: 0.32, type: 'sawtooth', vol: 0.16 })
    sfx.thud(1.2)
    const hidden = finds.filter((f) => !f.out)
    if (hidden.length > 0) releaseFind(pick(hidden), true)
    work += 4
    stage.after(0.6, () => setExpr('giggle', 0.6))
  }

  const admire = (): void => {
    workSinceAdmire = 0
    setExpr('proud', 1.3)
    tilt.kick(2.2)
    stage.after(0.45, () => tilt.kick(-3.4))
    voice(1.2, 0.16, 0, 0.13)
    voice(1.6, 0.26, 0.15, 0.13)
    for (let i = 0; i < 5; i++) {
      stage.after(i * 0.12, () => {
        const a = rnd(-Math.PI, 0)
        fx.burst(pose.x + Math.cos(a) * 250, pose.y + Math.sin(a) * 240, { count: 3, color: ['#ffffff', '#ffe14d'], speed: 60, life: 0.7, size: 16, shape: 'star', gravity: 0 })
      })
    }
  }

  const checkLook = (): void => {
    let short = 0
    let ratio = 0
    let painted = 0
    for (const s of strands) {
      if (s.len < s.base * 0.3) short++
      ratio += s.len / s.base
      for (let i = 0; i < s.col.length; i++) if (s.col[i] !== s.nat[i]) painted++
    }
    const n = strands.length
    const bald = short / n
    if (!wasBald && bald > 0.85) {
      wasBald = true
      setExpr('wow', 1.8)
      sweatUntil = stage.time + 2.6
      blushAmt = 1
      sq.kick(3)
      sfx.slideDown()
      stage.after(0.3, () => sfx.boing(-2))
      fx.text(pose.x, pose.y - RY - 60, 'BALD!', { color: '#9fe3ff', size: 70, life: 1.2 })
      fx.shake(6)
    } else if (wasBald && bald < 0.5) wasBald = false
    const mean = ratio / n
    if (!wasLong && mean > 1.85) {
      wasLong = true
      setExpr('love', 1.8)
      sfx.win()
      fx.text(pose.x, pose.y - RY - 120, 'SO LONG!', { color: '#d6ffd9', size: 66, life: 1.2 })
      fx.confetti(pose.x, pose.y - 220, 30)
    } else if (wasLong && mean < 1.4) wasLong = false
    const frac = painted / (n * 4)
    if (!wasPainted && frac > 0.7) {
      wasPainted = true
      setExpr('love', 1.6)
      sfx.win()
      fx.text(pose.x, pose.y - RY - 120, 'FABULOUS!', { color: '#ffd1ec', size: 66, life: 1.2 })
      fx.confetti(pose.x, pose.y - 220, 30)
    } else if (wasPainted && frac < 0.4) wasPainted = false
    for (const f of finds) {
      if (f.out) continue
      let covered = false
      for (const c of f.cover) if (c.s.len > c.reach - 4) covered = true
      if (!covered) releaseFind(f)
    }
  }

  // ---- Clippings -----------------------------------------------------------
  const bake = (c: Clip): void => {
    fctx.save()
    fctx.translate(c.x, c.y - FLOOR_TOP)
    fctx.rotate(c.rot)
    drawClip(fctx, c.style, c.len, c.w, c.color)
    fctx.restore()
  }
  const spawnClip = (snip: Snip, width: number, pvx: number, pvy: number, small: boolean): void => {
    const n = spec.style === 'curl' ? clamp(Math.round(snip.len / 40), 1, 3) : 1
    for (let i = 0; i < n; i++) {
      const c: Clip = {
        x: snip.x + rnd(-6, 6) * i,
        y: snip.y + rnd(-6, 6) * i,
        vx: rnd(-110, 110) + clamp(pvx, -900, 900) * 0.18,
        vy: rnd(-260, -60) + clamp(pvy, -900, 900) * 0.1,
        rot: snip.angle,
        spin: rnd(-7, 7),
        len: small ? rnd(12, 20) : Math.min(snip.len, 150),
        w: small ? width * 0.6 : width,
        color: snip.color,
        landY: rnd(672, 802),
        style: spec.style,
      }
      c.landY = Math.min(806, Math.max(c.landY, c.y + 30))
      clips.push(c)
    }
    while (clips.length > 150) bake(clips.shift()!)
  }

  // ---- The tools -----------------------------------------------------------
  const applyPoint = (x: number, y: number, pvx: number, pvy: number): number => {
    let n = 0
    const t = stage.time
    if (tool === 'scissors' || tool === 'shaver') {
      const shave = tool === 'shaver'
      let color = '#ffffff'
      for (const s of strands) {
        const snip = cutStrand(s, x, y, shave ? 44 : 30, shave ? 5 : 12, shave)
        if (!snip) continue
        n++
        s.cutAt = t
        color = snip.color
        spawnClip(snip, s.width, pvx, pvy, shave)
      }
      if (n > 0) {
        if (shave) {
          fx.burst(x, y, { count: 4 + n * 2, color, speed: 300, life: 0.5, size: 7, gravity: 1100, shape: 'square' })
          if (every('crunch', 0.07)) sfx.noise({ dur: 0.06, freq: rnd(1400, 2600), vol: 0.2, q: 2 })
        } else {
          snipKick.kick(10)
          if (every('snip', 0.045)) {
            snipStep = t - lastSnipAt < 0.5 ? snipStep + 1 : 0
            lastSnipAt = t
            snipSound()
            sfx.note(snipStep % 10, 0.09, 'sine', 0.09)
            sq.kick(0.5)
          }
          fx.burst(x, y, { count: 3, color: ['#ffffff', color], speed: 200, life: 0.35, size: 7, shape: 'spark' })
        }
      }
    } else if (tool !== 'tonic' && tool !== 'dryer') {
      const color = sprayColor(x, y)
      for (const s of strands) n += paintStrand(s, x, y, 50, color)
      if (every('mist', 0.04)) fx.burst(x, y, { count: 3, color, speed: 170, life: 0.4, size: 9, drag: 0.9 })
      if (every('hiss', 0.1)) sfx.noise({ dur: 0.13, freq: rnd(4200, 5400), vol: n > 0 ? 0.15 : 0.08, filter: 'highpass' })
      if (n > 0 && every('paintnote', 0.16)) sfx.note(rndInt(0, 7), 0.12, 'sine', 0.07)
    }
    // Quills ring like a comb when anything runs across them.
    if (spec.style === 'spike' && n === 0) {
      for (const s of strands) {
        if (s.len < 30 || t - (plucked.get(s) ?? -1) < 0.3) continue
        if (touchAt(s, x, y, 12) < 0) continue
        plucked.set(s, t)
        kickStrand(s, x - pvx * 0.01, y - pvy * 0.01, 7)
        if (every('pluck', 0.05)) sfx.note(s.note, 0.25, 'triangle', 0.13)
      }
    }
    if (n > 0) {
      work += n
      workSinceAdmire += n
      lastWorkAt = t
    }
    return n
  }

  const touchFace = (w: Work, x: number, y: number, moved: number, first: boolean): void => {
    const lx = (x - pose.x) / (RX * 0.88)
    const ly = (y - pose.y) / (RY * 0.88)
    if (lx * lx + ly * ly > 1) return
    if (first) {
      const [nx, ny] = toWorld(0, 32)
      if (dist(x, y, nx, ny) < 46) boop()
      else giggle(x, y)
      return
    }
    w.tickle += moved
    if (w.tickle > 150) {
      w.tickle = 0
      giggle(x, y)
    }
  }

  const selectTool = (b: ToolBtn): void => {
    tool = b.id
    b.pop.value = 0.75
    b.pop.kick(7)
    sfx.pop(tools.indexOf(b))
    fx.ring(b.x, b.y, '#ffe14d', 80, 0.3)
    fx.burst(b.x, b.y, { count: 8, color: ['#ffe14d', '#ffffff'], speed: 240, life: 0.4, size: 10, shape: 'star' })
    if (b.id === 'shaver') sfx.tone({ freq: 96, dur: 0.2, type: 'sawtooth', vol: 0.1, delay: 0.05 })
    else if (b.id === 'dryer') sfx.whoosh()
    else if (b.id === 'tonic') sfx.tone({ freq: 380, to: 760, dur: 0.1, type: 'sine', vol: 0.16, delay: 0.05 })
    else if (b.id === 'scissors') stage.after(0.06, snipSound)
    else sfx.noise({ dur: 0.12, freq: 4800, vol: 0.12, filter: 'highpass', delay: 0.05 })
  }

  const bringRainbow = (): void => {
    if (rainbowIn) return
    rainbowIn = true
    const b = tools.find((t) => t.id === 'rainbow')!
    stage.tween(0.5, (t) => (b.show = t), ease.outBack)
    b.pop.kick(6)
    sfx.pop(4)
    sfx.win()
    fx.burst(b.x, b.y, { count: 16, color: RAINBOW, speed: 380, life: 0.7, size: 12, shape: 'star' })
    fx.confetti(b.x, b.y, 24)
    fx.ring(b.x, b.y, '#ffffff', 110, 0.5)
  }

  // ---- The photo -----------------------------------------------------------
  const slotPos = (slot: number): [number, number] => [slot < 5 ? 203 : 977, 96 + (slot % 5) * 112]

  const takePhoto = (): HTMLCanvasElement => {
    const c = document.createElement('canvas')
    c.width = 400
    c.height = 440
    const p = c.getContext('2d')!
    rrect(p, 3, 3, 394, 434, 16, '#ffffff', INK, 6)
    p.save()
    p.beginPath()
    p.rect(26, 26, 348, 330)
    p.clip()
    p.fillStyle = '#bfe8f4'
    p.fillRect(0, 0, 400, 440)
    p.translate(200, 196)
    p.scale(0.6, 0.6)
    p.translate(-CX, -(CY - 30))
    drawBody(p)
    drawHair(p, false)
    drawHeadAt(p)
    drawHair(p, true)
    p.restore()
    p.lineWidth = 5
    p.strokeStyle = INK
    p.strokeRect(26, 26, 348, 330)
    return c
  }

  const leave = (): void => {
    sfx.whoosh()
    voice(1.4, 0.12, 0, 0.12)
    stage.tween(
      0.45,
      (t) => (slideX = t * 980),
      ease.inBack,
      () => {
        for (const f of finds) f.out = true
        finds = []
        // Sweep: older clippings fade so the floor never turns to mud.
        fctx.save()
        fctx.globalCompositeOperation = 'destination-out'
        fctx.fillStyle = 'rgba(0,0,0,0.78)'
        fctx.fillRect(0, 0, W, H - FLOOR_TOP)
        fctx.restore()
        animalIndex++
        slideX = -980
        seatAnimal()
        sfx.boing(animalIndex % 4)
        stage.tween(
          0.7,
          (t) => (slideX = -980 * (1 - t)),
          ease.outBack,
          () => {
            slideX = 0
            busy = false
            sq.kick(3)
            voice(1.3, 0.12, 0)
            voice(1.75, 0.2, 0.12)
            setExpr('proud', 0.6)
          },
        )
      },
    )
  }

  const snap = (): void => {
    busy = true
    working.clear()
    camSq.value = 0.7
    camSq.kick(5)
    setExpr('proud', 1.7)
    tilt.kick(1.6)
    sfx.tick()
    sfx.note(4, 0.12)
    stage.after(0.35, () => {
      const img = takePhoto()
      fx.flash('#ffffff', 0.95, 0.45)
      sfx.noise({ dur: 0.08, freq: 5200, vol: 0.3, filter: 'highpass' })
      sfx.fanfare()
      fx.confetti(CX, 170, 70)
      fx.shake(7)
      bulbsUntil = stage.time + 1.4
      const slot = photoCount % 10
      photoCount++
      const shot: Photo = { img, x: CX, y: 380, scale: 0, rot: rnd(-0.12, 0.12), wig: spring(0, 160, 7) }
      flying = shot
      stage.tween(0.35, (t) => (shot.scale = 1.7 * t), ease.outBack)
      stage.after(0.95, () => {
        const [tx, ty] = slotPos(slot)
        sfx.whoosh()
        stage.tween(
          0.5,
          (t) => {
            shot.x = lerp(CX, tx, t)
            shot.y = lerp(380, ty, t)
            shot.scale = lerp(1.7, 0.46, t)
          },
          ease.inOutCubic,
          () => {
            flying = null
            photos[slot] = shot
            shot.wig.kick(7)
            sfx.pop(3)
            fx.burst(tx, ty, { count: 8, color: '#ffffff', speed: 200, life: 0.4, size: 9, shape: 'star' })
          },
        )
      })
      stage.after(1.15, leave)
      stage.after(2.6, bringRainbow)
    })
  }

  // ---- Drawing -------------------------------------------------------------
  const face: FaceState = { expr: 'idle', lookX: 0, lookY: 0, blink: 0, sneeze: 0, earL: 0, earR: 0, nose: 0, time: 0, blush: 0, sweat: false }

  function drawBody(g: CanvasRenderingContext2D): void {
    const x = CX + slideX
    const br = Math.sin(stage.time * 2.1) * 3
    rrect(g, x - 205, CY + 30, 410, 520, 60, '#d9476b', INK, 5)
    rrect(g, x - 180, CY + 52, 360, 480, 46, '#f0668a')
    g.beginPath()
    g.moveTo(x - 92, CY + 118)
    g.quadraticCurveTo(x - 250 - br, CY + 190, x - 318, H + 30)
    g.lineTo(x + 318, H + 30)
    g.quadraticCurveTo(x + 250 + br, CY + 190, x + 92, CY + 118)
    g.closePath()
    g.fillStyle = spec.cape
    g.fill()
    g.lineWidth = 5
    g.strokeStyle = INK
    g.stroke()
    g.fillStyle = spec.capeDot
    for (let i = 0; i < 9; i++) {
      const dx = ((i * 97) % 380) - 190
      const dy = 250 + ((i * 61) % 150)
      g.beginPath()
      g.arc(x + dx * (0.6 + (dy - 200) / 500), CY + dy, 13, 0, TAU)
      g.fill()
    }
    g.beginPath()
    g.ellipse(x, CY + 146, 104, 26, 0, 0, TAU)
    g.fillStyle = '#ffffff'
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = INK
    g.stroke()
  }

  function drawHair(g: CanvasRenderingContext2D, front: boolean): void {
    for (const f of finds) {
      if (f.out || f.front !== front) continue
      const [x, y] = toWorld(f.lx, f.ly)
      sprite(g, f.ch, x, y, 50, Math.sin(stage.time * 3 + f.lx) * 0.15)
    }
    for (const s of strands) if (s.front === front) drawStrand(g, s, spec.style)
  }

  function drawHeadAt(g: CanvasRenderingContext2D): void {
    face.expr = expr
    face.lookX = lookX
    face.lookY = lookY
    face.blink = blinkAt(stage.time, animalIndex)
    face.sneeze = sneeze
    face.earL = earL.value
    face.earR = earR.value
    face.nose = nose.value
    face.time = stage.time
    face.blush = blushAmt
    face.sweat = stage.time < sweatUntil
    g.save()
    g.translate(pose.x, pose.y)
    g.rotate(headRot)
    g.scale(pose.sx, pose.sy)
    drawHead(g, spec, face)
    g.restore()
  }

  const drawPhoto = (g: CanvasRenderingContext2D, p: Photo): void => {
    g.save()
    g.translate(p.x, p.y)
    g.rotate(p.rot + p.wig.value * 0.1)
    g.scale(p.scale, p.scale)
    g.drawImage(p.img, -100, -110, 200, 220)
    g.restore()
  }

  const hintSpot = (): [number, number] => {
    const t = stage.time
    return [pose.x + Math.sin(t * 1.6) * 150, pose.y + spec.hintY + Math.cos(t * 1.6) * 14]
  }

  return {
    update(dt) {
      const t = stage.time
      if (expr !== 'idle' && t > exprUntil) expr = 'idle'
      tilt.update(dt)
      sq.update(dt)
      nod.update(dt)
      earL.update(dt)
      earR.update(dt)
      nose.update(dt)
      camSq.update(dt)
      plant.update(dt)
      snipKick.update(dt)
      for (const b of tools) b.pop.update(dt)
      for (const p of photos) p?.wig.update(dt)
      blushAmt = damp(blushAmt, 0, 1.2, dt)
      sneezeCool = Math.max(0, sneezeCool - dt)

      // Where the animal looks: the nearest finger, the camera during a photo,
      // or around the room.
      let tx = CX + Math.sin(t * 0.6) * 260
      let ty = CY + Math.cos(t * 0.43) * 120
      if (busy) {
        tx = CAM_X
        ty = CAM_Y
      }
      for (const p of stage.pointers.values()) {
        tx = p.x
        ty = p.y
        lastTouchAt = t
      }
      lookX = damp(lookX, clamp((tx - pose.x) / 240, -1, 1), 9, dt)
      lookY = damp(lookY, clamp((ty - pose.y + 30) / 220, -1, 1), 9, dt)
      updatePose()

      // The tools, along the path each finger took since last frame.
      const blowers: Blower[] = []
      let drying = false
      for (const [id, w] of working) {
        const p = stage.pointers.get(id)
        if (!p || busy) {
          working.delete(id)
          continue
        }
        const moved = dist(w.x, w.y, p.x, p.y)
        if (moved > 0.5) {
          const steps = Math.min(24, Math.ceil(moved / 14))
          for (let i = 1; i <= steps; i++) applyPoint(lerp(w.x, p.x, i / steps), lerp(w.y, p.y, i / steps), p.vx, p.vy)
          touchFace(w, p.x, p.y, moved, false)
        }
        w.x = p.x
        w.y = p.y
        if (tool === 'shaver') {
          if (every('buzz', 0.09)) sfx.tone({ freq: rnd(92, 100), dur: 0.12, type: 'sawtooth', vol: 0.1 })
        } else if (tool === 'tonic') {
          let grew = 0
          let longest = 0
          for (const s of strands) {
            if (s.len >= s.max) continue
            if (dist(s.px[0]!, s.py[0]!, p.x, p.y) > 92 && touchAt(s, p.x, p.y, 70) < 0) continue
            s.len = Math.min(s.max, s.len + 330 * dt)
            s.cutAt = t
            grew++
            longest = Math.max(longest, s.len)
            if (s.len >= s.max && !s.maxed) {
              s.maxed = true
              fx.burst(s.px[4]!, s.py[4]!, { count: 5, color: '#ffffff', speed: 160, life: 0.5, size: 12, shape: 'star' })
              if (every('maxding', 0.12)) sfx.ding(rndInt(0, 4))
            }
          }
          if (every('bubbles', 0.06)) fx.burst(p.x + rnd(-40, 40), p.y + rnd(-30, 30), { count: 2, color: ['#8dff9a', '#d6ffd9', '#ffffff'], speed: 110, life: 0.7, size: 12, gravity: -320, shape: 'ring' })
          if (grew > 0) {
            work += grew * dt * 6
            workSinceAdmire += grew * dt * 6
            lastWorkAt = t
            if (every('bloop', 0.09)) {
              const f = 260 + longest * 2.2
              sfx.tone({ freq: f, to: f * 1.5, dur: 0.09, type: 'sine', vol: 0.17 })
            }
          } else if (every('bloop', 0.22)) sfx.tone({ freq: 300, to: 380, dur: 0.08, type: 'sine', vol: 0.08 })
        } else if (tool === 'dryer') {
          drying = true
          blowers.push({ x: p.x, y: p.y, r: 320, power: 95000 })
          if (every('wind', 0.14)) {
            sfx.noise({ dur: 0.26, freq: rnd(600, 900), vol: 0.17, q: 0.7 })
            sfx.tone({ freq: 138, dur: 0.22, type: 'sawtooth', vol: 0.035 })
          }
          if (every('gust', 0.035)) fx.burst(p.x, p.y, { count: 2, color: '#ffffff', speed: 620, life: 0.32, size: 8, shape: 'spark', drag: 0.93 })
          if (dist(p.x, p.y, pose.x, pose.y) < 330 && sneezeCool <= 0) {
            sneeze += dt / 2.6
            work += dt * 3
            lastWorkAt = t
            if (sneeze > 0.35 && expr !== 'ah') {
              setExpr('ah', 3)
              voice(1.2, 0.3, 0, 0.14)
            }
            if (sneeze > 0.7 && every('ahh', 0.5)) voice(1.5 + sneeze, 0.3, 0, 0.16)
            if (sneeze >= 1) achoo()
          }
        } else if (moved <= 0.5 && tool !== 'scissors') {
          applyPoint(p.x, p.y, 0, 0)
        }
      }
      if (!drying && sneeze > 0) {
        sneeze = Math.max(0, sneeze - dt * 0.6)
        if (expr === 'ah') expr = 'idle'
      }

      // Hair.
      hairAcc = Math.min(hairAcc + dt, HAIR_STEP * 5)
      while (hairAcc >= HAIR_STEP) {
        hairAcc -= HAIR_STEP
        for (const s of strands) stepStrand(s, pose, spec.feel, t, blowers)
      }
      for (const s of strands) {
        if (s.len < s.base && t - s.cutAt > 6) s.len = Math.min(s.base, s.len + 4 * dt)
      }

      // Clippings fall and stay.
      for (let i = clips.length - 1; i >= 0; i--) {
        const c = clips[i]!
        c.vy += 1700 * dt
        c.vx *= 0.985
        c.x += c.vx * dt
        c.y += c.vy * dt
        c.rot += c.spin * dt
        if (c.y >= c.landY) {
          c.y = c.landY
          bake(c)
          clips.splice(i, 1)
        }
      }
      for (const f of finds) {
        f.sq.update(dt)
      }

      if (t >= nextCheck && !busy) {
        nextCheck = t + 0.25
        checkLook()
      }
      if (!busy && working.size === 0 && workSinceAdmire >= 10 && t - lastWorkAt > 1.5 && expr === 'idle') admire()
      if (!rainbowIn && t > 45 && !busy) bringRainbow()

      // Fidgets while nobody is touching.
      if (t > nextFidget) {
        nextFidget = t + rnd(3.5, 6.5)
        if (!busy && t - lastTouchAt > 2 && expr === 'idle') {
          const kind = rndInt(0, 2)
          if (kind === 0) (Math.random() < 0.5 ? earL : earR).kick(9)
          else if (kind === 1) tilt.kick(rnd(-1.6, 1.6))
          else {
            // Puff the fringe up with a breath.
            const [mx, my] = toWorld(0, 90)
            for (const s of strands) if (s.front) kickStrand(s, mx, my, rnd(5, 11))
            setExpr('wow', 0.3)
            sfx.noise({ dur: 0.16, freq: 900, to: 2000, vol: 0.06, q: 0.8 })
          }
        }
      }
    },

    draw(g) {
      const t = stage.time
      g.drawImage(backdrop, 0, 0, W, H)
      // Bulbs chase around the mirror; all of them light for a photo.
      for (let i = 0; i < bulbs.length; i++) {
        const lit = t < bulbsUntil || Math.sin(t * 2.6 - i * 0.9) > 0.55
        if (!lit) continue
        const [x, y] = bulbs[i]!
        circle(g, x, y, 17, 'rgba(255,244,170,0.35)')
        circle(g, x, y, 9, '#fffbe0')
      }
      for (const p of photos) if (p) drawPhoto(g, p)

      drawBody(g)
      g.drawImage(floor, 0, FLOOR_TOP, W, H - FLOOR_TOP)
      drawHair(g, false)
      drawHeadAt(g)
      drawHair(g, true)

      for (const f of finds) {
        if (!f.out) continue
        const [sx, sy] = volume(f.sq.value)
        if (f.landed) shadow(g, f.x, f.y + 26, 24)
        sprite(g, f.ch, f.x, f.y + (f.landed ? Math.abs(Math.sin(t * 3 + f.lx)) * -6 : 0), 58, f.rot, sx, sy)
      }
      for (const c of clips) {
        g.save()
        g.translate(c.x, c.y)
        g.rotate(c.rot)
        drawClip(g, c.style, c.len, c.w, c.color)
        g.restore()
      }

      // Tools.
      for (const b of tools) {
        if (!rainbowIn && b.id === 'rainbow') {
          // A wrapped surprise sits in the last slot until it is opened.
          rrect(g, b.x - 54, b.y - 54, 108, 108, 28, 'rgba(255,255,255,0.55)', '#cdbdf2', 4)
          sprite(g, '🎁', b.x, b.y + Math.abs(Math.sin(t * 2.2)) * -8, 74, Math.sin(t * 4.4) * 0.08)
          continue
        }
        if (b.show <= 0.01) continue
        const sel = b.id === tool
        const s = b.pop.value * b.show * (sel ? 1.1 : 1)
        g.save()
        g.translate(b.x, b.y)
        g.scale(s, s)
        if (sel) rrect(g, -62, -62, 124, 124, 34, 'rgba(255,225,77,0.45)')
        rrect(g, -54, -54, 108, 108, 28, sel ? '#ffe14d' : '#ffffff', sel ? '#ff9f1c' : '#cdbdf2', sel ? 7 : 4)
        drawTool(g, b.id, b.id === 'dryer' ? 14 : 0, sel ? Math.sin(t * 5) * 4 : 0, b.id === 'scissors' ? 0.95 : 0.82, sel ? Math.sin(t * 5) * 0.1 : 0, t, false)
        g.restore()
      }

      // Plant and camera.
      sprite(g, '🪴', PLANT_X, PLANT_Y, 128, plant.value * 0.25)
      const ready = work >= 10 && !busy
      if (ready) {
        const pulse = (t % 1) / 1
        g.globalAlpha = 1 - pulse
        circle(g, CAM_X, CAM_Y, 62 + pulse * 30, 'rgba(255,255,255,0)', '#ffffff', 6)
        g.globalAlpha = 1
        for (let i = 0; i < 3; i++) {
          const a = t * 1.8 + (i * TAU) / 3
          star(g, CAM_X + Math.cos(a) * 80, CAM_Y + Math.sin(a) * 72, 11, '#fff7b0', a)
        }
      }
      const [cx, cy] = volume(camSq.value * (ready ? 1 + Math.sin(t * 6) * 0.04 : 1))
      g.save()
      g.translate(CAM_X, CAM_Y)
      g.scale(cx, cy)
      circle(g, 0, 0, 62, ready ? '#ffe14d' : '#fff3c4', '#ff9f1c', 6)
      sprite(g, '📸', 0, -2, 84)
      g.restore()

      if (flying) drawPhoto(g, flying)

      // The tool rides just above each working finger.
      for (const [id] of working) {
        const p = stage.pointers.get(id)
        if (!p) continue
        if (tool === 'dryer') drawTool(g, tool, p.x + 96, p.y - 72, 1.3, -0.55, t, true)
        else if (tool === 'scissors') drawTool(g, tool, p.x + 34, p.y - 58, 1.25, -0.3 + snipKick.value * 0.05, t, true)
        else if (tool === 'shaver' || tool === 'tonic') drawTool(g, tool, p.x + 12, p.y - 72, 1.25, tool === 'tonic' ? 2.4 + Math.sin(t * 14) * 0.12 : 3.0, t, true)
        else drawTool(g, tool, p.x + 42, p.y - 76, 1.25, -2.2 + Math.sin(t * 20) * 0.05, t, true)
      }

      if (t - lastTouchAt > 5 && !busy) {
        if (work >= 10) hint(g, CAM_X - 10, CAM_Y - 10, t, 66)
        else {
          const [hx, hy] = hintSpot()
          hint(g, hx, hy, t, 56)
        }
      }
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      for (const b of tools) {
        if (Math.abs(p.x - b.x) > 68 || Math.abs(p.y - b.y) > 68) continue
        if (b.show > 0.5) selectTool(b)
        else if (!rainbowIn) {
          bringRainbow()
          tool = 'rainbow'
        }
        return
      }
      if (dist(p.x, p.y, CAM_X, CAM_Y) < 82) {
        if (busy) sfx.tick()
        else snap()
        return
      }
      if (dist(p.x, p.y, PLANT_X, PLANT_Y) < 76) {
        plant.kick(Math.random() < 0.5 ? 7 : -7)
        sfx.boing(rndInt(1, 4))
        fx.burst(p.x, p.y - 20, { count: 7, color: ['#5ed36a', '#9be8a3'], speed: 260, life: 0.6, size: 11, gravity: 500 })
        return
      }
      for (const ph of photos) {
        if (ph && dist(p.x, p.y, ph.x, ph.y) < 56) {
          ph.wig.kick(Math.random() < 0.5 ? 9 : -9)
          sfx.pop(rndInt(2, 6))
          fx.burst(ph.x, ph.y, { count: 6, color: '#ffffff', speed: 200, life: 0.4, size: 9, shape: 'star' })
          return
        }
      }
      for (const f of finds) {
        if (f.out && f.landed && dist(p.x, p.y, f.x, f.y) < 56) {
          f.sq.value = 0.6
          f.sq.kick(8)
          sfx.boing(rndInt(3, 7))
          fx.burst(f.x, f.y, { count: 6, color: '#ffe14d', speed: 220, life: 0.4, size: 9, shape: 'star' })
          return
        }
      }
      fx.ring(p.x, p.y, '#ffffff', 46, 0.3)
      if (busy) {
        sfx.pop(rndInt(0, 4))
        return
      }
      const w: Work = { x: p.x, y: p.y, tickle: 0 }
      working.set(p.id, w)
      const hit = applyPoint(p.x, p.y, 0, 0)
      // A stowaway that is poked directly hops out, whatever the tool.
      for (const f of finds) {
        if (f.out) continue
        const [fx0, fy0] = toWorld(f.lx, f.ly)
        if (dist(p.x, p.y, fx0, fy0) < 40) {
          releaseFind(f)
          return
        }
      }
      touchFace(w, p.x, p.y, 0, true)
      if (hit === 0) airSound(p.x, p.y)
      // Ears perk toward a touch that lands away from the head.
      if (dist(p.x, p.y, pose.x, pose.y) > 300) (p.x < pose.x ? earL : earR).kick(8)
    },

    up(p: Pointer) {
      working.delete(p.id)
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'wild-hair-salon',
    name: 'Wild Hair Salon',
    emoji: '💇',
    ages: [3, 7],
    pitch: 'Snip, shave, grow, spray and blow-dry a big animal’s springy hair, then snap a photo for the wall.',
    howTo: 'Tap a tool, then rub the hair. Tap the camera when the look is done.',
    basedOn: 'Toca Hair Salon',
    whyFun: 'Hair is the toy: every rub cuts, grows or colours with a sound, the animal giggles and sneezes, and nothing is a wrong haircut.',
  },
  create,
}
