// Wool Picture: a Waldorf fleece picture. Draw a tuft of carded wool out of a
// bowl and lay it on a sheet of felt, where it clings: a green mound is a
// hill, white wisps are clouds, a yellow tuft teased round is a sun. What is
// laid comes a little alive in a woolly way, and the small felt figures from
// the dish live in it. Hanging the frame on its peg brings the evening; a
// fresh frame from the wall begins another.
//
// The whole room is needle-felt (see felt.ts and room.ts). The laid wool is
// kept as patches on their own canvases (wool.ts), so nothing is redrawn
// strand by strand in a frame.

import { clamp, damp, dist, ease, lerp, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { TAU, gauss, makeCanvas, put, res, rng, setRes } from './felt.ts'
import type { G } from './felt.ts'
import { FIG, drawFig, makeFigs, makeFolk } from './folk.ts'
import type { Fig } from './folk.ts'
import { BOWLS, DISH, EDGE_Y, FRAME, FRAME_PAD, FRESH, HEAP, HUNG_AT, PEG, SINK, SLOTS, TABLE_AT, THUMB, YARN_UP, drawYarn, paintFrame, paintGlow, paintHeap, paintLeaves, paintLight, paintTable, paintWall } from './room.ts'
import { DYES, FH, FW, brushNap, classify, compact, drawWool, hasWool, lay, makeWool, makeWoolKit, onGrass, smudge, sunSpots, tallest, updateWool } from './wool.ts'
import type { Patch, Wool } from './wool.ts'

// The felt sheet's corner while the frame lies on the table.
const FX0 = TABLE_AT.x - FW / 2
const FY0 = TABLE_AT.y - FH / 2
const FRAME_TOP = TABLE_AT.y - FRAME.h / 2
const APEX = FRAME.h / 2 + YARN_UP
const SPACING = 9
const DISH_GAP = 92

function smooth(a: number, b: number, v: number): number {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

interface Tuft {
  dye: number
  // 1 is a fresh tuft; it thins as it is laid.
  amount: number
  state: 'pull' | 'held' | 'rest'
  x: number
  y: number
  rot: number
  pop: Spring
}

type Mode = 'pull' | 'tuft' | 'stroke' | 'fig' | 'frame' | 'hung' | 'none'

interface Touch {
  id: number
  mode: Mode
  x: number
  y: number
  // The last point wool was laid at, in felt coordinates.
  sx: number
  sy: number
  startY: number
  patch: Patch | null
  fig: Fig | null
  onFelt: boolean
  movedAt: number
  puffs: number
  puffIn: number
  travel: number
  moved: number
  // A tap on the bowl whose fresh tuft is waiting lays it back in.
  putBack: boolean
}

interface Bowl {
  press: Spring
  level: number
}

interface Mote {
  x: number
  y: number
  ph: number
  s: number
}

function create(stage: Stage): Game {
  const { sfx } = stage
  // Wool is soft: on a sharp screen the cached art is kept at one and a half
  // pixels per point, not two, which more than halves the memory it holds.
  setRes((globalThis.devicePixelRatio || 1) >= 1.5 ? 1.5 : 1)
  const art = rng(20260930)
  const kit = makeWoolKit(res())
  const wall = paintWall(art)
  const table = paintTable(art)
  const frame = paintFrame(art)
  const heaps = kit.fleeces.map((f) => paintHeap(f, art))
  const dayLight = paintLight([255, 247, 222], 0.55)
  const eveLight = paintLight([255, 186, 112], 0.6)
  const leaves = paintLeaves()
  const glow = paintGlow([255, 206, 128])
  const folk = makeFolk()
  const tableH = table.height / res()

  let wool: Wool = makeWool()
  let figs: Fig[] = makeFigs()
  // 0: the frame lies on the table. 1: it hangs on the wall, and it is evening.
  let hang = 0
  let hangTo: number | null = null
  let lightT = 0
  // -1, or 0..1 while a fresh frame changes places with the finished picture.
  let swap = -1
  let freshIn = 1
  let thumbs: HTMLCanvasElement[] = []
  let leaving: HTMLCanvasElement | null = null
  const swing = spring(0, 26, 2.4)
  const freshSwing = spring(0, 30, 2.2)
  const thumbSwing = [spring(0, 30, 2.2), spring(0, 30, 2.2)]
  // A tuft of undyed fleece is already drawn out and waiting, so the very
  // first touch on the felt lays wool.
  const waiting = (): Tuft => ({ dye: 0, amount: 1, state: 'rest', x: 0, y: 0, rot: -Math.PI / 2, pop: spring(1, 150, 10) })
  let tuft: Tuft | null = waiting()
  let touch: Touch | null = null
  let lastTouch = 0
  let lastBowl = -1
  let lastBrush = -1
  let pegLook = 0
  const bowls: Bowl[] = BOWLS.map(() => ({ press: spring(0, 170, 9), level: 1 }))
  const motes: Mote[] = []
  for (let i = 0; i < 8; i++) motes.push({ x: 60 + stage.rand() * 520, y: 20 + stage.rand() * 420, ph: stage.rand() * TAU, s: 0.16 + stage.rand() * 0.16 })
  const flies: Mote[] = []
  for (let i = 0; i < 7; i++) flies.push({ x: 60 + stage.rand() * (FW - 120), y: FH * (0.42 + stage.rand() * 0.5), ph: stage.rand() * TAU, s: 0.1 + stage.rand() * 0.08 })

  // ---- sound: the soft sounds of wool, a felt pat, a quiet lyre -------------
  const snd = {
    pat: (v = 1) => {
      sfx.noise({ dur: 0.09, freq: 360, vol: 0.05 * v, filter: 'lowpass' })
      sfx.tone({ freq: 118, to: 82, dur: 0.11, vol: 0.05 * v })
    },
    drawOut: () => sfx.noise({ dur: 0.34, freq: 900, to: 2300, vol: 0.03, q: 0.7 }),
    free: (dye: number) => {
      sfx.noise({ dur: 0.13, freq: 760, vol: 0.04, filter: 'lowpass' })
      sfx.tone({ freq: sfx.scale(DYES[dye].note), dur: 1.1, type: 'sine', vol: 0.05, attack: 0.03 })
    },
    brush: (speed: number) => sfx.noise({ dur: 0.17, freq: clamp(520 + speed * 0.45, 520, 1300), to: 360, vol: 0.026, filter: 'lowpass' }),
    stroke: () => sfx.noise({ dur: 0.15, freq: 640, to: 400, vol: 0.016, q: 0.6 }),
    yarn: () => sfx.noise({ dur: 0.12, freq: 1500, to: 900, vol: 0.02, q: 3 }),
    knock: () => {
      sfx.tone({ freq: 210, to: 150, dur: 0.12, type: 'sine', vol: 0.09 })
      sfx.noise({ dur: 0.05, freq: 520, vol: 0.04, filter: 'lowpass' })
    },
    lyre: (step: number, delay: number, vol = 0.055) => {
      const f = sfx.scale(step)
      sfx.tone({ freq: f, dur: 2, type: 'sine', vol, delay, attack: 0.02 })
      sfx.tone({ freq: f * 2, dur: 0.9, type: 'triangle', vol: vol * 0.22, delay, attack: 0.01 })
    },
    chirp: () => {
      sfx.tone({ freq: 1900, to: 2300, dur: 0.07, type: 'sine', vol: 0.022 })
      sfx.tone({ freq: 2300, to: 2000, dur: 0.09, type: 'sine', vol: 0.02, delay: 0.11 })
    },
  }

  // ---- where things are -----------------------------------------------------
  const lift = () => ease.inOutQuad(hang)
  const shift = () => SINK * ease.inOutCubic(hang)
  const evening = () => smooth(0.25, 1, hang)
  const centreY = () => lerp(TABLE_AT.y, HUNG_AT.y, lift())
  const perch = (dye: number) => ({ x: BOWLS[dye].x + 4, y: BOWLS[dye].y - 82 })
  const heapTop = (dye: number) => ({ x: BOWLS[dye].x, y: BOWLS[dye].y - 40 })
  const slotX = (slot: number) => DISH.x + (slot - 2.5) * DISH_GAP
  const slotY = (f: Fig) => DISH.y + (FIG[f.kind].h * FIG[f.kind].dish) / 2 + 2
  const atTable = () => hang === 0 && hangTo === null && swap < 0
  const atWall = () => hang === 1 && hangTo === null && swap < 0

  const inFelt = (x: number, y: number) => x > FX0 - 26 && x < FX0 + FW + 26 && y >= FY0 && y < FY0 + FH + 26
  const inTopBand = (x: number, y: number) => x > TABLE_AT.x - FRAME.w / 2 - 10 && x < TABLE_AT.x + FRAME.w / 2 + 10 && y > FRAME_TOP - 50 && y < FY0
  const feltX = (x: number) => clamp(x - FX0, 4, FW - 4)
  const feltY = (y: number) => clamp(y - FY0, 4, FH - 4)

  const settleFigs = () => {
    for (const f of figs) {
      if (f.where !== 'felt') continue
      if (f.kind === 'sheep') f.grazing = onGrass(wool, f.x, f.y - 3)
      if (f.kind === 'bird' && !f.hop) f.wait = Math.min(f.wait, 0.8)
    }
  }

  const endStroke = () => {
    compact(kit, wool)
    classify(wool)
    settleFigs()
  }

  // ---- laying wool ----------------------------------------------------------
  const layOne = (t: Touch, x: number, y: number, rot: number, speed: number, scale = 1) => {
    if (!tuft) return
    const thin = clamp(tuft.amount / 0.3, 0, 1)
    const size = (0.55 + 0.46 * thin) * (1 - 0.28 * clamp(speed / 1500, 0, 1)) * (0.9 + Math.random() * 0.2) * scale
    t.patch = lay(kit, wool, t.patch, tuft.dye, x, y, rot, size, 0.36 + 0.4 * thin)
    tuft.amount -= 0.0082 * (0.45 + 0.55 * size)
    if (tuft.amount <= 0) {
      // The tuft is all laid: the bowl it came from stirs, and the bare
      // finger now strokes what is there.
      bowls[tuft.dye].press.kick(-2.2)
      tuft = null
      t.mode = 'stroke'
    }
  }

  const layTo = (t: Touch, fx: number, fy: number, speed: number) => {
    let dx = fx - t.sx
    let dy = fy - t.sy
    let d = Math.hypot(dx, dy)
    if (d < SPACING) return
    const ang = Math.atan2(dy, dx)
    while (d >= SPACING && tuft && t.mode === 'tuft') {
      t.sx += (dx / d) * SPACING
      t.sy += (dy / d) * SPACING
      layOne(t, t.sx + gauss(Math.random) * 2.5, t.sy + gauss(Math.random) * 2.5, ang + gauss(Math.random) * 0.22, speed)
      dx = fx - t.sx
      dy = fy - t.sy
      d = Math.hypot(dx, dy)
      t.travel += SPACING
    }
    if (t.travel > 70 && stage.time - lastBrush > 0.12) {
      t.travel = 0
      lastBrush = stage.time
      snd.brush(speed)
    }
  }

  const strokeTo = (t: Touch, fx: number, fy: number) => {
    const d = dist(t.sx, t.sy, fx, fy)
    if (d < 6) return
    const steps = Math.min(6, Math.ceil(d / 12))
    let px = t.sx
    let py = t.sy
    let any = false
    for (let i = 1; i <= steps; i++) {
      const nx = lerp(t.sx, fx, i / steps)
      const ny = lerp(t.sy, fy, i / steps)
      if (smudge(kit, wool, px, py, nx, ny)) any = true
      else brushNap(wool, nx, ny, px, py)
      px = nx
      py = ny
    }
    t.sx = fx
    t.sy = fy
    t.travel += d
    if (t.travel > 80 && stage.time - lastBrush > 0.14) {
      t.travel = 0
      lastBrush = stage.time
      if (any) snd.brush(200)
      else snd.stroke()
    }
  }

  // ---- hanging, and beginning again -----------------------------------------
  const arrive = () => {
    if (hang === 1) {
      swing.kick(0.16)
      snd.knock()
      snd.lyre(2, 0.5)
      snd.lyre(1, 1.5)
      snd.lyre(-1, 2.6, 0.06)
      endStroke()
    } else {
      snd.pat(1.2)
      snd.lyre(-1, 0.1, 0.04)
      snd.lyre(1, 0.7, 0.04)
    }
  }

  const snapshot = (): HTMLCanvasElement => {
    const s = res() * THUMB
    const [canvas, g] = makeCanvas((FRAME.w + FRAME_PAD * 2) * s, (FRAME.h + FRAME_PAD * 2 + YARN_UP * 2) * s)
    g.scale(s, s)
    g.lineCap = 'round'
    g.translate(FRAME.w / 2 + FRAME_PAD, FRAME.h / 2 + FRAME_PAD + YARN_UP * 2)
    drawPicture(g, wool, figs, 0, 0, 1, 0, 1, 1, false)
    return canvas
  }

  const finishSwap = () => {
    const done = snapshot()
    thumbs = [done, ...thumbs].slice(0, 2)
    leaving = null
    wool = makeWool()
    figs = makeFigs()
    tuft = waiting()
    for (const b of bowls) b.level = 1
    swap = -1
    freshIn = 0
    lightT = 0
    hangTo = 0
  }

  // ---- drawing --------------------------------------------------------------
  // The frame, its yarn, the felt, and everything on it. (cx, cy) is the
  // centre of the frame; it turns about the top of its yarn loop.
  function drawPicture(g: G, w: Wool | null, fs: readonly Fig[] | null, cx: number, cy: number, scale: number, rot: number, taut: number, eve: number, alive: boolean, reach = 0): void {
    const time = stage.time
    g.save()
    g.translate(cx, cy)
    if (rot !== 0) {
      g.translate(0, -APEX * scale)
      g.rotate(rot)
      g.translate(0, APEX * scale)
    }
    g.scale(scale, scale)
    drawYarn(g, taut, reach)
    g.drawImage(frame.canvas, -FRAME.w / 2 - FRAME_PAD, -FRAME.h / 2 - FRAME_PAD, frame.w, frame.h)
    g.translate(-FW / 2, -FH / 2)
    g.beginPath()
    g.rect(-3, -3, FW + 6, FH + 6)
    g.clip()
    if (w) drawWool(g, kit, w, time, !alive)
    if (fs) {
      const placed = fs.filter((f) => f.where === 'felt').sort((a, b) => a.y - b.y)
      for (const f of placed) drawFig(g, folk, glow, f, f.x, f.y, 1, time, alive ? 1 : 0, eve)
    }
    if (eve > 0.01) {
      // Evening inside the picture: warm, and lit from within.
      const dusk = g.createLinearGradient(0, 0, 0, FH)
      dusk.addColorStop(0, `rgba(164,150,214,${0.8 * eve})`)
      dusk.addColorStop(0.5, `rgba(255,190,150,${0.8 * eve})`)
      dusk.addColorStop(0.72, `rgba(240,196,160,${0.75 * eve})`)
      dusk.addColorStop(1, `rgba(196,180,176,${0.75 * eve})`)
      g.globalCompositeOperation = 'multiply'
      g.fillStyle = dusk
      g.fillRect(-3, -3, FW + 6, FH + 6)
      g.globalCompositeOperation = 'lighter'
      for (const s of w ? sunSpots(w) : []) {
        g.globalAlpha = eve * 0.34
        put(g, glow, s.x, s.y, 0, (s.r * 3.2) / 128)
      }
      for (const m of w ? flies : []) {
        const tw = alive ? 0.55 + 0.45 * Math.sin(time * 1.3 + m.ph * 3) : 0.8
        g.globalAlpha = eve * tw * 0.8
        const x = m.x + (alive ? Math.sin(time * 0.21 + m.ph) * 38 : 0)
        const y = m.y + (alive ? Math.sin(time * 0.33 + m.ph * 2) * 22 : 0)
        put(g, glow, x, y, 0, m.s)
      }
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'
    }
    g.restore()
  }

  const drawTuft = (g: G, tf: Tuft) => {
    const f = kit.fleeces[tf.dye]
    const time = stage.time
    let x = tf.x
    let y = tf.y
    const size = (0.6 + 0.5 * tf.amount) * tf.pop.value
    if (tf.state === 'rest') {
      const p = perch(tf.dye)
      x = p.x + Math.sin(time * 0.7 + tf.dye) * 3
      y = p.y + Math.sin(time * 1.1 + tf.dye) * 2.5 + shift()
    }
    const from = heapTop(tf.dye)
    const fy = from.y + shift()
    if (tf.state !== 'held') {
      // Still joined to the heap by the strands it is drawing out.
      const d = dist(from.x, fy, x, y)
      const a = Math.atan2(y - fy, x - from.x)
      g.globalAlpha = tf.state === 'rest' ? 0.55 : 0.85
      put(g, f.tufts[3], (from.x + x) / 2, (fy + y) / 2, a, Math.max(0.36, d / 105), clamp(0.8 - d / 260, 0.34, 0.8))
      put(g, f.tufts[1], lerp(from.x, x, 0.3), lerp(fy, y, 0.3), a, Math.max(0.3, d / 190), clamp(0.7 - d / 300, 0.3, 0.7))
    }
    g.globalAlpha = 0.22
    put(g, kit.shadow, x + 6, y + 20, 0, size)
    g.globalAlpha = 1
    const wob = Math.sin(time * 2.1 + tf.dye) * 0.08
    put(g, f.tufts[0], x, y, tf.rot + wob, size * 0.8)
    put(g, f.tufts[2], x + 4, y - 5, tf.rot + 1.1 - wob, size * 0.64)
    put(g, f.tufts[1], x - 3, y + 3, tf.rot - 0.7 + wob, size * 0.6)
    put(g, f.tufts[3], x + 1, y - 2, tf.rot + 2.2, size * 0.5)
  }

  const drawTableLayer = (g: G, sh: number) => {
    const time = stage.time
    g.drawImage(table, 0, EDGE_Y - 16 + sh, W, tableH)
    const idle = time - lastTouch
    for (let i = 0; i < BOWLS.length; i++) {
      const b = BOWLS[i]
      const bowl = bowls[i]
      const press = bowl.press.value
      const breathe = 1 + 0.012 * Math.sin(time * 0.9 + i * 1.3)
      const sx = (0.9 + 0.1 * bowl.level) * (1 + press * 0.1)
      const sy = bowl.level * breathe * (1 - press * 0.24)
      const heap = heaps[i]
      g.drawImage(heap.canvas, b.x - HEAP.ax * sx, b.y + 2 + sh - HEAP.ay * sy, HEAP.w * sx, HEAP.h * sy)
      // When nothing has been touched for a while, a lock of fleece lifts from
      // one bowl and then another, as if in a draught.
      if (idle > 5 && hang === 0 && !(tuft && tuft.dye === i) && (!tuft || !hasWool(wool))) {
        const turn = time / 3.4 + i * 0.37
        const mine = Math.floor(turn) % BOWLS.length === i
        if (mine) {
          const u = turn % 1
          const a = Math.sin(u * Math.PI)
          g.globalAlpha = a * 0.9
          const f = kit.fleeces[i]
          put(g, f.tufts[0], b.x + 6, b.y - 58 - a * 22 + sh, -0.5 + Math.sin(time * 1.6) * 0.3, 0.42, 0.3 + a * 0.12)
          g.globalAlpha = 1
        }
      }
    }
    for (const f of figs) {
      if (f.where !== 'dish') continue
      const tilt = Math.sin(f.slot * 2.4) * 0.07
      g.save()
      g.translate(slotX(f.slot), slotY(f) + sh)
      g.rotate(tilt)
      drawFig(g, folk, glow, f, 0, 0, FIG[f.kind].dish, time, 0, 0)
      g.restore()
    }
    if (tuft && tuft.state === 'rest') drawTuft(g, tuft)
  }

  const drawThumb = (g: G, canvas: HTMLCanvasElement, x: number, y: number, rot: number, alpha = 1) => {
    const w = (FRAME.w + FRAME_PAD * 2) * THUMB
    const h = (FRAME.h + FRAME_PAD * 2 + YARN_UP * 2) * THUMB
    const top = (FRAME.h / 2 + FRAME_PAD + YARN_UP * 2) * THUMB
    g.save()
    g.globalAlpha = alpha
    g.translate(x, y - APEX * THUMB)
    g.rotate(rot)
    g.drawImage(canvas, -w / 2, APEX * THUMB - top, w, h)
    g.restore()
  }

  // ---- the game -------------------------------------------------------------
  return {
    update(dt) {
      const time = stage.time
      if (swap >= 0) {
        swap += dt / 1.6
        if (swap >= 1) finishSwap()
      } else if (hangTo !== null) {
        const step = dt * 0.72
        if (Math.abs(hangTo - hang) <= step) {
          hang = hangTo
          hangTo = null
          arrive()
        } else {
          hang += Math.sign(hangTo - hang) * step
        }
      }
      swing.update(dt)
      freshSwing.update(dt)
      for (const s of thumbSwing) s.update(dt)
      lightT = hang === 1 ? Math.min(1, lightT + dt / 9) : Math.max(0, lightT - dt * 1.2)
      freshIn = damp(freshIn, swap < 0 ? 1 : 0, 2.2, dt)
      pegLook = damp(pegLook, atTable() && hasWool(wool) && time - lastTouch > 8 ? 1 : 0, 1.5, dt)
      for (const b of bowls) b.press.update(dt)
      // The evening invites too: the fresh frame stirs on its peg.
      if (atWall() && time - lastTouch > 7 && Math.abs(freshSwing.value) < 0.004 && Math.abs(freshSwing.vel) < 0.01) freshSwing.kick(0.12)

      if (tuft) {
        tuft.pop.update(dt)
        if (touch && (tuft.state === 'pull' || tuft.state === 'held')) {
          const px = tuft.x
          const py = tuft.y
          tuft.x = damp(tuft.x, touch.x, 26, dt)
          tuft.y = damp(tuft.y, touch.y - 6, 26, dt)
          const sp = Math.hypot(tuft.x - px, tuft.y - py)
          if (sp > 0.6) tuft.rot = damp(tuft.rot, Math.atan2(tuft.y - py, tuft.x - px), 8, dt)
        }
      }

      // A finger resting on the felt with wool under it: the tuft puffs out.
      if (touch && touch.mode === 'tuft' && tuft && touch.onFelt && time - touch.movedAt > 0.14 && touch.puffs < 16) {
        touch.puffIn -= dt
        if (touch.puffIn <= 0) {
          touch.puffIn = 0.12
          touch.puffs++
          const r = 4 + touch.puffs * 2.1
          const a = Math.random() * TAU
          layOne(touch, clamp(touch.sx + Math.cos(a) * r, 4, FW - 4), clamp(touch.sy + Math.sin(a) * r * 0.8, 4, FH - 4), Math.random() * TAU, 0)
          if (touch.puffs % 4 === 1) snd.stroke()
        }
      }

      updateWool(wool, dt)

      for (const f of figs) {
        f.squash.update(dt)
        f.size = damp(f.size, f.where === 'dish' ? 0 : 1, 12, dt)
        f.lift = damp(f.lift, f.where === 'held' ? 1 : 0, 12, dt)
        if (f.where === 'held' && touch) {
          f.x = damp(f.x, touch.x, 28, dt)
          f.y = damp(f.y, touch.y - 12, 28, dt)
        } else if (f.where === 'home') {
          const hx = slotX(f.slot)
          const hy = slotY(f)
          f.x = damp(f.x, hx, 9, dt)
          f.y = damp(f.y, hy, 9, dt)
          if (dist(f.x, f.y, hx, hy) < 3) {
            f.where = 'dish'
            f.squash.value = 0.86
          }
        } else if (f.where === 'felt') {
          if (f.kind === 'sheep') {
            const u = (time * 0.13 + f.phase * 0.37) % 1
            const down = f.grazing ? smooth(0.08, 0.2, u) * (1 - smooth(0.62, 0.74, u)) : 0
            f.nib = damp(f.nib, down, 5, dt)
          } else if (f.kind === 'gnome') {
            const shy = touch && touch.mode !== 'fig' && atTable() && dist(touch.x - FX0, touch.y - FY0, f.x, f.y - 40) < 110 ? 1 : 0
            f.duck = damp(f.duck, shy, 9, dt)
          } else if (f.kind === 'child') {
            let nearest: Fig | null = null
            for (const o of figs) if (o.kind === 'sheep' && o.where === 'felt' && (!nearest || Math.abs(o.x - f.x) < Math.abs(nearest.x - f.x))) nearest = o
            if (nearest && Math.abs(nearest.x - f.x) > 24) f.flip = nearest.x > f.x ? 1 : -1
          } else if (f.kind === 'bird') {
            if (f.hop) {
              const h = f.hop
              h.t += dt / 0.36
              const t = Math.min(1, h.t)
              f.x = lerp(h.fromX, h.toX, t)
              f.y = lerp(h.fromY, h.toY, t) - Math.sin(t * Math.PI) * 26
              if (h.t >= 1) {
                f.hop = null
                f.squash.value = 0.8
                f.wait = h.last ? 3 : 0.2
                if (h.last) {
                  f.perched = true
                  snd.chirp()
                }
              }
            } else if (!(touch && touch.fig === f)) {
              f.wait -= dt
              if (f.wait <= 0) {
                // The bird hops to the tallest thing in the picture.
                let top = tallest(wool)
                for (const o of figs) if (o.kind === 'cottage' && o.where === 'felt' && (!top || o.y - 112 < top.y)) top = { x: o.x + o.flip * 2, y: o.y - 110 }
                const far = top ? dist(f.x, f.y, top.x, top.y) : 0
                if (top && far > 9) {
                  const stepLen = Math.min(far, 64 + Math.random() * 30)
                  const k = stepLen / far
                  f.flip = top.x >= f.x ? 1 : -1
                  f.perched = false
                  f.hop = { fromX: f.x, fromY: f.y, toX: lerp(f.x, top.x, k), toY: lerp(f.y, top.y, k), t: 0, last: k >= 1 }
                } else {
                  f.wait = 1.4
                  if (top && Math.random() < 0.3) f.flip = f.flip === 1 ? -1 : 1
                }
              }
            }
          }
        }
      }

      for (const m of motes) {
        m.y -= dt * (4 + m.s * 16)
        m.x += Math.sin(time * 0.3 + m.ph) * dt * 6
        if (m.y < -10) {
          m.y = 440
          m.x = 60 + Math.random() * 520
        }
      }
    },

    draw(g) {
      const time = stage.time
      const sh = shift()
      const eve = evening()
      const edge = EDGE_Y + sh
      g.lineCap = 'round'

      // The wall: only the strip above the table by day.
      const wallH = Math.min(H, edge + 2)
      g.drawImage(wall, 0, 0, W, wallH, 0, 0, W, wallH)
      if (pegLook > 0.01) {
        g.globalAlpha = pegLook * (0.5 + 0.3 * Math.sin(time * 1.4))
        put(g, glow, PEG.x, PEG.y, 0, 0.8)
        g.globalAlpha = 1
      }
      if (edge < H + 16) drawTableLayer(g, sh)

      // Daylight from the window, and the leaves outside stirring in it.
      const day = 1 - eve
      if (day > 0.01) {
        g.globalAlpha = 0.85 * day
        g.drawImage(dayLight.canvas, -10, -205, dayLight.w * 1.15, dayLight.h * 1.15)
        g.globalAlpha = 0.42 * day
        g.drawImage(leaves.canvas, 120 + Math.sin(time * 0.4) * 7, -30 + Math.sin(time * 0.31) * 4, leaves.w, leaves.h)
        g.globalAlpha = 1
      }
      // Dusk settles on the room, not on the pictures: they keep their light.
      if (eve > 0.01) {
        const dusk = g.createLinearGradient(0, 0, 0, H)
        dusk.addColorStop(0, `rgba(128,104,150,${0.9 * eve})`)
        dusk.addColorStop(0.6, `rgba(178,128,140,${0.88 * eve})`)
        dusk.addColorStop(1, `rgba(150,104,112,${0.9 * eve})`)
        g.globalCompositeOperation = 'multiply'
        g.fillStyle = dusk
        g.fillRect(0, 0, W, H)
        g.globalCompositeOperation = 'source-over'
      }

      // The small pictures on the wall and the fresh frame, behind the table.
      if (hang > 0) {
        g.save()
        g.beginPath()
        g.rect(0, 0, W, Math.max(0, edge - 12))
        g.clip()
        const s = swap >= 0 ? ease.inOutCubic(clamp(swap, 0, 1)) : 0
        if (leaving) drawThumb(g, leaving, SLOTS[1].x, SLOTS[1].y + s * 30, 0, 1 - s)
        for (let i = thumbs.length - 1; i >= 0; i--) {
          const from = SLOTS[i]
          const to = SLOTS[Math.min(1, i + 1)]
          drawThumb(g, thumbs[i], lerp(from.x, to.x, s), lerp(from.y, to.y, s), thumbSwing[i].value)
        }
        if (swap < 0 && freshIn > 0.01) {
          g.globalAlpha = freshIn
          drawPicture(g, null, null, FRESH.x, FRESH.y, THUMB, freshSwing.value, 1, eve, false)
          g.globalAlpha = 1
        }
        g.restore()
      }

      // The halo of the picture in hand, then the picture.
      if (eve > 0.01) {
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = eve * 0.3
        g.drawImage(glow.canvas, HUNG_AT.x - 560, HUNG_AT.y - 400, 1120, 800)
        g.globalAlpha = 1
        g.globalCompositeOperation = 'source-over'
      }
      if (swap >= 0) {
        const s = ease.inOutCubic(clamp(swap, 0, 1))
        drawPicture(g, wool, figs, lerp(HUNG_AT.x, SLOTS[0].x, s), lerp(HUNG_AT.y, SLOTS[0].y, s), lerp(1, THUMB, s), 0, 1, 1, true)
        const arc = Math.sin(s * Math.PI) * 60
        drawPicture(g, null, null, lerp(FRESH.x, HUNG_AT.x, s), lerp(FRESH.y, HUNG_AT.y, s) + arc, lerp(THUMB, 1, s), 0, 1, 1, false)
      } else {
        // Left alone with a picture made, the loop of yarn stirs toward its peg.
        const stir = pegLook * (1 - hang) * (10 + 9 * Math.sin(time * 1.4))
        drawPicture(g, wool, figs, TABLE_AT.x, centreY(), 1, swing.value, smooth(0.7, 1, hang), eve, true, stir)
      }

      // Evening light from the window crosses the wall and the picture.
      if (eve > 0.01) {
        const across = ease.outCubic(lightT)
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = eve * (0.12 + 0.13 * across)
        g.drawImage(eveLight.canvas, lerp(-420, 110, across), lerp(60, -40, across), eveLight.w * 1.1, eveLight.h * 1.1)
        g.globalAlpha = 1
        g.globalCompositeOperation = 'source-over'
      }

      // Lint drifting in the light.
      const lint = kit.fleeces[0].wisp
      for (const m of motes) {
        g.globalAlpha = (0.3 + 0.25 * Math.sin(time * 0.8 + m.ph)) * (1 - eve * 0.5)
        put(g, lint, m.x, m.y, m.ph + time * 0.2, m.s)
      }
      g.globalAlpha = 1

      // Whatever is on the finger goes over everything.
      if (tuft && tuft.state !== 'rest') drawTuft(g, tuft)
      for (const f of figs) {
        if (f.where !== 'held' && f.where !== 'home') continue
        drawFig(g, folk, glow, f, f.x, f.y, lerp(FIG[f.kind].dish, 1, f.size) * (1 + f.lift * 0.08), time, 1, 0)
      }
    },

    down(p: Pointer) {
      lastTouch = stage.time
      if (touch) return
      const t: Touch = { id: p.id, mode: 'none', x: p.x, y: p.y, sx: feltX(p.x), sy: feltY(p.y), startY: p.y, patch: null, fig: null, onFelt: false, movedAt: stage.time, puffs: 0, puffIn: 0.1, travel: 0, moved: 0, putBack: false }
      touch = t

      if (atWall()) {
        if (Math.abs(p.x - FRESH.x) < FRAME.w * THUMB * 0.5 + 34 && Math.abs(p.y - FRESH.y) < FRAME.h * THUMB * 0.5 + 44) {
          // A fresh frame comes down, and the finished picture takes its place on the wall.
          leaving = thumbs.length >= 2 ? thumbs[1] : null
          if (thumbs.length >= 2) thumbs = [thumbs[0]]
          swap = 0
          snd.yarn()
          snd.knock()
          return
        }
        if (Math.abs(p.x - HUNG_AT.x) < FRAME.w / 2 + 10 && Math.abs(p.y - HUNG_AT.y) < FRAME.h / 2 + 30) {
          t.mode = 'hung'
          swing.kick(p.x > HUNG_AT.x ? -0.05 : 0.05)
          snd.yarn()
          return
        }
        for (let i = 0; i < thumbs.length; i++) {
          if (Math.abs(p.x - SLOTS[i].x) < 120 && Math.abs(p.y - SLOTS[i].y) < 90) {
            thumbSwing[i].kick(0.3)
            snd.yarn()
            return
          }
        }
        snd.pat(0.5)
        return
      }
      if (!atTable()) return

      const fx = p.x - FX0
      const fy = p.y - FY0
      // A figure already in the picture, or one in the dish.
      let best: Fig | null = null
      let bestD = Infinity
      for (const f of figs) {
        if (f.where === 'felt') {
          const d = dist(fx, fy, f.x, f.y - FIG[f.kind].h / 2)
          const reach = tuft ? Math.max(26, FIG[f.kind].h * 0.4) : Math.max(38, FIG[f.kind].h * 0.56)
          if (d < reach && d < bestD) {
            best = f
            bestD = d
          }
        } else if (f.where === 'dish' && Math.abs(p.y - DISH.y) < DISH.h / 2 + 18) {
          const d = Math.abs(p.x - slotX(f.slot))
          if (d < DISH_GAP * 0.62 && d < bestD) {
            best = f
            bestD = d
          }
        }
      }
      if (best) {
        t.mode = 'fig'
        t.fig = best
        if (best.where === 'felt') {
          best.x += FX0
          best.y += FY0
        } else {
          best.x = slotX(best.slot)
          best.y = slotY(best)
        }
        best.where = 'held'
        best.hop = null
        best.perched = false
        best.grazing = false
        best.squash.value = 1.12
        snd.pat(0.6)
        return
      }
      if (inTopBand(p.x, p.y)) {
        t.mode = 'frame'
        snd.yarn()
        return
      }
      if (inFelt(p.x, p.y)) {
        t.onFelt = true
        if (tuft) {
          t.mode = 'tuft'
          tuft.state = 'held'
          tuft.x = p.x
          tuft.y = p.y - 6
          tuft.pop.value = 0.8
          snd.pat(0.7)
          // A dab where the finger lands.
          for (let i = 0; i < 2 && tuft; i++) layOne(t, t.sx + gauss(Math.random) * 2.5, t.sy + gauss(Math.random) * 2, Math.random() * TAU, 0, 0.66)
        } else {
          t.mode = 'stroke'
          if (!smudge(kit, wool, t.sx, t.sy, t.sx, t.sy)) brushNap(wool, t.sx, t.sy, t.sx - 1, t.sy)
          snd.pat(0.45)
        }
        return
      }
      for (let i = 0; i < BOWLS.length; i++) {
        const b = BOWLS[i]
        const nx = (p.x - b.x) / 112
        const ny = (p.y - (b.y - 14)) / 80
        if (nx * nx + ny * ny > 1) continue
        // Draw a tuft out of this bowl.
        const top = heapTop(i)
        t.mode = 'pull'
        lastBowl = i
        bowls[i].press.value = 0.8
        if (tuft && tuft.dye === i && tuft.state === 'rest' && tuft.amount > 0.85) {
          const at = perch(i)
          tuft.state = 'pull'
          tuft.x = at.x
          tuft.y = at.y
          t.putBack = true
          snd.pat(0.6)
          return
        }
        if (tuft && tuft.dye !== i) bowls[tuft.dye].level = Math.min(1, bowls[tuft.dye].level + 0.03 * tuft.amount)
        tuft = { dye: i, amount: 1, state: 'pull', x: top.x, y: top.y, rot: -Math.PI / 2, pop: spring(1, 150, 10) }
        tuft.pop.value = 0.6
        bowls[i].level = Math.max(0.56, bowls[i].level - 0.03)
        snd.drawOut()
        return
      }
      // Bare table or wall: a soft pat on felt.
      snd.pat(0.5)
    },

    move(p: Pointer) {
      const t = touch
      if (!t || t.id !== p.id) return
      lastTouch = stage.time
      const step = Math.hypot(p.x - t.x, p.y - t.y)
      if (step > 1.5) t.movedAt = stage.time
      t.moved += step
      t.x = p.x
      t.y = p.y
      const speed = Math.hypot(p.vx, p.vy)
      if (t.mode === 'pull' && tuft) {
        const top = heapTop(tuft.dye)
        if (dist(top.x, top.y, p.x, p.y) > 104) {
          tuft.state = 'held'
          tuft.pop.kick(2)
          bowls[tuft.dye].press.kick(-3)
          snd.free(tuft.dye)
          t.mode = 'tuft'
        }
      }
      if (t.mode === 'tuft' && tuft) {
        const on = inFelt(p.x, p.y)
        if (on && !t.onFelt) {
          t.sx = feltX(p.x)
          t.sy = feltY(p.y)
          t.puffs = 0
          snd.pat(0.6)
        }
        t.onFelt = on
        if (on) layTo(t, feltX(p.x), feltY(p.y), speed)
      } else if (t.mode === 'stroke') {
        if (inFelt(p.x, p.y) || t.onFelt) strokeTo(t, feltX(p.x), feltY(p.y))
      } else if (t.mode === 'frame') {
        hang = clamp((t.startY - p.y - 14) / 190, 0, 1)
      } else if (t.mode === 'hung') {
        hang = 1 - clamp((p.y - t.startY - 14) / 190, 0, 1)
      }
    },

    up(p: Pointer) {
      const t = touch
      if (!t || t.id !== p.id) return
      touch = null
      lastTouch = stage.time
      if (t.mode === 'pull' && tuft && t.putBack) {
        // The waiting tuft is laid back in its bowl; the hand is bare again.
        bowls[tuft.dye].press.value = 0.6
        bowls[tuft.dye].level = Math.min(1, bowls[tuft.dye].level + 0.03)
        tuft = null
        snd.stroke()
      } else if (t.mode === 'pull' && tuft) {
        // A tap on a bowl: the tuft comes up by itself and waits above it.
        tuft.state = 'rest'
        tuft.pop.kick(2.4)
        bowls[tuft.dye].press.kick(-3)
        snd.free(tuft.dye)
      } else if (t.mode === 'tuft') {
        if (tuft) {
          tuft.state = 'rest'
          tuft.pop.value = 0.7
        }
        endStroke()
      } else if (t.mode === 'stroke') {
        endStroke()
        if (lastBowl >= 0 && !tuft && t.moved < 4) bowls[lastBowl].press.kick(-1.5)
      } else if (t.mode === 'fig' && t.fig) {
        const f = t.fig
        const fx = f.x - FX0
        const fy = f.y - FY0
        if (fx > 6 && fx < FW - 6 && fy > 14 && fy < FH + 10) {
          f.where = 'felt'
          f.x = fx
          f.y = Math.min(fy, FH - 2)
          f.squash.value = 0.78
          f.wait = 1.3
          if (f.kind === 'sheep') f.grazing = onGrass(wool, f.x, f.y - 3)
          snd.pat(1)
        } else {
          f.where = 'home'
          snd.stroke()
        }
      } else if (t.mode === 'frame') {
        if (hang > 0) {
          hangTo = hang > 0.34 ? 1 : 0
          if (hang === hangTo) {
            hangTo = null
            arrive()
          }
        }
      } else if (t.mode === 'hung') {
        if (hang < 1) {
          hangTo = hang < 0.66 ? 0 : 1
          if (hang === hangTo) {
            hangTo = null
            arrive()
          }
        }
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'wool-picture',
    name: 'Wool Picture',
    emoji: '🧶',
    ages: [3, 7],
    pitch: 'Draw tufts of plant-dyed fleece out of the bowls and lay them on a sheet of felt to make a picture; it comes softly alive, and hanging it on the wall brings the evening.',
    howTo: 'Touch a bowl to draw out a tuft, then stroke it onto the felt (rest your finger and it puffs out). A bare finger strokes the wool along. Set the little figures in from the dish. Drag the top of the frame up to hang it; touch the empty frame on the wall for a new one.',
    basedOn: 'Waldorf wool fleece pictures and needle felting, from the kindergarten handwork table',
    whyFun: 'Wool thins out under the finger as it is drawn across the felt, and the hill, cloud or sun you laid starts to breathe.',
    set: 'gentle',
  },
  create,
}
