// Micro Mayhem: a rapid string of four-second microgames. One shouted word, one
// obvious gesture, a joke ending whether you win or lose, and it gets faster
// every four games. Four mascots are the hearts; lose them all and the mascot
// takes a pie in the face and the run starts again at slow speed.

import { blinkAt, circle, ellipse, face, hint, label, rrect, sprite, squash, star, volume } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { clamp, ease, lerp, rnd, rndInt, shuffle, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { balance } from './balance.ts'
import { catchEggs } from './catch.ts'
import { dodge } from './dodge.ts'
import { feed } from './feed.ts'
import { sunburst } from './micro.ts'
import type { Env, Micro, MicroDef, MicroState } from './micro.ts'
import { pick } from './pick.ts'
import { pop } from './pop.ts'
import { scrub } from './scrub.ts'
import { stop } from './stop.ts'
import { swat } from './swat.ts'
import { wake } from './wake.ts'

const DEFS: readonly MicroDef[] = [pop, catchEggs, wake, dodge, swat, balance, feed, stop, scrub, pick]
// The game every run opens with: any tap anywhere near a balloon pays off.
const FIRST = 'pop'
const LIVES = 4

interface Active {
  def: MicroDef
  micro: Micro
  layer: HTMLCanvasElement
  age: number
  t: number
  state: MicroState
  since: number
  timers: { at: number; fn: () => void }[]
  intro: number
  dur: number
  beat: number
}

type Phase = 'play' | 'faster' | 'pie'

// The mascot: Tock, an alarm clock with a face on its dial.
function tock(g: CanvasRenderingContext2D, x: number, y: number, r: number, mood: Mood, time: number, look = 0, seed = 0): void {
  ellipse(g, x - r * 0.42, y + r * 0.95, r * 0.3, r * 0.15, '#c9541f')
  ellipse(g, x + r * 0.42, y + r * 0.95, r * 0.3, r * 0.15, '#c9541f')
  circle(g, x - r * 0.64, y - r * 0.74, r * 0.27, '#ff5d5d', '#a3262e', r * 0.08)
  circle(g, x + r * 0.64, y - r * 0.74, r * 0.27, '#ff5d5d', '#a3262e', r * 0.08)
  rrect(g, x - r * 0.11, y - r * 1.2, r * 0.22, r * 0.3, r * 0.08, '#a3262e')
  circle(g, x, y, r, '#ffc93c', '#d97a16', r * 0.1)
  circle(g, x, y, r * 0.76, '#fff6d6')
  ellipse(g, x - r * 0.46, y + r * 0.16, r * 0.13, r * 0.09, 'rgba(255,120,140,0.6)')
  ellipse(g, x + r * 0.46, y + r * 0.16, r * 0.13, r * 0.09, 'rgba(255,120,140,0.6)')
  face(g, x, y - r * 0.12, r * 0.16, mood, look, 0, blinkAt(time, seed))
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const dpr = clamp(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 1, 2)
  const layers = [0, 1].map(() => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    return canvas
  })
  let layerAt = 0

  let lives = LIVES
  let wins = 0
  let best = 0
  let runPlayed = 0
  let level = 0
  let phase: Phase = 'play'
  let phaseT = 0
  let phaseFlag = false
  let newBest = false
  let started = false
  let lastTouchAt = -99
  let cur!: Active
  let prev: Active | null = null
  let slide = 1
  let bag: MicroDef[] = []
  let lastKey = ''

  const lifeHop: Spring[] = []
  // Seconds since each heart was lost, or -1 while it is still here.
  const lifeFall: number[] = []
  for (let i = 0; i < LIVES; i++) {
    lifeHop.push(spring(1, 260, 9))
    lifeFall.push(-1)
  }
  const streakPop = spring(1, 240, 9)

  const pace = () => Math.min(2, 1 + level * 0.16)

  const nextDef = (): MicroDef => {
    if (bag.length === 0) {
      bag = shuffle(DEFS, stage.rand)
      if (runPlayed === 0 && lastKey === '') {
        const first = DEFS.find((d) => d.key === FIRST) ?? DEFS[0]!
        bag = [first, ...bag.filter((d) => d !== first)]
      } else if (bag[0]!.key === lastKey) {
        bag.push(bag.shift()!)
      }
    }
    const def = bag.shift()!
    lastKey = def.key
    return def
  }

  const drumFill = () => {
    const p = pace()
    for (let i = 0; i < 4; i++) sfx.tone({ freq: 210 - i * 28, to: 90 - i * 8, dur: 0.11, type: 'sine', vol: 0.3, delay: (i * 0.065) / p })
    sfx.noise({ dur: 0.12, freq: 2200, vol: 0.2, filter: 'highpass', delay: 0.27 / p })
    // The shout: two bright notes as the word lands.
    sfx.tone({ freq: 660, dur: 0.09, type: 'square', vol: 0.1, delay: 0.3 / p })
    sfx.tone({ freq: 990, dur: 0.16, type: 'square', vol: 0.1, delay: 0.39 / p })
  }

  const finish = (a: Active, won: boolean) => {
    if (a.state !== 'play') return
    a.state = won ? 'won' : 'lost'
    a.since = 0
    if (won) {
      wins++
      if (wins > best) {
        best = wins
        newBest = true
      }
      streakPop.value = 1.7
      sfx.ding(Math.min(wins, 12))
      for (let i = 0; i < lives; i++) lifeHop[i]!.value = 0.6 - i * 0.04
      if (wins % 5 === 0) {
        sfx.fanfare()
        fx.confetti(W / 2, H * 0.55, 90)
        fx.text(W - 150, 150, `🔥 ${wins}!`, { size: 70, color: '#ffe14d', life: 1.2 })
        // Every fifth win brings a lost mascot back.
        if (lives < LIVES) {
          lifeFall[lives] = -1
          lifeHop[lives]!.value = 0.2
          fx.burst(56 + lives * 64, 54, { count: 16, color: ['#ffc93c', '#ffffff', '#ff7ac8'], speed: 380, life: 0.8, size: 13, shape: 'star' })
          fx.text(56 + lives * 64, 150, '+1', { size: 60, color: '#a6ff6b', life: 1.2 })
          lives++
        }
      } else {
        fx.confetti(W / 2, H * 0.6, 48)
      }
    } else {
      lives--
      lifeFall[lives] = 0
      sfx.slideDown()
      fx.shake(7, 0.25)
      fx.burst(56 + lives * 64, 54, { count: 10, color: ['#ffc93c', '#ff5d5d', '#ffffff'], speed: 300, life: 0.6, size: 9, shape: 'star' })
      for (let i = 0; i < lives; i++) lifeHop[i]!.value = 1.3
    }
  }

  const begin = (cut: boolean) => {
    const def = nextDef()
    const layer = layers[layerAt]!
    layerAt = 1 - layerAt
    const c = layer.getContext('2d')
    if (c) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      c.clearRect(0, 0, W, H)
      c.lineCap = 'round'
      c.lineJoin = 'round'
      c.globalAlpha = 1
      def.backdrop(c, stage.rand)
    }
    const p = pace()
    const a: Active = {
      def,
      micro: null as unknown as Micro,
      layer,
      age: 0,
      t: 0,
      state: 'play',
      since: 0,
      timers: [],
      intro: 0.75 / Math.sqrt(p),
      dur: Math.max(2.6, 4.8 - level * 0.45),
      beat: 0,
    }
    const env: Env = {
      stage,
      fx,
      sfx,
      level,
      pace: p,
      dur: a.dur,
      get t() {
        return a.t
      },
      get age() {
        return a.age
      },
      get state() {
        return a.state
      },
      get since() {
        return a.since
      },
      win: () => finish(a, true),
      lose: () => finish(a, false),
      after: (seconds, fn) => a.timers.push({ at: a.age + Math.max(0, seconds), fn }),
      finger: () => {
        for (const p2 of stage.pointers.values()) return p2
        return null
      },
    }
    a.micro = def.make(env)
    prev = cut ? null : cur
    cur = a
    slide = cut ? 1 : 0
    phase = 'play'
    phaseT = 0
    if (cut) fx.flash('#ffffff', 0.5, 0.18)
    else sfx.whoosh()
    drumFill()
  }

  const advance = () => {
    runPlayed++
    if (lives <= 0) {
      phase = 'pie'
      phaseT = 0
      phaseFlag = false
      sfx.whoosh()
      return
    }
    if (runPlayed % 4 === 0) {
      level++
      phase = 'faster'
      phaseT = 0
      fx.flash('#ffffff', 0.6, 0.2)
      // The jingle: a quick run up the scale, higher each level.
      const steps = [0, 2, 4, 5, 7, 9]
      steps.forEach((s, i) => sfx.tone({ freq: sfx.scale(s + Math.min(level, 5)), dur: 0.12, type: 'square', vol: 0.11, delay: i * 0.07 }))
      sfx.tone({ freq: sfx.scale(10 + Math.min(level, 5)), dur: 0.4, type: 'triangle', vol: 0.22, delay: 0.44 })
      fx.text(W / 2, 250, 'FASTER!', { size: 150, color: '#fff35c', life: 1.0, rise: 30 })
      return
    }
    begin(false)
  }

  const drawActive = (g: CanvasRenderingContext2D, a: Active) => {
    g.drawImage(a.layer, 0, 0, W, H)
    a.micro.draw(g)
    g.globalAlpha = 1
  }

  const drawIntro = (g: CanvasRenderingContext2D, a: Active) => {
    const k = clamp(a.age / a.intro, 0, 1)
    if (k < 1) {
      g.fillStyle = `rgba(20,10,40,${0.34 * (1 - k * k)})`
      g.fillRect(0, 0, W, H)
    }
    const popIn = ease.outBack(clamp(a.age / 0.22, 0, 1))
    const u = ease.inOutCubic(clamp((k - 0.68) / 0.32, 0, 1))
    const size = lerp(170 * popIn, 50, u)
    const y = lerp(370, 46, u)
    if (u < 1) sprite(g, a.def.icon, W / 2, lerp(210, 46, u), lerp(190 * popIn, 0, u), Math.sin(a.age * 14) * 0.12 * (1 - u))
    const wob = Math.sin(a.age * 22) * 0.04 * (1 - u)
    g.save()
    g.translate(W / 2, y)
    g.rotate(wob - 0.05 * (1 - u))
    label(g, a.def.word, 0, 0, Math.max(1, size), '#fff35c', '#3a1a5c')
    g.restore()
  }

  const drawStamp = (g: CanvasRenderingContext2D, a: Active) => {
    const won = a.state === 'won'
    const s = ease.outBack(clamp(a.since / 0.2, 0, 1))
    g.save()
    g.translate(W / 2, 150)
    g.rotate(won ? -0.07 : 0.06 + Math.sin(a.since * 30) * 0.02 * clamp(1 - a.since * 2, 0, 1))
    label(g, a.micro.resultWord?.() ?? (won ? a.def.winWord : a.def.loseWord), 0, 0, Math.max(1, 120 * s), won ? '#a6ff6b' : '#ff7a9a', '#2a1240')
    g.restore()
  }

  const drawHud = (g: CanvasRenderingContext2D) => {
    const time = stage.time
    rrect(g, 14, 14, 270, 80, 40, 'rgba(30,16,50,0.42)')
    for (let i = 0; i < LIVES; i++) {
      const x = 56 + i * 64
      const y = 54
      const fall = lifeFall[i]!
      if (fall < 0) {
        const [sx, sy] = volume(clamp(lifeHop[i]!.value, 0.5, 1.6))
        squash(g, x, y + 26, sx, sy, () => tock(g, x, y, 24, lives === 1 ? 'wow' : 'happy', time, Math.sin(time * 0.8 + i), i))
        continue
      }
      g.setLineDash([7, 7])
      circle(g, x, y, 22, 'rgba(0,0,0,0.18)', 'rgba(255,255,255,0.4)', 3)
      g.setLineDash([])
      if (fall < 0.9) {
        // Bonked off its perch: up a little, then down and away, spinning.
        const fy = y - 190 * fall + 900 * fall * fall
        g.save()
        g.translate(x + fall * 90, fy)
        g.rotate(fall * 9)
        tock(g, 0, 0, 26, 'dizzy', time)
        g.restore()
      }
    }
    for (let i = 0; i < Math.min(level, 7); i++) sprite(g, '⚡', 42 + i * 34, 118, 36)

    rrect(g, W - 214, 14, 200, best > 0 ? 100 : 80, 40, 'rgba(30,16,50,0.42)')
    const sp = clamp(streakPop.value, 0.6, 2)
    label(g, `🔥 ${wins}`, W - 114, 52, 46 * sp, '#ffffff')
    if (best > 0) label(g, `BEST ${best}`, W - 114, 94, 20, '#ffe14d', null)

    if (phase !== 'play') return
    const a = cur
    const left = clamp(1 - a.t / a.dur, 0, 1)
    const x0 = 92
    const x1 = W - 40
    const y = 782
    rrect(g, x0 - 8, y - 13, x1 - x0 + 16, 26, 13, 'rgba(30,16,50,0.5)')
    const xs = lerp(x0, x1, left)
    if (left > 0.01) {
      const hot = left < 0.3
      rrect(g, x0 - 4, y - 8, xs - x0 + 8, 16, 8, hot ? '#ff5d5d' : left < 0.6 ? '#ffc93c' : '#7be06a')
    }
    const shiver = a.state === 'play' && left < 0.3 ? Math.sin(time * 50) * 3 : 0
    sprite(g, a.state === 'lost' && left <= 0.01 ? '💥' : '💣', 50 + shiver, y - 4, 58)
    if (a.state === 'play' && left > 0.01) {
      star(g, xs, y, 17 + Math.sin(time * 40) * 4, '#fff35c', time * 9)
      star(g, xs, y, 9, '#ffffff', -time * 12)
    }
  }

  const drawFaster = (g: CanvasRenderingContext2D) => {
    const t = stage.time
    sunburst(g, W / 2, 520, t * 5, '#ff5fa2', '#ff86b9', 16)
    g.strokeStyle = 'rgba(255,255,255,0.7)'
    g.lineWidth = 10
    for (let i = 0; i < 12; i++) {
      const y = 140 + i * 52
      const x = W - ((t * 2200 + i * 397) % (W + 400))
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + 170, y)
      g.stroke()
    }
    const bob = Math.abs(Math.sin(t * 22)) * 26
    const x = W / 2 + Math.sin(t * 9) * 16
    const y = 540 - bob
    // Legs as a blur of feet.
    for (let i = 0; i < 3; i++) ellipse(g, x + Math.cos(t * 30 + i * 2.1) * 80, 700 + Math.sin(t * 30 + i * 2.1) * 18, 40, 20, 'rgba(201,84,31,0.6)')
    g.save()
    g.translate(x, y)
    g.rotate(0.16)
    tock(g, 0, 0, 140, 'wow', t, 1)
    g.restore()
    for (let i = 0; i < Math.min(level, 7); i++) sprite(g, '⚡', W / 2 + (i - (Math.min(level, 7) - 1) / 2) * 90, 752 + Math.sin(t * 12 + i) * 10, 80 * ease.outBack(clamp(phaseT * 4 - i * 0.3, 0, 1)))
  }

  const PIE_HIT = 0.55
  const drawPie = (g: CanvasRenderingContext2D) => {
    const t = stage.time
    sunburst(g, W / 2, 470, t, '#6a4bd6', '#7d60e6', 14)
    const hit = phaseT >= PIE_HIT
    const since = phaseT - PIE_HIT
    const x = W / 2 + (hit ? Math.sin(since * 16) * 30 * Math.exp(-since * 2.4) : 0)
    const y = 470
    const lean = hit ? -0.22 * Math.exp(-since * 2) * Math.cos(since * 9) : Math.sin(t * 5) * 0.03
    ellipse(g, x, y + 215, 190, 40, 'rgba(0,0,0,0.25)')
    g.save()
    g.translate(x, y + 190)
    g.rotate(lean)
    const [sx, sy] = volume(hit ? 1 - 0.25 * Math.exp(-since * 7) : 1)
    g.scale(sx, sy)
    tock(g, 0, -190, 190, hit ? 'dizzy' : 'wow', t, 1)
    if (hit) {
      // Cream: a blob over the dial, with drips that keep sliding.
      g.fillStyle = '#fffdf2'
      g.beginPath()
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU
        g.moveTo(Math.cos(a) * 95 + 60, -200 + Math.sin(a) * 85)
        g.arc(Math.cos(a) * 95, -200 + Math.sin(a) * 85, 60, 0, TAU)
      }
      g.moveTo(90, -200)
      g.arc(0, -200, 110, 0, TAU)
      g.fill()
      for (let i = 0; i < 5; i++) {
        const dx = -100 + i * 50
        const len = clamp(since * (70 + i * 23), 0, 150)
        rrect(g, dx - 14, -150, 28, 60 + len, 14, '#fffdf2')
      }
      face(g, 0, -205, 26, 'dizzy')
      sprite(g, '🥧', 0, -205 + clamp(since - 0.35, 0, 9) ** 2 * 900, 210, since * 1.2)
    }
    g.restore()
    if (!hit) {
      const k = ease.inQuad(phaseT / PIE_HIT)
      sprite(g, '🥧', lerp(W + 140, x + 40, k), lerp(180, y - 10, k) - Math.sin(k * Math.PI) * 120, lerp(150, 250, k), -k * 9)
    } else {
      const s = ease.outBack(clamp(since / 0.2, 0, 1))
      g.save()
      g.translate(W / 2, 140)
      g.rotate(-0.06)
      label(g, 'SPLAT!', 0, 0, Math.max(1, 130 * s), '#fffdf2', '#2a1240')
      g.restore()
      if (since > 0.55) {
        const s2 = ease.outBack(clamp((since - 0.55) / 0.2, 0, 1))
        label(g, newBest ? `NEW BEST  🔥 ${best}` : `BEST  🔥 ${best}`, W / 2, 735, Math.max(1, 58 * s2), '#ffe14d', '#2a1240')
      }
    }
  }

  begin(true)

  return {
    update(dt) {
      for (const s of lifeHop) {
        s.target = 1
        s.update(dt)
      }
      streakPop.target = 1
      streakPop.update(dt)
      for (let i = 0; i < LIVES; i++) if (lifeFall[i]! >= 0) lifeFall[i]! += dt
      if (slide < 1) slide = Math.min(1, slide + dt / 0.28)
      phaseT += dt

      if (phase === 'faster') {
        if (phaseT > 1.0) begin(true)
        return
      }
      if (phase === 'pie') {
        if (!phaseFlag && phaseT >= PIE_HIT) {
          phaseFlag = true
          sfx.splat()
          sfx.thud(1.6)
          fx.shake(20, 0.4)
          fx.hitstop(90)
          fx.flash('#ffffff', 0.55, 0.2)
          fx.burst(W / 2, 440, { count: 46, color: ['#fffdf2', '#fff1c9', '#ffe1a0'], speed: 900, life: 0.9, size: 22, gravity: 1400 })
          stage.after(0.6, () => {
            if (newBest) {
              sfx.fanfare()
              fx.confetti(W / 2, 700, 80)
            } else {
              sfx.win()
            }
          })
        }
        if (phaseT > PIE_HIT + 1.5) {
          // A fresh run at slow speed, straight away.
          lives = LIVES
          wins = 0
          level = 0
          runPlayed = 0
          newBest = false
          for (let i = 0; i < LIVES; i++) {
            lifeFall[i] = -1
            lifeHop[i]!.value = 0.3
          }
          begin(true)
        }
        return
      }

      const a = cur
      a.age += dt
      if (a.timers.length > 0) {
        const due = a.timers.filter((tm) => tm.at <= a.age)
        if (due.length > 0) {
          a.timers = a.timers.filter((tm) => tm.at > a.age)
          for (const tm of due) tm.fn()
        }
      }
      if (a.state === 'play') {
        // Hold the clock until the first touch, and after a long idle, so
        // nobody comes back to a run that played itself out.
        const waiting = !started || (a.t === 0 && stage.time - lastTouchAt > 12)
        if (a.age >= a.intro && !waiting) {
          a.t += dt
          const left = 1 - a.t / a.dur
          a.beat -= dt
          if (a.beat <= 0) {
            const hot = left < 0.3
            a.beat += (hot ? 0.2 : 0.4) / pace()
            sfx.tick()
            if (hot) sfx.tone({ freq: 500 + (0.3 - left) * 1600, dur: 0.05, type: 'square', vol: 0.06 })
            else sfx.tone({ freq: 98, to: 70, dur: 0.09, type: 'triangle', vol: 0.16 })
          }
          if (a.t >= a.dur) {
            a.micro.timeout?.()
            finish(a, false)
          }
        }
      } else {
        a.since += dt
        if (a.since >= 1.1 / Math.sqrt(pace())) {
          a.micro.update(dt)
          advance()
          return
        }
      }
      a.micro.update(dt)
    },
    draw(g) {
      if (phase === 'faster') drawFaster(g)
      else if (phase === 'pie') drawPie(g)
      else {
        const a = cur
        if (prev && slide < 1) {
          const e = ease.outCubic(slide)
          g.save()
          g.translate(-W * e, 0)
          drawActive(g, prev)
          g.restore()
          g.save()
          g.translate(W * (1 - e), 0)
          drawActive(g, a)
          g.restore()
        } else {
          drawActive(g, a)
        }
        if (a.state === 'play') {
          drawIntro(g, a)
          if (stage.time - lastTouchAt > 2.6 && a.age > a.intro + 0.4) {
            const [hx, hy] = a.micro.hint()
            hint(g, hx, hy, stage.time, 70)
          }
        } else {
          drawStamp(g, a)
        }
      }
      drawHud(g)
    },
    down(p: Pointer) {
      lastTouchAt = stage.time
      started = true
      fx.ring(p.x, p.y, '#ffffff', 46, 0.25)
      if (phase === 'play' && cur.state === 'play') {
        cur.micro.down?.(p)
        return
      }
      // Between games a touch still pays: a sparkle, a note, and the mascots hop.
      sfx.pop(rndInt(0, 5))
      fx.burst(p.x, p.y, { count: 7, color: ['#ffe14d', '#ffffff'], speed: 300, life: 0.45, size: 12, shape: 'star' })
      for (let i = 0; i < lives; i++) lifeHop[i]!.value = rnd(0.6, 0.8)
    },
    move(p: Pointer) {
      lastTouchAt = stage.time
      if (phase === 'play' && cur.state === 'play') cur.micro.move?.(p)
    },
    up(p: Pointer) {
      if (phase === 'play' && cur.state === 'play') cur.micro.up?.(p)
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'micro-mayhem',
    name: 'Micro Mayhem',
    emoji: '⏱️',
    ages: [6, 11],
    pitch: 'Ten silly four-second games in a row, one shouted word each: pop, catch, wake, dodge, swat, balance, feed, stop, scrub, pick.',
    howTo: 'Read the word, then tap or drag fast. It speeds up every four games; four misses and the clock gets a pie in the face.',
    basedOn: 'WarioWare microgames, Dumb Ways to Die',
    whyFun: 'Surprise and pace: you never know what is next, every ending is a joke, and the streak and the speed keep climbing.',
  },
  create,
}
