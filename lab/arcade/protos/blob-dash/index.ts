// Blob Dash: a square blob runs a neon course to a synthesized beat. Tap or
// hold to jump. The physics runs in beats (sim.ts), so one jump is one beat
// and the whole course speeds up with the tempo; the course is hand-authored
// in levels.ts. This file is the view: music, juice, camera and input.

import { blinkAt, face, hint, label, sprite, volume } from '../../kit/draw.ts'
import { clamp, damp, ease, spring, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { CEIL, LAYOUTS, SECTION_BEATS, SECTION_CELLS } from './levels.ts'
import type { Layout, Rect } from './levels.ts'
import { newAttempt, newBody, robotRun, step, STEP, STEPS_PER_BEAT } from './sim.ts'
import type { Ev, Input, Mark } from './sim.ts'

const CELL = 68
const GROUND_Y = 648
// Where the blob sits on screen, and the same in cells behind the camera.
const BLOB_SX = 236
const CAM_BACK = BLOB_SX / CELL
const SECTION_STEPS = SECTION_BEATS * STEPS_PER_BEAT
const COUNT = LAYOUTS.length
const START_BPM = 120
const MAX_BPM = 168
// Samples of the blob's height per beat, for the ghost of the best attempt.
const GHOST_RATE = 24

const LIME = '#a8ff4a'
const PINK = '#ff2e7e'
const OOPS = ['BWOMP!', 'SPLAT!', 'OOF!', 'BONK!', 'POP!', 'YIKES!']

// Bass roots for a four-chord loop (A minor, F, C, G), one chord a bar.
const ROOTS = [110, 87.31, 130.81, 98]
const THIRDS = [1.189, 1.26, 1.26, 1.26]
// A tune in eighth notes per chord, as pentatonic steps (-1 is a rest).
const LEAD = [
  [4, -1, 3, 4, -1, 5, 4, 3],
  [3, -1, 2, 3, -1, 4, 3, 2],
  [2, -1, 3, 5, -1, 4, 3, 2],
  [1, -1, 3, 1, -1, 3, 4, 3],
]

interface Baked {
  img: HTMLCanvasElement
  w: number
  h: number
}

// Draw once at 2x into an offscreen canvas: glows cost a blur, so they are
// paid for here and never per frame.
function bake(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): Baked {
  const img = document.createElement('canvas')
  img.width = w * 2
  img.height = h * 2
  const c = img.getContext('2d')
  if (c) {
    c.scale(2, 2)
    c.lineJoin = 'round'
    c.lineCap = 'round'
    draw(c)
  }
  return { img, w, h }
}

function hash(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

// The gaps in a section's floor, for drawing the glow in a pit.
function pitsOf(lay: Layout): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let i = 0; i + 1 < lay.floor.length; i++) out.push([lay.floor[i]!.x1, lay.floor[i + 1]!.x0])
  return out
}

interface FlyingEye {
  x: number
  y: number
  vx: number
  vy: number
  spin: number
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  // ---- sprites ---------------------------------------------------------
  const PAD = 26
  const spikeImg = bake(CELL + PAD * 2, CELL + PAD * 2, (c) => {
    const grad = c.createLinearGradient(0, PAD, 0, PAD + CELL)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.45, '#ff8ab6')
    grad.addColorStop(1, PINK)
    c.shadowColor = PINK
    c.shadowBlur = 18
    c.beginPath()
    c.moveTo(PAD + 5, PAD + CELL * 0.97)
    c.lineTo(PAD + CELL / 2, PAD + 4)
    c.lineTo(PAD + CELL - 5, PAD + CELL * 0.97)
    c.closePath()
    c.fillStyle = grad
    c.fill()
    c.shadowBlur = 0
    c.strokeStyle = '#ffffff'
    c.lineWidth = 3.5
    c.stroke()
  })
  const starImg = bake(72, 72, (c) => {
    c.translate(36, 36)
    c.shadowColor = '#ffc400'
    c.shadowBlur = 14
    c.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const r = i % 2 === 0 ? 19 : 9
      if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else c.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    c.closePath()
    c.fillStyle = '#ffe14d'
    c.fill()
    c.shadowBlur = 0
    c.strokeStyle = '#fff8cf'
    c.lineWidth = 2.5
    c.stroke()
  })
  const ringImg = bake(110, 110, (c) => {
    c.translate(55, 55)
    c.shadowColor = '#c46bff'
    c.shadowBlur = 18
    c.beginPath()
    c.arc(0, 0, 30, 0, TAU)
    c.strokeStyle = '#ffffff'
    c.lineWidth = 7
    c.stroke()
    c.beginPath()
    c.arc(0, 0, 13, 0, TAU)
    c.fillStyle = '#e9ccff'
    c.fill()
  })
  const padImg = bake(130, 70, (c) => {
    c.shadowColor = '#ffb300'
    c.shadowBlur = 16
    c.beginPath()
    c.ellipse(65, 58, 40, 20, 0, Math.PI, TAU)
    c.closePath()
    c.fillStyle = '#ffd83d'
    c.fill()
    c.shadowBlur = 0
    c.strokeStyle = '#fff6c2'
    c.lineWidth = 3
    c.stroke()
  })
  const PORTAL_H = CEIL * CELL
  const portalImg = (color: string) =>
    bake(170, PORTAL_H + 70, (c) => {
      c.translate(85, (PORTAL_H + 70) / 2)
      c.beginPath()
      c.ellipse(0, 0, 38, PORTAL_H / 2 - 8, 0, 0, TAU)
      c.fillStyle = color
      c.globalAlpha = 0.16
      c.fill()
      c.globalAlpha = 1
      c.shadowColor = color
      c.shadowBlur = 24
      c.strokeStyle = color
      c.lineWidth = 9
      c.stroke()
      c.shadowBlur = 0
      c.strokeStyle = 'rgba(255,255,255,0.85)'
      c.lineWidth = 2.5
      c.stroke()
    })
  const portalUp = portalImg('#4df3ff')
  const portalDown = portalImg('#ffa53d')
  const BODY = 62
  const blobImg = bake(124, 124, (c) => {
    c.translate(62, 62)
    const grad = c.createLinearGradient(0, -BODY / 2, 0, BODY / 2)
    grad.addColorStop(0, '#e2ff7a')
    grad.addColorStop(1, '#5fdc36')
    c.shadowColor = LIME
    c.shadowBlur = 22
    c.beginPath()
    c.roundRect(-BODY / 2, -BODY / 2, BODY, BODY, 13)
    c.fillStyle = grad
    c.fill()
    c.shadowBlur = 0
    c.strokeStyle = '#1d5c1b'
    c.lineWidth = 4
    c.stroke()
    c.beginPath()
    c.roundRect(-BODY / 2 + 7, -BODY / 2 + 6, BODY - 14, 9, 5)
    c.fillStyle = 'rgba(255,255,255,0.5)'
    c.fill()
  })

  // ---- course lookups --------------------------------------------------
  const marksFor: Mark[][] = LAYOUTS.map((lay) => robotRun(lay).marks)
  const pitsFor = LAYOUTS.map(pitsOf)
  const layoutAt = (section: number): Layout => LAYOUTS[((section % COUNT) + COUNT) % COUNT]!

  // ---- state -----------------------------------------------------------
  let bpm = START_BPM
  // Global beat clock. It never stops, so the kick never drops a beat.
  let mb = 0
  let mode: 'lobby' | 'run' | 'dead' = 'lobby'
  // Absolute section number; the course loops every COUNT sections.
  let section = 0
  // Global beat at which local beat 0 of this section fell.
  let runStart = 0
  // Sim steps taken in this section.
  let si = 0
  let lobbyDebt = 0
  let go = false
  let body = newBody(0)
  let attempt = newAttempt(null)
  const input: Input = { held: false, pressAge: 99, fresh: false }
  const ev: Ev[] = []
  const got = new Set<number>()
  let stars = 0
  let attempts = 1
  let deathBeat = 0
  let respawnAt = 0
  let deathX = 0
  let toLobby = false
  let lastTouchAt = -100
  let everTouched = false
  let combo = 0
  let starStreak = 0
  let lastStarAt = -10
  let starBump = 0
  let mood: 'happy' | 'wow' = 'happy'
  let moodUntil = 0

  // The robot: plays the authored jumps. A secret (hold the top-left corner)
  // for a grown-up who wants to see the later sections, and for screenshots.
  let auto = false
  let autoNext = 0
  let autoHoldUntil = -1
  let cornerAt = -1
  let cornerId = -1

  // View.
  let cam = -CAM_BACK
  let hue = LAYOUTS[0]!.hue
  let acc = LAYOUTS[0]!.accent
  let pulse = 0
  let angle = 0
  let angleTarget = 0
  let spin = 0
  let spinning = false
  let pop = 1
  let runDust = 0
  const stretch = spring(1, 260, 13)
  const trail: Array<{ x: number; y: number }> = []
  let trailDebt = 0
  const eyesOut: FlyingEye[] = []
  let eyesAge = 9
  // Ghost of the furthest attempt in this section, and where it ended.
  const ghostNow = new Float32Array(SECTION_BEATS * GHOST_RATE + 2)
  const ghostBest = new Float32Array(SECTION_BEATS * GHOST_RATE + 2)
  let ghostLen = 0
  let ghostBestLen = 0
  let mark: { x: number; y: number } | null = null
  let gateFlash = 0

  // Audio clock.
  let nextStep = 0
  let lastReal = 0
  let ff = false

  const X = (ax: number) => (ax - cam) * CELL
  const Y = (y: number) => GROUND_Y - y * CELL
  const loopOf = () => Math.floor(section / COUNT)
  const localBeat = () => (mode === 'run' ? mb - runStart : mode === 'lobby' ? 0 : deathX / 4)
  const blobY = () => Y(body.y)

  // ---- sound -----------------------------------------------------------
  const drum = (s: number, delay: number, layer: number) => {
    if (s % 4 === 0) {
      // A low thump plus a knock an octave up, so the kick survives a tablet speaker.
      sfx.tone({ freq: 190, to: 44, dur: 0.2, type: 'sine', vol: 0.55, delay })
      sfx.tone({ freq: 330, to: 110, dur: 0.05, type: 'triangle', vol: 0.2, delay })
      sfx.noise({ dur: 0.02, freq: 2400, vol: 0.1, filter: 'highpass', delay })
    }
    if (s % 4 === 2) sfx.noise({ dur: 0.05, freq: 8500, vol: 0.1, filter: 'highpass', delay })
    if (layer >= 3 && s % 2 === 1) sfx.noise({ dur: 0.03, freq: 9500, vol: 0.04, filter: 'highpass', delay })
    if (layer >= 1 && s % 8 === 4) {
      sfx.noise({ dur: 0.13, freq: 1700, q: 0.9, vol: 0.2, delay })
      sfx.tone({ freq: 210, to: 150, dur: 0.07, type: 'triangle', vol: 0.12, delay })
    }
  }
  // Layers arrive with the sections: drums and bass, then an arpeggio, then
  // busier hats, then a tune on top. Standing still or popped, only the drums.
  const music = (s: number, delay: number) => {
    const layer = loopOf() > 0 ? 9 : (section % COUNT) + 1
    drum(s, delay, mode === 'run' ? layer : 0)
    if (mode !== 'run') return
    const l16 = (((s - runStart * 4) % 64) + 64) % 64
    const chord = Math.floor(l16 / 16)
    const root = ROOTS[chord]!
    const sub = s % 4
    if (sub === 2) sfx.tone({ freq: root, dur: 0.13, type: 'sawtooth', vol: 0.13, delay })
    if (sub === 3) sfx.tone({ freq: root * 2, dur: 0.09, type: 'sawtooth', vol: 0.09, delay })
    if (layer >= 2) {
      const third = THIRDS[chord]!
      const mul = [2, 2 * third, 3, 4, 3, 2 * third, 3, 4][s % 8]!
      const up = layer >= 4 && s % 16 >= 8 ? 2 : 1
      sfx.tone({ freq: root * mul * 2 * up, dur: 0.09, type: 'square', vol: layer >= 4 ? 0.042 : 0.03, delay })
    }
    if (layer >= 5 && s % 2 === 0) {
      const note = LEAD[chord]![(l16 % 16) / 2]
      if (note !== undefined && note >= 0) sfx.tone({ freq: sfx.scale(note), dur: 0.17, type: 'triangle', vol: 0.075, delay })
    }
  }
  const jumpSound = (step: number) => {
    if (ff) return
    const f = sfx.scale(Math.min(step, 8) - 5)
    sfx.tone({ freq: f, to: f * 1.55, dur: 0.11, type: 'triangle', vol: 0.22 })
    sfx.tone({ freq: f * 2, to: f * 3, dur: 0.06, type: 'sine', vol: 0.06 })
  }
  // Stars ring up the scale within an arc, and start higher on a beat streak.
  const starSound = (step: number) => {
    if (ff) return
    const f = sfx.scale(step)
    sfx.tone({ freq: f, dur: 0.1, type: 'triangle', vol: 0.15 })
    sfx.tone({ freq: f * 2, dur: 0.16, type: 'sine', vol: 0.07, delay: 0.03 })
  }
  const bwomp = () => {
    if (ff) return
    sfx.tone({ freq: 280, to: 46, dur: 0.36, type: 'sawtooth', vol: 0.2 })
    sfx.tone({ freq: 140, to: 40, dur: 0.4, type: 'sine', vol: 0.3 })
    sfx.noise({ dur: 0.28, freq: 1600, to: 120, vol: 0.25, filter: 'lowpass' })
    sfx.pop(-3)
  }
  const stinger = (first: boolean) => {
    if (ff) return
    const base = section % 3
    for (let i = 0; i < 5; i++) sfx.tone({ freq: sfx.scale(base + i * 2), dur: i === 4 ? 0.4 : 0.12, type: 'triangle', vol: 0.2, delay: i * 0.055 })
    sfx.noise({ dur: 0.35, freq: 600, to: 6000, vol: 0.12, q: 0.7 })
    if (first) sfx.ding(7)
  }

  // ---- game flow -------------------------------------------------------
  const resetView = () => {
    angle = 0
    angleTarget = 0
    spin = 0
    spinning = false
    trail.length = 0
    stretch.value = 1
    stretch.vel = 0
    pop = 0
    stage.tween(0.22, (t) => (pop = t), ease.outBack)
  }

  const press = () => {
    input.pressAge = 0
    input.fresh = true
  }

  const syncAuto = () => {
    const lay = layoutAt(section)
    const beat = si * STEP
    autoNext = 0
    while (autoNext < lay.jumps.length && lay.jumps[autoNext]! < beat - 1e-6) autoNext++
  }

  const startRun = (atBeat: number, keepBody: boolean) => {
    mode = 'run'
    runStart = atBeat
    si = 0
    if (!keepBody) body = newBody(0)
    body.x = 0
    attempt = newAttempt(layoutAt(section))
    ghostLen = 0
    autoNext = 0
    autoHoldUntil = -1
    combo = 0
    if (!ff) sfx.noise({ dur: 0.3, freq: 5200, vol: 0.09, filter: 'highpass' })
  }

  const die = () => {
    const bx = BLOB_SX
    const by = blobY()
    mode = 'dead'
    deathBeat = mb
    respawnAt = Math.ceil(mb + 0.4)
    deathX = body.x
    toLobby = !auto && stage.pointers.size === 0 && stage.time - lastTouchAt > 6
    attempts++
    combo = 0
    mark = { x: section * SECTION_CELLS + body.x, y: body.y }
    if (ghostLen > ghostBestLen) {
      ghostBest.set(ghostNow)
      ghostBestLen = ghostLen
    }
    fx.burst(bx, by, { count: 22, color: [LIME, '#e2ff7a', '#5fdc36', '#ffffff'], speed: 620, life: 0.75, size: 17, shape: 'square', gravity: 1300, drag: 0.985 })
    fx.burst(bx, by, { count: 10, color: PINK, speed: 380, life: 0.4, size: 8, shape: 'spark', gravity: 0 })
    fx.ring(bx, by, PINK, 130, 0.35)
    fx.shake(11, 0.3)
    fx.flash(PINK, 0.16, 0.18)
    fx.text(bx + 70, by - 70, OOPS[Math.floor(Math.random() * OOPS.length)]!, { color: '#ffd0e2', size: 40, life: 0.7, rise: 60 })
    eyesOut.length = 0
    for (const side of [-1, 1]) eyesOut.push({ x: bx + side * 11, y: by - 8, vx: side * 190 + 120 + Math.random() * 120, vy: -520 - Math.random() * 200, spin: Math.random() * TAU })
    eyesAge = 0
    bwomp()
  }

  const respawn = () => {
    input.held = stage.pointers.size > 0
    if (toLobby) {
      mode = 'lobby'
      body = newBody(0)
      attempt = newAttempt(null)
      go = false
      lobbyDebt = 0
    } else {
      startRun(respawnAt, false)
    }
    resetView()
  }

  const checkpoint = () => {
    const first = attempts === 1
    const cleared = section % COUNT
    const bx = BLOB_SX
    const by = blobY()
    gateFlash = 1
    fx.flash('#ffffff', 0.26, 0.22)
    fx.confetti(bx + 40, by, 26)
    fx.ring(bx, by, '#ffffff', 220, 0.5)
    stinger(first)
    if (first) {
      stars += 3
      starBump = 1
      fx.text(W / 2, 300, 'FIRST TRY!  +3', { color: '#fff3a0', size: 62, life: 1.2 })
    } else {
      fx.text(W / 2, 300, `${attempts} TRIES!`, { color: '#ffffff', size: 56, life: 1.1 })
    }

    section++
    si -= SECTION_STEPS
    runStart += SECTION_BEATS
    body.x -= SECTION_CELLS
    attempt = newAttempt(layoutAt(section))
    attempts = 1
    ghostLen = 0
    ghostBestLen = 0
    mark = null
    autoNext = 0
    autoHoldUntil = -1

    if (cleared === COUNT - 1) {
      const loop = loopOf()
      bpm = Math.min(MAX_BPM, START_BPM + loop * 14)
      fx.confetti(W * 0.3, 420, 60)
      fx.confetti(W * 0.7, 420, 60)
      fx.shake(8, 0.4)
      fx.text(W / 2, 400, `LOOP ${loop + 1}  FASTER!`, { color: LIME, size: 84, life: 1.8, rise: 50 })
      if (!ff) sfx.fanfare()
    }
  }

  const events = () => {
    const bx = BLOB_SX
    const by = blobY()
    const lay = layoutAt(section)
    const footY = Y(body.y + 0.5 * body.grav)
    const dir = body.grav < 0 ? 1 : -1
    for (const e of ev) {
      if (e.type === 'jump') {
        const beat = mode === 'run' ? si * STEP : mb
        const onBeat = Math.abs(beat - Math.round(beat)) < 0.14
        combo = onBeat ? combo + 1 : 0
        jumpSound(combo)
        spin = TAU * dir
        spinning = true
        stretch.value = 1.32
        stretch.vel = 0
        fx.burst(bx - 8, footY, { count: 7, color: onBeat ? ['#ffffff', LIME] : '#ffffff', speed: 300, angle: Math.PI + dir * 0.5, spread: 1.4, life: 0.35, size: 9, shape: 'square', gravity: 500 * dir })
        if (onBeat && combo > 1) fx.ring(bx, footY, LIME, 46 + Math.min(combo, 6) * 7, 0.3)
      } else if (e.type === 'land') {
        spinning = false
        const base = body.grav > 0 ? Math.PI : 0
        angleTarget = base + Math.round((angle - base) / TAU) * TAU
        stretch.value = clamp(1 - e.speed * 0.045, 0.55, 0.95)
        stretch.vel = 0
        if (e.speed > 3) {
          fx.burst(bx, footY, { count: 6, color: '#ffffff', speed: 220, angle: -Math.PI / 2 * dir, spread: Math.PI, life: 0.28, size: 7, gravity: 400 * dir })
          if (!ff) sfx.tone({ freq: 120, to: 60, dur: 0.07, type: 'sine', vol: 0.16 })
        }
      } else if (e.type === 'pad') {
        spin = (TAU * 2 * dir) / 1.5
        spinning = true
        stretch.value = 1.5
        stretch.vel = 0
        mood = 'wow'
        moodUntil = stage.time + 0.9
        fx.burst(bx, footY, { count: 18, color: ['#ffd83d', '#fff6c2', '#ffffff'], speed: 620, angle: (-Math.PI / 2) * dir, spread: 1.1, life: 0.55, size: 10, shape: 'spark', gravity: 300 })
        fx.ring(bx, footY, '#ffd83d', 150, 0.4)
        fx.shake(5, 0.18)
        if (!ff) {
          sfx.boing(4)
          sfx.whoosh()
        }
      } else if (e.type === 'ring') {
        const ring = lay.rings[e.index]!
        const rx = X(section * SECTION_CELLS + ring.x)
        const ry = Y(ring.y)
        combo++
        spin = TAU * dir
        spinning = true
        stretch.value = 1.35
        stretch.vel = 0
        fx.ring(rx, ry, '#e9ccff', 140, 0.4)
        fx.burst(rx, ry, { count: 14, color: ['#c46bff', '#ffffff', '#e9ccff'], speed: 460, life: 0.5, size: 10, shape: 'star', gravity: 200 })
        if (!ff) {
          sfx.ding(Math.min(combo, 7))
          jumpSound(combo)
        }
      } else if (e.type === 'portal') {
        const to = lay.portals[e.index]!.to
        const color = to > 0 ? '#4df3ff' : '#ffa53d'
        spin = (Math.PI / 0.75) * (to > 0 ? -1 : 1)
        spinning = true
        mood = 'wow'
        moodUntil = stage.time + 0.8
        fx.flash(color, 0.2, 0.22)
        fx.ring(bx, by, color, 240, 0.5)
        fx.burst(bx, by, { count: 20, color: [color, '#ffffff'], speed: 520, life: 0.6, size: 9, shape: 'spark', gravity: to > 0 ? -700 : 700 })
        fx.shake(6, 0.2)
        if (!ff) {
          if (to > 0) sfx.slideUp()
          else sfx.slideDown()
          sfx.whoosh()
        }
      } else if (e.type === 'star') {
        const star = lay.stars[e.index]!
        got.add(section * 1000 + e.index)
        const sx = X(section * SECTION_CELLS + star.x)
        const sy = Y(star.y)
        starStreak = stage.time - lastStarAt < 0.4 ? starStreak + 1 : 0
        lastStarAt = stage.time
        starBump = 1
        if (star.big) {
          stars += 5
          fx.burst(sx, sy, { count: 24, color: ['#7df9ff', '#ffffff', '#b8a1ff'], speed: 520, life: 0.8, size: 12, shape: 'star', gravity: 300 })
          fx.ring(sx, sy, '#7df9ff', 160, 0.45)
          fx.text(sx, sy - 40, '+5', { color: '#9ffcff', size: 50 })
          if (!ff) {
            sfx.ding(6)
            sfx.coin(8)
          }
        } else {
          stars++
          fx.burst(sx, sy, { count: 6, color: ['#ffe14d', '#ffffff'], speed: 260, life: 0.4, size: 9, shape: 'star', gravity: 200 })
          starSound(Math.min(combo, 4) + Math.min(starStreak, 2))
        }
      }
    }
  }

  const stepOnce = (lay: Layout | null): boolean => {
    if (auto && lay) {
      const beat = si * STEP
      while (autoNext < lay.jumps.length && beat >= lay.jumps[autoNext]! - 1e-9) {
        press()
        autoHoldUntil = beat + 0.12
        autoNext++
      }
      input.held = beat < autoHoldUntil
    }
    ev.length = 0
    const base = section * 1000
    const alive = step(body, input, lay, attempt, (index) => got.has(base + index), ev, lay ? si * STEP : mb)
    input.pressAge += STEP
    if (lay) {
      si++
      body.x = si * STEP * 4
      const sample = Math.floor((si * GHOST_RATE) / STEPS_PER_BEAT)
      if (sample >= 0 && sample < ghostNow.length) {
        ghostNow[sample] = body.y
        ghostLen = sample + 1
      }
    }
    if (ev.length > 0) events()
    return alive
  }

  const game: Game = {
    update(dt) {
      const real = performance.now()
      ff = real - lastReal < 3
      lastReal = real

      const dBeat = (dt * bpm) / 60
      const prevMb = mb
      mb += dBeat
      const phase = mb - Math.floor(mb)
      pulse = Math.exp(-phase * 4.5)
      const crossedBeat = Math.floor(mb) > Math.floor(prevMb)

      // Music: schedule each sixteenth a little ahead, so frame timing never
      // smears the beat.
      const spb = 60 / bpm
      if (ff) nextStep = Math.ceil(mb * 4)
      while ((nextStep / 4 - mb) * spb < 0.07) {
        if (!ff) music(nextStep, Math.max(0, (nextStep / 4 - mb) * spb))
        nextStep++
      }

      // The secret robot toggle.
      if (cornerAt >= 0 && stage.pointers.has(cornerId) && stage.time - cornerAt > 1.2) {
        auto = !auto
        cornerAt = -1
        syncAuto()
        autoHoldUntil = -1
        if (!auto) input.held = false
        fx.text(150, 130, auto ? 'ROBOT ON' : 'ROBOT OFF', { color: '#9ffcff', size: 40 })
        if (!ff) sfx.zap()
      }
      if (auto || stage.pointers.size > 0) lastTouchAt = stage.time

      if (mode === 'dead' && mb >= respawnAt) respawn()

      if (mode === 'lobby') {
        if (auto) go = true
        lobbyDebt += dBeat
        while (lobbyDebt >= STEP) {
          lobbyDebt -= STEP
          stepOnce(null)
        }
        if (crossedBeat) {
          if (go) startRun(Math.floor(mb), true)
          else if (body.grounded) stretch.value = 0.82
        }
      }

      if (mode === 'run') {
        // `runStart` moves at a checkpoint, so the target is re-read each step.
        while (mode === 'run' && si < Math.floor((mb - runStart) * STEPS_PER_BEAT)) {
          if (!stepOnce(layoutAt(section))) die()
          else if (si >= SECTION_STEPS) checkpoint()
        }
      }

      // Camera: glued to the blob while it runs, a fast rewind while it is gone.
      const home = section * SECTION_CELLS - CAM_BACK
      if (mode === 'run') cam = home + (mb - runStart) * 4
      else if (mode === 'lobby') cam = damp(cam, home, 14, dt)
      else {
        const t = clamp((mb - deathBeat) / Math.max(0.01, respawnAt - deathBeat), 0, 1)
        cam = home + deathX * (1 - ease.inOutCubic(t))
      }

      // Blob pose.
      stretch.update(dt)
      if (spinning) angle += spin * dBeat
      else {
        const base = body.grav > 0 ? Math.PI : 0
        if (body.grounded) angleTarget = base + Math.round((angle - base) / TAU) * TAU
        angle = damp(angle, angleTarget, 26, dt)
      }
      if (stage.time > moodUntil) mood = 'happy'
      starBump = Math.max(0, starBump - dt * 4)
      gateFlash = Math.max(0, gateFlash - dt * 2)

      if (mode === 'run') {
        trailDebt += dBeat
        if (trailDebt > 1 / 28) {
          trailDebt = 0
          trail.push({ x: cam + CAM_BACK, y: body.y })
          if (trail.length > 18) trail.shift()
        }
        if (body.grounded) {
          runDust += dBeat
          if (runDust > 0.16) {
            runDust = 0
            const dir = body.grav < 0 ? 1 : -1
            fx.burst(BLOB_SX - 24, Y(body.y + 0.5 * body.grav), { count: 1, color: '#ffffff', speed: 200, angle: Math.PI + 0.5 * dir, spread: 0.7, life: 0.25, size: 6, shape: 'square', gravity: 300 * dir })
          }
        }
      } else if (trail.length > 0 && mode === 'dead') {
        trail.shift()
      }

      if (eyesAge < 2) {
        eyesAge += dt
        for (const eye of eyesOut) {
          eye.vy += 1700 * dt
          eye.x += eye.vx * dt
          eye.y += eye.vy * dt
          eye.spin += dt * 9
          if (eye.y > GROUND_Y - 12 && eye.vy > 0) {
            eye.y = GROUND_Y - 12
            eye.vy *= -0.55
            eye.vx *= 0.7
          }
        }
      }

      // Each loop borrows the colours of a section three further on.
      const theme = layoutAt(section + loopOf() * 3)
      const k = 1 - Math.exp(-3 * dt)
      hue += (((((theme.hue - hue) % 360) + 540) % 360) - 180) * k
      acc += (((((theme.accent - acc) % 360) + 540) % 360) - 180) * k
    },

    draw(g) {
      const p = pulse
      const hh = hue
      const ac = acc
      const time = stage.time
      const k = section % COUNT
      const lay = LAYOUTS[k]!

      // Backdrop: a night sky that breathes with the kick.
      const sky = g.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, `hsl(${hh},72%,${6 + 3 * p}%)`)
      sky.addColorStop(0.7, `hsl(${hh + 28},76%,${20 + 7 * p}%)`)
      sky.addColorStop(1, `hsl(${hh + 50},82%,${30 + 6 * p}%)`)
      g.fillStyle = sky
      g.fillRect(-40, -40, W + 80, H + 80)

      const orb = g.createRadialGradient(W * 0.72, 230, 10, W * 0.72, 230, 430 + 40 * p)
      orb.addColorStop(0, `hsla(${hh + 45},95%,70%,${0.34 + 0.12 * p})`)
      orb.addColorStop(1, `hsla(${hh + 45},95%,60%,0)`)
      g.fillStyle = orb
      g.fillRect(0, 0, W, H)

      // Far dots.
      const drift = cam * CELL
      g.fillStyle = '#ffffff'
      for (let i = 0; i < 34; i++) {
        const x = ((((hash(i) * 1400 - drift * 0.06) % 1400) + 1400) % 1400) - 100
        const y = 30 + hash(i + 50) * 500
        const s = 2 + hash(i + 90) * 3
        g.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(time * (1 + hash(i) * 2) + i))
        g.fillRect(x, y, s, s)
      }
      g.globalAlpha = 1

      // An equalizer skyline that jumps on the beat.
      const period = 62
      const shift = drift * 0.22
      const first = Math.floor(shift / period)
      for (let i = -1; i < 21; i++) {
        const index = first + i
        const bounce = 0.72 + 0.28 * p * (0.4 + 0.6 * hash(index * 3 + Math.floor(mb)))
        const h = (70 + hash(index) * 300) * bounce
        const x = index * period - shift
        g.fillStyle = `hsla(${hh + 18},75%,58%,0.13)`
        g.fillRect(x, GROUND_Y - h, 46, h)
        g.fillStyle = `hsla(${ac},100%,76%,${0.22 + 0.3 * p})`
        g.fillRect(x, GROUND_Y - h, 46, 4)
      }

      // Hollow squares drifting in the middle distance.
      g.lineWidth = 3
      for (let i = 0; i < 9; i++) {
        const x = ((((hash(i + 200) * 1700 - drift * 0.42) % 1700) + 1700) % 1700) - 200
        const y = 110 + hash(i + 230) * 380
        const s = (34 + hash(i + 260) * 70) * (1 + 0.1 * p)
        g.save()
        g.translate(x, y)
        g.rotate(time * (0.2 + hash(i + 290) * 0.5) * (i % 2 === 0 ? 1 : -1))
        g.strokeStyle = `hsla(${ac},100%,76%,0.22)`
        g.strokeRect(-s / 2, -s / 2, s, s)
        g.restore()
      }

      // ---- the course --------------------------------------------------
      const neon = `hsl(${ac},100%,72%)`
      const ground = g.createLinearGradient(0, GROUND_Y, 0, H)
      ground.addColorStop(0, `hsl(${hh + 12},72%,${24 + 5 * p}%)`)
      ground.addColorStop(1, `hsl(${hh},72%,7%)`)
      const roof = g.createLinearGradient(0, 0, 0, Y(CEIL))
      roof.addColorStop(0, `hsl(${hh},72%,7%)`)
      roof.addColorStop(1, `hsl(${hh + 12},72%,${24 + 5 * p}%)`)

      const slab = (x0: number, x1: number, edge0: boolean, edge1: boolean) => {
        if (x1 < -20 || x0 > W + 20) return
        g.fillStyle = ground
        g.fillRect(x0, GROUND_Y, x1 - x0, H - GROUND_Y + 40)
        g.strokeStyle = `hsla(${ac},100%,72%,0.13)`
        g.lineWidth = 2
        g.beginPath()
        const from = Math.ceil(Math.max(x0, -20) / CELL + cam)
        const to = Math.floor(Math.min(x1, W + 20) / CELL + cam)
        for (let c = from; c <= to; c++) {
          const x = X(c)
          g.moveTo(x, GROUND_Y + 6)
          g.lineTo(x, H + 40)
        }
        g.moveTo(x0, GROUND_Y + 58)
        g.lineTo(x1, GROUND_Y + 58)
        g.moveTo(x0, GROUND_Y + 122)
        g.lineTo(x1, GROUND_Y + 122)
        g.stroke()
        // A stud every beat: the blob crosses one exactly on each kick.
        g.fillStyle = `hsla(${ac},100%,80%,${0.3 + 0.5 * p})`
        for (let c = from; c <= to; c++) {
          if (c % 4 !== 0) continue
          const x = X(c)
          if (x < x0 + 8 || x > x1 - 8) continue
          const r = 9 + 5 * p
          g.beginPath()
          g.moveTo(x, GROUND_Y + 14 - r)
          g.lineTo(x + r, GROUND_Y + 14)
          g.lineTo(x, GROUND_Y + 14 + r)
          g.lineTo(x - r, GROUND_Y + 14)
          g.closePath()
          g.fill()
        }
        g.lineCap = 'butt'
        g.beginPath()
        if (edge0) g.moveTo(x0, H + 40)
        g.lineTo(x0, GROUND_Y)
        g.lineTo(x1, GROUND_Y)
        if (edge1) g.lineTo(x1, H + 40)
        g.strokeStyle = `hsla(${ac},100%,72%,${0.2 + 0.2 * p})`
        g.lineWidth = 13 + 8 * p
        g.stroke()
        g.strokeStyle = neon
        g.lineWidth = 4.5
        g.stroke()
        g.lineCap = 'round'
      }

      const blockRect = (r: Rect, off: number) => {
        const x0 = X(r.x0 + off)
        const x1 = X(r.x1 + off)
        if (x1 < -20 || x0 > W + 20) return
        const y0 = Y(r.y1)
        const hgt = (r.y1 - r.y0) * CELL
        g.fillStyle = `hsla(${hh + 8},70%,13%,0.94)`
        g.fillRect(x0, y0, x1 - x0, hgt)
        g.strokeStyle = `hsla(${ac},100%,72%,0.16)`
        g.lineWidth = 2
        g.beginPath()
        for (let c = Math.ceil(r.x0 + 0.01); c < r.x1 - 0.01; c++) {
          g.moveTo(X(c + off), y0)
          g.lineTo(X(c + off), y0 + hgt)
        }
        for (let c = Math.ceil(r.y0 + 0.01); c < r.y1 - 0.01; c++) {
          g.moveTo(x0, Y(c))
          g.lineTo(x1, Y(c))
        }
        g.stroke()
        g.strokeStyle = `hsla(${ac},100%,72%,${0.18 + 0.14 * p})`
        g.lineWidth = 11
        g.strokeRect(x0, y0, x1 - x0, hgt)
        g.strokeStyle = neon
        g.lineWidth = 4
        g.strokeRect(x0, y0, x1 - x0, hgt)
      }

      const spikeAt = (x: number, y: number, dir: number) => {
        if (dir > 0) g.drawImage(spikeImg.img, x - spikeImg.w / 2, y - PAD - CELL * 0.97, spikeImg.w, spikeImg.h)
        else {
          g.save()
          g.translate(x, y)
          g.scale(1, -1)
          g.drawImage(spikeImg.img, -spikeImg.w / 2, -PAD - CELL * 0.97, spikeImg.w, spikeImg.h)
          g.restore()
        }
      }

      const firstSection = Math.floor(cam / SECTION_CELLS)
      const lastSection = Math.floor((cam + W / CELL + 1) / SECTION_CELLS)
      for (let s = firstSection; s <= lastSection; s++) {
        const off = s * SECTION_CELLS
        if (s < 0) {
          slab(X(off), X(off + SECTION_CELLS), false, false)
          continue
        }
        const ly = layoutAt(s)
        const pits = pitsFor[s % COUNT]!

        // Pits glow from below, with teeth, so a gap reads as danger.
        for (const [a, b] of pits) {
          const x0 = X(a + off)
          const x1 = X(b + off)
          if (x1 < -20 || x0 > W + 20) continue
          const glow = g.createLinearGradient(0, GROUND_Y, 0, H)
          glow.addColorStop(0, 'rgba(10,0,20,0.55)')
          glow.addColorStop(0.55, `rgba(255,70,40,${0.35 + 0.15 * p})`)
          glow.addColorStop(1, `rgba(255,170,40,${0.75 + 0.2 * p})`)
          g.fillStyle = glow
          g.fillRect(x0, GROUND_Y, x1 - x0, H - GROUND_Y + 40)
          g.fillStyle = '#ffe08a'
          g.beginPath()
          const teeth = Math.max(2, Math.round((x1 - x0) / 34))
          const step = (x1 - x0) / teeth
          g.moveTo(x0, H + 10)
          for (let i = 0; i < teeth; i++) {
            g.lineTo(x0 + (i + 0.5) * step, H - 46 - 8 * p)
            g.lineTo(x0 + (i + 1) * step, H + 10)
          }
          g.closePath()
          g.fill()
        }

        for (const r of ly.floor) slab(X(r.x0 + off), X(r.x1 + off), r.x0 > 0.01, r.x1 < SECTION_CELLS - 0.01)

        for (const r of ly.ceiling) {
          const x0 = X(r.x0 + off)
          const x1 = X(r.x1 + off)
          if (x1 < -20 || x0 > W + 20) continue
          const yb = Y(CEIL)
          g.fillStyle = roof
          g.fillRect(x0, -40, x1 - x0, yb + 40)
          g.lineCap = 'butt'
          g.beginPath()
          g.moveTo(x0, -40)
          g.lineTo(x0, yb)
          g.lineTo(x1, yb)
          g.lineTo(x1, -40)
          g.strokeStyle = `hsla(${ac},100%,72%,${0.2 + 0.2 * p})`
          g.lineWidth = 13 + 8 * p
          g.stroke()
          g.strokeStyle = neon
          g.lineWidth = 4.5
          g.stroke()
          g.lineCap = 'round'
        }

        // The checkpoint gate at the start of every section.
        const gx = X(off)
        if (gx > -60 && gx < W + 60) {
          const passed = s <= section && !(s === section && mode === 'lobby')
          const lit = s === section ? gateFlash : 0
          const color = passed ? LIME : '#ffffff'
          g.globalAlpha = passed ? 0.3 + 0.6 * lit : 0.22 + 0.2 * p
          g.fillStyle = color
          g.fillRect(gx - 3 - 8 * lit, 170, 6 + 16 * lit, GROUND_Y - 170)
          g.globalAlpha = 1
          const gy = 150 + Math.sin(time * 3 + s) * 5
          g.save()
          g.translate(gx, gy)
          g.rotate(Math.PI / 4 + (passed ? 0 : time * 1.5))
          g.fillStyle = passed ? LIME : 'rgba(10,5,25,0.7)'
          g.fillRect(-15, -15, 30, 30)
          g.strokeStyle = color
          g.lineWidth = 5
          g.strokeRect(-15, -15, 30, 30)
          g.restore()
        }

        for (const r of ly.blocks) blockRect(r, off)

        for (const pad of ly.pads) {
          const x = X(pad.x + off)
          if (x < -80 || x > W + 80) continue
          const y = Y(pad.y)
          g.drawImage(padImg.img, x - padImg.w / 2, y - 58, padImg.w, padImg.h)
          // The updraft: chevrons rising as high as the pad reaches.
          for (let i = 0; i < 4; i++) {
            const t = (time * 1.3 + i / 4) % 1
            g.globalAlpha = (1 - t) * 0.9
            g.strokeStyle = '#ffe98a'
            g.lineWidth = 5
            g.beginPath()
            g.moveTo(x - 17, y - 26 - t * 170)
            g.lineTo(x, y - 41 - t * 170)
            g.lineTo(x + 17, y - 26 - t * 170)
            g.stroke()
          }
          g.globalAlpha = 1
        }

        for (const portal of ly.portals) {
          const x = X(portal.x + off)
          if (x < -100 || x > W + 100) continue
          const img = portal.to > 0 ? portalUp : portalDown
          g.drawImage(img.img, x - img.w / 2, Y(CEIL / 2) - img.h / 2, img.w, img.h)
          g.fillStyle = portal.to > 0 ? '#c9fbff' : '#ffe0b8'
          for (let i = 0; i < 4; i++) {
            const t = (time * 0.9 + i / 4) % 1
            const yy = portal.to > 0 ? Y(0.6 + t * (CEIL - 1.2)) : Y(CEIL - 0.6 - t * (CEIL - 1.2))
            const d = portal.to > 0 ? -1 : 1
            g.globalAlpha = Math.sin(t * Math.PI) * 0.95
            g.beginPath()
            g.moveTo(x, yy + d * 15)
            g.lineTo(x - 15, yy - d * 10)
            g.lineTo(x + 15, yy - d * 10)
            g.closePath()
            g.fill()
          }
          g.globalAlpha = 1
        }

        for (const spike of ly.spikes) {
          const x = X(spike.x + off)
          if (x < -70 || x > W + 70) continue
          spikeAt(x, Y(spike.y), spike.dir)
        }

        for (let i = 0; i < ly.rings.length; i++) {
          const ring = ly.rings[i]!
          const x = X(ring.x + off)
          if (x < -70 || x > W + 70) continue
          const used = s === section && attempt.ringsUsed[i] === true
          const scale = used ? 0.7 : 1 + 0.16 * p
          g.globalAlpha = used ? 0.3 : 1
          g.drawImage(ringImg.img, x - (ringImg.w * scale) / 2, Y(ring.y) - (ringImg.h * scale) / 2, ringImg.w * scale, ringImg.h * scale)
          g.globalAlpha = 1
        }

        for (let i = 0; i < ly.stars.length; i++) {
          const star = ly.stars[i]!
          const x = X(star.x + off)
          if (x < -50 || x > W + 50) continue
          if (got.has(s * 1000 + i)) continue
          const y = Y(star.y) + Math.sin(time * 4 + star.x) * 3
          if (star.big) sprite(g, '💎', x, y, 54 * (1 + 0.12 * p), Math.sin(time * 2) * 0.15)
          else {
            const scale = 0.82 + 0.16 * p
            g.drawImage(starImg.img, x - (starImg.w * scale) / 2, y - (starImg.h * scale) / 2, starImg.w * scale, starImg.h * scale)
          }
        }
      }

      // The best attempt so far in this section, as a dotted path, and a
      // cross where the last one ended.
      const base = section * SECTION_CELLS
      if (ghostBestLen > 1) {
        g.strokeStyle = 'rgba(255,255,255,0.3)'
        g.lineWidth = 4
        g.setLineDash([3, 13])
        g.beginPath()
        let pen = false
        for (let i = 0; i < ghostBestLen; i++) {
          const x = X(base + (i / GHOST_RATE) * 4)
          if (x < -20 || x > W + 20) continue
          const y = Y(ghostBest[i]!)
          if (pen) g.lineTo(x, y)
          else g.moveTo(x, y)
          pen = true
        }
        g.stroke()
        g.setLineDash([])
      }
      if (mark) {
        const x = X(mark.x)
        const y = Y(mark.y)
        if (x > -40 && x < W + 40) {
          g.strokeStyle = 'rgba(255,190,215,0.9)'
          g.lineWidth = 7
          g.beginPath()
          g.moveTo(x - 15, y - 15)
          g.lineTo(x + 15, y + 15)
          g.moveTo(x + 15, y - 15)
          g.lineTo(x - 15, y + 15)
          g.stroke()
        }
      }

      // Where to tap: shown after the first miss in the first section, and
      // after a few misses anywhere else.
      const help = mode === 'run' && ((section === 0 && attempts >= 2) || attempts >= 4)
      if (help) {
        const here = body.x
        let pointed = false
        for (const m of marksFor[k]!) {
          const x = X(base + m.x)
          if (x < -60 || x > W + 60) continue
          const footY = Y(m.y + 0.5 * m.grav)
          if (!m.air) {
            g.fillStyle = `rgba(255,255,255,${0.35 + 0.4 * p})`
            g.beginPath()
            g.ellipse(x, footY, 30 + 8 * p, 8, 0, 0, TAU)
            g.fill()
          }
          if (!pointed && m.x > here + 0.15) {
            pointed = true
            hint(g, x, m.air ? Y(m.y) : footY + 78 * m.grav, time, 46)
          }
        }
      }

      // ---- the blob ------------------------------------------------------
      if (trail.length > 1 && mode !== 'dead') {
        // A ribbon that widens towards the blob: one polygon, no beads.
        const n = trail.length
        const headY = blobY()
        const px = (i: number) => (i < n ? X(trail[i]!.x) : BLOB_SX)
        const py = (i: number) => (i < n ? Y(trail[i]!.y) : headY)
        const upper: number[] = []
        const lower: number[] = []
        for (let i = 0; i <= n; i++) {
          const a = Math.max(0, i - 1)
          const b = Math.min(n, i + 1)
          const dx = px(b) - px(a)
          const dy = py(b) - py(a)
          const len = Math.hypot(dx, dy) || 1
          const half = 2 + 25 * (i / n) ** 1.4
          upper.push(px(i) - (dy / len) * half, py(i) + (dx / len) * half)
          lower.push(px(i) + (dy / len) * half, py(i) - (dx / len) * half)
        }
        const tailX = px(0)
        const fade = g.createLinearGradient(tailX, 0, BLOB_SX, 0)
        if (loopOf() > 0) {
          for (let i = 0; i <= 5; i++) fade.addColorStop(i / 5, `hsla(${(time * 260 + i * 60) % 360},100%,65%,${(i / 5) * 0.75})`)
        } else {
          fade.addColorStop(0, 'rgba(168,255,74,0)')
          fade.addColorStop(1, 'rgba(190,255,110,0.7)')
        }
        g.fillStyle = fade
        g.beginPath()
        g.moveTo(upper[0]!, upper[1]!)
        for (let i = 2; i < upper.length; i += 2) g.lineTo(upper[i]!, upper[i + 1]!)
        for (let i = lower.length - 2; i >= 0; i -= 2) g.lineTo(lower[i]!, lower[i + 1]!)
        g.closePath()
        g.fill()
      }

      if (mode !== 'dead') {
        const air = body.grounded ? 1 + Math.sin(mb * TAU * 2) * (mode === 'run' ? 0.035 : 0) : 1 + clamp(Math.abs(body.vy) * 0.012, 0, 0.14)
        const [sx, sy] = volume(stretch.value * air)
        // Waiting at the gate, it bops to the beat (drawn only, not physics).
        const bop = mode === 'lobby' && !go && body.grounded ? Math.abs(Math.sin(mb * Math.PI)) * 16 : 0
        const cy = blobY() - bop + (1 - sy) * (CELL / 2) * -body.grav
        const finger = stage.pointers.values().next().value
        const lookX = finger ? clamp((finger.x - BLOB_SX) / 300, -1, 1) : 0.7
        const lookY = finger ? clamp((finger.y - cy) / 300, -1, 1) : clamp(-body.vy * 0.08 * -body.grav, -0.8, 0.8)
        const expression = !body.grounded && mood === 'happy' ? 'wow' : mood
        g.save()
        g.translate(BLOB_SX, cy)
        g.scale(sx * pop, sy * pop)
        g.rotate(angle)
        g.drawImage(blobImg.img, -blobImg.w / 2, -blobImg.h / 2, blobImg.w, blobImg.h)
        face(g, 5, -8, 9.5, expression, lookX, lookY, blinkAt(time, 2))
        if (loopOf() > 0) sprite(g, '👑', 0, -BODY / 2 - 14, 40)
        if (auto) sprite(g, '🤖', -BODY / 2 - 6, -BODY / 2 - 6, 26)
        g.restore()
      }

      if (eyesAge < 1.1) {
        g.globalAlpha = clamp((1.1 - eyesAge) * 4, 0, 1)
        for (const eye of eyesOut) {
          g.beginPath()
          g.arc(eye.x, eye.y, 12, 0, TAU)
          g.fillStyle = '#ffffff'
          g.fill()
          g.strokeStyle = '#1e1428'
          g.lineWidth = 2.5
          g.stroke()
          g.beginPath()
          g.arc(eye.x + Math.cos(eye.spin) * 5, eye.y + Math.sin(eye.spin) * 5, 5.5, 0, TAU)
          g.fillStyle = '#1e1428'
          g.fill()
        }
        g.globalAlpha = 1
      }

      // ---- the numbers ---------------------------------------------------
      const barX = 300
      const barW = 580
      const done = clamp((k + clamp(localBeat() / SECTION_BEATS, 0, 1)) / COUNT, 0, 1)
      g.fillStyle = 'rgba(10,5,25,0.55)'
      g.beginPath()
      g.roundRect(barX - 6, 28, barW + 12, 28, 14)
      g.fill()
      g.fillStyle = LIME
      g.beginPath()
      g.roundRect(barX, 34, Math.max(16, barW * done), 16, 8)
      g.fill()
      g.fillStyle = 'rgba(10,5,25,0.7)'
      for (let i = 1; i < COUNT; i++) g.fillRect(barX + (barW * i) / COUNT - 1.5, 34, 3, 16)
      label(g, `${Math.floor(done * 100)}%`, barX + barW + 22, 43, 28, '#ffffff', 'rgba(10,5,25,0.8)', 'left')

      const bump = 1 + starBump * 0.35
      g.drawImage(starImg.img, 1040 - (starImg.w * bump) / 2, 44 - (starImg.h * bump) / 2, starImg.w * bump, starImg.h * bump)
      label(g, `${stars}`, 1072, 45, 38, '#fff3a0', 'rgba(10,5,25,0.8)', 'left')

      label(g, lay.name, 34, 34, 24, `hsl(${ac},100%,80%)`, 'rgba(10,5,25,0.8)', 'left')
      if (attempts > 1) label(g, `TRY ${attempts}`, 34, 68, 34, '#ffffff', 'rgba(10,5,25,0.8)', 'left')
      if (loopOf() > 0) label(g, `⚡x${loopOf() + 1}`, 34, attempts > 1 ? 108 : 70, 30, LIME, 'rgba(10,5,25,0.8)', 'left')

      if (mode === 'lobby' && !go && (time > 1.2 || everTouched)) hint(g, W / 2 - 60, 400, time, 84)
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      if (!everTouched) {
        // The sound system wakes up inside this very touch, so the first jump
        // can be silent on some tablets: say hello a moment later as well.
        stage.after(0.14, () => {
          for (let i = 0; i < 3; i++) sfx.tone({ freq: sfx.scale(i * 2 - 3), dur: 0.12, type: 'triangle', vol: 0.18, delay: i * 0.06 })
        })
      }
      everTouched = true
      input.held = true
      press()
      fx.ring(p.x, p.y, '#ffffff', 46, 0.28)
      if (mode === 'lobby') go = true
      if (p.x < 90 && p.y < 90) {
        cornerAt = stage.time
        cornerId = p.id
      }
      // A tap that cannot jump right now still answers.
      if (mode === 'dead' || !body.grounded) {
        sfx.tick()
        fx.burst(p.x, p.y, { count: 4, color: '#ffffff', speed: 160, life: 0.25, size: 6, shape: 'spark', gravity: 0 })
      }
    },

    up() {
      if (!auto) input.held = stage.pointers.size > 0
    },
  }
  return game
}

export const proto: Proto = {
  meta: {
    key: 'blob-dash',
    name: 'Blob Dash',
    emoji: '⚡',
    ages: [7, 12],
    pitch: 'A square blob runs a neon spike course to the beat; tap to jump, pop, and try again instantly.',
    howTo: 'Tap or hold anywhere to jump, on the kick drum. Tap again inside a white ring. Do not jump under a hanging spike. Grown-ups: hold the top-left corner for a robot that shows the later sections.',
    basedOn: 'Geometry Dash (17.4M monthly players), Run 3',
    whyFun: 'A jump that lands exactly on the beat, an instant funny retry, and a new trick every eight seconds.',
  },
  create,
}
