// Surprise Eggs: three big eggs wobble in their nests. Tap one and it cracks a
// little more each time, then bursts, and whoever was inside pops out, shows
// off, and hops over the fence to join the meadow. Golden eggs rattle and glow
// and hold someone rare. Anticipation is the whole game.

import { blinkAt, circle, ellipse, eyes, face, hint, label, shadow, sprite, volume } from '../../kit/draw.ts'
import { TAU, clamp, damp, dist, ease, lerp, pick, rnd, shuffle, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { CREATURES, poseFor, speak } from './creatures.ts'
import type { Creature, Pose, Tier, Trick } from './creatures.ts'
import { GOLD, HH, PALETTES, PATTERNS, RAINBOW, RX, ZIG_HALF, clipHalf, drawCracks, drawLook, holePath, makeLook } from './egg.ts'
import type { EggLook } from './egg.ts'

const SLOT_X = [250, 590, 930] as const
const BASE_Y = 712
const ROWS = [
  { crest: 186, size: 76, color: '#aee588' },
  { crest: 286, size: 84, color: '#93d96c' },
  { crest: 386, size: 92, color: '#7bcb58' },
] as const
const PER_ROW = 10
const CONFETTI = ['#ff5d5d', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff', '#ff7ac8']

type Kind = 'common' | 'rare' | 'gag' | 'nested' | 'giant'
// What the first eggs after the opening three hold, so the first minute always
// has a rare, a gag, an egg in an egg and a giant egg in it.
const SCRIPT: readonly Kind[] = ['common', 'rare', 'common', 'gag', 'common', 'nested', 'rare', 'common', 'giant', 'gag', 'common', 'rare']

const hillY = (row: number, x: number) => ROWS[row]!.crest + Math.sin(x * 0.006 + row * 2.1) * 13 + Math.sin(x * 0.017 + row) * 5

interface Egg {
  slot: number
  x: number
  scale: number
  look: EggLook
  kind: Kind
  contents: Creature[]
  // Eggs still nested inside this one.
  nest: number
  cracks: number
  need: number
  rot: Spring
  sq: Spring
  phase: number
  delay: number
  // 0..1 drop into the nest.
  enter: number
  popping: boolean
  hop: number
  nextJig: number
  rattle: number
  nextRattle: number
  flash: number
  lastRub: number
}

interface Piece {
  look: EggLook
  top: boolean
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  life: number
  scale: number
  pivot: number
}

interface Spot {
  c: Creature
  x: number
  y: number
  size: number
  have: number
  sq: Spring
  // -1, or 0..1 through the trick.
  trick: number
  turn: number
  newT: number
  nextIdle: number
  idle: number
  seed: number
  sil: HTMLCanvasElement
  wob: Spring
}

interface Hatch {
  c: Creature
  spot: Spot
  rare: boolean
  delay: number
  t: number
  x0: number
  y0: number
  showX: number
  showY: number
  showSize: number
  pop: number
  hold: number
  hopDur: number
  x: number
  y: number
  size: number
  pose: Pose
  stretch: number
  spoke: boolean
}

const REST: Pose = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, alpha: 1 }

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  // The game's own clock: it runs slow for a moment when a rare egg bursts.
  let T = 0
  let slow = 0
  let lastTouch = 0
  let touchX = W / 2
  let touchY = H / 2
  let spawned = 0
  let sinceRare = 0
  let found = 0
  let complete = false
  let sunMood = 0
  const sunSpin = spring(0, 40, 4)
  const eggs: Egg[] = []
  const pieces: Piece[] = []
  const hatches: Hatch[] = []
  const pending = new Set<Creature>()

  // ---- things drawn once ----

  const makeCanvas = (w: number, h: number, res = 1): [HTMLCanvasElement, CanvasRenderingContext2D | null] => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(w * res)
    canvas.height = Math.ceil(h * res)
    const c = canvas.getContext('2d')
    if (c) c.scale(res, res)
    return [canvas, c]
  }

  const SIL = 120
  const makeSil = (char: string): HTMLCanvasElement => {
    const [canvas, c] = makeCanvas(SIL, SIL)
    if (c) {
      c.font = `92px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText(char, SIL / 2, SIL / 2 + 6)
      c.globalCompositeOperation = 'source-in'
      c.fillStyle = '#2f6b3c'
      c.fillRect(0, 0, SIL, SIL)
    }
    return canvas
  }

  const [glow, glowC] = makeCanvas(256, 256)
  if (glowC) {
    const grad = glowC.createRadialGradient(128, 128, 10, 128, 128, 128)
    grad.addColorStop(0, 'rgba(255,250,190,0.95)')
    grad.addColorStop(0.45, 'rgba(255,225,90,0.45)')
    grad.addColorStop(1, 'rgba(255,215,60,0)')
    glowC.fillStyle = grad
    glowC.fillRect(0, 0, 256, 256)
  }

  const [nestFront, nestC] = makeCanvas(300, 80, 2)
  if (nestC) {
    const c = nestC
    c.translate(150, 46)
    c.beginPath()
    c.ellipse(0, -30, 136, 52, 0, 0, Math.PI)
    c.ellipse(0, -30, 136, 13, 0, Math.PI, 0, true)
    c.closePath()
    c.save()
    c.clip()
    c.fillStyle = '#d29a36'
    c.fillRect(-150, -46, 300, 80)
    const straw = ['#f3cf6e', '#b27a24', '#e8b84f', '#fbe39a', '#c48a2c']
    c.lineCap = 'round'
    for (let i = 0; i < 120; i++) {
      const x = lerp(-140, 140, stage.rand())
      const y = lerp(-34, 24, stage.rand())
      const len = lerp(24, 60, stage.rand())
      const a = lerp(-0.45, 0.45, stage.rand()) + (x / 140) * -0.35
      c.strokeStyle = straw[Math.floor(stage.rand() * straw.length)]!
      c.lineWidth = lerp(2.5, 5, stage.rand())
      c.beginPath()
      c.moveTo(x - Math.cos(a) * len * 0.5, y - Math.sin(a) * len * 0.5)
      c.lineTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5)
      c.stroke()
    }
    c.restore()
    c.strokeStyle = '#94621a'
    c.lineWidth = 3
    c.stroke()
  }

  const [backdrop, bg] = makeCanvas(W, H)
  if (bg) {
    const c = bg
    const skyGrad = c.createLinearGradient(0, 0, 0, 300)
    skyGrad.addColorStop(0, '#58b9ff')
    skyGrad.addColorStop(1, '#d6f2ff')
    c.fillStyle = skyGrad
    c.fillRect(0, 0, W, H)
    ROWS.forEach((row, r) => {
      c.beginPath()
      c.moveTo(0, H)
      for (let x = 0; x <= W; x += 20) c.lineTo(x, hillY(r, x))
      c.lineTo(W, H)
      c.closePath()
      c.fillStyle = row.color
      c.fill()
      // A lighter lip along each crest so the rows read as separate hills.
      c.beginPath()
      for (let x = 0; x <= W; x += 20) {
        if (x === 0) c.moveTo(x, hillY(r, x) + 5)
        else c.lineTo(x, hillY(r, x) + 5)
      }
      c.strokeStyle = 'rgba(255,255,255,0.35)'
      c.lineWidth = 8
      c.stroke()
    })
    const petals = ['#ffffff', '#ffe14d', '#ff9ecb', '#ffb36b', '#c9a6ff']
    for (let i = 0; i < 70; i++) {
      const x = stage.rand() * W
      const y = lerp(205, 455, stage.rand())
      const color = petals[Math.floor(stage.rand() * petals.length)]!
      const r = lerp(3, 5.5, stage.rand())
      for (let k = 0; k < 5; k++) circle(c, x + Math.cos((k / 5) * TAU) * r, y + Math.sin((k / 5) * TAU) * r, r * 0.8, color)
      circle(c, x, y, r * 0.7, '#ffcf33')
    }
    // Picket fence between the meadow and the nests.
    c.fillStyle = '#f2e3c6'
    c.fillRect(0, 452, W, 9)
    c.fillRect(0, 474, W, 9)
    for (let x = 14; x < W; x += 40) {
      c.beginPath()
      c.moveTo(x - 11, 500)
      c.lineTo(x - 11, 448)
      c.lineTo(x, 436)
      c.lineTo(x + 11, 448)
      c.lineTo(x + 11, 500)
      c.closePath()
      c.fillStyle = '#fffaf0'
      c.fill()
      c.strokeStyle = '#d9c49b'
      c.lineWidth = 2.5
      c.stroke()
    }
    // The yard in front.
    c.beginPath()
    c.moveTo(0, H)
    for (let x = 0; x <= W; x += 20) c.lineTo(x, 492 + Math.sin(x * 0.008 + 1) * 8)
    c.lineTo(W, H)
    c.closePath()
    const yard = c.createLinearGradient(0, 480, 0, H)
    yard.addColorStop(0, '#74cc5f')
    yard.addColorStop(1, '#3f9c4a')
    c.fillStyle = yard
    c.fill()
    c.lineCap = 'round'
    for (let i = 0; i < 60; i++) {
      const x = stage.rand() * W
      const y = lerp(520, H - 10, stage.rand())
      c.strokeStyle = stage.rand() < 0.5 ? '#8fdc74' : '#358a40'
      c.lineWidth = 3
      for (const lean of [-6, 0, 6]) {
        c.beginPath()
        c.moveTo(x, y)
        c.lineTo(x + lean, y - 13)
        c.stroke()
      }
    }
    for (const x of SLOT_X) {
      ellipse(c, x, BASE_Y + 14, 156, 24, 'rgba(0,0,0,0.2)')
      ellipse(c, x, BASE_Y - 30, 136, 38, '#a8742c')
      ellipse(c, x, BASE_Y - 27, 118, 28, '#5a3814')
    }
  }

  // ---- the meadow ----

  const order = shuffle(CREATURES, () => stage.rand())
  const spots: Spot[] = order.map((c, i) => {
    const row = Math.floor(i / PER_ROW)
    const col = i % PER_ROW
    const x = 86 + col * 112 + lerp(-10, 10, stage.rand())
    return {
      c,
      x,
      y: hillY(row, x) + 46 + lerp(-5, 5, stage.rand()),
      size: ROWS[row]!.size,
      have: 0,
      sq: spring(1, 240, 9),
      trick: -1,
      turn: 1,
      newT: 0,
      nextIdle: rnd(1, 6),
      idle: -1,
      seed: stage.rand() * 10,
      sil: makeSil(c.e),
      wob: spring(0, 200, 8),
    }
  })
  const spotOf = (c: Creature) => spots.find((s) => s.c === c)!

  const pickCreature = (tier: Tier, want?: string): Creature => {
    const pool = CREATURES.filter((c) => c.tier === tier)
    const fresh = pool.filter((c) => spotOf(c).have === 0 && !pending.has(c))
    const named = want ? fresh.find((c) => c.e === want) : undefined
    const chosen = named ?? (fresh.length > 0 && (found < 8 || Math.random() > 0.15) ? pick(fresh) : pick(pool))
    pending.add(chosen)
    return chosen
  }

  // ---- eggs ----

  const spawnEgg = (slot: number, delay: number) => {
    const n = spawned++ - 3
    let kind: Kind = 'common'
    if (n >= 0 && n < SCRIPT.length) kind = SCRIPT[n]!
    else if (n >= SCRIPT.length) {
      const roll = Math.random()
      if (sinceRare >= 5 || roll < 0.18) kind = 'rare'
      else if (roll < 0.3) kind = 'gag'
      else if (roll < 0.36) kind = 'nested'
      else if (roll < 0.44) kind = 'giant'
    }
    if (kind === 'giant' && eggs.some((e) => e.kind === 'giant')) kind = 'common'
    sinceRare = kind === 'rare' ? 0 : sinceRare + 1
    let contents: Creature[]
    if (kind === 'rare') contents = [pickCreature('rare')]
    else if (kind === 'gag') contents = [pickCreature('gag', n === 3 ? '🧦' : n === 9 ? '🐓' : undefined)]
    else if (kind === 'giant') contents = [pickCreature('common'), pickCreature('common'), pickCreature('common')]
    else contents = [pickCreature('common', n === -3 ? '🐥' : undefined)]
    const look = kind === 'rare' ? makeLook(GOLD, 'stars') : kind === 'giant' ? makeLook(RAINBOW, 'rainbow') : makeLook(pick(PALETTES), pick(PATTERNS))
    eggs.push({
      slot,
      x: SLOT_X[slot]!,
      scale: kind === 'giant' ? 1.5 : rnd(0.96, 1.06),
      look,
      kind,
      contents,
      nest: kind === 'nested' ? 2 : 0,
      cracks: 0,
      need: kind === 'rare' ? 5 : kind === 'giant' ? 7 : n < 0 ? 3 : Math.random() < 0.4 ? 4 : 3,
      rot: spring(0, 130, 5),
      sq: spring(1, 260, 9),
      phase: rnd(0, TAU),
      delay,
      enter: 0,
      popping: false,
      hop: -1,
      nextJig: rnd(1, 3),
      rattle: 0,
      nextRattle: 1.2,
      flash: 0,
      lastRub: 0,
    })
  }
  for (let i = 0; i < 3; i++) {
    spawnEgg(i, 0)
    eggs[i]!.enter = 1
  }

  const eggMidY = (e: Egg) => BASE_Y - HH * e.scale * 0.5

  const chips = (e: Egg, x: number, y: number, count: number, speed: number) => {
    const p = e.look.palette
    fx.burst(x, y, { count, color: [p.base, p.a, p.b, '#ffffff'], speed, life: 0.7, size: 11, gravity: 1500, shape: 'square' })
  }

  const tapEgg = (e: Egg, px: number, py: number) => {
    if (e.popping) return
    e.cracks++
    const f = e.cracks / e.need
    const side = px < e.x ? 1 : -1
    e.rot.kick(side * (3 + f * 6))
    e.sq.value = 0.8
    e.flash = 0.5
    const cx = clamp(px, e.x - RX * e.scale, e.x + RX * e.scale)
    const cy = clamp(py, BASE_Y - HH * e.scale, BASE_Y - 40)
    chips(e, cx, cy, 5 + e.cracks * 2, 320 + f * 200)
    fx.ring(cx, cy, '#ffffff', 50 + f * 40, 0.25)
    fx.shake(2 + f * 6, 0.15)
    // A knock that gets higher, sharper and louder as the shell gives way.
    sfx.tone({ freq: 260 + e.cracks * 90, to: 140, dur: 0.09, type: 'triangle', vol: 0.22 + f * 0.25 })
    sfx.noise({ dur: 0.06 + f * 0.1, vol: 0.12 + f * 0.3, freq: 2200 + f * 2500, filter: 'highpass' })
    sfx.pop(e.cracks - 1 + (e.kind === 'rare' ? 3 : 0))
    if (e.kind === 'rare') {
      sfx.ding(e.cracks)
      fx.burst(cx, cy, { count: 8, color: ['#fff7b0', '#ffffff'], speed: 300, life: 0.6, size: 13, shape: 'star' })
    }
    if (e.cracks >= e.need) {
      // The beat before the pop: swell, flash white, freeze.
      e.popping = true
      e.flash = 1
      e.sq.value = 1.16
      fx.hitstop(e.kind === 'rare' || e.kind === 'giant' ? 150 : 75)
    } else if (e.cracks === e.need - 1) {
      // Someone is looking out.
      sfx.tone({ freq: 700, to: 1100, dur: 0.12, type: 'sine', vol: 0.12, delay: 0.1 })
    }
  }

  const startTrick = (s: Spot, quiet = false) => {
    if (s.have === 0 || s.trick >= 0) return
    s.trick = 0
    s.idle = -1
    if (!quiet) speak(sfx, s.c.voice)
  }

  const party = (big: boolean) => {
    const live = spots.filter((s) => s.have > 0)
    live.forEach((s, i) => stage.after(0.15 + i * 0.05, () => startTrick(s, true)))
    for (const x of [200, 590, 980]) fx.confetti(x, 120, big ? 70 : 35)
    fx.text(W / 2, 330, big ? 'ALL OF THEM!' : `${found} FRIENDS!`, { size: big ? 90 : 72, color: '#fff3b0', life: 1.8, rise: 60 })
    if (big) {
      sfx.fanfare()
      fx.flash('#ffffff', 0.5, 0.4)
    } else sfx.win()
  }

  const burst = (e: Egg) => {
    const midY = eggMidY(e)
    const dir = Math.random() < 0.5 ? 1 : -1
    const big = e.kind === 'rare' || e.kind === 'giant'
    pieces.push(
      { look: e.look, top: true, x: e.x, y: BASE_Y - HH * 0.75 * e.scale, vx: dir * rnd(140, 260), vy: -rnd(820, 980), rot: e.rot.value, vr: dir * rnd(5, 9), life: 1.3, scale: e.scale, pivot: -HH * 0.75 },
      { look: e.look, top: false, x: e.x, y: BASE_Y - HH * 0.25 * e.scale, vx: -dir * rnd(120, 200), vy: -rnd(380, 480), rot: e.rot.value, vr: -dir * rnd(3, 6), life: 0.9, scale: e.scale, pivot: -HH * 0.25 },
    )
    chips(e, e.x, midY, big ? 40 : 22, big ? 760 : 560)
    fx.burst(e.x, midY, { count: big ? 26 : 12, color: big ? CONFETTI : ['#ffffff', '#fff3b0'], speed: big ? 700 : 460, life: 0.8, size: 16, shape: 'star' })
    sfx.pop(6)
    sfx.noise({ dur: 0.18, vol: 0.4, freq: 1800, to: 5000, filter: 'highpass' })
    sfx.thud(big ? 1 : 0.6)
    // Everyone in the meadow jumps at the bang.
    for (const s of spots) if (s.have > 0 && s.trick < 0) s.sq.kick(rnd(3, 6))

    if (e.nest > 0) {
      // An egg inside the egg.
      e.nest--
      e.scale *= 0.66
      e.look = makeLook(pick(PALETTES), pick(PATTERNS))
      e.cracks = 0
      e.need = 2
      e.popping = false
      e.flash = 0
      e.sq.value = 0.2
      e.rot.kick(dir * 8)
      fx.shake(5, 0.2)
      fx.text(e.x, midY - 120, e.nest === 1 ? '?!' : '?!?!', { size: 64, color: '#ffffff' })
      sfx.boing(2 - e.nest)
      sfx.tone({ freq: 500, to: 900, dur: 0.18, type: 'square', vol: 0.1, delay: 0.1 })
      return
    }

    eggs.splice(eggs.indexOf(e), 1)
    const rare = e.kind === 'rare'
    e.contents.forEach((c, i) => {
      const fan = e.contents.length > 1 ? (i - 1) * 150 : 0
      const spot = spotOf(c)
      hatches.push({
        c,
        spot,
        rare,
        delay: i * 0.14,
        t: 0,
        x0: e.x,
        y0: BASE_Y - 30,
        showX: rare ? W / 2 : clamp(e.x + fan, 90, W - 90),
        showY: rare ? 540 : BASE_Y - 150 - (i === 1 ? 60 : 0),
        showSize: rare ? 270 : 150,
        pop: rare ? 0.22 : 0.34,
        hold: rare ? 0.22 + 0.2 + c.dur + 0.35 : 0.95,
        hopDur: rare ? 0.75 : 0.6,
        x: e.x,
        y: BASE_Y - 30,
        size: 10,
        pose: REST,
        stretch: 1,
        spoke: false,
      })
    })
    if (rare) {
      fx.flash('#ffffff', 0.85, 0.5)
      fx.shake(16, 0.45)
      fx.confetti(e.x, midY - 60, 70)
      CONFETTI.forEach((color, i) => stage.after(i * 0.07, () => fx.ring(e.x, midY, color, 260 + i * 50, 0.7)))
      fx.text(W / 2, 150, 'WOW!', { size: 100, color: '#fff3b0', life: 1.6, rise: 40 })
      sfx.fanfare()
      slow = 0.55
    } else if (e.kind === 'giant') {
      fx.flash('#ffffff', 0.6, 0.35)
      fx.shake(14, 0.4)
      fx.confetti(e.x, midY - 80, 80)
      sfx.win()
    } else {
      fx.shake(e.kind === 'gag' ? 7 : 5, 0.2)
    }
    // A rare one fills the middle of the field, so its nest waits for it to leave.
    spawnEgg(e.slot, rare ? e.contents[0]!.dur + 0.75 : 0.5)
  }

  const land = (h: Hatch) => {
    const s = h.spot
    pending.delete(h.c)
    const isNew = s.have === 0
    s.have++
    s.sq.value = 0.55
    s.size = ROWS[Math.floor(spots.indexOf(s) / PER_ROW)]!.size * Math.min(1.36, 1 + (s.have - 1) * 0.12)
    fx.burst(s.x, s.y, { count: 10, color: '#ffffff', speed: 240, angle: -Math.PI / 2, spread: Math.PI, life: 0.4, size: 9 })
    sfx.thud(0.4)
    if (isNew) {
      found++
      s.newT = 3.5
      fx.burst(s.x, s.y - s.size * 0.5, { count: 10, color: ['#ffe14d', '#ffffff'], speed: 300, life: 0.6, size: 12, shape: 'star' })
      sfx.coin(found % 10)
      if (found === spots.length) {
        complete = true
        stage.after(0.5, () => party(true))
      } else if (found % 5 === 0) stage.after(0.5, () => party(false))
    } else {
      fx.burst(s.x, s.y - s.size * 0.6, { count: 8, color: ['#ff6b8a', '#ffb3c6'], speed: 260, life: 0.8, size: 14, shape: 'heart', gravity: -120 })
      sfx.ding(3)
    }
    stage.after(0.3, () => startTrick(s, h.rare))
  }

  // Particles and one-off beats that belong to a trick, for whoever is doing it.
  const trickFx = (trick: Trick, p0: number, p1: number, x: number, feetY: number, size: number, facing: number) => {
    const cy = feetY - size * 0.5
    const crossed = (at: number) => p0 < at && p1 >= at
    const k = size / 80
    switch (trick) {
      case 'fire':
        if (p1 > 0.12 && p1 < 0.85) {
          fx.burst(x - facing * size * 0.42, cy - size * 0.08, { count: 3, color: ['#ff4d2e', '#ff9f1c', '#ffe14d'], speed: 620 * k, angle: facing > 0 ? Math.PI : 0, spread: 0.5, life: 0.45, size: 15 * k, gravity: -250, drag: 0.95 })
        }
        if (crossed(0.12)) fx.shake(6, 0.5)
        break
      case 'rainbow':
        fx.burst(x + rnd(-size, size) * 0.4, cy + size * 0.2, { count: 2, color: CONFETTI, speed: 200 * k, life: 0.8, size: 12 * k, shape: 'star', gravity: 300, angle: -Math.PI / 2, spread: 2.4 })
        break
      case 'robot':
        if (crossed(0.1) || crossed(0.45) || crossed(0.75)) {
          fx.burst(x, cy - size * 0.4, { count: 8, color: ['#ffe14d', '#7df9ff'], speed: 380 * k, life: 0.35, size: 12 * k, shape: 'spark' })
          fx.ring(x, cy, '#7df9ff', size * 0.9, 0.3)
        }
        if (crossed(0.45)) sfx.zap()
        break
      case 'stomp':
        if (crossed(0.7)) {
          fx.shake(10, 0.3)
          sfx.thud(1)
          fx.burst(x, feetY, { count: 16, color: ['#e9d7a7', '#ffffff'], speed: 420 * k, angle: -Math.PI / 2, spread: Math.PI, life: 0.5, size: 12 * k })
        }
        break
      case 'beam':
        if (crossed(0.05) || crossed(0.4)) fx.ring(x, cy, '#7dff9b', size * 1.3, 0.6)
        if (Math.random() < 0.4) fx.burst(x + rnd(-1, 1) * size * 0.3, feetY, { count: 1, color: '#b6ffc6', speed: 60, life: 0.5, size: 9 * k, gravity: -500 })
        break
      case 'boo':
        if (crossed(0.45)) {
          fx.text(x, cy - size * 0.9, 'BOO!', { size: 40 * k + 14, color: '#ffffff' })
          fx.ring(x, cy, '#ffffff', size * 1.4, 0.4)
          fx.shake(5, 0.2)
        }
        break
      case 'stink':
        if (Math.random() < 0.5) fx.burst(x + rnd(-1, 1) * size * 0.3, cy - size * 0.3, { count: 1, color: ['#a8d65c', '#d6e87a'], speed: 80, life: 0.9, size: 16 * k, gravity: -160, drag: 0.97 })
        break
      case 'sizzle':
        if (Math.random() < 0.5) fx.burst(x, cy, { count: 1, color: ['#ffffff', '#ffe9a8'], speed: 200 * k, life: 0.4, size: 8 * k })
        break
      case 'grow':
        if (crossed(0.35)) fx.burst(x, cy, { count: 7, color: ['#ff6b8a', '#ffb3c6'], speed: 260 * k, life: 0.7, size: 13 * k, shape: 'heart', gravity: -100 })
        break
      case 'grump':
        if (crossed(0.15)) fx.text(x + size * 0.4, cy - size * 0.6, '💢', { size: 34 * k + 10 })
        break
      case 'flop':
        if (crossed(0.5)) fx.burst(x, feetY, { count: 6, color: '#ffffff', speed: 200 * k, life: 0.4, size: 9 * k })
        break
      case 'flutter':
        if (Math.random() < 0.3) fx.burst(x, cy, { count: 1, color: ['#ffffff', '#ffe14d'], speed: 60, life: 0.5, size: 7 * k, shape: 'star' })
        break
      case 'hide':
        if (crossed(0.3)) fx.text(x + size * 0.4, cy - size * 0.5, '💤', { size: 26 * k + 8 })
        break
      default:
        if (crossed(0.02)) fx.burst(x, feetY, { count: 5, color: '#ffffff', speed: 160 * k, angle: -Math.PI / 2, spread: Math.PI, life: 0.3, size: 7 * k })
    }
  }

  const eggAt = (x: number, y: number, pad: number): Egg | undefined => {
    let best: Egg | undefined
    let bestD = Infinity
    for (const e of eggs) {
      if (e.delay > 0 || e.enter < 0.3) continue
      const nx = (x - e.x) / (RX * e.scale + pad)
      const ny = (y - eggMidY(e)) / (HH * e.scale * 0.5 + pad)
      const d = nx * nx + ny * ny
      if (d <= 1 && d < bestD) {
        best = e
        bestD = d
      }
    }
    return best
  }

  const spotAt = (x: number, y: number, reach: number): Spot | undefined => {
    let best: Spot | undefined
    let bestD = reach
    for (const s of spots) {
      const d = dist(x, y, s.x, s.y - s.size * 0.5)
      if (d < bestD) {
        best = s
        bestD = d
      }
    }
    return best
  }

  // ---- drawing ----

  const drawCreature = (g: CanvasRenderingContext2D, e: string, x: number, feetY: number, size: number, ps: Pose, flip: number, stretch: number) => {
    const [vx, vy] = volume(stretch)
    g.save()
    g.globalAlpha = ps.alpha
    g.translate(x + ps.dx, feetY + ps.dy)
    g.scale(vx * ps.sx * flip, vy * ps.sy)
    g.translate(0, -size * 0.5)
    if (ps.rot) g.rotate(ps.rot)
    sprite(g, e, 0, 0, size)
    g.restore()
  }

  const drawEgg = (g: CanvasRenderingContext2D, e: Egg) => {
    if (e.delay > 0) return
    const drop = e.enter < 1 ? (1 - ease.outBounce(e.enter)) * -760 : 0
    const hop = e.hop >= 0 ? Math.sin(e.hop * Math.PI) * 16 : 0
    const f = e.cracks / e.need
    const rattle = e.rattle > 0 ? Math.sin(T * 60) * 0.07 : 0
    const sway = Math.sin(T * 1.7 + e.phase) * 0.035
    const [vx, vy] = volume(e.sq.value * (1 + Math.sin(T * 2.3 + e.phase) * 0.015))
    const gold = e.kind === 'rare'
    g.save()
    g.translate(e.x + (e.rattle > 0 ? Math.sin(T * 47) * 3 : 0), BASE_Y + drop - hop)
    g.rotate(e.rot.value * 0.08 + sway + rattle)
    g.scale(e.scale * vx, e.scale * vy)
    if (gold) {
      const pulse = 1 + Math.sin(T * 5) * 0.08 + f * 0.5
      const gs = RX * 4.2 * pulse
      g.globalAlpha = 0.65 + f * 0.35
      g.drawImage(glow, -gs / 2, -HH * 0.5 - gs / 2, gs, gs)
      g.globalAlpha = 1
    }
    drawLook(g, e.look)
    // The first tap already shows a proper zigzag, not a tick mark.
    const reach = e.cracks === 0 ? 0 : Math.min(ZIG_HALF, 1 + Math.ceil(f * (ZIG_HALF - 1)))
    drawCracks(g, e.look, reach, gold ? 0.5 + Math.sin(T * 9) * 0.5 : 0)
    if (e.cracks > 0 && e.cracks >= e.need - 1 && e.nest === 0) {
      // Whoever is inside peeks out through the hole.
      const hy = -HH * 0.46
      holePath(g, hy, 60, 24)
      g.fillStyle = gold ? '#4a2a00' : '#2b1708'
      g.fill()
      g.lineJoin = 'round'
      g.strokeStyle = gold ? '#fffbe0' : 'rgba(255,255,255,0.8)'
      g.lineWidth = 3.5
      g.stroke()
      eyes(g, 0, hy + 1, 12, clamp((touchX - e.x) / 250, -1, 1), clamp((touchY - eggMidY(e)) / 250, -1, 1), blinkAt(T, e.phase))
    }
    if (e.flash > 0) {
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = e.flash * 0.8
      drawLook(g, e.look)
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
    }
    g.restore()
  }

  return {
    update(realDt) {
      slow = Math.max(0, slow - realDt)
      const dt = slow > 0 ? realDt * 0.3 : realDt
      T += dt
      sunSpin.update(realDt)
      sunMood = Math.max(0, sunMood - realDt)
      const recent = stage.time - lastTouch < 2.5

      for (const e of [...eggs]) {
        e.rot.update(dt)
        e.sq.update(dt)
        e.flash = Math.max(0, e.flash - dt * 4)
        if (e.delay > 0) {
          e.delay -= dt
          if (e.delay <= 0) sfx.whoosh()
          continue
        }
        if (e.enter < 1) {
          const before = e.enter
          e.enter = Math.min(1, e.enter + dt / 0.6)
          if (before < 0.364 && e.enter >= 0.364) {
            e.sq.value = 0.7
            e.rot.kick(rnd(-5, 5))
            sfx.thud(e.kind === 'giant' ? 1 : 0.5)
            if (e.kind === 'giant') fx.shake(8, 0.25)
            fx.burst(e.x, BASE_Y - 20, { count: 12, color: ['#f3cf6e', '#c48a2c', '#fbe39a'], speed: 380, angle: -Math.PI / 2, spread: 2.4, life: 0.6, size: 9, gravity: 1100, shape: 'spark' })
          }
        }
        if (e.popping) {
          burst(e)
          continue
        }
        e.nextJig -= dt
        if (e.nextJig <= 0) {
          e.rot.kick(rnd(-4, 4))
          e.hop = 0
          e.nextJig = rnd(1.6, 4)
        }
        if (e.hop >= 0) {
          e.hop += dt / 0.3
          if (e.hop >= 1) {
            e.hop = -1
            e.sq.value = 0.9
          }
        }
        if (e.kind === 'rare') {
          e.nextRattle -= dt
          if (e.nextRattle <= 0) {
            e.rattle = 0.5
            e.nextRattle = rnd(1.8, 2.6)
            for (let i = 0; i < 4; i++) stage.after(i * 0.09, () => sfx.tick())
          }
          e.rattle = Math.max(0, e.rattle - dt)
          if (Math.random() < dt * (e.rattle > 0 ? 30 : 7)) {
            fx.burst(e.x + rnd(-1, 1) * RX * 1.2, eggMidY(e) + rnd(-1, 1) * HH * 0.55, { count: 1, color: ['#fff7b0', '#ffffff'], speed: 50, life: 0.7, size: 13, shape: 'star', gravity: -70 })
          }
        }
      }

      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i]!
        p.vy += 2300 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        p.life -= dt
        if (p.life <= 0) pieces.splice(i, 1)
      }

      for (let i = hatches.length - 1; i >= 0; i--) {
        const h = hatches[i]!
        if (h.delay > 0) {
          h.delay -= dt
          continue
        }
        const t0 = h.t
        h.t += dt
        h.pose = REST
        h.stretch = 1
        if (h.t < h.pop) {
          const k = h.t / h.pop
          h.x = lerp(h.x0, h.showX, ease.outCubic(k))
          h.y = lerp(h.y0, h.showY, ease.outBack(k))
          h.size = lerp(h.showSize * 0.2, h.showSize, ease.outBack(k))
          h.stretch = 1 + (1 - k) * 0.35
        } else if (h.t < h.hold) {
          if (!h.spoke) {
            h.spoke = true
            if (!h.rare) speak(sfx, h.c.voice)
          }
          h.x = h.showX
          h.y = h.showY
          h.size = h.showSize
          const since = h.t - h.pop
          h.stretch = 1 + Math.exp(-since * 7) * Math.sin(since * 22) * 0.22
          if (h.rare) {
            // A rare one does its whole trick, huge, in the middle of the field.
            const start = h.pop + 0.2
            if (t0 < start && h.t >= start) speak(sfx, h.c.voice)
            const p0 = (t0 - start) / h.c.dur
            const p1 = (h.t - start) / h.c.dur
            if (p1 > 0 && p1 < 1) {
              // Toned down so a 270 pixel dinosaur stays on the field.
              const full = poseFor(h.c.trick, p1, h.size * 0.3)
              h.pose = { ...full, sx: 1 + (full.sx - 1) * 0.5, sy: 1 + (full.sy - 1) * 0.5 }
              trickFx(h.c.trick, p0, p1, h.x + h.pose.dx, h.y + h.pose.dy, h.size, 1)
            }
            if (Math.random() < dt * 22) fx.burst(h.x + rnd(-200, 200), h.y - h.size * 0.5 + rnd(-170, 170), { count: 1, color: CONFETTI, speed: 80, life: 0.8, size: 15, shape: 'star' })
          } else {
            h.pose = { ...REST, rot: Math.sin(since * 16) * 0.16 * Math.max(0, 1 - since * 1.4) }
          }
        } else {
          const p = Math.min(1, (h.t - h.hold) / h.hopDur)
          if (t0 < h.hold) {
            sfx.boing(Math.round(rnd(0, 3)))
            sfx.whoosh()
          }
          const s = h.spot
          h.x = lerp(h.showX, s.x, ease.inOutQuad(p))
          h.y = lerp(h.showY, s.y, ease.inQuad(p)) - Math.sin(p * Math.PI) * (h.rare ? 150 : 210)
          h.size = lerp(h.showSize, s.size, ease.inOutQuad(p))
          h.stretch = 1 + Math.sin(p * Math.PI) * 0.22
          h.pose = { ...REST, rot: Math.sin(p * Math.PI) * (s.x < h.showX ? 0.25 : -0.25) }
          if (p >= 1) {
            hatches.splice(i, 1)
            land(h)
          }
        }
      }

      for (const s of spots) {
        s.sq.update(dt)
        s.wob.update(dt)
        s.newT = Math.max(0, s.newT - dt)
        if (s.have === 0) continue
        if (recent) s.turn = damp(s.turn, touchX > s.x ? -1 : 1, 9, dt)
        if (s.trick >= 0) {
          const p0 = s.trick
          s.trick += dt / s.c.dur
          const ps = poseFor(s.c.trick, Math.min(1, s.trick), s.size)
          trickFx(s.c.trick, p0, s.trick, s.x + ps.dx, s.y + ps.dy, s.size, s.turn >= 0 ? 1 : -1)
          if (s.trick >= 1) {
            s.trick = -1
            s.sq.value = 0.78
          }
        } else if (s.idle >= 0) {
          s.idle += dt / 0.38
          if (s.idle >= 1) {
            s.idle = -1
            s.sq.value = 0.85
          }
        } else {
          s.nextIdle -= dt
          if (s.nextIdle <= 0) {
            s.idle = 0
            s.nextIdle = rnd(2.5, 8)
          }
        }
      }
    },

    draw(g) {
      g.drawImage(backdrop, 0, 0, W, H)

      // Sun with a face, and slow clouds.
      const sx = 1085
      const sy = 88
      g.save()
      g.translate(sx, sy)
      g.rotate(T * 0.15 + sunSpin.value)
      g.fillStyle = '#ffe680'
      for (let i = 0; i < 12; i++) {
        g.rotate(TAU / 12)
        g.beginPath()
        g.moveTo(-12, -58)
        g.lineTo(0, -86 - Math.sin(T * 3 + i) * 5)
        g.lineTo(12, -58)
        g.closePath()
        g.fill()
      }
      g.restore()
      circle(g, sx, sy, 56, '#ffd43b', '#f5b400', 4)
      face(g, sx, sy - 8, 10, sunMood > 0 ? 'wow' : 'happy', clamp((touchX - sx) / 500, -1, 1), clamp((touchY - sy) / 400, -1, 1), blinkAt(T, 4))
      for (let i = 0; i < 3; i++) {
        const cx = ((i * 430 + T * (9 + i * 3)) % (W + 300)) - 150
        const cy = 56 + i * 34
        g.fillStyle = 'rgba(255,255,255,0.92)'
        g.beginPath()
        g.ellipse(cx, cy, 64, 22, 0, 0, TAU)
        g.ellipse(cx - 30, cy - 14, 30, 22, 0, 0, TAU)
        g.ellipse(cx + 20, cy - 20, 36, 26, 0, 0, TAU)
        g.fill()
      }
      if (complete) {
        g.lineWidth = 12
        g.globalAlpha = 0.75
        CONFETTI.forEach((color, i) => {
          g.beginPath()
          g.arc(W / 2 - 140, 210, 190 - i * 12, Math.PI, TAU)
          g.strokeStyle = color
          g.stroke()
        })
        g.globalAlpha = 1
      }

      // The meadow: who has hatched, and outlines of who has not.
      for (const s of spots) {
        if (s.have === 0) {
          const k = (s.size / 92) * SIL * (1 + s.wob.value * 0.12)
          g.globalAlpha = 0.2
          g.save()
          g.translate(s.x, s.y - s.size * 0.5)
          g.rotate(s.wob.value * 0.25)
          g.drawImage(s.sil, -k / 2, -k / 2 - 4, k, k)
          g.restore()
          g.globalAlpha = 1
          continue
        }
        let ps = REST
        if (s.trick >= 0) ps = poseFor(s.c.trick, Math.min(1, s.trick), s.size)
        else if (s.idle >= 0) ps = { ...REST, dy: -Math.sin(s.idle * Math.PI) * s.size * 0.22 }
        const lift = clamp(-ps.dy / (s.size * 2.5), 0, 0.6)
        shadow(g, s.x + ps.dx, s.y + 2, s.size * 0.4, 1 - lift, 0.2 * ps.alpha)
        const breathe = 1 + Math.sin(T * 2.2 + s.seed) * 0.03
        const turn = Math.abs(s.turn) < 0.15 ? (s.turn < 0 ? -0.15 : 0.15) : s.turn
        drawCreature(g, s.c.e, s.x, s.y, s.size, ps, turn, s.sq.value * breathe)
        if (s.newT > 0) {
          const pop = ease.outBack(clamp((3.5 - s.newT) * 4, 0, 1)) * clamp(s.newT * 3, 0, 1)
          if (pop > 0.05) label(g, 'NEW!', s.x, s.y + ps.dy - s.size - 14 + Math.sin(T * 7 + s.seed) * 3, 26 * pop, '#ffe14d')
        }
      }

      // A rare reveal dims the field and throws rays behind the creature.
      for (const h of hatches) {
        if (!h.rare || h.delay > 0) continue
        const a = clamp(h.t / 0.12, 0, 1) * clamp((h.hold + 0.25 - h.t) / 0.35, 0, 1)
        if (a <= 0) continue
        g.fillStyle = `rgba(40,20,90,${0.42 * a})`
        g.fillRect(0, 0, W, H)
        const cy = h.y - h.size * 0.5
        g.save()
        g.translate(h.x, cy)
        g.rotate(T * 0.9)
        for (let i = 0; i < 12; i++) {
          g.rotate(TAU / 12)
          g.beginPath()
          g.moveTo(0, 0)
          g.lineTo(-70, -760)
          g.lineTo(70, -760)
          g.closePath()
          g.fillStyle = i % 2 === 0 ? `rgba(255,240,150,${0.5 * a})` : `rgba(255,255,255,${0.28 * a})`
          g.fill()
        }
        g.restore()
        g.globalAlpha = a
        const gs = 640 + Math.sin(T * 6) * 40
        g.drawImage(glow, h.x - gs / 2, cy - gs / 2, gs, gs)
        g.globalAlpha = 1
      }

      for (const e of eggs) drawEgg(g, e)
      for (const x of SLOT_X) g.drawImage(nestFront, x - 150, BASE_Y - 46, 300, 80)

      for (const p of pieces) {
        g.save()
        g.globalAlpha = clamp(p.life / 0.3, 0, 1)
        g.translate(p.x, p.y)
        g.rotate(p.rot)
        g.scale(p.scale, p.scale)
        g.translate(0, -p.pivot)
        clipHalf(g, p.look, p.top)
        drawLook(g, p.look)
        g.restore()
      }

      for (const h of hatches) {
        if (h.delay > 0) continue
        drawCreature(g, h.c.e, h.x, h.y, h.size, h.pose, 1, h.stretch)
      }

      sprite(g, '🐣', 52, 50, 46)
      label(g, `${found}/${spots.length}`, 84, 52, 36, '#ffffff', 'rgba(30,20,40,0.85)', 'left')

      if (stage.time - lastTouch > 5) {
        const target = eggs.find((e) => e.kind === 'rare' && e.enter >= 1) ?? eggs.find((e) => e.enter >= 1)
        if (target) hint(g, target.x, eggMidY(target), stage.time, 70)
      }
    },

    down(p: Pointer) {
      lastTouch = stage.time
      touchX = p.x
      touchY = p.y
      // Eggs first (generously), then the meadow, then anywhere low counts as
      // the nearest egg. Nothing on the field is a dead touch.
      let egg = eggAt(p.x, p.y, 34)
      const spot = egg ? undefined : spotAt(p.x, p.y, 66)
      if (!egg && !spot && p.y > 470) {
        let bestD = 230
        for (const e of eggs) {
          if (e.delay > 0 || e.enter < 0.3) continue
          const d = Math.abs(p.x - e.x)
          if (d < bestD) {
            egg = e
            bestD = d
          }
        }
      }
      if (egg) {
        tapEgg(egg, p.x, p.y)
        return
      }
      if (spot) {
        if (spot.have > 0) {
          if (spot.trick < 0) startTrick(spot)
          else {
            spot.sq.value = 0.7
            sfx.pop(Math.round(rnd(0, 4)))
          }
          fx.ring(spot.x, spot.y - spot.size * 0.5, '#ffffff', spot.size * 0.8, 0.3)
        } else {
          // Nobody here yet: the outline shivers and the eggs answer.
          spot.wob.kick(14)
          fx.text(spot.x, spot.y - spot.size, '?', { size: 40, color: '#ffffff' })
          fx.ring(spot.x, spot.y - spot.size * 0.5, '#ffffff', 46, 0.3)
          sfx.tone({ freq: 500, to: 760, dur: 0.14, type: 'sine', vol: 0.2 })
          for (const e of eggs) {
            e.rot.kick(rnd(-6, 6))
            if (e.hop < 0) e.hop = 0
          }
        }
        return
      }
      if (dist(p.x, p.y, 1085, 88) < 95) {
        sunSpin.kick(9)
        sunMood = 0.8
        sfx.ding(Math.round(rnd(2, 6)))
        fx.burst(1085, 88, { count: 14, color: ['#ffe680', '#ffffff'], speed: 420, life: 0.6, size: 13, shape: 'star' })
        return
      }
      fx.ring(p.x, p.y, '#ffffff', 56, 0.35)
      fx.burst(p.x, p.y, { count: 7, color: ['#ffffff', '#fff3b0', '#ffd6e8'], speed: 260, life: 0.6, size: 12, shape: 'star' })
      sfx.pop(Math.round(rnd(0, 5)))
    },

    move(p: Pointer) {
      if (!p.down) return
      touchX = p.x
      touchY = p.y
      lastTouch = stage.time
      // Stroke the meadow and everyone you pass does their trick; rub an egg
      // and it rocks.
      const spot = spotAt(p.x, p.y, 50)
      if (spot && spot.have > 0 && spot.trick < 0) startTrick(spot)
      const egg = eggAt(p.x, p.y, 10)
      if (egg && !egg.popping && stage.time - egg.lastRub > 0.14) {
        egg.lastRub = stage.time
        egg.rot.kick(clamp(p.dx, -1, 1) * 3 || 2)
        sfx.tick()
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'surprise-eggs',
    name: 'Surprise Eggs',
    emoji: '🥚',
    ages: [3, 7],
    pitch: 'Tap the wobbling eggs until they crack open and see who pops out, then watch the meadow fill with friends.',
    howTo: 'Tap an egg a few times to crack it. Golden eggs hold someone rare. Tap or stroke the hatched creatures for their tricks.',
    basedOn: 'surprise-egg videos, gacha capsules, Adopt Me hatching, Sago Mini reveals',
    whyFun: 'Tap to reveal a surprise: cracks, knocks and peeking eyes build anticipation, the pop pays it off every few seconds, and rares, gags and a growing collection keep the next egg worth opening.',
  },
  create,
}
