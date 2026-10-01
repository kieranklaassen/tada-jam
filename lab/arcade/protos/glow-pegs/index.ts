// Glow Pegs: the light-peg board toy inside an arcade cabinet. Pick a colour
// from the tray and push pegs into the black board; each one clicks in and
// lights. Pushing a colour onto a peg of another colour swaps it (the old peg
// drops back to the tray); touching a peg of the colour in hand pulls it out.
// Three arcade buttons set the mirror (none, two-way, four-way). The lever on
// the right runs the show: a beam sweeps the board and every peg it passes
// sounds, higher pegs higher. Pulling the tray's handle drops every peg back.
//
// Loud to look at, calm to play: nothing moves until the child moves it,
// nothing is counted, and the show loops only while the lever is down.
// Sprites and the cabinet are in look.ts; nothing here uses shadowBlur.

import { clamp, damp, ease, lerp, rnd, spring } from '../../kit/math.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import {
  BH,
  BLOOM_AMBER,
  BLOOM_WHITE,
  BTN_R,
  BTN_X,
  BTN_Y,
  BW,
  BX,
  BY,
  COLORS,
  KNOB_R,
  LEVER_OFF_Y,
  LEVER_ON_Y,
  LEVER_PIVOT_Y,
  LEVER_X,
  PEG_R,
  PILE,
  RH,
  ROWS,
  S,
  TRAY_BODY,
  TRAY_H,
  TRAY_PULL,
  TRAY_W,
  TRAY_X,
  TRAY_Y,
  WELL,
  X0,
  Y0,
  buildLook,
  colsIn,
  makeBulbs,
  makeHoles,
  rgba,
} from './look.ts'

// Pegs of each colour in the tray. Finite on purpose: the well visibly empties.
const CAP = 110
// The glow layer is drawn at quarter size and stretched: cheap bloom.
const GM = 72
const GS = 0.25
// A halo's size in the glow layer (176 logical pixels across on the board).
const HALO = 44
const SPRITE = (PEG_R + 4) * 2
const HALF = S / 2
const LAST_K = 32
// Seconds the beam takes to cross one half-cell.
const STEP = 0.16
const SHOW_LIGHTS = [0, 2, 3, 4, 6] as const
// How hard each colour blooms: yellow, lime and white carry further by nature.
const GAIN = [1, 1, 0.8, 0.8, 0.85, 1.1, 1.05, 0.72] as const

type Kind = 'place' | 'pull' | 'well' | 'lever' | 'tray' | 'none'

interface Touch {
  kind: Kind
  last: number
  lx: number
  ly: number
  start: number
  moved: boolean
  told: boolean
}

interface Faller {
  x: number
  y: number
  vx: number
  vy: number
  color: number
  delay: number
  spin: number
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const mk = (w: number, h: number): HTMLCanvasElement => {
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w))
    c.height = Math.max(1, Math.round(h))
    return c
  }
  const { holes, rowStart } = makeHoles()
  const bulbs = makeBulbs()
  const look = buildLook(mk, holes, bulbs)
  const N = holes.length

  const glowW = Math.round((BW + GM * 2) * GS)
  const glowH = Math.round((BH + GM * 2) * GS)
  const glowLayers = [mk(glowW, glowH), mk(glowW, glowH)]
  const glowCtx = glowLayers.map((c) => {
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, glowW, glowH)
    return ctx
  })
  let glowDirty = false
  const pegLayer = mk(BW * 2, BH * 2)
  const pg = pegLayer.getContext('2d')!
  pg.scale(2, 2)
  let frame = 0

  // Board state: colour index per hole, or -1.
  const color = new Int8Array(N).fill(-1)
  const placedAt = new Float32Array(N)
  const flash = new Float32Array(N)
  // 1 once a peg is stamped into the peg layer.
  const settled = new Uint8Array(N)
  // 1 once its halo is stamped into a glow layer, and which of the two.
  const inGlow = new Uint8Array(N)
  const group = new Uint8Array(N)
  for (let i = 0; i < N; i++) group[i] = stage.rand() < 0.5 ? 0 : 1
  const colHoles: number[][] = []
  for (let k = 0; k <= LAST_K; k++) colHoles.push([])
  holes.forEach((h, i) => colHoles[h.k]!.push(i))

  // Tray state.
  const stock = COLORS.map(() => CAP)
  const bump = COLORS.map(() => spring(0, 240, 13))
  const emptyBlink = COLORS.map(() => 0)
  const pile = COLORS.map(() => {
    const spots: { x: number; y: number }[] = []
    for (let j = 0; j < PILE; j++) {
      const row = Math.floor(j / 6)
      const col = j % 6
      spots.push({ x: -33 + col * 12.6 + (row % 2) * 5 + (stage.rand() - 0.5) * 5, y: 30 - row * 16.5 + (stage.rand() - 0.5) * 5 })
    }
    return spots
  })
  let selected = 0
  const tray = spring(0, 150, 20)
  let trayHeld = false
  let dumped = false
  let trayOut = false

  let mirror = 0
  const press = [spring(0, 320, 20), spring(0, 320, 20), spring(0, 320, 20)]
  const lit = [1, 0, 0]

  const lever = spring(0, 210, 16)
  let leverHeld = false
  // The knob gives a little under the finger.
  let grip = 1
  let showOn = false
  let showAmt = 0
  let beam = X0 - HALF * 3
  let nextK = 0

  const fallers: Faller[] = []
  const touches = new Map<number, Touch>()
  let lastTick = -1

  const wellX = (i: number): number => TRAY_X + tray.value + (i + 0.5) * WELL
  const rowStep = (row: number): number => ROWS - 1 - row - 7

  const inBoard = (x: number, y: number, pad: number): boolean => x >= BX - pad && x <= BX + BW + pad && y >= BY - pad && y <= BY + BH + pad

  const nearest = (x: number, y: number): number => {
    const mid = Math.round((y - Y0) / RH)
    let best = 0
    let bestD = Infinity
    for (let row = mid - 1; row <= mid + 1; row++) {
      if (row < 0 || row >= ROWS) continue
      const off = row % 2 ? HALF : 0
      const col = clamp(Math.round((x - X0 - off) / S), 0, colsIn(row) - 1)
      const i = rowStart[row]! + col
      const h = holes[i]!
      const d = (h.x - x) * (h.x - x) + (h.y - y) * (h.y - y)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    if (bestD === Infinity) {
      const row = clamp(mid, 0, ROWS - 1)
      const off = row % 2 ? HALF : 0
      best = rowStart[row]! + clamp(Math.round((x - X0 - off) / S), 0, colsIn(row) - 1)
    }
    return best
  }

  // The hole and its echoes across the mirror lines, without repeats.
  const echoes = (i: number): number[] => {
    if (mirror === 0) return [i]
    const h = holes[i]!
    const mx = rowStart[h.row]! + (colsIn(h.row) - 1 - h.col)
    const out = [i]
    if (mx !== i) out.push(mx)
    if (mirror === 2) {
      const row = ROWS - 1 - h.row
      const my = rowStart[row]! + h.col
      const mxy = rowStart[row]! + (colsIn(row) - 1 - h.col)
      if (!out.includes(my)) out.push(my)
      if (!out.includes(mxy)) out.push(mxy)
    }
    return out
  }

  const clickIn = (row: number, delay: number, lead: boolean): void => {
    sfx.noise({ dur: 0.025, freq: 3200, vol: lead ? 0.07 : 0.03, filter: 'highpass', delay })
    sfx.tone({ freq: 900, to: 400, dur: 0.035, type: 'triangle', vol: lead ? 0.07 : 0.03, delay })
    if (lead) sfx.tone({ freq: sfx.scale(rowStep(row)), dur: 0.32, type: 'sine', vol: 0.055, delay: delay + 0.02 })
  }

  const pullOut = (i: number, delay: number, quiet: boolean): void => {
    const c = color[i]!
    if (c < 0) return
    color[i] = -1
    const h = holes[i]!
    if (settled[i] === 1) {
      settled[i] = 0
      pg.clearRect(h.x - BX - SPRITE / 2, h.y - BY - SPRITE / 2, SPRITE, SPRITE)
    }
    // A halo cannot be un-stamped: the layers are redrawn on the next frame.
    if (inGlow[i] === 1) glowDirty = true
    fallers.push({ x: h.x, y: h.y, vx: rnd(-40, 40), vy: quiet ? rnd(-90, -20) : -230, color: c, delay, spin: rnd(0, 6) })
    if (!quiet) {
      sfx.tone({ freq: 380, to: 760, dur: 0.05, type: 'triangle', vol: 0.06, delay })
      sfx.noise({ dur: 0.02, freq: 2400, vol: 0.03, filter: 'highpass', delay })
    }
  }

  const act = (touch: Touch, i: number): void => {
    touch.last = i
    const set = echoes(i)
    if (touch.kind === 'pull') {
      set.forEach((m, n) => pullOut(m, n * 0.045, false))
      return
    }
    let n = 0
    let ranOut = false
    for (const m of set) {
      if (color[m] === selected) continue
      if (stock[selected]! <= 0) {
        ranOut = true
        break
      }
      // A peg of another colour is pulled first and drops back to the tray;
      // then the one in the hand goes in, as it would with the real board.
      if (color[m]! >= 0) pullOut(m, n * 0.045, false)
      color[m] = selected
      stock[selected] = stock[selected]! - 1
      placedAt[m] = stage.time + n * 0.045
      clickIn(holes[m]!.row, n * 0.045, n === 0)
      n++
    }
    // The material shows it: the well is empty. One dull tock, once a stroke.
    if (ranOut && !touch.told) {
      touch.told = true
      emptyBlink[selected] = 1
      sfx.tone({ freq: 170, to: 120, dur: 0.09, type: 'triangle', vol: 0.09 })
    }
  }

  const setMirror = (next: number): void => {
    press[next]!.value = 1
    sfx.tone({ freq: 210, to: 110, dur: 0.07, type: 'triangle', vol: 0.12 })
    sfx.noise({ dur: 0.03, freq: 900, vol: 0.07, filter: 'lowpass' })
    for (let n = 0; n <= next; n++) sfx.tone({ freq: sfx.scale(n * 2), dur: 0.3, type: 'sine', vol: 0.05, delay: 0.04 + n * 0.07 })
    mirror = next
  }

  const setShow = (on: boolean): void => {
    if (on === showOn) return
    showOn = on
    sfx.tone({ freq: 150, to: 80, dur: 0.09, type: 'triangle', vol: 0.14 })
    sfx.noise({ dur: 0.04, freq: 700, vol: 0.08, filter: 'lowpass' })
    if (on) {
      beam = X0 - HALF * 3
      nextK = 0
      sfx.tone({ freq: 196, to: 392, dur: 0.5, type: 'sine', vol: 0.045, delay: 0.03 })
    } else {
      sfx.tone({ freq: 392, to: 196, dur: 0.45, type: 'sine', vol: 0.04, delay: 0.03 })
    }
  }

  const dumpBoard = (): void => {
    let any = false
    for (let i = 0; i < N; i++) {
      if (color[i]! < 0) continue
      any = true
      pullOut(i, (ROWS - 1 - holes[i]!.row) * 0.04 + Math.random() * 0.14, true)
    }
    if (any) sfx.noise({ dur: 0.35, freq: 500, to: 1800, vol: 0.05, q: 0.7 })
  }

  const strike = (k: number): void => {
    const list = colHoles[k]!
    let n = 0
    for (const i of list) if (color[i]! >= 0 && placedAt[i]! <= stage.time) n++
    if (n === 0) return
    // Quieter the more pegs share the beam, so a full board hums and a lone peg sings.
    const vol = 0.07 / n ** 0.75
    let order = 0
    for (let j = list.length - 1; j >= 0; j--) {
      const i = list[j]!
      const c = color[i]!
      if (c < 0 || placedAt[i]! > stage.time) continue
      flash[i] = 1
      sfx.tone({ freq: sfx.scale(rowStep(holes[i]!.row)), dur: 0.42, type: c < 4 ? 'triangle' : 'sine', vol: c < 4 ? vol * 0.85 : vol, delay: order * 0.016 })
      order++
    }
  }

  const paint = (touch: Touch, p: Pointer): void => {
    const dx = p.x - touch.lx
    const dy = p.y - touch.ly
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 10))
    for (let s = 1; s <= steps; s++) {
      const x = touch.lx + (dx * s) / steps
      const y = touch.ly + (dy * s) / steps
      // A finger that slides off the board is forgiven: it just stops placing
      // until it comes back.
      if (!inBoard(x, y, 20)) continue
      const i = nearest(x, y)
      if (i !== touch.last) act(touch, i)
    }
    touch.lx = p.x
    touch.ly = p.y
  }

  const drawSprite = (g: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, size: number): void => {
    g.drawImage(img, x - size / 2, y - size / 2, size, size)
  }

  return {
    update(dt) {
      const t = stage.time
      tray.update(dt)
      if (trayHeld) tray.vel = 0
      if (tray.value > 6) trayOut = true
      else if (trayOut && !trayHeld && tray.value < 2) {
        trayOut = false
        sfx.tone({ freq: 120, to: 70, dur: 0.1, type: 'sine', vol: 0.12 })
        sfx.noise({ dur: 0.04, freq: 500, vol: 0.05, filter: 'lowpass' })
      }
      if (!leverHeld) lever.target = showOn ? 1 : 0
      lever.update(dt)
      for (const s of press) s.update(dt)
      for (const s of bump) s.update(dt)
      for (let i = 0; i < 3; i++) lit[i] = damp(lit[i]!, mirror === i ? 1 : 0, 14, dt)
      for (let i = 0; i < COLORS.length; i++) emptyBlink[i] = Math.max(0, emptyBlink[i]! - dt * 1.6)
      for (let i = 0; i < N; i++) if (flash[i]! > 0) flash[i] = Math.max(0, flash[i]! - dt * 3.2)
      showAmt = damp(showAmt, showOn ? 1 : 0, 5, dt)

      if (showOn) {
        beam += (HALF / STEP) * dt
        while (nextK <= LAST_K && beam >= X0 + nextK * HALF) strike(nextK++)
        if (beam > X0 + LAST_K * HALF + HALF * 3) {
          beam = X0 - HALF * 3
          nextK = 0
        }
      }

      for (let i = fallers.length - 1; i >= 0; i--) {
        const f = fallers[i]!
        if (f.delay > 0) {
          f.delay -= dt
          continue
        }
        f.vy += 1500 * dt
        f.y += f.vy * dt
        f.x += f.vx * dt
        f.x = damp(f.x, wellX(f.color), 3.6, dt)
        f.spin += dt * 7
        if (f.y >= TRAY_Y + 46 && f.vy > 0) {
          fallers.splice(i, 1)
          stock[f.color] = Math.min(CAP, stock[f.color]! + 1)
          bump[f.color]!.kick(8)
          // The clatter: one small tick a peg, never more than about 30 a second.
          if (t - lastTick > 0.032) {
            lastTick = t
            sfx.noise({ dur: 0.03, freq: rnd(1800, 4200), vol: 0.05, q: 3 })
            sfx.tone({ freq: rnd(600, 1100), to: 300, dur: 0.03, type: 'triangle', vol: 0.03 })
          }
        }
      }
    },

    draw(g) {
      const t = stage.time
      g.drawImage(look.cabinet, 0, 0, stage.W, stage.H)

      // The tray and its piles of pegs.
      const tx = TRAY_X + tray.value
      g.drawImage(look.tray, tx, TRAY_Y, TRAY_W, TRAY_H)
      const cy = TRAY_Y + TRAY_H / 2
      for (let c = 0; c < COLORS.length; c++) {
        const have = stock[c]!
        const shown = have > 0 ? Math.max(1, Math.ceil((have / CAP) * PILE)) : 0
        const cx = wellX(c)
        const b = clamp(bump[c]!.value, -1.5, 2.5)
        const on = c === selected
        g.globalAlpha = on ? 1 : 0.72
        const spots = pile[c]!
        for (let j = 0; j < shown; j++) {
          const spot = spots[j]!
          const lift = b * (3 + (j % 3) * 2)
          drawSprite(g, look.pegs[c]!, cx + spot.x, cy + spot.y - lift - (on ? 2 : 0), SPRITE * 0.64)
        }
        g.globalAlpha = 1
      }
      g.globalCompositeOperation = 'lighter'
      for (let c = 0; c < COLORS.length; c++) {
        const fill = stock[c]! / CAP
        if (fill <= 0) continue
        const on = c === selected
        g.globalAlpha = (on ? 0.42 + 0.07 * Math.sin(t * 1.7) : 0.2) * (0.4 + 0.6 * fill) * (c === 7 ? 0.4 : GAIN[c]!)
        drawSprite(g, look.blooms[c]!, wellX(c), cy + 6, on ? 190 : 140)
      }
      // A glint that wanders over the chosen pile: the material inviting.
      {
        const gp = (t % 3.4) / 1.1
        if (gp < 1 && stock[selected]! > 0) {
          g.globalAlpha = Math.sin(gp * Math.PI) * 0.55
          drawSprite(g, look.blooms[BLOOM_WHITE]!, wellX(selected) - 40 + gp * 80, cy + 14 - gp * 22, 54)
        }
      }
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'
      // The chosen well wears a neon ring; an empty one answers with a pale blink.
      for (let c = 0; c < COLORS.length; c++) {
        const on = c === selected
        const blink = emptyBlink[c]!
        if (!on && blink <= 0) continue
        const x = wellX(c) - WELL / 2 + 4
        g.beginPath()
        g.roundRect(x, TRAY_Y + 6, WELL - 8, TRAY_H - 12, 12)
        if (on) {
          g.strokeStyle = rgba(COLORS[c]!, 0.28)
          g.lineWidth = 11
          g.stroke()
          g.strokeStyle = rgba(COLORS[c]!, 0.9)
          g.lineWidth = 4.5
          g.stroke()
          g.strokeStyle = 'rgba(255,255,255,0.9)'
          g.lineWidth = 1.6
          g.stroke()
        }
        if (blink > 0) {
          g.strokeStyle = `rgba(255,255,255,${0.7 * blink})`
          g.lineWidth = 3
          g.stroke()
        }
      }

      // Marquee bulbs: a slow amber wave at rest, a colour chase in the show.
      g.globalCompositeOperation = 'lighter'
      const hue = Math.floor(t * 1.4)
      for (let i = 0; i < bulbs.length; i++) {
        const b = bulbs[i]!
        const wave = Math.max(0, Math.sin(t * 0.9 - i * 0.42))
        const idle = (0.22 + 0.6 * wave * wave) * (1 - showAmt)
        if (idle > 0.02) {
          g.globalAlpha = idle * 0.85
          drawSprite(g, look.blooms[BLOOM_AMBER]!, b.x, b.y, 50)
        }
        if (showAmt > 0.02) {
          const ph = (((i - t * 5) % 4) + 4) % 4
          g.globalAlpha = (ph < 1 ? 1 : ph < 2 ? 0.45 : 0.16) * showAmt
          drawSprite(g, look.blooms[(i + hue) % COLORS.length]!, b.x, b.y, 58)
        }
      }
      g.globalCompositeOperation = 'source-over'
      for (let i = 0; i < bulbs.length; i++) {
        const b = bulbs[i]!
        const wave = Math.max(0, Math.sin(t * 0.9 - i * 0.42))
        const ph = (((i - t * 5) % 4) + 4) % 4
        g.globalAlpha = clamp((0.3 + 0.7 * wave * wave) * (1 - showAmt) + (ph < 1 ? 1 : 0.35) * showAmt, 0, 1)
        drawSprite(g, look.bulbLit, b.x, b.y, 20)
      }
      g.globalAlpha = 1

      // The glow: every lit peg's halo, kept in two quarter-size layers (each
      // peg belongs to one) that are only touched when a peg comes or goes.
      // Stamping uses 'screen', so a full board saturates softly instead of
      // burning out. The two layers breathe out of step: a slow twinkle at
      // rest, a quicker marquee shimmer during the show.
      frame++
      if (glowDirty && frame % 2 === 0) {
        glowDirty = false
        for (const ctx of glowCtx) {
          ctx.globalCompositeOperation = 'source-over'
          ctx.globalAlpha = 1
          ctx.fillRect(0, 0, glowW, glowH)
        }
        inGlow.fill(0)
      }
      for (let i = 0; i < N; i++) {
        const c = color[i]!
        if (c < 0 || inGlow[i] === 1 || t - placedAt[i]! < 0.1) continue
        const h = holes[i]!
        const ctx = glowCtx[group[i]!]!
        ctx.globalCompositeOperation = 'screen'
        ctx.globalAlpha = 0.86 * GAIN[c]!
        ctx.drawImage(look.halos[c]!, (h.x - BX + GM) * GS - HALO / 2, (h.y - BY + GM) * GS - HALO / 2, HALO, HALO)
        inGlow[i] = 1
      }
      g.globalCompositeOperation = 'lighter'
      const shimmer = showAmt * 0.15 * Math.sin(t * 6.5)
      g.globalAlpha = clamp(0.84 + 0.16 * Math.sin(t * 1.1) + shimmer, 0, 1)
      g.drawImage(glowLayers[0]!, BX - GM, BY - GM, BW + GM * 2, BH + GM * 2)
      g.globalAlpha = clamp(0.84 + 0.16 * Math.sin(t * 1.1 + 2.4) - shimmer, 0, 1)
      g.drawImage(glowLayers[1]!, BX - GM, BY - GM, BW + GM * 2, BH + GM * 2)
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'

      // Mirror lines, as faint tubes on the glass.
      const lineA = lit[1]! + lit[2]!
      const lineB = lit[2]!
      if (lineA > 0.02) {
        const breathe = 0.75 + 0.25 * Math.sin(t * 1.3)
        const tubeLine = (x1: number, y1: number, x2: number, y2: number, a: number): void => {
          g.beginPath()
          g.moveTo(x1, y1)
          g.lineTo(x2, y2)
          g.strokeStyle = `rgba(25,240,255,${0.14 * a * breathe})`
          g.lineWidth = 9
          g.stroke()
          g.strokeStyle = `rgba(190,250,255,${0.5 * a * breathe})`
          g.lineWidth = 2
          g.stroke()
        }
        const mx = BX + BW / 2
        const my = BY + BH / 2
        tubeLine(mx, lerp(my, BY + 8, lineA), mx, lerp(my, BY + BH - 8, lineA), clamp(lineA, 0, 1))
        if (lineB > 0.02) tubeLine(lerp(mx, BX + 8, lineB), my, lerp(mx, BX + BW - 8, lineB), my, lineB)
      }

      // The pegs themselves. A peg that has finished seating is stamped once
      // into the peg layer; only pegs in motion are drawn one by one.
      for (let i = 0; i < N; i++) {
        const c = color[i]!
        if (c < 0 || settled[i] === 1 || t - placedAt[i]! < 0.14) continue
        const h = holes[i]!
        pg.drawImage(look.pegs[c]!, h.x - BX - SPRITE / 2, h.y - BY - SPRITE / 2, SPRITE, SPRITE)
        settled[i] = 1
      }
      g.drawImage(pegLayer, BX, BY, BW, BH)
      for (let i = 0; i < N; i++) {
        const c = color[i]!
        if (c < 0) continue
        const fl = flash[i]!
        if (settled[i] === 1) {
          if (fl > 0.03) drawSprite(g, look.pegs[c]!, holes[i]!.x, holes[i]!.y, SPRITE * (1 + 0.14 * fl))
          continue
        }
        const age = t - placedAt[i]!
        if (age < 0) continue
        const h = holes[i]!
        const seat = ease.outCubic(clamp(age / 0.12, 0, 1))
        g.globalAlpha = age > 0.1 ? 1 : 0.5
        drawSprite(g, look.pegs[c]!, h.x, h.y, SPRITE * (1.55 - 0.55 * seat))
        g.globalAlpha = 1
      }
      // White-hot cores and a lens flare where a peg has just lit or sounded.
      g.globalCompositeOperation = 'lighter'
      for (let i = 0; i < N; i++) {
        const c = color[i]!
        if (c < 0) continue
        const age = t - placedAt[i]!
        const fl = flash[i]!
        const burst = age > 0.1 && age < 1 ? Math.exp(-(age - 0.1) * 5) : 0
        const hot = fl * 0.6 + burst * 0.7
        if (hot < 0.03) continue
        const h = holes[i]!
        // Its own colour swells for a moment, then a white core and a flare.
        g.globalAlpha = clamp((0.5 * burst + 0.45 * fl) * GAIN[c]!, 0, 1)
        drawSprite(g, look.blooms[c]!, h.x, h.y, 150 + 90 * burst + 70 * fl)
        g.globalAlpha = clamp(hot, 0, 1)
        drawSprite(g, look.blooms[BLOOM_WHITE]!, h.x, h.y, 40 + 24 * hot)
        drawSprite(g, look.flare, h.x, h.y, 50 + 80 * hot)
      }
      g.globalAlpha = 1

      // The show's beam and the glass over the board (clipped to the board).
      g.save()
      g.beginPath()
      g.rect(BX, BY, BW, BH)
      g.clip()
      if (showAmt > 0.02) {
        g.globalAlpha = showAmt
        g.drawImage(look.beam, beam - 46, BY, 92, BH)
        g.globalAlpha = 1
      }
      g.globalCompositeOperation = 'source-over'
      g.drawImage(look.overlay, BX, BY, BW, BH)
      g.globalCompositeOperation = 'lighter'
      const roll = ((t * 34) % (BH + 260)) - 130
      g.drawImage(look.shimmer, BX, BY + roll, BW, 130)
      g.restore()
      g.globalCompositeOperation = 'source-over'

      // Now and then a slow glint crosses the chrome.
      const gl = (t % 9) / 1.8
      if (gl < 1) {
        g.save()
        g.beginPath()
        g.roundRect(0, 0, stage.W, stage.H, 34)
        g.roundRect(24, 24, stage.W - 48, stage.H - 48, 10)
        g.roundRect(BX - 30, BY - 30, BW + 60, BH + 60, 22)
        g.roundRect(BX, BY, BW, BH, 8)
        g.clip('evenodd')
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = Math.sin(gl * Math.PI)
        g.transform(1, 0, -0.5, 1, lerp(-200, stage.W + 620, gl), 0)
        g.drawImage(look.glint, -130, 0, 260, stage.H)
        g.restore()
      }

      // Mirror buttons.
      for (let i = 0; i < 3; i++) {
        const by = BTN_Y[i]!
        const a = lit[i]!
        const size = (BTN_R + 4) * 2 * (1 - 0.09 * clamp(press[i]!.value, -0.5, 1))
        if (a < 0.98) drawSprite(g, look.buttons[i]![0], BTN_X, by, size)
        if (a > 0.02) {
          g.globalAlpha = a
          drawSprite(g, look.buttons[i]![1], BTN_X, by, size)
          g.globalCompositeOperation = 'lighter'
          g.globalAlpha = a * (0.42 + 0.06 * Math.sin(t * 1.5))
          drawSprite(g, look.blooms[4]!, BTN_X, by, 190)
          g.globalCompositeOperation = 'source-over'
          g.globalAlpha = 1
        }
      }

      // The lever: a chrome shaft from the pivot to a glossy ball.
      const pos = clamp(lever.value, -0.06, 1.06)
      grip = damp(grip, leverHeld ? 0.92 : 1, 0.5, 1)
      const ky = lerp(LEVER_OFF_Y, LEVER_ON_Y, pos)
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(LEVER_X, LEVER_PIVOT_Y)
      g.lineTo(LEVER_X, ky)
      g.strokeStyle = '#141032'
      g.lineWidth = 17
      g.stroke()
      g.strokeStyle = '#9fb2e6'
      g.lineWidth = 12
      g.stroke()
      g.beginPath()
      g.moveTo(LEVER_X - 2.5, LEVER_PIVOT_Y)
      g.lineTo(LEVER_X - 2.5, ky)
      g.strokeStyle = '#ffffff'
      g.lineWidth = 3.5
      g.stroke()
      drawSprite(g, look.knob, LEVER_X, ky, (KNOB_R + 4) * 2 * grip)
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = 0.16 + 0.04 * Math.sin(t * 1.3) + 0.4 * showAmt
      drawSprite(g, look.blooms[0]!, LEVER_X, ky, 200)
      if (showAmt > 0.02) {
        for (let i = 0; i < 5; i++) {
          const ph = (((i - t * 5) % 5) + 5) % 5
          const a = showAmt * (ph < 1 ? 1 : ph < 2 ? 0.6 : 0.32)
          g.globalAlpha = a
          drawSprite(g, look.blooms[SHOW_LIGHTS[i]!]!, LEVER_X + (i - 2) * 19, 596, 52)
          g.globalAlpha = a * 0.9
          drawSprite(g, look.blooms[BLOOM_WHITE]!, LEVER_X + (i - 2) * 19, 596, 15)
        }
      }
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'

      // Pegs on their way back to the tray, still warm.
      for (const f of fallers) {
        if (f.delay > 0) {
          drawSprite(g, look.pegs[f.color]!, f.x, f.y, SPRITE)
          continue
        }
        drawSprite(g, look.pegs[f.color]!, f.x, f.y, SPRITE * (0.86 + 0.08 * Math.sin(f.spin)))
      }
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = 0.5
      for (const f of fallers) drawSprite(g, look.blooms[f.color]!, f.x, f.y, f.delay > 0 ? 96 : 76)
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'
    },

    down(p: Pointer) {
      const touch: Touch = { kind: 'none', last: -1, lx: p.x, ly: p.y, start: 0, moved: false, told: false }
      touches.set(p.id, touch)
      if (inBoard(p.x, p.y, 22)) {
        const i = nearest(p.x, p.y)
        // Touching a peg of the colour in hand (or any peg, once that colour
        // has run out) pulls pegs; anything else pushes the colour in.
        touch.kind = color[i] === selected || (color[i]! >= 0 && stock[selected]! <= 0) ? 'pull' : 'place'
        act(touch, i)
        return
      }
      if (p.y >= 34 && p.y <= 650 && p.x <= 148) {
        setMirror(p.y < (BTN_Y[0] + BTN_Y[1]) / 2 ? 0 : p.y < (BTN_Y[1] + BTN_Y[2]) / 2 ? 1 : 2)
        return
      }
      if (p.y >= 34 && p.y <= 650 && p.x >= 1032) {
        touch.kind = 'lever'
        touch.start = lever.value
        leverHeld = true
        sfx.tone({ freq: 1300, dur: 0.03, type: 'triangle', vol: 0.04 })
        return
      }
      if (p.y >= TRAY_Y - 12 && p.y <= TRAY_Y + TRAY_H + 10 && p.x >= TRAY_X + tray.value) {
        if (p.x >= TRAY_X + tray.value + TRAY_BODY - 8) {
          if (p.x > 1160) return
          touch.kind = 'tray'
          // The handle gives a few pixels the moment it is gripped.
          tray.value = Math.max(tray.value, 5)
          tray.target = tray.value
          touch.start = tray.value
          trayHeld = true
          dumped = false
          sfx.noise({ dur: 0.1, freq: 320, vol: 0.07, filter: 'lowpass' })
          sfx.tone({ freq: 1500, dur: 0.03, type: 'triangle', vol: 0.03 })
          return
        }
        const c = clamp(Math.floor((p.x - TRAY_X - tray.value) / WELL), 0, COLORS.length - 1)
        selected = c
        touch.kind = 'well'
        bump[c]!.kick(36)
        // A small rattle of pegs and the colour's own note.
        sfx.noise({ dur: 0.03, freq: 2600, vol: 0.05, q: 3 })
        sfx.noise({ dur: 0.03, freq: 3400, vol: 0.04, q: 3, delay: 0.05 })
        sfx.tone({ freq: sfx.scale(c - 4), dur: 0.3, type: 'sine', vol: 0.07 })
        if (stock[c]! <= 0) emptyBlink[c] = 1
        return
      }
      // Bare chrome still answers: a tiny ring and a glassy tink.
      fx.ring(p.x, p.y, '#9ff4ff', 34, 0.3)
      sfx.tone({ freq: 2100, dur: 0.09, type: 'sine', vol: 0.03 })
    },

    move(p: Pointer) {
      const touch = touches.get(p.id)
      if (!touch) return
      if (touch.kind === 'well' && inBoard(p.x, p.y, 0)) {
        // Carrying a colour from the tray straight onto the board just works.
        touch.kind = 'place'
        touch.lx = p.x
        touch.ly = p.y
      }
      if (touch.kind === 'place' || touch.kind === 'pull') {
        paint(touch, p)
      } else if (touch.kind === 'lever') {
        if (Math.abs(p.y - p.startY) > 10) touch.moved = true
        const v = clamp(touch.start + (p.y - p.startY) / (LEVER_ON_Y - LEVER_OFF_Y), 0, 1)
        lever.value = v
        lever.target = v
        lever.vel = 0
        if (v > 0.7) setShow(true)
        else if (v < 0.3) setShow(false)
      } else if (touch.kind === 'tray') {
        const v = clamp(touch.start + p.x - p.startX, 0, TRAY_PULL)
        if (Math.abs(p.x - p.startX) > 8) touch.moved = true
        tray.value = v
        tray.target = v
        tray.vel = 0
        if (v >= TRAY_PULL * 0.55 && !dumped) {
          dumped = true
          dumpBoard()
        }
      }
    },

    up(p: Pointer) {
      const touch = touches.get(p.id)
      touches.delete(p.id)
      if (!touch) return
      if (touch.kind === 'lever') {
        leverHeld = false
        if (!touch.moved) setShow(!showOn)
      } else if (touch.kind === 'tray') {
        trayHeld = false
        tray.target = 0
        // A tap on the handle gives it a little rattle, nothing more.
        if (!touch.moved) tray.kick(260)
      }
    },

    dispose() {
      for (const c of [...look.all, ...glowLayers, pegLayer]) {
        c.width = 1
        c.height = 1
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'glow-pegs',
    name: 'Glow Pegs',
    emoji: '✨',
    ages: [3, 7],
    pitch: 'Push glowing pegs into a black board inside a chrome arcade cabinet, mirror them into patterns, then pull the lever and hear the picture play as a tune.',
    howTo: 'Touch a colour in the tray, then touch or drag on the board to push pegs in. Touch a peg of the colour you are holding to pull it out; any other peg is swapped. The three buttons on the left set the mirror. Pull the lever down for the show and lift it to stop. Pull the tray handle to the right to drop every peg back.',
    basedOn: 'the light-peg board toy (Lite-Brite), Montessori peg and pattern work, and the Waldorf pentatonic mood',
    whyFun: 'Each peg clicks in and blooms into neon under the finger, a drag leaves a line of light, and the mirror turns a scribble into a pattern.',
    set: 'gentle',
  },
  create,
}
