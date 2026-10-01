// SWAT! Tap (or swipe over) the fly before it gets the cake.

import { circle, ellipse, line, rrect, sprite } from '../../kit/draw.ts'
import { clamp, dist, ease, rnd } from '../../kit/math.ts'
import type { Pointer } from '../../kit/types.ts'
import { H, W } from '../../kit/types.ts'
import type { Env, Micro, MicroDef } from './micro.ts'

const CAKE: [number, number] = [830, 470]
const SPOTS: readonly [number, number][] = [CAKE, [300, 300], [330, 600], [620, 250], [960, 250], [600, 640], [1000, 650], [170, 460], [560, 440]]

interface Fly {
  x: number
  y: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  // 0..1 along the current hop, then it sits.
  k: number
  hopTime: number
  sit: number
  dead: boolean
  seed: number
  panic: number
}

interface Swat {
  x: number
  y: number
  age: number
  hit: boolean
}

function make(env: Env): Micro {
  const { fx, sfx, stage } = env
  const count = env.level >= 4 ? 3 : env.level >= 2 ? 2 : 1
  const flies: Fly[] = []
  for (let i = 0; i < count; i++) {
    const [x, y] = SPOTS[1 + Math.floor(stage.rand() * (SPOTS.length - 1))]!
    flies.push({ x, y, fromX: x, fromY: y, toX: x, toY: y, k: 1, hopTime: 1, sit: 0.35 + i * 0.3, dead: false, seed: i * 2.3, panic: 0 })
  }
  const swats: Swat[] = []
  const marks: { x: number; y: number }[] = []
  let last = { x: -999, y: -999 }

  const takeOff = (f: Fly, far: boolean) => {
    let best: [number, number] = SPOTS[0]!
    for (let tries = 0; tries < 6; tries++) {
      const s = SPOTS[Math.floor(Math.random() * SPOTS.length)]!
      const d = dist(s[0], s[1], f.x, f.y)
      if (d > (far ? 420 : 200)) {
        best = s
        break
      }
    }
    f.fromX = f.x
    f.fromY = f.y
    f.toX = best[0] + rnd(-40, 40)
    f.toY = best[1] + rnd(-40, 40)
    f.k = 0
    const speed = (far ? 900 : 560) * (0.85 + env.pace * 0.15)
    f.hopTime = Math.max(0.25, dist(f.fromX, f.fromY, f.toX, f.toY) / speed)
    sfx.tone({ freq: far ? 260 : 190, to: far ? 330 : 230, dur: Math.min(0.5, f.hopTime), type: 'sawtooth', vol: 0.045 })
  }

  const swat = (x: number, y: number) => {
    if (env.state !== 'play') return
    last = { x, y }
    let hit = false
    for (const f of flies) {
      if (f.dead) continue
      const d = dist(x, y, f.x, f.y)
      if (d < (f.k >= 1 ? 120 : 104)) {
        f.dead = true
        hit = true
        marks.push({ x: f.x, y: f.y })
        fx.burst(f.x, f.y, { count: 18, color: ['#a6e04a', '#6fae2a', '#e6ff9c'], speed: 460, life: 0.6, size: 14, gravity: 200, drag: 0.93 })
        fx.text(f.x, f.y - 70, 'SPLAT!', { size: 56, color: '#d9ff7a', life: 0.7 })
      } else if (d < 330) {
        // A near miss: it bolts for the far side.
        f.panic = 0.5
        f.sit = 0
        takeOff(f, true)
      }
    }
    swats.push({ x, y, age: 0, hit })
    sfx.noise({ dur: 0.07, freq: 2600, vol: 0.28, filter: 'highpass' })
    sfx.thud(0.7)
    if (hit) {
      sfx.splat()
      fx.hitstop(60)
      fx.shake(10, 0.2)
      if (flies.every((f) => f.dead)) env.win()
    } else {
      fx.shake(4, 0.1)
    }
  }

  return {
    update(dt) {
      for (let i = swats.length - 1; i >= 0; i--) {
        swats[i]!.age += dt
        if (swats[i]!.age > 0.45) swats.splice(i, 1)
      }
      for (const f of flies) {
        if (f.dead) continue
        f.panic = Math.max(0, f.panic - dt)
        if (env.state === 'lost') {
          // Straight to the cake for a victory lap.
          const a = env.since * 9 + f.seed
          f.x += (CAKE[0] + Math.cos(a) * 70 - f.x) * Math.min(1, dt * 6)
          f.y += (CAKE[1] - 60 + Math.sin(a) * 40 - f.y) * Math.min(1, dt * 6)
          continue
        }
        if (f.k < 1) {
          f.k = Math.min(1, f.k + dt / f.hopTime)
          const e = ease.inOutQuad(f.k)
          const nx = -(f.toY - f.fromY)
          const ny = f.toX - f.fromX
          const len = Math.hypot(nx, ny) || 1
          const wob = Math.sin(f.k * Math.PI * 3 + f.seed) * 46 * Math.sin(f.k * Math.PI)
          f.x = f.fromX + (f.toX - f.fromX) * e + (nx / len) * wob
          f.y = f.fromY + (f.toY - f.fromY) * e + (ny / len) * wob
          if (f.k >= 1) f.sit = rnd(0.45, 0.8) / env.pace
        } else {
          f.sit -= dt
          if (f.sit <= 0) takeOff(f, false)
        }
      }
    },
    draw(g) {
      const t = env.age
      for (const m of marks) {
        circle(g, m.x, m.y, 44, '#9bd13f')
        circle(g, m.x - 40, m.y + 22, 16, '#9bd13f')
        circle(g, m.x + 36, m.y - 30, 12, '#9bd13f')
        circle(g, m.x + 44, m.y + 28, 9, '#9bd13f')
        sprite(g, '🪰', m.x, m.y, 70, 2.4, 1.2, 0.5)
        g.strokeStyle = '#1e1428'
        g.lineWidth = 5
        for (const side of [-1, 1]) line(g, m.x + side * 16 - 7, m.y - 22, m.x + side * 16 + 7, m.y - 8, '#1e1428', 5)
        for (const side of [-1, 1]) line(g, m.x + side * 16 + 7, m.y - 22, m.x + side * 16 - 7, m.y - 8, '#1e1428', 5)
      }
      for (const f of flies) {
        if (f.dead) continue
        const flying = f.k < 1 || env.state === 'lost'
        const lift = flying ? 34 : 0
        ellipse(g, f.x + 10, f.y + 26 + lift * 0.6, 30, 10, 'rgba(0,0,0,0.2)')
        const jit = flying ? 0 : Math.sin(t * 30 + f.seed) * 2
        // Wings: a blur in flight, a twitch at rest.
        const wing = flying ? 0.75 + Math.sin(t * 90) * 0.25 : 0.5 + Math.sin(t * 12) * 0.08
        for (const side of [-1, 1]) ellipse(g, f.x + side * 30, f.y - 22 - lift, 30 * wing, 16, 'rgba(255,255,255,0.75)', side * 0.5)
        const heading = flying && env.state !== 'lost' ? Math.atan2(f.toY - f.fromY, f.toX - f.fromX) * 0.25 : 0
        sprite(g, '🪰', f.x + jit, f.y - lift, 96 + (f.panic > 0 ? 10 : 0), heading + Math.sin(t * 8 + f.seed) * 0.15)
        if (f.panic > 0) sprite(g, '💦', f.x + 50, f.y - 60 - lift, 40)
      }
      if (env.state === 'lost') {
        // Its friends arrive.
        for (let i = 0; i < 6; i++) {
          const k = clamp(env.since * 1.6 - i * 0.08, 0, 1)
          const a = env.since * 8 + i * 1.05
          const fromX = i % 2 ? -80 : W + 80
          const x = fromX + (CAKE[0] + Math.cos(a) * (90 + i * 8) - fromX) * ease.outCubic(k)
          const y = 120 + i * 90 + (CAKE[1] - 50 + Math.sin(a) * 60 - (120 + i * 90)) * ease.outCubic(k)
          sprite(g, '🪰', x, y, 64, Math.sin(a) * 0.5)
        }
      }
      for (const s of swats) {
        // The swatter comes down big and fast, squashes flat, then lifts away.
        const k = clamp(s.age / 0.07, 0, 1)
        const out = clamp((s.age - 0.25) / 0.2, 0, 1)
        const scale = (1.7 - 0.7 * ease.outCubic(k)) * (1 + out * 0.35)
        g.save()
        g.globalAlpha = 1 - out
        g.translate(s.x, s.y)
        g.rotate(-0.35)
        g.scale(scale, scale)
        line(g, 0, 60, 40, 520, '#3a8fd9', 22)
        rrect(g, -78, -88, 156, 170, 26, s.hit ? 'rgba(90,200,255,0.92)' : 'rgba(90,200,255,0.8)', '#2a6fb8', 9)
        g.strokeStyle = 'rgba(42,111,184,0.75)'
        g.lineWidth = 4
        for (let i = 1; i < 5; i++) {
          g.beginPath()
          g.moveTo(-78 + i * 31, -84)
          g.lineTo(-78 + i * 31, 78)
          g.moveTo(-74, -88 + i * 34)
          g.lineTo(74, -88 + i * 34)
          g.stroke()
        }
        g.restore()
        g.globalAlpha = 1
      }
    },
    down(p: Pointer) {
      swat(p.x, p.y)
    },
    move(p: Pointer) {
      if (dist(p.x, p.y, last.x, last.y) > 150) swat(p.x, p.y)
    },
    timeout() {
      sfx.tone({ freq: 210, to: 260, dur: 0.7, type: 'sawtooth', vol: 0.1 })
      sfx.tone({ freq: 317, to: 250, dur: 0.7, type: 'sawtooth', vol: 0.07 })
      env.lose()
    },
    hint() {
      const f = flies.find((o) => !o.dead)
      return f ? [f.x, f.y] : [W / 2, H / 2]
    },
  }
}

export const swat: MicroDef = {
  key: 'swat',
  word: 'SWAT!',
  icon: '🪰',
  winWord: 'GOTCHA!',
  loseWord: 'BZZZZT!',
  backdrop(g) {
    // Grass, then a gingham picnic blanket seen from above.
    g.fillStyle = '#6cc25a'
    g.fillRect(0, 0, W, H)
    g.fillStyle = '#5bb04c'
    for (let i = 0; i < 60; i++) g.fillRect((i * 197) % W, (i * 131) % H, 8, 22)
    const bx = 70
    const by = 120
    const bw = W - 140
    const bh = H - 200
    g.save()
    g.beginPath()
    g.roundRect(bx, by, bw, bh, 30)
    g.fillStyle = 'rgba(0,0,0,0.18)'
    g.fill()
    g.translate(0, -10)
    g.beginPath()
    g.roundRect(bx, by, bw, bh, 30)
    g.clip()
    g.fillStyle = '#fffaf0'
    g.fillRect(bx, by, bw, bh)
    const cell = 80
    g.fillStyle = 'rgba(232,64,64,0.45)'
    for (let x = bx; x < bx + bw; x += cell * 2) g.fillRect(x, by, cell, bh)
    for (let y = by; y < by + bh; y += cell * 2) g.fillRect(bx, y, bw, cell)
    g.restore()
    const item = (char: string, x: number, y: number, size: number, plate = 0) => {
      ellipse(g, x + 8, y + size * 0.42, size * 0.5, size * 0.16, 'rgba(0,0,0,0.18)')
      if (plate > 0) {
        circle(g, x, y + 14, plate, '#ffffff', '#cfd8e6', 6)
        circle(g, x, y + 14, plate * 0.7, '#f3f6fb')
      }
      sprite(g, char, x, y, size)
    }
    item('🍰', CAKE[0], CAKE[1], 170, 120)
    item('🥪', 300, 300, 120, 86)
    item('🍉', 330, 610, 130)
    item('🧃', 1000, 640, 110)
    item('🍓', 620, 250, 80)
    item('🍓', 680, 290, 70)
    item('🧀', 960, 250, 100)
    item('🍪', 600, 640, 90)
    item('🥤', 170, 460, 110)
  },
  make,
}
