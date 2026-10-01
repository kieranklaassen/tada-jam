// PICK! One grumpy weed hides among the flowers. Tap it to yank it out; tap a
// flower and it cries.

import { blinkAt, circle, ellipse, face, rrect, sprite, squash, volume } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { clamp, dist, rnd, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { cloud, hills, poly, vgrad } from './micro.ts'
import type { Env, Micro, MicroDef } from './micro.ts'

const PETALS: readonly [string, string][] = [
  ['#ff7ac8', '#ffd23f'],
  ['#ffffff', '#ffc21a'],
  ['#ff8a3c', '#7a3d14'],
  ['#8fb8ff', '#fff3b0'],
  ['#ff5d6c', '#ffd23f'],
  ['#d9a3ff', '#fff3b0'],
]

interface Plant {
  x: number
  base: number
  weed: boolean
  petal: string
  heart: string
  seed: number
  pulse: Spring
  hurt: boolean
}

function flower(g: CanvasRenderingContext2D, p: Plant, sway: number, mood: Mood, look: number, blink: number, droop: number): void {
  const hx = p.x + sway * 34 + droop * 60
  const hy = p.base - 175 + droop * 70
  g.strokeStyle = '#3f9c4a'
  g.lineWidth = 12
  g.beginPath()
  g.moveTo(p.x, p.base)
  g.quadraticCurveTo(p.x - sway * 10, p.base - 100, hx, hy)
  g.stroke()
  ellipse(g, p.x - 30, p.base - 58, 34, 14, '#55b85c', 0.5)
  ellipse(g, p.x + 32, p.base - 86, 34, 14, '#55b85c', -0.5)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + sway * 0.3
    ellipse(g, hx + Math.cos(a) * 44, hy + Math.sin(a) * 44, 30, 20, p.petal, a)
  }
  circle(g, hx, hy, 34, p.heart)
  face(g, hx, hy - 6, 8.5, mood, look, 0, blink)
  if (droop > 0) ellipse(g, hx + 22, hy + 8 + ((droop * 60) % 40), 6, 9, '#7fd4ff')
}

function weed(g: CanvasRenderingContext2D, x: number, base: number, twitch: number, mood: Mood, time: number): void {
  // Jagged leaves fanning from the ground.
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.5 + twitch * 0.06
    const len = 96 + (i % 2) * 26
    const cx = Math.cos(a)
    const cy = Math.sin(a)
    const pts: number[] = [x, base]
    for (let j = 1; j <= 4; j++) {
      const d = (j / 4) * len
      const w = (j % 2 ? 24 : 9) * (1 - j / 6)
      pts.push(x + cx * d - cy * w, base + cy * d + cx * w)
    }
    pts.push(x + cx * (len + 16), base + cy * (len + 16))
    for (let j = 4; j >= 1; j--) {
      const d = (j / 4) * len
      const w = (j % 2 ? 24 : 9) * (1 - j / 6)
      pts.push(x + cx * d + cy * w, base + cy * d - cx * w)
    }
    poly(g, pts, i % 2 ? '#2f7a3d' : '#276634')
  }
  g.strokeStyle = '#276634'
  g.lineWidth = 14
  g.beginPath()
  g.moveTo(x, base)
  g.lineTo(x + twitch * 4, base - 150)
  g.stroke()
  // Thistle head: a spiky purple ball with a scowl.
  const hx = x + twitch * 5
  const hy = base - 168
  g.fillStyle = '#7d3fb8'
  g.beginPath()
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU + time * 0.6
    const r = i % 2 ? 40 : 58
    if (i === 0) g.moveTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r)
    else g.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r)
  }
  g.closePath()
  g.fill()
  circle(g, hx, hy, 38, '#9a5bd6')
  face(g, hx, hy - 6, 9.5, mood, Math.sin(time * 2.2), 0, 0)
}

function make(env: Env): Micro {
  const { fx, sfx, stage } = env
  const count = Math.min(10, 6 + env.level)
  const plants: Plant[] = []
  const weedAt = Math.floor(stage.rand() * count)
  const back = count > 6 ? Math.ceil(count / 2) : count
  const oneKind = env.level === 0 ? Math.floor(stage.rand() * PETALS.length) : -1
  for (let i = 0; i < count; i++) {
    const inBack = i < back
    const n = inBack ? back : count - back
    const j = inBack ? i : i - back
    const spread = Math.min(178, 980 / n)
    const [petal, heart] = PETALS[oneKind >= 0 ? oneKind : Math.floor(stage.rand() * PETALS.length)]!
    plants.push({
      x: W / 2 + (j - (n - 1) / 2) * spread + (stage.rand() - 0.5) * 24 + (count > 6 && count - back === back ? (inBack ? -spread / 4 : spread / 4) : 0),
      base: count > 6 ? (inBack ? 610 : 728) : 680,
      weed: i === weedAt,
      petal,
      heart,
      seed: i * 1.7 + stage.rand() * 3,
      pulse: spring(0.2, 170, 9),
      hurt: false,
    })
  }
  for (const p of plants) p.pulse.target = 1
  const order = [...plants].sort((a, b) => a.base - b.base)
  let pulled = false
  let lastPuff = -1

  const theWeed = plants[weedAt]!

  return {
    update(dt) {
      for (const p of plants) p.pulse.update(dt)
    },
    draw(g) {
      const t = env.age
      const finger = env.finger()
      const won = env.state === 'won'
      const lost = env.state === 'lost'
      if (pulled) ellipse(g, theWeed.x, theWeed.base + 4, 46, 16, '#3a2414')
      for (const p of order) {
        const s = clamp(p.pulse.value, 0.2, 1.7)
        if (p.weed) {
          if (pulled) continue
          // It knows it is not a flower: it twitches, and gloats if it survives.
          const grow = lost && !plants.some((o) => o.hurt) ? 1 + clamp(env.since * 3, 0, 1) * 0.9 : 1
          const twitch = Math.sin(t * 9 + p.seed) * (lost ? 3 : 1)
          squash(g, p.x, p.base, s * grow, s * grow, () => weed(g, p.x, p.base, twitch, lost ? 'happy' : 'grumpy', t))
          continue
        }
        const near = finger ? dist(finger.x, finger.y, p.x, p.base - 120) < 190 : false
        const mood: Mood = p.hurt ? 'sad' : won ? 'happy' : lost ? 'wow' : near ? 'wow' : 'happy'
        const hopY = won ? Math.abs(Math.sin(env.since * 10 + p.seed)) * 26 : 0
        const sway = Math.sin(t * 1.8 + p.seed) * 0.5 + (p.pulse.value - 1) * 2
        const look = finger ? clamp((finger.x - p.x) / 300, -1, 1) : Math.sin(t * 0.9 + p.seed)
        const [sx, sy] = volume(s)
        squash(g, p.x, p.base, sx, sy, () => {
          g.save()
          g.translate(0, -hopY)
          flower(g, p, sway, mood, look, blinkAt(t, p.seed), p.hurt ? clamp(env.since * 4, 0, 1) : 0)
          g.restore()
        })
      }
      // The grass lip in front of the bed hides the stems' feet.
      if (pulled) {
        // The weed, root and all, sailing off with a passenger.
        const k = env.since
        const stretch = k < 0.1 ? 1 + k * 3 : 1
        const y = theWeed.base - (k < 0.1 ? 0 : (k - 0.1) * 1500 - (k - 0.1) ** 2 * 1500)
        const x = theWeed.x + (k < 0.1 ? 0 : (k - 0.1) * 260)
        const rot = k < 0.1 ? 0 : (k - 0.1) * 5
        g.save()
        g.translate(x, y)
        g.rotate(rot)
        g.scale(1, stretch)
        g.strokeStyle = '#d9b07a'
        g.lineWidth = 14
        g.beginPath()
        g.moveTo(0, 0)
        g.bezierCurveTo(24, 50, -26, 90, 6, 150)
        g.stroke()
        g.lineWidth = 6
        g.beginPath()
        g.moveTo(8, 50)
        g.lineTo(40, 76)
        g.moveTo(-8, 96)
        g.lineTo(-38, 120)
        g.stroke()
        sprite(g, '🪱', 10, 168, 64, Math.sin(env.age * 20) * 0.4)
        weed(g, 0, 0, Math.sin(env.age * 40) * 3, 'wow', env.age)
        g.restore()
      }
    },
    down(p) {
      if (env.state !== 'play') return
      let best: Plant | null = null
      let bestD = 118
      for (const o of plants) {
        const d = Math.min(dist(p.x, p.y, o.x, o.base - 165), dist(p.x, p.y, o.x, o.base - 70))
        if (d < bestD) {
          bestD = d
          best = o
        }
      }
      if (!best) {
        // Bare soil: a puff, and everyone looks.
        if (env.age - lastPuff > 0.1) {
          lastPuff = env.age
          fx.burst(p.x, p.y, { count: 6, color: ['#8a5a36', '#c08552'], speed: 220, life: 0.4, size: 11, angle: -Math.PI / 2, spread: 2 })
          sfx.thud(0.4)
          for (const o of plants) o.pulse.kick((o.x < p.x ? -1 : 1) * 1.2)
        }
        return
      }
      if (best.weed) {
        pulled = true
        sfx.pop(4)
        sfx.slideUp()
        sfx.noise({ dur: 0.18, freq: 500, to: 1800, vol: 0.2 })
        fx.burst(best.x, best.base, { count: 20, color: ['#5e3a22', '#8a5a36', '#c08552'], speed: 520, life: 0.7, size: 14, angle: -Math.PI / 2, spread: 2.2, gravity: 1300 })
        fx.shake(8, 0.2)
        fx.hitstop(50)
        for (const o of plants) o.pulse.kick(rnd(2, 5))
        env.win()
      } else {
        best.hurt = true
        best.pulse.value = 0.6
        sfx.tone({ freq: 900, to: 500, dur: 0.22, type: 'triangle', vol: 0.18 })
        sfx.nope()
        fx.burst(best.x, best.base - 175, { count: 14, color: [best.petal, best.heart], speed: 380, life: 0.8, size: 16, gravity: 500 })
        fx.text(best.x, best.base - 260, 'OW!', { size: 60, color: '#ffffff', life: 0.8 })
        // The weed's snigger.
        for (let i = 0; i < 3; i++) sfx.tone({ freq: 260 - i * 30, to: 200 - i * 30, dur: 0.09, type: 'sawtooth', vol: 0.09, delay: 0.3 + i * 0.12 })
        theWeed.pulse.value = 1.4
        env.lose()
      }
    },
    timeout() {
      for (let i = 0; i < 4; i++) sfx.tone({ freq: 240 - i * 24, to: 180 - i * 24, dur: 0.1, type: 'sawtooth', vol: 0.11, delay: i * 0.13 })
      env.lose()
    },
    resultWord() {
      return env.state === 'lost' && !plants.some((o) => o.hurt) ? 'TOO SLOW!' : null
    },
    hint() {
      return [theWeed.x, theWeed.base - 120]
    },
  }
}

export const pick: MicroDef = {
  key: 'pick',
  word: 'PICK!',
  icon: '🌱',
  winWord: 'YOINK!',
  loseWord: 'OUCH!',
  backdrop(g) {
    vgrad(g, 0, H, '#8fd8ff', '#e3f7ff')
    circle(g, 1010, 150, 70, '#fff3b0')
    circle(g, 1010, 150, 96, 'rgba(255,243,176,0.35)')
    cloud(g, 240, 150, 1)
    cloud(g, 660, 110, 0.7, 'rgba(255,255,255,0.8)')
    hills(g, 420, 36, '#9be07a', 1)
    // Picket fence.
    for (let x = 10; x < W; x += 74) {
      poly(g, [x, 520, x, 330, x + 27, 300, x + 54, 330, x + 54, 520], '#ffffff', '#d6dde8', 4)
    }
    rrect(g, -10, 370, W + 20, 22, 4, '#f1f4f9', '#d6dde8', 3)
    rrect(g, -10, 460, W + 20, 22, 4, '#f1f4f9', '#d6dde8', 3)
    // Grass, then the soil bed.
    vgrad(g, 500, H, '#6cc25a', '#57b04c')
    rrect(g, 40, 560, W - 80, 250, 60, '#6e452a', '#55331d', 8)
    g.fillStyle = 'rgba(0,0,0,0.12)'
    for (let i = 0; i < 40; i++) g.fillRect(80 + ((i * 263) % (W - 180)), 590 + ((i * 97) % 190), 16, 7)
    g.fillStyle = 'rgba(255,220,170,0.18)'
    for (let i = 0; i < 30; i++) g.fillRect(90 + ((i * 331) % (W - 200)), 600 + ((i * 71) % 180), 10, 5)
  },
  make,
}
