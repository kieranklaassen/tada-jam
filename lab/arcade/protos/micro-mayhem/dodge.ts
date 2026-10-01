// DODGE! Drag the rooster out from under the falling anvils until time is up.

import { circle, ellipse, shadow, sprite, star } from '../../kit/draw.ts'
import { clamp, damp, rnd, spring } from '../../kit/math.ts'
import type { Pointer } from '../../kit/types.ts'
import { H, W } from '../../kit/types.ts'
import { poly, vgrad } from './micro.ts'
import type { Env, Micro, MicroDef } from './micro.ts'

const GROUND = 690

interface Anvil {
  x: number
  y: number
  t: number
  fall: number
  landed: boolean
  tilt: number
}

function anvil(g: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(s, s)
  // Base up: foot, waist, then the face with its horn.
  poly(g, [-52, 0, 52, 0, 40, -24, -40, -24], '#3b4152')
  poly(g, [-24, -24, 24, -24, 30, -52, -30, -52], '#4a5166')
  poly(g, [-62, -52, 58, -52, 58, -62, 110, -84, 58, -96, -62, -96], '#5b6480')
  poly(g, [-62, -96, 58, -96, 52, -88, -56, -88], '#8590b0')
  g.restore()
}

function make(env: Env): Micro {
  const { fx, sfx } = env
  const fall = 1.0 / Math.sqrt(env.pace)
  const gap = Math.max(0.42, 0.85 - env.level * 0.09)
  const bird = { x: W / 2, target: W / 2, face: 1, flat: false }
  const hop = spring(0, 200, 10)
  const anvils: Anvil[] = []
  let nextAt = 0.35
  let aimed = true
  let lastCluck = -1

  const steer = (p: Pointer) => {
    bird.target = clamp(p.x, 80, W - 80)
  }

  return {
    update(dt) {
      hop.update(dt)
      if (!bird.flat) {
        const before = bird.x
        bird.x = damp(bird.x, bird.target, 16, dt)
        if (Math.abs(bird.x - before) > 0.5) bird.face = bird.x > before ? 1 : -1
      }
      if (env.state === 'play' && env.t >= nextAt && env.t + fall < env.dur - 0.15) {
        nextAt = env.t + gap
        // Every other one is aimed right at the rooster, so standing still loses.
        const x = aimed ? bird.x + rnd(-30, 30) : rnd(100, W - 100)
        aimed = !aimed
        anvils.push({ x: clamp(x, 90, W - 90), y: -120, t: 0, fall, landed: false, tilt: rnd(-0.12, 0.12) })
        sfx.tone({ freq: 1500, to: 380, dur: fall, type: 'sine', vol: 0.07 })
      }
      for (const a of anvils) {
        if (a.landed) continue
        a.t += dt
        const k = clamp(a.t / a.fall, 0, 1)
        a.y = -120 + (GROUND + 120) * k * k
        if (k < 1) continue
        a.landed = true
        a.y = GROUND
        sfx.thud(1.5)
        sfx.tone({ freq: 880, dur: 0.25, type: 'triangle', vol: 0.12 })
        fx.burst(a.x, GROUND, { count: 12, color: ['#e8c48a', '#fff1d0'], speed: 380, life: 0.5, size: 14, angle: -Math.PI / 2, spread: Math.PI * 0.9, gravity: 700 })
        if (env.state === 'play' && Math.abs(a.x - bird.x) < 86) {
          bird.flat = true
          bird.x = a.x
          fx.hitstop(90)
          fx.shake(18, 0.4)
          fx.burst(a.x, GROUND - 30, { count: 26, color: ['#ffffff', '#fff1d0', '#ff5d5d'], speed: 620, life: 0.9, size: 15, gravity: 500, drag: 0.95 })
          sfx.crunch()
          sfx.tone({ freq: 700, to: 250, dur: 0.3, type: 'square', vol: 0.12, delay: 0.1 })
          env.lose()
        } else {
          fx.shake(7, 0.18)
          if (env.state === 'play') hop.value = 0.5
        }
      }
    },
    draw(g) {
      const t = env.age
      for (const a of anvils) {
        if (a.landed) continue
        // The shadow grows where it will land: that is the tell.
        const k = clamp(a.t / a.fall, 0, 1)
        ellipse(g, a.x, GROUND + 6, 30 + k * 70, 8 + k * 16, `rgba(60,20,20,${0.15 + k * 0.4})`)
        if (k < 0.7) {
          g.globalAlpha = 0.5 + Math.sin(t * 30) * 0.3
          sprite(g, '⚠️', a.x, GROUND - 120, 46)
          g.globalAlpha = 1
        }
      }
      for (const a of anvils) if (a.landed && !(bird.flat && a.x === bird.x)) anvil(g, a.x, a.y + 14, 1, a.tilt)

      if (bird.flat) {
        sprite(g, '🐓', bird.x, GROUND + 2, 150, 0, 2.0, 0.2)
        anvil(g, bird.x, GROUND - 4, 1.05, Math.sin(env.since * 20) * 0.05 * clamp(1 - env.since * 2, 0, 1))
        for (let i = 0; i < 4; i++) {
          const a = env.since * 6 + (i / 4) * Math.PI * 2
          star(g, bird.x + Math.cos(a) * 100, GROUND - 140 + Math.sin(a) * 26, 18, '#fff35c', a)
        }
      } else {
        const moving = Math.abs(bird.target - bird.x) > 6
        const won = env.state === 'won'
        const bob = won ? Math.abs(Math.sin(env.since * 11)) * 70 : moving ? Math.abs(Math.sin(t * 22)) * 16 : Math.abs(Math.sin(t * 4)) * 5
        shadow(g, bird.x, GROUND + 6, 70, 1 - bob / 200)
        const lean = won ? Math.sin(env.since * 11) * 0.2 : moving ? bird.face * 0.18 : 0
        const sq = 1 + hop.value * 0.25
        sprite(g, '🐓', bird.x, GROUND - 66 - bob - hop.value * 50, 150, lean, -bird.face * (2 - sq), sq)
        if (moving && !won) for (let i = 0; i < 2; i++) circle(g, bird.x - bird.face * (60 + i * 34), GROUND - 6 - i * 8, 12 - i * 4, 'rgba(255,241,208,0.7)')
      }
      for (const a of anvils) if (!a.landed) anvil(g, a.x, a.y, 1, a.tilt * 3 + Math.sin(a.t * 9) * 0.05)
    },
    down(p) {
      steer(p)
      if (env.state !== 'play') return
      hop.value = 0.8
      if (env.age - lastCluck > 0.15) {
        lastCluck = env.age
        sfx.tone({ freq: rnd(640, 760), to: 480, dur: 0.06, type: 'square', vol: 0.1 })
        fx.burst(bird.x, GROUND - 60, { count: 3, color: '#ffffff', speed: 200, life: 0.5, size: 10, gravity: 300 })
      }
    },
    move: steer,
    timeout() {
      sfx.tone({ freq: 520, to: 780, dur: 0.08, type: 'square', vol: 0.12 })
      sfx.tone({ freq: 620, to: 980, dur: 0.2, type: 'square', vol: 0.12, delay: 0.1 })
      fx.burst(bird.x, GROUND - 80, { count: 14, color: ['#fff35c', '#ffffff'], speed: 420, life: 0.6, size: 14, shape: 'star' })
      env.win()
    },
    hint() {
      return [bird.x, GROUND - 60]
    },
  }
}

export const dodge: MicroDef = {
  key: 'dodge',
  word: 'DODGE!',
  icon: '🐓',
  winWord: 'PHEW!',
  loseWord: 'BONK!',
  backdrop(g) {
    vgrad(g, 0, H, '#ff9d5c', '#ffe08a')
    circle(g, 900, 190, 90, '#fff3b0')
    circle(g, 900, 190, 120, 'rgba(255,243,176,0.3)')
    // Mesas.
    poly(g, [-20, 640, 40, 380, 250, 380, 300, 470, 380, 470, 440, 640], '#c96a4a')
    poly(g, [40, 380, 250, 380, 240, 410, 60, 410], '#e0875f')
    poly(g, [700, 640, 760, 430, 880, 430, 910, 330, 1040, 330, 1090, 640], '#b85c44')
    poly(g, [910, 330, 1040, 330, 1034, 360, 916, 360], '#d67a58')
    poly(g, [430, 640, 480, 520, 640, 520, 690, 640], '#d98058')
    // Sand.
    vgrad(g, 630, H, '#f2c777', '#e0a655')
    g.fillStyle = 'rgba(160,100,40,0.25)'
    for (let i = 0; i < 9; i++) g.fillRect(40 + i * 135, 748 + (i % 3) * 18, 60, 6)
    sprite(g, '🌵', 150, 600, 150)
    sprite(g, '🌵', 1070, 620, 110)
    sprite(g, '🪨', 760, 668, 60)
  },
  make,
}
