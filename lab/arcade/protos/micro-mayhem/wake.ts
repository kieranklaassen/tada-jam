// WAKE UP! Tap fast, anywhere, until the snoring dog leaps out of bed.

import { circle, ellipse, eyes, label, rrect, sprite, squash, star, volume } from '../../kit/draw.ts'
import { clamp, rnd, spring, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { vgrad } from './micro.ts'
import type { Env, Micro, MicroDef } from './micro.ts'

const CX = 570
const CY = 610

function make(env: Env): Micro {
  const { fx, sfx } = env
  const need = Math.min(15, 7 + env.level * 2)
  let taps = 0
  let step = 0
  let snoreIn = 0.3
  const jolt = spring(0, 230, 9)
  const clock = spring(0, 300, 6)

  const awake = () => clamp(taps / need, 0, 1)

  return {
    update(dt) {
      jolt.update(dt)
      clock.update(dt)
      if (env.state !== 'play') return
      // It sinks back to sleep if the tapping slows.
      taps = Math.max(0, taps - dt * 0.9 * env.pace)
      snoreIn -= dt
      if (snoreIn <= 0) {
        snoreIn = 1.3
        sfx.noise({ dur: 0.55, freq: 160, to: 330, vol: 0.12 * (1 - awake()), filter: 'lowpass', q: 3 })
        sfx.noise({ dur: 0.4, freq: 900, to: 500, vol: 0.05 * (1 - awake()), filter: 'bandpass', delay: 0.62 })
      }
    },
    draw(g) {
      const t = env.age
      const a = awake()
      const won = env.state === 'won'
      const lost = env.state === 'lost'

      // The alarm clock on the bedside table: it has been trying for a while.
      const ring = lost ? 0 : 1
      g.save()
      g.translate(985, 545)
      g.rotate(lost ? clamp(env.since * 6, 0, 1.45) : Math.sin(t * 46) * 0.13 * ring + clock.value * 0.2)
      sprite(g, '⏰', 0, -40 - Math.abs(Math.sin(t * 23)) * 8 * ring, 120)
      g.restore()
      if (!lost) {
        g.strokeStyle = 'rgba(255,240,150,0.85)'
        g.lineWidth = 6
        for (const side of [-1, 1]) {
          for (let i = 0; i < 2; i++) {
            const r = 84 + i * 22 + ((t * 60) % 22)
            g.beginPath()
            g.arc(985, 500, r, side < 0 ? Math.PI * 1.05 : -Math.PI * 0.3, side < 0 ? Math.PI * 1.3 : -Math.PI * 0.05)
            g.stroke()
          }
        }
      }

      // The bed.
      ellipse(g, CX, CY + 62, 380, 84, 'rgba(0,0,0,0.25)')
      ellipse(g, CX, CY + 40, 370, 92, '#b8433a')
      ellipse(g, CX, CY + 22, 320, 66, '#e9776a')

      // The dog. On a win the whole dog goes up like a rocket and lands bouncing.
      const jumpT = won ? env.since : 0
      const jump = won ? Math.max(Math.sin(clamp(jumpT / 0.55, 0, 1) * Math.PI) * 250, Math.abs(Math.sin(jumpT * 10)) * 30 * clamp(jumpT - 0.5, 0, 1)) : 0
      const breath = 1 + Math.sin(t * 2.4) * 0.05 * (1 - a)
      const shakeX = jolt.value * 14
      const [sx, sy] = volume(won ? 1 + Math.cos(clamp(jumpT / 0.55, 0, 1) * Math.PI) * 0.18 : 1 - Math.abs(jolt.value) * 0.06)
      squash(g, CX, CY + 30, sx, sy, () => {
        g.save()
        g.translate(shakeX, -jump)
        // Tail.
        const wag = won ? Math.sin(t * 30) * 0.6 : Math.sin(t * 2) * 0.08 + a * Math.sin(t * 16) * 0.3
        g.strokeStyle = '#c98d52'
        g.lineWidth = 34
        g.beginPath()
        g.moveTo(CX + 250, CY - 50)
        g.quadraticCurveTo(CX + 330, CY - 80, CX + 330 + Math.sin(wag) * 70, CY - 170 + Math.abs(Math.sin(wag)) * 30)
        g.stroke()
        // Body.
        ellipse(g, CX + 70, CY - 58, 225, 112 * breath, '#d9a066')
        ellipse(g, CX + 120, CY - 90, 80, 50 * breath, '#c98d52', -0.3)
        ellipse(g, CX + 210, CY - 8, 80, 44, '#c98d52')
        ellipse(g, CX - 40, CY + 6, 70, 30, '#e3b07a')

        // Head, lifting as it wakes.
        const hx = CX - 190
        const hy = CY - 70 - a * 34 - (won ? 30 : 0) + jolt.value * 8
        const earUp = won ? -1.1 : -a * 0.25 + jolt.value * 0.25
        for (const side of [-1, 1]) {
          g.save()
          g.translate(hx + side * 86, hy - 50)
          g.rotate(side * (0.35 + earUp))
          ellipse(g, 0, 56, 38, 78, '#8a5a36')
          g.restore()
        }
        circle(g, hx, hy, 112, '#e3b07a')
        ellipse(g, hx + 48, hy - 52, 40, 34, '#c98d52', 0.4)
        ellipse(g, hx, hy + 42, 66, 50, '#f7dfc0')
        ellipse(g, hx, hy + 18, 25, 17, '#2a1a1a')
        ellipse(g, hx - 8, hy + 12, 8, 5, 'rgba(255,255,255,0.5)')
        const open = won ? 1 : lost ? 0 : clamp(a * 1.25 - 0.1, 0, 0.8)
        if (open < 0.12) {
          g.strokeStyle = '#2a1a1a'
          g.lineWidth = 7
          for (const side of [-1, 1]) {
            g.beginPath()
            g.arc(hx + side * 42, hy - 34, 20, 0.15 * Math.PI, 0.85 * Math.PI)
            g.stroke()
          }
        } else {
          eyes(g, hx, hy - 30, 27, Math.sin(t * 3) * 0.3, won ? -0.2 : 0.5, 1 - open, 1.55)
        }
        if (won) {
          ellipse(g, hx, hy + 66, 34, 24, '#5a1f2a')
          ellipse(g, hx + 6, hy + 84, 22, 26 + Math.sin(t * 24) * 5, '#ff6b8a')
        } else {
          g.strokeStyle = '#2a1a1a'
          g.lineWidth = 6
          g.beginPath()
          g.arc(hx, hy + 52, 18, 0.1 * Math.PI, 0.9 * Math.PI)
          g.stroke()
        }
        if (lost) {
          // The snot bubble of a champion sleeper.
          const b = env.since < 0.75 ? clamp(env.since / 0.75, 0, 1) : 0
          if (b > 0) {
            circle(g, hx + 40 + b * 50, hy + 10 - b * 40, 12 + b * 78, 'rgba(190,235,255,0.55)', 'rgba(255,255,255,0.9)', 5)
            ellipse(g, hx + 20 + b * 40, hy - 20 - b * 70, 8 + b * 16, 5 + b * 9, 'rgba(255,255,255,0.8)', -0.6)
          }
        }
        g.restore()
      })

      // Zs drift up while it sleeps; they shrink as it stirs.
      if (!won) {
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.45 + i / 3) % 1
          g.globalAlpha = (1 - k) * (1 - a * 0.8)
          label(g, 'Z', CX - 120 + k * 150 + Math.sin(k * 8 + i) * 18, CY - 210 - k * 230, (34 + k * 60) * (lost ? 1.5 : 1 - a * 0.6), '#cfe3ff', '#23305c')
        }
        g.globalAlpha = 1
      }
      // A wake-o-meter of stars round the head would be a HUD; the dog is the meter.
      if (won) for (let i = 0; i < 5; i++) star(g, CX - 190 + Math.cos(t * 5 + i * 1.26) * 190, CY - 330 + Math.sin(t * 5 + i * 1.26) * 50 - jump * 0.6, 20, '#fff35c', t * 4 + i)
    },
    down(p) {
      if (env.state !== 'play') return
      taps += 1
      jolt.value = (Math.random() < 0.5 ? -1 : 1) * (0.6 + awake() * 0.6)
      clock.kick(rnd(-8, 8))
      step = Math.round(awake() * 9)
      sfx.boing(step)
      sfx.thud(0.5)
      fx.shake(3 + awake() * 6, 0.14)
      fx.burst(p.x, p.y, { count: 7, color: ['#fff35c', '#ffffff', '#ffb02e'], speed: 380, life: 0.45, size: 13, shape: 'star' })
      fx.text(CX - 190 + rnd(-120, 120), CY - 230 + rnd(-40, 40), '!', { size: 50 + awake() * 50, color: '#fff35c', life: 0.45, rise: 60 })
      if (taps >= need) {
        // Two barks and a leap.
        sfx.tone({ freq: 340, to: 190, dur: 0.13, type: 'sawtooth', vol: 0.22 })
        sfx.tone({ freq: 380, to: 200, dur: 0.15, type: 'sawtooth', vol: 0.22, delay: 0.2 })
        sfx.slideUp()
        fx.burst(CX, CY - 60, { count: 22, color: ['#ff7ac8', '#ff5d6c'], speed: 620, life: 0.9, size: 18, shape: 'heart', gravity: 300 })
        fx.text(CX + 240, CY - 330, 'WOOF!', { size: 80, color: '#ffffff', life: 0.9 })
        fx.shake(12, 0.3)
        env.win()
      }
    },
    timeout() {
      sfx.noise({ dur: 0.8, freq: 140, to: 380, vol: 0.25, filter: 'lowpass', q: 3 })
      env.after(0.75, () => {
        sfx.pop(-3)
        fx.burst(CX - 100, CY - 110, { count: 14, color: ['#bfeaff', '#ffffff'], speed: 380, life: 0.5, size: 10, shape: 'ring' })
      })
      env.lose()
    },
    hint() {
      return [CX - 60, CY - 90]
    },
  }
}

export const wake: MicroDef = {
  key: 'wake',
  word: 'WAKE UP!',
  icon: '🐶',
  winWord: 'GOOD BOY!',
  loseWord: 'ZZZZZ...',
  backdrop(g, rand) {
    vgrad(g, 0, 560, '#1c2157', '#3a3f8f')
    // Wallpaper dots.
    g.fillStyle = 'rgba(255,255,255,0.06)'
    for (let y = 40; y < 560; y += 70) for (let x = (y / 70) % 2 ? 40 : 75; x < W; x += 70) g.fillRect(x, y, 10, 10)
    // Window with a moon.
    rrect(g, 120, 110, 300, 300, 20, '#0b1033', '#c9b28a', 14)
    circle(g, 310, 210, 56, '#fff6c9')
    circle(g, 334, 196, 50, '#0b1033')
    g.fillStyle = '#ffffff'
    for (let i = 0; i < 12; i++) {
      g.beginPath()
      g.arc(140 + rand() * 260, 130 + rand() * 260, 1.5 + rand() * 3, 0, TAU)
      g.fill()
    }
    g.fillStyle = '#c9b28a'
    g.fillRect(263, 110, 14, 300)
    g.fillRect(120, 253, 300, 14)
    // A framed bone.
    rrect(g, 760, 150, 170, 120, 10, '#f7e6c4', '#8a5a36', 10)
    sprite(g, '🦴', 845, 210, 80, -0.3)
    // Floor and a rug.
    vgrad(g, 560, H, '#8a5a36', '#5e3a22')
    g.strokeStyle = 'rgba(0,0,0,0.15)'
    g.lineWidth = 3
    for (let x = -200; x < W + 200; x += 130) {
      g.beginPath()
      g.moveTo(x + 200, 560)
      g.lineTo(x, H)
      g.stroke()
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'
    g.fillRect(0, 560, W, 10)
    ellipse(g, 570, 690, 520, 110, '#4a8fd9')
    ellipse(g, 570, 690, 460, 88, '#6fb0f0')
    // Bedside table.
    rrect(g, 900, 545, 170, 24, 8, '#c08552', '#7a4a28', 5)
    rrect(g, 915, 569, 20, 150, 4, '#a36e44')
    rrect(g, 1035, 569, 20, 150, 4, '#a36e44')
  },
  make,
}
