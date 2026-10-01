// Wet Paint: Waldorf wet-on-wet watercolour. A damp sheet on a board, a wide
// brush, three jars of colour and a jar of water. The paint keeps moving
// after the hand lifts (see pigment.ts), and where two colours meet they make
// a third by themselves. A finished sheet is lifted by its curled corner and
// pegged on the line; a fresh one comes out of the tray when the child wants.

import { clamp, damp, dist, ease, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { createSheet, pigmentRgb } from './pigment.ts'
import { BRUSH_HOME, CELL, DISH, JARS, LINE_Y, PAPER, SLOTS, TABLE_Y, THUMB_H, THUMB_W, TRAY, makeCanvas, paintLeafShadow, paintPaperGrain, paintRoom, paintWindowLight } from './room.ts'
import { LIQUID_DROP, clipLiquid, drawBrush, drawJarBack, drawJarFront, drawPeg, drawSponge } from './things.ts'
import type { JarLook } from './things.ts'

type G = CanvasRenderingContext2D
const TAU = Math.PI * 2
const STEP = 1 / 60
const SHEETS = 4

const HOME = { x: PAPER.x + PAPER.w / 2, y: PAPER.y + PAPER.h / 2 }
const TRAY_MID = { x: TRAY.x + TRAY.w / 2, y: TRAY.y + TRAY.h / 2 }
const TRAY_SCALE = 172 / PAPER.w
const THUMB_SCALE = THUMB_W / PAPER.w
const SPONGE_HOME = { x: DISH.x, y: DISH.y - 6 }
// The jar colours as the eye sees them through glass.
const JAR_LIQUID: readonly (readonly number[])[] = [
  [204, 52, 58],
  [240, 190, 48],
  [48, 96, 186],
]
const WATER = [205, 226, 230] as const
const HAIR = [218, 196, 156] as const
// Blue is the deep voice, red the middle, yellow the bright one: A, D, G.
const JAR_NOTE = [-4, -2, -6] as const
const TRAY_LAY: readonly (readonly [number, number, number])[] = [
  [-3, 2, -0.02],
  [3, -2, 0.018],
  [-1, -4, 0.03],
  [2, 1, -0.012],
]

type SheetState = 'board' | 'lifting' | 'laying' | 'flying' | 'arriving' | 'none'
type Mode = 'paint' | 'sponge' | 'sheet' | 'idle'

interface Touch {
  mode: Mode
  lx: number
  ly: number
  ux: number
  uy: number
  inJar: number
}

interface Painting {
  canvas: HTMLCanvasElement
  ctx: G
  swing: Spring
  grip: number
}

interface Falling {
  canvas: HTMLCanvasElement
  x: number
  y: number
  vy: number
  rot: number
  spin: number
}

interface Puff {
  x: number
  y: number
  r: number
  vx: number
  age: number
  color: [number, number, number]
}

interface Blot {
  x: number
  y: number
  r: number
  squash: number
  color: [number, number, number]
  alpha: number
  // Plain water dries off wood by itself; paint waits for the sponge.
  dries: boolean
}

function lineY(x: number, bob: number): number {
  const t = clamp(x / W, 0, 1)
  return LINE_Y - 10 + 4 * t * (1 - t) * (26 + bob)
}

function create(stage: Stage): Game {
  const { sfx, fx } = stage
  // The stage draws at the device pixel ratio, capped at 2; cache at the same.
  const dpr = Math.min(2, Math.max(1, Math.round(globalThis.devicePixelRatio || 1)))
  const room = paintRoom(stage.rand, dpr)
  const grain = paintPaperGrain(stage.rand, dpr)
  const windowLight = paintWindowLight()
  const leaves = paintLeafShadow(stage.rand)
  const sheet = createSheet(stage.rand)

  // Canvases for hung paintings: four on the line and two on their way down.
  const pool: [HTMLCanvasElement, G][] = []
  for (let i = 0; i < 6; i++) {
    const made = makeCanvas(THUMB_W * dpr, THUMB_H * dpr)
    made[1].scale(dpr, dpr)
    pool.push(made)
  }
  let poolAt = 0

  let sheetState: SheetState = 'board'
  const pose = { x: HOME.x, y: HOME.y, s: 1, r: 0 }
  const settle = spring(1, 260, 16)
  const curl = spring(0, 120, 9)
  let boardDamp = 0
  let trayCount = SHEETS - 1
  // How far each sheet in the tray still has to slide in (1 is outside).
  const traySlide = [0, 0, 0, 0]
  let trayRipple = 1
  let simT = 0
  let paintAmount = 0
  let amountAt = 0
  let lastTouchAt = 0

  const slots: (Painting | null)[] = [null, null, null, null]
  const pegGrip = [1, 1, 1, 1]
  const falling: Falling[] = []
  let hung = 0
  const lineBob = spring(0, 60, 5)

  const brush = {
    x: BRUSH_HOME.x,
    y: BRUSH_HOME.y,
    angle: BRUSH_HOME.angle,
    press: 0,
    lift: 3,
    load: new Float32Array(3),
    bristles: new Float32Array(12),
    hand: null as Pointer | null,
    releasedAt: -10,
    dipT: 0,
    dipJar: 0,
    swishAcc: 0,
    swishAt: 0,
    holdT: 0,
  }
  const combBristles = () => {
    for (let i = 0; i < brush.bristles.length; i++) brush.bristles[i] = 0.62 + Math.random() * 0.38
  }
  combBristles()

  const sponge = {
    x: SPONGE_HOME.x,
    y: SPONGE_HOME.y,
    hand: null as Pointer | null,
    releasedAt: -10,
    press: 0,
    stain: new Float32Array(3),
    lifted: new Float32Array(3),
    squelchAt: 0,
  }

  const looks: JarLook[] = JARS.map((jar) => ({ liquid: jar.pigment >= 0 ? JAR_LIQUID[jar.pigment]! : WATER, ripple: 1, glint: 0, time: 0 }))
  const waterPig = new Float32Array(3)
  const waterShown = new Float32Array(3)
  const puffs: Puff[] = []
  const blots: Blot[] = []
  const touches = new Map<number, Touch>()

  // Warm the simulation up so the first real stroke is not the one that pays
  // for the engine learning these loops.
  {
    const warm = new Float32Array([1, 1, 1])
    for (let i = 0; i < 40; i++) {
      sheet.brush(20 + i * 3, 30 + (i % 7) * 8, 1, 0, warm, brush.bristles, 1.2)
      sheet.sponge(120 - i * 2, 70, sponge.lifted)
      sheet.step()
      sheet.render()
    }
    sponge.lifted.fill(0)
    sheet.clear()
    sheet.render()
  }

  // ---------- sound: the materials themselves, kept low ----------

  const sound = {
    pat: () => sfx.noise({ dur: 0.08, freq: 420, vol: 0.05, filter: 'lowpass' }),
    swish: (speed: number) => sfx.noise({ dur: 0.22, freq: clamp(360 + speed * 0.3, 360, 900), to: 300, vol: 0.02 + Math.min(0.028, speed / 50000), filter: 'bandpass', q: 0.6 }),
    dip: (pigment: number) => {
      sfx.tone({ freq: 250, to: 400, dur: 0.1, vol: 0.06 })
      sfx.noise({ dur: 0.14, freq: 900, to: 380, vol: 0.035, filter: 'lowpass' })
      sfx.tone({ freq: sfx.scale(JAR_NOTE[pigment]!), dur: 1.1, vol: 0.055, attack: 0.03, delay: 0.06 })
      sfx.tone({ freq: 2300 + Math.random() * 200, dur: 0.05, vol: 0.018, delay: 0.2 })
    },
    rinse: () => {
      sfx.noise({ dur: 0.3, freq: 500, to: 1100, vol: 0.05, q: 0.8 })
      sfx.noise({ dur: 0.32, freq: 900, to: 420, vol: 0.045, q: 0.8, delay: 0.24 })
      sfx.tone({ freq: 1900, dur: 0.08, vol: 0.022, delay: 0.1 })
      sfx.tone({ freq: 2500, dur: 0.07, vol: 0.02, delay: 0.38 })
    },
    wood: () => sfx.tone({ freq: 175, to: 115, dur: 0.06, type: 'triangle', vol: 0.07 }),
    squelch: () => sfx.noise({ dur: 0.15, freq: 340, to: 180, vol: 0.05, filter: 'lowpass' }),
    rustle: () => sfx.noise({ dur: 0.24, freq: 2600, to: 1500, vol: 0.03, q: 0.5 }),
    lap: () => sfx.noise({ dur: 0.36, freq: 520, to: 260, vol: 0.05, filter: 'lowpass' }),
    drip: (delay: number) => sfx.tone({ freq: 700 + Math.random() * 200, to: 1300, dur: 0.05, vol: 0.03, delay }),
    peg: (delay: number) => {
      sfx.tone({ freq: 940, to: 600, dur: 0.035, type: 'triangle', vol: 0.08, delay })
      sfx.noise({ dur: 0.02, freq: 2400, vol: 0.03, delay })
    },
    pluck: () => sfx.tone({ freq: 147, dur: 0.4, vol: 0.045, attack: 0.01 }),
  }

  // ---------- small helpers ----------

  const loadSum = () => brush.load[0]! + brush.load[1]! + brush.load[2]!
  // Hairs full of paint are wet; hairs just rinsed are wetter still, and a
  // touch of them sends a bloom through whatever colour is there.
  const brushWater = () => 1.12 + 0.85 * (1 - clamp(loadSum() * 1.5, 0, 1))
  const onPaper = (x: number, y: number) => x >= PAPER.x && x <= PAPER.x + PAPER.w && y >= PAPER.y && y <= PAPER.y + PAPER.h
  const jarAt = (x: number, y: number, tight: boolean): number => {
    for (let i = 0; i < JARS.length; i++) {
      const jar = JARS[i]!
      if (tight) {
        if (Math.abs(x - jar.x) < jar.rx && Math.abs(y - (jar.y + 12)) < 34) return i
      } else if (Math.abs(x - jar.x) < jar.rx + 12 && y > jar.y - jar.ry - 16 && y < jar.y + jar.h + jar.ry + 8) return i
    }
    return -1
  }
  // Within a finger's width of the brush, from the hairs to the handle's end.
  const nearBrush = (x: number, y: number): boolean => {
    const ex = Math.sin(brush.angle) * 180
    const ey = -Math.cos(brush.angle) * 180
    const t = clamp(((x - brush.x) * ex + (y - brush.y) * ey) / (180 * 180), 0, 1)
    return dist(x, y, brush.x + ex * t, brush.y + ey * t) < 38
  }
  const drops = (x: number, y: number, count: number) =>
    fx.burst(x, y, { count, color: ['#c3dbe2', '#e4f0f2'], speed: 90, life: 0.55, size: 4, gravity: 620, angle: Math.PI / 2, spread: 1.6, shape: 'circle' })

  // ---------- the acts ----------

  const dip = (index: number) => {
    const jar = JARS[index]!
    const look = looks[index]!
    brush.dipT = 0.36
    brush.dipJar = index
    look.ripple = 0
    stage.tween(1.1, (t) => (look.ripple = t), ease.outCubic)
    if (jar.pigment >= 0) {
      // A brush that was not rinsed carries some of the old colour along.
      for (let k = 0; k < 3; k++) brush.load[k] = brush.load[k]! * 0.1
      brush.load[jar.pigment] = Math.min(1.1, brush.load[jar.pigment]! + 1)
      combBristles()
      sound.dip(jar.pigment)
      return
    }
    const sum = loadSum()
    if (sum > 0.04) {
      const color = pigmentRgb(brush.load[0]! * 1.6, brush.load[1]! * 1.6, brush.load[2]! * 1.6, WATER)
      for (let i = 0; i < 5; i++) {
        puffs.push({ x: jar.x + (Math.random() - 0.5) * 20, y: jar.y + LIQUID_DROP + 14 + i * 6, r: 8 + Math.random() * 6, vx: (Math.random() - 0.5) * 16, age: -i * 0.09, color })
      }
    }
    for (let k = 0; k < 3; k++) {
      waterPig[k] = Math.min(1.6, waterPig[k]! + brush.load[k]! * 0.11)
      // Muddy water leaves a little of itself on the hairs.
      brush.load[k] = brush.load[k]! * 0.03 + waterPig[k]! * 0.01
    }
    sound.rinse()
  }

  const rinseSponge = () => {
    const jar = JARS[3]!
    const look = looks[3]!
    look.ripple = 0
    stage.tween(1.1, (t) => (look.ripple = t), ease.outCubic)
    const sum = sponge.stain[0]! + sponge.stain[1]! + sponge.stain[2]!
    if (sum > 0.03) {
      const color = pigmentRgb(sponge.stain[0]! * 2, sponge.stain[1]! * 2, sponge.stain[2]! * 2, WATER)
      for (let i = 0; i < 5; i++) {
        puffs.push({ x: jar.x + (Math.random() - 0.5) * 30, y: jar.y + LIQUID_DROP + 12 + i * 6, r: 9 + Math.random() * 6, vx: (Math.random() - 0.5) * 18, age: -i * 0.09, color })
      }
    }
    for (let k = 0; k < 3; k++) {
      waterPig[k] = Math.min(1.6, waterPig[k]! + sponge.stain[k]! * 0.25)
      sponge.stain[k] = sponge.stain[k]! * 0.12
    }
    sound.squelch()
    sound.lap()
    sound.drip(0.3)
  }

  const dabWood = (x: number, y: number) => {
    sound.wood()
    const sum = loadSum()
    if (sum > 0.12) {
      blots.push({ x, y, r: 13 + Math.random() * 5, squash: 0.6 + Math.random() * 0.2, color: pigmentRgb(brush.load[0]! * 1.4, brush.load[1]! * 1.4, brush.load[2]! * 1.4), alpha: 0.75, dries: false })
      for (let k = 0; k < 3; k++) brush.load[k]! *= 0.97
    } else {
      blots.push({ x, y, r: 14 + Math.random() * 5, squash: 0.6 + Math.random() * 0.2, color: [92, 58, 28], alpha: 0.26, dries: true })
    }
    if (blots.length > 18) blots.splice(0, 1)
  }

  const takeSheet = () => {
    trayCount--
    sheet.clear()
    sheet.render()
    sheetState = 'arriving'
    trayRipple = 0
    stage.tween(1.2, (t) => (trayRipple = t), ease.outCubic)
    sound.lap()
    sound.rustle()
    sound.drip(0.25)
    sound.drip(0.42)
    sound.drip(0.7)
    drops(TRAY_MID.x, TRAY_MID.y + 30, 6)
    stage.after(0.3, () => drops(pose.x - 40, pose.y + 60 * pose.s, 4))
    stage.tween(
      0.95,
      (t) => {
        pose.x = TRAY_MID.x + (HOME.x - TRAY_MID.x) * t
        pose.y = TRAY_MID.y + (HOME.y - TRAY_MID.y) * t - Math.sin(t * Math.PI) * 30
        pose.s = TRAY_SCALE + (1 - TRAY_SCALE) * t
        pose.r = Math.sin(t * Math.PI) * -0.04
      },
      ease.inOutCubic,
      () => {
        sheetState = 'board'
        pose.x = HOME.x
        pose.y = HOME.y
        pose.s = 1
        pose.r = 0
        settle.value = 1.025
        boardDamp = 0
        sound.pat()
        sfx.noise({ dur: 0.16, freq: 300, vol: 0.05, filter: 'lowpass' })
      },
    )
  }

  // The tray is empty and so is the board: fresh sheets, fresh water.
  const refill = () => {
    trayCount = SHEETS
    for (let i = 0; i < SHEETS; i++) {
      traySlide[i] = 1
      stage.after(i * 0.22, () => {
        sound.rustle()
        stage.tween(0.5, (t) => (traySlide[i] = 1 - t), ease.outCubic, () => {
          if (i === SHEETS - 1) sound.lap()
        })
      })
    }
    const before = [waterPig[0]!, waterPig[1]!, waterPig[2]!]
    const stained = [sponge.stain[0]!, sponge.stain[1]!, sponge.stain[2]!]
    stage.tween(1.6, (t) => {
      for (let k = 0; k < 3; k++) {
        waterPig[k] = before[k]! * (1 - t)
        sponge.stain[k] = stained[k]! * (1 - t)
      }
    })
    const water = looks[3]!
    water.ripple = 0
    stage.tween(1.4, (t) => (water.ripple = t), ease.outCubic)
    stage.after(0.9, () => sfx.noise({ dur: 0.5, freq: 700, to: 1200, vol: 0.035, q: 0.7 }))
  }

  const tapTray = () => {
    if (sheetState === 'none' && trayCount > 0 && traySlide.every((s) => s === 0)) takeSheet()
    else if (sheetState === 'none' && trayCount === 0) refill()
    else {
      trayRipple = 0
      stage.tween(1.2, (t) => (trayRipple = t), ease.outCubic)
      sound.lap()
    }
  }

  const hang = () => {
    const slot = hung % SLOTS.length
    hung++
    const old = slots[slot]
    if (old) {
      // The oldest painting comes down to make room.
      slots[slot] = null
      falling.push({ canvas: old.canvas, x: SLOTS[slot]!, y: lineY(SLOTS[slot]!, 0) + 12 + THUMB_H / 2, vy: 0, rot: old.swing.value, spin: (Math.random() - 0.5) * 0.6 })
      sound.peg(0)
    }
    stage.tween(0.25, (t) => (pegGrip[slot] = 1 - t))
    sheet.render()
    sheetState = 'flying'
    sound.rustle()
    const from = { ...pose }
    const tx = SLOTS[slot]!
    const ty = lineY(tx, 0) + 12 + THUMB_H / 2
    stage.tween(
      1.05,
      (t) => {
        pose.x = from.x + (tx - from.x) * t
        pose.y = from.y + (ty - from.y) * t
        pose.s = from.s + (THUMB_SCALE - from.s) * t
        pose.r = from.r * (1 - t) + Math.sin(t * Math.PI) * 0.05
      },
      ease.inOutCubic,
      () => {
        const [canvas, ctx] = pool[poolAt++ % pool.length]!
        ctx.clearRect(0, 0, THUMB_W, THUMB_H)
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(sheet.canvas, 0, 0, THUMB_W, THUMB_H)
        ctx.drawImage(grain, 0, 0, THUMB_W, THUMB_H)
        ctx.strokeStyle = 'rgba(120,100,70,0.35)'
        ctx.lineWidth = 1
        ctx.strokeRect(0.5, 0.5, THUMB_W - 1, THUMB_H - 1)
        const painting: Painting = { canvas, ctx, swing: spring(0, 14, 1.3), grip: 0 }
        painting.swing.vel = 0.5
        slots[slot] = painting
        sheetState = 'none'
        sheet.clear()
        boardDamp = 1
        paintAmount = 0
        lineBob.kick(40)
        sound.peg(0.02)
        sound.peg(0.2)
        stage.tween(0.3, (t) => (pegGrip[slot] = t), ease.outBack)
        lastTouchAt = stage.time
      },
    )
  }

  const layBack = () => {
    sheetState = 'laying'
    const from = { ...pose }
    stage.tween(
      0.32,
      (t) => {
        pose.x = from.x + (HOME.x - from.x) * t
        pose.y = from.y + (HOME.y - from.y) * t
        pose.s = from.s + (1 - from.s) * t
        pose.r = from.r * (1 - t)
      },
      ease.outCubic,
      () => {
        sheetState = 'board'
        settle.value = 1.015
        sound.pat()
      },
    )
  }

  const touchLine = (x: number, y: number) => {
    lineBob.kick(70)
    sound.pluck()
    let fluttered = false
    for (let i = 0; i < SLOTS.length; i++) {
      const painting = slots[i]
      if (!painting) continue
      const near = Math.abs(x - SLOTS[i]!) < THUMB_W / 2 + 10 && y < LINE_Y + THUMB_H + 40
      painting.swing.kick(near ? (x < SLOTS[i]! ? 0.9 : -0.9) : (Math.random() - 0.5) * 0.4)
      if (near) fluttered = true
    }
    if (fluttered) sound.rustle()
  }

  const paintSegment = (touch: Touch, x: number, y: number) => {
    const dx = x - touch.lx
    const dy = y - touch.ly
    const len = Math.hypot(dx, dy)
    if (len < 0.5) return
    touch.ux = touch.ux * 0.4 + (dx / len) * 0.6
    touch.uy = touch.uy * 0.4 + (dy / len) * 0.6
    const un = Math.hypot(touch.ux, touch.uy) || 1
    const ux = touch.ux / un
    const uy = touch.uy / un
    const n = Math.max(1, Math.ceil(len / CELL))
    for (let s = 1; s <= n; s++) {
      const px = touch.lx + (dx * s) / n
      const py = touch.ly + (dy * s) / n
      if (px < PAPER.x - 20 || px > PAPER.x + PAPER.w + 20 || py < PAPER.y - 20 || py > PAPER.y + PAPER.h + 20) continue
      sheet.brush((px - PAPER.x) / CELL, (py - PAPER.y) / CELL, ux, uy, brush.load, brush.bristles, brushWater())
    }
    brush.swishAcc += len
  }

  const spongeSegment = (touch: Touch, x: number, y: number) => {
    const dx = x - touch.lx
    const dy = y - touch.ly
    const len = Math.hypot(dx, dy)
    const n = Math.max(1, Math.ceil(len / (CELL * 3)))
    for (let s = 1; s <= n; s++) {
      const px = touch.lx + (dx * s) / n
      const py = touch.ly + (dy * s) / n
      if (sheetState === 'board' && px > PAPER.x - 30 && px < PAPER.x + PAPER.w + 30 && py > PAPER.y - 30 && py < PAPER.y + PAPER.h + 30) {
        sheet.sponge((px - PAPER.x) / CELL, (py - PAPER.y) / CELL, sponge.lifted)
      }
      for (const blot of blots) if (dist(px, py, blot.x, blot.y) < 44) blot.alpha -= 0.3
    }
    for (let k = 0; k < 3; k++) {
      sponge.stain[k] = Math.min(1.2, sponge.stain[k]! + sponge.lifted[k]! * 0.0012)
      sponge.lifted[k] = 0
    }
  }

  // ---------- drawing ----------

  // The sheet in its own space: origin at the top-left corner of the paper.
  const drawSheet = (g: G, fold: number) => {
    const w = PAPER.w
    const h = PAPER.h
    if (fold > 1) {
      g.save()
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(w, 0)
      g.lineTo(w, h)
      g.lineTo(fold, h)
      g.lineTo(0, h - fold)
      g.closePath()
      g.clip()
    }
    g.drawImage(sheet.canvas, 0, 0, w, h)
    g.drawImage(grain, 0, 0, w, h)
    if (fold > 1) {
      // Shade under the flap, then the flap: the back of the sheet.
      g.beginPath()
      g.moveTo(fold, h)
      g.lineTo(0, h - fold)
      g.lineTo(fold * 1.22, h - fold * 1.22)
      g.closePath()
      g.fillStyle = 'rgba(70,50,30,0.16)'
      g.fill()
      g.restore()
      g.beginPath()
      g.moveTo(fold, h)
      g.lineTo(0, h - fold)
      g.quadraticCurveTo(fold * 0.72, h - fold * 0.72, fold * 1.02, h - fold * 1.02)
      g.quadraticCurveTo(fold * 0.9, h - fold * 0.5, fold, h)
      g.closePath()
      const back = g.createLinearGradient(0, h, fold, h - fold)
      back.addColorStop(0, '#d9cfb8')
      back.addColorStop(0.5, '#f4eedf')
      back.addColorStop(1, '#e9e1cd')
      g.fillStyle = back
      g.fill()
      g.strokeStyle = 'rgba(120,100,70,0.4)'
      g.lineWidth = 1.2
      g.stroke()
    }
  }

  const drawLine = (g: G) => {
    const bob = lineBob.value
    g.beginPath()
    g.moveTo(-10, LINE_Y - 10)
    g.quadraticCurveTo(W / 2, LINE_Y - 10 + 2 * (26 + bob), W + 10, LINE_Y - 10)
    g.strokeStyle = 'rgba(90,60,40,0.18)'
    g.lineWidth = 3
    g.save()
    g.translate(3, 9)
    g.stroke()
    g.restore()
    g.strokeStyle = '#a98a5c'
    g.lineWidth = 3
    g.stroke()
    g.strokeStyle = 'rgba(255,240,210,0.5)'
    g.lineWidth = 1
    g.stroke()

    if (falling.length > 0) {
      g.save()
      g.beginPath()
      g.rect(0, 0, W, TABLE_Y)
      g.clip()
      for (const f of falling) {
        g.save()
        g.translate(f.x, f.y)
        g.rotate(f.rot)
        g.drawImage(f.canvas, -THUMB_W / 2, -THUMB_H / 2, THUMB_W, THUMB_H)
        g.restore()
      }
      g.restore()
    }

    const breeze = Math.sin(stage.time * 0.6) * 0.012
    for (let i = 0; i < SLOTS.length; i++) {
      const x = SLOTS[i]!
      const y = lineY(x, bob)
      const painting = slots[i]
      const pegDx = THUMB_W / 2 - 26
      if (painting) {
        const a = painting.swing.value + breeze * (1 + i * 0.3)
        g.save()
        g.translate(x, y)
        g.rotate(a)
        g.fillStyle = 'rgba(90,60,40,0.14)'
        g.fillRect(-THUMB_W / 2 + 5, 12 + 8, THUMB_W, THUMB_H)
        g.drawImage(painting.canvas, -THUMB_W / 2, 12, THUMB_W, THUMB_H)
        drawPeg(g, -pegDx, 4, -0.05, pegGrip[i]!)
        drawPeg(g, pegDx, 4, 0.06, pegGrip[i]!)
        g.restore()
      } else {
        drawPeg(g, x - pegDx, lineY(x - pegDx, bob) + 4, -0.08 + breeze * 3, pegGrip[i]!)
        drawPeg(g, x + pegDx, lineY(x + pegDx, bob) + 4, 0.07 + breeze * 3, pegGrip[i]!)
      }
    }
  }

  const drawTray = (g: G, idle: number) => {
    const bx = TRAY.x + 13
    const by = TRAY.y + 13
    const bw = TRAY.w - 26
    const bh = TRAY.h - 26
    g.save()
    g.beginPath()
    g.roundRect(bx, by, bw, bh, 12)
    g.clip()
    const inviting = sheetState === 'none' && idle > 8
    for (let i = 0; i < trayCount; i++) {
      const lay = TRAY_LAY[i]!
      const top = i === trayCount - 1
      const lift = top && inviting ? (Math.sin(stage.time * 1.3) * 0.5 + 0.5) * 3 : 0
      g.save()
      g.translate(TRAY_MID.x + lay[0] - traySlide[i]! * 260 - lift, TRAY_MID.y + lay[1] - lift)
      g.rotate(lay[2])
      g.fillStyle = 'rgba(80,100,110,0.16)'
      g.fillRect(-86 + 2, -60 + 3, 172, 120)
      g.fillStyle = top ? '#f6f1e4' : '#ece9de'
      g.fillRect(-86, -60, 172, 120)
      g.strokeStyle = 'rgba(110,125,125,0.4)'
      g.lineWidth = 1
      g.strokeRect(-86, -60, 172, 120)
      g.restore()
    }
    // Water over the sheets: a faint tint and slow lines of light.
    g.fillStyle = 'rgba(176,208,216,0.24)'
    g.fillRect(bx, by, bw, bh)
    g.strokeStyle = 'rgba(255,255,255,0.5)'
    g.lineWidth = 2.2
    for (let k = 0; k < 3; k++) {
      const yy = by + 30 + k * 44 + Math.sin(stage.time * 0.5 + k * 2) * 5
      const xx = bx + 26 + k * 34 + Math.sin(stage.time * 0.33 + k) * 12
      g.beginPath()
      g.moveTo(xx, yy)
      g.quadraticCurveTo(xx + 22, yy - 5 + Math.sin(stage.time * 0.8 + k) * 3, xx + 46, yy + 1)
      g.stroke()
    }
    if (trayRipple < 1) {
      for (let k = 0; k < 2; k++) {
        const t = trayRipple - k * 0.25
        if (t <= 0) continue
        g.beginPath()
        g.ellipse(TRAY_MID.x, TRAY_MID.y, 20 + t * 90, 14 + t * 62, 0, 0, TAU)
        g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - t)})`
        g.lineWidth = 2.4
        g.stroke()
      }
    }
    if (inviting) {
      // The water catches the window for a moment.
      const phase = ((idle - 8) % 6) / 1.8
      if (phase < 1) {
        const gx = bx - 20 + phase * (bw + 40)
        g.beginPath()
        g.moveTo(gx + 16, by)
        g.lineTo(gx - 16, by + bh)
        g.strokeStyle = `rgba(255,255,255,${Math.sin(phase * Math.PI) * 0.45})`
        g.lineWidth = 16
        g.stroke()
      }
    }
    g.restore()
  }

  const foldSize = () => 42 + curl.value * 22

  const brushLook = () => {
    const sum = loadSum()
    const tip = pigmentRgb(brush.load[0]!, brush.load[1]!, brush.load[2]!, HAIR)
    return { x: brush.x, y: brush.y, angle: brush.angle, press: brush.press, lift: brush.lift, tip, stain: clamp(sum * 1.6, 0, 1), bristles: brush.bristles }
  }

  return {
    update(dt) {
      const time = stage.time
      const idle = time - lastTouchAt

      // The paper: fixed small steps so it behaves the same at any frame rate.
      if (sheetState === 'board') {
        simT += dt
        let n = 0
        while (simT >= STEP && n < 2) {
          sheet.step()
          simT -= STEP
          n++
        }
        if (simT > STEP) simT = 0
        if (time - amountAt > 0.6) {
          amountAt = time
          paintAmount = sheet.amount()
        }
      }
      settle.update(dt)
      lineBob.update(dt)
      if (boardDamp > 0 && sheetState !== 'flying') boardDamp = Math.max(0, boardDamp - dt / 40)

      // The corner of the sheet: lifted a little, more when it is time.
      const invite = sheetState === 'board' && paintAmount > 0.02 && idle > 10 ? 0.45 + Math.sin(time * 1.1) * 0.25 : 0
      curl.target = sheetState === 'lifting' || sheetState === 'flying' ? 1.3 : invite
      curl.update(dt)

      // The brush goes where the hand is, into the jar, or home to its rest.
      const hand = brush.hand
      let tx = brush.x
      let ty = brush.y
      let ta = 0.55
      let lift = 12
      let rate = 30
      let press = 0
      if (brush.dipT > 0) {
        brush.dipT -= dt
        const jar = JARS[brush.dipJar]!
        tx = jar.x + 4
        ty = jar.y + LIQUID_DROP + 30
        ta = 0.3 + Math.sin(brush.dipT * 26) * 0.07
        lift = 0
        rate = 24
      } else if (hand) {
        tx = hand.x
        ty = hand.y
        ta = 0.55 + clamp(hand.vx * 0.0005, -0.3, 0.3)
        const touching = hand.y > TABLE_Y
        lift = touching ? 0 : 10
        press = touching ? 1 : 0
        rate = 42
      } else if (time - brush.releasedAt > 1.3) {
        tx = BRUSH_HOME.x
        ty = BRUSH_HOME.y
        ta = BRUSH_HOME.angle
        lift = 3
        rate = 6
      }
      // A brush held still on wet paper keeps giving: the colour pools.
      if (hand && brush.dipT <= 0 && sheetState === 'board' && onPaper(hand.x, hand.y)) {
        brush.holdT += dt
        const touch = touches.get(hand.id)
        if (brush.holdT > 0.11 && touch) {
          brush.holdT = 0
          sheet.brush((hand.x - PAPER.x) / CELL, (hand.y - PAPER.y) / CELL, touch.ux, touch.uy, brush.load, brush.bristles, brushWater())
        }
      }
      brush.x = damp(brush.x, tx, rate, dt)
      brush.y = damp(brush.y, ty, rate, dt)
      brush.angle = damp(brush.angle, ta, 9, dt)
      brush.lift = damp(brush.lift, lift, 14, dt)
      brush.press = damp(brush.press, press, 22, dt)

      // The sponge is carried, or waits a moment, then goes back to its dish.
      if (sponge.hand) {
        sponge.x = damp(sponge.x, sponge.hand.x, 40, dt)
        sponge.y = damp(sponge.y, sponge.hand.y, 40, dt)
        sponge.press = damp(sponge.press, 1, 20, dt)
      } else {
        sponge.press = damp(sponge.press, 0, 14, dt)
        if (time - sponge.releasedAt > 1.4) {
          sponge.x = damp(sponge.x, SPONGE_HOME.x, 5, dt)
          sponge.y = damp(sponge.y, SPONGE_HOME.y, 5, dt)
        }
      }

      // Jars: the water shows what has been rinsed into it; colours glint in
      // turn while the brush is clean and the sheet untouched.
      for (let k = 0; k < 3; k++) waterShown[k] = damp(waterShown[k]!, waterPig[k]!, 0.9, dt)
      looks[3]!.liquid = pigmentRgb(waterShown[0]!, waterShown[1]!, waterShown[2]!, WATER)
      const jarsInvite = sheetState === 'board' && paintAmount < 0.01 && loadSum() < 0.05 && idle > 6
      for (let i = 0; i < looks.length; i++) {
        const look = looks[i]!
        look.time = time
        look.glint = 0
        if (jarsInvite && i < 3) {
          const phase = ((idle - 6) % 6) - i * 0.7
          if (phase > 0 && phase < 1.5) look.glint = phase / 1.5
        }
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const puff = puffs[i]!
        puff.age += dt
        if (puff.age < 0) continue
        puff.r += dt * 16
        puff.y += dt * 13
        puff.x += puff.vx * dt
        puff.vx *= 1 - dt * 0.8
        if (puff.age > 3.2) puffs.splice(i, 1)
      }

      for (let i = blots.length - 1; i >= 0; i--) {
        const blot = blots[i]!
        if (blot.dries) blot.alpha -= dt / 26
        if (blot.alpha <= 0.01) blots.splice(i, 1)
      }
      for (let i = falling.length - 1; i >= 0; i--) {
        const f = falling[i]!
        f.vy += 900 * dt
        f.y += f.vy * dt
        f.rot += f.spin * dt
        if (f.y > TABLE_Y + THUMB_H) falling.splice(i, 1)
      }
      for (const painting of slots) painting?.swing.update(dt)
    },

    draw(g) {
      const time = stage.time
      const idle = time - lastTouchAt
      sheet.render()
      g.drawImage(room, 0, 0, W, H)

      drawLine(g)
      // Leaf shadows stir on the wall.
      g.globalAlpha = 0.11
      g.save()
      g.translate(770, 6)
      g.rotate(Math.sin(time * 0.45) * 0.025)
      g.drawImage(leaves, Math.sin(time * 0.31) * 9, 0)
      g.restore()
      g.save()
      g.translate(330, 20)
      g.rotate(Math.PI + 0.25 + Math.sin(time * 0.38 + 1) * 0.03)
      g.scale(0.7, -0.7)
      g.drawImage(leaves, -210 + Math.sin(time * 0.27) * 7, -40)
      g.restore()
      g.globalAlpha = 1

      // Dabs on the wood lie under the sheet.
      for (const blot of blots) {
        g.fillStyle = `rgba(${blot.color[0]},${blot.color[1]},${blot.color[2]},${blot.alpha})`
        g.beginPath()
        g.ellipse(blot.x, blot.y, blot.r, blot.r * blot.squash, 0, 0, TAU)
        g.fill()
        g.beginPath()
        g.ellipse(blot.x + blot.r * 0.7, blot.y + blot.r * 0.2, blot.r * 0.45, blot.r * 0.34, 0.4, 0, TAU)
        g.fill()
      }

      // The board: a damp mark where a sheet has just been, or the sheet.
      if (boardDamp > 0 && sheetState !== 'board') {
        g.fillStyle = `rgba(120,84,40,${0.16 * boardDamp})`
        g.fillRect(PAPER.x, PAPER.y, PAPER.w, PAPER.h)
      }
      const flat = sheetState === 'board' || sheetState === 'laying'
      const fold = foldSize()
      if (flat) {
        g.save()
        g.translate(pose.x, pose.y)
        g.rotate(pose.r)
        g.scale(pose.s * settle.value, pose.s * settle.value)
        g.translate(-PAPER.w / 2, -PAPER.h / 2)
        g.fillStyle = 'rgba(70,45,20,0.2)'
        g.fillRect(2, 4, PAPER.w, PAPER.h)
        drawSheet(g, fold)
        g.restore()
      }

      drawTray(g, idle)

      // Jars, with the brush between back and front glass while it dips.
      const resting = brush.dipT > 0 || brush.hand || time - brush.releasedAt > 1.3 ? -1 : jarAt(brush.x, brush.y - 10, true)
      const inJar = brush.dipT > 0 ? brush.dipJar : resting
      const dipping = inJar >= 0
      for (let i = 0; i < JARS.length; i++) drawJarBack(g, JARS[i]!, looks[i]!)
      if (puffs.length > 0) {
        const jar = JARS[3]!
        g.save()
        clipLiquid(g, jar)
        for (const puff of puffs) {
          if (puff.age < 0) continue
          const a = clamp(1 - puff.age / 3.2, 0, 1) * 0.55
          g.fillStyle = `rgba(${puff.color[0]},${puff.color[1]},${puff.color[2]},${a})`
          g.beginPath()
          g.ellipse(puff.x, puff.y, puff.r * 1.2, puff.r, 0, 0, TAU)
          g.fill()
          g.beginPath()
          g.ellipse(puff.x + puff.r * 0.8, puff.y + puff.r * 0.5, puff.r * 0.7, puff.r * 0.6, 0, 0, TAU)
          g.fill()
        }
        g.restore()
      }
      if (dipping) {
        const jar = JARS[inJar]!
        const ys = jar.y + LIQUID_DROP
        g.save()
        g.beginPath()
        g.rect(0, 0, W, ys)
        g.ellipse(jar.x, ys, jar.rx * 0.97 - 3, jar.ry * 0.9, 0, 0, TAU)
        g.clip()
        drawBrush(g, brushLook())
        g.restore()
      }
      for (let i = 0; i < JARS.length; i++) drawJarFront(g, JARS[i]!, looks[i]!)

      const stain = pigmentRgb(sponge.stain[0]!, sponge.stain[1]!, sponge.stain[2]!, [230, 197, 124])
      const stained = clamp((sponge.stain[0]! + sponge.stain[1]! + sponge.stain[2]!) * 0.9, 0, 0.75)
      drawSponge(g, { x: sponge.x, y: sponge.y, press: sponge.press, lift: sponge.hand ? 2 : dist(sponge.x, sponge.y, SPONGE_HOME.x, SPONGE_HOME.y) > 6 ? 6 : 1, stain, stainAlpha: stained, turn: -0.12 })

      // Window light lies across the table and drifts with the afternoon.
      g.globalAlpha = 0.17
      g.drawImage(windowLight, -70 + Math.sin(time / 23) * 26, 250 + Math.cos(time / 31) * 12)
      g.globalAlpha = 1

      if (!flat && sheetState !== 'none') {
        g.save()
        g.translate(pose.x, pose.y)
        g.rotate(pose.r)
        g.scale(pose.s, pose.s)
        g.translate(-PAPER.w / 2, -PAPER.h / 2)
        g.fillStyle = 'rgba(60,40,20,0.16)'
        g.fillRect(10, 16, PAPER.w, PAPER.h)
        drawSheet(g, sheetState === 'arriving' ? 0 : fold)
        g.restore()
      }

      if (!dipping) drawBrush(g, brushLook())
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      const touch: Touch = { mode: 'idle', lx: p.x, ly: p.y, ux: 1, uy: 0, inJar: -1 }
      touches.set(p.id, touch)

      // The sponge, wherever it is lying.
      if (!sponge.hand && dist(p.x, p.y, sponge.x, sponge.y) < 62) {
        touch.mode = 'sponge'
        sponge.hand = p
        sound.squelch()
        spongeSegment(touch, p.x, p.y)
        return
      }
      // The curled corner of the sheet: only the flap itself and the bit of
      // board beside it, so a stroke begun near the corner is still a stroke.
      const cornerX = p.x - PAPER.x
      const cornerY = PAPER.y + PAPER.h - p.y
      if (sheetState === 'board' && cornerX > -28 && cornerY > -28 && cornerX + cornerY < 30 + foldSize()) {
        let painting = false
        for (const other of touches.values()) if (other !== touch && other.mode === 'paint') painting = true
        if (!painting) {
          touch.mode = 'sheet'
          curl.kick(5)
          sound.rustle()
          return
        }
      }
      const jar = jarAt(p.x, p.y, false)
      if (jar >= 0) {
        touch.mode = 'paint'
        touch.inJar = jar
        brush.hand = p
        dip(jar)
        return
      }
      if (onPaper(p.x, p.y) && sheetState === 'board') {
        touch.mode = 'paint'
        brush.hand = p
        // A dab: the flat brush set down across the way it will travel.
        for (let i = 0; i < 3; i++) sheet.brush((p.x - PAPER.x) / CELL, (p.y - PAPER.y) / CELL, 0, 1, brush.load, brush.bristles, brushWater())
        touch.ux = 0
        touch.uy = 1
        sound.pat()
        return
      }
      // The brush itself, lying on its rest: picked up, nothing dabbed.
      if (!brush.hand && nearBrush(p.x, p.y)) {
        touch.mode = 'paint'
        brush.hand = p
        sfx.tone({ freq: 620, to: 480, dur: 0.04, type: 'triangle', vol: 0.05 })
        return
      }
      if (p.x > TRAY.x - 8 && p.x < TRAY.x + TRAY.w + 8 && p.y > TRAY.y - 8 && p.y < TRAY.y + TRAY.h + 8) {
        tapTray()
        return
      }
      if (p.y < TABLE_Y) {
        touchLine(p.x, p.y)
        return
      }
      // Bare table, cloth or board: the brush comes down on it.
      touch.mode = 'paint'
      brush.hand = p
      dabWood(p.x, p.y)
    },

    move(p: Pointer) {
      const touch = touches.get(p.id)
      if (!touch) return
      lastTouchAt = stage.time
      if (touch.mode === 'paint') {
        const jar = jarAt(p.x, p.y, true)
        if (jar >= 0 && jar !== touch.inJar) dip(jar)
        touch.inJar = jar
        if (sheetState === 'board' && brush.dipT <= 0) {
          paintSegment(touch, p.x, p.y)
          if (onPaper(p.x, p.y) && brush.swishAcc > 16 && stage.time - brush.swishAt > 0.13) {
            sound.swish(Math.hypot(p.vx, p.vy))
            brush.swishAt = stage.time
            brush.swishAcc = 0
          }
        }
      } else if (touch.mode === 'sponge') {
        spongeSegment(touch, p.x, p.y)
        // Carried to the water jar, the sponge is squeezed out in it.
        const jar = jarAt(p.x, p.y, true)
        if (jar === 3 && touch.inJar !== 3) rinseSponge()
        touch.inJar = jar
        if (stage.time - sponge.squelchAt > 0.22 && dist(p.x, p.y, touch.lx, touch.ly) > 3) {
          sponge.squelchAt = stage.time
          sfx.noise({ dur: 0.16, freq: 300, to: 200, vol: 0.028, filter: 'lowpass' })
        }
      } else if (touch.mode === 'sheet') {
        if (sheetState === 'board' && dist(p.x, p.y, p.startX, p.startY) > 22) {
          sheetState = 'lifting'
          sound.rustle()
        }
        if (sheetState === 'lifting') {
          pose.x = HOME.x + (p.x - p.startX)
          pose.y = HOME.y + (p.y - p.startY)
          pose.r = clamp((p.x - p.startX) * 0.0004, -0.1, 0.1)
          pose.s = 1.03
        }
      }
      touch.lx = p.x
      touch.ly = p.y
    },

    up(p: Pointer) {
      const touch = touches.get(p.id)
      touches.delete(p.id)
      if (!touch) return
      lastTouchAt = stage.time
      if (touch.mode === 'paint' && brush.hand === p) {
        brush.hand = null
        brush.releasedAt = stage.time
      } else if (touch.mode === 'sponge' && sponge.hand === p) {
        sponge.hand = null
        sponge.releasedAt = stage.time
      } else if (touch.mode === 'sheet' && sheetState === 'lifting') {
        const raised = HOME.y - pose.y
        if (raised > 90 || dist(pose.x, pose.y, HOME.x, HOME.y) > 190) hang()
        else layBack()
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'wet-paint',
    name: 'Wet Paint',
    emoji: '🎨',
    ages: [3, 7],
    pitch: 'Dip a wide brush in red, yellow or blue and paint on damp paper. The colours bloom and mix by themselves, and the finished sheet is pegged on the line to dry.',
    howTo: 'Touch a jar to dip the brush, then paint. Rinse in the water jar; carry the sponge over to lift colour off. Lift the sheet by its curled corner to hang it up, and take a fresh one from the tray.',
    basedOn: 'Waldorf wet-on-wet watercolour painting with the three primary colours',
    whyFun: 'The brush leaves wet colour that keeps moving after the hand lifts: edges bloom outward, and yellow meeting blue turns green by itself.',
    set: 'gentle',
  },
  create,
}
