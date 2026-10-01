// CATCH! Drag the basket under every egg the hen drops.

import { ellipse, rrect, shadow, sprite, squash, volume } from '../../kit/draw.ts'
import { clamp, damp, rnd, spring } from '../../kit/math.ts'
import type { Pointer } from '../../kit/types.ts'
import { H, W } from '../../kit/types.ts'
import { cloud, hills, poly, vgrad } from './micro.ts'
import type { Env, Micro, MicroDef } from './micro.ts'

const BEAM_Y = 232
const BASKET_Y = 660
const GROUND_Y = 738

interface Egg {
  x: number
  y: number
  vy: number
  at: number
  rot: number
  state: 'wait' | 'fall' | 'caught' | 'splat'
}

function make(env: Env): Micro {
  const { fx, sfx, stage } = env
  const count = env.level >= 4 ? 5 : env.level >= 2 ? 4 : 3
  const fall = 1.15 / Math.sqrt(env.pace)
  const gravity = (2 * (BASKET_Y - BEAM_Y)) / (fall * fall)
  const first = 0.45
  const gap = (env.dur - 0.4 - fall - first) / (count - 1)
  const eggs: Egg[] = []
  let x = 250 + stage.rand() * (W - 500)
  const reach = Math.min(400, 240 + gap * 160)
  for (let i = 0; i < count; i++) {
    eggs.push({ x, y: BEAM_Y, vy: 0, at: first + i * gap, rot: 0, state: 'wait' })
    let next = x + (stage.rand() < 0.5 ? -1 : 1) * (170 + stage.rand() * (reach - 170))
    if (next < 140 || next > W - 140) next = x - (next - x)
    x = clamp(next, 140, W - 140)
  }
  const basket = { x: W / 2, target: W / 2 }
  const basketSquash = spring(1, 260, 9)
  const hen = { x: eggs[0]!.x }
  const henSquash = spring(1, 220, 8)
  let caught = 0
  let step = 0
  let lastBlip = -1

  const steer = (p: Pointer) => {
    basket.target = clamp(p.x, 90, W - 90)
  }

  return {
    update(dt) {
      basket.x = damp(basket.x, basket.target, 24, dt)
      basketSquash.update(dt)
      henSquash.update(dt)
      const next = eggs.find((e) => e.state === 'wait')
      if (next && env.state === 'play') {
        hen.x = damp(hen.x, next.x, 9, dt)
        // Anticipation: she squats just before she lays.
        if (next.at - env.t < 0.2) henSquash.target = 0.72
        if (env.t >= next.at) {
          next.state = 'fall'
          next.x = hen.x
          henSquash.target = 1
          henSquash.value = 1.35
          sfx.tone({ freq: 520, to: 760, dur: 0.07, type: 'square', vol: 0.1 })
          sfx.tone({ freq: 620, to: 900, dur: 0.09, type: 'square', vol: 0.1, delay: 0.09 })
          fx.burst(hen.x, BEAM_Y - 20, { count: 5, color: '#ffffff', speed: 220, life: 0.5, size: 10, gravity: 300 })
        }
      }
      for (const egg of eggs) {
        if (egg.state !== 'fall') continue
        egg.vy += gravity * dt
        egg.y += egg.vy * dt
        egg.rot += dt * 5
        if (egg.y >= BASKET_Y - 30 && egg.y < BASKET_Y + 40 && Math.abs(egg.x - basket.x) < 104) {
          egg.state = 'caught'
          caught++
          basketSquash.value = 0.62
          sfx.pop(step)
          sfx.ding(step++)
          fx.burst(egg.x, BASKET_Y - 40, { count: 9, color: ['#fff35c', '#ffffff'], speed: 320, life: 0.5, size: 12, shape: 'star' })
          if (caught === count) {
            // Every egg hatches at once.
            for (let i = 0; i < count; i++) sfx.tone({ freq: 2100 + i * 160, to: 2700 + i * 160, dur: 0.07, type: 'sine', vol: 0.14, delay: 0.12 + i * 0.09 })
            env.win()
          }
        } else if (egg.y >= GROUND_Y) {
          egg.state = 'splat'
          egg.y = GROUND_Y
          sfx.splat()
          fx.shake(9)
          fx.burst(egg.x, GROUND_Y, { count: 18, color: ['#ffd23f', '#fffdf2', '#ffb02e'], speed: 480, life: 0.6, size: 13, angle: -Math.PI / 2, spread: Math.PI, gravity: 1100 })
          sfx.tone({ freq: 900, to: 400, dur: 0.25, type: 'square', vol: 0.1, delay: 0.1 })
          env.lose()
        }
      }
    },
    draw(g) {
      const t = env.age
      // Ground shadows for anything falling, so the landing spot is readable.
      for (const egg of eggs) {
        if (egg.state === 'fall') shadow(g, egg.x, GROUND_Y + 6, 46, clamp((egg.y - BEAM_Y) / (BASKET_Y - BEAM_Y), 0.2, 1), 0.2)
        if (egg.state === 'splat') {
          ellipse(g, egg.x, GROUND_Y + 8, 80, 22, '#fffdf2')
          ellipse(g, egg.x + 6, GROUND_Y + 4, 26, 12, '#ffc21a')
        }
      }
      // The hen on her beam.
      const upset = env.state === 'lost'
      const hy = BEAM_Y - 62 - (upset ? Math.abs(Math.sin(env.since * 14)) * 40 : 0) + Math.sin(t * 5) * 3
      const [hsx, hsy] = volume(clamp(henSquash.value, 0.5, 1.5))
      sprite(g, '🐔', hen.x, hy + (1 - hsy) * 60, 140, upset ? Math.sin(env.since * 30) * 0.2 : Math.sin(t * 3) * 0.05, hsx, hsy)
      for (const egg of eggs) if (egg.state === 'fall') sprite(g, '🥚', egg.x, egg.y, 78, Math.sin(egg.rot) * 0.4, 1, 1 + clamp(egg.vy / 5000, 0, 0.25))

      // The basket, with whatever it holds peeking over the rim.
      shadow(g, basket.x, GROUND_Y + 8, 110)
      const [sx, sy] = volume(clamp(basketSquash.value, 0.5, 1.5))
      const lean = clamp((basket.target - basket.x) / 260, -0.3, 0.3)
      squash(g, basket.x, BASKET_Y + 78, sx, sy, () => {
        for (let i = 0; i < caught; i++) {
          const ex = basket.x + (i - (caught - 1) / 2) * 44
          if (env.state === 'won') {
            const hop = Math.abs(Math.sin(env.since * 9 + i * 1.3)) * 46 * clamp(env.since * 5 - i * 0.4, 0, 1)
            sprite(g, '🐣', ex, BASKET_Y - 46 - hop, 86)
          } else {
            sprite(g, '🥚', ex, BASKET_Y - 34, 66, (i - 1) * 0.2)
          }
        }
        sprite(g, '🧺', basket.x, BASKET_Y + 6, 190)
      }, lean)
    },
    down(p) {
      steer(p)
      if (env.state !== 'play') return
      basketSquash.value = 0.85
      if (env.age - lastBlip > 0.12) {
        lastBlip = env.age
        sfx.note(-5 + Math.round(rnd(0, 3)), 0.07, 'triangle', 0.12)
      }
    },
    move: steer,
    timeout() {
      if (eggs.every((e) => e.state === 'caught')) env.win()
      else env.lose()
    },
    hint() {
      const egg = eggs.find((e) => e.state === 'fall') ?? eggs.find((e) => e.state === 'wait')
      return [egg ? egg.x : W / 2, BASKET_Y + 10]
    },
  }
}

export const catchEggs: MicroDef = {
  key: 'catch',
  word: 'CATCH!',
  icon: '🥚',
  winWord: 'CHEEP!',
  loseWord: 'SPLAT!',
  backdrop(g) {
    vgrad(g, 0, H, '#ffcf8a', '#fff0cf')
    cloud(g, 880, 120, 0.8, 'rgba(255,255,255,0.75)')
    hills(g, 610, 46, '#c9d977', 1.2)
    // The barn.
    poly(g, [60, 720, 60, 400, 230, 290, 400, 400, 400, 720], '#d9453d', '#9c2a27', 6)
    poly(g, [40, 410, 230, 280, 420, 410, 400, 430, 230, 315, 60, 430], '#fffdf2')
    rrect(g, 170, 530, 120, 190, 8, '#8f2622', '#fffdf2', 8)
    g.strokeStyle = '#fffdf2'
    g.lineWidth = 8
    g.beginPath()
    g.moveTo(174, 534)
    g.lineTo(286, 716)
    g.moveTo(286, 534)
    g.lineTo(174, 716)
    g.stroke()
    rrect(g, 195, 390, 70, 70, 35, '#5a2320', '#fffdf2', 8)
    // Straw yard and hay bales.
    hills(g, 730, 10, '#e8c25a', 3, 0.02)
    rrect(g, 930, 640, 190, 100, 14, '#f0cf6a', '#c79a36', 6)
    rrect(g, 970, 560, 150, 90, 14, '#f5d87c', '#c79a36', 6)
    g.strokeStyle = '#c79a36'
    g.lineWidth = 5
    for (const bx of [990, 1060]) {
      g.beginPath()
      g.moveTo(bx, 644)
      g.lineTo(bx, 736)
      g.stroke()
    }
    // The beam the hen walks on, and its two posts.
    rrect(g, W - 120, BEAM_Y, 30, 520, 6, '#8a5a36')
    rrect(g, -20, BEAM_Y - 4, W + 40, 30, 10, '#a36e44', '#6e452a', 5)
    hills(g, 770, 8, '#d9ae45', 1, 0.03)
  },
  make,
}
