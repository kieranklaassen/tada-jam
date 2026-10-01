// Claw Machine: slide the claw with a finger, let go and it drops, grabs and
// hauls a prize up through a drumroll to the chute. Plush toys go to the
// shelf; capsules crack open for a surprise. The heap is a small circle
// physics pile, so pulling one prize out makes the others tumble.

import { blinkAt, hint, label, sprite, volume } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { clamp, damp, dist, ease, lerp, shuffle, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { CAPSULE_COLORS, capsuleLook, drawCapsule, drawLook, itemLook, plushLook } from './look.ts'
import type { Look } from './look.ts'

// The cabinet.
const GX0 = 70
const GX1 = 800
const GY0 = 92
const GY1 = 650
const FLOOR = 640
const RAIL = 116
const HEAP_L = 80
const WALL_X = 636
const WALL_HALF = 6
const WALL_TOP = 410
const CHUTE_X = 716
const CLAW_MIN = 124
const CLAW_MAX = 588
const L_REST = 64
const GRAVITY = 1900

// Control panel.
const BTN_X = 400
const BTN_Y = 712
const DOOR_X = 716
const DOOR_Y = 716

// Prize shelf and toy chest.
const SHELF_COLS = [906, 1006, 1106] as const
const SHELF_ROWS = [127, 247, 367, 487] as const
const SLOTS = SHELF_COLS.length * SHELF_ROWS.length
const SHELF_R = 44
const CHEST_X = 1006
const CHEST_Y = 678

const COMMON = ['🚗', '🦆', '🍭', '⚽', '🎈', '🚀', '🍩', '🦖', '🎺', '🧁', '👻', '💩', '🤖', '🍉', '🐙', '🎸']
const RARE = ['💎', '🌈', '🦄', '🏆', '🍀']
const LEGEND = ['🐉', '👑', '🦸', '🧞']

interface Body {
  x: number
  y: number
  px: number
  py: number
  vx: number
  vy: number
  r: number
  m: number
  rot: number
  vr: number
  look: Look
  seed: number
  sq: Spring
  mood: Mood
  moodT: number
  slips: number
  touch: boolean
  giant: boolean
  // Put in the chute by the claw (anything else that lands there is a bonus).
  carried: boolean
}

interface Floater {
  look: Look
  x: number
  y: number
  r: number
  rot: number
  alpha: number
  mood: Mood
  wob: Spring
  rays: number
  part: 0 | 1 | 2
}

interface ShelfItem {
  look: Look
  sq: Spring
  trick: number
  trickKind: number
  seed: number
}

type ClawState = 'idle' | 'drop' | 'close' | 'rise' | 'slip' | 'carry' | 'release' | 'empty'

function slotPos(slot: number): [number, number] {
  return [SHELF_COLS[slot % SHELF_COLS.length]!, SHELF_ROWS[Math.floor(slot / SHELF_COLS.length) % SHELF_ROWS.length]!]
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

// Everything that never changes, painted once.
function paintBackdrop(g: CanvasRenderingContext2D, rand: () => number): void {
  // The arcade room.
  const wall = g.createLinearGradient(0, 0, 0, H)
  wall.addColorStop(0, '#2c2378')
  wall.addColorStop(0.75, '#6a3bb0')
  wall.addColorStop(1, '#8a4cc4')
  g.fillStyle = wall
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 46; i++) {
    const x = rand() * W
    const y = rand() * 640
    const s = 3 + rand() * 7
    g.fillStyle = ['rgba(255,225,77,0.5)', 'rgba(255,122,200,0.45)', 'rgba(94,211,255,0.45)'][i % 3]!
    g.beginPath()
    g.arc(x, y, s, 0, TAU)
    g.fill()
  }
  // Floor tiles.
  for (let i = 0; i < 14; i++) {
    for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 === 0 ? '#ff8fc4' : '#ffd0e6'
      g.fillRect(i * 90 - 20, 730 + j * 45, 90, 45)
    }
  }
  g.fillStyle = 'rgba(30,15,70,0.35)'
  g.fillRect(0, 722, W, 10)

  // Cabinet shadow and body.
  g.fillStyle = 'rgba(20,10,50,0.35)'
  g.beginPath()
  g.ellipse(435, 796, 430, 22, 0, 0, TAU)
  g.fill()
  rr(g, 36, 12, 798, 784, 34)
  g.fillStyle = '#ff4f7b'
  g.fill()
  g.lineWidth = 8
  g.strokeStyle = '#a81f4c'
  g.stroke()
  rr(g, 48, 24, 774, 60, 22)
  g.fillStyle = '#ffd23f'
  g.fill()
  g.lineWidth = 5
  g.strokeStyle = '#e08a00'
  g.stroke()
  label(g, '★ LUCKY CLAW ★', 435, 55, 34, '#ff4f7b', '#ffffff')

  // Inside the glass.
  const inside = g.createLinearGradient(0, GY0, 0, GY1)
  inside.addColorStop(0, '#9fdcff')
  inside.addColorStop(1, '#e6f8ff')
  rr(g, GX0, GY0, GX1 - GX0, GY1 - GY0, 18)
  g.fillStyle = inside
  g.fill()
  g.save()
  rr(g, GX0, GY0, GX1 - GX0, GY1 - GY0, 18)
  g.clip()
  for (let i = 0; i < 9; i++) {
    const x = GX0 + 50 + (i % 5) * 160 + (i > 4 ? 80 : 0)
    const y = 210 + (i > 4 ? 150 : 0)
    g.fillStyle = 'rgba(255,255,255,0.4)'
    g.beginPath()
    g.arc(x, y, 34, 0, TAU)
    g.arc(x + 38, y + 8, 26, 0, TAU)
    g.arc(x - 36, y + 10, 24, 0, TAU)
    g.fill()
  }
  // The chute side: a darker bay with arrows pointing down.
  g.fillStyle = 'rgba(60,120,200,0.22)'
  g.fillRect(WALL_X, GY0, GX1 - WALL_X, GY1 - GY0)
  for (let i = 0; i < 3; i++) {
    const y = 470 + i * 44
    g.beginPath()
    g.moveTo(CHUTE_X - 34, y)
    g.lineTo(CHUTE_X, y + 26)
    g.lineTo(CHUTE_X + 34, y)
    g.lineWidth = 14
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.strokeStyle = `rgba(255,255,255,${0.35 + i * 0.2})`
    g.stroke()
  }
  g.fillStyle = '#ff9fc0'
  g.fillRect(GX0, FLOOR, GX1 - GX0, 12)
  g.fillStyle = '#2a1b4d'
  g.beginPath()
  g.ellipse(CHUTE_X, FLOOR + 4, 62, 12, 0, 0, TAU)
  g.fill()
  g.restore()

  // Control panel.
  rr(g, 56, 662, 758, 116, 22)
  g.fillStyle = '#d63563'
  g.fill()
  g.lineWidth = 5
  g.strokeStyle = '#a81f4c'
  g.stroke()
  rr(g, DOOR_X - 66, DOOR_Y - 46, 132, 96, 16)
  g.fillStyle = '#2a1b4d'
  g.fill()
  g.lineWidth = 6
  g.strokeStyle = '#ffd23f'
  g.stroke()
  // Button and joystick bases.
  g.fillStyle = '#a81f4c'
  g.beginPath()
  g.ellipse(BTN_X, BTN_Y + 14, 66, 40, 0, 0, TAU)
  g.fill()
  g.beginPath()
  g.ellipse(190, BTN_Y + 22, 46, 22, 0, 0, TAU)
  g.fill()

  // The prize shelf.
  rr(g, 846, 44, 320, 512, 22)
  g.fillStyle = '#fff1d6'
  g.fill()
  g.lineWidth = 8
  g.strokeStyle = '#b5763a'
  g.stroke()
  for (const row of SHELF_ROWS) {
    rr(g, 850, row + SHELF_R + 6, 312, 16, 6)
    g.fillStyle = '#d9a066'
    g.fill()
    g.fillStyle = 'rgba(120,70,20,0.18)'
    g.fillRect(858, row + SHELF_R + 22, 296, 8)
    for (const col of SHELF_COLS) {
      g.beginPath()
      g.arc(col, row, SHELF_R - 6, 0, TAU)
      g.setLineDash([6, 12])
      g.lineWidth = 4
      g.strokeStyle = 'rgba(181,118,58,0.28)'
      g.stroke()
      g.setLineDash([])
    }
  }
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  const back = document.createElement('canvas')
  back.width = W
  back.height = H
  const bg = back.getContext('2d')
  if (bg) paintBackdrop(bg, () => stage.rand())

  const bodies: Body[] = []
  const floaters: Floater[] = []
  const slots: (ShelfItem | null)[] = []
  for (let i = 0; i < SLOTS; i++) slots.push(null)
  let nextSlot = 0
  let chestCount = 0
  const chest = spring(1, 260, 9)
  const door = spring(0, 200, 12)
  const btn = spring(0, 320, 14)
  let stick = 0

  let asleep = false
  let calm = 0
  let quiet = true
  let lastThud = -1
  let wins = 0
  let wave = 0
  let pouring = 0
  let giantDue = false
  let lastTouch = 0
  let alert = 0
  let party = 0
  let hopAt = 1.5
  let sparkleAt = 0
  let seedCount = 0
  const commons = shuffle(COMMON, () => stage.rand())
  const rares = shuffle(RARE, () => stage.rand())
  const legends = shuffle(LEGEND, () => stage.rand())
  let savedOnce = false

  const claw = {
    x: 360,
    tx: 360,
    vx: 0,
    ang: 0,
    angV: 0,
    L: L_REST,
    dropV: 0,
    grip: spring(1, 300, 13),
    state: 'idle' as ClawState,
    t: 0,
    held: null as Body | null,
    fromX: 0,
    fromY: 0,
    fromRot: 0,
    fromL: L_REST,
    dur: 1,
    slipAt: -1,
    slipT: 0,
    wob: spring(0, 120, 5),
    pendingDrop: false,
    followId: null as number | null,
    tickAcc: 0,
    roll: 0,
    carryFrom: 0,
  }

  const wake = () => {
    asleep = false
    calm = 0
  }

  const makeBody = (look: Look, x: number, y: number, r: number, giant = false): Body => {
    const body: Body = {
      x,
      y,
      px: x,
      py: y,
      vx: 0,
      vy: 0,
      r,
      m: r * r * (look.gold ? 1.6 : 1),
      rot: (stage.rand() - 0.5) * 1.2,
      vr: 0,
      look,
      seed: ++seedCount * 1.7,
      sq: spring(1, 240, 9),
      mood: 'happy',
      moodT: 0,
      slips: 0,
      touch: false,
      giant,
      carried: false,
    }
    bodies.push(body)
    wake()
    return body
  }

  const speciesFor = (w: number): number => {
    const pool = w === 0 ? 6 : w === 1 ? 8 : 9
    const lo = w >= 2 ? 3 : 0
    return lo + Math.floor(stage.rand() * (pool - lo))
  }

  const randomPrize = (w: number): { look: Look; r: number } => {
    if (stage.rand() < 0.38) {
      return { look: capsuleLook(CAPSULE_COLORS[Math.floor(stage.rand() * CAPSULE_COLORS.length)]!), r: 36 + stage.rand() * 4 }
    }
    return { look: plushLook(speciesFor(w)), r: 40 + stage.rand() * 8 }
  }

  // ---- Physics: position-based circles, soft like plush. ----

  const walls = (b: Body, tallWall: boolean) => {
    if (b.y > FLOOR - b.r) {
      b.y = FLOOR - b.r
      b.touch = true
    }
    const left = b.x < WALL_X
    if (b.x < HEAP_L + b.r) b.x = HEAP_L + b.r
    if (b.x > GX1 - 6 - b.r) b.x = GX1 - 6 - b.r
    if (tallWall || b.y > WALL_TOP) {
      if (left && b.x > WALL_X - WALL_HALF - b.r) {
        b.x = WALL_X - WALL_HALF - b.r
        b.touch = true
      } else if (!left && b.x < WALL_X + WALL_HALF + b.r) {
        b.x = WALL_X + WALL_HALF + b.r
      }
    } else {
      const dx = b.x - WALL_X
      const dy = b.y - WALL_TOP
      const d = Math.hypot(dx, dy)
      const min = b.r + WALL_HALF
      if (d < min && d > 0.001) {
        b.x = WALL_X + (dx / d) * min
        b.y = WALL_TOP + (dy / d) * min
        b.touch = true
      }
    }
  }

  const step = (dt: number, tallWall: boolean) => {
    for (const b of bodies) {
      b.vy = Math.min(1500, b.vy + GRAVITY * dt)
      b.px = b.x
      b.py = b.y
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.touch = false
    }
    for (let it = 0; it < 8; it++) {
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i]!
        for (let j = i + 1; j < bodies.length; j++) {
          const b = bodies[j]!
          const dx = b.x - a.x
          const dy = b.y - a.y
          const min = a.r + b.r
          if (Math.abs(dx) > min || Math.abs(dy) > min) continue
          const d2 = dx * dx + dy * dy
          if (d2 >= min * min) continue
          const d = Math.sqrt(d2) || 0.01
          const push = min - d
          const share = b.m / (a.m + b.m)
          const nx = dx / d
          const ny = dy / d
          a.x -= nx * push * share
          a.y -= ny * push * share
          b.x += nx * push * (1 - share)
          b.y += ny * push * (1 - share)
          a.touch = true
          b.touch = true
        }
        walls(a, tallWall)
      }
    }
    let fastest = 0
    for (const b of bodies) {
      const nvx = (b.x - b.px) / dt
      const nvy = (b.y - b.py) / dt
      const jolt = Math.hypot(nvx - b.vx, nvy - b.vy)
      b.vx = nvx
      b.vy = nvy
      if (b.touch) {
        b.vx *= 0.9
        b.vy *= 0.985
        b.vr = lerp(b.vr, b.vx / b.r, 0.25)
      }
      b.rot += b.vr * dt
      if (jolt > 420) {
        b.sq.value = 1 - Math.min(0.32, jolt / 2600)
        if (!quiet && stage.time - lastThud > 0.07) {
          lastThud = stage.time
          sfx.thud(clamp(jolt / 1400, 0.2, 1) * (b.giant ? 1 : 0.6))
          if (b.giant && jolt > 700) {
            fx.shake(10, 0.3)
            fx.burst(b.x, b.y + b.r, { count: 14, color: '#ffffff', speed: 320, angle: -Math.PI / 2, spread: Math.PI, life: 0.45, size: 10 })
          }
        }
      }
      const speed = Math.hypot(b.vx, b.vy)
      if (speed > fastest) fastest = speed
    }
    calm = fastest < 26 ? calm + dt : 0
    if (calm > 0.5 && pouring === 0) {
      asleep = true
      for (const b of bodies) {
        b.vx = 0
        b.vy = 0
        b.vr = 0
      }
    }
  }

  // ---- The first heap, settled before the first frame. ----

  makeBody(capsuleLook('#ffc629', true), 300 + stage.rand() * 120, 590, 44)
  for (let i = 0; i < 17; i++) {
    // Guarantee a friendly mix up top: plush, capsule, plush.
    const prize =
      i % 3 === 1
        ? { look: capsuleLook(CAPSULE_COLORS[Math.floor(i / 3) % CAPSULE_COLORS.length]!), r: 36 + stage.rand() * 4 }
        : { look: plushLook((i - Math.floor((i + 1) / 3)) % 6), r: 40 + stage.rand() * 8 }
    makeBody(prize.look, 130 + stage.rand() * 420, 480 - i * 96, prize.r)
  }
  for (let i = 0; i < 700 && !asleep; i++) step(1 / 120, true)
  for (const b of bodies) b.sq.value = 1
  quiet = false

  // ---- Prizes on their way to the shelf. ----

  const addFloater = (look: Look, x: number, y: number, r: number): Floater => {
    const f: Floater = { look, x, y, r, rot: 0, alpha: 1, mood: 'happy', wob: spring(0, 200, 7), rays: 0, part: 0 }
    floaters.push(f)
    return f
  }
  const dropFloater = (f: Floater) => {
    const at = floaters.indexOf(f)
    if (at !== -1) floaters.splice(at, 1)
  }

  const sweep = () => {
    if (!slots.some((s) => s !== null)) return
    party = 2.2
    sfx.fanfare()
    fx.confetti(1006, 120, 70)
    fx.confetti(435, 140, 60)
    fx.text(1006, 250, 'FULL SHELF!', { color: '#ffe14d', size: 54, life: 1.6 })
    fx.flash('#fff7c2', 0.3, 0.3)
    let n = 0
    for (let i = 0; i < SLOTS; i++) {
      const item = slots[i]
      if (!item) continue
      slots[i] = null
      const [sx, sy] = slotPos(i)
      const f = addFloater(item.look, sx, sy, SHELF_R)
      const order = n++
      stage.after(0.5 + order * 0.08, () => {
        stage.tween(
          0.45,
          (t) => {
            f.x = lerp(sx, CHEST_X, t)
            f.y = lerp(sy, CHEST_Y - 20, t) - Math.sin(t * Math.PI) * 120
            f.r = lerp(SHELF_R, 20, t)
            f.rot = t * TAU
          },
          ease.inQuad,
          () => {
            dropFloater(f)
            chestCount++
            chest.value = 1.25
            sfx.coin(order)
            fx.burst(CHEST_X, CHEST_Y - 30, { count: 6, color: ['#ffe14d', '#ffffff'], speed: 220, shape: 'star', life: 0.5, size: 12, angle: -Math.PI / 2, spread: 1.6 })
          },
        )
      })
    }
  }

  const land = (slot: number, look: Look) => {
    if (slots[slot]) sweep()
    const item: ShelfItem = { look, sq: spring(1, 260, 8), trick: 0, trickKind: 0, seed: ++seedCount * 1.7 }
    item.sq.value = 0.55
    slots[slot] = item
    const [sx, sy] = slotPos(slot)
    sfx.pop(slot % 8)
    fx.burst(sx, sy, { count: look.rare ? 16 : 8, color: look.rare ? ['#ffe14d', '#fff3b0'] : ['#ffffff', '#ffd0e6'], speed: 260, shape: 'star', life: 0.5, size: 12 })
    if (slots.every((s) => s !== null)) stage.after(0.45, () => slots.every((s) => s !== null) && sweep())
  }

  const flyToShelf = (f: Floater, delay = 0) => {
    const slot = nextSlot
    nextSlot = (nextSlot + 1) % SLOTS
    const [sx, sy] = slotPos(slot)
    stage.after(delay, () => {
      const x0 = f.x
      const y0 = f.y
      const r0 = f.r
      sfx.whoosh()
      stage.tween(
        0.55,
        (t) => {
          f.x = lerp(x0, sx, t)
          f.y = lerp(y0, sy, t) - Math.sin(t * Math.PI) * 150
          f.r = lerp(r0, SHELF_R, t)
          f.rot = Math.sin(t * Math.PI) * -0.5
          f.rays *= 0.8
        },
        ease.inOutQuad,
        () => {
          dropFloater(f)
          land(slot, f.look)
        },
      )
    })
  }

  const draw3 = <T,>(deck: T[], refill: () => T[]): T => {
    if (deck.length === 0) deck.push(...refill())
    return deck.pop()!
  }

  const reveal = (f: Floater) => {
    const capsule = f.look
    const contents: Look[] = []
    if (capsule.gold) {
      contents.push(itemLook(draw3(legends, () => shuffle(LEGEND)), 2))
    } else if (capsule.rainbow) {
      contents.push(itemLook(draw3(commons, () => shuffle(COMMON)), 0))
      contents.push(itemLook(draw3(rares, () => shuffle(RARE)), 1))
      contents.push(itemLook(draw3(commons, () => shuffle(COMMON)), 0))
    } else if (stage.rand() < 0.16) {
      contents.push(itemLook(draw3(rares, () => shuffle(RARE)), 1))
    } else {
      contents.push(itemLook(draw3(commons, () => shuffle(COMMON)), 0))
    }
    const x0 = f.x
    const y0 = f.y
    const r0 = f.r
    const cx = 435
    const cy = 350
    stage.tween(
      0.35,
      (t) => {
        f.x = lerp(x0, cx, t)
        f.y = lerp(y0, cy, t) - Math.sin(t * Math.PI) * 60
        f.r = lerp(r0, 100, t)
      },
      ease.outCubic,
    )
    for (let i = 0; i < 3; i++) {
      stage.after(0.34 + i * 0.15, () => {
        f.wob.kick(i % 2 === 0 ? 9 : -9)
        sfx.note(i * 2, 0.08, 'square', 0.12)
        fx.ring(f.x, f.y, '#ffffff', 120 + i * 20, 0.25)
      })
    }
    stage.after(0.82, () => {
      dropFloater(f)
      const best = Math.max(...contents.map((c) => c.rare))
      // The two halves fly apart.
      for (const part of [1, 2] as const) {
        const half = addFloater(capsule, cx, cy, 100)
        half.part = part
        const dir = part === 1 ? -1 : 1
        stage.tween(
          0.5,
          (t) => {
            half.x = cx + dir * t * 190
            half.y = cy + dir * t * 150 + (part === 1 ? -80 * Math.sin(t * Math.PI) : 0)
            half.rot = dir * t * 2.4
            half.alpha = 1 - t * t
          },
          ease.outQuad,
          () => dropFloater(half),
        )
      }
      sfx.crunch()
      sfx.pop(3)
      fx.burst(cx, cy, { count: 26, color: capsule.gold ? ['#ffe14d', '#ffffff', '#ffb02e'] : [capsule.color, '#ffffff', '#ffe14d'], speed: 560, life: 0.7, size: 13, shape: 'star' })
      fx.flash(best > 0 ? '#fff2a8' : '#ffffff', best > 0 ? 0.55 : 0.3, 0.25)
      if (best === 2) {
        sfx.fanfare()
        fx.shake(14, 0.4)
        fx.hitstop(70)
        fx.confetti(cx, cy - 60, 90)
        fx.text(cx, cy - 170, 'SUPER RARE!!', { color: '#ffe14d', size: 66, life: 1.8 })
        party = 2
      } else if (best === 1) {
        sfx.win()
        stage.after(0.25, () => sfx.ding(5))
        fx.shake(7, 0.25)
        fx.confetti(cx, cy - 60, 40)
        fx.text(cx, cy - 170, 'RARE!', { color: '#ffe14d', size: 60, life: 1.5 })
      } else {
        sfx.win()
        fx.text(cx, cy - 160, contents[0]!.emoji === '💩' ? 'EWW!' : 'TA-DA!', { color: '#ffffff', size: 48, life: 1.1 })
      }
      const hold = best === 2 ? 1.5 : best === 1 ? 1.1 : 0.75
      contents.forEach((look, i) => {
        const spread = (i - (contents.length - 1) / 2) * 190
        const item = addFloater(look, cx + spread, cy, 0)
        item.rays = look.rare > 0 || contents.length > 1 ? 1 : 0.5
        item.wob.kick(6)
        stage.tween(0.5, (t) => (item.r = 92 * t), ease.outElastic)
        flyToShelf(item, hold + i * 0.14)
      })
    })
  }

  const deliver = (look: Look, r: number) => {
    const f = addFloater(look, DOOR_X, DOOR_Y + 20, 0)
    f.mood = 'yum'
    door.value = 1
    sfx.pop(1)
    stage.tween(
      0.26,
      (t) => {
        f.r = r * t
        f.y = DOOR_Y + 20 - 46 * t
      },
      ease.outBack,
      () => {
        if (look.kind === 'capsule') reveal(f)
        else flyToShelf(f, 0.05)
      },
    )
  }

  // ---- Heap events. ----

  const pour = () => {
    wave++
    const w = wave
    const list: { look: Look; r: number }[] = [{ look: capsuleLook('#ffc629', true), r: 44 }]
    list.push({ look: capsuleLook('#ffffff', false, true), r: 42 })
    if (w >= 2) list.push({ look: capsuleLook('#ffc629', true), r: 44 })
    while (list.length < 12) list.push(randomPrize(w))
    list.push({ look: plushLook(speciesFor(w)), r: 62 })
    pouring = list.length
    sfx.slideDown()
    fx.text(360, 200, 'MORE PRIZES!', { color: '#ffffff', size: 46, life: 1.4 })
    party = Math.max(party, 1.2)
    list.forEach((prize, i) => {
      stage.after(0.25 + i * 0.13, () => {
        const b = makeBody(prize.look, 130 + stage.rand() * 420, GY0 - 70, prize.r, prize.r > 55)
        b.vy = 500
        pouring--
      })
    })
  }

  const spawnGiant = () => {
    const b = makeBody(plushLook(speciesFor(wave)), clamp(claw.x > 360 ? 220 : 480, 150, 560), GY0 - 80, 62, true)
    b.vy = 300
    b.mood = 'wow'
    b.moodT = 1.2
    sfx.slideDown()
    alert = 0.8
  }

  const win = (b: Body, bonus: boolean) => {
    bodies.splice(bodies.indexOf(b), 1)
    wake()
    wins++
    sfx.thud(0.6)
    fx.burst(b.x, FLOOR - 6, { count: 12, color: '#ffffff', speed: 260, angle: -Math.PI / 2, spread: 1.6, life: 0.4, size: 9 })
    for (let i = 0; i < 3; i++) stage.after(0.06 + i * 0.07, () => sfx.coin(i * 2))
    if (bonus) fx.text(CHUTE_X, 420, 'BONUS!', { color: '#ffe14d', size: 50 })
    const look = b.look
    const r = Math.min(b.r, 52)
    stage.after(0.2, () => deliver(look, r))
    if (wins === 3) giantDue = true
  }

  // ---- The claw. ----

  const hub = (): [number, number] => [claw.x + Math.sin(claw.ang) * claw.L, RAIL + 14 + Math.cos(claw.ang) * claw.L]
  const holdPos = (r: number): [number, number] => {
    const [hx, hy] = hub()
    const reach = 16 + r
    return [hx + Math.sin(claw.ang) * reach, hy + Math.cos(claw.ang) * reach]
  }

  const startDrop = () => {
    claw.state = 'drop'
    claw.pendingDrop = false
    claw.dropV = 200
    claw.grip.target = 1
    claw.grip.kick(3)
    sfx.slideDown()
  }

  const contact = () => {
    const [hx, hy] = hub()
    const probeY = hy + 46
    let best: Body | null = null
    let bestGap = 50
    for (const b of bodies) {
      if (b.x > WALL_X) continue
      const gap = dist(hx, probeY, b.x, b.y) - b.r
      if (gap < bestGap) {
        bestGap = gap
        best = b
      }
    }
    claw.state = 'close'
    claw.t = 0
    claw.fromL = claw.L
    sfx.thud(0.4)
    if (best) {
      bodies.splice(bodies.indexOf(best), 1)
      claw.held = best
      claw.fromX = best.x
      claw.fromY = best.y
      claw.fromRot = Math.atan2(Math.sin(best.rot), Math.cos(best.rot))
      best.sq.value = 0.8
      // The heap jumps a little when one is pulled out.
      for (const b of bodies) {
        if (dist(b.x, b.y, best.x, best.y) < best.r + b.r + 30) {
          b.vy -= 160
          b.vx += (b.x - best.x) * 1.2
          b.sq.kick(2)
        }
      }
      wake()
      fx.burst(best.x, best.y, { count: 8, color: '#ffffff', speed: 200, life: 0.35, size: 8 })
    } else {
      fx.burst(hx, hy + 60, { count: 6, color: '#ffffff', speed: 160, life: 0.3, size: 7 })
    }
    claw.grip.target = 0
  }

  const slipChance = (b: Body): number => {
    if (wins < 2) return 0
    const table = b.giant ? [0.7, 0.35] : b.look.gold ? [0.55, 0.25] : b.look.rainbow ? [0.4, 0] : [0.06, 0]
    return table[b.slips] ?? 0
  }

  const saveSlip = () => {
    claw.state = 'rise'
    claw.grip.kick(-5)
    savedOnce = true
    const [hx, hy] = hub()
    sfx.ding(4)
    sfx.zap()
    fx.ring(hx, hy + 40, '#ffe14d', 120, 0.35)
    fx.burst(hx, hy + 40, { count: 12, color: ['#ffe14d', '#ffffff'], speed: 320, shape: 'spark', life: 0.4, size: 12 })
    fx.text(hx + 130, Math.max(190, hy), 'PHEW!', { color: '#a8ffb0', size: 44 })
    if (claw.held) claw.held.mood = 'wow'
  }

  const letFall = () => {
    const b = claw.held
    if (!b) return
    const [x, y] = holdPos(b.r)
    b.x = x
    b.y = y + 16
    b.px = b.x
    b.py = b.y
    b.vx = (Math.random() - 0.5) * 160
    b.vy = 0
    b.vr = (Math.random() < 0.5 ? -1 : 1) * 7
    b.rot = claw.wob.value
    b.mood = 'dizzy'
    b.moodT = 2
    b.slips++
    bodies.push(b)
    wake()
    claw.held = null
    claw.state = 'empty'
    claw.t = 0
    claw.fromL = claw.L
    claw.grip.target = 1
    sfx.slideDown()
    sfx.boing(-2)
    fx.text(x, y - 70, 'OOPS!', { color: '#ffd0e6', size: 46 })
  }

  const updateClaw = (dt: number) => {
    const prevX = claw.x
    const prevVx = claw.vx
    const s = claw.state
    if (s === 'idle') {
      const dx = claw.tx - claw.x
      const stepX = clamp(dx * (1 - Math.exp(-14 * dt)), -1500 * dt, 1500 * dt)
      claw.x += stepX
      claw.L = damp(claw.L, L_REST, 10, dt)
      if (claw.pendingDrop && Math.abs(claw.tx - claw.x) < 8 && claw.followId === null) startDrop()
    } else if (s === 'drop') {
      claw.dropV = Math.min(1150, claw.dropV + 3200 * dt)
      claw.L += claw.dropV * dt
      claw.ang *= 0.9
      const [hx, hy] = hub()
      let hit = hy + 62 >= FLOOR
      for (const b of bodies) {
        if (b.x > WALL_X) continue
        if (dist(hx, hy + 44, b.x, b.y) < b.r + 24) hit = true
      }
      if (hit) contact()
    } else if (s === 'close') {
      claw.t += dt / 0.24
      const b = claw.held
      if (b) {
        const k = ease.outCubic(Math.min(1, claw.t))
        const [x, y] = holdPos(b.r)
        b.x = lerp(claw.fromX, x, k)
        b.y = lerp(claw.fromY, y, k)
        b.rot = lerp(claw.fromRot, 0, k)
      }
      if (claw.t >= 1) {
        claw.t = 0
        claw.fromL = claw.L
        claw.roll = 0
        if (b) {
          claw.state = 'rise'
          claw.dur = b.giant || b.look.gold ? 1.55 : 1.15
          claw.slipAt = Math.random() < slipChance(b) ? 0.35 + Math.random() * 0.3 : -1
          claw.wob.value = 0
          claw.wob.kick((Math.random() < 0.5 ? -1 : 1) * 3)
          b.mood = 'wow'
          b.sq.value = 1.18
          sfx.boing(2)
          if (b.look.kind === 'plush') sfx.tone({ freq: 900, to: 1500, dur: 0.12, type: 'sine', vol: 0.18 })
          else sfx.tick()
        } else {
          claw.state = 'empty'
          sfx.nope()
          claw.angV += 2.2
          const [hx, hy] = hub()
          fx.text(hx, hy - 30, '?', { color: '#ffffff', size: 50, life: 0.7 })
        }
      }
    } else if (s === 'rise') {
      claw.t += dt / claw.dur
      const k = ease.inOutQuad(Math.min(1, claw.t))
      claw.L = lerp(claw.fromL, L_REST, k)
      // The drumroll: faster and higher as it climbs.
      claw.roll += dt
      const gap = lerp(0.15, 0.06, claw.t)
      if (claw.roll >= gap) {
        claw.roll = 0
        sfx.note(-5 + Math.floor(claw.t * 10), 0.06, 'triangle', 0.11)
        claw.angV += (Math.random() - 0.5) * 0.5
      }
      if (claw.slipAt > 0 && claw.t >= claw.slipAt) {
        claw.slipAt = -1
        claw.state = 'slip'
        claw.slipT = 0
        claw.grip.kick(7)
        claw.wob.kick(5)
        if (claw.held) claw.held.mood = 'sad'
        sfx.tone({ freq: 170, to: 70, dur: 0.6, type: 'sawtooth', vol: 0.16 })
        sfx.tone({ freq: 120, to: 60, dur: 0.6, type: 'square', vol: 0.08, delay: 0.05 })
        fx.shake(5, 0.4)
        const [hx, hy] = hub()
        fx.text(hx - 130, Math.max(190, hy), 'UH-OH!', { color: '#ffb3c7', size: 46, life: 0.9 })
      } else if (claw.t >= 1) {
        claw.state = 'carry'
        claw.t = 0
        claw.carryFrom = claw.x
        claw.dur = 0.34 + Math.abs(CHUTE_X - claw.x) / 1300
        sfx.ding(3)
        sfx.whoosh()
        if (claw.held) claw.held.mood = 'happy'
      }
    } else if (s === 'slip') {
      claw.slipT += dt
      claw.angV += Math.sin(stage.time * 50) * 14 * dt
      if (claw.slipT > 1.05) letFall()
    } else if (s === 'carry') {
      claw.t += dt / claw.dur
      claw.x = lerp(claw.carryFrom, CHUTE_X, ease.inOutQuad(Math.min(1, claw.t)))
      if (claw.t >= 1) {
        claw.state = 'release'
        claw.t = 0
        claw.grip.target = 1
        claw.grip.kick(4)
        const b = claw.held
        if (b) {
          const [x, y] = holdPos(b.r)
          b.x = clamp(x, WALL_X + WALL_HALF + b.r + 1, GX1 - 7 - b.r)
          b.y = y
          b.px = b.x
          b.py = b.y
          b.vx = 0
          b.vy = 120
          b.vr = claw.angV * 2
          b.rot = claw.wob.value - claw.ang
          b.mood = 'wow'
          b.moodT = 1
          b.carried = true
          bodies.push(b)
          wake()
          claw.held = null
          sfx.pop(0)
        }
      }
    } else if (s === 'release') {
      claw.t += dt / 0.22
      if (claw.t >= 1) {
        claw.state = 'idle'
        claw.tx = claw.x
      }
    } else if (s === 'empty') {
      claw.t += dt / 0.4
      claw.L = lerp(claw.fromL, L_REST, ease.outCubic(Math.min(1, claw.t)))
      if (claw.t >= 1) {
        claw.state = 'idle'
        claw.tx = clamp(claw.x, CLAW_MIN, CLAW_MAX)
      }
    }

    // The cable swings against the trolley's acceleration.
    claw.vx = (claw.x - prevX) / dt
    const ax = clamp((claw.vx - prevVx) / dt, -30000, 30000)
    const idleSway = s === 'idle' ? Math.sin(stage.time * 1.3) * 0.6 : 0
    claw.angV += (-46 * claw.ang - 3.2 * claw.angV - ax * 0.0021 + idleSway) * dt
    const maxAng = s === 'carry' || s === 'release' ? 0.3 : 0.6
    claw.ang = clamp(claw.ang + claw.angV * dt, -maxAng, maxAng)
    claw.grip.update(dt)
    claw.wob.update(dt)
    claw.wob.kick(-claw.angV * 2.5 * dt)
    stick = damp(stick, clamp(claw.vx / 700, -1, 1), 12, dt)

    // A soft motor tick as the trolley travels.
    claw.tickAcc += Math.abs(claw.x - prevX)
    if (claw.tickAcc > 46) {
      claw.tickAcc = 0
      sfx.tone({ freq: 260 + (claw.x / W) * 260, dur: 0.035, type: 'square', vol: 0.035 })
    }

    const b = claw.held
    if (b && s !== 'close') {
      const sag = s === 'slip' ? Math.min(1, claw.slipT * 4) * 16 + Math.sin(stage.time * 40) * 2 : 0
      const [x, y] = holdPos(b.r)
      b.x = x
      b.y = y + sag
      b.rot = claw.wob.value * 0.35 - claw.ang
      b.sq.update(dt)
    }
  }

  // ---- Touch. ----

  const trick = (slot: number, item: ShelfItem) => {
    item.trick = 0.0001
    item.trickKind = (item.trickKind + 1) % 3
    item.sq.value = 0.7
    const [sx, sy] = slotPos(slot)
    const e = item.look.emoji
    if (item.look.kind === 'plush') {
      sfx.boing(slot % 5)
      sfx.tone({ freq: 800 + (slot % 5) * 90, to: 1400, dur: 0.12, type: 'sine', vol: 0.16 })
      fx.burst(sx, sy - 30, { count: 5, color: ['#ff7ac8', '#ff5d7a'], speed: 160, shape: 'heart', life: 0.7, size: 14, angle: -Math.PI / 2, spread: 1.4, gravity: -200 })
    } else if (e === '💩') {
      sfx.noise({ dur: 0.35, freq: 220, to: 70, filter: 'lowpass', vol: 0.5 })
      sfx.tone({ freq: 95, to: 55, dur: 0.3, type: 'sawtooth', vol: 0.2 })
      fx.burst(sx + 20, sy + 20, { count: 8, color: ['#b5e86a', '#e8f7a8'], speed: 140, life: 0.8, size: 16, gravity: -120, drag: 0.94 })
    } else if (e === '🦆') {
      sfx.tone({ freq: 720, to: 430, dur: 0.11, type: 'square', vol: 0.16 })
      sfx.tone({ freq: 700, to: 400, dur: 0.13, type: 'square', vol: 0.16, delay: 0.16 })
    } else if (e === '👻') {
      sfx.tone({ freq: 420, to: 880, dur: 0.4, type: 'sine', vol: 0.2 })
    } else if (e === '🎺' || e === '🎸') {
      for (let i = 0; i < 4; i++) stage.after(i * 0.09, () => sfx.note([0, 2, 4, 7][i]!, 0.12, e === '🎺' ? 'square' : 'sawtooth', 0.14))
    } else if (e === '🚀' || e === '🚗') {
      sfx.whoosh()
      sfx.slideUp()
    } else if (e === '🤖') {
      sfx.zap()
    } else {
      sfx.ding(slot % 6)
    }
    if (item.look.rare > 0) {
      fx.burst(sx, sy, { count: 14, color: ['#ffe14d', '#ffffff'], speed: 300, shape: 'star', life: 0.6, size: 13 })
      sfx.coin(4)
    } else {
      fx.ring(sx, sy, '#ffffff', 60, 0.3)
    }
  }

  const squeeze = (p: Pointer) => {
    fx.ring(p.x, p.y, '#ffffff', 46, 0.3)
    claw.angV += (p.x < claw.x ? 1 : -1) * 1.1
    claw.grip.kick(-4)
    claw.wob.kick((Math.random() - 0.5) * 8)
    sfx.note(Math.floor(Math.random() * 5), 0.06, 'triangle', 0.1)
    // Poke a prize in the heap: it squeaks and hops.
    for (const b of bodies) {
      if (dist(p.x, p.y, b.x, b.y) < b.r + 14) {
        b.sq.value = 0.72
        b.vy -= 260
        b.mood = 'wow'
        b.moodT = 0.6
        wake()
        sfx.tone({ freq: 700, to: 1200, dur: 0.1, type: 'sine', vol: 0.15 })
        break
      }
    }
  }

  // ---- Drawing. ----

  const drawBody = (g: CanvasRenderingContext2D, b: Body, mood: Mood, tx: number, ty: number) => {
    const dx = tx - b.x
    const dy = ty - b.y
    const d = Math.hypot(dx, dy) || 1
    const c = Math.cos(b.rot)
    const s = Math.sin(b.rot)
    const lx = ((dx * c + dy * s) / d) * 0.9
    const ly = ((-dx * s + dy * c) / d) * 0.9
    const breathe = b.look.kind === 'plush' ? Math.sin(stage.time * 2.1 + b.seed) * 0.018 : 0
    const [sx, sy] = volume(b.sq.value + breathe)
    g.save()
    g.translate(b.x, b.y)
    g.rotate(b.rot)
    g.scale(sx, sy)
    drawLook(g, b.look, b.r, mood, lx, ly, blinkAt(stage.time, b.seed), stage.time, b.seed)
    g.restore()
  }

  const armPath = (g: CanvasRenderingContext2D, side: number, knee: number, kneeY: number, tipX: number, reach: number) => {
    g.beginPath()
    g.moveTo(side * 12, 6)
    g.quadraticCurveTo(side * (knee + 12), kneeY * 0.35, side * knee, kneeY)
    g.quadraticCurveTo(side * knee * 0.98, reach * 0.92, side * tipX, reach)
  }

  const drawClaw = (g: CanvasRenderingContext2D) => {
    const [hx, hy] = hub()
    const topY = RAIL + 14
    // Cable.
    g.beginPath()
    g.moveTo(claw.x, topY)
    g.lineTo(hx, hy - 10)
    g.lineWidth = 6
    g.lineCap = 'round'
    g.strokeStyle = '#5b5f7a'
    g.stroke()

    const b = claw.held
    const grip = clamp(claw.grip.value, -0.25, 1.3)
    const r = b ? b.r : 0
    const closedKnee = b ? r + 9 : 24
    const closedKneeY = b ? 16 + r * 0.8 : 30
    const closedTip = b ? r * 0.6 : 5
    const closedReach = b ? 16 + r * 1.74 : 62
    const knee = lerp(closedKnee, Math.max(54, closedKnee + 12), grip)
    const kneeY = lerp(closedKneeY, 26, grip)
    const tipX = lerp(closedTip, Math.max(48, closedKnee + 6), grip)
    const reach = lerp(closedReach, 60, grip)

    g.save()
    g.translate(hx, hy)
    g.rotate(-claw.ang)
    // Back prong.
    g.beginPath()
    g.moveTo(0, 6)
    g.lineTo(0, reach * 0.72)
    g.lineWidth = 10
    g.strokeStyle = '#8087a8'
    g.stroke()
    g.restore()

    if (b) drawBody(g, b, b.mood, hx, hy - 200)

    g.save()
    g.translate(hx, hy)
    g.rotate(-claw.ang)
    for (const side of [-1, 1]) {
      armPath(g, side, knee, kneeY, tipX, reach)
      g.lineWidth = 15
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.strokeStyle = '#4a4f6e'
      g.stroke()
      armPath(g, side, knee, kneeY, tipX, reach)
      g.lineWidth = 8
      g.strokeStyle = '#dfe4f2'
      g.stroke()
      g.beginPath()
      g.arc(side * tipX, reach, 9, 0, TAU)
      g.fillStyle = '#ff4f7b'
      g.fill()
      g.lineWidth = 3
      g.strokeStyle = '#a81f4c'
      g.stroke()
    }
    // Hub.
    rr(g, -24, -18, 48, 32, 10)
    g.fillStyle = '#ffd23f'
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = '#c47a00'
    g.stroke()
    g.beginPath()
    g.arc(0, -2, 7, 0, TAU)
    g.fillStyle = claw.state === 'slip' ? '#ff3b3b' : claw.state === 'idle' ? '#5ed36a' : '#ffffff'
    g.fill()
    g.restore()
  }

  const drawMachineFront = (g: CanvasRenderingContext2D) => {
    const t = stage.time
    // Rail and trolley.
    rr(g, GX0 + 6, RAIL - 8, GX1 - GX0 - 12, 14, 7)
    g.fillStyle = '#7a80a3'
    g.fill()
    rr(g, claw.x - 34, RAIL - 16, 68, 32, 10)
    g.fillStyle = '#4a4f6e'
    g.fill()
    for (const side of [-1, 1]) {
      g.beginPath()
      g.arc(claw.x + side * 20, RAIL - 1, 8, 0, TAU)
      g.fillStyle = '#dfe4f2'
      g.fill()
    }
    // Chute wall (glass).
    rr(g, WALL_X - WALL_HALF, WALL_TOP - WALL_HALF, WALL_HALF * 2, FLOOR - WALL_TOP + WALL_HALF, 6)
    g.fillStyle = 'rgba(255,255,255,0.75)'
    g.fill()
    g.lineWidth = 3
    g.strokeStyle = 'rgba(70,140,200,0.7)'
    g.stroke()
    // Glass shine and frame.
    g.save()
    rr(g, GX0, GY0, GX1 - GX0, GY1 - GY0, 18)
    g.clip()
    g.fillStyle = 'rgba(255,255,255,0.13)'
    g.beginPath()
    g.moveTo(150, GY0)
    g.lineTo(250, GY0)
    g.lineTo(60, GY1)
    g.lineTo(-40, GY1)
    g.closePath()
    g.fill()
    g.beginPath()
    g.moveTo(290, GY0)
    g.lineTo(330, GY0)
    g.lineTo(140, GY1)
    g.lineTo(100, GY1)
    g.closePath()
    g.fill()
    g.restore()
    rr(g, GX0, GY0, GX1 - GX0, GY1 - GY0, 18)
    g.lineWidth = 9
    g.strokeStyle = '#ffffff'
    g.stroke()
    g.lineWidth = 3
    g.strokeStyle = '#a81f4c'
    rr(g, GX0 - 5, GY0 - 5, GX1 - GX0 + 10, GY1 - GY0 + 10, 22)
    g.stroke()

    // Marquee bulbs chase; they all flash during a party.
    const colors = ['#ffffff', '#ff7ac8', '#5ed3ff', '#5ed36a']
    for (let i = 0; i < 9; i++) {
      for (const side of [0, 1]) {
        const x = side === 0 ? 78 + i * 22 : 792 - i * 22
        const lit = party > 0 || alert > 0 ? Math.floor(t * 10 + i) % 2 === 0 : (i + Math.floor(t * 5)) % 3 === 0
        g.beginPath()
        g.arc(x, i % 2 === 0 ? 42 : 66, 8, 0, TAU)
        g.fillStyle = lit ? colors[(i + wave) % colors.length]! : '#e08a00'
        g.fill()
        if (lit) {
          g.beginPath()
          g.arc(x, i % 2 === 0 ? 42 : 66, 13, 0, TAU)
          g.fillStyle = 'rgba(255,255,255,0.3)'
          g.fill()
        }
      }
    }

    // Joystick leans with the trolley.
    g.save()
    g.translate(190, BTN_Y + 16)
    g.rotate(stick * 0.5)
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(0, -46)
    g.lineWidth = 12
    g.lineCap = 'round'
    g.strokeStyle = '#4a4f6e'
    g.stroke()
    g.beginPath()
    g.arc(0, -52, 22, 0, TAU)
    g.fillStyle = '#4db8ff'
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = '#1f6fb0'
    g.stroke()
    g.beginPath()
    g.arc(-7, -59, 6, 0, TAU)
    g.fillStyle = 'rgba(255,255,255,0.7)'
    g.fill()
    g.restore()

    // The big button: glows when it would drop the claw.
    const press = clamp(btn.value, 0, 1)
    const ready = claw.state === 'idle'
    const glow = ready ? 0.5 + Math.sin(t * 5) * 0.5 : 0
    if (glow > 0) {
      g.beginPath()
      g.ellipse(BTN_X, BTN_Y + 2, 72 + glow * 8, 50 + glow * 6, 0, 0, TAU)
      g.fillStyle = `rgba(255,240,120,${0.18 + glow * 0.2})`
      g.fill()
    }
    g.beginPath()
    g.ellipse(BTN_X, BTN_Y + 12, 58, 36, 0, 0, TAU)
    g.fillStyle = '#8f1230'
    g.fill()
    g.beginPath()
    g.ellipse(BTN_X, BTN_Y - 6 + press * 12, 56, 34, 0, 0, TAU)
    g.fillStyle = ready ? '#ffe14d' : '#ffb02e'
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = '#c47a00'
    g.stroke()
    g.beginPath()
    g.ellipse(BTN_X - 16, BTN_Y - 18 + press * 12, 22, 9, -0.2, 0, TAU)
    g.fillStyle = 'rgba(255,255,255,0.65)'
    g.fill()
    // A down arrow on the button, not a word.
    g.beginPath()
    g.moveTo(BTN_X - 16, BTN_Y - 8 + press * 12)
    g.lineTo(BTN_X, BTN_Y + 8 + press * 12)
    g.lineTo(BTN_X + 16, BTN_Y - 8 + press * 12)
    g.lineWidth = 8
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.strokeStyle = '#c4451c'
    g.stroke()

    // Prize door flap.
    const flap = clamp(door.value, 0, 1)
    rr(g, DOOR_X - 58, DOOR_Y - 38, 116, 80 * (1 - flap * 0.85), 12)
    g.fillStyle = '#ff8fb0'
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = '#a81f4c'
    g.stroke()
    if (flap < 0.4) sprite(g, '🎁', DOOR_X, DOOR_Y + 2, 44)
  }

  const drawShelf = (g: CanvasRenderingContext2D) => {
    const t = stage.time
    for (let i = 0; i < SLOTS; i++) {
      const item = slots[i]
      if (!item) continue
      const [sx, sy] = slotPos(i)
      let hop = 0
      let rot = 0
      let grow = 1
      if (item.trick > 0) {
        const k = item.trick
        if (item.trickKind === 0) hop = Math.sin(k * Math.PI) * 46
        else if (item.trickKind === 1) {
          rot = ease.inOutQuad(k) * TAU
          hop = Math.sin(k * Math.PI) * 18
        } else {
          grow = 1 + Math.sin(k * Math.PI) * 0.4
          rot = Math.sin(k * TAU * 2) * 0.25
        }
      }
      const idle = Math.sin(t * 2 + item.seed) * 0.02
      const [vx, vy] = volume(item.sq.value + idle)
      g.save()
      g.translate(sx, sy + SHELF_R - hop)
      g.scale(vx * grow, vy * grow)
      g.translate(0, -SHELF_R)
      g.rotate(rot)
      const r = item.look.kind === 'plush' ? SHELF_R * 0.84 : item.look.kind === 'item' ? SHELF_R * 0.92 : SHELF_R
      const lookX = clamp((claw.x - sx) / 500, -1, 1)
      drawLook(g, item.look, r, item.trick > 0 ? 'yum' : 'happy', lookX, 0.1, blinkAt(t, item.seed), t, item.seed)
      g.restore()
    }

    // Toy chest.
    const [cx, cy] = volume(chest.value)
    g.save()
    g.translate(CHEST_X, CHEST_Y + 70)
    g.scale(cx, cy)
    g.fillStyle = 'rgba(20,10,50,0.3)'
    g.beginPath()
    g.ellipse(0, 2, 130, 16, 0, 0, TAU)
    g.fill()
    rr(g, -112, -92, 224, 92, 14)
    g.fillStyle = '#b36a2e'
    g.fill()
    g.lineWidth = 6
    g.strokeStyle = '#6e3a12'
    g.stroke()
    // Open lid behind, with toys peeking out once there are some.
    rr(g, -112, -128, 224, 44, 16)
    g.fillStyle = '#d18a45'
    g.fill()
    g.stroke()
    g.fillStyle = '#ffd23f'
    g.fillRect(-14, -96, 28, 30)
    g.strokeRect(-14, -96, 28, 30)
    for (const x of [-70, 70]) {
      g.fillStyle = '#ffd23f'
      g.fillRect(x - 8, -92, 16, 92)
    }
    g.restore()
    if (chestCount > 0) label(g, `${chestCount}`, CHEST_X, CHEST_Y + 36, 40, '#fff3b0')
  }

  const drawRays = (g: CanvasRenderingContext2D, x: number, y: number, r: number, amount: number) => {
    g.save()
    g.translate(x, y)
    g.rotate(stage.time * 1.4)
    g.globalAlpha = 0.5 * amount
    g.fillStyle = '#fff2a8'
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(Math.cos(a - 0.13) * r, Math.sin(a - 0.13) * r)
      g.lineTo(Math.cos(a + 0.13) * r, Math.sin(a + 0.13) * r)
      g.closePath()
      g.fill()
    }
    g.globalAlpha = 1
    g.restore()
  }

  const topPrize = (): Body | null => {
    let best: Body | null = null
    for (const b of bodies) {
      if (b.x > CLAW_MAX || b.x < CLAW_MIN) continue
      if (!best || b.y - b.r < best.y - best.r) best = b
    }
    return best
  }

  return {
    update(dt) {
      if (!(dt > 0.0001)) return
      const t = stage.time
      alert = Math.max(0, alert - dt)
      party = Math.max(0, party - dt)
      chest.update(dt)
      door.update(dt)
      btn.update(dt)

      updateClaw(dt)

      if (!asleep) {
        step(dt / 2, false)
        step(dt / 2, false)
      }
      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i]!
        b.sq.update(dt)
        if (b.moodT > 0) {
          b.moodT -= dt
          if (b.moodT <= 0) b.mood = 'happy'
        }
        // Anything that reaches the chute floor is won, however it got there.
        if (b.x > WALL_X && b.y >= FLOOR - b.r - 1.5) win(b, !b.carried)
      }

      for (const f of floaters) f.wob.update(dt)
      for (const item of slots) {
        if (!item) continue
        item.sq.update(dt)
        if (item.trick > 0) {
          item.trick += dt / 0.6
          if (item.trick >= 1) {
            item.trick = 0
            item.sq.value = 0.8
          }
        }
      }

      // Alive at idle: a plush hops now and then, gold glints.
      if (t > hopAt) {
        hopAt = t + 1.1 + Math.random() * 1.4
        const plush = bodies.filter((b) => b.look.kind === 'plush')
        const who = plush[Math.floor(Math.random() * plush.length)]
        if (who && asleep) who.sq.kick(2.2)
      }
      if (t > sparkleAt) {
        sparkleAt = t + 0.35
        for (const b of bodies) {
          if (!b.look.gold && !b.look.rainbow) continue
          fx.burst(b.x + (Math.random() - 0.5) * b.r * 1.6, b.y + (Math.random() - 0.5) * b.r * 1.6, { count: 1, color: b.look.gold ? '#fff7c2' : '#ffffff', speed: 30, shape: 'star', life: 0.6, size: 13, gravity: 0 })
        }
        const h = claw.held
        if (h && (h.look.gold || h.look.rainbow)) fx.burst(h.x, h.y, { count: 2, color: '#fff7c2', speed: 120, shape: 'star', life: 0.5, size: 12 })
      }

      if (giantDue && claw.state === 'idle') {
        giantDue = false
        spawnGiant()
      }
      const inHeap = bodies.filter((b) => b.x < WALL_X).length + (claw.held ? 1 : 0)
      if (inHeap <= 7 && pouring === 0 && claw.state === 'idle') pour()
    },

    draw(g) {
      const t = stage.time
      g.drawImage(back, 0, 0)

      const [hx, hy] = hub()
      g.save()
      g.beginPath()
      g.rect(GX0, GY0, GX1 - GX0, GY1 - GY0)
      g.clip()
      for (const b of bodies) {
        let mood: Mood = b.mood
        if (b.moodT <= 0) {
          if ((claw.state === 'drop' || claw.state === 'close') && Math.abs(b.x - claw.x) < 130) mood = 'wow'
          else if (alert > 0) mood = 'wow'
        }
        drawBody(g, b, mood, hx, hy + 40)
      }
      drawClaw(g)
      g.restore()

      drawMachineFront(g)
      drawShelf(g)

      for (const f of floaters) {
        if (f.r <= 0.5) continue
        if (f.rays > 0.05) drawRays(g, f.x, f.y, f.r * 2.3, f.rays)
        g.save()
        g.translate(f.x, f.y)
        g.rotate(f.rot + f.wob.value * 0.12)
        g.globalAlpha = clamp(f.alpha, 0, 1)
        if (f.part !== 0) drawCapsule(g, f.look, f.r, t, f.part)
        else drawLook(g, f.look, f.r, f.mood, 0, 0, 0, t, 0)
        g.globalAlpha = 1
        g.restore()
      }

      // Hints: tap to hold on during a slip; otherwise point at a prize.
      if (claw.state === 'slip' && !savedOnce) {
        hint(g, hx, hy + 60, t, 95)
      } else if (t - lastTouch > 5 && claw.state === 'idle' && floaters.length === 0) {
        const b = topPrize()
        if (b) hint(g, b.x, b.y, t, b.r + 12)
      }
    },

    down(p: Pointer) {
      lastTouch = stage.time
      // Shelf prizes do a trick.
      for (let i = 0; i < SLOTS; i++) {
        const item = slots[i]
        if (!item) continue
        const [sx, sy] = slotPos(i)
        if (dist(p.x, p.y, sx, sy) < 60) {
          trick(i, item)
          return
        }
      }
      if (p.x > 846 && p.y > CHEST_Y - 70) {
        chest.value = 0.75
        sfx.coin(chestCount % 6)
        sfx.thud(0.4)
        fx.burst(CHEST_X, CHEST_Y - 40, { count: 10, color: ['#ffe14d', '#ffffff', '#ff7ac8'], speed: 320, shape: 'star', life: 0.6, size: 12, angle: -Math.PI / 2, spread: 1.4 })
        return
      }
      if (p.x > 836) {
        // The empty shelf: a knock and a twinkle.
        fx.ring(p.x, p.y, '#ffd23f', 50, 0.3)
        fx.burst(p.x, p.y, { count: 5, color: '#ffe14d', speed: 160, shape: 'star', life: 0.4, size: 10 })
        sfx.tone({ freq: 240, to: 180, dur: 0.07, type: 'triangle', vol: 0.2 })
        sfx.note(Math.floor(p.y / 120), 0.08, 'sine', 0.1)
        return
      }
      const onButton = dist(p.x, p.y, BTN_X, BTN_Y) < 74
      if (onButton) {
        btn.value = 1
        sfx.tone({ freq: 520, to: 300, dur: 0.06, type: 'square', vol: 0.12 })
        fx.ring(BTN_X, BTN_Y, '#ffe14d', 80, 0.3)
      }
      if (claw.state === 'slip') {
        saveSlip()
        return
      }
      if (claw.state !== 'idle') {
        squeeze(p)
        return
      }
      if (onButton) {
        claw.tx = clamp(claw.x, CLAW_MIN, CLAW_MAX)
        claw.pendingDrop = true
        return
      }
      claw.followId = p.id
      claw.tx = clamp(p.x, CLAW_MIN, CLAW_MAX)
      claw.pendingDrop = false
      claw.grip.kick(-5)
      alert = 0.35
      fx.ring(p.x, p.y, '#ffffff', 50, 0.3)
      sfx.tone({ freq: 330, to: 520, dur: 0.09, type: 'triangle', vol: 0.16 })
    },

    move(p: Pointer) {
      if (!p.down) return
      if (claw.followId === null && claw.state === 'idle' && !claw.pendingDrop && p.x < 836 && p.y < 655 && stage.time - p.downAt > 0.15) {
        // A finger that stayed down through the last grab takes the claw again.
        claw.followId = p.id
      }
      if (p.id === claw.followId && claw.state === 'idle') {
        claw.tx = clamp(p.x, CLAW_MIN, CLAW_MAX)
        lastTouch = stage.time
      }
    },

    up(p: Pointer) {
      if (p.id !== claw.followId) return
      claw.followId = null
      if (claw.state === 'idle') claw.pendingDrop = true
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'claw-machine',
    name: 'Claw Machine',
    emoji: '🕹️',
    ages: [4, 9],
    pitch: 'Slide the claw over a heap of plush toys and capsules, let go, and watch it haul a prize up to the chute.',
    howTo: 'Drag to slide the claw, lift your finger to drop it. Tap when a heavy prize slips. Tap shelf prizes for a trick.',
    basedOn: 'arcade claw machines and gacha capsules',
    whyFun: 'The wait on the way up is the suspense; capsules hide surprises, gold ones are buried, and the shelf fills.',
  },
  create,
}
