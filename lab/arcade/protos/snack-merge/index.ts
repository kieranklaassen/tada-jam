// Snack Merge: a Suika-style drop-and-merge in a glass jar. A claw on a rail
// holds a round snack with a face; drag to aim, lift to drop. Two of the same
// that touch pop into the next bigger snack, and chains climb a scale. A full
// jar burps its top snacks out instead of ending the game.

import { blinkAt, circle, ellipse, face, hint, label, line, rrect, sprite, star } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { TAU, clamp, damp, ease, lerp, rnd, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { ART_REACH, KINDS, kindOf, makeArt } from './art.ts'

// Jar interior.
const L = 330
const R = 850
const CX = (L + R) / 2
const FLOOR = 750
const RIM = 200
const CORNER = 92
const DROP_Y = 116
const RAIL_Y = 30

const G = 2300
const SUBSTEPS = 3
const ITERS = 4
const STIFF = 0.8
const STAR = -1
const TOP = KINDS.length - 1
const GROW_S = 0.22

// Chalkboard of the chain.
const BX = 884
const BY = 140
const BW = 272
const BH = 420

interface Snack {
  tier: number
  x: number
  y: number
  px: number
  py: number
  vx: number
  vy: number
  r: number
  r0: number
  rT: number
  // Seconds since it started growing into its size.
  growT: number
  m: number
  ang: number
  spin: number
  sq: Spring
  seed: number
  state: 'jar' | 'spill'
  // Dropped and not yet landed.
  fresh: boolean
  mergeLock: number
  mood: Mood
  moodUntil: number
  // Smoothed squeeze (overlap over radius) and the weight resting on top.
  press: number
  rawPress: number
  load: number
  touch: boolean
  overT: number
  bounced: boolean
  dead: boolean
  lastHitAt: number
}

function boardSlot(i: number): { x: number; y: number; r: number } {
  return { x: BX + 52 + (i % 3) * 84, y: BY + 108 + Math.floor(i / 3) * 112, r: 21 + i * 1.7 }
}

function makeBackdrop(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext('2d')
  if (!c) return canvas
  // Wallpaper.
  const wall = c.createLinearGradient(0, 0, 0, H)
  wall.addColorStop(0, '#ffe9c8')
  wall.addColorStop(1, '#ffc79c')
  c.fillStyle = wall
  c.fillRect(0, 0, W, H)
  c.fillStyle = 'rgba(255,255,255,0.22)'
  for (let x = 10; x < W; x += 64) c.fillRect(x, 0, 30, H)
  // A soft glow behind the jar so it is the centre of the picture.
  const glow = c.createRadialGradient(CX, 450, 60, CX, 450, 520)
  glow.addColorStop(0, 'rgba(255,246,225,0.55)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = glow
  c.fillRect(0, 0, W, H)

  // Window on the left.
  const wx = 52
  const wy = 388
  const ww = 236
  const wh = 250
  rrect(c, wx - 12, wy - 12, ww + 24, wh + 24, 18, '#ffffff', '#d9a878', 5)
  const skyGrad = c.createLinearGradient(0, wy, 0, wy + wh)
  skyGrad.addColorStop(0, '#7fd4ff')
  skyGrad.addColorStop(1, '#d8f6ff')
  c.save()
  c.beginPath()
  c.roundRect(wx, wy, ww, wh, 8)
  c.clip()
  c.fillStyle = skyGrad
  c.fillRect(wx, wy, ww, wh)
  circle(c, wx + 176, wy + 62, 30, '#ffe14d')
  ellipse(c, wx + 60, wy + 80, 44, 16, '#ffffff')
  ellipse(c, wx + 92, wy + 70, 30, 16, '#ffffff')
  ellipse(c, wx + 60, wy + wh + 30, 150, 90, '#7bd88f')
  ellipse(c, wx + 210, wy + wh + 40, 130, 90, '#5ec46f')
  c.restore()
  c.fillStyle = '#ffffff'
  c.fillRect(wx + ww / 2 - 5, wy, 10, wh)
  c.fillRect(wx, wy + wh / 2 - 5, ww, 10)
  rrect(c, wx - 26, wy + wh + 8, ww + 52, 16, 8, '#ffffff', '#d9a878', 4)

  // Bunting in the top corners.
  const flags = ['#ff5d6c', '#ffb02e', '#5ed36a', '#4db8ff', '#b07cff']
  for (const [x0, x1] of [
    [0, 300],
    [880, W],
  ] as const) {
    c.strokeStyle = '#c98a52'
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(x0, 4)
    c.quadraticCurveTo((x0 + x1) / 2, 44, x1, 4)
    c.stroke()
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6
      const x = lerp(x0, x1, t)
      const y = 4 + 40 * 2 * t * (1 - t) - 1
      c.beginPath()
      c.moveTo(x - 17, y)
      c.lineTo(x + 17, y)
      c.lineTo(x, y + 30)
      c.closePath()
      c.fillStyle = flags[i % flags.length]!
      c.fill()
    }
  }

  // The claw's rail.
  rrect(c, L - 40, RAIL_Y - 8, R - L + 80, 16, 8, '#b8c4d6', '#7f8da6', 3)
  c.fillStyle = 'rgba(255,255,255,0.6)'
  c.fillRect(L - 30, RAIL_Y - 5, R - L + 60, 4)
  for (const x of [L - 40, R + 40]) {
    rrect(c, x - 10, 0, 20, RAIL_Y + 14, 6, '#8b98b0', '#66728a', 3)
  }

  // Table.
  const table = c.createLinearGradient(0, 738, 0, H)
  table.addColorStop(0, '#e2a86a')
  table.addColorStop(0.2, '#cf9054')
  table.addColorStop(1, '#a96a38')
  c.fillStyle = table
  c.fillRect(0, 738, W, H - 738)
  c.fillStyle = '#f2c088'
  c.fillRect(0, 738, W, 7)
  c.strokeStyle = 'rgba(120,70,30,0.25)'
  c.lineWidth = 3
  for (let x = 90; x < W; x += 210) {
    c.beginPath()
    c.moveTo(x, 750)
    c.lineTo(x - 30, H)
    c.stroke()
  }
  ellipse(c, CX, 764, (R - L) / 2 + 40, 20, 'rgba(90,50,20,0.28)')
  ellipse(c, 168, 748, 70, 12, 'rgba(90,50,20,0.22)')
  sprite(c, '🫖', 168, 696, 104)
  ellipse(c, 1020, 748, 60, 12, 'rgba(90,50,20,0.22)')
  sprite(c, '🪴', 1020, 678, 136)

  // Chalkboard frame (the slots are drawn live).
  rrect(c, BX - 10, BY - 10, BW + 20, BH + 20, 22, '#c98a52', '#8a5a2a', 5)
  rrect(c, BX, BY, BW, BH, 14, '#2f5d50')
  c.fillStyle = 'rgba(255,255,255,0.05)'
  c.fillRect(BX + 10, BY + 10, BW - 20, 50)
  for (let i = 0; i < TOP; i++) {
    const a = boardSlot(i)
    const b = boardSlot(i + 1)
    if (a.y !== b.y) continue
    label(c, '›', (a.x + a.r + b.x - b.r) / 2, a.y - 3, 30, 'rgba(255,255,255,0.55)', null)
  }
  return canvas
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const art = makeArt()
  const backdrop = makeBackdrop()

  const snacks: Snack[] = []
  // What the board shows in colour, and which have had their fanfare.
  const seen: boolean[] = KINDS.map(() => false)
  const made: boolean[] = KINDS.map(() => false)
  const slotPop = KINDS.map(() => spring(1, 260, 9))
  let best = 0

  let heldTier = 0
  let heldGrow = 0
  let hasHeld = false
  let respawnAt = 0
  let wantDrop = false
  let nextTier = 0
  const nextPop = spring(1, 240, 10)
  const opening = [0, 0, 1, 0, 1, 2]
  let dealt = 0
  let nextStarAt = 11

  let aimId: number | null = null
  let targetX = CX
  let clawX = CX
  const swing = spring(0, 60, 5)
  const grip = spring(0, 200, 12)
  const clawSq = spring(1, 240, 10)

  let score = 0
  const scorePop = spring(1, 260, 9)
  let chain = 0
  let lastMergeAt = -10
  let lastTouchAt = 0
  let touched = false

  const jarSq = spring(1, 170, 9)
  let warn = 0
  let burpIn = 0
  let burpReadyAt = 0
  let nextFidgetAt = 2

  const addSnack = (tier: number, x: number, y: number): Snack => {
    const r = kindOf(tier).r
    const s: Snack = {
      tier,
      x,
      y,
      px: x,
      py: y,
      vx: 0,
      vy: 0,
      r,
      r0: r,
      rT: r,
      growT: 9,
      m: r * r,
      ang: 0,
      spin: 0,
      sq: spring(1, 210, 8),
      seed: Math.random() * 100,
      state: 'jar',
      fresh: true,
      mergeLock: 0,
      mood: 'happy',
      moodUntil: 0,
      press: 0,
      rawPress: 0,
      load: 0,
      touch: false,
      overT: 0,
      bounced: false,
      dead: false,
      lastHitAt: -1,
    }
    snacks.push(s)
    return s
  }

  const setMood = (s: Snack, mood: Mood, seconds: number) => {
    s.mood = mood
    s.moodUntil = stage.time + seconds
  }

  const see = (tier: number) => {
    if (tier < 0 || seen[tier]) return
    seen[tier] = true
    slotPop[tier]!.value = 0.2
  }

  const dealTier = (): number => {
    const n = dealt++
    if (n < opening.length) return opening[n]!
    if (n >= nextStarAt) {
      nextStarAt = n + 11 + Math.floor(stage.rand() * 5)
      return STAR
    }
    const weights = best >= 5 ? [26, 28, 23, 16, 7] : best >= 3 ? [32, 30, 24, 14] : [38, 32, 22, 8]
    let roll = stage.rand() * weights.reduce((a, b) => a + b, 0)
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i]!
      if (roll <= 0) return i
    }
    return 0
  }

  const giveHeld = () => {
    heldTier = nextTier
    heldGrow = 0
    hasHeld = true
    grip.target = 0
    see(heldTier)
    nextTier = dealTier()
    nextPop.value = 0.3
    if (nextTier === STAR && touched) {
      sfx.ding(6)
      fx.burst(170, 262, { count: 14, color: kindOf(STAR).burst, speed: 260, life: 0.6, shape: 'star', size: 12 })
    }
  }

  // A few snacks tumble in so the jar is never an empty page.
  // Laid out so the very first blueberry, dropped anywhere, finds a twin and
  // the cherry it makes finds a cherry: the first tap shows the whole idea.
  const starters: [number, number][] = [
    [0, 452],
    [1, 521],
    [0, 590],
    [1, 659],
    [0, 728],
  ]
  starters.forEach(([tier, x], i) => {
    const s = addSnack(tier, x, 600 - ((i * 2) % 5) * 40)
    s.vy = 200
    see(tier)
  })
  nextTier = dealTier()
  giveHeld()
  heldGrow = 1

  const heldR = () => kindOf(heldTier).r
  const aimX = (x: number) => clamp(x, L + heldR() + 3, R - heldR() - 3)

  // Where a snack dropped at x would first come to rest.
  const landingY = (x: number, r: number): number => {
    let y = FLOOR - r
    for (const s of snacks) {
      if (s.state !== 'jar' || s.fresh) continue
      const dx = Math.abs(s.x - x)
      const reach = s.r + r
      if (dx >= reach) continue
      y = Math.min(y, s.y - Math.sqrt(reach * reach - dx * dx))
    }
    return Math.max(y, DROP_Y + r)
  }

  const drop = () => {
    if (!hasHeld) return
    const x = aimX(aimId !== null ? targetX : clawX)
    clawX = x
    const s = addSnack(heldTier, x, DROP_Y)
    s.vy = 260
    s.vx = clamp(swing.vel * 40, -120, 120)
    s.sq.value = 1.18
    hasHeld = false
    wantDrop = false
    respawnAt = stage.time + 0.36
    grip.target = 1
    grip.kick(6)
    clawSq.value = 1.25
    sfx.whoosh()
    sfx.note(-3 + Math.max(0, heldTier), 0.07, 'triangle', 0.1)
  }

  const discover = (tier: number, x: number, y: number) => {
    made[tier] = true
    see(tier)
    const kind = kindOf(tier)
    stage.after(0.14, () => {
      fx.text(CX, clamp(y - kind.r - 70, 250, 560), `${kind.name}!`, { color: kind.color, size: tier >= 7 ? 82 : 66 + tier * 3, life: 1.7, rise: 90 })
      fx.confetti(x, y - 40, 36 + tier * 14)
      fx.flash('#ffffff', 0.22, 0.25)
      if (tier >= 4) {
        sfx.fanfare()
        fx.confetti(CX, RIM, 40 + tier * 10)
        fx.shake(10 + tier)
      } else {
        sfx.win()
      }
      const slot = boardSlot(tier)
      slotPop[tier]!.value = 1.9
      fx.ring(slot.x, slot.y, '#fff3b0', 70, 0.5)
      fx.burst(slot.x, slot.y, { count: 12, color: '#fff3b0', speed: 240, life: 0.6, shape: 'star', size: 11 })
    })
  }

  // The end of the chain: two kings cancel out in a party and it rains berries.
  const supernova = (x: number, y: number) => {
    score += 5000
    scorePop.value = 1.3
    fx.text(CX, 380, 'SNACKPOCALYPSE!', { color: '#ffd21f', size: 84, life: 2.2 })
    fx.confetti(x, y, 160)
    fx.confetti(CX, RIM, 120)
    fx.flash('#fff3b0', 0.6, 0.5)
    fx.shake(24, 0.7)
    fx.hitstop(90)
    sfx.fanfare()
    sfx.thud(1)
    for (let i = 0; i < 12; i++) {
      stage.after(0.3 + i * 0.12, () => {
        const s = addSnack(i % 3 === 0 ? 1 : 0, rnd(L + 60, R - 60), DROP_Y)
        s.vy = 300
        sfx.pop(i)
      })
    }
  }

  // `keep` becomes the next snack up; `gone` is eaten by the merge.
  const merge = (keep: Snack, gone: Snack) => {
    gone.dead = true
    const wild = gone.tier === STAR
    const x = wild ? keep.x : (keep.x + gone.x) / 2
    const y = wild ? keep.y : (keep.y + gone.y) / 2
    if (keep.tier >= TOP) {
      keep.dead = true
      supernova(x, y)
      return
    }
    const tier = keep.tier + 1
    const kind = kindOf(tier)
    keep.tier = tier
    keep.x = x
    keep.y = y
    keep.px = x
    keep.py = y
    keep.vx = (keep.vx + gone.vx) * 0.25
    keep.vy = Math.min(0, (keep.vy + gone.vy) * 0.25) - 60
    keep.r0 = keep.r
    keep.rT = kind.r
    keep.growT = 0
    keep.fresh = false
    keep.overT = 0
    keep.mergeLock = stage.time + 0.17
    keep.sq.value = 0.72
    keep.sq.kick(7)
    setMood(keep, 'yum', 0.8)

    chain = stage.time - lastMergeAt < 0.9 ? chain + 1 : 0
    lastMergeAt = stage.time
    const gain = (tier + 1) * 10 * (chain + 1)
    score += gain
    scorePop.value = 1.18 + Math.min(chain, 4) * 0.03
    best = Math.max(best, tier)

    // Neighbours get shoved and gasp.
    for (const s of snacks) {
      if (s === keep || s.dead || s.state !== 'jar') continue
      const dx = s.x - x
      const dy = s.y - y
      const d = Math.hypot(dx, dy) || 1
      const reach = kind.r + s.r + 46
      if (d > reach) continue
      const push = (1 - d / reach) * 340 + 60
      s.vx += (dx / d) * push * Math.min(1, kind.r / s.r)
      s.vy += (dy / d) * push * Math.min(1, kind.r / s.r) - 40
      s.sq.kick(rnd(-3, 3))
      if (stage.time > s.moodUntil) setMood(s, chain >= 1 ? 'wow' : 'happy', 0.45)
    }

    // Sound: a pop that climbs with the chain, a bell on top, weight for big ones.
    const step = chain * 2 + Math.floor(tier / 3)
    sfx.pop(step)
    sfx.ding(step)
    if (tier >= 4) sfx.thud(clamp(tier / 8, 0.4, 1))
    if (wild) sfx.zap()

    fx.burst(x, y, { count: 12 + tier * 3, color: wild ? kindOf(STAR).burst : kind.burst, speed: 300 + tier * 50, life: 0.6, size: 9 + tier * 1.5 })
    fx.burst(x, y, { count: 5 + Math.min(chain, 4) * 2, color: '#fff7c8', speed: 380 + tier * 40, life: 0.5, shape: 'star', size: 12 })
    fx.ring(x, y, '#ffffff', kind.r + 50, 0.35)
    fx.text(x, y - kind.r - 14, `+${gain}`, { color: '#fff3b0', size: 30 + Math.min(chain, 5) * 5 + tier * 1.5, life: 0.8 })
    if (chain >= 1) {
      const shout = chain >= 4 ? 'MEGA CHAIN' : chain >= 2 ? 'CHAIN' : 'COMBO'
      fx.text(CX, RIM + 60, `${shout} x${chain + 1}!`, { color: '#ffffff', size: 44 + Math.min(chain, 5) * 8, life: 0.9, rise: 50 })
      fx.shake(3 + Math.min(chain, 5) * 2.5)
      jarSq.kick(1.2 + Math.min(chain, 4) * 0.4)
    }
    if (tier >= 4) {
      fx.shake(3 + tier)
      fx.hitstop(30 + tier * 6)
      jarSq.kick(1.5)
    }
    if (!made[tier]) discover(tier, x, y)
    else see(tier)
  }

  const startBurp = () => {
    burpIn = 0.6
    jarSq.target = 0.93
    for (let i = 0; i < 4; i++) sfx.tone({ freq: 90 + i * 35, to: 130 + i * 40, dur: 0.12, type: 'sine', vol: 0.3, delay: i * 0.13 })
    for (const s of snacks) if (s.state === 'jar') setMood(s, 'wow', 0.7)
  }

  const burp = () => {
    jarSq.target = 1
    jarSq.kick(5)
    burpReadyAt = stage.time + 2.2
    warn = 0
    const pile = snacks.filter((s) => s.state === 'jar' && !s.fresh && !s.dead).sort((a, b) => a.y - a.r - (b.y - b.r))
    let out = 0
    for (const s of pile) {
      if (out >= 12) break
      if (out >= 5 && s.y - s.r > RIM + 150) break
      out++
      s.state = 'spill'
      const dir = Math.abs(s.x - CX) < 30 ? (out % 2 ? 1 : -1) : Math.sign(s.x - CX)
      s.vx = dir * rnd(330, 620)
      s.vy = -rnd(950, 1350)
      s.spin = dir * rnd(5, 11)
      setMood(s, 'dizzy', 9)
      s.sq.value = 1.35
    }
    for (const s of snacks) {
      s.overT = 0
      if (s.state === 'jar') {
        s.vy -= 120
        s.sq.kick(rnd(-4, 4))
      }
    }
    sfx.tone({ freq: 190, to: 62, dur: 0.55, type: 'sawtooth', vol: 0.32 })
    sfx.tone({ freq: 95, to: 45, dur: 0.6, type: 'square', vol: 0.14 })
    sfx.noise({ dur: 0.45, vol: 0.25, freq: 500, to: 120, filter: 'lowpass' })
    sfx.whoosh()
    fx.text(CX, RIM - 40, 'BUUURP!', { color: '#b8f07a', size: 80, life: 1.4, rise: 70 })
    fx.burst(CX, RIM, { count: 26, color: ['#b8f07a', '#e4ffb8', '#ffffff'], speed: 520, angle: -Math.PI / 2, spread: 1.5, life: 0.9, size: 22, gravity: -200, drag: 0.94 })
    fx.shake(14, 0.4)
    fx.flash('#d8ffb0', 0.25, 0.25)
  }

  const walls = (s: Snack) => {
    const r = s.r
    if (s.x < L + r) s.x = L + r
    else if (s.x > R - r) s.x = R - r
    if (s.y > FLOOR - r) s.y = FLOOR - r
    // Rounded bottom corners roll things toward the middle, where they meet.
    if (r < CORNER && s.y > FLOOR - CORNER) {
      const cx = s.x < L + CORNER ? L + CORNER : s.x > R - CORNER ? R - CORNER : 0
      if (cx !== 0) {
        const dx = s.x - cx
        const dy = s.y - (FLOOR - CORNER)
        const d = Math.hypot(dx, dy)
        const max = CORNER - r
        if (d > max && d > 0) {
          s.x = cx + (dx / d) * max
          s.y = FLOOR - CORNER + (dy / d) * max
        }
      }
    }
  }

  const landed = (s: Snack, hit: number) => {
    s.fresh = false
    const strength = clamp(hit / 1500, 0.25, 1) * clamp(s.r / 60, 0.5, 1.3)
    sfx.thud(clamp(strength, 0.2, 1))
    sfx.pop(-4 + Math.round(rnd(0, 2)))
    fx.burst(s.x, s.y + s.r * 0.8, { count: 6 + Math.round(s.r / 10), color: ['#ffffff', '#fff3d6'], speed: 180 + s.r * 2, angle: -Math.PI / 2, spread: Math.PI * 1.1, life: 0.35, size: 7 })
    jarSq.kick(-0.5 * strength)
    for (const o of snacks) {
      if (o === s || o.state !== 'jar') continue
      if (Math.hypot(o.x - s.x, o.y - s.y) < o.r + s.r + 12) {
        o.sq.kick(-3.5 * strength)
        if (stage.time > o.moodUntil) setMood(o, 'wow', 0.3)
      }
    }
  }

  const step = (h: number) => {
    for (const s of snacks) {
      s.touch = false
      s.rawPress = 0
      s.load = 0
      s.vy += G * h
      if (s.state === 'spill') {
        s.x += s.vx * h
        s.y += s.vy * h
        s.ang += s.spin * h
        // One bounce off the table, then off the bottom of the screen.
        if (!s.bounced && s.vy > 0 && s.y > 748 - s.r && (s.x < L - 20 || s.x > R + 20)) {
          s.bounced = true
          s.vy *= -0.5
          s.sq.value = 0.6
          sfx.boing(Math.round(rnd(-2, 3)))
          fx.burst(s.x, 748, { count: 8, color: '#ffffff', speed: 240, angle: -Math.PI / 2, spread: Math.PI, life: 0.35, size: 8 })
        }
        if (s.y > H + 220) s.dead = true
        continue
      }
      s.px = s.x
      s.py = s.y
      s.x += s.vx * h
      s.y += s.vy * h
    }
    const n = snacks.length
    for (let it = 0; it < ITERS; it++) {
      for (let i = 0; i < n; i++) {
        const a = snacks[i]!
        if (a.state !== 'jar') continue
        for (let j = i + 1; j < n; j++) {
          const b = snacks[j]!
          if (b.state !== 'jar') continue
          const dx = b.x - a.x
          const dy = b.y - a.y
          const min = a.r + b.r
          const d2 = dx * dx + dy * dy
          if (d2 >= min * min) continue
          const d = Math.sqrt(d2) || 0.01
          const over = (min - d) * STIFF
          const nx = dx / d
          const ny = d2 === 0 ? -1 : dy / d
          const wa = b.m / (a.m + b.m)
          a.x -= nx * over * wa
          a.y -= ny * over * wa
          b.x += nx * over * (1 - wa)
          b.y += ny * over * (1 - wa)
          a.touch = true
          b.touch = true
          if (it === 0) {
            a.rawPress += over / a.r
            b.rawPress += over / b.r
            if (b.y < a.y - a.r * 0.3) a.load += b.m / a.m
            else if (a.y < b.y - b.r * 0.3) b.load += a.m / b.m
          }
        }
      }
      for (const s of snacks) if (s.state === 'jar') walls(s)
    }
    for (const s of snacks) {
      if (s.state !== 'jar') continue
      const wasVx = s.vx
      const wasVy = s.vy
      s.vx = (s.x - s.px) / h
      s.vy = (s.y - s.py) / h
      const onFloor = s.y >= FLOOR - s.r - 0.5
      const hit = Math.hypot(wasVx - s.vx, wasVy - s.vy)
      if (hit > 320 && stage.time - s.lastHitAt > 0.12) {
        s.lastHitAt = stage.time
        s.sq.value = Math.min(s.sq.value, 1 - clamp(hit / 3200, 0.06, 0.32))
        if (s.fresh) landed(s, hit)
      } else if (s.fresh && (s.touch || onFloor)) {
        landed(s, hit)
      }
      // A little bounce off the glass floor; snack on snack is a soft thump.
      if (onFloor && wasVy > 420 && !s.touch) s.vy = -wasVy * 0.2
      if (s.touch || onFloor) {
        s.vx *= 0.965
        s.vy *= 0.99
        // Roll with the slide.
        s.ang += (s.vx / s.r) * h * 0.9
      }
      const speed = Math.hypot(s.vx, s.vy)
      const cap = s.fresh ? 1900 : 1000
      if (speed > cap) {
        s.vx *= cap / speed
        s.vy *= cap / speed
      } else if (speed < 7 && (s.touch || onFloor)) {
        s.vx = 0
        s.vy = 0
      }
    }
  }

  const merges = () => {
    const n = snacks.length
    for (let i = 0; i < n; i++) {
      const a = snacks[i]!
      if (a.dead || a.state !== 'jar' || stage.time < a.mergeLock) continue
      for (let j = i + 1; j < n; j++) {
        const b = snacks[j]!
        if (b.dead || b.state !== 'jar' || stage.time < b.mergeLock) continue
        const aWild = a.tier === STAR
        const bWild = b.tier === STAR
        if (aWild && bWild) continue
        if (!aWild && !bWild && a.tier !== b.tier) continue
        const reach = a.r + b.r + 3
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d2 = dx * dx + dy * dy
        if (d2 > reach * reach) {
          // Fudged in the child's favour: near-miss twins lean toward each other.
          const pull = reach + 34
          if (d2 < pull * pull && !a.fresh && !b.fresh) {
            const d = Math.sqrt(d2)
            a.vx += (dx / d) * 16
            b.vx -= (dx / d) * 16
          }
          continue
        }
        if (aWild) {
          if (b.tier >= TOP) continue
          merge(b, a)
        } else if (bWild) {
          if (a.tier >= TOP) continue
          merge(a, b)
        } else if (a.y > b.y) merge(a, b)
        else merge(b, a)
        break
      }
    }
  }

  const drawSnack = (g: CanvasRenderingContext2D, tier: number, x: number, y: number, r: number, ang: number, sx: number, sy: number, mood: Mood, lookX: number, lookY: number, blink: number) => {
    const kind = kindOf(tier)
    g.save()
    g.translate(x, y)
    g.scale(sx, sy)
    if (ang) g.rotate(ang)
    const size = r * ART_REACH * 2
    g.drawImage(art.canvas(tier), -size / 2, -size / 2, size, size)
    // Look where the pupils should point in the world, not in the snack's spin.
    const cos = Math.cos(-ang)
    const sin = Math.sin(-ang)
    face(g, 0, kind.faceY * r, kind.eye * r, mood, lookX * cos - lookY * sin, lookX * sin + lookY * cos, blink)
    g.restore()
  }

  const jarPath = (g: CanvasRenderingContext2D, pad: number) => {
    g.beginPath()
    g.moveTo(L - pad - 10, RIM - 26)
    g.quadraticCurveTo(L - pad, RIM - 14, L - pad, RIM + 10)
    g.lineTo(L - pad, FLOOR + pad - CORNER)
    g.arcTo(L - pad, FLOOR + pad, L - pad + CORNER, FLOOR + pad, CORNER + pad)
    g.lineTo(R + pad - CORNER, FLOOR + pad)
    g.arcTo(R + pad, FLOOR + pad, R + pad, FLOOR + pad - CORNER, CORNER + pad)
    g.lineTo(R + pad, RIM + 10)
    g.quadraticCurveTo(R + pad, RIM - 14, R + pad + 10, RIM - 26)
  }

  return {
    update(dt) {
      const time = stage.time

      // Claw follows the finger; the snack swings behind it.
      if (!hasHeld && time >= respawnAt) giveHeld()
      if (hasHeld) {
        heldGrow = Math.min(1, heldGrow + dt / 0.22)
        if (wantDrop && heldGrow >= 0.6 && aimId === null) drop()
      }
      const idle = time - lastTouchAt
      const goal = aimId !== null ? aimX(targetX) : aimX(clawX + (idle > 1.2 ? Math.sin(time * 1.1) * 0.6 : 0))
      const before = clawX
      clawX = damp(clawX, goal, 26, dt)
      swing.target = clamp(((clawX - before) / Math.max(dt, 0.001)) * -0.0007, -0.5, 0.5)
      swing.update(dt)
      grip.update(dt)
      clawSq.update(dt)
      nextPop.update(dt)
      scorePop.update(dt)
      jarSq.update(dt)
      for (const s of slotPop) s.update(dt)

      // A zero-length frame would divide by zero in the position solver.
      const h = dt / SUBSTEPS
      if (h > 0.0005) for (let i = 0; i < SUBSTEPS; i++) step(h)
      merges()

      let worst = 0
      for (const s of snacks) {
        s.sq.update(dt)
        if (s.growT < GROW_S) {
          s.growT += dt
          s.r = lerp(s.r0, s.rT, ease.outCubic(clamp(s.growT / GROW_S, 0, 1)))
          s.m = s.r * s.r
        }
        if (s.state !== 'jar') continue
        s.press = damp(s.press, s.rawPress, 10, dt)
        // Wobble toys: they right themselves once they stop rolling.
        if (s.ang > Math.PI) s.ang -= TAU
        else if (s.ang < -Math.PI) s.ang += TAU
        const speed = Math.abs(s.vx) + Math.abs(s.vy)
        if (speed < 60) s.ang = damp(s.ang, 0, 2.2, dt)
        if (!s.fresh && s.growT >= GROW_S && s.y - s.r < RIM - 6 && speed < 140) s.overT += dt
        else s.overT = Math.max(0, s.overT - dt * 2)
        worst = Math.max(worst, s.overT)
      }
      warn = worst
      if (burpIn > 0) {
        burpIn -= dt
        if (burpIn <= 0) burp()
      } else if (warn > 1.1 && time > burpReadyAt) {
        startBurp()
      }

      // Idle life: now and then one snack does a happy wiggle.
      if (time > nextFidgetAt) {
        nextFidgetAt = time + rnd(1.2, 2.6)
        const pile = snacks.filter((s) => s.state === 'jar' && !s.fresh)
        const s = pile[Math.floor(Math.random() * pile.length)]
        if (s) {
          s.sq.kick(rnd(2.5, 4))
          if (time > s.moodUntil) setMood(s, 'yum', 0.5)
        }
      }

      for (let i = snacks.length - 1; i >= 0; i--) if (snacks[i]!.dead) snacks.splice(i, 1)
    },

    draw(g) {
      const time = stage.time
      g.drawImage(backdrop, 0, 0)

      // Panels: score, next, the chain.
      const pop = scorePop.value
      rrect(g, 36, 56, 268, 84, 26, 'rgba(255,255,255,0.72)', '#e8b483', 4)
      star(g, 80, 98, 24 * pop, '#ffc21f', Math.sin(time * 2) * 0.15)
      const digits = String(score).length
      label(g, String(score), 196, 100, (digits > 5 ? 38 : 46) * pop, '#ff7a3d', '#ffffff')

      const nk = kindOf(nextTier)
      const np = nextPop.value
      circle(g, 170, 262, 84, 'rgba(255,255,255,0.72)', '#e8b483', 4)
      label(g, 'NEXT', 170, 172, 28, '#ffffff', '#c98a52')
      drawSnack(g, nextTier, 170, 266 + Math.sin(time * 2.4) * 5, nk.r * np, Math.sin(time * 1.7) * 0.12, 1, 1, nextTier === STAR ? 'wow' : 'happy', 0.8, -0.6, blinkAt(time, 3))
      if (nextTier === STAR) {
        for (let i = 0; i < 4; i++) {
          const a = time * 2 + (i * TAU) / 4
          star(g, 170 + Math.cos(a) * 62, 266 + Math.sin(a) * 62, 9, '#ffe14d', a)
        }
      }

      label(g, 'SNACKS', BX + BW / 2, BY + 38, 30, '#f4f1de', null)
      for (let i = 0; i <= TOP; i++) {
        const slot = boardSlot(i)
        const sp = slotPop[i]!.value
        if (seen[i]) {
          if (i === best && best > 0) circle(g, slot.x, slot.y, slot.r + 9 + Math.sin(time * 4) * 2, 'rgba(255,240,150,0.25)', '#ffe14d', 3)
          drawSnack(g, i, slot.x, slot.y, slot.r * sp, 0, 1, 1, made[i] || i < 4 ? 'happy' : 'plain', 0, 0, blinkAt(time, i + 5))
        } else {
          const tease = i === TOP
          circle(g, slot.x, slot.y, slot.r, tease ? 'rgba(255,210,31,0.22)' : 'rgba(0,0,0,0.22)', tease ? 'rgba(255,225,77,0.9)' : 'rgba(244,241,222,0.5)', 3)
          label(g, '?', slot.x, slot.y + 2, slot.r * 1.1, tease ? '#ffe14d' : 'rgba(244,241,222,0.75)', null)
          if (tease) sprite(g, '👑', slot.x, slot.y - slot.r - 4 + Math.sin(time * 3) * 3, 30, Math.sin(time * 2) * 0.1)
        }
      }

      // The jar and everything in it wobble together.
      const js = jarSq.value
      g.save()
      g.translate(CX, FLOOR)
      g.scale(1 / Math.sqrt(Math.max(0.5, js)), js)
      g.translate(-CX, -FLOOR)

      jarPath(g, 7)
      const glass = g.createLinearGradient(L, 0, R, 0)
      glass.addColorStop(0, 'rgba(150,215,255,0.62)')
      glass.addColorStop(0.22, 'rgba(205,238,255,0.42)')
      glass.addColorStop(0.8, 'rgba(195,232,255,0.4)')
      glass.addColorStop(1, 'rgba(130,200,245,0.62)')
      g.fillStyle = glass
      g.fill()
      // Back of the rim.
      g.beginPath()
      g.ellipse(CX, RIM - 26, (R - L) / 2 + 17, 13, 0, Math.PI, TAU)
      g.strokeStyle = 'rgba(255,255,255,0.7)'
      g.lineWidth = 6
      g.stroke()

      // Aim guide and the ghost of where it lands.
      if (hasHeld && burpIn <= 0) {
        const r = heldR()
        const gx = aimX(aimId !== null ? targetX : clawX)
        const gy = landingY(gx, r)
        const strong = aimId !== null
        g.save()
        g.setLineDash([4, 18])
        g.lineDashOffset = -time * 60
        line(g, gx, DROP_Y + r + 12, gx, gy - r - 6, strong ? 'rgba(255,120,150,0.95)' : 'rgba(255,120,150,0.5)', 7)
        g.setLineDash([])
        g.restore()
        g.globalAlpha = strong ? 0.4 : 0.22
        circle(g, gx, gy, r - 3, 'rgba(255,150,170,0.35)', '#ff6f91', 5)
        g.globalAlpha = 1
      }

      for (const s of snacks) {
        if (s.state !== 'jar') continue
        const kind = kindOf(s.tier)
        const squeezed = clamp(s.press * 1.6, 0, 0.16) + clamp((s.load - 2) * 0.012, 0, 0.06)
        const fall = s.fresh ? clamp(s.vy / 7000, 0, 0.16) : 0
        const breathe = Math.sin(time * 2.2 + s.seed) * 0.012
        const stretch = Math.max(0.55, s.sq.value + fall - squeezed + breathe)
        const sx = 1 / Math.sqrt(stretch)
        let mood: Mood = 'happy'
        if (time < s.moodUntil) mood = s.mood
        else if (s.fresh) mood = 'wow'
        else if (s.overT > 0.25 || burpIn > 0) mood = 'wow'
        else if (s.load > 3.2 || s.press > 0.05) mood = 'grumpy'
        const lx = clamp((clawX - s.x) / 260, -1, 1)
        const ly = clamp((DROP_Y - s.y) / 300, -1, 0.4)
        drawSnack(g, s.tier, s.x, s.y, s.r, s.ang, sx, stretch, mood, lx, ly, blinkAt(time, s.seed))
        if (s.tier === TOP || s.tier === STAR) {
          for (let i = 0; i < 3; i++) {
            const a = time * 1.8 + s.seed + (i * TAU) / 3
            star(g, s.x + Math.cos(a) * (s.r + 12), s.y + Math.sin(a) * (s.r + 12), s.tier === TOP ? 12 : 7, '#fff3b0', a)
          }
        }
        if (kind.r !== s.rT && s.growT >= GROW_S) s.rT = kind.r
      }

      // Front of the glass.
      jarPath(g, 7)
      g.strokeStyle = 'rgba(120,180,215,0.55)'
      g.lineWidth = 13
      g.stroke()
      g.strokeStyle = 'rgba(255,255,255,0.92)'
      g.lineWidth = 6
      g.stroke()
      line(g, L + 24, RIM + 50, L + 24, FLOOR - 150, 'rgba(255,255,255,0.4)', 12)
      line(g, L + 46, RIM + 70, L + 46, RIM + 170, 'rgba(255,255,255,0.28)', 7)
      line(g, R - 26, FLOOR - 250, R - 26, FLOOR - 120, 'rgba(255,255,255,0.22)', 9)
      g.beginPath()
      g.ellipse(CX, RIM - 26, (R - L) / 2 + 17, 13, 0, 0, Math.PI)
      g.strokeStyle = 'rgba(255,255,255,0.95)'
      g.lineWidth = 7
      g.stroke()
      if (warn > 0.2 || burpIn > 0) {
        const pulse = 0.5 + Math.sin(time * 14) * 0.5
        g.save()
        g.setLineDash([22, 16])
        line(g, L + 8, RIM, R - 8, RIM, `rgba(255,80,90,${0.35 + pulse * 0.6})`, 7)
        g.setLineDash([])
        g.restore()
      }
      g.restore()

      // The claw: a trolley with eyes, a cable, and two pincers round the snack.
      const r = heldR()
      const shown = hasHeld ? ease.outBack(heldGrow) : 0
      const hang = DROP_Y - RAIL_Y
      const sw = swing.value
      const cs = clawSq.value
      g.save()
      g.translate(clawX, RAIL_Y)
      rrect(g, -44, -22 / cs, 88, 44 / cs, 16, '#ff5d6c', '#c93a4c', 4)
      circle(g, -30, 20 / cs, 8, '#5b6478')
      circle(g, 30, 20 / cs, 8, '#5b6478')
      face(g, 0, -4, 8, hasHeld ? (aimId !== null ? 'wow' : 'happy') : 'yum', clamp((targetX - clawX) / 60, -1, 1), 0.7, blinkAt(time, 1))
      g.rotate(sw)
      const hubY = hang - r - 16
      line(g, 0, 24, 0, hubY, '#66728a', 6)
      circle(g, 0, hubY, 11, '#8b98b0', '#66728a', 3)
      const open = 0.1 + grip.value * 0.55
      for (const side of [-1, 1]) {
        g.save()
        g.translate(0, hubY)
        g.rotate(side * open)
        g.beginPath()
        if (side < 0) g.arc(0, r + 16, r + 9, -Math.PI / 2, -Math.PI / 2 - 1.95, true)
        else g.arc(0, r + 16, r + 9, -Math.PI / 2, -Math.PI / 2 + 1.95, false)
        g.strokeStyle = '#66728a'
        g.lineWidth = 11
        g.stroke()
        g.strokeStyle = '#c3cede'
        g.lineWidth = 5
        g.stroke()
        g.restore()
      }
      if (hasHeld && shown > 0) {
        const wig = Math.sin(time * 3.1) * 0.05
        drawSnack(g, heldTier, 0, hang, r * shown, wig - sw * 0.5, 1, 1, aimId !== null ? 'wow' : 'happy', 0, 1, blinkAt(time, 2))
        if (heldTier === STAR) {
          for (let i = 0; i < 4; i++) {
            const a = time * 2.4 + (i * TAU) / 4
            star(g, Math.cos(a) * (r + 16), hang + Math.sin(a) * (r + 16), 9, '#ffe14d', a)
          }
        }
      }
      g.restore()

      // Burped snacks fly in front of everything.
      for (const s of snacks) {
        if (s.state !== 'spill') continue
        const stretch = Math.max(0.55, s.sq.value)
        drawSnack(g, s.tier, s.x, s.y, s.r, s.ang, 1 / Math.sqrt(stretch), stretch, 'dizzy', 0, 0, 0)
      }

      if (time - lastTouchAt > 5 && aimId === null && hasHeld) {
        // Point at a twin of the held snack if there is one.
        let hx = CX
        let hy = 0
        for (const s of snacks) {
          if (s.state === 'jar' && s.tier === heldTier && s.y > hy) {
            hx = s.x
            hy = s.y
          }
        }
        hint(g, aimX(hx), hy > 0 ? hy - 6 : 420, time, 74)
      }
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      touched = true
      fx.ring(p.x, p.y, '#ffffff', 46, 0.3)
      // Poke a snack in the jar: it hops and squeaks.
      let poked = false
      for (const s of snacks) {
        if (s.state !== 'jar' || s.fresh) continue
        if (Math.hypot(s.x - p.x, s.y - p.y) > s.r + 14) continue
        poked = true
        s.sq.value = 0.7
        s.sq.kick(5)
        s.vy -= 300
        s.vx += rnd(-90, 90)
        setMood(s, 'wow', 0.5)
        sfx.boing(5 - Math.max(0, s.tier))
        fx.burst(p.x, p.y, { count: 6, color: kindOf(s.tier).burst, speed: 220, life: 0.4, size: 8 })
        break
      }
      if (aimId !== null) return
      aimId = p.id
      targetX = p.x
      clawSq.value = 0.8
      if (!poked) sfx.tick()
      sfx.note(2 + Math.round(rnd(0, 2)), 0.06, 'sine', 0.1)
    },

    move(p: Pointer) {
      if (p.id !== aimId) return
      targetX = p.x
      lastTouchAt = stage.time
    },

    up(p: Pointer) {
      if (p.id !== aimId) return
      targetX = p.x
      aimId = null
      lastTouchAt = stage.time
      if (hasHeld && heldGrow >= 0.6) drop()
      else wantDrop = true
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'snack-merge',
    name: 'Snack Merge',
    emoji: '🍩',
    ages: [5, 10],
    pitch: 'Drop round snacks into a jar; two of the same pop into a bigger snack, all the way up to the King Donut.',
    howTo: 'Drag to aim the claw, lift to drop. Match two of the same. Poke the pile to jiggle it.',
    basedOn: 'Suika Game (Watermelon Game)',
    whyFun: 'One satisfying pop every few seconds, chains that climb a scale, a rare biggest snack to hope for, and a jar that burps instead of ending.',
  },
  create,
}
