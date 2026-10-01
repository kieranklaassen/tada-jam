// POP! Tap (or swipe through) every balloon before the clock runs out.

import { blinkAt, ellipse, face, squash, volume } from '../../kit/draw.ts'
import { clamp, dist, rnd, shuffle, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import type { Pointer } from '../../kit/types.ts'
import { H, W } from '../../kit/types.ts'
import { cloud, hills, poly, vgrad } from './micro.ts'
import type { Env, Micro, MicroDef } from './micro.ts'

const COLORS: readonly [string, string][] = [
  ['#ff5d6c', '#c9304a'],
  ['#ffb02e', '#d9861a'],
  ['#5ed36a', '#2f9e4a'],
  ['#4db8ff', '#2a86d1'],
  ['#b07cff', '#7d4fd1'],
  ['#ff7ac8', '#d14f9c'],
]

interface Balloon {
  x: number
  y: number
  r: number
  color: string
  dark: string
  phase: number
  vx: number
  popped: boolean
  wobble: Spring
  // Seconds into flying away after a loss.
  flee: number
  seed: number
}

function make(env: Env): Micro {
  const { fx, sfx, stage } = env
  const count = Math.min(9, 5 + env.level)
  const slots: [number, number][] = []
  for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) slots.push([row ? 130 + col * 230 : 170 + col * 210, 255 + row * 230])
  const colors = shuffle(COLORS, stage.rand)
  const balloons: Balloon[] = shuffle(slots, stage.rand)
    .slice(0, count)
    .map(([x, y], i) => {
      const [color, dark] = colors[i % colors.length]!
      return {
        x: x + (stage.rand() - 0.5) * 50,
        y: y + (stage.rand() - 0.5) * 50,
        r: 68,
        color,
        dark,
        phase: stage.rand() * 6,
        vx: env.level >= 1 ? (stage.rand() < 0.5 ? -1 : 1) * (30 + env.level * 22) : 0,
        popped: false,
        wobble: spring(0.3, 160, 7),
        flee: 0,
        seed: i,
      }
    })
  for (const b of balloons) b.wobble.target = 1
  let step = 0

  const by = (b: Balloon) => b.y + Math.sin(b.phase) * 10

  const pop = (b: Balloon) => {
    b.popped = true
    fx.burst(b.x, by(b), { count: 16, color: [b.color, b.dark, '#ffffff'], speed: 520, life: 0.55, size: 13, shape: 'square', gravity: 900 })
    fx.ring(b.x, by(b), b.color, 120, 0.3)
    sfx.pop(step++)
    fx.shake(4, 0.12)
    for (const other of balloons) if (!other.popped) other.wobble.kick(rnd(-3, 3))
    if (balloons.every((o) => o.popped)) {
      sfx.noise({ dur: 0.25, freq: 2500, vol: 0.2, filter: 'highpass' })
      // A little fireworks finale where the balloons were.
      balloons.forEach((o, i) => {
        env.after(0.12 + i * 0.11, () => {
          fx.burst(o.x, by(o) - 40, { count: 14, color: [o.color, '#ffffff', '#fff35c'], speed: 460, life: 0.7, size: 12, shape: 'star', gravity: 300 })
          fx.ring(o.x, by(o) - 40, o.color, 90, 0.35)
          sfx.pop(step + i)
        })
      })
      env.win()
    }
  }

  const touch = (p: Pointer, isDown: boolean) => {
    if (env.state !== 'play') return
    let hit = false
    for (const b of balloons) {
      if (b.popped) continue
      if (dist(p.x, p.y, b.x, by(b)) < b.r + (isDown ? 46 : 18)) {
        pop(b)
        hit = true
        if (isDown) break
      }
    }
    if (!hit && isDown) {
      // A miss still answers: a puff of air and every balloon flinches.
      fx.burst(p.x, p.y, { count: 6, color: '#ffffff', speed: 160, life: 0.3, size: 8, gravity: 0 })
      sfx.note(-4 + Math.round(rnd(0, 2)), 0.07, 'sine', 0.12)
      for (const b of balloons) if (!b.popped) b.wobble.kick((b.x < p.x ? -1 : 1) * 2)
    }
  }

  return {
    update(dt) {
      for (const b of balloons) {
        b.phase += dt * 2.2
        b.wobble.update(dt)
        if (b.popped) continue
        if (env.state === 'lost') {
          b.flee += dt
          b.y -= (200 + b.flee * 900) * dt
          b.x += Math.sin(b.flee * 22 + b.seed) * 520 * dt
        } else {
          b.x += b.vx * dt
          if (b.x < 100 || b.x > W - 100) {
            b.vx *= -1
            b.x = clamp(b.x, 100, W - 100)
          }
        }
      }
    },
    draw(g) {
      const finger = env.finger()
      for (const b of balloons) {
        if (b.popped) continue
        const y = by(b)
        const shrink = env.state === 'lost' ? clamp(1 - b.flee * 0.7, 0.35, 1) : 1
        const r = b.r * shrink
        // String.
        g.strokeStyle = 'rgba(60,40,60,0.55)'
        g.lineWidth = 3
        g.beginPath()
        g.moveTo(b.x, y + r * 1.1)
        g.quadraticCurveTo(b.x + Math.sin(b.phase * 1.3) * 22, y + r * 1.1 + 60, b.x + Math.sin(b.phase) * 8, y + r * 1.1 + 115)
        g.stroke()
        const [sx, sy] = volume(clamp(b.wobble.value, 0.4, 1.6))
        squash(g, b.x, y + r, sx, sy, () => {
          poly(g, [b.x - 10, y + r * 1.18, b.x + 10, y + r * 1.18, b.x, y + r * 1.0], b.dark)
          ellipse(g, b.x, y, r * 0.92, r * 1.08, b.color)
          ellipse(g, b.x - r * 0.36, y - r * 0.5, r * 0.2, r * 0.32, 'rgba(255,255,255,0.55)', -0.5)
          const near = finger ? dist(finger.x, finger.y, b.x, y) : 9999
          const lookX = finger ? clamp((finger.x - b.x) / 300, -1, 1) : Math.sin(b.phase * 0.4)
          const lookY = finger ? clamp((finger.y - y) / 300, -1, 1) : 0
          const mood = env.state === 'lost' ? 'yum' : near < 230 ? 'wow' : 'happy'
          face(g, b.x, y - r * 0.05, r * 0.19, mood, lookX, lookY, blinkAt(env.age, b.seed))
        })
      }
    },
    down(p) {
      touch(p, true)
    },
    move(p) {
      touch(p, false)
    },
    timeout() {
      // The ones that got away blow a raspberry and zoom off.
      sfx.tone({ freq: 160, to: 60, dur: 0.6, type: 'sawtooth', vol: 0.16 })
      sfx.noise({ dur: 0.6, freq: 300, to: 120, vol: 0.2, filter: 'lowpass' })
      env.lose()
    },
    hint() {
      const b = balloons.find((o) => !o.popped)
      return b ? [b.x, by(b)] : [W / 2, H / 2]
    },
  }
}

export const pop: MicroDef = {
  key: 'pop',
  word: 'POP!',
  icon: '🎈',
  winWord: 'BANG!',
  loseWord: 'PFFFT!',
  backdrop(g) {
    vgrad(g, 0, H, '#58c4ff', '#d4f3ff')
    cloud(g, 210, 150, 1.1)
    cloud(g, 820, 110, 0.9)
    cloud(g, 1010, 330, 0.7, 'rgba(255,255,255,0.8)')
    cloud(g, 470, 400, 0.6, 'rgba(255,255,255,0.7)')
    hills(g, 690, 40, '#8ddc74', 0.4)
    hills(g, 740, 30, '#63c45c', 2.1, 0.008)
    // A striped fairground tent on the hill.
    const tx = 940
    const ty = 700
    for (let i = 0; i < 6; i++) poly(g, [tx - 150 + i * 50, ty, tx - 100 + i * 50, ty, tx, ty - 170], i % 2 ? '#ffffff' : '#ff6b6b')
    poly(g, [tx - 150, ty, tx + 150, ty, tx + 150, ty + 70, tx - 150, ty + 70], '#ffffff')
    g.fillStyle = '#ff6b6b'
    for (let i = 0; i < 6; i += 2) g.fillRect(tx - 150 + i * 50, ty, 50, 70)
    poly(g, [tx, ty - 170, tx, ty - 215, tx + 40, ty - 198], '#ffd23f')
  },
  make,
}
