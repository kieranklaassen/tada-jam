// Leaf Creatures: an autumn clearing drawn in wax crayon. The child lays
// leaves, twigs, wings and seeds together on the bare earth, gives the thing
// acorn-cap eyes, and strokes the air. The wind children come through, and
// what was laid down wakes as itself: twig legs scuttle, wings lift it, a long
// leaf slithers, a round one rolls. It explores, follows a finger, plays with
// the ones made before it, and beds down under a fern.
//
// Nothing is scored, timed or asked for. Pieces rest where they are put.

import { clamp, damp, ease, lerp, rnd, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { EARTH, KINDS, SPOTS, drawSprite, makeArt } from './art.ts'
import type { Cls, Kind, Sprite } from './art.ts'
import { drawCreature, makeCreature } from './creature.ts'
import type { Creature, Gait } from './creature.ts'

type G = CanvasRenderingContext2D

const FLOOR_TOP = 286
const FLOOR_BOTTOM = 750
const AIR = 188
const AWAKE_S = 0.86
const SLEEP_S = 0.7
const MAX_CREATURES = 4
const SPEED: Record<Gait, number> = { fly: 125, scuttle: 140, walk: 82, slither: 92, roll: 112, hop: 92 }

interface Home {
  kind: Kind
  variant: number
  x: number
  y: number
  rot: number
}

// Where each treasure lies when the clearing is fresh: leaves drifted to the
// sides, twigs and nuts along the near edge, the acorn caps in pairs nearest
// the earth.
const SUPPLY: [Kind, number, number, number, number][] = [
  ['maple', 0, 108, 352, 0.6],
  ['oak', 0, 256, 328, -0.25],
  ['maple', 1, 224, 434, -2.5],
  ['oak', 1, 98, 488, 1.9],
  ['aspen', 0, 384, 316, 1.0],
  ['maple', 2, 232, 546, 0.25],
  ['oak', 2, 102, 598, -0.5],
  ['feather', 0, 256, 650, -0.35],
  ['feather', 1, 150, 676, 0.2],
  ['feather', 2, 326, 600, -0.9],
  ['wing', 0, 398, 634, -0.4],
  ['wing', 1, 452, 672, 0.5],
  ['beech', 0, 1074, 350, 2.6],
  ['willow', 0, 940, 326, 3.4],
  ['beech', 1, 962, 428, -0.6],
  ['willow', 1, 1090, 456, 1.3],
  ['aspen', 1, 802, 314, 2.0],
  ['beech', 2, 1070, 552, 0.4],
  ['willow', 2, 950, 524, 2.9],
  ['wing', 0, 902, 636, 0.3],
  ['wing', 1, 962, 668, -0.5],
  ['berry', 0, 1046, 644, 0.2],
  ['berry', 1, 1112, 618, 2.4],
  ['berry', 0, 1104, 700, -1.2],
  ['seed', 0, 836, 652, -2.3],
  ['seed', 1, 1010, 598, 0.5],
  ['twig', 0, 130, 716, -0.2],
  ['twig', 1, 206, 738, 0.12],
  ['twig', 2, 276, 708, 0.4],
  ['twig', 0, 152, 744, 0.05],
  ['twig', 1, 332, 740, -0.3],
  ['twig', 2, 392, 716, 0.2],
  ['twig', 0, 258, 746, -0.1],
  ['twig', 2, 414, 744, 0.3],
  ['cap', 0, 500, 704, 0],
  ['cap', 1, 550, 708, 0.8],
  ['cap', 1, 608, 730, 2],
  ['cap', 0, 658, 726, 3],
  ['cap', 0, 564, 744, 1.2],
  ['cap', 1, 704, 740, 4],
  ['acorn', 0, 744, 712, 0.4],
  ['acorn', 1, 790, 738, -0.6],
  ['conker', 0, 840, 710, 0],
  ['conker', 1, 886, 736, 1],
  ['conker', 0, 800, 690, 2],
  ['cone', 0, 960, 718, 0.3],
  ['cone', 1, 1042, 734, -0.4],
]

interface Piece {
  id: number
  slot: number
  kind: Kind
  variant: number
  x: number
  y: number
  rot: number
  lift: Spring
  wob: Spring
  sq: Spring
  held: boolean
  onEarth: boolean
  // The sleeping creature it is part of while it lies on the earth, or -1.
  group: number
  gx: number
  gy: number
  eye: number
  glint: number
  // Falling from the trees: seconds left, and the path.
  fall: number
  fallDur: number
  fx0: number
  fy0: number
  hx: number
  hy: number
  hrot: number
  fsway: number
  fspin: number
  gusted: boolean
}

interface Drag {
  kind: 'drag'
  piece: Piece
  ox: number
  oy: number
  // Length of the trail when held by an end, 0 when held by the middle.
  r: number
  moved: number
  rustle: number
}

interface Stroke {
  kind: 'stroke'
  // Recent samples [seconds, x, y], to tell a stroke from a slow lead.
  path: [number, number, number][]
  moved: number
  trail: number
  called: boolean
  x: number
  y: number
}

interface Mote {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  life: number
  max: number
  size: number
  spr: number
  g: number
  sway: number
}

interface Swirl {
  x: number
  y: number
  rot: number
  life: number
  size: number
}

interface Breeze {
  t: number
  dir: number
  y: number
  // When the leading wind child reaches the earth, if a creature waits there.
  reach: number
  wakes: boolean
  woke: boolean
  fell: boolean
  refill: number[]
  kids: { y: number; lag: number; ph: number; s: number }[]
  streaks: { y: number; lag: number; s: number }[]
}

const WIND_SPEED = 640
// The leading wind child circles what it wakes, this wide and this long.
const RING_X = 176
const RING_Y = 104
const RING_S = 2.1

function ptSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  const t = l2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0
  return Math.hypot(px - ax - dx * t, py - ay - dy * t)
}

function side(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
}

// How far apart two pieces lie, treating each as a rounded bar.
function gap(a: Piece, b: Piece): number {
  const da = KINDS[a.kind]
  const db = KINDS[b.kind]
  const ha = Math.max(0, da.len - da.wid)
  const hb = Math.max(0, db.len - db.wid)
  const a0x = a.x - Math.cos(a.rot) * ha
  const a0y = a.y - Math.sin(a.rot) * ha
  const a1x = a.x + Math.cos(a.rot) * ha
  const a1y = a.y + Math.sin(a.rot) * ha
  const b0x = b.x - Math.cos(b.rot) * hb
  const b0y = b.y - Math.sin(b.rot) * hb
  const b1x = b.x + Math.cos(b.rot) * hb
  const b1y = b.y + Math.sin(b.rot) * hb
  let d: number
  if (side(b0x, b0y, b1x, b1y, a0x, a0y) * side(b0x, b0y, b1x, b1y, a1x, a1y) < 0 && side(a0x, a0y, a1x, a1y, b0x, b0y) * side(a0x, a0y, a1x, a1y, b1x, b1y) < 0) d = 0
  else d = Math.min(ptSeg(a0x, a0y, b0x, b0y, b1x, b1y), ptSeg(a1x, a1y, b0x, b0y, b1x, b1y), ptSeg(b0x, b0y, a0x, a0y, a1x, a1y), ptSeg(b1x, b1y, a0x, a0y, a1x, a1y))
  return d - da.wid - db.wid
}

function inEarth(x: number, y: number, k = 1): boolean {
  return ((x - EARTH.x) / (EARTH.rx * k)) ** 2 + ((y - EARTH.y) / (EARTH.ry * k)) ** 2 <= 1
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const art = makeArt(Math.floor(stage.rand() * 1000) + 1)

  const pieces: Piece[] = []
  const creatures: Creature[] = []
  const motes: Mote[] = []
  const swirls: Swirl[] = []
  const held = new Map<number, Drag | Stroke>()
  // Slots whose treasure has gone into a creature; the next wind brings more.
  let missing: number[] = []
  let breeze: Breeze | null = null
  let nextId = 1
  let lastTouch = 0
  let lastSound = 0
  let groups = 0
  let building = false
  let capsOnEarth = 0
  let follow: { x: number; y: number } | null = null
  let gust = 0
  const gustSpring = spring(0, 30, 3.2)
  let stirIn = 3
  let hintIn = 0
  let driftIn = 4

  const homes: Home[] = SUPPLY.map(([kind, variant, x, y, rot]) => ({
    kind,
    variant,
    x: x + (stage.rand() - 0.5) * 14,
    y: y + (stage.rand() - 0.5) * 10,
    rot: rot + (stage.rand() - 0.5) * 0.3,
  }))

  const makePiece = (slot: number): Piece => {
    const h = homes[slot]!
    return {
      id: nextId++,
      slot,
      kind: h.kind,
      variant: h.variant,
      x: h.x,
      y: h.y,
      rot: h.rot,
      lift: spring(0, 260, 20),
      wob: spring(0, 90, 7),
      sq: spring(1, 300, 14),
      held: false,
      onEarth: false,
      group: -1,
      gx: 0,
      gy: 0,
      eye: 0,
      glint: 0,
      fall: 0,
      fallDur: 0,
      fx0: 0,
      fy0: 0,
      hx: h.x,
      hy: h.y,
      hrot: h.rot,
      fsway: 0,
      fspin: 0,
      gusted: false,
    }
  }
  homes.forEach((_, i) => pieces.push(makePiece(i)))

  // ------------------------------------------------------------ sound

  // Each is the sound of the thing itself, kept low.
  const quiet = (min: number): boolean => {
    if (stage.time - lastSound < min) return false
    lastSound = stage.time
    return true
  }

  const touchSound = (cls: Cls, down: boolean): void => {
    const v = down ? 1 : 0.8
    switch (cls) {
      case 'leaf':
        sfx.noise({ dur: down ? 0.1 : 0.07, freq: 3400, vol: 0.055 * v, filter: 'highpass' })
        sfx.noise({ dur: 0.05, freq: 1800, vol: 0.03 * v, delay: 0.04, q: 2 })
        break
      case 'stick':
        sfx.tone({ freq: rnd(820, 960), to: 600, dur: 0.035, type: 'triangle', vol: 0.07 * v })
        if (down) sfx.tone({ freq: rnd(520, 600), to: 420, dur: 0.04, type: 'triangle', vol: 0.05, delay: 0.05 })
        break
      case 'eye':
        sfx.tone({ freq: rnd(640, 700), to: 500, dur: 0.05, type: 'sine', vol: 0.08 * v })
        break
      case 'nut':
        sfx.tone({ freq: rnd(230, 260), to: 170, dur: 0.08, type: 'sine', vol: 0.11 * v })
        sfx.noise({ dur: 0.04, freq: 500, vol: 0.05 * v, filter: 'lowpass' })
        break
      case 'cone':
        for (let i = 0; i < 3; i++) sfx.noise({ dur: 0.03, freq: 1600 + i * 300, vol: 0.05 * v, q: 3, delay: i * 0.03 })
        break
      case 'wingy':
        sfx.noise({ dur: 0.1, freq: 5200, vol: 0.04 * v, filter: 'highpass' })
        break
      case 'berry':
        sfx.tone({ freq: rnd(500, 560), to: 700, dur: 0.05, type: 'sine', vol: 0.06 * v })
        break
      case 'fluff':
        sfx.noise({ dur: 0.16, freq: 4200, to: 2200, vol: 0.035 * v, filter: 'highpass' })
        break
    }
  }

  const voice = (c: Creature, rising = false, vol = 0.06): void => {
    const f = sfx.scale(c.voice)
    sfx.tone({ freq: f, to: f * (rising ? 1.122 : 1.02), dur: 0.34, type: 'sine', vol, attack: 0.05 })
    if (rising) sfx.tone({ freq: f * 1.5, dur: 0.4, type: 'sine', vol: vol * 0.5, attack: 0.06, delay: 0.26 })
  }

  // ------------------------------------------------------------ small things in the air

  const mote = (x: number, y: number, vx: number, vy: number, life: number, size = 1, g = 60): void => {
    if (motes.length > 70) return
    motes.push({ x, y, vx, vy, rot: rnd(0, TAU), spin: rnd(-4, 4), life, max: life, size, spr: Math.floor(Math.random() * art.motes.length), g, sway: rnd(0, TAU) })
  }

  const litter = (x: number, y: number, n: number): void => {
    for (let i = 0; i < n; i++) mote(x + rnd(-14, 14), y + rnd(-6, 6), rnd(-70, 70), rnd(-120, -40), rnd(0.5, 0.9), rnd(0.6, 0.9), 320)
  }

  const swirl = (x: number, y: number, size = 1): void => {
    if (swirls.length > 40) swirls.shift()
    swirls.push({ x, y, rot: rnd(0, TAU), life: 0.7, size })
  }

  // ------------------------------------------------------------ the earth and what lies on it

  // Work out which things on the earth lie together, and which of those
  // heaps have eyes: each of those is a creature asleep, waiting for the wind.
  const regroup = (): void => {
    const on = pieces.filter((p) => p.onEarth && !p.held && p.fall <= 0)
    for (const p of pieces) p.group = -1
    building = on.length > 0
    capsOnEarth = on.filter((p) => p.kind === 'cap').length
    const parent = on.map((_, i) => i)
    const find = (i: number): number => {
      while (parent[i]! !== i) {
        parent[i] = parent[parent[i]!]!
        i = parent[i]!
      }
      return i
    }
    for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) if (gap(on[i]!, on[j]!) < 30) parent[find(i)] = find(j)
    const roots = [...new Set(on.map((_, i) => find(i)))]
    const eyed = roots.filter((root) => on.some((p, i) => p.kind === 'cap' && find(i) === root))
    // A loose thing near a creature belongs to it.
    for (const root of roots) {
      if (eyed.includes(root)) continue
      let best = -1
      let bestGap = 150
      on.forEach((p, i) => {
        if (find(i) !== root) return
        on.forEach((q, j) => {
          const rj = find(j)
          if (!eyed.includes(rj)) return
          const d = gap(p, q)
          if (d < bestGap) {
            bestGap = d
            best = rj
          }
        })
      })
      if (best >= 0) parent[root] = best
    }
    groups = 0
    for (const root of eyed) {
      const members = on.filter((_, i) => find(i) === find(root))
      if (members.length === 0 || members[0]!.group >= 0) continue
      let sx = 0
      let sy = 0
      for (const m of members) {
        sx += m.x
        sy += m.y
      }
      for (const m of members) {
        m.group = groups
        m.gx = sx / members.length
        m.gy = sy / members.length
      }
      groups++
    }
  }

  const pieceAt = (x: number, y: number, earthOnly: boolean): Piece | null => {
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i]!
      if (p.held || p.fall > 0 || (earthOnly && !p.onEarth)) continue
      const d = KINDS[p.kind]
      const dx = x - p.x
      const dy = y - p.y
      const c = Math.cos(p.rot)
      const s = Math.sin(p.rot)
      const lx = dx * c + dy * s
      const ly = -dx * s + dy * c
      if ((lx / (d.len + 16)) ** 2 + (ly / (Math.max(d.wid, 24) + 16)) ** 2 <= 1) return p
    }
    return null
  }

  const creatureAt = (x: number, y: number, k: number): Creature | null => {
    let best: Creature | null = null
    let bestD = Infinity
    for (const c of creatures) {
      if (c.state === 'leaving') continue
      const d = Math.hypot(x - c.x, y - (c.y - c.alt))
      if (d < Math.max(54, c.R * c.s * k) && d < bestD) {
        best = c
        bestD = d
      }
    }
    return best
  }

  const settle = (p: Piece): void => {
    // Keep it on the floor: slide it gently back if it was let go off the edge
    // or up among the trees.
    const tx = clamp(p.x, 44, W - 44)
    const ty = clamp(p.y, FLOOR_TOP, FLOOR_BOTTOM)
    if (tx !== p.x || ty !== p.y) {
      const x0 = p.x
      const y0 = p.y
      stage.tween(0.35, (t) => {
        if (p.held) return
        p.x = lerp(x0, tx, t)
        p.y = lerp(y0, ty, t)
      })
    }
    const was = p.onEarth
    p.onEarth = inEarth(tx, ty, 1.02)
    const cls = KINDS[p.kind].cls
    touchSound(cls, false)
    p.sq.value = 0.88
    if (p.onEarth) {
      sfx.noise({ dur: 0.07, freq: 280, vol: 0.06, filter: 'lowpass' })
      fx.burst(tx, ty + 6, { count: 4, color: ['#573727', '#7c4c2d', '#c99a40'], speed: 70, life: 0.35, size: 3.5, gravity: 420, angle: -Math.PI / 2, spread: Math.PI })
      if (p.kind === 'cap' && !was) sfx.note(-3, 0.5, 'sine', 0.05)
    } else {
      litter(tx, ty, 2)
    }
    if (cls === 'fluff') fx.burst(p.x, p.y - 10, { count: 5, color: '#fffdf4', speed: 40, life: 1.1, size: 3, gravity: -30, drag: 0.94 })
    regroup()
  }

  // ------------------------------------------------------------ creatures

  const awake = (c: Creature): boolean => c.state === 'wander' || c.state === 'pause' || c.state === 'follow' || c.state === 'orbit'

  const blink = (c: Creature): void => {
    c.blinkT = 0.17
  }

  const bedFor = (c: Creature): number => {
    for (let i = 0; i < SPOTS.length; i++) {
      // Nearest free bed first would cross paths; take them in turn instead.
      const k = (i + c.id) % SPOTS.length
      if (!creatures.some((o) => o !== c && o.spot === k)) return k
    }
    return -1
  }

  const rouse = (c: Creature): void => {
    if (c.state !== 'sleep' && c.state !== 'toSleep') return
    c.state = 'rousing'
    c.t = 0
    c.eyesOpen = true
    c.lidRate = 3
    c.spot = -1
    c.sTo = AWAKE_S
    c.errands = 0
    c.wiggle.kick(1.6)
    voice(c, false, 0.045)
  }

  const leave = (c: Creature): void => {
    c.state = 'leaving'
    c.t = 0
    c.eyesOpen = true
    c.lidRate = 3
    c.spot = -1
    c.tx = clamp(c.x + (c.id % 2 ? 60 : -60), 330, 850)
    c.ty = 168
    c.sTo = 0.42
  }

  const wakeGroup = (group: number): void => {
    const members = pieces.filter((p) => p.group === group)
    if (members.length === 0) return
    const c = makeCreature(nextId++, members, Math.random)
    c.voice = Math.round(lerp(4, -6, clamp((c.R - 50) / 190, 0, 1)))
    for (const m of members) {
      missing.push(m.slot)
      pieces.splice(pieces.indexOf(m), 1)
    }
    creatures.push(c)
    const living = creatures.filter((o) => o.state !== 'leaving')
    if (living.length > MAX_CREATURES) leave(living[0]!)
  }

  const moveToward = (c: Creature, tx: number, ty: number, mul: number, dt: number, near = 8): boolean => {
    let dx = tx - c.x
    let dy = ty - c.y
    const d = Math.hypot(dx, dy)
    if (d < near) {
      c.moving = false
      return true
    }
    dx /= d
    dy /= d
    // While something is being laid out, the others keep off the earth.
    if (building && (c.state === 'wander' || c.state === 'orbit' || c.state === 'toSleep')) {
      const kx = EARTH.rx + c.hw * c.s * 0.6 + 14
      const ky = EARTH.ry + c.hh * c.s * 0.6 + 14
      const ex = (c.x - EARTH.x) / kx
      const ey = (c.y - EARTH.y) / ky
      const q = ex * ex + ey * ey
      if (q < 1.12) {
        const nl = Math.hypot(ex / kx, ey / ky) || 1
        const nx = ex / kx / nl
        const ny = ey / ky / nl
        const inward = dx * nx + dy * ny
        if (inward < 0) {
          dx -= nx * inward
          dy -= ny * inward
          const turn = -ny * dx + nx * dy >= 0 ? 1 : -1
          dx += -ny * turn * 0.7
          dy += nx * turn * 0.7
        }
        if (q < 1) {
          dx += nx * (1 - q) * 4
          dy += ny * (1 - q) * 4
        }
        const l = Math.hypot(dx, dy) || 1
        dx /= l
        dy /= l
      }
    }
    const sp = SPEED[c.gait] * mul
    c.moving = true
    if (c.head !== 0 && c.gait !== 'roll' && Math.abs(dx) > 0.3) c.flipTo = (dx > 0 ? 1 : -1) * c.head
    c.lookX = damp(c.lookX, dx, 5, dt)
    c.lookY = damp(c.lookY, dy, 5, dt)
    let step = Math.min(sp * dt, d)
    if (c.gait === 'hop') {
      c.phase += dt / 0.66
      if (c.phase >= 1) c.phase -= 1
      if (c.phase < 0.62) {
        step = Math.min((sp / 0.62) * dt, d)
        c.alt = Math.sin((c.phase / 0.62) * Math.PI) * 34
      } else {
        step = 0
        if (c.alt > 0) land(c)
        c.alt = 0
      }
    }
    c.x = clamp(c.x + dx * step, 40, W - 40)
    c.y = clamp(c.y + dy * step, 150, H - 70)
    if (c.gait === 'roll') {
      const before = Math.floor(c.roll / Math.PI)
      c.roll += ((dx >= 0 ? 1 : -1) * step) / Math.max(30, c.R * c.s * 0.8)
      if (Math.floor(c.roll / Math.PI) !== before) sfx.tone({ freq: rnd(130, 150), to: 95, dur: 0.07, type: 'sine', vol: 0.05 })
    }
    return false
  }

  const land = (c: Creature): void => {
    c.squash.value = 0.86
    sfx.noise({ dur: 0.07, freq: 3200, vol: 0.04, filter: 'highpass' })
    if (Math.random() < 0.5) litter(c.x, c.y + c.hh * c.s * 0.5, 1)
  }

  const nextErrand = (c: Creature): void => {
    c.friend = null
    c.nose = -1
    if (c.errands >= c.tire) {
      const bed = bedFor(c)
      if (bed >= 0) {
        c.spot = bed
        c.state = 'toSleep'
        c.t = 0
        c.tx = SPOTS[bed]![0]
        c.ty = SPOTS[bed]![1] + 40
        return
      }
    }
    const others = creatures.filter((o) => o !== c && awake(o))
    const r = Math.random()
    c.state = 'wander'
    c.t = 0
    if (others.length > 0 && (c.errands === 0 || r < 0.3)) {
      c.friend = others[Math.floor(Math.random() * others.length)]!
      return
    }
    const loose = pieces.filter((p) => !p.onEarth && !p.held && p.fall <= 0)
    if (loose.length > 0 && r < 0.78) {
      const p = loose[Math.floor(Math.random() * loose.length)]!
      c.nose = p.id
      const ax = c.x - p.x
      const ay = c.y - p.y
      const l = Math.hypot(ax, ay) || 1
      const off = c.R * c.s * 0.5 + 26
      c.tx = clamp(p.x + (ax / l) * off, 60, W - 60)
      c.ty = clamp(p.y + (ay / l) * off * 0.6, FLOOR_TOP, FLOOR_BOTTOM - 20)
      return
    }
    for (let i = 0; i < 8; i++) {
      c.tx = rnd(90, W - 90)
      c.ty = rnd(FLOOR_TOP + 20, FLOOR_BOTTOM - 40)
      if (!building || !inEarth(c.tx, c.ty, 1.3)) break
    }
  }

  const arrive = (c: Creature): void => {
    c.errands++
    c.t = 0
    if (c.friend && awake(c.friend)) {
      const f = c.friend
      c.state = 'orbit'
      c.orbit = Math.atan2(c.y - f.y, c.x - f.x)
      c.wiggle.kick(1.8)
      f.wiggle.kick(-1.6)
      blink(c)
      blink(f)
      voice(c, false, 0.05)
      stage.after(0.32, () => voice(f, false, 0.05))
      return
    }
    c.state = 'pause'
    c.pause = rnd(0.9, 2)
    const p = c.nose >= 0 ? pieces.find((q) => q.id === c.nose) : undefined
    if (p && !p.held) {
      p.wob.kick((c.x < p.x ? 1 : -1) * 2.4)
      p.lift.kick(3)
      touchSound(KINDS[p.kind].cls, true)
      c.squash.value = 0.94
      c.pause = rnd(1.2, 2.2)
      blink(c)
    }
  }

  const think = (c: Creature, dt: number): void => {
    switch (c.state) {
      case 'waking': {
        const t = c.t
        const before = t - dt
        // Lifted on the wind, eyes opening, set down, then a first stretch.
        const up = t < 1.4 ? ease.outCubic(clamp((t - 0.05) / 0.7, 0, 1)) : 1 - ease.inOutQuad(clamp((t - 1.4) / 0.5, 0, 1))
        if (c.gait !== 'fly' || t < 1.4) c.alt = up * 38
        c.tilt = Math.sin(t * 5.2) * 0.085 * up
        if (before < 0.9 && t >= 0.9) {
          c.eyesOpen = true
          c.lidRate = 2.2
          voice(c, true)
        }
        if (before < 1.95 && t >= 1.95) {
          if (c.gait !== 'fly') {
            c.squash.value = 0.88
            sfx.noise({ dur: 0.08, freq: 3000, vol: 0.04, filter: 'highpass' })
          }
          blink(c)
        }
        if (before < 2.3 && t >= 2.3) blink(c)
        c.stretch = t > 2.05 && t < 3.0
        if (c.stretch) {
          const u = (t - 2.05) / 0.95
          if (c.gait === 'hop') c.alt = Math.sin(clamp(u * 1.8, 0, 1) * Math.PI) * 30
          if (c.gait === 'roll') c.tilt = Math.sin(u * TAU) * 0.32 * (1 - u)
        }
        if (t >= 3.05) {
          c.stretch = false
          c.tilt = 0
          c.state = 'pause'
          c.pause = 0.25
          c.sTo = AWAKE_S
        }
        break
      }
      case 'pause':
        c.moving = false
        if (follow) {
          c.state = 'follow'
          c.t = 0
          break
        }
        c.pause -= dt
        if (c.pause <= 0) nextErrand(c)
        break
      case 'wander': {
        if (follow) {
          c.state = 'follow'
          c.t = 0
          break
        }
        if (c.friend) {
          const f = c.friend
          if (!awake(f)) {
            c.friend = null
            c.state = 'pause'
            c.pause = 0.3
            break
          }
          const ax = c.x - f.x
          const ay = c.y - f.y
          const l = Math.hypot(ax, ay) || 1
          const off = (c.R * c.s + f.R * f.s) * 0.62
          c.tx = f.x + (ax / l) * off
          c.ty = f.y + (ay / l) * off
        }
        if (moveToward(c, c.tx, c.ty, 1, dt, c.friend ? 16 : 10) || c.t > 14) arrive(c)
        break
      }
      case 'follow': {
        if (!follow) {
          c.state = 'pause'
          c.pause = 0.8
          c.errands = Math.max(0, c.errands - 2)
          break
        }
        const ax = c.x - follow.x
        const ay = c.y - follow.y
        const l = Math.hypot(ax, ay) || 1
        const off = c.R * c.s * 0.55 + 30
        const there = moveToward(c, follow.x + (ax / l) * off, follow.y + (ay / l) * off, 1.3, dt, 12)
        if (there) {
          c.lookX = damp(c.lookX, -ax / l, 6, dt)
          c.lookY = damp(c.lookY, -ay / l, 6, dt)
          if (c.t > 1.5) {
            c.t = 0
            c.wiggle.kick(1.2 * (Math.random() < 0.5 ? 1 : -1))
            blink(c)
          }
        }
        break
      }
      case 'orbit': {
        const f = c.friend
        if (!f || !awake(f) || c.t > 3.2) {
          c.friend = null
          c.state = 'pause'
          c.pause = rnd(0.5, 1.2)
          break
        }
        c.orbit += dt * 1.6
        const rad = (c.R * c.s + f.R * f.s) * 0.62
        moveToward(c, f.x + Math.cos(c.orbit) * rad, f.y + Math.sin(c.orbit) * rad * 0.7, 1.35, dt, 4)
        f.lookX = damp(f.lookX, clamp((c.x - f.x) / 120, -1, 1), 5, dt)
        f.lookY = damp(f.lookY, clamp((c.y - f.y) / 120, -1, 1), 5, dt)
        break
      }
      case 'toSleep': {
        const far = Math.hypot(c.tx - c.x, c.ty - c.y)
        if (far < 170) c.sTo = SLEEP_S
        if (moveToward(c, c.tx, c.ty, 0.9, dt, 8)) {
          c.state = 'sleep'
          c.t = 0
          c.eyesOpen = false
          c.lidRate = 1.2
          c.squash.value = 0.92
          sfx.note(c.voice - 5, 0.6, 'sine', 0.04)
        }
        break
      }
      case 'sleep':
        c.moving = false
        if (c.t > c.pause) {
          c.t = 0
          c.pause = rnd(7, 13)
          c.wiggle.kick(rnd(-0.5, 0.5))
        }
        break
      case 'rousing':
        c.moving = false
        if (c.t > 0.9) {
          blink(c)
          c.state = 'pause'
          c.pause = 0.2
        }
        break
      case 'leaving':
        moveToward(c, c.tx, c.ty, 0.9, dt, 6)
        c.alpha = clamp((c.y - 176) / 60, 0, 1)
        break
    }
  }

  const updateCreature = (c: Creature, dt: number): void => {
    c.t += dt
    think(c, dt)
    c.wiggle.update(dt)
    c.squash.update(dt)
    c.s = damp(c.s, c.sTo, 2.2, dt)
    c.calm = damp(c.calm, c.state === 'sleep' ? 0.3 : 1, 2, dt)

    // Eyes.
    if (c.blinkT > 0) c.blinkT -= dt
    if (c.eyesOpen && c.state !== 'waking') {
      c.blinkIn -= dt
      if (c.blinkIn <= 0) {
        blink(c)
        c.blinkIn = rnd(2.4, 6)
      }
    }
    const lidTo = !c.eyesOpen || c.blinkT > 0.08 ? 1 : 0
    const rate = c.blinkT > 0 ? 16 : c.lidRate
    c.lid = lidTo > c.lid ? Math.min(lidTo, c.lid + rate * dt) : Math.max(lidTo, c.lid - rate * dt)
    if (!c.moving) {
      c.lookX = damp(c.lookX, 0, 1.2, dt)
      c.lookY = damp(c.lookY, 0, 1.2, dt)
    }
    c.flip = c.flipTo > c.flip ? Math.min(c.flipTo, c.flip + 7 * dt) : Math.max(c.flipTo, c.flip - 7 * dt)

    // The gait, each with the small sound of its own parts.
    const active = c.moving || c.stretch
    c.move = damp(c.move, active ? 1 : 0, 9, dt)
    const before = c.phase
    switch (c.gait) {
      case 'walk':
        if (active) c.phase += dt * 7.5
        if (Math.floor(c.phase / Math.PI) !== Math.floor(before / Math.PI)) sfx.tone({ freq: rnd(700, 900), to: 480, dur: 0.03, type: 'triangle', vol: 0.035 })
        break
      case 'scuttle':
        if (active) c.phase += dt * 17
        if (Math.floor(c.phase / TAU) !== Math.floor(before / TAU)) {
          sfx.tone({ freq: rnd(900, 1100), to: 620, dur: 0.022, type: 'triangle', vol: 0.024 })
          sfx.tone({ freq: rnd(800, 1000), to: 560, dur: 0.022, type: 'triangle', vol: 0.02, delay: 0.07 })
        }
        break
      case 'slither':
        if (active) c.phase -= dt * 7.5
        if (active && stage.time - c.cue > 0.9) {
          c.cue = stage.time
          sfx.noise({ dur: 0.3, freq: 2600, to: 1800, vol: 0.028, q: 1.5 })
        }
        break
      case 'fly': {
        const aloft = c.state !== 'waking' && (c.moving || c.state === 'follow' || c.state === 'orbit')
        if (c.state !== 'waking' || c.t > 1.4) c.alt = damp(c.alt, aloft || c.stretch ? 62 : c.state === 'waking' ? 38 : 0, 2.4, dt)
        c.flapAmp = damp(c.flapAmp, aloft || c.stretch || (c.state === 'waking' && c.t > 0.9) ? 1 : 0, 4, dt)
        const f0 = c.flap
        c.flap += dt * lerp(3, 17, c.flapAmp)
        if (c.flapAmp > 0.5 && Math.floor(c.flap / TAU) !== Math.floor(f0 / TAU) && stage.time - c.cue > 0.21) {
          c.cue = stage.time
          sfx.noise({ dur: 0.07, freq: 2600, vol: 0.03, filter: 'highpass' })
        }
        break
      }
      case 'roll':
        if (!c.moving) c.roll = damp(c.roll, Math.round(c.roll / TAU) * TAU, 2.5, dt)
        break
      case 'hop':
        if (!c.moving && !c.stretch && c.state !== 'waking' && c.alt > 0) {
          c.alt = Math.max(0, c.alt - 220 * dt)
          if (c.alt === 0) land(c)
          c.phase = 0.62
        }
        break
    }
  }

  // ------------------------------------------------------------ the wind

  const callBreeze = (dir: number, y: number): void => {
    if (breeze) return
    regroup()
    const refill = missing
    missing = []
    breeze = {
      t: 0,
      dir,
      y: clamp(y, 230, 620),
      reach: Math.abs(EARTH.x - dir * RING_X - (dir > 0 ? -160 : W + 160)) / WIND_SPEED,
      wakes: groups > 0,
      woke: false,
      fell: false,
      refill,
      kids: [
        { y: 200 + rnd(0, 50), lag: 210, ph: rnd(0, TAU), s: 0.85 },
        { y: 610 + rnd(0, 70), lag: 360, ph: rnd(0, TAU), s: 0.95 },
      ],
      streaks: [
        { y: 150, lag: 60, s: 1 },
        { y: 360, lag: 250, s: 1.15 },
        { y: 540, lag: 130, s: 0.9 },
        { y: 700, lag: 320, s: 1.05 },
      ],
    }
    for (const p of pieces) p.gusted = false
    gustSpring.kick(dir * 1.3)
    // A long soft breath, and three chimes somewhere inside it.
    sfx.noise({ dur: 2.2, freq: 280, to: 1100, vol: 0.085, q: 0.6 })
    sfx.noise({ dur: 1.7, freq: 520, to: 1700, vol: 0.05, q: 0.7, delay: 0.3 })
    const steps = [0, 2, 4, 5, 7]
    for (let i = 0; i < 3; i++) sfx.tone({ freq: sfx.scale(steps[Math.floor(Math.random() * steps.length)]!), dur: 1.1, type: 'sine', vol: 0.04, attack: 0.02, delay: 0.5 + i * 0.46 + rnd(0, 0.15) })
  }

  const frontX = (b: Breeze): number => (b.dir > 0 ? -160 + b.t * WIND_SPEED : W + 160 - b.t * WIND_SPEED)

  // The first wind child: straight through if nothing waits, or in to the
  // earth, once and a half around what lies there, and away.
  const leadAt = (b: Breeze, t: number): [number, number] => {
    const x0 = b.dir > 0 ? -160 : W + 160
    const bobY = Math.sin(t * 4.2) * 20
    if (!b.wakes) return [x0 + b.dir * WIND_SPEED * t, b.y + bobY]
    const cy = EARTH.y - 44
    if (t < b.reach) {
      const u = t / b.reach
      const e = u * u * (3 - 2 * u)
      return [lerp(x0, EARTH.x - b.dir * RING_X, u), lerp(b.y, cy, e) + bobY * (1 - e)]
    }
    const v = (t - b.reach) / RING_S
    if (v < 1) {
      const a = (b.dir > 0 ? Math.PI : 0) + b.dir * v * Math.PI * 3
      return [EARTH.x + Math.cos(a) * RING_X, cy + Math.sin(a) * RING_Y]
    }
    const out = t - b.reach - RING_S
    return [EARTH.x + b.dir * (RING_X + out * WIND_SPEED), cy - out * 90 + Math.sin(out * 4.2) * 20 * Math.min(1, out * 2)]
  }

  const updateBreeze = (b: Breeze, dt: number): void => {
    b.t += dt
    const front = frontX(b)
    const passed = (x: number) => (b.dir > 0 ? front > x : front < x)
    for (const p of pieces) {
      if (p.gusted || p.held || p.fall > 0 || !passed(p.x)) continue
      p.gusted = true
      const cls = KINDS[p.kind].cls
      const light = cls === 'leaf' || cls === 'wingy' || cls === 'fluff'
      p.wob.kick(b.dir * (light ? rnd(2, 4.5) : rnd(0.4, 1)))
      if (light) p.lift.kick(rnd(3, 7))
      if (light && quiet(0.09)) sfx.noise({ dur: 0.08, freq: 3600, vol: 0.022, filter: 'highpass' })
    }
    if (!b.woke && b.t > b.reach + 0.12) {
      b.woke = true
      regroup()
      const n = groups
      for (let i = 0; i < n; i++) wakeGroup(i)
      if (n > 0) {
        for (const c of creatures) rouse(c)
        regroup()
      }
    }
    for (const c of creatures) {
      if (c.state === 'sleep' && c.t > 0.5 && Math.abs(front - c.x) < 30) {
        c.wiggle.kick(b.dir * 0.8)
        c.t = 0
      } else if (awake(c) && Math.abs(front - c.x) < 14) c.wiggle.kick(b.dir * 1.2)
    }
    // Leaves on the wind.
    if (b.t < 1.9 && Math.random() < dt * 30) {
      const x = b.dir > 0 ? -20 : W + 20
      mote(x, rnd(120, H - 80), b.dir * rnd(380, 600), rnd(-50, 50), rnd(1.8, 2.6), rnd(0.8, 1.3), 30)
    }
    // And what the wind shakes down from the trees, to the places that are bare.
    if (!b.fell && b.t > 0.6) {
      b.fell = true
      b.refill.forEach((slot, i) => {
        const p = makePiece(slot)
        const cls = KINDS[p.kind].cls
        const light = cls === 'leaf' || cls === 'wingy' || cls === 'fluff'
        p.fallDur = (light ? rnd(1.7, 2.6) : rnd(0.8, 1.1)) + i * 0.09
        p.fall = p.fallDur
        p.fx0 = p.hx - b.dir * (light ? rnd(120, 300) : rnd(10, 40))
        p.fy0 = -60 - rnd(0, 60)
        p.fsway = light ? rnd(2, 3.5) : 0
        p.fspin = light ? rnd(-3, 3) : rnd(-0.6, 0.6)
        p.x = p.fx0
        p.y = p.fy0
        pieces.push(p)
      })
    }
    if (b.t > (b.wakes ? b.reach + RING_S + 1.4 : 3.6)) breeze = null
  }

  // ------------------------------------------------------------ touch

  const now = (): number => performance.now() / 1000

  const startDrag = (ptr: Pointer, p: Piece): void => {
    const d = KINDS[p.kind]
    pieces.splice(pieces.indexOf(p), 1)
    pieces.push(p)
    p.held = true
    p.lift.target = 1
    p.glint = 0
    const ox = p.x - ptr.x
    const oy = p.y - ptr.y
    const r = Math.hypot(ox, oy)
    const long = d.len > d.wid * 1.5 && r > d.len * 0.36
    held.set(ptr.id, { kind: 'drag', piece: p, ox, oy, r: long ? r : 0, moved: 0, rustle: 0 })
    touchSound(d.cls, true)
    p.wob.kick(rnd(-1.5, 1.5))
    if (d.cls === 'fluff') fx.burst(p.x, p.y - 8, { count: 4, color: '#fffdf4', speed: 30, life: 1.2, size: 3, gravity: -26, drag: 0.94 })
    regroup()
  }

  const down = (ptr: Pointer): void => {
    lastTouch = stage.time
    const onEarth = pieceAt(ptr.x, ptr.y, true)
    if (onEarth) return startDrag(ptr, onEarth)
    let c = creatureAt(ptr.x, ptr.y, 0.5)
    const any = c ? null : pieceAt(ptr.x, ptr.y, false)
    if (any) return startDrag(ptr, any)
    if (!c) c = creatureAt(ptr.x, ptr.y, 0.85)
    held.set(ptr.id, { kind: 'stroke', path: [[now(), ptr.x, ptr.y]], moved: 0, trail: 0, called: false, x: ptr.x, y: ptr.y })
    if (c) {
      // A stroke for a creature: it wriggles, blinks and answers in its own voice.
      if (c.state === 'sleep') rouse(c)
      else {
        c.wiggle.kick(c.wiggle.value > 0 ? -2.2 : 2.2)
        c.squash.value = 0.93
        blink(c)
        voice(c)
        c.errands = Math.max(0, c.errands - 2)
        if (c.state === 'toSleep') {
          c.spot = -1
          c.sTo = AWAKE_S
          c.state = 'pause'
          c.pause = 0.4
        }
      }
      return
    }
    follow = { x: ptr.x, y: ptr.y }
    if (ptr.y < AIR) {
      swirl(ptr.x, ptr.y, 1)
      sfx.noise({ dur: 0.18, freq: 1600, to: 3200, vol: 0.035, q: 0.9 })
    } else {
      litter(ptr.x, ptr.y, 4)
      swirl(ptr.x, ptr.y, 0.6)
      sfx.noise({ dur: 0.08, freq: 3000, vol: 0.035, filter: 'highpass' })
    }
  }

  const move = (ptr: Pointer): void => {
    const h = held.get(ptr.id)
    if (!h) return
    lastTouch = stage.time
    const step = Math.hypot(ptr.dx, ptr.dy)
    if (h.kind === 'drag') {
      const p = h.piece
      h.moved += step
      if (h.r > 0) {
        // Held by one end, it trails behind the finger the way a real twig
        // dragged across a table does, so the pull sets which way it lies.
        let ox = p.x - ptr.x
        let oy = p.y - ptr.y
        const l = Math.hypot(ox, oy)
        if (l > 0.001) {
          const a0 = Math.atan2(h.oy, h.ox)
          ox = (ox / l) * h.r
          oy = (oy / l) * h.r
          let da = Math.atan2(oy, ox) - a0
          if (da > Math.PI) da -= TAU
          if (da < -Math.PI) da += TAU
          p.rot += da
          h.ox = ox
          h.oy = oy
        }
      } else {
        p.wob.target = clamp(ptr.vx * 0.00035, -0.22, 0.22)
      }
      p.x = ptr.x + h.ox
      p.y = ptr.y + h.oy
      h.rustle += step
      if (h.rustle > 150) {
        h.rustle = 0
        const cls = KINDS[p.kind].cls
        if (cls === 'leaf' || cls === 'wingy') sfx.noise({ dur: 0.06, freq: 3200, vol: 0.02, filter: 'highpass' })
      }
      return
    }
    h.moved += step
    h.x = ptr.x
    h.y = ptr.y
    if (!h.called) follow = { x: ptr.x, y: ptr.y }
    const t = now()
    h.path.push([t, ptr.x, ptr.y])
    while (h.path.length > 2 && t - h.path[0]![0] > 0.8) h.path.shift()
    const from = h.path[0]!
    const swept = Math.hypot(ptr.x - from[1], ptr.y - from[2])
    h.trail += step
    if (h.trail > 44 && swept > 70) {
      h.trail = 0
      swirl(ptr.x, ptr.y, 0.7)
      if (quiet(0.16)) sfx.noise({ dur: 0.14, freq: 1400, to: 2600, vol: 0.022, q: 0.9 })
    }
    // A stroke is a sweep: a good way across in under a second.
    if (!h.called && swept > 250) {
      h.called = true
      follow = null
      callBreeze(ptr.x >= from[1] ? 1 : -1, ptr.y)
    }
  }

  const up = (ptr: Pointer): void => {
    const h = held.get(ptr.id)
    if (!h) return
    held.delete(ptr.id)
    if (h.kind === 'drag') {
      const p = h.piece
      p.held = false
      p.lift.target = 0
      p.wob.target = 0
      if (h.moved < 10 && stage.time - ptr.downAt < 0.35) {
        // A tap turns it a little where it lies.
        p.rot += Math.PI / 6
        p.wob.value -= Math.PI / 6
      }
      settle(p)
      return
    }
    if (![...held.values()].some((o) => o.kind === 'stroke')) follow = null
    if (!h.called && h.moved < 14 && ptr.y < AIR && !creatureAt(ptr.x, ptr.y, 0.85)) callBreeze(ptr.x < W / 2 ? 1 : -1, 360)
  }

  // ------------------------------------------------------------ frame

  const update = (dt: number): void => {
    const time = stage.time
    gustSpring.update(dt)
    gust = gustSpring.value

    for (const p of pieces) {
      p.lift.update(dt)
      p.wob.update(dt)
      p.sq.update(dt)
      p.eye = damp(p.eye, p.kind === 'cap' && p.onEarth && !p.held ? 1 : 0, 5, dt)
      if (p.glint > 0) p.glint -= dt
      if (p.fall > 0) {
        p.fall -= dt
        const t = clamp(1 - p.fall / p.fallDur, 0, 1)
        const e = t * t * 0.55 + t * 0.45
        p.x = lerp(p.fx0, p.hx, ease.outQuad(t)) + Math.sin(t * p.fsway * TAU) * 46 * (1 - t)
        p.y = lerp(p.fy0, p.hy, e)
        p.rot = p.hrot + (1 - t) * p.fspin + Math.sin(t * p.fsway * TAU + 1) * 0.5 * (1 - t)
        if (p.fall <= 0) {
          p.x = p.hx
          p.y = p.hy
          p.rot = p.hrot
          p.sq.value = 0.88
          p.wob.kick(rnd(-1, 1))
          if (quiet(0.14)) touchSound(KINDS[p.kind].cls, false)
        }
      }
    }

    if (breeze) updateBreeze(breeze, dt)

    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i]!
      updateCreature(c, dt)
      if (c.state === 'leaving' && c.alpha <= 0.01) creatures.splice(i, 1)
    }

    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i]!
      m.life -= dt
      if (m.life <= 0) {
        motes.splice(i, 1)
        continue
      }
      m.vy += m.g * dt
      m.sway += dt * 3
      m.x += (m.vx + Math.sin(m.sway) * 30) * dt
      m.y += m.vy * dt
      m.rot += m.spin * dt
    }
    for (let i = swirls.length - 1; i >= 0; i--) {
      const s = swirls[i]!
      s.life -= dt
      s.rot += dt * 3
      if (s.life <= 0) swirls.splice(i, 1)
    }

    // The clearing's own slow life: a leaf stirs, another drifts down.
    stirIn -= dt
    if (stirIn <= 0) {
      stirIn = rnd(2.5, 5.5)
      const leaves = pieces.filter((p) => !p.held && p.fall <= 0 && KINDS[p.kind].cls === 'leaf' && !p.onEarth)
      const p = leaves[Math.floor(Math.random() * leaves.length)]
      if (p) p.wob.kick(rnd(-1.1, 1.1))
    }
    driftIn -= dt
    if (driftIn <= 0) {
      driftIn = rnd(4, 8)
      mote(rnd(120, W - 120), -10, rnd(-14, 14), rnd(26, 40), rnd(5, 7), rnd(0.9, 1.2), 4)
    }

    // When a body lies waiting for eyes, two acorn caps give a small hop where
    // they lie, one after the other. No sound: it is there to be noticed, not
    // to call.
    if (building && capsOnEarth === 0 && time - lastTouch > 6) {
      hintIn -= dt
      if (hintIn <= 0) {
        hintIn = 3.2
        const caps = pieces.filter((p) => p.kind === 'cap' && !p.onEarth && !p.held && p.fall <= 0)
        const first = caps[Math.floor(Math.random() * caps.length)]
        if (first) {
          const hop = (p: Piece): void => {
            if (p.held || p.onEarth) return
            p.glint = 1.2
            p.wob.kick(2.4)
            p.lift.kick(24)
          }
          hop(first)
          let second: Piece | null = null
          for (const p of caps) if (p !== first && (!second || Math.hypot(p.x - first.x, p.y - first.y) < Math.hypot(second.x - first.x, second.y - first.y))) second = p
          const other = second
          if (other) stage.after(0.3, () => hop(other))
        }
      }
    }
  }

  const drawPiece = (g: G, p: Piece, time: number): void => {
    const d = KINDS[p.kind]
    const spr = art.pieces[p.kind][p.variant]!
    let x = p.x
    let y = p.y
    if (p.group >= 0 && !p.held) {
      // A heap with eyes is a creature asleep: it breathes.
      const b = 1 + Math.sin(time * 1.5 + p.group) * 0.014
      x = p.gx + (x - p.gx) * b
      y = p.gy + (y - p.gy) * b
    }
    const lift = clamp(p.lift.value, 0, 1.3)
    const air = p.fall > 0 ? 1 : lift
    if (air > 0.04) {
      g.globalAlpha = 0.3 * Math.min(1, air)
      drawSprite(g, art.shade, x + 8 * air, y + 20 * air, p.rot, (d.len * 2.1) / art.shade.w, Math.max(0.4, (d.wid * 2.3) / art.shade.h))
      g.globalAlpha = 1
    }
    const sc = 1 + 0.07 * air
    const q = p.sq.value
    g.save()
    g.translate(x, y - 12 * air)
    g.rotate(p.rot + p.wob.value)
    g.scale(sc * (2 - q), sc * q)
    g.drawImage(spr.img, -spr.w / 2, -spr.h / 2, spr.w, spr.h)
    if (p.eye > 0.02) {
      g.rotate(-p.rot - p.wob.value)
      g.globalAlpha = p.eye
      g.drawImage(art.lid.img, -art.lid.w / 2, -art.lid.h / 2, art.lid.w, art.lid.h)
      g.globalAlpha = 1
    }
    g.restore()
    if (p.glint > 0) {
      g.globalAlpha = Math.sin((p.glint / 1.2) * Math.PI) * 0.9
      drawSprite(g, art.glint, x, y, time * 0.6)
      g.globalAlpha = 1
    }
  }

  const drawRooted = (g: G, s: Sprite, x: number, y: number, ax: number, ay: number, rot: number): void => {
    g.save()
    g.translate(x, y)
    g.rotate(rot)
    g.drawImage(s.img, -ax, -ay, s.w, s.h)
    g.restore()
  }

  const draw = (g: G): void => {
    const time = stage.time
    g.drawImage(art.bg, 0, 0, W, H)

    // Sunlight wandering slowly over the earth.
    g.globalAlpha = 0.42
    g.drawImage(art.sun.img, EARTH.x - 280 + Math.sin(time * 0.11) * 70, EARTH.y - 200 + Math.cos(time * 0.08) * 26, art.sun.w, art.sun.h)
    g.globalAlpha = 1

    const sway = Math.sin(time * 0.6) * 0.012 + gust * 0.05
    drawRooted(g, art.branch[0]!, -8, -10, 20, 14, sway + Math.sin(time * 0.37) * 0.01)
    drawRooted(g, art.branch[1]!, W + 8, -10, 360, 14, sway - Math.sin(time * 0.41) * 0.01)

    SPOTS.forEach((s, i) => drawRooted(g, art.fernBack[i]!, s[0], s[1] + 40, 160, 192, Math.sin(time * 0.7 + i * 1.7) * 0.014 + gust * 0.045))
    const bedded = (c: Creature) => c.state === 'sleep' || c.state === 'leaving' || (c.state === 'toSleep' && c.spot >= 0 && Math.hypot(c.x - c.tx, c.y - c.ty) < 70)
    for (const c of creatures) if (bedded(c)) drawCreature(g, art, c, time)
    SPOTS.forEach((s, i) => drawRooted(g, art.fernFront[i]!, s[0], s[1] + 46, 160, 192, Math.sin(time * 0.8 + i * 2.3) * 0.012 + gust * 0.035))

    // When something with eyes lies waiting (or there is nothing left to make
    // eyes with), a wind child idles across the air: the stroke that calls it.
    const looseCaps = pieces.some((p) => p.kind === 'cap' && !p.onEarth)
    if (!breeze && (groups > 0 || (building && !looseCaps && capsOnEarth === 0))) {
      const u = (time % 7.5) / 7.5
      if (u < 0.62) {
        const t = u / 0.62
        g.globalAlpha = Math.sin(t * Math.PI) * 0.85
        drawSprite(g, art.child, lerp(140, W - 140, t), 104 + Math.sin(t * 9) * 16, Math.cos(t * 9) * 0.1, 1.05, 1.05)
        g.globalAlpha = 1
      }
    }

    for (const p of pieces) if (!p.held && p.fall <= 0) drawPiece(g, p, time)

    const up = creatures.filter((c) => !bedded(c)).sort((a, b) => a.y - b.y)
    for (const c of up) drawCreature(g, art, c, time)

    for (const p of pieces) if (p.held || p.fall > 0) drawPiece(g, p, time)

    for (const m of motes) {
      const s = art.motes[m.spr]!
      g.globalAlpha = Math.min(1, m.life * 2.5, (m.max - m.life) * 6)
      drawSprite(g, s, m.x, m.y, m.rot, m.size, m.size * (0.5 + 0.5 * Math.abs(Math.sin(m.sway * 1.3))))
    }
    for (const s of swirls) {
      g.globalAlpha = Math.min(1, s.life * 2) * 0.8
      const k = s.size * (1.25 - s.life * 0.5)
      drawSprite(g, art.swirl, s.x, s.y, s.rot, k, k)
    }
    g.globalAlpha = 1

    if (breeze) {
      const b = breeze
      const front = frontX(b)
      const fade = (x: number) => clamp(Math.min(x + 180, W + 180 - x) / 260, 0, 1)
      for (const s of b.streaks) {
        const x = front - b.dir * s.lag
        g.globalAlpha = fade(x)
        drawSprite(g, art.streak, x, s.y + Math.sin(b.t * 3 + s.lag) * 14, 0, b.dir * s.s, s.s)
      }
      for (const k of b.kids) {
        const x = front - b.dir * k.lag
        g.globalAlpha = fade(x) * 0.9
        drawSprite(g, art.child, x, k.y + Math.sin(b.t * 4.2 + k.ph) * 22, Math.cos(b.t * 4.2 + k.ph) * 0.12 * b.dir, b.dir * k.s * 1.2, k.s * 1.2)
      }
      const [lx, ly] = leadAt(b, b.t)
      const [nx, ny] = leadAt(b, b.t + 0.03)
      g.globalAlpha = fade(lx)
      drawSprite(g, art.child, lx, ly, Math.atan2(ny - ly, nx - lx), 1.3, nx >= lx ? 1.3 : -1.3)
      g.globalAlpha = 1
    }
  }

  regroup()

  return { update, draw, down, move, up }
}

export const proto: Proto = {
  meta: {
    key: 'leaf-creatures',
    name: 'Leaf Creatures',
    emoji: '🍁',
    ages: [3, 7],
    pitch: 'Lay leaves, twigs and seeds together on the bare earth, give the thing acorn-cap eyes, and the wind wakes what you made.',
    howTo: 'Drag treasures onto the bare earth. Acorn caps are its eyes. Stroke across the scene (or tap the sky) to call the wind.',
    basedOn: 'Waldorf autumn nature-table craft, leaf rubbings and block-crayon drawing; the wind children of the old stories',
    whyFun: 'Leaves and twigs swing and settle under the finger, and whatever was laid down blinks awake and moves the way its own parts suggest.',
    set: 'gentle',
  },
  create,
}
