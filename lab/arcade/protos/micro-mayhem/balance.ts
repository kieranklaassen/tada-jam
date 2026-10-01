// BALANCE! Drag the penguin waiter left and right to stay under the wobbling
// stack of plates on its head until time is up.

import { circle, ellipse, rrect, shadow, sprite, star } from '../../kit/draw.ts'
import { clamp, rnd, spring } from '../../kit/math.ts'
import type { Pointer } from '../../kit/types.ts'
import { W } from '../../kit/types.ts'
import { poly, vgrad } from './micro.ts'
import type { Env, Micro, MicroDef } from './micro.ts'

const FLOOR = 735
const TRAY_Y = 438
const PLATES = 7
const LIMIT = 150

interface Debris {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  kind: 'plate' | 'pot'
  broken: boolean
}

function plate(g: CanvasRenderingContext2D, x: number, y: number, rot: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  ellipse(g, 0, 4, 74, 15, '#c7d3ea')
  ellipse(g, 0, 0, 78, 15, '#ffffff')
  ellipse(g, 0, -1, 56, 9, '#e3ecff')
  g.strokeStyle = '#5b8def'
  g.lineWidth = 3
  g.beginPath()
  g.ellipse(0, 0, 70, 12, 0, 0, Math.PI * 2)
  g.stroke()
  g.restore()
}

function make(env: Env): Micro {
  const { fx, sfx, stage } = env
  const lv = Math.min(env.level, 4)
  const pull = 6.5 + lv * 2.5
  const drag = 4 + lv * 0.6
  const gust = 150 + lv * 30
  let hand = W / 2
  let top = W / 2 + (stage.rand() < 0.5 ? -1 : 1) * 12
  let topV = 0
  let gustIn = 0.8
  let moved = 0
  let crunches = 0
  const debris: Debris[] = []
  const shards: { x: number; rot: number; s: number }[] = []
  const hop = spring(0, 220, 10)
  const settle = spring(0, 120, 6)

  const lean = () => (env.state === 'won' ? settle.value : top - hand)
  const plateAt = (i: number): [number, number, number] => {
    const k = i / (PLATES - 1)
    const o = lean()
    return [hand + o * k ** 1.5, TRAY_Y - 14 - i * 22 - hop.value * 30, (o / 330) * k]
  }

  const crash = () => {
    const dir = Math.sign(top - hand) || 1
    for (let i = 0; i < PLATES; i++) {
      const [x, y, rot] = plateAt(i)
      debris.push({ x, y, vx: dir * rnd(120, 300 + i * 50), vy: -rnd(0, 260), rot, spin: dir * rnd(2, 9), kind: 'plate', broken: false })
    }
    const [tx, ty] = plateAt(PLATES - 1)
    debris.push({ x: tx, y: ty - 50, vx: dir * 60, vy: -620, rot: 0, spin: dir * 5, kind: 'pot', broken: false })
    sfx.slideUp()
    fx.shake(8, 0.2)
    env.lose()
  }

  const drive = (p: Pointer) => {
    if (env.state !== 'play') return
    hand = clamp(hand + p.dx, 170, W - 170)
    moved += Math.abs(p.dx)
    if (moved > 150) {
      // Waddle steps.
      moved = 0
      sfx.tone({ freq: rnd(150, 190), to: 110, dur: 0.05, type: 'triangle', vol: 0.12 })
    }
  }

  return {
    update(dt) {
      hop.update(dt)
      settle.update(dt)
      if (env.state === 'play') {
        const o = top - hand
        topV += (pull * o - drag * topV) * dt
        gustIn -= dt
        if (gustIn <= 0 && env.t > 0) {
          gustIn = 1.1 / env.pace
          const dir = Math.abs(o) > 30 ? Math.sign(o) : stage.rand() < 0.5 ? -1 : 1
          topV += dir * gust * (0.6 + stage.rand() * 0.4)
          sfx.tone({ freq: 500, to: 700, dur: 0.08, type: 'sine', vol: 0.08 })
        }
        // Hold still before the clock starts, so the word can be read.
        if (env.t > 0) top += topV * dt
        if (Math.abs(top - hand) > LIMIT) crash()
      }
      for (const d of debris) {
        if (d.broken) continue
        d.vy += 1900 * dt
        d.x += d.vx * dt
        d.y += d.vy * dt
        d.rot += d.spin * dt
        if (d.kind === 'pot') {
          // The teapot comes back down on the waiter's head.
          d.x += (hand - d.x) * Math.min(1, dt * 6)
          if (d.vy > 0 && d.y >= TRAY_Y - 30) {
            d.broken = true
            sfx.thud(1.2)
            sfx.tone({ freq: 1100, dur: 0.3, type: 'triangle', vol: 0.14 })
            fx.shake(8, 0.2)
            fx.burst(hand, TRAY_Y - 30, { count: 8, color: '#fff35c', speed: 320, life: 0.5, size: 14, shape: 'star' })
          }
          continue
        }
        if (d.y >= FLOOR) {
          d.broken = true
          for (let i = 0; i < 4; i++) shards.push({ x: d.x + rnd(-50, 50), rot: rnd(0, 6), s: rnd(10, 22) })
          fx.burst(d.x, FLOOR, { count: 10, color: ['#ffffff', '#c7d3ea', '#5b8def'], speed: 460, life: 0.6, size: 13, shape: 'square', angle: -Math.PI / 2, spread: Math.PI, gravity: 1300 })
          if (crunches++ % 2 === 0) sfx.crunch()
          sfx.tone({ freq: rnd(1400, 2400), dur: 0.12, type: 'triangle', vol: 0.12 })
          fx.shake(11, 0.2)
        }
      }
    },
    draw(g) {
      const t = env.age
      const o = lean()
      const lost = env.state === 'lost'
      const won = env.state === 'won'
      for (const s of shards) {
        g.save()
        g.translate(s.x, FLOOR + 8)
        g.rotate(s.rot)
        poly(g, [-s.s, 0, s.s * 0.2, -s.s * 0.7, s.s, s.s * 0.3], '#ffffff', '#8aa7e8', 2)
        g.restore()
      }
      // The waiter.
      const wob = lost ? Math.sin(env.since * 14) * 0.18 : clamp(o / 600, -0.2, 0.2) + Math.sin(t * 16) * 0.025
      const jump = won ? Math.abs(Math.sin(env.since * 9)) * 40 : hop.value * 30
      shadow(g, hand, FLOOR + 8, 100, 1 - jump / 200)
      const by = FLOOR - jump
      const flap = lost ? Math.sin(env.since * 30) * 0.5 : clamp(Math.abs(o) / 150, 0, 1) * Math.sin(t * 26) * 0.5
      ellipse(g, hand - 40, by + 2, 36, 15, '#ff9d2e')
      ellipse(g, hand + 40, by + 2, 36, 15, '#ff9d2e')
      for (const side of [-1, 1]) ellipse(g, hand + side * 88, by - 112, 22, 62, '#23262e', side * (0.35 + flap))
      ellipse(g, hand, by - 94, 88, 100, '#23262e')
      ellipse(g, hand, by - 82, 60, 80, '#ffffff')
      sprite(g, '🐧', hand + wob * 40, by - 214, 176, wob)
      // Bow tie.
      poly(g, [hand - 32, by - 160, hand, by - 144, hand - 32, by - 128], '#ff4d6d')
      poly(g, [hand + 32, by - 160, hand, by - 144, hand + 32, by - 128], '#ff4d6d')
      circle(g, hand, by - 144, 9, '#c9304a')

      if (!lost) {
        // Tray, then the stack bending away from the hand, then the teapot.
        ellipse(g, hand, TRAY_Y - jump, 96, 13, '#aab4c8')
        ellipse(g, hand, TRAY_Y - 4 - jump, 96, 12, '#e8edf7')
        for (let i = 0; i < PLATES; i++) {
          const [x, y, rot] = plateAt(i)
          plate(g, x, y - jump, rot)
        }
        const [tx, ty, trot] = plateAt(PLATES - 1)
        sprite(g, '🫖', tx + o * 0.12, ty - 52 - jump, 100, trot * 1.6)
        // Sweat when it is about to go.
        const danger = clamp((Math.abs(o) - 80) / 70, 0, 1)
        if (danger > 0 && !won) sprite(g, '💦', hand + 120, FLOOR - 270 + Math.sin(t * 30) * 6, 40 + danger * 30)
        if (won) for (let i = 0; i < 5; i++) star(g, hand + Math.cos(t * 4 + i * 1.26) * 170, TRAY_Y - 130 + Math.sin(t * 4 + i * 1.26) * 120, 18, '#fff35c', t * 5 + i)
      } else {
        ellipse(g, hand + Math.sign(o) * 150, FLOOR + 4, 90, 12, '#e8edf7')
        for (const d of debris) {
          if (d.kind === 'plate' && !d.broken) plate(g, d.x, d.y, d.rot)
          if (d.kind === 'pot') sprite(g, '🫖', d.x, d.broken ? TRAY_Y - 6 : d.y, 120, d.broken ? Math.PI + Math.sin(env.since * 14) * 0.1 : d.rot)
        }
        for (let i = 0; i < 3; i++) {
          const a = env.since * 7 + (i / 3) * Math.PI * 2
          star(g, hand + Math.cos(a) * 110, TRAY_Y - 80 + Math.sin(a) * 24, 16, '#fff35c', a)
        }
      }
    },
    down(p) {
      if (env.state !== 'play') return
      hop.value = 0.5
      sfx.tone({ freq: rnd(300, 360), to: 440, dur: 0.07, type: 'triangle', vol: 0.14 })
      fx.burst(p.x, p.y, { count: 5, color: '#ffffff', speed: 200, life: 0.35, size: 9, gravity: 0 })
    },
    move: drive,
    timeout() {
      settle.value = top - hand
      settle.target = 0
      sfx.win()
      fx.burst(hand, TRAY_Y - 150, { count: 18, color: ['#fff35c', '#ffffff'], speed: 480, life: 0.7, size: 15, shape: 'star' })
      env.win()
    },
    hint() {
      return [hand, FLOOR - 80]
    },
  }
}

export const balance: MicroDef = {
  key: 'balance',
  word: 'BALANCE!',
  icon: '🍽️',
  winWord: 'TA-DA!',
  loseWord: 'CRASH!',
  backdrop(g) {
    vgrad(g, 0, 600, '#5c2346', '#8f3a5c')
    // Wallpaper stripes and a dado rail.
    g.fillStyle = 'rgba(255,255,255,0.05)'
    for (let x = 20; x < W; x += 90) g.fillRect(x, 0, 45, 600)
    rrect(g, -10, 470, W + 20, 140, 0, '#6e3b2a')
    g.fillStyle = '#8a4d36'
    g.fillRect(0, 470, W, 14)
    // Arched windows with an evening sky.
    for (const wx of [210, 970]) {
      g.beginPath()
      g.moveTo(wx - 90, 420)
      g.lineTo(wx - 90, 210)
      g.arc(wx, 210, 90, Math.PI, 0)
      g.lineTo(wx + 90, 420)
      g.closePath()
      g.fillStyle = '#2a2f6e'
      g.fill()
      g.strokeStyle = '#e6c27a'
      g.lineWidth = 12
      g.stroke()
      star(g, wx - 30, 200, 10, '#fff6c9')
      star(g, wx + 36, 260, 7, '#fff6c9')
      star(g, wx + 10, 330, 8, '#fff6c9')
    }
    // A chandelier.
    g.strokeStyle = '#e6c27a'
    g.lineWidth = 6
    g.beginPath()
    g.moveTo(W / 2, 0)
    g.lineTo(W / 2, 100)
    g.moveTo(W / 2 - 110, 130)
    g.quadraticCurveTo(W / 2, 60, W / 2 + 110, 130)
    g.stroke()
    for (const dx of [-110, -40, 40, 110]) {
      circle(g, W / 2 + dx, 138, 26, 'rgba(255,230,150,0.25)')
      circle(g, W / 2 + dx, 138, 12, '#fff3b0')
    }
    // Checkerboard floor.
    const rows = 4
    for (let r = 0; r < rows; r++) {
      const y0 = 600 + r * 55
      for (let c = -1; c < 12; c++) {
        g.fillStyle = (r + c) % 2 === 0 ? '#f3e6d0' : '#3a2a3a'
        g.fillRect(c * 110 + (r % 2) * 0, y0, 110, 56)
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.2)'
    g.fillRect(0, 600, W, 12)
    // Diners at side tables, watching.
    for (const [x, who, dir] of [[110, '🐻', 1], [1075, '🐷', -1]] as const) {
      sprite(g, who, x, 560, 130)
      ellipse(g, x + dir * 10, 690, 120, 26, 'rgba(0,0,0,0.2)')
      rrect(g, x - 12 + dir * 10, 640, 24, 80, 6, '#7a4a28')
      ellipse(g, x + dir * 10, 640, 125, 30, '#ffffff')
      ellipse(g, x + dir * 10, 636, 125, 28, '#fff6e6')
      sprite(g, '🕯️', x + dir * 50, 596, 60)
    }
  },
  make,
}
