// STOP! One tap stops the spinning wheel. Land the star under the pointer.

import { circle, ellipse, rrect, sprite, star } from '../../kit/draw.ts'
import { clamp, ease, shuffle, spring, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { poly, vgrad } from './micro.ts'
import type { Env, Micro, MicroDef } from './micro.ts'

const CX = W / 2
const CY = 455
const R = 250
const JUNK: readonly [string, string][] = [
  ['💩', 'EWW!'],
  ['🧦', 'STINKY!'],
  ['🐌', 'SLIMY!'],
  ['🥦', 'BROCCOLI!'],
  ['🦴', 'A BONE?'],
  ['🧅', 'ONION!'],
  ['🪳', 'A BUG!'],
  ['🧻', 'LOO ROLL!'],
]
const SLICE_COLORS = ['#ff5d6c', '#4db8ff', '#5ed36a', '#b07cff', '#ff8a3c']

interface Slice {
  from: number
  to: number
  icon: string
  word: string
  color: string
  star: boolean
}

function norm(a: number): number {
  return ((a % TAU) + TAU) % TAU
}

function make(env: Env): Micro {
  const { fx, sfx, stage } = env
  const starWidth = (Math.max(50, 86 - env.level * 9) / 360) * TAU
  const junk = shuffle(JUNK, stage.rand).slice(0, 5)
  const junkWidth = (TAU - starWidth) / junk.length
  const slices: Slice[] = [{ from: 0, to: starWidth, icon: '⭐', word: 'JACKPOT!', color: '#ffd23f', star: true }]
  junk.forEach(([icon, word], i) => slices.push({ from: starWidth + i * junkWidth, to: starWidth + (i + 1) * junkWidth, icon, word, color: SLICE_COLORS[i % SLICE_COLORS.length]!, star: false }))
  const dir = stage.rand() < 0.5 ? -1 : 1
  const speed = dir * (2.3 + env.level * 0.45)
  // Start with the star well away from the pointer, so there is a wait for it.
  let angle = -Math.PI / 2 - starWidth / 2 + Math.PI + (stage.rand() - 0.5) * 1.2
  let stopped = false
  let landed: Slice | null = null
  let lastSlice = -1
  const wobble = spring(0, 260, 7)
  const needle = spring(0, 320, 8)

  // The wheel-local angle sitting under the pointer at the top.
  const under = () => norm(-Math.PI / 2 - angle)
  const sliceAt = (a: number) => slices.findIndex((s) => a >= s.from && a < s.to)

  const stopNow = () => {
    if (stopped || env.state !== 'play') return
    stopped = true
    let a = under()
    // Fudge in the child's favour: a near miss on either side counts.
    const margin = 0.14
    if (a > TAU - margin) {
      angle -= TAU - a + 0.06
      a = under()
    } else if (a > starWidth && a < starWidth + margin) {
      angle += a - starWidth + 0.06
      a = under()
    }
    landed = slices[Math.max(0, sliceAt(a))]!
    wobble.value = -speed * 0.05
    needle.kick(-dir * 14)
    sfx.thud(1)
    sfx.tone({ freq: 1200, to: 300, dur: 0.12, type: 'square', vol: 0.12 })
    fx.shake(9, 0.2)
    fx.hitstop(70)
    if (landed.star) {
      for (let i = 0; i < 5; i++) env.after(i * 0.08, () => sfx.coin(i * 2))
      fx.burst(CX, CY - R, { count: 30, color: ['#ffd23f', '#fff35c', '#ffffff'], speed: 760, life: 1.0, size: 18, shape: 'star', gravity: 900 })
      fx.flash('#fff35c', 0.4, 0.2)
      env.win()
    } else {
      sfx.splat()
      env.lose()
    }
  }

  return {
    update(dt) {
      wobble.update(dt)
      needle.update(dt)
      if (!stopped && env.state === 'play') {
        angle += speed * dt
        const i = sliceAt(under())
        if (i !== lastSlice) {
          // A peg flicks the pointer on every boundary.
          if (lastSlice >= 0) {
            sfx.tick()
            needle.kick(-dir * 9)
          }
          lastSlice = i
        }
      }
    },
    draw(g) {
      const t = env.age
      const a = angle + wobble.value
      // Stand.
      poly(g, [CX - 60, H - 30, CX + 60, H - 30, CX + 24, CY, CX - 24, CY], '#5b3a8a')
      ellipse(g, CX, H - 34, 190, 30, '#3d2466')
      // Rim with chasing bulbs.
      circle(g, CX, CY + 8, R + 30, 'rgba(0,0,0,0.3)')
      circle(g, CX, CY, R + 28, '#ffb02e', '#d9861a', 8)
      const chase = env.state === 'won' ? Math.floor(t * 16) : Math.floor(t * 5)
      for (let i = 0; i < 20; i++) {
        const b = (i / 20) * TAU
        const on = env.state === 'won' ? (i + chase) % 2 === 0 : (i + chase) % 4 === 0
        circle(g, CX + Math.cos(b) * (R + 14), CY + Math.sin(b) * (R + 14), 9, on ? '#fffbe0' : '#c9861a')
      }
      // Slices.
      g.save()
      g.translate(CX, CY)
      g.rotate(a)
      for (const s of slices) {
        g.beginPath()
        g.moveTo(0, 0)
        g.arc(0, 0, R, s.from, s.to)
        g.closePath()
        g.fillStyle = s.color
        g.fill()
        g.strokeStyle = '#ffffff'
        g.lineWidth = 6
        g.stroke()
        const mid = (s.from + s.to) / 2
        g.save()
        g.rotate(mid)
        g.translate(R * 0.63, 0)
        g.rotate(Math.PI / 2)
        if (s.star) {
          circle(g, 0, 0, 66 + Math.sin(t * 8) * 6, 'rgba(255,255,255,0.45)')
          sprite(g, '⭐', 0, 0, 120 + Math.sin(t * 8) * 10)
        } else {
          sprite(g, s.icon, 0, 0, 96)
        }
        g.restore()
      }
      g.restore()
      circle(g, CX, CY, 34, '#ffffff', '#d9861a', 8)
      // The pointer.
      g.save()
      g.translate(CX, CY - R - 36)
      g.rotate(clamp(needle.value, -0.7, 0.7))
      poly(g, [-30, -26, 30, -26, 0, 58], '#ff3b5c', '#ffffff', 7)
      circle(g, 0, -20, 14, '#ffffff')
      g.restore()

      // Whatever it landed on jumps out at you.
      if (landed && !landed.star) {
        const k = ease.outBack(clamp(env.since / 0.3, 0, 1))
        sprite(g, landed.icon, CX, CY - 30, 120 + 250 * k, Math.sin(env.since * 12) * 0.15)
      }
    },
    down(p) {
      if (stopped) {
        sfx.tick()
        return
      }
      fx.ring(p.x, p.y, '#fff35c', 120, 0.3)
      stopNow()
    },
    timeout() {
      stopNow()
    },
    resultWord() {
      return landed ? landed.word : null
    },
    hint() {
      return [CX, CY + 40]
    },
  }
}

export const stop: MicroDef = {
  key: 'stop',
  word: 'STOP!',
  icon: '⭐',
  winWord: 'JACKPOT!',
  loseWord: 'EWWW!',
  backdrop(g) {
    vgrad(g, 0, H, '#2a1a5e', '#5a2d8f')
    // Spotlights.
    for (const [x, dx] of [[150, 260], [W - 150, -260]] as const) {
      g.beginPath()
      g.moveTo(x, -20)
      g.lineTo(x + dx - 200, H)
      g.lineTo(x + dx + 200, H)
      g.closePath()
      g.fillStyle = 'rgba(255,255,220,0.09)'
      g.fill()
    }
    // Stage floor.
    ellipse(g, W / 2, H + 40, 760, 170, '#3d2466')
    ellipse(g, W / 2, H + 60, 700, 150, '#4b2d7a')
    // Curtains either side, and a scalloped pelmet.
    for (const side of [0, 1]) {
      const x0 = side ? W - 190 : 0
      for (let i = 0; i < 4; i++) {
        const x = x0 + i * 48
        const grad = g.createLinearGradient(x, 0, x + 48, 0)
        grad.addColorStop(0, '#a3122e')
        grad.addColorStop(0.5, '#e0304d')
        grad.addColorStop(1, '#a3122e')
        g.fillStyle = grad
        g.fillRect(x, 0, 49, H)
      }
    }
    for (let i = 0; i < 9; i++) {
      circle(g, 66 + i * 131, 38, 78, '#c21e3c')
      circle(g, 66 + i * 131, 30, 70, '#e0304d')
    }
    rrect(g, -10, -10, W + 20, 50, 0, '#c21e3c')
    for (let i = 0; i < 9; i++) star(g, 66 + i * 131, 84, 12, '#ffd23f')
    // Sparkle dots.
    g.fillStyle = 'rgba(255,255,255,0.3)'
    for (let i = 0; i < 30; i++) g.fillRect(220 + ((i * 251) % 740), 140 + ((i * 97) % 300), 4, 4)
  },
  make,
}
