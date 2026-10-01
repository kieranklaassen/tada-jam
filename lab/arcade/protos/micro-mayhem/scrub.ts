// SCRUB! Rub the mud off the window before time runs out. Whoever is in the
// bath behind it did not expect company.

import { circle, ellipse, rrect, sprite, star } from '../../kit/draw.ts'
import { clamp, dist, ease, lerp, pick, rnd, TAU } from '../../kit/math.ts'
import type { Pointer } from '../../kit/types.ts'
import { H, W } from '../../kit/types.ts'
import { poly, vgrad } from './micro.ts'
import type { Env, Micro, MicroDef } from './micro.ts'

const WX = 210
const WY = 140
const WW = 760
const WH = 490
const COLS = 12
const ROWS = 8
const BATHERS = ['🦖', '🐷', '🐙', '👽', '🐻', '🦄', '🐸', '🤖'] as const

function make(env: Env): Micro {
  const { fx, sfx, stage } = env
  const radius = env.level === 0 ? 104 : 96
  const bather = pick(BATHERS, stage.rand())
  const dirt = document.createElement('canvas')
  dirt.width = WW
  dirt.height = WH
  const d = dirt.getContext('2d')
  if (d) {
    d.fillStyle = '#7a5a3a'
    d.fillRect(0, 0, WW, WH)
    for (let i = 0; i < 70; i++) {
      d.fillStyle = pick(['#5e4429', '#8c6a45', '#6b4d2f', '#94724c'], stage.rand())
      d.globalAlpha = 0.5 + stage.rand() * 0.4
      d.beginPath()
      d.arc(stage.rand() * WW, stage.rand() * WH, 20 + stage.rand() * 60, 0, TAU)
      d.fill()
    }
    // A few fresh splats with drips, so it reads as mud and not as a brown wall.
    d.globalAlpha = 1
    for (let i = 0; i < 7; i++) {
      const x = 60 + stage.rand() * (WW - 120)
      const y = 50 + stage.rand() * (WH - 160)
      d.fillStyle = '#4a3420'
      d.beginPath()
      d.arc(x, y, 34, 0, TAU)
      for (let j = 0; j < 6; j++) {
        const a = stage.rand() * TAU
        d.moveTo(x + Math.cos(a) * 46, y + Math.sin(a) * 46)
        d.arc(x + Math.cos(a) * 46, y + Math.sin(a) * 46, 8 + stage.rand() * 10, 0, TAU)
      }
      d.fill()
      // One short drip.
      const drip = 30 + stage.rand() * 40
      d.beginPath()
      d.moveTo(x - 9, y + 20)
      d.lineTo(x + 9, y + 20)
      d.lineTo(x + 5, y + 30 + drip)
      d.arc(x, y + 30 + drip, 6, 0, Math.PI)
      d.closePath()
      d.fill()
    }
  }
  const clean: boolean[] = new Array<boolean>(COLS * ROWS).fill(false)
  let cleaned = 0
  const sponge = { x: WX + WW - 110, y: WY + WH - 90, px: 0, py: 0, has: false, tilt: 0 }
  let travel = 0
  let bubbleIn = 0
  let fade = 1
  let birdSplat = false

  const erase = (x: number, y: number) => {
    if (!d) return
    d.globalCompositeOperation = 'destination-out'
    d.globalAlpha = 1
    d.beginPath()
    d.arc(x - WX, y - WY, radius, 0, TAU)
    d.fill()
    d.globalCompositeOperation = 'source-over'
    const reach = radius - 6
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c
        if (clean[i]) continue
        if (dist(x, y, WX + (c + 0.5) * (WW / COLS), WY + (r + 0.5) * (WH / ROWS)) < reach) {
          clean[i] = true
          cleaned++
        }
      }
    }
  }

  const rub = (p: Pointer, first: boolean) => {
    sponge.x = p.x
    sponge.y = p.y
    if (env.state !== 'play') return
    const fromX = first || !sponge.has ? p.x : sponge.px
    const fromY = first || !sponge.has ? p.y : sponge.py
    const len = dist(fromX, fromY, p.x, p.y)
    const steps = Math.max(1, Math.ceil(len / 30))
    for (let i = 1; i <= steps; i++) erase(lerp(fromX, p.x, i / steps), lerp(fromY, p.y, i / steps))
    sponge.tilt = clamp((p.x - fromX) / 60, -0.5, 0.5)
    sponge.px = p.x
    sponge.py = p.y
    sponge.has = true
    travel += len
    bubbleIn -= len
    if (first || travel > 120) {
      travel = 0
      const f = rnd(900, 1500)
      sfx.tone({ freq: f, to: f * 1.35, dur: 0.07, type: 'sine', vol: 0.09 })
    }
    if (first || bubbleIn <= 0) {
      bubbleIn = 46
      fx.burst(p.x, p.y, { count: first ? 6 : 2, color: ['#ffffff', '#cfefff'], speed: 170, life: 0.6, size: 16, shape: 'ring', gravity: -120 })
    }
    if (cleaned >= COLS * ROWS * 0.72) {
      sfx.slideUp()
      for (let i = 0; i < 4; i++) sfx.tone({ freq: 1800 + i * 300, dur: 0.12, type: 'sine', vol: 0.1, delay: i * 0.06 })
      for (let i = 0; i < 7; i++) fx.burst(WX + rnd(60, WW - 60), WY + rnd(50, WH - 50), { count: 3, color: '#ffffff', speed: 120, life: 0.7, size: 22, shape: 'star', gravity: 0 })
      fx.text(WX + WW - 130, WY + 250, 'EEK!', { size: 84, color: '#ffffff', life: 1.0 })
      // The bather's shriek.
      sfx.tone({ freq: 900, to: 1700, dur: 0.3, type: 'sawtooth', vol: 0.09, delay: 0.15 })
      env.win()
    }
  }

  return {
    update(dt) {
      if (env.state === 'won') fade = Math.max(0, fade - dt / 0.22)
      sponge.tilt *= 1 - Math.min(1, dt * 6)
      if (env.state === 'lost' && !birdSplat && env.since > 0.38) {
        birdSplat = true
        sfx.splat()
        fx.shake(8, 0.2)
        fx.burst(W / 2 + 40, WY + 200, { count: 16, color: ['#ffffff', '#e8f0e0'], speed: 420, life: 0.5, size: 14 })
      }
    },
    draw(g) {
      const t = env.age
      const won = env.state === 'won'
      // Inside: the bather, the tub, and bubbles, all live so they can react.
      g.save()
      g.beginPath()
      g.rect(WX, WY, WW, WH)
      g.clip()
      const shock = won ? ease.outBack(clamp(env.since / 0.2, 0, 1)) : 0
      const bx = WX + WW / 2
      const by = WY + 235 - shock * 70 + Math.sin(t * 2.2) * 6
      sprite(g, bather, bx, by, 230 + shock * 30, won ? Math.sin(env.since * 40) * 0.08 : Math.sin(t * 1.7) * 0.06)
      if (!won) sprite(g, '🎵', bx + 170, WY + 120 + Math.sin(t * 3) * 14, 60, Math.sin(t * 2) * 0.3)
      // Shower cap.
      ellipse(g, bx, by - 108, 92, 40, '#ff9ecb')
      ellipse(g, bx, by - 82, 100, 16, '#ffc4df')
      // Tub.
      rrect(g, bx - 250, WY + 300, 500, 190, 70, '#ffffff', '#c9d6e8', 8)
      rrect(g, bx - 275, WY + 286, 550, 44, 22, '#ffffff', '#c9d6e8', 8)
      for (let i = 0; i < 9; i++) circle(g, bx - 220 + i * 55, WY + 286 + Math.sin(t * 3 + i) * 6, 30 + (i % 3) * 8, 'rgba(255,255,255,0.95)', 'rgba(190,225,255,0.9)', 3)
      if (won && env.since > 0.5) {
        // Curtains, quick.
        const k = ease.outCubic(clamp((env.since - 0.5) / 0.25, 0, 1))
        for (const side of [-1, 1]) {
          const edge = bx + side * (WW / 2) * (1 - k)
          const x0 = side < 0 ? WX : edge
          const x1 = side < 0 ? edge : WX + WW
          g.fillStyle = '#ff7a9a'
          g.fillRect(x0, WY, x1 - x0, WH)
          g.fillStyle = 'rgba(255,255,255,0.35)'
          for (let x = x0 + 14; x < x1; x += 46) g.fillRect(x, WY, 12, WH)
        }
      }
      if (fade > 0) {
        g.globalAlpha = fade
        g.drawImage(dirt, WX, WY)
        g.globalAlpha = 1
      }
      if (birdSplat) {
        const sx = W / 2 + 40
        const sy = WY + 200
        g.fillStyle = '#f4f7ee'
        g.beginPath()
        g.arc(sx, sy, 60, 0, TAU)
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9
          g.moveTo(sx + Math.cos(a) * 80, sy + Math.sin(a) * 70)
          g.arc(sx + Math.cos(a) * 80, sy + Math.sin(a) * 70, 16 + (i % 3) * 8, 0, TAU)
        }
        g.fill()
        rrect(g, sx - 14, sy, 28, 90 + clamp(env.since - 0.38, 0, 1) * 120, 14, '#f4f7ee')
      } else if (!won) {
        // Glass glint.
        g.globalAlpha = 0.16
        poly(g, [WX + 60, WY, WX + 170, WY, WX + 40, WY + WH, WX - 70, WY + WH], '#ffffff')
        g.globalAlpha = 1
      }
      g.restore()
      // Frame over the glass.
      g.strokeStyle = '#fff6e0'
      g.lineWidth = 22
      g.strokeRect(WX, WY, WW, WH)
      g.lineWidth = 12
      g.beginPath()
      g.moveTo(WX + WW / 2, WY)
      g.lineTo(WX + WW / 2, WY + WH)
      g.moveTo(WX, WY + WH / 2)
      g.lineTo(WX + WW, WY + WH / 2)
      g.stroke()
      g.strokeStyle = 'rgba(120,80,40,0.35)'
      g.lineWidth = 4
      g.strokeRect(WX - 12, WY - 12, WW + 24, WH + 24)

      if (env.state === 'lost') {
        const k = clamp(env.since / 0.9, 0, 1)
        sprite(g, '🐦', lerp(-80, W + 80, k), 110 - Math.sin(k * Math.PI) * 50, 110, 0, -1, 1)
      }
      const held = env.finger() !== null
      const idle = held ? 0 : Math.abs(Math.sin(t * 5)) * 14
      sprite(g, '🧽', sponge.x, sponge.y - idle, held ? 150 : 130, sponge.tilt + (held ? Math.sin(t * 40) * 0.08 : 0))
      if (won) for (let i = 0; i < 6; i++) star(g, WX + 80 + i * 105, WY + 60 + ((i * 137) % 300), 14 + Math.sin(t * 9 + i) * 8, '#ffffff', t * 3 + i)
    },
    down(p) {
      rub(p, true)
    },
    move(p) {
      rub(p, false)
    },
    timeout() {
      sfx.tone({ freq: 1300, to: 900, dur: 0.12, type: 'sine', vol: 0.12 })
      sfx.tone({ freq: 1500, to: 1000, dur: 0.12, type: 'sine', vol: 0.12, delay: 0.16 })
      env.lose()
    },
    hint() {
      // A zigzag across the glass.
      const k = (env.age * 0.7) % 1
      return [WX + 90 + (Math.abs(((k * 3) % 2) - 1)) * (WW - 180), WY + 80 + k * (WH - 160)]
    },
  }
}

export const scrub: MicroDef = {
  key: 'scrub',
  word: 'SCRUB!',
  icon: '🧽',
  winWord: 'SQUEAKY!',
  loseWord: 'YUCK!',
  backdrop(g) {
    // A brick wall.
    g.fillStyle = '#c96a4a'
    g.fillRect(0, 0, W, H)
    const bw = 118
    const bh = 52
    for (let row = 0; row * bh < H; row++) {
      for (let col = -1; col * bw < W; col++) {
        const x = col * bw + (row % 2) * (bw / 2)
        const y = row * bh
        g.fillStyle = (row * 7 + col * 3) % 5 === 0 ? '#d97d5a' : (row + col) % 4 === 0 ? '#b85c40' : '#c96a4a'
        g.fillRect(x + 3, y + 3, bw - 6, bh - 6)
      }
    }
    vgrad(g, 700, H, '#6cc25a', '#4fa845')
    // The bathroom behind the glass: tiles.
    g.fillStyle = '#bfe6f5'
    g.fillRect(WX, WY, WW, WH)
    g.fillStyle = '#d6f1fb'
    g.save()
    g.beginPath()
    g.rect(WX, WY, WW, WH)
    g.clip()
    for (let y = WY; y < WY + WH; y += 58) for (let x = WX - 29 + (((y - WY) / 58) % 2) * 29; x < WX + WW; x += 58) g.fillRect(x + 3, y + 3, 52, 52)
    g.restore()
    // Sill and a flower box.
    rrect(g, WX - 40, WY + WH + 10, WW + 80, 30, 8, '#fff6e0', '#c9b28a', 4)
    rrect(g, WX + 60, WY + WH + 40, WW - 120, 70, 12, '#8a5a36', '#5e3a22', 5)
    for (let i = 0; i < 8; i++) sprite(g, i % 2 ? '🌷' : '🌼', WX + 110 + i * 78, WY + WH + 36, 64)
    // A drainpipe.
    rrect(g, 80, -10, 46, H - 100, 10, '#7f8aa3', '#5a6480', 5)
    rrect(g, 70, 300, 66, 22, 6, '#5a6480')
    rrect(g, 1060, 200, 70, 90, 8, '#fff6e0', '#c9b28a', 6)
  },
  make,
}
