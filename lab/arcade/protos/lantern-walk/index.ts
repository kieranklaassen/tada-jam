// Lantern Walk: make a paper lantern at the craft table, then carry it
// through the dusky wood and hang it by the door at home.
//
// Two scenes. At the table the child snips windows in a painted sheet, rolls
// it, sets a candle inside, hangs it on a stick and lights it. Carried to the
// doorway, it becomes the only light in the wood: the dark is one painting,
// the candle-lit wood another, and the lantern's circle shows the second
// through a soft round hole. Nothing is timed and nothing is counted; the
// ending is the lantern on its hook with its windows glowing on the wall, and
// the way to begin again is the door.

import { clamp, damp, dist, ease, lerp, remap, rnd, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { KINDS, makeCanvas, mulberry, rgba, settle, shapePath, smooth01 } from './art.ts'
import type { G, Kind } from './art.ts'
import { drawCat, drawFarLantern, drawFoxSit, drawFoxWalk, drawHedgehog, drawMoth, drawMushroom, drawOwl } from './creatures.ts'
import { BAIL, FOOT, HOLE_R, MID, R, SH, SW, createLantern, drawCandle, washAt } from './lantern.ts'
import type { Hole } from './lantern.ts'
import { DOOR, TABLE_Y, drawCard, drawDoorLanterns, drawGlint, drawMatch, drawMatchbox, drawScissors, drawScrap, drawStick, paintRoom } from './room.ts'
import {
  CAM_MAX,
  CAT,
  FOX,
  HILL_PARALLAX,
  HILL_Y,
  HOG,
  HOME_DOOR,
  HOOK,
  HOUSE_X,
  OWL,
  SHROOMS,
  STICK_REST,
  WORLD_W,
  buildWood,
  drawTiles,
  groundY,
  hillY,
  paintDoorPane,
  paintWindowGlass,
} from './wood.ts'

// Where the sheet lies, and where the finished lantern stands on the table.
const SX = 290
const SY = 440
const REST_X = 470
const REST_PY = 250
const CARD_X = 112
const CARD_Y = [496, 602, 708] as const
const MATCHBOX = { x: 1010, y: 612 }
const WOOD_S = 0.52
const STICK_LEN = 430
const LEAN_REST = 0.4
const LEAN_HELD = 1.02
const HOLE_GAP = 74

// A slow pentatonic line for the lantern's swing, in the kit's scale steps
// (0 is C5; the tune sits around G and A below it).
const TUNE = [-1, 0, 1, 0, -1, -2, -1, 1, 0, -1, -2, -3, -2, -1, -1, 2, 1, 0, -1, 0, -2, -1]

interface Scrap {
  x: number
  y: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  t: number
  rot: number
  spin: number
  flip: number
  rest: boolean
  kind: Kind
  fill: string
}

type Drag =
  | { kind: 'cut' }
  | { kind: 'roll'; grab: number; moved: number; x: number; y: number }
  | { kind: 'candle'; ox: number; oy: number }
  | { kind: 'stick'; ox: number; oy: number }
  | { kind: 'match'; moved: number }
  | { kind: 'carry'; onBody: boolean; moved: number; x: number; y: number }
  | { kind: 'walk' }
  | { kind: 'tug'; x: number; y: number }
  | { kind: 'none' }

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1)
  return Math.hypot(px - ax - dx * t, py - ay - dy * t)
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const dpr = clamp(Math.round(globalThis.devicePixelRatio || 1), 1, 2)

  // Painted once and kept: the room, the wood, and the soft sprites of light.
  const [roomBg, roomG] = makeCanvas(W * dpr, H * dpr)
  roomG.scale(dpr, dpr)
  paintRoom(roomG, dpr, mulberry(31))
  settle(roomG)
  const wood = buildWood()
  const lan = createLantern()
  const [halo, haloG] = makeCanvas(256, 256)
  {
    const grad = haloG.createRadialGradient(128, 128, 0, 128, 128, 128)
    grad.addColorStop(0, 'rgba(255,206,120,0.6)')
    grad.addColorStop(0.3, 'rgba(255,172,84,0.26)')
    grad.addColorStop(0.65, 'rgba(255,140,60,0.08)')
    grad.addColorStop(1, 'rgba(255,140,60,0)')
    haloG.fillStyle = grad
    haloG.fillRect(0, 0, 256, 256)
    settle(haloG)
  }
  // The dusk that closes round the lantern's circle: clear in the middle,
  // the night's own indigo at the rim.
  const fall = (grad: CanvasGradient, rgb: string, full: number, hole: number): void => {
    for (const [at, lit] of [[0, 1], [0.34, 1], [0.55, 0.84], [0.75, 0.44], [0.9, 0.13], [1, 0]] as const) {
      grad.addColorStop(at * hole, `rgba(${rgb},${full * (1 - lit)})`)
    }
    if (hole < 1) grad.addColorStop(1, `rgba(${rgb},${full})`)
  }
  const [shade, shadeG] = makeCanvas(256, 256)
  {
    const grad = shadeG.createRadialGradient(128, 128, 0, 128, 128, 128)
    fall(grad, '21,22,56', 0.9, 1)
    shadeG.fillStyle = grad
    shadeG.fillRect(0, 0, 256, 256)
    settle(shadeG)
  }
  // The room's dusk: one big veil with a pool of light a fifth of the way out.
  const VEIL_HOLE = 0.2
  const [veil, veilG] = makeCanvas(512, 512)
  {
    const grad = veilG.createRadialGradient(256, 256, 0, 256, 256, 256)
    fall(grad, '30,28,76', 0.6, VEIL_HOLE)
    veilG.fillStyle = grad
    veilG.fillRect(0, 0, 512, 512)
    settle(veilG)
  }

  // Each painted canvas is touched once, one a frame, while the child is
  // still at the table, so the wood does not hitch when it first appears.
  const warm: HTMLCanvasElement[] = [halo, shade, veil, wood.hills, wood.sky, ...wood.lit, ...wood.night]

  let scene: 'table' | 'wood' = 'table'
  let day = 0
  let busy = false
  let fade = 0
  let fadeColor = '#191320'
  let activeId: number | null = null
  let drag: Drag = { kind: 'none' }
  let lastTouch = 0
  let flick = 0.9
  let flickTo = 0.9
  let flickAt = 0

  // The table.
  let kind: Kind = 'star'
  const cardPop: Spring[] = [spring(1, 260, 13), spring(1, 260, 13), spring(1, 260, 13)]
  let rollK = 0
  let rollGoal: number | null = null
  let bail = 0
  let lastRustle = 0
  const sc = { x: 352, y: 704, tx: 352, ty: 704, rot: -0.72, rotTo: -0.72, open: 0.5, snip: 1, homeAt: 0 }
  let scraps: Scrap[] = []
  const candle = { x: 866, y: 566, state: 'table' as 'table' | 'held' | 'drop' | 'in', lit: false, t: 0, fromX: 0, fromY: 0 }
  const match = { state: 'box' as 'box' | 'held' | 'back', lit: false, x: 0, y: 0, fromX: 0, fromY: 0, t: 0, spent: 0, burnt: false }
  const stick = { ax: 740, ay: 754, bx: 1166, by: 694, state: 'table' as 'table' | 'held' | 'hooked' | 'away', k: 0, fromAx: 0, fromAy: 0, fromBx: 0, fromBy: 0 }
  let dusk = 0
  let light = 0
  let lean = LEAN_REST

  // The lantern, once rolled. (px, py) is the top of its wire handle.
  const L = { px: 0, py: 0, vx: 0, th: 0, om: 0, s: 1, held: false, glide: false, offX: 0, offY: 0, restX: REST_X }

  // The wood.
  let cam = 0
  let hung = false
  let canHang = true
  let hungAt = 0
  let hungK = 0
  let doorOpen = 0
  let walked = 0
  let settled = true
  let stepFoot = 0
  let tuneI = 0
  let lastNote = -9
  let reach = 325
  const owl = { wake: 0, awake: false, lastHoot: -99, bob: spring(0, 130, 8) }
  const hog = { x: HOG.x, uncurl: 0, dir: 1, step: 0, pause: 0.6, sniff: 0, rustled: false }
  const fox = { x: FOX.from, dir: 1, walk: 0, phase: 0, seen: false, ear: 0 }
  const shrooms: Spring[] = SHROOMS.map(() => spring(0, 70, 4.5))
  const falling = Array.from({ length: 7 }, (_, i) => ({ x: 200 + i * 170, y: (i * 137) % 600, ph: i * 1.7, c: i % 4 }))
  const FALL = ['#d9772b', '#c2452d', '#e3a43a', '#a8582a']

  const resetTable = (): void => {
    lan.reset(day % 4, mulberry(1000 + day * 77))
    kind = 'star'
    rollK = 0
    rollGoal = null
    bail = 0
    sc.x = sc.tx = 352
    sc.y = sc.ty = 704
    sc.rot = sc.rotTo = -0.72
    sc.open = 0.5
    sc.snip = 1
    sc.homeAt = 0
    scraps = []
    candle.x = 866
    candle.y = 566
    candle.state = 'table'
    candle.lit = false
    match.state = 'box'
    match.lit = false
    match.spent = 0
    match.burnt = false
    stick.ax = 740
    stick.ay = 754
    stick.bx = 1166
    stick.by = 694
    stick.state = 'table'
    stick.k = 0
    dusk = 0
    light = 0
    L.s = 1
    L.th = 0
    L.om = 0
    L.vx = 0
    L.held = false
    L.restX = REST_X
  }
  resetTable()

  const resetWood = (): void => {
    cam = 0
    hung = false
    canHang = true
    hungK = 0
    doorOpen = 0
    walked = 0
    settled = true
    tuneI = 0
    reach = 325
    owl.wake = 0
    owl.awake = false
    hog.x = HOG.x
    hog.uncurl = 0
    hog.dir = 1
    hog.pause = 0.6
    hog.rustled = false
    fox.x = FOX.from
    fox.dir = 1
    fox.walk = 0
    fox.seen = false
  }

  // --- Sound: the thing itself, quietly. ---

  const snipSound = (): void => {
    sfx.noise({ dur: 0.04, freq: 5200, q: 2.5, vol: 0.09 })
    sfx.tone({ freq: 2600, to: 1800, dur: 0.03, type: 'triangle', vol: 0.03 })
    sfx.noise({ dur: 0.05, freq: 3700, q: 3, vol: 0.11, delay: 0.075 })
    sfx.tone({ freq: 2100, to: 1500, dur: 0.035, type: 'triangle', vol: 0.035, delay: 0.075 })
  }
  const paperSound = (vol = 0.05): void => {
    sfx.noise({ dur: 0.09, freq: rnd(1500, 2100), to: 2900, q: 0.8, vol })
  }
  const knock = (soft = 1): void => {
    sfx.tone({ freq: rnd(150, 180), to: 105, dur: 0.07, type: 'sine', vol: 0.11 * soft })
    sfx.noise({ dur: 0.03, freq: 520, filter: 'lowpass', vol: 0.05 * soft })
  }
  const tok = (freq = 620): void => {
    sfx.tone({ freq, to: freq * 0.72, dur: 0.05, type: 'triangle', vol: 0.09 })
    sfx.noise({ dur: 0.025, freq: 1200, filter: 'lowpass', vol: 0.05 })
  }
  const chime = (step: number, vol = 0.085, delay = 0): void => {
    const f = sfx.scale(step)
    sfx.tone({ freq: f, dur: 1.3, type: 'sine', vol, delay, attack: 0.012 })
    sfx.tone({ freq: f * 2, dur: 0.5, type: 'sine', vol: vol * 0.22, delay, attack: 0.012 })
  }
  const rustle = (vol = 0.05): void => {
    sfx.noise({ dur: 0.13, freq: rnd(1500, 2300), to: 900, q: 0.6, vol })
    sfx.noise({ dur: 0.08, freq: rnd(2600, 3400), q: 0.8, vol: vol * 0.6, delay: 0.05 })
  }
  const hoot = (): void => {
    sfx.tone({ freq: 392, to: 372, dur: 0.34, type: 'sine', vol: 0.085, attack: 0.06 })
    sfx.tone({ freq: 392, to: 366, dur: 0.22, type: 'sine', vol: 0.07, attack: 0.05, delay: 0.52 })
    sfx.tone({ freq: 392, to: 350, dur: 0.5, type: 'sine', vol: 0.085, attack: 0.06, delay: 0.76 })
  }

  // --- Where things are. ---

  const centre = (): { x: number; y: number } => ({ x: L.px - Math.sin(L.th) * MID * L.s, y: L.py + Math.cos(L.th) * MID * L.s })
  const stickEnds = (): { ax: number; ay: number; bx: number; by: number } => {
    const a = lean + clamp(L.vx * 0.0003, -0.16, 0.16)
    const ax = L.px
    const ay = L.py - 9 * L.s
    return { ax, ay, bx: ax - Math.sin(a) * STICK_LEN * L.s, by: ay + Math.cos(a) * STICK_LEN * L.s }
  }
  // How brightly the lantern lights a point of the wood, 0..1.
  const lightAt = (wx: number, wy: number): number => {
    const c = centre()
    const d = dist(wx, wy, c.x, c.y)
    return smooth01(1 - (d - reach * 0.36) / (reach * 0.52))
  }
  // What the eye makes of that: things are solid until the very rim of the light.
  const seen = (level: number): number => smooth01(level * 2.6)
  const inBody = (x: number, y: number): boolean => {
    const lx = (x - L.px) / L.s
    const ly = (y - L.py) / L.s
    return Math.abs(lx) < R + 8 && ly > BAIL - 12 && ly < FOOT + 8
  }

  // --- The table's verbs. ---

  const cutAt = (x: number, y: number, fresh: boolean): boolean => {
    let hx: number
    let hy: number
    if (lan.rolled) {
      const p = lan.toSheet((x - L.px) / L.s, (y - L.py) / L.s)
      if (!p) return false
      hx = clamp(p.x, 46, SW - 46)
      hy = clamp(p.y, 42, SH - 42)
    } else {
      hx = clamp(x - SX, 42, SW - 42)
      hy = clamp(y - SY, 42, SH - 42)
    }
    for (const h of lan.holes) {
      if (dist(h.x, h.y, hx, hy) < HOLE_GAP) {
        // Too close to a window already there: the scissors close on air.
        if (fresh) {
          sc.tx = x + 82
          sc.ty = y + 82
          sc.rotTo = -2.36
          sc.snip = 0
          sc.homeAt = stage.time + 1.3
          snipSound()
        }
        return false
      }
    }
    const hole: Hole = { x: hx, y: hy, kind, rot: kind === 'star' ? rnd(-0.32, 0.32) : kind === 'moon' ? rnd(-0.75, 0.1) : rnd(-0.8, 0.8) }
    lan.cut(hole)
    let px = SX + hx
    let py = SY + hy
    if (lan.rolled) {
      const f = lan.front(hole)
      px = L.px + f.x * L.s
      py = L.py + f.y * L.s
    }
    sc.tx = px + 82
    sc.ty = py + 82
    sc.rotTo = -2.36
    sc.snip = 0
    sc.homeAt = stage.time + 1.3
    snipSound()
    paperSound(0.045)
    // The piece flutters down to the table beside the paper and stays there.
    let toX: number
    let toY: number
    if (lan.rolled) {
      toX = L.px + (px < L.px ? -1 : 1) * rnd(R + 30, R + 110)
      toY = L.py + FOOT * L.s + rnd(-30, 60)
    } else if (hy > SH * 0.5) {
      toX = px + rnd(-50, 50)
      toY = SY + SH + rnd(22, 44)
    } else if (hx < SW / 2) {
      toX = SX - rnd(26, 92)
      toY = py + rnd(-10, 90)
    } else {
      toX = SX + SW + rnd(36, 84)
      toY = py + rnd(120, 220)
    }
    scraps.push({
      x: px,
      y: py,
      fromX: px,
      fromY: py,
      toX: clamp(toX, 40, W - 40),
      toY: clamp(toY, TABLE_Y + 34, H - 36),
      t: 0,
      rot: hole.rot,
      spin: rnd(-4, 4),
      flip: 0,
      rest: false,
      kind,
      fill: rgba(washAt(lan.variant, hx / SW, hy / SH)),
    })
    if (scraps.length > 36) scraps.shift()
    fx.burst(px, py, { count: 5, color: ['#fff3d6', '#f6d9a8'], speed: 70, life: 0.5, size: 3.5, gravity: 160, drag: 0.94 })
    return true
  }

  const finishRoll = (): void => {
    rollK = 1
    rollGoal = null
    lan.roll()
    L.px = SX + R
    L.py = SY - BAIL
    L.vx = 0
    L.th = 0
    L.om = 0
    L.s = 1
    L.restX = REST_X
    sc.homeAt = 0
    sfx.noise({ dur: 0.2, freq: 900, to: 2600, q: 0.7, vol: 0.09 })
    knock(0.6)
    stage.tween(0.5, (t) => (bail = t), ease.outBack)
    fx.burst(SX + R, SY + SH, { count: 6, color: ['#fff3d6', '#e8caa0'], speed: 90, life: 0.5, size: 4, gravity: 60, angle: -Math.PI / 2, spread: Math.PI, drag: 0.92 })
  }

  const dropCandle = (): void => {
    candle.state = 'drop'
    candle.t = 0
    candle.fromX = candle.x
    candle.fromY = candle.y
    drag = { kind: 'none' }
  }

  const lightCandle = (): void => {
    candle.lit = true
    match.lit = false
    match.burnt = true
    match.state = 'back'
    match.fromX = match.x
    match.fromY = match.y
    match.t = 0
    drag = { kind: 'none' }
    sfx.noise({ dur: 0.3, freq: 700, to: 320, filter: 'lowpass', vol: 0.07 })
    chime(-5, 0.07, 0.1)
    chime(-2, 0.06, 0.55)
  }

  const hookStick = (): void => {
    stick.fromAx = stick.ax
    stick.fromAy = stick.ay
    stick.fromBx = stick.bx
    stick.fromBy = stick.by
    stick.state = 'hooked'
    stick.k = 0
    stage.tween(0.28, (t) => (stick.k = t), ease.outCubic)
    tok(760)
    sfx.tone({ freq: 1700, dur: 0.04, type: 'sine', vol: 0.04, delay: 0.03 })
    L.om += 0.5
  }

  // Fade out, change the scene, fade back in.
  const pass = (color: string, out: number, change: () => void): void => {
    busy = true
    fadeColor = color
    drag = { kind: 'none' }
    L.held = false
    stage.tween(out, (t) => (fade = t), ease.inOutQuad, () => {
      change()
      stage.tween(1.1, (t) => (fade = 1 - t), ease.inOutQuad, () => (busy = false))
    })
  }

  const leave = (): void => {
    pass('#191320', 0.55, () => {
      scene = 'wood'
      resetWood()
      L.s = WOOD_S
      L.restX = 270
      L.px = 270
      L.py = groundY(270) - FOOT * WOOD_S + 4
      L.vx = 0
      L.th = 0
      L.om = 0.25
      light = 1
    })
  }

  const openDoor = (): void => {
    if (busy) return
    busy = true
    tok(300)
    sfx.tone({ freq: 150, to: 205, dur: 0.5, type: 'triangle', vol: 0.045, delay: 0.08, attack: 0.1 })
    stage.tween(0.9, (t) => (doorOpen = t), ease.inOutQuad, () => {
      pass('#f3c98a', 0.7, () => {
        day++
        scene = 'table'
        resetTable()
      })
    })
  }

  // --- Touch. ---

  const tableDown = (p: Pointer): void => {
    // The match on its box.
    if (match.state === 'box' && dist(p.x, p.y, MATCHBOX.x, MATCHBOX.y) < 76) {
      match.state = 'held'
      match.lit = false
      match.burnt = false
      match.x = p.x - 16
      match.y = p.y - 56
      drag = { kind: 'match', moved: 0 }
      tok(900)
      return
    }
    if (candle.state === 'table' && dist(p.x, p.y, candle.x, candle.y - 36) < 66) {
      candle.state = 'held'
      drag = { kind: 'candle', ox: candle.x - p.x, oy: candle.y - p.y }
      tok(360)
      return
    }
    if (stick.state === 'table' && segDist(p.x, p.y, stick.ax, stick.ay, stick.bx, stick.by) < 44) {
      stick.state = 'held'
      drag = { kind: 'stick', ox: stick.ax - p.x, oy: stick.ay - p.y }
      tok(540)
      return
    }
    if (lan.rolled && stick.state === 'hooked') {
      const e = stickEnds()
      const onBody = inBody(p.x, p.y)
      if (onBody || segDist(p.x, p.y, e.ax, e.ay, e.bx, e.by) < 48 || dist(p.x, p.y, L.px, L.py + BAIL * 0.5) < 80) {
        L.held = true
        L.glide = false
        L.offX = L.px - p.x
        L.offY = L.py - p.y
        drag = { kind: 'carry', onBody, moved: 0, x: p.x, y: p.y }
        return
      }
    }
    for (let i = 0; i < 3; i++) {
      if (Math.abs(p.x - CARD_X) < 60 && Math.abs(p.y - CARD_Y[i]!) < 53) {
        kind = KINDS[i]!
        cardPop[i]!.value = 0.86
        cardPop[i]!.kick(2)
        paperSound(0.07)
        tok(1100)
        return
      }
    }
    if (!lan.rolled) {
      if (p.x > SX - 12 && p.x < SX + SW + 26 && p.y > SY - 12 && p.y < SY + SH + 12) {
        const edge = SX + lerp(SW, 2 * R, rollK)
        if (p.x > edge - 72) {
          rollGoal = null
          drag = { kind: 'roll', grab: p.x - edge, moved: 0, x: p.x, y: p.y }
          paperSound(0.04)
          return
        }
        drag = { kind: 'cut' }
        cutAt(p.x, p.y, true)
        return
      }
    } else if (inBody(p.x, p.y)) {
      drag = { kind: 'cut' }
      cutAt(p.x, p.y, true)
      return
    }
    // Bare wood or wall: it knocks.
    const onTable = p.y > TABLE_Y
    knock(onTable ? 1 : 0.5)
    fx.ring(p.x, p.y, onTable ? 'rgba(255,236,200,0.5)' : 'rgba(255,246,226,0.4)', 22, 0.4)
    drag = { kind: 'none' }
  }

  const grabLantern = (p: Pointer): void => {
    const c = centre()
    const e = stickEnds()
    const near = dist(p.x + cam, p.y, c.x, c.y) < 150 || segDist(p.x + cam, p.y, e.ax, e.ay, e.bx, e.by) < 52
    L.glide = !near
    if (near) {
      L.offX = L.px - cam - p.x
      L.offY = L.py - p.y
    } else {
      // Touch anywhere and the light comes over, to hang a little above the finger.
      L.offX = 0
      L.offY = -(MID * L.s + 64)
    }
    L.held = true
    canHang = true
    drag = { kind: 'walk' }
  }

  const woodDown = (p: Pointer): void => {
    const wx = p.x + cam
    const d = HOME_DOOR
    const onDoor = wx > d.x - 16 && wx < d.x + d.w + 16 && p.y > d.y - 10 && p.y < groundY(wx) - 10
    if (hung) {
      drag = { kind: 'none' }
      const c = centre()
      if (onDoor) {
        // (Not in the same breath as arriving: the rest comes first.)
        if (stage.time - hungAt > 1.5) openDoor()
        else knock(0.9)
      } else if (dist(wx, p.y, c.x, c.y) < 150) {
        // The hung lantern swings on its hook. A real tug lifts it off again.
        L.om += (wx < c.x ? -1 : 1) * 0.9
        tok(820)
        drag = { kind: 'tug', x: p.x, y: p.y }
      } else {
        fx.ring(p.x, p.y, 'rgba(255,214,150,0.35)', 20, 0.5)
        sfx.noise({ dur: 0.08, freq: 1900, q: 0.7, vol: 0.025 })
      }
      return
    }
    // Whoever the light has found answers a touch.
    if (lightAt(OWL.x, OWL.y - 60) > 0.35 && dist(wx, p.y, OWL.x, OWL.y - 62) < 78) {
      owl.bob.kick(-3)
      if (stage.time - owl.lastHoot > 2.5) {
        owl.lastHoot = stage.time
        hoot()
      }
    }
    SHROOMS.forEach((m, i) => {
      const my = groundY(m.x) + m.dy
      if (lightAt(m.x, my - 40) > 0.3 && dist(wx, p.y, m.x, my - 40 * m.h) < 50) {
        shrooms[i]!.kick((wx < m.x ? 1 : -1) * 1.5)
        sfx.tone({ freq: 250 + i * 60, to: 190 + i * 40, dur: 0.12, type: 'sine', vol: 0.09 })
      }
    })
    if (lightAt(hog.x, groundY(hog.x) - 40) > 0.3 && dist(wx, p.y, hog.x, groundY(hog.x) - 40) < 70) {
      hog.sniff = 1
      hog.pause = Math.max(hog.pause, 1)
      rustle(0.035)
    }
    if (lightAt(fox.x, groundY(fox.x) - 50) > 0.3 && dist(wx, p.y, fox.x, groundY(fox.x) - 50) < 90) fox.ear = 1
    if (onDoor && wx - cam < W) knock(0.9)
    grabLantern(p)
  }

  // --- Update. ---

  const stepLantern = (dt: number, tx: number, ty: number, resting: boolean): void => {
    lean = damp(lean, L.held ? LEAN_HELD : LEAN_REST, L.held ? 7 : 4, dt)
    // Called over from far away it comes at a walk, not a snap.
    if (L.glide && Math.hypot(tx - L.px, ty - L.py) < 36) L.glide = false
    const k = 1 - Math.exp(-(L.held ? (L.glide ? 4.2 : 15) : 6.5) * dt)
    const nx = L.px + (tx - L.px) * k
    const nvx = (nx - L.px) / dt
    const ax = clamp((nvx - L.vx) / dt, -5200, 5200)
    L.vx = nvx
    L.px = nx
    L.py += (ty - L.py) * k
    const before = L.th
    L.om += (-9.5 * Math.sin(L.th) + (ax / (MID * L.s)) * Math.cos(L.th) * 0.5 - 0.85 * L.om) * dt
    if (resting) {
      L.om -= L.om * Math.min(1, 5 * dt)
      L.th -= L.th * Math.min(1, 4 * dt)
    }
    L.th = clamp(L.th + L.om * dt, -0.72, 0.72)
    // The tune follows the swing: one soft note each time it passes the middle.
    if (scene === 'wood' && before * L.th < 0 && Math.abs(L.om) > 0.26 && stage.time - lastNote > 0.42 && !busy) {
      lastNote = stage.time
      chime(TUNE[tuneI % TUNE.length]!, clamp(0.045 + Math.abs(L.om) * 0.035, 0.05, 0.09))
      tuneI++
    }
  }

  const updateTable = (dt: number): void => {
    for (const s of cardPop) s.update(dt)
    // Scissors glide to where they last cut and close twice. Once the paper
    // is a lantern they go back to lie on the table between cuts.
    if (lan.rolled && stage.time > sc.homeAt && drag.kind !== 'cut') {
      sc.tx = 300
      sc.ty = 764
      sc.rotTo = -0.42
    }
    sc.x = damp(sc.x, sc.tx, 18, dt)
    sc.y = damp(sc.y, sc.ty, 18, dt)
    sc.rot = damp(sc.rot, sc.rotTo, 14, dt)
    if (sc.snip < 1) {
      sc.snip = Math.min(1, sc.snip + dt / 0.26)
      sc.open = 0.08 + 0.46 * Math.abs(Math.cos(sc.snip * TAU))
    } else {
      sc.open = damp(sc.open, 0.5 + Math.sin(stage.time * 0.9) * 0.04, 6, dt)
    }
    for (const s of scraps) {
      if (s.rest) continue
      s.t = Math.min(1, s.t + dt / 0.85)
      const e = ease.inOutQuad(s.t)
      s.x = lerp(s.fromX, s.toX, e) + Math.sin(s.t * Math.PI * 3) * 9 * (1 - s.t)
      s.y = lerp(s.fromY, s.toY, e * e) - Math.sin(Math.min(1, s.t * 1.6) * Math.PI) * 54
      s.rot += s.spin * dt * (1 - s.t)
      s.flip += dt * 9
      if (s.t >= 1) {
        s.rest = true
        sfx.noise({ dur: 0.03, freq: 2400, q: 1, vol: 0.02 })
      }
    }
    if (rollGoal !== null && drag.kind !== 'roll') {
      rollK = damp(rollK, rollGoal, 11, dt)
      if (Math.abs(rollK - rollGoal) < 0.012) {
        if (rollGoal === 1) finishRoll()
        else {
          rollK = 0
          rollGoal = null
        }
      }
    }
    if (candle.state === 'drop') {
      candle.t = Math.min(1, candle.t + dt / 0.7)
      if (candle.t >= 1) {
        candle.state = 'in'
        tok(240)
        knock(0.5)
      }
    }
    if (match.state === 'back') {
      match.t = Math.min(1, match.t + dt / 0.45)
      if (match.t >= 1) {
        match.state = 'box'
        if (match.burnt) match.spent = Math.min(3, match.spent + 1)
        match.burnt = false
      }
    }
    dusk = damp(dusk, candle.lit ? 1 : 0, 0.55, dt)
    const inside = candle.state === 'in' || (candle.state === 'drop' && candle.t > 0.5)
    light = damp(light, candle.lit && inside ? 1 : 0, 3.5, dt)

    if (lan.rolled) {
      const p = activeId !== null ? stage.pointers.get(activeId) : undefined
      if (L.held && p) {
        stepLantern(dt, clamp(p.x + L.offX, 70, W - 40), clamp(p.y + L.offY, 14, 364), false)
        const c = centre()
        if (light > 0.6 && c.x > DOOR.x + 6 && c.y < TABLE_Y + 70 && !busy) leave()
      } else {
        L.held = false
        stepLantern(dt, L.restX, REST_PY, true)
      }
    }
  }

  const updateWood = (dt: number): void => {
    const p = activeId !== null ? stage.pointers.get(activeId) : undefined
    let speed = 0
    hungK = clamp(hungK + (hung ? dt / 1.4 : -dt / 0.5), 0, 1)
    if (!hung) reach = damp(reach, 325, 1.2, dt)
    if (hung) {
      cam = damp(cam, CAM_MAX, 1.6, dt)
      reach = damp(reach, 384, 1.2, dt)
      stepLantern(dt, HOOK.x, HOOK.y, false)
    } else if (L.held && p) {
      const sx = L.px - cam
      if (sx > 620) speed = remap(sx, 620, 940, 0, 150)
      else if (sx < 300) speed = -remap(sx, 300, 110, 0, 150)
      const next = clamp(cam + speed * dt, 0, CAM_MAX)
      speed = (next - cam) / dt
      cam = next
      const tx = clamp(p.x + L.offX + cam, 70, WORLD_W - 70)
      stepLantern(dt, tx, clamp(p.y + L.offY, 26, groundY(tx) - FOOT * L.s - 8), false)
      if (!canHang && dist(L.px, L.py, HOOK.x, HOOK.y) > 170) canHang = true
      // Generous: anywhere near the bracket, high or low, and it catches.
      if (canHang && Math.hypot(L.px - HOOK.x, (L.py - HOOK.y) * 0.5) < 88) {
        // Home: the lantern goes on its hook and the stick leans by the wall.
        const e = stickEnds()
        hung = true
        hungAt = stage.time
        L.held = false
        drag = { kind: 'none' }
        stick.fromAx = e.ax
        stick.fromAy = e.ay
        stick.fromBx = e.bx
        stick.fromBy = e.by
        stick.state = 'away'
        stick.k = 0
        stage.tween(0.9, (t) => (stick.k = t), ease.inOutCubic, () => tok(420))
        tok(700)
        sfx.tone({ freq: 1500, dur: 0.05, type: 'sine', vol: 0.045, delay: 0.03 })
        chime(-5, 0.07, 0.25)
        chime(-2, 0.06, 0.8)
        chime(0, 0.05, 1.4)
      }
    } else {
      L.held = false
      const restY = groundY(L.restX) - FOOT * L.s + 4
      stepLantern(dt, L.restX, restY, true)
      // Set down among the leaves.
      if (!settled && Math.abs(L.py - restY) < 3) {
        settled = true
        rustle(0.03)
      }
    }
    if (L.held) settled = false
    // Feet in the leaves, and the lantern swaying with each step.
    walked += Math.abs(speed) * dt
    if (walked > 118) {
      walked = 0
      stepFoot++
      sfx.noise({ dur: 0.11, freq: stepFoot % 2 === 0 ? 1700 : 2100, to: 1000, q: 0.6, vol: 0.04 })
      L.om += (stepFoot % 2 === 0 ? 1 : -1) * 0.5
    }

    const c = centre()
    // The owl wakes slowly in the light and drifts off again without it.
    const owlLit = lightAt(OWL.x, OWL.y - 60) > 0.3
    owl.wake = damp(owl.wake, owlLit ? 1 : 0, owlLit ? 1.5 : 0.45, dt)
    owl.bob.update(dt)
    if (!owl.awake && owl.wake > 0.6) {
      owl.awake = true
      if (stage.time - owl.lastHoot > 12) {
        owl.lastHoot = stage.time
        hoot()
      }
    }
    if (owl.wake < 0.15) owl.awake = false

    // The hedgehog uncurls, has a sniff, and trundles about its leaf pile.
    const hogLit = lightAt(hog.x, groundY(hog.x) - 40)
    if (hogLit > 0.35) hog.uncurl = damp(hog.uncurl, 1, 2.2, dt)
    else if (hogLit < 0.08) hog.uncurl = damp(hog.uncurl, 0, 1.1, dt)
    if (hog.uncurl > 0.15 && !hog.rustled) {
      hog.rustled = true
      rustle(0.05)
    }
    if (hog.uncurl < 0.05) hog.rustled = false
    hog.sniff = Math.max(0, hog.sniff - dt * 1.4)
    if (hog.uncurl > 0.92) {
      if (hog.pause > 0) {
        hog.pause -= dt
        if (hog.sniff <= 0 && hog.pause > 0.5 && hog.pause < 0.56) hog.sniff = 0.8
      } else {
        hog.x += hog.dir * 21 * dt
        hog.step += dt * 9
        if (hog.x > HOG.to || hog.x < HOG.from) {
          hog.x = clamp(hog.x, HOG.from, HOG.to)
          hog.dir = -hog.dir
          hog.pause = 1.6
        }
      }
    }

    // The fox watches until the light has found it, then keeps the lantern company.
    if (lightAt(fox.x, groundY(fox.x) - 56) > 0.4) fox.seen = true
    let goal = fox.x
    if (fox.seen) {
      if (c.x - fox.x > 215) goal = c.x - 150
      else if (fox.x - c.x > 215) goal = c.x + 150
      goal = clamp(goal, FOX.from, FOX.to)
    }
    const gap = goal - fox.x
    if (Math.abs(gap) > 5) {
      const v = Math.min(165, Math.abs(gap) * 2 + 24)
      fox.dir = gap > 0 ? 1 : -1
      fox.x += fox.dir * Math.min(v * dt, Math.abs(gap))
      fox.phase += v * dt * 0.058
      fox.walk = damp(fox.walk, 1, 10, dt)
    } else {
      fox.walk = damp(fox.walk, 0, 7, dt)
      if (fox.walk < 0.1 && Math.abs(c.x - fox.x) > 40) fox.dir = c.x > fox.x ? 1 : -1
    }
    fox.ear = Math.max(0, fox.ear - dt * 2.5)

    for (const s of shrooms) s.update(dt)
    for (const f of falling) {
      f.y += 27 * dt
      f.ph += dt
      if (f.y > groundY(f.x) + 20) {
        f.y = -30
        f.x = cam + Math.random() * W
      }
    }
  }

  // --- Draw. ---

  const drawLip = (g: G, edge: number, y: number, k: number): void => {
    // The sheet's free edge curls up off the table, asking to be rolled.
    const idle = stage.time - lastTouch
    const invite = lan.holes.length > 0 && idle > 6 ? Math.sin((idle - 6) * 1.1) ** 2 * 7 : 0
    const w = (19 + Math.sin(stage.time * 0.9) * 2.5 + invite) * (1 - k * 0.8)
    const shade = g.createLinearGradient(edge - w - 18, 0, edge - w, 0)
    shade.addColorStop(0, 'rgba(70,30,20,0)')
    shade.addColorStop(1, 'rgba(70,30,20,0.3)')
    g.fillStyle = shade
    g.fillRect(edge - w - 18, y + 6, 18, SH - 12)
    const lip = g.createLinearGradient(edge - w, 0, edge + 3, 0)
    lip.addColorStop(0, '#e2d2b2')
    lip.addColorStop(0.45, '#fbf4e2')
    lip.addColorStop(1, '#d6c19a')
    g.fillStyle = lip
    g.beginPath()
    g.roundRect(edge - w, y - 2, w + 3, SH + 4, w / 2)
    g.fill()
  }

  const drawTable = (g: G): void => {
    const next = warm.pop()
    if (next) g.drawImage(next, 0, 0, 2, 2)
    g.drawImage(roomBg, 0, 0, W, H)
    drawDoorLanterns(g, stage.time)
    // Dust in the sunbeam, while there is sun.
    if (dusk < 0.9) {
      g.fillStyle = '#fff7de'
      for (let i = 0; i < 12; i++) {
        const x = 120 + ((i * 53) % 320) + Math.sin(stage.time * 0.21 + i) * 22
        const y = 110 + ((i * 97) % 250) + Math.cos(stage.time * 0.16 + i * 2) * 18
        g.globalAlpha = (0.22 + 0.2 * Math.sin(stage.time * 0.5 + i * 1.3)) * (1 - dusk)
        g.beginPath()
        g.arc(x, y, 1.6 + (i % 3) * 0.5, 0, TAU)
        g.fill()
      }
      g.globalAlpha = 1
    }
    for (let i = 0; i < 3; i++) {
      const k = KINDS[i]!
      drawCard(g, CARD_X, CARD_Y[i]!, k, k === kind ? 1 : 0, cardPop[i]!.value, [-0.05, 0.04, -0.03][i]!)
    }
    // The sheet, flat or bending.
    if (!lan.rolled) {
      const edge = SX + lerp(SW, 2 * R, rollK)
      g.fillStyle = 'rgba(60,30,10,0.24)'
      g.beginPath()
      g.roundRect(SX + 3, SY + 6 + rollK * 14, edge - SX + 2, SH + 2, 6)
      g.fill()
      if (rollK < 0.004) lan.drawFlat(g, SX, SY)
      else lan.drawMorph(g, SX, SY, rollK)
      drawLip(g, edge, SY, rollK)
    }
    for (const s of scraps) drawScrap(g, s.x, s.y, s.kind, s.rot, s.rest ? 1 : 0.55 + 0.45 * Math.cos(s.flip), s.fill, s.rest ? 0 : 30 * Math.sin(s.t * Math.PI))
    // Spent matches, the box and its match.
    for (let i = 0; i < match.spent; i++) drawMatch(g, MATCHBOX.x - 50 + i * 15, MATCHBOX.y + 54 + (i % 2) * 7, 0.2 + i * 0.3, 2, flick, true)
    drawMatchbox(g, MATCHBOX.x, MATCHBOX.y)
    if (match.state === 'box') drawMatch(g, MATCHBOX.x - 30, MATCHBOX.y - 10, 0.06, 0, flick, true)
    if (candle.state === 'table') {
      g.fillStyle = 'rgba(60,30,10,0.22)'
      g.beginPath()
      g.ellipse(candle.x + 5, candle.y + 1, 34, 9, 0, 0, TAU)
      g.fill()
      drawCandle(g, candle.x, candle.y, 1.25, candle.lit ? 1 : 0, flick)
    }
    if (stick.state === 'table') drawStick(g, stick.ax, stick.ay, stick.bx, stick.by, 11, 5)
    const visiting = lan.rolled && (stage.time <= sc.homeAt || sc.y < 700)
    if (!visiting) drawScissors(g, sc.x, sc.y, sc.rot, sc.open, sc.snip < 1 ? 1 : 0)

    // Dusk comes into the room when the candle is lit, and leaves a pool of
    // light round the flame.
    const c = centre()
    const inside = candle.state === 'in' || (candle.state === 'drop' && candle.t > 0.5)
    const lx = inside ? c.x : candle.x
    const ly = inside ? c.y : candle.y - 80
    if (dusk > 0.01) {
      const r = ((inside ? 380 : 250) * (0.97 + 0.03 * flick)) / VEIL_HOLE
      g.globalAlpha = dusk
      g.drawImage(veil, lx - r, ly - r, r * 2, r * 2)
      // The doorway stays the brightest thing in the room besides the flame.
      g.globalAlpha = 0.42 * dusk
      g.drawImage(roomBg, DOOR.x * dpr, DOOR.y * dpr, DOOR.w * dpr, (DOOR.h - 4) * dpr, DOOR.x, DOOR.y, DOOR.w, DOOR.h - 4)
      g.globalAlpha = 1
      drawDoorLanterns(g, stage.time)
    }

    if (lan.rolled) {
      // Its shadow on the table, when it is standing there.
      const lift = clamp((REST_PY - L.py) / 120, 0, 1)
      g.fillStyle = `rgba(50,24,10,${0.26 * (1 - lift)})`
      g.beginPath()
      g.ellipse(L.px + 8, REST_PY + FOOT - 6, R * 1.06, 20, 0, 0, TAU)
      g.fill()
      if (stick.state === 'hooked') {
        const e = stickEnds()
        const k = stick.k
        drawStick(g, lerp(stick.fromAx, e.ax, k), lerp(stick.fromAy, e.ay, k), lerp(stick.fromBx, e.bx, k), lerp(stick.fromBy, e.by, k), 11, 0)
      }
      const drop = candle.state === 'in' ? 1 : candle.state === 'drop' && candle.t > 0.5 ? ease.outBounce((candle.t - 0.5) * 2) : -1
      lan.draw(g, L.px, L.py, L.s, L.th, light, flick, drop, bail)
    }
    if (visiting) drawScissors(g, sc.x, sc.y, sc.rot, sc.open, 1)
    // Things in the hand go on top.
    if (stick.state === 'held') drawStick(g, stick.ax, stick.ay, stick.bx, stick.by, 11, 12)
    if (candle.state === 'held') {
      g.fillStyle = 'rgba(60,30,10,0.16)'
      g.beginPath()
      g.ellipse(candle.x + 10, candle.y + 16, 34, 9, 0, 0, TAU)
      g.fill()
      drawCandle(g, candle.x, candle.y, 1.32, candle.lit ? 1 : 0, flick)
    } else if (candle.state === 'drop' && candle.t <= 0.5) {
      // Lifted in an arc to just above the open top.
      const t = ease.inOutQuad(candle.t * 2)
      const tx = L.px
      const ty = L.py + BAIL + 14
      const x = lerp(candle.fromX, tx, t)
      const y = lerp(candle.fromY, ty, t) - Math.sin(t * Math.PI) * 60
      drawCandle(g, x, y, 1.3, candle.lit ? 1 : 0, flick)
    }
    if (match.state === 'held') drawMatch(g, match.x, match.y, 1.28, match.lit ? 1 : 0, flick, false)
    else if (match.state === 'back') {
      const t = ease.inOutQuad(match.t)
      const tx = match.burnt ? MATCHBOX.x - 50 + match.spent * 15 : MATCHBOX.x - 30
      const ty = match.burnt ? MATCHBOX.y + 54 : MATCHBOX.y - 10
      drawMatch(g, lerp(match.fromX, tx, t), lerp(match.fromY, ty, t), lerp(1.28, match.burnt ? 0.3 : 0.06, t), match.burnt ? 2 : 0, flick, false)
    }
    // Warm light spilling from the flame.
    if (candle.lit) {
      const a = inside ? light : 0.7
      const r = inside ? 420 : 170
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = (0.42 + 0.1 * flick) * a * (0.5 + 0.5 * dusk)
      g.drawImage(halo, lx - r, ly - r, r * 2, r * 2)
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
    }
    if (match.state === 'held' && match.lit) {
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = 0.4 + 0.1 * flick
      g.drawImage(halo, match.x - 80, match.y - 96, 160, 160)
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
    }

    // The next thing glints, slowly, if nothing has been touched for a while.
    const idle = stage.time - lastTouch
    if (idle > 6 && drag.kind === 'none' && !busy) {
      const a = Math.max(0, Math.sin((idle - 6) * 1.15)) ** 3 * 0.85
      if (!lan.rolled) {
        if (lan.holes.length === 0) drawGlint(g, sc.x + Math.cos(sc.rot) * 62, sc.y + Math.sin(sc.rot) * 62, 15, a)
      } else if (candle.state === 'table') drawGlint(g, candle.x - 8, candle.y - 58, 15, a)
      else if (stick.state === 'table') drawGlint(g, stick.ax + 6, stick.ay - 4, 15, a)
      else if (!candle.lit) {
        if (match.state === 'box') drawGlint(g, MATCHBOX.x + 22, MATCHBOX.y - 22, 15, a)
      } else if (light > 0.9) drawGlint(g, DOOR.x + 138, DOOR.y + 322, 13, a * 0.8)
    }
  }

  const drawWood = (g: G): void => {
    const camI = Math.round(cam)
    const t = stage.time
    // The lantern's circle first: the candle-lit wood, shaded off to the
    // night's colour at its rim.
    const c = centre()
    const csx = c.x - camI
    const r = reach * (0.985 + 0.015 * flick)
    g.save()
    g.beginPath()
    g.arc(csx, c.y, r, 0, TAU)
    g.clip()
    drawTiles(g, wood.lit, camI, csx - r, csx + r)
    g.restore()
    // (Shaded outside the clip, so the circle's soft edge is shaded like the rest.)
    g.globalCompositeOperation = 'source-atop'
    g.drawImage(shade, csx - r, c.y - r, r * 2, r * 2)
    // Then everything the candle does not reach goes in behind it, nearest
    // first: the dusk wood, the far lanterns, the hills, the stars, the sky.
    g.globalCompositeOperation = 'destination-over'
    drawTiles(g, wood.night, camI, 0, W)
    const hx = -cam * HILL_PARALLAX
    for (let grp = 0; grp < 3; grp++) {
      const n = 5 + grp
      for (let i = 0; i < n; i++) {
        const x = 330 + grp * 430 + i * 21 + t * 2 + Math.sin(i * 12.9 + grp) * 3
        const sx = x + hx
        if (sx < -20 || sx > W + 20) continue
        drawFarLantern(g, sx, HILL_Y + hillY(x) - 6 + Math.sin(t * 1.6 + i * 1.9 + grp) * 1.6, 1 - (i % 2) * 0.12)
      }
    }
    g.drawImage(wood.hills, hx, HILL_Y)
    const late = cam / CAM_MAX
    g.fillStyle = '#fff6de'
    for (let i = 0; i < 7; i++) {
      g.globalAlpha = (0.25 + 0.3 * late) * (0.5 + 0.5 * Math.sin(t * (0.5 + i * 0.13) + i * 2.1))
      g.beginPath()
      g.arc(90 + ((i * 173) % 1010), 40 + ((i * 89) % 210), 1.5, 0, TAU)
      g.fill()
    }
    g.globalAlpha = 1
    // The last light goes as the walk goes on.
    if (late > 0.02) {
      g.fillStyle = `rgba(24,24,66,${0.5 * late})`
      g.fillRect(0, 0, W, 640)
    }
    g.drawImage(wood.sky, 0, 0)
    g.globalCompositeOperation = 'source-over'
    const homeOn = camI + W > HOUSE_X
    if (homeOn) {
      g.save()
      g.translate(-camI, 0)
      paintWindowGlass(g)
      paintDoorPane(g)
      g.restore()
    }

    // Whoever the light finds. Each fades in with the light that reaches it.
    g.save()
    g.translate(-camI, 0)
    SHROOMS.forEach((m, i) => {
      const my = groundY(m.x) + m.dy
      const a = seen(lightAt(m.x, my - 30))
      if (a < 0.02) return
      g.globalAlpha = a
      drawMushroom(g, m.x, my, m.h, shrooms[i]!.value * 0.16)
    })
    const owlA = seen(lightAt(OWL.x, OWL.y - 60))
    if (owlA > 0.02) {
      g.globalAlpha = owlA
      const blink = owl.wake > 0.9 && (t + 1.3) % 4.3 < 0.13 ? 1 : 0
      drawOwl(g, OWL.x, OWL.y, owl.wake, clamp((c.x - OWL.x) / 220, -1, 1) * owl.wake, Math.sin(t * 1.4), blink, owl.bob.value)
    }
    const hogY = groundY(hog.x) + HOG.dy
    const hogA = seen(lightAt(hog.x, hogY - 24))
    if (hogA > 0.02) {
      g.globalAlpha = hogA
      drawHedgehog(g, hog.x, hogY, hog.uncurl, hog.dir, hog.step, hog.sniff)
    }
    const foxY = groundY(fox.x) + FOX.dy
    const foxA = seen(lightAt(fox.x, foxY - 56))
    if (foxA > 0.02) {
      const blink = (t + 0.4) % 3.7 < 0.12 ? 1 : 0
      // Getting up and sitting down: one soft squash between the two poses.
      const bump = Math.sin(Math.PI * clamp(fox.walk, 0, 1))
      g.globalAlpha = foxA
      g.save()
      g.translate(fox.x, foxY)
      g.scale(1 + 0.08 * bump, 1 - 0.13 * bump)
      if (fox.walk < 0.5) drawFoxSit(g, 0, 0, fox.dir, clamp((c.y - (foxY - 110)) / 400, -0.6, 0.3), blink, fox.ear, Math.sin(t * 1.7))
      else drawFoxWalk(g, 0, 0, fox.dir, fox.phase, blink)
      g.restore()
    }
    if (homeOn) {
      const catY = groundY(4500) + CAT.dy
      const catA = seen(lightAt(CAT.x, catY - 14))
      if (catA > 0.02) {
        g.globalAlpha = catA
        drawCat(g, CAT.x, catY, Math.sin(t * 1.25))
      }
    }
    for (const f of falling) {
      const x = f.x + Math.sin(f.ph * 0.9) * 26
      const a = lightAt(x, f.y)
      if (a < 0.05) continue
      g.globalAlpha = a * 0.95
      g.save()
      g.translate(x, f.y)
      g.rotate(Math.sin(f.ph * 0.9 + 1) * 0.9)
      g.fillStyle = FALL[f.c]!
      g.beginPath()
      g.moveTo(-8, 0)
      g.quadraticCurveTo(0, -5.5, 8, 0)
      g.quadraticCurveTo(0, 5.5, -8, 0)
      g.fill()
      g.restore()
    }
    g.globalAlpha = 1

    // At home: the windows the child cut, thrown large on the wall.
    if (hungK > 0.01) {
      const base = groundY(4500) - 30
      g.save()
      g.beginPath()
      g.rect(HOUSE_X + 18, 150, WORLD_W - HOUSE_X, base - 150)
      g.clip()
      g.globalCompositeOperation = 'lighter'
      lan.holes.forEach((hole, i) => {
        const f = lan.front(hole)
        const side = Math.abs(f.x) < 6 ? (i % 2 === 0 ? -1 : 1) : Math.sign(f.x)
        const sway = L.th * 60
        const x = c.x + side * (96 + Math.abs(f.x) * L.s * 1.15) - sway * (0.6 + Math.abs(f.x) / 200)
        const y = c.y + (f.y - MID) * L.s * 1.95
        g.save()
        g.translate(x, y)
        g.rotate(hole.rot - L.th * 0.5)
        g.scale(lerp(1, f.squeeze / 0.8, 0.4), 1)
        for (const [k, a] of [[1.12, 0.1], [0.96, 0.17], [0.8, 0.14]] as const) {
          shapePath(g, hole.kind, HOLE_R * L.s * 2.25 * k)
          g.fillStyle = `rgba(255,206,120,${a * hungK * (0.82 + 0.18 * flick)})`
          g.fill()
        }
        g.restore()
      })
      g.restore()
    }
    g.restore()

    g.globalCompositeOperation = 'lighter'
    g.globalAlpha = 0.5 + 0.1 * flick
    g.drawImage(halo, csx - 280, c.y - 280, 560, 560)
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1

    // The stick and the lantern.
    g.save()
    g.translate(-camI, 0)
    const rest = groundY(STICK_REST.bx) + STICK_REST.dy
    if (stick.state === 'away') {
      const k = stick.k
      g.globalAlpha = 0.55 + 0.45 * Math.max(1 - k, lightAt(STICK_REST.bx, rest - 100))
      drawStick(g, lerp(stick.fromAx, STICK_REST.ax, k), lerp(stick.fromAy, STICK_REST.ay, k), lerp(stick.fromBx, STICK_REST.bx, k), lerp(stick.fromBy, rest, k), 11 * WOOD_S + 1, 0)
      g.globalAlpha = 1
    } else {
      const e = stickEnds()
      const k = stick.k
      drawStick(g, lerp(stick.fromAx, e.ax, k), lerp(stick.fromAy, e.ay, k), lerp(stick.fromBx, e.bx, k), lerp(stick.fromBy, e.by, k), 11 * WOOD_S + 1, 0)
    }
    lan.draw(g, L.px, L.py, L.s, L.th, 1, flick, 1, 1)
    // Moths come to the light.
    const moths = hung ? 3 : Math.min(3, Math.floor(cam / 520))
    for (let i = 0; i < moths; i++) {
      const a = t * (0.9 + i * 0.37) + i * 2.1
      const rr = 78 + 26 * Math.sin(t * 0.6 + i * 1.7)
      const mx = c.x + Math.cos(a) * rr * 1.2
      const my = c.y + Math.sin(a * 1.3) * rr * 0.8 - 12
      drawMoth(g, mx, my, t * 22 + i, Math.cos(a) * 0.5)
    }
    // The door opening on the lamplit room.
    if (doorOpen > 0.01) {
      const d = HOME_DOOR
      const bottom = groundY(4500) - 28
      g.save()
      g.beginPath()
      g.moveTo(d.x, bottom)
      g.lineTo(d.x, d.y + 60)
      g.quadraticCurveTo(d.x, d.y, d.x + d.w / 2, d.y)
      g.quadraticCurveTo(d.x + d.w, d.y, d.x + d.w, d.y + 60)
      g.lineTo(d.x + d.w, bottom)
      g.closePath()
      g.clip()
      const open = ease.inOutQuad(doorOpen)
      const leaf = d.w * (1 - 0.86 * open)
      const warm = g.createLinearGradient(0, d.y, 0, bottom)
      warm.addColorStop(0, '#ffe7ae')
      warm.addColorStop(1, '#f1b25e')
      g.fillStyle = warm
      g.fillRect(d.x + leaf, d.y, d.w - leaf, bottom - d.y)
      // A glimpse of the room inside: the table, with a fresh painted sheet on it.
      const ix = d.x + Math.max(leaf + 6, 34)
      g.fillStyle = 'rgba(170,112,60,0.55)'
      g.fillRect(d.x + leaf, bottom - 34, d.w - leaf, 34)
      g.fillStyle = '#9a653a'
      g.fillRect(ix + 8, bottom - 92, 7, 76)
      g.fillRect(ix + 92, bottom - 92, 7, 76)
      g.fillStyle = '#b97f49'
      g.beginPath()
      g.roundRect(ix, bottom - 100, 108, 11, 3)
      g.fill()
      const sheetG = g.createLinearGradient(ix + 22, 0, ix + 86, 0)
      sheetG.addColorStop(0, '#8a55a4')
      sheetG.addColorStop(0.5, '#ec7a3e')
      sheetG.addColorStop(1, '#f8cc55')
      g.fillStyle = sheetG
      g.beginPath()
      g.moveTo(ix + 26, bottom - 104)
      g.lineTo(ix + 88, bottom - 104)
      g.lineTo(ix + 82, bottom - 98)
      g.lineTo(ix + 20, bottom - 98)
      g.closePath()
      g.fill()
      g.fillStyle = `rgba(60,36,20,${0.35 * open})`
      g.fillRect(d.x, d.y, leaf, bottom - d.y)
      g.restore()
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = 0.5 * open
      g.drawImage(halo, d.x + d.w / 2 - 240, d.y - 60, 480, 480)
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
    }
    g.restore()
  }

  return {
    update(dt) {
      // A candle's flicker: it drifts between gentle levels, never strobes.
      if (stage.time > flickAt) {
        flickAt = stage.time + rnd(0.08, 0.3)
        flickTo = rnd(0.72, 1)
      }
      flick = damp(flick, flickTo, 9, dt)
      if (activeId !== null && !stage.pointers.has(activeId)) {
        activeId = null
        drag = { kind: 'none' }
        L.held = false
      }
      if (scene === 'table') updateTable(dt)
      else updateWood(dt)
    },
    draw(g) {
      if (scene === 'table') drawTable(g)
      else drawWood(g)
      if (fade > 0.004) {
        g.globalAlpha = fade
        g.fillStyle = fadeColor
        g.fillRect(0, 0, W, H)
        g.globalAlpha = 1
      }
    },
    down(p: Pointer) {
      lastTouch = stage.time
      if (busy || activeId !== null) return
      activeId = p.id
      if (scene === 'table') tableDown(p)
      else woodDown(p)
    },
    move(p: Pointer) {
      if (p.id !== activeId || busy) return
      lastTouch = stage.time
      if (scene !== 'table') {
        if (drag.kind === 'tug' && hung && dist(p.x, p.y, drag.x, drag.y) > 64) {
          // Lifted off the hook, back onto the stick: the walk can go on.
          hung = false
          canHang = false
          stick.state = 'hooked'
          stick.fromAx = STICK_REST.ax
          stick.fromAy = STICK_REST.ay
          stick.fromBx = STICK_REST.bx
          stick.fromBy = groundY(STICK_REST.bx) + STICK_REST.dy
          stick.k = 0
          stage.tween(0.35, (t) => (stick.k = t), ease.outCubic)
          L.held = true
          L.glide = false
          L.offX = L.px - cam - p.x
          L.offY = L.py - p.y
          drag = { kind: 'walk' }
          tok(540)
        }
        return
      }
      if (drag.kind === 'cut') {
        const onPaper = lan.rolled ? inBody(p.x, p.y) : p.x > SX && p.x < SX + SW && p.y > SY && p.y < SY + SH
        if (onPaper) cutAt(p.x, p.y, false)
      } else if (drag.kind === 'roll') {
        drag.moved += Math.hypot(p.dx, p.dy)
        rollK = clamp((SX + SW - (p.x - drag.grab)) / (SW - 2 * R), 0, 1)
        if (stage.time - lastRustle > 0.1 && Math.abs(p.dx) > 1.5) {
          lastRustle = stage.time
          paperSound(0.035)
        }
        if (rollK >= 1) {
          drag = { kind: 'none' }
          finishRoll()
        }
      } else if (drag.kind === 'candle') {
        candle.x = clamp(p.x + drag.ox, 40, W - 40)
        candle.y = clamp(p.y + drag.oy, 120, H - 30)
        if (lan.rolled && dist(candle.x, candle.y - 40, L.px, L.py + BAIL) < 74) dropCandle()
      } else if (drag.kind === 'stick') {
        const nx = p.x + drag.ox
        const ny = p.y + drag.oy
        stick.bx += nx - stick.ax
        stick.by += ny - stick.ay
        stick.ax = nx
        stick.ay = ny
        if (lan.rolled && (dist(stick.ax, stick.ay, L.px, L.py) < 112 || segDist(L.px, L.py, stick.ax, stick.ay, stick.bx, stick.by) < 58)) {
          hookStick()
          L.held = true
          L.glide = false
          L.offX = L.px - p.x
          L.offY = L.py - p.y
          drag = { kind: 'carry', onBody: false, moved: 99, x: p.x, y: p.y }
        }
      } else if (drag.kind === 'match') {
        drag.moved += Math.hypot(p.dx, p.dy)
        match.x = p.x - 16
        match.y = p.y - 56
        if (!match.lit && drag.moved > 34) {
          // Struck along the box as it leaves.
          match.lit = true
          sfx.noise({ dur: 0.22, freq: 3200, to: 6200, filter: 'highpass', vol: 0.09 })
          sfx.noise({ dur: 0.3, freq: 640, filter: 'lowpass', vol: 0.06, delay: 0.1 })
          fx.burst(match.x, match.y, { count: 5, color: ['#ffd98a', '#fff2c4'], speed: 110, life: 0.35, size: 3.5, gravity: 120 })
        }
        if (match.lit && !candle.lit) {
          if (candle.state === 'in' && (dist(match.x, match.y, L.px, L.py + BAIL * L.s) < 104 || inBody(match.x, match.y))) lightCandle()
          else if (candle.state === 'table' && dist(match.x, match.y, candle.x, candle.y - 76) < 62) lightCandle()
        }
      } else if (drag.kind === 'carry') {
        drag.moved += Math.hypot(p.dx, p.dy)
      }
    },
    up(p: Pointer) {
      if (p.id !== activeId) return
      activeId = null
      const was = drag
      drag = { kind: 'none' }
      L.held = false
      if (busy) return
      if (scene === 'wood') {
        if (!hung) L.restX = clamp(L.px, 70, WORLD_W - 70)
        return
      }
      if (was.kind === 'roll') {
        if (was.moved < 12 && rollK < 0.05) {
          // A tap near the edge is still a cut.
          rollK = 0
          cutAt(was.x, was.y, true)
        } else if (rollK > 0.5) rollGoal = 1
        else rollGoal = 0
      } else if (was.kind === 'candle') {
        if (lan.rolled && Math.abs(candle.x - L.px) < R + 56 && candle.y > L.py && candle.y < L.py + FOOT + 80) {
          dropCandle()
        } else {
          candle.state = 'table'
          candle.x = clamp(candle.x, 50, W - 50)
          candle.y = clamp(candle.y, TABLE_Y + 66, H - 56)
          tok(300)
        }
      } else if (was.kind === 'stick') {
        stick.state = 'table'
        // Laid back down on the table, wherever it was let go.
        const dy = clamp(Math.max(stick.ay, stick.by), TABLE_Y + 40, H - 52) - Math.max(stick.ay, stick.by)
        const dx = clamp(Math.min(stick.ax, stick.bx), 20, W - 20 - Math.abs(stick.bx - stick.ax)) - Math.min(stick.ax, stick.bx)
        stick.ax += dx
        stick.bx += dx
        stick.ay += dy
        stick.by += dy
        tok(480)
      } else if (was.kind === 'match') {
        if (match.lit) {
          // Put down, it goes out with a wisp of smoke.
          fx.burst(match.x, match.y - 8, { count: 4, color: 'rgba(200,196,190,0.5)', speed: 30, life: 0.9, size: 7, gravity: -70, angle: -Math.PI / 2, spread: 0.8, drag: 0.96 })
          sfx.noise({ dur: 0.12, freq: 2400, to: 900, q: 0.6, vol: 0.03 })
          match.burnt = true
        }
        match.lit = false
        match.state = 'back'
        match.fromX = match.x
        match.fromY = match.y
        match.t = 0
      } else if (was.kind === 'carry') {
        L.restX = clamp(L.px, 250, 800)
        if (was.moved > 12) knock(0.5)
        else if (!(was.onBody && cutAt(was.x, was.y, true))) {
          // A touch that neither cuts nor carries: the paper rustles and sways.
          paperSound(0.04)
          L.om += 0.25
        }
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'lantern-walk',
    name: 'Lantern Walk',
    emoji: '🏮',
    ages: [3, 7],
    set: 'gentle',
    pitch: 'Snip windows in a painted sheet, roll it into a lantern, light it, and carry it through the dusky wood to hang by the door at home.',
    howTo:
      'Touch the paper to snip a window (the cards choose star, moon or leaf). Drag its curled edge across to roll it. Put the candle in, bring the stick to the handle, drag the match to the wick, then carry the lantern out of the doorway. In the wood, touch and hold where the light should go; held toward the side, the walk goes on. Hang it on the bracket at home. Opening the door begins another day.',
    basedOn: 'The Waldorf lantern festival at Martinmas: a paper lantern made by hand from a wet-on-wet painting, and the lantern walk at dusk with its pentatonic songs.',
    whyFun: 'The scissors snip under the finger and a paper star pops out; later the swinging lantern is the only light, it plays a slow tune as it sways, and the same stars glow on the wall at home.',
  },
  create,
}
