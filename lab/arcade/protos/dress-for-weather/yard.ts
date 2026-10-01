// The garden: one open-ended thing to do in each weather. Rain has puddles and
// a paper boat, snow has snowballs to roll and stack, wind has a kite and leaf
// piles, sun has a watering can, a flower bed and a paddling pool. Nothing here
// is counted, timed or finished for the child.

import { TAU, clamp, damp, dist, ease, lerp } from '../../kit/math.ts'
import type { Pointer, Stage } from '../../kit/types.ts'
import { blob, hash, leaf } from './paint.ts'
import type { G } from './paint.ts'
import { BED, PILES, POOL, PUDDLES, STREAM, YARD, drawPoolBack, drawPoolFront, inPool, inPuddle } from './scenes.ts'
import type { Weather } from './scenes.ts'

export interface Kid {
  x: number
  y: number
  s: number
  air: number
  hop: number
}

export interface YardHost {
  stage: Stage
  kid: Kid
  go(x: number, y: number): void
  hand(side: number): [number, number]
  smile(): void
}

export interface Drawable {
  y: number
  draw: (g: G) => void
}

export interface Yard {
  reset(weather: Weather): void
  update(dt: number): void
  drawGround(g: G): void
  collect(list: Drawable[]): void
  drawOver(g: G): void
  down(p: Pointer): boolean
  up(p: Pointer): void
  landed(x: number, y: number): void
  sky(x: number, y: number): void
  // Where a tap on the ground should send the child: into the water, if the tap was on water.
  aim(x: number, y: number): [number, number]
  arms(): [number, number]
  release(): void
}

interface Ripple {
  x: number
  y: number
  age: number
  max: number
  rx: number
}

interface FlyLeaf {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  life: number
  color: string
}

interface Ball {
  x: number
  // Where it touches the snow.
  y: number
  r: number
  base: Ball | null
  rot: number
  lift: number
  squash: number
  seed: number
}

interface Deco {
  kind: 'carrot' | 'coal' | 'twig'
  x: number
  y: number
  parent: Ball | null
  ox: number
  oy: number
  rot: number
}

interface Plant {
  x: number
  grow: number
  wet: number
  petal: string
}

interface Fly {
  x: number
  y: number
  tx: number
  ty: number
  next: number
  color: string
}

interface Grab {
  kind: 'boat' | 'ball' | 'deco' | 'kite' | 'can'
  p: Pointer
  ball?: Ball
  deco?: Deco
  dx: number
  dy: number
}

const WATER = ['#dbe9ec', '#b9d3da', '#f4fbfc'] as const
const LEAVES = ['#cf7f3a', '#b9573a', '#dba445', '#c9692f'] as const
const PETALS = ['#c9655a', '#e2b33f', '#f6efdf', '#8aa9c2', '#d98a4a'] as const

export function createYard(host: YardHost, snow: HTMLCanvasElement, snowClean: HTMLCanvasElement): Yard {
  const { stage, kid } = host
  const { fx, sfx } = stage
  const snowG = snow.getContext('2d')
  let weather: Weather = 'rain'
  let grab: Grab | null = null
  const ripples: Ripple[] = []
  const flying: FlyLeaf[] = []
  let ambientAt = 0
  let dripAt = 0

  const boat = { x: 330, y: STREAM.y as number, mode: 'stream' as 'stream' | 'puddle' | 'ground', rock: 0, sway: 0 }
  let balls: Ball[] = []
  let decos: Deco[] = []
  let crunch = 0
  const kite = { x: 540, y: 716, px: 540, py: 716, ax: 540, ay: 300, aloft: false, tilt: 0, flutter: 0 }
  const tail: { x: number; y: number }[] = []
  for (let i = 0; i < 8; i++) tail.push({ x: 540 + i * 12, y: 730 })
  const fluff = [1, 1]
  const can = { x: 338, y: 742, water: 1, tilt: 0, lift: 0 }
  let plants: Plant[] = []
  let flies: Fly[] = []
  let pourAt = 0
  let glugAt = 0

  const ripple = (x: number, y: number, rx: number, max = 0.9): void => {
    if (ripples.length > 24) ripples.shift()
    ripples.push({ x, y, age: 0, max, rx })
  }

  const splash = (x: number, y: number, big: boolean): void => {
    fx.burst(x, y - 6, { count: big ? 20 : 5, color: WATER, speed: big ? 360 : 170, angle: -Math.PI / 2, spread: 2.3, gravity: 950, life: 0.7, size: big ? 8 : 4 })
    ripple(x, y, big ? 70 : 34)
    if (big) stage.after(0.12, () => ripple(x, y, 96, 1.1))
    sfx.noise({ dur: big ? 0.22 : 0.1, freq: 1500, to: 350, vol: big ? 0.13 : 0.06, filter: 'lowpass' })
    if (big) {
      sfx.tone({ freq: 330, to: 150, dur: 0.12, type: 'sine', vol: 0.07 })
      host.smile()
    }
  }

  const centerX = (b: Ball): number => (b.base ? centerX(b.base) : b.x)
  const centerY = (b: Ball): number => (b.base ? centerY(b.base) - b.base.r * 0.8 - b.r * 0.7 : b.y - b.r - b.lift)
  const rider = (b: Ball): Ball | undefined => balls.find((q) => q.base === b)
  const depth = (b: Ball): number => (b.base ? depth(b.base) + 1 : 0)
  const rootY = (b: Ball): number => (b.base ? rootY(b.base) : b.y)

  const mkBall = (x: number, y: number, r: number, seed: number): Ball => ({ x, y, r, base: null, rot: seed, lift: 0, squash: 1, seed })

  const burstLeaves = (i: number): void => {
    const pile = PILES[i]!
    for (let k = 0; k < 24; k++) {
      if (flying.length > 90) flying.shift()
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2
      const v = 180 + Math.random() * 260
      flying.push({
        x: pile.x + (Math.random() - 0.5) * 110,
        y: pile.y - 10 - Math.random() * 20,
        vx: Math.cos(a) * v + 40,
        vy: Math.sin(a) * v,
        rot: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 9,
        life: 1.5 + Math.random() * 1.2,
        color: LEAVES[k % LEAVES.length]!,
      })
    }
    fluff[i] = 0.28
    for (let k = 0; k < 3; k++) sfx.noise({ dur: 0.09, freq: 3200 + Math.random() * 1500, vol: 0.06, filter: 'highpass', delay: k * 0.05 })
    host.smile()
  }

  const kiteTip = (): [number, number] => [kite.x - Math.sin(kite.tilt) * 48, kite.y + Math.cos(kite.tilt) * 48]

  return {
    reset(w) {
      weather = w
      grab = null
      ripples.length = 0
      flying.length = 0
      ambientAt = stage.time + 1.5
      if (w === 'rain') {
        // The boat waits on the grass by the step until someone launches it.
        boat.x = 426
        boat.y = 648
        boat.mode = 'ground'
        boat.rock = 0
      } else if (w === 'snow') {
        snowG?.drawImage(snowClean, 0, 0)
        balls = [mkBall(470, 716, 25, 1), mkBall(590, 744, 22, 2), mkBall(700, 708, 27, 3)]
        decos = [
          { kind: 'carrot', x: 1010, y: 742, parent: null, ox: 0, oy: 0, rot: 0.2 },
          { kind: 'coal', x: 1066, y: 730, parent: null, ox: 0, oy: 0, rot: 0 },
          { kind: 'coal', x: 1100, y: 748, parent: null, ox: 0, oy: 0, rot: 1 },
          { kind: 'twig', x: 960, y: 716, parent: null, ox: 0, oy: 0, rot: -0.3 },
          { kind: 'twig', x: 1090, y: 706, parent: null, ox: 0, oy: 0, rot: 0.4 },
        ]
      } else if (w === 'wind') {
        kite.x = kite.px = 540
        kite.y = kite.py = 722
        kite.aloft = false
        kite.tilt = 0
        fluff[0] = 1
        fluff[1] = 1
        tail.forEach((pt, i) => {
          pt.x = 548 + i * 13
          pt.y = 738 + Math.sin(i) * 3
        })
      } else {
        can.x = 338
        can.y = 742
        can.water = 1
        can.tilt = 0
        can.lift = 0
        plants = PETALS.map((petal, i) => ({ x: BED.x0 + 34 + i * ((BED.x1 - BED.x0 - 68) / 4), grow: 0.1, wet: 0, petal }))
        flies = [
          { x: 620, y: 420, tx: 700, ty: 480, next: 0, color: '#f6efdf' },
          { x: 900, y: 380, tx: 820, ty: 460, next: 0, color: '#e2b33f' },
        ]
      }
    },

    update(dt) {
      const t = stage.time
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]!
        r.age += dt
        if (r.age >= r.max) ripples.splice(i, 1)
      }

      if (weather === 'rain') {
        if (t > dripAt) {
          dripAt = t + 0.16 + Math.random() * 0.3
          const p = PUDDLES[Math.floor(Math.random() * PUDDLES.length)]!
          const a = Math.random() * TAU
          const k = Math.sqrt(Math.random()) * 0.8
          ripple(p.x + Math.cos(a) * p.rx * k, p.y + Math.sin(a) * p.ry * k, 16, 0.6)
        }
        if (t > ambientAt) {
          ambientAt = t + 0.5 + Math.random() * 1.1
          sfx.tone({ freq: 1300 + Math.random() * 900, to: 900, dur: 0.05, type: 'sine', vol: 0.022 })
        }
        boat.rock = Math.max(0, boat.rock - dt * 0.8)
        if (grab?.kind === 'boat') {
          const nx = clamp(grab.p.x - grab.dx, 250, 1150)
          boat.sway = damp(boat.sway, clamp((nx - boat.x) * 0.03, -0.5, 0.5), 10, dt)
          boat.x = nx
          boat.y = clamp(grab.p.y - grab.dy, 300, YARD.bottom)
          host.go(clamp(boat.x - 64, 250, 1130), clamp(boat.y + 56, YARD.top, YARD.bottom))
        } else {
          boat.sway = damp(boat.sway, 0, 6, dt)
          if (boat.mode === 'stream' && boat.x < STREAM.x1 + 4) boat.x += dt * lerp(40, 12, clamp((boat.x - (STREAM.x1 - 120)) / 120, 0, 1))
        }
      } else if (weather === 'snow') {
        if (grab?.kind === 'ball' && grab.ball) {
          const b = grab.ball
          const px = clamp(grab.p.x - grab.dx, 250, 1150)
          const py = grab.p.y - grab.dy
          const canLift = b.r < 60 && !rider(b)
          if (py < YARD.top - b.r * 0.5 - 6 && canLift) {
            b.x = px
            b.y = damp(b.y, YARD.top + 30, 8, dt)
            b.lift = Math.max(0, b.y - b.r - py)
          } else {
            const ny = clamp(py + b.r * 0.6, YARD.top, YARD.bottom)
            const moved = Math.hypot(px - b.x, ny - b.y)
            if (moved > 0.2 && b.lift < 2) {
              snowG?.beginPath()
              if (snowG) {
                snowG.moveTo(b.x, b.y - 3)
                snowG.lineTo(px, ny - 3)
                snowG.strokeStyle = 'rgba(160,184,208,0.035)'
                snowG.lineWidth = b.r * 1.05
                snowG.lineCap = 'round'
                snowG.stroke()
              }
              b.rot += ((px - b.x) / b.r) * 0.9
              b.r = Math.min(80, b.r + moved * 0.085 * (1 - b.r / 92))
              crunch += moved
              if (crunch > 34) {
                crunch = 0
                sfx.noise({ dur: 0.08, freq: 600 + Math.random() * 500, vol: 0.055, filter: 'lowpass' })
              }
            }
            b.x = px
            b.y = ny
            b.lift = damp(b.lift, 0, 14, dt)
          }
          host.go(clamp(b.x - b.r - 44, 250, 1130), clamp(b.y + 4, YARD.top, YARD.bottom))
        }
        for (const b of balls) {
          b.squash = damp(b.squash, 1, 9, dt)
          if (grab?.ball !== b && b.lift > 0) {
            b.lift = Math.max(0, b.lift - dt * 900)
            if (b.lift === 0) {
              b.squash = 0.82
              sfx.tone({ freq: 120, to: 70, dur: 0.1, type: 'sine', vol: 0.16 })
            }
          }
        }
        if (grab?.kind === 'deco' && grab.deco) {
          grab.deco.x = clamp(grab.p.x - grab.dx, 240, 1160)
          grab.deco.y = clamp(grab.p.y - grab.dy, 200, YARD.bottom + 20)
        }
      } else if (weather === 'wind') {
        if (t > ambientAt) {
          ambientAt = t + 5 + Math.random() * 4
          sfx.noise({ dur: 1.5, freq: 320, to: 760, vol: 0.035, q: 0.6 })
        }
        const [hx, hy] = host.hand(1)
        if (kite.aloft) {
          let tx = kite.ax + Math.sin(t * 0.7) * 46 + Math.sin(t * 1.9) * 12
          let ty = kite.ay + Math.sin(t * 1.1) * 22
          if (grab?.kind === 'kite') {
            tx = grab.p.x - grab.dx
            ty = Math.min(grab.p.y - grab.dy, 720)
          }
          const d = dist(hx, hy, tx, ty)
          if (d > 620) {
            tx = hx + ((tx - hx) / d) * 620
            ty = hy + ((ty - hy) / d) * 620
          }
          kite.x = damp(kite.x, tx, grab?.kind === 'kite' ? 11 : 2.4, dt)
          kite.y = damp(kite.y, ty, grab?.kind === 'kite' ? 11 : 2.4, dt)
          if (Math.abs(kite.x - kid.x) > 520) host.go(clamp(kite.x - Math.sign(kite.x - kid.x) * 430, 250, 1130), kid.y)
        }
        const vx = (kite.x - kite.px) / Math.max(dt, 0.001)
        const vy = (kite.y - kite.py) / Math.max(dt, 0.001)
        kite.px = kite.x
        kite.py = kite.y
        kite.tilt = damp(kite.tilt, kite.aloft ? clamp(vx * 0.0012, -0.6, 0.6) + Math.sin(t * 2.2) * 0.08 + 0.18 : 1.1, 6, dt)
        kite.flutter += Math.hypot(vx, vy) * dt
        if (kite.flutter > 260 && kite.aloft) {
          kite.flutter = 0
          sfx.noise({ dur: 0.12, freq: 900 + Math.random() * 500, to: 1900, vol: 0.035, q: 1.2 })
        }
        const [tipX, tipY] = kiteTip()
        tail[0]!.x = tipX
        tail[0]!.y = tipY
        for (let i = 1; i < tail.length; i++) {
          const prev = tail[i - 1]!
          const a = kite.aloft ? 0.75 + Math.sin(t * 5.5 - i * 0.9) * 0.55 : 0.15
          const pt = tail[i]!
          pt.x = damp(pt.x, prev.x + Math.cos(a) * 17, kite.aloft ? 13 : 5, dt)
          pt.y = damp(pt.y, prev.y + Math.sin(a) * 17, kite.aloft ? 13 : 5, dt)
        }
        for (let i = 0; i < 2; i++) fluff[i] = Math.min(1, fluff[i]! + dt * 0.11)
        for (let i = flying.length - 1; i >= 0; i--) {
          const f = flying[i]!
          f.life -= dt
          if (f.life <= 0) {
            flying.splice(i, 1)
            continue
          }
          f.vx = damp(f.vx, 130, 1.2, dt)
          f.vy = Math.min(120, f.vy + 420 * dt)
          f.x += f.vx * dt
          f.y += (f.vy + Math.sin(t * 6 + i) * 40) * dt
          f.rot += f.spin * dt
        }
      } else {
        if (t > ambientAt) {
          ambientAt = t + 5 + Math.random() * 5
          const f = 2100 + Math.random() * 500
          sfx.tone({ freq: f, to: f * 1.18, dur: 0.07, type: 'sine', vol: 0.022 })
          sfx.tone({ freq: f * 1.1, to: f * 0.92, dur: 0.09, type: 'sine', vol: 0.022, delay: 0.11 })
        }
        let pouring = false
        if (grab?.kind === 'can') {
          can.x = clamp(grab.p.x - grab.dx, 250, 1150)
          can.y = clamp(grab.p.y - grab.dy, 360, YARD.bottom)
          const overBed = can.x > BED.x0 - 96 && can.x < BED.x1 - 20 && can.y < BED.y + 70
          pouring = overBed
          if (inPool(can.x, can.y, -6) && can.water < 1) {
            can.water = Math.min(1, can.water + dt / 1.1)
            if (t > glugAt) {
              glugAt = t + 0.24
              sfx.tone({ freq: 260 + can.water * 160, to: 170 + can.water * 120, dur: 0.09, type: 'sine', vol: 0.08 })
              ripple(can.x + 10, can.y - 4, 30, 0.6)
            }
          }
          // While watering, the child stands behind the bed so the flowers are never hidden.
          host.go(clamp(can.x - 84, 250, 1130), pouring ? YARD.top + 4 : clamp(can.y + 26, YARD.top, YARD.bottom))
        }
        can.tilt = damp(can.tilt, pouring ? 1 : 0, 7, dt)
        can.lift = damp(can.lift, pouring ? Math.max(0, can.y - (BED.y - 96)) : 0, 9, dt)
        if (can.tilt > 0.6 && can.water > 0) {
          can.water = Math.max(0, can.water - dt / 6.5)
          const lx = can.x + 92
          for (const pl of plants) {
            if (Math.abs(pl.x - lx) < 50) {
              const before = pl.grow
              pl.grow = Math.min(1, pl.grow + dt * 0.3)
              pl.wet = Math.min(1, pl.wet + dt * 1.5)
              if (before < 1 && pl.grow === 1) {
                sfx.note(plants.indexOf(pl), 0.7, 'sine', 0.07)
                host.smile()
              }
            }
          }
          if (t > pourAt) {
            pourAt = t + 0.085
            sfx.noise({ dur: 0.05, freq: 2400 + Math.random() * 1600, vol: 0.03, q: 2 })
            fx.burst(lx + (Math.random() - 0.5) * 30, BED.y - 2, { count: 1, color: WATER, speed: 90, angle: -Math.PI / 2, spread: 1.8, gravity: 600, life: 0.3, size: 4 })
          }
        }
        for (const pl of plants) pl.wet = Math.max(0, pl.wet - dt * 0.05)
        for (const f of flies) {
          if (t > f.next || dist(f.x, f.y, f.tx, f.ty) < 6) {
            f.next = t + 4 + Math.random() * 4
            const open = plants.filter((pl) => pl.grow >= 1)
            if (open.length > 0 && Math.random() < 0.7) {
              const pl = open[Math.floor(Math.random() * open.length)]!
              f.tx = pl.x
              f.ty = BED.y - 104
            } else {
              f.tx = 300 + Math.random() * 800
              f.ty = 330 + Math.random() * 220
            }
          }
          const d = dist(f.x, f.y, f.tx, f.ty) || 1
          const sp = Math.min(46, d * 1.2)
          f.x += ((f.tx - f.x) / d) * sp * dt + Math.sin(t * 3 + f.tx) * 14 * dt
          f.y += ((f.ty - f.y) / d) * sp * dt + Math.cos(t * 4.3 + f.ty) * 18 * dt
        }
      }
    },

    drawGround(g) {
      for (const r of ripples) {
        const k = r.age / r.max
        g.beginPath()
        g.ellipse(r.x, r.y, r.rx * ease.outCubic(k), r.rx * 0.3 * ease.outCubic(k), 0, 0, TAU)
        g.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.7})`
        g.lineWidth = 3
        g.stroke()
      }
      if (weather === 'sun') {
        for (const pl of plants) {
          if (pl.wet > 0.02) blob(g, pl.x, BED.y + 2, 34, 12, `rgba(60,38,24,${pl.wet * 0.5})`, pl.x, 0.1)
        }
      }
    },

    collect(list) {
      const t = stage.time
      const wading = kid.air < 8 && (weather === 'sun' ? inPool(kid.x, kid.y) : weather === 'rain' ? inPuddle(kid.x, kid.y) !== null : false)
      if (wading) {
        const deep = weather === 'sun'
        list.push({
          y: kid.y + 0.3,
          draw: (g) => {
            g.beginPath()
            g.ellipse(kid.x, kid.y - (deep ? 5 : -2), deep ? 56 : 48, deep ? 13 : 8, 0, 0, TAU)
            g.fillStyle = deep ? 'rgba(156,202,219,0.86)' : 'rgba(169,194,200,0.7)'
            g.fill()
            g.beginPath()
            g.ellipse(kid.x, kid.y - (deep ? 5 : -2), (deep ? 56 : 48) + Math.sin(t * 2) * 3, (deep ? 13 : 8) + Math.sin(t * 2) * 1, 0, Math.PI * 1.05, Math.PI * 1.95)
            g.strokeStyle = 'rgba(255,255,255,0.7)'
            g.lineWidth = 2.5
            g.stroke()
          },
        })
      }
      if (weather === 'rain') {
        const held = grab?.kind === 'boat'
        list.push({
          y: held ? 2000 : boat.mode === 'stream' ? STREAM.y - 30 : boat.y,
          draw: (g) => {
            const floating = boat.mode !== 'ground' && !held
            g.save()
            g.translate(boat.x, boat.y + (floating ? Math.sin(t * 2.1) * 2 : 0))
            g.rotate(held ? boat.sway : floating ? Math.sin(t * 1.7) * 0.06 + Math.sin(t * 9) * 0.16 * boat.rock : 0.24)
            g.scale(held ? 1.12 : 1, held ? 1.12 : 1)
            g.beginPath()
            g.moveTo(0, -46)
            g.lineTo(-21, -6)
            g.lineTo(21, -6)
            g.closePath()
            g.fillStyle = '#fbf6ea'
            g.fill()
            g.beginPath()
            g.moveTo(0, -46)
            g.lineTo(21, -6)
            g.lineTo(0, -6)
            g.closePath()
            g.fillStyle = 'rgba(150,130,100,0.25)'
            g.fill()
            g.beginPath()
            g.moveTo(-38, -7)
            g.lineTo(38, -7)
            g.lineTo(23, 13)
            g.lineTo(-23, 13)
            g.closePath()
            g.fillStyle = '#f6efdf'
            g.fill()
            g.beginPath()
            g.moveTo(-38, -7)
            g.lineTo(0, -7)
            g.lineTo(-10, 13)
            g.lineTo(-23, 13)
            g.closePath()
            g.fillStyle = 'rgba(150,130,100,0.2)'
            g.fill()
            if (floating) {
              g.strokeStyle = 'rgba(255,255,255,0.75)'
              g.lineWidth = 3
              g.beginPath()
              g.moveTo(-34, 12)
              g.quadraticCurveTo(-20, 17, -6, 12)
              g.moveTo(4, 13)
              g.quadraticCurveTo(18, 18, 32, 12)
              g.stroke()
            }
            g.restore()
          },
        })
      } else if (weather === 'snow') {
        const sorted = [...balls].sort((a, b) => depth(a) - depth(b))
        for (const b of sorted) {
          const held = grab?.ball === b
          list.push({
            y: held && b.lift > 4 ? 1900 : rootY(b) + depth(b) * 0.1,
            draw: (g) => {
              const cx = centerX(b)
              const cy = centerY(b)
              if (!b.base) {
                g.beginPath()
                g.ellipse(b.x, b.y - 2, b.r * 0.92, b.r * 0.22, 0, 0, TAU)
                g.fillStyle = 'rgba(150,176,204,0.4)'
                g.fill()
              }
              g.save()
              g.translate(cx, cy + b.r)
              g.scale(1 / Math.sqrt(b.squash), b.squash)
              g.translate(0, -b.r)
              blob(g, 0, 0, b.r, b.r * 0.97, '#fcfefe', b.seed, 0.03, 12)
              blob(g, b.r * 0.14, b.r * 0.2, b.r * 0.8, b.r * 0.72, 'rgba(184,206,226,0.34)', b.seed + 1, 0.05, 10)
              blob(g, -b.r * 0.2, -b.r * 0.26, b.r * 0.62, b.r * 0.56, '#fcfefe', b.seed + 2, 0.05, 10)
              g.fillStyle = 'rgba(160,186,210,0.55)'
              for (let k = 0; k < 5; k++) {
                const a = b.rot + k * 1.31
                const rr = b.r * (0.3 + hash(b.seed + k) * 0.4)
                g.beginPath()
                g.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, b.r * 0.09, b.r * 0.05, a, 0, TAU)
                g.fill()
              }
              g.restore()
            },
          })
        }
        for (const d of decos) {
          const held = grab?.deco === d
          const wx = d.parent ? centerX(d.parent) + d.ox : d.x
          const wy = d.parent ? centerY(d.parent) + d.oy : d.y
          list.push({
            y: held ? 2000 : d.parent ? rootY(d.parent) + 3 : d.y,
            draw: (g) => {
              g.save()
              g.translate(wx, wy)
              if (held) g.scale(1.15, 1.15)
              if (d.kind === 'carrot') {
                g.rotate(d.parent ? 0.12 : d.rot)
                g.beginPath()
                g.moveTo(-6, -10)
                g.quadraticCurveTo(22, -8, 44, 3)
                g.quadraticCurveTo(20, 10, -6, 10)
                g.quadraticCurveTo(-12, 0, -6, -10)
                g.fillStyle = '#dd8238'
                g.fill()
                g.strokeStyle = 'rgba(160,80,20,0.5)'
                g.lineWidth = 2
                g.beginPath()
                g.moveTo(6, -6)
                g.lineTo(8, 0)
                g.moveTo(20, -3)
                g.lineTo(21, 3)
                g.stroke()
                if (!d.parent) {
                  leaf(g, -16, -5, 20, 2.7, '#6f8f5e')
                  leaf(g, -16, 5, 20, 3.5, '#7fa06b')
                }
              } else if (d.kind === 'coal') {
                blob(g, 0, 0, 13, 12, '#4a4038', d.rot + 3, 0.18, 7)
                blob(g, -3, -4, 5, 3.5, 'rgba(255,255,255,0.18)', 2, 0.1)
              } else {
                const a = d.parent ? Math.atan2(d.oy, d.ox) : d.rot
                g.rotate(a)
                g.strokeStyle = '#7a5a3e'
                g.lineWidth = 6
                g.beginPath()
                g.moveTo(-6, 0)
                g.lineTo(58, 0)
                g.moveTo(34, 0)
                g.lineTo(52, -16)
                g.moveTo(22, 0)
                g.lineTo(34, 12)
                g.stroke()
              }
              g.restore()
            },
          })
        }
      } else if (weather === 'wind') {
        PILES.forEach((pile, i) => {
          list.push({
            y: pile.y,
            draw: (g) => {
              const f = fluff[i]!
              blob(g, pile.x, pile.y + 4, 96, 22, 'rgba(110,75,30,0.22)', i + 5, 0.06)
              for (let k = 0; k < 34; k++) {
                const a = hash(k * 3.1 + i) * TAU
                const rr = Math.sqrt(hash(k * 5.7 + i))
                const lx = pile.x + Math.cos(a) * 86 * rr
                const ly = pile.y - (1 - rr * 0.85) * 52 * f - Math.abs(Math.sin(a)) * 8 + 6
                leaf(g, lx, ly, 27, hash(k * 9.3 + i) * TAU + Math.sin(t * 2 + k) * 0.12 * f, LEAVES[k % LEAVES.length]!)
              }
            },
          })
        })
        list.push({
          y: kite.aloft ? 2000 : kite.y,
          draw: (g) => {
            const [hx, hy] = host.hand(1)
            // String, with a little sag.
            g.strokeStyle = 'rgba(245,236,217,0.9)'
            g.lineWidth = 2.2
            g.beginPath()
            g.moveTo(hx, hy)
            g.quadraticCurveTo((hx + kite.x) / 2 + 20, (hy + kite.y) / 2 + (kite.aloft ? 70 : 6), kite.x, kite.y)
            g.stroke()
            // Tail with bows.
            g.strokeStyle = '#f5ecd9'
            g.lineWidth = 3
            g.beginPath()
            tail.forEach((pt, i) => (i === 0 ? g.moveTo(pt.x, pt.y) : g.lineTo(pt.x, pt.y)))
            g.stroke()
            for (let i = 2; i < tail.length; i += 2) {
              const pt = tail[i]!
              const prev = tail[i - 1]!
              const a = Math.atan2(pt.y - prev.y, pt.x - prev.x) + Math.PI / 2
              leaf(g, pt.x + Math.cos(a) * 9, pt.y + Math.sin(a) * 9, 20, a, i % 4 === 0 ? '#e2b33f' : '#6d909c')
              leaf(g, pt.x - Math.cos(a) * 9, pt.y - Math.sin(a) * 9, 20, a, i % 4 === 0 ? '#e2b33f' : '#6d909c')
            }
            g.save()
            g.translate(kite.x, kite.y)
            g.rotate(kite.tilt)
            if (!kite.aloft) g.scale(1, 0.5)
            const quads: [number, number, number, number, string][] = [
              [0, -56, 38, -8, '#b3534b'],
              [38, -8, 0, 48, '#f5ecd9'],
              [0, 48, -38, -8, '#b3534b'],
              [-38, -8, 0, -56, '#f5ecd9'],
            ]
            for (const [x1, y1, x2, y2, c] of quads) {
              g.beginPath()
              g.moveTo(0, -8)
              g.lineTo(x1, y1)
              g.lineTo(x2, y2)
              g.closePath()
              g.fillStyle = c
              g.fill()
            }
            g.strokeStyle = 'rgba(120,85,50,0.6)'
            g.lineWidth = 2.5
            g.beginPath()
            g.moveTo(0, -56)
            g.lineTo(0, 48)
            g.moveTo(-38, -8)
            g.lineTo(38, -8)
            g.stroke()
            g.restore()
          },
        })
      } else {
        const kidIn = inPool(kid.x, kid.y) && kid.air < 30
        list.push({ y: POOL.y - POOL.ry - 14, draw: (g) => drawPoolBack(g, t) })
        list.push({ y: kidIn ? kid.y + 0.5 : POOL.y - POOL.ry - 13.5, draw: (g) => drawPoolFront(g) })
        list.push({
          y: BED.y,
          draw: (g) => {
            plants.forEach((pl, i) => {
              const e = pl.grow
              const h = 14 + 78 * ease.outCubic(e)
              const sway = Math.sin(t * 1.1 + i * 1.7) * 4 * e
              const topX = pl.x + sway
              const topY = BED.y - h
              g.strokeStyle = '#5f8a4c'
              g.lineWidth = 5
              g.beginPath()
              g.moveTo(pl.x, BED.y)
              g.quadraticCurveTo(pl.x, BED.y - h * 0.5, topX, topY)
              g.stroke()
              const ls = clamp(e * 2.2, 0.4, 1)
              leaf(g, pl.x - 11 * ls, BED.y - h * 0.38, 26 * ls, -2.6, '#6fa552')
              leaf(g, pl.x + 11 * ls, BED.y - h * 0.5, 26 * ls, -0.5, '#7bb05c')
              if (e > 0.5) {
                const open = clamp((e - 0.68) / 0.32, 0, 1)
                if (open <= 0) {
                  blob(g, topX, topY - 4, 7, 10, pl.petal, i, 0.1)
                } else {
                  const o = ease.outBack(open)
                  for (let k = 0; k < 6; k++) {
                    const a = (k / 6) * TAU + i
                    blob(g, topX + Math.cos(a) * 13 * o, topY - 4 + Math.sin(a) * 13 * o, 5 + 8 * o, 5 + 7 * o, pl.petal, k + i, 0.12, 7)
                  }
                  blob(g, topX, topY - 4, 8, 8, i === 1 ? '#a9703a' : '#e9bf4f', i + 9, 0.1, 7)
                }
              }
            })
          },
        })
        const held = grab?.kind === 'can'
        list.push({
          y: held ? 2000 : can.y,
          draw: (g) => {
            const cy = can.y - can.lift
            if (!held) {
              g.beginPath()
              g.ellipse(can.x, can.y + 2, 46, 10, 0, 0, TAU)
              g.fillStyle = 'rgba(40,70,40,0.2)'
              g.fill()
            }
            // Water from the rose.
            if (can.tilt > 0.6 && can.water > 0) {
              const sx = can.x + 62
              const sy = cy - 44
              g.strokeStyle = 'rgba(214,236,244,0.85)'
              g.lineWidth = 2.6
              g.beginPath()
              for (let k = -2; k <= 2; k++) {
                const lx = can.x + 92 + k * 13 + Math.sin(t * 20 + k) * 2
                g.moveTo(sx + k * 3, sy + 4)
                g.quadraticCurveTo(sx + 22 + k * 8, sy + 6, lx, BED.y - 2)
              }
              g.stroke()
            }
            g.save()
            g.translate(can.x, cy - 34)
            g.rotate(can.tilt * 0.62)
            // Handle.
            g.strokeStyle = '#7f8c86'
            g.lineWidth = 8
            g.beginPath()
            g.moveTo(-30, -18)
            g.quadraticCurveTo(-66, -6, -34, 24)
            g.stroke()
            // Spout and rose.
            g.strokeStyle = '#8f9c96'
            g.lineWidth = 11
            g.beginPath()
            g.moveTo(28, 14)
            g.lineTo(62, -28)
            g.stroke()
            g.save()
            g.translate(66, -33)
            g.rotate(-0.85)
            g.beginPath()
            g.ellipse(0, 0, 8, 16, 0, 0, TAU)
            g.fillStyle = '#7f8c86'
            g.fill()
            g.restore()
            // Body.
            g.beginPath()
            g.moveTo(-34, -28)
            g.lineTo(34, -28)
            g.lineTo(38, 30)
            g.quadraticCurveTo(0, 38, -38, 30)
            g.closePath()
            g.fillStyle = '#a3b0a9'
            g.fill()
            g.fillStyle = 'rgba(255,255,255,0.25)'
            g.fillRect(-26, -22, 8, 46)
            g.fillStyle = 'rgba(60,80,75,0.16)'
            g.fillRect(16, -26, 20, 58)
            // The open top, and the water you can see in it.
            g.beginPath()
            g.ellipse(0, -28, 34, 9, 0, 0, TAU)
            g.fillStyle = '#5d6a66'
            g.fill()
            if (can.water > 0.03) {
              g.beginPath()
              g.ellipse(0, -28 + (1 - can.water) * 5, 30 * (0.6 + can.water * 0.4), 7 * (0.5 + can.water * 0.5), 0, 0, TAU)
              g.fillStyle = '#9ccadb'
              g.fill()
            }
            g.restore()
          },
        })
        for (const f of flies) {
          list.push({
            y: 1800,
            draw: (g) => {
              const flap = Math.abs(Math.sin(t * 9 + f.tx))
              g.save()
              g.translate(f.x, f.y)
              g.rotate(Math.sin(t * 2 + f.ty) * 0.3)
              for (const side of [-1, 1]) {
                g.beginPath()
                g.ellipse(side * 7 * flap, -3, 8 * flap + 1, 10, side * 0.4, 0, TAU)
                g.ellipse(side * 5 * flap, 6, 5 * flap + 1, 6, -side * 0.4, 0, TAU)
                g.fillStyle = f.color
                g.fill()
              }
              g.fillStyle = '#4a3728'
              g.fillRect(-1.2, -8, 2.4, 16)
              g.restore()
            },
          })
        }
      }
    },

    drawOver(g) {
      for (const f of flying) leaf(g, f.x, f.y, 24, f.rot, f.color)
    },

    down(p) {
      if (grab) return false
      if (weather === 'rain') {
        if (dist(p.x, p.y, boat.x, boat.y - 14) < 66) {
          grab = { kind: 'boat', p, dx: p.x - boat.x, dy: p.y - boat.y }
          sfx.tone({ freq: 700, to: 1100, dur: 0.06, type: 'sine', vol: 0.06 })
          ripple(boat.x, boat.y + 8, 40, 0.6)
          return true
        }
      } else if (weather === 'snow') {
        let bestD: Deco | null = null
        let best = 50
        for (const d of decos) {
          const wx = d.parent ? centerX(d.parent) + d.ox : d.x
          const wy = d.parent ? centerY(d.parent) + d.oy : d.y
          const dd = dist(p.x, p.y, wx + (d.kind === 'twig' && !d.parent ? 24 : 0), wy)
          if (dd < best) {
            best = dd
            bestD = d
          }
        }
        if (bestD) {
          const wx = bestD.parent ? centerX(bestD.parent) + bestD.ox : bestD.x
          const wy = bestD.parent ? centerY(bestD.parent) + bestD.oy : bestD.y
          bestD.parent = null
          bestD.x = wx
          bestD.y = wy
          grab = { kind: 'deco', p, deco: bestD, dx: p.x - wx, dy: p.y - wy }
          sfx.tone({ freq: 520, to: 420, dur: 0.05, type: 'triangle', vol: 0.06 })
          return true
        }
        let bestB: Ball | null = null
        let bd = 1e9
        for (const b of balls) {
          const dd = dist(p.x, p.y, centerX(b), centerY(b))
          if (dd < b.r + 30 && dd - b.r < bd) {
            bd = dd - b.r
            bestB = b
          }
        }
        if (bestB) {
          const cx = centerX(bestB)
          const cy = centerY(bestB)
          if (bestB.base) {
            const ground = rootY(bestB)
            bestB.base = null
            bestB.x = cx
            bestB.y = ground
            bestB.lift = Math.max(0, ground - bestB.r - cy)
          }
          grab = { kind: 'ball', p, ball: bestB, dx: p.x - cx, dy: p.y - cy }
          bestB.squash = 0.9
          sfx.noise({ dur: 0.08, freq: 700, vol: 0.07, filter: 'lowpass' })
          return true
        }
      } else if (weather === 'wind') {
        if (dist(p.x, p.y, kite.x, kite.y) < 80) {
          grab = { kind: 'kite', p, dx: p.x - kite.x, dy: p.y - kite.y }
          if (!kite.aloft) sfx.noise({ dur: 0.3, freq: 500, to: 2200, vol: 0.07, q: 0.8 })
          kite.aloft = true
          return true
        }
      } else if (dist(p.x, p.y, can.x + 6, can.y - 34) < 96) {
        grab = { kind: 'can', p, dx: p.x - can.x, dy: p.y - can.y }
        sfx.tone({ freq: 880, to: 700, dur: 0.05, type: 'triangle', vol: 0.05 })
        return true
      }
      return false
    },

    up(p) {
      if (!grab || grab.p.id !== p.id) return
      const was = grab
      grab = null
      if (was.kind === 'boat') {
        const puddle = inPuddle(boat.x, boat.y)
        if (Math.abs(boat.y - STREAM.y) < 52 && boat.x > STREAM.x0 - 30) {
          boat.mode = 'stream'
          boat.y = STREAM.y
          boat.x = clamp(boat.x, STREAM.x0, STREAM.x1 + 20)
          splash(boat.x, boat.y + 6, false)
        } else if (puddle) {
          boat.mode = 'puddle'
          boat.y = clamp(boat.y, puddle.y - 8, puddle.y + 6)
          splash(boat.x, boat.y + 6, false)
        } else {
          boat.mode = 'ground'
          boat.y = clamp(boat.y, YARD.top - 30, YARD.bottom)
          sfx.tone({ freq: 220, to: 160, dur: 0.05, type: 'triangle', vol: 0.05 })
        }
      } else if (was.kind === 'ball' && was.ball) {
        const b = was.ball
        const cy = centerY(b)
        let under: Ball | null = null
        for (const c of balls) {
          if (c === b || rider(c) || depth(c) >= 2 || c.r < b.r * 0.72) continue
          let chain: Ball | null = c
          let own = false
          while (chain) {
            if (chain === b) own = true
            chain = chain.base
          }
          if (own) continue
          // Let go anywhere on or above another ball and this one settles on top of it.
          const dx = Math.abs(centerX(c) - b.x)
          const top = centerY(c) - c.r
          const near = dist(b.x, cy, centerX(c), centerY(c)) < c.r + b.r * 0.75
          const over = dx < c.r + 30 && cy < centerY(c) + c.r * 0.4 && cy > top - b.r * 2 - 90
          if (dx < c.r + 30 && (near || over)) under = c
        }
        if (under) {
          b.base = under
          b.lift = 0
          b.squash = 0.8
          under.squash = 0.9
          sfx.tone({ freq: 140, to: 80, dur: 0.11, type: 'sine', vol: 0.18 })
          sfx.noise({ dur: 0.1, freq: 500, vol: 0.07, filter: 'lowpass' })
          fx.burst(centerX(under), centerY(under) - under.r * 0.8, { count: 6, color: '#ffffff', speed: 90, life: 0.5, size: 5, gravity: 200, angle: -Math.PI / 2, spread: Math.PI })
          host.smile()
        }
      } else if (was.kind === 'deco' && was.deco) {
        const d = was.deco
        let hit: Ball | null = null
        let best = 1e9
        for (const b of balls) {
          const dd = dist(d.x, d.y, centerX(b), centerY(b))
          if (dd < b.r + 18 && dd < best) {
            best = dd
            hit = b
          }
        }
        if (hit) {
          let ox = d.x - centerX(hit)
          let oy = d.y - centerY(hit)
          const len = Math.hypot(ox, oy) || 1
          const want = d.kind === 'twig' ? hit.r * 0.82 : Math.min(len, hit.r * 0.62)
          if (d.kind === 'twig' && len < 4) ox = 1
          ox = (ox / len) * want
          oy = (oy / len) * want
          d.parent = hit
          d.ox = ox
          d.oy = oy
          hit.squash = 0.93
          sfx.tone({ freq: 300, to: 200, dur: 0.06, type: 'triangle', vol: 0.09 })
          sfx.noise({ dur: 0.05, freq: 800, vol: 0.05, filter: 'lowpass' })
        } else {
          d.y = clamp(d.y, YARD.top - 10, YARD.bottom + 10)
          sfx.noise({ dur: 0.05, freq: 600, vol: 0.04, filter: 'lowpass' })
        }
      } else if (was.kind === 'kite') {
        if (kite.y > 590) {
          kite.aloft = false
          kite.y = clamp(kite.y, 640, 750)
          sfx.noise({ dur: 0.1, freq: 1200, vol: 0.04, filter: 'lowpass' })
        } else {
          kite.ax = kite.x
          kite.ay = kite.y
        }
      } else if (was.kind === 'can') {
        can.y = clamp(can.y, YARD.top + 20, YARD.bottom)
        // Never set down on the flowers: it stands on the grass in front of the bed.
        if (can.x > BED.x0 - 70 && can.x < BED.x1 + 70 && can.y < BED.y + 64) can.y = BED.y + 64
        sfx.tone({ freq: 420, to: 300, dur: 0.05, type: 'triangle', vol: 0.06 })
        if (inPool(can.x, can.y, -6)) splash(can.x, can.y, false)
      }
    },

    landed(x, y) {
      if (weather === 'rain') {
        const p = inPuddle(x, y)
        splash(x, y, p !== null)
        if (p && boat.mode === 'puddle' && inPuddle(boat.x, boat.y) === p) boat.rock = 1
      } else if (weather === 'snow') {
        if (snowG) {
          snowG.fillStyle = 'rgba(170,192,212,0.38)'
          for (const side of [-1, 1]) {
            snowG.beginPath()
            snowG.ellipse(x + side * 15, y - 3, 12, 6, 0, 0, TAU)
            snowG.fill()
          }
        }
        fx.burst(x, y - 4, { count: 4, color: '#ffffff', speed: 80, life: 0.4, size: 5, gravity: 250, angle: -Math.PI / 2, spread: Math.PI })
        sfx.noise({ dur: 0.09, freq: 520 + Math.random() * 300, vol: 0.06, filter: 'lowpass' })
      } else if (weather === 'wind') {
        const i = PILES.findIndex((pile) => Math.abs(x - pile.x) < 96 && Math.abs(y - pile.y) < 44)
        if (i >= 0 && fluff[i]! > 0.5) burstLeaves(i)
        else sfx.noise({ dur: 0.06, freq: 2600, vol: 0.03, filter: 'highpass' })
      } else if (inPool(x, y)) {
        splash(x, y + 6, true)
      } else {
        sfx.tone({ freq: 150, to: 100, dur: 0.06, type: 'sine', vol: 0.07 })
      }
    },

    sky(x, y) {
      if (weather === 'rain') {
        fx.burst(x, y, { count: 7, color: WATER, speed: 120, angle: Math.PI / 2, spread: 1, gravity: 900, life: 0.5, size: 4 })
        sfx.tone({ freq: 1500, to: 1000, dur: 0.06, type: 'sine', vol: 0.05 })
        sfx.tone({ freq: 1900, to: 1300, dur: 0.05, type: 'sine', vol: 0.04, delay: 0.08 })
      } else if (weather === 'snow') {
        fx.burst(x, y, { count: 9, color: '#ffffff', speed: 110, life: 1, size: 5, gravity: 60, drag: 0.94 })
        sfx.note(7 + Math.floor(Math.random() * 3), 0.5, 'sine', 0.05)
      } else if (weather === 'wind') {
        for (let k = 0; k < 6; k++) {
          flying.push({ x: x + (Math.random() - 0.5) * 50, y: y + (Math.random() - 0.5) * 50, vx: 200 + Math.random() * 160, vy: -60 + Math.random() * 80, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 9, life: 1.6, color: LEAVES[k % LEAVES.length]! })
        }
        sfx.noise({ dur: 0.4, freq: 500, to: 1600, vol: 0.06, q: 0.8 })
      } else {
        const f = flies[Math.floor(Math.random() * flies.length)]
        if (f) {
          f.tx = x
          f.ty = y
          f.next = stage.time + 5
        }
        sfx.tone({ freq: 2300, to: 2700, dur: 0.07, type: 'sine', vol: 0.035 })
        sfx.tone({ freq: 2500, to: 2100, dur: 0.09, type: 'sine', vol: 0.035, delay: 0.1 })
      }
    },

    aim(x, y) {
      if (weather === 'sun' && inPool(x, y, 16)) return [clamp(x, POOL.x - POOL.rx * 0.6, POOL.x + POOL.rx * 0.6), POOL.y + 8]
      if (weather === 'rain') {
        const p = inPuddle(x, y)
        if (p) return [clamp(x, p.x - p.rx * 0.6, p.x + p.rx * 0.6), clamp(y, p.y - p.ry * 0.2, p.y + p.ry * 0.5)]
      }
      if (weather === 'wind') {
        const pile = PILES.find((q) => Math.abs(x - q.x) < 100 && Math.abs(y - q.y + 20) < 60)
        if (pile) return [pile.x, pile.y]
      }
      return [clamp(x, 252, 1132), clamp(y, YARD.top, YARD.bottom)]
    },

    arms() {
      if (weather === 'wind' && kite.aloft) return [0, 0.82]
      if (grab?.kind === 'ball' && grab.ball && grab.ball.lift > 4) return [0.55, 0.55]
      if (grab?.kind === 'ball') return [0, 0.3]
      if (grab?.kind === 'can' || grab?.kind === 'boat') return [0, 0.4]
      return [0, 0]
    },

    release() {
      if (grab) this.up(grab.p)
      // A kite left flying comes down on the grass when its string goes indoors.
      if (weather === 'wind' && kite.aloft) {
        kite.aloft = false
        kite.x = kite.px = clamp(kite.x, 320, 1100)
        kite.y = kite.py = 720
        tail.forEach((pt, i) => {
          pt.x = kite.x + 8 + i * 13
          pt.y = 736 + Math.sin(i) * 3
        })
      }
    },
  }
}
